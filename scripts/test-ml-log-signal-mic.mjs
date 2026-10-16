// #307 — telemetry: appendSignalMicLog tôn trọng MIC_OFF, ghi JSONL best-effort giống appendSuggestLog.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const { appendSignalMicLog, readMlLogs } = require('../lib/ml-log.js');
const { dataPath } = require('../lib/data-paths.js');

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${x}`); } };

const LOG = dataPath('ml-log.jsonl');

// CASE A: MIC_OFF=1 → KHÔNG ghi
process.env.MIC_OFF = '1';
appendSignalMicLog({ hs6: '841451', shops: 3, finalHs: '84145199', agreedHeading: true });
process.env.MIC_OFF = '';
check('MIC_OFF=1 → không ghi dòng log signal:mic', !fs.existsSync(LOG) || fs.readFileSync(LOG, 'utf8').length === 0, LOG);

// CASE B: bình thường → ghi 1 dòng JSONL đúng shape
appendSignalMicLog({ hs6: '841451', shops: 3, finalHs: '84145199', agreedHeading: true });
check('appendSignalMicLog ghi 1 dòng khi MIC_OFF rỗng', fs.existsSync(LOG) && fs.readFileSync(LOG, 'utf8').split('\n').filter(Boolean).length >= 1, LOG);
const last = readMlLogs().filter((r) => r.endpoint === 'signal:mic').pop();
check('shape: ts + endpoint=signal:mic + hs6 + shops + finalHs', Boolean(last) && last.hs6 === '841451' && last.shops === 3 && last.finalHs === '84145199' && last.agreedHeading === true && /^\d{4}-\d{2}-\d{2}T/.test(last.ts), JSON.stringify(last));

// CASE C: MIC_OFF bật lại giữa hai lần ghi
appendSignalMicLog({ hs6: '847989', shops: 3, finalHs: '84145199', agreedHeading: false });
const beforeCount = readMlLogs().filter((r) => r.endpoint === 'signal:mic').length;
process.env.MIC_OFF = '1';
appendSignalMicLog({ hs6: '950710', shops: 2, finalHs: '84145199', agreedHeading: false });
process.env.MIC_OFF = '';
appendSignalMicLog({ hs6: '850980', shops: 4, finalHs: '85098090', agreedHeading: true });
const after = readMlLogs().filter((r) => r.endpoint === 'signal:mic');
// Trước MIC_OFF: thêm 1 dòng (847989 đã tính vào beforeCount); sau MIC_OFF: thêm 1 dòng (850980);
// dòng 950710 bị bỏ vì MIC_OFF=1.
check('MIC_OFF ở giữa hai lần ghi → +1 dòng sau (850980), KHÔNG có dòng 950710', after.length - beforeCount === 1 && after.some((r) => r.hs6 === '850980') && !after.some((r) => r.hs6 === '950710'), after.map((r) => r.hs6).join(','));

// CASE D: best-effort khi fs.appendFileSync ném lỗi — KHÔNG sập tiến trình.
// (đây là hàm ml-log.js thật sự gọi — writeFileSync trước đây là sai mock).
const realAppendFileSync = fs.appendFileSync;
try {
  fs.appendFileSync = () => { throw new Error('simulated FS failure'); };
  appendSignalMicLog({ hs6: '841370', shops: 2, finalHs: '84137011', agreedHeading: true });
  check('lỗi fs.appendFileSync không làm sập tiến trình', true);
} catch (e) {
  check('lỗi fs.appendFileSync không làm sập tiến trình', false, e.message);
} finally {
  fs.appendFileSync = realAppendFileSync;
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
