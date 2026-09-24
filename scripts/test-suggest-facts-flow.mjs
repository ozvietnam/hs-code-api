#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * Luồng hỏi–đáp cho agent/mô hình yếu:
 *   /api/suggest trả status=NEED_FACTS + nextAction.questions (có optionsVi)
 *   → người dùng trả lời tự nhiên ("có", "1", "chở người")
 *   → gọi lại với facts → hệ thống hiểu, không hỏi lại câu cũ.
 * Trước đây "có" bị bỏ im lặng và cache bỏ qua facts → vòng hỏi vô hạn.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
process.env.HS_API_TOKEN = 'test-token';

let pass = 0, fail = 0;
const check = (n, c, d) => { c ? (pass++, console.log(`PASS ${n}`)) : (fail++, console.log(`FAIL ${n}`, d === undefined ? '' : JSON.stringify(d).slice(0, 400))); };

// ── Unit: quy đổi câu trả lời ──
const { coerceEnumFact, loadTable } = require('../lib/decision-tables');
const yn = { domain: ['yes', 'no'], _detect: {} };
check('"có" → yes', coerceEnumFact(yn, 'có') === 'yes');
check('"Không phải" → no', coerceEnumFact(yn, 'Không phải') === 'no');
check('"ko" → no', coerceEnumFact(yn, 'ko') === 'no');
const t8428 = loadTable('8428');
const fam = t8428.inputs.find((i) => i.attribute === 'equipmentFamily');
check('số thứ tự "1" → giá trị đầu', coerceEnumFact(fam, '1') === fam.domain[0]);
check('mã đúng, khác hoa thường', coerceEnumFact(fam, 'LIFTSKIP') === 'liftSkip');
check('cụm tiếng Việt "thang cuốn" → escalatorWalkway', coerceEnumFact(fam, 'thang cuốn') === 'escalatorWalkway');
check('rác → null', coerceEnumFact(fam, 'zzz') === null);

// ── Unit: status ──
const { buildSuggestStatus } = require('../lib/suggest-status');
check('không gợi ý → NO_CANDIDATES', buildSuggestStatus({ description: 'x', suggestions: [] }).status === 'NO_CANDIDATES');
check('degraded → NEEDS_EXPERT', buildSuggestStatus({ description: 'x', suggestions: [{ hsCode: '1' }], engine: 'deterministic' }).status === 'NEEDS_EXPERT');
check('bình thường → REVIEW, không tự chốt', buildSuggestStatus({ description: 'x', suggestions: [{ hsCode: '1' }] }).nextAction.type === 'USER_CONFIRM');
const nf = buildSuggestStatus({ description: 'x', suggestions: [{ hsCode: '1' }], missingFacts: [{ attribute: 'a', questionVi: 'q?' }] });
check('thiếu dữ kiện → NEED_FACTS + ASK_USER + CALL lại', nf.status === 'NEED_FACTS' && nf.nextAction.type === 'ASK_USER' && nf.nextAction.then.body.facts.a !== undefined);

// ── Handler: vòng hỏi–đáp thật trên bảng 8428 ──
const llmTier = require('../lib/llm-tier');
llmTier.callLLMJson = async (system, user) => {
  if (!/suggestions/.test(system)) return { json: { headings: ['8428'] }, model: 'mock' };
  const cands = JSON.parse(user).candidates.map((c) => c.hsCode);
  const pick = cands.find((c) => c.startsWith('8428')) || cands[0];
  return { json: { suggestions: [{ hsCode: pick, confidence: 70, reasoning: 'thang máy' }] }, model: 'mock' };
};
const handler = require('../api/suggest.js');
function mockRes() {
  return { _s: 0, _j: null, setHeader() {}, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } };
}
async function call(body) {
  const res = mockRes();
  await handler({ method: 'POST', url: '/api/suggest', query: {}, headers: { authorization: 'Bearer test-token' }, body }, res);
  return res._j;
}

const desc = 'thang máy lắp trong tòa nhà, động cơ điện';
const r1 = await call({ description: desc });
const d1 = (r1.decisions || []).find((d) => d.heading === '8428');
check('lượt 1: có bảng 8428', Boolean(d1), { top: r1.suggestions?.map((s) => s.hsCode), decisions: r1.decisions });
check('lượt 1: status NEED_FACTS', r1.status === 'NEED_FACTS', r1.status);
const q = r1.nextAction?.questions?.find((x) => x.attribute === 'liftKind');
check('lượt 1: hỏi liftKind kèm optionsVi', Boolean(q?.optionsVi?.length), r1.nextAction);

const r2 = await call({ description: desc, facts: { liftKind: 'chở người' } });
const d2 = (r2.decisions || []).find((d) => d.heading === '8428');
check('lượt 2: không dùng cache của lượt 1', r2.cached !== true);
check('lượt 2: hiểu "chở người" → passenger', d2?.factsUsed?.liftKind === 'passenger', d2);
check('lượt 2: không hỏi lại liftKind', !(r2.nextAction?.questions || []).some((x) => x.attribute === 'liftKind'), r2.nextAction);

const r3 = await call({ description: desc, facts: { liftKind: 'tàu vũ trụ' } });
check('câu trả lời vô nghĩa → rejectedFacts + hỏi lại có lựa chọn', (r3.rejectedFacts || []).some((x) => x.attribute === 'liftKind') && r3.status === 'NEED_FACTS', { rf: r3.rejectedFacts, st: r3.status });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
