// scripts/ra-soat-cs-hieu-luc.mjs — rà cột cs của toàn biểu thuế: dòng nào trích dẫn văn bản
// đã HẾT HIỆU LỰC TOÀN BỘ theo sổ tay oz-wiki-plhq (→ bị lib/policy-levels.js hạ INFO theo #1143).
// Chạy: node scripts/ra-soat-cs-hieu-luc.mjs [--top 20]
// Mục đích: liệt kê nợ rà soát — các mã cần cập nhật trích dẫn cs sang văn bản thay thế 2026.
import { readFileSync } from 'node:fs';
import { trichSoHieu, lookup } from '../lib/plhq-registry.js';
import { splitPolicyText } from '../lib/policy-levels.js';

const tax = JSON.parse(readFileSync(new URL('../data/tax.json', import.meta.url), 'utf8'));
const top = Number((process.argv.find((a) => a.startsWith('--top=')) || '--top=20').split('=')[1]);

const theoDongChet = new Map(); // text dòng cs → { ghi, maHs: [] }
let tongMa = 0, tongDong = 0;
for (const [maHs, r] of Object.entries(tax)) {
  if (!r.cs) continue;
  let coDongChet = false;
  for (const text of splitPolicyText(r.cs)) {
    const cites = trichSoHieu(text);
    if (!cites.length) continue;
    const found = cites.map((c) => lookup(c.khoa)).filter(Boolean);
    if (!found.length || found.some((d) => d.tinhTrang !== 'HET_HIEU_LUC')) continue;
    const ghi = found.map((d) => `${d.soHieu} het ${d.hetHieuLucTu || '?'}${(d.biThayTheBoi || [])[0] ? ` → ${(d.biThayTheBoi || [])[0]}` : ''}`).join('; ');
    coDongChet = true; tongDong += 1;
    if (!theoDongChet.has(text)) theoDongChet.set(text, { ghi, maHs: [] });
    theoDongChet.get(text).maHs.push(maHs);
  }
  if (coDongChet) tongMa += 1;
}

const rows = [...theoDongChet.entries()].sort((a, b) => b[1].maHs.length - a[1].maHs.length);
console.log(`RA SOAT COT cs × HIỆU LỰC SỔ TAY (oz-wiki-plhq)`);
console.log(`Mã có dòng cs dẫn VB đã chết toàn bộ: ${tongMa}/${Object.keys(tax).length} — ${tongDong} (mã, dòng) — ${rows.length} dòng cs riêng biệt\n`);
for (const [text, { ghi, maHs }] of rows.slice(0, top)) {
  console.log(`[${maHs.length} mã] ${text.slice(0, 90)}`);
  console.log(`   → ${ghi} | vd mã: ${maHs.slice(0, 5).join(', ')}${maHs.length > 5 ? '…' : ''}`);
}
if (rows.length > top) console.log(`… còn ${rows.length - top} dòng nữa (bỏ --top= để xem hết)`);
