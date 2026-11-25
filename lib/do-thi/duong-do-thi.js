// lib/do-thi/duong-do-thi.js — ráp giai đoạn 3–5 của kế hoạch đồ thị (mục 5, bước 3–8) thành MỘT đường, sau HS_TIM_TRUOC=do-thi.
//
//   tìm trước (bước 1) → ba-buoc.js (bước 3–5: AI lượt một, gói phân biệt, AI lượt hai: chọn NHÓM 4 SỐ) → bac-thang.js (bước 6–7:
//   đi từng cấp gạch 4 → 6 → 8, qua cổng ADR-0004) → tu-soat.js + tien-le-ung-ho.js (bước 8, chỉ cảnh báo).
//
// Kết quả chọn nhóm được dựng lại đúng KHUÔN VÒNG 1 (hypotheses / product / verify) để gather(), chốt chặn G1–G8 và khuôn đầu ra phía
// ERP giữ nguyên. Bước nào không đủ căn cứ thì trả r1 = null và động cơ DỪNG HỎI ở bậc 4 (không quay về vòng 1), lý do ở engine.doThi.
'use strict';

const { chayBaBuoc } = require('./ba-buoc');
const luotMot = require('./luot-mot');
const luotHai = require('./luot-hai');
const { goiPhanBiet } = require('./goi-phan-biet');
const { diXuong6 } = require('./tieu-chi-6');
const { tuSoat } = require('./tu-soat');
const { nhomSongSinh } = require('./song-sinh-vat-lieu');

const TRAN_NGUOI = 2; //          số bằng chứng mỗi ứng viên đưa vào lượt một
const TRAN_LUOT_MOT = 2400; //   10 ứng viên kèm tên cần hơn mức 1.300 của 5 ứng viên
const LUI_THIEU = 4; //           số dữ kiện thiếu tối đa chuyển thành câu hỏi
const chu = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');
const so = (v) => String(v == null ? '' : v).replace(/\D/g, '');

let _ten = null;
/** Tên nhóm 4 số theo chú giải nhóm ("" khi không có). */
function tenNhom(h4) {
  if (!_ten) { try { _ten = require('../../data/chu-giai-heading.json'); } catch { _ten = {}; } }
  return chu(_ten[h4]?.ten_nhom).replace(/^\d{2}\.\d{2}\s*[-–.]?\s*/, '');
}

/** Chữ khách nói (không gồm suy đoán của AI): nguồn DUY NHẤT để đọc dữ kiện đi xuống 6 số. */
function moTaKhach(raw) {
  const anh = (Array.isArray(raw?.imageTexts) ? raw.imageTexts : []).map((t) => (typeof t === 'string' ? t : t?.text || ''));
  return [raw?.tenHang, raw?.chatLieu, raw?.congDung, raw?.chucNang, typeof raw?.specs === 'string' ? raw.specs : '', ...anh].map(chu).filter(Boolean).join('. ');
}

function duKienKhach(raw) {
  return [['Chất liệu', raw?.chatLieu], ['Công dụng', raw?.congDung], ['Chức năng', raw?.chucNang], ['Thông số', typeof raw?.specs === 'string' ? raw.specs : '']]
    .map(([n, v]) => (chu(v) ? `${n}: ${chu(v)}` : '')).filter(Boolean);
}

/**
 * Gói cho lượt hai: gói phân biệt + câu TÊN NHÓM nguyên văn của từng nhóm còn sống (GIR 1). Nhờ câu tên nhóm, cặp chưa có cạnh nào
 * vẫn có căn cứ để chọn. Id dài (C17:7616>7318:64413f…) bị mô hình chép sai → đưa id ngắn K1, K2…, trả map về id gốc.
 */
function goiChoLuotHai(dsNhom, tuyChon) {
  const g = goiPhanBiet(dsNhom, tuyChon);
  const ten = g.nhom.map((h) => ({ id: `TEN:${h}`, loai: 'TEN_NHOM', bac: 1, cap: `${h}-${h}`, noiDung: `Tên nhóm ${h.slice(0, 2)}.${h.slice(2)}`, trich: tenNhom(h).slice(0, 300), nguon: `tenNhom.${h}` })).filter((m) => m.trich);
  const goc = [...g.muc, ...ten];
  const muc = goc.map((m, i) => ({ ...m, id: `K${i + 1}` }));
  const vanBan = muc.map((m) => `[${m.id}] (${m.cap}) ${m.noiDung} | "${m.trich}"`).join('\n');
  return { gon: { ...g, muc, vanBan, kyTu: vanBan.length }, goc: { ...g, muc: goc }, maGoc: new Map(muc.map((m, i) => [m.id, goc[i].id])) };
}

