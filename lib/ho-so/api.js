/**
 * lib/ho-so/api.js — nối động cơ hồ sơ phân loại vào endpoint (plan L1-5d, #648; spec hồ sơ §8.10). Hợp đồng cho bên gọi:
 * docs/api/ho-so-contract.md.
 *
 *   - `POST /api/ho-so` (api/describe.js?mode=ho_so) — KÍN, chỉ khoá dịch vụ, LUÔN trong withPrivateData: `hoSoApi(body, quyen)`.
 *   - `/api/describe`: `describeTheoCo(body, quyen, cu)` — cờ off / mã không áp dụng ⇒ trả NGUYÊN phản hồi đường cũ `cu(body)`;
 *     shadow ⇒ tính hồ sơ + viết, ghi MỘT dòng số đo vào dataPath('ho-so-shadow.jsonl'), trả nguyên đường cũ; on ⇒ THÊM sáu khối +
 *     `hoSo` (đã locTheoQuyen) + `hoSoMeta`, `customsDescription` = chuỗi của bộ viết, compliance tính trên chuỗi đó.
 *   - `/api/classify`: `ganHoSoClassify(result, attrs, quyen)` — thêm `hoSo`; khối `ecus` giữ shape, sinh bằng vietMoTa.
 *   - `/api/declaration-sheet`: `ganHoSoSheet(json, dauVao, quyen)` — `description.*` sinh bằng vietMoTa, shape giữ.
 *
 * Áp dụng: cờ HS_HO_SO ≠ off VÀ `hoSoApDung(maHs)` (mã lát 1 + phân nhóm có ranh giới đã duyệt). Mọi lỗi của tầng hồ sơ ở
 * describe/classify/sheet ⇒ trả đường cũ (không bao giờ làm hỏng endpoint đang chạy cho ERP).
 *
 * Hạn từng bước (env, ms): HS_HO_SO_HAN_DOC_MS (đọc dữ kiện, 35000), HS_HO_SO_HAN_DOI_CHIEU_MS (15000), HS_HO_SO_HAN_NGHIEN_CUU_MS
 * (30000), HS_HO_SO_HAN_VIET_MS (35000). Quá hạn ⇒ rơi về phần tất định của bước đó (đọc bằng luật, tín hiệu rỗng, bỏ nghiên cứu,
 * viết bằng máy) và ghi tên bước vào `hoSoMeta.buocQuaHan`. Tổng trần ≈ 115 s, dưới giới hạn 300 s của server.js.
 * Tắt riêng bước nghiên cứu (web/identify): HS_HO_SO_NGHIEN_CUU=false. Chế độ viết: HS_HO_SO_VIET=LLM|MAY (mặc định LLM).
 *
 * Chạy thử nội bộ (L1-5f): HS_HO_SO_THU_CALLERS="oz-noi-bo,…" (tên khoá dịch vụ trong HS_SERVICE_TOKENS). Khi HS_HO_SO=shadow,
 * lượt của các khoá đó chạy như `on` (`hoSoMeta.cheDo = 'on'`, `thuNoiBo: true`) và vẫn ghi một dòng số đo (`cheDo: 'thu'`);
 * mọi người gọi khác theo HS_HO_SO. `off` tắt hết (kể cả chạy thử). Lượt công khai / HS_API_TOKEN không có tên khoá ⇒ không
 * bao giờ được chạy thử; `cong-oz` chỉ khi được ghi tên rõ. Chế độ hiệu lực: `cheDoHieuLuc(quyen)` (`quyen.caller` = tên khoá).
 */
const fs = require('fs');
const path = require('path');
const T = require('../hs-tree');
const D = require('./duong-di');
const H = require('./index');
const { docDuKien, chuDauVao } = require('./doc-du-kien');
const { doiChieu } = require('./doi-chieu');
const { nghienCuu } = require('./nghien-cuu');
const { locTheoQuyen } = require('./loc-quyen');
const { vietMoTa, dinhDangCongSuat, cumCoTrong, GIOI_HAN_ECUS } = require('./viet-mo-ta');
const TV = require('../tu-vung');
const { isPrivate } = require('../llm-privacy');
const { dataPath } = require('../data-paths');
const { normalizeHs } = require('../data');

const nz = (v) => String(v == null ? '' : v).replace(/\D/g, '');
const CJK = /[㐀-鿿豈-﫿]/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOAI_TO_KHAI = ['NHAP', 'XUAT'];
const MAX_CHU = 4000;

/** Khoá được phép trong một dòng ho-so-shadow.jsonl — CHỈ số đo, không nội dung khách. */
const KHOA_SHADOW = [
  'ts', 'endpoint', 'maHs', 'loaiToKhai', 'noiBo', 'trangThai', 'capDaChac', 'banNhap', 'lyDoBanNhap', 'soDuKien', 'soChuaBiet',
  'soRanhGioi', 'ketQuaRanhGioi', 'soCauHoi', 'soTinHieu', 'doDaiMoTaEcus', 'coKhaiTiepHys', 'tuongDuong', 'soViPham', 'cheDoViet',
  'buocQuaHan', 'ms', 'loi', 'trungMoTaCu',
  // L1-5f — số đo §10 (vẫn chỉ số): chế độ (shadow|thu), mã lát 1 có áp dụng không, ms từng bước, LLM bị máy loại, chế độ viết
  // được yêu cầu, và khớp dữ kiện quyết định giữa chuỗi mới và mô tả cũ ({tong, moi, cu, caHai} — chỉ số đếm).
  'cheDo', 'apDung', 'msBuoc', 'llmBiLoai', 'cheDoVietYeuCau', 'duKienQD',
];
/** Khoá của dòng "mã lát 1 chưa áp dụng" (chưa có ranh giới duyệt) — chỉ để đếm tỉ lệ áp dụng. */
const KHOA_KHONG_AP_DUNG = ['ts', 'endpoint', 'maHs', 'noiBo', 'cheDo', 'apDung'];

