#!/usr/bin/env node
// scripts/luat-goc/bieu-doi-chieu.mjs — thẻ M-18: đối chiếu độc lập kho bieu với bản in Chú giải chi tiết HS 2022, với cây lib/hs-tree.js và với
// danh mục cổng Hải quan; kiểm bất biến cây. Chỉ đọc.   node scripts/luat-goc/bieu-doi-chieu.mjs --cgct <thư mục> [--chi-tiet <tệp.json>]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { GOC } from './bieu-doc.mjs';
import { docBanIn } from './bieu-ban-in.mjs';

const require = createRequire(import.meta.url);
const thamSo = (t) => { const i = process.argv.indexOf(t); return i > 0 ? process.argv[i + 1] : null; };
const nut = fs.readFileSync(path.join(GOC, 'data/luat-goc/bieu.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const N = new Map(nut.map((x) => [x.id, x]));
const con = new Map(); for (const x of nut) if (x.cha) con.set(x.cha, [...(con.get(x.cha) || []), x]);
const boGach = (s) => String(s).replace(/^[-–\s]+/, '').trim();
// ba mức so chữ: y nguyên chữ-số · bỏ dấu thanh/y-i · còn lại là khác chữ thật
const gon = (s) => boGach(s).replace(/\(\d\)/g, '').normalize('NFC').toLowerCase().replace(/\((\+|sen)\)/gi, '').replace(/[^\p{L}\p{N}]+/gu, '');
const gonDau = (s) => gon(s).normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/y/g, 'i');
const giong = (a, b) => (gon(a) === gon(b) ? 0 : gonDau(a) === gonDau(b) ? 1 : 2);

const haiChu = (s) => { const m = new Map(); const t = gonDau(s); for (let i = 0; i + 1 < t.length; i += 1) m.set(t.slice(i, i + 2), (m.get(t.slice(i, i + 2)) || 0) + 1); return m; };
const dice = (a, b) => { const x = haiChu(a); const y = haiChu(b); let c = 0; let n = 0; for (const [k, v] of x) { n += v; c += Math.min(v, y.get(k) || 0); } for (const v of y.values()) n += v; return n ? (2 * c) / n : 1; };
const so = (s) => (String(s).match(/\d+/g) || []).join(' ');
const tu = (s) => (boGach(s).toLowerCase().match(/(?<!\p{L})(trừ|không|chưa|đã|trên|dưới|quá|và|khác)(?!\p{L})/gu) || []).sort().join(' ');
/** khác có thể đổi nghĩa: số khác, từ phủ định / giới hạn khác, hoặc giống dưới 0,8 */
const boSo = (s) => String(s).replace(/\s*\(\d\)/g, '').replace(/\(SEN\)/g, '').trim(); // bỏ dấu chú thích "(1)" của biểu / bản in
const nang = (a0, b0) => { const a = boSo(a0); const b = boSo(b0); return [so(a) !== so(b) ? 'số' : null, tu(a) !== tu(b) ? 'từ giới hạn' : null, dice(a, b) < 0.8 ? 'chữ' : null].filter(Boolean); };

// ── A. bất biến ──
const loi = [];
for (const x of nut) {
  const thay = new Set(); let y = x; while (y) { if (thay.has(y.id)) { loi.push(`vòng ${x.id}`); break; } thay.add(y.id); y = y.cha ? N.get(y.cha) : null; }
  if (x.cap === 'DONG' && !thay.has(`bieu:${x.id.slice(5, 9)}`)) loi.push(`${x.id} không lên tới nhóm`);
  if (x.cap === 'DONG' && !thay.has(`bieu:${x.id.slice(5, 11)}`) && !x.ngoaiPhanNhom) loi.push(`${x.id} không qua phân nhóm ${x.id.slice(5, 11)}`);
  if (x.cap === 'PHAN_NHOM' && !thay.has(`bieu:${x.id.slice(5, 9)}`)) loi.push(`${x.id} không lên tới nhóm`);
  const p = x.cha && N.get(x.cha); if (p && p.gach != null && x.gach <= p.gach && x.nguon.dong !== p.nguon.dong) loi.push(`${x.id} gạch ${x.gach} ≤ cha ${p.gach}`);
}
for (const [c, ds] of con) if (N.get(c).gach != null && new Set(ds.map((x) => x.gach)).size > 1) loi.push(`anh em khác gạch dưới ${c}: ${ds.map((x) => `${x.id}(${x.gach})`).join(' ')}`);
console.log(`BẤT BIẾN: ${loi.length} lỗi`); for (const l of loi.slice(0, 20)) console.log('  ', l);
for (const x of nut) if (x.tuBanIn && !x.nguon.trang) console.log('  tuBanIn thiếu trang', x.id);

// ── B. bản in ──
const { ban, dauCong } = thamSo('--cgct') ? docBanIn(thamSo('--cgct')) : { ban: new Map(), dauCong: new Map() };
if (!ban.size) console.log('CHƯA ĐỐI CHIẾU BẢN IN (không có --cgct): số ở mục bản in dưới đây không có nghĩa');
const cay = new Map(nut.filter((x) => x.cap === 'PHAN_NHOM' && !x.id.startsWith('bieu:98')).map((x) => [x.id.slice(5), x]));
const tieuDeCay = (x) => { let y = N.get(x.cha); while (y && y.cap !== 'NHOM') { if (y.cap === 'TIEU_DE_PHAN_NHOM') return y; y = N.get(y.cha); } return null; };
const in_ = new Map(); const nhomIn = new Map();
for (const [f, b] of ban) for (const [h4, k] of b) {
  nhomIn.set(h4, [...(nhomIn.get(h4) || []), { f, ten: k.ten, trang: k.trang }]);
  let td = null;
  k.muc.forEach((y, i) => {
    if (!y.ma) { td = y; return; }
    if (y.gach === 1) td = null; // mã một gạch: hết phạm vi tiêu đề
    const o = { f, ma: y.ma, gach: y.gach, ten: y.ten, trang: y.trang, td: y.gach === 2 || y.gach == null ? td : null, cuoi: i === k.muc.length - 1 };
    in_.set(y.ma, [...(in_.get(y.ma) || []), o]);
  });
}
const kq = { thieuTrongCay: [], thieuTrongIn: [], khacGach: [], tieuDeInCayThieu: [], tieuDeCayInThieu: [], tieuDeKhacGach: [], tieuDeKhacChu: [], tieuDeKhacDau: [], tenKhacChu: [], tenKhacDau: [], nhomKhongThay: [], nhomKhacChu: [] };
for (const [ma, ds] of in_) if (!cay.has(ma) && (N.has(`bieu:${ma.slice(0, 4)}`) || ma.startsWith('9420'))) kq.thieuTrongCay.push({ ma, ban: ds.length, trang: ds[0].trang, ten: ds[0].ten });
let khopTen = 0; let khopTd = 0; let khopGach = 0;
// tên in của mục cuối danh sách dính phần văn sau nó: so theo đầu chuỗi
const soTen = (bieu, o) => { const g = giong(bieu, o.ten); if (g < 2 || !o.cuoi) return g; const a = gon(o.ten); const b = gon(bieu); if (a.startsWith(b)) return 0; return gonDau(o.ten).startsWith(gonDau(bieu)) ? 1 : 2; };
const capTd = new Map();
for (const [ma, x] of cay) {
  const ds = in_.get(ma);
  if (!ds) { if (!ma.endsWith('00')) kq.thieuTrongIn.push({ ma, ten: x.nguyenVan }); continue; }
  const coG = ds.filter((o) => o.gach != null);
  if (coG.some((o) => o.gach === x.gach)) khopGach += 1; else kq.khacGach.push({ ma, cay: x.gach, quyUocSo: ma.endsWith('0') ? 1 : 2, in: ds.map((o) => o.gach), trang: ds[0].trang, ten: ds[0].ten });
  const t = Math.min(...ds.map((o) => soTen(x.nguyenVan, o)));
  if (t === 0) khopTen += 1; else (t === 1 ? kq.tenKhacDau : kq.tenKhacChu).push({ ma, bieu: x.nguyenVan, in: ds.map((o) => (o.cuoi ? o.ten.slice(0, boGach(x.nguyenVan).length + 2) : o.ten)).sort((p, q) => dice(q, x.nguyenVan) - dice(p, x.nguyenVan))[0], trang: ds[0].trang });
  const tc = tieuDeCay(x); const ti = ds.map((o) => o.td).filter(Boolean);
  if (tc) { const k = tc.id; const e = capTd.get(k) || { tc, ti: [], ma: [] }; e.ti.push(...ti); e.ma.push(ma); capTd.set(k, e); } else if (ti.length === ds.length) kq.tieuDeInCayThieu.push({ ma, ten: ti[0].ten, trang: ti[0].trang });
}
for (const { tc, ti, ma } of capTd.values()) {
  if (!ti.length) { kq.tieuDeCayInThieu.push({ id: tc.id, ten: tc.nguyenVan, ma }); continue; }
  if (!ti.some((o) => o.gach === tc.gach)) kq.tieuDeKhacGach.push({ id: tc.id, cay: tc.gach, in: ti[0].gach, trang: ti[0].trang, ten: tc.nguyenVan });
  const t = Math.min(...ti.map((o) => giong(tc.nguyenVan, o.ten)));
  if (t === 0) khopTd += 1; else (t === 1 ? kq.tieuDeKhacDau : kq.tieuDeKhacChu).push({ id: tc.id, bieu: tc.nguyenVan, in: ti.map((o) => o.ten).sort((p, q) => dice(q, tc.nguyenVan) - dice(p, tc.nguyenVan))[0], trang: ti[0].trang });
}
for (const k of ['tenKhacChu', 'tieuDeKhacChu']) for (const x of kq[k]) x.nang = nang(x.bieu, x.in);
let khopNhom = 0;
for (const x of nut.filter((y) => y.cap === 'NHOM' && !y.id.startsWith('bieu:98'))) {
  const ds = nhomIn.get(x.id.slice(5))?.filter((o) => o.ten); if (!ds?.length) { kq.nhomKhongThay.push({ ma: x.id.slice(5), ten: x.nguyenVan }); continue; }
  const ok = Math.min(...ds.map((o) => (gon(o.ten).startsWith(gon(x.nguyenVan)) ? 0 : gonDau(o.ten).startsWith(gonDau(x.nguyenVan)) ? 1 : 2)));
  if (ok < 2) khopNhom += 1; else kq.nhomKhacChu.push({ ma: x.id.slice(5), bieu: x.nguyenVan, in: ds.map((o) => o.ten).sort((p, q) => dice(q, x.nguyenVan) - dice(p, x.nguyenVan))[0].slice(0, x.nguyenVan.length + 2), trang: ds[0].trang });
}
for (const x of kq.nhomKhacChu) x.nang = nang(x.bieu, x.in);
console.log('KHÁC CHỮ NẶNG:', ['nhomKhacChu', 'tieuDeKhacChu', 'tenKhacChu'].map((k) => `${k} ${kq[k].filter((x) => x.nang.length).length}/${kq[k].length}`).join(' · '));
console.log('BẢN IN:', JSON.stringify({ banChu: [...ban.keys()], nhomIn: nhomIn.size, maIn: in_.size, phanNhomCay: cay.size, khopGach, khopTen, khopTd, khopNhom, dauCong: dauCong.size, ...Object.fromEntries(Object.entries(kq).map(([k, v]) => [k, v.length])) }, null, 1));

// ── C. cây hs-tree: cha (bỏ nút cungDong và nhóm số không có dòng biểu) của từng dòng ──
const T = require('../../lib/hs-tree.js');
const khacHs = [];
for (const x of nut.filter((y) => y.cap === 'DONG')) {
  const a = []; let y = N.get(x.cha); while (y && y.cap !== 'CHUONG') { if (!(y.cungDong && y.nguon.dong === x.nguon.dong) && !/^bieu:\d{4}00$/.test(y.id)) a.push(gon(y.nguyenVan)); y = N.get(y.cha); }
  const b = []; let id = T.chaTang(x.id.slice(5)); while (id && id.length > 2 && !id.startsWith('P')) { const n = T.nodeOf(id); if (n.cap === 2) break; b.push(gon(n.tenVi || '') || `∅${id}`); id = T.chaTang(id); }
  const a2 = a.slice(0, -1).join('>'); const b2 = b.slice(0, -1).join('>'); if (a2 !== b2) khacHs.push({ ma: x.id.slice(5), bieu: a2, hs: b2 });
}
const trongSo = khacHs.filter((x) => x.hs.includes('∅')); // hs-tree chen nhóm chữ số không có dòng nào trong biểu
console.log('HS-TREE: dòng có chuỗi tổ tiên (dưới nhóm) khác', khacHs.length, '— chương 98:', khacHs.filter((x) => x.ma.startsWith('98')).length, '· hs-tree có nút không tên:', trongSo.length, '· còn lại:', khacHs.length - trongSo.length);

// ── D. tên dòng: tax.json và cổng Hải quan ──
const tax = require(path.join(GOC, 'data/tax.json')); const hq = JSON.parse(fs.readFileSync(path.join(GOC, 'data/hs/customs-danh-muc-2026-11-13.json'), 'utf8')).danhMuc;
const lechTax = []; const lechHq = [];
for (const x of nut.filter((y) => y.cap === 'DONG')) { const m = x.id.slice(5); if (tax[m].vn.normalize('NFC').trim() !== x.nguyenVan) lechTax.push({ ma: m, bieu: x.nguyenVan, tax: tax[m].vn }); if (hq[m] && gonDau(hq[m]) !== gonDau(x.nguyenVan)) lechHq.push({ ma: m, bieu: x.nguyenVan, hq: hq[m] }); }
console.log('TÊN DÒNG: khác tax.json', lechTax.length, '· khác cổng Hải quan', lechHq.length);
if (thamSo('--chi-tiet')) fs.writeFileSync(thamSo('--chi-tiet'), JSON.stringify({ loi, ...kq, khacHs, lechTax, lechHq }, null, 1));
process.exit(loi.length ? 1 : 0);
