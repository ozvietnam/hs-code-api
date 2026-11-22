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
const DK = require('../lib/dieu-kien-so.js');

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
  // 22/11/2026 (OZV-1760): khoá cho 0813.50, 1211.90, 9018.90, 9018.39
  thanhPhanChiemDaSoKhoiLuong: 'LIET_KE',
  daCatNghienHoacDangBot: 'CO_KHONG',
  loaiDungCuThietBiYTeKhac: 'LIET_KE',
  laThietBiPhauThuatHoacYHocDienTu: 'CO_KHONG',
  laOngThong: 'CO_KHONG',
  // 22/11/2026 (OZV-1771): giống thuần chủng 0104.10.10/.20.10 & hình dạng bên trong lòng bồn tắm 3922.10.11
  laThuanChung: 'CO_KHONG',
  coHinhDangBenTrongChuNhatHoacThuon: 'CO_KHONG',
  // 22/11/2026 (OZV-1778): khoá cho 4008.11.10/4008.21.10, 4412.41.10/4412.91.10, 4805.91.10, 5808.10.10/5808.90.10, 1513.29
  lotVaiDetMotMat: 'CO_KHONG',
  chatLieuLopNgoai: 'LIET_KE',
  hamLuongNhua: 'SO',
  ketHopVoiSoiCaoSu: 'CO_KHONG',
  loaiDauHatCoBabassu: 'LIET_KE',
  // 22/11/2026 (OZV-1792): lô 10a (2404.91.10, 2844.10/.20/.30, 4202.11.10, 6005.36/.38, 6302.59/.99)
  chuaNicotin: 'CO_KHONG',
  laNguyenToHoacHopChatNhom2844: 'CO_KHONG',
  kichThuocToiDa56x45x25cm: 'CO_KHONG',
  chuaPolybutylenTerephthalat: 'CO_KHONG',
  tuLanh: 'CO_KHONG',
  // 22/11/2026 (OZV-1794): xử lý RF 5607.50.10, lót đế & mũi kim loại bảo vệ 6403.91.10/.99.10, ở dạng thô 7310.10.91/.29.92
  daXuLyResorcinolFormaldehyde: 'CO_KHONG',
  coLotDeBenTrong: 'CO_KHONG',
  coMuiKimLoaiBaoVe: 'CO_KHONG',
  oDangTho: 'CO_KHONG',
  // 22/11/2026 (OZV-1796): khoá cho 9804.28.11, 8716.39.91, 3907.69.10/3907.91.20 (SEN)
  daHapChinHoacLuocChin: 'CO_KHONG',
  khoiLuongHangChuyenCho: 'SO',
  tyLeLotQuaLuoiLoc1mm: 'SO',
  tyLeLotQuaLuoiLoc5mm: 'SO',
  // 22/11/2026 (#1584): bổ sung dangTam, nguonDongLuc (và mở rộng vatLieuKhac: DA_THUOC, DA_THUOC_TONG_HOP)
  dangTam: 'CO_KHONG',
  nguonDongLuc: 'LIET_KE',
  // 22/11/2026 (OZV-1804): lô 12b (0407.19/.29/.90, 5702.39/.49/.50/.99)
  cuaLoaiGiaCam: 'LIET_KE',
  tuXoDay: 'CO_KHONG',
  // 22/11/2026 (T-5): mở khoá cho Top-93 (loại nhựa polyme 39.20/39.23 + 6 khoá có/không)
  loaiNhuaPolyme: 'LIET_KE',
  coKemPhuKien: 'CO_KHONG',
  coTheBomHoi: 'CO_KHONG',
  daLapVoLoa: 'CO_KHONG',
  daNhoiDem: 'CO_KHONG',
  coGanOBi: 'CO_KHONG',
  loaiTuDong: 'CO_KHONG',
  // 22/11/2026 (T-6): mở khoá cho Top-93 & Lô 3-5
  hamLuongSoiFilamentTongHop: 'SO',
  daGiaCo: 'CO_KHONG',
  coDuTru: 'CO_KHONG',
  coDieuChinhDoCao: 'CO_KHONG',
  coTheChuyenThanhGiuong: 'CO_KHONG',
  coKetNoiMayTinh: 'CO_KHONG',
  coGanThietBiThu: 'CO_KHONG',
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

// OZV-1760 — kiểm chứng 5 khoá mới (thanhPhanChiemDaSoKhoiLuong, daCatNghienHoacDangBot, loaiDungCuThietBiYTeKhac,
// laThietBiPhauThuatHoacYHocDienTu, laOngThong) và mở rộng hamLuongCarbon + ReDoS 40.000 từ lặp < 2 giây (quy tắc 6b).
{
  // 1. thanhPhanChiemDaSoKhoiLuong (0813.50.10..40)
  la('chữ biểu 0813.50.10', 'thanhPhanChiemDaSoKhoiLuong', 'Hạt điều hoặc quả hạch Brazil (Brazil nuts) chiếm đa số về khối lượng', 'HAT_DIEU_HOAC_QUA_HACH_BRAZIL');
  la('chữ biểu 0813.50.20', 'thanhPhanChiemDaSoKhoiLuong', 'Quả hạch (nuts) khác chiếm đa số về khối lượng', 'QUA_HACH_KHAC');
  la('chữ biểu 0813.50.30', 'thanhPhanChiemDaSoKhoiLuong', 'Quả chà là chiếm đa số về khối lượng', 'QUA_CHA_LA');
  la('chữ biểu 0813.50.40', 'thanhPhanChiemDaSoKhoiLuong', 'Quả bơ hoặc quả cam hoặc quả quýt các loại (kể cả quất) chiếm đa số về khối lượng', 'BO_CAM_QUYT');
  la('En cashew nuts predominate by weight', 'thanhPhanChiemDaSoKhoiLuong', 'Mixtures of which cashew nuts or Brazil nuts predominate by weight', 'HAT_DIEU_HOAC_QUA_HACH_BRAZIL');
  chuaBiet('hỗn hợp có hạt điều nhưng không nói chiếm đa số ⇒ CHUA_BIET', 'thanhPhanChiemDaSoKhoiLuong', 'Hỗn hợp quả khô có hạt điều và nho khô');

  // 2. daCatNghienHoacDangBot (1211.90.11, .12, .17, .18, .91, .92, .98)
  la('chữ biểu 1211.90.11 (đã cắt, nghiền hoặc dạng bột)', 'daCatNghienHoacDangBot', 'Cây gai dầu, đã cắt, nghiền hoặc dạng bột', true);
  la('chữ biểu 1211.90.12 (ở dạng khác)', 'daCatNghienHoacDangBot', 'Cây gai dầu, ở dạng khác', false);
  la('tiền lệ 5818/TB-TCHQ bột vỏ cây bời lời', 'daCatNghienHoacDangBot', 'Bột làm nhang làm từ vỏ cây bời lời', true);
  la('tiền lệ 1258/TB-TCHQ hoa đậu biếc dạng bột', 'daCatNghienHoacDangBot', 'Hoa đậu biếc (dạng bột, màu xanh)', true);
  la('tiền lệ 2232/TB-TCHQ Butterfly Pea Sterilized Powder', 'daCatNghienHoacDangBot', 'BUTTERFLY PEA STERILIZED POWDER', true);
  chuaBiet('tiêu đề nhóm 12.11 đã hoặc chưa cắt, nghiền hoặc xay thành bột ⇒ CHUA_BIET', 'daCatNghienHoacDangBot', 'Các loại cây dùng làm dược phẩm, đã hoặc chưa cắt, nghiền hoặc xay thành bột');

  // 3. loaiDungCuThietBiYTeKhac & laThietBiPhauThuatHoacYHocDienTu (9018.90.10 / .20 / .3 / .31)
  la('chữ biểu 9018.90.10', 'loaiDungCuThietBiYTeKhac', 'Đèn sợi quang loại dùng đeo trên đầu, được thiết kế dùng trong y học(SEN)', 'DEN_SOI_QUANG_DEO_DAU_Y_HOC');
  la('chữ biểu 9018.90.20', 'loaiDungCuThietBiYTeKhac', 'Bộ theo dõi tĩnh mạch', 'BO_THEO_DOI_TINH_MACH');
  la('tiêu đề 9018.90.3', 'loaiDungCuThietBiYTeKhac', 'Dụng cụ và thiết bị điện tử', 'DUNG_CU_THIET_BI_DIEN_TU');
  la('chữ biểu 9018.90.31', 'laThietBiPhauThuatHoacYHocDienTu', 'Dụng cụ và thiết bị phẫu thuật điện tử hoặc y học điện tử', true);
  la('tiền lệ 13727/TB-CHQ máy plasma lạnh (tầng 9018.90.3)', 'loaiDungCuThietBiYTeKhac', 'Máy plasma lạnh PlasmaMED-GAP điều trị vết thương', 'DUNG_CU_THIET_BI_DIEN_TU');
  la('tiền lệ 13727/TB-CHQ máy plasma lạnh (dòng 9018.90.31)', 'laThietBiPhauThuatHoacYHocDienTu', 'Máy plasma lạnh PlasmaMED-GAP điều trị vết thương', true);
  chuaBiet('đèn sợi quang y tế không đeo đầu ⇒ CHUA_BIET', 'loaiDungCuThietBiYTeKhac', 'Nguồn sáng đèn sợi quang dùng trong nội soi y học');

  // 4. laOngThong (9018.39.10)
  la('chữ biểu 9018.39.10 (Ống thông)', 'laOngThong', 'Ống thông', true);
  la('En Catheters', 'laOngThong', 'Catheters for medical use', true);
  la('phủ định không phải ống thông ⇒ false', 'laOngThong', 'Ống dẫn dịch không phải ống thông', false);
  chuaBiet('câu trích tiêu đề 9018.3 trong 4842/TB-TCHQ ⇒ CHUA_BIET', 'laOngThong', 'phân nhóm "- Bơm tiêm, kim tiêm, ống thông ống dẫn lưu và loại tương tự:"');

  // 5. hamLuongCarbon mở rộng đọc "chứa dưới 0,45% carbon" (7306.90.97)
  la('chữ biểu 7306.90.97 (chứa dưới 0,45% carbon)', 'hamLuongCarbon', 'Loại khác, có đường kính trong trên 12,5 mm, đường kính ngoài nhỏ hơn 140 mm và chứa dưới 0,45% carbon tính theo khối lượng', 0.45, { op: '<' });

  // 6. ReDoS ~40.000 từ lặp < 2 giây (CLAUDE.md quy tắc 6b)
  const redosText1760 = Array(8000).fill('quả hạch hoặc quả khô dụng cụ và thiết bị').join(' ');
  const t0 = process.hrtime.bigint();
  for (const fk of ['thanhPhanChiemDaSoKhoiLuong', 'daCatNghienHoacDangBot', 'loaiDungCuThietBiYTeKhac', 'laThietBiPhauThuatHoacYHocDienTu', 'laOngThong', 'hamLuongCarbon']) {
    T.docGiaTri(fk, redosText1760);
  }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  check(`OZV-1760 ReDoS ~40.000 từ lặp trên 6 khoá < 2000 ms (thực tế ${ms.toFixed(0)} ms)`, ms < 2000, { ms });
}

// OZV-1771 — kiểm chứng laThuanChung (0104.10.10/.20.10), coHinhDangBenTrongChuNhatHoacThuon (3922.10.11), kieuDet.NOI_VONG (5801.37) + ReDoS < 2 giây.
{
  // 1. laThuanChung (0104.10.10, 0104.20.10)
  la('chữ biểu 0104.10.10 (Loại thuần chủng để nhân giống)', 'laThuanChung', 'Cừu: Loại thuần chủng để nhân giống', true);
  la('En Pure-bred breeding animals', 'laThuanChung', 'Pure-bred breeding animals', true);
  la('Zh 纯种', 'laThuanChung', '改良种用纯种绵羊', true);
  la('phủ định không phải loại thuần chủng ⇒ false', 'laThuanChung', 'Cừu, không phải loại thuần chủng', false);
  la('giống lai ⇒ false', 'laThuanChung', 'Dê giống lai nuôi lấy thịt', false);
  chuaBiet('chỉ ghi để nhân giống không nói thuần chủng ⇒ CHUA_BIET', 'laThuanChung', 'Cừu sống nuôi để nhân giống');

  // 2. coHinhDangBenTrongChuNhatHoacThuon (3922.10.11)
  la('chữ biểu 3922.10.11', 'coHinhDangBenTrongChuNhatHoacThuon', 'Bồn tắm có hình dạng bên trong là hình chữ nhật hoặc hình thuôn (oblong)', true);
  la('mô tả hàng thật lòng bồn hình chữ nhật', 'coHinhDangBenTrongChuNhatHoacThuon', 'Bồn tắm bằng nhựa acrylic, lòng bồn hình chữ nhật', true);
  la('En rectangular or oblong interior shape', 'coHinhDangBenTrongChuNhatHoacThuon', 'Bathtubs having rectangular or oblong interior shape', true);
  la('Zh 内部形状为长方形或长圆形', 'coHinhDangBenTrongChuNhatHoacThuon', '塑料浴缸，内部形状为长方形或长圆形', true);
  la('phủ định lòng bồn hình tròn ⇒ false', 'coHinhDangBenTrongChuNhatHoacThuon', 'Bồn tắm plastic, lòng bồn hình tròn', false);
  chuaBiet('chỉ ghi bồn tắm bằng plastic ⇒ CHUA_BIET', 'coHinhDangBenTrongChuNhatHoacThuon', 'Bồn tắm bằng plastic');

  // 3. kieuDet.NOI_VONG (5801.37) & laBoPhan trên 3922.90.12
  la('kieuDet đọc tiêu đề 5801.37 Vải có sợi dọc nổi vòng ⇒ NOI_VONG', 'kieuDet', 'Vải có sợi dọc nổi vòng', 'NOI_VONG');
  la('laBoPhan đọc 3922.90.12 Bình xả nước đã lắp sẵn các bộ phận ⇒ false', 'laBoPhan', 'Bình xả nước đã lắp sẵn các bộ phận(SEN)', false);
  la('laBoPhan đọc 3922.90.11 Bộ phận của bình xả nước ⇒ true', 'laBoPhan', 'Bộ phận của bình xả nước(SEN)', true);

  // 4. ReDoS ~40.000 từ lặp < 2 giây (CLAUDE.md quy tắc 6b)
  const redosText1771 = Array(4000).fill('bồn tắm có hình dạng bên trong loại thuần đã lắp sẵn').join(' ');
  const t0 = process.hrtime.bigint();
  for (const fk of ['laThuanChung', 'coHinhDangBenTrongChuNhatHoacThuon', 'kieuDet']) {
    T.docGiaTri(fk, redosText1771);
  }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  check(`OZV-1771 ReDoS ~40.000 từ lặp trên 5 khoá < 2000 ms (thực tế ${ms.toFixed(0)} ms)`, ms < 2000, { ms });
}

