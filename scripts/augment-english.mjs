#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const csvPath = path.join(root, 'data', 'wco-hs-international.csv');
const taxPath = path.join(root, 'data', 'tax.json');

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++; }
      else q = !q;
    } else if (ch === ',' && !q) {
      out.push(cur); cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function loadWco6Map() {
  const lines = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/).filter(Boolean);
  const header = parseCsvLine(lines[0]);
  const idxCode = header.indexOf('hscode');
  const idxDesc = header.indexOf('description');
  const idxLevel = header.indexOf('level');
  const map = new Map();
  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line);
    const code = String(cols[idxCode] || '').replace(/\D/g, '').slice(0, 6);
    const desc = String(cols[idxDesc] || '').trim();
    const level = String(cols[idxLevel] || '').trim();
    if (level !== '6' || code.length !== 6 || !desc) continue;
    if (!map.has(code)) map.set(code, desc);
  }
  return map;
}

if (!fs.existsSync(csvPath)) {
  console.error('Missing CSV:', csvPath);
  process.exit(1);
}

const wco6 = loadWco6Map();
const tax = JSON.parse(fs.readFileSync(taxPath, 'utf8'));
let filled = 0;
for (const [hs, row] of Object.entries(tax)) {
  const code6 = hs.slice(0, 6);
  const en = wco6.get(code6);
  if (!en) continue;
  if (!row.en || !String(row.en).trim()) {
    row.en = en;
    filled += 1;
  }
}
fs.writeFileSync(taxPath, JSON.stringify(tax), 'utf8');
const total = Object.keys(tax).length;
const coverage = ((Object.values(tax).filter((r) => r.en && String(r.en).trim()).length / total) * 100).toFixed(2);
console.log(`Filled ${filled} entries`);
console.log(`Coverage withNameEn: ${coverage}% (${total} total)`);
