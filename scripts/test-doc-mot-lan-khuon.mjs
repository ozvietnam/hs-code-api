#!/usr/bin/env node
// scripts/test-doc-mot-lan-khuon.mjs — M-82 (#2483, ADR-0011): kiểm khuôn doc-mot-lan/ trong khuon.mjs.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {
  THU_MUC_DOC_MOT_LAN,
  THU_MUC_KHO,
  kiemKhoHoSo,
  kiemTep,
  kiemChuongDocMotLan,
  kiemNhomDocMotLan,
  kiemMoHoDocMotLan,
  kiemThuMucDocMotLan,
} from './ho-so-ma/khuon.mjs';

let pass = 0;
let fail = 0;
function test(ten, fn) {
  try {
    fn();
    pass += 1;
    console.log(`PASS ${ten}`);
  } catch (err) {
    fail += 1;
    console.error(`FAIL ${ten}\n  ${err.message}`);
  }
}

const GOC_THUC = path.resolve('data/ho-so-ma');
const D40 = path.join(GOC_THUC, THU_MUC_DOC_MOT_LAN, '40');

test('THU_MUC_KHO chứa doc-mot-lan', () => {
  assert.ok(THU_MUC_KHO.includes(THU_MUC_DOC_MOT_LAN));
});

test('Kho thật data/ho-so-ma/doc-mot-lan/40 qua kiemThuMucDocMotLan với 0 lỗi', () => {
  const r = kiemThuMucDocMotLan(path.join(GOC_THUC, THU_MUC_DOC_MOT_LAN));
  assert.equal(r.loi.length, 0, r.loi.slice(0, 10).join('\n'));
  assert.ok(r.soTep >= 19, `chờ >= 19 tệp, nhận ${r.soTep}`);
});

test('kiemKhoHoSo() trên kho thật data/ho-so-ma đạt 0 lỗi (không còn báo doc-mot-lan lạ)', () => {
  const r = kiemKhoHoSo(GOC_THUC);
  assert.equal(r.loi.length, 0, r.loi.slice(0, 10).join('\n'));
});

test('kiemTep() nhận trực tiếp doc-mot-lan/40/chuong.json, 4016.json, diem-mo-ho.jsonl', () => {
  for (const ten of ['chuong.json', '4016.json', 'diem-mo-ho.jsonl', 'dieu-kien.jsonl', 'bang-anh-em.jsonl']) {
    const raw = fs.readFileSync(path.join(D40, ten), 'utf8');
    const r = kiemTep(`doc-mot-lan/40/${ten}`, raw);
    assert.equal(r.loi.length, 0, `${ten}: ${r.loi.slice(0, 5).join('; ')}`);
  }
});

test('CA NGƯỢC 1: chuong.json lọt nguồn cấm tb: hoặc wco: ⇒ ĐỎ', () => {
  const ch = JSON.parse(fs.readFileSync(path.join(D40, 'chuong.json'), 'utf8'));
  ch.canCu = [{ idCau: 'tb:1234#1', trich: 'abc' }];
  const loi = kiemChuongDocMotLan(ch, '40');
  assert.ok(loi.some((x) => /cấm nguồn tb:1234#1/.test(x)), loi.join('\n'));

  const ch2 = JSON.parse(fs.readFileSync(path.join(D40, 'chuong.json'), 'utf8'));
  ch2.phamVi[0].canCu[0].idCau = 'wco:40#1';
  const loi2 = kiemChuongDocMotLan(ch2, '40');
  assert.ok(loi2.some((x) => /cấm nguồn wco:40#1/.test(x)), loi2.join('\n'));
});

test('CA NGƯỢC 2: <nhom>.json có ma8 CHƯA ĐỦ DỮ KIỆN thiếu cauHoi hoặc sai đầu mã ⇒ ĐỎ', () => {
  const nh = JSON.parse(fs.readFileSync(path.join(D40, '4016.json'), 'utf8'));
  nh.ma8[0] = { ma: 'bieu:40161010', ketQua: 'CHƯA ĐỦ DỮ KIỆN', cauHoi: '' };
  const loi1 = kiemNhomDocMotLan(nh, '40', '4016');
  assert.ok(loi1.some((x) => /thiếu cauHoi/.test(x)), loi1.join('\n'));

  const nh2 = JSON.parse(fs.readFileSync(path.join(D40, '4016.json'), 'utf8'));
  nh2.ma8[0] = { ma: 'bieu:40151200', ketQua: 'ĐÚNG' };
  const loi2 = kiemNhomDocMotLan(nh2, '40', '4016');
  assert.ok(loi2.some((x) => /phải là bieu:4016NNNN/.test(x)), loi2.join('\n'));
});

test('CA NGƯỢC 3: diem-mo-ho.jsonl có soVongPhanBien !== 1 hoặc CHƯA ĐỦ DỮ KIỆN thiếu cauHoiKhach ⇒ ĐỎ', () => {
  const dong1 = JSON.parse(fs.readFileSync(path.join(D40, 'diem-mo-ho.jsonl'), 'utf8').split(/\r?\n/)[0]);
  dong1.soVongPhanBien = 2;
  const loi1 = kiemMoHoDocMotLan(dong1, '40');
  assert.ok(loi1.some((x) => /soVongPhanBien phải bằng 1/.test(x)), loi1.join('\n'));

  const dong2 = JSON.parse(fs.readFileSync(path.join(D40, 'diem-mo-ho.jsonl'), 'utf8').split(/\r?\n/)[0]);
  dong2.chotNguoiDoc.ketLuanCuoi = 'CHƯA ĐỦ DỮ KIỆN';
  dong2.chotNguoiDoc.cauHoiKhach = '';
  const loi2 = kiemMoHoDocMotLan(dong2, '40');
  assert.ok(loi2.some((x) => /thiếu cauHoiKhach/.test(x)), loi2.join('\n'));
});

test('CA NGƯỢC 4: không bỏ qua im lặng tệp lạ / thư mục lạ / JSON hỏng trong doc-mot-lan/', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'm82-khuon-'));
  try {
    fs.mkdirSync(path.join(tmp, 'doc-mot-lan', '40'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'doc-mot-lan', 'chuong-la'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'doc-mot-lan', '40', 'nhap.txt'), 'abc', 'utf8');
    fs.writeFileSync(path.join(tmp, 'doc-mot-lan', '40', 'chuong.json'), '{ hong json', 'utf8');
    const r = kiemKhoHoSo(tmp);
    assert.ok(r.loi.some((x) => /chuong-la: lạ trong doc-mot-lan/.test(x)), r.loi.join('\n'));
    assert.ok(r.loi.some((x) => /nhap\.txt: tệp lạ/.test(x)), r.loi.join('\n'));
    assert.ok(r.loi.some((x) => /chuong\.json: không phải JSON/.test(x)), r.loi.join('\n'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

console.log(`test-doc-mot-lan-khuon: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