// OZV-1794 — kiểm chứng daXuLyResorcinolFormaldehyde (5607.50.10), coLotDeBenTrong & coMuiKimLoaiBaoVe (6403.91.10/.99.10), oDangTho (7310.10.91/.29.92), vatLieuKhac.DA_THUOC (9305.91.10/.99.11/.99.91) + ReDoS < 500 ms.
{
  // 1. daXuLyResorcinolFormaldehyde (5607.50.10)
  la('chữ biểu 5607.50.10 (đã xử lý bằng resorcinol formaldehyde)', 'daXuLyResorcinolFormaldehyde', 'Sợi bện (cord) cho dây đai chữ V làm từ xơ nhân tạo đã xử lý bằng resorcinol formaldehyde', true);
  la('En treated with resorcinol formaldehyde', 'daXuLyResorcinolFormaldehyde', 'V-belt cord of man-made fibres treated with resorcinol formaldehyde', true);
  la('Zh 经间苯二酚甲醛处理', 'daXuLyResorcinolFormaldehyde', '经间苯二酚甲醛处理的化学纤维三角带帘线', true);
  la('phủ định chưa xử lý bằng resorcinol formaldehyde ⇒ false', 'daXuLyResorcinolFormaldehyde', 'Sợi bện chưa xử lý bằng resorcinol formaldehyde', false);
  chuaBiet('sợi bện không nêu xử lý ⇒ CHUA_BIET', 'daXuLyResorcinolFormaldehyde', 'Sợi bện từ polyeste dùng cho dây đai chữ V');

  // 2. coLotDeBenTrong & coMuiKimLoaiBaoVe (6403.91.10, 6403.99.10)
  la('chữ biểu 6403.91.10 không có lót đế bên trong ⇒ false', 'coLotDeBenTrong', 'Giày, dép có đế bằng gỗ, không có lót đế bên trong hoặc mũi gắn kim loại bảo vệ', false);
  la('En not having an inner sole ⇒ false', 'coLotDeBenTrong', 'Footwear made on a base or platform of wood, not having an inner sole or protective metal toe cap', false);
  la('có lót đế bên trong ⇒ true', 'coLotDeBenTrong', 'Giày đế gỗ có lót đế bên trong', true);
  la('chữ biểu 6403.91.10 không có ... hoặc mũi gắn kim loại bảo vệ ⇒ false', 'coMuiKimLoaiBaoVe', 'Giày, dép có đế bằng gỗ, không có lót đế bên trong hoặc mũi gắn kim loại bảo vệ', false);
  la('En not having ... or protective metal toe cap ⇒ false', 'coMuiKimLoaiBaoVe', 'Footwear made on a base or platform of wood, not having an inner sole or protective metal toe cap', false);
  la('có mũi gắn kim loại bảo vệ ⇒ true', 'coMuiKimLoaiBaoVe', 'Giày có mũi gắn kim loại bảo vệ', true);

  // 3. oDangTho (7310.10.91, 7310.29.92)
  la('chữ biểu 7310.10.91 ở dạng thô ⇒ true', 'oDangTho', 'Được đúc, rèn hoặc dập, ở dạng thô', true);
  la('En in the rough state ⇒ true', 'oDangTho', 'Casting, forging or stamping, in the rough state', true);
  la('Zh 处于粗坯状态 ⇒ true', 'oDangTho', '处于粗坯状态的铸件', true);
  la('phủ định không phải ở dạng thô ⇒ false', 'oDangTho', 'Thùng thép dập, không phải ở dạng thô', false);
  chuaBiet('chỉ ghi được đúc rèn hoặc dập ⇒ CHUA_BIET', 'oDangTho', 'Thùng phuy thép được dập');

  // 4. vatLieuKhac.DA_THUOC (9305.91.10, 9305.99.11, 9305.99.91)
  la('bằng da thuộc ⇒ DA_THUOC', 'vatLieuKhac', 'Bằng da thuộc (SEN)', 'DA_THUOC');
  {
    const r9305 = T.docGiaTri('vatLieuKhac', 'Bằng da thuộc hoặc vật liệu dệt (SEN)');
    check('chữ biểu 9305.91.10 bằng da thuộc hoặc vật liệu dệt ⇒ đủ 2 ứng viên VAT_LIEU_DET & DA_THUOC',
      r9305.trangThai === 'CHUA_BIET' && r9305.ungVien?.includes('DA_THUOC') && r9305.ungVien?.includes('VAT_LIEU_DET'), r9305);
  }
  la('En of leather ⇒ DA_THUOC', 'vatLieuKhac', 'Parts and accessories of leather', 'DA_THUOC');
  chuaBiet('sơn cho da thuộc không phải vật liệu làm bằng da thuộc ⇒ CHUA_BIET', 'vatLieuKhac', 'Sơn cho da thuộc');

  // 5. ReDoS ~40.000 từ lặp < 500 ms (OZV-1794)
  const redosText1794 = Array(4000).fill('không có lót đế bên hoặc mũi gắn kim đã xử lý bằng ở dạng').join(' ');
  const t0 = process.hrtime.bigint();
  for (const fk of ['daXuLyResorcinolFormaldehyde', 'coLotDeBenTrong', 'coMuiKimLoaiBaoVe', 'oDangTho']) {
    T.docGiaTri(fk, redosText1794);
  }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  check(`OZV-1794 ReDoS ~40.000 từ lặp trên 4 khoá mới < 500 ms (thực tế ${ms.toFixed(0)} ms)`, ms < 500, { ms });
}

// OZV-1778 — kiểm chứng 4 khoá mới (lotVaiDetMotMat, chatLieuLopNgoai, hamLuongNhua, ketHopVoiSoiCaoSu)
// và giá trị NGUYEN_CHAT_VIRGIN trong mucDoTinhCheDau + ReDoS 40.000 từ lặp < 2 giây (quy tắc 6b).
{
  // 1. mucDoTinhCheDau — NGUYEN_CHAT_VIRGIN (1513.11.10) tách khỏi DANG_THO
  la('chữ biểu 1513.11.10 (Dầu dừa nguyên chất)', 'mucDoTinhCheDau', 'Dầu dừa nguyên chất (SEN)', 'NGUYEN_CHAT_VIRGIN');
  la('En Virgin coconut oil', 'mucDoTinhCheDau', 'Virgin coconut oil', 'NGUYEN_CHAT_VIRGIN');
  la('Zh 初榨椰子油', 'mucDoTinhCheDau', '初榨椰子油', 'NGUYEN_CHAT_VIRGIN');
  la('Dầu thô vẫn đọc DANG_THO, không nhảy sang NGUYEN_CHAT_VIRGIN', 'mucDoTinhCheDau', 'Dầu dừa dạng thô chưa tinh chế', 'DANG_THO');

  // 2. lotVaiDetMotMat (4008.11.10 / 4008.21.10)
  la('chữ biểu 4008.11.10 / 4008.21.10 (có một mặt được lót vải dệt)', 'lotVaiDetMotMat', 'Chiều dày trên 5 mm, có một mặt được lót vải dệt', true);
  la('En lined with textile fabric on one side', 'lotVaiDetMotMat', 'Exceeding 5 mm in thickness, lined with textile fabric on one side', true);
  la('Zh 单面衬有纺织物', 'lotVaiDetMotMat', '厚度超过5毫米，单面衬有纺织物', true);
  la('tấm cao su lót vải cả hai mặt ⇒ false', 'lotVaiDetMotMat', 'Tấm cao su xốp dày 8 mm, có hai mặt được lót vải dệt', false);
  la('En lined with textile fabric on both sides ⇒ false', 'lotVaiDetMotMat', 'Cellular rubber sheet lined with textile fabric on both sides', false);
  la('phủ định không được lót vải dệt ⇒ false', 'lotVaiDetMotMat', 'Tấm cao su lưu hóa dày 10 mm, không được lót vải dệt', false);
  chuaBiet('chỉ ghi tấm cao su dày 6 mm ⇒ CHUA_BIET', 'lotVaiDetMotMat', 'Tấm cao su lưu hóa dày 6 mm');

  // 3. chatLieuLopNgoai (4412.41.10 / 4412.91.10 / 4412.92.00 / 4412.99.00)
  la('chữ biểu 4412.41.10 / 4412.91.10 (lớp ngoài bằng gỗ tếch)', 'chatLieuLopNgoai', 'Với ít nhất một lớp ngoài bằng gỗ tếch', 'GO_TECH');
  la('En With at least one outer ply of teak', 'chatLieuLopNgoai', 'With at least one outer ply of teak', 'GO_TECH');
  la('Zh 至少有一表层是柚木', 'chatLieuLopNgoai', '至少有一表层是柚木', 'GO_TECH');
  la('chữ biểu 4412.92.00 (lớp mặt ngoài từ gỗ không thuộc loài cây lá kim)', 'chatLieuLopNgoai', 'Loại khác, với ít nhất một lớp mặt ngoài từ gỗ không thuộc loài cây lá kim', 'GO_KHONG_LA_KIM');
  la('chữ biểu 4412.99.00 (cả hai lớp mặt ngoài từ gỗ thuộc loài cây lá kim)', 'chatLieuLopNgoai', 'Loại khác, với cả hai lớp mặt ngoài từ gỗ thuộc loài cây lá kim', 'CA_HAI_LOP_GO_LA_KIM');
  chuaBiet('gỗ tếch ở lớp lõi trong, không phải lớp ngoài ⇒ CHUA_BIET', 'chatLieuLopNgoai', 'Gỗ dán có lớp lõi trong bằng gỗ tếch');

  // 4. hamLuongNhua (4805.91.10)
  la('chữ biểu 4805.91.10 (hàm lượng nhựa không quá 0,6%)', 'hamLuongNhua', 'Giấy dùng để lót vào giữa các sản phẩm thủy tinh phẳng khi đóng gói, có hàm lượng nhựa không quá 0,6% tính theo khối lượng', 0.6, { op: '<=' });
  la('hàng thật hàm lượng nhựa 0,4%', 'hamLuongNhua', 'Giấy lót kính phẳng khi đóng gói, hàm lượng nhựa 0,4% tính theo khối lượng', 0.4, { op: null });
  la('En resin content by weight of not more than 0.6%', 'hamLuongNhua', 'Paper with a resin content by weight of not more than 0.6%', 0.6, { op: '<=' });
  la('Zh 按重量计树脂含量0.5%', 'hamLuongNhua', '按重量计树脂含量0.5%的衬纸', 0.5, { op: null });
  chuaBiet('chỉ ghi định lượng giấy, không ghi hàm lượng nhựa ⇒ CHUA_BIET', 'hamLuongNhua', 'Giấy lót kính phẳng định lượng 50 g/m2');

  // 5. ketHopVoiSoiCaoSu (5808.10.10 / 5808.90.10)
  la('chữ biểu 5808.10.10 / 5808.90.10 (Kết hợp với sợi cao su)', 'ketHopVoiSoiCaoSu', 'Kết hợp với sợi cao su', true);
  la('En Combined with rubber thread', 'ketHopVoiSoiCaoSu', 'Combined with rubber thread', true);
  la('Zh 夹有橡胶线', 'ketHopVoiSoiCaoSu', '夹有橡胶线的编带', true);
  la('phủ định không kết hợp với sợi cao su ⇒ false', 'ketHopVoiSoiCaoSu', 'Dải bện dạng chiếc không kết hợp với sợi cao su', false);
  chuaBiet('dải bện chứa sợi đàn hồi spandex/elastane/lycra ⇒ CHUA_BIET (không bắt nhầm sợi cao su)', 'ketHopVoiSoiCaoSu', 'Dải bện dạng chiếc chứa sợi đàn hồi spandex (elastane / lycra)');

  // 6. loaiDauHatCoBabassu (1513.29)
  la('chữ biểu 1513.29.95 (Dầu hạt cọ RBD)', 'loaiDauHatCoBabassu', 'Dầu hạt cọ, đã tinh chế, tẩy và khử mùi (RBD) (SEN)', 'DAU_HAT_CO');
  la('chữ biểu 1513.29.94 (Olein hạt cọ RBD)', 'loaiDauHatCoBabassu', 'Olein hạt cọ, đã tinh chế, tẩy và khử mùi (RBD)', 'DAU_HAT_CO');
  la('chữ biểu 1513.29.13 ngoặc (olein hạt cọ) vẫn đọc DAU_HAT_CO', 'loaiDauHatCoBabassu', 'Loại khác, của dầu hạt cọ chưa tinh chế (olein hạt cọ) (SEN)', 'DAU_HAT_CO');
  la('chữ biểu 1513.29.14 (dầu cọ ba-ba-su)', 'loaiDauHatCoBabassu', 'Loại khác, của dầu cọ ba-ba-su chưa tinh chế', 'DAU_CO_BA_BA_SU');
  chuaBiet('dầu dừa không thuộc loaiDauHatCoBabassu ⇒ CHUA_BIET', 'loaiDauHatCoBabassu', 'Dầu dừa nguyên chất');

  // 7. ReDoS ~40.000 từ lặp < 2 giây (CLAUDE.md quy tắc 6b)
  const redosText1778 = Array(8000).fill('tấm cao su hoặc gỗ dán hoặc giấy hoặc dải bện').join(' ');
  const t0 = process.hrtime.bigint();
  for (const fk of ['mucDoTinhCheDau', 'lotVaiDetMotMat', 'chatLieuLopNgoai', 'hamLuongNhua', 'ketHopVoiSoiCaoSu', 'loaiDauHatCoBabassu']) {
    T.docGiaTri(fk, redosText1778);
  }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  check(`OZV-1778 ReDoS ~40.000 từ lặp trên 6 khoá < 2000 ms (thực tế ${ms.toFixed(0)} ms)`, ms < 2000, { ms });
}

