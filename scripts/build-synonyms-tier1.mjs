#!/usr/bin/env node
/**
 * build-synonyms-tier1.mjs — sinh `data/synonyms.json` tier 1 (#309).
 *
 * Từ vựng chính tắc EN: mỗi mã HS ↔ các cụm chức năng tiếng Anh NGUYÊN VĂN,
 * `phapLy: true`, kèm nguồn trích dẫn từng cụm (tệp + trường + đoạn trích).
 *
 * LUẬT SẮT — 0 cụm LLM tự chế: script này KHÔNG sinh chữ. Mọi cụm đều là
 * lát cắt contiguous (nguyên văn từng ký tự) của trường nguồn, và
 * `scripts/test-synonyms.mjs` kiểm lại độc lập chuỗi en ⊆ trich ⊆ nguồn thật.
 *
 * Mỏ dùng được (có EN nguyên văn):
 *   1. data/wco-hs-international.csv — danh pháp HS EN (level 2/4/6):
 *      mô tả đầy đủ + n-gram theo dấu ";", cắt ĐUÔI LOẠI TRỪ
 *      (", other than …" / ", excluding …") để không biến hàng bị loại thành
 *      từ đồng nghĩa (cùng tinh thần test-exclusion-polarity).
 *   2. data/wco-op/opinions.json — trường `text` EN nguyên văn (OCR):
 *      nhãn "N. <cụm> :", cụm danh từ đầu câu, alias trong ngoặc kép,
 *      pattern "known as". Chỉ ý kiến qua cổng mã/thứ tự (không headingSuspect)
 *      — giống cổng của lib/wco-op.js. Attribution: BAN_QUYEN lấy nguyên văn
 *      từ lib/wco-op.js, ghi vào meta.
 *
 * Mỏ BỎ (toàn tiếng Việt — không có EN nguyên văn để bóc, KHÔNG dịch máy,
 * theo brief #309): data/sen-2022.json, data/explanatory-notes.json
 * (0 kết quả pattern "also known as"/"commonly known as" trong cả hai).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const { BAN_QUYEN } = require(path.join(ROOT, 'lib', 'wco-op.js'));

const TAP_CSV = 'data/wco-hs-international.csv';
const TAP_OP = 'data/wco-op/opinions.json';

// ---------------------------------------------------------------- helpers
const wsNorm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const VI_DIACRITICS = /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i;
const ALLOWED_CHARS = /^[A-Za-z0-9"'“”‘’(),.;:%\/+&\-\s!*?=]+$/;
const GENERIC_1WORD = new Set(['machinery', 'machine', 'machines', 'apparatus', 'other', 'others', 'part', 'parts', 'live', 'thereof', 'nes', 'nec', 'preparations', 'articles', 'products', 'goods']);
const EXCL_MARKER = /,\s*(?:\b(?:other than|but not|excluding|except(?=\s))\b)/i;
const BAD_START = /^(?:n\.e\.c\.|application of|adoption|other\b|others\b|than\b)/i;

const words = (s) => wsNorm(s).split(/\s+/).filter(Boolean);

/** Cổng chất lượng cụm: sạch tiếng Việt, charset EN, độ dài 1–40 từ, không phải mảnh vụn tra mã. */
function cumHopLe(en) {
  const s = wsNorm(en);
  if (s.length < 3) return false;
  const w = words(s);
  if (w.length < 1 || w.length > 40) return false;
  if (VI_DIACRITICS.test(s)) return false;
  if (!ALLOWED_CHARS.test(s)) return false;
  if (!/^[A-Za-z]/.test(s)) return false;
  if (BAD_START.test(s)) return false;
  if (/heading no\.|item no\./i.test(s)) return false;
  if (w.length === 1 && (s.length < 6 || GENERIC_1WORD.has(s.toLowerCase()))) return false;
  return true;
}

/** Cắt đuôi loại trừ (", other than …") — phần giữ lại vẫn là lát cắt nguyên văn. */
function catDuoiLoaiTru(s) {
  const m = EXCL_MARKER.exec(s);
  return m ? s.slice(0, m.index).trim() : s.trim();
}

