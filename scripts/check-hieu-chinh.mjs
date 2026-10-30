#!/usr/bin/env node
// scripts/check-hieu-chinh.mjs — cổng máy cho data/ho-so/hieu-chinh-tien-le.json (plan L1-4b, #577).
// Trích TB-TCHQ + chữ biểu nguyên văn; TIEN_LE_THAY_CHU_BIEU chỉ khi ≥ 2 TB-TCHQ cùng chiều hoặc NGUOI_DUYET có phanXu đủ {nguoi, ngay, quyetDinh, kenh};
// maHs thuộc lát 1; mọi phân nhóm cờ canHieuChinhTienLe có ≥ 1 mục. Đọc qua dataReadPath (HS_DATA_DIR được tôn trọng).
// Thoát 1 khi ĐỎ. --json: in kết quả máy đọc.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const H = require('../lib/ho-so/hieu-chinh.js');

const bang = H.taiBang();
const r = H.kiemBang(bang);
if (process.argv.includes('--json')) {
  console.log(JSON.stringify(r, null, 2));
} else {
  const muc = bang.muc || [];
  const dem = Object.fromEntries(H.LOAI.map((l) => [l, muc.filter((m) => m.loai === l).length]));
  console.log(`hieu-chinh-tien-le: ${muc.length} mục — ${H.LOAI.map((l) => `${l} ${dem[l]}`).join(', ')}`);
  for (const l of r.loi) console.log(`  ✗ ${l}`);
  for (const c of r.canhBao) console.log(`  ! ${c}`);
  console.log(r.hopLe ? 'XANH' : `ĐỎ (${r.loi.length} lỗi)`);
}
process.exit(r.hopLe ? 0 : 1);
