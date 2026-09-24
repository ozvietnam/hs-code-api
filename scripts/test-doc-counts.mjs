#!/usr/bin/env node
/**
 * Con số trong AGENTS.md / llms.txt phải khớp dữ liệu thật — agent đọc tài liệu
 * rồi nói lại với người dùng. Trước đây lệch: 63 vs 66 cụm dễ nhầm, 50 vs 70
 * văn bản đã verify tiêu đề.
 */
import fs from 'fs';

const agents = fs.readFileSync('AGENTS.md', 'utf8');
const llms = fs.readFileSync('public/llms.txt', 'utf8');
const conflicts = Object.keys(JSON.parse(fs.readFileSync('data/conflicts.json', 'utf8'))).length;
const legal = JSON.parse(fs.readFileSync('data/legal-docs.json', 'utf8'));
const docs = Object.keys(legal.documents).length;
const verified = legal.verifiedTitles;
const rows = Object.keys(JSON.parse(fs.readFileSync('data/tax.json', 'utf8'))).length;
const fmt = (n) => n.toLocaleString('de-DE'); // 11.871
const precRaw = JSON.parse(fs.readFileSync('data/precedents.json', 'utf8'));
// Chỉ đếm mã 8 số CÒN trong biểu thuế hiện hành — mã 4 số / mã biểu cũ không
// giúp gì người tra theo mã hiện hành.
const taxMap = JSON.parse(fs.readFileSync('data/tax.json', 'utf8'));
const precCodes = new Set((Array.isArray(precRaw) ? precRaw : Object.values(precRaw).flat())
  .map((x) => x.outcome).filter((h) => h && taxMap[h])).size;

let fail = 0;
const check = (n, c) => { console.log(`${c ? 'PASS' : 'FAIL'} ${n}`); if (!c) fail += 1; };
check(`AGENTS.md: cụm dễ nhầm (${conflicts})`, agents.includes(`Cảnh báo mã dễ nhầm (${conflicts})`));
check(`AGENTS.md: văn bản (${docs})`, agents.includes(`Văn bản pháp luật (${docs})`));
check(`AGENTS.md: ${verified}/${docs} verify tiêu đề`, agents.includes(`${verified}/${docs}`));
check(`llms.txt: ${docs} văn bản, ${verified} đã verify`, llms.includes(`${docs} văn bản, ${verified} đã verify`));
check(`AGENTS.md: ${fmt(rows)} mã`, agents.includes(fmt(rows)));
check(`AGENTS.md: tiền lệ (${fmt(precCodes)} mã trong biểu hiện hành)`, agents.includes(`Tiền lệ TB-TCHQ (${fmt(precCodes)} mã trong biểu hiện hành)`));
check(`llms.txt: ${fmt(precCodes)} mã có tiền lệ`, llms.includes(`${fmt(precCodes)} mã có tiền lệ`));
process.exit(fail ? 1 : 0);
