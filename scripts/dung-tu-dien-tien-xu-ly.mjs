#!/usr/bin/env node
/**
 * scripts/dung-tu-dien-tien-xu-ly.mjs — Dựng từ điển tiền xử lý câu hỏi T-4 (#1596).
 *
 * Tất định, không AI, không mạng, không dấu thời gian (2 lần dựng ra cùng sha256).
 * Nguồn:
 *   - data/tax.json
 *   - data/oz-gold-final.jsonl (bỏ dòng thuộc tập ca kín khi --loai-ca-kin)
 *   - data/precedents.json
 *   - data/trade-synonyms.json
 *   - data/vn-product-synonyms.json
 *   - data/hs-aliases.json
 *   - data/tu-vung/tu-vung@2.json
 *   - data/brand-product-map.json
 *   - data/do-thi/c4-model-hang.json (hoặc dựng sạch S-7 từ dungBangC4({ loaiCaKin: true }))
 *   - data/taxonomy/*.json (chuẩn hoá từ vựng chất liệu)
 *
 * Dùng:
 *   node scripts/dung-tu-dien-tien-xu-ly.mjs --ghi
 *   node scripts/dung-tu-dien-tien-xu-ly.mjs --loai-ca-kin --ra=/tmp/tu-dien-sach.json
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chuanTen, laCaKin, taiDanhSachLoai } from './dung-bo-thu-de-rieng.mjs';
import { dungBangC4, laNhieuModelHang } from './dung-c4-model-hang.mjs';

const require = createRequire(import.meta.url);
const { dataReadPath } = require('../lib/data-paths.js');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEP_MAC_DINH_RA = path.join(ROOT, 'data', 'tu-dien-tien-xu-ly.json');
const TAXONOMY_FILES = ['polymers', 'woods', 'fibers', 'chemicals', 'metals', 'rubbers', 'textiles'];

const cmpStr = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

export const boDau = (s) => String(s ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/gi, 'd');

export const chuanChu = (s) => String(s ?? '')
  .normalize('NFC')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

export function tachTu(s) {
  return chuanChu(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

const coDauTiengViet = (s) => /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/iu.test(String(s || ''));
const laChuLatin = (s) => /^[a-z]+$/.test(s);

/** Bảng viết tắt XNK chuẩn hoá (không đụng "da", "in", "co", "lo", "bo"). */
export const VIET_TAT_CO_BAN = Object.freeze({
  ac: 'AC',
  bhld: 'bảo hộ lao động',
  'bhlđ': 'bảo hộ lao động',
  cl: 'chất liệu',
  cs: 'công suất',
  'd/c': 'địa chỉ',
  'đ/c': 'địa chỉ',
  'd/k': 'đường kính',
  'đ/k': 'đường kính',
  'đ.a': 'điện áp',
  'đ.áp': 'điện áp',
  dc: 'động cơ',
  'đc': 'động cơ',
  dhkk: 'điều hòa không khí',
  'đhkk': 'điều hòa không khí',
  dk: 'điều khiển',
  'đk': 'đường kính',
  dt: 'điện thoại',
  'đt': 'điện thoại',
  'đa': 'điện áp',
  'k/t': 'kích thước',
  kcn: 'khu công nghiệp',
  kt: 'kích thước',
  lk: 'linh kiện',
  nsx: 'nhà sản xuất',
  pccc: 'phòng cháy chữa cháy',
  pk: 'phụ kiện',
  pt: 'phụ tùng',
  sp: 'sản phẩm',
  sx: 'sản xuất',
  tb: 'thiết bị',
  tbd: 'thiết bị điện',
  'tbđ': 'thiết bị điện',
  tbyt: 'thiết bị y tế',
  vpp: 'văn phòng phẩm',
});

