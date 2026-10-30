/**
 * lib/ho-so/index.js — cửa vào động cơ HỒ SƠ PHÂN LOẠI (plan L1-5, #648; spec hồ sơ phân loại §8.1, §8.3, §8.10).
 *
 * L1-5a: `dungDuongDi` (đường đi pháp lý tất định) + cờ `HS_HO_SO`. L1-5b: `docDuKien` (luật trước, LLM sau có trích),
 * `khungHoSo`, `doiChieu` (CO/THIEU/MAU_THUAN/CHUA_SO_HOA, ketLuan, tín hiệu rủi ro), `nghienCuu` (identify + web, chỉ giá trị đã
 * xác minh), `locTheoQuyen` (gỡ tín hiệu kho Oz cho người gọi không nội bộ) + enum `LY_DO_CHUA_CHOT`. L1-5c: `vietMoTa` (sáu khối,
 * lib/ho-so/viet-mo-ta.js) + `kiemTuongDuong`. soat, dungHoSo đến ở L1-5d…e. CHƯA nối endpoint nào (L1-5d): không nơi nào trong api/ đọc module này.
 *
 * Cờ `HS_HO_SO=off|shadow|on` (mặc định `off`, giá trị lạ ⇒ `off`): chỉ áp cho mã thuộc data/ho-so/lat-1.json VÀ phân nhóm có
 * ranh giới đã duyệt (mọi dòng 8 số của phân nhóm có đường đi không còn ranh giới chưa số hoá/chưa duyệt).
 *
 * ── Kiểu dùng chung (lược đồ `ho-so@1`, khớp spec §8.1) ───────────────────────────────────────────────────────────────
 *
 * @typedef {'NHAP'|'XUAT'} LoaiToKhai
 * @typedef {'CO'|'THIEU'|'MAU_THUAN'|'CHUA_SO_HOA'} KetQuaRanhGioi
 * @typedef {'NGUYEN_VAN'|'MAY_SUY'|'AI_DA_KIEM'|'CLAUDE_DUYET'|'NGUOI_DUYET'|'AI_CHUA_KIEM'|'DA_KIEM'} NguonLoai  lib/nguon-loai.js
 *
 * @typedef {object} PhienBanHoSo
 * @property {'ho-so@1'} hoSo
 * @property {string|null} bieuThue   phiên bản biểu thuế của cây (vd "2026.04.05")
 * @property {string} soTay           sha256 (16 ký tự) của data/so-tay/<nhóm>.json; 'KHONG_CO' khi nhóm chưa có sổ tay
 * @property {string} tuVung          "tu-vung@1@<sha16>"
 * @property {string} hieuChinh       sha16 của data/ho-so/hieu-chinh-tien-le.json
 * @property {string} dongCo          commit của động cơ (SOURCE_COMMIT/GIT_COMMIT hoặc .git), 'khong-ro' khi không đọc được
 *
 * @typedef {object} NguonMuc
 * @property {NguonLoai} nguonLoai
 * @property {string|null} ma          khoá nguồn: tax.<8 số> | tieuDe.<id> | sen.<mã> | wco.<6 số> | nhom<4>.nhom …
 * @property {string|null} trich       NGUYÊN VĂN trong tệp nguồn (đoạn lược "…" đúng thứ tự)
 *
 * @typedef {object} DieuKien         một điều kiện có kiểu (lib/dieu-kien-so.js) — { fact, op, value?, donVi?, viTri?, chieu? };
 *                                    HOAC: { op:'HOAC', phuongAn: DieuKien[][] }; phủ định cả cụm anh em: { op:'VA', cacDieuKien }
 *
 * @typedef {object} HieuChinh        mục bảng hiệu chỉnh tiền lệ chạm ranh giới (lib/ho-so/hieu-chinh.js) — ghi cả hai phía
 * @property {string} id
 * @property {'TIEN_LE_THAY_CHU_BIEU'|'LECH_CHUA_PHAN_XU'} loai
 * @property {string} maHs             dòng TB-TCHQ kết luận
 * @property {string} dongChuBieu      dòng chữ biểu (đọc thuần) trỏ tới
 * @property {DieuKien|DieuKien[]} [apKhi]  phạm vi hàng mà mục áp (không có ⇒ cả ranh giới)
 * @property {{soHieu:string, viTri:string, trich:string}[]} tbTchq
 * @property {{nguon:string, trich:string}[]} chuBieu
 * @property {string} lyDo
 * @property {'NGUOI_DUYET'|null} duyetBoi
 *
 * @typedef {object} MucDuongDi       duongDiPhapLy[] — dữ kiện quyết định của mã
 * @property {4|6|8} cap               cấp của RANH GIỚI (8 = ranh giới 6→8 số)
 * @property {number|string} capNut    cấp thật của nút: 8 | 7 | 5 | 'TANG' (tầng không mã `<pn6>~r<dòng>`) | 6 | 4
 * @property {string} nut              mã nút (dòng, tiêu đề, tầng, phân nhóm, nhóm)
 * @property {DieuKien|null} dieuKien  null ⇔ ranh giới chưa có điều kiện dùng được (ketQua CHUA_SO_HOA)
 * @property {'PHAI_CO'|'PHAI_KHONG'} chieu
 * @property {NguonMuc|null} nguon
 * @property {HieuChinh[]} [hieuChinh]
 * @property {KetQuaRanhGioi|null} ketQua  null = chưa đối chiếu dữ kiện (doiChieu gán)
 * @property {boolean} tatDinh         false khi điều kiện so chữ tự do (TEN_LOAI/CONG_DUNG) — không làm căn cứ LOI
 * @property {string} [lyDo]           chua-duyet | chua-so-hoa | hieu-chinh-lech-chua-phan-xu | tieu-de-bi-luoc-ten | tang-bi-luoc | nhom-chua-co-so-tay
 * @property {boolean} [tuLoaiTru]     mục cấp 4/6 sinh từ loaiTru có điều kiện đã duyệt
 *
 * @typedef {object} MucLoaiTru       loaiTru[] — nhóm/phân nhóm cạnh tranh có điểm trùng điều kiện vào
 * @property {string} ma               nhóm 4 số hoặc phân nhóm 6 số
 * @property {4|6} cap
 * @property {{nguon:'conflicts.json'|'ma-thay-the', nguonLoai:string, ma:string[], lyDoThayThe?:string}} lyDoTrung
 * @property {DieuKien[]|null} dieuKienKhongThoa  điều kiện vào nhóm cạnh tranh (đã duyệt) mà hàng phải KHÔNG thoả
 * @property {string|null} menhDe      sự thật về hàng (vietMoTa L1-5c viết)
 * @property {NguonMuc|null} nguon
 * @property {'DA_LOAI'|'CHUA_LOAI'} ketQua
 *
 * @typedef {object} MucKiemHoa       kiemHoa[] — dữ kiện phục vụ kiểm hoá
 * @property {string} fact             khoá tu-vung@1
 * @property {string} nhanVi
 * @property {string} [donViChuan]
 * @property {'kich-thuoc-kiem-hoa'|'thong-so-bat-buoc-nhom-may'|'du-kien-so-tren-duong-di'} lyDo
 * @property {'MAY_SUY'} nguonLoai
 *
 * @typedef {object} CanCu
 * @property {object[]} girRulesApplied  CHỈ từ lib/gir.js (mỗi mục có basis/evidence/source)
 * @property {string} [girDisclaimer]
 * @property {object} canCuPhapLy       CHỈ từ lib/legal-basis.js — canCuPhapLy(...) + chiTieuMoTa [citeChiTieu('1.78.1'|'2.69.1')]
 *
 * @typedef {object} KetQuaDuongDi    kết quả dungDuongDi (L1-5a)
 * @property {string} maHs
 * @property {LoaiToKhai} loaiToKhai
 * @property {PhienBanHoSo} phienBan
 * @property {MucDuongDi[]} duongDiPhapLy
 * @property {MucLoaiTru[]} loaiTru
 * @property {MucKiemHoa[]} kiemHoa
 * @property {CanCu} canCu
 * @property {4|6|8} capDaChac          8 chỉ khi chotDuoc
 * @property {boolean} chotDuoc         dòng 8 số chốt được bằng dữ kiện (không ẩn số ở ranh giới, anh em, chồng lấn, tiền lệ lệch)
 * @property {string[]} chuaChot        lý do không chốt, dạng "<lyDo>:<mã>" — lyDo ∈ LY_DO_CHUA_CHOT (lib/ho-so/ly-do.js)
 * @property {{id:string, loai:string, maHs:string, dongChuBieu:string, apKhi?:object, apVaoNut:string[]}[]} [hieuChinh]
 * @property {{voi:string, lyDo:string}[]} [chongLanVanBan]  chữ biểu tự chồng lấn ⇒ nêu cả hai, không tự chọn
 * @property {string[]} [dong8ConMo]    mã 6 số: các dòng 8 số còn mở
 * @property {string[]} nhanDuocDung    nhãn mục sổ tay được dùng làm điều kiện
 * @property {'2.69'} [khuonChuaHoTro]  tờ khai xuất: khuôn mô tả 2.69 chưa hỗ trợ
 *
 * @typedef {object} DuKien           duKien[] — dữ kiện về hàng (L1-5b đọc)
 * @property {string} fact
 * @property {*} giaTri
 * @property {string} [donVi]
 * @property {'KHACH'|'NSX'|'ANH'|'TB_TCHQ'|'SUY_RA'|'AI_CHUA_KIEM'|null} nguon   null khi CHUA_BIET
 * @property {'LLM'} [docBoi]          dữ kiện LLM đọc (bằng chứng đã kiểm là đoạn con đầu vào) — ranh giới dựa vào nó không tất định
 * @property {{muc:'CORROBORATED'|'VERIFIED', nguon:string, url:string[]}} [xacMinh]  dữ kiện nghienCuu tìm được (nguon NSX)
 * @property {string|null} bangChung
 * @property {'DA_CO'|'SUY_RA'|'CHUA_BIET'} trangThai
 *
 * @typedef {object} HoSoPhanLoai
 * @property {string} hoSoId            uuid do hs-code-api cấp cho lượt dựng (không định danh khách)
 * @property {PhienBanHoSo} phienBan
 * @property {LoaiToKhai} loaiToKhai
 * @property {string} maHs
 * @property {{tenVi:string, tenEn?:string, tenZh?:string, tenDoiChieu?:object, lechTen?:object[]}} hang
 * @property {DuKien[]} duKien
 * @property {MucDuongDi[]} duongDiPhapLy
 * @property {MucLoaiTru[]} loaiTru
 * @property {MucKiemHoa[]} kiemHoa
 * @property {{nhanHieu?:string, model?:string, kyMaHieu?:string, nhaSanXuat?:string, quyCachDongGoi?:string}} nhanDien
 * @property {object[]} tienLe
 * @property {{loai:'DANH_MUC_RUI_RO'|'MO_TA_GIONG_MA_KHAC'|'CHENH_THUE'|'CAN_CHUNG_THU'|string, nhan?:string}[]} tinHieuRuiRo
 * @property {CanCu} canCu
 * @property {{trangThai:'DU_CAN_CU'|'THIEU_DU_KIEN'|'MAU_THUAN'|'CAN_CHUYEN_GIA', cauHoi:object[], chuaChot:string[], maTroToi?:string,
 *   maCoTheTroToi?:string[]}} ketLuan   cauHoi: { fact, nhanVi, vi, zh, vaoRanhGioi[], vaoHieuChinh?[], goiY? } |
 *   { loai:'PHAN_XU_TIEN_LE', hieuChinhId, vi, zh, haiPhuongAn[2], factPhanBiet[], daBiet[], hoiPhamVi? } (không bao giờ chọn bên)
 * @property {{url:string, title?:string}[]} [taiLieuKyThuatNenKem]  nghienCuu gom catalogue/datasheet đã mở được
 */
