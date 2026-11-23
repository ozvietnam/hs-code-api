#!/usr/bin/env node
/**
 * Khoá chặt ba thứ mà RFC "Loại khác + tên thương mại" đặt ra, và một thứ RFC
 * không đặt ra nhưng nguy hiểm hơn cả ba.
 *
 *  1. TỪ ĐIỂN TÊN THƯƠNG MẠI phải kéo đúng mã lên đầu cho những câu hỏi mà kho
 *     tờ khai Oz không trả lời được (chương 72 chỉ có 1 bản ghi).
 *
 *  2. MÃ BẪY phải bị loại HẲN, không phải chỉ tụt hạng. Hỏi "tấm thép làm khuôn
 *     nhựa" mà thấy bộ khuôn 8480 nằm hạng hai thì người khai vẫn gật — tên hàng
 *     nghe khớp hoàn toàn.
 *
 *  3. CẢNH BÁO VAT phải hiện. 1.561 mã không được giảm theo NĐ 174/2025; khai
 *     8% cho thép cán nóng là bị truy thu.
 *
 *  4. (thứ RFC không nêu) TỪ ĐIỂN KHÔNG ĐƯỢC LAN SANG CÂU KHÔNG LIÊN QUAN.
 *     "inverter" trong "máy điều hòa inverter" là tính năng, không phải mặt
 *     hàng 8504. Một bảng tra tay sai ở đây thì sai có hệ thống, lần nào cũng
 *     sai — nguy hiểm hơn thống kê sai lẻ tẻ.
 */
import './test-isolate-data.mjs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { lookupTradeTerms, tradeTermStats } = require(join(ROOT, 'lib', 'trade-synonyms.js'));
const { searchCandidates } = require(join(ROOT, 'lib', 'search-utils.js'));
const { tradeClassifyHints, biCamTrade, tradePreferredHs } = require(join(ROOT, 'lib', 'trade-classify-hints.js'));
const { breadcrumbOf, contextOf } = require(join(ROOT, 'lib', 'hs-breadcrumb.js'));
const { vatReductionOf, vatWarningTextOf } = require(join(ROOT, 'lib', 'vat-reduction.js'));
const taxData = require(join(ROOT, 'data', 'tax.json'));
const thesaurus = require(join(ROOT, 'data', 'trade-synonyms.json'));

