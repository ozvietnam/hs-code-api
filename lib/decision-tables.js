/**
 * Bảng quyết định theo NHÓM 4 số (data/decision-tables/<nhóm>.json).
 *
 * VÌ SAO CÓ TẦNG NÀY (CEO chốt 2026-09-17):
 * Tên gọi / chức năng / công dụng chỉ đưa hàng tới NHÓM 4 số (GIR 1). Từ 6
 * xuống 8 số, biểu thuế không tách theo tên nữa mà theo THUỘC TÍNH khách quan:
 * Ø cửa nạp, chiều dày, hàm lượng carbon, dung tích xi-lanh, tự hành hay không.
 * Không ai gõ tên hàng khác nhau cho 84818021 và 84818022. Ép từ điển tên phủ
 * tới từng lá là bắt công cụ sai làm việc sai (7 nhóm đầu: 106 dòng chép tên
 * biểu thuế, mục 16 mã điểm bằng nhau). Tầng này thay việc đó bằng bảng:
 * thuộc tính nào tách nhóm, giá trị nào về lá nào, thiếu dữ kiện nào thì HỎI.
 *
 * KHÁC data/conflict-tables.json: bảng đó gỡ CỤM mã dễ nhầm giữa các nhóm/chương
 * (dệt kim vs dệt thoi). Bảng ở đây phân giải TRONG một nhóm tới lá 8 số, và
 * mọi lá của nhóm phải có đường tới (test khoá).
 *
 * CÁCH ĐÁNH GIÁ (không phải "luật đầu tiên khớp"):
 *   - Một luật là KHẢ DĨ khi không điều kiện nào bị dữ kiện đã biết bác bỏ.
 *   - Một luật là KHỚP khi mọi điều kiện được dữ kiện đã biết thoả.
 *   - Lấy luật khả dĩ có priority cao nhất. Nó khớp → RESOLVED. Nó chưa khớp
 *     (còn thiếu dữ kiện) → INSUFFICIENT + hỏi đúng dữ kiện đó. Nhờ vậy luật
 *     "Loại khác" (when rỗng, priority thấp) không bao giờ thắng chỉ vì người
 *     dùng chưa nói gì — thứ mà "luật đầu tiên khớp" làm sai.
 *
 * GIR: quyết định trong nhóm là GIR 6 (mutatis mutandis cho dòng 8 số quốc
 * gia). Trích dẫn đi qua lib/gir.js; bảng chưa `verified` chỉ được HEURISTIC.
 */
const fs = require('fs');
const path = require('path');
const { dataReadPath } = require('./data-paths');

const DIR = 'decision-tables';
const cache = new Map();
let listCache = null;

function removeDiacritics(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}
function hasDiacritics(s) {
  const t = String(s || '');
  return /[̀-ͯ]/.test(t.normalize('NFD')) || /[đĐ]/.test(t);
}
/** Hạ chữ, thay ký tự lạ bằng khoảng trắng; giữ dấu nếu keep=true. */
function tidy(s, keep) {
  const base = keep ? String(s || '').normalize('NFC') : removeDiacritics(s);
  return ` ${base.toLowerCase().replace(/[^\p{L}\p{N}.,]/gu, ' ').replace(/\s+/g, ' ').trim()} `;
}

let registryCache = null;
function registry() {
  if (registryCache) return registryCache;
  try {
    registryCache = JSON.parse(fs.readFileSync(dataReadPath('attributes.json'), 'utf8')).attributes || {};
  } catch {
    registryCache = {};
  }
  return registryCache;
}

/** Nạp bảng của một nhóm; không có thì null. Có cache theo tiến trình. */
function loadTable(heading) {
  const h = String(heading || '').slice(0, 4);
  if (!/^\d{4}$/.test(h)) return null;
  if (cache.has(h)) return cache.get(h);
  let table = null;
  try {
    const file = dataReadPath(path.join(DIR, `${h}.json`));
    if (fs.existsSync(file)) table = normalizeTable(JSON.parse(fs.readFileSync(file, 'utf8')));
  } catch {
    table = null;
  }
  cache.set(h, table);
  return table;
}

function listTables() {
  if (listCache) return listCache;
  try {
    const dir = dataReadPath(DIR);
    listCache = fs.existsSync(dir)
      ? fs.readdirSync(dir).filter((f) => /^\d{4}\.json$/.test(f)).map((f) => f.slice(0, 4)).sort()
      : [];
  } catch {
    listCache = [];
  }
  return listCache;
}