const BOI_CANH_MAU_CO_BAN = [
  'tập gym',
  'tập thể hình',
  'tập thể dục',
  'tập yoga',
  'thể thao',
  'gia đình',
  'dân dụng',
  'văn phòng',
  'công nghiệp',
  'nhà xưởng',
  'nhà bếp',
  'phòng ngủ',
  'phòng khách',
  'phòng tắm',
  'nhà vệ sinh',
  'nhà hàng',
  'khách sạn',
  'siêu thị',
  'trường học',
  'y tế',
  'bệnh viện',
  'phòng thí nghiệm',
  'trẻ em',
  'em bé',
  'người lớn',
  'học sinh',
  'ô tô',
  'xe hơi',
  'xe máy',
  'xe đạp',
  'xe tải',
  'xe điện',
  'điện thoại',
  'máy tính',
  'laptop',
  'xây dựng',
  'nông nghiệp',
  'thủy sản',
  'may mặc',
  'đóng gói',
  'trang trí',
  'chiếu sáng',
  'ngoài trời',
  'trong nhà',
  'bảo hộ lao động',
];

const CHAT_LIEU_BO_SUNG = [
  'nhựa', 'nhựa pvc', 'nhựa abs', 'nhựa pp', 'nhựa pe', 'nhựa pu', 'nhựa eva', 'nhựa pet', 'nhựa pom',
  'nhựa hdpe', 'nhựa ldpe', 'nhựa tổng hợp', 'nhựa acrylic', 'nhựa polycarbonate', 'nhựa silicone', 'plastic',
  'thép', 'thép không gỉ', 'thép hợp kim', 'thép carbon', 'thép mạ kẽm', 'inox', 'inox 304', 'inox 316', 'inox 201',
  'sắt', 'sắt mạ', 'gang', 'hợp kim gang', 'nhôm', 'hợp kim nhôm', 'đồng', 'đồng thau', 'hợp kim đồng',
  'kẽm', 'hợp kim kẽm', 'titan', 'niken', 'thiếc', 'chì', 'kim loại', 'hợp kim',
  'vải', 'vải nylon', 'vải cotton', 'vải polyester', 'vải không dệt', 'vải dệt kim', 'vải dệt thoi', 'vải bố',
  'nylon', 'nilon', 'polyester', 'cotton', 'sợi tổng hợp', 'sợi nhân tạo', 'sợi thủy tinh', 'sợi carbon',
  'cao su', 'cao su lưu hóa', 'cao su tổng hợp', 'cao su tự nhiên', 'silicone', 'silicon',
  'da', 'da pu', 'da thật', 'da bò', 'da tổng hợp', 'giả da',
  'gỗ', 'gỗ công nghiệp', 'gỗ dán', 'gỗ tự nhiên', 'gỗ ép', 'mdf', 'plywood', 'tre', 'mây',
  'giấy', 'giấy carton', 'giấy kraft', 'bìa cứng', 'carton',
  'thủy tinh', 'kính', 'pha lê', 'gốm', 'sứ', 'gốm sứ', 'đá', 'đá tự nhiên', 'đá nhân tạo',
  'xốp', 'bọt biển', 'bê tông', 'xi măng', 'ptfe', 'teflon', 'mica', 'graphite', 'carbon',
];

const CHAT_LIEU_NHIEU = new Set([
  'không', 'khác', 'loại khác', 'nhiều loại', 'hỗn hợp', 'tổng hợp', 'không rõ', 'chưa rõ', 'n/a', 'null', 'none',
]);
const RE_CONG_TY = /\b(?:co\s*[.,]*\s*(?:ltd|limited)|ltd|inc|corp|llc|company|limited|corporation|gmbh|tnhh|cổ\s*phần)\b|coltd|有限公司|贸易有限/iu;
const RE_CONG_TY_BRAND = /(?:^|[\s.,&/(\-])(?:co\.?(?=$|[\s,.)\-])|ltd\.?|limited|inc\.?|corp\.?|llc|company|corporation|gmbh|tnhh|cổ\s*phần|trading|trade|factory|imp\s*&\s*exp|import|export|machinery|electronics|technology|industrial|manufactur\w*|enterprise|group|holding|plastic\s+products|sanitary|commodities|shenzhen|guangzhou|ningbo|shanghai|dongguan|wenzhou|taizhou|foshan|zhejiang|guangxi|suzhou|xiamen|wuhan|jinan|taiyuan|yiwu|cixi|qingyun|enping|hebei|yongkang|jinyun|wangdu|hangzhou|jianhu|yuyao|zhengzhou|hammy|haomi|hengyuntong|zhenda|juchao)(?=$|[\s.,&/)\-])|coltd|有限公司|贸易|工厂|科技|实业/iu;
const RE_CAT_NSX_SPEC = /(?:^|[\s,;.\-/])(?:nsx|nhà\s*sản\s*xuất|nha\s*san\s*xuat|nhà\s*sx|nha\s*sx|hãng\s*sản\s*xuất|hãng\s*sx|hang\s*sx|manufacturer|mfg)(?=$|[\s:;.\-/]).*$/iu;
const RE_NHIEU_SPEC_CTY = /(?:^|[\s,;.\-/])(?:ltd|co\s*[.,]|trading|machinery|electronics|technology|lighting|factory|imp\s*&\s*exp|manufactur\w*|shenzhen|guangzhou|ningbo|shanghai|dongguan|wenzhou|hangzhou)(?=$|[\s,;.\-/])/iu;

