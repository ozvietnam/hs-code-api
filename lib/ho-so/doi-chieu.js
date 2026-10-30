/**
 * lib/ho-so/doi-chieu.js — `doiChieu`: ĐỐI CHIẾU dữ kiện về hàng với đường đi pháp lý (plan L1-5b; spec hồ sơ §8.1
 * duongDiPhapLy[].ketQua / loaiTru[].ketQua / ketLuan / tinHieuRuiRo, §8.3 bước 3, §11).
 *
 * Tất định (không LLM). Đầu vào là hồ sơ do bộ não tự dựng (khungHoSo(dungDuongDi(...))) — không phải hồ sơ bên gọi gửi.
 *   - mỗi mục `duongDiPhapLy` có điều kiện ⇒ CO | THIEU | MAU_THUAN (lib/dieu-kien-so.js#danhGiaTrenMap); `CHUA_SO_HOA` giữ nguyên.
 *     PHAI_KHONG một anh em: ít nhất một điều kiện của anh em TRÁI ⇒ CO; mọi điều kiện THOẢ ⇒ MAU_THUAN; còn lại THIEU.
 *     Ranh giới dựa trên dữ kiện LLM đọc (`docBoi: 'LLM'`) ⇒ `tatDinh: false` (không làm căn cứ LOI).
 *   - bảng hiệu chỉnh tiền lệ (mục gắn từ dungDuongDi): xét `apKhi` trên dữ kiện. `LECH_CHUA_PHAN_XU` áp (apKhi thoả hoặc chưa
 *     biết) ⇒ ranh giới `CHUA_SO_HOA` (lyDo hieu-chinh-lech-chua-phan-xu), `ketLuan.trangThai = CAN_CHUYEN_GIA`, câu hỏi
 *     `PHAN_XU_TIEN_LE` nêu CẢ HAI dòng kèm CẢ HAI nguồn (TB-TCHQ ↔ chữ biểu) + dữ kiện quyết định (`factPhanBiet`) — KHÔNG BAO
 *     GIỜ chọn bên, không `maTroToi`. `TIEN_LE_THAY_CHU_BIEU` áp ⇒ tiền lệ thay chữ biểu trong phạm vi (tatDinh false).
 *   - `ketLuan`: MAU_THUAN (kèm `maTroToi` = dòng anh em DUY NHẤT mà dữ kiện thoả trọn đường đi) > THIEU_DU_KIEN (mã 4/6 số)
 *     > CAN_CHUYEN_GIA (ranh giới chưa số hoá, lệch chưa phân xử, anh em chưa duyệt, chồng lấn văn bản) > THIEU_DU_KIEN
 *     > DU_CAN_CU (chỉ khi mọi ranh giới quyết định CO). `cauHoi[]` Vi + Zh từ tu-vung.cauHoiCho.
 *   - `tinHieuRuiRo` CÔNG KHAI: CHENH_THUE (biểu, ≥ 5 điểm MFN), TIEN_LE_MO_TA_TUONG_TU_MA_KHAC (TB-TCHQ, evidence-pack),
 *     DANH_MUC_RUI_RO (QĐ 2079 — lib/rui-ro-phan-loai.js, nhãn QD_2079_BAC_C, KHÔNG BAO GIỜ chép vào canCu). NỘI BỘ:
 *     MO_TA_GIONG_MA_KHAC (chỉ số đếm kho tờ khai Oz, không câu) — chỉ tính khi `opts.noiBo === true`; locTheoQuyen gỡ lần nữa.
 *   - Nguồn tín hiệu lỗi ⇒ bỏ tín hiệu đó, hồ sơ vẫn dựng. Hàm KHÔNG sửa hồ sơ đầu vào (trả bản sao).
 */
const T = require('../hs-tree');
const DK = require('../dieu-kien-so');
const TV = require('../tu-vung');
const D = require('./duong-di');
const { LY_DO_CHUA_CHOT: LY, taoChuaChot, tachChuaChot } = require('./ly-do');

