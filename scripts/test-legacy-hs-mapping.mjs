#!/usr/bin/env node
/**
 * OZV-400 — bảng dẫn nối mã HS cũ→mới (data/legacy-hs-mapping) + mở tiền lệ ký gửi.
 *
 * Khoá:
 *   1. Mọi cặp trong tệp đã commit: mã đích CÒN SỐNG + là dòng CÓ TÊN (residual-guard),
 *      mã cũ ĐÃ CHẾT — 0 cặp trỏ "Loại khác" lọt vào làn này (tiêu chí thẻ).
 *   2. Cổng kiemTraCap/doMaMoi loại đúng từng lý do; test mutation: gỡ bảng ra,
 *      chương trình vẫn chạy được nhưng ca "mở được bản ghi" phải ĐỎ (không rỗng — OZV-310).
 *   3. Unpark trên fixture: mở đúng, giữ lại bản ghi bảng chưa phủ; tệp sinh ra
 *      PHẢI qua validate-community (làn dẫn nối); merge-community đưa vào kho dưới mã MỚI.
 */
import './test-isolate-data.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const L = require('../lib/legacy-hs-mapping.js');
const N = require('../lib/nguon-loai.js');
const RG = require('../lib/residual-guard.js');

let passed = 0;
let failed = 0;
function assert(name, cond, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${cond ? '' : ` ${JSON.stringify(detail).slice(0, 400)}`}`);
  if (cond) passed += 1;
  else failed += 1;
}

const tax = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'tax.json'), 'utf8'));
const mappingDir = path.join(ROOT, 'data', 'legacy-hs-mapping');

// ── 1. Tệp đã commit: 0 cặp trỏ "Loại khác", mọi cặp qua đủ 4 điều kiện ──
{
  const files = fs.readdirSync(mappingDir).filter((f) => f.endsWith('.json')).sort();
  assert('2 tệp bảng trong data/legacy-hs-mapping/', files.length === 2, files);
  let tong = 0;
  let viPham = [];
  for (const f of files) {
    const doc = JSON.parse(fs.readFileSync(path.join(mappingDir, f), 'utf8'));
    tong += Object.keys(doc.mapping || {}).length;
    for (const [old, v] of Object.entries(doc.mapping || {})) {
      const loi = L.kiemTraCap(old, v.hs_moi);
      if (loi) viPham.push(`${f}: ${old}->${v.hs_moi} (${loi})`);
    }
  }
  assert(`tệp đã commit: mọi cặp hợp lệ (sống + dòng CÓ TÊN + mã cũ chết) — ${tong} cặp`, tong > 0 && viPham.length === 0, viPham);
  let soLoaiKhac = 0;
  for (const f of files) {
    const doc = JSON.parse(fs.readFileSync(path.join(mappingDir, f), 'utf8'));
    for (const v of Object.values(doc.mapping || {})) if (RG.isResidual(v.hs_moi)) soLoaiKhac += 1;
  }
  assert(`0 cặp trỏ dòng "Loại khác" lọt vào PR (đếm trực tiếp trên tệp) — thấy ${soLoaiKhac}`, soLoaiKhac === 0);

  const bang = L.tatCa();
  const biBo = L.boDi();
  // 4 mã cũ có mặt ở cả 2 tệp (51121100, 72149121, 72279000, 85013140 — đồng ý hs_moi) — bảng tra gộp theo mã cũ
  const maCuRieng = new Set();
  for (const f of files) for (const k of Object.keys(JSON.parse(fs.readFileSync(path.join(mappingDir, f), 'utf8')).mapping || {})) maCuRieng.add(k);
  assert(`lib nạp đủ cặp hợp lệ (${Object.keys(bang).length} mã cũ riêng biệt của ${tong} cặp / ${maCuRieng.size} mã), không cặp nào bị cổng loại`, Object.keys(bang).length === maCuRieng.size && Object.keys(biBo).length === 0, { nap: Object.keys(bang).length, rieng: maCuRieng.size, bo: Object.keys(biBo).length });
  for (const [old, m] of Object.entries(bang)) {
    if (!tax[m.hsMoi] || RG.isResidual(m.hsMoi) || tax[old]) { viPham.push(`${old}->${m.hsMoi}`); }
  }
  assert('mọi cặp trong bảng tra: đích còn sống + KHÔNG residual + mã cũ chết', viPham.length === 0, viPham);
}

// ── 2. Cổng: từng lý do loại + ví dụ thật ──
assert("doMaMoi('26011100') → 26011110 'Chưa nung kết' (dòng CÓ TÊN)", (() => { const m = L.doMaMoi('26011100'); return m?.hsMoi === '26011110' && !RG.isResidual(m.hsMoi); })(), L.doMaMoi('26011100'));
assert("doMaMoi cặp trỏ 'Loại khác' (38249099→38249999) → null (cổng residual-guard chặn)", RG.isResidual('38249999') && L.kiemTraCap('38249099', '38249999') === 'ma_moi_la_loai_khac' && L.doMaMoi('38249099') === null);
assert('kiemTraCap: tự trỏ → tu_tro', L.kiemTraCap('26011100', '26011100') === 'tu_tro');
assert('kiemTraCap: mã cũ còn sống → ma_cu_con_song', L.kiemTraCap('01012100', '26011110') === 'ma_cu_con_song');
assert('kiemTraCap: mã đích chết → ma_moi_chet', L.kiemTraCap('26011100', '99999999') === 'ma_moi_chet');
assert('kiemTraCap: thiếu 8 số → dinh_dang', L.kiemTraCap('2601', '26011110') === 'dinh_dang');
assert('doMaMoi mã ngoài bảng → null', L.doMaMoi('99999999') === null);

// ── 3. Nhãn nguonLoai ──
assert('legacy-hs-mapping/*.json → nhãn AI_DA_KIEM + ghiChu nói rõ KHÔNG phải căn cứ pháp lý (dữ liệu đối chiếu)', N.nhanCuaTep('legacy-hs-mapping/2026-10-15-oz-wiki-114-mapping.json') === 'AI_DA_KIEM' && /KHÔNG phải căn cứ pháp lý/.test(N.TEP['legacy-hs-mapping/*.json'].ghiChu), N.TEP['legacy-hs-mapping/*.json']);

// ── 4. Unpark trên fixture ──
const SCRIPT = path.join(ROOT, 'scripts', 'unpark-legacy-precedents.mjs');
function envSach() {
  const e = { ...process.env };
  delete e.HS_DATA_DIR; // script nhận --data-dir riêng; không để env test đụng đường dẫn của nó
  return e;
}
function chay(fxDir, mappingDirArg) {
  const args = [SCRIPT, '--data-dir', fxDir];
  if (mappingDirArg) args.push('--mapping-dir', mappingDirArg);
  const out = execFileSync('node', args, { encoding: 'utf8', cwd: ROOT, env: envSach() });
  return JSON.parse(out.trim().split('\n').pop());
}
function dungFixture() {
  const fx = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-unpark-fx-'));
  const moFile = (rel, obj) => {
    const p = path.join(fx, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
    return p;
  };
  moFile(path.join('community-parked', 'tb-tchq-bieu-thue-cu.json'), {
    kind: 'precedent',
    contributor: { name: 'agent-tbtchq-toan-van', github: 'ozvietnam' },
    license: 'CC-BY-SA-4.0',
    submittedAt: '2026-09-24',
    note: 'fixture test OZV-400',
    records: [
      { hsCode: '26011100', description: 'Tinh quặng sắt nâu, chưa nung kết, hàm lượng Fe = 57.05%.', source: { type: 'TB-TCHQ', reference: '617/TB-TCHQ', issuedDate: '2018-01-31', url: 'https://example.com/617' }, reasonVi: 'TB kết luận nhóm 2601.11 chưa nung kết theo biểu thuế 2017, mã số 2601.11.00.', confusedWith: [] },
      { hsCode: '38021000', description: 'Than hoạt tính dạng bột dùng xử lý nước.', source: { type: 'TB-TCHQ', reference: '123/TB-TCHQ', issuedDate: '2015-05-05', url: 'https://example.com/123' }, reasonVi: 'TB kết luận than hoạt tính 3802.10.00 theo biểu cũ.', confusedWith: [] },
      { hsCode: '84798999', description: 'Máy đóng gói dạng khác — mã cũ bảng chưa phủ, phải ở lại ký gửi.', source: { type: 'TB-TCHQ', reference: '456/TB-TCHQ', issuedDate: '2020-02-02', url: 'https://example.com/456' }, reasonVi: 'Ngoài phạm vi bảng.', confusedWith: [] },
    ],
  });
  // nhánh mã-cũ trùng khoá (phải bị xoá) + một bản ghi khác cùng mã cũ (phải SỐNG SÓT)
  moFile('precedents.json', {
    '26011100': [
      { tbTchqNumber: '617/TB-TCHQ', productName: 'Tinh quặng sắt nâu, chưa nung kết, hàm lượng Fe = 57.05%.', technicalSpec: 'lý do dài hơn 150 ký tự...'.repeat(3), year: 2018, outcome: '26011100', sourceFile: 'community:tb-tchq/x.json', contributor: { name: 't', github: 'ozvietnam' }, sourceType: 'TB-TCHQ', confusedWith: [], issuedDate: '2018-01-31' },
      { tbTchqNumber: '999/TB-TCHQ', productName: 'Quặng sắt khác không liên quan — phải sống sót.', technicalSpec: 'spec', year: 2019, outcome: '26011100', sourceFile: 'community:tb-tchq/y.json', contributor: { name: 't', github: 'ozvietnam' }, sourceType: 'TB-TCHQ', confusedWith: [], issuedDate: '2019-01-01' },
    ],
  });
  return fx;
}

{
  const fx = dungFixture();
  const kq = chay(fx, mappingDir);
  assert(`unpark mở đúng 2 bản ghi / 2 mã cũ (fixture)`, kq.mo === 2 && kq.maCu === 2 && kq.maMoi === 2, kq);
  const ngay = new Date().toISOString().slice(0, 10);
  const outFile = path.join(fx, 'community', 'tb-tchq', `legacy-mo-ky-gui-${ngay}.json`);
  assert('ghi tệp community với hsCode = mã MỚI +溯源 attributes', (() => {
    if (!fs.existsSync(outFile)) return false;
    const doc = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    const r0 = doc.records.find((r) => r.attributes?.hs_code_goc === '26011100');
    return doc.kind === 'precedent' && doc.records.length === 2 && r0?.hsCode === '26011110' && r0.attributes.legacyHs === true
      && r0.attributes.legacyHsRemap[0] === '26011110' && /residual-guard/.test(r0.attributes.legacyHsReasoning);
  })(), outFile);
  assert('reasonVi = bản gốc + câu dẫn nối ở cuối (chứa mã MỚI, ≤1000 ký tự); legacyHsReasoning là CHÍNH chuỗi được nối', (() => {
    const doc = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    const r0 = doc.records.find((r) => r.attributes?.hs_code_goc === '26011100');
    const r1 = doc.records.find((r) => r.attributes?.hs_code_goc === '38021000');
    const ok0 = r0.reasonVi.endsWith(r0.attributes.legacyHsReasoning) && r0.reasonVi.includes('26011110') && r0.reasonVi.includes('26011100') && r0.reasonVi.length <= 1000;
    const ok1 = r1.reasonVi.endsWith(r1.attributes.legacyHsReasoning) && r1.reasonVi.includes('38021010') && r1.reasonVi.length <= 1000;
    return ok0 && ok1;
  })());
  assert('backfill bieuThue theo ngày ký TB (2018→2017, 2015→2012)', (() => {
    const doc = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    const r0 = doc.records.find((r) => r.attributes?.hs_code_goc === '26011100');
    const r1 = doc.records.find((r) => r.attributes?.hs_code_goc === '38021000');
    return r0.attributes.bieuThue === '2017' && r1.attributes.bieuThue === '2012';
  })());
  assert('bản ghi bảng-chưa-phủ Ở LẠI ký gửi; kho ký gửi còn đúng 1', (() => {
    const p = JSON.parse(fs.readFileSync(path.join(fx, 'community-parked', 'tb-tchq-bieu-thue-cu.json'), 'utf8'));
    return p.records.length === 1 && p.records[0].hsCode === '84798999';
  })());
  // Tệp sinh ra PHẢI qua được chính validator dùng cho mọi đóng góp (làn dẫn nối) —
  // không phải chỉ qua kiểm riêng của script này.
  {
    const v = spawnSync('node', [path.join(ROOT, 'scripts', 'validate-community.mjs'), outFile], { encoding: 'utf8', cwd: ROOT, env: envSach() });
    const dongLoi = String(v.stderr || '').split('\n').filter((l) => l.startsWith('❌'));
    assert(`validate-community CHẤP NHẬN tệp sinh ra (exit ${v.status})`, v.status === 0 && dongLoi.length === 0, dongLoi.slice(0, 5));
  }
  assert('KHÔNG sửa precedents.json (chỉ đếm báo cáo 1 nhánh mã-cũ trùng khoá; cả 2 bản ghi cũ còn nguyên)', (() => {
    const prec = JSON.parse(fs.readFileSync(path.join(fx, 'precedents.json'), 'utf8'));
    return kq.nhanhCuConLai === 1 && prec['26011100'].length === 2 && prec['26011100'].some((p) => p.tbTchqNumber === '999/TB-TCHQ');
  })());

  // merge-community đưa vào kho dưới mã MỚI
  execFileSync('node', [path.join(ROOT, 'scripts', 'merge-community.mjs'), '--community-dir', path.join(fx, 'community'), '--data-dir', fx], { encoding: 'utf8', cwd: ROOT, env: envSach() });
  const precSau = JSON.parse(fs.readFileSync(path.join(fx, 'precedents.json'), 'utf8'));
  assert('merge-community: 2 bản ghi vào kho dưới mã MỚI, mang hsCodeGoc + legacyHs', (() => {
    const a = precSau['26011110'] || [];
    const b = precSau['38021010'] || [];
    return a.length === 1 && a[0].hsCodeGoc === '26011100' && a[0].legacyHs === true && a[0].legacyHsRemap[0] === '26011110'
      && b.length === 1 && b[0].hsCodeGoc === '38021000';
  })(), Object.keys(precSau));

  // idempotent: chạy lại không còn gì mở, không đổi tệp
  const truoc = fs.readFileSync(path.join(fx, 'community-parked', 'tb-tchq-bieu-thue-cu.json'));
  const kq2 = chay(fx, mappingDir);
  const sau = fs.readFileSync(path.join(fx, 'community-parked', 'tb-tchq-bieu-thue-cu.json'));
  assert('idempotent: chạy lại mở 0, không đổi tệp ký gửi', kq2.mo === 0 && truoc.equals(sau), kq2);

  // ── mutation (OZV-310): gỡ bảng → chương trình CHẠY ĐƯỢC, ca "mở được" phải ĐỎ ──
  const fx2 = dungFixture();
  const rong = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-unpark-rong-'));
  const mut = chay(fx2, rong);
  assert('mutation — gỡ bảng: chương trình vẫn chạy (exit 0), mở 0 bản ghi, không ghi tệp', mut.mo === 0, mut);
  const outKhong = !fs.existsSync(path.join(fx2, 'community', 'tb-tchq'));
  const conNguyen = JSON.parse(fs.readFileSync(path.join(fx2, 'community-parked', 'tb-tchq-bieu-thue-cu.json'), 'utf8')).records.length === 3;
  assert('mutation — không tệp nào bị ghi, ký gửi nguyên vẹn 3 bản ghi', outKhong && conNguyen);
  assert('mutation — ca "mở 2 bản ghi" ĐỎ khi gỡ bảng (bản vá thật sự tiêu thụ bảng, không rỗng)', !(mut.mo === 2));
}

// ── 5. Trên dữ liệu thật (bất biến SAU KHI làn chạy — không khoá số đếm sẽ đổi khi làn 2 vào) ──
{
  // Tệp mở đã commit trong community: mọi bản ghi phải giữ hợp đồng dẫn nối
  const dir = path.join(ROOT, 'data', 'community', 'tb-tchq');
  const teps = fs.readdirSync(dir).filter((f) => /^legacy-mo-ky-gui-\d{4}-\d{2}-\d{2}\.json$/.test(f));
  assert('làn đã chạy trên dữ liệu thật: có tệp legacy-mo-ky-gui-*.json trong community', teps.length >= 1, teps);
  let soBan = 0;
  const viPham = [];
  for (const f of teps) {
    const doc = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    for (const r of doc.records || []) {
      soBan += 1;
      const goc = String(r.attributes?.hs_code_goc || '');
      if (r.attributes?.legacyHs !== true || !/^\d{8}$/.test(goc) || goc === String(r.hsCode)) viPham.push(`${f}: ${goc}->${r.hsCode}`);
      if (!tax[r.hsCode] || RG.isResidual(r.hsCode) || tax[goc]) viPham.push(`${f}: ${goc}->${r.hsCode} (rớt cổng)`);
      if (String(r.reasonVi || '').length > 1000) viPham.push(`${f}: ${r.hsCode} (lý do >1000)`);
    }
  }
  assert(`tệp mở thật: ${soBan} bản ghi, tất cả qua hợp đồng dẫn nối (mã mới còn sống + dòng CÓ TÊN, mã cũ đã chết)`, viPham.length === 0, viPham.slice(0, 5));
  // Ký gửi còn lại: làn đã mở hết phần bảng phủ (idempotent) và KHÔNG mở bản ghi "Loại khác"
  const parked = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'community-parked', 'tb-tchq-bieu-thue-cu.json'), 'utf8'));
  const bang = L.tatCa();
  const conMoDuoc = (parked.records || []).filter((r) => bang[String(r.hsCode)]).length;
  assert('idempotent trên dữ liệu thật: ký gửi còn lại không bản ghi nào còn mở được', conMoDuoc === 0);
  const loaiKhacCon = (parked.records || []).filter((r) => {
    const old = String(r.hsCode);
    return !bang[old] && L.boDi()[old]?.lyDo === 'ma_moi_la_loai_khac';
  }).length;
  assert('ký gửi trỏ dòng "Loại khác" KHÔNG được mở bởi làn này (chờ duyệt riêng)', loaiKhacCon === 0);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
