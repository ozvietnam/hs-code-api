#!/usr/bin/env node
/**
 * scripts/kiem-tieu-chi-6.mjs — CỔNG MÁY của `tieuChi6` khuôn g6@1 (cạnh C10 / C13). Tất định, KHÔNG gọi LLM.
 * Lõi: lib/do-thi/tieu-chi-6.js#kiemTieuChi6. Hướng dẫn soạn: docs/giao-viec/do-thi/SOAN-TIEU-CHI-6-SO.md.
 *
 *   node scripts/kiem-tieu-chi-6.mjs                    kiểm MỌI sổ tay đã mang khuôn g6@1 (kiemTra.tieuChi6.khuon) — chạy trong npm test
 *   node scripts/kiem-tieu-chi-6.mjs --nhom=8481        kiểm tieuChi6 đang nằm trong data/so-tay/8481.json
 *   node scripts/kiem-tieu-chi-6.mjs --tep=<tệp JSON>   kiểm một bản soạn { "nhom": "…", "tieuChi6": [ … ] } trước khi áp
 *   … --json                                            in kết quả dạng JSON (cho vòng sửa tự động)
 *   node scripts/kiem-tieu-chi-6.mjs --ma-loi           liệt kê mã lỗi và ý nghĩa
 * Mã thoát: 0 không lỗi (cảnh báo không làm đỏ) · 1 có lỗi · 2 dùng sai lệnh.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const G6 = require('../lib/do-thi/tieu-chi-6.js');
const { dataReadPath } = require('../lib/data-paths.js');

const thamSo = (ten) => { const a = process.argv.find((x) => x.startsWith(`--${ten}=`)); return a ? a.slice(ten.length + 3) : null; };
const co = (c) => process.argv.includes(c);
const pt = (a, b) => (b ? `${((a / b) * 100).toFixed(1)}%` : '—');

/** In kết quả cổng cho người đọc: mỗi lỗi một dòng ✗ kèm ý nghĩa mã lỗi; cảnh báo kèm danh sách ca. */
export function inKetQua(h4, kq, ghi = console.log) {
  const tk = kq.thongKe || {};
  ghi(`── nhóm ${h4}: ${tk.soMuc ?? 0} mục / ${tk.soPhanNhom ?? 0} phân nhóm — ${kq.loi.length} lỗi, ${kq.canhBao.length} cảnh báo`);
  for (const l of kq.loi) ghi(`  ✗ ${l.ma}${l.hs6 ? ` [${l.hs6}]` : ''}${l.muc !== null ? ` mục #${l.muc}` : ''}: ${l.chiTiet}\n      ↳ ${G6.MA_LOI[l.ma] || ''}`);
  for (const [ten, d] of [['tờ khai mẫu', tk.toKhai], ['thông báo phân loại (tên hàng)', tk.thongBao], ['tờ khai mẫu — chế độ chặt, khớp nguyên cụm value', tk.toKhaiTheoValue]]) if (d) ghi(`  đo trên ${d.tong} ${ten} (luật khớp từ khoá): chỉ đúng ${d.dung} (${pt(d.dung, d.tong)}) · chỉ sai ${d.sai} (${pt(d.sai, d.tong)}) · không kết luận ${d.khongKetLuan} (${pt(d.khongKetLuan, d.tong)})`);
  for (const c of kq.canhBao) {
    ghi(`  ⚠ ${c.ma}${c.hs6 ? ` [${c.hs6}]` : ''}: ${c.chiTiet}\n      ↳ ${G6.CANH_BAO[c.ma] || ''}`);
    for (const x of c.ca || []) ghi(`      khai ${x.khai} · tiêu chí chỉ ${x.tieuChiChi} (khớp: ${x.cumKhop.join(' + ')}) · ${x.hang}`);
  }
}

/** Nhóm đã mang khuôn g6@1 trong data/so-tay/. */
export function nhomKhuonG6() {
  const thuMuc = dataReadPath('so-tay');
  const ra = [];
  for (const f of fs.readdirSync(thuMuc).filter((x) => /^\d{4}\.json$/.test(x)).sort()) {
    const chuoi = fs.readFileSync(path.join(thuMuc, f), 'utf8');
    if (!chuoi.includes(`"khuon": "${G6.KHUON}"`)) continue;
    const st = JSON.parse(chuoi);
    if (st?.kiemTra?.tieuChi6?.khuon === G6.KHUON) ra.push({ h4: f.slice(0, 4), tieuChi6: st.tieuChi6 });
  }
  return ra;
}

const laChinh = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (laChinh) {
  process.chdir(GOC);
  if (co('--ma-loi')) {
    for (const [k, v] of Object.entries(G6.MA_LOI)) console.log(`${k}\n    ${v}`);
    for (const [k, v] of Object.entries(G6.CANH_BAO)) console.log(`${k} (cảnh báo, không chặn)\n    ${v}`);
    process.exit(0);
  }
  let viec = [];
  const tep = thamSo('tep'); const nhom = thamSo('nhom');
  try {
    if (tep) { const b = JSON.parse(fs.readFileSync(path.resolve(tep), 'utf8')); viec = [{ h4: String(b.nhom || '').replace(/\D/g, ''), tieuChi6: b.tieuChi6 }]; }
    else if (nhom) viec = nhom.split(',').map((h) => h.replace(/\D/g, '')).map((h4) => ({ h4, tieuChi6: JSON.parse(fs.readFileSync(dataReadPath('so-tay', `${h4}.json`), 'utf8')).tieuChi6 }));
    else viec = nhomKhuonG6();
  } catch (e) { console.error(`không đọc được đầu vào: ${e.message}`); process.exit(2); }
  if (viec.some((v) => v.h4.length !== 4)) { console.error('thiếu "nhom" (4 số)'); process.exit(2); }
  const kqs = viec.map((v) => ({ nhom: v.h4, ...G6.kiemTieuChi6(v.h4, v.tieuChi6) }));
  if (co('--json')) console.log(JSON.stringify(kqs.length === 1 ? kqs[0] : kqs, null, 1));
  else { for (const k of kqs) inKetQua(k.nhom, k); console.log(`cổng tieuChi6 (${G6.KHUON}): ${kqs.length} nhóm, ${kqs.reduce((s, k) => s + k.loi.length, 0)} lỗi, ${kqs.reduce((s, k) => s + k.canhBao.length, 0)} cảnh báo`); }
  process.exit(kqs.some((k) => k.loi.length) ? 1 : 0);
}
