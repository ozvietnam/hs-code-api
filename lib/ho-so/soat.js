/**
 * lib/ho-so/soat.js — `soat`: SOÁT một dòng tờ khai (mã 8 số khai + câu mô tả khai) bằng hồ sơ phân loại (plan L1-5e, #648;
 * spec hồ sơ §8.5, §8.10). Hợp đồng cho bên gọi: docs/api/ho-so-contract.md mục 8.
 *
 * Luồng (spec §8.5): dungDuongDi(maKhai) → docDuKien(moTa [+ thongSo, + duKien bên gọi]) → doiChieu (CO / THIEU / MAU_THUAN /
 * CHUA_SO_HOA + tín hiệu rủi ro) → `canPhanLoai` (còn MAU_THUAN hoặc CHUA_SO_HOA ở ranh giới quyết định ⇒ bên gọi mới gọi
 * classify — lib/declaration-check.js) → `cauSuaDeXuat = vietMoTa(hoSoDaSua)`.
 *   - KHÔNG nghiên cứu web/identify: soát chấm CHÍNH câu khai; dữ kiện câu khai thiếu phải hiện là THIEU, không được lấp từ web.
 *   - `hoSoDaSua`: MAU_THUAN có `maTroToi` (dòng anh em duy nhất dữ kiện thoả trọn) ⇒ hồ sơ dựng lại trên `maTroToi` với cùng dữ
 *     kiện (`theoMa: 'MA_TRO_TOI'`); còn lại ⇒ chính hồ sơ của mã khai (`theoMa: 'MA_KHAI'`). Hồ sơ chưa DU_CAN_CU ⇒ bản nháp có chỗ
 *     trống "[cần: …]" (vietMoTa), không bao giờ trình như bản đạt.
 *   - `coCanCuTatDinh`: có ranh giới MAU_THUAN tất định (dữ kiện đọc bằng luật, không qua LLM, không do tiền lệ lật), điều kiện từ
 *     sổ tay đã duyệt (`CLAUDE_DUYET` | `NGUOI_DUYET`) và câu trích NGUYÊN VĂN (bộ viết kiểm lại với tệp nguồn — trichBiLoai).
 *   - `khungNghiNgo` (khung QĐ 2169 mục 13): chỉ khi MAU_THUAN — mã nghi ngờ, nội dung nghi ngờ, tiêu chí phân biệt (điều kiện +
 *     câu trích nguyên văn của ranh giới bị trái). Không MAU_THUAN ⇒ null.
 * Không gắn nhãn GIR (luật 6), không gõ điều khoản (luật 7a): căn cứ nằm ở `hoSo.canCu` do doiChieu tính qua lib/gir.js +
 * lib/legal-basis.js. QĐ 2079 chỉ là tín hiệu (`hoSo.tinHieuRuiRo`), không bao giờ vào canCu. Hồ sơ trả ra đã locTheoQuyen.
 * Hạn từng bước dùng chung env của lib/ho-so/api.js (HS_HO_SO_HAN_DOC_MS, _DOI_CHIEU_MS, _VIET_MS); quá hạn ⇒ phần tất định.
 */
const D = require('./duong-di');
const H = require('./index');
const DK = require('../dieu-kien-so');
const TV = require('../tu-vung');
const { docDuKien, chuDauVao } = require('./doc-du-kien');
const { doiChieu } = require('./doi-chieu');
const { vietMoTa } = require('./viet-mo-ta');
const { locTheoQuyen } = require('./loc-quyen');
const { isPrivate } = require('../llm-privacy');

const NGUON_DUYET = new Set(['CLAUDE_DUYET', 'NGUOI_DUYET']);
const KET_QUA_DQ = new Set(['CO', 'THIEU', 'MAU_THUAN']);
const nz = (v) => String(v == null ? '' : v).replace(/\D/g, '');
const fmtMa = (m) => { const s = nz(m); return s.length === 8 ? `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6)}` : s.length === 6 ? `${s.slice(0, 4)}.${s.slice(4)}` : s; };
const factCua = (c) => (!c ? [] : c.op === 'VA' ? (c.cacDieuKien || []).flatMap(factCua) : DK.factCuaDieuKien(c));
const khoaCo = (f) => { try { return TV.layKhoa(f); } catch { return null; } };
const nhanVi = (f) => (khoaCo(f) || {}).nhanVi || f;
const api = () => require('./api'); // nạp lúc gọi: api.js không phụ thuộc tệp này

