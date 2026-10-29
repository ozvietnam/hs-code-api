// Vòng 1 (CEO 28/10): neo mô tả vào NGÔN NGỮ BIỂU THUẾ + mệnh đề loại trừ củng cố pháp lý.
// Triết lý: người đọc sau này là chuyên gia/AI tinh sảo của Tổng cục Hải quan — mọi từ
// phải đúng danh từ của nhánh 2/4/6/8 đang đứng; khi có mã cạnh tranh, khai rõ
// "không gồm..." để chốt phạm vi theo đúng tinh thần biểu thuế (không được bịa).

const GIOI_HAN = 200;

/** Chuẩn hoá tiếng Việt đơn giản để so khớp từ khoá (bỏ dấu, chữ thường). */
function chuanTiengViet(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Neo tên hàng theo biểu thuế:
 * - Dòng có tên thật (không phải "Loại khác") → dùng CHÍNH XÁC selfVi của dòng 8 số
 *   khi tên khách chưa mang danh từ đó (khách nói "laptop" → neo "Máy tính xách tay…").
 * - Tên khách đã chứa danh từ lõi của selfVi → giữ tên khách (tránh nhân đôi).
 * - Dòng "Loại khác" → thay bằng scopeVi (phạm vi thật) nếu có.
 */
export function anchorTenBieuThue({ tenHangKhach, breadcrumb }) {
  if (!breadcrumb) return String(tenHangKhach || '').trim();
  const selfVi = String(breadcrumb.selfVi || '').replace(/^-+|-+$/g, '').trim();
  const scopeVi = String(breadcrumb.scopeVi || '').replace(/^-+|-+$/g, '').trim();
  const khach = String(tenHangKhach || '').replace(/^-+|-+$/g, '').trim();
  const selfViSach = selfVi.replace(/^-+|-+$/g, '').trim();
  const laLoaiKhac = !selfViSach || chuanTiengViet(selfViSach).includes('loai khac');
  if (laLoaiKhac) {
    const headingViSach = String(breadcrumb.headingVi || '').trim();
    const scopeLaCau = /^Phân biệt|^phân biệt/i.test(scopeVi) || scopeVi.length > 100;
    if (scopeVi && !scopeLaCau) return scopeVi.slice(0, 120);
    if (headingViSach) return headingViSach.slice(0, 120);
    if (scopeVi) return scopeVi.slice(0, 120);
    // hết đường: dùng tên nhóm 4 số thay vì để "- - Loại khác"
    const headingVi = String(breadcrumb.headingVi || '').trim();
    return (headingVi || khach).slice(0, 120);
  }
  // Rút danh từ lõi (3+ chữ) đầu tiên của selfVi làm "xương" cần thấy trong tên khách.
  const tuKhoa = chuanTiengViet(selfViSach).split(/[;,]/)[0];
  const cacTu = tuKhoa.split(' ').filter((t) => t.length > 2 && !/^(ke|ca|cua|va|hoac|bang|cho|dung|trong|loai|khac|cac|mot|so|khong|nho)$/.test(t));
  const xuong = chuanTiengViet(khach);
  const duXuong = cacTu.filter((t) => !xuong.includes(t));
  // Khách đã dùng ≥ 60% danh từ lõi → coi như đúng tinh thần, giữ nguyên.
  if (!cacTu.length || duXuong.length / cacTu.length <= 0.4) return khach || selfViSach;
  return selfViSach;
}

/**
 * Sinh mệnh đề loại trừ từ excludesVi của breadcrumb (nguyên văn ngữ cảnh dư,
 * chỉ thêm tiền tố "không gồm"). KHÔNG bịa thêm nội dung không có trong dữ liệu.
 */
export function dungLoaiTranh({ excludesVi }) {
  return (excludesVi || [])
    .map((e) => String(e || '').replace(/^[-\s]+/, '').trim())
    .filter((e) => e && e.length <= 80 && !/^(Phân biệt|Phan biet)/i.test(e))
    .slice(0, 2)
    .map((e) => `không gồm ${e.charAt(0).toLowerCase()}${e.slice(1)}`.replace(/\.$/, ''));
}

/**
 * Ghép mô tả pháp lý ≤ 200 ký tự theo thứ tự bền vững:
 * neo (tên biểu thuế) → nhận diện (nhãn hiệu/model) → thông số BẮT BUỘC (chương máy:
 * công suất/điện áp) → loại trừ → đuôi (xuất xứ + tình trạng, không bao giờ cắt).
 * Vượt 200 → hy sinh theo thứ tự: loại trừ → nhận diện phụ (model trước nhãn hiệu).
 */
export function gopMoTaPhapLy({ neo, nhanDien = [], thongSoBatBuoc = [], loaiTranh = [], duoi = [] }) {
  const SEP = '; ';
  const ghim = (parts) => parts.filter(Boolean).join(SEP);
  const duoiText = duoi.filter(Boolean).join('; ');
  const dayDu = (mang, bo) => ghim([neo, ghim(mang.slice(0, mang.length - bo)), ...thongSoBatBuoc, ghim(loaiTranh), duoiText]);
  // Tính độ dài đầy đủ rồi quyết định bỏ bao nhiêu lớp.
  let bo = 0;
  let text = dayDu(nhanDien, bo);
  const daBoLoaiTranh = () => text.length > GIOI_HAN;
  if (daBoLoaiTranh()) {
    // Bước 1: bỏ loại trừ
    text = ghim([neo, ghim(nhanDien), ...thongSoBatBuoc, duoiText]);
  }
  const dropped = [];
  if (text.length <= GIOI_HAN && dayDu(nhanDien, 0).length > GIOI_HAN) dropped.push('loaiTranh');
  // Bước 2: nếu vẫn vượt → bỏ dần nhận diện từ cuối (model trước nhãn hiệu)
  let conNhanDien = [...nhanDien];
  while (text.length > GIOI_HAN && conNhanDien.length) {
    conNhanDien.pop();
    text = ghim([neo, ghim(conNhanDien), ...thongSoBatBuoc, ...(dropped.includes('loaiTranh') ? [] : loaiTranh), duoiText]);
    dropped.push('nhanDien');
  }
  // Bước 3: cắt ngắn neo (bất khả kháng) — giữ đuôi nguyên vẹn
  if (text.length > GIOI_HAN) {
    const khac = GIOI_HAN - duoiText.length - SEP.length;
    const giuNeo = String(neo).slice(0, Math.max(20, khac - ghim(conNhanDien).length - thongSoBatBuoc.join(SEP).length - 2 * SEP.length));
    text = ghim([giuNeo.trim(), ghim(conNhanDien), ...thongSoBatBuoc, duoiText]);
    dropped.push('neo');
  }
  return {
    text: text.replace(/\s+/g, ' ').trim(),
    length: text.replace(/\s+/g, ' ').trim().length,
    dropped,
  };
}
