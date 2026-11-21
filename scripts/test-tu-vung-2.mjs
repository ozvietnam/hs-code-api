#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * tu-vung@2 (#577 L1-3a, đề xuất docs/giao-viec/so-tay/de-xuat-tu-vung-2.md) — siêu tập của tu-vung@1.
 *
 * Kiểm:
 *  1. Nạp: runtime/công cụ mặc định tu-vung@2; tu-vung@1 vẫn nạp được theo tên (bench lát 1 khoá băm theo @1, sha256 không đổi).
 *  2. Siêu tập: mọi khoá @1 GIỐNG HỆT trong @2 (kiemSieuTap), danh sách chung của @1 là tiền tố của @2.
 *  3. Hai luật bộ đọc #667/#675 đã chuyển vào dữ liệu (khongPhaiPhuDinh, cauTrucCo) và xoá khỏi mã — cách đọc 53 khoá @1 KHÔNG
 *     đổi: vân tay đọc ghi bằng mã TRƯỚC khi đổi (scripts/fixtures/tu-vung/vang-doc-tu-vung-1.json) phải khớp.
 *  4. Bộ đọc từng khoá mới: khẳng định / giá trị KHÔNG / phủ định (Vi), En, Zh.
 *  5. Câu hỏi Vi + Zh; bảng hiệu chỉnh tiền lệ 853710-01/02/03 hỏi daNapChuongTrinh; gói soạn ranh giới không còn "nghi thiếu khoá"
 *     cho ý đã có khoá.
 * Không gọi mạng/LLM, không ghi data/, không mở bộ đề lát 1 (data/bench/ho-so-lat-1*).
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { boChu, vanTay, TEP_VANG } from './vang-doc-tu-vung-1.mjs';
const require = createRequire(import.meta.url);
const T = require('../lib/tu-vung.js');

