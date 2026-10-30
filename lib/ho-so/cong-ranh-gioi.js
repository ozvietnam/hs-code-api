/**
 * lib/ho-so/cong-ranh-gioi.js — công cụ soạn + CỔNG MÁY cho ranh giới 6→8 số (plan L1-4a, #577; spec hồ sơ §8.1, §11).
 *
 * Một BẢN NHÁP ranh giới (data/ho-so/ranh-gioi/<pn6>.json, phiên bản `ranh-gioi@1`) chứa `dieuKienSo` CÓ KIỂU (tu-vung@1,
 * lược đồ lib/dieu-kien-so.js) cho mọi dòng 8 số và mọi tiêu đề có tên (7/5 số) của MỘT phân nhóm 6 số, mỗi mục kèm
 * `nguon` + `trich` nguyên văn. Máy chặn trước khi người/Claude đọc:
 *
 *   cổng 0  hình dạng + nhãn + quy trình: mục thuộc phân nhóm, không trùng; mọi điều kiện có kiểu (fact ∈ tu-vung@1);
 *           NHAP/TRA_VE ⇒ mọi mục `AI_DA_KIEM`; DUYET ⇒ mọi mục `CLAUDE_DUYET` + bản ghi duyệt của PHIÊN KHÁC người soạn
 *           + băm nội dung khớp (sửa sau duyệt ⇒ đỏ).
 *   cổng 1  phủ kín anh em — theo LUẬT ĐI của lib/dieu-kien-so.js#duongDiDong8 (#575: tiêu đề có tên ⇒ PHAI_CO tiêu đề;
 *           "Loại khác"/không tên ⇒ PHAI_KHONG từng anh em; tới tầng trên cùng là "Loại khác" thì = loaiKhacOf().truDayDu):
 *           mọi nhóm yêu cầu trên đường đi của MỌI dòng phải có điều kiện. Tiêu đề bị lược tên trên đường đi hoặc là anh em
 *           phải phủ định ⇒ chặn `cong1-tieu-de-bi-luoc-ten` (luật đi #583 ghi lyDo, không đoán là "Loại khác"). Anh em là
 *           tiêu đề "Loại khác" trần: luật đi bỏ qua (như dòng LK trần) nên không chặn; riêng tầng có ≥ 2 phần còn lại trần
 *           (tầng có tên bị lược khỏi cây theo chữ số) ⇒ chặn `cong1-tang-bi-luoc`.
 *           Tầng không có con "Loại khác" trần: mọi vector biên phải rơi vào ít nhất một con (không có lỗ hổng).
 *           TẦNG KHÔNG MÃ (lib/ho-so/tang-khong-ma.js → lớp tầng của lib/hs-tree.js): tiêu đề không mã của biểu thuế mà cây
 *           theo chữ số làm mất là nút `<pn6>~r<dòng biểu>` trong cây của phân nhóm (cayPhanNhom, goiSoan, luật đi) — người
 *           soạn khai `dieuKienNut` cho nó như mọi tiêu đề có tên (nguồn tieuDe.<id tầng>). Bỏ qua một tầng có tên (không khai
 *           điều kiện) ⇒ `cong1-tang-khong-ma:<hs>:r<dòng>` ở mọi dòng dưới tầng; tầng "Loại khác:" trần không cần điều kiện.
 *           Tầng không biểu diễn được (cắt ngang tiêu đề số…) ⇒ `cong1-tang-khong-ma-khong-dat:<hs>:r<dòng>` — DỪNG, báo Claude.
 *   cổng 2  loại trừ lẫn nhau — với mọi CẶP dòng, sinh vector dữ kiện tổng hợp từ mọi giá trị biên (SO: biên, biên ± 1e-6·biên;
 *           CO_KHONG: cả hai; LIET_KE: từng giá trị hợp lệ + một giá trị ngoài mọi giá trị liệt kê (DK.NGOAI_LIET_KE, #653); chất liệu: từng vật liệu ở từng vị trí; TEN_LOAI/CONG_DUNG: từng
 *           chữ + một chữ ngoài danh sách) — không vector nào làm HAI dòng cùng CO (doiChieuDong8). Chồng lấn có so chữ tự do
 *           được ghi `khong-tat-dinh` nhưng VẪN là lỗi (không ép qua — plan L1-4a nghiệm thu).
 *           NGOẠI LỆ DUY NHẤT (GĐ 30/10): chồng lấn do CHÍNH chữ biểu (vd 9004.90.10 kính thuốc ↔ .50 kính bảo hộ) mà không có
 *           căn cứ thứ tự — người soạn khai cặp ở `chongLanVanBan[] {cap:[hsA,hsB], lyDo}` ⇒ cổng 2 hạ thành CẢNH BÁO
 *           `cong2-chong-lan-van-ban:…`; khai cặp không chồng lấn ⇒ lỗi `cong2-chong-lan-van-ban-thua`. Không thêm điều kiện
 *           tách mà chữ không nói. Nghĩa lúc chạy: cặp này KHÔNG BAO GIỜ tự chốt — chotDong8 đã trả TRANH_CAP khi cả hai THOA;
 *           apDung mang dấu `chongLanVanBan[] {voi, lyDo}` sang cả hai dòng sổ tay để tầng hồ sơ (L1-5b) trả CANH_BAO + cauHoi.
 *   cổng 3  trích có thật: máy kiểm sổ tay (lib/so-tay.js#checkItem: nguồn được phép, trích nguyên văn, bằng chứng của từng
 *           điều kiện) + chặt hơn ở ranh giới: MỌI đoạn lược (kể cả < 6 ký tự) có trong nguồn, đúng thứ tự; nguồn đúng nút
 *           (tax.<chính dòng>, tieuDe.<chính tiêu đề>, wco.<pn6>, sen.<tổ tiên/con>, chú giải); tệp nguồn mang nhãn NGUYEN_VAN;
 *           điều kiện khớp chữ trích (CO_KHONG đúng cực; SO đúng biên ≤/< mà docGiaTri đọc được từ chính câu trích).
 *
 * Quy trình nhãn (plan L1-4a/L1-4c): AI soạn ⇒ `AI_DA_KIEM` (máy đã kiểm) ⇒ chỉ `duyet()` — phiên khác người soạn, cổng xanh,
 * phân nhóm cờ canHieuChinhTienLe phải có bảng hiệu chỉnh (L1-4b) — mới nâng lên `CLAUDE_DUYET`; `apDung()` chỉ đưa bản
 * DUYET vào data/so-tay/<nhóm>.json. Bản nháp KHÔNG được runtime đọc.
 *
 * Tất định, chỉ đọc, không gọi LLM.
 */
const crypto = require('crypto');
const fs = require('fs');
const T = require('../hs-tree');
const S = require('../so-tay');
const DK = require('../dieu-kien-so');
const TV = require('../tu-vung');
const { nhanCuaTep } = require('../nguon-loai');
const { dataReadPath } = require('../data-paths');
const ML = require('./ma-loi');

const PHIEN_BAN = 'ranh-gioi@1';
const TRANG_THAI = ['NHAP', 'DUYET', 'TRA_VE'];
const NGOAI_DANH_SACH = 'ẑẑẑ'; // chữ ngoài mọi tên/công dụng (có dấu để so được với tên tiếng Việt)
// Số vector tối đa một cặp/tầng được VÉT CẠN (#653: 20.000 → 100.000 — 8544.42 có cặp 58.320). Vượt ⇒ LẤY MẪU tất định
// (hạt giống = khoá cặp/tầng), thongKe.layMau = true + cảnh báo cong1-/cong2-lay-mau; chồng lấn tìm thấy trong mẫu vẫn là lỗi.
const GIOI_HAN_TO_HOP = 100000;

const nz = (v) => String(v == null ? '' : v).replace(/\D/g, '');
const clone = (x) => JSON.parse(JSON.stringify(x));
const tron = (x) => Number(Number(x).toPrecision(12));
const laLoaiKhacTranTen = (n) => /^lo[aạ]i kh[aá]c\s*(\(SEN\))?\s*[:：]?\s*$/i.test(String(n?.tenVi || '').replace(/^[-\s–]+/, '').trim());
const laTieuDe = (n) => n && typeof n.cap === 'string' && n.cap !== 'PHAN';
/** Con "phần còn lại" của một tầng: dòng Loại khác trần, tiêu đề "Loại khác" trần hoặc tiêu đề không tên. */
const laConLai = (n) => (n.cap === 8 ? Boolean(n.loaiKhacTran) : (!n.tenVi || laLoaiKhacTranTen(n)));
const khoa = (f) => { try { return TV.layKhoa(f); } catch { return null; } };

// ── Cây của phân nhóm ────────────────────────────────────────────────────────────────────────────────────────
function cayPhanNhom(pn6) {
  const code = nz(pn6);
  const goc = code.length === 6 ? T.nodeOf(code) : null;
  if (!goc || !(goc.cap === 6 || (goc.cap === 4 && code.endsWith('00')) || goc.cap === 8)) return null;
  if (goc.cap === 8) return { goc, la: [goc], tieuDe: [], tang: [] };
  // Lớp tầng (lib/hs-tree.js): nút tầng không mã `<pn6>~r<dòng>` là tiêu đề như mọi tiêu đề khác.
  const la = []; const tieuDe = []; const tang = [goc];
  const walk = (id) => {
    const n = T.nodeOf(id); if (!n) return;
    if (n.cap === 8) { la.push(n); return; }
    if (n !== goc) { tieuDe.push(n); tang.push(n); }
    T.conTang(n.id).forEach(walk);
  };
  walk(goc.id);
  return { goc, la, tieuDe, tang };
}
// Nút theo id (lớp tầng: id tầng `<pn6>~r<dòng>` cũng được). Mã/id trong bản nháp chuẩn hoá bằng T.chuanMa (giữ id tầng).
const nut = (id) => (id ? T.nodeOf(id) : null);

/** Mục có nội dung ranh giới: điều kiện có kiểu, hoặc phanConLai đứng một mình (#653: phần còn lại có tên, không điều kiện). */
const coNoiDung = (m) => Boolean(m && typeof m === 'object') && ((Array.isArray(m.dieuKienSo) && m.dieuKienSo.length > 0) || DK.coPhanConLai(m));
/** Bản nháp → hình dạng sổ tay mà lib/dieu-kien-so.js đọc (chỉ mục có điều kiện hoặc phanConLai đứng một mình). */
function soTayTuNhap(pn6, b) {
  const lay = (m) => ({ nguon: m.nguon, trich: m.trich, nguonLoai: m.nguonLoai, dieuKienSo: m.dieuKienSo, ...(m.phanConLai !== undefined ? { phanConLai: m.phanConLai } : {}) });
  return {
    nhom: nz(pn6).slice(0, 4),
    dong8: (b?.dong8 || []).filter(coNoiDung).map((m) => ({ hs: nz(m.hs), ...lay(m) })),
    dieuKienNut: (b?.dieuKienNut || []).filter(coNoiDung).map((m) => ({ id: T.chuanMa(m.id), ...lay(m) })),
  };
}