// ── Chế độ hiệu lực (chạy thử nội bộ) ──────────────────────────────────────────────────────────────────────────
/** Tên khoá dịch vụ được chạy thử (HS_HO_SO_THU_CALLERS, CSV; khớp đúng chữ như HS_INTERNAL_CALLERS). */
function danhSachThu() {
  return String(process.env.HS_HO_SO_THU_CALLERS || '').split(',').map((s) => s.trim()).filter(Boolean);
}
/** Lượt này có được chạy thử không: cờ gốc shadow + khoá dịch vụ có tên trong danh sách. */
function laLuotThu(quyen) {
  const ten = quyen && typeof quyen.caller === 'string' ? quyen.caller.trim() : '';
  return Boolean(ten) && H.cheDoHoSo() === 'shadow' && danhSachThu().includes(ten);
}
/**
 * Chế độ hồ sơ HIỆU LỰC cho một lượt: 'off' | 'shadow' | 'on'. Cờ gốc HS_HO_SO; riêng khi cờ gốc là shadow, khoá dịch vụ có tên
 * trong HS_HO_SO_THU_CALLERS được 'on'. Không có `quyen.caller` (công khai, HS_API_TOKEN) ⇒ luôn theo cờ gốc.
 * @param {{caller?: string|null}} [quyen]
 */
function cheDoHieuLuc(quyen) {
  return laLuotThu(quyen) ? 'on' : H.cheDoHoSo();
}

// ── Nguồn ngoài tiêm được (test) ────────────────────────────────────────────────────────────────────────────────
const _deps = {};
/** Test seam: tiêm identify / webFacts / webGoi / xacMinhNhieu / fetchImpl / thamChieu / tinHieuDanhMuc / tienLeMaKhac / demKhoOz. */
function _datDeps(d = {}) { for (const k of Object.keys(_deps)) delete _deps[k]; Object.assign(_deps, d); }

function hanMs(ten, macDinh) {
  const v = Number(process.env[ten]);
  return Number.isFinite(v) && v > 0 ? v : macDinh;
}
/** Chạy `p` trong hạn: { ok:true, v } | { quaHan:true } | { loi }. Promise quá hạn vẫn chạy nền (không huỷ được) — kết quả bị bỏ. */
async function voiHan(p, ms) {
  let hen;
  const het = new Promise((r) => { hen = setTimeout(() => r({ quaHan: true }), ms); if (hen.unref) hen.unref(); });
  try {
    return await Promise.race([Promise.resolve(p).then((v) => ({ ok: true, v }), (loi) => ({ loi })), het]);
  } finally { clearTimeout(hen); }
}

// ── Đầu vào ─────────────────────────────────────────────────────────────────────────────────────────────────────
const chuoi = (v, max = MAX_CHU) => (v == null ? '' : String(v)).normalize('NFC').trim().slice(0, max);
const nhanVi = (f) => { try { return TV.layKhoa(f).nhanVi; } catch { return f; } };

/**
 * Dữ kiện bên gọi khai qua trường riêng (manufacturer, dimensions, condition, brand, model) ⇒ duKien nguồn KHACH, bằng chứng là
 * chính chuỗi bên gọi gửi. Đọc qua tu-vung trước (vd "không nhãn hiệu" ⇒ KHONG_HIEU, "80x80x250 mm" ⇒ [80,80,250]); TEN_LOAI đọc
 * không ra thì nhận nguyên chuỗi; kiểu khác đọc không ra ⇒ đưa vào thongSo dạng "<nhãn Việt>: <giá trị>" để luật/LLM đọc tiếp.
 */
function duKienTuTruong(truong) {
  const duKien = []; const thongSo = [];
  for (const [fact, raw] of truong) {
    const v = chuoi(raw, 300);
    if (!v) continue;
    let r = null; try { r = TV.docGiaTri(fact, v); } catch { r = null; }
    let k = null; try { k = TV.layKhoa(fact); } catch { k = null; }
    if (!k) continue;
    if (r && r.trangThai === 'DA_CO') duKien.push({ fact, giaTri: r.giaTri, ...(r.donVi ? { donVi: r.donVi } : {}), nguon: 'KHACH', bangChung: v });
    else if (k.kieu === 'TEN_LOAI') duKien.push({ fact, giaTri: v, nguon: 'KHACH', bangChung: v });
    else thongSo.push(`${nhanVi(fact)}: ${v}`);
  }
  return { duKien, thongSo };
}

/**
 * Chuẩn hoá đầu vào chung của động cơ. `che: 'chat'` (POST /api/ho-so) ⇒ loaiToKhai lạ / duKien sai kiểu là lỗi 400;
 * `che: 'em'` (describe/classify/sheet) ⇒ loaiToKhai lạ coi NHAP + cảnh báo, duKien sai kiểu bỏ qua.
 * @returns {{ok:boolean, loi?:string[], data?:object}}
 */
