/**
 * Tín hiệu HS 10 số do người bán Made-in-China tự khai (bước 12 — thẻ C-2, PR #299).
 *
 * LUẬT SẮT (docs/backlog/12-tien-le-quoc-te-dinh-danh-hang-mic.md, nguyên tắc 2 — CEO chốt 14/10):
 * hint là TÍN HIỆU XẾP HẠNG ứng viên, KHÔNG BAO GIỜ là bằng chứng chốt mã. Module này cố tình
 * chỉ xuất phép ÁNH XẠ + ghi chú — không có hàm nào trả "mã nên chốt", không đường nào từ hint
 * tới finalHs/override; mọi thay đổi mã phải qua GIR + chú giải + biểu thuế của động cơ.
 *
 * Ánh xạ: 8 số đầu mã TQ trùng HS quốc tế → PN6; dòng VN ứng viên = các dòng lá cùng PN6 trong tax.json.
 */
const { taxData } = require('./data');

const nz = (s) => String(s || '').replace(/\D/g, '');

/** HS 10 số (hoặc 8/6) người bán khai → { hint, hs6, hs4, dong8UngVien[], loai:'SIGNAL' }; không hợp lệ → null. */
function micSignal(hs10, { maxDong = 12 } = {}) {
  const h = nz(hs10);
  if (h.length < 6 || /^0{6}/.test(h)) return null;
  const hs6 = h.slice(0, 6);
  const dong8 = Object.keys(taxData).filter((k) => k.startsWith(hs6)).slice(0, maxDong);
  return { hint: h, hs6, hs4: h.slice(0, 4), dong8UngVien: dong8, loai: 'SIGNAL' };
}

/** Ghi chú đi kèm mọi nơi tín hiệu được hiển thị — khách và chuyên viên đều phải thấy ranh giới này. */
const GHI_CHU = 'HS do người bán Made-in-China tự khai — TÍN HIỆU xếp hạng ứng viên, không phải bằng chứng chốt mã.';

module.exports = { micSignal, GHI_CHU };
