#!/usr/bin/env node
import './test-isolate-data.mjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let passed = 0;
let failed = 0;
function assert(name, cond, detail = '') {
  if (cond) {
    console.log(`PASS ${name}`);
    passed += 1;
  } else {
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
    failed += 1;
  }
}

const mod = await import('./import-customs-danh-muc.mjs');

// 1. Kiểm URL bridge không percent-encode ? và &
{
  const u1 = mod.buildCustomsBridgeUrl('/customs/APISearchMaHS');
  assert(
    'buildCustomsBridgeUrl trả đúng endpoint APISearchMaHS',
    u1 === 'https://www.customs.gov.vn/bridge?url=/customs/APISearchMaHS',
    u1
  );

  const u2 = mod.buildCustomsBridgeUrl('/customs/api/GetPageControl?pageId=5321&controlId=1');
  assert(
    'buildCustomsBridgeUrl giữ nguyên ? và & không percent-encode',
    u2 === 'https://www.customs.gov.vn/bridge?url=/customs/api/GetPageControl?pageId=5321&controlId=1'
      && !/%3F|%26/i.test(u2),
    u2
  );

  let threwEncoded = false;
  try {
    mod.buildCustomsBridgeUrl('/customs/api/GetPageControl%3FpageId=5321%26controlId=1');
  } catch {
    threwEncoded = true;
  }
  assert(
    'buildCustomsBridgeUrl chặn URL có ? hoặc & bị percent-encode (%3F/%26)',
    threwEncoded
  );
}

// 2. Kiểm lọc mã 8 số, bỏ mã rác 99999999, giữ mota và tính độ phủ
{
  const sampleRaw = {
    d: [
      { maHS: '7210', mota: 'Nhóm 4 số' },
      { maHS: '721070', mota: 'Phân nhóm 6 số' },
      { maHS: '72107012', mota: '- - - Được sơn sau khi phủ, mạ kẽm' },
      { maHS: '7210701210', mota: '- - - - Cấp 10 số' },
      { maHS: '99999999', mota: 'Mã rác customs' },
      { maHS: '10011100', mota: '- - Hạt giống' },
    ],
    message: 'Success',
  };
  const fakeTax = {
    '10011100': { hs: '10011100', vn: '- - Hạt giống' },
    '72107012': { hs: '72107012', vn: '- - - Được sơn sau khi phủ, mạ kẽm' },
    '98010000': { hs: '98010000', vn: 'Chương 98' },
  };
  const { record, stats } = mod.processCustomsPayload(sampleRaw, fakeTax, { ngay: '2026-11-13' });
  assert(
    'processCustomsPayload chỉ giữ mã đúng 8 chữ số và bỏ 99999999',
    record.soMa8So === 2
      && Object.keys(record.danhMuc).join(',') === '10011100,72107012'
      && !('99999999' in record.danhMuc),
    JSON.stringify(record)
  );
  assert(
    'processCustomsPayload tính đúng độ phủ so với tax.json',
    stats.tongDongTho === 6
      && stats.soMa8So === 2
      && stats.soMaPhuTax === 2
      && stats.tongMaTax8So === 3
      && Math.abs(stats.tiLePhu - (2 / 3) * 100) < 1e-6,
    JSON.stringify(stats)
  );

  // Kiểm tự phá: tiêm dòng 8 số có tên rỗng => phải ném lỗi
  let threwEmptyName = false;
  try {
    mod.processCustomsPayload(
      { d: [{ maHS: '10011100', mota: '   ' }], message: 'Success' },
      fakeTax,
      { ngay: '2026-11-13' }
    );
  } catch {
    threwEmptyName = true;
  }
  assert('processCustomsPayload chặn mã 8 số có mota rỗng', threwEmptyName);

  // Kiểm tự phá: payload lỗi / rỗng => phải ném lỗi, không bịa
  let threwBadPayload = false;
  try {
    mod.processCustomsPayload({ d: [], message: 'Error' }, fakeTax, { ngay: '2026-11-13' });
  } catch {
    threwBadPayload = true;
  }
  assert('processCustomsPayload chặn payload rỗng hoặc lỗi mạng', threwBadPayload);
}

// 3. Kiểm tệp dữ liệu thật data/hs/customs-danh-muc-<ngày>.json
{
  const hsDir = path.join(ROOT, 'data', 'hs');
  const files = fs.existsSync(hsDir)
    ? fs.readdirSync(hsDir).filter((f) => /^customs-danh-muc-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort()
    : [];
  assert('data/hs/ có tệp customs-danh-muc-<ngày>.json', files.length >= 1, files.join(', '));

  if (files.length >= 1) {
    const latestFile = path.join(hsDir, files[files.length - 1]);
    const data = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
    const tax = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'tax.json'), 'utf8'));
    const taxKeys = Object.keys(tax).filter((k) => /^\d{8}$/.test(k));
    const entries = Object.entries(data.danhMuc || {});
    const all8Digits = entries.every(([k]) => /^\d{8}$/.test(k));
    const noJunk99999999 = !('99999999' in (data.danhMuc || {}));
    const allNonEmptyName = entries.every(([, v]) => typeof v === 'string' && v.trim().length > 0);
    const coveredCount = taxKeys.filter((k) => Object.prototype.hasOwnProperty.call(data.danhMuc, k)).length;
    const coveragePct = (coveredCount / taxKeys.length) * 100;

    assert(
      'customs-danh-muc JSON có đủ trường ngay, nguon, soMa8So, danhMuc',
      /^\d{4}-\d{2}-\d{2}$/.test(data.ngay)
        && typeof data.nguon === 'string'
        && data.nguon.includes('/customs/APISearchMaHS')
        && data.soMa8So === entries.length,
      `soMa8So=${data.soMa8So}, entries=${entries.length}`
    );
    assert(
      'customs-danh-muc có >= 11.000 mã 8 số, không có 99999999, 100% có tên khác rỗng',
      entries.length >= 11000 && all8Digits && noJunk99999999 && allNonEmptyName,
      `len=${entries.length}, all8Digits=${all8Digits}, noJunk=${noJunk99999999}, allNonEmpty=${allNonEmptyName}`
    );
    assert(
      'customs-danh-muc phủ >= 96% data/tax.json',
      coveragePct >= 96,
      `${coveredCount}/${taxKeys.length} (${coveragePct.toFixed(2)}%)`
    );
  }
}

// 4. Kiểm tự phá CLI: tiêm dữ liệu thiếu (<11.000 mã) qua --raw-file => CLI phải thoát != 0
{
  const { TEST_DATA_DIR } = await import('./test-isolate-data.mjs');
  const dirtyRaw = path.join(TEST_DATA_DIR, 'dirty-customs-raw.json');
  fs.writeFileSync(
    dirtyRaw,
    JSON.stringify({ d: [{ maHS: '10011100', mota: '- - Hạt giống' }], message: 'Success' }),
    'utf8'
  );
  const scriptPath = path.join(ROOT, 'scripts', 'import-customs-danh-muc.mjs');
  let exitCode = 0;
  let errOut = '';
  try {
    execFileSync('node', [scriptPath, `--raw-file=${dirtyRaw}`, '--dry-run'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    exitCode = err.status || 1;
    errOut = String(err.stderr || err.message || '');
  }
  assert(
    'CLI import-customs-danh-muc thoát EXIT=1 khi dữ liệu thiếu (<11.000 mã)',
    exitCode === 1 && errOut.includes('ĐỎ:'),
    `exit=${exitCode} stderr=${errOut.trim()}`
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
