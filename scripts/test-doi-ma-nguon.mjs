#!/usr/bin/env node
/**
 * scripts/test-doi-ma-nguon.mjs — cổng máy cho bảng đổi mã nguồn cũ (M-35 #1916, khuôn doi-ma@1).
 * Kiểm: cấu trúc bảng, id đích hợp ngữ pháp nut-luat@1, đích có thật trong các kho CÓ MẶT trên nhánh
 * (gir/chuong/bieu), trích thấy được theo đúng chế độ `kiem` (trích lưu 120 ký tự nên gachDoan/cuChuaNut
 * chỉ kiểm đích), thống kê khớp đếm thật, hàm đổi đúng cho mọi kiểu mã + luật cũ + không rõ.
 * Tất định, không mạng, không AI.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { boKiem, GOC } from './lib-luat.mjs';
import { NGU_PHAP } from './kiem-luat-goc.mjs';
import { chuanSo, coTrong, cuChuaNut, doiMaNguon, napBang, datLai } from '../lib/do-thi/doi-ma-nguon.js';

const { kiem, xong } = boKiem('test-doi-ma-nguon');

const pBang = path.join(GOC, 'data/luat-goc/doi-ma.json');
kiem('tồn tại data/luat-goc/doi-ma.json', fs.existsSync(pBang));
const bang = JSON.parse(fs.readFileSync(pBang, 'utf8'));

kiem('khuon doi-ma@1, phienBan 1', bang.khuon === 'doi-ma@1' && bang.phienBan === 1);
for (const f of ['moTa', 'xayDung', 'phepKiem', 'phepChuan', 'quyTac', 'banDo', 'luatCu', 'ngoaiPhamVi', 'thongKe']) {
  kiem(`trường ${f} có`, bang[f] != null);
}

const banDo = bang.banDo;
const luatCu = bang.luatCu;
kiem('bảng đổi không rỗng', Array.isArray(banDo) && banDo.length > 1000);
kiem('luật cũ là mảng', Array.isArray(luatCu));

// ---- id đích hợp ngữ pháp nut-luat@1 ----
const saiNguphap = banDo.filter((r) => !NGU_PHAP.test(r.moi)).map((r) => `${r.cu} -> ${r.moi}`);
kiem(`mọi id đích hợp ngữ pháp nut-luat@1 (${banDo.length} dòng)`, saiNguphap.length === 0, saiNguphap.slice(0, 5).join('; '));

// ---- không trùng (cu, trich) ----
const daThay = new Set();
const trung = [];
for (const r of banDo) {
  const k = `${r.cu}::${r.trich}`;
  if (daThay.has(k)) trung.push(k);
  daThay.add(k);
}
kiem('không hai dòng bảng đổi trùng (mã cũ, trích)', trung.length === 0, trung.slice(0, 3).join(' | '));
const trungLuatCu = luatCu.filter((e) => daThay.has(`${e.cu}::${e.trich.slice(0, 200).replace(/\s+$/, '')}`));
kiem('luật cũ không trùng dòng bảng đổi', trungLuatCu.length === 0, trungLuatCu.slice(0, 3).map((e) => e.cu).join(', '));

// ---- đích có thật + trích thấy được, với các kho CÓ MẶT ----
const KHO_MAT = ['gir', 'chuong', 'bieu'];
const nut = new Map();
for (const k of KHO_MAT) {
  const p = path.join(GOC, 'data/luat-goc', `${k}.jsonl`);
  if (!fs.existsSync(p)) continue;
  for (const l of fs.readFileSync(p, 'utf8').split('\n').filter((x) => x.trim())) {
    const n = JSON.parse(l);
    nut.set(n.id, n);
  }
}
let khongNut = 0; let khongTrich = 0; let daKiem = 0;
for (const r of banDo) {
  if (!KHO_MAT.includes(r.kho)) continue;
  daKiem += 1;
  const n = nut.get(r.moi);
  if (!n) { khongNut += 1; continue; }
  // trich lưu 120 ký tự nên gachDoan (đoạn sau có thể bị cắt) và cuChuaNut (nút dài hơn trích lưu) chỉ kiểm đích
  if (r.kiem === 'gachDoan' || r.kiem === 'cuChuaNut' || r.kiem === 'tonTai') continue;
  if (r.kiem === 'nhieuNut') { // nối các nút đích theo thứ tự in: mọi mảnh của trích (mảnh cuối có thể bị cắt ở 200 ký tự) thấy nguyên văn, đúng thứ tự
    const noi = [r.moi, ...(r.moiKem || [])].map((id) => nut.get(id)); if (noi.some((x) => !x)) { khongNut += 1; continue; }
    const v = chuanSo(noi.map((x) => x.nguyenVan).join(' ')); let vt = 0;
    for (const m of r.trich.split(/…|\.\.\./).map((x) => x.trim()).filter((x) => x.length >= 8)) { const j = v.indexOf(m, vt); if (j < 0) { khongTrich += 1; if (khongTrich < 4) console.log('lệch', r.cu, m.slice(0, 80)); break; } vt = j + m.length; }
    continue;
  }
  let kq = coTrong(r.trich, n.nguyenVan);
  if (!kq && r.kiem === 'boMaDau') {
    const doanDau = r.trich.replace(/^\d{6,10}\s*[-–—]*\s*/, '').split(/\u2026|\.\.\./)[0];
    kq = coTrong(doanDau, n.nguyenVan) ? 'boMaDau' : null;
  }
  if (!kq) khongTrich += 1;
}
kiem(`đích có thật trong kho mặt (${daKiem} dòng gir/chuong/bieu)`, khongNut === 0);
kiem('trích thấy được trong nút đích theo chế độ kiem (trừ gachDoan/cuChuaNut/tonTai chỉ kiểm đích)', khongTrich === 0, `${khongTrich} dòng lệch`);

