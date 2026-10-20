#!/usr/bin/env node
/**
 * Issue #359 Lỗi 1 — ngưỡng similarity cho tìm tiền lệ.
 *
 * Ca thật (ERP 20/10, màn "Sửa thông tin mã HS và thuế", hàng "Nắp khóa 4000-68513"):
 *   /api/precedents?q=nắp che ổ khóa tủ điện… → found:true, total:2, cả 2 đều lạc đề
 *   (điều khiển từ xa bảng giá điện tử 8526.92 similarity 0,537 + glovebox TCO Úc 8421.39).
 *   Không có ngưỡng ⇒ top-k trả về bất kể độ liên quan, người đọc tưởng "có tiền lệ".
 *
 * NGƯỠNG CHỐT = 0,55 — ĐO trên bộ mẫu vàng 38 ca (tests/fixtures/soat/ca-tong-hop.json, 17/10):
 *   · top-1 SAI nhóm cao nhất trong 38 ca = 0,504  → 0,55 loại hết mọi match sai
 *   · top-1 ĐÚNG thấp nhất = 0,495, kế tiếp 0,524  → 0,55 giữ nguyên ca 0,591 trở lên
 *   · ca trong issue (0,537) < 0,55 ⇒ found:false đúng như mong muốn
 *   0,70 như issue đề xuất KHÔNG dùng được: 4781/4837 tiền lệ TB-TCHQ có outcome là mã 8 số
 *   nhưng điểm khớp văn bản hiếm khi vượt 0,5; ý kiến WCO bị chặn trần 0,45 trong scorePrecedent;
 *   đo trên 120 tờ khai Oz thật (không lọc holdout) thì 0,70 loại 120/120 — kể cả ca ĐÚNG.
 *
 * Bất biến khoá ở đây:
 *   1. Mọi match trả về đều ≥ ngưỡng và luôn có trường `similarity` ở TẦNG NGOÀI (kể cả TCO).
 *   2. Trong 38 ca vàng, KHÔNG ca nào bị trả top-1 sai nhóm.
 *   3. Dưới ngưỡng → found:false + lyDo nói rõ (không phải mảng rỗng im lặng).
 *   4. maHs chỉ được ƯU TIÊN (boost nhẹ theo nhóm 4 số), KHÔNG được lọc cứng.
 */
import './test-isolate-data.mjs';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { searchPrecedents, NGUONG_KHOP_TIEN_LE } = require('../lib/precedent-search.js');

let passed = 0;
let failed = 0;
function assert(name, cond, detail) {
  if (cond) { console.log('PASS', name); passed += 1; }
  else { console.log('FAIL', name, detail || ''); failed += 1; }
}
const nz = (s) => String(s || '').replace(/\D/g, '');

// ── Ca lỗi trong issue ────────────────────────────────────────────────────────
const CA_LOI = 'nắp che ổ khóa tủ điện bộ phận vỏ tủ bảng điều khiển';
assert('ngưỡng chốt = 0,55 (đo trên 38 ca vàng, xem đầu tệp)', NGUONG_KHOP_TIEN_LE === 0.55, String(NGUONG_KHOP_TIEN_LE));

const loiCo = searchPrecedents(CA_LOI, { topK: 5 });
assert('không ngưỡng: vẫn ra tiền lệ lạc đề (tái hiện lỗi gốc)', loiCo.length > 0 && loiCo[0].similarity < NGUONG_KHOP_TIEN_LE,
  JSON.stringify(loiCo.map((m) => [m.precedent.precedentId, m.finalHsCode, +m.similarity.toFixed(3)])));
const loiSau = searchPrecedents(CA_LOI, { topK: 5, minSimilarity: NGUONG_KHOP_TIEN_LE });
assert('có ngưỡng: ca lỗi trả về rỗng', loiSau.length === 0,
  JSON.stringify(loiSau.map((m) => [m.precedent.precedentId, m.finalHsCode, +m.similarity.toFixed(3)])));

// ── Bộ mẫu vàng 38 ca (nguồn công khai, không dùng tờ khai gốc của Oz) ──────────
const cases = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'soat', 'ca-tong-hop.json'), 'utf8')).ca;
const duoi = [];
const sai = [];
let co = 0;
for (const c of cases) {
  const m = searchPrecedents(c.moTa, { topK: 5, minSimilarity: NGUONG_KHOP_TIEN_LE });
  if (m.length) co += 1;
  for (const x of m) if (x.similarity < NGUONG_KHOP_TIEN_LE) duoi.push([c.id, x.precedent.precedentId, x.similarity]);
  if (m.length && !m[0].finalHsCode.startsWith(nz(c.maDung).slice(0, 4))) {
    sai.push([c.id, `trả ${m[0].finalHsCode} (${m[0].similarity.toFixed(3)}) nhưng đáp án ${c.maDung}`]);
  }
}
console.log(`  (đo: ${co}/${cases.length} ca vàng còn ra tiền lệ; ${cases.length - co} ca trả found:false)`);
assert(`38 ca vàng: KHÔNG ca nào có match dưới ngưỡng`, duoi.length === 0, JSON.stringify(duoi).slice(0, 400));
assert('38 ca vàng: KHÔNG ca nào bị trả top-1 sai nhóm', sai.length === 0, JSON.stringify(sai).slice(0, 600));

