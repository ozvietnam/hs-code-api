#!/usr/bin/env node
/**
 * scripts/apply-review-lo033.mjs — Áp kết quả SOÁT ĐỘC LẬP lô 033 (PR #423, nhóm 6215/6301/6304/7017/7205/7306).
 *
 * Cách làm giống apply-review-lo026.mjs: `hanhDong: 'giu'` là no-op để review/<nhom>.json ghi đủ TẤT CẢ mục đã soi.
 *
 *   TARGET=raw  node scripts/apply-review-lo033.mjs           (dry-run)
 *   TARGET=raw  APPLY=1 node scripts/apply-review-lo033.mjs  (ghi tmp/so-tay/raw/)
 *   TARGET=data APPLY=1 node scripts/apply-review-lo033.mjs  (ghi data/so-tay/: CHỈ đổi nguonLoai)
 *
 * Luật §L11: chỉ người soát độc lập được đổi nguonLoai AI_DA_KIEM -> NGUOI_DUYET, và chỉ cho khối
 * đã soi: phamVi / boPhan / dieuKienVao / loaiTru / phanBiet. KHÔNG đụng tieuChi6 / dong8 / cay.
 *
 * LƯU Ý THỨ TỰ: `xoa` splice ngay trong mảng nên mọi mục `xoa` của cùng một khối phải đứng CUỐI
 * và theo index GIẢM DẦN — review/<nhom>.json viết tay theo index gốc, mọi mục `xoa` của cùng khối đứng cuối và giảm dần.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const NHOM_CUA_LO = (process.env.NHOM || '6215,6301,6304,7017,7205,7306').split(',');
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

/** Sửa/xoá theo index GỐC. */
function applyThayDoi(obj, thayDoi) {
  const sua = []; let xoa = 0; let giu = 0;
  for (const t of thayDoi) {
    const { kind, idx } = parseIndex(t.index);
    const hanhDong = t.hanhDong || (t.sua ? 'sua' : null);
    if (hanhDong === 'giu') { giu += 1; continue; }
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

console.log(`TARGET=${TARGET}  APPLY=${APPLY ? 'GHI' : 'DRY-RUN'}  lô 033 = ${NHOM_CUA_LO.join(', ')}`);
const tong = { sua: 0, xoa: 0, giu: 0, nguonLoai: 0, soat: 0, ngoai: 0 };
for (const nhom of NHOM_CUA_LO) {
  const file = path.join(TARGET_DIR, `${nhom}.json`);
  const rvPath = path.join(ROOT, 'review', `${nhom}.json`);
  if (!fs.existsSync(file)) { console.log(`[${nhom}] KHÔNG thấy ${file}, bỏ`); continue; }
  if (!fs.existsSync(rvPath)) { console.log(`[${nhom}] KHÔNG có review/, bỏ`); continue; }
  const review = JSON.parse(fs.readFileSync(rvPath, 'utf8'));
  const obj = JSON.parse(fs.readFileSync(file, 'utf8'));
  // TARGET=data: data/so-tay/<nhom>.json vừa được build lại từ tmp/so-tay/raw (đã áp thayDoi rồi),
  // nên ở pha này CHỈ đổi nguonLoai — không áp lại thayDoi (sẽ chèn trùng mục).
  let r;
  if (TARGET === 'data') {
    r = { sua: [], xoa: 0, giu: review.soat };
  } else {
    r = applyThayDoi(obj, review.thayDoi || []);
    // Ngoài 5 khối: chỉ sửa ký tự trong trich (không đổi nguonLoai).
    const ngoai = applyThayDoi(obj, review.thayDoiNgoaiPhamVi || []);
    r.sua.push(...ngoai.sua); r.xoa += ngoai.xoa; r.giu += ngoai.giu;
    tong.ngoai += (review.thayDoiNgoaiPhamVi || []).length;
  }
  const nl = TARGET === 'data' ? applyNguonLoai(obj) : 0;
  tong.sua += r.sua.length; tong.xoa += r.xoa; tong.giu += r.giu; tong.nguonLoai += nl; tong.soat += review.soat;
  console.log(`[${nhom}] soát ${review.soat} mục → giu ${r.giu}, sửa ${r.sua.length} (${r.sua.join('; ') || '-'}), `
    + `xoá ${r.xoa}, đổi nguonLoai ${nl}${APPLY ? ' — ĐÃ GHI' : ''}`);
  if (APPLY) {
    // data/so-tay do build-so-tay ghi 1 dấu cách; tmp/so-tay/raw bản nháp dùng 2 dấu cách.
    const indent = TARGET === 'data' ? ' ' : 2;
    const trailing = TARGET === 'data' ? '' : '\n';
    fs.writeFileSync(file, JSON.stringify(obj, null, indent) + trailing, 'utf8');
  }
}
console.log(`Tổng: soát ${tong.soat} mục, giu ${tong.giu}, sửa ${tong.sua}, xoá ${tong.xoa}, nguonLoai ${tong.nguonLoai}`
  + (tong.ngoai ? `; ngoài phạm vi ${tong.ngoai} lỗi ký tự` : '') + '.');
