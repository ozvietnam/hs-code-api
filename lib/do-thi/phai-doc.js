// lib/do-thi/phai-doc.js — chạm một nút biểu thuế thì kéo ra những gì LUẬT nối tới nó và phải đọc (ADR-0005 mục 1.2, 1.3).
//
// Chỉ tra cứu: không nhận mô tả hàng, không chọn nhóm, không xếp điểm. Chỉ cạnh lấy từ luật và tài liệu gốc: loại trừ (C5, LOAI_TRU), câu
// hỏi phân biệt (C7), phân biệt theo nghĩa ĐÃ chấm chéo (C16 bậc 1), nhắc nhóm trong chú giải (C17), ý kiến WCO, dòng cùng cấp gạch.
// KHÔNG đọc tờ khai, KHÔNG đọc từ điển cặp dễ nhầm (C8): hai thứ đó không phải luật.
'use strict';

const D = require('./index');
const T = require('../hs-tree');

const LOAI = ['C5', 'LOAI_TRU', 'C7', 'C16', 'C17'];
const TRAN = 60;
const TRAN_TRICH = 600;
const chu = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');
const cat = (s) => (s.length > TRAN_TRICH ? `${s.slice(0, TRAN_TRICH - 1)}…` : s);
const tenNut = (id) => { try { return chu(T.nodeOf(id)?.tenVi) || null; } catch { return null; } };
/** Cùng nhánh: một mã là đầu của mã kia. */
const cungNhanh = (a, b) => a.startsWith(b) || b.startsWith(a);

function gom(ds) {
  const m = new Map();
  for (const x of ds) { const k = `${x.nut}\0${x.trich}`; if (!m.has(k)) m.set(k, x); }
  return [...m.values()].sort((a, b) => (a.nut < b.nut ? -1 : a.nut > b.nut ? 1 : 0));
}
function buoc(ma, vi, ds) {
  const g = gom(ds);
  return { buoc: ma, vi, tong: g.length, muc: g.slice(0, TRAN), ...(g.length > TRAN ? { conLai: g.length - TRAN } : {}) };
}

/**
 * @param {string} ma mã 4 / 6 / 8 số (5, 7 số: nút trung gian)
 * @returns {{ma: string, nhom: string, trinhTu: Array, cungCap: Array, capDuoi: Array, quyTac: string, ghiChu: string}|null}
 */
function phaiDoc(ma) {
  const m = String(ma == null ? '' : ma).replace(/\D/g, '');
  if (m.length < 4 || m.length > 8 || !T.nodeOf(m)) return null;
  const h4 = m.slice(0, 4);
  const canh = D.canhNgangCuaNhom(h4, LOAI, { caVao: true });
  const ra = []; const vao = []; const hoi = []; const nghia = []; const nhac = []; const duocNhac = [];
  for (const e of canh) {
    const tuMinh = e.tu.slice(0, 4) === h4; const minh = tuMinh ? e.tu : e.toi; const kia = tuMinh ? e.toi : e.tu;
    if (!cungNhanh(minh, m)) continue;
    const trich = cat(chu(e.trich)); const nguon = e.nguon || null;
    const chung = { nut: kia, ten: tenNut(kia), trich, nguon };
    if (e.loai === 'C5' || e.loai === 'LOAI_TRU') { if (trich) (tuMinh ? ra : vao).push({ ...chung, ...(chu(e.dieuKien) ? { dieuKien: chu(e.dieuKien) } : {}) }); } else if (e.loai === 'C7') { if (chu(e.hoi) && trich) hoi.push({ ...chung, hoi: chu(e.hoi), neuCo: e.neuCo || null, neuKhong: e.neuKhong || null }); } else if (e.loai === 'C16') {
      if (e.bac !== D.BAC.LUAT) continue; // chưa chấm chéo → chưa phải căn cứ
      const cc = (Array.isArray(e.canCu) ? e.canCu : []).filter((c) => chu(c?.trich));
      if (cc.length) nghia.push({ nut: kia, ten: tenNut(kia), trich: cat(chu(cc[0].trich)), nguon: cc[0].nguon || null, xet: chu(e.dacDiem), neu: chu(e.neu), thi: e.thi, conNeu: chu(e.conNeu), thiKia: e.thiKia });
    } else if (e.loai === 'C17' && trich) (tuMinh ? nhac : duocNhac).push(chung);
  }
  let wco = [];
  try { wco = require('../wco-op').byHs(m.length >= 6 ? m.slice(0, 6) : h4).map((o) => ({ nut: o.hs, ten: tenNut(o.hs), trich: `Ý kiến WCO ${o.hs}/${o.ord}`, nguon: `wco-op/${o.hs}/${o.ord}` })); } catch { wco = []; }
  const dong = (id) => ({ ma: id, ten: tenNut(id) });
  const cha = T.chaTang(m); const chaId = cha && (typeof cha === 'string' ? cha : cha.id);
  const con = (id) => (T.conTang(id) || []).map((x) => (typeof x === 'string' ? x : x.id));
  return {
    ma: m, nhom: h4,
    trinhTu: [
      buoc('LOAI_TRU_RA', 'Chú giải của nhóm này nói hàng nào KHÔNG thuộc nhóm và chuyển đi đâu. Đọc trước khi nhận nhóm.', ra),
      buoc('LOAI_TRU_VAO', 'Chú giải của nhóm khác loại hàng và chuyển SANG nhóm này.', vao),
      buoc('PHAN_BIET', 'Câu hỏi tách nhóm này với nhóm khác, rút từ câu luật.', hoi),
      buoc('PHAN_BIET_NGHIA', 'Đặc điểm tách hai nhóm, đã chấm chéo, kèm căn cứ.', nghia),
      buoc('NHAC_TOI', 'Chú giải nhóm này nhắc tới nhóm khác: phải đọc cả nhóm đó mới hiểu đủ câu.', nhac),
      buoc('DUOC_NHAC', 'Chú giải nhóm khác nhắc tới nhóm này.', duocNhac),
      buoc('WCO', 'Ý kiến phân loại của WCO dưới mã này.', wco),
    ],
    cungCap: chaId ? con(chaId).filter((x) => x !== m).map(dong) : [],
    capDuoi: con(m).map(dong),
    quyTac: m.length === 4
      ? 'Quy tắc 1: tên nhóm và chú giải Phần, Chương quyết định; soát loại trừ trước. Nhận nhóm xong mới xuống cấp dưới.'
      : 'Quy tắc 6: chỉ so các dòng CÙNG CẤP trong cùng nhánh, theo lời văn phân nhóm và chú giải phân nhóm.',
    ghiChu: 'Chỉ gồm luật và tài liệu gốc, trích nguyên văn. Không gồm tờ khai. Chú giải Phần, Chương, nhóm: đọc bằng /api/notes. Danh sách rỗng nghĩa là chưa có cạnh, không có nghĩa là luật không nói.',
  };
}
module.exports = { phaiDoc };
