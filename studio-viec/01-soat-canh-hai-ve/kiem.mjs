// node studio-viec/01-soat-canh-hai-ve/kiem.mjs <thư mục kết quả>   — cổng máy cho việc 01
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const GOC = path.dirname(fileURLToPath(import.meta.url)); const RA = process.argv[2] || 'data/do-thi/soat-canh-hai-ve';
const g = (s) => String(s ?? '').replace(/\s+/g, ' ').trim(); const co = (vb, t) => { const v = g(vb); let i = 0; for (const p of g(t).split('…').map(g).filter(Boolean)) { const j = v.indexOf(p, i); if (j < 0) return false; i = j + p.length; } return g(t).length > 0; };
let loi = 0, xong = 0; const dem = {}; const bao = (x) => { loi += 1; console.log('✗ ' + x); };
for (const f of fs.readdirSync(RA).filter((x) => /^lo-\d\d\.json$/.test(x)).sort()) {
  const goi = JSON.parse(fs.readFileSync(path.join(GOC, f), 'utf8')); let kq; try { kq = JSON.parse(fs.readFileSync(path.join(RA, f), 'utf8')); } catch (e) { bao(`${f}: không phải JSON`); continue; }
  if (kq.khuon !== 'soat2ve@1' || !Array.isArray(kq.kq)) { bao(`${f}: thiếu khuon "soat2ve@1" hoặc mảng kq`); continue; }
  const can = new Map(goi.canh.map((x) => [x.id, x])); const thay = new Set();
  for (const x of kq.kq) {
    const c = x && can.get(x.id); if (!c) { bao(`${f}: id lạ ${x && x.id}`); continue; }
    if (thay.has(x.id)) bao(`${f}: trùng id ${x.id}`); thay.add(x.id);
    if (!['DUNG', 'CAN_CU_YEU', 'SAI'].includes(x.ketLuan)) { bao(`${x.id}: ketLuan lạ`); continue; }
    dem[x.ketLuan] = (dem[x.ketLuan] || 0) + 1; xong += 1;
    if (g(x.vi).length < 15) bao(`${x.id}: "vi" quá ngắn`);
    if (x.ketLuan === 'DUNG' && !(x.chungMinh && co(goi.chuGiai[c.nhomNguon] + '\n' + goi.chuGiai[c.nhomDich], x.chungMinh))) bao(`${x.id}: DUNG phải có "chungMinh" chép nguyên văn từ chú giải nhóm nguồn hoặc nhóm đích`);
    if (x.trichTotHon != null) {
      const t = x.trichTotHon; if (!t || ![`nhom${c.nhomNguon}.nhom`, `nhom${c.nhomDich}.nhom`].includes(t.nguon)) bao(`${x.id}: trichTotHon.nguon phải là nhom${c.nhomNguon}.nhom hoặc nhom${c.nhomDich}.nhom`);
      else { if (g(t.trich).length > 300) bao(`${x.id}: trichTotHon.trich dài quá 300 ký tự`); if (!co(goi.chuGiai[t.nguon.slice(4, 8)], t.trich)) bao(`${x.id}: trichTotHon.trich không nguyên văn`); }
    }
  }
  for (const id of can.keys()) if (!thay.has(id)) bao(`${f}: thiếu kết luận cho ${id}`);
}
console.log(`đã soát ${xong}, ${JSON.stringify(dem)}, lỗi ${loi}`); process.exit(loi ? 1 : 0);
