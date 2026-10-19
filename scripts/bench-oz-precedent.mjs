// Đo chất lượng tìm tiền lệ Oz theo từ khoá (lib/oz-precedent-search.js) trên TẬP GIỮ RIÊNG.
//
// Vì sao (19/10/2026): món "tấm bảo vệ gầm/pin thép mangan" bị cờ "Tiền lệ Oz xếp nhóm 5903" — tiền lệ
// "Vải dệt kim ngâm tẩm phủ PVC" khớp 60% chỉ vì so chữ BỎ DẤU + chuỗi con ("gầm"→"gam" ⊂ "ngâm",
// "tấm"→"tam" ⊂ "tẩm"). Bộ đo này đo đúng thứ engine-loop dùng: top-5 và cờ "tiền lệ trái chiều".
//
// Cách đo: HS_EVAL_EXCLUDE_HOLDOUT=1 → kho tiền lệ bỏ tập giữ riêng; truy vấn = tenHang của từng mẫu giữ riêng
// (đúng thứ engine-loop gửi: tên hàng tiếng Việt). Đáp án = hsCode của mẫu.
//   - top1@4 / top5@4: nhóm 4 số đúng trong 1 / 5 kết quả đầu
//   - cờ: mô phỏng đúng luật engine-loop (cov ≥75, nhóm dẫn đầu ≥3 tờ khai và ≥60% trọng số). Nếu cờ bật
//     và nhóm cờ ≠ nhóm đáp án → báo NHẦM (đúng loại lỗi của món Leapmotor); = nhóm đáp án → báo ĐÚNG.
// Chạy: node scripts/bench-oz-precedent.mjs [--n 800]
import { createRequire } from 'module';
import fs from 'fs';

process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';
const require = createRequire(import.meta.url);
const { isHeldOut } = require('../lib/holdout.js');
const oz = require('../lib/oz-precedent-search.js');

const nArg = process.argv.indexOf('--n');
const N = nArg > 0 ? Number(process.argv[nArg + 1]) : 800;
const nz = (s) => String(s || '').replace(/\D/g, '');
const gold = fs.readFileSync(new URL('../data/oz-gold-final.jsonl', import.meta.url), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const held = gold.filter((g) => isHeldOut(g) && g.tenHang && nz(g.hsCode).length >= 4);
const step = Math.max(1, Math.floor(held.length / N));
const sample = [];
for (let i = 0; i < held.length && sample.length < N; i += step) sample.push(held[i]);

let n = 0; let top1 = 0; let top5 = 0; let flagRight = 0; let flagWrong = 0;
const wrongEx = [];
for (const g of sample) {
  const ans4 = nz(g.hsCode).slice(0, 4);
  const res = await oz.searchOzByKeyword(g.tenHang, { limit: 5 });
  const items = res.items || [];
  n++;
  if (items[0] && nz(items[0].hsCode).slice(0, 4) === ans4) top1++;
  if (items.some((it) => nz(it.hsCode).slice(0, 4) === ans4)) top5++;
  // Mô phỏng cờ review của engine-loop (lib/engine-loop.js, "Tiền lệ Oz … xếp nhóm …").
  const byHead = new Map();
  for (const it of items) if (it.matchCoverage >= 75) byHead.set(nz(it.hsCode).slice(0, 4), (byHead.get(nz(it.hsCode).slice(0, 4)) || 0) + (it.ozCount || 1));
  const ranked = [...byHead.entries()].sort((a, b) => b[1] - a[1]);
  const total = ranked.reduce((a, [, w]) => a + w, 0);
  const lead = ranked[0];
  if (lead && lead[1] >= 3 && lead[1] / total >= 0.6) {
    if (lead[0] === ans4) flagRight++;
    else { flagWrong++; if (wrongEx.length < 6) wrongEx.push(`${g.tenHang} [${ans4}] → cờ nhóm ${lead[0]}: "${items.find((it) => nz(it.hsCode).startsWith(lead[0]))?.tenHang}"`); }
  }
}
const p = (x) => `${Math.round((x / n) * 1000) / 10}%`;
console.log(`bench-oz-precedent | mẫu giữ riêng n=${n} | so chữ: ${process.env.HS_OZ_MATCH || 'mặc định'}`);
console.log(`  top1 đúng nhóm: ${p(top1)}   top5 đúng nhóm: ${p(top5)}`);
console.log(`  cờ "tiền lệ dẫn đầu" bật: ${flagRight + flagWrong} lần — trỏ ĐÚNG nhóm đáp án ${flagRight}, trỏ NHẦM ${flagWrong} (độ chính xác cờ ${flagRight + flagWrong ? Math.round((flagRight / (flagRight + flagWrong)) * 100) : 0}%)`);
for (const e of wrongEx) console.log(`    ✗ ${e}`);
