#!/usr/bin/env node
// scripts/ho-so-ma/nguong-84-test.mjs — Bài kiểm cho M-74 (#1966): ngưỡng số & phân dải anh em Chương 84 + Phần XVI (kèm ca ngược).
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
  laCauViDuHoacBangMau,
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
const banGhi84 = khoThuc.banGhi.filter((x) => /^nguong\/(?:XVI|84)\.jsonl$/.test(x._tep || ''));

// 1. Khuôn và số lượng bản ghi Chương 84 + Phần XVI
test('1. Kho data/ho-so-ma/nguong/{XVI,84}.jsonl qua khuôn ho-so-ma@1 với 0 lỗi', () => {
  assert.equal(khoThuc.loi.length, 0, khoThuc.loi.join('; '));
  assert.equal(banGhi84.length, 317);
  assert.equal(banGhi84.filter((x) => x.nut === 'phan:XVI').length, 2);
  assert.ok(banGhi84.some((x) => x.nut === 'bieu:848240' && x.nguong?.donVi === 'lần'));
  assert.ok(banGhi84.some((x) => x.nut === 'bieu:8470' && x.nguong?.den === 170));
  assert.ok(banGhi84.some((x) => x.nut === 'bieu:845210' && x.nguong?.den === 120));
  // Kiểm tra riêng 84603110 sau góp ý QT: tách đúng công suất (kW) và đường kính chuôi (mm)
  const r84603110 = banGhi84.filter((x) => x.nut === 'bieu:84603110');
  assert.equal(r84603110.length, 2);
  assert.ok(r84603110.some((x) => x.nguong?.daiLuong === 'công suất' && x.nguong?.donVi === 'kW' && x.nguong?.den === 0.74));
  assert.ok(r84603110.some((x) => x.nguong?.daiLuong === 'đường kính chuôi' && x.nguong?.donVi === 'mm' && x.nguong?.den === 3.175));
  assert.equal(kiemDonViDaiLuong(banGhi84).length, 0);
});

// 2. Cổng 4 (TRÍCH) & Cổng 5 (VÂN TAY) phạm vi 84 đạt 100%
test('2. Cổng 4 (TRÍCH) & Cổng 5 (VÂN TAY) phạm vi 84 đạt 0 lỗi', () => {
  const r = chayCong({ phamVi: ['84'], cong: [4, 5], L });
  assert.equal(r.khuon.length, 0, r.khuon.join('; '));
  assert.equal(r.cong[4].loi.length, 0, r.cong[4].loi.join('; '));
  assert.equal(r.cong[5].loi.length, 0, r.cong[5].loi.join('; '));
  assert.ok(r.cong[4].soKiem >= 317);
});

// 3. Cổng 3 (ANH EM) trên mọi NGUONG Chương 84 + kiemDaiAnhEm: 0 lỗi
test('3. Cổng 3 (ANH EM) không có lỗi NGUONG chồng/hở/voi và 86 cụm anh em hợp lệ', () => {
  const r3 = chayCong({ phamVi: ['84'], cong: [3], L });
  const loiNguong = r3.cong[3].loi.filter((x) => /NGUONG chồng dải|: dải |: voi /.test(x));
  assert.equal(loiNguong.length, 0, loiNguong.join('; '));
  const dai = kiemDaiAnhEm(banGhi84, L);
  assert.equal(dai.loi.length, 0, dai.loi.join('; '));
  assert.ok(dai.cumDaKiem.length >= 80);
  // Kiểm tra ca hở giữa 8408.90.10 (<= 18,65) và .5 (> 100) đã được .9 ("Loại khác") bù kín (18,65; 100]
  const r8408909 = banGhi84.find((x) => x.nut === 'bieu:8408909');
  assert.ok(r8408909 && r8408909.nguong.tu === 18.65 && r8408909.nguong.den === 100);
  assert.ok(/^phuDinh: bieu:84089010/.test(r8408909.ghiChu || ''));
});

