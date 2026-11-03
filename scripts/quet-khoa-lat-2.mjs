#!/usr/bin/env node
/**
 * scripts/quet-khoa-lat-2.mjs — TIỀN QUÉT KHOÁ TỪ VỰNG cho lát 2 (#577).
 *
 * VÌ SAO: thành thần chặn lớn của số hoá ranh giới không phải thợ mà là tu-vung@2 THIẾU KHOÁ —
 * mỗi lần thiếu là một PR DỪNG + một lượt soát (lát 1: 2/23 DỪNG; lát 2 ca tay 02/11: 401120
 * chết cả 5 dòng vì thiếu chieuRong + duongKinhLapVanh — mà máy không tự gợi ý vì
 * MAU_GOI_Y_KHOA chỉ phủ 6 mẫu cố định). Script này quét TRƯỚC cả 100 PN6 của lát 2, gom
 * hết nhu cầu khoá về MỘT bảng đề xuất để Claude/GĐ duyệt thêm khoá @2 một lần.
 *
 * Hai lớp phát hiện trên tên mục (chữ biểu nguyên văn trong goiSoan):
 *   (1) lớp máy sẵn có  — goiSoan().nghiThieuKhoa (MAU_GOI_Y_KHOA: sợi/lõi, tỉ lệ, chỉ-hoặc-chủ-yếu…)
 *   (2) lớp đại lượng đo — DAI_LUONG dưới đây (chiều rộng, độ dày, định lượng, áp suất…):
 *       khớp chữ ⇒ khoá đề xuất; khoá ĐÃ có trong tu-vung@2 thì không báo.
 *
 * Chạy: node scripts/quet-khoa-lat-2.mjs [--pn6=401120,830140] [--min=1]
 *   --pn6  chỉ quét vài mã (debug)   --min  chỉ in khoá gặp ≥ N mục
 * Kết quả: docs/giao-viec/so-tay/de-xuat-khoa-lat-2.md (bảng đề xuất cho người duyệt — KHÔNG tự thêm khoá).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const { goiSoan } = require('../lib/ho-so/cong-ranh-gioi.js');
const TV = require('../lib/tu-vung.js');

// Đại lượng đo hay gặp ở lát 2 mà tu-vung@2 có thể chưa có khoá. [regex trên tên mục, khoá đề xuất, kiểu, đơn vị, ghi chú]
const DAI_LUONG = [
  [/chiều rộng/iu, 'chieuRong', 'SO', 'mm', 'bề rộng hàng (lốp 4011, vải, giấy, phim)'],
  [/lắp vành|đường kính (lắp )?vành/iu, 'duongKinhLapVanh', 'SO', 'inch', 'đường kính LẮP VÀNH lốp — khác duongKinh (đường kính ngoài)'],
  [/độ dày/iu, 'doDay', 'SO', 'mm', 'độ dày tấm/lá/que (nhựa 39, thép 72-73)'],
  [/định lượng|g\/m²|g\/m2/iu, 'dinhLuong', 'SO', 'g/m2', 'định lượng chất liệu (vải 52.08, giấy 48)'],
  [/áp suất/iu, 'apSuat', 'SO', 'bar', 'áp suất làm việc'],
  [/nhiệt độ/iu, 'nhietDo', 'SO', '°C', 'nhiệt độ (lò, thiết bị)'],
  [/dung tích(?! xi lanh)/iu, 'dungTich', 'SO', 'l', 'dung tích (bình, hộp) — dungTichXiLanh đã có riêng'],
  [/tốc độ/iu, 'tocDo', 'SO', 'v/ph', 'tốc độ (quạt, băng tải)'],
  [/chiều sâu/iu, 'chieuSau', 'SO', 'mm', 'chiều sâu'],
];

const argPn6 = process.argv.find((a) => a.startsWith('--pn6='));
const argPn6File = process.argv.find((a) => a.startsWith('--pn6-file=')); // danh sách PN6 tuỳ ý (JSON mảng) — quét ngoài lat-2
const argMin = process.argv.find((a) => a.startsWith('--min='));
const argOut = process.argv.find((a) => a.startsWith('--out='));
const MIN = argMin ? Number(argMin.slice(6)) : 1;
const lat2 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/ho-so/lat-2.json'), 'utf8'));
let ds = lat2.phanNhom || [];
if (argPn6File) {
  ds = JSON.parse(fs.readFileSync(path.resolve(argPn6File.slice(11)), 'utf8')).map((x) => ({ pn6: x }));
} else if (argPn6) {
  const muon = new Set(argPn6.slice(6).split(',').map((s) => s.replace(/\D/g, '')));
  ds = ds.filter((x) => muon.has(String(x.pn6)));
}

const coKhoa = (k) => { try { return Boolean(TV.layKhoa(k)); } catch { return false; } };
const thieu = new Map(); // khoá đề xuất → { kieu, donVi, ghiChu, gaps: [{pn6, ma, trich}] }
const loi = [];
let soMuc = 0;

for (const { pn6 } of ds) {
  let goi;
  try { goi = goiSoan(String(pn6)); } catch (e) { loi.push(`${pn6}: ${e.message}`); continue; }
  for (const muc of goi.canSoHoa || []) {
    if (!muc.ten || muc.loaiKhac || muc.khongCanDieuKien) continue;
    soMuc += 1;
    // (1) lớp máy sẵn có — gói gọn về dạng khoá đề xuất
    for (const g of muc.nghiThieuKhoa || []) {
      const key = `máy:${g}`;
      if (!thieu.has(key)) thieu.set(key, { kieu: '(theo gợi ý máy)', donVi: '', ghiChu: 'MAU_GOI_Y_KHOA báo thiếu — xem --tu-vung', gaps: [] });
      thieu.get(key).gaps.push({ pn6: String(pn6), ma: muc.ma, trich: String(muc.ten).slice(0, 90) });
    }
    // (2) lớp đại lượng đo
    for (const [re, khoa, kieu, donVi, ghiChu] of DAI_LUONG) {
      if (!re.test(muc.ten) || coKhoa(khoa)) continue;
      if (!thieu.has(khoa)) thieu.set(khoa, { kieu, donVi, ghiChu, gaps: [] });
      thieu.get(khoa).gaps.push({ pn6: String(pn6), ma: muc.ma, trich: String(muc.ten).slice(0, 90) });
    }
  }
}

const hang = [...thieu.entries()]
  .map(([khoa, v]) => ({ khoa, ...v, soMuc: v.gaps.length }))
  .filter((r) => r.soMuc >= MIN)
  .sort((a, b) => b.soMuc - a.soMuc);

const md = [
  '# Đề xuất khoá tu-vung@2 từ tiền quét lát 2',
  '',
  `> Sinh bởi \`node scripts/quet-khoa-lat-2.mjs\` ngày ${new Date().toISOString().slice(0, 10)} — quét ${ds.length} PN6 / ${soMuc} mục có tên.`,
  '> **Chỉ là đề xuất.** Thêm khoá là việc của L1-3a: Claude/GĐ duyệt, đo lại bench, nâng @2. Khoá được duyệt ⇒ các PN6 dưới mở lại đóng góp được ngay (spec DỪNG chỉ cần điền số).',
  '',
  '| Khoá đề xuất | Kiểu | Đơn vị | Số mục | Gặp ở (mẫu) | Ghi chú |',
  '|---|---|---|---|---|---|',
  ...hang.map((r) => `| \`${r.khoa}\` | ${r.kieu} | ${r.donVi} | ${r.soMuc} | ${r.gaps.slice(0, 3).map((g) => `${g.pn6}/${g.ma}`).join(', ')}${r.soMuc > 3 ? ' …' : ''} | ${r.gaps.slice(0, 1).map((g) => `"${g.trich}"`).join('')} — ${r.ghiChu} |`),
  '',
  ...(loi.length ? ['## Lỗi quét (bỏ qua)', ...loi.map((l) => `- ${l}`)] : []),
].join('\n');

const outFile = path.resolve(ROOT, argOut ? argOut.slice(6) : 'docs/giao-viec/so-tay/de-xuat-khoa-lat-2.md');
fs.writeFileSync(outFile, md + '\n');
console.log(`quét ${ds.length} PN6 → ${hang.length} khoá đề xuất (≥${MIN} mục) → ${path.relative(ROOT, outFile)}`);
for (const r of hang.slice(0, 10)) console.log(`  ${r.khoa.padEnd(20)} ${String(r.soMuc).padStart(3)} mục — ${r.gaps.slice(0, 2).map((g) => g.pn6).join(',')}`);
if (loi.length) console.log(`  ⚠ ${loi.length} PN6 lỗi quệt (thiếu trong cây): ${loi.slice(0, 3).join('; ')}`);