const fs = require('fs');
const T = require('../hs-tree');
const { dataReadPath } = require('../data-paths');
const crypto = require('crypto');
const D = require('./duong-di');
const LD = require('./ly-do');
const { docDuKien } = require('./doc-du-kien');
const { doiChieu } = require('./doi-chieu');
const { nghienCuu } = require('./nghien-cuu');
const { locTheoQuyen } = require('./loc-quyen');
const VM = require('./viet-mo-ta');

const CHE_DO = ['off', 'shadow', 'on'];

/** Chế độ cờ HS_HO_SO (đọc env mỗi lần — đổi không cần khởi động lại). Mặc định / giá trị lạ ⇒ 'off'. */
function cheDoHoSo() {
  const v = String(process.env.HS_HO_SO || '').trim().toLowerCase();
  return CHE_DO.includes(v) ? v : 'off';
}

let _lat1 = null;
function pn6Lat1() {
  if (!_lat1) {
    try { _lat1 = new Set((JSON.parse(fs.readFileSync(dataReadPath('ho-so', 'lat-1.json'), 'utf8')).phanNhom || []).map((p) => String(p.pn6))); } catch { _lat1 = new Set(); }
  }
  return _lat1;
}
const nz = (v) => String(v == null ? '' : v).replace(/\D/g, '');
/** Mã thuộc 50 phân nhóm lát 1 (data/ho-so/lat-1.json). */
const laMaLat1 = (maHs) => nz(maHs).length >= 6 && pn6Lat1().has(nz(maHs).slice(0, 6));

