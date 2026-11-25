// scripts/luat-goc/thong-bao-toan-van.mjs — rút nguyên văn từ toàn văn thông báo (ngoài repo). Tất định, không AI: chỉ cắt theo tiêu đề mục in trong văn bản.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { gon } from './thong-bao-doc.mjs';

const KQ = /(?:\d\s*\.\s*)?K[ếấ]t quả (?:phân loại|xác định trước [Mm][ãà] số)\s*(?::|(?=Tên thương mại|Tên gọi|Theo |Trên cơ sở))/g;
const KB = /(?:1\s*\.\s*)?(?:Tên hàng theo khai báo|Hàng hóa đề nghị xác định trước mã số(?: do tổ chức, cá nhân cung cấp)?)\s*:/;
const HET_KB = /\s(?:2\s*\.\s*[A-ZĐ]|[ĐD]ơn vị |Doanh nghiệp (?:xuất|nhập)|Tóm tắt mô tả|Số, ngày|Địa chỉ|MST|Mã số thuế)/;
const HET = /[./\s]*(?:Thông báo này|Kết quả xác định trước mã số trên|Nơi nhận|Tổng cục Hải quan thông báo|Cục Hải quan thông báo)/;
const TEN_DN = /[Cc]ông ty (?:TNHH|CP|cổ phần|[A-ZĐ])|C[ôÔ]NG TY|TNHH|\bCo\s*\.\s*,?\s*L(?:td|TD)|\bCO\s*\.?\s*,?\s*LTD|\bL(?:td|TD)\b|\bCorp(?:oration)?\b|\bcorp\b|\bCORP|\bJSC\b|\bInc\b|\bINC\b|\bGmbH\b|\bGMBH\b|\bPte\b|\bS\.A\b|\bS\.r\.l|\b[Nn]hà SX\b|\bPTE\b|\bMST\b|[Mm]ã số thuế|\bNSX\b|[Nn]hà sx\b|[Hh]ãng sx|&;\s*$/;
// Tên nhà sản xuất là tên doanh nghiệp: giữ nhãn "Nhà sản xuất:", bỏ phần tên tới chữ kế tiếp của văn bản.
const NSX = /((?:(?:Nhà|Hãng) sản xuất|Nhà máy sản xuất|Sản xuất bởi|Nhà SX)\s*:)\s*(?!##)(.*?)(?=\s+(?:[Tt]huộc|Theo|Tên thương mại|Tên gọi|Ký, mã hiệu|Trên cơ sở|Tóm tắt|[Pp]hù hợp|[Mm]ặt hàng|[Nn]hóm\s+\d|[Pp]hân nhóm|[Pp]hân loại|[Mm]ã số\s|\d\s*\.\s+[A-ZĐ]|Công dụng|Thành phần|Quy trình|[Nn]hà máy sản xuất:)|$)/g;

/** Bỏ tên doanh nghiệp theo từng câu (ranh câu như cổng: sau . ; :). */
export function boTen(s) {
  let t = s.replace(NSX, (m, nhan, ten) => (gon(ten).length > 1 && !/^Không/i.test(gon(ten)) ? `${nhan}` : m)); let boNsx = t !== s ? 1 : 0;
  const cau = t.split(/(?<=[.;:])\s+/); const giuLai = (c) => !TEN_DN.test(c) || /mã số\s*:?\s*\d{4}/.test(c);
  // Câu đứng ngay sau câu bị bỏ: bỏ gạch đầu dòng, để không dính thành một câu với đoạn trước.
  const giu = cau.map((c, i) => [c, i]).filter(([c]) => giuLai(c)).map(([c, i]) => (i && !giuLai(cau[i - 1]) ? c.replace(/^[-–—/]\s*/, '') : c)); t = giu.join(' ');
  return { chu: gon(t), boNsx, boCau: cau.length - giu.length };
}
/** Cắt một toàn văn (đã gọn khoảng trắng) thành đoạn kết quả và đoạn khai báo; null khi không thấy tiêu đề mục kết quả. */
export function cat(t) {
  const ks = [...t.matchAll(KQ)]; if (!ks.length) return null;
  const k = ks[ks.length - 1]; const dau = k.index + k[0].length; const duoi = t.slice(dau); const h = HET.exec(duoi.slice(5)); const kq = duoi.slice(0, h ? h.index + 5 : undefined);
  const b = KB.exec(t); let kb = null; if (b) { const d = t.slice(b.index + b[0].length); const e = HET_KB.exec(d); if (e && b.index < k.index) kb = d.slice(0, e.index); }
  return { kq: gon(kq), kb: kb === null ? null : gon(kb) };
}
/** @returns {Map<string, Array<{tep,sha256,chu}>>} khoá "851/TB-TCHQ|2023" */
export function docToanVan(tm) {
  const m = new Map();
  for (const f of fs.readdirSync(tm).filter((x) => /^tracuuhs-detail.*\.json$/.test(x)).sort()) for (const r of JSON.parse(fs.readFileSync(path.join(tm, f), 'utf8')).records) {
    const s = /^\s*(\d+)\/([^/\s]+)/.exec(r.so_hieu); if (!s) continue; const k = `${s[1]}/${s[2]}|${r.nam}`; const tho = String(r.noi_dung || '').normalize('NFC');
    if (!m.has(k)) m.set(k, []); const ds = m.get(k); if (!ds.some((x) => x.tho === tho)) ds.push({ tep: f, sha256: crypto.createHash('sha256').update(tho).digest('hex'), tho, chu: gon(tho) });
  }
  return m;
}
export const so8 = (t) => t.replace(/(\d)[.,\s]+(?=\d)/g, '$1');
/** Bản toàn văn dùng cho một nút: có mã ở mục kết quả, ít chỗ bị che nhất, rồi thứ tự tệp. */
export function rut(ds, ma) {
  const uv = (ds || []).map((d, i) => { const c = cat(d.chu); return c && { ...d, ...c, i, coMa: so8(c.kq).includes(ma), che: (c.kq.match(/##/g) || []).length }; }).filter(Boolean);
  uv.sort((a, b) => b.coMa - a.coMa || a.che - b.che || a.i - b.i); return uv[0] || null;
}