let failed = 0;
function check(name, cond, detail = '') {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

console.log('\n== Mọi mã trong từ điển phải có thật trong biểu thuế hiện hành ==');
{
  // hs 8 số phải là lá có thật; hs 4/6 số (ứng viên cấp nhóm) phải có ít nhất một lá.
  const leafKeys = Object.keys(taxData).filter((k) => /^\d{8}$/.test(k));
  const dead = [];
  for (const e of thesaurus.entries)
    for (const c of e.candidates) {
      const hs = String(c.hs);
      const alive = hs.length === 8 ? Boolean(taxData[hs]) : [4, 6].includes(hs.length) && leafKeys.some((k) => k.startsWith(hs));
      if (!alive) dead.push(`${e.id}:${hs}`);
    }
  check('không có mã chết (8 số phải là lá; 4/6 số phải có lá)', dead.length === 0, dead.join(', '));
  const noSource = thesaurus.entries.filter((e) => !e.sourceVi).map((e) => e.id);
  check('mục nào cũng có dẫn chứng sourceVi', noSource.length === 0, noSource.join(', '));
  const badConf = [];
  for (const e of thesaurus.entries)
    for (const c of e.candidates)
      if (!['high', 'medium', 'low'].includes(c.confidence)) badConf.push(`${e.id}:${c.hs}`);
  check('độ tin cậy dùng đúng ba mức', badConf.length === 0, badConf.join(', '));
  const noWhen = [];
  for (const e of thesaurus.entries)
    for (const c of e.candidates)
      if (!c.whenVi) noWhen.push(`${e.id}:${c.hs}`);
  check('ứng viên nào cũng nói rõ áp dụng KHI NÀO', noWhen.length === 0, noWhen.join(', '));
}

console.log('\n== Câu hỏi thật của khách phải ra đúng mã (kho Oz không trả lời nổi) ==');
{
  // Chương 72 trong kho tờ khai Oz đúng 1 bản ghi — alias tự động bó tay.
  const cases = [
    ['tấm thép làm khuôn nhựa', ['72254090', '72269190']],
    ['thép P20 làm khuôn', ['72254090', '72269190']],
    ['quạt điều hòa hơi nước', ['84796000']],
    ['bình giữ nhiệt chân không', ['96170010']],
    ['biến tần 3 pha', ['85044090', '85044040', '85044030']],
    ['van điện từ khí nén', ['84812090', '84812011', '84812020']],
    ['solenoid valve', ['84812090', '84812011', '84812020']],
    ['van bếp ga', ['84818030']],
    ['van ngắt nhiên liệu xe', ['84818083', '84818084', '84818093']],
    ['thép cuộn cán nóng', ['72083990', '72083700', '72083600', '72083800', '72083910', '72081000', '72082500']],
    ['hot rolled coil', ['72083990', '72083700', '72083600', '72083800', '72081000', '72082500', '72082600']],
    ['thép cuộn cán nguội', ['72099090', '72092890', '72092790', '72091790', '72091810', '72091500']],
    ['thép hình H', ['72163190', '72163390', '72161000', '72163290', '72163311']],
    ['van giảm áp', ['84811011', '84811019', '84811021', '84811022', '84811091', '84811099']],
    ['tủ plc', ['85371012', '85371030', '85371019']],
    ['bảng điều khiển plc', ['85371012', '85371030', '85371019']],
    ['dcs panel', ['85371011', '85371092']],
    ['tủ trung thế 22kv', ['85372011', '85372021', '85372019', '85372029', '85372090']],
    ['bàn nâng thủy lực', ['84289090', '84289030', '84289020']],
    ['scissor lift', ['84289090']],
    ['forklift', ['84271000', '84272000', '84279000']],
    ['thang cuốn', ['84284000', '84281031', '84281039', '84281040']],
    // OZV-1237 — đo A1 16/11: API thô NEEDS_EXPERT vì thiếu từ điển tên chợ
    ['Khuôn sứ (ceramic hand former) dùng để sản xuất găng tay', ['69141000']],
    ['ceramic hand former for glove production', ['69141000']],
    ['Kệ chứa hàng pallet (kệ kho hàng, pallet rack) bằng kim loại, đã qua sử dụng', ['94032090']],
    ['pallet rack metal warehouse', ['94032090']],
    // OZV-1256 — A2/khách: «bộ lọc khí zonye ar2000 -02» lệch máy lọc phòng 84213920
    ['bộ lọc khí zonye ar2000 -02', ['84812011', '84812090']],
    // OZV-1305 — search không top residual 84812090; ưu tiên 84812011 (sắt/thép)
    ['bộ lọc khí zonye ar2000', ['84812011']],
    ['bo loc khi zonye ar2000', ['84812011']],
    ['bộ lọc khí nén af2000', ['84213990', '84213930', '84812090']],
    // OZV-1261 — A2/khách: «giác hút chân không smc zp-905…» lệch phụ tùng máy nén 841490*
    ['giác hút chân không smc zp-905-08eu', ['40169999', '40169959', '39269099']],
    ['núm hút chân không cao su silicone', ['40169999', '40169959']],
    ['vacuum pad smc zp2', ['40169999', '40169959', '39269099']],
    // OZV-1304 — đai dẹt T10 = đai đồng bộ; không top-1 residual 40103900 / nhựa 39269053
    ['dây đai dẹt t10-259-e, truyền lực', ['40103500', '40103600']],
    ['dây đai dẹt t10-259-e', ['40103500', '40103600']],
    ['dây curoa cao su', ['40103500', '40103600']],
    // OZV-1277 — đo A1 16/11: ca 31 (83025000) lệch nội thất 94031000
    ['Giàn phơi quần áo thông minh (laundry drying rack) gắn trần hoặc gắn tường', ['83025000']],
    ['laundry drying rack ceiling mounted stainless steel', ['83025000']],
    // OZV-1282 — A1/khách: «camera truyền hình cmr12» (MIC nhiễu 8544/8471)
    ['camera truyền hình cmr12', ['85258920']],
    ['camera quan sát an ninh CCTV', ['85258920']],
    ['surveillance camera outdoor IP', ['85258920']],
    // OZV-1298 — câu ngắn thiếu «truyền hình» vẫn về 85258920 (trước lệch 9001/9002)
    ['camera cmr12', ['85258920']],
    ['camera giám sát IP', ['85258920']],
    // OZV-1306 — đèn LED cắm tường hình gấu: top thuộc 9405, hết nhiễu ống CRT 8540
    ['đèn led cắm tường hình gấu', ['94051199', '94054290']],
    ['đèn led cắm tường hình thỏ', ['94051199', '94054290']],
    ['den led cam tuong', ['94051199', '94054290']],
    // OZV-1315 — A1 STT 26: strip CRC khổ hẹp → 72112390, hết lệch 72091610
    [
      'Thép không hợp kim cán phẳng dạng cuộn cán nguội (cold rolled steel strip in coil, SPCC-4B), hàm lượng carbon dưới 0,25%, chiều dày 1 mm, chiều rộng 450 mm (dưới 600 mm), chưa phủ, mạ hoặc tráng, không gia công quá mức cán nguội',
      ['72112390'],
    ],
    ['cold rolled steel strip in coil SPCC-4B width 450 mm', ['72112390']],
    // OZV-1316 — A1 STT 10: nhãn nhựa tự dính PET → 39199092 (TB 16238), không 4911
    ['Nhãn nhựa tự dính đã in (PLASTIC LABEL, tem nhãn) dạng chiếc phẳng 26x12 mm, dạng cuộn', ['39199092']],
    ['nhãn nhựa tự dính đã in PET', ['39199092']],
    ['plastic label self-adhesive PET', ['39199092']],
    // OZV-1239 — đo A1 16/11: ca 6 (32064990) và ca 40 (85081100)
    ['Aluminium powder (bột nhôm): chất màu vô cơ', ['32064990']],
    ['industrial vacuum cleaner Nilfisk model VHW310', ['85081100', '85081910', '85081990']],
    // OZV-2015 — túi sưởi điện gia dụng: trước search top 85362020; chốt 63011000
    ['túi sưởi điện gia dụng', ['63011000']],
  ];
  for (const [q, want] of cases) {
    const top2 = searchCandidates(q, { topCandidates: 2 }).map((c) => c.hsCode);
    check(`"${q}" → ${want[0]} trong top 2`, top2.some((h) => want.includes(h)), `nhận ${top2.join(',')}`);
  }
}

console.log('\n== Mã bẫy phải bị loại HẲN, không phải tụt hạng ==');
{
  const steel = searchCandidates('tấm thép làm khuôn nhựa', { topCandidates: 50 });
  check('không còn bộ khuôn 8480 nào', steel.every((c) => !c.hsCode.startsWith('8480')));
  check('có ghi lại mã đã loại + lý do', (steel.avoidedByTradeRules || []).length > 0);
  check(
    'lý do loại nói rõ nguyên liệu ≠ thành phẩm',
    (steel.avoidedByTradeRules || []).some((a) => /nguyên liệu|thành hình|thành phẩm/i.test(a.whyVi))
  );

  const flask = searchCandidates('bình giữ nhiệt chân không', { topCandidates: 50 });
  check('bình chân không không lẫn đồ bếp 7323', flask.every((c) => !c.hsCode.startsWith('7323')));

  const cooler = searchCandidates('quạt điều hòa hơi nước', { topCandidates: 50 });
  check('máy làm mát bay hơi không lẫn 8415', cooler.every((c) => !c.hsCode.startsWith('8415')));
  check('máy làm mát bay hơi không lẫn quạt 8414', cooler.every((c) => !c.hsCode.startsWith('8414')));

  const pneu = searchCandidates('van điện từ khí nén', { topCandidates: 50 });
  check('van khí nén không lẫn van bếp 84818030', pneu.every((c) => c.hsCode !== '84818030'));
  check('van khí nén không lẫn van nhiên liệu xe 84818083', pneu.every((c) => !c.hsCode.startsWith('8481808')));
  check('van khí nén không lẫn dụng cụ đo 9032', pneu.every((c) => !c.hsCode.startsWith('9032')));

  const stove = searchCandidates('van bếp ga', { topCandidates: 50 });
  check('van bếp không lẫn 848120', stove.every((c) => !c.hsCode.startsWith('848120')));
  check('van bếp không lẫn bếp nguyên chiếc 7321', stove.every((c) => !c.hsCode.startsWith('7321')));

  const former = searchCandidates('Khuôn sứ (ceramic hand former) dùng để sản xuất găng tay', { topCandidates: 50 });
  check('hand former không lẫn khung ô 6603', former.every((c) => !c.hsCode.startsWith('6603')));
  check('hand former không lẫn máy cao su 8477', former.every((c) => !c.hsCode.startsWith('8477')));

  const rack = searchCandidates('Kệ chứa hàng pallet (kệ kho hàng, pallet rack) bằng kim loại', { topCandidates: 50 });
  check('pallet rack không lẫn cầu/kết cấu 7308', rack.every((c) => !c.hsCode.startsWith('7308')));
  check('pallet rack không lẫn sản phẩm thép dư 7326', rack.every((c) => !c.hsCode.startsWith('7326')));

  const ar2000 = searchCandidates('bộ lọc khí zonye ar2000 -02', { topCandidates: 50 });
  check('AR2000 khí nén không lẫn máy lọc phòng 84213920', ar2000.every((c) => c.hsCode !== '84213920'));
  check('AR2000 khí nén không lẫn lọc khí thải động cơ 842132', ar2000.every((c) => !c.hsCode.startsWith('842132')));
  // OZV-1305 — model AR = điều áp 8481.20; top không residual 84812090 / máy khí 8405
  const ar2000plain = searchCandidates('bộ lọc khí zonye ar2000', { topCandidates: 5 });
  check('OZV-1305 top1 AR2000 = 84812011 (8 số)', ar2000plain[0]?.hsCode === '84812011', `nhận ${ar2000plain[0]?.hsCode}`);
  check(
    'OZV-1305 AR2000 top1 không còn residual 84812090',
    ar2000plain[0]?.hsCode !== '84812090',
    `nhận ${ar2000plain[0]?.hsCode}`,
  );
  check(
    'OZV-1286 AR2000 không còn 842139* trong top',
    ar2000plain.every((c) => !c.hsCode.startsWith('842139')),
    `top ${ar2000plain.map((c) => c.hsCode).join(',')}`,
  );
  // OZV-1300 — classify prod lệch 842199 (phụ tùng lọc); avoid phải phủ cả nhóm 8421
  check(
    'OZV-1300 AR2000 không còn 8421* trong top3',
    ar2000plain.slice(0, 3).every((c) => !c.hsCode.startsWith('8421')),
    `top3 ${ar2000plain.slice(0, 3).map((c) => c.hsCode).join(',')}`,
  );
  check(
    'OZV-1305 AR2000 không còn 8405* trong top3 (máy sản xuất khí + bộ lọc)',
    ar2000plain.slice(0, 3).every((c) => !c.hsCode.startsWith('8405')),
    `top3 ${ar2000plain.slice(0, 3).map((c) => c.hsCode).join(',')}`,
  );
  const arHit = lookupTradeTerms('bộ lọc khí zonye ar2000');
  const arEntry = (arHit.matches || []).find((m) => m.entryId === 'dieu-ap-khi-nen-ar');
  check(
    'OZV-1300 AR avoid phủ 8421 (kèm 842199 phụ tùng lọc)',
    (arEntry?.avoid || []).some((a) => String(a.prefix) === '8421'),
    (arEntry?.avoid || []).map((a) => a.prefix),
  );
  check(
    'OZV-1307 AR avoid residual 84812090 (classify không CHOT .90)',
    (arEntry?.avoid || []).some((a) => String(a.prefix) === '84812090'),
    (arEntry?.avoid || []).map((a) => a.prefix),
  );
  check(
    'OZV-1313 AR avoid 848110 (van giảm áp — không lạc sang 8481.10)',
    (arEntry?.avoid || []).some((a) => String(a.prefix) === '848110'),
    (arEntry?.avoid || []).map((a) => a.prefix),
  );

  const pad = searchCandidates('giác hút chân không smc zp-905-08eu', { topCandidates: 50 });
  check('giác hút SMC không lẫn phụ tùng bơm/máy nén 841490', pad.every((c) => !c.hsCode.startsWith('841490')));
  check('giác hút SMC không lẫn bơm chân không 841410', pad.every((c) => c.hsCode !== '84141000'));

  const gianPhoi = searchCandidates(
    'Giàn phơi quần áo thông minh (laundry drying rack) gắn trần hoặc gắn tường, thanh thép không gỉ và polycarbonate, nâng hạ bằng ròng rọc dây kéo tay',
    { topCandidates: 50 }
  );
  check('giàn phơi không lẫn đồ nội thất 9403', gianPhoi.every((c) => !c.hsCode.startsWith('9403')));
  check('giàn phơi không lẫn sản phẩm thép dư 7326', gianPhoi.every((c) => !c.hsCode.startsWith('7326')));
  check('giàn phơi không lẫn bánh đà/ròng rọc 8483', gianPhoi.every((c) => !c.hsCode.startsWith('8483')));

  const camCctv = searchCandidates('camera truyền hình cmr12', { topCandidates: 50 });
  check('camera truyền hình không lẫn dây/cáp 8544', camCctv.every((c) => !c.hsCode.startsWith('8544')));
  check('camera truyền hình không lẫn máy ảnh 9006', camCctv.every((c) => !c.hsCode.startsWith('9006')));
  check('camera truyền hình không lẫn ổ cứng/máy tính 8471', camCctv.every((c) => !c.hsCode.startsWith('8471')));
  check('camera truyền hình không lẫn tủ điện 8537', camCctv.every((c) => !c.hsCode.startsWith('8537')));
  // OZV-1298 — câu ngắn + avoid thấu kính 9001/9002
  const camShort = searchCandidates('camera cmr12', { topCandidates: 50 });
  check('camera cmr12 top1 = 85258920', camShort[0]?.hsCode === '85258920', `nhận ${camShort[0]?.hsCode}`);
  check('camera cmr12 không lẫn thấu kính 9001', camShort.every((c) => !c.hsCode.startsWith('9001')));
  check('camera cmr12 không lẫn thấu kính 9002', camShort.every((c) => !c.hsCode.startsWith('9002')));
  const lens = searchCandidates('thấu kính máy ảnh', { topCandidates: 5 });
  check('đối chứng thấu kính máy ảnh vẫn 9001*', lens[0]?.hsCode?.startsWith('9001'), `nhận ${lens[0]?.hsCode}`);

  // OZV-1306 — «hình gấu/thỏ» không được kéo ống CRT 8540 / đầu cắm 9834 vào top
  const denLed = searchCandidates('đèn led cắm tường hình gấu', { topCandidates: 5 });
  check(
    'OZV-1306 top1 đèn LED tường thuộc 9405',
    denLed[0]?.hsCode?.startsWith('9405'),
    `nhận ${denLed[0]?.hsCode}`,
  );
  check(
    'OZV-1306 top3 không còn 8540 (ống CRT)',
    denLed.slice(0, 3).every((c) => !c.hsCode.startsWith('8540')),
    `top3 ${denLed.slice(0, 3).map((c) => c.hsCode).join(',')}`,
  );
  check(
    'OZV-1306 top3 không còn 9834 (đầu cắm đèn chân không)',
    denLed.slice(0, 3).every((c) => !c.hsCode.startsWith('9834')),
    `top3 ${denLed.slice(0, 3).map((c) => c.hsCode).join(',')}`,
  );
  check(
    'OZV-1306 avoided ghi 8540',
    (denLed.avoidedByTradeRules || []).some((a) => String(a.prefix) === '8540' || String(a.hsCode || '').startsWith('8540')),
  );

  // OZV-1315 — STT 26 strip khổ hẹp: top 72112390, loại hẳn 7209; STT 25 rộng vẫn 7209
  const stt26 =
    'Thép không hợp kim cán phẳng dạng cuộn cán nguội (cold rolled steel strip in coil, SPCC-4B), hàm lượng carbon dưới 0,25%, chiều dày 1 mm, chiều rộng 450 mm (dưới 600 mm), chưa phủ, mạ hoặc tráng, không gia công quá mức cán nguội';
  const hep = searchCandidates(stt26, { topCandidates: 8 });
  check(
    'OZV-1315 STT26 top1 = 72112390',
    hep[0]?.hsCode === '72112390',
    `nhận ${hep[0]?.hsCode}`,
  );
  check(
    'OZV-1315 STT26 top không còn 7209*',
    hep.every((c) => !String(c.hsCode).startsWith('7209')),
    `top ${hep.map((c) => c.hsCode).join(',')}`,
  );
  check(
    'OZV-1315 STT26 avoided 7209',
    (hep.avoidedByTradeRules || []).some((a) => String(a.prefix) === '7209' || String(a.hsCode || '').startsWith('7209')),
  );
  const hit26 = lookupTradeTerms(stt26);
  check(
    'OZV-1315 lookup khớp thep-dai-can-nguoi-hep',
    (hit26.matches || []).some((m) => m.entryId === 'thep-dai-can-nguoi-hep'),
  );
  check(
    'OZV-1315 CRC rộng bị exclude khi có dưới 600 / strip',
    (hit26.excluded || []).some((e) => e.entryId === 'thep-cuon-can-nguoi'),
  );
  const stt25 =
    'Thép cuộn cán nguội, cán phẳng, không hợp kim, chưa tráng phủ mạ sơn, tiêu chuẩn JIS G3141, mác thép SPCC-SD, kích thước 1,2 mm x 1219 mm x cuộn';
  const rong = searchCandidates(stt25, { topCandidates: 5 });
  check(
    'OZV-1315 STT25 rộng vẫn top 7209*',
    rong[0]?.hsCode?.startsWith('7209'),
    `nhận ${rong[0]?.hsCode}`,
  );
  check(
    'OZV-1315 STT25 không top 72112390',
    rong[0]?.hsCode !== '72112390',
    `nhận ${rong[0]?.hsCode}`,
  );

  // OZV-1316 — nhãn nhựa tự dính không lẫn ấn phẩm 4911 / cuộn ≤20cm 391910
  const nhanNhua = searchCandidates(
    'Nhãn nhựa tự dính đã in (PLASTIC LABEL, tem nhãn) dạng chiếc phẳng 26x12 mm, dạng cuộn',
    { topCandidates: 8 },
  );
  check(
    'OZV-1316 top1 nhãn nhựa = 39199092',
    nhanNhua[0]?.hsCode === '39199092',
    `nhận ${nhanNhua.map((c) => c.hsCode).join(',')}`,
  );
  check(
    'OZV-1316 nhãn nhựa không lẫn ấn phẩm 4911',
    nhanNhua.every((c) => !String(c.hsCode).startsWith('4911')),
  );
  check(
    'OZV-1316 nhãn nhựa không lẫn cuộn ≤20cm 391910',
    nhanNhua.every((c) => !String(c.hsCode).startsWith('391910')),
  );

  const alum = searchCandidates('Aluminium powder (bột nhôm): chất màu vô cơ', { topCandidates: 50 });
  check('bột nhôm chất màu không lẫn nhôm thỏi 7601', alum.every((c) => !c.hsCode.startsWith('7601')));
  check('bột nhôm chất màu không lẫn bột nhôm luyện kim 7603', alum.every((c) => !c.hsCode.startsWith('7603')));

  const vac = searchCandidates('industrial vacuum cleaner Nilfisk model VHW310', { topCandidates: 50 });
  check('máy hút bụi công nghiệp không lẫn lọc nước 842121', vac.every((c) => !c.hsCode.startsWith('842121')));
}

console.log('\n== Từ điển không được lan sang câu không liên quan ==');
{
  // "inverter" ở đây là TÍNH NĂNG của máy lạnh, không phải bộ biến tần 8504.
  const oil = lookupTradeTerms('dầu thủy lực 68');
  check('dầu thủy lực không kích hoạt mục van 8481.20',
    !(oil.matches || []).some((m) => m.entryId === 'van-khi-nen-thuy-luc'));

  const ac = lookupTradeTerms('máy điều hòa inverter 12000 BTU');
  check('không gợi ý 8504 cho điều hòa inverter', ac.matches.every((m) => m.entryId !== 'bien-tan-vfd'));
  check('nói rõ vì sao không áp dụng', ac.excluded.some((x) => x.entryId === 'bien-tan-vfd'));

  const ex = lookupTradeTerms('máy điều hòa inverter 12000 BTU').excluded[0];
  check('lý do nhắc đây là tính năng', /tính năng/i.test(ex?.reasonVi || ''));

  // Cụm có dấu chỉ khớp câu có dấu khi ĐÚNG dấu. Ba ca thật tìm được khi
  // nghiệm thu 7 nhóm đầu — holdout Oz không có câu nào như vậy nên không kêu.
  const spruce = lookupTradeTerms('gỗ vân sam xẻ');
  check('"gỗ vân sam" không dính van săm 8481', !spruce.matches.some((m) => m.entryId === 'van-sam'));
  const withWater = lookupTradeTerms('chất cô đặc pha với nước');
  check('"với nước" không dính vòi nước', !withWater.matches.some((m) => m.entryId === 'voi-nuoc'));
  const capacitor = lookupTradeTerms('tụ điện 400V');
  check('"tụ điện" không dính tủ điện 8537', !capacitor.matches.some((m) => m.entryId === 'bang-phan-phoi-dien'));
  check('gõ có dấu đúng dấu vẫn khớp', lookupTradeTerms('van săm xe máy').matches.some((m) => m.entryId === 'van-sam'));
  check('gõ KHÔNG dấu vẫn khớp bỏ dấu', lookupTradeTerms('van sam xe may').matches.some((m) => m.entryId === 'van-sam'));

  // Mác thép dạng số trần không được dính vào câu đếm số lượng.
  const count = lookupTradeTerms('mua 2311 cái bút bi');
  check('"2311 cái bút bi" không dính mác thép 2311', count.matches.length === 0);

  // Có từ ngữ cảnh thì mới tính.
  const grade = lookupTradeTerms('thép tấm 2311');
  check('"thép tấm 2311" thì tính mác thép', grade.matches.some((m) => m.entryId === 'thep-lam-khuon'));

  // OZV-1261 — phụ tùng bơm chân không thật không được kích hoạt mục giác hút
  const vane = lookupTradeTerms('cánh gạt cacbon máy bơm hút chân không BECKER');
  check('cánh gạt bơm chân không không kích hoạt mục giác hút',
    !(vane.matches || []).some((m) => m.entryId === 'giac-hut-chan-khong-vacuum-pad'));
  const vaneSearch = searchCandidates('cánh gạt cacbon máy bơm hút chân không BECKER', { topCandidates: 5 });
  check('cánh gạt bơm chân không vẫn ra 841490*', vaneSearch.some((c) => c.hsCode.startsWith('841490')));

  const padHit = lookupTradeTerms('giác hút chân không smc zp-905-08eu');
  check('câu giác hút SMC khớp mục từ điển',
    (padHit.matches || []).some((m) => m.entryId === 'giac-hut-chan-khong-vacuum-pad'));
  check('mục giác hút loại prefix 841490',
    ((padHit.matches || []).find((m) => m.entryId === 'giac-hut-chan-khong-vacuum-pad')?.avoid || [])
      .some((a) => String(a.prefix || '').startsWith('841490')));

  // OZV-1261 vòng soát 1 — hàng khác có giác hút làm PHỤ KIỆN không được kích
  // hoạt mục giác hút SMC (đồ chơi 9503, giá đỡ, móc dán, dụng cụ nâng kính,
  // đồ trẻ em) và từ khoá trần "zpb" không dính cáp/hàng lạ.
  for (const q of [
    'đồ chơi mũi tên giác hút',
    'giá đỡ điện thoại ô tô giác hút',
    'móc dán tường giác hút nhà tắm',
    'giác hút kính nâng tấm kính 3 chấu',
    'núm hút sữa',
    'zpb cable',
  ]) {
    check(`«${q}» không kích hoạt mục giác hút`,
      !(lookupTradeTerms(q).matches || []).some((m) => m.entryId === 'giac-hut-chan-khong-vacuum-pad'));
  }
  // Câu khách nguyên văn không có chữ «chân không» vẫn khớp qua mã series SMC.
  const padShort = lookupTradeTerms('giác hút smc zp-905-08eu');
  check('«giác hút smc zp-905…» vẫn khớp mục giác hút',
    (padShort.matches || []).some((m) => m.entryId === 'giac-hut-chan-khong-vacuum-pad'));
  const padTop = searchCandidates('giác hút smc zp-905-08eu', { topCandidates: 5 });
  check('«giác hút smc zp-905…» có 4016* trong top 2',
    padTop.slice(0, 2).some((c) => c.hsCode.startsWith('4016')));
  // OZV-1263 — dây đai truyền lực không kích hoạt khi có puly, bánh đai, máy giặt, khóa đai
  for (const q of [
    'puly',
    'puly curoa',
    'puly đai răng htd 5m',
    'bánh đai răng t10 nhôm',
    'máy giặt dây curoa',
    'khóa đai t10',
  ]) {
    check(`«${q}» không kích hoạt mục dây đai truyền lực`,
      !(lookupTradeTerms(q).matches || []).some((m) => m.entryId === 'day-dai-truyen-luc'));
  }
  // OZV-1304 — câu khách T10: top-1 là đai đồng bộ 401035/401036, không residual/nhựa
  {
    const t10Top = searchCandidates('dây đai dẹt t10-259-e', { topCandidates: 5 });
    const top1 = t10Top[0]?.hsCode;
    check(
      'OZV-1304 top1 T10 ∈ {40103500,40103600}',
      top1 === '40103500' || top1 === '40103600',
      `nhận ${top1}`
    );
    check('OZV-1304 top1 không phải 40103900 Loại khác', top1 !== '40103900');
    check(
      'OZV-1304 top2 không phải nhựa 39269053',
      t10Top[1]?.hsCode !== '39269053',
      `nhận ${t10Top.slice(0, 2).map((c) => c.hsCode).join(',')}`
    );
  }
  // OZV-1257 — classify/suggest lệch băng tải 401012 (dừng 6 số) / nhựa 39269053:
  // avoid phải loại HẲN để trade-synonyms-promote (biCam) đôn sang 401035/401036.
  {
    const q = 'dây đai dẹt t10-259-e, truyền lực';
    const t10All = searchCandidates(q, { topCandidates: 50 });
    check(
      'OZV-1257 không còn 401012* (băng tải dệt) trong kết quả',
      t10All.every((c) => !c.hsCode.startsWith('401012')),
      `nhận ${(t10All || []).filter((c) => c.hsCode.startsWith('401012')).map((c) => c.hsCode).join(',') || '—'}`
    );
    check(
      'OZV-1257 không còn 39269053 (đai nhựa) trong kết quả',
      t10All.every((c) => c.hsCode !== '39269053')
    );
    check(
      'OZV-1257 avoidedByTradeRules ghi 401012 hoặc 39269053',
      (t10All.avoidedByTradeRules || []).some((a) =>
        String(a.prefix) === '401012'
        || String(a.prefix) === '39269053'
        || String(a.hsCode || '').startsWith('401012')
        || String(a.hsCode || '') === '39269053'
      ),
      `avoided=${(t10All.avoidedByTradeRules || []).map((a) => a.prefix || a.hsCode).join(',')}`
    );
    const hints = tradeClassifyHints(q);
    check('OZV-1257 hints avoid có 401012', hints.avoidPrefixes.includes('401012'));
    check('OZV-1257 biCam 401012 (dừng 6 số)', biCamTrade('401012', hints.avoidPrefixes));
    check('OZV-1257 biCam 40101200', biCamTrade('40101200', hints.avoidPrefixes));
    const pref = tradePreferredHs(hints);
    check(
      'OZV-1257 prefer high ∈ {40103500,40103600}',
      pref && (pref.hs === '40103500' || pref.hs === '40103600'),
      `nhận ${pref?.hs}`
    );
  }
  // OZV-1277 — câu có «giàn phơi/drying rack» nhưng là máy sấy / tủ / kệ kho → tắt mục
  for (const q of [
    'giàn phơi kiểu máy sấy quần áo có động cơ',
    'laundry drying rack gắn trong wardrobe tủ quần áo',
    'giàn phơi kệ kho hàng pallet rack',
  ]) {
    check(`«${q}» không kích hoạt mục giàn phơi`,
      !(lookupTradeTerms(q).matches || []).some((m) => m.entryId === 'gian-phoi-quan-ao'));
  }
  check(
    'câu khách stt31 khớp mục giàn phơi',
    lookupTradeTerms(
      'Giàn phơi quần áo thông minh (laundry drying rack) gắn trần hoặc gắn tường'
    ).matches.some((m) => m.entryId === 'gian-phoi-quan-ao')
  );
  // OZV-1282 — webcam / máy ảnh / camera hành trình không kích hoạt mục camera truyền hình
  for (const q of [
    'webcam gắn máy tính USB',
    'máy ảnh photographic camera 35mm',
    'camera hành trình dashcam ô tô',
  ]) {
    check(`«${q}» không kích hoạt mục camera truyền hình`,
      !(lookupTradeTerms(q).matches || []).some((m) => m.entryId === 'camera-truyen-hinh-cctv'));
  }
  check(
    'câu khách OZV-1282 khớp mục camera truyền hình',
    lookupTradeTerms('camera truyền hình cmr12').matches.some((m) => m.entryId === 'camera-truyen-hinh-cctv')
  );
  check(
    'OZV-1298 câu ngắn camera cmr12 khớp mục camera truyền hình',
    lookupTradeTerms('camera cmr12').matches.some((m) => m.entryId === 'camera-truyen-hinh-cctv')
  );
  check(
    'đối chứng thấu kính máy ảnh không kích hoạt mục camera truyền hình',
    !(lookupTradeTerms('thấu kính máy ảnh').matches || []).some((m) => m.entryId === 'camera-truyen-hinh-cctv')
  );
  const camHint = lookupTradeTerms('camera truyền hình cmr12').matches.find((m) => m.entryId === 'camera-truyen-hinh-cctv');
  check('camera truyền hình ưu tiên 85258920 high',
    (camHint?.candidates || []).some((c) => (c.hsCode || c.hs) === '85258920' && c.confidence === 'high'));
  check('camera truyền hình tránh nhiễu MIC 8544',
    (camHint?.avoid || []).some((a) => String(a.prefix) === '8544'));
  check('OZV-1298 camera tránh thấu kính 9001/9002',
    (camHint?.avoid || []).some((a) => String(a.prefix) === '9001')
    && (camHint?.avoid || []).some((a) => String(a.prefix) === '9002'));
  // OZV-1285 / OZV-1297 — máy phun socola ≠ máy phun cát/sơn 8424; tắt khi phun sơn/cát/thuốc
  for (const q of [
    'máy phun sơn công nghiệp',
    'máy phun cát sandblast',
    'máy phun thuốc trừ sâu nông nghiệp',
    'máy làm bánh',
  ]) {
    check(`«${q}» không kích hoạt mục máy phun socola`,
      !(lookupTradeTerms(q).matches || []).some((m) => m.entryId === 'may-phun-socola'));
  }
  check(
    'câu khách máy phun socola 5 tầng khớp mục may-phun-socola',
    lookupTradeTerms('máy phun socola 5 tầng').matches.some((m) => m.entryId === 'may-phun-socola')
  );
  {
    const m = lookupTradeTerms('máy phun socola 5 tầng').matches.find((x) => x.entryId === 'may-phun-socola');
    check('máy phun socola ưu tiên 84382010', (m?.candidates || []).some((c) => (c.hsCode || c.hs) === '84382010'));
    check('máy phun socola tránh 8424', (m?.avoid || []).some((a) => String(a.prefix) === '8424'));
    check('máy phun socola tránh máy gia nhiệt 8419 (OZV-1324)', (m?.avoid || []).some((a) => String(a.prefix) === '8419'));
    check('máy phun socola tránh khuôn phun 8480 (OZV-1330)', (m?.avoid || []).some((a) => String(a.prefix) === '8480'));
    check('máy phun socola tránh máy thực phẩm loại khác 843880 (OZV-1330)', (m?.avoid || []).some((a) => String(a.prefix) === '843880'));
    check('máy phun socola chotSom (OZV-1330)', m?.chotSom === true);
    check('máy phun socola tránh máy giấy 8439', (m?.avoid || []).some((a) => String(a.prefix) === '8439'));
    check('máy phun socola tránh nhiễu 8543', (m?.avoid || []).some((a) => String(a.prefix) === '8543'));
    check('máy phun socola tránh nhiễu 8479', (m?.avoid || []).some((a) => String(a.prefix) === '8479'));
  }
  // OZV-1306 — đèn LED cắm tường
  for (const q of [
    'bóng đèn led E27',
    'chip led smd',
    'đèn pha ô tô led',
    'màn hình led quảng cáo',
    'dải led strip 12v',
  ]) {
    check(`«${q}» không kích hoạt mục đèn LED cắm tường`,
      !(lookupTradeTerms(q).matches || []).some((m) => m.entryId === 'den-led-cam-tuong'));
  }
  check(
    'câu khách đèn led cắm tường hình gấu khớp mục den-led-cam-tuong',
    lookupTradeTerms('đèn led cắm tường hình gấu').matches.some((m) => m.entryId === 'den-led-cam-tuong')
  );
  {
    const m = lookupTradeTerms('đèn led cắm tường hình gấu').matches.find((x) => x.entryId === 'den-led-cam-tuong');
    check('đèn LED tường ưu tiên 94051199/94054290',
      (m?.candidates || []).some((c) => (c.hsCode || c.hs) === '94051199' && c.confidence === 'high')
      && (m?.candidates || []).some((c) => (c.hsCode || c.hs) === '94054290' && c.confidence === 'high'));
    check('đèn LED tường tránh ống CRT 8540', (m?.avoid || []).some((a) => String(a.prefix) === '8540'));
    check('đèn LED tường tránh đầu cắm 9834', (m?.avoid || []).some((a) => String(a.prefix) === '9834'));
  }
  {
    const top3 = searchCandidates('máy phun socola 5 tầng', { topCandidates: 3 }).map((c) => c.hsCode);
    check(
      'search máy phun socola 5 tầng top3 thuộc 8438',
      top3.length === 3 && top3.every((hs) => String(hs).startsWith('8438')),
      `top3=${top3.join(',')}`
    );
    check('search máy phun socola không lẫn máy giấy 8439', !top3.some((hs) => String(hs).startsWith('8439')));
    check('search máy phun socola không lẫn 8419/8543/8479', !top3.some((hs) => /^(8419|8543|8479)/.test(String(hs))));
    check('search máy phun socola top1 84382010 (OZV-1330)', top3[0] === '84382010', `top3=${top3.join(',')}`);
    check(
      'search máy phun socola không lẫn khuôn 8480 / 843880 (OZV-1330)',
      !top3.some((hs) => /^(8480|843880)/.test(String(hs))),
      `top3=${top3.join(',')}`,
    );
  }
  // OZV-1325 — đầu lắc xilanh FD1016 ≠ nối ống 7307 / quy lát 8409 / xi lanh nguyên chiếc 841231
  for (const q of [
    'đầu lắc xilanh nguyên chiếc tịnh tiến',
    'đầu lắc fd1016 quy lát động cơ',
    'đầu lắc xilanh rotin càng a ô tô',
  ]) {
    check(`«${q}» không kích hoạt mục đầu lắc xilanh`,
      !(lookupTradeTerms(q).matches || []).some((m) => m.entryId === 'dau-lac-xilanh-fd'));
  }
  check(
    'câu khách đầu lắc xilanh fd1016 khớp mục dau-lac-xilanh-fd',
    lookupTradeTerms('đầu lắc xilanh fd1016').matches.some((m) => m.entryId === 'dau-lac-xilanh-fd')
  );
  check(
    'câu ngắn đầu lắc xi lanh khớp mục dau-lac-xilanh-fd',
    lookupTradeTerms('đầu lắc xi lanh').matches.some((m) => m.entryId === 'dau-lac-xilanh-fd')
  );
  {
    const m = lookupTradeTerms('đầu lắc xilanh fd1016').matches.find((x) => x.entryId === 'dau-lac-xilanh-fd');
    check('đầu lắc xilanh ưu tiên 84129090 high',
      (m?.candidates || []).some((c) => (c.hsCode || c.hs) === '84129090' && c.confidence === 'high'));
    check('đầu lắc xilanh tránh 7307 (nối ống — earlyExit prod)',
      (m?.avoid || []).some((a) => String(a.prefix) === '7307'));
    check('đầu lắc xilanh tránh 8409 (quy lát ĐCĐT)',
      (m?.avoid || []).some((a) => String(a.prefix) === '8409'));
    check('đầu lắc xilanh tránh 841231 (xi lanh nguyên chiếc)',
      (m?.avoid || []).some((a) => String(a.prefix) === '841231'));
  }
  {
    const top3 = searchCandidates('đầu lắc xilanh fd1016', { topCandidates: 3 }).map((c) => c.hsCode);
    check(
      'search đầu lắc xilanh fd1016 top1 84129090',
      top3[0] === '84129090',
      `top3=${top3.join(',')}`
    );
    check('search đầu lắc không lẫn 7307/8409', !top3.some((hs) => /^(7307|8409)/.test(String(hs))));
  }

  // OZV-1239: mục bột nhôm chất màu 32.06 không được ăn bột/vảy nhôm luyện
  // kim (76.03) hay bột nhão nhôm (32.12) — probe trước khi chặn: cả 2 câu
  // đều đẩy 32064990 lên đầu.
  for (const q of ['bột nhôm dạng vảy dùng luyện kim', 'bột nhôm nhão aluminium paste cho sơn', 'aluminium powder for welding']) {
    check(`"${q}" không kích mục bột nhôm chất màu`,
      !lookupTradeTerms(q).matches.some((m) => m.entryId === 'aluminium-powder-pigment'));
  }
  check('câu bột nhôm chất màu (TB 554) vẫn kích mục',
    lookupTradeTerms('Aluminium powder (bột nhôm): chất màu vô cơ').matches.some((m) => m.entryId === 'aluminium-powder-pigment'));
}

// OZV-1326 — bàn ga TFS-1 (2 mét) = công tắc bàn đạp chân dây 2m → 85365099
// (không phải bàn cắt ga / bếp ga; «2 mét» là chiều dài dây).
{
  const TEN = 'bàn ga tfs-1 (2 mét)';
  check(
    'OZV-1326 câu khách bàn ga tfs-1 khớp mục cong-tac-ban-dap-tfs',
    lookupTradeTerms(TEN).matches.some((m) => m.entryId === 'cong-tac-ban-dap-tfs'),
  );
  check(
    'OZV-1326 không dấu ban ga tfs-1 vẫn khớp',
    lookupTradeTerms('ban ga tfs-1 (2 met)').matches.some((m) => m.entryId === 'cong-tac-ban-dap-tfs'),
  );
  for (const q of [
    'bàn cắt ga CNC 2 mét',
    'bàn bếp ga công nghiệp 2 mét',
    'chân ga bàn đạp phanh ô tô',
  ]) {
    check(
      `OZV-1326 «${q}» không kích hoạt mục cong-tac-ban-dap-tfs`,
      !(lookupTradeTerms(q).matches || []).some((m) => m.entryId === 'cong-tac-ban-dap-tfs'),
    );
  }
  {
    const m = lookupTradeTerms(TEN).matches.find((x) => x.entryId === 'cong-tac-ban-dap-tfs');
    check(
      'OZV-1326 ưu tiên 85365099 high + chotSom',
      (m?.candidates || []).some((c) => (c.hsCode || c.hs) === '85365099' && c.confidence === 'high')
        && m?.chotSom === true,
    );
    check(
      'OZV-1326 tránh phụ tùng máy may 8452 / chân ga xe 8708',
      (m?.avoid || []).some((a) => String(a.prefix) === '8452')
        && (m?.avoid || []).some((a) => String(a.prefix) === '8708'),
    );
  }
}

// OZV-1332 — bóng đèn LED đuôi E27 (đầu ren xoáy) → 85395210
// Prod 17/11 suggest «bóng đèn led tròn đuôi e27» → REVIEW 94054290 (bộ đèn LED loại khác).
// Biểu: 8539.52.10 = bóng LED loại đầu đèn ren xoáy (đuôi E27/E14/E40).
{
  const TEN_LED = 'bóng đèn led tròn đuôi e27';
  check(
    'OZV-1332 câu khách bóng LED đuôi E27 khớp mục bong-den-led-duoi-e27',
    lookupTradeTerms(TEN_LED).matches.some((m) => m.entryId === 'bong-den-led-duoi-e27'),
  );
  check(
    'OZV-1332 không dấu bong den led tron duoi e27 vẫn khớp',
    lookupTradeTerms('bong den led tron duoi e27').matches.some((m) => m.entryId === 'bong-den-led-duoi-e27'),
  );
  for (const q of [
    'đèn led cắm tường hình gấu',
    'bóng đèn LED đui gài B22',
    'chip led smd 2835',
    'module led cob',
  ]) {
    check(
      `OZV-1332 «${q}» không kích hoạt mục bong-den-led-duoi-e27`,
      !(lookupTradeTerms(q).matches || []).some((m) => m.entryId === 'bong-den-led-duoi-e27'),
    );
  }
  {
    const m = lookupTradeTerms(TEN_LED).matches.find((x) => x.entryId === 'bong-den-led-duoi-e27');
    check(
      'OZV-1332 ưu tiên 85395210 high + chotSom',
      (m?.candidates || []).some((c) => (c.hsCode || c.hs) === '85395210' && c.confidence === 'high')
        && m?.chotSom === true,
    );
    check(
      'OZV-1332 tránh bộ đèn 9405 / bóng xe 853910',
      (m?.avoid || []).some((a) => String(a.prefix) === '9405')
        && (m?.avoid || []).some((a) => String(a.prefix) === '853910'),
    );
  }
  {
    const top3 = searchCandidates(TEN_LED, { topCandidates: 3 }).map((c) => c.hsCode);
    check(
      'OZV-1332 search bóng LED đuôi E27 top1 85395210',
      top3[0] === '85395210',
      `top3=${top3.join(',')}`,
    );
    check(
      'OZV-1332 search không còn top1/top3 94054290',
      !top3.includes('94054290'),
      `top3=${top3.join(',')}`,
    );
  }
}

// OZV-1333 — vỏ chụp loa / nón loa nhựa tổng hợp = bộ phận loa 8518.90.90
// (không phải nhựa «Loại khác» 3926.90.99).
{
  const TEN = 'vỏ chụp loa bằng nhựa tổng hợp (nón loa)';
  check(
    'OZV-1333 câu khách vỏ chụp loa khớp mục vo-chup-loa-non-loa',
    lookupTradeTerms(TEN).matches.some((m) => m.entryId === 'vo-chup-loa-non-loa'),
  );
  check(
    'OZV-1333 không dấu vo chup loa / non loa vẫn khớp',
    lookupTradeTerms('vo chup loa bang nhua tong hop (non loa)').matches.some((m) => m.entryId === 'vo-chup-loa-non-loa')
      && lookupTradeTerms('non loa nhua').matches.some((m) => m.entryId === 'vo-chup-loa-non-loa'),
  );
  for (const q of [
    'loa bluetooth hoàn chỉnh',
    'loa thùng 2.1 bluetooth',
    'miếng chắn bụi màng loa tự dính điện thoại',
  ]) {
    check(
      `OZV-1333 «${q}» không kích hoạt mục vo-chup-loa-non-loa`,
      !(lookupTradeTerms(q).matches || []).some((m) => m.entryId === 'vo-chup-loa-non-loa'),
    );
  }
  {
    const m = lookupTradeTerms(TEN).matches.find((x) => x.entryId === 'vo-chup-loa-non-loa');
    check(
      'OZV-1333 ưu tiên 85189090 high + chotSom',
      (m?.candidates || []).some((c) => (c.hsCode || c.hs) === '85189090' && c.confidence === 'high')
        && m?.chotSom === true,
    );
    check(
      'OZV-1333 tránh 3926 nhựa loại khác / loa nguyên chiếc 851821–29',
      (m?.avoid || []).some((a) => String(a.prefix) === '3926')
        && (m?.avoid || []).some((a) => String(a.prefix) === '851821')
        && (m?.avoid || []).some((a) => String(a.prefix) === '851829'),
    );
  }
  {
    const top3 = searchCandidates(TEN, { topCandidates: 3 }).map((c) => c.hsCode);
    check(
      'search vỏ chụp loa nón loa top1 85189090',
      top3[0] === '85189090',
      `top3=${top3.join(',')}`,
    );
    check(
      'search vỏ chụp loa không còn 3926* top3',
      !top3.some((hs) => String(hs).startsWith('3926')),
      `top3=${top3.join(',')}`,
    );
  }
}

console.log('\n== Mục chưa chắc thì phải nói chưa chắc ==');
{
  const mb = lookupTradeTerms('masterbatch hạt nhựa màu').matches[0];
  check('masterbatch có mục trong từ điển', Boolean(mb));
  check('không mục nào nhận "high"', (mb?.candidates || []).every((c) => c.confidence !== 'high'));
  check('phơi ra nhiều hơn một ứng viên', (mb?.candidates || []).length > 1);
  check('có câu hỏi gạn thông tin', (mb?.askVi || []).length > 0);

  const steel = lookupTradeTerms('thép làm khuôn').matches[0];
  check('thép làm khuôn hỏi rõ khổ rộng 600 mm', (steel?.askVi || []).some((a) => a.includes('600')));
}

console.log('\n== Cảnh báo VAT: NĐ 174/2025 có phụ lục loại trừ ==');
{
  const v = vatReductionOf(taxData['72254090']);
  check('7225.40.90 KHÔNG được giảm VAT', v?.eligible === false);
  check('thuế suất đang áp là 10%', v?.rate === '10');
  check('dẫn đúng nghị định', v?.legalBasis === '174/2025/NĐ-CP');
  check('mức cảnh báo là warning', v?.severity === 'warning');
  check('có câu cảnh báo đọc được', /KHÔNG được giảm/.test(vatWarningTextOf(taxData['72254090']) || ''));

  const ok = vatReductionOf(taxData['96170010']);
  check('9617.00.10 đang ở mức đã giảm 8%', ok?.reduced === true && ok?.rate === '8');
  check('mã được giảm thì không cảnh báo', vatWarningTextOf(taxData['96170010']) === null);

  const blocked = Object.values(taxData).filter((r) => vatReductionOf(r)?.eligible === false).length;
  check('quét được cả nghìn mã bị loại trừ', blocked > 1000, `hiện ${blocked}`);
}

console.log('\n== Breadcrumb: mã "Loại khác" phải nói được mình là gì ==');
{
  const b = breadcrumbOf('72254090');
  check('có chuỗi phân cấp', Boolean(b?.trail));
  check('nhận ra đây là dòng dư', b?.isResidual === true);
  check('nêu phạm vi thật (khổ ≥ 600mm)', /600/.test(b?.scopeVi || ''));
  check('liệt kê mã anh em bị loại trừ', (b?.excludesVi || []).length > 0);
  check('có đủ các cấp phần/chương/nhóm', (b?.levels || []).length >= 4);

  const normal = breadcrumbOf('96170010');
  check('mã có tên mô tả thì không gắn nhãn dư', normal?.isResidual === false);
  check('mã thường vẫn có breadcrumb', Boolean(normal?.trail));

  check('mã không tồn tại trả null', breadcrumbOf('99999999') === null);
  check('mã cụt trả null', breadcrumbOf('7225') === null);
  check('mã thường không có ngữ cảnh dư', contextOf('96170010') === null);
}

console.log('\n== Không phá luồng cũ ==');
{
  const byCode = searchCandidates('8412', { topCandidates: 3 });
  check('gõ mã số vẫn ra đúng nhóm', byCode.length > 0 && byCode.every((c) => c.hsCode.startsWith('8412')));
  check('gõ mã số không dính từ điển', byCode.every((c) => !c.tradeMatch));

  const dup = searchCandidates('thép hợp kim', { topCandidates: 20 });
  check('không trả mã trùng lặp', new Set(dup.map((c) => c.hsCode)).size === dup.length);
}

console.log('\n== Ứng viên cấp nhóm: cộng điểm cho lá khớp lời văn, không bơm N lá điểm bằng nhau ==');
{
  // Chuẩn 2026-09-17: tên gọi chỉ tới nhóm; lá do bảng quyết định chọn.
  const m = lookupTradeTerms('industrial valve dn50').matches.find((x) => x.entryId === 'van-848180-phu');
  check('mục nhánh 8481.80 nay là ứng viên cấp nhóm', Boolean(m) && m.candidates.some((c) => c.prefix));
  const r = searchCandidates('industrial valve dn50', { topCandidates: 20 });
  const scores = r.filter((c) => c.hsCode.startsWith('848180')).map((c) => c.score);
  check('không còn 16 mã cùng một điểm', new Set(scores).size > 1 || scores.length <= 3, `điểm: ${[...new Set(scores)].join(',')}`);
  check('vẫn dẫn về nhóm 8481.80', r.length > 0 && r[0].hsCode.startsWith('8481'));
}

// OZV-1336 — cốc giữ nhiệt chân không → 96170010, hết NEED_FACTS dừng 961700
{
  const TEN = 'cốc giữ nhiệt chân không (bình chân không hoàn c';
  check(
    'OZV-1336 cốc giữ nhiệt chân không khớp mục coc-giu-nhiet-chan-khong',
    lookupTradeTerms(TEN).matches.some((m) => m.entryId === 'coc-giu-nhiet-chan-khong'),
  );
  check(
    'OZV-1336 không dấu coc giu nhiet chan khong vẫn khớp',
    lookupTradeTerms('coc giu nhiet chan khong').matches.some((m) => m.entryId === 'coc-giu-nhiet-chan-khong'),
  );
  for (const q of [
    'ruột thủy tinh bình chân không',
    'bộ phận bình chân không',
    'spare part vacuum flask',
  ]) {
    check(
      `OZV-1336 «${q}» không kích hoạt mục coc-giu-nhiet-chan-khong`,
      !(lookupTradeTerms(q).matches || []).some((m) => m.entryId === 'coc-giu-nhiet-chan-khong'),
    );
  }
  {
    const m = lookupTradeTerms(TEN).matches.find((x) => x.entryId === 'coc-giu-nhiet-chan-khong');
    check(
      'OZV-1336 ưu tiên 96170010 high + chotSom',
      (m?.candidates || []).some((c) => (c.hsCode || c.hs) === '96170010' && c.confidence === 'high')
        && m?.chotSom === true,
    );
    check(
      'OZV-1336 tránh 7323 (đồ inox nhà bếp) / 8516 (giữ nhiệt điện)',
      (m?.avoid || []).some((a) => String(a.prefix) === '7323')
        && (m?.avoid || []).some((a) => String(a.prefix) === '8516'),
    );
  }
  {
    const r = searchCandidates(TEN, { topCandidates: 5 });
    check(
      'OZV-1336 search top có 96170010',
      r.some((c) => c.hsCode === '96170010'),
      r.map((c) => c.hsCode).join(','),
    );
  }
}

// OZV-1334 — máy bơm nước ly tâm gia đình → 84137042, hết NEED_FACTS dừng 841370
{
  const TEN = 'máy bơm nước ly tâm gia đình';
  check(
    'OZV-1334 máy bơm nước ly tâm gia đình khớp mục may-bom-nuoc-ly-tam',
    lookupTradeTerms(TEN).matches.some((m) => m.entryId === 'may-bom-nuoc-ly-tam'),
  );
  check(
    'OZV-1334 không dấu may bom nuoc ly tam gia dinh vẫn khớp',
    lookupTradeTerms('may bom nuoc ly tam gia dinh').matches.some((m) => m.entryId === 'may-bom-nuoc-ly-tam'),
  );
  for (const q of [
    'bơm chân không',
    'vacuum pump',
    'bơm bê tông',
  ]) {
    check(
      `OZV-1334 «${q}» không kích hoạt mục may-bom-nuoc-ly-tam`,
      !(lookupTradeTerms(q).matches || []).some((m) => m.entryId === 'may-bom-nuoc-ly-tam'),
    );
  }
  {
    const m = lookupTradeTerms(TEN).matches.find((x) => x.entryId === 'may-bom-nuoc-ly-tam');
    check(
      'OZV-1334 ưu tiên 84137042 high + chotSom',
      (m?.candidates || []).some((c) => (c.hsCode || c.hs) === '84137042' && c.confidence === 'high')
        && m?.chotSom === true,
    );
    check(
      'OZV-1334 tránh 8414 (bơm chân không/quạt) / 841330 (bơm nhiên liệu)',
      (m?.avoid || []).some((a) => String(a.prefix) === '8414')
        && (m?.avoid || []).some((a) => String(a.prefix) === '841330'),
    );
  }
}

// OZV-2015 — túi sưởi điện gia dụng → 63011000 (chăn điện / sưởi ấm người), hết dừng 6 số nhánh 851679
{
  const TEN = 'túi sưởi điện gia dụng';
  check(
    'OZV-2015 túi sưởi điện gia dụng khớp mục tui-suoi-dien-gia-dung',
    lookupTradeTerms(TEN).matches.some((m) => m.entryId === 'tui-suoi-dien-gia-dung'),
  );
  check(
    'OZV-2015 túi sưởi điện (rút gọn) khớp',
    lookupTradeTerms('túi sưởi điện').matches.some((m) => m.entryId === 'tui-suoi-dien-gia-dung'),
  );
  check(
    'OZV-2015 không dấu tui suoi dien gia dung vẫn khớp',
    lookupTradeTerms('tui suoi dien gia dung').matches.some((m) => m.entryId === 'tui-suoi-dien-gia-dung'),
  );
  for (const q of [
    'quạt sưởi dầu',
    'máy sưởi phòng',
    'ấm đun nước điện',
    'túi sưởi bột sắt dùng một lần',
  ]) {
    check(
      `OZV-2015 «${q}» không kích hoạt mục tui-suoi-dien-gia-dung`,
      !(lookupTradeTerms(q).matches || []).some((m) => m.entryId === 'tui-suoi-dien-gia-dung'),
    );
  }
  {
    const m = lookupTradeTerms(TEN).matches.find((x) => x.entryId === 'tui-suoi-dien-gia-dung');
    check(
      'OZV-2015 ưu tiên 63011000 high + chotSom',
      (m?.candidates || []).some((c) => (c.hsCode || c.hs) === '63011000' && c.confidence === 'high')
        && m?.chotSom === true,
    );
    check(
      'OZV-2015 tránh 8516 (loại trừ làm ấm người) / 8536 (bẫy search cầu dao)',
      (m?.avoid || []).some((a) => String(a.prefix) === '8516')
        && (m?.avoid || []).some((a) => String(a.prefix) === '8536'),
    );
  }
  {
    const r = searchCandidates(TEN, { topCandidates: 5 });
    check(
      'OZV-2015 search top có 63011000',
      r.some((c) => c.hsCode === '63011000'),
      r.map((c) => c.hsCode).join(','),
    );
    check(
      'OZV-2015 search top không còn 85362020 (bẫy cầu dao nhiệt điện gia dụng)',
      r.every((c) => c.hsCode !== '85362020'),
      r.map((c) => c.hsCode).join(','),
    );
  }
}

// OZV-1349 — cảm biến quang FT-S13 24V → 85365051, hết NEED_FACTS dừng 853650/903180
{
  const TEN = 'cảm biến quang FT-S13 24V';
  check(
    'OZV-1349 cảm biến quang FT-S13 24V khớp mục cam-bien-quang-ft-s13',
    lookupTradeTerms(TEN).matches.some((m) => m.entryId === 'cam-bien-quang-ft-s13'),
  );
  check(
    'OZV-1349 cảm biến quang điện FT-S13 24V khớp',
    lookupTradeTerms('cảm biến quang điện FT-S13 24V').matches.some((m) => m.entryId === 'cam-bien-quang-ft-s13'),
  );
  check(
    'OZV-1349 không dấu cam bien quang ft-s13 24v vẫn khớp',
    lookupTradeTerms('cam bien quang ft-s13 24v').matches.some((m) => m.entryId === 'cam-bien-quang-ft-s13'),
  );
  for (const q of [
    'dây cáp cảm biến FT-S13',
    'fiber optic cable FT-S13',
    'bóng đèn led đuôi e27',
  ]) {
    check(
      `OZV-1349 «${q}» không kích hoạt mục cam-bien-quang-ft-s13`,
      !(lookupTradeTerms(q).matches || []).some((m) => m.entryId === 'cam-bien-quang-ft-s13'),
    );
  }
  {
    const m = lookupTradeTerms(TEN).matches.find((x) => x.entryId === 'cam-bien-quang-ft-s13');
    check(
      'OZV-1349 ưu tiên 85365051 high + chotSom',
      (m?.candidates || []).some((c) => (c.hsCode || c.hs) === '85365051' && c.confidence === 'high')
        && m?.chotSom === true,
    );
    check(
      'OZV-1349 tránh 9031 (đo/kiểm) / 8541 (cảm quang thuần)',
      (m?.avoid || []).some((a) => String(a.prefix) === '9031')
        && (m?.avoid || []).some((a) => String(a.prefix) === '8541'),
    );
  }
  {
    const r = searchCandidates(TEN, { topCandidates: 5 });
    check(
      'OZV-1349 search top có 85365051',
      r.some((c) => c.hsCode === '85365051'),
      r.map((c) => c.hsCode).join(','),
    );
  }
}

console.log('\n== Thống kê ==');
{
  const s = tradeTermStats();
  check('từ điển nạp được', s.ok === true);
  console.log(`    ${s.entries} mục, ${s.terms} từ khoá, bản ${s.version}`);
}

if (failed) {
  console.error(`\n❌ ${failed} kiểm tra thất bại\n`);
  process.exit(1);
}
console.log('\n✅ trade-synonyms: tất cả kiểm tra đạt\n');
