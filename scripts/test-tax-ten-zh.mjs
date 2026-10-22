#!/usr/bin/env node
// #336 mục 5 (đơn bieu-thue-tieng-trung §6.3): nối tenZh từ 税则 2026 (PR #356)
// vào /api/tax (nameZh/nameZhCha) và /api/search (khớp từ khoá tiếng Trung + trả nameZh).
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { tenZhOf, tenZhChaOf, soLuong } = require('../lib/bieu-thue-zh.js');
const { mapTaxLookup, mapSearchResult } = require('../lib/tax-mapper.js');
const { searchCandidates } = require('../lib/search-utils.js');

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`PASS ${name}`); }
  else { fail++; console.error(`FAIL ${name} ${extra}`); }
};

// -- 1. loader tên tiếng Trung --
check('loader ≥ 5.500 hs6', soLuong() >= 5500, `${soLuong()}`);
check('850440 = 静止式变流器', tenZhOf('850440') === '静止式变流器', tenZhOf('850440'));
check('010121 cha = 马', tenZhChaOf('010121') === '马', String(tenZhChaOf('010121')));
check('mã chương 98 → null (TQ không có)', tenZhOf('980415') == null);

// -- 2. /api/tax: nameZh/nameZhCha theo hs6 của mã 8 số VN --
const r = mapTaxLookup('85044011'); // VN chia 8 số khác TQ — tên Zh phải theo 6 số đầu
check('tax 85044011 nameZh = 静止式变流器', r.found && r.nameZh === '静止式变流器', JSON.stringify(r.nameZh));
check('tax 01012100 nameZh = 改良种用 + nameZhCha = 马',
  mapTaxLookup('01012100').nameZh === '改良种用' && mapTaxLookup('01012100').nameZhCha === '马');
check('tax 98041500 (chương 98) nameZh = null', mapTaxLookup('98041500').nameZh == null);
const r98 = mapTaxLookup('98041500');
check('tax 98 mappedHs.nameZh theo mã tương ứng', r98.mappedHs?.nameZh === tenZhOf(String(r98.mappedHs?.hsCode).slice(0, 6)) && r98.mappedHs?.nameZh != null,
  JSON.stringify(r98.mappedHs?.nameZh));

// -- 3. /api/search: query tiếng Trung khớp + trả nameZh --
const kq1 = searchCandidates('静止式变流器', { topCandidates: 10 });
check('search 静止式变流器 → có mã 8504.40', kq1.some((x) => x.hsCode.startsWith('850440')), kq1.map((x) => x.hsCode).slice(0, 3).join(','));
check('search 静止式变流器 → kết quả có nameZh', kq1.length > 0 && kq1[0].nameZh != null, JSON.stringify(kq1[0]?.nameZh));
check('search 静止式变流器 → top score ≥ 80 (không rơi lowConfidence)', (kq1[0]?.score ?? 0) >= 80, String(kq1[0]?.score));
const kq2 = searchCandidates('改良种用马', { topCandidates: 10 });
check('search 改良种用马 → có mã 0101.21', kq2.some((x) => x.hsCode.startsWith('010121')), kq2.map((x) => x.hsCode).slice(0, 3).join(','));

// -- 4. hồi quy: tìm tiếng Việt không đổi --
const kq3 = searchCandidates('bàn chải', { topCandidates: 5 });
check('hồi quy "bàn chải" → top 9603', kq3[0]?.hsCode.startsWith('9603'), kq3[0]?.hsCode);

// -- 5. mapSearchResult trả nameZh --
const msr = mapSearchResult({ hs: '85044011', vn: 'Biến tần', cs: '0', zh: '静止式变流器' }, { mfn: '5' });
check('mapSearchResult nameZh', msr.nameZh === '静止式变流器', JSON.stringify(msr.nameZh));

console.log(`\n${pass}/${pass + fail} pass`);
if (fail) { console.error(`FAIL ${fail}`); process.exit(1); }
console.log('PASS tax tenZh wiring');
