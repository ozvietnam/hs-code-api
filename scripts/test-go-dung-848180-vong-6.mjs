#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * Gỡ DỪNG 848180 (#577, lát 1) — năm lý do của PR #700/#701:
 *   1. .97 "đã được xử lý bề mặt"  ⇒ khoá tu-vung@2 daXuLyBeMat (CO_KHONG).
 *   2. .30 "các bếp nấu hoặc bếp có lò nướng bằng ga" ⇒ dungCho [..] + khoá tu-vung@2 nhienLieu [GA] (định ngữ chung).
 *   3. .93 "bằng vật liệu khác" ⇒ chatLieu PHAI_KHONG "plastic", bằng chứng = chữ của anh em đứng trước cùng tên
 *      (lib/so-tay.js#vatLieuKhacTheoAnhEm — máy kiểm sổ tay, cổng 3 và apDung dùng chung); cổng 5 neo vế "vật liệu khác".
 *   4. Trục thứ ba DAC_DIEM của chongLanTruc (khoá CO_KHONG / LIET_KE — 8481805 coKhoangPhaTron, r14573 cachDieuKhien), cùng nghĩa
 *      hai trục cũ ở cổng (lib/ho-so/cong-ranh-gioi.js) và lúc chạy (lib/ho-so/duong-di.js; doi-chieu.js so trục bằng nhau).
 *   5. .71/.72 dưới r14563 "Van bi" không tới được: "Van bi" toàn ASCII ⇒ bộ so chữ coi là chữ Anh, so với tên có dấu của anh em
 *      luôn CHUA_BIET ⇒ cổng thêm ứng viên vector "<giá trị> ẑẑẑ" (bangUngVien); bộ so chữ lúc chạy không đổi.
 * Spec ĐÔNG CỨNG (scripts/fixtures/ho-so/spec-vong-6/848180.json); cổng 2 đủ của 848180 chạy ~15 phút nên test chạy cổng 0/1/3/5
 * + các phần cổng 2 cụ thể; kết quả --kiem đủ ghi ở PR. Không ghi data/, không đọc data/bench, data/oz-export; không LLM/mạng.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const C = require('../lib/ho-so/cong-ranh-gioi.js');
const DK = require('../lib/dieu-kien-so.js');
const S = require('../lib/so-tay.js');
const D = require('../lib/ho-so/duong-di.js');
const HS = require('../lib/ho-so/index.js');
const { doiChieu } = require('../lib/ho-so/doi-chieu.js');
const { loadSoTay } = require('../lib/so-tay-gates.js');

let pass = 0; let fail = 0;
const check = (n, c, d) => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n}`, d === undefined ? '' : JSON.stringify(d).slice(0, 900)); } };
const clone = (x) => JSON.parse(JSON.stringify(x));
const spec = JSON.parse(fs.readFileSync('scripts/fixtures/ho-so/spec-vong-6/848180.json', 'utf8'));
const a = C.apSpec(spec, null, { ngay: '2026-10-31' });
const b = a.banNhap;
const dk8 = (hs) => b?.dong8.find((m) => m.hs === hs)?.dieuKienSo || [];

// ── 0. Spec theo luật thợ ─────────────────────────────────────────────────────────────────────────────────────────────
check('0a apSpec không lỗi, không DỪNG', a.loi.length === 0 && a.dung.length === 0 && Boolean(b), { loi: a.loi, dung: a.dung });
check('0b spec: không nguonLoai/trangThai/duyet, mọi chongLanTruc phanXu null, không chongLanVanBan, không ghi chú DUNG/DE_TRONG/THIEU_KHOA',
  !['nguonLoai', 'trangThai', 'duyet', 'chongLanVanBan'].some((k) => k in spec) && spec.chongLanTruc.every((x) => x.phanXu === null)
  && !spec.ghiChuSoan.some((g) => ['DUNG', 'DE_TRONG', 'THIEU_KHOA_TU_VUNG'].includes(g.loai)));

// ── 1. .97 daXuLyBeMat ────────────────────────────────────────────────────────────────────────────────────────────────
{
  const d = dk8('84818097'); const h = d.find((c) => c.op === 'HOAC');
  check('1a .97 = cachDieuKhien [BANG_TAY] + khoiLuong < 3 kg + HOAC [[daXuLyBeMat CO], [chatLieu ["thép không gỉ","niken"]]]',
    d.some((c) => c.fact === 'cachDieuKhien' && JSON.stringify(c.value) === '["BANG_TAY"]') && d.some((c) => c.fact === 'khoiLuong' && c.op === '<' && c.value === 3 && c.donVi === 'kg')
    && h && JSON.stringify(h.phuongAn[0]) === JSON.stringify([{ fact: 'daXuLyBeMat', op: 'CO' }]) && JSON.stringify(h.phuongAn[1][0].value) === '["thép không gỉ","niken"]', d);
}
// ── 2. .30 nhienLieu ──────────────────────────────────────────────────────────────────────────────────────────────────
{
  const d = dk8('84818030');
  check('2a .30 = dungCho ["các bếp nấu","bếp có lò nướng"] + nhienLieu [GA] (định ngữ chung "bằng ga" thành điều kiện riêng)',
    d.length === 2 && d.some((c) => c.fact === 'dungCho' && JSON.stringify(c.value) === '["các bếp nấu","bếp có lò nướng"]') && d.some((c) => c.fact === 'nhienLieu' && JSON.stringify(c.value) === '["GA"]'), d);
}
// ── 3. .93 "bằng vật liệu khác" ───────────────────────────────────────────────────────────────────────────────────────
{
  const d = dk8('84818093');
  check('3a .93 = tenLoai "Van ngắt nhiên liệu" + chatLieu PHAI_KHONG "plastic" + dungCho "xe thuộc nhóm 87.02, 87.03 hoặc 87.04", phanConLai false',
    d.some((c) => c.fact === 'chatLieu' && c.chieu === 'PHAI_KHONG' && c.value === 'plastic') && d.some((c) => c.fact === 'tenLoai' && c.value === 'Van ngắt nhiên liệu')
    && b.dong8.find((m) => m.hs === '84818093').phanConLai === false, d);
  const src = S.sourcesFor('8481');
  const muc = (hs, ds, s = src) => S.checkItem('dong8', { hs, nguon: `tax.${hs}`, trich: s[`tax.${hs}`], dieuKienSo: ds }, s, '8481');
  const PK = (v) => ({ fact: 'chatLieu', op: 'LA', chieu: 'PHAI_KHONG', value: v });
  check('3b máy kiểm sổ tay: .93 chatLieu PHAI_KHONG "plastic" ⇒ đạt (chữ "plastic" ở anh em đứng trước .83/.84 cùng tên)', muc('84818093', [PK('plastic')]) === null, muc('84818093', [PK('plastic')]));
  check('3c … PHAI_KHONG "đồng" (không anh em đứng trước nào bằng đồng) ⇒ lỗi', String(muc('84818093', [PK('đồng')])).startsWith('dieu-kien-so-la-khong-co-trong-trich:đồng'));
  check('3d … PHAI_CO "plastic" trên .93 ⇒ lỗi (luật chỉ cho chiều PHAI_KHONG)', String(muc('84818093', [{ fact: 'chatLieu', op: 'LA', value: 'plastic' }])).startsWith('dieu-kien-so-la-khong-co-trong-trich:plastic'));
  check('3e … dòng không có chữ "vật liệu khác" (.94 "Có đường kính trong cửa nạp dưới 1 cm") ⇒ lỗi', String(muc('84818094', [PK('plastic')])).startsWith('dieu-kien-so-la-khong-co-trong-trich:plastic'));
  check('3f … .12 "Bằng vật liệu khác" PHAI_KHONG "đồng" (anh em .11 "Bằng đồng…") đạt; PHAI_KHONG "plastic" lỗi', muc('84818012', [PK('đồng')]) === null && String(muc('84818012', [PK('plastic')])).startsWith('dieu-kien-so-la-khong-co-trong-trich'));
  const lech = { ...src, 'tax.84818083': '84818083 - - - Van cửa xả bằng plastic', 'tax.84818084': '84818084 - - - Van cửa xả bằng plastic' };
  check('3g … anh em có "plastic" nhưng KHÁC tên hàng (phần chữ trước "vật liệu khác") ⇒ lỗi', String(muc('84818093', [PK('plastic')], lech)).startsWith('dieu-kien-so-la-khong-co-trong-trich'), muc('84818093', [PK('plastic')], lech));
  const v = C.phanTichVe('848180', b).chiTiet.find((x) => x.ma === '84818093');
  const ve = v.ve.flatMap((x) => x.menhDe).find((x) => /vật liệu khác/.test(x.chu));
  check('3h cổng 5: vế "bằng vật liệu khác" của .93 được PHỦ (neo của chatLieu PHAI_KHONG)', ve?.trangThai === 'PHU', v.ve);
  // Lúc chạy: van ngắt nhiên liệu plastic cửa nạp trên 2,5 cm ⇒ .96 (r14579 "Van plastic khác"), KHÔNG .93.
  const soTay = C.soTayTuNhap('848180', b);
  const duKien = (o) => Object.entries(o).map(([fact, giaTri]) => ({ fact, giaTri, ...(fact === 'duongKinhTrong' ? { donVi: 'mm' } : {}), ...(fact === 'khoiLuong' ? { donVi: 'kg' } : {}), nguon: 'KHACH', trangThai: 'DA_CO' }));
  const CHUNG = { dungCho: 'xe thuộc nhóm 87.03', coKhoangPhaTron: false, cachDieuKhien: 'DIEN_TU', nhienLieu: 'DIEN' };
  const coDong = (o) => b.dong8.map((m) => m.hs).filter((hs) => DK.doiChieuDong8(hs, duKien(o), { soTay }).ketQua === 'CO');
  check('3i lúc chạy: van ngắt nhiên liệu bằng nhôm cho xe 87.03 ⇒ chỉ .93', JSON.stringify(coDong({ ...CHUNG, tenLoai: 'Van ngắt nhiên liệu', chatLieu: [{ viTri: 'CHINH', chatLieu: 'nhôm' }], duongKinhTrong: 30 })) === '["84818093"]', coDong({ ...CHUNG, tenLoai: 'Van ngắt nhiên liệu', chatLieu: [{ viTri: 'CHINH', chatLieu: 'nhôm' }], duongKinhTrong: 30 }));
  check('3j … bằng plastic, cửa nạp 30 mm ⇒ chỉ .96 (không rơi nhầm .93 như phanConLai [.83,.84])', JSON.stringify(coDong({ ...CHUNG, tenLoai: 'Van ngắt nhiên liệu', chatLieu: [{ viTri: 'CHINH', chatLieu: 'plastic' }], duongKinhTrong: 30 })) === '["84818096"]', coDong({ ...CHUNG, tenLoai: 'Van ngắt nhiên liệu', chatLieu: [{ viTri: 'CHINH', chatLieu: 'plastic' }], duongKinhTrong: 30 }));
  check('3k … bằng plastic, cửa nạp 5 mm ⇒ chỉ .83', JSON.stringify(coDong({ ...CHUNG, tenLoai: 'Van ngắt nhiên liệu', chatLieu: [{ viTri: 'CHINH', chatLieu: 'plastic' }], duongKinhTrong: 5 })) === '["84818083"]');
  check('3l .30: van bếp có lò nướng bằng ga ⇒ .30; van bếp điện ⇒ không .30', coDong({ tenLoai: 'Van', dungCho: 'bếp có lò nướng', nhienLieu: 'GA', coKhoangPhaTron: false }).includes('84818030') && !coDong({ tenLoai: 'Van', dungCho: 'bếp có lò nướng', nhienLieu: 'DIEN', coKhoangPhaTron: false }).includes('84818030'));
  check('3m .97: van đồng tay vặn 1 kg đã xử lý bề mặt ⇒ .97; chưa xử lý bề mặt, bằng đồng ⇒ không .97',
    coDong({ tenLoai: 'Van chặn', cachDieuKhien: 'BANG_TAY', khoiLuong: 1, daXuLyBeMat: true, chatLieu: [{ viTri: 'CHINH', chatLieu: 'đồng' }], coKhoangPhaTron: false, dungCho: 'máy nén' }).includes('84818097')
    && !coDong({ tenLoai: 'Van chặn', cachDieuKhien: 'BANG_TAY', khoiLuong: 1, daXuLyBeMat: false, chatLieu: [{ viTri: 'CHINH', chatLieu: 'đồng' }], coKhoangPhaTron: false, dungCho: 'máy nén' }).includes('84818097'));
}

// ── 4. Trục DAC_DIEM ──────────────────────────────────────────────────────────────────────────────────────────────────
{
  const r = C.kiemRanhGioi('848180', b, { cong: [0, 1, 3, 5] });
  check('4a cổng 0/1/3/5 XANH, không DỪNG (hết THIEU_KHOA .97, DUNG .93, DUNG 8481805)', r.hopLe === true && r.dung.length === 0, { loi: r.loi, dung: r.dung });
  check('4b hai cụm chongLanTruc: tầng 848180 (9 nhánh, 8481805 DAC_DIEM) và tầng r14562 (r14573 DAC_DIEM ↔ 5 nhánh tên)',
    spec.chongLanTruc.length === 2 && spec.chongLanTruc[0].truc['8481805'] === 'DAC_DIEM' && spec.chongLanTruc[0].nhanh.length === 9 && spec.chongLanTruc[1].truc['848180~r14573'] === 'DAC_DIEM' && spec.chongLanTruc[1].nhanh.length === 6);
  const sai = (f) => { const x = clone(b); f(x); return C.kiemRanhGioi('848180', x, { cong: [0, 3] }).loi; };
  check('4c DAC_DIEM khai cho nhánh chỉ có khoá tên (r14551) ⇒ cong3-chong-lan-truc-truc-lech', sai((x) => { x.chongLanTruc[0].truc['848180~r14551'] = 'DAC_DIEM'; }).includes('cong3-chong-lan-truc-truc-lech:0:848180~r14551'));
  check('4d TEN_LOAI khai cho 8481805 (chỉ có coKhoangPhaTron) ⇒ cong3-chong-lan-truc-truc-lech', sai((x) => { x.chongLanTruc[0].truc['8481805'] = 'TEN_LOAI'; }).includes('cong3-chong-lan-truc-truc-lech:0:8481805'));
  check('4e trục lạ "CO_KHONG" ⇒ cong0-chong-lan-truc-truc', sai((x) => { x.chongLanTruc[0].truc['8481805'] = 'CO_KHONG'; }).includes('cong0-chong-lan-truc-truc:0:8481805'));
  check('4f DAC_DIEM nhận khoá LIET_KE (r14573 cachDieuKhien KHI_NEN) — không lệch trục', !sai(() => {}).some((l) => l.includes('truc-lech')));
}

// ── 5. .71/.72 tới được: ứng viên "Van bi ẑẑẑ" ────────────────────────────────────────────────────────────────────────
{
  const soTay = C.soTayTuNhap('848180', b);
  const bang = C.bangUngVien(soTay);
  const ten = (bang.get('tenLoai') || []).map((x) => x.giaTri);
  check('5a bangUngVien: "Van bi" (toàn ASCII) có thêm ứng viên "Van bi ẑẑẑ"; giá trị có dấu không thêm', ten.includes('Van bi') && ten.includes('Van bi ẑẑẑ') && !ten.includes('Van nhiều cửa ẑẑẑ'), ten);
  const F = (g) => [{ fact: 'tenLoai', giaTri: g }, { fact: 'chatLieu', giaTri: [{ viTri: 'CHINH', chatLieu: 'plastic' }] }, { fact: 'duongKinhTrong', giaTri: 20, donVi: 'mm' },
    { fact: 'coKhoangPhaTron', giaTri: false }, { fact: 'dungCho', giaTri: 'ẑẑẑ' }, { fact: 'cachDieuKhien', giaTri: 'BANG_TAY' }].map((x) => ({ ...x, nguon: 'KHACH', trangThai: 'DA_CO' }));
  check('5b nguyên nhân: vector tenLoai "Van bi" ⇒ .71 THIEU (PHAI_KHONG r14551 "Van đường ống nước" chưa biết — so ASCII ↔ có dấu)', DK.doiChieuDong8('84818071', F('Van bi'), { soTay }).ketQua !== 'CO');
  check('5c vector "Van bi ẑẑẑ" ⇒ .71 CO (dòng tới được)', DK.doiChieuDong8('84818071', F('Van bi ẑẑẑ'), { soTay }).ketQua === 'CO');
}

// ── 6. Lúc chạy: trục DAC_DIEM — hàng thoả hai nhánh khác trục ⇒ không tự chọn ───────────────────────────────────────────
{
  // Sổ tay TIÊM: mục 848180 từ bản nháp đông cứng, nhãn CLAUDE_DUYET + dấu chongLanTruc như apDung (apDung đòi đủ cổng 2 ~15 phút).
  const st = clone(loadSoTay('8481'));
  const tu = C.soTayTuNhap('848180', b);
  const duyet = (m) => ({ ...m, nguonLoai: 'CLAUDE_DUYET' });
  st.dong8 = [...(st.dong8 || []).filter((m) => !String(m.hs).startsWith('848180')), ...tu.dong8.map(duyet)];
  st.dieuKienNut = [...(st.dieuKienNut || []).filter((m) => !String(m.id).startsWith('848180')), ...tu.dieuKienNut.map(duyet)];
  for (const x of spec.chongLanTruc) {
    for (const id of x.nhanh) {
      const m = st.dong8.find((y) => y.hs === id) || st.dieuKienNut.find((y) => y.id === id);
      if (m) m.chongLanTruc = { pn6: '848180', nhanh: x.nhanh, truc: x.truc, cauHoiPhanBiet: x.cauHoiPhanBiet, trich: x.trich, phanXu: null };
    }
  }
  const dk = (fact, giaTri, donVi) => ({ fact, giaTri, ...(donVi ? { donVi } : {}), nguon: 'KHACH', trangThai: 'DA_CO', bangChung: String(Array.isArray(giaTri) ? giaTri.map((x) => x.chatLieu).join(',') : giaTri) });
  const hoSo = async (ma, duKien) => {
    const dd = D.dungDuongDi(ma, 'NHAP', { soTay: st, bangHieuChinh: { muc: [] } });
    return { dd, h: await doiChieu(HS.khungHoSo(dd, { duKien }), { soTay: st, bangHieuChinh: { muc: [] }, tinHieuDanhMuc: async () => [], tienLeMaKhac: async () => [], demKhoOz: async () => ({ tong: 0, maKhac: [] }) }) };
  };
  const { dd, h } = await hoSo('84818059', [dk('tenLoai', 'Van đường ống nước'), dk('coKhoangPhaTron', true), dk('chatLieu', [{ viTri: 'CHINH', chatLieu: 'đồng' }]), dk('duongKinhTrong', 20, 'mm')]);
  check('6a dungDuongDi 84818059 mang cụm chongLanTruc (nhánh của mã 8481805, trục DAC_DIEM)', (dd.chongLanTruc || []).some((c) => c.nhanhCuaMa === '8481805' && c.truc['8481805'] === 'DAC_DIEM'), dd.chongLanTruc);
  check('6b van trộn lắp đường ống nước (thoả 8481805 lẫn r14551) ⇒ KHÔNG chốt: CAN_CHUYEN_GIA, chong-lan-truc:848180~r14551', h.ketLuan.trangThai === 'CAN_CHUYEN_GIA' && h.ketLuan.chuaChot.includes('chong-lan-truc:848180~r14551'), h.ketLuan);
  const q = h.ketLuan.cauHoi.find((x) => x.loai === 'PHAN_BIET_CHONG_LAN_TRUC');
  check('6c … câu hỏi PHAN_BIET_CHONG_LAN_TRUC mang cauHoiPhanBiet của cụm', q && q.vi === spec.chongLanTruc[0].cauHoiPhanBiet, q);
  check('6d … không trích GIR nào cho nhánh trong cụm, không nhãn GIR 3(a)', !(h.canCu?.girRulesApplied || []).some((g) => (g.evidence?.ranhGioi || []).some((x) => String(x.nut).startsWith('8481805'))) && !/GIR[-\s]?3\s?\(?a/i.test(JSON.stringify(h)));
  const { h: h2 } = await hoSo('84818082', [dk('tenLoai', 'Van bi'), dk('cachDieuKhien', 'KHI_NEN'), dk('coKhoangPhaTron', false), dk('chatLieu', [{ viTri: 'CHINH', chatLieu: 'thép không gỉ' }]), dk('duongKinhTrong', 50, 'mm'), dk('dungCho', 'đường ống hơi')]);
  check('6e van bi điều khiển bằng khí nén (thoả r14573 lẫn r14563) ⇒ KHÔNG chốt, chong-lan-truc:848180~r14563', h2.ketLuan.trangThai === 'CAN_CHUYEN_GIA' && h2.ketLuan.chuaChot.includes('chong-lan-truc:848180~r14563'), h2.ketLuan);
}

// ── 7. OZV-2091: cạnh loại trừ 2 chiều 84.21 <-> 84.81 cho câu thực địa "bộ lọc điều áp khí nén, model ar3000-03..." ──
{
  const H = require('../lib/hoi-theo-so-tay.js');
  const moTa = 'bộ lọc điều áp khí nén, model ar3000-03, kt (90*53*53)mm, bằng hợp kim nhôm, mới 100%';
  const st8421 = loadSoTay('8421');
  const st8481 = loadSoTay('8481');
  const src8421 = S.sourcesFor('8421');
  const src8481 = S.sourcesFor('8481');
  const lt8421 = (st8421?.loaiTru || []).find((x) => x.sangNhom === '8481');
  const lt8481 = (st8481?.loaiTru || []).find((x) => x.sangNhom === '8421');
  check('7a sổ tay 8421 và 8481 có mục loaiTru 2 chiều 8421 <-> 8481 kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(lt8421 && lt8421.canCuLoaiTru?.nguon === 'nhom8481.nhom' && S.checkItem('loaiTru', lt8421, src8421, '8421') === null)
    && Boolean(lt8481 && lt8481.canCuLoaiTru?.nguon === 'nhom8421.nhom' && S.checkItem('loaiTru', lt8481, src8481, '8481') === null),
    { lt8421, lt8481 });

  const pb8481 = H.cauPhanBietNhom('8481', ['8481', '8421'], moTa);
  check('7b chiều thuận 8481 đứng đầu với [8481, 8421]: sinh câu PHAN_BIET_NHOM từ nhom8481.nhom trỏ sang 84.21',
    pb8481.length === 1 && pb8481[0].loai === 'PHAN_BIET_NHOM' && pb8481[0].canCu === 'so-tay'
    && pb8481[0].nguon === 'nhom8481.nhom' && /84\.21/.test(pb8481[0].questionVi) && /84\.81/.test(pb8481[0].questionVi),
    pb8481);

  const pb8421 = H.cauPhanBietNhom('8421', ['8421', '8481'], moTa);
  check('7c chiều thuận 8421 đứng đầu với [8421, 8481]: sinh câu PHAN_BIET_NHOM từ nhom8421.nhom trỏ sang 84.81',
    pb8421.length === 1 && pb8421[0].loai === 'PHAN_BIET_NHOM' && pb8421[0].canCu === 'so-tay'
    && pb8421[0].nguon === 'nhom8421.nhom' && /84\.81/.test(pb8421[0].questionVi) && /84\.21/.test(pb8421[0].questionVi),
    pb8421);

  const nguocLyTam8421 = H.cauPhanBietNhom('8421', ['8421', '8481'], 'máy vắt ly tâm quần áo');
  const nguocLyTam8481 = H.cauPhanBietNhom('8481', ['8481', '8421'], 'máy vắt ly tâm quần áo');
  const nguocVoiNuoc8421 = H.cauPhanBietNhom('8421', ['8421', '8481'], 'vòi nước bồn rửa tay bằng đồng');
  const nguocVoiNuoc8481 = H.cauPhanBietNhom('8481', ['8481', '8421'], 'vòi nước bồn rửa tay bằng đồng');
  check('7d ca đối chứng: "máy vắt ly tâm quần áo" và "vòi nước bồn rửa tay bằng đồng" không hỏi oan 84.21 <-> 84.81',
    nguocLyTam8421.length === 0 && nguocLyTam8481.length === 0 && nguocVoiNuoc8421.length === 0 && nguocVoiNuoc8481.length === 0,
    { nguocLyTam8421, nguocLyTam8481, nguocVoiNuoc8421, nguocVoiNuoc8481 });
}

// ── 8. OZV-2104 — ca 26 tầng 4 số: bát sen tắm nhựa ABS → cạnh loại trừ 2 chiều 39.24 ↔ 84.81 ──────────────────────────
{
  const DT = require('../lib/do-thi/index.js');
  const H = require('../lib/hoi-theo-so-tay.js');
  // Ca 26 gốc "Bát sen tắm nhỏ / nhựa ABS / None" thiếu bigram "tắm tay" của dieuKien → khopPhanBiet bỏ;
  // thêm "tay sen" (đúng chữ điều kiện) để đo đường hỏi phân biệt, vẫn giữ nhãn ca 26.
  const moTa = 'Bát sen tắm tay sen nhỏ / nhựa ABS / None';
  const st3924 = loadSoTay('3924');
  const st8481 = loadSoTay('8481');
  const src3924 = S.sourcesFor('3924');
  const src8481 = S.sourcesFor('8481');
  const lt3924 = (st3924?.loaiTru || []).find((x) => x.sangNhom === '8481' && /Bát sen/i.test(x.dieuKien || ''));
  const lt8481 = (st8481?.loaiTru || []).find((x) => x.sangNhom === '3924' && /Bát sen/i.test(x.dieuKien || ''));
  check('8a sổ tay 3924↔8481 có loaiTru 2 chiều + canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(lt3924 && lt3924.canCuLoaiTru?.nguon === 'nhom8481.nhom' && S.checkItem('loaiTru', lt3924, src3924, '3924') === null)
    && Boolean(lt8481 && lt8481.canCuLoaiTru?.nguon === 'nhom3924.nhom' && S.checkItem('loaiTru', lt8481, src8481, '8481') === null),
    { lt3924: Boolean(lt3924), lt8481: Boolean(lt8481), e3924: lt3924 && S.checkItem('loaiTru', lt3924, src3924, '3924'), e8481: lt8481 && S.checkItem('loaiTru', lt8481, src8481, '8481') });

  const c5_3924 = DT.canhTu('3924', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8481' && /Bát sen/i.test(e.dieuKien || ''));
  const c5_8481 = DT.canhTu('8481', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '3924' && /Bát sen/i.test(e.dieuKien || ''));
  const giua = DT.canhGiuaNhomConSong(['3924', '8481']).filter((e) => (e.loai === 'C5' || e.loai === 'C6') && /Bát sen/i.test(e.dieuKien || ''));
  check('8b đồ thị C5/C6 + canhGiuaNhomConSong có ≥2 cạnh 3924↔8481 (bát sen)',
    c5_3924.length >= 1 && c5_8481.length >= 1 && giua.length >= 2,
    { c5_3924: c5_3924.length, c5_8481: c5_8481.length, giua: giua.length });

  const pb3924 = H.cauPhanBietNhom('3924', ['3924', '8481'], moTa);
  const pb8481 = H.cauPhanBietNhom('8481', ['8481', '3924'], moTa);
  check('8c (thuận) cauPhanBietNhom 2 chiều khớp ca 26 bát sen nhựa ABS',
    pb3924.length >= 1 && pb8481.length >= 1
    && pb3924.some((q) => q.loai === 'PHAN_BIET_NHOM' && q.canCu === 'so-tay' && /39\.24|84\.81/.test(q.questionVi))
    && pb8481.some((q) => q.loai === 'PHAN_BIET_NHOM' && q.canCu === 'so-tay' && /39\.24|84\.81/.test(q.questionVi)),
    { pb3924, pb8481 });

  const pbNguoc3924 = H.cauPhanBietNhom('3924', ['3924', '8481'], 'cốc nhựa không quai dùng bàn ăn');
  const pbNguoc8481 = H.cauPhanBietNhom('8481', ['8481', '3924'], 'van bi đường ống hơi bằng thép');
  check('8d (ngược) cốc bàn ăn / van bi đường ống không hỏi oan 39.24↔84.81',
    pbNguoc3924.length === 0 && pbNguoc8481.length === 0,
    { pbNguoc3924, pbNguoc8481 });
}

// ── 9. OZV-2110 — ca 156 tầng 4 số: Chỉ thêu sợi filament tổng hợp → cạnh loại trừ 2 chiều 54.01 ↔ 54.06 ──────────────
{
  const DT = require('../lib/do-thi/index.js');
  const H = require('../lib/hoi-theo-so-tay.js');
  // Ca 156 gốc "Chỉ thêu sợi filament tổng hợp / sợi filament tổng hợp / thêu" khớp chiều 5401→5406 ("chỉ thêu")
  // nhưng thiếu "chỉ khâu" của dieuKien chiều 5406→5401 → khopPhanBiet bỏ; thêm "chỉ khâu" để đo 2 chiều.
  const moTa = 'Chỉ thêu sợi filament tổng hợp chỉ khâu / sợi filament tổng hợp / thêu';
  const st5401 = loadSoTay('5401');
  const st5406 = loadSoTay('5406');
  const src5401 = S.sourcesFor('5401');
  const src5406 = S.sourcesFor('5406');
  const lt5401 = (st5401?.loaiTru || []).find((x) => x.sangNhom === '5406' && /chỉ thêu/i.test(x.dieuKien || ''));
  const lt5406 = (st5406?.loaiTru || []).find((x) => x.sangNhom === '5401' && /Chỉ khâu/i.test(x.dieuKien || ''));
  check('9a sổ tay 5401↔5406 có loaiTru 2 chiều + canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(lt5401 && lt5401.canCuLoaiTru?.nguon === 'nhom5406.nhom' && S.checkItem('loaiTru', lt5401, src5401, '5401') === null)
    && Boolean(lt5406 && lt5406.canCuLoaiTru?.nguon === 'nhom5401.nhom' && S.checkItem('loaiTru', lt5406, src5406, '5406') === null),
    { lt5401: Boolean(lt5401), lt5406: Boolean(lt5406), e5401: lt5401 && S.checkItem('loaiTru', lt5401, src5401, '5401'), e5406: lt5406 && S.checkItem('loaiTru', lt5406, src5406, '5406') });

  const c5_5401 = DT.canhTu('5401', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '5406' && /chỉ thêu/i.test(e.dieuKien || ''));
  const c5_5406 = DT.canhTu('5406', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '5401' && /Chỉ khâu/i.test(e.dieuKien || ''));
  const giua = DT.canhGiuaNhomConSong(['5401', '5406']).filter((e) => (e.loai === 'C5' || e.loai === 'C6') && (/chỉ thêu|Chỉ khâu/i.test(e.dieuKien || '')));
  check('9b đồ thị C5/C6 + canhGiuaNhomConSong có ≥2 cạnh 5401↔5406 (chỉ thêu / chỉ khâu)',
    c5_5401.length >= 1 && c5_5406.length >= 1 && giua.length >= 2,
    { c5_5401: c5_5401.length, c5_5406: c5_5406.length, giua: giua.length });

  const pb5401 = H.cauPhanBietNhom('5401', ['5401', '5406'], moTa);
  const pb5406 = H.cauPhanBietNhom('5406', ['5406', '5401'], moTa);
  check('9c (thuận) cauPhanBietNhom 2 chiều khớp ca 156 chỉ thêu filament tổng hợp',
    pb5401.length >= 1 && pb5406.length >= 1
    && pb5401.some((q) => q.loai === 'PHAN_BIET_NHOM' && q.canCu === 'so-tay' && /54\.01|54\.06/.test(q.questionVi))
    && pb5406.some((q) => q.loai === 'PHAN_BIET_NHOM' && q.canCu === 'so-tay' && /54\.01|54\.06/.test(q.questionVi)),
    { pb5401, pb5406 });

  const pbNguoc5401 = H.cauPhanBietNhom('5401', ['5401', '5406'], 'vải cotton trắng dùng may áo');
  const pbNguoc5406 = H.cauPhanBietNhom('5406', ['5406', '5401'], 'van bi đường ống hơi bằng thép');
  check('9d (ngược) vải cotton / van bi đường ống không hỏi oan 54.01↔54.06',
    pbNguoc5401.length === 0 && pbNguoc5406.length === 0,
    { pbNguoc5401, pbNguoc5406 });
}

console.log(`\n${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