// OZV-1792 — kiểm chứng 5 khoá mới lô 10a (chuaNicotin, laNguyenToHoacHopChatNhom2844, kichThuocToiDa56x45x25cm,
// chuaPolybutylenTerephthalat, tuLanh) + ReDoS ~40.000 từ lặp < 2 giây (quy tắc 6b).
{
  // 1. chuaNicotin (2404.91.10)
  la('chữ biểu 2404.91.10 (Kẹo cao su có nicotin)', 'chuaNicotin', 'Kẹo cao su có nicotin (SEN)', true);
  la('mô tả hàng thật kẹo cao su nicotin', 'chuaNicotin', 'Kẹo cao su nicotin hỗ trợ cai thuốc lá', true);
  la('En Nicotine chewing gum', 'chuaNicotin', 'Nicotine chewing gum 2mg', true);
  la('Zh 含尼古丁', 'chuaNicotin', '含尼古丁口香糖', true);
  la('phủ định không có nicotin ⇒ false', 'chuaNicotin', 'Kẹo cao su không có nicotin', false);
  la('nguyên liệu thay thế nicotin (2404.19.20) ⇒ false', 'chuaNicotin', 'Chứa các nguyên liệu thay thế nicotin', false);
  chuaBiet('chỉ ghi kẹo cao su bạc hà ⇒ CHUA_BIET', 'chuaNicotin', 'Kẹo cao su hương bạc hà');

  // 2. laNguyenToHoacHopChatNhom2844 (2844.10.10, 2844.20.10, 2844.30.10)
  la('chữ biểu 2844.10.10', 'laNguyenToHoacHopChatNhom2844', 'Urani tự nhiên và các hợp chất của nó', true);
  la('chữ biểu 2844.20.10', 'laNguyenToHoacHopChatNhom2844', 'Urani đã làm giàu thành U 235 và hợp chất của nó; plutoni và hợp chất của nó', true);
  la('mô tả urani làm nghèo thành U 235 (2844.30.10)', 'laNguyenToHoacHopChatNhom2844', 'Urani đã được làm nghèo thành U 235', true);
  la('hợp chất của thori (2844.30.10)', 'laNguyenToHoacHopChatNhom2844', 'Hợp chất của thori (thori dioxit)', true);
  la('En Uranium depleted in U 235', 'laNguyenToHoacHopChatNhom2844', 'Uranium depleted in U 235 and its compounds', true);
  la('Zh 天然铀及其化合物', 'laNguyenToHoacHopChatNhom2844', '天然铀及其化合物', true);
  la('hỗn hợp chứa hợp chất urani (.90) ⇒ false', 'laNguyenToHoacHopChatNhom2844', 'Hỗn hợp chứa hợp chất urani tự nhiên', false);
  la('hợp kim chứa urani tự nhiên (.90) ⇒ false', 'laNguyenToHoacHopChatNhom2844', 'Hợp kim chứa urani tự nhiên', false);
  chuaBiet('tiêu đề PN6 2844.10 đa vế ⇒ CHUA_BIET', 'laNguyenToHoacHopChatNhom2844', 'Urani tự nhiên và các hợp chất của nó; hợp kim, các chất phân tán (kể cả gốm kim loại), sản phẩm gốm và hỗn hợp có chứa urani tự nhiên hoặc các hợp chất urani tự nhiên');
  chuaBiet('hợp chất hữu cơ khác không nêu urani/plutoni/thori ⇒ CHUA_BIET', 'laNguyenToHoacHopChatNhom2844', 'Các hợp chất vô cơ khác');

  // 3. kichThuocToiDa56x45x25cm (4202.11.10)
  la('chữ biểu 4202.11.10', 'kichThuocToiDa56x45x25cm', 'Vali hoặc túi, cặp có kích thước tối đa 56cm x 45cm x 25cm', true);
  la('vali 50cm x 40cm x 20cm (cả 3 chiều trong biên) ⇒ true', 'kichThuocToiDa56x45x25cm', 'Vali mặt ngoài bằng da thuộc, kích thước 50cm x 40cm x 20cm', true);
  la('En maximum dimensions of 56 cm x 45 cm x 25 cm', 'kichThuocToiDa56x45x25cm', 'Suit-case or brief-case with maximum dimensions of 56 cm x 45 cm x 25 cm', true);
  la('Zh 最大尺寸不超过56厘米x45厘米x25厘米', 'kichThuocToiDa56x45x25cm', '最大尺寸不超过56厘米x45厘米x25厘米的皮箱', true);
  la('vali 50cm x 50cm x 30cm (vượt biên 45/25 cm) ⇒ false', 'kichThuocToiDa56x45x25cm', 'Vali mặt ngoài bằng da thuộc, kích thước 50cm x 50cm x 30cm', false);
  chuaBiet('vali da thuộc không nêu kích thước ⇒ CHUA_BIET', 'kichThuocToiDa56x45x25cm', 'Vali mặt ngoài bằng da thuộc');

  // 4. chuaPolybutylenTerephthalat (6005.36.10, 6005.38.10)
  la('chữ biểu 6005.36.10', 'chuaPolybutylenTerephthalat', 'Vải dệt kim làm từ polyeste và polybutylen terephthalat trong đó polyeste chiếm tỷ lệ lớn hơn tính theo khối lượng dùng để làm quần áo bơi', true);
  la('En polybutylene terephthalate', 'chuaPolybutylenTerephthalat', 'Knitted swimwear fabrics of polyester and polybutylene terephthalate', true);
  la('Zh 聚对苯二甲酸丁二酯', 'chuaPolybutylenTerephthalat', '由聚酯及聚对苯二甲酸丁二酯制成的针织泳衣面料', true);
  la('phủ định không có polybutylen terephthalat ⇒ false', 'chuaPolybutylenTerephthalat', 'Vải bơi dệt kim polyeste pha spandex, không có polybutylen terephthalat', false);
  la('100% polyeste ⇒ false', 'chuaPolybutylenTerephthalat', 'Vải dệt kim đan dọc 100% polyeste dùng may đồ bơi', false);
  chuaBiet('vải bơi polyeste pha spandex không nhắc PBT ⇒ CHUA_BIET', 'chuaPolybutylenTerephthalat', 'Vải dệt kim 85% polyeste 15% spandex dùng làm quần áo bơi');

  // 5. tuLanh (6302.59.10, 6302.99.10)
  la('chữ biểu 6302.59.10 (Từ lanh)', 'tuLanh', 'Từ lanh', true);
  la('mô tả hàng thật khăn trải bàn bằng vải lanh', 'tuLanh', 'Khăn trải bàn bằng vải lanh tự nhiên', true);
  la('En Of flax', 'tuLanh', 'Table linen of flax', true);
  la('Zh 亚麻制', 'tuLanh', '亚麻制桌布', true);
  la('khăn trải bàn bằng đay ⇒ false', 'tuLanh', 'Khăn trải bàn bằng vải đay', false);
  la('khăn trải bàn từ gai ramie ⇒ false', 'tuLanh', 'Khăn trải bàn từ gai ramie', false);
  chuaBiet('chỉ ghi khăn trải bàn từ các vật liệu dệt khác ⇒ CHUA_BIET', 'tuLanh', 'Khăn trải bàn khác - Từ các vật liệu dệt khác');

  // 6. ReDoS ~40.000 từ lặp < 2 giây (CLAUDE.md quy tắc 6b)
  const redosText1792 = Array(5000).fill('kích thước tối đa hợp chất của urani vải dệt kim từ').join(' ');
  const t0 = process.hrtime.bigint();
  for (const fk of ['laNguyenToHoacHopChatNhom2844', 'kichThuocToiDa56x45x25cm']) {
    T.docGiaTri(fk, redosText1792);
  }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  check(`OZV-1792 ReDoS ~40.000 từ lặp trên 2 khoá mới < 2000 ms (thực tế ${ms.toFixed(0)} ms)`, ms < 2000, { ms });
}

// #1584 — mở rộng vatLieuKhac (DA_THUOC, DA_THUOC_TONG_HOP) + 2 khoá mới (dangTam, nguonDongLuc) + ReDoS ~40.000 từ lặp < 2 giây
{
  const DK = require('../lib/dieu-kien-so.js');

  // 1. vatLieuKhac — DA_THUOC & DA_THUOC_TONG_HOP (không chạm chatLieu @1)
  la('chữ biểu 4205.00.30 (bằng da thuộc)', 'vatLieuKhac', 'Dây hoặc dây tết bằng da thuộc dùng cho đồ trang sức hoặc sản phẩm trang điểm cá nhân', 'DA_THUOC', { bc: 'da thuộc' });
  la('chữ biểu 4112.00.00 (da thuộc)', 'vatLieuKhac', 'Da thuộc đã được gia công thêm sau khi thuộc hoặc làm mộc, kể cả da giấy, của cừu hoặc cừu non, không có lông, đã hoặc chưa xẻ, trừ da thuộc nhóm 41.14', 'DA_THUOC');
  la('chữ biểu 6403.20.00 (đế ngoài bằng da thuộc)', 'vatLieuKhac', 'Giày, dép có đế ngoài bằng da thuộc, và mũ giày có đai vòng qua mu bàn chân và quai xỏ ngón chân cái', 'DA_THUOC');
  la('Mặt ngoài bằng da thuộc ⇒ DA_THUOC', 'vatLieuKhac', 'Mặt ngoài bằng da thuộc', 'DA_THUOC');
  la('Bằng da thuộc ⇒ DA_THUOC', 'vatLieuKhac', 'Bằng da thuộc', 'DA_THUOC');
  la('áo khoác da thuộc ⇒ DA_THUOC', 'vatLieuKhac', 'áo khoác da thuộc', 'DA_THUOC');
  la('En genuine leather', 'vatLieuKhac', 'Briefcase of genuine leather', 'DA_THUOC');
  la('Zh 真皮', 'vatLieuKhac', '牛皮真皮手提包', 'DA_THUOC');
  la('Zh 皮革', 'vatLieuKhac', '天然皮革钱包', 'DA_THUOC');
  la('da thuộc tổng hợp ⇒ DA_THUOC_TONG_HOP (không đụng DA_THUOC)', 'vatLieuKhac', 'Mặt ngoài bằng da thuộc tổng hợp', 'DA_THUOC_TONG_HOP', { bc: 'da thuộc tổng hợp' });
  la('da tổng hợp ⇒ DA_THUOC_TONG_HOP', 'vatLieuKhac', 'Giày có đế ngoài bằng da tổng hợp', 'DA_THUOC_TONG_HOP');
  la('chữ biểu 4115.10.00 (da thuộc tổng hợp với thành phần cơ bản là da thuộc hoặc sợi da thuộc) ⇒ DA_THUOC_TONG_HOP', 'vatLieuKhac', 'Da thuộc tổng hợp với thành phần cơ bản là da thuộc hoặc sợi da thuộc, dạng tấm, tấm mỏng hoặc dạng dải, có hoặc không ở dạng cuộn', 'DA_THUOC_TONG_HOP');
  la('En composition leather with basis of leather', 'vatLieuKhac', 'Composition leather with a basis of leather or leather fibre', 'DA_THUOC_TONG_HOP');
  la('En reconstituted leather', 'vatLieuKhac', 'Reconstituted leather sheet', 'DA_THUOC_TONG_HOP');
  la('Zh 再生皮革', 'vatLieuKhac', '再生皮革制品', 'DA_THUOC_TONG_HOP');
  la('Zh 合成皮革', 'vatLieuKhac', '合成皮革包', 'DA_THUOC_TONG_HOP');
  chuaBiet('bằng vải dệt ⇒ CHUA_BIET trên vatLieuKhac', 'vatLieuKhac', 'Túi xách bằng vải dệt');
  chuaBiet('giả da / PU leather ⇒ CHUA_BIET', 'vatLieuKhac', 'Túi xách giả da (PU leather)');
  chuaBiet('faux-leather gạch nối ⇒ CHUA_BIET', 'vatLieuKhac', 'Handbag of faux-leather');
  chuaBiet('PU-leather gạch nối ⇒ CHUA_BIET', 'vatLieuKhac', 'PU-leather jacket');
  chuaBiet('synthetic-leather / artificial-leather / imitation-leather / vegan-leather ⇒ CHUA_BIET', 'vatLieuKhac', 'synthetic-leather, artificial-leather, imitation-leather, vegan-leather');
  chuaBiet('eco leather / eco-leather / bonded leather ⇒ CHUA_BIET', 'vatLieuKhac', 'Sofa covered with eco leather, eco-leather and bonded leather');
  chuaBiet('synthetic leather En ⇒ CHUA_BIET', 'vatLieuKhac', 'Synthetic leather handbag');
  chuaBiet('人造皮革 Zh ⇒ CHUA_BIET', 'vatLieuKhac', '人造皮革包');
  chuaBiet('Sơn cho da thuộc 3209.10.40 ⇒ CHUA_BIET', 'vatLieuKhac', 'Sơn cho da thuộc (SEN)');
  chuaBiet('sơn (chất phủ) cho da thuộc ⇒ CHUA_BIET', 'vatLieuKhac', 'Chế phẩm thuốc màu dùng để sản xuất sơn (chất phủ) cho da thuộc');
  chuaBiet('giầy dép dùng cho da thuộc ⇒ CHUA_BIET', 'vatLieuKhac', 'giầy dép dùng cho da thuộc');
  chuaBiet('giày dép dùng cho da thuộc ⇒ CHUA_BIET', 'vatLieuKhac', 'giày dép dùng cho da thuộc');
  chuaBiet('chất đánh bóng cho giầy dép hoặc da thuộc ⇒ CHUA_BIET', 'vatLieuKhac', 'Chất đánh bóng cho giầy dép hoặc da thuộc');
  chuaBiet('chữ biểu 3405.10.00 (dùng cho giày dép hoặc da thuộc) ⇒ CHUA_BIET', 'vatLieuKhac', 'Chất đánh bóng, kem và các chế phẩm tương tự dùng cho giày dép hoặc da thuộc');
  chuaBiet('chữ biểu 3403.91 (xử lý vật liệu dệt, da thuộc) ⇒ CHUA_BIET', 'vatLieuKhac', 'Chế phẩm dùng để xử lý bằng dầu hoặc mỡ cho các vật liệu dệt, da thuộc, da lông hoặc các vật liệu khác');
  chuaBiet('En Leather paints (3209.10.40) ⇒ CHUA_BIET', 'vatLieuKhac', 'Leather paints');
  chuaBiet('En for footwear or leather (3405.10.00) ⇒ CHUA_BIET', 'vatLieuKhac', 'Polishes, creams and similar preparations for footwear or leather');
  chuaBiet('En used in the leather or like industries (3809.93.00) ⇒ CHUA_BIET', 'vatLieuKhac', 'Of a kind used in the leather or like industries');
  chuaBiet('En preparations / cleaner / conditioner / polish / dye / finish for leather ⇒ CHUA_BIET', 'vatLieuKhac', 'preparations for leather, leather cleaner, leather conditioner, leather cream, leather polish, leather dye, leather finish');
  chuaBiet('En treatment of textile and similar materials (leather, furskins) ⇒ CHUA_BIET', 'vatLieuKhac', 'Lubricating preparations for the treatment of textile and similar materials (leather, furskins etc)');
  chuaBiet('En machinery for hides, skin or leather (8453.90.00) ⇒ CHUA_BIET', 'vatLieuKhac', 'Machinery; parts of those for preparing, tanning or working hides, skins or leather, for making or repairing footwear or other articles of hides, skin or leather, other than sewing machines');
  chuaBiet('phủ định không phải da thuộc ⇒ CHUA_BIET', 'vatLieuKhac', 'Túi xách không phải bằng da thuộc');
  {
    const r = chuaBiet('hai giá trị 4202.11 / 4202.21.00 ("da thuộc hoặc da thuộc tổng hợp") ⇒ CHUA_BIET', 'vatLieuKhac', 'Mặt ngoài bằng da thuộc hoặc da thuộc tổng hợp');
    check('vatLieuKhac 4202.11 ⇒ ungVien [DA_THUOC, DA_THUOC_TONG_HOP] và kiemDieuKien đạt', JSON.stringify((r.ungVien || []).slice().sort()) === JSON.stringify(['DA_THUOC', 'DA_THUOC_TONG_HOP']) && DK.kiemDieuKien({ fact: 'vatLieuKhac', op: 'TRONG', value: ['DA_THUOC', 'DA_THUOC_TONG_HOP'] }, 'Mặt ngoài bằng da thuộc hoặc da thuộc tổng hợp') === null, r);
  }
  check('vietCum vatLieuKhac DA_THUOC / DA_THUOC_TONG_HOP', viet('vatLieuKhac', 'DA_THUOC') === 'bằng da thuộc' && viet('vatLieuKhac', 'DA_THUOC_TONG_HOP') === 'bằng da thuộc tổng hợp', [viet('vatLieuKhac', 'DA_THUOC'), viet('vatLieuKhac', 'DA_THUOC_TONG_HOP')]);

  // 2. dangTam — CO_KHONG
  la('chữ biểu 2515.12.20 ("Dạng tấm (SEN)")', 'dangTam', 'Dạng tấm (SEN)', true);
  la('chữ biểu 3920.20.91 ("Dạng tấm và phiến (SEN)")', 'dangTam', 'Dạng tấm và phiến (SEN)', true);
  la('chữ biểu 4202.22.10 ("Mặt ngoài bằng tấm plastic")', 'dangTam', 'Mặt ngoài bằng tấm plastic', true, { bc: 'tấm plastic' });
  la('mô tả tấm cao su', 'dangTam', 'Tấm cao su lưu hóa dày 5 mm', true);
  la('En slabs', 'dangTam', 'Polished slabs of granite', true);
  la('En plates and sheets', 'dangTam', 'Plates and sheets of plastics', true);
  la('En sheeting of plastics (4202.22.10)', 'dangTam', 'With outer surface of sheeting of plastics', true);
  la('En in sheets', 'dangTam', 'Float glass in sheets', true);
  la('Zh 板状', 'dangTam', '板状大理石', true);
  la('Zh 塑料板材', 'dangTam', '塑料板材', true);
  la('chữ biểu 2515.12.10 ("Dạng khối (SEN)") ⇒ false', 'dangTam', 'Dạng khối (SEN)', false);
  la('phủ định không phải dạng tấm ⇒ false', 'dangTam', 'Hàng không phải dạng tấm', false);
  la('En not in sheets ⇒ false', 'dangTam', 'Not in sheets', false);
  la('Zh 非板状 ⇒ false', 'dangTam', '非板状', false);
  chuaBiet('không bắt nhầm tấm ảnh', 'dangTam', 'Tấm ảnh gia đình đóng khung');
  chuaBiet('không bắt nhầm tấm bưu thiếp', 'dangTam', 'Tấm bưu thiếp chúc mừng');
  chuaBiet('không bắt nhầm tấm thảm', 'dangTam', 'Tấm thảm trải sàn dệt kim');
  chuaBiet('không bắt nhầm tấm nệm', 'dangTam', 'Tấm nệm cao su thiên nhiên');
  chuaBiet('không bắt nhầm ngũ cốc dạng tấm (11.03)', 'dangTam', 'Ngũ cốc dạng tấm, dạng bột thô và viên');
  chuaBiet('không bắt nhầm dạng tấm rời để ghép (3918.10.11)', 'dangTam', 'Dạng tấm rời để ghép');
  chuaBiet('không bắt nhầm dạng tấm hoặc dạng cuộn (6806.10.00)', 'dangTam', 'Bông len đá ở dạng rời, dạng tấm hoặc dạng cuộn');
  chuaBiet('không có chữ dạng tấm ⇒ CHUA_BIET', 'dangTam', 'Ống thép tròn hàn nối đường kính 50 mm');
  check('vietCum dangTam true/false', viet('dangTam', true) === 'dạng tấm' && viet('dangTam', false) === 'không phải dạng tấm', [viet('dangTam', true), viet('dangTam', false)]);

  // 3. nguonDongLuc — LIET_KE THUY_LUC | KHI_NEN
  la('Vi thủy lực (dấu ở ủ)', 'nguonDongLuc', 'Động cơ và mô tơ thủy lực', 'THUY_LUC');
  la('Vi thuỷ lực (dấu ở ỷ — chữ biểu 8462.61)', 'nguonDongLuc', 'Máy ép thuỷ lực', 'THUY_LUC');
  la('chữ biểu 9822.20.00 (Máy ép thủy lực)', 'nguonDongLuc', 'Máy ép thủy lực', 'THUY_LUC');
  la('En hydraulic', 'nguonDongLuc', 'Hydraulic presses for metal working', 'THUY_LUC');
  la('En hydraulically', 'nguonDongLuc', 'Hydraulically operated lifting jack', 'THUY_LUC');
  la('Zh 液压', 'nguonDongLuc', '液压机', 'THUY_LUC');
  la('Zh 水力', 'nguonDongLuc', '水力涡轮机', 'THUY_LUC');
  la('Vi khí nén (8412.3)', 'nguonDongLuc', 'Động cơ và mô tơ dùng khí nén', 'KHI_NEN');
  la('Xi lanh khí nén MXQ8-50 ⇒ KHI_NEN', 'nguonDongLuc', 'Xi lanh khí nén MXQ8-50', 'KHI_NEN');
  la('Van dùng trong truyền động dầu thủy lực ⇒ THUY_LUC', 'nguonDongLuc', 'Van dùng trong truyền động dầu thủy lực', 'THUY_LUC');
  la('chữ biểu 8467.92.00 (Của dụng cụ hoạt động bằng khí nén)', 'nguonDongLuc', 'Của dụng cụ hoạt động bằng khí nén', 'KHI_NEN');
  la('En pneumatic', 'nguonDongLuc', 'Pneumatic elevators and conveyors', 'KHI_NEN');
  la('En compressed air', 'nguonDongLuc', 'Impact wrench powered by compressed air', 'KHI_NEN');
  la('Zh 气动', 'nguonDongLuc', '气动扳手', 'KHI_NEN');
  la('Zh 气压', 'nguonDongLuc', '气压驱动工具', 'KHI_NEN');
  la('phủ định vế khí nén ⇒ chỉ còn THUY_LUC', 'nguonDongLuc', 'Động cơ thủy lực, không dùng khí nén', 'THUY_LUC');
  chuaBiet('không bắt nhầm vôi thủy lực 2522.30.00', 'nguonDongLuc', 'Vôi thủy lực');
  chuaBiet('không bắt nhầm xi măng thủy lực 2523.90.00', 'nguonDongLuc', 'Xi măng thủy lực khác');
  chuaBiet('không bắt nhầm dầu phanh thủy lực 2710.19.50', 'nguonDongLuc', 'Dầu dùng trong bộ hãm thủy lực (dầu phanh)');
  chuaBiet('không bắt nhầm dầu phanh thủy lực ngắn', 'nguonDongLuc', 'dầu phanh thủy lực');
  chuaBiet('không bắt nhầm dầu thủy lực AW 46', 'nguonDongLuc', 'dầu thủy lực AW 46');
  chuaBiet('không bắt nhầm dầu thuỷ lực', 'nguonDongLuc', 'dầu thuỷ lực');
  chuaBiet('không bắt nhầm nhớt thủy lực / dung dịch thủy lực / chất lỏng thủy lực', 'nguonDongLuc', 'nhớt thủy lực, dung dịch thủy lực, chất lỏng thủy lực');
  chuaBiet('không bắt nhầm 3819.00.00 VI (chất lỏng truyền động thủy lực)', 'nguonDongLuc', 'Chất lỏng dùng trong bộ hãm thủy lực và các chất lỏng đã được điều chế khác dùng cho sự truyền động thủy lực, không chứa hoặc chứa dưới 70% tính theo trọng lượng dầu có nguồn gốc từ dầu mỏ hoặc các loại dầu thu được từ khoáng bi-tum');
  chuaBiet('không bắt nhầm 3819.00.00 EN (hydraulic brake fluids / for hydraulic transmission)', 'nguonDongLuc', 'Hydraulic brake fluids and other prepared liquids for hydraulic transmission, not containing or containing less than 70% by weight of petroleum oils or oils obtained from bituminous minerals');
  chuaBiet('không bắt nhầm hydraulic oil / hydraulic brake fluid', 'nguonDongLuc', 'hydraulic oil, hydraulic brake fluid');
  chuaBiet('không bắt nhầm phốt làm kín thủy lực / bộ phận chuyển động của hệ thống thủy lực', 'nguonDongLuc', 'Phốt làm kín thủy lực, ngăn chặn sự rò rỉ chất lỏng thủy lực giữa các bộ phận chuyển động của hệ thống thủy lực');
  chuaBiet('không bắt nhầm bình tích áp khí nén / bình chứa khí nén', 'nguonDongLuc', 'bình tích áp khí nén và bình chứa khí nén');
  chuaBiet('không bắt nhầm thùng chứa khí nén 7613.00.00', 'nguonDongLuc', 'Các loại thùng chứa khí nén hoặc khí hóa lỏng bằng nhôm');
  chuaBiet('không bắt nhầm khí nén thương phẩm 2853 VI & EN', 'nguonDongLuc', 'khí hóa lỏng (đã hoặc chưa loại bỏ khí hiếm); khí nén; hỗn hống; liquid air; compressed air; amalgams');
  chuaBiet('không bắt nhầm pneumatic tyres 4011', 'nguonDongLuc', 'New pneumatic tyres, of rubber');
  chuaBiet('động cơ điện ⇒ CHUA_BIET', 'nguonDongLuc', 'Động cơ điện xoay chiều 3 pha công suất 5 kW');
  {
    const r = chuaBiet('8481.20 hai nguồn ("dầu thủy lực hoặc khí nén") ⇒ CHUA_BIET', 'nguonDongLuc', 'Van dùng trong truyền động dầu thủy lực hoặc khí nén');
    check('nguonDongLuc 8481.20 ⇒ ungVien [KHI_NEN, THUY_LUC] và kiemDieuKien đạt', JSON.stringify((r.ungVien || []).slice().sort()) === JSON.stringify(['KHI_NEN', 'THUY_LUC']) && DK.kiemDieuKien({ fact: 'nguonDongLuc', op: 'TRONG', value: ['THUY_LUC', 'KHI_NEN'] }, 'Van dùng trong truyền động dầu thủy lực hoặc khí nén') === null, r);
  }
  {
    const r = chuaBiet('8481.20 ("truyền động dầu thủy lực hoặc truyền động khí nén") ⇒ CHUA_BIET', 'nguonDongLuc', 'Van dùng trong truyền động dầu thủy lực hoặc truyền động khí nén');
    check('nguonDongLuc 8481.20 đầy đủ ⇒ ungVien [KHI_NEN, THUY_LUC] và kiemDieuKien đạt', JSON.stringify((r.ungVien || []).slice().sort()) === JSON.stringify(['KHI_NEN', 'THUY_LUC']) && DK.kiemDieuKien({ fact: 'nguonDongLuc', op: 'TRONG', value: ['THUY_LUC', 'KHI_NEN'] }, 'Van dùng trong truyền động dầu thủy lực hoặc truyền động khí nén') === null, r);
  }
  check('vietCum nguonDongLuc THUY_LUC / KHI_NEN', viet('nguonDongLuc', 'THUY_LUC') === 'dùng thủy lực' && viet('nguonDongLuc', 'KHI_NEN') === 'dùng khí nén', [viet('nguonDongLuc', 'THUY_LUC'), viet('nguonDongLuc', 'KHI_NEN')]);

  // 4. ReDoS ~40.000 từ lặp < 2 giây (CLAUDE.md quy tắc 6b) — gồm cả chuỗi tiền tố/hậu tố cận khớp
  const redos1584 = Array(4000).fill('túi vải giả da dạng hộp hoặc ống bằng động cơ điện xoay chiều').join(' ');
  const redos1584GanKhop = Array(3000).fill('giả da thuộc faux-leather dầu thủy lực bình tích áp khí nén ngũ cốc dạng tấm').join(' ');
  for (const fk of ['vatLieuKhac', 'dangTam', 'nguonDongLuc']) {
    const t0 = process.hrtime.bigint();
    const r = T.docGiaTri(fk, redos1584);
    const r2 = T.docGiaTri(fk, redos1584GanKhop);
    if (r.trangThai !== 'CHUA_BIET' || r2.trangThai !== 'CHUA_BIET') throw new Error(`Expected CHUA_BIET for ${fk}`);
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    check(`#1584 ReDoS ~40.000 từ lặp (+ cận khớp) cho ${fk} < 2000 ms (thực tế ${ms.toFixed(0)} ms)`, ms < 2000, { fk, ms });
  }
}

