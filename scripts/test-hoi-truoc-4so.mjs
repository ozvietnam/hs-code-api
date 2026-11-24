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

// 5. OZV-2136 — Cạnh loại trừ 2 chiều 39.17 <-> 59.09 cho ca 164 tầng 4 số
// ('Dây hơi bàn ủi / Vải bọc nhựa / Phụ kiện bàn ủi, dùng trong ngành công nghiệp may mặc')
{
  const S = require('../lib/so-tay.js');
  const { loadSoTay, soTayGates, nhomLienQuanSoTay } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
  const D = require('../lib/do-thi/index.js');
  D.datLai();

  const q164 = 'Dây hơi bàn ủi / Vải bọc nhựa / Phụ kiện bàn ủi, dùng trong ngành công nghiệp may mặc';
  const st3917 = loadSoTay('3917');
  const st5909 = loadSoTay('5909');
  const lt3917 = (st3917?.loaiTru || []).find((x) => x.sangNhom === '5909' && x.canCuLoaiTru?.nguon === 'nhom5909.nhom' && /dây hơi|vải bọc nhựa/i.test(x.dieuKien || ''));
  const lt5909 = (st5909?.loaiTru || []).find((x) => x.sangNhom === '3917' && x.canCuLoaiTru?.nguon === 'nhom3917.nhom' && /dây hơi|rỗng nòng|plastic/i.test(x.dieuKien || ''));
  check(
    '[OZV-2136 căn cứ] sổ tay 3917 và 5909 có mục loaiTru 2 chiều 3917 <-> 5909 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(lt3917 && lt3917.nguon === 'ch39.chuong' && S.checkItem('loaiTru', lt3917, S.sourcesFor('3917'), '3917') === null)
      && Boolean(lt5909 && lt5909.nguon === 'nhom5909.nhom' && S.checkItem('loaiTru', lt5909, S.sourcesFor('5909'), '5909') === null)
      && lt3917.dieuKien !== lt5909.dieuKien
      && !/;/.test(lt3917.dieuKien)
      && !/;/.test(lt5909.dieuKien),
    JSON.stringify({ lt3917: Boolean(lt3917), lt5909: Boolean(lt5909) }),
  );

  const c5Tu3917 = D.canhTu('3917', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '5909');
  const c5Tu5909 = D.canhTu('5909', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '3917');
  const c6Tu3917 = D.canhTu('3917', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '5909');
  const c6Tu5909 = D.canhTu('5909', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '3917');
  const mrTu3917 = D.moRongUngVien(['3917'], q164);
  const mrTu5909 = D.moRongUngVien(['5909'], q164);
  const rel3917 = nhomLienQuanSoTay('3917');
  const rel5909 = nhomLienQuanSoTay('5909');
  check(
    '[OZV-2136 đồ thị 2 chiều] bảng cạnh có C5/C6 3917<->5909, nhomLienQuanSoTay 2 chiều và moRongUngVien kéo 2 chiều cho ca 164',
    c5Tu3917.some((e) => e.nguon === 'ch39.chuong' && e.canCuLoaiTru?.nguon === 'nhom5909.nhom')
      && c5Tu5909.some((e) => e.nguon === 'nhom5909.nhom' && e.canCuLoaiTru?.nguon === 'nhom3917.nhom')
      && c6Tu3917.length >= 1
      && c6Tu5909.length >= 1
      && rel3917.includes('5909')
      && rel5909.includes('3917')
      && mrTu3917.some((x) => x.nhom === '5909')
      && mrTu5909.some((x) => x.nhom === '3917'),
    JSON.stringify({ c5Tu3917: c5Tu3917.length, c5Tu5909: c5Tu5909.length, mrTu3917, mrTu5909 }),
  );

  const ht164 = phanTichHoiTruoc4So({ moTa: q164, ungVien: ['3917', '5909'] });
  const distinctDk164 = new Set((ht164.nhanh || []).map((n) => n.dieuKien)).size === 2;
  check(
    '[OZV-2136 hoi-truoc-4so] ca 164 Dây hơi bàn ủi tách 2 nhánh điều kiện riêng biệt cho [3917, 5909]',
    ht164.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && distinctDk164
      && Boolean(ht164.dapAnDieuKien && ht164.dapAnDieuKien.includes('→ nhóm 3917 (') && ht164.dapAnDieuKien.includes('→ nhóm 5909 ('))
      && Boolean(ht164.cauHoi),
    JSON.stringify({ trangThai: ht164.trangThai, distinctDk164, dapAnDieuKien: ht164.dapAnDieuKien }),
  );

  const pb3917 = cauPhanBietNhom('3917', ['3917', '5909'], q164);
  const pb5909 = cauPhanBietNhom('5909', ['5909', '3917'], q164);
  check(
    '[OZV-2136 thuận cauPhanBietNhom] sinh câu hỏi phân biệt 2 chiều 39.17 <-> 59.09 cho ca 164 Dây hơi bàn ủi',
    pb3917.length === 1
      && pb3917[0].loai === 'PHAN_BIET_NHOM'
      && pb3917[0].canCu === 'so-tay'
      && pb3917[0].nguon === 'ch39.chuong'
      && /59\.09/.test(pb3917[0].questionVi)
      && /39\.17/.test(pb3917[0].questionVi)
      && pb5909.length === 1
      && pb5909[0].loai === 'PHAN_BIET_NHOM'
      && pb5909[0].canCu === 'so-tay'
      && pb5909[0].nguon === 'nhom5909.nhom'
      && /39\.17/.test(pb5909[0].questionVi)
      && /59\.09/.test(pb5909[0].questionVi),
    JSON.stringify({ pb3917, pb5909 }),
  );

  const g3917To5909 = soTayGates({
    hs: '39172929',
    productText: q164,
    productName: 'Dây hơi bàn ủi',
    candidateHeadings: ['3917', '5909'],
  });
  const g5909To3917 = soTayGates({
    hs: '59090090',
    productText: q164,
    productName: 'Dây hơi bàn ủi',
    candidateHeadings: ['5909', '3917'],
  });
  check(
    '[OZV-2136 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 3917 -> 5909 và 5909 -> 3917',
    (g3917To5909.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('5909'))
      && (g5909To3917.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('3917')),
    JSON.stringify({ g3917To5909: g3917To5909.challenges, g5909To3917: g5909To3917.challenges }),
  );

  const dcXucXich = 'Vỏ xúc xích nhân tạo bằng protein đã làm cứng';
  const dcVaiThoi = 'Vải dệt thoi cotton khổ rộng chưa may thành ống';
  const dcXx3917 = cauPhanBietNhom('3917', ['3917', '5909'], dcXucXich);
  const dcXx5909 = cauPhanBietNhom('5909', ['5909', '3917'], dcXucXich);
  const dcVt3917 = cauPhanBietNhom('3917', ['3917', '5909'], dcVaiThoi);
  const dcVt5909 = cauPhanBietNhom('5909', ['5909', '3917'], dcVaiThoi);
  const gDoi3917 = soTayGates({
    hs: '39171010',
    productText: dcXucXich,
    productName: dcXucXich,
  });
  const gDoi5909 = soTayGates({
    hs: '59090010',
    productText: dcVaiThoi,
    productName: dcVaiThoi,
  });
  check(
    '[OZV-2136 đối chứng] vỏ xúc xích protein và vải dệt thoi cotton không hỏi oan / không kéo oan 39.17 <-> 59.09',
    dcXx3917.length === 0
      && dcXx5909.length === 0
      && dcVt3917.length === 0
      && dcVt5909.length === 0
      && !D.moRongUngVien(['3917'], dcXucXich).some((x) => x.nhom === '5909')
      && !D.moRongUngVien(['5909'], dcVaiThoi).some((x) => x.nhom === '3917')
      && !(gDoi3917.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('5909'))
      && !(gDoi5909.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('3917')),
    JSON.stringify({ dcXx3917, dcXx5909, dcVt3917, dcVt5909, gDoi3917: gDoi3917.challenges, gDoi5909: gDoi5909.challenges }),
  );
}