// Test seam: ép soat() ném lỗi (kiểm đường rơi về đường cũ của declaration-check).
let _loiThu = null;
function _datLoiThu(e) { _loiThu = e || null; }

/** Còn ranh giới quyết định MAU_THUAN hoặc CHUA_SO_HOA ⇒ cần động cơ phân loại (spec §8.5 bước 5). */
function canPhanLoai(hoSo) {
  return ((hoSo && hoSo.duongDiPhapLy) || []).some((e) => e && (e.ketQua === 'MAU_THUAN' || e.ketQua === 'CHUA_SO_HOA'));
}

/**
 * Dữ kiện quyết định theo từng ranh giới có điều kiện: `{ fact, nhanVi, ketQua: CO|THIEU|MAU_THUAN, trich, giaTri?, donVi?,
 * nguonGiaTri?, nut, cap, chieu, tatDinh, canCu: {nguonLoai, ma, trich}|null }`. `trich` = đoạn NGUYÊN VĂN của đầu vào (bằng
 * chứng dữ kiện; null khi THIEU); `canCu.trich` = câu trích nguồn luật của ranh giới. Ranh giới CHUA_SO_HOA không có ở đây.
 */
function dsDuKienQuyetDinh(hoSo) {
  const F = DK.chuanDuKien(hoSo.duKien || []);
  const out = []; const daCo = new Set();
  for (const e of hoSo.duongDiPhapLy || []) {
    if (!e || !e.dieuKien || !KET_QUA_DQ.has(e.ketQua)) continue;
    const conds = e.dieuKien.op === 'VA' ? e.dieuKien.cacDieuKien || [] : [e.dieuKien];
    const cham = conds.map((c) => { let r; try { r = DK.danhGiaTrenMap(c, F); } catch { r = { trangThai: 'CHUA_BIET' }; } return { c, t: r.trangThai }; });
    const cap = []; // [cond, ketQua]
    if (e.chieu === 'PHAI_KHONG') {
      if (e.ketQua === 'CO') cham.filter((x) => x.t === 'TRAI').forEach((x) => cap.push([x.c, 'CO']));
      else if (e.ketQua === 'MAU_THUAN') cham.forEach((x) => cap.push([x.c, 'MAU_THUAN']));
      else cham.filter((x) => x.t !== 'THOA').forEach((x) => cap.push([x.c, 'THIEU']));
    } else {
      for (const x of cham) cap.push([x.c, x.t === 'THOA' ? 'CO' : x.t === 'TRAI' ? 'MAU_THUAN' : 'THIEU']);
      // kết quả ranh giới do bảng hiệu chỉnh tiền lệ quyết định (không theo từng điều kiện) ⇒ theo ranh giới
      if (!cap.some(([, k]) => k === e.ketQua)) for (const p of cap) p[1] = e.ketQua;
    }
    if (!cap.length) cham.forEach((x) => cap.push([x.c, e.ketQua]));
    for (const [c, ketQua] of cap) {
      for (const f of [...new Set(factCua(c))].filter((x) => khoaCo(x))) {
        const k = `${f}|${e.nut}`;
        if (daCo.has(k)) continue;
        daCo.add(k);
        const m = F.get(f);
        const coGiaTri = ketQua !== 'THIEU' && m && !m.xungDot;
        out.push({
          fact: f, nhanVi: nhanVi(f), ketQua,
          trich: coGiaTri && m.bangChung != null ? String(m.bangChung) : null,
          ...(coGiaTri ? { giaTri: m.giaTri, ...(m.donVi ? { donVi: m.donVi } : {}), nguonGiaTri: m.nguon || null } : {}),
          nut: e.nut, cap: e.cap, chieu: e.chieu, tatDinh: e.tatDinh !== false,
          canCu: e.nguon ? { nguonLoai: e.nguon.nguonLoai || null, ma: e.nguon.ma || null, trich: e.nguon.trich || null } : null,
        });
      }
    }
  }
  return out;
}

