/**
 * lib/ho-so/tang-khong-ma.js — "tầng không mã" của một phân nhóm 6 số (#577, gia cố cho thợ rẻ).
 *
 * Biểu thuế Tổng cục có những dòng TIÊU ĐỀ KHÔNG MÃ ("- - - Loại khác:", "- - - Cách điện bằng cao su hoặc plastic:") gom
 * một số dòng 8 số thành một tầng. Cây theo chữ số (lib/hs-tree.js) chỉ giữ được tầng đó khi tập lá của tiêu đề khớp đúng
 * một nút theo chữ số (ten-nut.json, `doTinCay: KHOP_TAP`); còn lại tầng BIẾN MẤT: các dòng dưới nó bị treo lên làm anh em
 * của các dòng bên ngoài, luật đi không biết điều kiện của tầng ⇒ cổng 1/2 có thể XANH GIẢ (848310: trục cam xe máy
 * ≤ 2.000 cc thoả cả .24 lẫn .25).
 *
 * Hàm ở đây đọc thẳng biểu thuế đã trích (data/bieu-thue/<bản mới nhất>/bieu-chinh.jsonl.gz + tieu-de.jsonl.gz +
 * ten-nut.json), sheet chính (sheet có nhiều dòng 8 số nhất), và trả mọi dòng tiêu đề không mã nằm trong phạm vi phân nhóm
 * mà KHÔNG được nối khớp-tập vào một nút của cây, kèm các dòng 8 số nằm dưới nó (theo số gạch). Cổng 1 chặn mọi dòng dưới
 * tầng như vậy (`cong1-tang-khong-ma`) — người soạn DỪNG, báo Claude; không có cách khai để vượt.
 *
 * Tất định, chỉ đọc. Thiếu tệp biểu thuế ⇒ trả [] (không chặn được — kiểm `coBieuThue()`).
 */
const fs = require('fs');
const zlib = require('zlib');
const { dataReadPath } = require('../data-paths');

let cache = null;
function docJsonl(p) {
  return zlib.gunzipSync(fs.readFileSync(p)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}
function nap() {
  if (cache) return cache;
  cache = { ver: null, sheet: null, dong: [], dungKhop: new Map() };
  try {
    const goc = dataReadPath('bieu-thue');
    const ver = fs.readdirSync(goc).filter((d) => /^\d{4}\.\d{2}\.\d{2}$/.test(d)
      && ['bieu-chinh.jsonl.gz', 'tieu-de.jsonl.gz', 'ten-nut.json'].every((f) => fs.existsSync(dataReadPath('bieu-thue', d, f)))).sort().pop();
    if (!ver) return cache;
    const bc = docJsonl(dataReadPath('bieu-thue', ver, 'bieu-chinh.jsonl.gz'));
    const dem = new Map();
    for (const x of bc) if (String(x.maChuan || '').length === 8) dem.set(x.sheet, (dem.get(x.sheet) || 0) + 1);
    const sheet = [...dem.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const td = docJsonl(dataReadPath('bieu-thue', ver, 'tieu-de.jsonl.gz'));
    const dong = [
      ...bc.filter((x) => x.sheet === sheet && x.maChuan).map((x) => ({ r: x.r, ma: String(x.maChuan), gach: Number(x.gach) || 0, chu: x.moTaVi || '' })),
      ...td.filter((x) => x.sheet === sheet).map((x) => ({ r: x.r, ma: null, gach: Number(x.gach) || 0, chu: x.chu || x.nguyenVan || '' })),
    ].sort((a, b) => a.r - b.r);
    const tn = JSON.parse(fs.readFileSync(dataReadPath('bieu-thue', ver, 'ten-nut.json'), 'utf8')).ten || {};
    const dungKhop = new Map();
    for (const [id, v] of Object.entries(tn)) if (v && v.sheet === sheet && v.doTinCay === 'KHOP_TAP') dungKhop.set(v.r, id);
    cache = { ver, sheet, dong, dungKhop };
  } catch { /* thiếu biểu thuế đã trích */ }
  return cache;
}
const coBieuThue = () => Boolean(nap().ver);

/**
 * Tầng không mã của phân nhóm `pn6`.
 * @returns {{r:number, gach:number, chu:string, dongDuoi:string[]}[]}
 */
function tangKhongMa(pn6) {
  const code = String(pn6 || '').replace(/\D/g, '');
  const { dong, dungKhop } = nap();
  if (code.length !== 6 || !dong.length) return [];
  const iLa = []; dong.forEach((x, i) => { if (x.ma && x.ma.length === 8 && x.ma.startsWith(code)) iLa.push(i); });
  if (!iLa.length) return [];
  const iDau = iLa[0]; const iCuoi = iLa[iLa.length - 1];
  // Dòng có mã gần nhất phía trước là tổ tiên của phân nhóm (chính phân nhóm, hoặc nhóm 4 số khi phân nhóm không có dòng riêng).
  let i0 = -1;
  for (let i = iDau - 1; i >= 0; i -= 1) { const x = dong[i]; if (x.ma && (x.ma === code || code.startsWith(x.ma))) { i0 = i; break; } if (x.ma && x.ma.length === 8) break; }
  const nutCuaPhanNhom = (id) => Boolean(id) && (code.startsWith(id) || (id.length === 7 && id.startsWith(code)));
  const out = [];
  for (let i = (i0 >= 0 ? i0 + 1 : iDau); i < iCuoi; i += 1) {
    const x = dong[i];
    if (x.ma) continue;
    if (nutCuaPhanNhom(dungKhop.get(x.r))) continue;
    const duoi = [];
    for (let j = i + 1; j <= iCuoi; j += 1) {
      const y = dong[j];
      if (y.gach <= x.gach) break;
      if (y.ma && y.ma.length === 8) duoi.push(y.ma);
    }
    if (duoi.length) out.push({ r: x.r, gach: x.gach, chu: String(x.chu).trim(), dongDuoi: duoi });
  }
  return out;
}

module.exports = { tangKhongMa, coBieuThue };
