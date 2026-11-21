#!/usr/bin/env node
/**
 * scripts/bao-cao-hoi-muc-dich.mjs — CHỈ ĐỌC. Chạy phép kiểm "hỏi đặc tính, không hỏi mục đích tự nhận" (luật CEO duyệt 21/11/2026,
 * lib/do-thi/tieu-chi-6.js kiemCauHoiMucDich) trên mọi `phanBiet[].hoi` của data/so-tay/*.json; không sửa sổ tay nào.
 * Căn cứ của câu (`trich`) là chữ luật dùng để xét ngoại lệ "chữ luật định nghĩa bằng công dụng"; câu đặc tính đi kèm = câu
 * phanBiet khác của cùng sổ có cùng đích `neuCo`. Xếp nhóm theo lượng hàng: data/do-thi/xep-hang-luong-hang.json.
 *   node scripts/bao-cao-hoi-muc-dich.mjs [--json] [--vi-du=15] [--top=10]
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { GOC } from './lib-luat.mjs';

process.chdir(GOC);
const require = createRequire(import.meta.url);
const G6 = require('../lib/do-thi/tieu-chi-6.js');
const thamSo = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? Number(a.split('=')[1]) : d; };
const VI_DU = thamSo('vi-du', 15); const TOP = thamSo('top', 10);

const xh = JSON.parse(fs.readFileSync('data/do-thi/xep-hang-luong-hang.json', 'utf8'));
const hang = new Map(xh.nhom.map((x) => [x.nhom, x]));
const thuHang = (h4) => (hang.has(h4) ? hang.get(h4).hang : Infinity);

const thuMuc = 'data/so-tay';
const tong = { soTay: 0, cau: 0, CHI_HOI_MUC_DICH: 0, CONG_DUNG_THIEU_DAC_TINH_KIEM_CHUNG: 0 };
const theoNhom = new Map(); const ca = [];
for (const f of fs.readdirSync(thuMuc).filter((x) => /^\d{4}\.json$/.test(x)).sort()) {
  const h4 = f.slice(0, 4);
  const s = JSON.parse(fs.readFileSync(path.join(thuMuc, f), 'utf8'));
  tong.soTay += 1;
  const pb = Array.isArray(s.phanBiet) ? s.phanBiet : [];
  pb.forEach((x, i) => {
    if (!x || typeof x.hoi !== 'string' || !x.hoi.trim()) return;
    tong.cau += 1;
    const cauPhu = pb.filter((y, j) => j !== i && y && y.neuCo === x.neuCo && typeof y.hoi === 'string').map((y) => y.hoi);
    const kq = G6.kiemCauHoiMucDich(x.hoi, { chuLuat: x.trich || '', cauPhu });
    if (!kq.ma) return;
    tong[kq.ma] += 1;
    if (!theoNhom.has(h4)) theoNhom.set(h4, { nhom: h4, CHI_HOI_MUC_DICH: 0, CONG_DUNG_THIEU_DAC_TINH_KIEM_CHUNG: 0 });
    theoNhom.get(h4)[kq.ma] += 1;
    ca.push({ nhom: h4, hang: thuHang(h4), ma: kq.ma, hoi: x.hoi, mucDich: kq.mucDich, nguon: x.nguon || null });
  });
}
const nhom = [...theoNhom.values()].map((n) => ({ ...n, tong: n.CHI_HOI_MUC_DICH + n.CONG_DUNG_THIEU_DAC_TINH_KIEM_CHUNG, hang: thuHang(n.nhom), soDong: hang.get(n.nhom)?.soDong ?? null }))
  .sort((a, b) => a.hang - b.hang || b.tong - a.tong || (a.nhom < b.nhom ? -1 : 1));
// Ví dụ: mỗi nhóm một câu, theo lượng hàng, ưu tiên mã đỏ.
const viDu = []; const daLay = new Set();
for (const c of [...ca].sort((a, b) => a.hang - b.hang || (a.ma === b.ma ? 0 : a.ma === 'CHI_HOI_MUC_DICH' ? -1 : 1))) {
  if (viDu.length >= VI_DU) break;
  if (daLay.has(c.nhom)) continue;
  daLay.add(c.nhom); viDu.push(c);
}
const ra = { tong, soNhomDinh: nhom.length, soNhomDinhTrongTop120: nhom.filter((n) => Number.isFinite(n.hang)).length, topTheoLuongHang: nhom.slice(0, TOP), viDu };
if (process.argv.includes('--json')) { console.log(JSON.stringify(ra, null, 2)); process.exit(0); }
console.log(`sổ tay: ${tong.soTay} · câu phanBiet: ${tong.cau}`);
console.log(`CHI_HOI_MUC_DICH (đỏ): ${tong.CHI_HOI_MUC_DICH} · CONG_DUNG_THIEU_DAC_TINH_KIEM_CHUNG (chữ luật định nghĩa bằng công dụng, thiếu câu đặc tính): ${tong.CONG_DUNG_THIEU_DAC_TINH_KIEM_CHUNG}`);
console.log(`nhóm dính: ${ra.soNhomDinh} (trong top 120 lượng hàng: ${ra.soNhomDinhTrongTop120})`);
console.log(`\ntop ${TOP} theo lượng hàng (hạng · nhóm · số dòng tờ khai · đỏ / cảnh báo):`);
for (const n of ra.topTheoLuongHang) console.log(`  ${Number.isFinite(n.hang) ? `#${n.hang}` : 'ngoài 120'} · ${n.nhom} · ${n.soDong ?? '—'} dòng · ${n.CHI_HOI_MUC_DICH} / ${n.CONG_DUNG_THIEU_DAC_TINH_KIEM_CHUNG}`);
console.log(`\n${viDu.length} ví dụ:`);
for (const c of viDu) console.log(`  [${c.nhom}${Number.isFinite(c.hang) ? ` #${c.hang}` : ''}] ${c.ma}: ${c.hoi}  (${c.mucDich.join(', ')})`);
