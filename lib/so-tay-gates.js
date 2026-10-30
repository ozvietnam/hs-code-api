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
 * Chế độ sổ tay lúc chạy — MỘT bộ đọc công tắc cho động cơ hai vòng (lib/engine-loop.js) và các cổng cảnh báo có đọc
 * sổ tay (lib/subheading-check.js, lib/residual-guard.js), để tắt khẩn cấp một chỗ là tắt hết: HS_SO_TAY=gates | full
 * (full/1/true/on); trống hay giá trị khác → 'off'. Đọc lúc gọi (không lúc nạp) để đổi được giữa các lượt đo/test.
 */
function soTayMode() {
  const v = String(process.env.HS_SO_TAY || '').trim().toLowerCase();
  if (['full', '1', 'true', 'on'].includes(v)) return 'full';
  return v === 'gates' ? 'gates' : 'off';
}

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

// ───────────────────────── CHỐT DÒNG 8 SỐ (kết cục D, #195) ─────────────────────────
// Máy ĐỊNH ĐOẠT đuôi 8 số trong CÙNG phân nhóm 6 bằng điều kiện số đã qua máy kiểm trích dẫn
// (data/so-tay/<nhóm>.json → dong8[].dieuKienSo). Chỉ đổi ĐUÔI, không đụng nhóm/phân nhóm.
//   đúng 1 dòng thỏa mọi điều kiện      → CHOT (đổi đuôi, kèm trích dẫn)
//   mọi dòng có điều kiện đều TRÁI      → LOAI_KHAC (phép phủ định hoàn chỉnh — chỉ khi có dòng LK cùng PN6)
//   có dòng chưa biết (thiếu số hồ sơ)  → THIEU_SO_LIEU + missingFacts (động cơ hỏi, không đoán)
//   ≥2 dòng cùng thỏa                   → TRANH_CAP (cờ chuyên viên)
//   phân nhóm chưa có điều kiện số      → KHONG_THE_CHOT (điểm mù — độ đo ở chạy khô)
// Đọc số từ hồ sơ: mỗi loại đại lượng đòi TỪ NGỮ CẢNH BÁO (đường kính/khối lượng…) gần số — tránh
// "10 x 20 cm" (kích thước bao) lọt thành đường kính. DN25 = đường kính danh nghĩa 25 mm.
const LOAI_GIA_TRI = {
  duong_kinh: { ctx: /đường kính|thông kính|kính (?:trong|thùng)|bore|dia\.?\s*\d|dn\s*\d|直径|口径|内径|外径|通径|⌀\s*\d|φ\s*\d/gi, he: 'dai', quyDoi: { mm: 0.1, cm: 1, m: 100, inch: 2.54 } },
  chieu_rong: { ctx: /chiều rộng|bề rộng|khổ\s*\d|width|宽|幅宽/gi, he: 'dai', quyDoi: { mm: 0.1, cm: 1, m: 100, inch: 2.54 } },
  chieu_dai: { ctx: /chiều dài|dài\s*[:\d]|length|长度|管长/gi, he: 'dai', quyDoi: { mm: 0.1, cm: 1, m: 100, inch: 2.54 } },
  chieu_cao: { ctx: /chiều cao|cao\s*[:\d]|height|高/gi, he: 'dai', quyDoi: { mm: 0.1, cm: 1, m: 100, inch: 2.54 } },
  be_day: { ctx: /độ dày|bề dày|thick|壁厚|厚度/gi, he: 'dai', quyDoi: { mm: 0.1, cm: 1, m: 100, inch: 2.54 } },
  khoi_luong: { ctx: /khối lượng|trọng lượng|nặng\s*[:\d]|净重|重量|毛重|weight/gi, he: 'nang', quyDoi: { g: 0.001, kg: 1, tấn: 1000 } },
  cong_suat: { ctx: /công suất|sức mạnh|power|功率/gi, he: 'congSuat', quyDoi: { w: 1, kw: 1000, kva: 1000, hp: 745.7 } },
  dien_ap: { ctx: /điện áp|vôn|volt|电压/gi, he: 'dienAp', quyDoi: { v: 1, mv: 0.001, kv: 1000 } },
  dong_dien: { ctx: /dòng điện|dòng định mức|current|电流/gi, he: 'dongDien', quyDoi: { a: 1, ma: 0.001 } },
  dung_tich: { ctx: /dung tích|thể tích|capacity|容量/gi, he: 'theTich', quyDoi: { cm3: 1, cc: 1, ml: 1, lít: 1000, l: 1000, m3: 1e6 } },
  ham_luong: { ctx: /hàm lượng|nồng độ|chứa\s*\d|content|含量/gi, he: 'phanTram', quyDoi: { '%': 1 } },
  ap_suat: { ctx: /áp suất|pressure|压力/gi, he: 'apSuat', quyDoi: { bar: 1, kpa: 0.01, mpa: 10 } },
};
// Đơn vị theo hệ (chiều dài/khối lượng/công suất…) — dùng để loại số có đơn vị lệch hệ khỏi phép so
const HE_CUA_DON_VI = (() => {
  const m = new Map();
  for (const loai of Object.values(LOAI_GIA_TRI)) for (const [u] of Object.entries(loai.quyDoi)) if (!m.has(u)) m.set(u, loai.he);
  return m;
})();
const SO_DON_VI_RE = /(\d+(?:[.,]\d+)?)\s*(mm|cm|km|m|inch|g|kg|tấn|w|kw|kva|hp|mv|v|kv|ma|a|cm3|cm³|cc|ml|lít|lit|l|m3|m³|%|bar|kpa|mpa)\b/gi;

