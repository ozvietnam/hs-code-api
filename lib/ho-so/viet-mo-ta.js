/**
 * lib/ho-so/viet-mo-ta.js — `vietMoTa`: bộ viết SÁU KHỐI mô tả khai báo từ hồ sơ phân loại (plan L1-5c; spec hồ sơ §8.4, §8.6, §8.10,
 * §10; quyết định người điều phối sau L1-5b). Hàm THUẦN với hồ sơ (không sửa đầu vào), không ghi gì, không nối endpoint (L1-5d).
 *
 * Sáu khối: `moTaEcus` (≤ 200 ký tự — giới hạn ô của hệ thống), `khaiTiepHys` (phần không vừa ô, căn cứ citeChiTieu('1.68.luuY.hys')),
 * `ghiChu` (chỉ khi luật định: mẫu citeChiTieu('1.68.8')), `moTaDayDu` (không viết tắt), `bangGiaiTrinh[]`, `taiLieuKyThuatNenKem[]`.
 *
 * Thứ tự cụm trong chuỗi (spec §8.4): (1) tên hàng → (2) dữ kiện quyết định cấp 4/6/8 → (3) mệnh đề loại trừ còn cần → (4) kích thước +
 * thông số bắt buộc → (5) nhận diện (nhãn hiệu CHỈ tờ khai nhập; model/ký mã hiệu; NSX; quy cách đóng gói) → (6) tình trạng.
 *   - Mọi cụm viết từ GIÁ TRỊ THẬT của hàng (duKien đã đọc, khuôn tu-vung#vietCum) — không bao giờ chép chữ biểu thuế. Ranh giới
 *     PHAI_KHONG (dòng anh em, "Loại khác", nhóm cạnh tranh) viết thành sự thật về hàng: giá trị làm điều kiện của anh em TRÁI
 *     (vd "dòng điện 32A", "chưa gắn đầu nối"), không bao giờ "không gồm …".
 *   - Giá trị nguồn AI_CHUA_KIEM không vào chuỗi (DK.chuanDuKien đã bỏ) — chỉ thành câu hỏi/gợi ý.
 *   - Nén: viết tắt chuẩn (DANH_MUC_VIET_TAT qua khuôn viTat của tu-vung) ngay từ đầu cho ô ECUS; đơn vị ghi một lần ở cuối số
 *     (vietCum). Vượt 200 ⇒ chuyển cụm sang khaiTiepHys theo thứ tự cắt (4) → (6) → (5) → (3) → (2); tên hàng không bao giờ chuyển;
 *     sau đó đưa lại cụm nhỏ nào vừa. KHÔNG bỏ dữ kiện.
 *   - `kiemTra.tuongDuong`: mọi cụm mục 1–4 có mặt trong moTaEcus ∪ khaiTiepHys, đọc ngược qua tu-vung ra đúng giá trị.
 *
 * Bản nháp (Review Focus 4): `ketLuan.trangThai !== 'DU_CAN_CU'`, tờ khai XUAT (khuôn 2.69 chưa làm ở lát 1), còn ranh giới chưa CO,
 * trích không nguyên văn, thiếu tên hàng, hoặc máy chặn chữ cấm ⇒ `banNhap: true`, `moTaEcus`/`khaiTiepHys`/`moTaDayDu` = null,
 * `moTaBanNhap` có chỗ trống "[cần: <nhãn Việt>]", `cauHoi[]` ở cấp trên cùng. Không bao giờ trình bản nháp như bản đạt.
 *
 * Căn cứ: trích ranh giới lấy từ `duongDiPhapLy[].nguon` và được KIỂM LẠI nguyên văn với tệp nguồn (sổ tay/biểu thuế/chú giải);
 * trích sai ⇒ bỏ căn cứ, ghi `trichBiLoai` (không mang câu trích), chuyển bản nháp. Chỉ tiêu tờ khai CHỈ qua lib/legal-basis.js
 * (citeChiTieu). Không gắn nhãn GIR ở đây (luật 6) — GIR nằm ở hoSo.canCu do doiChieu tính qua lib/gir.js.
 *
 * `cheDo: 'MAY'` (mặc định): không LLM. `cheDo: 'LLM'`: LLM chỉ viết lại phần ô ECUS cho tự nhiên TỪ DANH SÁCH CỤM ĐÃ KIỂM; máy kiểm
 * lại (đủ dữ kiện, không giá trị lạ, không lệch giá trị, ≤ 200, không chữ cấm, không chép câu Oz — Jaccard token ≥ 0,8) — trượt ⇒
 * bản MAY + `kiemTra.viPham` ghi `llm-bi-loai:<lý do>`. `rieng: true` (khoá dịch vụ) ⇒ lời gọi LLM trong withPrivateData; câu Oz
 * tham chiếu (lib/ho-so/tham-chieu.js) chỉ xin và chỉ đưa vào LLM khi lượt riêng tư, không bao giờ trả ra.
 */
const T = require('../hs-tree');
const DK = require('../dieu-kien-so');
const TV = require('../tu-vung');
const LB = require('../legal-basis');
const S = require('../so-tay');
const HC = require('./hieu-chinh');
const D = require('./duong-di');
const TC = require('./tham-chieu');
const { withPrivateData, isPrivate } = require('../llm-privacy');

