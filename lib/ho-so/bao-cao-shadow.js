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
 *   - Dòng `boQua` (lượt mã lát 1 không dựng hồ sơ: chốt sớm / cache / kho đáp án) chỉ đếm vào `soLuot`, `theoEndpoint`, `boQua`
 *     và cột `boQua` của từng nhóm — KHÔNG vào mẫu số áp dụng hay trạng thái.
 *   - `theoBenGoi` / `theoPhanNhom`: cùng một bộ số gọn cho từng bên gọi (dòng cũ chưa có `benGoi` ⇒ 'khong-ro') và từng phân nhóm
 *     6 số (6 số đầu của mã — mức biểu thuế, không phải nội dung khách). `theoNgay`: số dòng theo ngày UTC.
 *   - Lọc `benGoi` (CSV tên bên gọi) áp TRƯỚC khi tổng hợp — vd `benGoi: 'cong-oz,erp'` để bỏ lượt thử nội bộ.
 *   - `chiPhiLlm`: chi phí LLM của lượt bóng chạy nền, cộng từ khối `chiPhiLlm` của từng dòng (số lượt LLM, token vào/ra, USD
 *     theo bảng giá lib/llm-cost.js, lượt không rõ token/giá) + `theoNgay` (UTC) + `theoNhaCungCap` + `theoKenh`
 *     ("<nhà cung cấp>/<model>"). `soLuotDo` = số dòng có số đo chi phí; `khongCoSoDo` = dòng dựng hồ sơ nhưng không có (dòng cũ,
 *     lượt chạy thử — lượt thử đã trả usage trong phản hồi). Lượt bóng không còn trả `usage` cho bên gọi nên đây là nơi duy nhất
 *     thấy chi phí của nó.
 *   - `llm.rotVeMayKhongBanNhap`: rơi về máy tính RIÊNG trên bản đạt. Bản nháp không bao giờ gọi LLM viết (viet-mo-ta.js trả sớm
 *     với cheDoDung 'MAY') nên `rotVeMay` gộp luôn cả bản nháp — đừng đọc nó như "LLM hỏng".
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
const TEN_BEN_GOI = /^[a-z0-9][a-z0-9_-]{0,31}$/;
const TEN_KENH_BC = /^[A-Za-z0-9][A-Za-z0-9._:@-]{0,59}\/[A-Za-z0-9][A-Za-z0-9._:@-]{0,59}$/;
const laBoQua = (d) => typeof d.boQua === 'string' && d.boQua !== '';
const benGoiCua = (d) => (typeof d.benGoi === 'string' && TEN_BEN_GOI.test(d.benGoi) ? d.benGoi : 'khong-ro');
const pn6Cua = (d) => { const m = String(d.maHs == null ? '' : d.maHs).replace(/\D/g, ''); return m.length >= 6 ? m.slice(0, 6) : 'khong-ro'; };

/** Bộ số gọn của một nhóm dòng (một bên gọi / một phân nhóm): lượt, áp dụng, bỏ qua, trạng thái + tỉ lệ, bản nháp. Chỉ số. */
function soNhom(ds) {
  const o = { soLuot: ds.length, boQua: 0, khongApDung: 0, apDung: 0, loi: 0, soLuotDung: 0, trangThai: {}, tiLeTrangThai: {}, banNhap: 0, tiLeBanNhap: null };
  for (const d of ds) {
    if (laBoQua(d)) { o.boQua += 1; continue; }
    if (d.apDung === false) { o.khongApDung += 1; continue; }
    o.apDung += 1;
    if (d.loi) { o.loi += 1; continue; }
    o.soLuotDung += 1;
    dem(o.trangThai, d.trangThai || 'KHONG_RO');
    if (d.banNhap === true) o.banNhap += 1;
  }
  o.tiLeTrangThai = Object.fromEntries(Object.entries(o.trangThai).map(([k, v]) => [k, tiLe(v, o.soLuotDung)]));
  o.tiLeBanNhap = tiLe(o.banNhap, o.soLuotDung);
  return o;
}
function theoNhom(ds, khoaCua) {
  const nhom = new Map();
  for (const d of ds) { const k = khoaCua(d); if (!nhom.has(k)) nhom.set(k, []); nhom.get(k).push(d); }
  // Thứ tự khoá không mang nghĩa (khoá toàn chữ số bị JS xếp tăng dần) — bên in tự xếp theo `soLuot`.
  return Object.fromEntries([...nhom.entries()].map(([k, v]) => [k, soNhom(v)]));
}