// ── Mọi match phải có `similarity` ở TẦNG NGOÀI (TCO trước đây thiếu) ───────────
const coKhop = cases.map((c) => searchPrecedents(c.moTa, { topK: 5, minSimilarity: NGUONG_KHOP_TIEN_LE })).flat();
const thieu = coKhop.filter((m) => typeof m.similarity !== 'number' || !Number.isFinite(m.similarity));
assert(`mọi match có similarity ở tầng ngoài (${coKhop.length} match)`, thieu.length === 0, JSON.stringify(thieu.map((m) => m.precedent.precedentId)));
const tco = coKhop.find((m) => m.precedent.source === 'TCO_ABF');
console.log(`  (mẫu có ${coKhop.filter((m) => m.precedent.source === 'TCO_ABF').length} match TCO_ABF; ví dụ ${tco ? `${tco.precedent.precedentId} sim=${tco.similarity.toFixed(3)}` : '—'})`);

// ── Endpoint: dưới ngưỡng → found:false + lyDo (không mảng rỗng im lặng) ────────
const handler = require('../api/dataset.js');
function mockRes() {
  return {
    _s: 0, _j: null, headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    getHeader(k) { return this.headers[k]; },
    status(c) { this._s = c; return this; },
    json(p) { this._j = p; return this; },
    end() { return this; },
  };
}
async function callApi(query, extra = {}) {
  const res = mockRes();
  await handler({ method: 'GET', url: '/api/precedents', query: { resource: 'precedents', q: query, ...extra }, headers: {} }, res);
  return res;
}
{
  const r = await callApi(CA_LOI);
  assert('GET ?q=<ca lỗi> → 200', r._s === 200, String(r._s));
  assert('GET ?q=<ca lỗi> → found:false', r._j?.found === false, JSON.stringify({ found: r._j?.found, total: r._j?.total }));
  assert('GET ?q=<ca lỗi> → có lyDo nói rõ không có tiền lệ đủ gần',
    typeof r._j?.lyDo === 'string' && /tiền lệ/i.test(r._j.lyDo), JSON.stringify(r._j?.lyDo));
  assert('GET ?q=<ca lỗi> → matches rỗng + total 0', Array.isArray(r._j?.matches) && r._j.matches.length === 0 && r._j.total === 0);
}
{
  // Ca vàng có tiền lệ thật → vẫn found:true, mọi match ≥ ngưỡng, nêu luôn ngưỡng đã dùng.
  const c = cases.find((x) => x.id === 'tb-hat-pp');
  const r = await callApi(c.moTa);
  assert(`GET ?q=<${c.id}> (hạt nhựa PP) → found:true`, r._j?.found === true && r._j.total > 0, JSON.stringify({ found: r._j?.found, total: r._j?.total }));
  assert(`GET ?q=<${c.id}> → mọi match ≥ ngưỡng`, (r._j?.matches || []).every((m) => m.similarity >= NGUONG_KHOP_TIEN_LE),
    JSON.stringify((r._j?.matches || []).map((m) => [m.finalHsCode, m.similarity])));
  assert('phản hồi nêu ngưỡng đã áp dụng', r._j?.nguong === NGUONG_KHOP_TIEN_LE, String(r._j?.nguong));
}

// ── maHs: ưu tiên nhóm 4 số (boost nhẹ), KHÔNG lọc cứng ────────────────────────
const Q_LUOI = 'Lưỡi dao thay thế bằng thép carbon cao SK5, dùng để lắp vào con dao';
const khongMa = searchPrecedents(Q_LUOI, { topK: 6 });
const coMa = searchPrecedents(Q_LUOI, { topK: 6, maHs: '73089000' });
assert('không truyền maHs: nhóm 8205 đứng đầu', khongMa[0]?.finalHsCode.startsWith('8205'), JSON.stringify(khongMa.slice(0, 2).map((m) => [m.finalHsCode, m.similarity])));
assert('truyền maHs=73089000: nhóm 7308 được ưu tiên lên đầu', coMa[0]?.finalHsCode.startsWith('7308'), JSON.stringify(coMa.slice(0, 2).map((m) => [m.finalHsCode, m.similarity])));
assert('maHs KHÔNG lọc cứng: số match không đổi, không mất mạch nào', coMa.length === khongMa.length
  && coMa.every((m) => khongMa.some((k) => k.precedent.precedentId === m.precedent.precedentId)),
  `${coMa.length} vs ${khongMa.length}`);
assert('maHs KHÔNG đẩy dưới ngưỡng bất kỳ match nào còn lại',
  searchPrecedents(Q_LUOI, { topK: 6, maHs: '73089000', minSimilarity: NGUONG_KHOP_TIEN_LE })
    .every((m) => m.similarity >= NGUONG_KHOP_TIEN_LE));
{
  // maHs thuộc nhóm không có tiền lệ nào → KHÔNG được sinh match ảo, KHÔNG chặn mạch đang có.
  const r = await callApi(Q_LUOI, { hs: '39269099' });
  assert('maHs thuộc nhóm không có tiền lệ: không được sinh match ma', (r._j?.matches || []).every((m) => !m.finalHsCode.startsWith('3926')),
    JSON.stringify((r._j?.matches || []).map((m) => m.finalHsCode)));
  assert('maHs không chặn được mạch cùng nhóm: vẫn ra tiền lệ 7308', (r._j?.matches || []).some((m) => m.finalHsCode.startsWith('7308')),
    JSON.stringify((r._j?.matches || []).map((m) => [m.finalHsCode, +m.similarity.toFixed(3)])));
}
{
  // Còn nhánh ?hs= (tra đúng mã) KHÔNG đổi: đây là tra cứu theo mã, không phải tìm theo mô tả.
  const res = mockRes();
  await handler({ method: 'GET', url: '/api/precedents', query: { resource: 'precedents', hs: '85389019' }, headers: {} }, res);
  assert('GET ?hs= giữ nguyên hành vi tra theo mã', res._s === 200 && res._j?.found === true && Array.isArray(res._j?.items),
    JSON.stringify({ s: res._s, found: res._j?.found }));
}

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);