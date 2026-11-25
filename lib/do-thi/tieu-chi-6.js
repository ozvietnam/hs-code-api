// lib/do-thi/tieu-chi-6.js — KHUÔN g6@1 của `tieuChi6` (cạnh C10 Tách-phân-nhóm + C13 Cần-dữ-kiện của đồ thị tri thức HS).
//
// Tất định, không LLM, không mạng. Một chỗ cho ba việc (mã G6-0 / G6-1, kế hoạch docs/ke-hoach-do-thi-tri-thuc-hs.md mục 6):
//   goiSoan(h4)                gói soạn cho MỘT nhóm: cây phân nhóm, nguồn NGUYÊN VĂN được trích, thông báo phân loại, 20 tờ khai mẫu
//   kiemTieuChi6(h4, ds)       CỔNG MÁY: danh sách lỗi có mã (xem MA_LOI) + cảnh báo LECH_TO_KHAI_CAO
//   apTieuChi(h4, ds, moTa)    áp tiêu chí lên một mô tả hàng bằng LUẬT KHỚP TỪ KHOÁ (chỉ để đo, không phải động cơ phân loại)
// Hướng dẫn cho người / AI soạn: docs/giao-viec/do-thi/SOAN-TIEU-CHI-6-SO.md. Lệnh: scripts/goi-soan-tieu-chi-6.mjs,
// scripts/kiem-tieu-chi-6.mjs. KHÔNG đường khách nào nạp module này (data/luat/dau-noi.json kho.bangCanh).
//
// Vì sao có cổng này: 196/377 sổ ranh giới bị trả về vì "suy rộng" quá chữ luật; ca van điện từ khí nén 5/2 (đúng 8481.20.90)
// bị dừng ở 8481.80 "Thiết bị khác" vì không có gì nói phân nhóm có tên riêng phải xét trước phân nhóm dư.
'use strict';

const fs = require('fs');
const S = require('../so-tay.js');
const T = require('../hs-tree');
const DK = require('../dieu-kien-so.js');
const TV = require('../tu-vung');
const { dataReadPath } = require('../data-paths');
const { khongDau, tuKhoa: tuNoiDung } = require('./tu-khoa');
const { tapNut } = require('./dung-bang-canh');
const { kieuTieuDe } = require('./phan-con-lai');

const KHUON = 'g6@1';
const NGUONG_LECH = 0.1; //      tỉ lệ dòng tờ khai mà tiêu chí chỉ SAI phân nhóm đã khai — vượt thì CẢNH BÁO (không chặn)
const NGUONG_SAI_TREN_KET_LUAN = 0.25; // hoặc: trong các dòng tiêu chí CÓ chỉ, tỉ lệ chỉ sai vượt mức này
const SAI_TOI_THIEU = 3; //      dưới 3 ca sai thì không cảnh báo (mẫu nhỏ)
const SO_TO_KHAI_MAU = 20;
const TRICH_TOI_DA = 600;
const NHOM_TOI_DA = 16000; //    chú giải chi tiết nhóm dài hơn thế này thì gói soạn chỉ đưa các đoạn liên quan
const CHU_GIAI_TOI_DA = 6000; // trần cho phần chú giải chương / phần đưa vào gói soạn

const MA_LOI = {
  KHUON_SAI: 'Sai khuôn JSON: thiếu trường bắt buộc, trường lạ, kiểu dữ liệu sai, op không hợp với kiểu của khoá.',
  PHAN_NHOM_KHONG_TON_TAI: 'hs6 không phải phân nhóm 6 số của nhóm này trong biểu thuế hiện hành.',
  THIEU_PHAN_NHOM: 'Một phân nhóm 6 số của nhóm chưa có mục nào (phân nhóm dư cũng phải có một mục phanConLai: true).',
  NGUON_KHONG_TON_TAI: 'nguon không nằm trong danh sách nguồn của gói soạn.',
  NGUON_LAC_PHAN_NHOM: 'nguon là tiêu đề / tên của một phân nhóm KHÁC (hoặc phân nhóm dư không trích tiêu đề của chính nó).',
  TRICH_KHONG_NGUYEN_VAN: 'trich không tìm thấy nguyên văn trong nguồn đã khai (so sau khi bỏ khoảng trắng, dấu câu, hoa thường).',
  SUY_RONG: 'dieuKien / tuKhoa / value có từ nội dung không xuất hiện trong câu trich của chính mục đó — rộng hơn chữ luật.',
  KHOA_DU_KIEN_LA: 'fact không phải khoá của từ vựng tu-vung@2.',
  DU_SAI_KHAI: 'Khai phanConLai không khớp biểu thuế: phân nhóm kiểu "DU" ("Loại khác", "Thiết bị khác") và "DU_CO_PHAM_VI" ("Thiết bị bảo vệ mạch điện khác") phải có đúng một mục phanConLai: true; phân nhóm kiểu "CO_TEN" (kể cả "X và các Y khác") thì không được có.',
  DU_MANG_DIEU_KIEN: 'Phân nhóm dư kiểu "DU" mang điều kiện khẳng định (chỉ được nhắc lại điều kiện của nhóm một gạch chứa nó), hoặc mục phanConLai mang thêm fact / dieuKien / tuKhoa / uuTien.',
  DU_KHONG_CUOI: 'thuTu ghi tay đặt phân nhóm dư trước một phân nhóm có tên riêng cùng tầng. Bỏ thuTu đi — máy tự xếp.',
  THU_TU_SAI: 'thuTu ghi tay lệch thứ tự máy xếp (theo mã; phân nhóm dư cuối tầng; phân nhóm có uuTien lên đầu). Bỏ thuTu đi — máy tự xếp.',
  THU_TU_KHONG_CAN_CU: 'uuTien không phải câu luật nói phân nhóm này được ưu tiên / xem xét trước; hoặc thuTu ghi tay đẩy một phân nhóm lên trước mà không có uuTien.',
  TRUNG_DIEU_KIEN: 'Hai phân nhóm có bộ điều kiện giống hệt nhau — máy không phân biệt được.',
  SAI_KHOA_THUOC_TINH: 'Dùng tenLoai cho một thuộc tính (chất liệu "Bằng …", trạng thái "Đã / Chưa …", công dụng "Dùng cho …"). tenLoai chỉ nhận TÊN HÀNG. Dùng chatLieu / khoá có–không / dungCho; gói không có khoá hợp thì khai chuaSoHoa.',
  THIEU_VE_GIOI_HAN: 'Một vế nội dung của tiêu đề phân nhóm (hoặc của tầng chứa nó) không có điều kiện / từ khoá nào mang — tiêu chí RỘNG hơn chữ luật (vd 7323.94 "Bằng sắt hoặc thép, đã tráng men" mà thiếu "đã tráng men").',
  CHUA_SO_HOA_CO_KHOA: 'Khai chuaSoHoa trong khi khoá hợp có sẵn: vế là tên hàng (dùng tenLoai), "dùng cho / lắp vào …" (dùng dungCho), "bằng …" (dùng chatLieu), hoặc một khoá trong khoaGoiY đọc được vế đó.',
  GIA_TRI_RONG: 'value / tuKhoa là cụm mở ("các loại tương tự", "loại khác") — không phải tên hàng, không nhận ra được gì. Bỏ phần tử đó.',
  KE_CA_LA_DIEU_KIEN: 'Mục khẳng định chỉ lấy chữ trong vế "kể cả …" của câu trích — vế "kể cả" MỞ RỘNG phạm vi, không phải điều kiện cộng dồn. Gộp các tên đó vào value của mục chính (mảng), không viết mục riêng.',
  TACH_LIET_KE: 'Hai mục tên loại / công dụng khẳng định của cùng một phân nhóm lấy từ CÙNG một câu trích — hai mục là hai điều kiện CÙNG phải thoả. Các tên thay thế của một câu ("Tượng nhỏ và các đồ trang trí") phải gộp thành mảng value của MỘT mục.',
  TEN_CO_CHU_KHAC: 'value của tên loại / công dụng kết thúc bằng "khác" — chữ "khác" đánh dấu phần còn lại, không phải tên hàng.',
  TEN_LOAI_SAU_GIOI_TU: 'tenLoai nhận cụm đứng sau "dùng cho / dùng trong / lắp vào" trong câu trich — đó là thứ mà hàng dùng cho (dungCho), không phải tên hàng.',
  TU_KHOA_QUA_CHUNG: 'tuKhoa chỉ gồm chữ chung ("phụ kiện", "thiết bị", "sản phẩm", "đồ dùng") — không nhận ra được phân nhóm nào.',
  LIET_KE_MOT_CHUOI: 'Một value dạng chuỗi gói cả một danh sách ("A, B và C", "A; B"). Tách thành mảng, mỗi phần tử là một tên chép nguyên từ trich.',
  THIEU_DIEU_KIEN_TANG: 'Phân nhóm nằm dưới một nhóm một gạch có tên mà không có mục nào trích tiêu đề của tầng đó (tieuDe.<thuocTang>) — mất điều kiện của tầng.',
  THIEU_VE_TRU: 'Tiêu đề của phân nhóm (hoặc tầng chứa nó) có vế loại trừ ("trừ …", "nhưng không bao gồm …", "không kể …") nhưng chưa có mục phủ định (chieu: "PHAI_KHONG") hay dieuKienTru cho vế đó.',
  TU_KHOA_TRONG_VE_TRU: 'tuKhoa / value của một mục khẳng định chỉ xuất hiện trong vế loại trừ ("trừ …", "nhưng không bao gồm …", "không kể …") của câu trich — đó là thứ bị LOẠI, không phải dấu hiệu nhận ra phân nhóm.',
  KHOA_NGUOC_VE_TRU: 'Mục khẳng định (TRONG, LA, CO) mang giá trị khớp cụm nằm sau vế loại trừ ("trừ …", "nhưng không …", "không kể …", "không bao gồm …") trong câu trich mà không có trong phần khẳng định — đảo ngược vế trừ.',
  TIEU_DE_CHI_LAC: 'Áp tiêu chí lên chính TIÊU ĐỀ của một phân nhóm thì bị chỉ sang phân nhóm khác: tuKhoa của phân nhóm kia dùng chữ chung của nhiều phân nhóm. Thu hẹp tuKhoa về cụm chỉ riêng phân nhóm đó có.',
  TIEN_LE_SAI: 'tienLe trỏ tới thông báo phân loại không có trong data/precedents.json, hoặc thông báo đó không ra phân nhóm này.',
  CHI_HOI_MUC_DICH: 'Điều kiện / câu hỏi chỉ gồm mục đích, công dụng tự nhận hoặc tên gọi ("dùng cho", "chuyên dụng", "cho tập", "phục vụ"…) mà không có đặc tính kiểm chứng được trên hàng (cấu tạo, kích thước, chất liệu, cơ cấu, thông số) — khách gọi hàng là "đai tập gym" sẽ tự trả lời "có". Chỉ được hỏi công dụng khi chính chữ luật trích định nghĩa phân nhóm bằng công dụng (8481.20), và khi đó phải kèm câu hỏi đặc tính (kiemChung).',
  KHOA_RONG_HON_LUAT: 'Khoá / giá trị tu-vung@2 chọn rộng hơn chữ luật (vd chatLieu "gốm sứ" cho chỉ "sứ", "sắt thép" cho chỉ "sắt"/"thép", "kim loại" cho kim loại cụ thể, bỏ sót chữ thu hẹp như "tổng hợp"/"xốp"/"lưu hóa" mà không có mục khác bù, hoặc tinhDanHoi cho chỉ "sợi đàn hồi" / trừ "sợi cao su"). Chọn khoá hẹp đúng luật hoặc khai chuaSoHoa nếu thiếu khoá.',
  KHOA_HEP_HON_LUAT: 'Khoá / giá trị tu-vung@2 chọn hẹp hơn chữ luật (vật liệu dệt, kim loại cơ bản, plastic chung… vd chatLieu "vải dệt" khi luật nêu "vật liệu dệt", kim loại riêng / kimLoaiCoBanKhac cho "kim loại cơ bản", hay lamTuPVC / nhomPolyme cho "plastic"). Dùng khoá rộng đúng luật.',
};
const CANH_BAO = {
  CONG_DUNG_THIEU_DAC_TINH_KIEM_CHUNG: 'Chữ luật định nghĩa phân nhóm bằng công dụng (được phép), nhưng phân nhóm chưa có câu hỏi đặc tính nào giúp kiểm chứng công dụng đó: thêm kiemChung [{hoi, nguon, trich}] — câu hỏi một đặc tính quan sát / đo được, trích nguyên văn từ luật — hoặc một mục điều kiện đặc tính khác.',
  THIEU_KHOA_TU_VUNG: 'Mục khai chuaSoHoa: chữ luật có tiêu chí nhưng tu-vung@2 chưa có khoá hợp. Phân nhóm này chưa đi được bằng máy; cần bổ sung khoá từ vựng rồi soạn lại.',
  LECH_TO_KHAI_CAO: `Áp tiêu chí bằng luật khớp từ khoá lên tờ khai mẫu của nhóm: chỉ sai phân nhóm đã khai quá ${NGUONG_LECH * 100}% số dòng, hoặc quá ${NGUONG_SAI_TREN_KET_LUAN * 100}% số dòng có kết luận. CHỈ CẢNH BÁO — đọc từng ca: tiêu chí sai thì sửa tiêu chí; tờ khai lệch luật thì giữ tiêu chí.`,
};
const TRUONG = new Set(['hs6', 'thuTu', 'dieuKien', 'fact', 'op', 'value', 'donVi', 'chieu', 'viTri', 'tuKhoa', 'dieuKienTru', 'phanConLai', 'chuaSoHoa', 'uuTien', 'tienLe', 'nguon', 'trich', 'nguonLoai', 'kiemChung']);
// Lời dễ hiểu cho các mã lỗi của lib/dieu-kien-so.js mà người / AI soạn hay gặp.
const GOI_Y_KIEU = [
  [/thieu-don-vi/, 'khoá kiểu SO cần hai trường RIÊNG ở cấp mục: "value": 60, "donVi": "V" (đơn vị chép từ trich) — không lồng donVi vào value'],
  [/value-khong-phai-so/, 'khoá kiểu SO: "value" là MỘT SỐ (vd "value": 60), đơn vị để ở trường riêng "donVi": "V" — không viết chuỗi "60 V", không viết object {so, donVi}'],
  [/don-vi-lech-he|don-vi-khong-co-trong-trich/, '"donVi" phải là đơn vị có trong trich và đúng loại của khoá'],
  [/nguong-khong-co-trong-trich/, 'số ở "value" không có trong trich'],
  [/op-sai-kieu/, '"op" không hợp với kiểu của khoá — xem "op" của khoá đó trong khoaGoiY'],
  [/gia-tri-ngoai-danh-sach/, '"value" phải lấy trong "giaTriHopLe" của khoá'],
  [/khong-co-trong-trich/, '"value" (hoặc cách đọc của khoá) không có trong trich của mục này'],
];
const goiYKieu = (l) => { const g = GOI_Y_KIEU.find(([re]) => re.test(l)); return g ? `${g[1]} [${l}]` : l; };

const so = (v) => String(v == null ? '' : v).replace(/\D/g, '');
const chu = (v) => (typeof v === 'string' ? v.trim() : '');
const cat = (s, n) => { const t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };
const gotTen = (t) => String(t || '').replace(/^[-\s]+/, '').replace(/\s*[:：]\s*$/, '').replace(/\s*\(SEN\)\s*$/i, '').trim();
const cham6 = (h) => `${h.slice(0, 4)}.${h.slice(4, 6)}`;
const docJson = (...p) => JSON.parse(fs.readFileSync(dataReadPath(...p), 'utf8'));

// ───────────────────────────────────────── Cây phân nhóm ─────────────────────────────────────────
/**
 * Mọi phân nhóm 6 số của nhóm theo biểu thuế hiện hành, theo thứ tự mã:
 * [{hs6, ten, tang, tenTang, kieu, du, nguonTen}] — `tang` = nút cha trực tiếp (nhóm 4 số, hoặc nhóm một gạch 5 số);
 * `kieu` = kieuTieuDe(); `du` = (kieu === 'DU'); `nguonTen` = mã nguồn của chính tiêu đề.
 */
function phanNhomCuaNhom(h4) {
  const t = T.tree(); const H = t.nodes.get(h4);
  if (!H || H.cap !== 4) return [];
  const ra = new Map();
  const them = (n, tang, tenTang) => {
    const hs6 = n.cap === 6 ? n.id : n.cap === 8 && typeof n.laPhanNhom === 'string' && n.laPhanNhom.length === 6 ? n.laPhanNhom : null;
    if (!hs6 || ra.has(hs6)) return;
    let kieu = kieuTieuDe(n.tenVi);
    const tenGot = gotTen(n.tenVi);
    // Phân nhóm là nửa dư của tầng hai vế "A khác; B" (8413.81 "Bơm" dưới "Bơm khác; máy đẩy chất lỏng"): mang phanConLai để không chiếm các phân nhóm A phía trước.
    if (kieu === 'CO_TEN' && tang !== h4 && tenTang) {
      const mKhac = /^([^;]+?)\s+khác\s*;/iu.exec(tenTang);
      if (mKhac && tenGot.toLowerCase() === mKhac[1].trim().toLowerCase()) kieu = 'DU_CO_PHAM_VI';
    }
    // tangCoTen: nhóm một gạch chứa nó có nội dung riêng ("Rơ le"); tầng tên "Loại khác" không mang điều kiện nào.
    ra.set(hs6, { hs6, ten: tenGot, tang, tenTang, tangCoTen: tang !== h4 && Boolean(tenTang) && kieuTieuDe(tenTang) !== 'DU', kieu, du: kieu === 'DU', nguonTen: n.cap === 6 ? `tieuDe.${hs6}` : `tax.${n.id}` });
  };
  for (const cid of H.children) {
    const X = t.nodes.get(cid);
    if (!X) continue;
    if (X.cap === 'NHOM_MOT_GACH') { for (const id of X.children) { const n = t.nodes.get(id); if (n) them(n, X.id, gotTen(X.tenVi)); } } else them(X, h4, null);
  }
  // Phân nhóm mà cây không có nút riêng (nhóm chỉ một phân nhóm xxxx.00 chia thẳng xuống dòng 8 số): vẫn liệt kê, không tên.
  for (const p of [...tapNut().pn6].filter((x) => x.startsWith(h4))) if (!ra.has(p)) ra.set(p, { hs6: p, ten: '', tang: h4, tenTang: null, tangCoTen: false, kieu: 'CO_TEN', du: false, nguonTen: null });
  return [...ra.values()].sort((a, b) => (a.hs6 < b.hs6 ? -1 : 1));
}

// ───────────────────────────────────────── Thứ tự xét do MÁY xếp ─────────────────────────────────────────
/**
 * Thứ tự xét các phân nhóm của nhóm — người / AI soạn KHÔNG ghi. Luật: theo mã; trong mỗi tầng, phân nhóm dư trần đứng sau anh
 * em; phân nhóm dư trần của cả nhóm đứng cuối cùng; phân nhóm có `uuTien` (câu luật nói ưu tiên) lên đầu, theo mã.
 * @param {Iterable<string>} [coUuTien]  các hs6 có uuTien
 * @returns {Map<string, number>} hs6 → thuTu (từ 1)
 */
function thuTuMay(h4, coUuTien = []) {
  const uu = new Set(coUuTien);
  const o = new Map();
  for (const p of phanNhomCuaNhom(h4)) { const k = p.tang === h4 ? `~${p.hs6}` : p.tang; if (!o.has(k)) o.set(k, []); o.get(k).push(p); }
  const dau = []; const cuoi = [];
  for (const ds of o.values()) {
    const xep = [...ds.filter((p) => !p.du), ...ds.filter((p) => p.du)];
    if (ds.length === 1 && ds[0].du && ds[0].tang === h4) cuoi.push(...xep); else dau.push(...xep);
  }
  const tat = [...dau, ...cuoi];
  const ra = new Map();
  [...tat.filter((p) => uu.has(p.hs6)), ...tat.filter((p) => !uu.has(p.hs6))].forEach((p, i) => ra.set(p.hs6, i + 1));
  return ra;
}
/** Gắn thuTu máy xếp vào từng mục (bản sao; không sửa đầu vào). Mục có hs6 lạ giữ nguyên. */
function ganThuTu(h4, ds) {
  const tt = thuTuMay(h4, (ds || []).filter((x) => x && x.uuTien).map((x) => so(x.hs6)));
  return (ds || []).map((x) => (x && typeof x === 'object' && tt.has(so(x.hs6)) ? { ...x, thuTu: tt.get(so(x.hs6)) } : x));
}

