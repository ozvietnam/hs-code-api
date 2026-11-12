#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * OZV-325 vòng hai (#1109) — chữ hàng của VẾ SỐ trong ca kiểm luật không được lẫn cú pháp regex.
 *
 * PR #1223 đã gỡ cú pháp regex khỏi phần lớn chữ hàng của bộ kiểm luật, nhưng GĐ hậu kiểm thấy còn
 * sót ở 15 khoá SỐ dùng lookaround / nhóm chọn: `boCuPhapRegex` gỡ ngoặc nên `(?!…)`, `(?<!…)`,
 * `(a|b)` trong `cachDoc.vi[0]` bóc ra chữ vẫn bẩn —
 *
 *     duongKinh             "đường kính(?!\s*(?:trong|lõi|cửa))" → "đường kính(?! trong|lõi|cửa)"
 *     kichThuocMatCatNgang  "(?<!đường\s+chéo…)mặt\s+cắt\s+ngang(?!\s+hình)"
 *                                                → "?<!đường chéo ngoài của mặt cắt ngang?! hình"
 *     doChopChay            "(?:độ|điểm|nhiệt\s+độ)\s+chớp\s+cháy" → "độ|điểm|nhiệt độ chớp cháy"
 *
 * Chữ hàng sai hình dạng ⇒ máy chấm luật trên chuỗi mà người khai không bao giờ viết: ca kiểm đó đo
 * bộ đọc, không đo luật. GĐ chỉ rõ CÁCH ĐÚNG ở PR #1223: cho những khoá đó đi khuôn `cachViet`
 * (`TV.vietCum`) như 396 khoá còn lại, ĐỪNG đắp thêm regex vào `boCuPhapRegex` — bóc lookaround
 * bằng cách gỡ ngoặc thì về nguyên tắc không bao giờ đủ.
 *
 * RÀO NGƯỢC là tiêu chí xong, không phải phần thêm (quy tắc 6b — đo hai chiều trên cùng bộ ca):
 *   - chiều bắt lỗi: 15 khoá kia ra chữ SẠCH;
 *   - chiều không bắt nhầm: mọi vế số thực trong `data/so-tay/` phải đọc lại ĐÚNG số vừa viết —
 *     số lượng đọc-lại-đúng KHÔNG được tụt so với cách cũ. `vietCum` viết ở đơn vị chuẩn nên phải
 *     `quyDoi` ("90 tấn" → "90000kg"); khuôn nào bộ đọc không đọc lại được (đơn vị nằm giữa câu,
 *     vd "hàm lượng amoniac {giaTri} tính theo thể tích") thì GIỮ cách cũ, không đổi bừa.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const TV = require('../lib/tu-vung.js');
const { loiVeSo, cumKhangDinh, cumPhuDinhNhom } = await import('./bo-kiem-luat.mjs');