// OZV-1796 — kiểm chứng 4 khoá mới (daHapChinHoacLuocChin, khoiLuongHangChuyenCho, tyLeLotQuaLuoiLoc1mm, tyLeLotQuaLuoiLoc5mm)
// và giaTriCha DA_BO_DAU trong soCheTom + ReDoS 40.000 từ lặp < 500 ms (quy tắc 6b).
{
  // 1. daHapChinHoacLuocChin (9804.28.11)
  la('chữ biểu 9804.28.11 (Còn vỏ, đã hấp chín hoặc luộc chín trong nước)', 'daHapChinHoacLuocChin', 'Còn vỏ, đã hấp chín hoặc luộc chín trong nước', true);
  la('En cooked by steaming or by boiling in water', 'daHapChinHoacLuocChin', 'In shell, cooked by steaming or by boiling in water', true);
  la('Zh 经蒸煮或水煮', 'daHapChinHoacLuocChin', '带壳，经蒸煮或水煮', true);
  la('phủ định chưa hấp chín hoặc luộc chín trong nước ⇒ false', 'daHapChinHoacLuocChin', 'Tôm hun khói còn vỏ, chưa hấp chín hoặc luộc chín trong nước', false);
  chuaBiet('tiêu đề nhóm 98.04 đã hoặc chưa luộc chín trước hoặc trong quá trình hun khói ⇒ CHUA_BIET', 'daHapChinHoacLuocChin', 'Động vật giáp xác, đã được hun khói, đã hoặc chưa bóc vỏ, đã hoặc chưa luộc chín trước hoặc trong quá trình hun khói');

  // 2. khoiLuongHangChuyenCho (8716.39.91)
  la('chữ biểu 8716.39.91 (payload trên 200 tấn)', 'khoiLuongHangChuyenCho', 'Có khối lượng hàng chuyên chở theo thiết kế (payload) trên 200 tấn', 200000, { op: '>' });
  la('En carrying capacity (payload) exceeding 200000 kg', 'khoiLuongHangChuyenCho', 'Having a carrying capacity (payload) exceeding 200000 kg', 200000, { op: '>' });
  la('Zh 设计载重量250000千克', 'khoiLuongHangChuyenCho', '设计载重量250000千克', 250000, { op: null });
  chuaBiet('chỉ ghi khối lượng toàn bộ GVW không ghi tải trọng chuyên chở ⇒ CHUA_BIET', 'khoiLuongHangChuyenCho', 'Rơ-moóc có khối lượng toàn bộ theo thiết kế 220 tấn');

  // 3. tyLeLotQuaLuoiLoc1mm & tyLeLotQuaLuoiLoc5mm (sen.3907 — 3907.69.10 / 3907.91.20)
  const sen3907 = 'DẠNG HẠT VÀ CÁC DẠNG TƯƠNG TỰ\nSản phẩm dạng rắn ở dạng nguyên sinh trừ dạng bột, có ít hơn 10% khối lượng lọt qua lưới lọc có đường kính mắt lọc là 1mm và sản phẩm có 90% khối lượng trở lên lọt qua lưới lọc có đường kính mắt lọc là 5mm.';
  la('sen.3907 đọc tyLeLotQuaLuoiLoc1mm < 10%', 'tyLeLotQuaLuoiLoc1mm', sen3907, 10, { op: '<' });
  la('sen.3907 đọc tyLeLotQuaLuoiLoc5mm >= 90%', 'tyLeLotQuaLuoiLoc5mm', sen3907, 90, { op: '>=' });
  la('cachViet đọc lại tyLeLotQuaLuoiLoc1mm 5%', 'tyLeLotQuaLuoiLoc1mm', 'khối lượng lọt qua lưới lọc mắt lọc 1 mm 5%', 5, { op: null });
  la('cachViet đọc lại tyLeLotQuaLuoiLoc5mm 95%', 'tyLeLotQuaLuoiLoc5mm', 'khối lượng lọt qua lưới lọc mắt lọc 5 mm 95%', 95, { op: null });
  chuaBiet('tyLeLotQuaLuoiLoc1mm không bắt nhầm lưới 5mm ⇒ CHUA_BIET', 'tyLeLotQuaLuoiLoc1mm', 'khối lượng lọt qua lưới lọc mắt lọc 5 mm 95%');

  // 4. soCheTom giaTriCha DA_BO_DAU ⊃ [DA_BO_DAU_CON_DUOI, DA_BO_DAU_BO_DUOI] (9804.17.11)
  const kTom = T.layKhoa('soCheTom');
  check('soCheTom có giaTriCha DA_BO_DAU ⊃ DA_BO_DAU_CON_DUOI, DA_BO_DAU_BO_DUOI', JSON.stringify(kTom?.giaTriCha?.DA_BO_DAU) === JSON.stringify(['DA_BO_DAU_CON_DUOI', 'DA_BO_DAU_BO_DUOI']), kTom?.giaTriCha);

  // 5. ReDoS ~40.000 từ lặp < 500 ms (CLAUDE.md quy tắc 6b + OZV-1796)
  const redosText1796 = Array(8000).fill('tôm còn vỏ khối lượng hàng chuyên chở lưới lọc').join(' ');
  const t0 = process.hrtime.bigint();
  for (const fk of ['daHapChinHoacLuocChin', 'khoiLuongHangChuyenCho', 'tyLeLotQuaLuoiLoc1mm', 'tyLeLotQuaLuoiLoc5mm', 'soCheTom']) {
    T.docGiaTri(fk, redosText1796);
  }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  check(`OZV-1796 ReDoS ~40.000 từ lặp trên 5 khoá < 500 ms (thực tế ${ms.toFixed(0)} ms)`, ms < 500, { ms });

}

