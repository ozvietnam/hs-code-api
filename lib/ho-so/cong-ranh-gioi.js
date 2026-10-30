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
 *           TẦNG KHÔNG MÃ (lib/ho-so/tang-khong-ma.js): tiêu đề không mã của biểu thuế mà cây theo chữ số làm mất ⇒ chặn mọi dòng
 *           dưới tầng `cong1-tang-khong-ma:<hs>:r<dòng biểu>` — không có cách khai để vượt (người soạn DỪNG, báo Claude).
 *   cổng 2  loại trừ lẫn nhau — với mọi CẶP dòng, sinh vector dữ kiện tổng hợp từ mọi giá trị biên (SO: biên, biên ± 1e-6·biên;
 *           CO_KHONG: cả hai; LIET_KE: từng giá trị hợp lệ; chất liệu: từng vật liệu ở từng vị trí; TEN_LOAI/CONG_DUNG: từng
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
const TKM = require('./tang-khong-ma');

const PHIEN_BAN = 'ranh-gioi@1';
const TRANG_THAI = ['NHAP', 'DUYET', 'TRA_VE'];
const NGOAI_DANH_SACH = 'ẑẑẑ'; // chữ ngoài mọi tên/công dụng (có dấu để so được với tên tiếng Việt)
const GIOI_HAN_TO_HOP = 20000;

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
  const t = T.tree();
  const goc = code.length === 6 ? T.nodeOf(code) : null;
  if (!goc || !(goc.cap === 6 || (goc.cap === 4 && code.endsWith('00')) || goc.cap === 8)) return null;
  if (goc.cap === 8) return { goc, la: [goc], tieuDe: [], tang: [] };
  const la = []; const tieuDe = []; const tang = [goc];
  const walk = (id) => {
    const n = t.nodes.get(id); if (!n) return;
    if (n.cap === 8) { la.push(n); return; }
    if (n !== goc) { tieuDe.push(n); tang.push(n); }
    n.children.forEach(walk);
  };
  walk(goc.id);
  return { goc, la, tieuDe, tang };
}
const nut = (id) => T.tree().nodes.get(id);

/** Bản nháp → hình dạng sổ tay mà lib/dieu-kien-so.js đọc (chỉ mục có điều kiện). */
function soTayTuNhap(pn6, b) {
  const lay = (m) => ({ nguon: m.nguon, trich: m.trich, nguonLoai: m.nguonLoai, dieuKienSo: m.dieuKienSo });
  return {
    nhom: nz(pn6).slice(0, 4),
    dong8: (b?.dong8 || []).filter((m) => Array.isArray(m?.dieuKienSo) && m.dieuKienSo.length).map((m) => ({ hs: nz(m.hs), ...lay(m) })),
    dieuKienNut: (b?.dieuKienNut || []).filter((m) => Array.isArray(m?.dieuKienSo) && m.dieuKienSo.length).map((m) => ({ id: nz(m.id), ...lay(m) })),
  };
}

