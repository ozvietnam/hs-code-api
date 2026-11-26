#!/usr/bin/env node
// scripts/luat-goc/nghia.mjs — nghĩa của cạnh dẫn chiếu (M-33): câu nhắc tới đích ĐỂ LÀM GÌ, với ĐIỀU KIỆN chữ luật nào. Hai phiếu độc lập; lệch thì CHUA_RO, cạnh vẫn còn.
//   --goi=<tệp>            ghi mọi việc (một dòng một câu: {cau, nguon, dan[], chu, canh:[{e,den,ten,trich}]})
//   --ghep <p1> <p2>       ghép hai phiếu, in kết quả
//   --kiem                 kiểm data/luat-goc/nghia-canh/*.jsonl với kho
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const GOC = process.env.LUAT_GOC_DIR || fileURLToPath(new URL('../../data/luat-goc/', import.meta.url));
export const LOAI = ['LOAI_SANG', 'GOM', 'AP_DUNG', 'DINH_NGHIA', 'KHONG_RO'];
const chuan = (s) => String(s || '').normalize('NFC').replace(/\s+/g, ' ').trim();

/** Việc của mọi câu có cạnh, nguồn là chú giải (không biểu, không tiền lệ, không quy tắc). */
export function viec({ nut, cau, canh }) {
  const theo = new Map(nut.map((n) => [n.id, n])); const C = new Map(cau.map((c) => [c.id, c])); const ra = new Map();
  const chuCau = (id) => { const c = C.get(id); const n = c && theo.get(id.slice(0, id.lastIndexOf('#'))); return n ? n.nguyenVan.slice(c.tu, c.den).trim() : ''; };
  const tenNut = (id) => { const n = theo.get(id); return n ? chuan(n.nguyenVan).slice(0, 140) : null; };
  for (const e of canh) {
    if (!/^(phan|chuong|nhom|pn|sen):/.test(e.tuNut)) continue;
    if (tuNhac(e.tuNut, e.den)) continue;
    let v = ra.get(e.tu);
    if (!v) {
      const dan = []; let d = C.get(e.tu)?.dan; while (d && dan.length < 4) { dan.unshift(chuCau(d)); d = C.get(d)?.dan; }
      v = { cau: e.tu, nguon: e.tuNut, dan, chu: chuCau(e.tu), canh: [] }; ra.set(e.tu, v);
    }
    if (!v.canh.some((x) => x.den === e.den)) v.canh.push({ e: `E${v.canh.length + 1}`, den: e.den, ten: tenNut(e.den), trich: e.trich });
  }
  return [...ra.values()];
}

/** Một phiếu {loai, dieuKien} hợp lệ với việc của nó không. Rỗng = đạt. */
export function kiemPhieu(v, p) {
  const loi = []; if (!LOAI.includes(p?.loai)) return ['nhãn lạ'];
  const than = chuan([...v.dan, v.chu].join(' '));
  if (p.dieuKien && !than.includes(chuan(p.dieuKien))) loi.push('điều kiện không nguyên văn');
  if (p.loai === 'LOAI_SANG' && chuan(p.dieuKien).length < 2) loi.push('loại trừ mà không có điều kiện');
  return loi;
}

const { CHUONG_SANG_PHAN } = require('../../lib/do-thi/dan-chieu.js');
const maCua = (id) => /^(?:bieu|nhom|pn|sen|wco):(\d{2,8})/.exec(id)?.[1] || /^chuong:(\d{2})/.exec(id)?.[1] || /^sen:chuong:(\d{2})/.exec(id)?.[1] || null;
const phanCua = (id) => /^(?:sen:)?phan:([IVX]+)/.exec(id)?.[1] || (maCua(id) ? CHUONG_SANG_PHAN[maCua(id).slice(0, 2)] : null);
/** Đích nằm TRONG phạm vi nút nguồn (Chương 84 → 84.36): không thể "loại sang", chỉ có thể là phân về nút con. */
export function trongNguon(nguon, den) {
  const p = /^(?:sen:)?phan:([IVX]+)/.exec(nguon)?.[1]; if (p) return phanCua(den) === p;
  const m = maCua(nguon); const d = maCua(den); return !!(m && d && d.startsWith(m));
}
/** Câu tự nhắc mã của chính nút mình ("7308.90.40 …" ở sen:73089040): không phải dẫn chiếu. */
export function tuNhac(nguon, den) { const m = /^(?:nhom|pn|sen):(\d{4,8})/.exec(nguon)?.[1]; return !!m && maCua(den) === m; }