/** Điền thiếu từ registry thuộc tính dùng chung, chuẩn hoá detect trước một lần. */
function normalizeTable(raw) {
  const reg = registry();
  const inputs = (raw.inputs || []).map((inp) => {
    const def = reg[inp.attribute] || {};
    const type = inp.type || (Array.isArray(inp.domain || def.domain) ? 'enum' : 'number');
    const domain = inp.domain || def.domain || null;
    const detect = {};
    for (const [value, phrases] of Object.entries(inp.detect || {})) {
      detect[value] = (phrases || []).map((p) => ({
        raw: p,
        dia: hasDiacritics(p),
        key: tidy(p, hasDiacritics(p)).trim(), // đúng dấu (nếu cụm có dấu)
        folded: tidy(p, false).trim(), // bỏ dấu — cho câu gõ không dấu
      }));
    }
    return {
      ...inp,
      type,
      domain,
      labelVi: inp.labelVi || def.labelVi || inp.attribute,
      questionVi: inp.questionVi || def.questionVi || `${inp.labelVi || def.labelVi || inp.attribute}?`,
      _detect: detect,
    };
  });
  return { ...raw, inputs, rules: raw.rules || [], hitPolicy: raw.hitPolicy || 'PRIORITY' };
}

/* ---------------- dữ kiện ---------------- */

const LENGTH_MM = { mm: 1, ly: 1, cm: 10, m: 1000, inch: 25.4, in: 25.4 };
const WEIGHT_KG = { kg: 1, g: 0.001, gram: 0.001, 'tấn': 1000, tan: 1000, ton: 1000 };
const POWER_W = { w: 1, kw: 1000, hp: 745.7 };
const VOLUME_L = { l: 1, lit: 1, ml: 0.001, 'lít': 1, m3: 1000 };

/** Đổi giá trị về đơn vị bảng yêu cầu; không đổi được thì null. */
function convert(value, fromUnit, toUnit) {
  const f = String(fromUnit || '').toLowerCase();
  const t = String(toUnit || '').toLowerCase();
  if (!t || f === t) return value;
  for (const tbl of [LENGTH_MM, WEIGHT_KG, POWER_W, VOLUME_L]) {
    if (tbl[f] != null && tbl[t] != null) return (value * tbl[f]) / tbl[t];
  }
  return null;
}

function toNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const n = Number(String(v ?? '').replace(',', '.').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) && String(v).trim() !== '' ? n : null;
}

/* ---------- trả lời của người dùng cho câu hỏi enum ---------- */

// Mô hình yếu / người dùng trả lời "có", "không", "1", "thang máy chở người"…
// chứ không gõ đúng mã nội bộ "yes"/"passenger". Trước đây mọi giá trị ngoài
// domain bị BỎ IM LẶNG → hệ thống hỏi lại đúng câu cũ, vòng hỏi không dứt.
const YES_WORDS = new Set(['yes', 'y', 'co', 'dung', 'phai', 'true', 'roi', 'x']);
const NO_WORDS = new Set(['no', 'n', 'khong', 'ko', 'k', 'false', 'sai', 'chua']);

/** Nhãn tiếng Việt cho từng giá trị enum — để hỏi và để khớp câu trả lời. */
function optionsViOf(inp) {
  if (!Array.isArray(inp.domain)) return null;
  return inp.domain.map((value, i) => {
    const phrases = (inp._detect?.[value] || []).map((p) => p.raw);
    const label = inp.optionsVi?.[value]
      || (value === 'yes' ? 'Có' : value === 'no' ? 'Không' : null)
      || phrases.find((p) => hasDiacritics(p))
      || phrases[0]
      || value;
    return { index: i + 1, value, labelVi: label };
  });
}

/**
 * Quy đổi câu trả lời tự do về một giá trị trong domain; không được thì null.
 * Thứ tự: đúng mã → có/không → số thứ tự lựa chọn → nhãn → cụm detect.
 */
