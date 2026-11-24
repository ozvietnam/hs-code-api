#!/usr/bin/env node
/**
 * scripts/do-do-thi-gd2.mjs — Bộ đo ngoại tuyến Giai đoạn 2 đồ thị tri thức HS (Pillar 4C).
 *
 * Đặc điểm:
 *   - 0 lượt LLM, 0 gọi mạng (chặn fetch + tắt tải mô hình từ xa).
 *   - Zero-PII: không bao giờ in tên hàng / mô tả tờ khai Oz riêng tư hay khoá model/hãng ra stdout, JSON hay báo cáo Markdown.
 *   - Không sửa đổi data/luat/bang-co.json hay data/do-thi/thong-ke.json.
 *   - Mặc định đo HS_TIEN_XU_LY=0 (theo bang-co.json); hỗ trợ `--so-sanh-tien-xu-ly` dùng env tạm trong tiến trình.
 *
 * Dùng:
 *   node scripts/do-do-thi-gd2.mjs --nhanh
 *   node scripts/do-do-thi-gd2.mjs --nhanh --json /tmp/gd2.json --ghi-bao-cao /tmp/gd2.md --che-pII
 *   node scripts/do-do-thi-gd2.mjs                     # mặc định: sạch S-7 (300 ca) + 3 bộ ca-do
 *   node scripts/do-do-thi-gd2.mjs --du                # đủ 7 biến thể S-7 × 300 ca + 3 bộ ca-do
 *   node scripts/do-do-thi-gd2.mjs --so-sanh-tien-xu-ly
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { laCaKin, taiDanhSachLoai } from './dung-bo-thu-de-rieng.mjs';
import { tao7BienThe } from './do-tien-xu-ly-de-rieng.mjs';
import { dungTuDien } from './dung-tu-dien-tien-xu-ly.mjs';
import { thuThapMucChiMuc } from './dung-chi-muc-nghia.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const doThi = require('../lib/do-thi/index.js');
const timTruocMod = require('../lib/tim-truoc.js');
const embedPool = require('../lib/embed-pool.js');
const { scanString } = require('../lib/privacy-filter.js');

export const BIEN_THE_S7 = ['sach', 'khongDau', 'goSai', 'vietTat', 'rutNgan', 'tenKhac', 'tronAnh'];

export const DICH_GD2 = Object.freeze({
  s7_top5_4: '>= 92% (mục 6 GĐ2; mục 2: >= 93%)',
  s7_pn6_3: '>= 76% (mục 6 GĐ2)',
  chua_tung_khai_top5_4: '>= 85% (mục 2 & GĐ7)',
  van_5_2: '5/5 đúng 8481 và phân nhóm 848120',
});

const nz = (v) => String(v == null ? '' : v).replace(/\D/g, '');
const tyLe = (tu, mau) => (mau > 0 ? Math.round((tu * 1000) / mau) / 10 : 0);

function phanVi(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return Math.round(sorted[idx] * 10) / 10;
}

/** Lấy mẫu đều tất định (giữ tỉ lệ đầu/cuối tập khi rút gọn). */
export function layMauDeu(rows, limit) {
  if (!Number.isFinite(limit) || limit <= 0 || rows.length <= limit) return [...rows];
  const out = [];
  for (let i = 0; i < limit; i += 1) {
    out.push(rows[Math.floor((i * rows.length) / limit)]);
  }
  return out;
}

function docJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
}

function docJsonl(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('//'))
    .map((l) => JSON.parse(l));
}

/** Phân tích tham số CLI hỗ trợ cả `--flag=val` và `--flag val`. */
export function phanTichThamSo(argv = process.argv.slice(2)) {
  const nhanh = argv.includes('--nhanh');
  const du = argv.includes('--du');
  const soSanhTienXuLy = argv.includes('--so-sanh-tien-xu-ly');
  const chePII = argv.some((a) => /^--che-pii$/i.test(a));

  const layGiaTri = (ten) => {
    for (let i = 0; i < argv.length; i += 1) {
      const a = argv[i];
      if (a.startsWith(`--${ten}=`)) return a.slice(ten.length + 3);
      if (a === `--${ten}`) {
        const next = argv[i + 1];
        if (next && !next.startsWith('--')) return next;
        return true;
      }
    }
    return null;
  };

  const jsonOpt = layGiaTri('json');
  const baoCaoOpt = layGiaTri('ghi-bao-cao');
  const gioiHanRaw = layGiaTri('gioi-han');
  let gioiHan = null;
  if (typeof gioiHanRaw === 'string' && gioiHanRaw.trim()) {
    const n = Number(gioiHanRaw);
    if (!Number.isInteger(n) || n <= 0) {
      throw new Error(`Tham số --gioi-han không hợp lệ: ${gioiHanRaw}`);
    }
    gioiHan = n;
  }

  return {
    cheDo: du ? 'du' : (nhanh ? 'nhanh' : 'macDinh'),
    nhanh,
    du,
    soSanhTienXuLy,
    chePII,
    jsonStdout: jsonOpt === true,
    jsonPath: typeof jsonOpt === 'string' ? path.resolve(jsonOpt) : null,
    baoCaoPath: typeof baoCaoOpt === 'string' ? path.resolve(baoCaoOpt) : null,
    gioiHan,
  };
}

