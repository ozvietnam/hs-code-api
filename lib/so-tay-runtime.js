/**
 * Sổ tay lúc chạy (docs/backlog/08-so-tay-chu-giai.md, bước 3) — CHẾ ĐỘ CỐ VẤN.
 *
 * Đọc data/so-tay/<nhom4>.json (công khai, trong repo → prod có sẵn qua git) và đính vào phản hồi:
 *   - canGiaiTrinh : sổ tay của nhóm đã chọn loại trừ ĐÍCH DANH một nhóm khác mà nhóm đó cũng đang là ứng viên
 *                    (kết cục C của backlog: máy NGHI, không kết luận, không đổi mã). Chưa đo tỉ lệ "bật oan" (bước 2 chưa chạy).
 *   - yKienWco     : tóm tắt tự viết các ý kiến phân loại WCO của đúng mã (TT 85/2026 Điều 6.1.b) + đường dẫn xem toàn văn (/api/wco-opinions).
 *   - viTri        : vị trí mã đã chọn trong cây HS theo chữ số (lib/hs-tree.js): đường dẫn, cha thật (có thể là tiêu đề
 *                    bị lược), anh em. (#236, 11/10/2026)
 *   - loaiKhac     : khi mã đã chọn là dòng "Loại khác": phạm vi = tổ tiên có tên TRỪ anh em có tên; mỗi anh em kèm điều
 *                    kiện + trích dẫn từ sổ tay (dong8) nếu có — danh sách người khai phải chứng minh hàng KHÔNG rơi vào.
 * KHÔNG đổi mã được chọn, KHÔNG đổi prompt LLM, KHÔNG đổi trạng thái. Lỗi bất kỳ → trả null, endpoint chạy như cũ.
 * Tắt khẩn cấp: env HS_SOTAY_RUNTIME=false.
 */
const fs = require('fs');
const { dataReadPath } = require('./data-paths');
const T = require('./hs-tree');

const cache = new Map();
const MAX_Y_KIEN = 8;
const MAX_GIAI_TRINH = 5;

function load(h4) {
  if (!/^\d{4}$/.test(h4)) return null;
  if (!cache.has(h4)) {
    let s = null;
    try { s = JSON.parse(fs.readFileSync(dataReadPath('so-tay', `${h4}.json`), 'utf8')); } catch { /* nhóm chưa có sổ tay */ }
    cache.set(h4, s);
  }
  return cache.get(h4);
}
function reset() { cache.clear(); }

const digits = (v) => String(v == null ? '' : v).replace(/\D/g, '');
const enabled = () => process.env.HS_SOTAY_RUNTIME !== 'false';

/** Chuỗi/mảng/đối tượng ứng viên → tập nhóm 4 số. */
function headingSet(list) {
  const out = new Set();
  for (const x of Array.isArray(list) ? list : []) {
    const raw = typeof x === 'object' && x ? (x.code4 || x.hs || x.hsCode || x.heading4 || '') : x;
    const d = digits(raw);
    if (d.length >= 4) out.add(d.slice(0, 4));
  }
  return out;
}

/**
 * Con trỏ + tóm tắt ý kiến WCO của một mã (4/6/8 số) lấy từ sổ tay.
 * 8 số → khớp mã 6 số; 6 số → khớp đúng 6 số; 4 số → mọi ý kiến trong nhóm.
 */
function yKienWco(hs) {
  const h = digits(hs);
  if (h.length < 4) return { coSoTay: false, items: [], dayDu: false };
  const s = load(h.slice(0, 4));
  if (!s) return { coSoTay: false, items: [], dayDu: false };
  const key = h.length >= 6 ? h.slice(0, 6) : h.slice(0, 4);
  const items = (Array.isArray(s.yKienWco) ? s.yKienWco : [])
    .filter((x) => String(x.hs).startsWith(key))
    .sort((a, b) => a.hs.localeCompare(b.hs) || a.thuTuTrongMa - b.thuTuTrongMa);
  return { coSoTay: true, items, dayDu: s.yKienWcoDayDu === true };
}

/** Loại trừ đích danh trong sổ tay của nhóm `top4` mà nhóm đích cũng đang là ứng viên. */
function canGiaiTrinh(top4, others) {
  const s = load(top4);
  if (!s || !Array.isArray(s.loaiTru) || !others.size) return [];
  const out = [];
  for (const it of s.loaiTru) {
    const dest = String(it.sangNhom || '').split(/[|,;\s]+/).map((d) => digits(d).slice(0, 4)).filter((d) => d.length === 4);
    const hit = dest.find((d) => others.has(d) && d !== top4);
    if (!hit) continue;
    out.push({
      sangNhom: hit,
      dieuKien: String(it.dieuKien || '').slice(0, 240),
      nguon: it.nguon || null,
      lyDo: `Sổ tay nhóm ${top4} loại trừ hàng thuộc dạng này sang nhóm ${hit}, mà nhóm ${hit} cũng đang là ứng viên: cần giải trình hồ sơ không rơi vào trường hợp loại trừ.`,
    });
    if (out.length >= MAX_GIAI_TRINH) break;
  }
  return out;
}

const MAX_ANH_EM = 12;

/** Dòng 8 số trong sổ tay (dong8) của một mã, hoặc null. */
function dong8Of(hs) {
  const s = load(String(hs).slice(0, 4));
  return (s && Array.isArray(s.dong8) ? s.dong8 : []).find((d) => digits(d.hs) === hs) || null;
}

