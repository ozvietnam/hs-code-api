#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * Chấm NGOẠI TUYẾN luật tất định trước khi chốt (lib/kiem-truoc-chot.js, #725 lỗi 46), KHÔNG gọi LLM.
 * Bộ đề: mặt hàng Oz (data/oz-gold-final.jsonl — tên hàng + chất liệu + công dụng, đáp án 8 số).
 *   - BÁO OAN: giả định máy đã chốt ĐÚNG đáp án; ứng viên = mọi dòng 8 số cùng nhóm 4 số (bể ứng viên xấu nhất). Luật bắn = oan
 *     (chốt đúng mà bị hạ CHOT → DE_XUAT).
 *   - BẮT ĐÚNG: đáp án là dòng CÓ TÊN mà một dòng "Loại khác" khác trong cùng phân nhóm 6 số loại trừ nó (đúng dạng ca #725-46);
 *     giả định máy chốt nhầm sang dòng "Loại khác" đó. Luật bắn = cờ đúng; mã đề nghị chứa đáp án = top-3 có đáp án (trước: không).
 * Không ghi tên hàng ra tệp. In tỉ lệ + vài mã oan để soi.
 *   node scripts/bench-kiem-truoc-chot.mjs [--limit=N] [--kiem]   # --kiem: thoát 1 nếu oan > NGUONG_OAN
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const T = require('../lib/hs-tree.js');
const { taxData } = require('../lib/data.js');
const K = require('../lib/kiem-truoc-chot.js');

const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const LIMIT = Number(arg('limit', 0)) || Infinity;
const KIEM = process.argv.includes('--kiem');
const NGUONG_OAN = 0.03;
const d = (v) => String(v || '').replace(/\D/g, '');
const codes8 = Object.keys(taxData).filter((k) => k.length === 8);
const trongNhom = new Map();
for (const k of codes8) { const h = k.slice(0, 4); if (!trongNhom.has(h)) trongNhom.set(h, []); trongNhom.get(h).push(k); }

const items = [];
for (const l of fs.readFileSync('data/oz-gold-final.jsonl', 'utf8').trim().split('\n')) {
  const g = JSON.parse(l); const hs = d(g.hsCode);
  if (hs.length !== 8 || !taxData[hs] || !g.tenHang) continue;
  items.push({ truth: hs, hang: { tenHang: g.tenHang, moTa: [g.tenHang, g.chatLieu, g.congDung].filter(Boolean).join('. ') } });
  if (items.length >= LIMIT) break;
}

let n = 0; let oan = 0; const oanMa = new Map(); const oanLoai = { tienLe: 0, loaiKhac: 0 };
let nBat = 0; let bat = 0; let batDung = 0;
for (const it of items) {
  n += 1;
  const r = K.kiemTruocChot({ topHs: it.truth, hang: it.hang, ungVien: trongNhom.get(it.truth.slice(0, 4)) || [] });
  if (r.coCo) {
    oan += 1; oanMa.set(it.truth, (oanMa.get(it.truth) || 0) + 1);
    if (r.canhBao.some((c) => c.ma === 'TIEN_LE_CUNG_LOAI_KHAC_MA')) oanLoai.tienLe += 1;
    if (r.canhBao.some((c) => c.ma === 'NGHI_LOAI_KHAC_THUOC_DONG_BI_TRU')) oanLoai.loaiKhac += 1;
  }
  // BẮT ĐÚNG: dòng "Loại khác" trong cùng phân nhóm 6 số mà phạm vi loại trừ đáp án (truDayDu chứa đáp án hoặc tổ tiên của nó).
  const node = T.nodeOf(it.truth);
  if (!node || node.loaiKhac) continue;
  const toTien = new Set([it.truth, ...T.ancestorsOf(it.truth).map((x) => x.id)]);
  const lk = codes8.filter((k) => k.startsWith(it.truth.slice(0, 6)) && k !== it.truth && T.nodeOf(k)?.loaiKhac)
    .find((k) => (T.loaiKhacOf(k)?.truDayDu || []).some((x) => toTien.has(x)));
  if (!lk) continue;
  nBat += 1;
  const r2 = K.kiemTruocChot({ topHs: lk, hang: it.hang, ungVien: [] });
  if (r2.coCo) { bat += 1; if (r2.deXuat.some((x) => x.hs === it.truth)) batDung += 1; }
}
const pct = (a, b) => (b ? `${((a / b) * 100).toFixed(1)}%` : '—');
console.log(`=== kiem-truoc-chot (ngoại tuyến, oz-gold) ===`);
console.log(`BÁO OAN (chốt đúng mà bị hạ): ${oan}/${n} = ${pct(oan, n)}  (tiền lệ ${oanLoai.tienLe}, "Loại khác" ${oanLoai.loaiKhac})`);
console.log(`  mã oan nhiều nhất: ${[...oanMa.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k}×${v}`).join(', ') || '—'}`);
console.log(`BẮT ĐÚNG (chốt nhầm sang "Loại khác"): cờ ${bat}/${nBat} = ${pct(bat, nBat)}; mã đề nghị chứa đáp án ${batDung}/${nBat} = ${pct(batDung, nBat)} (trước: 0)`);
if (KIEM && n && oan / n > NGUONG_OAN) { console.log(`FAIL oan ${pct(oan, n)} > ${NGUONG_OAN * 100}%`); process.exit(1); }
