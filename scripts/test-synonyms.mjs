#!/usr/bin/env node
/**
 * Máy kiểm `data/synonyms.json` tier 1 (#309) — LUẬT SẮT: 0 cụm LLM tự chế.
 *
 * Mọi cụm EN trong tier 1 phải XUẤT HIỆN NGUYÊN VĂN trong 1 trong 4 mỏ nguồn
 * (wco-hs-international.csv / sen-2022.json / explanatory-notes.json /
 * wco-op/opinions.json). Chuỗi bằng chứng 3 nấc, máy tự đối chiếu:
 *
 *   cụm `en`  ⊆  đoạn trích `nguon.trich`  ⊆  trường `nguon.truong` của nguồn thật
 *
 * Test này ĐỌC LẠI tệp nguồn và tự parse độc lập (không dùng code của build
 * script) — build script có lỗi bóc tách thì chuỗi vẫn đứt ở nấc 3.
 *
 * "Nguyên văn" = giữ đúng hoa/thường và ký tự; chỉ chuẩn hoá khoảng trắng
 * (gộp khoảng trắng liên tiếp, trim) vì văn bản OCR có xuống dòng giữa cụm.
 *
 * Kèm case đối chiếu 8421.39 (issue #309): cụm EN phải phủ được từ vựng của
 * mô tả tiền lệ glovebox (sealed chamber / glove ports / gas purification) và
 * trúng WCO 8421.39/1 + CBP M82907; TCO 1679759 chờ nhánh #306 → TODO, không chặn.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');

let failed = 0;
let checks = 0;
function check(name, cond, detail = '') {
  checks++;
  if (cond) {
    // chỉ in ✓ cho các check tổng; check từng cụm im lặng để đỡ nhiễu
    if (!name.startsWith('  ·')) console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

/** Chuẩn hoá khoảng trắng — KHÔNG đổi hoa/thường, KHÔNG đổi ký tự. */
const ws = (s) => String(s || '').replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------- nguồn
const NGUON_HOP_LE = new Set([
  'data/wco-hs-international.csv',
  'data/sen-2022.json',
  'data/explanatory-notes.json',
  'data/wco-op/opinions.json',
]);

/** Parse CSV tối thiểu (độc lập với build script): trả Map "hscode|level" → {description, section}. */
function parseWcoCsv() {
  const raw = fs.readFileSync(path.join(DATA, 'wco-hs-international.csv'), 'utf8');
  const rows = new Map();
  let lineNo = 0;
  for (const line of raw.split(/\r?\n/)) {
    lineNo++;
    if (!line.trim() || lineNo === 1) continue;
    // tách cột có tôn trọng nháy kép
    const cols = [];
    let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q;
      } else if (ch === ',' && !q) { cols.push(cur); cur = ''; } else cur += ch;
    }
    cols.push(cur);
    const [section, hscode, description, parent, level] = cols;
    rows.set(`${String(hscode).trim()}|${String(level).trim()}`, { section, description, lineNo });
  }
  return rows;
}

function loadOpinions() {
  const j = JSON.parse(fs.readFileSync(path.join(DATA, 'wco-op', 'opinions.json'), 'utf8'));
  const byId = new Map();
  for (const o of (Array.isArray(j) ? j : [])) byId.set(o.id, o);
  return byId;
}

function loadSen() {
  try { return JSON.parse(fs.readFileSync(path.join(DATA, 'sen-2022.json'), 'utf8')); } catch { return null; }
}

function loadExplNotes() {
  try { return JSON.parse(fs.readFileSync(path.join(DATA, 'explanatory-notes.json'), 'utf8')); } catch { return null; }
}

/** Lấy giá trị trường nguồn thật cho 1 cụm — nấc 3 của chuỗi bằng chứng. */
function sourceText(cum, csvRows, opinions, sen, enNotes) {
  const { tap, truong } = cum.nguon;
  if (tap === 'data/wco-hs-international.csv') {
    // tra đúng dòng csv theo mã + level ghi trong nguon
    const row = csvRows.get(`${cum.nguon.ma}|${cum.nguon.level}`);
    if (!row) return null;
    return truong === 'description' ? row.description : null;
  }
  if (tap === 'data/wco-op/opinions.json') {
    const o = opinions.get(cum.nguon.id);
    if (!o || o.headingSuspect) return null; // ngoài cổng mã/thứ tự → không được vào tier 1
    return truong === 'text' ? o.text : null;
  }
  if (tap === 'data/sen-2022.json') {
    if (!sen) return null;
    const m = (sen.muc || []).find((x) => (x.ma || []).includes(cum.nguon.ma));
    if (!m) return null;
    return truong === 'tieuDe' ? m.tieuDe : truong === 'noiDung' ? m.noiDung : null;
  }
  if (tap === 'data/explanatory-notes.json') {
    if (!enNotes) return null;
    const e = enNotes[cum.nguon.ma];
    if (!e) return null;
    return ['noteVi', 'noteEn', 'note'].includes(truong) ? (e[truong] ?? null) : null;
  }
  return null;
}

