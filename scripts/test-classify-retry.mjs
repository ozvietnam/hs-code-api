// AI lỗi tạm thời (429 giới hạn gói / quá giờ) ở bước đề xuất nhóm, không có tiền lệ → phải trả
// THỬ LẠI (nextAction RETRY), KHÔNG được kết luận "không có ứng viên" (sự cố 06/10/2026 17:35).
import './test-isolate-data.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
process.env.HS_CLASSIFY_CROSSCHECK = '0';
const llmTier = require('../lib/llm-tier');
llmTier.callLLMJson = async () => { throw new Error('minimax/MiniMax-M2.7-highspeed: HTTP 429: Token Plan rate limit reached'); };
console.error = () => {}; console.warn = () => {};
const { classify } = require('../lib/classify');
let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${x}`); } };
const r = await classify({ tenHang: 'zzqx 真皮大班总裁椅' }, {});
check('AI 429 + 0 ứng viên → RETRY, không NO_CANDIDATES', r.nextAction?.type === 'RETRY' && r.status !== 'NO_CANDIDATES' && (r.results || []).length === 0, JSON.stringify([r.status, r.nextAction]));
check('có ghi lỗi AI để chẩn đoán', /429/.test(r.llmError || ''));
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
