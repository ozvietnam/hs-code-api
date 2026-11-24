#!/usr/bin/env node
/**
 * Cổng máy #1636 Việc 3 (ADR-0004 §2 B1): câu loại trừ chú giải chi tiết (LOAI_TRU) + ý kiến WCO (WCO).
 * ĐỎ khi:
 *  - số cạnh LOAI_TRU hoặc WCO = 0;
 *  - có cạnh thiếu trích dẫn / nguồn hoặc trích dẫn LOAI_TRU không khớp nguyên văn chu-giai-heading / nguồn hợp lệ;
 *  - thiếu một trong 3 ví dụ bắt buộc (#1636): 8545 → 85.03 (giữ chổi than), 7603 → Ch.32 (bột nhão), 3924 ← 3924.90/4 (+ 6402 ← 6402.99/1);
 *  - làm yếu cổngheadingSuspect của API công khai lib/wco-op.js#view.
 */
import { createRequire } from 'node:module';
import { GOC, docJson, boKiem } from './lib-luat.mjs';

process.chdir(GOC);
const require = createRequire(import.meta.url);
const { kiem, xong } = boKiem('test-loai-tru-wco');
const D = require('../lib/do-thi/index.js');
const { sourcesFor, quoteInSource, squash, checkItem } = require('../lib/so-tay.js');
const wcoOp = require('../lib/wco-op.js');

const b = D.bangCanh();
const loaiTru = b.canh.filter((e) => e.loai === 'LOAI_TRU');
const wco = b.canh.filter((e) => e.loai === 'WCO');

kiem(`có cạnh LOAI_TRU (${loaiTru.length} cạnh từ ${b.thongKe.loaiTru?.nhomNguon || 0} nhóm)`, loaiTru.length > 0 && b.thongKe.soCanh.LOAI_TRU === loaiTru.length);
kiem(`có cạnh WCO (${wco.length} cạnh từ ${b.thongKe.wco?.nhomDich || 0} phân nhóm/nhóm)`, wco.length > 0 && b.thongKe.soCanh.WCO === wco.length);

// 1. Mọi cạnh LOAI_TRU đều có trích nguyên văn trong nguồn hợp lệ của nhóm nguồn
let loaiTruHong = [];
const srcCache = new Map();
for (const e of loaiTru) {
  if (!e.trich || !e.nguon) { loaiTruHong.push(`${e.id}:thieu-trich`); continue; }
  if (!srcCache.has(e.tu)) {
    const s = sourcesFor(e.tu);
    const sq = Object.fromEntries(Object.entries(s).map(([k, v]) => [k, squash(v)]));
    srcCache.set(e.tu, { s, sq });
  }
  const { sq } = srcCache.get(e.tu);
  if (!sq[e.nguon] || !quoteInSource(e.trich, sq[e.nguon])) {
    loaiTruHong.push(`${e.id}:khong-khop-nguon`);
  }
}
kiem(`0 cạnh LOAI_TRU thiếu hoặc sai trích dẫn nguyên văn (${loaiTru.length} cạnh)`, loaiTruHong.length === 0, loaiTruHong.slice(0, 5).join(', '));
kiem(`0 cạnh WCO thiếu trích hoặc nguồn (${wco.length} cạnh)`, wco.every((e) => Boolean(e.trich && e.nguon && e.idWco && e.viTri)));

// 2. Ba ví dụ bắt buộc của #1636
const st8545 = docJson('data/so-tay/8545.json');
kiem('8545 → 85.03 (bộ phận giữ chổi than): có trong sổ tay 8545 VÀ cạnh LOAI_TRU',
  (st8545.loaiTru || []).some((x) => x.sangNhom === '8503' && /giữ chổi than/i.test(x.dieuKien) && /85\.03/.test(x.trich))
  && loaiTru.some((e) => e.tu === '8545' && e.toi === '8503' && /giữ chổi than/i.test(e.trich)));

