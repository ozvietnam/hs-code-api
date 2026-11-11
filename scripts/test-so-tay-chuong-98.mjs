#!/usr/bin/env node
/**
 * Khung sổ tay Chương 98 (scripts/so-tay-chuong-98.mjs, OZV-374 / #1109) — tất định, không AI.
 *
 * Điều test này khoá, theo đúng thứ tự rủi ro:
 *   1. Khung sinh ra phải qua ĐỦ máy kiểm thường (`verifySoTay` không loại mục nào, `kiemCay` không lỗi) — không có
 *      lược đồ riêng, không có ngoại lệ cho chương 98.
 *   2. Khung KHÔNG được tự chốt mã: chưa có bản ranh giới 6→8 số đã DUYỆT thì `chotDong8` phải đổi lý do từ
 *      `nhom-chua-co-so-tay` sang `ranh-gioi-chua-so-hoa`/`ranh-gioi-so-chu-khong-tat-dinh` và chốt 0 mã. Đây là
 *      điều đáng sợ nhất khi thêm dữ liệu: trích sai mã tệ hơn không trích.
 *   3. Có bản ranh giới DUYET thì `apDung()` ghi được `dieuKienSo` vào khung, và sau đó máy chốt ĐÚNG mã
 *      (kỳ vọng vs máy, không chỉ "đã chốt được").
 *   4. Khung chỉ nhận chương 98, và không đè sổ tay đã có khi thiếu `--force`.
 */
