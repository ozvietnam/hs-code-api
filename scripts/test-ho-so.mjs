#!/usr/bin/env node
// scripts/test-ho-so.mjs — M-71 (#1963): bài kiểm khuôn ho-so-ma@1, năm cổng hồ sơ và máy ghép theo đường đi.
// Dữ liệu giả nhỏ dựng trong thư mục tạm: vài nút Chương 76 với câu, câu tách và cạnh nghĩa lấy THẬT từ data/luat-goc;
// hồ sơ đúng dựng tay theo luật ở dưới; mỗi cổng có ca ngược. Thêm hai ca trên kho thật với hồ sơ rỗng.
// Tất định, không mạng, không AI, không đụng data/ho-so-ma.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chayCong, napLuatCong, vanTay, dinhCau } from './ho-so-ma/cong.mjs';
import { kiemBanGhi } from './ho-so-ma/khuon.mjs';

const require = createRequire(import.meta.url);
const G = require('../lib/ho-so-ma/ghep.js');
const GOC = fileURLToPath(new URL('..', import.meta.url));
const LUAT_THAT = path.join(GOC, 'data/luat-goc');
let dat = 0; let hong = 0;
const kiem = (t, d, c = '') => { if (d) { dat += 1; console.log(`PASS ${t}`); } else { hong += 1; console.log(`FAIL ${t} ${typeof c === 'string' ? c : JSON.stringify(c).slice(0, 600)}`); } };

// ---------- 1. Kho luật giả: nút thật, câu thật, cạnh thật ----------
const TAM = fs.mkdtempSync(path.join(os.tmpdir(), 'ho-so-'));
const LUAT = path.join(TAM, 'luat-goc');
const NUT_CHON = new Set([
  'phan:XV', 'chuong:76', 'chuong:76:kq:24', 'chuong:28:pc:I:kq:2', // kq:2 Phân chương I Ch. 28: cạnh LOAI_SANG thật đi vào chuong:76
  'bieu:76', 'bieu:7602', 'bieu:760200', 'bieu:76020000', 'bieu:7614',
  'bieu:5605', 'bieu:5607', 'bieu:8311', 'bieu:8544', 'bieu:9209', // đích loại trừ ở chương khác
  ...Array.from({ length: 8 }, (_, i) => `nhom:7605:ct:${i + 1}`),
]);
const chonNut = (n) => NUT_CHON.has(n.id) || /^bieu:7605/.test(n.id);
const docDong = (f) => fs.readFileSync(f, 'utf8').split('\n').filter((l) => l.trim());
fs.mkdirSync(path.join(LUAT, 'cau'), { recursive: true }); fs.mkdirSync(path.join(LUAT, 'nghia-canh'), { recursive: true });
const daChon = new Set();
for (const kho of ['phan', 'chuong', 'bieu', 'nhom']) {
  const dong = docDong(path.join(LUAT_THAT, `${kho}.jsonl`)).filter((l) => { const n = JSON.parse(l); if (chonNut(n)) { daChon.add(n.id); return true; } return false; });
  fs.writeFileSync(path.join(LUAT, `${kho}.jsonl`), `${dong.join('\n')}\n`);
  const cau = docDong(path.join(LUAT_THAT, 'cau', `${kho}.jsonl`)).filter((l) => daChon.has(JSON.parse(l).id.split('#')[0]));
  fs.writeFileSync(path.join(LUAT, 'cau', `${kho}.jsonl`), `${cau.join('\n')}\n`);
}
fs.copyFileSync(path.join(LUAT_THAT, 'phan-chuong-nhom.json'), path.join(LUAT, 'phan-chuong-nhom.json'));
const idCau = new Set(fs.readdirSync(path.join(LUAT, 'cau')).flatMap((f) => docDong(path.join(LUAT, 'cau', f)).map((l) => JSON.parse(l).id)));
const canh = fs.readdirSync(path.join(LUAT_THAT, 'nghia-canh')).flatMap((f) => docDong(path.join(LUAT_THAT, 'nghia-canh', f))).filter((l) => idCau.has(JSON.parse(l).tu));
// Kho thật chưa có cạnh CHUA_RO nào đi vào Chương 76: thêm MỘT cạnh giả (chỉ trong bài kiểm) để thử nhánh cảnh báo.
const CANH_GIA = JSON.stringify({ tu: 'chuong:28:pc:I:kq:2#2', den: 'bieu:7602', trangThai: 'CHUA_RO', vi: 'GOM / LOAI_SANG', phieu: [{ mo: 'gia', loai: 'GOM' }, { mo: 'gia', loai: 'LOAI_SANG' }] });
fs.writeFileSync(path.join(LUAT, 'nghia-canh', 'gia.jsonl'), `${[...canh, CANH_GIA].join('\n')}\n`);
kiem('kho giả lấy đủ nút thật', [...NUT_CHON].every((id) => daChon.has(id)) && daChon.has('bieu:76051910'), [...NUT_CHON].filter((id) => !daChon.has(id)));
kiem('kho giả có cạnh LOAI_SANG thật (nhom:7605:ct:7#1 → bieu:8544, kq:24 → chuong:82, đi vào: Ch.28 kq:2#2 → chuong:76)', canh.some((l) => l.includes('"nhom:7605:ct:7#1"') && l.includes('bieu:8544')) && canh.some((l) => l.includes('chuong:76:kq:24#1') && l.includes('chuong:82')) && canh.some((l) => l.includes('"chuong:28:pc:I:kq:2#2"') && l.includes('"den":"chuong:76"') && l.includes('KHOP')));