/** (a) Đo độ phủ đồ thị hiện tại + RAM RSS delta của bangCanh() + Top-93 theo xep-hang-luong-hang.json. */
export function doDoPhuDoThi() {
  doThi.datLai();
  const rssTruoc = process.memoryUsage().rss;
  const heapTruoc = process.memoryUsage().heapUsed;
  const t0 = performance.now();
  const bang = doThi.bangCanh();
  const msDung = Math.round((performance.now() - t0) * 10) / 10;
  const rssSau = process.memoryUsage().rss;
  const heapSau = process.memoryUsage().heapUsed;

  const tk = bang.thongKe || {};
  const rawSoCanh = tk.soCanh || {};
  const coC9TrongBang = Number.isFinite(rawSoCanh.C9) || bang.canh.some((e) => e.loai === 'C9');
  const soC9 = Number.isFinite(rawSoCanh.C9)
    ? rawSoCanh.C9
    : (coC9TrongBang ? bang.canh.filter((e) => e.loai === 'C9').length : null);

  const soCanh = {
    C5: rawSoCanh.C5 || 0,
    C6: rawSoCanh.C6 || 0,
    C7: rawSoCanh.C7 || 0,
    C8: rawSoCanh.C8 || 0,
    C9: { co: coC9TrongBang, soCanh: soC9 },
    C10: rawSoCanh.C10 || 0,
    C11: rawSoCanh.C11 || 0,
    tongCanh: tk.tongCanh || bang.canh.length,
  };

  // Độ phủ Top-93 (hoặc ngưỡng 80% trong xep-hang-luong-hang.json) đọc trực tiếp từ data/so-tay/<nhom>.json.
  const xh = docJson('data/do-thi/xep-hang-luong-hang.json');
  const soNhom80 = xh.soNhomChiem?.theoSoDong?.['80%'] || 93;
  const topList = (xh.nhom || []).slice(0, soNhom80);
  const tongDongOzToanBo = xh.tong?.soDong || 0;
  const tongDongTop93 = topList.reduce((s, x) => s + (x.soDong || 0), 0);

  let coSoTay = 0; let dongSoTay = 0;
  let coTieuChi6 = 0; let dongTieuChi6 = 0;
  let coTieuChi6G6 = 0; let dongTieuChi6G6 = 0;
  let coPhanBiet = 0; let dongPhanBiet = 0;
  let coCaHai = 0; let dongCaHai = 0;
  let nhomCanPb6 = 0; let nhomCanPb6CoTc6 = 0;
  let pn6CanPhanBiet = 0; let pn6CoTieuChi6 = 0;

  for (const x of topList) {
    let st = null;
    try { st = docJson(`data/so-tay/${x.nhom}.json`); } catch { st = null; }
    const hasSt = Boolean(st && st.nhom === x.nhom);
    const tc6 = hasSt && Array.isArray(st.tieuChi6) ? st.tieuChi6 : [];
    const pb = hasSt && Array.isArray(st.phanBiet) ? st.phanBiet : [];
    const hasTc6 = tc6.length > 0;
    const isG6 = hasSt && st?.kiemTra?.tieuChi6?.khuon === 'g6@1';
    const hasPb = pb.length > 0;

    if (hasSt) { coSoTay += 1; dongSoTay += x.soDong; }
    if (hasTc6) { coTieuChi6 += 1; dongTieuChi6 += x.soDong; }
    if (isG6) { coTieuChi6G6 += 1; dongTieuChi6G6 += x.soDong; }
    if (hasPb) { coPhanBiet += 1; dongPhanBiet += x.soDong; }
    if (hasTc6 && hasPb) { coCaHai += 1; dongCaHai += x.soDong; }

    if ((x.soPhanNhomCanPhanBiet || 0) > 0) {
      nhomCanPb6 += 1;
      pn6CanPhanBiet += x.soPhanNhomCanPhanBiet;
      if (hasTc6) {
        nhomCanPb6CoTc6 += 1;
        const pnSet = new Set(tc6.map((t) => nz(t.hs6)).filter((p) => p.length === 6));
        pn6CoTieuChi6 += pnSet.size;
      }
    }
  }

  // Thống kê toàn bộ data/so-tay/*.json
  const soTayFiles = fs.readdirSync(path.join(ROOT, 'data', 'so-tay'))
    .filter((f) => /^\d{4}\.json$/.test(f))
    .sort();
  let tongSoTay = 0; let tongCoTc6 = 0; let tongCoG6 = 0; let tongCoPb = 0;
  for (const f of soTayFiles) {
    let st = null;
    try { st = docJson(`data/so-tay/${f}`); } catch { st = null; }
    if (!st || st.nhom !== f.slice(0, 4)) continue;
    tongSoTay += 1;
    if (Array.isArray(st.tieuChi6) && st.tieuChi6.length > 0) tongCoTc6 += 1;
    if (st?.kiemTra?.tieuChi6?.khuon === 'g6@1') tongCoG6 += 1;
    if (Array.isArray(st.phanBiet) && st.phanBiet.length > 0) tongCoPb += 1;
  }

  const dongPct = (d) => ({
    soDongOz: d,
    phanTramOzToanBo: tyLe(d, tongDongOzToanBo),
    phanTramOzTop93: tyLe(d, tongDongTop93),
  });

  return {
    bamBangCanh: bang.bam,
    ram: {
      msDung,
      rssTruocMB: Number((rssTruoc / 1048576).toFixed(2)),
      rssSauMB: Number((rssSau / 1048576).toFixed(2)),
      rssDeltaMB: Number(((rssSau - rssTruoc) / 1048576).toFixed(2)),
      heapTruocMB: Number((heapTruoc / 1048576).toFixed(2)),
      heapSauMB: Number((heapSau / 1048576).toFixed(2)),
      heapDeltaMB: Number(((heapSau - heapTruoc) / 1048576).toFixed(2)),
    },
    soCanh,
    chiTietCanh: {
      c6: tk.c6 || null,
      c8: tk.c8 || null,
      c10: tk.c10 || null,
      c11: tk.c11 || null,
      c1: tk.c1 ? {
        soCum: tk.c1.soCum,
        soDich: tk.c1.soDich,
        cumNhieuKho: tk.c1.cumNhieuKho,
        cumMauThuanNhom: tk.c1.cumMauThuanNhom,
        biDanhChuaGiai: tk.c1.biDanhChuaGiai,
      } : null,
    },
    top93: {
      soNhom: topList.length,
      tongDongOzToanBo,
      tongDongTop93,
      phanTramDongTop93TrenToanBo: tyLe(tongDongTop93, tongDongOzToanBo),
      coSoTay: { soNhom: coSoTay, ...dongPct(dongSoTay) },
      coTieuChi6: { soNhom: coTieuChi6, ...dongPct(dongTieuChi6) },
      coTieuChi6G6: { soNhom: coTieuChi6G6, ...dongPct(dongTieuChi6G6) },
      coPhanBiet: { soNhom: coPhanBiet, ...dongPct(dongPhanBiet) },
      coCaTieuChi6VaPhanBiet: { soNhom: coCaHai, ...dongPct(dongCaHai) },
      canPhanBiet6So: {
        soNhomCanPhanBiet: nhomCanPb6,
        soNhomCoTieuChi6: nhomCanPb6CoTc6,
        soPhanNhomCanPhanBiet: pn6CanPhanBiet,
        soPhanNhomCoTieuChi6: pn6CoTieuChi6,
        phanTramPhanNhomPhu: tyLe(pn6CoTieuChi6, pn6CanPhanBiet),
      },
    },
    toanSoTay: {
      tongSoTay,
      soNhomTrongBieu: xh.tong?.soNhomTrongBieu || 1269,
      coTieuChi6: tongCoTc6,
      coTieuChi6G6: tongCoG6,
      coPhanBiet: tongCoPb,
    },
  };
}

