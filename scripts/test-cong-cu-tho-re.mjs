// Cổng ranh giới 6→8 số — gia cố cho thợ rẻ (agent mô hình yếu soạn một PN6, Claude soát). Mỗi mục kèm test đỏ trước.
// Bản nháp viết tay trên phân nhóm thật (cây + biểu thuế + nguồn nguyên văn thật), không đọc data/bench/, data/oz-export/.
import './test-isolate-data.mjs';
import fs from 'fs';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const C = require('../lib/ho-so/cong-ranh-gioi.js');

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${typeof x === 'string' ? x : JSON.stringify(x)}`); } };
const clone = (x) => JSON.parse(JSON.stringify(x));
const coLoi = (r, tien) => r.loi.some((l) => l.startsWith(tien));
const coCanh = (r, tien) => r.canhBao.some((l) => l.startsWith(tien));
const PHIEN = 'https://claude.ai/code/session_TEST#soan-test';

/** Khung nháp thật + điều kiện theo mã: {ma: dieuKienSo | {dieuKienSo, trich, ...}}. Trích mặc định = chữ nguyên văn của chính mục. */
function nhap(pn6, dk = {}, extra = {}) {
  const b = C.taoKhung(pn6, { phien: PHIEN, ngay: '2026-10-30' });
  for (const m of [...b.dong8, ...b.dieuKienNut]) {
    const v = dk[m.hs || m.id]; if (!v) continue;
    if (Array.isArray(v)) m.dieuKienSo = v; else Object.assign(m, v);
  }
  for (const [ma, v] of Object.entries(dk)) {
    if (b.dong8.some((m) => m.hs === ma) || b.dieuKienNut.some((m) => m.id === ma)) continue;
    b.dieuKienNut.push({ id: ma, nguon: `tieuDe.${ma}`, trich: null, nguonLoai: 'AI_DA_KIEM', ...(Array.isArray(v) ? { dieuKienSo: v } : v) });
  }
  return { ...b, ...extra };
}
const TEN = (v) => ({ fact: 'tenLoai', op: 'TEN_LOAI', value: v });
const DUNG = (v) => ({ fact: 'dungCho', op: 'CONG_DUNG', value: v });
const SO = (fact, op, value, donVi) => ({ fact, op, value, donVi });

// ── 1. Tầng không mã (tiêu đề không mã của biểu thuế mà cây theo chữ số làm mất) ─────────────────────────────────
// 848310: "- - - Loại khác:" (không mã) nằm giữa .24 và .25–.27 → trục cam xe máy ≤ 2.000 cc thoả cả .24 lẫn .25.
const nhap848310 = () => nhap('848310', {
  84831010: [DUNG('nhóm 84.29 hoặc 84.30')],
  8483102: [TEN(['Trục cam', 'trục khuỷu']), DUNG('động cơ xe của Chương 87')],
  84831024: [DUNG('xe thuộc nhóm 87.11')],
  84831025: [SO('dungTichXiLanh', '<=', 2000, 'cc')],
  84831026: [SO('dungTichXiLanh', '>', 2000, 'cc'), SO('dungTichXiLanh', '<=', 3000, 'cc')],
  84831027: [SO('dungTichXiLanh', '>', 3000, 'cc')],
  8483103: [DUNG('động cơ máy thủy')],
  84831031: [SO('congSuat', '<=', 22.38, 'kW')],
});
{
  const g = C.goiSoan('848310');
  const t = (g.tangKhongMa || []).find((x) => x.r === 14616);
  check('1a --goi 848310 liệt kê tầng không mã r14616 "Loại khác:" phủ .25/.26/.27', t && /Loại khác/.test(t.chu) && ['84831025', '84831026', '84831027'].every((h) => t.dongDuoi.includes(h)) && !t.dongDuoi.includes('84831024'), g.tangKhongMa);
  const r = C.kiemRanhGioi('848310', nhap848310());
  check('1b bản nháp 848310 "kiểu hôm nay" KHÔNG được xanh', r.hopLe === false, r.loi);
  check('1c … lỗi cong1-tang-khong-ma ở từng dòng dưới tầng không mã', ['84831025', '84831026', '84831027'].every((h) => r.loi.includes(`cong1-tang-khong-ma:${h}:r14616`)), r.loi);
  check('1d … không báo dòng ngoài tầng (.24, .31)', !r.loi.some((l) => /^cong1-tang-khong-ma:(84831024|84831031):/.test(l)), r.loi);

  for (const [pn6, hs, row] of [['841459', '84145910', 13180], ['841459', '84145950', 13187], ['850110', null, 14839], ['848180', null, 14551], ['854442', '85444232', 16065], ['950300', '95030022', 18723], ['950300', '95030091', 18732]]) {
    const gg = C.goiSoan(pn6);
    check(`1e --goi ${pn6} có tầng không mã r${row}`, (gg.tangKhongMa || []).some((x) => x.r === row), (gg.tangKhongMa || []).map((x) => x.r));
    const rr = C.kiemRanhGioi(pn6, C.taoKhung(pn6, { phien: PHIEN }));
    check(`1f cổng 1 ${pn6} báo cong1-tang-khong-ma …:r${row}`, rr.loi.some((l) => l.startsWith('cong1-tang-khong-ma:') && l.endsWith(`:r${row}`) && (!hs || l.includes(`:${hs}:`))), rr.loi.filter((l) => l.startsWith('cong1-tang')));
  }
  const g0 = C.goiSoan('841350');
  check('1g phân nhóm không có tầng không mã → tangKhongMa rỗng', Array.isArray(g0.tangKhongMa) && g0.tangKhongMa.length === 0, g0.tangKhongMa);
  const out = execFileSync(process.execPath, ['scripts/so-hoa-ranh-gioi.mjs', '--goi', '--pn6=848310'], { encoding: 'utf8', env: process.env });
  check('1h --goi dạng chữ in DỪNG + tầng không mã', /DỪNG/.test(out) && /tầng không mã/i.test(out) && /r14616/.test(out), out.slice(0, 400));
}

// ── 2. Cổng 1 phủ kín: chỉ thử vector THOẢ điều kiện của tầng cha ────────────────────────────────────────────────
// 851810: tiêu đề 8518101 "Micro" (tenLoai Micro) có hai con .11 và .19 "Micro khác…" — vector tenLoai=<chữ lạ> trái điều
// kiện của chính tiêu đề nên không phải lỗ hổng của tầng.
{
  const b = nhap('851810', { 8518101: [TEN('Micro')], 85181011: [TEN('Micro'), SO('duongKinh', '<=', 10, 'mm')], 85181019: [TEN('Micro')] });
  const r = C.kiemRanhGioi('851810', b);
  check('2a 851810: không còn cong1-khong-phu-kin giả ở tầng 8518101 (vector trái điều kiện tiêu đề bị bỏ)', !coLoi(r, 'cong1-khong-phu-kin:8518101'), r.loi);
  const b2 = nhap('851810', { 8518101: [TEN('Micro')], 85181011: [TEN('Micro'), SO('duongKinh', '<=', 10, 'mm')], 85181019: [TEN('Micro'), SO('duongKinh', '<=', 10, 'mm')] });
  b2.dong8.find((m) => m.hs === '85181019').trich = b2.dong8.find((m) => m.hs === '85181011').trich;
  b2.dong8.find((m) => m.hs === '85181019').nguon = 'tax.85181011';
  const r2 = C.kiemRanhGioi('851810', b2);
  check('2b lỗ hổng THẬT trong vùng của tiêu đề (Micro, đường kính > 10 mm) vẫn bị báo', coLoi(r2, 'cong1-khong-phu-kin:8518101:') && r2.loi.some((l) => l.startsWith('cong1-khong-phu-kin:8518101:') && l.includes('tenLoai=Micro')), r2.loi);
}

console.log(`\n${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