/**
 * @param {object[]} dong các dòng số đo
 * @param {{tu?: string, den?: string, dongHong?: number, benGoi?: string|string[]}} [o]
 */
function tongHopShadow(dong = [], o = {}) {
  const tu = o.tu && NGAY.test(o.tu) ? o.tu : null;
  const den = o.den && NGAY.test(o.den) ? o.den : null;
  const locBenGoi = [].concat(o.benGoi == null ? [] : o.benGoi).flatMap((x) => String(x).split(',')).map((x) => x.trim().toLowerCase()).filter((x) => TEN_BEN_GOI.test(x));
  const ds = (Array.isArray(dong) ? dong : []).filter((d) => {
    if (!d || typeof d !== 'object') return false;
    const ngay = String(d.ts || '').slice(0, 10);
    if (tu && !(ngay >= tu)) return false;
    if (den && !(ngay <= den)) return false;
    if (locBenGoi.length && !locBenGoi.includes(benGoiCua(d))) return false;
    return true;
  });
  const theoEndpoint = {}; const theoCheDo = {}; const loi = {}; const boQua = {}; const theoNgay = {};
  let apDung = 0; let khongApDung = 0;
  for (const d of ds) {
    dem(theoEndpoint, String(d.endpoint || 'khong-ro'));
    dem(theoCheDo, d.cheDo === 'thu' ? 'thu' : 'shadow');
    dem(theoNgay, String(d.ts || '').slice(0, 10) || 'khong-ro');
    if (laBoQua(d)) { dem(boQua, String(d.boQua).slice(0, 20)); continue; }
    if (d.apDung === false) khongApDung += 1; else apDung += 1;
    if (d.loi) dem(loi, String(d.loi));
  }
  const dung = ds.filter((d) => !laBoQua(d) && d.apDung !== false && !d.loi);

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
  const yeuCauLlmDat = yeuCauLlm.filter((d) => d.banNhap !== true);
  const rotVeMayDat = yeuCauLlmDat.filter((d) => d.cheDoViet === 'MAY').length;

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
  // L1-5e — soát K2 (/api/declaration-check): chỉ cộng số đếm / cờ của khối k2
  const coK2 = dung.filter((d) => d.k2 && typeof d.k2 === 'object');
  const congK2 = (k) => coK2.reduce((a, d) => a + (Number.isFinite(d.k2[k]) ? d.k2[k] : 0), 0);
  const demK2 = (k) => coK2.filter((d) => d.k2[k] === true).length;
  const k2 = {
    soLuot: coK2.length, soCo: congK2('soCo'), soThieu: congK2('soThieu'), soMauThuan: congK2('soMauThuan'),
    luotCoCanCuTatDinh: demK2('coCanCuTatDinh'), luotCanPhanLoai: demK2('canPhanLoai'), luotCauSuaBanNhap: demK2('cauSuaBanNhap'), luotCauSuaMaTroToi: demK2('cauSuaMaTroToi'),
  };
  k2.tiLeCanPhanLoai = tiLe(k2.luotCanPhanLoai, k2.soLuot);

  // Chi phí LLM của lượt bóng chạy nền — cộng trên MỌI dòng có `chiPhiLlm` (kể cả dòng lỗi: tiền đã tiêu trước khi lỗi).
  const cpRong = () => ({ soLuotDo: 0, soLuotLlm: 0, tokenVao: 0, tokenRa: 0, khongRoToken: 0, usd: 0, khongRoGia: 0 });
  const so = (x) => (Number.isFinite(x) && x > 0 ? x : 0);
  const congCp = (o, c, lanDo) => { o.soLuotDo += lanDo; o.soLuotLlm += so(c.soLuot); o.tokenVao += so(c.tokenVao); o.tokenRa += so(c.tokenRa); o.khongRoToken += so(c.khongRoToken); o.usd += so(c.usd); o.khongRoGia += so(c.khongRoGia); };
  const chiPhiLlm = { ...cpRong(), khongCoSoDo: 0, theoNgay: {}, theoNhaCungCap: {}, theoKenh: {} };
  for (const d of ds) {
    if (laBoQua(d) || d.apDung === false) continue;
    const c = d.chiPhiLlm;
    if (!c || typeof c !== 'object') { chiPhiLlm.khongCoSoDo += 1; continue; }
    congCp(chiPhiLlm, c, 1);
    const ngay = String(d.ts || '').slice(0, 10) || 'khong-ro';
    congCp(chiPhiLlm.theoNgay[ngay] || (chiPhiLlm.theoNgay[ngay] = cpRong()), c, 1);
    for (const [k, v] of Object.entries(c.kenh && typeof c.kenh === 'object' ? c.kenh : {})) {
      if (!TEN_KENH_BC.test(k) || !v || typeof v !== 'object') continue;
      const ncc = k.split('/')[0];
      for (const [bang, khoa] of [[chiPhiLlm.theoNhaCungCap, ncc], [chiPhiLlm.theoKenh, k]]) {
        const o = bang[khoa] || (bang[khoa] = { soLuotLlm: 0, tokenVao: 0, tokenRa: 0, usd: 0 });
        o.soLuotLlm += so(v.soLuot); o.tokenVao += so(v.tokenVao); o.tokenRa += so(v.tokenRa); o.usd += so(v.usd);
      }
    }
  }
  const lam8 = (x) => Math.round(x * 1e8) / 1e8;
  chiPhiLlm.usd = lam8(chiPhiLlm.usd);
  for (const b of [chiPhiLlm.theoNgay, chiPhiLlm.theoNhaCungCap, chiPhiLlm.theoKenh]) for (const o of Object.values(b)) o.usd = lam8(o.usd);
  chiPhiLlm.theoNgay = Object.fromEntries(Object.entries(chiPhiLlm.theoNgay).sort((a, b) => a[0].localeCompare(b[0])));

  return {
    tu, den,
    ...(locBenGoi.length ? { locBenGoi } : {}),
    soLuot: ds.length,
    soLuotDung: dung.length,
    dongHong: Number.isFinite(o.dongHong) ? o.dongHong : 0,
    tuLuc: ds.length ? ds.map((d) => String(d.ts || '')).filter(Boolean).sort()[0] || null : null,
    denLuc: ds.length ? ds.map((d) => String(d.ts || '')).filter(Boolean).sort().slice(-1)[0] || null : null,
    theoEndpoint, theoCheDo,
    theoNgay: Object.fromEntries(Object.entries(theoNgay).sort((a, b) => a[0].localeCompare(b[0]))),
    boQua,
    theoBenGoi: theoNhom(ds, benGoiCua),
    theoPhanNhom: theoNhom(ds, pn6Cua),
    lat1: { apDung, khongApDung, tiLeApDung: tiLe(apDung, apDung + khongApDung) },
    trangThai,
    tiLeTrangThai: Object.fromEntries(Object.entries(trangThai).map(([k, v]) => [k, tiLe(v, dung.length)])),
    banNhap: { so: soBanNhap, n: dung.length, tiLe: tiLe(soBanNhap, dung.length) },
    lyDoBanNhap,
    llm: { yeuCauLlm: yeuCauLlm.length, yeuCauMay: coYeuCau.length - yeuCauLlm.length, rotVeMay, tiLeRotVeMay: tiLe(rotVeMay, yeuCauLlm.length), llmBiLoai, tiLeLlmBiLoai: tiLe(llmBiLoai, yeuCauLlm.length), yeuCauLlmKhongBanNhap: yeuCauLlmDat.length, rotVeMayKhongBanNhap: rotVeMayDat, tiLeRotVeMayKhongBanNhap: tiLe(rotVeMayDat, yeuCauLlmDat.length) },
    quaHan, tiLeQuaHan,
    thoiGian,
    tuongDuong: { dat: tdDat, n: dat.length, tiLe: tiLe(tdDat, dat.length) },
    duKienQD: qd,
    trungMoTaCu: { co: coTrung.filter((d) => d.trungMoTaCu).length, n: coTrung.length },
    k2,
    chiPhiLlm,
    loi,
  };
}

/** Đọc tệp + tổng hợp (một lời gọi cho script và endpoint). */
function baoCaoShadow(o = {}) {
  const { dong, dongHong } = docDongShadow(o.tep || dataPath(TEP));
  return tongHopShadow(dong, { ...o, dongHong });
}

module.exports = { docDongShadow, tongHopShadow, baoCaoShadow, soNhom, phanVi, NGAY };
