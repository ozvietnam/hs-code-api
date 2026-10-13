#!/usr/bin/env node
/**
 * BƯỚC 1 của skill bieu-thue-xnk — KHÁM PHÁ tệp biểu thuế trước khi trích: in hồ sơ (profile) để NGƯỜI đọc và xác nhận
 * máy đã hiểu đúng cấu trúc (sheet nào, tiêu đề cột ở dòng nào, cột nào nhận ra/cột lạ, bao nhiêu dòng mã/tiêu đề/khác,
 * bảo toàn ô). Không ghi gì vào data/. Hồ sơ ghi ra --out (mặc định data/oz-export/bieu-thue-profile-<sha8>.json, gitignored).
 *   node scripts/bieu-thue/kham-pha.mjs --file=data/oz-export/BIEU-THUE-XNK-2026.04.05.xlsx [--out=…] [--mau=5]
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const B = require('../../lib/bieu-thue.js');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const file = arg('file'); if (!file || !fs.existsSync(file)) { console.error('Cần --file=<đường dẫn .xlsx>'); process.exit(2); }
const MAU = Number(arg('mau', '5')) || 5;

const t0 = Date.now();
const tho = B.docTho(file);
const kq = B.trich(tho);
const profile = { tep: tho.tep, sha256: tho.sha256, kichThuoc: fs.statSync(file).size, docMs: Date.now() - t0, sheets: [], khongNhanRa: kq.khongNhanRa };
console.log(`Tệp ${tho.tep} (${(profile.kichThuoc / 1048576).toFixed(1)} MB) sha256 ${tho.sha256.slice(0, 12)}… — ${tho.sheets.length} sheet, đọc ${profile.docMs} ms\n`);
for (const sh of kq.sheets) {
  const tho1 = tho.sheets.find((s) => s.ten === sh.ten);
  const dem = (k) => sh.dong.filter((d) => d.soChuSo === k).length;
  const p = { ten: sh.ten, an: sh.an, phamVi: tho1.pham_vi, oGop: tho1.gop.length, tieuDeCot: sh.tieuDeCot, cot: sh.cot, dongMa: { tong: sh.dong.length, so2: dem(2), so4: dem(4), so6: dem(6), so8: dem(8), so10: dem(10) }, tieuDe: { tong: sh.tieuDe.length, theoGach: {} }, khac: sh.khac.length, baoToan: sh.baoToan,
    mauDong: sh.dong.slice(0, MAU), mauTieuDe: sh.tieuDe.slice(0, MAU), mauKhac: sh.khac.slice(0, MAU) };
  for (const t of sh.tieuDe) p.tieuDe.theoGach[t.gach] = (p.tieuDe.theoGach[t.gach] || 0) + 1;
  profile.sheets.push(p);
  console.log(`== Sheet "${sh.ten}"${sh.an ? ' (ẩn)' : ''} ${tho1.pham_vi}, ô gộp ${tho1.gop.length}, tiêu đề cột ở dòng ${sh.tieuDeCot[0]}–${sh.tieuDeCot[1]}`);
  console.log(`   dòng mã: ${sh.dong.length} (2 số ${p.dongMa.so2}, 4 số ${p.dongMa.so4}, 6 số ${p.dongMa.so6}, 8 số ${p.dongMa.so8}, 10 số ${p.dongMa.so10}) · tiêu đề không mã: ${sh.tieuDe.length} (theo gạch ${JSON.stringify(p.tieuDe.theoGach)}) · dòng khác: ${sh.khac.length}`);
  console.log(`   BẢO TOÀN Ô: ${sh.baoToan.oDaGhi}/${sh.baoToan.oKhongRong} ${sh.baoToan.du ? 'ĐỦ' : '!!! THIẾU — phải sửa lib/bieu-thue.js trước khi trích'}`);
  console.log('   cột:');
  for (const c of sh.cot) console.log(`     ${c.cot.padEnd(3)} ${(c.khoa || (c.khoaNghi ? `? (nghi ${c.khoaNghi})` : 'LẠ — giữ nguyên')).padEnd(18)} «${c.tieuDe.slice(0, 90)}»`);
  console.log(`   mẫu dòng mã: ${sh.dong.slice(0, MAU).map((d) => `${d.ma} ${d.moTaVi.slice(0, 40)}… ${JSON.stringify(d.thue)}`).join('\n                ')}`);
  console.log(`   mẫu tiêu đề: ${sh.tieuDe.slice(0, MAU).map((t) => `[r${t.r} gạch ${t.gach}] ${t.chu.slice(0, 60)} (trước ${t.maTruoc || '-'} → sau ${t.maSau || '-'})`).join('\n                ')}\n`);
}
for (const s of kq.khongNhanRa) console.log(`== Sheet "${s.ten}" KHÔNG nhận ra tiêu đề cột: ${s.soDong} dòng, ${s.soO} ô — xem mẫu trong hồ sơ, quyết định: bỏ qua có ý thức hay thêm luật nhận dạng.`);
const out = arg('out', path.join('data', 'oz-export', `bieu-thue-profile-${tho.sha256.slice(0, 8)}.json`));
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(profile, null, 1));
console.log(`\nHồ sơ: ${out} — đọc kỹ cột LẠ và sheet không nhận ra rồi mới chạy trich.mjs.`);
