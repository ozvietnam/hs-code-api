// lib/do-thi/duong-do-thi.js — ráp giai đoạn 3–5 của kế hoạch đồ thị (mục 5, bước 3–8) thành MỘT đường, sau HS_TIM_TRUOC=do-thi.
//
//   tìm trước (bước 1) → ba-buoc.js (bước 3–5: AI lượt một, gói phân biệt, AI lượt hai) → tieu-chi-6.js diXuong6 (bước 6: đi cạnh
//   C10 bằng dữ kiện đọc được từ chữ khách) → chotDong8 của sổ tay (bước 7) → tu-soat.js + tien-le-ung-ho.js (bước 8).
//
// Kết quả của bước 3–6 được dựng lại đúng KHUÔN VÒNG 1 (hypotheses / product / verify) nên gather(), chốt chặn G1–G8, vòng 2, câu
// hỏi theo sổ và khuôn đầu ra phía ERP giữ nguyên. Module không tự chốt mã (L3): bước nào không đủ căn cứ thì trả null và động cơ
// đi đường cũ (vòng 1), có ghi lý do ở engine.doThi (L11).
'use strict';

const { chayBaBuoc } = require('./ba-buoc');
const luotMot = require('./luot-mot');
const luotHai = require('./luot-hai');
const { goiPhanBiet } = require('./goi-phan-biet');
const { diXuong6 } = require('./tieu-chi-6');
const { tuSoat } = require('./tu-soat');

const TRAN_NGUOI = 2; //          số bằng chứng mỗi ứng viên đưa vào lượt một
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

/** Bước 6: chỉ nhóm có tieuChi6 khuôn g6@1 (đã qua cổng máy). */
function xuong6(h4, moTa, docSoTay) {
  const s = docSoTay(h4);
  if (!s || s.kiemTra?.tieuChi6?.khuon !== 'g6@1' || !Array.isArray(s.tieuChi6) || !s.tieuChi6.length) {
    return { trangThai: 'CHUA_CO_CANH', chot: null, ungVien: [], thieu: [], loai: [] };
  }
  const r = diXuong6(h4, s.tieuChi6, moTa);
  return {
    trangThai: r.trangThai === 'DUNG_CHOT' ? 'CHOT' : 'CAN_HOI', chot: r.hs6 || null, ungVien: r.ungVien || [],
    thieu: (r.thieuFacts || []).slice(0, LUI_THIEU), loai: (r.chiTiet || []).filter((q) => q.trangThai === 'TRAI').map((q) => ({ hs6: q.hs6 })),
  };
}

/**
 * Bước 3–6.
 * @param {{raw: object, timTruoc: {tomTat: object, muc?: Array}, goiLLM: (ten: string, yeuCau: string) => Promise<any>, docSoTay?: Function}} p
 * @returns {Promise<{r1: object|null, tomTat: object, goi: object|null, luotHai: object|null, xuong6: object|null}>}
 *   r1 = null ⇒ không đủ căn cứ, động cơ chạy vòng 1 như cũ.
 */
