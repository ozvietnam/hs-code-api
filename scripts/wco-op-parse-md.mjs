#!/usr/bin/env node
/**
 * Đọc bản OCR tiếng Anh dạng markdown của WCO Compendium of Classification Opinions (#196) → opinions.json.
 *
 *   node scripts/wco-op-parse-md.mjs --md=data/wco-op/WCO_Compendium_2022_English_OCR.md [--out=data/wco-op] [--expect=1036]
 *
 * Định dạng nguồn (đã khảo sát bản 2022):
 *   ## Section VI — …                    ← tên Section (chỉ để phân nhóm)
 *   ### 3802.90                          ← mã phân nhóm 6 số
 *   **1.** Mô tả hàng …                  ← số thứ tự IN SẴN của ý kiến trong mã (OCR có thể làm méo: ": 9.", "“ 9.")
 *   *Application of GIRs 1 and 6.*      ← quy tắc áp dụng (có thể không có; còn "Application of Note …")
 *   *Adoption: 2014*                     ← dòng CUỐI của ý kiến
 *   ## Annex — …                         ← từ đây trở đi KHÔNG phải ý kiến (bảng nhãn hiệu/thành phần)
 * Ý kiến = các dòng từ sau Adoption trước (hoặc sau tiêu đề mã) đến hết dòng Adoption. Số thứ tự theo VỊ TRÍ trong mã; số in sẵn
 * (nếu đọc được) chỉ để đối chiếu: khác nhau thì ordInferred=true — API không bày thứ tự đó như số hiệu chính thức.
 *
 * Ra data/wco-op/opinions.json (CÓ chữ WCO — riêng tư) và parse-report.json (số liệu, không có chữ WCO). Từ chối ghi nếu không bị .gitignore.
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadWcoCodes, validate, assertIgnored } from './wco-op-parse.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (n, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };

const OCR_DIGIT = { O: '0', o: '0', I: '1', l: '1', '|': '1', S: '5' };
const fixDigits = (x) => x.replace(/[OoIl|S]/g, (c) => OCR_DIGIT[c]);
const stripMd = (l) => l.replace(/\*\*/g, '').replace(/^\*(.*)\*$/, '$1').trim();
// số thứ tự đầu ý kiến: "**1.** …", hoặc OCR méo ": 1. …", "“ 1. …"
const MARKER = /^(?:\*\*)?[^\w\d\n]{0,3}\s*(\d{1,3})\s*\.(?:\*\*)?\s+/;
const ADOPTION = /^\W*\*?\s*Adoption\b/i;
const APPLICATION = /^\W*\*?\s*Application\b/i;

/** "### 3802.90" (kể cả OCR méo như "38O2.90") → "380290" hoặc null. */
export function parseHeadingCode(h) {
  // "3802.90" hoặc "3802.90 (continued)" (mã tiếp tục sang trang sau — vẫn là cùng mã)
  const m = /^\s*([0-9OoIl|S]{4})\s*[.,]\s*([0-9OoIl|S]{2})\s*(?:\(\s*continued\s*\))?\s*$/i.exec(h);
  if (!m) return null;
  const d = fixDigits(m[1]) + fixDigits(m[2]);
  return /^\d{6}$/.test(d) ? d : null;
}

