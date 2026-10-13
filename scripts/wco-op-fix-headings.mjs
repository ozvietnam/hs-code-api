#!/usr/bin/env node
/**
 * Khôi phục mã (tiêu đề) bị OCR làm rơi trong opinions.json (#196).
 *
 *   python3 scripts/wco-op-banners.py --pdf <bản scan>            → data/wco-op/banners.jsonl (mã đọc từ dải xanh trên ẢNH trang)
 *   node scripts/wco-op-fix-headings.mjs [--banners=data/wco-op/banners.jsonl] [--pages=1-474]
 *
 * Cách làm (tất định, không AI):
 *   - Dãy mã dải B (đọc theo trang, y; gộp lặp liên tiếp) là DANH SÁCH ĐẦY ĐỦ các mã theo thứ tự; tiêu đề markdown H là tập con (OCR chỉ đọc được một phần).
 *   - Giữa hai tiêu đề tìm thấy H_k và H_k+1, các mã của B nằm giữa là mã bị mất tiêu đề; ý kiến của chúng đang bị dồn vào đoạn của H_k.
 *   - Ranh giới trong đoạn = chỗ số in sẵn quay về 1 (hoặc giảm). Số ranh giới phải bằng số mã mất; nếu thừa (OCR đọc sai số) thì thử mọi tổ hợp
 *     và chọn tổ hợp làm số in sẵn khớp vị trí nhiều nhất; hoà hoặc thiếu → để nguyên, ghi "chưa khôi phục" (vẫn headingSuspect).
 * Ghi lại opinions.json (bản gốc lưu opinions.raw.json) + heading-fix-report.json (số liệu, không chứa chữ WCO). Từ chối ghi nếu không bị .gitignore.
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadWcoCodes, validate, assertIgnored } from './wco-op-parse.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (n, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const digits = (c) => String(c || '').replace(/\D/g, '');

/** C(n,k) tổ hợp chỉ số; giới hạn để không nổ. */
function* combos(n, k, start = 0, acc = []) {
  if (acc.length === k) { yield acc.slice(); return; }
  for (let i = start; i <= n - (k - acc.length); i++) { acc.push(i); yield* combos(n, k, i + 1, acc); acc.pop(); }
}

/** Số ý kiến có số in sẵn KHỚP vị trí khi chia run theo các ranh giới cho trước. */
function matchScore(run, cuts) {
  const bounds = [0, ...cuts, run.length];
  let ok = 0;
  for (let s = 0; s < bounds.length - 1; s++) {
    for (let i = bounds[s]; i < bounds[s + 1]; i++) if (run[i].ordPrinted === i - bounds[s] + 1) ok += 1;
  }
  return ok;
}

/**
 * @param {object[]} opinions theo thứ tự tài liệu (đã có hs, ordPrinted)
 * @param {string[]} bannerCodes mã 6 số theo thứ tự đọc (đã gộp lặp liên tiếp); phần tử null = dải không đọc được
 * @returns {{opinions: object[], report: object}}
 */