/** (c) Đo độ phủ đứng riêng C4 (data/do-thi/c4-model-hang.json) — graceful skip nếu chưa có tệp. */
export async function doDoPhuC4(tuyChon = {}) {
  const tepC4 = tuyChon.c4Path ? path.resolve(tuyChon.c4Path) : path.join(ROOT, 'data', 'do-thi', 'c4-model-hang.json');
  if (!fs.existsSync(tepC4)) {
    return {
      coTep: false,
      trangThai: 'BO_QUA_CHUA_CO_TEP',
      ghiChu: 'Chưa có data/do-thi/c4-model-hang.json (cây chưa gộp PR C4).',
    };
  }

  let docC4;
  try {
    docC4 = JSON.parse(fs.readFileSync(tepC4, 'utf8'));
  } catch (e) {
    return {
      coTep: true,
      trangThai: 'BO_QUA_LOI_DOC_TEP',
      ghiChu: `Không đọc được c4-model-hang.json: ${String(e.message || e).slice(0, 120)}`,
    };
  }

  const tk = docC4.thongKe || {};
  const phienBan = docC4.phienBan ?? null;
  const bang = Array.isArray(docC4.bang) ? docC4.bang : [];
  const capChapNhan = tk.capChapNhan
    ? {
      hang_model: tk.capChapNhan.hang_model ?? 0,
      model: tk.capChapNhan.model ?? 0,
      hang: tk.capChapNhan.hang ?? 0,
      tong: tk.capChapNhan.tong
        ?? ((tk.capChapNhan.hang_model ?? 0) + (tk.capChapNhan.model ?? 0) + (tk.capChapNhan.hang ?? 0)),
    }
    : {
      hang_model: bang.filter((x) => x.loai === 'hang_model').length,
      model: bang.filter((x) => x.loai === 'model').length,
      hang: bang.filter((x) => x.loai === 'hang').length,
      tong: bang.length,
    };
  const capMauThuan = tk.capMauThuan || {
    tong: Array.isArray(docC4.mauThuan) ? docC4.mauThuan.length : 0,
  };
  const hangThamKhaoRaw = tk.hangThamKhao;
  const hangThamKhao = hangThamKhaoRaw
    ? {
      soCap: hangThamKhaoRaw.soCap ?? 0,
      nhatQuanItDong: hangThamKhaoRaw.nhatQuanItDong ?? null,
      daSoUuThe: hangThamKhaoRaw.daSoUuThe ?? null,
    }
    : (Array.isArray(docC4.hangThamKhao)
      ? {
        soCap: docC4.hangThamKhao.length,
        nhatQuanItDong: null,
        daSoUuThe: null,
      }
      : null);

  let danhGiaDeRieng300 = null;
  const scriptC4 = path.join(ROOT, 'scripts', 'dung-c4-model-hang.mjs');
  if (fs.existsSync(scriptC4)) {
    try {
      const modC4 = await import('./dung-c4-model-hang.mjs');
      if (typeof modC4.doTrenDeRieng300 === 'function') {
        const kq = modC4.doTrenDeRieng300();
        // Chỉ trích số tổng hợp, tuyệt đối bỏ chiTietKhongChuaTenHang (chứa khoá model/hãng).
        danhGiaDeRieng300 = {
          trangThai: 'DA_DO',
          tongCa: kq.tongCa,
          caCoModelHangHopLe: kq.caCoModelHangHopLe,
          soCaDuocPhu: kq.soCaDuocPhu,
          soCaDungNhom4: kq.soCaDungNhom4,
          soCaSaiNhom4: kq.soCaSaiNhom4,
          doPhuTrenTongCaPhanTram: kq.doPhuTrenTongCaPhanTram,
          doPhuTrenCaCoModelHangPhanTram: kq.doPhuTrenCaCoModelHangPhanTram,
          doChinhXacTrenCaDuocPhuPhanTram: kq.doChinhXacTrenCaDuocPhuPhanTram,
          theoLoai: kq.theoLoai,
          thamKhao: kq.thamKhao
            ? {
              soCaCoGoiY: kq.thamKhao.soCaCoGoiY ?? 0,
              soCaDungNhom4: kq.thamKhao.soCaDungNhom4 ?? 0,
              soCaSaiNhom4: kq.thamKhao.soCaSaiNhom4 ?? 0,
              doChinhXacPhanTram: kq.thamKhao.doChinhXacPhanTram ?? 0,
            }
            : null,
        };
      }
    } catch (e) {
      danhGiaDeRieng300 = {
        trangThai: 'BO_QUA_LOI',
        ghiChu: String(e.message || e).slice(0, 120),
      };
    }
  }

  return {
    coTep: true,
    trangThai: Number(phienBan) >= 2 ? 'CO_C4_V2' : 'CO_C4_V1',
    laV2: Number(phienBan) >= 2,
    phienBan,
    loaiCaKin: Boolean(docC4.loaiCaKin),
    bam: docC4.bam || null,
    tongSoDongGoc: tk.tongSoDongGoc ?? null,
    soDongMaHienHanh: tk.soDongMaHienHanh ?? null,
    soDongCoModelHangHopLe: tk.soDongCoModelHangHopLe ?? null,
    capChapNhan,
    capMauThuan,
    capDuoiNguong: tk.capDuoiNguong ?? null,
    hangThamKhao,
    doPhuTrenOz: tk.doPhu ? {
      soDongDuocPhu: tk.doPhu.soDongDuocPhu,
      soDongDuocPhuHangModel: tk.doPhu.soDongDuocPhuHangModel ?? null,
      soDongDuocPhuModel: tk.doPhu.soDongDuocPhuModel,
      soDongDuocPhuHang: tk.doPhu.soDongDuocPhuHang,
      trenDongCoModelHangPhanTram: tk.doPhu.trenDongCoModelHangPhanTram,
      trenTongSoDongPhanTram: tk.doPhu.trenTongSoDongPhanTram,
    } : null,
    danhGiaDeRieng300,
  };
}

/** Dựng chỉ mục nghĩa S-7 sạch trong RAM bằng cách lọc các dòng thuộc tập ca kín từ chi-muc-nghia.bin. */
function taoChiMucNghiaS7TrongRam() {
  const idx = embedPool.taiChiMucNghia();
  if (!idx || idx.kieu !== 'int8' || !idx.vectors || !Array.isArray(idx.items)) return null;
  const full = thuThapMucChiMuc({ loaiCaKin: false });
  const s7 = thuThapMucChiMuc({ loaiCaKin: true });
  if (full.rawItems.length !== idx.items.length) return null;

  const s7Keys = new Set(s7.rawItems.map((x) => `${x.hs}|${x.nguon}|${x.text}`));
  const keptIdx = [];
  const keptItems = [];
  for (let i = 0; i < full.rawItems.length; i += 1) {
    const r = full.rawItems[i];
    if (s7Keys.has(`${r.hs}|${r.nguon}|${r.text}`)) {
      keptIdx.push(i);
      keptItems.push(idx.items[i]);
    }
  }
  const dim = idx.dim || 384;
  const vectors = new Int8Array(keptIdx.length * dim);
  for (let j = 0; j < keptIdx.length; j += 1) {
    const srcOff = keptIdx[j] * dim;
    vectors.set(idx.vectors.subarray(srcOff, srcOff + dim), j * dim);
  }
  return {
    kieu: 'int8',
    dim,
    count: keptItems.length,
    scale: idx.scale || 127,
    items: keptItems,
    vectors,
  };
}

