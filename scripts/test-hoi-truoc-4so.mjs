#!/usr/bin/env node
/**
 * scripts/test-hoi-truoc-4so.mjs — Tự kiểm cho đặc tả "nhóm chưa chốt, hỏi trước" (#1645 Việc 3).
 *
 * Chứng minh:
 *   1) Cô lập hoàn toàn khỏi đường khách: không tệp api/* hay engine khách nào require lib/do-thi/hoi-truoc-4so.js.
 *   2) Khuôn CHUA_CHOT_NHOM_HOI_TRUOC: sinh dapAnDieuKien đúng dạng "Nếu <đặc điểm> → nhóm XXXX (<căn cứ>); nếu …",
 *      mỗi nhánh có { nhom, dieuKien, canCu, nguon }, có cauHoi + trucPhanBiet rõ ràng trên nhiều trục (2–4 nhóm).
 *   3) Ca ngược: đúng 1 nhóm → CHOT_NHOM (dapAnDieuKien=null, cauHoi=null); rỗng/mã sai → KHONG_DU_CAN_CU.
 *   4) Nếu data/bo-chuan/4so-v1.jsonl tồn tại trên đĩa: kiểm đủ 20/20 PHAN_VAN và 80/80 CHOT đạt chuẩn.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { phanTichHoiTruoc4So, dinhDangDapAnDieuKien, TRANG_THAI_4SO } = require('../lib/do-thi/hoi-truoc-4so.js');

let pass = 0;
let fail = 0;
function check(name, cond, detail = '') {
  if (cond) { pass += 1; console.log(`PASS  ${name}`); }
  else { fail += 1; console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}

// 1. Cô lập đường khách (tuyệt đối chưa nối)
{
  const apiFiles = fs.readdirSync(new URL('../api', import.meta.url)).filter((f) => /\.(js|mjs)$/.test(f));
  const libFiles = fs.readdirSync(new URL('../lib', import.meta.url)).filter((f) => /\.(js|mjs)$/.test(f));
  const callers = [];
  for (const f of apiFiles) {
    const txt = fs.readFileSync(new URL(`../api/${f}`, import.meta.url), 'utf8');
    if (txt.includes('hoi-truoc-4so')) callers.push(`api/${f}`);
  }
  for (const f of libFiles) {
    const txt = fs.readFileSync(new URL(`../lib/${f}`, import.meta.url), 'utf8');
    if (txt.includes('hoi-truoc-4so')) callers.push(`lib/${f}`);
  }
  const modTxt = fs.readFileSync(new URL('../lib/do-thi/hoi-truoc-4so.js', import.meta.url), 'utf8');
  check('Cô lập hoàn toàn: chưa đường khách hay engine lõi nào require hoi-truoc-4so.js', callers.length === 0, callers.join(','));
  check('Tuân thủ L2/GIR/HS: không có questionVi:, GIR-<so>, hay process.env.HS_* trong module',
    !/questionVi\s*:/.test(modTxt) && !/GIR[\s-]*\d/.test(modTxt) && !/process\.env\.HS_/.test(modTxt));
}

// 2. Các trường hợp PHAN_VAN đại diện (nhiều trục + số lượng nhóm 2..4)
const MAU_PHAN_VAN = [
  { name: '4 nhóm vật liệu giày (6402..6405)', moTa: 'Giày thể thao nữ', nhom: ['6402', '6403', '6404', '6405'] },
  { name: '2 nhóm cơ cấu cơ khí vs đồ bếp (8210, 7323)', moTa: 'Dụng cụ ép trái cây', nhom: ['8210', '7323'] },
  { name: '3 nhóm dải/keo/xốp plastic (3921, 3919, 3920)', moTa: 'Tấm nhựa Laminate', nhom: ['3921', '3919', '3920'] },
  { name: '2 nhóm có/không bện cáp (7217, 7312)', moTa: 'Dây thép không hợp kim', nhom: ['7217', '7312'] },
  { name: '2 nhóm lễ hội vs trang trí (6702, 9505)', moTa: 'Nhánh lá thông nhân tạo trang trí', nhom: ['6702', '9505'] },
  { name: '2 nhóm cỡ trẻ ≤ 86 cm (6104, 6111)', moTa: 'Váy liền thân trẻ em gái', nhom: ['6104', '6111'] },
  { name: '3 nhóm dây hàn vs dây trần (8311, 7229, 7223)', moTa: 'Dây hàn bằng thép hợp kim', nhom: ['8311', '7229', '7223'] },
];

for (const tc of MAU_PHAN_VAN) {
  const out = phanTichHoiTruoc4So({ moTa: tc.moTa, ungVien: tc.nhom });
  const hasBranches = tc.nhom.every((h) => out.nhanh.some((n) => n.nhom === h && n.dieuKien.length >= 4 && n.canCu.length >= 4 && n.nguon));
  const matchPrefix = out.dapAnDieuKien && tc.nhom.every((h) => out.dapAnDieuKien.includes(`→ nhóm ${h} (`));
  const segCount = out.dapAnDieuKien ? out.dapAnDieuKien.split('; ').length : 0;
  check(
    `PHAN_VAN ${tc.name}: đủ nhánh + khuôn "Nếu ... → nhóm X (căn cứ)" + câu hỏi`,
    out.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && hasBranches
      && matchPrefix
      && segCount === tc.nhom.length
      && Boolean(out.cauHoi)
      && out.canCu.length === tc.nhom.length,
    JSON.stringify({ status: out.trangThai, segCount, dapAn: out.dapAnDieuKien?.slice(0, 120) }),
  );
}

// 3. Ca ngược: đúng 1 nhóm -> CHOT_NHOM; 0 nhóm / mã sai -> KHONG_DU_CAN_CU
{
  const chot = phanTichHoiTruoc4So({ moTa: 'Van điều áp khí nén', ungVien: ['8481', '8481'] });
  check(
    'CA NGƯỢC 1 nhóm (trùng 8481,8481 khử còn 1): CHOT_NHOM, không sinh câu hỏi hay đáp án điều kiện',
    chot.trangThai === TRANG_THAI_4SO.CHOT_NHOM
      && chot.nhomUngVien.length === 1
      && chot.dapAnDieuKien === null
      && chot.cauHoi === null
      && chot.nhanh.length === 0,
    JSON.stringify(chot),
  );

  const rong = phanTichHoiTruoc4So({ moTa: 'Hàng chưa rõ', ungVien: ['9999', 'abcd', ''] });
  check(
    'CA NGƯỢC không nhóm hợp lệ: KHONG_DU_CAN_CU (L6 phân biệt với CHOT_NHOM)',
    rong.trangThai === TRANG_THAI_4SO.KHONG_DU_CAN_CU && rong.dapAnDieuKien === null && Boolean(rong.cauHoi),
    JSON.stringify(rong),
  );

  assert.equal(dinhDangDapAnDieuKien([]), null);
  check('dinhDangDapAnDieuKien: mảng rỗng trả null', true);
}

// 4. Kiểm tra có điều kiện trên data/bo-chuan/4so-v1.jsonl nếu đã gộp từ #1644
const boChuanPath = new URL('../data/bo-chuan/4so-v1.jsonl', import.meta.url);
if (fs.existsSync(boChuanPath)) {
  const rows = fs.readFileSync(boChuanPath, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => JSON.parse(l));
  const pv = rows.filter((r) => r.ketQua === 'PHAN_VAN');
  const chot = rows.filter((r) => r.ketQua === 'CHOT');
  let pvOk = 0;
  for (const r of pv) {
    const out = phanTichHoiTruoc4So({ moTa: r.moTa, ungVien: r.nhom });
    if (out.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC && r.nhom.every((h) => out.dapAnDieuKien.includes(`→ nhóm ${h} (`)) && out.cauHoi) {
      pvOk += 1;
    }
  }
  const chotOk = chot.filter((r) => phanTichHoiTruoc4So({ moTa: r.moTa, ungVien: r.nhom }).trangThai === TRANG_THAI_4SO.CHOT_NHOM).length;
  check(`Bộ chuẩn 4so-v1.jsonl trên đĩa: ${pvOk}/${pv.length} PHAN_VAN + ${chotOk}/${chot.length} CHOT đạt chuẩn`, pvOk === pv.length && chotOk === chot.length);
} else {
  console.log('INFO  data/bo-chuan/4so-v1.jsonl chưa gộp từ #1644 — bỏ qua kiểm 100 ca trong CI.');
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