let pass = 0; let fail = 0;
const check = (n, c, d) => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n}`, d === undefined ? '' : JSON.stringify(d).slice(0, 700)); } };
const coTrong = (r, text) => typeof r?.bangChung === 'string' && r.bangChung.length > 0 && text.normalize('NFC').includes(r.bangChung);
const CJK = /[㐀-鿿]/u;
const clone = (x) => JSON.parse(JSON.stringify(x));
// 7 khoá #570 + phuongThucTruyenDan (#606 — 851762 "truyền dẫn dưới dạng sóng vô tuyến", định ngữ chung của điện báo/điện thoại)
// + daXuLyBeMat, nhienLieu (#577 — 848180 .97 "đã được xử lý bề mặt", .30 "bếp nấu hoặc bếp có lò nướng bằng ga")
// + 4 khoá lát 2 (02/11, de-xuat-khoa-lat-2.md quét + studio-loop, GĐ duyệt): phuongPhapIn (5208.59.10/6204 "in batik truyền thống"),
//   tinhDanHoi (6006.x.10 "Đàn hồi (kết hợp với sợi cao su)", 6001.92.30), loaiSoiDet (6306 "Từ bông", 5515.99.10), doDay (7308.30.10).
const KHOA_MOI = {
  aoBarongTagalog: 'CO_KHONG',
  aoChoangHanhHuongIhram: 'CO_KHONG',
  apSuat: 'SO',
  banKinhGiaCongTien: 'SO',
  banLeMocKhoaHasps: 'CO_KHONG',
  bangFluoropolyme: 'CO_KHONG',
  banhCoBot: 'CO_KHONG',
  baoQuanBangKhiSunphuro: 'CO_KHONG',
  bienApThichUng: 'CO_KHONG',
  boPhanGiayDep: 'LIET_KE',
  boPhanThitGiaCam: 'LIET_KE',
  bonBanhChuDong: 'CO_KHONG',
  caBot: 'CO_KHONG',
  canDienTu: 'CO_KHONG',
  canhKhongNhoHonThan: 'CO_KHONG',
  chatNgamTamTrangPhu: 'LIET_KE',
  chiCoRanhTieng: 'CO_KHONG',
  chiDungNguonDienNgoai: 'CO_KHONG',
  chiHoacChuYeu: 'CO_KHONG',
  chiSoIot: 'SO',
  chieuDai: 'SO',
  chieuKiaTo: 'SO',
  chieuRong: 'SO',
  choDienThoaiHuuTuyen: 'CO_KHONG',
  chuaCaCao: 'CO_KHONG',
  chuaChatBeoThucVat: 'CO_KHONG',
  chuaChatDietCongTrung: 'CO_KHONG',
  chuaChatTruNam: 'CO_KHONG',
  chuaCon: 'CO_KHONG',
  chuaDauDauMo: 'CO_KHONG',
  chuaDauSilicon: 'CO_KHONG',
  chuaDuong: 'CO_KHONG',
  chuaGiaCongQuaMucCanNong: 'CO_KHONG',
  chuaKimLoaiQuyKhac: 'CO_KHONG',
  chuaNguyenLieuThayThe: 'LIET_KE',
  chuaPenicillin: 'CO_KHONG',
  chuaPhimDienAnh: 'CO_KHONG',
  chuaQuaSuDung: 'CO_KHONG',
  chuaSua: 'CO_KHONG',
  chuoiMuiKhongQua3175: 'CO_KHONG',
  coBoLoc: 'CO_KHONG',
  coBoPhanLamLanh: 'CO_KHONG',
  coChoi: 'CO_KHONG',
  coDongCoDay: 'CO_KHONG',
  coGanVoi: 'CO_KHONG',
  coGelatin: 'CO_KHONG',
  coHuongLieu: 'CO_KHONG',
  coLoDuc: 'CO_KHONG',
  coMauTruTrang: 'CO_KHONG',
  coMucIn: 'CO_KHONG',
  coNong: 'SO',
  coPhaChi: 'CO_KHONG',
  coRe: 'CO_KHONG',
  coRen: 'CO_KHONG',
  coTheNapLai: 'CO_KHONG',
  coVanDaoChieu: 'CO_KHONG',
  coXuong: 'CO_KHONG',
  conVo: 'CO_KHONG',
  congNgheIn: 'LIET_KE',
  congSuatBieuKien: 'SO',
  congSuatKhoiLuongGio: 'SO',
  daBoSungIot: 'CO_KHONG',
  daCatThanhHinh: 'CO_KHONG',
  daChan: 'CO_KHONG',
  daChatManh: 'CO_KHONG',
  daDongBanh: 'CO_KHONG',
  daGap: 'CO_KHONG',
  daGiaCong: 'CO_KHONG',
  daHoaDeo: 'CO_KHONG',
  daIn: 'CO_KHONG',
  daLamNhay: 'CO_KHONG',
  daLapRap: 'CO_KHONG',
  daLenMen: 'CO_KHONG',
  daNapChuongTrinh: 'CO_KHONG',
  daNung: 'CO_KHONG',
  daPha: 'CO_KHONG',
  daPhaHuongLieuHoacChatMau: 'CO_KHONG',
  daPhaThemDuongHoacRuou: 'CO_KHONG',
  daPhu: 'CO_KHONG',
  daRang: 'CO_KHONG',
  daSon: 'CO_KHONG',
  daThemHuongLieuHoaQuaHatHoacCaCao: 'CO_KHONG',
  daTietTrung: 'CO_KHONG',
  daTrangMen: 'CO_KHONG',
  daTrangPhuEpLop: 'CO_KHONG',
  daXay: 'CO_KHONG',
  daXoan: 'CO_KHONG',
  daXuLyBeMat: 'CO_KHONG',
  daXuLyHoaHoc: 'CO_KHONG',
  dangBaoCheThuoc: 'LIET_KE',
  dangBinhXit: 'CO_KHONG',
  dangBot: 'CO_KHONG',
  dangChePhamDietMuoi: 'LIET_KE',
  dangCuon: 'CO_KHONG',
  dangDaiCuonHoacTo: 'CO_KHONG',
  dangDaiDaiTamPhoDung: 'LIET_KE',
  dangKhoiHoacTamDa: 'LIET_KE',
  dangLong: 'CO_KHONG',
  dangLongHoacNhao: 'CO_KHONG',
  dangLuonSong: 'CO_KHONG',
  dangNguyenSinh: 'LIET_KE',
  dangTamPhienMang: 'LIET_KE',
  dangToChuNhat: 'CO_KHONG',
  dayTetBen: 'CO_KHONG',
  deCanLai: 'CO_KHONG',
  denChoPhongMo: 'CO_KHONG',
  detKimHoacMoc: 'CO_KHONG',
  dienTichBeMat: 'SO',
  dieuKhienSo: 'CO_KHONG',
  dinhLuong: 'SO',
  doBenKeo: 'SO',
  doBenUot: 'SO',
  doChopChay: 'SO',
  doDay: 'SO',
  doManh: 'SO',
  doTinhKhiet: 'SO',
  doTruongNoBloom: 'SO',
  doXop: 'SO',
  donNgucSauPhauThuat: 'CO_KHONG',
  dongBaoBiKinKhiDeBanLe: 'CO_KHONG',
  dongGoiBanLe: 'CO_KHONG',
  dungChoDienAnh: 'CO_KHONG',
  dungChoXeCoDongCo: 'CO_KHONG',
  dungDongCo: 'CO_KHONG',
  dungLamGiong: 'CO_KHONG',
  dungLuong: 'SO',
  dungMotLan: 'CO_KHONG',
  dungNgayDuoc: 'CO_KHONG',
  dungSanXuatOngChanKhong: 'CO_KHONG',
  dungTich: 'SO',
  dungTrongNhaKhoa: 'CO_KHONG',
  dungTrongNongNghiep: 'CO_KHONG',
  dungTrongYTeHoacThiNghiem: 'CO_KHONG',
  duocLotHoacCachNhiet: 'CO_KHONG',
  duongCheoNgoai: 'SO',
  duongKinhVanh: 'SO',
  ganNapDemKin: 'CO_KHONG',
  ganThietBiCoKhiHoacGiaNhiet: 'CO_KHONG',
  ghiMaNhiPhanTuongTac: 'CO_KHONG',
  giaCongHonBeMat: 'CO_KHONG',
  giaiDoanThuocDa: 'LIET_KE',
  giayDauVatCuTa: 'CO_KHONG',
  gioiHanChay: 'SO',
  goLaKim: 'CO_KHONG',
  hamLuongAmoniacTheTich: 'SO',
  hamLuongCaCaoKhuBeo: 'SO',
  hamLuongCaCl2: 'SO',
  hamLuongCarbon: 'SO',
  hamLuongCauTuThom: 'SO',
  hamLuongCrom: 'SO',
  hamLuongDauDauMo: 'SO',
  hamLuongEsteMetyl: 'SO',
  hamLuongH2SO4: 'SO',
  hamLuongLuuHuynh: 'SO',
  hamLuongMangan: 'SO',
  hamLuongMonomerAlphaOlefin: 'SO',
  hamLuongNatriClorua: 'SO',
  hamLuongNiken: 'SO',
  hamLuongPhotpho: 'SO',
  hamLuongProtein: 'SO',
  hamLuongSoiDanHoi: 'SO',
  hamLuongValidamycin: 'SO',
  heDienHoa: 'LIET_KE',
  hinhDangCatGocKinh: 'CO_KHONG',
  hinhDangMatCatNgang: 'LIET_KE',
  hinhNonCut: 'CO_KHONG',
  hoatDongBangDongXu: 'CO_KHONG',
  honHopHfc: 'LIET_KE',
  honHopHoaChatVoiThucPham: 'CO_KHONG',
  hopDungThuocLaDieu: 'CO_KHONG',
  hopDungThuocLaTrangTri: 'CO_KHONG',
  hopKimNhom: 'LIET_KE',
  huongTrucBom: 'LIET_KE',
  khaNangChiuApLuc: 'SO',
  khoiLuongToanBo: 'SO',
  kichThuocMatCatNgang: 'SO',
  kieuChieuSangDen: 'LIET_KE',
  kieuDet: 'LIET_KE',
  kieuHutBom: 'LIET_KE',
  kieuTruyenDong: 'LIET_KE',
  kieuXeChoHang: 'LIET_KE',
  kieuXeChoNguoi: 'LIET_KE',
  kimLoaiCoBanKhac: 'LIET_KE',
  laChe: 'CO_KHONG',
  laMayPhatDien: 'CO_KHONG',
  laOtoVan: 'CO_KHONG',
  laPhanDoan: 'CO_KHONG',
  laPhapDinh: 'CO_KHONG',
  laXeGolfVaTuongTu: 'CO_KHONG',
  lamTuPVC: 'CO_KHONG',
  lapRapBangKhopNoi: 'CO_KHONG',
  loaiBienDoiTinhDien: 'LIET_KE',
  loaiBoPhanDongCoPiston: 'LIET_KE',
  loaiCaoSu: 'LIET_KE',
  loaiCung: 'CO_KHONG',
  loaiDoChoi: 'LIET_KE',
  loaiDoDungGiaDinhSatThep: 'LIET_KE',
  loaiHangDanLat: 'LIET_KE',
  loaiMiBunMien: 'LIET_KE',
  loaiMuiBaoVe: 'LIET_KE',
  loaiNoiThatYTe: 'LIET_KE',
  loaiNuocXotGiaVi: 'LIET_KE',
  loaiPhaChe: 'LIET_KE',
  loaiPin: 'LIET_KE',
  loaiSanPhamXiMangSoi: 'LIET_KE',
  loaiSoiDet: 'LIET_KE',
  loaiThietBiBaoDong: 'LIET_KE',
  loaiThuocLaNguyenLieu: 'LIET_KE',
  loaiXachTay: 'CO_KHONG',
  lopMaPhu: 'LIET_KE',
  lotLopNhom: 'CO_KHONG',
  mangTheoNguoi: 'CO_KHONG',
  mayKeoNongNghiep: 'CO_KHONG',
  mayRenKhuonHoacDapKhuon: 'CO_KHONG',
  moiTruongPhanTan: 'LIET_KE',
  moiTruongSongCuaCa: 'LIET_KE',
  motChieuTo: 'SO',
  mucDoGiaCongGo: 'LIET_KE',
  mucDoTinhCheDau: 'LIET_KE',
  moDunDanHoi: "SO",
  ngamQuaThauKinhSLR: 'CO_KHONG',
  nguonGocSinhVat: 'LIET_KE',
  nguyenLieuLuyen: 'LIET_KE',
  nguyenLyXuLy: 'LIET_KE',
  nhienLieu: 'LIET_KE',
  nhietDoChiuNhiet: 'SO',
  nhieuLop: 'CO_KHONG',
  nongDoCon: 'SO',
  ongChiuApLucCao: 'CO_KHONG',
  ongHutXaBunKhaiThacMo: 'CO_KHONG',
  ongVaPhuKienKimLoaiMau: 'CO_KHONG',
  phaCheVoiEthanol: 'CO_KHONG',
  phoiDetDangPhien: 'CO_KHONG',
  phuCaHaiMat: 'CO_KHONG',
  phuMangPlasticTrongSuot: 'CO_KHONG',
  phuongPhapBaoQuan: 'LIET_KE',
  phuongPhapCheTao: 'LIET_KE',
  phuongPhapHanOngThep: 'LIET_KE',
  phuongPhapIn: 'LIET_KE',
  phuongThucTruyenDan: 'LIET_KE',
  quanAoDauKiemDauVat: 'CO_KHONG',
  sanLuongHoi: 'SO',
  sanPhamDinhDuongYTe: 'CO_KHONG',
  sarongHinhOng: 'CO_KHONG',
  soCheTom: 'LIET_KE',
  soDuongTinHieuDauVao: 'SO',
  soLoi: 'SO',
  soLoaiVitamin: 'SO',
  soNguyenToCauThanhPhanBon: 'LIET_KE',
  soSoi: 'SO',
  soTangBom: 'LIET_KE',
  soiChiemTiLeLonHon: 'LIET_KE',
  soiDun: 'CO_KHONG',
  sonChongHaHoacChongAnMonVoTau: 'CO_KHONG',
  tachXuongCoHoc: 'CO_KHONG',
  tamLatGachLat: 'CO_KHONG',
  tamMiengGhepLatNenOpTuong: 'CO_KHONG',
  tamPhuSan: 'CO_KHONG',
  taoMauTaoVanToanBo: 'CO_KHONG',
  thamCauNguyen: 'CO_KHONG',
  thanhPhanCoBan: 'LIET_KE',
  theTich: 'SO',
  thichHopDungChoNguoi: 'CO_KHONG',
  thichHopLamBangMucMayChu: 'CO_KHONG',
  thietKeChoTreEm: 'CO_KHONG',
  thuocChiTuber: 'CO_KHONG',
  thuongDung: 'CO_KHONG',
  thuyTinhQuangHoc: 'CO_KHONG',
  tiLe: 'SO',
  tinhDanHoi: 'CO_KHONG',
  tinhNangBaoHo: 'LIET_KE',
  tinhTrangTayTrang: 'LIET_KE',
  tocDo: 'SO',
  tocDoDiChuyen: 'SO',
  tongDungTichTau: 'SO',
  triSoOctan: 'SO',
  tuHutHoiDoc: 'CO_KHONG',
  tuaLungMatNgoiBangSongMay: 'CO_KHONG',
  uonCong: 'CO_KHONG',
  vatLieuKhac: 'LIET_KE',
  viNgot: 'CO_KHONG',
  xeBaBanh: 'CO_KHONG',
  xichXeDapMoTo: 'CO_KHONG',
  // 07/11/2026 (#1109, Claude): khoá cho PN6 DỪNG nhóm dầu mỡ 15.11–15.18 và 39.16
  thePhanDoan: 'LIET_KE',
  cachBienDoiDau: 'LIET_KE',
  dangVayManh: 'CO_KHONG',
  nhomPolyme: 'LIET_KE',
  dangSanPhamNhom1518: 'LIET_KE',
  toHopChucNangMayIn: 'LIET_KE',
  maHsTuongUng: 'CONG_DUNG',
  // 20/11/2026 (OZV-1610): vế «có bộ phận khuếch đại và một hoặc nhiều loa» — giải DỪNG 8519.81.20
  coBoPhanKhuachDai: 'CO_KHONG',
  coLoa: 'CO_KHONG',
  // 21/11/2026 (OZV-1742): nguồn lên men nước ép rau/quả 2206.00.60 và tầng thiết bị chơi bạc/mạt chược 9504.90.3
  lenMenTuNuocEpRauQua: 'CO_KHONG',
  laThietBiChoiBacHoacMatChuoc: 'CO_KHONG',
  // 21/11/2026 (OZV-1738 / OZV-1753): khoá cho 2002.90.10 (SEN), 3101.00.92, 4017.00.20, 8429.40.40
  hamLuongChatRanKhongChuaMuoi: 'SO',
  laPhanChimDoi: 'CO_KHONG',
  laSanPhamCaoSuCung: 'CO_KHONG',
  lucRungTrong: 'SO',
  // 22/11/2026 (OZV-1757): khoá cho 1207.10.30 (Nhân hạt cọ)
  laNhanHatCo: 'CO_KHONG',
  // 21/11/2026 (OZV-1751): bình hình trụ bằng thép đúc liền (seamless) 7311.00.2 & khả năng cân tối đa 8423.82.3/4
  ducLienKhongNoi: 'CO_KHONG',
  mucCanToiDa: 'SO',
  // 21/11/2026 (OZV-1756): lô 6c (1602.90.20, 1905.32, 1905.40.10, 1905.90.60, 4011.80, 6306.19.10, 9303.90.10)
  laChePhamTuTiet: 'CO_KHONG',
  daThemDuongMatOngTrungChatBeoPhoMatHoacTraiCay: 'CO_KHONG',
  loaiBanhWaffleWafer: 'LIET_KE',
  dungTrongDuocPham: 'CO_KHONG',
  dungChoXeKeoMay8429Hoac8430XeNangHoacXepDo: 'CO_KHONG',
  tuSoiDetThucVatNhom5305: 'CO_KHONG',
  chiDePhongPhaoHieu: 'CO_KHONG',
  coNong23Hoac265mm: 'CO_KHONG',
};

// ── 1. Nạp theo phiên bản ─────────────────────────────────────────────────────────────────────────────────────────
const tv1 = T.taiTuVung('tu-vung@1');
const tv2 = T.taiTuVung();
check('runtime nạp tu-vung@2 mặc định (TEP_TU_VUNG)', T.TEP_TU_VUNG === 'tu-vung/tu-vung@2.json' && tv2.phienBan === 'tu-vung@2', { tep: T.TEP_TU_VUNG, pb: tv2.phienBan });
check('tu-vung@1 vẫn nạp theo tên — bench lát 1 khoá theo @1 (PHIEN_BAN_KHOA_BENCH)', tv1.phienBan === 'tu-vung@1' && T.PHIEN_BAN_KHOA_BENCH === 'tu-vung@1' && tv1 !== tv2, { pb1: tv1.phienBan, khoa: T.PHIEN_BAN_KHOA_BENCH });
check('băm tu-vung@1 (c504396c2837…, OZV-940 cửa hút): tệp @1 khớp', T.phienBan('tu-vung@1').sha256.startsWith('c504396c2837') && T.sha256Tep('data/tu-vung/tu-vung@1.json').startsWith('c504396c2837'), T.phienBan('tu-vung@1'));
check('phienBan() mặc định = tu-vung@2 + sha256 của tệp @2 (HoSoPhanLoai.phienBan.tuVung)', T.phienBan().ten === 'tu-vung@2' && T.phienBan().sha256 === T.sha256Tep('data/tu-vung/tu-vung@2.json'), T.phienBan());

// ── 2. Lược đồ + siêu tập ────────────────────────────────────────────────────────────────────────────────────────
check('tu-vung@2 qua máy kiểm lược đồ (0 lỗi)', T.kiemTuVung(tv2).length === 0, T.kiemTuVung(tv2));
check('tu-vung@1 vẫn qua máy kiểm lược đồ (0 lỗi)', T.kiemTuVung(tv1).length === 0, T.kiemTuVung(tv1));
check('kiemSieuTap(@1, @2) = 0 lỗi', typeof T.kiemSieuTap === 'function' && T.kiemSieuTap(tv1, tv2).length === 0, T.kiemSieuTap && T.kiemSieuTap(tv1, tv2));
{
  const k2 = new Map(tv2.khoa.map((k) => [k.khoa, k]));
  const lech = tv1.khoa.filter((k) => JSON.stringify(k) !== JSON.stringify(k2.get(k.khoa))).map((k) => k.khoa);
  check(`mọi khoá tu-vung@1 (${tv1.khoa.length}) có trong @2 và GIỐNG HỆT (so JSON)`, tv1.khoa.length === 53 && lech.length === 0, lech);
  const them = tv2.khoa.filter((k) => !tv1.khoa.some((x) => x.khoa === k.khoa)).map((k) => k.khoa).sort();
  check(`@2 chỉ thêm đúng ${Object.keys(KHOA_MOI).length} khoá mới`, JSON.stringify(them) === JSON.stringify(Object.keys(KHOA_MOI).sort()), them);
  check('khoá @1 giữ nguyên thứ tự ở đầu danh sách @2', tv1.khoa.every((k, i) => tv2.khoa[i]?.khoa === k.khoa));
}
if (typeof T.kiemSieuTap === 'function') {
  const loiCo = (mut, ma) => { const x = clone(tv2); mut(x); return T.kiemSieuTap(tv1, x).some((l) => l.startsWith(ma)); };
  for (const [ten, mut, ma] of [
    ['sửa nhãn một khoá @1', (x) => { x.khoa[0].nhanVi = 'điện áp (sửa)'; }, 'sieu-tap-khoa-lech'],
    ['xoá một khoá @1', (x) => { x.khoa.splice(3, 1); }, 'sieu-tap-thieu-khoa'],
    ['bỏ một mục khongPhaiPhuDinh của @1', (x) => { x.khongPhaiPhuDinh.shift(); }, 'sieu-tap-danh-sach'],
    ['chèn mục mới vào GIỮA phuDinhChung (đổi thứ tự @1)', (x) => { x.phuDinhChung.splice(1, 0, 'chả'); }, 'sieu-tap-danh-sach'],
    ['đổi hệ số đơn vị @1', (x) => { x.heDonVi.dai.cm = 11; }, 'sieu-tap-bang'],
    ['đổi biệt danh đơn vị @1', (x) => { x.bietDanhDonVi.mm = 'cm'; }, 'sieu-tap-bang'],
    ['bớt từ so sánh @1', (x) => { x.soSanh.truoc['<='].pop(); }, 'sieu-tap-bang'],
  ]) check(`kiemSieuTap ĐỎ khi ${ten}`, loiCo(mut, ma), (() => { const x = clone(tv2); mut(x); return T.kiemSieuTap(tv1, x); })());
}
{
  const loiCo = (mut, ma) => { try { const x = clone(tv2); mut(x); return T.kiemTuVung(x).some((l) => l.startsWith(ma)); } catch { return false; } };
  check('kiemTuVung ĐỎ: cauTrucCo trỏ khoá không có / không phải CO_KHONG', loiCo((x) => { x.cauTrucCo.khoaKhongCo = x.cauTrucCo.laBoPhan; }, 'cau-truc-khoa') && loiCo((x) => { x.cauTrucCo.dienAp = x.cauTrucCo.laBoPhan; }, 'cau-truc-khoa'));
  check('kiemTuVung ĐỎ: cauTrucCo mẫu hỏng', loiCo((x) => { x.cauTrucCo.laBoPhan[0].mau = '(('; }, 'mau-khong-hop-le'));
  check('kiemTuVung ĐỎ: demSo/docPhanSo chỉ cho SO; cumDaiThang chỉ cho LIET_KE', loiCo((x) => { x.khoa.find((k) => k.khoa === 'laBoPhan').demSo = true; }, 'co-chi-cho-kieu') && loiCo((x) => { x.khoa.find((k) => k.khoa === 'dienAp').cumDaiThang = true; }, 'co-chi-cho-kieu'));
  check('kiemTuVung ĐỎ: soChu giá trị không phải số nguyên dương', loiCo((x) => { x.soChu.hai = 'hai'; }, 'so-chu'));
  check('kiemTuVung ĐỎ: soSanhDem op lạ', loiCo((x) => { x.soSanhDem['=>'] = ['hơn']; }, 'so-sanh-dem'));
}

// ── 3. Luật bộ đọc #667/#675 đã vào dữ liệu, cách đọc @1 không đổi ─────────────────────────────────────────────────
{
  const src = fs.readFileSync('lib/tu-vung.js', 'utf8');
  check('#667 CUM_DANH_TU_KHONG không còn trong mã — nằm ở khongPhaiPhuDinh của @2', !/const CUM_DANH_TU_KHONG\s*=/.test(src) && ['không\\s+khí', 'không\\s+gian', 'không\\s+trung'].every((m) => (tv2.khongPhaiPhuDinh || []).includes(m)) && (tv2.khongPhaiPhuDinh || []).some((m) => m.startsWith('(?:chân|hàng)\\s+không(?!')), tv2.khongPhaiPhuDinh);
  check('#675 CAU_TRUC_CO không còn trong mã — nằm ở cauTrucCo.laBoPhan của @2', !/const CAU_TRUC_CO\s*=\s*\{/.test(src) && Array.isArray(tv2.cauTrucCo?.laBoPhan) && /rời/.test(tv2.cauTrucCo.laBoPhan[0].mau) && /tháo/.test(tv2.cauTrucCo.laBoPhan[0].truLaiTruoc), tv2.cauTrucCo);
  const vang = JSON.parse(fs.readFileSync(TEP_VANG, 'utf8'));
  const chu = boChu();
  check(`vân tay: bộ chữ không đổi (${chu.length} chữ)`, chu.length === vang.soChu && require('node:crypto').createHash('sha256').update(chu.join('\n')).digest('hex') === vang.sha256Chu, { co: chu.length, vang: vang.soChu });
  const vt = vanTay(T, tv1.khoa.map((k) => k.khoa), chu);
  const lech = Object.keys(vang.vanTay).filter((k) => JSON.stringify(vt[k]) !== JSON.stringify(vang.vanTay[k]));
  check(`vân tay đọc 53 khoá @1 trên mã + dữ liệu mới KHỚP bản ghi trước khi đổi (${Object.values(vang.vanTay).reduce((n, v) => n + v.soKetQua, 0)} kết quả)`, Object.keys(vang.vanTay).length === 53 && lech.length === 0, lech.map((k) => ({ k, co: vt[k], vang: vang.vanTay[k] })));
}

// ── 4. Khoá mới: nhãn, câu hỏi, cách đọc ───────────────────────────────────────────────────────────────────────────
for (const [khoa, kieu] of Object.entries(KHOA_MOI)) {
  let k = null; try { k = T.layKhoa(khoa); } catch { k = null; }
  check(`${khoa}: có trong tu-vung@2, kiểu ${kieu}, nhãn Vi/En/Zh, cachDoc Vi/En/Zh không rỗng`, Boolean(k) && k.kieu === kieu && k.nhanVi && k.nhanEn && CJK.test(k.nhanZh || '')
    && ['vi', 'en', 'zh'].every((l) => kieu === 'LIET_KE' ? Object.values(k.moTaGiaTri).every((m) => (m.cachDoc?.[l] || []).length) : (k.cachDoc?.[l] || []).length), k);
  let vi = null; let zh = null; try { vi = T.cauHoiCho(khoa, 'vi'); zh = T.cauHoiCho(khoa, 'zh'); } catch { /* đỏ ở dưới */ }
  check(`${khoa}: câu hỏi Vi + Zh (cauHoiCho)`, typeof vi === 'string' && vi.endsWith('?') && typeof zh === 'string' && CJK.test(zh) && /？$/.test(zh), { vi, zh });
  check(`${khoa}: nguonLoai AI_DA_KIEM (chưa chấm duyệt độc lập — không tự gắn CLAUDE_DUYET)`, k?.nguonLoai === 'AI_DA_KIEM', k?.nguonLoai);
}
// ── Khoá mới phải ĐỌC ĐƯỢC chữ biểu nó trích (03/11): mã 8 số trong ghiChu (ngoài ngoặc đơn) ⇒ docGiaTri trên dòng biểu thật = DA_CO.
// Lô Studio 4–9 có 20/151 trích không đọc được (cửa sổ ngữ cảnh ngắn, thang không đơn vị IV/RON/GT, cụm phụ chú) — cổng máy mới bắt được.
{
  const zlib = require('node:zlib');
  const tep = 'data/bieu-thue/2026.04.05/bieu-chinh.jsonl.gz';
  const dong = new Map(zlib.gunzipSync(fs.readFileSync(tep)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
    .filter((r) => r.sheet === 'BT2026' && r.soChuSo === 8).map((r) => [r.maChuan, String(r.moTaVi).replace(/^(?:-\s*)+/, '').trim()]));
  let soTrich = 0; const loi = [];
  for (const khoa of Object.keys(KHOA_MOI)) {
    const k = T.layKhoa(khoa);
    const ngoaiNgoac = String(k.ghiChu || '').replace(/\([^)]*\)/g, ' ');
    const ma = [...new Set((ngoaiNgoac.match(/\b\d{4}\.\d{2}\.\d{2}\b|\b\d{8}\b/g) || []).map((x) => x.replace(/\./g, '')))].filter((c) => dong.has(c));
    for (const c of ma) {
      const text = dong.get(c);
      if (/^loại khác/i.test(text)) continue;
      soTrich += 1;
      const v = T.docGiaTri(khoa, text);
      if (v.trangThai !== 'DA_CO') loi.push(`${khoa}:${c}:${text.slice(0, 50)}`);
    }
  }
  check(`khoá mới đọc được chữ biểu nó trích trong ghiChu (${soTrich} dòng, 0 không đọc được)`, soTrich > 60 && loi.length === 0, loi);
}
check(`chamDuyetDocLap @2: khoá mới CHUA_CHAM, liệt kê đủ ${Object.keys(KHOA_MOI).length} khoá`, tv2.chamDuyetDocLap?.trangThai === 'CHUA_CHAM' && Object.keys(KHOA_MOI).every((k) => (tv2.chamDuyetDocLap?.khoaChuaCham || []).includes(k)), tv2.chamDuyetDocLap);

const doc = (khoa, t) => { try { return T.docGiaTri(khoa, t); } catch (e) { return { loi: String(e.message) }; } };
const la = (ten, khoa, t, v, them = {}) => {
  const r = doc(khoa, t);
  const ok = r.trangThai === 'DA_CO' && JSON.stringify(r.giaTri) === JSON.stringify(v) && coTrong(r, t)
    && (them.op === undefined || (them.op === null ? r.op === undefined : r.op === them.op)) && (!them.bc || r.bangChung.includes(them.bc));
  check(`${khoa} ${ten}: "${t}" ⇒ ${JSON.stringify(v)}${them.op ? ` op ${them.op}` : ''}${them.bc ? ` (bangChung ⊇ "${them.bc}")` : ''}`, ok, r);
};
const chuaBiet = (ten, khoa, t) => { const r = doc(khoa, t); check(`${khoa} ${ten}: "${t}" ⇒ CHUA_BIET`, r.trangThai === 'CHUA_BIET', r); return r; };

// chiHoacChuYeu — "chỉ hoặc chủ yếu dùng cho" (8414.59.10, 8537.10.20, 8420.10.10)
la('khẳng định (chữ biểu 8414.59.10)', 'chiHoacChuYeu', 'Quạt, loại chỉ sử dụng hoặc chủ yếu sử dụng để làm mát bộ vi xử lý', true, { bc: 'chỉ sử dụng hoặc chủ yếu sử dụng' });
la('khẳng định (chữ biểu 8537.10.20)', 'chiHoacChuYeu', 'Bảng phân phối chỉ dùng hoặc chủ yếu dùng với các hàng hóa thuộc nhóm 84.71', true, { bc: 'chỉ dùng hoặc chủ yếu dùng' });
la('khẳng định (chuyên dùng)', 'chiHoacChuYeu', 'Quạt tản nhiệt chuyên dùng cho CPU máy tính', true);
la('khẳng định En', 'chiHoacChuYeu', 'Cooling fan of a kind used solely or principally with CPUs', true);
la('khẳng định Zh', 'chiHoacChuYeu', '电脑CPU专用散热风扇', true);
la('khẳng định Zh (主要用于)', 'chiHoacChuYeu', '主要用于电信设备的配电板', true);
la('giá trị KHÔNG (đa dụng)', 'chiHoacChuYeu', 'Quạt công nghiệp đa dụng 220V', false);
la('giá trị KHÔNG En', 'chiHoacChuYeu', 'general purpose fan', false);
la('giá trị KHÔNG Zh', 'chiHoacChuYeu', '通用风扇', false);
la('phủ định', 'chiHoacChuYeu', 'Quạt không chuyên dùng cho máy tính', false, { bc: 'không chuyên dùng' });
chuaBiet('"không chỉ dùng cho" — không phải "chỉ dùng cho", không đoán', 'chiHoacChuYeu', 'Quạt không chỉ dùng cho máy tính mà còn cho tủ điện');
chuaBiet('"chủ yếu" không đi với dùng/sử dụng', 'chiHoacChuYeu', 'Quạt có thành phần chủ yếu là nhôm');
chuaBiet('không có chữ nào', 'chiHoacChuYeu', 'Quạt điện 220V 60W');

// thietKeChoTreEm — "được thiết kế chủ yếu cho trẻ em" (9503.00.80)
la('khẳng định (chữ biểu 9503.00.80)', 'thietKeChoTreEm', 'Thiết bị giáo dục điện tử tương tác cầm tay được thiết kế chủ yếu cho trẻ em', true, { bc: 'thiết kế chủ yếu cho trẻ em' });
la('khẳng định (dành cho trẻ em)', 'thietKeChoTreEm', 'Máy học tiếng Anh dành cho trẻ em từ 3 tuổi', true);
la('khẳng định En', 'thietKeChoTreEm', 'handheld learning toy designed for children aged 3+', true);
la('khẳng định Zh', 'thietKeChoTreEm', '儿童学习机，手持式', true);
la('giá trị KHÔNG (người lớn)', 'thietKeChoTreEm', 'Máy đọc sách điện tử dành cho người lớn', false);
la('giá trị KHÔNG Zh', 'thietKeChoTreEm', '成人用电子阅读器', false);
la('phủ định', 'thietKeChoTreEm', 'Thiết bị này không dành cho trẻ em', false, { bc: 'không dành cho trẻ em' });
chuaBiet('nhãn cảnh báo "không dành cho trẻ em dưới 3 tuổi" — không đoán', 'thietKeChoTreEm', 'Đồ chơi lắp ghép, không dành cho trẻ em dưới 3 tuổi');
chuaBiet('nhãn cảnh báo En', 'thietKeChoTreEm', 'Building blocks, not suitable for children under 3 years');
chuaBiet('không có chữ nào', 'thietKeChoTreEm', 'Máy học ngoại ngữ cầm tay, pin sạc');

// daNapChuongTrinh — bo mạch đã nạp chương trình/firmware (TB 4040, 1159/TB-TCHQ; hiệu chỉnh 853710-0x)
la('khẳng định', 'daNapChuongTrinh', 'Bo mạch điều khiển máy lọc không khí, đã nạp chương trình', true, { bc: 'đã nạp chương trình' });
la('khẳng định (firmware)', 'daNapChuongTrinh', 'PCBA đã nạp firmware điều khiển', true);
la('khẳng định En', 'daNapChuongTrinh', 'pre-programmed MCU control board', true);
la('khẳng định Zh', 'daNapChuongTrinh', '已烧录程序的控制板', true);
la('giá trị KHÔNG (trích 4040/TB-TCHQ)', 'daNapChuongTrinh', 'Bảng mạch điều khiển của thiết bị lọc không khí (bảng mạch chưa trải qua quá trình ghi dữ liệu điều khiển)', false, { bc: 'chưa trải qua quá trình ghi dữ liệu điều khiển' });
la('giá trị KHÔNG (trích 1159/TB-TCHQ)', 'daNapChuongTrinh', 'Bảng mạch đã được lắp ráp hoàn chỉnh tuy nhiên chưa được ghi phần mềm điều khiển ở công đoạn này', false, { bc: 'chưa được ghi phần mềm điều khiển' });
la('giá trị KHÔNG En', 'daNapChuongTrinh', 'unprogrammed control board', false);
la('giá trị KHÔNG Zh', 'daNapChuongTrinh', '未烧录的控制板', false);
la('phủ định', 'daNapChuongTrinh', 'bo mạch không nạp chương trình', false, { bc: 'không nạp chương trình' });
chuaBiet('"máy nạp chương trình" là tên thiết bị nạp, không phải bo mạch đã nạp', 'daNapChuongTrinh', 'Máy nạp chương trình cho vi điều khiển');
chuaBiet('không có chữ nào', 'daNapChuongTrinh', 'Bo mạch điều khiển máy lọc không khí có vi điều khiển');

// soLoi — số lõi dẫn
la('khẳng định', 'soLoi', 'Cáp điện 2 lõi, mỗi lõi 7 sợi, bọc PVC', 2, { op: null });
la('khẳng định số chữ', 'soLoi', 'dây điện bốn lõi bọc PVC', 4);
la('"hai lõi hoặc hơn" ⇒ >= 2', 'soLoi', 'Cáp dẹt có hai lõi hoặc hơn', 2, { op: '>=', bc: 'hai lõi hoặc hơn' });
// soLoaiVitamin — số loại vitamin (3004.50.2x «chứa nhiều hơn một loại vitamin»)
la('khẳng định', 'soLoaiVitamin', 'Viên uống chứa 12 loại vitamin', 12, { op: null });
la('"nhiều hơn một loại" ⇒ > 1', 'soLoaiVitamin', 'chế phẩm chứa nhiều hơn một loại vitamin', 1, { op: '>', bc: 'nhiều hơn một loại' });
la('En "two or more cores" ⇒ >= 2', 'soLoi', 'cable with two or more cores', 2, { op: '>=' });
la('Zh', 'soLoi', '4芯电缆', 4);
la('Zh "两芯及以上" ⇒ >= 2', 'soLoi', '两芯及以上电缆', 2, { op: '>=' });
la('so sánh phủ định "không quá 4 lõi" ⇒ <= 4', 'soLoi', 'cáp không quá 4 lõi', 4, { op: '<=' });
chuaBiet('"đường kính lõi 2 mm" là đường kính, không phải số lõi', 'soLoi', 'đường kính lõi 2 mm');
chuaBiet('không có số', 'soLoi', 'cáp lõi đồng bọc PVC');
chuaBiet('"mười hai lõi" (số ghép) — không đọc thành 2', 'soLoi', 'cáp mười hai lõi');
chuaBiet('"十二芯" (số ghép) — không đọc thành 2', 'soLoi', '十二芯电缆');
chuaBiet('"40 sợi" là số sợi, không phải số lõi', 'soLoi', 'cáp dẹt 40 sợi');

// soSoi — số sợi (chữ "sợi" của biểu: sợi dẫn 8544.42.91, sợi bện, sợi quang)
la('"hai sợi hoặc hơn" (chữ biểu 8544.42.91) ⇒ >= 2', 'soSoi', 'Cáp dữ liệu dẹt có hai sợi hoặc hơn, cách điện bằng cao su, plastic hoặc giấy', 2, { op: '>=', bc: 'hai sợi hoặc hơn' });
la('khẳng định', 'soSoi', 'dây đồng bện 7 sợi', 7, { op: null });
la('khẳng định (sợi quang)', 'soSoi', 'cáp quang 12 sợi', 12);
la('En', 'soSoi', 'stranded wire, 7 strands', 7);
la('Zh', 'soSoi', '7股绞线', 7);
la('so sánh phủ định "không ít hơn hai sợi" ⇒ >= 2', 'soSoi', 'cáp không ít hơn hai sợi', 2, { op: '>=' });
chuaBiet('"2 lõi" là số lõi', 'soSoi', 'cáp 2 lõi');
chuaBiet('"mỗi sợi 0,3 mm" là đường kính', 'soSoi', 'cáp lõi mỗi sợi 0,3 mm');
chuaBiet('không có số', 'soSoi', 'sợi thủy tinh cách điện');

// tiLe — tỉ lệ (không thứ nguyên, quy về "lần")
la('chữ biểu 7616.99.30 "trên 1/10 đường kính" ⇒ 0.1 op >', 'tiLe', 'Đồng xèng, hình tròn, kích thước chiều dày trên 1/10 đường kính', 0.1, { op: '>', bc: 'trên 1/10 đường kính' });
la('"tỉ lệ … 1:8"', 'tiLe', 'tỉ lệ dày so với đường kính 1:8', 0.125);
la('"gấp 3 lần"', 'tiLe', 'chiều dài gấp 3 lần chiều rộng', 3);
la('"tỷ lệ 10%"', 'tiLe', 'tỷ lệ 10%', 0.1);
la('En "exceeding 1/10 of the diameter" ⇒ op >', 'tiLe', 'thickness exceeding 1/10 of the diameter', 0.1, { op: '>' });
la('Zh "之比为1:10"', 'tiLe', '厚度与直径之比为1:10', 0.1);
la('so sánh phủ định "không quá 1/10 đường kính" ⇒ op <=', 'tiLe', 'chiều dày không quá 1/10 đường kính', 0.1, { op: '<=' });
chuaBiet('"1/2 inch" là kích thước', 'tiLe', 'ống ren 1/2 inch');
chuaBiet('"50/60Hz" là tần số', 'tiLe', 'nguồn điện 50/60Hz');
chuaBiet('không suy tỉ lệ từ hai kích thước', 'tiLe', 'đường kính 20 mm, dày 2 mm');
chuaBiet('"3 lần" không có chữ tỉ lệ', 'tiLe', 'rửa 3 lần trước khi dùng');

// phuongPhapCheTao — LIET_KE
la('được rèn', 'phuongPhapCheTao', 'Trục truyền động được rèn bằng thép hợp kim', 'REN');
la('cán nóng', 'phuongPhapCheTao', 'thép tấm cán nóng', 'CAN_NONG');
la('cán nguội En', 'phuongPhapCheTao', 'cold-rolled steel coil', 'CAN_NGUOI');
la('đúc áp lực', 'phuongPhapCheTao', 'vỏ nhôm đúc áp lực', 'DUC');
la('chữ biểu 7616.99.80 "đột dập và kéo giãn" — cụm dài thắng', 'phuongPhapCheTao', 'Sản phẩm dạng lưới được tạo hình bằng phương pháp đột dập và kéo giãn thành lưới', 'DOT_DAP_KEO_GIAN');
la('ép phun Zh', 'phuongPhapCheTao', '注塑外壳', 'EP_PHUN');
la('thổi khuôn', 'phuongPhapCheTao', 'chai nhựa thổi khuôn', 'THOI');
la('hàn En', 'phuongPhapCheTao', 'welded steel pipe', 'HAN');
la('đột dập', 'phuongPhapCheTao', 'giá đỡ bằng thép đột dập', 'DAP');
la('kéo nguội', 'phuongPhapCheTao', 'ống thép kéo nguội', 'KEO');
chuaBiet('"gang đúc" là vật liệu', 'phuongPhapCheTao', 'Nồi bằng gang đúc');
chuaBiet('"cast iron" là vật liệu', 'phuongPhapCheTao', 'cast iron pan');
chuaBiet('"máy hàn" là tên máy', 'phuongPhapCheTao', 'máy hàn điện tử 200A');
chuaBiet('"Hàn Quốc"', 'phuongPhapCheTao', 'xuất xứ Hàn Quốc');
chuaBiet('"kéo" là cái kéo', 'phuongPhapCheTao', 'dao kéo bằng thép không gỉ');
chuaBiet('phủ định "không được rèn"', 'phuongPhapCheTao', 'trục không được rèn');
{
  const r = chuaBiet('hai phương pháp khác nhau — không đoán', 'phuongPhapCheTao', 'thân đúc, nắp dập');
  check('phuongPhapCheTao hai phương pháp ⇒ ungVien [DUC, DAP]', JSON.stringify((r.ungVien || []).slice().sort()) === JSON.stringify(['DAP', 'DUC']), r);
}

// phuongThucTruyenDan — LIET_KE VO_TUYEN | HUU_TUYEN (#606, chữ biểu 851762)
la('chữ biểu 85176261 "truyền dẫn dưới dạng sóng vô tuyến"', 'phuongThucTruyenDan', 'Dùng cho điện báo hoặc điện thoại truyền dẫn dưới dạng sóng vô tuyến', 'VO_TUYEN', { bc: 'sóng vô tuyến' });
la('chữ biểu 85176210 "phát và thu sóng vô tuyến"', 'phuongThucTruyenDan', 'Thiết bị phát và thu sóng vô tuyến sử dụng cho phiên dịch trực tiếp', 'VO_TUYEN');
la('"không dây" (không phải phủ định — khongPhaiPhuDinh)', 'phuongThucTruyenDan', 'Thiết bị mạng nội bộ không dây', 'VO_TUYEN', { bc: 'không dây' });
la('En "radio-telephony"', 'phuongThucTruyenDan', 'For radio-telephony or radio-telegraphy', 'VO_TUYEN');
la('En "wireless"', 'phuongThucTruyenDan', 'wireless access point', 'VO_TUYEN');
la('Zh "无线"', 'phuongThucTruyenDan', '无线对讲机', 'VO_TUYEN');
la('chữ biểu 8517624 "hệ thống hữu tuyến"', 'phuongThucTruyenDan', 'Thiết bị dùng cho hệ thống hữu tuyến sóng mang hoặc hệ thống hữu tuyến kỹ thuật số', 'HUU_TUYEN', { bc: 'hữu tuyến' });
la('"có dây"', 'phuongThucTruyenDan', 'Điện thoại bàn có dây', 'HUU_TUYEN');
la('En "carrier-current line systems"', 'phuongThucTruyenDan', 'Apparatus for carrier-current line systems or for digital line systems', 'HUU_TUYEN');
la('En "wired"', 'phuongThucTruyenDan', 'wired headset', 'HUU_TUYEN');
la('Zh "有线"', 'phuongThucTruyenDan', '有线电话机', 'HUU_TUYEN');
chuaBiet('"có dây đeo" là dây vật lý, không phải đường truyền', 'phuongThucTruyenDan', 'Đồng hồ có dây đeo bằng da');
chuaBiet('"line" trần (dây chuyền) không đọc', 'phuongThucTruyenDan', 'production line conveyor');
chuaBiet('"cordless" không đọc (trùng pin/ắc quy)', 'phuongThucTruyenDan', 'cordless drill 18V');
chuaBiet('phủ định "không phải loại vô tuyến"', 'phuongThucTruyenDan', 'thiết bị không phải loại vô tuyến');
{
  const r = chuaBiet('cả không dây lẫn có dây — không đoán', 'phuongThucTruyenDan', 'bộ điện thoại không dây và có dây');
  check('phuongThucTruyenDan hai giá trị ⇒ ungVien [HUU_TUYEN, VO_TUYEN]', JSON.stringify((r.ungVien || []).slice().sort()) === JSON.stringify(['HUU_TUYEN', 'VO_TUYEN']), r);
}

// daXuLyBeMat — CO_KHONG (#577, chữ biểu 8481.80.97)
la('chữ biểu 84818097 "đã được xử lý bề mặt"', 'daXuLyBeMat', 'Loại khác, điều khiển bằng tay, khối lượng dưới 3 kg, đã được xử lý bề mặt hoặc làm bằng thép không gỉ hoặc niken', true, { bc: 'đã được xử lý bề mặt' });
la('En "surface treated"', 'daXuLyBeMat', 'brass ball valve, surface treated, chrome finish', true);
la('Zh "表面处理"', 'daXuLyBeMat', '黄铜球阀 表面处理', true);
la('phủ định "chưa xử lý bề mặt"', 'daXuLyBeMat', 'van đồng thau chưa xử lý bề mặt', false);
chuaBiet('không suy từ tên lớp phủ / vật liệu ("inox", "mạ")', 'daXuLyBeMat', 'van inox mạ niken');

// nhienLieu — LIET_KE GA | DIEN (#577, chữ biểu 8481.80.30)
la('chữ biểu 84818030 "bếp có lò nướng bằng ga"', 'nhienLieu', 'Van, đã hoặc chưa lắp bộ phận đánh lửa điện từ, dùng cho các bếp nấu hoặc bếp có lò nướng bằng ga', 'GA', { bc: 'bằng ga' });
la('"bếp ga"', 'nhienLieu', 'van điều chỉnh bếp ga âm', 'GA');
la('En "gas-fired"', 'nhienLieu', 'valve for gas-fired cooker', 'GA');
la('Zh "燃气"', 'nhienLieu', '燃气灶阀门', 'GA');
la('"bếp từ" ⇒ DIEN', 'nhienLieu', 'bếp từ đôi âm kính', 'DIEN');
la('En "electric oven"', 'nhienLieu', 'electric oven thermostat', 'DIEN');
chuaBiet('"bằng gang" không phải "bằng ga"', 'nhienLieu', 'Van cổng, bằng gang đúc');
chuaBiet('"có ga" (đồ uống) không đọc', 'nhienLieu', 'chai nước ngọt có ga');
chuaBiet('"gas" trần (van gas, bình gas — khí là lưu chất) không đọc', 'nhienLieu', 'van gas bình LPG');
chuaBiet('"điều khiển bằng điện" là cách điều khiển, không phải nhiên liệu', 'nhienLieu', 'van điều khiển bằng điện');
{
  const r = chuaBiet('cả bếp ga lẫn bếp điện — không đoán', 'nhienLieu', 'bếp ga và bếp điện');
  check('nhienLieu hai giá trị ⇒ ungVien [DIEN, GA]', JSON.stringify((r.ungVien || []).slice().sort()) === JSON.stringify(['DIEN', 'GA']), r);
}

// phuongPhapIn — LIET_KE BATIK | IN_LUOI | IN_KY_THUAT_SO | IN_CHUYEN_NHIET (lát 2, chữ biểu 5208.59.10, 6204.42.10…)
la('chữ biểu 62044210 "in bằng phương pháp batik truyền thống"', 'phuongPhapIn', 'Được in bằng phương pháp batik truyền thống (SEN)', 'BATIK', { bc: 'in bằng phương pháp batik truyền thống' });
la('"in batik"', 'phuongPhapIn', 'Vải bông dệt thoi, in batik', 'BATIK');
la('En "batik printed"', 'phuongPhapIn', 'batik printed cotton fabric', 'BATIK');
la('Zh "蜡染"', 'phuongPhapIn', '蜡染棉布', 'BATIK');
la('"in lưới" ⇒ IN_LUOI', 'phuongPhapIn', 'áo thun in lưới', 'IN_LUOI');
la('En "silk-screen printed" ⇒ IN_LUOI (không phải tơ tằm)', 'phuongPhapIn', 'silk-screen printed fabric', 'IN_LUOI');
la('En "digital printed"', 'phuongPhapIn', 'digital printed polyester fabric', 'IN_KY_THUAT_SO');
la('"in chuyển nhiệt"', 'phuongPhapIn', 'vải in chuyển nhiệt', 'IN_CHUYEN_NHIET');
chuaBiet('"đã in" / "in hoa" là trạng thái in, không phải phương pháp (600634 "Đã in")', 'phuongPhapIn', 'Vải dệt kim đã in hoa');
chuaBiet('"printed" trần không đọc', 'phuongPhapIn', 'printed fabric');
{
  const r = chuaBiet('hai phương pháp in — không đoán', 'phuongPhapIn', 'in batik và in kỹ thuật số');
  check('phuongPhapIn hai giá trị ⇒ ungVien [BATIK, IN_KY_THUAT_SO]', JSON.stringify((r.ungVien || []).slice().sort()) === JSON.stringify(['BATIK', 'IN_KY_THUAT_SO']), r);
}

// tinhDanHoi — CO_KHONG (lát 2, chữ biểu 6006.43.10 "Đàn hồi (kết hợp với sợi cao su)", 6001.92.30 "Chứa sợi đàn hồi hoặc sợi cao su")
la('chữ biểu 60064310 "Đàn hồi"', 'tinhDanHoi', 'Đàn hồi (kết hợp với sợi cao su)', true, { bc: 'Đàn hồi' });
la('chữ biểu 60019230 "sợi đàn hồi"', 'tinhDanHoi', 'Chứa sợi đàn hồi hoặc sợi cao su', true, { bc: 'sợi đàn hồi' });
la('"sợi cao su"', 'tinhDanHoi', 'vải dệt kim kết hợp với sợi cao su', true, { bc: 'sợi cao su' });
la('En "elastomeric yarn"', 'tinhDanHoi', 'Containing elastomeric yarn or rubber thread', true);
la('En "Elastic (combined with rubber threads)"', 'tinhDanHoi', 'Elastic (combined with rubber threads)', true);
la('"spandex" là sợi đàn hồi (Chú giải 13 Phần XI)', 'tinhDanHoi', 'vải dệt kim 95% cotton 5% spandex', true, { bc: 'spandex' });
la('Zh "弹性"', 'tinhDanHoi', '弹性针织面料 含氨纶', true);
la('phủ định "không đàn hồi"', 'tinhDanHoi', 'vải dệt kim không đàn hồi', false, { bc: 'không đàn hồi' });
la('En "non-elastic" (cachDocKhong)', 'tinhDanHoi', 'non-elastic knitted fabric', false);
chuaBiet('"cao su" trần là chất liệu, không phải sợi cao su', 'tinhDanHoi', 'ống cao su lưu hoá');
chuaBiet('không có chữ nào', 'tinhDanHoi', 'vải cotton dệt kim 100%');

// loaiSoiDet — LIET_KE BONG | SOI_THUC_VAT_KHAC | LEN_LONG_DONG_VAT_MIN | TO_TAM | SOI_TONG_HOP | SOI_TAI_TAO (lát 2, 6306, 5515.99.10)
la('chữ biểu 63062910 "Từ bông"', 'loaiSoiDet', 'Từ bông', 'BONG', { bc: 'Từ bông' });
la('chữ biểu 63061910 "Từ sợi dệt thực vật thuộc nhóm 53.05"', 'loaiSoiDet', 'Từ sợi dệt thực vật thuộc nhóm 53.05', 'SOI_THUC_VAT_KHAC', { bc: 'sợi dệt thực vật' });
la('chữ biểu 55159910 "lông cừu hoặc lông động vật loại mịn"', 'loaiSoiDet', 'Pha chủ yếu hoặc pha duy nhất với lông cừu hoặc lông động vật loại mịn', 'LEN_LONG_DONG_VAT_MIN', { bc: 'lông cừu' });
la('En "of cotton"', 'loaiSoiDet', 'tent of cotton', 'BONG');
la('Zh "纯棉"', 'loaiSoiDet', '纯棉帐篷', 'BONG');
la('"vải lanh" ⇒ sợi thực vật khác', 'loaiSoiDet', 'khăn trải bàn vải lanh', 'SOI_THUC_VAT_KHAC');
la('"ramie" ⇒ RAMIE (tách khỏi SOI_THUC_VAT_KHAC)', 'loaiSoiDet', 'áo khoác từ ramie', 'RAMIE');
la('"gai ramie"', 'loaiSoiDet', 'vải gai ramie 100%', 'RAMIE');
la('En "Of ramie"', 'loaiSoiDet', 'Of ramie', 'RAMIE');
la('Zh "苎麻"', 'loaiSoiDet', '苎麻外套', 'RAMIE');
la('"áo len lông cừu"', 'loaiSoiDet', 'áo len lông cừu', 'LEN_LONG_DONG_VAT_MIN');
la('"tơ tằm"', 'loaiSoiDet', 'khăn lụa tơ tằm', 'TO_TAM');
la('En "silk"', 'loaiSoiDet', 'silk scarf', 'TO_TAM');
la('"polyester" ⇒ tổng hợp', 'loaiSoiDet', 'vải polyester 100%', 'SOI_TONG_HOP');
la('"visco" ⇒ tái tạo', 'loaiSoiDet', 'vải visco', 'SOI_TAI_TAO');
chuaBiet('"bông thủy tinh" không phải xơ dệt', 'loaiSoiDet', 'từ bông thủy tinh cách nhiệt');
chuaBiet('Zh "石棉" (amiăng) không phải bông', 'loaiSoiDet', '石棉布');
chuaBiet('"silk-screen" là in lưới, không phải tơ tằm', 'loaiSoiDet', 'silk-screen printed fabric');
{
  const r = chuaBiet('hàng pha hai loại xơ — không đoán (Chú giải 2 Phần XI: theo tỉ trọng)', 'loaiSoiDet', 'cotton 80% polyester 20%');
  check('loaiSoiDet hàng pha ⇒ ungVien [BONG, SOI_TONG_HOP]', JSON.stringify((r.ungVien || []).slice().sort()) === JSON.stringify(['BONG', 'SOI_TONG_HOP']), r);
}
{
  const r = T.docGiaTri('loaiSoiDet', 'khăn trải bàn vải lanh');
  check('loaiSoiDet "vải lanh" vẫn SOI_THUC_VAT_KHAC (không nhảy sang RAMIE)', r.giaTri === 'SOI_THUC_VAT_KHAC' && r.trangThai === 'DA_CO', r);
}

// doDay — SO mm, cần ngữ cảnh (lát 2, chữ biểu 7308.30.10 "Cửa ra vào, có độ dày từ 6 mm đến 8 mm")
la('chữ biểu 73083010 "độ dày từ 6 mm đến 8 mm" ⇒ số đầu 6', 'doDay', 'Cửa ra vào, có độ dày từ 6 mm đến 8 mm', 6, { op: null });
la('"dày 2mm"', 'doDay', 'tấm thép dày 2mm', 2);
la('"dày 0,5 cm" quy mm', 'doDay', 'tấm nhựa dày 0,5 cm', 5);
la('"độ dày không quá 10 mm" ⇒ op <=', 'doDay', 'độ dày không quá 10 mm', 10, { op: '<=', bc: 'không quá 10 mm' });
la('En "thickness 1.5 mm"', 'doDay', 'steel plate thickness 1.5 mm', 1.5);
la('Zh "厚度 3mm"', 'doDay', '钢板 厚度 3mm', 3);
{
  const r = la('khoảng "dày 6-8 mm" ⇒ 6 + cacGiaTri', 'doDay', 'tấm dày 6-8 mm', 6, { op: null });
  const rr = doc('doDay', 'tấm dày 6-8 mm');
  check('doDay khoảng ⇒ cacGiaTri [6, 8]', JSON.stringify(rr.cacGiaTri) === '[6,8]', rr);
}
chuaBiet('"8 mm" trần không có chữ dày — không đoán', 'doDay', 'ống thép 8 mm');
chuaBiet('đường kính không phải độ dày', 'doDay', 'ống thép đường kính 20 mm');

// ── 10 khoá lô 2 (02/11) — đọc thử ─────────────────────────────────────────────────────────────────────────────────
la('congSuatBieuKien "75 kVA"', 'congSuatBieuKien', 'Máy phát điện xoay chiều công suất 75 kVA', 75);
la('dungTich "250 lít"', 'dungTich', 'Bình chứa dung tích 250 lít', 250);
la('theTich "thể tích ngoài 250 cm3"', 'theTich', 'Pin có thể tích ngoài 250 cm3', 250);
chuaBiet('theTich "thể tích" trần không đọc (tránh lẫn dungTich)', 'theTich', 'thể tích 500 ml');
la('sanLuongHoi "10 tấn/giờ"', 'sanLuongHoi', 'lò hơi sản lượng hơi 10 tấn/giờ', 10);
la('dungLuong "100Ah"', 'dungLuong', 'ắc quy dung lượng 100Ah', 100);
la('daLapRap "đã lắp ráp" ⇒ true', 'daLapRap', 'xe đã lắp ráp hoàn chỉnh', true);
la('daLapRap "chưa lắp ráp" ⇒ false', 'daLapRap', 'xe chưa lắp ráp', false);
la('daHoaDeo "đã hóa dẻo" ⇒ true', 'daHoaDeo', 'PVC đã hóa dẻo', true);
la('coBoLoc "không có bộ lọc" ⇒ false', 'coBoLoc', 'máy bơm không có bộ lọc', false);
la('dangNguyenSinh "dạng hạt"', 'dangNguyenSinh', 'polyme dạng hạt', 'HAT_VIEN_VAY_MANH');
la('heDienHoa "hệ kiềm"', 'heDienHoa', 'pin hệ kiềm', 'KIEM');
la('daTrangPhuEpLop "vải tráng cao su" ⇒ true (06/11, tiêu đề 5902.10.1)', 'daTrangPhuEpLop', 'Vải tráng cao su làm mép lốp', true);
la('daTrangPhuEpLop "chưa tráng" vẫn ⇒ false', 'daTrangPhuEpLop', 'vải chưa tráng, phủ hoặc ép lớp', false);
la('daPhu "không phủ" ⇒ false / "đã phủ" ⇒ true (06/11, tiêu đề 4813.20)', 'daPhu', 'Loại khác, không phủ', false);
la('daPhu "đã phủ" ⇒ true', 'daPhu', 'Loại khác, đã phủ', true);
la('daTrangPhuEpLop "được ngâm tẩm, tráng hoặc phủ" ⇒ true (06/11, 5907.00.60)', 'daTrangPhuEpLop', 'Các loại vải được ngâm tẩm, tráng hoặc phủ bằng các vật liệu khác', true);
{
  const r = T.docGiaTri('loaiSoiDet', 'Từ lông cừu hoặc lông động vật loại mịn hoặc loại thô');
  check('loaiSoiDet "lông … loại mịn hoặc loại thô" ⇒ ungVien [LEN_LONG_DONG_VAT_MIN, LONG_DONG_VAT_THO] (06/11, 5811.00.10)', JSON.stringify([...(r.ungVien || [])].sort()) === JSON.stringify(['LEN_LONG_DONG_VAT_MIN', 'LONG_DONG_VAT_THO']), r);
}

// ── Lô 23 (#1098) — khoá đọc đúng chữ biểu thật ───────────────────────────────────────────────────────────────
la('pha chế với ethanol', 'loaiPhaChe', 'Pha chế với ethanol', 'PHA_ETHANOL');
la('chưa pha chế', 'loaiPhaChe', 'Chưa pha chế', 'CHUA_PHA_CHE');
la('pha chế chất khác / Loại khác', 'loaiPhaChe', 'Loại khác', 'PHA_KHAC');
la('pha chế chất khác / Loại khác 27101223', 'loaiPhaChe', 'Loại khác, xăng pha chế với chất khác', 'PHA_KHAC');
la('dạng khác là KHÔNG dạng lỏng', 'dangLong', 'Loại sử dụng để sản xuất đồ uống có cồn, dạng khác', false);
la('số tầng bơm', 'soTangBom', 'Bơm nước một tầng, một chiều hút, trục ngang', 'MOT_TANG');
la('kiểu hút bơm', 'kieuHutBom', 'Bơm nước một tầng, một chiều hút, trục ngang', 'MOT_CHIEU');
la('hướng trục bơm', 'huongTrucBom', 'Bơm nước một tầng, một chiều hút, trục ngang', 'NGANG');
la('chỉ số iốt không cần chữ IV', 'chiSoIot', 'Có chỉ số iốt từ 30 trở lên, nhưng dưới 40', 30, { op: '>=', bc: '30 trở lên' });
la('chỉ số iốt 55 không cần chữ IV', 'chiSoIot', 'Loại khác, có chỉ số iốt từ 55 trở lên, nhưng dưới 60', 55, { op: '>=', bc: '55 trở lên' });

// ── Lô 24 (OZV-1610, 20/11/2026) — vế «có bộ phận khuếch đại và một hoặc nhiều loa» 8519.81.20 ────────────────
la('khuếch đại (chữ biểu 8519.81.20)', 'coBoPhanKhuachDai', 'Máy ghi âm cassette, có bộ phận khuếch đại và một hoặc nhiều loa, hoạt động chỉ bằng nguồn điện ngoài', true, { bc: 'có bộ phận khuếch đại' });
la('khuếch đại — ampli rời', 'coBoPhanKhuachDai', 'Đầu cassette kèm theo bộ khuếch đại âm thanh và 2 loa', true);
la('khuếch đại En', 'coBoPhanKhuachDai', 'Cassette recorder incorporating an amplifier', true);
la('khuếch đại Zh', 'coBoPhanKhuachDai', '卡带式录音机，装有放大器', true);
la('khuếch đại En rút gọn', 'coBoPhanKhuachDai', 'Cassette deck with built-in ampli', true);
la('khuếch đại KHÔNG', 'coBoPhanKhuachDai', 'Máy ghi âm cassette, không có bộ phận khuếch đại', false);
la('khuếch đại KHÔNG En', 'coBoPhanKhuachDai', 'Cassette recorder without an amplifier', false);
la('loa (chữ biểu 8519.81.20)', 'coLoa', 'Máy ghi âm cassette, có bộ phận khuếch đại và một hoặc nhiều loa, hoạt động chỉ bằng nguồn điện ngoài', true, { bc: 'một hoặc nhiều loa' });
la('loa — gắn 2 loa', 'coLoa', 'Đầu cassette gắn hai loa tích hợp', true);
la('loa En', 'coLoa', 'Cassette player with built-in speakers', true);
la('loa Zh', 'coLoa', '带扬声器的录音机', true);
la('loa KHÔNG', 'coLoa', 'Máy ghi âm cassette loại nhỏ, không kèm loa rời', false);
// canh «loai/loại» không dính «loa»: "loại nhỏ" phải CHUA_BIET chứ không phải DA_CO
chuaBiet('canh «loai» ASCII không dính «loa»', 'coLoa', 'Máy ghi âm cassette có loai bỏ túi dùng pin');
chuaBiet('canh «loai» ASCII giữa câu — «một hoặc nhiều loai»', 'coLoa', 'máy có một hoặc nhiều loai cảm biến');
// «loại» có dấu — kí tự ạ (U+1EA1) khác a nên "loa" thuần không xuất hiện trong chuỗi
chuaBiet('canh «loại» có dấu không dính «loa»', 'coLoa', 'Máy ghi âm cassette loại bỏ túi');

// ── Lô 25 (OZV-1742, 21/11/2026) — lenMenTuNuocEpRauQua (2206.00.60) & laThietBiChoiBacHoacMatChuoc (9504.90.3) ──
la('lenMenTuNuocEpRauQua (chữ biểu 2206.00.60)', 'lenMenTuNuocEpRauQua', 'Rượu thu được từ việc lên men nước ép rau hoặc nước ép quả, trừ nước ép nho tươi (SEN)', true, { bc: 'lên men nước ép rau hoặc nước ép quả' });
la('lenMenTuNuocEpRauQua — rượu vang trái cây', 'lenMenTuNuocEpRauQua', 'Rượu vang trái cây đóng chai 750ml', true);
la('lenMenTuNuocEpRauQua En', 'lenMenTuNuocEpRauQua', 'Wines obtained by the fermentation of vegetables juices or of fruit juices', true);
la('lenMenTuNuocEpRauQua Zh', 'lenMenTuNuocEpRauQua', '蔬菜汁或水果汁发酵所得的酒', true);
la('lenMenTuNuocEpRauQua KHÔNG', 'lenMenTuNuocEpRauQua', 'Đồ uống không phải lên men từ nước ép quả', false);
chuaBiet('lenMenTuNuocEpRauQua không bắt nhầm vang táo/lê 22060010', 'lenMenTuNuocEpRauQua', 'Vang táo hoặc vang lê');
chuaBiet('lenMenTuNuocEpRauQua không bắt nhầm rượu gạo 22060091', 'lenMenTuNuocEpRauQua', 'Rượu gạo khác (kể cả rượu gạo bổ)');
chuaBiet('lenMenTuNuocEpRauQua không bắt nhầm nước ép rau quả chưa lên men 2009', 'lenMenTuNuocEpRauQua', 'Nước ép quả hoặc nước ép rau chưa lên men');
la('laThietBiChoiBacHoacMatChuoc (tiêu đề 9504.90.3)', 'laThietBiChoiBacHoacMatChuoc', 'Thiết bị chơi bạc và đồ phụ trợ đi kèm', true, { bc: 'Thiết bị chơi bạc và đồ phụ trợ đi kèm' });
la('laThietBiChoiBacHoacMatChuoc (chữ biểu 9504.90.34)', 'laThietBiChoiBacHoacMatChuoc', 'Quân bài Mạt chược bằng gỗ, giấy hoặc plastic', true, { bc: 'Quân bài Mạt chược' });
la('laThietBiChoiBacHoacMatChuoc En', 'laThietBiChoiBacHoacMatChuoc', 'Gambling equipment and paraphernalia; mah-jong tiles', true);
la('laThietBiChoiBacHoacMatChuoc Zh', 'laThietBiChoiBacHoacMatChuoc', '麻将及赌博设备', true);
la('laThietBiChoiBacHoacMatChuoc KHÔNG', 'laThietBiChoiBacHoacMatChuoc', 'Trò chơi bàn không phải thiết bị chơi bạc', false);
chuaBiet('laThietBiChoiBacHoacMatChuoc không bắt nhầm đồ phụ trợ bowling 95049010', 'laThietBiChoiBacHoacMatChuoc', 'Các loại đồ phụ trợ để chơi bowling bằng plastic');
chuaBiet('laThietBiChoiBacHoacMatChuoc không bắt nhầm đồ chơi ném phi tiêu 9504902', 'laThietBiChoiBacHoacMatChuoc', 'Đồ chơi ném phi tiêu và các bộ phận và phụ kiện của chúng');
{
  const big1 = Array(8000).fill('nước ép rau quả tươi nguyên chất').join(' ');
  const big2 = Array(8000).fill('thiết bị chơi bowling và đồ phụ trợ').join(' ');
  const t0 = process.hrtime.bigint();
  const r1 = T.docGiaTri('lenMenTuNuocEpRauQua', big1);
  const r2 = T.docGiaTri('laThietBiChoiBacHoacMatChuoc', big2);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  check(`OZV-1742 ReDoS ~40.000 từ lặp cho 2 khoá mới < 2000 ms (thực tế ${ms.toFixed(0)} ms)`, r1.trangThai === 'CHUA_BIET' && r2.trangThai === 'CHUA_BIET' && ms < 2000, { ms });
}

// ── Lô 26 (OZV-1751, 21/11/2026) — ducLienKhongNoi (7311.00.2), mucCanToiDa (8423.82.3/4), mucDoTinhCheDau RBD_NBD (1516.20/1518.00), daCatThanhHinh cắt dập (4823.90.30) ──
la('ducLienKhongNoi (tiêu đề 7311.00.2)', 'ducLienKhongNoi', '7311002 Dạng hình trụ bằng thép đúc liền', true, { bc: 'đúc liền' });
la('ducLienKhongNoi — không mối hàn', 'ducLienKhongNoi', 'Bình chứa khí nén bằng thép không mối hàn dung tích 40 lít', true);
la('ducLienKhongNoi En', 'ducLienKhongNoi', 'Seamless steel cylinders for compressed gas', true);
la('ducLienKhongNoi Zh', 'ducLienKhongNoi', '无缝钢气瓶', true);
la('ducLienKhongNoi KHÔNG — bình hàn thân', 'ducLienKhongNoi', 'Bình LPG 12 kg hàn thân, dung tích 26 lít', false);
la('ducLienKhongNoi KHÔNG — welded', 'ducLienKhongNoi', 'Welded steel gas cylinder 50L', false);
chuaBiet('ducLienKhongNoi không bắt nhầm tai nghe không nối với micro 98343500', 'ducLienKhongNoi', 'Tai nghe có hoặc không nối với một bộ micro');
chuaBiet('ducLienKhongNoi không bắt nhầm thùng chứa thép thường 73110094', 'ducLienKhongNoi', 'Các loại thùng chứa khí nén hoặc khí hóa lỏng, bằng sắt hoặc thép.: Có dung tích từ 30 lít trở lên nhưng dưới 110 lít');
la('mucCanToiDa (tiêu đề 8423.82.3)', 'mucCanToiDa', '8423823 Có khả năng cân tối đa không quá 1.000 kg', 1000, { op: '<=', bc: 'không quá 1.000 kg' });
la('mucCanToiDa (tiêu đề 8423.82.4)', 'mucCanToiDa', '8423824 Có khả năng cân tối đa trên 1.000 kg', 1000, { op: '>', bc: 'trên 1.000 kg' });
la('mucCanToiDa — quy đổi tấn', 'mucCanToiDa', 'Cân sàn điện tử mức cân tối đa 2 tấn', 2000);
la('mucCanToiDa En', 'mucCanToiDa', 'Having a maximum weighing capacity not exceeding 1000 kg', 1000, { op: '<=' });
la('mucCanToiDa Zh', 'mucCanToiDa', '最大称量不超过1000千克', 1000, { op: '<=' });
chuaBiet('mucCanToiDa không bắt nhầm khối lượng tịnh của cân', 'mucCanToiDa', 'Cân bàn điện tử có khối lượng tịnh 60 kg');
la('mucDoTinhCheDau RBD_NBD (1516.20.24)', 'mucDoTinhCheDau', 'Của hạt cọ, đã tinh chế, tẩy và khử mùi (RBD)', 'RBD_NBD');
la('mucDoTinhCheDau RBD_NBD (1518.00.32)', 'mucDoTinhCheDau', 'Của dầu cọ hoặc olein hạt cọ, đã trung hòa hóa, tẩy và khử mùi (NBD) hoặc đã tinh chế, tẩy và khử mùi (RBD)', 'RBD_NBD');
la('mucDoTinhCheDau DA_TINH_CHE không nuốt RBD', 'mucDoTinhCheDau', 'Dầu hạt cọ đã tinh chế', 'DA_TINH_CHE');
{
  const big1 = Array(8000).fill('dạng hình trụ bằng thép có hoặc không nối với van').join(' ');
  const big2 = Array(8000).fill('cân bàn điện tử có khối lượng tịnh 60 kg').join(' ');
  const t0 = process.hrtime.bigint();
  const r1 = T.docGiaTri('ducLienKhongNoi', big1);
  const r2 = T.docGiaTri('mucCanToiDa', big2);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  check(`OZV-1751 ReDoS ~40.000 từ lặp cho ducLienKhongNoi & mucCanToiDa < 2000 ms (thực tế ${ms.toFixed(0)} ms)`, r1.trangThai === 'CHUA_BIET' && r2.trangThai === 'CHUA_BIET' && ms < 2000, { ms });
}

// ── Lô 26 (OZV-1756, 21/11/2026) — 7 khoá lô 6c (1602.90.20, 1905.32, 1905.40.10, 1905.90.60, 6306.19.10, 9303.90.10) ──
la('laChePhamTuTiet (chữ biểu 1602.90.20)', 'laChePhamTuTiet', 'Các chế phẩm từ tiết', true, { bc: 'Các chế phẩm từ tiết' });
la('laChePhamTuTiet — huyết lợn đóng khối', 'laChePhamTuTiet', 'Huyết lợn đóng khối đã luộc chín', true);
la('laChePhamTuTiet En', 'laChePhamTuTiet', 'Preparations of blood', true);
la('laChePhamTuTiet Zh', 'laChePhamTuTiet', '动物血制品', true);
la('laChePhamTuTiet KHÔNG', 'laChePhamTuTiet', 'Chế phẩm thịt dạng nhão không chứa tiết', false);
chuaBiet('laChePhamTuTiet không bắt nhầm ca-ri cừu 16029010', 'laChePhamTuTiet', 'Ca-ri cừu, đóng bao bì kín khí để bán lẻ');
la('daThemDuongMatOngTrungChatBeoPhoMatHoacTraiCay KHÔNG (chữ biểu 1905.40.10)', 'daThemDuongMatOngTrungChatBeoPhoMatHoacTraiCay', 'Chưa thêm đường, mật ong, trứng, chất béo, pho mát hoặc trái cây', false, { bc: 'Chưa thêm đường, mật ong, trứng, chất béo, pho mát hoặc trái cây' });
la('daThemDuongMatOngTrungChatBeoPhoMatHoacTraiCay CÓ — thêm trứng/bơ', 'daThemDuongMatOngTrungChatBeoPhoMatHoacTraiCay', 'Bánh mì nướng có thêm trứng và bơ', true);
la('daThemDuongMatOngTrungChatBeoPhoMatHoacTraiCay En KHÔNG', 'daThemDuongMatOngTrungChatBeoPhoMatHoacTraiCay', 'Not containing added sugar, honey, eggs, fats, cheese or fruit', false);
la('daThemDuongMatOngTrungChatBeoPhoMatHoacTraiCay Zh CÓ', 'daThemDuongMatOngTrungChatBeoPhoMatHoacTraiCay', '已添加蜂蜜的烤面包', true);
chuaBiet('daThemDuongMatOngTrungChatBeoPhoMatHoacTraiCay chỉ nói không thêm đường (chưa rõ trứng/bơ/pho mát/trái cây)', 'daThemDuongMatOngTrungChatBeoPhoMatHoacTraiCay', 'Bánh mì nướng không thêm đường');
la('loaiBanhWaffleWafer BANH_WAFFLES (chữ biểu 1905.32.10)', 'loaiBanhWaffleWafer', 'Bánh waffles (SEN)', 'BANH_WAFFLES');
la('loaiBanhWaffleWafer BANH_XOP_WAFERS (chữ biểu 1905.32.20)', 'loaiBanhWaffleWafer', 'Bánh xốp wafers (SEN)', 'BANH_XOP_WAFERS');
la('loaiBanhWaffleWafer En', 'loaiBanhWaffleWafer', 'Crispy chocolate wafers', 'BANH_XOP_WAFERS');
la('loaiBanhWaffleWafer Zh', 'loaiBanhWaffleWafer', '比利时华夫饼', 'BANH_WAFFLES');
chuaBiet('loaiBanhWaffleWafer không bắt cụm tiêu đề cha "Bánh waffles và bánh xốp wafers"', 'loaiBanhWaffleWafer', 'Bánh waffles và bánh xốp wafers');
chuaBiet('loaiBanhWaffleWafer không bắt bánh xốp sealing wafers 19059070', 'loaiBanhWaffleWafer', 'Bánh thánh, bánh xốp sealing wafers, bánh đa');
la('dungTrongDuocPham (chữ biểu 1905.90.60)', 'dungTrongDuocPham', 'Vỏ viên nhộng và sản phẩm tương tự dùng trong dược phẩm', true, { bc: 'dùng trong dược phẩm' });
la('dungTrongDuocPham En', 'dungTrongDuocPham', 'Empty cachets of a kind suitable for pharmaceutical use', true);
la('dungTrongDuocPham Zh', 'dungTrongDuocPham', '供药用的空囊', true);
la('dungTrongDuocPham KHÔNG', 'dungTrongDuocPham', 'Vỏ bánh không dùng trong dược phẩm', false);
la('dungChoXeKeoMay8429Hoac8430XeNangHoacXepDo CÓ (tiêu đề 4011.80.3)', 'dungChoXeKeoMay8429Hoac8430XeNangHoacXepDo', 'Lắp vành có đường kính trên 24 inch, loại dùng cho xe kéo, máy thuộc nhóm 84.29 hoặc 84.30, xe nâng hàng hoặc xe và máy xếp dỡ công nghiệp khác', true);
la('dungChoXeKeoMay8429Hoac8430XeNangHoacXepDo CÓ — dùng cho xe kéo', 'dungChoXeKeoMay8429Hoac8430XeNangHoacXepDo', 'Lốp cao su dùng cho xe kéo công nghiệp', true);
la('dungChoXeKeoMay8429Hoac8430XeNangHoacXepDo KHÔNG (chữ biểu 4011.80.40)', 'dungChoXeKeoMay8429Hoac8430XeNangHoacXepDo', 'Lắp vành có đường kính trên 24 inch, loại khác', false);
la('dungChoXeKeoMay8429Hoac8430XeNangHoacXepDo En CÓ', 'dungChoXeKeoMay8429Hoac8430XeNangHoacXepDo', 'Tyres used on tractors or forklifts', true);
la('dungChoXeKeoMay8429Hoac8430XeNangHoacXepDo Zh CÓ', 'dungChoXeKeoMay8429Hoac8430XeNangHoacXepDo', '用于叉车的轮胎', true);
la('tuSoiDetThucVatNhom5305 (chữ biểu 6306.19.10)', 'tuSoiDetThucVatNhom5305', 'Từ sợi dệt thực vật thuộc nhóm 53.05', true, { bc: 'Từ sợi dệt thực vật thuộc nhóm 53.05' });
la('tuSoiDetThucVatNhom5305 — từ xơ dừa / sisal', 'tuSoiDetThucVatNhom5305', 'Tấm bạt từ xơ dừa', true);
la('tuSoiDetThucVatNhom5305 En', 'tuSoiDetThucVatNhom5305', 'Of vegetable textile fibres of heading 53.05', true);
la('tuSoiDetThucVatNhom5305 Zh', 'tuSoiDetThucVatNhom5305', '税目53.05的植物纺织纤维制', true);
la('tuSoiDetThucVatNhom5305 KHÔNG — tấm bạt đay (53.03)', 'tuSoiDetThucVatNhom5305', 'Tấm bạt bằng sợi đay', false);
la('tuSoiDetThucVatNhom5305 KHÔNG — vải lanh (53.01)', 'tuSoiDetThucVatNhom5305', 'Tấm che nắng bằng vải lanh', false);
la('chiDePhongPhaoHieu (chữ biểu 9303.90.10)', 'chiDePhongPhaoHieu', 'Súng lục bắn pháo hiệu và các loại khác được thiết kế chỉ để phóng pháo hiệu có cỡ nòng từ 20 mm trở lên nhưng trừ cỡ 23 mm và 26,5 mm', true);
la('chiDePhongPhaoHieu — thiết bị phóng pháo hiệu', 'chiDePhongPhaoHieu', 'Thiết bị phóng pháo hiệu cứu sinh trên biển', true);
la('chiDePhongPhaoHieu En', 'chiDePhongPhaoHieu', 'Very pistols and other devices designed to project only signal flares', true);
la('chiDePhongPhaoHieu Zh', 'chiDePhongPhaoHieu', '信号枪及专门设计仅用于发射信号弹的其他装置', true);
la('chiDePhongPhaoHieu KHÔNG', 'chiDePhongPhaoHieu', 'Súng hơi không phải thiết kế chỉ để phóng pháo hiệu', false);
la('coNong23Hoac265mm KHÔNG (chữ biểu 9303.90.10)', 'coNong23Hoac265mm', 'Súng lục bắn pháo hiệu và các loại khác được thiết kế chỉ để phóng pháo hiệu có cỡ nòng từ 20 mm trở lên nhưng trừ cỡ 23 mm và 26,5 mm', false, { bc: 'trừ cỡ 23 mm và 26,5 mm' });
la('coNong23Hoac265mm CÓ — cỡ nòng 26,5 mm', 'coNong23Hoac265mm', 'Súng bắn pháo hiệu cỡ nòng 26,5 mm', true);
la('coNong23Hoac265mm CÓ — cỡ 23 mm', 'coNong23Hoac265mm', 'Súng pháo hiệu cỡ 23 mm', true);
la('coNong23Hoac265mm KHÔNG — cỡ nòng 25 mm', 'coNong23Hoac265mm', 'Thiết bị phóng pháo hiệu cỡ nòng 25 mm', false);
la('coNong23Hoac265mm En CÓ', 'coNong23Hoac265mm', 'Signal flare pistol calibre 26.5 mm', true);
la('coNong23Hoac265mm Zh CÓ', 'coNong23Hoac265mm', '口径26.5毫米信号枪', true);
{
  const big = Array(8000).fill('bánh mì nướng giòn đóng gói bán lẻ').join(' ');
  const t0 = process.hrtime.bigint();
  for (const k of ['laChePhamTuTiet', 'daThemDuongMatOngTrungChatBeoPhoMatHoacTraiCay', 'loaiBanhWaffleWafer', 'dungTrongDuocPham', 'dungChoXeKeoMay8429Hoac8430XeNangHoacXepDo', 'tuSoiDetThucVatNhom5305', 'chiDePhongPhaoHieu', 'coNong23Hoac265mm']) {
    const r = T.docGiaTri(k, big);
    if (r.trangThai !== 'CHUA_BIET') throw new Error(`Expected CHUA_BIET for ${k}`);
  }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  check(`OZV-1756 ReDoS ~40.000 từ lặp cho 8 khoá mới < 2000 ms (thực tế ${ms.toFixed(0)} ms)`, ms < 2000, { ms });
}

// ── 5. Viết + kiểm giá trị ───────────────────────────────────────────────────────────────────────────────────────────
const viet = (khoa, v) => { try { return T.vietCum(khoa, v); } catch (e) { return `LOI ${e.message}`; } };
check('vietCum soLoi 2 ⇒ "2 lõi" (đơn vị đếm cách số)', viet('soLoi', 2) === '2 lõi', viet('soLoi', 2));
check('vietCum soSoi 7 ⇒ "7 sợi"', viet('soSoi', 7) === '7 sợi', viet('soSoi', 7));
check('vietCum tiLe 0.1 ⇒ "tỉ lệ 0,1 lần"', viet('tiLe', 0.1) === 'tỉ lệ 0,1 lần', viet('tiLe', 0.1));
check('vietCum phuongPhapCheTao REN ⇒ "được rèn"', viet('phuongPhapCheTao', 'REN') === 'được rèn', viet('phuongPhapCheTao', 'REN'));
check('vietCum nhienLieu GA/DIEN ⇒ "dùng ga"/"dùng điện"; daXuLyBeMat true/false', viet('nhienLieu', 'GA') === 'dùng ga' && viet('nhienLieu', 'DIEN') === 'dùng điện' && viet('daXuLyBeMat', true) === 'đã xử lý bề mặt' && viet('daXuLyBeMat', false) === 'chưa xử lý bề mặt', [viet('nhienLieu', 'GA'), viet('nhienLieu', 'DIEN'), viet('daXuLyBeMat', true), viet('daXuLyBeMat', false)]);
check('vietCum 4 khoá lát 2: phuongPhapIn BATIK ⇒ "in batik truyền thống"; tinhDanHoi true/false; loaiSoiDet BONG ⇒ "từ bông"; doDay 6 ⇒ "dày 6mm"', viet('phuongPhapIn', 'BATIK') === 'in batik truyền thống' && viet('tinhDanHoi', true) === 'đàn hồi' && viet('tinhDanHoi', false) === 'không đàn hồi' && viet('loaiSoiDet', 'BONG') === 'từ bông' && viet('loaiSoiDet', 'LEN_LONG_DONG_VAT_MIN') === 'từ len' && viet('doDay', 6) === 'dày 6mm', [viet('phuongPhapIn', 'BATIK'), viet('tinhDanHoi', true), viet('tinhDanHoi', false), viet('loaiSoiDet', 'BONG'), viet('loaiSoiDet', 'LEN_LONG_DONG_VAT_MIN'), viet('doDay', 6)]);
check('vietCum phuongThucTruyenDan VO_TUYEN ⇒ "truyền dẫn vô tuyến"', viet('phuongThucTruyenDan', 'VO_TUYEN') === 'truyền dẫn vô tuyến' && viet('phuongThucTruyenDan', 'HUU_TUYEN') === 'truyền dẫn hữu tuyến', [viet('phuongThucTruyenDan', 'VO_TUYEN'), viet('phuongThucTruyenDan', 'HUU_TUYEN')]);
check('vietCum chiHoacChuYeu true/false ⇒ không chép chữ biểu "chỉ hoặc chủ yếu"', viet('chiHoacChuYeu', true) === 'chuyên dùng' && viet('chiHoacChuYeu', false) === 'loại dùng chung', [viet('chiHoacChuYeu', true), viet('chiHoacChuYeu', false)]);
check('vietCum daNapChuongTrinh true/false', viet('daNapChuongTrinh', true) === 'đã nạp chương trình' && viet('daNapChuongTrinh', false) === 'chưa nạp chương trình', [viet('daNapChuongTrinh', true), viet('daNapChuongTrinh', false)]);
check('vietCum đơn vị @1 KHÔNG đổi ("CS: 75000W" — không cách)', T.vietCum('congSuat', 75000, { tat: true }) === 'CS: 75000W', T.vietCum('congSuat', 75000, { tat: true }));

// ── 5b. Khoá SO: đơn vị viết ĐÚNG MỘT LẦN (OZV-325) ─────────────────────────────────────────────────────────────────
// `vietCum` kiểu SO TỰ chèn donViChuan sau số (dòng lib/tu-vung.js "đơn vị ghi MỘT lần ở cuối"), nên khuôn `cachViet.vi`
// KHÔNG được ghi lại đơn vị. 46/73 khoá SO ghi lặp ⇒ máy viết ra "độ tinh khiết 12,5%%", "thể tích 12,5cm3 cm3" —
// chữ này đi thẳng vào mô tả khai báo Hải quan (lib/ho-so/viet-mo-ta.js#cumGiaTri) và vào productText của ca kiểm.
// Rào là CƠ CHẾ, không phải danh sách: quét mọi khoá SO, khoá mới thêm sai cũng đỏ ngay.
{
  const tv2 = T.taiTuVung();
  const lap = [];
  for (const k of tv2.khoa) {
    if (k.kieu !== 'SO') continue;
    const dv = k.donViChuan;
    if (!dv) continue;
    let s = null; try { s = T.vietCum(k.khoa, 12.5); } catch { s = null; }
    if (typeof s !== 'string') continue;
    if (s.split(dv).length - 1 >= 2) lap.push([k.khoa, s]);
  }
  check(`vietCum khoá SO: đơn vị viết đúng MỘT lần (0/${tv2.khoa.filter((k) => k.kieu === 'SO').length} khoá lặp)`, lap.length === 0, lap.slice(0, 8));
  // hai ca CÓ TÊN: "%%" (độ tinh khiết) và "cm3 cm3" (thể tích) — đây là chữ đi vào mô tả khai báo
  check('vietCum doTinhKhiet 12,5 ⇒ "độ tinh khiết 12,5%" (một dấu %)', T.vietCum('doTinhKhiet', 12.5) === 'độ tinh khiết 12,5%', T.vietCum('doTinhKhiet', 12.5));
  check('vietCum theTich 12,5 ⇒ "thể tích 12,5cm3" (đơn vị một lần)', T.vietCum('theTich', 12.5) === 'thể tích 12,5cm3', T.vietCum('theTich', 12.5));
  // cụm sau đơn vị giữ nguyên: đơn vị chèn ở {giaTri}, phần đuôi "tính theo khối lượng" không mất
  check('vietCum hamLuongProtein 12,5 ⇒ "hàm lượng protein 12,5% tính theo khối lượng"', T.vietCum('hamLuongProtein', 12.5) === 'hàm lượng protein 12,5% tính theo khối lượng', T.vietCum('hamLuongProtein', 12.5));
  // hai thang viết đơn vị TRONG khuôn, ở chỗ chữ biểu đặt nó (donViTrongKhuon) — không chèn thêm ⇒ không ra "RON 95RON"
  check('vietCum triSoOctan 95 ⇒ "RON 95" (đơn vị trước số, chữ biểu 2710.12.11)', T.vietCum('triSoOctan', 95) === 'RON 95', T.vietCum('triSoOctan', 95));
  check('vietCum doTruongNoBloom 250 ⇒ "độ trương nở Bloom thang A-250" (chữ biểu 3503.00.41)', T.vietCum('doTruongNoBloom', 250) === 'độ trương nở Bloom thang A-250', T.vietCum('doTruongNoBloom', 250));
  check('triSoOctan/doTruongNoBloom: chữ máy viết đọc ngược ra đúng giá trị', T.docGiaTri('triSoOctan', T.vietCum('triSoOctan', 95)).giaTri === 95 && T.docGiaTri('doTruongNoBloom', T.vietCum('doTruongNoBloom', 250)).giaTri === 250, [T.docGiaTri('triSoOctan', 'RON 95'), T.docGiaTri('doTruongNoBloom', T.vietCum('doTruongNoBloom', 250))]);
  // doXop KHÔNG dùng cờ: bỏ cụm đuôi "đơn vị CORESTA" để vietCum tự chèn ⇒ đọc ngược ĐẠT (trước đây CHUA_BIET)
  check('vietCum doXop 95 ⇒ "độ xốp 95CORESTA" và đọc ngược ra 95 (chữ biểu 4813.20.22)', T.vietCum('doXop', 95) === 'độ xốp 95CORESTA' && T.docGiaTri('doXop', T.vietCum('doXop', 95)).giaTri === 95, [T.vietCum('doXop', 95), T.docGiaTri('doXop', T.vietCum('doXop', 95))]);
  // bất biến thật của việc vá: KHÔNG khoá SO nào đọc ngược xấu đi so với nền (nền = 70/73 đạt)
  {
    const so = T.taiTuVung().khoa.filter((k) => k.kieu === 'SO');
    const dat = so.filter((k) => { let s; try { s = T.vietCum(k.khoa, 95); } catch { return false; } let r; try { r = T.docGiaTri(k.khoa, s); } catch { return false; } return r?.trangThai === 'DA_CO' && r.giaTri === 95; });
    check(`vietCum khoá SO: ≥ 70/${so.length} khoá đọc ngược đạt (mốc nền origin/main 70 — không khoá nào xấu đi)`, dat.length >= 70, { dat: dat.length, n: so.length, chua: so.filter((k) => !dat.includes(k)).map((k) => k.khoa) });
  }
}

// ── 5c. Lược đồ chặn trước: cachViet.vi của khoá SO không được chứa donViChuan (OZV-325) ────────────────────────────
{
  const tv2 = clone(T.taiTuVung());
  const k = tv2.khoa.find((x) => x.khoa === 'doTinhKhiet');
  k.cachViet = { ...k.cachViet, vi: 'độ tinh khiết {giaTri}%' };   // đúng kiểu sai đã có trên main
  const loi = T.kiemTuVung(tv2).map((x) => (typeof x === 'string' ? x : x.ma || x.loi || JSON.stringify(x)));
  check('kiemTuVung: cachViet.vi khoá SO lặp donViChuan ⇒ báo "so-cach-viet-lap-don-vi"', loi.some((x) => String(x).includes('so-cach-viet-lap-don-vi')), loi.slice(0, 6));
  check('kiemTuVung: tu-vung@2 thật KHÔNG còn lỗi lặp đơn vị', !T.kiemTuVung(T.taiTuVung()).map((x) => JSON.stringify(x)).some((x) => x.includes('so-cach-viet-lap-don-vi')));
  // cờ donViTrongKhuon không được dùng để "tắt rào" lặng lẽ: khai cờ thì phải có ghiChu dẫn chữ biểu
  const tv3 = clone(T.taiTuVung());
  const k3 = tv3.khoa.find((x) => x.khoa === 'doTinhKhiet');
  k3.donViTrongKhuon = true; delete k3.ghiChu;
  check('kiemTuVung: khai donViTrongKhuon mà không có ghiChu chữ biểu ⇒ "so-don-vi-trong-khuon-thieu-ghi-chu"', T.kiemTuVung(tv3).map((x) => JSON.stringify(x)).some((x) => x.includes('so-don-vi-trong-khuon-thieu-ghi-chu')), T.kiemTuVung(tv3).slice(0, 5));
  check('đúng 2 khoá khai donViTrongKhuon (triSoOctan, doTruongNoBloom) và đều có ghiChu dẫn chữ biểu', (() => { const ds = T.taiTuVung().khoa.filter((x) => x.donViTrongKhuon); return ds.length === 2 && ds.every((x) => String(x.ghiChu || '').trim()) && ds.map((x) => x.khoa).sort().join(',') === 'doTruongNoBloom,triSoOctan'; })(), T.taiTuVung().khoa.filter((x) => x.donViTrongKhuon).map((x) => x.khoa));
  // cờ chỉ dành cho kiểu SO (bảng co-chi-cho-kieu)
  const tv4 = clone(T.taiTuVung());
  tv4.khoa.find((x) => x.kieu === 'CO_KHONG').donViTrongKhuon = true;
  check('kiemTuVung: donViTrongKhuon đặt ở khoá không phải SO ⇒ "co-chi-cho-kieu"', T.kiemTuVung(tv4).map((x) => JSON.stringify(x)).some((x) => x.includes('co-chi-cho-kieu') && x.includes('donViTrongKhuon')), T.kiemTuVung(tv4).slice(0, 5));
}
{ const kg = (v) => { try { return T.kiemGiaTri('phuongPhapCheTao', v).trangThai; } catch { return 'LOI'; } };
  check('kiemGiaTri phuongPhapCheTao: "RANG" ngoài danh sách ⇒ CHUA_BIET; ["DUC","DAP"] ⇒ DA_CO', kg('RANG') === 'CHUA_BIET' && kg(['DUC', 'DAP']) === 'DA_CO'); }
{ const ch = (l) => { try { return T.cauHoiCho('daNapChuongTrinh', l); } catch { return ''; } };
  check('cauHoiCho daNapChuongTrinh hỏi "nạp chương trình" (Vi) và "烧录" (Zh)', /nạp chương trình/.test(ch('vi')) && /烧录/.test(ch('zh')), [ch('vi'), ch('zh')]); }

// ── 6. Bảng hiệu chỉnh tiền lệ 853710 hỏi daNapChuongTrinh (CEO 30/10: "chưa chốt, hỏi lại người khai") ─────────────
{
  const HC = require('../lib/ho-so/hieu-chinh.js');
  const bang = JSON.parse(fs.readFileSync('data/ho-so/hieu-chinh-tien-le.json', 'utf8'));
  // GĐ soát #678: chỉ -02 (bảng mạch chưa nạp chương trình, TB 4040/1159) hỏi daNapChuongTrinh; -01 (bộ xử lý lập trình MSP430FR)
  // hỏi khoá @1 coBoXuLyLapTrinh — đúng chữ 8537.10.12 "có trang bị bộ xử lý lập trình"; -03 (module LED, hai dòng cùng 15 %) không hỏi.
  const fpb = (id) => bang.muc.find((x) => x.id === id)?.factPhanBiet;
  check('853710-02: factPhanBiet = ["daNapChuongTrinh"]', JSON.stringify(fpb('853710-02')) === '["daNapChuongTrinh"]', fpb('853710-02'));
  check('853710-01: factPhanBiet = ["coBoXuLyLapTrinh"] (khoá @1, chữ 8537.10.12)', JSON.stringify(fpb('853710-01')) === '["coBoXuLyLapTrinh"]' && T.layKhoa('coBoXuLyLapTrinh').nhanVi === 'có trang bị bộ xử lý lập trình', fpb('853710-01'));
  check('853710-03: không có factPhanBiet (không chênh thuế, không dữ kiện phân biệt)', fpb('853710-03') === undefined, fpb('853710-03'));
  const kq = HC.kiemBang(bang);
  check('bảng hiệu chỉnh thật qua máy kiểm (factPhanBiet daNapChuongTrinh hợp lệ)', kq.hopLe && kq.loi.length === 0, kq.loi);
  const hong = clone(bang);
  hong.muc.find((x) => x.id === '853710-02').factPhanBiet = ['khoaKhongCo'];
  const kq2 = HC.kiemBang(hong);
  check('máy kiểm ĐỎ khi factPhanBiet có khoá ngoài tu-vung (hc-fact-phan-biet)', kq2.loi.some((l) => l.startsWith('hc-fact-phan-biet:853710-02')), kq2.loi);
  const hong2 = clone(bang);
  hong2.muc.find((x) => x.id === '853710-02').factPhanBiet = 'daNapChuongTrinh';
  check('máy kiểm ĐỎ khi factPhanBiet không phải mảng', HC.kiemBang(hong2).loi.some((l) => l.startsWith('hc-fact-phan-biet:853710-02')), HC.kiemBang(hong2).loi);
}

// ── 7. Gói soạn ranh giới: ý đã có khoá ⇒ gợi ý khoá, không còn "nghi thiếu khoá" ─────────────────────────────────
{
  const C = require('../lib/ho-so/cong-ranh-gioi.js');
  const muc = (pn6, ma) => C.goiSoan(pn6).canSoHoa.find((x) => x.ma === ma) || {};
  for (const [pn6, ma, khoa] of [['841459', '84145910', 'chiHoacChuYeu'], ['842010', '84201010', 'chiHoacChuYeu'], ['854442', '85444291', 'soSoi'], ['761699', '76169930', 'tiLe'], ['761699', '76169980', 'phuongPhapCheTao']]) {
    const x = muc(pn6, ma);
    check(`gói soạn ${ma}: gợi ý khoá ${khoa} (goiYKhoa), không còn nghiThieuKhoa`, !x.nghiThieuKhoa && (x.goiYKhoa || []).some((g) => g.includes(khoa)), { nghi: x.nghiThieuKhoa, goiY: x.goiYKhoa });
  }
  const g = C.goiSoan('854442');
  check('gói soạn liệt kê khoá mới trong tuVung', Object.keys(KHOA_MOI).every((k) => g.tuVung.some((x) => x.khoa === k)), g.tuVung.map((x) => x.khoa).slice(-10));
}

// ── 8. Điều kiện có kiểu dùng khoá mới qua máy kiểm dieuKienSo (cổng 0/3 của bản nháp) trên CHÍNH chữ biểu ─────────────
{
  const DK = require('../lib/dieu-kien-so.js');
  const tax = JSON.parse(fs.readFileSync('data/tax.json', 'utf8'));
  const K = (c, hs) => { try { return DK.kiemDieuKien(c, tax[hs].vn); } catch (e) { return `LOI ${e.message}`; } };
  const dat = (ten, c, hs) => check(`dieuKienSo ${ten} trên tax.${hs} ⇒ đạt`, K(c, hs) === null, K(c, hs));
  const truot = (ten, c, hs, ma) => check(`dieuKienSo ${ten} trên tax.${hs} ⇒ lỗi ${ma}`, String(K(c, hs)).startsWith(ma), K(c, hs));
  dat('chiHoacChuYeu CO', { fact: 'chiHoacChuYeu', op: 'CO' }, '84145910');
  dat('chiHoacChuYeu CO', { fact: 'chiHoacChuYeu', op: 'CO' }, '85371020');
  dat('chiHoacChuYeu CO', { fact: 'chiHoacChuYeu', op: 'CO' }, '84201010');
  dat('thietKeChoTreEm CO', { fact: 'thietKeChoTreEm', op: 'CO' }, '95030080');
  dat('soSoi >= 2 sợi ("hai sợi hoặc hơn" — số chữ đọc được)', { fact: 'soSoi', op: '>=', value: 2, donVi: 'sợi' }, '85444291');
  truot('soSoi >= 3 sợi (ngưỡng không có trong trích)', { fact: 'soSoi', op: '>=', value: 3, donVi: 'sợi' }, '85444291', 'dieu-kien-so-nguong-khong-co-trong-trich');
  truot('soSoi > 2 sợi (op lệch chữ "hoặc hơn" = >=)', { fact: 'soSoi', op: '>', value: 2, donVi: 'sợi' }, '85444291', 'dieu-kien-so-nguong-khong-co-trong-trich');
  dat('tiLe > 0.1 lần ("trên 1/10 đường kính")', { fact: 'tiLe', op: '>', value: 0.1, donVi: 'lần' }, '76169930');
  truot('tiLe <= 0.1 lần (op lệch "trên")', { fact: 'tiLe', op: '<=', value: 0.1, donVi: 'lần' }, '76169930', 'dieu-kien-so-nguong-khong-co-trong-trich');
  dat('phuongPhapCheTao TRONG [DOT_DAP_KEO_GIAN]', { fact: 'phuongPhapCheTao', op: 'TRONG', value: ['DOT_DAP_KEO_GIAN'] }, '76169980');
  dat('daXuLyBeMat CO ("đã được xử lý bề mặt")', { fact: 'daXuLyBeMat', op: 'CO' }, '84818097');
  dat('nhienLieu TRONG [GA] ("bằng ga")', { fact: 'nhienLieu', op: 'TRONG', value: ['GA'] }, '84818030');
  truot('nhienLieu TRONG [DIEN] (chữ biểu "bằng ga")', { fact: 'nhienLieu', op: 'TRONG', value: ['DIEN'] }, '84818030', 'dieu-kien-so-trong-khong-co-trong-trich');
  // khoá @1: ngưỡng vẫn phải có nguyên văn (không nới máy kiểm cho khoá cũ)
  check('dieuKienSo khoá @1 không đổi: duongKinhLoi <= 6 mm trên "không quá 5 mm" ⇒ lỗi ngưỡng', DK.kiemDieuKien({ fact: 'duongKinhLoi', op: '<=', value: 6, donVi: 'mm' }, 'mỗi lõi có đường kính không quá 5 mm') === 'dieu-kien-so-nguong-khong-co-trong-trich:6');
}

// ── 6. #680 tên hàng (docTenLoaiDayDu) giữ cụm danh từ chứa "không" — docGiaTri('tenLoai') @1 KHÔNG đổi (vân tay mục 3) ────
{
  const giu = [
    ['Bình giữ nhiệt chân không', 'bình giữ nhiệt chân không'], ['máy hút chân không', 'máy hút chân không'],
    ['điều hòa không khí', 'điều hòa không khí'], ['thép không gỉ', 'thép không gỉ'], ['tai nghe không dây', 'tai nghe không dây'],
    ['Bình giữ nhiệt chân không, hàng hoàn chỉnh, không nhãn hiệu, mới 100%', 'bình giữ nhiệt chân không'],
    ['Máy điều hòa không khí loại treo tường', 'máy điều hòa không khí'], ['Xe đẩy thép không gỉ có bánh xe', 'xe đẩy thép không gỉ'],
  ];
  for (const [t, ten] of giu) {
    const r = typeof T.docTenLoaiDayDu === 'function' ? T.docTenLoaiDayDu(t) : null;
    check(`#680 tên "${t}" ⇒ "${ten}" (bangChung nguyên văn)`, r?.trangThai === 'DA_CO' && r.giaTri === ten && coTrong(r, t), r);
  }
  // phủ định thật vẫn cắt tên: "không nhãn hiệu" không bao giờ vào tên
  const cat = [
    ['Bình giữ nhiệt không nhãn hiệu', 'bình giữ nhiệt'], ['Bình giữ nhiệt chân không không nhãn hiệu', 'bình giữ nhiệt chân không'],
    ['Tai nghe không dây không nhãn hiệu', 'tai nghe không dây'], ['Hàng không có bánh xe', 'hàng'],
    ['Máy khoan không chỉ dùng để khoan', 'máy khoan'],
  ];
  for (const [t, ten] of cat) {
    const r = typeof T.docTenLoaiDayDu === 'function' ? T.docTenLoaiDayDu(t) : null;
    check(`#680 phủ định thật: "${t}" ⇒ "${ten}"`, r?.trangThai === 'DA_CO' && r.giaTri === ten && !/nhãn/.test(r.giaTri) && coTrong(r, t), r);
  }
  check('#680 chữ rỗng ⇒ CHUA_BIET', typeof T.docTenLoaiDayDu === 'function' && T.docTenLoaiDayDu('  ').trangThai === 'CHUA_BIET');
  // docGiaTri('tenLoai') giữ cách đọc @1 (bench lát 1 khoá theo @1) — chỉ đường tên hồ sơ đọc đầy đủ
  check('#680 docGiaTri("tenLoai") không đổi (@1): "Bình giữ nhiệt chân không" ⇒ "bình giữ nhiệt chân"', T.docGiaTri('tenLoai', 'Bình giữ nhiệt chân không').giaTri === 'bình giữ nhiệt chân');
}

