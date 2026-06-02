#!/usr/bin/env node
/**
 * A2 — Enrich conflicts.json: fill confusedWith[] + reasonsVi[] (Issue #44)
 *
 * For each stub entry in conflicts.json, builds context from:
 *   - tax.json (product name)
 *   - chu-giai-heading.json (phan_biet of parent heading)
 *   - precedents.json (TB-TCHQ cases showing real classifications)
 *
 * Usage:
 *   GEMINI_API_KEY=... node scripts/enrich-conflicts.mjs --dry-run
 *   GEMINI_API_KEY=... node scripts/enrich-conflicts.mjs --limit=10
 *   GEMINI_API_KEY=... node scripts/enrich-conflicts.mjs
 *
 * Resume-safe: skips entries where confusedWith is already populated.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CONFLICTS_PATH = path.join(ROOT, 'data', 'conflicts.json');
const TAX_PATH = path.join(ROOT, 'data', 'tax.json');
const CHG_PATH = path.join(ROOT, 'data', 'chu-giai-heading.json');
const PREC_PATH = path.join(ROOT, 'data', 'precedents.json');

const SYSTEM_PROMPT = `Bạn là chuyên gia phân loại hàng hóa hải quan Việt Nam theo HS 2022.
Với thông tin về 1 mã HS cụ thể, hãy điền:
1. "confusedWith": mảng ≤5 mã HS 8-số hay bị nhầm nhất với mã này
2. "reasonsVi": mảng ≤5 lý do ngắn giải thích TẠI SAO dễ nhầm + tiêu chí phân biệt

Nguồn gợi ý confusedWith:
- Các mã cùng nhóm (4 số đầu giống) nhưng tiêu chí khác
- Mã từ nhóm khác nhưng cùng sản phẩm tên gọi khác (vd 1902 vs 1901)
- Lịch sử khai báo TB-TCHQ cho thấy cùng loại hàng từng phân loại vào mã khác

"reasonsVi" mỗi phần tử: 1 câu ngắn, nêu tiêu chí phân biệt cụ thể (ví dụ: "Mã 1901 nếu chứa ≥25% sữa bột, 1901.90.99 nếu không").

Chỉ trả JSON: {"hsCode":"...","confusedWith":["...","..."],"reasonsVi":["...","..."]}`;

function parseArgs() {
  const a = process.argv.slice(2);
  const o = { limit: Infinity, concurrency: 2, dryRun: false };
  for (const arg of a) {
    if (arg === '--dry-run') o.dryRun = true;
    else if (arg.startsWith('--limit=')) o.limit = parseInt(arg.slice(8), 10) || 10;
    else if (arg.startsWith('--concurrency=')) o.concurrency = Math.max(1, parseInt(arg.slice(14), 10) || 2);
  }
  return o;
}

function load(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

function save(p, data) {
  fs.writeFileSync(`${p}.tmp`, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(`${p}.tmp`, p);
}

async function geminiSingle(item, apiKey, model) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: JSON.stringify(item, null, 2) }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
    }),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`Gemini ${res.status}: ${t.slice(0, 200)}`); }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');
  return JSON.parse(text);
}

async function runPool(tasks, concurrency, fn) {
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) { const i = idx++; await fn(tasks[i], i); }
  }
  await Promise.all(Array(Math.min(concurrency, tasks.length || 1)).fill(0).map(() => worker()));
}

async function main() {
  const opts = parseArgs();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) { console.error('GEMINI_API_KEY missing'); process.exit(1); }
  const model = process.env.GEMINI_ENRICH_MODEL || 'gemini-2.5-flash';

  const conflicts = load(CONFLICTS_PATH);
  const tax = load(TAX_PATH);
  const cgh = load(CHG_PATH);
  const prec = load(PREC_PATH);

  // Only process entries without confusedWith populated
  const todo = Object.entries(conflicts)
    .filter(([, v]) => !v.confusedWith || v.confusedWith.length === 0)
    .slice(0, opts.limit)
    .map(([hs]) => hs);

  console.log(`\n=== enrich-conflicts ===`);
  console.log(`Model: ${model} | Concurrency: ${opts.concurrency}`);
  console.log(`Total: ${Object.keys(conflicts).length} | Already done: ${Object.keys(conflicts).length - todo.length} | To process: ${todo.length}`);
  if (opts.dryRun) { console.log('DRY RUN — first 3:', todo.slice(0, 3)); return; }

  // Accumulate results; flush every 10
  const pending = new Map();
  const SAVE_EVERY = 10;
  let done = 0, errors = 0;

  await runPool(todo, opts.concurrency, async (hs, idx) => {
    const entry = conflicts[hs];
    const h4 = hs.slice(0, 4);
    const heading = cgh[h4] || {};
    const taxEntry = tax[hs] || {};
    const precedents = (prec[hs] || []).slice(0, 4).map((p) => ({
      tb: p.tbTchqNumber,
      product: (p.productName || '').slice(0, 80),
      outcome: p.outcome,
    }));

    // Build context for Gemini
    const context = {
      hsCode: hs,
      tenHang: (taxEntry.vn || '').slice(0, 120),
      riskLevel: entry.riskLevel,
      heading: h4,
      phanBietNhom: (heading.phan_biet || '').slice(0, 200),
      tinhChatNhom: (heading.tinh_chat || '').slice(0, 120),
      tbTchqSamples: precedents,
    };

    try {
      const result = await geminiSingle(context, apiKey, model);
      if (result.confusedWith?.length || result.reasonsVi?.length) {
        pending.set(hs, {
          confusedWith: (result.confusedWith || []).map(String).slice(0, 5),
          reasonsVi: (result.reasonsVi || []).map(String).slice(0, 5),
        });
      }
      done++;
      process.stdout.write(`\r  ${done}/${todo.length} done (pending ${pending.size})   `);

      if ((idx + 1) % SAVE_EVERY === 0 && pending.size > 0) {
        const fresh = load(CONFLICTS_PATH);
        for (const [k, upd] of pending) Object.assign(fresh[k], upd);
        save(CONFLICTS_PATH, fresh);
      }
    } catch (e) {
      errors++;
      console.error(`\n  ${hs} ERROR: ${e.message.slice(0, 100)}`);
    }
  });

  // Final flush
  if (pending.size > 0) {
    const fresh = load(CONFLICTS_PATH);
    for (const [k, upd] of pending) Object.assign(fresh[k], upd);
    save(CONFLICTS_PATH, fresh);
  }

  // Final report
  const final = load(CONFLICTS_PATH);
  const populated = Object.values(final).filter((v) => v.confusedWith?.length > 0).length;
  console.log(`\n\n=== DONE ===`);
  console.log(`confusedWith populated: ${populated} / ${Object.keys(final).length}`);
  console.log(`Errors: ${errors} / ${todo.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
