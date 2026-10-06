// Kiểm chứng cấp 8 số: dòng được chọn có CHỮ ĐẶC TRƯNG riêng (so với các dòng anh
// em cùng phân nhóm 6 số) thì mô tả hàng phải có dấu hiệu đó.
//
// VÌ SAO: LLM hay chọn dòng cụ thể dù mô tả không chứng minh điều kiện của dòng —
// Coca-Cola → 2202.10.20 "Nước tăng lực" trong khi lý do nó tự viết là "không phải
// nước tăng lực". Đây là phép so sánh dòng anh em mà người khai làm ở cấp phân
// nhóm quốc gia; không phải trích GIR, nên chỉ trả tín hiệu, không gắn nhãn GIR
// (CLAUDE.md rule 6 — mọi nhãn GIR đi qua lib/gir.js).

const { taxData } = require('./data');
const { removeDiacritics } = require('./search-utils');

// Từ chức năng / đơn vị: có mặt ở mọi nhãn, không phân biệt được dòng nào với dòng nào.
const STOP = new Set(`va hoac cua cho co khong loai khac dung bang tu tren duoi cac nhung da hay the nay voi trong ngoai
den la mot hon it nhat qua tinh theo dang kieu thuoc chi tru ke ca kem boi duoc chua su rieng nhu cai chiec bo
kg g cm mm m l ml w kw v a x`.split(/\s+/));

const LOAI_KHAC_RE = /^[-\s]*lo[aạ]i kh[aá]c\s*$/i;

function tokens(text) {
  return new Set(
    removeDiacritics(String(text || '').toLowerCase())
      .replace(/\([A-Z]{2,5}\)/gi, ' ') // chú thích kiểu "(SEN)" trong nhãn biểu thuế
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 2 && !STOP.has(w) && !/^\d+$/.test(w)),
  );
}

let _by6 = null;
function siblingsOf(code) {
  if (!_by6) {
    _by6 = new Map();
    for (const hs of Object.keys(taxData)) {
      if (!/^\d{8}$/.test(hs)) continue;
      const k = hs.slice(0, 6);
      if (!_by6.has(k)) _by6.set(k, []);
      _by6.get(k).push(hs);
    }
  }
  return (_by6.get(code.slice(0, 6)) || []).filter((c) => c !== code);
}

function labelOf(code) {
  return String(taxData[code]?.vn || '');
}

/**
 * checkSubheading(hsCode, text) →
 *   { ok: true, reason } |
 *   { ok: false, hsCode, distinctive: [...], alternative: hs|null, alternativeName, reasonVi }
 */
function checkSubheading(hsCode, text) {
  const code = String(hsCode || '').replace(/\D/g, '');
  if (code.length !== 8 || !taxData[code]) return { ok: true, reason: 'NOT_8_DIGIT' };
  const label = labelOf(code);
  if (LOAI_KHAC_RE.test(label)) return { ok: true, reason: 'RESIDUAL' };
  const sibs = siblingsOf(code);
  if (!sibs.length) return { ok: true, reason: 'NO_SIBLINGS' };

  const mine = tokens(label);
  const others = new Set();
  for (const s of sibs) for (const t of tokens(labelOf(s))) others.add(t);
  const distinctive = [...mine].filter((t) => !others.has(t));
  if (!distinctive.length) return { ok: true, reason: 'NO_DISTINCTIVE_WORDS' };

  const textToks = tokens(text);
  if (distinctive.some((t) => textToks.has(t))) return { ok: true, reason: 'SUPPORTED' };

  // Dòng anh em hợp hơn: chữ đặc trưng của nó có trong mô tả; không có thì dòng "Loại khác".
  let best = null;
  for (const s of sibs) {
    const lab = labelOf(s);
    if (LOAI_KHAC_RE.test(lab)) continue;
    const st = tokens(lab);
    const sOthers = new Set();
    for (const o of [code, ...sibs]) if (o !== s) for (const t of tokens(labelOf(o))) sOthers.add(t);
    const sDistinct = [...st].filter((t) => !sOthers.has(t));
    const support = sDistinct.filter((t) => textToks.has(t)).length;
    const overlap = [...st].filter((t) => textToks.has(t)).length;
    if (!support && !sDistinct.length && !overlap) continue;
    const score = support * 10 + overlap;
    if (support > 0 || (!sDistinct.length && overlap > 0) || overlap >= 2) {
      if (!best || score > best.score) best = { hs: s, score };
    }
  }
  const residual = sibs.find((s) => LOAI_KHAC_RE.test(labelOf(s))) || null;
  const alternative = best?.hs || residual;
  return {
    ok: false,
    hsCode: code,
    distinctive,
    alternative,
    alternativeName: alternative ? labelOf(alternative) : null,
    reasonVi: `Mã ${code} ("${label.replace(/^[-\s]+/, '')}") đòi dấu hiệu ${distinctive.map((t) => `"${t}"`).join(', ')} nhưng mô tả không có.`
      + (alternative ? ` Dòng cùng phân nhóm phù hợp hơn: ${alternative} ("${labelOf(alternative).replace(/^[-\s]+/, '')}").` : ''),
  };
}

