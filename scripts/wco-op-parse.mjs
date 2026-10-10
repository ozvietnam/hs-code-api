#!/usr/bin/env node
/**
 * Bước 2 của #196: pages-en.jsonl (chữ tiếng Anh đã gạn bởi wco-op-extract.py) → opinions.json, mỗi ý kiến phân loại một mục.
 *
 *   node scripts/wco-op-parse.mjs [--in=data/wco-op] [--out=data/wco-op] [--id-regex='…'] [--require-bold]
 *
 * Ra (đều trong data/wco-op/, bị .gitignore chặn; script từ chối ghi nếu thư mục ra không bị ignore):
 *   opinions.json     [{id:"851762/4", hs:"851762", level:6, ord:4, pages:[a,b], session?, girMentioned?, text}]  — CÓ chữ WCO, riêng tư
 *   parse-report.json chỉ mã + số liệu, KHÔNG có chữ WCO → dán gửi được
 *
 * Nhận diện đầu ý kiến: dòng bắt đầu bằng mã dạng `8517.62/4` (hoặc `85.17/4`). Mặc định chấp nhận
 * `NNNN.NN/n` và `NN.NN/n`; đổi bằng --id-regex (nhóm 1 = mã, nhóm 2 = thứ tự) khi bố cục thật khác.
 * Chống nhầm câu dẫn chéo ("xem 8517.62/1" đầu dòng): mã phải TĂNG DẦN trong tài liệu, ngược lại bị loại và đếm vào báo cáo.
 * Máy kiểm: hs 6 số phải có trong data/wco-hs-international.csv (4 số: phải là nhóm có thật), thứ tự không trùng,
 * độ dài hợp lý, thứ tự trang không lùi. Mục lỗi KHÔNG bị xoá, chỉ ghi vào báo cáo để người soát.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (n, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const flag = (n) => process.argv.includes(`--${n}`);

export const DEFAULT_ID_REGEX = '^\\s*(\\d{4}\\.\\d{2}|\\d{2}\\.\\d{2})\\s*\\/\\s*(\\d{1,3})(?![\\d.])';
const MIN_CHARS = 80;
const MAX_CHARS = 12000;

/**
 * Bản scan OCR hay đọc nhầm ký tự trong mã đầu ý kiến: 0↔O, 1↔l/I/|, 5↔S, "." ↔ ",", "/" ↔ l/I/|.
 * Chỉ sửa khi mã sau khi sửa CÓ THẬT trong bảng WCO (known) — nếu không thì để nguyên, tránh biến chữ thường thành mã.
 * @returns {{t: string, fixed: boolean}}
 */
const OCR_ID = /^(\s*)([0-9OoIl|S]{2,4})\s*[.,]\s*([0-9OoIl|S]{2})\s*([/|lI])\s*([0-9OoIl|S]{1,3})(?![0-9A-Za-z])/;
const OCR_DIGIT = { O: '0', o: '0', I: '1', l: '1', '|': '1', S: '5' };
const digits = (x) => x.replace(/[OoIl|S]/g, (c) => OCR_DIGIT[c]);
export function fixOcrId(t, known) {
  const m = OCR_ID.exec(t);
  if (!m || !known) return { t, fixed: false };
  const a = digits(m[2]); const b = digits(m[3]); const n = digits(m[5]);
  if (!/^\d+$/.test(a + b + n)) return { t, fixed: false };
  const hs = a + b;
  if (!(hs.length === 6 ? known.six : hs.length === 4 ? known.four : new Set()).has(hs)) return { t, fixed: false };
  const clean = `${a}.${b}/${n}`;
  const raw = t.slice(0, m[0].length).trim();
  if (raw === clean) return { t, fixed: false };
  return { t: m[1] + clean + t.slice(m[0].length), fixed: true };
}

/** Mã có dấu chấm → chuỗi số (6 hoặc 4). "8517.62" → "851762"; "85.17" → "8517". */
const codeDigits = (c) => c.replace(/\D/g, '');

/**
 * Tách ý kiến từ danh sách dòng. lines: [{t, pdfPage, b}] theo thứ tự đọc.
 * @returns {{opinions: object[], rejectedBackward: string[], preface: number, ocrFixed: string[]}}
 */
export function segment(lines, { idRegex = DEFAULT_ID_REGEX, requireBold = false, known = null } = {}) {
  const re = new RegExp(idRegex);
  const starts = [];
  const rejectedBackward = [];
  const ocrFixed = [];
  let last = { hs: '', ord: 0 };
  lines.forEach((l, i) => {
    const fx = fixOcrId(l.t, known);
    if (fx.fixed) { ocrFixed.push(`p${l.pdfPage}`); l = { ...l, t: fx.t }; lines[i] = l; }
    const m = re.exec(l.t);
    if (!m) return;
    if (requireBold && !l.b) return;
    const hs = codeDigits(m[1]);
    if (hs.length !== 6 && hs.length !== 4) return;
    const ord = Number(m[2]);
    // tăng dần: cùng mã thì thứ tự phải lớn hơn; mã nhóm 4 số đứng trước các mã 6 số cùng nhóm nên so theo chuỗi số
    const cmp = hs.localeCompare(last.hs);
    if (last.hs && (cmp < 0 || (cmp === 0 && ord <= last.ord))) { rejectedBackward.push(`${hs}/${ord}@p${l.pdfPage}`); return; }
    last = { hs, ord };
    starts.push({ i, hs, ord });
  });
  const opinions = starts.map((s, k) => {
    const end = k + 1 < starts.length ? starts[k + 1].i : lines.length;
    const body = lines.slice(s.i, end);
    const text = body.map((l) => l.t).join('\n');
    const o = { id: `${s.hs}/${s.ord}`, hs: s.hs, level: s.hs.length, ord: s.ord, pages: [body[0].pdfPage, body[body.length - 1].pdfPage], text };
    const ses = /(\d{1,3})(?:st|nd|rd|th)\s+Session/i.exec(text);
    if (ses) o.session = Number(ses[1]);
    const gir = [...text.matchAll(/\bGIR\s*([1-6][a-b]?(?:\s*(?:,|and|&)\s*(?:GIR\s*)?[1-6][a-b]?)*)/gi)].map((g) => g[1].replace(/\s+/g, ' '));
    if (gir.length) o.girMentioned = [...new Set(gir)];
    return o;
  });
  return { opinions, rejectedBackward, ocrFixed, preface: starts.length ? starts[0].i : lines.length };
}

