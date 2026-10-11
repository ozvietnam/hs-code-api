#!/usr/bin/env node
import './test-isolate-data.mjs';
/** GET /api/tree (resource hs_tree của /api/dataset) — công khai: vị trí trong cây, cha/anh em/con, phạm vi "Loại khác", nguồn. */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

let passed = 0; let failed = 0;
const assert = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ` ${JSON.stringify(extra).slice(0, 300)}`}`); if (ok) passed += 1; else failed += 1; };

delete process.env.HS_API_TOKEN; // công khai: không token vẫn đọc được
const handler = require('../api/dataset.js');
const call = async (query, headers = {}) => {
  const res = { _s: 0, _j: null, _h: {}, getHeader(k) { return this._h[k]; }, setHeader(k, v) { this._h[k] = v; }, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } };
  await handler({ method: 'GET', url: '/api/tree', query: { resource: 'hs_tree', ...query }, headers }, res);
  return res;
};

const a = await call({ hs: '85044090' });
assert('công khai: không token vẫn 200', a._s === 200 && a._j.found === true, a._j);
assert('lá: nút có nhãn, cờ loaiKhac, gạch', a._j.nut.id === '85044090' && a._j.nut.loaiKhac === true && a._j.nut.gach === 2 && /Loại khác/.test(a._j.nut.ten));
assert('đường dẫn phần → chương → nhóm → phân nhóm, có tên tiếng Việt chương/nhóm', a._j.duongDan.map((x) => x.id).join('>') === 'P:XVI>85>8504>850440' && /Máy biến điện/.test(a._j.duongDan[2].tenVi || ''));
assert('cha thật = 850440 (không suyRa); anh em gồm nhóm con 8504401 (suyRa) + 3 dòng', a._j.cha.id === '850440' && a._j.cha.suyRa === false && a._j.anhEm.map((x) => x.id).join() === '8504401,85044020,85044030,85044040' && a._j.anhEm[0].suyRa === true);
assert('phạm vi Loại khác: tổ tiên có tên trừ 4 anh em có tên, kèm điều kiện + trích từ sổ tay 8504', a._j.loaiKhac && a._j.loaiKhac.toTienCoTen.id === '850440' && a._j.loaiKhac.anhEmCoTen.map((x) => x.hs).join() === '85044011,85044020,85044030,85044040' && a._j.loaiKhac.anhEmCoTen[0].trich && a._j.loaiKhac.dinhNghiaDuoc === true, a._j.loaiKhac);
assert('nguồn gắn vào nút có nhãn', a._j.nguon.chuGiaiNhom?.nhan === 'NGUYEN_VAN' && a._j.nguon.soTay?.nhan === 'DA_KIEM');
assert('ghi chú nói rõ suyRa = tên bị lược, không bịa', /không bịa/.test(a._j.ghiChu));

const b = await call({ hs: '8504211' });
assert('nút trung gian 7 số: tiêu đề quốc gia suyRa, con là 85042111/85042119, không có khối loaiKhac', b._s === 200 && b._j.nut.suyRa === true && b._j.con.map((x) => x.id).join() === '85042111,85042119' && !b._j.loaiKhac);
const c = await call({ hs: '85' });
assert('chương: con là các nhóm, đường dẫn chỉ có phần', c._s === 200 && c._j.con[0].cap === 4 && c._j.duongDan.length === 1 && c._j.duongDan[0].cap === 'PHAN');
const d = await call({ hs: '160100' });
assert('mã WCO xxxx00 → nhóm 4 số', d._s === 200 && d._j.hs === '1601' && d._j.nut.cap === 4);
const e = await call({ hs: '99999999' });
assert('mã không có → 404 found:false', e._s === 404 && e._j.found === false);
const f = await call({ hs: '123' });
assert('mã sai độ dài → 400', f._s === 400);
const g = await call({ hs: '85042111' });
assert('dòng có tên (không Loại khác) → không có khối loaiKhac, cha là tiêu đề bị lược', !g._j.loaiKhac && g._j.cha.id === '8504211' && g._j.cha.suyRa === true);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
