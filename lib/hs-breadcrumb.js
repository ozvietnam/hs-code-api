/**
 * Chuỗi phân cấp (breadcrumb) + ngữ cảnh tra cứu cho một dòng hàng 8 số.
 *
 * VÌ SAO CẦN:
 * 3.050 mã trong biểu thuế có tên đúng bằng ba chữ "Loại khác" (25,7% tổng số
 * mã; 3.383 mã = 28,5% có chứa cụm đó). Tra theo lời văn của chính dòng đó thì
 * không bao giờ chạm tới: chuỗi "Loại khác" không mang thông tin nào về hàng.
 *
 * MỘT CẠM BẪY ĐÃ THỬ VÀ LOẠI BỎ — đừng làm lại:
 * Thoạt nhìn có thể suy ra dòng cha bằng cách đếm gạch đầu dòng rồi lần ngược
 * lên dòng ít gạch hơn. SAI. data/tax.json chỉ chứa 11.871 khoá 8 số, toàn bộ là
 * dòng LÁ; mọi dòng tiêu đề nhóm đều đã bị lược bỏ. Lần ngược như vậy gán
 * "Chấn lưu dùng cho đèn phóng" (85041000) làm cha của 85044090 — hai mặt hàng
 * chẳng liên quan. Đã kiểm chứng và bỏ.
 * CÁCH ĐÚNG (11/10/2026, #236): lib/hs-tree.js — cha/anh em suy từ CHỮ SỐ của mã
 * (5–6 = phân nhóm WCO theo quy ước xxxx.x0 / xxxx.xy, 7–8 = hai cấp quốc gia),
 * gạch chỉ dùng cho tầng sâu hơn chữ số. 85044090 → cha 850440, đúng.
 *
 * NGUỒN THẬT, chỉ ghép văn bản có sẵn — không tự dịch, không tự đặt tên nhóm:
 *   - Cấp bậc, cha, anh em: lib/hs-tree.js (theo chữ số của mã; tiêu đề bị lược là nút ảo).
 *   - Tên chương / nhóm tiếng Việt: chú giải chương / chú giải nhóm (qua hs-tree); tên WCO tiếng Anh nguyên văn.
 *   - Phạm vi "dư" + mã anh em theo chữ AI (data/hs-context.json, rút từ loai-khac-index): chỉ tín hiệu tìm kiếm,
 *     AI_CHUA_KIEM — không phải cấu trúc.
 *   - Tên phần tiếng Việt: data/hs-sections.json — nguyên văn.
 */
const { taxData } = require('./data');
const { dataReadPath } = require('./data-paths');

/** #336 mục 3: chuỗi tiêu đề cha NGUYÊN VĂN (VI+EN) từ bieu-chinh 2026.04.05 —
 *  nạp 1 lần từ breadcrumb.json.gz (dựng bởi scripts/xay-breadcrumb-tieu-de.mjs).
 *  Khác trail ở trên (ghép từ chú giải): đây là nguyên văn dòng tiêu đề nhóm
 *  trong chính biểu thuế — "Chứa amiăng:" không nằm trong chú giải nào. */
let _nguyenVan = null;
function duongDanNguyenVan(hs) {
  if (_nguyenVan === null) {
    try {
      const { gunzipSync } = require('zlib');
      const { readFileSync } = require('fs');
      _nguyenVan = JSON.parse(gunzipSync(readFileSync(dataReadPath('bieu-thue', '2026.04.05', 'breadcrumb.json.gz'))).toString('utf8'));
    } catch { _nguyenVan = {}; }
  }
  return _nguyenVan[hs] || null;
}

const T = require('./hs-tree');
const contextData = require('../data/hs-context.json');

/** Bỏ gạch đầu dòng, giữ nguyên phần chữ. */
function stripDashes(vn) {
  return String(vn || '').replace(/^[-\s]+/, '').trim();
}

