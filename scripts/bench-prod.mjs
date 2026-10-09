#!/usr/bin/env node
/**
 * Đo /api/suggest TRÊN PROD (hoặc URL bất kỳ) với một bộ đo jsonl — đúng thứ ERP
 * nhận được, gồm cả Gemini và cache.
 *
 * Ngoài top-1/top-3 còn đếm "sai mà tự tin": mã top-1 sai nhóm 4 số nhưng
 * confidence ≥ 70. Với ERP đây là loại sai nguy hiểm nhất — nhân viên thấy số
 * cao nên tin, khác với kết quả tự nhận là chưa chắc.
 *
 * Lưu ý: prod KHÔNG bỏ tập giữ riêng khỏi kho tiền lệ, nên với bộ đo sinh từ
 * oz-gold số đo prod có thể lạc quan hơn thực tế (tiêu đề tiếng Trung ít khớp
 * tiền lệ tiếng Việt nên ảnh hưởng nhỏ).
 *
 *   HS_API_TOKEN=... node scripts/bench-prod.mjs --input=data/bench/erp-titles-synth.jsonl --field=titleZh --limit=150
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : fallback;
};
const INPUT = arg('input', 'data/bench/erp-titles-synth.jsonl');
const FIELD = arg('field', 'titleZh');
const LIMIT = Number(arg('limit', 0));
const URL_BASE = arg('url', process.env.HS_API_URL || 'https://hs-kb.uythacnhapkhau.com');
const CONCURRENCY = Number(arg('concurrency', 3));
const CONFIDENT = Number(arg('confident', 70));
const TOKEN = process.env.HS_API_TOKEN;
if (!TOKEN) { console.error('Thiếu HS_API_TOKEN'); process.exit(1); }

let cookie = '';

let items = readFileSync(join(ROOT, INPUT), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
  .map((r) => ({ desc: String(r[FIELD] || '').trim(), truth: String(r.hsCode).replace(/\D/g, '') }))
  .filter((it) => it.desc && it.truth.length === 8);
if (LIMIT > 0) items = items.slice(0, LIMIT);

const DEPTHS = [2, 4, 6, 8];
const hit = { top1: {}, top3: {} };
for (const d of DEPTHS) { hit.top1[d] = 0; hit.top3[d] = 0; }
let confidentWrong = 0;
let lowConfidence = 0;
let errors = 0;
const errorsByStatus = {};
let totalMs = 0;
const wrongSamples = [];

let next = 0;
async function worker() {
  while (next < items.length) {
    const it = items[next++];
    const t0 = Date.now();
    try {
      const r = await fetch(`${URL_BASE}/api/suggest`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
        body: JSON.stringify({ description: it.desc }),
      });
      totalMs += Date.now() - t0;
      if (!r.ok) {
        errors += 1;
        errorsByStatus[r.status] = (errorsByStatus[r.status] || 0) + 1;
        if (r.status === 429) await new Promise((ok) => setTimeout(ok, 5000));
        continue;
      }
      const j = await r.json();
      const sugg = j.suggestions || [];
      const codes = sugg.map((s) => String(s.hsCode || ''));
      for (const d of DEPTHS) {
        const want = it.truth.slice(0, d);
        if (codes[0]?.slice(0, d) === want) hit.top1[d] += 1;
        if (codes.slice(0, 3).some((c) => c.slice(0, d) === want)) hit.top3[d] += 1;
      }
      const conf = Number(sugg[0]?.confidence) || 0;
      if (conf < 50) lowConfidence += 1;
      if (codes[0] && codes[0].slice(0, 4) !== it.truth.slice(0, 4) && conf >= CONFIDENT) {
        confidentWrong += 1;
        if (wrongSamples.length < 15) wrongSamples.push(`${it.truth} ← ${codes[0]} (${conf}) ${it.desc.slice(0, 50)}`);
      }
    } catch (e) {
      errors += 1;
      errorsByStatus.network = (errorsByStatus.network || 0) + 1;
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

// Tính trên lượt TRẢ LỜI ĐƯỢC — lượt lỗi HTTP báo riêng, không trộn vào độ chính xác.
const n = items.length - errors;
const pct = (x) => `${Math.round((x / Math.max(1, n)) * 1000) / 10}%`;
console.log(`\n=== bench-prod — ${URL_BASE} · ${INPUT} (${FIELD}) · ${n}/${items.length} mẫu trả lời được ===`);
console.log(`top-1  2/4/6/8 số: ${DEPTHS.map((d) => pct(hit.top1[d])).join(' / ')}`);
console.log(`top-3  2/4/6/8 số: ${DEPTHS.map((d) => pct(hit.top3[d])).join(' / ')}`);
console.log(`sai nhóm mà tự tin (conf ≥ ${CONFIDENT}): ${pct(confidentWrong)} · tự nhận chưa chắc (conf < 50): ${pct(lowConfidence)}`);
console.log(`lỗi HTTP: ${errors} ${JSON.stringify(errorsByStatus)} · trung bình ${Math.round(totalMs / Math.max(1, n))} ms/lượt`);
if (wrongSamples.length) console.log(`\nVí dụ sai mà tự tin (đúng ← trả):\n  ${wrongSamples.join('\n  ')}`);