/** Bước 6: chỉ nhóm có tieuChi6 khuôn g6@1 (đã qua cổng máy). */
function xuong6(h4, moTa, docSoTay) {
  const s = docSoTay(h4);
  if (!s || s.kiemTra?.tieuChi6?.khuon !== 'g6@1' || !Array.isArray(s.tieuChi6) || !s.tieuChi6.length) {
    return { trangThai: 'CHUA_CO_CANH', chot: null, ungVien: [], thieu: [], loai: [] };
  }
  const r = diXuong6(h4, s.tieuChi6, moTa);
  // "Không khớp chữ" ≠ "trái": chỉ bỏ phân nhóm trái CỨNG (số đo, có/không, cụm bị trừ). Phần còn lại ("loại khác") chỉ được chốt
  // khi MỌI phân nhóm còn lại đều trái cứng; phân nhóm có tên riêng chốt được khi chữ khách khớp tiêu chí của nó. Đo trên 300 ca để
  // riêng (nhóm 4 số đúng sẵn): trước luật này chốt 46 đúng 30, hầu hết ca sai là "loại khác".
  const ct = r.chiTiet || [];
  const loai = ct.filter((q) => q.trangThai === 'TRAI' && q.traiCung).map((q) => q.hs6);
  const thang = r.trangThai === 'DUNG_CHOT' ? ct.find((q) => q.hs6 === r.hs6) : null;
  const chotDuoc = Boolean(thang) && (!thang.phanConLai || ct.every((q) => q.hs6 === r.hs6 || loai.includes(q.hs6)));
  const ungVien = ct.filter((q) => !loai.includes(q.hs6)).map((q) => q.hs6);
  return { trangThai: chotDuoc ? 'CHOT' : 'CAN_HOI', chot: chotDuoc ? r.hs6 : null, ungVien: chotDuoc ? [] : ungVien, thieu: (r.thieuFacts || []).slice(0, LUI_THIEU), loai: loai.map((hs6) => ({ hs6 })), chiTiet: ct };
}

/**
 * Câu hỏi của cạnh (C13): dữ kiện ĐO ĐƯỢC (số, có/không, liệt kê) mà các phân nhóm còn xét cần và chữ khách chưa có. Tên loại /
 * công dụng / chất liệu không hỏi kiểu này: máy đọc chữ chưa khớp không có nghĩa là khách chưa nói.
 */
function cauHoiCuaCanh(x6) {
  if (x6.trangThai !== 'CAN_HOI' || x6.ungVien.length < 2) return [];
  const TV = require('../tu-vung.js');
  const ra = [];
  for (const f of x6.thieu) {
    let k = null; try { k = TV.layKhoa(f); } catch { k = null; }
    if (!k || !['SO', 'CO_KHONG', 'LIET_KE'].includes(k.kieu)) continue;
    let c = ''; try { c = chu(TV.cauHoiCho(f, 'vi')); } catch { c = ''; }
    if (c) ra.push(c);
  }
  return ra.slice(0, 2);
}

/**
 * Bước 3–6.
 * @param {{raw: object, timTruoc: {tomTat: object, muc?: Array}, goiLLM: (ten: string, yeuCau: string) => Promise<any>, docSoTay?: Function}} p
 * @returns {Promise<{r1: object|null, tomTat: object, goi: object|null, luotHai: object|null, xuong6: object|null}>}
 *   r1 = null ⇒ không đủ căn cứ ở bậc 4, động cơ dừng hỏi (loiHaTang = AI lỗi / hết giờ, không phải thiếu căn cứ).
 */
