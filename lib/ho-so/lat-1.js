/**
 * L1-1 (#563) — chốt danh sách 50 phân nhóm lát 1 bằng SCRIPT (không chọn tay), đo trần Pareto và tỉ lệ máy chốt thật.
 * Kế hoạch: ozplugin docs/superpowers/plans/2026-10-29-ho-so-phan-loai.md "Job L1-1"; spec §9.
 *
 * Mọi hàm ở đây thuần, nhận dữ liệu qua tham số (test dùng biểu giả). Không gọi LLM, không gọi mạng.
 * Script chạy thật: scripts/do-lat-1.mjs.
 *
 * RIÊNG TƯ: tệp commit (data/ho-so/lat-1.json) chỉ có tỉ lệ làm tròn 0,1 % và mã — không số lượt tuyệt đối, không câu
 * khai Oz. `kiemKhongCoSoLuot` chặn ở bước dựng tệp.
 */
const { chatLieuTrong, productHead, phraseHit } = require('../so-tay-gates');
const { syllables } = require('../vi-tokens');

const nz = (s) => String(s ?? '').replace(/\D/g, '');
const pct = (n, d) => (d ? Math.round((1000 * n) / d) / 10 : null);

/** Mức MFN dạng số thuần ("17", "2,5"); "*", trống, "30 (NHN: 80)", "Theo hướng dẫn… Chương 98" → null. */
function soMfn(raw) {
  const s = String(raw ?? '').trim();
  return /^\d+(?:[.,]\d+)?$/.test(s) ? Number(s.replace(',', '.')) : null;
}

/** Số dòng 8 số của mỗi phân nhóm 6 số trong biểu. */
function soDong8TheoPn6(taxData) {
  const m = new Map();
  for (const k of Object.keys(taxData)) {
    if (nz(k).length !== 8) continue;
    const p = nz(k).slice(0, 6);
    m.set(p, (m.get(p) || 0) + 1);
  }
  return m;
}

/**
 * Phân nhóm 6 số có ≥ 2 dòng 8 số mà mức MFN (số) khác nhau.
 * @returns {Map<string,{dong8:string[], mfn:number[]}>} — `dong8`/`mfn` thẳng hàng, chỉ gồm dòng có mức số.
 *          Thuộc tính `.khongSoDuoc`: mọi dòng 8 số của biểu có mức MFN không phải số (bị bỏ khỏi so sánh).
 */
function phanNhomChenhThue(taxData) {
  const nhom = new Map();
  const khongSoDuoc = [];
  for (const k of Object.keys(taxData).map(nz).filter((x) => x.length === 8).sort()) {
    const v = soMfn(taxData[k]?.mfn);
    if (v === null) { khongSoDuoc.push(k); continue; }
    const p = k.slice(0, 6);
    if (!nhom.has(p)) nhom.set(p, { dong8: [], mfn: [] });
    nhom.get(p).dong8.push(k);
    nhom.get(p).mfn.push(v);
  }
  const out = new Map();
  for (const [p, g] of [...nhom].sort(([a], [b]) => a.localeCompare(b))) if (new Set(g.mfn).size >= 2) out.set(p, g);
  out.khongSoDuoc = khongSoDuoc;
  return out;
}

/** Lát 1 chỉ tờ khai nhập. Có `loaiToKhai` thì theo đó; oz-gold không có trường này → xuất xứ VN coi là tờ khai xuất. */
function laToKhaiNhap(r) {
  const loai = String(r?.loaiToKhai || '').toUpperCase();
  if (loai) return loai === 'NHAP';
  return String(r?.origin || '').toUpperCase() !== 'VN';
}

/** Tổng lượt khai (ozCount, mặc định 1) theo phân nhóm 6 số. */
function luotTheoPn6(rows) {
  const m = new Map();
  for (const r of rows) {
    const p = nz(r.hsCode).slice(0, 6);
    if (p.length !== 6) continue;
    m.set(p, (m.get(p) || 0) + (Number.isFinite(r.ozCount) ? r.ozCount : 1));
  }
  return m;
}

const tongMap = (m) => [...m.values()].reduce((a, b) => a + b, 0);

