#!/usr/bin/env node
/**
 * scripts/apply-review-lo081.mjs — Áp kết quả SOÁT ĐỘC LẬP lô 081 (nhóm 2716 2801 2802 2803 2804 2805).
 *
 * Cùng cách làm của apply-review-lo076.mjs (2 pha, KHÔNG bao giờ áp thayDoi lên data),
 *
 *   TARGET=raw  node scripts/apply-review-lo081.mjs           (dry-run)
 *   TARGET=raw  APPLY=1 node scripts/apply-review-lo081.mjs  (ghi tmp/so-tay/raw/)
 *   TARGET=data APPLY=1 node scripts/apply-review-lo081.mjs  (ghi data/so-tay/: CHỈ đổi nguonLoai)
 *
 * Luật §L11: chỉ người soát độc lập đổi nguonLoai AI_DA_KIEM -> NGUOI_DUYET.
 * PHẠM VI lô 081 (theo SOAT-LO.md mục 4): phamVi / boPhan / dieuKienVao / loaiTru / phanBiet.
 * Lô 081 đã đọc thêm dong8 + tieuChi6 từng mục (44 mục) để đối chiếu; hồ sơ có SỬA 1 mục dong8
 * (28030049 — câu "Loại khác" sai cấp phạm vi), nên nhãn NGUOI_DUYET áp cho CẢ 6 khối đã đọc.
 * Khối `cay` do máy sinh — hồ sơ soát KHÔNG được sửa (script chặn).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const NHOM_CUA_LO = (process.env.NHOM || '2716,2801,2802,2803,2804,2805').split(',');
const TARGET = process.env.TARGET || 'raw';
const TARGET_DIR = TARGET === 'data' ? path.join(ROOT, 'data/so-tay') : path.join(ROOT, 'tmp/so-tay/raw');
const APPLY = process.env.APPLY === '1';
const KINDS_SINGLE = ['phamVi', 'boPhan'];
// Khối đã đọc và soát từng mục ở lô 081 → được nâng nhãn NGUOI_DUYET.
const KINDS_ARR = ['dieuKienVao', 'loaiTru', 'phanBiet', 'tieuChi6', 'dong8'];

function parseIndex(index) {
  const m = String(index).match(/^([a-zA-Z_][a-zA-Z0-9_.]*)(?:\[(\d+)\])?$/);
  if (!m) throw new Error(`Không parse được index: ${index}`);
  return { kind: m[1], idx: m[2] != null ? Number(m[2]) : null };
}

/** Chuẩn hoá review về [{kind, idx, hanhDong, sua}] cho cả hai dạng tệp. */
function normalize(review) {
  const list = Array.isArray(review) ? review : (review.thayDoi || []);
  return list.map((t) => {
    const { kind, idx } = parseIndex(t.index ?? t.truong);
    if (KINDS_SINGLE.includes(kind)) return { kind, idx: null, hanhDong: t.hanhDong, sua: t.sua || null, muc: t.muc || null };
    const i = t.index != null && /^\d+$/.test(String(t.index)) ? Number(t.index) : idx;
    return { kind, idx: i, hanhDong: t.hanhDong, sua: t.sua || null, muc: t.muc || null };
  });
}

/** Đường dẫn nhiều tầng: "cay.tenDien" → obj.cay.tenDien. */
function container(obj, kind) {
  const parts = String(kind).split('.');
  let node = obj;
  for (const p of parts) {
    if (!node || typeof node !== 'object') return null;
    node = node[p];
  }
  return node;
}

