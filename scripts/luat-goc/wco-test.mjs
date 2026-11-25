#!/usr/bin/env node
// scripts/luat-goc/wco-test.mjs — kiểm ngoại tuyến data/luat-goc/wco.jsonl và bộ dựng wco.mjs (M-17). Không mạng, không cần ảnh.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { boKiem, GOC } from '../lib-luat.mjs';
import { kiemKho } from '../kiem-luat-goc.mjs';
import { ANH } from './wco-anh.mjs';
import { bienNhan, boDauChan, cauQuyTac, dung, ocrNghi } from './wco.mjs';

const require = createRequire(import.meta.url);
const wco = require('../../lib/wco-op.js');
const { kiem, xong } = boKiem('wco-test');
const doc = (p) => fs.readFileSync(path.join(GOC, p), 'utf8');
const dong = doc('data/luat-goc/wco.jsonl').split('\n').filter(Boolean);
const nut = dong.map((l) => JSON.parse(l)); const { nut: moi, nghi, tong } = dung();
const kho = new Map(JSON.parse(doc('data/wco-op/opinions.json')).map((o) => [o.id, o]));

kiem('nạp + không nạp = 1.038 (906 + 129 nghi của kho + 3 ảnh bác)', tong === 1038 && nut.length === 906 && nghi.length === 132 && nghi.filter((x) => !x.quaCongKho).length === 129);
kiem('tất định: dựng lại bằng tệp đang có', JSON.stringify(moi) === JSON.stringify(nut));
const k = kiemKho('wco', dong, {}); kiem('cổng cấu trúc 0 lỗi', k.loi.length === 0, k.loi.slice(0, 3).join(' | '));
kiem('không nút nào là ý kiến chưa qua cổng lib/wco-op.js', nut.every((x) => wco.view(kho.get(x.nguon.khoId))));
kiem('lớp HUONG_DAN, loại Y_KIEN_WCO, chữ OCR, có độ tin cậy', nut.every((x) => x.lop === 'HUONG_DAN' && x.loai === 'Y_KIEN_WCO' && x.nguonChu === 'OCR' && ['CHAC', 'SUY_LUAN'].includes(x.doTinCay)));
kiem('nguyên văn = chữ kho, chỉ bỏ hai đầu đã ghi', nut.every((x) => {
  const t = kho.get(x.nguon.khoId).text;
  if (!x.boKhoiNguyenVan) return x.nguyenVan === t.normalize('NFC');
  const than = x.nguyenVan.replace(/Adoption: \d{4}$/, '').trimEnd();
  return t.includes(than) && x.boKhoiNguyenVan.every((b) => t.includes(b));
}));
kiem('không suy ngày: hieuLuc.tu null, năm ở namThongQua, nút nào cũng có năm hoặc ghi chú', nut.every((x) => x.hieuLuc.tu === null && (Number.isInteger(x.namThongQua) || x.ghiChu)));
kiem('năm khác kho thì có ghi chú', nut.every((x) => x.namThongQua === kho.get(x.nguon.khoId).adoption || /ảnh trang \d+ in/.test(x.ghiChu || '')));
kiem('mã nút có trên biển in của ảnh, số in không trái', nut.every((x) => bienNhan(x.anh.bien, x.nguon.khoId.slice(0, 6)) && (x.anh.so == null || x.so.endsWith(`/${x.anh.so}`))));
kiem('quyTacNeu là chuỗi con nguyên văn', nut.every((x) => !x.quyTacNeu || x.nguyenVan.includes(x.quyTacNeu)));
kiem('cờ ocrNghi chỉ đúng vị trí trong nguyên văn', nut.every((x) => (x.ocrNghi || []).every((c) => x.nguyenVan.startsWith(c.chu, c.viTri))));
kiem('bản dịch có [?] thì có cờ dichNghi', nut.every((x) => !/\[\?\]/.test(x.dichKhongChinhThuc) || x.dichNghi === true));
kiem('mọi ý kiến có dòng trong bảng ảnh', [...kho.keys()].every((id) => Array.isArray(ANH[id])));
const byId = new Map(nut.map((x) => [x.id, x]));
const trich = JSON.parse(doc('data/wco-op/so-tay-trich.json')); const truot = [];
for (const [src, q] of Object.entries(trich)) {
  const m = /^wco-op\.(\d{6})\.(\d+)$/.exec(src); const x = m && byId.get(`wco:${m[1]}:${m[2]}`); if (!x) { truot.push(src); continue; }
  const sq = wco.squash(x.nguyenVan); if (!String(q).split(/…|\.{3,}/).map(wco.squash).filter((f) => f.length >= 6).every((f) => sq.includes(f))) truot.push(src);
}
kiem('câu trích sổ tay vẫn nằm trong nút (trừ các id đã loại)', truot.every((s) => nghi.some(({ o }) => `wco-op.${o.hs}.${o.ord}` === s)), truot.join(', '));
console.log(`  (câu trích sổ tay trỏ vào ý kiến không nạp: ${truot.join(', ') || 'không'})`);
kiem('boDauChan không cắt chữ thường', boDauChan('1. A b.\n\nAdoption: 2000', 1).bo.length === 0 && boDauChan('1. A.\n\n*Adoption: 2015* 1602.41 to 1602.49', 1).t.endsWith('Adoption: 2015'));
kiem('cauQuyTac chép nguyên văn, không suy', cauQuyTac('1. X.\n\nAdoption: 1968') === null && cauQuyTac('1. X. Application of GIRs 1 and 6.\n\nAdoption: 1968') === 'Application of GIRs 1 and 6.');
kiem('ocrNghi sạch với câu lành', ocrNghi('1. Skate wings, 86 % of meat.\n\nApplication of GIRs 1 and 6.\n\nAdoption: 2003').length === 0);
xong();
