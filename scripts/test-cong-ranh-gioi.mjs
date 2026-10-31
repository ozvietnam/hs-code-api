// lib/ho-so/cong-ranh-gioi.js — cổng máy cho ranh giới 6→8 số (plan L1-4a, #577; spec hồ sơ §8.1, §11).
// Bản nháp VIẾT TAY trên phân nhóm thật (cây + biểu thuế + nguồn nguyên văn thật), không đọc data/bench/.
// Ghi (áp vào sổ tay) chỉ vào thư mục tạm của test-isolate-data.
import './test-isolate-data.mjs';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import { TEST_DATA_DIR } from './test-isolate-data.mjs';
const require = createRequire(import.meta.url);
const C = require('../lib/ho-so/cong-ranh-gioi.js');
const S = require('../lib/so-tay.js');
const { nhanCuaTep } = require('../lib/nguon-loai.js');

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${typeof x === 'string' ? x : JSON.stringify(x)}`); } };
const clone = (x) => JSON.parse(JSON.stringify(x));
const coLoi = (r, tien) => r.loi.some((l) => l.startsWith(tien));

// ── Bản nháp hợp lệ của 8413.50 (bơm piston cho chất lỏng): tiêu đề có tên 8413503 + 2 dòng con + 84135040 + Loại khác ──
const nhap841350 = () => ({
  phienBan: 'ranh-gioi@1', pn6: '841350', nhom: '8413', trangThai: 'NHAP',
  soanBoi: { vai: 'AI', phien: 'phien-soan-A', ngay: '2026-10-30' }, duyet: null,
  dieuKienNut: [
    { id: '8413503', nguon: 'tieuDe.8413503', trich: '8413503 Bơm nước, với lưu lượng không quá 8.000 m³/h', nguonLoai: 'AI_DA_KIEM',
      dieuKienSo: [{ fact: 'tenLoai', op: 'TEN_LOAI', value: 'Bơm nước' }, { fact: 'luuLuong', op: '<=', value: 8000, donVi: 'm³/h' }] },
  ],
  dong8: [
    { hs: '84135031', nguon: 'tax.84135031', trich: '84135031 - - - Hoạt động bằng điện', nguonLoai: 'AI_DA_KIEM', dieuKienSo: [{ fact: 'hoatDongBangDien', op: 'CO' }] },
    { hs: '84135032', nguon: 'tax.84135032', trich: '84135032 - - - Không hoạt động bằng điện', nguonLoai: 'AI_DA_KIEM', dieuKienSo: [{ fact: 'hoatDongBangDien', op: 'KHONG' }] },
    { hs: '84135040', nguon: 'tax.84135040', trich: '84135040 - - Bơm nước, với lưu lượng trên 8.000 m³/h nhưng không quá 13.000 m³/h', nguonLoai: 'AI_DA_KIEM',
      dieuKienSo: [{ fact: 'tenLoai', op: 'TEN_LOAI', value: 'Bơm nước' }, { fact: 'luuLuong', op: '>', value: 8000, donVi: 'm³/h' }, { fact: 'luuLuong', op: '<=', value: 13000, donVi: 'm³/h' }] },
    { hs: '84135090', nguon: 'tax.84135090', trich: '84135090 - - Loại khác', nguonLoai: 'AI_DA_KIEM', dieuKienSo: [] },
  ],
});
const dong = (b, hs) => b.dong8.find((d) => d.hs === hs);

// ── 1. Bản hợp lệ ─────────────────────────────────────────────────────────────────────────────────────────────
{
  const r = C.kiemRanhGioi('841350', nhap841350());
  check('1a bản nháp hợp lệ 841350 → hopLe, không lỗi', r.hopLe === true && r.loi.length === 0, r.loi);
  check('1b thống kê: 4 dòng, 1 tiêu đề, có vector đã thử', r.thongKe.soDong === 4 && r.thongKe.soTieuDe === 1 && r.thongKe.soVector > 0, r.thongKe);
}

// ── 2. Cổng 1 — phủ kín anh em (luật đi tiêu đề có tên #575) ──────────────────────────────────────────────────────
{
  const b = nhap841350(); dong(b, '84135040').dieuKienSo = [];
  const r = C.kiemRanhGioi('841350', b);
  check('2a dòng có tên thiếu dieuKienSo → cong1-chua-so-hoa ở chính dòng đó', r.loi.includes('cong1-chua-so-hoa:84135040:84135040'), r.loi);
  check('2b … và ở dòng Loại khác phải phủ định nó', r.loi.includes('cong1-chua-so-hoa:84135090:84135040'), r.loi);
  check('2c hopLe = false', r.hopLe === false);

  const b2 = nhap841350(); b2.dieuKienNut = [];
  const r2 = C.kiemRanhGioi('841350', b2);
  check('2d tiêu đề có tên 8413503 thiếu điều kiện → cong1-chua-so-hoa:84135031:8413503 (PHAI_CO tiêu đề)', r2.loi.includes('cong1-chua-so-hoa:84135031:8413503'), r2.loi);

  const b3 = nhap841350(); dong(b3, '84135032').dieuKienSo = [{ fact: 'hoatDongBangDien', op: 'CO' }];
  const r3 = C.kiemRanhGioi('841350', b3);
  check('2e tầng không có dòng Loại khác: hai con cùng "CO" → vector "không chạy điện" không vào đâu → cong1-khong-phu-kin:8413503', coLoi(r3, 'cong1-khong-phu-kin:8413503'), r3.loi);

  // Tiêu đề bị lược tên: luật đi coi như "Loại khác" là sai nghĩa → chặn, không đoán
  const r4 = C.kiemRanhGioi('848180', { ...nhap841350(), pn6: '848180', nhom: '8481', dieuKienNut: [], dong8: [] });
  // #606: 8481801 là nhóm chữ số KHÔNG có dòng biểu thuế ⇒ trong suốt trong lớp tầng; 84818011 đi qua tầng r14535 "Van dùng cho săm".
  check('2f 848180: nhóm chữ số không tên (8481801) không còn chặn tieu-de-bi-luoc-ten; đòi điều kiện tầng r14535', !r4.loi.some((l) => l.startsWith('cong1-tieu-de-bi-luoc-ten')) && r4.loi.includes('cong1-chua-so-hoa:84818011:848180~r14535'), r4.loi.slice(0, 5));
  check('2g 848180: 84818011 không phủ định anh em của tầng (8481802, .30, 8481804, 8481805) — chỉ "Loại khác" mới phủ định (#583)',
    !r4.loi.some((l) => /^cong1-chua-so-hoa:84818011:(8481802|84818030|8481804|8481805)$/.test(l)), r4.loi.filter((l) => l.includes(':84818011:')));
  // #583: tầng có HAI tiêu đề "Loại khác" trần (8414594 + 8414599) từng là dấu cây lược một tầng có tên → cong1-tang-bi-luoc.
  // #577 (tầng không mã): lớp tầng dựng lại tầng "Công suất không quá 125 kW" (r13180) / "Loại khác" (r13187) ⇒ không còn
  // tang-bi-luoc; tầng có tên thành nhóm cần điều kiện (dieuKienNut 841459~r13180).
  const k459 = C.kiemRanhGioi('841459', C.taoKhung('841459', { phien: 'phien-soan-A', ngay: '2026-10-30' }));
  check('2h 841459: không còn cong1-tang-bi-luoc; tầng r13180 trên đường của .41 là nhóm chưa số hoá', !k459.loi.some((l) => l.startsWith('cong1-tang-bi-luoc')) && k459.loi.includes('cong1-chua-so-hoa:84145941:841459~r13180'), k459.loi.filter((l) => l.startsWith('cong1-t') || l.startsWith('cong1-p') || l.includes('~r')));
  check('2i … không còn mã cong1-phu-dinh-tieu-de-loai-khac-tran', !k459.loi.some((l) => l.startsWith('cong1-phu-dinh-tieu-de-loai-khac-tran')), k459.loi.slice(0, 5));
}

// ── 3. Cổng 2 — loại trừ lẫn nhau ─────────────────────────────────────────────────────────────────────────────────
{
  const b = nhap841350(); dong(b, '84135040').dieuKienSo[1] = { fact: 'luuLuong', op: '>=', value: 8000, donVi: 'm³/h' };
  const r = C.kiemRanhGioi('841350', b);
  check('3a biên 8.000 viết ">=" chồng với tiêu đề "<= 8.000" → cong2-chong-lan 84135031+84135040', coLoi(r, 'cong2-chong-lan:84135031+84135040'), r.loi);
  const v = r.loi.find((l) => l.startsWith('cong2-chong-lan:84135031+84135040'));
  check('3b lỗi kèm vector làm cả hai THOA (lưu lượng 8000)', /luuLuong=8000\b/.test(v || ''), v);

  // Rơ le ≤ 60 V (8536.41): "Rơ le kỹ thuật số" và "Của loại sử dụng trong các thiết bị sóng vô tuyến" — chữ biểu không loại trừ nhau
  const r2 = C.kiemRanhGioi('853641', nhap853641());
  check('3c 853641: rơ le kỹ thuật số dùng cho thiết bị sóng vô tuyến THOA cả .10 và .20 → cong2-chong-lan:85364110+85364120', coLoi(r2, 'cong2-chong-lan:85364110+85364120'), r2.loi);
  check('3d lỗi chồng lấn có so chữ tự do được đánh dấu (khong-tat-dinh)', r2.loi.some((l) => l.startsWith('cong2-chong-lan:85364110+85364120') && l.includes('khong-tat-dinh')), r2.loi);
  // #583: anh em là tiêu đề "Loại khác" trần, duy nhất phần còn lại của tầng → luật đi bỏ qua (như dòng LK trần), cổng 1 không chặn
  check('3e 85364140 "Loại khác, dòng điện dưới 16 A" cạnh tiêu đề "Loại khác" trần 8536419 → cổng 1 KHÔNG chặn (#583)', !r2.loi.some((l) => l.startsWith('cong1-')), r2.loi);
}
function nhap853641() {
  const d = (hs, trich, dk) => ({ hs, nguon: `tax.${hs}`, trich, nguonLoai: 'AI_DA_KIEM', dieuKienSo: dk });
  return {
    phienBan: 'ranh-gioi@1', pn6: '853641', nhom: '8536', trangThai: 'NHAP', soanBoi: { vai: 'AI', phien: 'phien-soan-A', ngay: '2026-10-30' }, duyet: null, dieuKienNut: [],
    dong8: [
      d('85364110', '85364110 - - - Rơ le kỹ thuật số', [{ fact: 'loaiRoLe', op: 'TRONG', value: ['KY_THUAT_SO'] }]),
      d('85364120', '85364120 - - - Của loại sử dụng trong các thiết bị sóng vô tuyến', [{ fact: 'dungCho', op: 'CONG_DUNG', value: 'thiết bị sóng vô tuyến' }]),
      d('85364130', '85364130 - - - Của loại sử dụng cho quạt điện', [{ fact: 'dungCho', op: 'CONG_DUNG', value: 'quạt điện' }]),
      d('85364140', '85364140 - - - Loại khác, dòng điện dưới 16 A', [{ fact: 'dongDien', op: '<', value: 16, donVi: 'A' }]),
      d('85364191', '85364191 - - - - Rơ le bán dẫn hoặc rơ le điện từ, điện áp không quá 28 V', [{ fact: 'loaiRoLe', op: 'TRONG', value: ['BAN_DAN', 'DIEN_TU'] }, { fact: 'dienAp', op: '<=', value: 28, donVi: 'V' }]),
      d('85364199', '85364199 - - - - Loại khác', []),
    ],
  };
}

// ── 4. Cổng 3 — trích có thật, đúng nút, điều kiện khớp chữ ─────────────────────────────────────────────────────
{
  const b = nhap841350(); dong(b, '84135031').trich = '84135031 - - - Hoạt động bằng điện năng';
  const r = C.kiemRanhGioi('841350', b);
  check('4a trích thêm/sửa một chữ → cong3 trich-khong-co-trong-nguon', r.loi.some((l) => l.startsWith('cong3-') && l.includes('84135031') && l.includes('trich-khong-co-trong-nguon')), r.loi);

  // Đoạn lược ngắn (< 6 ký tự) máy cũ bỏ qua — ở ranh giới thì mọi đoạn phải có, đúng thứ tự.
  const b2 = nhap841350();
  dong(b2, '84135040').trich = '84135040 - - Bơm nước, với lưu lượng trên 8.000 m³/h … 9 m³/h';
  dong(b2, '84135040').dieuKienSo = [{ fact: 'tenLoai', op: 'TEN_LOAI', value: 'Bơm nước' }, { fact: 'luuLuong', op: '>', value: 8000, donVi: 'm³/h' }, { fact: 'luuLuong', op: '<=', value: 9, donVi: 'm³/h' }];
  check('4b (đối chứng) máy kiểm sổ tay cũ cho qua câu bịa "… 9 m³/h"', S.checkItem('dong8', dong(b2, '84135040'), S.sourcesFor('8413'), '8413') === null);
  const r2 = C.kiemRanhGioi('841350', b2);
  check('4c cổng 3 chặn đoạn lược ngắn không có trong nguồn → cong3-trich-doan-khong-co', r2.loi.some((l) => l.startsWith('cong3-trich-doan-khong-co:84135040')), r2.loi);

  const b3 = nhap841350(); b3.dong8[0] = { ...b3.dong8[0], nguon: 'tax.84135040', trich: '84135040 - - Bơm nước, với lưu lượng trên 8.000 m³/h', dieuKienSo: [{ fact: 'luuLuong', op: '>', value: 8000, donVi: 'm³/h' }] };
  const r3 = C.kiemRanhGioi('841350', b3);
  check('4d dòng 84135031 trích chữ của dòng khác (tax.84135040) → cong3-nguon-sai-nut', r3.loi.includes('cong3-nguon-sai-nut:84135031:tax.84135040'), r3.loi);

  const b4 = nhap841350(); dong(b4, '84135032').dieuKienSo = [{ fact: 'hoatDongBangDien', op: 'CO' }];
  const r4 = C.kiemRanhGioi('841350', b4);
  check('4e "Không hoạt động bằng điện" ghi op CO → cong3-cuc-tinh-nguoc', r4.loi.includes('cong3-cuc-tinh-nguoc:84135032:hoatDongBangDien'), r4.loi);

  const b5 = nhap841350(); dong(b5, '84135040').dieuKienSo[1] = { fact: 'luuLuong', op: '>=', value: 8000, donVi: 'm³/h' };
  const r5 = C.kiemRanhGioi('841350', b5);
  check('4f chữ "trên 8.000" ghi ">=" → cong3-bien-lech-chu', r5.loi.includes('cong3-bien-lech-chu:84135040:luuLuong'), r5.loi);

  const b6 = nhap841350(); b6.dieuKienNut[0] = { ...b6.dieuKienNut[0], nguon: 'nhom8413.nhom', trich: 'không có câu này trong chú giải' };
  const r6 = C.kiemRanhGioi('841350', b6);
  check('4g điều kiện tiêu đề trích sai nguồn → cong3', r6.loi.some((l) => l.startsWith('cong3-') && l.includes('8413503')), r6.loi);
}

// ── 5. Cổng 0 — hình dạng, nhãn, quy trình nháp → duyệt ─────────────────────────────────────────────────────────
{
  const b = nhap841350(); dong(b, '84135031').nguonLoai = 'CLAUDE_DUYET';
  check('5a bản NHAP có mục tự gắn CLAUDE_DUYET → cong0-nhan', coLoi(C.kiemRanhGioi('841350', b), 'cong0-nhan:84135031'));
  const b2 = nhap841350(); b2.trangThai = 'DUYET';
  check('5b trạng thái DUYET mà không có bản ghi duyệt → cong0-duyet-thieu', coLoi(C.kiemRanhGioi('841350', b2), 'cong0-duyet-thieu'));
  const b3 = nhap841350(); dong(b3, '84135031').dieuKienSo = [{ fact: 'hoat_dong_dien', op: '<=', value: 1, donVi: 'V' }];
  check('5c fact cũ không có kiểu (snake_case) → cong0-fact-chua-co-kieu', coLoi(C.kiemRanhGioi('841350', b3), 'cong0-fact-chua-co-kieu:84135031'));
  const b4 = nhap841350(); b4.dong8.push({ hs: '84135990', nguon: 'tax.84135990', trich: 'x', nguonLoai: 'AI_DA_KIEM', dieuKienSo: [] });
  check('5d mục ngoài phân nhóm → cong0-ngoai-phan-nhom', coLoi(C.kiemRanhGioi('841350', b4), 'cong0-ngoai-phan-nhom:84135990'));
  const b5 = nhap841350(); dong(b5, '84135090').dieuKienSo = [{ fact: 'hoatDongBangDien', op: 'CO' }];
  check('5e dòng "Loại khác" trần mang điều kiện → lỗi', C.kiemRanhGioi('841350', b5).hopLe === false);
  const b6 = nhap841350(); delete b6.soanBoi;
  check('5f thiếu soanBoi.phien → cong0-thieu-nguoi-soan', coLoi(C.kiemRanhGioi('841350', b6), 'cong0-thieu-nguoi-soan'));

  // duyệt: chỉ khi xanh, phiên khác người soạn; nâng nhãn; sửa sau duyệt → đỏ
  let nem = null; try { C.duyet(nhap841350(), { phien: 'phien-soan-A', ngay: '2026-10-31' }); } catch (e) { nem = e.message; }
  check('5g người soạn tự duyệt → từ chối', /cung-phien|tu-duyet/.test(nem || ''), nem);
  const hong = nhap841350(); dong(hong, '84135040').dieuKienSo = [];
  nem = null; try { C.duyet(hong, { phien: 'https://claude.ai/code/session_TEST#soat-B', ngay: '2026-10-31' }); } catch (e) { nem = e.message; }
  check('5h duyệt bản còn đỏ → từ chối', /cong1-chua-so-hoa/.test(nem || ''), nem);
  const ok = C.duyet(nhap841350(), { phien: 'https://claude.ai/code/session_TEST#soat-B', ngay: '2026-10-31', ghiChu: 'đối chiếu checklist L1-4c' });
  check('5i duyệt xanh → DUYET, mọi mục CLAUDE_DUYET, có bam', ok.trangThai === 'DUYET' && [...ok.dong8, ...ok.dieuKienNut].every((m) => m.nguonLoai === 'CLAUDE_DUYET') && /^[0-9a-f]{64}$/.test(ok.duyet.bam), ok.duyet);
  check('5j bản đã duyệt qua cổng', C.kiemRanhGioi('841350', ok).hopLe === true, C.kiemRanhGioi('841350', ok).loi);
  const sua = clone(ok); dong(sua, '84135040').dieuKienSo[2].value = 13000; dong(sua, '84135040').trich += ' ';
  check('5k sửa sau duyệt (đổi trích) → cong0-sua-sau-duyet', coLoi(C.kiemRanhGioi('841350', sua), 'cong0-sua-sau-duyet'));
  // Bảng hiệu chỉnh (L1-4b) đã commit có mục 392690 ⇒ giả "chưa có bảng" bằng bảng rỗng trong HS_DATA_DIR của test.
  const tepHc = path.join(TEST_DATA_DIR, 'ho-so', 'hieu-chinh-tien-le.json');
  fs.mkdirSync(path.dirname(tepHc), { recursive: true }); fs.writeFileSync(tepHc, JSON.stringify({ muc: [] }));
  const nhap392690 = () => ({ ...nhap841350(), pn6: '392690', nhom: '3926', dong8: [], dieuKienNut: [] });
  nem = null; try { C.duyet(nhap392690(), { phien: 'https://claude.ai/code/session_TEST#soat-B', ngay: '2026-10-31' }); } catch (e) { nem = e.message; }
  check('5l phân nhóm cờ canHieuChinhTienLe (392690) chưa có bảng hiệu chỉnh → không duyệt', /hieu-chinh/.test(nem || ''), nem);
  fs.rmSync(tepHc);
  nem = null; try { C.duyet(nhap392690(), { phien: 'https://claude.ai/code/session_TEST#soat-B', ngay: '2026-10-31' }); } catch (e) { nem = e.message; }
  check('5l2 có bảng hiệu chỉnh commit cho 392690 → không còn chặn vì bảng (chặn vì cổng đỏ)', nem && !/hieu-chinh/.test(nem) && /cong-do/.test(nem), nem);
  const tv = C.traVe(nhap841350(), { phien: 'https://claude.ai/code/session_TEST#soat-B', ngay: '2026-10-31', lyDo: '84135040: biên trên sai' });
  check('5m trả về → TRA_VE, giữ AI_DA_KIEM, ghi lý do', tv.trangThai === 'TRA_VE' && tv.traVe.at(-1).lyDo.includes('biên') && tv.dong8.every((m) => m.nguonLoai === 'AI_DA_KIEM'));
}

// ── 6. Áp vào sổ tay: chỉ bản DUYET; mục áp qua máy kiểm sổ tay ────────────────────────────────────────────────────
{
  const soTay = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/so-tay/8413.json'), 'utf8'));
  const soTayTruoc = JSON.stringify(soTay);
  let nem = null; try { C.apDung(nhap841350(), soTay); } catch (e) { nem = e.message; }
  check('6a áp bản NHAP → từ chối', /DUYET|chua-duyet/.test(nem || ''), nem);
  const moi = C.apDung(C.duyet(nhap841350(), { phien: 'https://claude.ai/code/session_TEST#soat-B', ngay: '2026-10-31' }), soTay);
  const d40 = moi.dong8.find((d) => d.hs === '84135040');
  check('6b dòng 84135040 nhận dieuKienSo có kiểu + CLAUDE_DUYET', d40.dieuKienSo.length === 3 && d40.nguonLoai === 'CLAUDE_DUYET' && d40.ranhGioi?.phienBan === 'ranh-gioi@1');
  const src = S.sourcesFor('8413');
  check('6c mọi mục đã áp qua checkItem của sổ tay', moi.dong8.filter((d) => d.hs.startsWith('841350')).every((d) => S.checkItem('dong8', d, src, '8413') === null)
    && moi.dieuKienNut.every((d) => S.checkItem('dieuKienNut', d, { ...src, ...S.nguonTieuDe('8413') }, '8413') === null));
  check('6d áp không làm lệch cây (kiemCay không lỗi)', S.kiemCay(moi, '8413').loi.length === 0, S.kiemCay(moi, '8413').loi);
  check('6e không đụng dòng ngoài phân nhóm', JSON.stringify(moi.dong8.filter((d) => !d.hs.startsWith('841350'))) === JSON.stringify(soTay.dong8.filter((d) => !d.hs.startsWith('841350'))));
  // So với ảnh chụp trước khi áp — sổ tay thật có thể đã mang ranh giới DUYET (L1-4c), nên không giả định dòng còn trống.
  check('6f hàm thuần: không sửa sổ tay đầu vào', JSON.stringify(soTay) === soTayTruoc);
}

// ── 7. Gói soạn + đợt + nhãn tệp ──────────────────────────────────────────────────────────────────────────────────
{
  const g = C.goiSoan('841350');
  check('7a gói soạn: 4 dòng + 1 tiêu đề cần số hoá, kèm chữ nguyên văn', g.canSoHoa.length === 5 && g.canSoHoa.some((x) => x.ma === '8413503' && x.nguon[0].nguon === 'tieuDe.8413503'), g.canSoHoa.map((x) => x.ma));
  check('7b gói soạn đánh dấu Loại khác trần là không cần điều kiện', g.canSoHoa.find((x) => x.ma === '84135090').khongCanDieuKien === true);
  check('7c gói soạn liệt kê từ vựng có kiểu', g.tuVung.some((k) => k.khoa === 'luuLuong' && k.kieu === 'SO'));
  const k = C.taoKhung('841350', { phien: 'phien-soan-A', ngay: '2026-10-30' });
  check('7d khung nháp: NHAP, AI_DA_KIEM, đủ dòng, chưa có điều kiện → cổng 1 đỏ', k.trangThai === 'NHAP' && k.dong8.length === 4 && C.kiemRanhGioi('841350', k).hopLe === false);
  check('7e đợt 1 = 10 phân nhóm đầu lát 1 theo hạng', C.phanNhomCuaDot(1).length === 10 && C.phanNhomCuaDot(1)[0] === '392690');
  check('7f nhãn tệp bản nháp ranh giới = DA_KIEM (từng mục mang nguonLoai riêng)', nhanCuaTep('data/ho-so/ranh-gioi/841350.json') === 'DA_KIEM', nhanCuaTep('data/ho-so/ranh-gioi/841350.json'));
}

// ── 8. Bản nháp đã commit: luôn NHAP/TRA_VE (chưa ai duyệt) hoặc duyệt hợp lệ; trích luôn có thật (cổng 0 + 3 xanh) ─
{
  const dir = path.join(process.cwd(), 'data/ho-so/ranh-gioi');
  const tep = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^\d{6}\.json$/.test(f)) : [];
  check('8a có bản nháp thí điểm đã commit', tep.length >= 3, tep);
  for (const f of tep) {
    const b = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    // #653: chỉ cổng 0 + 3 (không sinh vector) — 840991 (~6 triệu vector) từng thêm ~20 s CI cho một kiểm chỉ cần hai cổng này.
    const r = C.kiemRanhGioi(b.pn6, b, { cong: [0, 3] });
    // cong3-liet-ke-trong-mot-chuoi (vòng 5) là kiểm CHẤT LƯỢNG điều kiện (liệt kê HOẶC gói một chuỗi), không phải trích bịa —
    // bản NHAP/TRA_VE được đỏ vì nó như cổng 2/5; bản DUYET vẫn phải xanh đủ cổng (8d).
    const loi03 = r.loi.filter((l) => /^cong[03]-/.test(l) && !l.startsWith('cong3-liet-ke-trong-mot-chuoi:'));
    check(`8b ${f}: cổng 0 + cổng 3 xanh (không trích bịa, nhãn đúng)`, loi03.length === 0, loi03);
    check(`8c ${f}: chưa ai duyệt → mọi mục AI_DA_KIEM`, b.trangThai !== 'DUYET' ? [...b.dong8, ...(b.dieuKienNut || [])].every((m) => m.nguonLoai === 'AI_DA_KIEM') : true);
    // Bản đã DUYET phải xanh đủ 4 cổng (sửa công cụ làm đỏ bản đã duyệt = phát hiện, không sửa điều kiện đã duyệt).
    if (b.trangThai === 'DUYET') { const du = C.kiemRanhGioi(b.pn6, b); check(`8d ${f}: bản DUYET xanh đủ 4 cổng`, du.hopLe === true, du.loi); }
  }
}

// ── 9. CLI tất định ───────────────────────────────────────────────────────────────────────────────────────────────
{
  const out = execFileSync(process.execPath, ['scripts/so-hoa-ranh-gioi.mjs', '--goi', '--pn6=841350', '--json'], { encoding: 'utf8', env: process.env });
  const j = JSON.parse(out);
  check('9a CLI --goi --json trả gói soạn của 841350', j[0]?.pn6 === '841350' && j[0].canSoHoa.length === 5);
  const out2 = execFileSync(process.execPath, ['scripts/so-hoa-ranh-gioi.mjs', '--goi', '--pn6=841350', '--json'], { encoding: 'utf8', env: process.env });
  check('9b CLI tất định (hai lần chạy giống hệt)', out === out2);
  let code = 0; try { execFileSync(process.execPath, ['scripts/so-hoa-ranh-gioi.mjs', '--kiem', '--pn6=848180'], { encoding: 'utf8', env: process.env, stdio: 'pipe' }); } catch (e) { code = e.status; }
  check('9c CLI --kiem phân nhóm chưa có bản nháp → mã thoát ≠ 0', code !== 0);
}

// ── 10. Chồng lấn do CHÍNH chữ biểu (CHONG_LAN_VAN_BAN, GĐ 30/10): khai có lý do ⇒ cảnh báo, không lỗi; không bao giờ tự chốt ─
{
  // #577: lyDo phải trích (ngoặc kép) chữ biểu của CẢ HAI nhánh rẽ.
  const CL = (cap, lyDo = 'Chữ biểu .10 "Rơ le kỹ thuật số" (tên loại) và .20 "Của loại sử dụng trong các thiết bị sóng vô tuyến" (công dụng) không loại trừ nhau; không có căn cứ thứ tự.') => ({ cap, lyDo });
  const coCanh = (r, tien) => r.canhBao.some((l) => l.startsWith(tien));
  const b = nhap853641(); b.chongLanVanBan = [CL(['85364110', '85364120'])];
  const r = C.kiemRanhGioi('853641', b);
  check('10a cặp khai CHONG_LAN_VAN_BAN có lý do → không còn lỗi cong2-chong-lan của cặp đó', !coLoi(r, 'cong2-chong-lan:85364110+85364120'), r.loi);
  check('10b … mà thành cảnh báo cong2-chong-lan-van-ban:85364110+85364120 (kèm vector)', coCanh(r, 'cong2-chong-lan-van-ban:85364110+85364120:'), r.canhBao);
  check('10c cặp chồng lấn KHÔNG khai vẫn là lỗi (85364110+85364130)', coLoi(r, 'cong2-chong-lan:85364110+85364130') && r.hopLe === false, r.loi);
  const b2 = nhap853641(); b2.chongLanVanBan = [CL(['85364120', '85364110']), CL(['85364110', '85364130'], '.10 "Rơ le kỹ thuật số" dùng cho .30 "quạt điện": chữ biểu không loại trừ.')];
  const r2 = C.kiemRanhGioi('853641', b2);
  check('10d khai đủ mọi cặp chồng lấn (thứ tự cặp tuỳ ý) → hopLe, chỉ còn cảnh báo', r2.hopLe === true && r2.loi.length === 0 && r2.canhBao.filter((l) => l.startsWith('cong2-chong-lan-van-ban:')).length === 2, r2.loi);
  const b3 = nhap853641(); b3.chongLanVanBan = [{ cap: ['85364110', '85364120'] }];
  check('10e thiếu lyDo → cong0-chong-lan-thieu-ly-do (không được khai suông)', coLoi(C.kiemRanhGioi('853641', b3), 'cong0-chong-lan-thieu-ly-do:85364110+85364120'));
  const b4 = nhap853641(); b4.chongLanVanBan = [CL(['85364110', '85364990'])];
  check('10f cặp có mã ngoài phân nhóm → cong0-chong-lan-ngoai-phan-nhom', coLoi(C.kiemRanhGioi('853641', b4), 'cong0-chong-lan-ngoai-phan-nhom:85364990'));
  const b5 = nhap853641(); b5.chongLanVanBan = [CL(['85364110', '85364110'])];
  check('10g cặp một mã lặp → cong0-chong-lan-hinh-dang', coLoi(C.kiemRanhGioi('853641', b5), 'cong0-chong-lan-hinh-dang'));
  const b6 = nhap853641(); b6.chongLanVanBan = [CL(['85364110', '85364120']), CL(['85364120', '85364110'])];
  check('10h khai trùng cặp → cong0-chong-lan-trung', coLoi(C.kiemRanhGioi('853641', b6), 'cong0-chong-lan-trung:85364110+85364120'));
  const b7 = nhap853641(); b7.chongLanVanBan = [CL(['85364120', '85364130'])];
  check('10i khai cặp KHÔNG chồng lấn → cong2-chong-lan-van-ban-thua (nhãn phải đúng sự thật)', coLoi(C.kiemRanhGioi('853641', b7), 'cong2-chong-lan-van-ban-thua:85364120+85364130'));
  check('10j băm không đổi với bản không khai (mảng rỗng = không có)', C.bamRanhGioi(nhap853641()) === C.bamRanhGioi({ ...nhap853641(), chongLanVanBan: [] }));
  const ok = C.duyet(b2, { phien: 'https://claude.ai/code/session_TEST#soat-B', ngay: '2026-10-31' });
  check('10k bản có cặp CHONG_LAN_VAN_BAN khai đủ vẫn duyệt được (cảnh báo không chặn)', ok.trangThai === 'DUYET' && C.kiemRanhGioi('853641', ok).hopLe === true);
  const go = clone(ok); go.chongLanVanBan = go.chongLanVanBan.slice(0, 1);
  check('10l sửa danh sách CHONG_LAN_VAN_BAN sau duyệt → cong0-sua-sau-duyet', coLoi(C.kiemRanhGioi('853641', go), 'cong0-sua-sau-duyet'));
  const soTay = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/so-tay/8536.json'), 'utf8'));
  const moi = C.apDung(ok, soTay);
  const d10 = moi.dong8.find((d) => d.hs === '85364110'); const d20 = moi.dong8.find((d) => d.hs === '85364120');
  check('10m áp vào sổ tay mang dấu CHONG_LAN_VAN_BAN sang CẢ HAI dòng (runtime không tự chốt cặp này)',
    d10.chongLanVanBan?.some((x) => x.voi === '85364120' && x.lyDo) && d20.chongLanVanBan?.some((x) => x.voi === '85364110'), { d10: d10.chongLanVanBan, d20: d20.chongLanVanBan });
  check('10n mục mang dấu chồng lấn vẫn qua checkItem của sổ tay', S.checkItem('dong8', d10, S.sourcesFor('8536'), '8536') === null);
}

console.log(`\n${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