// 6. OZV-2146 — Cạnh loại trừ 2 chiều 39.19 <-> 39.20 cho ca 104 tầng 4 số
// ('Phim cường lực bảo vệ màn hình đồng hồ thông minh / nhựa PPF / Bảo vệ màn hình đồng hồ thông minh')
{
  const S = require('../lib/so-tay.js');
  const { loadSoTay, soTayGates, nhomLienQuanSoTay } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
  const D = require('../lib/do-thi/index.js');
  D.datLai();

  const q104 = 'Phim cường lực bảo vệ màn hình đồng hồ thông minh / nhựa PPF / Bảo vệ màn hình đồng hồ thông minh';
  const st3919 = loadSoTay('3919');
  const st3920 = loadSoTay('3920');
  const v3919 = S.verifySoTay(st3919, '3919');
  const v3920 = S.verifySoTay(st3920, '3920');
  check(
    '[OZV-2146 verifySoTay] sổ tay 3919 và 3920 đạt 100% (0 mục không kiểm được nguồn)',
    v3919.loai.length === 0 && v3920.loai.length === 0,
    JSON.stringify({ loai3919: v3919.loai, loai3920: v3920.loai }),
  );

  const lt3919 = (st3919?.loaiTru || []).find((x) => x.sangNhom === '3920' && x.canCuLoaiTru?.nguon === 'nhom3920.nhom' && /phim|PPF|màn hình/i.test(x.dieuKien || ''));
  const lt3920 = (st3920?.loaiTru || []).find((x) => x.sangNhom === '3919' && x.canCuLoaiTru?.nguon === 'nhom3919.nhom' && /phim|PPF|màn hình/i.test(x.dieuKien || ''));
  check(
    '[OZV-2146 căn cứ] sổ tay 3919 và 3920 có mục loaiTru 2 chiều 3919 <-> 3920 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(lt3919 && lt3919.nguon === 'nhom3919.nhom' && S.checkItem('loaiTru', lt3919, S.sourcesFor('3919'), '3919') === null)
      && Boolean(lt3920 && lt3920.nguon === 'nhom3920.nhom' && S.checkItem('loaiTru', lt3920, S.sourcesFor('3920'), '3920') === null)
      && lt3919.dieuKien !== lt3920.dieuKien
      && !/;/.test(lt3919.dieuKien)
      && !/;/.test(lt3920.dieuKien),
    JSON.stringify({ lt3919: Boolean(lt3919), lt3920: Boolean(lt3920) }),
  );

  const c5Tu3919 = D.canhTu('3919', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '3920');
  const c5Tu3920 = D.canhTu('3920', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '3919');
  const c6Tu3919 = D.canhTu('3919', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '3920');
  const c6Tu3920 = D.canhTu('3920', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '3919');
  const mrTu3919 = D.moRongUngVien(['3919'], q104);
  const mrTu3920 = D.moRongUngVien(['3920'], q104);
  const rel3919 = nhomLienQuanSoTay('3919');
  const rel3920 = nhomLienQuanSoTay('3920');
  check(
    '[OZV-2146 đồ thị 2 chiều] bảng cạnh có C5/C6 3919<->3920, nhomLienQuanSoTay 2 chiều và moRongUngVien kéo 2 chiều cho ca 104',
    c5Tu3919.some((e) => e.nguon === 'nhom3919.nhom' && e.canCuLoaiTru?.nguon === 'nhom3920.nhom')
      && c5Tu3920.some((e) => e.nguon === 'nhom3920.nhom' && e.canCuLoaiTru?.nguon === 'nhom3919.nhom')
      && c6Tu3919.length >= 1
      && c6Tu3920.length >= 1
      && rel3919.includes('3920')
      && rel3920.includes('3919')
      && mrTu3919.some((x) => x.nhom === '3920')
      && mrTu3920.some((x) => x.nhom === '3919'),
    JSON.stringify({ c5Tu3919: c5Tu3919.length, c5Tu3920: c5Tu3920.length, mrTu3919, mrTu3920 }),
  );

  const ht104 = phanTichHoiTruoc4So({ moTa: q104, ungVien: ['3919', '3920'] });
  const distinctDk104 = new Set((ht104.nhanh || []).map((n) => n.dieuKien)).size === 2;
  check(
    '[OZV-2146 hoi-truoc-4so] ca 104 Phim cường lực bảo vệ màn hình tách 2 nhánh điều kiện riêng biệt cho [3919, 3920]',
    ht104.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && distinctDk104
      && Boolean(ht104.dapAnDieuKien && ht104.dapAnDieuKien.includes('→ nhóm 3919 (') && ht104.dapAnDieuKien.includes('→ nhóm 3920 ('))
      && Boolean(ht104.cauHoi),
    JSON.stringify({ trangThai: ht104.trangThai, distinctDk104, dapAnDieuKien: ht104.dapAnDieuKien }),
  );

  const pb3919 = cauPhanBietNhom('3919', ['3919', '3920'], q104);
  const pb3920 = cauPhanBietNhom('3920', ['3920', '3919'], q104);
  check(
    '[OZV-2146 thuận cauPhanBietNhom] sinh câu hỏi phân biệt 2 chiều 39.19 <-> 39.20 cho ca 104 Phim PPF bảo vệ màn hình',
    pb3919.length === 1
      && pb3919[0].loai === 'PHAN_BIET_NHOM'
      && pb3919[0].canCu === 'so-tay'
      && pb3919[0].nguon === 'nhom3919.nhom'
      && /39\.20/.test(pb3919[0].questionVi)
      && /39\.19/.test(pb3919[0].questionVi)
      && pb3920.length === 1
      && pb3920[0].loai === 'PHAN_BIET_NHOM'
      && pb3920[0].canCu === 'so-tay'
      && pb3920[0].nguon === 'nhom3920.nhom'
      && /39\.19/.test(pb3920[0].questionVi)
      && /39\.20/.test(pb3920[0].questionVi),
    JSON.stringify({ pb3919, pb3920 }),
  );

  const g3919To3920 = soTayGates({
    hs: '39199099',
    productText: q104,
    productName: 'Phim cường lực bảo vệ màn hình đồng hồ thông minh',
    candidateHeadings: ['3919', '3920'],
  });
  const g3920To3919 = soTayGates({
    hs: '39201090',
    productText: q104,
    productName: 'Phim cường lực bảo vệ màn hình đồng hồ thông minh',
    candidateHeadings: ['3920', '3919'],
  });
  check(
    '[OZV-2146 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 3919 -> 3920 và 3920 -> 3919',
    (g3919To3920.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('3920'))
      && (g3920To3919.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('3919')),
    JSON.stringify({ g3919To3920: g3919To3920.challenges, g3920To3919: g3920To3919.challenges }),
  );

  const dcOngNhua = 'Ống nhựa PVC cứng dùng dẫn nước tưới';
  const dcTamSan = 'Tấm trải sàn vinyl phủ tường phòng khách';
  const dcOng3919 = cauPhanBietNhom('3919', ['3919', '3920'], dcOngNhua);
  const dcOng3920 = cauPhanBietNhom('3920', ['3920', '3919'], dcOngNhua);
  const dcSan3919 = cauPhanBietNhom('3919', ['3919', '3920'], dcTamSan);
  const dcSan3920 = cauPhanBietNhom('3920', ['3920', '3919'], dcTamSan);
  const gDoi3919 = soTayGates({
    hs: '39199099',
    productText: dcOngNhua,
    productName: dcOngNhua,
  });
  const gDoi3920 = soTayGates({
    hs: '39201090',
    productText: dcTamSan,
    productName: dcTamSan,
  });
  check(
    '[OZV-2146 đối chứng] ống nhựa PVC và tấm trải sàn vinyl không hỏi oan / không kéo oan 39.19 <-> 39.20',
    dcOng3919.length === 0
      && dcOng3920.length === 0
      && dcSan3919.length === 0
      && dcSan3920.length === 0
      && !D.moRongUngVien(['3919'], dcOngNhua).some((x) => x.nhom === '3920')
      && !D.moRongUngVien(['3920'], dcTamSan).some((x) => x.nhom === '3919')
      && !(gDoi3919.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('3920'))
      && !(gDoi3920.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('3919')),
    JSON.stringify({ dcOng3919, dcOng3920, dcSan3919, dcSan3920, gDoi3919: gDoi3919.challenges, gDoi3920: gDoi3920.challenges }),
  );
}

