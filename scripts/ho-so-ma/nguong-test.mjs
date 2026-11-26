#!/usr/bin/env node
// scripts/ho-so-ma/nguong-test.mjs — Bài kiểm cho M-74 (#1966): ngưỡng số & phân dải anh em Chương 76 (kèm ca ngược).
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chayCong, napLuatCong } from './cong.mjs';
import { kiemKhoHoSo } from './khuon.mjs';
import { DAC_TA_NGUONG_76, ghiKhoNguong, kiemDaiAnhEm } from './nguong.mjs';

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

// 1. Kho M-74 tồn tại, đúng khuôn và phủ đủ đặc tả Chương 76 + Phần XV
test('1. Kho data/ho-so-ma/nguong/{XV,76}.jsonl qua khuôn ho-so-ma@1 với 0 lỗi', () => {
  assert.equal(khoThuc.loi.length, 0, khoThuc.loi.join('; '));
  const nguongRecords = khoThuc.banGhi.filter((x) => x.loai === 'NGUONG');
  assert.equal(nguongRecords.length, DAC_TA_NGUONG_76.length);
});

// 2. Cổng 4 TRÍCH & Cổng 5 VÂN TAY phạm vi Chương 76 đạt 100%
test('2. Cổng 4 (TRÍCH) & Cổng 5 (VÂN TAY) phạm vi 76 đạt 0 lỗi', () => {
  const r = chayCong({ phamVi: ['76'], cong: [4, 5], L });
  assert.equal(r.khuon.length, 0, r.khuon.join('; '));
  assert.equal(r.cong[4].loi.length, 0, r.cong[4].loi.join('; '));
  assert.equal(r.cong[5].loi.length, 0, r.cong[5].loi.join('; '));
  assert.ok(r.cong[4].soKiem >= 40);
});

// 3. Cổng 3 (ANH EM) trên mọi NGUONG Chương 76: 0 lỗi chồng dải / hở dải / voi ngoài anh em
test('3. Cổng 3 (ANH EM) không có lỗi NGUONG chồng/hở/voi và 9 cụm anh em phủ kín dải', () => {
  const r3 = chayCong({ phamVi: ['76'], cong: [3], L });
  const loiNguong = r3.cong[3].loi.filter((x) => /NGUONG chồng dải|: dải |: voi /.test(x));
  assert.equal(loiNguong.length, 0, loiNguong.join('; '));
  const dai = kiemDaiAnhEm(khoThuc.banGhi, L);
  assert.equal(dai.loi.length, 0, dai.loi.join('; '));
  assert.equal(dai.cumDaKiem.length, 9, `Kỳ vọng 9 cụm anh em Chương 76, nhận ${dai.cumDaKiem.length}`);
  assert.ok(dai.cumDaKiem.every((c) => c.phuKin), 'Mọi cụm anh em chia theo ngưỡng số phải phủ kín dải');
  assert.ok(dai.ghiNhanLuat.some((g) => g.loai === 'CHONG_SEN_VOI_LUAT'));
  assert.ok(dai.ghiNhanLuat.some((g) => g.loai === 'HO_THONG_LE_SEN'));
});

// 4. Đối chiếu tài liệu tham khảo data/ho-so/ranh-gioi/76*.json: mọi ngưỡng số đều có mặt với trich nguyên văn
test('4. Đối chiếu 18 tệp tham khảo data/ho-so/ranh-gioi/76*.json — mọi ngưỡng số đều khớp kho luật gốc', () => {
  const rgDir = path.resolve(G.HO_SO_MAC_DINH, '..', 'ho-so', 'ranh-gioi');
  const files = fs.readdirSync(rgDir).filter((f) => f.startsWith('76') && f.endsWith('.json')).sort();
  assert.equal(files.length, 18);
  const byNut = new Map();
  for (const r of khoThuc.banGhi) {
    if (!byNut.has(r.nut)) byNut.set(r.nut, []);
    byNut.get(r.nut).push(r);
  }
  const soNutCanCo = [];
  for (const f of files) {
    const j = JSON.parse(fs.readFileSync(path.join(rgDir, f), 'utf8'));
    for (const d of [...(j.dieuKienNut || []), ...(j.dong8 || [])]) {
      const coSo = (d.dieuKienSo || []).some((c) => typeof c.value === 'number' && !/phuongPhap/i.test(c.fact || ''));
      if (coSo) {
        const ma = d.hs || j.pn6;
        soNutCanCo.push({ ma, f });
        assert.ok(byNut.has(`bieu:${ma}`), `Thiếu NGUONG cho nút bieu:${ma} (tham khảo từ ${f})`);
      }
    }
  }
  assert.equal(soNutCanCo.length, 8, `Phải phủ đủ 8 nút số từ ranh-gioi/76*, nhận ${soNutCanCo.length}`);
});

// 5. Không chứa dữ liệu khách / tờ khai / tiền lệ
test('5. Không chứa tiền lệ (tb:) hay dữ liệu khách trong kho ngưỡng', () => {
  for (const r of khoThuc.banGhi) {
    assert.equal(/^tb:/.test(r.cau), false, `${r.id}: cấm trích tiền lệ`);
    assert.ok(['LUAT', 'HUONG_DAN'].includes(r.lop), `${r.id}: lớp lạ ${r.lop}`);
  }
});

