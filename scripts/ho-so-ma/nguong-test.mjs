#!/usr/bin/env node
// scripts/ho-so-ma/nguong-test.mjs — Bài kiểm chung cho M-74 (#1966): tự quét mọi tệp ngưỡng chương trong data/ho-so-ma/nguong/.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chayCong, napLuatCong } from './cong.mjs';
import { kiemKhoHoSo } from './khuon.mjs';
import { DAC_TA_NGUONG_76, dungBanGhiNguong, ghiKhoNguong, kiemDaiAnhEm as kiemDaiAnhEm76 } from './nguong.mjs';
import {
  dungBanGhiNguongChuong,
  ghiKhoNguongChuong,
  kiemDaiAnhEm,
  kiemDonViDaiLuong as kiemDonViGoc,
  laCauViDuHoacBangMau,
  parseSoVn,
} from './nguong-rut.mjs';

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

const chuanKhoang = (s) => String(s || '').replace(/\s+/g, ' ').trim();

/** Cổng kiểm tra đơn vị khớp đại lượng mở rộng dùng chung cho mọi chương M-74. */
export function kiemDonViDaiLuongTongQuat(banGhi) {
  const loi = [];
  for (const r of banGhi || []) {
    if (!r || r.loai !== 'NGUONG' || !r.nguong) continue;
    const dl = chuanKhoang(r.nguong.daiLuong).toLowerCase();
    const dv = chuanKhoang(r.nguong.donVi ?? '');
    if (!dv) continue;
    if (/công suất hơi/.test(dl) && dv !== 'tấn/giờ') {
      loi.push(`${r.id}: daiLuong "${r.nguong.daiLuong}" không khớp đơn vị "${dv}"`);
    } else if (/công suất lọc/.test(dl) && dv !== 'lít/giờ') {
      loi.push(`${r.id}: daiLuong "${r.nguong.daiLuong}" không khớp đơn vị "${dv}"`);
    } else if (/công suất phản kháng/.test(dl) && dv !== 'kvar') {
      loi.push(`${r.id}: daiLuong "${r.nguong.daiLuong}" phải dùng "kvar", nhận "${dv}"`);
    } else if (/^công suất\b/.test(dl) && !/hơi|lọc|phản kháng/.test(dl) && /^(?:mm|cm|m|micron|lít|ml|cc|kg|tấn|cg|V|kV|A|mA|Hz|MHz|kHz|GHz)$/i.test(dv)) {
      loi.push(`${r.id}: daiLuong "${r.nguong.daiLuong}" cấm đi với đơn vị "${dv}"`);
    } else if (/(?:điện áp|đầu điện áp)/.test(dl) && !/^(?:V|kV)$/i.test(dv)) {
      loi.push(`${r.id}: daiLuong "${r.nguong.daiLuong}" phải dùng "V" hoặc "kV", nhận "${dv}"`);
    } else if (/dòng điện/.test(dl) && !/^(?:A|mA)$/i.test(dv)) {
      loi.push(`${r.id}: daiLuong "${r.nguong.daiLuong}" phải dùng "A" hoặc "mA", nhận "${dv}"`);
    } else if (/tần số/.test(dl) && !/^(?:Hz|kHz|MHz|GHz)$/i.test(dv)) {
      loi.push(`${r.id}: daiLuong "${r.nguong.daiLuong}" phải dùng đơn vị tần số, nhận "${dv}"`);
    } else if (/dung lượng phóng điện/.test(dl) && !/^(?:Ah|mAh)$/i.test(dv)) {
      loi.push(`${r.id}: daiLuong "${r.nguong.daiLuong}" phải dùng "Ah" hoặc "mAh", nhận "${dv}"`);
    } else if (/áp suất bục/.test(dl) && dv !== 'MPa') {
      loi.push(`${r.id}: daiLuong "${r.nguong.daiLuong}" phải dùng "MPa", nhận "${dv}"`);
    } else if (/độ bền va đập/.test(dl) && dv !== 'J/m') {
      loi.push(`${r.id}: daiLuong "${r.nguong.daiLuong}" phải dùng "J/m", nhận "${dv}"`);
    } else if (/chỉ số độ nhớt/.test(dl) && dv !== 'ml/g') {
      loi.push(`${r.id}: daiLuong "${r.nguong.daiLuong}" phải dùng "ml/g", nhận "${dv}"`);
    } else if (/mô-đun đàn hồi/.test(dl) && dv !== 'psi') {
      loi.push(`${r.id}: daiLuong "${r.nguong.daiLuong}" phải dùng "psi", nhận "${dv}"`);
    } else if (/tỉ lệ chiều dài/.test(dl) && dv !== 'lần') {
      loi.push(`${r.id}: daiLuong "${r.nguong.daiLuong}" phải dùng "lần", nhận "${dv}"`);
    } else if (/(?:hàm lượng|tỷ lệ trọng lượng|tỷ lệ thể tích|tỷ lệ khối lượng)/.test(dl) && dv !== '%') {
      loi.push(`${r.id}: daiLuong "${r.nguong.daiLuong}" phải dùng "%", nhận "${dv}"`);
    } else if (/(?:đường kính|chiều dài|chiều rộng|chiều cao|chiều dày|chiều ngang|khổ rộng|bán kính|độ dày|kích thước|bước điểm lân quang)/.test(dl) && !/^(?:mm|cm|m|micron|inch|lần|%)$/i.test(dv)) {
      loi.push(`${r.id}: daiLuong "${r.nguong.daiLuong}" cấm đi với đơn vị "${dv}"`);
    } else if (/dung sai tương đối/.test(dl) && dv !== '%') {
      loi.push(`${r.id}: daiLuong "${r.nguong.daiLuong}" phải dùng "%", nhận "${dv}"`);
    } else if (/thể tích/.test(dl) && !/tỷ lệ/.test(dl) && !/^(?:cc|lít|ml|l)$/i.test(dv)) {
      loi.push(`${r.id}: daiLuong "${r.nguong.daiLuong}" cấm đi với đơn vị "${dv}"`);
    } else if (/dung tích/.test(dl) && !/^(?:cc|lít|ml|l)$/i.test(dv)) {
      loi.push(`${r.id}: daiLuong "${r.nguong.daiLuong}" cấm đi với đơn vị "${dv}"`);
    } else if (/lưu lượng/.test(dl) && !/^(?:m³\/h|m3\/phút|lít\/giờ)$/i.test(dv)) {
      loi.push(`${r.id}: daiLuong "${r.nguong.daiLuong}" cấm đi với đơn vị "${dv}"`);
    } else if (/sức chứa túi/.test(dl) && !/^(?:lít|ml|cc|kg)$/i.test(dv)) {
      loi.push(`${r.id}: daiLuong "${r.nguong.daiLuong}" cấm đi với đơn vị "${dv}"`);
    } else if (/(?:khối lượng|trọng lượng|sức chứa vải|khả năng cân|lực rung)/.test(dl) && !/tỷ lệ|hàm lượng/.test(dl) && !/^(?:kg|g|tấn|%)$/i.test(dv)) {
      loi.push(`${r.id}: daiLuong "${r.nguong.daiLuong}" cấm đi với đơn vị "${dv}"`);
    }
  }
  return loi;
}

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
const nguongDir = path.join(G.HO_SO_MAC_DINH, 'nguong');
const tepChuong = fs.readdirSync(nguongDir).filter((f) => /^\d{2}\.jsonl$/.test(f)).sort();
const dsChuong = tepChuong.map((f) => f.slice(0, 2));

