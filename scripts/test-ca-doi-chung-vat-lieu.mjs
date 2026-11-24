#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * OZV-548 vòng hai (TRẢ THỢ PR #1255) — cổng chấm bộ 36 ca đối chứng VẬT LIỆU phải chặt theo HÀNH VI,
 * không chỉ theo "không chốt sai" (quy tắc 5 OZV-290: bản vá rỗng cũng phải ra số khác).
 *
 * OZV-581 (GĐ cập nhật kỳ vọng, PR #1263 — T3 của OZV-540 PA-3) — cổng này khoá số SAU khi vá T3:
 * máy thật đạt DAT 36 · ĐỎ 0 (đỏ duy nhất `8546-008` = "composite" ĐÃ hết đỏ vì T3 đọc được vật liệu
 * tổng hợp/composite và nhóm 8546 đã khai vế ⇒ 85469000).
 * Số cũ (DAT 35 · ĐỎ 1 = 8546-008) là số TRƯỚC T3 ⇒ 3 kỳ vọng B1/B2/G3 đã đổi theo bảng GĐ đo
 * 2 chiều trên 2 worktree sạch (nền `origin/main` 781c3789 vs head PR #1263): kỳ vọng MỚI đều ĐỎ
 * trên nền (rút bản vá T3 ⇒ đỏ trở lại), nên cổng là KHOÁ HỒI QUY, không phải nới thước.
 * Lịch sử: OZV-558 vòng bốn (GĐ ngoại lệ có kiểm chứng, PR #1261) khoá số SAU khi vá T2:
 * DAT 35 · ĐỎ 1; số cũ (DAT 32 · ĐỎ 4 = 8546-005..008) là số TRƯỚC khi vá ⇒ 4 kỳ vọng B1/B2/D2/G3
 * đã đổi theo bảng GĐ đo 2 chiều trên 2 worktree sạch: mọi kỳ vọng MỚI đều ĐỎ trên nền
 * `origin/main` (rút bản vá ⇒ đỏ), nên cổng là KHOÁ HỒI QUY, không phải nới thước.
 *
 * Lỗi cũ mà GĐ bắt: nhánh DUNG_VAT_LIEU chấm DAT cả khi máy MẤT CHỐT (chotVao=null) ⇒ một "T2" chỉ cần
 * khiến máy ngừng chốt mọi ca (CHOT → KHONG_THE_CHOT) vẫn ra 0 đỏ + 0 đổi hành vi — bẫy bản-vá-rỗng-cũng-xanh.
 * Cổng siết theo 3 quy tắc GĐ chỉ định:
 *   Q1 TRAI/DUNG có coSo.ketQua=CHOT (hoặc LOAI_KHAC) mà mất chốt ⇒ DOI_HANH_VI (T2 kỳ vọng chốt ĐÚNG
 *      dòng vật liệu, không phải "không chốt nữa").
 *   Q2 máy từ chối mà deXuat lệch phân nhóm 6 số đúng (hs8Dung) ⇒ DO.
 *   Q3 KHONG_NEU_VAT_LIEU giữ nguyên tiêu chí so coSo (không đụng).
 *
 * Test tiêm máy giả (stub) vào chayCaDoiChungVatLieu(dsNhom4, chot) — tham số chot chỉ thêm cho test,
 * đường chạy thật vẫn dùng chotDong8 mặc định — để đo TRỰC TIẾP hành vi của cổng trên các kịch bản:
 * máy thật (đỏ đúng chỗ), máy ngừng chốt hoàn toàn (cạm bẫy cũ phải sập), T2 vá đúng 1 ca (đỏ giảm),
 * deXuat lệch/đúng pn6 (Q2), máy ném lỗi (NEM_LOI).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const { chotDong8 } = require('../lib/so-tay-gates.js');
const { chayCaDoiChungVatLieu } = await import('./bo-kiem-luat.mjs');

let passed = 0;
let failed = 0;
const check = (name, ok, extra) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok || extra === undefined ? '' : ` ${JSON.stringify(extra).slice(0, 400)}`}`);
  if (ok) passed += 1;
  else failed += 1;
};

const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'ca-doi-chung-vat-lieu-8546-8547.json'), 'utf8')).ca;
const taxRaw = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'tax.json'), 'utf8'));
const taxCodes = new Set(Array.isArray(taxRaw) ? taxRaw.map((r) => r.ma || r.hs || r.code).filter(Boolean) : Object.keys(taxRaw));
const bang = (cd) => ({ tong: cd.tong, dat: cd.dat, do: cd.do, doCanT3: cd.doCanT3, doiHanhVi: cd.doiHanhVi, nemLoi: cd.nemLoi });
const tim = (cd, id) => cd.ca.find((x) => x.id === id);

// ── A. Fixture đủ cấu trúc thẻ (36 ca, 8 dòng 8 số, mỗi dòng ≥2 TRAI + ≥1 DUNG + ≥1 KHONG_NEU) ────
{
  check('A1 fixture có 36 ca (18 TRAI + 10 DUNG + 8 KHONG_NEU)', fixture.length === 36
    && fixture.filter((c) => c.loai === 'TRAI_VAT_LIEU').length === 18
    && fixture.filter((c) => c.loai === 'DUNG_VAT_LIEU').length === 10
    && fixture.filter((c) => c.loai === 'KHONG_NEU_VAT_LIEU').length === 8);
  const theoDong = {};
  for (const c of fixture) (theoDong[c.hs8] ||= { TRAI_VAT_LIEU: 0, DUNG_VAT_LIEU: 0, KHONG_NEU_VAT_LIEU: 0 })[c.loai] += 1;
  const dongDu = Object.values(theoDong).every((v) => v.TRAI_VAT_LIEU >= 2 && v.DUNG_VAT_LIEU >= 1 && v.KHONG_NEU_VAT_LIEU >= 1);
  check('A2 8 dòng 8 số, mỗi dòng ≥2 TRAI + ≥1 DUNG + ≥1 KHONG_NEU', Object.keys(theoDong).length === 8 && dongDu, theoDong);
  const maThieu = fixture.flatMap((c) => [c.hs8, ...(c.hs8Trai || []), c.hs8Dung].filter(Boolean))
    .filter((m) => !taxCodes.has(m));
  check('A3 mọi mã 8 số trong fixture có trong data/tax.json', maThieu.length === 0, [...new Set(maThieu)].slice(0, 8));
  const pn6Lech = fixture.filter((c) => !c.hs8.startsWith(c.pn6)).map((c) => c.id);
  check('A4 pn6 luôn là tiền tố của hs8 (hỏi đúng phân nhóm 6 số của dòng)', pn6Lech.length === 0, pn6Lech);
}

// ── B. Máy thật trên cây hiện tại: DAT 36 · ĐỎ 0 (T3 đã vá xong 8546-008), 0 đổi hành vi, 0 ném lỗi ──
const that = chayCaDoiChungVatLieu(['8546', '8547']);
{
  check('B1 máy thật: 36 ca — DAT 36 · DO 0 · DOI_HANH_VI 0 · NEM_LOI 0 (T3 đã vá hết ca đỏ)',
    bang(that).tong === 36 && that.dat === 36 && that.do === 0 && that.doCanT3 === 0 && that.doiHanhVi === 0 && that.nemLoi === 0,
    bang(that));
  const doIds = that.ca.filter((c) => c.trangThai === 'DO').map((c) => c.id).sort();
  check('B2 không còn ca đỏ nào — 8546-008 ("composite") đã hết đỏ sau T3; 005/006/007 đã vá từ T2', JSON.stringify(doIds) === JSON.stringify([]), doIds);
}

// ── C. CẠM BẪY BẢN VÁ RỖNG (quy tắc 5): máy ngừng chốt HOÀN TOÀN ⇒ cổng cũ ra 0 đỏ/0 đổi hành vi ────
{
  const stubTat = () => ({ ketQua: 'KHONG_THE_CHOT', hs: null, lyDo: 'gia-suat-ngung-chot' });
  const cd = chayCaDoiChungVatLieu(['8546', '8547'], stubTat);
  // Cổng cũ: DAT 36 (bẫy). Cổng siết: mọi ca coSo=CHOT mất chốt + KHONG_NEU lệch coSo ⇒ DOI_HANH_VI
  // (4 TRAI-CHOT + 3 DUNG-CHOT + 2 KHONG_NEU-CHOT + 2 KHONG_NEU-THIEU_SO_LIEU) — KHÔNG thể toàn xanh.
  check('C1 máy ngừng chốt hoàn toàn: KHÔNG toàn DAT (bẫy bản vá rỗng đã sập)', cd.dat < 36 && cd.doiHanhVi > 0, bang(cd));
  check('C2 đúng 11 ca DOI_HANH_VI (9 ca coSo=CHOT + 2 KHONG_NEU lệch THIEU_SO_LIEU)', cd.doiHanhVi === 11 && cd.dat === 25 && cd.do === 0, bang(cd));
}

// ── D. Vá ĐÚNG ca đỏ còn lại: đỏ 1→0, ca được vá thành DAT, không phát sinh đổi hành vi ───────────
// Ca thưởng = 8546-008 ("composite", chờ T3 OZV-540 PA-3) — ca đỏ DUY NHẤT còn lại sau khi vá T2.
// Trước khi vá T2 ca thưởng là 8546-005 (đã DAT sẵn ⇒ cổng không còn thưởng vá thật, nên đổi).
{
  const moTa008 = fixture.find((c) => c.id === '8546-008').moTa;
  const stubVat = (q) => (q.productText === moTa008 ? { ketQua: 'CHOT', hs: '85469000', lyDo: 'gia-suat-t2-vat-lieu' } : chotDong8(q));
  const cd = chayCaDoiChungVatLieu(['8546', '8547'], stubVat);
  check('D1 vá chốt đúng 85469000 cho ca 8546-008 ⇒ ca đó DAT', tim(cd, '8546-008').trangThai === 'DAT', tim(cd, '8546-008'));
  check('D2 đỏ giảm 1→0, đổi hành vi vẫn 0 (cổng thưởng vá thật, không chỉ phạt)', cd.do === 0 && cd.doiHanhVi === 0 && cd.dat === 36, bang(cd));
}

// ── E. Q2: từ chối mà deXuat lệch pn6 đúng ⇒ DO; deXuat đúng pn6 vẫn bị bắt mất chốt (Q1) ──────────
{
  const moTa006 = fixture.find((c) => c.id === '8546-006').moTa;
  const moTa007 = fixture.find((c) => c.id === '8546-007').moTa;
  const stubLech = (q) =>
    q.productText === moTa006 ? { ketQua: 'KHONG_THE_CHOT', hs: null, deXuat: '85462010', lyDo: 'vat-lieu-loai-tru' }
      : q.productText === moTa007 ? { ketQua: 'KHONG_THE_CHOT', hs: null, deXuat: '85469020', lyDo: 'vat-lieu-loai-tru' }
      : chotDong8(q);
  const cd = chayCaDoiChungVatLieu(['8546', '8547'], stubLech);
  check('E1 từ chối + deXuat lệch pn6 (854620 ≠ 854690) ⇒ DO, không lọt thành DAT/DOI_HANH_VI', tim(cd, '8546-006').trangThai === 'DO', tim(cd, '8546-006'));
  check('E2 từ chối + deXuat ĐÚNG pn6 nhưng mất chốt so coSo=CHOT ⇒ DOI_HANH_VI (Q1 vẫn bắt)', tim(cd, '8546-007').trangThai === 'DOI_HANH_VI', tim(cd, '8546-007'));
}

// ── F. Máy ném lỗi ⇒ NEM_LOI, không đếm nhầm thành DAT ─────────────────────────────────────────────
{
  const stubLoi = (q) => (q.productText === fixture[0].moTa ? (() => { throw new Error('gia-suat-loi'); })() : chotDong8(q));
  const cd = chayCaDoiChungVatLieu(['8546', '8547'], stubLoi);
  check('F1 máy ném lỗi ⇒ đúng 1 NEM_LOI, ca đó không DAT', cd.nemLoi === 1 && tim(cd, fixture[0].id).trangThai === 'NEM_LOI', bang(cd));
}

// ── G. VÒNG BA (TRẢ THỢ #1255): máy chốt dòng 8 số SAI ngoài hs8Trai và ≠ hs8Dung ⇒ phải DO ────────
// Lỗi thật GĐ chỉ tay: cổng cũ để "máy chốt dòng sai" rơi vào nhánh else ⇒ DAT (vàng giả) ⇒ T2 vá sai
// dòng 8 số vẫn xanh. Ca 8546-016: pn6 854690, hs8Trai [85469000], hs8Dung 85462090 — máy chốt
// 85462010 (ngoài hs8Trai, ≠ hs8Dung) ⇒ cổng cũ chấm ĐẠT, cổng mới phải chấm ĐỎ.
{
  const moTa016 = fixture.find((c) => c.id === '8546-016').moTa;
  const moTa005 = fixture.find((c) => c.id === '8546-005').moTa;
  const stubSaiDong = (q) =>
    q.productText === moTa016 ? { ketQua: 'CHOT', hs: '85462010', lyDo: 'gia-suat-chot-sai-dong' }
      : q.productText === moTa005 ? { ketQua: 'CHOT', hs: '85461000', lyDo: 'gia-suat-chot-sai-dong' }
      : chotDong8(q);
  const cd = chayCaDoiChungVatLieu(['8546', '8547'], stubSaiDong);
  check('G1 ca coSo=KHONG_THE_CHOT chốt dòng sai ngoài hs8Trai (85462010 ≠ hs8Dung 85462090) ⇒ DO, không lọt DAT',
    tim(cd, '8546-016').trangThai === 'DO', tim(cd, '8546-016'));
  check('G2 ca coSo=CHOT chốt dòng sai ngoài hs8Trai (85461000 ≠ hs8Dung 85469000) ⇒ DO, không đổi thành DOI_HANH_VI',
    tim(cd, '8546-005').trangThai === 'DO', tim(cd, '8546-005'));
  check('G3 bẫy đã sập: đỏ 1→2 (8546-005 + 8546-016 chuyển từ DAT sang DO; 8546-008 hết đỏ sau T3 nên đỏ đếm 2), đổi hành vi vẫn 0 (bản vá sai dòng không còn vượt cổng)',
    cd.do === 2 && cd.doiHanhVi === 0 && cd.dat === 34, bang(cd));
}

// ── H. OZV-2134 — ca 138 tầng 4 số: Module cảm biến chuyển động → cạnh loại trừ 2 chiều 85.43 ↔ 90.31 ──
{
  const { sourcesFor, checkItem } = require('../lib/so-tay.js');
  const H = require('../lib/hoi-theo-so-tay.js');
  const { soTayGates, nhomLienQuanSoTay } = require('../lib/so-tay-gates.js');
  const D = require('../lib/do-thi/index.js');
  const { phanTichHoiTruoc4So, TRANG_THAI_4SO } = require('../lib/do-thi/hoi-truoc-4so.js');
  const st8543 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '8543.json'), 'utf8'));
  const st9031 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '9031.json'), 'utf8'));
  const muc8543 = (st8543.loaiTru || []).find((x) => x.sangNhom === '9031' && /module cảm biến chuyển động/i.test(x.dieuKien || ''));
  const muc9031 = (st9031.loaiTru || []).find((x) => x.sangNhom === '8543' && /module cảm biến chuyển động/i.test(x.dieuKien || ''));
  check('H1 OZV-2134: sổ tay 8543↔9031 có loaiTru 2 chiều + canCuLoaiTru nguyên văn (checkItem đạt)',
    Boolean(muc8543 && muc9031)
    && muc8543.nguon === 'nhom8543.nhom'
    && muc8543.canCuLoaiTru?.nguon === 'nhom9031.nhom'
    && muc9031.nguon === 'nhom9031.nhom'
    && muc9031.canCuLoaiTru?.nguon === 'nhom8543.nhom'
    && checkItem('loaiTru', muc8543, sourcesFor('8543'), '8543') === null
    && checkItem('loaiTru', muc9031, sourcesFor('9031'), '9031') === null,
    { muc8543: Boolean(muc8543), muc9031: Boolean(muc9031) });
  check('H2 OZV-2134: dieuKien hai chiều 8543↔9031 tách biệt cho hoi-truoc-4so',
    Boolean(muc8543 && muc9031)
    && muc8543.dieuKien !== muc9031.dieuKien
    && !/;/.test(muc8543.dieuKien)
    && !/;/.test(muc9031.dieuKien),
    { dk8543: muc8543?.dieuKien, dk9031: muc9031?.dieuKien });

  const moTa138 = 'Module cảm biến chuyển động / None / Phát hiện chuyển động vật lý trên thiết bị';
  const c5_8543 = D.canhTu('8543', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '9031');
  const c5_9031 = D.canhTu('9031', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8543');
  const giua = D.canhGiuaNhomConSong(['8543', '9031']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mr8543 = D.moRongUngVien(['8543'], moTa138);
  const mr9031 = D.moRongUngVien(['9031'], moTa138);
  check('H3 OZV-2134: đồ thị C5/C6 + canhGiuaNhomConSong + moRongUngVien + nhomLienQuanSoTay nối 2 chiều 8543↔9031',
    c5_8543.length >= 1
    && c5_9031.length >= 1
    && giua.length >= 2
    && mr8543.some((x) => x.nhom === '9031')
    && mr9031.some((x) => x.nhom === '8543')
    && nhomLienQuanSoTay('8543').includes('9031')
    && nhomLienQuanSoTay('9031').includes('8543'),
    { c5_8543: c5_8543.length, c5_9031: c5_9031.length, giua: giua.length });

  const pb8543 = H.cauPhanBietNhom('8543', ['8543', '9031'], moTa138);
  const pb9031 = H.cauPhanBietNhom('9031', ['9031', '8543'], moTa138);
  const g8543 = soTayGates({ hs: '85437090', productText: moTa138, productName: 'Module cảm biến chuyển động', candidateHeadings: ['8543', '9031'] });
  const g9031 = soTayGates({ hs: '90318090', productText: moTa138, productName: 'Module cảm biến chuyển động', candidateHeadings: ['9031', '8543'] });
  const ht138 = phanTichHoiTruoc4So({ moTa: moTa138, ungVien: ['8543', '9031'] });
  check('H4 OZV-2134 (thuận): cauPhanBietNhom, soTayGates và phanTichHoiTruoc4So hoạt động đúng 2 chiều cho ca 138',
    pb8543.length === 1 && pb8543[0].nguon === 'nhom8543.nhom' && /90\.31/.test(pb8543[0].questionVi)
    && pb9031.length === 1 && pb9031[0].nguon === 'nhom9031.nhom' && /85\.43/.test(pb9031[0].questionVi)
    && (g8543.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '9031')
    && (g9031.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '8543')
    && ht138.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
    && new Set((ht138.nhanh || []).map((n) => n.dieuKien)).size === 2,
    { pb8543, pb9031, ht138: ht138.dapAnDieuKien });

  const pbNguoc8543 = H.cauPhanBietNhom('8543', ['8543', '9031'], 'Máy phát tín hiệu điện tạo sóng biên độ cố định');
  const pbNguoc9031 = H.cauPhanBietNhom('9031', ['9031', '8543'], 'Máy đo tọa độ CMMS kiểm tra kích thước đa chiều');
  const gNguoc8543 = soTayGates({ hs: '85432000', productText: 'Máy phát tín hiệu điện tạo sóng biên độ cố định', productName: 'Máy phát tín hiệu điện tạo sóng biên độ cố định' });
  const gNguoc9031 = soTayGates({ hs: '90318090', productText: 'Máy đo tọa độ CMMS kiểm tra kích thước đa chiều', productName: 'Máy đo tọa độ CMMS kiểm tra kích thước đa chiều' });
  check('H5 OZV-2134 (đối chứng): máy phát tín hiệu / máy đo tọa độ không hỏi oan và không bật oan 85.43↔90.31',
    pbNguoc8543.length === 0
    && pbNguoc9031.length === 0
    && !(gNguoc8543.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '9031')
    && !(gNguoc9031.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '8543'),
    { pbNguoc8543, pbNguoc9031 });
}

// ── I. OZV-2143 — ca 140 tầng 4 số: Vỏ lõi lọc nước RO → cạnh loại trừ 2 chiều 84.21 ↔ 73.04 ──
{
  const { sourcesFor, checkItem } = require('../lib/so-tay.js');
  const H = require('../lib/hoi-theo-so-tay.js');
  const { soTayGates, nhomLienQuanSoTay } = require('../lib/so-tay-gates.js');
  const D = require('../lib/do-thi/index.js');
  const { phanTichHoiTruoc4So, TRANG_THAI_4SO } = require('../lib/do-thi/hoi-truoc-4so.js');
  const st8421 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '8421.json'), 'utf8'));
  const st7304 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'so-tay', '7304.json'), 'utf8'));
  const muc8421 = (st8421.loaiTru || []).find((x) => x.sangNhom === '7304' && /vỏ lõi lọc/i.test(x.dieuKien || ''));
  const muc7304 = (st7304.loaiTru || []).find((x) => x.sangNhom === '8421' && /vỏ lõi lọc/i.test(x.dieuKien || ''));
  check('I1 OZV-2143: sổ tay 8421↔7304 có loaiTru 2 chiều + canCuLoaiTru nguyên văn (checkItem đạt)',
    Boolean(muc8421 && muc7304)
    && muc8421.nguon === 'nhom8421.nhom'
    && muc8421.canCuLoaiTru?.nguon === 'nhom7304.nhom'
    && muc7304.nguon === 'nhom7304.nhom'
    && muc7304.canCuLoaiTru?.nguon === 'nhom8421.nhom'
    && checkItem('loaiTru', muc8421, sourcesFor('8421'), '8421') === null
    && checkItem('loaiTru', muc7304, sourcesFor('7304'), '7304') === null,
    { muc8421: Boolean(muc8421), muc7304: Boolean(muc7304),
      err8421: muc8421 ? checkItem('loaiTru', muc8421, sourcesFor('8421'), '8421') : null,
      err7304: muc7304 ? checkItem('loaiTru', muc7304, sourcesFor('7304'), '7304') : null });
  check('I2 OZV-2143: dieuKien hai chiều 8421↔7304 tách biệt cho hoi-truoc-4so',
    Boolean(muc8421 && muc7304)
    && muc8421.dieuKien !== muc7304.dieuKien
    && !/;/.test(muc8421.dieuKien)
    && !/;/.test(muc7304.dieuKien),
    { dk8421: muc8421?.dieuKien, dk7304: muc7304?.dieuKien });

  const moTa140 = 'Vỏ lõi lọc nước RO / inox 304 / hệ thống lọc nước';
  const c5_8421 = D.canhTu('8421', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '7304');
  const c5_7304 = D.canhTu('7304', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8421');
  const giua = D.canhGiuaNhomConSong(['8421', '7304']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mr8421 = D.moRongUngVien(['8421'], moTa140);
  const mr7304 = D.moRongUngVien(['7304'], moTa140);
  check('I3 OZV-2143: đồ thị C5/C6 + canhGiuaNhomConSong + moRongUngVien + nhomLienQuanSoTay nối 2 chiều 8421↔7304',
    c5_8421.length >= 1
    && c5_7304.length >= 1
    && giua.length >= 2
    && mr8421.some((x) => x.nhom === '7304')
    && mr7304.some((x) => x.nhom === '8421')
    && nhomLienQuanSoTay('8421').includes('7304')
    && nhomLienQuanSoTay('7304').includes('8421'),
    { c5_8421: c5_8421.length, c5_7304: c5_7304.length, giua: giua.length });

  // ca 140 khớp dieuKien chiều 7304→8421 (vỏ lõi lọc); chiều 8421→7304 (ống thông dụng) đo bằng mô tả ống riêng (mẫu OZV-2129).
  const pb8421 = H.cauPhanBietNhom('8421', ['8421', '7304'], moTa140);
  const pb7304 = H.cauPhanBietNhom('7304', ['7304', '8421'], moTa140);
  const moTaOngThongDung = 'ống dẫn không mối nối bằng sắt hoặc thép (inox) thông dụng chưa gia công';
  const pbOng8421 = H.cauPhanBietNhom('8421', ['8421', '7304'], moTaOngThongDung);
  const gVoLoi7304 = soTayGates({ hs: '73049090', productText: moTa140, productName: 'Vỏ lõi lọc nước RO', candidateHeadings: ['7304', '8421'] });
  const gOng8421 = soTayGates({ hs: '84219900', productText: moTaOngThongDung, productName: moTaOngThongDung, candidateHeadings: ['8421', '7304'] });
  const ht140 = phanTichHoiTruoc4So({ moTa: moTa140, ungVien: ['8421', '7304'] });
  check('I4 OZV-2143 (thuận): cauPhanBietNhom, soTayGates và phanTichHoiTruoc4So hoạt động đúng 2 chiều cho ca 140',
    pb8421.length === 1 && /84\.21/.test(pb8421[0].questionVi) && /73\.04/.test(pb8421[0].questionVi)
    && pb7304.length === 1 && pb7304[0].nguon === 'nhom7304.nhom' && /84\.21/.test(pb7304[0].questionVi)
    && pbOng8421.length === 1 && pbOng8421[0].nguon === 'nhom8421.nhom' && /73\.04/.test(pbOng8421[0].questionVi)
    && (gVoLoi7304.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '8421')
    && (gOng8421.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '7304')
    && ht140.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC
    && new Set((ht140.nhanh || []).map((n) => n.dieuKien)).size === 2,
    { pb8421, pb7304, pbOng8421, ht140: ht140.dapAnDieuKien });

  const pbNguoc8421 = H.cauPhanBietNhom('8421', ['8421', '7304'], 'Máy lọc nước RO hoàn chỉnh có bơm và màng lọc');
  const pbNguoc7304 = H.cauPhanBietNhom('7304', ['7304', '8421'], 'Ống thép không mối nối đường kính 50mm dùng dẫn nước');
  const gNguoc8421 = soTayGates({ hs: '84212111', productText: 'Máy lọc nước RO hoàn chỉnh có bơm và màng lọc', productName: 'Máy lọc nước RO hoàn chỉnh có bơm và màng lọc' });
  const gNguoc7304 = soTayGates({ hs: '73041100', productText: 'Ống thép không mối nối đường kính 50mm dùng dẫn nước', productName: 'Ống thép không mối nối đường kính 50mm dùng dẫn nước' });
  check('I5 OZV-2143 (đối chứng): máy lọc nước RO / ống thép không mối nối không hỏi oan và không bật oan 84.21↔73.04',
    pbNguoc8421.length === 0
    && pbNguoc7304.length === 0
    && !(gNguoc8421.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '7304')
    && !(gNguoc7304.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '8421'),
    { pbNguoc8421, pbNguoc7304 });
}

console.log(`\ncổng đối chứng vật liệu 8546+8547 (OZV-548 vòng ba): ${passed} PASS, ${failed} FAIL`);
process.exit(failed ? 1 : 0);