// Vật liệu phân biệt (op LA, #195 vòng 3): canonical → mẫu nhận diện Việt + Hán. Dùng cho cả bóc (kiểm trích)
// và chấm điểm lúc chạy (đọc vật liệu từ mô tả hàng).
// Ranh giới chữ UNICODE (#434): `\b` của JS — kể cả khi có cờ u — chỉ biết chữ ASCII, nên `\bsứ\b` khớp "trang sức"
// (giữa "ứ" và "c" bị coi là ranh giới) mà không bao giờ khớp "Bát sứ". Chặn bằng lookaround trên CHỮ (\p{L}, \p{M} — chữ
// số thì được: "Inox304") đúng ở chỗ một âm tiết Việt có thể nằm TRONG âm tiết khác: "sứ" ⊂ sức/sứa/sứt (chặn sau), "gỗ" ⊂
// ngỗng/ngỗ (chặn chữ n trước); và quanh từ Anh ngắn (pvc, abs, wood, metal, glass — "Slabs" không phải ABS; "uPVC",
// "CPVC" vẫn là nhựa). Âm tiết Việt khác không nằm trong âm tiết nào khác nên giữ khớp chuỗi con: mô tả viết dính vẫn đọc
// được ("CL vảidệt", "cao sulưu hoá" — gặp thật trong data/oz-gold-final.jsonl). Gốc tiếng Anh dài (plastic, rubber,
// silicone, paper, ceramic, textile, fabric) giữ như cũ ("ceramics"). Chữ Hán không có khoảng trắng nên khớp chuỗi con, chỉ
// chặn 仿 (giả) đứng trước và 纹/色 (vân/màu) sau 木 — như bên chữ Việt. "sắt" là kim loại (trước đây thiếu: "Dao CNC …
// bằng sắt" chỉ được nhận kim loại nhờ chữ "gia công kim loại" — phôi — mà luật động từ gia công bên dưới đã bỏ).
// CHƯA thêm "hợp kim": sổ tay 8481.40.10 còn ghi "đường kính trong từ 2,5 cm trở xuống" là ">= 2,5" — có "hợp kim" thì
// "Van … hợp kim đồng, đường kính trong 14mm" bị chốt sang 8481.40.90. Chờ mô hình vật liệu đồng rồi sửa cả hai.
const W = (alts) => `(?<![\\p{L}\\p{M}])(?:${alts})(?![\\p{L}\\p{M}])`;
// Mỗi mẫu là MỘT nhóm: nơi khác ghép tiền tố vào `.source` (scripts/so-tay-extract-conditions.mjs) vẫn áp cho mọi phương án.
const matRe = (src) => new RegExp(`(?:${src})`, 'iu');
const MATERIALS = [
  ['plastic', matRe(`nhựa|${W('u?pvc|cpvc|abs')}|plastic|塑料|聚(?:氯乙烯|丙烯|乙烯|酯)|树脂`)],
  ['cao su', matRe('cao su|rubber|silicone|橡胶|硅胶')],
  ['giấy', matRe('giấy|paper|纸(?!箱|巾)')],
  ['gỗ', matRe(`(?<!n)gỗ|${W('wood')}|(?<!仿)木(?![兰纹色])`)],
  ['kim loại', matRe(`kim loại|thép|nhôm|inox|đồng thau|sắt|${W('metal')}|(?<!仿)(?:金属|不锈钢|钢|铝|铜|铁)`)],
  ['thủy tinh', matRe(`thủy tinh|thuỷ tinh|${W('glass')}|(?<!仿)玻璃`)],
  ['gốm sứ', matRe('gốm|sứ(?![\\p{L}\\p{M}])|ceramic|(?<!仿)(?:陶瓷|瓷(?!砖))')],
  ['vải dệt', matRe('vải|dệt|textile|fabric|布|织物')],
];
/** Mẫu THÔ của một vật liệu — để kiểm câu trích luật ("Bằng plastic…") có nêu vật liệu (lib/so-tay.js). */
const chatLieuRegex = (name) => MATERIALS.find(([n]) => n === name)?.[1] || null;
const MATERIALS_G = MATERIALS.map(([n, re]) => [n, new RegExp(re.source, `${re.flags}g`)]);

