// lib/ho-so-ma/tra.js — TRA HỒ SƠ VẤN ĐỀ của một mã (M-77, #1969).
//
// Bọc quanh lib/ho-so-ma/ghep.js (máy ghép hồ sơ theo đường đi Phần → Chương → 4 → 6 → 8):
//   1. phieuVanDe(ma)   — hồ sơ GỌN, nhóm theo cấp, mỗi mục vấn đề trỏ thẳng câu luật
//                        (id câu + trích + vân tay sha256); có nhớ đệm nên lần tra sau nhanh.
//   2. xayChiMuc(opts)  — dựng chỉ mục trong bộ nhớ cho mọi mã đã có bản ghi (gọi lúc build như M-34).
//   3. kiemVan(ma)      — vân tay: câu luật đổi (sha khác) ⇒ vấn đề dính câu đó đánh dấu CŨ, test đỏ.
//
// CHỈ ĐỌC: không nối vào đường chọn mã (lib/engine-loop, lib/classify*); không AI; không dữ liệu khách.

const crypto = require('node:crypto');
const G = require('./ghep');

const BO_NHO_PHIEU = new Map(); // "ma|luat|hoSo" → phiếu đã dựng
const BO_NHO_VAN = new Map();   // "ma|luat|hoSo" → kết quả kiểm vân tay

const TRICH_MAX = 300;
const sha256 = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

/** Bản ghi câu trong data/luat-goc/cau/<kho>.jsonl: {id, tu, den} + chữ đầy đủ của nút để cắt câu. */
function cauBanGhi(cauId, L) {
  const m = /^(.+)#(\d+)$/.exec(String(cauId || ''));
  if (!m) return null;
  const nut = m[1];
  const so = G.soBieu(nut) || (/^chuong:(\d{2})$/.exec(nut) || [])[1];
  if (!so) return null;
  const tep = `${L.thuMuc}/cau/${/^chuong:/.test(nut) ? 'chuong' : 'bieu'}.jsonl`;
  const cau = G.docJsonl(tep).find((r) => r.id === cauId);
  if (!cau || typeof cau.tu !== 'number') return null;
  const n = L.theoId.get(nut);
  const chu = n ? String(n.ten) : null;
  if (typeof chu !== 'string') return null;
  return { chu, tu: cau.tu, den: cau.den ?? chu.length, cauChinh: chu.slice(cau.tu, cau.den) };
}

/** Làm gọn một bản ghi vấn đề: giữ trường có nghĩa cho người tra, trỏ thẳng câu luật. */
function gonVanDe(r) {
  const gon = {
    id: r.id,
    loai: r.loai,
    dieuKien: r.dieuKien,
    cau: r.cau,
    van: r.van,
    lop: r.lop,
    nguon: r.nguon,
    trangThai: r.trangThai,
  };
  if (r.trich) gon.trich = r.trich.length > TRICH_MAX ? `${r.trich.slice(0, TRICH_MAX)}…` : r.trich;
  if (Array.isArray(r.den) && r.den.length) gon.den = r.den;
  if (r.nguong) gon.nguong = r.nguong;
  if (Array.isArray(r.duKien) && r.duKien.length) gon.duKien = r.duKien;
  if (r.phieu) gon.phieu = r.phieu;
  return gon;
}

/**
 * Hồ sơ vấn đề GỌN của một mã: nhóm theo cấp đường đi, mỗi mục trỏ câu luật, cấp thiếu nói thiếu.
 * opts: { luat, hoSo } — thư mục kho luật và thư mục hồ sơ (mặc định data/luat-goc, data/ho-so-ma).
 */
