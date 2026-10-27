#!/usr/bin/env node
/**
 * scripts/apply-review-lo063.mjs — Áp kết quả SOÁT ĐỘC LẬP lô 063 (PR #484, nhóm 1801–1806).
 *
 * Cùng cách làm của apply-review-lo060.mjs (2 pha, KHÔNG bao giờ áp thayDoi lên data):
 *
 *   TARGET=raw  node scripts/apply-review-lo063.mjs           (dry-run)
 *   TARGET=raw  APPLY=1 node scripts/apply-review-lo063.mjs  (ghi tmp/so-tay/raw/)
 *   TARGET=data APPLY=1 node scripts/apply-review-lo063.mjs  (ghi data/so-tay/: CHỈ đổi nguonLoai)
 *
 * Lý do pha 2 không áp lại thayDoi: data/so-tay/<nhom>.json vừa được build-so-tay --tu-tep --force
 * dựng lại từ tmp/so-tay/raw (đã áp rồi) — áp thêm sẽ chèn trùng mục (đã dính ở lô 007).
 *
 * Luật §L11: chỉ người soát độc lập đổi nguonLoai AI_DA_KIEM -> NGUOI_DUYET, và chỉ cho khối đã
 * soi: phamVi / boPhan / dieuKienVao / loaiTru / phanBiet. KHÔNG đụng tieuChi6 / dong8 / cay.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const NHOM_CUA_LO = (process.env.NHOM || '1801,1802,1803,1804,1805,1806').split(',');
const TARGET = process.env.TARGET || 'raw';
const TARGET_DIR = TARGET === 'data' ? path.join(ROOT, 'data/so-tay') : path.join(ROOT, 'tmp/so-tay/raw');
const APPLY = process.env.APPLY === '1';
const KINDS_SINGLE = ['phamVi', 'boPhan'];
const KINDS_ARR = ['dieuKienVao', 'loaiTru', 'phanBiet'];

function parseIndex(index) {
  const m = String(index).match(/^([a-zA-Z_][a-zA-Z0-9_.]*)(?:\[(\d+)\])?$/);
  if (!m) throw new Error(`Không parse được index: ${index}`);
  return { kind: m[1], idx: m[2] != null ? Number(m[2]) : null };
}

/** Chuẩn hoá review về [{kind, idx, hanhDong, sua}] cho cả hai dạng tệp. */
function normalize(review) {
  const list = Array.isArray(review) ? review : (review.thayDoi || []);
  return list.map((t) => {
    const { kind, idx } = parseIndex(t.truong || t.index);
    // phamVi/boPhan là đối tượng đơn (không phải mảng) nên bỏ qua index, kể cả khi review ghi 0.
    if (KINDS_SINGLE.includes(kind)) return { kind, idx: null, hanhDong: t.hanhDong, sua: t.sua || null };
    const i = t.index != null && /^\d+$/.test(String(t.index)) ? Number(t.index) : idx;
    return { kind, idx: i, hanhDong: t.hanhDong, sua: t.sua || null };
  });
}

/** Sửa/xoá theo index GỐC. */
function applyThayDoi(obj, thayDoi) {
  const sua = []; let xoa = 0;
  for (const t of thayDoi) {
    if (t.hanhDong === 'giu') continue;
    // Khối cây do MÁY sinh (luật §L11 mục 9) — hồ sơ chỉ được ghi "giu".
    if (t.kind === 'cay' || t.kind.startsWith('cay.')) {
      throw new Error(`${t.kind}[${t.idx}]: khối máy sinh, không được sửa/xoá bằng hồ sơ soát`);
    }
    if (t.hanhDong === 'xoa') {
      if (t.idx == null) throw new Error(`xoa cần index có [i]: ${t.kind}`);
      if (!Array.isArray(obj[t.kind])) throw new Error(`không xoá được: ${t.kind} không phải mảng`);
      // Chạy lại (idempotent): nếu mảng đã rỗng thì mục đã bị xoá ở lượt trước — bỏ qua, KHÔNG xoá nhầm.
      if (obj[t.kind].length === 0) { console.log(`    (bỏ qua xoá ${t.kind}[${t.idx}]: mảng đã rỗng — đã áp ở lượt trước)`); continue; }
      if (t.idx < 0 || t.idx >= obj[t.kind].length) throw new Error(`index ngoài mảng: ${t.kind}[${t.idx}]`);
      obj[t.kind].splice(t.idx, 1); xoa += 1;
      continue;
    }
    if (t.hanhDong !== 'sua') throw new Error(`${t.kind}[${t.idx}]: hanhDong không hợp lệ (${t.hanhDong})`);
    const target = t.idx == null ? obj[t.kind] : (obj[t.kind] || [])[t.idx];
    if (!target) throw new Error(`Không tìm thấy ${t.kind}[${t.idx}]`);
    for (const [k, v] of Object.entries(t.sua || {})) {
      if (JSON.stringify(target[k]) !== JSON.stringify(v)) { target[k] = v; sua.push(`${t.kind}[${t.idx}].${k}`); }
    }
  }
  return { sua, xoa };
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

console.log(`TARGET=${TARGET}  APPLY=${APPLY ? 'GHI' : 'DRY-RUN'}  lô 063 = ${NHOM_CUA_LO.join(', ')}`);
const tong = { sua: 0, xoa: 0, nguonLoai: 0, nhom: 0 };
for (const nhom of NHOM_CUA_LO) {
  const file = path.join(TARGET_DIR, `${nhom}.json`);
  const rvPath = path.join(ROOT, 'review', `${nhom}.json`);
  if (!fs.existsSync(file) || !fs.existsSync(rvPath)) { console.log(`[${nhom}] bỏ (thiếu tệp)`); continue; }
  const review = JSON.parse(fs.readFileSync(rvPath, 'utf8'));
  const obj = JSON.parse(fs.readFileSync(file, 'utf8'));
  const list = normalize(review);
  // TARGET=data: data/so-tay/<nhom>.json vừa được build lại từ tmp/so-tay/raw (đã áp thayDoi rồi),
  // nên ở pha này CHỈ đổi nguonLoai — không áp lại thayDoi (sẽ chèn trùng mục).
  const r = TARGET === 'data' ? { sua: [], xoa: 0 } : applyThayDoi(obj, list);
  const nl = TARGET === 'data' ? applyNguonLoai(obj) : 0;
  tong.sua += r.sua.length; tong.xoa += r.xoa; tong.nguonLoai += nl; tong.nhom += 1;
  console.log(`[${nhom}] review ${list.length} mục → sửa ${r.sua.length} (${r.sua.join('; ') || '-'}), `
    + `xoá ${r.xoa}, đổi nguonLoai ${nl}${APPLY ? ' — ĐÃ GHI' : ''}`);
  // build-so-tay.mjs ghi JSON.stringify(..., 1) KHÔNG kèm newline cuối — giữ đúng quy ước đó cho data/.
  // Bản nháp tmp/so-tay/raw người soạn dùng thụt lề 2 — giữ nguyên để diff soát đọc được.
  if (APPLY) fs.writeFileSync(file, JSON.stringify(obj, null, TARGET === 'data' ? 1 : 2), 'utf8');
}
console.log(`Tổng: ${tong.nhom} nhóm, sửa ${tong.sua}, xoá ${tong.xoa}, đổi nguonLoai ${tong.nguonLoai}.`);
