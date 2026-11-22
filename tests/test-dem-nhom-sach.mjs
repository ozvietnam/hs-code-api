import '../scripts/test-isolate-data.mjs'; // rule bất biến 8: import './test-isolate-data.mjs'
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { TEST_DATA_DIR } from '../scripts/test-isolate-data.mjs';
import { nhomChuaCoSoTay } from '../scripts/nhom-chua-co-so-tay.mjs';
import { danhGiaNhomV1, demNhomSach } from '../scripts/dem-nhom-sach.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(ROOT, 'scripts', 'dem-nhom-sach.mjs');

test('1. Nhóm đã cuốn chiếu chuẩn V1 (8539, 8541, 8542, 8543, 8544) được chấm SẠCH', () => {
  for (const h4 of ['8539', '8541', '8542', '8543', '8544']) {
    const kq = danhGiaNhomV1(h4);
    assert.equal(kq.nhom, h4);
    assert.equal(kq.sach, true, `Nhóm ${h4} phải SẠCH nhưng có lý do: ${kq.lyDo.join(', ')}`);
    assert.deepEqual(kq.lyDo, []);
    assert.equal(kq.chotSai, 0);
    assert.equal(kq.chotLoaiKhacSai, 0);
    assert.equal(kq.nemLoi, 0);
  }
});

test('2. Nhóm chưa có sổ tay (nhomChuaCoSoTay) bị chấm CHƯA SẠCH với lý do chua-co-so-tay', () => {
  const { h4 } = nhomChuaCoSoTay();
  const kq = danhGiaNhomV1(h4);
  assert.equal(kq.nhom, h4);
  assert.equal(kq.sach, false);
  assert.ok(kq.lyDo.includes('chua-co-so-tay'), `Kỳ vọng chua-co-so-tay, nhận: ${kq.lyDo.join(', ')}`);
});

// Kì vọng đổi 22/11/2026 (OZV-1785, nguyên tắc 5 OZV-310 — không chỉnh số cho khớp): nhóm 0301 đã được làm SẠCH bởi OZV-1785/PR #1578 nên thay fixture chưa sạch bằng 0305.
// Kì vọng đổi 23/11/2026 (OZV-1945, nguyên tắc 5 OZV-310 — cô lập fixture chưa sạch vào TEST_DATA_DIR): nhóm 0305 đã được làm SẠCH V1 trong PR #1657 nên gieo fixture 0305 chưa sạch (thiếu ranh giới DUYET + dong8 chưa số hoá điều kiện) vào TEST_DATA_DIR để kiểm bền vững kể cả khi 100% nhóm trên biểu đạt SẠCH V1.
function gieoFixture0305ChuaSach() {
  const srcSoTay = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '0305.json'), 'utf8'));
  const dirtySoTay = structuredClone(srcSoTay);
  for (const d of dirtySoTay.dong8 || []) {
    delete d.dieuKienSo;
    delete d.phanConLai;
  }
  const tmpSoTayDir = path.join(TEST_DATA_DIR, 'so-tay');
  fs.mkdirSync(tmpSoTayDir, { recursive: true });
  fs.writeFileSync(path.join(tmpSoTayDir, '0305.json'), JSON.stringify(dirtySoTay, null, 2));

  const tmpRgDir = path.join(TEST_DATA_DIR, 'ho-so', 'ranh-gioi');
  fs.mkdirSync(tmpRgDir, { recursive: true });
  for (const p6 of ['030539', '030549', '030559', '030569', '030579']) {
    fs.writeFileSync(path.join(tmpRgDir, `${p6}.json`), JSON.stringify({ pn6: p6, trangThai: 'NHAP' }, null, 2));
  }
}
gieoFixture0305ChuaSach();

test('3. Nhóm có sổ tay nhưng dòng có tên chốt đúng < 95% hoặc thiếu ranh giới DUYET bị chấm CHƯA SẠCH', () => {
  const kq = danhGiaNhomV1('0305', { boQuaCache: true });
  assert.equal(kq.nhom, '0305');
  assert.equal(kq.sach, false);
  assert.ok(kq.lyDo.length > 0);
  assert.ok(
    kq.lyDo.some((l) => l.startsWith('dong-co-ten(') || l.startsWith('chua-duyet-ranh-gioi(')),
    `Lý do phải nêu rõ nguyên nhân V1, nhận: ${kq.lyDo.join(', ')}`,
  );
});

test('4. Phát hiện bản ghi dong8 trùng mã trong sổ tay (mục 3c công thức V1) trên HS_DATA_DIR cách ly', () => {
  const srcPath = path.join(ROOT, 'data', 'so-tay', '8541.json');
  const raw = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
  const tmpSoTayDir = path.join(TEST_DATA_DIR, 'so-tay');
  fs.mkdirSync(tmpSoTayDir, { recursive: true });
  const tmpFile = path.join(tmpSoTayDir, '8541.json');
  try {
    const dup = structuredClone(raw);
    dup.dong8.push(structuredClone(dup.dong8[0]));
    fs.writeFileSync(tmpFile, JSON.stringify(dup, null, 2));
    const kq = danhGiaNhomV1('8541', { boQuaCache: true });
    assert.equal(kq.sach, false);
    assert.ok(
      kq.lyDo.some((l) => l.startsWith('trung-dong8(')),
      `Phải bắt được trung-dong8, nhận: ${kq.lyDo.join(', ')}`,
    );
  } finally {
    fs.rmSync(tmpFile, { force: true });
  }
});

test('5. demNhomSach tổng hợp đúng tongNhom, nhomSach, tyLe và danh sách chuaSach', async () => {
  const { h4: chuaCo } = nhomChuaCoSoTay();
  const kq = await demNhomSach({ nhoms: ['8539', '8541', '0305', chuaCo], useWorkers: false });
  assert.equal(kq.tongNhom, 4);
  assert.equal(kq.nhomSach, 2);
  assert.equal(kq.tyLe, 50);
  assert.equal(kq.chuaSach.length, 2);
  assert.deepEqual(
    kq.chuaSach.map((x) => x.nhom),
    ['0305', chuaCo].sort(),
  );
});

test('6. CLI --json in đúng một dòng JSON {tongNhom, nhomSach, tyLe}', () => {
  const out = execFileSync(process.execPath, [SCRIPT, '--nhom=8539,8541,0305', '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, HS_DATA_DIR: TEST_DATA_DIR },
  }).trim();
  const lines = out.split(/\r?\n/);
  assert.equal(lines.length, 1, `Cờ --json phải in đúng 1 dòng, nhận ${lines.length} dòng`);
  const parsed = JSON.parse(lines[0]);
  assert.equal(parsed.tongNhom, 3);
  assert.equal(parsed.nhomSach, 2);
  assert.equal(parsed.tyLe, 66.7);
});

test('7. CLI mặc định in tổng số nhóm, số nhóm SẠCH, phần trăm và danh sách tối đa 20 nhóm chưa sạch', () => {
  const out = execFileSync(process.execPath, [SCRIPT, '--nhom=8539,8541,0305'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, HS_DATA_DIR: TEST_DATA_DIR },
  });
  assert.match(out, /Tổng số nhóm 4 số:\s*3/);
  assert.match(out, /Số nhóm SẠCH \(V1\):\s*2\s*\(66\.7%\)/);
  assert.match(out, /0305:/);
});