// Chữ tên vật liệu mà KHÔNG nói hàng LÀM BẰNG vật liệu đó (#434). Chỉ áp khi đọc MÔ TẢ HÀNG (chatLieuTrong) — câu trích
// luật vẫn kiểm bằng mẫu thô. Một vật liệu được tính khi còn ÍT NHẤT MỘT lần nhắc không rơi vào các trường hợp dưới.
//  · Cụm cố định: "vải thiều" / "vải sấy" / "quả vải" (trái cây); "giấy phép / giấy tờ / giấy chứng nhận / giấy bảo
//    hành / giấy đăng ký…" (chứng từ — "đã có giấy phép NK"). KHÔNG gồm "giấy báo": trong mô tả hàng đó là giấy in báo /
//    báo cũ (vật liệu thật); nghĩa "thông báo" gần như không gặp, mà bỏ nhầm thì mất một vật liệu đúng.
const KHONG_PHAI_VAT_LIEU = new RegExp(W('vải\\s+(?:thiều|sấy)|(?:quả|trái)\\s+vải|giấy\\s+(?:phép|tờ|chứng\\s+(?:nhận|từ)|bảo\\s+hành|mời|đăng\\s+k[ýí]|xác\\s+nhận|kiểm\\s+định|(?:ủy|uỷ)\\s+quyền|giới\\s+thiệu)'), 'giu');
//  · Bề ngoài đứng NGAY TRƯỚC tên vật liệu: "vân gỗ", "giả gỗ", "màu nhôm", "giả sứ", "mạ nhôm", "phủ nhựa", "tráng nhôm"
//    → màu / vân / lớp phủ, không phải chất liệu chính ("Khay nhựa vân gỗ" vẫn là nhựa). Không gồm "bọc"/"lót": vỏ bọc
//    cách điện của cáp và lớp lót vải của tấm cao su chính là điều kiện dòng 8 số (8544.42.94, 4008.11.10). "giả" đứng sau
//    tên món ĐỒ GIẢ ("tóc giả dệt kim", "hoa giả nhựa", "da giả nhựa", "răng giả sứ") thì vật liệu sau nó là vật liệu thật.
const BE_NGOAI_TRUOC = new RegExp(`(?<![\\p{L}\\p{M}])(?:màu|vân|(?<!(?:hoa|tóc|da|mi|móng|răng|cây|cỏ|lá|quả|trái|râu|lông)\\s)giả|mạ|ánh|tông|sơn|phủ|tráng|nhũ|(?:hoạ|họa)\\s+tiết|in\\s+hình|kiểu)\\s+$`, 'iu');
//  · Động từ gia công đứng ngay trước tên vật liệu, mà trước động từ là tên MÁY / DỤNG CỤ (cho xen 1 từ: "Máy laser cắt
//    thép") hoặc "dùng / để": "Máy cắt thép", "Máy hàn inox", "Máy đúc nhôm", "Đá cắt inox", "dùng để cắt thép" → vật
//    liệu là PHÔI được gia công, không phải chất liệu hàng. Không có tên máy thì GIỮ: "Vỏ đúc nhôm", "Que hàn inox", "Ván
//    ép gỗ" là vật liệu của chính hàng; "Van thép đúc" — "đúc" đứng SAU. Không gồm "mũi": "Mũi khoan thép gió" (HSS).
const GIA_CONG_TRUOC = new RegExp(`(?<![\\p{L}\\p{M}])(?:máy|thiết\\s+bị|dụng\\s+cụ|lưỡi|đá|đĩa|khuôn|dùng|để)(?:\\s+\\p{L}+)?\\s+(?:cắt|hàn|uốn|khoan|mài|dập|đột|gia\\s+công|xử\\s+l[ýí]|đánh\\s+bóng|ép|cán|tiện|phay|đúc)\\s+$`, 'iu');

/** Các vật liệu CỦA HÀNG nhận diện được trong một đoạn mô tả (canonical, có thể nhiều). */
function chatLieuTrong(text) {
  const t = String(text || '').normalize('NFC').replace(KHONG_PHAI_VAT_LIEU, (m) => ' '.repeat(m.length));
  const out = [];
  for (const [name, re] of MATERIALS_G) {
    for (const m of t.matchAll(re)) {
      const truoc = t.slice(Math.max(0, m.index - 40), m.index);
      if (BE_NGOAI_TRUOC.test(truoc) || GIA_CONG_TRUOC.test(truoc)) continue;
      out.push(name);
      break;
    }
  }
  return out;
}

