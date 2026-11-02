// Vòng 1 (CEO 28/10): neo mô tả vào NGÔN NGỮ BIỂU THUẾ.
// Triết lý: người đọc sau này là chuyên gia/AI tinh sảo của Tổng cục Hải quan — mọi từ
// phải đúng danh từ của nhánh 2/4/6/8 đang đứng (không được bịa).
// L0c (#556): đã gỡ bộ sinh "không gồm..." — nguồn của nó là chữ AI chưa kiểm (hs-context, AI_CHUA_KIEM).
// gopMoTaPhapLy vẫn nhận `loaiTranh` để L1-5c đưa lại loại trừ ĐÃ KIỂM, viết thành sự thật về hàng.
//
// #725 lỗi 44 (02/11): /api/describe KHÔNG còn dùng anchorTenBieuThue/gopMoTaPhapLy để dựng customsDescription. Neo cũ THAY
// tên hàng bằng tên nhóm/dòng biểu thuế rồi cắt ở 120 ký tự → câu khai mở đầu "Thiết bị điện để đóng ngắt mạch … (ví dụ, cầu
// dao, rơ" (mất tên hàng thật, mảnh cụt, ngoặc hở), và với dòng "Loại khác" neo còn lấy scopeVi của data/hs-context.json
// (AI_CHUA_KIEM — luật 7b: không trích). Ý đồ hợp lệ của vòng 1 (câu khai mang đúng danh từ của biểu thuế) giữ ở
// tenBieuThueDeKem: chỉ tên NGUYÊN VĂN của cây HS, đặt SAU tên hàng, chỉ khi còn chỗ, chỉ ở ranh giới cụm an toàn.
// Hai hàm cũ giữ lại (đã có test riêng) cho bộ viết hồ sơ / công cụ khác nếu cần.

import { createRequire } from 'node:module';

const requireCjs = createRequire(import.meta.url);
const GIOI_HAN = 200;

/** Cắt ≤ n ký tự tại ranh giới từ (không để mảnh từ cụt "…van g", "…rơ l" — #725 lỗi 2). */
function catTu(s, n) {
  const t = String(s || '').trim();
  if (t.length <= n) return t;
  const dau = t.slice(0, n + 1);
  const tu = dau.lastIndexOf(' ');
  return (tu > n * 0.5 ? dau.slice(0, tu) : t.slice(0, n)).replace(/[;,:\s]+$/, '').trim();
}

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
  const selfVi = String(breadcrumb.selfVi || '').replace(/^[\s-]+|[\s-]+$/g, '').trim();
  const scopeVi = String(breadcrumb.scopeVi || '').replace(/^[\s-]+|[\s-]+$/g, '').trim();
  const khach = String(tenHangKhach || '').replace(/^[\s-]+|[\s-]+$/g, '').trim();
  const selfViSach = selfVi.replace(/^[\s-]+|[\s-]+$/g, '').trim();
  const laLoaiKhac = !selfViSach || chuanTiengViet(selfViSach).includes('loai khac');
  if (laLoaiKhac) {
    const headingViSach = String(breadcrumb.headingVi || '').trim();
    const scopeLaCau = /^Phân biệt|^phân biệt/i.test(scopeVi) || scopeVi.length > 100;
    if (scopeVi && !scopeLaCau) return catTu(scopeVi, 120);
    if (headingViSach) return catTu(headingViSach.replace(/\.+$/, ''), 120);
    if (scopeVi) return catTu(scopeVi, 120);
    // hết đường: dùng tên nhóm 4 số thay vì để "- - Loại khác"
    const headingVi = String(breadcrumb.headingVi || '').trim();
    return catTu(headingVi || khach, 120);
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
    const giuNeo = catTu(neo, Math.max(20, khac - ghim(conNhanDien).length - thongSoBatBuoc.join(SEP).length - 2 * SEP.length));
    text = ghim([giuNeo.trim(), ghim(conNhanDien), ...thongSoBatBuoc, duoiText]);
    dropped.push('neo');
  }
  return {
    text: text.replace(/\s+/g, ' ').trim(),
    length: text.replace(/\s+/g, ' ').trim().length,
    dropped,
  };
}