// ---------------------------------------------------------------- load
console.log('\n== #309 synonyms tier 1: máy kiểm nguyên văn ==');

const synPath = path.join(DATA, 'synonyms.json');
if (!fs.existsSync(synPath)) {
  console.log('  ✗ thiếu data/synonyms.json — chạy scripts/build-synonyms-tier1.mjs trước');
  process.exit(1);
}
let syn;
try {
  syn = JSON.parse(fs.readFileSync(synPath, 'utf8'));
} catch (e) {
  console.log(`  ✗ data/synonyms.json không parse được: ${e.message}`);
  process.exit(1);
}

const csvRows = parseWcoCsv();
const opinions = loadOpinions();
const sen = loadSen();
const enNotes = loadExplNotes();

// ---------------------------------------------------------------- meta
console.log('\n-- meta --');
check('meta.tier === 1', syn.meta?.tier === 1);
check('meta.builtBy trỏ script có thật', !!syn.meta?.builtBy && fs.existsSync(path.join(ROOT, syn.meta.builtBy)), String(syn.meta?.builtBy));
check('meta có banQuyenWco (attribution WCO giữ nguyên trạng)', typeof syn.meta?.banQuyenWco === 'string' && syn.meta.banQuyenWco.includes('Tổ chức Hải quan Thế giới'));
check('muc là object khác rỗng', syn.muc && typeof syn.muc === 'object' && Object.keys(syn.muc).length > 0);

const codes = Object.keys(syn.muc || {});
check('≥ 4000 mã tier 1 (csv có ~6.9k dòng danh pháp)', codes.length >= 4000, `${codes.length} mã`);
check('mã là chữ số, 2–8 ký tự', codes.every((c) => /^\d{2,8}$/.test(c)));

// ---------------------------------------------------------------- từng cụm
console.log('\n-- kiểm nguyên văn từng cụm (chuỗi en ⊆ trich ⊆ nguồn thật) --');
const VI_DIACRITICS = /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i;
let totalCum = 0;
let loiCum = 0;
const loiMau = [];
const nguonCount = {};

for (const ma of codes) {
  const list = syn.muc[ma];
  if (!Array.isArray(list) || list.length === 0) {
    loiCum++; loiMau.push(`${ma}: mục rỗng`);
    continue;
  }
  const seen = new Set();
  for (const cum of list) {
    totalCum++;
    nguonCount[cum.nguon?.tap || '(thiếu)'] = (nguonCount[cum.nguon?.tap || '(thiếu)'] || 0) + 1;
    const loiz = [];
    const en = cum.en;
    if (typeof en !== 'string' || en.trim().length < 3) loiz.push('en quá ngắn/thiếu');
    else {
      const words = en.trim().split(/\s+/).length;
      if (words < 1 || words > 40) loiz.push(`en ${words} từ (giới hạn 1–40)`);
      if (VI_DIACRITICS.test(en)) loiz.push('en chứa dấu tiếng Việt — không phải EN nguyên văn');
    }
    if (cum.phapLy !== true) loiz.push('phapLy !== true');
    if (cum.nhan !== 'NGUYEN_VAN') loiz.push(`nhan !== NGUYEN_VAN (${cum.nhan})`);
    const ng = cum.nguon;
    if (!ng || !NGUON_HOP_LE.has(ng.tap)) loiz.push(`nguon.tap không thuộc 4 mỏ: ${ng?.tap}`);
    else if (typeof ng.truong !== 'string' || !ng.truong) loiz.push('thiếu nguon.truong');
    else if (typeof ng.trich !== 'string' || !ng.trich) loiz.push('thiếu nguon.trich');
    if (!loiz.length) {
      const key = ws(en).toLowerCase();
      if (seen.has(key)) loiz.push('trùng cụm trong cùng mã');
      seen.add(key);
      // nấc 2: en ⊆ trich — nấc 3: trich ⊆ trường nguồn thật (parse độc lập)
      const src = sourceText(cum, csvRows, opinions, sen, enNotes);
      if (src == null) loiz.push(`không tìm thấy nguồn thật (${ng.tap} ${ng.id || ng.ma || ''})`);
      else {
        if (!ws(ng.trich) || !ws(src).includes(ws(ng.trich))) loiz.push('trich KHÔNG nguyên văn trong nguồn');
        else if (!ws(src).includes(ws(en))) loiz.push('en KHÔNG nguyên văn trong trường nguồn');
      }
    }
    if (loiz.length) {
      loiCum++;
      if (loiMau.length < 10) loiMau.push(`${ma} "${String(en).slice(0, 60)}": ${loiz.join('; ')}`);
    }
  }
}