// 4. Đối chiếu 258 tệp tham khảo data/ho-so/ranh-gioi/84*.json — 100% mã có điều kiện số được phủ
test('4. Đối chiếu 258 tệp tham khảo data/ho-so/ranh-gioi/84*.json — mọi mã có dieuKienSo đều được phủ', () => {
  const rgDir = path.resolve(G.HO_SO_MAC_DINH, '..', 'ho-so', 'ranh-gioi');
  const files = fs.readdirSync(rgDir).filter((f) => f.startsWith('84') && f.endsWith('.json')).sort();
  assert.equal(files.length, 258);
  const coNutHoacCon = (ma) => {
    const pre = `bieu:${ma}`;
    return banGhi84.some((r) => r.nut === pre || (r.nut.startsWith(pre) && (r.nut[pre.length] === ':' || /^\d/.test(r.nut[pre.length] || ''))));
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
  assert.equal(kiem, 170);
});

// 5. Không chứa tiền lệ tb:, WCO wco: hay thông số ví dụ
test('5. Không chứa tiền lệ (tb:), WCO (wco:) hay dữ liệu khách trong kho ngưỡng Chương 84', () => {
  for (const r of banGhi84) {
    assert.equal(/^(?:tb|wco|gir):/.test(r.cau), false, `${r.id}: cấm trích ${r.cau}`);
    assert.ok(['LUAT', 'HUONG_DAN'].includes(r.lop), `${r.id}: lớp lạ ${r.lop}`);
  }
  assert.equal(laCauViDuHoacBangMau('Những loại máy này thường hoạt động dưới áp suất từ 3.000 đến 4.000 bars'), true);
  assert.equal(parseSoVn('22,38'), 22.38);
  assert.equal(parseSoVn('13.000'), 13000);
});

// 6. Ca ngược: chồng dải, hở dải, voi sai, trích/duKien bịa, vân tay lệch
test('6. Ca ngược: cổng phát hiện đúng chồng dải, hở dải, voi sai, trích sai, duKien bịa và vân tay lệch', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'm74-c84-neg-'));
  try {
    const cauId = 'bieu:841011#1';
    const chu = L.chuCau(cauId);
    const n = L.nut.get(L.cau.get(cauId).nut);
    const mk = (nut, over = {}) => ({
      id: `hs:${nut}:9901`,
      nut,
      loai: 'NGUONG',
      dieuKien: 'Thử ca ngược C84',
      trich: 'Công suất không quá 1.000 kW',
      cau: cauId,
      voi: ['bieu:841012'],
      nguong: { daiLuong: 'công suất', donVi: 'kW', tu: null, den: 1000, gomTu: false, gomDen: true },
      duKien: ['Công suất'],
      lop: n.lop,
      nguon: n.nguon,
      van: sha256(chu),
      trangThai: 'KHOP',
      ...over,
    });
    const ghi = (arr) => {
      fs.mkdirSync(path.join(tmp, 'nguong'), { recursive: true });
      fs.writeFileSync(path.join(tmp, 'nguong', '84.jsonl'), `${arr.map((x) => JSON.stringify(x)).join('\n')}\n`);
    };

    // 6a. Chồng dải giữa 841011 (<= 1500) và 841012 (> 1000)
    ghi([
      mk('bieu:841011', { nguong: { daiLuong: 'công suất', donVi: 'kW', tu: null, den: 1500, gomTu: false, gomDen: true } }),
      mk('bieu:841012', {
        voi: ['bieu:841011'],
        nguong: { daiLuong: 'công suất', donVi: 'kW', tu: 1000, den: 10000, gomTu: false, gomDen: true },
      }),
    ]);
    const rChong = chayCong({ hoSo: tmp, phamVi: ['bieu:84101'], chiTrong: true, cong: [3], L });
    assert.ok(rChong.cong[3].loi.some((x) => x.includes('chồng dải')));

    // 6b. Hở dải giữa 841011 (<= 1000) và 841012 (> 1500) và 841013 (> 10000)
    ghi([
      mk('bieu:841011', { nguong: { daiLuong: 'công suất', donVi: 'kW', tu: null, den: 1000, gomTu: false, gomDen: true } }),
      mk('bieu:841012', { voi: ['bieu:841011', 'bieu:841013'], nguong: { daiLuong: 'công suất', donVi: 'kW', tu: 1500, den: 10000, gomTu: false, gomDen: true } }),
      mk('bieu:841013', { voi: ['bieu:841011', 'bieu:841012'], nguong: { daiLuong: 'công suất', donVi: 'kW', tu: 10000, den: null, gomTu: false, gomDen: false } }),
    ]);
    const rHo = chayCong({ hoSo: tmp, phamVi: ['bieu:84101'], chiTrong: true, cong: [3], L });
    assert.ok(rHo.cong[3].loi.some((x) => x.includes('hở giữa')));

    // 6c. Trích sai + duKien bịa + voi sai + vân tay lệch
    ghi([
      mk('bieu:841011', {
        trich: 'chữ bịa không có trong câu',
        duKien: ['thuộc tính bịa'],
        voi: ['bieu:8411'],
        van: '0'.repeat(64),
      }),
    ]);
    const rSai = chayCong({ hoSo: tmp, phamVi: ['bieu:841011'], cong: [3, 4, 5], L });
    assert.ok(rSai.cong[3].loi.some((x) => x.includes('voi bieu:8411')));
    assert.ok(rSai.cong[4].loi.some((x) => x.includes('trích không nguyên văn')));
    assert.ok(rSai.cong[4].loi.some((x) => x.includes('dữ kiện "thuộc tính bịa')));
    assert.ok(rSai.cong[5].loi.some((x) => x.includes('vân tay lệch')));

    // 6d. Lệch đơn vị với đại lượng (vd: công suất gắn mm, đường kính gắn kW)
    const loiDonVi = kiemDonViDaiLuong([
      mk('bieu:84603110', { id: 'hs:bieu:84603110:9902', nguong: { daiLuong: 'công suất', donVi: 'mm', tu: null, den: 3.175, gomTu: false, gomDen: true } }),
      mk('bieu:84603110', { id: 'hs:bieu:84603110:9903', nguong: { daiLuong: 'đường kính chuôi', donVi: 'kW', tu: null, den: 0.35, gomTu: false, gomDen: true } }),
    ]);
    assert.equal(loiDonVi.length, 2, `Kỳ vọng bắt 2 ca lệch đơn vị-đại lượng, nhận ${loiDonVi.length}`);
    assert.ok(loiDonVi.some((x) => x.includes('công suất') && x.includes('mm')));
    assert.ok(loiDonVi.some((x) => x.includes('đường kính chuôi') && x.includes('kW')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// 7. Dựng lại kho tất định vào thư mục tạm
test('7. dungBanGhiNguongChuong("84") & ghiKhoNguongChuong tái tạo tất định 100%', () => {
  const r = dungBanGhiNguongChuong('84');
  assert.equal(r.loi.length, 0);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'm74-c84-gen-'));
  try {
    ghiKhoNguongChuong('84', { hoSo: tmp });
    const kTmp = kiemKhoHoSo(tmp);
    assert.equal(kTmp.loi.length, 0);
    assert.equal(kTmp.banGhi.length, 317);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

console.log(`\n=== KET QUA M-74 C84: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
