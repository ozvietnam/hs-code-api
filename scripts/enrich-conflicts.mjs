#!/usr/bin/env node
// A2 (#44) — LLM ENRICH (resume-safe): viết `reasonsVi` cho conflicts.json dựa trên
// conflict-worklist.json (cặp confusedWith + ngữ cảnh nhóm). Cần LLM key.
// KHÔNG có key → in hướng dẫn + thoát 0 (không bịa lý do nhầm/căn cứ pháp lý).
//
// Resume-safe: bỏ qua entry đã có reasonsVi; ghi đĩa sau mỗi batch.
// Flags: --limit=N --batch=N --dry-run
// Chạy: GEMINI_API_KEY=... node scripts/enrich-conflicts.mjs --batch=10

import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, '..', 'data');

const arg = (k, d) => {
  const m = process.argv.find((a) => a.startsWith(`--${k}=`));
  if (m) return m.split('=')[1];
  return process.argv.includes(`--${k}`) ? true : d;
};
const LIMIT = parseInt(arg('limit', '0'), 10) || Infinity;
const BATCH = parseInt(arg('batch', '10'), 10);
const DRY = !!arg('dry-run', false);

const hasKey = !!(process.env.BYTEPLUS_API_KEY || process.env.GEMINI_API_KEY || process.env.MINIMAX_API_KEY || process.env.OPENROUTER_API_KEY);
if (!hasKey && !DRY) {
  console.log('⚠ Chưa có LLM key (BYTEPLUS_API_KEY / GEMINI / MINIMAX). Bỏ qua enrich conflicts (bước LLM của A2 #44).');
  console.log('  Worklist deterministic đã sẵn: npm run data:build-conflict-worklist → data/conflict-worklist.json');
  process.exit(0);
}

const wl = path.join(DATA, 'conflict-worklist.json');
if (!fs.existsSync(wl)) { console.error('Thiếu conflict-worklist.json — chạy npm run data:build-conflict-worklist.'); process.exit(1); }
const worklist = JSON.parse(fs.readFileSync(wl, 'utf8')).items || [];
const conflictsPath = path.join(DATA, 'conflicts.json');

const SYS = `Bạn là chuyên gia áp mã HS Việt Nam. Cho 1 mã HS dễ nhầm + ngữ cảnh nhóm (LOẠI TRỪ/KHÔNG GỒM + mã anh em),
viết "reasonsVi": 1-3 lý do NGẮN GỌN vì sao mã này hay bị nhầm và dấu hiệu khu biệt để chọn đúng.
KHÔNG bịa căn cứ pháp lý ngoài ngữ cảnh. Trả DUY NHẤT JSON: {"reasonsVi":["...","..."],"confusedWith":["hs8",...]}`;

function buildUser(item) {
  const c = item.context;
  const lines = [`Mã ${item.hsCode}: ${c.nameVi}`, `Risk: ${item.riskLevel}`];
  if (item.seededConfusedWith.length) lines.push(`Dễ nhầm với (đã biết): ${item.seededConfusedWith.join(', ')}`);
  if (c.loai_tru) lines.push(`LOẠI TRỪ nhóm: ${c.loai_tru}`);
  if (c.khong_bao_gom) lines.push(`KHÔNG GỒM: ${c.khong_bao_gom}`);
  if (c.siblings?.length) { lines.push('Mã anh em:'); for (const s of c.siblings) lines.push(`  - ${s.hs}: ${s.vn}`); }
  return lines.join('\n');
}

async function main() {
  const { callLLMJson } = require('../lib/llm-tier.js');
  let conflicts = JSON.parse(fs.readFileSync(conflictsPath, 'utf8'));
  const tier = process.env.GEMINI_API_KEY ? 'premium' : 'standard';
  let done = 0, written = 0, since = 0;

  for (const item of worklist) {
    if (done >= LIMIT) break;
    const E = conflicts[item.hsCode];
    if (!E || (E.reasonsVi && E.reasonsVi.length)) continue; // resume-safe

    let json, provider;
    try { ({ json, provider } = await callLLMJson(SYS, buildUser(item), { tier, maxTokens: 600, timeoutMs: 30000 })); }
    catch (e) { console.error(`  ${item.hsCode} lỗi LLM: ${String(e.message).slice(0, 80)}`); continue; }
    done += 1;
    if (!json || !Array.isArray(json.reasonsVi) || !json.reasonsVi.length) continue;

    if (DRY) { console.log(`\n[DRY] ${item.hsCode}\n  reasonsVi:`, json.reasonsVi); break; }

    E.reasonsVi = json.reasonsVi.map((r) => String(r).trim()).filter(Boolean).slice(0, 3);
    const merged = new Set([...(E.confusedWith || []), ...item.seededConfusedWith, ...(json.confusedWith || []).map((x) => String(x).replace(/\D/g, ''))]);
    merged.delete(item.hsCode);
    E.confusedWith = [...merged].filter((x) => x.length === 8);
    E.reasonsSource = provider || (tier === 'premium' ? 'gemini' : 'llm');
    written += 1; since += 1;

    if (since >= BATCH) {
      fs.writeFileSync(conflictsPath, JSON.stringify(conflicts, null, 2));
      conflicts = JSON.parse(fs.readFileSync(conflictsPath, 'utf8'));
      console.log(`  ...ghi ${written} entry (batch)`); since = 0;
    }
  }
  if (!DRY && since > 0) fs.writeFileSync(conflictsPath, JSON.stringify(conflicts, null, 2));
  console.log(`\n✓ A2 enrich xong: ${written} entry reasonsVi mới (xử lý ${done}). Resume an toàn.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
