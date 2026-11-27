#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * OZV-2374 — [Thực địa · 8 số] Quạt giải nhiệt máy biến áp, model GFDD470-150:
 * 2/2 lượt dừng 6 số — phân biệt 8414.59 với 8504.90 theo Chú giải 2 Phần XVI
 * và hỏi đúng dữ kiện dòng 8 số của phân nhóm đích để chốt mã theo luật.
 *
 * Kiểm chứng cơ chế (ADR-0004, L2, L3):
 *  1. Căn cứ sổ tay 8414 qua cổng verifySoTay / quoteInSource, kiemCauHoiMucDich
 *     và khopCanhCuTrongPhamVi (data/luat-goc/phan.jsonl phan:XVI:kq:45).
 *  2. Bước 0 (4 số): khi 8414 và 8504 cùng là ứng viên cho câu khách thực địa
 *     «quạt giải nhiệt máy biến áp…» (đã nêu rõ mặt hàng là quạt), cauPhanBietNhom
 *     KHÔNG sinh câu PHAN_BIET 84.14↔85.04 (OZV-2389 — thừa); vẫn giữ mục phanBiet
 *     trong sổ tay để cạnh C7 / trích dẫn Chú giải 2 Phần XVI.
 *  3. Cổng loại trừ sổ tay (soTayGates + tinHieuTraiNhom): không bật nhầm trên câu
 *     quạt giải nhiệt máy biến áp ở 841459; bật đúng SO_TAY_LOAI_TRU 8414→8504 khi
 *     hàng là biến thế điện / tấm tản nhiệt / ống tản nhiệt của máy biến áp.
 *  4. Bước 4→6 số (diXuong6): «quạt giải nhiệt máy biến áp, model gfdd470-150»
 *     loại 841451 (quạt gia dụng ≤ 125W) và chốt đúng phân nhóm 841459.
 *  5. Bước 6→8 số (8414.59): chưa nêu công suất / lưới bảo vệ → dừng hỏi đúng
 *     congSuat (<= 125 kW), chiHoacChuYeu, coLuoiBaoVe (canCu ranh-gioi-pn6), KHÔNG
 *     kèm PHAN_BIET quạt↔8504 (OZV-2389); khi có đủ dữ kiện → chốt đúng 84145941 /
 *     84145991 / 84145910 / 84145920 / 84145930.
 *  6. Ca ngược (L3, ≥3 nhóm):
 *     - Quạt bàn / quạt trần gia dụng (841451 → 84145110 / 84145191)
 *     - Máy biến áp nguyên chiếc (8504 → hỏi điện áp 850433)
 *     - Cánh quạt rời / bộ phận quạt (SO_TAY_BO_PHAN → 8414.90)
 * Không gọi mạng, không gọi LLM.
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const S = require(join(ROOT, 'lib', 'so-tay.js'));
const G = require(join(ROOT, 'lib', 'so-tay-gates.js'));
const H = require(join(ROOT, 'lib', 'hoi-theo-so-tay.js'));
const CS = require(join(ROOT, 'lib', 'chot-som-co-kiem.js'));
const D = require(join(ROOT, 'lib', 'do-thi', 'index.js'));
const PD = require(join(ROOT, 'lib', 'do-thi', 'phai-doc.js'));
const TC6 = require(join(ROOT, 'lib', 'do-thi', 'tieu-chi-6.js'));

let pass = 0;
let fail = 0;
function check(name, cond, detail) {
  if (cond) {
    pass += 1;
    console.log(`  ✓ ${name}`);
  } else {
    fail += 1;
    console.error(`  ✗ ${name}`, detail === undefined ? '' : JSON.stringify(detail).slice(0, 500));
  }
}

const CAU_THUC_DIA = [
  'quạt giải nhiệt máy biến áp, model gfdd470-150',
  'quạt giải nhiệt máy biến áp khô, model GFDD470-150',
  'quạt làm mát máy biến áp',
  'quạt tản nhiệt máy biến áp',
];

