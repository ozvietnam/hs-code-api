#!/usr/bin/env node
/**
 * scripts/apply-review-lo024.mjs — Áp kết quả SOÁT ĐỘC LẬP lô 024 (PR #405, nhóm 3701/3902/3904/3914/4014/9618).
 *
 * Sao chép cách làm của apply-review-lo018.mjs: hiểu `hanhDong: 'giu'` (mục đã soát, không đổi
 * gì) làm no-op để review/<nhom>.json ghi lại đủ TẤT CẢ mục đã soi, không chỉ mục bị sửa.
 *
 *   TARGET=raw  node scripts/apply-review-lo024.mjs           (dry-run)
 *   TARGET=raw  APPLY=1 node scripts/apply-review-lo024.mjs  (ghi tmp/so-tay/raw/)
 *   TARGET=data APPLY=1 node scripts/apply-review-lo024.mjs  (ghi data/so-tay/: chỉ đổi nguonLoai)
 *
 * KHÁC các lô trước — khối nâng `nguonLoai` gồm CẢ `tieuChi6` và `dong8`: lô này người soát đã
 * đối chiếu tay từng câu trích của cả hai khối (32/32 dòng biểu thuế của 3904 khớp nguyên văn,
 * 9/9 câu WCO của 3902+3904 khớp nguyên văn, hai ngưỡng lưới lọc có mặt trong câu SEN), nên nhãn
 * NGUOI_DUYET là đúng thực tế. Kho sổ tay đã có tiền lệ: 101 `tieuChi6` + 144 `dong8` mang nhãn
 * này. KHÔNG đụng `cay` — đó là khối máy sinh (nhãn MAY_SUY).
 *
 * Luật §L11: chỉ người soát độc lập được đổi nguonLoai AI_DA_KIEM -> NGUOI_DUYET.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const NHOM_CUA_LO = (process.env.NHOM || '3701,3902,3904,3914,4014,9618').split(',');
const TARGET = process.env.TARGET || 'raw';
const TARGET_DIR = TARGET === 'data' ? path.join(ROOT, 'data/so-tay') : path.join(ROOT, 'tmp/so-tay/raw');
const APPLY = process.env.APPLY === '1';
const KINDS_SINGLE = ['phamVi', 'boPhan'];
const KINDS_ARR = ['dieuKienVao', 'loaiTru', 'phanBiet', 'tieuChi6', 'dong8'];

function parseIndex(index) {
  // Cho phép đường dẫn nhiều tầng: `cay.tenDien[3]`, `dong8[12]`.
  const m = String(index).match(/^([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)(?:\[(\d+)\])?$/);
  if (!m) throw new Error(`Không parse được index: ${index}`);
  return { path: m[1].split('.'), idx: m[2] != null ? Number(m[2]) : null };
}

/** Đi theo đường dẫn `p` tới khối gốc (mảng thì dùng `idx`). */
function resolveBlock(obj, p, idx) {
  let cur = obj;
  for (const k of p) {
    if (cur == null || typeof cur !== 'object') throw new Error(`index đi không tới được: ${p.join('.')}`);
    cur = cur[k];
  }
  return idx == null ? cur : (cur || [])[idx];
}

