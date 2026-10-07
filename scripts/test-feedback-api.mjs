#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * POST /api/feedback: không được báo "ok" khi bản ghi không lưu được (Vercel
 * FS read-only), và không nhận mã sửa không có trong biểu thuế.
 */
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
process.env.HS_API_TOKEN = 'test-token';

const handler = require('../api/feedback.js');
const { FEEDBACK_PATH } = require('../lib/feedback-store');

let pass = 0, fail = 0;
const check = (n, c, d) => { c ? (pass++, console.log(`PASS ${n}`)) : (fail++, console.log(`FAIL ${n}`, d === undefined ? '' : JSON.stringify(d))); };
function mockRes() {
  return { _s: 0, _j: null, setHeader() {}, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } };
}
async function post(body) {
  const res = mockRes();
  await handler({ method: 'POST', url: '/api/feedback', query: {}, headers: { authorization: 'Bearer test-token' }, body }, res);
  return res;
}

const ok = await post({ feedbackType: 'correction', hsCodeAtTime: '84137011', correctedHsCode: '8413.70.19', productName: 'bơm' });
check('lưu được → 200 ok', ok._s === 200 && ok._j.ok === true && ok._j.persisted === true, ok._j);
check('mã sửa được chuẩn hoá về 8 số', fs.readFileSync(FEEDBACK_PATH, 'utf8').includes('"correctedHsCode":"84137019"'));

const bad = await post({ feedbackType: 'correction', correctedHsCode: '99999999' });
check('mã sửa không có trong biểu → 400', bad._s === 400 && bad._j.code === 'INVALID_HS_CODE', bad._j);

// Giả lập FS read-only như Vercel
const orig = fs.appendFileSync;
fs.appendFileSync = () => { throw Object.assign(new Error('EROFS: read-only file system'), { code: 'EROFS' }); };
const ro = await post({ feedbackType: 'correction', correctedHsCode: '84137019' });
fs.appendFileSync = orig;
check('không lưu được → 503, ok=false (không nói dối)', ro._s === 503 && ro._j.ok === false && ro._j.code === 'FEEDBACK_NOT_PERSISTED', ro._j);
check('503 trả lại bản ghi để phía gọi tự giữ', ro._j.record?.correctedHsCode === '84137019');


// Vòng phản hồi ERP → hs-code-api (07/10/2026): bản ghi kèm đầu vào thật + mã hệ thống đề xuất
{
  const res = await post({
    feedbackType: 'staff_choose', source: 'erp-staff', hsCodeAtTime: '95030040', correctedHsCode: '95030099', agrees: false, chosenBy: 'u1',
    systemTop3: ['9503.00.40', '95030099'], input: { titleZh: '3D打印钥匙扣手指枪', specsZh: '材质: 塑料', nameVi: 'đồ chơi súng ngón tay', facts: [{ key: 'material', valueVi: 'nhựa PLA' }] },
  });
  const last = JSON.parse(fs.readFileSync(FEEDBACK_PATH, 'utf8').trim().split('\n').pop());
  check('phản hồi ERP: lưu đầu vào thật + top3 + agrees', res._s === 200 && last.input?.titleZh === '3D打印钥匙扣手指枪' && last.systemTop3.join(',') === '95030040,95030099' && last.agrees === false && last.source === 'erp-staff' && last.correctedHsCode === '95030099', JSON.stringify(last).slice(0, 300));
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
