#!/usr/bin/env node
// scripts/ho-so-ma/liet-ke-85-test.mjs — Bài kiểm cho M-75 (#1967): vấn đề chỉ liệt kê được Chương 85 + Phần XVI (kèm ca ngược).
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chayCong, napLuatCong } from './cong.mjs';
import { BO_QUA, kiemKhoHoSo } from './khuon.mjs';
import { ghiKhoLietKeChuong, kiemPhuLietKeChuong } from './liet-ke-rut.mjs';

const sha256 = (s) => crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');

let passed = 0;
let failed = 0;
function test(ten, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS: ${ten}`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL: ${ten}\n  ${err.stack || err.message}`);
  }
}

const L = napLuatCong();
const khoThuc = kiemKhoHoSo();
const banGhi85All = khoThuc.banGhi.filter((x) => /^liet-ke\/(?:XVI|85)\.jsonl$/.test(x._tep || ''));
const banGhi85Rieng = khoThuc.banGhi.filter((x) => /^liet-ke\/85\.jsonl$/.test(x._tep || ''));

// 1. Khuôn và số lượng bản ghi Chương 85 + Phần XVI
test('1. Kho data/ho-so-ma/liet-ke/{XVI,85}.jsonl qua khuôn ho-so-ma@1 với 0 lỗi', () => {
  assert.equal(khoThuc.loi.length, 0, khoThuc.loi.join('; '));
  assert.equal(banGhi85Rieng.length, 154);
  assert.equal(banGhi85All.length, 205);
  assert.equal(banGhi85Rieng.filter((x) => x.loai === 'CHI_LIET_KE').length, 110);
  assert.equal(banGhi85Rieng.filter((x) => x.loai === BO_QUA).length, 44);
});

// 2. Cổng 4 TRÍCH & Cổng 5 VÂN TAY phạm vi 85 đạt 100%
test('2. Cổng 4 (TRÍCH) & Cổng 5 (VÂN TAY) phạm vi 85 đạt 0 lỗi', () => {
  const r = chayCong({ phamVi: ['85'], cong: [4, 5], L });
  assert.equal(r.khuon.length, 0, r.khuon.join('; '));
  assert.equal(r.cong[4].loi.length, 0, r.cong[4].loi.join('; '));
  assert.equal(r.cong[5].loi.length, 0, r.cong[5].loi.join('; '));
  assert.ok(r.cong[4].soKiem >= 205);
});

// 3. Độ phủ 100% câu kích hoạt trên đường đi Chương 85
test('3. 100% câu khớp cụm kích hoạt M-75 trên đường đi Chương 85 có CHI_LIET_KE hoặc BO_QUA (0 thiếu)', () => {
  const phu = kiemPhuLietKeChuong(banGhi85All, L, '85');
  assert.equal(phu.thieu.length, 0, `Thiếu: ${phu.thieu.map((x) => x.cau).join(', ')}`);
  assert.equal(phu.tongCauKichHoat, 205);
});

