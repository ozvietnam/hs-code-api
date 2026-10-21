#!/usr/bin/env node
/**
 * scripts/apply-review-lo007.mjs — Áp kết quả SOÁT ĐỘC LẬP lô 007 (PR #382, nhóm 6116/8203/8460).
 *
 * Khác apply-review-lo002/lo004 ở chỗ: thêm `hanhDong: 'chen'` (chèn mục MỚI sau một index,
 * cần cho lỗi "một câu nêu hai nhóm đích nhưng mục chỉ ghi một" — tách thành hai mục đúng nghĩa)
 * và hiểu `hanhDong: 'giu'` (mục đã soát, không đổi gì) như no-op để review/<nhom>.json
 * ghi lại đủ TẤT CẢ mục đã soi, không chỉ mục bị sửa.
 *
 *   TARGET=raw  node scripts/apply-review-lo007.mjs           (dry-run)
 *   TARGET=raw  APPLY=1 node scripts/apply-review-lo007.mjs  (ghi tmp/so-tay/raw/)
 *   TARGET=data APPLY=1 node scripts/apply-review-lo007.mjs  (ghi data/so-tay/: đổi nguonLoai)
 *
 * Luật §L11: chỉ người soát độc lập được đổi nguonLoai AI_DA_KIEM -> NGUOI_DUYET, và chỉ cho
 * khối đã soi: phamVi / boPhan / dieuKienVao / loaiTru / phanBiet. KHÔNG đụng tieuChi6 / dong8 /
 * cay — khối máy suy hoặc tra biểu thuế/WCO (đúng cách làm của lô 006).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const NHOM_CUA_LO = (process.env.NHOM || '6116,8203,8460').split(',');
const TARGET = process.env.TARGET || 'raw';
const TARGET_DIR = TARGET === 'data' ? path.join(ROOT, 'data/so-tay') : path.join(ROOT, 'tmp/so-tay/raw');
const APPLY = process.env.APPLY === '1';
const KINDS_SINGLE = ['phamVi', 'boPhan'];
const KINDS_ARR = ['dieuKienVao', 'loaiTru', 'phanBiet'];

function parseIndex(index) {
  const m = String(index).match(/^([a-zA-Z_][a-zA-Z0-9]*)(?:\[(\d+)\])?$/);
  if (!m) throw new Error(`Không parse được index: ${index}`);
  return { kind: m[1], idx: m[2] != null ? Number(m[2]) : null };
}

/** Sửa/xoá theo index GỐC; `chen` để CUỐI để chỉ số không bị lệch khi soát. */
function applyThayDoi(obj, thayDoi) {
  const sua = []; let xoa = 0; const chen = []; let giu = 0;
  for (const t of thayDoi) {
    const { kind, idx } = parseIndex(t.index);
    const hanhDong = t.hanhDong || (t.sua ? 'sua' : null);
    if (hanhDong === 'giu') { giu += 1; continue; }
    if (hanhDong === 'chen') {
      if (idx == null) throw new Error(`chen cần index có [i]: ${t.index}`);
      chen.push({ kind, idx, muc: t.muc });
      continue;
    }
    if (hanhDong === 'xoa') {
      if (idx == null) throw new Error(`xoa cần index có [i]: ${t.index}`);
      if (!Array.isArray(obj[kind])) throw new Error(`không xoá được: ${kind} không phải mảng`);
      if (idx < 0 || idx >= obj[kind].length) throw new Error(`index ngoài mảng: ${t.index}`);
      obj[kind].splice(idx, 1); xoa += 1;
      continue;
    }
    if (hanhDong !== 'sua') throw new Error(`index ${t.index}: hanhDong không hợp lệ (${hanhDong})`);
    const target = idx == null ? obj[kind] : (obj[kind] || [])[idx];
    if (!target) throw new Error(`Không tìm thấy ${t.index}`);
    for (const [k, v] of Object.entries(t.sua || {})) {
      if (JSON.stringify(target[k]) !== JSON.stringify(v)) { target[k] = v; sua.push(`${t.index}.${k}`); }
    }
  }
  for (const c of chen.sort((a, b) => a.idx - b.idx)) {
    if (!Array.isArray(obj[c.kind])) throw new Error(`không chèn được: ${c.kind} không phải mảng`);
    obj[c.kind].splice(c.idx + 1, 0, c.muc);
  }
  return { sua, xoa, chen, giu };
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

console.log(`TARGET=${TARGET}  APPLY=${APPLY ? 'GHI' : 'DRY-RUN'}  lô 007 = ${NHOM_CUA_LO.join(', ')}`);
let tong = { sua: 0, xoa: 0, chen: 0, giu: 0, nguonLoai: 0 };
for (const nhom of NHOM_CUA_LO) {
  const file = path.join(TARGET_DIR, `${nhom}.json`);
  const rvPath = path.join(ROOT, 'review', `${nhom}.json`);
  if (!fs.existsSync(file)) { console.log(`[${nhom}] KHÔNG thấy ${file}, bỏ`); continue; }
  if (!fs.existsSync(rvPath)) { console.log(`[${nhom}] KHÔNG có review/, bỏ`); continue; }
  const review = JSON.parse(fs.readFileSync(rvPath, 'utf8'));
  const obj = JSON.parse(fs.readFileSync(file, 'utf8'));
  // TARGET=data: data/so-tay/<nhom>.json vừa được build lại từ tmp/so-tay/raw (đã áp thayDoi rồi),
  // nên ở pha này CHỈ đổi nguonLoai — không áp lại thayDoi (sẽ chèn trùng mục).
  const r = TARGET === 'data' ? { sua: [], xoa: 0, chen: [], giu: review.soat } : applyThayDoi(obj, review.thayDoi || []);
  const nl = TARGET === 'data' ? applyNguonLoai(obj) : 0;
  tong.sua += r.sua.length; tong.xoa += r.xoa; tong.chen += r.chen.length; tong.giu += r.giu; tong.nguonLoai += nl;
  console.log(`[${nhom}] soát ${review.soat} mục → giu ${r.giu}, sửa ${r.sua.length} (${r.sua.join('; ') || '-'}), `
    + `chèn ${r.chen.length}, xoá ${r.xoa}, đổi nguonLoai ${nl}${APPLY ? ' — ĐÃ GHI' : ''}`);
  if (APPLY) fs.writeFileSync(file, JSON.stringify(obj, null, ' ') + '\n', 'utf8');
}
console.log(`Tổng: giu ${tong.giu}, sửa ${tong.sua}, chèn ${tong.chen}, xoá ${tong.xoa}, nguonLoai ${tong.nguonLoai}.`);