const GIOI_HAN_ECUS = 200; // giới hạn ô của hệ thống (KHÔNG phải chữ TT 121 — xem legal-basis.js)
const GIOI_HAN_GHI_CHU = 100; // phần "Lưu ý" chỉ tiêu 1.68 (citeChiTieu('1.68.luuY.100kyTu'))
const NGUONG_JACCARD_OZ = 0.8;
const MAX_MA_RE = 10;
const NHOM = { TEN_HANG: 1, DU_KIEN_QUYET_DINH: 2, LOAI_TRU: 3, KICH_THUOC_THONG_SO: 4, NHAN_DIEN: 5, TINH_TRANG: 6 };
const THU_TU_CAT = ['KICH_THUOC_THONG_SO', 'TINH_TRANG', 'NHAN_DIEN', 'LOAI_TRU', 'DU_KIEN_QUYET_DINH'];
const NHAN_BAN_NHAP = 'BẢN NHÁP — hồ sơ chưa đủ căn cứ, không dùng để khai. Trả lời câu hỏi rồi dựng lại.';
const MAU_CHU_BIEU = [
  { id: 'cac-loai', re: /^\s*(các|những) loại/iu },
  { id: 'hoac', re: /(^|[^\p{L}])hoặc([^\p{L}]|$)/iu },
  { id: 'ke-ca', re: /(^|[^\p{L}])kể cả([^\p{L}]|$)/iu },
  { id: 'khong-gom', re: /(^|[^\p{L}])không gồm([^\p{L}]|$)/iu },
];
const RE_XUAT_XU = /xuất xứ/iu;
const RE_BO_XUAT_XU = /[,;]?\s*(?:hàng\s+)?xuất xứ\s*:?[^,;.]*/giu;
const RE_KHOA_ANH = /(?<![\p{L}\p{N}])(?:[a-z]+[A-Z][A-Za-z0-9]*|[A-Za-z0-9]+_[A-Za-z0-9_]+)(?![\p{L}\p{N}])/gu;

const nz = (v) => String(v == null ? '' : v).replace(/\D/g, '');
const chuan = (s) => String(s == null ? '' : s).normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
const clone = (x) => (x == null ? x : structuredClone(x));
const khoaCo = (f) => { try { return TV.layKhoa(f); } catch { return null; } };
const factCua = (c) => (!c ? [] : c.op === 'VA' ? (c.cacDieuKien || []).flatMap(factCua) : DK.factCuaDieuKien(c));
const fmtMa = (m) => { const s = nz(m); return s.length === 8 ? `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6)}` : s.length === 6 ? `${s.slice(0, 4)}.${s.slice(4)}` : s; };
const viHoa = (s) => { const t = String(s || '').trim(); return t ? t[0].toLocaleUpperCase('vi') + t.slice(1) : t; };
const noi = (ds) => ds.filter(Boolean).join(', ');
let _tuVungKhoa = null;
const tuVungKhoa = () => (_tuVungKhoa || (_tuVungKhoa = new Set(TV.taiTuVung().khoa.map((k) => k.khoa))));

// ── Căn cứ ──────────────────────────────────────────────────────────────────────────────────────────────────────
function canCuLuat(id) {
  const c = LB.citeChiTieu(id);
  return { trich: c.trich, nguon: { vanBan: c.vanBan, chiTieu: c.id, tham_chieu: c.tham_chieu, trang: c.trang } };
}
const _src = new Map();
function nguonNhom(h4) {
  if (!_src.has(h4)) { let v = {}; try { v = { ...S.sourcesFor(h4), ...S.nguonTieuDe(h4) }; } catch { v = {}; } _src.set(h4, v); }
  return _src.get(h4);
}
/** Trích của một mục đường đi có nguyên văn trong tệp nguồn của chính nó không. */
function trichThat(nguon, h4) {
  if (!nguon || typeof nguon.trich !== 'string' || !nguon.trich.trim() || !nguon.ma) return false;
  return HC.coNguyenVan(nguon.trich, nguonNhom(h4)[nguon.ma] || '');
}

// ── Vì sao bắt buộc: mã người đọc rẽ sang nếu thiếu cụm ─────────────────────────────────────────────────────────
function maReCua(e, hoSo) {
  const ma = nz(hoSo.maHs);
  let ds = [];
  try {
    if (e.tuLoaiTru) {
      const lt = (hoSo.loaiTru || []).find((x) => x.ma === e.nut);
      ds = lt ? [...(lt.lyDoTrung && lt.lyDoTrung.ma) || [], ...(lt.nguonKhac || []).map((x) => x.maGoc)] : [];
      if (!ds.length) ds = [e.nut];
    } else if (e.cap === 6) {
      ds = [...new Set(T.tree().codes.filter((c) => c.startsWith(ma.slice(0, 4)) && !c.startsWith(ma.slice(0, 6))).map((c) => c.slice(0, 6)))];
    } else if (e.chieu === 'PHAI_KHONG') {
      ds = D.laDuoi(e.nut);
    } else {
      const cha = T.chaTang(e.nut);
      const anhEm = cha ? (T.conTang(cha) || []).filter((x) => x !== e.nut) : [];
      ds = anhEm.flatMap((x) => D.laDuoi(x));
    }
  } catch { ds = []; }
  return [...new Set(ds.map(String))].filter((x) => nz(x) !== ma).slice(0, MAX_MA_RE);
}
const lyDoRe = (maRe) => (maRe.length ? `Thiếu cụm này thì người đọc không loại được ${maRe.map(fmtMa).join(', ')}.` : 'Dữ kiện quyết định của ranh giới trên đường đi pháp lý.');

// ── Cụm ─────────────────────────────────────────────────────────────────────────────────────────────────────────
function giaTriCua(F, fact) {
  const m = F.get(fact);
  return m && !m.xungDot ? m : null;
}
function cumGiaTri(fact, m) {
  const cum = TV.vietCum(fact, m.giaTri);
  if (cum == null) return null;
  return { cum, cumTat: TV.vietCum(fact, m.giaTri, { tat: true }) || cum };
}
function nguonGiaTriCua(fact, m) {
  return m ? { fact, nguon: m.nguon || null, bangChung: m.bangChung == null ? null : m.bangChung, ...(m.docBoi ? { docBoi: m.docBoi } : {}) } : null;
}
const choTrong = (fact) => { const k = khoaCo(fact); return `[cần: ${k ? k.nhanVi : 'dữ kiện'}]`; };

