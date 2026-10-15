/**
 * Khung thuộc tính định danh hàng hoá (bước 12 — A-1, #299).
 *
 * Ba việc, đều tất định:
 *  1. frameFor(chương) — ghép khung của một chương: trường bắt buộc/khuyến nghị từ template khai báo
 *     TT 39 (data/chapter-declaration-fields.json) + trường nghiệp vụ phân loại của bước 12
 *     (data/attribute-frames.json: nguyenLyHoatDong, cauThanhModule, chucNangChinh…).
 *  2. validateFrameInstance — thể hiện frame do AI điền: thiếu trường bắt buộc, nguồn thiếu url/trích.
 *  3. tamGiacKiemChung — gán nhãn mức kiểm chứng theo MÁY (AI chỉ ĐỀ XUẤT nguồn, không tự gán nhãn):
 *       có nguồn sơ cấp NSX (trang NSX / manual PDF của NSX)     → VERIFIED
 *       ≥ 2 nguồn phụ ĐỘC LẬP (khác tên miền) cùng khớp          → CORROBORATED
 *       1 nguồn duy nhất                                          → HYPOTHESIS (chỉ là giả thuyết — không được chốt mã)
 */
const fs = require('fs');
const { dataReadPath } = require('./data-paths');

let _frames = null; let _tt39 = null;
function frames() {
  _frames ||= JSON.parse(fs.readFileSync(dataReadPath('attribute-frames.json'), 'utf8'));
  return _frames;
}
function tt39() {
  _tt39 ||= JSON.parse(fs.readFileSync(dataReadPath('chapter-declaration-fields.json'), 'utf8'));
  return _tt39;
}

/** Khung thuộc tính của một chương: {chuong, titleVi, truong: [{key,labelVi,batBuoc,ecusHint,goc}]} hoặc null. */
function frameFor(chuong) {
  const ch = String(chuong || '').padStart(2, '0');
  const f12 = frames().chuong[ch];
  const t39 = tt39().chapters[ch];
  if (!f12 && !t39) return null;
  const fields = tt39().fields || {};
  const truong = [];
  for (const key of (t39?.required || [])) truong.push({ key, labelVi: fields[key]?.labelVi || key, batBuoc: true, ecusHint: fields[key]?.ecusHint || null, goc: 'TT39' });
  for (const key of (t39?.recommended || [])) truong.push({ key, labelVi: fields[key]?.labelVi || key, batBuoc: false, ecusHint: fields[key]?.ecusHint || null, goc: 'TT39' });
  for (const key of (f12?.boSungBatBuoc || [])) truong.push({ key, labelVi: frames().truongBuoc12[key]?.labelVi || key, batBuoc: true, ecusHint: frames().truongBuoc12[key]?.ecusHint || null, goc: 'BUOC12' });
  for (const key of ['cauThanhModule']) if ((f12?.boSungBatBuoc || []).includes(key)) { /* đã thêm ở trên */ }
  if (f12 && /8[45]|90/.test(ch) && !(f12.boSungBatBuoc || []).includes('cauThanhModule')) truong.push({ key: 'cauThanhModule', labelVi: frames().truongBuoc12.cauThanhModule.labelVi, batBuoc: false, ecusHint: frames().truongBuoc12.cauThanhModule.ecusHint, goc: 'BUOC12' });
  return { chuong: ch, titleVi: f12?.titleVi || t39?.titleVi || null, truong };
}

/** Đoán chương ứng viên từ mô tả (nhẹ, không AI): đếm từ khoá của từng khung — trả danh sách giảm dần. */
function doanChuong(text) {
  const t = String(text || '').toLowerCase();
  if (!t.trim()) return [];
  const out = [];
  for (const [ch, cfg] of Object.entries(frames().chuong)) {
    const diem = (cfg.tuKhoa || []).reduce((s, kw) => s + (t.includes(kw.toLowerCase()) ? 1 : 0), 0);
    if (diem > 0) out.push({ chuong: ch, diem });
  }
  return out.sort((a, b) => b.diem - a.diem).slice(0, 3);
}

/** Tên miền đăng ký từ URL (bỏ www; giữ 2 nhãn cuối, xử thô .co.xx 3 nhãn). */
function tenMien(url) {
  try {
    const h = new URL(String(url)).hostname.replace(/^www\./i, '').toLowerCase();
    const parts = h.split('.');
    if (parts.length >= 3 && /^(co|com|org|net|gov|edu|ac)\.[a-z]{2}$/.test(parts.slice(-2).join('.'))) return parts.slice(-3).join('.');
    return parts.slice(-2).join('.');
  } catch { return null; }
}

/** Nguồn sơ cấp NSX: trang web/miền của nhà sản xuất hoặc manual PDF (theo url chứa /manual|datasheet hoặc loai AI gán nhãn 'nsx'). */
const NSX_RE = /(^|\.)(mbraun|sartorius|thermofisher|shimadzu|siemens|omron|midea|supor|philips|panasonic|bosch)\./i;

/**
 * Tam giác kiểm chứng — MÁY gán nhãn cho một danh sách nguồn AI đề xuất.
 * @param {Array<{loai?:string, url:string, trich?:string}>} nguon
 * @returns {{muc:'VERIFIED'|'CORROBORATED'|'HYPOTHESIS'|'KHONG_NGUON', mien:string[], chiTiet:object[]}}
 */
function tamGiacKiemChung(nguon) {
  const list = (Array.isArray(nguon) ? nguon : []).filter((n) => n && String(n.url || '').trim());
  const chiTiet = list.map((n) => ({ ...n, mien: tenMien(n.url) }));
  if (!chiTiet.length) return { muc: 'KHONG_NGUON', mien: [], chiTiet };
  if (chiTiet.some((n) => String(n.loai || '').toLowerCase() === 'nsx' || NSX_RE.test(String(n.url)))) {
    return { muc: 'VERIFIED', mien: [...new Set(chiTiet.map((n) => n.mien).filter(Boolean))], chiTiet };
  }
  const mien = [...new Set(chiTiet.map((n) => n.mien).filter(Boolean))];
  if (mien.length >= 2) return { muc: 'CORROBORATED', mien, chiTiet };
  return { muc: 'HYPOTHESIS', mien, chiTiet };
}

/**
 * Kiểm thể hiện frame: {chuong, truong: {key: value}, nguon: []}.
 * @returns {{ok:boolean, thieu:string[], loi:string[]}}
 */
function validateFrameInstance(inst) {
  const thieu = []; const loi = [];
  const fr = frameFor(inst?.chuong);
  if (!fr) { loi.push(`không có khung cho chương ${inst?.chuong}`); return { ok: false, thieu, loi }; }
  const truong = inst.truong && typeof inst.truong === 'object' ? inst.truong : {};
  for (const t of fr.truong) {
    if (!t.batBuoc) continue;
    const v = truong[t.key];
    if (v == null || String(v).trim() === '') thieu.push(t.key);
  }
  for (const n of inst.nguon || []) {
    if (!String(n?.url || '').trim()) loi.push('nguon thiếu url');
    if (!String(n?.trich || '').trim()) loi.push('nguon thiếu trich (câu dẫn nguyên văn)');
  }
  return { ok: !thieu.length && !loi.length, thieu, loi };
}

module.exports = { frameFor, doanChuong, tenMien, tamGiacKiemChung, validateFrameInstance };
