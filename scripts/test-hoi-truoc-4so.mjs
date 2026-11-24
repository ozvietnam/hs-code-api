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

// 2. Các trường hợp PHAN_VAN đại diện (15 mẫu bao phủ các cặp phân vân bộ chuẩn v1 + vòng 2)
const MAU_PHAN_VAN = [
  { name: '4 nhóm vật liệu giày (6402..6405)', moTa: 'Giày thể thao nữ', nhom: ['6402', '6403', '6404', '6405'] },
  { name: '2 nhóm cơ cấu cơ khí vs đồ bếp (8210, 7323)', moTa: 'Dụng cụ ép trái cây', nhom: ['8210', '7323'] },
  { name: '3 nhóm dải/keo/xốp plastic (3921, 3919, 3920)', moTa: 'Tấm nhựa Laminate', nhom: ['3921', '3919', '3920'] },
  { name: '2 nhóm có/không bện cáp (7217, 7312)', moTa: 'Dây thép không hợp kim', nhom: ['7217', '7312'] },
  { name: '2 nhóm lễ hội vs trang trí (6702, 9505)', moTa: 'Nhánh lá thông nhân tạo trang trí', nhom: ['6702', '9505'] },
  { name: '2 nhóm cỡ trẻ ≤ 86 cm (6104, 6111)', moTa: 'Váy liền thân trẻ em gái', nhom: ['6104', '6111'] },
  { name: '3 nhóm dây hàn vs dây trần (8311, 7229, 7223)', moTa: 'Dây hàn bằng thép hợp kim', nhom: ['8311', '7229', '7223'] },
  { name: '2 nhóm vỏ ốp lưng nhựa vs bao/nắp gập (3926, 4202)', moTa: 'Vỏ ốp điện thoại / PVC / bảo vệ điện thoại', nhom: ['3926', '4202'] },
  { name: '2 nhóm bát sen tắm không van vs có van (3924, 8481)', moTa: 'Bát sen tắm nhỏ / nhựa ABS / None', nhom: ['3924', '8481'] },
  { name: '2 nhóm máy xử lý dữ liệu tự động vs thiết bị chức năng riêng (8471, 8543)', moTa: 'Bộ xử lý hình ảnh / None / xử lý hình ảnh cho màn hình LED', nhom: ['8471', '8543'] },
  { name: '2 nhóm thanh nhôm cắt khoan đơn thuần vs phụ kiện ray rèm (7616, 8302)', moTa: 'Thanh kéo vải rèm trần / Nhôm / Phụ kiện rèm cửa', nhom: ['7616', '8302'] },
  { name: '2 nhóm khoá cài thông dụng vs bộ phận dây đai an toàn ô tô (8308, 8708)', moTa: 'Chốt cài khóa dây bảo hiểm có nối tiếp / sắt mạ+nhựa / None', nhom: ['8308', '8708'] },
  { name: '2 nhóm gặm nướu plastic vs cao su lưu hoá vệ sinh (3926, 4014)', moTa: 'Gặm nướu cho trẻ em / cao su silicone / trẻ mọc răng', nhom: ['3926', '4014'] },
  { name: '2 nhóm tấm cao su chỉ cắt chữ nhật vs cắt hình/bo góc (4008, 4016)', moTa: 'Tấm lót chuột máy tính / Cao su lưu hóa, xốp, vải / None', nhom: ['4008', '4016'] },
  { name: '2 nhóm mạch biến đổi điện tĩnh vs linh kiện bán dẫn IGBT (8504, 8541)', moTa: 'Mô đun IGBT / None / Chuyển mạch bán dẫn trong thiết bị điện dùng cho máy biến tần', nhom: ['8504', '8541'] },
];

check('MAU_PHAN_VAN có đủ 15 mẫu đại diện (7 mẫu gốc + 8 cặp phân vân vòng 2)', MAU_PHAN_VAN.length === 15, `len=${MAU_PHAN_VAN.length}`);

