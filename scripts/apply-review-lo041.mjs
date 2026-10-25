#!/usr/bin/env node
/**
 * scripts/apply-review-lo041.mjs — Áp kết quả SOÁT ĐỘC LẬP lô 041 (PR #436, nhóm 0302/0303/0304/0305/0306/0307).
 *
 * Dựa trên apply-review-lo038.mjs, bổ sung ba điều lô 041 dùng:
 *   1) `chen` — CHÈN mục mới vào mảng tại vị trí `index` (mảng loạiTru của 0305 và 0307);
 *   2) `xoa` với index KHÔNG có [i] (vd "phamVi") — XOÁ HẲN khóa đối tượng khỏi bản nháp
 *      (không gán null: loader lib/so-tay.js:407 chỉ nạp phamVi nếu có, null sẽ vỡ máy kiểm);
 *   3) index lồng "cay.tenDien[0]".
 *
 * BẪY ĐÃ BIẾT (memory `so-tay-apply-review-2-phase`, lô 021/022/027):
 *   - áp hết `sua` XONG mới áp `xoa`; `xoa` đi theo index GIẢM DẦN trong từng mảng;
 *   - `chen` áp SAU CÙNG (vì chèn làm dịch chỉ số các mục phía sau) — trong lô 041 mọi mục chèn
 *     đều chèn ở CUỐI mảng nên không đụng index của mục cũ;
 *   - GIỮ THỤT LỀ + dấu xuống dòng của tệp gốc (đọc từ tệp, không hard-code);
 *   - KHÔNG ghi lại tệp khi không có thay đổi nào.
 *
 *   TARGET=raw  node scripts/apply-review-lo041.mjs           (dry-run)
 *   TARGET=raw  APPLY=1 node scripts/apply-review-lo041.mjs  (ghi tmp/so-tay/raw/)
 *   TARGET=data APPLY=1 node scripts/apply-review-lo041.mjs  (ghi data/so-tay/: CHỈ đổi nguonLoai)
 *
 * Luật §L11: chỉ người soát độc lập được đổi nguonLoai AI_DA_KIEM -> NGUOI_DUYET, và chỉ cho khối
 * đã soi: phamVi / boPhan / dieuKienVao / loaiTru / phanBiet. KHÔNG đụng tieuChi6 / dong8 / cay —
 * đúng tiền lệ 217 nhóm đã soát trong data/so-tay (0 nhóm lẫn lộn nhãn).
 *
 * LƯU Ý THỨ TỰ (memory `so-tay-apply-review-2-phase`): pha `TARGET=data` KHÔNG được áp lại
 * `thayDoi` — data/so-tay vừa được build lại từ tmp/so-tay/raw đã có thay đổi, áp lại sẽ chèn trùng mục.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const NHOM_CUA_LO = (process.env.NHOM || '0302,0303,0304,0305,0306,0307').split(',');
const TARGET = process.env.TARGET || 'raw';
const TARGET_DIR = TARGET === 'data' ? path.join(ROOT, 'data/so-tay') : path.join(ROOT, 'tmp/so-tay/raw');
const APPLY = process.env.APPLY === '1';
const KINDS_SINGLE = ['phamVi', 'boPhan'];
const KINDS_ARR = ['dieuKienVao', 'loaiTru', 'phanBiet'];

function parseIndex(index) {
  const m = String(index).match(/^([a-zA-Z_][a-zA-Z0-9]*)(\.[a-zA-Z_][a-zA-Z0-9]*)?(?:\[(\d+)\])?$/);
  if (!m) throw new Error(`Không parse được index: ${index}`);
  return { kind: m[2] ? `${m[1]}.${m[2]}` : m[1], idx: m[3] != null ? Number(m[3]) : null };
}

/** Lấy vật thể đích theo index (hỗ trợ "cay.tenDien[0]"). */
function doiTuong(obj, kind, idx) {
  if (kind.includes('.')) {
    const [a, b] = kind.split('.');
    const goc = obj[a];
    if (!goc) throw new Error(`Không tìm thấy nhóm ${a}`);
    const arr = goc[b];
    if (!Array.isArray(arr)) throw new Error(`${kind} không phải mảng`);
    if (idx == null) return arr;
    if (!arr[idx]) throw new Error(`Không tìm thấy ${kind}[${idx}]`);
    return arr[idx];
  }
  if (idx == null) {
    if (!obj[kind]) throw new Error(`Không tìm thấy ${kind}`);
    return obj[kind];
  }
  const arr = obj[kind];
  if (!Array.isArray(arr)) throw new Error(`${kind} không phải mảng`);
  if (!arr[idx]) throw new Error(`Không tìm thấy ${kind}[${idx}]`);
  return arr[idx];
}

/** Sửa theo index GỐC (không xoá, không chèn). */
function apSua(obj, thayDoi) {
  const sua = [];
  for (const t of thayDoi) {
    if (t.hanhDong !== 'sua') continue;
    const { kind, idx } = parseIndex(t.index);
    const target = doiTuong(obj, kind, idx);
    for (const [k, v] of Object.entries(t.sua || {})) {
      if (JSON.stringify(target[k]) !== JSON.stringify(v)) { target[k] = v; sua.push(`${t.index}.${k}`); }
    }
  }
  return sua;
}

