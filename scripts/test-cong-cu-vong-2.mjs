// Cổng ranh giới 6→8 số — vòng gia cố 2 (#653: vướng từ lô Claude giữ, #652). Mỗi mục kèm test đỏ trước.
// Bản nháp viết tay trên phân nhóm thật (cây + biểu thuế + nguồn nguyên văn thật), không đọc data/bench/, data/oz-export/.
import './test-isolate-data.mjs';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const C = require('../lib/ho-so/cong-ranh-gioi.js');
const ML = require('../lib/ho-so/ma-loi.js');

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${typeof x === 'string' ? x : JSON.stringify(x)}`); } };
const coLoi = (r, tien) => r.loi.some((l) => l.startsWith(tien));
const coCanh = (r, tien) => r.canhBao.some((l) => l.startsWith(tien));
const docNhap = (pn6) => JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/ho-so/ranh-gioi', `${pn6}.json`), 'utf8'));
const cli = (...a) => spawnSync(process.execPath, ['scripts/so-hoa-ranh-gioi.mjs', ...a], { encoding: 'utf8', env: process.env });

// ── 1. Bảng hiệu chỉnh tiền lệ đã có mục cho PN6 ⇒ KHÔNG DỪNG; chỉ DỪNG khi có cờ mà bảng chưa có mục ──────────────
{
  // 630790: cờ canHieuChinhTienLe, bảng data/ho-so/hieu-chinh-tien-le.json đã có mục 630790-* (#617), bản nháp xanh.
  check('1a 630790 có cờ + bảng có mục', C.canHieuChinh('630790') && C.coHieuChinh('630790'));
  const r = C.kiemRanhGioi('630790', docNhap('630790'));
  check('1b bảng có mục ⇒ không DỪNG (dung rỗng)', r.hopLe && r.dung.length === 0, r.dung);
  check('1c … chỉ còn cảnh báo thông tin can-bang-hieu-chinh-tien-le-da-co:630790', coCanh(r, 'can-bang-hieu-chinh-tien-le-da-co:630790') && !ML.laDung('can-bang-hieu-chinh-tien-le-da-co:630790'), r.canhBao);
  const k = cli('--kiem', '--pn6=630790');
  check('1d CLI --kiem 630790 mã thoát 0 (trước #653: 3 DỪNG)', k.status === 0, k.stdout.slice(-400));
  // Bảng (trong thư mục ghi của test) không có mục cho 630790 ⇒ DỪNG.
  const tep = path.join(process.env.HS_DATA_DIR, 'ho-so', 'hieu-chinh-tien-le.json');
  const that = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/ho-so/hieu-chinh-tien-le.json'), 'utf8'));
  fs.mkdirSync(path.dirname(tep), { recursive: true });
  fs.writeFileSync(tep, JSON.stringify({ ...that, muc: that.muc.filter((m) => !String(m.maHs).startsWith('630790') && !String(m.dongChuBieu || '').startsWith('630790')) }));
  try {
    const r2 = C.kiemRanhGioi('630790', docNhap('630790'));
    check('1e cờ mà bảng chưa có mục ⇒ DỪNG can-bang-hieu-chinh-tien-le:630790:chua-co', r2.dung.some((d) => d.startsWith('can-bang-hieu-chinh-tien-le:630790:chua-co')), r2.dung);
    const k2 = cli('--kiem', '--pn6=630790');
    check('1f CLI --kiem mã thoát 3 khi bảng chưa có mục', k2.status === 3, k2.status);
  } finally { fs.rmSync(tep, { force: true }); }
  const g = cli('--giai-thich=can-bang-hieu-chinh-tien-le:630790:chua-co (L1-4b)');
  check('1g --giai-thich chua-co: nói bảng CHƯA CÓ MỤC cho PN6 (không còn "chưa có bảng hiệu chỉnh")', g.status === 0 && /chưa có mục/i.test(g.stdout) && !/khi chưa có bảng hiệu chỉnh/.test(g.stdout), g.stdout);
  const g2 = cli('--giai-thich=can-bang-hieu-chinh-tien-le-da-co:630790');
  check('1h --giai-thich da-co: không DỪNG, nói bảng đã có mục', g2.status === 0 && /đã có mục/i.test(g2.stdout) && !/DỪNG/.test(g2.stdout), g2.stdout);
  check('1i gói soạn ghi coHieuChinhTienLe (CLI --goi không còn in "DỪNG, Claude giữ" khi bảng đã có mục)', C.goiSoan('630790').coHieuChinhTienLe === true && !/DỪNG, Claude giữ/.test(cli('--goi', '--pn6=630790').stdout));
}

// ── Dựng bản nháp từ bản đã commit, thay điều kiện theo mã (không ghi đè tệp thật) ─────────────────────────────────────
const DK = require('../lib/dieu-kien-so.js');
function suaNhap(pn6, dk = {}) {
  const b = JSON.parse(JSON.stringify(docNhap(pn6)));
  b.trangThai = 'NHAP'; b.duyet = null;
  for (const m of [...b.dong8, ...(b.dieuKienNut || [])]) { m.nguonLoai = 'AI_DA_KIEM'; const v = dk[m.hs || m.id]; if (v === undefined) continue; if (Array.isArray(v)) m.dieuKienSo = v; else Object.assign(m, v); }
  return b;
}
const TEN = (v) => ({ fact: 'tenLoai', op: 'TEN_LOAI', value: v });
const KDC = (v) => ({ fact: 'kieuDongCoDien', op: 'TRONG', value: v });

// ── 2. LIET_KE: ứng viên "không thuộc giá trị nào đã liệt kê" — dòng dưới "Loại khác" tới được ─────────────────────────
{
  // 850110 (#652): tiêu đề "Động cơ bước" + dòng "Động cơ hướng trục" bằng khoá liệt kê kieuDongCoDien; tiêu đề 8501104/8501109
  // "Loại khác" phủ định cả hai ⇒ cần vector kieuDongCoDien ∉ {BUOC, HUONG_TRUC}.
  const b = suaNhap('850110', { 8501102: [KDC(['BUOC'])], 8501105: [KDC(['BUOC'])], 85011030: [KDC(['HUONG_TRUC'])], 85011060: [KDC(['HUONG_TRUC'])] });
  const r = C.kiemRanhGioi('850110', b);
  check('2a không lỗi cổng 3 trên khoá liệt kê (trích có cách đọc)', !r.loi.some((l) => l.startsWith('cong3-')), r.loi);
  check('2b dòng dưới tiêu đề "Loại khác" (.41/.49) tới được — không còn cong2-dong-khong-toi-duoc', !coLoi(r, 'cong2-dong-khong-toi-duoc:85011041') && !coLoi(r, 'cong2-dong-khong-toi-duoc:85011049'), r.loi);
  check('2c ứng viên ngoài liệt kê TRÁI mọi điều kiện TRONG (tất định), chỉ dùng trong cổng', DK.NGOAI_LIET_KE && DK.danhGiaDieuKien(KDC(['BUOC', 'HUONG_TRUC']), { fact: 'kieuDongCoDien', giaTri: DK.NGOAI_LIET_KE }).trangThai === 'TRAI'
    && DK.danhGiaDieuKien({ ...KDC(['BUOC']), chieu: 'PHAI_KHONG' }, { fact: 'kieuDongCoDien', giaTri: DK.NGOAI_LIET_KE }).trangThai === 'THOA');
  check('2d dữ kiện thật (runtime) không bao giờ mang giá trị ngoài liệt kê: kiemDieuKien từ chối giá trị đó trong điều kiện', DK.kiemDieuKien(KDC([DK.NGOAI_LIET_KE]), 'Động cơ bước') !== null);
}

// ── 3. phanConLai đứng một mình: phần còn lại có tên mà nội dung chỉ là "các loại khác" (không điều kiện khẳng định) ──────
const S = require('../lib/so-tay.js');
{
  // 850110 r14839 "Động cơ khác, kể cả động cơ vạn năng…": nội dung thật = phủ định tầng "Động cơ một chiều" (r14830).
  const LIET = { 8501102: [KDC(['BUOC'])], 8501105: [KDC(['BUOC'])], 85011030: [KDC(['HUONG_TRUC'])], 85011060: [KDC(['HUONG_TRUC'])] };
  const b = suaNhap('850110', { ...LIET, '850110~r14839': { dieuKienSo: [], phanConLai: true } });
  const r = C.kiemRanhGioi('850110', b);
  check('3a phanConLai + dieuKienSo rỗng ⇒ cổng 1 KHÔNG coi tầng chưa số hoá', !r.loi.some((l) => l.includes('850110~r14839')), r.loi);
  check('3b … 850110 (khoá liệt kê + phần còn lại đứng một mình) hết lỗi cổng (chỉ còn DỪNG do người soạn khai)', r.hopLe === true, r.loi);
  const dd = DK.duongDiDong8('85011099', { soTay: C.soTayTuNhap('850110', b) });
  check('3c luật đi .99: không nhóm PHAI_CO cho r14839, có PHAI_KHONG r14830', !dd.nhom.some((g) => g.nut === '850110~r14839') && dd.nhom.some((g) => g.nut === '850110~r14830' && g.chieu === 'PHAI_KHONG' && g.dieuKien), dd.nhom);
  const b2 = suaNhap('850110', { ...LIET, '850110~r14839': { dieuKienSo: [], phanConLai: undefined } });
  check('3d không phanConLai + điều kiện rỗng ⇒ vẫn cong1-chua-so-hoa (không đổi)', C.kiemRanhGioi('850110', b2).loi.some((l) => l.startsWith('cong1-chua-so-hoa:') && l.endsWith(':850110~r14839')));
  const b3 = suaNhap('850110', { ...LIET, 8501102: { dieuKienSo: [], phanConLai: ['850110~r14830'] } });
  check('3e phanConLai đứng một mình vẫn qua kiểm "anh em" + chữ "khác" của cổng 0/3', C.kiemRanhGioi('850110', b3).loi.some((l) => l.startsWith('cong0-phan-con-lai-sai-anh-em:8501102') || l.startsWith('cong3-phan-con-lai-khong-co-chu-khac:8501102')));
  let moi = null; let nem = null;
  try { moi = C.apDung(C.duyet(b, { phien: 'https://claude.ai/code/session_TEST#soat-vong2', ngay: '2026-10-31' }), JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/so-tay/8501.json'), 'utf8'))); } catch (e) { nem = e.message; }
  const nut = moi?.dieuKienNut?.find((x) => x.id === '850110~r14839');
  check('3f duyệt + áp vào sổ tay: mục tầng mang phanConLai, dieuKienSo rỗng, qua checkItem', nut?.phanConLai === true && Array.isArray(nut.dieuKienSo) && !nut.dieuKienSo.length, nem || nut);
  check('3g sổ tay đã áp: luật đi .99 không CHUA_SO_HOA ở r14839', moi && !DK.duongDiDong8('85011099', { soTay: moi }).nhom.some((g) => g.nut === '850110~r14839' && !g.dieuKien), nem);
  check('3h checkItem dieuKienNut không điều kiện, không phanConLai ⇒ vẫn dieu-kien-nut-thieu-dieu-kien', S.checkItem('dieuKienNut', { ...nut, phanConLai: undefined }, { ...S.sourcesFor('8501'), ...S.nguonTieuDe('8501') }, '8501') === 'dieu-kien-nut-thieu-dieu-kien');
}

// ── 6. phanConLai: false — ghi rõ "không phải phần còn lại" để tắt cảnh báo nghi-phan-con-lai ──────────────────────────
{
  // 950300 .30 "Xe điện, kể cả đường ray, đèn hiệu và các phụ kiện khác của chúng": "khác" không trỏ anh em đứng trước.
  const b = suaNhap('950300', { 95030030: { phanConLai: false } });
  const r = C.kiemRanhGioi('950300', b);
  check('6a phanConLai:false được cổng 0 nhận (không cong0-phan-con-lai-*)', !r.loi.some((l) => l.startsWith('cong0-phan-con-lai') && l.includes('95030030')), r.loi);
  check('6b … tắt cảnh báo nghi-phan-con-lai:95030030, không lỗi chữ "khác"', !coCanh(r, 'nghi-phan-con-lai:95030030') && !coLoi(r, 'cong3-phan-con-lai-khong-co-chu-khac:95030030'), r.canhBao);
  const dd = DK.duongDiDong8('95030030', { soTay: C.soTayTuNhap('950300', b) });
  check('6c luật đi như không ghi (không phủ định anh em)', !dd.nhom.some((g) => g.chieu === 'PHAI_KHONG'), dd.nhom);
  check('6d băm đổi khi thêm phanConLai:false (thuộc nội dung)', C.bamRanhGioi(b) !== C.bamRanhGioi(suaNhap('950300')));
  const b2 = suaNhap('950300', { 95030099: { phanConLai: false } });
  check('6e phanConLai:false trên dòng "Loại khác" ⇒ vẫn cong0-phan-con-lai-thua', coLoi(C.kiemRanhGioi('950300', b2), 'cong0-phan-con-lai-thua:95030099'));
}

// ── 4. tenCuTheHon khi bên CHUNG còn giới hạn ở khoá khác (8409.91 "Bạc piston" ⊃ "Piston" + đường kính) ─────────────────
const SO = (fact, op, value, donVi) => ({ fact, op, value, donVi });
const DUNG = (v) => ({ fact: 'dungCho', op: 'CONG_DUNG', value: v });
{
  const F = (o) => DK.chuanDuKien(Object.entries(o).map(([fact, v]) => ({ fact, ...(typeof v === 'object' ? v : { giaTri: v }), nguon: 'KHACH', trangThai: 'DA_CO' })));
  const piston = [TEN('Piston'), SO('duongKinh', '>=', 50, 'mm'), SO('duongKinh', '<=', 155, 'mm'), DUNG(['84.29', '84.30'])];
  const bac = [TEN(['Bạc piston', 'chốt piston']), DUNG(['84.29', '84.30'])];
  const f1 = F({ tenLoai: 'Bạc piston', duongKinh: { giaTri: 50, donVi: 'mm' }, dungCho: '84.29' });
  check('4a "Bạc piston" (tên chứa trọn "Piston") thắng dòng "Piston" + giới hạn đường kính (khoá số, không phải trục tên khác)', DK.tenCuTheHon(piston, bac, f1) === -1 && DK.tenCuTheHon(bac, piston, f1) === 1);
  // 853669: bên chung (tiêu đề "Đầu cắm và phích cắm cho cáp đồng trục và mạch in") giới hạn theo khoá chữ tự do dungCho —
  // trục khác (nơi lắp), chữ biểu không loại trừ ⇒ vẫn không phân (chongLanVanBan đã khai, bản DUYET phải giữ xanh).
  const dauCam = [TEN(['Đầu cắm', 'phích cắm']), DUNG(['cáp đồng trục', 'mạch in']), SO('dongDien', '<', 16, 'A')];
  const phichDT = [TEN('Phích cắm điện thoại')];
  const f2 = F({ tenLoai: 'Phích cắm điện thoại', dungCho: 'mạch in', dongDien: { giaTri: 10, donVi: 'A' } });
  check('4b bên chung giới hạn bằng khoá chữ tự do (dungCho) ⇒ vẫn 0 (853669 không đổi)', DK.tenCuTheHon(dauCam, phichDT, f2) === 0 && DK.tenCuTheHon(phichDT, dauCam, f2) === 0);
  // Tên không chứa trọn ⇒ không phân dù khoá số.
  const f3 = F({ tenLoai: 'Piston chốt', duongKinh: { giaTri: 50, donVi: 'mm' }, dungCho: '84.29' });
  check('4c không có quan hệ chứa trọn giữa hai tên khớp ⇒ 0', DK.tenCuTheHon(piston, [TEN('chốt piston'), DUNG(['84.29', '84.30'])], F({ tenLoai: 'Bạc', duongKinh: { giaTri: 50, donVi: 'mm' }, dungCho: '84.29' })) === 0 && f3.size === 3);
  // Bên CỤ THỂ cũng giới hạn cùng khoá số mà rời nhau ⇒ hai dòng không cùng CO; tenCuTheHon không cần phân. Bên cụ thể có
  // giới hạn số khác bên chung (cùng khoá) ⇒ khoá không phải "thêm" của riêng bên chung ⇒ như trước (đã thử bằng vector).
  const bacD = [TEN('Bạc piston'), SO('duongKinh', '<', 50, 'mm'), DUNG(['84.29', '84.30'])];
  check('4d bên cụ thể cũng giới hạn cùng khoá số ⇒ tên vẫn phân như trước (-1)', DK.tenCuTheHon(piston, bacD, F({ tenLoai: 'Bạc piston', duongKinh: { giaTri: 50, donVi: 'mm' }, dungCho: '84.29' })) === -1);
  // Cổng 2 trên bản nháp rút gọn của 840991 (chỉ tiêu đề 8409911 + .16/.17/.18 có điều kiện — rẻ).
  const b = suaNhap('840991');
  const giu = new Set(['8409911', '84099116', '84099117', '84099118']);
  for (const m of [...b.dong8, ...b.dieuKienNut]) if (!giu.has(m.hs || m.id)) { m.dieuKienSo = []; delete m.phanConLai; }
  const r = C.kiemRanhGioi('840991', b);
  check('4e cổng 2: .16 "Piston … 50–155 mm" + .18 "Bạc piston và chốt piston" không còn chồng lấn', !coLoi(r, 'cong2-chong-lan:84099116+84099118'), r.loi.filter((l) => l.startsWith('cong2')));
}

// ── 5. Bộ so âm tiết giữ nghĩa "dùng cho" (8523.51: "dùng cho điện ảnh" ≠ nằm trong "chứa phim điện ảnh") ─────────────────
{
  const CD = (v) => ({ fact: 'congDung', op: 'CONG_DUNG', value: v });
  const dg = (cond, gt) => DK.danhGiaDieuKien(CD(cond), { fact: 'congDung', giaTri: gt }).trangThai;
  check('5a "dùng cho điện ảnh" KHÔNG thoả bởi "chứa phim điện ảnh" (trước #653: THOA)', dg('dùng cho điện ảnh', 'chứa phim điện ảnh') === 'TRAI', dg('dùng cho điện ảnh', 'chứa phim điện ảnh'));
  check('5b "dùng cho điện ảnh" thoả bởi "băng từ dùng cho điện ảnh" và chính nó', dg('dùng cho điện ảnh', 'băng từ dùng cho điện ảnh') === 'THOA' && dg('dùng cho điện ảnh', 'dùng cho điện ảnh') === 'THOA');
  check('5c "sử dụng cho" cùng nghĩa "dùng cho"', dg('dùng cho điện ảnh', 'loại sử dụng cho điện ảnh') === 'THOA');
  check('5d dữ kiện chung hơn ("điện ảnh") ⇒ CHUA_BIET, không TRÁI', dg('dùng cho điện ảnh', 'điện ảnh') === 'CHUA_BIET');
  check('5e "cho" đứng một mình vẫn là hư từ (không đổi): "cho động cơ máy thủy" thoả bởi "động cơ máy thủy"', dg('cho động cơ máy thủy', 'động cơ máy thủy') === 'THOA');
  // Cổng: .91 congDung "chứa phim điện ảnh" và .92 congDung "dùng cho điện ảnh" (cùng khoá) — .91 phải tới được.
  const b = suaNhap('852351', { 85235192: [CD('dùng cho điện ảnh')] });
  const r = C.kiemRanhGioi('852351', b);
  check('5f 852351 cùng khoá congDung: .91/.92 đều tới được, không chồng lấn', !coLoi(r, 'cong2-dong-khong-toi-duoc:85235191') && !coLoi(r, 'cong2-dong-khong-toi-duoc:85235192') && !coLoi(r, 'cong2-chong-lan:85235191+85235192'), r.loi);
}

// ── 7. Cổng 2: điểm mù cha–con cùng khoá chữ tự do (ứng viên ghép); giới hạn tổ hợp (nâng + lấy mẫu tất định) ─────────────
{
  // 950300: tiêu đề 9503002 "Búp bê" (tenLoai) và dòng con .22 "Quần áo …" (tenLoai) — một vector chỉ mang một giá trị
  // tenLoai ⇒ trước #653 .22 không bao giờ tới được (cong2-dong-khong-toi-duoc + cong2-diem-mu).
  const r = C.kiemRanhGioi('950300', docNhap('950300'));
  check('7a 950300 .22 tới được nhờ ứng viên ghép cha–con (không còn cong2-dong-khong-toi-duoc:95030022)', !coLoi(r, 'cong2-dong-khong-toi-duoc:95030022'), r.loi);
  check('7b … không còn cảnh báo điểm mù cho cặp đã ghép', !coCanh(r, 'cong2-diem-mu:tenLoai:9503002>95030022'), r.canhBao);
  // 854442: cặp .32/.33/.34/.39 × .94/.95/.96 có 58.320 tổ hợp — trước #653 vượt giới hạn 20.000 (DỪNG).
  check('7c giới hạn tổ hợp vét cạn ≥ 58.320 (8544.42)', C.GIOI_HAN_TO_HOP >= 58320, C.GIOI_HAN_TO_HOP);
  const b = docNhap('854442');
  const m1 = C.kiemRanhGioi('854442', b, { gioiHanToHop: 2000 });
  const m2 = C.kiemRanhGioi('854442', b, { gioiHanToHop: 2000 });
  check('7d vượt giới hạn ⇒ lấy mẫu (không còn lỗi cong2-qua-nhieu-to-hop), thongKe.layMau = true + cảnh báo cong2-lay-mau', !coLoi(m1, 'cong2-qua-nhieu-to-hop') && m1.thongKe.layMau === true && coCanh(m1, 'cong2-lay-mau:85444232+85444294:'), { loi: m1.loi.filter((l) => /to-hop/.test(l)), tk: m1.thongKe });
  check('7e lấy mẫu tất định (hai lần chạy giống hệt)', JSON.stringify(m1) === JSON.stringify(m2));
  check('7f cảnh báo lấy mẫu không phải DỪNG', !ML.laDung('cong2-lay-mau:85444232+85444294:2000/58320') && !m1.dung.some((d) => d.startsWith('cong2-lay-mau')));
  const tk = C.kiemRanhGioi('830220', docNhap('830220')).thongKe;
  check('7g bản không vượt giới hạn: thongKe.layMau = false', tk.layMau === false, tk);
}

// ── 7 (tiếp). Ghép không thoả được ⇒ vẫn báo; tên trên đường đi là HỢP các giá trị khớp của cùng khoá ─────────────────────
{
  // 401699 .17 đổi dungCho thành "nhóm 88.04" (khác nhánh "Chương 87"): không giá trị ghép nào thoả cả hai ⇒ vẫn lỗi + điểm mù.
  const b = suaNhap('401699');
  const m = b.dong8.find((x) => x.hs === '40169917'); m.dieuKienSo = m.dieuKienSo.map((c) => (c.fact === 'dungCho' ? { ...c, value: 'nhóm 88.04' } : c));
  const r = C.kiemRanhGioi('401699', b);
  check('7i ghép không thoả được (mã HS khác nhánh) ⇒ vẫn cong2-dong-khong-toi-duoc + cong2-diem-mu', coLoi(r, 'cong2-dong-khong-toi-duoc:40169917') && coCanh(r, 'cong2-diem-mu:dungCho:4016991>40169917'), r.canhBao.filter((c) => c.startsWith('cong2-diem')));
  // 950300: vector ghép "Quần áo Búp bê" thoả .21 "Búp bê" lẫn .22 (tiêu đề "Búp bê" + "Quần áo") — đường của .22 khớp HỢP
  // {quần, áo, búp, bê} ⊃ {búp, bê} của .21 ⇒ tên cụ thể hơn thắng, không phải chồng lấn (quần áo búp bê là .22).
  const r2 = C.kiemRanhGioi('950300', docNhap('950300'));
  check('7h 950300: vector ghép không tạo chồng lấn giả .21+.22', !coLoi(r2, 'cong2-chong-lan:95030021+95030022'), r2.loi.filter((l) => l.startsWith('cong2')));
  const F = DK.chuanDuKien([{ fact: 'tenLoai', giaTri: 'Quần áo Búp bê', nguon: 'KHACH', trangThai: 'DA_CO' }]);
  check('7j tenCuTheHon gộp các điều kiện cùng khoá trên đường đi (VÀ) thành hợp âm tiết', DK.tenCuTheHon([TEN('Búp bê'), TEN(['Quần áo', 'mũ'])], [TEN('Búp bê'), TEN('Búp bê')], F) === 1);
}

console.log(`\n${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
