#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * Máy kiểm từ vựng dữ kiện (L1-3a, #570; tu-vung@2 #577) — chạy trong `npm test`.
 *  0. tu-vung@2 (runtime) qua lược đồ và là SIÊU TẬP của tu-vung@1 (kiemSieuTap: mọi khoá @1 giống hệt, danh sách chung @1 là tiền
 *     tố). Bench lát 1 khoá băm theo @1 ⇒ mục 1–3 dưới vẫn kiểm trên tu-vung@1 (taiTuVung('tu-vung@1')).
 *  1. Lược đồ data/tu-vung/tu-vung@1.json (kiemTuVung): khoá trùng, kiểu lạ, thiếu nhãn Vi/En/Zh, thiếu câu hỏi Vi/Zh,
 *     viết tắt ngoài danh mục CEO, đơn vị chuẩn sai (chiều dài mm, hàng dài m), CO_KHONG thiếu phủ định, mẫu hỏng…
 *  2. Bảng ánh xạ 9 bộ từ vựng cũ data/tu-vung/anh-xa-cu.json (kiemAnhXaCu): khoá cũ có thật ở nguồn, khoá mới có thật.
 *  3. Độ phủ bộ đề lát 1 (doPhuBoDe): mọi dữ kiện quyết định của data/bench/ho-so-lat-1.json ánh xạ được về khoá
 *     tu-vung@1 đúng kiểu (data/bench/ho-so-lat-1.tu-vung.json); in khoá thiếu. Băm bộ đề phải khớp boDeSha256.
 * Chỉ đọc. Thoát 1 khi có lỗi.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const T = require('../lib/tu-vung.js');

const tv = T.taiTuVung(T.PHIEN_BAN_KHOA_BENCH); // tu-vung@1 — bench lát 1 khoá theo bản này
const tv2 = T.taiTuVung(); // runtime
const ax = JSON.parse(fs.readFileSync('data/tu-vung/anh-xa-cu.json', 'utf8'));
const boDe = JSON.parse(fs.readFileSync('data/bench/ho-so-lat-1.json', 'utf8'));
const axBoDe = JSON.parse(fs.readFileSync('data/bench/ho-so-lat-1.tu-vung.json', 'utf8'));

let loi = 0;
const bao = (ten, ds) => { console.log(`${ds.length ? 'FAIL' : 'PASS'} ${ten}${ds.length ? `: ${ds.slice(0, 30).join(', ')}${ds.length > 30 ? ` … (+${ds.length - 30})` : ''}` : ''}`); loi += ds.length ? 1 : 0; };

const theoKieu = {};
for (const k of tv.khoa) theoKieu[k.kieu] = (theoKieu[k.kieu] || 0) + 1;
console.log(`${tv2.phienBan} (runtime): ${tv2.khoa.length} khoá = ${tv.khoa.length} khoá ${tv.phienBan} + ${tv2.khoa.length - tv.khoa.length} khoá mới; sha256 ${T.phienBan().sha256.slice(0, 12)}`);
bao(`lược đồ ${tv2.phienBan}`, T.kiemTuVung(tv2));
bao(`${tv2.phienBan} là siêu tập của ${tv.phienBan} (khoá @1 giống hệt)`, T.kiemSieuTap(tv, tv2));
console.log(`${tv.phienBan}: ${tv.khoa.length} khoá — ${Object.entries(theoKieu).map(([k, n]) => `${k} ${n}`).join(', ')}; sha256 ${T.phienBan(tv.phienBan).sha256.slice(0, 12)}`);
bao('lược đồ tu-vung@1', T.kiemTuVung(tv));
console.log(`anh-xa-cu: ${ax.boTuVung.length} bộ, ${ax.boTuVung.reduce((n, b) => n + b.soTen, 0)} tên; ${Object.keys(ax.anhXa).length} khoá cũ + ${Object.keys(ax.anhXaGiaTri || {}).length} giá trị cũ ánh xạ về ${new Set([...Object.values(ax.anhXa), ...Object.values(ax.anhXaGiaTri || {}).map((v) => v.split('=')[0])]).size} khoá mới`);
bao('ánh xạ bộ từ vựng cũ', T.kiemAnhXaCu(ax, tv));
const r = T.doPhuBoDe(boDe, axBoDe, tv);
const dung = new Set(Object.keys(r.theoKhoa));
console.log(`bộ đề lát 1: ${r.daAnhXa}/${r.tong} dữ kiện quyết định ánh xạ đúng kiểu; dùng ${dung.size}/${tv.khoa.length} khoá; đọc thử (máy đọc chữ dữ kiện ra đúng giá trị ánh xạ): ${r.docThu.khop}/${r.docThu.thu}`);
bao('độ phủ dữ kiện quyết định của bộ đề lát 1 (khoá thiếu)', r.thieu);
bao('ánh xạ bộ đề đúng kiểu', r.loi);
bao('băm bộ đề khớp boDeSha256 của bảng ánh xạ', axBoDe.boDeSha256 === T.sha256Tep('data/bench/ho-so-lat-1.json') ? [] : ['bộ đề đã đổi — soát lại data/bench/ho-so-lat-1.tu-vung.json']);
process.exit(loi ? 1 : 0);
