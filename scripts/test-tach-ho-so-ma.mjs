#!/usr/bin/env node
// scripts/test-tach-ho-so-ma.mjs — M-73 (#1965): bài kiểm máy tách / máy ghép hai phiếu (scripts/ho-so-ma/tach-chung.mjs).
// Câu thật từ data/luat-goc; phiếu mô hình giả viết tay. Tất định, không mạng, không AI, không đụng data/ho-so-ma.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { napLuatCong } from './ho-so-ma/cong.mjs';
import { dungGoi, chuanDich, timTrich, chuanPhieu, gopTrongPhieu, ghepPhieu, thuNguCungNut, hoanTat, ghiKho } from './ho-so-ma/tach-chung.mjs';
import { kiemBanGhi } from './ho-so-ma/khuon.mjs';

let dat = 0; let hong = 0;
const kiem = (t, d, c = '') => { if (d) { dat += 1; console.log(`PASS ${t}`); } else { hong += 1; console.log(`FAIL ${t} ${JSON.stringify(c).slice(0, 500)}`); } };
const L = napLuatCong();

// Đích, trích
kiem('chuanDich: 85.44 / nhóm 85.44 / Chương 85 / Phần XVI / Quy tắc 3(b); nút không có thật ⇒ null', chuanDich('85.44', L) === 'bieu:8544' && chuanDich('nhóm 85.44', L) === 'bieu:8544' && chuanDich('Chương 85', L) === 'chuong:85' && chuanDich('Phần XVI', L) === 'phan:XVI' && chuanDich('Quy tắc 3(b)', L) === 'gir:3:b' && chuanDich('99.99', L) === null);
const C7 = L.chuCau('nhom:7605:ct:7#1');
kiem('timTrich: nguyên văn, khác hoa thường, dấu lược "…" giữ đoạn dài nhất, bịa ⇒ null', timTrich('Dây điện và cáp điện cách điện', C7)?.tu === 4 && timTrich('dây điện và cáp điện cách điện', C7) && timTrich('Dây điện … (nhóm 85.44)', C7)?.trich === '(nhóm 85.44)' && timTrich('dây cáp chống cháy', C7) === null);

// Gói nhóm 76.05
const goi = dungGoi('bieu:7605', L);
kiem('gói 76.05: câu S có tên nhóm đầu tiên, 15 anh em, cạnh LOAI_SANG mang id đích', goi.S[0].id === 'bieu:7605#1' && goi.A.length === 15 && goi.S.some((s) => s.canh.some((c) => c.den === 'bieu:8544' && c.loai === 'LOAI_SANG')));
const luot = { S: goi.S, A: goi.A, R: goi.R, V: goi.V };
const kS = (id) => goi.S.find((s) => s.id === id).k;

// Chuẩn hoá phiếu
const pA = chuanPhieu('agy', [
  { c: kS('nhom:7605:ct:7#1'), loai: 'KHONG_DUOC_LA', dieuKien: 'Không phải dây cáp điện cách điện', trich: 'Dây điện và cáp điện cách điện', den: ['85.44'], duKien: ['cách điện', 'chữ bịa'] },
  { c: kS('bieu:7605#1'), loai: 'TACH_ANH_EM', dieuKien: 'Là dây', trich: 'Dây', voi: ['bieu:7604', 'bieu:7606', 'bieu:9999'] },
  { c: 'A1', loai: 'TACH_ANH_EM', dieuKien: 'trích tên anh em', trich: 'Nhôm chưa gia công', voi: ['bieu:7601'] },
  { c: kS('nhom:7605:ct:2#1'), loai: 'BO_QUA', lyDo: 'Câu dẫn đứng một mình' },
  { c: kS('nhom:7605:ct:3#1'), loai: 'KHONG_DUOC_LA', dieuKien: 'Không phải sợi kim loại', trich: 'Sợi kim loại', den: ['chuong:76'] },
], goi, luot, L);
kiem('chuanPhieu: den chuẩn id, duKien không có trong chữ bị bỏ, voi lạ bị bỏ, trích tên anh em bị bỏ, den là Chương chứa nút bị bỏ', pA.ra.find((x) => x.loai === 'KHONG_DUOC_LA')?.den?.[0] === 'bieu:8544' && pA.ra.find((x) => x.loai === 'KHONG_DUOC_LA').duKien.join() === 'cách điện' && pA.ra.find((x) => x.loai === 'TACH_ANH_EM').voi.join() === 'bieu:7604,bieu:7606' && pA.ra.filter((x) => x.loai === 'TACH_ANH_EM').length === 1 && pA.loi.some((l) => /tên anh em/.test(l)) && pA.loi.some((l) => /chính nút \/ nút chứa nó chuong:76/.test(l)), pA);