const tatCaNguong = khoThuc.banGhi.filter((x) => /^nguong\/.*\.jsonl$/.test(x._tep || ''));
const banGhiTheoChuong = (ch, nguon = tatCaNguong) => {
  const phan = PHAN_CUA_CHUONG[ch];
  const re = phan
    ? new RegExp(`^nguong/(?:${phan}|${ch})\\.jsonl$`)
    : new RegExp(`^nguong/${ch}\\.jsonl$`);
  return nguon.filter((x) => re.test(x._tep || ''));
};

/**
 * Đối chiếu tài liệu tham khảo data/ho-so/ranh-gioi/<ch>*.json: mọi mã có dieuKienSo đều phải có bản ghi
 * gắn vào nút bieu:<mã> (hoặc nút con của nó) trong kho ngưỡng. Trả về danh sách thông báo thiếu (rỗng = đủ).
 * Ca 4 dùng hàm này làm cổng; ca 8 dùng lại đúng hàm này làm ca chẩn trên bản sao cách ly (OZV-2358).
 */
const doiChieuRanhGoi = (tatCa, dsCh, rgDir, allFiles) => {
  const thieu = [];
  for (const ch of dsCh) {
    const bg = banGhiTheoChuong(ch, tatCa);
    const coNutHoacCon = (ma) => {
      const pre = `bieu:${ma}`;
      return bg.some((r) => r.nut === pre || (r.nut.startsWith(pre) && (r.nut[pre.length] === ':' || /^\d/.test(r.nut[pre.length] || ''))));
    };
    const files = allFiles.filter((f) => f.startsWith(ch) && f.endsWith('.json')).sort();
    for (const f of files) {
      const j = JSON.parse(fs.readFileSync(path.join(rgDir, f), 'utf8'));
      for (const d of [...(j.dieuKienNut || []), ...(j.dong8 || [])]) {
        const coSo = (d.dieuKienSo || []).some((c) => typeof c.value === 'number' && !/phuongPhap/i.test(c.fact || ''));
        if (coSo) {
          const ma = d.hs || j.pn6;
          if (!coNutHoacCon(ma)) thieu.push(`Chương ${ch}: thiếu NGUONG cho bieu:${ma} (tham khảo ${f})`);
        }
      }
    }
  }
  return thieu;
};
const banGhiRiengChuong = (ch) => tatCaNguong.filter((x) => x._tep === `nguong/${ch}.jsonl`);