const NGUONG_CHENH_THUE = 5;
const nz = (v) => String(v == null ? '' : v).replace(/\D/g, '');
const mang = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const factCua = (c) => (!c ? [] : c.op === 'VA' ? (c.cacDieuKien || []).flatMap(factCua) : DK.factCuaDieuKien(c));
const khoaCo = (f) => { try { return TV.layKhoa(f); } catch { return null; } };
const fmtMa = (m) => { const s = nz(m); return s.length === 8 ? `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6)}` : s.length === 6 ? `${s.slice(0, 4)}.${s.slice(4)}` : s; };

// ── Chấm ──────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Chấm một mục đường đi có điều kiện. Trả { ketQua, tatDinh, thieu: fact[], giaTriDocDuoc? }. */
function chamMuc(e, F, llmFacts) {
  const conds = e.dieuKien.op === 'VA' ? e.dieuKien.cacDieuKien || [] : [e.dieuKien];
  const r = conds.map((c) => ({ c, ...DK.danhGiaTrenMap(c, F) }));
  const thieuCua = (xs) => xs.filter((x) => x.trangThai === 'CHUA_BIET').flatMap((x) => factCua(x.c));
  let ketQua; let tatDinh; let thieu = [];
  if (e.chieu === 'PHAI_KHONG') {
    const trai = r.filter((x) => x.trangThai === 'TRAI');
    if (trai.length) { ketQua = 'CO'; tatDinh = trai.some((x) => x.tatDinh); } else if (r.length && r.every((x) => x.trangThai === 'THOA')) { ketQua = 'MAU_THUAN'; tatDinh = r.every((x) => x.tatDinh); } else { ketQua = 'THIEU'; tatDinh = true; thieu = thieuCua(r); }
  } else if (r.length && r.every((x) => x.trangThai === 'THOA')) { ketQua = 'CO'; tatDinh = r.every((x) => x.tatDinh); } else if (r.some((x) => x.trangThai === 'TRAI')) { ketQua = 'MAU_THUAN'; tatDinh = r.filter((x) => x.trangThai === 'TRAI').some((x) => x.tatDinh); } else { ketQua = 'THIEU'; tatDinh = true; thieu = thieuCua(r); }
  if (conds.some((c) => factCua(c).some((f) => llmFacts.has(f)))) tatDinh = false;
  const out = { ketQua, tatDinh: Boolean(tatDinh) && e.tatDinh !== false, thieu };
  if (r.length === 1 && r[0].giaTriDocDuoc !== undefined) out.giaTriDocDuoc = r[0].giaTriDocDuoc;
  return out;
}

/** Phạm vi `apKhi` của một mục hiệu chỉnh trên dữ kiện: true (thoả) | false (trái) | null (chưa biết). Không apKhi ⇒ true. */
function chamApKhi(hc, F) {
  const conds = mang(hc && hc.apKhi);
  if (!conds.length) return { apDung: true, thieu: [] };
  const r = conds.map((c) => ({ c, ...DK.danhGiaTrenMap(c, F) }));
  if (r.some((x) => x.trangThai === 'TRAI')) return { apDung: false, tatDinh: r.filter((x) => x.trangThai === 'TRAI').some((x) => x.tatDinh), thieu: [] };
  if (r.every((x) => x.trangThai === 'THOA')) return { apDung: true, thieu: [] };
  return { apDung: null, thieu: r.filter((x) => x.trangThai === 'CHUA_BIET').flatMap((x) => factCua(x.c)) };
}

/**
 * Chấm cả đường đi (bản sao, sửa tại chỗ): ranh giới + tác động của bảng hiệu chỉnh. Trả { thieu: Map<fact,Set<nut>>,
 * lechApDung: Map<id, {hc, apDung, thieu}>, maTienLe: string|null }.
 */
