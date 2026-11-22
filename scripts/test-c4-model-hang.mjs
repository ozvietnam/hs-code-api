#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * Cổng tự kiểm bảng tra C4 model / hãng → nhóm 4 số (`scripts/dung-c4-model-hang.mjs` & `data/do-thi/c4-model-hang.json`).
 *
 * Kiểm:
 *   1. Dựng lại 2 lần ra tệp tạm cho cùng sha256 và khớp từng byte với `data/do-thi/c4-model-hang.json`.
 *   2. Mọi mục trong `bang` có `soDong >= 2`, `nguon.length === soDong`, mã 4 số + mọi dòng nguồn còn sống trong `data/tax.json` (`tapNut().ma8`).
 *   3. 0 trùng lặp giữa `bang` và `mauThuan`; `maHetHieuLuc` tách riêng mã 10 số (`8524910020`) và mã hết hiệu lực.
 *   4. Đệ quy kiểm riêng tư: 0 khoá cấm (`tenHang`, `sampleDesc`, `khachHang`, `gia`, `soLuong`, `soToKhai`, `nsx`, `customer`, `price`...) và 0 dấu thời gian.
 *   5. Lọc nhiễu, tách chuỗi, gộp trùng trong cùng dòng, xử lý mâu thuẫn nhóm, tra cứu `traC4`.
 *   6. Loại ca kín S-7 (`loaiCaKin: true`) loại sạch mọi dòng holdout (bất biến khi xáo thứ tự dòng).
 *   7. Đo trên `de-rieng-300.jsonl` (`doTrenDeRieng300` & `--do-de-rieng`) chạy sạch, tỷ lệ hữu hạn.
 */
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  chuanKhoaModel,
  doTrenDeRieng300,
  dungBangC4,
  laNhieuModelHang,
  tachGiaTriModelHang,
  taoChiMucC4,
  taoTapMaHienHanh,
  traC4,
} from './dung-c4-model-hang.mjs';
import { khoaNoiDung, laCaKin } from './dung-bo-thu-de-rieng.mjs';

const require = createRequire(import.meta.url);
const { tapNut } = require('../lib/do-thi/dung-bang-canh.js');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(ROOT, 'scripts', 'dung-c4-model-hang.mjs');
const DATA_C4 = path.join(ROOT, 'data', 'do-thi', 'c4-model-hang.json');
const OZ_PATH = path.join(ROOT, 'data', 'oz-gold-final.jsonl');
const TAX_PATH = path.join(ROOT, 'data', 'tax.json');

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const so = (v) => String(v == null ? '' : v).replace(/\D/g, '');

let passed = 0;
let failed = 0;
function check(ten, dieuKien, chiTiet) {
  if (dieuKien) {
    passed += 1;
    console.log(`PASS ${ten}`);
  } else {
    failed += 1;
    const msg = chiTiet === undefined ? '' : ` — ${JSON.stringify(chiTiet).slice(0, 350)}`;
    console.log(`FAIL ${ten}${msg}`);
  }
}

const taxData = JSON.parse(fs.readFileSync(TAX_PATH, 'utf8'));
const tapRepo = tapNut();
const tapC4 = taoTapMaHienHanh(taxData);
const ozLines = fs.readFileSync(OZ_PATH, 'utf8').split('\n').filter((l) => l.trim().length > 0);
const ozRows = ozLines.map((l) => JSON.parse(l));
const committedBuf = fs.readFileSync(DATA_C4);
const committedDoc = JSON.parse(committedBuf.toString('utf8'));

