/**
 * lib/ho-so/bao-cao-shadow.js — tổng hợp số đo chạy bóng của hồ sơ phân loại (plan L1-5f; spec hồ sơ §10). Đọc
 * `dataPath('ho-so-shadow.jsonl')` (mỗi dòng chỉ có khoá KHOA_SHADOW của lib/ho-so/api.js — không nội dung khách) và trả
 * MỘT đối tượng số: không mã HS từng dòng, không chuỗi nào của khách.
 *
 * Dùng chung cho `scripts/bao-cao-shadow.mjs` (in bảng / --json) và `GET /api/admin/ho-so-shadow` (KÍN, api/dataset.js).
 *
 * Quy ước:
 *   - Dòng cũ (trước L1-5f) thiếu `cheDo`/`apDung` ⇒ coi là `cheDo: 'shadow'`, `apDung: true`.
 *   - `soLuotDung` = dòng áp dụng (apDung ≠ false) và không lỗi — mẫu số của trạng thái, bản nháp, LLM, thời gian, tương đương.
 *   - Tỉ lệ áp dụng lát 1 = dòng áp dụng / (áp dụng + "mã lát 1 chưa có ranh giới duyệt"); mã ngoài lát 1 không ghi dòng.
 *   - Rơi về máy = dòng có `cheDoVietYeuCau: 'LLM'` mà `cheDoViet: 'MAY'` (gồm LLM bị máy loại, lỗi gọi, quá hạn viết).
 *   - p50/p95 theo hạng gần nhất (nearest-rank). Không có dữ liệu ⇒ null.
 *   - Lọc `tu`/`den` (YYYY-MM-DD) theo ngày UTC của `ts`, gồm cả hai đầu.
 */
const fs = require('fs');
const { dataPath } = require('../data-paths');

const TEP = 'ho-so-shadow.jsonl';
const BUOC = ['duongDi', 'docDuKien', 'doiChieu', 'nghienCuu', 'viet'];
const NGAY = /^\d{4}-\d{2}-\d{2}$/;

/** Đọc mọi dòng số đo; dòng không phải JSON đếm vào `dongHong`. Tệp chưa có ⇒ rỗng. */
function docDongShadow(p = dataPath(TEP)) {
  let txt = '';
  try { txt = fs.readFileSync(p, 'utf8'); } catch { return { dong: [], dongHong: 0 }; }
  const dong = []; let dongHong = 0;
  for (const l of txt.split('\n')) {
    if (!l.trim()) continue;
    try { const o = JSON.parse(l); if (o && typeof o === 'object' && !Array.isArray(o)) dong.push(o); else dongHong += 1; } catch { dongHong += 1; }
  }
  return { dong, dongHong };
}

const tiLe = (a, b) => (b ? a / b : null);
function phanVi(xs, p) {
  const a = xs.filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
  if (!a.length) return null;
  return a[Math.max(0, Math.ceil(p * a.length) - 1)];
}
const thongKeMs = (xs) => {
  const a = xs.filter((x) => Number.isFinite(x));
  return { n: a.length, p50: phanVi(a, 0.5), p95: phanVi(a, 0.95), max: a.length ? Math.max(...a) : null };
};
const dem = (obj, k) => { obj[k] = (obj[k] || 0) + 1; };

/**
 * @param {object[]} dong các dòng số đo
 * @param {{tu?: string, den?: string, dongHong?: number}} [o]
 */