// Ghép: KHOP, LECH, gom cụm qua hai phiếu
const pG = chuanPhieu('gemma', [
  { c: kS('nhom:7605:ct:7#1'), loai: 'KHONG_DUOC_LA', dieuKien: 'Không phải dây điện cách điện', trich: 'Dây điện và cáp điện cách điện (kể cả loại đã tráng men cách điện hoặc mạ lớp cách điện)', den: ['bieu:8544'] },
  { c: kS('bieu:7605#1'), loai: 'TACH_ANH_EM', dieuKien: 'Là dây nhôm', trich: 'Dây nhôm', voi: ['bieu:7604'] },
  { c: kS('nhom:7605:ct:2#1'), loai: 'BO_QUA', lyDo: 'Câu dẫn' },
], goi, luot, L);
const g = ghepPhieu(gopTrongPhieu(pG.ra, L, pA.ra), gopTrongPhieu(pA.ra, L, pG.ra));
const kdl = g.ra.find((x) => x.cau === 'nhom:7605:ct:7#1');
kiem('KHOP: cùng câu, cùng loại, trích chồng ⇒ lấy trích dài hơn', kdl.trangThai === 'KHOP' && kdl.trich.includes('tráng men') && kdl.phieu.length === 2, kdl);
const tach = g.ra.filter((x) => x.loai === 'TACH_ANH_EM');
kiem('TACH_ANH_EM: phần chung voi ⇒ KHOP, voi chỉ một phiếu nêu ⇒ bản LECH_PHIEU riêng', tach.some((x) => x.trangThai === 'KHOP' && x.voi.join() === 'bieu:7604') && tach.some((x) => x.trangThai === 'LECH_PHIEU' && x.voi.join() === 'bieu:7606'), tach);
kiem('hai phiếu cùng BỎ QUA ⇒ một BO_QUA, không ghi chú', g.ra.filter((x) => x.cau === 'nhom:7605:ct:2#1' && x.loai === 'BO_QUA').length === 1 && !g.ra.find((x) => x.cau === 'nhom:7605:ct:2#1').ghiChu);
const ds = hoanTat(g.ra, L);
kiem('hoanTat: id hs:<nut>:<n> liền, lop/nguon/van máy điền, mọi bản ghi đúng khuôn', ds.every((x, i) => x.id === `hs:bieu:7605:${i + 1}`) && ds.every((x) => !kiemBanGhi(x).length), ds.map(kiemBanGhi).filter((l) => l.length));