/** Ranh giới MAU_THUAN có căn cứ tất định (xem đầu tệp). `trichBiLoai` = mục bộ viết loại vì trích không nguyên văn. */
function ranhGioiTatDinh(hoSo, trichBiLoai = []) {
  const biLoai = new Set((trichBiLoai || []).map((t) => t && t.nut));
  return (hoSo.duongDiPhapLy || []).filter((e) => e && e.ketQua === 'MAU_THUAN' && e.tatDinh === true && !e.theoHieuChinh
    && e.nguon && NGUON_DUYET.has(e.nguon.nguonLoai) && typeof e.nguon.trich === 'string' && e.nguon.trich.trim() && !biLoai.has(e.nut));
}

function khungNghiNgoCua(hoSo, dq) {
  const kl = hoSo.ketLuan || {};
  if (kl.trangThai !== 'MAU_THUAN') return null;
  const mt = (hoSo.duongDiPhapLy || []).filter((e) => e && e.ketQua === 'MAU_THUAN');
  const maNghiNgo = kl.maTroToi ? nz(kl.maTroToi) : null;
  const dqMt = dq.filter((x) => x.ketQua === 'MAU_THUAN');
  const moTaDuKien = dqMt.map((x) => `${x.nhanVi}${x.trich ? ` ("${x.trich}")` : ''}`).join('; ') || 'dữ kiện trong mô tả';
  const nut = [...new Set(mt.map((e) => fmtMa(e.nut)))].join(', ');
  return {
    maNghiNgo,
    ...(!maNghiNgo && Array.isArray(kl.maCoTheTroToi) && kl.maCoTheTroToi.length ? { maCoTheNghiNgo: kl.maCoTheTroToi.map(nz) } : {}),
    noiDungNghiNgo: `Mô tả khai thể hiện ${moTaDuKien} — trái điều kiện ranh giới ${nut} của mã khai ${fmtMa(hoSo.maHs)}`
      + `${maNghiNgo ? `; dữ kiện này khớp trọn đường đi của dòng ${fmtMa(maNghiNgo)}` : ''}.`,
    tieuChiPhanBiet: mt.map((e) => ({
      nut: e.nut, cap: e.cap, chieu: e.chieu, dieuKien: e.dieuKien,
      duKien: dqMt.filter((x) => x.nut === e.nut).map((x) => ({ fact: x.fact, nhanVi: x.nhanVi, ...(x.trich ? { trich: x.trich } : {}) })),
      canCu: e.nguon ? { nguonLoai: e.nguon.nguonLoai || null, ma: e.nguon.ma || null, trich: e.nguon.trich || null } : null,
      tatDinh: e.tatDinh === true,
    })),
  };
}

/**
 * Mã cạnh tranh + DỮ KIỆN LẬT kết quả, rút từ chính hồ sơ (không tính thêm gì): tín hiệu `maTroToi` / `maCoTheTroToi` và các
 * ranh giới còn THIẾU đã có sẵn ở doiChieu nhưng trước đây chỉ nằm sâu trong `hoSo` / `khungNghiNgo`.
 *   - MAU_THUAN: mỗi mã trỏ tới ⇒ `duKienLat.trangThai = 'DANG_TRAI'` (mô tả hiện ĐÃ khớp mã đó; `hienLa` = câu trích trong mô tả).
 *   - THIEU_DU_KIEN: mỗi dòng 8 số có ranh giới còn thiếu ⇒ `'CHUA_BIET'` (`neuLa` = câu trích điều kiện của dòng đó; phải hỏi).
 * Hiện CẢ HAI chiều thuế (`chenhMfn` = MFN mã cạnh tranh − MFN mã khai, có dấu); không bao giờ gợi ý đổi mô tả để giảm thuế.
 * @returns {Array<{maHs, tenDong, thueMfn, chenhMfn, duKienLat: {fact, nhanVi, neuLa, hienLa, trangThai, nguonHienTai}}>}
 */
