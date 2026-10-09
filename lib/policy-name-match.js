// lib/policy-name-match.js — cờ chính sách THEO TÊN GỌI (mức "NV kiểm", không chặn cứng, luôn kèm căn cứ).
//
// VÌ SAO (CEO 08/10/2026): 9004.90.10 "Kính thuốc" là thiết bị y tế theo 05/2022/TT-BYT Điều 6 mục 43,
// nhưng văn bản không có bảng mã HS nên hsListings (khớp theo mã) không bao giờ bật. "Hàng có chính sách,
// dò theo tên gọi và chức năng chính mà không được gắn cờ để nhân viên kiểm tra lại?" → lớp này.
//
// Hai nguồn cụm từ:
//   1. data/policy-name-rules.json — mô tả hàng trích từ văn bản không có bảng mã, soạn tay, có `chapters`.
//   2. Dòng `hs: null` trong plhq-hs-index (plhq-registry.nameListings) — mô tả không mã, KHÔNG lọc chương.
// Khớp theo CẢ CỤM âm tiết đã chuẩn hoá (vi-tokens.normalizeVi) — "kính mắt" phải xuất hiện liền nhau;
// không khớp từng từ rời (tránh "kính" bắt "kính xây dựng"). Không gọi LLM; có cache chuẩn hoá.
const fs = require('fs');
const { dataReadPath } = require('./data-paths');
const { normalizeVi, meaningful } = require('./vi-tokens');
const { nameListings } = require('./plhq-registry');

let _rules = null;
function loadRules() {
  if (_rules) return _rules;
  try {
    const raw = JSON.parse(fs.readFileSync(dataReadPath('policy-name-rules.json'), 'utf8'));
    _rules = (raw.rules || []).map((r) => ({
      ...r,
      chapters: new Set((r.chapters || []).map(String)),
      // Cụm đã chuẩn hoá, bọc khoảng trắng để khớp đúng biên âm tiết.
      phrases: (r.cumTu || []).map((c) => ({ raw: c, norm: ` ${normalizeVi(c)} ` })).filter((p) => p.norm.trim()),
    }));
  } catch {
    _rules = [];
  }
  return _rules;
}

// Dòng không mã của sổ cộng đồng → cụm từ: tách mô tả theo dấu phẩy/chấm phẩy/ngoặc thành các vế,
// bỏ vế trơn ("Sản phẩm") và vế ĐƠN ÂM TIẾT ("Thuốc" bắt nhầm "Kính thuốc"). "Thuốc độc, nguyên liệu
// độc làm thuốc, …" → 3 vế, khớp vế nào cũng được.
let _indexPhrases = null;
function loadIndexPhrases() {
  if (_indexPhrases) return _indexPhrases;
  _indexPhrases = [];
  for (const e of nameListings().entries || []) {
    if (e.active === false) continue; // văn bản hết hiệu lực / chưa xác minh → không bật cờ
    // Chỉ lấy phần ĐẦU (các danh từ mặt hàng) — cắt trước phần bổ nghĩa ("… có chứa chất thuộc Danh mục …
    // trong một số ngành, lĩnh vực." sinh vế rác "lĩnh vực" bắt nhầm 8522.90.30 "… lĩnh vực điện ảnh").
    const head = String(e.moTa).split(/\b(?:có chứa|thuộc|dùng|sử dụng|trong|theo|không bao gồm|cho|với|được)\b/u)[0];
    const clauses = head.split(/[,;()\/]|\bvà\b/u).map((c) => c.trim())
      .filter((c) => c && meaningful(c) && normalizeVi(c).split(' ').length >= 2);
    const phrases = clauses.map((c) => ({ raw: c, norm: ` ${normalizeVi(c)} ` }));
    if (phrases.length) _indexPhrases.push({ entry: e, phrases });
  }
  return _indexPhrases;
}