/** Băm nội dung ranh giới (không gồm nhãn/trạng thái): đổi điều kiện, nguồn hay trích sau khi duyệt ⇒ băm lệch. */
function bamRanhGioi(b) {
  const sx = (a, k) => [...(a || [])].map((m) => ({ ma: nz(m[k]), nguon: m.nguon || null, trich: m.trich || null, dieuKienSo: m.dieuKienSo || [] })).sort((x, y) => x.ma.localeCompare(y.ma));
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
    return ds.some((m) => nz(m.maHs).startsWith(nz(pn6)));
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
      const ma = nz(m?.[k]);
      if (!hop.has(ma)) { loi.push(`cong0-ngoai-phan-nhom:${ma || m?.[k]}`); continue; }
      if (thay.has(ma)) loi.push(`cong0-trung:${ma}`);
      thay.add(ma);
      if (m.nguonLoai !== nhanCan) loi.push(`cong0-nhan:${ma}:${m.nguonLoai || ''}`);
      if (!Array.isArray(m.dieuKienSo)) { loi.push(`cong0-thieu-dieu-kien-so:${ma}`); continue; }
      for (const c of m.dieuKienSo) {
        if (!c || typeof c !== 'object' || !DK.laFactTuVung(c.fact) || c.op === 'HOAC') loi.push(`cong0-fact-chua-co-kieu:${ma}:${c?.fact || c?.op || ''}`);
      }
    }
  };
  kiemDs(b.dong8, 'hs', laIds);
  kiemDs(b.dieuKienNut, 'id', tdIds);
  loi.push(...kiemChongLanKhai(b, laIds));
  if (b.trangThai === 'DUYET') {
    if (!b.duyet || !String(b.duyet.phien || '').trim()) loi.push('cong0-duyet-thieu');
    else if (b.duyet.phien === b.soanBoi?.phien) loi.push('cong0-tu-duyet');
    else if (b.duyet.bam !== bamRanhGioi(b)) loi.push('cong0-sua-sau-duyet');
  }
  return loi;
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
  const loai = s.slice(0, i); const id = nz(s.slice(i + 1));
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
function kiemKhopChu(ma, m) {
  const loi = []; const tr = String(m.trich || '');
  const theoFact = new Map();
  for (const c of m.dieuKienSo || []) { if (!theoFact.has(c.fact)) theoFact.set(c.fact, []); theoFact.get(c.fact).push(c); }
  for (const [fact, ds] of theoFact) {
    const k = khoa(fact); if (!k) continue;
    if (k.kieu !== 'CO_KHONG' && k.kieu !== 'SO') continue;
    let r = null; try { r = TV.docGiaTri(fact, tr); } catch { r = null; }
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
function kiemTrich(pn6, b) {
  const loi = [];
  const h4 = pn6.slice(0, 4);
  const src = S.sourcesFor(h4);
  const srcNut = { ...src, ...S.nguonTieuDe(h4) };
  const mot = (kind, m, ma, nguon) => {
    const coDk = Array.isArray(m.dieuKienSo) && m.dieuKienSo.length > 0;
    if (kind === 'dieuKienNut' && !coDk) return; // tiêu đề chưa có điều kiện: cổng 1 báo
    if (!coDk && !m.trich) return;
    const l = S.checkItem(kind, { ...m, ...(kind === 'dong8' ? { hs: ma } : { id: ma }) }, nguon, h4);
    if (l) { loi.push(`cong3-muc:${ma}:${l}`); return; }
    const d = kiemDoan(m.trich, nguon[m.nguon]); if (d) loi.push(`${d}:${ma}`);
    if (!nguonDungNut(m.nguon, ma, pn6)) loi.push(`cong3-nguon-sai-nut:${ma}:${m.nguon}`);
    const tep = tepCuaNguon(m.nguon);
    if (!tep || nhanCuaTep(tep) !== 'NGUYEN_VAN') loi.push(`cong3-nguon-khong-nguyen-van:${ma}:${m.nguon}`);
    if (coDk) loi.push(...kiemKhopChu(ma, m));
  };
  for (const m of b.dong8 || []) if (m && typeof m === 'object') mot('dong8', m, nz(m.hs), src);
  for (const m of b.dieuKienNut || []) if (m && typeof m === 'object') mot('dieuKienNut', m, nz(m.id), srcNut);
  return loi;
}

// ── Ứng viên vector biên ─────────────────────────────────────────────────────────────────────────────────────
const dsGiaTri = (v) => (Array.isArray(v) ? v : [v]);
function moiDieuKien(soTay) { return [...soTay.dong8, ...soTay.dieuKienNut].flatMap((m) => m.dieuKienSo || []); }
/** Map fact → danh sách giá trị dữ kiện (giaTri, donVi?) bao mọi vùng giữa các biên của phân nhóm. */
function bangUngVien(soTay) {
  const theo = new Map();
  const them = (f, v) => { if (!theo.has(f)) theo.set(f, []); const a = theo.get(f); if (!a.some((x) => JSON.stringify(x) === JSON.stringify(v))) a.push(v); };
  const viTriCL = new Map();
  for (const c of moiDieuKien(soTay)) {
    const k = khoa(c.fact); if (!k) continue;
    if (k.kieu === 'SO') {
      const t = TV.quyDoi(c.fact, c.value, c.donVi); if (t == null) continue;
      const d = t === 0 ? 1e-6 : Math.abs(t) * 1e-6;
      for (const v of [t - d, t, t + d]) them(c.fact, { giaTri: tron(v), donVi: k.donViChuan });
    } else if (k.kieu === 'CO_KHONG') { them(c.fact, { giaTri: true }); them(c.fact, { giaTri: false }); }
    else if (k.kieu === 'LIET_KE') for (const v of k.giaTriHopLe || []) them(c.fact, { giaTri: v });
    else if (k.kieu === 'TEN_LOAI' || k.kieu === 'CONG_DUNG') { for (const v of dsGiaTri(c.value)) them(c.fact, { giaTri: v }); them(c.fact, { giaTri: NGOAI_DANH_SACH }); }
    else if (k.kieu === 'CHAT_LIEU_THEO_VI_TRI') viTriCL.set(c.fact, new Set([...(viTriCL.get(c.fact) || []), c.viTri || 'CHINH']));
  }
  for (const [f, vts] of viTriCL) {
    const k = khoa(f); let combos = [[]];
    for (const vt of vts) combos = combos.flatMap((cb) => (k.giaTriHopLe || []).map((cl) => [...cb, { viTri: vt, chatLieu: cl }]));
    for (const cb of combos) them(f, { giaTri: cb });
  }
  return theo;
}
const factCua = (ds) => [...new Set((ds || []).map((c) => c.fact))];
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

/** Mọi điều kiện THOẢ trên dữ kiện đã chuẩn (Map fact → mục). */
const thoaHet = (ds, F) => ds.every((c) => DK.danhGiaDieuKien(c, F.get(c.fact) || null).trangThai === 'THOA');

// ── Cổng 1: phủ kín ──────────────────────────────────────────────────────────────────────────────────────────
function kiemPhuKin(pn6, cay, soTay, bang) {
  const loi = []; const them = (l) => { if (!loi.includes(l)) loi.push(l); };
  let soVector = 0;
  for (const leaf of cay.la) {
    for (let a = nut(leaf.parent); a && a.id !== cay.goc.id; a = nut(a.parent)) if (laTieuDe(a) && !a.tenVi) them(`cong1-tieu-de-bi-luoc-ten:${leaf.id}:${a.id}`);
    const dd = DK.duongDiDong8(leaf.id, { soTay });
    if (dd.lyDo) { them(`cong1-${dd.lyDo}:${leaf.id}`); continue; }
    for (const g of dd.nhom) {
      if (g.dieuKien) continue;
      // Lý do cấu trúc do luật đi ghi (#583): tieu-de-bi-luoc-ten | tang-bi-luoc. Không lý do = chỉ là chưa số hoá.
      if (g.lyDo) them(`cong1-${g.lyDo}:${leaf.id}:${g.nut}`);
      else them(`cong1-chua-so-hoa:${leaf.id}:${g.nut}`);
    }
  }
  // Tầng không mã của biểu thuế mà cây theo chữ số làm mất (848310 r14616): luật đi không biết điều kiện của tầng ⇒ chặn
  // MỌI dòng dưới tầng — người soạn DỪNG, báo Claude (không có cách khai để vượt).
  for (const t of TKM.tangKhongMa(pn6)) for (const hs of t.dongDuoi) them(`cong1-tang-khong-ma:${hs}:r${t.r}`);
  // Tầng không có con "phần còn lại": mọi vector biên phải vào ít nhất một con (điều kiện riêng của con).
  const dkCua = (n) => (n.cap === 8 ? soTay.dong8.find((m) => m.hs === n.id) : soTay.dieuKienNut.find((m) => m.id === n.id))?.dieuKienSo || null;
  for (const X of cay.tang) {
    const kids = X.children.map(nut).filter(Boolean);
    if (!kids.length || kids.some(laConLai)) continue;
    const dks = kids.map(dkCua);
    if (dks.some((d) => !d)) continue; // đã báo chưa số hoá
    // Chỉ vector THOẢ điều kiện của chính tầng X và các tiêu đề có điều kiện phía trên (trong phân nhóm): vector trái điều
    // kiện tầng cha không thuộc tầng này, không phải lỗ hổng (851810: tiêu đề "Micro" — vector tenLoai=<chữ lạ> bị bỏ).
    const dkCha = [];
    for (let a = X; a && a.id !== cay.goc.id; a = nut(a.parent)) { const d = dkCua(a); if (d) dkCha.push(...d); }
    const facts = factCua([...dks.flat(), ...dkCha]).sort();
    if (soToHop(facts, bang) > GIOI_HAN_TO_HOP) { them(`cong1-qua-nhieu-to-hop:${X.id}`); continue; }
    for (const vec of toHop(facts, bang)) {
      const F = DK.chuanDuKien(duKienTu(vec));
      if (!thoaHet(dkCha, F)) continue;
      soVector += 1;
      const vao = dks.some((ds) => thoaHet(ds, F));
      if (!vao) { them(`cong1-khong-phu-kin:${X.id}:${fmtVector(vec)}`); break; }
    }
  }
  return { loi, soVector };
}

// ── Cổng 2: loại trừ lẫn nhau ────────────────────────────────────────────────────────────────────────────────
function kiemLoaiTru(pn6, cay, soTay, bang, khai = new Map()) {
  const loi = []; const canhBao = []; let soVector = 0;
  const daXet = new Set(); const chongThat = new Set();
  const duong = cay.la.map((n) => ({ id: n.id, dd: DK.duongDiDong8(n.id, { soTay }) }))
    .filter((x) => !x.dd.lyDo && x.dd.nhom.every((g) => g.dieuKien)) // dòng chưa số hoá đủ không bao giờ CO — cổng 1 đã báo
    .map((x) => ({ id: x.id, facts: factCua(x.dd.nhom.flatMap((g) => g.dieuKien)).sort() }));
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
      if (n > GIOI_HAN_TO_HOP) { loi.push(`cong2-qua-nhieu-to-hop:${a.id}+${b.id}:${n}`); continue; }
      const k = khoaCap(a.id, b.id); daXet.add(k);
      for (const vec of toHop(facts, bang)) {
        soVector += 1;
        const ra = cham(a, vec); if (!ra.co) continue;
        const rb = cham(b, vec); if (!rb.co) continue;
        const duoi = `${a.id}+${b.id}:${fmtVector(vec)}${ra.tatDinh && rb.tatDinh ? '' : ':khong-tat-dinh'}`;
        chongThat.add(k);
        if (khai.has(k)) canhBao.push(`cong2-chong-lan-van-ban:${duoi}`); else loi.push(`cong2-chong-lan:${duoi}`);
        break;
      }
    }
  }
  // Khai CHONG_LAN_VAN_BAN cho cặp đã xét mà không chồng lấn ⇒ nhãn sai sự thật.
  for (const k of khai.keys()) if (daXet.has(k) && !chongThat.has(k)) loi.push(`cong2-chong-lan-van-ban-thua:${k}`);
  return { loi, canhBao, soVector };
}