// ───────────────────────────────────────── Nguồn được trích ─────────────────────────────────────────
/**
 * Nguồn NGUYÊN VĂN mà tieuChi6 của nhóm được trích: chú giải chi tiết nhóm, chú giải chương / phần, SEN, tên WCO của phân nhóm,
 * tiêu đề phân nhóm và tiêu đề nhóm một gạch của biểu thuế (tieuDe.*), và dòng lá xxxxxx00 khi dòng đó CHÍNH LÀ phân nhóm (tax.*).
 * KHÔNG gồm dòng 8 số thường, tiêu đề quốc gia 7 số, tầng không mã `~r` (đó là cấp dưới 6 số) và văn bản chuyên ngành.
 */
function nguonChoPhep(h4) {
  const pn = phanNhomCuaNhom(h4);
  const dongLa = new Set(pn.map((p) => p.nguonTen).filter((x) => x && x.startsWith('tax.')));
  const tieuDeNhan = new Set([...pn.map((p) => `tieuDe.${p.hs6}`), ...pn.filter((p) => p.tangCoTen).map((p) => `tieuDe.${p.tang}`)]);
  const ra = {};
  for (const [k, v] of Object.entries(S.sourcesFor(h4))) {
    if (/^(vb|tuongUng)\./.test(k)) continue;
    if (/^tax\./.test(k) && !dongLa.has(k)) continue;
    ra[k] = v;
  }
  for (const [k, v] of Object.entries(S.nguonTieuDe(h4))) if (tieuDeNhan.has(k)) ra[k] = v;
  return ra;
}

// ───────────────────────────────────────── Tiền lệ và tờ khai của nhóm ─────────────────────────────────────────
let _tienLe = null;
/** Thông báo phân loại (data/precedents.json) có mã thuộc nhóm: [{so, ma, loaiNguon, tenHang, ketLuan}], theo mã rồi theo số. */
function tienLeCuaNhom(h4) {
  if (!_tienLe) { try { _tienLe = docJson('precedents.json'); } catch { _tienLe = {}; } }
  const ra = [];
  for (const khoa of Object.keys(_tienLe).sort()) {
    if (!so(khoa).startsWith(h4)) continue;
    for (const p of Array.isArray(_tienLe[khoa]) ? _tienLe[khoa] : []) {
      const ma = so(p.outcome) || so(khoa);
      if (!chu(p.tbTchqNumber) || !ma.startsWith(h4)) continue;
      ra.push({ so: chu(p.tbTchqNumber), ma, loaiNguon: chu(p.sourceType) || 'TB-TCHQ', tenHang: chu(p.productName), ketLuan: chu(p.technicalSpec) });
    }
  }
  return ra.sort((a, b) => (a.ma + a.so < b.ma + b.so ? -1 : 1));
}
let _toKhai = null;
/** Dòng tờ khai mẫu OZ (data/oz-gold-final.jsonl) của nhóm, mã còn trong biểu: [{ma, tenHang, congDung, moTa, soLan}]. */
function toKhaiCuaNhom(h4) {
  if (!_toKhai) {
    _toKhai = [];
    let tho = '';
    try { tho = fs.readFileSync(dataReadPath('oz-gold-final.jsonl'), 'utf8'); } catch { tho = ''; }
    for (const dong of tho.split('\n')) {
      if (!dong.trim()) continue;
      let g; try { g = JSON.parse(dong); } catch { continue; }
      const ma = so(g.hsCode);
      if (!tapNut().ma8.has(ma)) continue;
      _toKhai.push({ ma, tenHang: chu(g.tenHang), congDung: chu(g.congDung), moTa: [g.tenHang, g.congDung, g.sampleDesc].map(chu).filter(Boolean).join(' . '), soLan: Number(g.ozCount) || 1 });
    }
  }
  return _toKhai.filter((x) => x.ma.startsWith(h4));
}
/** 20 tờ khai mẫu, tất định: xoay vòng qua các phân nhóm (mỗi phân nhóm lấy dòng có số lần khai cao trước), không kèm câu khai thô. */
function toKhaiMau(h4, n = SO_TO_KHAI_MAU) {
  const theoPn = new Map();
  for (const x of toKhaiCuaNhom(h4)) { const k = x.ma.slice(0, 6); if (!theoPn.has(k)) theoPn.set(k, []); theoPn.get(k).push(x); }
  const hang = [...theoPn.keys()].sort().map((k) => theoPn.get(k).sort((a, b) => b.soLan - a.soLan || (a.ma + a.tenHang < b.ma + b.tenHang ? -1 : 1)));
  const ra = [];
  for (let i = 0; ra.length < n && hang.some((h) => h.length > i); i += 1) for (const h of hang) { if (h[i] && ra.length < n) ra.push({ ma: h[i].ma, tenHang: h[i].tenHang, ...(h[i].congDung ? { congDung: h[i].congDung } : {}) }); }
  return ra;
}

// ───────────────────────────────────────── Áp tiêu chí bằng luật khớp từ khoá ─────────────────────────────────────────
// Cụm đứng ngay sau lời phủ định ("không phải loại truyền động dầu thủy lực hay khí nén", "không bao gồm sợi cao su") không tính là khớp.
const RE_PHU_DINH_TRUOC = /(?:^| )(?:khong phai|khong thuoc|khong dung|khong la|khong bao gom|khong ke|khong co|khong chua|ngoai tru|(?<!(?:du|luu|vu) )tru)(?: \S+){0,8} $/;
const RE_TRU_CO_DAU = /(?<![\p{L}\p{M}])trừ(?![\p{L}\p{M}])/iu;
/** Vị trí các lần `cum` (đã không dấu) xuất hiện nguyên cụm trong văn bản không dấu; bỏ lần đứng sau lời phủ định. */
function coCum(vanBan, cum, { boPhuDinh = false, goc = '' } = {}) {
  const k = khongDau(cum);
  if (k.length < 2) return false;
  const vb = ` ${vanBan} `; const kim = ` ${k} `;
  for (let i = vb.indexOf(kim); i >= 0; i = vb.indexOf(kim, i + 1)) {
    if (!boPhuDinh) return true;
    const m = RE_PHU_DINH_TRUOC.exec(vb.slice(Math.max(0, i - 80), i + 1));
    if (!m) return true;
    if (goc && m[0].trimStart().startsWith('tru ') && !RE_TRU_CO_DAU.test(String(goc).normalize('NFC'))) return true;
  }
  return false;
}
const laPhuDinh = (x) => x.chieu === 'PHAI_KHONG' || x.op === 'KHONG';
const KHOI_GIOI_HAN = 'đã|chưa(?!\\s+no(?![\\p{L}]))|làm bằng|bằng(?!\\s+(?:ôzôn|oxy|xông)(?![\\p{L}]))|được|có|không có|không|dùng cho|dùng trong|dùng để|dùng làm|sử dụng cho|sử dụng trong|lắp vào|lắp cho|lắp trên|với|kiểu|trên\\s+\\d|dưới\\s+\\d|từ\\s+\\d|không quá|tối đa|tối thiểu';
const KHOI_GIOI_HAN_GIUA = 'đã(?!\\s+hoặc\\s+(?:chưa|không)(?![\\p{L}]))|(?<!đã\\s+hoặc\\s+)chưa(?!\\s+no(?![\\p{L}]))|(?<!đã hoặc chưa )(?<!có hoặc không )(?:làm bằng|bằng(?!\\s+(?:ôzôn|oxy|xông)(?![\\p{L}]))|được|dùng cho|dùng trong|dùng để|dùng làm|sử dụng cho|sử dụng trong|lắp vào|lắp cho|lắp trên|với)|(?<!có\\s+hoặc\\s+không\\s+)(?<!bánh\\s+xe\\s+)có(?!\\s+hoặc\\s+không(?![\\p{L}]))|(?<!chân\\s)(?<!có\\s+hoặc\\s)(?:không có|không quá|không(?!\\s+(?:khí|kết\\s+hợp)(?![\\p{L}])))|kiểu(?!\\s+phun(?![\\p{L}]))|trên\\s+\\d|dưới\\s+\\d|từ\\s+\\d|tối đa|tối thiểu';
// Vế loại trừ: "trừ …", "nhưng không (bao gồm|kể|chứa|có|phải)…", "không bao gồm …", "không kể …" — KHÔNG ăn vào cận số "nhưng không quá …".
const DAN_VE_TRU = '(?:(?:ngoại\\s+)?trừ|nhưng\\s+không(?!\\s+quá(?![\\p{L}\\p{M}]))(?:\\s+(?:bao\\s+gồm|kể|chứa|có|phải))?|(?<!nhưng\\s)(?<!hoặc\\s)không\\s+(?:bao\\s+gồm|kể))';
const RE_NGOAC_TRU = new RegExp(`\\(\\s*${DAN_VE_TRU}(?![\\p{L}\\p{M}])\\s+([^)]*)\\)`, 'giu');
const RE_DAU_TRU = new RegExp(`(?<![\\p{L}\\p{M}])${DAN_VE_TRU}(?![\\p{L}\\p{M}])\\s+`, 'giu');
const RE_NGAT_SAU_TRU = new RegExp(`,\\s*(?=(?:${KHOI_GIOI_HAN}|nhưng|trừ|ngoại\\s+trừ|không\\s+(?:bao\\s+gồm|kể))(?![\\p{L}\\p{M}]))`, 'iu');
const RE_HET_VE_TRU = /;|(?<!\d)\.(?!\d)|\(/g;
const RE_CO_TRU = new RegExp(`(?:\\(\\s*${DAN_VE_TRU}(?![\\p{L}\\p{M}])\\s+[^)\\s][^)]*\\)|(?<![\\p{L}\\p{M}])${DAN_VE_TRU}(?![\\p{L}\\p{M}])\\s+\\S)`, 'iu');
/** Tách đồng thời bỏ các vế loại trừ (trong ngoặc và nội dòng) khỏi một câu; giữ cận số "nhưng không quá …". */
function tachVaBoTru(s) {
  const raw = String(s || '').normalize('NFC');
  const veTru = [];
  const text = raw.replace(RE_NGOAC_TRU, (_, noi) => {
    const t = String(noi || '').trim();
    if (t) veTru.push(t);
    return ' ';
  });
  RE_DAU_TRU.lastIndex = 0;
  let bo = '';
  let pos = 0;
  let m;
  while ((m = RE_DAU_TRU.exec(text)) !== null) {
    if (m.index < pos) continue;
    const truoc = text.slice(pos, m.index);
    const dauPhay = /,\s*$/.exec(truoc);
    bo += dauPhay ? truoc.slice(0, dauPhay.index) : truoc;
    const bodyStart = m.index + m[0].length;
    const rest = text.slice(bodyStart);
    RE_HET_VE_TRU.lastIndex = 0;
    const end1 = RE_HET_VE_TRU.exec(rest);
    const end2 = RE_NGAT_SAU_TRU.exec(rest);
    let endRel = rest.length;
    if (end1 && end1.index < endRel) endRel = end1.index;
    if (end2 && end2.index < endRel) endRel = end2.index;
    const body = rest.slice(0, endRel).trim().replace(/[,\s]+$/, '');
    if (body) veTru.push(body);
    bo += ' ';
    pos = bodyStart + endRel;
    RE_DAU_TRU.lastIndex = pos;
  }
  bo += text.slice(pos);
  return { bo, veTru };
}
/** Bỏ các vế loại trừ khỏi một câu: "(trừ gang đúc)", "… trừ tua bin phản lực", "… nhưng không bao gồm sợi cao su". */
const boVeTru = (s) => tachVaBoTru(s).bo;
/** Trích danh sách cụm loại trừ (bỏ chữ dẫn "trừ / nhưng không bao gồm / không kể") trong câu, cả trong ngoặc và nội dòng. */
const tachVeTru = (vanBan) => tachVaBoTru(vanBan).veTru;
const boNgoac = (s) => String(s || '').replace(/\([^)]*\)/g, ' ');
// Sau những chữ này là ĐỐI TƯỢNG mà hàng dùng cho (dungCho), không còn là tên hàng.
const RE_GIOI_TU = /(?<![\p{L}])(?:dùng cho|dùng trong|dùng để|dùng làm|sử dụng cho|sử dụng trong|lắp vào|lắp cho|lắp trên)(?![\p{L}])/iu;
// Âm tiết (không dấu) của những chữ chung: một tuKhoa chỉ gồm các âm tiết này thì không nhận ra được phân nhóm nào.
const AM_TIET_CHUNG = new Set(`may bo thiet bi san pham hang hoa do dung vat chat phan phu kien linh chi tiet cum he thong dung cu loai khac
cac nhung va hoac cua cho bang co khong mat lap vao dung trong voi`.split(/\s+/).filter(Boolean));
// Giữ dấu chữ & dấu thanh khi từ khoá có dấu tiếng Việt để "cưa" (8467.22) không gộp nhầm với "của".
const AM_TIET_CHUNG_CO_DAU = new Set(`máy bộ thiết bị sản phẩm hàng hóa hàng hoá đồ dùng dụng vật chất phần phận phụ kiện linh chi tiết cụm hệ thống cụ loại khác
các những và hoặc của cho bằng có không mặt lắp vào dùng trong với`.split(/\s+/).filter(Boolean));
// tenLoai mở đầu bằng những chữ này là THUỘC TÍNH (chất liệu, trạng thái, công dụng, vị trí), không phải tên hàng.
const RE_THUOC_TINH = /^(?:bằng|có|không|chưa|đã|dùng|loại|của|với|trên|dưới|từ|được|để|cho|trong|ngoài|chứa|gồm|bao\s+gồm)\s|^(?:(?:được\s+|đã\s+|hoặc\s+)?kết\s+hợp\s+)?(?:duy\s+nhất|(?:hai|nhiều)\s+chức\s+năng)(?=\s|$)/iu;
const chuoiCua = (v) => [v].flat().filter((y) => typeof y === 'string' && y.trim());
/** Cụm dùng để khớp của một mục: `tuKhoa` (gợi ý — chế độ mặc định) hoặc `value` nguyên văn (chế độ "value" — đúng chữ điều kiện). */
const cumCua = (x, che) => (che === 'value' ? chuoiCua(x.value) : Array.isArray(x.tuKhoa) ? chuoiCua(x.tuKhoa) : []);
/** Gom mục theo phân nhóm, xếp theo thuTu (thiếu thuTu thì theo mã). */
function theoThuTu(ds) {
  const m = new Map();
  for (const x of ds || []) { if (!x || typeof x !== 'object') continue; const h = so(x.hs6); if (!m.has(h)) m.set(h, []); m.get(h).push(x); }
  const thuTu = (muc) => { const t = muc.map((x) => x.thuTu).find(Number.isInteger); return Number.isInteger(t) ? t : 1e9; };
  return [...m.entries()].map(([hs6, muc]) => ({ hs6, muc, thuTu: thuTu(muc) })).sort((a, b) => a.thuTu - b.thuTu || (a.hs6 < b.hs6 ? -1 : 1));
}
const _tenNhom = new Map();
/** Tên nhóm 4 số (không dấu). Mô tả chép lại tên nhóm ("… kể cả van giảm áp và van điều chỉnh bằng nhiệt") không nói gì về phân nhóm. */
function tenNhomKhongDau(h4) {
  if (!_tenNhom.has(h4)) { let t = ''; try { t = khongDau(String(T.nodeOf(h4).tenVi || '').replace(/^\s*\d\d\.\d\d\.?\s*-?/, '')); } catch { t = ''; } _tenNhom.set(h4, t); }
  return _tenNhom.get(h4);
}
/**
 * Áp tiêu chí lên một mô tả hàng — LUẬT KHỚP TỪ KHOÁ, CHỈ ĐỂ ĐO (không phải động cơ phân loại, không đường khách nào gọi).
 * Đi theo thuTu; một phân nhóm KHỚP khi MỌI mục khẳng định của nó có ít nhất một cụm nằm nguyên trong mô tả (so không dấu) và
 * không mục phủ định nào (cả `chieu: 'PHAI_KHONG'` lẫn `dieuKienTru`) khớp. Mục khẳng định không có cụm (vd `laBoPhan` — chữ "bộ phận"
 * trong mô tả thường là "bộ phận của máy khác") ⇒ phân nhóm đó không chỉ được bằng từ khoá. Phân nhóm dư (phanConLai) không bao giờ
 * được chỉ: vắng từ khoá không chứng minh được "không thuộc phân nhóm có tên".
 * @param {{h4?: string, che?: 'tuKhoa'|'value'}} [tuyChon]  h4: bỏ đoạn chép tên nhóm 4 số khỏi mô tả trước khi khớp
 * @returns {{hs6: string|null, cum: string[]}}  hs6 = null ⇒ không kết luận
 */
const RE_HOAC_AP = /(?<![\p{L}\p{M}])(?:hoặc|or)(?![\p{L}\p{M}])/iu;

function catTenNhomGoc(moTa, ten) {
  const tuTen = ten.split(/\s+/).filter(Boolean);
  if (!tuTen.length) return moTa;
  const dsTu = [];
  for (const m of String(moTa || '').matchAll(/[\p{L}\p{N}]+/gu)) {
    dsTu.push({ td: khongDau(m[0]), bd: m.index, kt: m.index + m[0].length });
  }
  for (let i = 0; i <= dsTu.length - tuTen.length; i += 1) {
    let khop = true;
    for (let j = 0; j < tuTen.length; j += 1) {
      if (dsTu[i + j].td !== tuTen[j]) { khop = false; break; }
    }
    if (khop) return `${moTa.slice(0, dsTu[i].bd)} ${moTa.slice(dsTu[i + tuTen.length - 1].kt)}`;
  }
  return moTa;
}

function khopVatLieuTuVung(x, moTaSach, cache) {
  if (!x || (x.fact !== 'vatLieuKhac' && x.fact !== 'chatLieu')) return null;
  if (!moTaSach || !moTaSach.trim()) return null;
  const vals = chuoiCua(x.value);
  if (!vals.length) return null;
  if (!cache[x.fact]) cache[x.fact] = TV.docGiaTri(x.fact, moTaSach);
  const kq = cache[x.fact];
  const ungVien = kq.trangThai === 'DA_CO'
    ? (Array.isArray(kq.giaTri) ? kq.giaTri.map((g) => (typeof g === 'string' ? g : g && g.chatLieu)).filter(Boolean) : [kq.giaTri])
    : (kq.ungVien || []);
  const khopVal = vals.find((v) => ungVien.includes(v));
  if (!khopVal) return null;
  const ct = Array.isArray(kq.chiTiet) ? kq.chiTiet.find((b) => b && b.chatLieu === khopVal) : null;
  return (ct && ct.bangChung) || (typeof kq.bangChung === 'string' && kq.bangChung) || khopVal;
}

const OP_KHOA_NGUOC = new Set(['TRONG', 'LA', 'CO']);
function giaTriDocKhopMuc(x, r) {
  if (!r || r.trangThai !== 'DA_CO') return false;
  if (x.op === 'CO') return r.giaTri === true;
  const vals = chuoiCua(x.value).map((v) => khongDau(v));
  const gs = (Array.isArray(r.giaTri) ? r.giaTri : [r.giaTri])
    .map((g) => (typeof g === 'string' ? g : g && g.chatLieu))
    .filter(Boolean)
    .map((g) => khongDau(g));
  return vals.some((v) => gs.includes(v));
}
function laKhoaNguocVeTru(x) {
  if (!x || laPhuDinh(x) || !x.fact || !x.trich || !OP_KHOA_NGUOC.has(x.op)) return null;
  const trich = String(x.trich).normalize('NFC');
  if (!RE_CO_TRU.test(trich)) return null;
  const { bo, veTru } = tachVaBoTru(trich);
  if (!veTru.length) return null;
  const cumKhop = [...(Array.isArray(x.tuKhoa) ? chuoiCua(x.tuKhoa) : []), ...chuoiCua(x.value)];
  const kdBo = khongDau(bo);
  let khopBo = cumKhop.some((c) => coCum(kdBo, c));
  if (!khopBo) {
    try { khopBo = giaTriDocKhopMuc(x, TV.docGiaTri(x.fact, bo)); } catch { khopBo = false; }
  }
  if (khopBo) return null;
  for (const vt of veTru) {
    const kdVt = khongDau(vt);
    if (cumKhop.some((c) => coCum(kdVt, c))) return vt;
    try {
      if (giaTriDocKhopMuc(x, TV.docGiaTri(x.fact, vt))) return vt;
    } catch { /* ignore */ }
  }
  return null;
}