// OZV-1799 — kiểm chứng mở rộng lopMaPhu (OXIT_CROM, PHU_MA_KHAC), dangDaiDaiTamPhoDung (DANG_CAN_PHANG_KHAC,
// TAM_PHO_DUNG trên 7212.50.14), hinhDangMatCatNgang (KHAC_TRON) + ReDoS ~40.000 từ lặp < 2 giây (quy tắc 6b).
{
  // 1. lopMaPhu — OXIT_CROM (7212.50.1) & PHU_MA_KHAC (7212.50.93/.94)
  la('tiêu đề 7212.50.1 (oxit crôm)', 'lopMaPhu', '7212501 Được phủ, mạ hoặc tráng bằng oxit crôm hoặc bằng crôm và oxit crôm', 'OXIT_CROM');
  la('En chromium oxides', 'lopMaPhu', 'Plated or coated with chromium oxides or with chromium and chromium oxides', 'OXIT_CROM');
  la('Zh 镀氧化铬', 'lopMaPhu', '镀氧化铬钢板', 'OXIT_CROM');
  la('mạ niken ⇒ PHU_MA_KHAC', 'lopMaPhu', 'Thép đai cán phẳng được mạ niken', 'PHU_MA_KHAC');
  la('En plated with nickel ⇒ PHU_MA_KHAC', 'lopMaPhu', 'Flat-rolled steel strip plated with nickel', 'PHU_MA_KHAC');
  chuaBiet('chỉ ghi được phủ, mạ hoặc tráng bằng phương pháp khác trần ⇒ CHUA_BIET', 'lopMaPhu', 'Được phủ, mạ hoặc tráng bằng phương pháp khác');

  // 2. dangDaiDaiTamPhoDung — 7212.50.14 & DANG_CAN_PHANG_KHAC
  la('chữ biểu 7212.50.14 (Dạng đai và dải(SEN), chiều rộng trên 25 mm; tấm phổ dụng (SEN)) ⇒ DAI_VA_DAI (cumDaiThang)', 'dangDaiDaiTamPhoDung', 'Dạng đai và dải(SEN), chiều rộng trên 25 mm; tấm phổ dụng (SEN)', 'DAI_VA_DAI');
  la('tấm phổ dụng độc lập ⇒ TAM_PHO_DUNG', 'dangDaiDaiTamPhoDung', 'Tấm phổ dụng (SEN)', 'TAM_PHO_DUNG');
  la('dạng đai và dải khác; tấm phổ dụng ⇒ DAI_DAI_HOAC_PHO_DUNG', 'dangDaiDaiTamPhoDung', 'Dạng đai và dải khác; tấm phổ dụng(SEN)', 'DAI_DAI_HOAC_PHO_DUNG');
  la('dạng tấm cắt sẵn ⇒ DANG_CAN_PHANG_KHAC', 'dangDaiDaiTamPhoDung', 'Thép cán phẳng dạng tấm cắt sẵn', 'DANG_CAN_PHANG_KHAC');
  la('En cut-to-length sheets ⇒ DANG_CAN_PHANG_KHAC', 'dangDaiDaiTamPhoDung', 'Flat-rolled steel cut-to-length sheets', 'DANG_CAN_PHANG_KHAC');

  // 3. hinhDangMatCatNgang — KHAC_TRON (7215.50.10)
  la('chữ biểu 7215.50.10 (trừ dạng mặt cắt ngang hình tròn) ⇒ KHAC_TRON', 'hinhDangMatCatNgang', 'Có hàm lượng carbon từ 0,6% trở lên tính theo khối lượng, trừ dạng mặt cắt ngang hình tròn', 'KHAC_TRON');
  la('mặt cắt ngang hình lục giác ⇒ KHAC_TRON', 'hinhDangMatCatNgang', 'Thanh thép kéo nguội mặt cắt ngang hình lục giác', 'KHAC_TRON');
  la('En hexagonal cross-section ⇒ KHAC_TRON', 'hinhDangMatCatNgang', 'Cold-finished steel bar of hexagonal cross-section', 'KHAC_TRON');
  la('mặt cắt ngang hình tròn vẫn ⇒ TRON', 'hinhDangMatCatNgang', 'Có mặt cắt ngang hình tròn', 'TRON');

  // 4. ReDoS ~40.000 từ lặp < 2 giây (CLAUDE.md quy tắc 6b)
  const redosText1799 = Array(4000).fill('được phủ mạ hoặc tráng bằng dạng đai hoặc tấm mặt cắt ngang').join(' ');
  const t0 = process.hrtime.bigint();
  for (const fk of ['lopMaPhu', 'dangDaiDaiTamPhoDung', 'hinhDangMatCatNgang']) {
    T.docGiaTri(fk, redosText1799);
  }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  check(`OZV-1799 ReDoS ~40.000 từ lặp trên 3 khoá mở rộng < 2000 ms (thực tế ${ms.toFixed(0)} ms)`, ms < 2000, { ms });
}

// OZV-1803 — kiểm chứng mở rộng chieuRong (4013.10.21), tinhTrangTayTrang (5007.20.20 / 5007.20.90), doDay (3921.11.91)
// + ReDoS ~40.000 từ lặp < 2 giây (quy tắc 6b).
{
  // 1. chieuRong (4013.10.11 / 4013.10.21)
  la('chữ biểu 4013.10.21 (Dùng cho loại lốp có chiều rộng không quá 450 mm)', 'chieuRong', '40131021 - - - Dùng cho loại lốp có chiều rộng không quá 450 mm', 450, { op: '<=' });
  la('chữ biểu 4013.10.29 (Dùng cho loại lốp có chiều rộng trên 450 mm)', 'chieuRong', '40131029 - - - Dùng cho loại lốp có chiều rộng trên 450 mm', 450, { op: '>' });
  la('cachViet đọc lại chieuRong (rộng 350 mm)', 'chieuRong', 'Săm cao su dùng cho xe buýt, rộng 350mm', 350, { op: null });
  chuaBiet('săm cao su dùng cho lốp xe không ghi chiều rộng ⇒ CHUA_BIET', 'chieuRong', 'Săm cao su dùng cho lốp xe buýt hoặc xe tải');

  // 2. tinhTrangTayTrang (5007.20.20 / 5007.20.90 — Chú giải phân nhóm 1 Phần XI)
  {
    const r5007 = chuaBiet('chữ biểu 5007.20.20 gộp hai giá trị ⇒ CHUA_BIET kèm ungVien', 'tinhTrangTayTrang', '50072020 - - Chưa tẩy trắng hoặc đã tẩy trắng');
    check('tinhTrangTayTrang 5007.20.20 ⇒ ungVien [CHUA_TAY_TRANG, DA_TAY_TRANG]', JSON.stringify((r5007.ungVien || []).slice().sort()) === JSON.stringify(['CHUA_TAY_TRANG', 'DA_TAY_TRANG']), r5007);
  }
  la('vải tơ tằm chưa tẩy trắng ⇒ CHUA_TAY_TRANG', 'tinhTrangTayTrang', 'Vải dệt thoi từ tơ tằm chưa tẩy trắng', 'CHUA_TAY_TRANG');
  la('vải tơ tằm đã tẩy trắng ⇒ DA_TAY_TRANG', 'tinhTrangTayTrang', 'Vải dệt thoi từ tơ tằm đã tẩy trắng', 'DA_TAY_TRANG');
  la('vải tơ tằm đã nhuộm ⇒ DA_NHUOM', 'tinhTrangTayTrang', 'Vải dệt thoi từ tơ tằm đã nhuộm', 'DA_NHUOM');
  la('vải tơ tằm từ sợi nhiều màu ⇒ TU_SOI_MAU', 'tinhTrangTayTrang', 'Vải dệt thoi từ tơ tằm từ sợi nhiều màu', 'TU_SOI_MAU');
  la('vải tơ tằm đã in ⇒ DA_IN', 'tinhTrangTayTrang', 'Vải dệt thoi từ tơ tằm đã in', 'DA_IN');
  la('En dyed silk fabric ⇒ DA_NHUOM', 'tinhTrangTayTrang', 'Woven silk fabric, dyed', 'DA_NHUOM');
  la('Zh 印花的丝织物 ⇒ DA_IN', 'tinhTrangTayTrang', '印花的丝织物', 'DA_IN');
  chuaBiet('vải tơ tằm không nêu tình trạng tẩy/nhuộm/in ⇒ CHUA_BIET', 'tinhTrangTayTrang', 'Vải dệt thoi chứa 85% trọng lượng trở lên là tơ tằm');

  // 3. doDay (3921.11.91 / 3921.14.91 / 3921.90.41 — đọc số thập phân 3 chữ số từ cumKhangDinh > 0.25 mm)
  la('cumKhangDinh dày 1,375mm (> 0.25 mm) đọc được số dương > 0.25 mm', 'doDay', 'Tấm, phiến từ polyme styren, xốp, dày 1,375mm', 1.37, { op: null });
  la('dày 0,25 mm đọc đúng 0.25 mm', 'doDay', 'Dạng băng, chiều dày không quá 0,25 mm', 0.25, { op: '<=' });

  // 4. ReDoS ~40.000 từ lặp < 2 giây (CLAUDE.md quy tắc 6b)
  const redosText1803 = Array(8000).fill('dùng cho loại lốp có chiều rộng vải tơ tằm chưa tẩy trắng chiều dày').join(' ');
  const t0 = process.hrtime.bigint();
  for (const fk of ['chieuRong', 'tinhTrangTayTrang', 'doDay']) {
    T.docGiaTri(fk, redosText1803);
  }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  check(`OZV-1803 ReDoS ~40.000 từ lặp trên 3 khoá < 2000 ms (thực tế ${ms.toFixed(0)} ms)`, ms < 2000, { ms });
}

// OZV-1804 — kiểm chứng 2 khoá mới (cuaLoaiGiaCam, tuXoDay) và mở rộng dangDaiDaiTamPhoDung/dangLuonSong/hinhDangMatCatNgang/loaiSoiDet + ReDoS ~40.000 từ lặp < 2 giây (quy tắc 6b).
{
  // 1. cuaLoaiGiaCam (0407.19.1, 0407.29.10, 0407.90.10/.20)
  la('chữ biểu 0407.90.10 (Của gà thuộc loài Gallus domesticus) ⇒ GA_GALLUS_DOMESTICUS', 'cuaLoaiGiaCam', 'Của gà thuộc loài Gallus domesticus', 'GA_GALLUS_DOMESTICUS');
  la('En Of fowls of the species Gallus domesticus ⇒ GA_GALLUS_DOMESTICUS', 'cuaLoaiGiaCam', 'Eggs of fowls of the species Gallus domesticus', 'GA_GALLUS_DOMESTICUS');
  la('Zh 家鸡（Gallus domesticus） ⇒ GA_GALLUS_DOMESTICUS', 'cuaLoaiGiaCam', '家鸡（Gallus domesticus）种蛋', 'GA_GALLUS_DOMESTICUS');
  la('chữ biểu 0407.19.1 / 0407.29.10 (Của vịt, ngan) ⇒ VIT_NGAN', 'cuaLoaiGiaCam', 'Của vịt, ngan', 'VIT_NGAN');
  la('trứng vịt ⇒ VIT_NGAN', 'cuaLoaiGiaCam', 'Trứng vịt muối nguyên vỏ', 'VIT_NGAN');
  la('En Of ducks ⇒ VIT_NGAN', 'cuaLoaiGiaCam', 'Fertilised eggs of ducks for incubation', 'VIT_NGAN');
  la('Zh 鸭蛋 ⇒ VIT_NGAN', 'cuaLoaiGiaCam', '新鲜鸭蛋', 'VIT_NGAN');
  la('trứng chim cút ⇒ GIA_CAM_CHIM_KHAC', 'cuaLoaiGiaCam', 'Trứng chim cút ăn liền nguyên vỏ', 'GIA_CAM_CHIM_KHAC');
  la('En quail eggs ⇒ GIA_CAM_CHIM_KHAC', 'cuaLoaiGiaCam', 'Fresh quail eggs in shell', 'GIA_CAM_CHIM_KHAC');
  chuaBiet('chỉ ghi trứng gia cầm nguyên vỏ trần ⇒ CHUA_BIET', 'cuaLoaiGiaCam', 'Trứng chim và trứng gia cầm, nguyên vỏ, sống');

  // 2. tuXoDay (5702.39.20, 5702.49.20, 5702.50.20, 5702.99.20)
  la('chữ biểu 5702.39.20 (Từ xơ đay) ⇒ true', 'tuXoDay', 'Từ xơ đay', true);
  la('thảm dệt thoi từ đay ⇒ true', 'tuXoDay', 'Thảm trải sàn dệt thoi từ đay tự nhiên', true);
  la('En Of jute fibres ⇒ true', 'tuXoDay', 'Woven carpets of jute fibres', true);
  la('Zh 黄麻纤维制 ⇒ true', 'tuXoDay', '黄麻纤维制机织地毯', true);
  la('thảm từ xơ sisal (phản chứng traVe 570239) ⇒ false', 'tuXoDay', 'Thảm dệt thoi từ xơ sisal, chưa chần', false);
  la('thảm từ xơ dừa ⇒ false', 'tuXoDay', 'Thảm chùi chân dệt từ xơ dừa', false);
  la('En of sisal ⇒ false', 'tuXoDay', 'Woven floor coverings of sisal', false);
  chuaBiet('chỉ ghi thảm từ các vật liệu dệt khác trần ⇒ CHUA_BIET', 'tuXoDay', 'Loại khác, có cấu tạo nổi vòng - Từ các vật liệu dệt khác');

  // 3. Mở rộng dangDaiDaiTamPhoDung & dangLuonSong (7211.23.30, 7211.29.30, 7211.90.14) và hinhDangMatCatNgang (7214.20.41/.61)
  la('7211.23.30 (Loại khác, chiều dày không quá 0,17 mm) ⇒ DANG_CAN_PHANG_KHAC', 'dangDaiDaiTamPhoDung', 'Loại khác, chiều dày không quá 0,17 mm', 'DANG_CAN_PHANG_KHAC');
  la('7211.23.30 (Loại khác, chiều dày không quá 0,17 mm) ⇒ dangLuonSong false', 'dangLuonSong', 'Loại khác, chiều dày không quá 0,17 mm', false);
  la('7214.20.41 (xoắn sau khi cán: C < 0,6%: Thép cốt bê tông) ⇒ KHAC_TRON', 'hinhDangMatCatNgang', 'Có răng khía, rãnh, gân hoặc các dạng khác được tạo thành trong quá trình cán hoặc xoắn sau khi cán: Có hàm lượng carbon dưới 0,6% tính theo khối lượng: Thép cốt bê tông', 'KHAC_TRON');
  la('7214.20.31 (Có mặt cắt ngang hình tròn: Thép cốt bê tông) vẫn ⇒ TRON', 'hinhDangMatCatNgang', 'Có răng khía, rãnh, gân hoặc các dạng khác được tạo thành trong quá trình cán hoặc xoắn sau khi cán: Có hàm lượng carbon dưới 0,6% tính theo khối lượng - Có mặt cắt ngang hình tròn: Thép cốt bê tông', 'TRON');

  // 4. ReDoS ~40.000 từ lặp < 2 giây (CLAUDE.md quy tắc 6b)
  const redosText1804 = Array(3500).fill('trứng của gà thuộc loài thảm từ các vật liệu khác xoắn sau khi cán').join(' ');
  for (const fk of ['cuaLoaiGiaCam', 'tuXoDay', 'dangDaiDaiTamPhoDung', 'dangLuonSong', 'hinhDangMatCatNgang', 'loaiSoiDet']) {
    const t0 = process.hrtime.bigint();
    T.docGiaTri(fk, redosText1804);
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    check(`OZV-1804 ReDoS ~40.000 từ lặp cho ${fk} < 2000 ms (thực tế ${ms.toFixed(0)} ms)`, ms < 2000, { fk, ms });
  }
}