// 4. Kiểm đủ quy tắc Chương 85/Phần XVI, không nhãn [...], không ghép GIR/WCO/tb, không lọt loại trừ M-72
test('4. Đủ quy tắc Chương 85/Phần XVI, không nhãn [...] đầu dieuKien, không ghép GIR/WCO/tb', () => {
  const clk = banGhi85All.filter((x) => x.loai === 'CHI_LIET_KE');
  for (const r of banGhi85All) {
    assert.equal(/^(?:gir|wco|tb):/.test(r.cau), false, `${r.id}: cấm đưa ${r.cau} vào hồ sơ Chương 85`);
    assert.equal(/^gir:/.test(r.nut), false, `${r.id}: không ghép nút gir vào hồ sơ Chương 85`);
  }
  for (const r of clk) {
    assert.equal(/^\[/.test(r.dieuKien), false, `${r.id}: dieuKien không được mở đầu bằng nhãn [...]`);
    assert.ok(['LUAT', 'HUONG_DAN'].includes(r.lop), `${r.id}: lớp lạ ${r.lop}`);
  }
  const hasCau = (c) => clk.some((x) => x.cau === c);
  assert.ok(hasCau('phan:XVI:cg:2:a#1'), 'Thiếu Chú giải 2(a) Phần XVI');
  assert.ok(hasCau('phan:XVI:cg:2:b#2'), 'Thiếu Chú giải 2(b) Phần XVI (85.17/85.25–85.28)');
  assert.ok(hasCau('chuong:85:kq:6#1'), 'Thiếu Chú giải tổng quát Chương 85 về sứ/thủy tinh vs 70.11');
  assert.ok(hasCau('chuong:85:kq:19#1') && hasCau('chuong:85:kq:20#1'), 'Thiếu quy tắc mô đun nhớ điện tử');
  assert.ok(hasCau('chuong:85:kq:27#1'), 'Thiếu quy tắc bộ phận không dùng điện Chương 85');
  assert.ok(hasCau('sen:85371013:1#1'), 'Thiếu SEN 8537.10.13');
  assert.ok(hasCau('bieu:8503#1') && hasCau('bieu:8522#1') && hasCau('bieu:8529#1') && hasCau('bieu:8538#1'));
  for (const bqCau of [
    'chuong:85:kq:4#1',
    'chuong:85:kq:22#1',
    'nhom:8513:ct:10#4',
    'nhom:8515:ct:48#1',
    'nhom:8526:ct:17#1',
    'nhom:8527:ct:12#1',
    'nhom:8528:ct:34#1',
    'nhom:8529:ct:12#1',
    'nhom:8530:ct:7#3',
    'nhom:8542:ct:52#2',
    'nhom:8543:ct:1#2',
    'nhom:8548:ct:3#1',
    'nhom:8549:ct:12#1',
  ]) {
    assert.ok(banGhi85Rieng.some((x) => x.cau === bqCau && x.loai === BO_QUA), `Mục loại trừ/dẫn ${bqCau} phải là BO_QUA`);
  }
});

// 5. Ca ngược: bỏ sót câu kích hoạt, trích sai, duKien bịa, BO_QUA sai nút, vân tay lệch
test('5. Ca ngược: phát hiện đúng thiếu phủ câu kích hoạt, trích sai, duKien bịa, BO_QUA sai nút và vân tay lệch', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'm75-c85-neg-'));
  try {
    ghiKhoLietKeChuong('85', { hoSo: tmp });
    const k0 = kiemKhoHoSo(tmp).banGhi.filter((x) => x.cau !== 'bieu:8503#1');
    const phuThieu = kiemPhuLietKeChuong(k0, L, '85');
    assert.ok(phuThieu.thieu.some((x) => x.cau === 'bieu:8503#1'));

    const cauId = 'bieu:8503#1';
    const chu = L.chuCau(cauId);
    const nNguon = L.nut.get(L.cau.get(cauId).nut);
    const bad = [
      {
        id: 'hs:bieu:8503:9901',
        nut: 'bieu:8503',
        loai: 'CHI_LIET_KE',
        dieuKien: 'Thử ca ngược C85',
        trich: 'chữ bịa sai nguyên văn',
        cau: cauId,
        duKien: ['thuộc tính bịa'],
        lop: nNguon.lop,
        nguon: nNguon.nguon,
        van: '0'.repeat(64),
        trangThai: 'KHOP',
      },
      {
        id: 'hs:chuong:85:9902',
        nut: 'chuong:85',
        loai: BO_QUA,
        cau: cauId,
        lyDo: 'Thử ghi BO_QUA ở nút cha thay vì đúng nút của câu',
        van: sha256(chu),
      },
    ];
    fs.mkdirSync(path.join(tmp, 'liet-ke'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'liet-ke', '85.jsonl'), `${bad.map((x) => JSON.stringify(x)).join('\n')}\n`);
    const rBad = chayCong({ hoSo: tmp, phamVi: ['8503'], cong: [4, 5], L });
    assert.ok(rBad.cong[4].loi.some((x) => x.includes('trích không nguyên văn')));
    assert.ok(rBad.cong[4].loi.some((x) => x.includes('dữ kiện "thuộc tính bịa')));
    assert.ok(rBad.cong[4].loi.some((x) => x.includes('BỎ QUA phải ghi ở đúng nút của câu')));
    assert.ok(rBad.cong[5].loi.some((x) => x.includes('vân tay lệch')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

console.log(`\n=== KET QUA M-75 C85: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