function apTieuChi(ds, moTa, { h4 = null, che = 'tuKhoa' } = {}) {
  const vbGoc = khongDau(moTa);
  let vb = vbGoc;
  const ten = h4 ? tenNhomKhongDau(h4) : '';
  if (ten.length >= 12) vb = vb.split(ten).join(' ');
  if (!vb.trim()) return { hs6: null, cum: [] };
  const moTaSach = ten.length >= 12 && vb !== vbGoc ? catTenNhomGoc(moTa, ten) : moTa;
  for (const { hs6, muc } of theoThuTu(ds)) {
    if (muc.some((x) => x.phanConLai === true || x.chuaSoHoa !== undefined)) continue;
    const kd = muc.filter((x) => x.fact && !laPhuDinh(x)); const pd = muc.filter((x) => x.fact && laPhuDinh(x));
    if (!kd.length) continue;
    const tvCache = {};
    const timKhopKd = (x) => {
      const dsCum = cumCua(x, che);
      if (!dsCum.length) return null;
      return dsCum.find((c) => coCum(vb, c, { boPhuDinh: true, goc: moTa }))
        || (che !== 'value' && (x.op === 'LA' || x.op === 'TRONG') ? khopVatLieuTuVung(x, moTaSach, tvCache) : null);
    };
    const timKhopPd = (x) => {
      const dsCum = cumCua(x, che);
      if (dsCum.some((c) => coCum(vb, c))) return true;
      if (che === 'value' || !laPhuDinh(x)) return false;
      if (khopVatLieuTuVung(x, moTaSach, tvCache)) return true;
      if (x.op === 'KHONG' && x.fact && DK.laFactTuVung(x.fact)) {
        if (!tvCache[x.fact]) tvCache[x.fact] = TV.docGiaTri(x.fact, moTaSach);
        if (tvCache[x.fact]?.trangThai === 'DA_CO' && tvCache[x.fact].giaTri === true) return true;
      }
      return false;
    };
    const ketQuaKd = kd.map(timKhopKd);
    const nhomOr = new Map();
    const chiSoBatBuoc = [];
    kd.forEach((x, idx) => {
      const laVlOr = (x.fact === 'chatLieu' || x.fact === 'vatLieuKhac')
        && (x.op === 'LA' || x.op === 'TRONG')
        && x.nguon && x.trich && RE_HOAC_AP.test(boVeTru(x.trich));
      if (laVlOr) {
        const khoaNhom = `${x.nguon}\0${x.trich}`;
        if (!nhomOr.has(khoaNhom)) nhomOr.set(khoaNhom, []);
        nhomOr.get(khoaNhom).push(idx);
      } else {
        chiSoBatBuoc.push(idx);
      }
    });
    let hopLe = chiSoBatBuoc.every((idx) => Boolean(ketQuaKd[idx]));
    if (hopLe) {
      for (const dsIdx of nhomOr.values()) {
        if (dsIdx.length === 1 ? !ketQuaKd[dsIdx[0]] : !dsIdx.some((idx) => Boolean(ketQuaKd[idx]))) {
          hopLe = false;
          break;
        }
      }
    }
    if (!hopLe) continue;
    const khop = ketQuaKd.filter(Boolean);
    if (pd.some(timKhopPd)) continue;
    if (kd.some((x) => chuoiCua(x.dieuKienTru).some((c) => coCum(vb, c, { boPhuDinh: true, goc: moTa })))) continue;
    return { hs6, cum: khop };
  }
  return { hs6: null, cum: [] };
}

/**
 * Đánh giá cấu trúc cấp 4→6 (`tieuChi6`) cho một mô tả hàng, KHÔNG đoán — phục vụ kiểm 6 số (#1630) & đo bậc thang T2 (#1631).
 * Dùng `TV.docTenLoaiDayDu`/`TV.docGiaTri` + `DK.danhGiaTrenMap` + `dieuKienTru` + `phanConLai` (mọi anh em trước cùng tầng phải TRAI).
 */
/** Khoá mà đọc ra giá trị khác là trái thật (số đo, có/không). */
function kieuCung(fact) {
  try { return ['SO', 'CO_KHONG'].includes(TV.layKhoa(fact)?.kieu); } catch { return false; }
}
function diXuong6(h4, ds, moTa) {
  const txt = String(moTa == null ? '' : moTa).normalize('NFC').trim();
  const vb = khongDau(txt);
  const pnList = phanNhomCuaNhom(h4);
  const theoMa = new Map(pnList.map((p) => [p.hs6, p]));
  const dsXep = theoThuTu(ds);

  const F = new Map();
  const tl = TV.docTenLoaiDayDu(txt);
  if (tl && tl.trangThai === 'DA_CO') F.set('tenLoai', { giaTri: tl.giaTri });
  const daDoc = new Set(['tenLoai']);
  for (const x of ds || []) {
    if (!x || !x.fact || daDoc.has(x.fact)) continue;
    daDoc.add(x.fact);
    try {
      const r = TV.docGiaTri(x.fact, txt);
      if (r && r.trangThai === 'DA_CO' && !r.op) F.set(x.fact, { giaTri: r.giaTri, ...(r.donVi ? { donVi: r.donVi } : {}) });
    } catch { /* ignore unknown legacy fact */ }
  }

  const ketQuaPn = [];
  const trangThaiTheoMa = new Map();

  for (const { hs6, muc, thuTu } of dsXep) {
    const pMeta = theoMa.get(hs6) || { tang: h4, du: false };
    const uuTien = muc.some((x) => Boolean(x && x.uuTien));
    const coChuaSo = muc.some((x) => x && x.chuaSoHoa !== undefined && x.phanConLai !== true);
    const coPhanConLai = muc.some((x) => x && x.phanConLai === true);
    const nonDu = muc.filter((x) => x && x.phanConLai !== true && x.chuaSoHoa === undefined);

    let hasTrai = false;
    // Trái CỨNG: trái bằng dữ kiện ĐỌC ĐƯỢC (số, có/không, cụm bị trừ có trong chữ khách). Trái vì tên loại / công dụng / vật liệu
    // "không khớp" là trái MỀM: khách nói tắt hoặc từ điển thiếu tên gọi, không phải hàng không thuộc phân nhóm. Chỉ để báo ra
    // chiTiet, không đổi trạng thái (bên dùng: duong-do-thi.js).
    let traiCung = false;
    const itemRes = [];
    const thieu = new Set();
    const khop = [];

    for (const x of nonDu) {
      if (!x.fact) continue;
      if (!laPhuDinh(x) && chuoiCua(x.dieuKienTru).some((c) => coCum(vb, c, { boPhuDinh: true, goc: txt }))) {
        hasTrai = true;
        traiCung = true; // chữ khách có đúng cụm bị trừ
        itemRes.push({ x, tt: 'TRAI' });
        continue;
      }
      let r = { trangThai: 'CHUA_BIET' };
      try { r = DK.danhGiaTrenMap(x, F); } catch { r = { trangThai: 'CHUA_BIET' }; }
      let tt = r.trangThai || 'CHUA_BIET';
      if (laPhuDinh(x)) {
        if (tt === 'CHUA_BIET' && x.op !== 'KHONG' && Array.isArray(x.tuKhoa) && x.tuKhoa.some((c) => coCum(vb, c))) tt = 'TRAI';
      } else if (tt === 'CHUA_BIET') {
        const choFallback = x.op === 'CONG_DUNG' || (x.op === 'TEN_LOAI' && !F.has('tenLoai'));
        if (choFallback) {
          const cum = [...(Array.isArray(x.tuKhoa) ? chuoiCua(x.tuKhoa) : []), ...chuoiCua(x.value)];
          const hit = cum.find((c) => coCum(vb, c, { boPhuDinh: true, goc: txt }));
          if (hit) { tt = 'THOA'; khop.push(hit); }
        }
      } else if (tt === 'THOA') {
        khop.push(r.giaTriDocDuoc != null ? String(r.giaTriDocDuoc) : x.fact);
      }
      if (tt === 'TRAI' && (laPhuDinh(x) || kieuCung(x.fact))) traiCung = true;
      itemRes.push({ x, tt });
    }

    const nhomOr = new Map();
    const batBuoc = [];
    for (const it of itemRes) {
      const { x } = it;
      const laVlOr = !laPhuDinh(x) && (x.fact === 'chatLieu' || x.fact === 'vatLieuKhac') && (x.op === 'LA' || x.op === 'TRONG') && x.nguon && x.trich && RE_HOAC_AP.test(boVeTru(x.trich));
      if (laVlOr) {
        const k = `${x.nguon}\0${x.trich}`;
        if (!nhomOr.has(k)) nhomOr.set(k, []);
        nhomOr.get(k).push(it);
      } else {
        batBuoc.push(it);
      }
    }

    let subTrai = hasTrai || batBuoc.some((it) => it.tt === 'TRAI');
    let allBatBuocThoa = batBuoc.every((it) => it.tt === 'THOA');
    for (const it of batBuoc) if (it.tt === 'CHUA_BIET' && it.x.fact) thieu.add(it.x.fact);
    for (const grp of nhomOr.values()) {
      const anyThoa = grp.some((it) => it.tt === 'THOA');
      const allTrai = grp.every((it) => it.tt === 'TRAI');
      if (allTrai) subTrai = true;
      else if (!anyThoa) {
        allBatBuocThoa = false;
        for (const it of grp) if (it.x.fact) thieu.add(it.x.fact);
      }
    }

    let trangThai;
    if (subTrai) {
      trangThai = 'TRAI';
    } else if (coChuaSo) {
      trangThai = 'CHUA_BIET';
    } else if (!coPhanConLai) {
      trangThai = nonDu.length > 0 && allBatBuocThoa ? 'THOA' : 'CHUA_BIET';
    } else {
      const tangThoa = nonDu.length === 0 || allBatBuocThoa;
      const anhEmTruoc = dsXep.filter((q) => {
        if (q.thuTu >= thuTu) return false;
        const qMeta = theoMa.get(q.hs6) || { tang: h4 };
        return pMeta.tang === h4 ? true : qMeta.tang === pMeta.tang;
      });
      const moiAnhEmTrai = anhEmTruoc.length > 0 && anhEmTruoc.every((q) => trangThaiTheoMa.get(q.hs6) === 'TRAI');
      trangThai = tangThoa && moiAnhEmTrai ? 'THOA' : 'CHUA_BIET';
    }

    trangThaiTheoMa.set(hs6, trangThai);
    ketQuaPn.push({ hs6, thuTu, trangThai, uuTien, phanConLai: coPhanConLai, coChuaSo, traiCung: trangThai === 'TRAI' && traiCung, khop, thieuFacts: [...thieu] });
  }

  const thoaList = ketQuaPn.filter((q) => q.trangThai === 'THOA');
  if (thoaList.length === 1) {
    const win = thoaList[0];
    const coChuaBietTruoc = ketQuaPn.some((q) => q.thuTu < win.thuTu && q.trangThai === 'CHUA_BIET');
    const coUuTienChuaBiet = ketQuaPn.some((q) => q.uuTien && q.hs6 !== win.hs6 && q.trangThai === 'CHUA_BIET');
    if (!coChuaBietTruoc && !coUuTienChuaBiet) {
      return { trangThai: 'DUNG_CHOT', hs6: win.hs6, khop: win.khop, thieuFacts: [], chiTiet: ketQuaPn };
    }
  }

  const ungVien = ketQuaPn.filter((q) => q.trangThai !== 'TRAI').map((q) => q.hs6);
  const thieuFacts = [...new Set(ketQuaPn.filter((q) => q.trangThai === 'CHUA_BIET').flatMap((q) => q.thieuFacts))];
  return { trangThai: 'DUNG_HOI', hs6: null, ungVien, thieuFacts, chiTiet: ketQuaPn };
}
/** Đo trên một tập ca [{ma, moTa, nhan}]: đúng / sai / không kết luận + danh sách ca sai. */
function doTren(ds, ca, tuyChon = {}) {
  const kq = { tong: ca.length, dung: 0, sai: 0, khongKetLuan: 0, caSai: [] };
  for (const x of ca) {
    const r = apTieuChi(ds, x.moTa, tuyChon);
    if (!r.hs6) kq.khongKetLuan += 1; else if (x.ma.startsWith(r.hs6)) kq.dung += 1; else { kq.sai += 1; kq.caSai.push({ khai: x.ma, tieuChiChi: r.hs6, cumKhop: r.cum, hang: cat(x.nhan, 90) }); }
  }
  return kq;
}

// ───────────────────────────────────────── PHỦ VẾ ─────────────────────────────────────────
// Một tiêu đề 6 số được tách bằng LUẬT thành các vế nội dung: vế đầu ngữ (tên hàng) và các vế giới hạn (bắt đầu bằng "đã",
// "chưa", "bằng", "có", "dùng cho", "lắp vào", "trên 5 cm"…). Các vế nối bằng dấu phẩy là CỘNG DỒN ("Bằng sắt hoặc thép, đã
// tráng men" = hai vế); "và" / "hoặc" bên trong một vế là phương án thay thế. Tiêu đề là danh sách nhiều tên hàng ("Đui đèn,
// phích cắm và ổ cắm", hay có ";") thì không tách được vế cộng dồn ⇒ không kiểm. Bỏ: "(kể cả …)", "(ví dụ …)", vế loại trừ (đã có
// THIEU_VE_TRU), "và các loại tương tự", chữ "khác" cuối của phần còn lại có phạm vi. Âm tiết lặp lại tên nhóm 4 số (và tên tầng,
// với vế của chính phân nhóm) không tính: đó là chữ của tổ tiên.
const RE_GIOI_HAN_DAU = new RegExp(`^(?:${KHOI_GIOI_HAN}|từ\\s+(?:các\\s+)?sợi\\s+có)(?![\\p{L}])`, 'iu');
const RE_CUM_RONG = /(?:^|(?<![\p{L}])(?:và|hoặc)\s+)(?:các\s+)?(?:loại|thứ|sản\s+phẩm|thiết\s+bị|dụng\s+cụ|cơ\s+cấu|mục\s+đích|vật\s+liệu|hàng\s+h(?:óa|oá)|mặt\s+hàng|đồ)?\s*(?:tương\s+tự|khác)$/iu;
const RE_NGUONG_SO = /^(?:trên|dưới|từ|không quá|tối đa|tối thiểu)\s+\d/iu;
const KHONG_BO = new Set();
// Vế đầu ngữ chỉ là chỗ đặt vật liệu ("Mặt ngoài bằng da thuộc …"): không phải tên hàng, vế giới hạn sau nó mới là tiêu chí.
const VI_TRI = new Set(['măt', 'ngoai', 'lơp', 'thân', 'vo', 'bên']);
const RE_GIOI_HAN_GIUA = new RegExp(`\\s(?:${KHOI_GIOI_HAN_GIUA})(?![\\p{L}])`, 'iu');
// Âm tiết so ở dạng BỎ DẤU THANH nhưng GIỮ dấu chữ (đ, â, ă, ê, ô, ơ, ư): "đóng" ≠ "động", "thủy" = "thuỷ". Bỏ hết dấu thì
// "đóng ngắt" (tên nhóm 85.36) xoá nhầm "tự động" của 8536.20.
const boThanh = (s) => String(s == null ? '' : s).normalize('NFC').toLowerCase().normalize('NFD').replace(/[\u0300\u0301\u0303\u0309\u0323]/g, '').normalize('NFC');
const TU_NOI_VE = new Set(boThanh(`và hoặc của cho có không các những đã chưa bằng dùng trong để làm là được với từ trên dưới quá một loại khác này
kể cả trừ lắp vào sử kiểu tối thiểu đa nhóm phân chương hay hoặc các thuộc như theo đến mà ở ra the of or and for with in to a an`).split(/\s+/).filter(Boolean));
/** Âm tiết nội dung (bỏ dấu thanh, giữ dấu chữ) của một câu: bỏ từ nối, số trần, âm tiết 1 ký tự. */
const amTietVe = (s) => [...new Set(boThanh(s).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 2 && !/^\d+$/.test(w) && !TU_NOI_VE.has(w)))];
const boMaDau = (s) => String(s || '').normalize('NFC').replace(/^\s*[\d~r.]+\s*[-–\s]*/u, '').trim();
const _boTenNhom = new Map();
/** Âm tiết của tên nhóm 4 số (bỏ mã đầu và vế "kể cả …"). */
function amTietTenNhom(h4) {
  if (!_boTenNhom.has(h4)) {
    let t = ''; try { t = String(T.nodeOf(h4).tenVi || ''); } catch { t = ''; }
    // Chỉ phần ĐẦU NGỮ của tên nhóm (trước ";" và trước vế giới hạn đầu tiên): "Vòi, van và các thiết bị tương tự" của 84.81.
    // Tên nhóm 85.36 liệt kê cả "đầu nối dùng cho sợi quang" ở phần sau — chữ đó vẫn là tên riêng của 8536.70, không được bỏ.
    t = t.replace(/^\s*\d\d\.\d\d\.?\s*-?\s*/, '').split(';')[0].replace(/(?<![\p{L}])kể cả[^;.]*/giu, ' ').replace(/\([^)]*\)/g, ' ');
    const m = RE_GIOI_HAN_GIUA.exec(t); if (m) t = t.slice(0, m.index);
    _boTenNhom.set(h4, new Set(amTietVe(t)));
  }
  return _boTenNhom.get(h4);
}
const amTiet = (s, bo) => amTietVe(s).filter((w) => !bo.has(w));
/**
 * Tách một tiêu đề thành các vế cộng dồn. @returns {{chu, loai: 'DAU'|'GIOI_HAN', chinh: string[], phu: string[], coSo: boolean}[]}
 * `chinh` = âm tiết ngoài ngoặc, `phu` = âm tiết trong ngoặc (tên khác của cùng vế, vd "(xi lanh)"). Rỗng khi tiêu đề là danh sách.
 */
function tachVeTieuDe(ten, bo, { boKhac = false, laTang = false } = {}) {
  // Phần còn lại có phạm vi ("Các vật dẫn điện khác, dùng cho …"): danh từ đứng trước "khác" là dấu phần còn lại (đã có mục
  // phanConLai mang), không phải vế phải phủ; chỉ các vế giới hạn sau nó là tiêu chí.
  const boDauDu = boKhac && /^(?:[^,;(]*kh[aá]c|(?:giày,\s*dép|dụng\s+cụ,\s*thiết\s+bị(?:\s+và\s+máy)?)\s+khác)\s*(?:\([^)]*\))?\s*(?:,|$)/iu.test(boMaDau(gotTen(ten)).normalize('NFC'));
  let t = boMaDau(gotTen(ten));
  if (boKhac) t = t.replace(/^(giày),\s*(dép\s+khác)/iu, '$1 $2').replace(/^(dụng\s+cụ),\s*(thiết\s+bị(?:\s+và\s+máy)?\s+khác)/iu, '$1 $2');
  t = boVeTru(t.replace(/\((?:kể cả|ví dụ)[^)]*\)/giu, ' '));
  // Vế MỞ (cho phép, không giới hạn): "có hoặc không có …", "đã hoặc chưa …", ", kể cả …".
  t = t.replace(/,?\s*(?<![\p{L}])kể cả[^;()]*$/iu, ' ').replace(/(?<![\p{L}])(?:có hoặc không(?: có)?|đã hoặc chưa|đã hoặc không)\s[^,;]*/giu, ' ').replace(/,\s*,/g, ',').replace(/^\s*,|,\s*$/g, '');
  t = t.replace(/,?\s*(?:và|hoặc)\s+(?:các\s+)?(?:(?:loại|thứ|kiểu|dạng)\s+)?(?:máy\s+phun(?:\s+bắn\s+tia)?|máy|thiết\s+bị|dụng\s+cụ|cơ\s+cấu|sản\s+phẩm|vật\s+liệu|hàng\s+h(?:óa|oá)|mục\s+đích)?\s*tương\s+tự(?![\p{L}])/giu, ' ');
  t = t.replace(/(?<![\p{L}])tương\s+tự(?![\p{L}])/giu, ' ');
  if (boKhac) t = t.replace(/^lo[aạ]i kh[aá]c\s*,?\s*/iu, '').replace(/\s+kh[aá]c\s*$/iu, '');
  t = t.replace(/\s+/g, ' ').trim();
  if (!t || /;/.test(t)) return [];
  const ve = []; let soDau = 0;
  for (const phan of t.split(',').map((x) => x.trim()).filter(Boolean)) {
    if (RE_GIOI_HAN_DAU.test(phan)) { ve.push({ chu: phan, loai: 'GIOI_HAN' }); continue; }
    if (ve.length && ve[ve.length - 1].loai === 'GIOI_HAN' && ve[ve.length - 1].tuDau !== true) { ve[ve.length - 1].chu += `, ${phan}`; continue; }
    soDau += 1;
    const m = RE_GIOI_HAN_GIUA.exec(phan);
    if (m && m.index > 0) { ve.push({ chu: phan.slice(0, m.index).trim(), loai: 'DAU' }); ve.push({ chu: phan.slice(m.index).trim(), loai: 'GIOI_HAN' }); } else ve.push({ chu: phan, loai: 'DAU', tuDau: true });
  }
  if (soDau > 1) return [];
  // "Công suất danh định trên 1 kVA …": ngưỡng số gắn vào danh từ thuộc tính đứng trước — một vế.
  for (let i = ve.length - 1; i > 0; i -= 1) if (ve[i].loai === 'GIOI_HAN' && ve[i - 1].loai === 'DAU' && RE_NGUONG_SO.test(ve[i].chu)) { ve[i - 1] = { chu: `${ve[i - 1].chu} ${ve[i].chu}`, loai: 'GIOI_HAN' }; ve.splice(i, 1); }
  // Âm tiết lặp tên nhóm / tên tầng chỉ bỏ ở vế ĐẦU NGỮ ("Van …" của 84.81). Vế giới hạn giữ nguyên: tên nhóm 42.02 liệt kê
  // "bằng da thuộc … bằng plastic …" nhưng chính vế đó phân biệt 4202.11 với 4202.12.
  const kqVe = ve.map(({ chu, loai }) => {
    const ngoai = chu.replace(/\([^)]*\)/g, ' '); const trong = (chu.match(/\(([^)]*)\)/g) || []).join(' ');
    const b = loai === 'DAU' ? bo : KHONG_BO;
    return { chu, loai, chinh: amTiet(ngoai, b), phu: amTiet(trong, b), coSo: /\d/.test(ngoai) };
  }).filter((v, i) => !(boDauDu && i === 0 && v.loai === 'DAU')).filter((v) => !(v.loai === 'DAU' && v.chinh.length && v.chinh.every((w) => VI_TRI.has(w)) && !v.phu.length));
  const coGioiHan = kqVe.some((v) => v.loai === 'GIOI_HAN');
  return kqVe
    .filter((v, i) => !(laTang && coGioiHan && i === 0 && v.loai === 'DAU' && !v.phu.length && !v.coSo && ['san phâm', 'hang hoa'].includes(v.chinh.join(' '))))
    .filter((v) => v.chinh.length || v.phu.length || v.coSo);
}
/** Các vế mà mục của phân nhóm `p` phải phủ: vế của chính tiêu đề (trừ phân nhóm dư trần) + vế của tầng có tên chứa nó. */
function veCanPhu(h4, p) {
  const boNhom = amTietTenNhom(h4);
  const ra = [];
  if (p.tangCoTen) for (const v of tachVeTieuDe(p.tenTang, boNhom, { boKhac: kieuTieuDe(p.tenTang) !== 'CO_TEN', laTang: true })) ra.push({ ...v, cuaTang: true });
  if (p.kieu !== 'DU' && p.ten) {
    const bo = new Set([...boNhom, ...(p.tangCoTen ? amTietVe(p.tenTang) : [])]);
    ra.push(...tachVeTieuDe(p.ten, bo, { boKhac: p.kieu === 'DU_CO_PHAM_VI' }));
  }
  return ra;
}

