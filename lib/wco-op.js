/**
 * lib/wco-op.js — kho RIÊNG TƯ của Tuyển tập ý kiến phân loại WCO (#196, TT 85/2026 Điều 6.1 nguồn 2).
 *
 * Dữ liệu: data/wco-op/opinions.json (sinh bởi scripts/wco-op-parse.mjs từ PDF WCO bản tiếng Anh).
 * Có bản quyền WCO, Oz dùng bản mua lại → .gitignore chặn, CHỈ nằm trên server. Thiếu tệp thì mọi hàm
 * trả rỗng (repo công khai và CI chạy bình thường, không có nguồn này).
 *
 * Mã nguồn dùng trong sổ tay: `wco-op.<hs>.<thứ tự>` — vd wco-op.851762.4 (ý kiến 8517.62/4), wco-op.2106.1 khi
 * ý kiến ghi theo nhóm 4 số (21.06/1). Câu trích kiểm bằng quoteInOpinion (cùng cách chuẩn hoá với lib/so-tay.js).
 *
 * KHÔNG trả nguyên văn ra endpoint công khai. Chỉ máy kiểm (so-tay) và công cụ nội bộ dùng.
 */
const fs = require('fs');
const { dataReadPath } = require('./data-paths');

let cache = null;

const squash = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

function load() {
  if (cache) return cache;
  let list = [];
  try {
    // HS_WCO_OP_FILE: đường dẫn tệp thay thế (test không phụ thuộc kho thật trên máy chạy test)
    const j = JSON.parse(fs.readFileSync(process.env.HS_WCO_OP_FILE || dataReadPath('wco-op', 'opinions.json'), 'utf8'));
    list = Array.isArray(j) ? j : [];
  } catch { /* chưa có kho riêng */ }
  const byId = new Map();
  for (const o of list) byId.set(o.id, { ...o, _sq: squash(o.text) });
  cache = { list, byId };
  return cache;
}

function reset() { cache = null; }
const available = () => load().list.length > 0;
const get = (id) => load().byId.get(id) || null;

/** Các ý kiến thuộc một mã HS (4 hoặc 6 số). */
function byHs(hs) {
  const h = String(hs || '').replace(/\D/g, '');
  if (h.length !== 4 && h.length !== 6) return [];
  // Ý kiến có mã gán không đáng tin (headingSuspect: tiêu đề mã bị OCR làm rơi) KHÔNG được trả — gán sai mã tệ hơn không có.
  return load().list.filter((o) => !o.headingSuspect && o.hs.startsWith(h));
}

/** Kho còn ý kiến chưa gán đúng mã? Khi đó không được kết luận "mã này không có ý kiến". */
const incomplete = () => load().list.some((o) => o.headingSuspect);

/** Câu trích có nguyên văn trong ý kiến? Cho phép lược "…" giữa các đoạn; mỗi đoạn ≥ 6 ký tự phải có. */
function quoteInOpinion(id, trich) {
  const o = get(id);
  if (!o) return false;
  const frags = String(trich || '').split(/…|\.{3,}/).map(squash).filter((f) => f.length >= 6);
  return frags.length > 0 && frags.every((f) => o._sq.includes(f));
}

/** Mã nguồn hợp lệ dạng `wco-op.<4|6 số>.<thứ tự>`. */
const parseSourceId = (src) => {
  const m = /^wco-op\.(\d{4}|\d{6})\.(\d{1,3})$/.exec(String(src || ''));
  return m ? { hs: m[1], ord: Number(m[2]), id: `${m[1]}/${m[2]}` } : null;
};

module.exports = { available, incomplete, get, byHs, quoteInOpinion, parseSourceId, squash, reset };