const _duyet = new Map();
/**
 * Phân nhóm có ranh giới đã duyệt: mọi dòng 8 số có đường đi không còn mục CHUA_SO_HOA vì ranh giới chưa số hoá/chưa duyệt
 * (tiền lệ lệch chưa phân xử KHÔNG tính ở đây — đó là việc của chuyên gia, hồ sơ vẫn dựng để nêu ra).
 */
function coRanhGioiDuyet(pn6) {
  const p = nz(pn6).slice(0, 6);
  if (!_duyet.has(p)) {
    const la = T.tree().codes.filter((c) => c.startsWith(p));
    let ok = la.length > 0;
    try {
      for (const c of la) {
        const r = D.dungDuongDi(c, 'NHAP');
        if (r.duongDiPhapLy.some((e) => e.ketQua === 'CHUA_SO_HOA' && e.lyDo !== 'hieu-chinh-lech-chua-phan-xu')) { ok = false; break; }
      }
    } catch { ok = false; }
    _duyet.set(p, ok);
  }
  return _duyet.get(p);
}

/** Cờ bật (shadow|on) + mã lát 1 + phân nhóm có ranh giới đã duyệt. L1-5d dùng để rẽ nhánh. */
function hoSoApDung(maHs) {
  if (cheDoHoSo() === 'off') return false;
  return laMaLat1(maHs) && coRanhGioiDuyet(nz(maHs).slice(0, 6));
}