// ── Kiểm khoá/giá trị tu-vung@2 rộng hơn chữ luật (KHOA_RONG_HON_LUAT) ──
const RE_KIM_LOAI_CU_THE = new RegExp(
  '(?<![\\p{L}\\p{M}])(?:' +
  'kim\\s+loại\\s+(?:quý|màu|đen|kiềm|đất\\s+hiếm)|' +
  'hợp\\s+kim\\s+(?:đồng|nhôm|kẽm|niken|chì|thiếc|titan|magie)|' +
  'đồng\\s+thau|thép\\s+không\\s+(?:gỉ|rỉ)|gang\\s+đúc|' +
  'nhôm|kẽm|thép|sắt|gang|inox|niken|chì|thiếc|titan|magie|mangan|vonfram|molypden|coban|antimon|bitmut|cadimi|platin|bạch\\s+kim|' +
  '(?<!(?:hợp|cộng|tương|hội|giá|bất|\\d)\\s?)đồng(?!\\s+(?:hồ|bộ|thời|nhất|ý|nghĩa|đều|loạt|phục|hành|dạng|tiền|nát|xu|ruộng|bằng|cỡ|nghiệp|hương|minh|chí|tâm))|' +
  'bạc(?!\\s+(?:đạn|màu|má|đầu))|' +
  'vàng(?!\\s*(?:tươi|nhạt|sẫm|cam|chanh|nghệ|đất|ánh))' +
  ')(?![\\p{L}\\p{M}])',
  'iu',
);
const RE_NGAT_SAU_CL = /,\s*(?=(?:đã|chưa|có|không\s+(?:có|gắn|lắp|bọc|phủ|tráng)|dùng\s+(?:cho|trong|để|làm)|sử\s+dụng|lắp\s+(?:vào|cho|trên)|dày|rộng|dài|nặng|khối\s+lượng|công\s+suất|điện\s+áp|được|với|kiểu|trừ|nhưng|trên\s+\d|dưới\s+\d|từ\s+\d|không\s+quá|tối\s+đa|tối\s+thiểu|chỉ|ngoại\s+trừ)(?![\p{L}\p{M}]))/iu;
const BO_NGU_CHAT_LIEU = [
  { ten: 'tổng hợp', re: /(?<![\p{L}\p{M}])tổng\s+hợp(?![\p{L}\p{M}])/iu },
  { ten: 'nhân tạo', re: /(?<![\p{L}\p{M}])nhân\s+tạo(?![\p{L}\p{M}])/iu },
  { ten: 'tái tạo', re: /(?<![\p{L}\p{M}])tái\s+tạo(?![\p{L}\p{M}])/iu },
  { ten: 'tự nhiên', re: /(?<![\p{L}\p{M}])tự\s+nhiên(?![\p{L}\p{M}])/iu },
  { ten: 'nguyên sinh', re: /(?<![\p{L}\p{M}])nguyên\s+sinh(?![\p{L}\p{M}])/iu },
  { ten: 'hữu cơ', re: /(?<![\p{L}\p{M}])hữu\s+cơ(?![\p{L}\p{M}])/iu },
  { ten: 'vô cơ', re: /(?<![\p{L}\p{M}])vô\s+cơ(?![\p{L}\p{M}])/iu },
  { ten: 'lưu hóa', re: /(?<![\p{L}\p{M}])lưu\s+h(?:oá|óa)(?![\p{L}\p{M}])/iu },
  { ten: 'cứng', re: /(?<![\p{L}\p{M}])(?<!độ\s)cứng(?![\p{L}\p{M}])/iu },
  { ten: 'mềm', re: /(?<![\p{L}\p{M}])mềm(?![\p{L}\p{M}])/iu },
  { ten: 'xốp', re: /(?<![\p{L}\p{M}])xốp(?![\p{L}\p{M}])/iu },
  { ten: 'tế bào', re: /(?<![\p{L}\p{M}])tế\s+bào(?![\p{L}\p{M}])/iu },
  { ten: 'đặc', re: /(?<![\p{L}\p{M}])đặc(?!\s+(?:biệt|trưng|tính|điểm|chủng|dụng))(?![\p{L}\p{M}])/iu },
  { ten: 'không dệt', re: /(?<![\p{L}\p{M}])không\s+dệt(?![\p{L}\p{M}])/iu },
  { ten: 'dệt kim', re: /(?<![\p{L}\p{M}])dệt\s+kim(?![\p{L}\p{M}])/iu },
  { ten: 'dệt thoi', re: /(?<![\p{L}\p{M}])dệt\s+thoi(?![\p{L}\p{M}])/iu },
  { ten: 'quý', re: /(?<![\p{L}\p{M}])quý(?![\p{L}\p{M}])/iu },
  { ten: 'cơ bản', re: /(?<![\p{L}\p{M}])cơ\s+bản(?![\p{L}\p{M}])/iu },
  { ten: 'chịu lửa', re: /(?<![\p{L}\p{M}])chịu\s+lửa(?![\p{L}\p{M}])/iu },
  { ten: 'hợp kim', re: /(?<![\p{L}\p{M}])hợp\s+kim(?![\p{L}\p{M}])/iu },
  { ten: 'tinh luyện', re: /(?<![\p{L}\p{M}])tinh\s+luyện(?![\p{L}\p{M}])/iu },
];
/** Trích các cụm chất liệu (sau "bằng / làm bằng / từ …") trong câu; rơi về chính câu nếu không có giới từ chất liệu. */
function cumChatLieu(chuXet) {
  const s = boMaDau(chuXet);
  const ra = [];
  const re = /(?<![\p{L}\p{M}])(?:làm\s+)?(?:bằng|từ)(?![\p{L}\p{M}])\s+/giu;
  let m;
  while ((m = re.exec(s)) !== null) {
    let seg = s.slice(m.index + m[0].length);
    const het = /;|(?<!\d)\.(?!\d)/u.exec(seg);
    if (het) seg = seg.slice(0, het.index);
    const ngat = RE_NGAT_SAU_CL.exec(seg);
    if (ngat) seg = seg.slice(0, ngat.index);
    seg = seg.split(RE_GIOI_TU)[0].trim();
    if (!seg || /^(?:\d|(?:nhóm|phân\s+nhóm|chương)\s+\d)/iu.test(seg)) continue;
    ra.push(seg);
  }
  return ra.length ? ra : [s.split(RE_GIOI_TU)[0].trim()].filter(Boolean);
}
/**
 * Kiểm khoá/giá trị tu-vung@2 có rộng hơn chữ luật (`trich`) không. Trả chuỗi lý do nếu rộng hơn, null nếu khớp phạm vi.
 * @param {string} fact
 * @param {any} value
 * @param {string} trich
 * @param {{mucCungPn?: object[], laPhuDinh?: boolean}} [tuyChon]
 * @returns {string|null}
 */
function khoaRongHonLuat(fact, value, trich, { mucCungPn = [], laPhuDinh: laPd = false } = {}) {
  if (!fact || !trich) return null;
  const tr = String(trich || '').normalize('NFC');
  const trBo = boVeTru(tr);
  if (fact === 'tinhDanHoi') {
    const coSoiDanHoi = (s) => /(?<![\p{L}\p{M}])sợi\s+đàn\s+hồi(?![\p{L}\p{M}])|\belastomeric\s+(?:yarns?|fib(?:re|er)s?|threads?)\b/iu.test(s);
    const coSoiCaoSu = (s) => /(?<![\p{L}\p{M}])(?:sợi|chỉ)\s+cao\s+su(?![\p{L}\p{M}])|\brubber\s+threads?\b/iu.test(s);
    const coDanHoiChung = (s) => /(?<![\p{L}\p{M}])(?:tính\s+)?đàn\s+hồi(?![\p{L}\p{M}])|\belastic(?:ity)?\b/iu.test(s.replace(/sợi\s+đàn\s+hồi/giu, ' ').replace(/elastomeric\s+(?:yarns?|fib(?:re|er)s?|threads?)/gi, ' '));
    const loaiMotBen = (coSoiDanHoi(tr) && !coSoiDanHoi(trBo)) || (coSoiCaoSu(tr) && !coSoiCaoSu(trBo));
    if (loaiMotBen || (coSoiDanHoi(tr) !== coSoiCaoSu(tr) && !coDanHoiChung(tr)) || (coSoiDanHoi(trBo) !== coSoiCaoSu(trBo) && !coDanHoiChung(trBo))) {
      return 'tinhDanHoi gộp cả "sợi đàn hồi" và "sợi cao su", rộng hơn chữ luật chỉ nêu một loại hoặc loại trừ loại kia';
    }
    return null;
  }
  const KHOA_VK_BO_NGU = new Set(['VAT_LIEU_DET', 'DA_THUOC', 'DA_THUOC_TONG_HOP']);
  if (fact !== 'chatLieu' && fact !== 'vatLieuKhac') return null;
  const vals = chuoiCua(value);
  if (!vals.length) return null;
  if (fact === 'vatLieuKhac' && !vals.some((v) => KHOA_VK_BO_NGU.has(v))) return null;
  const chuXet = laPd ? (tachVeTru(tr).join(' ; ') || tr) : trBo;
  if (fact === 'chatLieu' && vals.includes('gốm sứ')) {
    const coGom = /(?<![\p{L}\p{M}])gốm(?![\p{L}\p{M}])/iu.test(chuXet);
    const coSu = /(?<![\p{L}\p{M}])sứ(?![\p{L}\p{M}])/iu.test(chuXet);
    if (coGom !== coSu) return `chatLieu "gốm sứ" rộng hơn chữ luật (${coSu ? 'chỉ nêu "sứ"' : 'chỉ nêu "gốm"'})`;
  }
  if (fact === 'chatLieu' && vals.includes('sắt thép')) {
    const coSat = /(?<![\p{L}\p{M}])sắt(?![\p{L}\p{M}])/iu.test(chuXet);
    const coThep = /(?<![\p{L}\p{M}])thép(?!\s*không\s*(?:gỉ|rỉ))(?![\p{L}\p{M}])/iu.test(chuXet);
    if (coSat !== coThep) return `chatLieu "sắt thép" rộng hơn chữ luật (${coSat ? 'chỉ nêu "sắt"' : 'chỉ nêu "thép"'})`;
  }
  if (fact === 'chatLieu' && vals.includes('kim loại')) {
    const coChung = /(?<![\p{L}\p{M}])kim\s+loại(?!\s+(?:quý|màu|đen|kiềm|đất\s+hiếm))(?![\p{L}\p{M}])/iu.test(chuXet);
    if (!coChung && RE_KIM_LOAI_CU_THE.test(chuXet)) return 'chatLieu "kim loại" (chung) rộng hơn kim loại cụ thể trong chữ luật';
  }
  // Xoá đoạn chất liệu đã khớp (theo cachDoc.vi + dungMau) khỏi cụm "bằng / từ …" rồi kiểm chữ thu hẹp bị rơi.
  if (!_tv) { try { _tv = docJson('tu-vung', 'tu-vung@2.json'); } catch { _tv = { khoa: [] }; } }
  const k = (_tv.khoa || []).find((y) => y.khoa === fact) || {};
  const daPhu = (q) => (mucCungPn || []).some((y) => {
    if (!y || y.phanConLai === true || y.chuaSoHoa !== undefined || laPhuDinh(y) || !y.fact || y.fact === 'chatLieu' || y.fact === 'vatLieuKhac') return false;
    return coCum(khongDau([y.dieuKien, y.fact, ...chuoiCua(y.value)].join(' ')), q);
  });
  for (const cum0 of cumChatLieu(chuXet)) {
    let con = cum0;
    const dsCd = [];
    for (const g of vals) {
      if (fact === 'vatLieuKhac' && !KHOA_VK_BO_NGU.has(g)) continue;
      for (const p of TV.cachDocGiaTri(k, g, _tv).vi) dsCd.push(p);
    }
    for (const p of [...new Set(dsCd)].sort((a, b) => b.length - a.length)) {
      try { con = con.replace(new RegExp(`(?<![\\p{L}\\p{M}])(?:${p})(?![\\p{L}\\p{M}])`, 'giu'), ' '); } catch { /* bỏ */ }
    }
    for (const g of vals) {
      if (fact === 'vatLieuKhac' && !KHOA_VK_BO_NGU.has(g)) continue;
      if (fact === 'chatLieu' && g === 'vải dệt') {
        // Không xoá chữ "dệt" khi đang nằm trong cụm thu hẹp "không dệt", "dệt kim", "dệt thoi".
        con = con.replace(/(?<![\p{L}\p{M}])(?:vải\s+dệt(?!\s+(?:kim|thoi))|vải|(?<!không\s+)dệt(?!\s+(?:kim|thoi))|textile|fabric)(?![\p{L}\p{M}])/giu, ' ');
      } else {
        try {
          const re = DK.reDungMau(k, g);
          if (re) con = con.replace(new RegExp(re.source, `${re.flags.replace('g', '')}g`), ' ');
        } catch { /* bỏ */ }
      }
    }
    if (RE_HOAC_AP.test(chuXet) && Array.isArray(mucCungPn)) {
      // Câu "bằng A hoặc B" (vd 9615.11 "Bằng cao su cứng hoặc plastic"): anh em khẳng định cùng mang chất liệu/vật liệu khác cũng xoá phần đã phủ khỏi phần còn lại.
      for (const y of mucCungPn) {
        if (!y || y.phanConLai === true || y.chuaSoHoa !== undefined || laPhuDinh(y) || y.fact === fact || (y.fact !== 'chatLieu' && y.fact !== 'vatLieuKhac')) continue;
        const ky = (_tv.khoa || []).find((z) => z.khoa === y.fact) || {};
        for (const gv of chuoiCua(y.value)) {
          for (const py of TV.cachDocGiaTri(ky, gv, _tv).vi) {
            try { con = con.replace(new RegExp(`(?<![\\p{L}\\p{M}])(?:${py})(?![\\p{L}\\p{M}])`, 'giu'), ' '); } catch { /* bỏ */ }
          }
          try {
            const reY = DK.reDungMau(ky, gv);
            if (reY) con = con.replace(new RegExp(reY.source, `${reY.flags.replace('g', '')}g`), ' ');
          } catch { /* bỏ */ }
        }
      }
    }
    con = con.replace(/(?<![\p{L}\p{M}])(?:các\s+)?(?:vật|chất)\s+liệu(?![\p{L}\p{M}])/giu, ' ').replace(/\s+/g, ' ').trim();
    for (const bn of BO_NGU_CHAT_LIEU) {
      if (bn.re.test(con) && !daPhu(bn.ten)) return `${fact} (${vals.join(', ')}) làm rơi bổ ngữ thu hẹp "${bn.ten}" trong "${cat(cum0, 80)}" mà không có mục khẳng định khác mang`;
    }
  }
  return null;
}

