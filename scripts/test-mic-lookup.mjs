// made-in-china (lib/mic-lookup.js): bộ đọc ô có cấu trúc + đồng thuận ≥2 shop — hàm thuần, không gọi mạng.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { parseProductPage, parseSearchPage, consensusOf, slugify } = require('../lib/mic-lookup');
let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${x}`); } };

const page = `<html><head><title>Luxury Wall Mounted Scent Diffuser - Shop A</title></head><body>
<div class="bac-item-label">Model NO.</div><div class="bac-item-value">XL-D100B</div>
<div class="bac-item-label">Material</div><div class="bac-item-value">PP+ABS</div>
<div class="bac-item-label">Usage</div><div class="bac-item-value">Home, Hotel</div>
<div class="bac-item-label">Power Type</div><div class="bac-item-value">Electric</div>
<div class="bac-item-label">HS Code</div><div class="bac-item-value">8509809000</div>
<div class="rich-text">Welcome to our factory, best price, click to chat!</div></body></html>`;
const p = parseProductPage(page, 'https://aromadiffuser88.en.made-in-china.com/product/FwMaEgDAgjfT/China-x.html');
check('đọc đúng HS Code, model, material, usage, powerType; không đọc văn quảng cáo', p.hsCode === '8509809000' && p.props.model === 'XL-D100B' && p.props.material === 'PP+ABS' && p.props.powerType === 'Electric' && !JSON.stringify(p).includes('best price'), JSON.stringify(p));
check('nhận diện shop từ tên miền', p.shop === 'aromadiffuser88' && p.name.startsWith('Luxury Wall Mounted'));

const ld = `<script type="application/ld+json">{"@type":"Product","name":"Seal Kit","additionalProperty":[{"name":"HS Code","value":"4016"},{"name":"Material","value":"Rubber"}]}</script>`;
const p2 = parseProductPage(ld, 'https://ugheavy.en.made-in-china.com/product/abc/China-y.html');
check('đọc JSON-LD additionalProperty', p2.hsCode === '4016' && p2.props.material === 'Rubber');

const search = `<a href="https://shopa.en.made-in-china.com/product/AAA111/China-One.html">x</a><a href="https://shopa.en.made-in-china.com/product/AAA222/China-Two.html">y</a><a href="https://shopb.en.made-in-china.com/product/BBB111/China-Three.html">z</a><a href="https://shopc.en.made-in-china.com/product/CCC111/China-Four.html">w</a>`;
const links = parseSearchPage(search, 4);
check('mỗi shop lấy một link (nguồn độc lập)', links.length === 3 && links.every((u, i, a) => a.findIndex((v) => v.includes(u.match(/https:\/\/([a-z0-9-]+)\./)[1])) === i), JSON.stringify(links));

const c = consensusOf([{ shop: 'a', hsCode: '8509809000' }, { shop: 'b', hsCode: '85098010' }, { shop: 'c', hsCode: '8414591000' }, { shop: 'd', hsCode: null }]);
check('đồng thuận: ≥2 shop khác nhau cùng nhóm 4 số', c.heading4 === '8509' && c.shops === 2 && c.pagesWithHs === 3);
check('1 shop đơn lẻ → không đồng thuận', consensusOf([{ shop: 'a', hsCode: '8509809000' }]).heading4 === null);
check('cùng 1 shop ghi 2 lần không tính 2', consensusOf([{ shop: 'a', hsCode: '85098090' }, { shop: 'a', hsCode: '85098010' }]).heading4 === null);
check('slug đường tìm kiếm được phép', slugify('Wall Mounted Aroma Diffuser XS-105') === 'Wall_Mounted_Aroma_Diffuser_XS_105');
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
