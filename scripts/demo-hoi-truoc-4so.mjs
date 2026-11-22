#!/usr/bin/env node
/**
 * scripts/demo-hoi-truoc-4so.mjs — Demo ngoại tuyến trạng thái "nhóm chưa chốt, hỏi trước" (#1645 Việc 3).
 *
 * Cô lập hoàn toàn khỏi đường khách. Hỗ trợ chạy trên bộ chuẩn JSONL (--bo-chuan=...)
 * hoặc bộ mẫu đại diện mặc định (--mau) khi bộ chuẩn chưa gộp về nhánh chính.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { phanTichHoiTruoc4So, TRANG_THAI_4SO } = require('../lib/do-thi/hoi-truoc-4so.js');

const MAU_MAC_DINH = [
  { ca: 'M1', o: 'D', ketQua: 'PHAN_VAN', moTa: 'Dụng cụ ép trái cây / thép không gỉ / không điện', nhom: ['8210', '7323'] },
  { ca: 'M2', o: 'D', ketQua: 'PHAN_VAN', moTa: 'Giày thể thao nữ / None / None', nhom: ['6402', '6403', '6404', '6405'] },
  { ca: 'M3', o: 'D', ketQua: 'PHAN_VAN', moTa: 'Dây thép không hợp kim / Thép / sản xuất cáp thép', nhom: ['7217', '7312'] },
  { ca: 'M4', o: 'A', ketQua: 'CHOT', moTa: 'Van điều áp khí nén / Sắt / Điều chỉnh áp suất', nhom: ['8481'] },
];

function parseArgs(argv) {
  const opts = { boChuan: 'data/bo-chuan/4so-v1.jsonl', mau: false };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--bo-chuan=')) opts.boChuan = a.slice('--bo-chuan='.length);
    else if (a === '--mau') opts.mau = true;
  }
  return opts;
}

function taiDuLieu(opts) {
  const abs = path.isAbsolute(opts.boChuan) ? opts.boChuan : path.join(process.cwd(), opts.boChuan);
  if (!opts.mau && fs.existsSync(abs)) {
    const rows = fs.readFileSync(abs, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => JSON.parse(l));
    return { nguon: opts.boChuan, rows };
  }
  return { nguon: '(bo-mau-noi-bo)', rows: MAU_MAC_DINH };
}

function main() {
  const opts = parseArgs(process.argv);
  const { nguon, rows } = taiDuLieu(opts);
  const pvRows = rows.filter((r) => r.ketQua === 'PHAN_VAN');
  const chotRows = rows.filter((r) => r.ketQua === 'CHOT');

  let pvOk = 0;
  console.log(`=== DEMO HỎI TRƯỚC TẦNG 4 SỐ (${nguon}: ${pvRows.length} PHAN_VAN, ${chotRows.length} CHOT) ===`);
  for (const r of pvRows) {
    const out = phanTichHoiTruoc4So({ moTa: r.moTa, ungVien: r.nhom, quyTac: r.quyTac || 'QT1' });
    const hasAll = r.nhom.every((h) => out.nhanh.some((n) => n.nhom === h && n.dieuKien && n.canCu && n.nguon));
    const okFmt = out.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && Boolean(out.dapAnDieuKien)
      && out.dapAnDieuKien.startsWith('Nếu ')
      && Boolean(out.cauHoi)
      && hasAll;
    if (okFmt) pvOk += 1;
    console.log(`\n[ca=${r.ca} | ô=${r.o} | nhóm=${r.nhom.join(',')} | ok=${okFmt}] ${r.moTa}`);
    console.log(`  trangThai:     ${out.trangThai}`);
    console.log(`  trucPhanBiet:  ${out.trucPhanBiet.join(', ')}`);
    console.log(`  cauHoi:        ${out.cauHoi}`);
    console.log(`  dapAnDieuKien: ${out.dapAnDieuKien}`);
  }

  let chotOk = 0;
  for (const r of chotRows) {
    const out = phanTichHoiTruoc4So({ moTa: r.moTa, ungVien: r.nhom, quyTac: r.quyTac || 'QT1' });
    if (out.trangThai === TRANG_THAI_4SO.CHOT_NHOM && out.dapAnDieuKien === null && out.cauHoi === null) {
      chotOk += 1;
    }
  }

  console.log(`\n=== TỔNG KẾT DEMO ===`);
  console.log(`PHAN_VAN hỏi trước hợp lệ: ${pvOk}/${pvRows.length}`);
  console.log(`CHOT (ca ngược không hỏi oan): ${chotOk}/${chotRows.length}`);
  if (pvOk !== pvRows.length || chotOk !== chotRows.length) process.exit(1);
}

main();
