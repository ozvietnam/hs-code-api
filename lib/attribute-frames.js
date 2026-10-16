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
 *
 * #308 (A-1) bổ sung:
 *  4. tenDongNghia {vi[],en[],zh[]} + tuVungChucNang {en[],zh[]} — trường KHUYẾN NGHỊ của khung (boSungKhuyenNghi).
 *  5. kiemTrichDanEn — MÁY KIỂM TRÍCH DẪN: mọi cụm EN phải xuất hiện trong câu trich của nguon[] đã khai
 *     (canCu NGUON_KHAI) hoặc trong tầng pháp lý EN (canCu TANG_PHAP_LY: data/wco-hs-international.csv mô tả EN
 *     chính tắc, data/wco-op/opinions.json trường text = nguyenVanEn). Không qua kiểm = LOẠI (locTuVungEn),
 *     KHÔNG tự chế từ. sen-2022.json + explanatory-notes.json là bản TIẾNG VIỆT → không cấp cụm EN.
 *  6. validateFrameInstance — nguon[] bắt buộc url + trich + retrievedAt (YYYY-MM-DD); tenDongNghia/tuVungChucNang
 *     sai shape → lỗi; enLoai[] báo cáo cụm EN bị máy kiểm loại (thông tin, không tính vào ok).
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
  for (const key of (f12?.boSungKhuyenNghi || [])) truong.push({ key, labelVi: frames().truongBuoc12[key]?.labelVi || key, batBuoc: false, ecusHint: frames().truongBuoc12[key]?.ecusHint || null, goc: 'BUOC12' }); // #308: tenDongNghia, tuVungChucNang
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

// ── #308: tầng pháp lý EN (nguồn từ vựng tiếng Anh chính tắc, nối A-4) ──
// data/wco-hs-international.csv: danh pháp HS quốc tế, cột description là mô tả EN (section,hscode,description,parent,level).
// data/wco-op/opinions.json: Tuyển tập ý kiến phân loại WCO, trường `text` là nguyên văn EN (lib/wco-op.js gọi nguyenVanEn).
// Nạp lười + cache; thiếu file → bỏ qua tầng đó, không crash (máy kiểm vẫn chạy theo trich của nguon[] đã khai).
let _enPhapLy = null;
function enPhapLy() {
  if (_enPhapLy) return _enPhapLy;
  const csv = []; const opinions = [];
  try {
    const raw = fs.readFileSync(dataReadPath('wco-hs-international.csv'), 'utf8');
    for (const line of raw.split('\n').slice(1)) {
      const m = line.match(/^([^,]*),([^,]*),(?:"((?:[^"]|"")*)"|([^,]*)),/); // description có thể bọc nháy, "" = nháy thoát
      if (!m) continue;
      const desc = (m[3] !== undefined ? m[3].replace(/""/g, '"') : (m[4] || '')).trim();
      if (desc) csv.push({ ma: m[2], desc, lower: desc.toLowerCase() });
    }
  } catch { /* không có csv → tầng pháp lý chỉ còn opinions */ }
  try {
    const j = JSON.parse(fs.readFileSync(dataReadPath('wco-op/opinions.json'), 'utf8'));
    const arr = Array.isArray(j) ? j : (j?.opinions || []);
    for (const o of arr) if (o && typeof o.text === 'string' && o.text.trim()) opinions.push({ hs: o.hs, id: o.id, lower: o.text.toLowerCase() });
  } catch { /* như trên */ }
  _enPhapLy = { csv, opinions };
  return _enPhapLy;
}

