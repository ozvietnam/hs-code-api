#!/usr/bin/env node
// Test bộ chấm rủi ro SHTT (lib/shtt-check.mjs) + server (scripts/shtt/serve.mjs).
// Dùng FIXTURE tạm, KHÔNG đọc data/ thật. Cách ly ghi bằng test-isolate-data.
import './test-isolate-data.mjs';
import fs from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import {
  chamRuiRo,
  chuanHoaNhan,
  hs8,
  khoangCachSua,
  laDaCap,
  laConSong,
  docDuLieu,
  DISCLAIMER,
  LoiDauVao,
  VN_EXPECTED,
} from '../lib/shtt-check.mjs';
import { createShttServer } from './shtt/serve.mjs';

let passed = 0;
let failed = 0;
const assert = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ` ${JSON.stringify(extra).slice(0, 300)}`}`);
  ok ? (passed += 1) : (failed += 1);
};

const rec = (nhan, tinhTrang, over = {}) => ({
  nhan,
  soDon: over.soDon || `VN-4-2020-${Math.floor(Math.random() * 99999)}`,
  tinhTrang,
  tinhTrangGoc: over.tinhTrangGoc || null,
  ungVien: over.ungVien || chuanHoaNhan(nhan).toLowerCase(),
  nguon: { url: 'https://wipopublish.ipvietnam.gov.vn/x', layLuc: '2026-10-16T16:29:06.011Z', sha256: 'a'.repeat(64) },
  ...over,
});

// Dữ liệu nền: độ phủ THẤP (giống thật) để kiểm "không bao giờ GREEN".
const dataThap = (records) => ({ records, dataAsOf: '2026-10-17', vnCrawled: records.length, vnExpected: VN_EXPECTED });

// ---- 1. Chuẩn hoá tên ----
assert('chuẩn hoá bỏ dấu + hoa/thường + ký tự', chuanHoaNhan('Việt-Nam 123') === 'VIETNAM123', chuanHoaNhan('Việt-Nam 123'));
assert('chuẩn hoá đ → d', chuanHoaNhan('đông á') === 'DONGA', chuanHoaNhan('đông á'));
assert('khoảng cách sửa cơ bản', khoangCachSua('SMC', 'SMG') === 1 && khoangCachSua('abc', 'abc') === 0);

// ---- 2. hs8 ----
assert('hs8: bỏ chấm, lấy 8 số', hs8('8481.30.00') === '84813000', hs8('8481.30.00'));
assert('hs8: không đủ 8 số → null', hs8('8481') === null && hs8('') === null);

// ---- 3. tình trạng ----
assert('laDaCap: DANG_KY / Cấp bằng', laDaCap(rec('A', 'DANG_KY')) && laDaCap(rec('A', 'KHAC', { tinhTrangGoc: 'Cấp bằng' })));
assert('laConSong: HET_HAN/TU_CHOI là chết', !laConSong(rec('A', 'HET_HAN')) && !laConSong(rec('A', 'TU_CHOI')));

// ---- 4. Trùng y hệt đang hiệu lực → RED ----
{
  const data = dataThap([rec('SMC', 'DANG_KY', { tinhTrangGoc: 'Cấp bằng', chuSoHuu: 'SMC Corporation' }), rec('KHAC', 'DANG_KY')]);
  const r = chamRuiRo({ brand: 'SMC', hs: '8481.30.00', origin: 'CN', data });
  assert('trùng y hệt đang hiệu lực → RED', r.level === 'RED', r);
  assert('RED: evidence có bản ghi trùng', r.evidence.length >= 1 && r.evidence[0].text === 'SMC' && r.evidence[0].jurisdiction === 'VN', r.evidence);
  assert('RED: reasons nêu trùng hiệu lực', r.reasons.some((x) => /trùng đang hiệu lực/.test(x)), r.reasons);
  assert('mọi mức: có disclaimer đúng', r.disclaimer === DISCLAIMER);
  assert('mọi mức: scope chỉ VN + coverage', r.scope.sources.join() === 'vn-ipvietnam' && r.scope.coverage.vnCrawled === 2 && r.scope.niceClasses.length === 0, r.scope);
  assert('reasons luôn nêu chưa tra TQ', r.reasons.some((x) => /chưa tra được Trung Quốc|CNIPA/.test(x)));
  assert('reasons luôn nêu chưa đối chiếu Nice', r.reasons.some((x) => /nhóm Nice/.test(x)));
}

// ---- 5. Trùng y hệt nhưng chỉ chuẩn hoá khác (dấu/hoa thường) → vẫn RED ----
{
  const data = dataThap([rec('smc', 'DANG_KY')]);
  const r = chamRuiRo({ brand: '  S.M.C  ', hs: '84813000', data });
  assert('trùng sau chuẩn hoá (dấu/ký tự) → RED', r.level === 'RED', r.level);
}

// ---- 6. Trùng y hệt nhưng đang xử lý (chưa cấp) → YELLOW ----
{
  const data = dataThap([rec('AIRTAC', 'DANG_XU_LY', { tinhTrangGoc: 'Đang giải quyết' })]);
  const r = chamRuiRo({ brand: 'airtac', hs: '84813000', data });
  assert('trùng đang xử lý (chưa cấp) → YELLOW', r.level === 'YELLOW' && r.reasons.some((x) => /đang xử lý/.test(x)), r);
}

// ---- 7. Tương tự → YELLOW ----
{
  const data = dataThap([rec('AIRTACX', 'DANG_KY')]); // khoảng cách sửa 1 so với AIRTAC
  const r = chamRuiRo({ brand: 'AIRTAC', hs: '84813000', data });
  assert('tương tự (edit≤2) đang hiệu lực → YELLOW', r.level === 'YELLOW' && r.reasons.some((x) => /tương tự/.test(x)), r);
}
{
  const data = dataThap([rec('SUPERSMC', 'DANG_KY')]); // chứa "SMC"
  const r = chamRuiRo({ brand: 'SMC', hs: '84813000', data });
  assert('tương tự (chứa nhau, ≥4 ký tự phần ngắn? SMC=3 → KHÔNG tính chứa)', r.level === 'UNKNOWN', r.level);
}
{
  const data = dataThap([rec('SUPERGRIP', 'DANG_KY')]); // chứa "GRIP" (4 ký tự)
  const r = chamRuiRo({ brand: 'GRIP', hs: '84813000', data });
  assert('tương tự (chứa nhau, phần ngắn ≥4) → YELLOW', r.level === 'YELLOW', r.level);
}

// ---- 8. Không khớp, độ phủ thấp → UNKNOWN (KHÔNG BAO GIỜ GREEN) ----
{
  const data = dataThap([rec('HOANTOANKHAC', 'DANG_KY')]);
  const r = chamRuiRo({ brand: 'ZZZQWERTY', hs: '84813000', data });
  assert('không khớp, độ phủ thấp → UNKNOWN', r.level === 'UNKNOWN', r.level);
  assert('UNKNOWN: reasons nêu không thể kết luận an toàn', r.reasons.some((x) => /không thể kết luận an toàn/.test(x)), r.reasons);
}

// ---- 9. Chỉ khớp bản ghi đã chết → UNKNOWN (không hạ xuống an toàn) ----
{
  const data = dataThap([rec('DEADMARK', 'HET_HAN', { tinhTrangGoc: 'Hết hạn' })]);
  const r = chamRuiRo({ brand: 'DEADMARK', hs: '84813000', data });
  assert('trùng nhưng hết hạn → UNKNOWN (không GREEN)', r.level === 'UNKNOWN' && r.reasons.some((x) => /hết hiệu lực|tái đăng ký/.test(x)), r);
}

// ---- 10. Độ phủ cao + không khớp → GREEN (đường code tồn tại nhưng thực tế không đạt) ----
{
  const data = { records: [rec('KHAC', 'DANG_KY')], dataAsOf: '2026-10-17', vnCrawled: 590000, vnExpected: VN_EXPECTED };
  const r = chamRuiRo({ brand: 'ZZZNOMATCH', hs: '84813000', data });
  assert('độ phủ ≥ 90% + không khớp → GREEN', r.level === 'GREEN', r.level);
}

// ---- 11. Lỗi đầu vào ----
{
  let threw = false;
  try { chamRuiRo({ brand: '', hs: '84813000', data: dataThap([]) }); } catch (e) { threw = e instanceof LoiDauVao && e.dauVaoSai; }
  assert('thiếu brand → LoiDauVao', threw);
}
{
  let threw = false;
  try { chamRuiRo({ brand: 'SMC', hs: '8481', data: dataThap([]) }); } catch (e) { threw = e instanceof LoiDauVao && e.dauVaoSai; }
  assert('hs không đủ 8 số → LoiDauVao', threw);
}

// ---- 12. importer chỉ ghi chú, không đổi mức ----
{
  const data = dataThap([rec('SMC', 'DANG_KY')]);
  const r = chamRuiRo({ brand: 'ZZZ', hs: '84813000', importer: 'SMC Corporation', data });
  assert('importer → thêm ghi chú, không tự suy quyền', r.level === 'UNKNOWN' && r.reasons.some((x) => /importer/.test(x)), r.reasons);
}

// ---- 13. docDuLieu đọc thư mục tạm (không đọc data/ thật) ----
{
  const d = fs.mkdtempSync(join(os.tmpdir(), 'shtt-check-'));
  fs.writeFileSync(join(d, 'vn-ipvietnam-dang-ky.jsonl'), [JSON.stringify(rec('SMC', 'DANG_KY')), 'dòng-hỏng', JSON.stringify(rec('ABC', 'DANG_KY'))].join('\n') + '\n');
  fs.writeFileSync(join(d, 'bao-cao.json'), JSON.stringify({ ngay: '2026-10-17', nguon: [{ ma: 'vn-ipvietnam-dang-ky', trangThai: 'OK', soBanGhi: 2 }] }));
  const data = docDuLieu(d);
  assert('docDuLieu: bỏ dòng hỏng, đọc đúng số dòng tốt', data.records.length === 2 && data.dataAsOf === '2026-10-17', { n: data.records.length, asOf: data.dataAsOf });
}

// ---- 14. Server: 200 / 400 / 401 ----
{
  const data = dataThap([rec('SMC', 'DANG_KY', { tinhTrangGoc: 'Cấp bằng' })]);
  const server = createShttServer({ data, key: 'secret-test' });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const hz = await fetch(`${base}/healthz`);
    const hzj = await hz.json();
    assert('GET /healthz → 200 ok', hz.status === 200 && hzj.ok === true, hzj);

    const no401 = await fetch(`${base}/v1/check?brand=SMC&hs=84813000`);
    assert('thiếu x-api-key → 401', no401.status === 401, no401.status);

    const ok200 = await fetch(`${base}/v1/check?brand=SMC&hs=8481.30.00&origin=CN`, { headers: { 'x-api-key': 'secret-test' } });
    const okj = await ok200.json();
    assert('có key + đầu vào đúng → 200 RED', ok200.status === 200 && okj.level === 'RED', { s: ok200.status, lvl: okj.level });

    const bad400 = await fetch(`${base}/v1/check?brand=SMC&hs=8481`, { headers: { 'x-api-key': 'secret-test' } });
    const badj = await bad400.json();
    assert('hs không đủ 8 số → 400 {error}', bad400.status === 400 && typeof badj.error === 'string', { s: bad400.status, j: badj });

    const noBrand = await fetch(`${base}/v1/check?hs=84813000`, { headers: { 'x-api-key': 'secret-test' } });
    assert('thiếu brand → 400', noBrand.status === 400, noBrand.status);

    const notFound = await fetch(`${base}/khong-co`, { headers: { 'x-api-key': 'secret-test' } });
    assert('route lạ → 404', notFound.status === 404, notFound.status);
  } finally {
    await new Promise((ok) => server.close(ok));
  }
}

// ---- 15. Server mở (không khoá) ----
{
  const data = dataThap([rec('SMC', 'DANG_KY')]);
  const server = createShttServer({ data, key: '' });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const r = await fetch(`${base}/v1/check?brand=ZZZ&hs=84813000`);
    const j = await r.json();
    assert('không đặt khoá → mở, trả 200', r.status === 200 && j.level === 'UNKNOWN', { s: r.status, lvl: j.level });
  } finally {
    await new Promise((ok) => server.close(ok));
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
