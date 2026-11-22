#!/usr/bin/env node
/**
 * scripts/dung-c4-model-hang.mjs — Dựng bảng tra tất định C4 (model / hãng → nhóm 4 số).
 *
 * Nguồn: data/oz-gold-final.jsonl, đối chiếu biểu thuế hiện hành data/tax.json (quy ước
 * tapNut().ma8: chỉ nhận mã 8 số đang có trong tax.json; mã 10 số như 8524910020 hay mã
 * hết hiệu lực ghi riêng vào `maHetHieuLuc`, không đưa vào `bang`).
 *
 * Tất định, không AI, không mạng, không dấu thời gian, không chép dữ liệu khách hàng.
 * Chưa nối vào đường tìm khách (`api/`, `lib/llm*`, `lib/tim-truoc.js`, `lib/engine*`).
 *
 * Cách chạy:
 *   node scripts/dung-c4-model-hang.mjs                  # dựng & in thongKe
 *   node scripts/dung-c4-model-hang.mjs --ghi            # ghi data/do-thi/c4-model-hang.json
 *   node scripts/dung-c4-model-hang.mjs --ra=<đường-dẫn> # ghi ra tệp tuỳ chọn
 *   node scripts/dung-c4-model-hang.mjs --loai-ca-kin    # loại ca kín S-7 khi dựng
 *   node scripts/dung-c4-model-hang.mjs --do-de-rieng    # dựng sạch ca kín trong RAM & đo trên de-rieng-300.jsonl
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { khoaNoiDung, laCaKin, taiDanhSachLoai } from './dung-bo-thu-de-rieng.mjs';

const require = createRequire(import.meta.url);
const { dataReadPath } = require('../lib/data-paths.js');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEP_MAC_DINH_RA = path.join(ROOT, 'data', 'do-thi', 'c4-model-hang.json');
const TEP_NGUON_MAC_DINH = 'data/oz-gold-final.jsonl';
const TEP_DE_RIENG_300 = path.join(ROOT, 'scripts', 'ca-do', 'de-rieng-300.jsonl');

const so = (v) => String(v == null ? '' : v).replace(/\D/g, '');
const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');
const cmpStr = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export const boDau = (s) => String(s ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/gi, 'd');

const NHIEU_TU_CHUOI = new Set([
  'khong nhan hieu', 'khong hieu', 'khong co', 'khong model', 'khong thuong hieu',
  'khong ro', 'khong co nhan hieu', 'khong co model', 'khieu', 'khong',
  'chua co', 'chua ro', 'mac dinh', 'khac', 'loai khac', 'mau khac',
  'no brand', 'nobrand', 'no model', 'nomodel', 'no name', 'noname',
  'none', 'n a', 'na', 'n/a', 'null', 'nil', 'nan', 'undefined', 'unknown', 'unk',
  'unbranded', 'not available', 'not applicable', 'generic', 'oem', 'odm', 'oem odm',
  'standard', 'default', 'sample', 'test', 'universal', 'fashion', 'sport', 'fashion sport',
  'good', 'tot', 'chuoi', 'vuong', 'dt', 'model', 'brand', 'no',
  // Danh từ chung không mang định danh model/hãng
  'capacitor', 'resistor', 'inductor', 'diode', 'transistor', 'relay', 'switch',
  'sensor', 'connector', 'adapter', 'charger', 'cable', 'wire', 'battery', 'motor',
  'pump', 'valve', 'cylinder', 'bearing', 'screw', 'bolt', 'nut', 'washer', 'gasket',
  'seal', 'filter', 'lamp', 'led', 'module', 'board', 'pcb', 'controller', 'driver',
  'inverter', 'converter', 'transformer', 'power supply',
  // Tên quốc gia / tỉnh / thành phố đứng trơ thay cho nhãn hiệu
  'cn', 'tq', 'vn', 'us', 'jp', 'kr', 'eu', 'china', 'trung quoc', 'vietnam', 'viet nam',
  'taiwan', 'japan', 'korea', 'usa', 'made in china',
  'zhejiang', 'henan', 'shanghai', 'hubei', 'ningbo', 'hangzhou', 'suzhou', 'changzhou',
  'taizhou', 'guangdong', 'guangzhou', 'shenzhen', 'foshan', 'dongguan', 'wenzhou',
  'tianjin', 'shandong', 'hebei', 'jiangsu', 'fujian', 'sichuan', 'hunan', 'anhui',
  'jiangxi', 'guangxi', 'ho bac', 'son tay', 'hangzhen',
]);

const RE_CONG_TY = /\bco\s*[.,]+\s*(?:ltd|limited)\b|,\s*(?:inc|corp|llc)\b|\b(?:company|limited|corporation)\b/i;
const RE_MO_TA_VIET_PHAY = /^(?:không|khong)\s+|,\s*(?:dòng|dong|ống|ong)\s+/i;
const RE_DON_VI_SO = /^\d+(?:[.,+\/*-]\d+)*\s*(?:mm|cm|dm|m|km|um|nm|in|inch|ft|mg|g|kg|t|ton|ml|l|v|kv|mv|a|ma|ka|w|kw|mw|va|kva|hz|khz|mhz|ghz|ohm|uf|nf|pf|bar|pa|kpa|mpa|psi|rpm|db|k|pcs|pc|set|bo|cai|chiec|%)+$/i;
const RE_KICH_THUOC = /^\d+(?:[.,]\d+)?(?:\s*[x×*]\s*\d+(?:[.,]\d+)?)+(?:\s*(?:mm|cm|dm|m|in|inch))?$/i;

/**
 * Tách chuỗi danh sách nhiều model/hãng phân cách bằng `;` hoặc `,`.
 * Giữ nguyên tên công ty (`Co., Ltd`), số thập phân dùng dấu phẩy (`200/31,5`), và câu mô tả tiếng Việt.
 * @param {string} raw
 * @param {'model'|'hang'} [loai]
 * @returns {string[]}
 */