function chuanDauVao(o, che = 'em') {
  const loi = []; const canhBao = [];
  const maHs = nz(o.maHs);
  let loai = o.loaiToKhai == null || o.loaiToKhai === '' ? 'NHAP' : String(o.loaiToKhai).trim().toUpperCase();
  if (!LOAI_TO_KHAI.includes(loai)) {
    if (che === 'chat') loi.push('loaiToKhai phải là NHAP hoặc XUAT.');
    canhBao.push('loaiToKhai-khong-hop-le'); loai = 'NHAP';
  }
  let duKien = [];
  if (o.duKien != null) {
    if (!Array.isArray(o.duKien)) { if (che === 'chat') loi.push('duKien phải là mảng {fact, giaTri, donVi?, nguon?, bangChung?}.'); else canhBao.push('duKien-khong-phai-mang'); } else duKien = o.duKien.slice(0, 50).filter((d) => d && typeof d === 'object');
  }
  if (che === 'chat' && ![4, 6, 8].includes(maHs.length)) loi.push('maHs phải gồm 4, 6 hoặc 8 chữ số.');
  if (loi.length) return { ok: false, loi };
  const tr = duKienTuTruong([['nhaSanXuat', o.manufacturer ?? o.nhaSanXuat], ['kichThuoc', o.dimensions ?? o.kichThuoc], ['tinhTrang', o.condition ?? o.tinhTrang], ['nhanHieu', o.brand ?? o.nhanHieu], ['model', o.model]]);
  const tenHang = chuoi(o.tenHang, 300);
  const thongSo = [].concat(o.thongSo == null ? [] : o.thongSo).map((x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.entries(x).map(([k, v]) => `${k}: ${v}`).join(', ') : chuoi(x, 1000))).filter(Boolean);
  const packaging = chuoi(o.packaging ?? o.quyCachDongGoi, 200);
  return {
    ok: true,
    data: {
      maHs, loaiToKhai: loai,
      tenHang: tenHang && !CJK.test(tenHang) ? tenHang : '',
      moTa: chuoi(o.moTa),
      thongSo: [...thongSo, ...tr.thongSo].slice(0, 40),
      duKien: [...duKien, ...tr.duKien],
      nhanDien: packaging ? { quyCachDongGoi: packaging } : {},
      maThayThe: (Array.isArray(o.maThayThe) ? o.maThayThe : []).map(nz).filter((m) => m.length >= 4).slice(0, 5),
      hoSoIdTruoc: typeof o.hoSoId === 'string' && UUID.test(o.hoSoId) ? o.hoSoId : null,
      canhBao,
    },
  };
}

/** Phạm vi lát 1: 6/8 số ⇒ hoSoApDung; 4 số ⇒ có phân nhóm lát 1 đã duyệt dưới nhóm đó. */
function trongPhamVi(maHs) {
  const ma = nz(maHs);
  if (ma.length >= 6) return H.hoSoApDung(ma);
  if (ma.length !== 4 || H.cheDoHoSo() === 'off') return false;
  const pn6 = [...new Set(T.tree().codes.filter((c) => c.startsWith(ma)).map((c) => c.slice(0, 6)))];
  return pn6.some((p) => H.laMaLat1(p) && H.coRanhGioiDuyet(p));
}

// ── Lõi: dựng hồ sơ + viết, có hạn từng bước ───────────────────────────────────────────────────────────────────
const tinHieuOpts = () => ({
  ...(_deps.tinHieuDanhMuc ? { tinHieuDanhMuc: _deps.tinHieuDanhMuc } : {}),
  ...(_deps.tienLeMaKhac ? { tienLeMaKhac: _deps.tienLeMaKhac } : {}),
  ...(_deps.demKhoOz ? { demKhoOz: _deps.demKhoOz } : {}),
});
const RONG = { tinHieuDanhMuc: async () => [], tienLeMaKhac: async () => [], demKhoOz: async () => ({ tong: 0, maKhac: [] }) };

/**
 * @param {object} dv kết quả chuanDauVao().data
 * @param {{noiBo?: boolean}} quyen
 * @returns {Promise<{hoSo:object, viet:object, meta:object}>} hoSo và viet ĐÃ locTheoQuyen
 * @throws lỗi của dungDuongDi (MA_KHONG_HOP_LE | LOAI_TO_KHAI_KHONG_HOP_LE | MA_KHONG_CO_TRONG_BIEU)
 */
