// lib/source-filter.js — LỌC NGUỒN CHỮ TRƯỚC KHI GỬI AI (CEO 10/10/2026).
//
// Đo thật ca kính lão 1688 (9004): AI nhận 24 dòng thông số, 10 dòng rác (上市年份/季节, 脸型, 风格…)
// = 47 % ký tự; OCR đưa nguyên 60 % quảng cáo/chính sách; 2 lượt AI cùng gói. Module này lọc
// TẤT ĐỊNH theo thư viện nhóm (lib/heading-lexicon.js) + nhãn rác toàn cục (data/noise-labels-zh.json):
//   (a) dòng SKU đang chọn (已选规格) LUÔN giữ;
//   (b) nhãn thuộc thư viện nhóm, hoặc giá trị có số + đơn vị → giữ;
//   (c) nhãn rác → bỏ;
//   (d) còn lại → misc (≤ 300 ký tự tổng) để AI thấy mà không ngập; nhãn misc ghi nhu cầu LABEL_UNKNOWN.
// OCR: bỏ dòng chứa từ quảng cáo/chính sách (trừ dòng có cặp nhãn keep：giá trị); giữ dòng
// "nhãn：giá trị" / số + đơn vị / chứa nhãn keep (+ dòng kế tiếp — bảng OCR tách nhãn và giá trị);
// mỗi ảnh ≤ 1.500 ký tự sau lọc. Mô tả: dòng có cấu trúc (declaration-sheet.filterDescriptionLines) + luật rác.
// Tắt bằng HS_SOURCE_FILTER=0 (đo trước/sau, hoặc phòng khi lọc quá tay).

const fs = require('fs');
const path = require('path');
const { lexiconFor, lexiconForKeys, labelKept, normLabel, APPLICATION_MARKERS } = require('./heading-lexicon');

const NOISE_FILE = path.join(__dirname, '..', 'data', 'noise-labels-zh.json');
let _noise = null;
function noiseTable() {
  if (!_noise) {
    try {
      const raw = JSON.parse(fs.readFileSync(NOISE_FILE, 'utf8'));
      _noise = {
        labels: new Set(Object.keys(raw.labels || {}).map(normLabel)),
        patterns: Object.keys(raw.patterns || {}).map((p) => new RegExp(p)),
        ocrWords: (raw.ocrNoise?.words || []).filter(Boolean),
      };
    } catch { _noise = { labels: new Set(), patterns: [], ocrWords: [] }; }
  }
  return _noise;
}

const SELECTED_RE = /^已选规格\(/;
const CJK = /[㐀-鿿]/;
// Cặp "nhãn：giá trị" (nhãn ngắn có chữ Hán) — cùng dạng declaration-sheet DESC_PAIR_RE nhưng đòi chữ Hán ở nhãn.
const PAIR_LINE_RE = /^[^:：]{1,30}[:：]\s*\S/;
const PAIR_ANY_RE = /([㐀-鿿A-Za-z()（）/]{1,14})\s*[:：]/g;
const MISC_MAX = 300;
const OCR_PER_IMAGE_MAX = 1500;
const DROPPED_MAX = 30;

// Regex số + đơn vị dùng chung với extract-specs (require trễ — extract-specs require module này).
function measure() { return require('./extract-specs'); }
const hasMeasure = (s) => { const m = measure(); return m.MEASURE_RE.test(String(s || '')) || m.MEASURE_VALUE_RE.test(String(s || '')); };

const isNoiseLabel = (label) => {
  const n = normLabel(label);
  const t = noiseTable();
  return t.labels.has(n) || t.patterns.some((re) => re.test(n));
};
const ocrNoiseWord = (line) => noiseTable().ocrWords.find((w) => line.includes(w)) || null;
/** Dòng có cặp "nhãn keep：…"? (OCR gộp nhiều cặp trên một dòng). */
function hasKeptPair(lex, line) {
  PAIR_ANY_RE.lastIndex = 0;
  let m;
  while ((m = PAIR_ANY_RE.exec(line))) if (CJK.test(m[1]) && labelKept(lex, m[1])) return true;
  return false;
}
/** Dòng chứa nhãn keep (không cần dấu hai chấm — bảng OCR "产品材质 电流电压")? */
function hasKeptLabel(lex, line) {
  const n = normLabel(line);
  for (const z of lex.keepLabelsZh) if (z.length >= 2 && n.includes(z)) return true;
  return false;
}
const hasPurpose = (line) => APPLICATION_MARKERS.some((w) => line.includes(w));

function filterSpecs(lex, specs, dropped, miscOut, focus) {
  const kept = [];
  let miscChars = 0;
  for (const s of specs) {
    const label = String(s.key ?? s.label ?? s.name ?? '').trim();
    const value = String(s.value ?? '').trim();
    if (!label || !value) continue;
    if (SELECTED_RE.test(label)) { kept.push({ ...s, _why: 'SKU' }); continue; }
    if (labelKept(lex, label)) { kept.push(s); continue; }
    if (hasMeasure(value)) { kept.push({ ...s, _why: 'MEASURE' }); continue; }
    if (isNoiseLabel(label)) { dropped.push({ src: 'specs', label, reason: 'NOISE' }); continue; }
    if (focus) { dropped.push({ src: 'specs', label, reason: 'NOT_FOCUS' }); continue; }
    const line = `${label}：${value}`;
    if (miscChars + line.length + 1 > MISC_MAX) { dropped.push({ src: 'specs', label, reason: 'MISC_FULL' }); continue; }
    miscChars += line.length + 1;
    miscOut.push({ label, line });
  }
  return kept;
}

function filterOcrText(lex, text, dropped, url) {
  const out = [];
  let carry = false;
  for (const raw of String(text || '').split(/[\n\r]+/)) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (!line) continue;
    const keptPair = hasKeptPair(lex, line);
    const noise = keptPair ? null : ocrNoiseWord(line);
    if (noise) { carry = false; dropped.push({ src: 'ocr', line: line.slice(0, 60), reason: `OCR_NOISE:${noise}` }); continue; }
    if (keptPair || hasMeasure(line) || hasKeptLabel(lex, line) || hasPurpose(line) || carry || (PAIR_LINE_RE.test(line) && CJK.test(line))) {
      out.push(line);
      // Bảng OCR: nhãn một dòng, giá trị dòng sau ("材质\n304不锈钢") → giữ thêm dòng kế tiếp.
      carry = !PAIR_LINE_RE.test(line) && (hasKeptLabel(lex, line) || keptPair);
      continue;
    }
    dropped.push({ src: 'ocr', line: line.slice(0, 60), reason: 'OCR_FREE_TEXT' });
  }
  let joined = out.join('\n');
  if (joined.length > OCR_PER_IMAGE_MAX) { dropped.push({ src: 'ocr', line: url || '', reason: `OCR_CUT:${joined.length}` }); joined = joined.slice(0, OCR_PER_IMAGE_MAX); }
  return joined;
}

