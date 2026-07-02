#!/usr/bin/env node
// Build data/legal-docs.json — index văn bản pháp luật trích từ:
//   1. data/tax-enriched.json (7,928 mã, legalDocs structured từ LLM enrich)
//   2. data/tax.json (regex sweep field `cs` — bắt doc LLM bỏ sót)
// Mỗi doc: type/year/issuer + citedInHsCount + chapters + sections + context flags.
// KHÔNG bịa tiêu đề văn bản — titleVi giữ stub tới khi bổ sung thủ công/nguồn thật.
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tax = JSON.parse(readFileSync(join(root, 'data', 'tax.json'), 'utf8'));
const enriched = JSON.parse(readFileSync(join(root, 'data', 'tax-enriched.json'), 'utf8'));

const DOC_RE = /\d{1,4}\/(?:\d{4}\/)?(?:TT|NĐ|ND|QĐ|QD|CV|TTLT)-[A-ZĐ][A-ZĐ0-9-]*/gi;

const ISSUER_MAP = {
  BCT: 'Bộ Công Thương',
  BYT: 'Bộ Y tế',
  BTC: 'Bộ Tài chính',
  BNNPTNT: 'Bộ Nông nghiệp và PTNT',
  BNNMT: 'Bộ Nông nghiệp và Môi trường',
  BGTVT: 'Bộ Giao thông vận tải',
  BXD: 'Bộ Xây dựng',
  BQP: 'Bộ Quốc phòng',
  BCA: 'Bộ Công an',
  NHNN: 'Ngân hàng Nhà nước',
  BTTTT: 'Bộ Thông tin và Truyền thông',
  BKHCN: 'Bộ Khoa học và Công nghệ',
  BTNMT: 'Bộ Tài nguyên và Môi trường',
  BLDTBXH: 'Bộ Lao động - Thương binh và Xã hội',
  BVHTTDL: 'Bộ Văn hóa, Thể thao và Du lịch',
  BGDDT: 'Bộ Giáo dục và Đào tạo',
  CP: 'Chính phủ',
  TTG: 'Thủ tướng Chính phủ',
  TCHQ: 'Tổng cục Hải quan',
  QH: 'Quốc hội',
};

function normalizeCode(raw) {
  return String(raw || '')
    .toUpperCase()
    .replace(/Đ/g, 'D')
    .trim();
}

function inferType(code) {
  if (code.includes('TTLT-')) return 'Thông tư liên tịch';
  if (/\/TT-/.test(code)) return 'Thông tư';
  if (/\/ND-/.test(code)) return 'Nghị định';
  if (/\/QD-/.test(code)) return 'Quyết định';
  if (/\/CV-/.test(code)) return 'Công văn';
  return 'Văn bản';
}