/**
 * Phạm vi + mã anh em bị loại trừ của một mã dư theo data/hs-context.json (rút từ loai-khac-index, chữ do AI viết —
 * AI_CHUA_KIEM). Chỉ là TÍN HIỆU TÌM KIẾM; cấu trúc cha/anh em thật lấy từ lib/hs-tree.js. `null` nếu không có.
 */
function contextOf(hsCode) {
  const hs = String(hsCode || '').replace(/\D/g, '');
  const c = contextData.context[hs];
  if (!c) return null;
  return { scopeVi: c.d || '', excludesVi: c.x || [] };
}

/**
 * Breadcrumb đầy đủ của một mã 8 số (TC-05) — cấp bậc theo chữ số của mã (lib/hs-tree.js), kể cả tiêu đề bị lược.
 * Giữ nguyên trường cũ; THÊM chapterVi, headingVi, path, parentId, parentSuyRa, siblingHsCodes, anhEmCoTen, truDayDu.
 * @returns {null|object}
 */
function breadcrumbOf(hsCode) {
  const hs = String(hsCode || '').replace(/\D/g, '');
  if (hs.length !== 8) return null;
  const n = T.nodeOf(hs);
  if (!n || n.cap !== 8 || !taxData[hs]) return null;

  const anc = T.ancestorsOf(hs);
  const sec = anc.find((a) => a.cap === 'PHAN') || null;
  const chapterNode = anc.find((a) => a.cap === 2) || null;
  const headingNode = anc.find((a) => a.cap === 4) || null;
  const subNode = anc.find((a) => a.cap === 6) || (n.laPhanNhom && n.laPhanNhom.length === 6 ? n : null);
  const ctx = contextOf(hs);
  const selfVi = stripDashes(taxData[hs].vn);
  const lk = n.loaiKhac ? T.loaiKhacOf(hs) : null;

  const levels = anc.map(T.labelOf);
  levels.push(`${hs}: ${selfVi}`);

  return {
    hsCode: hs,
    chapter: hs.slice(0, 2),
    heading: hs.slice(0, 4),
    subheading: hs.slice(0, 6),
    sectionCode: sec?.ma || null,
    sectionVi: sec?.tenVi || null,
    chapterEn: chapterNode?.tenEn || null,
    chapterVi: chapterNode?.tenVi || null,
    headingEn: headingNode?.tenEn || null,
    headingVi: headingNode?.tenVi || null,
    subheadingEn: subNode?.tenEn || null,
    selfVi,
    // Dòng dư: theo tên dòng ("Loại khác…") HOẶC có ngữ cảnh dư trong hs-context (tín hiệu cũ).
    isResidual: Boolean(n.loaiKhac || ctx),
    scopeVi: ctx?.scopeVi || null,
    excludesVi: ctx?.excludesVi || [],
    // Cấu trúc thật theo chữ số
    path: anc.map((a) => a.id),
    parentId: n.parent,
    parentSuyRa: Boolean(T.nodeOf(n.parent)?.suyRa),
    siblingHsCodes: T.siblingsOf(hs).filter((s) => s.cap === 8).map((s) => s.id),
    // anhEmCoTen = tầng gần nhất (giữ hợp đồng cũ); truDayDu = mọi nút bị trừ ở mọi tầng tới toTienCoTen (phạm vi đủ).
    ...(lk ? { anhEmCoTen: lk.anhEmCoTen, truDayDu: lk.truDayDu, toTienCoTen: lk.toTienCoTen, dinhNghiaDuoc: lk.dinhNghiaDuoc } : {}),
    levels,
    trail: levels.join(' → '),
  };
}

/**
 * Văn bản phụ dùng để CHẤM ĐIỂM tìm kiếm.
 *
 * Chỉ trả về với mã dư: đây là thứ duy nhất kéo "Loại khác" ra khỏi vùng mù.
 * Mã có tên mô tả đầy đủ thì lời văn dòng đó đã đủ — thêm nữa chỉ gây nhiễu.
 * Trả rỗng cho mã thường là CỐ Ý.
 */
