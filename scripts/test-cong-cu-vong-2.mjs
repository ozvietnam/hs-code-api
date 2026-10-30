// Cổng ranh giới 6→8 số — vòng gia cố 2 (#653: vướng từ lô Claude giữ, #652). Mỗi mục kèm test đỏ trước.
// Bản nháp viết tay trên phân nhóm thật (cây + biểu thuế + nguồn nguyên văn thật), không đọc data/bench/, data/oz-export/.
import './test-isolate-data.mjs';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const C = require('../lib/ho-so/cong-ranh-gioi.js');
const ML = require('../lib/ho-so/ma-loi.js');

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${typeof x === 'string' ? x : JSON.stringify(x)}`); } };
const coLoi = (r, tien) => r.loi.some((l) => l.startsWith(tien));
const coCanh = (r, tien) => r.canhBao.some((l) => l.startsWith(tien));
const docNhap = (pn6) => JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/ho-so/ranh-gioi', `${pn6}.json`), 'utf8'));
const cli = (...a) => spawnSync(process.execPath, ['scripts/so-hoa-ranh-gioi.mjs', ...a], { encoding: 'utf8', env: process.env });

// ── 1. Bảng hiệu chỉnh tiền lệ đã có mục cho PN6 ⇒ KHÔNG DỪNG; chỉ DỪNG khi có cờ mà bảng chưa có mục ──────────────
{
  // 630790: cờ canHieuChinhTienLe, bảng data/ho-so/hieu-chinh-tien-le.json đã có mục 630790-* (#617), bản nháp xanh.
  check('1a 630790 có cờ + bảng có mục', C.canHieuChinh('630790') && C.coHieuChinh('630790'));
  const r = C.kiemRanhGioi('630790', docNhap('630790'));
  check('1b bảng có mục ⇒ không DỪNG (dung rỗng)', r.hopLe && r.dung.length === 0, r.dung);
  check('1c … chỉ còn cảnh báo thông tin can-bang-hieu-chinh-tien-le-da-co:630790', coCanh(r, 'can-bang-hieu-chinh-tien-le-da-co:630790') && !ML.laDung('can-bang-hieu-chinh-tien-le-da-co:630790'), r.canhBao);
  const k = cli('--kiem', '--pn6=630790');
  check('1d CLI --kiem 630790 mã thoát 0 (trước #653: 3 DỪNG)', k.status === 0, k.stdout.slice(-400));
  // Bảng (trong thư mục ghi của test) không có mục cho 630790 ⇒ DỪNG.
  const tep = path.join(process.env.HS_DATA_DIR, 'ho-so', 'hieu-chinh-tien-le.json');
  const that = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/ho-so/hieu-chinh-tien-le.json'), 'utf8'));
  fs.mkdirSync(path.dirname(tep), { recursive: true });
  fs.writeFileSync(tep, JSON.stringify({ ...that, muc: that.muc.filter((m) => !String(m.maHs).startsWith('630790') && !String(m.dongChuBieu || '').startsWith('630790')) }));
  try {
    const r2 = C.kiemRanhGioi('630790', docNhap('630790'));
    check('1e cờ mà bảng chưa có mục ⇒ DỪNG can-bang-hieu-chinh-tien-le:630790:chua-co', r2.dung.some((d) => d.startsWith('can-bang-hieu-chinh-tien-le:630790:chua-co')), r2.dung);
    const k2 = cli('--kiem', '--pn6=630790');
    check('1f CLI --kiem mã thoát 3 khi bảng chưa có mục', k2.status === 3, k2.status);
  } finally { fs.rmSync(tep, { force: true }); }
  const g = cli('--giai-thich=can-bang-hieu-chinh-tien-le:630790:chua-co (L1-4b)');
  check('1g --giai-thich chua-co: nói bảng CHƯA CÓ MỤC cho PN6 (không còn "chưa có bảng hiệu chỉnh")', g.status === 0 && /chưa có mục/i.test(g.stdout) && !/khi chưa có bảng hiệu chỉnh/.test(g.stdout), g.stdout);
  const g2 = cli('--giai-thich=can-bang-hieu-chinh-tien-le-da-co:630790');
  check('1h --giai-thich da-co: không DỪNG, nói bảng đã có mục', g2.status === 0 && /đã có mục/i.test(g2.stdout) && !/DỪNG/.test(g2.stdout), g2.stdout);
  check('1i gói soạn ghi coHieuChinhTienLe (CLI --goi không còn in "DỪNG, Claude giữ" khi bảng đã có mục)', C.goiSoan('630790').coHieuChinhTienLe === true && !/DỪNG, Claude giữ/.test(cli('--goi', '--pn6=630790').stdout));
}

console.log(`\n${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
