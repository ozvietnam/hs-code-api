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
 *           TÊN NGUYÊN VĂN CỦA ANH EM (GĐ 31/10, "X và (các) bộ phận của chúng" — 871410, 845290): vector chồng lấn chỉ do cặp
 *           CHÉO KHOÁ `tenLoai X` ↔ `laBoPhan CO + dungCho Y` giữa hai anh em, X/Y là tên đầu nguyên văn của chính nút mình và rời
 *           nhau như hai giá trị tenLoai của anh em ⇒ không phải chồng lấn (tenAnhEmRoi; cảnh báo `cong2-ten-anh-em-roi`).
 *           TÊN CỤ THỂ HƠN THẮNG (DK.tenCuTheHonDong — cùng hàm doiChieuPhanNhom lúc chạy; #600, GĐ (a)): kể cả điều kiện trong
 *           HOAC (từng phương án THOẢ) và cặp chéo khoá trên (X chứa Y: "bàn đạp" ⊃ "Bàn") ⇒ không phải chồng lấn; cặp chỉ phân
 *           được nhờ phần mở rộng này hiện cảnh báo `cong2-ten-cu-the-hon` cho người soát.
 *           ĐÍCH "CỦA CHÚNG" ↔ TÊN TIÊU ĐỀ TỔ TIÊN (vòng 5, GĐ — 950300): một bên có dungCho Y từ vế "… của chúng"/"therefor" của
 *           chính nút rẽ nhánh (Y = danh từ đầu của nút), bên kia không có dungCho và một tiêu đề tổ tiên trên nhánh mang tên đầu X;
 *           X, Y rời nhau như luật #692 ⇒ không phải chồng lấn (dichCuaChungRoi; cảnh báo `cong2-dich-cua-chung-roi`). Runtime
 *           không đổi (hàng thoả cả hai ⇒ động cơ hỏi).
 *           VẾ MỞ TUONG_TU (vòng 7, GĐ — 761699 .40, 950300 .10): tên của anh em cho dòng TUONG_TU kết quả CHƯA BIẾT (không THOẢ) ⇒
 *           không có chồng lấn tất định; cặp mà câu trả lời "tương tự = có" sẽ làm hai dòng cùng CO ⇒ cảnh báo
 *           `cong2-tuong-tu-chua-chot` (lúc chạy động cơ hỏi). Vector biên có thêm "tên ngoài danh sách + trả lời có/không".
 *           NGOẠI LỆ DUY NHẤT (GĐ 30/10): chồng lấn do CHÍNH chữ biểu (vd 9004.90.10 kính thuốc ↔ .50 kính bảo hộ) mà không có
 *           căn cứ thứ tự — người soạn khai cặp ở `chongLanVanBan[] {cap:[hsA,hsB], lyDo}` ⇒ cổng 2 hạ thành CẢNH BÁO
 *           `cong2-chong-lan-van-ban:…`; khai cặp không chồng lấn ⇒ lỗi `cong2-chong-lan-van-ban-thua`. Không thêm điều kiện
 *           tách mà chữ không nói. Nghĩa lúc chạy: cặp này KHÔNG BAO GIỜ tự chốt — chotDong8 đã trả TRANH_CAP khi cả hai THOA;
 *           apDung mang dấu `chongLanVanBan[] {voi, lyDo}` sang cả hai dòng sổ tay để tầng hồ sơ (L1-5b) trả CANH_BAO + cauHoi.
 *           CHỒNG LẤN TRỤC tên ↔ công dụng (#683, quyết định GĐ): nhánh anh em chia theo TÊN (TEN_LOAI) cạnh nhánh chia theo CÔNG
 *           DỤNG (CONG_DUNG) — một hàng thoả cả hai (854442: "Cáp ắc qui" ↔ "Dùng cho viễn thông…"). chongLanVanBan KHÔNG gỡ được
 *           (vòng 3). Người soạn khai `chongLanTruc[] {nhanh, truc, cauHoiPhanBiet, trich, phanXu: null}`: cặp chồng lấn mà hai
 *           nhánh rẽ cùng thuộc một mục hợp lệ VÀ khác trục ⇒ hết lỗi, cảnh báo `cong2-chong-lan-truc-da-khai`. Nghĩa lúc chạy: dữ
 *           kiện thoả ≥ 2 nhánh khác trục ⇒ động cơ KHÔNG chọn (lib/ho-so/doi-chieu.js, lý do CHONG_LAN_TRUC + câu hỏi phân biệt),
 *           trừ khi `phanXu` (chỉ Claude/người soát ghi) dẫn nguồn kiểm được: chú giải NGUYEN_VAN / tiền lệ qua bảng hiệu chỉnh /
 *           NGUOI_DUYET. Không bao giờ tự suy "cụ thể nhất" theo GIR 3(a).
 *   cổng 3  trích có thật: máy kiểm sổ tay (lib/so-tay.js#checkItem: nguồn được phép, trích nguyên văn, bằng chứng của từng
 *           điều kiện) + chặt hơn ở ranh giới: MỌI đoạn lược (kể cả < 6 ký tự) có trong nguồn, đúng thứ tự; nguồn đúng nút
 *           (tax.<chính dòng>, tieuDe.<chính tiêu đề>, wco.<pn6>, sen.<tổ tiên/con>, chú giải); tệp nguồn mang nhãn NGUYEN_VAN;
 *           điều kiện khớp chữ trích (CO_KHONG đúng cực; SO đúng biên ≤/< mà docGiaTri đọc được từ chính câu trích).
 *           Liệt kê HOẶC gói trong MỘT giá trị chữ tự do (" hoặc ", ";", liệt kê phẩy, không mã HS) ⇒
 *           `cong3-liet-ke-trong-mot-chuoi` (vòng 5, soát đợt 3 #697) — ngoại lệ theo bằng chứng chữ Anh (kiemLietKeMotChuoi).
 *           Vòng 7 (#711): cả HAI tên hàng nối " và " trong mệnh đề danh từ đầu khi chữ Anh nối hai danh từ đầu bằng and/or.
 *           Op TUONG_TU (vế mở "X, Y và các loại tương tự", quyết định GĐ vòng 7): trích có cụm mở + mọi tên nêu nguyên văn.
 *   cổng 5  phạm vi VẾ bổ nghĩa (soát L1-4c đợt 2, #659 — 8,8% mục sai, gần hết kiểu này): chữ biểu VI (+ EN cùng dòng) của
 *           mỗi mục có điều kiện được tách thành vế (lib/ho-so/tach-ve.js). Vế GIỚI HẠN không điều kiện nào đọc tới (không lặp
 *           chữ tổ tiên, không miễn) ⇒ `cong5-ve-gioi-han-bi-bo` (RỘNG hơn chữ). Vế MỞ bị bỏ trong khi danh sách trước nó bị
 *           liệt kê đóng ⇒ `cong5-ve-mo-bi-bo` (HẸP hơn chữ). Định ngữ chung tách khỏi danh từ đầu liên hợp ⇒
 *           `cong5-dinh-ngu-tach`. Miễn vế tường minh: ghiChuSoan {ma, loai: 'BO_VE', ve: <nguyên văn>, lyDo} — lyDo rỗng /
 *           "người soát xem" / "DE_TRONG" không tính. Ghi chú DE_TRONG ⇒ cảnh báo `cong5-de-trong-chua-xu-ly`; duyet() từ chối
 *           tới khi người soát ghi kết luận (giaiQuyet → duyet.giaiQuyetDeTrong). Giá trị chữ tự do chứa "tương tự"/"similar" (giá
 *           trị chết, vòng 7) không phủ vế mở và là lỗi `cong5-gia-tri-tuong-tu`.
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
const V = require('./tach-ve');

const PHIEN_BAN = 'ranh-gioi@1';
const TRANG_THAI = ['NHAP', 'DUYET', 'TRA_VE'];
const NGOAI_DANH_SACH = 'ẑẑẑ'; // chữ ngoài mọi tên/công dụng (có dấu để so được với tên tiếng Việt)
// Số vector tối đa một cặp/tầng được VÉT CẠN (#653: 20.000 → 100.000 — 8544.42 có cặp 58.320). Vượt ⇒ LẤY MẪU tất định
// (hạt giống = khoá cặp/tầng), thongKe.layMau = true + cảnh báo cong1-/cong2-lay-mau; chồng lấn tìm thấy trong mẫu vẫn là lỗi.
const GIOI_HAN_TO_HOP = 100000;
const GIOI_HAN_MEMO = 1000000; // số mục tối đa của bộ nhớ đệm chấm dòng ở cổng 2 (kiemLoaiTru) trước khi xoá

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
  // Miễn vế BO_VE (cổng 5) thuộc nội dung: đổi/thêm sau duyệt ⇒ lệch băm. Chỉ thêm khoá khi có (băm bản cũ không đổi).
  // Khai CHONG_LAN_TRUC (#683) thuộc nội dung: đổi nhánh/câu hỏi/trích/phân xử sau duyệt ⇒ lệch băm. Chỉ thêm khoá khi có.
  const ct = dsClt(b).map(chuanClt).map((c) => ({ nhanh: [...c.nhanh].sort(), truc: c.truc, cauHoiPhanBiet: c.cauHoi, trich: c.trich, phanXu: c.phanXu }))
    .sort((x, y) => x.nhanh.join(',').localeCompare(y.nhanh.join(',')));
  if (ct.length) noiDung.chongLanTruc = ct;
  const bv = (Array.isArray(b?.ghiChuSoan) ? b.ghiChuSoan : []).filter((g) => g && g.loai === 'BO_VE')
    .map((g) => ({ ma: T.chuanMa(g.ma), ve: g.ve || null, lyDo: g.lyDo || null })).sort((x, y) => `${x.ma}|${x.ve}`.localeCompare(`${y.ma}|${y.ve}`));
  if (bv.length) noiDung.boVe = bv;
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
const LOAI_GHI_CHU = ['QUYET_DINH', 'DE_TRONG', 'CHONG_LAN', 'LECH_TIEN_LE', 'THIEU_KHOA_TU_VUNG', 'DUNG', 'BO_VE'];
/** Lỗi (hình dạng, loai sai, thiếu khoaDeXuat) + cảnh báo (thiếu loai — bản cũ, ma lạ) + dừng (THIEU_KHOA_TU_VUNG, DUNG). */
function kiemGhiChu(b, cay) {
  const loi = []; const canhBao = []; const dung = [];
  if (b.ghiChuSoan === undefined) return { loi, canhBao, dung };
  if (!Array.isArray(b.ghiChuSoan)) return { loi: ['cong0-khong-phai-mang:ghiChuSoan'], canhBao, dung };
  const maHop = new Set([...(cay ? [...cay.la, ...cay.tieuDe].map((n) => n.id) : []), nz(b.pn6)]);
  b.ghiChuSoan.forEach((g, i) => {
    // BO_VE (cổng 5): {ma, loai: 'BO_VE', ve, lyDo} — lyDo do cổng 5 kiểm (rỗng / "người soát xem" ⇒ cong5-bo-ve-ly-do).
    const coNoi = g && typeof g === 'object' && (g.loai === 'BO_VE' ? String(g.ve || '').trim() : String(g.ghiChu || '').trim());
    if (!g || typeof g !== 'object' || !String(g.ma || '').trim() || !coNoi) { loi.push(`cong0-ghi-chu-hinh-dang:${i}`); return; }
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

// ── Cổng 3: liệt kê HOẶC gói trong MỘT chuỗi chữ tự do (vòng 5 — soát L1-4c đợt 3 #697, phát hiện hàng đầu) ──────────
// Bộ so chữ đòi ĐỦ âm tiết của một giá trị TEN_LOAI/CONG_DUNG, nên "A, B hoặc C" viết trong MỘT chuỗi bị đọc thành VÀ (HẸP hơn
// chữ: 841459 .10 bốn đích làm mát, 950300 .91). Cổng 5 báo "phủ" vì chuỗi con có mặt; cổng 2/3 không biết chuỗi nghĩa là VÀ.
// Máy chặn giá trị có " hoặc " / ";" / liệt kê phẩy, KHÔNG có mã HS (mã HS ⇒ DK.maThamChieu đã đọc "84.29 hoặc 84.30" thành HOẶC).
// Ngoại lệ (chữ Anh cùng dòng là bằng chứng, như tach-ve boNghiaChung):
//   - liệt kê nối "và" ở cuối ("dịch chuyển, xử lý và kẹp giữ") mà chữ Anh có đúng k mục liên hợp sau giới từ for/of
//     ("for transport, handling and storage") — một hàng làm đủ các việc, không phải hàng thay thế (V.enLienHopSauGioiTu);
//   - dấu phẩy không kèm "và" mà chữ Anh của vế cũng có dấu phẩy và KHÔNG liệt kê and/or ("Đồng xèng, hình tròn" ↔ "Slugs,
//     round,") — dấu phẩy thuộc tính của một tên cố định (V.enPhayThuocTinh);
//   - "có hoặc không …" không phải liệt kê.
// Vòng 7 (soát L1-4c đợt 4 #711, phát hiện hàng đầu — 392620, 845290, 851762): liệt kê HAI tên hàng nối " và " cũng là liệt kê
// gói một chuỗi ('VA') khi CẢ HAI bằng chứng có mặt (vaLaLietKe): (1) chữ " và " của giá trị nằm trong mệnh đề DANH TỪ ĐẦU của
// vế chữ biểu (không phải vế "dùng cho …", "kể cả …", vế mở); (2) chữ Anh cùng vế nối hai danh từ đầu bằng and/or mà vế đứng
// trước là danh từ SỐ NHIỀU ("Shoulder pads or shields", "Arms and beds", "Radio transmitters and radio receivers"). Không báo:
// danh từ ghép một hàng ("Transmission and reception apparatus" — 85176252, "word making and talking sets" — 95030091,
// "Control and adaptor units"), "và" nối đích/thuộc tính sau giới từ ("for hubless cast iron pipes and pipe fittings" — 73269030).
const RE_HOAC_TU = /(?<![\p{L}])hoặc(?![\p{L}])/iu;
const RE_CO_HOAC_KHONG = /(?<![\p{L}])có\s+hoặc\s+không(?![\p{L}])/giu;
const RE_VA_TU = /(?<![\p{L}])và(?![\p{L}])/iu;
const chuSo = (s) => String(s || '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
/** Chữ Anh của đúng vế (tách ";") chứa giá trị — số vế VI/EN lệch ⇒ cả dòng. */
function enCuaGiaTri(ma, s) {
  let c; try { c = V.chuBieu(ma); } catch { return ''; }
  const veVi = V.tachVe(c.vi).ve; const veEn = V.tachVeEn(c.en).ve;
  const i = veVi.findIndex((v) => chuSo(v.chu).includes(chuSo(s)));
  return i >= 0 && veVi.length === veEn.length ? veEn[i].chu : c.en;
}
/** Từ cuối của vế đứng trước and/or là danh từ số nhiều (đuôi -s, trừ -ss/-us/-is) — vế là một danh từ đầy đủ, không phải bổ ngữ. */
const laSoNhieuEn = (w) => /^[a-z][a-z'-]*[a-z]s$/i.test(w) && !/(?:ss|us|is)$/i.test(w);
function enHaiDanhTuDau(dau) {
  // Cụm danh từ đầu dừng ở "including …" (vế kể cả) — RE_EN_DAU_HIEU của tach-ve không cắt ở đó; "and other/similar …" là vế mở.
  const t = String(dau || '').replace(/[()"“”]/g, ' ').replace(/\s+/g, ' ').split(/\b(?:including|excluding|other than)\b/i)[0].trim();
  for (const m of t.matchAll(/\s(?:and|or)\s(?!(?:other|similar)\b)/gi)) {
    const truoc = t.slice(0, m.index).split(/[,;]/).pop().trim().split(/\s+/).pop() || '';
    if (laSoNhieuEn(truoc)) return true;
  }
  return false;
}
/** Giá trị s (có " và ") của mục ma là liệt kê HAI tên hàng gói một chuỗi — theo chữ biểu VI (mệnh đề danh từ đầu) + EN. */
function vaLaLietKe(ma, s) {
  let c; try { c = V.chuBieu(ma); } catch { return false; }
  if (!c.vi || !c.en) return false;
  const kq = V.tachVe(c.vi, c.en);
  const tl = kq.chu.toLowerCase(); const sl = chuSo(s);
  const veEn = kq.en ? kq.en.ve : [];
  for (let iv = 0; iv < kq.ve.length; iv += 1) {
    const ve = kq.ve[iv];
    const i = tl.indexOf(sl, ve.bd);
    if (i < 0 || i + sl.length > ve.kt) continue;
    const dau = ve.menhDe.filter((m) => m.loai === 'DAU' && !m.ngoac);
    const vaTrongDau = [...sl.matchAll(/(?<![\p{L}])và(?![\p{L}])/gu)].some((m) => dau.some((d) => i + m.index >= d.bd && i + m.index < d.kt));
    if (!vaTrongDau) continue;
    const en = veEn.length === kq.ve.length ? [veEn[iv]] : veEn;
    if (en.some((e) => enHaiDanhTuDau(e && e.dau))) return true;
  }
  return false;
}
/** Kiểu liệt kê của một giá trị chữ tự do ('HOAC' | 'CHAM_PHAY' | 'PHAY' | 'VA') hoặc null khi không phải liệt kê gói một chuỗi. */
function kieuLietKe(ma, v) {
  const s = String(v ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!s || DK.maThamChieu(s).length) return null;
  if (RE_HOAC_TU.test(s.replace(RE_CO_HOAC_KHONG, ' '))) return 'HOAC';
  if (s.includes(';')) return 'CHAM_PHAY';
  const sp = s.replace(/(\d),(\d)/g, '$1.$2');
  if (!sp.includes(',')) return RE_VA_TU.test(sp) && vaLaLietKe(ma, s) ? 'VA' : null;
  const k = sp.split(/\s*,\s*|\s+và\s+/u).filter((x) => x.trim()).length;
  const en = enCuaGiaTri(ma, s);
  if (RE_VA_TU.test(sp.slice(sp.lastIndexOf(',') + 1)) && V.enLienHopSauGioiTu(en, k)) return null;
  if (!RE_VA_TU.test(sp) && V.enPhayThuocTinh(en, (sp.match(/,/g) || []).length)) return null;
  return 'PHAY';
}
function kiemLietKeMotChuoi(b) {
  const loi = [];
  const ds = [...(b.dong8 || []).map((m) => [nz(m?.hs), m]), ...(b.dieuKienNut || []).map((m) => [T.chuanMa(m?.id), m])];
  for (const [ma, m] of ds) {
    if (!m || typeof m !== 'object' || !Array.isArray(m.dieuKienSo)) continue;
    const facts = new Set();
    for (const c of DK.traiPhang(m.dieuKienSo)) {
      if (!c || !DK.laOpChuTuDo(c.op)) continue;
      if ((Array.isArray(c.value) ? c.value : [c.value]).some((v) => kieuLietKe(ma, v))) facts.add(c.fact);
    }
    for (const f of facts) loi.push(`cong3-liet-ke-trong-mot-chuoi:${ma}:${f}`);
  }
  return loi;
}

// ── Ứng viên vector biên ─────────────────────────────────────────────────────────────────────────────────────
const dsGiaTri = (v) => (Array.isArray(v) ? v : [v]);
function moiDieuKien(soTay) { return DK.traiPhang([...soTay.dong8, ...soTay.dieuKienNut].flatMap((m) => m.dieuKienSo || [])); }
/** Map fact → danh sách giá trị dữ kiện (giaTri, donVi?) bao mọi vùng giữa các biên của phân nhóm. */
function bangUngVien(soTay) {
  const theo = new Map();
  const them = (f, v) => { if (!theo.has(f)) theo.set(f, []); const a = theo.get(f); if (!a.some((x) => JSON.stringify(x) === JSON.stringify(v))) a.push(v); };
  const viTriCL = new Map(); const maCua = new Map(); const khoaTT = new Map();
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
      if (DK.laTuongTu(c)) { if (!khoaTT.has(c.fact)) khoaTT.set(c.fact, new Set()); khoaTT.get(c.fact).add(DK.khoaTuongTu(c)); }
      // #577 (848180 r14563 "Van bi"): giá trị toàn ASCII bị bộ so chữ (DK.soChu) coi là chữ Anh — so với tên tiếng Việt CÓ DẤU
      // của anh em luôn CHUA_BIET, nên PHAI_KHONG anh em ("Van đường ống nước") không bao giờ TRÁI và dòng dưới không tới được
      // (cong2-dong-khong-toi-duoc .71/.72). Thêm ứng viên "<giá trị> ẑẑẑ" (vẫn thoả giá trị, có dấu nên so được) — một mô tả
      // tiếng Việt thật của hàng đó; không đổi bộ so chữ lúc chạy.
      for (const v of dsGiaTri(c.value)) if (/\p{L}/u.test(String(v)) && !/[^\x00-\x7F]/.test(String(v))) them(c.fact, { giaTri: `${v} ${NGOAI_DANH_SACH}` });
      if (!maCua.has(c.fact)) maCua.set(c.fact, new Set());
      for (const v of dsGiaTri(c.value)) for (const r of DK.maThamChieu(v)) maCua.get(c.fact).add(r);
      // Dải mã ("8701.91 đến 8701.95", vòng 4): thêm một mã GIỮA dải làm vector — hai đầu đã có trong chữ; không thử mã giữa
      // thì dòng "… khác thuộc nhóm 87.01" thiếu phanConLai vẫn xanh giả (848390).
      for (const v of dsGiaTri(c.value)) {
        const dai = DK.daiMa(v); const giua = dai.slice(1, -1)[0];
        if (!giua) continue;
        them(c.fact, { giaTri: giua.length === 4 ? `nhóm ${giua.slice(0, 2)}.${giua.slice(2)}` : giua.length === 6 ? `phân nhóm ${giua.slice(0, 4)}.${giua.slice(4)}` : `mã ${giua.slice(0, 4)}.${giua.slice(4, 6)}.${giua.slice(6)}` });
      }
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
  // Vế mở TUONG_TU (#577 vòng 7): tên ngoài mọi tên nêu + CÂU TRẢ LỜI của người khai — "tương tự = có" cho từng điều kiện
  // (các điều kiện khác chưa trả lời) và "tương tự = không" cho tất cả. Chỉ ghép với tên NGOÀI danh sách: tên của anh em +
  // "có tương tự" không phải câu trả lời trung thực, lúc đó TUONG_TU chỉ CHƯA BIẾT (cảnh báo cong2-tuong-tu-chua-chot).
  for (const [f, ks] of khoaTT) {
    for (const k of ks) them(f, { giaTri: NGOAI_DANH_SACH, tuongTu: { [k]: true } });
    them(f, { giaTri: NGOAI_DANH_SACH, tuongTu: Object.fromEntries([...ks].map((k) => [k, false])) });
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
const fmtTraLoi = (v) => (v && v.tuongTu ? `[tương tự:${Object.values(v.tuongTu).map((x) => (x ? 'có' : 'không')).join('/')}]` : '');
const fmtVector = (vec) => [...vec].map(([f, v]) => `${f}=${fmtGiaTri(v.giaTri)}${fmtTraLoi(v)}`).join(',');
/** Mọi khoá câu trả lời TUONG_TU của sổ tay (lib/dieu-kien-so.js#khoaTuongTu). */
const khoaTuongTuCua = (soTay) => [...new Set(moiDieuKien(soTay).filter(DK.laTuongTu).map(DK.khoaTuongTu))];
/** Vector + câu trả lời "tương tự = có" cho mọi điều kiện TUONG_TU (khi tenLoai của vector chưa mang câu trả lời) — hoặc null. */
function vectorTraLoiCo(vec, khoaTT) {
  const v = vec.get('tenLoai');
  if (!khoaTT.length || !v || v.tuongTu) return null;
  const v2 = new Map(vec); v2.set('tenLoai', { ...v, tuongTu: Object.fromEntries(khoaTT.map((k) => [k, true])) });
  return v2;
}
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
 * Vòng 7 (#711, 392620 .20): HAI điều kiện cùng khoá chữ tự do trên CÙNG một nút (VÀ — định ngữ chung thành điều kiện riêng:
 * tenLoai ["Miếng đệm","miếng bảo vệ"] + tenLoai "vai") cũng được ghép "<giá trị 1> <giá trị 2>" ("Miếng đệm vai"), không thì dòng
 * không tới được (cong2-dong-khong-toi-duoc giả). Thêm vector — cổng chặt hơn, không nới.
 * @returns {Set<string>} khoá điểm mù đã ghép được: `<fact>:<nút trên>><nút dưới>`
 */
function themUngVienGhep(cay, soTay, bang) {
  const da = new Set();
  const laTuDo = (c) => c && ['TEN_LOAI', 'CONG_DUNG'].includes(c.op) && c.chieu !== 'PHAI_KHONG';
  const thoa = (c, v) => DK.danhGiaDieuKien(c, { fact: c.fact, giaTri: v }).trangThai === 'THOA';
  const themGia = (f, g) => { const a = bang.get(f) || []; if (!a.some((x) => x.giaTri === g)) a.push({ giaTri: g }); bang.set(f, a); };
  for (const m of [...soTay.dong8, ...soTay.dieuKienNut]) {
    const ds = (m.dieuKienSo || []).filter(laTuDo); // cấp ngoài cùng (VÀ) của chính nút
    for (let i = 0; i < ds.length; i += 1) {
      for (let j = i + 1; j < ds.length; j += 1) {
        if (ds[i].fact !== ds[j].fact) continue;
        for (const v of dsGiaTri(ds[i].value)) for (const u of dsGiaTri(ds[j].value)) {
          for (const g of [`${v} ${u}`, `${u} ${v}`]) if (thoa(ds[i], g) && thoa(ds[j], g)) { themGia(ds[i].fact, g); break; }
        }
      }
    }
  }
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
  const khoaTT = khoaTuongTuCua(soTay);
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
      let vao = dks.some((ds) => thoaHet(ds, F));
      // Vế mở TUONG_TU (#577 vòng 7): tên không nêu mà chưa trả lời "tương tự" là CHƯA BIẾT (hỏi), không phải lỗ hổng.
      const v2 = vao ? null : vectorTraLoiCo(vec, khoaTT);
      if (v2) vao = dks.some((ds) => thoaHet(ds, DK.chuanDuKien(duKienTu(v2))));
      if (!vao) { them(`cong1-khong-phu-kin:${X.id}:${fmtVector(vec)}`); break; }
    }
  }
  return { loi, canhBao, soVector, layMau };
}

// ── Tên nguyên văn của anh em: "X và (các) bộ phận của chúng" ở nhiều anh em (quyết định GĐ 31/10/2026) ──────────────
// Dạng đúng của vế mở là HOAC [[tenLoai X], [laBoPhan CO, dungCho X]] (QUY-TRINH 3.11). Một vector biên gán tenLoai và dungCho
// ĐỘC LẬP, nên "tenLoai Yên xe + là bộ phận + dungCho Khung" làm .10 "Yên xe" và .30 "Khung … và các bộ phận của chúng" cùng
// CO (871410: 18 cặp; 845290). Tiền lệ của cổng: hai anh em tenLoai X ↔ tenLoai Y là rời nhau khi KHÔNG giá trị ứng viên nào
// của vector thoả cả hai (một vector chỉ mang một giá trị tenLoai; tên chứa tên — "bàn đạp" ⊃ "Bàn" — thì có ứng viên thoả
// cả hai). Luật (chỉ cho CHỨNG MINH của cổng 2, runtime không đổi): trên vector chồng lấn, với hai nút rẽ nhánh anh em A, B
// (reNhanh — cùng cha), MỌI cặp phương án thoả (A, B) phải có một cặp CHÉO KHOÁ: `tenLoai X` ở một bên ↔ `laBoPhan CO` +
// `dungCho Y` ở bên kia, mà
//   - X (giá trị khớp vector) là tên ĐẦU nguyên văn của chính nút mình, Y cũng vậy với nút kia — chữ biểu nguyên văn
//     (lib/ho-so/tach-ve.js#chuBieu, cùng chữ cổng 5 đọc) trong mệnh đề danh từ đầu (DAU) hoặc vế "kể cả …" đứng liền sau nó;
//   - X, Y rời nhau ĐÚNG như tenLoai X ↔ tenLoai Y: không ứng viên nào (giá trị tenLoai/dungCho của bảng ứng viên + X + Y)
//     thoả cả TEN_LOAI X lẫn TEN_LOAI Y. Tên CHỨA nhau ("bàn đạp" ⊃ "Bàn") không rời — từ #600 (GĐ (a)) do "tên cụ thể hơn
//     thắng" xử lý (cuTheHonCong → DK.tenCuTheHonDong), chạy TRƯỚC luật này.
// Cặp cùng khoá (tenLoai ↔ tenLoai, dungCho ↔ dungCho) để vector tự quyết như cũ; tên ↔ công dụng KHÔNG có laBoPhan là trục
// (mục 4a), không phải luật này. Cặp mọi vector chồng lấn đều được chứng minh rời ⇒ cảnh báo `cong2-ten-anh-em-roi` cho người soát.
const _vungTen = new Map();
/** Các đoạn chữ "tên đầu" của một nút: mệnh đề DAU (ngoài ngoặc) + vế "kể cả …" đứng liền sau nó — chữ thường. */
function vungTenDau(id) {
  if (_vungTen.has(id)) return _vungTen.get(id);
  const out = [];
  try {
    const c = V.chuBieu(id);
    for (const ve of V.tachVe(c.vi, c.en).ve) {
      const md = ve.menhDe.filter((m) => !m.ngoac).sort((x, y) => x.bd - y.bd);
      md.forEach((m, i) => { if (m.loai === 'DAU') { out.push(m.chu); if (md[i + 1]?.kieu === 'KE_CA') out.push(md[i + 1].chu); } });
    }
  } catch { /* thiếu chữ biểu ⇒ không có tên đầu, luật không áp */ }
  const r = out.map((t) => t.normalize('NFC').toLowerCase());
  _vungTen.set(id, r);
  return r;
}
function laTenDau(id, v) {
  const s = String(v ?? '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
  if (!s) return false;
  const re = V.W(V.esc(s), 'iu');
  return vungTenDau(id).some((t) => re.test(t));
}
const dkTen = (v) => ({ fact: 'tenLoai', op: 'TEN_LOAI', value: v });
const thoaTen = (x, g) => DK.danhGiaDieuKien(dkTen(x), { fact: 'tenLoai', giaTri: g }).trangThai === 'THOA';
/** X ↔ Y rời nhau như hai giá trị tenLoai của anh em: không ứng viên nào thoả cả hai. */
function tenRoiNhau(x, y, ungVien) {
  if (thoaTen(x, y) || thoaTen(y, x)) return false;
  return !ungVien.some((g) => thoaTen(x, g) && thoaTen(y, g));
}
/** Các phương án (DNF: điều kiện ngoài HOAC × một phương án mỗi HOAC) của một mục, chỉ giữ phương án THOẢ trên F. */
function phuongAnThoa(ds, F) {
  const ngoai = ds.filter((c) => !(c && c.op === 'HOAC'));
  let pa = [ngoai];
  for (const h of ds.filter((c) => c && c.op === 'HOAC' && Array.isArray(c.phuongAn))) pa = pa.flatMap((p) => h.phuongAn.map((q) => [...p, ...(Array.isArray(q) ? q : [])]));
  return pa.filter((p) => p.every((c) => DK.danhGiaTrenMap(c, F).trangThai === 'THOA'));
}
const laKhang = (c) => c && c.chieu !== 'PHAI_KHONG';
/** Giá trị của điều kiện chữ tự do khớp dữ kiện F (giá trị nào của mảng "hoặc" làm điều kiện THOẢ). */
const giaTriKhop = (c, F) => dsGiaTri(c.value).filter((v) => DK.danhGiaTrenMap({ ...c, value: v }, F).trangThai === 'THOA');
/** Một phương án bên "tên" (tenLoai X) và một phương án bên "bộ phận" (laBoPhan CO + dungCho Y) rời nhau theo luật trên. */
function cheoKhoaRoi(idTen, paTen, idBp, paBp, F, ungVien) {
  if (!paBp.some((c) => laKhang(c) && c.fact === 'laBoPhan' && c.op === 'CO')) return false;
  const xs = paTen.filter((c) => laKhang(c) && c.fact === 'tenLoai' && c.op === 'TEN_LOAI').flatMap((c) => giaTriKhop(c, F));
  const ys = paBp.filter((c) => laKhang(c) && c.fact === 'dungCho' && c.op === 'CONG_DUNG').flatMap((c) => giaTriKhop(c, F));
  if (!xs.length || !ys.length) return false;
  return xs.every((x) => laTenDau(idTen, x)) && ys.every((y) => laTenDau(idBp, y)) && xs.every((x) => ys.every((y) => tenRoiNhau(x, y, ungVien)));
}
/** Vector F làm dòng a, b cùng CO — có phải chỉ do cặp chéo khoá tên ↔ "bộ phận của" giữa hai anh em có tên rời nhau? */
function tenAnhEmRoi(a, b, F, soTay, bang) {
  const { x, y } = reNhanh(a, b);
  if (!x || !y || T.chaTang(x) !== T.chaTang(y)) return false;
  const dsCua = (id) => (laDongTam(id) ? soTay.dong8.find((m) => m.hs === id) : soTay.dieuKienNut.find((m) => m.id === id))?.dieuKienSo || [];
  const pa = phuongAnThoa(dsCua(x), F); const pb = phuongAnThoa(dsCua(y), F);
  if (!pa.length || !pb.length) return false;
  const ungVien = [...new Set(['tenLoai', 'dungCho'].flatMap((f) => (bang.get(f) || []).map((u) => u.giaTri)).filter((g) => typeof g === 'string'))];
  return pa.every((p) => pb.every((q) => cheoKhoaRoi(x, p, y, q, F, ungVien) || cheoKhoaRoi(y, q, x, p, F, ungVien)));
}

// ── Đích "của chúng" ↔ tên tiêu đề tổ tiên (vòng 5, quyết định GĐ — 950300, #696) ─────────────────────────────────────
// 950300 .30 "Xe điện, kể cả đường ray, đèn hiệu và các phụ kiện khác của chúng" (EN "therefor") ⇒ HOAC [[tenLoai "Xe điện"],
// [tenLoai [đường ray, đèn hiệu, phụ kiện], dungCho "Xe điện"]]. Nhánh búp bê (9503002 "Búp bê" → tầng r18723 "Bộ phận và phụ
// kiện" → .21/.22/.29) không có dungCho vì ĐÍCH nằm ở TÊN tiêu đề cha ⇒ vector "tenLoai phụ kiện quần áo Búp bê + dungCho Xe điện"
// làm hai nhánh cùng CO. Luật (chỉ CHỨNG MINH của cổng 2, runtime không đổi — hàng thoả cả hai thì động cơ hỏi, cùng lớp khoảng
// trống đã chấp nhận của #692/#698): hai nút rẽ nhánh anh em; MỌI phương án thoả của nút bên "đích" có `dungCho Y`, Y là DANH TỪ
// ĐẦU nguyên văn của chính nút đó và chữ nút có "của chúng"/"therefor|thereof|therewith"; đường đi bên kia KHÔNG có dungCho khẳng
// định nào, và một TIÊU ĐỀ tổ tiên trên nhánh đó (từ nút rẽ nhánh xuống cha của dòng) có tenLoai X khớp vector, X là danh từ đầu
// nguyên văn của tiêu đề, X không trùng/chứa tên hàng của bên đích ("phụ kiện" của tầng r18723 không phải đích) và X, Y rời nhau
// ĐÚNG như luật #692 (tenRoiNhau: không ứng viên nào thoả cả hai — tên chứa nhau không chứng minh được) ⇒ loại trừ. Cảnh báo
// `cong2-dich-cua-chung-roi` cho người soát.
const RE_CUA_CHUNG_VI = /(?<![\p{L}])của\s+chúng(?![\p{L}])/iu;
const RE_CUA_CHUNG_EN = /\b(?:therefor|thereof|therewith)\b/i;
function coCuaChung(id) {
  try { const c = V.chuBieu(id); return RE_CUA_CHUNG_VI.test(String(c.vi || '').normalize('NFC')) || RE_CUA_CHUNG_EN.test(String(c.en || '')); } catch { return false; }
}
const _vungDau = new Map();
/** Chỉ mệnh đề DANH TỪ ĐẦU (ngoài ngoặc) của chữ biểu một nút — chặt hơn vungTenDau (không gồm vế "kể cả …"). */
function laDanhTuDau(id, v) {
  if (!_vungDau.has(id)) {
    let out = [];
    try { const c = V.chuBieu(id); out = V.tachVe(c.vi, c.en).ve.flatMap((ve) => ve.menhDe.filter((m) => !m.ngoac && m.loai === 'DAU').map((m) => m.chu.normalize('NFC').toLowerCase())); } catch { out = []; }
    _vungDau.set(id, out);
  }
  const s = String(v ?? '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
  if (!s) return false;
  const re = V.W(V.esc(s), 'iu');
  return _vungDau.get(id).some((t) => re.test(t));
}
const dsDieuKienNut = (soTay, id) => (laDongTam(id) ? soTay.dong8.find((m) => m.hs === id) : soTay.dieuKienNut.find((m) => m.id === id))?.dieuKienSo || [];
const giaTriKhang = (ds, fact, op, F) => ds.filter((c) => laKhang(c) && c.fact === fact && c.op === op).flatMap((c) => giaTriKhop(c, F));
/** Vector F làm dòng a, b (đối tượng đường đi của cổng 2) cùng CO — có phải chỉ do đích "của chúng" ↔ tên tiêu đề tổ tiên? */
function dichCuaChungRoi(a, b, F, soTay, bang) {
  const { x, y, duongA, duongB } = reNhanh(a.id, b.id);
  if (!x || !y || T.chaTang(x) !== T.chaTang(y)) return false;
  let uv = null;
  const ungVien = () => uv || (uv = [...new Set(['tenLoai', 'dungCho'].flatMap((f) => (bang.get(f) || []).map((u) => u.giaTri)).filter((g) => typeof g === 'string'))]);
  const mot = (dTen, duongTen, idDich) => {
    if (DK.traiPhang(dTen.dkCo).some((c) => laKhang(c) && c.fact === 'dungCho')) return false; // bên tên phải có đích TỰ DO
    if (!coCuaChung(idDich)) return false;
    const pb = phuongAnThoa(dsDieuKienNut(soTay, idDich), F);
    if (!pb.length) return false;
    const tieuDe = duongTen.filter((id) => id !== dTen.id && !laDongTam(id));
    return pb.every((q) => {
      const ys = giaTriKhang(q, 'dungCho', 'CONG_DUNG', F);
      if (!ys.length || !ys.every((v) => laDanhTuDau(idDich, v))) return false;
      const hang = giaTriKhang(q, 'tenLoai', 'TEN_LOAI', F);
      return tieuDe.some((t) => {
        const xs = giaTriKhang(DK.traiPhang(dsDieuKienNut(soTay, t)), 'tenLoai', 'TEN_LOAI', F);
        return xs.length > 0 && xs.every((X) => laDanhTuDau(t, X)
          && hang.every((h) => !thoaTen(X, h) && !thoaTen(h, X))
          && ys.every((Y) => tenRoiNhau(X, Y, ungVien())));
      });
    });
  };
  return mot(a, duongA, y) || mot(b, duongB, x);
}

/**
 * "Tên cụ thể hơn thắng" của cổng 2 (#600, quyết định GĐ (a)): DK.tenCuTheHonDong trên điều kiện khẳng định của đường đi hai
 * dòng (CÙNG đầu vào doiChieuPhanNhom dùng lúc chạy ⇒ cổng coi là phân được thì lúc chạy cũng bỏ dòng bị lấn). Cặp CHÉO KHOÁ
 * (tenLoai X ↔ laBoPhan CO + dungCho Y) chỉ nhận khi hai dòng rẽ nhánh tại hai anh em cùng cha và X/Y là tên đầu NGUYÊN VĂN của
 * chính nút rẽ nhánh mình (laTenDau — như tenAnhEmRoi); tên nguyên văn RỜI nhau (tenRoiNhau) là cặp loại trừ, không chiều.
 * Lưu ý: cặp phương án được coi RỜI vẫn chỉ là luật chứng minh của cổng (#692) — lúc chạy không có luật này, nên vector mà một
 * cặp phương án phân chiều còn cặp kia rời (845290 "bàn đạp" là bộ phận của "tủ": .92 phương án tên "Bàn" bị lấn, phương án
 * "bộ phận của tủ" rời) thì doiChieuPhanNhom vẫn trả cả hai dòng (không tự chốt), như 871410 "Yên xe" ↔ "bộ phận của Khung".
 */
function cuTheHonCong(a, b, F, bang) {
  const { x, y } = reNhanh(a.id, b.id);
  const anhEm = Boolean(x && y && T.chaTang(x) === T.chaTang(y));
  const nguyenVan = (xs, ys, tenLaA) => anhEm && xs.every((v) => laTenDau(tenLaA ? x : y, v)) && ys.every((v) => laTenDau(tenLaA ? y : x, v));
  let uv = null;
  const ungVien = () => uv || (uv = [...new Set(['tenLoai', 'dungCho'].flatMap((f) => (bang.get(f) || []).map((u) => u.giaTri)).filter((g) => typeof g === 'string'))]);
  return DK.tenCuTheHonDong(a.dkCo, b.dkCo, F, {
    cheo: nguyenVan,
    roi: (xs, ys, tenLaA) => nguyenVan(xs, ys, tenLaA) && xs.every((p) => ys.every((q) => tenRoiNhau(p, q, ungVien()))),
  });
}

// ── Cổng 2: loại trừ lẫn nhau ────────────────────────────────────────────────────────────────────────────────
function kiemLoaiTru(pn6, cay, soTay, bang, khai = new Map(), gioiHan = GIOI_HAN_TO_HOP, ghep = new Set()) {
  const loi = []; const canhBao = []; let soVector = 0; let layMau = false;
  const daXet = new Set(); const chongThat = new Set(); const tenRoi = new Set(); const cuThe = new Set(); const dichRoi = new Set();
  const duongDu = cay.la.map((n) => ({ id: n.id, dd: DK.duongDiDong8(n.id, { soTay }) }))
    .filter((x) => !x.dd.lyDo && x.dd.nhom.every((g) => g.dieuKien)); // dòng chưa số hoá đủ không bao giờ CO — cổng 1 đã báo
  const duong = duongDu
    .map((x) => ({ id: x.id, facts: factCua(x.dd.nhom.flatMap((g) => g.dieuKien)).sort(), dkCo: x.dd.nhom.filter((g) => g.chieu === 'PHAI_CO').flatMap((g) => g.dieuKien),
      coTT: DK.traiPhang(x.dd.nhom.flatMap((g) => g.dieuKien)).some(DK.laTuongTu) }));
  // Vế mở TUONG_TU (#577 vòng 7, quyết định GĐ): trên vector mang tên của anh em, dòng TUONG_TU chỉ CHƯA BIẾT (không THOẢ) ⇒
  // không có chồng lấn tất định; nếu câu trả lời "tương tự = có" sẽ làm hai dòng cùng CO thì ghi cảnh báo cong2-tuong-tu-chua-chot
  // (lúc chạy động cơ hỏi). Không cần — và không được — khai chongLanTruc cho cặp này.
  const khoaTT = khoaTuongTuCua(soTay); const ttCho = new Set();
  const choTT = (d, vec) => { if (!d.coTT) return false; const v2 = vectorTraLoiCo(vec, khoaTT); return Boolean(v2) && cham(d, v2).co; };
  const memo = new Map();
  const cham = (d, vec) => {
    const key = `${d.id}|${d.facts.map((f) => JSON.stringify(vec.get(f))).join('|')}`;
    if (!memo.has(key)) {
      // Bộ nhớ đệm có trần (#577 848180: vài chục triệu vector làm đầy heap 2 GB mặc định) — xoá đệm không đổi kết quả.
      if (memo.size >= GIOI_HAN_MEMO) memo.clear();
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
        const ra = cham(a, vec);
        if (!ra.co) { if (a.coTT && !ttCho.has(k) && cham(b, vec).co && choTT(a, vec)) ttCho.add(k); continue; }
        const rb = cham(b, vec);
        if (!rb.co) { if (b.coTT && !ttCho.has(k) && choTT(b, vec)) ttCho.add(k); continue; }
        const F = DK.chuanDuKien(duKienTu(vec));
        // Tên cụ thể hơn thắng (lib/dieu-kien-so.js#tenCuTheHon): "bàn đạp" (.11) lấn "Bàn" (.12) — không phải chồng lấn.
        // #600 (GĐ (a)): kể cả phương án HOAC + cặp chéo khoá "X" ↔ "bộ phận của Y" — CÙNG hàm doiChieuPhanNhom dùng lúc chạy.
        const ct = cuTheHonCong(a, b, F, bang);
        if (ct) { if (DK.tenCuTheHon(a.dkCo, b.dkCo, F) === 0) cuThe.add(k); continue; }
        // Tên nguyên văn của anh em (GĐ 31/10): tenLoai X ↔ "bộ phận của Y", X/Y tên đầu nguyên văn rời nhau ⇒ không chồng.
        if (tenAnhEmRoi(a.id, b.id, F, soTay, bang)) { tenRoi.add(k); continue; }
        // Đích "của chúng" ↔ tên tiêu đề tổ tiên (vòng 5, GĐ — 950300): hai đích nguyên văn rời nhau ⇒ không chồng.
        if (dichCuaChungRoi(a, b, F, soTay, bang)) { dichRoi.add(k); continue; }
        const duoi = `${a.id}+${b.id}:${fmtVector(vec)}${ra.tatDinh && rb.tatDinh ? '' : ':khong-tat-dinh'}`;
        chongThat.add(k);
        if (khai.has(k)) canhBao.push(`cong2-chong-lan-van-ban:${duoi}`); else loi.push(`cong2-chong-lan:${duoi}`);
        break;
      }
    }
  }
  for (const k of tenRoi) if (!chongThat.has(k)) canhBao.push(`cong2-ten-anh-em-roi:${k}`);
  for (const k of cuThe) if (!chongThat.has(k)) canhBao.push(`cong2-ten-cu-the-hon:${k}`);
  for (const k of dichRoi) if (!chongThat.has(k)) canhBao.push(`cong2-dich-cua-chung-roi:${k}`);
  for (const k of ttCho) if (!chongThat.has(k)) canhBao.push(`cong2-tuong-tu-chua-chot:${k}`);
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
  return { loi, canhBao, soVector, chongThat, layMau, daXet };
}

// ── Chính sách CHONG_LAN_VAN_BAN (GĐ 30/10 + #577) ───────────────────────────────────────────────────────────────
const SO_NHANH_TRUC = 3;
/** Cụm có tiêu đề/tầng (một nhóm dòng): ngưỡng thấp hơn — vòng 3 (#681, 854442 "Cáp ắc qui" ↔ hai tiêu đề "Dùng cho viễn thông…"). */
const SO_NHANH_TRUC_TIEU_DE = 2;
/** Hai nút con của tổ tiên chung thấp nhất trên đường của dòng a và dòng b (nơi chữ biểu rẽ nhánh). */
function reNhanh(a, b) {
  const len = (id) => { const ds = []; for (let x = nut(id); x; x = nut(T.chaTang(x.id))) ds.push(x.id); return ds; };
  const la = len(a); const lb = len(b);
  const chung = la.find((id) => lb.includes(id));
  return { x: la[la.indexOf(chung) - 1], y: lb[lb.indexOf(chung) - 1], duongA: la.slice(0, la.indexOf(chung)), duongB: lb.slice(0, lb.indexOf(chung)) };
}
const laDongTam = (id) => nut(id)?.cap === 8;
/** Trục của điều kiện RIÊNG một nút (không tính tổ tiên): tập khoá + có khoá tên (TEN_LOAI) / công dụng (CONG_DUNG). */
function trucCua(banNhap, id) {
  const m = laDongTam(id) ? (banNhap.dong8 || []).find((x) => nz(x?.hs) === id) : (banNhap.dieuKienNut || []).find((x) => T.chuanMa(x?.id) === id);
  const ds = Array.isArray(m?.dieuKienSo) ? m.dieuKienSo : [];
  const mot = (dk) => {
    const facts = factCua(dk);
    const kieu = facts.map((f) => khoa(f)?.kieu);
    return { facts, chiTen: facts.length > 0 && kieu.every((k) => k === 'TEN_LOAI'), coCongDung: kieu.includes('CONG_DUNG') };
  };
  // Vòng 4: mục có HOAC ⇒ mỗi phương án (cùng điều kiện ngoài HOAC) là một nhánh trục riêng — 940541 .30 vế B "đèn dùng cho
  // phương tiện giao thông đường sắt…, bằng kim loại cơ bản" chia theo công dụng dù vế A có tên "Đèn tín hiệu".
  const ngoai = ds.filter((c) => !(c && c.op === 'HOAC'));
  const hoac = ds.filter((c) => c && c.op === 'HOAC' && Array.isArray(c.phuongAn));
  const phuongAn = hoac.length ? hoac.flatMap((h) => h.phuongAn.map((pa) => mot([...ngoai, ...(Array.isArray(pa) ? pa : [])]))) : [];
  return { ...mot(ds), phuongAn };
}
/**
 * Hai nhánh anh em chia theo hai trục rời nhau: một bên chỉ theo tên, bên kia theo công dụng, không chung khoá nào.
 * TIÊU ĐỀ/TẦNG ↔ TIÊU ĐỀ/TẦNG (vòng 3) và DÒNG ↔ DÒNG (vòng 4, GĐ: cặp tên ↔ công dụng là DỪNG kể cả khi chỉ có 2 anh em —
 * 940541 .10 "Đèn pha" ↔ .30 vế B "dùng cho … tàu thủy …"). Dòng có HOAC: xét từng phương án. Dòng ↔ tiêu đề: chưa xét.
 */
function tenCanhCongDung(banNhap, u, v) {
  if (laDongTam(u) !== laDongTam(v)) return false;
  const a = trucCua(banNhap, u); const b = trucCua(banNhap, v);
  const roi = (x, y) => !x.facts.some((f) => y.facts.includes(f)) && ((x.chiTen && y.coCongDung) || (y.chiTen && x.coCongDung));
  const nhanh = (x) => (laDongTam(u) && x.phuongAn.length ? x.phuongAn : [x]);
  return nhanh(a).some((x) => nhanh(b).some((y) => roi(x, y)));
}
/**
 * Cặp khai CHONG_LAN_VAN_BAN chỉ dành cho chữ biểu TỰ chồng lấn:
 *  - lyDo phải TRÍCH (trong ngoặc kép) chữ biểu của CẢ HAI nhánh — chữ của một nút trên đường từ nơi rẽ nhánh xuống dòng
 *    ⇒ thiếu: `cong3-chong-lan-thieu-trich:<cặp>:<dòng>`;
 *  - và ít nhất một câu trích phải là chữ NGUYÊN VĂN của chính một trong hai dòng của cặp (tax.<dòng>) — lý do chỉ trích tiêu
 *    đề tổ tiên (một lý do chép cho cả chục cặp, #681 854442) ⇒ `cong3-chong-lan-chi-trich-tieu-de:<cặp>`;
 *  - chồng lấn theo TRỤC (nhánh chia theo công dụng cạnh nhánh chia theo tên — 392690, 401699, 854442) không phải chữ biểu tự
 *    chồng ⇒ `cong2-chong-lan-truc:<nút>:<các nhánh>` — DỪNG, báo Claude. Đồ thị nhánh dựng trên MỌI chồng lấn thật (khai hay
 *    chưa); một nút u là trục khi: chồng ≥ 3 nhánh anh em; hoặc ≥ 2 nhánh mà cụm có tiêu đề/tầng (một nhóm dòng); hoặc u và một
 *    nhánh đều là tiêu đề/tầng chia theo hai trục rời nhau tên ↔ công dụng. Báo khi cụm còn cặp chưa được `chongLanTruc` phủ
 *    (#683 — trước đây chỉ khi đã khai chongLanVanBan), hoặc khi đã khai chongLanVanBan trong cụm. Khai chongLanVanBan KHÔNG gỡ
 *    được trục: mọi cặp đã khai trong cụm trả về `haCap` để kiemRanhGioi nâng cảnh báo thành lỗi `cong2-chong-lan-van-ban-truc`.
 */
function kiemChinhSachChongLan(pn6, banNhap, chongThat, phu = new Set()) {
  const loi = []; const haCap = new Set(); const khai = capChongLan(banNhap);
  const h4 = pn6.slice(0, 4); const src = { ...S.sourcesFor(h4), ...S.nguonTieuDe(h4) };
  const chuCua = (id) => src[`${id.length === 8 ? 'tax' : 'tieuDe'}.${id}`] || nut(id)?.tenVi || '';
  const trichTrong = (lyDo) => [...String(lyDo || '').matchAll(/["“”]([^"“”]{2,}?)["“”]/g)].map((m) => m[1]).filter((q) => S.squash(q).length >= 4);
  const ke = new Map(); const canh = new Map();
  const noi = (u, v, k) => { if (!ke.has(u)) ke.set(u, new Set()); ke.get(u).add(v); const c = `${u}|${v}`; if (!canh.has(c)) canh.set(c, []); canh.get(c).push(k); };
  for (const k of chongThat) {
    const [a, b] = k.split('+');
    const rn = reNhanh(a, b);
    if (!rn.x || !rn.y) continue;
    noi(rn.x, rn.y, k); noi(rn.y, rn.x, k);
    if (!khai.has(k)) continue;
    const q = trichTrong(khai.get(k));
    for (const [dong, duong] of [[a, rn.duongA], [b, rn.duongB]]) {
      if (!q.some((t) => duong.some((id) => kiemDoan(t, chuCua(id)) === null))) loi.push(`cong3-chong-lan-thieu-trich:${k}:${dong}`);
    }
    if (q.length && !q.some((t) => [a, b].some((id) => kiemDoan(t, chuCua(id)) === null))) loi.push(`cong3-chong-lan-chi-trich-tieu-de:${k}`);
  }
  for (const [u, vs] of ke) {
    const ds = [...vs];
    const coTieuDe = !laDongTam(u) || ds.some((v) => !laDongTam(v));
    const truc = ds.length >= SO_NHANH_TRUC || (coTieuDe && ds.length >= SO_NHANH_TRUC_TIEU_DE) || ds.some((v) => tenCanhCongDung(banNhap, u, v));
    if (!truc) continue;
    const cap = ds.flatMap((v) => canh.get(`${u}|${v}`) || []);
    // #683: báo trục khi còn cặp chưa được chongLanTruc phủ (kể cả chưa khai chongLanVanBan — người soạn biết khai chongLanTruc),
    // hoặc khi đã khai chongLanVanBan trong cụm (khai đó không gỡ được trục).
    if (!cap.some((k) => khai.has(k)) && cap.every((k) => phu.has(k))) continue;
    loi.push(`cong2-chong-lan-truc:${u}:${ds.sort().join(',')}`);
    for (const k of cap) if (khai.has(k)) haCap.add(k);
  }
  return { loi, haCap };
}

// ── CHONG_LAN_TRUC: chồng lấn trục tên ↔ công dụng (#683, quyết định GĐ) ───────────────────────────────────────────────
// Trục: TEN_LOAI (khoá tên), CONG_DUNG (congDung/dungCho), DAC_DIEM (#577 848180, quyết định GĐ 31/10: khoá ĐẶC ĐIỂM tất định
// CO_KHONG / LIET_KE — 8481805 "có khoang pha trộn lưu chất" coKhoangPhaTron, r14573 "điều khiển bằng khí nén" cachDieuKhien).
// Cùng nghĩa với hai trục cũ: chồng lấn giữa nhánh khác trục ⇒ chưa chốt, hỏi câu phân biệt; chỉ phanXu kiểm được mới chọn.
const TRUC_HOP_LE = ['TEN_LOAI', 'CONG_DUNG', 'DAC_DIEM'];
/** Kiểu khoá tu-vung đọc được là trục `truc` (trục khai phải khớp ít nhất một khoá riêng của nhánh). */
const KIEU_CUA_TRUC = { TEN_LOAI: ['TEN_LOAI'], CONG_DUNG: ['CONG_DUNG'], DAC_DIEM: ['CO_KHONG', 'LIET_KE'] };
const LOAI_PHAN_XU = ['CHU_GIAI', 'TIEN_LE', 'NGUOI_DUYET'];
const KHOA_CLT = ['nhanh', 'truc', 'cauHoiPhanBiet', 'trich', 'phanXu'];
const RE_NGUON_CHU_GIAI = /^(nhom\d{4}|ch\d{2}|phan\d{2}|sen)\./;
const dsClt = (b) => (Array.isArray(b?.chongLanTruc) ? b.chongLanTruc : []);
const banDoMa = (o) => Object.fromEntries(Object.entries(o && typeof o === 'object' && !Array.isArray(o) ? o : {}).map(([k, v]) => [T.chuanMa(String(k)), v]));
/** Một mục chongLanTruc chuẩn hoá (không kiểm): mã nhánh qua T.chuanMa (giữ id tầng). */
function chuanClt(x) {
  return {
    nhanh: Array.isArray(x?.nhanh) ? x.nhanh.map((v) => T.chuanMa(String(v))) : [],
    truc: banDoMa(x?.truc), trich: banDoMa(x?.trich),
    cauHoi: typeof x?.cauHoiPhanBiet === 'string' ? x.cauHoiPhanBiet.trim() : '',
    phanXu: x?.phanXu == null ? null : x.phanXu,
  };
}
/** Nút `id` nằm dưới (hoặc là) nút `goc` theo lớp tầng của cây. */
function duoiNut(goc, id) { for (let x = id; x; x = T.chaTang(x)) if (x === goc) return true; return false; }
/** Kiểu khoá của điều kiện RIÊNG một nút (không tính tổ tiên). */
function kieuRieng(banNhap, id) {
  const m = laDongTam(id) ? (banNhap.dong8 || []).find((x) => nz(x?.hs) === id) : (banNhap.dieuKienNut || []).find((x) => T.chuanMa(x?.id) === id);
  return new Set(factCua(m?.dieuKienSo).map((f) => khoa(f)?.kieu).filter(Boolean));
}
const laNgayHopLe = (v) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || '').trim()); if (!m) return false; const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); return d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3]; };
/** phanXu nguồn TIEN_LE: mục bảng hiệu chỉnh (L1-4b) hợp lệ, TIEN_LE_THAY_CHU_BIEU, kết luận dòng dưới nhánh chọn, chữ biểu ở nhánh khác. */
function kiemPhanXuTienLe(c, nguon) {
  const HC = require('./hieu-chinh');
  const m = (HC.taiBang().muc || []).find((x) => x && String(x.id) === String(nguon.hieuChinhId || ''));
  if (!m) return 'khong-co-muc';
  if (m.loai !== 'TIEN_LE_THAY_CHU_BIEU') return `loai:${m.loai}`;
  if (!m.nguonLoai || m.nguonLoai === 'AI_CHUA_KIEM') return 'nguon-loai';
  const chon = T.chuanMa(String(c.phanXu.chon));
  if (!duoiNut(chon, nz(m.maHs))) return 'ngoai-nhanh-chon';
  if (!c.nhanh.some((x) => x !== chon && duoiNut(x, nz(m.dongChuBieu)))) return 'chu-bieu-ngoai-cum';
  let kb; try { kb = HC.kiemBang({ phienBan: HC.PHIEN_BAN, muc: [m] }, { phuKin: false }); } catch { kb = { hopLe: false }; }
  if (!kb.hopLe) return 'muc-bang-do';
  const tb = (Array.isArray(m.tbTchq) ? m.tbTchq : []).filter((t) => String(t?.viTri || '').includes(`#${nz(m.maHs)}[`));
  if (S.squash(nguon.trich).length < 4 || !tb.some((t) => HC.coNguyenVan(nguon.trich, t.trich))) return 'trich';
  return null;
}
/**
 * Kiểm `chongLanTruc[]` (#683). Cổng 0 (hình dạng), cổng 3 (trích nguyên văn chữ biểu từng nhánh, trục khớp khoá thật, nguồn
 * phanXu) luôn chạy; có `chongThat` (cổng 2) thì tính cặp được PHỦ: hai nhánh rẽ (reNhanh) cùng thuộc một mục hợp lệ và khác trục.
 * Cặp cùng trục không bao giờ được phủ (đó là chồng lấn thường — sửa khoá/biên).
 * @returns {{loi:string[], canhBao:string[], phu:Set<string>}}
 */
function kiemChongLanTruc(pn6, banNhap, cay, chongThat = null, daXet = null) {
  const loi = []; const canhBao = []; const phu = new Set();
  if (!banNhap || banNhap.chongLanTruc === undefined) return { loi, canhBao, phu };
  if (!Array.isArray(banNhap.chongLanTruc)) return { loi: ['cong0-khong-phai-mang:chongLanTruc'], canhBao, phu };
  const h4 = pn6.slice(0, 4); const src = { ...S.sourcesFor(h4), ...S.nguonTieuDe(h4) };
  const chuCua = (id) => src[`${laDongTam(id) ? 'tax' : 'tieuDe'}.${id}`] || nut(id)?.tenVi || '';
  const ids = new Set([...cay.la, ...cay.tieuDe].map((n) => n.id));
  const daDung = new Map(); const hopLe = [];
  banNhap.chongLanTruc.forEach((x, i) => {
    const truoc = loi.length; const L = (m) => loi.push(m);
    if (!x || typeof x !== 'object' || Array.isArray(x)) { L(`cong0-chong-lan-truc-hinh-dang:${i}`); return; }
    for (const k of Object.keys(x)) if (!KHOA_CLT.includes(k)) L(`cong0-chong-lan-truc-khoa-la:${i}:${k}`);
    const c = chuanClt(x);
    if (c.nhanh.length < 2 || new Set(c.nhanh).size !== c.nhanh.length) L(`cong0-chong-lan-truc-nhanh:${i}`);
    for (const id of c.nhanh) {
      if (!ids.has(id)) L(`cong0-chong-lan-truc-ngoai-phan-nhom:${i}:${id}`);
      if (daDung.has(id) && daDung.get(id) !== i) L(`cong0-chong-lan-truc-trung:${id}`);
      daDung.set(id, i);
    }
    if (new Set(c.nhanh.map((id) => T.chaTang(id))).size > 1) L(`cong0-chong-lan-truc-khong-anh-em:${i}`);
    for (const id of new Set([...c.nhanh, ...Object.keys(c.truc)])) if (!c.nhanh.includes(id) || !TRUC_HOP_LE.includes(c.truc[id])) L(`cong0-chong-lan-truc-truc:${i}:${id}`);
    if (new Set(c.nhanh.map((id) => c.truc[id]).filter(Boolean)).size < 2) L(`cong0-chong-lan-truc-mot-truc:${i}`);
    if (!lyDoThat(c.cauHoi) || !/[?？]/.test(c.cauHoi)) L(`cong0-chong-lan-truc-cau-hoi:${i}`);
    for (const id of c.nhanh) if (typeof c.trich[id] !== 'string' || !c.trich[id].trim()) L(`cong0-chong-lan-truc-thieu-trich:${i}:${id}`);
    // Cổng 3: trích nguyên văn chữ biểu của CHÍNH nhánh; trục khai khớp kiểu khoá thật của điều kiện riêng nhánh.
    for (const id of c.nhanh) {
      const t = c.trich[id];
      if (typeof t === 'string' && t.trim() && (S.squash(t).length < 4 || kiemDoan(t, chuCua(id)) !== null)) L(`cong3-chong-lan-truc-trich:${i}:${id}`);
      if (TRUC_HOP_LE.includes(c.truc[id]) && ids.has(id) && !KIEU_CUA_TRUC[c.truc[id]].some((k) => kieuRieng(banNhap, id).has(k))) L(`cong3-chong-lan-truc-truc-lech:${i}:${id}`);
    }
    // phanXu: chỉ Claude/người soát ghi (spec cấm); nguồn phải kiểm được.
    if (c.phanXu !== null) {
      const px = c.phanXu; const ng = px && typeof px === 'object' ? px.nguon : null;
      if (!px || typeof px !== 'object' || !c.nhanh.includes(T.chuanMa(String(px.chon || '')))) L(`cong0-chong-lan-truc-phan-xu-chon:${i}`);
      if (!ng || typeof ng !== 'object' || !LOAI_PHAN_XU.includes(ng.loai)) L(`cong0-chong-lan-truc-phan-xu-loai:${i}`);
      else if (ng.loai === 'NGUOI_DUYET') {
        for (const k of ['nguoi', 'ngay', 'quyetDinh', 'kenh']) if (typeof ng[k] !== 'string' || !ng[k].trim()) L(`cong0-chong-lan-truc-phan-xu-nguoi-duyet:${i}:${k}`);
        if (typeof ng.ngay === 'string' && ng.ngay.trim() && !laNgayHopLe(ng.ngay)) L(`cong0-chong-lan-truc-phan-xu-nguoi-duyet:${i}:ngay`);
      } else if (ng.loai === 'CHU_GIAI') {
        const ma = String(ng.ma || ''); const tep = tepCuaNguon(ma); const id = nz(ma.slice(ma.indexOf('.') + 1));
        const dungNut = !ma.startsWith('sen.') || pn6.startsWith(id) || id.startsWith(pn6);
        if (!RE_NGUON_CHU_GIAI.test(ma) || src[ma] == null || !tep || nhanCuaTep(tep) !== 'NGUYEN_VAN' || !dungNut) L(`cong3-chong-lan-truc-phan-xu-nguon:${i}`);
        else if (S.squash(ng.trich).length < 10 || kiemDoan(ng.trich, src[ma]) !== null) L(`cong3-chong-lan-truc-phan-xu-trich:${i}`);
      } else if (ng.loai === 'TIEN_LE' && loi.length === truoc) {
        const l = kiemPhanXuTienLe(c, ng); if (l) L(`cong3-chong-lan-truc-phan-xu-tien-le:${i}:${l}`);
      }
    }
    if (loi.length === truoc) hopLe.push([i, c]);
  });
  if (!chongThat) return { loi, canhBao, phu };
  // Cổng 2: cặp được phủ + nhánh khai thừa.
  for (const [i, c] of hopLe) {
    let dem = 0; const coChong = new Set();
    for (const k of chongThat) {
      const [a, b] = k.split('+'); const rn = reNhanh(a, b);
      if (!rn.x || !rn.y || !c.nhanh.includes(rn.x) || !c.nhanh.includes(rn.y) || c.truc[rn.x] === c.truc[rn.y]) continue;
      phu.add(k); dem += 1; coChong.add(rn.x); coChong.add(rn.y);
    }
    if (dem) canhBao.push(`cong2-chong-lan-truc-da-khai:${[...c.nhanh].sort().join(',')}:${dem}`);
    for (const id of c.nhanh) {
      if (coChong.has(id)) continue;
      // Chỉ kết luận thừa khi mọi cặp dòng giữa nhánh này và các nhánh khác trục đã được vét cạn (không lấy mẫu).
      const laId = cay.la.filter((n) => duoiNut(id, n.id)).map((n) => n.id);
      const laKhac = cay.la.filter((n) => c.nhanh.some((o) => o !== id && c.truc[o] !== c.truc[id] && duoiNut(o, n.id))).map((n) => n.id);
      const vetCan = !daXet || laId.every((a) => laKhac.every((b) => daXet.has(khoaCap(a, b))));
      if (vetCan) loi.push(`cong2-chong-lan-truc-nhanh-thua:${i}:${id}`);
    }
  }
  return { loi, canhBao, phu };
}

/**
 * Chạy bốn cổng trên một bản nháp ranh giới.
 * opts.cong (#653): tập cổng cần chạy, mặc định [0, 1, 2, 3]; cổng 0 luôn chạy. [0, 3] = hình dạng + trích có thật, KHÔNG sinh
 * vector (test bản nháp đã commit — thời gian không lớn theo số vector). `cong3-chong-lan-thieu-trich` cần kết quả cổng 2 nên
 * chỉ có khi chạy cổng 2. opts.gioiHanToHop: giới hạn vét cạn (mặc định GIOI_HAN_TO_HOP).
 * @returns {{pn6, hopLe:boolean, loi:string[], canhBao:string[], dung:string[], phamVi:number[], thongKe:{soDong, soTieuDe, soDongCoDieuKien, soTieuDeCoDieuKien, soVector, layMau}}}
 */
function kiemRanhGioi(pn6, banNhap, opts = {}) {
  const phamVi = [...new Set([0, ...(Array.isArray(opts.cong) ? opts.cong : [1, 2, 3, 5]).map(Number)])].filter((x) => [0, 1, 2, 3, 5].includes(x)).sort();
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
  if (phamVi.includes(3)) loi.push(...kiemTrich(code, banNhap, canhBao), ...kiemLietKeMotChuoi(banNhap));
  if (phamVi.includes(5)) { const c5 = kiemVe(code, banNhap); loi.push(...c5.loi); canhBao.push(...c5.canhBao); thongKe.cong5 = c5.thongKe; }
  let clt = null;
  if (phamVi.includes(1) || phamVi.includes(2)) {
    const bang = bangUngVien(soTay);
    const ghep = themUngVienGhep(cay, soTay, bang);
    const c1 = phamVi.includes(1) ? kiemPhuKin(code, cay, soTay, bang, gioiHan) : { loi: [], canhBao: [], soVector: 0, layMau: false };
    loi.push(...c1.loi); canhBao.push(...c1.canhBao);
    const c2 = phamVi.includes(2) ? kiemLoaiTru(code, cay, soTay, bang, capChongLan(banNhap), gioiHan, ghep) : null;
    if (c2) {
      // #683: cặp chồng lấn trục đã khai chongLanTruc hợp lệ ⇒ không còn là lỗi cong2-chong-lan (cảnh báo -da-khai).
      clt = kiemChongLanTruc(code, banNhap, cay, c2.chongThat, c2.daXet);
      const conLoi = c2.loi.filter((l) => { const m = l.match(/^cong2-chong-lan:(\d{8})\+(\d{8}):/); return !(m && clt.phu.has(khoaCap(m[1], m[2]))); });
      const cs = kiemChinhSachChongLan(code, banNhap, c2.chongThat, clt.phu);
      loi.push(...conLoi, ...cs.loi);
      // Cặp đã khai nằm trong chồng lấn theo trục: khai không gỡ được ⇒ cảnh báo cong2-chong-lan-van-ban thành lỗi.
      for (const c of c2.canhBao) {
        const m = c.match(/^cong2-chong-lan-van-ban:(\d{8})\+(\d{8}):/);
        if (m && cs.haCap.has(khoaCap(m[1], m[2]))) loi.push(c.replace(/^cong2-chong-lan-van-ban:/, 'cong2-chong-lan-van-ban-truc:')); else canhBao.push(c);
      }
    }
    thongKe.soVector = c1.soVector + (c2 ? c2.soVector : 0);
    thongKe.layMau = Boolean(c1.layMau || c2?.layMau);
  }
  if (!clt) clt = kiemChongLanTruc(code, banNhap, cay);
  loi.push(...clt.loi); canhBao.push(...clt.canhBao);
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

// ── Cổng 5: phạm vi VẾ bổ nghĩa (soát L1-4c đợt 2, #659) ────────────────────────────────────────────────────────
// Chữ biểu của từng mục có điều kiện (lib/ho-so/tach-ve.js) tách thành vế. Mọi vế GIỚI HẠN phải có điều kiện đọc tới (neo
// trong vế), lặp chữ tổ tiên, hoặc được miễn BO_VE có lý do — không thì điều kiện RỘNG hơn chữ (`cong5-ve-gioi-han-bi-bo`).
// Vế MỞ bị bỏ trong khi danh sách đứng trước bị liệt kê đóng ⇒ HẸP hơn chữ (`cong5-ve-mo-bi-bo`). Định ngữ chung tách khỏi
// danh từ đầu liên hợp (đối chiếu chữ Anh cùng dòng) ⇒ `cong5-dinh-ngu-tach`. Ghi chú DE_TRONG / "người soát xem" ⇒ cảnh báo
// `cong5-de-trong-chua-xu-ly` (duyet() từ chối tới khi người soát ghi kết luận).
const RE_DE_TRONG = /DE_TRONG|người\s+soát\s+(?:xem|xét|lưu\s*ý|quyết|đối\s+chiếu)|lưu\s+ý\s+soát/iu;
const LY_DO_RONG = /^(?:người soát xem|người soát xét|de[_ ]trong|để trống|soát xem|xem sau|todo|chưa rõ|\?+)$/iu;
/** Lý do / kết luận thật: ≥ 10 ký tự, không phải "người soát xem", "DE_TRONG", "để trống"… */
function lyDoThat(s) {
  const x = String(s || '').normalize('NFC').trim().replace(/[.\s…!]+$/u, '');
  return x.length >= 10 && !LY_DO_RONG.test(x) && !/người\s+soát\s+xem|DE_TRONG/iu.test(x);
}
/** Mã các mục có ghi chú loại DE_TRONG (hoặc chữ "người soát xem", "lưu ý soát"…) — chưa phải đã xử lý. */
function dsDeTrong(b) {
  const out = [];
  for (const g of Array.isArray(b?.ghiChuSoan) ? b.ghiChuSoan : []) {
    if (!g || typeof g !== 'object' || g.loai === 'BO_VE') continue;
    if (g.loai === 'DE_TRONG' || RE_DE_TRONG.test(String(g.ghiChu || ''))) out.push(String(g.ma));
  }
  return [...new Set(out)];
}
const chuThuong = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/\s+/g, ' ').replace(/[\s,;:]+$/, '').trim();

/**
 * Định ngữ chung bị tách (cong5-dinh-ngu-tach). Chỉ xét khi vế có ≥ 2 danh từ đầu liên hợp và chữ Anh cùng dòng có cùng số vế:
 *   A  chữ Anh "A and B <for/of/with …>" (định ngữ sau liên hợp) ⇒ định ngữ CHUNG: một giá trị tenLoai mang định ngữ, giá trị
 *      khác không mang, và không điều kiện nào khác phủ định ngữ ⇒ tách (8536901 "Đầu nối và các bộ phận … cho dây dẫn và cáp").
 *   B  chữ Anh "A and B" không định ngữ ⇒ định ngữ Việt là của danh từ CUỐI: điều kiện phủ định ngữ cùng nhóm VÀ với tenLoai
 *      liệt kê ≥ 2 danh từ đầu ⇒ gắn cho cả danh từ không mang nó (63079070 "Quạt và màn che kéo bằng tay" / "Fans and handscreens").
 *   C  chữ Anh không liên hợp ("Telephone patch panels") ⇒ các danh từ Việt là MỘT khái niệm; phần đuôi dư của danh từ cuối
 *      ("cáp điện thoại") là định ngữ chung — chỉ nằm trong giá trị tenLoai của danh từ cuối ⇒ tách (85369093).
 */
function dinhNguTach(v, ven, neo, dieuKien, nhom) {
  const lh = v.lienHop;
  if (!ven || lh.length < 2) return null;
  const md = v.menhDe.filter((x) => !x.ngoac);
  const iDau = md.findIndex((x) => x.loai === 'DAU');
  const M = iDau >= 0 && md[iDau + 1]?.loai === 'GIOI_HAN' ? md[iDau + 1] : null;
  const conj = (n) => lh.findIndex((c) => V.giao(n, c) >= 2);
  const nE = ven.lienHop.length;
  const coKhac = (L, D) => nhom.filter((g) => g.has(L.id)).some((g) => neo.some((n) => n.id !== L.id && g.has(n.id) && V.giao(n, D) >= 2));
  for (const L of dieuKien.filter((d) => d.kieu === 'TEN_LOAI')) {
    const nl = neo.filter((n) => n.id === L.id && conj(n) >= 0);
    const cs = new Set(nl.map(conj));
    if (M && nE >= 2 && ven.hauNgu && !ven.truocDau) {
      if (nl.some((n) => V.giao(n, M) >= 2) && nl.some((n) => V.giao(n, M) === 0) && !coKhac(L, M)) return { kieu: 'A', dinhNgu: M.chu };
    }
    if (M && nE >= 2 && !ven.hauNgu && nE === lh.length && cs.size >= 2 && coKhac(L, M)) return { kieu: 'B', dinhNgu: M.chu };
    if (nE === 1 && cs.size >= 2) {
      const c1 = lh[0]; const cn = lh[lh.length - 1];
      const k = V.amTiet(cn.chu).length - V.amTiet(c1.chu).length;
      if (k >= 2) {
        const duoi = V.amTiet(cn.chu).slice(-k).join(' ');
        const D = { bd: cn.kt - duoi.length, kt: cn.kt };
        // giá trị tenLoai của danh từ cuối chứa TRỌN phần đuôi (định ngữ) mà giá trị kia không có ⇒ tách.
        if (nl.some((n) => n.bd <= D.bd && n.kt >= D.kt) && !coKhac(L, D)) return { kieu: 'C', dinhNgu: duoi };
      }
    }
  }
  return null;
}

/**
 * Phân tích vế của mọi mục có điều kiện (dùng cho cổng 5 và CLI --ve).
 * @returns {{loi: string[], canhBao: string[], thongKe: object, chiTiet: object[]}}
 */
function phanTichVe(pn6, b) {
  const loi = []; const canhBao = [];
  const thongKe = { soMuc: 0, soVe: 0, phu: 0, mien: 0, lap: 0, khongHep: 0, chuaPhu: 0, dinhNguTach: 0 };
  const chiTiet = [];
  const ghi = Array.isArray(b?.ghiChuSoan) ? b.ghiChuSoan : [];
  const boVe = ghi.map((g, i) => ({ g, i })).filter(({ g }) => g && typeof g === 'object' && g.loai === 'BO_VE');
  const muc = [...(b?.dong8 || []).map((m) => [nz(m?.hs), m]), ...(b?.dieuKienNut || []).map((m) => [T.chuanMa(m?.id), m])]
    .filter(([ma, m]) => ma && coNoiDung(m));
  const maDaXet = new Set();
  for (const [ma, m] of muc) {
    maDaXet.add(ma);
    const cb = V.chuBieu(ma);
    if (!cb.vi) { canhBao.push(`cong5-khong-co-chu:${ma}`); continue; }
    thongKe.soMuc += 1;
    const kq = V.tachVe(cb.vi, cb.en);
    const t = kq.chu; const tl = t.toLowerCase();
    const { neo, dieuKien, nhom } = V.neoDieuKien(m.dieuKienSo, t);
    // Vòng 7 (#711): giá trị chữ tự do chứa "tương tự"/"similar" là giá trị CHẾT — không neo (tach-ve), và là lỗi riêng.
    const factChet = new Set(DK.traiPhang(m.dieuKienSo).filter((c) => c && DK.laOpChuTuDo(c.op) && dsGiaTri(c.value).some((v) => DK.RE_CUM_TUONG_TU.test(String(v ?? '')))).map((c) => c.fact));
    for (const f of factChet) loi.push(`cong5-gia-tri-tuong-tu:${ma}:${f}`);
    const toTien = [];
    for (let id = T.chaTang(ma), i = 0; id && i < 12; id = T.chaTang(id), i += 1) {
      toTien.push(chuThuong(V.chuan(V.chuBieu(id).vi)));
      if (!T.laIdTang(id) && nz(id).length <= 4) break;
    }
    const mien = [];
    for (const { g, i } of boVe.filter(({ g }) => T.chuanMa(g.ma) === ma)) {
      const ve = chuThuong(V.chuan(g.ve));
      if (!ve || !tl.includes(ve)) { loi.push(`cong5-bo-ve-khong-co-trong-chu:${ma}:${i}`); continue; }
      if (!lyDoThat(g.lyDo)) { loi.push(`cong5-bo-ve-ly-do:${ma}:${i}`); continue; }
      mien.push({ ve, chu: String(g.ve).trim(), i, dung: false });
    }
    const coNeo = (x) => neo.some((n) => V.giao(n, x) >= Math.min(2, n.kt - n.bd));
    const mienCua = (x) => {
      const c = chuThuong(x.chu || x);
      const w = mien.find((y) => y.ve.includes(c) || (c.includes(y.ve) && y.ve.length * 2 >= c.length));
      if (w) w.dung = true;
      return w;
    };
    // Lặp chữ tổ tiên: so sau khi bỏ hết khoảng trắng ("1.000 V" = "1.000V").
    const lap = (x) => { const core = chuThuong(V.loiMenhDe(x)).replace(/\s+/g, ''); return core.length >= 2 && toTien.some((s) => s.replace(/\s+/g, '').includes(core)); };
    const enVe = kq.en && kq.en.ve.length === kq.ve.length ? kq.en.ve : null;
    const veOut = [];
    kq.ve.forEach((v, iv) => {
      const md = v.menhDe;
      for (const x of md) {
        if (x.loai === 'GIOI_HAN') {
          thongKe.soVe += 1;
          x.trangThai = coNeo(x) ? 'PHU' : mienCua(x) ? 'MIEN' : lap(x) ? 'LAP' : 'CHUA_PHU';
        } else if (x.loai === 'MO') {
          thongKe.soVe += 1;
          const s = md[x.ds];
          const hep = s && neo.some((n) => V.giao(n, s) >= Math.min(2, n.kt - n.bd) && V.giao(n, x) === 0);
          x.trangThai = coNeo(x) ? 'PHU' : !hep ? 'KHONG_HEP' : mienCua(x) ? 'MIEN' : 'CHUA_PHU';
          if (x.trangThai === 'CHUA_PHU') loi.push(`cong5-ve-mo-bi-bo:${ma}:${x.chu}`);
        }
        const dem = { PHU: 'phu', MIEN: 'mien', LAP: 'lap', KHONG_HEP: 'khongHep', CHUA_PHU: 'chuaPhu' }[x.trangThai];
        if (dem) thongKe[dem] += 1;
      }
      // Gộp các vế giới hạn chưa phủ liền nhau (bỏ qua ngoặc chú thích lồng bên trong) thành một lỗi.
      let chay = null;
      const xa = () => { if (chay) loi.push(`cong5-ve-gioi-han-bi-bo:${ma}:${t.slice(chay.bd, chay.kt).replace(/[\s,;]+$/, '')}`); chay = null; };
      for (const x of md) {
        if (x.loai === 'PHU') continue;
        if (x.loai === 'GIOI_HAN' && x.trangThai === 'CHUA_PHU') {
          if (chay && x.bd <= chay.kt + 3) chay.kt = Math.max(chay.kt, x.kt); else { xa(); chay = { bd: x.bd, kt: x.kt }; }
        } else if (!(chay && x.ngoac && x.kt <= chay.kt)) xa();
      }
      xa();
      const dn = dinhNguTach(v, enVe?.[iv], neo, dieuKien, nhom);
      if (dn && !mienCua(dn.dinhNgu)) { loi.push(`cong5-dinh-ngu-tach:${ma}:${dn.dinhNgu}`); thongKe.dinhNguTach += 1; }
      veOut.push({ chu: v.chu, lienHop: v.lienHop.map((c) => c.chu), menhDe: md.map((x) => ({ loai: x.loai, kieu: x.kieu, chu: x.chu, ...(x.trangThai ? { trangThai: x.trangThai } : {}) })), ...(dn ? { dinhNguTach: dn } : {}) });
    });
    for (const w of mien) canhBao.push(w.dung ? `cong5-bo-ve:${ma}:${w.chu}` : `cong5-bo-ve-thua:${ma}:${w.i}`);
    chiTiet.push({ ma, vi: t, en: cb.en || null, ve: veOut });
  }
  for (const { g, i } of boVe) if (!maDaXet.has(T.chuanMa(g.ma))) canhBao.push(`cong5-bo-ve-thua:${g.ma}:${i}`);
  for (const ma of dsDeTrong(b)) {
    const xong = (b?.duyet?.giaiQuyetDeTrong || []).some((g) => T.chuanMa(g?.ma) === T.chuanMa(ma) && lyDoThat(g?.ketLuan));
    if (!xong) canhBao.push(`cong5-de-trong-chua-xu-ly:${ma}`);
  }
  return { loi, canhBao, thongKe, chiTiet };
}
function kiemVe(pn6, b) { const { loi, canhBao, thongKe } = phanTichVe(pn6, b); return { loi, canhBao, thongKe }; }

// ── Quy trình: duyệt / trả về / áp vào sổ tay ────────────────────────────────────────────────────────────────
const ganNhan = (b, nhan) => { for (const m of [...(b.dong8 || []), ...(b.dieuKienNut || [])]) m.nguonLoai = nhan; return b; };
/** Nâng bản nháp lên DUYET / CLAUDE_DUYET. Ném lỗi khi: phân nhóm cần bảng hiệu chỉnh mà chưa có, cùng phiên người soạn, cổng đỏ. */
function duyet(banNhap, { phien, ngay, ghiChu, giaiQuyet } = {}) {
  const pn6 = nz(banNhap?.pn6);
  if (canHieuChinh(pn6) && !coHieuChinh(pn6)) throw new Error(`can-bang-hieu-chinh-tien-le:${pn6} — cần mục trong data/ho-so/hieu-chinh-tien-le.json (L1-4b) trước khi duyệt`);
  if (!String(phien || '').trim()) throw new Error('thieu-phien-duyet');
  if (cungNguoi(phien, banNhap?.soanBoi?.phien)) throw new Error('cung-phien-nguoi-soan: người soạn không tự duyệt (L1-4c: agent Claude mới) — cong0-tu-duyet');
  const lp = kiemPhien(phien, 'soat'); if (lp) throw new Error(lp);
  // Cổng 5: ghi chú DE_TRONG / "người soát xem" KHÔNG phải đã xử lý — người soát ghi kết luận cho từng mục.
  const gq = (Array.isArray(giaiQuyet) ? giaiQuyet : []).filter((g) => g && lyDoThat(g.ketLuan)).map((g) => ({ ma: T.chuanMa(g.ma), ketLuan: String(g.ketLuan).trim() }));
  const thieu = dsDeTrong(banNhap).filter((ma) => !gq.some((g) => g.ma === T.chuanMa(ma)));
  if (thieu.length) throw new Error(`cong5-de-trong-chua-xu-ly:${thieu.join(',')} — ghi chú DE_TRONG/"người soát xem" chưa có kết luận của người soát: --giai-quyet=<mã>:<kết luận> cho từng mục`);
  const nhap = ganNhan({ ...clone(banNhap), trangThai: 'NHAP', duyet: null }, 'AI_DA_KIEM');
  const r = kiemRanhGioi(pn6, nhap);
  if (!r.hopLe) throw new Error(`cong-do: ${r.loi.join('; ')}`);
  const out = ganNhan({ ...nhap, trangThai: 'DUYET' }, 'CLAUDE_DUYET');
  out.duyet = { boi: 'CLAUDE_DUYET', phien, ngay: ngay || null, ...(ghiChu ? { ghiChu } : {}), ...(gq.length ? { giaiQuyetDeTrong: gq } : {}), bam: bamRanhGioi(out) };
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
  // Dấu CHONG_LAN_TRUC (#683) sang mục sổ tay của MỌI nhánh trong cụm (bỏ dấu cũ của phân nhóm trước): động cơ hồ sơ đọc dấu
  // trên mục đã duyệt để không tự chọn nhánh khi dữ kiện thoả ≥ 2 nhánh khác trục (trừ phanXu có nguồn).
  for (const m of [...out.dong8, ...(out.dieuKienNut || [])]) if (T.chuanMa(m.hs || m.id).startsWith(pn6)) delete m.chongLanTruc;
  for (const x of dsClt(banNhap)) {
    const c = chuanClt(x);
    const dau = { pn6, nhanh: c.nhanh, truc: c.truc, cauHoiPhanBiet: c.cauHoi, trich: c.trich, phanXu: clone(c.phanXu), ranhGioi: dauVet };
    for (const id of c.nhanh) {
      const d = laDongTam(id) ? out.dong8.find((m) => nz(m.hs) === id) : (out.dieuKienNut || []).find((m) => T.chuanMa(m.id) === id);
      if (!d) { loi.push(`${id}:chong-lan-truc-khong-co-muc`); continue; }
      d.chongLanTruc = clone(dau);
    }
  }
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
  'Chỉ dùng khoá tu-vung (danh sách tuVung — runtime tu-vung@2) với đúng op của kiểu; không dùng fact cũ snake_case, không HOAC.',
  'trich chép NGUYÊN VĂN từ đúng nguồn của chính mục (tax.<chính dòng>, tieuDe.<chính tiêu đề>, SEN/chú giải); mọi đoạn lược "…" phải có trong nguồn, đúng thứ tự.',
  'Điều kiện chỉ nói điều câu trích nói (LUAT-CHUNG luật 7): biên ≤/< đúng chữ ("không quá" = <=, "dưới" = <, "trên" = >, "từ … trở lên" = >=); "Không …" = op KHONG.',
  'Dòng "Loại khác" trần và tiêu đề "Loại khác" trần: không ghi điều kiện (máy phủ định anh em). "Loại khác, <vế>": chỉ ghi điều kiện của vế.',
  'Tiêu đề có tên (dieuKienNut): nguồn tieuDe.<id> = tên nguyên văn biểu thuế Tổng cục.',
  'Không diễn đạt được bằng từ vựng hiện có → để trống dieuKienSo và ghi ghiChuSoan {ma, ghiChu}: cổng 1 sẽ chặn, đúng ý (không ép).',
  'Không tự gắn CLAUDE_DUYET; nhãn do duyet() của phiên soát độc lập gán.',
  'Tầng không mã của biểu thuế (tiêu đề không mã mà cây theo chữ số làm mất) là nút `<pn6>~r<dòng>` trong cây của gói: tầng có tên ⇒ khai dieuKienNut cho id đó (nguồn tieuDe.<pn6>~r<dòng>), bỏ qua ⇒ cong1-tang-khong-ma; tầng "Loại khác:" trần không ghi điều kiện. Gói có tầng trangThai KHONG_DAT ⇒ DỪNG, báo Claude (cổng 1 chặn mọi dòng dưới tầng, không có cách vượt).',
  'Cổng 5 (vế bổ nghĩa, #659): mọi vế GIỚI HẠN ("không …", "có thể …", "dùng cho/để/cho …", "bằng …", "của …", biên số, "(trừ …)") phải có điều kiện đọc tới; vế MỞ ("… và các loại tương tự", "và bộ phận của chúng") không được bị cắt bằng danh sách đóng; định ngữ chung đi với MỌI danh từ đầu liên hợp. Không phủ được ⇒ ghiChuSoan {ma, loai: "BO_VE", ve: "<nguyên văn>", lyDo} hoặc DỪNG — ghi chú DE_TRONG / "người soát xem" KHÔNG phải đã xử lý. Xem vế: --ve --pn6=<pn6>.',
  'Chữ biểu TỰ chồng lấn (hai dòng cùng thoả, chữ không tách): không bịa điều kiện tách; khai chongLanVanBan [{cap:[hsA,hsB], lyDo}] (cổng 2 thành cảnh báo, runtime không tự chốt). Thứ tự ưu tiên chỉ khi có căn cứ trích được (TB-TCHQ, SEN/chú giải, GIR qua lib/gir.js).',
  'Chồng lấn TRỤC (cong2-chong-lan-truc: nhánh anh em chia theo tên cạnh nhánh chia theo công dụng, #683): KHÔNG khai chongLanVanBan; khai chongLanTruc [{nhanh: [<id anh em>…], truc: {<id>: "TEN_LOAI"|"CONG_DUNG"|"DAC_DIEM"} (DAC_DIEM = khoá đặc điểm có/không hoặc liệt kê), cauHoiPhanBiet: "<câu hỏi tiếng Việt phân biệt các nhánh, viết từ chữ biểu>?", trich: {<id>: "<chữ biểu nguyên văn của nhánh>"}, phanXu: null}]. KHÔNG điền phanXu (chỉ Claude/người soát, khi có chú giải/tiền lệ/người duyệt).',
];
/**
 * Gợi ý khoá tu-vung theo chữ biểu (#577): ý "số lõi/sợi", "tỉ lệ", "chỉ hoặc chủ yếu", "thiết kế chủ yếu cho trẻ em", "phương
 * pháp chế tạo". Khoá ĐÃ có trong từ vựng runtime (tu-vung@2) ⇒ `goiYKhoa` (người soạn kiểm --tu-vung --khoa=<khoá>); khoá CHƯA
 * có ⇒ `nghiThieuKhoa` (DỪNG THIEU_KHOA_TU_VUNG, không tự đặt khoá). Chỉ là gợi ý, không phải điều kiện.
 */
const MAU_GOI_Y_KHOA = [
  [/(^|[^\p{L}])(một|hai|ba|bốn|năm|\d+)\s+(sợi|lõi)|sợi\s+hoặc\s+hơn|lõi\s+hoặc\s+hơn|nhiều\s+(sợi|lõi)|lõi\s+đơn/iu, 'soLoi/soSoi — số lõi, số sợi', ['soLoi', 'soSoi']],
  [/\d+\s*\/\s*\d+\s*(đường kính|chiều|độ dày)|tỷ lệ|tỉ lệ|lần đường kính/iu, 'tiLe — tỉ lệ kích thước', ['tiLe']],
  [/chỉ\s+(hoặc\s+chủ\s+yếu|sử dụng\s+hoặc\s+chủ\s+yếu|dùng\s+hoặc\s+chủ\s+yếu)|chủ\s+yếu\s+(dùng|sử dụng)/iu, 'chiHoacChuYeu — "chỉ hoặc chủ yếu dùng cho"', ['chiHoacChuYeu']],
  [/thiết\s+kế\s+(chủ\s+yếu\s+)?cho\s+trẻ\s+em/iu, 'thietKeChoTreEm — "được thiết kế chủ yếu cho trẻ em"', ['thietKeChoTreEm']],
  [/phương pháp|được\s+(đúc|rèn|cán|kéo|dập|hàn|ép|thổi)\b|(đúc|rèn|cán)\s+(nóng|nguội)/iu, 'phuongPhapCheTao — phương pháp chế tạo', ['phuongPhapCheTao']],
  // #681: "120VDC", "120 V DC", "220VAC" — chữ DC/AC (viết hoa) dính số/V là loại dòng điện (cachDoc.en của loaiDongDien).
  [/(?<![\p{L}])V?\s?(?:DC|AC)(?![\p{L}])/u, 'loaiDongDien — "VDC"/"V DC" = MOT_CHIEU, "VAC"/"V AC" = XOAY_CHIEU', ['loaiDongDien']],
];
function goiYKhoaTheoChu(ten) {
  const t = String(ten || '').normalize('NFC');
  const co = (k) => { try { return Boolean(TV.layKhoa(k)); } catch { return false; } };
  const goiY = []; const thieu = [];
  for (const [re, g, ds] of MAU_GOI_Y_KHOA) if (re.test(t)) (ds.every(co) ? goiY : thieu).push(g);
  return { goiY, thieu };
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
    ...(goiYKhoaTheoChu(n.tenVi).goiY.length ? { goiYKhoa: goiYKhoaTheoChu(n.tenVi).goiY } : {}),
    ...(goiYKhoaTheoChu(n.tenVi).thieu.length ? { nghiThieuKhoa: goiYKhoaTheoChu(n.tenVi).thieu } : {}),
    ...(laTieuDe(n) && !n.tenVi ? { chan: 'tieu-de-bi-luoc-ten' } : {}),
    nguon: nguonCuaNut(n, src, srcNut),
  }));
  const nguonPhanNhom = Object.entries(src).filter(([k]) => k === `wco.${code}` || (k.startsWith('sen.') && code.startsWith(nz(k)))).map(([k, v]) => ({ nguon: k, text: v.slice(0, 1200) }));
  const chuGiai = Object.keys(src).filter((k) => /^(nhom|ch|phan)\d+\./.test(k)).map((k) => ({ nguon: k, doDai: src[k].length }));
  const tv = TV.taiTuVung();
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
    phienBan: PHIEN_BAN, pn6: g.pn6, nhom: g.nhom, bieuThue: g.bieuThue, tuVung: TV.taiTuVung().phienBan, trangThai: 'NHAP',
    soanBoi: { vai: 'AI', phien: phien || null, ngay: ngay || null }, duyet: null,
    dieuKienNut: g.canSoHoa.filter((x) => x.loai === 'TIEU_DE' && !x.khongCanDieuKien && !x.chan && x.nguon.length).map((x) => ({ id: x.ma, ...muc(x) })),
    dong8: g.canSoHoa.filter((x) => x.loai === 'DONG8').map((x) => ({ hs: x.ma, ...muc(x) })),
    ghiChuSoan: [],
  };
}

// ── Spec khai báo → bản nháp (#577, --ap-spec): thợ không sửa tay JSON nháp ───────────────────────────────────────
const PHIEN_BAN_SPEC = 'ranh-gioi-spec@1';
const KHOA_SPEC = ['phienBan', 'pn6', 'phien', 'dong8', 'dieuKienNut', 'chongLanVanBan', 'chongLanTruc', 'ghiChuSoan'];
const KHOA_CAM = ['nguonLoai', 'trangThai', 'duyet', 'soanBoi', 'traVe'];
const KHOA_MUC = ['dieuKienSo', 'trich', 'nguon', 'phanConLai'];
const KHOA_GHI_CHU = ['ma', 'loai', 'ghiChu', 'khoaDeXuat', 've', 'lyDo'];
/**
 * Áp một spec `ranh-gioi-spec@1` lên khung nháp của phân nhóm (hàm thuần, tất định):
 *   { phienBan, pn6, phien: "<định danh>#soan-<nhãn>",
 *     dong8: { "<hs8>": { dieuKienSo: [...], trich?, nguon?, phanConLai? } | [điều kiện…] },
 *     dieuKienNut: { "<id tiêu đề>": … }, chongLanVanBan?: [{cap, lyDo}], ghiChuSoan?: [{ma, loai, ghiChu, khoaDeXuat?}],
 *     chongLanTruc?: [{nhanh, truc, cauHoiPhanBiet, trich, phanXu: null}] }  — phanXu chỉ Claude/người soát ghi (spec-khoa-cam).
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
      if (c && typeof c === 'object' && c.fact && !DK.laFactTuVung(c.fact)) dung.push(`spec-thieu-khoa-tu-vung:${ma}:${c.fact} — THIEU_KHOA_TU_VUNG: khoá không có trong ${TV.taiTuVung().phienBan}, không tự đặt khoá`);
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
        if (g.loai === 'BO_VE') {
          if (!String(g.ve || '').trim()) loi.push(`spec-hinh-dang:${duong}.ve — BO_VE cần ve (nguyên văn vế bỏ)`);
          if (!String(g.lyDo || '').trim()) loi.push(`spec-hinh-dang:${duong}.lyDo — BO_VE cần lyDo`);
        } else if (!String(g.ghiChu || '').trim()) loi.push(`spec-hinh-dang:${duong}.ghiChu — rỗng`);
        const cap = String(g.ma || '').split('+').map(T.chuanMa);
        if (!(cap.length === 1 && maHop.has(cap[0])) && !(cap.length === 2 && cap.every((x) => laIds.has(x)))) loi.push(`spec-hinh-dang:${duong}.ma:${g.ma || ''} — mã dòng/tiêu đề/pn6 hoặc "hsA+hsB"`);
        if (g.loai === 'THIEU_KHOA_TU_VUNG' && !String(g.khoaDeXuat || '').trim()) loi.push(`spec-hinh-dang:${duong}.khoaDeXuat — bắt buộc với THIEU_KHOA_TU_VUNG`);
      });
    }
  }
  if (spec.chongLanVanBan !== undefined && !Array.isArray(spec.chongLanVanBan)) loi.push('spec-hinh-dang:chongLanVanBan — phải là mảng [{cap, lyDo}]');
  if (spec.chongLanTruc !== undefined) {
    if (!Array.isArray(spec.chongLanTruc)) loi.push('spec-hinh-dang:chongLanTruc — phải là mảng [{nhanh, truc, cauHoiPhanBiet, trich, phanXu: null}]');
    else spec.chongLanTruc.forEach((x, i) => { if (x && typeof x === 'object' && x.phanXu != null) loi.push(`spec-khoa-cam:chongLanTruc[${i}].phanXu — chỉ Claude/người soát ghi phân xử (nguồn kiểm được); người soạn để null`); });
  }
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
  if (Array.isArray(spec.chongLanTruc) && spec.chongLanTruc.length) {
    // phanXu do Claude/người soát ghi trên bản nháp được GIỮ khi người soạn áp lại spec với cùng tập nhánh.
    const khoaNhanh = (x) => chuanClt(x).nhanh.slice().sort().join(',');
    const cu = new Map(dsClt(banCu).filter((x) => x && x.phanXu != null).map((x) => [khoaNhanh(x), x.phanXu]));
    out.chongLanTruc = spec.chongLanTruc.map((x) => ({ ...clone(x), phanXu: cu.has(khoaNhanh(x)) ? clone(cu.get(khoaNhanh(x))) : null }));
  }
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
  kiemVe, phanTichVe, dsDeTrong, lyDoThat,
  bangUngVien, // test: ứng viên vector biên (#577 — "Van bi ẑẑẑ")
};
