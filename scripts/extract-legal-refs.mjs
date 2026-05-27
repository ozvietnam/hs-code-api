#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tax = JSON.parse(readFileSync(join(root, 'data', 'tax.json'), 'utf8'));

const DOC_RE = /\d{1,4}\/\d{4}\/(TT|NĐ|ND|QĐ|QD|CV)-[A-ZĐ]+/gi;
const ISSUER_MAP = {
  BCT: 'Bộ Công Thương',
  BYT: 'Bộ Y tế',
  BTC: 'Bộ Tài chính',
  BNNPTNT: 'Bộ Nông nghiệp',
  BGTVT: 'Bộ Giao thông',
  BQP: 'Bộ Quốc phòng',
  BCA: 'Bộ Công an',
  NHNN: 'Ngân hàng Nhà nước',
  BTTTT: 'Bộ TT&TT',
  BLDTBXH: 'Bộ LĐ-TB&XH',
  BXD: 'Bộ Xây dựng',
  TTg: 'Thủ tướng Chính phủ',
};

function normalizeCode(raw) {
  return String(raw || '')
    .toUpperCase()
    .replace(/Đ/g, 'D')
    .replace(/NĐ/g, 'ND')
    .replace(/QĐ/g, 'QD');
}

function inferType(code) {
  if (code.includes('/TT-')) return 'Thông tư';
  if (code.includes('/ND-')) return 'Nghị định';
  if (code.includes('/QD-')) return 'Quyết định';
  if (code.includes('/CV-')) return 'Công văn';
  return 'Văn bản';
}

function inferIssuer(code) {
  const m = code.match(/-(BCT|BYT|BTC|BNNPTNT|BGTVT|BQP|BCA|NHNN|BTTTT|BLDTBXH|BXD|TTG)$/);
  if (!m) return { issuer: 'UNKNOWN', issuerFullVi: 'Chưa rà soát' };
  const key = m[1] === 'TTG' ? 'TTg' : m[1];
  return { issuer: m[1], issuerFullVi: ISSUER_MAP[key] || m[1] };
}

const byCode = new Map();
const chapterHits = new Map();

for (const row of Object.values(tax)) {
  const text = String(row.cs || '');
  const matches = text.match(DOC_RE) || [];
  const chapter = row.hs.slice(0, 2);
  for (const raw of matches) {
    const code = normalizeCode(raw);
    if (!byCode.has(code)) {
      const { issuer, issuerFullVi } = inferIssuer(code);
      byCode.set(code, {
        code,
        type: inferType(code),
        issuer,
        issuerFullVi,
        titleVi: `Văn bản ${code} (cần bổ sung tiêu đề)`,
        url: `https://vbpl.vn/search?q=${encodeURIComponent(code)}`,
        status: 'ACTIVE',
        domain: [],
        scopeHsChapters: new Set(),
        citedInHsCount: 0,
      });
    }
    const doc = byCode.get(code);
    doc.citedInHsCount += 1;
    doc.scopeHsChapters.add(chapter);
    chapterHits.set(chapter, (chapterHits.get(chapter) || 0) + 1);
  }
}

const docs = {};
for (const [code, doc] of byCode.entries()) {
  docs[code] = {
    ...doc,
    scopeHsChapters: [...doc.scopeHsChapters].sort(),
  };
}

const out = {
  version: new Date().toISOString().slice(0, 10),
  extractedFrom: 'data/tax.json policyByHs (cs)',
  total: Object.keys(docs).length,
  documents: docs,
};

const outPath = join(root, 'data', 'legal-docs.json');
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`Wrote ${out.total} legal doc stubs → ${outPath}`);
