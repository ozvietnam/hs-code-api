#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * Gỡ hai DỪNG cuối lát 1 (#606 851762, #689; #577 848180) — cổng ranh giới trên SPEC ĐÔNG CỨNG
 * (scripts/fixtures/ho-so/spec-go-dung/<pn6>.json, bản sao spec đã soạn), không đọc bản nháp sống data/ho-so.
 *
 * 851762: khoá LIET_KE phuongThucTruyenDan (tu-vung@2) cho định ngữ chung "truyền dẫn dưới dạng sóng vô tuyến" ⇒ .53/.61/.92
 *   có điều kiện tất định; .10 "phát và thu sóng vô tuyến" = tenLoai "phát và thu" + VO_TUYEN ⇒ .52 tới được (vector phương thức
 *   truyền dẫn khác vô tuyến); chồng lấn trục .91 (tên) ↔ .92 (công dụng) khai chongLanTruc, phanXu null.
 * 848180: nhóm chữ số không tên trong suốt (lib/hs-tree.js) ⇒ không còn tieu-de-bi-luoc-ten; xem phần 2.
 * Không gọi mạng/LLM, không ghi data/, không đọc data/bench, data/oz-export.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const C = require('../lib/ho-so/cong-ranh-gioi.js');
const DK = require('../lib/dieu-kien-so.js');