// ── Đặc tính có / không ──────────────────────────────────────────────────────
// Nhãn "Đồ uống KHÔNG CÓ GA khác" mà mô tả nói "nước ngọt CÓ GA" là mâu thuẫn cứng,
// không phải thiếu dữ kiện. tokens() bỏ "không"/"có" (từ chức năng) nên checkSubheading
// thấy chữ "ga" ở cả hai bên và cho là khớp (Coca-Cola → 2202.99.50, conf 90).
// Đo trên 5.058 tờ khai thật (mã đúng + mô tả đã khai): 0 mã đúng bị bắt nhầm. Hai bẫy đã
// gặp khi đo: tờ khai viết tắt "ko có", và nhãn "có hoặc không có đầu, đuôi".
const NEG_FEATURE = /\bkhong (?:co|chua) ([a-z]{2,})\b/g;
const POS_FEATURE = /\b(?:co|chua) ([a-z]{2,})\b/g;

function polarityText(text) {
  return removeDiacritics(String(text || '').toLowerCase())
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(ko|k|kh)\b(?= (co|chua)\b)/g, 'khong')
    // "có hoặc không có đầu" = không ràng buộc → bỏ, kẻo đọc thành "không có đầu".
    .replace(/\b(co|chua) hoac khong (co|chua)\b/g, ' ');
}

function features(text) {
  const t = polarityText(text);
  const neg = new Set();
  const pos = new Set();
  let m;
  NEG_FEATURE.lastIndex = 0;
  while ((m = NEG_FEATURE.exec(t))) neg.add(m[1]);
  POS_FEATURE.lastIndex = 0;
  while ((m = POS_FEATURE.exec(t))) {
    if (!/khong $/.test(t.slice(Math.max(0, m.index - 6), m.index))) pos.add(m[1]);
  }
  return { neg, pos };
}