async function chonNhom({ raw, timTruoc, goiLLM, docSoTay = require('../so-tay-gates').loadSoTay }) {
  const moTa = moTaKhach(raw);
  const muc = new Map((timTruoc?.muc || []).map((m) => [m.nhom, m]));
  const ungVien = (timTruoc?.tomTat?.nhom || []).map((h) => ({ nhom: h, ten: tenNhom(h), bangChung: (muc.get(h)?.bangChung || []).slice(0, TRAN_NGUOI).join('; ') }));
  const dong = (trangThai, them = {}) => ({ r1: null, goi: null, luotHai: null, xuong6: null, tomTat: { trangThai, ungVien: ungVien.map((u) => u.nhom), ...them } });
  if (!moTa) return dong('BO_QUA_KHONG_CO_MO_TA');
  if (ungVien.length < 2) return dong('BO_QUA_IT_UNG_VIEN');

  let goi = null;
  const kq = await chayBaBuoc({ moTa, duKien: duKienKhach(raw), ungVien }, {
    goiLLM, luotMot, luotHai, goiPhanBiet: (ds, o) => { goi = goiPhanBiet(ds, o); return goi; },
  });
  const buoc = kq.buoc.map((b) => ({ ten: b.ten, ok: b.ok, ma: b.ma, lan: b.lan }));
  const chung = { nhomConSong: kq.nhomConSong, goi: kq.goi, buoc };
  if (!kq.nhom || !['CHOT_NHOM', 'CAN_HOI'].includes(kq.trangThai)) return { ...dong(`VE_DUONG_CU_${kq.trangThai}`, chung), goi };

  const h4 = kq.nhom;
  const x6 = xuong6(h4, moTa, docSoTay);
  // Phân nhóm giả thuyết: cạnh chốt được thì lấy cạnh; chưa chốt thì lấy phân nhóm mà bằng chứng tìm trước trỏ tới, MIỄN LÀ cạnh
  // chưa loại nó. Không có → để trống, vòng 2 quyết.
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
    verify: { searchVi: [chu(raw?.tenHang)].filter(Boolean), codes8: [], unknowns: kq.thieu.map(chu).filter(Boolean).slice(0, LUI_THIEU) },
  };
  return {
    r1, goi, luotHai: { ok: true, nhom: h4, canCu: kq.canCu, thieu: kq.thieu, lyDo: kq.lyDo }, xuong6: x6,
    tomTat: { trangThai: kq.trangThai, ungVien: ungVien.map((u) => u.nhom), ...chung, nhom: h4, canCu: kq.canCu, soThieu: kq.thieu.length, xuong6: { trangThai: x6.trangThai, chot: x6.chot, ungVien: x6.ungVien, thieu: x6.thieu } },
  };
}

/**
 * Bước 7: đáp án 8 số TẤT ĐỊNH để bỏ lời AI vòng 2 — chỉ khi nhóm và phân nhóm đều chốt bằng cạnh, và dòng 8 số là dòng duy nhất
 * của phân nhóm hoặc được chotDong8 (điều kiện sổ tay) chốt. Trả null ⇒ vòng 2 như cũ. Bên gọi PHẢI cho đáp án qua đủ chốt chặn.
 */
function dapAn8({ kq, productText, chotDong8, dong8DuyNhat }) {
  if (!kq?.luotHai || kq.luotHai.thieu.length || kq.xuong6?.trangThai !== 'CHOT') return null;
  const hs6 = kq.xuong6.chot;
  let hs = dong8DuyNhat(hs6); let nguon = 'dong-duy-nhat';
  if (!hs) {
    const cd = chotDong8({ hs: hs6, productText });
    if (cd?.checked && cd.ketQua === 'CHOT' && /^\d{8}$/.test(so(cd.hs))) { hs = so(cd.hs); nguon = 'chot-dong-so-tay'; }
  }
  if (!hs) return null;
  const mucTheoId = new Map((kq.goi?.muc || []).map((m) => [m.id, m]));
  const trich = kq.luotHai.canCu.map((id) => mucTheoId.get(id)).filter(Boolean);
  return {
    decision: 'CHOT', hs, confidence: 85,
    reason: chu(kq.luotHai.lyDo).slice(0, 300) || `Chọn nhóm ${hs.slice(0, 4)} theo cạnh phân biệt`,
    basis: trich.slice(0, 3).map((m) => ({ stream: 'SUY_LUAN', claim: chu(m.noiDung).slice(0, 200), evidence: chu(m.trich).slice(0, 200), ref: m.nguon })),
    conditions: [], alternatives: [], questions: [], _doThi: { nguon },
  };
}

/** Bước 8: độ tin, cờ, hồ sơ căn cứ. Không đổi mã. `tienLe` là kết quả tienLeUngHo (hoặc null khi lỗi). */
function soat({ kq, ma, tienLe }) {
  return tuSoat({ ma, goi: kq.goi, luotHai: kq.luotHai, xuong6: kq.xuong6, tienLe: tienLe && tienLe.trangThai === 'DA_KIEM' ? tienLe : null });
}

module.exports = { chonNhom, dapAn8, soat, xuong6, moTaKhach, tenNhom };