async function chayHoSo(dv, quyen = {}) {
  const t0 = Date.now();
  const noiBo = quyen.noiBo === true;
  const rieng = isPrivate();
  const buocQuaHan = [];
  const msBuoc = {};
  let tBuoc = Date.now();
  const xong = (ten) => { const n = Date.now(); msBuoc[ten] = n - tBuoc; tBuoc = n; };
  const ghi = (ten, kq) => { if (kq.quaHan) buocQuaHan.push(ten); };
  const dd = D.dungDuongDi(dv.maHs, dv.loaiToKhai, dv.maThayThe && dv.maThayThe.length ? { maThayThe: dv.maThayThe } : {});
  const dauVao = { tenHang: dv.tenHang, moTa: dv.moTa, thongSo: dv.thongSo, duKien: dv.duKien };
  const moTaChu = chuDauVao(dauVao);
  xong('duongDi');

  // 1. đọc dữ kiện — quá hạn/lỗi ⇒ chỉ luật (không LLM)
  let kq = await voiHan(docDuKien(dauVao, dd, { rieng }), hanMs('HS_HO_SO_HAN_DOC_MS', 35000));
  ghi('docDuKien', kq);
  const duKien = kq.ok ? kq.v : await docDuKien(dauVao, dd, { llm: async () => [] });
  xong('docDuKien');

  // 2. đối chiếu — quá hạn/lỗi ⇒ bỏ tín hiệu (phần đối chiếu ranh giới tất định vẫn chạy)
  const khung = H.khungHoSo(dd, { duKien, hang: { tenVi: dv.tenHang || null }, nhanDien: dv.nhanDien });
  const dcOpts = { moTa: moTaChu, noiBo, ...tinHieuOpts() };
  kq = await voiHan(doiChieu(khung, dcOpts), hanMs('HS_HO_SO_HAN_DOI_CHIEU_MS', 15000));
  ghi('doiChieu', kq);
  let hoSo = kq.ok ? kq.v : await doiChieu(khung, { ...dcOpts, ...RONG });
  xong('doiChieu');

  // 3. nghiên cứu (chỉ khi còn dữ kiện quyết định CHUA_BIET) — quá hạn/lỗi ⇒ giữ hồ sơ trước bước này
  if (String(process.env.HS_HO_SO_NGHIEN_CUU || '').toLowerCase() !== 'false' && (hoSo.duKien || []).some((d) => d && d.trangThai === 'CHUA_BIET')) {
    const deps = {};
    for (const k of ['identify', 'webFacts', 'webGoi', 'xacMinhNhieu', 'fetchImpl']) if (_deps[k]) deps[k] = _deps[k];
    kq = await voiHan(nghienCuu(hoSo, { ...dcOpts, congKhai: !rieng, deps }), hanMs('HS_HO_SO_HAN_NGHIEN_CUU_MS', 30000));
    ghi('nghienCuu', kq);
    if (kq.ok) hoSo = kq.v;
    xong('nghienCuu');
  }

  // 4. viết — quá hạn/lỗi ⇒ bản máy ghép (không LLM)
  const cheDo = String(process.env.HS_HO_SO_VIET || 'LLM').toUpperCase() === 'MAY' ? 'MAY' : 'LLM';
  const vOpts = { cheDo, rieng, ...(_deps.thamChieu ? { thamChieu: _deps.thamChieu } : {}) };
  kq = await voiHan(vietMoTa(hoSo, vOpts), hanMs('HS_HO_SO_HAN_VIET_MS', 35000));
  ghi('viet', kq);
  const viet = kq.ok ? kq.v : await vietMoTa(hoSo, { cheDo: 'MAY' });
  xong('viet');

  const hoSoLoc = locTheoQuyen(hoSo, { noiBo });
  const vietLoc = locTheoQuyen(viet, { noiBo });
  return {
    hoSo: hoSoLoc,
    viet: vietLoc,
    meta: {
      apDung: true,
      cheDo: cheDoHieuLuc(quyen),
      ...(laLuotThu(quyen) ? { thuNoiBo: true } : {}),
      cheDoViet: (viet.kiemTra && viet.kiemTra.cheDoDung) || 'MAY',
      tuongDuong: Boolean(viet.kiemTra && viet.kiemTra.tuongDuong),
      buocQuaHan,
      ...(dv.hoSoIdTruoc ? { hoSoIdTruoc: dv.hoSoIdTruoc, ghiChuHoSoId: 'Bộ não không lưu hồ sơ: luôn dựng lại từ dữ liệu của chính nó; hoSoId bên gọi chỉ được ghi lại để đối chiếu.' } : {}),
      ...(dv.canhBao && dv.canhBao.length ? { canhBao: [...dv.canhBao] } : {}),
      ms: Date.now() - t0,
    },
    // Số đo nội bộ cho dòng shadow — KHÔNG trả ra phản hồi.
    so: {
      msBuoc,
      cheDoVietYeuCau: cheDo,
      llmBiLoai: ((viet.kiemTra && viet.kiemTra.viPham) || []).some((x) => String(x).startsWith('llm-bi-loai')),
    },
  };
}

/** Sáu khối mô tả (+ khối bản nháp khi chưa đủ căn cứ) — tên trường theo docs/api/ho-so-contract.md. */
function khoiMoTa(viet) {
  const v = viet || {};
  return {
    moTaEcus: v.moTaEcus ?? null,
    khaiTiepHys: v.khaiTiepHys ?? null,
    ghiChu: v.ghiChu ?? null,
    moTaDayDu: v.moTaDayDu ?? null,
    bangGiaiTrinh: Array.isArray(v.bangGiaiTrinh) ? v.bangGiaiTrinh : [],
    taiLieuKyThuatNenKem: Array.isArray(v.taiLieuKyThuatNenKem) ? v.taiLieuKyThuatNenKem : [],
    banNhap: v.banNhap === true,
    ...(v.banNhap === true ? {
      moTaBanNhap: v.moTaBanNhap ?? null,
      nhanBanNhap: v.nhanBanNhap ?? null,
      lyDoBanNhap: Array.isArray(v.lyDoBanNhap) ? v.lyDoBanNhap : [],
      cauHoi: Array.isArray(v.cauHoi) ? v.cauHoi : [],
      ...(v.maTroToi ? { maTroToi: v.maTroToi } : {}),
    } : {}),
    ...(v.goiYThongBaoPtpl ? { goiYThongBaoPtpl: v.goiYThongBaoPtpl } : {}),
  };
}
/** Chuỗi cuối thay customsDescription: bản đạt ⇒ moTaEcus; bản nháp ⇒ moTaBanNhap (có chỗ trống "[cần: …]"). */
const chuoiCuoi = (viet, duPhong) => (viet.banNhap ? (viet.moTaBanNhap || duPhong || '') : (viet.moTaEcus || duPhong || ''));

/**
 * compliance tính trên CHUỖI CUỐI (spec §8.10): tên hàng = chuỗi ô ECUS (+ khai tiếp HYS ở thông số); trường riêng của tờ khai
 * (xuất xứ, đơn vị tính, tình trạng) lấy từ declaration. Bản nháp ⇒ REJECT + HO_SO_BAN_NHAP (không bao giờ đọc như bản đạt).
 */
