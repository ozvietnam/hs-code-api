// lib/do-thi/doi-ma-nguon.js — ĐỔI MÃ NGUỒN CŨ sang id nút luật mới (M-35, #1916; khuôn doi-ma@1).
//
// Kho cạnh / sổ tay / điều khoản đang trích theo nhiều kiểu mã cũ (`phan:01:chu_giai:1`, `ct.7616.3`,
// `ch84.chuong`, `tax.84122100`, …). Module này đọc bảng đổi data/luat-goc/doi-ma.json (mỗi dòng một trích
// riêng biệt: mã cũ + trích đã làm phẳng 120 ký tự → id nút luật mới) và trả id mới cho mọi trích đã có trong bảng.
// Trích KHÔNG còn thấy trong bản 2022 nằm ở `luatCu` của bảng — đó là cạnh dựng trên luật cũ, KHÔNG xoá, KHÔNG sửa.
//
// Nguyên tắc kiểm (docs/mong/khuon-nut-luat.md): trích cũ phải thấy NGUYÊN VĂN trong nút mới. Phép làm phẳng
// giống scripts/kiem-luat-goc.mjs (NFC, nối dòng, khoảng trắng quanh dấu nối không tính) cộng gộp biến thể
// ngoặc kép; các chế độ `kiem` của từng dòng bảng đổi ghi rõ phép đã dùng (xem `phepKiem` trong tệp bảng).
// Không thay một chữ nào trong trích.
//
// Chạy lại khi QT gộp M-11/13/14/15/16 (kho nhom hiện dùng bản tạm 1dd2dadc):
//   node lib/do-thi/doi-ma-nguon.js --xay-dung
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DUONG_BANG = path.join(__dirname, '..', '..', 'data', 'luat-goc', 'doi-ma.json');
const CAC_KHO = ['gir', 'chuong', 'bieu', 'phan', 'phan-nhom', 'sen', 'nhom'];
const KHO_TRICH = [
  'data/luat/dieu-khoan-tang2.json',
  'data/luat/dieu-khoan-bo-sung.json',
  'data/so-tay',
  'data/do-thi',
  'data/ho-so/ranh-gioi',
];

// ---------- Làm phẳng ----------
const Q = { '\u201c': '"', '\u201d': '"', '\u201e': '"', '\u201f': '"', '\u2018': "'", '\u2019': "'" };
/** NFC + gộp biến thể ngoặc kép + nối dòng. */
function chuanVanBan(s) {
  let x = String(s).normalize('NFC');
  for (const [k, v] of Object.entries(Q)) x = x.split(k).join(v);
  return x.replace(/\s+/g, ' ').trim();
}
/** Như chuanSo của kiem-luat-goc.mjs: khoảng trắng quanh dấu nối không tính. */
function chuanSo(s) {
  return chuanVanBan(s).replace(/ ?([-–—/]) ?/g, '$1');
}
const RE_TIEN_TO = /^(?:\([0-9ivx]{1,4}\)|[0-9]{1,3}|[a-z]{1,3})[.\-–—)]{0,3}\s*/;
const boTienTo = (s) => (RE_TIEN_TO.test(s) ? s.slice(s.match(RE_TIEN_TO)[0].length) : s);
const boSoTrangCuoi = (s) => s.replace(/\s*\d{1,4}\.?$/, '');

/**
 * Trích có thấy được trong văn bản nút không? Trả chế độ khớp (trùng khoá `phepKiem` của bảng) hoặc null.
 * @param {string} trich
 * @param {string} van
 * @param {number} [teBa=0] ngưỡng độ dài tối thiểu của trích (tìm toàn kho dùng 20 để tránh khớp nhầm).
 */
