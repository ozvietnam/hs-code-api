#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * OZV-548 vòng hai (TRẢ THỢ PR #1255) — cổng chấm bộ 36 ca đối chứng VẬT LIỆU phải chặt theo HÀNH VI,
 * không chỉ theo "không chốt sai" (quy tắc 5 OZV-290: bản vá rỗng cũng phải ra số khác).
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

// ── B. Máy thật trên cây hiện tại: 4 đỏ đúng chỗ (8546-005..008), 0 đổi hành vi, 0 ném lỗi ─────────
const that = chayCaDoiChungVatLieu(['8546', '8547']);
{
  check('B1 máy thật: 36 ca — DAT 32 · DO 4 (cầnT3 1) · DOI_HANH_VI 0 · NEM_LOI 0',
    bang(that).tong === 36 && that.dat === 32 && that.do === 4 && that.doCanT3 === 1 && that.doiHanhVi === 0 && that.nemLoi === 0,
    bang(that));
  const doIds = that.ca.filter((c) => c.trangThai === 'DO').map((c) => c.id).sort();
  check('B2 4 đỏ đúng chỗ là 8546-005..008 (đỏ "trước khi vá" của T2)', JSON.stringify(doIds) === JSON.stringify(['8546-005', '8546-006', '8546-007', '8546-008']), doIds);
}

// ── C. CẠM BẪY BẢN VÁ RỖNG (quy tắc 5): máy ngừng chốt HOÀN TOÀN ⇒ cổng cũ ra 0 đỏ/0 đổi hành vi ────
{
  const stubTat = () => ({ ketQua: 'KHONG_THE_CHOT', hs: null, lyDo: 'gia-suat-ngung-chot' });
  const cd = chayCaDoiChungVatLieu(['8546', '8547'], stubTat);
  // Cổng cũ: DAT 36 (bẫy). Cổng siết: mọi ca coSo=CHOT mất chốt + KHONG_NEU lệch coSo ⇒ DOI_HANH_VI
  // (4 TRAI-CHOT + 3 DUNG-CHOT + 1 KHONG_NEU-CHOT + 1 KHONG_NEU-THIEU_SO_LIEU) — KHÔNG thể toàn xanh.
  check('C1 máy ngừng chốt hoàn toàn: KHÔNG toàn DAT (bẫy bản vá rỗng đã sập)', cd.dat < 36 && cd.doiHanhVi > 0, bang(cd));
  check('C2 đúng 9 ca DOI_HANH_VI (8 ca coSo=CHOT + 1 KHONG_NEU lệch THIEU_SO_LIEU)', cd.doiHanhVi === 9 && cd.dat === 27 && cd.do === 0, bang(cd));
}

// ── D. T2 vá ĐÚNG 1 ca: đỏ giảm 4→3, ca được vá thành DAT, không phát sinh đổi hành vi ─────────────
{
  const moTa005 = fixture.find((c) => c.id === '8546-005').moTa;
  const stubVat = (q) => (q.productText === moTa005 ? { ketQua: 'CHOT', hs: '85469000', lyDo: 'gia-suat-t2-vat-lieu' } : chotDong8(q));
  const cd = chayCaDoiChungVatLieu(['8546', '8547'], stubVat);
  check('D1 T2 chốt đúng 85469000 cho ca 8546-005 ⇒ ca đó DAT', tim(cd, '8546-005').trangThai === 'DAT', tim(cd, '8546-005'));
  check('D2 đỏ giảm 4→3, đổi hành vi vẫn 0 (cổng thưởng vá thật, không chỉ phạt)', cd.do === 3 && cd.doiHanhVi === 0, bang(cd));
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
  check('G3 bẫy đã sập: đỏ 4→5 (8546-016 chuyển từ DAT sang DO), đổi hành vi vẫn 0 (bản vá sai dòng không còn vượt cổng)',
    cd.do === 5 && cd.doiHanhVi === 0 && cd.dat === 31, bang(cd));
}

console.log(`\ncổng đối chứng vật liệu 8546+8547 (OZV-548 vòng ba): ${passed} PASS, ${failed} FAIL`);
process.exit(failed ? 1 : 0);
