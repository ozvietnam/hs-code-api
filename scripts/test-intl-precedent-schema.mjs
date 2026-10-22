#!/usr/bin/env node
/**
 * Issue #359 Lỗi 2 — schema máy cho mọi bản ghi tiền lệ QUỐC TẾ (kind `intl-precedent`, B-3 bước 12).
 *
 * Ca thật (20/10): record TCO Úc 1679759 (glovebox phòng thí nghiệm) lọt vào kho với
 *   outcome = "842139"  (đây là MÃ HS, không phải enum kết luận)
 *   outcomeHs = "00842139" (đệm 0 BÊN TRÁI — mã HS phải đệm bên PHẢI: 842139 → 84213900)
 * Người đọc `/api/precedents` thấy `outcome: "842139"` tưởng là trạng thái vô nghĩa;
 * `outcomeHs` sai phía ⇒ mọi so khớp theo outcomeHs (đếm nguồn đồng thuận NGUON_B, soNguonDongThuan) rơi.
 *
 * scripts/validate-community.mjs đã kiểm dấu vết + giấy phép nguồn; script này kiểm phần
 * CÒN THIẾU: enum kết luận + outcomeHs 8 số + nhãn xacMinh (CHUA trong khi đã có bản chụp + URL).
 *
 * Chạy trong `npm test` — tệp lô mới sai định dạng thì CI đỏ ngay lúc nộp.
 */
import './test-isolate-data.mjs';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { loadFlatPrecedents } = require('../lib/precedent-search.js');

let passed = 0;
let failed = 0;
function assert(name, cond, detail) {
  if (cond) { console.log('PASS', name); passed += 1; }
  else { console.log('FAIL', name, detail || ''); failed += 1; }
}

// Enum kết luận: precedent là văn bản ĐÃ CHỐT một mã, nên kết luận luôn là kết quả phân loại.
// `outcome` trong kho thực chất là MÃ HS mà văn bản chốt — đọc ở đâc tả thành enum.
const OUTCOME_ENUM = new Set(['APPROVED', 'REJECTED', 'PENDING', 'NO_RULING']);

// ── Lớp 1: tệp lô nộp (data/community/intl-precedents/**) ──────────────────────
const LOT_DIR = path.join(ROOT, 'data', 'community', 'intl-precedents');
const lots = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.json')) lots.push(p);
  }
})(LOT_DIR);

let recCount = 0;
const lotBad = [];
const lotThieu = [];
for (const file of lots) {
  const rel = path.relative(ROOT, file);
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert(`${rel}: kind = intl-precedent`, doc.kind === 'intl-precedent', String(doc.kind));
  for (const [i, r] of (doc.records || []).entries()) {
    recCount += 1;
    const at = `${rel}[${i}]`;
    // Trường kết luận là TÙY CHỌN ở tệp lô (mã lấy từ hsCode) — nhưng nếu có thì phải đúng enum.
    if (r.outcome !== undefined && !OUTCOME_ENUM.has(String(r.outcome))) {
      lotBad.push(`${at}.outcome = ${JSON.stringify(r.outcome)} (phải là enum: ${[...OUTCOME_ENUM].join(', ')})`);
    }
    if (r.outcomeHs !== undefined && !/^\d{8}$/.test(String(r.outcomeHs))) {
      lotBad.push(`${at}.outcomeHs = ${JSON.stringify(r.outcomeHs)} (phải đúng 8 chữ số, đệm 0 BÊN PHẢI)`);
    }
    if (r.outcomeHs !== undefined && String(r.hsCode || '').slice(0, 4) !== String(r.outcomeHs).slice(0, 4)) {
      lotBad.push(`${at}.outcomeHs ${r.outcomeHs} không cùng nhóm với hsCode ${r.hsCode}`);
    }
    // Bước 12: tệp lô KHÔNG bắt buộc khai nhãn (máy tự tính lúc chạy ở Lớp 2) — nhưng nếu
    // đã khai thì phải đúng 3 giá trị, và không được khai CHUA khi đã có đủ dấu vết.
    if (r.xacMinh !== undefined) {
      if (!['NGUON_A', 'NGUON_B', 'CHUA'].includes(String(r.xacMinh))) {
        lotBad.push(`${at}.xacMinh = ${JSON.stringify(r.xacMinh)} (chỉ được NGUON_A | NGUON_B | CHUA)`);
      }
      if (r.source?.url && r.snapshotHash && r.retrievedAt && r.xacMinh === 'CHUA') {
        lotThieu.push(`${at}: có source.url + snapshotHash + retrievedAt nhưng khai xacMinh = CHUA`);
      }
    }
  }
}
console.log(`  (${lots.length} tệp lô, ${recCount} bản ghi intl-precedent)`);
assert('mọi bản ghi trong tệp lô có outcome/outcomeHs đúng định dạng', lotBad.length === 0, lotBad.join(' | '));
assert('bản ghi có dấu vết đầy đủ thì không được để xacMinh = CHUA', lotThieu.length === 0, lotThieu.join(' | '));

