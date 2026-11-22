#!/usr/bin/env node
/**
 * scripts/dung-c4-model-hang.mjs — Dựng bảng tra tất định C4 bản 2 (cặp hãng+model / model / hãng chuyên biệt → nhóm 4 số).
 *
 * Nguồn: data/oz-gold-final.jsonl, đối chiếu biểu thuế hiện hành data/tax.json (quy ước
 * tapNut().ma8: chỉ nhận mã 8 số đang có trong tax.json; mã 10 số như 8524910020 hay mã
 * hết hiệu lực ghi riêng vào `maHetHieuLuc`, không đưa vào `bang`).
 *
 * Cải tiến bản 2 (`phienBan: 2`, #1611):
 *   1. Bổ sung khóa ghép `hang_model` (`HANG | MODEL`, ngưỡng >= 2 dòng, thuần 100%) để tách nhiễu model trùng giữa các hãng và hãng đa ngành.
 *   2. Khóa `model` đơn lẻ đòi hỏi >= 3 ký tự chữ/số (chặn mã 2 ký tự va chạm ngẫu nhiên) và chặn thông số kỹ thuật chuẩn (`DN15`, `DN25`, `PD20W`) / tên máy tương thích (`IP17`, `NOTE 10`) / mô tả tiếng Việt (`ZIN`, `SERIES`).
 *   3. Chặn tên đơn vị thương mại / pháp nhân / địa danh tỉnh-TP khỏi khóa `hang`, và nâng ngưỡng `hang` đơn lẻ vào `bang` lên hãng chuyên biệt (>= 4 dòng, thuần 100%, không va chạm biến thể khoảng trắng).
 *   4. Hãng yếu hơn (2–3 dòng thuần hoặc >= 3 dòng đa số >= 80%) tách riêng vào `hangThamKhao` (`chiGoiY: true`), tuyệt đối không nằm trong `bang`.
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

const PHIEN_BAN_C4 = 2;
const NGUONG_HANG_CHUYEN_BIET = 4;
const NGUONG_TINH_KHIET_THAM_KHAO = 0.8;
const DO_DAI_ALNUM_MODEL_DON_LE = 3;
const DO_DAI_ALNUM_HANG = 3;

const so = (v) => String(v == null ? '' : v).replace(/\D/g, '');
const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');
const cmpStr = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export const boDau = (s) => String(s ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/gi, 'd');

export const demChuSo = (s) => (String(s ?? '').match(/[\p{L}\p{N}]/gu) || []).length;

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

// Bộ lọc v2 tách riêng khỏi `laNhieuModelHang`: chặn thông số kỹ thuật chuẩn / tên máy tương thích ở `model`
const RE_THONG_SO_MODEL_V2 = /^(?:DN\s*\d+|PN\s*\d+|PD\s*\d+W?|IP\s*\d{2}|QC\s*\d\.\d|USB\s*[A-C0-9.-]*|HDMI|TYPE[\s-]*C|AC\s*\d+V?|DC\s*\d+V?|NOTE\s*\d+|IP\d{2}|ZIN)$/i;
const RE_MO_TA_MODEL_V2 = /\b(?:SERIES|SIEU\s+CAO|CHINH\s+HANG|CAO\s+CAP|LOAI\s+\d)\b/i;

// Bộ lọc v2 cho `hang`: chặn tên pháp nhân doanh nghiệp / đơn vị XNK / địa danh tỉnh-TP điền nhầm vào trường hãng
const RE_CONG_TY_HANG_V2 = /\b(?:CO\.?,?\s*LTD|LIMITED|LTD|INC|CORP|LLC|COMPANY|CORPORATION|GMBH|TNHH|TRADING|TRADE|IMPORT\s*(?:AND|&)\s*EXPORT|IMP\s*&\s*EXP|HOLDINGS?|GROUP|FACTORY|INDUSTRIAL|INDUCSTRIAL|MACHINERY|ELECTRONICS?|ELECTRONICAL|TECHNOLOGY|PRODUCTS?|PRODUCT|EQUIPMENT|TEXTILE|CASTE)\b|COLTD|有限公司|贸易/iu;
const RE_DIA_DANH_HANG_V2 = /(?:^|\s)(?:TAI'?AN|JINAN|GANSUTIANSHUI|SHENZHEN|GUANGZHOU|NINGBO|SHANGHAI|DONGGUAN|WENZHOU|TAIZHOU|FOSHAN|ZHEJIANG|HENAN|HUBEI|SUZHOU|HANGZHOU|WUHAN|CHENGDU|XIAMEN|YIWU|CIXI|ZHENGZHOU|ZHONGSHAN|JIANGSU|HEBEI|TIANJIN|SHANDONG|ZHUHAI)(?:\s|$)/i;

/**
 * Tách chuỗi danh sách nhiều model/hãng phân cách bằng `;` hoặc `,`.
 * Giữ nguyên tên doanh nghiệp, số thập phân dùng dấu phẩy (`200/31,5`), và câu mô tả tiếng Việt.
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
 * Chuẩn hoá khoá `khoaChuan`: NFC, gộp khoảng trắng, chuẩn hoá hậu tố pháp nhân,
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
 * Kiểm tra giá trị model/hãng có phải nhiễu cơ bản hoặc chuỗi phi định danh hay không.
 * @param {string} raw
 * @param {'model'|'hang'} [loai]
 * @returns {boolean}
 */