const KL_HEP_TRONG_CO_BAN = new Set(['sắt thép', 'thép không gỉ', 'gang', 'đồng', 'nhôm', 'kẽm', 'niken']);
const KHOA_POLYME_HEP = new Set(['lamTuPVC', 'bangFluoropolyme', 'chuaPolybutylenTerephthalat', 'nhomPolyme', 'loaiNhuaPolyme']);
const RE_KLCB_CHUNG = /(?<![\p{L}\p{M}])(?:kim\s+loại\s+cơ\s+bản|base\s+metals?)(?![\p{L}\p{M}])/iu;
const RE_KIM_LOAI_HEP_LUAT = /(?<![\p{L}\p{M}])(?:sắt|thép|inox|gang|đồng(?!\s+(?:hồ|đều|nhất|bộ|trục|thời|loạt|tâm))|nhôm|kẽm|niken|chì|thiếc|titan|magie|mangan|kim\s+loại\s+quý|iron|steel|stainless|cast\s+iron|copper|alumin(?:i)?um|zinc|nickel|lead|tin|titanium|magnesium|manganese|precious\s+metals?)(?![\p{L}\p{M}])/iu;
const RE_PLASTIC_CHUNG = /(?<![\p{L}\p{M}])plastics?(?![\p{L}\p{M}])/iu;
const RE_BO_NGU_POLYME = /(?<![\p{L}\p{M}])(?:PVC|vinyl\s+clorua|vinyl\s+chloride|fluoropolyme\w*|polybutylen\s+terepht(?:hal|al)ate?|PBT|xốp|tế\s+bào|cellular|trùng\s+hợp|trùng\s+ngưng|polyme|etylen|propylen|styren|acrylic|metacrylat|PMMA|polycarbonat|terepht(?:hal|al)at|PET|polyeste\w*|xenlulo|cellulose|butyral|PVB|polyamid\w*|nhựa\s+(?:amino|phenolic)|poly\()/iu;

/** Cờ hẹp hơn chữ luật: vật liệu dệt / kim loại cơ bản / plastic chung mà chọn khoá chỉ bắt một phần hẹp hơn. */
function khoaHepHonLuat(fact, value, trich, { mucCungPn = null, laPhuDinh: laPd = false } = {}) {
  const tr = String(trich || '').normalize('NFC');
  if (!tr) return null;
  const vals = chuoiCua(value);
  const trBo = boMaDau(boVeTru(tr));
  const chuXet = laPd ? (tachVeTru(tr).join(' ; ') || tr) : trBo;

  // 1. "vật liệu dệt" / "textile materials" nhưng chọn chatLieu "vải dệt"
  if (fact === 'chatLieu' && vals.includes('vải dệt')) {
    const coVatLieuDet = /(?<![\p{L}\p{M}])(?:vật\s+liệu\s+dệt|textile\s+materials?)(?![\p{L}\p{M}])/iu.test(chuXet);
    const coVaiDet = /(?<![\p{L}\p{M}])(?:vải\s+dệt(?!\s+kim)|vải\s+lụa|vải\s+bông|woven\s+fabrics?)(?![\p{L}\p{M}])/iu.test(chuXet);
    if (coVatLieuDet && !coVaiDet) {
      return 'chatLieu "vải dệt" hẹp hơn chữ luật ("vật liệu dệt", làm rơi vải không dệt/nỉ). Dùng vatLieuKhac: "VAT_LIEU_DET"';
    }
  }

  // 2. "kim loại cơ bản" / "base metal(s)" nhưng chọn một kim loại cụ thể hoặc kimLoaiCoBanKhac
  const klHep = (fact === 'chatLieu' && vals.some((v) => KL_HEP_TRONG_CO_BAN.has(v)))
    || fact === 'kimLoaiCoBanKhac'
    || (fact === 'vatLieuKhac' && vals.includes('TITAN'));
  if (klHep && RE_KLCB_CHUNG.test(chuXet) && !RE_KIM_LOAI_HEP_LUAT.test(chuXet)) {
    return `${fact}${vals.length ? ` (${vals.join(', ')})` : ''} hẹp hơn chữ luật ("kim loại cơ bản"). Dùng chatLieu: "kim loại"`;
  }

  // 3. "plastic" / "plastics" chung nhưng chọn khoá polyme chuyên biệt / plastic xốp
  const polymeHep = KHOA_POLYME_HEP.has(fact) || (fact === 'vatLieuKhac' && vals.includes('PLASTIC_XOP'));
  if (polymeHep && RE_PLASTIC_CHUNG.test(chuXet) && !RE_BO_NGU_POLYME.test(chuXet)) {
    return `${fact}${vals.length ? ` (${vals.join(', ')})` : ''} hẹp hơn chữ luật ("plastic" chung). Dùng chatLieu: "plastic"`;
  }

  return null;
}

/** Âm tiết mà mục `x` MANG đối với chữ của vế `v`: âm tiết của value + đoạn chữ vế mà cách đọc của khoá khớp (điều kiện có kiểu phải
 * đọc được từ chính chữ vế). KHÔNG tính tuKhoa: từ khoá chỉ là gợi ý dò mô tả, không phải điều kiện (8536.70 "Đầu nối" + tuKhoa
 * "cáp quang" không mang được vế "dùng cho … cáp quang"). */
function amTietMang(x, v, muc = []) {
  if (!x || x.phanConLai === true || x.chieu === 'PHAI_KHONG') return { am: new Set(), docDuoc: false }; // op KHONG ("chưa tráng men") vẫn là điều kiện khẳng định
  if (x.chuaSoHoa !== undefined) return { am: new Set(amTietVe(boMaDau(x.trich))), docDuoc: false };
  if (khoaRongHonLuat(x.fact, x.value, v.chu, { mucCungPn: muc, laPhuDinh: laPhuDinh(x) })) return { am: new Set(), docDuoc: false };
  if (khoaHepHonLuat(x.fact, x.value, v.chu, { mucCungPn: muc, laPhuDinh: laPhuDinh(x) })) return { am: new Set(), docDuoc: false };
  const am = new Set(chuoiCua(x.value).flatMap((c) => amTietVe(c)));
  let docDuoc = false;
  if (DK.laFactTuVung(x.fact) && !['TEN_LOAI', 'CONG_DUNG', 'TUONG_TU'].includes(x.op)) {
    try { docDuoc = DK.kiemDieuKien(x, v.chu) === null; } catch { docDuoc = false; }
    // ADR-0003 §Giới hạn đã biết / G6-1 lọt #4: so chiều CO/KHONG — "chưa tráng men" (giaTri:false) không được tính là phủ bởi daTrangMen:CO (và ngược lại).
    if (docDuoc && (x.op === 'CO' || x.op === 'KHONG')) {
      try {
        const docChieu = TV.docGiaTri(x.fact, String(v.chu || ''));
        if (docChieu && docChieu.trangThai === 'DA_CO' && typeof docChieu.giaTri === 'boolean' && docChieu.giaTri !== (x.op === 'CO')) {
          docDuoc = false;
        }
      } catch { /* bỏ */ }
    }
    if (docDuoc) {
      if (!_tv) { try { _tv = docJson('tu-vung', 'tu-vung@2.json'); } catch { _tv = { khoa: [] }; } }
      const k = (_tv.khoa || []).find((y) => y.khoa === x.fact) || {};
      const mau = [...((k.cachDoc && k.cachDoc.vi) || []), ...((k.cachDocKhong && k.cachDocKhong.vi) || []), ...chuoiCua(x.value).flatMap((g) => TV.cachDocGiaTri(k, g, _tv).vi)];
      const chuVe = String(v.chu).normalize('NFC');
      for (const p of mau) { try { const m = new RegExp(`(?<![\\p{L}])(?:${p})(?![\\p{L}])`, 'iu').exec(chuVe); if (m) for (const w of amTietVe(m[0])) am.add(w); } catch { /* mẫu hỏng: bỏ */ } }
      if (x.fact === 'laBoPhan' && x.op === 'CO' && /(?<![\p{L}])bộ\s+phận\s+và\s+phụ\s+kiện(?![\p{L}])/iu.test(chuVe)) {
        for (const w of ['bô', 'phu', 'kiên']) am.add(w);
      }
      // Chất liệu đọc bằng mẫu dùng chung (dungMau, vd "vải dệt" đọc được "vật liệu dệt") — cùng phép đọc với kiemDieuKien.
      for (const g of chuoiCua(x.value)) { try { const re = DK.reDungMau(k, g); const m = re && new RegExp(re.source, re.flags.replace('g', '')).exec(chuVe); if (m) for (const w of amTietVe(m[0])) am.add(w); } catch { /* bỏ */ } }
    }
  }
  return { am, docDuoc };
}
/**
 * Các mục của một phân nhóm có phủ vế `v` không: gộp âm tiết mang của mọi mục khẳng định; vế được phủ khi MỌI âm tiết nội dung ngoài
 * ngoặc (hoặc mọi âm tiết trong ngoặc — tên khác, vd "(xi lanh)") đều được mang. Vế chỉ có ngưỡng số: cần một điều kiện đọc được.
 */
function phuVe(muc, v) {
  const ds = Array.isArray(muc) ? muc : [muc];
  const gop = new Set(); let docDuoc = false;
  for (const x of ds) { const r = amTietMang(x, v, ds); for (const w of r.am) gop.add(w); docDuoc = docDuoc || r.docDuoc; }
  // Vế GIỚI HẠN là thuộc tính: một điều kiện có kiểu đọc được từ chính chữ vế là đủ ("Đã lắp với đầu nối điện" ← daGanDauNoi).
  // Vế ĐẦU NGỮ là tên hàng: phải mang đủ âm tiết (dangCuon không thay được "Dây đơn" của "Dây đơn dạng cuộn").
  // Trừ vế chất liệu "bằng A hoặc B": xử riêng bên dưới, phải đọc được MỌI phương án (4202.12 chỉ khai "plastic" là thiếu "vật liệu dệt").
  const laChatLieu = /^(?:làm )?bằng\s/iu.test(String(v.chu).normalize('NFC'));
  if (v.loai === 'GIOI_HAN' && docDuoc && !laChatLieu) return true;
  const du = (a) => a.length > 0 && a.every((w) => gop.has(w));
  if (!v.chinh.length && !v.phu.length) return docDuoc;
  // Vế chất liệu "bằng A hoặc B": phủ khi MỌI phương án đọc được bằng một giá trị của chatLieu hoặc vatLieuKhac (cùng phép đọc với
  // kiemDieuKien, kể cả mẫu dùng chung) và không bị KHOA_RONG_HON_LUAT / KHOA_HEP_HON_LUAT trên chính vế đó. Chữ hình dạng đi kèm ("tấm plastic") không có khoá — giới hạn đã biết.
  if (laChatLieu) {
    const pa = String(v.chu).normalize('NFC').replace(/^(?:làm )?bằng\s+/iu, '').split(/,|(?<![\p{L}])(?:hoặc|và)(?![\p{L}])/u).map((x) => x.trim()).filter(Boolean);
    const cl = ds.filter((x) => x && x.chieu !== 'PHAI_KHONG'
      && ((x.fact === 'chatLieu' && x.op === 'LA') || (x.fact === 'vatLieuKhac' && (x.op === 'TRONG' || x.op === 'LA')))
      && !khoaRongHonLuat(x.fact, x.value, v.chu, { mucCungPn: ds })
      && !khoaHepHonLuat(x.fact, x.value, v.chu, { mucCungPn: ds }));
    const doc = (t) => cl.some((x) => chuoiCua(x.value).some((g) => {
      const dk = x.fact === 'vatLieuKhac' ? { fact: 'vatLieuKhac', op: 'TRONG', value: [g] } : { fact: 'chatLieu', op: 'LA', value: g };
      const veOpt = `bằng ${t}`;
      try {
        return (DK.kiemDieuKien(dk, t) === null || DK.kiemDieuKien(dk, veOpt) === null)
          && !khoaRongHonLuat(x.fact, g, veOpt, { mucCungPn: ds })
          && !khoaHepHonLuat(x.fact, g, veOpt, { mucCungPn: ds });
      } catch { return false; }
    }));
    if (pa.length && pa.every(doc)) return true;
  }
  return du(v.chinh) || du(v.phu);
}
let _tv = null;
const giaTriCuaKhoa = (k) => [...new Set([...(k?.giaTriHopLe || []), ...Object.keys(k?.moTaGiaTri || {})])];
const KHOA_NEN = new Set(['tenLoai', 'congDung', 'dungCho', 'laBoPhan', 'chatLieu']);
/**
 * Khoá hợp có sẵn cho chữ một mục chuaSoHoa (để chặn chuaSoHoa lười), hoặc null. Xét phần GIỚI HẠN của câu trích (bỏ đầu ngữ chỉ vị
 * trí như "Mặt ngoài"); không có vế giới hạn ⇒ câu là tên hàng ⇒ tenLoai. "bằng …" trả chatLieu / vatLieuKhac khi MỌI phương án
 * chất liệu đọc được bằng giá trị của khoá (và không rộng/hẹp hơn chữ luật).
 */
function khoaPhuHop(h4, trich, { boQua = null } = {}) {
  const tFull = boMaDau(boVeTru(trich))
    .replace(/\(\s*(?:SEN|1|2)\s*\)/giu, ' ')
    .replace(/(?:^|\s)\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!tFull || kieuTieuDe(tFull) === 'DU') return null;
  if (!_tv) { try { _tv = docJson('tu-vung', 'tu-vung@2.json'); } catch { _tv = { khoa: [] }; } }
  const escRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const khopTrong = (ds, chu) => (ds || []).some((m) => { try { return new RegExp(`(?<![\\p{L}\\p{N}])(?:${m})(?![\\p{L}\\p{N}])`, 'iu').test(chu); } catch { return false; } });
  const ch = Number(String(h4 || '').slice(0, 2));
  const boQuaKhoa1Sai = (khoa, s) => (
    (khoa === 'hieuChinhThiLuc' && /có\s+độ\s+(?:mảnh|bền)/iu.test(s))
    || (khoa === 'loaiRoLe' && /(?:mạng\s+che\s+quang|(?:linh\s+kiện|chất)\s+bán\s+dẫn)/iu.test(s))
    || (khoa === 'loaiCongTac' && /(?:bếp\s+đun|lò\s+nướng|vỉ\s+nướng)/iu.test(s))
    || (khoa === 'loaiCung' && /protein\s+đã\s+(?:được\s+)?làm\s+cứng/iu.test(s))
    || (khoa === 'dangLong' && /chứa\s+chất\s+lỏng/iu.test(s))
    || (khoa === 'loaiPhaChe' && ch !== 27)
  );
  const coDonViCuaHe = (k, chu) => {
    if (k.kieu !== 'SO' || k.donViKhongVietRa || !k.heDonVi) return true;
    if (k.docPhanSo) return /\d\s*\/\s*\d/.test(chu);
    const he = (_tv.heDonVi && _tv.heDonVi[k.heDonVi]) || {};
    const bd = _tv.bietDanhDonVi || {};
    const dsDv = [...Object.keys(he), ...Object.entries(bd).filter(([, c]) => Object.prototype.hasOwnProperty.call(he, c)).map(([a]) => a)].filter(Boolean);
    if (!dsDv.length) return true;
    const pat = dsDv.sort((a, b) => b.length - a.length).map((u) => (/^[\p{L}\p{N}]+$/u.test(u) ? `(?<![\\p{L}])${escRe(u)}(?![\\p{L}])` : escRe(u))).join('|');
    const soTruoc = k.demSo ? '(?:\\d|(?<![\\p{L}])(?:một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười)(?![\\p{L}]))' : '\\d';
    return new RegExp(`${soTruoc}\\s*(?:${pat})`, 'iu').test(chu);
  };
  const laChuong39 = ch === 39;
  const laDetMay = ch >= 50 && ch <= 63;
  const goiY = new Set(khoaGoiY(h4).map((k) => k.khoa));
  const uuTienKieu = { CO_KHONG: 0, SO: 1, LIET_KE: 2 };
  const uuTienKhoa = (k) => (laChuong39 && k.khoa === 'loaiNhuaPolyme' ? 1.5 : (uuTienKieu[k.kieu] ?? 3));
  const dsKhoa = [...(_tv.khoa || [])].sort((a, b) => uuTienKhoa(a) - uuTienKhoa(b));
  const khopKhoaMau = (k, chu) => {
    if (KHOA_NEN.has(k.khoa) || !goiY.has(k.khoa)) return false;
    if (laChuong39 && k.khoa === 'loaiSoiDet') return false;
    if (laDetMay && k.khoa === 'loaiNhuaPolyme') return false;
    if (boQuaKhoa1Sai(k.khoa, trich) || boQuaKhoa1Sai(k.khoa, chu)) return false;
    if (khoaRongHonLuat(k.khoa, null, trich) || !coDonViCuaHe(k, chu)) return false;
    return khopTrong(k.cachDoc && k.cachDoc.vi, chu)
      || khopTrong(k.cachDocKhong && k.cachDocKhong.vi, chu)
      || giaTriCuaKhoa(k).some((g) => khopTrong(TV.cachDocGiaTri(k, g, _tv).vi, chu) && !khoaRongHonLuat(k.khoa, g, trich) && !khoaHepHonLuat(k.khoa, g, trich));
  };
  const khopKhoa = (k, chu) => !(boQua && boQua(k, trich)) && khopKhoaMau(k, chu);
  const timKhoa2 = (chu, { chiKieu = null } = {}) => {
    for (const k of dsKhoa) {
      if (chiKieu && k.kieu !== chiKieu) continue;
      if (khopKhoa(k, chu)) return k.khoa;
    }
    return null;
  };
  const KHOA_CUA_DAC_BIET = ['loaiSoiDet', 'cuaLoaiGiaCam', 'dungLamGiong', 'gioiTinhLuaTuoi'];
  if (/^(?:các\s+)?bộ\s+phận(?:\s+và\s+phụ\s+kiện)?$/iu.test(tFull)) return 'laBoPhan';
  if (/^(?:dùng cho|dùng trong|sử dụng cho|lắp vào|lắp cho)(?![\p{L}])/iu.test(tFull)) return 'dungCho';
  if (/^(?:(?:bộ\s+phận(?:\s+và\s+phụ\s+kiện)?\s+)?của|để|dùng\s+để)(?![\p{L}])/iu.test(tFull)) {
    for (const ten of KHOA_CUA_DAC_BIET) {
      const k = dsKhoa.find((x) => x.khoa === ten);
      if (!k || !khopKhoaMau(k, tFull)) continue;
      return boQua && boQua(k, trich) ? null : k.khoa;
    }
    return 'dungCho';
  }
  const timBang = (chu) => {
    const cl = (_tv.khoa || []).find((k) => k.khoa === 'chatLieu') || {};
    const vk = (_tv.khoa || []).find((k) => k.khoa === 'vatLieuKhac') || {};
    const chuCl = chu.replace(/^(?:làm )?bằng\s+/iu, '')
      .replace(/,?\s*(?<![\p{L}])(?:có hoặc không(?: có)?|đã hoặc chưa|đã hoặc không)\s[^,;]*/giu, '')
      .trim();
    const phuongAn = chuCl.split(/,|(?<![\p{L}])(?:hoặc|và)(?![\p{L}])/u).map((x) => x.trim()).filter(Boolean);
    const docCl = (pa) => (cl.giaTriHopLe || []).some((v) => {
      const veOpt = `bằng ${pa}`;
      try {
        return DK.kiemDieuKien({ fact: 'chatLieu', op: 'LA', value: v }, pa) === null
          && !khoaRongHonLuat('chatLieu', v, veOpt)
          && !khoaHepHonLuat('chatLieu', v, veOpt);
      } catch { return false; }
    });
    const docVk = (pa) => giaTriCuaKhoa(vk).some((v) => {
      const c = { fact: 'vatLieuKhac', op: 'TRONG', value: [v] };
      const veOpt = `bằng ${pa}`;
      try {
        return (DK.kiemDieuKien(c, pa) === null || DK.kiemDieuKien(c, veOpt) === null)
          && !khoaRongHonLuat('vatLieuKhac', v, veOpt)
          && !khoaHepHonLuat('vatLieuKhac', v, veOpt);
      } catch { return false; }
    });
    if (phuongAn.length) {
      const boCl = boQua && boQua(cl, trich);
      const boVk = boQua && boQua(vk, trich);
      if (!boCl && phuongAn.every(docCl)) return 'chatLieu';
      if (!boVk && phuongAn.every(docVk)) return 'vatLieuKhac';
      if (!boCl && !boVk && phuongAn.every((pa) => docCl(pa) || docVk(pa))) return 'vatLieuKhac';
    }
    const kBang = timKhoa2(chu);
    if (kBang && phuongAn.length > 1) {
      const kObj = (_tv.khoa || []).find((x) => x.khoa === kBang);
      if (kObj && kObj.kieu === 'LIET_KE' && !phuongAn.every((pa) => khopKhoa(kObj, pa))) return null;
    }
    return kBang;
  };
  if (/^(?:làm )?bằng\s/iu.test(tFull)) return timBang(tFull);
  const kSo = timKhoa2(tFull, { chiKieu: 'SO' });
  if (kSo) return kSo;
  let t = tFull;
  if (!RE_GIOI_HAN_DAU.test(t)) {
    const m = RE_GIOI_HAN_GIUA.exec(t);
    if (!m) {
      const sauPhay = /,\s*(.+)$/.exec(t)?.[1]?.trim() || '';
      if (RE_THUOC_TINH.test(t) || /^lắp\s+ổ(?![\p{L}])/iu.test(t)) {
        const k = timKhoa2(t);
        if (k) return k;
        return /phù\s+hợp\s+(?:với|cho)(?![\p{L}])/iu.test(t) ? 'dungCho' : null;
      }
      if (sauPhay && (kieuTieuDe(t) === 'DU_CO_PHAM_VI' || /^lắp\s+ổ(?![\p{L}])/iu.test(sauPhay))) {
        const kPhay = timKhoa2(sauPhay);
        if (kPhay) return kPhay;
      }
      if (laDetMay && /^sợi\s+/iu.test(t)) {
        const kSd = dsKhoa.find((x) => x.khoa === 'loaiSoiDet');
        if (kSd && khopKhoaMau(kSd, t)) return boQua && boQua(kSd, trich) ? null : 'loaiSoiDet';
      }
      return /\d/.test(t) ? null : 'tenLoai';
    }
    t = t.slice(m.index).trim();
  }
  if (/^(?:dùng cho|dùng trong|sử dụng cho|lắp vào|lắp cho)(?![\p{L}])/iu.test(t)) return 'dungCho';
  if (/^(?:làm )?bằng\s/iu.test(t)) return timBang(t);
  const kTim = timKhoa2(t);
  if (kTim) return kTim;
  const mViTriBang = /^(?:có|với)\s+(?:khung|vỏ|thân|mặt(?:\s+ngoài)?|lớp|đế(?:\s+ngoài)?|mũ|bộ\s+phận\s+làm\s+việc)\s+((?:làm\s+)?bằng\s.+)$/iu.exec(t);
  if (mViTriBang) { const kCl = timBang(mViTriBang[1]); if (kCl) return kCl; }
  return /phù\s+hợp\s+(?:với|cho)(?![\p{L}])/iu.test(t) ? 'dungCho' : null;
}

// ───────────────────────────────────────── HỎI ĐẶC TÍNH, KHÔNG HỎI MỤC ĐÍCH TỰ NHẬN ─────────────────────────────────────────
// Luật CEO duyệt 21/11/2026: câu phân biệt / tiêu chí phải hỏi ĐẶC TÍNH quan sát hoặc kiểm chứng được trên hàng (cấu tạo, kích
// thước, chất liệu, cơ cấu, thông số), KHÔNG hỏi khách tự nhận mục đích / tên gọi. Ví dụ: "đai lưng tập gym" — "đai lưng" là chủ
// thể, "tập gym" là bối cảnh; câu "Là các mặt hàng và thiết bị cho tập luyện thể chất…?" của sổ 9506 thì khách gọi hàng là đai tập
// gym sẽ tự trả lời "có", dù hàng chỉ là một thắt lưng có chốt khoá như thắt lưng da (tờ khai mẫu OZ: "Đai lưng" khai 4 lần
// 63079090, 1 lần 95069100). NGOẠI LỆ: chính chữ luật trích (tiêu đề biểu thuế / chú giải) định nghĩa phân nhóm bằng công dụng
// (8481.20 "Van dùng trong truyền động dầu thủy lực hoặc khí nén") — không đỏ, nhưng phải kèm câu hỏi đặc tính kiểm chứng
// (trường `kiemChung` của mục) — thiếu thì cảnh báo CONG_DUNG_THIEU_DAC_TINH_KIEM_CHUNG.
// Phát hiện bằng LUẬT (tất định, không LLM); so ở dạng NFC chữ thường, ranh giới chữ Unicode.
const chuThuong = (s) => String(s == null ? '' : s).normalize('NFC').toLowerCase();
const reDs = (ds) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${ds.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')).join('|')})(?![\\p{L}\\p{N}])`, 'giu');
const TU_MUC_DICH = ['dùng cho', 'dùng để', 'dùng trong', 'dùng làm', 'dùng vào', 'sử dụng cho', 'sử dụng để', 'sử dụng trong', 'được dùng',
  'được sử dụng', 'loại dùng', 'chuyên dụng', 'chuyên dùng', 'chuyên nghiệp', 'chuyên cho', 'dành cho', 'dành riêng', 'phục vụ', 'mục đích',
  'công dụng', 'thiết kế cho', 'thiết kế để', 'nhằm', 'cho tập', 'để tập', 'cho việc', 'cho các môn', 'cho môn', 'cho thể thao', 'cho thể dục',
  'cho điền kinh', 'tên gọi', 'gọi là', 'tên thương mại'];
const RE_MUC_DICH = reDs(TU_MUC_DICH);
// Chữ luật nói công dụng (rộng hơn: "Động cơ … dùng khí nén", "thiết bị cho tập luyện").
const RE_LUAT_CONG_DUNG = new RegExp(`${RE_MUC_DICH.source}|(?<![\\p{L}])(?:dùng|cho|để|sử\\s+dụng|lắp\\s+vào|phù\\s+hợp\\s+(?:với|cho))(?![\\p{L}])|(?:^|[;:])\\s*(?:[\\d.]+\\s*(?:[-–]\\s*)*)?(?:(?:các\\s+)?bộ(?:\\s+phận(?:\\s+và\\s+phụ\\s+kiện)?|\\s+khác)?\\s+)?của(?![\\p{L}])`, 'iu');
// Cụm mục đích dừng ở dấu câu hoặc chữ mở đầu một đặc tính ("… cho tập gym, có bản rộng …").
const RE_DUNG_CUM = /[,;:.?!()]|(?<![\p{L}])(?:có|gồm|bằng|làm bằng|với|kèm|không|hay)(?![\p{L}])/u;
// Đặc tính kiểm chứng được: thông số, kích thước, chất liệu, cấu tạo / cơ cấu, tên bộ phận.
const TU_DAC_TINH = ['cấu tạo', 'kết cấu', 'kích thước', 'kích cỡ', 'chiều dài', 'chiều rộng', 'chiều cao', 'đường kính', 'độ dày', 'bề dày',
  'bản rộng', 'trọng lượng', 'khối lượng', 'công suất', 'điện áp', 'dòng điện', 'áp suất', 'áp lực', 'tốc độ', 'lưu lượng', 'dung tích', 'thể tích',
  'nhiệt độ', 'chất liệu', 'vật liệu', 'làm bằng', 'thành phần', 'hàm lượng', 'tỷ lệ', 'tỉ lệ', 'có gắn', 'có lắp', 'gắn với', 'lắp với', 'gồm',
  'cơ cấu', 'lò xo', 'bánh răng', 'trục', 'ổ bi', 'ổ trục', 'piston', 'pít tông', 'xi lanh', 'cuộn dây', 'cuộn coil', 'khoá', 'khóa', 'chốt',
  'đệm', 'bản lề', 'ren', 'gioăng', 'màng', 'lõi', 'khung', 'tay cầm', 'tay nắm', 'bánh xe', 'động cơ', 'mô tơ', 'pin', 'ắc quy', 'màn hình',
  'cảm biến', 'vi xử lý', 'mạch', 'dây dẫn', 'đầu nối', 'chất lưu', 'lưu chất', 'chất lỏng', 'chất khí', 'nhiều lớp', 'được phủ', 'tráng',
  'mạ', 'dệt kim', 'dệt thoi', 'móc', 'bơm hơi', 'căng lưới', 'đóng bộ', 'tách rời', 'dạng', 'hình dạng', 'lồi', 'lõm', 'phẳng', 'vỏ',
  'kèm', 'được lắp', 'được gắn', 'gắn cố định', 'gắn trên', 'lắp trên', 'kết nối', 'chứa sẵn', 'nạp lại', 'sạc lại'];
const RE_DAC_TINH = reDs(TU_DAC_TINH);
const RE_BANG_CHAT = /(?<![\p{L}])bằng\s+(?:thép|sắt|gang|inox|nhôm|đồng|kẽm|chì|thiếc|niken|titan|kim loại|nhựa|plastic|cao su|gỗ|tre|giấy|bìa|da|vải|sợi|thủy tinh|thuỷ tinh|gốm|sứ|đá|xi măng|bê tông|vật liệu dệt|lông)(?![\p{L}])/giu;
const RE_SO_DON_VI = /\d+(?:[.,]\d+)?\s*(?:mm|cm|m|km|kg|g|mg|tấn|v|kv|vdc|vac|w|kw|kva|mw|a|ma|ah|mah|hz|khz|mhz|ghz|bar|mpa|kpa|pa|psi|l|lít|ml|cc|%|inch|in|°c|độ|rpm|vòng\/phút|m2|m3|m²|m³|dtex|tex|gsm|g\/m2|kg\/m3|lm|lux|db|ohm|Ω|mét|cm3|ph)(?![\p{L}])/giu;
// Khoá tu-vung@2 là ĐẶC TÍNH (số, chất liệu, có/không, liệt kê) — trừ khoá công dụng / tên / phạm vi dùng.
const RE_KHOA_CONG_DUNG = /^(?:dung|cho|thichHop|thietKe|phamVi|thuongDung|congDung|maHs|mangTheo)/;
let _khoaDacTinh = null;
function khoaDacTinh() {
  if (_khoaDacTinh) return _khoaDacTinh;
  if (!_tv) { try { _tv = docJson('tu-vung', 'tu-vung@2.json'); } catch { _tv = { khoa: [] }; } }
  _khoaDacTinh = new Map();
  for (const k of _tv.khoa || []) {
    if (!['SO', 'CHAT_LIEU_THEO_VI_TRI', 'CO_KHONG', 'LIET_KE'].includes(k.kieu) || RE_KHOA_CONG_DUNG.test(k.khoa)) continue;
    if (/(?<![\p{L}])(?:dùng|công dụng|mục đích)(?![\p{L}])/iu.test(String(k.nhanVi || ''))) continue;
    const mau = [...((k.cachDoc && k.cachDoc.vi) || []), ...giaTriCuaKhoa(k).flatMap((g) => TV.cachDocGiaTri(k, g, _tv).vi)];
    const re = []; for (const m of mau) { try { re.push(new RegExp(`(?<![\\p{L}\\p{N}])(?:${m})(?![\\p{L}\\p{N}])`, 'iu')); } catch { /* mẫu hỏng: bỏ */ } }
    _khoaDacTinh.set(k.khoa, re);
  }
  return _khoaDacTinh;
}
/** Các cụm mục đích / tên gọi trong một câu: [{cum, tu}] — `tu` = từ nội dung (không dấu) của phần đứng sau cụm, tới dấu câu. */
function phatHienMucDich(cau) {
  const t = chuThuong(cau); const ra = [];
  for (const m of t.matchAll(RE_MUC_DICH)) {
    const sau = t.slice(m.index + m[0].length); const d = RE_DUNG_CUM.exec(sau);
    const phan = (d ? sau.slice(0, d.index) : sau).trim();
    ra.push({ cum: m[0], phan, tu: tuNoiDung(phan) });
  }
  return ra;
}
/** Bỏ các cụm mục đích (và phần đi theo) khỏi câu — phần còn lại mới xét đặc tính. */
function boCumMucDich(cau) {
  let t = chuThuong(cau);
  for (const m of phatHienMucDich(cau)) t = t.replace(`${m.cum}${m.phan ? ` ${m.phan}` : ''}`, ' ').replace(m.cum, ' ');
  return t;
}
/** Đặc tính kiểm chứng được có trong câu (sau khi bỏ cụm mục đích): ['so:24 vdc', 'tu:khoá', 'chat:bằng thép', 'khoa:dienAp']. */
function phatHienDacTinh(cau, { boMucDich = true } = {}) {
  const t = boMucDich ? boCumMucDich(cau) : chuThuong(cau);
  const ra = new Set();
  // Thông số có số + đơn vị là đo được kể cả khi nằm trong cụm công dụng ("dùng cho điện áp trên 1000 V").
  for (const m of chuThuong(cau).matchAll(RE_SO_DON_VI)) ra.add(`so:${m[0].trim()}`);
  for (const m of t.matchAll(RE_DAC_TINH)) ra.add(`tu:${m[0]}`);
  for (const m of t.matchAll(RE_BANG_CHAT)) ra.add(`chat:${m[0]}`);
  for (const [k, ds] of khoaDacTinh()) if (ds.some((re) => re.test(t))) ra.add(`khoa:${k}`);
  return [...ra];
}
/** Chữ luật có tự định nghĩa bằng công dụng không: có lời công dụng VÀ mọi từ nội dung của cụm mục đích đều nằm trong chữ luật. */
function luatDinhNghiaCongDung(chuLuat, tu) {
  const l = chuThuong(chuLuat);
  if (!l.trim() || !RE_LUAT_CONG_DUNG.test(l) || !tu.length) return false;
  const tap = new Set(khongDau(l).split(' '));
  return tu.every((w) => tap.has(w));
}
/**
 * Kiểm MỘT câu hỏi gửi khách (vd `phanBiet[].hoi`) theo luật "hỏi đặc tính, không hỏi mục đích tự nhận". Chỉ phát hiện, không sửa.
 * @param {string} hoi
 * @param {{chuLuat?: string, cauPhu?: string[]}} [tuyChon]  chuLuat: chữ luật được trích làm căn cứ câu hỏi; cauPhu: các câu hỏi
 *        đi kèm cùng căn cứ (để xét đã có câu đặc tính kiểm chứng chưa)
 * @returns {{ma: null|'CHI_HOI_MUC_DICH'|'CONG_DUNG_THIEU_DAC_TINH_KIEM_CHUNG', mucDich: string[], dacTinh: string[], luatDinhNghia: boolean}}
 */
function kiemCauHoiMucDich(hoi, { chuLuat = '', cauPhu = [] } = {}) {
  const md = phatHienMucDich(hoi);
  const dt = md.length ? phatHienDacTinh(hoi) : [];
  const ra = { ma: null, mucDich: md.map((m) => m.cum), dacTinh: dt, luatDinhNghia: false };
  if (!md.length || dt.length) return ra;
  ra.luatDinhNghia = luatDinhNghiaCongDung(chuLuat, [...new Set(md.flatMap((m) => m.tu))]);
  if (!ra.luatDinhNghia) ra.ma = 'CHI_HOI_MUC_DICH';
  else if (!cauPhu.some((c) => phatHienDacTinh(c).length)) ra.ma = 'CONG_DUNG_THIEU_DAC_TINH_KIEM_CHUNG';
  return ra;
}
/**
 * Một mục điều kiện tieuChi6 có "chỉ hỏi mục đích" không. null = không phải mục mục đích (hoặc có đặc tính);
 * {ngoaiLe: true} = chữ luật trích tự định nghĩa bằng công dụng (cần kiemChung); {ngoaiLe: false} = đỏ CHI_HOI_MUC_DICH.
 */
function mucDichCuaMuc(x) {
  if (!x || x.phanConLai === true || x.chuaSoHoa !== undefined || laPhuDinh(x) || !x.fact) return null;
  const giaTri = chuoiCua(x.value);
  const laCongDung = x.op === 'CONG_DUNG' || x.fact === 'dungCho' || x.fact === 'congDung';
  const md = phatHienMucDich([chu(x.dieuKien), ...(laCongDung ? [] : giaTri)].join(' . '));
  if (!laCongDung && !md.length) return null;
  if (khoaDacTinh().has(x.fact)) return null;
  let conLai = chu(x.dieuKien);
  if (laCongDung) for (const g of giaTri) conLai = conLai.split(g).join(' ');
  if (phatHienDacTinh(conLai).length) return null;
  const tu = [...new Set([...md.flatMap((m) => m.tu), ...(laCongDung ? giaTri.flatMap((g) => tuNoiDung(g)) : [])])];
  return { ngoaiLe: luatDinhNghiaCongDung(x.trich, tu), mucDich: md.map((m) => m.cum), tu };
}

// ───────────────────────────────────────── CỔNG MÁY ─────────────────────────────────────────
/**
 * Kiểm một bộ `tieuChi6` khuôn g6@1 của nhóm `h4`. Không sửa gì.
 * @param {string} h4
 * @param {object[]} ds  mảng mục tieuChi6
 * @param {{toKhai?: boolean}} [tuyChon]  toKhai=false: bỏ phép đo trên tờ khai mẫu (không sinh cảnh báo LECH_TO_KHAI_CAO)
 * @returns {{loi: {ma: string, hs6: string|null, muc: number|null, chiTiet: string}[], canhBao: object[], thongKe: object}}
 */
function kiemTieuChi6(h4, ds, tuyChon = {}) {
  const loi = []; const canhBao = [];
  const bao = (ma, hs6, chiTiet, muc = null) => loi.push({ ma, hs6: hs6 || null, muc, chiTiet });
  const pn = phanNhomCuaNhom(h4);
  const ket = (thongKe = {}) => ({ loi, canhBao, thongKe: { khuon: KHUON, nhom: h4, soPhanNhom: pn.length, soMuc: Array.isArray(ds) ? ds.length : 0, ...thongKe } });
  if (pn.length < 2) { bao('KHUON_SAI', null, pn.length ? `nhóm ${h4} chỉ có một phân nhóm 6 số — không cần tieuChi6` : `nhóm ${h4} không có trong biểu thuế hiện hành`); return ket(); }
  if (!Array.isArray(ds) || !ds.length) { bao('KHUON_SAI', null, 'tieuChi6 phải là mảng không rỗng'); return ket(); }
  const theoMa = new Map(pn.map((p) => [p.hs6, p]));
  const src = nguonChoPhep(h4);
  const srcSq = Object.fromEntries(Object.entries(src).map(([k, v]) => [k, S.squash(v)]));
  const coTrich = (nguon, trich) => S.quoteInSource(trich, srcSq[nguon]);
  const tienLe = tienLeCuaNhom(h4);
  const cuaPn = new Map();
  const congDungCanKiem = []; // mục công dụng mà chữ luật tự định nghĩa (ngoại lệ) — cần câu hỏi đặc tính kiểm chứng

  ds.forEach((x, i) => {
    if (!x || typeof x !== 'object' || Array.isArray(x)) { bao('KHUON_SAI', null, 'mục không phải object', i); return; }
    const hs6 = so(x.hs6);
    const p = theoMa.get(hs6);
    if (!p) { bao('PHAN_NHOM_KHONG_TON_TAI', hs6 || String(x.hs6 || ''), `"${x.hs6}" không phải phân nhóm của nhóm ${h4}; nhóm có: ${pn.map((q) => q.hs6).join(', ')}`, i); return; }
    if (!cuaPn.has(hs6)) cuaPn.set(hs6, []);
    cuaPn.get(hs6).push(x);
    const la = Object.keys(x).filter((k) => !TRUONG.has(k));
    if (la.length) bao('KHUON_SAI', hs6, `trường lạ: ${la.join(', ')}`, i);
    if (x.thuTu !== undefined && (!Number.isInteger(x.thuTu) || x.thuTu < 1)) bao('THU_TU_SAI', hs6, 'thuTu không phải số nguyên ≥ 1 (bỏ hẳn thuTu — máy tự xếp)', i);

    // ── nguồn + trích ──
    const nguon = chu(x.nguon); const trich = chu(x.trich);
    const laDu = x.phanConLai === true; const chuaSo = typeof x.chuaSoHoa === 'string' && x.chuaSoHoa.trim().length > 0;
    let nguonDat = false;
    if (nguon === `tieuDe.${p.tang}` && p.tang !== h4 && !p.tangCoTen) bao('NGUON_KHONG_TON_TAI', hs6, `tầng ${p.tang} tên là "${p.tenTang}" — không phải điều kiện, không trích được. XOÁ mục này`, i);
    else if (!nguon || !(nguon in src)) bao('NGUON_KHONG_TON_TAI', hs6, `nguon "${nguon}" không có trong gói soạn của nhóm ${h4}`, i);
    else {
      const m = /^(?:tieuDe|tax|wco)\.(\d+)$/.exec(nguon);
      const cuaMinh = !m || m[1].slice(0, 6) === hs6 || (nguon === `tieuDe.${p.tang}` && p.tangCoTen);
      if (!cuaMinh) bao('NGUON_LAC_PHAN_NHOM', hs6, `nguon "${nguon}" là tên của phân nhóm / tầng khác, không phải của ${hs6}`, i);
      else if (laDu && nguon !== p.nguonTen) bao('NGUON_LAC_PHAN_NHOM', hs6, `mục phanConLai phải trích chính tiêu đề của phân nhóm (nguon "${p.nguonTen}"), không phải "${nguon}"`, i);
      else if (chuaSo && nguon !== p.nguonTen && nguon !== `tieuDe.${p.tang}`) bao('NGUON_LAC_PHAN_NHOM', hs6, `mục chuaSoHoa phải trích tiêu đề của phân nhóm ("${p.nguonTen}") hoặc của tầng chứa nó, không phải "${nguon}"`, i);
      else nguonDat = true;
    }
    if (!trich) bao('TRICH_KHONG_NGUYEN_VAN', hs6, 'thiếu trich', i);
    else if (trich.length > TRICH_TOI_DA) bao('KHUON_SAI', hs6, `trich dài ${trich.length} ký tự (tối đa ${TRICH_TOI_DA}) — trích đúng câu cần, không chép cả đoạn`, i);
    else if (nguonDat && !coTrich(nguon, trich)) bao('TRICH_KHONG_NGUYEN_VAN', hs6, `không tìm thấy trong "${nguon}": "${cat(trich, 140)}"${String(src[nguon]).length <= 240 ? ` — chữ đúng của nguồn này là: "${String(src[nguon]).trim()}"` : ''}`, i);

    // ── điều kiện ──
    if (x.phanConLai !== undefined && x.phanConLai !== true) bao('KHUON_SAI', hs6, 'phanConLai chỉ nhận true (phân nhóm có tên riêng thì bỏ hẳn trường này)', i);
    if (x.chuaSoHoa !== undefined && !chuaSo) bao('KHUON_SAI', hs6, 'chuaSoHoa phải là một câu ngắn nói thiếu khoá gì', i);
    if (laDu || chuaSo) {
      const thua = ['fact', 'op', 'value', 'chieu', 'dieuKien', 'tuKhoa', 'dieuKienTru', 'uuTien', 'kiemChung', ...(laDu && chuaSo ? ['chuaSoHoa'] : [])].filter((k) => x[k] !== undefined && x[k] !== null);
      if (thua.length) bao(laDu ? 'DU_MANG_DIEU_KIEN' : 'KHUON_SAI', hs6, `mục ${laDu ? 'phanConLai' : 'chuaSoHoa'} không được có: ${thua.join(', ')}`, i);
    } else if (x.fact === undefined || x.fact === null) {
      bao('KHUON_SAI', hs6, 'mục rỗng: không có fact, không phanConLai, không chuaSoHoa — xoá mục này, hoặc điền đủ fact + op + value', i);
    } else {
      if (!DK.laFactTuVung(x.fact)) bao('KHOA_DU_KIEN_LA', hs6, `fact "${x.fact}" không có trong tu-vung@2 (chọn trong "khoaGoiY" của gói soạn; không có khoá hợp thì khai chuaSoHoa)`, i);
      else {
        const l = DK.kiemDieuKien(x, trich);
        if (l) bao(/khong-co-trong-trich/.test(l) ? 'SUY_RONG' : 'KHUON_SAI', hs6, `điều kiện có kiểu: ${goiYKieu(l)}`, i);
      }
      const giaTri = chuoiCua(x.value);
      if (x.fact === 'tenLoai') {
        const thuocTinh = giaTri.filter((v) => RE_THUOC_TINH.test(v.normalize('NFC').trim()));
        if (thuocTinh.length) bao('SAI_KHOA_THUOC_TINH', hs6, `tenLoai nhận ${thuocTinh.map((v) => `"${cat(v, 60)}"`).join(', ')} — đó là thuộc tính, không phải tên hàng`, i);
      }
      {
        const rong = [...giaTri, ...(Array.isArray(x.tuKhoa) ? chuoiCua(x.tuKhoa) : [])].filter((v) => RE_CUM_RONG.test(v.normalize('NFC').trim()));
        if (rong.length) bao('GIA_TRI_RONG', hs6, `${rong.map((v) => `"${cat(v, 40)}"`).join(', ')} là cụm mở, không phải tên hàng`, i);
      }
      if (!laPhuDinh(x) && /(?<![\p{L}])(?:kể cả|including)(?![\p{L}])/iu.test(trich.normalize('NFC')) && giaTri.length) {
        const tr = trich.normalize('NFC'); const m = /\(?\s*(?<![\p{L}])(?:kể cả|including)(?![\p{L}])[^)]*\)?/iu.exec(tr);
        const keCa = khongDau(m ? m[0] : ''); const conLai = khongDau(m ? tr.slice(0, m.index) + tr.slice(m.index + m[0].length) : tr);
        if (m && giaTri.every((v) => coCum(keCa, v) && !coCum(conLai, v))) bao('KE_CA_LA_DIEU_KIEN', hs6, `value ${giaTri.map((v) => `"${cat(v, 40)}"`).join(', ')} chỉ nằm trong vế "kể cả / including …" — gộp vào value của mục chính`, i);
      }
      if (['TEN_LOAI', 'CONG_DUNG'].includes(x.op)) {
        const coKhac = giaTri.filter((v) => /(?<![\p{L}])khác\s*$/iu.test(v.normalize('NFC').trim()));
        if (coKhac.length) bao('TEN_CO_CHU_KHAC', hs6, `value ${coKhac.map((v) => `"${cat(v, 60)}"`).join(', ')} kết thúc bằng "khác" — bỏ chữ "khác" khỏi value (phần còn lại khai bằng mục phanConLai)`, i);
      }
      if (x.fact === 'tenLoai' && !laPhuDinh(x)) {
        const tr = trich.normalize('NFC'); const m = RE_GIOI_TU.exec(tr);
        const sau = m ? giaTri.filter((v) => { const k = v.normalize('NFC').toLowerCase(); const dau = tr.toLowerCase().indexOf(k); return dau > m.index; }) : [];
        if (sau.length) bao('TEN_LOAI_SAU_GIOI_TU', hs6, `tenLoai nhận ${sau.map((v) => `"${cat(v, 50)}"`).join(', ')} — trong câu trich, cụm này đứng SAU "${m[0].trim()}": đó là thứ mà hàng dùng cho, không phải tên hàng. Tên hàng là phần đứng trước; phần sau đưa vào một mục dungCho`, i);
      }
      if (['TEN_LOAI', 'CONG_DUNG'].includes(x.op)) {
        const reChucNang = /(?<![\p{L}])(?:kết\s+hợp\s+)?(?:hai(?:\s+hoặc\s+nhiều)?|nhiều)\s+chức\s+năng\s+\S/iu;
        const reNhomChuong = /(?<![\p{L}])(?:thuộc|của)\s+(?:nhóm|chương)\s+\d[\d.]*(?=\s|$)/giu;
        const reNhuDau = /(?<![\p{L}])như\s+/iu;
        const boViDuCum = (s) => {
          let t = boNgoac(s);
          const cuoi1 = Math.max(t.lastIndexOf(';'), t.lastIndexOf('('), t.lastIndexOf(')'));
          const mCn = reChucNang.exec(t.slice(cuoi1 + 1));
          if (mCn) t = t.slice(0, cuoi1 + 1 + mCn.index);
          const cuoi2 = t.lastIndexOf(';');
          const duoi = t.slice(cuoi2 + 1);
          let cuoiNhom = null;
          for (const m of duoi.matchAll(reNhomChuong)) cuoiNhom = m;
          if (cuoiNhom) {
            const dauDoan = cuoiNhom.index > 0 ? duoi.lastIndexOf('.', cuoiNhom.index - 1) : -1;
            const doan = duoi.slice(dauDoan + 1, cuoiNhom.index);
            const mNhu = reNhuDau.exec(doan);
            if (mNhu) {
              let bd = mNhu.index;
              while (bd > 0 && /\s/.test(doan[bd - 1])) bd -= 1;
              if (bd > 0 && doan[bd - 1] === ',') bd -= 1;
              t = t.slice(0, cuoi2 + 1 + dauDoan + 1 + bd);
            }
          }
          return t;
        };
        const goi = giaTri.filter((v) => { const t = boViDuCum(v); return /;/.test(t) || (/,/.test(t) && /(?<![\p{L}])(?:và|hoặc)(?![\p{L}])/iu.test(t)); });
        if (goi.length) bao('LIET_KE_MOT_CHUOI', hs6, `value ${goi.map((v) => `"${cat(v, 80)}"`).join(', ')} gói một danh sách trong một chuỗi`, i);
      }
      const tapTrich = new Set(khongDau(trich).split(' '));
      const dk = chu(x.dieuKien);
      if (!dk) bao('KHUON_SAI', hs6, 'thiếu dieuKien (điều kiện vào bằng lời ngắn)', i);
      else {
        const ngoai = [...tuNoiDung(dk), ...(khongDau(dk).match(/\b\d+\b/g) || [])].filter((w) => !tapTrich.has(w));
        if (ngoai.length) bao('SUY_RONG', hs6, `dieuKien có từ không nằm trong câu trich: ${[...new Set(ngoai)].join(', ')}`, i);
      }
      // tuKhoa bắt buộc với tên loại / công dụng (cụm lấy từ câu trich); khoá có/không, số, liệt kê thì tuỳ chọn.
      const canTuKhoa = ['TEN_LOAI', 'CONG_DUNG', 'TUONG_TU'].includes(x.op);
      if (x.tuKhoa === undefined && !canTuKhoa) { /* không có từ khoá gợi ý — phân nhóm này không chỉ được bằng từ khoá */ }
      else if (!Array.isArray(x.tuKhoa) || !x.tuKhoa.length || x.tuKhoa.some((k) => typeof k !== 'string' || khongDau(k).length < 2)) bao('KHUON_SAI', hs6, 'thiếu tuKhoa (mảng cụm từ lấy từ câu trich)', i);
      else {
        const vb = khongDau(trich);
        const ngoai = x.tuKhoa.filter((k) => !coCum(vb, k));
        if (ngoai.length) bao('SUY_RONG', hs6, `tuKhoa không có trong câu trich: ${ngoai.map((k) => `"${k}"`).join(', ')}`, i);
        const laTuChung = (k) => (/[^\x00-\x7F]/.test(k)
          ? chuThuong(k).split(/[^\p{L}\p{N}]+/u).filter(Boolean).every((w) => AM_TIET_CHUNG_CO_DAU.has(w))
          : khongDau(k).split(' ').every((w) => AM_TIET_CHUNG.has(w)));
        const chung = x.tuKhoa.filter(laTuChung);
        if (chung.length) bao('TU_KHOA_QUA_CHUNG', hs6, `tuKhoa ${chung.map((k) => `"${k}"`).join(', ')} là chữ chung (hàng nào cũng có thể mang) — bỏ, giữ cụm chỉ riêng phân nhóm này có`, i);
      }
      // Mục khẳng định: cụm / giá trị khớp nằm trong vế loại trừ ("trừ …", "nhưng không …", "không kể …", "không bao gồm …") của câu trich ⇒ đảo ngược vế trừ.
      if (!laPhuDinh(x) && RE_CO_TRU.test(trich.normalize('NFC'))) {
        const vbDu = khongDau(trich); const vbBo = khongDau(boVeTru(trich));
        const trongTru = [...(Array.isArray(x.tuKhoa) ? chuoiCua(x.tuKhoa) : []), ...giaTri].filter((k) => coCum(vbDu, k) && !coCum(vbBo, k));
        if (trongTru.length) bao('TU_KHOA_TRONG_VE_TRU', hs6, `${[...new Set(trongTru)].map((k) => `"${cat(k, 50)}"`).join(', ')} chỉ nằm trong vế loại trừ của câu trich`, i);
        const vtNguoc = laKhoaNguocVeTru(x);
        if (vtNguoc) bao('KHOA_NGUOC_VE_TRU', hs6, `mục khẳng định (${x.fact} ${x.op}) khớp trong vế loại trừ "${cat(vtNguoc, 70)}" của câu trich`, i);
      }
      if (x.dieuKienTru !== undefined) {
        if (laPhuDinh(x)) bao('KHUON_SAI', hs6, 'mục phủ định không được mang dieuKienTru', i);
        else {
          const hopLe = (typeof x.dieuKienTru === 'string' && khongDau(x.dieuKienTru).length >= 2)
            || (Array.isArray(x.dieuKienTru) && x.dieuKienTru.length > 0 && x.dieuKienTru.every((c) => typeof c === 'string' && khongDau(c).length >= 2));
          if (!hopLe) bao('KHUON_SAI', hs6, 'dieuKienTru phải là chuỗi hoặc mảng chuỗi khác rỗng (mỗi cụm ≥ 2 ký tự)', i);
          else {
            const vbDu = khongDau(trich);
            const vesTru = tachVeTru(trich).map((vt) => khongDau(vt));
            for (const c of chuoiCua(x.dieuKienTru)) {
              if (!coCum(vbDu, c)) bao('SUY_RONG', hs6, `dieuKienTru "${cat(c, 50)}" không có trong câu trich`, i);
              else if (!vesTru.some((vt) => coCum(vt, c))) bao('SUY_RONG', hs6, `dieuKienTru "${cat(c, 50)}" không nằm trong vế loại trừ ("trừ / nhưng không bao gồm / không kể …") của câu trich`, i);
            }
          }
        }
      }
      if (x.uuTien !== undefined) {
        const u = x.uuTien || {};
        if (!chu(u.nguon) || !(chu(u.nguon) in src)) bao('NGUON_KHONG_TON_TAI', hs6, `uuTien.nguon "${u.nguon}" không có trong gói soạn`, i);
        else if (!chu(u.trich) || !coTrich(chu(u.nguon), u.trich)) bao('TRICH_KHONG_NGUYEN_VAN', hs6, `uuTien.trich không tìm thấy trong "${u.nguon}": "${cat(u.trich, 140)}"`, i);
        else if (!/ưu tiên|xem xét trước/iu.test(u.trich.normalize('NFC')) || !u.trich.includes(cham6(hs6))) bao('THU_TU_KHONG_CAN_CU', hs6, `uuTien.trich phải là câu luật nói phân nhóm ${cham6(hs6)} được ưu tiên / xem xét trước — không có câu như vậy thì bỏ uuTien`, i);
      }
      // ── hỏi đặc tính, không hỏi mục đích tự nhận (luật 21/11/2026) ──
      const md = mucDichCuaMuc(x);
      if (md && !md.ngoaiLe) bao('CHI_HOI_MUC_DICH', hs6, `điều kiện "${cat(x.dieuKien || chuoiCua(x.value).join(' / '), 90)}" chỉ nêu mục đích / tên gọi${md.mucDich.length ? ` (${md.mucDich.map((m) => `"${m}"`).join(', ')})` : ''}, không có đặc tính kiểm chứng được, và câu trích không định nghĩa phân nhóm bằng công dụng đó — hỏi cấu tạo / kích thước / chất liệu / cơ cấu / thông số có trong chữ luật`, i);
      if (md && md.ngoaiLe) congDungCanKiem.push({ hs6, x, i });
      if (x.kiemChung !== undefined) {
        if (!Array.isArray(x.kiemChung) || !x.kiemChung.length) bao('KHUON_SAI', hs6, 'kiemChung phải là mảng [{hoi, nguon, trich}] không rỗng', i);
        else for (const k of x.kiemChung) {
          const kn = chu(k && k.nguon); const kt = chu(k && k.trich); const kh = chu(k && k.hoi);
          const la = k && typeof k === 'object' ? Object.keys(k).filter((f) => !['hoi', 'nguon', 'trich'].includes(f)) : [];
          if (!kh || !kn || !kt || la.length) { bao('KHUON_SAI', hs6, `kiemChung: mỗi phần tử cần đúng ba trường hoi, nguon, trich${la.length ? ` (trường lạ: ${la.join(', ')})` : ''}`, i); continue; }
          if (!(kn in src)) { bao('NGUON_KHONG_TON_TAI', hs6, `kiemChung.nguon "${kn}" không có trong gói soạn`, i); continue; }
          if (!coTrich(kn, kt)) { bao('TRICH_KHONG_NGUYEN_VAN', hs6, `kiemChung.trich không tìm thấy trong "${kn}": "${cat(kt, 140)}"`, i); continue; }
          const dt = phatHienDacTinh(kh);
          if (!dt.length) { bao('CHI_HOI_MUC_DICH', hs6, `kiemChung.hoi "${cat(kh, 90)}" không hỏi đặc tính kiểm chứng được nào (cấu tạo, kích thước, chất liệu, cơ cấu, thông số)`, i); continue; }
          const vbK = ` ${khongDau(kt)} `;
          const ngoaiK = dt.filter((d) => /^(?:tu|chat|so):/.test(d)).map((d) => d.replace(/^\w+:/, '')).filter((d) => !vbK.includes(` ${khongDau(d)} `));
          if (ngoaiK.length) bao('SUY_RONG', hs6, `kiemChung.hoi hỏi đặc tính không có trong câu trích: ${ngoaiK.map((d) => `"${d}"`).join(', ')}`, i);
        }
      }
    }
    if (x.tienLe !== undefined) {
      if (!Array.isArray(x.tienLe)) bao('KHUON_SAI', hs6, 'tienLe phải là mảng [{so, ma}]', i);
      else for (const t of x.tienLe) {
        const tim = tienLe.find((y) => y.so === chu(t && t.so) && y.ma === so(t && t.ma));
        if (!tim) bao('TIEN_LE_SAI', hs6, `không có thông báo "${t && t.so}" với mã ${t && t.ma} trong data/precedents.json`, i);
        else if (!tim.ma.startsWith(hs6)) bao('TIEN_LE_SAI', hs6, `thông báo ${tim.so} ra mã ${tim.ma}, không thuộc phân nhóm ${hs6}`, i);
      }
    }
  });

  // ── phủ kín + khai dư + vế trừ ──
  for (const p of pn) {
    const muc = cuaPn.get(p.hs6);
    const nhan = `${cham6(p.hs6)} "${p.ten}"`;
    if (!muc) { bao('THIEU_PHAN_NHOM', p.hs6, `chưa có mục nào cho ${nhan}${p.du ? ' — đây là phân nhóm dư: thêm một mục phanConLai: true' : ''}`); continue; }
    const soDu = muc.filter((x) => x.phanConLai === true).length;
    const chuaSo = muc.filter((x) => x.chuaSoHoa !== undefined && x.phanConLai !== true);
    const dieuKien = muc.filter((x) => x.phanConLai !== true && x.chuaSoHoa === undefined);
    const khangDinh = dieuKien.filter((x) => !laPhuDinh(x));
    if (p.kieu === 'DU') {
      if (soDu !== 1) bao('DU_SAI_KHAI', p.hs6, `biểu thuế ghi ${nhan} là phần còn lại — cần đúng một mục phanConLai: true, đang có ${soDu}`);
      // Tầng một gạch bị khuyết dòng trong biểu thuế (nút suy ra, không tên): không có "tieuDe.<tầng>" để trích. Cho phép phần
      // còn lại nhắc điều kiện tầng lấy từ chú giải nhóm, CHỈ KHI mọi phân nhóm anh em có tên trong cùng tầng mang đúng điều kiện đó.
      const anhEm = p.tang !== h4 && !p.tenTang ? pn.filter((q) => q.tang === p.tang && q.hs6 !== p.hs6 && q.kieu !== 'DU') : [];
      const khoaDk = (x) => JSON.stringify([x.fact, x.op, x.value, x.chieu ?? null, chu(x.nguon), S.squash(chu(x.trich))]);
      const laDkTangSuyRa = (x) => chu(x.nguon) === `nhom${h4}.nhom` && anhEm.length > 0
        && anhEm.every((q) => (cuaPn.get(q.hs6) || []).some((y) => y.phanConLai !== true && khoaDk(y) === khoaDk(x)));
      for (const x of [...dieuKien, ...chuaSo]) { if (laDkTangSuyRa(x)) continue; if (!p.tangCoTen || chu(x.nguon) !== `tieuDe.${p.tang}`) bao('DU_MANG_DIEU_KIEN', p.hs6, `${nhan} là phần còn lại${p.tang === h4 ? ' của cả nhóm' : ''} — không mang điều kiện riêng${p.tang === h4 ? '' : ` (chỉ được nhắc lại điều kiện của tầng, trích từ "tieuDe.${p.tang}")`}`, ds.indexOf(x)); }
    } else {
      if (p.kieu === 'CO_TEN' && soDu) bao('DU_SAI_KHAI', p.hs6, `${nhan} có tên riêng — không được khai phanConLai`);
      if (p.kieu === 'DU_CO_PHAM_VI' && soDu !== 1) bao('DU_SAI_KHAI', p.hs6, `${nhan} là phần còn lại CÓ phạm vi — cần điều kiện lấy từ phần nội dung của tên VÀ đúng một mục phanConLai: true, đang có ${soDu}`);
      const cuaMinh = (x) => !p.tangCoTen || chu(x.nguon) !== `tieuDe.${p.tang}`;
      const coDkRieng = dieuKien.some((x) => x.chieu !== 'PHAI_KHONG' && cuaMinh(x) && Boolean(x.fact) && Boolean(chu(x.dieuKien)));
      const coChuaSoRieng = chuaSo.some((x) => cuaMinh(x));
      const tenRong = boMaDau(gotTen(p.ten)).normalize('NFC');
      const rongVe = p.kieu === 'DU_CO_PHAM_VI' && (
        /^từ\s+(?:các\s+)?(?:vật\s+liệu\s+dệt|plastic|nguyên\s+liệu|vật\s+liệu)\s+khác$/iu.test(tenRong)
        || /^lo[aạ]i\s+kh[aá]c\s*,\s*k[eể]\s+c[aả](?![\p{L}])/iu.test(tenRong)
      );
      if (!coDkRieng && !coChuaSoRieng && !(rongVe && soDu === 1)) bao('KHUON_SAI', p.hs6, `${nhan} có nội dung riêng — cần ít nhất một điều kiện của chính phân nhóm${p.tangCoTen ? ` (ngoài mục tầng tieuDe.${p.tang})` : ''} có đủ fact + dieuKien (hoặc một mục chuaSoHoa nếu thiếu khoá)`);
    }
    // Phân nhóm nằm dưới một nhóm một gạch CÓ TÊN ("Rơ le", "Động cơ và mô tơ thủy lực") phải mang điều kiện của tầng đó.
    if (p.tangCoTen && !muc.some((x) => chu(x.nguon) === `tieuDe.${p.tang}` && x.phanConLai !== true)) bao('THIEU_DIEU_KIEN_TANG', p.hs6, `${nhan} nằm dưới tầng ${p.tang} "${p.tenTang}" — thiếu mục điều kiện của tầng, trích từ "tieuDe.${p.tang}"`);
    for (const x of dieuKien) {
      const rong = khoaRongHonLuat(x.fact, x.value, x.trich, { mucCungPn: muc, laPhuDinh: laPhuDinh(x) });
      if (rong) bao('KHOA_RONG_HON_LUAT', p.hs6, `${nhan}: ${rong}`, ds.indexOf(x));
      const hep = khoaHepHonLuat(x.fact, x.value, x.trich, { mucCungPn: muc, laPhuDinh: laPhuDinh(x) });
      if (hep) bao('KHOA_HEP_HON_LUAT', p.hs6, `${nhan}: ${hep}`, ds.indexOf(x));
    }
    {
      const thay = new Map();
      for (const x of khangDinh.filter((y) => ['TEN_LOAI', 'CONG_DUNG'].includes(y.op))) {
        const ky = `${x.fact}|${chu(x.nguon)}|${S.squash(x.trich)}`;
        if (thay.has(ky)) bao('TACH_LIET_KE', p.hs6, `${nhan}: hai mục ${x.fact} cùng trích "${cat(boMaDau(x.trich), 70)}" — gộp value thành một mảng trong MỘT mục`, ds.indexOf(x)); else thay.set(ky, x);
      }
    }
    const mucCoSan = muc.filter((y) => y && y.phanConLai !== true && y.chuaSoHoa === undefined && y.chieu !== 'PHAI_KHONG' && y.fact && !KHOA_NEN.has(y.fact));
    const boQuaKhoaDaCo = (k, tr) => {
      const yDs = mucCoSan.filter((y) => y.fact === k.khoa);
      if (!yDs.length) return false;
      if (k.kieu === 'CO_KHONG' || k.kieu === 'SO') return true;
      if (!_tv) { try { _tv = docJson('tu-vung', 'tu-vung@2.json'); } catch { _tv = { khoa: [] }; } }
      const coVals = new Set(yDs.flatMap((y) => chuoiCua(y.value)));
      const chuSach = boMaDau(boVeTru(tr)).replace(/(?:^|\s)\([^)]*\)/g, ' ');
      const chuDayDu = boMaDau(boVeTru(tr));
      const timG = (chuX) => giaTriCuaKhoa(k).filter((g) => {
        if ((TV.cachDocGiaTri(k, g, _tv).vi || []).some((m) => { try { return new RegExp(`(?<![\\p{L}\\p{N}])(?:${m})(?![\\p{L}\\p{N}])`, 'iu').test(chuX); } catch { return false; } })) return true;
        try { const re = DK.reDungMau(k, g); return Boolean(re && re.test(chuX)); } catch { return false; }
      });
      const gKhop = timG(chuSach);
      const gKhop2 = gKhop.length ? gKhop : timG(chuDayDu);
      return gKhop2.length > 0 && gKhop2.every((g) => coVals.has(g));
    };
    for (const x of chuaSo) {
      const k = khoaPhuHop(h4, x.trich, { boQua: boQuaKhoaDaCo });
      if (k) bao('CHUA_SO_HOA_CO_KHOA', p.hs6, `${nhan}: khai chuaSoHoa cho "${cat(boMaDau(x.trich), 80)}" nhưng khoá "${k}" dùng được — viết mục điều kiện với fact "${k}"`, ds.indexOf(x));
      else canhBao.push({ ma: 'THIEU_KHOA_TU_VUNG', hs6: p.hs6, chiTiet: `${nhan}: ${cat(x.chuaSoHoa, 160)}` });
    }
    // PHỦ VẾ: mọi vế nội dung của tiêu đề (và của tầng có tên) phải có điều kiện / từ khoá mang.
    for (const v of veCanPhu(h4, p)) {
      if (!phuVe(muc, v)) bao('THIEU_VE_GIOI_HAN', p.hs6, `${nhan}: vế ${v.loai === 'DAU' ? 'đầu ngữ' : 'giới hạn'} "${cat(v.chu, 80)}"${v.cuaTang ? ` (của tầng ${p.tang})` : ''} không có điều kiện hay từ khoá nào mang — thêm một mục cho vế này`);
    }
    const veTruCanPhu = [];
    if (p.nguonTen) {
      const tenRieng = String(src[p.nguonTen] || '');
      if (!chuaSo.some((x) => chu(x.nguon) === p.nguonTen)) {
        for (const vt of tachVeTru(tenRieng)) veTruCanPhu.push(vt);
      }
    }
    if (p.tangCoTen) {
      const nguonTang = `tieuDe.${p.tang}`;
      const tenTangGoc = String(src[nguonTang] || '');
      if (!chuaSo.some((x) => chu(x.nguon) === nguonTang)) {
        for (const vt of tachVeTru(tenTangGoc)) veTruCanPhu.push(vt);
      }
    }
    const phuVeTru = (vt) => {
      const kdVt = khongDau(vt);
      const amVt = tuNoiDung(vt);
      return muc.some((x) => {
        if (!x || x.phanConLai === true || x.chuaSoHoa !== undefined || !x.fact) return false;
        if (laPhuDinh(x)) {
          const vals = chuoiCua(x.value);
          if (vals.some((v) => coCum(kdVt, v))) return true;
          const amX = tuNoiDung([chu(x.dieuKien), ...vals].join(' '));
          return amVt.length > 0 && amVt.some((w) => amX.includes(w));
        }
        return chuoiCua(x.dieuKienTru).some((c) => coCum(kdVt, c));
      });
    };
    for (const vt of veTruCanPhu) {
      if (!phuVeTru(vt)) bao('THIEU_VE_TRU', p.hs6, `tiêu đề ${nhan} có vế loại trừ "${cat(vt, 70)}" nhưng chưa có mục chieu: "PHAI_KHONG" hoặc dieuKienTru cho vế đó`);
    }
  }

  // ── ngoại lệ công dụng: phải có câu hỏi đặc tính kiểm chứng (kiemChung của mục, hoặc mục điều kiện đặc tính khác cùng phân nhóm) ──
  for (const { hs6, x } of congDungCanKiem) {
    const coKiemChung = Array.isArray(x.kiemChung) && x.kiemChung.some((k) => k && phatHienDacTinh(k.hoi).length);
    const coMucDacTinh = (cuaPn.get(hs6) || []).some((y) => y !== x && y.fact && !laPhuDinh(y) && y.phanConLai !== true && y.chuaSoHoa === undefined && !mucDichCuaMuc(y)
      && (khoaDacTinh().has(y.fact) || phatHienDacTinh(chu(y.dieuKien)).length));
    if (!coKiemChung && !coMucDacTinh) canhBao.push({ ma: 'CONG_DUNG_THIEU_DAC_TINH_KIEM_CHUNG', hs6, chiTiet: `${cham6(hs6)}: chữ luật định nghĩa bằng công dụng ("${cat(chuoiCua(x.value).join(' / '), 80)}") nhưng chưa có câu hỏi đặc tính kiểm chứng — thêm kiemChung` });
  }

  // ── thứ tự xét: máy xếp; thuTu ghi tay (nếu có) phải khớp ──
  const may = thuTuMay(h4, [...cuaPn].filter(([, muc]) => muc.some((x) => x.uuTien)).map(([hs6]) => hs6));
  const ghiTay = new Map();
  for (const [hs6, muc] of cuaPn) {
    const ts = [...new Set(muc.map((x) => x.thuTu).filter(Number.isInteger))];
    if (ts.length > 1 || (ts.length === 1 && muc.some((x) => !Number.isInteger(x.thuTu)))) bao('THU_TU_SAI', hs6, `các mục của ${hs6} mang thuTu không thống nhất: ${muc.map((x) => x.thuTu ?? '—').join(', ')}`);
    if (ts.length) ghiTay.set(hs6, ts[0]);
  }
  if (ghiTay.size) {
    const trung = new Map();
    for (const [hs6, t] of ghiTay) { if (!trung.has(t)) trung.set(t, []); trung.get(t).push(hs6); }
    for (const [t, dsMa] of trung) if (dsMa.length > 1) bao('THU_TU_SAI', dsMa[0], `thuTu ${t} dùng cho nhiều phân nhóm: ${dsMa.join(', ')} — bỏ hẳn thuTu, máy tự xếp`);
    const duoiTang = (tang) => pn.filter((q) => tang === h4 || q.tang === tang);
    const daBao = new Set();
    for (const p of pn.filter((q) => q.du && ghiTay.has(q.hs6))) {
      const sau = duoiTang(p.tang).filter((q) => !q.du && ghiTay.has(q.hs6) && ghiTay.get(q.hs6) > ghiTay.get(p.hs6));
      if (sau.length) { daBao.add(p.hs6); bao('DU_KHONG_CUOI', p.hs6, `phân nhóm dư ${cham6(p.hs6)} "${p.ten}" (thuTu ${ghiTay.get(p.hs6)}) đứng trước phân nhóm có tên riêng: ${sau.map((q) => `${q.hs6} (thuTu ${ghiTay.get(q.hs6)})`).join(', ')}`); }
    }
    const coTen = pn.filter((q) => !q.du && ghiTay.has(q.hs6));
    for (const p of coTen) {
      const vuot = coTen.filter((q) => q.hs6 < p.hs6 && ghiTay.get(q.hs6) > ghiTay.get(p.hs6));
      if (vuot.length && !(cuaPn.get(p.hs6) || []).some((x) => x.uuTien)) { daBao.add(p.hs6); bao('THU_TU_KHONG_CAN_CU', p.hs6, `${p.hs6} được xét trước ${vuot.map((q) => q.hs6).join(', ')} (mã nhỏ hơn) mà không có uuTien — giữ thứ tự mã, hoặc trích câu luật nói ưu tiên`); }
    }
    if (!daBao.size && trung.size === ghiTay.size) { const lech = [...ghiTay].filter(([hs6, t]) => may.get(hs6) !== t).map(([hs6, t]) => `${hs6}: ghi ${t}, máy xếp ${may.get(hs6)}`); if (lech.length) bao('THU_TU_SAI', lech[0].slice(0, 6), `thuTu ghi tay lệch thứ tự máy xếp — ${lech.join('; ')}`); }
  }
  const dsXep = ghiTay.size === cuaPn.size ? ds : ganThuTu(h4, ds);

  // ── trùng điều kiện ──
  const dauVet = new Map();
  for (const [hs6, muc] of cuaPn) {
    const p = theoMa.get(hs6);
    const ky = muc.map((x) => (x.phanConLai === true ? `DU@${p.tang}` : x.chuaSoHoa !== undefined ? `CHUA@${hs6}` : JSON.stringify([x.fact, x.op, x.chieu || '', [x.value].flat().map((v) => (typeof v === 'string' ? khongDau(v) : v)).sort(), x.donVi || '', chuoiCua(x.dieuKienTru).map((v) => khongDau(v)).sort()]))).sort().join('|');
    if (dauVet.has(ky)) bao('TRUNG_DIEU_KIEN', hs6, `${hs6} và ${dauVet.get(ky)} có bộ điều kiện giống hệt nhau`); else dauVet.set(ky, hs6);
  }

  // ── áp tiêu chí lên chính TIÊU ĐỀ của từng phân nhóm: không được chỉ sang phân nhóm khác ──
  const rutGonTenTang = (p) => {
    if (!p.tangCoTen || !p.tenTang) return p.tenTang;
    const mTangKhac = /^([^;]+?)\s+khác\s*;/iu.exec(p.tenTang);
    if (mTangKhac && p.ten && p.ten.toLowerCase() === mTangKhac[1].trim().toLowerCase()) return `${mTangKhac[1].trim()} khác`;
    const anhEmCoTen = pn.filter((q) => !q.du && q.kieu === 'CO_TEN' && q.tang === p.tang && q.ten);
    if (!anhEmCoTen.length) return p.tenTang;
    const boRacTang = (s) => boThanh(boVeTru(s)).replace(/^(?:cac|nhưng|loai)\s+/iu, '').replace(/\s+khac$/iu, '').trim();
    const tuCua = (s) => boRacTang(s).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 2 && !TU_NOI_VE.has(w));
    const khopNhanh = (nhanh, ten) => {
      const bn = boRacTang(nhanh); const bt = boRacTang(ten);
      if (!bn || !bt) return false;
      if (bn === bt) return true;
      const ts = tuCua(ten);
      if (ts.length < 2) return false;
      const tapN = new Set(tuCua(nhanh));
      return ts.every((w) => tapN.has(w));
    };
    let nhanhDs = String(p.tenTang).split(/\s*;\s*/).map((s) => s.trim()).filter(Boolean);
    if (nhanhDs.length === 1) {
      const tach = nhanhDs[0].split(/\s+(?:hoặc|và)\s+/iu).map((s) => s.trim()).filter(Boolean);
      if (tach.length > 1) nhanhDs = tach;
    }
    if (nhanhDs.length < 2) return p.tenTang;
    if (/;/.test(p.tenTang)) {
      const cuaP = nhanhDs.filter((b) => khopNhanh(b, p.ten));
      if (cuaP.length && cuaP.length < nhanhDs.length) return cuaP.join('; ');
    }
    const giu = nhanhDs.filter((b) => {
      if (khopNhanh(b, p.ten)) return true;
      return !anhEmCoTen.some((q) => q.hs6 !== p.hs6 && khopNhanh(b, q.ten));
    });
    return giu.length && giu.length < nhanhDs.length ? giu.join('; ') : p.tenTang;
  };
  for (const p of pn.filter((q) => !q.du && q.ten && cuaPn.has(q.hs6))) {
    // Cụm đứng sau "trong / dùng cho / lắp vào …" là ĐỐI TƯỢNG, không phải tên của phân nhóm này ("Các đồ vật … mang theo trong túi
    // xách tay" không phải túi xách tay) — bỏ trước khi áp. Với mục bộ phận ("Bộ phận . Của máy đẩy chất lỏng", "Của mô tô"), bỏ vế "Của …" ở đầu mệnh đề.
    const tenTangAp = rutGonTenTang(p);
    const laMucBoPhan = /^của\s/iu.test(p.ten) || /^(?:các\s+)?bộ\s+phận(?:\s+và\s+phụ\s+kiện)?/iu.test(p.tenTang || p.ten);
    let tieuDe = boVeTru(`${p.tangCoTen ? `${tenTangAp} . ` : ''}${p.ten}`).replace(/(?<![\p{L}])(?:trong|dùng cho|dùng trong|sử dụng cho|lắp vào|lắp cho)\s[^,;.]*/giu, ' ');
    if (laMucBoPhan) tieuDe = tieuDe.replace(/(?:^|\.\s*)của\s[^,;.]*/giu, ' ');
    const r = apTieuChi(dsXep, tieuDe);
    if (r.hs6 && r.hs6 !== p.hs6) bao('TIEU_DE_CHI_LAC', r.hs6, `tiêu đề của ${cham6(p.hs6)} ("${cat(tieuDe, 90)}") bị tiêu chí chỉ sang ${r.hs6} vì khớp ${r.cum.map((c) => `"${c}"`).join(' + ')} — tuKhoa đó không riêng của ${r.hs6}`);
  }

  // ── đo trên tờ khai mẫu + thông báo phân loại (chỉ cảnh báo) ──
  const thongKe = { thuTu: Object.fromEntries([...may].sort((a, b) => a[1] - b[1])) };
  if (tuyChon.toKhai !== false) {
    // Thông báo phân loại: chỉ đọc TÊN HÀNG (phần kết luận chép lại tên nhóm / phân nhóm đích nên không dùng để đo).
    const caTk = toKhaiCuaNhom(h4).map((x) => ({ ma: x.ma, moTa: x.moTa, nhan: x.tenHang }));
    const caTb = tienLe.filter((x) => x.loaiNguon === 'TB-TCHQ').map((x) => ({ ma: x.ma, moTa: x.tenHang, nhan: `${x.so}: ${x.tenHang}` }));
    const tk = doTren(dsXep, caTk, { h4 }); const tb = doTren(dsXep, caTb, { h4 });
    thongKe.toKhai = tk; thongKe.thongBao = tb;
    // Chế độ chặt: chỉ khớp khi mô tả có NGUYÊN cụm của điều kiện (`value`) — số "chỉ sai" ở đây là sai của chữ điều kiện, không phải của từ khoá gợi ý.
    const gon = ({ caSai, ...d }) => d;
    thongKe.toKhaiTheoValue = gon(doTren(dsXep, caTk, { h4, che: 'value' })); thongKe.thongBaoTheoValue = gon(doTren(dsXep, caTb, { h4, che: 'value' }));
    const coKetLuan = tk.dung + tk.sai;
    if (tk.sai >= SAI_TOI_THIEU && (tk.sai / tk.tong > NGUONG_LECH || tk.sai / coKetLuan > NGUONG_SAI_TREN_KET_LUAN)) canhBao.push({ ma: 'LECH_TO_KHAI_CAO', chiTiet: `tiêu chí chỉ sai ${tk.sai}/${tk.tong} dòng tờ khai mẫu (${((tk.sai / tk.tong) * 100).toFixed(1)}%); trong ${coKetLuan} dòng có kết luận thì sai ${((tk.sai / coKetLuan) * 100).toFixed(1)}%`, ca: tk.caSai.slice(0, 30) });
  }
  return ket(thongKe);
}