/** Sửa/xoá/chèn theo index GỐC. */
function applyThayDoi(obj, thayDoi) {
  const sua = []; let xoa = 0; let chen = 0;
  const suaList = thayDoi.filter((t) => t.hanhDong === 'sua');
  const xoaList = thayDoi.filter((t) => t.hanhDong === 'xoa')
    .slice().sort((a, b) => (a.kind === b.kind ? b.idx - a.idx : (a.kind < b.kind ? -1 : 1)));
  for (const t of [...suaList, ...xoaList]) {
    if (t.kind === 'cay' || (t.kind.startsWith('cay.') && t.kind !== 'cay.tenDien')) {
      throw new Error(`${t.kind}[${t.idx}]: khối máy sinh, không được sửa/xoá bằng hồ sơ soát`);
    }
    if (t.hanhDong === 'xoa') {
      if (t.idx == null) throw new Error(`xoa cần index có [i]: ${t.kind}`);
      const arr = container(obj, t.kind);
      if (!Array.isArray(arr)) throw new Error(`không xoá được: ${t.kind} không phải mảng`);
      if (arr.length === 0) { console.log(`    (bỏ qua xoá ${t.kind}[${t.idx}]: mảng đã rỗng — đã áp ở lượt trước)`); continue; }
      if (t.idx < 0 || t.idx >= arr.length) throw new Error(`index ngoài mảng: ${t.kind}[${t.idx}]`);
      arr.splice(t.idx, 1); xoa += 1;
      continue;
    }
    if (t.hanhDong !== 'sua') throw new Error(`${t.kind}[${t.idx}]: hanhDong không hợp lệ (${t.hanhDong})`);
    const arr = container(obj, t.kind);
    const target = t.idx == null ? arr : (arr || [])[t.idx];
    if (!target) throw new Error(`Không tìm thấy ${t.kind}[${t.idx}]`);
    for (const [k, v] of Object.entries(t.sua || {})) {
      if (JSON.stringify(target[k]) !== JSON.stringify(v)) { target[k] = v; sua.push(`${t.kind}[${t.idx}].${k}`); }
    }
  }
  for (const t of thayDoi) {
    if (t.hanhDong !== 'chen') continue;
    const arr = container(obj, t.kind);
    if (!Array.isArray(arr)) throw new Error(`không chèn được: ${t.kind} không phải mảng`);
    if (!t.muc || typeof t.muc !== 'object') throw new Error(`${t.kind}: chèn cần trường "muc"`);
    const trùng = arr.some((x) => JSON.stringify(x) === JSON.stringify(t.muc));
    if (trùng) { console.log(`    (bỏ qua chèn ${t.kind}: mục đã có — đã áp ở lượt trước)`); continue; }
    arr.push(t.muc); chen += 1;
  }
  return { sua, xoa, chen };
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

console.log(`TARGET=${TARGET}  APPLY=${APPLY ? 'GHI' : 'DRY-RUN'}  lô 081 = ${NHOM_CUA_LO.join(', ')}`);
const tong = { sua: 0, xoa: 0, chen: 0, nguonLoai: 0, nhom: 0 };
for (const nhom of NHOM_CUA_LO) {
  const file = path.join(TARGET_DIR, `${nhom}.json`);
  const rvPath = path.join(ROOT, 'review', `${nhom}.json`);
  if (!fs.existsSync(file) || !fs.existsSync(rvPath)) { console.log(`[${nhom}] bỏ (thiếu tệp)`); continue; }
  const review = JSON.parse(fs.readFileSync(rvPath, 'utf8'));
  const obj = JSON.parse(fs.readFileSync(file, 'utf8'));
  const list = normalize(review);
  const r = TARGET === 'data' ? { sua: [], xoa: 0, chen: 0 } : applyThayDoi(obj, list);
  const nl = TARGET === 'data' ? applyNguonLoai(obj) : 0;
  tong.sua += r.sua.length; tong.xoa += r.xoa; tong.chen += r.chen; tong.nguonLoai += nl; tong.nhom += 1;
  console.log(`[${nhom}] review ${list.length} mục → sửa ${r.sua.length} (${r.sua.join('; ') || '-'}), `
    + `xoá ${r.xoa}, chèn ${r.chen}, đổi nguonLoai ${nl}${APPLY ? ' — ĐÃ GHI' : ''}`);
  if (APPLY) fs.writeFileSync(file, JSON.stringify(obj, null, TARGET === 'data' ? 1 : 2), 'utf8');
}
console.log(`Tổng: ${tong.nhom} nhóm, sửa ${tong.sua}, xoá ${tong.xoa}, chèn ${tong.chen}, đổi nguonLoai ${tong.nguonLoai}.`);
