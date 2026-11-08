#!/usr/bin/env node
/**
 * (#458) — test máy kiểm hướng biên (scripts/check-so-tay-bien.mjs) trên bộ mục GIẢ trong thư mục
 * tạm (--dir=), không đụng data/ thật. Phải bắt đúng lỗi "trở xuống" bị lưu ngược thành >= (lỗi
 * gốc của #458 ở 9 dòng), đọc đúng chữ SAU số ("trở lên"), khoảng "A đến B đơn vị", và KHÔNG dính
 * chữ biên của câu trước qua biên câu.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CHECK = path.join(ROOT, 'scripts', 'check-so-tay-bien.mjs');

let pass = 0; let fail = 0;
const check = (n, c, d) => { c ? (pass++, console.log(`PASS ${n}`)) : (fail++, console.log(`FAIL ${n}`, d === undefined ? '' : String(d).slice(0, 800))); };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'so-tay-bien-'));
process.on('exit', () => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* bỏ qua */ } });
const dkSo = (fact, op, value, donVi) => ({ fact, op, value, donVi });
const muc = (hs, trich, dieuKienSo) => ({ hs, trich, dieuKienSo, nguonLoai: 'AI_DA_KIEM', loaiKhac: false });

// nhóm "đúng" — mọi hướng biên khớp, phải exit 0
fs.writeFileSync(path.join(tmp, '0101.json'), JSON.stringify([
  muc('01019990', 'X - - Trọng lượng tịnh từ 2 kg trở xuống', [dkSo('khoi_luong', '<=', 2, 'kg')]),
  muc('01019991', 'X - - Trọng lượng tịnh từ 20 kg trở lên', [dkSo('khoi_luong', '>=', 20, 'kg')]),
  muc('01019992', 'X - - Có chiều rộng trên 230 mm nhưng không quá 385 mm', [dkSo('chieu_rong', '>', 230, 'mm'), dkSo('chieu_rong', '<=', 385, 'mm')]),
  muc('01019993', 'X - - Đường kính trong 1,3 - 2,5 mm', [dkSo('duong_kinh', '>=', 1.3, 'mm'), dkSo('duong_kinh', '<=', 2.5, 'mm')]),
  muc('01019994', 'Khối lượng không dưới 600 gram.\nKích thước: 35-120 cm', [dkSo('khoi_luong', '>=', 600, 'gram'), dkSo('kich_thuoc_toi_da', '<=', 120, 'cm')]),
  muc('01019995', 'X - - Có ít hơn 10% khối lượng lọt qua lưới 1mm', [dkSo('khoi_luong_qui_doi', '<', 10, '%')]),
  muc('01019996', 'X - - Đóng gói khối lượng tịnh trên 2 kg đến dưới 20 kg', [dkSo('khoi_luong', '>', 2, 'kg'), dkSo('khoi_luong', '<', 20, 'kg')]),
], null, 2));

// nhóm "lỗi" — đúng lỗi gốc #458: "trở xuống" lưu thành >=, và một ca lưu ngược chiều khoảng
fs.writeFileSync(path.join(tmp, '8481.json'), JSON.stringify([
  muc('84814010', 'X - - Bằng đồng, có đường kính trong từ 2,5 cm trở xuống', [dkSo('duong_kinh', '>=', 2.5, 'cm')]),
  muc('84818010', 'X - - Có chiều rộng 10 - 20 cm', [dkSo('chieu_rong', '>=', 20, 'cm')]),
], null, 2));

const chay = (dir) => spawnSync('node', [CHECK, `--dir=${dir}`], { encoding: 'utf8' });

const ok = chay(path.join(tmp)); // cả hai nhóm: nhóm 8481 có lỗi ⇒ exit 1
check('bộ có lỗi ⇒ exit 1', ok.status === 1, `status=${ok.status} ${ok.stdout}`);
check('bắt đúng lỗi trở xuống lưu ngược (84814010)', ok.stdout.includes('FAIL 8481 84814010'), ok.stdout);
check('bắt đúng lỗi chiều khoảng lưu ngược (84818010)', ok.stdout.includes('FAIL 8481 84818010'), ok.stdout);

const duong = path.join(tmp, 'duong');
fs.mkdirSync(duong);
fs.copyFileSync(path.join(tmp, '0101.json'), path.join(duong, '0101.json'));
const xanh = chay(duong);
check('bộ đúng ⇒ exit 0', xanh.status === 0, `status=${xanh.status} ${xanh.stdout}\n${xanh.stderr}`);
check('bộ đúng không có FAIL nào', !xanh.stdout.includes('FAIL'), xanh.stdout);
check('tổng điều kiện kiểm đúng 11', xanh.stdout.includes('11 điều kiện số'), xanh.stdout);

console.log(`test-check-so-tay-bien: ${pass} đạt, ${fail} trượt`);
process.exit(fail ? 1 : 0);
