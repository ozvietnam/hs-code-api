#!/usr/bin/env node
/**
 * scripts/apply-review-lo053.mjs — Áp kết quả SOÁT ĐỘC LẬP lô 053 (nhóm 1005/1006/1007/1008/1101/1102).
 *
 * Sao chép nguyên tắc của apply-review-lo046.mjs (đã vá ba bẫy của lô 021/022):
 *   1. áp hết `sua` XONG mới áp `xoa`, và `xoa` đi theo index GIẢM DẦN
 *      (nếu áp lẫn, một mục xoá ở index thấp làm lệch các index cao hơn kế tiếp trong cùng mảng);
 *   2. GIỮ THỤT LỀ + dấu xuống dòng của tệp gốc (đọc từ tệp, không hard-code);
 *   3. KHÔNG ghi lại tệp khi không có thay đổi nào (JSON.stringify mở rộng mảng ghi cẩn làm nhiễu diff).
 *
 *   TARGET=raw  node scripts/apply-review-lo053.mjs           (dry-run)
 *   TARGET=raw  APPLY=1 node scripts/apply-review-lo053.mjs  (ghi tmp/so-tay/raw/)
 *   TARGET=data APPLY=1 node scripts/apply-review-lo053.mjs  (ghi data/so-tay/: CHỈ đổi nguonLoai)
 *
 * Luật §L11: chỉ người soát độc lập được đổi nguonLoai AI_DA_KIEM -> NGUOI_DUYET, và chỉ cho khối
 * đã soi theo mục 4 tài liệu giao việc: phamVi / boPhan / dieuKienVao / loaiTru / phanBiet.
 * KHÔNG đụng tieuChi6 / dong8 / cay (đúng như lô 044/045/046 — các mục này người soát đã ĐỌC và
 * đối chiếu, nhưng nhãn vẫn giữ AI_DA_KIEM theo quy ước các lô gần đây).
 *
 * LƯU Ý THỨ TỰ (memory `so-tay-apply-review-2-phase`): pha `TARGET=data` KHÔNG được áp lại
 * `thayDoi` — data/so-tay vừa được build lại từ tmp/so-tay/raw đã có thay đổi, áp lại sẽ chèn trùng mục.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const NHOM_CUA_LO = (process.env.NHOM || '1005,1006,1007,1008,1101,1102').split(',');
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

/** Sửa theo index GỐC (không xoá). */
function apSua(obj, thayDoi) {
  const sua = [];
  for (const t of thayDoi) {
    if (t.hanhDong !== 'sua') continue;
    const { kind, idx } = parseIndex(t.index);
    const target = idx == null ? obj[kind] : (obj[kind] || [])[idx];
    if (!target) throw new Error(`Không tìm thấy ${t.index}`);
    for (const [k, v] of Object.entries(t.sua || {})) {
      if (JSON.stringify(target[k]) !== JSON.stringify(v)) { target[k] = v; sua.push(`${t.index}.${k}`); }
    }
  }
  return sua;
}

/** Xoá theo index GỐC, giảm dần trong từng mảng. */
function apXoa(obj, thayDoi) {
  const theoMang = new Map();
  let xoa = 0;
  for (const t of thayDoi) {
    if (t.hanhDong !== 'xoa') continue;
    const { kind, idx } = parseIndex(t.index);
    if (idx == null) throw new Error(`xoa cần index có [i]: ${t.index}`);
    if (!Array.isArray(obj[kind])) throw new Error(`không xoá được: ${kind} không phải mảng`);
    if (idx < 0 || idx >= obj[kind].length) {
      throw new Error(`index ngoài mảng: ${t.index} (mảng ${kind} hiện có ${obj[kind].length} mục) — `
        + `bản nháp CÓ THỂ ĐÃ ĐƯỢC ÁP rồi; muốn áp lại thì phải khôi phục bản nháp gốc trước`);
    }
    if (!theoMang.has(kind)) theoMang.set(kind, []);
    theoMang.get(kind).push(idx);
    xoa += 1;
  }
  for (const [kind, idxs] of theoMang) {
    for (const i of [...new Set(idxs)].sort((a, b) => b - a)) obj[kind].splice(i, 1);
  }
  return xoa;
}