const st7603 = docJson('data/so-tay/7603.json');
kiem('7603 → Ch.32 (bột nhão với chất gắn/dung môi): có trong sổ tay 7603 VÀ cạnh LOAI_TRU 7603>32',
  (st7603.loaiTru || []).some((x) => x.sangNhom === '32' && /bột nhão/i.test(x.trich) && /Chương 32/.test(x.trich))
  && loaiTru.some((e) => e.tu === '7603' && e.toi === '32' && /bột nhão/i.test(e.trich)));

const eWco3924 = wco.find((e) => e.tu === '3924' && e.toi === '392490' && e.idWco === '392490/4');
kiem('3924 ← 3924.90/4: có cạnh WCO 3924>392490 và giữ minh bạch cờ nghi ngờ OCR (headingSuspect=true)',
  Boolean(eWco3924)
  && /Shower set/i.test(eWco3924.trich)
  && eWco3924.headingSuspect === true
  && eWco3924.headingContinued === true
  && eWco3924.bac === 2,
  JSON.stringify(eWco3924 || null));

const eWco6402 = wco.find((e) => e.tu === '6402' && e.toi === '640299' && e.idWco === '640299/1');
kiem('6402 ← 6402.99/1: có cạnh WCO sạch (headingSuspect=false, bac=1)',
  Boolean(eWco6402) && eWco6402.headingSuspect === false && eWco6402.bac === 1 && /cellular plastics/i.test(eWco6402.trich));

// 3. Ca ngược: cổng API công khai WCO không bị nới lỏng + tự trùng chương phải bị từ chối
kiem('ca ngược: cổng công khai lib/wco-op.js#view vẫn chặn 392490/4 (headingSuspect); tự loại trừ chính chương bị checkItem từ chối',
  wcoOp.view(wcoOp.get('392490/4')) === null
  && checkItem('loaiTru', { dieuKien: 'test', sangNhom: '76', nguon: 'nhom7603.nhom', trich: 'Chương 76' }, { 'nhom7603.nhom': 'Chương 76' }, '7603') === 'nhom-dich-trung-nhom-nay');