for (const tc of MAU_PHAN_VAN) {
  const out = phanTichHoiTruoc4So({ moTa: tc.moTa, ungVien: tc.nhom });
  const hasBranches = tc.nhom.every((h) => out.nhanh.some((n) => n.nhom === h && n.dieuKien.length >= 4 && n.canCu.length >= 4 && n.nguon));
  const distinctDk = new Set(out.nhanh.map((n) => n.dieuKien)).size === tc.nhom.length;
  const matchPrefix = out.dapAnDieuKien && tc.nhom.every((h) => out.dapAnDieuKien.includes(`→ nhóm ${h} (`));
  const segCount = out.dapAnDieuKien ? out.dapAnDieuKien.split('; ').length : 0;
  check(
    `PHAN_VAN ${tc.name}: đủ nhánh + khuôn "Nếu ... → nhóm X (căn cứ)" + câu hỏi`,
    out.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && hasBranches
      && distinctDk
      && matchPrefix
      && segCount === tc.nhom.length
      && Boolean(out.cauHoi)
      && out.canCu.length === tc.nhom.length,
    JSON.stringify({ status: out.trangThai, segCount, distinctDk, dapAn: out.dapAnDieuKien?.slice(0, 120) }),
  );
}

// 2b. Kiểm tra tra cứu điều khoản từ data/luat/dieu-khoan-tang2.json (Chú giải 5(A)/6(A) Ch.84 cho 8471, Chú giải 9 Ch.40 cho 4008, Chú giải 6 Ch.61 cho 6111)
{
  const c8471 = phanTichHoiTruoc4So({ moTa: 'Bộ xử lý hình ảnh / None / xử lý hình ảnh cho màn hình LED', ungVien: ['8471', '8543'] });
  const b8471 = c8471.nhanh.find((n) => n.nhom === '8471');
  check(
    'Điều khoản tầng 2 cho 8471: dẫn Chú giải 5(A)/6(A) Ch.84 từ dieu-khoan-tang2.json',
    Boolean(b8471 && b8471.nguon.includes('dieu-khoan-tang2.json#chuong:84:chu_giai:6') && /Chú giải 5\(A\)/.test(b8471.canCu)),
    JSON.stringify(b8471),
  );

  const c4008 = phanTichHoiTruoc4So({ moTa: 'Tấm lót chuột máy tính / Cao su lưu hóa, xốp, vải / None', ungVien: ['4008', '4016'] });
  const b4008 = c4008.nhanh.find((n) => n.nhom === '4008');
  check(
    'Điều khoản tầng 2 cho 4008: dẫn Chú giải 9 Ch.40 từ dieu-khoan-tang2.json',
    Boolean(b4008 && b4008.nguon.includes('dieu-khoan-tang2.json#chuong:40:chu_giai:9') && b4008.canCu.includes('Chú giải 9 Ch.40')),
    JSON.stringify(b4008),
  );

  const c6111 = phanTichHoiTruoc4So({ moTa: 'Váy liền thân trẻ em gái', ungVien: ['6104', '6111'] });
  const b6111 = c6111.nhanh.find((n) => n.nhom === '6111');
  check(
    'Điều khoản tầng 2 cho 6111: dẫn Chú giải 6 Ch.61 từ dieu-khoan-tang2.json',
    Boolean(b6111 && b6111.nguon.includes('dieu-khoan-tang2.json#chuong:61:chu_giai:6') && b6111.canCu.includes('Chú giải 6 Ch.61')),
    JSON.stringify(b6111),
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

// 3b. OZV-2123 — Cạnh loại trừ 2 chiều 85.39 <-> 94.05 cho ca 146 tầng 4 số
// ('Đèn LED dạng dải / None / Trang trí Decor thay đổi không gian phòng')
{
  const S = require('../lib/so-tay.js');
  const { loadSoTay, soTayGates, nhomLienQuanSoTay } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
  const D = require('../lib/do-thi/index.js');
  D.datLai();

  const q146 = 'Đèn LED dạng dải / None / Trang trí Decor thay đổi không gian phòng';
  const st8539 = loadSoTay('8539');
  const st9405 = loadSoTay('9405');
  const v8539 = S.verifySoTay(st8539, '8539');
  const v9405 = S.verifySoTay(st9405, '9405');
  check(
    '[OZV-2123 verifySoTay] sổ tay 8539 và 9405 đạt 100% (0 mục không kiểm được nguồn)',
    v8539.loai.length === 0 && v9405.loai.length === 0,
    JSON.stringify({ loai8539: v8539.loai, loai9405: v9405.loai }),
  );

  const lt8539 = (st8539?.loaiTru || []).find((x) => x.sangNhom === '9405' && x.canCuLoaiTru?.nguon === 'nhom9405.nhom');
  const lt9405 = (st9405?.loaiTru || []).find((x) => x.sangNhom === '8539' && x.canCuLoaiTru?.nguon === 'nhom8539.nhom');
  check(
    '[OZV-2123 căn cứ] sổ tay 8539 và 9405 có mục loaiTru 2 chiều 8539 <-> 9405 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(lt8539 && lt8539.nguon === 'nhom8539.nhom' && S.checkItem('loaiTru', lt8539, S.sourcesFor('8539'), '8539') === null)
      && Boolean(lt9405 && lt9405.nguon === 'nhom9405.nhom' && S.checkItem('loaiTru', lt9405, S.sourcesFor('9405'), '9405') === null)
      && lt8539.dieuKien !== lt9405.dieuKien,
    JSON.stringify({ lt8539, lt9405 }),
  );

  const c5Tu8539 = D.canhTu('8539', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '9405');
  const c5Tu9405 = D.canhTu('9405', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8539');
  const c6Tu8539 = D.canhTu('8539', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '9405');
  const c6Tu9405 = D.canhTu('9405', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8539');
  const mrTu8539 = D.moRongUngVien(['8539'], q146);
  const mrTu9405 = D.moRongUngVien(['9405'], q146);
  const rel8539 = nhomLienQuanSoTay('8539');
  const rel9405 = nhomLienQuanSoTay('9405');
  check(
    '[OZV-2123 đồ thị 2 chiều] bảng cạnh có C5/C6 8539<->9405, nhomLienQuanSoTay 2 chiều và moRongUngVien kéo 2 chiều cho ca 146',
    c5Tu8539.some((e) => e.nguon === 'nhom8539.nhom' && e.canCuLoaiTru?.nguon === 'nhom9405.nhom')
      && c5Tu9405.some((e) => e.nguon === 'nhom9405.nhom' && e.canCuLoaiTru?.nguon === 'nhom8539.nhom')
      && c6Tu8539.length >= 1
      && c6Tu9405.length >= 1
      && rel8539.includes('9405')
      && rel9405.includes('8539')
      && mrTu8539.some((x) => x.nhom === '9405')
      && mrTu9405.some((x) => x.nhom === '8539'),
    JSON.stringify({ c5Tu8539: c5Tu8539.length, c5Tu9405: c5Tu9405.length, mrTu8539, mrTu9405 }),
  );

  const ht146 = phanTichHoiTruoc4So({ moTa: q146, ungVien: ['8539', '9405'] });
  const distinctDk146 = new Set((ht146.nhanh || []).map((n) => n.dieuKien)).size === 2;
  check(
    '[OZV-2123 hoi-truoc-4so] ca 146 Đèn LED dạng dải tách 2 nhánh điều kiện riêng biệt cho [8539, 9405]',
    ht146.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && distinctDk146
      && Boolean(ht146.dapAnDieuKien && ht146.dapAnDieuKien.includes('→ nhóm 8539 (') && ht146.dapAnDieuKien.includes('→ nhóm 9405 ('))
      && Boolean(ht146.cauHoi),
    JSON.stringify({ trangThai: ht146.trangThai, distinctDk146, dapAnDieuKien: ht146.dapAnDieuKien }),
  );

  const pb8539 = cauPhanBietNhom('8539', ['8539', '9405'], q146);
  const pb9405 = cauPhanBietNhom('9405', ['9405', '8539'], q146);
  check(
    '[OZV-2123 thuận cauPhanBietNhom] sinh câu hỏi phân biệt 2 chiều 85.39 <-> 94.05 cho ca 146 Đèn LED dạng dải',
    pb8539.length === 1
      && pb8539[0].loai === 'PHAN_BIET_NHOM'
      && pb8539[0].canCu === 'so-tay'
      && pb8539[0].nguon === 'nhom8539.nhom'
      && /94\.05/.test(pb8539[0].questionVi)
      && /85\.39/.test(pb8539[0].questionVi)
      && pb9405.length === 1
      && pb9405[0].loai === 'PHAN_BIET_NHOM'
      && pb9405[0].canCu === 'so-tay'
      && pb9405[0].nguon === 'nhom9405.nhom'
      && /85\.39/.test(pb9405[0].questionVi)
      && /94\.05/.test(pb9405[0].questionVi),
    JSON.stringify({ pb8539, pb9405 }),
  );

  const g8539To9405 = soTayGates({
    hs: '85395100',
    productText: 'Đèn LED dải trang trí phòng có phích cắm và điều khiển hoàn chỉnh',
    productName: 'Đèn LED dải trang trí phòng có phích cắm và điều khiển hoàn chỉnh',
  });
  const g9405To8539 = soTayGates({
    hs: '94054290',
    productText: 'Đèn LED dải chỉ là dải mạch LED trần làm nguồn sáng điện',
    productName: 'Đèn LED dải chỉ là dải mạch LED trần làm nguồn sáng điện',
  });
  check(
    '[OZV-2123 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 8539 -> 9405 và 9405 -> 8539',
    (g8539To9405.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('9405'))
      && (g9405To8539.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8539')),
    JSON.stringify({ g8539To9405: g8539To9405.challenges, g9405To8539: g9405To8539.challenges }),
  );

  const dcPha8539 = cauPhanBietNhom('8539', ['8539', '9405'], 'Đèn pha gắn kín dùng cho xe có động cơ thuộc Chương 87');
  const dcPha9405 = cauPhanBietNhom('9405', ['9405', '8539'], 'Đèn pha gắn kín dùng cho xe có động cơ thuộc Chương 87');
  const dcBao8539 = cauPhanBietNhom('8539', ['8539', '9405'], 'Đèn bão đốt bằng dầu hỏa xách tay');
  const dcBao9405 = cauPhanBietNhom('9405', ['9405', '8539'], 'Đèn bão đốt bằng dầu hỏa xách tay');
  const gDoi8539 = soTayGates({
    hs: '85395210',
    productText: 'Bóng đèn LED tròn đuôi xoáy E27, 9W, 220V',
    productName: 'Bóng đèn LED tròn đuôi xoáy E27, 9W, 220V',
  });
  const gDoi9405 = soTayGates({
    hs: '94055011',
    productText: 'Đèn bão đốt bằng dầu hỏa xách tay',
    productName: 'Đèn bão đốt bằng dầu hỏa xách tay',
  });
  check(
    '[OZV-2123 đối chứng] đèn pha gắn kín ô tô, bóng đèn LED tròn E27 và đèn bão dầu hỏa không hỏi oan / không kéo oan 85.39 <-> 94.05',
    dcPha8539.length === 0
      && dcPha9405.length === 0
      && dcBao8539.length === 0
      && dcBao9405.length === 0
      && !D.moRongUngVien(['8539'], 'Đèn pha gắn kín dùng cho xe có động cơ thuộc Chương 87').some((x) => x.nhom === '9405')
      && !D.moRongUngVien(['9405'], 'Đèn bão đốt bằng dầu hỏa xách tay').some((x) => x.nhom === '8539')
      && !(gDoi8539.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('9405'))
      && !(gDoi9405.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8539')),
    JSON.stringify({ dcPha8539, dcPha9405, dcBao8539, dcBao9405, gDoi8539: gDoi8539.challenges, gDoi9405: gDoi9405.challenges }),
  );
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
