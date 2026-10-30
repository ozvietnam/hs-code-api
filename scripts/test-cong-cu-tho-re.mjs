// Cổng ranh giới 6→8 số — gia cố cho thợ rẻ (agent mô hình yếu soạn một PN6, Claude soát). Mỗi mục kèm test đỏ trước.
// Bản nháp viết tay trên phân nhóm thật (cây + biểu thuế + nguồn nguyên văn thật), không đọc data/bench/, data/oz-export/.
import './test-isolate-data.mjs';
import fs from 'fs';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const C = require('../lib/ho-so/cong-ranh-gioi.js');

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${typeof x === 'string' ? x : JSON.stringify(x)}`); } };
const clone = (x) => JSON.parse(JSON.stringify(x));
const coLoi = (r, tien) => r.loi.some((l) => l.startsWith(tien));
const coCanh = (r, tien) => r.canhBao.some((l) => l.startsWith(tien));
const PHIEN = 'https://claude.ai/code/session_TEST#soan-test';

/** Khung nháp thật + điều kiện theo mã: {ma: dieuKienSo | {dieuKienSo, trich, ...}}. Trích mặc định = chữ nguyên văn của chính mục. */
function nhap(pn6, dk = {}, extra = {}) {
  const b = C.taoKhung(pn6, { phien: PHIEN, ngay: '2026-10-30' });
  for (const m of [...b.dong8, ...b.dieuKienNut]) {
    const v = dk[m.hs || m.id]; if (!v) continue;
    if (Array.isArray(v)) m.dieuKienSo = v; else Object.assign(m, v);
  }
  for (const [ma, v] of Object.entries(dk)) {
    if (b.dong8.some((m) => m.hs === ma) || b.dieuKienNut.some((m) => m.id === ma)) continue;
    b.dieuKienNut.push({ id: ma, nguon: `tieuDe.${ma}`, trich: null, nguonLoai: 'AI_DA_KIEM', ...(Array.isArray(v) ? { dieuKienSo: v } : v) });
  }
  return { ...b, ...extra };
}
const TEN = (v) => ({ fact: 'tenLoai', op: 'TEN_LOAI', value: v });
const DUNG = (v) => ({ fact: 'dungCho', op: 'CONG_DUNG', value: v });
const SO = (fact, op, value, donVi) => ({ fact, op, value, donVi });

// ── 1. Tầng không mã (tiêu đề không mã của biểu thuế mà cây theo chữ số làm mất) ─────────────────────────────────
// 848310: "- - - Loại khác:" (không mã) nằm giữa .24 và .25–.27 → trục cam xe máy ≤ 2.000 cc thoả cả .24 lẫn .25.
const nhap848310 = () => nhap('848310', {
  84831010: [DUNG('nhóm 84.29 hoặc 84.30')],
  8483102: [TEN(['Trục cam', 'trục khuỷu']), DUNG('động cơ xe của Chương 87')],
  84831024: [DUNG('xe thuộc nhóm 87.11')],
  84831025: [SO('dungTichXiLanh', '<=', 2000, 'cc')],
  84831026: [SO('dungTichXiLanh', '>', 2000, 'cc'), SO('dungTichXiLanh', '<=', 3000, 'cc')],
  84831027: [SO('dungTichXiLanh', '>', 3000, 'cc')],
  8483103: [DUNG('động cơ máy thủy')],
  84831031: [SO('congSuat', '<=', 22.38, 'kW')],
});
{
  const g = C.goiSoan('848310');
  const t = (g.tangKhongMa || []).find((x) => x.r === 14616);
  check('1a --goi 848310 liệt kê tầng không mã r14616 "Loại khác:" phủ .25/.26/.27', t && /Loại khác/.test(t.chu) && ['84831025', '84831026', '84831027'].every((h) => t.dongDuoi.includes(h)) && !t.dongDuoi.includes('84831024'), g.tangKhongMa);
  const r = C.kiemRanhGioi('848310', nhap848310());
  check('1b bản nháp 848310 "kiểu hôm nay" KHÔNG được xanh', r.hopLe === false, r.loi);
  check('1c … lỗi cong1-tang-khong-ma ở từng dòng dưới tầng không mã', ['84831025', '84831026', '84831027'].every((h) => r.loi.includes(`cong1-tang-khong-ma:${h}:r14616`)), r.loi);
  check('1d … không báo dòng ngoài tầng (.24, .31)', !r.loi.some((l) => /^cong1-tang-khong-ma:(84831024|84831031):/.test(l)), r.loi);

  for (const [pn6, hs, row] of [['841459', '84145910', 13180], ['841459', '84145950', 13187], ['850110', null, 14839], ['848180', null, 14551], ['854442', '85444232', 16065], ['950300', '95030022', 18723], ['950300', '95030091', 18732]]) {
    const gg = C.goiSoan(pn6);
    check(`1e --goi ${pn6} có tầng không mã r${row}`, (gg.tangKhongMa || []).some((x) => x.r === row), (gg.tangKhongMa || []).map((x) => x.r));
    const rr = C.kiemRanhGioi(pn6, C.taoKhung(pn6, { phien: PHIEN }));
    check(`1f cổng 1 ${pn6} báo cong1-tang-khong-ma …:r${row}`, rr.loi.some((l) => l.startsWith('cong1-tang-khong-ma:') && l.endsWith(`:r${row}`) && (!hs || l.includes(`:${hs}:`))), rr.loi.filter((l) => l.startsWith('cong1-tang')));
  }
  const g0 = C.goiSoan('841350');
  check('1g phân nhóm không có tầng không mã → tangKhongMa rỗng', Array.isArray(g0.tangKhongMa) && g0.tangKhongMa.length === 0, g0.tangKhongMa);
  const out = execFileSync(process.execPath, ['scripts/so-hoa-ranh-gioi.mjs', '--goi', '--pn6=848310'], { encoding: 'utf8', env: process.env });
  check('1h --goi dạng chữ in DỪNG + tầng không mã', /DỪNG/.test(out) && /tầng không mã/i.test(out) && /r14616/.test(out), out.slice(0, 400));
}

// ── 2. Cổng 1 phủ kín: chỉ thử vector THOẢ điều kiện của tầng cha ────────────────────────────────────────────────
// 851810: tiêu đề 8518101 "Micro" (tenLoai Micro) có hai con .11 và .19 "Micro khác…" — vector tenLoai=<chữ lạ> trái điều
// kiện của chính tiêu đề nên không phải lỗ hổng của tầng.
{
  const b = nhap('851810', { 8518101: [TEN('Micro')], 85181011: [TEN('Micro'), SO('duongKinh', '<=', 10, 'mm')], 85181019: [TEN('Micro')] });
  const r = C.kiemRanhGioi('851810', b);
  check('2a 851810: không còn cong1-khong-phu-kin giả ở tầng 8518101 (vector trái điều kiện tiêu đề bị bỏ)', !coLoi(r, 'cong1-khong-phu-kin:8518101'), r.loi);
  const b2 = nhap('851810', { 8518101: [TEN('Micro')], 85181011: [TEN('Micro'), SO('duongKinh', '<=', 10, 'mm')], 85181019: [TEN('Micro'), SO('duongKinh', '<=', 10, 'mm')] });
  b2.dong8.find((m) => m.hs === '85181019').trich = b2.dong8.find((m) => m.hs === '85181011').trich;
  b2.dong8.find((m) => m.hs === '85181019').nguon = 'tax.85181011';
  const r2 = C.kiemRanhGioi('851810', b2);
  check('2b lỗ hổng THẬT trong vùng của tiêu đề (Micro, đường kính > 10 mm) vẫn bị báo', coLoi(r2, 'cong1-khong-phu-kin:8518101:') && r2.loi.some((l) => l.startsWith('cong1-khong-phu-kin:8518101:') && l.includes('tenLoai=Micro')), r2.loi);
}

// ── 3. Phần còn lại có tên (phanConLai), tên cụ thể hơn thắng, dungCho theo cấp mã HS ─────────────────────────────
const DK = require('../lib/dieu-kien-so.js');
const nhap850131 = (pcl) => nhap('850131', {
  85013130: [TEN('Động cơ'), DUNG('hàng hóa thuộc nhóm 84.15, 84.18, 84.50, 85.09 hoặc 85.16')],
  85013160: [TEN('Động cơ'), DUNG('xe của Chương 87')],
  85013170: { dieuKienSo: [TEN('Động cơ')], ...(pcl === undefined ? {} : { phanConLai: pcl }) },
  85013180: [TEN('Máy phát điện')],
});
{
  const r0 = C.kiemRanhGioi('850131', nhap850131());
  check('3a "Động cơ khác" chưa đánh dấu → chồng lấn + cảnh báo nghi-phan-con-lai:85013170', coLoi(r0, 'cong2-chong-lan:85013130+85013170') && coCanh(r0, 'nghi-phan-con-lai:85013170'), { loi: r0.loi, canhBao: r0.canhBao });
  const g = C.goiSoan('850131');
  check('3b --goi đánh dấu 85013170 nghiPhanConLai', g.canSoHoa.find((x) => x.ma === '85013170')?.nghiPhanConLai === true && !g.canSoHoa.find((x) => x.ma === '85013180')?.nghiPhanConLai);
  const r = C.kiemRanhGioi('850131', nhap850131(true));
  check('3c phanConLai:true (phủ định anh em ĐỨNG TRƯỚC) → 850131 xanh', r.hopLe === true, r.loi);
  check('3d … không còn cảnh báo nghi-phan-con-lai', !coCanh(r, 'nghi-phan-con-lai:85013170'), r.canhBao);
  const soTay = C.soTayTuNhap('850131', nhap850131(true));
  const dd = DK.duongDiDong8('85013170', { soTay });
  const pk = dd.nhom.filter((x) => x.chieu === 'PHAI_KHONG').map((x) => x.nut);
  check('3e luật đi: .70 phanConLai phủ định .30 + .60, KHÔNG phủ định .80 (đứng sau)', pk.join(',') === '85013130,85013160', dd.nhom);
  const r2 = C.kiemRanhGioi('850131', nhap850131(['85013130']));
  check('3f phanConLai dạng mảng chỉ phủ định đúng anh em liệt kê → còn chồng .60/.70', coLoi(r2, 'cong2-chong-lan:85013160+85013170') && !coLoi(r2, 'cong2-chong-lan:85013130+85013170'), r2.loi);
  const r3 = C.kiemRanhGioi('850131', nhap850131(['84159000']));
  check('3g phanConLai liệt kê mã không phải anh em → cong0-phan-con-lai-sai-anh-em', coLoi(r3, 'cong0-phan-con-lai-sai-anh-em:85013170'), r3.loi);
  const b4 = nhap850131(); b4.dong8.find((m) => m.hs === '85013160').phanConLai = true;
  check('3h phanConLai trên dòng không có chữ "khác" → cong3-phan-con-lai-khong-co-chu-khac', coLoi(C.kiemRanhGioi('850131', b4), 'cong3-phan-con-lai-khong-co-chu-khac:85013160'));
  const b5 = nhap('841350', { 8413503: [TEN('Bơm nước'), SO('luuLuong', '<=', 8000, 'm³/h')], 84135031: [{ fact: 'hoatDongBangDien', op: 'CO' }], 84135032: [{ fact: 'hoatDongBangDien', op: 'KHONG' }], 84135040: [TEN('Bơm nước'), SO('luuLuong', '>', 8000, 'm³/h'), SO('luuLuong', '<=', 13000, 'm³/h')] });
  b5.dong8.find((m) => m.hs === '84135090').phanConLai = true;
  check('3i phanConLai trên dòng "Loại khác" (vốn đã phủ định anh em) → cong0-phan-con-lai-thua', coLoi(C.kiemRanhGioi('841350', b5), 'cong0-phan-con-lai-thua:84135090'));
  check('3j băm: bản không có phanConLai giữ băm cũ; thêm phanConLai ⇒ băm đổi', C.bamRanhGioi(nhap850131()) === C.bamRanhGioi(JSON.parse(JSON.stringify(nhap850131()))) && C.bamRanhGioi(nhap850131(true)) !== C.bamRanhGioi(nhap850131()));
  const S8501 = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/so-tay/8501.json'), 'utf8'));
  let moi = null; let nem = null;
  try { moi = C.apDung(C.duyet(nhap850131(true), { phien: 'https://claude.ai/code/session_TEST#soat-test', ngay: '2026-10-31' }), S8501); } catch (e) { nem = e.message; }
  check('3k áp vào sổ tay mang phanConLai sang dòng .70', moi?.dong8.find((d) => d.hs === '85013170')?.phanConLai === true, nem);
}
{
  // Tên cụ thể hơn thắng: "bàn đạp" (.11) chứa trọn âm tiết "Bàn" (.12) — hàng tên "bàn đạp" là .11, không chồng .12.
  const THAN = TEN(['Thân trên và thân dưới máy', 'đế đỡ', 'bánh đà', 'bộ phận che chắn dây đai', 'bàn đạp']);
  const BAN = TEN(['Bàn', 'tủ', 'chân máy', 'nắp']);
  const r = C.kiemRanhGioi('845290', nhap('845290', { 8452901: [DUNG('8452.10.00')], 84529011: [THAN], 84529012: [BAN], 84529091: [THAN], 84529092: [BAN] }));
  check('3l 845290: tenLoai="bàn đạp" không còn làm .11/.12 chồng lấn (tên cụ thể hơn thắng)', !r.loi.some((l) => /^cong2-chong-lan:(84529011\+84529012|84529091\+84529092):/.test(l)), r.loi);
  const F = DK.chuanDuKien([{ fact: 'tenLoai', giaTri: 'xe của búp bê', nguon: 'KHACH', trangThai: 'DA_CO' }]);
  check('3m tenCuTheHon: "xe của búp bê" — giá trị "xe của búp bê" cụ thể hơn "Búp bê"', DK.tenCuTheHon([TEN('xe của búp bê')], [TEN('Búp bê')], F) === 1 && DK.tenCuTheHon([TEN('Búp bê')], [TEN('xe của búp bê')], F) === -1);
  // dungCho theo cấp mã HS: "87.11" ⊂ "Chương 87"
  const dg = (cond, gt) => DK.danhGiaDieuKien(DUNG(cond), { fact: 'dungCho', giaTri: gt }).trangThai;
  check('3n dungCho "xe thuộc nhóm 87.11" THOẢ "xe thuộc Chương 87"', dg('xe thuộc Chương 87', 'xe thuộc nhóm 87.11') === 'THOA');
  check('3o dungCho "Chương 87" (chung hơn) với điều kiện "nhóm 87.11" → CHUA_BIET', dg('xe thuộc nhóm 87.11', 'xe thuộc Chương 87') === 'CHUA_BIET');
  check('3p dungCho "nhóm 88.04" TRÁI "Chương 87"; "84.15" THOẢ danh sách "84.15, 84.18 … hoặc 85.16"', dg('xe thuộc Chương 87', 'dù xoay thuộc nhóm 88.04') === 'TRAI' && dg('hàng hóa thuộc nhóm 84.15, 84.18, 84.50, 85.09 hoặc 85.16', 'máy thuộc nhóm 84.15') === 'THOA');
  const r8 = C.kiemRanhGioi('848310', nhap848310());
  check('3q 848310: dungCho theo cấp mã ⇒ cổng 2 thấy .24 ("87.11") chồng .25 dưới tiêu đề "Chương 87"', coLoi(r8, 'cong2-chong-lan:84831024+84831025'), r8.loi);
}

// ── 4. HOẶC của các nhóm VÀ (DNF) trong dieuKienSo có kiểu ──────────────────────────────────────────────────────
const S = require('../lib/so-tay.js');
const RL = (v) => ({ fact: 'loaiRoLe', op: 'TRONG', value: v });
const HOAC = (...phuongAn) => ({ op: 'HOAC', phuongAn });
function nhap853641(d91) {
  return nhap('853641', {
    85364110: [RL(['KY_THUAT_SO'])], 85364120: [DUNG('thiết bị sóng vô tuyến')], 85364130: [DUNG('quạt điện')],
    85364140: [SO('dongDien', '<', 16, 'A')], 85364191: d91,
  }, { chongLanVanBan: [{ cap: ['85364110', '85364120'], lyDo: 'Chữ biểu: .10 "Rơ le kỹ thuật số" và .20 "Của loại sử dụng trong các thiết bị sóng vô tuyến" không loại trừ nhau.' },
    { cap: ['85364110', '85364130'], lyDo: 'Chữ biểu: .10 "Rơ le kỹ thuật số" và .30 "Của loại sử dụng cho quạt điện" không loại trừ nhau.' }] });
}
{
  const dnf = HOAC([RL(['BAN_DAN']), SO('dienAp', '<=', 28, 'V')], [RL(['DIEN_TU']), SO('dienAp', '<=', 28, 'V')]);
  const r = C.kiemRanhGioi('853641', nhap853641([dnf]));
  check('4a HOAC có kiểu (mỗi phương án là nhóm VÀ khoá tu-vung) qua cổng 0 + 3, bản tương đương vẫn xanh', r.hopLe === true, r.loi);
  const sai = HOAC([RL(['BAN_DAN']), SO('dienAp', '<=', 28, 'V')], [RL(['DIEN_TU']), SO('dienAp', '<=', 48, 'V')]);
  check('4b ngưỡng của một phương án không có trong trích → lỗi cổng 3', coLoi(C.kiemRanhGioi('853641', nhap853641([sai])), 'cong3-muc:85364191:dieu-kien-so-nguong-khong-co-trong-trich:48'), C.kiemRanhGioi('853641', nhap853641([sai])).loi);
  const cu = HOAC([{ fact: 'dien_ap', op: '<=', value: 28, donVi: 'V' }], [RL(['DIEN_TU'])]);
  check('4c HOAC lẫn fact cũ (snake_case) → cong0-fact-chua-co-kieu', coLoi(C.kiemRanhGioi('853641', nhap853641([cu])), 'cong0-fact-chua-co-kieu:85364191'));
  check('4d HOAC một phương án / lồng HOAC / có chieu → lỗi cổng 0',
    coLoi(C.kiemRanhGioi('853641', nhap853641([HOAC([RL(['DIEN_TU'])])])), 'cong0-hoac-hinh-dang:85364191')
    && coLoi(C.kiemRanhGioi('853641', nhap853641([HOAC([dnf], [RL(['DIEN_TU'])])])), 'cong0-hoac-hinh-dang:85364191')
    && coLoi(C.kiemRanhGioi('853641', nhap853641([{ ...dnf, chieu: 'PHAI_KHONG' }])), 'cong0-hoac-hinh-dang:85364191'));
  const F = (gt) => DK.chuanDuKien([{ fact: 'loaiRoLe', giaTri: gt[0], nguon: 'KHACH', trangThai: 'DA_CO' }, { fact: 'dienAp', giaTri: gt[1], donVi: 'V', nguon: 'KHACH', trangThai: 'DA_CO' }]);
  const dg = (c, gt) => DK.danhGiaTrenMap(c, F(gt));
  check('4e chấm HOAC: (bán dẫn, 24 V) THOẢ tất định; (điện từ, 30 V) TRÁI tất định', dg(dnf, ['BAN_DAN', 24]).trangThai === 'THOA' && dg(dnf, ['BAN_DAN', 24]).tatDinh === true && dg(dnf, ['DIEN_TU', 30]).trangThai === 'TRAI' && dg(dnf, ['DIEN_TU', 30]).tatDinh === true);
  const dnfChu = HOAC([DUNG('quạt điện')], [RL(['DIEN_TU'])]);
  check('4f HOAC THOẢ nhờ phương án so chữ tự do → không tất định', DK.danhGiaTrenMap(dnfChu, DK.chuanDuKien([{ fact: 'dungCho', giaTri: 'quạt điện', nguon: 'KHACH', trangThai: 'DA_CO' }])).tatDinh === false);
  const sau = nhap853641([HOAC([RL(['BAN_DAN']), SO('dienAp', '<=', 28, 'V')], [RL(['DIEN_TU'])])]);
  const kq = DK.doiChieuDong8('85364191', [{ fact: 'loaiRoLe', giaTri: 'DIEN_TU', nguon: 'KHACH', trangThai: 'DA_CO' }, { fact: 'dienAp', giaTri: 30, donVi: 'V', nguon: 'KHACH', trangThai: 'DA_CO' }], { soTay: C.soTayTuNhap('853641', sau) });
  check('4g doiChieuDong8 đọc được HOAC: (điện từ, 30 V) CO với phương án không ngưỡng', kq.ketQua === 'CO', kq);
  check('4h moTaNgan HOAC đọc được', /hoặc/.test(DK.moTaNgan(dnf)) && /28/.test(DK.moTaNgan(dnf)), DK.moTaNgan(dnf));
  const dong = { hs: '85364191', nguon: 'tax.85364191', trich: '85364191 - - - - Rơ le bán dẫn hoặc rơ le điện từ, điện áp không quá 28 V', dieuKienSo: [dnf], nguonLoai: 'CLAUDE_DUYET' };
  check('4i máy kiểm sổ tay (checkItem) nhận HOAC có kiểu', S.checkItem('dong8', dong, S.sourcesFor('8536'), '8536') === null, S.checkItem('dong8', dong, S.sourcesFor('8536'), '8536'));
  const tc = DK.danhGiaTuChu(dnf, 'Rơ le bán dẫn 24 V');
  check('4j chấm HOAC trên chữ mô tả (đường runtime) → THOA', tc.trangThai === 'THOA', tc);
}

console.log(`\n${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