/**
 * Dựng danh sách cụm theo sáu nhóm. Trả { cum[], ghiChuRanhGioi[], trichBiLoai[], chan[], thieuThongSoKiemHoa[], khongVietDuoc[], daBo[] }.
 */
function dungCum(hoSo) {
  const ma = nz(hoSo.maHs); const h4 = ma.slice(0, 4);
  const F = DK.chuanDuKien(hoSo.duKien);
  const nhap = hoSo.loaiToKhai !== 'XUAT';
  const cum = []; const theoFact = new Map();
  const trichBiLoai = []; const chan = []; const khongVietDuoc = []; const daBo = [];
  const them = (c) => { c.thuTu = cum.length; cum.push(c); if (c.fact) theoFact.set(c.fact, c); return c; };

  // (1) tên hàng
  let ten = String((hoSo.hang && hoSo.hang.tenVi) || '').normalize('NFC').trim();
  if (RE_XUAT_XU.test(ten)) { ten = ten.replace(RE_BO_XUAT_XU, '').replace(/[\s,;]+$/, '').trim(); daBo.push('xuat-xu'); }
  const tenLoai = giaTriCua(F, 'tenLoai');
  const tenTuKhach = Boolean(ten);
  if (!ten && tenLoai) ten = viHoa(tenLoai.giaTri);
  const cTen = them({
    vaiTro: 'TEN_HANG', fact: null, cum: ten || choTrong('tenLoai'), cumTat: ten || choTrong('tenLoai'), choTrong: !ten,
    canCu: canCuLuat('1.78.luuY.tenHang'), canCuThem: [], viSaoBatBuoc: { maRe: [], lyDo: 'Tên hàng là nội dung bắt buộc đầu tiên của mô tả.' },
    nguonGiaTri: tenTuKhach ? { fact: null, nguon: 'KHACH', bangChung: null } : nguonGiaTriCua('tenLoai', tenLoai),
  });
  if (!ten) chan.push('thieu-ten-hang');

  // (2)(3) ranh giới trên đường đi
  for (const e of hoSo.duongDiPhapLy || []) {
    if (!e || !e.dieuKien || e.ketQua === 'CHUA_SO_HOA') continue;
    const vaiTro = e.tuLoaiTru ? 'LOAI_TRU' : 'DU_KIEN_QUYET_DINH';
    let facts;
    if (e.chieu === 'PHAI_KHONG') {
      const conds = e.dieuKien.op === 'VA' ? e.dieuKien.cacDieuKien || [] : [e.dieuKien];
      const cham = conds.map((c) => ({ c, r: DK.danhGiaTrenMap(c, F) }));
      const trai = cham.filter((x) => x.r.trangThai === 'TRAI');
      facts = (trai.length ? trai : cham).flatMap((x) => factCua(x.c));
    } else facts = factCua(e.dieuKien);
    const coThat = trichThat(e.nguon, h4);
    if (!coThat) {
      trichBiLoai.push({ nut: e.nut, ma: e.nguon ? e.nguon.ma : null, lyDo: 'trich-khong-nguyen-van' });
      chan.push(`trich-khong-nguyen-van:${e.nut}`);
    }
    const canCu = coThat ? { trich: e.nguon.trich, nguon: { nguonLoai: e.nguon.nguonLoai, ma: e.nguon.ma, nut: e.nut, cap: e.cap } } : null;
    const maRe = maReCua(e, hoSo);
    for (const f of [...new Set(facts)].filter((x) => khoaCo(x))) {
      const lyDo = { maRe, lyDo: e.tuLoaiTru ? `Loại trừ nhóm cạnh tranh ${fmtMa(e.nut)}. ${lyDoRe(maRe)}` : lyDoRe(maRe) };
      if (f === 'tenLoai') {
        // danh từ tên hàng: gắn căn cứ vào cụm tên (khi tên khách khai chứa giá trị tenLoai), không thì cụm riêng
        if (tenLoai && ten && chuan(ten).includes(chuan(tenLoai.giaTri))) {
          if (canCu) cTen.canCuThem.push(canCu);
          cTen.viSaoBatBuoc = { maRe: [...new Set([...cTen.viSaoBatBuoc.maRe, ...maRe])].slice(0, MAX_MA_RE), lyDo: `Tên hàng là nội dung bắt buộc đầu tiên của mô tả; tên loại hàng còn là dữ kiện quyết định. ${lyDoRe(maRe)}` };
          continue;
        }
      }
      const co = theoFact.get(f);
      if (co) {
        if (canCu && !co.canCu) co.canCu = canCu;
        else if (canCu && !(co.canCu.trich === canCu.trich && co.canCu.nguon.nut === canCu.nguon.nut)) co.canCuThem.push(canCu);
        co.viSaoBatBuoc.maRe = [...new Set([...co.viSaoBatBuoc.maRe, ...maRe])].slice(0, MAX_MA_RE);
        if (vaiTro === 'LOAI_TRU' && co.vaiTro !== 'LOAI_TRU') (co.cungLoaiTru || (co.cungLoaiTru = [])).push(e.nut);
        continue;
      }
      const m = giaTriCua(F, f);
      const w = m ? cumGiaTri(f, m) : null;
      if (m && !w) { khongVietDuoc.push(f); continue; }
      them({
        vaiTro, fact: f, giaTri: m ? m.giaTri : null, cum: w ? w.cum : choTrong(f), cumTat: w ? w.cumTat : choTrong(f), choTrong: !m,
        canCu, canCuThem: [], viSaoBatBuoc: lyDo, nguonGiaTri: nguonGiaTriCua(f, m),
      });
    }
  }

  // ghi chú: nhóm cạnh tranh có điểm trùng mà CHƯA có ranh giới duyệt — không chặn DU_CAN_CU nhưng không bao giờ im lặng
  const ghiChuRanhGioi = (hoSo.loaiTru || []).filter((lt) => lt && !lt.dieuKienKhongThoa).map((lt) => ({
    cum: null, vaiTro: 'GHI_CHU_RANH_GIOI', viTri: 'KHONG_VIET', ma: lt.ma,
    ghiChu: `chưa số hoá ranh giới với nhóm ${fmtMa(lt.ma)} — chưa có căn cứ đã duyệt để viết mệnh đề loại trừ; người khai tự rà`,
    viSaoBatBuoc: { maRe: [...new Set([...(lt.lyDoTrung && lt.lyDoTrung.ma) || [], ...(lt.nguonKhac || []).map((x) => x.maGoc)])].slice(0, MAX_MA_RE), lyDo: 'Nhóm cạnh tranh có điểm trùng điều kiện vào (cặp dễ nhầm / mã thay thế).' },
    canCu: null, nguonGiaTri: lt.lyDoTrung ? { nguon: lt.lyDoTrung.nguon, nguonLoai: lt.lyDoTrung.nguonLoai } : null,
  }));

  // (4) kích thước + thông số bắt buộc
  const thieuThongSoKiemHoa = [];
  for (const k of hoSo.kiemHoa || []) {
    if (!k || !k.fact || theoFact.has(k.fact) || !khoaCo(k.fact)) continue;
    const m = giaTriCua(F, k.fact);
    if (!m) { thieuThongSoKiemHoa.push(k.fact); continue; }
    const w = cumGiaTri(k.fact, m);
    if (!w) { khongVietDuoc.push(k.fact); continue; }
    them({
      vaiTro: 'KICH_THUOC_THONG_SO', fact: k.fact, giaTri: m.giaTri, ...w, canCu: canCuLuat('1.78.1'), canCuThem: [],
      viSaoBatBuoc: { maRe: [], lyDo: k.lyDo === 'kich-thuoc-kiem-hoa' ? 'Kích thước phục vụ kiểm hoá.' : 'Thông số kỹ thuật bắt buộc của nhóm hàng.' },
      nguonGiaTri: nguonGiaTriCua(k.fact, m),
    });
  }

  // (5) nhận diện
  const nd = hoSo.nhanDien || {};
  for (const f of [...(nhap ? ['nhanHieu'] : []), 'model', 'kyMaHieu', 'nhaSanXuat']) {
    if (theoFact.has(f)) continue;
    const m = giaTriCua(F, f) || (nd[f] && khoaCo(f) ? { giaTri: String(nd[f]), nguon: 'NHAN_DIEN', bangChung: null } : null);
    if (!m) continue;
    const w = cumGiaTri(f, m);
    if (!w) continue;
    them({ vaiTro: 'NHAN_DIEN', fact: f, giaTri: m.giaTri, ...w, canCu: canCuLuat('1.78.1'), canCuThem: [], viSaoBatBuoc: { maRe: [], lyDo: 'Nhận diện hàng (nhãn hiệu, model, ký mã hiệu, nhà sản xuất).' }, nguonGiaTri: nguonGiaTriCua(f, m) });
  }
  if (nd.quyCachDongGoi && String(nd.quyCachDongGoi).trim()) {
    const v = `quy cách đóng gói ${String(nd.quyCachDongGoi).trim()}`;
    them({ vaiTro: 'NHAN_DIEN', fact: null, giaTri: String(nd.quyCachDongGoi).trim(), cum: v, cumTat: v, canCu: canCuLuat('1.78.1'), canCuThem: [], viSaoBatBuoc: { maRe: [], lyDo: 'Quy cách đóng gói.' }, nguonGiaTri: { fact: null, nguon: 'NHAN_DIEN', bangChung: null } });
  }
  // (6) tình trạng
  const tt = giaTriCua(F, 'tinhTrang');
  if (tt && !theoFact.has('tinhTrang')) {
    const w = cumGiaTri('tinhTrang', tt);
    if (w) them({ vaiTro: 'TINH_TRANG', fact: 'tinhTrang', giaTri: tt.giaTri, ...w, canCu: canCuLuat('1.78.1'), canCuThem: [], viSaoBatBuoc: { maRe: [], lyDo: 'Tình trạng hàng (quy cách phẩm chất).' }, nguonGiaTri: nguonGiaTriCua('tinhTrang', tt) });
  }

  cum.sort((a, b) => NHOM[a.vaiTro] - NHOM[b.vaiTro] || a.thuTu - b.thuTu);
  return { cum, F, ghiChuRanhGioi, trichBiLoai, chan, thieuThongSoKiemHoa, khongVietDuoc: [...new Set(khongVietDuoc)], daBo };
}

