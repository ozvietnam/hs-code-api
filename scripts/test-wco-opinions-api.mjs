#!/usr/bin/env node
import './test-isolate-data.mjs';
/** GET /api/wco-opinions (resource wco_opinions của /api/dataset) — công khai, chỉ ý kiến đã qua cổng, kèm tuyên bố bản quyền. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

let passed = 0; let failed = 0;
const assert = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ` ${JSON.stringify(extra).slice(0, 300)}`}`); if (ok) passed += 1; else failed += 1; };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wco-api-'));
const op = (hs, ord, text, extra = {}) => ({ id: `${hs}/${ord}`, hs, ord, adoption: 2010 + ord, text: `${ord}. ${text}\n\nAdoption: ${2010 + ord}`, line: ord * 10 + Number(hs.slice(-2)), ...extra });
fs.writeFileSync(path.join(tmp, 'op.json'), JSON.stringify([
  op('852852', 1, 'A colour monitor with a TFT LCD panel.', { headingRecovered: 'continued' }),
  op('852852', 2, 'A 27-inch flat panel monitor.'),
  op('852852', 3, 'Suspect — mã chưa đáng tin', { headingSuspect: true }),
  op('852862', 1, 'A projector.'),
]));
fs.writeFileSync(path.join(tmp, 'vi.json'), JSON.stringify({ 62: { vi: '1. Màn hình màu có tấm nền TFT LCD.' } }));
process.env.HS_WCO_OP_FILE = path.join(tmp, 'op.json'); process.env.HS_WCO_VI_FILE = path.join(tmp, 'vi.json');
// Thiếu HS_API_TOKEN / không gửi Authorization: endpoint phải đọc được công khai.
delete process.env.HS_API_TOKEN;

const handler = require('../api/dataset.js');
const wco = require('../lib/wco-op.js'); wco.reset();
const call = async (query, headers = {}) => {
  const res = { _s: 0, _j: null, _h: {}, getHeader(k) { return this._h[k]; }, setHeader(k, v) { this._h[k] = v; }, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } };
  await handler({ method: 'GET', url: '/api/wco-opinions', query: { resource: 'wco_opinions', ...query }, headers }, res);
  return res;
};

const l6 = await call({ hs: '852852' });
assert('công khai: không token vẫn 200', l6._s === 200, l6._j);
assert('danh sách mã 6 số: 2 ý kiến đã qua cổng (bỏ ý kiến headingSuspect), có đường dẫn xem toàn văn', l6._j.total === 2 && l6._j.items.map((x) => x.thuTuTrongMa).join() === '1,2' && l6._j.items[0].xemToanVan === '/api/wco-opinions?hs=852852&n=1');
assert('danh sách: độ tin cậy từng mục dùng chung luật doTinCay (khôi phục → SUY_LUAN)', l6._j.items[0].doTinCay === 'SUY_LUAN' && l6._j.items[1].doTinCay === 'CHAC');
assert('danh sách: nói thật "có thể chưa đủ" + kèm tuyên bố bản quyền', /chưa đủ/.test(l6._j.ghiChu) && /Oz tuyên bố đã trả phí bản quyền/.test(l6._j.banQuyen) && l6._j.daySuDu === false);
assert('danh sách không kèm nguyên văn (chỉ con trỏ)', !JSON.stringify(l6._j.items).includes('TFT LCD'));

const l8 = await call({ hs: '85285200' });
assert('mã 8 số → tra theo mã 6 số đầu', l8._j.hs === '852852' && l8._j.total === 2);
const l4 = await call({ hs: '8528' });
assert('mã 4 số → mọi ý kiến trong nhóm (852852 + 852862), vẫn không có ý kiến chưa qua cổng', l4._j.total === 3 && !l4._j.items.some((x) => x.thuTuTrongMa === 3 && x.hs === '852852'));

const one = await call({ hs: '852852', n: '1' });
assert('toàn văn: nguyên văn OCR + bản dịch + nguồn + tuyên bố bản quyền', one._s === 200 && one._j.nguyenVanEn.includes('TFT LCD') && one._j.banDichVi.includes('Màn hình') && one._j.nguon.includes('8528.52/1') && /WCO/.test(one._j.banQuyen) && one._j.daSoatAnh === false);
const sus = await call({ hs: '852852', n: '3' });
assert('ý kiến chưa qua cổng KHÔNG xem được dù biết số (404, nói thật là chưa qua cổng)', sus._s === 404 && /chưa đủ/.test(sus._j.ghiChu), sus._j);
const full = await call({ hs: '852852', chiTiet: '1' });
assert('chiTiet=1: danh sách kèm toàn văn', full._j.items.length === 2 && full._j.items[0].nguyenVanEn && full._j.items[0].banQuyen);

assert('thiếu/sai ?hs → 400', (await call({})) ._s === 400 && (await call({ hs: '85' }))._s === 400 && (await call({ hs: 'abcdef' }))._s === 400);
assert('có ?n mà mã không phải 6 số → 400', (await call({ hs: '8528', n: '1' }))._s === 400);

process.env.HS_WCO_OP_FILE = path.join(tmp, 'khong-co.json'); wco.reset();
assert('kho chưa nạp → 404 nói thật, không bịa danh sách rỗng "không có ý kiến"', (await call({ hs: '852852' }))._s === 404);

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