function complianceChuoiCuoi({ declaration = {}, hsCode, viet, hoSo, giuCanhBao = [] }) {
  const { validateDeclaration } = require('../declaration-validator');
  const cum = (f) => ((viet.cumDaKiem || []).find((c) => c.fact === f && !c.choTrong) || {}).cum || null;
  const nd = (hoSo && hoSo.nhanDien) || {};
  const s = chuoiCuoi(viet, declaration.tenHang);
  const decl = {
    tenHang: s,
    thongSoKyThuat: [...(viet.cumDaKiem || []).filter((x) => x.nhom === 4 && !x.choTrong && x.cum).map((x) => x.cum), ...(viet.khaiTiepHys ? [viet.khaiTiepHys] : [])],
    thanhPhanCauTao: cum('chatLieu'),
    congDung: cum('congDung') || cum('dungCho'),
    nhanHieu: nd.nhanHieu || null,
    model: nd.model || null,
    xuatXu: declaration.xuatXu || null,
    donViTinh: declaration.donViTinh || null,
    tinhTrang: declaration.tinhTrang || null,
    tinhTrangDefaulted: declaration.tinhTrangDefaulted,
    chapterSpecific: {},
  };
  let c;
  try { c = validateDeclaration(decl, hsCode, { brand: decl.nhanHieu, model: decl.model }); } catch { c = { score: 0, level: 'REJECT', missingRequired: [], warnings: [], passesCustomsAudit: false }; }
  c.warnings = [...(c.warnings || []), ...giuCanhBao];
  if (viet.khaiTiepHys) c.warnings.push({ code: 'HO_SO_KHAI_TIEP_HYS', field: 'customsDescription', severity: 'info', message: 'Phần mô tả không vừa ô 200 ký tự nằm ở khaiTiepHys — khai tiếp theo hướng dẫn chỉ tiêu 1.68 (xem canCuMoTa.khaiTiep), không bỏ dữ kiện.' });
  const llmLoai = ((viet.kiemTra && viet.kiemTra.viPham) || []).filter((x) => String(x).startsWith('llm-bi-loai'));
  if (llmLoai.length) c.warnings.push({ code: 'HO_SO_DUNG_BAN_MAY', field: 'customsDescription', severity: 'info', message: 'Bản LLM viết lại không qua máy kiểm — dùng bản máy ghép từ cụm đã kiểm.' });
  if (viet.banNhap) {
    c.warnings.push({
      code: 'HO_SO_BAN_NHAP', field: 'customsDescription', severity: 'error',
      message: `Hồ sơ phân loại chưa đủ căn cứ (${(viet.lyDoBanNhap || []).join(', ')}) — customsDescription là BẢN NHÁP, không dùng để khai. Trả lời cauHoi[] rồi gọi lại.`,
    });
    c.score = Math.min(Number(c.score) || 0, 39);
    c.level = 'REJECT';
    c.passesCustomsAudit = false;
  }
  return c;
}

// ── Shadow ──────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Khớp dữ kiện quyết định giữa chuỗi mới (moTaEcus ∪ khaiTiepHys; bản nháp ⇒ moTaBanNhap) và mô tả cũ của đường hiện tại.
 * Dữ kiện = cụm nhóm 2 (DU_KIEN_QUYET_DINH) đã kiểm của bộ viết, bỏ chỗ trống. Có mặt = đọc ngược qua tu-vung ra đúng giá trị
 * (hoặc cụm nguyên văn) — cùng máy với kiemTra.tuongDuong. CHỈ trả số đếm, không câu chữ.
 * @returns {{tong:number, moi:number, cu:number, caHai:number}}
 */
function soKhopDuKien(viet, moTaCu) {
  const v = viet || {};
  const moi = v.banNhap ? String(v.moTaBanNhap || '') : [v.moTaEcus, v.khaiTiepHys].filter(Boolean).join(', ');
  const cu = typeof moTaCu === 'string' ? moTaCu : '';
  const out = { tong: 0, moi: 0, cu: 0, caHai: 0 };
  for (const c of v.cumDaKiem || []) {
    if (!c || c.nhom !== 2 || c.choTrong) continue;
    out.tong += 1;
    let a = false; let b = false;
    try { a = moi ? cumCoTrong(c, moi).co : false; } catch { a = false; }
    try { b = cu ? cumCoTrong(c, cu).co : false; } catch { b = false; }
    if (a) out.moi += 1;
    if (b) out.cu += 1;
    if (a && b) out.caHai += 1;
  }
  return out;
}