console.log('1. Sổ tay 8414 qua cổng quoteInSource / verifySoTay, kiemCauHoiMucDich và luat-goc');
{
  const st = G.loadSoTay('8414');
  const v = S.verifySoTay(st, '8414');
  check(`sổ tay 8414 verifySoTay 0 mục bị loại (${v.dat}/${v.tong})`, v.loai.length === 0 && v.dat === v.tong, v.loai);
  check(`sổ tay 8414 kiemTra.tong/dat khớp verifySoTay`, st.kiemTra?.tong === v.tong && st.kiemTra?.dat === v.dat, { kiemTra: st.kiemTra, tong: v.tong, dat: v.dat });

  const pb8414_8504 = (st.phanBiet || []).filter(
    (x) => (String(x.neuCo).includes('8414') && String(x.neuKhong).includes('8504'))
      || (String(x.neuCo).includes('8504') && String(x.neuKhong).includes('8414')),
  );
  check('sổ tay 8414 có mục phanBiet 8414↔8504', pb8414_8504.length >= 1, pb8414_8504);
  for (const p of pb8414_8504) {
    const kqMd = TC6.kiemCauHoiMucDich(p.hoi);
    check('phanBiet 8414↔8504 không vi phạm CHI_HOI_MUC_DICH', kqMd.ma === null, kqMd);
    const nutLuatGoc = PD.khopCanhCuTrongPhamVi(p.trich, '8414', '8504');
    check('trích dẫn phanBiet 8414↔8504 khớp nguyên văn nút phan:XVI:kq:45 trong data/luat-goc', nutLuatGoc?.id === 'phan:XVI:kq:45', nutLuatGoc);
  }

  const lt8414_8504 = (st.loaiTru || []).filter((x) => String(x.sangNhom).includes('8504'));
  check('sổ tay 8414 có mục loaiTru sang 8504', lt8414_8504.length >= 1, lt8414_8504);

  const canh8414_8504 = D.canhGiuaNhomConSong(['8414', '8504']);
  check(
    'bảng cạnh đồ thị có cạnh C7 và C5/C6 bậc 1 giữa 8414 và 8504',
    canh8414_8504.some((e) => e.loai === 'C7' && e.bac === 1)
      && canh8414_8504.some((e) => e.loai === 'C5' && e.bac === 1)
      && canh8414_8504.some((e) => e.loai === 'C6' && e.bac === 1),
    canh8414_8504.map((e) => ({ id: e.id, loai: e.loai, bac: e.bac })),
  );
}

console.log('2. Bước 0 (4 số): cauPhanBietNhom KHÔNG hỏi PHAN_BIET 84.14↔85.04 khi mô tả đã nêu rõ quạt (OZV-2389)');
for (const q of CAU_THUC_DIA) {
  const tu8414 = H.cauPhanBietNhom('8414', ['8414', '8504'], q);
  const tu8504 = H.cauPhanBietNhom('8504', ['8504', '8414'], q);
  check(`«${q}» từ 8414 KHÔNG sinh câu PHAN_BIET_NHOM 84.14↔85.04 (đã nêu quạt)`, tu8414.length === 0, tu8414);
  check(`«${q}» từ 8504 KHÔNG sinh câu PHAN_BIET_NHOM 84.14↔85.04 (đã nêu quạt)`, tu8504.length === 0, tu8504);
}
{
  const qTam = 'tấm tản nhiệt của máy biến áp phân phối';
  const tuTam = H.cauPhanBietNhom('8414', ['8414', '8504'], qTam);
  check('ca ngược tấm tản nhiệt MBA: vẫn sinh câu PHAN_BIET_NHOM 84.14↔85.04 (loaiTru)', tuTam.length >= 1 && tuTam[0].loai === 'PHAN_BIET_NHOM' && tuTam[0].nguon === 'phan84.phan', tuTam);
}