/** n phân nhóm chênh thuế nhiều lượt Oz nhất; hoà thì mã tăng dần (tất định). tiLeLuot = % trên tổng lượt nhập. */
function chonLat1(luot, chenh, n = 50) {
  const tong = tongMap(luot);
  return [...luot.keys()].filter((p) => chenh.has(p) && luot.get(p) > 0)
    .sort((a, b) => luot.get(b) - luot.get(a) || a.localeCompare(b))
    .slice(0, n)
    .map((pn6, i) => ({ pn6, hang: i + 1, tiLeLuot: pct(luot.get(pn6), tong) }));
}

/** Kết quả chotDong8 so với mã Oz khai: máy chốt đúng MỘT dòng (CHOT hoặc LOAI_KHAC) → đúng/lệch; còn lại không chốt. */
function phanLoaiMayChot(kq, maOz) {
  if (kq && (kq.ketQua === 'CHOT' || kq.ketQua === 'LOAI_KHAC') && nz(kq.hs).length === 8) {
    return nz(kq.hs) === nz(maOz) ? 'CHOT_DUNG' : 'CHOT_LECH';
  }
  return 'KHONG_CHOT';
}

/**
 * Chạy máy chốt (mặc định lib/so-tay-gates#chotDong8) trên câu khai thật của mỗi mẫu thuộc `pn6Set`, chỉ biết mã 6 số
 * (máy không được biết đáp án 8 số). Đếm theo LƯỢT (ozCount). `chiTiet` có mã + kết quả từng mẫu — RIÊNG TƯ.
 */
function doMayChot(mau, pn6Set, chot) {
  const st = { tong: 0, CHOT_DUNG: 0, CHOT_LECH: 0, KHONG_CHOT: 0, theoKetQua: {}, theoPn6: {}, chiTiet: [] };
  for (const r of mau) {
    const ma = nz(r.hsCode);
    const p = ma.slice(0, 6);
    if (!pn6Set.has(p)) continue;
    const w = Number.isFinite(r.ozCount) ? r.ozCount : 1;
    const specs = Array.isArray(r.specs) ? r.specs.join('; ') : String(r.specs || '');
    const kq = chot({ hs: p, productText: `${r.sampleDesc || ''}\n${specs}` }) || {};
    const loai = phanLoaiMayChot(kq, ma);
    const khoa = `${kq.ketQua || 'KHONG_RO'}:${kq.lyDo || ''}`;
    st.tong += w;
    st[loai] += w;
    st.theoKetQua[khoa] = (st.theoKetQua[khoa] || 0) + w;
    st.theoPn6[p] = st.theoPn6[p] || { tong: 0, CHOT_DUNG: 0, CHOT_LECH: 0, KHONG_CHOT: 0 };
    st.theoPn6[p].tong += w;
    st.theoPn6[p][loai] += w;
    st.chiTiet.push({ hsCode: ma, pn6: p, ozCount: w, ketQua: kq.ketQua || null, lyDo: kq.lyDo || null, mayChon: kq.hs ? nz(kq.hs) : null, phanLoai: loai });
  }
  return st;
}

/**
 * Trần Pareto (định nghĩa của ozplugin docs/gd/ghi-nhan-mo-ta-ecus.md mục 30): lượt Oz máy chốt được 8 số nếu số hoá
 * thêm k phân nhóm. Nền = lượt ở phân nhóm chỉ có MỘT dòng 8 số (hiển nhiên) + lượt máy hiện tại chốt đúng (`chotDung`).
 * Phân nhóm nhiều dòng xếp theo lượt CHƯA chốt giảm dần (hoà → mã tăng dần); số hoá một phân nhóm = chốt hết lượt của nó.
 * Mã Oz không còn trong biểu (phân nhóm không có dòng nào) nằm ở mẫu số nhưng không bao giờ chốt được.
 * @returns {{nen:number, moc:Object<string,number|null>, dong8:Object<string,number|null>, tranToiDa:number, tranTap?:number}}
 */
