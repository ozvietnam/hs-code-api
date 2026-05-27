#!/usr/bin/env node
/**
 * Import legacy HS knowledge from hs-knowledge-api into local data/*.json files.
 *
 * Output:
 * - data/explanatory-notes.json
 * - data/precedents.json
 * - data/conflicts.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');

const SOURCES = {
  baoGom: 'https://raw.githubusercontent.com/ozvietnam/hs-knowledge-api/main/legacy/data/bao_gom_index.json',
  tbTchq: 'https://raw.githubusercontent.com/ozvietnam/hs-knowledge-api/main/legacy/data/tb_tchq_index.json',
  conflict: 'https://raw.githubusercontent.com/ozvietnam/hs-knowledge-api/main/legacy/data/conflict_index.json',
  kg: 'https://raw.githubusercontent.com/ozvietnam/hs-knowledge-api/main/legacy/data/kg_index.json',
};

function normalizeHs(hs) {
  return String(hs || '')
    .replace(/\./g, '')
    .trim()
    .padEnd(8, '0')
    .slice(0, 8);
}

function toArray(x) {
  return Array.isArray(x) ? x : [];
}

function textOrNull(value) {
  const s = String(value || '').trim();
  return s.length > 0 ? s : null;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed ${url}: HTTP ${res.status}`);
  return res.json();
}

function buildRiskMap(kgRows) {
  const map = {};
  for (const row of toArray(kgRows)) {
    const hs = normalizeHs(row?.hs);
    map[hs] = {
      riskLevel: row?.muc_canh_bao || null,
      hasPolicyWarning: Boolean(row?.canh_bao_cs),
    };
  }
  return map;
}

function transformExplanatory(baoRows) {
  const out = {};
  for (const row of toArray(baoRows)) {
    const hs = normalizeHs(row?.hs);
    if (!hs) continue;
    const chapter = hs.slice(0, 2);
    const heading = hs.slice(0, 4);
    const subheading = hs.slice(0, 6);
    out[hs] = {
      hsCode: hs,
      level: 'national',
      code: hs,
      parentCode: subheading,
      headingCode: heading,
      chapterCode: chapter,
      noteVi: textOrNull(row?.t),
      noteType: 'bao_gom',
      sourceFile: 'bao_gom_index.json',
    };
  }
  return out;
}

function transformPrecedents(tbRows) {
  const out = {};
  for (const row of toArray(tbRows)) {
    const hs = normalizeHs(row?.hs || row?.ma_hs);
    if (!hs) continue;
    const item = {
      tbTchqNumber: textOrNull(row?.so_hieu),
      productName: textOrNull(row?.ten_sp),
      technicalSpec: textOrNull(row?.ten_kt),
      year: Number.isFinite(Number(row?.nam)) ? Number(row?.nam) : null,
      outcome: textOrNull(row?.ma_hs || row?.hs),
      sourceFile: 'tb_tchq_index.json',
    };
    out[hs] = out[hs] || [];
    out[hs].push(item);
  }
  return out;
}

function parseMaybeJsonObject(str) {
  if (!str || typeof str !== 'string') return null;
  const normalized = str
    .replace(/None/g, 'null')
    .replace(/True/g, 'true')
    .replace(/False/g, 'false')
    .replace(/'/g, '"');
  try {
    return JSON.parse(normalized);
  } catch {
    return null;
  }
}

function transformConflicts(conflictRows, riskByHs) {
  const out = {};
  for (const row of toArray(conflictRows)) {
    const hs = normalizeHs(row?.hs);
    if (!hs) continue;
    const confusedWith = toArray(row?.ma_de_nham).map(normalizeHs).filter(Boolean);
    const reasonsVi = toArray(row?.ly_do).map((x) => String(x || '').trim()).filter(Boolean);
    const precedents = toArray(row?.mau_thuan)
      .map(parseMaybeJsonObject)
      .filter(Boolean)
      .map((x) => ({
        tbTchqNumber: textOrNull(x.so_hieu),
        productName: textOrNull(x.ten_san_pham),
        determinedHsCode: textOrNull(x.ma_hs_xac_dinh),
        declaredHsCode: textOrNull(x.ma_hs_ban_dau),
        reasoning: textOrNull(x.ly_do),
      }));

    out[hs] = {
      hsCode: hs,
      riskLevel: row?.muc_rui_ro || riskByHs[hs]?.riskLevel || null,
      confusedWith,
      reasonsVi,
      precedents,
      sourceFile: 'conflict_index.json',
    };
  }
  return out;
}

function writeJson(name, data) {
  const full = path.join(DATA_DIR, name);
  fs.writeFileSync(full, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  return full;
}

async function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const [baoGom, tbTchq, conflictRows, kgRows] = await Promise.all([
    fetchJson(SOURCES.baoGom),
    fetchJson(SOURCES.tbTchq),
    fetchJson(SOURCES.conflict),
    fetchJson(SOURCES.kg),
  ]);

  const riskByHs = buildRiskMap(kgRows);
  const explanatory = transformExplanatory(baoGom);
  const precedents = transformPrecedents(tbTchq);
  const conflicts = transformConflicts(conflictRows, riskByHs);

  const out1 = writeJson('explanatory-notes.json', explanatory);
  const out2 = writeJson('precedents.json', precedents);
  const out3 = writeJson('conflicts.json', conflicts);

  console.log(`Wrote ${path.relative(ROOT, out1)} (${Object.keys(explanatory).length})`);
  console.log(`Wrote ${path.relative(ROOT, out2)} (${Object.keys(precedents).length})`);
  console.log(`Wrote ${path.relative(ROOT, out3)} (${Object.keys(conflicts).length})`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