console.log('3. Cổng loại trừ sổ tay (soTayGates + tinHieuTraiNhom): không bắn nhầm quạt ở 841459, bắn đúng khi hàng là biến thế/tấm tản nhiệt MBA');
const prevSoTay = process.env.HS_SO_TAY;
process.env.HS_SO_TAY = 'full';
for (const q of CAU_THUC_DIA) {
  const g8414 = G.soTayGates({ hs: '841459', productText: q, productName: q });
  const ch8504 = (g8414.challenges || []).find((c) => c.gate === 'SO_TAY_LOAI_TRU' && c.target === '8504');
  check(`«${q}» ở 841459 KHÔNG bật nhầm SO_TAY_LOAI_TRU sang 8504`, !ch8504, g8414.challenges);
}
for (const [qMba, cumKhop] of [
  ['biến thế điện 3 pha 500kVA', 'biến thế điện'],
  ['tấm tản nhiệt của máy biến áp phân phối', 'tấm tản'],
  ['ống tản nhiệt của máy biến áp', 'ống tản'],
]) {
  const gSai = G.soTayGates({ hs: '841459', productText: qMba, productName: qMba });
  const ch8504 = (gSai.challenges || []).find((c) => c.gate === 'SO_TAY_LOAI_TRU' && c.target === '8504');
  check(`«${qMba}» xếp nhầm 841459 → soTayGates bật SO_TAY_LOAI_TRU sang 8504 (${cumKhop})`, Boolean(ch8504 && ch8504.matched === cumKhop), gSai.challenges);
  const th = CS.tinHieuTraiNhom({ hs: '841459', gathered: {}, productText: qMba, productName: qMba });
  check(`«${qMba}» tinHieuTraiNhom(841459) báo so-tay-loai-tru → 8504`, th.some((x) => x.ma === 'so-tay-loai-tru' && x.nhom === '8504'), th);
}
if (prevSoTay === undefined) delete process.env.HS_SO_TAY;
else process.env.HS_SO_TAY = prevSoTay;

console.log('4. Bước 4→6 số (diXuong6 trên 8414): loại 841451 và chốt/giữ đúng phân nhóm 841459');
{
  const st8414 = G.loadSoTay('8414');
  for (const q of [
    'quạt giải nhiệt máy biến áp, model gfdd470-150',
    'quạt giải nhiệt máy biến áp khô, model GFDD470-150',
    'quạt tản nhiệt máy biến áp',
  ]) {
    const kq6 = TC6.diXuong6('8414', st8414.tieuChi6, q);
    const ct841451 = (kq6.chiTiet || []).find((c) => c.hs6 === '841451');
    check(`«${q}» diXuong6(8414) loại 841451 (TRAI) và chốt 841459`, kq6.trangThai === 'DUNG_CHOT' && kq6.hs6 === '841459' && ct841451?.trangThai === 'TRAI', kq6);
  }
  const kqLamMat = TC6.diXuong6('8414', st8414.tieuChi6, 'quạt làm mát máy biến áp');
  check(
    '«quạt làm mát máy biến áp» diXuong6(8414) giữ 841459 trong ứng viên và loại 841410..841440/841460/841470',
    (kqLamMat.hs6 === '841459' || (kqLamMat.ungVien || []).includes('841459'))
      && ['841410', '841420', '841430', '841440', '841460', '841470'].every((h6) => (kqLamMat.chiTiet || []).find((c) => c.hs6 === h6)?.trangThai === 'TRAI'),
    kqLamMat,
  );
}

