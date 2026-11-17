// OZV-771 + OZV-1314 — động cơ phải ăn theo hạn chót THẬT của bên gọi + ngân sách mềm ≤ 85 s.
// Trước OZV-771: api/classify.js trả 503 QUA_GIO ở 85 s nhưng động cơ tự cho mình 285 s.
// OZV-1314: BUDGET_MS mặc định cũng ≤ 85 s (khớp trần Cổng); env CLASSIFY_BUDGET_MS ghi đè khi bench dài.
//  A. Không có `hanChotMs` ⇒ hạn bước ≤ BUDGET_MS mặc định (85 s).
//  B. `hanChotMs` = 85 s (trần của /api/classify) ⇒ hạn bước vòng 1 không vượt giờ bên gọi.
//  C. Hạn chót sắp hết (3 s) ⇒ hạn bước ≤ số giờ còn lại, KHÔNG rơi về sàn 30 s (không hứa quá giờ).
// Không gọi mạng: thay llmTier.callLLMJson bằng hàm giả, chỉ ghi lại `timeoutMs` nó nhận được.
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
process.env.HS_CLASSIFY_CROSSCHECK = '0';
process.env.HS_SOTAY_RUNTIME = 'false';

const llmTier = require('../lib/llm-tier');
const ghi = [];
// Ghi hạn của lời gọi AI đầu tiên rồi ném lỗi để lượt dừng ngay — bài này chỉ đo hạn, không đo kết quả.
llmTier.callLLMJson = async (_sys, _user, opts = {}) => {
  ghi.push({ step: opts.step, timeoutMs: opts.timeoutMs });
  throw new Error('dừng-để-đo');
};
console.error = () => {}; console.warn = () => {};

const { classifyLoop } = require('../lib/engine-loop.js');

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${String(x).slice(0, 400)}`); } };

const ATTRS = { tenHang: 'van xả máy giặt', chatLieu: 'nhựa', congDung: 'xả nước' };

async function doHan(opts) {
  ghi.length = 0;
  try { await classifyLoop({ ...ATTRS }, opts); } catch { /* lỗi giả, không quan tâm */ }
  return ghi[0] || null;
}

// ═════════ A. Không có hanChotMs ⇒ ăn theo BUDGET_MS mặc định ≤ 85 s (OZV-1314) ═════════
const a = await doHan({});
check('A1 có gọi AI (bài đo chạm được đường chạy thật)', a != null, JSON.stringify(ghi));
check('A2 không có hanChotMs ⇒ hạn bước vòng 1 ≤ 85 s (ngân sách mềm mặc định)', a?.timeoutMs <= 85000, JSON.stringify(a));
check('A3 hạn bước vòng 1 vẫn > 20 s (không bị bóp về 0)', a?.timeoutMs > 20000, JSON.stringify(a));

// ═════════ B. hanChotMs = 85 s (trần /api/classify) ⇒ co lại / khớp ngân sách ═════════
const b = await doHan({ hanChotMs: Date.now() + 85000 });
check('B1 hạn bước ≤ 85 s', b?.timeoutMs <= 85000, JSON.stringify(b));
check('B2 hạn bước KHÔNG vượt hạn chót bên gọi (85 s)', b?.timeoutMs <= 85000, JSON.stringify(b));
check('B3 vẫn còn giờ thật để làm việc (> 20 s, không bị bóp về 0)', b?.timeoutMs > 20000, JSON.stringify(b));
// Chừa giờ cho vòng 2: với ngân sách 85 s, hạn vòng 1 phải nhỏ hơn hẳn 85 s.
check('B4 chừa phần giờ cho bước sau (hạn vòng 1 < 80% ngân sách)', b?.timeoutMs < 85000 * 0.8, JSON.stringify(b));

// ═════════ C. Hạn chót sắp hết ⇒ không hứa quá giờ ═════════
const c = await doHan({ hanChotMs: Date.now() + 3000 });
check('C1 hạn bước ≤ giờ còn lại (3 s), KHÔNG rơi về sàn 30 s', c?.timeoutMs <= 3000, JSON.stringify(c));
check('C2 hạn bước là số dương (không gửi hạn âm cho nhà cung cấp)', c?.timeoutMs > 0, JSON.stringify(c));

// ═════════ D. Hạn chót dài hơn ngân sách mềm ⇒ ngân sách mềm (≤85 s) vẫn thắng ═════════
const d = await doHan({ hanChotMs: Date.now() + 600000 });
check('D1 bên gọi cho 600 s ⇒ hạn bước vẫn ≤ BUDGET_MS mặc định 85 s', d?.timeoutMs <= 85000, JSON.stringify(d));
check('D2 hạn bước vẫn > 20 s (có giờ làm việc)', d?.timeoutMs > 20000, JSON.stringify(d));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