function maCanhTranhCua(hoSo, dq) {
  const kl = hoSo.ketLuan || {};
  const maKhai = nz(hoSo.maHs);
  let taxData = {}; let T = null;
  try { ({ taxData } = require('../data')); T = require('../hs-tree'); } catch { /* thiếu biểu ⇒ không có tên/thuế */ }
  const rate = (m) => { const v = String((taxData[m] && taxData[m].mfn) == null ? '' : taxData[m].mfn).replace(/%/g, '').replace(',', '.').trim(); return /^\d+(\.\d+)?$/.test(v) ? Number(v) : null; };
  const cat = (v, n) => { const t = String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };
  const dong = (ma, duKienLat) => {
    const a = rate(maKhai); const b = rate(ma);
    let ten = null; try { ten = (T && T.nodeOf(ma) && T.nodeOf(ma).tenVi) || null; } catch { ten = null; }
    return { maHs: ma, tenDong: ten, thueMfn: b, chenhMfn: a === null || b === null ? null : Number((b - a).toFixed(2)), duKienLat };
  };
  const la8 = (m) => /^\d{8}$/.test(String(m == null ? '' : m)) && String(m) !== maKhai;
  if (kl.trangThai === 'MAU_THUAN') {
    const mt = dq.filter((x) => x.ketQua === 'MAU_THUAN');
    const x = mt.find((y) => y.tatDinh) || mt[0];
    const lat = x ? { fact: x.fact, nhanVi: x.nhanVi, neuLa: cat(`${x.nhanVi}: ${x.giaTri != null ? x.giaTri : x.trich}${x.donVi ? ` ${x.donVi}` : ''}`, 240), hienLa: x.trich != null ? cat(x.trich, 160) : null, trangThai: 'DANG_TRAI', nguonHienTai: x.nguonGiaTri || null } : null;
    return [kl.maTroToi, ...(Array.isArray(kl.maCoTheTroToi) ? kl.maCoTheTroToi : [])].map((m) => (m == null ? '' : String(m))).filter(la8).filter((m, i, a) => a.indexOf(m) === i).map((m) => dong(m, lat));
  }
  if (kl.trangThai === 'THIEU_DU_KIEN') {
    const out = []; const daCo = new Set();
    for (const x of dq.filter((y) => y.ketQua === 'THIEU' && la8(y.nut))) {
      if (daCo.has(x.nut) || out.length >= 5) continue;
      daCo.add(x.nut);
      out.push(dong(String(x.nut), { fact: x.fact, nhanVi: x.nhanVi, neuLa: cat((x.canCu && x.canCu.trich) || `thoả điều kiện của dòng ${fmtMa(x.nut)}`, 240), hienLa: null, trangThai: 'CHUA_BIET', nguonHienTai: null }));
    }
    return out;
  }
  return [];
}