// ── Ký hiệu ren hệ mét ISO: M8, M8x30, M8×1.25, M 10, M12x1.5x40 — số ngay sau "M" là ĐƯỜNG KÍNH DANH NGHĨA (mm) ──
// Với bu lông / vít / đai ốc / guzông / ty ren, đó chính là đường kính ngoài của thân mà biểu thuế chia dòng: 7318.15.10
// "Đường kính ngoài của thân không quá 16 mm"; đai ốc 7318.16.10 "Cho bu lông có đường kính ngoài của thân…" (đai ốc M10
// lắp bu lông M10). Prod 25/10/2026: "Bu lông lục giác … M8x30, kèm đai ốc" → hỏi lại "đường kính" + cảnh báo dòng .90.
// LUẬT NHẬN (đo trên data/oz-gold-final.jsonl 25/10/2026, 31 mô tả có ký hiệu M thuộc phân nhóm chia theo đường kính):
//  1. TÊN HÀNG phải là chi tiết lắp xiết đặt cỡ bằng ký hiệu M (DAU_LAP_XIET_*), lấy theo danh từ đầu như productHead —
//     "kèm / có / dùng cho…" cắt tên hàng nên "Van bướm DN100 kèm bu lông M16" KHÔNG phải bu lông. Chữ "ren" hay dạng
//     chặt "M20x1.5" một mình KHÔNG đủ: kho mẫu có "Bánh xe 2 phanh … M12 * 25" (ren trục, 8302), "chân ren M20x1.5" của
//     đồng hồ áp suất, "loại ren: M5x0.8mm", van khí nén "…-M5" — ở đó số ren KHÔNG phải đường kính của hàng, mà 8302 /
//     8481 / 7307 đều có dòng 8 số chia theo đường kính và chotDong8 lấy số nào thoả cũng được (bánh xe 300 mm + ren M12
//     sẽ "thoả" ngưỡng ≤ 250 mm). Mã model / chip / máy ảnh ("Apple M2", "M3 Pro", "Leica M10", "D-M9BV", "M14GC") rơi
//     ở luật này và ở mẫu ký hiệu (không dính chữ/số hai bên, không nằm trong mã nối gạch).
//  2. Chỉ là bộ đọc DỰ PHÒNG: mô tả đã ghi đường kính bằng chữ / DN / ⌀ thì giữ số đó, không cộng số M (gặp thật: "Đai ốc
//     xoáy … M16x1.5, … đường kính: 20mm" khai 7318.16.90) — đọc thêm chỉ được ở chỗ hôm nay máy CHƯA đọc được gì.
//  3. "m" thường phải dính số ("m8x30"; "2 m2", "g/m2", "m3/h" là đơn vị); phần lẻ chỉ ở cỡ < M5 (M1.6, M2.5, M3.5) —
//     "M8.8" là cấp bền, bỏ; cỡ ngoài 1–150 mm bỏ.
const KY_HIEU_REN_M = /(?<![\p{L}\p{N}])(?<![\p{L}\p{N}]-)(?<!\p{L}\s?\/\s?)(M\s?|m)(\d{1,3})(?:[.,](\d))?(?!\d)(?:\s?[x×*X]\s?\d+(?:[.,]\d+)?)*(?:\s?[mM][mM])?(?![\p{L}\p{N}])(?!-[\p{L}\p{N}])/gu;
const DAU_LAP_XIET_VI = new RegExp('^(?:(?:bộ|con|cái|chiếc|các|set|túi|hộp|gói)\\s)?(?:b[uù]\\s?lo?[ôo]ng|đai\\sốc|ê\\s?cu|đinh\\s(?:vít|hàn|tán)'
  + '|ốc(?=\\s?m\\d|\\s(?:vít|lục|tai|chìm|đầu|inox|thép|bắn|ren|hãm|thăng|nở|neo|cấy|khóa|khoá|trí|\\d)|$)' // không phải "ốc hương", "ốc siết cáp"
  + '|vít(?!\\s(?:me|tải)(?![\\p{L}\\p{M}]))|gu\\s?[zd][ôo]ng|t[iy]\\sren|thanh\\sren)(?![\\p{L}\\p{M}])', 'u'); // "vít me", "vít tải" là cơ cấu truyền động
const DAU_LAP_XIET_EN = /^(?:bolts?|screws?|nuts?|studs?|rivets?)$/; // tiếng Anh: danh từ đứng SAU định ngữ ("Hex bolt")
const DINH_NGU_EN = /^(?:for|with|of|and|including|incl|w|in|on|to|plus)$/;
const DAU_LAP_XIET_ZH = /螺栓|螺丝(?![刀批起])|螺钉|螺母|螺柱|铆钉|焊钉|栓钉|牙条/u; // 螺丝刀 = tua vít
const KEM_ZH = /带|配|含|附|送|用于|适用/u;
/** Tên hàng (danh từ đầu) là chi tiết lắp xiết đặt cỡ bằng ký hiệu ren M? Xem luật 1 ở trên. */
function laChiTietLapXiet(text) {
  const head = productHead(text);
  while (head.length && /\d/.test(head[0])) head.shift(); // "M20x80 bu lông", "304 bu lông"
  const s = head.join(' ');
  if (DAU_LAP_XIET_VI.test(s)) return true;
  if (/[À-ỹ]/u.test(s)) return false; // tên hàng tiếng Việt mà không phải chi tiết lắp xiết
  const en = [];
  for (const w of head) { if (DINH_NGU_EN.test(w)) break; en.push(w); }
  if (en.some((w) => DAU_LAP_XIET_EN.test(w)) || /threaded rods?/.test(en.join(' '))) return true;
  const dong1 = String(text || '').split('\n')[0];
  const m = dong1.match(DAU_LAP_XIET_ZH);
  return !!m && !KEM_ZH.test(dong1.slice(0, m.index));
}
/** Đường kính (cm, cùng hệ số mm → cm của LOAI_GIA_TRI) đọc từ ký hiệu ren M khi tên hàng là chi tiết lắp xiết. */
function duongKinhRenM(text) {
  const t = String(text || '');
  if (!laChiTietLapXiet(t)) return [];
  const mm = LOAI_GIA_TRI.duong_kinh.quyDoi.mm;
  const out = new Set();
  for (const m of t.matchAll(KY_HIEU_REN_M)) {
    if (m[1] === 'm' && /\d\s*$/.test(t.slice(Math.max(0, m.index - 4), m.index))) continue; // "2 m2" — đơn vị
    if (m[3] != null && Number(m[2]) >= 5) continue; // "M8.8" — cấp bền
    const d = Number(m[3] != null ? `${m[2]}.${m[3]}` : m[2]);
    if (d >= 1 && d <= 150) out.add(d * mm);
  }
  return [...out];
}

