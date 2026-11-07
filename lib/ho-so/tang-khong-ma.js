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
/**
 * Hiệu chỉnh SỐ GẠCH của dòng biểu thuế thụt sai (07/11/2026, #1109) — chỉ khi có bằng chứng cấu trúc, ghi rõ từng dòng.
 * Khoá `<sheet>:<r>` → gạch đúng. Dữ liệu trích (data/bieu-thue) giữ NGUYÊN VĂN biểu; hiệu chỉnh chỉ áp khi dựng tầng.
 */
const GACH_HIEU_CHINH = {
  // 984934: "- - - Loại khác:" (r19765) cùng hai dòng con 98493459/98493460 thụt thiếu một gạch — mã hàng tương ứng của biểu
  // (cột tương ứng) là 8708.50.96/8708.50.99, nằm dưới 870850 "Bộ phận" → tầng "Loại khác" (anh em của "Dùng cho xe thuộc nhóm
  // 87.03"); Chương 98 sao lại cấu trúc 870850 dưới tầng r19752 (thêm một gạch). Ở gạch 3, "Loại khác" thành anh em của "Chưa/Đã
  // lắp ráp hoàn chỉnh"/"Bộ phận" — không hàng nào tới được (cầu hoặc chưa lắp, hoặc đã lắp, hoặc là bộ phận).
  'BT2026:19765': 4, 'BT2026:19766': 5, 'BT2026:19767': 5,
};
/**
 * Dải dòng thụt thiếu cùng một số gạch: {sheet, tu, den, cong}.
 * 984935: tầng "Bộ phận khác và các phụ kiện:" (r19796, gạch 2) là tên của cả phân nhóm (mã tương ứng 8708.91–8708.99 đều dưới
 * "- Bộ phận và phụ kiện khác:" của 8708); con trực tiếp ghi gạch 3 ở "Két nước làm mát…" (r19797), "Ống xả…" (r19809) nhưng
 * gạch 2 ở "Bộ ly hợp…" (r19818), "Vô lăng…" (r19822), "Túi khí…" (r19828), "Loại khác" (r19831) — anh em với 870891/870892 là
 * 870893/870894/870895/870899 ⇒ cả dải r19818–r19848 thiếu một gạch.
 */
const GACH_DAI = [{ sheet: 'BT2026', tu: 19818, den: 19848, cong: 1 }];
const gachDung = (sheet, r, g) => {
  if (Object.prototype.hasOwnProperty.call(GACH_HIEU_CHINH, `${sheet}:${r}`)) return GACH_HIEU_CHINH[`${sheet}:${r}`];
  const d = GACH_DAI.find((x) => x.sheet === sheet && r >= x.tu && r <= x.den);
  return d ? g + d.cong : g;
};
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
      ...bc.filter((x) => x.sheet === sheet && x.maChuan).map((x) => ({ r: x.r, ma: String(x.maChuan), gach: gachDung(sheet, x.r, Number(x.gach) || 0), chu: x.moTaVi || '' })),
      ...td.filter((x) => x.sheet === sheet).map((x) => ({ r: x.r, ma: null, gach: gachDung(sheet, x.r, Number(x.gach) || 0), chu: x.chu || x.nguyenVan || '' })),
    ].sort((a, b) => a.r - b.r);
    const tn = JSON.parse(fs.readFileSync(dataReadPath('bieu-thue', ver, 'ten-nut.json'), 'utf8')).ten || {};
    const dungKhop = new Map();
    for (const [id, v] of Object.entries(tn)) if (v && v.sheet === sheet && v.doTinCay === 'KHOP_TAP') dungKhop.set(v.r, id);
    cache = { ver, sheet, dong, dungKhop };
  } catch { /* thiếu biểu thuế đã trích */ }
  return cache;
}
const coBieuThue = () => Boolean(nap().ver);
/** Phiên bản + sheet chính của biểu thuế đã nạp (cho `tenNguon` của nút tầng trong lib/hs-tree.js). */
const nguonBieuThue = () => { const c = nap(); return { ver: c.ver, sheet: c.sheet }; };

/**
 * Mọi dòng tiêu đề KHÔNG MÃ trong phạm vi phân nhóm `pn6` (sheet chính), kèm các dòng 8 số nằm dưới nó theo số gạch.
 * `khopTap`: id nút cây mà tiêu đề đã nối khớp-tập (ten-nut.json `KHOP_TAP`), hoặc null.
 * @returns {{r:number, gach:number, chu:string, dongDuoi:string[], khopTap:string|null}[]}
 */
