#!/usr/bin/env node
/** lib/sen.js + data/sen-2022.json: SEN 2022 theo đúng mã 8 số. */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { senFor } = require('../lib/sen.js');
const S = require('../data/sen-2022.json');
const H = require('../data/chu-giai-heading.json');
const tax = require('../data/tax.json');

let passed = 0;
let failed = 0;
const assert = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ` ${extra}`}`);
  if (ok) passed += 1; else failed += 1;
};

const k8 = (Array.isArray(tax) ? tax : Object.values(tax)).map((r) => String(r.hs).replace(/\D/g, ''));
const known = new Set([...k8, ...k8.map((c) => c.slice(0, 6)), ...k8.map((c) => c.slice(0, 4))]); // mục SEN cấp 8/6/4 số
const codes = S.muc.flatMap((m) => m.ma);
assert('Đủ mục SEN 2022 (≥ 380 mục, ≥ 650 mã) — không để dữ liệu thụt lùi', S.muc.length >= 380 && new Set(codes).size >= 650, `${S.muc.length}/${new Set(codes).size}`);
assert('Mọi mã SEN có trong biểu thuế', codes.every((c) => known.has(c)), codes.filter((c) => !known.has(c)).join(' '));
assert('Mọi mục có tên hoặc nội dung', S.muc.every((m) => m.tieuDe || m.noiDung.length >= 40));
assert('Nội dung chỉ tiếng Việt, không lẫn cột tiếng Anh "(Source:"', !S.muc.some((m) => /\(Source:/.test(m.noiDung)));
const r = senFor('8418.99.40');
assert('senFor trả đúng mục của mã (8418.99.40: panel nhôm cán-ghép)', r && r.phienBan === 'SEN2022' && /PANEL NHÔM/.test(r.muc[0].tieuDe) && /8418\.29\.00/.test(r.muc[0].tieuDe));
assert('senFor không có mã → null; mã không đủ 8 số → null', senFor('85098090') === null && senFor('8418') === null);
const oil = senFor('27101943');
assert('Mục SEN cấp nhóm (27.10: định nghĩa dầu nhẹ/trung/nặng) áp cho mã 8 số trong nhóm', oil && oil.muc.some((m) => m.capDo === 'nhom4' && /DẦU NHẸ/.test(m.tieuDe)));
assert('Chương 27 (cột Anh bắt đầu sớm) không lẫn chữ Anh', !/carbon black|petroleum oil/.test(S.muc.find((m) => m.ma.includes('27079910')).noiDung));
assert('Trường sen của nhóm theo SEN 2022 (2707: nguyên liệu sản xuất than đen)', /THAN ĐEN/.test(H['2707'].sen) && /SEN/.test(H['2707'].sen_nguon));

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
