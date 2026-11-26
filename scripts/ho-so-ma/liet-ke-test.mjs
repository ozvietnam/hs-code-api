#!/usr/bin/env node
// scripts/ho-so-ma/liet-ke-test.mjs — Bài kiểm chung cho M-75 (#1967): tự quét mọi tệp trong data/ho-so-ma/liet-ke/ (gir.jsonl + các chương).
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chayCong, napLuatCong } from './cong.mjs';
import { BO_QUA, kiemKhoHoSo } from './khuon.mjs';
import { DAC_TA_LIET_KE_76, ghiKhoLietKe, kiemPhuLietKe, kiemTrungTenToTien, quetCauKichHoat } from './liet-ke.mjs';

const require = createRequire(import.meta.url);
const G = require('../../lib/ho-so-ma/ghep.js');
const sha256 = (s) => crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');

const PHAN_CUA_CHUONG = {
  '39': 'VII',
  '40': 'VII',
  '61': 'XI',
  '62': 'XI',
  '73': 'XV',
  '76': 'XV',
  '84': 'XVI',
  '85': 'XVI',
  '87': 'XVII',
  '90': 'XVIII',
  '94': 'XX',
};

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
const lkDir = path.join(G.HO_SO_MAC_DINH, 'liet-ke');
const tepChuong = fs.existsSync(lkDir)
  ? fs.readdirSync(lkDir).filter((f) => /^\d{2}\.jsonl$/.test(f)).sort()
  : [];
const dsChuong = tepChuong.map((f) => f.slice(0, 2));

const tatCaLietKe = khoThuc.banGhi.filter((x) => /^liet-ke\/.*\.jsonl$/.test(x._tep || ''));
const banGhiGir = tatCaLietKe.filter((x) => x._tep === 'liet-ke/gir.jsonl');
const banGhiRiengChuong = (ch) => tatCaLietKe.filter((x) => x._tep === `liet-ke/${ch}.jsonl`);
const banGhi76VaPhan = tatCaLietKe.filter((x) => /^liet-ke\/(?:gir|XV|76)\.jsonl$/.test(x._tep || ''));

// 1. Khuôn và số lượng bản ghi M-75 (gir.jsonl + mọi chương đang có trong kho)
test(`1. Kho data/ho-so-ma/liet-ke/ (gir, ${dsChuong.join(', ')}) qua khuôn ho-so-ma@1 với 0 lỗi`, () => {
  assert.equal(khoThuc.loi.length, 0, khoThuc.loi.join('; '));
  assert.ok(dsChuong.includes('76'), 'Phải có ít nhất Chương 76');
  assert.equal(banGhiGir.length, 5, 'gir.jsonl phải giữ đúng 5 bản ghi GIR 2a/2b/3b/3c');
  assert.ok(banGhiGir.every((x) => /^gir:[23]:[abc]$/.test(x.nut) && /^gir:/.test(x.cau)));
  const clk76 = banGhi76VaPhan.filter((x) => x.loai === 'CHI_LIET_KE');
  const bq76 = banGhi76VaPhan.filter((x) => x.loai === BO_QUA);
  assert.equal(clk76.length, DAC_TA_LIET_KE_76.length);
  assert.ok(bq76.length >= 10, `Phải ghi rõ BO_QUA cho các câu kích hoạt không tạo câu hỏi mở, nhận ${bq76.length}`);
});