function tranPareto({ luot, soDong8, chotDung = new Map(), moc = [50, 80, 95], tap = null }) {
  const tong = tongMap(luot);
  let nen = 0;
  const ung = [];
  for (const [p, n] of luot) {
    const d = soDong8.get(p) || 0;
    if (d === 1) nen += n;
    else if (d > 1) {
      const da = Math.min(n, chotDung.get(p) || 0);
      nen += da;
      ung.push([p, n - da, d]);
    }
  }
  ung.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const out = { nen: pct(nen, tong), moc: {}, dong8: {}, tranToiDa: pct(nen + ung.reduce((a, x) => a + x[1], 0), tong) };
  for (const t of moc) {
    let cum = nen; let k = 0; let dong = 0;
    while (cum < (t / 100) * tong && k < ung.length) { cum += ung[k][1]; dong += ung[k][2]; k++; }
    const dat = cum >= (t / 100) * tong;
    out.moc[String(t)] = dat ? k : null;
    out.dong8[String(t)] = dat ? dong : null;
  }
  if (tap) {
    const s = new Set(tap);
    out.tranTap = pct(nen + ung.filter(([p]) => s.has(p)).reduce((a, x) => a + x[1], 0), tong);
  }
  return out;
}

/** Số phân nhóm (xếp theo lượt giảm dần) cần để phủ t % lượt của một tập phân nhóm. */
function paretoTrongTap(luot, tap, moc = [50, 80, 95]) {
  const v = tap.map((p) => luot.get(p) || 0).sort((a, b) => b - a);
  const tong = v.reduce((a, b) => a + b, 0);
  const out = { moc: {} };
  for (const t of moc) {
    let cum = 0; let k = 0;
    while (cum < (t / 100) * tong && k < v.length) cum += v[k++];
    out.moc[String(t)] = k;
  }
  return out;
}

/**
 * Trạng thái số hoá ranh giới 8 số của phân nhóm trong sổ tay hiện có (dong8[].dieuKienSo):
 * CHUA_CO_SO_TAY | CHUA_SO_HOA (không dòng có tên nào có điều kiện) | MOT_PHAN | DU (mọi dòng có tên đều có điều kiện).
 */
function trangThaiSoHoa(pn6, loadSoTay) {
  const s = loadSoTay(pn6.slice(0, 4));
  const dong = (s?.dong8 || []).filter((d) => nz(d.hs).slice(0, 6) === pn6 && nz(d.hs).length === 8);
  if (!dong.length) return 'CHUA_CO_SO_TAY';
  const coTen = dong.filter((d) => !d.loaiKhac);
  const coDk = coTen.filter((d) => Array.isArray(d.dieuKienSo) && d.dieuKienSo.length);
  if (!coDk.length) return 'CHUA_SO_HOA';
  return coDk.length === coTen.length ? 'DU' : 'MOT_PHAN';
}

// ── Cờ "cần bảng hiệu chỉnh tiền lệ" (L1-4b xử lý) ─────────────────────────────────────────────────────────────────
// Máy NGHI, không kết luận: đánh dấu phân nhóm có TB-TCHQ kết luận vào một dòng mà đọc thuần chữ biểu dễ trỏ sang dòng
// anh em. Ba tín hiệu tất định (chỉ dùng TB-TCHQ kết luận 8 số trong data/precedents.json):
//  LK_TRUNG_VAT_LIEU_ANH_EM — kết luận dòng "Loại khác" mà hàng mang vật liệu được nêu ở tên một dòng anh em có tên
//                             (vd cáp bọc nhựa → 8544.42.99 trong khi .94–.96 là "cách điện bằng plastic"); vật liệu đã có
//                             ở tên tổ tiên (cả phân nhóm cùng vật liệu, vd chương 39) không tính.
//  LK_TRUNG_TEN_ANH_EM      — kết luận dòng "Loại khác" mà tên hàng mở đầu bằng (hoặc chứa trọn) tên một dòng anh em.
//  TIEN_LE_HAI_DONG         — hai TB-TCHQ mô tả gần giống (Jaccard âm tiết tên hàng ≥ 0,4) kết luận hai dòng khác nhau.
const LA_LOAI_KHAC = /^[-\s–—]*loại khác\s*:?\s*$/i;
const CHUNG_CHUNG = new Set(['loại', 'khác', 'bộ', 'phận', 'máy', 'thiết', 'bị', 'dụng', 'cụ', 'sản', 'phẩm', 'hàng', 'đồ',
  'vật', 'tấm', 'cái', 'chiếc', 'cho', 'dùng', 'bằng', 'có', 'của', 'các', 'và', 'hoặc', 'trừ', 'kể', 'đã', 'chưa']);