/** Ghép hai phiếu cùng một cạnh. Điều cốt lõi là có CHUYỂN HƯỚNG hay không; GOM / AP_DUNG / DINH_NGHIA lẫn nhau không đổi đường đi. */
/** Mã của đích viết như trong chữ luật: bieu:7322 → "73.22", bieu:732210 → "7322.10", chuong:85 → "Chương 85". */
function maViet(den) {
  let m;
  if ((m = /^bieu:(\d{2})(\d{2})$/.exec(den))) return `${m[1]}\\.${m[2]}`;
  if ((m = /^bieu:(\d{4})(\d{2})(\d{2})?$/.exec(den))) return `${m[1]}\\.${m[2]}${m[3] ? `\\.?${m[3]}` : ''}`;
  if ((m = /^chuong:(\d{2})$/.exec(den))) return `chương\\s+${Number(m[1])}`;
  return null;
}
/** Câu PHỦ ĐỊNH đúng đích ("… mà không phải nhóm 73.22", "không được phân loại vào nhóm 87.08"): đích là nơi hàng KHÔNG về,
 *  nên cạnh tới đích đó không thể là LOAI_SANG / PHAN_VE. (M-33 sửa sau đọc tay M-73.) */
export function phuDinhDich(chu, den) {
  const ma = maViet(den); if (!ma) return false;
  return new RegExp(`(?<!chân )không\\s+(?:phải(?:\\s+là)?|được\\s+phân\\s+loại(?:\\s+(?:vào|ở|tại|trong))?)\\s+(?:(?:các\\s+)?(?:phân\\s+)?nhóm\\s+)?${ma}(?!\\d)`, 'i').test(chuan(chu));
}

export function ghep(v, den, p1, p2) {
  if (phuDinhDich([...v.dan, v.chu].join(' '), den)) return { trangThai: 'CHUA_RO', vi: 'câu phủ định đích' };
  const ps = [p1, p2]; const nv = (p) => { const than = chuan([...v.dan, v.chu].join(' ')); const d = chuan(p?.dieuKien); return d.length >= 2 && than.includes(d) ? d : ''; };
  if (!ps.every((p) => LOAI.includes(p?.loai))) return { trangThai: 'CHUA_RO', vi: 'nhãn lạ' };
  const dk = ps.map(nv).sort((a, b) => b.length - a.length)[0]; //  bản nguyên văn dài nhất: thiếu chữ là mất điều kiện
  const nhom = (l) => (l === 'LOAI_SANG' ? 'CHUYEN' : l === 'KHONG_RO' ? 'KHONG_RO' : 'GIU');
  const [a, b] = ps.map((p) => p.loai);
  if (a === 'KHONG_RO' || b === 'KHONG_RO') return { trangThai: 'CHUA_RO', vi: `${a} / ${b}` };
  if (trongNguon(v.nguon, den) && [a, b].some((l) => l === 'LOAI_SANG') && [a, b].every((l) => l === 'LOAI_SANG' || l === 'GOM')) return dk ? { trangThai: 'KHOP', loai: 'PHAN_VE', dieuKien: dk } : { trangThai: 'CHUA_RO', vi: 'không có điều kiện nguyên văn' };
  if (nhom(a) !== nhom(b)) return { trangThai: 'CHUA_RO', vi: `${a} / ${b}` };
  if (nhom(a) === 'CHUYEN') return dk ? { trangThai: 'KHOP', loai: 'LOAI_SANG', dieuKien: dk } : { trangThai: 'CHUA_RO', vi: 'không có điều kiện nguyên văn' };
  return { trangThai: 'KHOP', loai: a === b ? a : 'GIU', dieuKien: dk || '' };
}

