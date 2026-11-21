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
const { dataReadPath } = require('../data-paths');
const { khongDau, tuKhoa: tuNoiDung } = require('./tu-khoa');
const { hangDu, tapNut } = require('./dung-bang-canh');

// Đầu ngữ chung chung: "<đầu ngữ> khác" là phần còn lại TRẦN (không có phạm vi riêng), như "Loại khác".
const RE_DU_TRAN = /^(?:loại khác|(?:các )?(?:loại|thiết bị|máy|máy móc|sản phẩm|hàng hoá|hàng hóa|mặt hàng|dạng|dụng cụ|đồ dùng|vật phẩm|chế phẩm)(?: (?:và|hoặc) (?:thiết bị|máy|dụng cụ|sản phẩm))? khác)$/u;
/**
 * Kiểu của một tiêu đề phân nhóm: 'DU' = phần còn lại trần ("Loại khác", "Thiết bị khác"); 'DU_CO_PHAM_VI' = kết thúc bằng
 * "… khác" nhưng có nội dung riêng ("Thiết bị bảo vệ mạch điện khác", "Loại khác, dùng cho …", "Tượng nhỏ và các đồ trang trí
 * khác") — máy không tự quyết được, người soạn chọn và người soát xem; 'CO_TEN' = tên riêng.
 */