function laTenCongTyBrand(s) {
  const t = String(s || '').trim();
  return !t || RE_CONG_TY.test(t) || RE_CONG_TY_BRAND.test(t);
}

const TU_NHIEU_NGU_LIEU_SET = new Set([
  'nsx', 'ltd', 'coltd', 'inc', 'corp', 'llc', 'gmbh', 'tnhh',
  'ningbo', 'guangzhou', 'shenzhen', 'dongguan', 'shanghai', 'wenzhou', 'taizhou', 'hangzhou', 'foshan', 'zhejiang',
  'hammy', 'hengyuntong', 'ght', 'zhenda', 'haomi', 'juchao',
]);

/** Cắt sạch đuôi NSX / tên công ty khỏi thông số kỹ thuật trước khi nạp ngữ liệu. */
export function lamSachSpecNguon(sp) {
  const raw = String(sp || '').normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!raw) return '';
  let cut = raw.replace(RE_CAT_NSX_SPEC, '').replace(/[\s,;.\-/]+$/g, '').trim();
  if (!cut) return '';
  if (RE_CONG_TY.test(cut) || RE_NHIEU_SPEC_CTY.test(cut)) return '';
  return cut;
}

function lamSachTenTienLe(s) {
  return String(s || '')
    .normalize('NFC')
    .replace(RE_CAT_NSX_SPEC, '')
    .replace(/\b(?:[A-Za-z0-9\-&]+\s+)*(?:co\.?\s*,?\s*ltd\.?|ltd\.?\s*,?\s*co\.?|trading\s+co\.?)\b\.?/giu, ' ')
    .replace(/\(\s*(?:ningbo|guangzhou|shenzhen|shanghai|dongguan|wenzhou|hangzhou)\s*\)/giu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function lamSachChatLieu(raw) {
  let cl = chuanChu(raw).replace(/^\d+(?:[.,]\d+)?\s*%+\s*/u, '').trim();
  cl = cl.replace(/^[\s.,;:'"-]+|[\s.,;:'"-]+$/g, '').trim();
  if (cl.includes('(') && !cl.includes(')')) cl = cl.split('(')[0].trim();
  if (cl.includes(')') && !cl.includes('(')) cl = cl.replace(/\)/g, '').trim();
  if (!cl || cl.length < 2 || cl.length > 40) return '';
  if (CHAT_LIEU_NHIEU.has(cl)) return '';
  if (/^\d+(?:[.,]\d+)?%?$/.test(cl) || /\d{4,}/.test(cl)) return '';
  if (!/\p{L}{2}/u.test(cl)) return '';
  return cl;
}

function sortObj(entries) {
  const out = {};
  for (const [k, v] of [...entries].sort((a, b) => cmpStr(a[0], b[0]))) {
    out[k] = v;
  }
  return out;
}

function docJsonSafe(rel) {
  const p = dataReadPath(rel);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function docOzGold(ozLinesOpt) {
  if (Array.isArray(ozLinesOpt)) {
    return ozLinesOpt.map((x) => (typeof x === 'string' ? JSON.parse(x) : x));
  }
  const p = dataReadPath('oz-gold-final.jsonl');
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim().length > 0).map((l) => JSON.parse(l));
}

function themCauVi(viTexts, s, w) {
  const t = String(s || '').normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!t || !coDauTiengViet(t)) return;
  viTexts.push({ s: t, w });
}

function themCauEn(enTexts, s, w) {
  const t = String(s || '').normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!t) return;
  enTexts.push({ s: t, w });
}

function thuThapTuAnh(enTexts, vnPlainKeys) {
  const enFreq = new Map();
  for (const { s, w } of enTexts) {
    for (const rawTok of chuanChu(s).split(/[^a-z]+/)) {
      if (rawTok.length < 3 || rawTok.length > 22) continue;
      if (!/^[a-z]+$/.test(rawTok) || TU_NHIEU_NGU_LIEU_SET.has(rawTok)) continue;
      enFreq.set(rawTok, (enFreq.get(rawTok) || 0) + w);
    }
  }
  const out = [];
  for (const [tok, freq] of enFreq) {
    // Giữ các từ tiếng Anh có tần suất >= 2 hoặc không trùng hoàn toàn âm tiết Việt thuần.
    if (freq >= 2 || !vnPlainKeys.has(tok)) out.push(tok);
  }
  return out.sort(cmpStr);
}

/**
 * Dựng toàn bộ cấu trúc từ điển tiền xử lý trong RAM (thuần, tất định).
 * @param {object} [opts]
 * @param {boolean} [opts.loaiCaKin=false]
 * @param {object} [opts.danhSachLoai]
 */
export function dungTuDien(opts = {}) {
  const loaiCaKin = Boolean(opts.loaiCaKin);
  const dsLoai = loaiCaKin ? (opts.danhSachLoai || taiDanhSachLoai()) : null;

  const taxData = opts.taxData || docJsonSafe('tax.json') || {};
  const ozRowsAll = docOzGold(opts.ozLines);
  const precedents = opts.precedents || docJsonSafe('precedents.json') || {};
  const tradeSyn = opts.tradeSynonyms || docJsonSafe('trade-synonyms.json') || {};
  const vnSyn = opts.vnSynonyms || docJsonSafe('vn-product-synonyms.json') || {};
  const hsAliases = opts.hsAliases || docJsonSafe('hs-aliases.json') || {};
  const tuVung2 = opts.tuVung2 || docJsonSafe('tu-vung/tu-vung@2.json') || {};
  const brandMap = opts.brandMap || docJsonSafe('brand-product-map.json') || {};
  const englishMap = opts.englishMap || docJsonSafe('english-product-map.json') || {};

  const c4Data = opts.c4Data || (
    loaiCaKin
      ? dungBangC4({ loaiCaKin: true, danhSachLoai: dsLoai, ozLines: ozRowsAll, taxData })
      : (docJsonSafe('do-thi/c4-model-hang.json') || dungBangC4({ loaiCaKin: false, ozLines: ozRowsAll, taxData }))
  );

  const viTexts = [];
  const enTexts = [];
  const taxVocab = new Set();
  const chatLieuSet = new Set(CHAT_LIEU_BO_SUNG.map(chuanChu));
  const boiCanhCounts = new Map();
  const brandSet = new Set();
  const modelSet = new Set();

  // 1. data/tax.json
  for (const v of Object.values(taxData)) {
    const vn = String(v?.vn || '').replace(/^[-\s–]+/, '').trim();
    if (vn) {
      themCauVi(viTexts, vn, 2);
      for (const w of tachTu(vn)) {
        if (w.length >= 2 && w.length <= 24 && !/^\d+$/.test(w)) taxVocab.add(w);
      }
    }
    const en = String(v?.en || '').trim();
    if (en) themCauEn(enTexts, en, 1);
  }

  // 2. data/oz-gold-final.jsonl (tuyệt đối không đọc sampleDesc để tránh tên công ty/PII; loại ca kín khi --loai-ca-kin)
  let soDongOzLoai = 0;
  for (const r of ozRowsAll) {
    if (loaiCaKin && laCaKin(r, dsLoai)) {
      soDongOzLoai += 1;
      continue;
    }
    if (r.tenHang) themCauVi(viTexts, r.tenHang, 3);
    if (r.chatLieu) {
      themCauVi(viTexts, r.chatLieu, 2);
      for (const part of String(r.chatLieu).split(/[,;+/]+/)) {
        const cl = lamSachChatLieu(part);
        if (cl) chatLieuSet.add(cl);
      }
    }
    if (r.congDung) {
      themCauVi(viTexts, r.congDung, 1);
      const cd = chuanChu(r.congDung);
      for (const m of cd.matchAll(/(?:dùng\s+(?:cho|để|trong)|chuyên\s+dùng\s+(?:cho|trong)|phục\s+vụ(?:\s+cho)?|tập)\s+([\p{L}\p{N}\s-]{3,35}?)(?=[,.;()\n]|$)/gu)) {
        const cum = m[0].replace(/\s+/g, ' ').trim();
        if (cum.length >= 5 && cum.length <= 45 && !/\d{4,}/.test(cum) && !laTenCongTyBrand(cum)) {
          boiCanhCounts.set(cum, (boiCanhCounts.get(cum) || 0) + 1);
        }
      }
    }
    for (const sp of Array.isArray(r.specs) ? r.specs : []) {
      const spSach = lamSachSpecNguon(sp);
      if (spSach) themCauVi(viTexts, spSach, 1);
    }
    for (const b of Array.isArray(r.brands) ? r.brands : []) {
      const cleanB = String(b || '').normalize('NFC').trim();
      if (cleanB && !laNhieuModelHang(cleanB, 'hang') && !laTenCongTyBrand(cleanB) && cleanB.length <= 32) {
        brandSet.add(cleanB);
      }
    }
  }

  // 3. data/precedents.json
  for (const list of Object.values(precedents)) {
    if (!Array.isArray(list)) continue;
    for (const p of list) {
      const name = lamSachTenTienLe(p?.productName || '');
      const desc = lamSachTenTienLe(p?.description || '');
      if (p?.country && p.country !== 'VN') {
        if (name) themCauEn(enTexts, name, 1);
        continue;
      }
      if (name) themCauVi(viTexts, name, 2);
      if (desc && desc !== name) themCauVi(viTexts, desc.slice(0, 300), 1);
    }
  }

  // 4. data/trade-synonyms.json
  for (const e of tradeSyn.entries || []) {
    if (e?.titleVi) {
      themCauVi(viTexts, e.titleVi, 3);
      for (const w of tachTu(e.titleVi)) if (w.length >= 2) taxVocab.add(w);
    }
    if (e?.whenVi) themCauVi(viTexts, e.whenVi, 1);
    for (const t of e?.terms || []) {
      if (coDauTiengViet(t)) {
        themCauVi(viTexts, t, 3);
        for (const w of tachTu(t)) if (w.length >= 2) taxVocab.add(w);
      } else {
        themCauEn(enTexts, t, 2);
      }
    }
  }

  // 5. data/vn-product-synonyms.json
  for (const [k, arr] of Object.entries(vnSyn)) {
    if (coDauTiengViet(k)) {
      themCauVi(viTexts, k, 3);
      for (const w of tachTu(k)) if (w.length >= 2) taxVocab.add(w);
    }
    for (const x of Array.isArray(arr) ? arr : []) {
      if (/^\d+$/.test(String(x))) continue;
      if (coDauTiengViet(x)) {
        themCauVi(viTexts, x, 2);
        for (const w of tachTu(x)) if (w.length >= 2) taxVocab.add(w);
      } else {
        themCauEn(enTexts, x, 1);
      }
    }
  }

  // 6. data/hs-aliases.json (lấy materialWords/rawFormTokens + từ kỹ thuật không phải tập ca kín)
  const hsAliasWords = new Map();
  for (const m of hsAliases?.meta?.materialWords || []) {
    const cl = chuanChu(m);
    if (cl) chatLieuSet.add(cl);
    themCauVi(viTexts, m, 2);
  }
  for (const rf of hsAliases?.meta?.rawFormTokens || []) {
    themCauVi(viTexts, rf, 2);
  }
  for (const a of Array.isArray(hsAliases?.aliases) ? hsAliases.aliases : []) {
    const ph = String(a?.phrase || '').trim();
    if (!ph) continue;
    if (loaiCaKin && dsLoai && dsLoai.tenChuanSet.has(chuanTen(ph))) continue;
    for (const w of tachTu(ph)) {
      if (/^[a-z]{3,20}$/.test(w)) hsAliasWords.set(w, (hsAliasWords.get(w) || 0) + 1);
    }
  }

  // 7. data/tu-vung/tu-vung@2.json
  for (const k of Array.isArray(tuVung2?.khoa) ? tuVung2.khoa : []) {
    if (k?.nhanVi) themCauVi(viTexts, k.nhanVi, 3);
    if (k?.nhanEn) themCauEn(enTexts, k.nhanEn, 2);
    for (const vi of k?.cachDoc?.vi || []) {
      themCauVi(viTexts, vi, 3);
      for (const w of tachTu(vi)) if (w.length >= 2) taxVocab.add(w);
    }
    for (const en of k?.cachDoc?.en || []) themCauEn(enTexts, en, 2);
  }
  for (const list of Object.values(tuVung2?.tenKhac || {})) {
    for (const item of Array.isArray(list) ? list : []) {
      if (item?.giaTri) themCauVi(viTexts, item.giaTri, 2);
      for (const vi of item?.cachDoc?.vi || []) themCauVi(viTexts, vi, 2);
      for (const en of item?.cachDoc?.en || []) themCauEn(enTexts, en, 1);
    }
  }

  // 8. data/brand-product-map.json + data/english-product-map.json + data/taxonomy/*.json
  for (const [brand, cats] of Object.entries(brandMap)) {
    const cleanB = String(brand || '').trim();
    if (cleanB && !laNhieuModelHang(cleanB, 'hang') && !laTenCongTyBrand(cleanB)) brandSet.add(cleanB);
    for (const c of Array.isArray(cats) ? cats : []) themCauVi(viTexts, c, 2);
  }
  for (const [enKey, vnList] of Object.entries(englishMap)) {
    themCauEn(enTexts, enKey, 2);
    for (const v of Array.isArray(vnList) ? vnList : []) themCauVi(viTexts, v, 2);
  }
  for (const tf of TAXONOMY_FILES) {
    const tdata = docJsonSafe(`taxonomy/${tf}.json`);
    if (!tdata) continue;
    for (const [k, meta] of Object.entries(tdata)) {
      if (meta?.nameVi) {
        const nv = lamSachChatLieu(meta.nameVi);
        if (nv) chatLieuSet.add(nv);
        themCauVi(viTexts, meta.nameVi, 2);
      }
      if (/^[a-zA-Z0-9\s-]{2,24}$/.test(k) && !/\d{4,}/.test(k)) {
        themCauEn(enTexts, k, 2);
      }
    }
  }

  // 9. data/do-thi/c4-model-hang.json (hoặc bản dựng sạch S-7)
  for (const e of c4Data?.bang || []) {
    if (e.loai === 'hang' && e.hang && !laTenCongTyBrand(e.hang)) brandSet.add(e.hang);
    if (e.loai === 'model' && e.model && !laTenCongTyBrand(e.model)) modelSet.add(e.model);
  }

  // ── Đếm tần suất từ đơn, cặp 2 từ, cặp 3 từ trên ngữ liệu tiếng Việt có dấu ──
  const uniFreq = new Map();   // plain -> Map<accented, weightSum>
  const biFreq = new Map();    // "p1 p2" -> Map<"a1 a2", weightSum>
  const triFreq = new Map();   // "p1 p2 p3" -> Map<"a1 a2 a3", weightSum>
  const vocabFreq = new Map(); // accentedOrTech -> weightSum

  for (const { s, w } of viTexts) {
    const words = tachTu(s);
    const plains = words.map(boDau);
    for (let i = 0; i < words.length; i += 1) {
      const a = words[i];
      const p = plains[i];
      if (!laChuLatin(p) || p.length > 22 || TU_NHIEU_NGU_LIEU_SET.has(p)) continue;
      if (a.length >= 2) vocabFreq.set(a, (vocabFreq.get(a) || 0) + w);
      if (!uniFreq.has(p)) uniFreq.set(p, new Map());
      const um = uniFreq.get(p);
      um.set(a, (um.get(a) || 0) + w);

      if (i > 0 && laChuLatin(plains[i - 1]) && plains[i - 1].length <= 22 && !TU_NHIEU_NGU_LIEU_SET.has(plains[i - 1])) {
        const bk = `${plains[i - 1]} ${p}`;
        const baVal = `${words[i - 1]} ${a}`;
        if (!biFreq.has(bk)) biFreq.set(bk, new Map());
        const bm = biFreq.get(bk);
        bm.set(baVal, (bm.get(baVal) || 0) + w);

        if (i > 1 && laChuLatin(plains[i - 2]) && plains[i - 2].length <= 22 && !TU_NHIEU_NGU_LIEU_SET.has(plains[i - 2])) {
          const tk = `${plains[i - 2]} ${bk}`;
          const taVal = `${words[i - 2]} ${baVal}`;
          if (!triFreq.has(tk)) triFreq.set(tk, new Map());
          const tm = triFreq.get(tk);
          tm.set(taVal, (tm.get(taVal) || 0) + w);
        }
      }
    }
  }

  // Từ đơn (don): lấy dạng có dấu phổ biến nhất cho mỗi âm tiết không dấu
  const donEntries = [];
  for (const [p, m] of uniFreq) {
    const sorted = [...m.entries()].sort((a, b) => (b[1] - a[1]) || cmpStr(a[0], b[0]));
    if (sorted[0][1] >= 2 || taxVocab.has(sorted[0][0])) {
      donEntries.push([p, sorted[0][0]]);
    }
  }
  const don = sortObj(donEntries);

  // Từ đôi (doi): chỉ lưu bigram khi cặp phổ biến nhất KHÁC [don[w1], don[w2]]
  const doiEntries = [];
  for (const [bk, m] of biFreq) {
    const sorted = [...m.entries()].sort((a, b) => (b[1] - a[1]) || cmpStr(a[0], b[0]));
    const [topPair, cnt] = sorted[0];
    if (cnt < 3) continue;
    const [p1, p2] = bk.split(' ');
    const defPair = `${don[p1] || p1} ${don[p2] || p2}`;
    if (topPair !== defPair) doiEntries.push([bk, topPair]);
  }
  const doi = sortObj(doiEntries);

  // Ngoại lệ 3 từ (ba): lưu trigram khi khác dự đoán bigram HOẶC khi b1/b2 xung đột ở từ giữa (vd "bộ câu" vs "cầu chì").
  const baEntries = [];
  for (const [tk, m] of triFreq) {
    const sorted = [...m.entries()].sort((a, b) => (b[1] - a[1]) || cmpStr(a[0], b[0]));
    const [topTri, cnt] = sorted[0];
    const [p1, p2, p3] = tk.split(' ');
    const b1 = doi[`${p1} ${p2}`];
    const b2 = doi[`${p2} ${p3}`];
    const bClash = Boolean(b1 && b2 && b1.split(' ')[1] !== b2.split(' ')[0]);
    if (cnt < (bClash ? 3 : 4)) continue;
    const pred = [
      b1 ? b1.split(' ')[0] : (don[p1] || p1),
      b1 ? b1.split(' ')[1] : (b2 ? b2.split(' ')[0] : (don[p2] || p2)),
      b2 ? b2.split(' ')[1] : (don[p3] || p3),
    ].join(' ');
    if (topTri !== pred || bClash) baEntries.push([tk, topTri]);
  }
  const ba = sortObj(baEntries);

  // Từ vựng tiếng Anh & bổ sung vào tuVung
  const tuAnh = thuThapTuAnh(enTexts, new Set(Object.keys(don)));
  for (const { s, w } of enTexts) {
    for (const rawTok of chuanChu(s).split(/[^a-z]+/)) {
      if (rawTok.length < 3 || rawTok.length > 22 || TU_NHIEU_NGU_LIEU_SET.has(rawTok)) continue;
      if (!don[rawTok] && w >= 2) {
        vocabFreq.set(rawTok, (vocabFreq.get(rawTok) || 0) + w);
      }
    }
  }
  for (const [w, c] of hsAliasWords) {
    if (c >= 3 && !don[w] && !TU_NHIEU_NGU_LIEU_SET.has(w)) vocabFreq.set(w, (vocabFreq.get(w) || 0) + c);
  }

  const tuVungEntries = [];
  for (const [tok, freq] of vocabFreq) {
    if (tok.length < 2 || tok.length > 24) continue;
    if (freq >= 2 || taxVocab.has(tok)) {
      tuVungEntries.push([tok, freq]);
    }
  }
  const tuVung = sortObj(tuVungEntries);

  // Bối cảnh mẫu: hợp nhất danh sách chuẩn + cụm hay gặp trong congDung (>= 3 lần)
  const boiCanhSet = new Set(BOI_CANH_MAU_CO_BAN.map(chuanChu));
  for (const [cum, cnt] of boiCanhCounts) {
    if (cnt >= 3 && coDauTiengViet(cum)) boiCanhSet.add(cum);
  }
  const boiCanhMau = [...boiCanhSet].sort(cmpStr);
  const chatLieu = [...chatLieuSet].filter(Boolean).sort(cmpStr);

  // Chuẩn hoá danh sách hãng / model (bỏ nhiễu và giữ ổn định)
  const brandNormMap = new Map();
  for (const b of brandSet) {
    const key = chuanChu(b);
    if (key.length < 2 || laNhieuModelHang(b, 'hang') || laTenCongTyBrand(b)) continue;
    if (!brandNormMap.has(key)) brandNormMap.set(key, b);
  }
  const brands = [...brandNormMap.values()].sort(cmpStr);

  const modelNormMap = new Map();
  for (const m of modelSet) {
    const key = chuanChu(m);
    if (key.length < 2 || laNhieuModelHang(m, 'model') || laTenCongTyBrand(m)) continue;
    if (!modelNormMap.has(key)) modelNormMap.set(key, m);
  }
  const models = [...modelNormMap.values()].sort(cmpStr);

  const vietTat = sortObj(Object.entries(VIET_TAT_CO_BAN));

  return {
    phienBan: 1,
    loaiCaKin,
    thongKe: {
      soDon: Object.keys(don).length,
      soDoi: Object.keys(doi).length,
      soBa: Object.keys(ba).length,
      soTuVung: Object.keys(tuVung).length,
      soTuAnh: tuAnh.length,
      soVietTat: Object.keys(vietTat).length,
      soChatLieu: chatLieu.length,
      soBoiCanhMau: boiCanhMau.length,
      soHang: brands.length,
      soModel: models.length,
      soDongOzLoai,
    },
    don,
    doi,
    ba,
    tuVung,
    tuAnh,
    vietTat,
    chatLieu,
    boiCanhMau,
    hang: {
      brands,
      models,
    },
  };
}

function chayCli() {
  const args = process.argv.slice(2);
  const argVal = (n, d = null) => {
    const a = args.find((x) => x === `--${n}` || x.startsWith(`--${n}=`));
    return a ? (a.includes('=') ? a.slice(n.length + 3) : true) : d;
  };
  const ghi = Boolean(argVal('ghi', false));
  const ra = argVal('ra', null);
  const loaiCaKin = Boolean(argVal('loai-ca-kin', false));

  const dict = dungTuDien({ loaiCaKin });
  const buf = Buffer.from(`${JSON.stringify(dict)}\n`, 'utf8');
  const out = {
    loaiCaKin: dict.loaiCaKin,
    bytes: buf.length,
    sha256: sha256(buf),
    thongKe: dict.thongKe,
  };

  if (ghi || ra) {
    const dest = path.resolve(typeof ra === 'string' ? ra : TEP_MAC_DINH_RA);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    out.tep = path.relative(ROOT, dest) || dest;
  }
  console.log(JSON.stringify(out, null, 2));
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
  chayCli();
}
