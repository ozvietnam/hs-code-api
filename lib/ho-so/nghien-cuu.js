/**
 * lib/ho-so/nghien-cuu.js — `nghienCuu`: tìm dữ kiện QUYẾT ĐỊNH còn CHUA_BIET từ nguồn ngoài (plan L1-5b; spec hồ sơ §8.3 bước 4,
 * §11 "Rò dữ liệu khách"; plan Review Focus 1).
 *
 * Tái dùng lib/identify.js (định danh + máy mở lại nguồn) và lib/xac-minh-nguon.js. CHỈ giá trị đọc được (tu-vung.docGiaTri)
 * từ câu trích của nguồn ĐÃ MỞ LẠI ĐƯỢC (HTTP 200 + câu trích có trong trang) và mức kiểm chứng CORROBORATED/VERIFIED
 * (lib/attribute-frames.js#tamGiacKiemChung) mới vào `duKien` (nguon 'NSX', kèm `xacMinh`); còn lại vẫn CHUA_BIET ⇒ câu hỏi.
 *
 * Web chỉ qua lib/web-facts.js#webFacts({ brand, model, url, mucTieu }) (L0a): mucTieu là KHOÁ từ vựng, không chữ mô tả khách.
 * Lượt riêng tư (`congKhai !== true`, hoặc đang trong withPrivateData): chạy trong withPrivateData; không có nhãn hiệu/model
 * ⇒ KHÔNG gọi web; không gửi URL. identify (gửi mô tả khách tới LLM) chạy trong withPrivateData ⇒ chỉ nhà cung cấp hợp lệ.
 * Mọi lỗi nguồn ngoài ⇒ bỏ qua (tầng tuỳ chọn), hồ sơ vẫn trả. Kết thúc bằng doiChieu lại để ketLuan/cauHoi phản ánh dữ kiện mới.
 * Hàm không sửa hồ sơ đầu vào.
 */
const TV = require('../tu-vung');
const { withPrivateData, isPrivate } = require('../llm-privacy');
const { tamGiacKiemChung } = require('../attribute-frames');
const { factQuyetDinh } = require('./doc-du-kien');
const { doiChieu } = require('./doi-chieu');

