/**
 * lib/tien-le-thay-the.js — TB-TCHQ đã bị Hải quan sửa đổi, thay thế (data/tien-le-thay-the.json).
 *
 * Kho tiền lệ (data/precedents.json) gộp từ nhiều nguồn cộng đồng nên giữ cả TB cũ lẫn TB thay thế nó như hai tiền lệ ngang
 * nhau (vd 293/TB-TCHQ xếp 3004.20.91, bị 2719/TB-TCHQ thay bằng 3004.20.71). Lúc chạy, TB cũ không được trích làm căn cứ.
 *
 * Khớp theo CẢ số hiệu VÀ ngày ban hành: số hiệu TB lặp lại mỗi năm (6449/TB-TCHQ ngày 13/12/2023 bị thay; 6449/TB-TCHQ
 * ngày 23/12/2024 là thông báo khác). Thiếu ngày ở bản ghi ⇒ không khớp (sai an toàn: giữ lại hơn là bỏ nhầm).
 *
 * Không sửa precedents.json: bảng hiệu chỉnh (lib/ho-so/hieu-chinh.js) và tín hiệu lát 1 trỏ vị trí bản ghi trong tệp.
 * Tắt khẩn cấp: HS_LOC_TB_THAY_THE=false.
 */
const fs = require('fs');
const path = require('path');
const { loadJson } = require('./data-cache');
const { dataReadPath } = require('./data-paths');

const chuanSo = (s) => String(s || '').replace(/\s+/g, '').toUpperCase();
const LY_DO_MA_DA_BIET_GOP = 'mã đã bị gộp trong biểu thuế hiện hành';
const RESIDUAL_RE = /^(loại khác|loại kh[aá]c|khác)\b/i;

let _ds = null;
let _bieu = null;

function danhSach() {
  if (_ds) return _ds;
  try { _ds = JSON.parse(fs.readFileSync(dataReadPath('tien-le-thay-the.json'), 'utf8')).muc || []; } catch { _ds = []; }
  return _ds;
}

function bieuHienHanh() {
  if (_bieu) return _bieu;
  let tax = {};
  try { tax = loadJson(dataReadPath('tax.json'), {}) || {}; } catch { tax = {}; }
  const active8 = new Set(Object.keys(tax).filter((k) => /^\d{8}$/.test(k)));
  const active6 = new Set([...active8].map((k) => k.slice(0, 6)));
  const active4 = new Set([...active8].map((k) => k.slice(0, 4)));
  const remap = new Map();
  try {
    const dir = process.env.HS_LEGACY_MAPPING_DIR || dataReadPath('legacy-hs-mapping');
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
    for (const f of files) {
      const doc = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      for (const [old, v] of Object.entries(doc.mapping || {})) {
        const hsMoi = String(v?.hs_moi || '').trim();
        if (!/^\d{8}$/.test(old) || !/^\d{8}$/.test(hsMoi) || old === hsMoi) continue;
        if (!active8.has(hsMoi) || active8.has(old)) continue;
        const tenMoi = String(tax[hsMoi]?.vn || '').replace(/^[-\s]+/, '').trim();
        if (RESIDUAL_RE.test(tenMoi)) continue;
        if (!remap.has(old)) remap.set(old, hsMoi);
      }
    }
  } catch { /* không có thư mục mapping */ }
  _bieu = { active8, active6, active4, remap };
  return _bieu;
}

/**
 * Chuẩn hoá mã HS: nếu là mã 8 số đã chết trong biểu thuế hiện hành thì trả mã sống
 * (mã 8 số từ bảng remap đã kiểm, hoặc phân nhóm 6 số / nhóm 4 số còn sống) kèm cờ
 * `maDaBietGop: true` và `lyDoMaDaBietGop`. Không tự chế mã 8 số thay thế.
 */
function chuanMaSong(rawCode) {
  const raw = String(rawCode == null ? '' : rawCode).trim();
  const d = raw.replace(/\D/g, '');
  if (d.length !== 8) return { maSong: d || raw, maDaBietGop: false, lyDoMaDaBietGop: null, tuBangRemap: false };
  const { active8, active6, active4, remap } = bieuHienHanh();
  if (!active8.size || active8.has(d)) return { maSong: d, maDaBietGop: false, lyDoMaDaBietGop: null, tuBangRemap: false };
  const hsMoi = remap.get(d);
  if (hsMoi && active8.has(hsMoi)) {
    return { maSong: hsMoi, maDaBietGop: true, lyDoMaDaBietGop: LY_DO_MA_DA_BIET_GOP, tuBangRemap: true };
  }
  const maSong = active6.has(d.slice(0, 6)) ? d.slice(0, 6) : (active4.has(d.slice(0, 4)) ? d.slice(0, 4) : null);
  return { maSong, maDaBietGop: true, lyDoMaDaBietGop: LY_DO_MA_DA_BIET_GOP, tuBangRemap: false };
}