// 7. OZV-2158 — Cạnh loại trừ 2 chiều 90.13 <-> 85.41 cho ca 162 tầng 4 số
// ('Đầu chiếu tia Laser / None / Chiếu tia sáng chấm đỏ')
{
  const S = require('../lib/so-tay.js');
  const { loadSoTay, soTayGates, nhomLienQuanSoTay } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
  const D = require('../lib/do-thi/index.js');
  D.datLai();

  const q162 = 'Đầu chiếu tia Laser / None / Chiếu tia sáng chấm đỏ';
  const st9013 = loadSoTay('9013');
  const st8541 = loadSoTay('8541');
  const v9013 = S.verifySoTay(st9013, '9013');
  const v8541 = S.verifySoTay(st8541, '8541');
  check(
    '[OZV-2158 verifySoTay] sổ tay 9013 và 8541 đạt 100% (0 mục không kiểm được nguồn)',
    v9013.loai.length === 0 && v8541.loai.length === 0,
    JSON.stringify({ loai9013: v9013.loai, loai8541: v8541.loai }),
  );

  const lt9013 = (st9013?.loaiTru || []).find((x) => x.sangNhom === '8541' && x.canCuLoaiTru?.nguon === 'nhom8541.nhom' && /đầu chiếu tia laser|đi-ốt laser/i.test(x.dieuKien || ''));
  const lt8541 = (st8541?.loaiTru || []).find((x) => x.sangNhom === '9013' && x.canCuLoaiTru?.nguon === 'nhom9013.nhom' && /đầu chiếu tia laser|thiết bị tạo tia laser/i.test(x.dieuKien || ''));
  check(
    '[OZV-2158 căn cứ] sổ tay 9013 và 8541 có mục loaiTru 2 chiều 9013 <-> 8541 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(lt9013 && lt9013.nguon === 'nhom9013.nhom' && S.checkItem('loaiTru', lt9013, S.sourcesFor('9013'), '9013') === null)
      && Boolean(lt8541 && lt8541.nguon === 'nhom8541.nhom' && S.checkItem('loaiTru', lt8541, S.sourcesFor('8541'), '8541') === null)
      && lt9013.dieuKien !== lt8541.dieuKien
      && !/;/.test(lt9013.dieuKien)
      && !/;/.test(lt8541.dieuKien),
    JSON.stringify({ lt9013: Boolean(lt9013), lt8541: Boolean(lt8541) }),
  );

  const c5Tu9013 = D.canhTu('9013', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8541');
  const c5Tu8541 = D.canhTu('8541', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '9013');
  const c6Tu9013 = D.canhTu('9013', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8541');
  const c6Tu8541 = D.canhTu('8541', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '9013');
  const mrTu9013 = D.moRongUngVien(['9013'], q162);
  const mrTu8541 = D.moRongUngVien(['8541'], q162);
  const rel9013 = nhomLienQuanSoTay('9013');
  const rel8541 = nhomLienQuanSoTay('8541');
  check(
    '[OZV-2158 đồ thị 2 chiều] bảng cạnh có C5/C6 9013<->8541, nhomLienQuanSoTay 2 chiều và moRongUngVien kéo 2 chiều cho ca 162',
    c5Tu9013.some((e) => e.nguon === 'nhom9013.nhom' && e.canCuLoaiTru?.nguon === 'nhom8541.nhom')
      && c5Tu8541.some((e) => e.nguon === 'nhom8541.nhom' && e.canCuLoaiTru?.nguon === 'nhom9013.nhom')
      && c6Tu9013.length >= 1
      && c6Tu8541.length >= 1
      && rel9013.includes('8541')
      && rel8541.includes('9013')
      && mrTu9013.some((x) => x.nhom === '8541')
      && mrTu8541.some((x) => x.nhom === '9013'),
    JSON.stringify({ c5Tu9013: c5Tu9013.length, c5Tu8541: c5Tu8541.length, mrTu9013, mrTu8541 }),
  );

  const ht162 = phanTichHoiTruoc4So({ moTa: q162, ungVien: ['9013', '8541'] });
  const distinctDk162 = new Set((ht162.nhanh || []).map((n) => n.dieuKien)).size === 2;
  check(
    '[OZV-2158 hoi-truoc-4so] ca 162 Đầu chiếu tia Laser tách 2 nhánh điều kiện riêng biệt cho [9013, 8541]',
    ht162.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && distinctDk162
      && Boolean(ht162.dapAnDieuKien && ht162.dapAnDieuKien.includes('→ nhóm 9013 (') && ht162.dapAnDieuKien.includes('→ nhóm 8541 ('))
      && Boolean(ht162.cauHoi),
    JSON.stringify({ trangThai: ht162.trangThai, distinctDk162, dapAnDieuKien: ht162.dapAnDieuKien }),
  );

  const pb9013 = cauPhanBietNhom('9013', ['9013', '8541'], q162);
  const pb8541 = cauPhanBietNhom('8541', ['8541', '9013'], q162);
  check(
    '[OZV-2158 thuận cauPhanBietNhom] sinh câu hỏi phân biệt 2 chiều 90.13 <-> 85.41 cho ca 162 Đầu chiếu tia Laser',
    pb9013.length === 1
      && pb9013[0].loai === 'PHAN_BIET_NHOM'
      && pb9013[0].canCu === 'so-tay'
      && pb9013[0].nguon === 'nhom9013.nhom'
      && /85\.41/.test(pb9013[0].questionVi)
      && /90\.13/.test(pb9013[0].questionVi)
      && pb8541.length === 1
      && pb8541[0].loai === 'PHAN_BIET_NHOM'
      && pb8541[0].canCu === 'so-tay'
      && pb8541[0].nguon === 'nhom8541.nhom'
      && /90\.13/.test(pb8541[0].questionVi)
      && /85\.41/.test(pb8541[0].questionVi),
    JSON.stringify({ pb9013, pb8541 }),
  );

  const g9013To8541 = soTayGates({
    hs: '90132000',
    productText: q162,
    productName: 'Đầu chiếu tia Laser',
    candidateHeadings: ['9013', '8541'],
  });
  const g8541To9013 = soTayGates({
    hs: '85414100',
    productText: q162,
    productName: 'Đầu chiếu tia Laser',
    candidateHeadings: ['8541', '9013'],
  });
  check(
    '[OZV-2158 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 9013 -> 8541 và 8541 -> 9013',
    (g9013To8541.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8541'))
      && (g8541To9013.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('9013')),
    JSON.stringify({ g9013To8541: g9013To8541.challenges, g8541To9013: g8541To9013.challenges }),
  );

  const dcKinhNgam = 'Kính ngắm để lắp vào vũ khí săn bắn';
  const dcPinMatTroi = 'Tế bào quang điện đã lắp ráp thành mảng mô-đun pin mặt trời';
  const dcKn9013 = cauPhanBietNhom('9013', ['9013', '8541'], dcKinhNgam);
  const dcKn8541 = cauPhanBietNhom('8541', ['8541', '9013'], dcKinhNgam);
  const dcPin9013 = cauPhanBietNhom('9013', ['9013', '8541'], dcPinMatTroi);
  const dcPin8541 = cauPhanBietNhom('8541', ['8541', '9013'], dcPinMatTroi);
  const gDoi9013 = soTayGates({
    hs: '90131010',
    productText: dcKinhNgam,
    productName: dcKinhNgam,
  });
  const gDoi8541 = soTayGates({
    hs: '85414300',
    productText: dcPinMatTroi,
    productName: dcPinMatTroi,
  });
  check(
    '[OZV-2158 đối chứng] kính ngắm vũ khí và mô-đun pin mặt trời không hỏi oan / không kéo oan 90.13 <-> 85.41',
    dcKn9013.length === 0
      && dcKn8541.length === 0
      && dcPin9013.length === 0
      && dcPin8541.length === 0
      && !D.moRongUngVien(['9013'], dcKinhNgam).some((x) => x.nhom === '8541')
      && !D.moRongUngVien(['8541'], dcPinMatTroi).some((x) => x.nhom === '9013')
      && !(gDoi9013.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8541'))
      && !(gDoi8541.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('9013')),
    JSON.stringify({ dcKn9013, dcKn8541, dcPin9013, dcPin8541, gDoi9013: gDoi9013.challenges, gDoi8541: gDoi8541.challenges }),
  );
}

// 8. OZV-2167 — Cạnh loại trừ 2 chiều 84.66 <-> 84.79 cho ca 132 tầng 4 số
// ('Bộ bàn trượt bằng tay / nhôm / gá thiết bị máy công nghiệp căn chỉnh bằng tay')
{
  const S = require('../lib/so-tay.js');
  const { loadSoTay, soTayGates, nhomLienQuanSoTay } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
  const D = require('../lib/do-thi/index.js');
  D.datLai();

  const q132 = 'Bộ bàn trượt bằng tay / nhôm / gá thiết bị máy công nghiệp căn chỉnh bằng tay';
  const st8466 = loadSoTay('8466');
  const st8479 = loadSoTay('8479');
  const v8466 = S.verifySoTay(st8466, '8466');
  const v8479 = S.verifySoTay(st8479, '8479');
  check(
    '[OZV-2167 verifySoTay] sổ tay 8466 và 8479 đạt 100% (0 mục không kiểm được nguồn)',
    v8466.loai.length === 0 && v8479.loai.length === 0,
    JSON.stringify({ loai8466: v8466.loai, loai8479: v8479.loai }),
  );

  const lt8466 = (st8466?.loaiTru || []).find((x) => x.sangNhom === '8479' && x.canCuLoaiTru?.nguon === 'nhom8479.nhom' && /bàn trượt/i.test(x.dieuKien || ''));
  const lt8479 = (st8479?.loaiTru || []).find((x) => x.sangNhom === '8466' && x.canCuLoaiTru?.nguon === 'nhom8466.nhom' && /bàn trượt/i.test(x.dieuKien || ''));
  check(
    '[OZV-2167 căn cứ] sổ tay 8466 và 8479 có mục loaiTru 2 chiều 8466 <-> 8479 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(lt8466 && lt8466.nguon === 'nhom8466.nhom' && S.checkItem('loaiTru', lt8466, S.sourcesFor('8466'), '8466') === null)
      && Boolean(lt8479 && lt8479.nguon === 'nhom8479.nhom' && S.checkItem('loaiTru', lt8479, S.sourcesFor('8479'), '8479') === null)
      && lt8466.dieuKien !== lt8479.dieuKien
      && !/;/.test(lt8466.dieuKien)
      && !/;/.test(lt8479.dieuKien),
    JSON.stringify({ lt8466: Boolean(lt8466), lt8479: Boolean(lt8479) }),
  );

  const c5Tu8466 = D.canhTu('8466', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8479');
  const c5Tu8479 = D.canhTu('8479', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8466');
  const c6Tu8466 = D.canhTu('8466', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8479');
  const c6Tu8479 = D.canhTu('8479', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8466');
  const mrTu8466 = D.moRongUngVien(['8466'], q132);
  const mrTu8479 = D.moRongUngVien(['8479'], q132);
  const rel8466 = nhomLienQuanSoTay('8466');
  const rel8479 = nhomLienQuanSoTay('8479');
  check(
    '[OZV-2167 đồ thị 2 chiều] bảng cạnh có C5/C6 8466<->8479, nhomLienQuanSoTay 2 chiều và moRongUngVien kéo 2 chiều cho ca 132',
    c5Tu8466.some((e) => e.nguon === 'nhom8466.nhom' && e.canCuLoaiTru?.nguon === 'nhom8479.nhom')
      && c5Tu8479.some((e) => e.nguon === 'nhom8479.nhom' && e.canCuLoaiTru?.nguon === 'nhom8466.nhom')
      && c6Tu8466.length >= 1
      && c6Tu8479.length >= 1
      && rel8466.includes('8479')
      && rel8479.includes('8466')
      && mrTu8466.some((x) => x.nhom === '8479')
      && mrTu8479.some((x) => x.nhom === '8466'),
    JSON.stringify({ c5Tu8466: c5Tu8466.length, c5Tu8479: c5Tu8479.length, mrTu8466, mrTu8479 }),
  );

  const ht132 = phanTichHoiTruoc4So({ moTa: q132, ungVien: ['8466', '8479'] });
  const distinctDk132 = new Set((ht132.nhanh || []).map((n) => n.dieuKien)).size === 2;
  const ht132Full = phanTichHoiTruoc4So({ moTa: q132, ungVien: ['7616', '8466', '8479'] });
  const distinctDk132Full = new Set((ht132Full.nhanh || []).map((n) => n.dieuKien)).size === 3;
  check(
    '[OZV-2167 hoi-truoc-4so] ca 132 Bộ bàn trượt bằng tay tách nhánh điều kiện riêng biệt cho [8466, 8479] và [7616, 8466, 8479]',
    ht132.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && distinctDk132
      && Boolean(ht132.dapAnDieuKien && ht132.dapAnDieuKien.includes('→ nhóm 8466 (') && ht132.dapAnDieuKien.includes('→ nhóm 8479 ('))
      && Boolean(ht132.cauHoi)
      && ht132Full.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && distinctDk132Full
      && ['7616', '8466', '8479'].every((h) => (ht132Full.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    JSON.stringify({ trangThai: ht132.trangThai, distinctDk132, distinctDk132Full, dapAnDieuKien: ht132.dapAnDieuKien }),
  );

  const pb8466 = cauPhanBietNhom('8466', ['8466', '8479'], q132);
  const pb8479 = cauPhanBietNhom('8479', ['8479', '8466'], q132);
  check(
    '[OZV-2167 thuận cauPhanBietNhom] sinh câu hỏi phân biệt 2 chiều 84.66 <-> 84.79 cho ca 132 Bộ bàn trượt bằng tay',
    pb8466.length === 1
      && pb8466[0].loai === 'PHAN_BIET_NHOM'
      && pb8466[0].canCu === 'so-tay'
      && pb8466[0].nguon === 'nhom8466.nhom'
      && /84\.79/.test(pb8466[0].questionVi)
      && /84\.66/.test(pb8466[0].questionVi)
      && pb8479.length === 1
      && pb8479[0].loai === 'PHAN_BIET_NHOM'
      && pb8479[0].canCu === 'so-tay'
      && pb8479[0].nguon === 'nhom8479.nhom'
      && /84\.66/.test(pb8479[0].questionVi)
      && /84\.79/.test(pb8479[0].questionVi),
    JSON.stringify({ pb8466, pb8479 }),
  );

  const g8466To8479 = soTayGates({
    hs: '84663000',
    productText: q132,
    productName: 'Bộ bàn trượt bằng tay',
    candidateHeadings: ['8466', '8479'],
  });
  const g8479To8466 = soTayGates({
    hs: '84798970',
    productText: q132,
    productName: 'Bộ bàn trượt bằng tay',
    candidateHeadings: ['8479', '8466'],
  });
  check(
    '[OZV-2167 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 8466 -> 8479 và 8479 -> 8466',
    (g8466To8479.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8479'))
      && (g8479To8466.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8466')),
    JSON.stringify({ g8466To8479: g8466To8479.challenges, g8479To8466: g8479To8466.challenges }),
  );

  const dcMamCap = 'Mâm cặp 3 chấu tự định tâm dùng cho máy tiện kim loại';
  const dcLamMat = 'Máy làm mát không khí bằng bay hơi dùng trong nhà xưởng';
  const dcMc8466 = cauPhanBietNhom('8466', ['8466', '8479'], dcMamCap);
  const dcMc8479 = cauPhanBietNhom('8479', ['8479', '8466'], dcMamCap);
  const dcLm8466 = cauPhanBietNhom('8466', ['8466', '8479'], dcLamMat);
  const dcLm8479 = cauPhanBietNhom('8479', ['8479', '8466'], dcLamMat);
  const gDoi8466 = soTayGates({
    hs: '84662090',
    productText: dcMamCap,
    productName: dcMamCap,
  });
  const gDoi8479 = soTayGates({
    hs: '84796000',
    productText: dcLamMat,
    productName: dcLamMat,
  });
  check(
    '[OZV-2167 đối chứng] mâm cặp máy tiện và máy làm mát không khí bay hơi không hỏi oan / không kéo oan 84.66 <-> 84.79',
    dcMc8466.length === 0
      && dcMc8479.length === 0
      && dcLm8466.length === 0
      && dcLm8479.length === 0
      && !D.moRongUngVien(['8466'], dcMamCap).some((x) => x.nhom === '8479')
      && !D.moRongUngVien(['8479'], dcLamMat).some((x) => x.nhom === '8466')
      && !(gDoi8466.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8479'))
      && !(gDoi8479.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8466')),
    JSON.stringify({ dcMc8466, dcMc8479, dcLm8466, dcLm8479, gDoi8466: gDoi8466.challenges, gDoi8479: gDoi8479.challenges }),
  );
}

// 9. OZV-2176 — Cạnh loại trừ 2 chiều 39.19 <-> 39.21 cho ca 104 tầng 4 số
// ('Phim cường lực bảo vệ màn hình đồng hồ thông minh / nhựa PPF / Bảo vệ màn hình đồng hồ thông minh')
{
  const S = require('../lib/so-tay.js');
  const { loadSoTay, soTayGates, nhomLienQuanSoTay } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
  const D = require('../lib/do-thi/index.js');
  D.datLai();

  const q104 = 'Phim cường lực bảo vệ màn hình đồng hồ thông minh / nhựa PPF / Bảo vệ màn hình đồng hồ thông minh';
  const st3919 = loadSoTay('3919');
  const st3921 = loadSoTay('3921');
  const v3919 = S.verifySoTay(st3919, '3919');
  const v3921 = S.verifySoTay(st3921, '3921');
  check(
    '[OZV-2176 verifySoTay] sổ tay 3919 và 3921 đạt 100% (0 mục không kiểm được nguồn)',
    v3919.loai.length === 0 && v3921.loai.length === 0,
    JSON.stringify({ loai3919: v3919.loai, loai3921: v3921.loai }),
  );

  const lt3919 = (st3919?.loaiTru || []).find((x) => x.sangNhom === '3921' && x.canCuLoaiTru?.nguon === 'nhom3921.nhom' && /phim|PPF|màn hình/i.test(x.dieuKien || ''));
  const lt3921 = (st3921?.loaiTru || []).find((x) => x.sangNhom === '3919' && x.canCuLoaiTru?.nguon === 'nhom3919.nhom' && /phim|PPF|màn hình/i.test(x.dieuKien || ''));
  check(
    '[OZV-2176 căn cứ] sổ tay 3919 và 3921 có mục loaiTru 2 chiều 3919 <-> 3921 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(lt3919 && lt3919.nguon === 'nhom3919.nhom' && S.checkItem('loaiTru', lt3919, S.sourcesFor('3919'), '3919') === null)
      && Boolean(lt3921 && lt3921.nguon === 'nhom3921.nhom' && S.checkItem('loaiTru', lt3921, S.sourcesFor('3921'), '3921') === null)
      && lt3919.dieuKien !== lt3921.dieuKien
      && !/;/.test(lt3919.dieuKien)
      && !/;/.test(lt3921.dieuKien),
    JSON.stringify({ lt3919: Boolean(lt3919), lt3921: Boolean(lt3921) }),
  );

  const c5Tu3919 = D.canhTu('3919', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '3921');
  const c5Tu3921 = D.canhTu('3921', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '3919');
  const c6Tu3919 = D.canhTu('3919', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '3921');
  const c6Tu3921 = D.canhTu('3921', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '3919');
  const mrTu3919 = D.moRongUngVien(['3919'], q104);
  const mrTu3921 = D.moRongUngVien(['3921'], q104);
  const rel3919 = nhomLienQuanSoTay('3919');
  const rel3921 = nhomLienQuanSoTay('3921');
  check(
    '[OZV-2176 đồ thị 2 chiều] bảng cạnh có C5/C6 3919<->3921, nhomLienQuanSoTay 2 chiều và moRongUngVien kéo 2 chiều cho ca 104',
    c5Tu3919.some((e) => e.nguon === 'nhom3919.nhom' && e.canCuLoaiTru?.nguon === 'nhom3921.nhom')
      && c5Tu3921.some((e) => e.nguon === 'nhom3921.nhom' && e.canCuLoaiTru?.nguon === 'nhom3919.nhom')
      && c6Tu3919.length >= 1
      && c6Tu3921.length >= 1
      && rel3919.includes('3921')
      && rel3921.includes('3919')
      && mrTu3919.some((x) => x.nhom === '3921')
      && mrTu3921.some((x) => x.nhom === '3919'),
    JSON.stringify({ c5Tu3919: c5Tu3919.length, c5Tu3921: c5Tu3921.length, mrTu3919, mrTu3921 }),
  );

  const ht104 = phanTichHoiTruoc4So({ moTa: q104, ungVien: ['3919', '3921'] });
  const distinctDk104 = new Set((ht104.nhanh || []).map((n) => n.dieuKien)).size === 2;
  const ht104Full = phanTichHoiTruoc4So({ moTa: q104, ungVien: ['3919', '3920', '3921'] });
  const distinctDk104Full = new Set((ht104Full.nhanh || []).map((n) => n.dieuKien)).size === 3;
  check(
    '[OZV-2176 hoi-truoc-4so] ca 104 Phim cường lực bảo vệ màn hình tách nhánh điều kiện riêng biệt cho [3919, 3921] và [3919, 3920, 3921]',
    ht104.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && distinctDk104
      && (ht104.nhanh || []).every((n) => /phim|PPF|laminate/i.test(n.dieuKien))
      && Boolean(ht104.dapAnDieuKien && ht104.dapAnDieuKien.includes('→ nhóm 3919 (') && ht104.dapAnDieuKien.includes('→ nhóm 3921 ('))
      && Boolean(ht104.cauHoi)
      && ht104Full.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && distinctDk104Full
      && ['3919', '3920', '3921'].every((h) => (ht104Full.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    JSON.stringify({ trangThai: ht104.trangThai, distinctDk104, distinctDk104Full, dapAnDieuKien: ht104.dapAnDieuKien }),
  );

  const pb3919 = cauPhanBietNhom('3919', ['3919', '3921'], q104);
  const pb3921 = cauPhanBietNhom('3921', ['3921', '3919'], q104);
  check(
    '[OZV-2176 thuận cauPhanBietNhom] sinh câu hỏi phân biệt 2 chiều 39.19 <-> 39.21 cho ca 104 Phim PPF bảo vệ màn hình',
    pb3919.length === 1
      && pb3919[0].loai === 'PHAN_BIET_NHOM'
      && pb3919[0].canCu === 'so-tay'
      && pb3919[0].nguon === 'nhom3919.nhom'
      && /39\.21/.test(pb3919[0].questionVi)
      && /39\.19/.test(pb3919[0].questionVi)
      && pb3921.length === 1
      && pb3921[0].loai === 'PHAN_BIET_NHOM'
      && pb3921[0].canCu === 'so-tay'
      && pb3921[0].nguon === 'nhom3921.nhom'
      && /39\.19/.test(pb3921[0].questionVi)
      && /39\.21/.test(pb3921[0].questionVi),
    JSON.stringify({ pb3919, pb3921 }),
  );

  const g3919To3921 = soTayGates({
    hs: '39199099',
    productText: q104,
    productName: 'Phim cường lực bảo vệ màn hình đồng hồ thông minh',
    candidateHeadings: ['3919', '3921'],
  });
  const g3921To3919 = soTayGates({
    hs: '39211192',
    productText: q104,
    productName: 'Phim cường lực bảo vệ màn hình đồng hồ thông minh',
    candidateHeadings: ['3921', '3919'],
  });
  check(
    '[OZV-2176 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 3919 -> 3921 và 3921 -> 3919',
    (g3919To3921.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('3921'))
      && (g3921To3919.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('3919')),
    JSON.stringify({ g3919To3921: g3919To3921.challenges, g3921To3919: g3921To3919.challenges }),
  );

  const dcBangKeo = 'Băng keo tự dính PVC dạng cuộn rộng 5 cm';
  const dcBonTam = 'Bồn tắm và chậu rửa bằng plastic dùng trong phòng vệ sinh';
  const dcBk3919 = cauPhanBietNhom('3919', ['3919', '3921'], dcBangKeo);
  const dcBk3921 = cauPhanBietNhom('3921', ['3921', '3919'], dcBangKeo);
  const dcBon3919 = cauPhanBietNhom('3919', ['3919', '3921'], dcBonTam);
  const dcBon3921 = cauPhanBietNhom('3921', ['3921', '3919'], dcBonTam);
  const gDoi3919 = soTayGates({
    hs: '39191010',
    productText: dcBangKeo,
    productName: dcBangKeo,
  });
  const gDoi3921 = soTayGates({
    hs: '39211192',
    productText: dcBonTam,
    productName: dcBonTam,
  });
  check(
    '[OZV-2176 đối chứng] băng keo tự dính PVC và bồn tắm plastic không hỏi oan / không kéo oan 39.19 <-> 39.21',
    dcBk3919.length === 0
      && dcBk3921.length === 0
      && dcBon3919.length === 0
      && dcBon3921.length === 0
      && !D.moRongUngVien(['3919'], dcBangKeo).some((x) => x.nhom === '3921')
      && !D.moRongUngVien(['3921'], dcBonTam).some((x) => x.nhom === '3919')
      && !(gDoi3919.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('3921'))
      && !(gDoi3921.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('3919')),
    JSON.stringify({ dcBk3919, dcBk3921, dcBon3919, dcBon3921, gDoi3919: gDoi3919.challenges, gDoi3921: gDoi3921.challenges }),
  );
}

// 10. OZV-2184 — Cạnh loại trừ 2 chiều 84.66 <-> 84.83 cho ca 132 tầng 4 số
// ('Bộ bàn trượt bằng tay / nhôm / gá thiết bị máy công nghiệp căn chỉnh bằng tay' và 'Con lăn đỡ trục cán bằng thép hợp kim')
{
  const S = require('../lib/so-tay.js');
  const { loadSoTay, soTayGates, nhomLienQuanSoTay } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
  const D = require('../lib/do-thi/index.js');
  D.datLai();

  const q132BanTruot = 'Bộ bàn trượt bằng tay / nhôm / gá thiết bị máy công nghiệp căn chỉnh bằng tay';
  const q132ConLan = 'Con lăn đỡ trục cán bằng thép hợp kim';
  const st8466 = loadSoTay('8466');
  const st8483 = loadSoTay('8483');
  const v8466 = S.verifySoTay(st8466, '8466');
  const v8483 = S.verifySoTay(st8483, '8483');
  check(
    '[OZV-2184 verifySoTay] sổ tay 8466 và 8483 đạt 100% (0 mục không kiểm được nguồn)',
    v8466.loai.length === 0 && v8483.loai.length === 0,
    JSON.stringify({ loai8466: v8466.loai, loai8483: v8483.loai }),
  );

  const lt8466BanTruot = (st8466?.loaiTru || []).find((x) => x.sangNhom === '8483' && x.canCuLoaiTru?.nguon === 'nhom8483.nhom' && /bàn trượt/i.test(x.dieuKien || ''));
  const lt8466ConLan = (st8466?.loaiTru || []).find((x) => x.sangNhom === '8483' && x.canCuLoaiTru?.nguon === 'nhom8483.nhom' && /con lăn/i.test(x.dieuKien || ''));
  const lt8483BanTruot = (st8483?.loaiTru || []).find((x) => x.sangNhom === '8466' && x.canCuLoaiTru?.nguon === 'nhom8466.nhom' && /bàn trượt/i.test(x.dieuKien || ''));
  const lt8483ConLan = (st8483?.loaiTru || []).find((x) => x.sangNhom === '8466' && x.canCuLoaiTru?.nguon === 'nhom8466.nhom' && /con lăn/i.test(x.dieuKien || ''));
  check(
    '[OZV-2184 căn cứ] sổ tay 8466 và 8483 có mục loaiTru 2 chiều 8466 <-> 8483 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(lt8466BanTruot && lt8466BanTruot.nguon === 'nhom8466.nhom' && S.checkItem('loaiTru', lt8466BanTruot, S.sourcesFor('8466'), '8466') === null)
      && Boolean(lt8466ConLan && lt8466ConLan.nguon === 'nhom8466.nhom' && S.checkItem('loaiTru', lt8466ConLan, S.sourcesFor('8466'), '8466') === null)
      && Boolean(lt8483BanTruot && lt8483BanTruot.nguon === 'nhom8483.nhom' && S.checkItem('loaiTru', lt8483BanTruot, S.sourcesFor('8483'), '8483') === null)
      && Boolean(lt8483ConLan && lt8483ConLan.nguon === 'nhom8483.nhom' && S.checkItem('loaiTru', lt8483ConLan, S.sourcesFor('8483'), '8483') === null)
      && lt8466BanTruot.dieuKien !== lt8483BanTruot.dieuKien
      && lt8466ConLan.dieuKien !== lt8483ConLan.dieuKien
      && ![lt8466BanTruot, lt8466ConLan, lt8483BanTruot, lt8483ConLan].some((x) => /;/.test(x.dieuKien)),
    JSON.stringify({
      lt8466BanTruot: Boolean(lt8466BanTruot),
      lt8466ConLan: Boolean(lt8466ConLan),
      lt8483BanTruot: Boolean(lt8483BanTruot),
      lt8483ConLan: Boolean(lt8483ConLan),
    }),
  );

  const c5Tu8466 = D.canhTu('8466', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8483');
  const c5Tu8483 = D.canhTu('8483', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8466');
  const c6Tu8466 = D.canhTu('8466', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8483');
  const c6Tu8483 = D.canhTu('8483', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '8466');
  const mrBtTu8466 = D.moRongUngVien(['8466'], q132BanTruot);
  const mrBtTu8483 = D.moRongUngVien(['8483'], q132BanTruot);
  const mrClTu8466 = D.moRongUngVien(['8466'], q132ConLan);
  const mrClTu8483 = D.moRongUngVien(['8483'], q132ConLan);
  const rel8466 = nhomLienQuanSoTay('8466');
  const rel8483 = nhomLienQuanSoTay('8483');
  check(
    '[OZV-2184 đồ thị 2 chiều] bảng cạnh có C5/C6 8466<->8483, nhomLienQuanSoTay 2 chiều và moRongUngVien kéo 2 chiều cho ca 132',
    c5Tu8466.some((e) => e.nguon === 'nhom8466.nhom' && e.canCuLoaiTru?.nguon === 'nhom8483.nhom')
      && c5Tu8483.some((e) => e.nguon === 'nhom8483.nhom' && e.canCuLoaiTru?.nguon === 'nhom8466.nhom')
      && c6Tu8466.length >= 1
      && c6Tu8483.length >= 1
      && rel8466.includes('8483')
      && rel8483.includes('8466')
      && mrBtTu8466.some((x) => x.nhom === '8483')
      && mrBtTu8483.some((x) => x.nhom === '8466')
      && mrClTu8466.some((x) => x.nhom === '8483')
      && mrClTu8483.some((x) => x.nhom === '8466'),
    JSON.stringify({ c5Tu8466: c5Tu8466.length, c5Tu8483: c5Tu8483.length, mrBtTu8466, mrBtTu8483, mrClTu8466, mrClTu8483 }),
  );

  const ht132Bt = phanTichHoiTruoc4So({ moTa: q132BanTruot, ungVien: ['8466', '8483'] });
  const distinctDk132Bt = new Set((ht132Bt.nhanh || []).map((n) => n.dieuKien)).size === 2;
  const ht132BtFull = phanTichHoiTruoc4So({ moTa: q132BanTruot, ungVien: ['8483', '8466', '8479'] });
  const distinctDk132BtFull = new Set((ht132BtFull.nhanh || []).map((n) => n.dieuKien)).size === 3;
  const ht132Cl = phanTichHoiTruoc4So({ moTa: q132ConLan, ungVien: ['8466', '8483'] });
  const distinctDk132Cl = new Set((ht132Cl.nhanh || []).map((n) => n.dieuKien)).size === 2;
  const ht132ClFull = phanTichHoiTruoc4So({ moTa: q132ConLan, ungVien: ['8483', '8466', '8479'] });
  const distinctDk132ClFull = new Set((ht132ClFull.nhanh || []).map((n) => n.dieuKien)).size === 3;
  check(
    '[OZV-2184 hoi-truoc-4so] ca 132 Bộ bàn trượt bằng tay và Con lăn đỡ trục cán tách nhánh điều kiện riêng biệt cho [8466, 8483] và [8483, 8466, 8479]',
    ht132Bt.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && distinctDk132Bt
      && Boolean(ht132Bt.dapAnDieuKien && ht132Bt.dapAnDieuKien.includes('→ nhóm 8466 (') && ht132Bt.dapAnDieuKien.includes('→ nhóm 8483 ('))
      && Boolean(ht132Bt.cauHoi)
      && ht132BtFull.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && distinctDk132BtFull
      && ['8483', '8466', '8479'].every((h) => (ht132BtFull.dapAnDieuKien || '').includes(`→ nhóm ${h} (`))
      && ht132Cl.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && distinctDk132Cl
      && Boolean(ht132Cl.dapAnDieuKien && ht132Cl.dapAnDieuKien.includes('→ nhóm 8466 (') && ht132Cl.dapAnDieuKien.includes('→ nhóm 8483 ('))
      && Boolean(ht132Cl.cauHoi)
      && ht132ClFull.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && distinctDk132ClFull
      && ['8483', '8466', '8479'].every((h) => (ht132ClFull.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    JSON.stringify({
      distinctDk132Bt,
      distinctDk132BtFull,
      distinctDk132Cl,
      distinctDk132ClFull,
      dapAnBt: ht132BtFull.dapAnDieuKien,
      dapAnCl: ht132ClFull.dapAnDieuKien,
    }),
  );

  const pbBt8466 = cauPhanBietNhom('8466', ['8466', '8483'], q132BanTruot);
  const pbBt8483 = cauPhanBietNhom('8483', ['8483', '8466'], q132BanTruot);
  const pbCl8466 = cauPhanBietNhom('8466', ['8466', '8483'], q132ConLan);
  const pbCl8483 = cauPhanBietNhom('8483', ['8483', '8466'], q132ConLan);
  check(
    '[OZV-2184 thuận cauPhanBietNhom] sinh câu hỏi phân biệt 2 chiều 84.66 <-> 84.83 cho ca 132 Bộ bàn trượt bằng tay và Con lăn đỡ trục cán',
    pbBt8466.length === 1
      && pbBt8466[0].loai === 'PHAN_BIET_NHOM'
      && pbBt8466[0].canCu === 'so-tay'
      && pbBt8466[0].nguon === 'nhom8466.nhom'
      && /84\.83/.test(pbBt8466[0].questionVi)
      && /84\.66/.test(pbBt8466[0].questionVi)
      && pbBt8483.length === 1
      && pbBt8483[0].loai === 'PHAN_BIET_NHOM'
      && pbBt8483[0].canCu === 'so-tay'
      && pbBt8483[0].nguon === 'nhom8483.nhom'
      && /84\.66/.test(pbBt8483[0].questionVi)
      && /84\.83/.test(pbBt8483[0].questionVi)
      && pbCl8466.length === 1
      && pbCl8466[0].loai === 'PHAN_BIET_NHOM'
      && pbCl8466[0].canCu === 'so-tay'
      && pbCl8466[0].nguon === 'nhom8466.nhom'
      && /84\.83/.test(pbCl8466[0].questionVi)
      && /84\.66/.test(pbCl8466[0].questionVi)
      && pbCl8483.length === 1
      && pbCl8483[0].loai === 'PHAN_BIET_NHOM'
      && pbCl8483[0].canCu === 'so-tay'
      && pbCl8483[0].nguon === 'nhom8483.nhom'
      && /84\.66/.test(pbCl8483[0].questionVi)
      && /84\.83/.test(pbCl8483[0].questionVi),
    JSON.stringify({ pbBt8466, pbBt8483, pbCl8466, pbCl8483 }),
  );

  const gBt8466To8483 = soTayGates({
    hs: '84663000',
    productText: q132BanTruot,
    productName: 'Bộ bàn trượt bằng tay',
    candidateHeadings: ['8466', '8483'],
  });
  const gBt8483To8466 = soTayGates({
    hs: '84834090',
    productText: q132BanTruot,
    productName: 'Bộ bàn trượt bằng tay',
    candidateHeadings: ['8483', '8466'],
  });
  const gCl8466To8483 = soTayGates({
    hs: '84662090',
    productText: q132ConLan,
    productName: 'Con lăn đỡ trục cán bằng thép hợp kim',
    candidateHeadings: ['8466', '8483'],
  });
  const gCl8483To8466 = soTayGates({
    hs: '84833090',
    productText: q132ConLan,
    productName: 'Con lăn đỡ trục cán bằng thép hợp kim',
    candidateHeadings: ['8483', '8466'],
  });
  check(
    '[OZV-2184 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 8466 -> 8483 và 8483 -> 8466 cho cả 2 mô tả ca 132',
    (gBt8466To8483.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8483'))
      && (gBt8483To8466.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8466'))
      && (gCl8466To8483.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8483'))
      && (gCl8483To8466.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8466')),
    JSON.stringify({
      gBt8466To8483: gBt8466To8483.challenges,
      gBt8483To8466: gBt8483To8466.challenges,
      gCl8466To8483: gCl8466To8483.challenges,
      gCl8483To8466: gCl8483To8466.challenges,
    }),
  );

  const dcMamCap = 'Mâm cặp 3 chấu tự định tâm dùng cho máy tiện kim loại';
  const dcBanhDa = 'Bánh đà bằng gang dùng cho động cơ máy thủy';
  const dcMc8466 = cauPhanBietNhom('8466', ['8466', '8483'], dcMamCap);
  const dcMc8483 = cauPhanBietNhom('8483', ['8483', '8466'], dcMamCap);
  const dcBd8466 = cauPhanBietNhom('8466', ['8466', '8483'], dcBanhDa);
  const dcBd8483 = cauPhanBietNhom('8483', ['8483', '8466'], dcBanhDa);
  const gDoi8466 = soTayGates({
    hs: '84662090',
    productText: dcMamCap,
    productName: dcMamCap,
  });
  const gDoi8483 = soTayGates({
    hs: '84835000',
    productText: dcBanhDa,
    productName: dcBanhDa,
  });
  check(
    '[OZV-2184 đối chứng] mâm cặp máy tiện và bánh đà động cơ máy thủy không hỏi oan / không kéo oan 84.66 <-> 84.83',
    dcMc8466.length === 0
      && dcMc8483.length === 0
      && dcBd8466.length === 0
      && dcBd8483.length === 0
      && !D.moRongUngVien(['8466'], dcMamCap).some((x) => x.nhom === '8483')
      && !D.moRongUngVien(['8483'], dcBanhDa).some((x) => x.nhom === '8466')
      && !(gDoi8466.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8483'))
      && !(gDoi8483.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('8466')),
    JSON.stringify({ dcMc8466, dcMc8483, dcBd8466, dcBd8483, gDoi8466: gDoi8466.challenges, gDoi8483: gDoi8483.challenges }),
  );
}

// OZV-2190 — Cạnh loại trừ 2 chiều 54.04 <-> 39.16 cho ca 196 tầng 4 số
// ('Sợi filament tổng hợp / Polyamide (Nylon) / Dùng để gia công lõi dây câu')
{
  const S = require('../lib/so-tay.js');
  const { loadSoTay, soTayGates, nhomLienQuanSoTay } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
  const D = require('../lib/do-thi/index.js');
  D.datLai();

  const q196 = 'Sợi filament tổng hợp / Polyamide (Nylon) / Dùng để gia công lõi dây câu';
  const st5404 = loadSoTay('5404');
  const st3916 = loadSoTay('3916');
  const v5404 = S.verifySoTay(st5404, '5404');
  const v3916 = S.verifySoTay(st3916, '3916');
  check(
    '[OZV-2190 verifySoTay] sổ tay 5404 và 3916 đạt 100% (0 mục không kiểm được nguồn)',
    v5404.loai.length === 0 && v3916.loai.length === 0
      && v5404.dat === v5404.tong && st5404.kiemTra?.tong === v5404.tong && st5404.kiemTra?.dat === v5404.dat
      && v3916.dat === v3916.tong && st3916.kiemTra?.tong === v3916.tong && st3916.kiemTra?.dat === v3916.dat,
    JSON.stringify({ loai5404: v5404.loai, loai3916: v3916.loai, tong5404: v5404.tong, tong3916: v3916.tong }),
  );

  const lt5404 = (st5404?.loaiTru || []).find((x) => x.sangNhom === '3916' && x.canCuLoaiTru?.nguon === 'nhom3916.nhom' && /mặt cắt ngang|1\s*mm|filament|Polyamide|lõi dây câu/i.test(x.dieuKien || ''));
  const lt3916 = (st3916?.loaiTru || []).find((x) => x.sangNhom === '5404' && x.canCuLoaiTru?.nguon === 'nhom5404.nhom' && /mặt cắt ngang|1\s*mm|filament|Polyamide|lõi dây câu|Phần XI/i.test(x.dieuKien || ''));
  check(
    '[OZV-2190 căn cứ] sổ tay 5404 và 3916 có mục loaiTru 2 chiều 5404 <-> 3916 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(lt5404 && lt5404.nguon === 'nhom5404.nhom' && S.checkItem('loaiTru', lt5404, S.sourcesFor('5404'), '5404') === null)
      && Boolean(lt3916 && lt3916.nguon === 'ch39.chuong' && S.checkItem('loaiTru', lt3916, S.sourcesFor('3916'), '3916') === null)
      && lt5404.dieuKien !== lt3916.dieuKien
      && !/;/.test(lt5404.dieuKien)
      && !/;/.test(lt3916.dieuKien),
    JSON.stringify({ lt5404, lt3916 }),
  );

  const c5Tu5404 = D.canhTu('5404', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '3916');
  const c5Tu3916 = D.canhTu('3916', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '5404');
  const c6Tu5404 = D.canhTu('5404', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '3916');
  const c6Tu3916 = D.canhTu('3916', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '5404');
  const mrTu5404 = D.moRongUngVien(['5404'], q196);
  const mrTu3916 = D.moRongUngVien(['3916'], q196);
  const rel5404 = nhomLienQuanSoTay('5404');
  const rel3916 = nhomLienQuanSoTay('3916');
  check(
    '[OZV-2190 đồ thị 2 chiều] bảng cạnh có C5/C6 5404<->3916, nhomLienQuanSoTay 2 chiều và moRongUngVien kéo 2 chiều cho ca 196',
    c5Tu5404.some((e) => e.nguon === 'nhom5404.nhom' && e.canCuLoaiTru?.nguon === 'nhom3916.nhom')
      && c5Tu3916.some((e) => e.nguon === 'ch39.chuong' && e.canCuLoaiTru?.nguon === 'nhom5404.nhom')
      && c6Tu5404.length >= 1
      && c6Tu3916.length >= 1
      && rel5404.includes('3916')
      && rel3916.includes('5404')
      && mrTu5404.some((x) => x.nhom === '3916')
      && mrTu3916.some((x) => x.nhom === '5404'),
    JSON.stringify({ c5Tu5404: c5Tu5404.length, c5Tu3916: c5Tu3916.length, mrTu5404, mrTu3916 }),
  );

  const ht196 = phanTichHoiTruoc4So({ moTa: q196, ungVien: ['5404', '3916'] });
  const distinctDk196 = new Set((ht196.nhanh || []).map((n) => n.dieuKien)).size === 2;
  check(
    '[OZV-2190 hoi-truoc-4so] ca 196 Sợi filament tổng hợp tách 2 nhánh điều kiện riêng biệt cho [5404, 3916]',
    ht196.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && distinctDk196
      && Boolean(ht196.dapAnDieuKien && ht196.dapAnDieuKien.includes('→ nhóm 5404 (') && ht196.dapAnDieuKien.includes('→ nhóm 3916 ('))
      && Boolean(ht196.cauHoi),
    JSON.stringify({ trangThai: ht196.trangThai, distinctDk196, dapAnDieuKien: ht196.dapAnDieuKien }),
  );

  const pb5404 = cauPhanBietNhom('5404', ['5404', '3916'], q196);
  const pb3916 = cauPhanBietNhom('3916', ['3916', '5404'], q196);
  check(
    '[OZV-2190 thuận cauPhanBietNhom] sinh câu hỏi phân biệt 2 chiều 54.04 <-> 39.16 cho ca 196 Sợi filament tổng hợp',
    pb5404.length === 1
      && pb5404[0].loai === 'PHAN_BIET_NHOM'
      && pb5404[0].canCu === 'so-tay'
      && pb5404[0].nguon === 'nhom5404.nhom'
      && /39\.16/.test(pb5404[0].questionVi)
      && /54\.04/.test(pb5404[0].questionVi)
      && pb3916.length === 1
      && pb3916[0].loai === 'PHAN_BIET_NHOM'
      && pb3916[0].canCu === 'so-tay'
      && pb3916[0].nguon === 'ch39.chuong'
      && /54\.04/.test(pb3916[0].questionVi)
      && /39\.16/.test(pb3916[0].questionVi),
    JSON.stringify({ pb5404, pb3916 }),
  );

  const g5404To3916 = soTayGates({
    hs: '54041900',
    productText: q196,
    productName: q196,
    pool: [{ h4: '3916', from: 'test' }],
  });
  const g3916To5404 = soTayGates({
    hs: '39169091',
    productText: q196,
    productName: q196,
    pool: [{ h4: '5404', from: 'test' }],
  });
  check(
    '[OZV-2190 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 5404 -> 3916 và 3916 -> 5404',
    (g5404To3916.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('3916'))
      && (g3916To5404.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('5404')),
    JSON.stringify({ g5404To3916: g5404To3916.challenges, g3916To5404: g3916To5404.challenges }),
  );

  const dcThanhPvc = 'Thanh nhựa PVC đặc tiết diện vuông cạnh 8 mm dùng làm khung cửa sổ';
  const dcVaiDet = 'Vải dệt polyester khổ 1,5 m dùng may túi';
  const dcThanh5404 = cauPhanBietNhom('5404', ['5404', '3916'], dcThanhPvc);
  const dcThanh3916 = cauPhanBietNhom('3916', ['3916', '5404'], dcThanhPvc);
  const dcVai5404 = cauPhanBietNhom('5404', ['5404', '3916'], dcVaiDet);
  const dcVai3916 = cauPhanBietNhom('3916', ['3916', '5404'], dcVaiDet);
  const gDoi5404 = soTayGates({
    hs: '54049000',
    productText: dcVaiDet,
    productName: dcVaiDet,
  });
  const gDoi3916 = soTayGates({
    hs: '39161010',
    productText: dcThanhPvc,
    productName: dcThanhPvc,
  });
  check(
    '[OZV-2190 đối chứng] thanh nhựa PVC khung cửa sổ và vải dệt polyester không hỏi oan / không kéo oan 54.04 <-> 39.16',
    dcThanh5404.length === 0
      && dcThanh3916.length === 0
      && dcVai5404.length === 0
      && dcVai3916.length === 0
      && !D.moRongUngVien(['5404'], dcVaiDet).some((x) => x.nhom === '3916')
      && !D.moRongUngVien(['3916'], dcThanhPvc).some((x) => x.nhom === '5404')
      && !(gDoi5404.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('3916'))
      && !(gDoi3916.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('5404')),
    JSON.stringify({ dcThanh5404, dcThanh3916, dcVai5404, dcVai3916, gDoi5404: gDoi5404.challenges, gDoi3916: gDoi3916.challenges }),
  );
}

// OZV-2200 — Cạnh loại trừ 2 chiều 60.06 <-> 60.02 cho ca 124 tầng 4 số
// ('Vải gió dệt kim / 100% polyester, khổ 1.5m / Dùng may áo khoác')
{
  const S = require('../lib/so-tay.js');
  const { loadSoTay, soTayGates, nhomLienQuanSoTay } = require('../lib/so-tay-gates.js');
  const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
  const D = require('../lib/do-thi/index.js');
  D.datLai();

  const q124Gio = 'Vải gió dệt kim / 100% polyester, khổ 1.5m / Dùng may áo khoác';
  const q124Long = 'Vải giả lông thú dệt kim / 100% polyester / May áo khoác mùa đông';
  const st6006 = loadSoTay('6006');
  const st6002 = loadSoTay('6002');
  const v6006 = S.verifySoTay(st6006, '6006');
  const v6002 = S.verifySoTay(st6002, '6002');
  check(
    '[OZV-2200 verifySoTay] sổ tay 6006 và 6002 đạt 100% (0 mục không kiểm được nguồn)',
    v6006.loai.length === 0 && v6002.loai.length === 0
      && v6006.dat === v6006.tong && st6006.kiemTra?.tong === v6006.tong && st6006.kiemTra?.dat === v6006.dat
      && v6002.dat === v6002.tong && st6002.kiemTra?.tong === v6002.tong && st6002.kiemTra?.dat === v6002.dat,
    JSON.stringify({ loai6006: v6006.loai, loai6002: v6002.loai, tong6006: v6006.tong, tong6002: v6002.tong }),
  );

  const lt6006 = (st6006?.loaiTru || []).find((x) => x.sangNhom === '6002' && x.canCuLoaiTru?.nguon === 'nhom6002.nhom' && /vải gió dệt kim|không quá 30\s*cm/i.test(x.dieuKien || ''));
  const lt6002 = (st6002?.loaiTru || []).find((x) => x.sangNhom === '6006' && x.canCuLoaiTru?.nguon === 'nhom6006.nhom' && /vải gió dệt kim|hơn 30\s*cm/i.test(x.dieuKien || ''));
  check(
    '[OZV-2200 căn cứ] sổ tay 6006 và 6002 có mục loaiTru 2 chiều 6006 <-> 6002 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(lt6006 && lt6006.nguon === 'nhom6006.nhom' && S.checkItem('loaiTru', lt6006, S.sourcesFor('6006'), '6006') === null)
      && Boolean(lt6002 && lt6002.nguon === 'nhom6002.nhom' && S.checkItem('loaiTru', lt6002, S.sourcesFor('6002'), '6002') === null)
      && lt6006.dieuKien !== lt6002.dieuKien
      && !/;/.test(lt6006.dieuKien)
      && !/;/.test(lt6002.dieuKien),
    JSON.stringify({ lt6006, lt6002 }),
  );

  const c5Tu6006 = D.canhTu('6006', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '6002');
  const c5Tu6002 = D.canhTu('6002', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '6006');
  const c6Tu6006 = D.canhTu('6006', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '6002');
  const c6Tu6002 = D.canhTu('6002', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '6006');
  const mrTu6006 = D.moRongUngVien(['6006'], q124Gio);
  const mrTu6002 = D.moRongUngVien(['6002'], q124Gio);
  const rel6006 = nhomLienQuanSoTay('6006');
  const rel6002 = nhomLienQuanSoTay('6002');
  check(
    '[OZV-2200 đồ thị 2 chiều] bảng cạnh có C5/C6 6006<->6002, nhomLienQuanSoTay 2 chiều và moRongUngVien kéo 2 chiều cho ca 124',
    c5Tu6006.some((e) => e.nguon === 'nhom6006.nhom' && e.canCuLoaiTru?.nguon === 'nhom6002.nhom')
      && c5Tu6002.some((e) => e.nguon === 'nhom6002.nhom' && e.canCuLoaiTru?.nguon === 'nhom6006.nhom')
      && c6Tu6006.length >= 1
      && c6Tu6002.length >= 1
      && rel6006.includes('6002')
      && rel6002.includes('6006')
      && mrTu6006.some((x) => x.nhom === '6002')
      && mrTu6002.some((x) => x.nhom === '6006'),
    JSON.stringify({ c5Tu6006: c5Tu6006.length, c5Tu6002: c5Tu6002.length, mrTu6006, mrTu6002 }),
  );

  const ht124 = phanTichHoiTruoc4So({ moTa: q124Gio, ungVien: ['6006', '6002'] });
  const distinctDk124 = new Set((ht124.nhanh || []).map((n) => n.dieuKien)).size === 2;
  const ht124Cum = phanTichHoiTruoc4So({ moTa: q124Gio, ungVien: ['5903', '6001', '6002', '6004', '6005', '6006'] });
  const distinctDk124Cum = new Set((ht124Cum.nhanh || []).map((n) => n.dieuKien)).size === 6;
  check(
    '[OZV-2200 hoi-truoc-4so] ca 124 Vải gió dệt kim tách nhánh điều kiện riêng biệt cho [6006, 6002] và cụm 6 nhóm [5903, 6001, 6002, 6004, 6005, 6006]',
    ht124.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && distinctDk124
      && Boolean(ht124.dapAnDieuKien && ht124.dapAnDieuKien.includes('→ nhóm 6006 (') && ht124.dapAnDieuKien.includes('→ nhóm 6002 ('))
      && Boolean(ht124.cauHoi)
      && ht124Cum.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
      && distinctDk124Cum
      && ['5903', '6001', '6002', '6004', '6005', '6006'].every((h) => (ht124Cum.dapAnDieuKien || '').includes(`→ nhóm ${h} (`)),
    JSON.stringify({ trangThai: ht124.trangThai, distinctDk124, distinctDk124Cum, dapAnDieuKien: ht124.dapAnDieuKien }),
  );

  const pb6006 = cauPhanBietNhom('6006', ['6006', '6002'], q124Gio);
  const pb6002 = cauPhanBietNhom('6002', ['6002', '6006'], q124Gio);
  check(
    '[OZV-2200 thuận cauPhanBietNhom] sinh câu hỏi phân biệt 2 chiều 60.06 <-> 60.02 cho ca 124 Vải gió dệt kim',
    pb6006.length === 1
      && pb6006[0].loai === 'PHAN_BIET_NHOM'
      && pb6006[0].canCu === 'so-tay'
      && pb6006[0].nguon === 'nhom6006.nhom'
      && /60\.02/.test(pb6006[0].questionVi)
      && /60\.06/.test(pb6006[0].questionVi)
      && pb6002.length === 1
      && pb6002[0].loai === 'PHAN_BIET_NHOM'
      && pb6002[0].canCu === 'so-tay'
      && pb6002[0].nguon === 'nhom6002.nhom'
      && /60\.06/.test(pb6002[0].questionVi)
      && /60\.02/.test(pb6002[0].questionVi),
    JSON.stringify({ pb6006, pb6002 }),
  );

  const g6006To6002 = soTayGates({
    hs: '60063290',
    productText: q124Gio,
    productName: q124Gio,
    pool: [{ h4: '6002', from: 'test' }],
  });
  const g6002To6006 = soTayGates({
    hs: '60024000',
    productText: q124Gio,
    productName: q124Gio,
    pool: [{ h4: '6006', from: 'test' }],
  });
  const g6006Long = soTayGates({
    hs: '60063290',
    productText: q124Long,
    productName: q124Long,
    pool: [{ h4: '6002', from: 'test' }],
  });
  const g6002Long = soTayGates({
    hs: '60024000',
    productText: q124Long,
    productName: q124Long,
    pool: [{ h4: '6006', from: 'test' }],
  });
  check(
    '[OZV-2200 thuận soTayGates] kích hoạt SO_TAY_LOAI_TRU đúng cả 2 chiều 6006 -> 6002 và 6002 -> 6006 trên ca 124',
    (g6006To6002.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('6002'))
      && (g6002To6006.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('6006'))
      && (g6006Long.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('6002'))
      && (g6002Long.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('6006')),
    JSON.stringify({ g6006To6002: g6006To6002.challenges, g6002To6006: g6002To6006.challenges }),
  );

  const dcBang = 'Băng đã tẩm thuốc hoặc đóng gói để bán lẻ';
  const dcTheu = 'Vải thêu thuộc nhóm 58.10';
  const dcSoiSui = 'Sợi sùi vòng thuộc nhóm 56.06';
  const dcBang6006 = cauPhanBietNhom('6006', ['6006', '6002'], dcBang);
  const dcBang6002 = cauPhanBietNhom('6002', ['6002', '6006'], dcBang);
  const dcTheu6006 = cauPhanBietNhom('6006', ['6006', '6002'], dcTheu);
  const dcTheu6002 = cauPhanBietNhom('6002', ['6002', '6006'], dcTheu);
  const dcSoi6006 = cauPhanBietNhom('6006', ['6006', '6002'], dcSoiSui);
  const dcSoi6002 = cauPhanBietNhom('6002', ['6002', '6006'], dcSoiSui);
  const gDoi6006 = soTayGates({
    hs: '60063290',
    productText: dcBang,
    productName: dcBang,
  });
  const gDoi6002 = soTayGates({
    hs: '60024000',
    productText: dcSoiSui,
    productName: dcSoiSui,
  });
  check(
    '[OZV-2200 đối chứng] băng tẩm thuốc, vải thêu và sợi sùi vòng không hỏi oan / không kéo oan 60.06 <-> 60.02',
    dcBang6006.length === 0
      && dcBang6002.length === 0
      && dcTheu6006.length === 0
      && dcTheu6002.length === 0
      && dcSoi6006.length === 0
      && dcSoi6002.length === 0
      && !D.moRongUngVien(['6006'], dcBang).some((x) => x.nhom === '6002')
      && !D.moRongUngVien(['6002'], dcSoiSui).some((x) => x.nhom === '6006')
      && !(gDoi6006.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('6002'))
      && !(gDoi6002.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && String(x.target || '').includes('6006')),
    JSON.stringify({ dcBang6006, dcBang6002, dcTheu6006, dcTheu6002, dcSoi6006, dcSoi6002, gDoi6006: gDoi6006.challenges, gDoi6002: gDoi6002.challenges }),
  );
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
