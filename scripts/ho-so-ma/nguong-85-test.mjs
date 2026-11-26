#!/usr/bin/env node
// scripts/ho-so-ma/nguong-85-test.mjs — Bài kiểm cho M-74 (#1966): ngưỡng số & phân dải anh em Chương 85 (kèm ca ngược).
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chayCong, napLuatCong } from './cong.mjs';
import { kiemKhoHoSo } from './khuon.mjs';
import {
  dungBanGhiNguongChuong,
  ghiKhoNguongChuong,
  kiemDaiAnhEm,
  kiemDonViDaiLuong,
  parseSoVn,
} from './nguong-rut.mjs';

const require = createRequire(import.meta.url);
const G = require('../../lib/ho-so-ma/ghep.js');
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
const banGhi85 = khoThuc.banGhi.filter((x) => /^nguong\/85\.jsonl$/.test(x._tep || ''));

// 1. Khuôn, số lượng và bản ghi đặc trưng Chương 85
test('1. Kho data/ho-so-ma/nguong/85.jsonl qua khuôn ho-so-ma@1 với 0 lỗi', () => {
  assert.equal(khoThuc.loi.length, 0, khoThuc.loi.join('; '));
  assert.equal(banGhi85.length, 273);
  assert.ok(banGhi85.some((x) => x.nut === 'bieu:8509' && x.nguong?.den === 20 && x.nguong?.donVi === 'kg'));
  assert.ok(banGhi85.some((x) => x.nut === 'bieu:852581' && x.nguong?.donVi === 'khung/s' && x.nguong?.tu === 225000));
  assert.ok(banGhi85.some((x) => x.nut === 'bieu:852712' && x.nguong?.den === 170 && x.nguong?.donVi === 'mm'));
  assert.ok(banGhi85.some((x) => x.nut === 'bieu:853210' && x.nguong?.donVi === 'kvar' && x.nguong?.tu === 0.5));
  assert.ok(banGhi85.some((x) => x.nut === 'bieu:850811' && x.nguong?.donVi === 'lít' && x.nguong?.daiLuong === 'sức chứa túi/hộp chứa bụi'));
  assert.ok(banGhi85.some((x) => x.nut === 'bieu:850120' && x.nguong?.daiLuong === 'công suất' && x.nguong?.donVi === 'W'));
  assert.equal(kiemDonViDaiLuong(banGhi85).length, 0);
});

// 2. Cổng 4 (TRÍCH) & Cổng 5 (VÂN TAY) phạm vi 85 đạt 100%
test('2. Cổng 4 (TRÍCH) & Cổng 5 (VÂN TAY) phạm vi 85 đạt 0 lỗi', () => {
  const r = chayCong({ phamVi: ['85'], cong: [4, 5], L });
  assert.equal(r.khuon.length, 0, r.khuon.join('; '));
  assert.equal(r.cong[4].loi.length, 0, r.cong[4].loi.join('; '));
  assert.equal(r.cong[5].loi.length, 0, r.cong[5].loi.join('; '));
  assert.ok(r.cong[4].soKiem >= 275);
});

// 3. Cổng 3 (ANH EM) trên mọi NGUONG Chương 85 + kiemDaiAnhEm: 0 lỗi
test('3. Cổng 3 (ANH EM) không có lỗi NGUONG chồng/hở/voi và 82 cụm anh em hợp lệ', () => {
  const r3 = chayCong({ phamVi: ['85'], cong: [3], L });
  const loiNguong = r3.cong[3].loi.filter((x) => /NGUONG chồng dải|: dải |: voi /.test(x));
  assert.equal(loiNguong.length, 0, loiNguong.join('; '));
  const dai = kiemDaiAnhEm(banGhi85, L);
  assert.equal(dai.loi.length, 0, dai.loi.join('; '));
  assert.equal(dai.cumDaKiem.length, 82, `Kỳ vọng 82 cụm anh em C85, nhận ${dai.cumDaKiem.length}`);
  assert.equal(dai.cumDaKiem.filter((x) => x.phuKin).length, 72);
  // Kiểm tra ca bù khoảng giữa (40; 66) kV cho bieu:85353090 ("Loại khác" trong 85.35 > 1 kV)
  const r85353090 = banGhi85.find((x) => x.nut === 'bieu:85353090');
  assert.ok(r85353090 && r85353090.nguong.tu === 40 && r85353090.nguong.den === 66 && r85353090.nguong.donVi === 'kV');
  assert.ok(/^phuDinh: bieu:8535301, bieu:85353020/.test(r85353090.ghiChu || ''));
});