// ── Kiểm chữ ────────────────────────────────────────────────────────────────────────────────────────────────────
/** Giá trị khách/nhận diện được phép mang dạng camelCase/snake_case (model, ký mã hiệu…) — che trước khi dò khoá tiếng Anh. */
function giaTriDuocPhep(hoSo) {
  const out = [];
  for (const d of hoSo.duKien || []) if (d && d.giaTri != null && d.nguon !== 'AI_CHUA_KIEM') for (const v of [].concat(d.giaTri)) if (typeof v === 'string') out.push(v);
  for (const v of Object.values(hoSo.nhanDien || {})) if (typeof v === 'string') out.push(v);
  return out.filter((v) => v.trim().length >= 2).sort((a, b) => b.length - a.length);
}
/** Vi phạm chữ của MỘT chuỗi ra (máy chặn). */
function viPhamChu(text, hoSo, duocPhep = giaTriDuocPhep(hoSo)) {
  const out = [];
  const t = String(text || '');
  if (!t) return out;
  for (const m of MAU_CHU_BIEU) if (m.re.test(t)) out.push(`mau-chu-bieu-thue:${m.id}`);
  if (RE_XUAT_XU.test(t)) out.push('xuat-xu');
  let che = t;
  for (const v of duocPhep) che = che.split(v).join(' ');
  const khoaTv = tuVungKhoa();
  for (const m of t.matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)) if (khoaTv.has(m[0]) && /[A-Z_]/.test(m[0])) out.push(`khoa-tieng-anh:${m[0]}`);
  for (const m of che.matchAll(RE_KHOA_ANH)) out.push(`khoa-tieng-anh:${m[0]}`);
  // giá trị AI_CHUA_KIEM (fact không có giá trị nguồn khác) không được lọt vào chuỗi
  const F = DK.chuanDuKien(hoSo.duKien);
  for (const d of hoSo.duKien || []) {
    if (!d || d.nguon !== 'AI_CHUA_KIEM' || d.giaTri == null || F.has(d.fact) || !khoaCo(d.fact)) continue;
    const w = cumGiaTri(d.fact, d);
    if (w && (chuan(t).includes(chuan(w.cum)) || chuan(t).includes(chuan(w.cumTat)))) out.push(`gia-tri-ai-chua-kiem:${d.fact}`);
  }
  return [...new Set(out)];
}

