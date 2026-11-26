#!/usr/bin/env node
// scripts/ho-so-ma/liet-ke-84-test.mjs — Bài kiểm cho M-75 (#1967): vấn đề chỉ liệt kê được Chương 84 + Phần XVI (kèm ca ngược).
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
const banGhi84 = khoThuc.banGhi.filter((x) => /^liet-ke\/(?:XVI|84)\.jsonl$/.test(x._tep || ''));

// 1. Khuôn và số lượng bản ghi Chương 84 + Phần XVI
test('1. Kho data/ho-so-ma/liet-ke/{XVI,84}.jsonl qua khuôn ho-so-ma@1 với 0 lỗi', () => {
  assert.equal(khoThuc.loi.length, 0, khoThuc.loi.join('; '));
  assert.equal(banGhi84.length, 408);
  const clk = banGhi84.filter((x) => x.loai === 'CHI_LIET_KE');
  const bq = banGhi84.filter((x) => x.loai === BO_QUA);
  assert.equal(clk.length, 267);
  assert.equal(bq.length, 141);
});

// 2. Cổng 4 TRÍCH & Cổng 5 VÂN TAY phạm vi 84 đạt 100%
test('2. Cổng 4 (TRÍCH) & Cổng 5 (VÂN TAY) phạm vi 84 đạt 0 lỗi', () => {
  const r = chayCong({ phamVi: ['84'], cong: [4, 5], L });
  assert.equal(r.khuon.length, 0, r.khuon.join('; '));
  assert.equal(r.cong[4].loi.length, 0, r.cong[4].loi.join('; '));
  assert.equal(r.cong[5].loi.length, 0, r.cong[5].loi.join('; '));
  assert.ok(r.cong[4].soKiem >= 408);
});

// 3. Độ phủ 100% câu kích hoạt trên đường đi Chương 84
test('3. 100% câu khớp cụm kích hoạt M-75 trên đường đi Chương 84 có CHI_LIET_KE hoặc BO_QUA (0 thiếu)', () => {
  const phu = kiemPhuLietKeChuong(banGhi84, L, '84');
  assert.equal(phu.thieu.length, 0, `Thiếu: ${phu.thieu.map((x) => x.cau).join(', ')}`);
  assert.equal(phu.tongCauKichHoat, 408);
});

// 4. Kiểm đủ các quy tắc cốt lõi & tuân thủ yêu cầu QT trên #1975
test('4. Đủ quy tắc Phần XVI/Chương 84, không nhãn [...] đầu dieuKien, không ghép GIR/WCO/tb', () => {
  const clk = banGhi84.filter((x) => x.loai === 'CHI_LIET_KE');
  for (const r of banGhi84) {
    assert.equal(/^(?:gir|wco|tb):/.test(r.cau), false, `${r.id}: cấm đưa ${r.cau} vào hồ sơ Chương 84`);
    assert.equal(/^gir:/.test(r.nut), false, `${r.id}: không ghép nút gir vào hồ sơ Chương 84`);
  }
  for (const r of clk) {
    assert.equal(/^\[/.test(r.dieuKien), false, `${r.id}: dieuKien không được mở đầu bằng nhãn [...]`);
    assert.ok(['LUAT', 'HUONG_DAN'].includes(r.lop), `${r.id}: lớp lạ ${r.lop}`);
  }
  const hasCau = (c) => clk.some((x) => x.cau === c);
  assert.ok(hasCau('phan:XVI:cg:2:a#1'), 'Thiếu Chú giải 2(a) Phần XVI');
  assert.ok(hasCau('phan:XVI:cg:2:b#1'), 'Thiếu Chú giải 2(b) Phần XVI');
  assert.ok(hasCau('phan:XVI:cg:3#1'), 'Thiếu Chú giải 3 Phần XVI');
  assert.ok(hasCau('phan:XVI:cg:4#1'), 'Thiếu Chú giải 4 Phần XVI');
  assert.ok(hasCau('chuong:84:cg:2#1'), 'Thiếu Chú giải 2 Chương 84');
  assert.ok(hasCau('chuong:84:cg:6:C:i#1'), 'Thiếu Chú giải 6(C)(i) Chương 84');
  assert.ok(hasCau('chuong:84:cg:11:C#1'), 'Thiếu Chú giải 11(C) Chương 84 (84.86)');
  assert.ok(hasCau('bieu:8409#1') && hasCau('bieu:8431#1') && hasCau('bieu:8448#1') && hasCau('bieu:8466#1') && hasCau('bieu:8473#1'));
  assert.ok(hasCau('sen:84239030:1#2'), 'Thiếu SEN 8423.90.30 Quy tắc 3c');
  for (const bqCau of ['nhom:8430:ct:25#1', 'nhom:8404:ct:22#1', 'nhom:8487:ct:1#1', 'nhom:8487:ct:4#7']) {
    assert.ok(banGhi84.some((x) => x.cau === bqCau && x.loai === BO_QUA), `Mục loại trừ/dẫn ${bqCau} phải là BO_QUA`);
  }
});

// 5. Ca ngược: bỏ sót câu kích hoạt, trích sai, duKien bịa, BO_QUA sai nút, vân tay lệch
test('5. Ca ngược: phát hiện đúng thiếu phủ câu kích hoạt, trích sai, duKien bịa, BO_QUA sai nút và vân tay lệch', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'm75-c84-neg-'));
  try {
    ghiKhoLietKeChuong('84', { hoSo: tmp });
    const k0 = kiemKhoHoSo(tmp).banGhi.filter((x) => x.cau !== 'bieu:8409#1');
    const phuThieu = kiemPhuLietKeChuong(k0, L, '84');
    assert.ok(phuThieu.thieu.some((x) => x.cau === 'bieu:8409#1'));

    const cauId = 'bieu:8409#1';
    const chu = L.chuCau(cauId);
    const nNguon = L.nut.get(L.cau.get(cauId).nut);
    const bad = [
      {
        id: 'hs:bieu:8409:9901',
        nut: 'bieu:8409',
        loai: 'CHI_LIET_KE',
        dieuKien: 'Thử ca ngược C84',
        trich: 'chữ bịa sai nguyên văn',
        cau: cauId,
        duKien: ['thuộc tính bịa'],
        lop: nNguon.lop,
        nguon: nNguon.nguon,
        van: '0'.repeat(64),
        trangThai: 'KHOP',
      },
      {
        id: 'hs:chuong:84:9902',
        nut: 'chuong:84',
        loai: BO_QUA,
        cau: cauId,
        lyDo: 'Thử ghi BO_QUA ở nút cha thay vì đúng nút của câu',
        van: sha256(chu),
      },
    ];
    fs.mkdirSync(path.join(tmp, 'liet-ke'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'liet-ke', '84.jsonl'), `${bad.map((x) => JSON.stringify(x)).join('\n')}\n`);
    const rBad = chayCong({ hoSo: tmp, phamVi: ['8409'], cong: [4, 5], L });
    assert.ok(rBad.cong[4].loi.some((x) => x.includes('trích không nguyên văn')));
    assert.ok(rBad.cong[4].loi.some((x) => x.includes('dữ kiện "thuộc tính bịa')));
    assert.ok(rBad.cong[4].loi.some((x) => x.includes('BỎ QUA phải ghi ở đúng nút của câu')));
    assert.ok(rBad.cong[5].loi.some((x) => x.includes('vân tay lệch')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

console.log(`\n=== KET QUA M-75 C84: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
