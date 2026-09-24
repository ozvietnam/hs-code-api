/**
 * Tập giữ riêng (holdout) của data/oz-gold-final.jsonl — dùng chung cho alias,
 * benchmark và bộ tìm tiền lệ. Chia theo băm (mã + tên hàng): ổn định qua mọi
 * lần chạy, cùng seed thì cùng tập.
 *
 * VÌ SAO Ở lib/: bộ tìm tiền lệ (lib/oz-precedent-search.js) cần loại tập này
 * khi đang chấm điểm — nếu không, mẫu đem chấm tự tìm thấy đáp án của chính nó
 * trong kho tiền lệ ("học thuộc đề").
 */
const DEFAULT_HOLDOUT_RATIO = 0.15;
const DEFAULT_HOLDOUT_SEED = 42;

/** FNV-1a 32-bit — nhỏ, không phụ thuộc thư viện, đủ tản đều để chia tập. */
function hash32(str, seed) {
  let h = (2166136261 ^ seed) >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** Khoá ổn định của một bản ghi gold — không phụ thuộc thứ tự dòng trong file. */
function holdoutKey(record) {
  return `${String(record.hsCode).replace(/\D/g, '')}|${String(record.tenHang || '').toLowerCase().trim()}`;
}

/** Bản ghi này có thuộc tập giữ riêng không? */
function isHeldOut(record, ratio = DEFAULT_HOLDOUT_RATIO, seed = DEFAULT_HOLDOUT_SEED) {
  if (ratio <= 0) return false;
  return hash32(holdoutKey(record), seed) % 10000 < Math.round(ratio * 10000);
}

/** Đang chấm điểm → mọi kho dựng từ gold phải bỏ tập giữ riêng. */
function evalExcludesHoldout() {
  return process.env.HS_EVAL_EXCLUDE_HOLDOUT === '1';
}

module.exports = { DEFAULT_HOLDOUT_RATIO, DEFAULT_HOLDOUT_SEED, hash32, holdoutKey, isHeldOut, evalExcludesHoldout };
