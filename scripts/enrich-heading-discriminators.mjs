#!/usr/bin/env node
/**
 * A1 — Enrich phan_biet + tinh_chat for chu-giai-heading.json (Issue #43)
 *
 * Generates meaningful discriminators for HS headings using Gemini, helping
 * the classify engine distinguish between confusable codes.
 *
 * Usage:
 *   GEMINI_API_KEY=... node scripts/enrich-heading-discriminators.mjs --dry-run
 *   GEMINI_API_KEY=... node scripts/enrich-heading-discriminators.mjs --limit=20
 *   GEMINI_API_KEY=... node scripts/enrich-heading-discriminators.mjs --batch=4 --concurrency=2
 *
 * Resume-safe: re-run skips headings already having non-stub phan_biet.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CHG_PATH = path.join(ROOT, 'data', 'chu-giai-heading.json');
const CONFLICTS_PATH = path.join(ROOT, 'data', 'conflicts.json');
const OZ_GOLD_PATH = path.join(ROOT, 'data', 'oz-gold-final.jsonl');

const SYSTEM_PROMPT = `Bạn là chuyên gia phân loại hàng hóa hải quan Việt Nam theo HS 2022 (WCO + Biểu thuế XNK VN TT31/2022).
Nhiệm vụ: Với mỗi nhóm HS trong danh sách, viết trường "phan_biet" ngắn gọn — điểm phân biệt THỰC DỤNG giúp phân loại viên chốt đúng mã khi hàng CÓ THỂ nhầm với nhóm lân cận.

Nếu nhóm chưa có "tinh_chat" (rỗng), cũng điền tóm tắt tính chất điển hình.

Yêu cầu với "phan_biet":
- Tiêu chí phân biệt CỤ THỂ: vật liệu chính %, dệt kim vs dệt thoi, công suất W, g/m², form (thành phẩm/bán thành phẩm), mục đích dùng cuối, trạng thái (nguyên liệu/chế biến sơ bộ/thành phẩm)...
- Nhắc CÁC NHÓM/CHƯƠNG hay nhầm với mã 4-số rõ (vd "Phân biệt với 6212:", "Không nhầm với 7318:")
- Dài ≤ 220 ký tự, tiếng Việt
- KHÔNG viết "xem Chú giải..." — nêu thẳng tiêu chí

Yêu cầu với "tinh_chat" (chỉ điền khi đầu vào để trống):
- Tóm tắt đặc điểm bản chất/cấu tạo điển hình của hàng thuộc nhóm này
- ≤ 160 ký tự, tiếng Việt

Chỉ trả JSON: {"items":[{"h4":"1001","phan_biet":"...","tinh_chat":"..."},...]}
Nếu tinh_chat đã có (non-empty trong input), trả lại tinh_chat gốc y nguyên (không viết lại).`;

function parseArgs() {
  const a = process.argv.slice(2);
  const o = { limit: Infinity, batch: 4, concurrency: 2, dryRun: false, tinhChatOnly: false };
  for (const arg of a) {
    if (arg === '--dry-run') o.dryRun = true;
    else if (arg === '--tinh-chat-only') o.tinhChatOnly = true; // target headings missing tinh_chat
    else if (arg.startsWith('--limit=')) o.limit = parseInt(arg.slice(8), 10) || 10;
    else if (arg.startsWith('--batch=')) o.batch = Math.max(1, parseInt(arg.slice(8), 10) || 4);
    else if (arg.startsWith('--concurrency=')) o.concurrency = Math.max(1, parseInt(arg.slice(14), 10) || 2);
  }
  return o;
}

// Detect stub phan_biet (useless reference, not real discriminator)
function isStub(s) {
  if (!s || !s.trim()) return true;
  const low = s.trim().toLowerCase();
  if (low.startsWith('xem chú giải')) return true;
  if (low.startsWith('xem ghi chú')) return true;
  if (low.length < 12) return true;
  return false;
}

function loadHeadings() {
  return JSON.parse(fs.readFileSync(CHG_PATH, 'utf8'));
}

function saveHeadings(data) {
  fs.writeFileSync(`${CHG_PATH}.tmp`, JSON.stringify(data, null, 0), 'utf8');
  fs.renameSync(`${CHG_PATH}.tmp`, CHG_PATH);
}

// Build priority-ordered list of headings to enrich
function buildPriorityList(headings) {
  // 1. Conflict headings (35 unique 4-digit prefixes from conflicts.json)
  const conflictH4 = new Set();
  try {
    const conflicts = JSON.parse(fs.readFileSync(CONFLICTS_PATH, 'utf8'));
    for (const k of Object.keys(conflicts)) conflictH4.add(k.slice(0, 4));
  } catch {}

  // 2. Oz gold headings by frequency
  const ozCounts = {};
  try {
    const lines = fs.readFileSync(OZ_GOLD_PATH, 'utf8').trim().split('\n');
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        const hs = String(obj.hs_code || obj.hsCode || obj.predicted || '').replace(/\D/g, '');
        if (hs.length >= 4) ozCounts[hs.slice(0, 4)] = (ozCounts[hs.slice(0, 4)] || 0) + 1;
      } catch {}
    }
  } catch {}
  const ozByFreq = Object.entries(ozCounts).sort((a, b) => b[1] - a[1]).map(([h]) => h);

  // 3. All other headings without real phan_biet
  const allH4 = Object.keys(headings);

  // Merge: conflicts → oz top → rest
  const seen = new Set();
  const ordered = [];
  for (const h of [...conflictH4, ...ozByFreq, ...allH4]) {
    if (!seen.has(h) && headings[h]) { seen.add(h); ordered.push(h); }
  }
  return ordered;
}

async function geminiBatch(items, apiKey, model) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const userPayload = { items: items.map((x) => ({
    h4: x.h4,
    nhom: (x.nhom || '').slice(0, 500),
    bao_gom: (x.bao_gom || '').slice(0, 250),
    khong_bao_gom: (x.khong_bao_gom || '').slice(0, 200),
    loai_tru: (x.loai_tru || '').slice(0, 200),
    tinh_chat_hien_tai: x.tinh_chat || '',  // existing tinh_chat (may be empty)
  })) };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(45000),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: JSON.stringify(userPayload, null, 2) }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
    }),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`Gemini ${res.status}: ${t.slice(0, 300)}`); }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');
  const parsed = JSON.parse(text);
  const list = parsed.items || parsed;
  if (!Array.isArray(list)) throw new Error('Expected { items: [] }');
  return list;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
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

  const headings = loadHeadings();
  const priority = buildPriorityList(headings);

  // Filter: stub phan_biet OR (--tinh-chat-only) missing tinh_chat
  const todo = priority.filter((h4) => {
    if (opts.tinhChatOnly) return !headings[h4]?.tinh_chat || !headings[h4].tinh_chat.trim();
    return isStub(headings[h4]?.phan_biet);
  }).slice(0, opts.limit);

  const totalConflict = [...new Set(
    Object.keys(JSON.parse(fs.readFileSync(CONFLICTS_PATH,'utf8'))).map(k=>k.slice(0,4))
  )].filter(h => todo.includes(h)).length;

  console.log(`\n=== enrich-heading-discriminators ===`);
  console.log(`Model: ${model} | Batch: ${opts.batch} | Concurrency: ${opts.concurrency}`);
  console.log(`Total headings: ${Object.keys(headings).length} | Already enriched: ${priority.filter(h4=>!isStub(headings[h4]?.phan_biet)).length}`);
  console.log(`To process: ${todo.length} (${totalConflict} conflict-priority) | Limit: ${opts.limit}`);
  if (opts.dryRun) { console.log('DRY RUN — first 3 items:', todo.slice(0,3)); return; }

  const batches = chunk(todo, opts.batch);
  let done = 0, errors = 0;

  // Collect all results in memory; write once per save-interval to avoid concurrent-write races
  const pending = new Map(); // h4 → {phan_biet, tinh_chat}
  const SAVE_EVERY = 10; // flush to disk every N batches

  await runPool(batches, opts.concurrency, async (batch, bIdx) => {
    const items = batch.map((h4) => ({ h4, ...headings[h4] }));
    try {
      const results = await geminiBatch(items, apiKey, model);
      for (const r of results) {
        const h4 = String(r.h4 || '').replace(/\D/g, '');
        if (!h4 || !headings[h4]) continue;
        const upd = {};
        if (r.phan_biet && !isStub(r.phan_biet)) upd.phan_biet = String(r.phan_biet).slice(0, 250).trim();
        if (r.tinh_chat && !headings[h4].tinh_chat) upd.tinh_chat = String(r.tinh_chat).slice(0, 200).trim();
        if (Object.keys(upd).length) pending.set(h4, upd);
      }
      done += batch.length;
      process.stdout.write(`\r  batch ${bIdx + 1}/${batches.length} done (${done}/${todo.length} | pending ${pending.size})   `);
      // Periodic flush
      if ((bIdx + 1) % SAVE_EVERY === 0 && pending.size > 0) {
        const fresh = loadHeadings();
        for (const [h4, upd] of pending) Object.assign(fresh[h4], upd);
        saveHeadings(fresh);
      }
    } catch (e) {
      errors++;
      console.error(`\n  batch ${bIdx + 1} ERROR: ${e.message.slice(0, 120)}`);
    }
  });

  // Final flush
  if (pending.size > 0) {
    const fresh = loadHeadings();
    for (const [h4, upd] of pending) Object.assign(fresh[h4], upd);
    saveHeadings(fresh);
  }

  // Final coverage report
  const finalData = loadHeadings();
  const finalEntries = Object.entries(finalData);
  const finalPB = finalEntries.filter(([, v]) => !isStub(v.phan_biet)).length;
  const finalTC = finalEntries.filter(([, v]) => v.tinh_chat && v.tinh_chat.trim()).length;
  console.log(`\n\n=== DONE ===`);
  console.log(`phan_biet: ${finalPB} / ${finalEntries.length}`);
  console.log(`tinh_chat: ${finalTC} / ${finalEntries.length}`);
  console.log(`Errors: ${errors} / ${batches.length} batches`);
}

main().catch((e) => { console.error(e); process.exit(1); });