function docJsonl(f) { return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)); }
function tai() {
  const D = require('../../lib/do-thi/dan-chieu.js'); const k = D.docKhoLuatGoc(GOC, { coCau: true });
  const nut = k.nut.filter((n) => n.lop !== 'TIEN_LE'); const giu = new Set(nut.map((n) => n.id)); const cau = k.cau.filter((c) => giu.has(c.id.slice(0, c.id.lastIndexOf('#'))));
  const t = D.dungDoThiDanChieu({ nut, cau, khoNut: D.taoKhoNut(nut) }); return viec({ nut, cau, canh: t.canh });
}
function main() {
  const a = process.argv.slice(2); const goi = a.find((x) => x.startsWith('--goi='));
  if (goi) { const v = tai(); fs.writeFileSync(goi.slice(6), `${v.map((x) => JSON.stringify(x)).join('\n')}\n`); console.log(`${v.length} câu, ${v.reduce((s, x) => s + x.canh.length, 0)} cạnh`); return; }
  const V = new Map(tai().map((v) => [v.cau, v]));
  if (a[0] === '--ghep') {
    const P = a.slice(1, 3).map((f) => new Map(docJsonl(f).map((x) => [`${x.cau}\0${x.den}`, x]))); const dem = {};
    for (const v of V.values()) for (const c of v.canh) {
      const k = `${v.cau}\0${c.den}`; const [p1, p2] = P.map((m) => m.get(k)); if (!p1 || !p2) { dem.thieuPhieu = (dem.thieuPhieu || 0) + 1; console.log(JSON.stringify({ tu: v.cau, den: c.den, trangThai: 'CHUA_RO', vi: 'thiếu phiếu', phieu: [p1, p2].filter(Boolean).map(({ loai, dieuKien, mo }) => ({ loai, dieuKien, mo })) })); continue; }
      const r = ghep(v, c.den, p1, p2); const n = r.trangThai === 'KHOP' ? r.loai : 'CHUA_RO'; dem[n] = (dem[n] || 0) + 1;
      console.log(JSON.stringify({ tu: v.cau, den: c.den, ...r, phieu: [p1, p2].map(({ loai, dieuKien, mo }) => ({ loai, dieuKien, mo })) }));
    }
    console.error(JSON.stringify(dem)); return;
  }
  if (a.includes('--kiem')) {
    let n = 0; let hong = 0; const D = path.join(GOC, 'nghia-canh');
    for (const f of fs.existsSync(D) ? fs.readdirSync(D).filter((x) => x.endsWith('.jsonl')) : []) for (const x of docJsonl(path.join(D, f))) {
      n += 1; const v = V.get(x.tu); const loi = [];
      if (!v || !v.canh.some((c) => c.den === x.den)) loi.push('cạnh không có trong kho');
      else if (x.trangThai === 'KHOP' && ['LOAI_SANG', 'PHAN_VE'].includes(x.loai) && phuDinhDich(v.chu, x.den)) loi.push('câu phủ định đích mà cạnh ghi ' + x.loai);
      else if (x.trangThai === 'KHOP') { if (!['LOAI_SANG', 'PHAN_VE', 'GOM', 'AP_DUNG', 'DINH_NGHIA', 'GIU'].includes(x.loai)) loi.push('nhãn lạ'); if (x.dieuKien && !chuan([...v.dan, v.chu].join(' ')).includes(x.dieuKien)) loi.push('điều kiện không nguyên văn'); if (['LOAI_SANG', 'PHAN_VE'].includes(x.loai) && !x.dieuKien) loi.push('thiếu điều kiện'); } else if (x.trangThai !== 'CHUA_RO') loi.push('trạng thái lạ');
      if (loi.length) { hong += 1; if (hong <= 10) console.log(`✗ ${x.tu} → ${x.den}: ${loi.join('; ')}`); }
    }
    console.log(`${hong ? 'FAIL' : 'PASS'} nghĩa cạnh: ${n} cạnh, ${hong} lỗi`); process.exit(hong ? 1 : 0);
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