// "TRỪ X" trong nhãn dòng (06/10/2026): "Đồ chơi … bằng mọi loại vật liệu TRỪ PLASTIC" mà hàng ghi
// "nhựa PLA / 塑料" là mâu thuẫn cứng — trước đây chỉ hiểu dạng "không có X". Vật liệu so theo nhóm
// từ đồng nghĩa (Việt/Anh/Trung). Đo trên 5.152 tờ khai thật trước khi bật (xem test).
const EXCL_MATERIALS = {
  plastic: ['plastic', 'nhua', 'pla', 'pvc', 'abs', 'polyme', 'polymer', 'polypropylen', 'polyetylen', '塑料', '塑胶'],
  'cao su': ['cao su', 'rubber', 'silicone', '橡胶', '硅胶'],
  go: ['go', 'wood', 'tre', '木', '竹'],
  giay: ['giay', 'paper', 'bia', '纸'],
  'thuy tinh': ['thuy tinh', 'glass', 'kinh', '玻璃'],
  'kim loai': ['kim loai', 'metal', 'thep', 'sat', 'nhom', 'dong', 'inox', '金属', '钢', '铁', '铝', '铜'],
};
const EXCL_STOP = new Set(['cac', 'loai', 'nhung', 'mat', 'hang', 'san', 'pham', 'bang']);
function normText(text) {
  return ` ${removeDiacritics(String(text || '').toLowerCase()).replace(/[^a-z0-9㐀-鿿]+/g, ' ').trim()} `;
}
function hasTerm(nt, term) {
  return /[㐀-鿿]/.test(term) ? nt.includes(term) : nt.includes(` ${term} `);
}
function exclusionConflicts(code, text) {
  const label = removeDiacritics(labelOf(code).toLowerCase());
  const nt = normText(text);
  const out = [];
  const re = /\btru ([^,;():]+)/g;
  let m;
  while ((m = re.exec(label))) {
    const words = m[1].replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean);
    const content = words.filter((w) => !EXCL_STOP.has(w));
    if (!content.length) continue;
    const key = Object.keys(EXCL_MATERIALS).find((k) => content.join(' ').startsWith(k));
    // Chỉ "trừ <VẬT LIỆU>". Cụm hàng hoá ("trừ đi-ốt cảm quang") cần cả định ngữ phía sau mới
    // đúng nghĩa — so 2 chữ đầu bắt nhầm 24/5.152 tờ khai thật (đo 06/10/2026) nên không dùng.
    if (!key) continue;
    const hit = EXCL_MATERIALS[key].find((t) => hasTerm(nt, t)) || null;
    if (hit) out.push({ feature: key, labelSays: 'trừ', matched: hit });
  }
  return out;
}

function polarityConflicts(code, textFeatures) {
  const L = features(labelOf(code));
  const out = [];
  // Chỉ chiều nhãn "KHÔNG CÓ X" ↔ mô tả "có X". Chiều ngược (nhãn "có X") không dùng:
  // nhãn hay liệt kê nhiều loại ("xe đẩy, xe có bàn đạp…") nên "có X" không phải điều kiện.
  for (const f of L.neg) if (textFeatures.pos.has(f) && !textFeatures.neg.has(f)) out.push({ feature: f, labelSays: 'không có' });
  return out;
}

/**
 * checkPolarity(hsCode, text) →
 *   { ok: true } |
 *   { ok: false, hsCode, conflicts: [{feature, labelSays}], alternative: hs|null, alternativeName, reasonVi }
 * alternative: dòng cùng nhóm 4 số có nhãn khẳng định đúng đặc tính mà mô tả nêu.
 */
function checkPolarity(hsCode, text) {
  const code = String(hsCode || '').replace(/\D/g, '');
  if (code.length !== 8 || !taxData[code]) return { ok: true };
  const tf = features(text);
  const conflicts = [...polarityConflicts(code, tf), ...exclusionConflicts(code, text)];
  if (!conflicts.length) return { ok: true };

  let best = null;
  for (const hs of Object.keys(taxData)) {
    if (hs === code || !/^\d{8}$/.test(hs) || hs.slice(0, 4) !== code.slice(0, 4)) continue;
    if (polarityConflicts(hs, tf).length || exclusionConflicts(hs, text).length) continue;
    const L = features(labelOf(hs));
    const agree = [...L.pos].filter((f) => tf.pos.has(f)).length + [...L.neg].filter((f) => tf.neg.has(f)).length;
    if (agree && (!best || agree > best.agree)) best = { hs, agree };
  }
  const alternative = best?.hs || null;
  const what = conflicts.map((c) => `nhãn mã ghi "${c.labelSays} ${c.feature}" nhưng mô tả ghi ngược lại`).join('; ');
  return {
    ok: false,
    hsCode: code,
    conflicts,
    alternative,
    alternativeName: alternative ? labelOf(alternative) : null,
    reasonVi: `Mã ${code} ("${labelOf(code).replace(/^[-\s]+/, '')}") mâu thuẫn với mô tả: ${what}.`
      + (alternative ? ` Dòng cùng nhóm khớp đặc tính: ${alternative} ("${labelOf(alternative).replace(/^[-\s]+/, '')}").` : ''),
  };
}

module.exports = { checkSubheading, checkPolarity, exclusionConflicts, tokens };
