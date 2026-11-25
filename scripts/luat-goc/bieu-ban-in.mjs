// scripts/luat-goc/bieu-ban-in.mjs — đọc danh sách phân nhóm in ngay dưới tiêu đề mỗi nhóm trong bản in Chú giải chi tiết HS 2022
// (các bản chữ cgct-hs2022*.txt). Chỉ đọc, tất định; KHÔNG dùng biểu thuế để sửa bản in.
import fs from 'node:fs';
import path from 'node:path';

const RE_NHOM = /^\s*[(*]*\s*(\d{2})(?:\s?\.\s?|(?=\d{2}\s*[-–—]\s*\p{Lu}))(\d{2})(?:\s*[-–—−.:]+\s*(\S.*)|\s+(\p{Lu}.*))$/u;
const RE_MA = /^\s*[(*]*(\d\s?\d\s?\.?\s?\d\d\s?[.,–-]\s?\d\d|\d{2}\.?\d{2}\s\d{2}(?=\s*[-–—−])|\d{6}(?=\s*[-–—−]))(?:\.00)?\s*[.:]?\s*((?:[-–—−]\s*)*)(.*)$/;
const RE_GACH = /^\s*((?:[-–—−]\s*)+)(\S.*)$/;
const RE_TRANG = /^\s*[—–-]?\s*\d{1,4}\s*[—–-]?\s*$/;
const demGach = (s) => (s.match(/[-–—−]/g) || []).length;

/** Các dòng (kèm trang) của một bản chữ, bỏ dòng trống và dòng chỉ có số trang. */
function docDongChu(f) {
  const ra = []; fs.readFileSync(f, 'utf8').normalize('NFC').split('\f').forEach((t, i) => t.split('\n').forEach((d) => { if (d.trim() && !RE_TRANG.test(d)) ra.push({ chu: d.replace(/\s*[—–]\s*\d{1,4}\s*[—–]\s*$/, ''), trang: i + 1 }); }));
  return ra;
}

/** Một bản chữ → Map nhóm → { trang, ten, muc: [{ma|null, gach, ten, trang}] } (mọi ứng viên; lấy khối có nhiều mã nhất). */
export function docMotBan(f) {
  const d = docDongChu(f); const ra = new Map();
  const dau = d.map((x, i) => { const m = RE_NHOM.exec(x.chu); return m && !RE_MA.test(x.chu) ? { i, h4: m[1] + m[2], ten: (m[3] || m[4]).trim() } : null; }).filter(Boolean);
  const coDau = new Set(dau.map((x) => x.h4));
  // nhóm in sai số ở dòng tiêu đề (90.29 in "90.20") hoặc mất dòng tiêu đề (73.02): lấy danh sách từ dòng mã đầu tiên, không có tên nhóm
  d.forEach((x, i) => { const k = RE_MA.exec(x.chu); const h4 = k && k[2] ? k[1].replace(/\D/g, '').slice(0, 4) : null; if (h4 && !coDau.has(h4) && /^\d{6}$/.test(k[1].replace(/\D/g, ''))) { coDau.add(h4); dau.push({ i: i - 1, h4, ten: '', moCoi: true }); } });
  for (const { i, h4, ten: ten0, moCoi } of dau) {
    const muc = []; const la = []; let ten = ten0; let cuoi = null; let cho = []; let xa = 0; let j = i + 1; let thayGach = false;
    for (; j < d.length && xa < 16; j += 1) {
      const c = d[j].chu; const k = RE_MA.exec(c); const g = RE_GACH.exec(c);
      const ma = k ? k[1].replace(/\D/g, '') : null;
      if (RE_NHOM.test(c) && !ma) break;
      if (ma && ma.startsWith(h4) && (k[2] || muc.some((x) => x.ma === null) || /^[\p{Lu}(]/u.test(k[3]))) {
        muc.push(...cho); cho = []; cuoi = { ma, gach: k[2] ? demGach(k[2]) : null, ten: k[3].trim(), trang: d[j].trang }; muc.push(cuoi); xa = 0; continue;
      }
      if (ma && k[2]) { cuoi = null; xa += 1; la.push({ ma, ten: k[3].trim(), trang: d[j].trang }); continue; } // mã nhóm khác giữa danh sách: nghi lỗi in
      xa += 1;
      if (g) { thayGach = true; cuoi = { ma: null, gach: demGach(g[1]), ten: g[2].trim(), trang: d[j].trang }; cho.push(cuoi); continue; }
      if (cuoi) { if ((cuoi.noi || 0) < 9) { cuoi.ten += ` ${c.trim()}`; cuoi.noi = (cuoi.noi || 0) + 1; } } else if (!thayGach && xa < 7) ten += ` ${c.trim()}`;
    }
    const kho = { trang: d[i].trang, ten, muc, la, ...(moCoi ? { moCoi: true } : {}) };
    const cu = ra.get(h4); const soMa = (x) => x.muc.filter((y) => y.ma).length;
    if (moCoi && soMa(kho) < 2) continue; // số lẻ trong bảng (mã CAS), không phải danh sách phân nhóm
    if (!cu || soMa(kho) > soMa(cu)) ra.set(h4, kho);
  }
  return ra;
}

/** Mọi bản chữ: Map tên tệp → docMotBan; dấu (+) (mã → trang) khi tên nhóm/phân nhóm trong bản in mang "(+)". */
export function docBanIn(thuMuc) {
  const ban = new Map(); const dauCong = new Map();
  for (const f of fs.readdirSync(thuMuc).filter((x) => /^cgct-hs2022.*\.txt$/.test(x)).sort()) ban.set(f, docMotBan(path.join(thuMuc, f)));
  for (const b of ban.values()) for (const [h4, x] of b) {
    const dauTen = x.muc.length ? x.ten : x.ten.slice(0, 400);
    if (/\(\+\)/.test(dauTen) && !dauCong.has(h4)) dauCong.set(h4, x.trang);
    x.muc.forEach((y, i) => { const t = i === x.muc.length - 1 ? y.ten.slice(0, 200) : y.ten; if (y.ma && /\(\+\)/.test(t) && !dauCong.has(y.ma)) dauCong.set(y.ma, y.trang); });
  }
  return { ban, dauCong };
}