// 4. OZV-2099 — ca 82 tầng 4 số: gặm nướu trẻ em / cao su silicone → cạnh loại trừ 2 chiều 40.14 ↔ 39.26
{
  const H = require('../lib/hoi-theo-so-tay.js');
  const st4014 = docJson('data/so-tay/4014.json');
  const st3926 = docJson('data/so-tay/3926.json');
  const muc4014 = (st4014.loaiTru || []).find((x) => x.sangNhom === '3926' && /gặm nướu/i.test(x.dieuKien || ''));
  const muc3926 = (st3926.loaiTru || []).find((x) => x.sangNhom === '4014' && /gặm nướu/i.test(x.dieuKien || ''));
  kiem('OZV-2099: sổ tay 4014↔3926 có loaiTru 2 chiều + canCuLoaiTru nguyên văn (checkItem đạt)',
    Boolean(muc4014 && muc3926)
    && checkItem('loaiTru', muc4014, sourcesFor('4014'), '4014') === null
    && checkItem('loaiTru', muc3926, sourcesFor('3926'), '3926') === null,
    JSON.stringify({ muc4014: Boolean(muc4014), muc3926: Boolean(muc3926) }));
  kiem('OZV-2099: dieuKien hai chiều phải khác nhau (distinctDk cho hoi-truoc-4so)',
    Boolean(muc4014 && muc3926)
    && muc4014.dieuKien !== muc3926.dieuKien
    && !/;/.test(muc4014.dieuKien)
    && !/;/.test(muc3926.dieuKien)
    && /không thoả định nghĩa cao su tổng hợp/i.test(muc4014.dieuKien)
    && /thoả định nghĩa cao su tổng hợp/i.test(muc3926.dieuKien)
    && !/không thoả/.test(muc3926.dieuKien),
    JSON.stringify({ dk4014: muc4014?.dieuKien, dk3926: muc3926?.dieuKien }));

  const c5_4014 = D.canhTu('4014', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '3926' && /gặm nướu/i.test(e.dieuKien || ''));
  const c5_3926 = D.canhTu('3926', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '4014' && /gặm nướu/i.test(e.dieuKien || ''));
  const giua = D.canhGiuaNhomConSong(['4014', '3926']).filter((e) => (e.loai === 'C5' || e.loai === 'C6') && /gặm nướu/i.test(e.dieuKien || ''));
  kiem('OZV-2099: đồ thị C5/C6 + canhGiuaNhomConSong có cạnh 4014↔3926 (gặm nướu)',
    c5_4014.length >= 1 && c5_3926.length >= 1 && giua.length >= 2,
    JSON.stringify({ c5_4014: c5_4014.length, c5_3926: c5_3926.length, giua: giua.length }));

  const moTa = 'Gặm nướu cho trẻ em / cao su silicone / trẻ mọc răng';
  const pb4014 = H.cauPhanBietNhom('4014', ['4014', '3926'], moTa);
  const pb3926 = H.cauPhanBietNhom('3926', ['3926', '4014'], moTa);
  kiem('OZV-2099 (thuận): cauPhanBietNhom 2 chiều khớp ca 82 gặm nướu / silicone',
    pb4014.length >= 1 && pb3926.length >= 1
    && pb4014.some((q) => q.loai === 'PHAN_BIET_NHOM' && q.canCu === 'so-tay' && /39\.26|40\.14/.test(q.questionVi))
    && pb3926.some((q) => q.loai === 'PHAN_BIET_NHOM' && q.canCu === 'so-tay' && /39\.26|40\.14/.test(q.questionVi)),
    JSON.stringify({ pb4014, pb3926 }));

  const pbNguoc4014 = H.cauPhanBietNhom('4014', ['4014', '3926'], 'bao tránh thai bằng cao su lưu hoá');
  const pbNguoc3926 = H.cauPhanBietNhom('3926', ['3926', '4014'], 'phao cho lưới đánh cá bằng plastic');
  kiem('OZV-2099 (ngược): bao tránh thai / phao lưới đánh cá không hỏi oan 40.14↔39.26',
    pbNguoc4014.length === 0 && pbNguoc3926.length === 0,
    JSON.stringify({ pbNguoc4014, pbNguoc3926 }));
}

