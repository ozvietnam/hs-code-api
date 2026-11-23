#!/usr/bin/env node
/**
 * scripts/cham-cheo-ban-do-4so.mjs — CHẤM CHÉO bản đồ 4 số đã nạp (QUY-TRINH-BAN-DO-4SO.md bước 4). Tất định, KHÔNG gọi LLM.
 *   node scripts/cham-cheo-ban-do-4so.mjs --goi --nhom=a,b,…[≤12]   in gói chấm chéo (văn bản): mỗi nhóm kèm bản đồ đã nạp + đoạn luật mà từng căn cứ trích
 *   node scripts/cham-cheo-ban-do-4so.mjs --lo-tiep                  in 12 nhóm đã nạp mà chưa chấm chéo (gom thành gói kế tiếp)
 *   node scripts/cham-cheo-ban-do-4so.mjs --ap=<tep.json> [--thu]    áp kết quả chấm chéo: [{ "nhom": "8536", "ketQua": "DUYET|SUA|BO", "ghiChu": "…" }]
 * DUYET → chamCheo=DUYET (cạnh C16 lên bậc 1 nếu mọi căn cứ còn nguyên văn); SUA → chamCheo=SUA (giữ bậc 4, chờ soạn lại); BO → chamCheo=BO
 * (cạnh không vào bảng). Mọi kết quả khác bị từ chối. Nhóm không có bản đã nạp bị bỏ qua và in ra. Sau khi áp: node scripts/dung-bang-canh.mjs --ghi.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const GOC = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const B = require('../lib/do-thi/ban-do-4so.js');
const DIR = path.join(GOC, 'data/do-thi/ban-do-4so');
const thamSo = (ten) => { const a = process.argv.find((x) => x.startsWith(`--${ten}=`)); return a ? a.slice(ten.length + 3) : null; };
const co = (c) => process.argv.includes(c);
const doc = (h) => JSON.parse(fs.readFileSync(path.join(DIR, `${h}.json`), 'utf8'));
const dsNap = () => (fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => /^\d{4}\.json$/.test(f)).map((f) => f.slice(0, 4)).sort() : []);
const KET_QUA = ['DUYET', 'SUA', 'BO'];

if (co('--lo-tiep')) {
  console.log(dsNap().filter((h) => !doc(h).chamCheo).slice(0, 12).join(','));
} else if (co('--goi')) {
  const ds = (thamSo('nhom') || '').split(',').map((s) => s.replace(/\D/g, '')).filter((s) => s.length === 4);
  if (!ds.length || ds.length > 12) { console.error('Cần --nhom=a,b,… (1–12 nhóm)'); process.exit(2); }
  const L = [`# GÓI CHẤM CHÉO bản đồ 4 số (khuôn ${B.KHUON}) — ${ds.length} nhóm`, 'Với MỖI nhóm trả đúng một mục: { "nhom", "ketQua": "DUYET|SUA|BO", "loi": [ { "muc": "canh[2]", "vi": "lý do ngắn, dẫn chữ trong đoạn luật" } ], "ghiChu": "…" }. Gói chấm chéo chỉ để KIỂM; không soạn lại bản đồ.', ''];
  for (const h of ds) {
    if (!fs.existsSync(path.join(DIR, `${h}.json`))) { console.error(`${h}: chưa nạp, bỏ qua`); continue; }
    const b = doc(h);
    L.push(`######## NHÓM ${h} ########`, `Tên: ${B.tenNhom ? B.tenNhom(h).vi : ''}`, '```json', JSON.stringify({ kieuNhom: b.kieuNhom, hoSo: b.hoSo, canh: b.canh, khongChac: b.khongChac }, null, 1), '```', '--- Đoạn luật mà các căn cứ trích (để đối chiếu nghĩa, không chỉ chữ):');
    const ids = new Set();
    for (const t of Object.values(b.hoSo || {})) for (const x of t) ids.add(x.nguon);
    for (const c of b.canh || []) for (const cc of c.canCu || []) ids.add(cc.nguon);
    for (const id of [...ids].sort()) L.push(`[${id}] ${(B.vanBanTheoId(id)[0] || '(không còn trong kho)').slice(0, 900)}`);
    L.push('');
  }
  process.stdout.write(`${L.join('\n')}\n`);
} else if (thamSo('ap')) {
  const kq = JSON.parse(fs.readFileSync(path.resolve(thamSo('ap')), 'utf8'));
  let loi = 0;
  for (const k of Array.isArray(kq) ? kq : []) {
    const h = String(k && k.nhom || '').replace(/\D/g, '');
    const tep = path.join(DIR, `${h}.json`);
    if (!fs.existsSync(tep)) { console.log(`- ${h}: chưa nạp, bỏ qua`); loi += 1; continue; }
    if (!KET_QUA.includes(k.ketQua)) { console.log(`✗ ${h}: ketQua "${k.ketQua}" ngoài ${KET_QUA.join('|')}`); loi += 1; continue; }
    const b = doc(h);
    b.chamCheo = k.ketQua; b.chamCheoGhiChu = typeof k.ghiChu === 'string' ? k.ghiChu : undefined; b.chamCheoLoi = Array.isArray(k.loi) ? k.loi : undefined;
    if (co('--thu')) { console.log(`(--thu) ${h} → ${k.ketQua}`); continue; }
    fs.writeFileSync(tep, `${JSON.stringify(b, null, 2)}\n`, 'utf8');
    console.log(`✓ ${h} → ${k.ketQua}`);
  }
  console.log('Chạy tiếp: node scripts/dung-bang-canh.mjs --ghi');
  process.exit(loi ? 1 : 0);
} else { console.error('Dùng: --goi --nhom=… | --lo-tiep | --ap=<tep>'); process.exit(2); }