export function laNhieuModelHang(raw, loai = 'model') {
  const k = chuanKhoaModel(raw);
  if (!k) return true;
  if (demChuSo(k) < 2) return true;

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
 * Bộ lọc v2: phát hiện chuỗi thông số kỹ thuật chuẩn / tên máy tương thích / mô tả tiếng Việt lọt vào `model`.
 * @param {string} raw
 * @returns {boolean}
 */
export function laThongSoHoacMoTaModel(raw) {
  const k = chuanKhoaModel(raw);
  if (!k) return true;
  if (RE_THONG_SO_MODEL_V2.test(k)) return true;
  const plain = boDau(k).toUpperCase();
  return RE_MO_TA_MODEL_V2.test(plain);
}

/**
 * Bộ lọc v2: phát hiện tên pháp nhân doanh nghiệp / đơn vị XNK / địa danh tỉnh-TP điền nhầm vào `hang`.
 * @param {string} raw
 * @returns {boolean}
 */
export function laTenCongTyHoacDiaDanhHang(raw) {
  const k = chuanKhoaModel(raw);
  if (!k) return true;
  return RE_CONG_TY_HANG_V2.test(k) || RE_DIA_DANH_HANG_V2.test(k);
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

function rutKhoaSachTuDong(dong, statsLoc) {
  const models = [];
  const seenM = new Set();
  const rawModels = Array.isArray(dong?.models) ? dong.models : (dong?.model ? [dong.model] : []);
  for (const raw of rawModels) {
    for (const phan of tachGiaTriModelHang(raw, 'model')) {
      if (laNhieuModelHang(phan, 'model')) continue;
      const khoaChuan = chuanKhoaModel(phan);
      if (laThongSoHoacMoTaModel(khoaChuan)) {
        if (statsLoc) statsLoc.modelThongSoHoacMoTa += 1;
        continue;
      }
      if (seenM.has(khoaChuan)) continue;
      seenM.add(khoaChuan);
      models.push({ khoaChuan, hienThi: dinhDangHienThi(phan) || khoaChuan });
    }
  }

  const hangs = [];
  const seenB = new Set();
  const rawBrands = Array.isArray(dong?.brands)
    ? dong.brands
    : (dong?.hang || dong?.brand ? [dong.hang || dong.brand] : []);
  for (const raw of rawBrands) {
    for (const phan of tachGiaTriModelHang(raw, 'hang')) {
      if (laNhieuModelHang(phan, 'hang')) continue;
      const khoaChuan = chuanKhoaModel(phan);
      if (laTenCongTyHoacDiaDanhHang(khoaChuan)) {
        if (statsLoc) statsLoc.hangCongTyHoacDiaDanh += 1;
        continue;
      }
      if (seenB.has(khoaChuan)) continue;
      seenB.add(khoaChuan);
      hangs.push({ khoaChuan, hienThi: dinhDangHienThi(phan) || khoaChuan });
    }
  }

  const hangModels = [];
  if (hangs.length === 1 && models.length >= 1 && models.length <= 5) {
    const h = hangs[0];
    for (const m of models) {
      hangModels.push({
        khoaChuan: `${h.khoaChuan} | ${m.khoaChuan}`,
        hienThiHang: h.hienThi,
        hienThiModel: m.hienThi,
      });
    }
  } else if (models.length === 1 && hangs.length >= 1 && hangs.length <= 3) {
    const m = models[0];
    for (const h of hangs) {
      hangModels.push({
        khoaChuan: `${h.khoaChuan} | ${m.khoaChuan}`,
        hienThiHang: h.hienThi,
        hienThiModel: m.hienThi,
      });
    }
  }

  return { hangModels, models, hangs };
}

function docTaxMacDinh() {
  return JSON.parse(fs.readFileSync(dataReadPath('tax.json'), 'utf8'));
}

function docOzGoldMacDinh() {
  return fs.readFileSync(dataReadPath('oz-gold-final.jsonl'), 'utf8')
    .split('\n')
    .filter((l) => l.trim().length > 0);
}

const gopKhoaHangKhongKhoangTrang = (k) => String(k || '').replace(/[\s.'-]+/g, '');

function taoBanGhiC4(loai, rec, ma, dongs, tepNguon) {
  if (loai === 'hang_model') {
    return {
      loai: 'hang_model',
      hang: chonHienThi(rec.hangDisplayFreq, rec.khoaChuan.split(' | ')[0]),
      model: chonHienThi(rec.modelDisplayFreq, rec.khoaChuan.split(' | ')[1]),
      khoaChuan: rec.khoaChuan,
      ma,
      soDong: dongs.length,
      nguon: dongs.map((d) => ({ tep: tepNguon, dong: d })),
    };
  }
  const truongTen = loai === 'model' ? 'model' : 'hang';
  return {
    loai,
    [truongTen]: chonHienThi(rec.displayFreq, rec.khoaChuan),
    khoaChuan: rec.khoaChuan,
    ma,
    soDong: dongs.length,
    nguon: dongs.map((d) => ({ tep: tepNguon, dong: d })),
  };
}

/**
 * Dựng bảng C4 bản 2 từ tờ khai OZ và biểu thuế hiện hành.
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

  const biLocV2 = {
    hangCongTyHoacDiaDanh: 0,
    modelThongSoHoacMoTa: 0,
    modelNganDuoi3KyTu: 0,
    hangNganDuoi3KyTu: 0,
    hangDuoiNguongChuyenBiet: 0,
    hangVaChamKhoangTrang: 0,
  };

  // `${loai}\0${khoaChuan}` -> { loai, khoaChuan, displayFreq, hangDisplayFreq?, modelDisplayFreq?, byHeading: Map<ma4, Set<dong>> }
  const activeMap = new Map();
  // Kiểm tra biến thể khoảng trắng ở `hang` (ví dụ `MEAN WELL` vs `MEANWELL`)
  const hangCollapsedHeadings = new Map();
  // `${loai}\0${khoaChuan}\0${maGoc}` -> metadata hết hiệu lực
  const hetHieuLucMap = new Map();

  const damBaoActive = (loai, khoaChuan) => {
    const ak = `${loai}\u0000${khoaChuan}`;
    if (!activeMap.has(ak)) {
      activeMap.set(ak, {
        loai,
        khoaChuan,
        displayFreq: new Map(),
        hangDisplayFreq: new Map(),
        modelDisplayFreq: new Map(),
        byHeading: new Map(),
      });
    }
    return activeMap.get(ak);
  };

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

    const { hangModels, models, hangs } = rutKhoaSachTuDong(banGhi, biLocV2);
    const modelsDuManh = models.filter((m) => {
      if (demChuSo(m.khoaChuan) < DO_DAI_ALNUM_MODEL_DON_LE) {
        biLocV2.modelNganDuoi3KyTu += 1;
        return false;
      }
      return true;
    });
    const hangsDuManh = hangs.filter((h) => {
      if (demChuSo(h.khoaChuan) < DO_DAI_ALNUM_HANG) {
        biLocV2.hangNganDuoi3KyTu += 1;
        return false;
      }
      return true;
    });

    const hs = so(banGhi?.hsCode ?? banGhi?.hs ?? banGhi?.maHs);
    const maHopLe = /^\d{8}$/.test(hs) && tap.ma8.has(hs);
    const coKhoaHopLe = hangModels.length > 0 || modelsDuManh.length > 0 || hangsDuManh.length > 0;

    if (!maHopLe) {
      soDongMaHetHieuLuc += 1;
      const ma8TrongBieu = hs.length >= 8 && tap.ma8.has(hs.slice(0, 8));
      if (hs.length === 10) {
        soDongMa10So += 1;
        if (ma8TrongBieu) ma10SoTrongBieu8So.add(hs);
        else ma10SoKhongTrongBieu8So.add(hs);
      }
      if (coKhoaHopLe) soDongMaHetHieuLucCoModelHang += 1;
      const lyDo = hs.length !== 8
        ? 'khong-phai-ma-8-so-trong-tax-json'
        : 'ma-khong-con-trong-bieu';
      const themHet = (loai, khoaChuan, hienThi) => {
        const hk = `${loai}\u0000${khoaChuan}\u0000${hs || 'THIEU_MA'}`;
        if (!hetHieuLucMap.has(hk)) {
          hetHieuLucMap.set(hk, {
            loai,
            khoaChuan,
            maGoc: hs,
            lyDo,
            ma8TrongBieu,
            displayFreq: new Map(),
            dongs: new Set(),
          });
        }
        const entry = hetHieuLucMap.get(hk);
        entry.displayFreq.set(hienThi, (entry.displayFreq.get(hienThi) || 0) + 1);
        entry.dongs.add(dong);
      };
      for (const m of modelsDuManh) themHet('model', m.khoaChuan, m.hienThi);
      for (const h of hangsDuManh) themHet('hang', h.khoaChuan, h.hienThi);
      continue;
    }

    soDongMaHienHanh += 1;
    if (coKhoaHopLe) soDongCoModelHangHopLe += 1;
    const h4 = hs.slice(0, 4);

    for (const hm of hangModels) {
      const rec = damBaoActive('hang_model', hm.khoaChuan);
      rec.hangDisplayFreq.set(hm.hienThiHang, (rec.hangDisplayFreq.get(hm.hienThiHang) || 0) + 1);
      rec.modelDisplayFreq.set(hm.hienThiModel, (rec.modelDisplayFreq.get(hm.hienThiModel) || 0) + 1);
      if (!rec.byHeading.has(h4)) rec.byHeading.set(h4, new Set());
      rec.byHeading.get(h4).add(dong);
    }
    for (const m of modelsDuManh) {
      const rec = damBaoActive('model', m.khoaChuan);
      rec.displayFreq.set(m.hienThi, (rec.displayFreq.get(m.hienThi) || 0) + 1);
      if (!rec.byHeading.has(h4)) rec.byHeading.set(h4, new Set());
      rec.byHeading.get(h4).add(dong);
    }
    for (const h of hangsDuManh) {
      const rec = damBaoActive('hang', h.khoaChuan);
      rec.displayFreq.set(h.hienThi, (rec.displayFreq.get(h.hienThi) || 0) + 1);
      if (!rec.byHeading.has(h4)) rec.byHeading.set(h4, new Set());
      rec.byHeading.get(h4).add(dong);

      const ck = gopKhoaHangKhongKhoangTrang(h.khoaChuan);
      if (!hangCollapsedHeadings.has(ck)) hangCollapsedHeadings.set(ck, new Set());
      hangCollapsedHeadings.get(ck).add(h4);
    }
  }

  const bang = [];
  const hangThamKhao = [];
  const mauThuan = [];
  const dongDuocPhu = new Set();
  const dongDuocPhuHangModel = new Set();
  const dongDuocPhuModel = new Set();
  const dongDuocPhuHang = new Set();
  let capDuoiNguong = 0;

  for (const rec of activeMap.values()) {
    const tongDongSet = new Set();
    for (const s of rec.byHeading.values()) {
      for (const d of s) tongDongSet.add(d);
    }
    const tongDongCap = tongDongSet.size;
    if (tongDongCap < 2) {
      capDuoiNguong += 1;
      continue;
    }

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

    if (rec.loai === 'hang_model' || rec.loai === 'model') {
      if (rec.byHeading.size === 1) {
        const nhomDuyNhat = cacNhom[0];
        const dongs = nhomDuyNhat.nguon.map((n) => n.dong);
        for (const d of dongs) {
          dongDuocPhu.add(d);
          if (rec.loai === 'hang_model') dongDuocPhuHangModel.add(d);
          else dongDuocPhuModel.add(d);
        }
        bang.push(taoBanGhiC4(rec.loai, rec, nhomDuyNhat.ma, dongs, tepNguon));
      } else {
        const mau = taoBanGhiC4(rec.loai, rec, cacNhom[0].ma, [], tepNguon);
        delete mau.ma;
        delete mau.soDong;
        delete mau.nguon;
        mauThuan.push({
          ...mau,
          tongDong: tongDongCap,
          cacNhom,
        });
      }
      continue;
    }

    // rec.loai === 'hang': v2 chỉ nhận hãng chuyên biệt (soDong >= 4, 100% 1 nhóm, không va chạm biến thể khoảng trắng)
    const ck = gopKhoaHangKhongKhoangTrang(rec.khoaChuan);
    const khongVaChamKhoangTrang = (hangCollapsedHeadings.get(ck)?.size || 0) === 1;
    const nhomChinh = cacNhom[0];
    const nhomNhi = cacNhom[1];
    const doTinhKhiet = Number((nhomChinh.soDong / tongDongCap).toFixed(4));

    if (rec.byHeading.size === 1 && tongDongCap >= NGUONG_HANG_CHUYEN_BIET && khongVaChamKhoangTrang) {
      const dongs = nhomChinh.nguon.map((n) => n.dong);
      for (const d of dongs) {
        dongDuocPhu.add(d);
        dongDuocPhuHang.add(d);
      }
      bang.push(taoBanGhiC4('hang', rec, nhomChinh.ma, dongs, tepNguon));
    } else {
      if (rec.byHeading.size === 1 && tongDongCap < NGUONG_HANG_CHUYEN_BIET) {
        biLocV2.hangDuoiNguongChuyenBiet += 1;
      } else if (rec.byHeading.size === 1 && !khongVaChamKhoangTrang) {
        biLocV2.hangVaChamKhoangTrang += 1;
      }

      const duDieuKienThamKhao = (rec.byHeading.size === 1 && tongDongCap >= 2)
        || (tongDongCap >= 3 && doTinhKhiet >= NGUONG_TINH_KHIET_THAM_KHAO && (!nhomNhi || nhomChinh.soDong > nhomNhi.soDong));
      if (duDieuKienThamKhao) {
        hangThamKhao.push({
          loai: 'hang',
          hang: chonHienThi(rec.displayFreq, rec.khoaChuan),
          khoaChuan: rec.khoaChuan,
          ma: nhomChinh.ma,
          tongDong: tongDongCap,
          soDongNhomChinh: nhomChinh.soDong,
          doTinhKhiet,
          lyDoThamKhao: rec.byHeading.size === 1
            ? (khongVaChamKhoangTrang ? 'hang-nhat-quan-it-dong' : 'hang-va-cham-bien-the-khoang-trang')
            : 'hang-da-so-uu-the',
          chiGoiY: true,
          cacNhom,
        });
      }

      if (rec.byHeading.size > 1) {
        mauThuan.push({
          loai: 'hang',
          hang: chonHienThi(rec.displayFreq, rec.khoaChuan),
          khoaChuan: rec.khoaChuan,
          tongDong: tongDongCap,
          cacNhom,
        });
      }
    }
  }

  const thuTuLoai = { hang_model: 0, model: 1, hang: 2 };
  bang.sort((a, b) => (thuTuLoai[a.loai] - thuTuLoai[b.loai]) || cmpStr(a.khoaChuan, b.khoaChuan) || cmpStr(a.ma, b.ma));
  hangThamKhao.sort((a, b) => cmpStr(a.khoaChuan, b.khoaChuan) || cmpStr(a.ma, b.ma));
  mauThuan.sort((a, b) => (thuTuLoai[a.loai] - thuTuLoai[b.loai]) || cmpStr(a.khoaChuan, b.khoaChuan));

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

  const chapNhanHangModel = bang.filter((x) => x.loai === 'hang_model').length;
  const chapNhanModel = bang.filter((x) => x.loai === 'model').length;
  const chapNhanHang = bang.filter((x) => x.loai === 'hang').length;
  const mauThuanHangModel = mauThuan.filter((x) => x.loai === 'hang_model').length;
  const mauThuanModel = mauThuan.filter((x) => x.loai === 'model').length;
  const mauThuanHang = mauThuan.filter((x) => x.loai === 'hang').length;
  const tkNhatQuanNho = hangThamKhao.filter((x) => x.lyDoThamKhao !== 'hang-da-so-uu-the').length;
  const tkDaSo = hangThamKhao.filter((x) => x.lyDoThamKhao === 'hang-da-so-uu-the').length;
  const tyLe = (num, den) => (den > 0 ? Number(((num / den) * 100).toFixed(2)) : 0);

  const thongKe = {
    tongSoDongGoc,
    soDongBiLoaiCaKin,
    tongSoDong,
    soDongMaHienHanh,
    soDongCoModelHangTho,
    soDongCoModelHangHopLe,
    biLocV2,
    capDuoiNguong,
    capChapNhan: {
      hang_model: chapNhanHangModel,
      model: chapNhanModel,
      hang: chapNhanHang,
      tong: bang.length,
    },
    hangThamKhao: {
      soCap: hangThamKhao.length,
      nhatQuanItDong: tkNhatQuanNho,
      daSoUuThe: tkDaSo,
    },
    capMauThuan: {
      hang_model: mauThuanHangModel,
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
      soDongDuocPhuHangModel: dongDuocPhuHangModel.size,
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
    ghiChu: 'data/tax.json chi chua khoa 8 so; ma 10 so quoc gia va ma het hieu luc khong nam trong tapNut().ma8 nen tach rieng vao maHetHieuLuc.',
  };

  const quyTac = {
    phienBan: PHIEN_BAN_C4,
    soDongToiThieuHangModel: 2,
    soDongToiThieuModel: 2,
    doDaiAlnumToiThieuModelDonLe: DO_DAI_ALNUM_MODEL_DON_LE,
    soDongToiThieuHangChuyenBiet: NGUONG_HANG_CHUYEN_BIET,
    nhatQuanMotNhom4: true,
    haCapHangYeuSangThamKhao: 'hang < 4 dong hoac da so >= 80% (khong phai ten phap nhan/dia danh) tach rieng vao hangThamKhao (chiGoiY: true)',
    tachDanhSach: 'tach theo ; va , (bo qua hau to phap nhan doanh nghiep, so thap phan dau phay va mo ta tieng Viet)',
    chuanKhoa: 'NFC, gop khoang trang, chuan hoa hau to phap nhan, bo dau cau hai dau, in hoa',
    locNhieu: 'loai chuoi < 2 ky tu, tu khoa placeholder, so thuan tuy, kich thuoc/don vi do, thong so chuan (DN/PD/IP), ten may tuong thich, va ten phap nhan/dia danh o hang',
  };

  const bam = sha256(JSON.stringify({
    phienBan: PHIEN_BAN_C4,
    loaiCanh: 'C4',
    nguon: tepNguon,
    loaiCaKin,
    quyTac,
    thongKe,
    bang,
    hangThamKhao,
    mauThuan,
    maHetHieuLuc,
  }));

  return {
    phienBan: PHIEN_BAN_C4,
    loaiCanh: 'C4',
    moTa: 'Bang tra tat dinh C4 ban 2 (hang+model / model / hang chuyen biet -> nhom 4 so HS; hang yeu tach rieng vao hangThamKhao) dung tu data/oz-gold-final.jsonl, doi chieu bieu thue data/tax.json. Chua noi vao duong tim khach hang.',
    cachDungLai: 'node scripts/dung-c4-model-hang.mjs --ghi',
    nguon: tepNguon,
    bieuThue,
    loaiCaKin,
    quyTac,
    bam,
    thongKe,
    bang,
    hangThamKhao,
    mauThuan,
    maHetHieuLuc,
  };
}

/**
 * Tạo chỉ mục tra nhanh O(1) từ mảng `bang` hoặc tài liệu C4 đầy đủ.
 * @param {object|object[]} bangHoacTaiLieu
 */
export function taoChiMucC4(bangHoacTaiLieu) {
  if (
    bangHoacTaiLieu
    && bangHoacTaiLieu.hangModelMap instanceof Map
    && bangHoacTaiLieu.modelMap instanceof Map
    && bangHoacTaiLieu.hangMap instanceof Map
    && bangHoacTaiLieu.hangThamKhaoMap instanceof Map
  ) {
    return bangHoacTaiLieu;
  }
  const ds = Array.isArray(bangHoacTaiLieu)
    ? bangHoacTaiLieu
    : (Array.isArray(bangHoacTaiLieu?.bang) ? bangHoacTaiLieu.bang : []);
  const dsTk = Array.isArray(bangHoacTaiLieu?.hangThamKhao) ? bangHoacTaiLieu.hangThamKhao : [];
  const hangModelMap = new Map();
  const modelMap = new Map();
  const hangMap = new Map();
  const hangThamKhaoMap = new Map();
  for (const m of ds) {
    if (!m || !m.khoaChuan) continue;
    if (m.loai === 'hang_model') hangModelMap.set(m.khoaChuan, m);
    else if (m.loai === 'model') modelMap.set(m.khoaChuan, m);
    else if (m.loai === 'hang') hangMap.set(m.khoaChuan, m);
  }
  for (const t of dsTk) {
    if (!t || !t.khoaChuan) continue;
    hangThamKhaoMap.set(t.khoaChuan, t);
  }
  return { hangModelMap, modelMap, hangMap, hangThamKhaoMap };
}

/**
 * Tra cứu nhóm 4 số trong bảng C4 từ đầu vào `{ models, brands }` hoặc chuỗi đơn.
 * Ưu tiên tuyệt đối: `hang_model` -> `model` -> `hang` chuyên biệt (`bang`).
 * Tín hiệu phụ `hangThamKhao` được trả riêng ở `thamKhao[]`, KHÔNG trộn vào `timThay` / `ma`.
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
      if (laNhieuModelHang(p, 'model')) continue;
      const k = chuanKhoaModel(p);
      if (!laThongSoHoacMoTaModel(k)) khoaModels.add(k);
    }
  }
  const khoaBrands = new Set();
  for (const r of rawBrands) {
    for (const p of tachGiaTriModelHang(r, 'hang')) {
      if (laNhieuModelHang(p, 'hang')) continue;
      const k = chuanKhoaModel(p);
      if (!laTenCongTyHoacDiaDanhHang(k)) khoaBrands.add(k);
    }
  }

  const modelsDuManh = [...khoaModels].filter((k) => demChuSo(k) >= DO_DAI_ALNUM_MODEL_DON_LE);
  const hangsDuManh = [...khoaBrands].filter((k) => demChuSo(k) >= DO_DAI_ALNUM_HANG);
  const khoaPairs = new Set();
  for (const b of khoaBrands) {
    for (const m of khoaModels) {
      khoaPairs.add(`${b} | ${m}`);
    }
  }

  const soKhoaHopLe = khoaPairs.size + modelsDuManh.length + hangsDuManh.length;
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
      thamKhao: [],
      nhatQuan: true,
      soKhoaHopLe: 0,
    };
  }

  const khop = [];
  for (const k of khoaPairs) {
    const e = idx.hangModelMap.get(k);
    if (e) khop.push(e);
  }
  for (const k of modelsDuManh) {
    const e = idx.modelMap.get(k);
    if (e) khop.push(e);
  }
  for (const k of hangsDuManh) {
    const e = idx.hangMap.get(k);
    if (e) khop.push(e);
  }

  const prio = { hang_model: 0, model: 1, hang: 2 };
  khop.sort((a, b) => (prio[a.loai] - prio[b.loai])
    || (b.soDong - a.soDong)
    || cmpStr(a.khoaChuan, b.khoaChuan));

  const thamKhao = [];
  for (const k of hangsDuManh) {
    const t = idx.hangThamKhaoMap.get(k);
    if (t) thamKhao.push(t);
  }
  thamKhao.sort((a, b) => (b.doTinhKhiet - a.doTinhKhiet)
    || (b.tongDong - a.tongDong)
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
      thamKhao,
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
    thamKhao,
    nhatQuan: tapNhom.size === 1,
    soKhoaHopLe,
  };
}

/**
 * Đánh giá bảng C4 sạch ca kín (dựng trong RAM với `loaiCaKin: true`) trên `scripts/ca-do/de-rieng-300.jsonl`.
 * Báo cáo tách riêng kết quả bảng tra chính (`bang`) và tín hiệu phụ `hangThamKhao`.
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
    hang_model: { phu: 0, dung: 0, sai: 0 },
    model: { phu: 0, dung: 0, sai: 0 },
    hang: { phu: 0, dung: 0, sai: 0 },
  };
  const chiTietKhongChuaTenHang = [];

  let tkPhu = 0;
  let tkDung = 0;
  let tkSai = 0;
  const tkChiTiet = [];

  for (const ca of ca300) {
    const mb = theoKhoaNoiDung.get(khoaNoiDung(ca));
    if (!mb) caKhongTimThayKhoa += 1;
    const kq = traC4(mb || { models: [], brands: [] }, chiMuc);
    if (kq.soKhoaHopLe > 0) caCoModelHangHopLe += 1;
    const maDungNhom4 = so(ca.maDung).slice(0, 4);

    if (kq.timThay) {
      soCaDuocPhu += 1;
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
    } else if (kq.thamKhao.length > 0) {
      const topTk = kq.thamKhao[0];
      tkPhu += 1;
      const dung = topTk.ma === maDungNhom4;
      if (dung) tkDung += 1;
      else tkSai += 1;
      tkChiTiet.push({
        nguonDong: ca.nguonDong,
        maDungNhom4,
        maDuDoan: topTk.ma,
        khoaChuan: topTk.khoaChuan,
        tongDong: topTk.tongDong,
        doTinhKhiet: topTk.doTinhKhiet,
        lyDoThamKhao: topTk.lyDoThamKhao,
        dung,
      });
    }
  }

  const tyLe = (num, den) => (den > 0 ? Number(((num / den) * 100).toFixed(2)) : 0);
  return {
    phienBan: PHIEN_BAN_C4,
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
    thamKhao: {
      soCaCoGoiY: tkPhu,
      soCaDungNhom4: tkDung,
      soCaSaiNhom4: tkSai,
      doChinhXacPhanTram: tyLe(tkDung, tkPhu),
      chiTietKhongChuaTenHang: tkChiTiet,
    },
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