// 5. OZV-2116 — ca 172 tầng 4 số: Máy xay bột khô → cạnh loại trừ 2 chiều 84.37 ↔ 84.79
{
  const H = require('../lib/hoi-theo-so-tay.js');
  const { soTayGates, nhomLienQuanSoTay } = require('../lib/so-tay-gates.js');
  const { phanTichHoiTruoc4So, TRANG_THAI_4SO } = require('../lib/do-thi/hoi-truoc-4so.js');
  const st8437 = docJson('data/so-tay/8437.json');
  const st8479 = docJson('data/so-tay/8479.json');
  const muc8437 = (st8437.loaiTru || []).find((x) => x.sangNhom === '8479' && /máy xay bột khô/i.test(x.dieuKien || ''));
  const muc8479 = (st8479.loaiTru || []).find((x) => x.sangNhom === '8437' && /máy xay bột khô/i.test(x.dieuKien || ''));
  kiem('OZV-2116: sổ tay 8437↔8479 có loaiTru 2 chiều + canCuLoaiTru nguyên văn (checkItem đạt)',
    Boolean(muc8437 && muc8479)
    && muc8437.nguon === 'nhom8437.nhom'
    && muc8437.canCuLoaiTru?.nguon === 'nhom8479.nhom'
    && muc8479.nguon === 'nhom8479.nhom'
    && muc8479.canCuLoaiTru?.nguon === 'nhom8437.nhom'
    && checkItem('loaiTru', muc8437, sourcesFor('8437'), '8437') === null
    && checkItem('loaiTru', muc8479, sourcesFor('8479'), '8479') === null,
    JSON.stringify({ muc8437: Boolean(muc8437), muc8479: Boolean(muc8479) }));
  kiem('OZV-2116: dieuKien hai chiều 8437↔8479 tách biệt cho hoi-truoc-4so',
    Boolean(muc8437 && muc8479)
    && muc8437.dieuKien !== muc8479.dieuKien
    && !/;/.test(muc8437.dieuKien)
    && !/;/.test(muc8479.dieuKien),
    JSON.stringify({ dk8437: muc8437?.dieuKien, dk8479: muc8479?.dieuKien }));

  const moTa172 = 'Máy xay bột khô / thép không gỉ / xay bột khô trong công nghiệp chế biến thức ăn cho động vật';
  const c5_8437 = D.canhTu('8437', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8479');
  const c5_8479 = D.canhTu('8479', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8437');
  const giua = D.canhGiuaNhomConSong(['8437', '8479']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mr8437 = D.moRongUngVien(['8437'], moTa172);
  const mr8479 = D.moRongUngVien(['8479'], moTa172);
  kiem('OZV-2116: đồ thị C5/C6 + canhGiuaNhomConSong + moRongUngVien + nhomLienQuanSoTay nối 2 chiều 8437↔8479',
    c5_8437.length >= 1
    && c5_8479.length >= 1
    && giua.length >= 2
    && mr8437.some((x) => x.nhom === '8479')
    && mr8479.some((x) => x.nhom === '8437')
    && nhomLienQuanSoTay('8437').includes('8479')
    && nhomLienQuanSoTay('8479').includes('8437'),
    JSON.stringify({ c5_8437: c5_8437.length, c5_8479: c5_8479.length, giua: giua.length }));

  const pb8437 = H.cauPhanBietNhom('8437', ['8437', '8479'], moTa172);
  const pb8479 = H.cauPhanBietNhom('8479', ['8479', '8437'], moTa172);
  const g8437 = soTayGates({ hs: '84378059', productText: moTa172, productName: 'Máy xay bột khô', candidateHeadings: ['8437', '8479'] });
  const g8479 = soTayGates({ hs: '84798210', productText: moTa172, productName: 'Máy xay bột khô', candidateHeadings: ['8479', '8437'] });
  const ht172 = phanTichHoiTruoc4So({ moTa: moTa172, ungVien: ['8437', '8479'] });
  kiem('OZV-2116 (thuận): cauPhanBietNhom, soTayGates và phanTichHoiTruoc4So hoạt động đúng 2 chiều cho ca 172',
    pb8437.length === 1 && pb8437[0].nguon === 'nhom8437.nhom' && /84\.79/.test(pb8437[0].questionVi)
    && pb8479.length === 1 && pb8479[0].nguon === 'nhom8479.nhom' && /84\.37/.test(pb8479[0].questionVi)
    && (g8437.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '8479')
    && (g8479.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '8437')
    && ht172.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
    && new Set((ht172.nhanh || []).map((n) => n.dieuKien)).size === 2,
    JSON.stringify({ pb8437, pb8479, ht172: ht172.dapAnDieuKien }));

  const pbNguoc8437 = H.cauPhanBietNhom('8437', ['8437', '8479'], 'Máy đánh bóng gạo hoạt động bằng điện');
  const pbNguoc8479 = H.cauPhanBietNhom('8479', ['8479', '8437'], 'Máy làm mát không khí bằng bay hơi');
  const gNguoc8437 = soTayGates({ hs: '84378051', productText: 'Máy đánh bóng gạo hoạt động bằng điện', productName: 'Máy đánh bóng gạo hoạt động bằng điện' });
  const gNguoc8479 = soTayGates({ hs: '84796000', productText: 'Máy làm mát không khí bằng bay hơi', productName: 'Máy làm mát không khí bằng bay hơi' });
  kiem('OZV-2116 (đối chứng): máy đánh bóng gạo / máy làm mát không khí không hỏi oan và không bật oan 84.37↔84.79',
    pbNguoc8437.length === 0
    && pbNguoc8479.length === 0
    && !(gNguoc8437.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '8479')
    && !(gNguoc8479.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '8437'),
    JSON.stringify({ pbNguoc8437, pbNguoc8479 }));
}

// 6. OZV-2125 — ca 189 tầng 4 số: Máy nghiền trục đơn → cạnh loại trừ 2 chiều 84.77 ↔ 84.79
{
  const H = require('../lib/hoi-theo-so-tay.js');
  const { soTayGates, nhomLienQuanSoTay } = require('../lib/so-tay-gates.js');
  const { phanTichHoiTruoc4So, TRANG_THAI_4SO } = require('../lib/do-thi/hoi-truoc-4so.js');
  const st8477 = docJson('data/so-tay/8477.json');
  const st8479 = docJson('data/so-tay/8479.json');
  const muc8477 = (st8477.loaiTru || []).find((x) => x.sangNhom === '8479' && /máy nghiền trục đơn/i.test(x.dieuKien || ''));
  const muc8479 = (st8479.loaiTru || []).find((x) => x.sangNhom === '8477' && /máy nghiền trục đơn/i.test(x.dieuKien || ''));
  kiem('OZV-2125: sổ tay 8477↔8479 có loaiTru 2 chiều + canCuLoaiTru nguyên văn (checkItem đạt)',
    Boolean(muc8477 && muc8479)
    && muc8477.nguon === 'nhom8477.nhom'
    && muc8477.canCuLoaiTru?.nguon === 'nhom8479.nhom'
    && muc8479.nguon === 'nhom8479.nhom'
    && muc8479.canCuLoaiTru?.nguon === 'nhom8477.nhom'
    && checkItem('loaiTru', muc8477, sourcesFor('8477'), '8477') === null
    && checkItem('loaiTru', muc8479, sourcesFor('8479'), '8479') === null,
    JSON.stringify({ muc8477: Boolean(muc8477), muc8479: Boolean(muc8479) }));
  kiem('OZV-2125: dieuKien hai chiều 8477↔8479 tách biệt cho hoi-truoc-4so',
    Boolean(muc8477 && muc8479)
    && muc8477.dieuKien !== muc8479.dieuKien
    && !/;/.test(muc8477.dieuKien)
    && !/;/.test(muc8479.dieuKien),
    JSON.stringify({ dk8477: muc8477?.dieuKien, dk8479: muc8479?.dieuKien }));

  const moTa189 = 'Máy nghiền trục đơn / None / Nghiền nhỏ rác thải/phế liệu công nghiệp';
  const c5_8477 = D.canhTu('8477', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8479');
  const c5_8479 = D.canhTu('8479', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8477');
  const giua = D.canhGiuaNhomConSong(['8477', '8479']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mr8477 = D.moRongUngVien(['8477'], moTa189);
  const mr8479 = D.moRongUngVien(['8479'], moTa189);
  kiem('OZV-2125: đồ thị C5/C6 + canhGiuaNhomConSong + moRongUngVien + nhomLienQuanSoTay nối 2 chiều 8477↔8479',
    c5_8477.length >= 1
    && c5_8479.length >= 1
    && giua.length >= 2
    && mr8477.some((x) => x.nhom === '8479')
    && mr8479.some((x) => x.nhom === '8477')
    && nhomLienQuanSoTay('8477').includes('8479')
    && nhomLienQuanSoTay('8479').includes('8477'),
    JSON.stringify({ c5_8477: c5_8477.length, c5_8479: c5_8479.length, giua: giua.length }));

  const pb8477 = H.cauPhanBietNhom('8477', ['8477', '8479'], moTa189);
  const pb8479 = H.cauPhanBietNhom('8479', ['8479', '8477'], moTa189);
  const g8477 = soTayGates({ hs: '84778039', productText: moTa189, productName: 'Máy nghiền trục đơn', candidateHeadings: ['8477', '8479'] });
  const g8479 = soTayGates({ hs: '84798210', productText: moTa189, productName: 'Máy nghiền trục đơn', candidateHeadings: ['8479', '8477'] });
  const ht189 = phanTichHoiTruoc4So({ moTa: moTa189, ungVien: ['8477', '8479'] });
  kiem('OZV-2125 (thuận): cauPhanBietNhom, soTayGates và phanTichHoiTruoc4So hoạt động đúng 2 chiều cho ca 189',
    pb8477.length === 1 && pb8477[0].nguon === 'nhom8477.nhom' && /84\.79/.test(pb8477[0].questionVi)
    && pb8479.length === 1 && pb8479[0].nguon === 'nhom8479.nhom' && /84\.77/.test(pb8479[0].questionVi)
    && (g8477.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '8479')
    && (g8479.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '8477')
    && ht189.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
    && new Set((ht189.nhanh || []).map((n) => n.dieuKien)).size === 2,
    JSON.stringify({ pb8477, pb8479, ht189: ht189.dapAnDieuKien }));

  const pbNguoc8477 = H.cauPhanBietNhom('8477', ['8477', '8479'], 'Máy đúc phun sản phẩm poly(vinyl chloride) (PVC)');
  const pbNguoc8479 = H.cauPhanBietNhom('8479', ['8479', '8477'], 'Máy làm mát không khí bằng bay hơi');
  const gNguoc8477 = soTayGates({ hs: '84771031', productText: 'Máy đúc phun sản phẩm poly(vinyl chloride) (PVC)', productName: 'Máy đúc phun sản phẩm poly(vinyl chloride) (PVC)' });
  const gNguoc8479 = soTayGates({ hs: '84796000', productText: 'Máy làm mát không khí bằng bay hơi', productName: 'Máy làm mát không khí bằng bay hơi' });
  kiem('OZV-2125 (đối chứng): máy đúc phun PVC / máy làm mát không khí không hỏi oan và không bật oan 84.77↔84.79',
    pbNguoc8477.length === 0
    && pbNguoc8479.length === 0
    && !(gNguoc8477.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '8479')
    && !(gNguoc8479.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '8477'),
    JSON.stringify({ pbNguoc8477, pbNguoc8479 }));
}

// 7. OZV-2137 — ca 113 tầng 4 số: Dây buộc trang trí tóc → cạnh loại trừ 2 chiều 96.15 ↔ 39.26
{
  const H = require('../lib/hoi-theo-so-tay.js');
  const { soTayGates, nhomLienQuanSoTay } = require('../lib/so-tay-gates.js');
  const { phanTichHoiTruoc4So, TRANG_THAI_4SO } = require('../lib/do-thi/hoi-truoc-4so.js');
  const st9615 = docJson('data/so-tay/9615.json');
  const st3926 = docJson('data/so-tay/3926.json');
  const muc9615 = (st9615.loaiTru || []).find((x) => x.sangNhom === '3926' && /dây buộc trang trí tóc/i.test(x.dieuKien || ''));
  const muc3926 = (st3926.loaiTru || []).find((x) => x.sangNhom === '9615' && /dây buộc trang trí tóc/i.test(x.dieuKien || ''));
  kiem('OZV-2137: sổ tay 9615↔3926 có loaiTru 2 chiều + canCuLoaiTru nguyên văn (checkItem đạt)',
    Boolean(muc9615 && muc3926)
    && muc9615.nguon === 'nhom9615.nhom'
    && muc9615.canCuLoaiTru?.nguon === 'nhom3926.nhom'
    && muc3926.nguon === 'ch39.chuong'
    && muc3926.canCuLoaiTru?.nguon === 'nhom9615.nhom'
    && checkItem('loaiTru', muc9615, sourcesFor('9615'), '9615') === null
    && checkItem('loaiTru', muc3926, sourcesFor('3926'), '3926') === null,
    JSON.stringify({ muc9615: Boolean(muc9615), muc3926: Boolean(muc3926) }));
  kiem('OZV-2137: dieuKien hai chiều 9615↔3926 tách biệt cho hoi-truoc-4so',
    Boolean(muc9615 && muc3926)
    && muc9615.dieuKien !== muc3926.dieuKien
    && !/;/.test(muc9615.dieuKien)
    && !/;/.test(muc3926.dieuKien),
    JSON.stringify({ dk9615: muc9615?.dieuKien, dk3926: muc3926?.dieuKien }));

  const moTa113 = 'Dây buộc trang trí tóc / nhựa / trang trí tóc';
  const c5_9615 = D.canhTu('9615', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '3926');
  const c5_3926 = D.canhTu('3926', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '9615');
  const giua = D.canhGiuaNhomConSong(['9615', '3926']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mr9615 = D.moRongUngVien(['9615'], moTa113);
  const mr3926 = D.moRongUngVien(['3926'], moTa113);
  kiem('OZV-2137: đồ thị C5/C6 + canhGiuaNhomConSong + moRongUngVien + nhomLienQuanSoTay nối 2 chiều 9615↔3926',
    c5_9615.length >= 1
    && c5_3926.length >= 1
    && giua.length >= 2
    && mr9615.some((x) => x.nhom === '3926')
    && mr3926.some((x) => x.nhom === '9615')
    && nhomLienQuanSoTay('9615').includes('3926')
    && nhomLienQuanSoTay('3926').includes('9615'),
    JSON.stringify({ c5_9615: c5_9615.length, c5_3926: c5_3926.length, giua: giua.length }));

  const pb9615 = H.cauPhanBietNhom('9615', ['9615', '3926'], moTa113);
  const pb3926 = H.cauPhanBietNhom('3926', ['3926', '9615'], moTa113);
  const g9615 = soTayGates({ hs: '96151130', productText: moTa113, productName: 'Dây buộc trang trí tóc', candidateHeadings: ['9615', '3926'] });
  const g3926 = soTayGates({ hs: '39269099', productText: moTa113, productName: 'Dây buộc trang trí tóc', candidateHeadings: ['3926', '9615'] });
  const ht113 = phanTichHoiTruoc4So({ moTa: moTa113, ungVien: ['9615', '3926'] });
  kiem('OZV-2137 (thuận): cauPhanBietNhom, soTayGates và phanTichHoiTruoc4So hoạt động đúng 2 chiều cho ca 113',
    pb9615.length === 1 && pb9615[0].nguon === 'nhom9615.nhom' && /39\.26/.test(pb9615[0].questionVi)
    && pb3926.length === 1 && pb3926[0].nguon === 'ch39.chuong' && /96\.15/.test(pb3926[0].questionVi)
    && (g9615.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '3926')
    && (g3926.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '9615')
    && ht113.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
    && new Set((ht113.nhanh || []).map((n) => n.dieuKien)).size === 2,
    JSON.stringify({ pb9615, pb3926, ht113: ht113.dapAnDieuKien }));

  const pbNguoc9615 = H.cauPhanBietNhom('9615', ['9615', '3926'], 'Lược chải tóc bằng cao su cứng');
  const pbNguoc3926 = H.cauPhanBietNhom('3926', ['3926', '9615'], 'Phao cho lưới đánh cá bằng plastic');
  const gNguoc9615 = soTayGates({ hs: '96151120', productText: 'Lược chải tóc bằng cao su cứng', productName: 'Lược chải tóc bằng cao su cứng' });
  const gNguoc3926 = soTayGates({ hs: '39269010', productText: 'Phao cho lưới đánh cá bằng plastic', productName: 'Phao cho lưới đánh cá bằng plastic' });
  kiem('OZV-2137 (đối chứng): lược chải tóc cao su cứng / phao lưới đánh cá không hỏi oan và không bật oan 96.15↔39.26',
    pbNguoc9615.length === 0
    && pbNguoc3926.length === 0
    && !(gNguoc9615.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '3926')
    && !(gNguoc3926.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '9615')
    && !D.moRongUngVien(['9615'], 'Lược chải tóc bằng cao su cứng').some((x) => x.nhom === '3926')
    && !D.moRongUngVien(['3926'], 'Phao cho lưới đánh cá bằng plastic').some((x) => x.nhom === '9615'),
    JSON.stringify({ pbNguoc9615, pbNguoc3926 }));
}

xong();
