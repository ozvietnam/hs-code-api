/**
 * Sổ tay chú giải lúc CHẠY (backlog bước 8, docs/backlog/08-so-tay-chu-giai.md — bước 2 + 3).
 *
 * Hai việc, đều tất định (không AI):
 *  1. `soTayBlock(h4)` — bản tiêu hoá của chú giải nhóm cho gói vòng 2 (thay đoạn chú giải thô bị cắt
 *     300–450 ký tự): phạm vi, điều kiện vào, loại trừ CÓ NHÓM ĐÍCH, câu hỏi phân biệt, điều kiện dòng 8 số.
 *     Mọi mục giữ `nguon` để AI dẫn được điều khoản.
 *  2. `soTayGates()` — kết cục C "yêu cầu giải trình" của luồng 4 kết cục: máy NGHI, không kết luận.
 *     Máy chủ chỉ nhận ra chắc chắn mã/nhóm nêu đích danh, ngưỡng số có đơn vị, cụm từ trong câu luật —
 *     nghĩa còn lại là việc của AI, nhưng phải trả lời bằng câu trích hồ sơ.
 *       SO_TAY_LOAI_TRU — sổ tay nhóm đã chọn loại trừ đích danh một nhóm khác và TÊN HÀNG (danh từ đầu) chứa
 *                         tên hàng của mệnh đề loại trừ. Chế độ chặt hơn (HS_SO_TAY_LOAI_TRU=pool+phrase): nhóm
 *                         đích còn phải đang có mặt trong hồ sơ vụ việc (giả thuyết, mã đối lập, tiền lệ, made-in-china).
 *       SO_TAY_NGUONG   — điều kiện vào nhóm có ngưỡng số (khối lượng, điện áp, dung tích) mà hồ sơ ghi
 *                         số trái ngưỡng.
 *       SO_TAY_BO_PHAN  — hồ sơ nói hàng là bộ phận mà dòng chọn là máy hoàn chỉnh, trong nhóm có quy tắc
 *                         bộ phận và có dòng bộ phận riêng.
 *       SO_TAY_DONG8    — chọn dòng "Loại khác" trong khi tên một dòng cụ thể cùng phân nhóm có trong mô tả.
 *     Ngưỡng bật của từng cổng đã đo bằng chạy khô trên tập giữ riêng (scripts/so-tay-dry-run.mjs): cổng nào bật
 *     oan > 10 % trên mã ĐÚNG thì không nối. Số đo 09/10 (152 nhóm): loại trừ 3,2 % · ngưỡng 0,2 % · bộ phận 0,8 % · dòng 8 số 0,9 %.
 *
 * Bật trong động cơ hai vòng: HS_SO_TAY=gates (chỉ cổng) | full (cổng + gói sổ tay). Mặc định tắt.
 * Không gắn nhãn GIR ở đây (CLAUDE.md rule 6) — đây là tín hiệu dẫn chú giải, không phải trích GIR.
 */
const fs = require('fs');
const { dataReadPath } = require('./data-paths');
const { taxData } = require('./data');
const { syllables, STOPWORDS } = require('./vi-tokens');

