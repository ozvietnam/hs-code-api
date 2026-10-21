#!/usr/bin/env node
/**
 * scripts/apply-review-lo004.mjs — Áp kết quả soát độc lập PR #374 (lô 004).
 *
 * Khác apply-review-lo002.mjs ở chỗ: hỗ trợ `hanhDong: 'xoa'` (xoá mục khỏi mảng)
 * và CHỈ áp cho 6 nhóm của lô 004 (không đụng các lô 001/002 đã duyệt).
 *
 *   TARGET=raw  node scripts/apply-review-lo004.mjs            (dry-run)
 *   TARGET=raw  APPLY=1 node scripts/apply-review-lo004.mjs   (ghi tmp/so-tay/raw/)
 *   TARGET=data APPLY=1 node scripts/apply-review-lo004.mjs   (ghi data/so-tay/: đổi nguonLoai)
 *
 * Luật §L11: chỉ người soát độc lập được đổi nguonLoai AI_DA_KIEM -> NGUOI_DUYET,
 * và chỉ cho khối người soát đã soi: phamVi / boPhan / dieuKienVao / loaiTru / phanBiet.
 * KHÔNG đụng tieuChi6 / dong8 / cay — đó là khối máy suy hoặc tra biểu thuế/WCO.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const NHOM_CUA_LO = ['6406', '7320', '9002', '9606', '4011', '4015'];
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

function applyThayDoi(obj, thayDoi) {
  let sua = 0;
  let xoa = 0;
  // gom theo kind để xoá nhiều mục trong một mảng mà không lệch chỉ số
  const xoaTheoKind = {};
  for (const t of thayDoi) {
    const { kind, idx } = parseIndex(t.index);
    const hanhDong = t.hanhDong || (t.sua ? 'sua' : null);
    if (hanhDong === 'xoa') {
      if (idx == null) throw new Error(`xoa cần index có [i]: ${t.index}`);
      (xoaTheoKind[kind] ||= []).push(idx);
      xoa += 1;
      continue;
    }
    if (hanhDong !== 'sua') throw new Error(`index ${t.index}: hanhDong không hợp lệ (${hanhDong})`);
    const target = idx == null ? obj[kind] : (obj[kind] || [])[idx];
    if (!target) throw new Error(`Không tìm thấy ${t.index}`);
    for (const [k, v] of Object.entries(t.sua || {})) {
      if (JSON.stringify(target[k]) !== JSON.stringify(v)) { target[k] = v; sua += 1; }
    }
  }
  // xoá sau khi sửa để chỉ số không bị lệch
  for (const [kind, idxs] of Object.entries(xoaTheoKind)) {
    if (!Array.isArray(obj[kind])) throw new Error(`Không xoá được: ${kind} không phải mảng`);
    const drop = new Set(idxs);
    if (idxs.some((i) => i < 0 || i >= obj[kind].length)) throw new Error(`index ngoài mảng: ${kind}`);
    obj[kind] = obj[kind].filter((_, i) => !drop.has(i));
  }
  return { sua, xoa };
}

function applyNguonLoai(obj) {
  let changes = 0;
  for (const kind of KINDS_SINGLE) {
    const it = obj[kind];
    if (it && it.nguonLoai === 'AI_DA_KIEM') { it.nguonLoai = 'NGUOI_DUYET'; changes += 1; }
  }
  for (const kind of KINDS_ARR) {
    if (Array.isArray(obj[kind])) {
      for (const it of obj[kind]) {
        if (it && it.nguonLoai === 'AI_DA_KIEM') { it.nguonLoai = 'NGUOI_DUYET'; changes += 1; }
      }
    }
  }
  return changes;
}

console.log(`TARGET=${TARGET}  APPLY=${APPLY ? 'GHI' : 'DRY-RUN'}  lô 004 = ${NHOM_CUA_LO.join(', ')}`);
let tong = { sua: 0, xoa: 0, nguonLoai: 0 };
for (const nhom of NHOM_CUA_LO) {
  const file = path.join(TARGET_DIR, `${nhom}.json`);
  const rvPath = path.join(ROOT, 'review', `${nhom}.json`);
  if (!fs.existsSync(file)) { console.log(`[${nhom}] KHÔNG thấy ${file}, bỏ`); continue; }
  if (!fs.existsSync(rvPath)) { console.log(`[${nhom}] KHÔNG có review/, bỏ`); continue; }
  const review = JSON.parse(fs.readFileSync(rvPath, 'utf8'));
  const obj = JSON.parse(fs.readFileSync(file, 'utf8'));
  const r = applyThayDoi(obj, review.thayDoi || []);
  const nl = TARGET === 'data' ? applyNguonLoai(obj) : 0;
  tong.sua += r.sua; tong.xoa += r.xoa; tong.nguonLoai += nl;
  const c = r.sua + r.xoa + nl;
  if (c > 0) {
    console.log(`[${nhom}] ${c} mục (sửa ${r.sua}, xoá ${r.xoa}, nguonLoai ${nl})${APPLY ? ' — ĐÃ GHI' : ''}`);
    if (APPLY) fs.writeFileSync(file, JSON.stringify(obj, null, ' ') + '\n', 'utf8');
  } else {
    console.log(`[${nhom}] không có thay đổi`);
  }
}
console.log(`Tổng: sửa ${tong.sua}, xoá ${tong.xoa}, đổi nguonLoai ${tong.nguonLoai}.`);