/** dungDuongDi → docDuKien (có hạn) → khungHoSo → doiChieu (có hạn). Trả { hoSo, duKien, buocQuaHan, msBuoc }. */
async function dungHoSo(dv, maHs, quyen, o = {}) {
  const A = api();
  const buocQuaHan = []; const msBuoc = {};
  let t = Date.now();
  const xong = (ten) => { const n = Date.now(); msBuoc[ten] = n - t; t = n; };
  const dd = D.dungDuongDi(maHs, dv.loaiToKhai);
  const dauVao = { tenHang: dv.tenHang, moTa: dv.moTa, thongSo: dv.thongSo, duKien: dv.duKien };
  xong('duongDi');
  let duKien;
  if (o.chiLuat) duKien = await docDuKien(dauVao, dd, { llm: async () => [] });
  else {
    const kq = await A.voiHan(docDuKien(dauVao, dd, { rieng: isPrivate() }), A.hanMs('HS_HO_SO_HAN_DOC_MS', 35000));
    if (kq.quaHan) buocQuaHan.push('docDuKien');
    duKien = kq.ok ? kq.v : await docDuKien(dauVao, dd, { llm: async () => [] });
  }
  // dựng lại trên mã khác (maTroToi): dữ kiện LLM đã đọc ở lượt đầu được dùng lại cho khoá còn CHUA_BIET (không gọi LLM lần hai)
  if (Array.isArray(o.boSung)) {
    for (const b of o.boSung) {
      const i = duKien.findIndex((x) => x && x.fact === b.fact && x.trangThai === 'CHUA_BIET');
      if (i >= 0) duKien[i] = structuredClone(b);
    }
  }
  xong('docDuKien');
  const khung = H.khungHoSo(dd, { duKien, hang: { tenVi: dv.tenHang || null }, nhanDien: dv.nhanDien });
  const RONG = { tinHieuDanhMuc: async () => [], tienLeMaKhac: async () => [], demKhoOz: async () => ({ tong: 0, maKhac: [] }) };
  // chiLuat (K2 độc lập): không tra nguồn tín hiệu ngoài hồ sơ (Postgres QĐ 2079, gói căn cứ) — chỉ chấm ranh giới
  const dcOpts = { moTa: chuDauVao(dauVao), noiBo: quyen.noiBo === true, ...(o.chiLuat ? RONG : A.tinHieuOpts()) };
  const kq = await A.voiHan(doiChieu(khung, dcOpts), A.hanMs('HS_HO_SO_HAN_DOI_CHIEU_MS', 15000));
  if (kq.quaHan) buocQuaHan.push('doiChieu');
  const hoSo = kq.ok ? kq.v : await doiChieu(khung, { ...dcOpts, ...RONG });
  xong('doiChieu');
  return { hoSo, duKien, buocQuaHan, msBuoc };
}

async function vietCoHan(hoSo, buocQuaHan) {
  const A = api();
  const deps = A.layDeps();
  const cheDo = String(process.env.HS_HO_SO_VIET || 'LLM').toUpperCase() === 'MAY' ? 'MAY' : 'LLM';
  const kq = await A.voiHan(vietMoTa(hoSo, { cheDo, rieng: isPrivate(), ...(deps.thamChieu ? { thamChieu: deps.thamChieu } : {}) }), A.hanMs('HS_HO_SO_HAN_VIET_MS', 35000));
  if (kq.quaHan) buocQuaHan.push('viet');
  return { viet: kq.ok ? kq.v : await vietMoTa(hoSo, { cheDo: 'MAY' }), cheDo };
}

/**
 * @param {{maHs:string, moTa:string, thongSo?:string|string[], hoSoId?:string, duKien?:object[], loaiToKhai?:'NHAP'|'XUAT'}} dauVao
 * @param {{noiBo?: boolean, caller?: string|null}} [quyen]
 * @param {{chiLuat?: boolean}} [o]  chiLuat: đọc dữ kiện CHỈ bằng luật + viết bản máy — không lượt LLM nào, không tra tín hiệu ngoài
 *   hồ sơ (K2 độc lập của lib/declaration-check.js). Kết quả thêm `maCanhTranh[]` (maCanhTranhCua) ở mọi chế độ.
 * @returns {Promise<{hoSo:object, duKienQuyetDinh:object[], cauSuaDeXuat:object, coCanCuTatDinh:boolean,
 *   khungNghiNgo:object|null, canPhanLoai:boolean, viet:object, meta:object, so:object}>}  hoSo + viet ĐÃ locTheoQuyen
 * @throws lỗi dungDuongDi (mã không có trong biểu…) — bên gọi rơi về đường cũ
 */