// 1. Kho M-74 qua khuôn và đạt kiểm đơn vị-đại lượng trên mọi chương đang có trong kho
test(`1. Kho data/ho-so-ma/nguong/ (${dsChuong.join(', ')}) qua khuôn ho-so-ma@1 và kiemDonVi với 0 lỗi`, () => {
  assert.equal(khoThuc.loi.length, 0, khoThuc.loi.join('; '));
  assert.ok(dsChuong.includes('76'), 'Phải có ít nhất Chương 76');
  const dvLoi = kiemDonViDaiLuongTongQuat(tatCaNguong);
  assert.equal(dvLoi.length, 0, dvLoi.join('; '));

  const banGhi76 = banGhiTheoChuong('76');
  assert.equal(banGhi76.length, DAC_TA_NGUONG_76.length);
  assert.ok(banGhi76.some((x) => x.loai === 'DINH_NGHIA' && x.nut === 'bieu:76061233' && /5182/.test(x.dieuKien)));
  assert.ok(banGhi76.some((x) => x.loai === 'DINH_NGHIA' && x.nut === 'bieu:76061233' && /5082/.test(x.dieuKien)));
  assert.equal(banGhi76.some((x) => x.nut === 'bieu:76072010'), false, 'Không dựng NGUONG từ bảng thông số ví dụ 76072010');

  if (dsChuong.includes('84')) {
    const banGhi84 = banGhiTheoChuong('84');
    assert.equal(banGhi84.filter((x) => x.nut === 'phan:XVI').length, 2);
    assert.ok(banGhi84.some((x) => x.nut === 'bieu:848240' && x.nguong?.donVi === 'lần'));
    assert.ok(banGhi84.some((x) => x.nut === 'bieu:8470' && x.nguong?.den === 170));
    assert.ok(banGhi84.some((x) => x.nut === 'bieu:845210' && x.nguong?.den === 120));
    const r84603110 = banGhi84.filter((x) => x.nut === 'bieu:84603110');
    assert.equal(r84603110.length, 2);
    assert.ok(r84603110.some((x) => x.nguong?.daiLuong === 'công suất' && x.nguong?.donVi === 'kW' && x.nguong?.den === 0.74));
    assert.ok(r84603110.some((x) => x.nguong?.daiLuong === 'đường kính chuôi' && x.nguong?.donVi === 'mm' && x.nguong?.den === 3.175));
  }
});