const chuanHoaCum = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * MÁY KIỂM TRÍCH DẪN NGUỒN (#308): mọi cụm EN phải xuất hiện trong NGUỒN ĐÃ KHAI
 * (câu trich nguyên văn của nguon[]) hoặc trong tầng pháp lý EN. Không qua kiểm = LOẠI (xem locTuVungEn).
 * @param {string[]} cum danh sách cụm EN
 * @param {Array<{url?:string, trich?:string}>} nguon nguồn đã khai của thể hiện frame
 * @returns {Array<{cum:string, qua:boolean, canCu?:'NGUON_KHAI'|'TANG_PHAP_LY', url?:string, nguon?:object, viDo?:string}>}
 *          mảng kết quả 1-1 theo thứ tự đầu vào (cum đã chuẩn hoá: lower, gộp khoảng trắng).
 */
function kiemTrichDanEn(cum, nguon) {
  const trich = (Array.isArray(nguon) ? nguon : [])
    .filter((n) => n && String(n.trich || '').trim())
    .map((n) => ({ url: String(n.url || ''), lower: String(n.trich).toLowerCase() }));
  const { csv, opinions } = enPhapLy();
  return (Array.isArray(cum) ? cum : []).map((c0) => {
    const c = chuanHoaCum(c0);
    if (!c) return { cum: c, qua: false, viDo: 'cụm rỗng' };
    const hitTrich = trich.find((t) => t.lower.includes(c));
    if (hitTrich) return { cum: c, qua: true, canCu: 'NGUON_KHAI', url: hitTrich.url };
    const hitCsv = csv.find((r) => r.lower.includes(c));
    if (hitCsv) return { cum: c, qua: true, canCu: 'TANG_PHAP_LY', nguon: { tep: 'data/wco-hs-international.csv', ma: hitCsv.ma, moTa: hitCsv.desc } };
    const hitOp = opinions.find((o) => o.lower.includes(c));
    if (hitOp) return { cum: c, qua: true, canCu: 'TANG_PHAP_LY', nguon: { tep: 'data/wco-op/opinions.json', hs: hitOp.hs, id: hitOp.id } };
    return { cum: c, qua: false, viDo: 'không xuất hiện trong câu trich của nguon[] đã khai, cũng không có trong tầng pháp lý EN (wco-hs-international.csv, wco-op/opinions.json) — KHÔNG tự chế từ' };
  });
}

/**
 * Lọc từ vựng EN của thể hiện frame qua máy kiểm trích dẫn: cụm không qua kiểm bị LOẠI,
 * vi/zh giữ nguyên (máy kiểm chỉ bắt cụm EN theo yêu cầu #308). Trả bản LỌC + báo cáo.
 * @param {{tenDongNghia?:{vi?:string[],en?:string[],zh?:string[]}, tuVungChucNang?:{en?:string[],zh?:string[]}, nguon?:object[]}} inst
 * @returns {{tenDongNghia?:object, tuVungChucNang?:object, baoCao:{giu:object[], loai:object[]}}}
 */
function locTuVungEn(inst) {
  const nguon = inst?.nguon || [];
  const baoCao = { giu: [], loai: [] };
  const loc = (obj) => {
    const out = { ...obj };
    if (Array.isArray(out.en)) {
      const kd = kiemTrichDanEn(out.en, nguon); // 1-1 theo thứ tự
      out.en = out.en.filter((_, i) => kd[i]?.qua);
      for (const k of kd) (k.qua ? baoCao.giu : baoCao.loai).push(k);
    }
    return out;
  };
  const out = {};
  if (inst?.tenDongNghia && typeof inst.tenDongNghia === 'object') out.tenDongNghia = loc(inst.tenDongNghia);
  if (inst?.tuVungChucNang && typeof inst.tuVungChucNang === 'object') out.tuVungChucNang = loc(inst.tuVungChucNang);
  return { ...out, baoCao };
}

/**
 * Kiểm thể hiện frame: {chuong, truong: {key: value}, tenDongNghia?, tuVungChucNang?, nguon: []}.
 * @returns {{ok:boolean, thieu:string[], loi:string[], enLoai:object[]}} enLoai = cụm EN bị máy kiểm
 *          trích dẫn loại (THÔNG TIN — việc loại nằm ở locTuVungEn, không tính vào ok).
 */
function validateFrameInstance(inst) {
  const thieu = []; const loi = [];
  const fr = frameFor(inst?.chuong);
  if (!fr) { loi.push(`không có khung cho chương ${inst?.chuong}`); return { ok: false, thieu, loi, enLoai: [] }; }
  const truong = inst.truong && typeof inst.truong === 'object' ? inst.truong : {};
  for (const t of fr.truong) {
    if (!t.batBuoc) continue;
    const v = truong[t.key];
    if (v == null || String(v).trim() === '') thieu.push(t.key);
  }
  for (const n of inst.nguon || []) {
    if (!String(n?.url || '').trim()) loi.push('nguon thiếu url');
    if (!String(n?.trich || '').trim()) loi.push('nguon thiếu trich (câu dẫn nguyên văn)');
    const ra = String(n?.retrievedAt || '').trim();
    if (!ra) loi.push('nguon thiếu retrievedAt (ngày truy cập YYYY-MM-DD)');
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(ra.slice(0, 10))) loi.push('nguon retrievedAt sai dạng (cần YYYY-MM-DD)');
  }
  // #308: shape tenDongNghia {vi[],en[],zh[]} / tuVungChucNang {en[],zh[]} — mảng chuỗi không rỗng.
  const kieuMang = (val, ten, cacKey) => {
    if (val == null) return;
    if (typeof val !== 'object' || Array.isArray(val)) { loi.push(`${ten} phải là object {${cacKey.join('[], ')}[]} — mảng chuỗi`); return; }
    for (const k of cacKey) {
      if (val[k] == null) continue;
      if (!Array.isArray(val[k]) || val[k].some((x) => typeof x !== 'string' || !x.trim())) loi.push(`${ten}.${k} phải là mảng chuỗi không rỗng`);
    }
  };
  kieuMang(inst?.tenDongNghia, 'tenDongNghia', ['vi', 'en', 'zh']);
  kieuMang(inst?.tuVungChucNang, 'tuVungChucNang', ['en', 'zh']);
  const enLoai = locTuVungEn(inst).baoCao.loai;
  return { ok: !thieu.length && !loi.length, thieu, loi, enLoai };
}

module.exports = { frameFor, doanChuong, tenMien, tamGiacKiemChung, validateFrameInstance, kiemTrichDanEn, locTuVungEn, enPhapLy };