/** Xoá theo index GỐC, giảm dần trong từng mảng; index không có [i] → xoá hẳn khóa. */
function apXoa(obj, thayDoi) {
  const theoMang = new Map();
  const xoaKey = [];
  let xoa = 0;
  for (const t of thayDoi) {
    if (t.hanhDong !== 'xoa') continue;
    const { kind, idx } = parseIndex(t.index);
    if (idx == null) {
      if (!KINDS_SINGLE.includes(kind)) throw new Error(`xoa khóa đối tượng chỉ cho phép ${KINDS_SINGLE.join('/')}: ${t.index}`);
      xoaKey.push(kind);
      xoa += 1;
      continue;
    }
    if (!Array.isArray(obj[kind])) throw new Error(`không xoá được: ${kind} không phải mảng`);
    if (idx < 0 || idx >= obj[kind].length) throw new Error(`index ngoài mảng: ${t.index}`);
    if (!theoMang.has(kind)) theoMang.set(kind, []);
    theoMang.get(kind).push(idx);
    xoa += 1;
  }
  for (const [kind, idxs] of theoMang) {
    for (const i of [...new Set(idxs)].sort((a, b) => b - a)) obj[kind].splice(i, 1);
  }
  for (const k of xoaKey) { delete obj[k]; }
  return xoa;
}

/** Chèn mục mới vào mảng tại vị trí `index` (áp SAU CÙNG: chèn làm dịch chỉ số). */
function apChen(obj, thayDoi) {
  const chen = [];
  for (const t of thayDoi) {
    if (t.hanhDong !== 'chen') continue;
    const { kind, idx } = parseIndex(t.index);
    if (idx == null) throw new Error(`chen cần index có [i]: ${t.index}`);
    const arr = obj[kind];
    if (!Array.isArray(arr)) throw new Error(`chen cần mảng: ${kind}`);
    if (idx < 0 || idx > arr.length) throw new Error(`index chèn ngoài mảng: ${t.index} (len ${arr.length})`);
    if (!t.muc || typeof t.muc !== 'object') throw new Error(`chen cần trường "muc": ${t.index}`);
    arr.splice(idx, 0, t.muc);
    chen.push(`${kind}[${idx}]`);
  }
  return chen;
}

function apNguonLoai(obj) {
  let changes = 0;
  const doi = (it) => { if (it && typeof it === 'object' && it.nguonLoai === 'AI_DA_KIEM') { it.nguonLoai = 'NGUOI_DUYET'; changes += 1; } };
  for (const kind of KINDS_SINGLE) doi(obj[kind]);
  for (const kind of KINDS_ARR) if (Array.isArray(obj[kind])) obj[kind].forEach(doi);
  return changes;
}

/** Thụt lề + dấu xuống dòng của tệp gốc (data/so-tay ghi 1 dấu cách, bản nháp dùng 1). */
function hinhDangGoc(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const indent = (raw.match(/\n(\s+)\S/) || [, ''])[1] ?? 2;
  const pad = indent.startsWith(' ') && !indent.startsWith('  ') ? 1 : indent.length || 2;
  return { indent: pad, trailing: raw.endsWith('\n') ? '\n' : '' };
}

console.log(`TARGET=${TARGET}  APPLY=${APPLY ? 'GHI' : 'DRY-RUN'}  lô 041 = ${NHOM_CUA_LO.join(', ')}`);
const tong = { sua: 0, xoa: 0, chen: 0, giu: 0, nguonLoai: 0, soat: 0 };
for (const nhom of NHOM_CUA_LO) {
  const file = path.join(TARGET_DIR, `${nhom}.json`);
  const rvPath = path.join(ROOT, 'review', `${nhom}.json`);
  if (!fs.existsSync(file)) { console.log(`[${nhom}] KHÔNG thấy ${file}, bỏ`); continue; }
  if (!fs.existsSync(rvPath)) { console.log(`[${nhom}] KHÔNG có review/, bỏ`); continue; }
  const review = JSON.parse(fs.readFileSync(rvPath, 'utf8'));
  const obj = JSON.parse(fs.readFileSync(file, 'utf8'));
  let sua = []; let xoa = 0; let chen = [];
  if (TARGET === 'data') {
    // data/so-tay/<nhom>.json vừa được build lại từ tmp/so-tay/raw (đã áp thayDoi rồi) → CHỈ đổi nguonLoai.
    sua = []; xoa = 0; chen = [];
  } else {
    sua = apSua(obj, review.thayDoi || []);
    xoa = apXoa(obj, review.thayDoi || []);
    chen = apChen(obj, review.thayDoi || []);
  }
  const giu = (review.thayDoi || []).filter((t) => t.hanhDong === 'giu').length;
  const nl = TARGET === 'data' ? apNguonLoai(obj) : 0;
  const coThayDoi = !!(sua.length || xoa || chen.length || nl);
  tong.sua += sua.length; tong.xoa += xoa; tong.chen += chen.length; tong.giu += giu; tong.nguonLoai += nl; tong.soat += review.soat || 0;
  console.log(`[${nhom}] soát ${review.soat} mục → giu ${giu}, sửa ${sua.length} (${sua.join('; ') || '-'}), `
    + `xoá ${xoa}, chèn ${chen.length ? chen.join('; ') : 0}, đổi nguonLoai ${nl}`);
  if (APPLY && coThayDoi) {
    const { indent, trailing } = hinhDangGoc(file);
    fs.writeFileSync(file, JSON.stringify(obj, null, indent) + trailing, 'utf8');
    console.log('         → ĐÃ GHI');
  } else if (APPLY) {
    console.log('         không có thay đổi nào → không ghi lại tệp (giữ nguyên thụt lề và mọi ký tự)');
  }
}
console.log(`Tổng: soát ${tong.soat} mục, giu ${tong.giu}, sửa ${tong.sua}, xoá ${tong.xoa}, chèn ${tong.chen}, nguonLoai ${tong.nguonLoai}.`);
