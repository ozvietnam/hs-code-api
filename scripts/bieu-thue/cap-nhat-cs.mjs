#!/usr/bin/env node
// Cập nhật trường `cs` (chính sách mặt hàng) của data/tax.json từ cột CY "Chính sách mặt hàng theo mã HS" của biểu
// thuế Tổng cục đã trích (data/bieu-thue/<phiên bản>/bieu-chinh.jsonl.gz) — đi qua cơ chế PHIÊN BẢN biểu thuế
// (lib/tariff-mutations.js uploadTariffMap → data/versions/ + thay tax.json), không sửa tay. CEO duyệt 12/10/2026.
// Chỉ đổi `cs`; mọi trường khác giữ nguyên. Chuỗi giữ nguyên văn, chỉ gọn khoảng trắng và chuẩn "; " giữa các mục.
//   node scripts/bieu-thue/cap-nhat-cs.mjs --phien-ban=2026.04.05 [--kho]   (--kho: chỉ in, không ghi)
import fs from 'node:fs';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { dataReadPath } = require('../../lib/data-paths.js');
const { uploadTariffMap } = require('../../lib/tariff-mutations.js');
const { phienBanMoiNhat } = require('../../lib/bieu-thue.js');

const arg = (k, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const ver = arg('phien-ban') || phienBanMoiNhat();
const kho = process.argv.includes('--kho');
if (!ver) { console.error('Chưa có data/bieu-thue/<phiên bản>/ — chạy trich.mjs trước'); process.exit(1); }

const gon = (s) => String(s || '').replace(/\s+/g, ' ').trim().split(/;\s*/).map((x) => x.trim()).filter(Boolean).join('; ');
const dong = zlib.gunzipSync(fs.readFileSync(join(ROOT, 'data', 'bieu-thue', ver, 'bieu-chinh.jsonl.gz'))).toString('utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((x) => x.soChuSo === 8);
const bieu = new Map();
for (const x of dong) { const v = gon(x.chinhSach); if (!bieu.has(x.maChuan)) bieu.set(x.maChuan, v); else if (bieu.get(x.maChuan) !== v) { console.error(`mã ${x.maChuan} lặp với chính sách khác nhau — dừng`); process.exit(1); } }

const tax = JSON.parse(fs.readFileSync(dataReadPath('tax.json'), 'utf8'));
let doi = 0, them = 0, bo = 0, khongCoTrongBieu = 0; const vd = [];
const moi = {};
for (const [hs, r] of Object.entries(tax)) {
  const cu = String(r.cs || ''); const b = bieu.get(hs);
  if (b === undefined) { khongCoTrongBieu += 1; moi[hs] = r; continue; }
  if (gon(cu) === b && cu === b) { moi[hs] = r; continue; }
  doi += 1; if (!cu && b) them += 1; if (cu && !b) bo += 1;
  if (vd.length < 5) vd.push({ hs, cu: cu.slice(0, 80), moi: b.slice(0, 80) });
  moi[hs] = { ...r, cs: b };
}
console.log(`biểu ${ver}: ${Object.keys(tax).length} mã tax.json; đổi cs ${doi} (thêm ${them}, bỏ trống ${bo}, sửa ${doi - them - bo}); không có trong biểu ${khongCoTrongBieu}`);
console.log(JSON.stringify(vd, null, 1));
if (kho) { console.log('--kho: không ghi'); process.exit(0); }
const label = `${ver.replace(/\./g, '-')}-cs`;
const r = uploadTariffMap(moi, { label, id: `v2-${label}`, replaceLive: true, setCurrent: true, source: `Biểu thuế XNK Tổng cục ${ver} — cập nhật cột Chính sách mặt hàng (cs) qua scripts/bieu-thue/cap-nhat-cs.mjs; các trường khác giữ nguyên v1-2026-01-01` });
console.log(`Đã ghi phiên bản ${r.entry.id} (${r.snapshotPath}), tax.json cập nhật: ${r.liveUpdated}`);