// 2. Cổng 4 TRÍCH & Cổng 5 VÂN TAY cho từng chương đang có trong kho
test('2. Cổng 4 (TRÍCH) & Cổng 5 (VÂN TAY) cho mọi chương trong data/ho-so-ma/nguong/ đạt 0 lỗi', () => {
  for (const ch of dsChuong) {
    const r = chayCong({ phamVi: [ch], cong: [4, 5], L });
    assert.equal(r.khuon.length, 0, `Chương ${ch} lỗi khuôn: ${r.khuon.join('; ')}`);
    assert.equal(r.cong[4].loi.length, 0, `Chương ${ch} Cổng 4: ${r.cong[4].loi.join('; ')}`);
    assert.equal(r.cong[5].loi.length, 0, `Chương ${ch} Cổng 5: ${r.cong[5].loi.join('; ')}`);
    assert.ok(r.cong[4].soKiem >= banGhiRiengChuong(ch).length, `Chương ${ch} soKiem=${r.cong[4].soKiem} < ${banGhiRiengChuong(ch).length}`);
  }
});

// 3. Cổng 3 (ANH EM) & kiemDaiAnhEm cho mọi chương đang có trong kho
test('3. Cổng 3 (ANH EM) không có lỗi NGUONG chồng/hở/voi và cụm anh em hợp lệ trên mọi chương', () => {
  for (const ch of dsChuong) {
    const r3 = chayCong({ phamVi: [ch], cong: [3], L });
    const loiNguong = r3.cong[3].loi.filter((x) => /NGUONG chồng dải|: dải |: voi /.test(x));
    assert.equal(loiNguong.length, 0, `Chương ${ch}: ${loiNguong.join('; ')}`);
    const dai = kiemDaiAnhEm(banGhiTheoChuong(ch), L);
    assert.equal(dai.loi.length, 0, `Chương ${ch}: ${dai.loi.join('; ')}`);
  }

  const banGhi76 = banGhiTheoChuong('76');
  const dai76 = kiemDaiAnhEm76(banGhi76, L);
  assert.equal(dai76.cumDaKiem.length, 9, `Kỳ vọng 9 cụm anh em Chương 76, nhận ${dai76.cumDaKiem.length}`);
  assert.ok(dai76.cumDaKiem.every((c) => c.phuKin), 'Mọi cụm anh em Chương 76 phải phủ kín dải');
  assert.ok(dai76.ghiNhanLuat.some((g) => g.loai === 'CHONG_SEN_VOI_LUAT'));
  for (const idKhac of ['hs:bieu:760519:7401', 'hs:bieu:76051990:7401', 'hs:bieu:760529:7401', 'hs:bieu:76052990:7401', 'hs:bieu:76141019:7401', 'hs:bieu:76149019:7401', 'hs:bieu:761699:7401']) {
    const r = banGhi76.find((x) => x.id === idKhac);
    assert.ok(r && /^phuDinh: bieu:/.test(r.ghiChu || ''), `Thiếu đánh dấu phuDinh trên dòng Loại khác ${idKhac}`);
  }

  if (dsChuong.includes('84')) {
    const banGhi84 = banGhiTheoChuong('84');
    const dai84 = kiemDaiAnhEm(banGhi84, L);
    assert.ok(dai84.cumDaKiem.length >= 80);
    const r8408909 = banGhi84.find((x) => x.nut === 'bieu:8408909');
    assert.ok(r8408909 && r8408909.nguong.tu === 18.65 && r8408909.nguong.den === 100);
    assert.ok(/^phuDinh: bieu:84089010/.test(r8408909.ghiChu || ''));
  }
});

// 4. Đối chiếu tài liệu tham khảo data/ho-so/ranh-gioi/<ch>*.json cho mọi chương đang có trong kho
test('4. Đối chiếu data/ho-so/ranh-gioi/*.json cho mọi chương — mọi mã có dieuKienSo đều được phủ', () => {
  const rgDir = path.resolve(G.HO_SO_MAC_DINH, '..', 'ho-so', 'ranh-gioi');
  const thieu = doiChieuRanhGoi(tatCaNguong, dsChuong, rgDir, fs.readdirSync(rgDir));
  assert.equal(thieu.length, 0, thieu.join('; '));
});

