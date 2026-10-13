/**
 * lib/wco-op.js — kho Tuyển tập ý kiến phân loại WCO (#196, TT 85/2026 Điều 6.1 nguồn 2).
 *
 * Dữ liệu: data/wco-op/opinions.json (sinh bởi scripts/wco-op-parse*.mjs từ bản OCR tiếng Anh) + vi.json (bản dịch tiếng Việt,
 * KHÔNG chính thức: máy dịch + soát mẫu, chỗ nghi lỗi OCR ghi "[?]").
 * CÔNG KHAI từ 11/10/2026: CEO Oz tuyên bố đã trả phí bản quyền và cho dùng công khai (trước đó chỉ để nội bộ). Xem BAN_QUYEN.
 * Thiếu tệp thì mọi hàm trả rỗng (test cách ly / bản sao không có dữ liệu vẫn chạy được).
 *
 * Mã nguồn dùng trong sổ tay: `wco-op.<hs>.<thứ tự>` — vd wco-op.851762.4 (ý kiến 8517.62/4), wco-op.2106.1 khi
 * ý kiến ghi theo nhóm 4 số (21.06/1). Câu trích kiểm bằng quoteInOpinion (cùng cách chuẩn hoá với lib/so-tay.js).
 *
 * Chỉ ý kiến đã qua cổng mã/thứ tự (không headingSuspect) được trả ra ngoài — lý do là ĐỘ CHÍNH XÁC (trích nhầm mã tệ hơn không
 * trích), không còn là bản quyền. Nguyên văn là bản OCR: có thể sai chữ.
 */
const fs = require('fs');
const { dataReadPath } = require('./data-paths');

let cache = null;

/** Tuyên bố bản quyền gắn vào mọi phản hồi trả nội dung WCO (nguyên văn hoặc bản dịch). Ghi đúng điều CEO tuyên bố, không thêm điều không biết. */
const BAN_QUYEN = 'Nội dung ý kiến phân loại thuộc bản quyền của Tổ chức Hải quan Thế giới (WCO), Compendium of Classification Opinions, ấn bản HS 2022. ' +
  'Oz tuyên bố đã trả phí bản quyền để sử dụng và công bố nội dung này (CEO Oz xác nhận 10/10/2026). ' +
  'Nội dung này KHÔNG thuộc giấy phép CC BY-SA của kho dữ liệu; mọi quyền khác thuộc WCO. Bản dịch tiếng Việt là bản dịch phái sinh, không chính thức.';

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

function reset() { cache = null; viCache = null; }

// Bản dịch tiếng Việt theo `line` (khoá ổn định của ý kiến trong tệp md OCR): data/wco-op/vi.json
let viCache = null;
function loadVi() {
  if (viCache) return viCache;
  try { viCache = JSON.parse(fs.readFileSync(process.env.HS_WCO_VI_FILE || dataReadPath('wco-op', 'vi.json'), 'utf8')); } catch { viCache = {}; }
  return viCache;
}
/** Bản dịch tiếng Việt của một ý kiến (hoặc null). */
const viOf = (o) => (o && loadVi()[o.line]?.vi) || null;
const available = () => load().list.length > 0;
const get = (id) => load().byId.get(id) || null;

/** Các ý kiến thuộc một mã HS (4 hoặc 6 số). */
function byHs(hs) {
  const h = String(hs || '').replace(/\D/g, '');
  if (h.length !== 4 && h.length !== 6) return [];
  // Ý kiến có mã gán không đáng tin (headingSuspect: tiêu đề mã bị OCR làm rơi) KHÔNG được trả — gán sai mã tệ hơn không có.
  return load().list.filter((o) => !o.headingSuspect && o.hs.startsWith(h));
}

/**
 * Độ tin cậy của MÃ gán cho ý kiến — một luật duy nhất cho API (canCuPhapLy) và sổ tay (yKienWco).
 * CHAC = mã đọc thẳng từ tiêu đề trong bản OCR; SUY_LUAN = tiêu đề bị OCR làm rơi, mã được khôi phục bằng luật máy
 * (tiêu đề "(continued)") hoặc suy luận có kiểm — đối chiếu bản gốc trước khi dẫn.
 */
const doTinCay = (o) => (o && (o.headingInferred || o.headingRecovered) ? 'SUY_LUAN' : 'CHAC');

const dotHs = (hs) => (hs.length === 6 ? `${hs.slice(0, 4)}.${hs.slice(4)}` : hs.length === 4 ? `${hs.slice(0, 2)}.${hs.slice(2)}` : hs);

/**
 * Bản xem đầy đủ của một ý kiến để trả ra API: nguyên văn OCR + bản dịch + nguồn + cảnh báo trung thực + tuyên bố bản quyền.
 * Trả null cho ý kiến chưa qua cổng (headingSuspect) — không bao giờ trả ý kiến có mã/thứ tự chưa đáng tin.
 */
function view(o) {
  if (!o || o.headingSuspect) return null;
  const hs = o.hs;
  const d = dotHs(hs);
  return {
    hs, hsDinhDang: d, thuTuTrongMa: o.ord, namThongQua: o.adoption || null,
    ...(o.application ? { quyTacApDung: o.application } : {}),
    nguyenVanEn: o.text,
    banDichVi: viOf(o),
    doTinCay: doTinCay(o),
    daSoatAnh: false,
    nguon: `Compendium of Classification Opinions (WCO), HS 2022, ý kiến phân loại ${d}/${o.ord}${o.adoption ? `, thông qua năm ${o.adoption}` : ''}`,
    maNguon: `wco-op.${hs}.${o.ord}`,
    luuY: 'nguyenVanEn là bản OCR từ bản scan: có thể sai chữ/ký tự. banDichVi là bản dịch KHÔNG chính thức (máy dịch, đã soát mẫu), chỗ nghi lỗi OCR ghi "[?]". daSoatAnh=false: chưa đối chiếu ảnh trang gốc — đối chiếu bản gốc trước khi dẫn trong hồ sơ Hải quan.',
    banQuyen: BAN_QUYEN,
  };
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

module.exports = { BAN_QUYEN, available, incomplete, doTinCay, viOf, view, get, byHs, quoteInOpinion, parseSourceId, squash, reset };
