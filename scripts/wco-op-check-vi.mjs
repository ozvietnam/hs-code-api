#!/usr/bin/env node
/**
 * Máy kiểm bản dịch tiếng Việt của ý kiến WCO (#196): mọi CON SỐ trong bản gốc phải có trong bản dịch (đa tập hợp chữ số),
 * không bỏ sót / thêm số. Bản dịch lệch số bị đánh dấu để dịch lại hoặc soát tay — một sai số đo/tỉ lệ có thể đổi cả kết luận phân loại.
 *
 *   node scripts/wco-op-check-vi.mjs --vi=<tệp,tệp…> [--md-opinions=data/wco-op/opinions.json]
 */
import fs from 'node:fs';
import path from 'node:path';

/** Các "số" của một đoạn văn: chuỗi chữ số liên tiếp, bỏ dấu phân cách thập phân/nghìn (11.5 = 11,5 = 115). Không tính số thứ tự đầu dòng "1." */
export function numberTokens(text) {
  const t = String(text).replace(/^\s*\(?\d{1,3}[.)]\s+/gm, '').replace(/\bAdoption\s*:?\s*\d{4}\b/gi, '').replace(/\b(?:Thông qua|Thong qua)\s*:?\s*\d{4}\b/gi, '');
  // gộp số có dấu phân cách: 11.5 | 1,000 | 2 000 (khoảng trắng nghìn chỉ khi đúng nhóm 3 chữ số)
  const toks = [];
  for (const m of t.matchAll(/\d+(?:[.,]\d+)*/g)) toks.push(m[0].replace(/[.,]/g, ''));
  return toks;
}

const bag = (a) => a.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map());
/** @returns {{ok: boolean, missing: string[], extra: string[]}} */
export function numericParity(en, vi) {
  const be = bag(numberTokens(en)); const bv = bag(numberTokens(vi));
  const missing = []; const extra = [];
  for (const [k, n] of be) if ((bv.get(k) || 0) < n) missing.push(k);
  for (const [k, n] of bv) if ((be.get(k) || 0) < n) extra.push(k);
  return { ok: !missing.length && !extra.length, missing, extra };
}

function main() {
  const arg = (n, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
  const files = (arg('vi') || '').split(',').filter(Boolean);
  const enByLine = new Map(JSON.parse(fs.readFileSync(arg('md-opinions', 'data/wco-op/opinions.json'), 'utf8')).map((o) => [o.line, o.text]));
  let total = 0; let bad = 0; const flagged = [];
  for (const f of files) for (const r of JSON.parse(fs.readFileSync(f, 'utf8'))) {
    total += 1;
    const en = enByLine.get(r.line);
    if (en === undefined) { flagged.push({ line: r.line, why: 'khong-co-ban-goc' }); bad += 1; continue; }
    if (!r.vi || r.vi.trim().length < 5) { flagged.push({ line: r.line, why: 'rong' }); bad += 1; continue; }
    const p = numericParity(en, r.vi);
    if (!p.ok) { flagged.push({ line: r.line, why: 'lech-so', missing: p.missing, extra: p.extra }); bad += 1; }
  }
  console.log(`${total} bản dịch; lệch số/thiếu: ${bad}`);
  if (flagged.length) console.log(JSON.stringify(flagged.slice(0, 60)));
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) main();
