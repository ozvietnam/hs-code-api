// Test breadcrumb nguyên văn từ bieu-chinh 2026.04.05 (#336 mục 3 — nợ còn lại)
import './test-isolate-data.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let passed = 0, failed = 0;
const check = (n, c, d = '') => { if (c) { passed++; console.log('PASS', n); } else { failed++; console.error('FAIL', n, d); } };

const { duongDanNguyenVan } = require('../lib/hs-breadcrumb.js');
const { buildTaxLookup } = require('../lib/tax-lookup.js');

// 68132010 — đúng ví dụ trong issue #336: "6813 Vật liệu ma sát…" › "Chứa amiăng:"
const nv = duongDanNguyenVan('68132010');
check('68132010: có 2 cấp cha', nv && nv.vi.length === 2, JSON.stringify(nv && nv.vi));
check('68132010: cap 0 chứa "Vật liệu ma sát"', !!nv && nv.vi[0].includes('Vật liệu ma sát'));
check('68132010: cap 1 nguyên văn "Chứa amiăng:"', !!nv && nv.vi[1].includes('Chứa amiăng'));
check('68132010: EN kèm "Containing asbestos"', !!nv && nv.en && nv.en[1].includes('Containing asbestos'));

// Mã không có trong biểu (đ خر) → null, không văng
check('mã lạ → null an toàn', duongDanNguyenVan('99999999') === null);

// /api/tax: breadcrumb có cả trail cũ (chú giải) và duongDanNguyenVan (nguyên văn)
const r = await buildTaxLookup('68132010');
check('buildTaxLookup: breadcrumb chứa duongDanNguyenVan + trail cũ',
  !!(r.breadcrumb && r.breadcrumb.duongDanNguyenVan && r.breadcrumb.trail && r.breadcrumb.duongDanNguyenVan.vi[1].includes('Chứa amiăng')),
  JSON.stringify(r.breadcrumb && Object.keys(r.breadcrumb)));

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