/** Vị trí mã đã chọn trong cây theo chữ số (mọi cấp 4–8). Lỗi/không có → null. */
function viTri(hs) {
  const n = T.nodeOf(hs);
  if (!n) return null;
  const cha = n.parent ? T.nodeOf(n.parent) : null;
  return {
    nut: T.labelOf(n),
    duongDan: T.ancestorsOf(n.id).map(T.labelOf),
    cha: cha ? { id: cha.id, ten: T.labelOf(cha), suyRa: Boolean(cha.suyRa) } : null,
    anhEm: T.siblingsOf(n.id).slice(0, MAX_ANH_EM).map((x) => ({ id: x.id, ten: T.labelOf(x), suyRa: Boolean(x.suyRa), ...(x.cap === 8 ? { loaiKhac: Boolean(x.loaiKhac) } : {}) })),
  };
}

/**
 * Khối giải trình cho dòng "Loại khác": tổ tiên có tên trừ anh em có tên; mỗi anh em ghép điều kiện + trích dẫn từ sổ tay
 * (dong8, đã máy kiểm) nếu có. Không phải Loại khác → null. CỐ VẤN: không đổi mã.
 */
function loaiKhac(hs) {
  const lk = T.loaiKhacOf(hs);
  if (!lk) return null;
  const anhEm = T.namedSiblingLeaves(hs).slice(0, MAX_ANH_EM).map((id) => {
    const n = T.nodeOf(id); const d = dong8Of(id);
    return { hs: id, tenVi: n?.tenVi || null, ...(d ? { dieuKien: String(d.dieuKien || '').slice(0, 300), nguon: d.nguon || null, trich: String(d.trich || '').slice(0, 300) } : {}) };
  });
  const toTien = lk.toTienCoTen ? T.nodeOf(lk.toTienCoTen) : null;
  const dSelf = dong8Of(hs);
  return {
    cha: lk.cha,
    chaSuyRa: Boolean(T.nodeOf(lk.cha)?.suyRa),
    toTienCoTen: toTien ? { id: toTien.id, ten: T.labelOf(toTien) } : null,
    dinhNghiaDuoc: lk.dinhNghiaDuoc,
    anhEmCoTen: anhEm,
    ...(dSelf ? { dieuKienSoTay: String(dSelf.dieuKien || '').slice(0, 300), nguon: dSelf.nguon || null } : {}),
    ghiChu: 'Phạm vi dòng "Loại khác" = phạm vi tổ tiên có tên TRỪ các dòng anh em có tên. Để giữ mã này, hồ sơ phải cho thấy hàng KHÔNG rơi vào từng dòng anh em ở trên (điều kiện kèm trích dẫn lấy từ sổ tay khi có; không có thì đối chiếu tên dòng biểu thuế).',
  };
}

/**
 * @param {{topHs: string|null, candidates?: Array<string|object>}} ctx  topHs: mã đã chọn (4–8 số); candidates: các nhóm ứng viên khác
 * @returns {object|null} khối `soTay` để đính vào phản hồi, hoặc null nếu không có gì để nói.
 */
function advise(ctx = {}) {
  try {
    if (!enabled()) return null;
    const hs = digits(ctx.topHs);
    if (hs.length < 4) return null;
    const h4 = hs.slice(0, 4);
    const s = load(h4);
    const vt = viTri(hs); const lkBlock = hs.length === 8 ? loaiKhac(hs) : null;
    if (!s) return { trangThai: 'CHUA_CO_SO_TAY_CHO_NHOM', nhom: h4, cheDo: 'CO_VAN', ...(vt ? { viTri: vt } : {}), ...(lkBlock ? { loaiKhac: lkBlock } : {}), ghiChu: 'Nhóm này chưa có sổ tay — chưa có gì để đối chiếu thêm (vị trí trong cây và phạm vi "Loại khác" vẫn suy từ chữ số của mã).' };
    const others = headingSet(ctx.candidates);
    others.delete(h4);
    const gt = canGiaiTrinh(h4, others);
    const yk = yKienWco(hs);
    return {
      trangThai: 'CO_SO_TAY',
      nhom: h4,
      phienBan: s.phienBan || null,
      cheDo: 'CO_VAN', // không đổi mã đã chọn, không đổi trạng thái; người có chuyên môn quyết
      canGiaiTrinh: gt,
      yKienWco: yk.items.slice(0, MAX_Y_KIEN).map((x) => ({
        hs: x.hs, thuTuTrongMa: x.thuTuTrongMa, namThongQua: x.namThongQua, moTa: x.moTa, doTinCay: x.doTinCay, daSoatAnh: x.daSoatAnh === true,
        nguon: x.nguon,
        xemToanVan: `/api/wco-opinions?hs=${x.hs}&n=${x.thuTuTrongMa}`,
      })),
      ...(yk.items.length > MAX_Y_KIEN ? { yKienWcoConLai: yk.items.length - MAX_Y_KIEN } : {}),
      yKienWcoDayDu: yk.dayDu,
      ...(vt ? { viTri: vt } : {}),
      ...(lkBlock ? { loaiKhac: lkBlock } : {}),
      ghiChu: 'Chế độ cố vấn: sổ tay không đổi mã đã chọn. canGiaiTrinh = máy NGHI (chưa kết luận, chưa đo tỉ lệ báo oan). yKienWco = tóm tắt tự viết của ý kiến WCO (không phải nguyên văn), daSoatAnh=false nghĩa là chưa đối chiếu ảnh trang gốc; danh sách có thể chưa đủ.',
    };
  } catch {
    return null;
  }
}

module.exports = { advise, yKienWco, canGiaiTrinh, headingSet, viTri, loaiKhac, reset, enabled };
