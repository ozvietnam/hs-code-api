#!/usr/bin/env node
/**
 * scripts/apply-review-lo032.mjs — Áp kết quả SOÁT ĐỘC LẬP lô 032 (PR #421; nhóm 5513/5702/5909/6105/6202/6211).
 *
 * Cùng cách 2 pha của apply-review-lo015.mjs:
 *   TARGET=raw  node scripts/apply-review-lo032.mjs           (dry-run)
 *   TARGET=raw  APPLY=1 node scripts/apply-review-lo032.mjs  (ghi tmp/so-tay/raw/)
 *   TARGET=data APPLY=1 node scripts/apply-review-lo032.mjs  (ghi data/so-tay/: CHỈ đổi nguonLoai)
 *
 * Khác apply-review-lo015 ở một chỗ: thay đổi được áp theo HAI LƯỢT —
 *   lượt 1 'sua' theo thứ tự mảng, lượt 2 'xoa' theo index GIẢM DẦN.
 * Nếu áp lẫn, một mục 'xoa' ở index thấp làm lệch mọi index cao hơn kế tiếp trong cùng mảng
 * (lô 032 có xoá dieuKienVao[0] của 5702 và dieuKienVao[2] của 6211 rồi sửa phamVi của 6211
 *  — vẫn phải chống để lô sau không dính).
 *
 * Luật §L11: chỉ người soát độc lập đổi nguonLoai AI_DA_KIEM -> NGUOI_DUYET, và chỉ cho khối đã
 * soi: phamVi / boPhan / dieuKienVao / loaiTru / phanBiet. KHÔNG đụng tieuChi6 / dong8 / cay.
 *
 * review/<nhom>.json của lô 032 là {nhom, nguoiSoat, luc, soat, sua, xoa, giu,
 * ghiChu, thayDoi:[{index:"truong[i]", hanhDong:"giu"|"sua"|"xoa", lyDo, sua?}]} (mẫu review/8460.json).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const NHOM_CUA_LO = (process.env.NHOM || '5513,5702,5909,6105,6202,6211').split(',');
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

/** Chuẩn hoá về [{kind, idx, hanhDong, sua}]; chấp nhận cả {truong,index} lẫn index dạng chuỗi. */
function normalize(review) {
  const list = Array.isArray(review) ? review : (review.thayDoi || []);
  return list.map((t) => {
    const kind = t.truong || parseIndex(t.index).kind;
    // phamVi/boPhan là đối tượng đơn nên bỏ qua index, kể cả khi review ghi 0.
    if (KINDS_SINGLE.includes(kind)) return { kind, idx: null, hanhDong: t.hanhDong, sua: t.sua || null };
    const idx = t.index != null && /^\d+$/.test(String(t.index)) ? Number(t.index) : parseIndex(t.index).idx;
    return { kind, idx, hanhDong: t.hanhDong, sua: t.sua || null };
  });
}