function coerceEnumFact(inp, answer) {
  const domain = inp.domain;
  if (!Array.isArray(domain)) return String(answer).trim();
  const v = String(answer ?? '').trim();
  if (!v) return null;
  const exact = domain.find((d) => d.toLowerCase() === v.toLowerCase());
  if (exact) return exact;
  const folded = tidy(v, false).trim();
  if (domain.includes('yes') && domain.includes('no')) {
    const first = folded.split(' ')[0];
    if (YES_WORDS.has(folded) || YES_WORDS.has(first)) return 'yes';
    if (NO_WORDS.has(folded) || NO_WORDS.has(first)) return 'no';
  }
  if (/^\d+$/.test(v)) {
    const i = Number(v);
    if (i >= 1 && i <= domain.length) return domain[i - 1];
  }
  const byLabel = (optionsViOf(inp) || []).find((o) => tidy(o.labelVi, false).trim() === folded);
  if (byLabel) return byLabel.value;
  const raw = tidy(v, true);
  const fold = tidy(v, false);
  // Câu trả lời không dấu ("cho nguoi") khớp bản bỏ dấu của cụm — cùng quy tắc với extractFacts.
  const answerHasDia = hasDiacritics(v);
  const hits = [];
  for (const [value, phrases] of Object.entries(inp._detect || {})) {
    if (phrases.some((p) => (answerHasDia
      ? (p.dia ? raw : fold).includes(` ${p.key} `)
      : fold.includes(` ${p.folded ?? p.key} `)))) hits.push(value);
  }
  return hits.length === 1 ? hits[0] : null;
}

/**
 * Gom dữ kiện cho một bảng từ ba nguồn, ưu tiên: facts tường minh (ERP/người
 * dùng) > cụm dò trong câu > thông số parser bóc được.
 */
function extractFacts(table, { text = '', parsed = null, facts = {} } = {}) {
  const out = {};
  const source = {};
  const rejected = [];
  const raw = tidy(text, true);
  const folded = tidy(text, false);
  // Câu CÓ dấu: cụm có dấu phải khớp đúng dấu, cụm không dấu khớp bản bỏ dấu.
  // Câu KHÔNG dấu (tờ khai Oz, người gõ vội): mọi cụm khớp bản bỏ dấu — nếu
  // không, "xi lanh khi nen" không bao giờ gặp "xi lanh khí nén" trong bảng.
  const queryHasDiacritics = hasDiacritics(text);
  const hit = (p) => (queryHasDiacritics ? (p.dia ? raw : folded).includes(` ${p.key} `) : folded.includes(` ${p.folded} `));

  for (const inp of table.inputs) {
    const a = inp.attribute;
    // 1. tường minh
    if (facts && facts[a] != null && String(facts[a]).trim() !== '') {
      if (inp.type === 'number') {
        const n = toNumber(facts[a]);
        if (n != null) {
          out[a] = n;
          source[a] = 'explicit';
          continue;
        }
        rejected.push({ attribute: a, value: facts[a], reason: 'NOT_A_NUMBER', ...(inp.unit ? { unit: inp.unit } : {}) });
      } else {
        const v = coerceEnumFact(inp, facts[a]);
        if (v != null) {
          out[a] = v;
          source[a] = 'explicit';
          continue;
        }
        rejected.push({ attribute: a, value: facts[a], reason: 'NOT_IN_OPTIONS', optionsVi: optionsViOf(inp) });
      }
    }
    // 2. dò cụm trong câu (enum)
    if (inp.type === 'enum') {
      // Mỗi giá trị ghi độ dài cụm dài nhất đã khớp. "vòng bi côn" khớp cả
      // ball ("vòng bi") lẫn taperedRoller ("vòng bi côn"): cụm dài hơn là cụ
      // thể hơn → thắng. Chỉ khi hai giá trị khớp cụm dài bằng nhau mới là
      // mâu thuẫn thật (hoặc dùng preferOnConflict).
      const best = [];
      for (const [value, phrases] of Object.entries(inp._detect || {})) {
        let len = 0;
        for (const p of phrases) if (hit(p)) len = Math.max(len, (queryHasDiacritics ? p.key : p.folded).length);
        if (len) best.push({ value, len });
      }
      best.sort((x, y) => y.len - x.len);
      // preferOnConflict đi trước cả luật cụm dài: "bộ phớt xi lanh thủy lực" là
      // BỘ PHẬN dù cụm "xi lanh thủy lực" dài hơn "phớt".
      if (best.length > 1 && inp.preferOnConflict && best.some((b) => b.value === inp.preferOnConflict)) {
        out[a] = inp.preferOnConflict;
        source[a] = 'detect';
        continue;
      }
      const hits = best.filter((b) => b.len === best[0]?.len).map((b) => b.value);
      if (hits.length === 1) {
        out[a] = hits[0];
        source[a] = 'detect';
        continue;
      }
      // Hai giá trị khớp cụm dài bằng nhau → mâu thuẫn thật → hỏi.
    }
    // 3. thông số parser
    if (inp.type === 'number' && inp.fromSpec && parsed?.specs?.length) {
      const spec = parsed.specs.find((s) => s.dimension === inp.fromSpec);
      if (spec) {
        const v = convert(spec.value, spec.unit, inp.unit);
        if (v != null) {
          out[a] = v;
          source[a] = 'spec';
          continue;
        }
      }
    }
    // 4. giả định khi bảng cho phép (nhánh hiếm: "chưa gia công thêm")
    if (inp.assumeIfUnknown != null) {
      out[a] = inp.assumeIfUnknown;
      source[a] = 'assumed';
    }
  }
  return { facts: out, source, rejected };
}

