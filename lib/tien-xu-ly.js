// lib/tien-xu-ly.js — Tiền xử lý câu hỏi T-4 (#1596), tất định, không AI, không mạng (< 5 ms).
//
// Luật L4 (test-dau-noi.mjs): module này CHỈ được đọc data/tu-dien-tien-xu-ly.json.
// Tuyệt đối KHÔNG require lib/so-tay*, lib/precedent*, lib/do-thi/dung-bang-canh.js
// hay đọc data/so-tay/, data/ho-so/ranh-gioi/, data/precedents.json, data/oz-gold-final.jsonl.

const fs = require('fs');
const { dataReadPath } = require('./data-paths');

const CHU_HAN = /[\u4e00-\u9fff]/;
const CO_DAU_VI = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/iu;
const THANH_DIEU_RE = /[\u0300\u0301\u0303\u0309\u0323]/g;
const TRAN_CAU_XU_LY = 2000;

// Đơn vị/kỹ thuật chỉ bảo vệ khi không trùng từ phổ thông tiếng Việt (hoặc đi kèm số / viết hoa).
const DON_VI_SET = new Set([
  'mm', 'cm', 'dm', 'um', 'nm', 'inch', 'ft',
  'mg', 'kg', 'tấn', 'ml', 'lít', 'cc',
  'kv', 'mv', 'vac', 'vdc', 'ka', 'kw', 'mw', 'kva', 'wh', 'kwh', 'mah', 'ah',
  'hz', 'khz', 'mhz', 'ghz', 'kpa', 'mpa', 'psi', 'rpm', 'db',
  'gb', 'tb', 'mb', 'kb', 'ohm', 'uf', 'nf', 'pf', 'dn', 'phi', 'btu', 'hp',
  'ac', 'dc', 'usb', 'led', 'lcd', 'oled', 'pcb', 'cnc', 'abs', 'pvc', 'eva', 'pp', 'pe', 'pu', 'pet', 'hdpe', 'ldpe', 'pom', 'ptfe', 'sus', 'inox', 'bnc',
  'bluetooth', 'polyester', 'cotton', 'satin', 'plastic', 'silicone', 'silicon', 'nylon', 'acrylic', 'plywood', 'laminate', 'crom', 'chrome', 'teflon', 'pp-r',
]);
const CHAT_LIEU_DON_TRONG_NGU_CANH = {
  su: 'sứ',
  dong: 'đồng',
  go: 'gỗ',
  sat: 'sắt',
  nhom: 'nhôm',
  thep: 'thép',
  vai: 'vải',
  da: 'da',
  ni: 'nỉ',
  chi: 'chì',
  gom: 'gốm',
  thuy: 'thủy',
  giay: 'giấy',
  nhua: 'nhựa',
};

let cachedDefaultDict = null;
const compiledCache = new WeakMap();

/** Công tắc HS_TIEN_XU_LY: mặc định TẮT — chỉ on / 1 / true mới bật. */
function bat() {
  return /^(on|1|true)$/i.test(String(process.env.HS_TIEN_XU_LY || '').trim());
}

function boDau(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, (c) => (c === 'Đ' ? 'D' : 'd'));
}

function taiTuDien(tuDienOpt) {
  if (tuDienOpt && typeof tuDienOpt === 'object') return tuDienOpt;
  if (!cachedDefaultDict) {
    const p = dataReadPath('tu-dien-tien-xu-ly.json');
    cachedDefaultDict = JSON.parse(fs.readFileSync(p, 'utf8'));
  }
  return cachedDefaultDict;
}

function chuanBiChiMuc(dict) {
  let c = compiledCache.get(dict);
  if (c) return c;

  const don = dict.don || {};
  const doi = dict.doi || {};
  const ba = dict.ba || {};
  const tuVung = dict.tuVung || {};
  const tuAnhSet = new Set(Array.isArray(dict.tuAnh) ? dict.tuAnh : []);
  const chatLieuSet = new Set((Array.isArray(dict.chatLieu) ? dict.chatLieu : []).map((x) => String(x).toLowerCase()));
  const boiCanhSet = new Set((Array.isArray(dict.boiCanhMau) ? dict.boiCanhMau : []).map((x) => String(x).toLowerCase()));

  const brandMap = new Map();
  for (const b of dict.hang?.brands || []) {
    const low = String(b).toLowerCase();
    if (low.length >= 2 && !don[low]) brandMap.set(low, b);
  }
  const modelMap = new Map();
  for (const m of dict.hang?.models || []) {
    const low = String(m).toLowerCase();
    if (low.length >= 2) modelMap.set(low, m);
  }

  // Bảng tần suất không dấu để sửa lỗi chính tả edit-distance = 1 cực nhanh (O(1) tra cứu).
  const tuVungPlain = new Map();
  for (const [tok, freq] of Object.entries(tuVung)) {
    const p = boDau(tok);
    tuVungPlain.set(p, (tuVungPlain.get(p) || 0) + freq);
  }

  c = {
    don,
    doi,
    ba,
    tuVung,
    tuVungPlain,
    tuAnhSet,
    chatLieuSet,
    boiCanhSet,
    brandMap,
    modelMap,
    vietTat: dict.vietTat || {},
  };
  compiledCache.set(dict, c);
  return c;
}

function damBaoChiMuc(dictOrIdx) {
  if (dictOrIdx && dictOrIdx.tuAnhSet instanceof Set) return dictOrIdx;
  return chuanBiChiMuc(taiTuDien(dictOrIdx));
}

function laNguyenAmSaiHaiThanh(tok) {
  const nfd = String(tok || '').normalize('NFD');
  const marks = nfd.match(THANH_DIEU_RE);
  return Boolean(marks && marks.length >= 2);
}

function taoBienTheEdit1(word) {
  const out = new Set();
  const n = word.length;
  const az = 'abcdefghijklmnopqrstuvwxyz';
  for (let i = 0; i < n; i += 1) {
    out.add(word.slice(0, i) + word.slice(i + 1));
    if (i + 1 < n && word[i] !== word[i + 1]) {
      out.add(word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2));
    }
    for (let j = 0; j < az.length; j += 1) {
      if (az[j] !== word[i]) out.add(word.slice(0, i) + az[j] + word.slice(i + 1));
    }
  }
  for (let i = 0; i <= n; i += 1) {
    for (let j = 0; j < az.length; j += 1) {
      out.add(word.slice(0, i) + az[j] + word.slice(i));
    }
  }
  out.delete(word);
  return out;
}

const TRUOC_MODEL_HANG_RE = /^(?:model|mã|hiệu|hãng|nhãn|thương|nsx|xuất|made|in)$/i;