// ───────────────────────────────────────── Gói soạn ─────────────────────────────────────────
/** Các đoạn của một văn bản dài có nhắc tới phân nhóm / nhóm này (kèm đoạn nối tiếp ngay sau đoạn nhắc phân nhóm). */
function doanLienQuan(vanBan, h4, tran) {
  const doan = String(vanBan || '').split(/\n\s*\n/).map((d) => d.trim()).filter(Boolean);
  const rePn = new RegExp(`${h4}\\.\\d\\d(?!\\.\\d)`); const reNhom = new RegExp(`(?<!\\d)${h4.slice(0, 2)}\\.${h4.slice(2)}(?!\\d)`);
  const diem = doan.map((d, i) => (rePn.test(d) || (i > 0 && rePn.test(doan[i - 1]) && /^\(/.test(d)) ? 2 : reNhom.test(d) ? 1 : 0));
  const chon = new Set(); let dai = 0;
  for (const muc of [2, 1]) for (let i = 0; i < doan.length; i += 1) { if (diem[i] !== muc || dai + doan[i].length > tran) continue; chon.add(i); dai += doan[i].length; }
  return [...chon].sort((a, b) => a - b).map((i) => doan[i]);
}
/** Khoá tu-vung gợi ý cho nhóm: bộ khoá nền + khoá mà cách đọc tiếng Việt của nó khớp chữ của một tiêu đề phân nhóm. */
function khoaGoiY(h4) {
  let tv = { khoa: [] };
  try { tv = docJson('tu-vung', 'tu-vung@2.json'); } catch { tv = { khoa: [] }; }
  const chuTen = phanNhomCuaNhom(h4).map((p) => `${p.tenTang || ''} ${p.ten}`).join(' . ').normalize('NFC');
  const NEN = ['tenLoai', 'congDung', 'dungCho', 'laBoPhan', 'chatLieu'];
  const khop = (ds) => (ds || []).some((m) => { try { return new RegExp(`(?<![\\p{L}\\p{N}])(?:${m})(?![\\p{L}\\p{N}])`, 'iu').test(chuTen); } catch { return false; } });
  const ra = [];
  for (const k of tv.khoa || []) {
    const quaGiaTri = giaTriCuaKhoa(k).filter((g) => khop(TV.cachDocGiaTri(k, g, tv).vi));
    if (!NEN.includes(k.khoa) && !khop(k.cachDoc && k.cachDoc.vi) && !quaGiaTri.length) continue;
    ra.push({ khoa: k.khoa, kieu: k.kieu, op: DK.OP_THEO_KIEU[k.kieu] || [], nhan: k.nhanVi, ...(k.giaTriHopLe ? { giaTriHopLe: k.giaTriHopLe } : {}), ...(k.donViChuan ? { donVi: k.donViChuan } : {}) });
  }
  return ra;
}
/** Thông báo phân loại đưa vào gói: tối đa 3 thông báo mỗi phân nhóm (theo mã rồi theo số), chỉ số hiệu + mã + tên hàng rút gọn. */
function thongBaoMau(h4, moiPn = 3) {
  const dem = new Map(); const ra = []; const thay = new Set();
  for (const x of tienLeCuaNhom(h4)) {
    if (x.loaiNguon !== 'TB-TCHQ' || thay.has(`${x.so}|${x.ma}`)) continue;
    const k = x.ma.slice(0, 6); const n = dem.get(k) || 0;
    if (n >= moiPn) continue;
    dem.set(k, n + 1); thay.add(`${x.so}|${x.ma}`);
    ra.push({ so: x.so, ma: x.ma, tenHang: cat(x.tenHang, 160) });
  }
  return ra;
}
/**
 * GÓI SOẠN của một nhóm — tất định (không dấu thời gian): mọi thứ một AI không có bối cảnh cần để soạn tieuChi6.
 * `nguon` = văn bản NGUYÊN VĂN được trích; chú giải chương / phần và chú giải nhóm quá dài chỉ đưa các đoạn liên quan
 * (`_doan: true`) nhưng `nguon` ghi trong đầu ra vẫn là mã nguồn đầy đủ (vd "ch84.chuong") — cổng so với toàn văn.
 */
function goiSoan(h4) {
  const pn = phanNhomCuaNhom(h4);
  const src = nguonChoPhep(h4);
  const nguon = {};
  for (const k of Object.keys(src).sort()) {
    const v = src[k];
    if (/^(ch|phan)\d+\./.test(k)) { const d = doanLienQuan(v, h4, CHU_GIAI_TOI_DA); if (d.length) nguon[k] = { _doan: true, vanBan: d.join('\n\n') }; continue; }
    if (/^nhom\d+\./.test(k) && v.length > NHOM_TOI_DA) { const d = doanLienQuan(v, h4, NHOM_TOI_DA - 4000); nguon[k] = { _doan: true, vanBan: [v.slice(0, 4000), ...d].join('\n\n[…]\n\n') }; continue; }
    nguon[k] = { vanBan: v };
  }
  let tenNhom = '';
  try { tenNhom = gotTen(T.nodeOf(h4).tenVi); } catch { tenNhom = ''; }
  return {
    khuon: KHUON, nhom: h4, tenNhom,
    huongDan: 'docs/giao-viec/do-thi/SOAN-TIEU-CHI-6-SO.md',
    phanNhom: pn.map((p) => ({ hs6: p.hs6, ten: p.ten, ...(p.tangCoTen ? { thuocTang: p.tang, tenTang: p.tenTang } : {}), kieu: p.kieu, nguonTen: p.nguonTen })),
    nguon,
    khoaGoiY: khoaGoiY(h4),
    thongBaoPhanLoai: thongBaoMau(h4),
    toKhaiMau: toKhaiMau(h4),
  };
}

module.exports = { KHUON, MA_LOI, CANH_BAO, NGUONG_LECH, phatHienMucDich, phatHienDacTinh, kiemCauHoiMucDich, mucDichCuaMuc, kieuTieuDe, tachVeTieuDe, tachVeTru, boVeTru, laKhoaNguocVeTru, veCanPhu, phuVe, khoaPhuHop, khoaRongHonLuat, khoaHepHonLuat, thuTuMay, ganThuTu, phanNhomCuaNhom, nguonChoPhep, tienLeCuaNhom, toKhaiCuaNhom, toKhaiMau, apTieuChi, diXuong6, doTren, theoThuTu, kiemTieuChi6, goiSoan };