// 2. Cổng 4 TRÍCH & Cổng 5 VÂN TAY cho mọi chương trong data/ho-so-ma/liet-ke/
test('2. Cổng 4 (TRÍCH) & Cổng 5 (VÂN TAY) mọi chương liet-ke/ (gồm gir.jsonl) đạt 0 lỗi', () => {
  for (const ch of dsChuong) {
    const r = chayCong({ phamVi: [ch], cong: [4, 5], L });
    assert.equal(r.khuon.length, 0, `Chương ${ch}: ${r.khuon.join('; ')}`);
    assert.equal(r.cong[4].loi.length, 0, `Chương ${ch} Cổng 4: ${r.cong[4].loi.join('; ')}`);
    assert.equal(r.cong[5].loi.length, 0, `Chương ${ch} Cổng 5: ${r.cong[5].loi.join('; ')}`);
    assert.ok(r.cong[4].soKiem >= banGhiRiengChuong(ch).length, `Chương ${ch}: soKiem=${r.cong[4].soKiem} < ${banGhiRiengChuong(ch).length}`);
  }
});

// 3. Độ phủ 100% câu kích hoạt Ch.76 + không nút con nào trùng nguyên văn tên tổ tiên trên mọi chương
test('3. Độ phủ 100% câu kích hoạt Ch.76 và 0 nút con trùng tên tổ tiên trên mọi chương', () => {
  const phu = kiemPhuLietKe(banGhi76VaPhan, L, '76');
  assert.equal(phu.thieu.length, 0, `Còn thiếu ${phu.thieu.length} câu: ${phu.thieu.map((x) => x.cau).join(', ')}`);
  assert.ok(phu.tongCauKichHoat >= 25);

  const trung = kiemTrungTenToTien(tatCaLietKe, L);
  assert.equal(trung.length, 0, trung.join('; '));
});