// ── Tên biểu thuế KÈM sau tên hàng (#725 lỗi 44) ─────────────────────────────────────────────────────────────────────────
// Chọn tên NGUYÊN VĂN gần nhất của cây HS (dòng 8 số → tiêu đề → phân nhóm 6 số → nhóm 4 số) mà nói được hàng là gì:
// - bỏ "Loại khác…", bỏ tên chỉ là ĐIỀU KIỆN ("Dòng điện dưới 16 A", "Từ bông", "Dùng cho nam giới…"), bỏ tên rỗng nghĩa
//   ("Thiết bị khác": < 2 từ có nghĩa);
// - bỏ phần "(ví dụ, …)" (ví dụ không giới hạn phạm vi); tên nhiều vế ";" bỏ hẳn (không biết hàng thuộc vế nào);
// - tên dạng LIỆT KÊ ("Bút lông vẽ, bút lông để viết và bút lông … dùng cho việc trang điểm") bỏ hẳn: cắt một mục liệt kê
//   là thu hẹp sai, kèm nguyên câu dễ đọc lệch nghĩa (#725 lỗi 17). Chỉ cắt được TRƯỚC vế hạn định (", có khối lượng…",
//   ", dùng cho…", ", trừ…") — bỏ vế hạn định chỉ làm câu rộng ra, vẫn đúng với hàng.
// Tên hàng đã mang ≥ 60% danh từ lõi của tên đó → không kèm (tránh nhân đôi).
const TU_DIEU_KIEN = /^(?:dùng|loại|có|của|bằng|từ|đã|chưa|không|với|trên|dưới|hoạt động|thuộc|mới|cũ|ở dạng|dạng|dòng điện|điện áp|công suất|trọng lượng|khối lượng|kích thước|chiều|độ|đường kính|hàm lượng|trị giá|chứa|gồm|kể cả|trừ)(?![\p{L}])/iu;
const TU_RONG_LOI = /^(ke|ca|cua|va|hoac|hay|bang|cho|dung|trong|loai|khac|cac|mot|so|khong|nho|de|la|co)$/;
const tuLoi = (s) => chuanTiengViet(s).split(/[^a-z0-9]+/).filter((t) => t.length > 2 && !TU_RONG_LOI.test(t));
function boNgoac(s) {
  let t = String(s || '');
  for (let i = 0; i < 5; i += 1) { const u = t.replace(/\s*\([^()]*\)/g, ''); if (u === t) break; t = u; }
  const mo = t.indexOf('(');
  if (mo !== -1) t = t.slice(0, mo);
  return t.replace(/\s+/g, ' ').replace(/\s+([,;.])/g, '$1').trim();
}
function sachTen(s) {
  return boNgoac(String(s || '').replace(/^\s*\d{2}\.\d{2}\.?\s*/, '').replace(/^[\s-]+/, ''))
    .replace(/[\s:.;,-]+$/, '').trim();
}
/** Các bản cắt an toàn của một tên biểu thuế (dài → ngắn), hoặc [] nếu tên không dùng được. */
export function banCatTenBieuThue(ten) {
  const t = sachTen(ten);
  if (!t || t.includes(';')) return [];
  if (/^loại khác/i.test(t) || TU_DIEU_KIEN.test(t)) return [];
  if (tuLoi(t).length < 2) return [];
  const vế = t.split(/,\s+/);
  // Vế thứ 2 trở đi phải là vế hạn định; gặp vế liệt kê / "hoặc" → cả tên là danh sách → bỏ.
  for (let i = 1; i < vế.length; i += 1) if (!TU_DIEU_KIEN.test(vế[i])) return [];
  const ban = [];
  for (let k = vế.length; k >= 1; k -= 1) ban.push(vế.slice(0, k).join(', '));
  return ban;
}
/**
 * Tên biểu thuế để KÈM sau tên hàng trong customsDescription (#725 lỗi 44). Trả { cacBan: [dài → ngắn], ma, cap } hoặc null.
 * Chỉ dùng tên nguyên văn của cây HS (lib/hs-tree.js, nhãn NGUYEN_VAN) — không dùng scopeVi/hs-context (AI_CHUA_KIEM).
 */
export function tenBieuThueDeKem({ hsCode, tenHang }) {
  const hs = String(hsCode || '').replace(/\D/g, '');
  if (hs.length !== 8) return null;
  let T;
  try { T = requireCjs('./hs-tree.js'); } catch { return null; }
  const la = T.nodeOf(hs);
  if (!la) return null;
  const tren = (T.ancestorsOf(hs) || []).filter((n) => n && n.cap !== 'PHAN' && n.cap !== 2).reverse();
  const loiTen = new Set(tuLoi(tenHang));
  for (const n of [la, ...tren]) {
    const cacBan = banCatTenBieuThue(n.tenVi);
    if (cacBan.length) {
      const loi = tuLoi(cacBan[cacBan.length - 1]);
      const daCo = loi.filter((w) => loiTen.has(w)).length;
      if (daCo / loi.length >= 0.6) return null; // tên hàng đã mang danh từ biểu thuế
      return { cacBan, ma: n.id, cap: n.cap };
    }
    if (n.cap === 4) break;
  }
  return null;
}
