#!/usr/bin/env node
// Test máy kiểm đợt cào SHTT (scripts/shtt/kiem.mjs) trên thư mục tạm — không đụng data/ thật.
import './test-isolate-data.mjs';
import fs from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { kiem } from './shtt/kiem.mjs';
let passed = 0, failed = 0;
const assert = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ` ${JSON.stringify(extra).slice(0, 300)}`}`); ok ? passed++ : failed++; };
const sha = (s) => createHash('sha256').update(s).digest('hex');
const ungVien = [{ chuan: 'smc', uuTien: 1 }, { chuan: 'airtac', uuTien: 1 }, { chuan: 'gaozi', uuTien: 2 }];
const T0 = '2026-10-16T20:00:00Z';
const nguon = (i, url) => ({ url, layLuc: new Date(Date.parse(T0) + 1000 * i).toISOString(), sha256: sha(`tho-${i}`) });
const dung = () => {
  const d = fs.mkdtempSync(join(os.tmpdir(), 'shtt-'));
  const tho = [];
  const g = (i, url) => { const n = nguon(i, url); tho.push({ sha256: n.sha256, url, layLuc: n.layLuc, bytes: 1234 }); return n; };
  const tchq = [{ nhan: 'SMC', chuSoHuu: 'SMC Corporation', soHoSo: 'GS-2026-0001', nhomNice: [7], hieuLucDen: '2027-12-31', nguon: g(1, 'https://www.customs.gov.vn/x') }];
  const ipvn = [{ nhan: 'AIRTAC', soDon: '4-2020-12345', soBang: '123456', tinhTrang: 'DANG_KY', chuSoHuu: 'Airtac', nhomNice: [7], ngayNop: '2020-05-01', ungVien: 'airtac', nguon: g(2, 'https://wipopublish.ipvietnam.gov.vn/y') }];
  const gacc = [{ nhan: 'SMC', chuSoHuu: 'SMC株式会社', soHoSo: 'T2019-00001', loaiQuyen: 'NHAN_HIEU', hieuLucDen: '2029-01-01', nguon: g(3, 'https://online.customs.gov.cn/z') }];
  fs.writeFileSync(join(d, 'vn-tchq-giam-sat.jsonl'), tchq.map((r) => JSON.stringify(r)).join('\n') + '\n');
  fs.writeFileSync(join(d, 'vn-ipvietnam-dang-ky.jsonl'), ipvn.map((r) => JSON.stringify(r)).join('\n') + '\n');
  fs.writeFileSync(join(d, 'cn-gacc-beian.jsonl'), gacc.map((r) => JSON.stringify(r)).join('\n') + '\n');
  fs.writeFileSync(join(d, 'khong-tim-thay.jsonl'), JSON.stringify({ ungVien: 'smc', nguonMa: 'vn-ipvietnam-dang-ky', nguon: { url: 'https://wipopublish.ipvietnam.gov.vn/q', layLuc: T0 } }) + '\n');
  fs.writeFileSync(join(d, 'raw-index.json'), JSON.stringify({ tho }));
  fs.writeFileSync(join(d, 'bao-cao.json'), JSON.stringify({ ngay: '2026-10-17', may: 'test', batDau: T0, ketThuc: '2026-10-17T05:00:00Z', camKet: { khongLachCaptcha: true, tocDo: '≤ 1 yêu cầu/giây/nguồn' },
    nguon: [{ ma: 'vn-tchq-giam-sat', trangThai: 'OK', soBanGhi: 1 }, { ma: 'vn-ipvietnam-dang-ky', trangThai: 'OK', soBanGhi: 1 }, { ma: 'tmview-cn-vn', trangThai: 'CHAN', ghiChu: 'HTTP 503 từ VN lúc 22:10' }, { ma: 'cn-cnipa-dang-ky', trangThai: 'CAPTCHA', ghiChu: 'sbj.cnipa.gov.cn đòi captcha — không lách' }, { ma: 'cn-gacc-beian', trangThai: 'OK', soBanGhi: 1 }] }));
  return d;
};
// 1. bộ đúng → PASS, độ phủ ưu tiên 1 = 2/2 cho ipvietnam
{ const d = dung(); const r = kiem(d, { ungVien });
  assert('bộ kết quả đúng → không lỗi', r.loi.length === 0, r.loi);
  assert('độ phủ ứng viên ưu tiên 1 = tìm thấy + không tìm thấy', r.tomTat['vn-ipvietnam-dang-ky'].phuUuTien1 === '2/2' && r.canhBao.length === 0, r.tomTat);
  assert('nguồn CHAN/CAPTCHA có ghiChu → chấp nhận, soBanGhi 0', r.tomTat['tmview-cn-vn'].trangThai === 'CHAN' && r.tomTat['cn-cnipa-dang-ky'].soBanGhi === 0); }
// 2. thiếu bao-cao
{ const d = fs.mkdtempSync(join(os.tmpdir(), 'shtt-')); assert('thiếu bao-cao.json → lỗi', kiem(d).loi[0] === 'thiếu bao-cao.json'); }
// 3. sha256 không có trong raw-index → lỗi (không có bằng chứng bản thô)
{ const d = dung(); fs.writeFileSync(join(d, 'raw-index.json'), JSON.stringify({ tho: [] })); const r = kiem(d, { ungVien });
  assert('sha256 không có trong raw-index → lỗi từng dòng', r.loi.filter((l) => /không có trong raw-index/.test(l)).length === 3, r.loi); }
// 4. recordal thiếu số hồ sơ, registry sai tinhTrang, ungVien lạ, ngày sai
{ const d = dung(); const bad = { nhan: 'X', chuSoHuu: 'Y', nhomNice: [99], hieuLucDen: '31/12/2027', nguon: nguon(9, 'ftp://x') };
  fs.appendFileSync(join(d, 'vn-tchq-giam-sat.jsonl'), JSON.stringify(bad) + '\n');
  fs.appendFileSync(join(d, 'vn-ipvietnam-dang-ky.jsonl'), JSON.stringify({ nhan: 'Z', soDon: '1', tinhTrang: 'OK', ungVien: 'la-lam', nguon: nguon(10, 'https://a') }) + '\n');
  const r = kiem(d, { ungVien }); const co = (re) => r.loi.some((l) => re.test(l));
  assert('bao-cao sai số bản ghi → lỗi', co(/bao-cao ghi 1 bản ghi, tệp có 2/));
  assert('recordal thiếu soHoSo → lỗi', co(/thiếu soHoSo/));
  assert('nhomNice ngoài 1–45, ngày không ISO, url không http → lỗi', co(/nhomNice/) && co(/YYYY-MM-DD/) && co(/nguon\.url/));
  assert('tinhTrang lạ + ungVien không trong danh sách → lỗi', co(/tinhTrang "OK"/) && co(/ungVien "la-lam"/)); }
// 5. không lách captcha là bắt buộc; gọi quá nhanh bị bắt
{ const d = dung(); const bc = JSON.parse(fs.readFileSync(join(d, 'bao-cao.json'), 'utf8')); bc.camKet.khongLachCaptcha = false; fs.writeFileSync(join(d, 'bao-cao.json'), JSON.stringify(bc));
  assert('camKet.khongLachCaptcha=false → lỗi', kiem(d, { ungVien }).loi.some((l) => /khongLachCaptcha/.test(l))); }
{ const d = dung(); const tho = JSON.parse(fs.readFileSync(join(d, 'raw-index.json'), 'utf8')).tho; const rows = [];
  for (let i = 0; i < 40; i++) { const n = { url: 'https://online.customs.gov.cn/z', layLuc: new Date(Date.parse(T0) + 100 * i).toISOString(), sha256: sha(`r${i}`) }; tho.push({ sha256: n.sha256, url: n.url, layLuc: n.layLuc, bytes: 1 }); rows.push({ nhan: `M${i}`, chuSoHuu: 'C', soHoSo: `T2020-${i}`, loaiQuyen: 'NHAN_HIEU', hieuLucDen: null, nguon: n }); }
  fs.writeFileSync(join(d, 'raw-index.json'), JSON.stringify({ tho })); fs.writeFileSync(join(d, 'cn-gacc-beian.jsonl'), rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  const bc = JSON.parse(fs.readFileSync(join(d, 'bao-cao.json'), 'utf8')); bc.nguon.find((n) => n.ma === 'cn-gacc-beian').soBanGhi = 40; fs.writeFileSync(join(d, 'bao-cao.json'), JSON.stringify(bc));
  assert('40 lượt cách nhau 100 ms → lỗi tốc độ lịch sự', kiem(d, { ungVien }).loi.some((l) => /tốc độ lịch sự/.test(l))); }
// 6. thiếu ứng viên ưu tiên 1 chưa tra → cảnh báo (không lỗi)
{ const d = dung(); fs.writeFileSync(join(d, 'khong-tim-thay.jsonl'), ''); const r = kiem(d, { ungVien });
  assert('ứng viên ưu tiên 1 chưa tra → cảnh báo độ phủ, không lỗi', r.loi.length === 0 && r.canhBao.some((c) => /1\/2 ứng viên ưu tiên 1/.test(c)), { loi: r.loi, cb: r.canhBao }); }
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
