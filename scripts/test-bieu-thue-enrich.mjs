// lib/bieu-thue-enrich.js — moTaEn/dvtEn/canCu nguyên văn (#336)
import './test-isolate-data.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { enrichTax } = require('../lib/bieu-thue-enrich.js');
const { buildTaxLookup } = require('../lib/tax-lookup.js');

let pass = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { pass++; console.log(`PASS ${n}`); } else { fail++; console.log(`FAIL ${n} ${x}`); } };

// 1. moTaEn đúng từng dòng (không dùng chung)
const e1 = enrichTax('68132010');
check('moTaEn có giá trị', !!e1?.moTaEn && e1.moTaEn.length > 5, JSON.stringify(e1?.moTaEn));
const e2 = enrichTax('68132090');
check('moTaEn khác nhau giữa 2 dòng cùng nhóm', e1?.moTaEn !== e2?.moTaEn, e1?.moTaEn + ' vs ' + e2?.moTaEn);

// 2. dvtEn
check('dvtEn có giá trị', !!e1?.dvtEn, String(e1?.dvtEn));

// 3. canCu nguyên văn
const cc = e1?.canCuChiTiet;
check('canCuChiTiet có mfn vanBan + hieuLuc', cc?.mfn?.vanBan && cc?.mfn?.hieuLuc, JSON.stringify(cc?.mfn));
check('canCuChiTiet có tt + vat + acfta', cc?.tt?.vanBan && cc?.vat?.vanBan && cc?.acfta?.vanBan);

// 4. API chain: buildTaxLookup có đầy đủ
const r = buildTaxLookup('68132010', {});
check('API: moTaEn trong response', !!r.moTaEn);
check('API: dvtEn trong response', !!r.dvtEn);
check('API: canCuChiTiet trong response', !!r.canCuChiTiet?.mfn?.vanBan);

// 5. ACFTA eligible → mauCO = E
const rCN = buildTaxLookup('85044011', { origin: 'CN' });
check('ACFTA eligible → mauCO=E', rCN.acfta?.mauCO === 'E');

// 6. Mã không có trong bieu-chinh → null (không crash)
check('mã lạ → null an toàn', enrichTax('99999999') === null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