function lamSachConfusedWith(cw) {
  if (!Array.isArray(cw) || !cw.length) return { cw, daGop: false };
  let daGop = false;
  const out = [];
  const seen = new Set();
  for (const c of cw) {
    const ch = chuanMaSong(c);
    if (ch.maDaBietGop) {
      daGop = true;
      if (ch.maSong && !seen.has(ch.maSong)) {
        seen.add(ch.maSong);
        out.push(ch.maSong);
      }
    } else {
      const val = String(c);
      if (!seen.has(val)) {
        seen.add(val);
        out.push(c);
      }
    }
  }
  return { cw: daGop ? out : cw, daGop };
}

/** Mục thay thế của một bản ghi tiền lệ, hoặc null. */
function thayTheCua(rec, ds = danhSach()) {
  const so = chuanSo(rec?.tbTchqNumber); const ngay = String(rec?.issuedDate || '').slice(0, 10);
  if (!so || !ngay) return null;
  return ds.find((m) => chuanSo(m?.cu?.soHieu) === so && String(m?.cu?.ngay || '') === ngay) || null;
}

/**
 * Bản sao kho tiền lệ đã bỏ các TB bị thay thế và chặn mã 8 số đã chết trong biểu hiện hành.
 * Không đổi đối tượng gốc.
 * @returns {{ data: object, boRa: Array, maChetDaGop: Array }}
 */
function locHieuLuc(precedents, ds = danhSach()) {
  const boRa = [];
  const maChetDaGop = [];
  if (!precedents || typeof precedents !== 'object' || process.env.HS_LOC_TB_THAY_THE === 'false' || !ds.length) {
    return { data: precedents || {}, boRa, maChetDaGop };
  }
  const data = {};
  for (const [ma, list] of Object.entries(precedents)) {
    if (!Array.isArray(list)) { data[ma] = list; continue; }
    const kCheck = chuanMaSong(ma);
    const giu = [];
    for (const r of list) {
      const m = thayTheCua(r, ds);
      if (m) {
        boRa.push({ ma, soHieu: r.tbTchqNumber, ngay: r.issuedDate, thayBoi: m.moi?.soHieu || '' });
        continue;
      }
      const { cw: cwClean, daGop: cwDaGop } = lamSachConfusedWith(r?.confusedWith);
      const oCheck = chuanMaSong(r?.outcome || ma);
      if (kCheck.maDaBietGop || oCheck.maDaBietGop) {
        const maSong = (oCheck.maDaBietGop ? oCheck.maSong : kCheck.maSong) || kCheck.maSong;
        const recDaGop = {
          ...r,
          ...(cwDaGop ? { confusedWith: cwClean } : {}),
          outcome: maSong,
          maSong,
          maDaBietGop: true,
          lyDoMaDaBietGop: LY_DO_MA_DA_BIET_GOP,
        };
        boRa.push({
          ma,
          soHieu: r?.tbTchqNumber,
          ngay: r?.issuedDate,
          maSong,
          maDaBietGop: true,
          lyDoMaDaBietGop: LY_DO_MA_DA_BIET_GOP,
        });
        maChetDaGop.push(recDaGop);
        continue;
      }
      if (cwDaGop) {
        giu.push({
          ...r,
          confusedWith: cwClean,
          maDaBietGop: true,
          lyDoMaDaBietGop: LY_DO_MA_DA_BIET_GOP,
        });
      } else {
        giu.push(r);
      }
    }
    if (giu.length) data[ma] = giu;
  }
  return { data, boRa, maChetDaGop };
}

function reset() { _ds = null; _bieu = null; }

module.exports = {
  danhSach,
  thayTheCua,
  locHieuLuc,
  chuanMaSong,
  lamSachConfusedWith,
  LY_DO_MA_DA_BIET_GOP,
  reset,
};
