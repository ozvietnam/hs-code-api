#!/usr/bin/env node
/**
 * scripts/chay-danh-sach-test.mjs — Bộ chạy danh sách lệnh test từ `scripts/danh-sach-test.txt` (S-8, #1567).
 *
 * Dùng:
 *   node scripts/chay-danh-sach-test.mjs                  # chạy từ lệnh 1, dừng ngay khi có lệnh lỗi (giống `&&`)
 *   node scripts/chay-danh-sach-test.mjs --tu=<n>         # chạy tiếp từ lệnh thứ n (1-based)
 *   node scripts/chay-danh-sach-test.mjs --khong-dung     # chạy hết mọi lệnh còn lại rồi tổng kết các lệnh lỗi
 *   node scripts/chay-danh-sach-test.mjs --danh-sach=<f>  # dùng tệp danh sách riêng (chủ yếu cho tự kiểm)
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DANH_SACH_MAC_DINH = path.join(GOC, 'scripts', 'danh-sach-test.txt');

/**
 * Đọc tệp danh sách test, bỏ qua dòng trống và dòng chú thích `#`.
 * @param {string} [duongDan]
 * @returns {{ dong: number, lenh: string }[]}
 */
export function docDanhSachTest(duongDan = DANH_SACH_MAC_DINH) {
  const tep = duongDan ? path.resolve(duongDan) : DANH_SACH_MAC_DINH;
  const noiDung = readFileSync(tep, 'utf8');
  const dongTep = noiDung.split(/\r?\n/);
  const ketQua = [];

  for (let i = 0; i < dongTep.length; i += 1) {
    const lenh = dongTep[i].trim();
    if (!lenh || lenh.startsWith('#')) continue;
    ketQua.push({ dong: i + 1, lenh });
  }
  return ketQua;
}

function phanTichThamSo(args) {
  let tuRaw = null;
  let khongDung = false;
  let tepDanhSach = DANH_SACH_MAC_DINH;

  for (const arg of args) {
    if (arg === '--khong-dung') {
      khongDung = true;
      continue;
    }
    if (arg.startsWith('--tu=')) {
      tuRaw = arg.slice('--tu='.length);
      continue;
    }
    if (arg.startsWith('--danh-sach=')) {
      const giaTri = arg.slice('--danh-sach='.length).trim();
      if (!giaTri) {
        return { loi: 'Thiếu đường dẫn sau `--danh-sach=`.' };
      }
      tepDanhSach = path.resolve(giaTri);
      continue;
    }
    return { loi: `Tham số không hợp lệ: ${arg}` };
  }

  return { tuRaw, khongDung, tepDanhSach, loi: null };
}

export function chinh(argv = process.argv) {
  const thamSo = phanTichThamSo(argv.slice(2));
  if (thamSo.loi) {
    console.error(`Lỗi tham số: ${thamSo.loi}`);
    console.error('Dùng: node scripts/chay-danh-sach-test.mjs [--tu=<n>] [--khong-dung] [--danh-sach=<tệp>]');
    return 2;
  }

  let danhSach;
  try {
    danhSach = docDanhSachTest(thamSo.tepDanhSach);
  } catch (e) {
    console.error(`Không đọc được danh sách test (${thamSo.tepDanhSach}): ${e.message}`);
    return 2;
  }

  const tong = danhSach.length;
  if (tong === 0) {
    console.error(`Danh sách test rỗng: ${thamSo.tepDanhSach}`);
    return 2;
  }

  let tu = 1;
  if (thamSo.tuRaw !== null) {
    if (!/^\d+$/.test(thamSo.tuRaw)) {
      console.error(`Giá trị --tu=${thamSo.tuRaw} không hợp lệ (phải là số nguyên trong [1..${tong}]).`);
      return 2;
    }
    tu = Number(thamSo.tuRaw);
    if (!Number.isInteger(tu) || tu < 1 || tu > tong) {
      console.error(`Giá trị --tu=${tu} nằm ngoài phạm vi [1..${tong}].`);
      return 2;
    }
  }

  const loi = [];
  for (let i = tu - 1; i < tong; i += 1) {
    const soThuTu = i + 1;
    const item = danhSach[i];
    console.log(`\n[${soThuTu}/${tong}] ${item.lenh}`);

    const kq = spawnSync(item.lenh, { shell: true, stdio: 'inherit', cwd: GOC });
    const ma = typeof kq.status === 'number' ? kq.status : 1;

    if (kq.error) {
      console.error(`Lỗi khởi chạy [${soThuTu}/${tong}] (dòng ${item.dong}): ${kq.error.message}`);
    } else if (kq.signal) {
      console.error(`Lệnh [${soThuTu}/${tong}] (dòng ${item.dong}) bị ngắt bởi tín hiệu ${kq.signal}.`);
    }

    if (ma !== 0) {
      if (!thamSo.khongDung) {
        console.error(`Dừng tại [${soThuTu}/${tong}] (dòng ${item.dong}, mã thoát ${ma}): ${item.lenh}`);
        return ma;
      }
      console.error(`Ghi nhận lỗi [${soThuTu}/${tong}] (dòng ${item.dong}, mã thoát ${ma}): ${item.lenh}`);
      loi.push({ soThuTu, dong: item.dong, lenh: item.lenh, ma, signal: kq.signal || null });
    }
  }

  if (loi.length > 0) {
    const soDaChay = tong - (tu - 1);
    console.error(`\n=== TỔNG KẾT --khong-dung: ${loi.length}/${soDaChay} lệnh lỗi ===`);
    for (const m of loi) {
      const tinHieu = m.signal ? `, signal ${m.signal}` : '';
      console.error(`  - [${m.soThuTu}/${tong}] (dòng ${m.dong}, mã thoát ${m.ma}${tinHieu}): ${m.lenh}`);
    }
    return 1;
  }

  console.log('\n=== ALL TESTS PASSED ===');
  return 0;
}

const laChinh = (() => {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
  } catch {
    return fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
  }
})();

if (laChinh) {
  process.exit(chinh(process.argv));
}