const NGUONG_HAI_DONG = 0.4;

function amDauTenDong(vn) {
  return String(vn || '').replace(/^[-\s–—]+/, '').replace(/\([^)]*\)/g, ' ')
    .split(/[,;:]|\s(?:hoặc|và)\s/)
    .map((t) => syllables(t)[0])
    .filter((w) => w && w.length >= 2 && !CHUNG_CHUNG.has(w) && !/^\d/.test(w));
}
function tuTenHang(t) {
  return new Set(syllables(String(t || '').split(/[;—]/)[0]).filter((w) => w.length >= 2 && !/^\d/.test(w)));
}
function jaccard(a, b) {
  const inter = [...a].filter((w) => b.has(w)).length;
  const hop = a.size + b.size - inter;
  return hop ? inter / hop : 0;
}

/** @returns {{co:boolean, tinHieu:{tinHieu:string, soHieu:string, maKetLuan:string, dongAnhEm:string}[]}} — không mang chữ tiền lệ. */
function canHieuChinhTienLe(pn6, { taxData, precedents, breadcrumb = {} }) {
  const dong = Object.keys(taxData).map(nz).filter((k) => k.length === 8 && k.slice(0, 6) === pn6).sort();
  const vn = (h) => String(taxData[h]?.vn || '');
  const laLK = (h) => LA_LOAI_KHAC.test(vn(h));
  const coTen = dong.filter((h) => !laLK(h));
  const vlToTien = new Set(dong.flatMap((h) => chatLieuTrong((breadcrumb[h]?.vi || []).join(' '))));
  const tb = dong.flatMap((ma) => (precedents?.[ma] || []).filter((p) => String(p.sourceType || '') === 'TB-TCHQ').map((p) => ({ ma, p })));
  const tinHieu = [];
  const daCo = new Set();
  const them = (t) => { const k = Object.values(t).join('|'); if (!daCo.has(k) && tinHieu.length < 8) { daCo.add(k); tinHieu.push(t); } };
  for (const { ma, p } of tb) {
    if (!laLK(ma)) continue;
    const ten = String(p.productName || '');
    const vl = chatLieuTrong(`${ten} ${p.technicalSpec || ''}`);
    const dau = productHead(ten)[0];
    for (const h of coTen) {
      if (h === ma) continue;
      const vlAnhEm = chatLieuTrong(vn(h)).filter((m) => !vlToTien.has(m));
      if (vlAnhEm.some((m) => vl.includes(m))) them({ tinHieu: 'LK_TRUNG_VAT_LIEU_ANH_EM', soHieu: String(p.tbTchqNumber || ''), maKetLuan: ma, dongAnhEm: h });
      if ((dau && amDauTenDong(vn(h)).includes(dau)) || phraseHit(vn(h), ten)) {
        them({ tinHieu: 'LK_TRUNG_TEN_ANH_EM', soHieu: String(p.tbTchqNumber || ''), maKetLuan: ma, dongAnhEm: h });
      }
    }
  }
  for (let i = 0; i < tb.length; i++) {
    for (let j = i + 1; j < tb.length; j++) {
      if (tb[i].ma === tb[j].ma) continue;
      if (jaccard(tuTenHang(tb[i].p.productName), tuTenHang(tb[j].p.productName)) >= NGUONG_HAI_DONG) {
        them({ tinHieu: 'TIEN_LE_HAI_DONG', soHieu: `${tb[i].p.tbTchqNumber || ''}; ${tb[j].p.tbTchqNumber || ''}`, maKetLuan: tb[i].ma, dongAnhEm: tb[j].ma });
      }
    }
  }
  return { co: tinHieu.length > 0, tinHieu };
}