// ---- thống kê khớp đếm thật ----
const t = bang.thongKe;
kiem('thongKe.tong khớp', t.tong.trichRieng === banDo.length + luatCu.length && t.tong.banDo === banDo.length && t.tong.luatCu === luatCu.length);
kiem('thongKe.dongSangKq khớp', t.tong.dongSangKq === banDo.filter((r) => r.moi.includes(':kq:')).length);
const demKiem = {};
for (const r of banDo) demKiem[r.kiem] = (demKiem[r.kiem] || 0) + 1;
kiem('thongKe.kiem khớp', JSON.stringify(demKiem) === JSON.stringify(t.kiem));

// ---- cảnh báo QT: dòng TỔNG QUÁT gắn nhãn chú giải phải trỏ về :kq: ----
kiem('có dòng tang2 đổi sang :kq: (361 dòng QT cảnh báo)', t.tong.dongSangKq >= 350, String(t.tong.dongSangKq));
kiem('mọi dòng trỏ :kq: có lớp HUONG_DAN ở nút đích (khi kho có mặt)',
  banDo.filter((r) => r.moi.includes(':kq:') && KHO_MAT.includes(r.kho)).every((r) => nut.get(r.moi)?.lop === 'HUONG_DAN'));

// ---- khai báo mo-đun ở dau-noi.json ----
const dauNoi = JSON.parse(fs.readFileSync(path.join(GOC, 'data/luat/dau-noi.json'), 'utf8'));
kiem('kho.bangCanh.moDun khai lib/do-thi/doi-ma-nguon.js', (dauNoi.kho?.bangCanh?.moDun || []).includes('lib/do-thi/doi-ma-nguon.js'));

// ---- phép chuẩn ----
kiem('chuanSo: NFC + nối dòng + gộp ngoặc kép', chuanSo(' “viên”\ncó \n nghĩa ') === '"viên" có nghĩa');
kiem('coTrong: nguyên văn', coTrong('tươi hoặc ướp lạnh', 'Nhóm này gồm thịt tươi hoặc ướp lạnh của động vật') === 'nguyenVan');
kiem('coTrong: trích ngắn ngoài cây con không khớp phép yếu', coTrong('nến cuộn', 'Nến, nến cây (kể cả nến tròn và nến cuộn)', 20) === null);
kiem('coTrong: trích ngắn trong cây con (teBa thấp) vẫn khớp', coTrong('nến cuộn', 'Nến, nến cây (kể cả nến tròn và nến cuộn)', 5) === 'nguyenVan');
kiem('coTrong: gachDoan — từng mảnh thấy nguyên văn, đúng thứ tự', coTrong('đoạn một khá dài để vượt ngưỡng… đoạn hai cũng đủ dài để vượt ngưỡng', 'đoạn một khá dài để vượt ngưỡng (bỏ đi ở giữa) đoạn hai cũng đủ dài để vượt ngưỡng') === 'gachDoan');
kiem('coTrong: boSoTrang — số trang dính cuối được bỏ', coTrong('1. Trong Phần này khái niệm "viên" có nghĩa là những sản phẩm được liên kết bằng cách nén trực tiếp 146', '1. Trong Phần này khái niệm “viên” có nghĩa là những sản phẩm được liên kết bằng cách nén trực tiếp') === 'boSoTrang');
kiem('cuChuaNut: trích bắt đầu bằng cả nút, dính đuôi câu dẫn khác', cuChuaNut('(d) Hạt ca cao (nhóm 18.01) đã lên men hoặc rang. Chương này cũng không bao gồm:', '(d) Hạt ca cao (nhóm 18.01) đã lên men hoặc rang.'));
kiem('CA NGƯỢC: coTrong không sửa chữ', coTrong('khái niệm "viên" chỉ các sản phẩm được liên kết bằng phương pháp nén trực tiếp', '1. Trong Phần này khái niệm “viên” có nghĩa là những sản phẩm được liên kết bằng cách nén trực tiếp') === null);