// 4. Đối chiếu 163 tệp tham khảo data/ho-so/ranh-gioi/85*.json — 100% mã có dieuKienSo được phủ
test('4. Đối chiếu 163 tệp tham khảo data/ho-so/ranh-gioi/85*.json — mọi mã có dieuKienSo đều được phủ', () => {
  const rgDir = path.resolve(G.HO_SO_MAC_DINH, '..', 'ho-so', 'ranh-gioi');
  const files = fs.readdirSync(rgDir).filter((f) => f.startsWith('85') && f.endsWith('.json')).sort();
  assert.equal(files.length, 163);
  const coNutHoacCon = (ma) => {
    const pre = `bieu:${ma}`;
    return banGhi85.some((r) => r.nut === pre || (r.nut.startsWith(pre) && (r.nut[pre.length] === ':' || /^\d/.test(r.nut[pre.length] || ''))));
  };
  let kiem = 0;
  for (const f of files) {
    const j = JSON.parse(fs.readFileSync(path.join(rgDir, f), 'utf8'));
    for (const d of [...(j.dieuKienNut || []), ...(j.dong8 || [])]) {
      const coSo = (d.dieuKienSo || []).some((c) => typeof c.value === 'number' && !/phuongPhap/i.test(c.fact || ''));
      if (coSo) {
        kiem += 1;
        const ma = d.hs || j.pn6;
        assert.ok(coNutHoacCon(ma), `Thiếu NGUONG cho bieu:${ma} (tham khảo ${f})`);
      }
    }
  }
  assert.equal(kiem, 155);
});

// 5. Không chứa tiền lệ tb:, WCO wco: hay thông số ví dụ
test('5. Không chứa tiền lệ (tb:), WCO (wco:) hay dữ liệu khách trong kho ngưỡng Chương 85', () => {
  for (const r of banGhi85) {
    assert.equal(/^(?:tb|wco|gir):/.test(r.cau), false, `${r.id}: cấm trích ${r.cau}`);
    assert.ok(['LUAT', 'HUONG_DAN'].includes(r.lop), `${r.id}: lớp lạ ${r.lop}`);
  }
  assert.equal(parseSoVn('12.500'), 12500);
  assert.equal(parseSoVn('37,5'), 37.5);
});