// OZV-1514 — chặn hồi quy hiệu năng: boGiaPhuDinh từng replace TOÀN CHUỖI cho mỗi match (biPhuDinh gọi từ
// phuDinhCaDoan + truocTrongMenhDeBo) ⇒ docGiaTri trên chữ nhiều match là O(n²): 2000 từ lặp 2,3 s, 4000 từ 9,5 s
// trên main 17/11. Sau cache 1 phần tử: 4000 từ ~63 ms. Ngưỡng 300 ms là khuôn thẻ (sau vá dư ~5 lần; main trước
// vá vượt 30 lần ⇒ đỏ đúng chỗ). Máy đo phải nhàn (CLAUDE.md quy tắc 9: loadavg > số lõi thì số đo vô nghĩa).
{
  const text = Array(4000).fill('công tắc micro').join(', ');
  T.docGiaTri('loaiCongTac', text); // vòng làm nóng JIT/nạp từ vựng — không tính vào số đo
  const t0 = process.hrtime.bigint();
  const r = T.docGiaTri('loaiCongTac', text);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  check(`OZV-1514 docGiaTri('loaiCongTac') 4000 từ lặp < 300 ms (thực tế ${ms.toFixed(0)} ms)`, r.trangThai === 'DA_CO' && r.giaTri === 'NGAT_SOC_DONG' && ms < 300, { ms, trangThai: r.trangThai, giaTri: r.giaTri });
}

