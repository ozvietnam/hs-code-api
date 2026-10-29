// Vòng 2 (CEO 29/10): trường bắt buộc thiếu thì GHI RÕ ngay trong mô tả "(thiếu: X, Y)"
// — chuyên viên đọc phát biết ngay phải bổ sung gì, không cần mở JSON compliance.
// Fact tự tìm được (webFacts/attribute) thì chèn vào chapterSpecific trước; chỉ trường
// VẪN thiếu sau khi tự tìm mới mở ngoặc. KHÔNG đụng mặc định xuất xứ "Trung Quốc" và
// tình trạng "Mới 100%" (CEO chốt giữ — VN cấm nhập hàng cũ đã qua sử dụng).

const NHAN_THIEU = 'thiếu: ';
const GIOI_HAN_MAC_DINH = 200;

/**
 * Chèn nhãn "(thiếu: A, B)" TRƯỚC đuôi xuất xứ + tình trạng (giữ đuôi cuối cùng như
 * quy ước ECUS). Vượt giới hạn → nén nhãn (liệt kê ngắn, vẫn đủ tên trường).
 */
export function boTruongThieuVaoMoTa({ text, missingRequired, gioiHan = GIOI_HAN_MAC_DINH }) {
  const goc = String(text || '').trim();
  if (!missingRequired || !missingRequired.length) return { text: goc, daGhiThieu: false };
  const nhan = (missingRequired.map((m) => m.labelVi || m.key).filter(Boolean).join(', '));
  // Đuôi ECUS: "xuất xứ …; Tình trạng" — chèn trước đoạn xuất xứ nếu nhận ra được.
  const viXuatXu = goc.lastIndexOf('; xuất xứ ');
  const doanThieu = `(${NHAN_THIEU}${nhan})`;
  const ghep = (truoc, sau) => [truoc, doanThieu, sau].filter(Boolean).join(' ');
  let ra = viXuatXu > 0 ? ghep(goc.slice(0, viXuatXu), goc.slice(viXuatXu + 1).trim()) : ghep(goc, '');
  ra = ra.replace(/\s+/g, ' ').trim();
  if (ra.length <= gioiHan) return { text: ra, daGhiThieu: true };
  // Nén: bỏ dấu chấm câu phụ trong phần trước, rồi mới cắt neo nếu bất khả kháng.
  const nenTruoc = ra.replace(/; không gồm[^;)]*/gi, '').replace(/\s+/g, ' ').trim();
  if (nenTruoc.length <= gioiHan) return { text: nenTruoc, daGhiThieu: true };
  // Bất khả kháng: nén nhãn thiếu thành dạng ngắn nhất "thiếu: A,B" (bỏ khoảng trắng sau dấu phẩy)
  const nenNhan = `(${NHAN_THIEU}${missingRequired.map((m) => (m.labelVi || m.key).split(' ')[0]).join(',')})`;
  const thuLai = viXuatXu > 0
    ? `${goc.slice(0, viXuatXu)} ${nenNhan} ${goc.slice(viXuatXu + 1).trim()}`.replace(/\s+/g, ' ').trim()
    : `${goc} ${nenNhan}`.replace(/\s+/g, ' ').trim();
  if (thuLai.length <= gioiHan) return { text: thuLai, daGhiThieu: true };
  // Cụt: giữ đuôi, cắt phần trước.
  const duoi = goc.slice(viXuatXu + 1).trim();
  const khac = gioiHan - duoi.length - nenNhan.length - 2;
  return { text: `${goc.slice(0, Math.max(20, khac)).trim()} ${nenNhan} ${duoi}`.replace(/\s+/g, ' ').trim(), daGhiThieu: true };
}

/**
 * Đối chiếu fact tự tìm được (webFacts trả về text tự do) với các trường còn thiếu:
 * khớp theo từ khoá nhãn (CPU/RAM/điện áp…) đơn giản; fact nào khớp → coi như đã bổ sung.
 * KHÔNG bịa giá trị: chỉ nhận fact có nội dung ngắn gọn gắn được vào đúng một trường.
 */
export function gopVong2({ missingRequired, factTimDuoc }) {
  const daBoSung = [];
  const conThieu = [];
  for (const m of missingRequired || []) {
    const v = factTimDuoc && factTimDuoc[m.key];
    if (v && typeof v === 'string' && v.trim()) daBoSung.push(m.key);
    else conThieu.push(m);
  }
  return { daBoSung, conThieu };
}
