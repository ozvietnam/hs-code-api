#!/usr/bin/env node
/**
 * scripts/nap-ban-do-4so.mjs — NẠP bản đồ 4 số đã qua cổng vào data/do-thi/ban-do-4so/<nhóm>.json (nguonLoai AI_NHAP).
 *   node scripts/nap-ban-do-4so.mjs <tep.json> --goi=<goi.json> [--thu] [--ten-mo-hinh=<ten>]
 * Chỉ nạp nhóm XANH (0 lỗi đỏ) và nằm trong gói; nhóm đỏ bị bỏ, in lý do. Bản nạp mang chamCheo=null: cạnh C16 chỉ lên bậc 1 sau chấm chéo
 * (DUYET) — xem QUY-TRINH-BAN-DO-4SO.md. Nạp xong chạy: node scripts/dung-bang-canh.mjs --ghi (commit cùng PR).
 * Mã thoát: 0 · 1 có nhóm đỏ (nhóm xanh vẫn nạp) · 2 dùng sai lệnh.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { docDaNap, inKetQua } from './kiem-ban-do-4so.mjs';

const require = createRequire(import.meta.url);
const GOC = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const B = require('../lib/do-thi/ban-do-4so.js');
const thamSo = (ten) => { const a = process.argv.find((x) => x.startsWith(`--${ten}=`)); return a ? a.slice(ten.length + 3) : null; };

const tep = process.argv.slice(2).find((a) => !a.startsWith('--')); const tepGoi = thamSo('goi');
if (!tep || !tepGoi) { console.error('Dùng: node scripts/nap-ban-do-4so.mjs <tep.json> --goi=<goi.json> [--thu]'); process.exit(2); }
const goi = JSON.parse(fs.readFileSync(path.resolve(tepGoi), 'utf8'));
const ban = B.docBanDo(fs.readFileSync(path.resolve(tep), 'utf8'));
const kq = B.kiemBanDo(ban, goi, { daNap: docDaNap() });
inKetQua(kq);
const dir = path.join(GOC, 'data/do-thi/ban-do-4so');
const moi = new Map();
for (const b of ban) { const h = String(b && b.nhom || '').replace(/\D/g, ''); if (kq.nhomXanh.includes(h)) moi.set(h, b); } // cùng mã ⇒ bản cuối thắng
for (const [h, b] of moi) {
  const ghi = {
    nhom: h, khuon: B.KHUON, nguonLoai: 'AI_NHAP', chamCheo: null,
    taoBoi: { provider: 'google-studio', model: thamSo('ten-mo-hinh') || 'gemini (AI Studio)', goi: goi.bam },
    kieuNhom: b.kieuNhom, hoSo: b.hoSo, canh: b.canh, khongChac: b.khongChac,
  };
  const tepRa = path.join(dir, `${h}.json`);
  if (process.argv.includes('--thu')) { console.log(`(--thu) sẽ ghi ${path.relative(GOC, tepRa)}`); continue; }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(tepRa, `${JSON.stringify(ghi, null, 2)}\n`, 'utf8');
  console.log(`✓ đã ghi ${path.relative(GOC, tepRa)}`);
}
if (moi.size) console.log('Chạy tiếp: node scripts/dung-bang-canh.mjs --ghi');
process.exit(kq.nhomDo.length ? 1 : 0);