console.log('5. Bước 6→8 số (8414.59): hỏi đúng tiêu chí dòng 8 số khi thiếu và chốt đúng mã 8 số khi đủ dữ kiện');
const prevHoi = process.env.HS_HOI_THEO_SO_TAY;
process.env.HS_HOI_THEO_SO_TAY = 'on';
for (const q of CAU_THUC_DIA) {
  const cdThieu = G.chotDong8({ hs: '841459', productText: q });
  const factsThieu = (cdThieu.missingFacts || []).map((m) => m.fact);
  check(
    `«${q}» chưa nêu thông số → chotDong8(841459) trả THIEU_SO_LIEU hỏi congSuat, chiHoacChuYeu, coLuoiBaoVe`,
    cdThieu.ketQua === 'THIEU_SO_LIEU'
      && factsThieu.includes('congSuat')
      && factsThieu.includes('chiHoacChuYeu')
      && factsThieu.includes('coLuoiBaoVe'),
    cdThieu,
  );

  // Khi vòng 2 dừng ở 841459 (ứng viên 850490)
  const fakeOut841459 = {
    status: 'NEED_FACTS',
    results: [{ hs: '841459' }],
    dossier: {
      product: { nameVi: q },
      hypotheses: [
        { heading4: '8414', subheading6: '841459' },
        { heading4: '8504', subheading6: '850490' },
      ],
      alternatives: [{ hs: '850490' }],
    },
    nextAction: { type: 'ASK_USER', questions: [{ questionVi: 'Model là gì?' }] },
  };
  const outHoi8414 = H.apDung(fakeOut841459, { rawAttrs: { tenHang: q } });
  const qs8414 = outHoi8414.nextAction?.questions || [];
  check(
    `«${q}» apDung(841459) hỏi DONG_8 (congSuat, chiHoacChuYeu, coLuoiBaoVe), KHÔNG hỏi PHAN_BIET quạt↔8504`,
    outHoi8414.nextAction?.canCuCauHoi === 'so-tay'
      && !qs8414.some((x) => x.loai === 'PHAN_BIET_NHOM')
      && qs8414.some((x) => x.loai === 'DONG_8' && x.khoa === 'congSuat' && x.canCu === 'ranh-gioi-pn6')
      && qs8414.some((x) => x.loai === 'DONG_8' && x.khoa === 'chiHoacChuYeu' && x.canCu === 'ranh-gioi-pn6')
      && qs8414.some((x) => x.loai === 'DONG_8' && x.khoa === 'coLuoiBaoVe' && x.canCu === 'ranh-gioi-pn6'),
    qs8414,
  );

  const cd41 = G.chotDong8({ hs: '841459', productText: `${q}, công suất 75 W, có lưới bảo vệ` });
  check(
    `«${q}» + "công suất 75 W, có lưới bảo vệ" (≤125 kW) → chốt 84145941`,
    cd41.ketQua === 'CHOT' && cd41.hs === '84145941',
    cd41,
  );

  const cd91 = G.chotDong8({ hs: '841459', productText: `${q}, công suất 150 kW, có lưới bảo vệ` });
  check(
    `«${q}» + "công suất 150 kW, có lưới bảo vệ" (>125 kW) → chốt 84145991`,
    cd91.ketQua === 'CHOT' && cd91.hs === '84145991',
    cd91,
  );
}

// Các nhánh có tên khác trong 8414.59
{
  const cd10 = G.chotDong8({ hs: '841459', productText: 'quạt loại chỉ sử dụng để làm mát bộ vi xử lý, công suất 20 W' });
  check('8414.59 nhánh quạt làm mát bộ vi xử lý (≤125 kW) → chốt 84145910', cd10.ketQua === 'CHOT' && cd10.hs === '84145910', cd10);

  const cd20 = G.chotDong8({ hs: '841459', productText: 'quạt gió phòng nổ, loại sử dụng trong hầm lò, công suất 30 kW' });
  check('8414.59 nhánh quạt gió phòng nổ hầm lò (≤125 kW) → chốt 84145920', cd20.ketQua === 'CHOT' && cd20.hs === '84145920', cd20);

  const cd30 = G.chotDong8({ hs: '841459', productText: 'máy thổi khí giải nhiệt, công suất 15 kW' });
  check('8414.59 nhánh máy thổi khí (≤125 kW) → chốt 84145930', cd30.ketQua === 'CHOT' && cd30.hs === '84145930', cd30);
}
if (prevHoi === undefined) delete process.env.HS_HOI_THEO_SO_TAY;
else process.env.HS_HOI_THEO_SO_TAY = prevHoi;