function dongShadow(endpoint, kq, extra = {}) {
  if (extra.apDung === false) {
    const r = { ts: new Date().toISOString(), endpoint, maHs: extra.maHs || null, noiBo: extra.noiBo === true, cheDo: extra.cheDo || 'shadow', apDung: false };
    for (const k of Object.keys(r)) if (!KHOA_KHONG_AP_DUNG.includes(k)) delete r[k];
    return r;
  }
  const h = (kq && kq.hoSo) || {}; const v = (kq && kq.viet) || {}; const m = (kq && kq.meta) || {}; const so = (kq && kq.so) || {};
  const ketQuaRanhGioi = {};
  for (const e of h.duongDiPhapLy || []) { const k = e && e.ketQua ? e.ketQua : 'CHUA'; ketQuaRanhGioi[k] = (ketQuaRanhGioi[k] || 0) + 1; }
  const row = {
    ts: new Date().toISOString(), endpoint, maHs: h.maHs || extra.maHs || null, loaiToKhai: h.loaiToKhai || null,
    noiBo: extra.noiBo === true, trangThai: (h.ketLuan && h.ketLuan.trangThai) || null, capDaChac: h.capDaChac ?? null,
    banNhap: v.banNhap === true, lyDoBanNhap: Array.isArray(v.lyDoBanNhap) ? v.lyDoBanNhap.map(String).slice(0, 10) : [],
    soDuKien: (h.duKien || []).filter((d) => d && d.trangThai === 'DA_CO').length,
    soChuaBiet: (h.duKien || []).filter((d) => d && d.trangThai === 'CHUA_BIET').length,
    soRanhGioi: (h.duongDiPhapLy || []).length, ketQuaRanhGioi,
    soCauHoi: ((h.ketLuan && h.ketLuan.cauHoi) || []).length, soTinHieu: (h.tinHieuRuiRo || []).length,
    doDaiMoTaEcus: typeof v.moTaEcus === 'string' ? v.moTaEcus.length : null, coKhaiTiepHys: Boolean(v.khaiTiepHys),
    tuongDuong: Boolean(m.tuongDuong), soViPham: ((v.kiemTra && v.kiemTra.viPham) || []).length, cheDoViet: m.cheDoViet || null,
    buocQuaHan: m.buocQuaHan || [], ms: m.ms ?? null,
    cheDo: extra.cheDo || 'shadow', apDung: true,
    ...(so.msBuoc ? { msBuoc: so.msBuoc } : {}),
    ...(so.cheDoVietYeuCau ? { cheDoVietYeuCau: so.cheDoVietYeuCau, llmBiLoai: so.llmBiLoai === true } : {}),
    ...(extra.duKienQD ? { duKienQD: extra.duKienQD } : {}),
    ...(extra.loi ? { loi: String(extra.loi).slice(0, 40) } : {}),
    ...(typeof extra.trungMoTaCu === 'boolean' ? { trungMoTaCu: extra.trungMoTaCu } : {}),
  };
  for (const k of Object.keys(row)) if (!KHOA_SHADOW.includes(k)) delete row[k];
  return row;
}
function ghiShadow(endpoint, kq, extra) {
  try {
    const p = dataPath('ho-so-shadow.jsonl');
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.appendFileSync(p, `${JSON.stringify(dongShadow(endpoint, kq, extra))}\n`);
  } catch { /* số đo là tuỳ chọn */ }
}
/** Shadow + mã lát 1 nhưng phân nhóm chưa có ranh giới duyệt ⇒ một dòng gọn `apDung: false` (đếm tỉ lệ áp dụng). */
function ghiKhongApDung(endpoint, maHs, quyen) {
  try { if (nz(maHs).length === 8 && H.laMaLat1(maHs)) ghiShadow(endpoint, null, { apDung: false, maHs: nz(maHs), noiBo: quyen && quyen.noiBo }); } catch { /* số đo tuỳ chọn */ }
}
/** Phần chung của dòng số đo cho lượt shadow / chạy thử. */
const extraSo = (quyen, che, moi, moTaCu) => ({
  noiBo: quyen && quyen.noiBo, cheDo: che === 'shadow' ? 'shadow' : 'thu',
  ...(typeof moTaCu === 'string' && moi && moi.viet ? { duKienQD: soKhopDuKien(moi.viet, moTaCu) } : {}),
});
/**
 * Ghi MỘT dòng số đo khi lượt chạy bóng (`che === 'shadow'`) hoặc chạy thử nội bộ (`on` nhờ HS_HO_SO_THU_CALLERS). `on` toàn cục
 * không ghi (như trước L1-5f). `moi` = kết quả chayHoSo hoặc `{ loi }`; `moTaCu` = chuỗi của đường cũ (chỉ để đếm khớp dữ kiện).
 */
function ghiShadowNeuCan(endpoint, che, quyen, moi, { maHs, moTaCu } = {}) {
  if (che !== 'shadow' && !laLuotThu(quyen)) return;
  if (!moi || moi.loi) { ghiShadow(endpoint, null, { maHs, ...extraSo(quyen, che), loi: maLoi(moi && moi.loi) }); return; }
  ghiShadow(endpoint, moi, {
    maHs, ...extraSo(quyen, che, moi, moTaCu),
    ...(typeof moTaCu === 'string' && endpoint === 'describe' ? { trungMoTaCu: chuoiCuoi(moi.viet) === moTaCu } : {}),
  });
}
const maLoi = (e) => String((e && (e.code || e.message)) || 'loi').replace(/[^A-Z0-9_]/gi, '_').slice(0, 40);

// ── /api/describe ───────────────────────────────────────────────────────────────────────────────────────────────
function dauVaoDescribe(body = {}) {
  const thongSo = [
    body.technicalSpec,
    body.material ? `chất liệu: ${body.material}` : null,
    body.purpose ? `công dụng: ${body.purpose}` : null,
  ];
  const at = body.attributes;
  if (Array.isArray(at)) for (const a of at) { if (a && (a.valueVi || a.value)) thongSo.push(`${a.labelVi || a.key || ''}: ${a.valueVi || a.value}`); } else if (at && typeof at === 'object') for (const [k, v] of Object.entries(at)) if (v != null && typeof v !== 'object') thongSo.push(`${k}: ${v}`);
  return {
    maHs: normalizeHs(body.hsCode || body.hs), loaiToKhai: body.loaiToKhai, tenHang: body.productName, moTa: body.customerDescription,
    thongSo: thongSo.filter((x) => x != null && String(x).trim()), duKien: body.duKien,
    manufacturer: body.manufacturer, dimensions: body.dimensions, condition: body.condition, packaging: body.packaging,
    brand: body.brand, model: body.model, hoSoId: body.hoSoId,
    // origin: KHÔNG vào hồ sơ/chuỗi (tờ khai nhập khai xuất xứ ở ô riêng; "xuất xứ" bị cấm trong chuỗi — spec §8.4)
  };
}