let pass = 0; let fail = 0;
const check = (n, c, d) => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n}`, d === undefined ? '' : JSON.stringify(d).slice(0, 900)); } };
const spec = (pn6) => JSON.parse(fs.readFileSync(`scripts/fixtures/ho-so/spec-go-dung/${pn6}.json`, 'utf8'));
const duKien = (o) => Object.entries(o).map(([fact, giaTri]) => ({ fact, giaTri, nguon: 'KHACH', trangThai: 'DA_CO' }));

// ── 1. 851762 ──────────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const s = spec('851762');
  const a = C.apSpec(s, null, { ngay: '2026-10-31' });
  check('1a 851762: apSpec không lỗi, không DỪNG (khoá phuongThucTruyenDan có trong tu-vung@2)', a.loi.length === 0 && a.dung.length === 0 && Boolean(a.banNhap), { loi: a.loi, dung: a.dung });
  const r = a.banNhap ? C.kiemRanhGioi('851762', a.banNhap) : { loi: ['khong-co-ban-nhap'], canhBao: [], dung: [] };
  check('1b 851762: đủ cổng XANH, không DỪNG', r.hopLe === true && (r.dung || []).length === 0, { loi: r.loi.slice(0, 8), dung: r.dung });
  check('1c không còn cong2-dong-khong-toi-duoc:85176252', !r.loi.some((l) => l.startsWith('cong2-dong-khong-toi-duoc')), r.loi);
  check('1d chồng lấn trục đã khai: .41/.42 ↔ .43 và .91 ↔ .92 (cảnh báo, không lỗi)', r.canhBao.includes('cong2-chong-lan-truc-da-khai:85176241,85176242,85176243:2') && r.canhBao.includes('cong2-chong-lan-truc-da-khai:85176291,85176292:1'), r.canhBao.filter((x) => x.startsWith('cong2')));
  const dk = (hs) => a.banNhap?.dong8.find((m) => m.hs === hs)?.dieuKienSo || [];
  const coVT = (hs) => dk(hs).some((c) => c.fact === 'phuongThucTruyenDan' && JSON.stringify(c.value) === '["VO_TUYEN"]');
  check('1e .10/.53/.61/.92 mang phuongThucTruyenDan [VO_TUYEN]; .53/.61/.92 dungCho ["điện báo","điện thoại"]', ['85176210', '85176253', '85176261', '85176292'].every(coVT)
    && ['85176253', '85176261', '85176292'].every((hs) => dk(hs).some((c) => c.fact === 'dungCho' && JSON.stringify(c.value) === '["điện báo","điện thoại"]')));
  check('1f spec: không ghi chú DUNG, không chongLanVanBan, mọi chongLanTruc phanXu null', !s.ghiChuSoan.some((g) => g.loai === 'DUNG') && !s.chongLanVanBan && s.chongLanTruc.every((x) => x.phanXu === null));
  // Lúc chạy (sổ tay dựng từ bản nháp): đúng ranh giới chữ biểu.
  const soTay = C.soTayTuNhap('851762', a.banNhap);
  const coDong = (o) => ['85176210', '85176252', '85176253', '85176259', '85176261', '85176269', '85176292', '85176299'].filter((hs) => DK.doiChieuDong8(hs, duKien(o), { soTay }).ketQua === 'CO');
  const chung = { dungCho: 'phiên dịch trực tiếp tại hội nghị', coKetHopThietBiThu: true, congDung: 'truyền dẫn' };
  check('1g máy phát-thu phiên dịch VÔ TUYẾN ⇒ chỉ .10', JSON.stringify(coDong({ ...chung, tenLoai: 'Thiết bị phát và thu', phuongThucTruyenDan: 'VO_TUYEN' })) === '["85176210"]');
  check('1h máy phát-thu phiên dịch hữu tuyến (vd hồng ngoại có dây) ⇒ chỉ .52 (trước: không tới được)', JSON.stringify(coDong({ ...chung, tenLoai: 'Thiết bị phát và thu hồng ngoại', phuongThucTruyenDan: 'HUU_TUYEN' })) === '["85176252"]');
  const phat = { tenLoai: 'máy phát', dungCho: 'điện thoại', coKetHopThietBiThu: false, congDung: 'truyền dẫn' };
  check('1i máy phát cho điện thoại VÔ TUYẾN (không thu) ⇒ chỉ .61', JSON.stringify(coDong({ ...phat, phuongThucTruyenDan: 'VO_TUYEN' })) === '["85176261"]');
  check('1j máy phát cho điện thoại HỮU TUYẾN ⇒ chỉ .69 (định ngữ "sóng vô tuyến" không bị bỏ)', JSON.stringify(coDong({ ...phat, phuongThucTruyenDan: 'HUU_TUYEN' })) === '["85176269"]');
}

// ── 2. 848180 — nhóm chữ số không tên trong suốt; còn DỪNG vì lý do KHÁC (khoá, biểu diễn, trục ba chiều) ───────────────────
// Cổng 2 của 848180 sinh hàng chục triệu vector (vài phút) ⇒ test chạy cổng 0, 1, 3 và cổng 5; kết quả cổng 2 ghi ở ghi chú DUNG.
{
  const s = spec('848180');
  const a = C.apSpec(s, null, { ngay: '2026-10-31' });
  check('2a 848180: apSpec không lỗi spec', a.loi.length === 0 && Boolean(a.banNhap), a.loi);
  const r = a.banNhap ? C.kiemRanhGioi('848180', a.banNhap, { cong: [0, 1, 3] }) : { loi: ['khong-co-ban-nhap'], canhBao: [], dung: [] };
  check('2b không còn cong1-tieu-de-bi-luoc-ten / cong1-tang-* (nhóm chữ số 8481801/06/07/08/09 trong suốt)', !r.loi.some((l) => /^cong1-(tieu-de-bi-luoc-ten|tang-)/.test(l)), r.loi.filter((l) => /luoc|tang/.test(l)).slice(0, 5));
  check('2c cổng 0/1/3: lỗi duy nhất là cong1-chua-so-hoa của đúng hai mục DỪNG (.93, .97)', r.loi.length > 0 && r.loi.every((l) => /^cong1-chua-so-hoa:\d{8}:8481809[37]$/.test(l)), r.loi);
  check('2d DỪNG đúng ba lý do: THIEU_KHOA_TU_VUNG .97 (xử lý bề mặt), DUNG .93 ("vật liệu khác"), DUNG 8481805 (trục ba chiều)',
    JSON.stringify([...(r.dung || [])].sort()) === JSON.stringify(['DUNG:8481805', 'DUNG:84818093', 'THIEU_KHOA_TU_VUNG:84818097:daXuLyBeMat']), r.dung);
  const v = a.banNhap ? C.kiemVe('848180', a.banNhap) : { loi: ['x'], canhBao: [] };
  check('2e cổng 5 xanh; chỉ miễn BO_VE "Bằng vật liệu khác" của .12/.14 (phần còn lại sau "Bằng đồng")', v.loi.length === 0 && v.canhBao.filter((x) => x.startsWith('cong5')).sort().join() === 'cong5-bo-ve:84818012:Bằng vật liệu khác,cong5-bo-ve:84818014:Bằng vật liệu khác', v);
  check('2f ghi LECH_TIEN_LE trỏ mục bảng 848180-01 (soạn theo chữ biểu)', s.ghiChuSoan.some((g) => g.loai === 'LECH_TIEN_LE' && g.ma === '84818063' && /848180-01/.test(g.ghiChu)));
  check('2g không có điều kiện cho nhóm chữ số không tên (8481801/06/07/08/09) — chỉ tầng có tên của biểu', !Object.keys(s.dieuKienNut).some((id) => /^848180[1-9]$/.test(id) && !['8481802', '8481804', '8481805'].includes(id)));
  const soTay = C.soTayTuNhap('848180', a.banNhap);
  const d97 = DK.duongDiDong8('84818097', { soTay });
  check('2h lúc chạy: 84818097 phủ định đủ tám mục gạch 3 của r14562 (r14563 … r14579), không chỉ anh em trong 8481809',
    ['848180~r14563', '848180~r14566', '848180~r14570', '848180~r14573', '84818083', '84818084', '84818093', '848180~r14579'].every((id) => d97.nhom.some((g) => g.nut === id && g.chieu === 'PHAI_KHONG')), d97.nhom.map((g) => [g.nut, g.chieu]));
}

console.log(`\n${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
