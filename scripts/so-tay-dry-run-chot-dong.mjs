#!/usr/bin/env node
// #195 bước 6a — CHẠY KHÔ cổng CHỐT DÒNG 8 SỐ (chotDong8), không gọi AI.
//
// Trên tập giữ riêng oz-gold (data/oz-gold-final.jsonl; HS_EVAL_EXCLUDE_HOLDOUT=1):
//   (A) chọn = MÃ ĐÚNG (nhãn Oz đã khai) → mọi lần máy ĐỔI sang dòng khác là BẬT OAN (nghiệm thu ≤ 10 %);
//       CHOT/LOAI_KHAC trùng mã đúng = ĐỒNG Ý (giá trị: máy xác nhận dòng mà không cần AI).
//   (B) mô phỏng "AI chọn dòng LK cùng PN6" → máy chốt lại đúng dòng có tên = SỬA ĐƯỢC.
// Phân bố ketQua cho biết: bao nhiêu PN6 chốt được, bao nhiêu điểm mù (ranh giới chưa số hóa),
// bao nhiêu phải hỏi thêm dữ kiện — các chỉ số quyết định vòng đo LLM sau đó.
//   node scripts/so-tay-dry-run-chot-dong.mjs [--limit=200] [--write]
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { createRequire } from 'module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
const argv = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';
await import('./test-isolate-data.mjs');
const require = createRequire(import.meta.url);
const { chotDong8, loadSoTay } = require('../lib/so-tay-gates.js');
const nz = (s) => String(s || '').replace(/\D/g, '');

const { isHeldOut } = require('../lib/holdout.js');
const held = readFileSync(join(ROOT, 'data', 'oz-gold-final.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
  .filter((g) => isHeldOut(g) && String(g.sampleDesc || '').trim().length >= 20 && nz(g.hsCode).length === 8)
  .map((g) => ({ desc: String(g.sampleDesc || '').trim(), truth: nz(g.hsCode), specs: Array.isArray(g.specs) ? g.specs.join('; ') : String(g.specs || '') }))
  .slice(0, Number(argv.limit) || Infinity);

const st = {
  mau: held.length, coSoTayNhomDung: 0, pn6DoiDien: 0,
  ketQua: {}, dongY: 0, batOan: 0, suaDuocTuLK: 0, oanKhiTuLK: 0, doiKhacNhau: 0,
  oanChiTiet: [],
};
const { taxData } = require('../lib/data.js');
const isLK = (h) => /^[-\s–]*(loại khác|lk)/i.test(String(taxData[h]?.vn || ''));

for (const it of held) {
  const text = `${it.desc}\n${it.specs}`;
  if (!loadSoTay(it.truth.slice(0, 4))) continue;
  st.coSoTayNhomDung++;
  // (A) trên mã đúng
  const a = chotDong8({ hs: it.truth, productText: text });
  if (a.checked) {
    st.ketQua[a.ketQua] = (st.ketQua[a.ketQua] || 0) + 1;
    if ((a.ketQua === 'CHOT' || a.ketQua === 'LOAI_KHAC')) {
      if (a.hs === it.truth) { st.dongY++; if (isLK(it.truth)) st.suaDuocTuLK++; }
      else { st.batOan++; st.oanChiTiet.push({ truth: it.truth, mayChon: a.hs, desc: it.desc.slice(0, 60) }); }
    }
  }
}
const pct = (n, d) => (d ? Math.round((1000 * n) / d) / 10 : null);
const ketQuaPct = Object.fromEntries(Object.entries(st.ketQua).map(([k, v]) => [k, `${v} (${pct(v, st.coSoTayNhomDung)}%)`]));
const out = {
  mau: st.mau, nhomDungCoSoTay: st.coSoTayNhomDung,
  phanBoKetQua: ketQuaPct,
  dongY: `${st.dongY} (${pct(st.dongY, st.coSoTayNhomDung)}%)`,
  batOanTrenMaDung: `${st.batOan} (${pct(st.batOan, st.coSoTayNhomDung)}%) — nghiệm thu ≤ 10%`,
  oanChiTiet: st.oanChiTiet.slice(0, 12),
};
if (argv.write) { mkdirSync(join(ROOT, 'data', 'so-tay', 'bao-cao'), { recursive: true }); writeFileSync(join(ROOT, 'data', 'so-tay', 'bao-cao', 'chay-kho-chot-dong.json'), JSON.stringify(out, null, 1)); }
console.log(JSON.stringify(out, null, 1));