/** Mọi số đọc được của một loại đại lượng, đã QUY ĐỔI về đơn vị chuẩn của loại (cm/kg/W/V/A/cm3/%/bar). */
function giaTriCua(fact, text) {
  const loai = LOAI_GIA_TRI[fact];
  if (!loai) return [];
  const t = String(text || '').normalize('NFC');
  const ctxRe = new RegExp(loai.ctx.source, 'gi');
  const out = [];
  for (const m of t.matchAll(SO_DON_VI_RE)) {
    const donVi = m[2].toLowerCase().replace('³', '3').replace(/^lít$/, 'l').replace(/^lit$/, 'l');
    if (HE_CUA_DON_VI.get(donVi) !== loai.he) continue;
    const truoc = t.slice(Math.max(0, m.index - 30), m.index);
    ctxRe.lastIndex = 0;
    if (!ctxRe.test(truoc)) continue; // từ cảnh báo phải nằm sát số
    const so = Number(m[1].replace(',', '.'));
    const hs = loai.quyDoi[donVi];
    if (Number.isFinite(so) && Number.isFinite(hs)) out.push(so * hs);
  }
  if (fact === 'duong_kinh') {
    // DN25 / DN 25 → đường kính danh nghĩa 25 mm (tem thường không lặp đơn vị sau DN)
    for (const m of t.matchAll(/\bDN\s*(\d{1,3})\b/gi)) { const v = Number(m[1]) * 0.1; if (Number.isFinite(v)) out.push(v); }
    // Ký hiệu ren M8 / M8x30 của bu lông, vít, đai ốc… — DỰ PHÒNG khi chưa đọc được đường kính nào (xem KY_HIEU_REN_M).
    if (!out.length) out.push(...duongKinhRenM(t));
  }
  return out;
}

/** Chấm MỘT điều kiện số đơn ({fact,op,value,donVi}) trên mô tả hàng: THOA | TRAI | CHUA_BIET. */
function trangThaiMot(c, productText) {
  const quyDoiDonVi = (LOAI_GIA_TRI[c.fact]?.quyDoi || {})[String(c.donVi).toLowerCase()];
  if (!Number.isFinite(quyDoiDonVi)) return { ...c, trangThai: 'CHUA_BIET' };
  const vals = giaTriCua(c.fact, productText);
  if (!vals.length) return { ...c, trangThai: 'CHUA_BIET' };
  const thoa = vals.some((v) => cmp(v, c.op, c.value * quyDoiDonVi));
  return { ...c, trangThai: thoa ? 'THOA' : 'TRAI', giaTriDocDuoc: vals };
}

// #573 (L1-3b): điều kiện CÓ KIỂU (fact ∈ tu-vung@1 — op CO/KHONG/TRONG/TEN_LOAI/CONG_DUNG, số/LA trên khoá tu-vung) chấm bằng
// lib/dieu-kien-so.js#danhGiaTuChu (đọc dữ kiện bằng docGiaTri của lib/tu-vung.js). Nạp chậm: tu-vung nạp file này.
let _dk = null;
const DK = () => (_dk ||= require('./dieu-kien-so.js'));
const laDkCoKieu = (c) => Boolean(c) && c.op !== 'HOAC' && DK().laFactTuVung(c.fact);

/** Chấm mọi điều kiện số (dieuKienSo) của MỘT dòng 8 số trên mô tả hàng: THOA (mọi điều kiện thoả) | TRAI | CHUA_BIET. */
function danhGiaDong(d, productText) {
  const chiTiet = [];
  for (const c of d.dieuKienSo) {
    if (laDkCoKieu(c)) {
      const r = DK().danhGiaTuChu(c, productText);
      // So chữ tự do (TEN_LOAI, CONG_DUNG) không tất định → chotDong8 (căn cứ DETERMINISTIC) coi là CHUA_BIET, giữ kết quả so chữ ở soChu.
      const tt = r.tatDinh ? r.trangThai : 'CHUA_BIET';
      chiTiet.push({ ...c, trangThai: tt, ...(r.giaTriDocDuoc !== undefined ? { giaTriDocDuoc: dsDoc(r.giaTriDocDuoc) } : {}), coKieu: true, ...(r.tatDinh ? {} : { khongTatDinh: true, soChu: r.trangThai }) });
      continue;
    }
    if (c.op === 'LA') {
      const co = chatLieuTrong(productText);
      const thoaMat = co.includes(c.value);
      chiTiet.push({ ...c, trangThai: thoaMat ? 'THOA' : co.length ? 'TRAI' : 'CHUA_BIET', giaTriDocDuoc: co });
      continue;
    }
    if (c.op === 'HOAC') {
      // Phép CHỌN: mọi vế nối AND; một vế THOA là cả mục THOA; mọi vế có ít nhất một điều kiện TRÁI → TRAI; còn lại chưa biết.
      let anyThoa = false; let allFail = true; let anyChua = false;
      for (const alt of c.phuongAn || []) {
        const trangThaiAlt = alt.map((cc) => trangThaiMot(cc, productText));
        if (trangThaiAlt.every((x) => x.trangThai === 'THOA')) { anyThoa = true; allFail = false; break; }
        if (trangThaiAlt.some((x) => x.trangThai === 'TRAI')) { /* vế này trượt */ } else { allFail = false; anyChua = true; }
      }
      chiTiet.push({ ...c, trangThai: anyThoa ? 'THOA' : (allFail ? 'TRAI' : 'CHUA_BIET') });
      continue;
    }
    chiTiet.push(trangThaiMot(c, productText));
  }
  const trangThai = chiTiet.length && chiTiet.every((x) => x.trangThai === 'THOA') ? 'THOA'
    : chiTiet.some((x) => x.trangThai === 'TRAI') ? 'TRAI' : 'CHUA_BIET';
  return { hs: d.hs, trich: d.trich, nguon: d.nguon, trangThai, chiTiet };
}

