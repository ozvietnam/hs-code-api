// scripts/luat-goc/bieu-doc.mjs — đọc các dòng sheet chính của biểu thuế đã trích (data/bieu-thue/<phiên bản>). Chỉ đọc, tất định.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

export const GOC = fileURLToPath(new URL('../..', import.meta.url));
export const PHIEN_BAN = '2026.04.05';
const SHEET = 'BT2026';
// Hiệu chỉnh số gạch biểu in thiếu (Chương 98, 984934/984935): chép từ lib/ho-so/tang-khong-ma.js (GACH_HIEU_CHINH, GACH_DAI; căn cứ ghi ở đó).
const HIEU_CHINH = new Map([[19765, 4], [19766, 5], [19767, 5]]);
for (let r = 19818; r <= 19848; r += 1) HIEU_CHINH.set(r, '+1');
const R_CHUONG_98 = 19054; // dòng nhóm 98.04 đầu tiên: từ đây cột kiểu dòng (khac.C) trống, phải nhận tiêu đề theo số gạch

const doc = (f) => zlib.gunzipSync(fs.readFileSync(path.join(GOC, 'data/bieu-thue', PHIEN_BAN, f))).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((x) => x.sheet === SHEET);

/** @returns {{dong: object[], chuong: object[], tatCa: {r:number, chu:string}[], hieuChinh: number[]}} */
export function docDong() {
  const bc = doc('bieu-chinh.jsonl.gz'); const td = doc('tieu-de.jsonl.gz');
  const tatCa = [...bc.map((x) => ({ r: x.r, chu: x.moTaVi })), ...td.map((x) => ({ r: x.r, chu: x.nguyenVan }))].sort((a, b) => a.r - b.r);
  // Dòng tên: dòng có mã, và tiêu đề không mã kiểu 19…23 (= 18 + số gạch) của bảng; gạch đầu dòng trong chú giải (kiểu 9, 10, 14…) không phải tên.
  const laTen = (x) => x.gach > 0 && (x.khac?.C != null ? Number(x.khac.C) === 18 + x.gach : x.r > R_CHUONG_98);
  const hieuChinh = [];
  const dong = [
    ...bc.map((x) => ({ r: x.r, ma: x.maChuan, gach: x.gach, chu: String(x.moTaVi).trim(), maTuongUng: x.ma.startsWith('98') && /^\d{8}$/.test(String(x.dvt || '')) ? x.dvt : null })),
    ...td.filter(laTen).map((x) => ({ r: x.r, ma: null, gach: x.gach, chu: String(x.nguyenVan).trim(), maTuongUng: x.r > R_CHUONG_98 && /^\d{8}$/.test(String(x.khac?.I || '')) ? x.khac.I : null, maIn: x.r > R_CHUONG_98 && /^\d+$/.test(String(x.khac?.F || '')) ? x.khac.F : null })),
  ].sort((a, b) => a.r - b.r).map((x) => {
    if (!HIEU_CHINH.has(x.r)) return x;
    const h = HIEU_CHINH.get(x.r); hieuChinh.push(x.r);
    return { ...x, gachBieu: x.gach, gach: h === '+1' ? x.gach + 1 : h };
  });
  for (const x of dong) { const g = /^((?:-\s*)*)/.exec(x.chu)[1].replace(/[^-]/g, '').length; if (g !== (x.gachBieu ?? x.gach)) throw new Error(`r${x.r}: số gạch trong chữ (${g}) khác cột gạch (${x.gach})`); }
  const chuong = [];
  td.sort((a, b) => a.r - b.r).forEach((x, i) => {
    const m = /^Chương (\d{1,2})$/.exec(String(x.nguyenVan).trim()); if (!m || (x.khac?.C != null && Number(x.khac.C) !== 3)) return; // Chương 77 để dự phòng: khuôn nút luật không tạo nút
    const t = td[i + 1]; if (m[1] === '77') return; chuong.push({ ma: m[1].padStart(2, '0'), so: m[1], r: t.r, chu: String(t.nguyenVan).trim() });
  });
  return { dong, chuong, tatCa, hieuChinh };
}