// #1595 (T-3b) — soPha.NHIEU_PHA đọc "đa pha" qua cachDocThem (giữ nguyên 53 khoá tu-vung@1 đóng băng)
{
  const DK = require('../lib/dieu-kien-so.js');
  const TVe = require('../lib/ho-so/tach-ve.js');
  const kSoPha = T.layKhoa('soPha');

  // Thuận: docGiaTri + cachDocGiaTri + DK.kiemDieuKien + tach-ve.neoMot nhận "đa pha"
  la('T-3b soPha "Động cơ xoay chiều khác, đa pha" ⇒ NHIEU_PHA', 'soPha', 'Động cơ xoay chiều khác, đa pha', 'NHIEU_PHA', { bc: 'đa pha' });
  const cd = T.cachDocGiaTri(kSoPha, 'NHIEU_PHA');
  check('T-3b cachDocGiaTri(soPha, NHIEU_PHA) giữ mẫu @1 và ghép "đa pha"',
    ['ba pha', '3 pha', 'nhiều pha', 'đa pha'].every((p) => cd.vi.includes(p)) && cd.en.includes('poly-?phase') && cd.zh.includes('多相'),
    cd);
  check('T-3b DK.kiemDieuKien soPha TRONG [NHIEU_PHA] trên "Động cơ xoay chiều khác, đa pha" ⇒ null',
    DK.kiemDieuKien({ fact: 'soPha', op: 'TRONG', value: ['NHIEU_PHA'] }, 'Động cơ xoay chiều khác, đa pha') === null);
  check('T-3b tach-ve.neoMot soPha TRONG [NHIEU_PHA] neo được vào "Động cơ xoay chiều khác, đa pha"',
    TVe.neoMot({ fact: 'soPha', op: 'TRONG', value: ['NHIEU_PHA'] }, 'Động cơ xoay chiều khác, đa pha').length === 1);

  // Nghịch: "một pha" vẫn MOT_PHA; phủ định / ranh giới từ ⇒ CHUA_BIET; kiemTuVung từ chối cachDocThem sai
  la('T-3b soPha (nghịch): "Động cơ xoay chiều khác, một pha" ⇒ MOT_PHA (không nhảy NHIEU_PHA)', 'soPha', 'Động cơ xoay chiều khác, một pha', 'MOT_PHA');
  chuaBiet('T-3b soPha (nghịch): phủ định "không đa pha" ⇒ CHUA_BIET', 'soPha', 'không đa pha');
  chuaBiet('T-3b soPha (nghịch): ranh giới từ "hàng đa năng pha lê" ⇒ CHUA_BIET', 'soPha', 'hàng đa năng pha lê');
  check('T-3b DK.kiemDieuKien (nghịch): trích chỉ nói "một pha" không qua NHIEU_PHA',
    DK.kiemDieuKien({ fact: 'soPha', op: 'TRONG', value: ['NHIEU_PHA'] }, 'Động cơ xoay chiều khác, một pha') === 'dieu-kien-so-trong-khong-co-trong-trich:NHIEU_PHA');
  check('T-3b tach-ve.neoMot (nghịch): "một pha" không neo được cho NHIEU_PHA',
    TVe.neoMot({ fact: 'soPha', op: 'TRONG', value: ['NHIEU_PHA'] }, 'Động cơ xoay chiều khác, một pha').length === 0);

  const loiThem = (mut, ma) => {
    const x = clone(tv2);
    mut(x);
    return T.kiemTuVung(x).some((l) => l.startsWith(ma));
  };
  check('T-3b kiemTuVung ĐỎ với cachDocThem không hợp lệ (khoá lạ / không phải LIET_KE / giá trị lạ / regex hỏng / chuỗi rỗng)',
    loiThem((x) => { x.cachDocThem = { khoaLa: { A: { vi: ['a'] } } }; }, 'cach-doc-them-khoa-khong-hop-le')
    && loiThem((x) => { x.cachDocThem = { dienAp: { V: { vi: ['v'] } } }; }, 'cach-doc-them-khoa-khong-hop-le')
    && loiThem((x) => { x.cachDocThem = { soPha: { GIA_TRI_LA: { vi: ['x'] } } }; }, 'cach-doc-them-gia-tri-ngoai-danh-sach')
    && loiThem((x) => { x.cachDocThem = { soPha: { NHIEU_PHA: { vi: ['(đa'] } } }; }, 'mau-khong-hop-le')
    && loiThem((x) => { x.cachDocThem = { soPha: { NHIEU_PHA: { vi: [''] } } }; }, 'cach-doc-them-mau-rong')
    && loiThem((x) => { x.cachDocThem = { soPha: { NHIEU_PHA: { fr: ['poly'] } } }; }, 'cach-doc-them-ngon-ngu-la')
    && loiThem((x) => { x.cachDocThem = 'sai'; }, 'cach-doc-them-khong-hop-le'));

  // ReDoS ~40.000 từ lặp cho soPha < 400 ms
  const redosSoPha = Array(8000).fill('động cơ điện đa năng pha lê một hai').join(' ');
  const t0 = process.hrtime.bigint();
  const rRedos = T.docGiaTri('soPha', redosSoPha);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  check(`T-3b ReDoS ~40.000 từ lặp cho soPha < 400 ms (thực tế ${ms.toFixed(0)} ms)`, rRedos.trangThai === 'CHUA_BIET' && ms < 400, { ms, rRedos });
}

// OZV-1820 — mở rộng cachDocKhong của daPhaThemDuongHoacRuou (0402.10.4) và thePhanDoan.THE_LONG (1511.90.42) + ReDoS < 2 giây (quy tắc 6b).
{
  la('OZV-1820 daPhaThemDuongHoacRuou (thuận): "Chưa pha thêm đường hoặc chất tạo ngọt khác" ⇒ false',
    'daPhaThemDuongHoacRuou', 'Chưa pha thêm đường hoặc chất tạo ngọt khác', false);
  la('OZV-1820 daPhaThemDuongHoacRuou (thuận viPhuDinh): "chưa pha thêm đường, chất tạo ngọt hoặc rượu" ⇒ false',
    'daPhaThemDuongHoacRuou', 'chưa pha thêm đường, chất tạo ngọt hoặc rượu', false);
  la('OZV-1820 daPhaThemDuongHoacRuou (nghịch khẳng định): "Đã pha thêm đường hoặc chất tạo ngọt khác" ⇒ true',
    'daPhaThemDuongHoacRuou', 'Đã pha thêm đường hoặc chất tạo ngọt khác', true);
  chuaBiet('OZV-1820 daPhaThemDuongHoacRuou (nghịch không nêu): "Sữa bột đóng gói với khối lượng tịnh 25 kg" ⇒ CHUA_BIET',
    'daPhaThemDuongHoacRuou', 'Sữa bột đóng gói với khối lượng tịnh 25 kg');

  la('OZV-1820 thePhanDoan (thuận 1511.90.42): "Các phần phân đoạn của dầu chưa tinh chế: Loại khác, đóng gói với khối lượng tịnh không quá 25kg (SEN)" ⇒ THE_LONG',
    'thePhanDoan', 'Các phần phân đoạn của dầu chưa tinh chế: Loại khác, đóng gói với khối lượng tịnh không quá 25kg (SEN)', 'THE_LONG');
  la('OZV-1820 thePhanDoan (nghịch 1511.90.41): "Các phần phân đoạn của dầu chưa tinh chế: Các phần phân đoạn thể rắn (SEN)" ⇒ THE_RAN',
    'thePhanDoan', 'Các phần phân đoạn của dầu chưa tinh chế: Các phần phân đoạn thể rắn (SEN)', 'THE_RAN');
  chuaBiet('OZV-1820 thePhanDoan (nghịch chỉ tiêu đề cha): "Các phần phân đoạn của dầu chưa tinh chế" ⇒ CHUA_BIET',
    'thePhanDoan', 'Các phần phân đoạn của dầu chưa tinh chế');

  const redos1820 = Array(5000).fill('chưa pha thêm đường các phần phân đoạn của dầu chưa tinh chế').join(' ');
  for (const fk of ['daPhaThemDuongHoacRuou', 'thePhanDoan']) {
    const t0 = process.hrtime.bigint();
    T.docGiaTri(fk, redos1820);
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    check(`OZV-1820 ReDoS ~40.000 từ lặp cho ${fk} < 2000 ms (thực tế ${ms.toFixed(0)} ms)`, ms < 2000, { fk, ms });
  }
}

// T-1 — mở rộng VAT_LIEU_DET (vải không dệt, vải nỉ, hoặc vật liệu dệt, 6109.90) + En/Zh + nghịch + ReDoS < 2 giây.
{
  const dkVld = { fact: 'vatLieuKhac', op: 'TRONG', value: ['VAT_LIEU_DET'] };
  la('T-1 VAT_LIEU_DET (thuận Vi không cần "bằng"): túi vải không dệt PP', 'vatLieuKhac', 'túi vải không dệt PP', 'VAT_LIEU_DET');
  la('T-1 VAT_LIEU_DET (thuận Vi): mặt ngoài bằng vải nỉ', 'vatLieuKhac', 'mặt ngoài bằng vải nỉ', 'VAT_LIEU_DET');
  la('T-1 VAT_LIEU_DET (thuận Vi): Túi bằng nỉ', 'vatLieuKhac', 'Túi bằng nỉ', 'VAT_LIEU_DET');
  la('T-1 VAT_LIEU_DET (thuận Vi 4202): Mặt ngoài bằng plastic hoặc vật liệu dệt', 'vatLieuKhac', 'Mặt ngoài bằng plastic hoặc vật liệu dệt', 'VAT_LIEU_DET');
  la('T-1 VAT_LIEU_DET (thuận Vi 6109.90): Từ các vật liệu dệt khác', 'vatLieuKhac', '610990 Từ các vật liệu dệt khác', 'VAT_LIEU_DET');
  la('T-1 VAT_LIEU_DET (thuận Vi 9612.10 / 9619.00): Lõi thấm hút bằng vật liệu dệt', 'vatLieuKhac', 'Lõi thấm hút bằng vật liệu dệt', 'VAT_LIEU_DET');

  check('T-1 DK.kiemDieuKien vatLieuKhac VAT_LIEU_DET nhận cả "túi vải không dệt PP", 4202.12, 6109.90, 9612.10',
    ['túi vải không dệt PP', '420212 Mặt ngoài bằng plastic hoặc vật liệu dệt', '610990 Từ các vật liệu dệt khác', '961210 Bằng vật liệu dệt', '961900 Lõi thấm hút bằng vật liệu dệt']
      .every((s) => DK.kiemDieuKien(dkVld, s) === null));

  la('T-1 VAT_LIEU_DET En textile materials', 'vatLieuKhac', 'Outer surface of textile materials', 'VAT_LIEU_DET');
  la('T-1 VAT_LIEU_DET En non-woven fabric', 'vatLieuKhac', 'Non-woven fabric shopping bag', 'VAT_LIEU_DET');
  la('T-1 VAT_LIEU_DET En wool felt', 'vatLieuKhac', 'Wool felt mat', 'VAT_LIEU_DET');
  la('T-1 VAT_LIEU_DET Zh 纺织材料', 'vatLieuKhac', '纺织材料制旅行箱', 'VAT_LIEU_DET');
  la('T-1 VAT_LIEU_DET Zh 无纺布', 'vatLieuKhac', '无纺布手提袋', 'VAT_LIEU_DET');
  la('T-1 VAT_LIEU_DET Zh 毡', 'vatLieuKhac', '毡垫', 'VAT_LIEU_DET');

  chuaBiet('T-1 VAT_LIEU_DET (nghịch): túi nhựa PP', 'vatLieuKhac', 'túi nhựa PP');
  chuaBiet('T-1 VAT_LIEU_DET (nghịch ranh giới "bất kỳ")', 'vatLieuKhac', 'bất kỳ loại nào');
  chuaBiet('T-1 VAT_LIEU_DET (nghịch ranh giới "nhỉ" / "vỉ")', 'vatLieuKhac', 'đẹp nhỉ, vỉ thuốc nhựa');
  chuaBiet('T-1 VAT_LIEU_DET (nghịch En động từ "felt" / "was felt")', 'vatLieuKhac', 'I felt it was fine');
  chuaBiet('T-1 VAT_LIEU_DET (nghịch En bị động "was felt")', 'vatLieuKhac', 'The vibration was felt strongly');
  chuaBiet('T-1 VAT_LIEU_DET (nghịch 3403.91 "xử lý / bảo quản các vật liệu dệt")', 'vatLieuKhac', 'Chất liệu bảo quản các vật liệu dệt');

  const redosVld = Array(5000).fill('túi vải không dệt mặt ngoài bằng vải nỉ hoặc vật liệu dệt').join(' ');
  const t0Vld = process.hrtime.bigint();
  T.docGiaTri('vatLieuKhac', redosVld);
  const msVld = Number(process.hrtime.bigint() - t0Vld) / 1e6;
  check(`T-1 ReDoS ~40.000 từ lặp cho vatLieuKhac VAT_LIEU_DET < 2000 ms (thực tế ${msVld.toFixed(0)} ms)`, msVld < 2000, { msVld });
}

