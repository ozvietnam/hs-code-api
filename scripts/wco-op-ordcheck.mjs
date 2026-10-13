#!/usr/bin/env node
/**
 * Cổng cuối cho kho ý kiến WCO riêng tư (#196): số thứ tự IN trong văn bản là số chính thức của ý kiến
 * (các ý kiến khác dẫn chiếu "xem thêm …/n"). Nếu số in đọc được khác thứ tự `ord` mà ta gán, thì mã HS hoặc
 * thứ tự của ý kiến đó không đáng tin → đánh dấu headingSuspect (API không trả), không đoán sửa.
 *
 *   - số in < ord  : đánh số bắt đầu lại → ý kiến thuộc mã KẾ TIẾP có biển tiêu đề bị OCR làm rơi; các ý kiến sau nó
 *                    trong cùng mã cũng nghi.
 *   - không có số in mà mở đầu bằng nhãn ảnh: chú thích ảnh bị OCR kéo lẫn, không kiểm chứng được thứ tự/mã.
 *   - không đọc được số in mà ord > 1: thứ tự chỉ là suy ra từ vị trí → không kiểm chứng được.
 *   - số in > ord  : lệch thứ tự (thiếu ý kiến đầu hoặc đọc sai) → "thứ tự trong mã" ta sẽ trích là sai.
 *
 *   node scripts/wco-op-ordcheck.mjs [--file=data/wco-op/opinions.json] [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Số thứ tự in ở đầu văn bản (cho phép ≤ vài ký tự nhiễu OCR phía trước). null nếu không đọc được. */
export function leadingNumber(text) {
  const t = String(text);
  const m = /^\W{0,4}[A-Za-z|~€§\\]{0,2}\s?\W{0,3}\s*(\d{1,3})\.\s/.exec(t.slice(0, 16));
  if (m) return Number(m[1]);
  // đầu trang lẫn vào ("8704.31 (continued) ; 5. Three-wheeled…"): số mục theo sau là "N. " + chữ hoa trong ~80 ký tự đầu
  const m2 = /(?:^|[\s;:])(\d{1,3})\.\s+[A-Z“"(]/.exec(t.slice(0, 80));
  return m2 ? Number(m2[1]) : null;
}

/** Mở đầu bằng nhãn/chú thích của ảnh (không phải câu văn): có "|", "xx]" hoặc "Fig." trong ~80 ký tự đầu, hoặc bắt đầu bằng chữ thường. */
export function startsLikeCaption(text) {
  const h = String(text).slice(0, 80);
  return /\||\b[A-Za-z]{1,2}\]|\bFig\./.test(h) || /^[a-zà-ỹ]/.test(h);
}

export function printedOrd(o) { return o.ordPrinted !== undefined && o.ordPrinted !== null ? o.ordPrinted : leadingNumber(o.text); }

/** Đánh dấu ý kiến có số in lệch thứ tự. Trả { marked, restart, shift }. Không đụng ý kiến đã headingSuspect. */
export function markOrdConflicts(opinions) {
  let marked = 0; let restart = 0; let shift = 0; let caption = 0; let unread = 0;
  let prevHs = null; let restarted = false;
  for (const o of opinions) {
    if (o.hs !== prevHs) { prevHs = o.hs; restarted = false; }
    if (o.headingSuspect) continue;
    const n = printedOrd(o);
    let why = null;
    if (restarted) why = 'sau-diem-danh-so-lai';
    else if (n !== null && n < o.ord) { why = 'so-in-nho-hon-thu-tu'; restarted = true; restart += 1; }
    else if (n !== null && n > o.ord) { why = 'so-in-lon-hon-thu-tu'; shift += 1; }
    else if (n === null && startsLikeCaption(o.text)) { why = 'mo-dau-la-chu-thich-anh'; caption += 1; }
    else if (n === null && o.ord > 1) { why = 'khong-doc-duoc-so-thu-tu'; unread += 1; }
    if (why) { o.headingSuspect = true; o.headingConflict = why; marked += 1; }
  }
  return { marked, restart, shift, caption, unread };
}

function main() {
  const arg = (n, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
  const file = path.resolve(ROOT, arg('file', 'data/wco-op/opinions.json'));
  const opinions = JSON.parse(fs.readFileSync(file, 'utf8'));
  const before = opinions.filter((o) => o.headingSuspect).length;
  const r = markOrdConflicts(opinions);
  console.log(`nghi trước: ${before}; thêm ${r.marked} (đánh số lại ${r.restart}, lệch thứ tự ${r.shift}, mở đầu bằng chú thích ảnh ${r.caption}, thứ tự>1 không đọc được số in ${r.unread}); nghi sau: ${opinions.filter((o) => o.headingSuspect).length}`);
  if (process.argv.includes('--dry')) return;
  fs.copyFileSync(file, file.replace(/\.json$/, '.pre-ordcheck.json'));
  fs.writeFileSync(file, JSON.stringify(opinions));
}

if (import.meta.url === `file://${process.argv[1]}`) main();
