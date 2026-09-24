// lib/confusion-pairs.js — "Từ điển mâu thuẫn HS": mặt hàng doanh nghiệp hay khai
// mã A nhưng Hải quan hay ấn định mã B, kèm TIÊU CHÍ PHÂN BIỆT.
//
// Nguồn: CEO soạn với Grok (Drive "MASTER_Tu_Dien_Mau_Thuan_HS_System", 50 mục
// MT-001…050 + 150 cặp theo nhóm ngành), nhập vào data/confusion-pairs.json bằng
// scripts/build-confusion-pairs.mjs. Mọi mục `verified:false` cho tới khi CEO duyệt.
//
// Khác gì conflicts.json? conflicts.json đứng ở MÃ 8 số ("mã này hay nhầm với
// mã kia"). Từ điển này đứng ở MẶT HÀNG: nhận diện qua tên gọi trong câu hỏi,
// rồi nói "hàng này hay bị ấn định về đâu, và câu hỏi nào phân định". Đúng tinh
// thần "hiểu bản chất hàng trước, luật sau" (docs/huong-dan-agent-mo-rong-tu-dien.md §3.5).
//
// Không nơi nào ở đây gắn nhãn GIR — trường girRule chỉ là trích dẫn của nguồn,
// đi ra ngoài dưới tên `girRuleVi` (chuỗi hiển thị), không phải determination.
const path = require('path');
const fs = require('fs');
const { precedentsData } = require('./data');

let cache = null;