function coTrong(trich, van, teBa = 0) {
  const a = chuanSo(trich);
  const b = chuanSo(van);
  if (!a || !b) return null;
  const nho = Math.max(teBa, 1);
  if (a.length >= nho && b.includes(a)) return 'nguyenVan';
  if (a.length >= nho && b.toLowerCase().includes(a.toLowerCase())) return 'khongHoa';
  if (teBa === 0 && a.length < 20) return null; // trích ngắn: không thử tiếp phép yếu hơn
  const a2 = boTienTo(a);
  const b2 = boTienTo(b);
  if (a2.length >= 20 && b2.includes(a2)) return 'boTienTo';
  if (a2.length >= 20 && b2.toLowerCase().includes(a2.toLowerCase())) return 'boTienTo';
  const a3 = boSoTrangCuoi(a2);
  if (a3 !== a2 && a3.length >= 20 && (b2.includes(a3) || b2.toLowerCase().includes(a3.toLowerCase()))) return 'boSoTrang';
  // trích có "…" (bỏ đoạn giữa): từng mảnh ≥ 20 ký tự thấy nguyên văn, đúng thứ tự
  const doan = a.split(/\u2026|\.\.\./).map((d) => d.trim()).filter((d) => d.length >= 20);
  if (doan.length >= 2) {
    let vt = 0;
    let ok = true;
    for (const d of doan) {
      const j = b.indexOf(d, vt);
      if (j < 0) { ok = false; break; }
      vt = j + d.length;
    }
    if (ok) return 'gachDoan';
  }
  return null;
}

/** Trích bắt đầu bằng TOÀN BẢ nút (dính đuôi câu dẫn của khoản khác — dòng tang2 QT đã cảnh báo). */
function cuChuaNut(trich, van) {
  const a2 = boTienTo(chuanSo(trich));
  const b2 = boTienTo(chuanSo(van));
  return b2.length >= 30 && a2.length > b2.length && a2.startsWith(b2);
}