async function chonNhom({ raw, timTruoc, goiLLM, docSoTay = require('../so-tay-gates').loadSoTay }) {
  const moTa = moTaKhach(raw);
  const ds = timTruoc?.mucRong || [];
  const muc = new Map(ds.map((m) => [m.nhom, m]));
  const song = nhomSongSinh(ds.map((m) => m.nhom), raw);
  const ungVien = [...ds.map((m) => m.nhom), ...song.map((x) => x.nhom)].map((h) => ({ nhom: h, ten: tenNhom(h), bangChung: song.find((x) => x.nhom === h) ? `cùng tên hàng, vật liệu ${song.find((x) => x.nhom === h).vatLieu}` : (muc.get(h)?.bangChung || []).slice(0, TRAN_NGUOI).join('; ') }));
  const dong = (trangThai, them = {}) => ({ r1: null, goi: null, luotHai: null, xuong6: null, tomTat: { trangThai, ungVien: ungVien.map((u) => u.nhom), ...(song.length ? { songSinh: song } : {}), ...them } });
  if (!moTa) return dong('BO_QUA_KHONG_CO_MO_TA');
  if (ungVien.length < 2) return dong('BO_QUA_IT_UNG_VIEN');

  let goi = null; let maGoc = new Map();
  const kq = await chayBaBuoc({ moTa, duKien: duKienKhach(raw), ungVien }, {
    goiLLM, luotMot, luotHai, tran1: TRAN_LUOT_MOT,
    goiPhanBiet: (nhomSong, o) => { const x = goiChoLuotHai(nhomSong, o); goi = x.goc; maGoc = x.maGoc; return x.gon; },
  });
  const buoc = kq.buoc.map((b) => ({ ten: b.ten, ok: b.ok, ma: b.ma, lan: b.lan }));
  const chung = { nhomConSong: kq.nhomConSong, goi: kq.goi, buoc };
  if (!kq.nhom || !['CHOT_NHOM', 'CAN_HOI'].includes(kq.trangThai)) return { ...dong(`KHONG_DU_CAN_CU_${kq.trangThai}`, chung), goi, loiHaTang: buoc.some((b) => b.ten === 'luot-hai' && b.ma === 'LOI_LLM') };

  const h4 = kq.nhom;
  const canCu = kq.canCu.map((k) => maGoc.get(k)).filter(Boolean);
  const x6 = xuong6(h4, moTa, docSoTay);
  // Phân nhóm giả thuyết (chỉ để gather() gom hồ sơ, KHÔNG phải đáp án — đáp án do bac-thang.js): cạnh chốt được thì lấy cạnh; chưa chốt
  // thì lấy phân nhóm mà bằng chứng tìm trước trỏ tới, MIỄN LÀ cạnh chưa loại nó.
  const conXet = x6.trangThai === 'CAN_HOI' ? new Set(x6.ungVien) : null;
  const goiY = (muc.get(h4)?.pn6 || []).map((p) => so(p).slice(0, 6)).find((p) => p.length === 6 && (!conXet || conXet.has(p))) || '';
  const hs6 = x6.chot || goiY;
  const daChot = kq.trangThai === 'CHOT_NHOM' && x6.trangThai === 'CHOT';
  const r1 = {
    product: {
      nameVi: chu(raw?.tenHang), purpose: chu(raw?.congDung), material: chu(raw?.chatLieu), mechanism: '', form: null, evidence: {},
      keySpecs: kq.duKien.map((d) => d.trichKhach).slice(0, 8),
    },
    hypotheses: [
      { chapter: h4.slice(0, 2), heading4: h4, subheading6: hs6, why: chu(kq.lyDo).slice(0, 300), confidence: daChot ? 85 : 70 },
      ...kq.nhomConSong.filter((h) => h !== h4).map((h) => ({ chapter: h.slice(0, 2), heading4: h, subheading6: so((muc.get(h)?.pn6 || [])[0]).slice(0, 6), why: 'nhóm còn sống sau lượt một', confidence: 35 })),
    ],
    verify: { searchVi: [chu(raw?.tenHang)].filter(Boolean), codes8: [], unknowns: [...new Set([...cauHoiCuaCanh(x6), ...kq.thieu.map(chu).filter(Boolean)])].slice(0, LUI_THIEU) },
  };
  return {
    r1, goi, luotHai: { ok: true, nhom: h4, canCu, thieu: kq.thieu, lyDo: kq.lyDo }, xuong6: x6,
    tomTat: { trangThai: kq.trangThai, ungVien: ungVien.map((u) => u.nhom), ...(song.length ? { songSinh: song } : {}), ...chung, nhom: h4, canCu, soThieu: kq.thieu.length, xuong6: { trangThai: x6.trangThai, chot: x6.chot, ungVien: x6.ungVien, thieu: x6.thieu } },
  };
}

/** Bước 8: độ tin, cờ, hồ sơ căn cứ. Không đổi mã. `tienLe` là kết quả tienLeUngHo (hoặc null khi lỗi). */
function soat({ kq, ma, tienLe }) {
  return tuSoat({ ma, goi: kq.goi, luotHai: kq.luotHai, xuong6: kq.xuong6, tienLe: tienLe && tienLe.trangThai === 'DA_KIEM' ? tienLe : null });
}

module.exports = { goiChoLuotHai, cauHoiCuaCanh, chonNhom, soat, xuong6, moTaKhach, tenNhom };