/** Tách nhãn viết tắt dính dấu hai chấm (vd `kt:50x40mm` → `kt: 50x40mm`) và chuẩn khoảng trắng. */
function chuanKhoangTrang(text) {
  return String(text || '')
    .normalize('NFC')
    .replace(/\u00a0/g, ' ')
    .replace(/(^|[\s,;(])([a-zA-ZđĐ]{1,4}(?:\/[a-zA-ZđĐ]{1,3})?|\d?\.[a-zA-ZđĐ]{1,3}):(?=\S)/gu, '$1$2: ')
    .replace(/\s+/g, ' ')
    .trim();
}

const SAU_CN_NGU_CANH_RE = /^(?:quat|may|bep|lo|noi|den|bom|tu|ke|ban|ghe|xe|bang|gang|keo|dau|vai|soi|go|giay|nhua|thep|he|thiet|dung|vat|linh|phu|nganh|san|trong|loai|hang|muc|son|hoa|chat|ong|van|cua|can|mo|motor)$/iu;
const TRUOC_CN_CAM_RE = /^(?:hieu|hang|nsx|xuat|xu|origin|china|in|:)$/iu;
const SAU_GD_NGU_CANH_RE = /^(?:bep|noi|quat|may|tu|do|den|dung|trong|cho|thiet|dung|gia)$/iu;
const SAU_VP_NGU_CANH_RE = /^(?:ban|ghe|do|may|thiet|dung|vat|pham|tu|ke|dung|trong|cho|cua|kinh|giay)$/iu;
const SAU_XM_NGU_CANH_RE = /^(?:phu|linh|vo|lop|sam|yen|xich|nhong|dia|den|guong|tay|phanh|binh|loc|bugi|piston|xupap|dong|co|cho|cua|xe)$/iu;
const SAU_OT_NGU_CANH_RE = /^(?:phu|linh|kinh|guong|lop|vo|ghe|tham|den|gat|cam|loc|nhot|phanh|may|bom|cho|cua|xe)$/iu;
const TRUOC_DC_DIEN_RE = /^(?:nguon|dien|ap|adapter|adaptor|sac|cuon|quat|bom|motor|mo|to|van|led|ac|ac\/dc|vdc|vac|24v|12v|5v|48v|36v)$/iu;
const SAU_DC_DIEN_RE = /^(?:\d+(?:[.,]\d+)?\s*(?:v|vdc|a|w|kw|ma)|ac|ac\/dc|adapter|nguon|vao|ra)$/iu;
const SAU_DC_KHONG_RE = /^(?:khong|ko|k|chua|chang|da|se|dang|co|cung|van)$/iu;
const TRUOC_DC_DONG_CO_RE = /^(?:buoc|servo|dien|1|3|giam|xe|hop|toc|choi|khong|xoay|mot|ba)$/iu;
const SAU_DK_CAM_BIEN_RE = /^(?:tu|toc|nhiet|tu|cong|den|bo|tay|mach|remote|van|dien|ap)$/iu;
const DON_VI_THE_TICH_RE = /^(?:\d+(?:[.,]\d+)?\s*(?:ml|l|lit|lít|cc|m3))(?![\p{L}\p{N}])/iu;
const DON_VI_DAI_RE = /^(?:\d+(?:[.,]\d+)?\s*(?:mm|cm|dm|m|inch|in|phi|ø))(?![\p{L}\p{N}])/iu;

/** Mở rộng viết tắt XNK an toàn, tuyệt đối không làm hỏng "da", "in", "co", "lo", "bo", "AC/DC" hay mã model. */
function moVietTat(text, dictOrIdx) {
  const idx = damBaoChiMuc(dictOrIdx);
  const s = chuanKhoangTrang(text);
  if (!s) return '';

  const out = s
    .replace(/(?<![\p{L}\p{N}\-\/])đ\.?\s*áp(?=\s*[:=]|\s+\d|\s|$)/giu, 'điện áp')
    .replace(/(?<![\p{L}\p{N}\-\/])đ\.a(?=\s*[:=]|\s+\d|\s|$)/giu, 'điện áp')
    .replace(/(?<![\p{L}\p{N}\-\/])k\/t(?=\s*[:=]|\s+\d|\s|$)/giu, 'kích thước')
    .replace(/(?<![\p{L}\p{N}\-\/])d\/c(?=\s*[:=]|\s|$)/giu, 'địa chỉ')
    .replace(/(?<![\p{L}\p{N}\-\/])đ\/c(?=\s*[:=]|\s|$)/giu, 'địa chỉ')
    .replace(/(?<![\p{L}\p{N}\-\/])đ\/k(?=\s*[:=]|\s+\d|\s|$)/giu, 'đường kính')
    .replace(/(?<![\p{L}\p{N}\-\/])d\/k(?=\s*[:=]|\s+\d|\s|$)/giu, 'đường kính')
    .replace(/(?<![\p{L}\p{N}\-\/])p\/k(?=\s*[:=]|\s|$)/giu, 'phụ kiện')
    .replace(/(?<![\p{L}\p{N}\-\/])c\/d(?=\s*[:=]|\s|$)/giu, 'công dụng');

  const parts = out.split(/(\s+|[,;()]+)/);
  const wordIndices = [];
  for (let i = 0; i < parts.length; i += 1) {
    if (parts[i] && !/^(\s+|[,;()]+)$/.test(parts[i])) wordIndices.push(i);
  }

  const peekWord = (wi, offset) => {
    const pos = wordIndices[wi + offset];
    return pos != null ? parts[pos] : '';
  };

  for (let wi = 0; wi < wordIndices.length; wi += 1) {
    const idxPart = wordIndices[wi];
    const rawTok = parts[idxPart];
    if (/[-/]|\d/.test(rawTok)) continue;

    const coHaiCham = rawTok.endsWith(':');
    const core = coHaiCham ? rawTok.slice(0, -1) : rawTok;
    const low = core.toLowerCase();
    const prevRaw = peekWord(wi, -1).replace(/[:,;]$/, '');
    const nextRaw = peekWord(wi, 1).replace(/[:,;]$/, '');
    const prev = boDau(prevRaw).toLowerCase();
    const next = boDau(nextRaw).toLowerCase();
    const nextWithUnit = boDau(`${peekWord(wi, 1)} ${peekWord(wi, 2)}`.trim()).toLowerCase();

    if (['da', 'in', 'co', 'lo', 'bo'].includes(low)) continue;
    if (TRUOC_MODEL_HANG_RE.test(prevRaw) && low !== 'cn') continue;

    let rep = null;

    if (low === 'kt') rep = 'kích thước';
    else if (low === 'cl') rep = 'chất liệu';
    else if (low === 'cs') rep = 'công suất';
    else if (low === 'nsx') rep = 'nhà sản xuất';
    else if (low === 'sx') rep = 'sản xuất';
    else if (low === 'sp') rep = 'sản phẩm';
    else if (low === 'lk') rep = 'linh kiện';
    else if (low === 'tb') rep = 'thiết bị';
    else if (low === 'tbd' || low === 'tbđ') rep = 'thiết bị điện';
    else if (low === 'dhkk' || low === 'đhkk') rep = 'điều hòa không khí';
    else if (low === 'bhld' || low === 'bhlđ') rep = 'bảo hộ lao động';
    else if (low === 'pccc') rep = 'phòng cháy chữa cháy';
    else if (low === 'tbyt') rep = 'thiết bị y tế';
    else if (low === 'vpp') rep = 'văn phòng phẩm';
    else if (low === 'kcn') rep = 'khu công nghiệp';
    else if (low === 'pt') {
      if (core === 'PT' && !coHaiCham && !/^(xe|may|co|dong|o)/i.test(next)) continue;
      rep = 'phụ tùng';
    } else if (low === 'pk') {
      if (core === 'PK' && !coHaiCham) continue;
      rep = 'phụ kiện';
    } else if (low === 'đa') {
      if (coHaiCham || /^\d/.test(nextRaw) || core === 'ĐA') rep = 'điện áp';
    } else if (low === 'tl') {
      if (coHaiCham || /^\d+(?:[.,]\d+)?\s*(?:kg|g|mg|tấn|tan)(?![\p{L}\p{N}])/iu.test(nextWithUnit)) rep = 'trọng lượng';
    } else if (low === 'kl') {
      if (coHaiCham && /^\d/.test(nextRaw)) rep = 'khối lượng';
      else if (prevRaw === '+' || prev === 'nhua' || prev === 'hop') rep = 'kim loại';
    } else if (low === 'đk' || low === 'dk') {
      if (coHaiCham || DON_VI_DAI_RE.test(nextWithUnit) || /^\d/.test(nextRaw)) {
        rep = 'đường kính';
      } else if (SAU_DK_CAM_BIEN_RE.test(prev) || SAU_DK_CAM_BIEN_RE.test(next) || low === 'dk' || low === 'đk') {
        if (low === 'đk' && !SAU_DK_CAM_BIEN_RE.test(prev) && !SAU_DK_CAM_BIEN_RE.test(next)) rep = 'đường kính';
        else rep = 'điều khiển';
      }
    } else if (low === 'đt' || low === 'dt') {
      if (DON_VI_THE_TICH_RE.test(nextWithUnit) || (coHaiCham && /^\d/.test(nextRaw))) rep = 'dung tích';
      else rep = 'điện thoại';
    } else if (low === 'ac') {
      if (next === 'quy' || next === 'piston') rep = 'ắc';
      else if (core === 'AC' || coHaiCham || TRUOC_DC_DIEN_RE.test(prev) || SAU_DC_DIEN_RE.test(next)) rep = 'AC';
    } else if (low === 'đc' || low === 'dc') {
      if (SAU_DC_KHONG_RE.test(prev)) {
        rep = 'được';
      } else if (core === 'DC' || TRUOC_DC_DIEN_RE.test(prev) || SAU_DC_DIEN_RE.test(next)) {
        rep = 'DC';
      } else if (low === 'đc' || TRUOC_DC_DONG_CO_RE.test(next) || prev === 'phu' || prev === 'tung' || prev === 'cho') {
        rep = 'động cơ';
      } else if (idx.vietTat[low]) {
        rep = idx.vietTat[low];
      }
    } else if (low === 'cn') {
      if (core !== 'CN' && !TRUOC_CN_CAM_RE.test(prev) && SAU_CN_NGU_CANH_RE.test(prev)) {
        rep = 'công nghiệp';
      }
    } else if (low === 'gd' || low === 'gđ') {
      if (low === 'gđ' || SAU_GD_NGU_CANH_RE.test(prev)) rep = 'gia đình';
    } else if (low === 'vp') {
      if (core !== 'VP' && SAU_VP_NGU_CANH_RE.test(prev)) rep = 'văn phòng';
    } else if (low === 'xm') {
      if (core !== 'XM' && SAU_XM_NGU_CANH_RE.test(prev)) rep = 'xe máy';
    } else if (low === 'ot') {
      if (core !== 'OT' && SAU_OT_NGU_CANH_RE.test(prev)) rep = 'ô tô';
    }

    if (rep) {
      parts[idxPart] = coHaiCham ? `${rep}:` : rep;
    }
  }

  return parts.join('').replace(/\s+/g, ' ').trim();
}

/** Sửa lỗi gõ phím hợp lý (ED === 1, >= 4 ký tự, từ chưa biết, láng giềng trội). */
function suaLoiChinhTa(text, dictOrIdx) {
  const idx = damBaoChiMuc(dictOrIdx);
  const s = String(text || '');
  if (!s) return s;

  const coChuThuong = /\p{Ll}/u.test(s);
  const parts = s.split(/(\s+|[,;:()\/]+)/);
  const wordPos = [];
  for (let i = 0; i < parts.length; i += 1) {
    if (parts[i] && !/^(\s+|[,;:()\/]+)$/.test(parts[i])) wordPos.push(i);
  }

  for (let wi = 0; wi < wordPos.length; wi += 1) {
    const pos = wordPos[wi];
    const tok = parts[pos];
    if (/[\d\-_.*+%°Ø]/.test(tok)) continue;

    const prevTok = wi > 0 ? parts[wordPos[wi - 1]] : '';
    const nextTok = wi + 1 < wordPos.length ? parts[wordPos[wi + 1]] : '';
    if (TRUOC_MODEL_HANG_RE.test(prevTok)) continue;
    if (coChuThuong && tok === tok.toUpperCase() && /[A-Z]/.test(tok)) continue;

    const low = tok.normalize('NFC').toLowerCase();
    const plain = boDau(low);
    if (plain.length < 4 || !/^[a-z]+$/.test(plain)) continue;

    if (laNguyenAmSaiHaiThanh(low) && idx.don[plain]) {
      parts[pos] = plain;
      continue;
    }

    if (
      idx.tuVung[low]
      || idx.don[plain]
      || idx.tuAnhSet.has(plain)
      || DON_VI_SET.has(plain)
      || idx.brandMap.has(plain)
      || idx.modelMap.has(plain)
    ) {
      continue;
    }

    // Ưu tiên hoán vị liền kề cùng độ dài (vd "gioung" -> "giuong", "nahnh" -> "nhanh") trước khi xét xoá/thêm ký tự.
    const transCands = [];
    for (let i = 0; i + 1 < plain.length; i += 1) {
      if (plain[i] === plain[i + 1]) continue;
      const tr = plain.slice(0, i) + plain[i + 1] + plain[i] + plain.slice(i + 2);
      const tf = idx.tuVungPlain.get(tr);
      if (tf && tf >= 15) transCands.push({ w: tr, freq: tf });
    }
    if (transCands.length === 1) {
      parts[pos] = transCands[0].w;
      continue;
    }
    if (transCands.length > 1) {
      transCands.sort((a, b) => (b.freq - a.freq) || (a.w < b.w ? -1 : 1));
      if (transCands[0].freq >= transCands[1].freq * 3 && transCands[0].freq >= 20) {
        parts[pos] = transCands[0].w;
        continue;
      }
    }

    const edits = taoBienTheEdit1(plain);
    const cands = [];
    for (const e of edits) {
      const freq = idx.tuVungPlain.get(e);
      if (freq && freq >= 15) cands.push({ w: e, freq });
    }
    if (!cands.length) continue;

    cands.sort((a, b) => (b.freq - a.freq) || (a.w < b.w ? -1 : 1));
    const prevPlain = boDau(prevTok.toLowerCase());
    const nextPlain = boDau(nextTok.toLowerCase());

    const biMatches = cands.filter((c) => Boolean(idx.doi[`${prevPlain} ${c.w}`] || idx.doi[`${c.w} ${nextPlain}`]));
    let chosen = null;
    if (biMatches.length === 1) {
      chosen = biMatches[0].w;
    } else if (cands.length === 1) {
      chosen = cands[0].w;
    } else if (cands[0].freq >= cands[1].freq * 3 && cands[0].freq >= 20) {
      chosen = cands[0].w;
    }

    if (chosen) parts[pos] = chosen;
  }

  return parts.join('');
}

/** Khôi phục dấu tiếng Việt bằng DP trên từ đôi (doi) + ngoại lệ 3 từ (ba) + từ đơn (don). */
function khoiPhucDau(text, dictOrIdx, kpOpts = {}) {
  const idx = damBaoChiMuc(dictOrIdx);
  const s = String(text || '');
  if (!s) return s;
  const preferChatLieu = Boolean(kpOpts?.preferChatLieu);

  const coChuThuong = /\p{Ll}/u.test(s);
  const parts = s.split(/([^\p{L}\p{N}_-]+|\s+)/u);
  const wordPos = [];
  for (let i = 0; i < parts.length; i += 1) {
    if (parts[i] && /^[\p{L}\p{N}_-]+$/u.test(parts[i])) wordPos.push(i);
  }
  if (!wordPos.length) return s;

  const isPureEnglishOnly = (plain) => idx.tuAnhSet.has(plain) && !idx.don[plain];

  const toks = wordPos.map((pos, wi) => {
    const raw = parts[pos];
    const hasDigitOrSym = /[\d_-]/.test(raw);
    const hasViMark = CO_DAU_VI.test(raw);
    const allUpperShort = coChuThuong && raw === raw.toUpperCase() && /[A-Z]/.test(raw) && raw.length <= 10;
    const low = raw.normalize('NFC').toLowerCase();
    const plain = boDau(low);
    const prevRaw = wi > 0 ? parts[wordPos[wi - 1]] : '';
    const isAfterBrandLabel = TRUOC_MODEL_HANG_RE.test(prevRaw);
    const isUnitOrBrand = DON_VI_SET.has(plain) || idx.brandMap.has(plain) || idx.modelMap.has(plain);
    return { pos, raw, low, plain, hasDigitOrSym, hasViMark, allUpperShort, isAfterBrandLabel, isUnitOrBrand };
  });

  const candsPerPos = toks.map((t, i) => {
    if (t.hasDigitOrSym || t.hasViMark || t.allUpperShort || t.isAfterBrandLabel || !/^[a-z]+$/.test(t.plain)) {
      return [t.hasViMark ? t.low : t.raw];
    }
    const prevP = i > 0 ? toks[i - 1].plain : '';
    const nextP = i + 1 < toks.length ? toks[i + 1].plain : '';
    const sepPrev = i > 0 ? parts.slice(toks[i - 1].pos + 1, t.pos).join('') : '';
    const sepNext = i + 1 < toks.length ? parts.slice(t.pos + 1, toks[i + 1].pos).join('') : '';
    const lienPrev = i > 0 && /^\s+$/.test(sepPrev);
    const lienNext = i + 1 < toks.length && /^\s+$/.test(sepNext);
    const hasViBigram = Boolean((lienPrev && idx.doi[`${prevP} ${t.plain}`]) || (lienNext && idx.doi[`${t.plain} ${nextP}`]));

    if (preferChatLieu && !hasViBigram && CHAT_LIEU_DON_TRONG_NGU_CANH[t.plain]) {
      return [CHAT_LIEU_DON_TRONG_NGU_CANH[t.plain]];
    }
    if (i > 0 && /[+\/,]/.test(sepPrev) && CHAT_LIEU_DON_TRONG_NGU_CANH[prevP] && CHAT_LIEU_DON_TRONG_NGU_CANH[t.plain] && !(lienNext && idx.doi[`${t.plain} ${nextP}`])) {
      return [CHAT_LIEU_DON_TRONG_NGU_CANH[t.plain]];
    }

    if (t.isUnitOrBrand && !hasViBigram) return [t.raw];
    if (isPureEnglishOnly(t.plain)) return [t.raw];

    if (idx.tuAnhSet.has(t.plain) && !hasViBigram) {
      const prevEn = i > 0 && isPureEnglishOnly(prevP);
      const nextEn = i + 1 < toks.length && isPureEnglishOnly(nextP);
      if (prevEn || nextEn) return [t.raw];
    }

    // Bảo vệ "da" khi đứng ngay sau nhãn "chất liệu:" (tránh biến thành "đã").
    if (t.plain === 'da' && !hasViBigram && /^(?:liệu|bằng)$/iu.test(prevP)) {
      return ['da'];
    }

    const set = new Set();
    const uni = idx.don[t.plain];
    set.add(uni || t.plain);
    if (i > 0) {
      const bLeft = idx.doi[`${prevP} ${t.plain}`];
      if (bLeft) set.add(bLeft.split(' ')[1]);
    }
    if (i + 1 < toks.length) {
      const bRight = idx.doi[`${t.plain} ${nextP}`];
      if (bRight) set.add(bRight.split(' ')[0]);
    }
    return [...set];
  });

  const n = toks.length;
  const back = new Array(n);
  let prevScores = candsPerPos[0].map((cand) => (cand === (idx.don[toks[0].plain] || toks[0].plain) ? 1 : 0));

  for (let i = 1; i < n; i += 1) {
    const bk = `${toks[i - 1].plain} ${toks[i].plain}`;
    const doiPair = idx.doi[bk] || null;
    const uniCand = idx.don[toks[i].plain] || toks[i].plain;
    const sep = toks[i].pos - toks[i - 1].pos === 2 ? parts[toks[i - 1].pos + 1] : '';
    const lienKe = /^\s+$/.test(sep);
    const prevCands = candsPerPos[i - 1];
    const curCands = candsPerPos[i];
    const curScores = new Array(curCands.length);
    const curBack = new Int32Array(curCands.length);

    for (let c = 0; c < curCands.length; c += 1) {
      const cand = curCands[c];
      const uniBonus = cand === uniCand ? 1 : 0;
      let bestScore = -1e9;
      let bestPrev = 0;
      for (let j = 0; j < prevScores.length; j += 1) {
        const biBonus = lienKe && doiPair === `${prevCands[j]} ${cand}` ? 10 : 0;
        const sc = prevScores[j] + uniBonus + biBonus;
        if (sc > bestScore) {
          bestScore = sc;
          bestPrev = j;
        }
      }
      curScores[c] = bestScore;
      curBack[c] = bestPrev;
    }
    prevScores = curScores;
    back[i] = curBack;
  }

  let bestLast = 0;
  for (let c = 1; c < prevScores.length; c += 1) {
    if (prevScores[c] > prevScores[bestLast]) bestLast = c;
  }
  const chosen = new Array(n);
  let curIdx = bestLast;
  for (let i = n - 1; i >= 0; i -= 1) {
    chosen[i] = candsPerPos[i][curIdx];
    if (i > 0) curIdx = back[i][curIdx];
  }

  for (let i = 0; i + 2 < n; i += 1) {
    const sep1 = parts.slice(toks[i].pos + 1, toks[i + 1].pos).join('');
    const sep2 = parts.slice(toks[i + 1].pos + 1, toks[i + 2].pos).join('');
    if (!/^\s+$/.test(sep1) || !/^\s+$/.test(sep2)) continue;
    const tk = `${toks[i].plain} ${toks[i + 1].plain} ${toks[i + 2].plain}`;
    const tri = idx.ba[tk];
    if (!tri) continue;
    const [t0, t1, t2] = tri.split(' ');
    if (toks[i].hasViMark && chosen[i] !== t0) continue;
    if (toks[i + 1].hasViMark && chosen[i + 1] !== t1) continue;
    if (toks[i + 2].hasViMark && chosen[i + 2] !== t2) continue;
    chosen[i] = t0;
    chosen[i + 1] = t1;
    chosen[i + 2] = t2;
  }

  for (let i = 0; i < n; i += 1) {
    parts[toks[i].pos] = chosen[i];
  }
  return parts.join('');
}

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const uniqPush = (arr, seen, val) => {
  const v = String(val || '').replace(/\s+/g, ' ').trim();
  if (!v) return;
  const k = v.toLowerCase();
  if (seen.has(k)) return;
  seen.add(k);
  arr.push(v);
};

// Mẫu thông số kỹ thuật chuẩn (dùng lookaround Unicode thay \b để không cắt từ tiếng Việt có dấu như "4 lớp", "10 mét").
const SRC_SPEC_MA_TRAN = '(?<![\\p{L}\\p{N}])\\(?\\s*\\d+(?:[.,]\\d+)?(?:\\s*[x×*]\\s*\\d+(?:[.,]\\d+)?)+\\s*\\)?(?:\\s*(?:mm|cm|dm|m|inch|in)(?![\\p{L}\\p{N}]))?(?![\\p{L}\\p{N}])';
const SRC_SPEC_DON_VI = '(?<![\\p{L}\\p{N}])\\d+(?:[.,]\\d+)?(?:\\s*[-–~\\/]\\s*\\d+(?:[.,]\\d+)?)?\\s*(?:kv|mv|vac|vdc|v|ma|ka|a|kw|mw|w|kva|va|kwh|mah|wh|ah|ghz|mhz|khz|hz|mm|cm|dm|m|km|um|nm|inch|in|kg|mg|g|tấn|tan|ml|lít|lit|l|cc|m3\\/h|m3|bar|kpa|mpa|pa|psi|rpm|db|gb|tb|mb|kb|ohm|uf|nf|pf|°c)(?![\\p{L}\\p{N}])';
const SRC_SPEC_DN_PHI = '(?<![\\p{L}\\p{N}])(?:DN\\s*\\d+|(?:phi|Ø)\\s*\\d+(?:[.,]\\d+)?(?:\\s*(?:mm|cm))?)(?![\\p{L}\\p{N}])';
const SRC_SPEC_TY_LE = '(?<![\\p{L}\\p{N}])\\d{1,2}\\/\\d{1,2}(?:\\s*inch(?![\\p{L}\\p{N}]))?(?![\\p{L}\\p{N}\\/])';

const RE_SPEC_MA_TRAN = new RegExp(SRC_SPEC_MA_TRAN, 'giu');
const RE_SPEC_DON_VI = new RegExp(SRC_SPEC_DON_VI, 'giu');
const RE_SPEC_DN_PHI = new RegExp(SRC_SPEC_DN_PHI, 'giu');
const RE_SPEC_TY_LE = new RegExp(SRC_SPEC_TY_LE, 'giu');

const RE_LA_THONG_SO = new RegExp(`^(?:${SRC_SPEC_MA_TRAN}|${SRC_SPEC_DON_VI}|${SRC_SPEC_DN_PHI}|${SRC_SPEC_TY_LE})$`, 'iu');

const NHIEU_MODEL_SET = new Set([
  'không', 'không có', 'không hiệu', 'không nhãn hiệu', 'không rõ', 'none', 'n/a', 'na', 'null', 'unknown', 'oem',
]);

const DAC_TRUNG_CHAT_LIEU_DON_RE = /^(?:nhựa|inox|pvc|abs|eva|pp|pe|pu|pet|hdpe|ldpe|pom|ptfe|teflon|silicone|silicon|nylon|nilon|polyester|cotton|acrylic|mica|plastic|nhôm|thép)$/;

/** Tìm nhanh n-gram (tối đa 4 từ) khớp từ điển chất liệu trong O(N) thay vì duyệt 1.500 regex. */
function timChatLieuNgram(text, chatLieuSet) {
  const tokens = String(text || '').toLowerCase().split(/[\s,;()]+/).filter(Boolean);
  const hits = [];
  for (let i = 0; i < tokens.length; i += 1) {
    for (let len = Math.min(4, tokens.length - i); len >= 1; len -= 1) {
      const phr = tokens.slice(i, i + len).join(' ');
      if (chatLieuSet.has(phr)) {
        hits.push({ cl: phr, startTok: i, len });
        break;
      }
    }
  }
  return hits;
}

function lamSachSpec(raw) {
  let s = String(raw || '').replace(/^[\s,;:]+/, '').trim();
  if (s.endsWith(')') && !s.includes('(')) s = s.slice(0, -1).trim();
  if (s.startsWith('(') && !s.includes(')')) s = s.slice(1).trim();
  return s;
}

function trichXuatTruong(cauGoc, cauCoDau, inputObj, idx) {
  const modelHang = [];
  const modelSeen = new Set();
  const thongSo = [];
  const thongSoSeen = new Set();
  const chatLieuList = [];
  const chatLieuSeen = new Set();

  const specTuTruong = [];
  // 1. Trường có cấu trúc sẵn (khi input là object).
  if (inputObj) {
    for (const b of Array.isArray(inputObj.brands) ? inputObj.brands : (inputObj.brand ? [inputObj.brand] : [])) {
      const clean = String(b || '').trim();
      if (clean && !NHIEU_MODEL_SET.has(clean.toLowerCase())) uniqPush(modelHang, modelSeen, clean);
    }
    for (const m of Array.isArray(inputObj.models) ? inputObj.models : (inputObj.model ? [inputObj.model] : [])) {
      const clean = String(m || '').trim();
      if (clean && !NHIEU_MODEL_SET.has(clean.toLowerCase())) uniqPush(modelHang, modelSeen, clean);
    }
    for (const sp of Array.isArray(inputObj.specs) ? inputObj.specs : (inputObj.specs ? [inputObj.specs] : [])) {
      for (const re of [RE_SPEC_MA_TRAN, RE_SPEC_DON_VI, RE_SPEC_DN_PHI, RE_SPEC_TY_LE]) {
        for (const m of String(sp).match(re) || []) {
          const val = lamSachSpec(m);
          if (val && !/^100%$/.test(val)) {
            specTuTruong.push(val);
            uniqPush(thongSo, thongSoSeen, val);
          }
        }
      }
    }
    if (inputObj.chatLieu) {
      const clText = khoiPhucDau(suaLoiChinhTa(moVietTat(String(inputObj.chatLieu), idx), idx), idx, { preferChatLieu: true });
      for (const part of clText.split(/[,;+/]+/)) {
        const cleanCl = part.replace(/\s+/g, ' ').trim();
        if (cleanCl && !NHIEU_MODEL_SET.has(cleanCl.toLowerCase())) uniqPush(chatLieuList, chatLieuSeen, cleanCl);
      }
    }
  }

  // 2. Bóc thông số kỹ thuật trước để tránh nhầm 750W / 100W / DN25 thành model.
  let lamViec = String(cauCoDau || '');
  const boSpec = (re) => {
    lamViec = lamViec.replace(re, (match) => {
      const val = lamSachSpec(match);
      if (val && !/^100%$/.test(val)) uniqPush(thongSo, thongSoSeen, val);
      return ' ';
    });
  };
  boSpec(RE_SPEC_MA_TRAN);
  boSpec(RE_SPEC_DON_VI);
  boSpec(RE_SPEC_DN_PHI);
  boSpec(RE_SPEC_TY_LE);
  // Cũng quét thông số trên `cauGoc` để giữ nguyên chữ hoa của đơn vị như `220V`, `100W`, `DN25` và giữ lại specs từ inputObj.
  thongSo.length = 0;
  thongSoSeen.clear();
  for (const re of [RE_SPEC_MA_TRAN, RE_SPEC_DON_VI, RE_SPEC_DN_PHI, RE_SPEC_TY_LE]) {
    for (const m of String(cauGoc || '').match(re) || []) {
      const val = lamSachSpec(m);
      if (val && !/^100%$/.test(val)) uniqPush(thongSo, thongSoSeen, val);
    }
  }
  for (const v of specTuTruong) uniqPush(thongSo, thongSoSeen, v);

  // 3. Bóc model / nhãn hiệu từ văn bản gốc (giữ chữ hoa).
  const nguonModel = String(cauGoc || '');
  const modelLabelRe = /(?:^|[\s,;:(])(?:model|mã\s*hàng|mã\s*sp|mã\s*số|part\s*no\.?|p\/n)\s*[:=]?\s*([A-Za-z0-9][A-Za-z0-9._\-\/+]{1,24}(?:\s+[A-Za-z0-9][A-Za-z0-9._\-\/+]{0,10})?)(?=$|[,;()\n]|\s+(?:hiệu|nhãn|thương|mới|bằng|dùng|xuất))/giu;
  for (const m of nguonModel.matchAll(modelLabelRe)) {
    const val = m[1].trim();
    if (val && !NHIEU_MODEL_SET.has(val.toLowerCase()) && !RE_LA_THONG_SO.test(val)) uniqPush(modelHang, modelSeen, val);
  }
  const brandLabelRe = /(?:^|[\s,;:(])(?:nhãn\s*hiệu|thương\s*hiệu|hãng\s*(?:sản\s*xuất|sx)?|(?<!tín\s)hiệu)\s*[:=]?\s*([A-Za-z0-9\p{L}][A-Za-z0-9\p{L}.&\-\s]{1,30}?)(?=$|[,;()\n]|\s+(?:model|mã|mới|bằng|dùng|kích|công|điện|xuất))/giu;
  for (const m of nguonModel.matchAll(brandLabelRe)) {
    const val = m[1].trim();
    if (val && !NHIEU_MODEL_SET.has(val.toLowerCase())) uniqPush(modelHang, modelSeen, val);
  }
  for (const tok of nguonModel.split(/[\s,;()]+/)) {
    const clean = tok.replace(/^[:.=]+|[:.=]+$/g, '');
    if (!clean || clean.length < 2) continue;
    const low = clean.toLowerCase();
    if (RE_LA_THONG_SO.test(clean) || DON_VI_SET.has(low)) continue;
    if (idx.modelMap.has(low) && !idx.don[low]) uniqPush(modelHang, modelSeen, idx.modelMap.get(low));
    else if (idx.brandMap.has(low) && !idx.don[low] && (!idx.tuVung[low] || clean === clean.toUpperCase() || /^[A-Z]/.test(clean))) {
      uniqPush(modelHang, modelSeen, idx.brandMap.get(low));
    } else if (/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9][A-Za-z0-9\-_\/]{2,20}$/.test(clean) && !/^\d+(?:\/\d+)?$/.test(clean)) {
      uniqPush(modelHang, modelSeen, clean);
    }
  }

  // Gỡ boilerplate, nhãn thông số, nhãn model/hiệu khỏi bản làm việc.
  lamViec = lamViec
    .replace(/(?<![\p{L}\p{N}])mới\s*100%(?![\p{L}\p{N}%])/giu, ' ')
    .replace(/(?:^|[,;])\s*(?:nhà\s+sản\s+xuất|hãng\s+sản\s+xuất|xuất\s+xứ|made\s+in)\s*[:=]?\s*[^,;\n]*/giu, ' ')
    .replace(/(?:^|[\s,;])(?:model|mã\s*hàng|mã\s*sp|mã\s*số|nhãn\s*hiệu|thương\s*hiệu|(?<!tín\s)hiệu)\s*[:=]?\s*[^,;\n()]*/giu, ' ')
    .replace(/(?<![\p{L}\p{N}])(?:kích\s+thước|công\s+suất|điện\s+áp|dung\s+tích|trọng\s+lượng|khối\s+lượng|đường\s+kính|cổng\s+ren)\s*[:=]?\s*(?=[,;\s]|$)/giu, ' ');
  for (const mh of modelHang) {
    if (mh.length >= 2) {
      lamViec = lamViec.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(mh)}(?![\\p{L}\\p{N}])`, 'giu'), ' ');
    }
  }
  lamViec = lamViec.replace(/\s+/g, ' ').trim();

  // 4. Bóc tiền tố rườm rà dạng "linh kiện dùng cho <bối cảnh> - <tên hàng>" trước khi bóc bối cảnh/chất liệu.
  const boiCanhParts = [];
  const boiCanhSeen = new Set();
  const leadWrapperRe = /^(?:linh\s+kiện|phụ\s+kiện|phụ\s+tùng)\s+(?:dùng\s+)?(?:cho|của)\s+([^:\-–]{2,35}?)\s*[:\-–]\s*(.+)$/iu;
  const mLead = leadWrapperRe.exec(lamViec);
  if (mLead && mLead[2].trim().length >= 3) {
    uniqPush(boiCanhParts, boiCanhSeen, mLead[1].trim());
    lamViec = mLead[2].trim();
  } else {
    lamViec = lamViec
      .replace(/^(?:mặt\s+hàng|hàng\s+hóa|hàng\s+hoá|tên\s+hàng|mô\s+tả)\s*[:\-–]?\s+/iu, '')
      .replace(/^(?:linh\s+kiện|phụ\s+kiện|phụ\s+tùng|sản\s+phẩm)\s*[:\-–]\s*/iu, '')
      .replace(/^sản\s+phẩm\s+(?=\p{L}{2,}\s+\p{L}{2,})/iu, '');
  }

  // 5. Bóc chất liệu từ mệnh đề giới từ ("bằng ...", "chất liệu ...", "thân ...") + n-gram nhanh.
  const clMenhDeRe = /(?:^|[\s,;])(?:chất\s+liệu|làm\s+bằng|làm\s+từ|từ\s+chất\s+liệu|bằng|vỏ\s+bằng|thân\s+bằng|khung\s+bằng|vỏ|thân|lõi|khung|đế)\s*[:=]?\s*([^,.;()\n]{2,45})/giu;
  lamViec = lamViec.replace(clMenhDeRe, (full, cum) => {
    const cumLow = cum.toLowerCase().trim();
    const ngrams = timChatLieuNgram(cumLow, idx.chatLieuSet);
    const khop = ngrams.find((g) => g.startTok === 0)?.cl || (ngrams[0]?.cl);
    if (khop) {
      uniqPush(chatLieuList, chatLieuSeen, khop);
      const idxKhop = cumLow.indexOf(khop);
      const phanSau = cum.slice(idxKhop + khop.length).trim();
      return phanSau ? ` ${phanSau}` : ' ';
    }
    return full;
  });

  for (const g of timChatLieuNgram(lamViec, idx.chatLieuSet)) {
    const nhieuTu = g.cl.includes(' ');
    if (!nhieuTu && !DAC_TRUNG_CHAT_LIEU_DON_RE.test(g.cl)) continue;
    uniqPush(chatLieuList, chatLieuSeen, g.cl);
  }

  // 6. Bóc bối cảnh sử dụng / đối tượng / công dụng.
  // Gỡ vế sau dấu phẩy chỉ mang thông số/chất liệu rỗng trước khi xét bối cảnh cuối cụm đầu.
  const bcTapRe = /^(.{3,}?)\s+(tập\s+(?:gym|thể\s*hình|thể\s*dục|yoga|luyện(?:\s+\p{L}+){0,2}))(?=$|[,;()\n])/iu;
  const bcDungRe = /\s*(?:,|;|\s)\s*(?:chuyên\s+dùng\s+(?:cho|trong|để)|dùng\s+(?:cho|trong|để|tại|điều\s+khiển)|sử\s+dụng\s+(?:cho|trong|để)|phục\s+vụ(?:\s+cho)?|lắp\s+(?:cho|vào|trên)|gắn\s+(?:cho|trên)|cho\s+(?:xe|máy|ô\s*tô|điện\s*thoại|trẻ\s*em|người|gia\s*đình|văn\s*phòng|công\s*nghiệp|nhà|phòng|y\s*tế|thể\s*thao|tập|thiết\s*bị|hệ\s*thống))\s*[^,.;()\n]*/iu;

  const mTap = bcTapRe.exec(lamViec);
  if (mTap) {
    lamViec = mTap[1].trim();
    uniqPush(boiCanhParts, boiCanhSeen, mTap[2].trim());
  } else {
    const mBc = bcDungRe.exec(lamViec);
    if (mBc && mBc.index >= 4) {
      const truoc = lamViec.slice(0, mBc.index).replace(/[,;:\s-]+$/, '').trim();
      const sau = mBc[0].replace(/^[,;\s]+/, '').trim();
      if (truoc.split(/\s+/).length >= 2 && sau.length >= 4) {
        lamViec = truoc;
        uniqPush(boiCanhParts, boiCanhSeen, sau);
      }
    }
  }

  // Cắt mệnh đề phụ sau dấu phẩy/chấm phẩy khi vế đầu đã là danh ngữ >= 2 từ.
  const partsDau = lamViec.split(/\s*[;,]\s*/).map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean);
  let tenChinh = partsDau.length > 1 && partsDau[0].split(/\s+/).length >= 2 ? partsDau[0] : lamViec;

  // Kiểm tra nhanh nếu cuối `tenChinh` có bối cảnh mẫu (vd "máy bơm nước gia đình" -> "máy bơm nước" + "gia đình"),
  // nhưng KHÔNG cắt "trẻ em" / "trong nhà" vì là cụm phân định nhóm HS ("quần áo trẻ em" 6111, "dép đi trong nhà" 6405).
  if (!boiCanhParts.length) {
    const tTokens = tenChinh.toLowerCase().split(/\s+/).filter(Boolean);
    for (let len = Math.min(4, tTokens.length - 2); len >= 2; len -= 1) {
      const tail = tTokens.slice(tTokens.length - len).join(' ');
      if (tail === 'trẻ em' || tail === 'trong nhà' || tail === 'ngoài trời') continue;
      if (idx.boiCanhSet.has(tail)) {
        const headTail = tTokens.slice(0, tTokens.length - len).join(' ');
        if (/^(?:đi|làm|mặc|đeo|ngồi|nằm|uống|ăn)$/iu.test(tTokens[tTokens.length - len - 1] || '')) continue;
        tenChinh = headTail.length >= 4 ? tenChinh.split(/\s+/).slice(0, tTokens.length - len).join(' ') : tenChinh;
        uniqPush(boiCanhParts, boiCanhSeen, tail);
        break;
      }
    }
  }

  if (inputObj?.congDung || inputObj?.chucNang) {
    const cd = khoiPhucDau(suaLoiChinhTa(moVietTat(String(inputObj.congDung || inputObj.chucNang), idx), idx), idx);
    if (cd && cd.toLowerCase() !== tenChinh.toLowerCase()) {
      uniqPush(boiCanhParts, boiCanhSeen, cd);
    }
  }

  tenChinh = tenChinh
    .replace(/^[,\s.;:\-–()]+|[,\s.;:\-–()]+$/g, '')
    .replace(/(?<![\p{L}\p{N}])(?:bằng|dùng|cho|phục\s+vụ|chuyên\s+dùng|với|và|kèm)$/iu, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (tenChinh.length < 2) {
    const fallbackTen = khoiPhucDau(
      suaLoiChinhTa(moVietTat(String(inputObj?.tenHang || cauGoc || ''), idx), idx),
      idx,
    )
      .replace(/(?<![\p{L}\p{N}])mới\s*100%(?![\p{L}\p{N}%])/giu, '')
      .replace(/[,;()]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    tenChinh = fallbackTen.split(/\s+/).slice(0, 10).join(' ').trim();
  }

  return {
    tenChinh: tenChinh.toLowerCase(),
    chatLieu: chatLieuList.join(', '),
    boiCanh: boiCanhParts.join('; '),
    thongSo,
    modelHang,
  };
}

function dungCacCauTim({ tenChinh, chatLieu, boiCanh, cauCoDauSach }) {
  const cacCauTim = [];
  const seen = new Set();
  const pushQuery = (cau, trongSo, loai) => {
    const s = String(cau || '').replace(/\s+/g, ' ').trim();
    if (!s || s.length < 2) return;
    const key = s.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    cacCauTim.push({ cau: s, trongSo, loai });
  };

  if (tenChinh) pushQuery(tenChinh, 1.0, 'tenChinh');

  if (cauCoDauSach) pushQuery(cauCoDauSach, 0.85, 'cauCoDau');

  if (tenChinh && chatLieu) {
    const firstMat = chatLieu.split(',')[0].trim();
    if (firstMat && !tenChinh.toLowerCase().includes(firstMat.toLowerCase())) {
      pushQuery(`${tenChinh} ${firstMat}`, 0.55, 'tenChinhChatLieu');
    }
  }

  // Bối cảnh có trọng số thấp nhất — không bao giờ đứng một mình làm câu tìm chính.
  if (tenChinh && boiCanh) {
    const bcChinh = boiCanh.split(';')[0].trim();
    if (bcChinh && bcChinh.length >= 3) {
      pushQuery(bcChinh, 0.15, 'boiCanh');
    }
  }

  return cacCauTim;
}

/**
 * Tiền xử lý câu hỏi đầu vào (chuỗi hoặc object hồ sơ hàng hoá).
 * @param {string|object} input
 * @param {object} [opts]
 */
function tienXuLy(input, opts = {}) {
  const dict = taiTuDien(opts.tuDien);
  const idx = chuanBiChiMuc(dict);

  const laObj = input && typeof input === 'object' && !Array.isArray(input);
  const inputObj = laObj ? input : null;
  const catTran = (v) => String(v || '').trim().slice(0, TRAN_CAU_XU_LY).trim();
  const rawTen = laObj
    ? catTran(input.tenHang || input.productName || input.name || '')
    : catTran(input);
  const rawParts = laObj
    ? [rawTen, input.chatLieu, input.congDung, input.chucNang, Array.isArray(input.specs) ? input.specs.join(', ') : input.specs, input.customerDescription]
      .map(catTran)
      .filter(Boolean)
    : (rawTen ? [rawTen] : []);

  const cauGoc = rawParts.join(', ').replace(/\s+/g, ' ').trim().slice(0, TRAN_CAU_XU_LY).trim();
  if (!cauGoc) {
    return {
      cauGoc: '',
      cauDaMoVietTat: '',
      cauCoDau: '',
      tenChinh: '',
      chatLieu: '',
      boiCanh: '',
      thongSo: [],
      modelHang: [],
      cacCauTim: [],
      coChuHan: false,
    };
  }

  const coChuHan = CHU_HAN.test(rawTen || cauGoc);
  if (coChuHan && !CO_DAU_VI.test(rawTen || cauGoc)) {
    const phiHan = (rawTen || cauGoc).replace(/[\u4e00-\u9fff]/g, ' ').trim();
    const coTuViet = phiHan.split(/\s+/).some((w) => /^[a-z]{3,}$/i.test(w) && idx.don[w.toLowerCase()]);
    if (!coTuViet) {
      return {
        cauGoc,
        cauDaMoVietTat: cauGoc,
        cauCoDau: cauGoc,
        tenChinh: '',
        chatLieu: '',
        boiCanh: '',
        thongSo: [],
        modelHang: [],
        cacCauTim: [],
        coChuHan: true,
      };
    }
  }

  const chuoiChinh = rawTen || cauGoc;
  const daMoChinh = moVietTat(chuoiChinh, idx);
  const daSuaChinh = suaLoiChinhTa(daMoChinh, idx);
  const coDauChinh = khoiPhucDau(daSuaChinh, idx);

  let cauDaMoVietTat = daMoChinh;
  let cauCoDau = coDauChinh;
  if (laObj && chuoiChinh !== cauGoc) {
    const moTungTruong = [];
    const coDauTungTruong = [];
    if (rawTen) {
      moTungTruong.push(daMoChinh);
      coDauTungTruong.push(coDauChinh);
    }
    const pushExtra = (val, kpOpts) => {
      const s = String(val || '').trim();
      if (!s) return;
      const mo = moVietTat(s, idx);
      moTungTruong.push(mo);
      coDauTungTruong.push(khoiPhucDau(suaLoiChinhTa(mo, idx), idx, kpOpts));
    };
    pushExtra(inputObj.chatLieu, { preferChatLieu: true });
    pushExtra(inputObj.congDung);
    pushExtra(inputObj.chucNang);
    pushExtra(inputObj.specs);
    pushExtra(inputObj.customerDescription);
    cauDaMoVietTat = moTungTruong.join(', ').replace(/\s+/g, ' ').trim();
    cauCoDau = coDauTungTruong.join(', ').replace(/\s+/g, ' ').trim();
  } else if (chuoiChinh !== cauGoc) {
    cauDaMoVietTat = moVietTat(cauGoc, idx);
    cauCoDau = khoiPhucDau(suaLoiChinhTa(cauDaMoVietTat, idx), idx);
  }

  const extracted = trichXuatTruong(chuoiChinh, coDauChinh, inputObj, idx);
  const cauCoDauSach = cauCoDau
    .replace(/(?<![\p{L}\p{N}])mới\s*100%(?![\p{L}\p{N}%])/giu, '')
    .replace(/\s+/g, ' ')
    .replace(/^[,\s.;]+|[,\s.;]+$/g, '')
    .trim();

  const cacCauTim = dungCacCauTim({
    tenChinh: extracted.tenChinh,
    chatLieu: extracted.chatLieu,
    boiCanh: extracted.boiCanh,
    cauCoDauSach,
  });

  return {
    cauGoc,
    cauDaMoVietTat,
    cauCoDau,
    tenChinh: extracted.tenChinh,
    chatLieu: extracted.chatLieu,
    boiCanh: extracted.boiCanh,
    thongSo: extracted.thongSo,
    modelHang: extracted.modelHang,
    cacCauTim,
    coChuHan,
  };
}

module.exports = {
  bat,
  tienXuLy,
  boDau,
  moVietTat,
  suaLoiChinhTa,
  khoiPhucDau,
  taiTuDien,
};