// 4. Kiểm đủ các nhóm nội dung cốt lõi của thẻ M-75 (gir.jsonl + Ch.76/Phần XV)
test('4. Đủ GIR 2a, GIR 3b/3c trong gir.jsonl, bộ phận Phần XV/XVI/XVII và cụm mục đích mở', () => {
  const clk = banGhi76VaPhan.filter((x) => x.loai === 'CHI_LIET_KE');
  const has = (re) => clk.some((x) => re.test(`${x.nut} ${x.cau} ${x.dieuKien} ${x.trich} ${(x.den || []).join(' ')}`));
  assert.ok(has(/gir:2:a/i), 'Thiếu GIR 2(a) trong gir.jsonl');
  assert.ok(has(/gir:3:b/i), 'Thiếu GIR 3(b) trong gir.jsonl');
  assert.ok(has(/gir:3:c/i), 'Thiếu GIR 3(c) trong gir.jsonl');
  assert.ok(has(/phan:XVI|phan:XVII|bộ phận có công dụng chung/i), 'Thiếu bộ phận Phần XV/XVI/XVII');
  assert.ok(has(/chủ yếu/i), 'Thiếu cụm "chủ yếu dùng"');
  assert.ok(has(/phù hợp/i), 'Thiếu cụm "phù hợp để dùng"');
  assert.ok(has(/chuyên dùng/i), 'Thiếu cụm "chuyên dùng"');
  assert.ok(clk.some((x) => x.cau === 'nhom:7616:ct:10#1'), 'Phải giữ nhom:7616:ct:10#1 về bộ phận máy Chương 84/85');
  assert.equal(clk.some((x) => /^phan:XV:cg:1:[fg]#/.test(x.cau)), false, 'cg:1:f/g là loại trừ M-72, ghi BO_QUA không ghi CHI_LIET_KE');
  assert.equal(tatCaLietKe.some((x) => x._tep === 'liet-ke/XV.jsonl' && /^gir:/.test(x.cau)), false, 'XV.jsonl không được chứa câu gir:*');
});

// 5. Không chứa tiền lệ tb:, WCO wco:, hay dữ liệu khách; gir: chỉ nằm ở gir.jsonl
test('5. Không chứa tiền lệ (tb:), WCO (wco:) hay dữ liệu khách; gir: chỉ nằm ở gir.jsonl', () => {
  for (const r of tatCaLietKe) {
    assert.equal(/^tb:/.test(r.cau), false, `${r.id}: cấm trích tiền lệ`);
    assert.equal(/^wco:/.test(r.cau), false, `${r.id}: ADR-0006 cấm đưa ý kiến WCO vào hồ sơ vấn đề`);
    if (r._tep !== 'liet-ke/gir.jsonl') {
      assert.equal(/^gir:/.test(r.cau), false, `${r.id}: gir: phải đặt ở liet-ke/gir.jsonl`);
    }
    if (r.loai === 'CHI_LIET_KE') {
      assert.ok(['LUAT', 'HUONG_DAN'].includes(r.lop), `${r.id}: lớp lạ ${r.lop}`);
    }
  }
});

// 6. Ca ngược: bỏ sót câu kích hoạt, trích sai, duKien bịa, BO_QUA sai nút, vân tay lệch, nút con trùng tên tổ tiên
test('6. Ca ngược: phát hiện đúng thiếu phủ, trích sai, duKien bịa, BO_QUA sai nút, vân tay lệch và nút con trùng tên tổ tiên', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'm75-neg-'));
  try {
    ghiKhoLietKe({ hoSo: tmp });
    // 6a. Thiếu phủ khi bỏ bớt một câu kích hoạt khỏi tệp (gồm mẫu đóng gói thành bộ / sử dụng cùng nhau Phần VI & Ch.34)
    const k0 = kiemKhoHoSo(tmp).banGhi.filter((x) => x.cau !== 'bieu:76169920#1');
    const phuThieu = kiemPhuLietKe(k0, L, '76');
    assert.ok(phuThieu.thieu.some((x) => x.cau === 'bieu:76169920#1'));
    const phu34Thieu = kiemPhuLietKe([], L, '34');
    assert.ok(phu34Thieu.thieu.some((x) => x.cau === 'phan:VI:cg:3#1'), 'Ca ngược: phải bắt được câu "đóng gói thành bộ" tại phan:VI:cg:3#1');
    assert.ok(phu34Thieu.thieu.some((x) => x.cau === 'phan:VI:cg:3:a#1'), 'Ca ngược: phải bắt được câu "được sử dụng cùng nhau" tại phan:VI:cg:3:a#1');
    assert.ok(phu34Thieu.thieu.some((x) => x.cau === 'bieu:3407#1'), 'Ca ngược: phải bắt được câu "đã đóng gói thành bộ để bán lẻ" tại bieu:3407#1');

    // Ca ngược cụm kích hoạt mở rộng (#2125/#2128/#2130/#2133/#2105): phải quét trúng & báo thiếu nếu chưa phủ
    const hit26 = quetCauKichHoat(L, '26').map((x) => x.cau);
    assert.ok(hit26.includes('chuong:26:cg:3:a#1'), 'Phải bắt được "dùng trong công nghiệp" ở chuong:26:cg:3:a#1');
    assert.ok(hit26.includes('chuong:26:cg:3:b#1'), 'Phải bắt được "là loại dùng để" ở chuong:26:cg:3:b#1');
    const phu26Thieu = kiemPhuLietKe([{ loai: 'CHI_LIET_KE', cau: 'chuong:26:cg:3:a#1' }], L, '26');
    assert.ok(phu26Thieu.thieu.some((x) => x.cau === 'chuong:26:cg:3:b#1'), 'Ca ngược Ch.26: thiếu chuong:26:cg:3:b#1 phải bị báo thiếu');
    assert.ok(quetCauKichHoat(L, '31').some((x) => x.cau === 'bieu:31031110#1' && x.txt.includes('dùng làm')));
    assert.ok(quetCauKichHoat(L, '31').some((x) => x.cau === 'chuong:31:cg:6#1' && x.txt.includes('được sử dụng như')));
    assert.ok(quetCauKichHoat(L, '34').some((x) => x.cau === 'bieu:3407#1' && x.txt.includes('đóng gói thành bộ')));
    assert.ok(quetCauKichHoat(L, '36').some((x) => x.cau === 'chuong:36:cg:2:b#1' && x.txt.includes('loại sử dụng để')));
    assert.ok(quetCauKichHoat(L, '36').some((x) => x.cau === 'bieu:36069020#1' && x.txt.includes('dùng cho')));
    assert.ok(quetCauKichHoat(L, '43').some((x) => x.cau === 'bieu:4301#1' && x.txt.includes('thích hợp cho')));

    // 6b. Lỗi trích sai, duKien tự đặt, BO_QUA sai nút và vân tay lệch qua Cổng 4/5
    const chu = L.chuCau('bieu:76169920#1');
    const nNguon = L.nut.get(L.cau.get('bieu:76169920#1').nut);
    const bad = [
      {
        id: 'hs:bieu:76169920:9901',
        nut: 'bieu:76169920',
        loai: 'CHI_LIET_KE',
        dieuKien: 'Thử ca ngược',
        trich: 'chữ sửa sai nguyên văn',
        cau: 'bieu:76169920#1',
        duKien: ['thuộc tính bịa không có trong câu'],
        lop: nNguon.lop,
        nguon: nNguon.nguon,
        van: '0'.repeat(64),
        trangThai: 'KHOP',
      },
      {
        id: 'hs:bieu:7616:9902',
        nut: 'bieu:7616',
        loai: BO_QUA,
        cau: 'bieu:76169920#1',
        lyDo: 'Thử ghi BỎ QUA ở nút cha thay vì đúng nút của câu',
        van: sha256(chu),
      },
    ];
    fs.mkdirSync(path.join(tmp, 'liet-ke'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'liet-ke', '76.jsonl'), `${bad.map((x) => JSON.stringify(x)).join('\n')}\n`);
    const rBad = chayCong({ hoSo: tmp, phamVi: ['76'], cong: [4, 5], L });
    assert.ok(rBad.cong[4].loi.some((x) => x.includes('trích không nguyên văn')));
    assert.ok(rBad.cong[4].loi.some((x) => x.includes('dữ kiện "thuộc tính bịa')));
    assert.ok(rBad.cong[4].loi.some((x) => x.includes('BỎ QUA phải ghi ở đúng nút của câu')));
    assert.ok(rBad.cong[5].loi.some((x) => x.includes('vân tay lệch')));

    // 6c. Luật QT (#2000): phát hiện nút con có tên trùng nguyên văn tổ tiên (vd bieu:731600 dưới bieu:7316)
    const dup = [{
      id: 'hs:bieu:731600:9903',
      nut: 'bieu:731600',
      loai: 'CHI_LIET_KE',
      dieuKien: 'Thử lặp nút con trùng tên tổ tiên',
      trich: L.chuCau('bieu:731600#1'),
      cau: 'bieu:731600#1',
      duKien: ['bộ phận'],
      lop: 'LUAT',
      nguon: nNguon.nguon,
      van: sha256(L.chuCau('bieu:731600#1')),
      trangThai: 'KHOP',
    }];
    const loiDup = kiemTrungTenToTien(dup, L);
    assert.equal(loiDup.length, 1, 'Phải bắt được nút con trùng nguyên văn tên tổ tiên');
    assert.ok(loiDup[0].includes('bieu:731600'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// 7. Thử dựng lại kho vào thư mục tạm bằng ghiKhoLietKe -> tạo đủ gir/XV/76 khớp 100%
test('7. ghiKhoLietKe tái tạo tất định gir.jsonl + XV.jsonl + 76.jsonl khớp 100%', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'm75-gen-'));
  try {
    ghiKhoLietKe({ hoSo: tmp });
    const kTmp = kiemKhoHoSo(tmp);
    assert.equal(kTmp.loi.length, 0);
    assert.equal(kTmp.banGhi.length, banGhi76VaPhan.length);
    assert.equal(kTmp.banGhi.filter((x) => x._tep === 'liet-ke/gir.jsonl').length, 5);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

console.log(`\n=== KET QUA M-75 CHUNG (${dsChuong.join(',')}): ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