console.log('6. Ca ngược (L3): quạt bàn/quạt trần gia dụng, máy biến áp nguyên chiếc, cánh quạt rời không kích nhầm');
{
  const st8414 = G.loadSoTay('8414');

  // Ca ngược 1: Quạt bàn / quạt trần gia dụng (8414.51)
  for (const [qGiaDung, ma8] of [
    ['quạt bàn có động cơ điện gắn liền công suất 45W', '84145110'],
    ['quạt trần có động cơ điện gắn liền công suất 60W, có lưới bảo vệ', '84145191'],
  ]) {
    const pb1 = H.cauPhanBietNhom('8414', ['8414', '8504'], qGiaDung);
    const pb2 = H.cauPhanBietNhom('8504', ['8504', '8414'], qGiaDung);
    check(`ca ngược gia dụng «${qGiaDung}» không kích câu phân biệt 8414↔8504`, pb1.length === 0 && pb2.length === 0, [...pb1, ...pb2]);
    const kq6 = TC6.diXuong6('8414', st8414.tieuChi6, qGiaDung);
    check(`ca ngược gia dụng «${qGiaDung}» diXuong6 chốt 841451`, kq6.trangThai === 'DUNG_CHOT' && kq6.hs6 === '841451', kq6);
    const cd8 = G.chotDong8({ hs: '841451', productText: qGiaDung });
    check(`ca ngược gia dụng «${qGiaDung}» chotDong8(841451) chốt ${ma8}`, cd8.ketQua === 'CHOT' && cd8.hs === ma8, cd8);
  }

  // Ca ngược 2: Máy biến áp nguyên chiếc (8504)
  for (const qMba of [
    'máy biến áp 3 pha 1000kVA ngâm dầu',
    'máy biến điện khô 3 pha công suất 500 kVA',
  ]) {
    const pb1 = H.cauPhanBietNhom('8414', ['8414', '8504'], qMba);
    const pb2 = H.cauPhanBietNhom('8504', ['8504', '8414'], qMba);
    check(`ca ngược MBA nguyên chiếc «${qMba}» không kích câu phân biệt quạt giải nhiệt 8414↔8504`, pb1.length === 0 && pb2.length === 0, [...pb1, ...pb2]);
  }
  const cdMba = G.chotDong8({ hs: '850433', productText: 'máy biến điện khô 3 pha công suất 100 kVA' });
  check(
    'ca ngược MBA nguyên chiếc 850433 hỏi đúng dienAp (>= 66 kV)',
    cdMba.ketQua === 'THIEU_SO_LIEU' && (cdMba.missingFacts || []).some((m) => m.fact === 'dienAp'),
    cdMba,
  );

  // Ca ngược 3: Cánh quạt rời (bộ phận quạt → 8414.90)
  for (const qCanh of [
    'cánh quạt rời bằng nhựa dùng cho quạt thông gió',
    'bánh công tác và cánh quạt thay thế của quạt công nghiệp',
  ]) {
    const pb1 = H.cauPhanBietNhom('8414', ['8414', '8504'], qCanh);
    const pb2 = H.cauPhanBietNhom('8504', ['8504', '8414'], qCanh);
    check(`ca ngược cánh quạt rời «${qCanh}» không kích câu phân biệt 8414↔8504`, pb1.length === 0 && pb2.length === 0, [...pb1, ...pb2]);
    const gBoPhan = G.soTayGates({ hs: '841459', productText: qCanh, productName: qCanh, form: 'bộ phận' });
    const chBoPhan = (gBoPhan.challenges || []).find((c) => c.gate === 'SO_TAY_BO_PHAN');
    check(
      `ca ngược cánh quạt rời «${qCanh}» (form=bộ phận) ở 841459 bật SO_TAY_BO_PHAN về 8414.90`,
      Boolean(chBoPhan && String(chBoPhan.target).startsWith('841490')),
      gBoPhan.challenges,
    );
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
