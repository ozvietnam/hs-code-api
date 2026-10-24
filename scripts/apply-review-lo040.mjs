#!/usr/bin/env node
/**
 * scripts/apply-review-lo040.mjs — Áp kết quả SOÁT ĐỘC LẬP lô 040 (PR #433, nhóm 0206/0207/0208/0209/0210/0301).
 *
 * Cách làm giống apply-review-lo027.mjs: `hanhDong: 'giu'` là no-op để review/<nhom>.json ghi đủ TẤT CẢ mục đã soi.
 *
 *   TARGET=raw  node scripts/apply-review-lo040.mjs           (dry-run)
 *   TARGET=raw  APPLY=1 node scripts/apply-review-lo040.mjs  (ghi tmp/so-tay/raw/)
 *   TARGET=data APPLY=1 node scripts/apply-review-lo040.mjs  (ghi data/so-tay/: CHỈ đổi nguonLoai)
 *
 * Luật §L11: chỉ người soát độc lập được đổi AI_DA_KIEM -> NGUOI_DUYET. Lô 040 đổi cho CẢ 8 khối đã soi
 * (phamVi/boPhan/dieuKienVao/loaiTru/phanBiet/tieuChi6/dong8/cay.tenDien); khối `cay` (cây) để nguyên
 * MAY_SUY (do máy sinh).
 *
 * LƯU Ý THỨ TỰ: `xoa` splice ngay trong mảng nên mọi mục `xoa` của cùng một khối phải đứng CUỐI
 * và theo index GIẢM DẦN — lô 040 không xoá mục nào nên không có ràng buộc này.
 *
 * BẢO TOÀN ĐỊNH DẠNG: đọc thụt lề + dấu xuống dòng cuối từ TỆP GỐC (không hard-code), và KHÔNG ghi lại
 * tệp khi nội dung không đổi — nếu không diff sẽ thành sửa toàn bộ tệp và hồ sơ soát không đọc được.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const NHOM_CUA_LO = (process.env.NHOM || '0206,0207,0208,0209,0210,0301').split(',');
const TARGET = process.env.TARGET || 'raw';
const TARGET_DIR = TARGET === 'data' ? path.join(ROOT, 'data/so-tay') : path.join(ROOT, 'tmp/so-tay/raw');
const APPLY = process.env.APPLY === '1';
// 8 khối người soát đã đọc tay lô 040 (khối `cay` do máy sinh — chỉ `cay.tenDien` là mục soạn tay).
const KINDS_SINGLE = ['phamVi', 'boPhan'];
const KINDS_ARR = ['dieuKienVao', 'loaiTru', 'phanBiet', 'tieuChi6', 'dong8'];

function parseIndex(index) {
  const m = String(index).match(/^([a-zA-Z_][a-zA-Z0-9]*(?:\.[a-zA-Z_][a-zA-Z0-9]*)*)(?:\[(\d+)\])?$/);
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
  const doi = (it) => {
    if (it && typeof it === 'object' && it.nguonLoai === 'AI_DA_KIEM') { it.nguonLoai = 'NGUOI_DUYET'; changes += 1; }
  };
  for (const kind of KINDS_SINGLE) doi(obj[kind]);
  for (const kind of KINDS_ARR) for (const it of obj[kind] || []) doi(it);
  // cay.tenDien là mục soạn tay (khối `cay` bên ngoài vẫn MAY_SUY của máy) — lô 040 có 1 mục (0301).
  for (const it of (obj.cay || {}).tenDien || []) doi(it);
  return changes;
}

/** Thụt lề và dấu xuống dòng cuối lấy từ tệp GỐC (không hard-code). */
function hinhDang(chuan) {
  const indent = /^\{\n(\s+)/.exec(chuan)?.[1] || '  ';
  return { indent, newline: chuan.endsWith('\n') ? '\n' : '' };
}

console.log(`TARGET=${TARGET}  APPLY=${APPLY ? 'GHI' : 'DRY-RUN'}  lô 040 = ${NHOM_CUA_LO.join(', ')}`);
const tong = { sua: 0, xoa: 0, giu: 0, nguonLoai: 0, soat: 0, ghi: 0 };
for (const nhom of NHOM_CUA_LO) {
  const file = path.join(TARGET_DIR, `${nhom}.json`);
  const rvPath = path.join(ROOT, 'review', `${nhom}.json`);
  if (!fs.existsSync(file)) { console.log(`[${nhom}] KHÔNG thấy ${file}, bỏ`); continue; }
  if (!fs.existsSync(rvPath)) { console.log(`[${nhom}] KHÔNG có review/, bỏ`); continue; }
  const review = JSON.parse(fs.readFileSync(rvPath, 'utf8'));
  const chuan = fs.readFileSync(file, 'utf8');
  const obj = JSON.parse(chuan);
  // TARGET=data: data/so-tay/<nhom>.json vừa được build lại từ tmp/so-tay/raw (đã áp thayDoi rồi),
  // nên ở pha này CHỈ đổi nguonLoai — không áp lại thayDoi (sẽ chèn trùng mục).
  let r;
  if (TARGET === 'data') {
    r = { sua: [], xoa: 0, giu: review.soat };
  } else {
    r = applyThayDoi(obj, review.thayDoi || []);
  }
  const nl = TARGET === 'data' ? applyNguonLoai(obj) : 0;
  tong.sua += r.sua.length; tong.xoa += r.xoa; tong.giu += r.giu; tong.nguonLoai += nl; tong.soat += review.soat;
  let ghi = 'không đổi (không ghi lại tệp)';
  if (APPLY) {
    const { indent, newline } = hinhDang(chuan);
    const moi = JSON.stringify(obj, null, indent) + newline;
    if (moi !== chuan) { fs.writeFileSync(file, moi, 'utf8'); ghi = 'ĐÃ GHI'; tong.ghi += 1; }
  }
  console.log(`[${nhom}] soát ${review.soat} mục → giu ${r.giu}, sửa ${r.sua.length} (${r.sua.join('; ') || '-'}), `
    + `xoá ${r.xoa}, đổi nguonLoai ${nl} — ${ghi}`);
}
console.log(`Tổng: soát ${tong.soat} mục, giu ${tong.giu}, sửa ${tong.sua}, xoá ${tong.xoa}, `
  + `đổi nguonLoai ${tong.nguonLoai}, ghi ${tong.ghi}/${NHOM_CUA_LO.length} tệp.`);
