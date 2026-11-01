#!/usr/bin/env node
import './test-isolate-data.mjs';
/** lib/so-tay-runtime.js: sổ tay lúc chạy ở chế độ CỐ VẤN — đính vào phản hồi, không đổi mã đã chọn. */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { nhomChuaCoSoTay } from './nhom-chua-co-so-tay.mjs';
const require = createRequire(import.meta.url);
const { dataPath } = require('../lib/data-paths.js');
const rt = require('../lib/so-tay-runtime.js');
const T = require('../lib/hs-tree.js');

let passed = 0; let failed = 0;
const assert = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ` ${extra}`}`); if (ok) passed += 1; else failed += 1; };

fs.mkdirSync(dataPath('so-tay'), { recursive: true });
const yk = (hs, n, extra = {}) => ({ hs, thuTuTrongMa: n, namThongQua: 2010 + n, moTa: `Mô tả mẫu ${hs}/${n} → mã ${hs.slice(0, 4)}.${hs.slice(4)}`, nguon: `wco-op.${hs}.${n}`, doTinCay: 'CHAC', daSoatAnh: false, dauVet: '0123456789abcdef', ...extra });
fs.writeFileSync(dataPath('so-tay', '8528.json'), JSON.stringify({
  nhom: '8528', phienBan: 'HS2022', yKienWcoDayDu: false,
  loaiTru: [
    { dieuKien: 'máy thu hình có gắn bộ dò', sangNhom: '8528', nguon: 'nhom8528.nhom' }, // trùng nhóm mình → bỏ
    { dieuKien: 'camera truyền hình, camera số', sangNhom: '8525', nguon: 'nhom8528.nhom' },
    { dieuKien: 'màn hình dùng trong máy tính', sangNhom: '8471|8543', nguon: 'nhom8528.nhom' },
  ],
  yKienWco: [yk('852852', 1), yk('852852', 2), yk('852862', 1)],
}));
fs.writeFileSync(dataPath('so-tay', '3926.json'), JSON.stringify({ nhom: '3926', loaiTru: [], yKienWcoDayDu: false, yKienWco: Array.from({ length: 11 }, (_, i) => yk('392690', i + 1)) }));
fs.writeFileSync(dataPath('so-tay', '9999.json'), '{ không phải json');
rt.reset();

const a = rt.advise({ topHs: '85285200', candidates: ['8525', '8471', '8528', '9503'] });
assert('advise: có sổ tay → CO_SO_TAY + chế độ CỐ VẤN', a.trangThai === 'CO_SO_TAY' && a.cheDo === 'CO_VAN' && a.nhom === '8528');
assert('canGiaiTrinh: chỉ nhóm đích đang là ứng viên (8525, 8471); bỏ nhóm không phải ứng viên (8543) và nhóm trùng chính mình', a.canGiaiTrinh.map((x) => x.sangNhom).join() === '8525,8471', JSON.stringify(a.canGiaiTrinh));
assert('canGiaiTrinh: là NGHI (có lý do, có nguồn), không phải kết luận', a.canGiaiTrinh.every((x) => x.nguon && /cần giải trình/.test(x.lyDo)) && /máy NGHI/.test(a.ghiChu));
assert('yKienWco: mã 8 số → chỉ đúng mã 6 số 8528.52 (không lẫn 8528.62)', a.yKienWco.length === 2 && a.yKienWco.every((x) => x.hs === '852852'));
assert('yKienWco: có mô tả tự viết + độ tin cậy + cờ chưa soát ảnh; KHÔNG lộ dấu vết/ trích', a.yKienWco[0].moTa && a.yKienWco[0].doTinCay === 'CHAC' && a.yKienWco[0].daSoatAnh === false && !('dauVet' in a.yKienWco[0]) && !('trich' in a.yKienWco[0]));
assert('yKienWcoDayDu=false được báo (không để hiểu là đủ)', a.yKienWcoDayDu === false);

const b = rt.advise({ topHs: '8528', candidates: [{ code4: '8525' }, { hs: '85171300' }] });
assert('mã 4 số: mọi ý kiến trong nhóm; ứng viên dạng đối tượng/8 số đều nhận', b.yKienWco.length === 3 && b.canGiaiTrinh.map((x) => x.sangNhom).join() === '8525');

const c = rt.advise({ topHs: '39269099', candidates: [] });
assert('giới hạn 8 ý kiến + báo số còn lại', c.yKienWco.length === 8 && c.yKienWcoConLai === 3 && c.canGiaiTrinh.length === 0);

// nhóm CHƯA CÓ sổ tay — chọn động theo dữ liệu hiện tại (lô soạn mới không làm đỏ test)
const CHUA_CO_SO_TAY = nhomChuaCoSoTay();
assert('nhóm chưa có sổ tay → CHUA_CO_SO_TAY_CHO_NHOM (nói thật), vẫn là cố vấn', rt.advise({ topHs: CHUA_CO_SO_TAY.hs8 }).trangThai === 'CHUA_CO_SO_TAY_CHO_NHOM');
assert('không có mã → null (không bịa)', rt.advise({ topHs: null }) === null && rt.advise({}) === null && rt.advise({ topHs: '12' }) === null);
assert('file sổ tay hỏng → vẫn không làm hỏng endpoint (coi như chưa có sổ tay)', rt.advise({ topHs: '99990000' }).trangThai === 'CHUA_CO_SO_TAY_CHO_NHOM');

const input = { topHs: '85285200', candidates: ['8525'] };
const snap = JSON.stringify(input);
rt.advise(input);
assert('advise không sửa đầu vào', JSON.stringify(input) === snap);

process.env.HS_SOTAY_RUNTIME = 'false';
assert('tắt khẩn cấp HS_SOTAY_RUNTIME=false → null', rt.advise({ topHs: '85285200' }) === null);
delete process.env.HS_SOTAY_RUNTIME;

// Dữ liệu thật trong repo: 8528.52 phải có ý kiến (đã nạp #196)
fs.rmSync(dataPath('so-tay'), { recursive: true, force: true }); rt.reset();
const real = rt.advise({ topHs: '85285200', candidates: ['8525'] });
assert('dữ liệu thật: 8528.52 có ý kiến WCO trong sổ tay công khai', real.trangThai === 'CO_SO_TAY' && real.yKienWco.length >= 5 && real.yKienWco.every((x) => x.hs === '852852'), JSON.stringify(real).slice(0, 200));
assert('dữ liệu thật: không có trường nguyên văn nào lọt ra (chỉ moTa tự viết ≤ 300 ký tự)', real.yKienWco.every((x) => x.moTa.length <= 300 && !('trich' in x) && !('text' in x)));


// ── Cây quan hệ (#236): viTri + loaiKhac đính vào soTay, cố vấn, không đổi mã ──
{
  // Sổ tay tạm 8504 với dong8 có điều kiện + trích cho một anh em (thư mục tạm đã bị xoá ở bước 'dữ liệu thật' → tạo lại)
  fs.mkdirSync(dataPath('so-tay'), { recursive: true });
  fs.writeFileSync(dataPath('so-tay', '8504.json'), JSON.stringify({ nhom: '8504', loaiTru: [], yKienWcoDayDu: false, yKienWco: [], dong8: [
    { hs: '85044011', dieuKien: 'Bộ nguồn cấp điện liên tục (UPS)', loaiKhac: false, nguon: 'sen.85044011', trich: 'Bộ nguồn cấp điện liên tục là bộ biến đổi điện…' },
    { hs: '85044090', dieuKien: 'Loại khác — không thuộc các dòng 8504.40 có tên', loaiKhac: true, nguon: 'tax.85044090', trich: 'Loại khác' },
  ] }));
  rt.reset();
  const v = rt.advise({ topHs: '85044090', candidates: ['8504', '8471'] });
  assert('viTri: đường dẫn phần→chương→nhóm→phân nhóm, cha 850440 không suyRa, anh em có nhóm con 8504401 suyRa', v.viTri && v.viTri.duongDan.length === 4 && v.viTri.cha.id === '850440' && v.viTri.cha.suyRa === false && v.viTri.anhEm.some((x) => x.id === '8504401' && x.suyRa), JSON.stringify(v.viTri));
  assert('loaiKhac: tổ tiên có tên 850440, 4 anh em có tên; anh em có trong dong8 thì kèm dieuKien + nguon + trich', v.loaiKhac && v.loaiKhac.toTienCoTen.id === '850440' && v.loaiKhac.anhEmCoTen.length === 4 && v.loaiKhac.anhEmCoTen[0].hs === '85044011' && v.loaiKhac.anhEmCoTen[0].nguon === 'sen.85044011' && /Bộ nguồn/.test(v.loaiKhac.anhEmCoTen[0].trich) && !v.loaiKhac.anhEmCoTen[1].trich, JSON.stringify(v.loaiKhac));
  assert('loaiKhac: dòng chính nó có dieuKienSoTay; ghi chú nói "phải chứng minh KHÔNG rơi vào"', /không thuộc/.test(v.loaiKhac.dieuKienSoTay) && /KHÔNG rơi vào/.test(v.loaiKhac.ghiChu));
  const w = rt.advise({ topHs: '85042111', candidates: [] });
  assert('mã có tên (không Loại khác): có viTri (cha là tiêu đề bị lược), không có loaiKhac', w.viTri && w.viTri.cha.id === '8504211' && w.viTri.cha.suyRa === true && !w.loaiKhac);
  // 4907 (tem bưu chính) chưa có sổ tay; 1509 đã có từ lô 059 (27/10), 4011 từ vòng soạn 20 nhóm 11/10.
  const x = rt.advise({ topHs: '49070029', candidates: [] });
  assert('nhóm chưa có sổ tay: vẫn có viTri + loaiKhac suy từ chữ số, trạng thái CHUA_CO_SO_TAY_CHO_NHOM', x.trangThai === 'CHUA_CO_SO_TAY_CHO_NHOM' && x.viTri && x.loaiKhac && x.loaiKhac.anhEmCoTen[0].hs === '49070021' && x.loaiKhac.anhEmCoTen[0].tang === '4907002' && !x.loaiKhac.anhEmCoTen[0].trich, JSON.stringify(x));
  // #725: tiêu đề 4907002 nay có tên nguyên văn biểu thuế ("Tem bưu chính, tem thuế…") → là điều kiện KHẲNG ĐỊNH; tầng nhóm
  // 4907 không trừ 49070010/50/60 (khác nhánh). Trước đây (Đợt 0A, tiêu đề coi như bị lược) ba dòng này bị liệt là "trừ".
  assert('4907 (#725): chỉ trừ 49070021; tầng 4907 phaiThuoc 4907002 + dieuKienTieuDe nguyên văn', x.loaiKhac.anhEmCoTen.map((a) => a.hs).join() === '49070021'
    && x.loaiKhac.truTheoTang.map((g) => g.nut).join() === '4907002,4907' && x.loaiKhac.truTheoTang[1].tru.length === 0 && x.loaiKhac.truTheoTang[1].phaiThuoc?.id === '4907002'
    && x.loaiKhac.dieuKienTieuDe.some((d) => d.id === '4907002' && /Tem bưu chính/.test(d.tenVi)), JSON.stringify(x.loaiKhac));
  const y = rt.advise({ topHs: '8504', candidates: [] });
  assert('mã 4 số: viTri là nhóm, không có loaiKhac', y.viTri.nut.startsWith('Nhóm 8504') && !y.loaiKhac);
  process.env.HS_SOTAY_RUNTIME = 'false';
  assert('tắt khẩn cấp → null (kể cả viTri)', rt.advise({ topHs: '85044090', candidates: [] }) === null);
  delete process.env.HS_SOTAY_RUNTIME;
}


// ── Máy nghi ANH_EM_CO_TEN_KHOP (CEO duyệt 11/10): mô tả hàng khớp dòng anh em có tên của mã "Loại khác" đã chọn ──
{
  fs.mkdirSync(dataPath('so-tay'), { recursive: true });
  fs.writeFileSync(dataPath('so-tay', '8504.json'), JSON.stringify({ nhom: '8504', loaiTru: [{ dieuKien: 'máy hàn', sangNhom: '8515', nguon: 'nhom8504.nhom' }], yKienWcoDayDu: false, yKienWco: [], dong8: [
    { hs: '85044040', dieuKien: 'Bộ nghịch lưu (inverter)', loaiKhac: false, nguon: 'tax.85044040', trich: 'Bộ nghịch lưu' },
  ] }));
  rt.reset();
  const sp = { tenHang: 'Bộ nghịch lưu năng lượng mặt trời hòa lưới 5kW', chatLieu: 'vỏ nhôm', congDung: 'đổi điện DC sang AC' };
  const k = rt.advise({ topHs: '85044090', candidates: ['8504', '8515'], sanPham: sp });
  const khop = k.canGiaiTrinh.filter((x) => x.loai === 'ANH_EM_CO_TEN_KHOP');
  assert('máy nghi: "bộ nghịch lưu" chọn Loại khác 85044090 → nghi anh em 85044040, kèm trích sổ tay, đứng đầu canGiaiTrinh', khop.length === 1 && khop[0].hs === '85044040' && khop[0].doKhop >= 0.8 && khop[0].nguon === 'tax.85044040' && khop[0].trich === 'Bộ nghịch lưu' && k.canGiaiTrinh[0].loai === 'ANH_EM_CO_TEN_KHOP', JSON.stringify(k.canGiaiTrinh));
  assert('máy nghi: loaiKhac.anhEmKhop cũng ghi; mục loại trừ cũ có loai LOAI_TRU_SANG_NHOM', k.loaiKhac.anhEmKhop?.[0]?.hs === '85044040' && k.canGiaiTrinh.some((x) => x.loai === 'LOAI_TRU_SANG_NHOM' && x.sangNhom === '8515'));
  assert('máy nghi: vẫn KHÔNG đổi mã (chế độ cố vấn), lý do nói "cần giải trình… hoặc xem lại mã"', k.cheDo === 'CO_VAN' && /cần giải trình/.test(khop[0].lyDo) && !('maDeXuat' in k));
  const n1 = rt.advise({ topHs: '85044090', candidates: [], sanPham: { tenHang: 'Bộ chuyển đổi tần số cho động cơ', chatLieu: 'nhựa' } });
  assert('máy nghi: mô tả không khớp anh em nào → không nghi', !n1.canGiaiTrinh.some((x) => x.loai === 'ANH_EM_CO_TEN_KHOP') && !n1.loaiKhac.anhEmKhop);
  const n2 = rt.advise({ topHs: '85044090', candidates: [] });
  assert('máy nghi: thiếu sanPham → không nghi, không lỗi', n2 && !n2.canGiaiTrinh.some((x) => x.loai === 'ANH_EM_CO_TEN_KHOP'));
  const n3 = rt.advise({ topHs: '85044040', candidates: [], sanPham: sp });
  assert('máy nghi: mã chọn có tên (không phải Loại khác) → không áp', !n3.canGiaiTrinh.some((x) => x.loai === 'ANH_EM_CO_TEN_KHOP'));
  const n4 = rt.advise({ topHs: '49070029', candidates: [], sanPham: { tenHang: 'Tem bưu chính' } });
  assert('máy nghi: nhóm chưa có sổ tay vẫn nghi được theo tên dòng biểu thuế (nguon tax.<mã>)', n4.trangThai === 'CHUA_CO_SO_TAY_CHO_NHOM' && (n4.canGiaiTrinh || []).some((x) => x.loai === 'ANH_EM_CO_TEN_KHOP' && x.hs === '49070021' && x.nguon === 'tax.49070021'), JSON.stringify(n4.canGiaiTrinh));
}


// ── #236 việc 2: tên điền từ sổ tay đính vào viTri; mục AI_CHUA_KIEM không được trích ──
{
  fs.mkdirSync(dataPath('so-tay'), { recursive: true });
  fs.writeFileSync(dataPath('so-tay', '8504.json'), JSON.stringify({ nhom: '8504', loaiTru: [{ dieuKien: 'máy hàn', sangNhom: '8515', nguon: 'nhom8504.nhom', nguonLoai: 'AI_CHUA_KIEM' }], yKienWcoDayDu: false, yKienWco: [],
    cay: { nguonLoai: 'MAY_SUY', tenDien: [{ id: '8504211', tenVi: 'Máy biến đổi đo lường', nguon: 'tax.85042111', trich: 'Máy biến đổi đo lường', nguonLoai: 'AI_DA_KIEM' }, { id: '8504401', tenVi: 'tên AI chưa kiểm', nguon: 'x', nguonLoai: 'AI_CHUA_KIEM' }] },
    dong8: [
      { hs: '85044040', dieuKien: 'Bộ nghịch lưu (inverter)', loaiKhac: false, nguon: 'tax.85044040', trich: 'Bộ nghịch lưu', nguonLoai: 'AI_CHUA_KIEM' },
      { hs: '85044030', dieuKien: 'Bộ chỉnh lưu khác', loaiKhac: false, nguon: 'tax.85044030', trich: 'Bộ chỉnh lưu khác', nguonLoai: 'AI_DA_KIEM' },
    ] }));
  rt.reset();
  const v = rt.advise({ topHs: '85042111', candidates: [] });
  assert('viTri: nút cha bị lược có tenSoTay (tên điền + nguồn + trích) và đường dẫn ghi "tên theo sổ tay"', v.viTri.cha.id === '8504211' && v.viTri.cha.tenSoTay?.tenVi === 'Máy biến đổi đo lường' && v.viTri.cha.tenSoTay.nguon === 'tax.85042111' && v.viTri.duongDan.some((d) => /tên theo sổ tay: Máy biến đổi đo lường/.test(d)), JSON.stringify(v.viTri).slice(0, 300));
  const w = rt.advise({ topHs: '85044090', candidates: ['8504', '8515'], sanPham: { tenHang: 'Bộ nghịch lưu năng lượng mặt trời', chatLieu: 'kim loại' } });
  const ae = w.loaiKhac.anhEmCoTen;
  assert('AI_CHUA_KIEM không được trích: dong8 85044040 (AI_CHUA_KIEM) không kèm trich; 85044030 (AI_DA_KIEM) có; tên điền AI_CHUA_KIEM không hiện',
    ae.find((x) => x.hs === '85044040') && !ae.find((x) => x.hs === '85044040').trich && ae.find((x) => x.hs === '85044030')?.trich === 'Bộ chỉnh lưu khác' && !ae.find((x) => x.hs === '8504401')?.tenSoTay && rt.tenSoTayOf('8504401') === null, JSON.stringify(ae).slice(0, 400));
  assert('máy nghi vẫn chạy trên tên biểu thuế nhưng không trích sổ tay AI_CHUA_KIEM; loaiTru AI_CHUA_KIEM không vào canGiaiTrinh',
    w.canGiaiTrinh.some((x) => x.loai === 'ANH_EM_CO_TEN_KHOP' && x.hs === '85044040' && x.nguon === 'tax.85044040' && !x.trich) && !w.canGiaiTrinh.some((x) => x.loai === 'LOAI_TRU_SANG_NHOM'), JSON.stringify(w.canGiaiTrinh));
  fs.rmSync(dataPath('so-tay'), { recursive: true, force: true }); rt.reset();
}

// ───────────── Đợt 0A: phạm vi "Loại khác" nhiều tầng (39269099) ─────────────
{
  rt.reset();
  const lk = rt.loaiKhac('39269099');
  const TANG_6_SO = ['39269010', '39269020', '3926903', '3926904', '3926905', '39269060', '3926908'];
  assert('39269099: truTheoTang đủ 2 tầng — 3926909 trừ 39269091–93; 392690 trừ 7 nút (gồm tiêu đề 3926903/4/5/8)',
    lk && lk.truTheoTang.length === 2 && lk.truTheoTang[0].nut === '3926909' && lk.truTheoTang[0].tru.map((x) => x.id).join() === '39269091,39269092,39269093'
      && lk.truTheoTang[1].nut === '392690' && lk.truTheoTang[1].tru.map((x) => x.id).join() === TANG_6_SO.join()
      && lk.truTheoTang[1].tru.find((x) => x.id === '3926903').laTieuDe === true, JSON.stringify(lk && lk.truTheoTang));
  assert('39269099: anhEmCoTen liệt kê dòng lá có tên ở MỌI tầng, tầng gần trước, mỗi mục có tang',
    lk.anhEmCoTen.slice(0, 3).map((a) => a.hs).join() === '39269091,39269092,39269093' && lk.anhEmCoTen.slice(0, 3).every((a) => a.tang === '3926909')
      && ['39269010', '39269020', '39269032', '39269060'].every((h) => lk.anhEmCoTen.some((a) => a.hs === h && a.tang === '392690')) && !lk.anhEmCoTenBiCat, JSON.stringify(lk.anhEmCoTen.map((a) => a.hs)));
  assert('39269099: toTienCoTen 392690, ghiChu nói "MỌI tầng"', lk.toTienCoTen.id === '392690' && /MỌI tầng/.test(lk.ghiChu));
  const k = rt.anhEmKhop('39269099', { tenHang: 'Phao nhựa cho lưới đánh cá' });
  assert('máy nghi đối chiếu cả tầng 6 số: "Phao nhựa cho lưới đánh cá" khai 39269099 → khớp 39269010', k.some((x) => x.hs === '39269010'), JSON.stringify(k));
  const one = rt.loaiKhac('85044090');
  assert('một tầng (85044090): truTheoTang 1 tầng, anhEmCoTen ≡ namedSiblingLeaves như cũ', one.truTheoTang.length === 1 && one.anhEmCoTen.map((a) => a.hs).join() === T.namedSiblingLeaves('85044090').join() && one.anhEmCoTen.every((a) => a.tang === '850440'), JSON.stringify(one.anhEmCoTen));
}

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
