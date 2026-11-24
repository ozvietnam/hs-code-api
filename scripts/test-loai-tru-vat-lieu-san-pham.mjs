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
const H = require('../lib/hoi-theo-so-tay.js');
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
  // OZV-2067: 90.30 ↔ 85.36 ↔ 90.32 (đồng hồ đo áp, đo dòng, chống mất pha 3 pha)
  {
    tu: '9030',
    toi: '8536',
    hangDungDich: 'Rơ le bảo vệ mất pha 3 pha 380V',
    moTaMoRong: 'Đồng hồ đo áp, đo dòng, chống mất pha , 3pha -38',
    hangNguonSach: 'Máy hiện sóng kỹ thuật số 100MHz',
    nguonDich: 'nhom8536.nhom',
  },
  {
    tu: '8536',
    toi: '9030',
    hangDungDich: 'Đồng hồ đo áp, đo dòng 3 pha gắn tủ điện',
    moTaMoRong: 'Đồng hồ đo áp, đo dòng, chống mất pha , 3pha -38',
    hangNguonSach: 'Cầu chì ống thủy tinh 10A 250V',
    nguonDich: 'nhom9030.nhom',
  },
  {
    tu: '9030',
    toi: '9032',
    hangDungDich: 'Bộ điều chỉnh điện áp tự động 3 pha 15kVA',
    hangNguonSach: 'Máy phân tích phổ tần số cao',
    nguonDich: 'nhom9032.nhom',
  },
  {
    tu: '9032',
    toi: '9030',
    hangDungDich: 'Đồng hồ đo dòng điện xoay chiều 3 pha',
    hangNguonSach: 'Bộ ổn nhiệt tự động dùng cho lò sấy',
    nguonDich: 'nhom9030.nhom',
  },
  {
    tu: '8536',
    toi: '9032',
    hangDungDich: 'Bộ điều chỉnh điện áp tự động 1 pha 10kVA',
    hangNguonSach: 'Phích cắm điện công nghiệp 3 pha 32A',
    nguonDich: 'nhom9032.nhom',
  },
  {
    tu: '9032',
    toi: '8536',
    hangDungDich: 'Rơ le bảo vệ mất pha và thấp áp 3 pha 380V',
    moTaMoRong: 'Đồng hồ đo áp, đo dòng, chống mất pha , 3pha -38',
    hangNguonSach: 'Bộ điều chỉnh áp lực tự động dùng cho máy nén',
    nguonDich: 'nhom8536.nhom',
  },
  // OZV-2084: 85.16 ↔ 85.33 (điện trở 8*60 mm, điện áp 220v, công suất 150w, chất liệu inox)
  {
    tu: '8516',
    toi: '8533',
    hangDungDich: 'Điện trở cố định 150W dùng trong mạch điện',
    moTaMoRong: 'điện trở 8*60 mm, điện áp 220v, công suất 150w, chất liệu inox',
    hangNguonSach: 'Bàn là điện hơi nước 1200W',
    nguonDich: 'nhom8533.nhom',
  },
  {
    tu: '8533',
    toi: '8516',
    hangDungDich: 'Điện trở đốt nóng bằng điện / thanh nhiệt điện trở inox',
    moTaMoRong: 'điện trở 8*60 mm, điện áp 220v, công suất 150w, chất liệu inox',
    hangNguonSach: 'Chiết áp xoay 10k ohm',
    nguonDich: 'nhom8516.nhom',
  },
  // OZV-2097: 82.10 ↔ 73.23 (Dụng cụ ép trái cây / thép không gỉ / ép trái cây (không hoạt động bằng điện))
  {
    tu: '8210',
    toi: '7323',
    hangDungDich: 'Khuôn vắt trái cây bằng thép không gỉ',
    moTaMoRong: 'Dụng cụ ép trái cây / thép không gỉ / ép trái cây (không hoạt động bằng điện)',
    hangNguonSach: 'Máy xay cà phê bằng tay nặng 2 kg',
    nguonDich: 'nhom7323.nhom',
  },
  {
    tu: '7323',
    toi: '8210',
    hangDungDich: 'Máy ép hoa quả bằng tay có trục vít nặng 3 kg',
    moTaMoRong: 'Dụng cụ ép trái cây / thép không gỉ / ép trái cây (không hoạt động bằng điện)',
    hangNguonSach: 'Nồi áp suất bằng thép không gỉ dùng cho nhà bếp',
    nguonDich: 'nhom8210.nhom',
  },
  // OZV-2122: 25.08 ↔ 38.24 (Đất bentonite cho chó mèo đi vệ sinh — thuần → 2508; đã thêm hương liệu/phụ gia → 3824)
  {
    tu: '2508',
    toi: '3824',
    hangDungDich: 'Đất bentonite cho chó mèo đi vệ sinh đã thêm hương liệu',
    moTaMoRong: 'Đất bentonite cho chó mèo đi vệ sinh / Bentonite / Vệ sinh thú cưng đã thêm hương liệu',
    hangNguonSach: 'Bentonite nghiền dùng lọc dầu và tẩy dầu mỡ',
    nguonDich: 'nhom3824.nhom',
  },
  {
    tu: '3824',
    toi: '2508',
    hangDungDich: 'Đất bentonite chỉ nghiền tạo hạt chưa thêm hương liệu',
    moTaMoRong: 'Đất bentonite cho chó mèo đi vệ sinh / Bentonite / chỉ nghiền tạo hạt chưa thêm hương liệu',
    hangNguonSach: 'Chế phẩm hóa học hỗn hợp dùng làm chất gắn lõi đúc',
    nguonDich: 'nhom2508.nhom',
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
  { hs: '90303390', target: '8536', ten: 'Đồng hồ đo điện áp xoay chiều 3 pha hiển thị LED' },
  { hs: '90303100', target: '9032', ten: 'Đồng hồ đo đa năng hiển thị số' },
  { hs: '85364990', target: '9030', ten: 'Rơ le điện từ 8 chân 220V dùng trong tủ điện' },
  { hs: '90328931', target: '9030', ten: 'Bộ điều chỉnh điện áp tự động 3 pha có đồng hồ hiển thị' },
  { hs: '85168010', target: '8533', ten: 'Điện trở đốt nóng bằng điện dùng cho lò công nghiệp' },
  { hs: '85164090', target: '8533', ten: 'Bàn là điện hơi nước 1200W' },
  { hs: '85334000', target: '8516', ten: 'Chiết áp xoay 10k ohm' },
  { hs: '85332900', target: '8516', ten: 'Điện trở cố định 150W dùng trong mạch điện' },
  { hs: '82100000', target: '7323', ten: 'Máy xay cà phê bằng tay có tay quay nặng 2 kg' },
  { hs: '82100000', target: '7323', ten: 'Dụng cụ đánh trứng cơ khí có bánh răng quay tay' },
  { hs: '73239310', target: '8210', ten: 'Nồi hấp bằng thép không gỉ dùng cho nhà bếp' },
  { hs: '73231000', target: '8210', ten: 'Bùi nhùi bằng thép dùng cọ nồi' },
  { hs: '25084090', target: '3824', ten: 'Bentonite nghiền dùng lọc dầu và tẩy dầu mỡ' },
  { hs: '38249999', target: '2508', ten: 'Chế phẩm hóa học hỗn hợp dùng làm chất gắn lõi đúc' },
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

// 4. OZV-2067: ca khách thực địa «đồng hồ đo áp, đo dòng, chống mất pha , 3pha -38» (dừng 6 số 903033 hoặc 853630)
//    sinh đủ câu hỏi phân biệt nhóm 4 số có căn cứ chú giải nguyên văn giữa 90.30 ↔ 85.36 ↔ 90.32, kèm ca ngược.
{
  const moTa = 'đồng hồ đo áp, đo dòng, chống mất pha , 3pha -38';
  const prevFlag = process.env.HS_HOI_THEO_SO_TAY;
  process.env.HS_HOI_THEO_SO_TAY = 'on';
  try {
    const out9030 = {
      status: 'NEED_FACTS',
      results: [{ hs: '903033', confidence: 52, hsLevel: 6 }],
      nextAction: {
        type: 'ASK_USER',
        questions: [
          { attribute: null, questionVi: 'Thiết bị có tích hợp tiếp điểm rơ-le tự động cắt mạch để bảo vệ mất pha hay chỉ đo và hiển thị điện áp, dòng điện?' },
        ],
      },
      dossier: {
        product: { nameVi: 'Đồng hồ đo áp, đo dòng, chống mất pha 3 pha' },
        hypotheses: [
          { chapter: '90', heading4: '9030', subheading6: '903033', confidence: 52 },
          { chapter: '85', heading4: '8536', subheading6: '853630', confidence: 33 },
          { chapter: '90', heading4: '9032', subheading6: '903289', confidence: 15 },
        ],
      },
      missingStructured: [],
    };
    const kq9030 = H.apDung(out9030, { rawAttrs: { tenHang: moTa } });
    const qs9030 = kq9030.nextAction?.questions || [];
    const pb9030 = qs9030.filter((q) => q.loai === 'PHAN_BIET_NHOM');
    check('OZV-2067 (thuận · dừng 903033): sinh 2 câu PHAN_BIET_NHOM (90.30↔85.36 từ ch90.chuong và 90.30↔90.32 từ nhom9032.nhom) + câu DONG_8 có đủ canCu/nguon/trich',
      kq9030.nextAction?.canCuCauHoi === 'so-tay'
      && pb9030.length === 2
      && pb9030.some((q) => q.canCu === 'so-tay' && q.nguon === 'ch90.chuong' && /85\.36/.test(q.questionVi))
      && pb9030.some((q) => q.canCu === 'so-tay' && q.nguon === 'nhom9032.nhom' && /90\.32/.test(q.questionVi))
      && qs9030.some((q) => q.loai === 'DONG_8' && q.canCu === 'ranh-gioi-pn6'),
      JSON.stringify(qs9030));

    const out8536 = {
      ...out9030,
      results: [{ hs: '853630', confidence: 48, hsLevel: 6 }],
      dossier: {
        ...out9030.dossier,
        hypotheses: [
          { chapter: '85', heading4: '8536', subheading6: '853630', confidence: 48 },
          { chapter: '90', heading4: '9030', subheading6: '903033', confidence: 37 },
          { chapter: '90', heading4: '9032', subheading6: '903289', confidence: 15 },
        ],
      },
    };
    const kq8536 = H.apDung(out8536, { rawAttrs: { tenHang: moTa } });
    const pb8536 = (kq8536.nextAction?.questions || []).filter((q) => q.loai === 'PHAN_BIET_NHOM');
    check('OZV-2067 (thuận · dừng 853630): sinh 2 câu PHAN_BIET_NHOM (85.36↔90.30 từ phan85.phan và 85.36↔90.32 từ nhom9032.nhom)',
      kq8536.nextAction?.canCuCauHoi === 'so-tay'
      && pb8536.length === 2
      && pb8536.some((q) => q.canCu === 'so-tay' && q.nguon === 'phan85.phan' && /90\.30/.test(q.questionVi))
      && pb8536.some((q) => q.canCu === 'so-tay' && q.nguon === 'nhom9032.nhom' && /90\.32/.test(q.questionVi)),
      JSON.stringify(pb8536));

    const pbNguoc9030 = H.cauPhanBietNhom('9030', ['9030', '8536', '9032'], 'máy hiện sóng kỹ thuật số 100MHz 2 kênh');
    const pbNguoc8536 = H.cauPhanBietNhom('8536', ['8536', '9030', '9032'], 'phích cắm điện 2 chấu bằng nhựa 250V 10A');
    check('OZV-2067 (ngược): "máy hiện sóng kỹ thuật số" và "phích cắm điện 2 chấu" không chạm đồng hồ đo áp / chống mất pha → không hỏi oan',
      pbNguoc9030.length === 0 && pbNguoc8536.length === 0,
      JSON.stringify({ pbNguoc9030, pbNguoc8536 }));
  } finally {
    if (prevFlag === undefined) delete process.env.HS_HOI_THEO_SO_TAY;
    else process.env.HS_HOI_THEO_SO_TAY = prevFlag;
  }
}

// 5. OZV-2084: ca khách thực địa «điện trở 8*60 mm, điện áp 220v, công suất 150w, chất liệu inox» (dừng 6 số 851680 hoặc 853329)
//    sinh đủ câu hỏi phân biệt nhóm 4 số có căn cứ chú giải nguyên văn giữa 85.16 ↔ 85.33, kèm ca ngược.
{
  const moTa = 'điện trở 8*60 mm, điện áp 220v, công suất 150w, chất liệu inox';
  const prevFlag = process.env.HS_HOI_THEO_SO_TAY;
  process.env.HS_HOI_THEO_SO_TAY = 'on';
  try {
    const out8516 = {
      status: 'NEED_FACTS',
      results: [{ hs: '851680', confidence: 55, hsLevel: 6 }],
      nextAction: {
        type: 'ASK_USER',
        questions: [
          { attribute: null, questionVi: 'Điện trở này dùng để đốt nóng / gia nhiệt hay dùng trong mạch điện?' },
        ],
      },
      dossier: {
        product: { nameVi: 'Điện trở 8*60 mm, điện áp 220v, công suất 150w, chất liệu inox' },
        hypotheses: [
          { chapter: '85', heading4: '8516', subheading6: '851680', confidence: 55 },
          { chapter: '85', heading4: '8533', subheading6: '853329', confidence: 35 },
        ],
      },
      missingStructured: [],
    };
    const kq8516 = H.apDung(out8516, { rawAttrs: { tenHang: moTa } });
    const qs8516 = kq8516.nextAction?.questions || [];
    const pb8516 = qs8516.filter((q) => q.loai === 'PHAN_BIET_NHOM');
    check('OZV-2084 (thuận · dừng 851680): sinh câu PHAN_BIET_NHOM (85.16↔85.33 từ nhom8516.nhom) + câu DONG_8 có đủ canCu/nguon/trich',
      kq8516.nextAction?.canCuCauHoi === 'so-tay'
      && pb8516.length === 1
      && pb8516[0].canCu === 'so-tay'
      && pb8516[0].nguon === 'nhom8516.nhom'
      && /85\.33/.test(pb8516[0].questionVi)
      && qs8516.some((q) => q.loai === 'DONG_8' && q.canCu === 'ranh-gioi-pn6'),
      JSON.stringify(qs8516));

    const out8533 = {
      ...out8516,
      results: [{ hs: '853329', confidence: 52, hsLevel: 6 }],
      dossier: {
        ...out8516.dossier,
        hypotheses: [
          { chapter: '85', heading4: '8533', subheading6: '853329', confidence: 52 },
          { chapter: '85', heading4: '8516', subheading6: '851680', confidence: 38 },
        ],
      },
    };
    const kq8533 = H.apDung(out8533, { rawAttrs: { tenHang: moTa } });
    const pb8533 = (kq8533.nextAction?.questions || []).filter((q) => q.loai === 'PHAN_BIET_NHOM');
    const pbThanhNhiet = H.cauPhanBietNhom('8533', ['8533', '8516'], 'Điện trở đốt nóng bằng điện / thanh nhiệt điện trở inox');
    check('OZV-2084 (thuận · dừng 853329): sinh câu PHAN_BIET_NHOM (85.33↔85.16 từ nhom8533.nhom) và khớp cả "Điện trở đốt nóng bằng điện / thanh nhiệt điện trở inox"',
      kq8533.nextAction?.canCuCauHoi === 'so-tay'
      && pb8533.length === 1
      && pb8533[0].canCu === 'so-tay'
      && pb8533[0].nguon === 'nhom8533.nhom'
      && /85\.16/.test(pb8533[0].questionVi)
      && pbThanhNhiet.length === 1
      && pbThanhNhiet[0].nguon === 'nhom8533.nhom',
      JSON.stringify({ pb8533, pbThanhNhiet }));

    const pbNguoc8516 = H.cauPhanBietNhom('8516', ['8516', '8533'], 'bàn là điện hơi nước 1200W');
    const pbNguoc8533 = H.cauPhanBietNhom('8533', ['8533', '8516'], 'chiết áp xoay 10k ohm');
    check('OZV-2084 (ngược): "bàn là điện hơi nước 1200W" và "chiết áp xoay 10k ohm" không hỏi oan 85.16↔85.33',
      pbNguoc8516.length === 0 && pbNguoc8533.length === 0,
      JSON.stringify({ pbNguoc8516, pbNguoc8533 }));
  } finally {
    if (prevFlag === undefined) delete process.env.HS_HOI_THEO_SO_TAY;
    else process.env.HS_HOI_THEO_SO_TAY = prevFlag;
  }
}

// 6. OZV-2097: ca 19 tầng 4 số «Dụng cụ ép trái cây / thép không gỉ / ép trái cây (không hoạt động bằng điện)» (dừng 6 số 821000 hoặc 732393)
//    sinh đủ câu hỏi phân biệt nhóm 4 số có căn cứ chú giải nguyên văn giữa 82.10 ↔ 73.23, kèm ca ngược.
{
  const moTa = 'Dụng cụ ép trái cây / thép không gỉ / ép trái cây (không hoạt động bằng điện)';
  const prevFlag = process.env.HS_HOI_THEO_SO_TAY;
  process.env.HS_HOI_THEO_SO_TAY = 'on';
  try {
    const out8210 = {
      status: 'NEED_FACTS',
      results: [{ hs: '821000', confidence: 54, hsLevel: 6 }],
      nextAction: {
        type: 'ASK_USER',
        questions: [
          { attribute: null, questionVi: 'Dụng cụ có cơ cấu cơ khí (tay quay, bánh răng, trục vít, đòn bẩy gắn đế đặt bàn) hay chỉ là khuôn/chén vắt bằng tay đơn giản?' },
        ],
      },
      dossier: {
        product: { nameVi: 'Dụng cụ ép trái cây bằng thép không gỉ không hoạt động bằng điện' },
        hypotheses: [
          { chapter: '82', heading4: '8210', subheading6: '821000', confidence: 54 },
          { chapter: '73', heading4: '7323', subheading6: '732393', confidence: 36 },
        ],
      },
      missingStructured: [],
    };
    const kq8210 = H.apDung(out8210, { rawAttrs: { tenHang: moTa } });
    const qs8210 = kq8210.nextAction?.questions || [];
    const pb8210 = qs8210.filter((q) => q.loai === 'PHAN_BIET_NHOM');
    check('OZV-2097 (thuận · dừng 821000): sinh câu PHAN_BIET_NHOM (82.10↔73.23 từ nhom8210.nhom) có đủ canCu/nguon/trich',
      kq8210.nextAction?.canCuCauHoi === 'so-tay'
      && pb8210.length === 1
      && pb8210[0].canCu === 'so-tay'
      && pb8210[0].nguon === 'nhom8210.nhom'
      && /73\.23/.test(pb8210[0].questionVi),
      JSON.stringify(qs8210));

    const out7323 = {
      ...out8210,
      results: [{ hs: '732393', confidence: 51, hsLevel: 6 }],
      dossier: {
        ...out8210.dossier,
        hypotheses: [
          { chapter: '73', heading4: '7323', subheading6: '732393', confidence: 51 },
          { chapter: '82', heading4: '8210', subheading6: '821000', confidence: 39 },
        ],
      },
    };
    const kq7323 = H.apDung(out7323, { rawAttrs: { tenHang: moTa } });
    const pb7323 = (kq7323.nextAction?.questions || []).filter((q) => q.loai === 'PHAN_BIET_NHOM');
    check('OZV-2097 (thuận · dừng 732393): sinh câu PHAN_BIET_NHOM (73.23↔82.10 từ nhom7323.nhom) có đủ canCu/nguon/trich',
      kq7323.nextAction?.canCuCauHoi === 'so-tay'
      && pb7323.length === 1
      && pb7323[0].canCu === 'so-tay'
      && pb7323[0].nguon === 'nhom7323.nhom'
      && /82\.10/.test(pb7323[0].questionVi),
      JSON.stringify(pb7323));

    const pbNguoc8210 = H.cauPhanBietNhom('8210', ['8210', '7323'], 'máy xay cà phê bằng tay có tay quay nặng 2 kg');
    const pbNguoc7323 = H.cauPhanBietNhom('7323', ['7323', '8210'], 'nồi áp suất bằng thép không gỉ dùng cho nhà bếp');
    check('OZV-2097 (ngược): "máy xay cà phê bằng tay" và "nồi áp suất bằng thép không gỉ" không hỏi oan 82.10↔73.23',
      pbNguoc8210.length === 0 && pbNguoc7323.length === 0,
      JSON.stringify({ pbNguoc8210, pbNguoc7323 }));
  } finally {
    if (prevFlag === undefined) delete process.env.HS_HOI_THEO_SO_TAY;
    else process.env.HS_HOI_THEO_SO_TAY = prevFlag;
  }
}

// 7. OZV-2122: ca 190 tầng 4 số «Đất bentonite cho chó mèo đi vệ sinh / Bentonite / Vệ sinh thú cưng»
//    sinh đủ câu hỏi phân biệt nhóm 4 số có căn cứ chú giải nguyên văn giữa 25.08 ↔ 38.24, kèm ca ngược.
{
  const moTa = 'Đất bentonite cho chó mèo đi vệ sinh / Bentonite / Vệ sinh thú cưng đã thêm hương liệu';
  const prevFlag = process.env.HS_HOI_THEO_SO_TAY;
  process.env.HS_HOI_THEO_SO_TAY = 'on';
  try {
    const out2508 = {
      status: 'NEED_FACTS',
      results: [{ hs: '250840', confidence: 54, hsLevel: 6 }],
      nextAction: {
        type: 'ASK_USER',
        questions: [
          { attribute: null, questionVi: 'Đất bentonite thuần nghiền/tạo hạt hay đã thêm hương liệu/chất phụ gia?' },
        ],
      },
      dossier: {
        product: { nameVi: 'Đất bentonite cho chó mèo đi vệ sinh' },
        hypotheses: [
          { chapter: '25', heading4: '2508', subheading6: '250840', confidence: 54 },
          { chapter: '38', heading4: '3824', subheading6: '382499', confidence: 36 },
        ],
      },
      missingStructured: [],
    };
    const kq2508 = H.apDung(out2508, { rawAttrs: { tenHang: moTa } });
    const qs2508 = kq2508.nextAction?.questions || [];
    const pb2508 = qs2508.filter((q) => q.loai === 'PHAN_BIET_NHOM');
    check('OZV-2122 (thuận · dừng 250840): sinh câu PHAN_BIET_NHOM (25.08↔38.24 từ ch25.chuong) có đủ canCu/nguon/trich',
      kq2508.nextAction?.canCuCauHoi === 'so-tay'
      && pb2508.length >= 1
      && pb2508.some((q) => q.canCu === 'so-tay' && q.nguon === 'ch25.chuong' && /38\.24/.test(q.questionVi)),
      JSON.stringify(qs2508));

    const out3824 = {
      ...out2508,
      results: [{ hs: '382499', confidence: 51, hsLevel: 6 }],
      dossier: {
        ...out2508.dossier,
        hypotheses: [
          { chapter: '38', heading4: '3824', subheading6: '382499', confidence: 51 },
          { chapter: '25', heading4: '2508', subheading6: '250840', confidence: 39 },
        ],
      },
    };
    const kq3824 = H.apDung(out3824, { rawAttrs: { tenHang: moTa } });
    const pb3824 = (kq3824.nextAction?.questions || []).filter((q) => q.loai === 'PHAN_BIET_NHOM');
    check('OZV-2122 (thuận · dừng 382499): sinh câu PHAN_BIET_NHOM (38.24↔25.08 từ ch38.chuong) có đủ canCu/nguon/trich',
      kq3824.nextAction?.canCuCauHoi === 'so-tay'
      && pb3824.length >= 1
      && pb3824.some((q) => q.canCu === 'so-tay' && q.nguon === 'ch38.chuong' && /25\.08/.test(q.questionVi)),
      JSON.stringify(pb3824));

    const pbNguoc2508 = H.cauPhanBietNhom('2508', ['2508', '3824'], 'Bentonite nghiền dùng lọc dầu và tẩy dầu mỡ');
    const pbNguoc3824 = H.cauPhanBietNhom('3824', ['3824', '2508'], 'Chế phẩm hóa học hỗn hợp dùng làm chất gắn lõi đúc');
    check('OZV-2122 (ngược): "Bentonite nghiền lọc dầu" và "chế phẩm gắn lõi đúc" không hỏi oan 25.08↔38.24',
      pbNguoc2508.length === 0 && pbNguoc3824.length === 0,
      JSON.stringify({ pbNguoc2508, pbNguoc3824 }));
  } finally {
    if (prevFlag === undefined) delete process.env.HS_HOI_THEO_SO_TAY;
    else process.env.HS_HOI_THEO_SO_TAY = prevFlag;
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