check(`0 cụm vi phạm (tổng ${totalCum} cụm)`, loiCum === 0, `${loiCum} lỗi` + (loiMau.length ? '\n    ' + loiMau.join('\n    ') : ''));
check('tổng cụm ≥ 5000', totalCum >= 5000, `${totalCum}`);
check('mọi cụm đều có nguồn ∈ 4 mỏ (khai đủ trong meta.nguon)',
  Object.keys(nguonCount).every((t) => NGUON_HOP_LE.has(t)) &&
  (syn.meta.nguon || []).every((t) => NGUON_HOP_LE.has(t)));
console.log(`  · phân bố nguồn: ${JSON.stringify(nguonCount)}`);

// ---------------------------------------------------------------- case 8421.39
console.log('\n-- case đối chiếu 8421.39 (glovebox) --');
const cum39 = syn.muc['842139'] || [];
check('có mục 842139', cum39.length > 0);
const all39 = cum39.map((c) => c.en).join(' | ');
check('khái niệm "gas purification": có cụm chứa purif/filter + gas',
  cum39.some((c) => /purif|filter/i.test(c.en) && /gas/i.test(c.en)), all39.slice(0, 120));
check('khái niệm "sealed chamber": cụm WCO 842139/1 mô tả buồng kín xử lý khí (booths)',
  cum39.some((c) => c.nguon?.id === '842139/1' && /booth/i.test(c.en)));
check('WCO 8421.39/1 trúng: có ≥1 cụm trích từ ý kiến 842139/1',
  cum39.some((c) => c.nguon?.id === '842139/1'));

// CBP M82907 (glovebox/workstation) phải có trong precedents.json và chia sẻ
// từ vựng "gas" với cụm tier 1 của 8421.39 — mức khớp máy kiểm được ở nhánh này.
const prec = JSON.parse(fs.readFileSync(path.join(DATA, 'precedents.json'), 'utf8'));
const allPrec = Object.values(prec).flat();
const m82907 = allPrec.find((p) => p.tbTchqNumber === 'M82907');
check('CBP M82907 có trong precedents.json', !!m82907);
if (m82907) {
  const txt = ws(`${m82907.productName || ''} ${m82907.technicalSpec || ''}`);
  check('M82907 nhắc "gas" và cụm 842139 cũng phủ "gas" (giao từ vựng glovebox)',
    /gas/i.test(txt) && /gas/i.test(all39));
}
// TCO 1679759 đang được thêm ở nhánh #306 — chưa có thì để TODO, không chặn.
const tco = allPrec.find((p) => JSON.stringify(p).includes('1679759'));
if (tco) {
  check('TCO 1679759 đã có — đối chiếu cụm 842139 phủ "glove/chamber/purif"',
    cum39.some((c) => /glove|chamber|purif/i.test(c.en)));
} else {
  console.log('  · TODO(#306): TCO 1679759 chưa có trong precedents.json ở nhánh này — bổ sung đối chiếu sau khi #306 merge (không chặn).');
}

// ---------------------------------------------------------------- chuỗi npm test
console.log('\n-- gắn chuỗi --');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
check('test-synonyms.mjs có trong chuỗi npm test', String(pkg.scripts?.test || '').includes('test-synonyms.mjs'));

console.log(`\nKết quả: ${checks - failed}/${checks} check đạt`);
if (failed) {
  console.log(`FAIL ${failed} check`);
  process.exit(1);
}
console.log('PASS synonyms tier 1 — 0 cụm LLM tự chế (mọi cụm nguyên văn trong nguồn)');