const KHOA_NHAN_DIEN = { nhanHieu: 'nhanHieu', model: 'model', kyMaHieu: 'kyMaHieu', nhaSanXuat: 'nhaSanXuat' };
/**
 * Khung hồ sơ `ho-so@1` từ kết quả dungDuongDi + dữ kiện đã đọc (docDuKien). Bộ não luôn tự dựng khung này — không nhận hồ sơ bên
 * gọi gửi ngược (spec §8.1 "Ranh giới tin cậy"). `ketLuan` để trống (doiChieu gán). `hoSoId` mới mỗi lượt (không định danh khách).
 * @param {import('./index').KetQuaDuongDi} duongDi
 * @param {{duKien?: object[], hang?: object, nhanDien?: object}} [o]
 * @returns {HoSoPhanLoai}
 */
function khungHoSo(duongDi, o = {}) {
  const dd = structuredClone(duongDi);
  const duKien = Array.isArray(o.duKien) ? structuredClone(o.duKien) : [];
  const nhanDien = { ...(o.nhanDien || {}) };
  for (const [k, f] of Object.entries(KHOA_NHAN_DIEN)) {
    if (nhanDien[k]) continue;
    const d = duKien.find((x) => x && x.fact === f && x.trangThai === 'DA_CO' && x.nguon !== 'AI_CHUA_KIEM' && x.giaTri != null);
    if (d) nhanDien[k] = String(d.giaTri);
  }
  return {
    hoSoId: crypto.randomUUID(),
    ...dd,
    hang: { tenVi: null, ...(o.hang || {}) },
    duKien,
    nhanDien,
    tienLe: [],
    tinHieuRuiRo: [],
    ketLuan: { trangThai: null, cauHoi: [] },
  };
}

module.exports = {
  PHIEN_BAN_HO_SO: D.PHIEN_BAN_HO_SO,
  LY_DO_CHUA_CHOT: LD.LY_DO_CHUA_CHOT,
  tachChuaChot: LD.tachChuaChot,
  docDuKien,
  khungHoSo,
  doiChieu,
  nghienCuu,
  locTheoQuyen,
  vietMoTa: VM.vietMoTa,
  kiemTuongDuong: VM.kiemTuongDuong,
  jaccardToken: VM.jaccardToken,
  dungDuongDi: D.dungDuongDi,
  soTayDaLoc: D.soTayDaLoc,
  cheDoHoSo,
  laMaLat1,
  coRanhGioiDuyet,
  hoSoApDung,
};