// 5. Không chứa dữ liệu khách / tờ khai / tiền lệ / WCO / GIR
test('5. Không chứa tiền lệ (tb:), WCO (wco:), GIR (gir:) hay dữ liệu khách trong kho ngưỡng', () => {
  for (const r of tatCaNguong) {
    assert.equal(/^(?:tb|wco|gir):/.test(r.cau), false, `${r.id}: cấm trích ${r.cau}`);
    assert.ok(['LUAT', 'HUONG_DAN'].includes(r.lop), `${r.id}: lớp lạ ${r.lop}`);
  }
  assert.equal(laCauViDuHoacBangMau('Những loại máy này thường hoạt động dưới áp suất từ 3.000 đến 4.000 bars'), true);
  assert.equal(parseSoVn('22,38'), 22.38);
  assert.equal(parseSoVn('13.000'), 13000);
});

// 6. Ca ngược — phát hiện NGUONG chồng dải, hở dải, trích sai chữ, duKien tự đặt, voi sai, vân tay lệch, lệch đơn vị
test('6. Ca ngược: cổng phát hiện đúng chồng dải, hở dải, voi sai, trích sai, duKien bịa, vân tay và đơn vị lệch', () => {
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

    // 6d. Từ chối câu thông số ví dụ / bảng mẫu tham khảo khi ép dựng thành NGUONG
    const badSample = dungBanGhiNguong({
      dacTa: [
        {
          id: 'hs:bieu:76072010:9903',
          nut: 'bieu:76072010',
          cau: 'sen:76072010:1#8',
          dieuKien: 'Thử đưa thông số ví dụ thành NGUONG',
          trich: 'Bề rộng cuộn, mm',
          duKien: ['Bề rộng cuộn'],
        },
        {
          id: 'hs:bieu:76061233:9904',
          nut: 'bieu:76061233',
          cau: 'sen:76061233:1#2',
          dieuKien: 'Thử đưa bảng thông lệ 5182/5082 thành NGUONG',
          trich: 'Mangan',
          duKien: ['Mangan'],
        },
      ],
    });
    assert.equal(badSample.loi.length, 2, `Kỳ vọng từ chối 2 câu ví dụ/bảng mẫu, nhận ${badSample.loi.length}`);

    // 6e. Lệch đơn vị với đại lượng (vd công suất + mm, đường kính + kW)
    const loiDonVi = kiemDonViGoc([
      mk('bieu:76051910#1', { id: 'hs:bieu:84603110:9902', nguong: { daiLuong: 'công suất', donVi: 'mm', tu: null, den: 3.175, gomTu: false, gomDen: true } }),
      mk('bieu:76051910#1', { id: 'hs:bieu:84603110:9903', nguong: { daiLuong: 'đường kính chuôi', donVi: 'kW', tu: null, den: 0.35, gomTu: false, gomDen: true } }),
    ]);
    assert.equal(loiDonVi.length, 2, `Kỳ vọng bắt 2 ca lệch đơn vị-đại lượng, nhận ${loiDonVi.length}`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// 7. Tái tạo tất định Chương 76, Chương 84 & Chương 85 (nếu có) vào thư mục tạm
test('7. ghiKhoNguong (C76) & ghiKhoNguongChuong("84"/"85") tái tạo tất định 100%', () => {
  const tmp76 = fs.mkdtempSync(path.join(os.tmpdir(), 'm74-gen-76-'));
  try {
    ghiKhoNguong({ hoSo: tmp76 });
    const kTmp = kiemKhoHoSo(tmp76);
    assert.equal(kTmp.loi.length, 0);
    assert.equal(kTmp.banGhi.length, DAC_TA_NGUONG_76.length);
  } finally {
    fs.rmSync(tmp76, { recursive: true, force: true });
  }

  for (const ch of ['84', '85']) {
    if (!dsChuong.includes(ch)) continue;
    const r = dungBanGhiNguongChuong(ch);
    assert.equal(r.loi.length, 0);
    const tmpCh = fs.mkdtempSync(path.join(os.tmpdir(), `m74-gen-${ch}-`));
    try {
      ghiKhoNguongChuong(ch, { hoSo: tmpCh });
      const kTmpCh = kiemKhoHoSo(tmpCh);
      assert.equal(kTmpCh.loi.length, 0);
      const kyVong = ch === '84' ? banGhiTheoChuong(ch).length : banGhiRiengChuong(ch).length;
      assert.equal(kTmpCh.banGhi.length, kyVong);
    } finally {
      fs.rmSync(tmpCh, { recursive: true, force: true });
    }
  }
});

// 8. Nghiệm thu OZV-2358 — ca chẩn 2 chiều trên bản sao cách ly của kho thật (luật 8: chỉ chạm thư mục tạm,
//    không ghi vào data/). Sự việc 25/11/2026: PR nộp 39.jsonl treo ngưỡng ở nút cha 4 số, không cổng nào
//    chặn lúc nộp, chỉ phát hiện khi đã lên main. Âm: bớt mọi dòng gắn một nút có dieuKienSo (chương 76)
//    ⇒ cổng phải nêu đúng mã thiếu. Dương: bản sao nguyên vẹn ⇒ không thiếu nút nào.
test('8. Nghiệm thu OZV-2358 trên bản sao cách ly: bớt nút NGUONG ⇒ đỏ đúng mã thiếu; nguyên vẹn ⇒ xanh', () => {
  const rgDir = path.resolve(G.HO_SO_MAC_DINH, '..', 'ho-so', 'ranh-gioi');
  const allFiles = fs.readdirSync(rgDir);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'm74-2358-'));
  try {
    const dirSao = path.join(tmp, 'nguong');
    fs.mkdirSync(dirSao, { recursive: true });
    for (const f of fs.readdirSync(nguongDir)) {
      if (f.endsWith('.jsonl')) fs.copyFileSync(path.join(nguongDir, f), path.join(dirSao, f));
    }
    // Dương: bản sao nguyên vẹn của kho thật ⇒ đối chiếu không thiếu nút nào
    assert.equal(doiChieuRanhGoi(kiemKhoHoSo(tmp).banGhi, dsChuong, rgDir, allFiles).length, 0, 'Bản sao nguyên vẹn không được thiếu nút nào');

    // Âm: bỏ nút NGUONG đầu tiên (theo thứ tự tệp ranh-gioi chương 76) vừa có dieuKienSo vừa có dòng trong kho
    const tep76 = path.join(dirSao, '76.jsonl');
    const dong = fs.readFileSync(tep76, 'utf8').split('\n').filter((x) => x.trim());
    let maBo = null;
    chay: for (const f of allFiles.filter((x) => x.startsWith('76') && x.endsWith('.json')).sort()) {
      const j = JSON.parse(fs.readFileSync(path.join(rgDir, f), 'utf8'));
      for (const d of [...(j.dieuKienNut || []), ...(j.dong8 || [])]) {
        const coSo = (d.dieuKienSo || []).some((c) => typeof c.value === 'number' && !/phuongPhap/i.test(c.fact || ''));
        const ma = coSo ? d.hs || j.pn6 : null;
        if (ma && dong.some((x) => JSON.parse(x).nut === `bieu:${ma}`)) { maBo = ma; break chay; }
      }
    }
    assert.ok(maBo, 'Phải tìm được mã có dieuKienSo và dòng NGUONG trong chương 76 của kho thật');
    fs.writeFileSync(tep76, `${dong.filter((x) => JSON.parse(x).nut !== `bieu:${maBo}`).join('\n')}\n`);
    const thieu = doiChieuRanhGoi(kiemKhoHoSo(tmp).banGhi, dsChuong, rgDir, allFiles);
    assert.equal(thieu.length, 1, thieu.join('; '));
    assert.ok(thieu[0].includes(`thiếu NGUONG cho bieu:${maBo}`), thieu.join('; '));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

console.log(`\n=== KET QUA M-74 CHUNG (${dsChuong.join(',')}): ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