// T-5 — thu hẹp 4 khoá nhiễu, mở rộng 3 khoá @2, mở rộng vatLieuKhac (+7 giá trị), loaiNhuaPolyme (17 giá trị), 6 khoá CO_KHONG + ReDoS < 2 giây.
{
  // 1. Thu hẹp 4 khoá nhiễu @2
  la('T-5 giaiDoanThuocDa 4104.11.10 đã thuộc thực vật ⇒ THUOC_THUC_VAT', 'giaiDoanThuocDa', '41041110 Của động vật họ trâu bò, đã thuộc thực vật', 'THUOC_THUC_VAT');
  la('T-5 giaiDoanThuocDa 4101.90.10 chuẩn bị để thuộc ⇒ CHUAN_BI_DE_THUOC', 'giaiDoanThuocDa', 'Đã được chuẩn bị để thuộc', 'CHUAN_BI_DE_THUOC');
  chuaBiet('T-5 giaiDoanThuocDa (nghịch): "da thuộc" không khớp nhầm thuộc da', 'giaiDoanThuocDa', 'Sản phẩm bằng da thuộc hoặc da thuộc tổng hợp');
  chuaBiet('T-5 giaiDoanThuocDa (nghịch): "thuộc nhóm / phân nhóm / chương" không khớp nhầm', 'giaiDoanThuocDa', 'Của máy thuộc nhóm 84.25, thuộc phân nhóm 8430.41 thuộc chương 84');

  chuaBiet('T-5 vatLieuKhac (nghịch): chữ chung "vật liệu" / "bằng vật liệu khác" ⇒ CHUA_BIET', 'vatLieuKhac', '670490 Bằng vật liệu khác và vật liệu mài');

  la('T-5 loaiCaoSu tự nhiên lưu hóa ⇒ TU_NHIEN', 'loaiCaoSu', 'Bằng cao su tự nhiên lưu hóa', 'TU_NHIEN');
  la('T-5 loaiCaoSu tổng hợp ⇒ TONG_HOP', 'loaiCaoSu', 'Găng tay bằng cao su tổng hợp', 'TONG_HOP');
  chuaBiet('T-5 loaiCaoSu (nghịch): cao su xốp / cao su cứng / cao su lưu hóa chung ⇒ CHUA_BIET', 'loaiCaoSu', 'Từ cao su xốp hoặc cao su cứng hoặc cao su lưu hóa');

  la('T-5 loaiCung (thuận 3920.10.11): Loại cứng (SEN) ⇒ CO', 'loaiCung', '39201011 Loại cứng (SEN)', true);
  la('T-5 loaiCung (thuận 3920.99.10 bảo toàn): Từ protein đã được làm cứng ⇒ CO', 'loaiCung', 'Từ protein đã được làm cứng', true);
  chuaBiet('T-5 loaiCung (nghịch 8525.82): được làm cứng bức xạ ⇒ CHUA_BIET', 'loaiCung', 'Loại khác, được làm cứng bức xạ hoặc chịu bức xạ');
  chuaBiet('T-5 loaiCung (nghịch 9615.11): bằng cao su cứng hoặc plastic ⇒ CHUA_BIET', 'loaiCung', 'Bằng cao su cứng hoặc plastic');

  // 2. Mở rộng 3 khoá @2
  la('T-5 tinhTrangTayTrang có màu khác nhau ⇒ TU_SOI_MAU', 'tinhTrangTayTrang', 'Vải dệt thoi có màu khác nhau', 'TU_SOI_MAU');
  la('T-5 tinhTrangTayTrang có các màu khác nhau ⇒ TU_SOI_MAU', 'tinhTrangTayTrang', 'Có các màu khác nhau', 'TU_SOI_MAU');
  chuaBiet('T-5 tinhTrangTayTrang (nghịch): nhiều kích cỡ khác nhau ⇒ CHUA_BIET', 'tinhTrangTayTrang', 'Có các kích cỡ khác nhau');

  la('T-5 coRen (thuận 7318.1): đã được ren / đã ren ⇒ CO', 'coRen', 'Đinh vít bằng thép đã được ren', true);
  la('T-5 coRen (thuận): bu lông đã ren ⇒ CO', 'coRen', 'Bu lông đầu lục giác đã ren', true);
  la('T-5 coRen (nghịch): chưa được ren / không được ren ⇒ KHONG', 'coRen', 'Chốt thép chưa được ren', false);
  chuaBiet('T-5 coRen (nghịch): bu lông trơn không nói ren ⇒ CHUA_BIET', 'coRen', 'Bu lông đầu tròn trơn');

  la('T-5 loaiSoiDet 6110.12 Ca-sơ-mia ⇒ LEN_LONG_DONG_VAT_MIN', 'loaiSoiDet', 'Của dê Ca-sơ-mia (len casơmia)', 'LEN_LONG_DONG_VAT_MIN');
  la('T-5 loaiSoiDet 6110.12 casơmia ⇒ LEN_LONG_DONG_VAT_MIN', 'loaiSoiDet', 'Áo len dê casơmia', 'LEN_LONG_DONG_VAT_MIN');
  la('T-5 loaiSoiDet (nghịch): áo sơ mi cotton không bị nhầm casơmia', 'loaiSoiDet', 'Áo sơ mi vải cotton', 'BONG');

  // 3. Mở rộng vatLieuKhac (+7 giá trị mới)
  const VK_T5 = [
    ['TRE', 'Bằng tre', 'Seats of bamboo', '竹制座椅', 'Măng tre tươi và bamboo shoots'],
    ['LIEU_GAI', 'Bằng liễu gai', 'Baskets of osier', '柳条篮', 'Cây xanh trang trí'],
    ['PHA_LE_CHI', 'Ly bằng pha lê chì', 'Drinking glasses of lead crystal', '铅晶质玻璃杯', 'Ly thủy tinh borosilicate'],
    ['GOM_KIM_LOAI', 'Sản phẩm bằng gốm kim loại', 'Plates and tips of cermets', '金属陶瓷板', 'Bát ăn bằng gốm sứ'],
    ['CAO_SU_XOP', '401610 Từ cao su xốp', 'Articles of cellular rubber', '海绵橡胶制品', 'Găng tay cao su tự nhiên'],
    ['CAO_SU_CUNG', '961511 Bằng cao su cứng hoặc plastic', 'Combs of hard rubber', '硬质橡胶梳', 'Nút chặn cao su mềm'],
    ['PLASTIC_XOP', 'Đệm bằng plastic xốp', 'Plates and sheets of cellular plastics', '泡沫塑料垫', 'Tấm nhựa PVC cứng không xốp'],
  ];
  for (const [val, vi, en, zh, neg] of VK_T5) {
    la(`T-5 vatLieuKhac.${val} Vi`, 'vatLieuKhac', vi, val);
    la(`T-5 vatLieuKhac.${val} En`, 'vatLieuKhac', en, val);
    la(`T-5 vatLieuKhac.${val} Zh`, 'vatLieuKhac', zh, val);
    check(`T-5 vatLieuKhac.${val} DK.kiemDieuKien + vietCum sạch`,
      DK.kiemDieuKien({ fact: 'vatLieuKhac', op: 'TRONG', value: [val] }, vi) === null && viet('vatLieuKhac', val).length > 0 && !/[();]/.test(viet('vatLieuKhac', val)));
    const rNeg = doc('vatLieuKhac', neg);
    check(`T-5 vatLieuKhac.${val} nghịch không khớp nhầm "${neg}"`, rNeg.trangThai === 'CHUA_BIET' || rNeg.giaTri !== val, rNeg);
  }
  {
    const r9404 = chuaBiet('T-5 9404.21 Bằng cao su xốp hoặc bằng plastic xốp ⇒ CHUA_BIET (2 ứng viên)', 'vatLieuKhac', 'Bằng cao su xốp hoặc bằng plastic xốp, đã hoặc chưa bọc');
    check('T-5 9404.21 ungVien [CAO_SU_XOP, PLASTIC_XOP] & DK TRONG đạt',
      JSON.stringify((r9404.ungVien || []).slice().sort()) === JSON.stringify(['CAO_SU_XOP', 'PLASTIC_XOP'])
      && DK.kiemDieuKien({ fact: 'vatLieuKhac', op: 'TRONG', value: ['CAO_SU_XOP', 'PLASTIC_XOP'] }, 'Bằng cao su xốp hoặc bằng plastic xốp, đã hoặc chưa bọc') === null, r9404);
  }

  // 4. loaiNhuaPolyme (17 giá trị, kèm ngoặc đơn hoá chất & chống đụng độ)
  const POLY_T5 = [
    ['ETYLEN', 'Từ các polyme từ etylen', 'Of polymers of ethylene', '乙烯聚合物制薄膜'],
    ['PROPYLEN', 'Từ các polyme từ propylen', 'Of polymers of propylene', '丙烯聚合物制薄膜'],
    ['STYREN', 'Từ các polyme từ styren', 'Of polymers of styrene', '苯乙烯聚合物制板材'],
    ['VINYL_CLORUA', 'Từ các polyme từ vinyl clorua', 'Of polymers of vinyl chloride', '氯乙烯聚合物制片材'],
    ['ACRYLIC', 'Từ các polyme acrylic', 'Of acrylic polymers', '丙烯酸聚合物板材'],
    ['POLYCARBONAT', 'Từ các polycarbonat', 'Of polycarbonates', '聚碳酸酯板材'],
    ['PET', 'Từ poly(etylen terephtalat)', 'Of poly(ethylene terephthalate)', '聚对苯二甲酸乙二醇酯薄膜'],
    ['PMMA', 'Từ poly(metyl metacrylat)', 'Of poly(methyl methacrylate)', '聚甲基丙烯酸甲酯板材'],
    ['POLYESTE_CHUA_NO', 'Từ các polyeste chưa no', 'Of unsaturated polyesters', '不饱和聚酯板'],
    ['POLYESTE', 'Từ các polyeste khác', 'Of polyesters', '聚酯薄膜'],
    ['XENLULO_TAI_SINH', 'Từ xenlulo tái sinh', 'Of regenerated cellulose', '再生纤维素膜'],
    ['XENLULO_AXETAT', 'Từ xenlulo axetat', 'Of cellulose acetate', '醋酸纤维素片'],
    ['XENLULO', 'Từ xenlulo hoặc các dẫn xuất hóa học của nó', 'Of cellulose', '纤维素板'],
    ['POLY_VINYL_BUTYRAL', 'Từ poly(vinyl butyral)', 'Of poly(vinyl butyral)', '聚乙烯醇缩丁醛膜'],
    ['POLYAMIDE', 'Từ các polyamide', 'Of polyamides', '聚酰胺薄膜'],
    ['NHUA_AMINO', 'Từ nhựa amino', 'Of amino-resins', '氨基树脂板'],
    ['NHUA_PHENOLIC', 'Từ nhựa phenolic', 'Of phenolic resins', '酚醛树脂板'],
  ];
  for (const [val, vi, en, zh] of POLY_T5) {
    la(`T-5 loaiNhuaPolyme.${val} Vi`, 'loaiNhuaPolyme', vi, val);
    la(`T-5 loaiNhuaPolyme.${val} En`, 'loaiNhuaPolyme', en, val);
    la(`T-5 loaiNhuaPolyme.${val} Zh`, 'loaiNhuaPolyme', zh, val);
    check(`T-5 loaiNhuaPolyme.${val} DK + vietCum không ngoặc`,
      DK.kiemDieuKien({ fact: 'loaiNhuaPolyme', op: 'TRONG', value: [val] }, vi) === null && viet('loaiNhuaPolyme', val).length > 0 && !/[();]/.test(viet('loaiNhuaPolyme', val)));
  }
  chuaBiet('T-5 loaiNhuaPolyme (nghịch): "pet dog food / PC computer / PE class" ⇒ CHUA_BIET', 'loaiNhuaPolyme', 'pet dog food and PC computer cable for PE class');

  // 5. 6 khoá CO_KHONG mới (2 chiều + CHUA_BIET cụm tuỳ chọn / ngoại lệ)
  const CK_T5 = [
    ['coKemPhuKien', 'Ống cao su có kèm phụ kiện', 'Rubber tubes with fittings', '带配件橡胶管', 'Ống cao su không kèm phụ kiện', 'Rubber hoses without fittings', '不带配件橡胶管', 'Ống cao su có hoặc không kèm phụ kiện'],
    ['coTheBomHoi', '401695 Các sản phẩm có thể bơm hơi khác', 'Inflatable pneumatic fender', '充气式护舷', 'Đệm chống va đặc không thể bơm hơi', 'Non-inflatable solid fender', '非充气护舷', '401694 Đệm chống va cho tàu thuyền hoặc ụ tàu, có hoặc không thể bơm hơi'],
    ['daLapVoLoa', '851821 Loa đơn, đã lắp vào vỏ loa', 'Single loudspeaker, mounted in their enclosures', '装在音箱内的单喇叭', 'Loa rời chưa lắp vào vỏ loa', 'Bare speaker not mounted in an enclosure', '未装在音箱内的喇叭', 'Loa, đã hoặc chưa lắp vào vỏ loa'],
    ['daNhoiDem', '940161 Ghế khung gỗ đã nhồi đệm', 'Wooden seats, upholstered', '装软垫木椅', 'Ghế gỗ chưa nhồi đệm', 'Unupholstered wooden chair', '未装软垫木椅', 'Ghế khung gỗ đã hoặc chưa nhồi đệm'],
    ['coGanOBi', '848320 Thân ổ, lắp ổ bi hoặc ổ đũa', 'Bearing housings, incorporating ball or roller bearings', '装有滚珠或滚子轴承的轴承座', '848330 Thân ổ, không lắp ổ bi hoặc ổ đũa', 'Bearing housings, not incorporating ball or roller bearings', '未装有滚珠或滚子轴承的轴承座', 'Thân ổ trục bằng gang xám'],
    ['loaiTuDong', 'Bộ ngắt mạch loại tự động', 'Automatic circuit breaker', '自动断路器', 'Cầu dao đóng ngắt không tự động', 'Manual non-automatic switch', '非自动开关', 'Máy xử lý dữ liệu tự động (automatic data processing machine)'],
  ];
  for (const [khoa, viCo, enCo, zhCo, viK, enK, zhK, neutral] of CK_T5) {
    la(`T-5 ${khoa} Vi CO`, khoa, viCo, true);
    la(`T-5 ${khoa} En CO`, khoa, enCo, true);
    la(`T-5 ${khoa} Zh CO`, khoa, zhCo, true);
    la(`T-5 ${khoa} Vi KHONG`, khoa, viK, false);
    la(`T-5 ${khoa} En KHONG`, khoa, enK, false);
    la(`T-5 ${khoa} Zh KHONG`, khoa, zhK, false);
    chuaBiet(`T-5 ${khoa} (nghịch): "${neutral}" ⇒ CHUA_BIET`, khoa, neutral);
    check(`T-5 ${khoa} DK CO/KHONG đạt`,
      DK.kiemDieuKien({ fact: khoa, op: 'CO' }, viCo) === null && DK.kiemDieuKien({ fact: khoa, op: 'KHONG' }, viK) === null);
  }
  // Ca thực tế tuỳ chọn / ngoại lệ trên dòng biểu (40169400, 4009, 4014, 8307, 8471, 8483, 9401): CHUA_BIET (không đảo sang false!)
  for (const [khoa, t] of [
    ['coTheBomHoi', '40169400 Boat or dock fenders, whether or not inflatable'],
    ['coTheBomHoi', 'Đệm chống va, có hoặc không có thể bơm hơi'],
    ['coKemPhuKien', '4009 Tubes, pipes and hoses, with or without their fittings'],
    ['coKemPhuKien', '4014 Hygienic or pharmaceutical articles, with or without fittings of hard rubber'],
    ['coKemPhuKien', '401490 Other, with or without fittings'],
    ['coKemPhuKien', '8307 Flexible tubing of base metal, with or without fittings'],
    ['coKemPhuKien', '83071000 Of iron or steel, with or without fittings'],
    ['coKemPhuKien', '83079000 Of other base metal, with or without fittings'],
    ['coKemPhuKien', 'Ống nối, whether or not with fittings'],
    ['coKemPhuKien', 'Ống dẫn, có hoặc không có kèm phụ kiện'],
    ['daLapVoLoa', 'Loudspeakers, whether or not mounted in their enclosures'],
    ['daNhoiDem', 'Seats, whether or not upholstered'],
    ['coGanOBi', 'Bearing housings, whether or not incorporating ball or roller bearings'],
    ['coGanOBi', 'Thân ổ trục, lắp hoặc không lắp ổ bi hoặc ổ đũa'],
    ['loaiTuDong', 'Dây chuyền tự động hoá sản xuất'],
    ['loaiTuDong', 'Hệ thống tự động hóa công nghiệp'],
    ['loaiTuDong', 'Automatic data-processing machines and units thereof'],
  ]) {
    chuaBiet(`T-5 tuỳ chọn/ngoại lệ thực tế ⇒ CHUA_BIET`, khoa, t);
  }

  // 6. ReDoS ~40.000 từ lặp cho tất cả khoá mới & mở rộng < 2000 ms
  const redosT5 = Array(3000).fill('tấm màng nhựa poly etylen propylen styren có hoặc không có kèm phụ kiện with or without their fittings whether or not inflatable đã hoặc chưa lắp vào vỏ loa lắp hoặc không lắp ổ bi tự động hoá xử lý dữ liệu Automatic data-processing').join(' ');
  for (const fk of ['vatLieuKhac', 'loaiNhuaPolyme', 'coKemPhuKien', 'coTheBomHoi', 'daLapVoLoa', 'daNhoiDem', 'coGanOBi', 'loaiTuDong']) {
    const t0 = process.hrtime.bigint();
    T.docGiaTri(fk, redosT5);
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    check(`T-5 ReDoS ~40.000 từ lặp cho ${fk} < 2000 ms (thực tế ${ms.toFixed(0)} ms)`, ms < 2000, { fk, ms });
  }
}