function phieuVanDe(ma, opts = {}) {
  const m = G.chuanMa(ma);
  if (!m) return { ma: String(ma ?? ''), khongCo: true, loi: 'mã phải có 4, 6 hoặc 8 chữ số' };
  const khoa = `${m}|${opts.luat || 'mac-dinh'}|${opts.hoSo || 'mac-dinh'}`;
  if (BO_NHO_PHIEU.has(khoa)) return BO_NHO_PHIEU.get(khoa);

  const hoSo = G.hoSo(m, opts);
  const kq = hoSo.khongCo
    ? { khuon: hoSo.khuon, ma: hoSo.ma, khongCo: true, loi: hoSo.loi }
    : {
        khuon: hoSo.khuon,
        ma: hoSo.ma,
        duong: hoSo.duong.map((c) => ({
          cap: c.cap,
          nut: c.nut,
          ten: c.ten,
          vanDe: c.vanDe.map(gonVanDe),
          soBoQua: c.soBoQua,
          chuaKhop: c.chuaKhop,
          thieu: c.thieu,
          ...(c.thieu ? { ghiChuThieu: 'cấp này chưa có dữ liệu vấn đề nào — chưa có thẻ tách' } : {}),
        })),
        soVanDe: hoSo.soVanDe,
        thieu: hoSo.thieu,
        canhBao: 'Hồ sơ vấn đề dựng CHỈ TỪ LUẬT (nguyên văn + vân tay câu) — không có mô tả hàng, tờ khai, tiền lệ hay dữ liệu khách.',
      };
  BO_NHO_PHIEU.set(khoa, kq);
  return kq;
}

/**
 * Dựng chỉ mục trong bộ nhớ cho mọi mã đã có bản ghi vấn đề (gọi lúc build như M-34).
 * @returns {{soMa: number, ma: string[]}}
 */
function xayChiMuc(opts = {}) {
  const thuMuc = opts.hoSo || G.HO_SO_MAC_DINH;
  const dsMa = new Set();
  const fs = require('node:fs');
  for (const thu of ['phan', 'chuong', 'nhom', 'phan-nhom', 'dong']) {
    const dir = `${thuMuc}/${thu}`;
    if (!fs.existsSync(dir)) continue;
    for (const tep of fs.readdirSync(dir)) {
      if (!tep.endsWith('.jsonl')) continue;
      for (const dong of fs.readFileSync(`${dir}/${tep}`, 'utf8').split('\n')) {
        if (!dong.trim()) continue;
        try {
          const r = JSON.parse(dong);
          if (r.nut) {
            const so = String(G.soBieu(r.nut) || '');
            if (so.length === 4 || so.length === 6 || so.length === 8) dsMa.add(so);
          }
        } catch { /* dòng hỏng bỏ qua */ }
      }
    }
  }
  for (const ma of dsMa) phieuVanDe(ma, opts);
  return { soMa: dsMa.size, ma: [...dsMa].sort() };
}

/** Kiểm vân tay một mã: câu luật hiện tại còn khớp `van` đã ghi không. Lệch ⇒ vấn đề CŨ. */
function kiemVan(ma, opts = {}) {
  const phieu = phieuVanDe(ma, opts);
  if (phieu.khongCo) return { ma: phieu.ma, hopLe: 0, le: [], capNhat: false };
  const khoa = `${phieu.ma}|${opts.luat || 'mac-dinh'}|${opts.hoSo || 'mac-dinh'}`;
  if (BO_NHO_VAN.has(khoa)) return BO_NHO_VAN.get(khoa);
  const L = G.napLuat(opts.luat || G.LUAT_MAC_DINH);
  const le = [];
  let hopLe = 0;
  for (const cap of phieu.duong) {
    for (const v of cap.vanDe) {
      const bg = cauBanGhi(v.cau, L);
      if (!bg) { le.push({ id: v.id, lyDo: 'không đọc được câu trong kho' }); continue; }
      const vanMoi = sha256(bg.cauChinh);
      if (vanMoi === v.van) hopLe += 1;
      else le.push({ id: v.id, lyDo: 'câu luật đã đổi', vanCu: v.van.slice(0, 12), vanMoi: vanMoi.slice(0, 12) });
    }
  }
  const kq = { ma: phieu.ma, hopLe, le, capNhat: le.length === 0 };
  BO_NHO_VAN.set(khoa, kq);
  return kq;
}

module.exports = { phieuVanDe, xayChiMuc, kiemVan, gonVanDe, cauBanGhi };
