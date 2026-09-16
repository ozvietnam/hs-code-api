/**
 * Tra cụm từ thương mại → mã HS, dựa trên data/hs-aliases.json.
 *
 * Bảng alias bắc cầu giữa hai thứ tiếng: lời văn biểu thuế ("Loại khác") và cách
 * người khai gọi hàng ("kính mắt thời trang"). Tra theo từ khoá thuần trên
 * tax.json không bao giờ khớp được cặp đó.
 *
 * CHỐT CHẶN HÌNH THÁI — lý do tồn tại, đừng gỡ:
 * Kho Oz có "khuôn thép đúc plastic" → 84807990, tức KHUÔN (thành phẩm). Người
 * dùng hỏi "tấm thép làm khuôn nhựa" lại đang nói về THÉP TẤM (nguyên liệu,
 * chương 72). Cụm từ trùng nhau nhưng hàng khác hẳn. Gợi ý 8480 cho câu sau là
 * sai — và sai một cách tự tin, tệ hơn là không gợi ý gì. Nên khi câu hỏi mang
 * từ chỉ dạng nguyên liệu mà alias lại trỏ về chương thành phẩm, ta CHẶN gợi ý
 * và trả về cảnh báo để người tra tự quyết.
 */
const aliasData = require('../data/hs-aliases.json');

function removeDiacritics(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function norm(s) {
  return removeDiacritics(String(s || '').toLowerCase())
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const RAW_FORM_TOKENS = aliasData.meta?.rawFormTokens || [];
const MATERIAL_WORDS = aliasData.meta?.materialWords || [];

/** Hạ chữ thường nhưng GIỮ DẤU — dò dạng nguyên liệu phải phân biệt "thỏi" với "thời". */
function lowerKeepDiacritics(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Index phrase -> alias, dựng một lần khi nạp module. */
const byPhrase = new Map();
for (const a of aliasData.aliases) byPhrase.set(a.phrase, a);

/** Các cụm alias, sắp giảm dần theo số từ: cụm dài khớp trước vì cụ thể hơn. */
const phrasesByLength = aliasData.aliases
  .map((a) => a.phrase)
  .sort((x, y) => y.split(' ').length - x.split(' ').length || y.length - x.length);

/**
 * Câu hỏi có đang nói về hàng ở dạng nguyên liệu không?
 *
 * Cần CẢ HAI: một từ chỉ dạng ("tấm") và một từ chỉ vật liệu ("thép"). Chỉ có
 * "tấm" thôi thì "tấm lót sàn" — một thành phẩm — cũng bị chặn oan.
 */
function detectRawForm(query) {
  const padded = ` ${lowerKeepDiacritics(query)} `;
  const formToken = RAW_FORM_TOKENS.find((t) => padded.includes(` ${t} `));
  if (!formToken) return null;
  const materialWord = MATERIAL_WORDS.find((w) => padded.includes(` ${w} `) || padded.includes(`${w} `));
  if (!materialWord) return null;
  return { formToken, materialWord };
}

/**
 * Độ tin cậy của một alias:
 *   high   — tên đầy đủ của mặt hàng, mã tập trung (≥70% tờ khai cùng mã)
 *   medium — hoặc là cụm con, hoặc mã phân tán
 *   low    — vừa là cụm con vừa phân tán
 */
function confidenceOf(a) {
  const concentrated = a.share >= 0.7;
  if (a.exact && concentrated) return 'high';
  if (a.exact || concentrated) return 'medium';
  return 'low';
}

/**
 * Công tắc tắt lớp alias. Hai chỗ dùng:
 *   - benchmark: đo đúng phần alias đóng góp bằng cách chạy hai lượt có/không.
 *   - vận hành: nếu alias gây gợi ý xấu thì tắt ngay bằng biến môi trường,
 *     không phải chờ deploy lại.
 */
function aliasesEnabled() {
  return String(process.env.HS_ALIAS_SEARCH ?? 'on').toLowerCase() !== 'off';
}

/**
 * Tìm alias khớp trong câu hỏi.
 *
 * @param {string} query câu người dùng gõ
 * @param {{limit?: number}} [options]
 * @returns {{matches: Array, suppressed: Array, formWarning: object|null}}
 */
function lookupAliases(query, options = {}) {
  if (!aliasesEnabled()) return { matches: [], suppressed: [], formWarning: null };
  const limit = Math.max(1, Math.min(Number(options.limit) || 5, 20));
  const q = norm(query);
  const empty = { matches: [], suppressed: [], formWarning: null };
  if (q.length < 4) return empty;

  const rawForm = detectRawForm(query);
  const padded = ` ${q} `;
  const matches = [];
  const suppressed = [];
  const seenHs = new Set();

  for (const phrase of phrasesByLength) {
    if (matches.length >= limit) break;
    if (!padded.includes(` ${phrase} `) && q !== phrase) continue;
    const a = byPhrase.get(phrase);
    if (!a || seenHs.has(a.hsCode)) continue;
    seenHs.add(a.hsCode);

    const entry = {
      phrase: a.phrase,
      hsCode: a.hsCode,
      declarationCount: a.count,
      share: a.share,
      form: a.form,
      confidence: confidenceOf(a),
      alternatives: a.alternatives || undefined,
    };

    // Lệch hình thái: hỏi nguyên liệu nhưng alias là thành phẩm → không gợi ý.
    if (rawForm && a.form === 'article') {
      suppressed.push({ ...entry, reason: 'form_mismatch', rawFormToken: rawForm.formToken });
      continue;
    }
    matches.push(entry);
  }

  let formWarning = null;
  if (suppressed.length) {
    formWarning = {
      code: 'FORM_MISMATCH',
      rawFormToken: rawForm.formToken,
      materialWord: rawForm.materialWord,
      message:
        `Câu hỏi nhắc "${rawForm.formToken} ${rawForm.materialWord}" — hàng ở dạng nguyên liệu. Các tiền lệ khớp tên ` +
        `(${suppressed.map((s) => s.hsCode).join(', ')}) lại là sản phẩm hoàn chỉnh, không cùng ` +
        `hình thái nên đã bị loại. Nguyên liệu kim loại thường thuộc chương 72–81, nhựa nguyên ` +
        `sinh 3901–3914. Cần biết vật liệu, khổ và dạng gia công mới xác định được mã.`,
    };
  }

  return { matches, suppressed, formWarning };
}

function aliasStats() {
  return {
    ok: aliasData.aliases.length > 0,
    aliases: aliasData.aliases.length,
    sourceRecords: aliasData.meta?.sourceRecords ?? null,
    generatedAt: aliasData.meta?.generatedAt ?? null,
  };
}

module.exports = { lookupAliases, aliasStats, aliasesEnabled, RAW_FORM_TOKENS };
