#!/usr/bin/env node
// scripts/ho-so-ma/liet-ke-39-test.mjs — Bài kiểm cho M-75 (#1967): vấn đề chỉ liệt kê được Chương 39 + Phần VII (kèm ca ngược).
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
const banGhi39All = khoThuc.banGhi.filter((x) => /^liet-ke\/(?:VII|39)\.jsonl$/.test(x._tep || ''));
const banGhi39Rieng = khoThuc.banGhi.filter((x) => /^liet-ke\/39\.jsonl$/.test(x._tep || ''));

// 1. Khuôn và số lượng bản ghi Chương 39 + Phần VII
test('1. Kho data/ho-so-ma/liet-ke/{VII,39}.jsonl qua khuôn ho-so-ma@1 với 0 lỗi', () => {
  assert.equal(khoThuc.loi.length, 0, khoThuc.loi.join('; '));
  assert.equal(banGhi39Rieng.length, 27);
  assert.equal(banGhi39All.length, 31);
  assert.equal(banGhi39Rieng.filter((x) => x.loai === 'CHI_LIET_KE').length, 12);
  assert.equal(banGhi39Rieng.filter((x) => x.loai === BO_QUA).length, 15);
  assert.equal(banGhi39All.filter((x) => x._tep === 'liet-ke/VII.jsonl').length, 4);
});

// 2. Cổng 4 TRÍCH & Cổng 5 VÂN TAY phạm vi 39 đạt 100%
test('2. Cổng 4 (TRÍCH) & Cổng 5 (VÂN TAY) phạm vi 39 đạt 0 lỗi', () => {
  const r = chayCong({ phamVi: ['39'], cong: [4, 5], L });
  assert.equal(r.khuon.length, 0, r.khuon.join('; '));
  assert.equal(r.cong[4].loi.length, 0, r.cong[4].loi.join('; '));
  assert.equal(r.cong[5].loi.length, 0, r.cong[5].loi.join('; '));
  assert.equal(r.cong[4].soKiem, 31);
});

// 3. Độ phủ 100% câu kích hoạt trên đường đi Chương 39
test('3. 100% câu khớp cụm kích hoạt M-75 trên đường đi Chương 39 (+ Phần VII) có CHI_LIET_KE hoặc BO_QUA (0 thiếu)', () => {
  const phu = kiemPhuLietKeChuong(banGhi39All, L, '39');
  assert.equal(phu.thieu.length, 0, `Thiếu: ${phu.thieu.map((x) => x.cau).join(', ')}`);
  assert.equal(phu.tongCauKichHoat, 31);
});

// 4. Kiểm đủ quy tắc Phần VII/Chương 39, không nhãn [...], không ghép GIR/WCO/tb, không nhầm phrasing Phần XVI
test('4. Đủ quy tắc Phần VII/Chương 39, không nhãn [...] đầu dieuKien, không ghép GIR/WCO/tb', () => {
  const clk = banGhi39All.filter((x) => x.loai === 'CHI_LIET_KE');
  for (const r of banGhi39All) {
    assert.equal(/^(?:gir|wco|tb):/.test(r.cau), false, `${r.id}: cấm đưa ${r.cau} vào hồ sơ Chương 39`);
    assert.equal(/^gir:/.test(r.nut), false, `${r.id}: không ghép nút gir vào hồ sơ Chương 39`);
  }
  for (const r of clk) {
    assert.equal(/^\[/.test(r.dieuKien), false, `${r.id}: dieuKien không được mở đầu bằng nhãn [...]`);
    assert.ok(['LUAT', 'HUONG_DAN'].includes(r.lop), `${r.id}: lớp lạ ${r.lop}`);
  }
  for (const r of banGhi39Rieng.filter((x) => x.loai === 'CHI_LIET_KE' && /^bieu:/.test(x.nut))) {
    assert.equal(/Phần XV\b|nhóm máy tương ứng/.test(r.dieuKien), false, `${r.id}: Chương 39 không dùng mẫu Phần XV/máy móc`);
  }
  const hasCau = (c) => clk.some((x) => x.cau === c);
  assert.ok(hasCau('phan:VII:cg:1#1') && hasCau('phan:VII:cg:2#1') && hasCau('phan:VII:kq:3#2'));
  assert.ok(hasCau('chuong:39:kq:94#1') && hasCau('chuong:39:kq:97#1'));
  assert.ok(hasCau('nhom:3926:ct:3#2') && hasCau('nhom:3926:ct:10#1'));
  assert.ok(hasCau('sen:39229011:1#11') && hasCau('sen:39231020:1#1'));
  for (const bqCau of [
    'chuong:39:cg:2:q#1',
    'chuong:39:cg:2:s#1',
    'chuong:39:kq:72#1',
    'chuong:39:kq:105#1',
    'nhom:3915:ct:4#1',
  ]) {
    assert.ok(banGhi39Rieng.some((x) => x.cau === bqCau && x.loai === BO_QUA), `Mục loại trừ ${bqCau} phải là BO_QUA`);
  }
});

// 5. Ca ngược: bỏ sót câu kích hoạt, trích sai, duKien bịa, BO_QUA sai nút, vân tay lệch
test('5. Ca ngược: phát hiện đúng thiếu phủ câu kích hoạt, trích sai, duKien bịa, BO_QUA sai nút và vân tay lệch', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'm75-c39-neg-'));
  try {
    ghiKhoLietKeChuong('39', { hoSo: tmp });
    const k0 = kiemKhoHoSo(tmp).banGhi.filter((x) => x.cau !== 'bieu:392530#1');
    const phuThieu = kiemPhuLietKeChuong(k0, L, '39');
    assert.ok(phuThieu.thieu.some((x) => x.cau === 'bieu:392530#1'));

    const cauId = 'bieu:392530#1';
    const chu = L.chuCau(cauId);
    const nNguon = L.nut.get(L.cau.get(cauId).nut);
    const bad = [
      {
        id: 'hs:bieu:392530:9901',
        nut: 'bieu:392530',
        loai: 'CHI_LIET_KE',
        dieuKien: 'Thử ca ngược C39',
        trich: 'chữ bịa sai nguyên văn',
        cau: cauId,
        duKien: ['thuộc tính bịa'],
        lop: nNguon.lop,
        nguon: nNguon.nguon,
        van: '0'.repeat(64),
        trangThai: 'KHOP',
      },
      {
        id: 'hs:chuong:39:9902',
        nut: 'chuong:39',
        loai: BO_QUA,
        cau: cauId,
        lyDo: 'Thử ghi BO_QUA ở nút cha thay vì đúng nút của câu',
        van: sha256(chu),
      },
    ];
    fs.mkdirSync(path.join(tmp, 'liet-ke'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'liet-ke', '39.jsonl'), `${bad.map((x) => JSON.stringify(x)).join('\n')}\n`);
    const rBad = chayCong({ hoSo: tmp, phamVi: ['392530'], cong: [4, 5], L });
    assert.ok(rBad.cong[4].loi.some((x) => x.includes('trích không nguyên văn')));
    assert.ok(rBad.cong[4].loi.some((x) => x.includes('dữ kiện "thuộc tính bịa')));
    assert.ok(rBad.cong[4].loi.some((x) => x.includes('BỎ QUA phải ghi ở đúng nút của câu')));
    assert.ok(rBad.cong[5].loi.some((x) => x.includes('vân tay lệch')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

console.log(`\n=== KET QUA M-75 C39: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