/* ---------------- đánh giá ---------------- */

function condState(cond, value) {
  if (value === undefined) return 'unknown';
  if (cond && typeof cond === 'object') {
    const n = toNumber(value);
    if (n == null) return 'unknown';
    if (cond.gte != null && !(n >= cond.gte)) return 'fail';
    if (cond.gt != null && !(n > cond.gt)) return 'fail';
    if (cond.lte != null && !(n <= cond.lte)) return 'fail';
    if (cond.lt != null && !(n < cond.lt)) return 'fail';
    if (cond.eq != null && !(n === cond.eq)) return 'fail';
    if (Array.isArray(cond.in) && !cond.in.includes(value)) return 'fail';
    return 'ok';
  }
  return String(value) === String(cond) ? 'ok' : 'fail';
}

function ruleState(rule, facts) {
  let unknown = [];
  for (const [attr, cond] of Object.entries(rule.when || {})) {
    const st = condState(cond, facts[attr]);
    if (st === 'fail') return { state: 'impossible', unknown: [] };
    if (st === 'unknown') unknown.push(attr);
  }
  return unknown.length ? { state: 'possible', unknown } : { state: 'matched', unknown: [] };
}

/**
 * Phân giải một nhóm tới lá.
 * @returns {{status:'NO_TABLE'|'RESOLVED'|'INSUFFICIENT'|'NARROWED', ...}}
 */
function resolveHeading(heading, input = {}) {
  const table = loadTable(heading);
  if (!table) return { status: 'NO_TABLE', heading: String(heading).slice(0, 4) };
  const { facts, source, rejected } = extractFacts(table, input);

  const states = table.rules.map((r) => ({ rule: r, ...ruleState(r, facts) }));
  const alive = states.filter((s) => s.state !== 'impossible');
  const base = {
    heading: table.heading,
    titleVi: table.titleVi || null,
    essenceTestVi: table.essenceTestVi || null,
    tableVerified: table.verified === true,
    factsUsed: facts,
    factSources: source,
    // Câu trả lời không quy đổi được — trả lại kèm lựa chọn hợp lệ để hỏi lại đúng.
    rejectedFacts: rejected,
  };
  if (!alive.length) {
    return { ...base, status: 'NARROWED', narrowed: [], missingFacts: [], trace: [] };
  }
  const topPriority = Math.max(...alive.map((s) => s.rule.priority || 0));
  const top = alive.filter((s) => (s.rule.priority || 0) === topPriority);
  const matchedTop = top.find((s) => s.state === 'matched');

  if (matchedTop && top.every((s) => s.state === 'matched' || s.rule.hs === matchedTop.rule.hs)) {
    const r = matchedTop.rule;
    return {
      ...base,
      status: 'RESOLVED',
      hs: r.hs,
      ruleId: r.id,
      gir: r.gir || 'GIR 6',
      reasonVi: r.reasonVi || null,
      source: r.source || table.sourceVi || null,
      narrowed: [...new Set(alive.map((s) => s.rule.hs))],
      missingFacts: [],
      trace: [{ ruleId: r.id, when: r.when, hs: r.hs, reasonVi: r.reasonVi, source: r.source || table.sourceVi || null }],
    };
  }

  // Còn luật ưu tiên cao chưa khớp vì thiếu dữ kiện → hỏi đúng những dữ kiện đó.
  const need = new Set();
  for (const s of alive) if (s.state === 'possible') for (const a of s.unknown) need.add(a);
  const missingFacts = table.inputs
    .filter((inp) => need.has(inp.attribute))
    .map((inp) => ({
      attribute: inp.attribute,
      labelVi: inp.labelVi,
      questionVi: inp.questionVi,
      type: inp.type,
      ...(inp.unit ? { unit: inp.unit } : {}),
      ...(inp.domain ? { domain: inp.domain, optionsVi: optionsViOf(inp) } : {}),
    }));
  return {
    ...base,
    status: missingFacts.length ? 'INSUFFICIENT' : 'NARROWED',
    narrowed: [...new Set(alive.map((s) => s.rule.hs))],
    missingFacts,
    // Hỏi TỪNG câu theo thứ tự khai báo trong bảng — câu đầu thường là câu gạn
    // nhánh (nguyên chiếc hay bộ phận?), trả lời xong các câu sau tự rụng.
    askNextVi: missingFacts[0]?.questionVi || null,
    trace: [],
  };
}