// ---- hàm đổi: đại diện từng kiểu mã, lấy từ chính bảng ----
datLai();
napBang();
const kieuDaiDien = [
  ['phan:NN:vung:K[:d]', /^phan:\d{2}:/],
  ['chuong:NN:vung:K[:d]', /^chuong:\d{2}:/],
  ['ct.NNNN.M', /^ct\.\d{4}\.\d+$/],
  ['chNN.chuong', /^ch\d{2}\.chuong$/],
  ['nhomNNNN.nhom', /^nhom\d{4}\.nhom$/],
  ['tax.NNNNNNNN', /^tax\.\d{6,8}$/],
  ['tieuDe.NNNNNN', /^tieuDe\.\d+/],
  ['sen.NNNNNNNN', /^sen\.\d+$/],
  ['phanNN.phan', /^phan\d{2}\.phan$/],
  ['px16.cgK[.d]', /^px16\./],
  ['tuongUng.NNNNNNNN', /^tuongUng\./],
];
for (const [ten, re] of kieuDaiDien) {
  const r = banDo.find((x) => re.test(x.cu));
  kiem(`hàm đổi được kiểu ${ten} (${r ? r.cu : 'không có dòng'})`, r != null && (() => {
    const kq = doiMaNguon(r.cu, r.trich);
    return kq.trangThai === 'DOI' && kq.idMoi === r.moi && kq.kemTheoTrich === true;
  })());
}
// trích THẬT chưa làm phẳng cũng phải khớp (hàm tự làm phẳng + cắt 120)
const rTax = banDo.find((x) => /^tax\./.test(x.cu));
kiem('hàm đổi nhận trích chưa làm phẳng (xuống dòng, ngoặc cong)', (() => {
  const trLa = rTax.trich.replace(/ /g, '\n').replace(/"/g, '\u201c').slice(0, 60);
  const kq = doiMaNguon(rTax.cu, trLa);
  return kq.trangThai === 'DOI' && kq.idMoi === rTax.moi;
})());
// mã không cần trích: mọi dòng cùng mã cùng đích thì trả được luôn
kiem('hàm đổi tax. không cần trích', doiMaNguon('tax.84122100').trangThai === 'DOI' && doiMaNguon('tax.84122100').idMoi === 'bieu:84122100');
// luật cũ
kiem('hàm đổi trả LUAT_CU cho trích không còn thấy trong bản 2022', (() => {
  const e = luatCu[0];
  const kq = doiMaNguon(e.cu, e.trich);
  return kq.trangThai === 'LUAT_CU';
})());
kiem('CA NGƯỢC: mã lạ trả KHONG_RO, không bịa', doiMaNguon('abc.xyz').trangThai === 'KHONG_RO' && doiMaNguon('ch61.chuong').trangThai === 'KHONG_RO');
const rNoi = banDo.find((x) => x.kiem === 'nhieuNut' && x.moiKem && !/\u2026/.test(x.trich));
kiem('trích trải nhiều nút: trả nút đầu và các nút kèm', (() => { const q = doiMaNguon(rNoi.cu, rNoi.trich); return q.trangThai === 'DOI' && q.idMoi === rNoi.moi && q.idKem?.length === rNoi.moiKem.length; })());
kiem('CA NGƯỢC: thiếu mã trả KHONG_RO', doiMaNguon('').trangThai === 'KHONG_RO');

xong();