/**
 * Chạy đủ bốn cổng trên một bản nháp ranh giới.
 * @returns {{pn6, hopLe:boolean, loi:string[], canhBao:string[], thongKe:{soDong, soTieuDe, soDongCoDieuKien, soTieuDeCoDieuKien, soVector}}}
 */
function kiemRanhGioi(pn6, banNhap) {
  const code = nz(pn6);
  const cay = cayPhanNhom(code);
  const loi = kiemHinhDang(code, banNhap, cay);
  const canhBao = [];
  const thongKe = { soDong: cay ? cay.la.length : 0, soTieuDe: cay ? cay.tieuDe.length : 0, soDongCoDieuKien: 0, soTieuDeCoDieuKien: 0, soVector: 0 };
  if (!cay || !banNhap || typeof banNhap !== 'object' || cay.la.length < 2) return { pn6: code, hopLe: false, loi, canhBao, thongKe };
  const soTay = soTayTuNhap(code, banNhap);
  thongKe.soDongCoDieuKien = soTay.dong8.length; thongKe.soTieuDeCoDieuKien = soTay.dieuKienNut.length;
  loi.push(...kiemTrich(code, banNhap));
  const bang = bangUngVien(soTay);
  const c1 = kiemPhuKin(code, cay, soTay, bang); loi.push(...c1.loi);
  const c2 = kiemLoaiTru(code, cay, soTay, bang, capChongLan(banNhap)); loi.push(...c2.loi); canhBao.push(...c2.canhBao);
  thongKe.soVector = c1.soVector + c2.soVector;
  if (canHieuChinh(code)) canhBao.push(`can-bang-hieu-chinh-tien-le:${code}${coHieuChinh(code) ? ':da-co' : ':chua-co (L1-4b) — không duyệt/áp được'}`);
  for (const m of soTay.dong8.concat(soTay.dieuKienNut)) {
    const tu = (m.dieuKienSo || []).filter((c) => ['TEN_LOAI', 'CONG_DUNG'].includes(khoa(c.fact)?.kieu)).map((c) => c.fact);
    if (tu.length) canhBao.push(`so-chu-tu-do:${m.hs || m.id}:${[...new Set(tu)].join(',')}`);
  }
  return { pn6: code, hopLe: loi.length === 0, loi, canhBao, thongKe };
}