import './test-isolate-data.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const S = require('../lib/so-tay.js');
const T = require('../lib/hs-tree.js');

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${typeof x === 'string' ? x : JSON.stringify(x)}`); } };

const WRITE = process.env.HS_DATA_DIR;
const chay = (...args) => execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'so-tay-chuong-98.mjs'), ...args], { cwd: ROOT, encoding: 'utf8', env: process.env });

// ── 1. Khung qua đủ máy kiểm thường ─────────────────────────────────────────────────────────────────────────────
// 9811 (2 dòng) và 9817 (3 dòng, có một dòng "Loại khác") — nhỏ, đủ hình dạng. `--force` vì `dataReadPath` rơi về
// data/ gốc: hai nhóm này đã có khung trong repo, test vẫn phải sinh lại vào thư mục ghi cách ly.
const out = chay('--force', '--nhom=9811,9817');
check('1a ghi được cả hai nhóm', /9811: 2\/2 dòng/.test(out) && /9817: 3\/3 dòng/.test(out), out);
check('1b ghi vào HS_DATA_DIR, không vào data/ thật', fs.existsSync(path.join(WRITE, 'so-tay', '9811.json')), WRITE);

for (const h4 of ['9811', '9817']) {
  const s = JSON.parse(fs.readFileSync(path.join(WRITE, 'so-tay', `${h4}.json`), 'utf8'));
  const la = T.tree().codes.filter((c) => c.startsWith(h4)).sort();
  check(`1c ${h4} đủ dòng 8 số của cây`, JSON.stringify(s.dong8.map((d) => d.hs)) === JSON.stringify(la), s.dong8.map((d) => d.hs));
  const { loai, tong, dat } = S.verifySoTay(s, h4);
  check(`1d ${h4} verifySoTay không loại mục nào (${dat}/${tong})`, loai.length === 0, loai.slice(0, 2));
  const kc = S.kiemCay(s, h4);
  check(`1e ${h4} kiemCay không lỗi`, kc.loi.length === 0, kc.loi.slice(0, 3));
  // Câu trích phải là tên dòng NGUYÊN VĂN của biểu, nguồn tax.<mã> — không bịa chú giải chương 98 (chương này không có).
  check(`1f ${h4} mọi dòng trích từ tax.<mã> của chính dòng`, s.dong8.every((d) => d.nguon === `tax.${d.hs}`), s.dong8.map((d) => d.nguon));
  check(`1g ${h4} không khai phạm vi/loại trừ bịa`, !s.phamVi && !s.loaiTru.length && !s.phanBiet.length && !s.dieuKienVao.length, Object.keys(s));
  check(`1h ${h4} loaiKhac do máy suy từ biểu`, s.dong8.every((d) => d.loaiKhac === S.isLoaiKhac(d.hs)), s.dong8.map((d) => `${d.hs}=${d.loaiKhac}`));
}

// ── 2. Khung KHÔNG tự chốt mã khi chưa có bản ranh giới DUYET ───────────────────────────────────────────────────
// Cache của so-tay-gates đọc theo đường dẫn, nên require SAU khi đã ghi khung.
const G = require('../lib/so-tay-gates.js');
const tenDong = (hs) => String((require('../data/tax.json')[hs] || {}).vn || '').replace(/^[-\s–]+/, '').trim();

const r9811 = G.chotDong8({ hs: '981100', productText: tenDong('98110010') });
check('2a khung đổi lý do khỏi nhom-chua-co-so-tay', r9811.lyDo !== 'nhom-chua-co-so-tay', r9811);
check('2b khung một mình KHÔNG chốt mã', r9811.ketQua === 'KHONG_THE_CHOT' && /^ranh-gioi-/.test(String(r9811.lyDo)), r9811);

// Nhóm 98 CHƯA sinh khung vẫn phải báo nhom-chua-co-so-tay (khung không rò sang nhóm khác).
const chuaCo = G.chotDong8({ hs: '984900', productText: 'linh kiện ô tô' });
check('2c nhóm 98 chưa có khung vẫn nhom-chua-co-so-tay', chuaCo.lyDo === 'nhom-chua-co-so-tay', chuaCo);

// ── 3. Có bản ranh giới DUYET ⇒ apDung ghi điều kiện vào khung, máy chốt ĐÚNG mã ─────────────────────────────────
// Bản ranh giới dựng tại chỗ (không phụ thuộc lô L33 đã gộp chưa): hai dòng 9811 khác nhau ĐÚNG ở mã hàng tương ứng
// (98110010 ↔ 72.24–72.28, 98110090 ↔ 72.29) — chính hình dạng riêng của chương 98.
const C = require('../lib/ho-so/cong-ranh-gioi.js');
const src9811 = S.sourcesFor('9811');
const rgDong = (hs, ma) => ({
  hs,
  nguon: `tuongUng.${hs}`,
  trich: src9811[`tuongUng.${hs}`],
  dieuKienSo: [{ fact: 'maHsTuongUng', op: 'CONG_DUNG', value: ma }],
  nguonLoai: 'AI_DA_KIEM',
});
let banNhap = {
  phienBan: 'ranh-gioi@1',
  pn6: '981100',
  nhom: '9811',
  bieuThue: '2026.04.05',
  tuVung: require('../lib/tu-vung.js').taiTuVung().phienBan,
  trangThai: 'NHAP',
  soanBoi: { vai: 'AI', phien: 'test:so-tay-chuong-98#soan-981100', ngay: '2026-11-11' },
  duyet: null,
  dieuKienNut: [],
  dong8: [rgDong('98110010', ['72.24', '72.25', '72.26', '72.27', '72.28']), rgDong('98110090', ['72.29'])],
  ghiChuSoan: [],
};
let apDungOk = false; let loiApDung = '';
fs.mkdirSync(path.join(WRITE, 'ho-so', 'ranh-gioi'), { recursive: true });
try {
  // Phiên duyệt phải KHÁC phiên soạn (cổng cong0-tu-duyet: người soạn không tự duyệt).
  banNhap = C.duyet(banNhap, { phien: 'test:so-tay-chuong-98-soat#soat-981100', ngay: '2026-11-11' });
  const khung = JSON.parse(fs.readFileSync(path.join(WRITE, 'so-tay', '9811.json'), 'utf8'));
  const moi = C.apDung(banNhap, khung);
  fs.writeFileSync(path.join(WRITE, 'ho-so', 'ranh-gioi', '981100.json'), `${JSON.stringify(banNhap, null, 2)}\n`, { flag: 'w' });
  fs.writeFileSync(path.join(WRITE, 'so-tay', '9811.json'), `${JSON.stringify(moi, null, 1)}\n`);
  apDungOk = moi.dong8.every((d) => Array.isArray(d.dieuKienSo) && d.dieuKienSo.length) && moi.dong8.every((d) => d.nguonLoai === 'CLAUDE_DUYET');
} catch (e) { loiApDung = e.message; }
check('3a apDung ghi được bản DUYET vào khung Chương 98', apDungOk, loiApDung);
// Không được vướng cổng cong3-mat-nguong-so: khung không mang điều kiện số nào nên không thể làm mất ngưỡng.
check('3b apDung không vướng cong3-mat-nguong-so', !/cong3-mat-nguong-so/.test(loiApDung), loiApDung);

if (apDungOk) {
  // Ghi lại rồi đọc trong tiến trình con: cache loadSoTay/loadRanhGioiDuyet của tiến trình này đã giữ bản cũ.
  const doChot = execFileSync(process.execPath, ['-e', `
    const G = require(${JSON.stringify(path.join(ROOT, 'lib', 'so-tay-gates.js'))});
    const ca = [['98110010','mã hàng tương ứng 72.24'], ['98110090','mã hàng tương ứng 72.29']];
    const out = ca.map(([kyVong, tt]) => { const r = G.chotDong8({ hs: '981100', productText: 'Thép hợp kim có chứa nguyên tố Bo, ' + tt }); return { kyVong, may: r.hs || null, ketQua: r.ketQua }; });
    console.log(JSON.stringify(out));
  `], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, HS_DATA_DIR: WRITE } });
  const kq = JSON.parse(doChot.trim().split('\n').pop());
  check('3c máy chốt ĐÚNG mã sau khi áp bản DUYET', kq.every((x) => x.ketQua === 'CHOT' && x.may === x.kyVong), kq);
}

// ── 4. Rào dùng sai ─────────────────────────────────────────────────────────────────────────────────────────────
let maThoat = 0; let loiOut = '';
try { chay('--nhom=8509'); } catch (e) { maThoat = e.status; loiOut = String(e.stderr || ''); }
check('4a từ chối nhóm ngoài Chương 98', maThoat === 2 && /CHỈ cho Chương 98/.test(loiOut), `${maThoat} ${loiOut.slice(0, 80)}`);

let maThoat2 = 0; let loiOut2 = '';
try { chay(); } catch (e) { maThoat2 = e.status; loiOut2 = String(e.stderr || ''); }
check('4b thiếu tham số thì hướng dẫn, không ghi bừa', maThoat2 === 2 && /co-ranh-gioi/.test(loiOut2), `${maThoat2} ${loiOut2.slice(0, 80)}`);

// 9808 chưa có khung trong repo: lượt đầu phải ghi, lượt sau (thiếu --force) phải GIỮ bản vừa ghi.
const lan1 = chay('--nhom=9808');
const lan2 = chay('--nhom=9808');
check('4c lượt đầu ghi, lượt sau GIỮ khi thiếu --force', /9808: 2\/2 dòng/.test(lan1) && /9808: GIỮ/.test(lan2), `${lan1} || ${lan2}`);

console.log(`\nkhung sổ tay Chương 98: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