function fold(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** "8412.31.xx" / "8412.31" / "8412" → chuỗi số để so tiền tố ("841231"). */
function hsDigits(code) {
  return String(code || '').replace(/[^0-9]/g, '');
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function load() {
  if (cache) return cache;
  const p = path.join(__dirname, '..', 'data', 'confusion-pairs.json');
  let doc = { version: null, entries: [] };
  if (fs.existsSync(p)) {
    try {
      doc = JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch {
      doc = { version: null, entries: [] };
    }
  }
  const entries = (doc.entries || []).map((e) => {
    const aliases = [...new Set((e.aliases || []).map(fold).filter((a) => a.length >= 3))].sort((a, b) => b.length - a.length);
    return {
      ...e,
      _aliases: aliases.map((a) => ({ text: a, re: new RegExp(`(^|[^a-z0-9])${escapeRe(a)}([^a-z0-9]|$)`) })),
      _correct: (e.correctHs || []).map(hsDigits).filter(Boolean),
      _declared: (e.declaredHs || []).map(hsDigits).filter(Boolean),
    };
  });
  const byId = new Map(entries.map((e) => [e.id, e]));
  cache = { version: doc.version || null, entries, byId, meta: { noteVi: doc.noteVi, sources: doc.sources, groups: doc.groups } };
  return cache;
}

/** Tiền lệ TB-TCHQ trong kho khớp số hiệu của sourceRefs (tối đa 3). */
function precedentsFor(entry) {
  const refs = (entry.sourceRefs || []).map((r) => String(r.reference || '').replace(/\s+/g, '').toUpperCase()).filter(Boolean);
  if (!refs.length) return [];
  const out = [];
  for (const [hs, list] of Object.entries(precedentsData || {})) {
    for (const p of Array.isArray(list) ? list : []) {
      const num = String(p.tbTchqNumber || '').replace(/\s+/g, '').toUpperCase();
      if (num && refs.includes(num)) out.push({ hsCode: hs, tbTchqNumber: p.tbTchqNumber, productName: p.productName, year: p.year });
      if (out.length >= 3) return out;
    }
  }
  return out;
}

function publicView(entry, extra = {}) {
  return {
    id: entry.id,
    group: entry.group,
    nameVi: entry.nameVi,
    nameEn: entry.nameEn,
    chapters: entry.chapters,
    correctHs: entry.correctHs,
    declaredHs: entry.declaredHs,
    essenceTestVi: entry.essenceTestVi,
    rules: entry.rules || [],
    whyMisdeclaredVi: entry.whyMisdeclaredVi,
    warningVi: entry.warningVi,
    girRuleVi: entry.girRule || null,
    legalBasisVi: entry.legalBasisVi,
    sourceRefs: entry.sourceRefs || [],
    precedents: precedentsFor(entry),
    relatedIds: entry.relatedIds || [],
    verified: Boolean(entry.verified),
    ...(entry.needsReview ? { needsReview: true, reviewNoteVi: entry.reviewNoteVi } : {}),
    ...(entry.oldTariff ? { oldTariff: true, oldTariffCodes: entry.oldTariffCodes } : {}),
    origin: entry.origin,
    ...extra,
  };
}

/** Các mục có alias xuất hiện trong câu (đủ ranh giới từ, bỏ dấu). */
function matchByText(text) {
  const q = fold(text);
  if (!q) return [];
  const hits = [];
  for (const e of load().entries) {
    const alias = e._aliases.find((a) => a.re.test(q));
    if (alias) hits.push({ entry: e, matchedAlias: alias.text });
  }
  return hits;
}

/** Các mục có mã (đúng hoặc hay khai) là tiền tố của hs. `side` = 'correct' | 'declared'. */
function matchByHs(hs, { minPrefix = 4 } = {}) {
  const d = hsDigits(hs);
  if (d.length < 4) return [];
  const hits = [];
  for (const e of load().entries) {
    const c = e._correct.find((p) => p.length >= minPrefix && d.startsWith(p));
    const w = e._declared.find((p) => p.length >= minPrefix && d.startsWith(p));
    if (c || w) hits.push({ entry: e, side: c ? 'correct' : 'declared', prefix: c || w });
  }
  return hits;
}

/**
 * Cảnh báo cho một câu hỏi + danh sách ứng viên (mã 8 số theo thứ tự xếp hạng).
 *
 * Mức:
 *  - HIGH : tên hàng khớp mục VÀ ứng viên đầu rơi vào mã DN hay khai sai → đúng
 *           chỗ Hải quan hay ấn định lại. Đưa tiêu chí phân biệt để người khai
 *           tự kiểm trước.
 *  - CHECK: tên hàng khớp mục, ứng viên đầu nằm trong mã Hải quan hay ấn định
 *           (hoặc chưa có ứng viên) — vẫn nên đối chiếu tiêu chí.
 *  - INFO : tên hàng không khớp, nhưng ứng viên đầu trùng mã DN hay khai sai của
 *           một mục (tiền tố ≥ 6 số). Chỉ nhắc, tối đa 3 mục.
 */
function confusionAlertsFor(text, candidateHs = [], { maxInfo = 3 } = {}) {
  const cands = (Array.isArray(candidateHs) ? candidateHs : [candidateHs]).map(hsDigits).filter((d) => d.length >= 4);
  const top = cands[0] || null;
  const alerts = [];
  const seen = new Set();
  // Cùng một mặt hàng có thể có mục MT (báo cáo chi tiết) lẫn mục nhóm ngành (DEEP):
  // gộp theo NHÓM 4 số của mã đúng đầu tiên, giữ mục giàu hơn, các mục còn lại vào alsoIds.
  const richness = (e) => (e.origin === 'grok-mt' ? 100 : 0) + (e.rules || []).length * 3 + (e.sourceRefs || []).length * 5 + (e.essenceTestVi ? 2 : 0);
  const groups = new Map();
  for (const hit of matchByText(text)) {
    seen.add(hit.entry.id);
    const key = (hit.entry._correct[0] || hit.entry.id).slice(0, 4);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(hit);
  }
  for (const hits of groups.values()) {
    hits.sort((a, b) => richness(b.entry) - richness(a.entry));
    const { entry, matchedAlias } = hits[0];
    const inDeclared = top ? entry._declared.some((p) => top.startsWith(p)) : false;
    const inCorrect = top ? entry._correct.some((p) => top.startsWith(p)) : false;
    const severity = inDeclared && !inCorrect ? 'HIGH' : 'CHECK';
    const alsoIds = hits.slice(1).map((h) => h.entry.id);
    alerts.push(publicView(entry, { severity, matchedBy: 'text', matchedAlias, candidateHs: top, candidateInDeclared: inDeclared, candidateInCorrect: inCorrect, ...(alsoIds.length ? { alsoIds } : {}) }));
  }
  if (top) {
    let n = 0;
    for (const { entry, side, prefix } of matchByHs(top, { minPrefix: 6 })) {
      if (seen.has(entry.id) || side !== 'declared') continue;
      if (n >= maxInfo) break;
      n += 1;
      alerts.push(publicView(entry, { severity: 'INFO', matchedBy: 'hs', matchedPrefix: prefix, candidateHs: top, candidateInDeclared: true, candidateInCorrect: false }));
    }
  }
  const order = { HIGH: 0, CHECK: 1, INFO: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}

function getEntry(id) {
  const e = load().byId.get(String(id || '').toUpperCase());
  return e ? publicView(e) : null;
}

function listEntries() {
  return load().entries.map((e) => ({ id: e.id, group: e.group, nameVi: e.nameVi, correctHs: e.correctHs, declaredHs: e.declaredHs, verified: Boolean(e.verified) }));
}

function stats() {
  const { entries, version } = load();
  const byGroup = {};
  for (const e of entries) byGroup[e.group || 'khac'] = (byGroup[e.group || 'khac'] || 0) + 1;
  return { version, total: entries.length, verified: entries.filter((e) => e.verified).length, byGroup };
}

function _reset() {
  cache = null;
}

module.exports = { fold, hsDigits, matchByText, matchByHs, confusionAlertsFor, getEntry, listEntries, stats, _reset };