function chamDuongDi(ma, duongDi, hieuChinhTom, F, llmFacts) {
  const thieu = new Map();
  const ghiThieu = (f, nut) => { if (!thieu.has(f)) thieu.set(f, new Set()); thieu.get(f).add(nut); };
  const apKhi = new Map();
  for (const hc of hieuChinhTom || []) if (hc && hc.id && hc.loai !== 'KHONG_LECH') apKhi.set(hc.id, { hc, ...chamApKhi(hc, F) });
  let maTienLe = null;
  for (const e of duongDi) {
    if (e.ketQua === 'CHUA_SO_HOA' || !e.dieuKien) continue;
    const r = chamMuc(e, F, llmFacts);
    e.ketQua = r.ketQua; e.tatDinh = r.tatDinh;
    if (r.giaTriDocDuoc !== undefined) e.giaTriDocDuoc = r.giaTriDocDuoc;
    for (const f of r.thieu) ghiThieu(f, e.nut);
  }
  for (const e of duongDi) {
    for (const h of e.hieuChinh || []) {
      const a = apKhi.get(h.id) || { hc: h, ...chamApKhi(h, F) };
      if (!apKhi.has(h.id)) apKhi.set(h.id, a);
      h.apDung = a.apDung;
      if (a.apDung === false) continue;
      if (h.loai === 'LECH_CHUA_PHAN_XU') {
        if (e.ketQua !== 'CHUA_SO_HOA') { e.ketQua = 'CHUA_SO_HOA'; e.lyDo = LY.HIEU_CHINH_LECH; }
        e.tatDinh = false;
      } else if (h.loai === 'TIEN_LE_THAY_CHU_BIEU' && e.ketQua !== 'CHUA_SO_HOA') {
        if (a.apDung === true) {
          if (nz(h.maHs) === ma) { e.ketQua = 'CO'; e.theoHieuChinh = h.id; } else if (nz(h.dongChuBieu) === ma && e.chieu === 'PHAI_CO' && e.nut === ma) { e.ketQua = 'MAU_THUAN'; e.theoHieuChinh = h.id; maTienLe = nz(h.maHs); }
          e.tatDinh = false;
        } else if (e.ketQua === 'MAU_THUAN' || (e.ketQua === 'CO' && nz(h.dongChuBieu) === ma)) {
          // phạm vi tiền lệ chưa biết: kết quả theo chữ biểu có thể bị tiền lệ lật ⇒ chưa đủ dữ kiện
          e.ketQua = 'THIEU'; e.tatDinh = false;
          for (const f of a.thieu) ghiThieu(f, e.nut);
        }
      }
    }
  }
  const lechApDung = new Map([...apKhi].filter(([, a]) => a.hc.loai === 'LECH_CHUA_PHAN_XU' && a.apDung !== false));
  for (const [, a] of lechApDung) for (const f of a.thieu) ghiThieu(f, `hieuChinh:${a.hc.id}`);
  return { thieu, lechApDung, maTienLe };
}

/** Một dòng 8 số khác có thoả TRỌN đường đi với dữ kiện này không (ứng viên maTroToi). */
function dongThoaTron(c, loaiToKhai, inj, F, llmFacts) {
  let dd;
  try { dd = D.dungDuongDi(c, loaiToKhai, inj); } catch { return false; }
  const ds = dd.duongDiPhapLy;
  if (!ds.length) return false;
  const r = chamDuongDi(c, ds, dd.hieuChinh, F, llmFacts);
  if (r.lechApDung.size) return false;
  const conLai = (dd.chuaChot || []).filter((x) => tachChuaChot(x).lyDo !== LY.HIEU_CHINH_LECH);
  return !conLai.length && ds.every((e) => e.ketQua === 'CO');
}