// ── Quy trình: duyệt / trả về / áp vào sổ tay ────────────────────────────────────────────────────────────────
const ganNhan = (b, nhan) => { for (const m of [...(b.dong8 || []), ...(b.dieuKienNut || [])]) m.nguonLoai = nhan; return b; };
/** Nâng bản nháp lên DUYET / CLAUDE_DUYET. Ném lỗi khi: phân nhóm cần bảng hiệu chỉnh mà chưa có, cùng phiên người soạn, cổng đỏ. */
function duyet(banNhap, { phien, ngay, ghiChu } = {}) {
  const pn6 = nz(banNhap?.pn6);
  if (canHieuChinh(pn6) && !coHieuChinh(pn6)) throw new Error(`can-bang-hieu-chinh-tien-le:${pn6} — cần mục trong data/ho-so/hieu-chinh-tien-le.json (L1-4b) trước khi duyệt`);
  if (!String(phien || '').trim()) throw new Error('thieu-phien-duyet');
  if (phien === banNhap?.soanBoi?.phien) throw new Error('cung-phien-nguoi-soan: người soạn không tự duyệt (L1-4c: agent Claude mới)');
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
    if (!m.dieuKienSo?.length) continue;
    const hs = nz(m.hs);
    const i = out.dong8.findIndex((d) => nz(d.hs) === hs);
    const cu = i >= 0 ? out.dong8[i] : { hs, loaiKhac: S.isLoaiKhac(hs) };
    const { tieuChi, ...giu } = cu;
    const moi = { ...giu, dieuKien: m.dieuKienSo.map(DK.moTaNgan).join('; '), nguon: m.nguon, trich: m.trich, dieuKienSo: clone(m.dieuKienSo), nguonLoai: 'CLAUDE_DUYET', ranhGioi: dauVet };
    if (tieuChi && !S.checkTieuChi(tieuChi, m.trich)) moi.tieuChi = tieuChi;
    const l = S.checkItem('dong8', moi, src, h4); if (l) loi.push(`${hs}:${l}`);
    if (i >= 0) out.dong8[i] = moi; else out.dong8.push(moi);
  }
  const nuts = [...(out.dieuKienNut || [])];
  for (const m of banNhap.dieuKienNut || []) {
    if (!m.dieuKienSo?.length) continue;
    const id = nz(m.id);
    const moi = { id, nguon: m.nguon, trich: m.trich, dieuKienSo: clone(m.dieuKienSo), nguonLoai: 'CLAUDE_DUYET', ranhGioi: dauVet };
    const l = S.checkItem('dieuKienNut', moi, srcNut, h4); if (l) loi.push(`${id}:${l}`);
    const i = nuts.findIndex((d) => nz(d.id) === id);
    if (i >= 0) nuts[i] = moi; else nuts.push(moi);
  }
  if (nuts.length) out.dieuKienNut = nuts.sort((a, b) => nz(a.id).localeCompare(nz(b.id)));
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
  'Gói có "tangKhongMa" (tầng không mã của biểu thuế bị cây làm mất) ⇒ DỪNG, báo Claude: cổng 1 chặn mọi dòng dưới tầng, không có cách vượt.',
  'Chữ biểu TỰ chồng lấn (hai dòng cùng thoả, chữ không tách): không bịa điều kiện tách; khai chongLanVanBan [{cap:[hsA,hsB], lyDo}] (cổng 2 thành cảnh báo, runtime không tự chốt). Thứ tự ưu tiên chỉ khi có căn cứ trích được (TB-TCHQ, SEN/chú giải, GIR qua lib/gir.js).',
];
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
  const thuTu = []; const walk = (id) => { const n = nut(id); if (!n) return; if (n !== cay.goc) thuTu.push(n); (n.children || []).forEach(walk); };
  if (cay.goc.cap !== 8) walk(cay.goc.id);
  const canSoHoa = thuTu.map((n) => ({
    ma: n.id, loai: n.cap === 8 ? 'DONG8' : 'TIEU_DE', cha: n.parent, ten: n.tenVi || null,
    loaiKhac: n.cap === 8 ? Boolean(n.loaiKhac) : laLoaiKhacTranTen(n),
    khongCanDieuKien: laConLai(n) && Boolean(n.tenVi || n.cap === 8),
    ...(laTieuDe(n) && !n.tenVi ? { chan: 'tieu-de-bi-luoc-ten' } : {}),
    nguon: nguonCuaNut(n, src, srcNut),
  }));
  const nguonPhanNhom = Object.entries(src).filter(([k]) => k === `wco.${code}` || (k.startsWith('sen.') && code.startsWith(nz(k)))).map(([k, v]) => ({ nguon: k, text: v.slice(0, 1200) }));
  const chuGiai = Object.keys(src).filter((k) => /^(nhom|ch|phan)\d+\./.test(k)).map((k) => ({ nguon: k, doDai: src[k].length }));
  const tv = TV.taiTuVung ? TV.taiTuVung() : JSON.parse(fs.readFileSync(dataReadPath('tu-vung', 'tu-vung@1.json'), 'utf8'));
  const tuVung = (tv.khoa || []).map((k) => ({ khoa: k.khoa, kieu: k.kieu, nhanVi: k.nhanVi, op: DK.OP_THEO_KIEU[k.kieu], ...(k.donViChuan ? { donViChuan: k.donViChuan } : {}), ...(k.giaTriHopLe ? { giaTriHopLe: k.giaTriHopLe } : {}) }));
  const tangKhongMa = TKM.tangKhongMa(code);
  return { pn6: code, nhom: h4, phienBan: PHIEN_BAN, bieuThue: T.tree().bieuThue || null, ten: { wco: cay.goc.tenEn || null, vi: cay.goc.tenVi || null }, canHieuChinhTienLe: canHieuChinh(code), cay: T.render(code), tangKhongMa, canSoHoa, nguonPhanNhom, chuGiai, tuVung, luat: LUAT_SOAN };
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

module.exports = {
  PHIEN_BAN, TRANG_THAI, GIOI_HAN_TO_HOP,
  kiemRanhGioi, kiemHinhDang, kiemTrich, kiemDoan, nguonDungNut,
  duyet, traVe, apDung, bamRanhGioi,
  goiSoan, taoKhung, phanNhomCuaDot, canHieuChinh, coHieuChinh, cayPhanNhom, soTayTuNhap,
};