// OZV-1753 — kiểm chứng 4 khoá mới (lucRungTrong, hamLuongChatRanKhongChuaMuoi, laPhanChimDoi, laSanPhamCaoSuCung)
// và mở rộng vatLieuKhac (VANG_HOAC_BAC, KIM_LOAI_DAT_PHU_VANG_HOAC_BAC) + ReDoS 40.000 từ lặp < 2 giây (quy tắc 6b).
{
  // 1. lucRungTrong (8429.40.40)
  la('chữ biểu 8429.40.40', 'lucRungTrong', 'Xe lu rung, với lực rung của trống không quá 20 tấn tính theo khối lượng', 20, { op: '<=' });
  la('mô tả hàng thật 15 tấn', 'lucRungTrong', 'Xe lu rung tự hành, lực rung của trống 15 tấn', 15, { op: null });
  la('En centrifugal force drum (quy đổi kg → tấn)', 'lucRungTrong', 'Vibratory smooth drum rollers, with a centrifugal force drum not exceeding 20000 kg', 20, { op: '<=' });
  la('Zh 滚筒激振力 (quy đổi 公斤 → tấn)', 'lucRungTrong', '压路机，滚筒激振力 18000公斤', 18, { op: null });
  chuaBiet('chỉ ghi khối lượng máy, không ghi lực rung', 'lucRungTrong', 'Xe lu rung tự hành khối lượng bản thân 12 tấn');

  // 2. vatLieuKhac — VANG_HOAC_BAC & KIM_LOAI_DAT_PHU_VANG_HOAC_BAC (7115.90.10 / 7115.90.20)
  la('chữ biểu 7115.90.10 (bằng vàng hoặc bạc)', 'vatLieuKhac', 'Bằng vàng hoặc bạc', 'VANG_HOAC_BAC');
  la('hàng thật khai đơn chất bằng vàng', 'vatLieuKhac', 'Chén nung phòng thí nghiệm bằng vàng', 'VANG_HOAC_BAC');
  la('hàng thật khai đơn chất bằng bạc', 'vatLieuKhac', 'Nồi nấu kim loại bằng bạc nguyên chất', 'VANG_HOAC_BAC');
  la('En of gold', 'vatLieuKhac', 'Crucibles of gold for laboratory use', 'VANG_HOAC_BAC');
  la('En of silver', 'vatLieuKhac', 'Articles of silver', 'VANG_HOAC_BAC');
  la('chữ biểu 7115.90.20 (kim loại dát phủ vàng hoặc bạc)', 'vatLieuKhac', 'Bằng kim loại dát phủ vàng hoặc bạc', 'KIM_LOAI_DAT_PHU_VANG_HOAC_BAC');
  la('hàng thật kim loại dát phủ vàng', 'vatLieuKhac', 'Sản phẩm bằng kim loại dát phủ vàng', 'KIM_LOAI_DAT_PHU_VANG_HOAC_BAC');
  la('hàng thật kim loại dát phủ bạc', 'vatLieuKhac', 'Sản phẩm kim loại dát phủ bạc', 'KIM_LOAI_DAT_PHU_VANG_HOAC_BAC');
  la('En metal clad with gold', 'vatLieuKhac', 'Articles of metal clad with gold', 'KIM_LOAI_DAT_PHU_VANG_HOAC_BAC');
  la('kim loại thường mạ vàng khớp VANG_HOAC_MA_VANG, không khớp nhầm VANG_HOAC_BAC', 'vatLieuKhac', 'Đồ trang sức mỹ ký bằng đồng mạ vàng', 'VANG_HOAC_MA_VANG');

  // 3. laSanPhamCaoSuCung (4017.00.20)
  la('chữ biểu 4017.00.20', 'laSanPhamCaoSuCung', 'Các sản phẩm bằng cao su cứng khác', true);
  la('hàng thật khai tên riêng bằng cao su cứng', 'laSanPhamCaoSuCung', 'Vỏ bình ắc quy bằng cao su cứng (ebonit)', true);
  la('phế liệu cao su cứng ⇒ false', 'laSanPhamCaoSuCung', 'Phế liệu và phế thải cao su cứng', false);
  la('cao su cứng dạng tấm thô ⇒ false', 'laSanPhamCaoSuCung', 'Cao su cứng ở dạng tấm', false);

  // 4. laPhanChimDoi (3101.00.92)
  la('chữ biểu 3101.00.92 (trừ phân chim, dơi)', 'laPhanChimDoi', 'Nguồn gốc từ động vật (trừ phân chim, dơi), đã qua xử lý hóa học', false);
  la('khai riêng phân chim', 'laPhanChimDoi', 'Phân chim tự nhiên đóng bao', true);
  la('khai riêng phân dơi', 'laPhanChimDoi', 'Phân dơi nguyên chất đã xử lý', true);

  // 5. hamLuongChatRanKhongChuaMuoi (2002.90.10 SEN)
  la('chữ SEN 2002.90.10 (25% đến 40%)', 'hamLuongChatRanKhongChuaMuoi', 'Bột cà chua dạng sệt là cà chua nguyên chất cô đặc, có từ 25% đến 40% hàm lượng là chất rắn không chứa muối', 25);
  la('hàng thật 30% chất rắn không chứa muối', 'hamLuongChatRanKhongChuaMuoi', 'Bột cà chua dạng sệt cô đặc, hàm lượng chất rắn không chứa muối 30%', 30);

  // 6. ReDoS ~40.000 từ lặp < 2 giây (CLAUDE.md quy tắc 6b)
  const redosText = Array(10000).fill('sản phẩm bằng kim loại dát phủ hoặc bằng cao su').join(' ');
  const t0 = process.hrtime.bigint();
  for (const fk of ['vatLieuKhac', 'laSanPhamCaoSuCung', 'laPhanChimDoi', 'lucRungTrong', 'hamLuongChatRanKhongChuaMuoi']) {
    T.docGiaTri(fk, redosText);
  }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  check(`OZV-1753 ReDoS ~40.000 từ lặp trên 5 khoá < 2000 ms (thực tế ${ms.toFixed(0)} ms)`, ms < 2000, { ms });
}