/**
 * @param {object} body body của /api/describe
 * @param {{noiBo?: boolean}} quyen
 * @param {(body:object) => Promise<{status:number, json:object}>} cu đường cũ (lib/describe-core.js#describeProductCu)
 */
async function describeTheoCo(body, quyen, cu) {
  const che = cheDoHieuLuc(quyen);
  if (che === 'off') return cu(body);
  const hsCode = normalizeHs(body && (body.hsCode || body.hs));
  let apDung = false;
  try { apDung = hsCode.length === 8 && H.hoSoApDung(hsCode); } catch { apDung = false; }
  if (!apDung) { if (che === 'shadow') ghiKhongApDung('describe', hsCode, quyen); return cu(body); }
  const c = chuanDauVao(dauVaoDescribe(body || {}), 'em');
  const [out, moi] = await Promise.all([cu(body), chayHoSo(c.data, quyen).catch((e) => ({ loi: e }))]);
  if (!out || out.status !== 200 || !out.json || typeof out.json !== 'object') return out;
  const cuJ = out.json;
  ghiShadowNeuCan('describe', che, quyen, moi, { maHs: hsCode, moTaCu: cuJ.customsDescription });
  if (che === 'shadow') return out;
  if (moi.loi) return { status: out.status, json: { ...out.json, hoSoMeta: { apDung: true, cheDo: che, loi: 'HO_SO_LOI' } } };
  const { hoSo, viet, meta } = moi;
  const s = chuoiCuoi(viet, cuJ.customsDescription);
  const giu = ((cuJ.compliance && cuJ.compliance.warnings) || []).filter((w) => w && w.code === 'TRADEMARK_WATCH');
  return {
    status: out.status,
    json: {
      ...cuJ,
      customsDescription: s,
      descriptionMeta: {
        length: s.length, maxLength: GIOI_HAN_ECUS, truncated: Boolean(viet.khaiTiepHys),
        fullLength: (viet.moTaDayDu || s).length, dropped: [], nguon: 'HO_SO',
        ...(viet.khaiTiepHys ? { fullText: viet.moTaDayDu || s } : {}),
      },
      compliance: complianceChuoiCuoi({ declaration: cuJ.declaration, hsCode, viet, hoSo, giuCanhBao: giu }),
      ...khoiMoTa(viet),
      canCuMoTa: viet.canCu || null,
      hoSo,
      hoSoMeta: meta,
    },
  };
}

// ── POST /api/ho-so ─────────────────────────────────────────────────────────────────────────────────────────────
/**
 * @returns {Promise<{status:number, json:object}>} 200 HoSoPhanLoai (+ moTa sáu khối, hoSoMeta) | 400 DAU_VAO_SAI | 404 KHONG_CO_MA
 *   | 422 NGOAI_LAT_1 | 503 HO_SO_TAT. Gọi trong withPrivateData (api/describe.js).
 */
async function hoSoApi(body, quyen = {}) {
  if (cheDoHieuLuc(quyen) === 'off') return { status: 503, json: { error: 'HO_SO_TAT', chiTiet: ['Hồ sơ phân loại đang tắt (HS_HO_SO=off).'] } };
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { status: 400, json: { error: 'DAU_VAO_SAI', chiTiet: ['Body phải là đối tượng JSON.'] } };
  // Ranh giới tin cậy (spec §8.1): `hoSo` bên gọi gửi bị BỎ QUA — chỉ đọc hoSoId + duKien (+ chữ mô tả).
  const c = chuanDauVao({
    maHs: body.maHs, loaiToKhai: body.loaiToKhai, tenHang: body.tenHang, moTa: body.moTa, thongSo: body.thongSo, duKien: body.duKien,
    manufacturer: body.manufacturer ?? body.nhaSanXuat, dimensions: body.dimensions ?? body.kichThuoc, condition: body.condition ?? body.tinhTrang,
    packaging: body.packaging ?? body.quyCachDongGoi, brand: body.brand ?? body.nhanHieu, model: body.model, hoSoId: body.hoSoId, maThayThe: body.maThayThe,
  }, 'chat');
  if (!c.ok) return { status: 400, json: { error: 'DAU_VAO_SAI', chiTiet: c.loi } };
  try { D.dungDuongDi(c.data.maHs, c.data.loaiToKhai); } catch (e) {
    if (e && e.code === 'MA_KHONG_CO_TRONG_BIEU') return { status: 404, json: { error: 'KHONG_CO_MA', chiTiet: [`Mã ${c.data.maHs} không có trong biểu thuế.`] } };
    return { status: 400, json: { error: 'DAU_VAO_SAI', chiTiet: [String(e && e.message).slice(0, 200)] } };
  }
  if (!trongPhamVi(c.data.maHs)) {
    return { status: 422, json: { error: 'NGOAI_LAT_1', chiTiet: [`Mã ${c.data.maHs} chưa thuộc lát 1 (50 phân nhóm có ranh giới đã duyệt) — dùng /api/describe, /api/classify như hiện tại.`] } };
  }
  const kq = await chayHoSo(c.data, quyen);
  const { hoSo, viet, meta } = kq;
  ghiShadowNeuCan('ho-so', cheDoHieuLuc(quyen), quyen, kq, { maHs: c.data.maHs });
  return { status: 200, json: { ...hoSo, moTa: { ...khoiMoTa(viet), kiemTra: viet.kiemTra || null, canCuMoTa: viet.canCu || null }, hoSoMeta: meta } };
}

