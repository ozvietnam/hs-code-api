#!/usr/bin/env node
/**
 * Cập nhật các con số trong AGENTS.md / public/llms.txt cho khớp dữ liệu — đúng
 * công thức scripts/test-doc-counts.mjs kiểm. Chạy sau khi gộp tiền lệ, verify văn
 * bản, thêm cụm dễ nhầm (hs-agent J2 gọi trong cửa kiểm trước npm test).
 *   node scripts/sync-doc-counts.mjs [--check]
 */
import fs from 'fs';

const check = process.argv.includes('--check');
const fmt = (n) => n.toLocaleString('de-DE');
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

const conflicts = Object.keys(read('data/conflicts.json')).length;
const legal = read('data/legal-docs.json');
const docs = Object.keys(legal.documents).length;
const verified = legal.verifiedTitles;
const tax = read('data/tax.json');
const rows = Object.keys(tax).length;
const precRaw = read('data/precedents.json');
const precCodes = new Set((Array.isArray(precRaw) ? precRaw : Object.values(precRaw).flat()).map((x) => x.outcome).filter((h) => h && tax[h])).size;

const NUM = '[\\d.]+';
const rules = {
  'AGENTS.md': [
    [new RegExp(`Cảnh báo mã dễ nhầm \\(\\d+\\)`, 'g'), `Cảnh báo mã dễ nhầm (${conflicts})`],
    [new RegExp(`Văn bản pháp luật \\(\\d+\\)`, 'g'), `Văn bản pháp luật (${docs})`],
    [new RegExp(`\\b\\d+/${'\\d+'}(?= được verify| verify| đã verify)`, 'g'), `${verified}/${docs}`],
    [new RegExp(`Tiền lệ TB-TCHQ \\(${NUM} mã trong biểu hiện hành\\)`, 'g'), `Tiền lệ TB-TCHQ (${fmt(precCodes)} mã trong biểu hiện hành)`],
  ],
  'public/llms.txt': [
    [new RegExp(`\\d+ văn bản, \\d+ đã verify`, 'g'), `${docs} văn bản, ${verified} đã verify`],
    [new RegExp(`${NUM} mã có tiền lệ`, 'g'), `${fmt(precCodes)} mã có tiền lệ`],
  ],
};

let changed = 0;
for (const [file, list] of Object.entries(rules)) {
  const before = fs.readFileSync(file, 'utf8');
  let after = before;
  for (const [re, rep] of list) after = after.replace(re, rep);
  if (after !== before) {
    changed += 1;
    if (!check) fs.writeFileSync(file, after);
    console.log(`${check ? 'LỆCH' : 'cập nhật'} ${file}`);
  }
}
console.log(`tiền lệ ${fmt(precCodes)} mã · văn bản ${verified}/${docs} · cụm dễ nhầm ${conflicts} · biểu thuế ${fmt(rows)} dòng`);
process.exit(check && changed ? 1 : 0);
