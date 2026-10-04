// lib/zh-specs.js — đọc thông số tiếng Trung (Taobao/Tmall/1688/Alibaba) về khóa trường
// khai báo chuẩn, dùng từ điển mở data/attribute-synonyms-zh.json.
//
// Không gọi AI: chỉ khớp nhãn. Phần không khớp được để /api/extract-specs gửi AI sau.
// Nhãn mơ hồ (容量 = dung tích hoặc bộ nhớ, 功能 = chức năng máy hoặc thiết bị) trả về mọi
// khóa ứng viên kèm ambiguous=true; bên dùng chọn khóa mà nhóm hàng cần.

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'attribute-synonyms-zh.json');
let _dict = null;
let _index = null;

function dictionary() {
  if (!_dict) {
    try { _dict = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { _dict = { keys: {} }; }
  }
  return _dict;
}

const norm = (s) => String(s || '').replace(/[\s　]/g, '').replace(/[（]/g, '(').replace(/[）]/g, ')').trim();

// nhãn zh (đã chuẩn hóa) → [khóa]
function labelIndex() {
  if (_index) return _index;
  const idx = new Map();
  for (const [key, def] of Object.entries(dictionary().keys || {})) {
    for (const z of def.zh || []) {
      const n = norm(z);
      if (!idx.has(n)) idx.set(n, []);
      if (!idx.get(n).includes(key)) idx.get(n).push(key);
    }
  }
  _index = idx;
  return idx;
}

/** Nhãn tiếng Trung → các khóa chuẩn. Khớp đúng trước; không có thì lấy nhãn từ điển dài nhất nằm trong nhãn. */
function keysForLabel(label) {
  const n = norm(label);
  if (!n) return [];
  const idx = labelIndex();
  if (idx.has(n)) return idx.get(n);
  let best = null;
  for (const [z, keys] of idx) {
    if (z.length >= 2 && n.includes(z) && (!best || z.length > best.z.length)) best = { z, keys };
  }
  return best ? best.keys : [];
}

const CJK = /[㐀-鿿]/;
// "材质：304不锈钢" / "额定功率: 1500W" — nhãn ngắn có chữ Hán, rồi dấu hai chấm, rồi giá trị.
const PAIR_RE = /([㐀-鿿A-Za-z()（）/]{1,14})\s*[:：]\s*([^\n\r;；|｜]{1,80}?)(?=\s{2,}|[\n\r;；|｜]|\s+[㐀-鿿A-Za-z()（）/]{1,14}\s*[:：]|$)/g;

/** Tách cặp nhãn:giá trị từ một đoạn chữ (thông số dán liền, chữ OCR). */
function pairsFromText(text) {
  const out = [];
  const s = String(text || '');
  let m;
  PAIR_RE.lastIndex = 0;
  while ((m = PAIR_RE.exec(s))) {
    const label = m[1].trim();
    const value = m[2].trim().replace(/[，,。]+$/, '');
    if (CJK.test(label) && value) out.push({ label, value });
  }
  return out;
}

/**
 * extractZhSpecs({ specs, texts }) → [{ key, labelVi, value, rawLabel, ambiguous, evidence }]
 *   specs: [{ key|label, value }] (thông số addon thu trên trang) hoặc chuỗi
 *   texts: [{ url, text }] (chữ OCR trong ảnh) hoặc chuỗi
 */
function extractZhSpecs({ specs, texts } = {}) {
  const keysDef = dictionary().keys || {};
  const rows = [];
  const add = (label, value, evidence) => {
    const keys = keysForLabel(label);
    for (const key of keys) {
      rows.push({
        key,
        labelVi: keysDef[key]?.labelVi || key,
        value: String(value).trim(),
        rawLabel: label,
        ambiguous: keys.length > 1,
        evidence,
      });
    }
  };
  if (Array.isArray(specs)) {
    for (const s of specs) {
      const label = s?.key ?? s?.label ?? s?.name;
      if (label && s?.value != null && String(s.value).trim()) add(label, s.value, { source: 'SITE', text: `${label}：${s.value}` });
    }
  } else if (typeof specs === 'string') {
    for (const p of pairsFromText(specs)) add(p.label, p.value, { source: 'SITE', text: `${p.label}：${p.value}` });
  }
  const list = Array.isArray(texts) ? texts : (typeof texts === 'string' ? [{ text: texts }] : []);
  for (const t of list) {
    for (const p of pairsFromText(t?.text)) {
      add(p.label, p.value, { source: 'IMAGE_OCR', imageUrl: t?.url || null, text: `${p.label}：${p.value}` });
    }
  }
  // Bỏ trùng (cùng khóa + cùng giá trị), giữ bản đầu (trang nguồn trước chữ trong ảnh).
  const seen = new Set();
  return rows.filter((r) => {
    const k = `${r.key}|${r.value}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Tập khóa đã có giá trị trong chữ tiếng Trung của hồ sơ (để danh sách còn thiếu không đòi lại). */
function presentKeysFromZh(...sources) {
  const keys = new Set();
  for (const src of sources) {
    if (!src) continue;
    for (const r of extractZhSpecs(typeof src === 'string' || Array.isArray(src) ? { specs: src } : src)) keys.add(r.key);
  }
  return keys;
}

module.exports = { dictionary, keysForLabel, pairsFromText, extractZhSpecs, presentKeysFromZh };