// ---------------------------------------------------------------- mỏ 1: csv danh pháp
function parseCsv() {
  const raw = fs.readFileSync(path.join(DATA, 'wco-hs-international.csv'), 'utf8');
  const rows = [];
  let lineNo = 0;
  for (const line of raw.split(/\r?\n/)) {
    lineNo++;
    if (!line.trim() || lineNo === 1) continue;
    const cols = [];
    let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q;
      } else if (ch === ',' && !q) { cols.push(cur); cur = ''; } else cur += ch;
    }
    cols.push(cur);
    rows.push({ hscode: String(cols[1] || '').trim(), description: String(cols[2] || '').trim(), level: String(cols[4] || '').trim() });
  }
  return rows;
}

function bocCsv() {
  const out = new Map(); // ma → cum[]
  for (const r of parseCsv()) {
    if (!/^\d{2,8}$/.test(r.hscode) || !r.description) continue;
    const candidates = [];
    const desc = wsNorm(r.description);
    const segments = desc.split(';').map((x) => x.trim()).filter(Boolean);
    // mô tả đầy đủ chỉ giữ khi KHÔNG chứa đuôi loại trừ (giữ nguyên văn cả câu)
    if (!EXCL_MARKER.test(desc)) candidates.push(desc);
    // n-gram theo ";": mỗi đoạn cắt bỏ phần loại trừ, phần còn lại vẫn nguyên văn
    for (const seg of segments) {
      const cat = catDuoiLoaiTru(seg);
      if (cat) candidates.push(cat);
    }
    const list = [];
    const seen = new Set();
    for (const en of candidates) {
      if (!cumHopLe(en)) continue;
      const key = en.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      list.push({
        en,
        phapLy: true,
        nhan: 'NGUYEN_VAN',
        nguon: { tap: TAP_CSV, truong: 'description', ma: r.hscode, level: r.level, trich: desc },
      });
    }
    if (list.length) out.set(r.hscode, list);
  }
  return out;
}

