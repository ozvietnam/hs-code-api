#!/usr/bin/env node
/**
 * scripts/kiem-ban-do-4so.mjs — CỔNG MÁY của bản đồ 4 số (khuôn bd4@1). Tất định, KHÔNG gọi LLM.
 *   node scripts/kiem-ban-do-4so.mjs <tep.json> --goi=<goi.json>   kiểm một tệp Studio trả (JSON, mảng, hoặc văn bản có khối ```json)
 *   node scripts/kiem-ban-do-4so.mjs --ma-loi                      in danh sách mã lỗi
 * Gói `--goi=` là tệp .json do goi-soan-ban-do-4so.mjs --out= sinh (cùng gói đã đưa Studio). Mặc định còn đối chiếu hai chiều với
 * các bản đã nạp ở data/do-thi/ban-do-4so/ (--khong-doi-chieu để bỏ). Mã thoát: 0 không lỗi đỏ (vàng vẫn in) · 1 có lỗi đỏ · 2 dùng sai lệnh.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const GOC = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const B = require('../lib/do-thi/ban-do-4so.js');
const thamSo = (ten) => { const a = process.argv.find((x) => x.startsWith(`--${ten}=`)); return a ? a.slice(ten.length + 3) : null; };
const co = (c) => process.argv.includes(c);

export function docDaNap() {
  const dir = path.join(GOC, 'data/do-thi/ban-do-4so');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => /^\d{4}\.json$/.test(f)).map((f) => ({ ...JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')), __tep: f }));
}
export function inKetQua(kq) {
  for (const l of kq.loi) console.log(`✗ ${l.ma} [${l.nhom || '-'}] ${l.muc}: ${l.chiTiet}`);
  for (const v of kq.vang) console.log(`! ${v.ma} [${v.nhom || '-'}] ${v.muc}: ${v.chiTiet}`);
  console.log(`nhóm xanh: ${kq.nhomXanh.join(', ') || '(không)'} · nhóm đỏ: ${kq.nhomDo.join(', ') || '(không)'} · ${kq.loi.length} lỗi đỏ, ${kq.vang.length} cảnh báo vàng`);
}

const laChinh = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^.*\//, ''));
if (laChinh) {
  if (co('--ma-loi')) { for (const [k, v] of Object.entries(B.MA_LOI)) console.log(`${k}\t${v}`); for (const [k, v] of Object.entries(B.CANH_BAO)) console.log(`${k} (vàng)\t${v}`); process.exit(0); }
  const tep = process.argv.slice(2).find((a) => !a.startsWith('--')); const tepGoi = thamSo('goi');
  if (!tep || !tepGoi) { console.error('Dùng: node scripts/kiem-ban-do-4so.mjs <tep.json> --goi=<goi.json>'); process.exit(2); }
  let goi; let ban;
  try { goi = JSON.parse(fs.readFileSync(path.resolve(tepGoi), 'utf8')); } catch (e) { console.error(`không đọc được --goi: ${e.message}`); process.exit(2); }
  try { ban = B.docBanDo(fs.readFileSync(path.resolve(tep), 'utf8')); } catch (e) { console.error(`không đọc được tệp: ${e.message}`); process.exit(2); }
  const kq = B.kiemBanDo(ban, goi, { daNap: co('--khong-doi-chieu') ? [] : docDaNap() });
  inKetQua(kq);
  process.exit(kq.loi.length ? 1 : 0);
}
