#!/usr/bin/env node
/**
 * Issue #443 — tra_tien_le bỏ sót tiền lệ CÓ SẴN trong kho (ca 3609/TB-TCHQ).
 *
 * Ca thật 22/10: khách hỏi "bộ truyền động điện cho van bướm 0,75 kW" → /api/precedents?q=
 * trả found:false dù 3609/TB-TCHQ (85013170, SMC Electric Actuator) CÓ trong precedents.json.
 * Đo lại: bản ghi ĐÚNG đứng top-1 khi bỏ ngưỡng (sim 0,381) nhưng dưới ngưỡng 0,55 → bị nuốt.
 *
 * Sửa theo hướng đã chốt trong issue (thay cho đề xuất maTb ban đầu):
 *   1. found:false vẫn trả `ganKetQua[]` — top-3 cận kề dưới ngưỡng, kèm similarity +
 *      cờ biChanTran (điểm bị chặn trần 0,45 vì không trúng tên) — người/LLM tầng trên tự quyết.
 *   2. `maTb` hạ cấp thành đường xác minh/trích dẫn: tra THẲNG theo số hiệu, không qua chấm điểm.
 *
 * Nghiệm thu trong issue:
 *   · tra_tien_le(moTa="bộ truyền động điện cho van") → 3609/TB-TCHQ trong ganKetQua[] dù found:false.
 *   · tra_tien_le(maTb="3609") → trả đúng bản ghi (hs 85013170).
 */
import './test-isolate-data.mjs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const require = createRequire(import.meta.url);
const { searchPrecedents, findBySoHieu, NGUONG_KHOP_TIEN_LE } = require('../lib/precedent-search.js');

let passed = 0;
let failed = 0;
function assert(name, cond, detail) {
  if (cond) { console.log('PASS', name); passed += 1; }
  else { console.log('FAIL', name, detail || ''); failed += 1; }
}

// ── 1. Ca 3609: found:false nhưng ganKetQua giữ bản ghi ĐÚNG ở top ───────────
const LOI_KHACH = 'bộ truyền động điện cho van bướm';
const duoiNguong = searchPrecedents(LOI_KHACH, { topK: 3, minSimilarity: NGUONG_KHOP_TIEN_LE });
assert('lời khách: dưới ngưỡng 0,55 → rỗng (giữ nguyên hành vi found:false)', duoiNguong.length === 0,
  JSON.stringify(duoiNguong.map((m) => [m.precedent.precedentId, +m.similarity.toFixed(3)])));

const gan = searchPrecedents(LOI_KHACH, { topK: 3, minSimilarity: 0 });
assert('ganKetQua không rỗng', gan.length > 0);
assert('ganKetQua top-1 là ĐÚNG 3609/TB-TCHQ (nghiệm thu issue)',
  gan[0]?.precedent?.precedentId === 'tb-3609-TB-TCHQ',
  JSON.stringify(gan.map((m) => [m.precedent?.precedentId, +m.similarity.toFixed(3)])));
assert('ganKetQua mỗi kết quả có similarity', gan.every((m) => typeof m.similarity === 'number'));

// Query theo cấu tạo — bản ghi 3609 cũng phải xuất hiện trong cận kề
const ganCauTao = searchPrecedents('xylanh điện động cơ bước trục vít me SMC', { topK: 3, minSimilarity: 0 });
assert('query theo cấu tạo: 3609 trong ganKetQua top-3',
  ganCauTao.slice(0, 3).some((m) => m.precedent.precedentId === 'tb-3609-TB-TCHQ'),
  JSON.stringify(ganCauTao.map((m) => [m.precedent?.precedentId, +m.similarity.toFixed(3)])));

// ── 2. Cờ biChanTran — điểm bị chặn trần 0,45 vì không trúng tên ─────────────
// "van bướm gate valve pneumatic actuator positioner" không trúng từ nào trong TÊN
// các tiền lệ chuẩn → phần lớn kết quả phải mang cờ (similarity ≤ 0,45).
const chanTran = searchPrecedents('rotary paddle wheel flow indicator sensor', { topK: 8, minSimilarity: 0 });
const coCo = chanTran.filter((m) => m.biChanTran === true);
assert('có kết quả mang cờ biChanTran', coCo.length > 0,
  JSON.stringify(chanTran.map((m) => [m.precedent?.precedentId, +m.similarity.toFixed(3), m.biChanTran])));
assert('kết quả biChanTran luôn có similarity ≤ 0,45', coCo.every((m) => m.similarity <= 0.45 + 1e-9),
  JSON.stringify(coCo.map((m) => +m.similarity.toFixed(3))));

// Ca trúng tên → KHÔNG được gắn cờ (top-1 là bản ghi 3609 khớp nguyên văn; record
// TCO glovebox khác tên hàng nên có cờ là đúng hành vi, không phải lỗi)
const trung = searchPrecedents('Electric Actuator thiết bị truyền động điện', { topK: 3, minSimilarity: 0 });
assert('top-1 khớp nguyên văn tên → không có cờ biChanTran', trung[0]?.biChanTran === false,
  JSON.stringify(trung.map((m) => [m.precedent?.precedentId, m.biChanTran])));

// ── 3. findBySoHieu — đường xác minh/trích dẫn theo số hiệu ──────────────────
const r1 = findBySoHieu('3609');
assert('maTb="3609" → đúng bản ghi 3609/TB-TCHQ', r1.length >= 1 && r1.every((x) => String(x.precedent.tbTchqNumber).startsWith('3609')),
  JSON.stringify(r1.map((x) => x.precedent.tbTchqNumber)));
assert('bản ghi tra theo số hiệu có HS 85013170 (ca SMC trong issue)', r1.some((x) => x.finalHsCode === '85013170'),
  JSON.stringify([...new Set(r1.map((x) => x.finalHsCode))]));
assert('tra theo số hiệu có xacMinh + loaiNguon (format thống nhất)', r1.every((x) => x.loaiNguon && x.xacMinh));

const r2 = findBySoHieu('3609/TB-TCHQ');
assert('maTb="3609/TB-TCHQ" nguyên dạng → cùng kết quả', r2.length === r1.length);
const r3 = findBySoHieu('TB 3609');
assert('maTb="TB 3609" (chữ lẫn số) → cùng kết quả', r3.length === r1.length);
const r4 = findBySoHieu('1679759');
assert('số hiệu quốc tế TCO 1679759 → tra được', r4.length === 1 && String(r4[0].precedent.precedentId).includes('1679759'),
  JSON.stringify(r4.map((x) => x.precedent?.precedentId)));
assert('số hiệu không tồn tại → rỗng (không bịa)', findBySoHieu('9999/TB-TCHQ').length === 0);
assert('rỗng → rỗng, không nổ', findBySoHieu('').length === 0 && findBySoHieu('///').length === 0);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
