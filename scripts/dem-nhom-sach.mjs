#!/usr/bin/env node
/**
 * scripts/dem-nhom-sach.mjs — Đếm số nhóm 4 số đã SẠCH theo công thức V1 (OZV-832).
 *
 * Định nghĩa "nhóm 4 số SẠCH" theo Công thức V1 (/paperclip/du-lieu/hs-cuon-chieu/cong-thuc/V1-luat-bam-luat.md
 * và V3-phu-dinh-nhom2.md — bỏ mục 6 người ký, kiểm hoàn toàn bằng máy):
 *   1. Có sổ tay (data/so-tay/<nhom4>.json), không có bản ghi dong8 trùng mã (mục 3c V1), phủ đủ mọi dòng 8 số
 *      của nhóm trong cây biểu thuế, và mọi phân nhóm 6 số có ≥ 2 dòng 8 số đều đã có ranh giới DUYET
 *      (data/ho-so/ranh-gioi/<pn6>.json trangThai="DUYET") hoặc mọi dòng có tên đã có dieuKienSo/phanConLai.
 *   2. Tên khác có nguồn nguyên văn và qua cổng anh em 0 vi phạm (scripts/cong-anh-em.mjs).
 *   3. Mọi dòng 8 số "Loại khác" có phamViLoaiKhac.truAnhEm khớp đủ danh sách anh em có tên (lib/hs-tree.js#loaiKhacOf).
 *   4. Bộ kiểm luật (scripts/bo-kiem-luat.mjs) đạt ngưỡng:
 *      - Dòng 8 số có tên (DONG_CO_TEN): tỉ lệ chốt đúng ≥ 95%;
 *      - Cụm tên khác L1/L2 (TEN_KHAC, nếu có): tỉ lệ chốt đúng ≥ 95%;
 *      - Chốt "Loại khác" sai = 0 (chotLoaiKhacSai === 0);
 *      - Chốt sai dòng = 0 (chotSai === 0).
 *   5. Không ném lỗi (nemLoi === 0).
 *
 * Cách dùng:
 *   node scripts/dem-nhom-sach.mjs [--json] [--nhom=8539,8541] [--limit=20]
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { sinhCaNhom } from './bo-kiem-luat.mjs';
import { kiemCongAnhEm } from './cong-anh-em.mjs';

const require = createRequire(import.meta.url);
const T = require('../lib/hs-tree.js');
const DK = require('../lib/dieu-kien-so.js');
const { dataReadPath } = require('../lib/data-paths.js');
const { chotDong8, loadSoTay } = require('../lib/so-tay-gates.js');

const nz = (v) => String(v == null ? '' : v).replace(/\D/g, '');

/** Lấy danh sách toàn bộ nhóm 4 số từ cây biểu thuế (1.269 nhóm). */
export function danhSachNhom4() {
  const codes8 = T.tree().codes.filter((c) => c.length === 8);
  return [...new Set(codes8.map((c) => c.slice(0, 4)))].sort();
}

/** Tìm tập các nhóm 4 số có khai báo tên khác trong data/tu-vung/ để chỉ chạy cổng anh em khi cần. */
function tapNhomCoTenKhac() {
  const set = new Set();
  try {
    const dir = dataReadPath('tu-vung');
    if (fs.existsSync(dir)) {
      for (const f of fs.readdirSync(dir)) {
        const m = f.match(/^ten-khac-(\d{4})\.json$/);
        if (m) set.add(m[1]);
      }
    }
  } catch { /* ignore */ }
  try {
    const p2 = dataReadPath('tu-vung', 'tu-vung@2.json');
    if (fs.existsSync(p2)) {
      const tv2 = JSON.parse(fs.readFileSync(p2, 'utf8'));
      for (const k of Object.keys(tv2?.tenKhac || {})) {
        const n4 = nz(k).slice(0, 4);
        if (n4.length === 4) set.add(n4);
      }
    }
  } catch { /* ignore */ }
  return set;
}

let _nhomCoTenKhacCache = null;
function nhomCoTenKhac(nhom4, boQuaCache = false) {
  if (boQuaCache || !_nhomCoTenKhacCache) {
    _nhomCoTenKhacCache = tapNhomCoTenKhac();
  }
  return _nhomCoTenKhacCache.has(nhom4);
}

