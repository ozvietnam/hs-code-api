#!/usr/bin/env node
/**
 * Ghép bản dịch tiếng Việt vào kho riêng tư ý kiến WCO (#196): data/wco-op/vi.json (gitignored cùng data/wco-op/*).
 *
 *   node scripts/wco-op-join-vi.mjs --vi=a.json,b.json… [--opinions=data/wco-op/opinions.json] [--out=data/wco-op/vi.json]
 *
 * Mỗi mục khoá theo `line` (khoá ổn định của ý kiến trong tệp md gốc), gồm: bản dịch, nguồn trích dẫn đầy đủ,
 * cờ `nghiOcr` (bản dịch còn "[?]"), `lechSo` (máy kiểm số báo lệch — kèm extra/missing) và `hsTinCay` (mã HS của ý kiến có đáng tin không).
 * Bản dịch là công cụ đọc/soát nội bộ; KHÔNG phải nguyên văn chính thức của WCO và không ra endpoint công khai.
 */
import fs from 'node:fs';
import { numericParity } from './wco-op-check-vi.mjs';

const arg = (n, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };

/** 851762 → 8517.62; 2106 → 21.06; Chương/Phần giữ nguyên chuỗi gốc. */
export function fmtHs(hs) {
  const h = String(hs);
  if (/^\d{6}$/.test(h)) return `${h.slice(0, 4)}.${h.slice(4)}`;
  if (/^\d{4}$/.test(h)) return `${h.slice(0, 2)}.${h.slice(2)}`;
  return h;
}

export function citation(o) {
  return `WCO, Compendium of Classification Opinions (HS 2022), ý kiến phân loại ${fmtHs(o.hs)}/${o.ord}`
    + `${o.adoption ? `, thông qua năm ${o.adoption}` : ''}; bản dịch tiếng Việt không chính thức`;
}

export function join(opinions, viRows) {
  const byLine = new Map(opinions.map((o) => [o.line, o]));
  const out = {}; const orphan = [];
  for (const r of viRows) {
    const o = byLine.get(r.line);
    if (!o) { orphan.push(r.line); continue; }
    const p = numericParity(o.text, r.vi);
    out[r.line] = {
      id: o.id, hs: o.hs, ord: o.ord, namThongQua: o.adoption || null,
      nguon: citation(o), vi: r.vi,
      nghiOcr: /\[\?\]/.test(r.vi),
      lechSo: p.ok ? null : { extra: p.extra, missing: p.missing },
      hsTinCay: !o.headingSuspect,
    };
  }
  const missing = opinions.filter((o) => !out[o.line]).map((o) => o.line);
  return { out, orphan, missing };
}

function main() {
  const files = (arg('vi') || '').split(',').filter(Boolean);
  const opinions = JSON.parse(fs.readFileSync(arg('opinions', 'data/wco-op/opinions.json'), 'utf8'));
  const rows = files.flatMap((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
  const { out, orphan, missing } = join(opinions, rows);
  fs.writeFileSync(arg('out', 'data/wco-op/vi.json'), JSON.stringify(out));
  const v = Object.values(out);
  console.log(`bản dịch ${v.length}/${opinions.length}; thiếu ${missing.length}; mồ côi ${orphan.length}`);
  console.log(`còn [?] (nghi OCR): ${v.filter((x) => x.nghiOcr).length}`);
  console.log(`máy kiểm số báo lệch: ${v.filter((x) => x.lechSo).length}`
    + ` (trong đó KHÔNG có [?] — phải soát: ${v.filter((x) => x.lechSo && !x.nghiOcr).length})`);
  console.log(`mã HS còn nghi (headingSuspect): ${v.filter((x) => !x.hsTinCay).length}`);
  if (missing.length) console.log('dòng thiếu:', missing.join(','));
}

if (import.meta.url === `file://${process.argv[1]}`) main();