function loadWcoCodes() {
  const six = new Set(); const four = new Set();
  const f = path.join(ROOT, 'data', 'wco-hs-international.csv');
  if (!fs.existsSync(f)) return null;
  for (const l of fs.readFileSync(f, 'utf8').split('\n').slice(1)) {
    const m = /^[^,]*,(\d+),/.exec(l);
    if (!m) continue;
    if (m[1].length === 6) six.add(m[1]); else if (m[1].length === 4) four.add(m[1]);
  }
  return { six, four };
}

/** Kiểm máy. Trả báo cáo số liệu (không có chữ WCO). */
export function validate(opinions, wcoCodes) {
  const issues = { unknownHs: [], duplicate: [], tooShort: [], tooLong: [], pageBackwards: [], ordinalGaps: [] };
  const seen = new Set();
  let prevPage = 0;
  const maxOrd = new Map();
  for (const o of opinions) {
    if (seen.has(o.id)) issues.duplicate.push(o.id); seen.add(o.id);
    if (wcoCodes && !(o.level === 6 ? wcoCodes.six : wcoCodes.four).has(o.hs)) issues.unknownHs.push(o.id);
    if (o.text.length < MIN_CHARS) issues.tooShort.push(o.id);
    if (o.text.length > MAX_CHARS) issues.tooLong.push(o.id);
    if (o.pages[0] < prevPage) issues.pageBackwards.push(o.id);
    prevPage = o.pages[1];
    const prev = maxOrd.get(o.hs);
    if (prev !== undefined && o.ord !== prev + 1) issues.ordinalGaps.push(`${o.hs}: ${prev}→${o.ord}`);
    maxOrd.set(o.hs, o.ord);
  }
  return issues;
}

function assertIgnored(file) {
  const top = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: path.dirname(path.resolve(file)), encoding: 'utf8' });
  if (top.status !== 0) return; // không phải repo git
  const r = spawnSync('git', ['check-ignore', '-q', file], { cwd: top.stdout.trim() });
  if (r.status !== 0) { console.error(`TỪ CHỐI ghi ${file}: không nằm trong .gitignore (dữ liệu WCO có bản quyền). Dùng data/wco-op/.`); process.exit(2); }
}

function main() {
  const inDir = path.resolve(ROOT, arg('in', 'data/wco-op'));
  const outDir = path.resolve(ROOT, arg('out', 'data/wco-op'));
  const pagesFile = path.join(inDir, 'pages-en.jsonl');
  if (!fs.existsSync(pagesFile)) { console.error(`Thiếu ${pagesFile} — chạy scripts/wco-op-extract.py trước.`); process.exit(1); }
  const lines = [];
  for (const row of fs.readFileSync(pagesFile, 'utf8').split('\n')) {
    if (!row.trim()) continue;
    const p = JSON.parse(row);
    for (const l of p.lines) lines.push({ t: l.t, b: l.b, pdfPage: p.pdfPage });
  }
  const wco = loadWcoCodes();
  const { opinions, rejectedBackward, ocrFixed, preface } = segment(lines, { idRegex: arg('id-regex', DEFAULT_ID_REGEX), requireBold: flag('require-bold'), known: wco });
  const issues = validate(opinions, wco);
  const byChapter = {};
  for (const o of opinions) byChapter[o.hs.slice(0, 2)] = (byChapter[o.hs.slice(0, 2)] || 0) + 1;
  const report = {
    lines: lines.length, prefaceLines: preface, opinions: opinions.length,
    level6: opinions.filter((o) => o.level === 6).length, level4: opinions.filter((o) => o.level === 4).length,
    withSession: opinions.filter((o) => o.session).length, withGirMention: opinions.filter((o) => o.girMentioned).length,
    ocrFixedIds: { count: ocrFixed.length, pages: ocrFixed.slice(0, 50) },
    byChapter, rejectedBackward: { count: rejectedBackward.length, first: rejectedBackward.slice(0, 30) },
    issues: Object.fromEntries(Object.entries(issues).map(([k, v]) => [k, { count: v.length, first: v.slice(0, 30) }])),
    wcoCodesChecked: !!wco,
  };
  fs.mkdirSync(outDir, { recursive: true });
  const of = path.join(outDir, 'opinions.json'); const rf = path.join(outDir, 'parse-report.json');
  assertIgnored(of); assertIgnored(rf);
  fs.writeFileSync(of, JSON.stringify(opinions, null, 1));
  fs.writeFileSync(rf, JSON.stringify(report, null, 1));
  const bad = Object.values(issues).reduce((n, v) => n + v.length, 0);
  console.log(`${opinions.length} ý kiến (6 số: ${report.level6}, 4 số: ${report.level4}); loại ${rejectedBackward.length} mã lùi (nghi dẫn chéo); sửa ${ocrFixed.length} mã OCR; ${bad} cảnh báo.`);
  console.log(`  ${of}\n  ${rf}  ← báo cáo không chứa chữ WCO, dán gửi được`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) main();