/** Băm nội dung ranh giới (không gồm nhãn/trạng thái): đổi điều kiện, nguồn hay trích sau khi duyệt ⇒ băm lệch. */
function bamRanhGioi(b) {
  // phanConLai thuộc nội dung (đổi luật đi); chỉ thêm khoá khi có, để băm bản cũ không đổi.
  const sx = (a, k) => [...(a || [])].map((m) => ({ ma: T.chuanMa(m[k]), nguon: m.nguon || null, trich: m.trich || null, dieuKienSo: m.dieuKienSo || [], ...(m.phanConLai !== undefined ? { phanConLai: m.phanConLai } : {}) })).sort((x, y) => x.ma.localeCompare(y.ma));
  const noiDung = { pn6: nz(b?.pn6), dong8: sx(b?.dong8, 'hs'), dieuKienNut: sx(b?.dieuKienNut, 'id') };
  // Cặp CHONG_LAN_VAN_BAN thuộc nội dung (đổi sau duyệt ⇒ lệch băm); chỉ thêm khoá khi có, để băm bản cũ không đổi.
  const cl = [...capChongLan(b)].map(([cap, lyDo]) => ({ cap, lyDo })).sort((x, y) => x.cap.localeCompare(y.cap));
  if (cl.length) noiDung.chongLanVanBan = cl;
  return crypto.createHash('sha256').update(JSON.stringify(noiDung)).digest('hex');
}

// ── Lát 1 + bảng hiệu chỉnh tiền lệ ─────────────────────────────────────────────────────────────────────────
function lat1() {
  try { return JSON.parse(fs.readFileSync(dataReadPath('ho-so', 'lat-1.json'), 'utf8')); } catch { return { phanNhom: [] }; }
}
function canHieuChinh(pn6) { return Boolean(lat1().phanNhom.find((p) => p.pn6 === nz(pn6))?.canHieuChinhTienLe); }
/** Bảng hiệu chỉnh tiền lệ (L1-4b, data/ho-so/hieu-chinh-tien-le.json) có mục cho phân nhóm này chưa. */
function coHieuChinh(pn6) {
  try {
    const j = JSON.parse(fs.readFileSync(dataReadPath('ho-so', 'hieu-chinh-tien-le.json'), 'utf8'));
    const ds = Array.isArray(j) ? j : (j.muc || []);
    return ds.some((m) => nz(m.maHs).startsWith(nz(pn6)) || nz(m.dongChuBieu).startsWith(nz(pn6)));
  } catch { return false; }
}
/** 10 phân nhóm của đợt n (1…5) theo hạng của data/ho-so/lat-1.json. */
function phanNhomCuaDot(n) {
  const ds = [...lat1().phanNhom].sort((a, b) => a.hang - b.hang);
  return ds.slice((n - 1) * 10, n * 10).map((p) => p.pn6);
}

// ── Cổng 0: hình dạng, nhãn, quy trình ──────────────────────────────────────────────────────────────────────
function kiemHinhDang(pn6, b, cay) {
  const loi = [];
  if (!b || typeof b !== 'object') return ['cong0-khong-phai-object'];
  if (b.phienBan !== PHIEN_BAN) loi.push(`cong0-phien-ban:${b.phienBan || ''}`);
  if (nz(b.pn6) !== pn6) loi.push(`cong0-pn6-lech:${b.pn6 || ''}`);
  if (!cay) return [...loi, `cong0-phan-nhom-khong-co-trong-cay:${pn6}`];
  if (cay.la.length < 2) loi.push(`cong0-phan-nhom-mot-dong:${pn6}`);
  if (!String(b.soanBoi?.phien || '').trim()) loi.push('cong0-thieu-nguoi-soan');
  if (!TRANG_THAI.includes(b.trangThai)) loi.push(`cong0-trang-thai:${b.trangThai || ''}`);
  const nhanCan = b.trangThai === 'DUYET' ? 'CLAUDE_DUYET' : 'AI_DA_KIEM';
  const laIds = new Set(cay.la.map((n) => n.id));
  const tdIds = new Set(cay.tieuDe.map((n) => n.id));
  const kiemDs = (ds, k, hop) => {
    if (ds !== undefined && !Array.isArray(ds)) { loi.push(`cong0-khong-phai-mang:${k}`); return; }
    const thay = new Set();
    for (const m of ds || []) {
      const ma = T.chuanMa(m?.[k]);
      if (!hop.has(ma)) { loi.push(`cong0-ngoai-phan-nhom:${ma || m?.[k]}`); continue; }
      if (thay.has(ma)) loi.push(`cong0-trung:${ma}`);
      thay.add(ma);
      if (m.nguonLoai !== nhanCan) loi.push(`cong0-nhan:${ma}:${m.nguonLoai || ''}`);
      if (m.phanConLai !== undefined) loi.push(...kiemPhanConLai(ma, m));
      if (!Array.isArray(m.dieuKienSo)) { loi.push(`cong0-thieu-dieu-kien-so:${ma}`); continue; }
      for (const c of m.dieuKienSo) {
        if (c && c.op === 'HOAC') {
          // HOAC có kiểu (DNF): ≥ 2 phương án, mỗi phương án nhóm VÀ khoá tu-vung, không lồng, không chieu.
          const alts = Array.isArray(c.phuongAn) ? c.phuongAn : [];
          const vế = alts.flat();
          if (alts.length < 2 || c.chieu !== undefined || alts.some((a) => !Array.isArray(a) || !a.length) || vế.some((cc) => !cc || typeof cc !== 'object' || cc.op === 'HOAC')) loi.push(`cong0-hoac-hinh-dang:${ma}`);
          else for (const cc of vế) if (!DK.laFactTuVung(cc.fact)) loi.push(loiKhoa(ma, cc.fact));
          continue;
        }
        if (!c || typeof c !== 'object' || !DK.laFactTuVung(c.fact)) loi.push(loiKhoa(ma, c?.fact || c?.op || ''));
      }
    }
  };
  kiemDs(b.dong8, 'hs', laIds);
  kiemDs(b.dieuKienNut, 'id', tdIds);
  loi.push(...kiemChongLanKhai(b, laIds));
  loi.push(...kiemGhiChu(b, cay).loi);
  if (b.trangThai === 'DUYET') {
    if (!b.duyet || !String(b.duyet.phien || '').trim()) loi.push('cong0-duyet-thieu');
    else if (cungNguoi(b.duyet.phien, b.soanBoi?.phien)) loi.push('cong0-tu-duyet');
    else if (b.duyet.bam !== bamRanhGioi(b)) loi.push('cong0-sua-sau-duyet');
  }
  return loi;
}

/**
 * Cổng 0 cho `phanConLai` (phần còn lại CÓ TÊN, #577): true (phủ định mọi anh em đứng trước) hoặc mảng mã anh em; chỉ trên
 * dòng/tiêu đề có tên — dòng/tiêu đề "Loại khác…" vốn đã phủ định anh em. Điều kiện khẳng định của chính mục là tuỳ chọn
 * (#653: "Động cơ khác" mà cả phân nhóm đều là động cơ ⇒ phanConLai đứng một mình). `false` (#653) = khai rõ KHÔNG phải phần
 * còn lại (tắt cảnh báo nghi-phan-con-lai), luật đi như không ghi.
 */
function kiemPhanConLai(ma, m) {
  const n = nut(ma); const p = n && nut(T.chaTang(ma));
  if (!n || !p) return [`cong0-phan-con-lai-hinh-dang:${ma}`];
  const anhEm = T.conTang(p.id);
  const laLK = n.cap === 8 ? Boolean(n.loaiKhac) : /^lo[aạ]i kh[aá]c\b/i.test(String(n.tenVi || '').replace(/^[-\s–]+/, '').trim());
  if (laLK) return [`cong0-phan-con-lai-thua:${ma}`];
  const v = m.phanConLai;
  if (v === false) return [];
  if (v === true) return anhEm.indexOf(ma) > 0 ? [] : [`cong0-phan-con-lai-khong-co-anh-em-truoc:${ma}`];
  if (!Array.isArray(v) || !v.length) return [`cong0-phan-con-lai-hinh-dang:${ma}`];
  return v.map(T.chuanMa).filter((id) => id === ma || !anhEm.includes(id)).map((id) => `cong0-phan-con-lai-sai-anh-em:${ma}:${id}`);
}

// ── Lược đồ ghiChuSoan (#577): {ma, loai, ghiChu, khoaDeXuat?} ─────────────────────────────────────────────────────
const LOAI_GHI_CHU = ['QUYET_DINH', 'DE_TRONG', 'CHONG_LAN', 'LECH_TIEN_LE', 'THIEU_KHOA_TU_VUNG', 'DUNG'];
/** Lỗi (hình dạng, loai sai, thiếu khoaDeXuat) + cảnh báo (thiếu loai — bản cũ, ma lạ) + dừng (THIEU_KHOA_TU_VUNG, DUNG). */
function kiemGhiChu(b, cay) {
  const loi = []; const canhBao = []; const dung = [];
  if (b.ghiChuSoan === undefined) return { loi, canhBao, dung };
  if (!Array.isArray(b.ghiChuSoan)) return { loi: ['cong0-khong-phai-mang:ghiChuSoan'], canhBao, dung };
  const maHop = new Set([...(cay ? [...cay.la, ...cay.tieuDe].map((n) => n.id) : []), nz(b.pn6)]);
  b.ghiChuSoan.forEach((g, i) => {
    if (!g || typeof g !== 'object' || !String(g.ma || '').trim() || !String(g.ghiChu || '').trim()) { loi.push(`cong0-ghi-chu-hinh-dang:${i}`); return; }
    if (g.loai === undefined) canhBao.push(`cong0-ghi-chu-thieu-loai:${i}`);
    else if (!LOAI_GHI_CHU.includes(g.loai)) loi.push(`cong0-ghi-chu-loai:${i}:${g.loai}`);
    const ma = String(g.ma); const cap = ma.split('+').map(T.chuanMa);
    if (!(maHop.has(T.chuanMa(ma)) && (/^\d+$/.test(ma) || T.laIdTang(ma))) && !(cap.length === 2 && cap.every((x) => maHop.has(x)))) canhBao.push(`cong0-ghi-chu-ma-la:${i}:${ma}`);
    if (g.loai === 'THIEU_KHOA_TU_VUNG') {
      if (!String(g.khoaDeXuat || '').trim()) loi.push(`cong0-ghi-chu-thieu-khoa-de-xuat:${i}`);
      dung.push(`THIEU_KHOA_TU_VUNG:${ma}:${g.khoaDeXuat || ''}`);
    }
    if (g.loai === 'DUNG') dung.push(`DUNG:${ma}`);
  });
  return { loi, canhBao, dung };
}

