#!/usr/bin/env node
/**
 * scripts/test-loai-tru-vat-lieu-san-pham.mjs — Tự kiểm 2 chiều cho 7 cặp loại trừ vật liệu → sản phẩm (#1645 Việc 2).
 *
 * Chứng minh trên cả 7 cặp (8414↔8421, 3924↔8424, 9603↔8212, 8460↔8459, 3926↔4016, 3919↔3921, 5903↔6116/6302):
 *   1) Cạnh xuôi C5 (nguồn → đích) và cạnh ngược C6 (đích → nguồn) đều có trong đồ thị (canhTu, duongDi, moRongUngVien),
 *      giữ đủ trich + nguon + canCuLoaiTru.
 *   2) Mối nối 2 chiều có trong nhomLienQuanSoTay(A) và nhomLienQuanSoTay(B).
 *   3) Cổng soTayGates (SO_TAY_LOAI_TRU) kích hoạt ĐÚNG trên hàng thuộc nhóm đích bị nhập nhầm về nhóm nguồn.
 *   4) CA NGƯỢC: hàng thực sự thuộc nhóm nguồn (bơm chân không, cốc nhựa, cọ lăn sơn, máy mài sắc, bẫy chuột, băng keo tự dính,
 *      vải dệt phủ PVC cuộn) KHÔNG bị kích hoạt oan SO_TAY_LOAI_TRU của các mục mới.
 *   5) Kiểm định checkItem cho canCuLoaiTru: đúng 2 vế thì qua, thiếu/bịa/lệch nguồn bị loại.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const D = require('../lib/do-thi/index.js');
const ST = require('../lib/so-tay.js');
const { soTayGates, nhomLienQuanSoTay } = require('../lib/so-tay-gates.js');

let pass = 0;
let fail = 0;
function check(name, cond, detail = '') {
  if (cond) { pass += 1; console.log(`PASS  ${name}`); }
  else { fail += 1; console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}

const CAP_7 = [
  {
    tu: '8414',
    toi: '8421',
    hangDungDich: 'Lọc gió cho bơm hút chân không',
    hangNguonSach: 'Bơm hút chân không vòng dầu',
    nguonDich: 'nhom8421.nhom',
  },
  {
    tu: '3924',
    toi: '8424',
    hangDungDich: 'Bình xịt phun nước vệ sinh nội thất',
    hangNguonSach: 'Cốc nhựa uống nước gia dụng',
    nguonDich: 'nhom8424.nhom',
  },
  {
    tu: '9603',
    toi: '8212',
    hangDungDich: 'Bàn cạo râu cá nhân bằng thép',
    hangNguonSach: 'Cọ lăn sơn mini bằng sợi tổng hợp',
    nguonDich: 'nhom8212.nhom',
  },
  {
    tu: '8460',
    toi: '8459',
    hangDungDich: 'Máy taro đai ốc tự động',
    hangNguonSach: 'Máy mài sắc mũi khoan bằng đá mài',
    nguonDich: 'nhom8459.nhom',
  },
  {
    tu: '3926',
    toi: '4016',
    hangDungDich: 'Thảm cao su chống mỏi chống tĩnh điện ESD',
    moTaMoRong: 'Thảm chống mỏi chống tĩnh điện ESD / Bề mặt PVC, lõi và đáy cao su EPDM',
    hangNguonSach: 'Bẫy chuột bằng nhựa',
    nguonDich: 'nhom4016.nhom',
  },
  {
    tu: '3919',
    toi: '3921',
    hangDungDich: 'Tấm nhựa laminate trang trí nội thất',
    hangNguonSach: 'Băng keo tự dính PVC dạng cuộn',
    nguonDich: 'nhom3921.nhom',
  },
  {
    tu: '5903',
    toi: '6116',
    hangDungDich: 'Găng tay vệ sinh gia đình bằng vải dệt kim polyester',
    hangNguonSach: 'Vải dệt phủ nhựa PVC dạng cuộn',
    nguonDich: 'nhom6116.nhom',
  },
  {
    tu: '5903',
    toi: '6302',
    hangDungDich: 'Găng tay vệ sinh và khăn lau mặt bằng vải dệt',
    hangNguonSach: 'Vải dệt phủ nhựa PVC dạng cuộn',
    nguonDich: 'nhom6302.nhom',
  },
];

// 1. Đồ thị hai chiều C5 / C6 + moRongUngVien + nhomLienQuanSoTay
for (const c of CAP_7) {
  const xuoi = D.canhTu(c.tu, 'C5', { toiDa: Infinity }).filter((e) => e.toi === c.toi);
  const nguoc = D.canhTu(c.toi, 'C6', { toiDa: Infinity }).filter((e) => e.toi === c.tu);
  const hasTwoWay = xuoi.some((e) => e.canCuLoaiTru?.nguon === c.nguonDich)
    && nguoc.some((e) => e.canCuLoaiTru?.nguon === c.nguonDich);
  check(`Đồ thị hai chiều C5/C6 (${c.tu} ↔ ${c.toi}) giữ đủ trích nguồn + canCuLoaiTru`, hasTwoWay,
    `C5=${xuoi.length}, C6=${nguoc.length}`);

  const pAB = D.duongDi(c.tu, c.toi, 1, { loai: ['C5'], quaCay: false });
  const pBA = D.duongDi(c.toi, c.tu, 1, { loai: ['C6'], quaCay: false });
  check(`duongDi hai chiều (${c.tu} → ${c.toi} qua C5, ${c.toi} → ${c.tu} qua C6)`, Boolean(pAB && pBA));

  const mo = D.moRongUngVien([c.tu], c.moTaMoRong || c.hangDungDich, { toiDa: 10 });
  const moBack = D.moRongUngVien([c.toi], c.moTaMoRong || c.hangDungDich, { toiDa: 10 });
  check(`moRongUngVien (${c.tu} → ${c.toi} hoặc ngược lại) nhận diện được "${c.moTaMoRong || c.hangDungDich}"`,
    mo.some((x) => x.nhom === c.toi) || moBack.some((x) => x.nhom === c.tu),
    `xuoi=${mo.map((x) => x.nhom).join(',')} nguoc=${moBack.map((x) => x.nhom).join(',')}`);

  const relA = nhomLienQuanSoTay(c.tu);
  const relB = nhomLienQuanSoTay(c.toi);
  check(`nhomLienQuanSoTay hai chiều (${c.tu} ↔ ${c.toi})`, relA.includes(c.toi) && relB.includes(c.tu),
    `${c.tu}→${relA.join(',')} | ${c.toi}→${relB.join(',')}`);
}

// 2. Cổng soTayGates kích hoạt đúng và KHÔNG kích hoạt oan
for (const c of CAP_7) {
  const gPos = soTayGates({
    hs: `${c.tu}0000`,
    productText: c.hangDungDich,
    productName: c.hangDungDich,
  });
  const hitPos = gPos.challenges.some((ch) => ch.gate === 'SO_TAY_LOAI_TRU' && ch.target === c.toi);
  check(`SO_TAY_LOAI_TRU kích hoạt đúng (${c.tu} chọn nhầm cho "${c.hangDungDich}" → ${c.toi})`, hitPos,
    JSON.stringify(gPos.challenges.map((x) => ({ gate: x.gate, target: x.target }))));

  const gNeg = soTayGates({
    hs: `${c.tu}0000`,
    productText: c.hangNguonSach,
    productName: c.hangNguonSach,
  });
  const hitNeg = gNeg.challenges.some((ch) => ch.gate === 'SO_TAY_LOAI_TRU' && ch.target === c.toi);
  check(`CA NGƯỢC không bật oan (${c.tu} đúng cho "${c.hangNguonSach}" KHÔNG bị trỏ sang ${c.toi})`, !hitNeg,
    JSON.stringify(gNeg.challenges.map((x) => ({ gate: x.gate, target: x.target }))));
}

// 2b. Ca ngược sát ranh giới chính nhóm nguồn (không được bật oan SO_TAY_LOAI_TRU)
const CA_BIEN_NGUON = [
  { hs: '96032900', target: '8212', ten: 'Bàn chải cạo râu' },
  { hs: '39199099', target: '3921', ten: 'Tấm plastic xốp tự dính hai mặt' },
  { hs: '39199099', target: '3921', ten: 'Tấm plastic ghép lớp tự dính' },
  { hs: '39269099', target: '4016', ten: 'Thảm chống mỏi bằng nhựa PVC' },
  { hs: '39269099', target: '4016', ten: 'Thảm trải sàn cao cấp bằng nhựa PVC' },
  { hs: '59031090', target: '6116', ten: 'Vải dệt phủ nhựa PVC may găng tay' },
  { hs: '39249090', target: '8424', ten: 'Đồ nhựa phun xịt sơn trang trí' },
];
for (const b of CA_BIEN_NGUON) {
  const g = soTayGates({ hs: b.hs, productText: b.ten, productName: b.ten });
  const bad = g.challenges.some((ch) => ch.gate === 'SO_TAY_LOAI_TRU' && ch.target === b.target);
  check(`CA NGƯỢC sát ranh giới (${b.hs} "${b.ten}" KHÔNG bị trỏ oan sang ${b.target})`, !bad,
    JSON.stringify(g.challenges.map((x) => ({ gate: x.gate, target: x.target, matched: x.matched }))));
}

// 3. Kiểm định chặt chẽ canCuLoaiTru trong lib/so-tay.js
{
  const src3924 = ST.sourcesFor('3924');
  const itemValid = {
    dieuKien: 'Bình xịt phun nước có bơm cơ khí',
    sangNhom: '8424',
    nguon: 'ch39.chuong',
    trich: '(s) Các mặt hàng thuộc Phần XVI (máy và các thiết bị cơ khí hay điện);',
    canCuLoaiTru: {
      nguon: 'nhom8424.nhom',
      trich: 'Nhóm này bao gồm các loại máy và thiết bị dùng để phun bắn, phun rải hoặc phun áp lực hơi nước, chất lỏng hoặc các chất rắn khác',
    },
  };
  assert.equal(ST.checkItem('loaiTru', itemValid, src3924, '3924'), null);
  check('checkItem(canCuLoaiTru): mục hợp lệ 2 vế đạt null', true);

  const errNoCanCu = ST.checkItem('loaiTru', { ...itemValid, canCuLoaiTru: undefined }, src3924, '3924');
  const errFakeDst = ST.checkItem('loaiTru', {
    ...itemValid,
    canCuLoaiTru: { nguon: 'nhom8424.nhom', trich: 'Câu bịa đặt hoàn toàn không có trong chú giải' },
  }, src3924, '3924');
  const errWrongDstSrc = ST.checkItem('loaiTru', {
    ...itemValid,
    canCuLoaiTru: { nguon: 'ch84.chuong', trich: 'Chương 84' },
  }, src3924, '3924');
  const errMultiTarget = ST.checkItem('loaiTru', { ...itemValid, sangNhom: '8424|8481' }, src3924, '3924');
  const errNoAnchorSrc = ST.checkItem('loaiTru', {
    ...itemValid,
    trich: 'bất kỳ nội dung nào liên quan đến',
  }, src3924, '3924');

  check('CA NGƯỢC checkItem: thiếu canCuLoaiTru khi trich không nêu 4 số → bị loại', /nhom-dich-khong-co-trong-trich/.test(errNoCanCu), errNoCanCu);
  check('CA NGƯỢC checkItem: canCuLoaiTru.trich bịa → bị loại', errFakeDst === 'can-cu-loai-tru-trich-khong-co', errFakeDst);
  check('CA NGƯỢC checkItem: canCuLoaiTru.nguon không đúng cấp nhóm đích → bị loại', /can-cu-loai-tru-nguon-sai/.test(errWrongDstSrc), errWrongDstSrc);
  check('CA NGƯỢC checkItem: canCuLoaiTru gắn nhiều nhóm đích → bị loại', errMultiTarget === 'can-cu-loai-tru-mot-nhom-dich', errMultiTarget);
  check('CA NGƯỢC checkItem: câu nguồn không chứa neo loại trừ/Phần/Chương → bị loại', errNoAnchorSrc === 'can-cu-loai-tru-thieu-neo-nguon', errNoAnchorSrc);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