function inferYear(code, fallback) {
  const m = code.match(/\/(\d{4})\//) || code.match(/-(\d{4})$/) || code.match(/\/(\d{4})$/);
  const y = m ? parseInt(m[1], 10) : null;
  if (y && y >= 1990 && y <= 2030) return y;
  return typeof fallback === 'number' && fallback >= 1990 && fallback <= 2030 ? fallback : null;
}

function inferIssuer(code, fallback) {
  const m = code.match(/(?:TT|ND|QD|CV|TTLT)-([A-Z]+)/);
  const key = m ? m[1] : String(fallback || '').toUpperCase();
  if (ISSUER_MAP[key]) return { issuer: key, issuerFullVi: ISSUER_MAP[key] };
  if (key === 'BNN') return { issuer: 'BNNPTNT', issuerFullVi: ISSUER_MAP.BNNPTNT };
  return { issuer: key || 'UNKNOWN', issuerFullVi: key ? `Cơ quan ${key}` : 'Chưa rà soát' };
}

const byCode = new Map();

function getDoc(code) {
  if (!byCode.has(code)) {
    byCode.set(code, {
      code,
      type: inferType(code),
      year: null,
      issuer: null,
      issuerFullVi: null,
      titleVi: `Văn bản ${code} (cần bổ sung tiêu đề)`,
      url: `https://vbpl.vn/TW/Pages/vbpq-timkiem.aspx?Keyword=${encodeURIComponent(code)}`,
      status: 'ACTIVE',
      domain: new Set(),
      scopeHsChapters: new Set(),
      sections: new Set(),
      citedInHsCount: 0,
      contextCounts: { license: 0, inspection: 0, quarantine: 0, dualUse: 0 },
      severityMax: 'LOW',
      sampleHsCodes: [],
      _issuerVotes: new Map(),
      _yearVotes: new Map(),
    });
  }
  return byCode.get(code);
}

const SEV_RANK = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

function cite(doc, { hsCode, chapter, section, year, issuer, ctx }) {
  doc.citedInHsCount += 1;
  doc.scopeHsChapters.add(chapter);
  if (section) doc.sections.add(String(section).slice(0, 60));
  if (doc.sampleHsCodes.length < 5) doc.sampleHsCodes.push(hsCode);
  if (year) doc._yearVotes.set(year, (doc._yearVotes.get(year) || 0) + 1);
  if (issuer) doc._issuerVotes.set(issuer, (doc._issuerVotes.get(issuer) || 0) + 1);
  if (ctx) {
    if (ctx.requiresLicense) { doc.contextCounts.license += 1; doc.domain.add('GIẤY_PHÉP'); }
    if (ctx.requiresInspection) { doc.contextCounts.inspection += 1; doc.domain.add('KIỂM_TRA_CHẤT_LƯỢNG'); }
    if (ctx.requiresQuarantine) { doc.contextCounts.quarantine += 1; doc.domain.add('KIỂM_DỊCH'); }
    if (ctx.dualUseControl) { doc.contextCounts.dualUse += 1; doc.domain.add('LƯỠNG_DỤNG'); }
    if (SEV_RANK[ctx.severity] > SEV_RANK[doc.severityMax]) doc.severityMax = ctx.severity;
  }
}

let citationsFromEnriched = 0;
let citationsFromRegex = 0;

for (const entry of Object.values(enriched)) {
  const hsCode = entry.hsCode;
  if (!hsCode) continue;
  const chapter = String(hsCode).slice(0, 2);
  const w = entry.warnings || {};
  const ctx = {
    requiresLicense: !!w.requiresLicense,
    requiresInspection: !!w.requiresInspection,
    requiresQuarantine: !!w.requiresQuarantine,
    dualUseControl: !!w.dualUseControl,
    severity: SEV_RANK[w.severity] !== undefined ? w.severity : 'LOW',
  };

  const seenThisRow = new Set();
  for (const ld of w.legalDocs || []) {
    const code = normalizeCode(ld.code);
    if (!code || code.length < 6 || seenThisRow.has(code)) continue;
    seenThisRow.add(code);
    cite(getDoc(code), { hsCode, chapter, section: ld.section, year: ld.year, issuer: ld.issuer, ctx });
    citationsFromEnriched += 1;
  }

  // Regex sweep trên rawText/cs bắt doc LLM bỏ sót (chỉ cộng khi chưa thấy trong row)
  const rawText = String(w.rawText || tax[hsCode]?.cs || '');
  for (const raw of rawText.match(DOC_RE) || []) {
    const code = normalizeCode(raw);
    if (!code || seenThisRow.has(code)) continue;
    seenThisRow.add(code);
    cite(getDoc(code), { hsCode, chapter, section: null, year: null, issuer: null, ctx });
    citationsFromRegex += 1;
  }
}

function majority(votes) {
  let best = null;
  let bestN = 0;
  for (const [k, n] of votes.entries()) {
    if (n > bestN) { best = k; bestN = n; }
  }
  return best;
}

const documents = {};
for (const [code, doc] of [...byCode.entries()].sort((a, b) => b[1].citedInHsCount - a[1].citedInHsCount)) {
  const year = inferYear(code, majority(doc._yearVotes));
  const { issuer, issuerFullVi } = inferIssuer(code, majority(doc._issuerVotes));
  documents[code] = {
    code,
    type: doc.type,
    year,
    issuer,
    issuerFullVi,
    titleVi: doc.titleVi,
    url: doc.url,
    status: doc.status,
    domain: [...doc.domain].sort(),
    scopeHsChapters: [...doc.scopeHsChapters].sort(),
    sections: [...doc.sections].sort().slice(0, 12),
    citedInHsCount: doc.citedInHsCount,
    contextCounts: doc.contextCounts,
    severityMax: doc.severityMax,
    sampleHsCodes: doc.sampleHsCodes,
  };
}

const out = {
  version: new Date().toISOString().slice(0, 10),
  extractedFrom: 'data/tax-enriched.json (LLM legalDocs) + data/tax.json cs (regex sweep)',
  total: Object.keys(documents).length,
  citations: { fromEnriched: citationsFromEnriched, fromRegexSweep: citationsFromRegex },
  documents,
};

const outPath = join(root, 'data', 'legal-docs.json');
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`Wrote ${out.total} legal docs → ${outPath}`);
console.log(`Citations: ${citationsFromEnriched} từ enriched + ${citationsFromRegex} từ regex sweep`);
const top = Object.values(documents).slice(0, 10);
console.log('\nTop 10 văn bản được trích dẫn nhiều nhất:');
for (const d of top) {
  console.log(`  ${d.citedInHsCount}× ${d.code} [${d.type}, ${d.issuer}] ch:${d.scopeHsChapters.length} sev:${d.severityMax}`);
}