/** @returns {{opinions: object[], stats: object}} */
export function parseMarkdown(md) {
  const lines = md.split('\n');
  const opinions = [];
  const stats = { headings: 0, headingsUnparsed: [], orphanLines: 0, annexStartLine: null };
  let section = null; let code = null; let buf = []; let inAnnex = false; let headingNo = 0; let headingContinued = false;
  const perCode = new Map();

  const finalize = (adoptionLine, lineNo) => {
    const body = buf.map((l) => l.replace(/\s+$/, ''));
    buf = [];
    let first = body.findIndex((l) => l.trim());
    if (first < 0) first = body.length;
    let content = body.slice(first);
    // đầu trang/ghi chú lọt vào trước số thứ tự: bỏ các dòng ngắn đứng trước dòng có số thứ tự đầu tiên
    const mi = content.findIndex((l) => MARKER.test(l.trim()));
    let printed = null;
    if (mi > 0 && content.slice(0, mi).every((l) => l.trim().length < 60)) content = content.slice(mi);
    if (content.length && MARKER.test(content[0].trim())) printed = Number(MARKER.exec(content[0].trim())[1]);
    const ord = (perCode.get(code) || 0) + 1;
    perCode.set(code, ord);
    const yr = /(\d{4})/.exec(fixDigits(adoptionLine.replace(/^\W*\*?\s*Adoption\s*:?/i, '')));
    const adoption = yr && +yr[1] >= 1950 && +yr[1] <= 2030 ? +yr[1] : null;
    const appLines = content.filter((l) => APPLICATION.test(l.trim())).map(stripMd);
    const gir = [...appLines.join(' ').matchAll(/\bGIRs?\s*([1-6][a-b]?(?:\s*(?:,|and|&)\s*(?:GIRs?\s*)?[1-6][a-b]?)*)/gi)].map((g) => g[1].replace(/\s+/g, ' '));
    const text = [...content.map(stripMd), stripMd(adoptionLine)].filter((l, i, a) => l !== '' || (a[i - 1] !== '')).join('\n').trim();
    const o = {
      id: `${code}/${ord}`, hs: code, level: 6, ord, section, adoption, text,
      ...(appLines.length ? { application: appLines.join(' ') } : {}),
      ...(gir.length ? { girMentioned: [...new Set(gir)] } : {}),
      ...(printed !== null ? { ordPrinted: printed } : {}),
      source: 'ocr-md', line: lineNo, headingNo,
    };
    if (headingContinued) o.headingContinued = true;
    if (printed === null || printed !== ord) o.ordInferred = true;
    opinions.push(o);
  };

  // Ý kiến cuối mã mất dòng Adoption (OCR rụng): nếu buffer còn dòng có số thứ tự và đủ dài thì vẫn lấy, đánh dấu noAdoptionLine.
  const flushOrphan = (lineNo) => {
    if (code && buf.some((x) => MARKER.test(x.trim()) && x.trim().length >= 40)) {
      finalize('', lineNo);
      opinions[opinions.length - 1].noAdoptionLine = true;
      stats.orphanLines += 1;
    }
    buf = [];
  };

  lines.forEach((raw, i) => {
    const l = raw.trimEnd();
    if (/^## /.test(l)) {
      flushOrphan(i + 1); code = null;
      if (/^##\s+Annex\b/i.test(l)) { inAnnex = true; stats.annexStartLine = i + 1; }
      else if (/^##\s+Section\b/i.test(l)) section = l.replace(/^##\s+/, '').replace(/\s*\(Chapters?[^)]*\)\s*$/, '').trim();
      return;
    }
    if (inAnnex) return;
    if (/^### /.test(l)) {
      stats.headings += 1;
      headingNo = i + 1; headingContinued = /\(\s*continued\s*\)/i.test(l);
      const c = parseHeadingCode(l.slice(4));
      flushOrphan(i + 1);
      if (!c) stats.headingsUnparsed.push(i + 1);
      code = c;
      return;
    }
    if (!code) return;
    if (ADOPTION.test(l.trim())) { finalize(l, i + 1); return; }
    buf.push(l);
  });
  recoverFromContinued(opinions, stats);
  markSuspect(opinions, stats);
  return { opinions, stats };
}

/**
 * Tiêu đề "### 8471.30 (continued)" (hoặc tiêu đề đọc được ở trang sau) mà ý kiến đầu tiên dưới nó có số in sẵn n > 1
 * nghĩa là n−1 ý kiến ngay trước đó thuộc CÙNG mã nhưng dải mã ở trang đầu bị OCR làm rơi, nên chúng đang nằm dưới mã khác.
 * Chỉ chuyển khi các ý kiến đó có số in sẵn 1..n−1 khớp (hoặc không đọc được) — còn lại để nguyên cho markSuspect.
 */
export function recoverFromContinued(opinions, stats = {}) {
  let moved = 0; let blocks = 0;
  for (let i = 0; i < opinions.length; i++) {
    const first = opinions[i];
    if (i > 0 && opinions[i - 1].headingNo === first.headingNo) continue; // chỉ xét ý kiến đầu của mỗi khối tiêu đề
    const n = first.ordPrinted;
    if (!n || n <= 1) continue;
    const k = n - 1;
    if (i - k < 0) continue;
    const prev = opinions.slice(i - k, i);
    if (prev.some((o) => o.hs === first.hs)) continue; // đã cùng mã (không cần chuyển)
    const okShape = prev.every((o, j) => o.ordPrinted === undefined || o.ordPrinted === j + 1);
    const knownCount = prev.filter((o) => o.ordPrinted !== undefined).length;
    if (!okShape || knownCount * 2 < prev.length) continue;
    blocks += 1;
    for (const o of prev) { o.hs = first.hs; o.headingRecovered = 'continued'; moved += 1; }
  }
  // tính lại số thứ tự theo vị trí trong từng mã (theo thứ tự tài liệu)
  const perCode = new Map();
  for (const o of opinions) {
    const ord = (perCode.get(o.hs) || 0) + 1;
    perCode.set(o.hs, ord);
    o.ord = ord; o.id = `${o.hs}/${ord}`;
    if (o.ordPrinted === undefined || o.ordPrinted !== ord) o.ordInferred = true; else delete o.ordInferred;
  }
  stats.recoveredFromContinued = { blocks, opinions: moved };
  return opinions;
}

/**
 * Bản OCR làm rơi nhiều tiêu đề mã (dải xanh chữ trắng) nên nhiều ý kiến bị dồn vào mã đứng trước. Dấu hiệu: số in sẵn của ý kiến
 * quay về 1 (hoặc nhỏ hơn số trước) giữa một mã — ở đó có một mã mới bị mất tiêu đề. Từ ý kiến đó trở đi trong cùng đoạn, mã gán KHÔNG ĐÁNG TIN
 * (headingSuspect). Chiều an toàn: nhầm số in sẵn (OCR đọc sai) chỉ làm loại bớt ý kiến, không gán sai.
 */
export function markSuspect(opinions, stats = {}) {
  let prevHs = null; let prevPrinted = null; let suspect = false; let restarts = 0;
  for (const o of opinions) {
    if (o.hs !== prevHs) { suspect = false; prevPrinted = null; prevHs = o.hs; }
    if (!suspect && o.ordPrinted !== undefined && o.ord > 1 && (o.ordPrinted === 1 || (prevPrinted !== null && o.ordPrinted < prevPrinted))) {
      suspect = true; restarts += 1; o.headingRestart = true;
    }
    if (o.ordPrinted !== undefined) prevPrinted = o.ordPrinted;
    if (suspect) o.headingSuspect = true;
  }
  stats.headingRestarts = restarts;
  return opinions;
}

function main() {
  const md = arg('md');
  if (!md) { console.error('Thiếu --md=<tệp markdown OCR>'); process.exit(2); }
  const outDir = path.resolve(ROOT, arg('out', 'data/wco-op'));
  const src = fs.readFileSync(path.resolve(ROOT, md), 'utf8');
  const { opinions, stats } = parseMarkdown(src);
  const wco = loadWcoCodes();
  const issues = validate(opinions, wco);
  const bySection = {};
  for (const o of opinions) bySection[o.section || '?'] = (bySection[o.section || '?'] || 0) + 1;
  const expect = arg('expect') ? Number(arg('expect')) : null;
  const report = {
    source: path.basename(md), opinions: opinions.length, codes: new Set(opinions.map((o) => o.hs)).size,
    ...(expect !== null ? { expected: expect, matchesExpected: opinions.length === expect } : {}),
    headings: stats.headings, headingsUnparsed: stats.headingsUnparsed, withoutAdoptionLine: opinions.filter((o) => o.noAdoptionLine).length, annexStartLine: stats.annexStartLine,
    recoveredFromContinued: stats.recoveredFromContinued,
    headingSuspect: opinions.filter((o) => o.headingSuspect).length, headingRestarts: stats.headingRestarts,
    codesWithSuspect: new Set(opinions.filter((o) => o.headingSuspect).map((o) => o.hs)).size,
    ordInferred: opinions.filter((o) => o.ordInferred).length,
    ordPrintedMismatch: opinions.filter((o) => o.ordPrinted !== undefined && o.ordPrinted !== o.ord).length,
    withoutAdoptionYear: { count: opinions.filter((o) => !o.adoption).length, ids: opinions.filter((o) => !o.adoption).map((o) => o.id).slice(0, 30) },
    withApplication: opinions.filter((o) => o.application).length, withGirMention: opinions.filter((o) => o.girMentioned).length,
    textLength: { min: Math.min(...opinions.map((o) => o.text.length)), max: Math.max(...opinions.map((o) => o.text.length)) },
    bySection,
    issues: Object.fromEntries(Object.entries(issues).map(([k, v]) => [k, { count: v.length, first: v.slice(0, 30) }])),
    wcoCodesChecked: !!wco,
  };
  fs.mkdirSync(outDir, { recursive: true });
  const of = path.join(outDir, 'opinions.json'); const rf = path.join(outDir, 'parse-report.json');
  assertIgnored(of); assertIgnored(rf);
  fs.writeFileSync(of, JSON.stringify(opinions, null, 1));
  fs.writeFileSync(rf, JSON.stringify(report, null, 1));
  console.log(`${opinions.length} ý kiến / ${report.codes} mã${expect !== null ? ` (kỳ vọng ${expect}: ${report.matchesExpected ? 'KHỚP' : 'LỆCH'})` : ''}; ordInferred ${report.ordInferred}; thiếu năm ${report.withoutAdoptionYear.count}; cảnh báo: ` + Object.entries(issues).map(([k, v]) => `${k}=${v.length}`).join(' '));
  if (report.headingSuspect) console.log(`CẢNH BÁO: ${report.headingSuspect}/${opinions.length} ý kiến có mã gán KHÔNG ĐÁNG TIN (tiêu đề mã bị OCR làm rơi, ${report.headingRestarts} chỗ). API bỏ qua các ý kiến này cho tới khi khôi phục tiêu đề (docs/giao-viec/wco-op.md).`);
  console.log(`  ${of}\n  ${rf}  ← báo cáo không chứa chữ WCO, dán gửi được`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) main();