/**
 * Các VẾ của câu trích (cắt ở ";" và "," không phải dấu thập phân) mà điều kiện của dòng NÓI TỚI: vế chứa ngưỡng số của
 * một điều kiện (kể cả phương án HOẶC) hoặc tên vật liệu của điều kiện LA. Vế còn lại là phần dòng máy KHÔNG chấm được —
 * vd "Bằng đồng hoặc hợp kim đồng" của 8481.40.10 (sổ tay chưa có vật liệu "đồng"): THOẢ ngưỡng đường kính không chứng
 * minh được hàng bằng đồng, nên cổng cảnh báo không được coi THOẢ là đủ.
 */
function veMoHinh(d) {
  const nguong = []; const vatLieu = []; const coKieu = [];
  for (const c of d.dieuKienSo || []) {
    if (laDkCoKieu(c)) { coKieu.push(c); if (typeof c.value === 'number') nguong.push(c.value); continue; }
    if (c.op === 'LA') { const re = chatLieuRegex(c.value); if (re) vatLieu.push(re); } else if (c.op === 'HOAC') {
      for (const alt of c.phuongAn || []) for (const cc of alt || []) nguong.push(cc.value);
    } else nguong.push(c.value);
  }
  const coSo = (ve, n) => [String(n), String(n).replace('.', ',')].some((s) => new RegExp(`(?<![\\d.,])${s.replace('.', '\\.')}(?![\\d]|[.,]\\d)`).test(ve));
  return String(d.trich || '').split(/;|,(?!\d)/).filter((ve) => nguong.some((n) => Number.isFinite(n) && coSo(ve, n)) || vatLieu.some((re) => re.test(ve))
    || coKieu.some((c) => typeof c.value !== 'number' && DK().kiemDieuKien({ ...c, chieu: undefined }, ve) === null));
}

/**
 * Mô tả hàng có chứng minh ĐIỀU KIỆN SỐ của chính dòng 8 số `hs` (sổ tay dong8[].dieuKienSo) không — cùng máy chấm
 * (danhGiaDong) và cùng bộ đọc số / vật liệu (giaTriCua, chatLieuTrong) với chotDong8 và /api/so-tay-questions, để cổng
 * cảnh báo chữ đặc trưng (lib/subheading-check.js, lib/residual-guard.js) không nói ngược câu hỏi / chốt dòng. Chỉ chấm
 * đúng dòng đó, không chọn dòng, không đổi mã. `veMoHinh`: các vế câu trích mà điều kiện đã chấm nói tới — cổng cảnh báo
 * chỉ tin kết quả khi các vế này phủ HẾT chữ đặc trưng của dòng.
 * @returns {null|{hs:string, trangThai:'THOA'|'TRAI'|'CHUA_BIET', chiTiet:object[], nguon:string, trich:string, veMoHinh:string[]}}
 *          null khi nhóm chưa có sổ tay hoặc dòng không có điều kiện số (dòng "Loại khác" không mang điều kiện khẳng định).
 */
function trangThaiDong8({ hs, productText = '' } = {}) {
  const code = nz(hs);
  if (code.length !== 8) return null;
  const s = loadSoTay(code.slice(0, 4));
  const d = (s?.dong8 || []).find((x) => nz(x.hs) === code);
  if (!d || d.loaiKhac || !Array.isArray(d.dieuKienSo) || !d.dieuKienSo.length) return null;
  return { ...danhGiaDong({ ...d, hs: code }, productText), veMoHinh: veMoHinh(d) };
}

const dsDoc = (v) => (Array.isArray(v) ? v : [v]);
const inGiaTri = (v) => (v && typeof v === 'object' ? (v.chatLieu || JSON.stringify(v)) : v === true ? 'có' : v === false ? 'không' : String(v));
/** Lời nêu các điều kiện TRÁI của một kết quả danhGiaDong, số đổi lại đơn vị của điều kiện: "duong_kinh <= 16 mm (mô tả ghi 20 mm)". */
function moTaDieuKienTrai(dg) {
  return (dg?.chiTiet || []).filter((c) => c.trangThai === 'TRAI').map((c) => {
    if (c.coKieu || laDkCoKieu(c)) return `${DK().moTaNgan(c)}${c.giaTriDocDuoc !== undefined ? ` (mô tả ghi ${dsDoc(c.giaTriDocDuoc).map(inGiaTri).join(', ')})` : ''}`;
    if (c.op === 'LA') return `chất liệu ${c.value} (mô tả ghi ${(c.giaTriDocDuoc || []).join(', ')})`;
    if (c.op === 'HOAC') return 'điều kiện "hoặc" (mọi phương án đều trái)';
    const q = (LOAI_GIA_TRI[c.fact]?.quyDoi || {})[String(c.donVi).toLowerCase()];
    const doc = (c.giaTriDocDuoc || []).map((v) => (q ? Number((v / q).toFixed(3)) : v));
    return `${c.fact} ${c.op} ${c.value} ${c.donVi} (mô tả ghi ${doc.join(', ')} ${c.donVi})`;
  }).join('; ');
}

