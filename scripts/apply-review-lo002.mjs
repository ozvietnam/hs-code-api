#!/usr/bin/env node
/**
 * scripts/apply-review-lo002.mjs — Áp kết quả soát độc lập PR #368.
 *   PHASE 1 (RAW): áp `thayDoi` (sửa value/...) lên tmp/so-tay/raw/<nhom>.json
 *                  rồi chạy `node scripts/check-so-tay.mjs --raw=tmp/so-tay/raw`.
 *   Sau khi `node scripts/build-so-tay.mjs --nhom=... --tu-tep=... --force --nguoi-soan="NGUOI_DUYET"`
 *   đã ghi lại data/so-tay/<nhom>.json:
 *   PHASE 2 (DATA): đổi `nguonLoai: AI_DA_KIEM` -> `NGUOI_DUYET` của mọi mục đã soát
 *                  (khối phamVi/boPhan + mảng dieuKienVao/loaiTru/phanBiet). Máy gán mặc định
 *                  AI_DA_KIEM khi nạp; chỉ người soát độc lập mới được đổi (luật §L11).
 *                  KHÔNG đụng tới tieuChi6, dong8, tieuChi6, cay (đó là khối máy suy hoặc
 *                  (tax / wco) -- khong phai pham vi soat doc lap).
 *
 * CLI:
 *   TARGET=raw  node scripts/apply-review-lo002.mjs          (mặc định, dry-run)
 *   TARGET=raw  APPLY=1 node scripts/apply-review-lo002.mjs (ghi raw/)
 *   TARGET=data  node scripts/apply-review-lo002.mjs         (mặc định, dry-run)
 *   TARGET=data  APPLY=1 node scripts/apply-review-lo002.mjs (ghi data/)
 *
 * Đây là single-purpose script cho lô 002; KHÔNG dùng cho lô khác trừ khi sửa lại.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const REVIEW_DIR = path.join(ROOT, 'review');
const TARGET = process.env.TARGET || 'raw';
const TARGET_DIR = TARGET === 'data' ? path.join(ROOT, 'data/so-tay') : path.join(ROOT, 'tmp/so-tay/raw');
const AUDITED_KINDS_SINGLE = ['phamVi', 'boPhan']; // mỗi cái là 1 object
const AUDITED_KINDS_ARR = ['dieuKienVao', 'loaiTru', 'phanBiet']; // mỗi cái là mảng
const APPLY = process.env.APPLY === '1';

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function saveJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, ' ') + '\n', 'utf8');
}

function applyThayDoi(obj, thayDoi) {
  let changes = 0;
  for (const t of thayDoi) {
    const m = String(t.index || '').match(/^([a-zA-Z_][a-zA-Z0-9]*)(?:\[(\d+)\])?$/);
    if (!m) throw new Error(`Không parse được index: ${t.index}`);
    const kind = m[1];
    const idx = m[2] != null ? Number(m[2]) : null;
    const arr = idx != null ? obj[kind] : null;
    const target = idx != null ? arr[idx] : obj[kind];
    if (!target) throw new Error(`Không tìm thấy ${t.index}`);
    if (t.sua && typeof t.sua === 'object') {
      for (const [k, v] of Object.entries(t.sua)) {
        if (JSON.stringify(target[k]) !== JSON.stringify(v)) {
          target[k] = v;
          changes += 1;
        }
      }
    }
  }
  return changes;
}

function applyNguonLoai(obj) {
  let changes = 0;
  for (const kind of AUDITED_KINDS_SINGLE) {
    const item = obj[kind];
    if (item && item.nguonLoai === 'AI_DA_KIEM') {
      item.nguonLoai = 'NGUOI_DUYET';
      changes += 1;
    }
  }
  for (const kind of AUDITED_KINDS_ARR) {
    if (Array.isArray(obj[kind])) {
      for (const it of obj[kind]) {
        if (it && it.nguonLoai === 'AI_DA_KIEM') {
          it.nguonLoai = 'NGUOI_DUYET';
          changes += 1;
        }
      }
    }
  }
  return changes;
}

const reviewFiles = fs.readdirSync(REVIEW_DIR).filter((f) => /^\d{4}\.json$/.test(f)).sort();
let totalChanges = 0;
console.log(`TARGET=${TARGET}  APPLY=${APPLY ? 'GHI' : 'DRY-RUN'}`);
for (const f of reviewFiles) {
  const nhom = f.slice(0, 4);
  const reviewPath = path.join(REVIEW_DIR, f);
  const dataPath = path.join(TARGET_DIR, f);
  if (!fs.existsSync(dataPath)) {
    console.log(`[${nhom}] KHÔNG thấy ${dataPath}, bỏ`);
    continue;
  }
  const review = loadJson(reviewPath);
  const obj = loadJson(dataPath);
  const c1 = applyThayDoi(obj, review.thayDoi || []);
  const c2 = TARGET === 'data' ? applyNguonLoai(obj) : 0;
  const c = c1 + c2;
  totalChanges += c;
  if (c > 0) {
    const detail = TARGET === 'data' ? `thayDoi=${c1}, nguonLoai=${c2}` : `thayDoi=${c1}`;
    console.log(`[${nhom}] sẽ áp ${c} mục (${detail})${APPLY ? ' — ĐÃ GHI' : ''}`);
    if (APPLY) saveJson(dataPath, obj);
  } else {
    console.log(`[${nhom}] không có thay đổi`);
  }
}
console.log(`Tổng mục đã áp: ${totalChanges}.`);