/** Lượt 1: sửa. Lượt 2: xoá theo index giảm dần (mỗi mảng độc lập). */
function applyThayDoi(obj, thayDoi) {
  const sua = []; let xoa = 0;
  for (const t of thayDoi.filter((x) => x.hanhDong === 'sua')) {
    const target = t.idx == null ? obj[t.kind] : (obj[t.kind] || [])[t.idx];
    if (!target) throw new Error(`Không tìm thấy ${t.kind}[${t.idx}] để sửa`);
    for (const [k, v] of Object.entries(t.sua || {})) {
      if (JSON.stringify(target[k]) !== JSON.stringify(v)) { target[k] = v; sua.push(`${t.kind}${t.idx != null ? `[${t.idx}]` : ''}.${k}`); }
    }
  }
  const xoas = thayDoi.filter((x) => x.hanhDong === 'xoa').sort((a, b) => (b.idx ?? 1e9) - (a.idx ?? 1e9));
  for (const t of xoas) {
    if (t.idx == null) throw new Error(`xoa cần index có [i]: ${t.kind}`);
    if (!Array.isArray(obj[t.kind])) throw new Error(`không xoá được: ${t.kind} không phải mảng`);
    if (t.idx < 0 || t.idx >= obj[t.kind].length) throw new Error(`index ngoài mảng: ${t.kind}[${t.idx}] (dài ${obj[t.kind].length})`);
    obj[t.kind].splice(t.idx, 1); xoa += 1;
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

console.log(`TARGET=${TARGET}  APPLY=${APPLY ? 'GHI' : 'DRY-RUN'}  lô 032 = ${NHOM_CUA_LO.join(', ')}`);
const tong = { sua: 0, xoa: 0, giu: 0, nguonLoai: 0, nhom: 0 };
for (const nhom of NHOM_CUA_LO) {
  const file = path.join(TARGET_DIR, `${nhom}.json`);
  const rvPath = path.join(ROOT, 'review', `${nhom}.json`);
  if (!fs.existsSync(file) || !fs.existsSync(rvPath)) { console.log(`[${nhom}] bỏ (thiếu tệp)`); continue; }
  const review = JSON.parse(fs.readFileSync(rvPath, 'utf8'));
  const raw = fs.readFileSync(file, 'utf8');
  const obj = JSON.parse(raw);
  const list = normalize(review);
  const nGiu = list.filter((t) => t.hanhDong === 'giu').length;
  const nXoa = list.filter((t) => t.hanhDong === 'xoa').length;
  if (review.soat !== list.length) throw new Error(`${nhom}: soat=${review.soat} ≠ ${list.length} mục trong thayDoi`);
  if (review.xoa !== nXoa) throw new Error(`${nhom}: xoa=${review.xoa} ≠ ${nXoa} mục xoa trong thayDoi`);
  // TARGET=data: data/so-tay/<nhom>.json vừa được build lại từ tmp/so-tay/raw (đã áp thayDoi rồi),
  // nên ở pha này CHỈ đổi nguonLoai — không áp lại thayDoi (sẽ chèn trùng mục, đã dính ở lô 007).
  const r = TARGET === 'data' ? { sua: [], xoa: 0 } : applyThayDoi(obj, list);
  const nl = TARGET === 'data' ? applyNguonLoai(obj) : 0;
  tong.sua += r.sua.length; tong.xoa += r.xoa; tong.giu += nGiu; tong.nguonLoai += nl; tong.nhom += 1;
  console.log(`[${nhom}] soát ${list.length} → giữ ${nGiu}, sửa ${r.sua.length} (${r.sua.join('; ') || '-'}), `
    + `xoá ${r.xoa}, đổi nguonLoai ${nl}${APPLY ? ' — ĐÃ GHI' : ''}`);
  // build-so-tay.mjs ghi JSON.stringify(..., 1) KHÔNG kèm newline cuối — giữ đúng quy ước đó cho data/.
  // Bản nháp tmp/so-tay/raw: GIỮ NGUYÊN thụt lề của tệp gốc (lô này người soạn dùng 1, lô 015 dùng 2) —
  // ghi lệch thụt lề làm diff toàn tệp, hồ sơ soát không đọc được.
  // KHÔNG ghi lại tệp khi không có thay đổi nào: JSON.stringify mở rộng lại các mảng
  // viết cẩm (vd dong8[].dieuKienSo của 7311) làm nhiễu diff dù nội dung y nguyên.
  const doiThayDoi = TARGET === "data" ? nl > 0 : (r.sua.length > 0 || r.xoa > 0);
  if (APPLY && doiThayDoi) {
    const indent = TARGET === "data" ? 1 : (raw.match(/\n( +)\S/)?.[1].length ?? 2);
    fs.writeFileSync(file, JSON.stringify(obj, null, indent), 'utf8');
  }
}
console.log(`Tổng: ${tong.nhom} nhóm, soát ${tong.giu + tong.sua + tong.xoa} mục — giữ ${tong.giu}, sửa ${tong.sua}, xoá ${tong.xoa}, đổi nguonLoai ${tong.nguonLoai}.`);