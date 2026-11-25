// lib/do-thi/song-sinh-vat-lieu.js — bước 2 (mở rộng ứng viên): CÙNG MỘT VẬT, KHÁC VẬT LIỆU nằm ở nhóm khác nhau của biểu thuế
// (bu lông thép 73.18 · bu lông nhôm 76.16 · bu lông đồng 74.15). Tìm theo chữ kéo về nhóm có nhiều tiền lệ nhất (thép), nhóm đúng
// vật liệu bị đẩy xuống. Luật tất định, không AI, không bảng tay:
//   (1) vật liệu CHÍNH đọc từ chữ khách bằng khoá chatLieu của tu-vung;
//   (2) chương của vật liệu đó đọc từ TÊN CHƯƠNG trong chú giải ("… và các sản phẩm bằng nhôm");
//   (3) trong chương đó, nhóm nào có dòng biểu thuế / tên nhóm nêu ĐÚNG tên hàng (so nguyên cụm, bỏ dấu cách: "bulông" = "bu lông").
// Chỉ THÊM ứng viên (tối đa TRAN), không bỏ, không đổi thứ tự nhóm đã có, không chọn mã (L3).
'use strict';

const TRAN = 2;
const gon = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
const TV = () => require('../tu-vung.js');

let _chuong = null;
/** Map vật liệu → [chương], chỉ từ tên chương dạng "… bằng <vật liệu>" hoặc "<vật liệu> và các sản phẩm …". */
function chuongTheoVatLieu() {
  if (_chuong) return _chuong;
  _chuong = new Map();
  let cg = {};
  try { cg = require('../../data/chu-giai-chuong.json'); } catch { cg = {}; }
  for (const [ma, x] of Object.entries(cg)) {
    if (!/^\d{2}$/.test(ma)) continue;
    const ten = String(x?.chuong || '').split('\n')[0].replace(/^Chương\s+\d+\s*[:.]?\s*/i, '').trim();
    // Tên chương nói thẳng vật liệu; bỏ chương "kim loại quý / kim loại cơ bản khác" (tên gọi chung, không chỉ một vật liệu).
    if (!/(?:sản phẩm|mặt hàng|vật phẩm|^đồ\s+gốm)/iu.test(ten) || /kim loại/iu.test(ten)) continue;
    let r = null;
    try { r = TV().docGiaTri('chatLieu', ten); } catch { r = null; }
    for (const g of Array.isArray(r?.giaTri) ? r.giaTri : []) {
      if (!_chuong.has(g.chatLieu)) _chuong.set(g.chatLieu, []);
      if (!_chuong.get(g.chatLieu).includes(ma)) _chuong.get(g.chatLieu).push(ma);
    }
  }
  return _chuong;
}

let _dong = null;
/** Chữ biểu thuế theo chương: { chương: [{h4, chu}] } (dòng 8 số) + tên nhóm. */
function dongTheoChuong() {
  if (_dong) return _dong;
  _dong = new Map();
  const day = (c, o) => { if (!_dong.has(c)) _dong.set(c, []); _dong.get(c).push(o); };
  for (const it of require('../../data/search.json')) day(String(it.hs).slice(0, 2), { h4: String(it.hs).slice(0, 4), chu: gon(it.vn), ten: false });
  let ten = {};
  try { ten = require('../../data/chu-giai-heading.json'); } catch { ten = {}; }
  for (const [h, x] of Object.entries(ten)) if (/^\d{4}$/.test(h) && x?.ten_nhom) day(h.slice(0, 2), { h4: h, chu: gon(x.ten_nhom), ten: true });
  return _dong;
}

/** Tên hàng (cụm đầu, trước vật liệu / con số / vế công dụng). "" khi quá ngắn để khớp an toàn. */
function tenVat(tenHang, vatLieuChu) {
  const bo = new Set(vatLieuChu.flatMap((v) => String(v).toLowerCase().split(/\s+/)));
  const ra = [];
  for (const w of String(tenHang || '').normalize('NFC').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean)) {
    if (/\d/.test(w) || bo.has(w) || /^(?:bằng|dùng|cho|của|loại|với|có|không|màu|size|hiệu|nhãn|mới)$/.test(w)) break;
    ra.push(w);
    if (ra.length === 4) break;
  }
  return ra;
}

/**
 * @param {string[]} nhom  ứng viên hiện có
 * @param {{tenHang?: string, chatLieu?: string}} raw  chữ khách khai
 * @returns {Array<{nhom: string, vatLieu: string, cum: string}>}
 */
function nhomSongSinh(nhom, raw, { toiDa = TRAN } = {}) {
  const co = new Set(nhom || []);
  let r = null;
  try { r = TV().docGiaTri('chatLieu', [raw?.tenHang, raw?.chatLieu].filter(Boolean).join('. ')); } catch { r = null; }
  const ct = (r?.chiTiet || []).filter((x) => (x.viTri || 'CHINH') === 'CHINH');
  if (r?.trangThai !== 'DA_CO' || !ct.length) return [];
  const tu = tenVat(raw?.tenHang, ct.map((x) => x.bangChung || x.chatLieu));
  const ra = [];
  for (const { chatLieu } of ct) {
    const dsChuong = chuongTheoVatLieu().get(chatLieu) || [];
    if (!dsChuong.length || [...co].some((h) => dsChuong.includes(h.slice(0, 2)) && laNhomCoTen(h, tu))) continue;
    // Cụm dài trước: "bu lông lục giác" rồi "bu lông". Cụm một tiếng chỉ nhận khi ≥ 4 chữ cái.
    for (let n = tu.length; n >= 1; n -= 1) {
      const cum = gon(tu.slice(0, n).join(''));
      if (n === 1 && cum.length < 4) break;
      const diem = new Map();
      for (const c of dsChuong) for (const d of dongTheoChuong().get(c) || []) if (d.chu.includes(cum)) diem.set(d.h4, (diem.get(d.h4) || 0) + (d.ten ? 5 : 1));
      if (!diem.size) continue;
      const xep = [...diem].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([h]) => h).filter((h) => !co.has(h)).slice(0, 1);
      for (const h of xep) if (ra.length < toiDa) { ra.push({ nhom: h, vatLieu: chatLieu, cum: tu.slice(0, n).join(' ') }); co.add(h); }
      break;
    }
  }
  return ra;
}

/** Ứng viên sẵn có trong chương đúng vật liệu đã nêu tên hàng chưa. */
function laNhomCoTen(h4, tu) {
  const cum = gon(tu.slice(0, 2).join(''));
  if (cum.length < 4) return true;
  return (dongTheoChuong().get(h4.slice(0, 2)) || []).some((d) => d.h4 === h4 && d.chu.includes(cum));
}

module.exports = { nhomSongSinh, chuongTheoVatLieu, tenVat };