function timMaTroToi(h, F, llmFacts, inj) {
  const ma = nz(h.maHs);
  const mt = h.duongDiPhapLy.filter((e) => e.ketQua === 'MAU_THUAN');
  if (!mt.length) return { maTroToi: null, ungVien: [] };
  const nhom4 = mt.find((e) => e.cap === 4 && e.tuLoaiTru);
  if (nhom4 && mt.every((e) => e.cap === 4)) return { maTroToi: nz(nhom4.nut), ungVien: [nz(nhom4.nut)] };
  if (ma.length !== 8) return { maTroToi: null, ungVien: [] };
  const capThap = mt.some((e) => e.cap === 8) ? 6 : 4;
  const tienTo = ma.slice(0, capThap);
  const ungVien = T.tree().codes.filter((c) => c.startsWith(tienTo) && c !== ma && (capThap === 6 || !c.startsWith(ma.slice(0, 6))));
  const thoa = ungVien.filter((c) => dongThoaTron(c, h.loaiToKhai || 'NHAP', inj, F, llmFacts));
  return { maTroToi: thoa.length === 1 ? thoa[0] : null, ungVien: thoa };
}

// ── Câu hỏi ───────────────────────────────────────────────────────────────────────────────────────────────────────
function cauHoiFact(fact, extra = {}) {
  const k = khoaCo(fact);
  if (!k) return null;
  return { fact, nhanVi: k.nhanVi, vi: TV.cauHoiCho(fact, 'vi'), zh: TV.cauHoiCho(fact, 'zh'), ...extra };
}

function cauHoiPhanXu(a, F) {
  const hc = a.hc;
  const soHieu = [...new Set(mang(hc.tbTchq).map((t) => t.soHieu).filter(Boolean))];
  const factPhanBiet = []; const daBiet = [];
  for (const f of mang(hc.factPhanBiet).filter((x) => khoaCo(x))) {
    const m = F.get(f);
    if (m && !m.xungDot) daBiet.push({ fact: f, giaTri: m.giaTri, ...(m.donVi ? { donVi: m.donVi } : {}), bangChung: m.bangChung == null ? null : m.bangChung, nguon: m.nguon });
    else factPhanBiet.push(cauHoiFact(f));
  }
  const hoiPhamVi = [...new Set(a.thieu)].map((f) => cauHoiFact(f)).filter(Boolean);
  const tb = soHieu.join(', ') || 'thông báo phân loại';
  return {
    loai: 'PHAN_XU_TIEN_LE',
    hieuChinhId: hc.id,
    vi: `Phân loại hàng này chưa thống nhất (mục hiệu chỉnh ${hc.id}): ${tb} xếp dòng ${fmtMa(hc.maHs)}; đọc theo chữ biểu thuế, hàng có thể thuộc dòng ${fmtMa(hc.dongChuBieu)}. Hệ thống không tự chọn bên — đề nghị người khai bổ sung dữ kiện để chuyên gia phân xử.`,
    zh: `该商品的归类尚未统一（调整条目 ${hc.id}）：${tb} 归入 ${fmtMa(hc.maHs)}；按税则文字，商品可能归入 ${fmtMa(hc.dongChuBieu)}。系统不自行选择——请申报人补充信息，以便专家裁定。`,
    haiPhuongAn: [
      { maHs: nz(hc.maHs), canCu: { loai: 'TB_TCHQ', tbTchq: mang(hc.tbTchq).map((t) => ({ soHieu: t.soHieu, viTri: t.viTri, trich: t.trich })) } },
      { maHs: nz(hc.dongChuBieu), canCu: { loai: 'CHU_BIEU', chuBieu: mang(hc.chuBieu).map((c) => ({ nguon: c.nguon, trich: c.trich })) } },
    ],
    factPhanBiet: factPhanBiet.filter(Boolean),
    daBiet,
    ...(hoiPhamVi.length ? { hoiPhamVi } : {}),
    ...(hc.lyDo ? { lyDoLech: hc.lyDo } : {}),
    ...(hc.ghiChu ? { ghiChuBang: hc.ghiChu } : {}),
  };
}