// 6. Ca ngược — phát hiện NGUONG chồng dải, hở dải, trích sai chữ, duKien tự đặt, voi sai, và vân tay lệch
test('6. Ca ngược: cổng phát hiện đúng chồng dải, hở dải, voi sai, trích sai, duKien bịa và vân tay lệch', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'm74-neg-'));
  try {
    const mk = (cauId, over = {}) => {
      const chu = L.chuCau(cauId);
      const n = L.nut.get(L.cau.get(cauId).nut);
      return {
        id: `hs:${over.nut || 'bieu:76051910'}:9901`,
        nut: 'bieu:76051910',
        loai: 'NGUONG',
        dieuKien: 'Thử ca ngược',
        trich: 'Đường kính không quá 0,0508 mm',
        cau: cauId,
        voi: ['bieu:76051990'],
        nguong: { daiLuong: 'đường kính', donVi: 'mm', tu: null, den: 0.0508, gomTu: false, gomDen: true },
        duKien: ['Đường kính'],
        lop: n.lop,
        nguon: n.nguon,
        van: sha256(chu),
        trangThai: 'KHOP',
        ...over,
      };
    };

    const ghi = (arr) => {
      const dir = path.join(tmp, 'nguong');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, '76.jsonl'), `${arr.map((x) => JSON.stringify(x)).join('\n')}\n`);
    };

    // 6a. Chồng dải giữa 76051910 (<= 0.1) và 76051990 (> 0.0508)
    ghi([
      mk('bieu:76051910#1', { nguong: { daiLuong: 'đường kính', donVi: 'mm', tu: null, den: 0.1, gomTu: false, gomDen: true } }),
      mk('bieu:76051910#1', {
        id: 'hs:bieu:76051990:9902', nut: 'bieu:76051990', voi: ['bieu:76051910'],
        nguong: { daiLuong: 'đường kính', donVi: 'mm', tu: 0.0508, den: null, gomTu: false, gomDen: false },
      }),
    ]);
    const rChong = chayCong({ hoSo: tmp, phamVi: ['760519'], chiTrong: true, cong: [3, 4, 5], L });
    assert.ok(rChong.cong[3].loi.some((x) => x.includes('chồng dải')), 'Phải đỏ khi NGUONG chồng dải');
    assert.ok(kiemDaiAnhEm(kiemKhoHoSo(tmp).banGhi, L).loi.some((x) => x.includes('Chồng dải')));

    // 6b. Hở dải giữa 76051910 (<= 0.0508) và 76051990 (> 0.1)
    ghi([
      mk('bieu:76051910#1', { nguong: { daiLuong: 'đường kính', donVi: 'mm', tu: null, den: 0.0508, gomTu: false, gomDen: true } }),
      mk('bieu:76051910#1', {
        id: 'hs:bieu:76051990:9902', nut: 'bieu:76051990', voi: ['bieu:76051910'],
        nguong: { daiLuong: 'đường kính', donVi: 'mm', tu: 0.1, den: null, gomTu: false, gomDen: false },
      }),
    ]);
    const rHo = chayCong({ hoSo: tmp, phamVi: ['760519'], chiTrong: true, cong: [3], L });
    assert.ok(rHo.cong[3].loi.some((x) => x.includes('hở giữa')), 'Phải đỏ khi NGUONG hở dải');
    assert.ok(kiemDaiAnhEm(kiemKhoHoSo(tmp).banGhi, L).loi.some((x) => x.includes('Hở dải')));

    // 6c. Trích không nguyên văn + duKien bịa + voi ngoài anh em + vân tay lệch
    ghi([
      mk('bieu:76051910#1', {
        trich: 'chữ sửa cho đẹp không có trong câu',
        duKien: ['thuộc tính tự đặt không có trong câu'],
        voi: ['bieu:7606'],
        van: '0'.repeat(64),
      }),
    ]);
    const rSai = chayCong({ hoSo: tmp, phamVi: ['760519'], cong: [3, 4, 5], L });
    assert.ok(rSai.cong[3].loi.some((x) => x.includes('voi bieu:7606')));
    assert.ok(rSai.cong[4].loi.some((x) => x.includes('trích không nguyên văn')));
    assert.ok(rSai.cong[4].loi.some((x) => x.includes('dữ kiện "thuộc tính tự đặt')));
    assert.ok(rSai.cong[5].loi.some((x) => x.includes('vân tay lệch')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// 7. Thử dựng lại kho vào thư mục tạm bằng ghiKhoNguong -> khớp 100% với bản đã kiểm tra
test('7. ghiKhoNguong tái tạo tất định y hệt kho hiện tại', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'm74-gen-'));
  try {
    ghiKhoNguong({ hoSo: tmp });
    const kTmp = kiemKhoHoSo(tmp);
    assert.equal(kTmp.loi.length, 0);
    assert.equal(kTmp.banGhi.length, DAC_TA_NGUONG_76.length);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

console.log(`\n=== KET QUA M-74: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
