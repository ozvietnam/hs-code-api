// lib/do-thi/tien-le-ung-ho.js — C14 Tiền-lệ-ủng-hộ (ADR-0002, kế hoạch mục 4.4 và 4.5).
//
// KHÔNG dựng cạnh tĩnh: tiền lệ phụ thuộc mô tả hàng, nên đây là một HÀM tất định (không LLM) dùng lại hai máy tìm sẵn
// có — tờ khai mẫu OZ (lib/oz-precedent-search.js searchOzByKeyword) và thông báo phân loại (lib/precedent-search.js
// searchPrecedents) — cùng ngưỡng với động cơ (lib/chot-som-co-kiem.js tienLeOzDanDau: khớp ≥ 75, ≥ 3 tờ khai, ≥ 60%).
//
// Thứ bậc (mục 4.5): tờ khai OZ là bậc 3. Tiền lệ OZ ủng hộ một mã mà bị cạnh bậc 1 (loại trừ có trích, điều kiện khớp
// mô tả) hoặc thông báo phân loại bậc 2 trỏ sang NHÓM KHÁC phản đối thì `biPhanDoi` khác rỗng: "khai sai lặp lại 10 lần
// vẫn là sai". Chỉ nhận mã còn trong biểu thuế hiện hành; mã không còn đếm vào `maKhongConTrongBieu`, không dùng để ủng hộ.
//
// GIAI ĐOẠN 1: chỉ là hàm. CHƯA nhánh dừng sớm nào của động cơ gọi (data/luat/dau-noi.json mục nhanhBoQua ghi cả bốn
// nhánh sẽ dùng phép kiểm này ở giai đoạn sau). Không trả tên hàng / câu khai của tờ khai OZ — chỉ số đếm và mã.
'use strict';

const { searchOzByKeyword } = require('../oz-precedent-search');
const { searchPrecedents, NGUONG_KHOP_TIEN_LE } = require('../precedent-search');
const { tienLeOzDanDau } = require('../chot-som-co-kiem');
const { chuanNut, coNut, canhNgangCuaNhom, BAC } = require('./index');
const { khopDieuKien, tapTuMoTa } = require('./tu-khoa');

const OZ_KHOP_TOI_THIEU = 75; // cùng ngưỡng với lib/chot-som-co-kiem.js (hằng ở đó không xuất ra)
const PHAN_DOI_SO_KHOP = 2;
const PHAN_DOI_TY_LE = 0.6;
const so = (v) => String(v == null ? '' : v).replace(/\D/g, '');

/**
 * Tiền lệ có ủng hộ mã `ma` cho mô tả `moTa` không.
 * @param {string} moTa  mô tả hàng
 * @param {string} ma    mã vừa chốt (4, 6 hoặc 8 số)
 * @param {{gioiHanOz?: number, topKThongBao?: number}} [tuyChon]
 * @returns {Promise<{trangThai: 'DA_KIEM'|'CHUA_KIEM', lyDo?: string, ma: string|null, nhom: string|null, soTienLe: number,
 *   cungMa: number, cungNhom: number, nhomKhac: Array<{nhom: string, soTienLe: number, toKhaiOz: number, thongBao: number}>,
 *   ozDanDau: null|{nhom: string, soToKhai: number}, ungHo: boolean|null, biPhanDoi: Array<{bac: number, loai: string, id: string, nhom: string}>,
 *   maKhongConTrongBieu: number}>}
 *   `trangThai: 'CHUA_KIEM'` (đầu vào thiếu / mã không còn trong biểu) KHÁC `DA_KIEM` với `soTienLe: 0` (đã tìm, không có) — L6.
 */