/** Kết quả bảng → hình dạng `resolver` mà lib/gir.js đã hiểu (RULE_TABLE chỉ khi verified). */
function toResolverShape(decision) {
  if (!decision || decision.status !== 'RESOLVED') return null;
  return {
    status: 'RESOLVED',
    group: `heading:${decision.heading}`,
    decidedHs: decision.hs,
    gir: decision.gir,
    reasonVi: decision.reasonVi,
    tableVerified: decision.tableVerified,
    trace: [{ ruleId: decision.ruleId, source: decision.source || `data/decision-tables/${decision.heading}.json` }],
  };
}

/** Mọi lá của nhóm có đường tới chưa? Dùng cho test và dict:check. */
function tableCoverage(heading, taxData) {
  const h = String(heading).slice(0, 4);
  const table = loadTable(h);
  const leaves = Object.keys(taxData).filter((k) => /^\d{8}$/.test(k) && k.startsWith(h)).sort();
  if (!table) return { heading: h, hasTable: false, leaves, covered: [], missingHs: leaves, badHs: [] };
  const targets = new Set(table.rules.map((r) => r.hs));
  const covered = leaves.filter((hs) => targets.has(hs));
  const badHs = [...targets].filter((hs) => !leaves.includes(hs));
  return { heading: h, hasTable: true, leaves, covered, missingHs: leaves.filter((hs) => !targets.has(hs)), badHs };
}

/**
 * CỬA NGHIỆM THU BẰNG DỮ LIỆU THẬT (2026-09-18).
 *
 * Bài học: 26 bảng đầu tiên qua mọi test tự viết (ca "kiểm r-x" + facts) mà
 * đem 305 tên hàng thật trong tờ khai Oz vào thì chốt được 3. Bảng chép cấu
 * trúc biểu thuế thì đúng, nhưng không NHẬN RA hàng — vô dụng với người khai.
 *
 * Chế độ "oz": nhóm có ≥ 3 cụm tờ khai Oz (count ≥ 2) → bảng phải CHỐT được
 *   ≥ 50 % cụm, và không được chốt lệch tiền lệ tập trung (share ≥ 0,8, ≥ 3
 *   tờ khai). Cụm là tên hàng người khai gõ thật, không ai sửa được để qua.
 * Chế độ "text": nhóm Oz không có tờ khai → ca kiểm CHỈ BẰNG CÂU CHỮ (không
 *   facts) phải chốt đúng ≥ 60 % số lá. Ca có facts không tính — facts là
 *   thứ bảng tự nói với chính nó.
 */
