#!/usr/bin/env node
/**
 * scripts/apply-review-lo088.mjs — Áp kết quả SOÁT ĐỘC LẬP lô 088 (nhóm 2843, 2844, 2845, 2846, 2847, 2849).
 *
 * Cùng cách làm của apply-review-lo067.mjs (2 pha, KHÔNG bao giờ áp thayDoi lên data), thêm hai thứ:
 *
 *  1) `chen` có THÊM `viTri` (vị trí chèn, 0-based) thay vì luôn chèn cuối mảng. Lô 088 tách
 *     câu loại trừ cacbua silic của 2849 thành hai vế (bột/hạt → 68.05; bánh xe nghiền → 68.04),
 *     nên phải chèn mục mới NGAY SAU vế cũ để hai vế đứng cạnh nhau — và để phanBiet mới không rơi
 *     vào vị trí bị runtime cắt (`s.phanBiet.slice(0, 4)`, lib/so-tay-gates.js).
 *  2) `sua`/`xoa`/`giu` dùng index của BẢN NHÁP GỐC; `chen` không mang index mục mà mang `viTri`.
 *
 *   TARGET=raw  node scripts/apply-review-lo088.mjs           (dry-run)
 *   TARGET=raw  APPLY=1 node scripts/apply-review-lo088.mjs  (ghi tmp/so-tay/raw/)
 *   TARGET=data APPLY=1 node scripts/apply-review-lo088.mjs  (ghi data/so-tay/: CHỈ đổi nguonLoai)
 *
 * Luật §L11: chỉ người soát độc lập đổi nguonLoai AI_DA_KIEM -> NGUOI_DUYET, và chỉ cho khối đã
 * soi: phamVi / boPhan / dieuKienVao / loaiTru / phanBiet. KHÔNG đụng tieuChi6 / dong8 / cay.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const NHOM_CUA_LO = (process.env.NHOM || '2843,2844,2845,2846,2847,2849').split(',');
const TARGET = process.env.TARGET || 'raw';
const TARGET_DIR = TARGET === 'data' ? path.join(ROOT, 'data/so-tay') : path.join(ROOT, 'tmp/so-tay/raw');
const APPLY = process.env.APPLY === '1';
const KINDS_SINGLE = ['phamVi', 'boPhan'];
const KINDS_ARR = ['dieuKienVao', 'loaiTru', 'phanBiet'];

function parseIndex(index) {
  // Cho phép kind có dấu chấm (cay.tenDien[i]) — hồ sơ soát ghi MỘT dòng cho MỌI mục.
  const m = String(index).match(/^([a-zA-Z_][a-zA-Z0-9_.]*)(?:\[(\d+)\])?$/);
  if (!m) throw new Error(`Không parse được index: ${index}`);
  return { kind: m[1], idx: m[2] != null ? Number(m[2]) : null };
}

/** Chuẩn hoá review về [{kind, idx, hanhDong, sua, muc, viTri}] cho cả hai dạng tệp. */
function normalize(review) {
  const list = Array.isArray(review) ? review : (review.thayDoi || []);
  return list.map((t) => {
    const { kind, idx } = parseIndex(t.index ?? t.truong);
    // `chen` không mang index mục: kind là tên mảng, `viTri` là vị trí chèn.
    if (t.hanhDong === 'chen') {
      return { kind, idx: null, hanhDong: 'chen', sua: null, muc: t.muc || null, viTri: Number.isInteger(t.viTri) ? t.viTri : null };
    }
    // phamVi/boPhan là đối tượng đơn (không phải mảng) nên bỏ qua index, kể cả khi review ghi 0.
    if (KINDS_SINGLE.includes(kind)) return { kind, idx: null, hanhDong: t.hanhDong, sua: t.sua || null, muc: null, viTri: null };
    const i = t.index != null && /^\d+$/.test(String(t.index)) ? Number(t.index) : idx;
    return { kind, idx: i, hanhDong: t.hanhDong, sua: t.sua || null, muc: null, viTri: null };
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
  // THỨ TỰ: 1) SỬA trước — index GỐC còn nguyên; 2) XOÁ sau, theo index GIẢM DẦN trong từng khối
  // (xoá index 0 làm lệch index 1); 3) CHÈN cuối cùng (theo `viTri` nếu có) — không làm lệch index
  // của mục đã xử lý.
  const suaList = thayDoi.filter((t) => t.hanhDong === 'sua');
  const xoaList = thayDoi.filter((t) => t.hanhDong === 'xoa')
    .slice().sort((a, b) => (a.kind === b.kind ? b.idx - a.idx : (a.kind < b.kind ? -1 : 1)));
  for (const t of [...suaList, ...xoaList]) {
    // Khối cây do MÁY sinh (luật §L11 mục 9) — hồ sơ chỉ được ghi "giu".
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
    if (t.kind === 'cay' || t.kind.startsWith('cay.')) {
      throw new Error(`${t.kind}: khối máy sinh, không được chèn bằng hồ sơ soát`);
    }
    const arr = container(obj, t.kind);
    if (!Array.isArray(arr)) throw new Error(`không chèn được: ${t.kind} không phải mảng`);
    if (!t.muc || typeof t.muc !== 'object') throw new Error(`${t.kind}: chèn cần trường "muc"`);
    // CHÈN idempotent: nếu mục đã có trong mảng (áp lại lần 2) thì bỏ qua, KHÔNG nhân đôi.
    const trùng = arr.some((x) => JSON.stringify(x) === JSON.stringify(t.muc));
    if (trùng) { console.log(`    (bỏ qua chèn ${t.kind}: mục đã có — đã áp ở lượt trước)`); continue; }
    const viTri = t.viTri == null ? arr.length : Math.max(0, Math.min(t.viTri, arr.length));
    arr.splice(viTri, 0, t.muc); chen += 1;
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

console.log(`TARGET=${TARGET}  APPLY=${APPLY ? 'GHI' : 'DRY-RUN'}  lô 088 = ${NHOM_CUA_LO.join(', ')}`);
const tong = { sua: 0, xoa: 0, chen: 0, nguonLoai: 0, nhom: 0 };
for (const nhom of NHOM_CUA_LO) {
  const file = path.join(TARGET_DIR, `${nhom}.json`);
  const rvPath = path.join(ROOT, 'review', `${nhom}.json`);
  if (!fs.existsSync(file) || !fs.existsSync(rvPath)) { console.log(`[${nhom}] bỏ (thiếu tệp)`); continue; }
  const review = JSON.parse(fs.readFileSync(rvPath, 'utf8'));
  const obj = JSON.parse(fs.readFileSync(file, 'utf8'));
  const list = normalize(review);
  // TARGET=data: data/so-tay/<nhom>.json vừa được build lại từ tmp/so-tay/raw (đã áp thayDoi rồi),
  // nên ở pha này CHỈ đổi nguonLoai — không áp lại thayDoi (sẽ chèn trùng mục).
  const r = TARGET === 'data' ? { sua: [], xoa: 0, chen: 0 } : applyThayDoi(obj, list);
  const nl = TARGET === 'data' ? applyNguonLoai(obj) : 0;
  tong.sua += r.sua.length; tong.xoa += r.xoa; tong.chen += r.chen; tong.nguonLoai += nl; tong.nhom += 1;
  console.log(`[${nhom}] review ${list.length} mục → sửa ${r.sua.length} (${r.sua.join('; ') || '-'}), `
    + `xoá ${r.xoa}, chèn ${r.chen}, đổi nguonLoai ${nl}${APPLY ? ' — ĐÃ GHI' : ''}`);
  // build-so-tay.mjs ghi JSON.stringify(..., 1) KHÔNG kèm newline cuối — giữ đúng quy ước đó cho data/.
  // Bản nháp tmp/so-tay/raw người soạn dùng thụt lề 2 — giữ nguyên để diff soát đọc được.
  if (APPLY) fs.writeFileSync(file, JSON.stringify(obj, null, TARGET === 'data' ? 1 : 2), 'utf8');
}
console.log(`Tổng: ${tong.nhom} nhóm, sửa ${tong.sua}, xoá ${tong.xoa}, chèn ${tong.chen}, đổi nguonLoai ${tong.nguonLoai}.`);