// Cụm qua hai phiếu: phiếu A chia 2 đoạn rời, phiếu B một đoạn phủ cả hai
const goiT = dungGoi('bieu:7608', L); const lT = { S: goiT.S, A: [], R: [], V: [] }; const k14 = goiT.S.find((s) => s.id === 'nhom:7608:ct:14#1').k;
const a2 = chuanPhieu('agy', [{ c: k14, loai: 'KHONG_DUOC_LA', dieuKien: 'x', trich: 'các bộ phận của máy móc', den: ['phan:XVI'] }, { c: k14, loai: 'KHONG_DUOC_LA', dieuKien: 'y', trich: 'phương tiện giao thông', den: ['phan:XVII'] }], goiT, lT, L).ra;
const b2 = chuanPhieu('gemma', [{ c: k14, loai: 'KHONG_DUOC_LA', dieuKien: 'z', trich: 'các bộ phận của máy móc hoặc của phương tiện giao thông', den: ['phan:XVI', 'phan:XVII'] }], goiT, lT, L).ra;
const g2 = ghepPhieu(gopTrongPhieu(b2, L, a2), gopTrongPhieu(a2, L, b2));
kiem('gom cụm qua hai phiếu: hai đoạn rời của một phiếu nối bằng đoạn dài của phiếu kia ⇒ một KHOP den [XVI, XVII]', g2.ra.length === 1 && g2.ra[0].trangThai === 'KHOP' && g2.ra[0].den.length === 2, g2.ra);

// Nơi chuyển nằm trong chính nút ⇒ đổi PHAI_LA, LECH
const goiP = dungGoi('phan:XV', L, { anhEm: false }); const kq3 = goiP.S.find((s) => s.id === 'phan:XV:kq:3#1');
const pP = chuanPhieu('agy', [{ c: kq3.k, loai: 'KHONG_DUOC_LA', dieuKien: 'Không phải sản phẩm Chương 82, 83', trich: 'được phân loài vào Chương 82 và 83', den: ['chuong:82', 'chuong:83'] }], goiP, { S: goiP.S, A: [], R: [], V: [] }, L).ra;
kiem('KHONG_DUOC_LA có nơi chuyển trong chính nút (Phần XV → Chương 82, 83) ⇒ máy đổi PHAI_LA', pP[0]?.loai === 'PHAI_LA' && /Máy đổi/.test(pP[0]._doiLoai), pP);

// thuatNgu: kế thừa trong cùng nút, mượn phiếu kia
const dn = (mo, cau, tn) => ({ mo, nut: 'phan:XV', cau, loai: 'DINH_NGHIA', dieuKien: 'd', trich: 't', thuatNgu: tn, _tu: 0, _den: 5 });
const tA = thuNguCungNut([dn('agy', 'phan:XV:cg:9:a#1', 'Thanh và que'), dn('agy', 'phan:XV:cg:9:a#2', null)]);
const loi = []; const tB = thuNguCungNut([dn('gemma', 'phan:XV:cg:9:c#2', null), dn('gemma', 'phan:XV:cg:8:b#1', null)], loi, [dn('agy', 'phan:XV:cg:9:c#1', 'Dây')]);
kiem('thuatNgu: câu sau của cùng nút kế thừa; không có thì mượn phiếu kia cùng nút (đánh dấu); không ai có thì bỏ, ghi lỗi', tA[1].thuatNgu === 'Thanh và que' && tB.length === 1 && tB[0].thuatNgu === 'Dây' && tB[0]._muonTN && loi.length === 1, { tA, tB, loi });

// ghiKho chỉ đụng thư mục của thẻ
const tam = fs.mkdtempSync(path.join(os.tmpdir(), 'tach-')); fs.mkdirSync(path.join(tam, 'nguong'));
const ng = '{"id":"hs:bieu:7605:99","nut":"bieu:7605","loai":"NGUONG"}\n'; fs.writeFileSync(path.join(tam, 'nguong', '76.jsonl'), ng);
const tep = ghiKho(ds, ['bieu:7605'], tam, ['nhom']);
kiem('ghiKho với chiThuMuc [nhom]: ghi nhom/7605.jsonl, không đụng nguong/76.jsonl của thẻ khác', tep.join() === 'nhom/7605.jsonl' && fs.readFileSync(path.join(tam, 'nguong', '76.jsonl'), 'utf8') === ng, tep);
fs.rmSync(tam, { recursive: true, force: true });

console.log(`test-tach-ho-so-ma: ${dat} passed, ${hong} failed`);
process.exit(hong ? 1 : 0);