let passed = 0; let failed = 0;
const check = (name, ok, extra) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok || extra === undefined ? '' : ` ${JSON.stringify(extra).slice(0, 400)}`}`);
  if (ok) passed += 1; else failed += 1;
};

/** Cú pháp regex lọt vào chữ hàng: ngoặc nhóm, gạch chọn, lượng từ, lookaround, lớp `\s`. */
const CU_PHAP = /[()|*+?\\]|\?[:!=]|\\s/;

// ── A. 15 khoá SỐ mà GĐ chỉ ra: chữ hàng phải SẠCH cú pháp ─────────────────────────────────────────
// Danh sách lấy từ chính phép đo của GĐ (14 khoá) + `motChieuTo` phát hiện thêm khi đo lại trên
// tu-vung@2 hiện hành; mỗi khoá kèm một giá trị + đơn vị như điều kiện số thực của sổ tay dùng.
const CA_A = [
  ['duongKinh', 20, 'mm'],
  ['gioiHanChay', 355, 'psi'],
  ['tongDungTichTau', 26, 'GT'],
  ['khoiLuongToanBo', 5, 'tấn'],
  ['motChieuTo', 8, 'cm'],
  ['chieuKiaTo', 5, 'cm'],
  ['doTinhKhiet', 99.5, '%'],
  ['kichThuocMatCatNgang', 13, 'mm'],
  ['congSuatKhoiLuongGio', 3, 'tấn/giờ'],
  ['tocDoDiChuyen', 30, 'km/h'],
  ['apSuat', 12, 'kgf/cm2'],
  ['hamLuongPhotpho', 0.045, '%'],
  ['doChopChay', 23, 'oC'],
  ['hamLuongCauTuThom', 1, '%'],
  ['moDunDanHoi', 29000, 'psi'],
];
let sachA = 0;
for (const [fact, v, u] of CA_A) {
  const k = TV.layKhoa(fact);
  const duPhong = k?.cachDoc?.vi?.[0] || k?.nhanVi || fact;
  const chu = loiVeSo(fact, v, u, duPhong);
  const sach = !CU_PHAP.test(chu);
  if (sach) sachA += 1;
  check(`A "${fact}" → chữ hàng sạch cú pháp`, sach, { chu, duPhong });
}
check(`A tổng: cả ${CA_A.length} khoá sót cú pháp đều đã sạch`, sachA === CA_A.length, { sachA });

// ── B. Chiều ngược — chữ mới phải ĐỌC LẠI ĐÚNG con số (không chỉ "nhìn sạch") ──────────────────────
// Ca kiểm chỉ có nghĩa khi máy đọc tu-vung đọc lại ra đúng ngưỡng; sạch mà không đọc được thì vẫn vô dụng.
let docDung = 0;
for (const [fact, v, u] of CA_A) {
  const k = TV.layKhoa(fact);
  const chu = loiVeSo(fact, v, u, k?.cachDoc?.vi?.[0] || k?.nhanVi || fact);
  const chuan = TV.quyDoi(fact, v, u);
  const doc = TV.docGiaTri(fact, chu);
  const ok = doc?.trangThai === 'DA_CO' && typeof doc.giaTri === 'number' && chuan != null
    && Math.abs(doc.giaTri - chuan) < 1e-9;
  if (ok) docDung += 1;
  check(`B "${fact}" → máy đọc lại đúng ${chuan} ${k.donViChuan}`, ok, { chu, doc });
}
check(`B tổng: ${CA_A.length}/${CA_A.length} khoá đọc lại đúng số`, docDung === CA_A.length, { docDung });

// ── C. Đổi đơn vị: `vietCum` viết ở ĐƠN VỊ CHUẨN nên phải quyDoi trước ─────────────────────────────
// Thiếu quyDoi thì "khối lượng toàn bộ ≤ 5 tấn" ra "khối lượng toàn bộ 5kg" — sai 1000 lần, ca kiểm
// thành ca của hàng khác hẳn.
check('C1 "5 tấn" của khoiLuongToanBo (chuẩn kg) viết ra 5000kg, không phải 5kg',
  loiVeSo('khoiLuongToanBo', 5, 'tấn', TV.layKhoa('khoiLuongToanBo').cachDoc.vi[0]) === 'khối lượng toàn bộ 5000kg',
  loiVeSo('khoiLuongToanBo', 5, 'tấn', TV.layKhoa('khoiLuongToanBo').cachDoc.vi[0]));
check('C2 "8 cm" của motChieuTo (chuẩn mm) viết ra 80mm',
  loiVeSo('motChieuTo', 8, 'cm', TV.layKhoa('motChieuTo').cachDoc.vi[0]) === 'một chiều 80mm',
  loiVeSo('motChieuTo', 8, 'cm', TV.layKhoa('motChieuTo').cachDoc.vi[0]));

// ── D. Khuôn bộ đọc không đọc lại được thì GIỮ cách cũ, không đổi bừa ──────────────────────────────
// `hamLuongAmoniacTheTich` có cachViet đặt đơn vị giữa câu ("… {giaTri} tính theo thể tích"); bộ đọc
// trả CHUA_BIET ⇒ nếu nhận bừa lời mới thì ca kiểm 4001 mất chỗ đọc được. Phải lùi về chữ cũ (vẫn sạch
// vì khoá này không dùng lookaround).
{
  const fact = 'hamLuongAmoniacTheTich';
  const k = TV.layKhoa(fact);
  const chu = loiVeSo(fact, 0.5, '%', k?.cachDoc?.vi?.[0] || k?.nhanVi || fact);
  const doc = TV.docGiaTri(fact, chu);
  check('D1 khoá bộ đọc không đọc lại được khuôn cachViet → lùi về chữ cũ, vẫn đọc được',
    doc?.trangThai === 'DA_CO' && Math.abs(doc.giaTri - 0.5) < 1e-9, { chu, doc });
  check('D1b và chữ lùi về đó vẫn sạch cú pháp', !CU_PHAP.test(chu), chu);
}
{
  // Khoá lạ (không có trong từ vựng) → không được ném, lùi về nhãn tự dựng.
  const chu = loiVeSo('khoaKhongTonTaiTrongTuVung', 7, 'kg', 'khoá lạ');
  check('D2 khoá ngoài từ vựng → không ném, trả chữ dự phòng', chu === 'khoá lạ 7 kg', chu);
}
{
  // D3 — ca thật của 84603110: ngưỡng nguyên văn biểu "đường kính chuôi không quá 3,175 mm".
  // Chữ CŨ ghép bằng `${value}` ra "3.175" ⇒ bộ đọc đọc thành 3175mm (sai 1000 lần, ca kiểm thành ca
  // của hàng khác). Chữ MỚI đúng hình dạng nhưng bộ đọc trả CHUA_BIET (coi 3 chữ số sau dấu phẩy là
  // phân nhóm nghìn) — lỗi của bộ đọc lib/tu-vung.js, phải PR riêng. Cả hai không đọc lại đúng thì
  // phải chọn lời SẠCH, tuyệt đối không chọn lời đọc ra con số bịa.
  const fact = 'duongKinh';
  const k = TV.layKhoa(fact);
  const duPhong = k.cachDoc.vi[0];
  const chu = loiVeSo(fact, 3.175, 'mm', duPhong);
  const docCu = TV.docGiaTri(fact, 'đường kính(?! trong|lõi|cửa) 3.175 mm');
  check('D3a tái lập: chữ CŨ của ngưỡng 3,175mm bị bộ đọc đọc thành 3175 (sai 1000 lần)',
    docCu?.trangThai === 'DA_CO' && docCu.giaTri === 3175, docCu);
  check('D3b chữ MỚI không mang con số bịa đó và sạch cú pháp',
    chu === 'đường kính 3,175mm' && !CU_PHAP.test(chu), chu);
}

// ── E. Hai chiều trên TOÀN BỘ vế số thực của data/so-tay/ (quy tắc 6b) ────────────────────────────
// Dựng lại cách CŨ (ghép boCuPhapRegex + số + donVi) rồi so với cách MỚI trên CÙNG bộ vế:
//   - mới không được để sót cú pháp ở bất kỳ vế nào;
//   - số vế đọc-lại-đúng của mới KHÔNG được tụt so với cũ.
const boCuPhapRegex = (s) => String(s || '')
  .replace(/\(\?:/g, '(')
  .replace(/\(([^()|]*)\)\?/g, '')
  .replace(/\(([^()|]*)\)/g, '$1')
  .replace(/\(([^()]*)\)/g, '$1')
  .replace(/\\s[*+?]/g, ' ')
  .replace(/\\b|\\\./g, (m) => (m === '\\.' ? '.' : ''))
  .replace(/[*+?]$/g, '')
  .replace(/\s{2,}/g, ' ')
  .trim();
const OP_SO = ['<=', '<', '>=', '>'];
const veSo = [];
const quet = (o, tep) => {
  if (Array.isArray(o)) { o.forEach((x) => quet(x, tep)); return; }
  if (!o || typeof o !== 'object') return;
  if (OP_SO.includes(o.op) && o.fact) veSo.push({ ...o, tep });
  for (const v of Object.values(o)) quet(v, tep);
};
const dirSoTay = path.join(ROOT, 'data', 'so-tay');
for (const f of fs.readdirSync(dirSoTay)) {
  if (!f.endsWith('.json')) continue;
  try { quet(JSON.parse(fs.readFileSync(path.join(dirSoTay, f), 'utf8')), f); } catch { /* bỏ tệp hỏng */ }
}
let tong = 0; let cuBan = 0; let moiBan = 0; let cuDoc = 0; let moiDoc = 0;
const moiBanVd = [];
for (const c of veSo) {
  let k = null; try { k = TV.layKhoa(c.fact); } catch { /* khoá ngoài từ vựng */ }
  if (!k || k.kieu !== 'SO') continue;
  tong += 1;
  const duPhong = k?.cachDoc?.vi?.[0] || k?.nhanVi || String(c.fact).replace(/_/g, ' ');
  const chuCu = `${boCuPhapRegex(duPhong)} ${c.value} ${c.donVi || k.donViChuan || ''}`.trim();
  const chuMoi = loiVeSo(c.fact, c.value, c.donVi, duPhong);
  if (CU_PHAP.test(chuCu)) cuBan += 1;
  if (CU_PHAP.test(chuMoi)) { moiBan += 1; if (moiBanVd.length < 5) moiBanVd.push(chuMoi); }
  const chuan = TV.quyDoi(c.fact, c.value, c.donVi);
  const docLai = (chu) => {
    try {
      const d = TV.docGiaTri(c.fact, chu);
      return d?.trangThai === 'DA_CO' && typeof d.giaTri === 'number' && chuan != null
        && Math.abs(d.giaTri - chuan) < 1e-9;
    } catch { return false; }
  };
  if (docLai(chuCu)) cuDoc += 1;
  if (docLai(chuMoi)) moiDoc += 1;
}
console.log(`  [E] ${tong} vế số thực trong data/so-tay/ — cũ bẩn ${cuBan}, mới bẩn ${moiBan}; đọc lại đúng: cũ ${cuDoc}, mới ${moiDoc}`);
check('E1 bộ vế số thực không rỗng (nếu rỗng thì phép đo vô nghĩa)', tong > 500, tong);
check('E2 cách CŨ có sót cú pháp (tái lập đúng lỗi GĐ chỉ)', cuBan > 0, cuBan);
check('E3 cách MỚI không sót cú pháp ở vế nào', moiBan === 0, { moiBan, moiBanVd });
check('E4 số vế đọc-lại-đúng của MỚI không tụt so với CŨ', moiDoc >= cuDoc, { cuDoc, moiDoc });

// ── F. Hai nhánh gọi còn lại (cumKhangDinh / cumPhuDinhNhom) cũng phải sạch ───────────────────────
{
  const dk = { fact: 'duongKinh', op: '<=', value: 20, donVi: 'mm' };
  const a = cumKhangDinh(dk);
  const b = cumPhuDinhNhom([dk]);
  check('F1 cumKhangDinh vế số → sạch cú pháp', a && !CU_PHAP.test(a), a);
  check('F2 cumPhuDinhNhom vế số → sạch cú pháp', b && !CU_PHAP.test(b), b);
}

// ── G. ReDoS: chữ hàng dài 40.000 từ lặp phải xử lý dưới 2 giây (quy tắc 6b) ──────────────────────
{
  const t0 = Date.now();
  const dai = `${'đường kính '.repeat(40000)}20mm`;
  loiVeSo('duongKinh', 20, 'mm', dai);
  try { TV.docGiaTri('duongKinh', dai); } catch { /* chỉ đo thời gian */ }
  const ms = Date.now() - t0;
  check('G1 chuỗi ~40.000 từ lặp xử lý < 2 giây', ms < 2000, `${ms}ms`);
}

console.log(`\nlời vế số (OZV-325 vòng hai): ${passed} PASS, ${failed} FAIL`);
process.exit(failed ? 1 : 0);
