#!/usr/bin/env node
/**
 * Kiểm tra bất biến cho các tối ưu tầng tìm (PR D1):
 * 1. `embed-pool.timTheoNghiaTrucTiep` nhân vô hướng 8-chiều khớp tuyệt đối bản gốc (sai số <= 1e-5).
 * 2. `precedent-search` tự dựng lại chỉ mục tăng tốc khi `loadFlatPrecedents()` bị push thêm bản ghi động.
 * 3. `tim-cgct` dùng lại Float64Array buffer không rò điểm giữa các truy vấn liên tiếp.
 * 4. `search-utils.searchCandidates` lặp lại cùng truy vấn cho kết quả tất định 100%.
 */

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const embedPool = require('../lib/embed-pool.js');
const precMod = require('../lib/precedent-search.js');
const searchMod = require('../lib/search-utils.js');
const cgctMod = require('../lib/tim-cgct.js');

let passed = 0;
function ok(name, cond, detail = '') {
  assert.ok(cond, detail ? `${name}: ${detail}` : name);
  passed += 1;
  console.log(`PASS ${name}`);
}

// 1. Kiểm tra 8-way unroll int8 dot-product trong timTheoNghiaTrucTiep (dim=384)
{
  const dim = 384;
  const count = 40;
  const scale = 127;
  const vectors = new Int8Array(count * dim);
  const vec = new Float32Array(dim);
  for (let d = 0; d < dim; d += 1) vec[d] = Math.sin(d * 0.13) * 0.05;
  const items = [];
  for (let i = 0; i < count; i += 1) {
    items.push({ hs: `8481${String(i).padStart(4, '0')}`, nguon: 'test', ten: `Muc ${i}` });
    for (let d = 0; d < dim; d += 1) {
      vectors[i * dim + d] = ((i * 31 + d * 17) % 200) - 100;
    }
  }
  const idx = { kieu: 'int8', dim, count, scale, items, vectors };
  const res = embedPool.timTheoNghiaTrucTiep(vec, idx, { k: 5 });
  assert.ok(res && res.muc.length === 5);

  const naive = items.map((it, i) => {
    let dot = 0;
    for (let d = 0; d < dim; d += 1) dot += vec[d] * vectors[i * dim + d];
    return { hs: it.hs, diem: +(dot / scale).toFixed(4) };
  }).sort((a, b) => (b.diem - a.diem) || (a.hs < b.hs ? -1 : 1)).slice(0, 5);

  ok(
    'timTheoNghiaTrucTiep dim=384 khớp tuyệt đối bản chuẩn',
    JSON.stringify(res.muc.map((x) => ({ hs: x.hs, diem: x.diem }))) === JSON.stringify(naive),
    JSON.stringify({ got: res.muc.slice(0, 2), expected: naive.slice(0, 2) }),
  );
}

// 2. Kiểm tra searchPrecedents tự nhận diện push động sau loadFlatPrecedents()
{
  precMod.reset();
  const flat = precMod.loadFlatPrecedents();
  const truoc = precMod.searchPrecedents('van dien tu khi nen dac biet xyz987654', { topK: 5 });
  const fakeId = 'TEST_D1_DYNAMIC_PUSH_987654';
  flat.push({
    precedentId: fakeId,
    source: 'RULING_CBP',
    loaiNguon: 'RULING_CBP',
    instrumentType: 'RULING',
    country: 'US',
    tbTchqNumber: null,
    productNameRaw: 'CBP TEST: van dien tu khi nen dac biet xyz987654',
    technicalSpec: '',
    finalHsCode: '84812090',
    outcome: 'APPROVED',
    outcomeHs: '84812090',
    confusedWith: [],
    _headTokens: new Set(['cbp', 'test', 'van', 'dien', 'tu', 'khi', 'nen', 'dac', 'biet', 'xyz987654']),
    _nameTokens: new Set(['cbp', 'test', 'van', 'dien', 'tu', 'khi', 'nen', 'dac', 'biet', 'xyz987654']),
    _specTokens: new Set(),
    _xacMinhBase: 'CHUA',
    xacMinh: 'CHUA',
  });
  const sau = precMod.searchPrecedents('van dien tu khi nen dac biet xyz987654', { topK: 5 });
  ok(
    'precedent-search tự dựng lại accel khi push bản ghi động',
    !truoc.some((x) => x.precedent.precedentId === fakeId)
      && sau.some((x) => x.precedent.precedentId === fakeId),
  );
  precMod.reset();
}

// 3. Kiểm tra timCgct dùng lại Float64Array buffer không rò điểm giữa các truy vấn
{
  const q1 = 'van điện từ khí nén';
  const q2 = 'bình giữ nhiệt inox chân không';
  const r1a = cgctMod.timCgct(q1, { limit: 10 });
  const r2 = cgctMod.timCgct(q2, { limit: 10 });
  const r1b = cgctMod.timCgct(q1, { limit: 10 });
  const snap = (r) => ({
    nhom: r.nhom,
    diem: [...r.diem.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([k, v]) => [k, Math.round(v * 1e9)]),
  });
  ok(
    'timCgct lặp lại sau truy vấn khác không rò trạng thái buffer',
    JSON.stringify(snap(r1a)) === JSON.stringify(snap(r1b))
      && JSON.stringify(r1a.nhom) !== JSON.stringify(r2.nhom),
  );
}

// 4. Kiểm tra searchCandidates lặp lại tất định
{
  const q = 'van điện từ khí nén';
  const a = searchMod.searchCandidates(q, { topCandidates: 10 }).map((x) => [x.hsCode, x.score]);
  const b = searchMod.searchCandidates(q, { topCandidates: 10 }).map((x) => [x.hsCode, x.score]);
  ok('searchCandidates lặp lại tất định 100%', JSON.stringify(a) === JSON.stringify(b) && a.length > 0);
}

console.log(`\n${passed}/${passed} passed, 0 failed`);