function acceptanceGate(heading, { aliases = [], cases = [], taxData, parse = null } = {}) {
  const h = String(heading).slice(0, 4);
  const leaves = Object.keys(taxData || {}).filter((k) => /^\d{8}$/.test(k) && k.startsWith(h));
  const parsed = (text) => (parse ? parse(text) : null);
  const phrases = aliases.filter((a) => String(a.hsCode || '').startsWith(h) && (a.count || 0) >= 2);
  if (phrases.length >= 3) {
    let resolved = 0;
    const disagree = [];
    const unresolved = [];
    for (const a of phrases) {
      const r = resolveHeading(h, { text: a.phrase, parsed: parsed(a.phrase) });
      if (r.status === 'RESOLVED') {
        resolved++;
        if (r.hs !== a.hsCode && (a.share || 0) >= 0.8 && (a.count || 0) >= 3) disagree.push({ phrase: a.phrase, table: r.hs, oz: a.hsCode, count: a.count });
      } else unresolved.push({ phrase: a.phrase, count: a.count, ask: (r.missingFacts || []).map((m) => m.attribute) });
    }
    const ratio = resolved / phrases.length;
    return { heading: h, mode: 'oz', n: phrases.length, resolved, ratio, disagree, unresolved: unresolved.sort((x, y) => y.count - x.count), pass: ratio >= 0.5 && disagree.length === 0, thresholdVi: 'chốt ≥ 50 % cụm tờ khai Oz, không lệch tiền lệ tập trung' };
  }
  const textCases = cases.filter((c) => c.heading === h && c.expectHs && String(c.text || '').trim() && !(c.facts && Object.keys(c.facts).length));
  const hit = new Set();
  const wrong = [];
  for (const c of textCases) {
    const r = resolveHeading(h, { text: c.text, parsed: parsed(c.text) });
    if (r.status === 'RESOLVED' && r.hs === c.expectHs) hit.add(c.expectHs);
    else wrong.push({ id: c.id, text: c.text, got: r.status === 'RESOLVED' ? r.hs : r.status });
  }
  const ratio = leaves.length ? hit.size / leaves.length : 0;
  return { heading: h, mode: 'text', n: textCases.length, leaves: leaves.length, resolved: hit.size, ratio, wrong, missingLeaves: leaves.filter((l) => !hit.has(l)), pass: ratio >= 0.6, thresholdVi: 'ca chỉ bằng câu chữ (không facts) chốt đúng ≥ 60 % số lá' };
}

/** Kiểm cấu trúc một bảng; trả danh sách lỗi (rỗng = hợp lệ). */
function validateTable(table, taxData) {
  const errors = [];
  if (!/^\d{4}$/.test(String(table.heading || ''))) errors.push('heading phải là 4 số');
  if (!table.essenceTestVi) errors.push('thiếu essenceTestVi');
  if (!table.sourceVi) errors.push('thiếu sourceVi');
  if (typeof table.verified !== 'boolean') errors.push('verified phải là true/false');
  const inputs = new Map((table.inputs || []).map((i) => [i.attribute, i]));
  for (const inp of table.inputs || []) {
    if (!inp.questionVi) errors.push(`input ${inp.attribute}: thiếu questionVi`);
    if (inp.type === 'enum' && (!Array.isArray(inp.domain) || inp.domain.length < 2)) errors.push(`input ${inp.attribute}: enum cần domain ≥ 2 giá trị`);
    if (inp.type === 'number' && !inp.unit && inp.fromSpec) errors.push(`input ${inp.attribute}: number lấy từ spec cần unit`);
    if (inp.assumeIfUnknown != null && inp.domain && !inp.domain.includes(inp.assumeIfUnknown)) errors.push(`input ${inp.attribute}: assumeIfUnknown ngoài domain`);
  }
  const ids = new Set();
  for (const r of table.rules || []) {
    if (!r.id) errors.push('luật thiếu id');
    if (ids.has(r.id)) errors.push(`luật ${r.id}: id trùng`);
    ids.add(r.id);
    if (!/^\d{8}$/.test(String(r.hs || ''))) errors.push(`luật ${r.id}: hs phải 8 số`);
    else if (taxData && !taxData[r.hs]) errors.push(`luật ${r.id}: mã ${r.hs} không có trong biểu thuế`);
    else if (!String(r.hs).startsWith(String(table.heading))) errors.push(`luật ${r.id}: mã ${r.hs} ngoài nhóm`);
    if (!r.reasonVi) errors.push(`luật ${r.id}: thiếu reasonVi`);
    for (const [attr, cond] of Object.entries(r.when || {})) {
      const inp = inputs.get(attr);
      if (!inp) {
        errors.push(`luật ${r.id}: điều kiện trên thuộc tính chưa khai báo "${attr}"`);
        continue;
      }
      if (inp.type === 'enum' && typeof cond === 'string' && inp.domain && !inp.domain.includes(cond)) errors.push(`luật ${r.id}: "${attr}=${cond}" ngoài domain`);
      if (inp.type === 'number' && (typeof cond !== 'object' || cond === null)) errors.push(`luật ${r.id}: thuộc tính số "${attr}" cần điều kiện {gte|gt|lte|lt|eq}`);
    }
  }
  return errors;
}

/** Reset cache — dùng trong test khi đổi HS_DATA_DIR. */
function _reset() {
  cache.clear();
  listCache = null;
  registryCache = null;
}

module.exports = { coerceEnumFact, optionsViOf, loadTable, listTables, resolveHeading, extractFacts, toResolverShape, tableCoverage, validateTable, acceptanceGate, _reset };