/**
 * Chốt dòng 8 số cho mã đang chọn (≥6 số) trong cùng phân nhóm 6. Tất định, không AI.
 * @returns {{checked:boolean, ketQua:string, hs?:string, tuHs?:string, dongThoa?:string[], traNguon?:{nguon:string,trich:string}[], missingFacts?:{fact:string,donVi:string,canThoa:string}[], lyDo?:string}}
 */
function chotDong8({ hs, productText = '' } = {}) {
  const code = nz(hs);
  if (code.length < 6) return { checked: false, ketQua: 'KHONG_THE_CHOT', lyDo: 'duoi-6-so' };
  const s6 = code.slice(0, 6); const h4 = code.slice(0, 4);
  const s = loadSoTay(h4);
  if (!s) return { checked: false, ketQua: 'KHONG_THE_CHOT', lyDo: 'nhom-chua-co-so-tay' };
  const dongCungPn6 = (s.dong8 || []).map((d) => ({ ...d, hs: nz(d.hs) })).filter((d) => d.hs.length === 8 && d.hs.slice(0, 6) === s6);
  if (!dongCungPn6.length) return { checked: false, ketQua: 'KHONG_THE_CHOT', lyDo: 'phan-nhom-chua-co-trong-so-tay' };
  const coDieuKien = dongCungPn6.filter((d) => !d.loaiKhac && Array.isArray(d.dieuKienSo) && d.dieuKienSo.length);
  if (!coDieuKien.length) return { checked: true, ketQua: 'KHONG_THE_CHOT', lyDo: 'ranh-gioi-chua-so-hoa', dongAnhEm: dongCungPn6.map((d) => d.hs) };
  const lkLines = dongCungPn6.filter((d) => d.loaiKhac);
  const namedLines = dongCungPn6.filter((d) => !d.loaiKhac);
  // Phủ định chỉ HOÀN CHỈNH khi MỌI dòng anh em có tên đều có điều kiện đã kiểm (đọc tay 13 ca 8504.40 ngày 13/10:
  // PN6 có 2 dòng "Loại khác" ở hai độ sâu khác nhau — máy từng lấy dòng đầu; và dòng .94 dính chất liệu chưa mô hình).
  const phuDinhHoanChinh = namedLines.length > 0 && namedLines.every((d) => Array.isArray(d.dieuKienSo) && d.dieuKienSo.length);

  const danhGia = coDieuKien.map((d) => danhGiaDong(d, productText));

  const thoa = danhGia.filter((d) => d.trangThai === 'THOA');
  const traNguon = (arr) => arr.slice(0, 4).map((d) => ({ nguon: d.nguon, trich: clip(d.trich, 200) }));
  // Phủ định chưa hoàn chỉnh (còn anh em chưa số hóa) → cả ba đường chốt/hỏi đều bị chặn:
  // chốt dương tính cũng không đủ tin (vd 8504.40.20 "máy nạp ắc quy >100kVA" — vế TÊN không kiểm được),
  // còn hỏi khách "công suất >100 kVA?" cho bộ nguồn 260W là câu hỏi vô nghĩa (đo 13/10).
  if (!phuDinhHoanChinh) return { checked: true, ketQua: 'KHONG_THE_CHOT', tuHs: code.length === 8 ? code : null, lyDo: 'phu-dinh-chua-hoan-chinh', dongAnhEm: namedLines.filter((d) => !(Array.isArray(d.dieuKienSo) && d.dieuKienSo.length)).map((d) => d.hs) };
  if (thoa.length === 1) {
    return { checked: true, ketQua: 'CHOT', tuHs: code.length === 8 ? code : null, hs: thoa[0].hs, dongThoa: [thoa[0].hs], traNguon: traNguon(thoa), dieuKien: thoa[0].chiTiet.map(({ fact, op, value, donVi, viTri, chieu }) => ({ fact, op, value, donVi, ...(viTri ? { viTri } : {}), ...(chieu ? { chieu } : {}) })) };
  }
  if (thoa.length >= 2) {
    return { checked: true, ketQua: 'TRANH_CAP', tuHs: code.length === 8 ? code : null, dongThoa: thoa.map((d) => d.hs), traNguon: traNguon(thoa) };
  }
  if (danhGia.every((d) => d.trangThai === 'TRAI')) {
    if (lkLines.length > 1) return { checked: true, ketQua: 'KHONG_THE_CHOT', tuHs: code.length === 8 ? code : null, lyDo: 'nhieu-dong-loai-khac', dongAnhEm: lkLines.map((d) => d.hs) };
    if (lkLines.length === 1) return { checked: true, ketQua: 'LOAI_KHAC', tuHs: code.length === 8 ? code : null, hs: lkLines[0].hs, traNguon: traNguon(danhGia), lyDo: 'moi-anh-em-co-dieu-kien-va-deu-trai' };
    return { checked: true, ketQua: 'KHONG_THE_CHOT', tuHs: code.length === 8 ? code : null, lyDo: 'phu-dinh-nhung-khong-co-dong-loai-khac' };
  }
  const missing = [];
  for (const d of danhGia) for (const c of d.chiTiet) {
    if (c.trangThai !== 'CHUA_BIET' || c.khongTatDinh || missing.some((m) => m.fact === c.fact)) continue;
    // #573: điều kiện có kiểu → câu hỏi lấy từ tu-vung@1 (cauHoi), canThoa bằng lời ngắn; donVi rỗng khi không phải số.
    if (c.coKieu) missing.push({ fact: c.fact, donVi: c.donVi || '', canThoa: DK().moTaNgan(c), cauHoi: require('./tu-vung').cauHoiCho(c.fact, 'vi') });
    else missing.push({ fact: c.fact, donVi: c.donVi, canThoa: `${c.op} ${c.value}` });
  }
  // #573: chỉ còn vướng điều kiện so chữ không tất định (tên loại / công dụng) → không hỏi lại điều khách đã khai, không chốt.
  if (!missing.length) return { checked: true, ketQua: 'KHONG_THE_CHOT', tuHs: code.length === 8 ? code : null, lyDo: 'ranh-gioi-so-chu-khong-tat-dinh', traNguon: traNguon(danhGia.filter((d) => d.trangThai === 'CHUA_BIET')) };
  return { checked: true, ketQua: 'THIEU_SO_LIEU', tuHs: code.length === 8 ? code : null, missingFacts: missing.slice(0, 3), traNguon: traNguon(danhGia.filter((d) => d.trangThai === 'CHUA_BIET')) };
}

