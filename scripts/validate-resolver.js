#!/usr/bin/env node
/**
 * validate-resolver.js — CI validator cho conflict-tables + attributes + conflicts.group
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ATTR_PATH = path.join(ROOT, 'data/attributes.json');
const TABLES_PATH = path.join(ROOT, 'data/conflict-tables.json');
const CONFLICTS_PATH = path.join(ROOT, 'data/conflicts.json');
const TAX_PATH = path.join(ROOT, 'data/tax.json');

let failed = 0;

function pass(msg) { console.log('PASS', msg); }
function fail(msg, detail) {
  console.log('FAIL', msg, detail || '');
  failed += 1;
}

const registry = JSON.parse(fs.readFileSync(ATTR_PATH, 'utf8')).attributes || {};
const tablesDoc = JSON.parse(fs.readFileSync(TABLES_PATH, 'utf8'));
const tables = tablesDoc.tables || {};
const conflicts = JSON.parse(fs.readFileSync(CONFLICTS_PATH, 'utf8'));
const tax = JSON.parse(fs.readFileSync(TAX_PATH, 'utf8'));

// 1. Registry — chỉ validate thuộc tính RESOLVER (có domain). Thuộc tính vocab-only
// (labelVi/aliases/detect, dùng cho map EN/VN + dò missing[]) không thuộc phạm vi resolver.
for (const [key, def] of Object.entries(registry)) {
  if (!def.domain) continue; // vocab-only → bỏ qua
  if (def.canonical !== key) fail(`registry canonical mismatch: ${key}`);
  if (!Array.isArray(def.domain) || !def.domain.length) fail(`registry empty domain: ${key}`);
  for (const v of def.domain) {
    if (!def.labelsVi?.[v]) fail(`registry missing labelVi: ${key}.${v}`);
  }
}
if (!failed) pass('registry valid');

// 2. Table references
for (const [gid, table] of Object.entries(tables)) {
  for (const inp of table.inputs || []) {
    if (!registry[inp.attribute]) fail(`table ${gid} unknown input attr`, inp.attribute);
  }
  for (const rule of table.rules || []) {
    for (const [k, v] of Object.entries(rule.when || {})) {
      if (!registry[k]) fail(`table ${gid} rule ${rule.id} unknown when key`, k);
      else if (!registry[k].domain.includes(v)) fail(`table ${gid} rule ${rule.id} invalid value`, `${k}=${v}`);
    }
  }
}
if (!failed) pass('table references valid');

// 3. Leaf HS in tax.json
for (const [gid, table] of Object.entries(tables)) {
  const ruleHs = new Set((table.rules || []).map((r) => r.hs));
  for (const hs of ruleHs) {
    if (!tax[hs]) fail(`table ${gid} hs not in tax.json`, hs);
  }
  for (const hs of ruleHs) {
    if (!(table.members || []).includes(hs)) fail(`table ${gid} members missing rule hs`, hs);
  }
}
if (!failed) pass('leaf hs valid');

// 4. Completeness — Cartesian product of input domains
function cartesian(domains) {
  if (!domains.length) return [[]];
  const [head, ...rest] = domains;
  const tail = cartesian(rest);
  const out = [];
  for (const v of head) for (const t of tail) out.push([v, ...t]);
  return out;
}

for (const [gid, table] of Object.entries(tables)) {
  const attrs = (table.inputs || []).map((i) => i.attribute);
  const domains = attrs.map((a) => registry[a].domain);
  const combos = cartesian(domains);
  const gaps = [];
  for (const combo of combos) {
    const inputs = Object.fromEntries(attrs.map((a, i) => [a, combo[i]]));
    const matched = (table.rules || []).filter((r) =>
      Object.keys(r.when).every((k) => inputs[k] === r.when[k]),
    );
    if (!matched.length) gaps.push(inputs);
  }
  if (gaps.length) fail(`table ${gid} completeness gaps`, JSON.stringify(gaps.slice(0, 3)));
}
if (!failed) pass('completeness ok');

// 5. Consistency
for (const [gid, table] of Object.entries(tables)) {
  const attrs = (table.inputs || []).map((i) => i.attribute);
  const domains = attrs.map((a) => registry[a].domain);
  const combos = cartesian(domains);
  const policy = table.hitPolicy || 'PRIORITY';
  for (const combo of combos) {
    const inputs = Object.fromEntries(attrs.map((a, i) => [a, combo[i]]));
    const matched = (table.rules || []).filter((r) =>
      Object.keys(r.when).every((k) => inputs[k] === r.when[k]),
    );
    if (policy === 'UNIQUE' && matched.length > 1) {
      fail(`table ${gid} UNIQUE overlap`, JSON.stringify(inputs));
    }
    if (policy === 'PRIORITY' && matched.length > 1) {
      const prios = matched.map((r) => r.priority);
      if (new Set(prios).size !== prios.length) fail(`table ${gid} duplicate priority`, JSON.stringify(inputs));
    }
  }
}
if (!failed) pass('consistency ok');

// 6. conflicts.json ↔ tables
const groupsInConflicts = new Set();
for (const entry of Object.values(conflicts)) {
  if (entry?.group) groupsInConflicts.add(entry.group);
}
for (const g of groupsInConflicts) {
  if (!tables[g]) fail('conflicts group missing table', g);
}
for (const gid of Object.keys(tables)) {
  if (!groupsInConflicts.has(gid)) fail('orphan table (no conflicts.group)', gid);
}
if (!failed) pass('conflicts ↔ tables aligned');

console.log(`\n${failed ? 'VALIDATION FAILED' : 'ALL VALIDATION PASSED'}`);
process.exit(failed ? 1 : 0);
