#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * Cổng tự kiểm bảng tra C4 bản 2 (`scripts/dung-c4-model-hang.mjs` & `data/do-thi/c4-model-hang.json`).
 *
 * Kiểm:
 *   1. Dựng lại 2 lần ra tệp tạm cho cùng sha256 và khớp từng byte với `data/do-thi/c4-model-hang.json`.
 *   2. `phienBan === 2`, tách rõ `hang_model`, `model` (>= 3 ký tự chữ/số, không thông số/mô tả),
 *      `hang` chuyên biệt (>= 4 dòng, không pháp nhân/địa danh), và `hangThamKhao` tách khỏi `bang`.
 *   3. 0 trùng lặp giữa `bang` và `mauThuan`; `maHetHieuLuc` tách riêng mã 10 số (`8524910020`) và mã hết hiệu lực.
 *   4. Đệ quy kiểm riêng tư: 0 khoá cấm, 0 dấu thời gian, 0 PII / tên pháp nhân doanh nghiệp trong `bang`/`hangThamKhao`/`mauThuan`/`maHetHieuLuc`.
 *   5. Lọc nhiễu v1+v2, tách chuỗi, ghép `hang_model`, tách `hangThamKhao`, xử lý mâu thuẫn nhóm, tra cứu `traC4`.
 *   6. Loại ca kín S-7 (`loaiCaKin: true`) loại sạch mọi dòng holdout (bất biến khi xáo thứ tự dòng).
 *   7. Đo trên `de-rieng-300.jsonl` (`doTrenDeRieng300` & `--do-de-rieng`): bảng chính đạt 100% chính xác (0 sai), tách rõ `thamKhao`.
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
  demChuSo,
  doTrenDeRieng300,
  dungBangC4,
  laNhieuModelHang,
  laTenCongTyHoacDiaDanhHang,
  laThongSoHoacMoTaModel,
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

  // ── 2. Kiểm khuôn v2, quy ước tax.json & toàn vẹn nguồn của tệp đã commit ───────────────────
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
    'tài liệu C4 bản 2 mang phienBan: 2, loaiCaKin: false và thông số bieuThue chuẩn',
    committedDoc.phienBan === 2
      && committedDoc.loaiCanh === 'C4'
      && committedDoc.loaiCaKin === false
      && committedDoc.bieuThue?.soMa8 === tapRepo.ma8.size
      && Array.isArray(committedDoc.hangThamKhao),
  );

  const bangLoi = [];
  const rowActiveCheck = (r) => {
    const hs = so(r.hsCode);
    return /^\d{8}$/.test(hs) && tapRepo.ma8.has(hs);
  };

  for (const e of committedDoc.bang || []) {
    if (e.loai === 'hang_model') {
      if (typeof e.hang !== 'string' || !e.hang.trim() || typeof e.model !== 'string' || !e.model.trim()) {
        bangLoi.push(`hang_model thiếu trường tên ở ${e.khoaChuan}`);
        break;
      }
      const kh = chuanKhoaModel(e.hang);
      const km = chuanKhoaModel(e.model);
      if (e.khoaChuan !== `${kh} | ${km}` || laNhieuModelHang(kh, 'hang') || laTenCongTyHoacDiaDanhHang(kh) || laNhieuModelHang(km, 'model') || laThongSoHoacMoTaModel(km)) {
        bangLoi.push(`hang_model khoá không hợp lệ: ${e.khoaChuan}`);
        break;
      }
      if (!Number.isInteger(e.soDong) || e.soDong < 2) {
        bangLoi.push(`hang_model soDong < 2: ${e.khoaChuan}`);
        break;
      }
    } else if (e.loai === 'model') {
      if (typeof e.model !== 'string' || !e.model.trim()) {
        bangLoi.push(`model thiếu tên ở ${e.khoaChuan}`);
        break;
      }
      if (!e.khoaChuan || e.khoaChuan !== chuanKhoaModel(e.khoaChuan) || laNhieuModelHang(e.khoaChuan, 'model') || laThongSoHoacMoTaModel(e.khoaChuan) || demChuSo(e.khoaChuan) < 3) {
        bangLoi.push(`model khoaChuan không hợp lệ v2: ${e.khoaChuan}`);
        break;
      }
      if (!Number.isInteger(e.soDong) || e.soDong < 2) {
        bangLoi.push(`model soDong < 2: ${e.khoaChuan}`);
        break;
      }
    } else if (e.loai === 'hang') {
      if (typeof e.hang !== 'string' || !e.hang.trim()) {
        bangLoi.push(`hang thiếu tên ở ${e.khoaChuan}`);
        break;
      }
      if (!e.khoaChuan || e.khoaChuan !== chuanKhoaModel(e.khoaChuan) || laNhieuModelHang(e.khoaChuan, 'hang') || laTenCongTyHoacDiaDanhHang(e.khoaChuan) || demChuSo(e.khoaChuan) < 3) {
        bangLoi.push(`hang khoaChuan không hợp lệ v2: ${e.khoaChuan}`);
        break;
      }
      if (!Number.isInteger(e.soDong) || e.soDong < 4) {
        bangLoi.push(`hang chuyên biệt phải có soDong >= 4 ở v2: ${e.khoaChuan} (${e.soDong})`);
        break;
      }
    } else {
      bangLoi.push(`loai lạ: ${e.loai}`);
      break;
    }

    if (!/^\d{4}$/.test(e.ma) || !tapRepo.nhom.has(e.ma)) {
      bangLoi.push(`nhóm không còn trong biểu: ${e.ma}`);
      break;
    }
    if (!Array.isArray(e.nguon) || e.nguon.length !== e.soDong) {
      bangLoi.push(`nguon.length !== soDong ở ${e.khoaChuan}`);
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
      const normModels = new Set((srcRow.models || []).flatMap((v) => tachGiaTriModelHang(v, 'model')).map((v) => chuanKhoaModel(v)));
      const normBrands = new Set((srcRow.brands || []).flatMap((v) => tachGiaTriModelHang(v, 'hang')).map((v) => chuanKhoaModel(v)));
      if (e.loai === 'hang_model') {
        const [kh, km] = e.khoaChuan.split(' | ');
        if (!normBrands.has(kh) || !normModels.has(km)) {
          bangLoi.push(`dòng nguồn thiếu cặp ${e.khoaChuan} ở dong=${n.dong}`);
          break;
        }
      } else if (e.loai === 'model' && !normModels.has(e.khoaChuan)) {
        bangLoi.push(`dòng nguồn thiếu model ${e.khoaChuan} ở dong=${n.dong}`);
        break;
      } else if (e.loai === 'hang' && !normBrands.has(e.khoaChuan)) {
        bangLoi.push(`dòng nguồn thiếu hang ${e.khoaChuan} ở dong=${n.dong}`);
        break;
      }
    }
    if (bangLoi.length) break;
  }
  check(
    `mọi mục bang (${committedDoc.bang.length}: ${committedDoc.thongKe.capChapNhan.hang_model} hang_model, ${committedDoc.thongKe.capChapNhan.model} model, ${committedDoc.thongKe.capChapNhan.hang} hang) đạt chuẩn v2 & khớp từng dòng nguồn`,
    committedDoc.bang.length > 0 && bangLoi.length === 0,
    bangLoi,
  );

  // Kiểm hangThamKhao tách rời bang và đạt chuẩn v2
  const bangKeys = new Set(committedDoc.bang.map((e) => `${e.loai}|${e.khoaChuan}`));
  const tkKeys = new Set((committedDoc.hangThamKhao || []).map((e) => `${e.loai}|${e.khoaChuan}`));
  const giaoBangTk = [...bangKeys].filter((k) => tkKeys.has(k));
  const tkLoi = [];
  for (const t of committedDoc.hangThamKhao || []) {
    if (t.loai !== 'hang' || t.chiGoiY !== true || !tapRepo.nhom.has(t.ma)) {
      tkLoi.push(`hangThamKhao sai khuôn: ${t.khoaChuan}`);
      break;
    }
    if (laTenCongTyHoacDiaDanhHang(t.khoaChuan) || demChuSo(t.khoaChuan) < 3) {
      tkLoi.push(`hangThamKhao lọt pháp nhân/địa danh/ngắn: ${t.khoaChuan}`);
      break;
    }
    if (!Number.isFinite(t.doTinhKhiet) || t.doTinhKhiet < 0.8 || t.tongDong < 2) {
      tkLoi.push(`hangThamKhao dưới ngưỡng tinh khiết: ${t.khoaChuan}`);
      break;
    }
  }
  check(
    `hangThamKhao (${committedDoc.hangThamKhao.length}) tách rời khỏi bang, chiGoiY: true, độ tinh khiết >= 80%`,
    committedDoc.hangThamKhao.length > 0 && giaoBangTk.length === 0 && tkLoi.length === 0,
    { giaoBangTk, tkLoi },
  );

  // Không giao giữa bang và mauThuan
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
    'thongKe khớp với bang, hangThamKhao, mauThuan, maHetHieuLuc và tỷ lệ phủ hợp lệ',
    tk.tongSoDong === ozRows.length
      && tk.capChapNhan.hang_model + tk.capChapNhan.model + tk.capChapNhan.hang === tk.capChapNhan.tong
      && tk.capChapNhan.tong === committedDoc.bang.length
      && tk.hangThamKhao.soCap === committedDoc.hangThamKhao.length
      && tk.capMauThuan.hang_model + tk.capMauThuan.model + tk.capMauThuan.hang === tk.capMauThuan.tong
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
    /(công ty|cty|tnhh|cổ phần|doanh nghiệp tư nhân|co\.,? ?ltd)/i,
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
  check('kiểm riêng tư đệ quy: 0 khoá cấm, 0 dấu thời gian, 0 PII / hậu tố pháp nhân trong c4-model-hang.json', viPhamRiengTu.length === 0, viPhamRiengTu.slice(0, 5));

  // ── 4. Kiểm hàm thuần: lọc nhiễu v1+v2, tách chuỗi, ghép hang_model, hangThamKhao & traC4 ───
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
    'lọc nhiễu cơ bản: chặn đủ placeholder/số thuần/đơn vị/quá ngắn; giữ đủ model/hãng thật',
    nhieuLoi.length === 0 && nhieuModelCongTy && hopLeLoi.length === 0,
    { nhieuLoi, nhieuModelCongTy, hopLeLoi },
  );

  check(
    'bộ lọc v2 chặn thông số chuẩn/tên máy ở model và chặn pháp nhân/địa danh ở hang',
    laThongSoHoacMoTaModel('DN15')
      && laThongSoHoacMoTaModel('DN25')
      && laThongSoHoacMoTaModel('PD20W')
      && laThongSoHoacMoTaModel('IP17')
      && laThongSoHoacMoTaModel('NOTE 10')
      && laThongSoHoacMoTaModel('ZIN')
      && laThongSoHoacMoTaModel('SAMSUNG S SERIES')
      && laThongSoHoacMoTaModel('PRD SIÊU CAO')
      && !laThongSoHoacMoTaModel('4V210-08')
      && !laThongSoHoacMoTaModel('WTP-009')
      && laTenCongTyHoacDiaDanhHang('GUANGXI PINGXIANG XUNJIE TRADE CO., LTD')
      && laTenCongTyHoacDiaDanhHang('HLT GROUP CO., LTD')
      && laTenCongTyHoacDiaDanhHang("TAI'AN")
      && laTenCongTyHoacDiaDanhHang('SHENZHEN TECHNOLOGY')
      && !laTenCongTyHoacDiaDanhHang('RUDY LUX')
      && !laTenCongTyHoacDiaDanhHang('VN WEKOME')
      && !laTenCongTyHoacDiaDanhHang('SMC'),
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

  // Fixture nhân tạo cho dungBangC4 v2 & traC4
  const fakeTax = {
    '84812090': { hs: '84812090' },
    '84122100': { hs: '84122100' },
    '85249100': { hs: '85249100' },
    '85369099': { hs: '85369099' },
  };
  const fakeOz = [
    // Dòng 1 lặp lại cùng model 2 lần trong 1 dòng → chỉ tính 1 dòng (KHÔNG vào bang)
    { hsCode: '84812090', models: ['DUP-SAME', 'dup-same'], brands: ['không nhãn hiệu', '100%'] },
    // Dòng 2 & 3: cùng model CONS-1 + BrandWeak (chỉ 2 dòng → BrandWeak vào hangThamKhao, KHÔNG vào bang; hang_model & model VÀO bang)
    { hsCode: '84812090', models: ['cons-1'], brands: ['BrandWeak'] },
    { hsCode: '84812090', models: ['CONS-1'], brands: ['BrandWeak'] },
    // Dòng 4 & 5: mã ngắn 2 ký tự H3 chỉ được chấp nhận khi đi cùng hãng (BrandX | H3), còn model H3 đơn lẻ bị loại
    { hsCode: '85369099', models: ['H3'], brands: ['BrandX'] },
    { hsCode: '85369099', models: ['h3'], brands: ['BrandX'] },
    // Dòng 6: BrandX lại xuất hiện ở nhóm khác 8412 với model khác → BrandX mâu thuẫn nhóm, nhưng BrandX | H3 vẫn thuần 8536!
    { hsCode: '84122100', models: ['OTHER-99'], brands: ['BrandX'] },
    // Dòng 7..10: SpecBrand đủ 4 dòng thuần 8412 → VÀO bang (hang chuyên biệt); kèm lọc bỏ công ty/thông số DN15
    { hsCode: '84122100', models: ['DN15'], brands: ['SpecBrand'] },
    { hsCode: '84122100', models: ['DN15'], brands: ['SpecBrand'] },
    { hsCode: '84122100', models: [], brands: ['SpecBrand'] },
    { hsCode: '84122100', models: [], brands: ['SpecBrand'] },
    // Dòng 11 & 12: mã 10 số & hết hiệu lực → maHetHieuLuc
    { hsCode: '8524910020', models: ['TEN-ONLY'], brands: [] },
    { hsCode: '85414029', models: ['OLD-1'], brands: [] },
  ];
  const c4Fake = dungBangC4({ taxData: fakeTax, ozLines: fakeOz, tepNguon: 'fixture' });
  const fakeIdx = taoChiMucC4(c4Fake);
  const fakeBangKeys = c4Fake.bang.map((x) => `${x.loai}:${x.khoaChuan}:${x.ma}:${x.soDong}`);
  const kqUuTienPair = traC4({ models: ['CONS-1'], brands: ['BrandWeak'] }, fakeIdx);
  const kqH3CoHang = traC4({ models: ['H3'], brands: ['BrandX'] }, fakeIdx);
  const kqH3DonLe = traC4({ models: ['H3'] }, fakeIdx);
  const kqWeakBrandOnly = traC4({ brands: ['BrandWeak'] }, fakeIdx);
  const kqSpecBrand = traC4({ brands: ['SpecBrand'] }, fakeIdx);
  const kqNhieuOnly = traC4({ models: ['null', 'DN15', '10cm'], brands: ['không hiệu', 'ABC Co., Ltd'] }, fakeIdx);
  const kqKhongThay = traC4({ models: ['KHONG-TON-TAI-XYZ'] }, fakeIdx);
  check(
    'fixture v2: tách hang_model > model > hang chuyên biệt; chặn H3 đơn lẻ, DN15, Co., Ltd; hạ cấp BrandWeak sang hangThamKhao',
    fakeBangKeys.includes('hang_model:BRANDWEAK | CONS-1:8481:2')
      && fakeBangKeys.includes('hang_model:BRANDX | H3:8536:2')
      && fakeBangKeys.includes('model:CONS-1:8481:2')
      && fakeBangKeys.includes('hang:SPECBRAND:8412:4')
      && !c4Fake.bang.some((x) => x.loai === 'model' && (x.khoaChuan === 'H3' || x.khoaChuan === 'DN15' || x.khoaChuan === 'DUP-SAME'))
      && !c4Fake.bang.some((x) => x.loai === 'hang' && (x.khoaChuan === 'BRANDWEAK' || x.khoaChuan === 'BRANDX'))
      && c4Fake.hangThamKhao.some((x) => x.khoaChuan === 'BRANDWEAK' && x.ma === '8481' && x.chiGoiY === true)
      && kqUuTienPair.timThay && kqUuTienPair.loai === 'hang_model' && kqUuTienPair.ma === '8481'
      && kqH3CoHang.timThay && kqH3CoHang.loai === 'hang_model' && kqH3CoHang.ma === '8536'
      && kqH3DonLe.timThay === false && kqH3DonLe.trangThai === 'KHONG_CO_MODEL_HANG'
      && kqWeakBrandOnly.timThay === false && kqWeakBrandOnly.trangThai === 'KHONG_TIM_THAY' && kqWeakBrandOnly.thamKhao.length === 1
      && kqSpecBrand.timThay && kqSpecBrand.loai === 'hang' && kqSpecBrand.ma === '8412'
      && kqNhieuOnly.trangThai === 'KHONG_CO_MODEL_HANG' && kqNhieuOnly.timThay === false
      && kqKhongThay.trangThai === 'KHONG_TIM_THAY' && kqKhongThay.timThay === false,
    { fakeBangKeys, kqWeakBrandOnly, kqH3CoHang, kqH3DonLe },
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
    ...c4Clean.hangThamKhao.flatMap((x) => x.cacNhom.flatMap((g) => g.nguon)),
    ...c4Clean.mauThuan.flatMap((x) => x.cacNhom.flatMap((g) => g.nguon)),
    ...c4Clean.maHetHieuLuc.flatMap((x) => x.nguon),
  ];
  const roHoldout = nguonClean.filter((n) => holdoutDongs.has(n.dong));
  check(
    `S-7 --loai-ca-kin loại sạch ${holdoutDongs.size} dòng holdout (0/${nguonClean.length} tham chiếu nguon lọt vào bang/hangThamKhao/mauThuan/maHetHieuLuc)`,
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
    ...c4ShuffledClean.hangThamKhao.flatMap((x) => x.cacNhom.flatMap((g) => g.nguon)),
    ...c4ShuffledClean.mauThuan.flatMap((x) => x.cacNhom.flatMap((g) => g.nguon)),
    ...c4ShuffledClean.maHetHieuLuc.flatMap((x) => x.nguon),
  ];
  const roKhiXao = shuffledNguon.filter((n) => holdoutKeys.has(khoaNoiDung(shuffledRows[n.dong - 1])));
  const sigBang = (doc) => doc.bang.map((e) => `${e.loai}|${e.khoaChuan}|${e.ma}|${e.soDong}`);
  const sigTk = (doc) => doc.hangThamKhao.map((e) => `${e.khoaChuan}|${e.ma}|${e.tongDong}|${e.doTinhKhiet}`);
  check(
    'S-7 bất biến khi xáo thứ tự dòng oz-gold: 0 rò holdout và tập bang + hangThamKhao khớp từng mục',
    roKhiXao.length === 0
      && JSON.stringify(sigBang(c4Clean)) === JSON.stringify(sigBang(c4ShuffledClean))
      && JSON.stringify(sigTk(c4Clean)) === JSON.stringify(sigTk(c4ShuffledClean)),
    { roKhiXao: roKhiXao.length },
  );

  // ── 6. Đo trên de-rieng-300.jsonl ────────────────────────────────────────────────────────────
  const evalObj = doTrenDeRieng300();
  const evalCliOut = execFileSync(process.execPath, [SCRIPT, '--do-de-rieng'], { cwd: ROOT, encoding: 'utf8' });
  const evalCli = JSON.parse(evalCliOut);
  const chiTietSach = (evalObj.chiTietKhongChuaTenHang || []).every((x) => !('tenHang' in x) && !('sampleDesc' in x))
    && (evalObj.thamKhao?.chiTietKhongChuaTenHang || []).every((x) => !('tenHang' in x) && !('sampleDesc' in x));
  check(
    `--do-de-rieng bản 2 chạy sạch: bảng chính ${evalObj.soCaDungNhom4}/${evalObj.soCaDuocPhu} đúng (${evalObj.doChinhXacTrenCaDuocPhuPhanTram}%, 0 sai); thamKhao ${evalObj.thamKhao.soCaDungNhom4}/${evalObj.thamKhao.soCaCoGoiY} (${evalObj.thamKhao.doChinhXacPhanTram}%)`,
    evalObj.phienBan === 2
      && evalObj.tongCa === 300
      && evalObj.caKhongTimThayKhoa === 0
      && evalObj.soCaDuocPhu >= 1
      && evalObj.soCaSaiNhom4 === 0
      && evalObj.doChinhXacTrenCaDuocPhuPhanTram === 100
      && evalObj.soCaDungNhom4 + evalObj.soCaSaiNhom4 === evalObj.soCaDuocPhu
      && Number.isFinite(evalObj.doPhuTrenTongCaPhanTram)
      && Number.isFinite(evalObj.doPhuTrenCaCoModelHangPhanTram)
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
