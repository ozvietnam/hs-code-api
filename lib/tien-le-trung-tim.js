// Thuật toán tìm TB-TCHQ trùng mô tả hàng — tách riêng để test độc lập.
'use strict';

const { chuanMaSong, LY_DO_MA_DA_BIET_GOP } = require('./tien-le-thay-the');

/**
 * Chuẩn hoá chuỗi để so khớp: bỏ dấu câu, thường hoá, gọn khoảng trắng.
 */
function chuanHoa(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFC')
    .replace(/[.,;:!?()[\]{}"'…–—-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tách token + trích số kèm đơn vị.
 */
function tachToken(s) {
  const norm = chuanHoa(s);
  const tokens = new Set(norm.split(' ').filter(w => w.length > 1));
  // Số + đơn vị (kích thước, %, model)
  const numbers = [];
  const numRe = /(\d+(?:[.,]\d+)?)\s*(mm|cm|m|kg|g|l|ml|%|w|kw|v|a|ml\/h|m\/s|bar|mpa|°c|hp|psi|cfm|rpm|tấn|tan)?/gi;
  let m;
  while ((m = numRe.exec(norm))) {
    const val = parseFloat(m[1].replace(',', '.'));
    const unit = (m[2] || '').toLowerCase();
    if (!isNaN(val)) numbers.push({ val, unit });
  }
  return { tokens, numbers };
}

/**
 * Độ giống: Jaccard token (70%) + số kèm đơn vị khớp (30%).
 */
function doGiong(a, b) {
  const A = tachToken(a), B = tachToken(b);
  // Jaccard
  let inter = 0;
  for (const t of A.tokens) if (B.tokens.has(t)) inter++;
  const union = A.tokens.size + B.tokens.size - inter;
  const jac = union > 0 ? inter / union : 0;
  // Numbers
  let numMatch = 0;
  if (A.numbers.length > 0 && B.numbers.length > 0) {
    for (const na of A.numbers) {
      for (const nb of B.numbers) {
        if (na.val === nb.val && na.unit === nb.unit) { numMatch++; break; }
      }
    }
    numMatch = numMatch / Math.max(A.numbers.length, B.numbers.length);
  }
  return Math.round((jac * 0.7 + numMatch * 0.3) * 100) / 100;
}

/**
 * Tìm TB-TCHQ trùng với mô tả hàng.
 * @param {string} moTa — mô tả hàng từ khách
 * @param {object} opts — { top=3, precedentsData, bieuThueMaDung:Set, ngayCat:Date }
 * @returns {Array<{ma, soHieu, ngay, doGiong, trich, bieuCu}>}
 */
function timTrung(moTa, opts = {}) {
  const top = opts.top || 3;
  const data = opts.precedentsData || {};
  const bieuThue = opts.bieuThueMaDung || null;
  const ngayCat = opts.ngayCat || new Date('2022-12-30');

  const kq = [];
  for (const [ma, records] of Object.entries(data)) {
    // Chỉ mã còn trong biểu thuế
    if (bieuThue && !bieuThue.has(ma)) continue;
    const chuan = chuanMaSong(ma);
    const maOut = chuan.maDaBietGop ? (chuan.maSong || ma) : ma;
    for (const rec of records) {
      if (rec.sourceType !== 'TB-TCHQ') continue;
      // so trên TÊN riêng và bản ghép (tên + spec), lấy max — ghép một mình làm loãng khi spec dài (bench #1136)
      const ten = rec.productName || '';
      const day = `${ten} ${rec.technicalSpec || ''}`.trim();
      const diem = Math.max(doGiong(moTa, ten), doGiong(moTa, day));
      if (diem < 0.25) continue; // ngưỡng thấp — lọc thô
      const ngayBanHanh = rec.year ? new Date(String(rec.year), 0, 1) : null;
      const bieuCu = ngayBanHanh && ngayBanHanh < ngayCat;
      kq.push({
        ma: maOut,
        soHieu: rec.tbTchqNumber || '',
        ngay: rec.issuedDate || rec.year || '',
        doGiong: diem,
        trich: (rec.productName || '').slice(0, 200),
        bieuCu,
        ...((rec.maSong || chuan.maDaBietGop) ? {
          maDaBietGop: true,
          lyDoMaDaBietGop: rec.lyDoMaDaBietGop || chuan.lyDoMaDaBietGop || LY_DO_MA_DA_BIET_GOP,
        } : {}),
      });
    }
  }
  kq.sort((a, b) => b.doGiong - a.doGiong);
  return kq.slice(0, top);
}

module.exports = { timTrung, doGiong, chuanHoa, tachToken };