const nz = (s) => String(s || '').replace(/\D/g, '');
const clip = (s, n) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n)}…` : t; };
const dotted = (h4) => `${h4.slice(0, 2)}.${h4.slice(2)}`;

const cache = new Map();
/** Sổ tay đã kiểm nguồn của một nhóm 4 số, hoặc null nếu nhóm chưa có sổ tay. */
function loadSoTay(h4) {
  const k = nz(h4).slice(0, 4);
  if (k.length !== 4) return null;
  if (!cache.has(k)) {
    let v = null;
    try { v = JSON.parse(fs.readFileSync(dataReadPath(`so-tay/${k}.json`), 'utf8')); } catch { v = null; }
    cache.set(k, v && v.nhom === k ? v : null);
  }
  return cache.get(k);
}

let wco6 = null;
function wcoText6(code6) {
  if (!wco6) {
    wco6 = new Map();
    try {
      for (const line of fs.readFileSync(dataReadPath('wco-hs-international.csv'), 'utf8').split('\n').slice(1)) {
        const m = line.match(/^[^,]*,(\d{6}),("(?:[^"]|"")*"|[^,]*),(\d+),6\s*$/);
        if (m) wco6.set(m[1], m[2].replace(/^"|"$/g, '').replace(/""/g, '"'));
      }
    } catch { /* thiếu tệp → không đọc được tên phân nhóm WCO */ }
  }
  return wco6.get(code6) || '';
}

// ───────────────────────── khớp cụm từ ─────────────────────────
// Khớp theo DANH TỪ ĐẦU (tên hàng trước mọi định ngữ), không theo mọi mảnh của câu: chạy khô 09/10 cho thấy khớp
// mảnh định ngữ làm cổng bật oan — "Dây cáp điện có đầu nối" (8544.42) khớp loại trừ "đầu nối dùng cho sợi quang
// → 85.36"; "Có lưới bảo vệ" (tên dòng 8414.59.41) là định ngữ, không phải tên hàng.
// Âm tiết không tự nói được mặt hàng: cụm chỉ gồm các âm tiết này ("thiết bị khác", "các loại máy") không tính.
const GENERIC = new Set(['máy', 'thiết', 'bị', 'dụng', 'cụ', 'bộ', 'phận', 'phụ', 'kiện', 'tùng', 'linh', 'sản', 'phẩm',
  'hàng', 'hoá', 'hóa', 'đồ', 'vật', 'cái', 'chiếc', 'tấm', 'loại', 'dạng', 'kiểu', 'thứ', 'nhóm', 'chương', 'phân',
  'khác', 'mới', 'cũ', 'thông', 'thường', 'chủ', 'yếu', 'riêng', 'chung']);
// Từ mở đầu định ngữ: tên hàng dừng ở đây ("Phích cắm | đi kèm dây dẫn", "Máy ép rau quả | dùng trong công nghiệp").
const QUALIFIER = new Set(['có', 'đã', 'chưa', 'với', 'kèm', 'gắn', 'lắp', 'dùng', 'của', 'bằng', 'trừ', 'không', 'thuộc',
  'kể', 'được', 'cho', 'để', 'trong', 'từ', 'theo', 'như', 'nhưng', 'mà', 'ở', 'trên', 'dưới', 'làm', 'gồm', 'chứa',
  'loại', 'dạng', 'kiểu', 'hoạt', 'vận', 'chạy', 'sử', 'thiết', 'đi', 'là', 'nếu', 'khi', 'thường', 'chỉ', 'đặc']);
const LEAD = new Set(['các', 'những', 'mọi', 'hoặc', 'và', 'hay', 'cả']);

function cutAtQualifier(syl) {
  let s = syl.filter((w) => !/^\d/.test(w));
  while (s.length && LEAD.has(s[0])) s = s.slice(1);
  const i = s.findIndex((w, k) => k > 0 && QUALIFIER.has(w));
  return { head: i < 0 ? s : s.slice(0, i), cut: i >= 0 || (s.length > 0 && QUALIFIER.has(s[0])) };
}
const meaningfulHead = (p) => p.length >= 2 && p.some((w) => !GENERIC.has(w) && !STOPWORDS.has(w) && w.length >= 2);

/** Tên hàng (danh từ đầu) của một câu điều kiện, tách các phương án song song: "Quạt gió, quạt thông gió hoặc chụp hút có gắn quạt" → [quạt gió] [quạt thông gió] [chụp hút]. */
function headPhrases(text) {
  const out = [];
  const pieces = String(text || '').replace(/\([^)]*\)/g, ' ').split(/[,;:[\]“”"]|\s[-–—]\s/);
  for (const piece of pieces) {
    const syl = syllables(piece);
    if (!syl.length) continue;
    if (QUALIFIER.has(syl[0])) break; // mảnh mở đầu bằng định ngữ ("đã hoặc chưa gắn…") → hết phần tên hàng
    const { head, cut } = cutAtQualifier(syl);
    for (const alt of head.join(' ').split(/\s(?:hoặc|và|hay)\s/)) {
      const p = alt.split(' ').filter(Boolean).slice(0, 4);
      if (meaningfulHead(p)) out.push(p);
    }
    if (cut) break;
  }
  return out;
}

/** Danh từ đầu của tên/mô tả hàng (≤ 10 âm tiết): "Kính mắt thời trang bằng nhựa, kích thước…" → kính mắt thời trang. */
function productHead(text) {
  const first = String(text || '').replace(/\([^)]*\)/g, ' ').split(/[,;:.\n]/)[0];
  return cutAtQualifier(syllables(first)).head.slice(0, 10);
}

function containsSeq(hay, seq) {
  outer: for (let i = 0; i + seq.length <= hay.length; i++) {
    for (let j = 0; j < seq.length; j++) if (hay[i + j] !== seq[j]) continue outer;
    return true;
  }
  return false;
}

/** Tên hàng nào của `cond` nằm liền mạch trong danh từ đầu `head` (mảng âm tiết hoặc chuỗi)? Trả cụm khớp hoặc null. */
function phraseHit(cond, head) {
  const hay = Array.isArray(head) ? head : productHead(head);
  for (const p of headPhrases(cond)) if (containsSeq(hay, p)) return p.join(' ');
  return null;
}

// ───────────────────────── gói cho vòng 2 ─────────────────────────
/**
 * Khối sổ tay của một nhóm cho gói vòng 2 (thay chú giải thô bị cắt). `lines`: dòng 8 số đang đưa cho AI —
 * điều kiện dòng 8 số chỉ in cho các dòng này để gói không phình. Trả null nếu nhóm chưa có sổ tay.
 */
function soTayBlock(h4, { lines = null, maxChars = 1800 } = {}) {
  const s = loadSoTay(h4);
  if (!s) return null;
  const want = lines ? new Set(lines.map(nz)) : null;
  // Thứ tự ưu tiên khi chạm trần ký tự: phạm vi → điều kiện vào → loại trừ → điều kiện dòng 8 số → câu hỏi phân biệt
  // → bộ phận. Cắt theo DÒNG, không cắt giữa câu (câu luật cụt dễ bị đọc ngược nghĩa).
  const parts = [];
  if (s.phamVi?.text) parts.push(`  Phạm vi: ${clip(s.phamVi.text, 220)} [${s.phamVi.nguon}]`);
  const dk = (s.dieuKienVao || []).slice(0, 5).map((d) => `${d.fact} ${d.op} ${d.value}${d.donVi ? ` ${d.donVi}` : ''}${d.ngoaiTru?.length ? ` (trừ: ${clip(d.ngoaiTru.join('; '), 80)})` : ''} [${d.nguon}]`);
  if (dk.length) parts.push(`  Điều kiện vào nhóm: ${dk.join(' · ')}`);
  const lt = (s.loaiTru || []).map((x) => `${clip(x.dieuKien, 55)} → ${String(x.sangNhom).split('|').map((c) => (c.length === 4 ? dotted(c) : c)).join('/')}`);
  if (lt.length) parts.push(`  LOẠI TRỪ (sang nhóm khác): ${lt.join('; ')} [${[...new Set((s.loaiTru || []).map((x) => x.nguon))].join(', ')}]`);
  const d8 = (s.dong8 || []).filter((d) => !want || want.has(nz(d.hs))).slice(0, 12).map((d) => `    ${nz(d.hs)}: ${clip(d.dieuKien, 90)}${d.loaiKhac ? ' (dòng Loại khác)' : ''}`);
  if (d8.length) parts.push(`  Điều kiện dòng 8 số:\n${d8.join('\n')}`);
  const pb = (s.phanBiet || []).slice(0, 4).map((x) => `${clip(x.hoi, 110)} có→${x.neuCo} / không→${x.neuKhong}`);
  if (pb.length) parts.push(`  Câu hỏi phân biệt: ${pb.join(' · ')}`);
  if (s.boPhan?.tomTat) parts.push(`  Bộ phận: ${clip(s.boPhan.tomTat, 160)} [${s.boPhan.nguon}]`);
  const out = [`  SỔ TAY nhóm ${s.nhom} (${s.phienBan || 'HS2022'}; mỗi ý kèm [nguồn]):`];
  let len = out[0].length;
  for (const p of parts) {
    if (len + p.length + 1 > maxChars) continue; // bỏ cả mục, giữ mục ưu tiên sau nếu còn vừa
    out.push(p); len += p.length + 1;
  }
  return out.join('\n');
}

// ───────────────────────── cổng ─────────────────────────
const UNIT_RULES = [
  // fact (tên trong sổ tay) → đơn vị cần có trong hồ sơ. Chỉ các đại lượng đọc được chắc từ trang bán/tem nhãn.
  { fact: /khoi_luong|trong_luong/, unit: 'kg', re: /(?:khối lượng|trọng lượng|nặng|净重|重量|毛重|weight)[^\d\n]{0,15}(\d+(?:[.,]\d+)?)\s*(?:kg|公斤|千克)/gi },
  { fact: /dien_ap/, unit: 'V', re: /(\d+(?:[.,]\d+)?)\s*(?:v|vôn|volt|伏)(?![a-zà-ỹ])/gi },
  { fact: /dung_tich/, unit: 'lít', re: /(\d+(?:[.,]\d+)?)\s*(?:lít|lit|l|升)(?![a-zà-ỹ])/gi },
];
const cmp = (a, op, b) => (op === '<=' ? a <= b : op === '<' ? a < b : op === '>=' ? a >= b : op === '>' ? a > b : true);

function numbersFor(rule, text) {
  const out = [];
  for (const m of String(text || '').matchAll(rule.re)) {
    const v = Number(String(m[1]).replace(',', '.'));
    if (Number.isFinite(v)) out.push(v);
  }
  return out;
}

// Dòng bộ phận: tên dòng VN mở đầu bằng "Bộ phận/Phụ tùng", hoặc phân nhóm WCO "…; parts …" / "Parts …".
// "… and parts thereof" (7323.93 đồ gia dụng VÀ bộ phận) KHÔNG phải dòng bộ phận — chạy khô 09/10 bắt lỗi này.
const isPartsLine = (hs) => /^[-\s–]*(bộ phận|phụ tùng)/i.test(String(taxData[hs]?.vn || '')) || /(^|;\s*)parts?\b/i.test(wcoText6(hs.slice(0, 6)));

// Chạy khô 09/10/2026 (763 tờ khai giữ riêng, 651 có sổ tay cho nhóm đúng — data/so-tay/bao-cao/chay-kho.json): cổng loại
// trừ bật oan trên mã ĐÚNG: theo pool 16,9 % (không đạt), theo tên hàng 3,2 %, cả hai 0,8 %. Mặc định theo tên hàng: pool
// của động cơ thật (giả thuyết AI + tiền lệ + made-in-china) khác pool chạy khô, tín hiệu tên hàng thì không đổi.
const DEFAULT_OPTS = { loaiTruRequire: process.env.HS_SO_TAY_LOAI_TRU || 'phrase', dong8: true };

/**
 * Cổng sổ tay cho mã đã chọn. Không chặn — trả `challenges[]` để động cơ hỏi lại AI một lượt (kết cục C).
 * @param {object} p
 * @param {string} p.hs           mã đang chọn (6 hoặc 8 số)
 * @param {string} p.productText  mô tả hàng (gốc + tên Việt) để đọc số có đơn vị
 * @param {string} [p.productName] tên hàng tiếng Việt (danh từ đầu dùng để khớp tên trong câu luật); thiếu → lấy từ productText
 * @param {string} [p.form]       dạng hàng vòng 1 đọc ra: 'hoàn chỉnh' | 'bộ phận' | …
 * @param {Array<{h4:string, from:string}>} [p.pool]  nhóm khác đang có mặt trong hồ sơ vụ việc
 * @param {object} [opts]  { loaiTruRequire: 'pool' | 'phrase' | 'pool+phrase' | 'pool|phrase', dong8: bool }
 */
function soTayGates({ hs, productText = '', productName = '', form = '', pool = [] } = {}, opts = {}) {
  const o = { ...DEFAULT_OPTS, ...opts };
  const code = nz(hs);
  const h4 = code.slice(0, 4);
  const s = code.length >= 4 ? loadSoTay(h4) : null;
  if (!s) return { checked: false, challenges: [] };
  const text = productHead(productName || productText);
  const poolBy = new Map();
  for (const p of pool) { const k = nz(p.h4).slice(0, 4); if (k.length === 4 && k !== h4) poolBy.set(k, [...(poolBy.get(k) || []), p.from]); }
  const challenges = [];

  // 1. Loại trừ đích danh.
  for (const it of s.loaiTru || []) {
    const targets = [...new Set(String(it.sangNhom).split(/[|,;\s]+/).map((c) => nz(c).slice(0, 4)).filter((c) => c.length === 4 && c !== h4))];
    if (!targets.length) continue;
    const inPool = targets.filter((t) => poolBy.has(t));
    const hit = phraseHit(it.dieuKien, text);
    const need = o.loaiTruRequire;
    const fire = need === 'pool' ? inPool.length > 0 : need === 'phrase' ? !!hit : need === 'pool|phrase' ? (inPool.length > 0 || !!hit) : (inPool.length > 0 && !!hit);
    if (!fire) continue;
    const to = (inPool.length ? inPool : targets).map(dotted).join(' / ');
    challenges.push({
      gate: 'SO_TAY_LOAI_TRU', h4, target: inPool[0] || targets[0], matched: hit, poolFrom: inPool.flatMap((t) => poolBy.get(t)),
      reasonVi: `Chú giải nhóm ${dotted(h4)} LOẠI TRỪ "${clip(it.dieuKien, 120)}" sang nhóm ${to}${hit ? ` — tên hàng có cụm "${hit}"` : ''}${inPool.length ? `; nhóm ${to} cũng đang có trong hồ sơ vụ việc (${[...new Set(inPool.flatMap((t) => poolBy.get(t)))].join(', ')})` : ''}.`,
      questionVi: `Hàng có thuộc diện "${clip(it.dieuKien, 120)}" không? Nếu có → nhóm ${to}; nếu không → nêu đặc điểm (trích nguyên văn hồ sơ) cho thấy hàng KHÔNG thuộc diện loại trừ này.`,
      legal: [{ nguon: it.nguon, trich: it.trich }],
    });
  }

  // 2. Ngưỡng số của điều kiện vào nhóm.
  for (const d of s.dieuKienVao || []) {
    if (typeof d.value !== 'number' || !['<=', '<', '>=', '>'].includes(d.op)) continue;
    const rule = UNIT_RULES.find((r) => r.fact.test(String(d.fact || '')));
    if (!rule) continue;
    const nums = numbersFor(rule, productText);
    if (!nums.length || nums.some((v) => cmp(v, d.op, d.value))) continue; // mọi số đọc được đều trái ngưỡng mới bật
    if ((d.ngoaiTru || []).some((x) => phraseHit(x, text))) continue; // hàng thuộc ngoại lệ "khối lượng bất kỳ"
    challenges.push({
      gate: 'SO_TAY_NGUONG', h4, target: null,
      reasonVi: `Điều kiện vào nhóm ${dotted(h4)}: ${d.fact} ${d.op} ${d.value} ${d.donVi || rule.unit}, hồ sơ ghi ${nums.join(', ')} ${rule.unit}${d.ngoaiTru?.length ? ` (ngoại lệ không giới hạn: ${clip(d.ngoaiTru.join('; '), 120)})` : ''}.`,
      questionVi: `Hồ sơ ghi ${nums.join(', ')} ${rule.unit} — trái ngưỡng ${d.op} ${d.value} của nhóm ${dotted(h4)}. Hàng có thuộc ngoại lệ không? Nếu không → chọn nhóm khác.`,
      legal: [{ nguon: d.nguon, trich: d.trich }],
    });
  }

  // 3. Hồ sơ nói BỘ PHẬN mà dòng chọn là hàng hoàn chỉnh, trong nhóm có dòng bộ phận riêng. Chiều ngược (hàng
  //    "hoàn chỉnh" mà chọn dòng bộ phận) không làm: bánh xe đẩy, chân bàn… vừa là món hoàn chỉnh vừa là bộ phận.
  if (s.boPhan && code.length >= 6) {
    const lines = Object.keys(taxData).filter((k) => k.startsWith(h4) && /^\d{8}$/.test(k));
    const partLines = lines.filter(isPartsLine);
    const chosenIsPart = isPartsLine(code.length === 8 ? code : (lines.find((k) => k.startsWith(code)) || code));
    const f = String(form || '').toLowerCase();
    if (partLines.length && partLines.length < lines.length) {
      if (f === 'bộ phận' && !chosenIsPart) {
        challenges.push({
          gate: 'SO_TAY_BO_PHAN', h4, target: partLines[0],
          reasonVi: `Hồ sơ cho thấy hàng là BỘ PHẬN nhưng dòng chọn ${code} là hàng hoàn chỉnh; nhóm ${dotted(h4)} có dòng bộ phận riêng (${partLines.slice(0, 3).join(', ')}).`,
          questionVi: `Hàng là bộ phận rời hay máy/hàng hoàn chỉnh? Nếu là bộ phận → xét dòng ${partLines.slice(0, 3).join(', ')} (hoặc nhóm riêng của bộ phận đó theo quy tắc bộ phận).`,
          legal: [{ nguon: s.boPhan.nguon, trich: s.boPhan.trich }],
        });
      }
    }
  }

  // 4. Dòng "Loại khác" trong khi tên một dòng cụ thể cùng phân nhóm 6 số có trong mô tả.
  if (o.dong8 && code.length === 8) {
    const mine = (s.dong8 || []).find((d) => nz(d.hs) === code);
    if (mine?.loaiKhac) {
      for (const d of s.dong8 || []) {
        const c = nz(d.hs);
        if (c === code || d.loaiKhac || c.slice(0, 6) !== code.slice(0, 6)) continue;
        const name = String(taxData[c]?.vn || '').replace(/^[-\s–]+/, '');
        const hit = phraseHit(name, text);
        if (!hit) continue;
        challenges.push({
          gate: 'SO_TAY_DONG8', h4, target: c, matched: hit,
          reasonVi: `Chọn dòng "Loại khác" ${code} nhưng mô tả có "${hit}" — đúng tên dòng cụ thể ${c} "${clip(name, 80)}".`,
          questionVi: `Hàng có phải "${clip(name, 80)}" (dòng ${c}) không? Dòng "Loại khác" chỉ dùng khi hàng không thoả dòng cụ thể nào.`,
          legal: [{ nguon: d.nguon, trich: d.trich }],
        });
        break;
      }
    }
  }
  return { checked: true, challenges };
}

module.exports = { loadSoTay, soTayBlock, soTayGates, phraseHit, headPhrases, productHead, isPartsLine };