// T-6 — vatLieuKhac (TRE/SONG_MAY), kieuBom.QUAY (cachDocThem), hamLuongSoiFilamentTongHop, daGiaCo, coDuTru, coDieuChinhDoCao, coTheChuyenThanhGiuong, coKetNoiMayTinh + ReDoS < 500 ms.
{
  // 1. vatLieuKhac TRE / SONG_MAY: 9401.5, 9403.8, 4601.21
  check('T-6 vatLieuKhac 9401.5 "mây, liễu gai, tre" đủ 3 giá trị qua DK + 4601.21 "Của tre"',
    DK.kiemDieuKien({ fact: 'vatLieuKhac', op: 'TRONG', value: ['SONG_MAY', 'LIEU_GAI', 'TRE'] }, '94015 Ghế bằng mây, liễu gai, tre hoặc các vật liệu tương tự') === null
    && T.docGiaTri('vatLieuKhac', '460121 Của tre').giaTri === 'TRE'
    && ['SONG_MAY', 'LIEU_GAI', 'TRE'].every((v) => (T.docGiaTri('vatLieuKhac', 'Đồ nội thất bằng vật liệu khác, kể cả mây, liễu gai, tre').ungVien || []).includes(v)));
  chuaBiet('T-6 vatLieuKhac (nghịch): "Măng tre tươi / Đám mây lưu trữ / stress" ⇒ CHUA_BIET', 'vatLieuKhac', 'Măng tre tươi và đám mây lưu trữ stress');

  // 2. kieuBom.QUAY qua cachDocThem ("piston quay" 8413.60)
  check('T-6 cachDocThem kieuBom.QUAY: DK đọc được "Bơm hoạt động kiểu piston quay khác" & giữ nguyên "Bơm bánh răng" = QUAY, "Bơm piston tịnh tiến" = PISTON',
    DK.kiemDieuKien({ fact: 'kieuBom', op: 'TRONG', value: ['QUAY'] }, '841360 Bơm hoạt động kiểu piston quay khác') === null
    && T.cachDocGiaTri('kieuBom', 'QUAY').vi.includes('piston quay')
    && T.docGiaTri('kieuBom', 'Bơm bánh răng').giaTri === 'QUAY'
    && T.docGiaTri('kieuBom', 'Bơm piston chuyển động tịnh tiến').giaTri === 'PISTON'
    && (T.docGiaTri('kieuBom', 'Bơm hoạt động kiểu piston quay').ungVien || []).includes('QUAY'));

  // 3. hamLuongSoiFilamentTongHop (SO, %)
  la('T-6 Vi 5407.7 >= 85%', 'hamLuongSoiFilamentTongHop', 'Vải dệt thoi khác, có hàm lượng sợi filament tổng hợp chiếm từ 85% trở lên tính theo khối lượng', 85, { op: '>=' });
  la('T-6 Vi 5407.8 < 85%', 'hamLuongSoiFilamentTongHop', 'Vải dệt thoi khác, có hàm lượng sợi filament tổng hợp chiếm dưới 85% tính theo khối lượng', 85, { op: '<' });
  la('T-6 En >= 85%', 'hamLuongSoiFilamentTongHop', 'Other woven fabrics, containing 85% or more by weight of synthetic filaments', 85, { op: '>=' });
  la('T-6 En < 85%', 'hamLuongSoiFilamentTongHop', 'Containing less than 85% by weight of synthetic filaments', 85, { op: '<' });
  la('T-6 Zh >= 85%', 'hamLuongSoiFilamentTongHop', '按重量计合成纤维长丝含量在85%及以上', 85, { op: '>=' });
  chuaBiet('T-6 hamLuongSoiFilamentTongHop (nghịch): sợi filament tái tạo / 100% bông ⇒ CHUA_BIET', 'hamLuongSoiFilamentTongHop', 'Vải dệt thoi có hàm lượng sợi filament tái tạo chiếm 85%, 100% bông');
  check('T-6 hamLuongSoiFilamentTongHop DK + vietCum không lặp %',
    DK.kiemDieuKien({ fact: 'hamLuongSoiFilamentTongHop', op: '>=', value: 85, donVi: '%' }, 'có hàm lượng sợi filament tổng hợp chiếm từ 85% trở lên') === null
    && T.vietCum('hamLuongSoiFilamentTongHop', 85) === 'hàm lượng sợi filament tổng hợp 85% tính theo khối lượng');

  // 4. 5 khoá CO_KHONG mới
  const CK_T6 = [
    ['daGiaCo', '40092 Đã gia cố hoặc kết hợp duy nhất với kim loại', 'Rubber hoses reinforced with metal', '已加强橡胶管', '40091 Chưa gia cố hoặc kết hợp với các vật liệu khác', 'Unreinforced plastic hose', '未加强塑料软管', '39232910 Túi vô trùng đã hoặc chưa gia cố bằng lá nhôm'],
    ['coDuTru', 'Thiết bị đun nước nóng có dự trữ (1), không dùng điện', 'Electric storage water heater 50L', '储水式电热水器', 'Máy nước nóng không có bình dự trữ', 'Instantaneous water heater without storage tank', '即热式热水器', 'Giá dự trữ hàng hóa và pin dự trữ 10000mAh'],
    ['coDieuChinhDoCao', '94013 Ghế quay có điều chỉnh độ cao', 'Swivel seat with variable height adjustment', '可调高度的旋转坐具', 'Ghế quay cố định không điều chỉnh được độ cao', 'Fixed height office chair without height adjustment', '高度不可调办公椅', 'Camera tốc độ cao và bàn nâng hàng thủy lực'],
    ['coTheChuyenThanhGiuong', '94014 Ghế có thể chuyển thành giường', 'Sofa convertible into a bed', '可转换作床的坐具', 'Ghế sofa cố định không thể chuyển thành giường', 'Seat not convertible into a bed', '不可转换作床的座椅', '9401 Ghế ngồi, có hoặc không chuyển được thành giường'],
    ['coKetNoiMayTinh', '85284200 Có khả năng kết nối trực tiếp và được thiết kế để dùng cho máy xử lý dữ liệu tự động thuộc nhóm 84.71', 'Monitor capable of directly connecting to and designed for use with an automatic data processing machine', '可直接连接到自动数据处理设备的显示器', 'Máy in không có khả năng kết nối với máy xử lý dữ liệu tự động hoặc kết nối mạng', 'Printer not capable of connecting to a computer or a network', '不能连接到计算机或网络的打印机', 'Thiết bị kết nối mạng điện thoại và cáp sạc USB'],
  ];
  for (const [khoa, viCo, enCo, zhCo, viK, enK, zhK, neutral] of CK_T6) {
    la(`T-6 ${khoa} Vi CO`, khoa, viCo, true);
    la(`T-6 ${khoa} En CO`, khoa, enCo, true);
    la(`T-6 ${khoa} Zh CO`, khoa, zhCo, true);
    la(`T-6 ${khoa} Vi KHONG`, khoa, viK, false);
    la(`T-6 ${khoa} En KHONG`, khoa, enK, false);
    la(`T-6 ${khoa} Zh KHONG`, khoa, zhK, false);
    chuaBiet(`T-6 ${khoa} (nghịch): "${neutral}" ⇒ CHUA_BIET`, khoa, neutral);
    check(`T-6 ${khoa} DK CO/KHONG đạt`,
      DK.kiemDieuKien({ fact: khoa, op: 'CO' }, viCo) === null && DK.kiemDieuKien({ fact: khoa, op: 'KHONG' }, viK) === null);
  }
  la('T-6 daGiaCo (3917.33 chưa được gia cố — không phủ định kép)', 'daGiaCo', '391733 Loại khác, chưa được gia cố hoặc kết hợp với các vật liệu khác', false, { bc: 'chưa được gia cố' });
  la('T-6 daGiaCo (6809.11.00 được phủ mặt hoặc gia cố chỉ bằng giấy)', 'daGiaCo', '68091100 Được phủ mặt hoặc gia cố chỉ bằng giấy hoặc bìa', true);
  chuaBiet('T-6 daGiaCo (nghịch 5407.41.10 vật liệu gia cố)', 'daGiaCo', 'Vải lưới ni lông thích hợp để sử dụng như vật liệu gia cố cho vải sơn dầu');
  chuaBiet('T-6 daGiaCo (nghịch En whether or not internally reinforced)', 'daGiaCo', 'Composite paperboard, whether or not internally reinforced');
  chuaBiet('T-6 coDuTru (nghịch En Instantaneous or storage water heaters)', 'coDuTru', 'Instantaneous or storage water heaters, non-electric');
  chuaBiet('T-6 coTheChuyenThanhGiuong (nghịch En whether or not convertible into beds)', 'coTheChuyenThanhGiuong', 'Seats, whether or not convertible into beds');

  // 5. ReDoS ~40.000 từ lặp cho tất cả khoá T-6 < 500 ms
  const redosT6 = Array(1000).fill('có hàm lượng sợi filament tổng hợp chiếm từ 85% trở lên đã hoặc chưa gia cố bằng vật liệu dệt có dự trữ điều chỉnh độ cao chuyển thành giường kết nối trực tiếp với máy xử lý dữ liệu tự động hoặc kết nối mạng kiểu piston quay bằng mây, liễu gai, tre').join(' ');
  const redosT6Neutral = Array(1000).fill('van điện từ khí nén thép không gỉ bọc nhựa PVC có hoặc không kèm phụ kiện dây điện đầu nối công nghiệp 220V').join(' ');
  for (const fk of ['hamLuongSoiFilamentTongHop', 'daGiaCo', 'coDuTru', 'coDieuChinhDoCao', 'coTheChuyenThanhGiuong', 'coKetNoiMayTinh', 'vatLieuKhac', 'kieuBom']) {
    const t0 = process.hrtime.bigint();
    T.docGiaTri(fk, redosT6);
    const ms1 = Number(process.hrtime.bigint() - t0) / 1e6;
    const t1 = process.hrtime.bigint();
    T.docGiaTri(fk, redosT6Neutral);
    const ms2 = Number(process.hrtime.bigint() - t1) / 1e6;
    check(`T-6 ReDoS ~40.000 từ lặp cho ${fk} < 500 ms (khớp ${ms1.toFixed(1)} ms, rỗng ${ms2.toFixed(1)} ms)`, ms1 < 500 && ms2 < 500, { fk, ms1, ms2 });
  }
}

// ── T-8 Top-93 (04/11): khoá coGanThietBiThu + mở rộng @2 (mauHienThi, loaiTuDong, loaiSoiDet.BONG, dangLong) ──────────
{
  // 1. mauHienThi cachDocThem (8528.72) — không chạm đối tượng @1
  la('T-8 mauHienThi 8528.72 "Loại khác, màu"', 'mauHienThi', '85287200 - - - Loại khác, màu', 'MAU');
  la('T-8 mauHienThi 8528.72 "Loại khác, màu (SEN)"', 'mauHienThi', '85287200 - - - Loại khác, màu (SEN)', 'MAU');
  la('T-8 mauHienThi vẫn đọc màn hình đơn sắc', 'mauHienThi', '85287900 - - - Màn hình đơn sắc', 'DON_SAC');
  la('T-8 mauHienThi (nghịch): "Màn hình đơn sắc loại khác, màu đen" giữ DON_SAC (không nhầm MAU)', 'mauHienThi', 'Màn hình đơn sắc loại khác, màu đen', 'DON_SAC');
  chuaBiet('T-8 mauHienThi (nghịch): "Loại khác" không màu', 'mauHienThi', '85287900 - - - Loại khác');
  chuaBiet('T-8 mauHienThi (nghịch): "Loại khác, màu đen" không phải màn hình màu', 'mauHienThi', 'Loại khác, màu đen');
  check('T-8 mauHienThi DK.kiemDieuKien 8528.72 đạt',
    DK.kiemDieuKien({ fact: 'mauHienThi', op: 'TRONG', value: ['MAU'] }, '85287200 - - - Loại khác, màu') === null);

  // 2. coGanThietBiThu (8525.60)
  la('T-8 coGanThietBiThu Vi CO (8525.60)', 'coGanThietBiThu', '85256000 - Thiết bị phát có gắn với thiết bị thu', true);
  la('T-8 coGanThietBiThu Vi KHONG', 'coGanThietBiThu', 'Thiết bị phát không gắn với thiết bị thu', false);
  la('T-8 coGanThietBiThu En CO', 'coGanThietBiThu', 'Transmission apparatus incorporating reception apparatus', true);
  la('T-8 coGanThietBiThu En KHONG', 'coGanThietBiThu', 'Transmission apparatus not incorporating reception apparatus', false);
  la('T-8 coGanThietBiThu Zh CO', 'coGanThietBiThu', '装有接收装置的发送设备', true);
  la('T-8 coGanThietBiThu Zh KHONG', 'coGanThietBiThu', '未装有接收装置的发送设备', false);
  chuaBiet('T-8 coGanThietBiThu (nghịch): "kết hợp thiết bị thu truyền hình" (8528)', 'coGanThietBiThu', 'Màn hình kết hợp thiết bị thu truyền hình');
  check('T-8 coGanThietBiThu DK.kiemDieuKien CO/KHONG đạt',
    DK.kiemDieuKien({ fact: 'coGanThietBiThu', op: 'CO' }, 'có gắn với thiết bị thu') === null
    && DK.kiemDieuKien({ fact: 'coGanThietBiThu', op: 'KHONG' }, 'không gắn với thiết bị thu') === null);

  // 3. loaiTuDong (8515.21/31)
  la('T-8 loaiTuDong 8515.21 Vi CO', 'loaiTuDong', '85152100 - - Loại tự động hoàn toàn hoặc một phần', true, { bc: 'Loại tự động hoàn toàn hoặc một phần' });
  la('T-8 loaiTuDong 8515.21 En CO', 'loaiTuDong', 'Machines, fully or partly automatic', true);
  la('T-8 loaiTuDong 8515.21 Zh CO', 'loaiTuDong', '全自动或半自动弧焊机', true);
  la('T-8 loaiTuDong (nghịch giữ nguyên bán tự động = false)', 'loaiTuDong', 'Thiết bị hàn bán tự động', false);
  la('T-8 loaiTuDong Zh (nghịch giữ nguyên 半自动 = false)', 'loaiTuDong', '半自动焊机', false);

  // 4. loaiSoiDet.BONG (5407.8x)
  la('T-8 loaiSoiDet.BONG 5407.8x Vi', 'loaiSoiDet', 'Vải dệt thoi khác, được pha chủ yếu hoặc pha duy nhất với bông', 'BONG');
  la('T-8 loaiSoiDet.BONG 5407.8x En', 'loaiSoiDet', 'Other woven fabrics, mixed mainly or solely with cotton', 'BONG');
  la('T-8 loaiSoiDet.BONG 5407.8x Zh', 'loaiSoiDet', '主要与棉混纺的机织物', 'BONG');
  chuaBiet('T-8 loaiSoiDet.BONG (nghịch): pha với bông thủy tinh', 'loaiSoiDet', 'Vải pha chủ yếu với bông thủy tinh');

  // 5. dangLong (9025.11 không đọc nhầm "Chứa chất lỏng")
  chuaBiet('T-8 dangLong (nghịch 9025.11): "Chứa chất lỏng, để đọc trực tiếp"', 'dangLong', '90251100 - - Chứa chất lỏng, để đọc trực tiếp');
  la('T-8 dangLong 0401.10.10 vẫn đọc Dạng lỏng = true', 'dangLong', '04011010 - - Dạng lỏng', true);

  // 6. ReDoS ~40.000 từ lặp cho các mẫu T-8 < 500 ms
  const redosT8 = Array(1000).fill('loại khác, màu có gắn với thiết bị thu loại tự động hoàn toàn hoặc một phần được pha chủ yếu hoặc pha duy nhất với bông chứa chất lỏng để đọc trực tiếp').join(' ');
  const redosT8Neutral = Array(1000).fill('thiết bị điện tử van thép không gỉ công nghiệp bọc nhựa PVC không màu cố định 220V').join(' ');
  for (const fk of ['mauHienThi', 'coGanThietBiThu', 'loaiTuDong', 'loaiSoiDet', 'dangLong']) {
    const t0 = process.hrtime.bigint();
    T.docGiaTri(fk, redosT8);
    const ms1 = Number(process.hrtime.bigint() - t0) / 1e6;
    const t1 = process.hrtime.bigint();
    T.docGiaTri(fk, redosT8Neutral);
    const ms2 = Number(process.hrtime.bigint() - t1) / 1e6;
    check(`T-8 ReDoS ~40.000 từ lặp cho ${fk} < 500 ms (khớp ${ms1.toFixed(1)} ms, rỗng ${ms2.toFixed(1)} ms)`, ms1 < 500 && ms2 < 500, { fk, ms1, ms2 });
  }
}

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