export function alignHeadings(opinions, bannerCodes) {
  const B = [];
  for (const c of bannerCodes) if (B.length === 0 || B[B.length - 1] !== c) B.push(c);
  // chia thành các đoạn liên tiếp cùng hs
  const runs = [];
  opinions.forEach((o, i) => {
    const last = runs[runs.length - 1];
    if (last && last.hs === o.hs) last.idx.push(i); else runs.push({ hs: o.hs, idx: [i] });
  });
  // vị trí của từng đoạn trong B (tìm tiến, không quay lại)
  let ptr = 0;
  for (const r of runs) {
    let j = -1;
    for (let k = ptr; k < B.length; k++) if (B[k] === r.hs) { j = k; break; }
    r.bpos = j;
    if (j >= 0) ptr = j + 1;
  }
  const report = { runs: runs.length, bannerCodes: B.length, runsNotInBanners: [], resolved: 0, alreadyClean: 0, unresolved: [], recoveredOpinions: 0, newCodes: [] };
  const out = opinions.map((o) => ({ ...o }));
  for (let k = 0; k < runs.length; k++) {
    const r = runs[k];
    const run = r.idx.map((i) => out[i]);
    // ranh giới: số in sẵn quay về 1 hoặc giảm
    const bounds = [];
    run.forEach((o, i) => { if (i > 0 && o.ordPrinted !== undefined && (o.ordPrinted === 1 || (run[i - 1].ordPrinted !== undefined && o.ordPrinted < run[i - 1].ordPrinted))) bounds.push(i); });
    if (r.bpos < 0) { if (bounds.length) report.runsNotInBanners.push(`${r.hs}@line${run[0].line}`); continue; }
    const next = runs.slice(k + 1).find((x) => x.bpos >= 0);
    const lost = B.slice(r.bpos + 1, next ? next.bpos : B.length);
    if (!lost.length && !bounds.length) { report.alreadyClean += 1; run.forEach((o) => { delete o.headingSuspect; delete o.headingRestart; }); continue; }
    if (!lost.length) { report.unresolved.push({ hs: r.hs, line: run[0].line, why: 'ranh-gioi-nhung-khong-mat-ma', boundaries: bounds.length, lost: 0 }); continue; }
    if (lost.some((c) => c === null)) { report.unresolved.push({ hs: r.hs, line: run[0].line, why: 'dai-khong-doc-duoc', boundaries: bounds.length, lost: lost.length }); continue; }
    if (bounds.length < lost.length) { report.unresolved.push({ hs: r.hs, line: run[0].line, why: 'thieu-ranh-gioi', boundaries: bounds.length, lost: lost.length }); continue; }
    let best = null; let tie = false;
    if (bounds.length === lost.length) best = bounds;
    else if (bounds.length <= 14) {
      let bs = -1;
      for (const c of combos(bounds.length, lost.length)) {
        const cuts = c.map((x) => bounds[x]); const sc = matchScore(run, cuts);
        if (sc > bs) { bs = sc; best = cuts; tie = false; } else if (sc === bs) tie = true;
      }
    }
    if (!best || tie) { report.unresolved.push({ hs: r.hs, line: run[0].line, why: tie ? 'nhieu-to-hop-hoa' : 'qua-nhieu-ranh-gioi', boundaries: bounds.length, lost: lost.length }); continue; }
    const cutAt = [0, ...best, run.length];
    const codes = [r.hs, ...lost];
    for (let s = 0; s < codes.length; s++) {
      for (let i = cutAt[s]; i < cutAt[s + 1]; i++) {
        const o = run[i]; const ord = i - cutAt[s] + 1;
        const moved = codes[s] !== o.hs;
        o.hs = codes[s]; o.ord = ord; o.id = `${o.hs}/${ord}`;
        delete o.headingSuspect; delete o.headingRestart;
        if (moved) { o.headingRecovered = true; report.recoveredOpinions += 1; }
        if (o.ordPrinted === undefined || o.ordPrinted !== ord) o.ordInferred = true; else delete o.ordInferred;
      }
      if (s > 0) report.newCodes.push(codes[s]);
    }
    report.resolved += 1;
  }
  report.unresolvedCount = report.unresolved.length;
  return { opinions: out, report };
}

function main() {
  const dir = path.resolve(ROOT, arg('dir', 'data/wco-op'));
  const bf = path.resolve(ROOT, arg('banners', path.join('data', 'wco-op', 'banners.jsonl')));
  const of = path.join(dir, 'opinions.json');
  if (!fs.existsSync(bf) || !fs.existsSync(of)) { console.error('Thiếu banners.jsonl hoặc opinions.json'); process.exit(1); }
  const opinions = JSON.parse(fs.readFileSync(of, 'utf8'));
  let rows = fs.readFileSync(bf, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const pg = /^(\d+)-(\d+)$/.exec(arg('pages', ''));
  if (pg) rows = rows.filter((r) => r.pdfPage >= +pg[1] && r.pdfPage <= +pg[2]);
  rows.sort((a, b) => a.pdfPage - b.pdfPage || a.y - b.y);
  const codes = rows.map((r) => (r.code ? digits(r.code) : null));
  const { opinions: fixed, report } = alignHeadings(opinions, codes);
  const wco = loadWcoCodes();
  const issues = validate(fixed, wco);
  report.headingSuspectAfter = fixed.filter((o) => o.headingSuspect).length;
  report.opinions = fixed.length; report.codesAfter = new Set(fixed.map((o) => o.hs)).size;
  report.ordPrintedMismatchAfter = fixed.filter((o) => o.ordPrinted !== undefined && o.ordPrinted !== o.ord).length;
  report.bannersUnreadable = codes.filter((c) => c === null).length;
  report.bannerCodesNotInWco = [...new Set(codes.filter((c) => c && wco && !wco.six.has(c)))].slice(0, 30);
  report.issues = Object.fromEntries(Object.entries(issues).map(([k, v]) => [k, { count: v.length, first: v.slice(0, 20) }]));
  const raw = path.join(dir, 'opinions.raw.json'); const rf = path.join(dir, 'heading-fix-report.json');
  assertIgnored(of); assertIgnored(raw); assertIgnored(rf);
  if (!fs.existsSync(raw)) fs.copyFileSync(of, raw);
  fs.writeFileSync(of, JSON.stringify(fixed, null, 1));
  fs.writeFileSync(rf, JSON.stringify(report, null, 1));
  console.log(`đoạn ${report.runs}: sạch ${report.alreadyClean}, khôi phục ${report.resolved} (${report.recoveredOpinions} ý kiến chuyển mã, ${report.newCodes.length} mã mới), chưa khôi phục ${report.unresolvedCount}; ý kiến còn nghi sai mã: ${report.headingSuspectAfter}; số in sẵn lệch sau sửa: ${report.ordPrintedMismatchAfter}`);
  console.log(`  ${rf}  ← không chứa chữ WCO, dán gửi được`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) main();