/** Gần khớp ≥ 95% (chỉ để GHI CHÚ cho luật cũ, không dùng làm căn cứ đổi). */
function ganNhau(a, b) {
  const x = chuanSo(a).slice(0, 400);
  const y = chuanSo(b).slice(0, 400);
  if (!x.length || !y.length) return false;
  // Levenshtein thuần (đủ nhanh cho chuỗi ≤ 400)
  const f = Array.from({ length: x.length + 1 }, (_, i) => [i, ...Array(y.length).fill(0)]);
  for (let j = 0; j <= y.length; j++) f[0][j] = j;
  for (let i = 1; i <= x.length; i++) {
    for (let j = 1; j <= y.length; j++) {
      f[i][j] = Math.min(f[i - 1][j] + 1, f[i][j - 1] + 1, f[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    }
  }
  return 1 - f[x.length][y.length] / Math.max(x.length, y.length) >= 0.95;
}

// ---------- Đọc bảng ----------
let _bang = null;
/** Nạp bảng đổi (lần đầu) và dựng chỉ mục theo mã cũ. */
function napBang() {
  if (_bang) return _bang;
  const goc = JSON.parse(fs.readFileSync(DUONG_BANG, 'utf8'));
  const theoCu = new Map();
  for (const r of goc.banDo) {
    if (!theoCu.has(r.cu)) theoCu.set(r.cu, []);
    theoCu.get(r.cu).push(r);
  }
  const luatCu = new Set(goc.luatCu.map((e) => `${e.cu}::${e.trich}`));
  _bang = { goc, theoCu, luatCu };
  return _bang;
}
/** Bỏ bảng trong RAM (test, hoặc sau khi tệp bảng đổi). */
function datLai() { _bang = null; }

const catTrich = (s) => chuanSo(s).slice(0, 200).replace(/\s+$/, '');
const catTrichDai = catTrich;

/**
 * Đổi một trích cũ sang id nút luật mới.
 * @param {string} maCu mã kiểu cũ (`phan:01:chu_giai:1`, `ct.7616.3`, `ch84.chuong`, `tax.84122100`, …)
 * @param {string} [trich] trích nguyên văn đi kèm mã (nhiều kiểu mã chỉ định vị được qua trích)
 * @returns {{trangThai:'DOI', idMoi:string, kho:string, kiem:string, kemTheoTrich:boolean}
 *          |{trangThai:'LUAT_CU', cu:string, trich:string}
 *          |{trangThai:'KHONG_RO', lyDo:string, soUngCu?:number}}
 */
function doiMaNguon(maCu, trich) {
  const bang = napBang();
  if (typeof maCu !== 'string' || !maCu) return { trangThai: 'KHONG_RO', lyDo: 'thiếu mã cũ' };
  if (trich != null && String(trich).trim()) {
    const t = catTrich(trich);
    const ro = (bang.theoCu.get(maCu) || []).find((r) => r.trich === t);
    if (ro) return { trangThai: 'DOI', idMoi: ro.moi, kho: ro.kho, kiem: ro.kiem, kemTheoTrich: true };
    if (bang.luatCu.has(`${maCu}::${catTrichDai(trich)}`)) {
      return { trangThai: 'LUAT_CU', cu: maCu, trich: catTrichDai(trich) };
    }
  }
  const hung = bang.theoCu.get(maCu);
  if (!hung) return { trangThai: 'KHONG_RO', lyDo: `mã cũ "${maCu}" chưa có trong bảng đổi` };
  const dac = [...new Set(hung.map((r) => r.moi))];
  if (dac.length === 1) {
    return { trangThai: 'DOI', idMoi: hung[0].moi, kho: hung[0].kho, kiem: hung[0].kiem, kemTheoTrich: false };
  }
  return { trangThai: 'KHONG_RO', lyDo: `mã "${maCu}" có ${dac.length} đích khác nhau — cần trích để định vị`, soUngCu: hung.length };
}

// ---------- Bộ dựng lại bảng (chạy khi QT gộp các kho lớp 1) ----------
const LA_MA = (n) => {
  const bang = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let x = parseInt(n, 10); let r = '';
  for (const [v, s] of bang) { while (x >= v) { r += s; x -= v; } }
  return r;
};
const VUNG = { chu_giai: 'cg', chu_giai_phan_nhom: 'cgpn', chu_giai_bs: 'cgbs' };
const KIEU_OLD = [
  ['ct', /^ct\.(\d{4})\.(\d+)$/],
  ['tax', /^tax\.(\d{6,8})$/],
  ['tieuDe', /^tieuDe\.(\d{6,8})(?:~r\d+)?$/],
  ['sen', /^sen\.(\d{4,8})$/],
  ['chchuong', /^ch(\d{2})\.chuong$/],
  ['nhomnhom', /^nhom(\d{4})\.nhom$/],
  ['nhomai', /^nhom\d+\.(?:phan_biet|tinh_chat)$/],
  ['phanphan', /^phan(\d{2})\.phan$/],
  ['px16', /^px16\.cg(\d+)(?:\.([a-z]+))?$/],
  ['tuongUng', /^tuongUng\.(\d{8})$/],
  ['wco', /^wco\./],
  ['vb', /^vb\./],
  ['phanid', /^phan:(\d{2}):(chu_giai|chu_giai_phan_nhom|chu_giai_bs):([0-9]+)(?:([a-z]+))?(?:~\d+)?$/],
  ['chuongid', /^chuong:(\d{2}):(chu_giai|chu_giai_phan_nhom|chu_giai_bs):([0-9]+)(?:([a-z]+))?(?:~\d+)?$/],
];
const phanLoai = (ma) => {
  for (const [ten, re] of KIEU_OLD) { const m = re.exec(ma); if (m) return [ten, m]; }
  return [null, null];
};

function docJsonl(duong) {
  return fs.readFileSync(duong, 'utf8').split('\n').filter((x) => x.trim()).map((l) => JSON.parse(l));
}
function napKho(goc) {
  const kho = {};
  for (const k of CAC_KHO) {
    const p = path.join(goc, 'data', 'luat-goc', `${k}.jsonl`);
    kho[k] = fs.existsSync(p) ? docJsonl(p) : [];
  }
  return kho;
}

/** Tìm nút chứa trích trong một kho (ưu tiên cây con theo tiền tố id; ngưỡng trích ngắn chỉ cho cây con). */
function timTrong(kho, ten, trich, tienTo = null, teBa = 20) {
  const ungs = [];
  for (const n of kho[ten]) {
    if (tienTo && !n.id.startsWith(tienTo)) continue;
    const k = coTrong(trich, n.nguyenVan, tienTo ? teBa : 20);
    if (k) ungs.push([n.id, k]);
  }
  const uu = ungs.find((u) => u[1] === 'nguyenVan');
  return uu || ungs[0] || [null, null];
}

/** Thu lượm mọi trích cũ trong các kho dữ liệu: Map "ma::trích(chuẩn)" -> số lượt. */
function thuLuom(goc) {
  const trichCu = new Map();
  const ngoai = {};
  const them = (ma, trich) => {
    const k = `${ma}::${chuanSo(trich)}`;
    trichCu.set(k, (trichCu.get(k) || 0) + 1);
  };
  for (const tep of ['dieu-khoan-tang2.json', 'dieu-khoan-bo-sung.json']) {
    const p = path.join(goc, 'data', 'luat', tep);
    if (!fs.existsSync(p)) continue;
    for (const e of JSON.parse(fs.readFileSync(p, 'utf8'))) {
      const [loai] = phanLoai(e.id);
      if (loai === 'phanid' || loai === 'chuongid') them(e.id, e.nguyenVan || '');
    }
  }
  const quet = (o) => {
    if (Array.isArray(o)) { o.forEach(quet); return; }
    if (!o || typeof o !== 'object') return;
    const ma = o.nguon;
    if (typeof ma === 'string') {
      const [loai] = phanLoai(ma);
      if (loai === 'wco' || loai === 'vb' || loai === 'nhomai') { ngoai[loai] = (ngoai[loai] || 0) + 1; return; }
      if (loai) {
        const tr = o.trich;
        if (typeof tr === 'string' && tr.trim()) them(ma, tr);
        else if (loai === 'tax') them(ma, '');
      }
      return;
    }
    for (const v of Object.values(o)) quet(v);
  };
  const docThuMuc = (duong) => {
    const p = path.join(goc, duong);
    if (!fs.existsSync(p)) return;
    for (const f of fs.readdirSync(p, { withFileTypes: true })) {
      if (!f.name.endsWith('.json')) continue;
      try { quet(JSON.parse(fs.readFileSync(path.join(p, f.name), 'utf8'))); } catch { /* tệp hỏng: bỏ qua như bộ dựng gốc */ }
    }
  };
  docThuMuc('data/so-tay');
  docThuMuc('data/do-thi');
  docThuMuc('data/ho-so/ranh-gioi');
  docThuMuc('data/do-thi/ban-do-4so');
  return { trichCu, ngoai };
}

/**
 * Dựng lại toàn bộ bảng đổi từ các kho luật gốc + kho dữ liệu. Trả đối tượng bảng (chưa ghi đĩa).
 * Phải có đủ 7 kho trong data/luat-goc/ thì kết quả mới đầy đủ như bản đã commit.
 */
function xayDungDoiMa(goc = path.join(__dirname, '..', '..')) {
  const kho = napKho(goc);
  const theoId = Object.fromEntries(Object.entries(kho).map(([k, v]) => [k, new Map(v.map((n) => [n.id, n]))]));
  const { trichCu, ngoai } = thuLuom(goc);
  const banDo = [];
  const luatCu = [];
  const khoaDaGhi = new Set(); // (cu, trích 200 ký tự): hai trích chỉ khác nhau sau ký tự thứ 200 gộp về một dòng
  const ghi = (cu, trich, moi = null, khoDich = null, kiem = null, ghiChu = null) => {
    const khoa = `${cu}::${catTrich(trich)}`;
    if (khoaDaGhi.has(khoa)) return;
    khoaDaGhi.add(khoa);
    if (moi) banDo.push({ cu, trich: catTrich(trich), moi, kho: khoDich, kiem });
    else luatCu.push(ghiChu ? { cu, trich: catTrichDai(trich), ghiChu } : { cu, trich: catTrichDai(trich) });
  };
  const kiemUngCuVien = (trich, n) => (n ? coTrong(trich, n.nguyenVan) : null);
  for (const khoa of [...trichCu.keys()].sort()) {
    const [ma, trich] = khoa.split('::');
    const [loai, m] = phanLoai(ma);
    if (loai === 'wco' || loai === 'vb' || loai === 'nhomai') continue;
    let lam = false;
    if (loai === 'phanid' || loai === 'chuongid') {
      const gan = m[1]; const vung = m[2]; const khoan = m[3]; const diem = m[4] || '';
      const tienToKho = loai === 'phanid' ? `phan:${LA_MA(gan)}:` : `chuong:${gan}:`;
      const cand = `${tienToKho}${VUNG[vung]}:${khoan}${diem ? ':' + diem : ''}`;
      const n = theoId[loai === 'phanid' ? 'phan' : 'chuong'].get(cand);
      const k = kiemUngCuVien(trich, n);
      if (k) { ghi(ma, trich, cand, loai === 'phanid' ? 'phan' : 'chuong', k); lam = true; }
      if (!lam) {
        const thuTu = loai === 'phanid'
          ? [['phan', tienToKho], ['phan', null], ['chuong', null]]
          : [['chuong', tienToKho], ['chuong', null], ['phan', null]];
        for (const [ten, tienTo] of thuTu) {
          const r = timTrong(kho, ten, trich, tienTo, 5);
          if (r[0]) { ghi(ma, trich, r[0], ten, r[1]); lam = true; break; }
        }
      }
      if (!lam && n && cuChuaNut(trich, n.nguyenVan)) { ghi(ma, trich, cand, loai === 'phanid' ? 'phan' : 'chuong', 'cuChuaNut'); lam = true; }
      if (!lam) {
        const ghiChu = n && ganNhau(trich, n.nguyenVan)
          ? `gần khớp ${cand} (lệch vài ký tự — nghi lỗi chữ bản in, chờ thẻ kho soát)`
          : null;
        ghi(ma, trich, null, null, null, ghiChu);
      }
    } else if (loai === 'ct') {
      const cand = `nhom:${m[1]}:ct:${m[2]}`;
      const n = theoId.nhom.get(cand);
      const k = kiemUngCuVien(trich, n);
      if (k) { ghi(ma, trich, cand, 'nhom', k); continue; }
      let r = timTrong(kho, 'nhom', trich, `nhom:${m[1]}:`, 5);
      if (!r[0]) r = timTrong(kho, 'phan-nhom', trich, `pn:${m[1]}`, 20);
      if (!r[0]) r = timTrong(kho, 'nhom', trich, null, 20);
      if (r[0]) { ghi(ma, trich, r[0], r[0].startsWith('pn:') ? 'phan-nhom' : 'nhom', r[1]); continue; }
      if (n && cuChuaNut(trich, n.nguyenVan)) { ghi(ma, trich, cand, 'nhom', 'cuChuaNut'); continue; }
      ghi(ma, trich, null, null, null, n && ganNhau(trich, n.nguyenVan) ? `gần khớp ${cand} (chờ M-14 soát)` : null);
    } else if (loai === 'chchuong') {
      let r = timTrong(kho, 'chuong', trich, `chuong:${m[1]}:`, 5);
      if (!r[0]) r = timTrong(kho, 'chuong', trich, null, 20);
      if (!r[0]) r = timTrong(kho, 'phan', trich, null, 20);
      if (r[0]) ghi(ma, trich, r[0], r[0].startsWith('phan:') ? 'phan' : 'chuong', r[1]);
      else ghi(ma, trich);
    } else if (loai === 'nhomnhom') {
      const id = m[1];
      let r = timTrong(kho, 'nhom', trich, `nhom:${id}:`, 5);
      if (!r[0]) r = timTrong(kho, 'phan-nhom', trich, `pn:${id}`, 20);
      let dat = false;
      if (r[0]) { ghi(ma, trich, r[0], r[0].startsWith('pn:') ? 'phan-nhom' : 'nhom', r[1]); dat = true; }
      if (!dat) {
        const n = theoId.bieu.get(`bieu:${id}`);
        const k = n ? coTrong(trich, n.nguyenVan) : null;
        if (k) { ghi(ma, trich, `bieu:${id}`, 'bieu', k); dat = true; }
      }
      if (!dat) {
        const rs = timTrong(kho, 'sen', trich, `sen:${id}`, 20);
        if (rs[0]) { ghi(ma, trich, rs[0], 'sen', rs[1]); dat = true; }
      }
      if (!dat) ghi(ma, trich);
    } else if (loai === 'phanphan') {
      let r = timTrong(kho, 'phan', trich, null, 20);
      if (!r[0]) r = timTrong(kho, 'chuong', trich, null, 20);
      if (r[0]) ghi(ma, trich, r[0], r[0].startsWith('phan:') ? 'phan' : 'chuong', r[1]);
      else ghi(ma, trich);
    } else if (loai === 'sen') {
      const r = timTrong(kho, 'sen', trich, `sen:${m[1]}:`, 20);
      if (r[0]) ghi(ma, trich, r[0], 'sen', r[1]);
      else ghi(ma, trich);
    } else if (loai === 'tax' || loai === 'tieuDe' || loai === 'tuongUng') {
      const n = theoId.bieu.get(`bieu:${m[1]}`);
      if (!n) { ghi(ma, trich); continue; }
      let k = trich ? coTrong(trich, n.nguyenVan) : null;
      if (!k && trich && loai === 'tax') {
        const daBo = trich.replace(/^\d{6,10}\s*[-–—]*\s*/, '');
        if (daBo !== trich && coTrong(daBo, n.nguyenVan)) k = 'boMaDau';
      }
      ghi(ma, trich, `bieu:${m[1]}`, 'bieu', k || 'tonTai');
    } else if (loai === 'px16') {
      const cand = `phan:XVI:cg:${m[1]}${m[2] ? ':' + m[2] : ''}`;
      const n = theoId.phan.get(cand);
      const k = kiemUngCuVien(trich, n);
      if (k) { ghi(ma, trich, cand, 'phan', k); continue; }
      let r = timTrong(kho, 'phan', trich, 'phan:XVI:', 5);
      if (!r[0]) r = timTrong(kho, 'chuong', trich, null, 20);
      if (r[0]) ghi(ma, trich, r[0], r[0].startsWith('phan:') ? 'phan' : 'chuong', r[1]);
      else ghi(ma, trich);
    }
  }
  return { banDo, luatCu, ngoai };
}

// ---------- CLI ----------
if (require.main === module && process.argv.includes('--xay-dung')) {
  const goc = path.join(__dirname, '..', '..');
  const kho = napKho(goc);
  const thieu = CAC_KHO.filter((k) => !kho[k].length);
  if (thieu.length) {
    console.error(`THIẾU kho: ${thieu.join(', ')} — bảng sẽ KHÔNG đầy đủ. Tiếp tục chỉ khi chắc chắn.`);
    if (!process.argv.includes('--chap-nhan-thieu')) process.exit(1);
  }
  const cu = JSON.parse(fs.readFileSync(DUONG_BANG, 'utf8'));
  const moi = xayDungDoiMa(goc);
  cu.banDo = moi.banDo;
  cu.luatCu = moi.luatCu;
  cu.xayDung.ngay = new Date().toISOString().slice(0, 10);
  for (const [k, n] of Object.entries(moi.ngoai)) {
    if (cu.ngoaiPhamVi[k]) cu.ngoaiPhamVi[k].soLuot = n;
  }
  const dem = new Map();
  for (const r of moi.banDo) dem.set(r.cu, (dem.get(r.cu) || 0) + 1);
  for (const e of moi.luatCu) dem.set(e.cu, (dem.get(e.cu) || 0) + 1);
  const kieu = (ma) => {
    if (ma.startsWith('ct.')) return 'ct.NNNN.M';
    if (ma.startsWith('tax.')) return 'tax.NNNNNNNN';
    if (ma.startsWith('tieuDe.')) return 'tieuDe.NNNNNN';
    if (ma.startsWith('sen.')) return 'sen.NNNNNNNN';
    if (/^ch\d+\.chuong$/.test(ma)) return 'chNN.chuong';
    if (/^nhom\d+\.nhom$/.test(ma)) return 'nhomNNNN.nhom';
    if (ma.startsWith('phan:')) return 'phan:NN:vung:K[:d]';
    if (ma.startsWith('chuong:')) return 'chuong:NN:vung:K[:d]';
    if (/\.phan$/.test(ma)) return 'phanNN.phan';
    if (ma.startsWith('px16.')) return 'px16.cgK[.d]';
    return 'tuongUng.NNNNNNNN';
  };
  const theoKieu = {};
  for (const r of moi.banDo) { const k = kieu(r.cu); (theoKieu[k] ||= { banDo: 0, luatCu: 0 }).banDo += 1; }
  for (const e of moi.luatCu) { const k = kieu(e.cu); (theoKieu[k] ||= { banDo: 0, luatCu: 0 }).luatCu += 1; }
  const kiem = {};
  for (const r of moi.banDo) kiem[r.kiem] = (kiem[r.kiem] || 0) + 1;
  cu.thongKe = {
    tong: {
      trichRieng: moi.banDo.length + moi.luatCu.length,
      banDo: moi.banDo.length,
      luatCu: moi.luatCu.length,
      dongSangKq: moi.banDo.filter((r) => r.moi.includes(':kq:')).length,
    },
    theoKieu,
    kiem,
  };
  fs.writeFileSync(DUONG_BANG, JSON.stringify(cu, null, 0));
  console.log(`Đã ghi ${DUONG_BANG}: ${moi.banDo.length} dòng đổi, ${moi.luatCu.length} dòng luật cũ.`);
}

module.exports = {
  chuanVanBan, chuanSo, coTrong, cuChuaNut, ganNhau,
  napBang, datLai, doiMaNguon,
  xayDungDoiMa,
};
