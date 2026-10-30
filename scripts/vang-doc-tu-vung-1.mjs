/**
 * Bộ chữ + dấu vân tay ĐỌC của 53 khoá tu-vung@1 (tu-vung@2, #577 L1-3a).
 *
 * Mục đích: chứng minh việc chuyển hai luật bộ đọc (#667 CUM_DANH_TU_KHONG, #675 CAU_TRUC_CO.laBoPhan) từ mã vào dữ liệu
 * tu-vung@2 và việc nạp tu-vung@2 mặc định KHÔNG đổi cách đọc bất kỳ khoá tu-vung@1 nào. Vân tay được ghi một lần bằng mã
 * TRƯỚC khi đổi (scripts/fixtures/tu-vung/vang-doc-tu-vung-1.json); test-tu-vung-2 so lại trên mã sau khi đổi.
 *
 * Chữ: dòng biểu thuế (Vi + En, tax.json) của mọi nhóm 4 số có phân nhóm lát 1 + bộ đề CÔNG KHAI #543 + câu đối nghịch tự viết.
 * KHÔNG đọc bộ đề lát 1 khoá băm (data/bench/ho-so-lat-1*), không đọc data/oz-export.
 *
 *   node scripts/vang-doc-tu-vung-1.mjs --ghi   ghi lại vân tay (chỉ khi CỐ Ý đổi cách đọc khoá @1 — phải ghi lý do ở PR)
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

export const TEP_VANG = 'scripts/fixtures/tu-vung/vang-doc-tu-vung-1.json';

const DOI_NGHICH = [
  'Bình giữ nhiệt chân không hoàn chỉnh', 'Bơm chân không động cơ điện 220V', 'Máy nén không khí dùng điện', 'Máy sưởi không gian chạy điện',
  'Xe đẩy suất ăn hàng không bằng nhôm, có bánh xe', 'Phụ tùng hàng không, mới 100%', 'Chuông cửa không dây có màn hình',
  'Xe đẩy thép không gỉ có bánh xe', 'Máy bơm không dùng điện', 'Xe đẩy không có bánh xe', 'không phải bộ phận, là máy hoàn chỉnh',
  'Hàng không có bánh xe', 'Bình giữ nhiệt không hoàn chỉnh', 'Bình chân không chưa hoàn chỉnh',
  'Vỏ ngoài rời của bình giữ nhiệt chân không, thép không gỉ hai lớp, nắp nhựa, dung tích 500ml, mới 100%', 'Nắp rời của bình giữ nhiệt',
  'Máy xay sinh tố dạng tháo rời của hãng X', 'Bình giữ nhiệt có nắp rời', 'không phải vỏ ngoài rời của bình', 'chân không gập, hàng không phải bộ phận',
  'cáp đã gắn đầu nối Type-C', 'cáp không có đầu nối', '无接头 数据线', 'non-connectorized cable', 'cable without connector', 'dây chưa lắp đầu nối',
  'Thẻ nhớ SD 64GB loại chưa ghi', 'size 12.9 x 8.2 x 4.2 cm', 'KT: 129x82x42mm', 'dùng cho điện áp không quá 1.000 V', '额定电压：220V',
  'Động cơ điện xoay chiều 2,2 kW', 'van bi DN25 bằng đồng', 'cáp lõi mỗi sợi 0,3 mm', 'quạt 1/2 inch 50/60Hz', 'MDY-11-20W KB-2200W M8x20mm',
  'Bản mạch điều khiển có vi điều khiển, chưa ghi phần mềm điều khiển', 'Quạt chỉ sử dụng hoặc chủ yếu sử dụng để làm mát bộ vi xử lý',
  'Cáp dữ liệu dẹt có hai sợi hoặc hơn, cách điện bằng plastic', 'Đồng xèng, hình tròn, kích thước chiều dày trên 1/10 đường kính',
  'Sản phẩm dạng lưới được tạo hình bằng phương pháp đột dập và kéo giãn thành lưới', 'trục được rèn, thép cán nóng, gang đúc',
  'Thiết bị giáo dục điện tử tương tác cầm tay được thiết kế chủ yếu cho trẻ em', 'Đồ chơi không dành cho trẻ em dưới 3 tuổi',
];

/** Chữ đầu vào cố định (thứ tự tất định). */
export function boChu() {
  const lat1 = JSON.parse(fs.readFileSync('data/ho-so/lat-1.json', 'utf8'));
  const nhom = new Set((lat1.phanNhom || []).map((p) => String(p.pn6).slice(0, 4)));
  const tax = JSON.parse(fs.readFileSync('data/tax.json', 'utf8'));
  const out = [];
  for (const hs of Object.keys(tax).sort()) {
    if (!nhom.has(hs.slice(0, 4))) continue;
    if (tax[hs].vn) out.push(String(tax[hs].vn));
    if (tax[hs].en) out.push(String(tax[hs].en));
  }
  const bd = JSON.parse(fs.readFileSync('data/bench/mo-ta-bo-de.json', 'utf8'));
  for (const c of bd.ca || []) {
    const t = c.thongTinHang || {};
    const ds = [t.tenHang, t.chatLieu, t.congDung, ...(t.thongSo || []), t.tinhTrang].filter(Boolean).map(String);
    out.push(...ds, ds.join(', '));
  }
  out.push(...DOI_NGHICH);
  return out;
}

/** Vân tay đọc theo khoá: sha256 của mọi kết quả khác CHUA_BIET trơn, theo thứ tự chữ. */
export function vanTay(T, khoa, chu) {
  const out = {};
  for (const k of khoa) {
    const h = crypto.createHash('sha256');
    let n = 0;
    chu.forEach((t, i) => {
      const r = T.docGiaTri(k, t);
      if (r.trangThai === 'CHUA_BIET' && Object.keys(r).length === 1) return;
      n += 1;
      h.update(`${i}\u0001${JSON.stringify(r)}\n`);
    });
    out[k] = { soKetQua: n, sha256: h.digest('hex') };
  }
  return out;
}

if (process.argv[1] && process.argv[1].endsWith('vang-doc-tu-vung-1.mjs') && process.argv.includes('--ghi')) {
  const T = require('../lib/tu-vung.js');
  const khoa = JSON.parse(fs.readFileSync('data/tu-vung/tu-vung@1.json', 'utf8')).khoa.map((k) => k.khoa);
  const chu = boChu();
  const t0 = Date.now();
  const vt = vanTay(T, khoa, chu);
  fs.writeFileSync(TEP_VANG, `${JSON.stringify({ ghiChu: 'Vân tay đọc 53 khoá tu-vung@1 — ghi bằng lib/tu-vung.js TRƯỚC khi lên tu-vung@2 (origin/main c312140). Không sửa tay.', soChu: chu.length, sha256Chu: crypto.createHash('sha256').update(chu.join('\n')).digest('hex'), vanTay: vt }, null, 2)}\n`);
  console.log(`ghi ${TEP_VANG}: ${chu.length} chữ × ${khoa.length} khoá (${Date.now() - t0} ms)`);
}
