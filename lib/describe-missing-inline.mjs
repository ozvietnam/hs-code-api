// Vòng 2 (CEO 29/10): trường bắt buộc thiếu thì GHI RÕ ngay trong mô tả "(thiếu: X, Y)"
// — chuyên viên đọc phát biết ngay phải bổ sung gì, không cần mở JSON compliance.
// Fact tự tìm được (webFacts/attribute) thì chèn vào chapterSpecific trước; chỉ trường
// VẪN thiếu sau khi tự tìm mới mở ngoặc. Tình trạng "Mới 100%" giữ mặc định (CEO chốt —
// VN cấm nhập hàng cũ đã qua sử dụng).
//
// Đợt 0B: nhãn bằng TIẾNG VIỆT ("CPU, RAM, bộ nhớ/ổ cứng" — lấy labelVi ở data/chapter-declaration-fields.json,
// không lộ khoá tiếng Anh cpuModel/ramCapacity); dấu ngăn là dấu phẩy, ghi chú đứng ngay trước tình trạng:
//   "Máy tính xách tay, model: E14 (thiếu: CPU, RAM), Mới 100%"
// Không còn đuôi "xuất xứ …" trong mô tả (ECUS có ô riêng).
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const NHAN_THIEU = 'thiếu: ';
const GIOI_HAN_MAC_DINH = 200;
const TINH_TRANG_RE = /,\s*(Mới 100%|Đã qua sử dụng|Tân trang|Mới đã mở hộp)\s*$/i;
// Trường có ô riêng trên tờ khai ECUS — không ghi "(thiếu: …)" vào chuỗi mô tả.
const O_RIENG = new Set(['xuatXu', 'donViTinh']);
const NHAN_CHUNG = { tenHang: 'tên hàng', tinhTrang: 'tình trạng', nhanHieu: 'hiệu', model: 'model', thongSoKyThuat: 'thông số kỹ thuật', thanhPhanCauTao: 'chất liệu' };

/** Nhãn tiếng Việt viết thường chữ đầu, giữ nguyên chữ viết tắt ("CPU", "RAM"). */
function thuong(s) {
  const t = String(s || '').trim();
  if (t.length > 1 && t[1] === t[1].toLowerCase() && t[0] !== t[0].toLowerCase()) return t[0].toLowerCase() + t.slice(1);
  return t;
}

/**
 * missingRequired của validator ("chapterSpecific.cpuModel", "tenHang"…) → [{ key, labelVi }] tiếng Việt.
 * Nhãn: data/chapter-declaration-fields.json (fields.<key>.labelVi) → registry data/attributes.json → nhãn chung.
 */
export function nhanTruongThieu(missingRequired) {
  const { fieldCatalog } = require('./compliance-data.js');
  let attributeFieldDef = null;
  try { ({ attributeFieldDef } = require('./attributes.js')); } catch { /* registry tuỳ chọn */ }
  const out = [];
  for (const raw of missingRequired || []) {
    const key = String(raw).split('.').pop();
    if (O_RIENG.has(key)) continue;
    let label = fieldCatalog?.fields?.[key]?.labelVi || NHAN_CHUNG[key] || null;
    if (!label && attributeFieldDef) {
      const def = attributeFieldDef(key);
      if (def?.labelVi && def.labelVi !== key) label = def.labelVi;
    }
    // Không có nhãn Việt nào → tách camelCase cho đọc được, không để nguyên khoá máy.
    if (!label) label = key.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
    if (!out.some((o) => o.key === key)) out.push({ key, labelVi: thuong(label) });
  }
  return out;
}

/** Đoạn ghi chú "(thiếu: A, B)". */
export function doanThieu(missingRequired, nen = false) {
  const nhan = (missingRequired || []).map((m) => m.labelVi || m.key).filter(Boolean);
  if (!nhan.length) return '';
  return `(${NHAN_THIEU}${nen ? nhan.map((n) => n.split(/[\s/]/)[0]).join(',') : nhan.join(', ')})`;
}

/**
 * Chèn "(thiếu: A, B)" ngay TRƯỚC cụm tình trạng cuối (", Mới 100%"); không nhận ra tình trạng thì gắn cuối.
 * Vượt giới hạn → nén nhãn, rồi bỏ cụm từ cuối phần trước (không bao giờ bỏ tên hàng — cụm đầu tiên).
 * Lưu ý: describe-core đã chừa chỗ cho ghi chú khi ghép (maxLength trừ độ dài ghi chú) nên nhánh cắt ở đây hiếm khi chạy.
 */
export function boTruongThieuVaoMoTa({ text, missingRequired, gioiHan = GIOI_HAN_MAC_DINH }) {
  const goc = String(text || '').replace(/\s+/g, ' ').trim();
  if (!missingRequired || !missingRequired.length) return { text: goc, daGhiThieu: false };
  const m = goc.match(TINH_TRANG_RE);
  const truoc = m ? goc.slice(0, m.index).trim() : goc;
  const duoi = m ? m[1] : '';
  const ghep = (t, note) => `${t} ${note}${duoi ? `, ${duoi}` : ''}`.replace(/\s+/g, ' ').trim();

  let note = doanThieu(missingRequired);
  let ra = ghep(truoc, note);
  if (ra.length <= gioiHan) return { text: ra, daGhiThieu: true };
  note = doanThieu(missingRequired, true);
  ra = ghep(truoc, note);
  if (ra.length <= gioiHan) return { text: ra, daGhiThieu: true };
  // Bỏ cụm từ cuối phần trước (giữ cụm đầu = tên hàng).
  const cum = truoc.split(/,\s+/);
  while (cum.length > 1 && ghep(cum.join(', '), note).length > gioiHan) cum.pop();
  ra = ghep(cum.join(', '), note);
  if (ra.length > gioiHan) {
    const khac = gioiHan - note.length - (duoi ? duoi.length + 2 : 0) - 1;
    ra = ghep(cum[0].slice(0, Math.max(20, khac)).trim(), note);
  }
  return { text: ra, daGhiThieu: true };
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