// ── Lớp 2: chỉ mục phẳng lúc chạy (lib/precedent-search.js) ─────────────────────
// Đây là thứ người dùng thật nhìn thấy qua /api/precedents, /api/evidence-pack, /api/classify.
const flat = loadFlatPrecedents();
const intl = flat.filter((p) => p.source === 'TCO_ABF' || p.source === 'RULING_CBP');
const all = flat;

const badOutcome = all.filter((p) => !OUTCOME_ENUM.has(String(p.outcome)));
assert(`mọi tiền lệ trong chỉ mục có outcome là enum (${all.length} bản ghi)`, badOutcome.length === 0,
  badOutcome.slice(0, 5).map((p) => `${p.precedentId}: outcome=${JSON.stringify(p.outcome)}`).join(' | '));

const badHs = all.filter((p) => !/^\d{8}$/.test(String(p.outcomeHs || '')));
assert('mọi tiền lệ có outcomeHs đúng 8 số', badHs.length === 0,
  badHs.slice(0, 5).map((p) => `${p.precedentId}: outcomeHs=${p.outcomeHs}`).join(' | '));

// Đệm 0 phải ở BÊN PHẢI: outcomeHs luôn cùng nhóm 4 số với mã khoá của nó. Đệm bên trái
// (bug 00842139) làm outcomeHs rơi sang nhóm 0084 ⇒ mọi so khớp theo nhóm hỏng.
const lechNhom = all.filter((p) => p.finalHsCode && p.outcomeHs
  && String(p.finalHsCode).slice(0, 4) !== String(p.outcomeHs).slice(0, 4));
assert('outcomeHs luôn cùng nhóm 4 số với mã khoá (đệm 0 bên phải)', lechNhom.length === 0,
  lechNhom.slice(0, 5).map((p) => `${p.precedentId}: key=${p.finalHsCode} outcomeHs=${p.outcomeHs}`).join(' | '));

// ── Lỗi 2: đúng record gây lỗi ────────────────────────────────────────────────
const tco = intl.find((p) => p.tbTchqNumber === '1679759');
assert('tìm thấy record TCO Úc 1679759 trong chỉ mục', !!tco, 'không có record 1679759');
if (tco) {
  assert('TCO 1679759: outcome = APPROVED (enum, không phải mã HS)', tco.outcome === 'APPROVED', JSON.stringify(tco.outcome));
  assert('TCO 1679759: outcomeHs = 84213900 (8 số, đệm 0 bên phải)', tco.outcomeHs === '84213900', JSON.stringify(tco.outcomeHs));
  assert('TCO 1679759: xacMinh = NGUON_A (có URL + bản chụp + ngày lấy)', tco.xacMinh === 'NGUON_A', JSON.stringify(tco.xacMinh));
}

// xacMinh tổng quát: có đủ dấu vết thì phải NGUON_A, không được CHUA.
const chuaDau = all.filter((p) => p.sourceUrl && p.snapshotHash && p.retrievedAt && p.xacMinh === 'CHUA');
assert('tiền lệ có URL + bản chụp + ngày lấy thì xacMinh ≠ CHUA', chuaDau.length === 0,
  chuaDau.slice(0, 5).map((p) => p.precedentId).join(' | '));

// Nhãn xác minh chỉ được trong 3 giá trị quy định (đọc được, không bịa thêm nhãn mới).
const nhanLa = all.filter((p) => !['NGUON_A', 'NGUON_B', 'CHUA'].includes(String(p.xacMinh)));
assert('xacMinh ∈ {NGUON_A, NGUON_B, CHUA}', nhanLa.length === 0, nhanLa.slice(0, 5).map((p) => `${p.precedentId}=${p.xacMinh}`).join(' | '));

console.log(`  (${intl.length} tiền lệ quốc tế trong chỉ mục: ${intl.filter((p) => p.source === 'TCO_ABF').length} TCO + ${intl.filter((p) => p.source === 'RULING_CBP').length} CBP)`);
console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);