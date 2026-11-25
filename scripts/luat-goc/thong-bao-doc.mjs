// scripts/luat-goc/thong-bao-doc.mjs — đọc data/precedents.json thành từng dòng có vị trí, số, ký hiệu, năm, mã lúc ban hành. Tất định, không mạng, không AI.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const GOC = fileURLToPath(new URL('../..', import.meta.url));
export const doc = (p) => JSON.parse(fs.readFileSync(path.join(GOC, p), 'utf8'));
export const chat = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
export const gon = (s) => String(s || '').normalize('NFC').replace(/\s+/g, ' ').trim();
/** Chỗ kho cũ nối "tên khai báo" với "tên theo cấu tạo": " — " (luatvietnam), " - " / " | " (tracuuhs), và nhãn "TM:" / "Tên gọi:". Chỉ dùng để so, không sửa chữ. */
export const tach = (s) => gon(s).split(/\s[—|]\s|\s-(?:\s|$)|^-\s/).map((x) => x.replace(/^(?:TM|Tên gọi)\s*:\s*/, '').replace(/^-\s*/, '')).filter((x) => chat(x).length > 3);
/** Câu không phải chữ thông báo mà kho cũ gắn thêm vào cuối phần kết luận (câu dẫn nối mã mới; câu "Đính chính tại Thông báo…"). */
export const boDanNoi = (s) => String(s || '').replace(/\s*Dẫn nối \d{8} → \d{8}[\s\S]*$/, '').replace(/\s*Đính chính tại Thông báo \d+\/TB[\s\S]*$/, '');

/** @returns {Array} mọi bản ghi của precedents.json theo đúng thứ tự trong tệp */
export function docDong() {
  const kho = doc('data/precedents.json'); const ds = [];
  for (const [khoa, mang] of Object.entries(kho)) mang.forEach((r, i) => {
    const nuocNgoai = Boolean(r.country);
    const soDay = r.tbTchqNumber || r.source?.reference || null; const ngay = r.issuedDate || r.source?.issuedDate || null;
    const url = r.sourceUrl || r.source?.url || null;
    let nam = r.year || (ngay ? Number(ngay.slice(0, 4)) : null); let namTu = nam ? 'kho' : null;
    if (!nam && url) { const m = /-t?chq-(?:nam-)?(20\d\d)-/.exec(url.toLowerCase()); if (m) { nam = Number(m[1]); namTu = 'url'; } }
    const m = /^(\d+)\/(.+)$/.exec(soDay || '');
    // Mã lúc ban hành: hsCodeGoc (kho ghi mã gốc, khoá là mã dẫn nối) → outcome khi khác khoá → khoá.
    const ma = String(r.hsCodeGoc || r.outcome || r.hsCode || khoa).replace(/\D/g, '');
    ds.push({
      viTri: `${khoa}#${i}`, khoa, nuocNgoai, khongSo: !r.tbTchqNumber, soDay, so: m?.[1] || null, kyHieu: m?.[2] || null, ngay, nam, namTu, url, ma,
      maTu: r.hsCodeGoc ? 'hsCodeGoc' : ma !== khoa ? 'outcome' : 'khoa',
      moTa: r.productName ?? r.description ?? '', ketLuan: boDanNoi(r.technicalSpec ?? r.reasonVi ?? ''), danNoi: /Dẫn nối \d{8} → /.test(r.technicalSpec || ''),
      nguoi: r.contributor?.name || (r.sourceFile === 'tb_tchq_index.json' ? 'tb_tchq_index' : '(không ghi)'), tep: r.sourceFile || null,
      loaiTB: r.loaiTB || r.attributes?.loaiTB || null, bieu: r.bieuThueGoc || r.attributes?.bieuThue || null,
    });
  });
  return ds;
}