// ── Tín hiệu rủi ro ───────────────────────────────────────────────────────────────────────────────────────────────
function rate(v) {
  const s = String(v == null ? '' : v).replace(/%/g, '').replace(',', '.').trim();
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : null;
}
function chenhThue(ma, khac, lyDo) {
  const { taxData } = require('../data');
  const a = rate(taxData[ma] && taxData[ma].mfn); const b = rate(taxData[khac] && taxData[khac].mfn);
  if (a === null || b === null || Math.abs(a - b) < NGUONG_CHENH_THUE) return null;
  return { loai: 'CHENH_THUE', maHs: ma, maKhac: khac, mfnMaHs: a, mfnMaKhac: b, chenh: Number((b - a).toFixed(2)), lyDo, nguon: 'data/tax.json (biểu thuế hiện hành, MFN)', nhan: 'BIEU_THUE' };
}
async function tienLeMacDinh(ma, moTa) {
  const { tienLeOf } = require('../evidence-pack');
  const s = tienLeOf(ma, moTa);
  return (s && s.section && s.section.tienLeMaKhac) || [];
}
async function khoOzMacDinh(ma, moTa) {
  const { searchOzByKeyword } = require('../oz-precedent-search');
  const r = await searchOzByKeyword(moTa, { limit: 30 });
  const dem = new Map();
  for (const it of (r && r.items) || []) {
    const hs = nz(it.hsCode);
    if (it.matchCoverage < 60 || hs.length !== 8 || hs === ma) continue;
    dem.set(hs, (dem.get(hs) || 0) + (Number(it.ozCount) || 1));
  }
  const maKhac = [...dem].sort((x, y) => y[1] - x[1]).map(([maHs, d]) => ({ maHs, dem: d }));
  return { tong: maKhac.reduce((n, m) => n + m.dem, 0), maKhac };
}

async function ganTinHieu(h, alt, opts) {
  const ma = nz(h.maHs);
  const out = Array.isArray(h.tinHieuRuiRo) ? h.tinHieuRuiRo : [];
  // CHENH_THUE theo biểu
  if (ma.length === 8) {
    const thay = new Set();
    for (const [khac, lyDo] of alt) {
      if (!khac || khac.length !== 8 || khac === ma || thay.has(khac)) continue;
      thay.add(khac);
      try { const c = chenhThue(ma, khac, lyDo); if (c) out.push(c); } catch { /* biểu không đọc được ⇒ bỏ */ }
    }
  }
  // DANH_MUC_RUI_RO — QĐ 2079 (công khai, nhãn QD_2079_BAC_C)
  try {
    const RR = require('../rui-ro-phan-loai');
    const ds = await (typeof opts.tinHieuDanhMuc === 'function' ? opts.tinHieuDanhMuc : RR.tinHieuDanhMuc)(ma);
    for (const t of Array.isArray(ds) ? ds : []) {
      if (!t || t.loai !== 'DANH_MUC_RUI_RO') continue;
      out.push({ ...t, nhan: RR.NHAN, ghiChu: t.ghiChu || RR.GHI_CHU }); // nhãn cũ ..._NOI_BO quy về nhãn công khai
    }
  } catch { /* nguồn lỗi ⇒ bỏ */ }
  const moTa = String(opts.moTa || '').trim();
  // TIEN_LE_MO_TA_TUONG_TU_MA_KHAC — TB-TCHQ công khai
  if (moTa && ma.length === 8) {
    try {
      const ds = await (typeof opts.tienLeMaKhac === 'function' ? opts.tienLeMaKhac : tienLeMacDinh)(ma, moTa);
      const tl = (Array.isArray(ds) ? ds : []).filter((t) => t && t.maKetLuan).map((t) => ({ soHieu: t.soHieu || null, maKetLuan: String(t.maKetLuan), ...(t.doTuongTu != null ? { doTuongTu: t.doTuongTu } : {}), ...(t.nguon ? { nguon: t.nguon } : {}) }));
      if (tl.length) out.push({ loai: 'TIEN_LE_MO_TA_TUONG_TU_MA_KHAC', tienLe: tl, nhan: 'TB_TCHQ', ghiChu: 'Tiền lệ có mô tả tương tự nhưng kết luận mã khác — cần giải trình vì sao hàng không giống.' });
    } catch { /* bỏ */ }
  }
  // MO_TA_GIONG_MA_KHAC — NỘI BỘ Oz, chỉ số đếm
  if (opts.noiBo === true && moTa && ma.length === 8) {
    try {
      const r = await (typeof opts.demKhoOz === 'function' ? opts.demKhoOz : khoOzMacDinh)(ma, moTa);
      const tong = Number(r && r.tong) || 0;
      if (tong > 0) out.push({ loai: 'MO_TA_GIONG_MA_KHAC', demKhoOz: tong, maKhac: mang(r.maKhac).filter((m) => m && m.maHs).map((m) => ({ maHs: nz(m.maHs), demKhoOz: Number(m.dem) || 0 })), nguon: 'KHO_TO_KHAI_OZ', nhan: 'NOI_BO_OZ' });
    } catch { /* bỏ */ }
  }
  return out;
}

