import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { gopBanDo } from '../../scripts/gop-ban-do-4so.mjs';

const SCRIPT_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../scripts/gop-ban-do-4so.mjs'
);

test('1. Một lượt, một khối JSON hợp lệ → đủ nhóm, thieu rỗng', () => {
  const traLoi = [
    'Dưới đây là bản đồ quan hệ:\n```json\n[\n  {"nhom": "8451", "ten": "Máy giặt công nghiệp"},\n  {"nhom": "8536", "ten": "Thiết bị đóng cắt mạch điện"}\n]\n```\nHET',
  ];
  const kq = gopBanDo(traLoi, ['8451', '8536']);

  assert.equal(kq.banDo.length, 2);
  assert.deepEqual(
    kq.banDo.map((x) => x.nhom),
    ['8451', '8536']
  );
  assert.deepEqual(kq.thieu, []);
  assert.equal(kq.boNgoaiDanhSach, 0);
  assert.equal(kq.khoiHong, 0);
  assert.equal(kq.doiTuongCuu, 0);
});

test('2. Hai lượt cùng nhóm 8451 với nội dung khác → giữ bản lượt sau', () => {
  const luot1 = '```json\n[{"nhom": "8451", "phienBan": 1, "ghiChu": "bản cũ"}]\n```\nCON_LAI: 8536';
  const luot2 = '```json\n[{"nhom": "8451", "phienBan": 2, "ghiChu": "bản mới nhất"}]\n```\nHET';

  const kq = gopBanDo([luot1, luot2], ['8451']);

  assert.equal(kq.banDo.length, 1);
  assert.equal(kq.banDo[0].phienBan, 2);
  assert.equal(kq.banDo[0].ghiChu, 'bản mới nhất');
  assert.deepEqual(kq.thieu, []);
});

test('3. Khối bị cắt sau đối tượng thứ hai (đối tượng thứ ba dở) → cứu đúng 2, khoiHong = 1, doiTuongCuu = 2', () => {
  const biCat = [
    'Đang soạn lô nhóm:',
    '```json',
    '[',
    '  {"nhom": "8451", "quanHe": [{"den": "8450", "lyDo": "máy giặt gia dụng"}]},',
    '  {"nhom": "8536", "quanHe": [{"den": "8535", "lyDo": "điện áp > 1000V"}]},',
    '  {"nhom": "8537", "quanHe": [{"den": "8536", "lyDo": "bị cắt giữa chừ',
  ].join('\n');

  const kq = gopBanDo([biCat], ['8451', '8536', '8537']);

  assert.deepEqual(
    kq.banDo.map((x) => x.nhom),
    ['8451', '8536']
  );
  assert.deepEqual(kq.thieu, ['8537']);
  assert.equal(kq.khoiHong, 1);
  assert.equal(kq.doiTuongCuu, 2);
});

test('4. Chuỗi trong JSON chứa } và \\" → không làm lệch phép đếm ngoặc khi cứu khối bị cắt', () => {
  const biCatCoNgoacTrongChuoi = [
    '```json',
    '[',
    '  {"nhom": "8451", "trich": "a } b \\" c { d \\\\ }", "hopLe": true},',
    '  {"nhom": "8536", "trich": "đoạn có \\"} giả và }} nhiều ngoặc"},',
    '  {"nhom": "8537", "trich": "chưa đóng',
  ].join('\n');

  const kq = gopBanDo([biCatCoNgoacTrongChuoi], ['8451', '8536', '8537']);

  assert.equal(kq.khoiHong, 1);
  assert.equal(kq.doiTuongCuu, 2);
  assert.equal(kq.banDo.length, 2);
  assert.equal(kq.banDo[0].trich, 'a } b " c { d \\ }');
  assert.equal(kq.banDo[1].trich, 'đoạn có "} giả và }} nhiều ngoặc');
  assert.deepEqual(kq.thieu, ['8537']);
});

test('5. Nhóm ngoài nhomThuTu → bị bỏ, boNgoaiDanhSach = 1', () => {
  const traLoi = [
    '```json\n[\n  {"nhom": "8451", "ten": "Hợp lệ"},\n  {"nhom": "9999", "ten": "Ngoài danh sách"}\n]\n```',
  ];
  const kq = gopBanDo(traLoi, ['8451']);

  assert.deepEqual(
    kq.banDo.map((x) => x.nhom),
    ['8451']
  );
  assert.deepEqual(kq.thieu, []);
  assert.equal(kq.boNgoaiDanhSach, 1);
});

test('6. Lượt chỉ có chữ, không có khối json → không lỗi, nhóm vào thieu', () => {
  const traLoi = [
    'Xin lỗi, tôi cần thêm chú giải nhóm 8451 trước khi soạn.\nCON_LAI: 8451, 8536',
  ];
  const kq = gopBanDo(traLoi, ['8451', '8536']);

  assert.deepEqual(kq.banDo, []);
  assert.deepEqual(kq.thieu, ['8451', '8536']);
  assert.equal(kq.khoiHong, 0);
  assert.equal(kq.doiTuongCuu, 0);
  assert.equal(kq.boNgoaiDanhSach, 0);
});

test('7. banDo xếp đúng thứ tự nhomThuTu dù lượt trả lời theo thứ tự khác', () => {
  const luot1 = '```json\n[{"nhom": "8537", "thu": 3}, {"nhom": "8451", "thu": 1}]\n```';
  const luot2 = 'Chữ xen giữa\n```json\n[{"nhom": "8536", "thu": 2}]\n```\nHET';

  const kq = gopBanDo([luot1, luot2], ['8451', '8536', '8537']);

  assert.deepEqual(
    kq.banDo.map((x) => x.nhom),
    ['8451', '8536', '8537']
  );
  assert.deepEqual(kq.thieu, []);
});

test('8. CLI ghi banDo ra stdout, 1 dòng tóm tắt ra stderr, mã thoát 0 khi đủ và 1 khi thiếu', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gop-ban-do-'));
  const f1 = path.join(tmpDir, 'tra-loi-1.txt');
  const f2 = path.join(tmpDir, 'tra-loi-2.txt');

  try {
    fs.writeFileSync(f1, '```json\n[{"nhom": "8536", "v": "ok"}]\n```\n', 'utf8');
    fs.writeFileSync(f2, '```json\n[{"nhom": "8451", "v": "ok"}]\n```\nHET\n', 'utf8');

    // Trường hợp đủ nhóm → exit code 0
    const stdoutOk = execFileSync(
      process.execPath,
      [SCRIPT_PATH, '--nhom=8451,8536', f1, f2],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    const parsedOk = JSON.parse(stdoutOk);
    assert.deepEqual(
      parsedOk.map((x) => x.nhom),
      ['8451', '8536']
    );

    // Trường hợp thiếu nhóm 8537 → exit code 1, vẫn ghi stdout JSON hợp lệ + 1 dòng stderr
    let failed = null;
    try {
      execFileSync(
        process.execPath,
        [SCRIPT_PATH, '--nhom=8451,8536,8537', f1, f2],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
      );
    } catch (err) {
      failed = err;
    }
    assert.ok(failed, 'Phải thoát với mã khác 0 khi còn thiếu nhóm');
    assert.equal(failed.status, 1);
    const parsedMissing = JSON.parse(failed.stdout);
    assert.deepEqual(
      parsedMissing.map((x) => x.nhom),
      ['8451', '8536']
    );
    const stderrLines = failed.stderr.trim().split('\n');
    assert.equal(stderrLines.length, 1);
    assert.match(stderrLines[0], /8537/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});