function apNguonLoai(obj) {
  let changes = 0;
  const doi = (it) => { if (it && typeof it === 'object' && it.nguonLoai === 'AI_DA_KIEM') { it.nguonLoai = 'NGUOI_DUYET'; changes += 1; } };
  for (const kind of KINDS_SINGLE) doi(obj[kind]);
  for (const kind of KINDS_ARR) if (Array.isArray(obj[kind])) obj[kind].forEach(doi);
  return changes;
}

/** Thụt lề + dấu xuống dòng của tệp gốc (data/so-tay ghi 1 dấu cách, bản nháp dùng 2). */
function hinhDangGoc(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const indent = (raw.match(/\n(\s+)\S/) || [, ''])[1] ?? 2;
  const pad = indent.startsWith(' ') && !indent.startsWith('  ') ? 1 : indent.length || 2;
  return { indent: pad, trailing: raw.endsWith('\n') ? '\n' : '' };
}

console.log(`TARGET=${TARGET}  APPLY=${APPLY ? 'GHI' : 'DRY-RUN'}  lô 053 = ${NHOM_CUA_LO.join(', ')}`);
const tong = { sua: 0, xoa: 0, giu: 0, nguonLoai: 0, soat: 0 };
// HAI PHA: tính thay đổi cho MỌI nhóm trước, chỉ ghi tệp khi cả lô không lỗi — không bao giờ để lô
// bị áp dở (một nhóm đã ghi, nhóm sau lỗi chỉ số).
const keGhi = [];
const loi = [];
for (const nhom of NHOM_CUA_LO) {
  const file = path.join(TARGET_DIR, `${nhom}.json`);
  const rvPath = path.join(ROOT, 'review', `${nhom}.json`);
  if (!fs.existsSync(file)) { console.log(`[${nhom}] KHÔNG thấy ${file}, bỏ`); continue; }
  if (!fs.existsSync(rvPath)) { console.log(`[${nhom}] KHÔNG có review/, bỏ`); continue; }
  const review = JSON.parse(fs.readFileSync(rvPath, 'utf8'));
  const obj = JSON.parse(fs.readFileSync(file, 'utf8'));
  let sua = []; let xoa = 0;
  try {
    if (TARGET === 'data') {
      // data/so-tay/<nhom>.json vừa được build lại từ tmp/so-tay/raw (đã áp thayDoi rồi) → CHỈ đổi nguonLoai.
      sua = []; xoa = 0;
    } else {
      sua = apSua(obj, review.thayDoi || []);
      xoa = apXoa(obj, review.thayDoi || []);
    }
  } catch (e) {
    loi.push(`[${nhom}] ${e.message}`);
    console.log(`[${nhom}] LỖI: ${e.message}`);
    continue;
  }
  const giu = (review.thayDoi || []).filter((t) => t.hanhDong === 'giu').length;
  const nl = TARGET === 'data' ? apNguonLoai(obj) : 0;
  const coThayDoi = !!(sua.length || xoa || nl);
  tong.sua += sua.length; tong.xoa += xoa; tong.giu += giu; tong.nguonLoai += nl; tong.soat += review.soat || 0;
  console.log(`[${nhom}] soát ${review.soat} mục → giu ${giu}, sửa ${sua.length} (${sua.join('; ') || '-'}), `
    + `xoá ${xoa}, đổi nguonLoai ${nl}`);
  if (APPLY && coThayDoi) keGhi.push({ file, obj });
  else if (APPLY) console.log('         không có thay đổi nào → không ghi lại tệp (giữ nguyên thụt lề và mọi ký tự)');
}
if (loi.length) {
  console.error(`\nCÓ ${loi.length} nhóm lỗi → KHÔNG ghi tệp nào:`);
  for (const l of loi) console.error('  ' + l);
  process.exit(1);
}
for (const { file, obj } of keGhi) {
  const { indent, trailing } = hinhDangGoc(file);
  fs.writeFileSync(file, JSON.stringify(obj, null, indent) + trailing, 'utf8');
  console.log(`→ ĐÃ GHI ${path.basename(file)}`);
}
console.log(`Tổng: soát ${tong.soat} mục, giu ${tong.giu}, sửa ${tong.sua}, xoá ${tong.xoa}, nguonLoai ${tong.nguonLoai}.`);