function contextSearchText(hsCode) {
  const ctx = contextOf(hsCode);
  if (!ctx) return '';
  return [ctx.scopeVi, ...ctx.excludesVi].filter(Boolean).join(' ');
}


/** Bỏ dấu + hạ chữ thường, dùng cho so khớp tìm kiếm. */
function plain(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

let plainCache = null;
let tokenIndex = null;

/**
 * Công tắc tắt lớp ngữ cảnh dòng dư. Cùng kiểu với HS_ALIAS_SEARCH và
 * HS_TRADE_SYNONYMS: gợi ý xấu thì tắt ngay bằng biến môi trường, không chờ
 * deploy lại — và đo được phần lớp này đóng góp bằng cách chạy hai lượt.
 */
function contextSearchEnabled() {
  return String(process.env.HS_CONTEXT_SEARCH ?? 'on').toLowerCase() !== 'off';
}

function buildPlainCache() {
  if (plainCache) return plainCache;
  plainCache = new Map();
  for (const [hs, c] of Object.entries(contextData.context)) {
    plainCache.set(hs, plain([c.d || '', ...(c.x || [])].join(' ')));
  }
  return plainCache;
}

/**
 * Bản không dấu của contextSearchText. Dùng cho khớp CỤM dài; khớp theo TỪ thì
 * đi qua contextHitCounts, đừng quét chuỗi này 12.000 lần mỗi truy vấn.
 */
function contextPlainOf(hsCode) {
  return buildPlainCache().get(String(hsCode || '').replace(/\D/g, '')) || '';
}

/**
 * Chỉ mục ngược: token → các mã dư có token đó trong câu mô tả phạm vi.
 *
 * VÌ SAO PHẢI ĐẢO CHIỀU: bản đầu quét thẳng chuỗi ngữ cảnh cho từng dòng trong
 * 12.000 dòng, nhân với số từ của câu hỏi. Mô tả tờ khai thật dài 20–40 từ, nên
 * benchmark 763 tờ khai chạy quá 5 phút CPU vẫn chưa xong — và đúng độ trễ đó
 * sẽ rơi vào mỗi lần gọi API. Đảo chiều thì chi phí chỉ còn tỉ lệ với SỐ TỪ của
 * câu hỏi, không phụ thuộc kích thước biểu thuế.
 */
function buildTokenIndex() {
  if (tokenIndex) return tokenIndex;
  tokenIndex = new Map();
  for (const [hs, text] of buildPlainCache()) {
    for (const tok of new Set(text.split(' '))) {
      if (tok.length < 3) continue;
      let set = tokenIndex.get(tok);
      if (!set) {
        set = new Set();
        tokenIndex.set(tok, set);
      }
      set.add(hs);
    }
  }
  return tokenIndex;
}

/**
 * Đếm số token của câu hỏi khớp ngữ cảnh, cho từng mã dư có khớp.
 * @param {string[]} tokens token tách từ câu hỏi (còn dấu cũng được)
 * @returns {Map<string, number>} mã → số token khớp. Mã không khớp thì vắng mặt.
 */
function contextHitCounts(tokens) {
  if (!contextSearchEnabled()) return new Map();
  const idx = buildTokenIndex();
  const counts = new Map();
  const seen = new Set();
  for (const raw of tokens) {
    const tok = plain(raw);
    if (tok.length < 3 || seen.has(tok)) continue;
    seen.add(tok);
    const hit = idx.get(tok);
    if (!hit) continue;
    for (const hs of hit) counts.set(hs, (counts.get(hs) || 0) + 1);
  }
  return counts;
}

module.exports = {
  duongDanNguyenVan,
  breadcrumbOf,
  contextOf,
  contextSearchText,
  contextPlainOf,
  contextHitCounts,
  contextSearchEnabled,
  stripDashes,
};