async function tienLeUngHo(moTa, ma, { gioiHanOz = 10, topKThongBao = 5 } = {}) {
  const rong = (lyDo) => ({ trangThai: 'CHUA_KIEM', lyDo, ma: null, nhom: null, soTienLe: 0, cungMa: 0, cungNhom: 0, nhomKhac: [], ozDanDau: null, ungHo: null, biPhanDoi: [], maKhongConTrongBieu: 0 });
  const cau = String(moTa || '').trim();
  if (cau.length < 3) return rong('mo-ta-qua-ngan');
  const nut = chuanNut(ma);
  if (!nut) return rong('ma-khong-con-trong-bieu');
  const nhom = nut.slice(0, 4);

  let maKhongCon = 0;
  const tienLe = []; // { hs, nguon: 'oz'|'tb', id? }
  const ozChoDanDau = [];
  let oz = { items: [] };
  try { oz = await searchOzByKeyword(cau, { limit: gioiHanOz }); } catch { oz = { items: [] }; }
  for (const it of oz.items || []) {
    const hs = so(it.hsCode);
    if ((it.matchCoverage || 0) < OZ_KHOP_TOI_THIEU) continue;
    if (!coNut(hs.slice(0, 8)) || hs.length < 8) { maKhongCon += 1; continue; }
    tienLe.push({ hs, nguon: 'oz' });
    ozChoDanDau.push({ hs, cov: it.matchCoverage, oz: it.ozCount || 1 });
  }
  let tb = [];
  try { tb = searchPrecedents(cau, { topK: topKThongBao, minSimilarity: NGUONG_KHOP_TIEN_LE, maHs: nut }) || []; } catch { tb = []; }
  const thongBao = [];
  for (const r of tb) {
    if ((r.similarity || 0) < NGUONG_KHOP_TIEN_LE || (r.precedent && r.precedent.source) !== 'TB-TCHQ') continue;
    const hs = so(r.finalHsCode);
    if (!chuanNut(hs)) { maKhongCon += 1; continue; }
    tienLe.push({ hs, nguon: 'tb' });
    thongBao.push({ hs, id: String(r.precedent.tbTchqNumber || r.precedent.precedentId || '') });
  }

  const khac = new Map();
  let cungMa = 0; let cungNhom = 0;
  for (const t of tienLe) {
    if (t.hs.startsWith(nut)) cungMa += 1;
    if (t.hs.startsWith(nhom)) { cungNhom += 1; continue; }
    const h = t.hs.slice(0, 4);
    if (!khac.has(h)) khac.set(h, { nhom: h, soTienLe: 0, toKhaiOz: 0, thongBao: 0 });
    const x = khac.get(h); x.soTienLe += 1; if (t.nguon === 'oz') x.toKhaiOz += 1; else x.thongBao += 1;
  }
  const nhomKhac = [...khac.values()].sort((a, b) => b.soTienLe - a.soTienLe || (a.nhom < b.nhom ? -1 : 1));

  // Phản đối từ bậc cao hơn tờ khai: (1) cạnh loại trừ có trích mà điều kiện khớp mô tả, trỏ từ nhóm của mã sang nhóm khác;
  // (2) thông báo phân loại đủ giống mà ra nhóm khác.
  const biPhanDoi = [];
  // Chỉ C5 đi RA từ nhóm của mã (sổ tay của chính nhóm đó nói "hàng như thế này sang nhóm kia"); C6 đi ra từ nhóm này là
  // sổ tay nhóm khác đẩy hàng VỀ đây — đó là ủng hộ, không phải phản đối. Ngưỡng chặt hơn bước mở rộng ứng viên: phần lớn
  // từ khoá của điều kiện phải có trong mô tả (≥ 2 từ và ≥ 60%), vì phản đối oan làm mất nhánh dừng sớm đúng.
  const tuMoTa = tapTuMoTa(cau);
  for (const e of canhNgangCuaNhom(nhom, 'C5')) {
    const k = khopDieuKien(e.tuKhoaDieuKien, tuMoTa);
    if (k && k.soKhop >= PHAN_DOI_SO_KHOP && k.tyLe >= PHAN_DOI_TY_LE) biPhanDoi.push({ bac: e.bac, loai: e.loai, id: e.id, nhom: e.toi.slice(0, 4) });
  }
  for (const t of thongBao) if (!t.hs.startsWith(nhom)) biPhanDoi.push({ bac: BAC.THONG_BAO, loai: 'C3', id: t.id, nhom: t.hs.slice(0, 4) });
  biPhanDoi.sort((a, b) => a.bac - b.bac || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const ozDanDau = tienLeOzDanDau(ozChoDanDau);
  return {
    trangThai: 'DA_KIEM', ma: nut, nhom, soTienLe: tienLe.length, cungMa, cungNhom, nhomKhac, ozDanDau,
    ungHo: tienLe.length ? cungNhom > 0 && cungNhom >= tienLe.length - cungNhom : null,
    biPhanDoi, maKhongConTrongBieu: maKhongCon,
  };
}

module.exports = { tienLeUngHo, OZ_KHOP_TOI_THIEU };
