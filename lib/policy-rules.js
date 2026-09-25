/**
 * Luật tất định sửa lỗi hệ thống của bản LLM bóc chính sách (tax-enriched.json).
 *
 * VÌ SAO: LLM đọc nguyên văn cột chính sách của biểu thuế rồi điền cờ. Có lỗi lặp
 * lại trên hàng nghìn dòng — sửa từng dòng bằng tay là vô ích, bóc lại bằng LLM thì
 * tái phát. Luật ở đây chạy SAU LLM (scripts/enrich-policies.mjs) và dùng để vá dữ
 * liệu cũ (scripts/fix-policy-rules.mjs), nên hai đường cho cùng một kết quả.
 *
 * Luật 1 — USED_GOODS_BAN_NOT_LICENSE (CEO xác nhận 2026-09-25):
 *   "Hàng tiêu dùng QSD cấp NK (08/2023/TT-BCT - PL1.I)" nghĩa là hàng ĐÃ QUA SỬ
 *   DỤNG thuộc danh mục CẤM nhập khẩu. Hàng mới không bị cấm và KHÔNG cần giấy phép
 *   nhập khẩu vì dòng này. LLM đã đọc thành "cần giấy phép NK" cho mọi hàng.
 *   → requiresLicense=false (trừ khi còn loại giấy phép thật như CITES),
 *     usedGoodsImportBan=true, tóm tắt viết lại từ nguyên văn.
 *
 * Luật 2 — QUARANTINE_FROM_TEXT: nguyên văn nói "kiểm dịch" mà cờ kiểm dịch = false.
 */

const RULE_DATE = '2026-09-25';

function fold(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
}

const USED_BAN_RE = /qsd ca[pm] nk/;
// Loại "giấy phép" LLM tự thêm vì hiểu sai dòng cấm hàng QSD / tạm ngừng TNTX —
// đều không phải giấy phép. CITES, XK... là thủ tục thật khác, giữ nguyên.
const NOT_A_LICENSE_RE = /^nk$|qsd|qua su dung|cam n|cam nhap|tam ngung/;

/** Viết lại tóm tắt: câu QSD thành câu cấm hàng đã qua sử dụng, các vế khác giữ nguyên văn. */
function usedBanSummary(rawText) {
  const parts = String(rawText || '').split(';').map((p) => p.trim()).filter(Boolean);
  return parts.map((p) => {
    if (!USED_BAN_RE.test(fold(p))) return p;
    const group = p.replace(/\s*QSD\s+c[aấ][pm]\s+NK.*/i, '').trim() || 'Hàng';
    const ref = (p.match(/\(([^)]*)\)/) || [])[1];
    return `${group} ĐÃ QUA SỬ DỤNG bị cấm nhập khẩu${ref ? ` (${ref})` : ''} — hàng mới không thuộc diện cấm, không cần giấy phép NK vì quy định này`;
  }).join('; ');
}

/**
 * @param {object} w warnings (đã chuẩn hoá)
 * @returns {{warnings: object, applied: string[]}} bản mới (không sửa w gốc)
 */
function applyPolicyRules(w) {
  if (!w || typeof w !== 'object') return { warnings: w, applied: [] };
  const t = fold(w.rawText);
  const out = { ...w };
  const applied = [];

  if (USED_BAN_RE.test(t) && !/giay phep/.test(t)) {
    const types = (w.licenseTypes || []).filter((x) => !NOT_A_LICENSE_RE.test(fold(x).trim()));
    const needFix = w.requiresLicense !== types.length > 0 || types.length !== (w.licenseTypes || []).length || !w.usedGoodsImportBan;
    if (needFix) {
      out.licenseTypes = types;
      out.requiresLicense = types.length > 0;
      out.usedGoodsImportBan = true;
      out.summary = usedBanSummary(w.rawText);
      applied.push('USED_GOODS_BAN_NOT_LICENSE');
    }
  }

  if (/kiem dich/.test(t) && w.requiresQuarantine === false) {
    out.requiresQuarantine = true;
    applied.push('QUARANTINE_FROM_TEXT');
  }

  if (applied.length) {
    const prev = Array.isArray(w.ruleFixes) ? w.ruleFixes : [];
    out.ruleFixes = [...new Set([...prev, ...applied.map((a) => `${a}@${RULE_DATE}`)])];
  }
  return { warnings: out, applied };
}

module.exports = { applyPolicyRules, usedBanSummary, RULE_DATE };