// ── Cửa vào ───────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * @param {import('./index').HoSoPhanLoai} hoSo hồ sơ bộ não tự dựng (khungHoSo)
 * @param {{soTay?: object|null, bangHieuChinh?: object, moTa?: string, noiBo?: boolean,
 *   tinHieuDanhMuc?: Function, tienLeMaKhac?: Function, demKhoOz?: Function}} [opts]
 *   `soTay`/`bangHieuChinh` — cùng tiêm như khi dựng đường đi (để dò dòng anh em); `moTa` — chữ đầu vào (chỉ dùng tra tiền lệ,
 *   không lưu vào hồ sơ); `noiBo` — khoá nội bộ Oz (ERP) mới tính MO_TA_GIONG_MA_KHAC; ba hàm cuối — tiêm cho test.
 * @returns {Promise<import('./index').HoSoPhanLoai>}
 */
async function doiChieu(hoSo, opts = {}) {
  const h = structuredClone(hoSo);
  const ma = nz(h.maHs);
  const inj = {};
  if (Object.prototype.hasOwnProperty.call(opts, 'soTay')) inj.soTay = opts.soTay;
  if (Object.prototype.hasOwnProperty.call(opts, 'bangHieuChinh')) inj.bangHieuChinh = opts.bangHieuChinh;
  const duKien = Array.isArray(h.duKien) ? h.duKien : [];
  const F = DK.chuanDuKien(duKien);
  const llmFacts = new Set(duKien.filter((d) => d && d.docBoi === 'LLM' && d.trangThai === 'DA_CO').map((d) => d.fact));
  h.duongDiPhapLy = Array.isArray(h.duongDiPhapLy) ? h.duongDiPhapLy : [];

  const { thieu, lechApDung, maTienLe } = chamDuongDi(ma, h.duongDiPhapLy, h.hieuChinh, F, llmFacts);
  for (const t of mang(h.hieuChinh)) if (t && t.loai !== 'KHONG_LECH') t.apDung = chamApKhi(t, F).apDung;

  // loaiTru
  for (const lt of h.loaiTru || []) {
    if (!lt.dieuKienKhongThoa) continue;
    const c = lt.dieuKienKhongThoa.length === 1 ? lt.dieuKienKhongThoa[0] : { op: 'VA', cacDieuKien: lt.dieuKienKhongThoa };
    const r = chamMuc({ chieu: 'PHAI_KHONG', dieuKien: c }, F, llmFacts);
    lt.ketQua = r.ketQua === 'CO' ? 'DA_LOAI' : 'CHUA_LOAI';
    if (r.ketQua === 'MAU_THUAN') lt.trungDieuKien = true;
  }

  // chuaChot sau đối chiếu
  const chuaChot = new Set(mang(h.chuaChot).filter((x) => {
    const { lyDo, ma: id } = tachChuaChot(x);
    return !(lyDo === LY.HIEU_CHINH_LECH && Array.isArray(h.hieuChinh) && h.hieuChinh.some((t) => t.id === id) && !lechApDung.has(id));
  }));
  for (const id of lechApDung.keys()) chuaChot.add(taoChuaChot(LY.HIEU_CHINH_LECH, id));
  if (ma.length === 8 && !h.duongDiPhapLy.length && !chuaChot.size) chuaChot.add(taoChuaChot(LY.CHUA_SO_HOA, ma.slice(0, 6))); // không ranh giới nào để đối chiếu ⇒ không tô hồng

  // maTroToi — chỉ khi MAU_THUAN và KHÔNG có lệch chưa phân xử (không bao giờ chọn bên)
  const ds = h.duongDiPhapLy;
  const coMauThuan = ds.some((e) => e.ketQua === 'MAU_THUAN');
  let maTroToi = null; let ungVien = [];
  if (coMauThuan && !lechApDung.size) {
    if (maTienLe) { maTroToi = maTienLe; ungVien = [maTienLe]; } else ({ maTroToi, ungVien } = timMaTroToi(h, F, llmFacts, inj));
  }

  let trangThai;
  if (coMauThuan) trangThai = 'MAU_THUAN';
  else if (ma.length < 8) trangThai = 'THIEU_DU_KIEN';
  else if (lechApDung.size || chuaChot.size || ds.some((e) => e.ketQua === 'CHUA_SO_HOA')) trangThai = 'CAN_CHUYEN_GIA';
  else if (ds.some((e) => e.ketQua === 'THIEU')) trangThai = 'THIEU_DU_KIEN';
  else trangThai = 'DU_CAN_CU';

  // câu hỏi
  const goiYAi = new Map(duKien.filter((d) => d && d.nguon === 'AI_CHUA_KIEM' && d.giaTri != null).map((d) => [d.fact, d.giaTri]));
  const cauHoi = [];
  for (const [f, nut] of thieu) {
    const q = cauHoiFact(f, {
      vaoRanhGioi: [...nut].filter((x) => !String(x).startsWith('hieuChinh:')),
      ...([...nut].some((x) => String(x).startsWith('hieuChinh:')) ? { vaoHieuChinh: [...nut].filter((x) => String(x).startsWith('hieuChinh:')).map((x) => x.slice(10)) } : {}),
      ...(F.get(f) && F.get(f).xungDot ? { lyDo: 'du-kien-trai-nhau' } : {}),
      ...(goiYAi.has(f) ? { goiY: { giaTri: goiYAi.get(f), nguonLoai: 'AI_CHUA_KIEM' } } : {}),
    });
    if (q) cauHoi.push(q);
  }
  const phanXu = [...lechApDung.values()].map((a) => cauHoiPhanXu(a, F));
  for (const px of phanXu) {
    for (const q of px.factPhanBiet) if (!cauHoi.some((x) => x.fact === q.fact)) cauHoi.push({ ...q, vaoHieuChinh: [px.hieuChinhId] });
  }
  cauHoi.push(...phanXu);

  h.ketLuan = {
    trangThai,
    cauHoi,
    chuaChot: [...chuaChot],
    ...(trangThai === 'MAU_THUAN' && maTroToi ? { maTroToi } : {}),
    ...(trangThai === 'MAU_THUAN' && !maTroToi && ungVien.length > 1 ? { maCoTheTroToi: ungVien } : {}),
  };

  const alt = [];
  if (maTroToi) alt.push([nz(maTroToi), 'MAU_THUAN']);
  for (const c of ungVien) alt.push([nz(c), 'MAU_THUAN']);
  for (const px of phanXu) for (const p of px.haiPhuongAn) alt.push([p.maHs, 'HIEU_CHINH_LECH']);
  for (const c of mang(h.chongLanVanBan)) alt.push([nz(c.voi), 'CHONG_LAN_VAN_BAN']);
  h.tinHieuRuiRo = await ganTinHieu(h, alt, opts);
  return h;
}

module.exports = { doiChieu, chamMuc, chamApKhi, NGUONG_CHENH_THUE };