function tieuDeTrongPhanNhom(pn6) {
  const code = String(pn6 || '').replace(/\D/g, '');
  const { dong, dungKhop } = nap();
  if (code.length !== 6 || !dong.length) return [];
  const iLa = []; dong.forEach((x, i) => { if (x.ma && x.ma.length === 8 && x.ma.startsWith(code)) iLa.push(i); });
  if (!iLa.length) return [];
  const iDau = iLa[0]; const iCuoi = iLa[iLa.length - 1];
  // Dòng có mã gần nhất phía trước là tổ tiên của phân nhóm (chính phân nhóm, hoặc nhóm 4 số khi phân nhóm không có dòng riêng).
  let i0 = -1;
  for (let i = iDau - 1; i >= 0; i -= 1) { const x = dong[i]; if (x.ma && (x.ma === code || code.startsWith(x.ma))) { i0 = i; break; } if (x.ma && x.ma.length === 8) break; }
  // 07/11/2026 (#1109, 984935): phân nhóm Chương 98 KHÔNG có dòng mã riêng — tiêu đề không mã đứng ngay trước dòng lá đầu
  // ("Két nước làm mát và bộ phận của chúng:", "Két nước làm mát:") thuộc phân nhóm khi mọi dòng dưới nó nằm trong phân nhóm.
  // Tiêu đề phủ ĐÚNG mọi lá của phân nhóm là tên phân nhóm (khopTap = pn6), không phải tầng.
  let iBatDau = i0 >= 0 ? i0 + 1 : iDau;
  if (i0 < 0 && code.startsWith('98')) while (iBatDau > 0 && !dong[iBatDau - 1].ma) iBatDau -= 1;
  const laCua = new Set(iLa.map((i) => dong[i].ma));
  const out = [];
  for (let i = iBatDau; i < iCuoi; i += 1) {
    const x = dong[i];
    // 07/11/2026 (#1109, Chương 98 — 984943 r19889 "- - Loại khác (trừ loại thuộc phân nhóm 8506.10, …):"): dòng LẶP LẠI đúng mã
    // phân nhóm, ở gạch trong dòng mã phân nhóm, là TIÊU ĐỀ (biểu Chương 98 ghi mã phân nhóm cạnh tiêu đề con) — không phải dòng mã.
    const lapMaPhanNhom = x.ma === code && i0 >= 0 && dong[i0].ma === code && x.gach > dong[i0].gach;
    if (x.ma && !lapMaPhanNhom) continue;
    const duoi = [];
    for (let j = i + 1; j <= iCuoi; j += 1) {
      const y = dong[j];
      if (y.gach <= x.gach) break;
      if (y.ma && y.ma.length === 8) duoi.push(y.ma);
    }
    if (!duoi.length) continue;
    if (i0 < 0 && i < iDau) {
      // tiêu đề đứng trước lá đầu: chỉ nhận khi mọi dòng dưới nó thuộc phân nhóm (không lấn sang phân nhóm trước)
      let lan = false;
      for (let j = i + 1; j < iDau; j += 1) if (dong[j].ma && dong[j].gach > x.gach) { lan = true; break; }
      if (lan || !duoi.every((m) => laCua.has(m))) continue;
      if (duoi.length === laCua.size) { out.push({ r: x.r, gach: x.gach, chu: String(x.chu).trim(), dongDuoi: duoi, khopTap: dungKhop.get(x.r) || code }); continue; }
    }
    out.push({ r: x.r, gach: x.gach, chu: String(x.chu).trim(), dongDuoi: duoi, khopTap: dungKhop.get(x.r) || null });
  }
  return out;
}

/**
 * Tầng không mã của phân nhóm `pn6`: tiêu đề không mã KHÔNG nối khớp-tập vào một nút của phân nhóm.
 * @returns {{r:number, gach:number, chu:string, dongDuoi:string[]}[]}
 */
function tangKhongMa(pn6) {
  const code = String(pn6 || '').replace(/\D/g, '');
  const nutCuaPhanNhom = (id) => Boolean(id) && (code.startsWith(id) || (id.length === 7 && id.startsWith(code)));
  return tieuDeTrongPhanNhom(code).filter((x) => !nutCuaPhanNhom(x.khopTap)).map(({ r, gach, chu, dongDuoi }) => ({ r, gach, chu, dongDuoi }));
}

/**
 * Mọi dòng CÓ MÃ của sheet chính bắt đầu bằng `pn6` (mã 8 số trong `la`; mọi mã — kể cả chính `pn6` — trong `ma`), theo thứ tự
 * biểu. Thiếu biểu thuế ⇒ null (không kết luận được gì — người gọi KHÔNG được suy "không có dòng").
 * @returns {{la: string[], ma: Set<string>}|null}
 */
function dongCoMa(pn6) {
  const code = String(pn6 || '').replace(/\D/g, '');
  const { dong } = nap();
  if (code.length !== 6 || !dong.length) return null;
  const la = []; const ma = new Set();
  for (const x of dong) if (x.ma && x.ma.startsWith(code)) { ma.add(x.ma); if (x.ma.length === 8) la.push(x.ma); }
  return { la, ma };
}

module.exports = { tangKhongMa, tieuDeTrongPhanNhom, dongCoMa, coBieuThue, nguonBieuThue };