// OZV-1757 — kiểm chứng khoá laNhanHatCo (1207.10.30) và mở rộng thichHopDungChoNguoi + ReDoS 40.000 từ lặp < 2 giây (quy tắc 6b).
{
  // 1. laNhanHatCo (1207.10.30)
  la('chữ biểu 1207.10.30 (Nhân hạt cọ)', 'laNhanHatCo', 'Hạt cọ và nhân hạt cọ: Nhân hạt cọ', true);
  la('mô tả hàng thật nhân hạt cọ', 'laNhanHatCo', 'Nhân hạt cọ dùng ép dầu', true);
  la('En Kernels', 'laNhanHatCo', 'Palm kernels, broken', true);
  la('Zh 棕榈仁', 'laNhanHatCo', '棕榈仁', true);
  la('phủ định không phải nhân hạt cọ ⇒ false', 'laNhanHatCo', 'Hạt cọ và nhân hạt cọ, không phải nhân hạt cọ', false);
  la('chữ biểu 1207.10.10 hạt cọ phù hợp để gieo trồng ⇒ false', 'laNhanHatCo', 'Hạt cọ và nhân hạt cọ: Hạt cọ phù hợp để gieo/trồng (SEN)', false);
  chuaBiet('chỉ ghi tiêu đề phân nhóm Hạt cọ và nhân hạt cọ ⇒ CHUA_BIET', 'laNhanHatCo', 'Hạt cọ và nhân hạt cọ');

  // 2. thichHopDungChoNguoi — mở rộng đọc cả "thích hợp dùng cho người" và "không thích hợp dùng cho người"
  la('thichHopDungChoNguoi đọc thích hợp dùng cho người ⇒ true', 'thichHopDungChoNguoi', 'Whey, thích hợp dùng cho người', true);
  la('thichHopDungChoNguoi đọc không thích hợp dùng cho người ⇒ false', 'thichHopDungChoNguoi', 'Hạt vừng, không thích hợp dùng cho người', false);

  // 3. ReDoS ~40.000 từ lặp < 2 giây (CLAUDE.md quy tắc 6b)
  const redosText1757 = Array(8000).fill('hạt cọ và nhân hạt cọ không thích hợp sử dụng').join(' ');
  const t0 = process.hrtime.bigint();
  for (const fk of ['laNhanHatCo', 'thichHopDungChoNguoi']) {
    T.docGiaTri(fk, redosText1757);
  }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  check(`OZV-1757 ReDoS ~40.000 từ lặp trên laNhanHatCo + thichHopDungChoNguoi < 2000 ms (thực tế ${ms.toFixed(0)} ms)`, ms < 2000, { ms });
}

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