const bangGiaTri = (k, a, b) => {
  if (a == null || b == null) return false;
  if (k.kieu === 'TEN_LOAI' || k.kieu === 'CONG_DUNG') return chuan(a) === chuan(b);
  if (k.kieu === 'CHAT_LIEU_THEO_VI_TRI') return JSON.stringify([].concat(a).map((x) => [x.viTri, chuan(x.chatLieu)]).sort()) === JSON.stringify([].concat(b).map((x) => [x.viTri, chuan(x.chatLieu)]).sort());
  return JSON.stringify(a) === JSON.stringify(b);
};
/** Một cụm có mặt trong chữ không: { co, lech } — đọc ngược qua tu-vung khi khoá đọc được, không thì dò cụm nguyên văn. */
function cumCoTrong(c, text) {
  const t = chuan(text);
  const coChu = Boolean(c.cum && (t.includes(chuan(c.cum)) || t.includes(chuan(c.cumTat))));
  if (!c.fact) return { co: coChu, lech: false };
  const k = khoaCo(c.fact);
  let r = null; try { r = TV.docGiaTri(c.fact, text); } catch { r = null; }
  const docDuoc = Boolean(r && r.trangThai === 'DA_CO');
  const dung = docDuoc && bangGiaTri(k, r.giaTri, c.giaTri);
  return { co: dung || (coChu && !(docDuoc && !dung)), lech: docDuoc && !dung, docDuoc };
}

/**
 * Hai bản tương đương: mọi cụm mục 1–4 (tên hàng, dữ kiện quyết định, loại trừ, kích thước/thông số) có mặt trong moTaEcus ∪
 * khaiTiepHys và đọc ngược qua tu-vung ra ĐÚNG giá trị đã kiểm.
 * @param {object[]} cumDaKiem  kết quả vietMoTa().cumDaKiem
 */
function kiemTuongDuong(cumDaKiem, moTaEcus, khaiTiepHys) {
  const text = [moTaEcus, khaiTiepHys].filter(Boolean).join(', ');
  const thieu = []; const lech = [];
  for (const c of cumDaKiem || []) {
    if (!c || c.nhom > 4 || c.choTrong) continue;
    const r = cumCoTrong(c, text);
    if (r.lech) lech.push(c.fact || c.vaiTro);
    else if (!r.co) thieu.push(c.fact || c.vaiTro);
  }
  return { tuongDuong: !thieu.length && !lech.length, thieu, lech };
}

// ── Xếp vào ô ECUS / HYS ────────────────────────────────────────────────────────────────────────────────────────
function xepO(cum) {
  let trong = [...cum]; const ra = [];
  const dai = (ds) => noi(ds.map((c) => c.cumTat)).length;
  for (const v of THU_TU_CAT) {
    for (const c of trong.filter((x) => x.vaiTro === v).reverse()) {
      if (dai(trong) <= GIOI_HAN_ECUS) break;
      trong = trong.filter((x) => x !== c); ra.push(c);
    }
  }
  // đưa lại cụm nào còn vừa (giữ thứ tự gốc)
  for (const c of [...ra].sort((a, b) => cum.indexOf(a) - cum.indexOf(b))) {
    const thu = [...trong, c].sort((a, b) => cum.indexOf(a) - cum.indexOf(b));
    if (dai(thu) <= GIOI_HAN_ECUS) { trong = thu; ra.splice(ra.indexOf(c), 1); }
  }
  ra.sort((a, b) => cum.indexOf(a) - cum.indexOf(b));
  return { trong, ra, vua: dai(trong) <= GIOI_HAN_ECUS };
}