/** Đọc sổ tay của nhóm 4 số (cho phép bỏ qua cache khi test cách ly ghi vào HS_DATA_DIR). */
function docSoTayNhom(nhom4, boQuaCache = false) {
  if (!boQuaCache) return loadSoTay(nhom4);
  const p = dataReadPath('so-tay', `${nhom4}.json`);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Đánh giá một nhóm 4 số theo 5 mục kiểm máy của Công thức V1.
 * @param {string} nhom4 Mã nhóm 4 số (vd '8539')
 * @param {{boQuaCache?: boolean}} [opts]
 */
export function danhGiaNhomV1(nhom4, opts = {}) {
  const h4 = nz(nhom4).slice(0, 4);
  const tree = T.tree();
  const codes8 = tree.codes.filter((c) => c.startsWith(h4) && c.length === 8);
  const st = docSoTayNhom(h4, Boolean(opts.boQuaCache));

  if (!st) {
    return {
      nhom: h4,
      sach: false,
      lyDo: ['chua-co-so-tay'],
      dongCoTen: { tong: 0, chotDung: 0 },
      tenKhac: { tong: 0, chotDung: 0 },
      chotSai: 0,
      chotLoaiKhacSai: 0,
      nemLoi: 0,
    };
  }

  const lyDo = [];
  const dong8List = Array.isArray(st.dong8) ? st.dong8 : [];
  const hsList = dong8List.map((d) => nz(d?.hs)).filter((h) => h.length === 8);
  const hsSet = new Set(hsList);

  // Mục 1a: Không có bản ghi dong8 trùng mã trong sổ tay (V1 mục 3c)
  if (hsSet.size !== hsList.length) {
    lyDo.push(`trung-dong8(${hsList.length - hsSet.size})`);
  }

  // Mục 1b: Sổ tay phủ đủ các dòng 8 số của nhóm trong biểu thuế
  const thieuDong = codes8.filter((c) => !hsSet.has(c));
  if (thieuDong.length > 0) {
    lyDo.push(`thieu-dong8(${thieuDong.length}/${codes8.length})`);
  }

  // Mục 1c: Mọi phân nhóm 6 số có ≥ 2 dòng 8 số phải có ranh giới DUYET hoặc đã số hoá đủ dieuKienSo/phanConLai
  const byPn6 = new Map();
  for (const c of codes8) {
    const p6 = c.slice(0, 6);
    if (!byPn6.has(p6)) byPn6.set(p6, []);
    byPn6.get(p6).push(c);
  }
  const stByHs = new Map(dong8List.map((d) => [nz(d?.hs), d]));
  let pn6ChuaDuyet = 0;
  for (const [p6, list8] of byPn6.entries()) {
    if (list8.length < 2) continue;
    let rgDuyet = null;
    const rgP = dataReadPath('ho-so', 'ranh-gioi', `${p6}.json`);
    if (fs.existsSync(rgP)) {
      try {
        const rg = JSON.parse(fs.readFileSync(rgP, 'utf8'));
        if (rg && rg.trangThai === 'DUYET') rgDuyet = rg;
      } catch { /* ignore */ }
    }
    if (rgDuyet) continue;

    let duDkTrongSoTay = true;
    for (const hs8 of list8) {
      const n8 = T.nodeOf(hs8);
      if (n8?.loaiKhacTran) continue;
      const s = stByHs.get(hs8);
      if (!(Array.isArray(s?.dieuKienSo) && s.dieuKienSo.length > 0) && !DK.coPhanConLai(s)) {
        duDkTrongSoTay = false;
        break;
      }
    }
    if (!duDkTrongSoTay) pn6ChuaDuyet += 1;
  }
  if (pn6ChuaDuyet > 0) {
    lyDo.push(`chua-duyet-ranh-gioi(${pn6ChuaDuyet} pn6)`);
  }

  // Mục 2: Tên khác có nguồn nguyên văn và qua cổng anh em 0 vi phạm
  if (nhomCoTenKhac(h4, Boolean(opts.boQuaCache))) {
    const cae = kiemCongAnhEm(h4);
    if (!cae.dat) {
      lyDo.push(`cong-anh-em-vi-pham(${cae.viPham.length})`);
    }
  }

  // Mục 3: Mọi dòng "Loại khác" có phamViLoaiKhac.truAnhEm bao phủ đủ danh sách anh em có tên
  let thieuTru = 0;
  for (const c of codes8) {
    const lk = T.loaiKhacOf(c);
    if (!lk) continue;
    const d = stByHs.get(c);
    const tru = d?.phamViLoaiKhac?.truAnhEm;
    if (!Array.isArray(tru) || !lk.anhEmCoTen.every((x) => tru.includes(x))) {
      thieuTru += 1;
    }
  }
  if (thieuTru > 0) {
    lyDo.push(`thieu-tru-anh-em(${thieuTru})`);
  }

  // Mục 4 & 5: Bộ kiểm luật (DONG_CO_TEN ≥ 95%, chotSai = 0, chotLoaiKhacSai = 0) & Không ném lỗi (nemLoi = 0)
  const { caDongCoTen, caTenKhac, caLoaiTruLK, caThieuDuKien } = sinhCaNhom(h4);
  let dcTong = caDongCoTen.length;
  let dcDung = 0;
  let tkTong = caTenKhac.length;
  let tkDung = 0;
  let chotSai = 0;
  let chotLoaiKhacSai = 0;
  let nemLoi = 0;

  for (const ca of [...caDongCoTen, ...caTenKhac]) {
    let kq = null;
    try {
      kq = chotDong8({ hs: ca.pn6, productText: ca.productText });
    } catch {
      nemLoi += 1;
      continue;
    }
    if (ca.loaiCa === 'TEN_KHAC_LOAI_TRU') {
      if (kq.hs === ca.hs8) chotSai += 1;
      else tkDung += 1;
      continue;
    }
    if ((kq.ketQua === 'CHOT' || kq.ketQua === 'LOAI_KHAC') && kq.hs === ca.kyVong) {
      if (ca.loaiCa === 'DONG_CO_TEN') dcDung += 1;
      else tkDung += 1;
    } else if (kq.ketQua === 'LOAI_KHAC' || (kq.hs && T.nodeOf(kq.hs)?.loaiKhacTran)) {
      chotLoaiKhacSai += 1;
    } else if (kq.ketQua === 'CHOT' && kq.hs !== ca.kyVong) {
      chotSai += 1;
    }
  }

  for (const ca of caLoaiTruLK) {
    let kq = null;
    try {
      kq = chotDong8({ hs: ca.pn6, productText: ca.productText });
    } catch {
      nemLoi += 1;
      continue;
    }
    if (kq.ketQua === 'LOAI_KHAC' && kq.hs !== ca.kyVong) chotLoaiKhacSai += 1;
    else if (kq.ketQua === 'CHOT' && kq.hs !== ca.kyVong) chotSai += 1;
  }

  for (const ca of caThieuDuKien) {
    let kq = null;
    try {
      kq = chotDong8({ hs: ca.pn6, productText: ca.productText });
    } catch {
      nemLoi += 1;
      continue;
    }
    if (kq.ketQua === 'LOAI_KHAC') chotLoaiKhacSai += 1;
    else if (kq.ketQua === 'CHOT') chotSai += 1;
  }

  if (nemLoi > 0) lyDo.push(`nem-loi(${nemLoi})`);
  if (chotSai > 0) lyDo.push(`chot-sai(${chotSai})`);
  if (chotLoaiKhacSai > 0) lyDo.push(`chot-loai-khac-sai(${chotLoaiKhacSai})`);
  if (dcTong > 0 && dcDung / dcTong < 0.95) {
    const pct = ((dcDung / dcTong) * 100).toFixed(1);
    lyDo.push(`dong-co-ten(${dcDung}/${dcTong}=${pct}%<95%)`);
  }
  if (tkTong > 0 && tkDung / tkTong < 0.95) {
    const pct = ((tkDung / tkTong) * 100).toFixed(1);
    lyDo.push(`ten-khac(${tkDung}/${tkTong}=${pct}%<95%)`);
  }

  return {
    nhom: h4,
    sach: lyDo.length === 0,
    lyDo,
    dongCoTen: { tong: dcTong, chotDung: dcDung },
    tenKhac: { tong: tkTong, chotDung: tkDung },
    chotSai,
    chotLoaiKhacSai,
    nemLoi,
  };
}

/**
 * Đếm số nhóm 4 số SẠCH theo công thức V1 trên danh sách nhóm (mặc định toàn bộ 1.269 nhóm của biểu thuế).
 * @param {{nhoms?: string[], useWorkers?: boolean, concurrency?: number}} [opts]
 */
export async function demNhomSach(opts = {}) {
  const dsNhom = (opts.nhoms ? opts.nhoms.map((x) => nz(x).slice(0, 4)).filter((x) => x.length === 4) : danhSachNhom4()).sort();
  const useWorkers = opts.useWorkers ?? dsNhom.length > 50;

  let chiTiet = [];
  if (!useWorkers) {
    chiTiet = dsNhom.map((h4) => danhGiaNhomV1(h4));
  } else {
    const nWorkers = Math.min(opts.concurrency || 10, os.cpus().length || 4, dsNhom.length);
    const chunks = Array.from({ length: nWorkers }, () => []);
    dsNhom.forEach((h, i) => chunks[i % nWorkers].push(h));
    const scriptPath = fileURLToPath(import.meta.url);
    const parts = await Promise.all(
      chunks.map(
        (nhoms) =>
          new Promise((resolve, reject) => {
            const w = new Worker(scriptPath, { workerData: { workerMode: true, nhoms } });
            w.on('message', resolve);
            w.on('error', reject);
          }),
      ),
    );
    chiTiet = parts.flat().sort((a, b) => a.nhom.localeCompare(b.nhom));
  }

  const tongNhom = chiTiet.length;
  const dsSach = chiTiet.filter((x) => x.sach);
  const chuaSach = chiTiet.filter((x) => !x.sach);
  const nhomSach = dsSach.length;
  const tyLe = tongNhom > 0 ? Number(((nhomSach / tongNhom) * 100).toFixed(1)) : 0;

  return {
    tongNhom,
    nhomSach,
    tyLe,
    chuaSach,
    chiTiet,
  };
}

if (!isMainThread && workerData?.workerMode) {
  const res = (workerData.nhoms || []).map((h4) => danhGiaNhomV1(h4));
  parentPort.postMessage(res);
} else if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = {};
  const rawArgs = process.argv.slice(2);
  for (let i = 0; i < rawArgs.length; i++) {
    const a = rawArgs[i];
    if (!a.startsWith('--')) continue;
    const eq = a.indexOf('=');
    if (eq !== -1) {
      argv[a.slice(2, eq)] = a.slice(eq + 1);
    } else {
      const k = a.slice(2);
      const next = rawArgs[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        argv[k] = next;
        i += 1;
      } else {
        argv[k] = true;
      }
    }
  }
  const nhoms = argv.nhom
    ? String(argv.nhom)
        .split(',')
        .map((s) => nz(s).slice(0, 4))
        .filter((s) => s.length === 4)
    : undefined;
  const limit = Number(argv.limit) > 0 ? Number(argv.limit) : 20;

  const kq = await demNhomSach({ nhoms });
  if (argv.json) {
    console.log(JSON.stringify({ tongNhom: kq.tongNhom, nhomSach: kq.nhomSach, tyLe: kq.tyLe }));
  } else {
    console.log('=== ĐẾM NHÓM 4 SỐ SẠCH THEO CÔNG THỨC V1 ===');
    console.log(`Tổng số nhóm 4 số: ${kq.tongNhom}`);
    console.log(`Số nhóm SẠCH (V1): ${kq.nhomSach} (${kq.tyLe.toFixed(1)}%)`);
    console.log(`Số nhóm chưa sạch: ${kq.chuaSach.length}`);
    if (kq.chuaSach.length > 0) {
      const hienThi = kq.chuaSach.slice(0, limit);
      console.log(`\nDanh sách ${hienThi.length}/${kq.chuaSach.length} nhóm chưa sạch (tối đa ${limit} nhóm):`);
      for (const item of hienThi) {
        console.log(`  - ${item.nhom}: ${item.lyDo.join(', ')}`);
      }
    }
  }
}
