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
  const m = /^\s*([0-9OoIl|S]{4})\s*[.,]\s*([0-9OoIl|S]{2})\s*$/.exec(h);
  if (!m) return null;
  const d = fixDigits(m[1]) + fixDigits(m[2]);
  return /^\d{6}$/.test(d) ? d : null;
}

/** @returns {{opinions: object[], stats: object}} */
export function parseMarkdown(md) {
  const lines = md.split('\n');
  const opinions = [];
  const stats = { headings: 0, headingsUnparsed: [], orphanLines: 0, annexStartLine: null };
  let section = null; let code = null; let buf = []; let inAnnex = false;
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
      source: 'ocr-md', line: lineNo,
    };
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
  return { opinions, stats };
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
  console.log(`  ${of}\n  ${rf}  ← báo cáo không chứa chữ WCO, dán gửi được`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) main();