// ── 1. Tất định từng byte & import không chạy CLI ───────────────────────────────────────────────
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'c4-test-'));
try {
  const out1 = path.join(tmpDir, 'c4-1.json');
  const out2 = path.join(tmpDir, 'c4-2.json');
  execFileSync(process.execPath, [SCRIPT, `--ra=${out1}`], { cwd: ROOT, stdio: 'pipe' });
  execFileSync(process.execPath, [SCRIPT, `--ra=${out2}`], { cwd: ROOT, stdio: 'pipe' });
  const buf1 = fs.readFileSync(out1);
  const buf2 = fs.readFileSync(out2);
  const h1 = sha256(buf1);
  const h2 = sha256(buf2);
  const hCommitted = sha256(committedBuf);
  check(
    `tất định từng byte: 2 lần dựng trùng sha256 (${h1.slice(0, 12)}…) và khớp data/do-thi/c4-model-hang.json`,
    h1 === h2 && h1 === hCommitted && buf1.equals(buf2) && buf1.equals(committedBuf),
    { h1, h2, hCommitted },
  );

  const probe = path.join(tmpDir, 'probe-import.mjs');
  const probeOut = path.join(tmpDir, 'should-not-exist.json');
  fs.writeFileSync(
    probe,
    `import { chuanKhoaModel } from ${JSON.stringify(pathToFileURL(SCRIPT).href)};\nconsole.log(chuanKhoaModel('  abc  '));\n`,
    'utf8',
  );
  const outImport = execFileSync(process.execPath, [probe, `--ra=${probeOut}`], { cwd: ROOT, encoding: 'utf8' }).trim();
  check(
    'import dung-c4-model-hang.mjs không kích hoạt CLI ghi tệp',
    outImport === 'ABC' && !fs.existsSync(probeOut),
    { outImport, exists: fs.existsSync(probeOut) },
  );

  // ── 2. Kiểm khuôn, quy ước tax.json & toàn vẹn nguồn của tệp đã commit ──────────────────────
  check(
    'tapNut().ma8 khớp hoàn toàn data/tax.json (100% khoá 8 số, 8524910020 không nằm trong tax.json)',
    tapRepo.ma8.size === tapC4.ma8.size
      && tapRepo.nhom.size === tapC4.nhom.size
      && tapRepo.ma8.has('85249100')
      && !tapRepo.ma8.has('8524910020')
      && !taxData['8524910020'],
    { ma8Repo: tapRepo.ma8.size, ma8C4: tapC4.ma8.size },
  );

  check(
    'tài liệu C4 đã commit mang loaiCaKin: false và thông số bieuThue chuẩn',
    committedDoc.phienBan === 1
      && committedDoc.loaiCanh === 'C4'
      && committedDoc.loaiCaKin === false
      && committedDoc.bieuThue?.soMa8 === tapRepo.ma8.size,
  );

  const bangLoi = [];
  const rowActiveCheck = (r) => {
    const hs = so(r.hsCode);
    return /^\d{8}$/.test(hs) && tapRepo.ma8.has(hs);
  };

  for (const e of committedDoc.bang || []) {
    const truong = e.loai === 'model' ? 'model' : e.loai === 'hang' ? 'hang' : null;
    if (!truong || typeof e[truong] !== 'string' || !e[truong].trim()) {
      bangLoi.push(`thiếu trường tên ở ${e.khoaChuan}`);
      break;
    }
    if (!e.khoaChuan || e.khoaChuan !== chuanKhoaModel(e.khoaChuan) || laNhieuModelHang(e.khoaChuan, e.loai)) {
      bangLoi.push(`khoaChuan không hợp lệ: ${e.khoaChuan}`);
      break;
    }
    if (!/^\d{4}$/.test(e.ma) || !tapRepo.nhom.has(e.ma)) {
      bangLoi.push(`nhóm không còn trong biểu: ${e.ma}`);
      break;
    }
    if (!Number.isInteger(e.soDong) || e.soDong < 2 || !Array.isArray(e.nguon) || e.nguon.length !== e.soDong) {
      bangLoi.push(`soDong/nguon sai ở ${e.khoaChuan}`);
      break;
    }
    let prevDong = 0;
    for (const n of e.nguon) {
      if (n.tep !== 'data/oz-gold-final.jsonl' || !Number.isInteger(n.dong) || n.dong < 1 || n.dong > ozRows.length || n.dong <= prevDong) {
        bangLoi.push(`nguon không hợp lệ ở ${e.khoaChuan}: ${JSON.stringify(n)}`);
        break;
      }
      prevDong = n.dong;
      const srcRow = ozRows[n.dong - 1];
      if (!rowActiveCheck(srcRow)) {
        bangLoi.push(`dòng nguồn hết hiệu lực lọt vào bang: dong=${n.dong}, hs=${srcRow.hsCode}`);
        break;
      }
      if (so(srcRow.hsCode).slice(0, 4) !== e.ma) {
        bangLoi.push(`dòng nguồn lệch nhóm 4 số: dong=${n.dong}, hs=${srcRow.hsCode}, ma=${e.ma}`);
        break;
      }
      const rawVals = e.loai === 'model' ? (srcRow.models || []) : (srcRow.brands || []);
      const normSet = new Set(rawVals.flatMap((v) => tachGiaTriModelHang(v, e.loai)).map((v) => chuanKhoaModel(v)));
      if (!normSet.has(e.khoaChuan)) {
        bangLoi.push(`dòng nguồn thiếu khoaChuan ${e.khoaChuan} ở dong=${n.dong}`);
        break;
      }
    }
    if (bangLoi.length) break;
  }
  check(
    `mọi mục bang (${committedDoc.bang.length}) đều soDong >= 2, nguon khớp từng dòng, mã 4 số & HS nguồn sống trong tax.json`,
    committedDoc.bang.length > 0 && bangLoi.length === 0,
    bangLoi,
  );

  // Không giao giữa bang và mauThuan
  const bangKeys = new Set(committedDoc.bang.map((e) => `${e.loai}|${e.khoaChuan}`));
  const mauThuanKeys = new Set(committedDoc.mauThuan.map((e) => `${e.loai}|${e.khoaChuan}`));
  const giao = [...bangKeys].filter((k) => mauThuanKeys.has(k));
  const mauThuanLoi = [];
  for (const m of committedDoc.mauThuan || []) {
    if (!Number.isInteger(m.tongDong) || m.tongDong < 2 || !Array.isArray(m.cacNhom) || m.cacNhom.length < 2) {
      mauThuanLoi.push(`mauThuan sai khuôn: ${m.khoaChuan}`);
      break;
    }
    const sum = m.cacNhom.reduce((s, g) => s + g.soDong, 0);
    if (sum !== m.tongDong || new Set(m.cacNhom.map((g) => g.ma)).size !== m.cacNhom.length) {
      mauThuanLoi.push(`mauThuan tổng/nhóm sai: ${m.khoaChuan}`);
      break;
    }
    for (const g of m.cacNhom) {
      if (!tapRepo.nhom.has(g.ma) || g.nguon.length !== g.soDong) {
        mauThuanLoi.push(`mauThuan nhóm/nguon sai: ${m.khoaChuan} -> ${g.ma}`);
        break;
      }
      for (const n of g.nguon) {
        const srcRow = ozRows[n.dong - 1];
        if (!srcRow || !rowActiveCheck(srcRow) || so(srcRow.hsCode).slice(0, 4) !== g.ma) {
          mauThuanLoi.push(`mauThuan dòng nguồn sai: ${m.khoaChuan} dong=${n.dong}`);
          break;
        }
      }
    }
    if (mauThuanLoi.length) break;
  }
  check(
    `0 trùng giữa bang và mauThuan; mọi mục mauThuan (${committedDoc.mauThuan.length}) có >= 2 nhóm hợp lệ`,
    giao.length === 0 && mauThuanKeys.size === committedDoc.mauThuan.length && bangKeys.size === committedDoc.bang.length && mauThuanLoi.length === 0,
    { giao, mauThuanLoi },
  );

  // maHetHieuLuc
  const hetLoi = [];
  for (const h of committedDoc.maHetHieuLuc || []) {
    if (!['model', 'hang'].includes(h.loai) || !h.khoaChuan || !h.maGoc || !Array.isArray(h.nguon) || h.nguon.length !== h.soDong) {
      hetLoi.push(`maHetHieuLuc sai khuôn: ${JSON.stringify(h).slice(0, 120)}`);
      break;
    }
    for (const n of h.nguon) {
      const srcRow = ozRows[n.dong - 1];
      if (!srcRow || rowActiveCheck(srcRow) || so(srcRow.hsCode) !== h.maGoc) {
        hetLoi.push(`maHetHieuLuc dòng nguồn sai: dong=${n.dong}, maGoc=${h.maGoc}`);
        break;
      }
    }
    if (hetLoi.length) break;
  }
  const co8524 = (committedDoc.maHetHieuLuc || []).some((h) => h.maGoc === '8524910020' && h.ma8TrongBieu === true);
  const co8541Het = (committedDoc.maHetHieuLuc || []).some((h) => h.maGoc === '85414029' && h.ma8TrongBieu === false);
  check(
    `maHetHieuLuc (${committedDoc.maHetHieuLuc.length} cặp) cô lập sạch mã 10 số (8524910020) và mã hết hiệu lực (85414029)`,
    committedDoc.maHetHieuLuc.length > 0 && hetLoi.length === 0 && co8524 && co8541Het,
    { hetLoi, co8524, co8541Het },
  );

  // thongKe khớp dữ liệu
  const tk = committedDoc.thongKe;
  check(
    'thongKe cộng khớp với bang, mauThuan, maHetHieuLuc và tỷ lệ phủ hợp lệ',
    tk.tongSoDong === ozRows.length
      && tk.capChapNhan.model + tk.capChapNhan.hang === tk.capChapNhan.tong
      && tk.capChapNhan.tong === committedDoc.bang.length
      && tk.capMauThuan.model + tk.capMauThuan.hang === tk.capMauThuan.tong
      && tk.capMauThuan.tong === committedDoc.mauThuan.length
      && tk.maHetHieuLuc.soCap === committedDoc.maHetHieuLuc.length
      && Number.isFinite(tk.doPhu.trenDongCoModelHangPhanTram)
      && tk.doPhu.trenDongCoModelHangPhanTram > 0 && tk.doPhu.trenDongCoModelHangPhanTram <= 100
      && Number.isFinite(tk.doPhu.trenTongSoDongPhanTram)
      && tk.doPhu.trenTongSoDongPhanTram > 0 && tk.doPhu.trenTongSoDongPhanTram <= 100,
    tk,
  );

  // ── 3. Kiểm riêng tư đệ quy & không dấu thời gian ───────────────────────────────────────────
  const KHOA_CAM = new Set([
    'tenHang', 'sampleDesc', 'khachHang', 'gia', 'soLuong', 'soToKhai', 'nsx',
    'customer', 'price', 'chatLieu', 'congDung', 'origin', 'condition', 'sizes',
    'specs', 'ozCount', 'productName', 'description',
    'taoLuc', 'ngay', 'luc', 'thoiGian', 'generatedAt', 'updatedAt', 'timestamp',
  ]);
  const KHOA_CAM_RE = /(?:^|\.)(?:tenHang|sampleDesc|khachHang|soLuong|soToKhai|customer|price|taoLuc|generatedAt|updatedAt|timestamp)$/i;
  const PII_RE = [
    /(\+84|\b0)(3[2-9]|5[689]|7[06-9]|8[1-9]|9[0-9])\d{7}\b/,
    /[\w.+-]+@[\w-]+\.[\w.]+/,
    /\b\d{11,12}\b/,
    /(công ty|cty|tnhh|cổ phần|doanh nghiệp tư nhân)/i,
    /有限公司|贸易有限|集团公司/,
  ];
  const viPhamRiengTu = [];
  const quet = (node, p) => {
    if (Array.isArray(node)) {
      node.forEach((v, i) => quet(v, `${p}[${i}]`));
      return;
    }
    if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        if (KHOA_CAM.has(k) || KHOA_CAM_RE.test(k)) {
          viPhamRiengTu.push(`khoá cấm ${p ? `${p}.` : ''}${k}`);
        }
        quet(v, p ? `${p}.${k}` : k);
      }
      return;
    }
    if (typeof node === 'string') {
      for (const re of PII_RE) {
        if (re.test(node)) viPhamRiengTu.push(`chuỗi nghi PII ở ${p}: ${node.slice(0, 60)}`);
      }
    }
  };
  quet(committedDoc, '');
  check('kiểm riêng tư đệ quy: 0 khoá cấm, 0 dấu thời gian, 0 PII trong c4-model-hang.json', viPhamRiengTu.length === 0, viPhamRiengTu.slice(0, 5));

  // ── 4. Kiểm hàm thuần: lọc nhiễu, tách chuỗi, gộp trùng dòng, mâu thuẫn & traC4 ────────────
  const nhieuMau = [
    'không nhãn hiệu', 'không hiệu', 'không có', 'khong hieu', 'không model',
    'no brand', 'none', 'n/a', 'null', 'unknown', 'OEM', 'CN', 'Zhejiang',
    'A', 'M+', '1', '20', '123', '2026', '10cm', '100%', '220v', '3.2m', '10*60', 'CAPACITOR', '',
  ];
  const nhieuLoi = nhieuMau.filter((x) => !laNhieuModelHang(x, 'hang'));
  const nhieuModelCongTy = laNhieuModelHang('Foshan Davis Outdoor Products Co.,Ltd', 'model')
    && !laNhieuModelHang('Foshan Minggong Tools Co.,Ltd', 'hang');
  const hopLeMau = [
    ['4V210-08', 'model'], ['FX3U-32MT/ES-A', 'model'], ['H3', 'model'],
    ['SC', 'model'], ['SAJ40-1.4A(A)', 'model'], ['SMC', 'hang'], ['TE', 'hang'], ['JST', 'hang'], ['Rudy Lux', 'hang'],
  ];
  const hopLeLoi = hopLeMau.filter(([v, l]) => laNhieuModelHang(v, l));
  check(
    'lọc nhiễu: chặn đủ placeholder/số thuần/đơn vị/quá ngắn; giữ đủ model/hãng thật',
    nhieuLoi.length === 0 && nhieuModelCongTy && hopLeLoi.length === 0,
    { nhieuLoi, nhieuModelCongTy, hopLeLoi },
  );

  check(
    'tách chuỗi danh sách bảo toàn Co., Ltd và số thập phân dấu phẩy',
    JSON.stringify(tachGiaTriModelHang('26601,26602,26603', 'model')) === JSON.stringify(['26601', '26602', '26603'])
      && JSON.stringify(tachGiaTriModelHang('76038; 76026', 'model')) === JSON.stringify(['76038', '76026'])
      && JSON.stringify(tachGiaTriModelHang('DC3L, DC3C', 'model')) === JSON.stringify(['DC3L', 'DC3C'])
      && JSON.stringify(tachGiaTriModelHang('WLWZ, Zinyili', 'hang')) === JSON.stringify(['WLWZ', 'Zinyili'])
      && JSON.stringify(tachGiaTriModelHang('HLT Group Co.,Ltd', 'hang')) === JSON.stringify(['HLT Group Co.,Ltd'])
      && JSON.stringify(tachGiaTriModelHang('BRW 200/31,5', 'model')) === JSON.stringify(['BRW 200/31,5']),
  );

  check(
    'chuanKhoaModel chuẩn hoá khoảng trắng, dấu câu đầu/cuối, CO., LTD và giữ ngoặc cân bằng',
    chuanKhoaModel('  Shenzhen   Technology Co.,Ltd. ') === 'SHENZHEN TECHNOLOGY CO., LTD'
      && chuanKhoaModel('SAJ40-1.4A(A)') === 'SAJ40-1.4A(A)'
      && chuanKhoaModel(' -abc- ') === 'ABC',
  );

  // Fixture nhân tạo cho dungBangC4 & traC4
  const fakeTax = {
    '84812090': { hs: '84812090' },
    '84122100': { hs: '84122100' },
    '85249100': { hs: '85249100' },
    '85369099': { hs: '85369099' },
  };
  const fakeOz = [
    // Dòng 1 lặp lại cùng 1 model 2 lần trong cùng 1 dòng → chỉ tính 1 dòng (KHÔNG vào bang)
    { hsCode: '84812090', models: ['DUP-SAME', 'dup-same'], brands: ['không nhãn hiệu', '100%'] },
    // Dòng 2 & 3 cùng model CONS-1 -> 8481 → VÀO bang
    { hsCode: '84812090', models: ['cons-1'], brands: ['BrandX'] },
    { hsCode: '84812090', models: ['CONS-1'], brands: ['BrandX'] },
    // Dòng 4 & 5 mâu thuẫn nhóm: CONF-1 vừa 8481 vừa 8412 → VÀO mauThuan, LOẠI khỏi bang
    { hsCode: '84812090', models: ['CONF-1'], brands: [] },
    { hsCode: '84122100', models: ['conf-1'], brands: [] },
    // Dòng 6 & 7 mã 10 số 8524910020 và mã hết hiệu lực 85414029 → VÀO maHetHieuLuc, KHÔNG vào bang
    { hsCode: '8524910020', models: ['CONS-1', 'TEN-ONLY'], brands: [] },
    { hsCode: '85414029', models: ['OLD-1'], brands: [] },
  ];
  const c4Fake = dungBangC4({ taxData: fakeTax, ozLines: fakeOz, tepNguon: 'fixture' });
  const fakeIdx = taoChiMucC4(c4Fake);
  const fakeBangKeys = c4Fake.bang.map((x) => `${x.loai}:${x.khoaChuan}:${x.ma}:${x.soDong}`);
  const fakeConf = c4Fake.mauThuan.find((x) => x.khoaChuan === 'CONF-1');
  const kqUutienModel = traC4({ models: ['CONS-1'], brands: ['BrandX'] }, fakeIdx);
  const kqNhieuOnly = traC4({ models: ['null', '2026', '10cm'], brands: ['không hiệu'] }, fakeIdx);
  const kqKhongThay = traC4({ models: ['KHONG-TON-TAI-XYZ'] }, fakeIdx);
  check(
    'fixture: không đếm trùng trong 1 dòng, tách mâu thuẫn khỏi bang, cô lập mã 10 số/hết hiệu lực, traC4 chuẩn',
    fakeBangKeys.length === 2
      && fakeBangKeys.includes('hang:BRANDX:8481:2')
      && fakeBangKeys.includes('model:CONS-1:8481:2')
      && !c4Fake.bang.some((x) => x.khoaChuan === 'DUP-SAME' || x.khoaChuan === 'CONF-1' || x.khoaChuan === 'OLD-1' || x.khoaChuan === 'TEN-ONLY')
      && Boolean(fakeConf && fakeConf.tongDong === 2 && fakeConf.cacNhom.length === 2)
      && c4Fake.maHetHieuLuc.some((x) => x.khoaChuan === 'TEN-ONLY' && x.maGoc === '8524910020')
      && c4Fake.maHetHieuLuc.some((x) => x.khoaChuan === 'OLD-1' && x.maGoc === '85414029')
      && kqUutienModel.timThay && kqUutienModel.loai === 'model' && kqUutienModel.ma === '8481'
      && kqNhieuOnly.trangThai === 'KHONG_CO_MODEL_HANG' && kqNhieuOnly.timThay === false
      && kqKhongThay.trangThai === 'KHONG_TIM_THAY' && kqKhongThay.timThay === false,
    { fakeBangKeys, fakeConf, kqUutienModel },
  );

  // ── 5. Kiểm loại ca kín S-7 (API + CLI + bất biến khi xáo thứ tự dòng) ─────────────────────────
  const outCleanCli = path.join(tmpDir, 'c4-clean.json');
  execFileSync(process.execPath, [SCRIPT, '--loai-ca-kin', `--ra=${outCleanCli}`], { cwd: ROOT, stdio: 'pipe' });
  const c4Clean = JSON.parse(fs.readFileSync(outCleanCli, 'utf8'));
  const holdoutDongs = new Set();
  for (let i = 0; i < ozRows.length; i += 1) {
    if (laCaKin(ozRows[i])) holdoutDongs.add(i + 1);
  }
  const nguonClean = [
    ...c4Clean.bang.flatMap((x) => x.nguon),
    ...c4Clean.mauThuan.flatMap((x) => x.cacNhom.flatMap((g) => g.nguon)),
    ...c4Clean.maHetHieuLuc.flatMap((x) => x.nguon),
  ];
  const roHoldout = nguonClean.filter((n) => holdoutDongs.has(n.dong));
  check(
    `S-7 --loai-ca-kin loại sạch ${holdoutDongs.size} dòng holdout (0/${nguonClean.length} tham chiếu nguon lọt vào bang/mauThuan/maHetHieuLuc)`,
    c4Clean.loaiCaKin === true && c4Clean.thongKe.soDongBiLoaiCaKin === holdoutDongs.size && roHoldout.length === 0,
    { soBiLoai: c4Clean.thongKe.soDongBiLoaiCaKin, holdoutSize: holdoutDongs.size, roHoldout: roHoldout.slice(0, 5) },
  );

  // Xáo dòng bất biến (S-7 dùng khoaNoiDung + tenChuan, không dùng số dòng)
  const xaoTatDinh = (arr, seed = 20261122) => {
    const out = [...arr];
    let a = seed >>> 0;
    const rng = () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  const shuffledRows = xaoTatDinh(ozRows);
  const c4ShuffledClean = dungBangC4({ loaiCaKin: true, ozLines: shuffledRows, taxData });
  const holdoutKeys = new Set(ozRows.filter((r) => laCaKin(r)).map((r) => khoaNoiDung(r)));
  const shuffledNguon = [
    ...c4ShuffledClean.bang.flatMap((x) => x.nguon),
    ...c4ShuffledClean.mauThuan.flatMap((x) => x.cacNhom.flatMap((g) => g.nguon)),
    ...c4ShuffledClean.maHetHieuLuc.flatMap((x) => x.nguon),
  ];
  const roKhiXao = shuffledNguon.filter((n) => holdoutKeys.has(khoaNoiDung(shuffledRows[n.dong - 1])));
  const sigBang = (doc) => doc.bang.map((e) => `${e.loai}|${e.khoaChuan}|${e.ma}|${e.soDong}`);
  check(
    'S-7 bất biến khi xáo thứ tự dòng oz-gold: 0 rò holdout và tập bang khớp từng mục',
    roKhiXao.length === 0 && JSON.stringify(sigBang(c4Clean)) === JSON.stringify(sigBang(c4ShuffledClean)),
    { roKhiXao: roKhiXao.length },
  );

  // ── 6. Đo trên de-rieng-300.jsonl ────────────────────────────────────────────────────────────
  const evalObj = doTrenDeRieng300();
  const evalCliOut = execFileSync(process.execPath, [SCRIPT, '--do-de-rieng'], { cwd: ROOT, encoding: 'utf8' });
  const evalCli = JSON.parse(evalCliOut);
  const chiTietSach = (evalObj.chiTietKhongChuaTenHang || []).every((x) => !('tenHang' in x) && !('sampleDesc' in x));
  check(
    `--do-de-rieng chạy sạch: ${evalObj.soCaDungNhom4}/${evalObj.soCaDuocPhu} đúng (${evalObj.doChinhXacTrenCaDuocPhuPhanTram}%), phủ ${evalObj.soCaDuocPhu}/${evalObj.tongCa} (${evalObj.doPhuTrenTongCaPhanTram}%)`,
    evalObj.tongCa === 300
      && evalObj.caKhongTimThayKhoa === 0
      && evalObj.soCaDungNhom4 + evalObj.soCaSaiNhom4 === evalObj.soCaDuocPhu
      && Number.isFinite(evalObj.doPhuTrenTongCaPhanTram)
      && Number.isFinite(evalObj.doPhuTrenCaCoModelHangPhanTram)
      && Number.isFinite(evalObj.doChinhXacTrenCaDuocPhuPhanTram)
      && evalObj.thongKeBangSach.soDongBiLoaiCaKin === holdoutDongs.size
      && chiTietSach
      && evalCli.soCaDuocPhu === evalObj.soCaDuocPhu
      && evalCli.soCaDungNhom4 === evalObj.soCaDungNhom4,
    evalObj,
  );
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

console.log(`\n${passed}/${passed + failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
