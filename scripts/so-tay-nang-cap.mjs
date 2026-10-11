#!/usr/bin/env node
/**
 * Nâng cấp lược đồ sổ tay tại chỗ (#236 việc 2, 11/10/2026): chạy lại máy kiểm (lib/so-tay.js verifySoTay) trên từng
 * data/so-tay/<nhom>.json để gắn `nguonLoai` cho mọi mục, sinh khối `cay` (máy, từ chữ số của mã), `tieuChi6: []`,
 * `phamViLoaiKhac` cho dòng "Loại khác". Giữ nguyên taoBoi / kiemTra / bangQuyetDinh / yKienWco.
 * Không được làm rơi mục: nhóm nào có mục không còn kiểm được thì KHÔNG ghi, in ra để người xem.
 *   node scripts/so-tay-nang-cap.mjs [--nhom=8504,8509] [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIR = path.join(ROOT, 'data', 'so-tay');
const { verifySoTay, carryOverYKienWco } = require('../lib/so-tay.js');

const arg = (n) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : null; };
const only = arg('nhom') ? arg('nhom').split(',') : null;
const dry = process.argv.includes('--dry');
let ok = 0; let bo = 0;
for (const f of fs.readdirSync(DIR).filter((x) => /^\d{4}\.json$/.test(x)).sort()) {
  const h4 = f.slice(0, 4); if (only && !only.includes(h4)) continue;
  const file = path.join(DIR, f);
  const cu = JSON.parse(fs.readFileSync(file, 'utf8'));
  const { soTay, loai } = verifySoTay(cu, h4);
  if (loai.length) { bo += 1; console.log(`BỎ ${h4}: ${loai.length} mục không còn kiểm được — ${loai.map((x) => `${x.kind}:${x.lyDo}`).slice(0, 3).join('; ')}`); continue; }
  const moi = carryOverYKienWco(cu, {
    ...soTay,
    ...(cu.bangQuyetDinh ? { bangQuyetDinh: cu.bangQuyetDinh } : {}),
    taoBoi: cu.taoBoi || null,
    kiemTra: { ...(cu.kiemTra || {}), nangCap: { luc: new Date().toISOString().slice(0, 10), them: ['nguonLoai', 'cay', 'tieuChi6', 'phamViLoaiKhac'] } },
  });
  if (!dry) fs.writeFileSync(file, JSON.stringify(moi, null, 1));
  ok += 1;
}
console.log(`nâng cấp: ${ok} nhóm${dry ? ' (chạy khô)' : ''}, bỏ qua ${bo}`);
process.exit(bo ? 1 : 0);