export function tachGiaTriModelHang(raw, loai = 'model') {
  const s = String(raw ?? '').normalize('NFC').trim();
  if (!s) return [];
  if (s.includes(';')) {
    return s.split(';').map((x) => x.trim()).filter(Boolean);
  }
  if (!s.includes(',')) return [s];
  if (RE_CONG_TY.test(s)) return [s];
  if (loai === 'model' && RE_MO_TA_VIET_PHAY.test(s)) return [s];
  if (/,\s+/.test(s)) {
    return s.split(/,\s*/).map((x) => x.trim()).filter(Boolean);
  }
  const parts = s.split(',').map((x) => x.trim()).filter(Boolean);
  if (parts.length >= 2 && parts.every((p) => /^[A-Z0-9-]{3,}$/i.test(p))) return parts;
  if (parts.length === 2 && /^[A-Z]{2,}$/i.test(parts[0]) && /^[A-Z]{2,}$/i.test(parts[1])) return parts;
  return [s];
}

/**
 * Chuẩn hoá khoá `khoaChuan`: NFC, gộp khoảng trắng, chuẩn hoá hậu tố `CO., LTD`,
 * bỏ dấu câu thừa ở hai đầu (giữ ngoặc cân bằng như `SAJ40-1.4A(A)`), in hoa.
 * @param {string} raw
 * @returns {string}
 */
