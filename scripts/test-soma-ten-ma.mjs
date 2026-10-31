// scripts/test-soma-ten-ma.mjs — bộ so mã `soMa` (lib/dieu-kien-so.js) sau soát L1-4c đợt 3 (#697):
//   (1) TÊN hàng ↔ MÃ HS cho điều kiện dungCho viết bằng mã (lib/ten-sang-ma.js — chỉ tên nút cây HS, nguồn đã kiểm);
//   (2) ĐÍCH LỒNG (#693, 848390): "Bộ phận của hàng hóa thuộc phân nhóm 8483.10" ↔ dòng con "Dùng cho xe kéo thuộc 8701…" —
//       hai đích "dùng cho" lồng nhau trên CÙNG khoá dungCho; cổng 2 phải tới được .11–.15 ở dạng trung thực;
//   (3) BD-85-01 (85444299): mục bảng 854442-01 (CEO chốt theo TB-TCHQ → .99) áp cho đúng hàng thông báo nói; dòng "phần còn lại
//       có tên" .96 không bị coi là thoả khi hàng thuộc dòng nó loại (.94).
// Đọc dữ liệu THẬT (cây HS, sổ tay đã duyệt, bảng hiệu chỉnh) + bản nháp ĐÔNG CỨNG (scripts/fixtures/ho-so/ranh-gioi-dich-long/).
// KHÔNG đọc data/bench/*, data/oz-export/*; câu mô tả hàng trong test là câu tự viết. Không LLM, không mạng.
import './test-isolate-data.mjs';
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const DK = require('../lib/dieu-kien-so.js');
const TV = require('../lib/tu-vung.js');
const C = require('../lib/ho-so/cong-ranh-gioi.js');
const HC = require('../lib/ho-so/hieu-chinh.js');
const D = require('../lib/ho-so/duong-di.js');
const HS = require('../lib/ho-so/index.js');
const { docDuKien } = require('../lib/ho-so/doc-du-kien.js');
const { doiChieu } = require('../lib/ho-so/doi-chieu.js');

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${typeof x === 'string' ? x : JSON.stringify(x).slice(0, 700)}`); } };
const dung = (value, giaTri) => DK.danhGiaDieuKien({ fact: 'dungCho', op: 'CONG_DUNG', value }, { fact: 'dungCho', giaTri }).trangThai;

// ── 1. Tên ↔ mã: chỉ tên nút cây HS (nguồn đã kiểm), bảo thủ ──────────────────────────────────────────────────────────
let TM = null;
try { TM = require('../lib/ten-sang-ma.js'); } catch (e) { check('lib/ten-sang-ma.js nạp được', false, String(e.message)); }
if (TM) {
  check('1a "máy xúc" ⇒ nhóm 84.29 (tên nhóm 8429 nguyên văn)', JSON.stringify(TM.tenSangMa('máy xúc')) === '["8429"]', TM.tenSangMa('máy xúc'));
  check('1b "excavator" (tên Anh của cây, số ít) ⇒ 84.29', JSON.stringify(TM.tenSangMa('excavator')) === '["8429"]', TM.tenSangMa('excavator'));
  check('1c "máy điều hòa không khí" ⇒ 84.15', JSON.stringify(TM.tenSangMa('máy điều hòa không khí')) === '["8415"]', TM.tenSangMa('máy điều hòa không khí'));
  check('1d "xe mô tô" / "xe môtô" ⇒ chỉ mã thuộc 87.11', ['xe mô tô', 'xe môtô'].every((t) => { const r = TM.tenSangMa(t); return r.length && r.every((m) => m.startsWith('8711')); }), [TM.tenSangMa('xe mô tô'), TM.tenSangMa('xe môtô')]);
  check('1e "xe máy" ⇒ KHÔNG giải (cây/tax không có tên "xe máy" cho 87.11 — không tự chế đồng nghĩa)', TM.tenSangMa('xe máy').length === 0, TM.tenSangMa('xe máy'));
  check('1f tên quá chung ("máy") / chữ Hán / rỗng ⇒ không giải', !TM.tenSangMa('máy').length && !TM.tenSangMa('挖掘机').length && !TM.tenSangMa('').length);
  check('1g tên khớp nhiều nhóm ⇒ trả MỌI ứng viên ("xe đạp": 87.11, 87.12, 95.03)', ['8711', '8712', '9503'].every((h) => TM.tenSangMa('xe đạp').some((m) => m.startsWith(h))), TM.tenSangMa('xe đạp'));
  check('1h không lấy Chương 98 (dòng lặp cho ưu đãi riêng)', !TM.tenSangMa('trục khuỷu').some((m) => m.startsWith('98')), TM.tenSangMa('trục khuỷu'));
}

// ── 2. soMa: điều kiện dungCho viết bằng mã ↔ dữ kiện chỉ nêu tên ───────────────────────────────────────────────────────
check('2a "thuộc nhóm 84.29" ↔ "máy xúc" ⇒ THOA', dung('thuộc nhóm 84.29', 'máy xúc') === 'THOA', dung('thuộc nhóm 84.29', 'máy xúc'));
check('2b "87.11" ↔ "máy xúc" ⇒ TRAI (ứng viên duy nhất ngoài dải)', dung('87.11', 'máy xúc') === 'TRAI', dung('87.11', 'máy xúc'));
check('2c "xe thuộc nhóm 87.11" ↔ "xe mô tô" ⇒ THOA', dung('xe thuộc nhóm 87.11', 'xe mô tô') === 'THOA', dung('xe thuộc nhóm 87.11', 'xe mô tô'));
check('2d "87.11" ↔ "xe máy" ⇒ CHUA_BIET (tên không giải được ⇒ hỏi; trước: TRAI giả do lệch âm tiết)', dung('87.11', 'xe máy') === 'CHUA_BIET', dung('87.11', 'xe máy'));
const NHOM_8501 = ['84.15', '84.18', '84.50', '85.09', '85.16'];
check('2e 85011091 [84.15, 84.18, …] ↔ "máy điều hòa không khí" ⇒ THOA', dung(NHOM_8501, 'máy điều hòa không khí') === 'THOA', dung(NHOM_8501, 'máy điều hòa không khí'));
check('2f 85011091 ↔ "máy xông khí dung" (không có tên trong cây) ⇒ CHUA_BIET, không TRAI', dung(NHOM_8501, 'máy xông khí dung') === 'CHUA_BIET', dung(NHOM_8501, 'máy xông khí dung'));
check('2g tên mơ hồ: "87.01" ↔ "xe kéo" (8701 + 8716) ⇒ CHUA_BIET; "Chương 87" ↔ "xe đạp" (có 95.03) ⇒ CHUA_BIET', dung('87.01', 'xe kéo') === 'CHUA_BIET' && dung('Chương 87', 'xe đạp') === 'CHUA_BIET', [dung('87.01', 'xe kéo'), dung('Chương 87', 'xe đạp')]);
check('2h tên mơ hồ nhưng MỌI ứng viên ngoài dải ⇒ TRAI ("84.29" ↔ "xe đạp")', dung('84.29', 'xe đạp') === 'TRAI', dung('84.29', 'xe đạp'));
check('2i dữ kiện nêu mã: giữ nguyên như cũ ("Chương 87" ↔ "xe thuộc nhóm 87.11" THOA; "87.11" ↔ "87.02, 87.03 hoặc 87.11" CHUA_BIET)', dung('Chương 87', 'xe thuộc nhóm 87.11') === 'THOA' && dung('87.11', '87.02, 87.03 hoặc 87.11') === 'CHUA_BIET', [dung('Chương 87', 'xe thuộc nhóm 87.11'), dung('87.11', '87.02, 87.03 hoặc 87.11')]);
check('2j điều kiện không mã: so chữ như cũ ("điện thoại" ↔ "máy xúc" TRAI)', dung('điện thoại', 'máy xúc') === 'TRAI', dung('điện thoại', 'máy xúc'));

// ── 3. Đích lồng (#693, 848390) ────────────────────────────────────────────────────────────────────────────────────────
const CHUOI = '8483.10 dùng cho xe kéo thuộc phân nhóm 8701.91';
check('3a chuỗi đích "8483.10 dùng cho … 8701.91" thoả tiêu đề "8483.10" VÀ dòng "8701.10 hoặc 8701.91 đến 8701.95"', dung('8483.10', CHUOI) === 'THOA' && dung('xe kéo thuộc phân nhóm 8701.10 hoặc 8701.91 đến 8701.95', CHUOI) === 'THOA', [dung('8483.10', CHUOI), dung('xe kéo thuộc phân nhóm 8701.10 hoặc 8701.91 đến 8701.95', CHUOI)]);
check('3b chuỗi đích ↔ "87.11" ⇒ TRAI (mọi đích ngoài dải)', dung('87.11', CHUOI) === 'TRAI', dung('87.11', CHUOI));

const banTrungThuc = () => { const b = JSON.parse(fs.readFileSync('scripts/fixtures/ho-so/ranh-gioi-dich-long/848390.json', 'utf8')); delete b.ghiChuFixture; return b; };
const b848390 = banTrungThuc();
const st8483 = { nhom: '8483', dong8: b848390.dong8.map((d) => ({ hs: d.hs, dieuKienSo: d.dieuKienSo, ...(d.phanConLai !== undefined ? { phanConLai: d.phanConLai } : {}) })), dieuKienNut: b848390.dieuKienNut.map((d) => ({ id: d.id, dieuKienSo: d.dieuKienSo })) };
const kq = (hs, dk) => DK.doiChieuDong8(hs, Object.entries(dk).map(([fact, giaTri]) => ({ fact, giaTri, nguon: 'KHACH', trangThai: 'DA_CO' })), { soTay: st8483 }).ketQua;
{
  const f = { laBoPhan: true, dungCho: '8483.10 dùng cho phân nhóm 8701.91' };
  check('3c đủ hai đích (trục 8483.10 → xe 8701.91): .11 CO; .13, .19, .91 MAU_THUAN', kq('84839011', f) === 'CO' && ['84839013', '84839019', '84839091'].every((h) => kq(h, f) === 'MAU_THUAN'), ['84839011', '84839013', '84839019', '84839091'].map((h) => kq(h, f)));
  const g = { laBoPhan: true, dungCho: 'phân nhóm 8483.10' };
  check('3d chỉ biết đích tầng trên (bộ phận của trục 8483.10, chưa biết xe): .11/.14 THIEU, .19 THIEU — không MAU_THUAN/CO giả', ['84839011', '84839014', '84839019'].every((h) => kq(h, g) === 'THIEU'), ['84839011', '84839014', '84839019'].map((h) => kq(h, g)));
  const h = { laBoPhan: true, dungCho: 'máy kéo nông nghiệp' };
  check('3e chỉ biết đích tầng dưới ("máy kéo nông nghiệp" ⇒ 8701.91–.95): .11 THIEU (chưa biết có là bộ phận của trục 8483.10), .91 THIEU — không CO giả', kq('84839011', h) === 'THIEU' && kq('84839091', h) === 'THIEU', [kq('84839011', h), kq('84839091', h)]);
  check('3f không phải bộ phận (laBoPhan false) + "máy kéo nông nghiệp" ⇒ .91 CO, .11 MAU_THUAN', kq('84839091', { laBoPhan: false, dungCho: 'máy kéo nông nghiệp' }) === 'CO' && kq('84839011', { laBoPhan: false, dungCho: 'máy kéo nông nghiệp' }) === 'MAU_THUAN', [kq('84839091', { laBoPhan: false, dungCho: 'máy kéo nông nghiệp' }), kq('84839011', { laBoPhan: false, dungCho: 'máy kéo nông nghiệp' })]);
}
{
  let r = null;
  try { r = C.kiemRanhGioi('848390', banTrungThuc()); } catch (e) { r = { loi: [`nem:${e.message}`], canhBao: [] }; }
  const loi = r.loi || []; const cb = r.canhBao || [];
  check('3g cổng 2 tới được .11–.15 ở dạng trung thực (không cong2-dong-khong-toi-duoc)', !loi.some((l) => l.startsWith('cong2-dong-khong-toi-duoc')), loi);
  check('3h không còn điểm mù dungCho 8483901 > .11–.15 (máy ghép được chuỗi đích)', !cb.some((l) => l.startsWith('cong2-diem-mu:dungCho:8483901')), cb.filter((l) => l.startsWith('cong2-diem-mu')));
  check('3i bản trung thực: cổng 0–3 + 5 không lỗi', loi.length === 0, loi);
}

// ── 4. Đọc "dùng cho" sau một danh sách phủ định "không phải A, B, …" ─────────────────────────────────────────────────
{
  const r = TV.docGiaTri('dungCho', 'Động cơ điện xoay chiều 25 W, không phải động cơ bước, không phải động cơ hướng trục, dùng cho máy điều hòa không khí');
  check('4a "không phải A, không phải B, dùng cho X" ⇒ dungCho = X (vế "dùng cho" mở mệnh đề mới, không thuộc danh sách phủ định)', r.trangThai === 'DA_CO' && r.giaTri === 'máy điều hòa không khí', r);
  const r2 = TV.docGiaTri('dungCho', 'Động cơ điện không dùng cho máy điều hòa');
  const r3 = TV.docGiaTri('dungCho', 'Linh kiện, không phải loại dùng cho xe');
  check('4b phủ định trong CÙNG mệnh đề vẫn chặn ("không dùng cho", "không phải loại dùng cho")', r2.trangThai !== 'DA_CO' && r3.trangThai !== 'DA_CO', [r2, r3]);
}

// ── 5. BD-85-01 (85444299) ─────────────────────────────────────────────────────────────────────────────────────────────
{
  // 5a. dòng "phần còn lại có tên" (.96 "Cáp điện cách điện bằng plastic khác", phanConLai .94/.95): hàng thoả .94 thì KHÔNG
  //     thuộc .96 ⇒ phủ định .96 trên đường của .99 là CO, không MAU_THUAN.
  const dk = [
    { fact: 'tenLoai', giaTri: 'cáp điện', nguon: 'KHACH', trangThai: 'DA_CO' },
    { fact: 'chatLieu', giaTri: [{ viTri: 'CACH_DIEN', chatLieu: 'plastic' }], nguon: 'KHACH', trangThai: 'DA_CO' },
    { fact: 'duongKinhLoi', giaTri: 3, donVi: 'mm', nguon: 'KHACH', trangThai: 'DA_CO' },
  ];
  const r = DK.doiChieuDong8('85444299', dk);
  const e96 = r.duongDi.find((e) => e.nut === '85444296'); const e94 = r.duongDi.find((e) => e.nut === '85444294');
  check('5a PHAI_KHONG .96 (phần còn lại có tên, loại .94/.95) ⇒ CO khi hàng thoả .94; .94 vẫn MAU_THUAN', e96 && e96.ketQua === 'CO' && e94 && e94.ketQua === 'MAU_THUAN', { e96, e94 });
  const dk2 = [...dk.slice(0, 2), { fact: 'duongKinhLoi', giaTri: 25, donVi: 'mm', nguon: 'KHACH', trangThai: 'DA_CO' }];
  const e96b = DK.doiChieuDong8('85444299', dk2).duongDi.find((x) => x.nut === '85444296');
  check('5b hàng KHÔNG thuộc .94/.95 (lõi 25 mm) ⇒ .96 vẫn MAU_THUAN như trước', e96b && e96b.ketQua === 'MAU_THUAN', e96b);

  // 5c. phạm vi mục 854442-01 = chữ TB-TCHQ "Cáp sạc và truyền dẫn tín hiệu điện thoại … lõi … nhỏ hơn 5mm"
  const bang = HC.taiBang();
  const m01 = bang.muc.find((m) => m.id === '854442-01');
  const goc01 = { duyetBoi: 'NGUOI_DUYET', phanXu: { nguoi: 'CEO Oz', ngay: '2026-10-30', quyetDinh: 'theo thông báo phân loại (.99)', kenh: 'https://claude.ai/code/session_01EtSm51cdfav5ye3fb1Nq1q' } };
  check('5c 854442-01 giữ nguyên phanXu/duyetBoi (NGUOI_DUYET)', m01 && m01.duyetBoi === goc01.duyetBoi && JSON.stringify(m01.phanXu) === JSON.stringify(goc01.phanXu), m01 && m01.phanXu);
  check('5d bảng hiệu chỉnh vẫn hợp lệ (mọi giá trị dieuKien có trong trích TB-TCHQ)', HC.kiemBang(bang).hopLe, HC.kiemBang(bang).loi);
  const apKhi = (duKien) => { const F = DK.chuanDuKien(duKien); const ds = Array.isArray(m01.dieuKien) ? m01.dieuKien : [m01.dieuKien]; const t = ds.map((c) => DK.danhGiaTrenMap(c, F).trangThai); return t.includes('TRAI') ? false : t.every((x) => x === 'THOA') ? true : null; };
  const f = (o) => Object.entries(o).map(([fact, v]) => ({ fact, ...(typeof v === 'object' && v && !Array.isArray(v) ? v : { giaTri: v }), nguon: 'KHACH', trangThai: 'DA_CO' }));
  const tenDT = 'cáp sạc và truyền dữ liệu điện thoại';
  check('5e áp cho cáp sạc điện thoại nêu ở TÊN hàng (như thông báo), kể cả khi "dùng cho" chỉ nói điện áp', apKhi(f({ tenLoai: tenDT, dungCho: 'điện áp không quá 1000V', duongKinhLoi: { giaTri: 0.5, donVi: 'mm' } })) === true);
  check('5f áp cho "cáp sạc" + "dùng cho điện thoại" (cách viết cũ của mục)', apKhi(f({ tenLoai: 'cáp sạc', dungCho: 'điện thoại', duongKinhLoi: { giaTri: 0.5, donVi: 'mm' } })) === true);
  check('5g KHÔNG nới: cáp sạc không nói điện thoại (dùng cho máy khoan) ⇒ không áp; lõi 6 mm ⇒ không áp; cáp tín hiệu (không "cáp sạc") ⇒ không áp',
    apKhi(f({ tenLoai: 'cáp sạc', dungCho: 'máy khoan', duongKinhLoi: { giaTri: 0.5, donVi: 'mm' } })) === false
    && apKhi(f({ tenLoai: tenDT, duongKinhLoi: { giaTri: 6, donVi: 'mm' } })) === false
    && apKhi(f({ tenLoai: 'cáp truyền dữ liệu điện thoại', duongKinhLoi: { giaTri: 0.5, donVi: 'mm' } })) === false);

  // 5h. trọn hồ sơ (đường đi → đọc dữ kiện luật → đối chiếu) cho câu tự viết như BD-85-01: không còn MAU_THUAN
  const dd = D.dungDuongDi('85444299', 'NHAP');
  const moTa = 'Cáp sạc và truyền dữ liệu điện thoại, lõi đồng bọc cách điện bằng plastic, đường kính mỗi lõi 0,5 mm, hai đầu đã gắn đầu nối USB, dùng cho điện áp không quá 1000V';
  const duKien = await docDuKien({ moTa }, dd, { llm: async () => [] });
  const hoSo = await doiChieu(HS.khungHoSo(dd, { duKien, hang: { tenVi: null } }), { moTa, tinHieuDanhMuc: async () => [], tienLeMaKhac: async () => [], demKhoOz: async () => ({ tong: 0, maKhac: [] }) });
  const h01 = (hoSo.hieuChinh || []).find((x) => x.id === '854442-01');
  check('5h hồ sơ 85444299 (cáp sạc điện thoại, lõi 0,5 mm): mục 854442-01 áp, ketLuan KHÔNG MAU_THUAN', h01 && h01.apDung === true && hoSo.ketLuan.trangThai !== 'MAU_THUAN', { apDung: h01 && h01.apDung, ketLuan: hoSo.ketLuan.trangThai, mt: hoSo.duongDiPhapLy.filter((e) => e.ketQua === 'MAU_THUAN').map((e) => e.nut) });
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