// ── /api/classify ───────────────────────────────────────────────────────────────────────────────────────────────
async function ganHoSoClassify(result, attrs = {}, quyen = {}) {
  const che = cheDoHieuLuc(quyen);
  if (che === 'off' || !result || typeof result !== 'object') return result;
  const top = nz(result.results && result.results[0] && result.results[0].hs);
  let apDung = false;
  try { apDung = top.length === 8 && H.hoSoApDung(top); } catch { apDung = false; }
  if (!apDung) { if (che === 'shadow') ghiKhongApDung('classify', top, quyen); return result; }
  const facts = Array.isArray(attrs.facts) ? attrs.facts.map((f) => (f && (f.labelVi || f.key) && f.valueVi ? `${f.labelVi || f.key}: ${f.valueVi}` : null)) : [];
  const c = chuanDauVao({
    maHs: top, loaiToKhai: attrs.loaiToKhai, tenHang: attrs.tenHang, moTa: [attrs.congDung, attrs.chucNang].filter(Boolean).join('. '),
    thongSo: [attrs.chatLieu ? `chất liệu: ${attrs.chatLieu}` : null, attrs.specs ? String(attrs.specs) : null, ...facts].filter(Boolean),
    duKien: attrs.duKien, manufacturer: attrs.manufacturer, dimensions: attrs.dimensions, condition: attrs.condition, packaging: attrs.packaging,
    brand: attrs.brand, model: attrs.model,
    maThayThe: (result.results || []).slice(1).map((r) => r && r.hs),
  }, 'em');
  let moi;
  const moTaCuEcus = result.ecus && typeof result.ecus.description === 'string' ? result.ecus.description : '';
  try { moi = await chayHoSo(c.data, quyen); } catch (e) {
    ghiShadowNeuCan('classify', che, quyen, { loi: e }, { maHs: top });
    if (che === 'shadow') return result;
    return { ...result, hoSoMeta: { apDung: true, cheDo: che, loi: 'HO_SO_LOI' } };
  }
  ghiShadowNeuCan('classify', che, quyen, moi, { maHs: top, moTaCu: moTaCuEcus });
  if (che === 'shadow') return result;
  const { hoSo, viet, meta } = moi;
  const { attrsToDeclaration } = require('../describe-ecus');
  let decl = {}; try { decl = attrsToDeclaration(attrs); } catch { decl = {}; }
  const comp = complianceChuoiCuoi({ declaration: decl, hsCode: top, viet, hoSo });
  return {
    ...result,
    ecus: {
      ...(result.ecus && typeof result.ecus === 'object' ? result.ecus : {}),
      description: chuoiCuoi(viet, result.ecus && result.ecus.description),
      level: comp.level, score: comp.score, missing: comp.missingRequired || [],
      ...khoiMoTa(viet),
      canCuMoTa: viet.canCu || null,
    },
    hoSo,
    hoSoMeta: meta,
  };
}

// ── /api/declaration-sheet ──────────────────────────────────────────────────────────────────────────────────────
/**
 * @param {object} json phản hồi phiếu đã dựng (buildDeclarationSheet)
 * @param {{hs:string, tenHang?:string, thongSo?:string[], moTa?:string, loaiToKhai?:string, packaging?:string, condition?:string}} dauVao
 */
async function ganHoSoSheet(json, dauVao = {}, quyen = {}) {
  const che = cheDoHieuLuc(quyen);
  if (che === 'off' || !json || typeof json !== 'object' || !json.description || typeof json.description !== 'object') return json;
  const ma = nz(dauVao.hs);
  let apDung = false;
  try { apDung = ma.length === 8 && H.hoSoApDung(ma); } catch { apDung = false; }
  if (!apDung) { if (che === 'shadow') ghiKhongApDung('declaration-sheet', ma, quyen); return json; }
  const c = chuanDauVao({ maHs: ma, loaiToKhai: dauVao.loaiToKhai, tenHang: dauVao.tenHang, moTa: dauVao.moTa, thongSo: dauVao.thongSo, packaging: dauVao.packaging, condition: dauVao.condition }, 'em');
  let moi;
  try { moi = await chayHoSo(c.data, quyen); } catch (e) {
    ghiShadowNeuCan('declaration-sheet', che, quyen, { loi: e }, { maHs: ma });
    return json;
  }
  ghiShadowNeuCan('declaration-sheet', che, quyen, moi, { maHs: ma, moTaCu: typeof json.description.customsDescription === 'string' ? json.description.customsDescription : '' });
  if (che === 'shadow') return json;
  const { hoSo, viet, meta } = moi;
  const d = json.description;
  const s = chuoiCuoi(viet, d.customsDescription);
  return {
    ...json,
    description: {
      ...d,
      customsDescription: s,
      composedFrom: 'HO_SO',
      descriptionMeta: { ...(d.descriptionMeta || {}), length: s.length, maxLength: GIOI_HAN_ECUS, truncated: Boolean(viet.khaiTiepHys), dropped: [], nguon: 'HO_SO', ...(viet.khaiTiepHys ? { fullText: viet.moTaDayDu || s } : {}) },
      compliance: complianceChuoiCuoi({ declaration: d.declaration || {}, hsCode: ma, viet, hoSo }),
      ...khoiMoTa(viet),
      canCuMoTa: viet.canCu || null,
      hoSo,
      hoSoMeta: meta,
    },
  };
}

module.exports = {
  KHOA_SHADOW, KHOA_KHONG_AP_DUNG, cheDoHieuLuc, danhSachThu, soKhopDuKien, _datDeps, chuanDauVao, trongPhamVi, chayHoSo, khoiMoTa, complianceChuoiCuoi, dongShadow,
  describeTheoCo, hoSoApi, ganHoSoClassify, ganHoSoSheet, dinhDangCongSuat, voiHan,
};