const MUC_NHAN = new Set(['CORROBORATED', 'VERIFIED']);
const TAI_LIEU_RE = /datasheet|data-sheet|catalog|catalogue|brochure|manual|spec|\.pdf(\?|#|$)|thong-so|tai-lieu/i;

const nz = (v) => String(v == null ? '' : v).trim();
const giaTriDuKien = (h, f) => { const d = (h.duKien || []).find((x) => x && x.fact === f && x.trangThai === 'DA_CO' && x.giaTri != null); return d ? String(d.giaTri) : ''; };

/** Đọc các dữ kiện `facts` từ những câu trích đã xác minh. Trả Map fact → { giaTri, donVi?, bangChung, url }. */
function docTuTrich(facts, trichs) {
  const out = new Map();
  for (const f of facts) {
    for (const t of trichs) {
      let r; try { r = TV.docGiaTri(f, t.trich); } catch { r = null; }
      if (r && r.trangThai === 'DA_CO') { out.set(f, { r, url: t.url }); break; }
    }
  }
  return out;
}

function mucNsx(fact, r, xacMinh) {
  return {
    fact, giaTri: r.giaTri, ...(r.donVi ? { donVi: r.donVi } : {}), ...(r.op ? { op: r.op } : {}), ...(r.cacGiaTri ? { cacGiaTri: r.cacGiaTri } : {}),
    nguon: 'NSX', bangChung: r.bangChung, trangThai: 'DA_CO', xacMinh,
  };
}

async function chay(hoSo, opts) {
  const deps = opts.deps || {};
  const h = structuredClone(hoSo);
  const quyetDinh = new Set(factQuyetDinh(h));
  const conThieu = () => (h.duKien || []).filter((d) => d && d.trangThai === 'CHUA_BIET' && quyetDinh.has(d.fact)).map((d) => d.fact);
  if (!conThieu().length) return hoSo;
  const rieng = isPrivate();
  const brand = nz(h.nhanDien && h.nhanDien.nhanHieu) || giaTriDuKien(h, 'nhanHieu');
  const model = nz(h.nhanDien && h.nhanDien.model) || giaTriDuKien(h, 'model');
  const taiLieu = new Map();
  const ghiTaiLieu = (url, title) => { if (url && TAI_LIEU_RE.test(`${url} ${title || ''}`) && !taiLieu.has(url)) taiLieu.set(url, { url, ...(title ? { title } : {}) }); };
  const nhan = (f, r, xacMinh) => {
    h.duKien = (h.duKien || []).filter((d) => !(d.fact === f && d.trangThai === 'CHUA_BIET'));
    h.duKien.push(mucNsx(f, r, xacMinh));
  };

  // 1. identify (định danh + mở lại nguồn)
  try {
    const identify = deps.identify || require('../identify').identify;
    const tenHang = nz(h.hang && h.hang.tenVi) || giaTriDuKien(h, 'tenLoai') || nz(opts.moTa).slice(0, 200);
    if (tenHang.length >= 2) {
      const kq = await identify({ tenHang, ...(model ? { model } : {}), ...(brand ? { thuongHieu: brand } : {}), ...(opts.moTa ? { moTa: String(opts.moTa) } : {}) }, { ...(deps.fetchImpl ? { fetchImpl: deps.fetchImpl } : {}) });
      const ok = new Set(((kq && kq.xacMinhKetQua) || []).filter((x) => x && x.xacMinhOk && x.trichCoMat === true).map((x) => nz(x.url)));
      const nguon = ((kq && kq.xacMinh && kq.xacMinh.nguon) || []).filter((n) => n && n.url && n.trich && n.xacMinh !== 'CHUA_XAC_MINH' && ok.has(nz(n.url)));
      for (const n of nguon) ghiTaiLieu(n.url, n.title);
      const muc = kq && kq.xacMinh && kq.xacMinh.muc;
      if (MUC_NHAN.has(muc) && nguon.length) {
        for (const [f, { r }] of docTuTrich(conThieu(), nguon)) nhan(f, r, { muc, nguon: 'identify', url: nguon.map((n) => n.url) });
      }
    }
  } catch { /* tầng tuỳ chọn */ }

  // 2. Web (z.ai) — chỉ hiệu/model/URL công khai + khoá từ vựng; riêng tư: không hiệu/model ⇒ không gọi, không URL
  const facts = conThieu();
  const url = rieng ? '' : nz(opts.url);
  if (facts.length && (brand || model || url)) {
    try {
      const webFacts = deps.webFacts || ((o) => require('../web-facts').webFacts(o, deps.webGoi ? { goi: deps.webGoi } : {}));
      const w = await webFacts({ brand, model, ...(url ? { url } : {}), mucTieu: facts.join(', ') });
      if (w && w.cauTraLoi && Array.isArray(w.nguon) && w.nguon.length) {
        for (const n of w.nguon) ghiTaiLieu(n.url, n.title);
        const xacMinhNhieu = deps.xacMinhNhieu || ((ds, m) => require('../xac-minh-nguon').xacMinhNhieu(ds, m, deps.fetchImpl));
        for (const f of facts) {
          let r; try { r = TV.docGiaTri(f, w.cauTraLoi); } catch { r = null; }
          if (!r || r.trangThai !== 'DA_CO' || String(r.bangChung || '').length < 8) continue;
          const kq = await xacMinhNhieu(w.nguon.map((n) => ({ url: n.url, trich: r.bangChung })), model);
          const daMo = (kq || []).filter((x) => x && x.moDuoc && x.trichCoMat === true);
          const tg = tamGiacKiemChung(daMo.map((x) => ({ url: x.url, loai: 'phu' })));
          if (MUC_NHAN.has(tg.muc)) nhan(f, r, { muc: tg.muc, nguon: 'web', url: daMo.map((x) => x.url) });
        }
      }
    } catch { /* tầng tuỳ chọn */ }
  }

  const cu = Array.isArray(h.taiLieuKyThuatNenKem) ? h.taiLieuKyThuatNenKem : [];
  h.taiLieuKyThuatNenKem = [...cu, ...[...taiLieu.values()].filter((t) => !cu.some((c) => c.url === t.url))];
  const { deps: _d, congKhai: _c, url: _u, ...dcOpts } = opts;
  return doiChieu(h, dcOpts);
}

/**
 * @param {import('./index').HoSoPhanLoai} hoSo hồ sơ đã doiChieu
 * @param {{congKhai?: boolean, moTa?: string, url?: string, deps?: {identify?, webFacts?, webGoi?, xacMinhNhieu?, fetchImpl?},
 *   soTay?, bangHieuChinh?, noiBo?, tinHieuDanhMuc?, tienLeMaKhac?, demKhoOz?}} [opts]
 *   `congKhai: true` — lượt công khai (không khoá dịch vụ); mặc định coi là riêng tư. Các khoá còn lại chuyển cho doiChieu.
 * @returns {Promise<import('./index').HoSoPhanLoai>}
 */
async function nghienCuu(hoSo, opts = {}) {
  const fn = () => chay(hoSo, opts);
  return opts.congKhai === true && !isPrivate() ? fn() : withPrivateData(fn);
}

module.exports = { nghienCuu };
