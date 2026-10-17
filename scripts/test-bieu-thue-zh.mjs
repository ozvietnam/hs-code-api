#!/usr/bin/env node
import './test-isolate-data.mjs';
// Bộ kiểm cho máy kiểm tên tiếng Trung (scripts/bieu-thue/kiem-zh.mjs) — chạy trên thư mục tạm, không đụng data/ thật.
import fs from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import { kiem } from './bieu-thue/kiem-zh.mjs';

let pass = 0, fail = 0;
const check = (n, c, d) => { c ? (pass++, console.log(`PASS ${n}`)) : (fail++, console.log(`FAIL ${n}`, d === undefined ? '' : JSON.stringify(d))); };
const tmp = () => fs.mkdtempSync(join(os.tmpdir(), 'zh-kiem-'));
const SHA = 'a'.repeat(64);
const URL = 'http://www.customs.gov.cn/customs/302249/302266/302267/index.html';
const baoCao = (x = {}) => ({ ngay: '2026-10-18', may: 'macOS dev-zcode', camKet: { khongDichMay: true, khongLachAntiBot: true }, nguon: [{ ma: 'gacc-shuize-2026', vanBan: '中华人民共和国进出口税则（2026）', url: URL, trangThai: 'OK', soDong: 1 }], ...x });
const dong = (x = {}) => ({ hs6: '850440', tenZh: '静止式变流器', capKhop: 6, nguon: { url: URL, sha256: SHA, layLuc: '2026-10-18T01:00:00Z', viTri: 'trang 1234' }, ...x });
function dung(dir, { bc = baoCao(), rows = [dong()], thieu = [], raw = [{ sha256: SHA, url: URL, layLuc: '2026-10-18T00:59:00Z', bytes: 100 }] } = {}) {
  fs.writeFileSync(join(dir, 'bao-cao.json'), JSON.stringify(bc));
  fs.writeFileSync(join(dir, 'hs6-zh.jsonl'), rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  if (thieu.length) fs.writeFileSync(join(dir, 'thieu.jsonl'), thieu.map((r) => JSON.stringify(r)).join('\n') + '\n');
  fs.writeFileSync(join(dir, 'raw-index.json'), JSON.stringify({ tho: raw }));
}

{ const d = tmp(); const r = kiem(d); check('thiếu bao-cao → đỏ', r.loi.length === 1 && /bao-cao/.test(r.loi[0]), r.loi); }
{ const d = tmp(); dung(d); const r = kiem(d, { hs6: ['850440'] }); check('bộ dữ liệu đúng → PASS, phủ 1/1', r.loi.length === 0 && r.tomTat.phu === '1/1', r); }
{ const d = tmp(); dung(d, { bc: baoCao({ camKet: { khongDichMay: false, khongLachAntiBot: true } }) }); check('dịch máy → đỏ', kiem(d).loi.some((l) => /khongDichMay/.test(l))); }
{ const d = tmp(); dung(d, { rows: [dong({ nguon: { url: 'https://example.com/x', sha256: SHA, layLuc: '2026-10-18T01:00:00Z' } })] }); check('nguồn không phải gov.cn → đỏ', kiem(d).loi.some((l) => /gov\.cn/.test(l))); }
{ const d = tmp(); dung(d, { bc: baoCao({ nguon: [{ ma: 'x', vanBan: 'y', url: 'https://hsbianma.com/', trangThai: 'OK' }] }) }); check('bao-cao nguồn bên thứ ba → đỏ', kiem(d).loi.some((l) => /gov\.cn/.test(l))); }
{ const d = tmp(); dung(d, { rows: [dong({ tenZh: 'Static converters' })] }); check('tenZh không có chữ Hán → đỏ', kiem(d).loi.some((l) => /chữ Hán/.test(l))); }
{ const d = tmp(); dung(d, { rows: [dong({ nguon: { url: URL, sha256: 'b'.repeat(64), layLuc: '2026-10-18T01:00:00Z' } })] }); check('sha256 không trong raw-index → đỏ', kiem(d).loi.some((l) => /raw-index/.test(l))); }
{ const d = tmp(); dung(d, { rows: [dong(), dong({ tenZh: '其他' })] }); check('hs6 lặp → đỏ', kiem(d).loi.some((l) => /lặp/.test(l))); }
{ const d = tmp(); dung(d, { rows: [dong({ capKhop: 8 })] }); check('capKhop khác 6 → đỏ', kiem(d).loi.some((l) => /capKhop/.test(l))); }
{ const d = tmp(); dung(d); const r = kiem(d, { hs6: ['850440', '850450'] }); check('hs6 chưa kể đến → đỏ', r.loi.some((l) => /chưa được kể đến/.test(l)), r.loi); }
{ const d = tmp(); dung(d, { thieu: [{ hs6: '850450', lyDo: 'ấn bản TQ không có dòng này' }] }); const r = kiem(d, { hs6: ['850440', '850450'] }); check('hs6 thiếu có lý do → PASS, phủ 1/2', r.loi.length === 0 && r.tomTat.phu === '1/2', r); }
{ const d = tmp(); dung(d, { rows: [dong({ nguon: { url: URL, sha256: SHA, layLuc: '2026-10-18T01:00:00Z' } })] }); const r = kiem(d); check('thiếu viTri → chỉ cảnh báo', r.loi.length === 0 && r.canhBao.some((c) => /viTri/.test(c)), r); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