function tongHopShadow(dong = [], o = {}) {
  const tu = o.tu && NGAY.test(o.tu) ? o.tu : null;
  const den = o.den && NGAY.test(o.den) ? o.den : null;
  const ds = (Array.isArray(dong) ? dong : []).filter((d) => {
    if (!d || typeof d !== 'object') return false;
    const ngay = String(d.ts || '').slice(0, 10);
    if (tu && !(ngay >= tu)) return false;
    if (den && !(ngay <= den)) return false;
    return true;
  });
  const theoEndpoint = {}; const theoCheDo = {}; const loi = {};
  let apDung = 0; let khongApDung = 0;
  for (const d of ds) {
    dem(theoEndpoint, String(d.endpoint || 'khong-ro'));
    dem(theoCheDo, d.cheDo === 'thu' ? 'thu' : 'shadow');
    if (d.apDung === false) khongApDung += 1; else apDung += 1;
    if (d.loi) dem(loi, String(d.loi));
  }
  const dung = ds.filter((d) => d.apDung !== false && !d.loi);

  const trangThai = {}; const lyDoBanNhap = {};
  for (const d of dung) {
    dem(trangThai, d.trangThai || 'KHONG_RO');
    for (const l of Array.isArray(d.lyDoBanNhap) ? d.lyDoBanNhap : []) dem(lyDoBanNhap, String(l));
  }
  const soBanNhap = dung.filter((d) => d.banNhap === true).length;

  const coYeuCau = dung.filter((d) => d.cheDoVietYeuCau);
  const yeuCauLlm = coYeuCau.filter((d) => d.cheDoVietYeuCau === 'LLM');
  const rotVeMay = yeuCauLlm.filter((d) => d.cheDoViet === 'MAY').length;
  const llmBiLoai = dung.filter((d) => d.llmBiLoai === true).length;

  const quaHan = {};
  for (const d of dung) for (const b of Array.isArray(d.buocQuaHan) ? d.buocQuaHan : []) dem(quaHan, String(b));
  const tiLeQuaHan = Object.fromEntries(Object.entries(quaHan).map(([k, v]) => [k, tiLe(v, dung.length)]));

  const thoiGian = { tong: thongKeMs(dung.map((d) => d.ms)) };
  for (const b of BUOC) thoiGian[b] = thongKeMs(dung.map((d) => (d.msBuoc && typeof d.msBuoc === 'object' ? d.msBuoc[b] : undefined)));

  const dat = dung.filter((d) => d.banNhap !== true);
  const tdDat = dat.filter((d) => d.tuongDuong === true).length;

  const coQD = dung.filter((d) => d.duKienQD && typeof d.duKienQD === 'object');
  const cong = (k) => coQD.reduce((a, d) => a + (Number.isFinite(d.duKienQD[k]) ? d.duKienQD[k] : 0), 0);
  const qd = { soLuot: coQD.length, tong: cong('tong'), moi: cong('moi'), cu: cong('cu'), caHai: cong('caHai') };
  qd.tiLeMoi = tiLe(qd.moi, qd.tong); qd.tiLeCu = tiLe(qd.cu, qd.tong); qd.tiLeCaHai = tiLe(qd.caHai, qd.tong);
  qd.chiMoiCo = qd.moi - qd.caHai; qd.chiCuCo = qd.cu - qd.caHai;

  const coTrung = dung.filter((d) => typeof d.trungMoTaCu === 'boolean');

  return {
    tu, den,
    soLuot: ds.length,
    soLuotDung: dung.length,
    dongHong: Number.isFinite(o.dongHong) ? o.dongHong : 0,
    tuLuc: ds.length ? ds.map((d) => String(d.ts || '')).filter(Boolean).sort()[0] || null : null,
    denLuc: ds.length ? ds.map((d) => String(d.ts || '')).filter(Boolean).sort().slice(-1)[0] || null : null,
    theoEndpoint, theoCheDo,
    lat1: { apDung, khongApDung, tiLeApDung: tiLe(apDung, apDung + khongApDung) },
    trangThai,
    tiLeTrangThai: Object.fromEntries(Object.entries(trangThai).map(([k, v]) => [k, tiLe(v, dung.length)])),
    banNhap: { so: soBanNhap, n: dung.length, tiLe: tiLe(soBanNhap, dung.length) },
    lyDoBanNhap,
    llm: { yeuCauLlm: yeuCauLlm.length, yeuCauMay: coYeuCau.length - yeuCauLlm.length, rotVeMay, tiLeRotVeMay: tiLe(rotVeMay, yeuCauLlm.length), llmBiLoai, tiLeLlmBiLoai: tiLe(llmBiLoai, yeuCauLlm.length) },
    quaHan, tiLeQuaHan,
    thoiGian,
    tuongDuong: { dat: tdDat, n: dat.length, tiLe: tiLe(tdDat, dat.length) },
    duKienQD: qd,
    trungMoTaCu: { co: coTrung.filter((d) => d.trungMoTaCu).length, n: coTrung.length },
    loi,
  };
}

/** Đọc tệp + tổng hợp (một lời gọi cho script và endpoint). */
function baoCaoShadow(o = {}) {
  const { dong, dongHong } = docDongShadow(o.tep || dataPath(TEP));
  return tongHopShadow(dong, { ...o, dongHong });
}

module.exports = { docDongShadow, tongHopShadow, baoCaoShadow, phanVi, NGAY };