async function soat(dauVao = {}, quyen = {}, o = {}) {
  const chiLuat = o && o.chiLuat === true;
  if (_loiThu) throw _loiThu;
  const t0 = Date.now();
  const A = api();
  const noiBo = quyen && quyen.noiBo === true;
  const c = A.chuanDauVao({
    maHs: dauVao.maHs, loaiToKhai: dauVao.loaiToKhai, moTa: dauVao.moTa,
    thongSo: dauVao.thongSo == null ? [] : [].concat(dauVao.thongSo), duKien: dauVao.duKien, hoSoId: dauVao.hoSoId,
  }, 'em');
  const dv = c.data;
  const lan1 = await dungHoSo(dv, dv.maHs, { noiBo }, chiLuat ? { chiLuat: true } : {});
  const { hoSo } = lan1;
  const buocQuaHan = [...lan1.buocQuaHan];

  const dq = dsDuKienQuyetDinh(hoSo);
  const kl = hoSo.ketLuan || {};
  // trích nguyên văn của ranh giới: bộ viết kiểm lại với tệp nguồn (bản máy, tất định)
  const vietKhaiMay = await vietMoTa(hoSo, { cheDo: 'MAY' });
  const tatDinh = ranhGioiTatDinh(hoSo, vietKhaiMay.trichBiLoai);

  // hồ sơ đã sửa ⇒ câu sửa đề xuất
  let theoMa = 'MA_KHAI'; let hoSoSua = hoSo; let maSua = nz(hoSo.maHs);
  if (kl.trangThai === 'MAU_THUAN' && kl.maTroToi) {
    try {
      const boSung = (lan1.duKien || []).filter((x) => x && x.trangThai === 'DA_CO' && x.docBoi === 'LLM');
      const lan2 = await dungHoSo(dv, nz(kl.maTroToi), { noiBo }, { chiLuat: true, boSung });
      hoSoSua = lan2.hoSo; theoMa = 'MA_TRO_TOI'; maSua = nz(kl.maTroToi);
    } catch { /* dựng trên maTroToi lỗi ⇒ giữ hồ sơ mã khai */ }
  }
  const { viet, cheDo } = chiLuat ? { viet: await vietMoTa(hoSoSua, { cheDo: 'MAY' }), cheDo: 'MAY' } : await vietCoHan(hoSoSua, buocQuaHan);
  const vietLoc = locTheoQuyen(viet, { noiBo });
  const cauSuaDeXuat = {
    maHs: maSua, theoMa,
    trangThaiHoSo: (hoSoSua.ketLuan && hoSoSua.ketLuan.trangThai) || null,
    ...A.khoiMoTa(vietLoc),
  };
  const laThu = A.laLuotThu(quyen);
  return {
    hoSo: locTheoQuyen(hoSo, { noiBo }),
    duKienQuyetDinh: dq,
    cauSuaDeXuat,
    coCanCuTatDinh: tatDinh.length > 0,
    khungNghiNgo: khungNghiNgoCua(hoSo, dq),
    maCanhTranh: maCanhTranhCua(hoSo, dq),
    canPhanLoai: canPhanLoai(hoSo),
    viet: vietLoc,
    meta: {
      apDung: true,
      cheDo: A.cheDoHieuLuc(quyen),
      ...(chiLuat ? { chiLuat: true } : {}),
      ...(laThu ? { thuNoiBo: true } : {}),
      cheDoViet: (viet.kiemTra && viet.kiemTra.cheDoDung) || 'MAY',
      buocQuaHan,
      ...(dv.hoSoIdTruoc ? { hoSoIdTruoc: dv.hoSoIdTruoc, ghiChuHoSoId: 'Bộ não không lưu hồ sơ: luôn dựng lại từ dữ liệu của chính nó; hoSoId bên gọi chỉ được ghi lại để đối chiếu.' } : {}),
      ms: Date.now() - t0,
    },
    // số đo nội bộ cho dòng shadow — declaration-check KHÔNG trả ra
    so: {
      msBuoc: lan1.msBuoc,
      cheDoVietYeuCau: cheDo,
      llmBiLoai: ((viet.kiemTra && viet.kiemTra.viPham) || []).some((x) => String(x).startsWith('llm-bi-loai')),
    },
  };
}

module.exports = { soat, canPhanLoai, dsDuKienQuyetDinh, ranhGioiTatDinh, khungNghiNgoCua, maCanhTranhCua, NGUON_DUYET, _datLoiThu };