// ---------------------------------------------------------------- mỏ 2: wco-op opinions
function bocOpinions() {
  const arr = JSON.parse(fs.readFileSync(path.join(DATA, 'wco-op', 'opinions.json'), 'utf8'));
  const out = new Map();
  for (const o of (Array.isArray(arr) ? arr : [])) {
    // cổng giống lib/wco-op.js: ý kiến nghi OCR rơi mã KHÔNG được vào tier 1
    if (o.headingSuspect || !o.hs || !o.text || !/^\d{4,6}$/.test(String(o.hs))) continue;
    const text = o.text;
    const candidates = [];

    const blocks = text.split(/\n+/).map((b) => b.trim()).filter(Boolean);
    for (const b of blocks) {
      // A. nhãn "N. <cụm> :" — vd "1. Booths for paint-spraying :"
      const mA = /^\d+\.\s*(.+?)\s*:/.exec(b);
      if (mA) {
        candidates.push(mA[1]);
        continue; // khối đã có nhãn thì không bóc đầu câu nữa
      }
      // B. cụm danh từ đầu câu "N. <cụm>," / "N. <cụm>." — vd "Chicken cuts (meat of fowls … domesticus), …"
      const mB = /^\d+\.\s*/.exec(b);
      if (mB) {
        const rest = b.slice(mB[0].length);
        const mEnd = /[,;]/.exec(rest);
        const lead = mEnd ? rest.slice(0, mEnd.index) : rest.split('.')[0];
        if (lead && words(lead).length >= 2 && words(lead).length <= 15) candidates.push(wsNorm(lead));
      }
    }

    // C. pattern "also/commonly known as X" (issue #309)
    for (const mC of text.matchAll(/\b(?:also|commonly|sometimes|better) known as\s+([A-Za-z][^.;\n]{2,120})/gi)) {
      candidates.push(wsNorm(mC[1]));
    }

    // D. alias trong ngoặc kép “…” — vd “Dry booths”, “Wet booths”
    for (const mD of text.matchAll(/[“"]([A-Za-z][^“”"]{2,60})[”"]/g)) {
      const inner = wsNorm(mD[1]);
      const w = words(inner);
      if (w.length >= 1 && w.length <= 6) candidates.push(inner);
    }

    const list = out.get(String(o.hs)) || [];
    const seen = new Set(list.map((c) => c.en.toLowerCase()));
    for (const en of candidates) {
      if (!cumHopLe(en)) continue;
      const key = en.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      // trich: đoạn nguyên văn đủ ngữ cảnh chứa cụm (tối đa 240 ký tự quanh cụm)
      const idx = text.indexOf(en);
      let trich = en;
      if (idx >= 0) {
        const start = Math.max(0, text.lastIndexOf('\n', idx) + 1);
        trich = wsNorm(text.slice(start, Math.min(text.length, idx + en.length + 120)));
      }
      list.push({
        en,
        phapLy: true,
        nhan: 'NGUYEN_VAN',
        nguon: { tap: TAP_OP, truong: 'text', id: o.id, ma: String(o.hs), trich },
      });
    }
    if (list.length) out.set(String(o.hs), list);
  }
  return out;
}

// ---------------------------------------------------------------- gộp + ghi
function mergeMaps(a, b) {
  const out = new Map(a);
  for (const [ma, list] of b) {
    const cur = out.get(ma) || [];
    const seen = new Set(cur.map((c) => c.en.toLowerCase()));
    for (const c of list) {
      const key = c.en.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      cur.push(c);
    }
    out.set(ma, cur);
  }
  return out;
}

const csvMap = bocCsv();
const opMap = bocOpinions();
const merged = mergeMaps(csvMap, opMap);

const muc = {};
let tongSoCum = 0;
for (const ma of [...merged.keys()].sort()) {
  muc[ma] = merged.get(ma);
  tongSoCum += muc[ma].length;
}

const out = {
  meta: {
    tier: 1,
    moTa: 'Từ vựng chính tắc EN tier 1 (#309): mã HS ↔ cụm chức năng tiếng Anh NGUYÊN VĂN từ nguồn pháp lý/danh pháp. Mọi cụm qua máy kiểm scripts/test-synonyms.mjs (en ⊆ trich ⊆ nguồn thật); 0 cụm LLM tự chế. Nhãn NGUYEN_VAN theo lib/nguon-loai.js.',
    builtBy: 'scripts/build-synonyms-tier1.mjs',
    generatedAt: new Date().toISOString().slice(0, 10),
    nguon: [TAP_CSV, TAP_OP],
    nguonBoQua: [
      { tap: 'data/sen-2022.json', lyDo: 'SEN AHTN 2022 phần tiếng Việt (nguon trong tệp ghi rõ) — không có EN nguyên văn để bóc; theo brief #309: BỎ, không dịch máy.' },
      { tap: 'data/explanatory-notes.json', lyDo: 'noteVi toàn tiếng Việt, 0 pattern "also known as"/"commonly known as" EN — BỎ, không dịch máy.' },
    ],
    banQuyenWco: BAN_QUYEN,
    congWcoOp: 'Chỉ ý kiến không headingSuspect (cổng mã/thứ tự của lib/wco-op.js) được trích; nguyên văn là bản OCR có thể sai chữ.',
    tongSoMa: Object.keys(muc).length,
    tongSoCum,
  },
  muc,
};

fs.writeFileSync(path.join(DATA, 'synonyms.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`Đã sinh data/synonyms.json — ${out.meta.tongSoMa} mã, ${tongSoCum} cụm`);
console.log(`  csv danh pháp: ${[...csvMap.values()].reduce((s, l) => s + l.length, 0)} cụm / ${csvMap.size} mã`);
console.log(`  wco-op:        ${[...opMap.values()].reduce((s, l) => s + l.length, 0)} cụm / ${opMap.size} mã`);
