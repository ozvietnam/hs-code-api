/**
 * Hàm dùng chung cho bench mô tả ECUS (Đợt 0C): scripts/bench-mo-ta.mjs + scripts/check-mo-ta-bo-de.mjs.
 * Chỉ đọc data/, không ghi gì. Không chứa dữ liệu Oz.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

/** Bỏ dấu tiếng Việt + hạ chữ thường (đ → d). */
export function fold(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

/** Chuỗi có khớp TẤT CẢ biểu thức trong tuKhoa không (so cả bản có dấu và bỏ dấu). */
export function khopTuKhoa(text, tuKhoa = []) {
  const t = String(text || '').toLowerCase();
  const f = fold(text);
  return tuKhoa.every((re) => {
    try {
      return new RegExp(re, 'iu').test(t) || new RegExp(fold(re), 'i').test(f);
    } catch { return false; }
  });
}

/** Token hoá để đo Jaccard (bỏ dấu, tách theo ký tự không phải chữ/số). */
export function tokens(s) {
  return new Set(fold(s).split(/[^a-z0-9%]+/).filter((w) => w.length >= 2));
}
export function jaccard(a, b) {
  const A = tokens(a); const B = tokens(b);
  if (!A.size && !B.size) return 1;
  let i = 0; for (const x of A) if (B.has(x)) i += 1;
  return i / (A.size + B.size - i);
}

// ── Đọc tệp data/ để kiểm chuỗi trích ────────────────────────────────────────────────────────────────────────────────
const cache = new Map();
/** Nạp tệp nguồn (json | jsonl | jsonl.gz) → { kind, value | lines }. */
export function loadSource(rel) {
  if (cache.has(rel)) return cache.get(rel);
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) { cache.set(rel, null); return null; }
  let raw = fs.readFileSync(p);
  if (rel.endsWith('.gz')) raw = zlib.gunzipSync(raw);
  const txt = raw.toString('utf8');
  let out;
  if (/\.jsonl(\.gz)?$/.test(rel)) out = { kind: 'jsonl', value: txt.split('\n').filter(Boolean).map((l) => JSON.parse(l)) };
  else out = { kind: 'json', value: JSON.parse(txt) };
  cache.set(rel, out);
  return out;
}

/** Mọi chuỗi lá trong một giá trị JSON. */
export function stringLeaves(v, out = []) {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) for (const x of v) stringLeaves(x, out);
  else if (v && typeof v === 'object') for (const x of Object.values(v)) stringLeaves(x, out);
  return out;
}

/** "85444299[9].productName" | "9403.nhom" → giá trị tại đường dẫn (khoá đầu là khoá object, có thể là số). */
export function atPath(root, viTri) {
  const toks = String(viTri).match(/\[\d+\]|[^.[\]]+/g) || [];
  let cur = root;
  for (const t of toks) {
    if (cur == null) return undefined;
    if (t.startsWith('[')) cur = cur[Number(t.slice(1, -1))];
    else cur = cur[t];
  }
  return cur;
}

const leafCache = new Map();
/** Chuỗi trích có NGUYÊN VĂN trong tệp (tại viTri nếu có) không. */
export function trichCoThat(rel, trich, viTri) {
  const src = loadSource(rel);
  if (!src) return { ok: false, lyDo: `không có tệp ${rel}` };
  if (!trich || typeof trich !== 'string') return { ok: false, lyDo: 'thiếu trich' };
  const scope = viTri ? atPath(src.value, viTri) : src.value;
  if (scope === undefined) return { ok: false, lyDo: `không có viTri ${viTri} trong ${rel}` };
  // Cả tệp (không viTri): gom lá một lần rồi dùng lại — bộ đề lát 1 có hàng trăm chuỗi trích trên cùng biểu thuế.
  let leaves;
  if (viTri) leaves = stringLeaves(scope);
  else { if (!leafCache.has(rel)) leafCache.set(rel, stringLeaves(scope)); leaves = leafCache.get(rel); }
  const ok = leaves.some((s) => s.includes(trich));
  return ok ? { ok: true } : { ok: false, lyDo: `không thấy nguyên văn trong ${rel}${viTri ? `#${viTri}` : ''}: "${trich.slice(0, 80)}"` };
}

// ── Chỉ số chuỗi mô tả (dùng cho bench) ───────────────────────────────────────────────────────────────────────────────
export const CHU_CAM = [
  { ma: 'cac_loai', re: /các loại/i },
  { ma: 'loai_khac', re: /loại khác/i },
  { ma: 'hoac', re: /(^|[\s,(])hoặc([\s,)]|$)/i },
  { ma: 'ke_ca', re: /kể cả/i },
  { ma: 'khong_gom', re: /không gồm/i },
];

let fieldCatalog = null;
function catalog() {
  if (!fieldCatalog) fieldCatalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'chapter-declaration-fields.json'), 'utf8'));
  return fieldCatalog;
}

/** Trường bắt buộc của chương (data/chapter-declaration-fields.json) có mặt trong chuỗi: { apDung, co, thieu[] }. */
export function truongBatBuoc(text, chuong) {
  const cat = catalog();
  const rule = cat.chapters?.[chuong];
  if (!rule || !rule.required?.length) return { apDung: false, co: 0, tong: 0, thieu: [] };
  const raw = String(text || ''); const folded = fold(raw);
  const thieu = [];
  for (const key of rule.required) {
    const f = cat.fields?.[key];
    const pats = f?.patterns || [];
    const hit = pats.some((p) => {
      try { return new RegExp(p, 'iu').test(raw) || new RegExp(fold(p), 'i').test(folded); } catch { return false; }
    });
    if (!hit) thieu.push(key);
  }
  return { apDung: true, co: rule.required.length - thieu.length, tong: rule.required.length, thieu };
}

/** Bộ chỉ số tất định của một chuỗi mô tả. */
export function chiSoMoTa(text, chuong) {
  const s = String(text || '');
  const tb = truongBatBuoc(s, chuong);
  return {
    doDai: s.length,
    le200: s.length <= 200,
    coDauNgan: /[,;]/.test(s),
    coXuatXu: /xuất xứ/i.test(s),
    chuCam: CHU_CAM.filter((c) => c.re.test(s)).map((c) => c.ma),
    coHieu: /(hiệu|nhãn hiệu|thương hiệu|brand)\s*[:]?\s*\S|không (nhãn )?hiệu|no brand/i.test(s),
    coKT: /\b(kt|kích thước)\b|\d+(?:[.,]\d+)?\s*(?:x|\*|×)\s*\d+|\b\d+(?:[.,]\d+)?\s*(?:mm|cm|m)\b/i.test(s),
    truongBatBuoc: tb,
  };
}

/** Đọc bộ đề công khai. */
export function docBoDe(p = path.join(ROOT, 'data', 'bench', 'mo-ta-bo-de.json')) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
