#!/usr/bin/env node
import { TEST_DATA_DIR } from './test-isolate-data.mjs';
/**
 * sync-tariff không được làm hỏng biểu thuế:
 *   · file nguồn thiếu cột → trường đó giữ nguyên (trước đây tt/bvmt bị xoá rỗng)
 *   · file nguồn chỉ có vài mã → mã khác KHÔNG bị xoá (trừ --allow-remove)
 *   · mã 6 số không bị đệm thành mã giả; "Thuế xuất khẩu" không đổ vào tt
 *   · ghi qua HS_DATA_DIR, data/ thật không đổi (rule #8)
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const {
  normalizeHs8, recordFromJsonRow, detectXlsxColumns, recordFromXlsxRow, computeDiff, mergeTariff,
} = require('../lib/tariff-sync.js');

let pass = 0, fail = 0;
const check = (n, c, d) => { c ? (pass++, console.log(`PASS ${n}`)) : (fail++, console.log(`FAIL ${n}`, d === undefined ? '' : JSON.stringify(d))); };

// ── Unit ──
check('mã 6 số bị bỏ, không đệm', normalizeHs8('847130') === null);
check('mã 8 số có dấu chấm OK', normalizeHs8('8471.30.20') === '84713020');
check('mã 10 số bị bỏ', normalizeHs8('8539399090') === null);

const r = recordFromJsonRow({ hs: '10011100', mfn: '5', 'Thuế xuất khẩu': '10' });
check('JSON: chỉ có trường nguồn cung cấp', JSON.stringify(Object.keys(r).sort()) === '["hs","mfn"]', r);
check('JSON: "Thuế xuất khẩu" không đổ vào tt', !('tt' in r));

const cols = detectXlsxColumns(['Mã HS', 'Mô tả hàng hóa', 'Thuế MFN', 'Thuế thông thường', 'VAT']);
check('XLSX: nhận đúng cột', cols.hs === 'Mã HS' && cols.mfn === 'Thuế MFN' && cols.tt === 'Thuế thông thường' && !cols.bvmt, cols);
const xr = recordFromXlsxRow({ 'Mã HS': '10011100', 'Mô tả hàng hóa': 'x', 'Thuế MFN': '1', 'Thuế thông thường': '1.5', VAT: '10' }, cols);
check('XLSX: không có cột BVMT → không có trường bvmt', !('bvmt' in xr) && !('acfta' in xr), xr);

const cur = {
  '10011100': { hs: '10011100', vn: 'A', tt: '7.5', mfn: '5', bvmt: 'MT', acfta: '0', cs: 'x', giam_vat: '', dvt: 'kg', vat: '5', en: 'a' },
  '10011900': { hs: '10011900', vn: 'B', tt: '7.5', mfn: '5', bvmt: '', acfta: '0', cs: '', giam_vat: '', dvt: 'kg', vat: '5', en: 'b' },
};
const inc = { '10011100': { hs: '10011100', mfn: '3' }, '10019100': { hs: '10019100', vn: 'C', mfn: '1' } };
const diff = computeDiff(cur, inc);
check('diff: chỉ báo trường nguồn có', diff.changed.length === 1 && diff.changed[0].fields.join() === 'mfn', diff.changed);
const m1 = mergeTariff(cur, inc);
check('merge: giữ tt/bvmt/cs khi nguồn không có', m1.merged['10011100'].tt === '7.5' && m1.merged['10011100'].bvmt === 'MT' && m1.merged['10011100'].mfn === '3');
check('merge: KHÔNG xoá mã vắng trong nguồn', Boolean(m1.merged['10011900']) && m1.removed === 0);
check('merge: mã mới đủ schema', m1.merged['10019100'].tt === '' && m1.merged['10019100'].vn === 'C');
const m2 = mergeTariff(cur, inc, { allowRemove: true });
check('merge --allow-remove: xoá mã vắng', !m2.merged['10011900'] && m2.removed === 1);

// ── End-to-end: chạy script thật với file nguồn một phần ──
const realTax = path.join(process.cwd(), 'data', 'tax.json');
const hashBefore = crypto.createHash('sha256').update(fs.readFileSync(realTax)).digest('hex');
const src = path.join(TEST_DATA_DIR, 'partial-source.json');
fs.writeFileSync(src, JSON.stringify([{ hs: '10011100', mfn: '1' }, { hs: '847130', mfn: '0' }]));
execFileSync('node', ['scripts/sync-tariff.mjs', `--source=${src}`, '--apply', '--label=test-sync'], {
  env: { ...process.env, HS_DATA_DIR: TEST_DATA_DIR }, stdio: 'pipe',
});
const written = JSON.parse(fs.readFileSync(path.join(TEST_DATA_DIR, 'tax.json'), 'utf8'));
const orig = JSON.parse(fs.readFileSync(realTax, 'utf8'));
check('e2e: số mã không đổi', Object.keys(written).length === Object.keys(orig).length, Object.keys(written).length);
check('e2e: mfn được cập nhật', written['10011100'].mfn === '1');
check('e2e: tt giữ nguyên', written['10011100'].tt === orig['10011100'].tt);
check('e2e: không sinh mã giả 84713000', !written['84713000']);
check('e2e: data/tax.json thật không đổi', crypto.createHash('sha256').update(fs.readFileSync(realTax)).digest('hex') === hashBefore);
check('e2e: snapshot version ghi vào thư mục tạm', fs.existsSync(path.join(TEST_DATA_DIR, 'versions', 'tax-test-sync.json')));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