/** Hai tên gần trùng: phần chữ chung chiếm >= 80% tên ngắn hơn (>= 4 chữ). Dùng để loại bản ghi của chính hàng đang đo. */
const ganTrungTen = (a, b) => {
  const t = (x) => [...new Set(chuanTenGon(x).split(' ').filter((w) => w.length > 1))];
  const [A, B] = [t(a), t(b)].sort((x, y) => x.length - y.length);
  if (A.length < 4) return false;
  const S = new Set(B);
  return A.filter((w) => S.has(w)).length / A.length >= 0.8;
};
const chuanTenGon = (x) => String(x || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** Chạy timTruoc trên một danh sách ca và chấm điểm + độ trễ (không lưu tên hàng Oz). */
async function chayMotBo({ rows, mapPayload, getTruth, ttOpts = {}, laVan52 = false }) {
  let coUngVien = 0;
  let t1_4 = 0;
  let t3_4 = 0;
  let t5_4 = 0;
  let pn6_1 = 0;
  let pn6_3 = 0;
  const times = [];
  const ketQuaVan52 = [];

  for (const row of rows) {
    const payload = mapPayload(row);
    const truth = nz(getTruth ? getTruth(row) : (row.maDung || row.hsCode || row.hs));
    const truth4 = truth.slice(0, 4);
    const truth6 = truth.slice(0, 6);

    const t0 = performance.now();
    const res = await timTruocMod.timTruoc(payload, typeof ttOpts === 'function' ? ttOpts(row) : ttOpts);
    times.push(performance.now() - t0);

    const tomTat = res?.tomTat || {};
    if (tomTat.trangThai === 'CO_UNG_VIEN') coUngVien += 1;
    const nhom = Array.isArray(tomTat.nhom) ? tomTat.nhom : [];
    const pn6CuaDung = (tomTat.pn6 && Array.isArray(tomTat.pn6[truth4])) ? tomTat.pn6[truth4] : [];

    if (nhom[0] === truth4) t1_4 += 1;
    if (nhom.slice(0, 3).includes(truth4)) t3_4 += 1;
    if (nhom.slice(0, 5).includes(truth4)) t5_4 += 1;
    if (pn6CuaDung[0] === truth6) pn6_1 += 1;
    if (pn6CuaDung.slice(0, 3).includes(truth6)) pn6_3 += 1;

    if (laVan52) {
      ketQuaVan52.push({
        nhomTop1: nhom[0] || null,
        nhomTop5: nhom.slice(0, 5),
        pn6Top3: pn6CuaDung.slice(0, 3),
      });
    }
  }

  const n = rows.length;
  const tongMs = Math.round(times.reduce((a, b) => a + b, 0) * 10) / 10;
  const out = {
    n,
    coUngVien: { so: coUngVien, tyLe: tyLe(coUngVien, n) },
    top1_4: { so: t1_4, tyLe: tyLe(t1_4, n) },
    top3_4: { so: t3_4, tyLe: tyLe(t3_4, n) },
    top5_4: { so: t5_4, tyLe: tyLe(t5_4, n) },
    pn6_1: { so: pn6_1, tyLe: tyLe(pn6_1, n) },
    pn6_3: { so: pn6_3, tyLe: tyLe(pn6_3, n) },
    doTreMs: {
      medianMs: phanVi(times, 0.5),
      p95Ms: phanVi(times, 0.95),
      maxMs: times.length ? Math.round(Math.max(...times) * 10) / 10 : 0,
      tongMs,
    },
  };

  if (laVan52 && ketQuaVan52.length) {
    const chuKyDau = JSON.stringify(ketQuaVan52[0]);
    out.van52 = {
      dungNhomTop1: ketQuaVan52.filter((x) => x.nhomTop1 === '8481').length,
      dungNhomTop5: ketQuaVan52.filter((x) => x.nhomTop5.includes('8481')).length,
      dungPn6Top1: ketQuaVan52.filter((x) => x.pn6Top3[0] === '848120').length,
      dungPn6Top3: ketQuaVan52.filter((x) => x.pn6Top3.includes('848120')).length,
      nhatQuanTatCaLuot: ketQuaVan52.every((x) => JSON.stringify(x) === chuKyDau),
      maNhomTop1: ketQuaVan52[0].nhomTop1,
      maPn6Top3: ketQuaVan52[0].pn6Top3,
    };
  }
  return out;
}

function hieuDelta(off, on) {
  return {
    top1_4_pp: Math.round((on.top1_4.tyLe - off.top1_4.tyLe) * 10) / 10,
    top3_4_pp: Math.round((on.top3_4.tyLe - off.top3_4.tyLe) * 10) / 10,
    top5_4_pp: Math.round((on.top5_4.tyLe - off.top5_4.tyLe) * 10) / 10,
    pn6_1_pp: Math.round((on.pn6_1.tyLe - off.pn6_1.tyLe) * 10) / 10,
    pn6_3_pp: Math.round((on.pn6_3.tyLe - off.pn6_3.tyLe) * 10) / 10,
    medianMs: Math.round((on.doTreMs.medianMs - off.doTreMs.medianMs) * 10) / 10,
    p95Ms: Math.round((on.doTreMs.p95Ms - off.doTreMs.p95Ms) * 10) / 10,
  };
}

/** (b) Đo tìm ứng viên / timTruoc trên 4 bộ (mặc định HS_TIEN_XU_LY=0; tuỳ chọn so sánh bật tạm). */
export async function doBoTimTruoc(opts = {}) {
  const nhanh = Boolean(opts.nhanh);
  const du = Boolean(opts.du);
  const soSanhTienXuLy = Boolean(opts.soSanhTienXuLy);
  const gioiHan = opts.gioiHan || null;

  const bangCo = docJson('data/luat/bang-co.json');
  const coTxl = (bangCo.co || []).find((c) => c.ten === 'HS_TIEN_XU_LY');
  const dsLoai = taiDanhSachLoai();
  const locOzS7 = (item) => !laCaKin(item, dsLoai);

  const van52All = docJsonl('scripts/ca-do/van-5-2.jsonl');
  const van30All = docJsonl('scripts/ca-do/van-khi-nen-30.jsonl');
  const chuaKhaiAll = docJsonl('scripts/ca-do/chua-tung-khai-100.jsonl');
  const s7All = docJsonl('scripts/ca-do/de-rieng-300.jsonl');

  const cap = (rows, nhanhLimit) => {
    let lim = rows.length;
    if (nhanh && nhanhLimit && nhanhLimit < lim) lim = nhanhLimit;
    if (gioiHan && gioiHan < lim) lim = gioiHan;
    return layMauDeu(rows, lim);
  };

  const van52 = cap(van52All, van52All.length);
  const van30 = cap(van30All, van30All.length);
  const chuaKhai = cap(chuaKhaiAll, 12);
  const s7 = cap(s7All, 30);

  const ozLines = fs.readFileSync(path.join(ROOT, 'data', 'oz-gold-final.jsonl'), 'utf8')
    .split('\n').map((l) => l.trim()).filter(Boolean).map(JSON.parse);
  const soDongOzBiLoaiS7 = ozLines.filter((r) => laCaKin(r, dsLoai)).length;

  const origEnvTxl = process.env.HS_TIEN_XU_LY;
  const origFetch = globalThis.fetch;
  let fetchBiChan = 0;
  let origAllowRemote;
  let transformersEnv = null;

  try {
    // Đảm bảo mặc định HS_TIEN_XU_LY OFF ngay cả trước bước làm ấm (tránh shell cha export sẵn HS_TIEN_XU_LY=on)
    delete process.env.HS_TIEN_XU_LY;

    // Chặn gọi mạng ở mọi tình huống
    globalThis.fetch = async () => {
      fetchBiChan += 1;
      throw new Error('OFFLINE: scripts/do-do-thi-gd2.mjs không cho phép gọi mạng');
    };
    try {
      const mod = await import('@huggingface/transformers');
      transformersEnv = mod.env;
      origAllowRemote = transformersEnv.allowRemoteModels;
      transformersEnv.allowRemoteModels = false;
    } catch {
      transformersEnv = null;
    }

    // Làm ấm kho tìm chữ trước khi bấm giờ từng ca
    const tWarm0 = performance.now();
    await timTruocMod.timTruoc({ tenHang: 'van điện từ khí nén' });
    const lamAmMs = Math.round(performance.now() - tWarm0);

    const mapRaw = (r) => ({
      tenHang: r.tenHang,
      ...(r.chatLieu ? { chatLieu: r.chatLieu } : {}),
      ...(r.congDung ? { congDung: r.congDung } : {}),
    });

    const variants = du ? BIEN_THE_S7 : ['sach'];
    const s7BienTheInputs = {};
    for (const bt of variants) {
      s7BienTheInputs[bt] = s7.map((r) => ({ row: r, payload: tao7BienThe(r)[bt] }));
    }

    const chayCheDo = async (batTxl, extras = {}) => {
      if (batTxl) process.env.HS_TIEN_XU_LY = 'on';
      else delete process.env.HS_TIEN_XU_LY;

      const van52Res = await chayMotBo({
        rows: van52,
        mapPayload: mapRaw,
        ttOpts: batTxl ? extras.thuongOpts : {},
        laVan52: true,
      });
      van52Res.tongTrongTep = van52All.length;

      const van30Res = await chayMotBo({
        rows: van30,
        mapPayload: mapRaw,
        ttOpts: batTxl ? extras.thuongOpts : {},
      });
      van30Res.tongTrongTep = van30All.length;

      const chuaKhaiRes = await chayMotBo({
        rows: chuaKhai,
        mapPayload: mapRaw,
        // Bộ này lấy từ thông báo phân loại có trong kho tiền lệ: loại đúng thông báo của ca đang đo (không thì tự tìm thấy chính mình).
        ttOpts: (row) => ({
          locTb: (x) => !String(x.precedent?.tbTchqNumber || x.tbTchqNumber || '').includes(String(row.nguonDong))
            && !ganTrungTen(x.precedent?.productNameRaw || x.precedent?.productName || x.productName, row.tenHang),
          ...(batTxl ? { embedFn: extras.embedFnChuaKhai(row) } : {}),
        }),
      });
      chuaKhaiRes.tongTrongTep = chuaKhaiAll.length;

      const s7TheoBienThe = {};
      for (const bt of variants) {
        const items = s7BienTheInputs[bt];
        const res = await chayMotBo({
          rows: items,
          mapPayload: (it) => it.payload,
          getTruth: (it) => it.row.maDung,
          ttOpts: batTxl ? extras.s7Opts : { locOz: locOzS7 },
        });
        res.tongTrongTep = s7All.length;
        s7TheoBienThe[bt] = res;
      }

      return {
        van_5_2: van52Res,
        van_khi_nen_30: van30Res,
        chua_tung_khai_100: chuaKhaiRes,
        s7_holdout: {
          sach: s7TheoBienThe.sach,
          bienThe: s7TheoBienThe,
        },
      };
    };

    // 1) Luôn đo chế độ mặc định HS_TIEN_XU_LY=0
    const macDinhOff = await chayCheDo(false);

    // 2) Tuỳ chọn so sánh --so-sanh-tien-xu-ly
    let soSanh = { daChay: false };
    if (soSanhTienXuLy) {
      const tuDienS7 = dungTuDien({ loaiCaKin: true, danhSachLoai: dsLoai });
      let ext = null;
      let taiModelMs = null;
      let coModelNghia = false;
      try {
        const tM0 = performance.now();
        ext = await embedPool.khoiTaoModel();
        taiModelMs = Math.round(performance.now() - tM0);
        if (ext) {
          await embedPool.embedCau('làm ấm mô hình', { extractor: ext });
          coModelNghia = true;
        }
      } catch {
        ext = null;
        coModelNghia = false;
      }

      if (!coModelNghia) {
        console.error('THIẾU MÔ HÌNH NGHĨA: lượt ON chỉ đo tiền xử lý câu, không có tìm theo nghĩa. Không được báo số này là tìm theo nghĩa.');
        process.exitCode = 3;
      }
      const idxThuong = coModelNghia ? embedPool.taiChiMucNghia() : null;
      const idxS7 = coModelNghia ? taoChiMucNghiaS7TrongRam() : null;

      const embedFnThuong = ext && idxThuong
        ? async (q) => {
          const vec = await embedPool.embedCau(q, { extractor: ext });
          return vec ? embedPool.timTheoNghiaTrucTiep(vec, idxThuong, { k: 30 }) : null;
        }
        : async () => null;

      const embedFnS7 = ext && idxS7
        ? async (q) => {
          const vec = await embedPool.embedCau(q, { extractor: ext });
          return vec ? embedPool.timTheoNghiaTrucTiep(vec, idxS7, { k: 30 }) : null;
        }
        : async () => null;

      const onRes = await chayCheDo(true, {
        thuongOpts: { embedFn: embedFnThuong },
        embedFnChuaKhai: (row) => {
          const khoa = chuanTenGon(row.tenHang).slice(0, 30);
          return async (cau) => {
            const r = await embedFnThuong(cau);
            if (!r) return r;
            const muc = (r.muc || []).filter((m) => chuanTenGon(m.ten).slice(0, 30) !== khoa && !(m.nguon === 'tb' && ganTrungTen(m.ten, row.tenHang)));
            const n4 = new Set(muc.map((m) => nz(m.hs || m.nhom4).slice(0, 4)));
            return { ...r, muc, nhom4: (r.nhom4 || []).filter((n) => n4.has(nz(n.ma).slice(0, 4))) };
          };
        },
        s7Opts: { locOz: locOzS7, tuDien: tuDienS7, embedFn: embedFnS7 },
      });

      const deltaBienThe = {};
      for (const bt of variants) {
        deltaBienThe[bt] = hieuDelta(macDinhOff.s7_holdout.bienThe[bt], onRes.s7_holdout.bienThe[bt]);
      }

      soSanh = {
        daChay: true,
        coModelNghia: Boolean(ext && idxS7),
        soMucChiMucThuong: idxThuong?.count ?? null,
        soMucChiMucS7: idxS7?.count ?? null,
        taiModelMs,
        tienXuLyOn: onRes,
        delta: {
          van_5_2: hieuDelta(macDinhOff.van_5_2, onRes.van_5_2),
          van_khi_nen_30: hieuDelta(macDinhOff.van_khi_nen_30, onRes.van_khi_nen_30),
          chua_tung_khai_100: hieuDelta(macDinhOff.chua_tung_khai_100, onRes.chua_tung_khai_100),
          s7_holdout: deltaBienThe,
        },
      };
    }

    return {
      hsTienXuLyMacDinh: {
        trongBangCo: Boolean(coTxl?.macDinhBat),
        dangDoMacDinh: 'OFF',
      },
      lamAmMs,
      mang: {
        daChanFetch: true,
        lanGoiFetchBiChan: fetchBiChan,
      },
      s7KiemTra: {
        phienBanDanhSachLoai: dsLoai.raw?.phienBan || null,
        tongDongOzGold: ozLines.length,
        soDongOzBiLoaiS7,
        soDongOzGiuLai: ozLines.length - soDongOzBiLoaiS7,
        cacBienThe: variants,
      },
      macDinhOff,
      soSanhTienXuLy: soSanh,
    };
  } finally {
    globalThis.fetch = origFetch;
    if (transformersEnv && origAllowRemote !== undefined) {
      transformersEnv.allowRemoteModels = origAllowRemote;
    }
    if (origEnvTxl === undefined) delete process.env.HS_TIEN_XU_LY;
    else process.env.HS_TIEN_XU_LY = origEnvTxl;
  }
}

let _ozLeakStrings = null;
function layChuoiOzNhayCam() {
  if (_ozLeakStrings) return _ozLeakStrings;
  const set = new Set();
  for (const r of [...docJsonl('scripts/ca-do/de-rieng-300.jsonl'), ...docJsonl('scripts/ca-do/van-khi-nen-30.jsonl')]) {
    const ten = String(r.tenHang || '').trim();
    if (ten.length >= 12) set.add(ten);
  }
  const ozLines = fs.readFileSync(path.join(ROOT, 'data', 'oz-gold-final.jsonl'), 'utf8')
    .split('\n').map((l) => l.trim()).filter(Boolean);
  for (const l of ozLines) {
    let g;
    try { g = JSON.parse(l); } catch { continue; }
    const sd = String(g.sampleDesc || '').trim();
    if (sd.length >= 20) set.add(sd);
    const th = String(g.tenHang || '').trim();
    if (th.length >= 16) set.add(th);
  }
  _ozLeakStrings = [...set];
  return _ozLeakStrings;
}

/** Kiểm tra đầu ra không chứa chuỗi PII hay mô tả hàng Oz riêng tư. */
export function kiemTraZeroPii(text) {
  const s = String(text || '');
  const hardPii = scanString(s).filter((h) => h.hard);
  const leakedNames = [];
  for (const mau of layChuoiOzNhayCam()) {
    if (s.includes(mau)) {
      leakedNames.push(mau);
      if (leakedNames.length >= 5) break;
    }
  }
  return {
    sach: hardPii.length === 0 && leakedNames.length === 0,
    hardPiiCount: hardPii.length,
    leakedNamesCount: leakedNames.length,
  };
}

/** Định dạng báo cáo Markdown chỉ gồm số liệu tổng hợp (zero-PII). */
export function dinhDangBaoCaoMarkdown(kq) {
  const g = kq.doPhuDoThi;
  const c4 = kq.c4;
  const tt = kq.timTruoc;
  const m = tt.macDinhOff;

  const fmtPct = (o, n) => `${o.tyLe.toFixed(1)}% (${o.so}/${n})`;
  const fmtRow = (ten, r, dich = '—') =>
    `| ${ten} | ${r.n}/${r.tongTrongTep} | ${fmtPct(r.top1_4, r.n)} | ${fmtPct(r.top3_4, r.n)} | ${fmtPct(r.top5_4, r.n)} | ${r.pn6_1.tyLe.toFixed(1)}% / ${r.pn6_3.tyLe.toFixed(1)}% (${r.pn6_3.so}/${r.n}) | ${r.doTreMs.medianMs} / ${r.doTreMs.p95Ms} ms | ${dich} |`;

  const lines = [
    '# Đo ngoại tuyến Giai đoạn 2 — Đồ thị tri thức HS (0 LLM, 0 mạng, Zero-PII)',
    '',
    `- **Chế độ chạy:** \`${kq.thamSo.cheDo}\` · **Thời gian chạy:** ${kq.tongMs} ms · **HS_TIEN_XU_LY mặc định:** ${tt.hsTienXuLyMacDinh.dangDoMacDinh} (bang-co.json: ${tt.hsTienXuLyMacDinh.trongBangCo ? 'ON' : 'OFF'})`,
    `- **Chặn mạng:** fetch bị chặn (${tt.mang.lanGoiFetchBiChan} lượt gọi) · **Băm bảng cạnh:** \`${g.bamBangCanh.slice(0, 12)}…\``,
    '',
    '## (a) Độ phủ đồ thị tri thức hiện tại',
    '',
    `- **RAM \`bangCanh()\`:** RSS delta **+${g.ram.rssDeltaMB} MB** (${g.ram.rssTruocMB} → ${g.ram.rssSauMB} MB) · Heap delta +${g.ram.heapDeltaMB} MB · Thời gian dựng: **${g.ram.msDung} ms**`,
    `- **Cạnh bảng đồ thị:** tổng **${g.soCanh.tongCanh}** cạnh`,
    `  - C5 (Loại-trừ): **${g.soCanh.C5}**`,
    `  - C6 (Loại-trừ-ngược): **${g.soCanh.C6}** (chưa có chiều thuận: ${g.chiTietCanh.c6?.chuaCoChieuThuan ?? '—'})`,
    `  - C7 (Phân-biệt): **${g.soCanh.C7}**`,
    `  - C8 (Dễ-nhầm): **${g.soCanh.C8}** (từ điển cặp dễ nhầm: ${g.chiTietCanh.c8?.tuTuDienCapDeNham ?? '—'}, TB-TCHQ: ${g.chiTietCanh.c8?.tuThongBaoPhanLoai ?? '—'})`,
    `  - C9 (Chú-giải-chi-phối): **${g.soCanh.C9.co ? g.soCanh.C9.soCanh : 'chưa có (0)'}**`,
    `  - C10 (Tách-phân-nhóm): **${g.soCanh.C10}** (${g.chiTietCanh.c10?.soNhom ?? '—'} nhóm, ${g.chiTietCanh.c10?.soPhanNhom ?? '—'} phân nhóm, ${g.chiTietCanh.c10?.coKhoaDuKien ?? '—'} có khoá dữ kiện C13)`,
    `  - C11 (Tên-riêng-thắng-loại-khác): **${g.soCanh.C11}** (cấp 6: ${g.chiTietCanh.c11?.cap6 ?? '—'}, cấp 8: ${g.chiTietCanh.c11?.cap8 ?? '—'})`,
    `  - C1 gộp: **${g.chiTietCanh.c1?.soCum ?? '—'}** cụm → **${g.chiTietCanh.c1?.soDich ?? '—'}** đích (mâu thuẫn nhóm: ${g.chiTietCanh.c1?.cumMauThuanNhom ?? '—'})`,
    '',
    '### Độ phủ Top-93 nhóm chiếm 80% lượng hàng OZ (`xep-hang-luong-hang.json`)',
    '',
    `- **Top-93 nhóm:** ${g.top93.tongDongTop93}/${g.top93.tongDongOzToanBo} dòng OZ (**${g.top93.phanTramDongTop93TrenToanBo}%**) · Sổ tay: ${g.top93.coSoTay.soNhom}/93`,
    `- **Có \`tieuChi6\`:** **${g.top93.coTieuChi6.soNhom}/93** nhóm (g6@1: ${g.top93.coTieuChi6G6.soNhom}/93) — phủ **${g.top93.coTieuChi6.soDongOz}** dòng OZ (**${g.top93.coTieuChi6.phanTramOzToanBo}%** toàn bộ OZ / **${g.top93.coTieuChi6.phanTramOzTop93}%** Top-93); trên nhóm cần phân biệt 6 số: ${g.top93.canPhanBiet6So.soNhomCoTieuChi6}/${g.top93.canPhanBiet6So.soNhomCanPhanBiet} nhóm, ${g.top93.canPhanBiet6So.soPhanNhomCoTieuChi6}/${g.top93.canPhanBiet6So.soPhanNhomCanPhanBiet} PN6 (${g.top93.canPhanBiet6So.phanTramPhanNhomPhu}%)`,
    `- **Có \`phanBiet\`:** **${g.top93.coPhanBiet.soNhom}/93** nhóm — phủ **${g.top93.coPhanBiet.soDongOz}** dòng OZ (**${g.top93.coPhanBiet.phanTramOzToanBo}%** toàn bộ OZ / **${g.top93.coPhanBiet.phanTramOzTop93}%** Top-93)`,
    `- **Có cả \`tieuChi6\` & \`phanBiet\`:** **${g.top93.coCaTieuChi6VaPhanBiet.soNhom}/93** nhóm — phủ **${g.top93.coCaTieuChi6VaPhanBiet.soDongOz}** dòng OZ (**${g.top93.coCaTieuChi6VaPhanBiet.phanTramOzToanBo}%** toàn bộ OZ)`,
    `- **Toàn kho sổ tay:** ${g.toanSoTay.tongSoTay}/${g.toanSoTay.soNhomTrongBieu} nhóm có sổ tay · ${g.toanSoTay.coTieuChi6} có \`tieuChi6\` (${g.toanSoTay.coTieuChi6G6} khuôn g6@1) · ${g.toanSoTay.coPhanBiet} có \`phanBiet\``,
    '',
    '## (b) Độ chính xác tìm ứng viên / `timTruoc` (mặc định `HS_TIEN_XU_LY=0`)',
    '',
    `- **Cách ly S-7 (${tt.s7KiemTra.phienBanDanhSachLoai}):** loại **${tt.s7KiemTra.soDongOzBiLoaiS7}/${tt.s7KiemTra.tongDongOzGold}** dòng tờ khai OZ trùng tên/khoá nội dung (giữ ${tt.s7KiemTra.soDongOzGiuLai} dòng sạch).`,
    '',
    '| Bộ thử | Số ca | Top-1 @4 | Top-3 @4 | Top-5 @4 | PN6 @1 / @3 | Trung vị / p95 | Đích kế hoạch |',
    '|---|---:|---:|---:|---:|---:|---:|---|',
    fmtRow('Van 5/2 (`van-5-2.jsonl`)', m.van_5_2, DICH_GD2.van_5_2),
    fmtRow('Van khí nén 30 (`van-khi-nen-30.jsonl`)', m.van_khi_nen_30, '—'),
    fmtRow('Chưa từng khai (`chua-tung-khai-100.jsonl`)', m.chua_tung_khai_100, DICH_GD2.chua_tung_khai_top5_4),
    fmtRow('S-7 Holdout sạch (`de-rieng-300.jsonl`)', m.s7_holdout.sach, DICH_GD2.s7_top5_4),
  ];

  if (m.van_5_2.van52) {
    const v = m.van_5_2.van52;
    lines.push('', `- **Chi tiết van 5/2 (${m.van_5_2.n} lượt):** đúng nhóm 8481: top-1 **${v.dungNhomTop1}/${m.van_5_2.n}**, top-5 **${v.dungNhomTop5}/${m.van_5_2.n}** · đúng PN6 848120: top-1 **${v.dungPn6Top1}/${m.van_5_2.n}**, top-3 **${v.dungPn6Top3}/${m.van_5_2.n}** · nhất quán: **${v.nhatQuanTatCaLuot ? 'CÓ' : 'KHÔNG'}** (top-1: \`${v.maNhomTop1 || '—'}\`, PN6: \`${v.maPn6Top3.join(', ') || '—'}\`)`);
  }

  const btKeys = Object.keys(m.s7_holdout.bienThe || {});
  if (btKeys.length > 1) {
    lines.push(
      '',
      '### S-7 Holdout theo 7 biến thể',
      '',
      '| Biến thể | Số ca | Top-1 @4 | Top-3 @4 | Top-5 @4 | PN6 @1 / @3 | Trung vị / p95 |',
      '|---|---:|---:|---:|---:|---:|---:|',
    );
    for (const bt of btKeys) {
      const r = m.s7_holdout.bienThe[bt];
      lines.push(`| \`${bt}\` | ${r.n}/${r.tongTrongTep} | ${fmtPct(r.top1_4, r.n)} | ${fmtPct(r.top3_4, r.n)} | ${fmtPct(r.top5_4, r.n)} | ${r.pn6_1.tyLe.toFixed(1)}% / ${r.pn6_3.tyLe.toFixed(1)}% (${r.pn6_3.so}/${r.n}) | ${r.doTreMs.medianMs} / ${r.doTreMs.p95Ms} ms |`);
    }
  }

  if (tt.soSanhTienXuLy?.daChay) {
    const ss = tt.soSanhTienXuLy;
    const on = ss.tienXuLyOn;
    const d = ss.delta;
    lines.push(
      '',
      `### So sánh \`HS_TIEN_XU_LY=on\` tạm (model nghĩa: ${ss.coModelNghia ? `CÓ, ${ss.soMucChiMucS7} mục S-7` : 'KHÔNG / fallback chữ'})`,
      '',
      '| Bộ thử | OFF Top-1 / Top-5 / PN6@3 | ON Top-1 / Top-5 / PN6@3 | Delta (t1 / t5 / pn6 / med) |',
      '|---|---|---|---|',
      `| Van 5/2 | ${m.van_5_2.top1_4.tyLe}% / ${m.van_5_2.top5_4.tyLe}% / ${m.van_5_2.pn6_3.tyLe}% | ${on.van_5_2.top1_4.tyLe}% / ${on.van_5_2.top5_4.tyLe}% / ${on.van_5_2.pn6_3.tyLe}% | ${d.van_5_2.top1_4_pp >= 0 ? '+' : ''}${d.van_5_2.top1_4_pp} / ${d.van_5_2.top5_4_pp >= 0 ? '+' : ''}${d.van_5_2.top5_4_pp} / ${d.van_5_2.pn6_3_pp >= 0 ? '+' : ''}${d.van_5_2.pn6_3_pp} pp (${d.van_5_2.medianMs >= 0 ? '+' : ''}${d.van_5_2.medianMs} ms) |`,
      `| Van khí nén 30 | ${m.van_khi_nen_30.top1_4.tyLe}% / ${m.van_khi_nen_30.top5_4.tyLe}% / ${m.van_khi_nen_30.pn6_3.tyLe}% | ${on.van_khi_nen_30.top1_4.tyLe}% / ${on.van_khi_nen_30.top5_4.tyLe}% / ${on.van_khi_nen_30.pn6_3.tyLe}% | ${d.van_khi_nen_30.top1_4_pp >= 0 ? '+' : ''}${d.van_khi_nen_30.top1_4_pp} / ${d.van_khi_nen_30.top5_4_pp >= 0 ? '+' : ''}${d.van_khi_nen_30.top5_4_pp} / ${d.van_khi_nen_30.pn6_3_pp >= 0 ? '+' : ''}${d.van_khi_nen_30.pn6_3_pp} pp (${d.van_khi_nen_30.medianMs >= 0 ? '+' : ''}${d.van_khi_nen_30.medianMs} ms) |`,
      `| Chưa từng khai | ${m.chua_tung_khai_100.top1_4.tyLe}% / ${m.chua_tung_khai_100.top5_4.tyLe}% / ${m.chua_tung_khai_100.pn6_3.tyLe}% | ${on.chua_tung_khai_100.top1_4.tyLe}% / ${on.chua_tung_khai_100.top5_4.tyLe}% / ${on.chua_tung_khai_100.pn6_3.tyLe}% | ${d.chua_tung_khai_100.top1_4_pp >= 0 ? '+' : ''}${d.chua_tung_khai_100.top1_4_pp} / ${d.chua_tung_khai_100.top5_4_pp >= 0 ? '+' : ''}${d.chua_tung_khai_100.top5_4_pp} / ${d.chua_tung_khai_100.pn6_3_pp >= 0 ? '+' : ''}${d.chua_tung_khai_100.pn6_3_pp} pp (${d.chua_tung_khai_100.medianMs >= 0 ? '+' : ''}${d.chua_tung_khai_100.medianMs} ms) |`,
    );
    for (const bt of btKeys) {
      const o1 = m.s7_holdout.bienThe[bt];
      const o2 = on.s7_holdout.bienThe[bt];
      const db = d.s7_holdout[bt];
      lines.push(`| S-7 \`${bt}\` | ${o1.top1_4.tyLe}% / ${o1.top5_4.tyLe}% / ${o1.pn6_3.tyLe}% | ${o2.top1_4.tyLe}% / ${o2.top5_4.tyLe}% / ${o2.pn6_3.tyLe}% | ${db.top1_4_pp >= 0 ? '+' : ''}${db.top1_4_pp} / ${db.top5_4_pp >= 0 ? '+' : ''}${db.top5_4_pp} / ${db.pn6_3_pp >= 0 ? '+' : ''}${db.pn6_3_pp} pp (${db.medianMs >= 0 ? '+' : ''}${db.medianMs} ms) |`);
    }
  }

  lines.push('', '## (c) Độ phủ đứng riêng C4 (`data/do-thi/c4-model-hang.json`)', '');
  if (!c4.coTep || c4.trangThai.startsWith('BO_QUA')) {
    lines.push(`- **Trạng thái:** ${c4.trangThai} — ${c4.ghiChu}`);
  } else {
    const tkHangInfo = c4.hangThamKhao
      ? ` · Hãng tham khảo: **${c4.hangThamKhao.soCap}**${c4.hangThamKhao.nhatQuanItDong != null ? ` (nhất quán ít dòng: ${c4.hangThamKhao.nhatQuanItDong}, đa số ưu thế: ${c4.hangThamKhao.daSoUuThe})` : ''}`
      : '';
    lines.push(
      `- **Phiên bản tệp C4:** v${c4.phienBan} (${c4.trangThai}, \`loaiCaKin\`: ${c4.loaiCaKin}) · **Cặp chấp nhận:** **${c4.capChapNhan.tong}** (hãng+model: ${c4.capChapNhan.hang_model ?? 0}, model: ${c4.capChapNhan.model}, hãng: ${c4.capChapNhan.hang}) · Mâu thuẫn: ${c4.capMauThuan.tong}${tkHangInfo}`,
    );
    if (c4.doPhuTrenOz) {
      const hmOz = c4.doPhuTrenOz.soDongDuocPhuHangModel != null
        ? ` · hãng+model: ${c4.doPhuTrenOz.soDongDuocPhuHangModel}, model: ${c4.doPhuTrenOz.soDongDuocPhuModel}, hãng: ${c4.doPhuTrenOz.soDongDuocPhuHang}`
        : '';
      lines.push(`- **Độ phủ trên kho OZ (bản ghi hiện hành):** ${c4.doPhuTrenOz.soDongDuocPhu} dòng (**${c4.doPhuTrenOz.trenDongCoModelHangPhanTram}%** dòng có model/hãng hợp lệ · **${c4.doPhuTrenOz.trenTongSoDongPhanTram}%** toàn kho OZ${hmOz})`);
    }
    if (c4.danhGiaDeRieng300?.trangThai === 'DA_DO') {
      const d3 = c4.danhGiaDeRieng300;
      const theoLoaiInfo = d3.theoLoai
        ? ` · theo loại: hãng+model ${d3.theoLoai.hang_model?.phu ?? 0} (${d3.theoLoai.hang_model?.dung ?? 0} đúng), model ${d3.theoLoai.model?.phu ?? 0} (${d3.theoLoai.model?.dung ?? 0} đúng), hãng ${d3.theoLoai.hang?.phu ?? 0} (${d3.theoLoai.hang?.dung ?? 0} đúng)`
        : '';
      lines.push(`- **Đo S-7 sạch đứng riêng trên \`de-rieng-300.jsonl\`:** phủ **${d3.soCaDuocPhu}/${d3.tongCa}** ca (**${d3.doPhuTrenTongCaPhanTram}%** tổng ca · **${d3.doPhuTrenCaCoModelHangPhanTram}%** ca có model/hãng hợp lệ) · chính xác trên ca phủ: **${d3.soCaDungNhom4}/${d3.soCaDuocPhu} (${d3.doChinhXacTrenCaDuocPhuPhanTram}%)**${theoLoaiInfo}`);
      if (d3.thamKhao) {
        lines.push(`- **Hãng tham khảo C4 trên \`de-rieng-300.jsonl\` (chỉ tham khảo):** ${d3.thamKhao.soCaCoGoiY} ca · đúng nhóm 4 số: **${d3.thamKhao.soCaDungNhom4}/${d3.thamKhao.soCaCoGoiY} (${d3.thamKhao.doChinhXacPhanTram}%)**`);
      }
    }
  }

  return `${lines.join('\n')}\n`;
}

/** Chạy toàn bộ benchmark Stage-2 ngoại tuyến. */
export async function chayBenchGd2(tuyChon = {}) {
  const t0 = performance.now();
  const doPhuDoThi = doDoPhuDoThi();
  const c4 = await doDoPhuC4();
  const timTruoc = await doBoTimTruoc(tuyChon);
  const tongMs = Math.round(performance.now() - t0);

  return {
    phienBan: 'gd2-offline@1',
    thamSo: {
      cheDo: tuyChon.du ? 'du' : (tuyChon.nhanh ? 'nhanh' : 'macDinh'),
      nhanh: Boolean(tuyChon.nhanh),
      du: Boolean(tuyChon.du),
      soSanhTienXuLy: Boolean(tuyChon.soSanhTienXuLy),
      chePII: Boolean(tuyChon.chePII),
      gioiHan: tuyChon.gioiHan || null,
    },
    tongMs,
    dichKeHoach: DICH_GD2,
    doPhuDoThi,
    timTruoc,
    c4,
  };
}

async function chinh(argv = process.argv.slice(2)) {
  const opts = phanTichThamSo(argv);
  const kq = await chayBenchGd2(opts);
  const md = dinhDangBaoCaoMarkdown(kq);

  if (opts.chePII || opts.baoCaoPath || opts.jsonPath) {
    const ktraMd = kiemTraZeroPii(md);
    if (!ktraMd.sach) {
      console.error(`LỖI ZERO-PII: phát hiện rò rỉ trong báo cáo (${JSON.stringify(ktraMd)})`);
      process.exit(2);
    }
  }

  if (opts.jsonPath) {
    const jsonText = `${JSON.stringify(kq, null, 2)}\n`;
    const ktraJson = kiemTraZeroPii(jsonText);
    if (!ktraJson.sach) {
      console.error(`LỖI ZERO-PII: phát hiện rò rỉ trong JSON (${JSON.stringify(ktraJson)})`);
      process.exit(2);
    }
    fs.mkdirSync(path.dirname(opts.jsonPath), { recursive: true });
    fs.writeFileSync(opts.jsonPath, jsonText, 'utf8');
  }

  if (opts.baoCaoPath) {
    fs.mkdirSync(path.dirname(opts.baoCaoPath), { recursive: true });
    fs.writeFileSync(opts.baoCaoPath, md, 'utf8');
  }

  if (opts.jsonStdout) {
    const jsonText = JSON.stringify(kq, null, 2);
    const ktraJson = kiemTraZeroPii(jsonText);
    if (!ktraJson.sach) {
      console.error(`LỖI ZERO-PII: phát hiện rò rỉ trong JSON (${JSON.stringify(ktraJson)})`);
      process.exit(2);
    }
    console.log(jsonText);
  } else {
    console.log(md);
    if (opts.jsonPath) console.log(`Đã ghi JSON: ${opts.jsonPath}`);
    if (opts.baoCaoPath) console.log(`Đã ghi báo cáo: ${opts.baoCaoPath}`);
  }
  return 0;
}

const duongDanThuc = (p) => {
  try { return fs.realpathSync(p); } catch { return path.resolve(p); }
};
const laChinh = Boolean(
  process.argv[1]
  && duongDanThuc(path.resolve(process.argv[1])) === duongDanThuc(fileURLToPath(import.meta.url)),
);
if (laChinh) {
  chinh().then((code) => process.exit(code)).catch((e) => {
    console.error(e?.stack || e?.message || String(e));
    process.exit(1);
  });
}