function kieuTieuDe(ten) {
  const hd = hangDu(ten);
  if (hd !== 1 && hd !== 2) return 'CO_TEN';
  const t = String(ten || '').replace(/^[-\s]+/, '').replace(/\s*[:：]\s*$/, '').replace(/\s*\(SEN\)\s*$/i, '').replace(/\.\s*$/, '').trim().normalize('NFC').toLowerCase();
  return RE_DU_TRAN.test(t) ? 'DU' : 'DU_CO_PHAM_VI';
}

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
  DU_SAI_KHAI: 'Khai phanConLai không khớp biểu thuế: phân nhóm kiểu "DU" ("Loại khác", "Thiết bị khác") phải có đúng một mục phanConLai: true; phân nhóm kiểu "CO_TEN" thì không được có.',
  DU_MANG_DIEU_KIEN: 'Phân nhóm dư kiểu "DU" mang điều kiện khẳng định (chỉ được nhắc lại điều kiện của nhóm một gạch chứa nó), hoặc mục phanConLai mang thêm fact / dieuKien / tuKhoa / uuTien.',
  DU_KHONG_CUOI: 'thuTu ghi tay đặt phân nhóm dư trước một phân nhóm có tên riêng cùng tầng. Bỏ thuTu đi — máy tự xếp.',
  THU_TU_SAI: 'thuTu ghi tay lệch thứ tự máy xếp (theo mã; phân nhóm dư cuối tầng; phân nhóm có uuTien lên đầu). Bỏ thuTu đi — máy tự xếp.',
  THU_TU_KHONG_CAN_CU: 'uuTien không phải câu luật nói phân nhóm này được ưu tiên / xem xét trước; hoặc thuTu ghi tay đẩy một phân nhóm lên trước mà không có uuTien.',
  TRUNG_DIEU_KIEN: 'Hai phân nhóm có bộ điều kiện giống hệt nhau — máy không phân biệt được.',
  SAI_KHOA_THUOC_TINH: 'Dùng tenLoai cho một thuộc tính (chất liệu "Bằng …", trạng thái "Đã / Chưa …", công dụng "Dùng cho …"). tenLoai chỉ nhận TÊN HÀNG. Dùng chatLieu / khoá có–không / dungCho; gói không có khoá hợp thì khai chuaSoHoa.',
  TEN_CO_CHU_KHAC: 'value của tên loại / công dụng kết thúc bằng "khác" — chữ "khác" đánh dấu phần còn lại, không phải tên hàng.',
  TEN_LOAI_SAU_GIOI_TU: 'tenLoai nhận cụm đứng sau "dùng cho / dùng trong / lắp vào" trong câu trich — đó là thứ mà hàng dùng cho (dungCho), không phải tên hàng.',
  TU_KHOA_QUA_CHUNG: 'tuKhoa chỉ gồm chữ chung ("phụ kiện", "thiết bị", "sản phẩm", "đồ dùng") — không nhận ra được phân nhóm nào.',
  LIET_KE_MOT_CHUOI: 'Một value dạng chuỗi gói cả một danh sách ("A, B và C", "A; B"). Tách thành mảng, mỗi phần tử là một tên chép nguyên từ trich.',
  THIEU_DIEU_KIEN_TANG: 'Phân nhóm nằm dưới một nhóm một gạch có tên mà không có mục nào trích tiêu đề của tầng đó (tieuDe.<thuocTang>) — mất điều kiện của tầng.',
  THIEU_VE_TRU: 'Tiêu đề của phân nhóm có vế "trừ …" mà không có mục phủ định (chieu: "PHAI_KHONG") cho vế đó.',
  TU_KHOA_TRONG_VE_TRU: 'tuKhoa / value của một mục khẳng định chỉ xuất hiện trong vế "trừ …" của câu trich — đó là thứ bị LOẠI, không phải dấu hiệu nhận ra phân nhóm.',
  TIEU_DE_CHI_LAC: 'Áp tiêu chí lên chính TIÊU ĐỀ của một phân nhóm thì bị chỉ sang phân nhóm khác: tuKhoa của phân nhóm kia dùng chữ chung của nhiều phân nhóm. Thu hẹp tuKhoa về cụm chỉ riêng phân nhóm đó có.',
  TIEN_LE_SAI: 'tienLe trỏ tới thông báo phân loại không có trong data/precedents.json, hoặc thông báo đó không ra phân nhóm này.',
};
const CANH_BAO = {
  DU_CAN_NGUOI_XEM: 'Tiêu đề kết thúc bằng "… khác" nhưng có nội dung riêng ("Thiết bị bảo vệ mạch điện khác", "Tượng nhỏ và các đồ trang trí khác"): máy không tự quyết được đây là phần còn lại có phạm vi hay một tên riêng. Người soát đọc lại mục này.',
  THIEU_KHOA_TU_VUNG: 'Mục khai chuaSoHoa: chữ luật có tiêu chí nhưng tu-vung@2 chưa có khoá hợp. Phân nhóm này chưa đi được bằng máy; cần bổ sung khoá từ vựng rồi soạn lại.',
  LECH_TO_KHAI_CAO: `Áp tiêu chí bằng luật khớp từ khoá lên tờ khai mẫu của nhóm: chỉ sai phân nhóm đã khai quá ${NGUONG_LECH * 100}% số dòng, hoặc quá ${NGUONG_SAI_TREN_KET_LUAN * 100}% số dòng có kết luận. CHỈ CẢNH BÁO — đọc từng ca: tiêu chí sai thì sửa tiêu chí; tờ khai lệch luật thì giữ tiêu chí.`,
};
const TRUONG = new Set(['hs6', 'thuTu', 'dieuKien', 'fact', 'op', 'value', 'donVi', 'chieu', 'viTri', 'tuKhoa', 'phanConLai', 'chuaSoHoa', 'uuTien', 'tienLe', 'nguon', 'trich', 'nguonLoai']);
// Lời dễ hiểu cho các mã lỗi của lib/dieu-kien-so.js mà người / AI soạn hay gặp.
const GOI_Y_KIEU = [
  [/thieu-don-vi/, 'khoá kiểu SO cần "donVi" — đơn vị chép từ trich (vd "V", "cm", "kg")'],
  [/value-khong-phai-so/, 'khoá kiểu SO cần "value" là SỐ (vd 60), không phải chuỗi'],
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
    const kieu = kieuTieuDe(n.tenVi);
    // tangCoTen: nhóm một gạch chứa nó có nội dung riêng ("Rơ le"); tầng tên "Loại khác" không mang điều kiện nào.
    ra.set(hs6, { hs6, ten: gotTen(n.tenVi), tang, tenTang, tangCoTen: tang !== h4 && Boolean(tenTang) && kieuTieuDe(tenTang) !== 'DU', kieu, du: kieu === 'DU', nguonTen: n.cap === 6 ? `tieuDe.${hs6}` : `tax.${n.id}` });
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
// Cụm đứng ngay sau lời phủ định ("không phải loại truyền động dầu thủy lực hay khí nén") không tính là khớp.
const RE_PHU_DINH_TRUOC = /(?:khong phai|khong thuoc|khong dung|khong la)(?: \S+){0,8} $/;
/** Vị trí các lần `cum` (đã không dấu) xuất hiện nguyên cụm trong văn bản không dấu; bỏ lần đứng sau lời phủ định. */
function coCum(vanBan, cum, { boPhuDinh = false } = {}) {
  const k = khongDau(cum);
  if (k.length < 2) return false;
  const vb = ` ${vanBan} `; const kim = ` ${k} `;
  for (let i = vb.indexOf(kim); i >= 0; i = vb.indexOf(kim, i + 1)) { if (!boPhuDinh || !RE_PHU_DINH_TRUOC.test(vb.slice(Math.max(0, i - 80), i + 1))) return true; }
  return false;
}
const laPhuDinh = (x) => x.chieu === 'PHAI_KHONG' || x.op === 'KHONG';
const RE_CO_TRU = /(?<![\p{L}])trừ\s/iu;
/** Bỏ các vế "trừ …" khỏi một câu: "(trừ gang đúc)", "… trừ tua bin phản lực". */
const boVeTru = (s) => String(s || '').normalize('NFC').replace(/\(\s*trừ[^)]*\)/giu, ' ').replace(/(?<![\p{L}])trừ\s[^;.)]*/giu, ' ');
const boNgoac = (s) => String(s || '').replace(/\([^)]*\)/g, ' ');
// Sau những chữ này là ĐỐI TƯỢNG mà hàng dùng cho (dungCho), không còn là tên hàng.
const RE_GIOI_TU = /(?<![\p{L}])(?:dùng cho|dùng trong|dùng để|dùng làm|sử dụng cho|sử dụng trong|lắp vào|lắp cho|lắp trên)(?![\p{L}])/iu;
// Âm tiết (không dấu) của những chữ chung: một tuKhoa chỉ gồm các âm tiết này thì không nhận ra được phân nhóm nào.
const AM_TIET_CHUNG = new Set(`may bo thiet bi san pham hang hoa do dung vat chat phan phu kien linh chi tiet cum he thong dung cu loai khac
cac nhung va hoac cua cho bang co khong mat`.split(/\s+/).filter(Boolean));
// tenLoai mở đầu bằng những chữ này là THUỘC TÍNH (chất liệu, trạng thái, công dụng, vị trí), không phải tên hàng.
const RE_THUOC_TINH = /^(?:bằng|có|không|chưa|đã|dùng|loại|của|với|trên|dưới|từ|được|để|cho|trong|ngoài)\s/iu;
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
 * không mục phủ định nào khớp. Mục khẳng định không có cụm (vd `laBoPhan` — chữ "bộ phận" trong mô tả thường là "bộ phận của
 * máy khác") ⇒ phân nhóm đó không chỉ được bằng từ khoá. Phân nhóm dư (phanConLai) không bao giờ được chỉ: vắng từ khoá không
 * chứng minh được "không thuộc phân nhóm có tên".
 * @param {{h4?: string, che?: 'tuKhoa'|'value'}} [tuyChon]  h4: bỏ đoạn chép tên nhóm 4 số khỏi mô tả trước khi khớp
 * @returns {{hs6: string|null, cum: string[]}}  hs6 = null ⇒ không kết luận
 */
function apTieuChi(ds, moTa, { h4 = null, che = 'tuKhoa' } = {}) {
  let vb = khongDau(moTa);
  const ten = h4 ? tenNhomKhongDau(h4) : '';
  if (ten.length >= 12) vb = vb.split(ten).join(' ');
  if (!vb.trim()) return { hs6: null, cum: [] };
  for (const { hs6, muc } of theoThuTu(ds)) {
    if (muc.some((x) => x.phanConLai === true || x.chuaSoHoa !== undefined)) continue;
    const kd = muc.filter((x) => x.fact && !laPhuDinh(x)); const pd = muc.filter((x) => x.fact && laPhuDinh(x));
    if (!kd.length) continue;
    const khop = kd.map((x) => cumCua(x, che).find((c) => coCum(vb, c, { boPhuDinh: true })));
    if (khop.some((c) => !c)) continue;
    if (pd.some((x) => cumCua(x, che).some((c) => coCum(vb, c)))) continue;
    return { hs6, cum: khop };
  }
  return { hs6: null, cum: [] };
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
    else if (nguonDat && !coTrich(nguon, trich)) bao('TRICH_KHONG_NGUYEN_VAN', hs6, `không tìm thấy trong "${nguon}": "${cat(trich, 140)}"`, i);

    // ── điều kiện ──
    if (x.phanConLai !== undefined && x.phanConLai !== true) bao('KHUON_SAI', hs6, 'phanConLai chỉ nhận true (phân nhóm có tên riêng thì bỏ hẳn trường này)', i);
    if (x.chuaSoHoa !== undefined && !chuaSo) bao('KHUON_SAI', hs6, 'chuaSoHoa phải là một câu ngắn nói thiếu khoá gì', i);
    if (laDu || chuaSo) {
      const thua = ['fact', 'op', 'value', 'chieu', 'dieuKien', 'tuKhoa', 'uuTien', ...(laDu && chuaSo ? ['chuaSoHoa'] : [])].filter((k) => x[k] !== undefined && x[k] !== null);
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
        const goi = giaTri.filter((v) => { const t = boNgoac(v); return /;/.test(t) || (/,/.test(t) && /(?<![\p{L}])(?:và|hoặc)(?![\p{L}])/iu.test(t)); });
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
        const chung = x.tuKhoa.filter((k) => khongDau(k).split(' ').every((w) => AM_TIET_CHUNG.has(w)));
        if (chung.length) bao('TU_KHOA_QUA_CHUNG', hs6, `tuKhoa ${chung.map((k) => `"${k}"`).join(', ')} là chữ chung (hàng nào cũng có thể mang) — bỏ, giữ cụm chỉ riêng phân nhóm này có`, i);
      }
      // Mục khẳng định: cụm chỉ nằm trong vế "trừ …" của câu trich là thứ bị LOẠI.
      if (!laPhuDinh(x) && RE_CO_TRU.test(trich.normalize('NFC'))) {
        const vbDu = khongDau(trich); const vbBo = khongDau(boVeTru(trich));
        const trongTru = [...(Array.isArray(x.tuKhoa) ? chuoiCua(x.tuKhoa) : []), ...giaTri].filter((k) => coCum(vbDu, k) && !coCum(vbBo, k));
        if (trongTru.length) bao('TU_KHOA_TRONG_VE_TRU', hs6, `${[...new Set(trongTru)].map((k) => `"${cat(k, 50)}"`).join(', ')} chỉ nằm trong vế "trừ …" của câu trich`, i);
      }
      if (x.uuTien !== undefined) {
        const u = x.uuTien || {};
        if (!chu(u.nguon) || !(chu(u.nguon) in src)) bao('NGUON_KHONG_TON_TAI', hs6, `uuTien.nguon "${u.nguon}" không có trong gói soạn`, i);
        else if (!chu(u.trich) || !coTrich(chu(u.nguon), u.trich)) bao('TRICH_KHONG_NGUYEN_VAN', hs6, `uuTien.trich không tìm thấy trong "${u.nguon}": "${cat(u.trich, 140)}"`, i);
        else if (!/ưu tiên|xem xét trước/iu.test(u.trich.normalize('NFC')) || !u.trich.includes(cham6(hs6))) bao('THU_TU_KHONG_CAN_CU', hs6, `uuTien.trich phải là câu luật nói phân nhóm ${cham6(hs6)} được ưu tiên / xem xét trước — không có câu như vậy thì bỏ uuTien`, i);
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
      for (const x of [...dieuKien, ...chuaSo]) { if (!p.tangCoTen || chu(x.nguon) !== `tieuDe.${p.tang}`) bao('DU_MANG_DIEU_KIEN', p.hs6, `${nhan} là phần còn lại${p.tang === h4 ? ' của cả nhóm' : ''} — không mang điều kiện riêng${p.tang === h4 ? '' : ` (chỉ được nhắc lại điều kiện của tầng, trích từ "tieuDe.${p.tang}")`}`, ds.indexOf(x)); }
    } else {
      if (p.kieu === 'CO_TEN' && soDu) bao('DU_SAI_KHAI', p.hs6, `${nhan} có tên riêng — không được khai phanConLai`);
      if (p.kieu === 'DU_CO_PHAM_VI' && soDu > 1) bao('DU_SAI_KHAI', p.hs6, `${nhan}: tối đa một mục phanConLai`);
      if (!khangDinh.length && !chuaSo.length) bao('KHUON_SAI', p.hs6, `${nhan} có nội dung riêng — cần ít nhất một điều kiện khẳng định lấy từ tiêu đề của nó (hoặc một mục chuaSoHoa nếu thiếu khoá)`);
      if (p.kieu === 'DU_CO_PHAM_VI') canhBao.push({ ma: 'DU_CAN_NGUOI_XEM', hs6: p.hs6, chiTiet: `${nhan}: người soạn ${soDu ? 'coi là phần còn lại có phạm vi (có phanConLai)' : 'coi là tên riêng (không phanConLai)'}` });
    }
    // Phân nhóm nằm dưới một nhóm một gạch CÓ TÊN ("Rơ le", "Động cơ và mô tơ thủy lực") phải mang điều kiện của tầng đó.
    if (p.tangCoTen && !muc.some((x) => chu(x.nguon) === `tieuDe.${p.tang}` && x.phanConLai !== true)) bao('THIEU_DIEU_KIEN_TANG', p.hs6, `${nhan} nằm dưới tầng ${p.tang} "${p.tenTang}" — thiếu mục điều kiện của tầng, trích từ "tieuDe.${p.tang}"`);
    for (const x of chuaSo) canhBao.push({ ma: 'THIEU_KHOA_TU_VUNG', hs6: p.hs6, chiTiet: `${nhan}: ${cat(x.chuaSoHoa, 160)}` });
    const tenRieng = p.nguonTen ? String(src[p.nguonTen] || '') : '';
    if (RE_CO_TRU.test(tenRieng.normalize('NFC')) && !muc.some((x) => x.fact && laPhuDinh(x)) && !chuaSo.length) bao('THIEU_VE_TRU', p.hs6, `tiêu đề ${nhan} có vế "trừ …" nhưng chưa có mục chieu: "PHAI_KHONG" cho vế đó`);
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
    const ky = muc.map((x) => (x.phanConLai === true ? `DU@${p.tang}` : x.chuaSoHoa !== undefined ? `CHUA@${hs6}` : JSON.stringify([x.fact, x.op, x.chieu || '', [x.value].flat().map((v) => (typeof v === 'string' ? khongDau(v) : v)).sort(), x.donVi || '']))).sort().join('|');
    if (dauVet.has(ky)) bao('TRUNG_DIEU_KIEN', hs6, `${hs6} và ${dauVet.get(ky)} có bộ điều kiện giống hệt nhau`); else dauVet.set(ky, hs6);
  }

  // ── áp tiêu chí lên chính TIÊU ĐỀ của từng phân nhóm: không được chỉ sang phân nhóm khác ──
  for (const p of pn.filter((q) => !q.du && q.ten && cuaPn.has(q.hs6))) {
    const tieuDe = boVeTru(`${p.tangCoTen ? `${p.tenTang} . ` : ''}${p.ten}`);
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
    const quaGiaTri = Object.entries(k.moTaGiaTri || {}).filter(([, v]) => khop(v && v.cachDoc && v.cachDoc.vi)).map(([g]) => g);
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

module.exports = { KHUON, MA_LOI, CANH_BAO, NGUONG_LECH, kieuTieuDe, thuTuMay, ganThuTu, phanNhomCuaNhom, nguonChoPhep, tienLeCuaNhom, toKhaiCuaNhom, toKhaiMau, apTieuChi, doTren, theoThuTu, kiemTieuChi6, goiSoan };
