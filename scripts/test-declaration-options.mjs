// Bảng phương án khai (lib/declaration-options.js) — CEO 10/10/2026, ca tấm bảo vệ gầm Leapmotor: động cơ chỉ so
// 8708.29 vs 8708.99, bỏ lỡ đường 7326 (tấm thép định hình). Kiểm: đường vật liệu luôn được LIỆT KÊ kèm rủi ro theo
// Chú giải 2 Phần XV/XVI/XVII, thuế ACFTA tôn trọng loại trừ CN, ≤ 4 phương án, đúng 1 khuyến nghị, hai động cơ không vỡ.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
process.env.MIC_OFF = '1';
process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';
process.env.HS_CLASSIFY_CROSSCHECK = '0';
process.env.HS_ACCESS_LOG = '0';
console.error = () => {}; console.warn = () => {};

const { buildDeclarationOptions, detectMainMaterial } = require('../lib/declaration-options.js');
const { taxData } = require('../lib/data.js');
let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${x}`); } };
const kinds = (o) => o.map((x) => `${x.kind}:${x.hs}`).join(' ');
const lastOf = (p) => Object.keys(taxData).filter((k) => k.startsWith(p)).sort().pop();

// Ca Leapmotor: tấm bảo vệ gầm/pin thép mangan dập định hình theo xe → máy chọn 8708.29.99, AI loại 8708.99.99 và 7326.
const TOP = { hs: '87082999', confidence: 82, reason: 'Tấm bảo vệ gầm/pin dập định hình theo xe Leapmotor C11 — bộ phận thân xe nhận dạng được (Chú giải 3 Phần XVII)', gir: 'GIR 1', conditions: [{ fact: 'Dập định hình theo xe, đúng lỗ vít nguyên bản', status: 'MET', evidence: '原车孔位' }, { fact: 'Độ dày tấm', status: 'UNKNOWN', evidence: '' }] };
const RESULTS = [TOP, { hs: '87089999', confidence: null, reason: 'phụ kiện khác của xe', source: 'engine-loop:alt' }];
const DOSSIER = { product: { nameVi: 'tấm bảo vệ gầm và pin xe Leapmotor C11', nameEn: 'battery underbody skid plate', purpose: 'bảo vệ gầm/pin xe điện', material: 'thép mangan dập định hình', form: 'bộ phận' }, decision: 'CHOT', alternatives: [{ hs: '87089999', whyNot: 'không phải phụ kiện khác' }, { hs: '73269099', whyNot: 'Chú giải 2(b) Phần XVII: tấm dập theo xe không phải bộ phận công dụng chung' }], supplier: null, mic: null };

// 1. Thép + bộ phận xe → có 7326.90.99 THEO_VAT_LIEU, rủi ro CAO, căn cứ nhắc Chú giải 2 Phần XVII; mã chọn đứng đầu, khuyến nghị duy nhất
let o = buildDeclarationOptions({ top: TOP, results: RESULTS, dossier: DOSSIER, gathered: { ozPrecedents: [] }, review: { needed: false, reasons: [] }, partTexts: ['零跑C11电池底盘护板'] });
const mat = o.find((x) => x.kind === 'THEO_VAT_LIEU');
check('Leapmotor: có phương án 7326.90.99 theo vật liệu', mat?.hs === '73269099', kinds(o));
check('đường vật liệu: rủi ro CAO + nhắc Chú giải 2 Phần XVII + Phần XV (công dụng chung)', mat?.ruiRo === 'CAO' && /Chú giải 2\(b\)\+3 Phần XVII/.test(mat.ruiRoVi) && /công dụng chung/.test(mat.ruiRoVi) && /Phần XV/.test(mat.dieuKienVi), JSON.stringify(mat));
check('mã chọn đứng đầu, CHON, khuyenNghi duy nhất, rủi ro THAP (CHOT, không cờ)', o[0].kind === 'CHON' && o[0].hs === '87082999' && o[0].khuyenNghi === true && o.filter((x) => x.khuyenNghi).length === 1 && o[0].ruiRo === 'THAP', JSON.stringify(o[0]));
check('mã chọn: điều kiện ghi Đã kiểm + Cần xác nhận, căn cứ có GIR', /Đã kiểm: Dập định hình/.test(o[0].dieuKienVi) && /Cần xác nhận: Độ dày/.test(o[0].dieuKienVi) && /^GIR 1: /.test(o[0].canCuVi));
check('8708.99.99 là CUNG_NHOM; AI đã loại 7326 → gộp vào phương án vật liệu (ghiChuVi), không trùng mã', o.some((x) => x.kind === 'CUNG_NHOM' && x.hs === '87089999') && /Chú giải 2\(b\) Phần XVII/.test(mat.ghiChuVi || '') && new Set(o.map((x) => x.hs)).size === o.length, kinds(o));
check('tên tiếng Việt cho dòng "Loại khác" ghép tên nhóm', /Bộ phận và phụ kiện của xe có động cơ.*Loại khác/.test(o[0].nameVi) && /sắt hoặc thép.*Loại khác/.test(mat.nameVi), JSON.stringify([o[0].nameVi, mat.nameVi]));

// 2. Thuế: 8708.29.99 ACFTA "0 (-ID, PH, CN)" → hàng CN KHÔNG được 0%; 7326.90.99 "0 (-KH)" → CN được 0%
check('ACFTA CN bị loại trừ → acftaCn null + ghi chú KHÔNG được hưởng, MFN 15', o[0].thue.acftaCn === null && /KHÔNG được hưởng/.test(o[0].thue.acftaNoteVi) && o[0].thue.mfn === '15', JSON.stringify(o[0].thue));
check('ACFTA CN được hưởng ở 7326 → acftaCn 0, VAT có', mat.thue.acftaCn === 0 && mat.thue.vat, JSON.stringify(mat.thue));
check('cờ chính sách theo mã: 8708.99.99 có dòng BLOCKING (ATKT & BVMT) + level', (() => { const x = o.find((y) => y.hs === '87089999'); return x && x.coChinhSach.level === 'BLOCKING' && /12\/2022\/TT-BGTVT/.test(x.coChinhSach.lineVi); })(), JSON.stringify(o.find((y) => y.hs === '87089999')?.coChinhSach));

// 3. Nhựa + bộ phận máy (Phần XVI) → 3926.90.99, rủi ro CAO nhắc Chú giải 2 Phần XVI
const topMach = lastOf('843149');
o = buildDeclarationOptions({ top: { hs: topMach, confidence: 80, reason: 'bộ phận máy xúc' }, results: [], dossier: { product: { nameVi: 'nắp che bằng nhựa cho máy xúc', material: 'nhựa ABS', form: 'bộ phận' }, decision: 'CHOT' } });
check('nhựa + bộ phận máy → 3926.90.99 THEO_VAT_LIEU, CAO, Chú giải 2 Phần XVI', o.some((x) => x.kind === 'THEO_VAT_LIEU' && x.hs === '39269099' && x.ruiRo === 'CAO' && /Chú giải 2 Phần XVI/.test(x.ruiRoVi)), kinds(o));

// 4. Không có vật liệu → không phương án vật liệu
o = buildDeclarationOptions({ top: TOP, results: RESULTS, dossier: { ...DOSSIER, product: { ...DOSSIER.product, material: '' }, alternatives: [] } });
check('không vật liệu → không THEO_VAT_LIEU', !o.some((x) => x.kind === 'THEO_VAT_LIEU') && o[0].kind === 'CHON', kinds(o));
check('specs làm nguồn dò vật liệu phụ khi product.material trống', buildDeclarationOptions({ top: TOP, results: [], dossier: { ...DOSSIER, product: { ...DOSSIER.product, material: '' }, alternatives: [] }, materialTexts: ['材质: 锰钢; 厚度: 3mm'] }).some((x) => x.kind === 'THEO_VAT_LIEU' && x.hs === '73269099'));

// 5. Hàng hoàn chỉnh (nồi inox 7323) → không phải bộ phận/tấm/vỏ → không đường vật liệu
o = buildDeclarationOptions({ top: { hs: lastOf('732393'), confidence: 85, reason: 'nồi inox' }, results: [], dossier: { product: { nameVi: 'nồi inox 3 đáy', material: 'inox 304', form: 'hoàn chỉnh' }, decision: 'CHOT' } });
check('hàng hoàn chỉnh (nồi inox) → không THEO_VAT_LIEU', !o.some((x) => x.kind === 'THEO_VAT_LIEU'), kinds(o));

// 6. Mã chọn đã là bộ phận công dụng chung (7318 bu lông) → đường vật liệu chính là đường đã chọn
o = buildDeclarationOptions({ top: { hs: lastOf('731815'), confidence: 85, reason: 'bu lông thép' }, results: [], dossier: { product: { nameVi: 'bu lông lục giác dùng cho xe', material: 'thép', form: 'bộ phận' }, decision: 'CHOT' } });
check('mã chọn thuộc nhóm công dụng chung (7318) → không thêm 7326', !o.some((x) => x.kind === 'THEO_VAT_LIEU'), kinds(o));

// 7. ≤ 4 với nhiều nguồn (NCC khác nhóm + made-in-china + tiền lệ Oz + 2 mã AI) — mã chọn + vật liệu được giữ, không trùng mã
o = buildDeclarationOptions({
  top: TOP, results: RESULTS,
  dossier: { ...DOSSIER, alternatives: [{ hs: '87089999', whyNot: 'x' }, { hs: '87089970', whyNot: 'khung giá đỡ động cơ' }], supplier: { code: '8302300000', hs6: '830230', heading4: '8302', source: 'made-in-china', agree: 'DIFF' }, mic: { query: 'skid plate', consensus: { heading4: '7326', shops: 2 }, pages: [{ shop: 'a', hsCode: '7326909000' }, { shop: 'b', hsCode: '7326909000' }] } },
  gathered: { ozPrecedents: [{ hs: '76169990', name: 'Tấm ốp gầm nhôm', oz: 4, cov: 80 }] },
});
check('≤ 4 phương án, hs không trùng, CHON đầu, THEO_VAT_LIEU còn, có KHAC', o.length === 4 && new Set(o.map((x) => x.hs)).size === 4 && o[0].kind === 'CHON' && o.some((x) => x.kind === 'THEO_VAT_LIEU') && o.some((x) => x.kind === 'KHAC'), kinds(o));
check('NCC khác nhóm → KHAC 8302 nêu "Nhà cung cấp tự khai"', o.some((x) => x.kind === 'KHAC' && x.hs.startsWith('8302') && /Nhà cung cấp tự khai HS 830230/.test(x.canCuVi)), kinds(o));

// 8. Mã chọn 6 số / DE_XUAT / có cờ review → rủi ro mã chọn tăng
o = buildDeclarationOptions({ top: { hs: '870829', confidence: 60, reason: 'chưa tới dòng' }, results: [], dossier: { product: {}, decision: 'HOI' } });
check('mã 6 số → CHON rủi ro CAO, thuế trống kèm ghi chú', o[0].ruiRo === 'CAO' && o[0].thue.mfn === null && /6 số|8 số/.test(o[0].thue.acftaNoteVi), JSON.stringify(o[0]));
o = buildDeclarationOptions({ top: TOP, results: [], dossier: { product: {}, decision: 'DE_XUAT' }, review: { needed: true, reasons: ['Tiền lệ Oz xếp nhóm 7326'] } });
check('có cờ review → CHON rủi ro VUA nêu lý do cờ', o[0].ruiRo === 'VUA' && /Tiền lệ Oz/.test(o[0].ruiRoVi), JSON.stringify(o[0].ruiRoVi));
check('không có top → []', buildDeclarationOptions({ top: null }).length === 0 && buildDeclarationOptions({}).length === 0);

// 9. Dò vật liệu: biên từ (không bắt "đồng hồ" / "đa năng"), chữ Hán, nguồn đầu thắng
check('dò vật liệu: "đồng hồ" không thành đồng; "đa năng" không thành da; 不锈钢 → thép; nguồn đầu thắng', detectMainMaterial(['đồng hồ treo tường']) === null && detectMainMaterial(['dao đa năng']) === null && detectMainMaterial(['不锈钢'])?.id === 'thep' && detectMainMaterial(['', 'nhựa', 'thép'])?.id === 'nhua' && detectMainMaterial(['vỏ nhôm, lót cao su'])?.id === 'nhom');
// Mọi mã 8 số trong bảng vật liệu còn tồn tại trong biểu thuế hiện hành
const table = require('../data/material-fallback-headings.json');
const deadCodes = table.materials.flatMap((m) => m.headings).filter((h) => !taxData[h.hs]).map((h) => h.hs);
check('bảng vật liệu: mọi mã 8 số có trong biểu thuế', deadCodes.length === 0, deadCodes.join(','));

// 10. Động cơ loop: stub 2 lượt AI ca Leapmotor → dossier.declarationOptions có 7326; prompt vòng 2 yêu cầu alternatives khác nhóm
{
  const llmTier = require('../lib/llm-tier');
  let script = []; const calls = [];
  // classify.js lấy callLLMJson lúc nạp → thay MỘT lần bằng bộ điều phối, đổi `handler` cho từng ca.
  let handler = async (system, user) => { calls.push({ system, user }); return { json: script.shift(), provider: 'stub', model: 'stub' }; };
  llmTier.callLLMJson = (...a) => handler(...a);
  const { classify } = require('../lib/classify');
  const { SYS_R2 } = require('../lib/engine-loop.js');
  check('SYS_R2 yêu cầu alternatives khác nhóm/chương theo vật liệu kèm whyNot', /KHÁC NHÓM \/ KHÁC CHƯƠNG/.test(SYS_R2) && /VẬT LIỆU/.test(SYS_R2) && /whyNot/.test(SYS_R2));
  script = [
    { product: { nameVi: 'tấm bảo vệ gầm pin xe Leapmotor C11', nameEn: 'battery skid plate', nameZh: '零跑C11电池护板', purpose: 'bảo vệ gầm/pin', mechanism: 'không áp dụng', material: 'thép mangan', form: 'bộ phận', evidence: { material: '锰钢' } }, hypotheses: [{ chapter: '87', heading4: '8708', subheading6: '870829', why: 'bộ phận thân xe', confidence: 80 }], verify: { searchVi: ['tấm bảo vệ gầm'], notesChapters: ['87'], codes8: ['87082999'], micQuery: null, unknowns: [] } },
    { decision: 'CHOT', hs: '87082999', confidence: 82, reason: 'bộ phận thân xe nhận dạng được', gir: 'GIR 1', basis: [{ stream: 'SAN_PHAM', claim: 'thép mangan', evidence: '锰钢' }], conditions: [], alternatives: [{ hs: '73269099', whyNot: 'không phải bộ phận công dụng chung' }], questions: [] },
  ];
  const r = await classify({ tenHang: '零跑C11电池底盘护板 锰钢', nameZh: '零跑C11电池底盘护板 锰钢', specs: '材质: 锰钢; 适用车型: 零跑C11' }, { engine: 'loop' });
  const opts = r.dossier?.declarationOptions || [];
  // Bảng 8708 đã CEO duyệt (10/10): "tấm bảo vệ gầm/pin" → ghi đè 8708.29.99 thành 8708.99.62; mã AI chọn thành CUNG_NHOM.
  check('loop: bảng 8708 ghi đè → CHON 8708.99.62, CUNG_NHOM 8708.29.99, THEO_VAT_LIEU 7326 (CAO)', r.status === 'RESOLVED_BY_TABLE' && r.results[0]?.hs === '87089962' && opts[0]?.kind === 'CHON' && opts[0].hs === '87089962' && opts.some((x) => x.kind === 'CUNG_NHOM' && x.hs === '87082999') && opts.some((x) => x.kind === 'THEO_VAT_LIEU' && x.hs === '73269099' && x.ruiRo === 'CAO'), JSON.stringify([r.status, r.results.map((x) => x.hs), kinds(opts)]));
  check('loop: 7326 bị gate NOT_IN_CANDIDATE_HEADINGS khỏi results nhưng vẫn có trong bảng phương án (ghi chú AI loại)', !r.results.some((x) => x.hs === '73269099') && /công dụng chung/.test(opts.find((x) => x.hs === '73269099')?.ghiChuVi || ''), JSON.stringify(opts.find((x) => x.hs === '73269099')));

  // 11. Động cơ cũ (classifyPrimary, không cửa đối chiếu): tiếng Việt → không bước hiểu hàng; AI đề xuất nhóm + chọn mã
  handler = async (system) => {
    if (system.includes('mã HS 4 số')) return { json: { headings: ['8708', '7326'] }, provider: 'stub', model: 'stub' };
    return { json: { results: [{ hs: '87082999', confidence: 85, reason: 'Bộ phận thân xe, dập theo xe.', gir: null }], missing: [] }, provider: 'stub', model: 'stub' };
  };
  const r2 = await classify({ tenHang: 'Tấm bảo vệ gầm pin xe điện Leapmotor C11 bằng thép mangan dập định hình', chatLieu: 'thép mangan', congDung: 'bảo vệ gầm và pin xe' }, { engine: 'classify' });
  const opts2 = r2.dossier?.declarationOptions || [];
  check('động cơ cũ không vỡ: bảng 8708 ghi đè → CHON 8708.99.62 + CUNG_NHOM 8708.29.99 + 7326 theo vật liệu', r2.status === 'RESOLVED_BY_TABLE' && r2.results[0]?.hs === '87089962' && opts2[0]?.kind === 'CHON' && opts2[0].hs === '87089962' && opts2.some((x) => x.kind === 'CUNG_NHOM' && x.hs === '87082999') && opts2.some((x) => x.kind === 'THEO_VAT_LIEU' && x.hs === '73269099'), JSON.stringify([r2.status, r2.results.map((x) => x.hs), kinds(opts2), r2.error]));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