// ───────────────────────── TÁC ĐỘNG THUẾ của một câu hỏi chốt dòng (#411) ─────────────────────────
// Câu hỏi đặc điểm `fact` (vd duong_kinh) ở phân nhóm 6 của mã quyết định hàng rơi vào dòng nào trong số:
// các dòng 8 số cùng PN6 mà dieuKienSo nhắc tới fact (kể cả vế trong phuongAn của op HOAC) + các dòng
// "Loại khác" cùng PN6 (nơi rơi về khi trái mọi điều kiện). Đọc mfn/acfta của các dòng đó từ tax.json →
// chênh MFN = tiền thuế treo trên câu trả lời, để bên hỏi (ERP "kỷ luật hỏi") xếp câu theo tác động thuế.
// CHỈ TÍNH, không chọn dòng, không đổi thứ tự câu. Số dạng %: lấy số đầu của chuỗi biểu ("25 (NHN: 80)" → 25,
// "15 (-KH, TH)" → 15); "*" / rỗng → null. acftaKhac = mức ACFTA (số đầu, kể cả "không có") khác nhau giữa các dòng.
const soThue = (raw) => { const m = String(raw ?? '').trim().match(/^(\d+(?:[.,]\d+)?)/); return m ? Number(m[1].replace(',', '.')) : null; };
const factsCuaDong = (d) => {
  const out = new Set();
  for (const c of d.dieuKienSo || []) {
    if (c.fact) out.add(c.fact);
    for (const alt of c.phuongAn || []) for (const cc of alt || []) if (cc.fact) out.add(cc.fact);
  }
  return out;
};
/**
 * Tác động thuế của câu hỏi `fact` tại phân nhóm 6 của `hs` (≥ 6 số).
 * @returns {{mfnMin:number|null, mfnMax:number|null, chenh:number|null, acftaKhac:boolean, dong:string[]}|null}
 *          null khi nhóm chưa có sổ tay / phân nhóm chưa có dòng 8 số trong sổ tay.
 */
function tacDongThueDong8({ hs, fact } = {}) {
  const code = nz(hs);
  if (code.length < 6 || !fact) return null;
  const s = loadSoTay(code.slice(0, 4));
  if (!s) return null;
  const s6 = code.slice(0, 6);
  const cungPn6 = (s.dong8 || []).map((d) => ({ ...d, hs: nz(d.hs) })).filter((d) => d.hs.length === 8 && d.hs.slice(0, 6) === s6);
  if (!cungPn6.length) return null;
  let dong = cungPn6.filter((d) => d.loaiKhac || factsCuaDong(d).has(fact));
  if (!dong.some((d) => !d.loaiKhac)) dong = cungPn6; // fact không nằm ở dòng có tên nào → lấy cả phân nhóm
  const coThue = dong.filter((d) => taxData[d.hs]);
  const mfn = coThue.map((d) => soThue(taxData[d.hs].mfn)).filter((v) => v != null);
  const acfta = coThue.map((d) => soThue(taxData[d.hs].acfta));
  const mfnMin = mfn.length ? Math.min(...mfn) : null;
  const mfnMax = mfn.length ? Math.max(...mfn) : null;
  return {
    mfnMin,
    mfnMax,
    chenh: mfnMin == null ? null : Number((mfnMax - mfnMin).toFixed(2)),
    acftaKhac: new Set(acfta.map((v) => (v == null ? 'NA' : String(v)))).size > 1,
    dong: dong.map((d) => d.hs),
  };
}

module.exports = { soTayMode, loadSoTay, soTayBlock, soTayGates, chotDong8, danhGiaDong, trangThaiDong8, moTaDieuKienTrai, tacDongThueDong8, giaTriCua, chatLieuTrong, chatLieuRegex, MATERIALS, GIA_CONG_TRUOC, phraseHit, headPhrases, productHead, isPartsLine };
