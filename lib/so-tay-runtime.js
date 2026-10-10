/**
 * Sổ tay lúc chạy (docs/backlog/08-so-tay-chu-giai.md, bước 3) — CHẾ ĐỘ CỐ VẤN.
 *
 * Đọc data/so-tay/<nhom4>.json (công khai, trong repo → prod có sẵn qua git; KHÔNG cần kho WCO riêng) và đính vào phản hồi:
 *   - canGiaiTrinh : sổ tay của nhóm đã chọn loại trừ ĐÍCH DANH một nhóm khác mà nhóm đó cũng đang là ứng viên
 *                    (kết cục C của backlog: máy NGHI, không kết luận, không đổi mã). Chưa đo tỉ lệ "bật oan" (bước 2 chưa chạy).
 *   - yKienWco     : tóm tắt tự viết các ý kiến phân loại WCO của đúng mã (TT 85/2026 Điều 6.1.b) — không nguyên văn.
 * KHÔNG đổi mã được chọn, KHÔNG đổi prompt LLM, KHÔNG đổi trạng thái. Lỗi bất kỳ → trả null, endpoint chạy như cũ.
 * Tắt khẩn cấp: env HS_SOTAY_RUNTIME=false.
 */
const fs = require('fs');
const { dataReadPath } = require('./data-paths');

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
    if (!s) return { trangThai: 'CHUA_CO_SO_TAY_CHO_NHOM', nhom: h4, cheDo: 'CO_VAN', ghiChu: 'Nhóm này chưa có sổ tay — chưa có gì để đối chiếu thêm.' };
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
      })),
      ...(yk.items.length > MAX_Y_KIEN ? { yKienWcoConLai: yk.items.length - MAX_Y_KIEN } : {}),
      yKienWcoDayDu: yk.dayDu,
      ghiChu: 'Chế độ cố vấn: sổ tay không đổi mã đã chọn. canGiaiTrinh = máy NGHI (chưa kết luận, chưa đo tỉ lệ báo oan). yKienWco = tóm tắt tự viết của ý kiến WCO (không phải nguyên văn), daSoatAnh=false nghĩa là chưa đối chiếu ảnh trang gốc; danh sách có thể chưa đủ.',
    };
  } catch {
    return null;
  }
}

module.exports = { advise, yKienWco, canGiaiTrinh, headingSet, reset, enabled };