function filterDesc(lex, text, dropped) {
  const out = [];
  for (const line of String(text || '').split(/[\n\r]+/)) {
    const l = line.trim();
    if (!l) continue;
    const label = (l.match(/^([^:：]{1,30})[:：]/) || [])[1];
    if (label && isNoiseLabel(label)) { dropped.push({ src: 'desc', label: label.trim(), reason: 'NOISE' }); continue; }
    const noise = (label && labelKept(lex, label)) ? null : ocrNoiseWord(l);
    if (noise) { dropped.push({ src: 'desc', line: l.slice(0, 60), reason: `OCR_NOISE:${noise}` }); continue; }
    out.push(l);
  }
  return out.join('\n');
}

/**
 * filterSources({ hsCode, title, specs[], skuLines[], descriptionText, imageTexts[], focusKeys? })
 *  → { specs: kept[], ocr:[{url,text}], desc, misc, miscLabels, dropped:[{src,label|line,reason}] (≤30),
 *      stats:{specsIn,specsKept,ocrCharsIn,ocrCharsKept,descCharsIn,descCharsKept}, lexicon }
 *  skuLines: dòng SKU dựng sẵn ({key:'已选规格(…)', value}) — luôn giữ. focusKeys: lượt vá, chỉ giữ nhãn của các khoá đó.
 */
function filterSources({ hsCode = null, specs = [], skuLines = [], descriptionText = '', imageTexts = [], focusKeys = null } = {}) {
  const focus = Array.isArray(focusKeys) && focusKeys.length > 0;
  const lex = focus ? lexiconForKeys(focusKeys) : lexiconFor(hsCode);
  const dropped = [];
  const miscOut = [];
  const all = [...(Array.isArray(specs) ? specs : []), ...(Array.isArray(skuLines) ? skuLines : [])];
  const keptSpecs = filterSpecs(lex, all, dropped, miscOut, focus);
  const ocr = [];
  let ocrCharsIn = 0; let ocrCharsKept = 0;
  for (const t of Array.isArray(imageTexts) ? imageTexts : []) {
    if (!t || typeof t.text !== 'string') continue;
    ocrCharsIn += t.text.length;
    const text = filterOcrText(lex, t.text, dropped, t.url);
    ocrCharsKept += text.length;
    if (text.trim()) ocr.push({ url: t.url || null, text });
  }
  const descIn = String(descriptionText || '');
  const desc = filterDesc(lex, descIn, dropped);
  return {
    specs: keptSpecs.map(({ _why, ...s }) => s),
    ocr,
    desc,
    misc: miscOut.map((m) => m.line).join('\n'),
    miscLabels: [...new Set(miscOut.map((m) => m.label))].slice(0, DROPPED_MAX),
    dropped: dropped.slice(0, DROPPED_MAX),
    stats: { specsIn: all.length, specsKept: keptSpecs.length, ocrCharsIn, ocrCharsKept, descCharsIn: descIn.length, descCharsKept: desc.length },
    lexicon: lex,
  };
}

const enabled = () => process.env.HS_SOURCE_FILTER !== '0';

module.exports = { filterSources, isNoiseLabel, noiseTable, enabled, MISC_MAX, OCR_PER_IMAGE_MAX };