/** Lỗi khoá không có trong tu-vung@1 (fact cũ snake_case / không có fact). */
const loiKhoa = (ma, fact) => `cong0-fact-chua-co-kieu:${ma}:${fact || ''}`;

// ── Định danh phiên (#577): <định danh>#<vai>-<nhãn> ────────────────────────────────────────────────────────────
// định danh: URL phiên Claude (https://claude.ai/code/session_…) hoặc thợ ngoài (cursor:<mô hình>:<yyyymmddThhmm>, gh:<login>…),
// không khoảng trắng, không "#"; vai: soan (người soạn) | soat (người soát); nhãn: [A-Za-z0-9._-] (thường là pn6 / tên lô).
const RE_PHIEN = /^([^\s#]{6,})#(soan|soat)-([A-Za-z0-9][A-Za-z0-9._-]*)$/;
/** null = đúng quy ước cho vai; chuỗi lỗi khi sai. */
function kiemPhien(phien, vai) {
  const m = String(phien || '').match(RE_PHIEN);
  if (!m) return `phien-sai-quy-uoc:${phien || ''} — cần <định danh>#${vai}-<nhãn>, vd https://claude.ai/code/session_…#${vai}-830220`;
  if (vai && m[2] !== vai) return `phien-sai-vai:${m[2]} — cần #${vai}-<nhãn>`;
  return null;
}
/** Hai phiên là CÙNG một người: trùng hẳn, hoặc trùng định danh + nhãn mà chỉ đổi vai. */
function cungNguoi(a, b) {
  if (String(a || '') === String(b || '')) return true;
  const x = String(a || '').match(RE_PHIEN); const y = String(b || '').match(RE_PHIEN);
  return Boolean(x && y && x[1] === y[1] && x[3] === y[3]);
}

/** Khoá cặp không phụ thuộc thứ tự: "a+b" với a < b. */
const khoaCap = (x, y) => [nz(x), nz(y)].sort().join('+');
/** Cặp CHONG_LAN_VAN_BAN đã khai (Map khoá cặp → lyDo); chỉ mục đủ hình dạng. */
function capChongLan(b) {
  const m = new Map();
  for (const x of Array.isArray(b?.chongLanVanBan) ? b.chongLanVanBan : []) {
    if (!x || !Array.isArray(x.cap) || x.cap.length !== 2) continue;
    const [p, q] = x.cap.map(nz); if (!p || p === q) continue;
    if (!m.has(khoaCap(p, q))) m.set(khoaCap(p, q), String(x.lyDo || '').trim());
  }
  return m;
}
/** Cổng 0 cho `chongLanVanBan`: mảng; mỗi mục hai dòng 8 số KHÁC nhau của phân nhóm, có lý do, không trùng cặp. */
function kiemChongLanKhai(b, laIds) {
  const loi = [];
  if (b.chongLanVanBan === undefined) return loi;
  if (!Array.isArray(b.chongLanVanBan)) return ['cong0-khong-phai-mang:chongLanVanBan'];
  const thay = new Set();
  b.chongLanVanBan.forEach((x, i) => {
    const cap = Array.isArray(x?.cap) ? x.cap.map(nz) : [];
    if (cap.length !== 2 || !cap[0] || !cap[1] || cap[0] === cap[1]) { loi.push(`cong0-chong-lan-hinh-dang:${i}`); return; }
    for (const ma of cap) if (!laIds.has(ma)) loi.push(`cong0-chong-lan-ngoai-phan-nhom:${ma}`);
    const k = khoaCap(cap[0], cap[1]);
    if (thay.has(k)) loi.push(`cong0-chong-lan-trung:${k}`);
    thay.add(k);
    if (!String(x.lyDo || '').trim()) loi.push(`cong0-chong-lan-thieu-ly-do:${k}`);
  });
  return loi;
}

// ── Cổng 3: trích có thật ───────────────────────────────────────────────────────────────────────────────────
const TEP_NGUON = { tax: 'tax.json', wco: 'wco-hs-international.csv', sen: 'sen-2022.json', tieuDe: 'bieu-thue/ten-nut/ten-nut.json' };
function tepCuaNguon(nguon) {
  const loai = String(nguon || '').split('.')[0];
  if (TEP_NGUON[loai]) return TEP_NGUON[loai];
  if (/^nhom\d{4}$/.test(loai)) return 'chu-giai-heading.json';
  if (/^(ch|phan)\d{2}$/.test(loai)) return 'chu-giai-chuong.json';
  return null;
}
/** Nguồn có đúng nút không: dòng/tiêu đề chỉ được trích chữ của chính nó (hoặc chú giải / SEN tổ tiên-con / tên WCO của pn6). */
function nguonDungNut(nguon, ma, pn6) {
  const s = String(nguon || ''); const i = s.indexOf('.');
  const loai = s.slice(0, i); const id = loai === 'tieuDe' ? T.chuanMa(s.slice(i + 1)) : nz(s.slice(i + 1));
  if (loai === 'tax' || loai === 'tieuDe') return id === ma;
  if (loai === 'wco') return id === pn6;
  if (loai === 'sen') return ma.startsWith(id) || id.startsWith(ma);
  return /^(nhom\d{4}|ch\d{2}|phan\d{2})$/.test(loai);
}
/** Mọi đoạn lược (tách bằng "…"/"...") phải có trong nguồn, đúng thứ tự — kể cả đoạn ngắn mà máy sổ tay bỏ qua. */
function kiemDoan(trich, src) {
  const frags = String(trich || '').split(/…|\.{3,}/).map(S.squash).filter(Boolean);
  const s = S.squash(src); let pos = 0;
  for (const f of frags) {
    const i = s.indexOf(f, pos);
    if (i < 0) return s.includes(f) ? 'cong3-trich-sai-thu-tu' : 'cong3-trich-doan-khong-co';
    pos = i + f.length;
  }
  return null;
}
/** Điều kiện khớp chữ trích: CO_KHONG đúng cực, SO đúng biên/op mà docGiaTri đọc được từ chính câu trích. */
function kiemKhopChu(ma, m, canhBao = []) {
  const loi = []; const tr = String(m.trich || '');
  const theoFact = new Map();
  for (const c of DK.traiPhang(m.dieuKienSo)) { if (!c) continue; if (!theoFact.has(c.fact)) theoFact.set(c.fact, []); theoFact.get(c.fact).push(c); }
  for (const [fact, ds] of theoFact) {
    const k = khoa(fact); if (!k) continue;
    if (k.kieu !== 'CO_KHONG' && k.kieu !== 'SO') continue;
    let r = null; try { r = TV.docGiaTri(fact, tr); } catch { r = null; }
    // Biên số mà bộ đọc không đọc được từ chính câu trích ⇒ cổng KHÔNG tự đối chiếu ≤/< — người soát đối chiếu tay.
    if (k.kieu === 'SO' && !(r && r.trangThai === 'DA_CO' && typeof r.giaTri === 'number' && r.op && r.op !== '=')) canhBao.push(`cong3-bien-khong-doc-duoc:${ma}:${fact}`);
    if (!r || r.trangThai !== 'DA_CO') continue;
    if (k.kieu === 'CO_KHONG' && typeof r.giaTri === 'boolean' && ds.some((c) => (c.op === 'CO') !== r.giaTri)) loi.push(`cong3-cuc-tinh-nguoc:${ma}:${fact}`);
    if (k.kieu === 'SO' && typeof r.giaTri === 'number' && r.op && r.op !== '=') {
      const rv = TV.quyDoi(fact, r.giaTri, r.donVi);
      const khop = ds.some((c) => { const cv = TV.quyDoi(fact, c.value, c.donVi); return c.op === r.op && cv != null && rv != null && Math.abs(cv - rv) <= 1e-9 * Math.max(1, Math.abs(rv)); });
      if (!khop) loi.push(`cong3-bien-lech-chu:${ma}:${fact}`);
    }
  }
  return loi;
}
const TRICH_TOI_DA = 300; // LUAT-CHUNG luật 2
function kiemTrich(pn6, b, canhBao = []) {
  const loi = [];
  const h4 = pn6.slice(0, 4);
  const src = S.sourcesFor(h4);
  const srcNut = { ...src, ...S.nguonTieuDe(h4) };
  const mot = (kind, m, ma, nguon) => {
    const coDk = Array.isArray(m.dieuKienSo) && m.dieuKienSo.length > 0;
    if (kind === 'dieuKienNut' && !coDk && !DK.coPhanConLai(m)) return; // tiêu đề chưa có điều kiện: cổng 1 báo
    if (!coDk && !m.trich) return;
    const l = S.checkItem(kind, { ...m, ...(kind === 'dong8' ? { hs: ma } : { id: ma }) }, nguon, h4);
    if (l) { loi.push(`cong3-muc:${ma}:${l}`); return; }
    const d = kiemDoan(m.trich, nguon[m.nguon]); if (d) loi.push(`${d}:${ma}`);
    if (!nguonDungNut(m.nguon, ma, pn6)) loi.push(`cong3-nguon-sai-nut:${ma}:${m.nguon}`);
    const tep = tepCuaNguon(m.nguon);
    if (!tep || nhanCuaTep(tep) !== 'NGUYEN_VAN') loi.push(`cong3-nguon-khong-nguyen-van:${ma}:${m.nguon}`);
    if (coDk) loi.push(...kiemKhopChu(ma, m, canhBao));
    if (coDk && String(m.trich || '').length > TRICH_TOI_DA) loi.push(`cong3-trich-qua-dai:${ma}:${String(m.trich).length}`);
    if (m.phanConLai !== undefined && m.phanConLai !== false && !/(^|[^\p{L}])kh[aá]c([^\p{L}]|$)/iu.test(String(m.trich || '').normalize('NFC'))) loi.push(`cong3-phan-con-lai-khong-co-chu-khac:${ma}`);
  };
  for (const m of b.dong8 || []) if (m && typeof m === 'object') mot('dong8', m, nz(m.hs), src);
  for (const m of b.dieuKienNut || []) if (m && typeof m === 'object') mot('dieuKienNut', m, T.chuanMa(m.id), srcNut);
  return loi;
}

// ── Ứng viên vector biên ─────────────────────────────────────────────────────────────────────────────────────
const dsGiaTri = (v) => (Array.isArray(v) ? v : [v]);
function moiDieuKien(soTay) { return DK.traiPhang([...soTay.dong8, ...soTay.dieuKienNut].flatMap((m) => m.dieuKienSo || [])); }
/** Map fact → danh sách giá trị dữ kiện (giaTri, donVi?) bao mọi vùng giữa các biên của phân nhóm. */
function bangUngVien(soTay) {
  const theo = new Map();
  const them = (f, v) => { if (!theo.has(f)) theo.set(f, []); const a = theo.get(f); if (!a.some((x) => JSON.stringify(x) === JSON.stringify(v))) a.push(v); };
  const viTriCL = new Map(); const maCua = new Map();
  for (const c of moiDieuKien(soTay)) {
    const k = khoa(c.fact); if (!k) continue;
    if (k.kieu === 'SO') {
      const t = TV.quyDoi(c.fact, c.value, c.donVi); if (t == null) continue;
      const d = t === 0 ? 1e-6 : Math.abs(t) * 1e-6;
      for (const v of [t - d, t, t + d]) them(c.fact, { giaTri: tron(v), donVi: k.donViChuan });
    } else if (k.kieu === 'CO_KHONG') { them(c.fact, { giaTri: true }); them(c.fact, { giaTri: false }); }
    else if (k.kieu === 'LIET_KE') {
      for (const v of k.giaTriHopLe || []) them(c.fact, { giaTri: v });
      them(c.fact, { giaTri: DK.NGOAI_LIET_KE }); // #653: hàng không thuộc giá trị nào đã liệt kê (dòng dưới "Loại khác")
    }
    else if (k.kieu === 'TEN_LOAI' || k.kieu === 'CONG_DUNG') {
      for (const v of dsGiaTri(c.value)) them(c.fact, { giaTri: v }); them(c.fact, { giaTri: NGOAI_DANH_SACH });
      if (!maCua.has(c.fact)) maCua.set(c.fact, new Set());
      for (const v of dsGiaTri(c.value)) for (const r of DK.maThamChieu(v)) maCua.get(c.fact).add(r);
    }
    else if (k.kieu === 'CHAT_LIEU_THEO_VI_TRI') viTriCL.set(c.fact, new Set([...(viTriCL.get(c.fact) || []), c.viTri || 'CHINH']));
  }
  // dungCho theo cấp mã (#577): mỗi mã chương/nhóm được nêu sinh thêm một mã con KHÁC mọi mã đã nêu ("nhóm 87.xx") — vector
  // "thuộc Chương 87 nhưng ngoài các nhóm liệt kê" để dòng "Loại khác" dưới tiêu đề "xe thuộc Chương 87" được thử.
  for (const [f, ma] of maCua) {
    for (const r of ma) {
      if (r.length !== 2 && r.length !== 4) continue;
      for (let x = 99; x >= 10; x -= 1) {
        const con = `${r}${x}`;
        if ([...ma].some((m) => m.startsWith(con) || con.startsWith(m) && m !== r && m.length > r.length)) continue;
        them(f, { giaTri: r.length === 2 ? `nhóm ${r}.${x}` : `phân nhóm ${r.slice(0, 4)}.${x}` });
        break;
      }
    }
  }
  for (const [f, vts] of viTriCL) {
    const k = khoa(f); let combos = [[]];
    for (const vt of vts) combos = combos.flatMap((cb) => (k.giaTriHopLe || []).map((cl) => [...cb, { viTri: vt, chatLieu: cl }]));
    for (const cb of combos) them(f, { giaTri: cb });
  }
  return theo;
}
const factCua = (ds) => [...new Set((ds || []).flatMap((c) => DK.factCuaDieuKien(c)))];
const duKienTu = (vec) => [...vec].map(([fact, v]) => ({ fact, ...v, nguon: 'KHACH', trangThai: 'DA_CO', bangChung: 'vector-bien' }));
const fmtGiaTri = (g) => (Array.isArray(g) ? g.map((x) => `${x.viTri}:${x.chatLieu}`).join('+') : String(g));
const fmtVector = (vec) => [...vec].map(([f, v]) => `${f}=${fmtGiaTri(v.giaTri)}`).join(',');
function* toHop(facts, bang) {
  const n = facts.length; const idx = new Array(n).fill(0);
  if (facts.some((f) => !(bang.get(f) || []).length)) return;
  while (true) {
    yield new Map(facts.map((f, i) => [f, bang.get(f)[idx[i]]]));
    let i = n - 1;
    while (i >= 0) { idx[i] += 1; if (idx[i] < bang.get(facts[i]).length) break; idx[i] = 0; i -= 1; }
    if (i < 0) return;
  }
}
const soToHop = (facts, bang) => facts.reduce((a, f) => a * (bang.get(f) || []).length, 1);
/** FNV-1a 32 bit của chuỗi — hạt giống tất định cho lấy mẫu. */
function bamHatGiong(s) { let h = 2166136261 >>> 0; for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; }
/** mulberry32: bộ sinh số giả ngẫu nhiên tất định theo hạt giống. */
function sinhNgauNhien(a) {
  let x = a >>> 0;
  return () => { x = (x + 0x6D2B79F5) >>> 0; let t = x; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/**
 * Tổ hợp vector biên: ≤ gioiHan ⇒ vét cạn (toHop); vượt ⇒ gioiHan vector KHÁC NHAU lấy mẫu đều theo hạt giống (tất định: cùng
 * bản nháp + cùng mã ⇒ cùng mẫu). #653.
 */
function* toHopMau(facts, bang, gioiHan, hatGiong) {
  if (soToHop(facts, bang) <= gioiHan) { yield* toHop(facts, bang); return; }
  const rnd = sinhNgauNhien(bamHatGiong(hatGiong)); const lens = facts.map((f) => bang.get(f).length);
  const thay = new Set();
  for (let thu = 0; thay.size < gioiHan && thu < gioiHan * 4; thu += 1) {
    const idx = lens.map((l) => Math.floor(rnd() * l)); const k = idx.join(',');
    if (thay.has(k)) continue;
    thay.add(k);
    yield new Map(facts.map((f, i) => [f, bang.get(f)[idx[i]]]));
  }
}

/**
 * Ứng viên GHÉP cha–con (#653): nút trên và nút dưới trên đường đi của một dòng cùng ghi khoá chữ tự do (TEN_LOAI/CONG_DUNG)
 * với giá trị không thoả nhau (9503.00: tiêu đề "Búp bê" ↔ dòng .22 "Quần áo …") — một vector chỉ mang một giá trị nên cổng 2
 * không bao giờ thử được nhánh dưới. Sinh thêm giá trị "<giá trị dưới> <giá trị trên>" thoả CẢ HAI (hàng "quần áo búp bê").
 * @returns {Set<string>} khoá điểm mù đã ghép được: `<fact>:<nút trên>><nút dưới>`
 */
function themUngVienGhep(cay, soTay, bang) {
  const da = new Set();
  const laTuDo = (c) => c && ['TEN_LOAI', 'CONG_DUNG'].includes(c.op) && c.chieu !== 'PHAI_KHONG';
  const thoa = (c, v) => DK.danhGiaDieuKien(c, { fact: c.fact, giaTri: v }).trangThai === 'THOA';
  for (const leaf of cay.la) {
    const dd = DK.duongDiDong8(leaf.id, { soTay });
    if (dd.lyDo) continue;
    const co = dd.nhom.filter((g) => g.chieu === 'PHAI_CO' && g.dieuKien);
    for (let i = 0; i < co.length; i += 1) {
      for (let j = i + 1; j < co.length; j += 1) {
        for (const cd of co[i].dieuKien.filter(laTuDo)) {
          for (const ct of co[j].dieuKien.filter((c) => laTuDo(c) && c.fact === cd.fact)) {
            for (const v of dsGiaTri(cd.value)) {
              if (thoa(ct, v)) continue;
              for (const u of dsGiaTri(ct.value)) {
                const g = `${v} ${u}`;
                if (!thoa(cd, g) || !thoa(ct, g)) continue;
                const a = bang.get(cd.fact) || []; if (!a.some((x) => x.giaTri === g)) a.push({ giaTri: g }); bang.set(cd.fact, a);
                da.add(`${cd.fact}:${co[j].nut}>${co[i].nut}`);
              }
            }
          }
        }
      }
    }
  }
  return da;
}

/** Mọi điều kiện THOẢ trên dữ kiện đã chuẩn (Map fact → mục). */
const thoaHet = (ds, F) => ds.every((c) => DK.danhGiaTrenMap(c, F).trangThai === 'THOA');

// ── Cổng 1: phủ kín ──────────────────────────────────────────────────────────────────────────────────────────
function kiemPhuKin(pn6, cay, soTay, bang, gioiHan = GIOI_HAN_TO_HOP) {
  const loi = []; const canhBao = []; const them = (l) => { if (!loi.includes(l)) loi.push(l); };
  let soVector = 0; let layMau = false;
  for (const leaf of cay.la) {
    for (let a = nut(T.chaTang(leaf.id)); a && a.id !== cay.goc.id; a = nut(T.chaTang(a.id))) if (laTieuDe(a) && !a.tenVi) them(`cong1-tieu-de-bi-luoc-ten:${leaf.id}:${a.id}`);
    const dd = DK.duongDiDong8(leaf.id, { soTay });
    if (dd.lyDo) { them(`cong1-${dd.lyDo}:${leaf.id}`); continue; }
    for (const g of dd.nhom) {
      if (g.dieuKien) continue;
      // Lý do cấu trúc do luật đi ghi (#583): tieu-de-bi-luoc-ten | tang-bi-luoc. Không lý do = chỉ là chưa số hoá.
      if (g.lyDo) them(`cong1-${g.lyDo}:${leaf.id}:${g.nut}`);
      else them(`cong1-chua-so-hoa:${leaf.id}:${g.nut}`);
    }
  }
  // Tầng không mã của biểu thuế (lib/hs-tree.js lớp tầng): tầng có nút mà bản nháp BỎ QUA (tầng có tên, không khai
  // dieuKienNut) ⇒ báo mọi dòng dưới tầng; tầng "Loại khác:" trần không cần điều kiện (luật đi phủ định anh em); tầng TRUNG
  // (cùng tập lá với tiêu đề đã có tên) không báo. Tầng không biểu diễn được ⇒ chặn mọi dòng dưới tầng — DỪNG, báo Claude.
  for (const x of T.tangCua(pn6).ds) {
    if (x.trangThai === 'KHONG_DAT') { for (const hs of x.dongDuoi) them(`cong1-tang-khong-ma-khong-dat:${hs}:r${x.r}`); continue; }
    if (x.trangThai !== 'CO_NUT' || laLoaiKhacTranTen(nut(x.id)) || soTay.dieuKienNut.some((m) => m.id === x.id)) continue;
    for (const hs of x.dongDuoi) them(`cong1-tang-khong-ma:${hs}:r${x.r}`);
  }
  // Tầng không có con "phần còn lại": mọi vector biên phải vào ít nhất một con (điều kiện riêng của con).
  const dkCua = (n) => (n.cap === 8 ? soTay.dong8.find((m) => m.hs === n.id) : soTay.dieuKienNut.find((m) => m.id === n.id))?.dieuKienSo || null;
  for (const X of cay.tang) {
    const kids = T.conTang(X.id).map(nut).filter(Boolean);
    if (!kids.length || kids.some(laConLai)) continue;
    const dks = kids.map(dkCua);
    if (dks.some((d) => !d)) continue; // đã báo chưa số hoá
    // Chỉ vector THOẢ điều kiện của chính tầng X và các tiêu đề có điều kiện phía trên (trong phân nhóm): vector trái điều
    // kiện tầng cha không thuộc tầng này, không phải lỗ hổng (851810: tiêu đề "Micro" — vector tenLoai=<chữ lạ> bị bỏ).
    const dkCha = [];
    for (let a = X; a && a.id !== cay.goc.id; a = nut(T.chaTang(a.id))) { const d = dkCua(a); if (d) dkCha.push(...d); }
    const facts = factCua([...dks.flat(), ...dkCha]).sort();
    const tong = soToHop(facts, bang);
    if (tong > gioiHan) { layMau = true; canhBao.push(`cong1-lay-mau:${X.id}:${gioiHan}/${tong}`); }
    for (const vec of toHopMau(facts, bang, gioiHan, `c1|${pn6}|${X.id}`)) {
      // Tầng gốc không có con phần còn lại: biểu khẳng định các con PHỦ HẾT phân nhóm — vật mang tên/công dụng ngoài mọi chữ
      // của các con thì ngoài phân nhóm (850131: động cơ / máy phát), không phải lỗ hổng. Biên số vẫn thử đủ.
      if (X === cay.goc && [...vec.values()].some((v) => v.giaTri === NGOAI_DANH_SACH)) continue;
      // Giá trị liệt kê tổng hợp (#653) chỉ để cổng 2 tới được nhánh "Loại khác"; tầng không có con phần còn lại mà các con
      // chia theo khoá liệt kê thì biểu khẳng định các giá trị đã liệt kê phủ hết tầng — không phải lỗ hổng (như trước #653).
      if ([...vec.values()].some((v) => v.giaTri === DK.NGOAI_LIET_KE)) continue;
      const F = DK.chuanDuKien(duKienTu(vec));
      if (!thoaHet(dkCha, F)) continue;
      soVector += 1;
      const vao = dks.some((ds) => thoaHet(ds, F));
      if (!vao) { them(`cong1-khong-phu-kin:${X.id}:${fmtVector(vec)}`); break; }
    }
  }
  return { loi, canhBao, soVector, layMau };
}

// ── Cổng 2: loại trừ lẫn nhau ────────────────────────────────────────────────────────────────────────────────
function kiemLoaiTru(pn6, cay, soTay, bang, khai = new Map(), gioiHan = GIOI_HAN_TO_HOP, ghep = new Set()) {
  const loi = []; const canhBao = []; let soVector = 0; let layMau = false;
  const daXet = new Set(); const chongThat = new Set();
  const duongDu = cay.la.map((n) => ({ id: n.id, dd: DK.duongDiDong8(n.id, { soTay }) }))
    .filter((x) => !x.dd.lyDo && x.dd.nhom.every((g) => g.dieuKien)); // dòng chưa số hoá đủ không bao giờ CO — cổng 1 đã báo
  const duong = duongDu
    .map((x) => ({ id: x.id, facts: factCua(x.dd.nhom.flatMap((g) => g.dieuKien)).sort(), dkCo: x.dd.nhom.filter((g) => g.chieu === 'PHAI_CO').flatMap((g) => g.dieuKien) }));
  const memo = new Map();
  const cham = (d, vec) => {
    const key = `${d.id}|${d.facts.map((f) => JSON.stringify(vec.get(f))).join('|')}`;
    if (!memo.has(key)) {
      const r = DK.doiChieuDong8(d.id, duKienTu(new Map(d.facts.map((f) => [f, vec.get(f)]))), { soTay });
      memo.set(key, { co: r.ketQua === 'CO', tatDinh: r.coCanCuTatDinh });
    }
    return memo.get(key);
  };
  for (let i = 0; i < duong.length; i += 1) {
    for (let j = i + 1; j < duong.length; j += 1) {
      const a = duong[i]; const b = duong[j];
      const facts = [...new Set([...a.facts, ...b.facts])].sort();
      const n = soToHop(facts, bang);
      const k = khoaCap(a.id, b.id);
      // Lấy mẫu (#653): không tìm thấy chồng lấn trong mẫu ≠ đã xét hết ⇒ không dùng để kết luận khai CHONG_LAN_VAN_BAN thừa.
      if (n > gioiHan) { layMau = true; canhBao.push(`cong2-lay-mau:${a.id}+${b.id}:${gioiHan}/${n}`); } else daXet.add(k);
      for (const vec of toHopMau(facts, bang, gioiHan, `c2|${pn6}|${k}`)) {
        soVector += 1;
        const ra = cham(a, vec); if (!ra.co) continue;
        const rb = cham(b, vec); if (!rb.co) continue;
        // Tên cụ thể hơn thắng (lib/dieu-kien-so.js#tenCuTheHon): "bàn đạp" (.11) lấn "Bàn" (.12) — không phải chồng lấn.
        if (DK.tenCuTheHon(a.dkCo, b.dkCo, DK.chuanDuKien(duKienTu(vec))) !== 0) continue;
        const duoi = `${a.id}+${b.id}:${fmtVector(vec)}${ra.tatDinh && rb.tatDinh ? '' : ':khong-tat-dinh'}`;
        chongThat.add(k);
        if (khai.has(k)) canhBao.push(`cong2-chong-lan-van-ban:${duoi}`); else loi.push(`cong2-chong-lan:${duoi}`);
        break;
      }
    }
  }
  // Dòng không vector biên nào tới được (CO) ⇒ mọi cặp của nó được "xét" suông — xanh giả. Thường do cùng khoá chữ tự do ở
  // tiêu đề và dòng con với hai giá trị khác nhau (một vector chỉ mang một giá trị) — 401699 .17 "xe đạp" dưới "Chương 87".
  const khongToi = new Set();
  for (const d of duong) {
    const mau = soToHop(d.facts, bang) > gioiHan;
    let toi = false;
    for (const vec of toHopMau(d.facts, bang, gioiHan, `c2-toi|${pn6}|${d.id}`)) { soVector += 1; if (cham(d, vec).co) { toi = true; break; } }
    if (toi) continue;
    khongToi.add(d.id);
    // Mẫu không tới được ≠ không tới được: chỉ cảnh báo (như trước #653).
    if (mau) { layMau = true; canhBao.push(`cong2-qua-nhieu-to-hop:${d.id}`); } else loi.push(`cong2-dong-khong-toi-duoc:${d.id}`);
  }
  // Điểm mù khoá chữ tự do cha–con: giá trị của nút dưới không thoả điều kiện cùng khoá của nút trên ⇒ hai điều kiện không
  // bao giờ cùng THOẢ trên một vector (cổng 2 không thử được nhánh dưới).
  const daBao = new Set();
  for (const x of duongDu) {
    const co = x.dd.nhom.filter((g) => g.chieu === 'PHAI_CO' && g.dieuKien);
    for (let i = 0; i < co.length; i += 1) {
      for (let j = i + 1; j < co.length; j += 1) {
        const duoi = co[i]; const tren = co[j]; // nhom đi từ dòng lên gốc
        for (const cd of duoi.dieuKien) {
          if (!cd || !['TEN_LOAI', 'CONG_DUNG'].includes(cd.op) || cd.chieu === 'PHAI_KHONG') continue;
          const ct = tren.dieuKien.filter((c) => c && c.fact === cd.fact && c.chieu !== 'PHAI_KHONG' && ['TEN_LOAI', 'CONG_DUNG'].includes(c.op));
          if (!ct.length) continue;
          const mu = dsGiaTri(cd.value).some((v) => ct.some((c) => DK.danhGiaDieuKien(c, { fact: cd.fact, giaTri: v }).trangThai !== 'THOA'));
          const k = `cong2-diem-mu:${cd.fact}:${tren.nut}>${duoi.nut}`;
          // Đã ghép ứng viên cha–con (#653) và dòng tới được ⇒ không còn điểm mù.
          if (ghep.has(`${cd.fact}:${tren.nut}>${duoi.nut}`) && !khongToi.has(x.id)) continue;
          if (mu && !daBao.has(k)) { daBao.add(k); canhBao.push(k); }
        }
      }
    }
  }
  // Khai CHONG_LAN_VAN_BAN cho cặp đã xét mà không chồng lấn ⇒ nhãn sai sự thật.
  for (const k of khai.keys()) if (daXet.has(k) && !chongThat.has(k)) loi.push(`cong2-chong-lan-van-ban-thua:${k}`);
  return { loi, canhBao, soVector, chongThat, layMau };
}

// ── Chính sách CHONG_LAN_VAN_BAN (GĐ 30/10 + #577) ───────────────────────────────────────────────────────────────
const SO_NHANH_TRUC = 3;
/** Hai nút con của tổ tiên chung thấp nhất trên đường của dòng a và dòng b (nơi chữ biểu rẽ nhánh). */
function reNhanh(a, b) {
  const len = (id) => { const ds = []; for (let x = nut(id); x; x = nut(T.chaTang(x.id))) ds.push(x.id); return ds; };
  const la = len(a); const lb = len(b);
  const chung = la.find((id) => lb.includes(id));
  return { x: la[la.indexOf(chung) - 1], y: lb[lb.indexOf(chung) - 1], duongA: la.slice(0, la.indexOf(chung)), duongB: lb.slice(0, lb.indexOf(chung)) };
}
/**
 * Cặp khai CHONG_LAN_VAN_BAN chỉ dành cho chữ biểu TỰ chồng lấn:
 *  - lyDo phải TRÍCH (trong ngoặc kép) chữ biểu của CẢ HAI nhánh — chữ của một nút trên đường từ nơi rẽ nhánh xuống dòng
 *    ⇒ thiếu: `cong3-chong-lan-thieu-trich:<cặp>:<dòng>`;
 *  - một nhánh chồng với ≥ 3 nhánh anh em khác nhau = chồng lấn theo TRỤC (nhánh chia theo công dụng cạnh nhánh chia theo
 *    tên — 392690, 401699), không phải chữ biểu tự chồng ⇒ `cong2-chong-lan-truc:<nút>:<các nhánh>` — DỪNG, báo Claude.
 */
function kiemChinhSachChongLan(pn6, banNhap, chongThat) {
  const loi = []; const khai = capChongLan(banNhap);
  const h4 = pn6.slice(0, 4); const src = { ...S.sourcesFor(h4), ...S.nguonTieuDe(h4) };
  const chuCua = (id) => src[`${id.length === 8 ? 'tax' : 'tieuDe'}.${id}`] || nut(id)?.tenVi || '';
  const trichTrong = (lyDo) => [...String(lyDo || '').matchAll(/["“”]([^"“”]{2,}?)["“”]/g)].map((m) => m[1]).filter((q) => S.squash(q).length >= 4);
  const ke = new Map(); const noi = (u, v) => { if (!ke.has(u)) ke.set(u, new Set()); ke.get(u).add(v); };
  for (const [k, lyDo] of khai) {
    if (!chongThat.has(k)) continue;
    const [a, b] = k.split('+');
    const rn = reNhanh(a, b);
    if (!rn.x || !rn.y) continue;
    noi(rn.x, rn.y); noi(rn.y, rn.x);
    const q = trichTrong(lyDo);
    for (const [dong, duong] of [[a, rn.duongA], [b, rn.duongB]]) {
      if (!q.some((t) => duong.some((id) => kiemDoan(t, chuCua(id)) === null))) loi.push(`cong3-chong-lan-thieu-trich:${k}:${dong}`);
    }
  }
  for (const [u, vs] of ke) if (vs.size >= SO_NHANH_TRUC) loi.push(`cong2-chong-lan-truc:${u}:${[...vs].sort().join(',')}`);
  return loi;
}

/**
 * Chạy bốn cổng trên một bản nháp ranh giới.
 * opts.cong (#653): tập cổng cần chạy, mặc định [0, 1, 2, 3]; cổng 0 luôn chạy. [0, 3] = hình dạng + trích có thật, KHÔNG sinh
 * vector (test bản nháp đã commit — thời gian không lớn theo số vector). `cong3-chong-lan-thieu-trich` cần kết quả cổng 2 nên
 * chỉ có khi chạy cổng 2. opts.gioiHanToHop: giới hạn vét cạn (mặc định GIOI_HAN_TO_HOP).
 * @returns {{pn6, hopLe:boolean, loi:string[], canhBao:string[], dung:string[], phamVi:number[], thongKe:{soDong, soTieuDe, soDongCoDieuKien, soTieuDeCoDieuKien, soVector, layMau}}}
 */
function kiemRanhGioi(pn6, banNhap, opts = {}) {
  const phamVi = [...new Set([0, ...(Array.isArray(opts.cong) ? opts.cong : [1, 2, 3]).map(Number)])].filter((x) => [0, 1, 2, 3].includes(x)).sort();
  const gioiHan = Number.isFinite(opts.gioiHanToHop) && opts.gioiHanToHop > 0 ? opts.gioiHanToHop : GIOI_HAN_TO_HOP;
  const code = nz(pn6);
  const cay = cayPhanNhom(code);
  const loi = kiemHinhDang(code, banNhap, cay);
  const canhBao = [];
  const thongKe = { soDong: cay ? cay.la.length : 0, soTieuDe: cay ? cay.tieuDe.length : 0, soDongCoDieuKien: 0, soTieuDeCoDieuKien: 0, soVector: 0, layMau: false };
  if (!cay || !banNhap || typeof banNhap !== 'object' || cay.la.length < 2) return { pn6: code, hopLe: false, loi, canhBao, dung: loi.filter(ML.laDung), phamVi, thongKe };
  if (banNhap.soanBoi?.phien && kiemPhien(banNhap.soanBoi.phien, 'soan')) canhBao.push('cong0-phien-sai-quy-uoc:soanBoi');
  const gc = kiemGhiChu(banNhap, cay); canhBao.push(...gc.canhBao);
  const soTay = soTayTuNhap(code, banNhap);
  thongKe.soDongCoDieuKien = soTay.dong8.length; thongKe.soTieuDeCoDieuKien = soTay.dieuKienNut.length;
  if (phamVi.includes(3)) loi.push(...kiemTrich(code, banNhap, canhBao));
  if (phamVi.includes(1) || phamVi.includes(2)) {
    const bang = bangUngVien(soTay);
    const ghep = themUngVienGhep(cay, soTay, bang);
    const c1 = phamVi.includes(1) ? kiemPhuKin(code, cay, soTay, bang, gioiHan) : { loi: [], canhBao: [], soVector: 0, layMau: false };
    loi.push(...c1.loi); canhBao.push(...c1.canhBao);
    const c2 = phamVi.includes(2) ? kiemLoaiTru(code, cay, soTay, bang, capChongLan(banNhap), gioiHan, ghep) : null;
    if (c2) { loi.push(...c2.loi); canhBao.push(...c2.canhBao); loi.push(...kiemChinhSachChongLan(code, banNhap, c2.chongThat)); }
    thongKe.soVector = c1.soVector + (c2 ? c2.soVector : 0);
    thongKe.layMau = Boolean(c1.layMau || c2?.layMau);
  }
  // Cờ canHieuChinhTienLe (#653): bảng L1-4b đã có mục cho PN6 ⇒ chỉ cảnh báo thông tin (người soát đọc mục bảng); có cờ mà
  // bảng chưa có mục ⇒ DỪNG (duyet/apDung cũng từ chối).
  if (canHieuChinh(code)) canhBao.push(coHieuChinh(code) ? `can-bang-hieu-chinh-tien-le-da-co:${code}` : `can-bang-hieu-chinh-tien-le:${code}:chua-co — data/ho-so/hieu-chinh-tien-le.json chưa có mục cho PN6 này (L1-4b); không duyệt/áp được`);
  for (const n of [...cay.la, ...cay.tieuDe]) {
    const m = n.cap === 8 ? (banNhap.dong8 || []).find((x) => nz(x?.hs) === n.id) : (banNhap.dieuKienNut || []).find((x) => T.chuanMa(x?.id) === n.id);
    if (DK.nghiPhanConLai(n) && m?.phanConLai === undefined) canhBao.push(`nghi-phan-con-lai:${n.id}`);
  }
  for (const m of soTay.dong8.concat(soTay.dieuKienNut)) {
    const tu = DK.traiPhang(m.dieuKienSo).filter((c) => c && ['TEN_LOAI', 'CONG_DUNG'].includes(khoa(c.fact)?.kieu)).map((c) => c.fact);
    if (tu.length) canhBao.push(`so-chu-tu-do:${m.hs || m.id}:${[...new Set(tu)].join(',')}`);
  }
  // DỪNG (#577): điều kiện người soạn không được tự xử lý — tầng không mã, chồng lấn theo trục, thiếu khoá tu-vung, …
  const dung = [...new Set([...gc.dung, ...loi.filter(ML.laDung), ...canhBao.filter(ML.laDung)])];
  return { pn6: code, hopLe: loi.length === 0, loi, canhBao, dung, phamVi, thongKe };
}

// ── Quy trình: duyệt / trả về / áp vào sổ tay ────────────────────────────────────────────────────────────────
const ganNhan = (b, nhan) => { for (const m of [...(b.dong8 || []), ...(b.dieuKienNut || [])]) m.nguonLoai = nhan; return b; };
/** Nâng bản nháp lên DUYET / CLAUDE_DUYET. Ném lỗi khi: phân nhóm cần bảng hiệu chỉnh mà chưa có, cùng phiên người soạn, cổng đỏ. */
function duyet(banNhap, { phien, ngay, ghiChu } = {}) {
  const pn6 = nz(banNhap?.pn6);
  if (canHieuChinh(pn6) && !coHieuChinh(pn6)) throw new Error(`can-bang-hieu-chinh-tien-le:${pn6} — cần mục trong data/ho-so/hieu-chinh-tien-le.json (L1-4b) trước khi duyệt`);
  if (!String(phien || '').trim()) throw new Error('thieu-phien-duyet');
  if (cungNguoi(phien, banNhap?.soanBoi?.phien)) throw new Error('cung-phien-nguoi-soan: người soạn không tự duyệt (L1-4c: agent Claude mới) — cong0-tu-duyet');
  const lp = kiemPhien(phien, 'soat'); if (lp) throw new Error(lp);
  const nhap = ganNhan({ ...clone(banNhap), trangThai: 'NHAP', duyet: null }, 'AI_DA_KIEM');
  const r = kiemRanhGioi(pn6, nhap);
  if (!r.hopLe) throw new Error(`cong-do: ${r.loi.join('; ')}`);
  const out = ganNhan({ ...nhap, trangThai: 'DUYET' }, 'CLAUDE_DUYET');
  out.duyet = { boi: 'CLAUDE_DUYET', phien, ngay: ngay || null, ...(ghiChu ? { ghiChu } : {}), bam: bamRanhGioi(out) };
  return out;
}
/** Trả bản nháp về người soạn kèm lý do (giữ AI_DA_KIEM). */
function traVe(banNhap, { phien, ngay, lyDo } = {}) {
  if (!String(lyDo || '').trim()) throw new Error('thieu-ly-do-tra-ve');
  const out = ganNhan({ ...clone(banNhap), trangThai: 'TRA_VE', duyet: null }, 'AI_DA_KIEM');
  out.traVe = [...(banNhap.traVe || []), { phien: phien || null, ngay: ngay || null, lyDo }];
  return out;
}
/**
 * Áp bản DUYET vào sổ tay nhóm (hàm thuần — trả bản mới). Mỗi mục áp phải qua lib/so-tay.js#checkItem.
 * Dòng 8 số: thay nguon/trich/dieuKienSo, `dieuKien` = lời máy ghép từ điều kiện, nhãn CLAUDE_DUYET, dấu vết `ranhGioi`.
 */
function apDung(banNhap, soTay) {
  if (banNhap?.trangThai !== 'DUYET') throw new Error('chua-duyet: chỉ áp bản DUYET');
  const pn6 = nz(banNhap.pn6); const h4 = pn6.slice(0, 4);
  if (canHieuChinh(pn6) && !coHieuChinh(pn6)) throw new Error(`can-bang-hieu-chinh-tien-le:${pn6}`);
  const r = kiemRanhGioi(pn6, banNhap);
  if (!r.hopLe) throw new Error(`cong-do: ${r.loi.join('; ')}`);
  if (!soTay || soTay.nhom !== h4) throw new Error(`so-tay-khong-khop-nhom:${h4}`);
  const out = clone(soTay);
  const dauVet = { phienBan: PHIEN_BAN, duyet: { phien: banNhap.duyet.phien, ngay: banNhap.duyet.ngay, bam: banNhap.duyet.bam } };
  const src = S.sourcesFor(h4); const srcNut = { ...src, ...S.nguonTieuDe(h4) };
  const loi = [];
  out.dong8 = out.dong8 || [];
  for (const m of banNhap.dong8 || []) {
    if (!coNoiDung(m)) continue;
    const hs = nz(m.hs);
    const i = out.dong8.findIndex((d) => nz(d.hs) === hs);
    const cu = i >= 0 ? out.dong8[i] : { hs, loaiKhac: S.isLoaiKhac(hs) };
    const { tieuChi, ...giu } = cu;
    const moi = { ...giu, dieuKien: (m.dieuKienSo || []).map(DK.moTaNgan).join('; ') || 'phần còn lại có tên (phủ định anh em)', nguon: m.nguon, trich: m.trich, dieuKienSo: clone(m.dieuKienSo || []), nguonLoai: 'CLAUDE_DUYET', ranhGioi: dauVet, ...(m.phanConLai !== undefined ? { phanConLai: clone(m.phanConLai) } : {}) };
    if (tieuChi && !S.checkTieuChi(tieuChi, m.trich)) moi.tieuChi = tieuChi;
    const l = S.checkItem('dong8', moi, src, h4); if (l) loi.push(`${hs}:${l}`);
    if (i >= 0) out.dong8[i] = moi; else out.dong8.push(moi);
  }
  const nuts = [...(out.dieuKienNut || [])];
  for (const m of banNhap.dieuKienNut || []) {
    if (!coNoiDung(m)) continue;
    const id = T.chuanMa(m.id);
    const moi = { id, nguon: m.nguon, trich: m.trich, dieuKienSo: clone(m.dieuKienSo || []), nguonLoai: 'CLAUDE_DUYET', ranhGioi: dauVet, ...(m.phanConLai !== undefined ? { phanConLai: clone(m.phanConLai) } : {}) };
    const l = S.checkItem('dieuKienNut', moi, srcNut, h4); if (l) loi.push(`${id}:${l}`);
    const i = nuts.findIndex((d) => T.chuanMa(d.id) === id);
    if (i >= 0) nuts[i] = moi; else nuts.push(moi);
  }
  if (nuts.length) out.dieuKienNut = nuts.sort((a, b) => T.chuanMa(a.id).localeCompare(T.chuanMa(b.id)));
  // Dấu CHONG_LAN_VAN_BAN sang cả hai dòng (runtime không tự chốt cặp này — tầng hồ sơ trả CANH_BAO + cauHoi).
  for (const [k, lyDo] of capChongLan(banNhap)) {
    const [p, q] = k.split('+');
    for (const [x, y] of [[p, q], [q, p]]) {
      const d = out.dong8.find((m) => nz(m.hs) === x); if (!d) continue;
      d.chongLanVanBan = [...(d.chongLanVanBan || []).filter((c) => c.voi !== y), { voi: y, lyDo }];
    }
  }
  out.dong8.sort((a, b) => nz(a.hs).localeCompare(nz(b.hs)));
  if (loi.length) throw new Error(`so-tay-tu-choi: ${loi.join('; ')}`);
  const kc = S.kiemCay(out, h4);
  if (kc.loi.length) throw new Error(`lech-cay: ${kc.loi.join('; ')}`);
  return out;
}

// ── Công cụ soạn: gói soạn + khung nháp ──────────────────────────────────────────────────────────────────────
const LUAT_SOAN = [
  'Chỉ dùng khoá tu-vung@1 (danh sách tuVung) với đúng op của kiểu; không dùng fact cũ snake_case, không HOAC.',
  'trich chép NGUYÊN VĂN từ đúng nguồn của chính mục (tax.<chính dòng>, tieuDe.<chính tiêu đề>, SEN/chú giải); mọi đoạn lược "…" phải có trong nguồn, đúng thứ tự.',
  'Điều kiện chỉ nói điều câu trích nói (LUAT-CHUNG luật 7): biên ≤/< đúng chữ ("không quá" = <=, "dưới" = <, "trên" = >, "từ … trở lên" = >=); "Không …" = op KHONG.',
  'Dòng "Loại khác" trần và tiêu đề "Loại khác" trần: không ghi điều kiện (máy phủ định anh em). "Loại khác, <vế>": chỉ ghi điều kiện của vế.',
  'Tiêu đề có tên (dieuKienNut): nguồn tieuDe.<id> = tên nguyên văn biểu thuế Tổng cục.',
  'Không diễn đạt được bằng từ vựng hiện có → để trống dieuKienSo và ghi ghiChuSoan {ma, ghiChu}: cổng 1 sẽ chặn, đúng ý (không ép).',
  'Không tự gắn CLAUDE_DUYET; nhãn do duyet() của phiên soát độc lập gán.',
  'Tầng không mã của biểu thuế (tiêu đề không mã mà cây theo chữ số làm mất) là nút `<pn6>~r<dòng>` trong cây của gói: tầng có tên ⇒ khai dieuKienNut cho id đó (nguồn tieuDe.<pn6>~r<dòng>), bỏ qua ⇒ cong1-tang-khong-ma; tầng "Loại khác:" trần không ghi điều kiện. Gói có tầng trangThai KHONG_DAT ⇒ DỪNG, báo Claude (cổng 1 chặn mọi dòng dưới tầng, không có cách vượt).',
  'Chữ biểu TỰ chồng lấn (hai dòng cùng thoả, chữ không tách): không bịa điều kiện tách; khai chongLanVanBan [{cap:[hsA,hsB], lyDo}] (cổng 2 thành cảnh báo, runtime không tự chốt). Thứ tự ưu tiên chỉ khi có căn cứ trích được (TB-TCHQ, SEN/chú giải, GIR qua lib/gir.js).',
];
/**
 * Gợi ý THIẾU KHOÁ tu-vung (#577): chữ biểu có ý mà tu-vung@1 chưa có khoá (đề xuất ở docs/giao-viec/so-tay/de-xuat-tu-vung-2.md).
 * Chỉ là gợi ý cho người soạn kiểm --tu-vung; không có khoá thì DỪNG (THIEU_KHOA_TU_VUNG), không tự đặt khoá.
 */
const MAU_THIEU_KHOA = [
  [/(^|[^\p{L}])(một|hai|ba|bốn|năm|\d+)\s+(sợi|lõi)|sợi\s+hoặc\s+hơn|lõi\s+hoặc\s+hơn|nhiều\s+(sợi|lõi)|lõi\s+đơn/iu, 'soLoi/soSoi — số lõi, số sợi'],
  [/\d+\s*\/\s*\d+\s*(đường kính|chiều|độ dày)|tỷ lệ|tỉ lệ|lần đường kính/iu, 'tiLe — tỉ lệ kích thước'],
  [/chỉ\s+(hoặc\s+chủ\s+yếu|sử dụng\s+hoặc\s+chủ\s+yếu)|chủ\s+yếu\s+(dùng|sử dụng)/iu, 'chiHoacChuYeu — "chỉ hoặc chủ yếu dùng cho"'],
  [/phương pháp|được\s+(đúc|rèn|cán|kéo|dập|hàn|ép|thổi)\b|(đúc|rèn|cán)\s+(nóng|nguội)/iu, 'phuongPhapCheTao — phương pháp chế tạo'],
];
function nghiThieuKhoa(ten) {
  const t = String(ten || '').normalize('NFC');
  return MAU_THIEU_KHOA.filter(([re]) => re.test(t)).map(([, goiY]) => goiY);
}
function nguonCuaNut(n, src, srcNut) {
  const ds = [];
  if (n.cap === 8 && src[`tax.${n.id}`]) ds.push({ nguon: `tax.${n.id}`, text: src[`tax.${n.id}`] });
  if (n.cap !== 8 && srcNut[`tieuDe.${n.id}`]) ds.push({ nguon: `tieuDe.${n.id}`, text: srcNut[`tieuDe.${n.id}`] });
  for (const [k, v] of Object.entries(src)) if (k.startsWith('sen.') && nz(k) === n.id) ds.push({ nguon: k, text: v.slice(0, 1200) });
  return ds;
}
/** Gói soạn tất định cho một phân nhóm (đưa cho agent soạn): cây, mục cần số hoá + chữ nguyên văn, từ vựng, luật. */
function goiSoan(pn6) {
  const code = nz(pn6);
  const cay = cayPhanNhom(code);
  if (!cay) throw new Error(`phan-nhom-khong-co-trong-cay:${code}`);
  const h4 = code.slice(0, 4);
  const src = S.sourcesFor(h4); const srcNut = { ...src, ...S.nguonTieuDe(h4) };
  const thuTu = []; const walk = (id) => { const n = nut(id); if (!n) return; if (n !== cay.goc) thuTu.push(n); if (n.cap !== 8) T.conTang(n.id).forEach(walk); };
  if (cay.goc.cap !== 8) walk(cay.goc.id);
  const canSoHoa = thuTu.map((n) => ({
    ma: n.id, loai: n.cap === 8 ? 'DONG8' : 'TIEU_DE', cha: T.chaTang(n.id), ten: n.tenVi || null,
    loaiKhac: n.cap === 8 ? Boolean(n.loaiKhac) : laLoaiKhacTranTen(n),
    khongCanDieuKien: laConLai(n) && Boolean(n.tenVi || n.cap === 8),
    ...(DK.nghiPhanConLai(n) ? { nghiPhanConLai: true } : {}),
    ...(nghiThieuKhoa(n.tenVi).length ? { nghiThieuKhoa: nghiThieuKhoa(n.tenVi) } : {}),
    ...(laTieuDe(n) && !n.tenVi ? { chan: 'tieu-de-bi-luoc-ten' } : {}),
    nguon: nguonCuaNut(n, src, srcNut),
  }));
  const nguonPhanNhom = Object.entries(src).filter(([k]) => k === `wco.${code}` || (k.startsWith('sen.') && code.startsWith(nz(k)))).map(([k, v]) => ({ nguon: k, text: v.slice(0, 1200) }));
  const chuGiai = Object.keys(src).filter((k) => /^(nhom|ch|phan)\d+\./.test(k)).map((k) => ({ nguon: k, doDai: src[k].length }));
  const tv = TV.taiTuVung ? TV.taiTuVung() : JSON.parse(fs.readFileSync(dataReadPath('tu-vung', 'tu-vung@1.json'), 'utf8'));
  const tuVung = (tv.khoa || []).map((k) => ({ khoa: k.khoa, kieu: k.kieu, nhanVi: k.nhanVi, op: DK.OP_THEO_KIEU[k.kieu], ...(k.donViChuan ? { donViChuan: k.donViChuan } : {}), ...(k.giaTriHopLe ? { giaTriHopLe: k.giaTriHopLe } : {}) }));
  // Tầng không mã gốc kèm trạng thái lớp tầng: CO_NUT (id nút) | TRUNG (nut) | KHONG_DAT (lyDo — DỪNG).
  const tangKhongMa = T.tangCua(code).ds;
  return { pn6: code, nhom: h4, phienBan: PHIEN_BAN, bieuThue: T.tree().bieuThue || null, ten: { wco: cay.goc.tenEn || null, vi: cay.goc.tenVi || null }, canHieuChinhTienLe: canHieuChinh(code), coHieuChinhTienLe: canHieuChinh(code) && coHieuChinh(code), cay: T.renderTang(code), tangKhongMa, canSoHoa, nguonPhanNhom, chuGiai, tuVung, luat: LUAT_SOAN };
}
/** Khung nháp: mọi dòng + mọi tiêu đề có tên, trích = chữ nguyên văn của chính nó, chưa có điều kiện (cổng 1 đỏ tới khi soạn xong). */
function taoKhung(pn6, { phien, ngay } = {}) {
  const g = goiSoan(pn6);
  const muc = (x) => ({ nguon: x.nguon[0]?.nguon || null, trich: x.nguon[0]?.text || null, dieuKienSo: [], nguonLoai: 'AI_DA_KIEM' });
  return {
    phienBan: PHIEN_BAN, pn6: g.pn6, nhom: g.nhom, bieuThue: g.bieuThue, tuVung: 'tu-vung@1', trangThai: 'NHAP',
    soanBoi: { vai: 'AI', phien: phien || null, ngay: ngay || null }, duyet: null,
    dieuKienNut: g.canSoHoa.filter((x) => x.loai === 'TIEU_DE' && !x.khongCanDieuKien && !x.chan && x.nguon.length).map((x) => ({ id: x.ma, ...muc(x) })),
    dong8: g.canSoHoa.filter((x) => x.loai === 'DONG8').map((x) => ({ hs: x.ma, ...muc(x) })),
    ghiChuSoan: [],
  };
}

// ── Spec khai báo → bản nháp (#577, --ap-spec): thợ không sửa tay JSON nháp ───────────────────────────────────────
const PHIEN_BAN_SPEC = 'ranh-gioi-spec@1';
const KHOA_SPEC = ['phienBan', 'pn6', 'phien', 'dong8', 'dieuKienNut', 'chongLanVanBan', 'ghiChuSoan'];
const KHOA_CAM = ['nguonLoai', 'trangThai', 'duyet', 'soanBoi', 'traVe'];
const KHOA_MUC = ['dieuKienSo', 'trich', 'nguon', 'phanConLai'];
const KHOA_GHI_CHU = ['ma', 'loai', 'ghiChu', 'khoaDeXuat'];
/**
 * Áp một spec `ranh-gioi-spec@1` lên khung nháp của phân nhóm (hàm thuần, tất định):
 *   { phienBan, pn6, phien: "<định danh>#soan-<nhãn>",
 *     dong8: { "<hs8>": { dieuKienSo: [...], trich?, nguon?, phanConLai? } | [điều kiện…] },
 *     dieuKienNut: { "<id tiêu đề>": … }, chongLanVanBan?: [{cap, lyDo}], ghiChuSoan?: [{ma, loai, ghiChu, khoaDeXuat?}] }
 * Bản nháp sinh lại TỪ KHUNG mỗi lần (mục không nhắc tới = chữ nguyên văn của chính nó, chưa điều kiện); giữ lịch sử trả về.
 * @returns {{banNhap: object|null, loi: string[], dung: string[]}} loi = spec sai (không ghi); dung = THIEU_KHOA_TU_VUNG (không ghi).
 */
function apSpec(spec, banCu = null, { ngay = null } = {}) {
  const loi = []; const dung = [];
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) return { banNhap: null, loi: ['spec-hinh-dang:khong-phai-object'], dung };
  for (const k of Object.keys(spec)) {
    if (KHOA_CAM.includes(k)) loi.push(`spec-khoa-cam:${k} — chỉ máy/Claude ghi khoá này`);
    else if (!KHOA_SPEC.includes(k)) loi.push(`spec-hinh-dang:khoa-la:${k} — khoá hợp lệ: ${KHOA_SPEC.join(', ')}`);
  }
  if (spec.phienBan !== PHIEN_BAN_SPEC) loi.push(`spec-hinh-dang:phienBan — cần "${PHIEN_BAN_SPEC}"`);
  const pn6 = nz(spec.pn6);
  const cay = pn6.length === 6 ? cayPhanNhom(pn6) : null;
  if (!cay) return { banNhap: null, loi: [...loi, `spec-hinh-dang:pn6:${spec.pn6 || ''} — không có trong cây`], dung };
  const lp = kiemPhien(spec.phien, 'soan'); if (lp) loi.push(`spec-hinh-dang:phien:${lp}`);
  if (banCu && banCu.trangThai === 'DUYET') loi.push('spec-da-duyet: bản nháp đã DUYET — không sửa bằng spec; báo Claude (cần --tra-ve trước)');
  const laIds = new Set(cay.la.map((n) => n.id));
  const tdIds = new Set(cay.tieuDe.filter((n) => n.tenVi && !laConLai(n)).map((n) => n.id));
  const docMuc = (nhom, ma, v) => {
    const duong = `${nhom}.${ma}`;
    const m = Array.isArray(v) ? { dieuKienSo: v } : v;
    if (!m || typeof m !== 'object') { loi.push(`spec-hinh-dang:${duong} — cần {dieuKienSo: [...]} hoặc mảng điều kiện`); return null; }
    for (const k of Object.keys(m)) {
      if (KHOA_CAM.includes(k)) loi.push(`spec-khoa-cam:${duong}.${k} — chỉ máy/Claude ghi khoá này`);
      else if (!KHOA_MUC.includes(k)) loi.push(`spec-hinh-dang:${duong}.${k} — khoá mục hợp lệ: ${KHOA_MUC.join(', ')}`);
    }
    if (!Array.isArray(m.dieuKienSo)) { loi.push(`spec-hinh-dang:${duong}.dieuKienSo — phải là mảng (để trống: [])`); return null; }
    for (const c of DK.traiPhang(m.dieuKienSo)) {
      if (c && typeof c === 'object' && c.fact && !DK.laFactTuVung(c.fact)) dung.push(`spec-thieu-khoa-tu-vung:${ma}:${c.fact} — THIEU_KHOA_TU_VUNG: khoá không có trong tu-vung@1, không tự đặt khoá`);
    }
    return m;
  };
  const dsMuc = (nhom, hop, tenLoi) => {
    const v = spec[nhom]; if (v === undefined) return [];
    if (!v || typeof v !== 'object' || Array.isArray(v)) { loi.push(`spec-hinh-dang:${nhom} — cần object {"<mã>": {...}}`); return []; }
    const out = [];
    for (const [ma0, x] of Object.entries(v)) {
      const ma = T.chuanMa(ma0);
      if (!hop.has(ma)) { loi.push(`spec-ma-ngoai-phan-nhom:${nhom}.${ma0} — ${tenLoi}`); continue; }
      const m = docMuc(nhom, ma, x); if (m) out.push([ma, m]);
    }
    return out;
  };
  const d8 = dsMuc('dong8', laIds, 'không phải dòng 8 số của phân nhóm (xem --goi)');
  const nut = dsMuc('dieuKienNut', tdIds, 'không phải tiêu đề có tên của phân nhóm (tiêu đề "Loại khác" trần không ghi)');
  const maHop = new Set([...laIds, ...cay.tieuDe.map((n) => n.id), pn6]);
  if (spec.ghiChuSoan !== undefined) {
    if (!Array.isArray(spec.ghiChuSoan)) loi.push('spec-hinh-dang:ghiChuSoan — phải là mảng');
    else {
      spec.ghiChuSoan.forEach((g, i) => {
        const duong = `ghiChuSoan[${i}]`;
        if (!g || typeof g !== 'object') { loi.push(`spec-hinh-dang:${duong}`); return; }
        for (const k of Object.keys(g)) if (!KHOA_GHI_CHU.includes(k)) loi.push(`spec-hinh-dang:${duong}.${k} — khoá hợp lệ: ${KHOA_GHI_CHU.join(', ')}`);
        if (!LOAI_GHI_CHU.includes(g.loai)) loi.push(`spec-hinh-dang:${duong}.loai — cần một trong ${LOAI_GHI_CHU.join('|')}`);
        if (!String(g.ghiChu || '').trim()) loi.push(`spec-hinh-dang:${duong}.ghiChu — rỗng`);
        const cap = String(g.ma || '').split('+').map(T.chuanMa);
        if (!(cap.length === 1 && maHop.has(cap[0])) && !(cap.length === 2 && cap.every((x) => laIds.has(x)))) loi.push(`spec-hinh-dang:${duong}.ma:${g.ma || ''} — mã dòng/tiêu đề/pn6 hoặc "hsA+hsB"`);
        if (g.loai === 'THIEU_KHOA_TU_VUNG' && !String(g.khoaDeXuat || '').trim()) loi.push(`spec-hinh-dang:${duong}.khoaDeXuat — bắt buộc với THIEU_KHOA_TU_VUNG`);
      });
    }
  }
  if (spec.chongLanVanBan !== undefined && !Array.isArray(spec.chongLanVanBan)) loi.push('spec-hinh-dang:chongLanVanBan — phải là mảng [{cap, lyDo}]');
  if (loi.length || dung.length) return { banNhap: null, loi, dung };
  const giuNgay = banCu && banCu.soanBoi?.phien === spec.phien ? banCu.soanBoi.ngay : null;
  const k = taoKhung(pn6, { phien: spec.phien, ngay: giuNgay || ngay });
  const ganMuc = (m, x) => {
    m.dieuKienSo = clone(x.dieuKienSo);
    if (x.trich !== undefined) m.trich = x.trich;
    if (x.nguon !== undefined) m.nguon = x.nguon;
    if (x.phanConLai !== undefined) m.phanConLai = clone(x.phanConLai);
  };
  for (const [ma, x] of d8) ganMuc(k.dong8.find((m) => m.hs === ma), x);
  for (const [ma, x] of nut) {
    let m = k.dieuKienNut.find((y) => y.id === ma);
    if (!m) { m = { id: ma, nguon: `tieuDe.${ma}`, trich: null, dieuKienSo: [], nguonLoai: 'AI_DA_KIEM' }; k.dieuKienNut.push(m); }
    ganMuc(m, x);
  }
  k.dieuKienNut.sort((a, b) => a.id.localeCompare(b.id));
  const out = { ...k };
  delete out.ghiChuSoan;
  if (Array.isArray(spec.chongLanVanBan) && spec.chongLanVanBan.length) out.chongLanVanBan = clone(spec.chongLanVanBan);
  out.ghiChuSoan = clone(spec.ghiChuSoan || []);
  if (banCu && Array.isArray(banCu.traVe) && banCu.traVe.length) out.traVe = clone(banCu.traVe);
  return { banNhap: out, loi, dung };
}

module.exports = {
  PHIEN_BAN, TRANG_THAI, GIOI_HAN_TO_HOP,
  kiemRanhGioi, kiemHinhDang, kiemTrich, kiemDoan, nguonDungNut,
  duyet, traVe, apDung, bamRanhGioi,
  goiSoan, taoKhung, phanNhomCuaDot, canHieuChinh, coHieuChinh, cayPhanNhom, soTayTuNhap,
  kiemPhien, cungNguoi, LOAI_GHI_CHU, apSpec, PHIEN_BAN_SPEC,
};