/** Sửa/xoá theo index GỐC. Các mục `xoa` trong cùng một mảng phải đặt theo index GIẢM DẦN. */
function applyThayDoi(obj, thayDoi) {
  const sua = []; let xoa = 0; let giu = 0;
  for (const t of thayDoi) {
    const { path, idx } = parseIndex(t.index);
    const hanhDong = t.hanhDong || (t.sua ? 'sua' : null);
    if (hanhDong === 'giu') { giu += 1; continue; }
    if (hanhDong === 'xoa') {
      if (idx == null) throw new Error(`xoa cần index có [i]: ${t.index}`);
      let cur = obj;
      for (const k of path) {
        if (cur == null || typeof cur !== 'object') throw new Error(`xoá đi không tới được: ${t.index}`);
        cur = cur[k];
      }
      if (!Array.isArray(cur)) throw new Error(`không xoá được: ${t.index} không phải mảng`);
      if (idx < 0 || idx >= cur.length) throw new Error(`index ngoài mảng: ${t.index}`);
      cur.splice(idx, 1); xoa += 1;
      continue;
    }
    if (hanhDong !== 'sua') throw new Error(`${t.index}: hanhDong không hợp lệ (${hanhDong})`);
    const target = resolveBlock(obj, path, idx);
    if (!target) throw new Error(`Không tìm thấy ${t.index}`);
    for (const [k, v] of Object.entries(t.sua || {})) {
      if (JSON.stringify(target[k]) !== JSON.stringify(v)) { target[k] = v; sua.push(`${t.index}.${k}`); }
    }
  }
  return { sua, xoa, giu };
}

function applyNguonLoai(obj) {
  let changes = 0;
  for (const kind of KINDS_SINGLE) {
    const it = obj[kind];
    if (it && typeof it === 'object' && it.nguonLoai === 'AI_DA_KIEM') { it.nguonLoai = 'NGUOI_DUYET'; changes += 1; }
  }
  for (const kind of KINDS_ARR) {
    if (Array.isArray(obj[kind])) {
      for (const it of obj[kind]) {
        if (it && typeof it === 'object' && it.nguonLoai === 'AI_DA_KIEM') { it.nguonLoai = 'NGUOI_DUYET'; changes += 1; }
      }
    }
  }
  return changes;
}

console.log(`TARGET=${TARGET}  APPLY=${APPLY ? 'GHI' : 'DRY-RUN'}  lô 024 = ${NHOM_CUA_LO.join(', ')}`);
const tong = { sua: 0, xoa: 0, giu: 0, nguonLoai: 0, soat: 0 };
for (const nhom of NHOM_CUA_LO) {
  const file = path.join(TARGET_DIR, `${nhom}.json`);
  const rvPath = path.join(ROOT, 'review', `${nhom}.json`);
  if (!fs.existsSync(file)) { console.log(`[${nhom}] KHÔNG thấy ${file}, bỏ`); continue; }
  if (!fs.existsSync(rvPath)) { console.log(`[${nhom}] KHÔNG có review/, bỏ`); continue; }
  const review = JSON.parse(fs.readFileSync(rvPath, 'utf8'));
  const obj = JSON.parse(fs.readFileSync(file, 'utf8'));
  // TARGET=data: data/so-tay/<nhom>.json vừa được build lại từ tmp/so-tay/raw (đã áp thayDoi rồi),
  // nên ở pha này CHỈ đổi nguonLoai — không áp lại thayDoi (sẽ xoá/sửa nhầm lần hai).
  const r = TARGET === 'data' ? { sua: [], xoa: 0, giu: review.soat } : applyThayDoi(obj, review.thayDoi || []);
  const nl = TARGET === 'data' ? applyNguonLoai(obj) : 0;
  tong.sua += r.sua.length; tong.xoa += r.xoa; tong.giu += r.giu; tong.nguonLoai += nl; tong.soat += review.soat;
  console.log(`[${nhom}] soát ${review.soat} mục → giu ${r.giu}, sửa ${r.sua.length} (${r.sua.join('; ') || '-'}), `
    + `xoá ${r.xoa}, đổi nguonLoai ${nl}${APPLY ? ' — ĐÃ GHI' : ''}`);
  // build-so-tay.mjs ghi JSON.stringify(..., 1) KHÔNG kèm newline cuối — giữ đúng quy ước đó.
  if (APPLY) fs.writeFileSync(file, JSON.stringify(obj, null, ' '), 'utf8');
}
console.log(`Tổng: soát ${tong.soat} mục, giu ${tong.giu}, sửa ${tong.sua}, xoá ${tong.xoa}, nguonLoai ${tong.nguonLoai}.`);