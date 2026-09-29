#!/usr/bin/env node
/**
 * Dựng bộ đo "đầu vào kiểu ERP": tiêu đề sản phẩm tiếng Trung như người bán
 * đăng trên Taobao/1688, sinh từ tập giữ riêng của data/oz-gold-final.jsonl
 * (đã biết mã đúng).
 *
 * VÌ SAO: mọi bộ đo trước đây dùng mô tả tiếng Việt chuẩn ECUS (có chất liệu,
 * công dụng). ERP lại gửi tiêu đề Taobao — tiếng Trung, lẫn từ quảng cáo,
 * không nói chất liệu. Đo trên đầu vào sai thì số đẹp mà ERP vẫn ra sai
 * (Coca-Cola → mã cocaine, sạc dự phòng → ắc quy chì, 28/09/2026).
 *
 * Tiêu đề do LLM viết nên là dữ liệu TỔNG HỢP, gắn cờ synthetic. Khi ERP gửi
 * sửa mã thật về /api/feedback, bộ đo nên thay dần bằng tiêu đề thật.
 *
 *   node scripts/build-erp-bench.mjs --limit=150 --concurrency=4
 *   → data/bench/erp-titles-synth.jsonl
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { chat } from '../lib/llm.mjs';

const require = createRequire(import.meta.url);
const { isHeldOut } = require('../lib/holdout.js');
const { parseJsonLoose } = require('../lib/parse-json.js');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'data', 'bench', 'erp-titles-synth.jsonl');
const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : fallback;
};
const LIMIT = Number(arg('limit', 150));
const CONCURRENCY = Number(arg('concurrency', 4));

const SYSTEM = `Bạn là người bán hàng trên Taobao/1688. Viết TIÊU ĐỀ SẢN PHẨM bằng tiếng Trung giản thể cho mặt hàng được mô tả, đúng văn phong người bán Trung Quốc: tên thường gọi, thương hiệu/model nếu có, quy cách, vài từ quảng cáo (新款, 包邮, 厂家直销, 大容量...).
Người bán thường KHÔNG ghi chất liệu hay công dụng đầy đủ như tờ khai hải quan — chỉ ghi những gì người mua quan tâm.
TUYỆT ĐỐI không ghi mã HS, không dùng thuật ngữ biểu thuế, không dịch nguyên văn mô tả tờ khai.
Chỉ trả JSON: {"titleZh":"..."}`;

const CJK = /[一-鿿]/;

function pickItems() {
  const gold = readFileSync(join(ROOT, 'data', 'oz-gold-final.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  // Cùng bộ lọc và thứ tự với bench-matrix để hai bộ đo so được trên cùng mặt hàng.
  return gold
    .filter((g) => isHeldOut(g))
    .map((g) => ({ desc: String(g.sampleDesc || g.tenHang || '').trim(), truth: String(g.hsCode).replace(/\D/g, ''), tenHang: g.tenHang }))
    .filter((it) => it.desc.length >= 20 && it.truth.length === 8)
    .slice(0, LIMIT);
}

async function makeTitle(it) {
  const { content, model } = await chat(
    [{ role: 'system', content: SYSTEM }, { role: 'user', content: `Mặt hàng: ${it.desc}` }],
    { json: true, maxTokens: 3000, timeoutMs: 120000 },
  );
  const title = String(parseJsonLoose(content)?.titleZh || '').trim();
  if (!CJK.test(title) || title.length < 6) throw new Error(`tiêu đề không hợp lệ: ${title.slice(0, 60)}`);
  if (/\b\d{4}\.?\d{2}\b/.test(title) && title.includes(it.truth.slice(0, 4))) throw new Error('tiêu đề lộ mã HS');
  return { title, model };
}

const items = pickItems();
const done = new Map();
if (existsSync(OUT)) {
  for (const l of readFileSync(OUT, 'utf8').split('\n').filter(Boolean)) {
    const r = JSON.parse(l);
    done.set(r.i, r);
  }
}
console.error(`[erp-bench] ${items.length} mặt hàng, đã có ${done.size}`);

let next = 0;
let fails = 0;
async function worker() {
  while (next < items.length) {
    const i = next++;
    if (done.has(i)) continue;
    const it = items[i];
    try {
      const { title, model } = await makeTitle(it);
      done.set(i, { i, hsCode: it.truth, titleZh: title, sourceDesc: it.desc, synthetic: true, model });
      process.stderr.write('.');
    } catch (e) {
      fails += 1;
      process.stderr.write(`x(${i}: ${String(e.message).slice(0, 80)})`);
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

mkdirSync(dirname(OUT), { recursive: true });
const rows = [...done.values()].sort((a, b) => a.i - b.i);
writeFileSync(OUT, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
console.error(`\n[erp-bench] ghi ${rows.length} dòng → ${OUT} (lỗi ${fails})`);