export function chuanKhoaModel(raw) {
  let t = String(raw ?? '').normalize('NFC').replace(/\s+/g, ' ').trim().toUpperCase();
  if (!t) return '';
  t = t.replace(/\bCO\s*[.,]+\s*LTD\b\.?/g, 'CO., LTD');
  t = t.replace(/\bCO\s*[.,]+\s*LIMITED\b\.?/g, 'CO., LIMITED');
  t = t.replace(/^[\s.,;:!?*~`"'/\\|+-]+|[\s.,;:!?*~`"'/\\|+-]+$/g, '').trim();
  if (t.startsWith('(') && !t.includes(')')) t = t.slice(1).trim();
  if (t.endsWith(')') && !t.includes('(')) t = t.slice(0, -1).trim();
  return t.replace(/^[\s.,;:!?*~`"'/\\|+-]+|[\s.,;:!?*~`"'/\\|+-]+$/g, '').trim();
}

/**
 * Kiểm tra giá trị model/hãng có phải nhiễu hoặc chuỗi phi định danh hay không.
 * @param {string} raw
 * @param {'model'|'hang'} [loai]
 * @returns {boolean}
 */
export function laNhieuModelHang(raw, loai = 'model') {
  const k = chuanKhoaModel(raw);
  if (!k) return true;
  const alnum = (k.match(/[\p{L}\p{N}]/gu) || []).length;
  if (alnum < 2) return true;

  const low = boDau(k).toLowerCase().replace(/\s+/g, ' ').trim();
  const lowNoPunct = low.replace(/[^a-z0-9\s/]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (NHIEU_TU_CHUOI.has(low) || NHIEU_TU_CHUOI.has(lowNoPunct)) return true;

  if (/^(?:khong|chua)\s+(?:co|ro|hieu|nhan|thuong|model|tay\s+vin)/.test(low)) return true;
  if (/^(?:mau|loai|phien\s+ban|the\s+he|so|chu|can\s+thang|ong\s+long|\d+\s+mat|\d+\s+lo|\d+\s+ngan|\d+\s+rang)\b/.test(low) && !/[A-Z0-9]{2,}-\w+/.test(k)) {
    return true;
  }

  if (/^\d+(?:[.,]\d+)*$/.test(k)) return true;
  if (RE_KICH_THUOC.test(k)) return true;
  if (RE_DON_VI_SO.test(k)) return true;
  if (loai === 'model' && RE_CONG_TY.test(k)) return true;
  return false;
}

/**
 * Tạo tập mã biểu thuế hiện hành theo đúng quy ước `tapNut()` của `lib/do-thi/dung-bang-canh.js`:
 * `data/tax.json` chỉ chứa khoá 8 số; mã 10 số hoặc mã cũ không nằm trong `ma8`.
 * @param {Record<string, unknown>} taxData
 * @returns {{ ma8: Set<string>, pn6: Set<string>, nhom: Set<string> }}
 */
export function taoTapMaHienHanh(taxData) {
  const ma8 = new Set(Object.keys(taxData || {}).filter((c) => /^\d{8}$/.test(c)));
  const pn6 = new Set();
  const nhom = new Set();
  for (const c of ma8) {
    pn6.add(c.slice(0, 6));
    nhom.add(c.slice(0, 4));
  }
  return { ma8, pn6, nhom };
}

function dinhDangHienThi(raw) {
  let t = String(raw ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
  t = t.replace(/^[\s.,;:!?*~`"'/\\|+-]+|[\s.,;:!?*~`"'/\\|+-]+$/g, '').trim();
  if (t.startsWith('(') && !t.includes(')')) t = t.slice(1).trim();
  if (t.endsWith(')') && !t.includes('(')) t = t.slice(0, -1).trim();
  return t;
}

function chonHienThi(freqMap, fallback) {
  if (!freqMap || freqMap.size === 0) return fallback;
  return [...freqMap.entries()]
    .sort((a, b) => (b[1] - a[1]) || cmpStr(a[0], b[0]))[0][0];
}

function rutCapTuDong(dong) {
  const ketQua = [];
  const daThay = new Set();
  const thu = (loai, rawList) => {
    const ds = Array.isArray(rawList) ? rawList : (rawList ? [rawList] : []);
    for (const raw of ds) {
      for (const phan of tachGiaTriModelHang(raw, loai)) {
        if (laNhieuModelHang(phan, loai)) continue;
        const khoaChuan = chuanKhoaModel(phan);
        if (!khoaChuan) continue;
        const k = `${loai}\u0000${khoaChuan}`;
        if (daThay.has(k)) continue;
        daThay.add(k);
        ketQua.push({ loai, khoaChuan, hienThi: dinhDangHienThi(phan) || khoaChuan });
      }
    }
  };
  thu('model', dong?.models ?? dong?.model);
  thu('hang', dong?.brands ?? dong?.hang ?? dong?.brand);
  return ketQua;
}

function docTaxMacDinh() {
  return JSON.parse(fs.readFileSync(dataReadPath('tax.json'), 'utf8'));
}

function docOzGoldMacDinh() {
  return fs.readFileSync(dataReadPath('oz-gold-final.jsonl'), 'utf8')
    .split('\n')
    .filter((l) => l.trim().length > 0);
}

/**
 * Dựng bảng C4 từ tờ khai OZ và biểu thuế hiện hành.
 * @param {{
 *   loaiCaKin?: boolean,
 *   danhSachLoai?: ReturnType<typeof taiDanhSachLoai>,
 *   tepNguon?: string,
 *   ozLines?: Array<string|object>,
 *   taxData?: Record<string, unknown>
 * }} [tuyChon]
 */
export function dungBangC4(tuyChon = {}) {
  const loaiCaKin = Boolean(tuyChon.loaiCaKin);
  const tepNguon = String(tuyChon.tepNguon || TEP_NGUON_MAC_DINH);
  const taxData = tuyChon.taxData || docTaxMacDinh();
  const tap = taoTapMaHienHanh(taxData);
  const dsLoai = loaiCaKin ? (tuyChon.danhSachLoai || taiDanhSachLoai()) : null;
  const rawLines = Array.isArray(tuyChon.ozLines) ? tuyChon.ozLines : docOzGoldMacDinh();

  let tongSoDongGoc = 0;
  let soDongBiLoaiCaKin = 0;
  let tongSoDong = 0;
  let soDongMaHienHanh = 0;
  let soDongCoModelHangTho = 0;
  let soDongCoModelHangHopLe = 0;
  let soDongMaHetHieuLuc = 0;
  let soDongMaHetHieuLucCoModelHang = 0;
  let soDongMa10So = 0;
  const ma10SoTrongBieu8So = new Set();
  const ma10SoKhongTrongBieu8So = new Set();

  // `${loai}\0${khoaChuan}` -> { loai, khoaChuan, displayFreq: Map, byHeading: Map<ma4, Set<dong>> }
  const activeMap = new Map();
  // `${loai}\0${khoaChuan}\0${maGoc}` -> { loai, khoaChuan, maGoc, lyDo, ma8TrongBieu, displayFreq: Map, dongs: Set<dong> }
  const hetHieuLucMap = new Map();

  for (let i = 0; i < rawLines.length; i += 1) {
    const item = rawLines[i];
    const dong = (item && typeof item === 'object' && Number.isInteger(item.dong) && item.banGhi)
      ? item.dong
      : i + 1;
    const banGhi = typeof item === 'string'
      ? JSON.parse(item)
      : (item && typeof item === 'object' && item.banGhi ? item.banGhi : item);

    tongSoDongGoc += 1;
    if (loaiCaKin && laCaKin(banGhi, dsLoai)) {
      soDongBiLoaiCaKin += 1;
      continue;
    }
    tongSoDong += 1;

    const rawM = Array.isArray(banGhi?.models) ? banGhi.models : (banGhi?.model ? [banGhi.model] : []);
    const rawB = Array.isArray(banGhi?.brands) ? banGhi.brands : (banGhi?.hang || banGhi?.brand ? [banGhi.hang || banGhi.brand] : []);
    if (rawM.length > 0 || rawB.length > 0) soDongCoModelHangTho += 1;

    const cap = rutCapTuDong(banGhi);
    const hs = so(banGhi?.hsCode ?? banGhi?.hs ?? banGhi?.maHs);
    const maHopLe = /^\d{8}$/.test(hs) && tap.ma8.has(hs);

    if (!maHopLe) {
      soDongMaHetHieuLuc += 1;
      const ma8TrongBieu = hs.length >= 8 && tap.ma8.has(hs.slice(0, 8));
      if (hs.length === 10) {
        soDongMa10So += 1;
        if (ma8TrongBieu) ma10SoTrongBieu8So.add(hs);
        else ma10SoKhongTrongBieu8So.add(hs);
      }
      if (cap.length > 0) soDongMaHetHieuLucCoModelHang += 1;
      const lyDo = hs.length !== 8
        ? 'khong-phai-ma-8-so-trong-tax-json'
        : 'ma-khong-con-trong-bieu';
      for (const c of cap) {
        const hk = `${c.loai}\u0000${c.khoaChuan}\u0000${hs || 'THIEU_MA'}`;
        if (!hetHieuLucMap.has(hk)) {
          hetHieuLucMap.set(hk, {
            loai: c.loai,
            khoaChuan: c.khoaChuan,
            maGoc: hs,
            lyDo,
            ma8TrongBieu,
            displayFreq: new Map(),
            dongs: new Set(),
          });
        }
        const entry = hetHieuLucMap.get(hk);
        entry.displayFreq.set(c.hienThi, (entry.displayFreq.get(c.hienThi) || 0) + 1);
        entry.dongs.add(dong);
      }
      continue;
    }

    soDongMaHienHanh += 1;
    if (cap.length > 0) soDongCoModelHangHopLe += 1;
    const h4 = hs.slice(0, 4);

    for (const c of cap) {
      const ak = `${c.loai}\u0000${c.khoaChuan}`;
      if (!activeMap.has(ak)) {
        activeMap.set(ak, {
          loai: c.loai,
          khoaChuan: c.khoaChuan,
          displayFreq: new Map(),
          byHeading: new Map(),
        });
      }
      const rec = activeMap.get(ak);
      rec.displayFreq.set(c.hienThi, (rec.displayFreq.get(c.hienThi) || 0) + 1);
      if (!rec.byHeading.has(h4)) rec.byHeading.set(h4, new Set());
      rec.byHeading.get(h4).add(dong);
    }
  }

  const bang = [];
  const mauThuan = [];
  const dongDuocPhu = new Set();
  const dongDuocPhuModel = new Set();
  const dongDuocPhuHang = new Set();
  let capDuoiNguong = 0;

  for (const rec of activeMap.values()) {
    let tongDongCap = 0;
    for (const s of rec.byHeading.values()) tongDongCap += s.size;
    if (tongDongCap < 2) {
      capDuoiNguong += 1;
      continue;
    }

    const truongTen = rec.loai === 'model' ? 'model' : 'hang';
    const tenHienThi = chonHienThi(rec.displayFreq, rec.khoaChuan);

    if (rec.byHeading.size === 1) {
      const [ma, dongSet] = [...rec.byHeading.entries()][0];
      const dongs = [...dongSet].sort((a, b) => a - b);
      for (const d of dongs) {
        dongDuocPhu.add(d);
        if (rec.loai === 'model') dongDuocPhuModel.add(d);
        else dongDuocPhuHang.add(d);
      }
      bang.push({
        loai: rec.loai,
        [truongTen]: tenHienThi,
        khoaChuan: rec.khoaChuan,
        ma,
        soDong: dongs.length,
        nguon: dongs.map((d) => ({ tep: tepNguon, dong: d })),
      });
    } else {
      const cacNhom = [...rec.byHeading.entries()]
        .map(([ma, dongSet]) => {
          const dongs = [...dongSet].sort((a, b) => a - b);
          return {
            ma,
            soDong: dongs.length,
            nguon: dongs.map((d) => ({ tep: tepNguon, dong: d })),
          };
        })
        .sort((a, b) => (b.soDong - a.soDong) || cmpStr(a.ma, b.ma));
      mauThuan.push({
        loai: rec.loai,
        [truongTen]: tenHienThi,
        khoaChuan: rec.khoaChuan,
        tongDong: tongDongCap,
        cacNhom,
      });
    }
  }

  bang.sort((a, b) => cmpStr(a.loai, b.loai) || cmpStr(a.khoaChuan, b.khoaChuan) || cmpStr(a.ma, b.ma));
  mauThuan.sort((a, b) => cmpStr(a.loai, b.loai) || cmpStr(a.khoaChuan, b.khoaChuan));

  const maHetHieuLuc = [...hetHieuLucMap.values()]
    .map((e) => {
      const truongTen = e.loai === 'model' ? 'model' : 'hang';
      const dongs = [...e.dongs].sort((a, b) => a - b);
      return {
        loai: e.loai,
        [truongTen]: chonHienThi(e.displayFreq, e.khoaChuan),
        khoaChuan: e.khoaChuan,
        maGoc: e.maGoc,
        lyDo: e.lyDo,
        ma8TrongBieu: e.ma8TrongBieu,
        soDong: dongs.length,
        nguon: dongs.map((d) => ({ tep: tepNguon, dong: d })),
      };
    })
    .sort((a, b) => cmpStr(a.loai, b.loai) || cmpStr(a.khoaChuan, b.khoaChuan) || cmpStr(a.maGoc, b.maGoc));

  const chapNhanModel = bang.filter((x) => x.loai === 'model').length;
  const chapNhanHang = bang.filter((x) => x.loai === 'hang').length;
  const mauThuanModel = mauThuan.filter((x) => x.loai === 'model').length;
  const mauThuanHang = mauThuan.filter((x) => x.loai === 'hang').length;
  const tyLe = (num, den) => (den > 0 ? Number(((num / den) * 100).toFixed(2)) : 0);

  const thongKe = {
    tongSoDongGoc,
    soDongBiLoaiCaKin,
    tongSoDong,
    soDongMaHienHanh,
    soDongCoModelHangTho,
    soDongCoModelHangHopLe,
    capDuoiNguong,
    capChapNhan: {
      model: chapNhanModel,
      hang: chapNhanHang,
      tong: bang.length,
    },
    capMauThuan: {
      model: mauThuanModel,
      hang: mauThuanHang,
      tong: mauThuan.length,
    },
    maHetHieuLuc: {
      soDong: soDongMaHetHieuLuc,
      soDongCoModelHangHopLe: soDongMaHetHieuLucCoModelHang,
      soCap: maHetHieuLuc.length,
      soMaKhacNhau: new Set(maHetHieuLuc.map((x) => x.maGoc)).size,
      soDongMa10So,
      ma10SoTrongBieu8So: [...ma10SoTrongBieu8So].sort(cmpStr),
      ma10SoKhongTrongBieu8So: [...ma10SoKhongTrongBieu8So].sort(cmpStr),
    },
    doPhu: {
      soDongDuocPhu: dongDuocPhu.size,
      soDongDuocPhuModel: dongDuocPhuModel.size,
      soDongDuocPhuHang: dongDuocPhuHang.size,
      trenDongCoModelHangPhanTram: tyLe(dongDuocPhu.size, soDongCoModelHangHopLe),
      trenTongSoDongPhanTram: tyLe(dongDuocPhu.size, tongSoDong),
    },
  };

  const bieuThue = {
    nguon: 'data/tax.json',
    soMa8: tap.ma8.size,
    soNhom4: tap.nhom.size,
    quyTac: 'chi-nhan-ma-8-so-khop-data-tax-json',
    ghiChu: 'data/tax.json chi chua khoa 8 so; ma 10 so quoc gia (vd 8524910020) va ma het hieu luc khong nam trong tapNut().ma8 nen tach rieng vao maHetHieuLuc.',
  };

  const quyTac = {
    soDongToiThieu: 2,
    nhatQuanMotNhom4: true,
    tachDanhSach: 'tach theo ; va , (bo qua Co., Ltd, so thap phan dau phay va mo ta tieng Viet)',
    chuanKhoa: 'NFC, gop khoang trang, chuan hoa CO., LTD, bo dau cau hai dau, in hoa',
    locNhieu: 'loai chuoi < 2 ky tu chu/so, tu khoa khong nhan hieu/null/oem, so thuan tuy, kich thuoc/don vi do, tinh/quoc gia dung tro',
  };

  const bam = sha256(JSON.stringify({
    phienBan: 1,
    loaiCanh: 'C4',
    nguon: tepNguon,
    loaiCaKin,
    quyTac,
    thongKe,
    bang,
    mauThuan,
    maHetHieuLuc,
  }));

  return {
    phienBan: 1,
    loaiCanh: 'C4',
    moTa: 'Bang tra tat dinh C4 (model / hang -> nhom 4 so HS) dung tu data/oz-gold-final.jsonl, doi chieu bieu thue data/tax.json. Chua noi vao duong tim khach hang.',
    cachDungLai: 'node scripts/dung-c4-model-hang.mjs --ghi',
    nguon: tepNguon,
    bieuThue,
    loaiCaKin,
    quyTac,
    bam,
    thongKe,
    bang,
    mauThuan,
    maHetHieuLuc,
  };
}

/**
 * Tạo chỉ mục tra nhanh O(1) từ mảng `bang` hoặc tài liệu C4 đầy đủ.
 * @param {object|object[]} bangHoacTaiLieu
 */
export function taoChiMucC4(bangHoacTaiLieu) {
  if (bangHoacTaiLieu && bangHoacTaiLieu.modelMap instanceof Map && bangHoacTaiLieu.hangMap instanceof Map) {
    return bangHoacTaiLieu;
  }
  const ds = Array.isArray(bangHoacTaiLieu)
    ? bangHoacTaiLieu
    : (Array.isArray(bangHoacTaiLieu?.bang) ? bangHoacTaiLieu.bang : []);
  const modelMap = new Map();
  const hangMap = new Map();
  for (const m of ds) {
    if (!m || !m.khoaChuan) continue;
    if (m.loai === 'model') modelMap.set(m.khoaChuan, m);
    else if (m.loai === 'hang') hangMap.set(m.khoaChuan, m);
  }
  return { modelMap, hangMap };
}

/**
 * Tra cứu nhóm 4 số trong bảng C4 từ đầu vào `{ models, brands }` hoặc chuỗi đơn.
 * Ưu tiên khớp `model` trước `hang`, sau đó theo `soDong` giảm dần.
 * @param {string|{models?: string[], model?: string, brands?: string[], brand?: string, hang?: string}} truyVan
 * @param {object|object[]} bangHoacChiMuc
 */
export function traC4(truyVan, bangHoacChiMuc) {
  const idx = taoChiMucC4(bangHoacChiMuc);
  const rawModels = typeof truyVan === 'string'
    ? [truyVan]
    : [...(Array.isArray(truyVan?.models) ? truyVan.models : []), ...(truyVan?.model ? [truyVan.model] : [])];
  const rawBrands = typeof truyVan === 'string'
    ? [truyVan]
    : [...(Array.isArray(truyVan?.brands) ? truyVan.brands : []), ...(truyVan?.brand ? [truyVan.brand] : []), ...(truyVan?.hang ? [truyVan.hang] : [])];

  const khoaModels = new Set();
  for (const r of rawModels) {
    for (const p of tachGiaTriModelHang(r, 'model')) {
      if (!laNhieuModelHang(p, 'model')) khoaModels.add(chuanKhoaModel(p));
    }
  }
  const khoaBrands = new Set();
  for (const r of rawBrands) {
    for (const p of tachGiaTriModelHang(r, 'hang')) {
      if (!laNhieuModelHang(p, 'hang')) khoaBrands.add(chuanKhoaModel(p));
    }
  }

  const soKhoaHopLe = khoaModels.size + khoaBrands.size;
  if (soKhoaHopLe === 0) {
    return {
      trangThai: 'KHONG_CO_MODEL_HANG',
      timThay: false,
      ma: null,
      loai: null,
      khoaChuan: null,
      soDong: 0,
      nguon: [],
      cacKhop: [],
      nhatQuan: true,
      soKhoaHopLe: 0,
    };
  }

  const khop = [];
  for (const k of khoaModels) {
    const e = idx.modelMap.get(k);
    if (e) khop.push(e);
  }
  for (const k of khoaBrands) {
    const e = idx.hangMap.get(k);
    if (e) khop.push(e);
  }

  khop.sort((a, b) => (a.loai === b.loai ? 0 : (a.loai === 'model' ? -1 : 1))
    || (b.soDong - a.soDong)
    || cmpStr(a.khoaChuan, b.khoaChuan));

  if (khop.length === 0) {
    return {
      trangThai: 'KHONG_TIM_THAY',
      timThay: false,
      ma: null,
      loai: null,
      khoaChuan: null,
      soDong: 0,
      nguon: [],
      cacKhop: [],
      nhatQuan: true,
      soKhoaHopLe,
    };
  }

  const dau = khop[0];
  const tapNhom = new Set(khop.map((x) => x.ma));
  return {
    trangThai: 'TIM_THAY',
    timThay: true,
    ma: dau.ma,
    loai: dau.loai,
    khoaChuan: dau.khoaChuan,
    soDong: dau.soDong,
    nguon: dau.nguon,
    cacKhop: khop,
    nhatQuan: tapNhom.size === 1,
    soKhoaHopLe,
  };
}

/**
 * Đánh giá bảng C4 sạch ca kín (dựng trong RAM với `loaiCaKin: true`) trên `scripts/ca-do/de-rieng-300.jsonl`.
 * Chỉ dùng `khoaNoiDung` của S-7 đúng lúc đo để lấy `models`/`brands` của từng ca kiểm chứng.
 */
export function doTrenDeRieng300(tuyChon = {}) {
  const duongDan300 = tuyChon.duongDanDeRieng || TEP_DE_RIENG_300;
  const bangSach = dungBangC4({ ...tuyChon, loaiCaKin: true });
  const chiMuc = taoChiMucC4(bangSach);

  const rawOz = Array.isArray(tuyChon.ozLines) ? tuyChon.ozLines : docOzGoldMacDinh();
  const theoKhoaNoiDung = new Map();
  for (const item of rawOz) {
    const banGhi = typeof item === 'string'
      ? JSON.parse(item)
      : (item && typeof item === 'object' && item.banGhi ? item.banGhi : item);
    const k = khoaNoiDung(banGhi);
    if (!theoKhoaNoiDung.has(k)) theoKhoaNoiDung.set(k, { models: [], brands: [] });
    const gop = theoKhoaNoiDung.get(k);
    if (Array.isArray(banGhi?.models)) gop.models.push(...banGhi.models);
    if (Array.isArray(banGhi?.brands)) gop.brands.push(...banGhi.brands);
  }

  const ca300 = fs.readFileSync(duongDan300, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('//'))
    .map((l) => JSON.parse(l));

  let caKhongTimThayKhoa = 0;
  let caCoModelHangHopLe = 0;
  let soCaDuocPhu = 0;
  let soCaDungNhom4 = 0;
  let soCaSaiNhom4 = 0;
  const theoLoai = {
    model: { phu: 0, dung: 0, sai: 0 },
    hang: { phu: 0, dung: 0, sai: 0 },
  };
  const chiTietKhongChuaTenHang = [];

  for (const ca of ca300) {
    const mb = theoKhoaNoiDung.get(khoaNoiDung(ca));
    if (!mb) caKhongTimThayKhoa += 1;
    const kq = traC4(mb || { models: [], brands: [] }, chiMuc);
    if (kq.soKhoaHopLe > 0) caCoModelHangHopLe += 1;
    if (!kq.timThay) continue;

    soCaDuocPhu += 1;
    const maDungNhom4 = so(ca.maDung).slice(0, 4);
    const dung = kq.ma === maDungNhom4;
    if (dung) soCaDungNhom4 += 1;
    else soCaSaiNhom4 += 1;

    theoLoai[kq.loai].phu += 1;
    if (dung) theoLoai[kq.loai].dung += 1;
    else theoLoai[kq.loai].sai += 1;

    chiTietKhongChuaTenHang.push({
      nguonDong: ca.nguonDong,
      maDungNhom4,
      maDuDoan: kq.ma,
      loaiKhop: kq.loai,
      khoaChuan: kq.khoaChuan,
      soDongNguon: kq.soDong,
      dung,
    });
  }

  const tyLe = (num, den) => (den > 0 ? Number(((num / den) * 100).toFixed(2)) : 0);
  return {
    tongCa: ca300.length,
    caKhongTimThayKhoa,
    caCoModelHangHopLe,
    soCaDuocPhu,
    soCaDungNhom4,
    soCaSaiNhom4,
    doPhuTrenTongCaPhanTram: tyLe(soCaDuocPhu, ca300.length),
    doPhuTrenCaCoModelHangPhanTram: tyLe(soCaDuocPhu, caCoModelHangHopLe),
    doChinhXacTrenCaDuocPhuPhanTram: tyLe(soCaDungNhom4, soCaDuocPhu),
    theoLoai,
    chiTietKhongChuaTenHang,
    thongKeBangSach: bangSach.thongKe,
  };
}

function chinh(argv = process.argv) {
  const args = argv.slice(2);
  const ghiMacDinh = args.includes('--ghi');
  const raArg = args.find((a) => a.startsWith('--ra='));
  const loaiCaKin = args.includes('--loai-ca-kin');
  const doDeRieng = args.includes('--do-de-rieng');
  const inBam = args.includes('--bam');

  if (doDeRieng) {
    const kq = doTrenDeRieng300();
    console.log(JSON.stringify(kq, null, 2));
    return 0;
  }

  const kq = dungBangC4({ loaiCaKin });
  const json = `${JSON.stringify(kq, null, 2)}\n`;
  const sha = sha256(json);

  if (inBam) {
    console.log(sha);
    return 0;
  }

  if (ghiMacDinh || raArg) {
    const dich = raArg ? path.resolve(raArg.slice('--ra='.length)) : TEP_MAC_DINH_RA;
    fs.mkdirSync(path.dirname(dich), { recursive: true });
    fs.writeFileSync(dich, json, 'utf8');
    console.log(`Đã ghi ${path.relative(ROOT, dich) || dich} (sha256: ${sha})`);
  }

  console.log(JSON.stringify({ sha256Tep: sha, bam: kq.bam, thongKe: kq.thongKe }, null, 2));
  return 0;
}

const duongDanThuc = (p) => {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
};
const laChinh = Boolean(
  process.argv[1]
  && duongDanThuc(path.resolve(process.argv[1])) === duongDanThuc(fileURLToPath(import.meta.url)),
);
if (laChinh) {
  process.exit(chinh(process.argv));
}