// ── LLM ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const SYSTEM = `Bạn biên tập câu MÔ TẢ HÀNG HÓA trên tờ khai hải quan nhập khẩu Việt Nam cho tự nhiên, gọn.
Bạn chỉ được dùng các CỤM ĐÃ KIỂM được đưa: không thêm, không bớt, không đổi bất kỳ số, đơn vị, tên, giá trị nào. Có thể đổi trật tự
từ nối cho tự nhiên nhưng tên hàng đứng đầu. Không dùng chữ "các loại", "hoặc", "kể cả", "không gồm", "xuất xứ". Không chép câu tham chiếu.
Câu tham chiếu chỉ để học danh từ đầu câu và văn phong. Tối đa 200 ký tự. Chỉ trả JSON: {"moTaEcus":"<câu>"}`;
async function llmMacDinh(yc) {
  const { callLLMJson } = require('../llm-tier');
  const user = `CỤM ĐÃ KIỂM (theo thứ tự):\n${yc.cum.map((c) => `- ${c.cum}`).join('\n')}\n\nBẢN MÁY GHÉP:\n${yc.banMay.moTaEcus}\n\n`
    + `CÂU THAM CHIẾU (chỉ học văn phong):\n${[...(yc.thamChieu.tbTchq || []), ...(yc.thamChieu.oz || [])].map((x) => `- ${x}`).join('\n') || '- (không có)'}`;
  const { json } = await callLLMJson(SYSTEM, user, { step: 'ho-so-viet-mo-ta', temperature: 0.2, timeoutMs: 30000 });
  return json;
}
function soTrong(s) {
  const out = new Set();
  for (const m of String(s).matchAll(/\d+(?:[.,]\d+)*/g)) {
    const t = m[0];
    out.add(t.replace(/[.,]/g, ''));
    const a = Number(t.replace(/\./g, '').replace(',', '.')); if (Number.isFinite(a)) out.add(String(a));
    const b = Number(t.replace(/,/g, '')); if (Number.isFinite(b)) out.add(String(b));
  }
  return out;
}
/** Kiểm bản LLM. Trả mảng lý do (rỗng ⇒ đạt). */
function kiemBanLlm(out, { trong, banMay, hoSo, oz }) {
  if (typeof out !== 'string' || !out.trim()) return ['rong'];
  const t = out.normalize('NFC').trim();
  const lyDo = [];
  if (t.length > GIOI_HAN_ECUS) lyDo.push('qua-dai');
  lyDo.push(...viPhamChu(t, hoSo));
  // đủ dữ kiện + không lệch giá trị
  for (const c of trong) {
    if (c.vaiTro === 'TEN_HANG') { if (TC.doGiong(c.cum, t) < 0.5) lyDo.push('thieu-du-kien:tenHang'); continue; }
    const r = cumCoTrong(c, t);
    if (r.lech) lyDo.push(`lech-gia-tri:${c.fact || c.vaiTro}`);
    else if (!r.co) lyDo.push(`thieu-du-kien:${c.fact || c.vaiTro}`);
  }
  // không giá trị lạ: số
  const chuMay = `${banMay.moTaEcus}, ${banMay.khaiTiepHys || ''}, ${banMay.moTaDayDu}`;
  const soCho = soTrong(chuMay);
  for (const m of t.matchAll(/\d+(?:[.,]\d+)*/g)) {
    const ung = soTrong(m[0]);
    if (![...ung].some((x) => soCho.has(x))) lyDo.push(`gia-tri-la:${m[0]}`);
  }
  // không giá trị lạ: khoá có kiểu chưa có trong hồ sơ mà đọc được từ bản LLM
  const F = DK.chuanDuKien(hoSo.duKien);
  const daViet = new Set(trong.map((c) => c.fact).filter(Boolean));
  for (const k of TV.taiTuVung().khoa) {
    if (!['SO', 'CO_KHONG', 'LIET_KE'].includes(k.kieu) || daViet.has(k.khoa) || F.has(k.khoa)) continue;
    let r = null; try { r = TV.docGiaTri(k.khoa, t); } catch { r = null; }
    if (!r || r.trangThai !== 'DA_CO') continue;
    // chữ đó đã có sẵn trong bản máy (vd tên hàng khách khai "dẫn động bằng động cơ điện") ⇒ không phải giá trị LLM thêm
    let m = null; try { m = TV.docGiaTri(k.khoa, chuMay); } catch { m = null; }
    if (!(m && m.trangThai === 'DA_CO' && bangGiaTri(k, m.giaTri, r.giaTri))) lyDo.push(`gia-tri-la:${k.khoa}`);
  }
  // chặn chép câu Oz
  for (const o of oz || []) {
    const c = chuan(o.moTa).replace(/…$/, '');
    if (TC.jaccardToken(t, o.moTa) >= NGUONG_JACCARD_OZ || (c.length >= 25 && chuan(t).includes(c))) { lyDo.push('chep-cau-oz'); break; }
  }
  return [...new Set(lyDo)];
}

// ── Bảng giải trình ─────────────────────────────────────────────────────────────────────────────────────────────
function bangGiaiTrinhCua(cum, ra, ghiChuRanhGioi, canCuHys) {
  const hys = new Set(ra);
  const out = cum.map((c) => ({
    cum: c.cum, cumTat: c.cumTat, vaiTro: c.vaiTro, ...(c.fact ? { fact: c.fact } : {}),
    viTri: c.choTrong ? 'CHO_TRONG' : hys.has(c) ? 'HYS' : 'ECUS',
    viSaoBatBuoc: c.viSaoBatBuoc, canCu: c.canCu || null, ...(c.canCuThem && c.canCuThem.length ? { canCuThem: c.canCuThem } : {}),
    ...(hys.has(c) ? { canCuViTri: canCuHys } : {}), ...(c.cungLoaiTru ? { cungLoaiTru: c.cungLoaiTru } : {}),
    nguonGiaTri: c.nguonGiaTri || null,
  }));
  return [...out, ...ghiChuRanhGioi];
}

// ── ghiChu + gợi ý số thông báo PTPL ────────────────────────────────────────────────────────────────────────────
function ghiChuChoKqptpl(o) {
  if (!o || typeof o !== 'object') return null;
  const mau = (/“([^”]+)”/.exec(LB.citeChiTieu('1.68.8').trich) || [])[1];
  if (!mau) return null;
  const v = [o.stt, o.sttGiong, o.soToKhai].map((x) => String(x == null ? '' : x).trim());
  if (v.some((x) => !x)) return null;
  let i = 0;
  return mau.replace(/\.\.\./g, () => v[i++] ?? '...');
}
function goiYPtpl(hoSo) {
  if (hoSo.loaiToKhai === 'XUAT') return null;
  const ma = nz(hoSo.maHs);
  const F = DK.chuanDuKien(hoSo.duKien);
  const nsx = (hoSo.nhanDien && hoSo.nhanDien.nhaSanXuat) || (giaTriCua(F, 'nhaSanXuat') || {}).giaTri;
  if (!nsx) return null;
  const t = (hoSo.tienLe || []).find((x) => x && x.soHieu && nz(x.maHs) === ma && x.nhaSanXuat && chuan(x.nhaSanXuat) === chuan(nsx));
  if (!t) return null;
  return {
    soHieu: String(t.soHieu), ...(t.ngay ? { ngay: String(t.ngay) } : {}), maHs: ma, canCu: canCuLuat('1.78.3'),
    ghiChu: 'Chỉ ghi số/ngày văn bản thông báo khi đúng lô hàng cùng tên hàng, thành phần, tính chất lý hóa, tính năng, công dụng, cùng nhà sản xuất. Người khai xác nhận trước khi dùng.',
  };
}

// ── Câu hỏi ─────────────────────────────────────────────────────────────────────────────────────────────────────
function cauHoiBanNhap(hoSo, cum) {
  const kl = hoSo.ketLuan || {};
  const ds = Array.isArray(kl.cauHoi) ? clone(kl.cauHoi) : [];
  const coFact = new Set(ds.map((q) => q && q.fact).filter(Boolean));
  for (const c of cum) {
    const f = c.choTrong ? (c.fact || (c.vaiTro === 'TEN_HANG' ? 'tenLoai' : null)) : null;
    if (!f || coFact.has(f) || !khoaCo(f)) continue;
    coFact.add(f);
    ds.push({ fact: f, nhanVi: khoaCo(f).nhanVi, vi: TV.cauHoiCho(f, 'vi'), zh: TV.cauHoiCho(f, 'zh') });
  }
  if (kl.trangThai === 'MAU_THUAN') {
    const toi = kl.maTroToi ? `; hàng có thể thuộc ${fmtMa(kl.maTroToi)}` : '';
    ds.push({
      loai: 'MAU_THUAN', ...(kl.maTroToi ? { maTroToi: kl.maTroToi } : {}),
      vi: `Dữ kiện về hàng trái với ranh giới của mã ${fmtMa(hoSo.maHs)}${toi}. Đề nghị kiểm tra lại mã khai hoặc dữ kiện về hàng.`,
      zh: `商品信息与编码 ${fmtMa(hoSo.maHs)} 的归类界限不符${kl.maTroToi ? `；商品可能归入 ${fmtMa(kl.maTroToi)}` : ''}。请核对申报编码或商品信息。`,
    });
  }
  return ds;
}

// ── Cửa vào ─────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * @param {import('./index').HoSoPhanLoai} hoSo hồ sơ bộ não tự dựng, đã doiChieu (và locTheoQuyen nếu cần)
 * @param {{cheDo?: 'MAY'|'LLM', llm?: Function, rieng?: boolean, thamChieu?: Function,
 *   choKqptpl?: {stt:string|number, sttGiong:string|number, soToKhai:string}}} [opts]
 *   `llm` — tiêm cho test (mặc định chuỗi LLM lib/llm-tier.js); `rieng` — lượt khoá dịch vụ (withPrivateData, được dùng câu Oz làm
 *   mẫu); `thamChieu` — tiêm cho test (mặc định lib/ho-so/tham-chieu.js#thamChieuMoTa); `choKqptpl` — hàng giống lô đang chờ KQPTPL.
 * @returns {Promise<object>} { banNhap, moTaEcus, khaiTiepHys, ghiChu, moTaDayDu, bangGiaiTrinh[], taiLieuKyThuatNenKem[], kiemTra,
 *   canCu, cumDaKiem[], trichBiLoai[], cauHoi[]?, moTaBanNhap?, nhanBanNhap?, lyDoBanNhap[]?, maTroToi?, goiYThongBaoPtpl?, thamChieu? }
 */
async function vietMoTa(hoSo, opts = {}) {
  const h = clone(hoSo) || {};
  const cheDo = String(opts.cheDo || 'MAY').toUpperCase() === 'LLM' ? 'LLM' : 'MAY';
  const xuat = h.loaiToKhai === 'XUAT';
  const kl = h.ketLuan || {};
  const { cum, ghiChuRanhGioi, trichBiLoai, chan, thieuThongSoKiemHoa, khongVietDuoc, daBo } = dungCum(h);
  const duocPhep = giaTriDuocPhep(h);
  const viPham = [];
  const canCu = { chiTieuMoTa: LB.citeChiTieu(xuat ? '2.69.1' : '1.78.1') };

  // ghiChu theo luật định
  let ghiChu = null;
  const gc = ghiChuChoKqptpl(opts.choKqptpl);
  if (gc) {
    if (gc.length > GIOI_HAN_GHI_CHU) viPham.push('ghi-chu-qua-100-ky-tu');
    else { ghiChu = gc; canCu.ghiChu = LB.citeChiTieu('1.68.8'); canCu.ghiChuGioiHan = LB.citeChiTieu('1.68.luuY.100kyTu'); }
  }

  // lý do bản nháp
  const lyDoBanNhap = [];
  if (xuat) lyDoBanNhap.push('khuon-2.69-chua-ho-tro');
  if (kl.trangThai !== 'DU_CAN_CU') lyDoBanNhap.push(kl.trangThai || 'CHUA_DOI_CHIEU');
  const ds = h.duongDiPhapLy || [];
  if (kl.trangThai === 'DU_CAN_CU' && (!ds.length || ds.some((e) => e.ketQua !== 'CO') || (kl.chuaChot || []).length)) lyDoBanNhap.push('ranh-gioi-chua-co');
  if (cum.some((c) => c.choTrong)) lyDoBanNhap.push('thieu-du-kien');
  if (chan.some((x) => x.startsWith('trich-khong-nguyen-van'))) lyDoBanNhap.push('trich-khong-nguyen-van');
  if (chan.includes('thieu-ten-hang') && !lyDoBanNhap.includes('thieu-du-kien')) lyDoBanNhap.push('thieu-du-kien');
  viPham.push(...chan.filter((x) => x.startsWith('trich-khong-nguyen-van')));

  const cumDaKiem = cum.map((c) => ({ vaiTro: c.vaiTro, nhom: NHOM[c.vaiTro], ...(c.fact ? { fact: c.fact, giaTri: clone(c.giaTri) } : {}), cum: c.cum, cumTat: c.cumTat, ...(c.choTrong ? { choTrong: true } : {}) }));
  const chung = {
    taiLieuKyThuatNenKem: clone(h.taiLieuKyThuatNenKem || []), cumDaKiem, trichBiLoai,
    ...(goiYPtpl(h) ? { goiYThongBaoPtpl: goiYPtpl(h) } : {}),
  };

  // máy ghép
  const moTaDayDu = noi(cum.map((c) => c.cum));
  const { trong, ra, vua } = xepO(cum);
  if (!vua) { viPham.push('ten-hang-vuot-o'); lyDoBanNhap.push('ten-hang-vuot-o'); }
  const banMay = { moTaEcus: noi(trong.map((c) => c.cumTat)), khaiTiepHys: ra.length ? noi(ra.map((c) => c.cumTat)) : null, moTaDayDu };
  const vpChu = [...new Set([banMay.moTaEcus, banMay.khaiTiepHys, moTaDayDu].flatMap((s) => viPhamChu(s, h, duocPhep)))];
  if (vpChu.length) { viPham.push(...vpChu); lyDoBanNhap.push('vi-pham'); }

  const canCuHys = LB.citeChiTieu('1.68.luuY.hys');
  if (lyDoBanNhap.length) {
    const moTaBanNhap = noi(cum.map((c) => c.cum));
    return {
      banNhap: true, nhanBanNhap: NHAN_BAN_NHAP, lyDoBanNhap: [...new Set(lyDoBanNhap)],
      moTaEcus: null, khaiTiepHys: null, ghiChu, moTaDayDu: null, moTaBanNhap,
      cauHoi: cauHoiBanNhap(h, cum), ...(kl.trangThai === 'MAU_THUAN' && kl.maTroToi ? { maTroToi: kl.maTroToi } : {}),
      bangGiaiTrinh: bangGiaiTrinhCua(cum, [], ghiChuRanhGioi, canCuHys), ...chung,
      kiemTra: { tuongDuong: false, viPham: [...new Set(viPham)], cheDoDung: 'MAY', thieuThongSoKiemHoa, khongVietDuoc, daBo },
      canCu,
    };
  }

  // LLM: chỉ viết lại phần ô ECUS từ cụm đã kiểm; trượt ⇒ bản máy
  let moTaEcus = banMay.moTaEcus; let cheDoDung = 'MAY'; let thamChieu;
  if (cheDo === 'LLM') {
    const rieng = opts.rieng === true || isPrivate();
    let refs = { oz: [], tbTchq: [] };
    try { refs = (await (typeof opts.thamChieu === 'function' ? opts.thamChieu : TC.thamChieuMoTa)({ maHs: nz(h.maHs), tenHang: cum[0].cum, oz: rieng })) || refs; } catch { /* tầng tuỳ chọn */ }
    const oz = rieng ? (refs.oz || []) : [];
    const yc = {
      maHs: nz(h.maHs), gioiHan: GIOI_HAN_ECUS,
      cum: trong.map((c) => ({ cum: c.cumTat, vaiTro: c.vaiTro })),
      banMay: { moTaEcus: banMay.moTaEcus, khaiTiepHys: banMay.khaiTiepHys },
      thamChieu: { tbTchq: (refs.tbTchq || []).map((x) => x.moTa), ...(oz.length ? { oz: oz.map((x) => x.moTa) } : {}) },
    };
    const fn = typeof opts.llm === 'function' ? opts.llm : llmMacDinh;
    let out = null; let loi = null;
    try { out = opts.rieng === true ? await withPrivateData(() => fn(yc)) : await fn(yc); } catch (e) { loi = e; }
    const text = typeof out === 'string' ? out : out && typeof out.moTaEcus === 'string' ? out.moTaEcus : null;
    const lyDo = loi ? [`loi-goi:${String(loi.code || loi.message || 'llm').slice(0, 60)}`] : kiemBanLlm(text, { trong, banMay, hoSo: h, oz: refs.oz || [] });
    if (!lyDo.length) { moTaEcus = text.normalize('NFC').trim(); cheDoDung = 'LLM'; thamChieu = TC.congKhai(refs); } else viPham.push(...lyDo.map((x) => `llm-bi-loai:${x}`));
  }

  const td = kiemTuongDuong(cumDaKiem, moTaEcus, banMay.khaiTiepHys);
  if (banMay.khaiTiepHys) canCu.khaiTiep = canCuHys;
  return {
    banNhap: false,
    moTaEcus,
    khaiTiepHys: banMay.khaiTiepHys,
    ghiChu,
    moTaDayDu,
    bangGiaiTrinh: bangGiaiTrinhCua(cum, ra, ghiChuRanhGioi, canCuHys),
    ...chung,
    kiemTra: { tuongDuong: td.tuongDuong, ...(td.tuongDuong ? {} : { thieu: td.thieu, lech: td.lech }), viPham: [...new Set(viPham)], cheDoDung, thieuThongSoKiemHoa, khongVietDuoc, daBo },
    canCu,
    ...(thamChieu ? { thamChieu } : {}),
  };
}

module.exports = { vietMoTa, kiemTuongDuong, jaccardToken: TC.jaccardToken, viPhamChu, GIOI_HAN_ECUS };