// ---------- 2. Hồ sơ đúng, dựng tay theo luật ----------
const L = napLuatCong(LUAT);
const chuCau = (c) => L.chuCau(c);
const demId = new Map();
const vd = (nut, loai, cau, them = {}) => {
  const n = L.nut.get(cau.split('#')[0]); const k = (demId.get(nut) || 0) + 1; demId.set(nut, k);
  const chu = chuCau(cau);
  return { id: `hs:${nut}:${k}`, nut, loai, dieuKien: them.dieuKien || chu.replace(/^[-\s]+/, '').replace(/\s+/g, ' ').slice(0, 280), trich: them.trich || chu, cau, ...(them.tu ? { tu: them.tu } : {}), ...(them.den ? { den: them.den } : {}), ...(them.voi ? { voi: them.voi } : {}), ...(them.nguong ? { nguong: them.nguong } : {}), duKien: them.duKien || [], lop: n.lop, nguon: n.nguon, van: vanTay(chu), trangThai: them.trangThai || 'KHOP' };
};
const bq = (nut, cau, lyDo) => { const k = (demId.get(nut) || 0) + 1; demId.set(nut, k); return { id: `hs:${nut}:${k}`, nut, loai: 'BO_QUA', cau, lyDo, van: vanTay(chuCau(cau)) }; };
const TEN_THAM_KHAO = 'Tên Phần / Chương chỉ để dễ tra cứu (Quy tắc 1), không tạo điều kiện';
function dungHoSoDung() {
  demId.clear();
  const ds = [bq('phan:XV', 'phan:XV#1', TEN_THAM_KHAO), bq('chuong:76', 'chuong:76#1', TEN_THAM_KHAO), bq('chuong:76', 'bieu:76#1', 'Tên Chương trong biểu, cùng nghĩa tên Chương, chỉ để tra cứu (Quy tắc 1)')];
  ds.push(vd('chuong:76', 'KHONG_DUOC_LA', 'chuong:76:kq:24#1', { dieuKien: 'Không phải mặt hàng xếp trong Chương 82 hoặc 83', trich: 'ngoại trừ các mặt hàng được xếp trong chương 82 hoặc 83', den: ['chuong:82', 'chuong:83'] }));
  const VAO = 'chuong:28:pc:I:kq:2#2';
  ds.push(vd('chuong:76', 'PHAI_LA', VAO, { dieuKien: 'Kim loại cơ bản (Chương 28 loại sang các Chương kim loại cơ bản)', tu: VAO }));
  // Anh em cùng Chương cũng là "nơi khác": chú giải 76.05 (c) loại sang 76.14 ⇒ 76.14 phải có PHAI_LA mang tu câu đó.
  ds.push(vd('bieu:7614', 'PHAI_LA', 'nhom:7605:ct:5#1', { dieuKien: 'Dây bện tao, cáp và hàng hoá khác của nhóm 76.14 (theo chú giải 76.05)', tu: 'nhom:7605:ct:5#1' }));
  for (let i = 3; i <= 8; i += 1) {
    const c = `nhom:7605:ct:${i}#1`; const den = canh.map((l) => JSON.parse(l)).filter((e) => e.tu === c && e.loai === 'LOAI_SANG').map((e) => e.den);
    ds.push(vd('bieu:7605', 'KHONG_DUOC_LA', c, { dieuKien: `Không phải: ${chuCau(c).replace(/^\(\w\)\s*/, '')}`, den }));
  }
  const tenNguong = 'Kích thước mặt cắt ngang lớn nhất';
  const bieu76 = [...L.cay.theoId.keys()].filter((id) => /^bieu:76\d{2}/.test(id));
  for (const id of bieu76) ds.push(vd(id, 'PHAI_LA', `${id}#1`, { dieuKien: `Phải là: ${chuCau(`${id}#1`).replace(/^[-\s]+/, '')}` }));
  for (const [tren, khac] of [['bieu:760511', 'bieu:760519'], ['bieu:760521', 'bieu:760529']]) {
    ds.push(vd(tren, 'NGUONG', `${tren}#1`, { dieuKien: `${tenNguong} trên 7 mm`, trich: `${tenNguong} trên 7 mm`, duKien: [tenNguong], nguong: { daiLuong: tenNguong, donVi: 'mm', tu: 7, den: null, gomTu: false, gomDen: false } }));
    ds.push(vd(khac, 'NGUONG', `${tren}#1`, { dieuKien: `${tenNguong} không quá 7 mm (Loại khác, phủ định anh em có tên)`, trich: 'trên 7 mm', voi: [tren], duKien: [tenNguong], nguong: { daiLuong: tenNguong, donVi: 'mm', tu: null, den: 7, gomTu: false, gomDen: true } }));
  }
  const coNguong = new Set(['bieu:760511|bieu:760519', 'bieu:760521|bieu:760529']);
  for (const cha of ['bieu:76', ...bieu76]) {
    const con = L.cay.con.get(cha) || [];
    for (let i = 0; i < con.length; i += 1) for (let j = i + 1; j < con.length; j += 1) {
      if (coNguong.has(`${con[i]}|${con[j]}`)) continue;
      ds.push(vd(con[i], 'TACH_ANH_EM', `${con[i]}#1`, { dieuKien: `Khác ${con[j].slice(5)} ở: ${chuCau(`${con[i]}#1`).replace(/^[-\s]+/, '')}`, voi: [con[j]] }));
    }
  }
  return ds;
}
const tepCua = (x) => { const tm = x.loai === 'NGUONG' ? 'nguong' : G.thuMucCuaNut(x.nut); return `${tm}/${G.tepCuaNut(x.nut, tm)}.jsonl`; };
let soKho = 0;
function ghiKho(ds, { tepRieng = null } = {}) {
  soKho += 1; const goc = path.join(TAM, `ho-so-${soKho}`);
  const theoTep = new Map();
  for (const x of ds) { const t = tepRieng?.(x) || tepCua(x); if (!theoTep.has(t)) theoTep.set(t, []); theoTep.get(t).push(typeof x === 'string' ? x : JSON.stringify(x)); }
  for (const [t, dong] of theoTep) { fs.mkdirSync(path.dirname(path.join(goc, t)), { recursive: true }); fs.writeFileSync(path.join(goc, t), `${dong.join('\n')}\n`); }
  return goc;
}
const DUNG = dungHoSoDung();
const KHO_DUNG = ghiKho(DUNG);
const chay = (hoSo, o = {}) => chayCong({ luat: LUAT, hoSo, L, phamVi: ['chuong:76'], ...o });
const loiCong = (r) => Object.fromEntries(Object.entries(r.cong).map(([k, c]) => [k, c.loi]));
const xanh = (r, tru = []) => (tru.includes(0) || !r.khuon.length) && Object.entries(r.cong).every(([k, c]) => tru.includes(Number(k)) || !c.loi.length);

// ---------- 3. Ca đúng ----------
for (const pv of [['chuong:76'], ['phan:XV'], ['7605'], ['76051910'], ['760519']]) {
  const r = chay(KHO_DUNG, { phamVi: pv });
  kiem(`hồ sơ đúng xanh cả 5 cổng — phạm vi ${pv[0]} (${Object.values(r.cong).map((c) => c.soKiem).join('/')} mục)`, xanh(r) && r.cong[1].soKiem > 0 && r.cong[3].soKiem > 0, { khuon: r.khuon, ...loiCong(r) });
  if (pv[0] === 'chuong:76') kiem('cạnh CHUA_RO đi vào (Ch.28 → 7602) chỉ cảnh báo, không đỏ', r.cong[2].canhBao.length === 1 && /đi vào, CHUA_RO/.test(r.cong[2].canhBao[0]), r.cong[2].canhBao);
}
{
  const r = chay(KHO_DUNG, { phamVi: [] });
  kiem('không phạm vi: chỉ khuôn + cổng 4, 5 trên mọi bản ghi', xanh(r) && r.cong[4].soKiem === DUNG.length && r.cong[1].soKiem === 0, loiCong(r));
}
kiem('mọi bản ghi đúng khuôn', DUNG.every((x) => kiemBanGhi(x).length === 0), DUNG.map(kiemBanGhi).filter((l) => l.length));

// ---------- 4. Ca ngược từng cổng ----------
const sua = (f) => DUNG.map((x) => f(structuredClone(x))).filter(Boolean);
const caNguoc = (ten, kho, cong, mau, o = {}) => {
  const r = chay(kho, o);
  const loi = cong === 0 ? r.khuon : r.cong[cong].loi;
  const conLai = o.tru ? xanh(r, [cong, ...o.tru]) : xanh(r, [cong]);
  kiem(`CA NGƯỢC ${ten} ⇒ ${cong === 0 ? 'khuôn' : `cổng ${cong}`} đỏ${o.tru ? '' : ', cổng khác xanh'}`, loi.length > 0 && loi.some((l) => mau.test(l)) && (cong === 0 || !r.khuon.length) && conLai, { loi: loi.slice(0, 3), khac: loiCong(r) });
  return r;
};
// Cổng 1 ĐỦ
caNguoc('thiếu câu: tên Phần chưa có BỎ QUA', ghiKho(sua((x) => (x.cau === 'phan:XV#1' ? null : x))), 1, /phan:XV#1 \(LUAT\) chưa thành vấn đề/);
caNguoc('thiếu câu HUONG_DAN có cạnh loại trừ (nhom:7605:ct:6#1)', ghiKho(sua((x) => (x.cau === 'nhom:7605:ct:6#1' ? null : x))), 1, /nhom:7605:ct:6#1 \(HUONG_DAN\)/, { tru: [2] });
{
  const r = chay(ghiKho(sua((x) => (x.cau === 'phan:XV#1' ? null : x))), { phamVi: ['chuong:76'], chiTrong: true });
  kiem('--chi-trong: thiếu ở cấp Phần không làm đỏ phạm vi Chương', xanh(r), loiCong(r));
}
{
  const r = chay(KHO_DUNG);
  kiem('câu HUONG_DAN không cạnh loại trừ/định nghĩa (câu dẫn "Nhóm này không bao gồm:") không bắt buộc', !r.cong[1].loi.length && !DUNG.some((x) => x.cau === 'nhom:7605:ct:2#1'));
}
// Cổng 2 LOẠI
caNguoc('cạnh loại trừ có vấn đề nhưng đích sai (8544 → 8311)', ghiKho(sua((x) => { if (x.cau === 'nhom:7605:ct:7#1') x.den = ['bieu:8311']; return x; })), 2, /nhom:7605:ct:7#1 → bieu:8544/);
caNguoc('cạnh loại trừ chỉ có BỎ QUA', ghiKho(sua((x) => (x.cau === 'nhom:7605:ct:8#1' ? { id: x.id, nut: x.nut, loai: 'BO_QUA', cau: x.cau, lyDo: 'Ví dụ ngược: bỏ qua câu loại trừ', van: x.van } : x))), 2, /nhom:7605:ct:8#1 → bieu:9209/);
caNguoc('cạnh LOAI_SANG mà vấn đề ghi PHAI_LA', ghiKho(sua((x) => { if (x.cau === 'chuong:76:kq:24#1') x.loai = 'PHAI_LA'; return x; })), 2, /chuong:76:kq:24#1 → chuong:82 \(LOAI_SANG\) chưa có vấn đề KHONG_DUOC_LA/);
const laVao = (x) => x.tu === 'chuong:28:pc:I:kq:2#2';
caNguoc('cạnh LOAI_SANG đi vào chuong:76 chưa có PHAI_LA ở nút đích', ghiKho(sua((x) => (laVao(x) ? null : x))), 2, /chuong:28:pc:I:kq:2#2 → chuong:76 \(đi vào, LOAI_SANG\) chưa có PHAI_LA/);
caNguoc('cạnh đi vào từ anh em (76.05 (c) → 76.14) chưa có PHAI_LA ở 76.14', ghiKho(sua((x) => (x.tu === 'nhom:7605:ct:5#1' ? null : x))), 2, /nhom:7605:ct:5#1 → bieu:7614 \(đi vào, LOAI_SANG\)/);
caNguoc('PHAI_LA đi vào thiếu tu ⇒ trích câu ngoài đường đi', ghiKho(sua((x) => { if (laVao(x)) delete x.tu; return x; })), 4, /câu chuong:28:pc:I:kq:2#2 thuộc chuong:28:pc:I, không nằm trên đường đi của chuong:76/, { tru: [2] });
caNguoc('PHAI_LA mang tu nhưng đặt ở nút không phải đích cạnh', ghiKho(sua((x) => { if (laVao(x)) { x.nut = 'bieu:7605'; x.id = 'hs:bieu:7605:99'; } return x; })), 4, /tu chuong:28:pc:I:kq:2#2 không có cạnh LOAI_SANG \/ PHAN_VE nào đi vào bieu:7605/, { tru: [2] });
{
  const r = chay(ghiKho(sua((x) => (laVao(x) ? null : x))), { phamVi: ['7605'], chiTrong: true });
  kiem('--chi-trong nhóm 76.05: cạnh đi vào cấp Chương không đòi', xanh(r), loiCong(r));
}
kiem('CA NGƯỢC khuôn: tu khác cau', kiemBanGhi({ ...DUNG.find(laVao), tu: 'chuong:28:pc:I:kq:2#1' }).some((l) => /tu phải là id câu nguồn/.test(l)));
// Cổng 3 ANH EM
caNguoc('hai nhóm anh em chưa tách (7602 / 7605)', ghiKho(sua((x) => (x.loai === 'TACH_ANH_EM' && x.nut === 'bieu:7602' && x.voi[0] === 'bieu:7605' ? null : x))), 3, /bieu:7602 và bieu:7605 .*chưa có TACH_ANH_EM/);
caNguoc('hai anh em trùng bộ điều kiện (76051910 / 76051990)', ghiKho(sua((x) => { if (/^bieu:760519[19]0$/.test(x.nut)) { x.dieuKien = 'Điều kiện giống hệt'; x.loai = x.loai === 'TACH_ANH_EM' ? 'PHAI_LA' : x.loai; delete x.voi; } return x; }).concat([vd('bieu:76051910', 'TACH_ANH_EM', 'bieu:76051910#1', { dieuKien: 'Điều kiện giống hệt', voi: ['bieu:76051990'] }), vd('bieu:76051990', 'TACH_ANH_EM', 'bieu:76051990#1', { dieuKien: 'Điều kiện giống hệt', voi: ['bieu:76051910'] })])), 3, /bieu:76051910 và bieu:76051990: trùng bộ điều kiện/);
caNguoc('NGUONG chồng dải (Loại khác tới 8 mm)', ghiKho(sua((x) => { if (x.nut === 'bieu:760519' && x.loai === 'NGUONG') x.nguong.den = 8; return x; })), 3, /bieu:760511 và bieu:760519: NGUONG chồng dải/);
caNguoc('NGUONG hở dải (Loại khác dưới 7 mm, bỏ đúng 7)', ghiKho(sua((x) => { if (x.nut === 'bieu:760519' && x.loai === 'NGUONG') { x.nguong.den = 6; } return x; })), 3, /dải "kích thước mặt cắt ngang lớn nhất" hở giữa 6 và 7/);
caNguoc('TACH_ANH_EM trỏ tới nút không phải anh em', ghiKho(sua((x) => { if (x.loai === 'TACH_ANH_EM' && x.nut === 'bieu:76051910') x.voi = ['bieu:76051990', 'bieu:76052910']; return x; })), 3, /voi bieu:76052910 không phải anh em/);
// Cổng 4 TRÍCH
caNguoc('trích sai một chữ', ghiKho(sua((x) => { if (x.cau === 'nhom:7605:ct:7#1') x.trich = x.trich.replace('cách điện', 'cách nhiệt'); return x; })), 4, /trích không nguyên văn câu nhom:7605:ct:7#1/);
caNguoc('id câu không có thật', ghiKho(sua((x) => { if (x.nut === 'bieu:76051910' && x.loai === 'PHAI_LA') x.cau = 'bieu:76051910#9'; return x; })), 4, /câu bieu:76051910#9 không có/);
caNguoc('lop sai (HUONG_DAN cho câu biểu)', ghiKho(sua((x) => { if (x.nut === 'bieu:7605' && x.loai === 'PHAI_LA') x.lop = 'HUONG_DAN'; return x; })), 4, /lop HUONG_DAN khác nút nguồn \(LUAT\)/);
caNguoc('nguon sai', ghiKho(sua((x) => { if (x.cau === 'nhom:7605:ct:3#1') x.nguon = 'Trí nhớ'; return x; })), 4, /nguon "Trí nhớ" khác nút nguồn/);
caNguoc('dữ kiện tự đặt, không có trong chữ luật', ghiKho(sua((x) => { if (x.nut === 'bieu:760511' && x.loai === 'NGUONG') x.duKien = ['đường kính dây']; return x; })), 4, /dữ kiện "đường kính dây" không có trong chữ câu/);
caNguoc('câu ngoài đường đi của nút (7602 trích câu của 7605)', ghiKho(sua((x) => { if (x.nut === 'bieu:7602' && x.loai === 'PHAI_LA') { const y = vd('bieu:7602', 'PHAI_LA', 'bieu:7605#1'); x.cau = y.cau; x.trich = y.trich; x.van = y.van; } return x; })), 4, /câu bieu:7605#1 thuộc bieu:7605, không nằm trên đường đi của bieu:7602/, { tru: [1] });
caNguoc('trích câu tiền lệ', ghiKho(sua((x) => { if (x.cau === 'nhom:7605:ct:3#1' && x.loai === 'KHONG_DUOC_LA') x.cau = 'tb:851-2023:76051990#1'; return x; })), 4, /trích câu tiền lệ/, { tru: [1, 2] });
caNguoc('đích loại trừ không có trong kho', ghiKho(sua((x) => { if (x.cau === 'nhom:7605:ct:8#1') x.den = ['bieu:9209', 'bieu:99999999']; return x; })), 4, /nút bieu:99999999 không có trong kho luật/);
// Cổng 5 VÂN TAY
caNguoc('vân tay ghi sai', ghiKho(sua((x) => { if (x.nut === 'bieu:76051990' && x.loai === 'PHAI_LA') x.van = '0'.repeat(64); return x; })), 5, /vân tay lệch câu bieu:76051990#1.*--dinh-cau/);
{
  // Luật đổi chữ một câu: chỉ các bản ghi dính câu đó đỏ.
  const luat2 = path.join(TAM, 'luat-doi'); fs.cpSync(LUAT, luat2, { recursive: true });
  const tep = path.join(luat2, 'bieu.jsonl');
  fs.writeFileSync(tep, docDong(tep).map((l) => { const n = JSON.parse(l); if (n.id === 'bieu:76051990') { n.nguyenVan = n.nguyenVan.replace('Loại khác', 'Loại khắc'); return JSON.stringify(n); } return l; }).join('\n') + '\n');
  const r = chayCong({ luat: luat2, hoSo: KHO_DUNG, phamVi: ['chuong:76'] });
  const dinh = DUNG.filter((x) => x.cau === 'bieu:76051990#1').map((x) => x.id);
  kiem(`CA NGƯỢC luật đổi chữ câu bieu:76051990#1 ⇒ cổng 5 đỏ đúng ${dinh.length} bản ghi dính câu, không thừa`, r.cong[5].loi.length === dinh.length && dinh.every((id) => r.cong[5].loi.some((l) => l.startsWith(`${id}:`))), r.cong[5].loi);
  const d = dinhCau('bieu:76051990#1', { luat: luat2, hoSo: KHO_DUNG });
  kiem('--dinh-cau trả chữ mới, vân tay mới và các bản ghi phải dựng lại', d.chu.includes('Loại khắc') && d.banGhi.length === dinh.length && d.banGhi.every((b) => !b.khop), d);
}
// Khuôn
caNguoc('khuôn: loại lạ LOAI_TRU', ghiKho(sua((x) => { if (x.cau === 'nhom:7605:ct:3#1') x.loai = 'LOAI_TRU'; return x; })), 0, /loai lạ "LOAI_TRU"/, { tru: [1, 2] });
caNguoc('khuôn: KHONG_DUOC_LA thiếu den', ghiKho(sua((x) => { if (x.cau === 'nhom:7605:ct:4#1') delete x.den; return x; })), 0, /KHONG_DUOC_LA phải có den/, { tru: [1, 2] });
caNguoc('khuôn: trangThai lạ', ghiKho(sua((x) => { if (x.nut === 'bieu:7614') x.trangThai = 'OK'; return x; })), 0, /trangThai lạ "OK"/, { tru: [1, 2, 3] });
caNguoc('khuôn: trường lạ', ghiKho(sua((x) => { if (x.nut === 'bieu:7614' && x.loai === 'PHAI_LA') x.tuKhoa = ['nhôm']; return x; })), 0, /trường lạ "tuKhoa"/, { tru: [1, 2, 3] });
caNguoc('khuôn: BỎ QUA thiếu lý do', ghiKho(sua((x) => { if (x.loai === 'BO_QUA' && x.nut === 'phan:XV') delete x.lyDo; return x; })), 0, /BỎ QUA phải có lyDo/, { tru: [1] });
caNguoc('khuôn: NGUONG dải rỗng (tu > den)', ghiKho(sua((x) => { if (x.nut === 'bieu:760511' && x.loai === 'NGUONG') x.nguong.den = 3; return x; })), 0, /nguong rỗng/, { tru: [3] });
caNguoc('khuôn: nút ghi sai tệp (8 số trong tệp nhóm)', ghiKho(DUNG, { tepRieng: (x) => (x.nut === 'bieu:76051910' ? 'nhom/7605.jsonl' : null) }), 0, /nút bieu:76051910 không được ghi ở tệp này \(đúng: dong\/76051910\.jsonl/, { tru: [1, 2, 3] });
caNguoc('khuôn: trùng id', ghiKho([...DUNG, { ...DUNG.find((x) => x.nut === 'bieu:7614'), dieuKien: 'Bản sao' }]), 0, /trùng id hs:bieu:7614:1/);
{
  const goc = ghiKho(DUNG); fs.mkdirSync(path.join(goc, 'ranh-gioi'), { recursive: true }); fs.writeFileSync(path.join(goc, 'lat-1.json'), '[]');
  kiem('CA NGƯỢC khuôn: thư mục / tệp lạ ở gốc kho hồ sơ ⇒ đỏ', ['ranh-gioi', 'lat-1.json'].every((t) => chay(goc).khuon.some((l) => l.startsWith(`${t}: lạ ở gốc`))));
  fs.mkdirSync(path.join(goc, 'dong'), { recursive: true }); fs.writeFileSync(path.join(goc, 'dong', 'ghi-chu.md'), 'x');
  kiem('CA NGƯỢC khuôn: tệp lạ trong thư mục hồ sơ ⇒ đỏ', chay(goc).khuon.some((l) => /dong\/ghi-chu\.md: tệp lạ/.test(l)));
}
caNguoc('khuôn: dòng không phải JSON', ghiKho([...DUNG, 'không phải json'], { tepRieng: (x) => (typeof x === 'string' ? 'dong/76051910.jsonl' : null) }), 0, /không phải JSON/);

// ---------- 5. Máy ghép theo đường đi ----------
{
  const h = G.hoSo('7605.19.10', { luat: LUAT, hoSo: KHO_DUNG });
  const cap = h.duong.map((c) => `${c.cap}=${c.nut}`).join(' ');
  kiem('ghép 8 số: Phần → Chương → 4 → tiêu đề 5 → 6 → 8', cap === 'PHAN=phan:XV CHUONG=chuong:76 NHOM=bieu:7605 TIEU_DE_5=bieu:76051 PHAN_NHOM=bieu:760519 DONG=bieu:76051910', cap);
  kiem('ghép: không thiếu cấp nào khi hồ sơ đủ', h.thieu.length === 0 && h.soVanDe > 0, h.thieu);
  const c6 = h.duong.find((c) => c.cap === 'PHAN_NHOM'); const c8 = h.duong.find((c) => c.cap === 'DONG'); const c4 = h.duong.find((c) => c.cap === 'NHOM');
  kiem('ghép: anh em ở mỗi cấp', c6.anhEm.map((a) => a.nut).join() === 'bieu:760511' && c8.anhEm.map((a) => a.nut).join() === 'bieu:76051990' && c4.anhEm.map((a) => a.nut).sort().join() === 'bieu:7602,bieu:7614', { c4: c4.anhEm, c6: c6.anhEm, c8: c8.anhEm });
  kiem('ghép: vấn đề nằm ở nút sinh ra nó, gom cả tệp ngưỡng', c6.vanDe.some((x) => x.loai === 'NGUONG') && c4.vanDe.filter((x) => x.loai === 'KHONG_DUOC_LA').length === 6 && h.duong.every((c) => c.vanDe.every((x) => x.nut === c.nut)));
  kiem('ghép: không chép — bản ghi trả về đúng như trong kho', c8.vanDe.every((x) => JSON.stringify(x) === JSON.stringify(DUNG.find((y) => y.id === x.id))));
  kiem('ghép: PHAI_LA của cạnh đi vào nằm ở cấp Chương', h.duong[1].vanDe.some((x) => x.loai === 'PHAI_LA' && x.tu === 'chuong:28:pc:I:kq:2#2'));
  kiem('ghép: cấp Phần chỉ có BỎ QUA thì không vào vanDe, không tính thiếu', h.duong[0].vanDe.length === 0 && h.duong[0].soBoQua === 1 && !h.duong[0].thieu);
  const h4 = G.hoSo('7605', { luat: LUAT, hoSo: KHO_DUNG }); const h6 = G.hoSo('760519', { luat: LUAT, hoSo: KHO_DUNG });
  kiem('ghép 4 và 6 số dừng đúng cấp', h4.duong.at(-1).cap === 'NHOM' && h6.duong.at(-1).cap === 'PHAN_NHOM' && h6.duong.length === 5);
  const thieu = ghiKho(DUNG.filter((x) => x.nut !== 'bieu:76051910'));
  const ht = G.hoSo('76051910', { luat: LUAT, hoSo: thieu });
  kiem('ghép: thiếu dữ liệu cấp 8 số thì nói thiếu', ht.thieu.length === 1 && /^DONG bieu:76051910/.test(ht.thieu[0]) && ht.duong.at(-1).thieu, ht.thieu);
  kiem('ghép: mã không có trong biểu / sai định dạng', G.hoSo('76059999', { luat: LUAT, hoSo: KHO_DUNG }).khongCo && G.hoSo('76a5', { luat: LUAT }).khongCo);
}

// ---------- 6. Dòng lệnh ----------
{
  const cong = path.join(GOC, 'scripts/ho-so-ma/cong.mjs'); const khuon = path.join(GOC, 'scripts/ho-so-ma/khuon.mjs');
  const a = spawnSync(process.execPath, [cong, '--luat', LUAT, '--ho-so', KHO_DUNG, '--pham-vi', '76'], { encoding: 'utf8' });
  const b = spawnSync(process.execPath, [cong, '--luat', LUAT, '--ho-so', ghiKho(sua((x) => (x.cau === 'phan:XV#1' ? null : x))), '--pham-vi', '7605', '--cong', '1'], { encoding: 'utf8' });
  const c = spawnSync(process.execPath, [khuon, '--ho-so', KHO_DUNG], { encoding: 'utf8' });
  kiem('dòng lệnh cong.mjs: xanh thoát 0, đỏ thoát 1', a.status === 0 && /PASS cổng 5 VÂN TAY/.test(a.stdout) && b.status === 1 && /FAIL cổng 1 ĐỦ/.test(b.stdout), { a: a.stdout.slice(-400) + a.stderr, b: b.stdout.slice(-300) });
  kiem('dòng lệnh khuon.mjs thoát 0 trên kho đúng', c.status === 0 && /PASS khuôn ho-so-ma@1/.test(c.stdout), c.stdout + c.stderr);
}

// ---------- 7. Kho luật thật, hồ sơ rỗng: đỏ đúng chỗ ----------
{
  const rong = path.join(TAM, 'rong');
  const Lt = napLuatCong(LUAT_THAT);
  const r = chayCong({ luat: LUAT_THAT, hoSo: rong, L: Lt, phamVi: ['7605'], chiTrong: true, cong: [1, 2] });
  kiem('kho thật nhóm 76.05, hồ sơ rỗng: cổng 1 đòi tên nhóm và câu loại trừ, không đòi cấp Phần (chỉ trong)', r.cong[1].loi.some((l) => l.startsWith('bieu:7605#1 ')) && r.cong[1].loi.some((l) => l.startsWith('nhom:7605:ct:7#1 ')) && !r.cong[1].loi.some((l) => l.startsWith('phan:')), r.cong[1].loi.slice(0, 5));
  kiem('kho thật: cổng 2 đòi đủ 6 cạnh loại trừ của nhóm 76.05', r.cong[2].loi.length >= 6 && r.cong[2].loi.some((l) => l.includes('nhom:7605:ct:7#1 → bieu:8544')), r.cong[2].loi);
  const h = G.hoSo('28111100', { luat: LUAT_THAT, hoSo: rong });
  kiem('kho thật: đường đi Chương có Phân chương (28.11 thuộc Phân chương II)', h.duong.some((c) => c.cap === 'PHAN_CHUONG' && c.nut === 'chuong:28:pc:II') && h.thieu.length === h.duong.length, h.duong.map((c) => c.nut));
}

fs.rmSync(TAM, { recursive: true, force: true });
console.log(`test-ho-so: ${dat} passed, ${hong} failed`);
process.exit(hong ? 1 : 0);