// ── Tệp commit ──────────────────────────────────────────────────────────────────────────────────────────────────────
const KHOA_CAM = new Set(['soLuot', 'tong', 'ozCount', 'luot']);
/** Ném nếu có khoá số lượt tuyệt đối ở bất kỳ độ sâu nào. */
function kiemKhongCoSoLuot(o, duong = '') {
  if (Array.isArray(o)) { o.forEach((x, i) => kiemKhongCoSoLuot(x, `${duong}[${i}]`)); return; }
  if (!o || typeof o !== 'object') return;
  for (const [k, v] of Object.entries(o)) {
    if (KHOA_CAM.has(k)) throw new Error(`lat-1.json không được có số lượt tuyệt đối (${duong}.${k})`);
    kiemKhongCoSoLuot(v, `${duong}.${k}`);
  }
}

const tiLeMay = (st) => (st && st.tong ? {
  chotDung: pct(st.CHOT_DUNG, st.tong), chotLech: pct(st.CHOT_LECH, st.tong), khongChot: pct(st.KHONG_CHOT, st.tong),
} : null);

/** Dựng nội dung data/ho-so/lat-1.json — chỉ tỉ lệ (0,1 %) và mã. */
function dungLat1Json({ bieuThue, chenh, luot, chon, pareto, paretoChenh, mayChot, mayChotGiuRieng = null, chiTietPn6 = {}, ngayDo, soMauNhapBiLoai = 0, tongMauNhap = null }) {
  const tong = tongMap(luot);
  const luotChenh = [...luot].filter(([p]) => chenh.has(p)).reduce((a, [, n]) => a + n, 0);
  const luotLat1 = chon.reduce((a, x) => a + (luot.get(x.pn6) || 0), 0);
  const out = {
    phienBan: 'lat-1@1',
    ngayDo,
    bieuThue,
    nguon: 'data/oz-gold-final.jsonl — chỉ tờ khai nhập; mỗi mẫu tính theo số lượt khai (ozCount)',
    tieuChi: 'phân nhóm 6 số Oz đã khai có ≥ 2 dòng 8 số chênh mức MFN (số); xếp theo lượt khai giảm dần, hoà theo mã tăng dần',
    tongPhanNhomChenh: [...luot.keys()].filter((p) => chenh.has(p) && luot.get(p) > 0).length,
    tiLeLuotTong: pct(luotChenh, tong),
    tiLeLuotLat1: pct(luotLat1, tong),
    ...(tongMauNhap ? { tiLeMauXuatBiLoai: pct(soMauNhapBiLoai, tongMauNhap + soMauNhapBiLoai) } : {}),
    pareto,
    paretoChenh,
    mayChot: {
      dinhNghia: 'chotDong8 (lib/so-tay-gates.js) chỉ biết mã 6 số, chấm dieuKienSo trên câu khai thật; CHOT/LOAI_KHAC một dòng trùng mã Oz = chotDung, khác = chotLech, còn lại = khongChot. % trên lượt của 50 phân nhóm.',
      ...tiLeMay(mayChot),
      theoKetQua: Object.fromEntries(Object.entries(mayChot.theoKetQua || {}).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, pct(v, mayChot.tong)])),
      ...(mayChotGiuRieng && mayChotGiuRieng.tong ? { giuRieng: tiLeMay(mayChotGiuRieng) } : {}),
    },
    phanNhom: chon.map(({ pn6, hang, tiLeLuot }) => {
      const ct = chiTietPn6[pn6] || {};
      const may = mayChot.theoPn6?.[pn6];
      return {
        pn6,
        hang,
        tiLeLuot,
        canHieuChinhTienLe: Boolean(ct.canHieuChinhTienLe?.co),
        ...(ct.trangThaiSoHoa ? { trangThaiSoHoa: ct.trangThaiSoHoa } : {}),
        ...(may && may.tong ? { mayChotDung: pct(may.CHOT_DUNG, may.tong) } : {}),
        ...(ct.canHieuChinhTienLe?.tinHieu?.length ? { tienLeLech: ct.canHieuChinhTienLe.tinHieu } : {}),
      };
    }),
  };
  kiemKhongCoSoLuot(out);
  return out;
}

module.exports = {
  soMfn, soDong8TheoPn6, phanNhomChenhThue, laToKhaiNhap, luotTheoPn6, chonLat1, phanLoaiMayChot, doMayChot,
  tranPareto, paretoTrongTap, trangThaiSoHoa, canHieuChinhTienLe, kiemKhongCoSoLuot, dungLat1Json,
};
