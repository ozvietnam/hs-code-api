// scripts/lib-luat.mjs — đồ dùng chung cho các cổng máy của docs/luat-duong-khach.md.
// Chỉ đọc tệp (fs), không nạp mã sản phẩm, không LLM, không mạng.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// `new URL(...).pathname` cho '/C:/...' trên Windows — fs hiểu thành C:\C:\... và mọi cổng máy
// dùng chung đồ dùng này chết. fileURLToPath là quy ước 170 tệp khác trong repo đã dùng.
export const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const doc = (tep) => fs.readFileSync(path.join(GOC, tep), 'utf8');
export const docJson = (tep) => JSON.parse(doc(tep));
export const co = (tep) => fs.existsSync(path.join(GOC, tep));

/** Mọi tệp .js/.mjs dưới một thư mục (đệ quy), đường dẫn tương đối so với gốc repo. */
export function tepMa(thuMuc) {
  const ra = [];
  const di = (d) => {
    for (const e of fs.readdirSync(path.join(GOC, d), { withFileTypes: true })) {
      const p = path.posix.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules') di(p); } else if (/\.(js|mjs)$/.test(e.name)) ra.push(p);
    }
  };
  if (co(thuMuc)) di(thuMuc);
  return ra.sort();
}

/** Tệp mã của sản phẩm: lib/**, api/**, server.js. */
export const tepSanPham = () => [...tepMa('lib'), ...tepMa('api'), 'server.js'];

const RE_NAP = /(?:require\(\s*|from\s+|import\(\s*|import\s+)['"](\.{1,2}\/[^'"]+)['"]/g;

/** Các tệp mà `tep` nạp trực tiếp bằng đường dẫn tương đối (require / import). */
export function napTrucTiep(tep) {
  let s;
  try { s = doc(tep); } catch { return []; }
  const ra = [];
  for (const m of s.matchAll(RE_NAP)) {
    const p = path.posix.normalize(path.posix.join(path.posix.dirname(tep), m[1]));
    const ung = [p, `${p}.js`, `${p}.mjs`, `${p}/index.js`].find((x) => co(x) && fs.statSync(path.join(GOC, x)).isFile());
    if (ung) ra.push(ung);
  }
  return ra;
}

const _dong = new Map();
/** Bao đóng nạp: mọi tệp mà `tep` nạp được, trực tiếp hay gián tiếp (gồm chính nó). */
export function baoDong(tep) {
  if (_dong.has(tep)) return _dong.get(tep);
  const thay = baoDongBo(tep, () => false);
  _dong.set(tep, thay);
  return thay;
}

/** Bao đóng nạp nhưng bỏ các cạnh mà `boCanh(tu, den)` trả true (dùng cho "nạp mượn hàm, không đọc kho"). */
export function baoDongBo(tep, boCanh) {
  const thay = new Set([tep]);
  const hang = [tep];
  while (hang.length) { const tu = hang.pop(); for (const d of napTrucTiep(tu)) if (!thay.has(d) && !boCanh(tu, d)) { thay.add(d); hang.push(d); } }
  return thay;
}

/** Tên các hàm mà `tep` lấy ra khi require `moDun` kiểu `const { a, b } = require(...)`; null nếu có chỗ nạp không phải kiểu đó. */
export function tenLayTu(tep, moDun) {
  const goc = moDun.replace(/^.*\//, "").replace(/\.js$/, "");
  const s = doc(tep);
  const moi = [...s.matchAll(new RegExp(`require\\(\\s*[\x27"][^\x27"]*/${goc}(?:\\.js)?[\x27"]\\s*\\)`, "g"))];
  const co = [...s.matchAll(new RegExp(`\\{([^{}]*)\\}\\s*=\\s*require\\(\\s*[\x27"][^\x27"]*/${goc}(?:\\.js)?[\x27"]\\s*\\)`, "g"))];
  if (!moi.length || moi.length !== co.length) return null;
  return [...new Set(co.flatMap((m) => m[1].split(",").map((x) => x.split(":")[0].trim()).filter(Boolean)))];
}

/** Bộ in PASS/FAIL theo khuôn scripts/dem-ca-test.mjs đếm được. */
export function boKiem(ten) {
  let dat = 0; let hong = 0;
  const kiem = (moTa, dieuKien, chiTiet = '') => {
    if (dieuKien) { dat += 1; console.log(`PASS ${moTa}`); } else { hong += 1; console.log(`FAIL ${moTa}${chiTiet ? ` — ${chiTiet}` : ''}`); }
    return Boolean(dieuKien);
  };
  const xong = () => { console.log(`${ten}: ${dat} passed, ${hong} failed`); process.exit(hong ? 1 : 0); };
  return { kiem, xong };
}

/** Tên cờ HS_* mà một đoạn mã đọc: `process.env.HS_X` hoặc chuỗi 'HS_X' (đọc gián tiếp qua process.env[ten]). */
export function coTrongDoan(s) {
  const ra = new Set();
  for (const m of s.matchAll(/process\.env\.(HS_[A-Z0-9_]+)/g)) ra.add(m[1]);
  for (const m of s.matchAll(/['"`](HS_[A-Z0-9_]+)['"`]/g)) ra.add(m[1]);
  return ra;
}