// Cache chuẩn hoá văn bản đầu vào — tên dòng biểu thuế lặp lại nhiều lần trong một phiên.
const _normCache = new Map();
function norm(s) {
  const key = String(s || '');
  if (!key) return '';
  let v = _normCache.get(key);
  if (v === undefined) {
    v = ` ${normalizeVi(key)} `;
    if (_normCache.size > 5000) _normCache.clear();
    _normCache.set(key, v);
  }
  return v;
}

const FIELD_VI = { tariffNameVi: 'tên dòng biểu thuế', productNameVi: 'tên hàng', purposeVi: 'công dụng' };

/**
 * matchPolicyByName({ hs, tariffNameVi, productNameVi, purposeVi }) →
 *   [{ level:'REVIEW', source:'name', soHieu, ten, canCu, cumTu, matchedIn, loaiTacDong, coQuan, ghiChu, nguon, ruleId }]
 * Mỗi văn bản chỉ trả MỘT dòng (cụm đầu tiên khớp, ưu tiên tên hàng > công dụng > tên dòng biểu thuế).
 * level 'REVIEW' là mức của lớp này; policy-levels.js ánh xạ sang thang NOTICE + reviewByName.
 */
function matchPolicyByName({ hs, tariffNameVi, productNameVi, purposeVi } = {}) {
  const chapter = String(hs || '').replace(/\D/g, '').slice(0, 2);
  const fields = [['productNameVi', productNameVi], ['purposeVi', purposeVi], ['tariffNameVi', tariffNameVi]]
    .map(([k, v]) => [k, norm(v)])
    .filter(([, v]) => v.trim());
  if (!fields.length) return [];
  const out = [];
  const seen = new Set();
  const tryPhrases = (phrases) => {
    for (const [field, text] of fields) {
      for (const p of phrases) if (text.includes(p.norm)) return { field, p };
    }
    return null;
  };
  // 1. Luật soạn tay — lọc chương trước (chapters rỗng = mọi chương).
  for (const r of loadRules()) {
    if (r.chapters.size && chapter && !r.chapters.has(chapter)) continue;
    if (r.chapters.size && !chapter) continue; // không biết chương → không dám khớp luật có giới hạn chương
    const hit = tryPhrases(r.phrases);
    if (!hit || seen.has(r.soHieu)) continue;
    seen.add(r.soHieu);
    out.push({
      level: 'REVIEW', source: 'name', ruleId: r.id, soHieu: r.soHieu, ten: r.trichDan || null, nguon: r.nguon,
      cumTu: hit.p.raw, matchedIn: hit.field,
      canCu: `"${hit.p.raw}" khớp ${FIELD_VI[hit.field]}`,
      coQuan: r.coQuan || null, loaiTacDong: r.loaiTacDong || 'KHAC', ghiChu: r.ghiChu || null,
    });
  }
  // 2. Dòng không mã của sổ cộng đồng (không lọc chương — không có mã để lọc).
  for (const { entry, phrases } of loadIndexPhrases()) {
    const hit = tryPhrases(phrases);
    if (!hit || seen.has(entry.soHieu)) continue;
    seen.add(entry.soHieu);
    out.push({
      level: 'REVIEW', source: 'name', ruleId: null, soHieu: entry.soHieu, ten: entry.ten, nguon: `${entry.soHieu}${entry.phuLuc ? ` ${entry.phuLuc}` : ''}${entry.nhanh ? ` mục ${entry.nhanh}` : ''}`,
      cumTu: hit.p.raw, matchedIn: hit.field,
      canCu: `"${hit.p.raw}" khớp ${FIELD_VI[hit.field]}`,
      coQuan: (entry.soHieu.match(/-([A-ZĐ]+)$/) || [])[1] || null,
      loaiTacDong: entry.loaiTacDong || 'KHAC',
      ghiChu: [entry.dieuKien, entry.danChieu ? `Dẫn chiếu ${entry.danChieu}.` : null].filter(Boolean).join(' ') || null,
    });
  }
  return out;
}

/** Cho test/khảo sát: nạp lại dữ liệu. */
function resetCache() {
  _rules = null;
  _indexPhrases = null;
  _normCache.clear();
}

module.exports = { matchPolicyByName, loadRules, resetCache };
