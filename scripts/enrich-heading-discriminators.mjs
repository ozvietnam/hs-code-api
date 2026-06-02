#!/usr/bin/env node
// A1 (#43) — LLM ENRICH (resume-safe): điền `phan_biet` (+ `tinh_chat` nếu thiếu)
// vào data/chu-giai-heading.json cho các nhóm trong discriminator-worklist.json.
//
// Cần LLM key (GEMINI_API_KEY → premium, hoặc MINIMAX_API_KEY → standard $0).
// KHÔNG có key → in hướng dẫn + thoát 0 (không phá CI, không bịa nội dung).
//
// Resume-safe: bỏ qua nhóm đã có phan_biet; ghi đĩa sau mỗi batch.
// Flags: --limit=N (số nhóm) --batch=N (ghi mỗi N) --dry-run (1 nhóm, in thử, không ghi)
//
// Chạy:
//   GEMINI_API_KEY=... node scripts/enrich-heading-discriminators.mjs --dry-run
//   GEMINI_API_KEY=... node scripts/enrich-heading-discriminators.mjs --batch=10

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
  console.log('⚠ Chưa có LLM key (BYTEPLUS_API_KEY / GEMINI_API_KEY / MINIMAX_API_KEY). Bỏ qua enrich.');
  console.log('  Đây là bước LLM của A1 (#43) — chạy lại khi có key. Worklist deterministic đã sẵn ở');
  console.log('  data/discriminator-worklist.json (chạy: npm run data:build-discriminator-worklist).');
  process.exit(0);
}

const worklistPath = path.join(DATA, 'discriminator-worklist.json');
if (!fs.existsSync(worklistPath)) {
  console.error('Thiếu discriminator-worklist.json — chạy npm run data:build-discriminator-worklist trước.');
  process.exit(1);
}
const worklist = JSON.parse(fs.readFileSync(worklistPath, 'utf8')).items || [];
const headingPath = path.join(DATA, 'chu-giai-heading.json');

const SYS = `Bạn là chuyên gia áp mã HS Việt Nam. Cho ngữ cảnh 1 NHÓM 4-số (narrative + KHÔNG GỒM/LOẠI TRỪ + danh sách mã 8-số anh em),
hãy viết "phan_biet": tiêu chí KHU BIỆT để chọn đúng giữa các mã 8-số anh em VÀ với nhóm dễ nhầm kế cận.
Nêu RÕ dấu hiệu kỹ thuật quyết định (vd: g/m², dệt kim/dệt thoi, công suất, điện áp, %thành phần, có/không động cơ, dạng nguyên sinh/thành phẩm).
NGẮN GỌN, đủ để giải trình, KHÔNG đọc tụng chú giải, KHÔNG bịa căn cứ pháp lý không có trong ngữ cảnh.
Trả DUY NHẤT JSON: {"phan_biet":"...", "tinh_chat":"...(chỉ khi được yêu cầu, nếu không để rỗng)"}`;

function buildUser(item) {
  const c = item.context;
  const lines = [`NHÓM ${item.heading}:`];
  if (c.nhom) lines.push(`Narrative: ${c.nhom}`);
  if (c.khong_bao_gom) lines.push(`KHÔNG GỒM: ${c.khong_bao_gom}`);
  if (c.loai_tru) lines.push(`LOẠI TRỪ: ${c.loai_tru}`);
  lines.push('Mã 8-số anh em:');
  for (const s of c.siblings) lines.push(`  - ${s.hs}: ${s.vn}`);
  lines.push(item.needs.tinh_chat ? 'Yêu cầu: viết cả phan_biet VÀ tinh_chat.' : 'Yêu cầu: chỉ viết phan_biet.');
  return lines.join('\n');
}

async function main() {
  const { callLLMJson } = require('../lib/llm-tier.js');
  let heading = JSON.parse(fs.readFileSync(headingPath, 'utf8'));
  const tier = process.env.GEMINI_API_KEY ? 'premium' : 'standard';

  let done = 0, written = 0, since = 0;
  for (const item of worklist) {
    if (done >= LIMIT) break;
    const H = heading[item.heading];
    if (!H || (H.phan_biet && String(H.phan_biet).trim())) continue; // resume-safe

    let json, provider;
    try {
      ({ json, provider } = await callLLMJson(SYS, buildUser(item), { tier, maxTokens: 800, timeoutMs: 30000 }));
    } catch (e) {
      console.error(`  ${item.heading} lỗi LLM: ${String(e.message).slice(0, 80)}`);
      continue;
    }
    done += 1;
    if (!json || !json.phan_biet) continue;

    if (DRY) {
      console.log(`\n[DRY] ${item.heading}\n  phan_biet: ${json.phan_biet}`);
      if (item.needs.tinh_chat && json.tinh_chat) console.log(`  tinh_chat: ${json.tinh_chat}`);
      break;
    }

    H.phan_biet = String(json.phan_biet).trim();
    if (item.needs.tinh_chat && json.tinh_chat) H.tinh_chat = String(json.tinh_chat).trim();
    H.phan_biet_source = provider || (tier === 'premium' ? 'gemini' : 'llm');
    written += 1; since += 1;

    if (since >= BATCH) {
      fs.writeFileSync(headingPath, JSON.stringify(heading, null, 1));
      heading = JSON.parse(fs.readFileSync(headingPath, 'utf8')); // re-read để giữ resume-safe
      console.log(`  ...ghi ${written} nhóm (batch)`);
      since = 0;
    }
  }
  if (!DRY && since > 0) fs.writeFileSync(headingPath, JSON.stringify(heading, null, 1));
  console.log(`\n✓ A1 enrich xong: ${written} nhóm phan_biet mới (xử lý ${done}). Resume an toàn — chạy lại để tiếp.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