// 6. Ca ngược: chồng dải, hở dải, voi sai, trích/duKien bịa, vân tay lệch & lệch đơn vị điện (V/A/mm)
test('6. Ca ngược: phát hiện đúng chồng dải, hở dải, voi sai, trích sai, vân tay lệch và lệch đơn vị điện', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'm74-c85-neg-'));
  try {
    const cauId = 'bieu:85016110#1';
    const chu = L.chuCau(cauId);
    const n = L.nut.get(L.cau.get(cauId).nut);
    const mk = (nut, over = {}) => ({
      id: `hs:${nut}:9901`,
      nut,
      loai: 'NGUONG',
      dieuKien: 'Thử ca ngược C85',
      trich: 'Công suất không quá 12,5 kVA',
      cau: cauId,
      voi: ['bieu:85016120'],
      nguong: { daiLuong: 'công suất', donVi: 'kVA', tu: null, den: 12.5, gomTu: false, gomDen: true },
      duKien: ['Công suất'],
      lop: n.lop,
      nguon: n.nguon,
      van: sha256(chu),
      trangThai: 'KHOP',
      ...over,
    });
    const ghi = (arr) => {
      fs.mkdirSync(path.join(tmp, 'nguong'), { recursive: true });
      fs.writeFileSync(path.join(tmp, 'nguong', '85.jsonl'), `${arr.map((x) => JSON.stringify(x)).join('\n')}\n`);
    };

    // 6a. Chồng dải giữa 85016110 (<= 20 kVA) và 85016120 (> 12.5 kVA)
    ghi([
      mk('bieu:85016110', { nguong: { daiLuong: 'công suất', donVi: 'kVA', tu: null, den: 20, gomTu: false, gomDen: true } }),
      mk('bieu:85016120', { voi: ['bieu:85016110'], nguong: { daiLuong: 'công suất', donVi: 'kVA', tu: 12.5, den: null, gomTu: false, gomDen: false } }),
    ]);
    const rChong = chayCong({ hoSo: tmp, phamVi: ['bieu:850161'], chiTrong: true, cong: [3], L });
    assert.ok(rChong.cong[3].loi.some((x) => x.includes('chồng dải')));

    // 6b. Hở dải giữa 85016110 (<= 10 kVA) và 85016120 (> 12.5 kVA)
    ghi([
      mk('bieu:85016110', { nguong: { daiLuong: 'công suất', donVi: 'kVA', tu: null, den: 10, gomTu: false, gomDen: true } }),
      mk('bieu:85016120', { voi: ['bieu:85016110'], nguong: { daiLuong: 'công suất', donVi: 'kVA', tu: 12.5, den: null, gomTu: false, gomDen: false } }),
    ]);
    const rHo = chayCong({ hoSo: tmp, phamVi: ['bieu:850161'], chiTrong: true, cong: [3], L });
    assert.ok(rHo.cong[3].loi.some((x) => x.includes('hở giữa')));

    // 6c. Trích sai + duKien bịa + voi sai + vân tay lệch
    ghi([
      mk('bieu:85016110', {
        trich: 'chữ bịa sai nguyên văn',
        duKien: ['thuộc tính bịa'],
        voi: ['bieu:8502'],
        van: '0'.repeat(64),
      }),
    ]);
    const rSai = chayCong({ hoSo: tmp, phamVi: ['bieu:85016110'], cong: [3, 4, 5], L });
    assert.ok(rSai.cong[3].loi.some((x) => x.includes('voi bieu:8502')));
    assert.ok(rSai.cong[4].loi.some((x) => x.includes('trích không nguyên văn')));
    assert.ok(rSai.cong[4].loi.some((x) => x.includes('dữ kiện "thuộc tính bịa')));
    assert.ok(rSai.cong[5].loi.some((x) => x.includes('vân tay lệch')));

    // 6d. Lệch đơn vị điện: điện áp gắn A, dòng điện gắn V, công suất gắn mm
    const loiDv = kiemDonViDaiLuong([
      mk('bieu:853710', { id: 'hs:bieu:853710:9902', nguong: { daiLuong: 'điện áp', donVi: 'A', tu: null, den: 1000, gomTu: false, gomDen: true } }),
      mk('bieu:85362011', { id: 'hs:bieu:85362011:9903', nguong: { daiLuong: 'dòng điện', donVi: 'V', tu: null, den: 16, gomTu: false, gomDen: false } }),
      mk('bieu:850110', { id: 'hs:bieu:850110:9904', nguong: { daiLuong: 'công suất', donVi: 'mm', tu: null, den: 37.5, gomTu: false, gomDen: true } }),
    ]);
    assert.equal(loiDv.length, 3);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// 7. Tái tạo tất định kho Chương 85
test('7. dungBanGhiNguongChuong("85") & ghiKhoNguongChuong tái tạo tất định 100%', () => {
  const r = dungBanGhiNguongChuong('85');
  assert.equal(r.loi.length, 0);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'm74-c85-gen-'));
  try {
    ghiKhoNguongChuong('85', { hoSo: tmp });
    const kTmp = kiemKhoHoSo(tmp);
    assert.equal(kTmp.loi.length, 0);
    assert.equal(kTmp.banGhi.length, 273);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

console.log(`\n=== KET QUA M-74 C85: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
