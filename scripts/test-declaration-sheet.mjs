// Test phiếu hồ sơ khai báo (POST /api/declaration-sheet) — CEO 05/10/2026.
// Ca thật: ổ cắm 86 Marc Lichte (Taobao) — thông số trang + 3 ảnh (bảng thông số, danh mục chung
// của shop, giới thiệu thương hiệu). LLM giả lập — không mạng.
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
process.env.HS_API_TOKEN = 'sheet-test-token';
process.env.HS_ACCESS_LOG = '0';
console.error = () => {};

let extractReply = null;
let extractCalls = 0;
let lastExtractUser = null;
let failDescribe = false;
const llmTier = require('../lib/llm-tier');
llmTier.callLLMJson = async (system, user) => {
  if (system.includes('THÔNG SỐ SẢN PHẨM')) {
    extractCalls += 1;
    lastExtractUser = JSON.parse(user);
    return { json: extractReply, provider: 'stub', model: 'stub' };
  }
  if (failDescribe) throw Object.assign(new Error('stub describe down'), { code: 'STUB' });
  const u = JSON.parse(user);
  return {
    json: {
      declaration: {
        tenHang: 'Ổ cắm điện âm tường loại 86',
        thanhPhanCauTao: u.material,
        congDung: u.purpose,
        nhanHieu: u.brand,
        model: u.model,
        thongSoKyThuat: u.technicalSpec ? [u.technicalSpec] : [],
        xuatXu: 'Trung Quốc',
        tinhTrang: 'Mới 100%',
      },
    },
    provider: 'stub',
    model: 'stub-describe',
  };
};

const { buildDeclarationSheet, counterfeitSignals, sheetFieldDefs } = require('../lib/declaration-sheet');
const handler = require('../api/describe.js');

let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass += 1; console.log(`PASS ${name}`); } else { fail += 1; console.log(`FAIL ${name} ${extra}`); }
};

const IMG_TABLE = 'https://img/table.jpg';
const IMG_SHOP = 'https://img/shop.jpg';
const IMG_STORY = 'https://img/story.jpg';
const SOCKET = {
  titleZh: '86型墙壁暗装电源插座带开关大孔多功能通用错位十孔八孔插座面板',
  specsZh: [
    { key: '插孔类型', value: '二三三插' },
    { key: '材质', value: '锡磷青铜' },
    { key: '额定电流', value: '10A' },
    { key: '品牌', value: 'Marc Lichte/马克莱驰特' },
    { key: '型号', value: '86型' },
  ],
  variant: [{ label: 'Phân loại', value: '一开多功能八孔【特价】' }],
  imageTexts: [
    { url: IMG_TABLE, text: '产品参数\n产品材质 电流电压\n锡磷青铜 10A/13A/250V\n产品规格 面板材质\n86mm*86mm PC阻燃' },
    { url: IMG_SHOP, text: '生产:各类外贸智能开关\n定制尺寸:86/118*72/86*146mm\n可OEM/ODM' },
    { url: IMG_STORY, text: 'Marclichte马克莱驰特深圳高端品牌创立于1985年' },
  ],
};
const GOOD_REPLY = { attributes: [
  { key: 'poleCount', valueVi: '1 ổ 2 chấu + 2 ổ 3 chấu', sourceId: 'specs', evidenceText: '插孔类型：二三三插' },
  { key: 'material', valueVi: 'đồng phốt-pho thiếc', sourceId: 'specs', evidenceText: '材质：锡磷青铜' },
  { key: 'modelNumber', valueVi: 'loại 86', sourceId: 'specs', evidenceText: '型号：86型' },
  // Ảnh bảng: nhãn và giá trị nằm khác dòng — bằng chứng chép lại phải được nhận.
  { key: 'dimensions', valueVi: '86mm × 86mm', sourceId: 'img1', evidenceText: '产品规格 86mm*86mm' },
  { key: 'voltage', valueVi: '250V', sourceId: 'img1', evidenceText: '10A/13A/250V' },
  { key: 'application', valueVi: 'ổ cắm điện lắp âm tường', sourceId: 'title', evidenceText: '墙壁暗装电源插座' },
  // AI bịa số không có trong nguồn → phải bị bỏ.
  { key: 'power', valueVi: '2500W', sourceId: 'img1', evidenceText: '功率 2500W' },
] };

// 1. Có mã HS → ô nhóm 8536 + ô chung, mô tả viết từ phiếu
extractReply = GOOD_REPLY;
extractCalls = 0;
const r1 = await buildDeclarationSheet({ ...SOCKET, hsCode: '85366932' });
const j1 = r1.json;
const f = (k) => j1.fields.find((x) => x.key === k);
check('200 + phiếu bản 1', r1.status === 200 && j1.sheetVersion === 1, JSON.stringify(j1).slice(0, 200));
check('ô nhóm 8536: điện áp, dòng, số cực', ['voltage', 'currentRating', 'poleCount'].every((k) => f(k)?.required && f(k)?.origin === 'HEADING'));
check('ô chung: công dụng, chất liệu, kích thước, nhãn hiệu, model', ['application', 'material', 'dimensions', 'brand', 'modelNumber'].every((k) => f(k)?.required));
check('tên nhóm 8536 không còn lấy tên dòng con', j1.heading?.titleVi === 'Thiết bị đóng cắt', j1.heading?.titleVi);
check('kích thước = bảng của sản phẩm (ảnh bảng), không lấy danh mục shop', f('dimensions')?.valueVi === '86mm × 86mm' && f('dimensions')?.evidence?.imageUrl === IMG_TABLE, JSON.stringify(f('dimensions')));
check('điện áp từ ảnh, nguồn IMAGE_OCR', f('voltage')?.valueVi === '250V' && f('voltage')?.source === 'IMAGE_OCR');
check('nhãn hiệu tách phần Latin, không cần AI', f('brand')?.valueVi === 'Marc Lichte' && f('brand')?.status === 'HAVE', JSON.stringify(f('brand')));
check('AI bịa công suất bị bỏ', !j1.extras.some((e) => e.key === 'power') && !f('power'));
check('đủ ô bắt buộc → missing rỗng', j1.missing.length === 0, JSON.stringify(j1.missing));
check('ảnh shop + ảnh thương hiệu bị gạt, có lý do', j1.images.filter((i) => !i.used).map((i) => i.url).join() === [IMG_SHOP, IMG_STORY].join() && j1.images.every((i) => i.used || i.reasonVi));
check('biến thể khách chọn được gửi cho AI', JSON.stringify(lastExtractUser?.sources || []).includes('一开多功能八孔'));
check('một lượt AI rút thông số', extractCalls === 1, String(extractCalls));
check('mô tả có chất liệu + nhãn hiệu, không chữ Trung', /đồng phốt-pho/.test(j1.description?.customsDescription || '') && /Marc Lichte/.test(j1.description?.customsDescription || '') && !/[㐀-鿿]/.test(j1.description?.customsDescription || ''), j1.description?.customsDescription);
const desc1 = j1.description?.customsDescription || '';
check('mô tả giữ đủ ô bắt buộc: 250V, 10A, số chấu, kích thước', ['250V', '10A', '1 ổ 2 chấu + 2 ổ 3 chấu', 'KT 86mm × 86mm'].every((x) => desc1.includes(x)), desc1);
check('mô tả ≤ 200 ký tự, ghép từ phiếu', desc1.length <= 200 && j1.description?.composedFrom === 'SHEET', String(desc1.length));
check('mô tả không lặp thông số AI đã trùng', (desc1.match(/250V/g) || []).length === 1, desc1);
check('chính sách 8536.69.32 = INFO, không bật cờ', j1.policy?.policyLevel === 'INFO' && j1.policy?.hasActionablePolicy === false, JSON.stringify(j1.policy));
check('mục nhãn hiệu/SHTT luôn có', j1.trademark && j1.trademark.brand === 'Marc Lichte' && j1.trademark.brandStatus === 'BRANDED' && typeof j1.trademark.noteVi === 'string');

// 2. AI lỗi → giá trị từ ảnh thành UNVERIFIED + câu hỏi xác nhận; không vào mô tả
extractReply = null;
const llmOrig = llmTier.callLLMJson;
llmTier.callLLMJson = async (system, user, o) => {
  if (system.includes('THÔNG SỐ SẢN PHẨM')) throw Object.assign(new Error('all providers failed'), { code: 'LLM' });
  return llmOrig(system, user, o);
};
const r2 = await buildDeclarationSheet({ ...SOCKET, imageTexts: [SOCKET.imageTexts[1]], hsCode: '85366932' });
const d2 = r2.json.fields.find((x) => x.key === 'dimensions');
check('AI lỗi: kích thước từ ảnh = UNVERIFIED, hỏi xác nhận', d2?.status === 'UNVERIFIED' && /có đúng là/.test(d2.questionVi || ''), JSON.stringify(d2));
check('AI lỗi: UNVERIFIED nằm trong missing', r2.json.missing.some((m) => m.key === 'dimensions' && m.status === 'UNVERIFIED'));
check('AI lỗi: báo llmError, vẫn 200', r2.status === 200 && r2.json.extraction.llmError);
llmTier.callLLMJson = llmOrig;

// 3. Người bổ sung thắng dữ liệu trang + không gọi AI lại cho khóa đó
extractReply = { attributes: [] };
extractCalls = 0;
const r3 = await buildDeclarationSheet({ ...SOCKET, imageTexts: [], hsCode: '85366932', supplements: [
  { key: 'dimensions', valueVi: '86 × 86 × 35 mm', source: 'sales' },
  { key: 'voltage', valueVi: '250V', source: 'DOCUMENT' },
  { key: 'material', valueVi: '材质', source: 'CUSTOMER' }, // chữ Trung → bỏ
] });
const d3 = r3.json.fields.find((x) => x.key === 'dimensions');
check('bổ sung của sales thắng, ghi nguồn SALES', d3?.valueVi === '86 × 86 × 35 mm' && d3.source === 'SALES' && d3.status === 'HAVE', JSON.stringify(d3));
check('bổ sung chứng từ ghi nguồn DOCUMENT', r3.json.fields.find((x) => x.key === 'voltage')?.source === 'DOCUMENT');
check('khóa đã bổ sung không gửi AI rút lại', !(lastExtractUser?.needKeys || []).includes('dimensions'));

// 3b. Lượt VÁ: lượt đầu AI bỏ sót chất liệu → hỏi lại riêng ô đó
{
  let n = 0;
  const saved = llmTier.callLLMJson;
  llmTier.callLLMJson = async (system, user, o) => {
    if (!system.includes('THÔNG SỐ SẢN PHẨM')) return saved(system, user, o);
    n += 1;
    const u = JSON.parse(user);
    if (n === 1) return { json: { attributes: GOOD_REPLY.attributes.filter((a) => a.key !== 'material') }, provider: 'stub', model: 'stub' };
    return { json: { attributes: [GOOD_REPLY.attributes.find((a) => a.key === 'material')] }, provider: 'stub', model: 'stub', _needKeys: u.needKeys };
  };
  const rv = await buildDeclarationSheet({ ...SOCKET, titleZh: SOCKET.titleZh + '新款', hsCode: '85366932' });
  llmTier.callLLMJson = saved;
  check('lượt vá: gọi AI lần 2 cho ô thiếu, có chất liệu', n === 2 && rv.json.fields.find((x) => x.key === 'material')?.valueVi === 'đồng phốt-pho thiếc' && rv.json.extraction.repairKeys.includes('material'), JSON.stringify([n, rv.json.extraction]));
}

// 3c. Tên hàng dài: ô bắt buộc vẫn đủ trong 200 ký tự; điện áp trần được thêm đơn vị; số chấu theo bảng cố định
{
  const saved = llmTier.callLLMJson;
  llmTier.callLLMJson = async (system, user, o) => {
    if (system.includes('THÔNG SỐ SẢN PHẨM')) return { json: { attributes: GOOD_REPLY.attributes.map((a) => (a.key === 'voltage' ? { ...a, valueVi: '250' } : a.key === 'poleCount' ? { ...a, valueVi: '2 chấu + 2 chấu + 3 chấu' } : a)) }, provider: 'stub', model: 'stub' };
    const r = await saved(system, user, o);
    r.json.declaration.tenHang = 'Ổ cắm điện âm tường gắn tường có công tắc kiểu 86 nhiều lỗ đa năng chống cháy cao cấp';
    return r;
  };
  const rl = await buildDeclarationSheet({ ...SOCKET, titleZh: SOCKET.titleZh + '长', hsCode: '85366932' });
  llmTier.callLLMJson = saved;
  const d = rl.json.description.customsDescription;
  check('tên dài: không cụt ở từ nối', !/(kèm|có|và|với|cho|loại|kiểu);/.test(d), d);
  check('tên dài: vẫn đủ 250V, 10A, số chấu, KT, ≤200', ['250V', '10A', '1 ổ 2 chấu + 2 ổ 3 chấu', 'KT 86mm × 86mm'].every((x) => d.includes(x)) && d.length <= 200, `${d.length} ${d}`);
}

// 3d. Chặn giá trị sai loại: tên nước không là nhãn hiệu; câu mô tả không là model
{
  const { plausibleValue } = require('../lib/extract-specs');
  check('brand "Đức" bị loại', !plausibleValue('brand', 'Đức') && !plausibleValue('brand', 'Sản xuất tại Đức'));
  check('brand thật giữ', plausibleValue('brand', 'Marc Lichte') && plausibleValue('brand', 'AIBUZ'));
  extractReply = { attributes: [] };
  const rk = await buildDeclarationSheet({ ...SOCKET, titleZh: SOCKET.titleZh + '旧', hsCode: '85366932', known: [{ key: 'brand', valueVi: 'Đức', source: 'SITE' }, { key: 'modelNumber', valueVi: 'Bộ lọc nước Starry Silver bốn tốc độ', source: 'SITE' }] });
  check('known sai loại (lần trước lưu) bị bỏ, lấy lại từ trang', rk.json.fields.find((x) => x.key === 'brand')?.valueVi === 'Marc Lichte' && rk.json.fields.find((x) => x.key === 'modelNumber')?.valueVi !== 'Bộ lọc nước Starry Silver bốn tốc độ', JSON.stringify(rk.json.fields.filter((x) => ['brand', 'modelNumber'].includes(x.key))));
  check('model câu mô tả bị loại, mã giữ', !plausibleValue('modelNumber', 'Bộ lọc nước Starry Silver bốn tốc độ') && plausibleValue('modelNumber', 'YLD-417') && plausibleValue('modelNumber', 'loại 86'));
}

// 3e. Review 05/10/2026 — các lỗi đã sửa
{
  const saved = llmTier.callLLMJson;
  // AI viết mô tả lỗi → tên hàng KHÔNG được là chữ Hán (rơi về tên biểu thuế)
  llmTier.callLLMJson = async (system, user, o) => {
    if (system.includes('THÔNG SỐ SẢN PHẨM')) return { json: { attributes: [] }, provider: 'stub', model: 'stub' };
    throw Object.assign(new Error('describe down'), { code: 'STUB' });
  };
  const rz = await buildDeclarationSheet({ titleZh: '86型墙壁暗装电源插座带开关测试', specsZh: [{ key: '额定电流', value: '10A' }], hsCode: '85366932' });
  const dz = rz.json.description?.customsDescription || '';
  check('AI lỗi: mô tả không lọt chữ Hán, đánh dấu degraded', !/[㐀-鿿]/.test(dz) && rz.json.description.degraded === true, dz);
  // Mã 6 số: chỉ khung ô theo nhóm, không mô tả / chính sách
  const r6 = await buildDeclarationSheet({ titleZh: '活牛测试', specsZh: [{ key: '额定电流', value: '10A' }], hsCode: '010121' });
  check('mã 6 số: không viết mô tả / chính sách, có cảnh báo', r6.status === 200 && !r6.json.description && !r6.json.policy && r6.json.headingOnly === '010121' && r6.json.hsCode === null, JSON.stringify([r6.json.hsCode, r6.json.headingOnly]));
  // specsZh dạng chuỗi
  const rs = await buildDeclarationSheet({ specsZh: '材质: 不锈钢\n电压: 220V' });
  check('specsZh dạng chuỗi được nhận', rs.status === 200 && rs.json.fields.length > 0, String(rs.status));
  llmTier.callLLMJson = saved;
}
{
  const { plausibleValue } = require('../lib/extract-specs');
  check('model: câu mô tả có số bị loại, "Pro Max" giữ', !plausibleValue('modelNumber', 'Ổ cắm 5 lỗ có công tắc âm tường loại mới') && plausibleValue('modelNumber', 'Pro Max') && plausibleValue('modelNumber', 'CN-510L'));
  // Bằng chứng: các mẩu phải gần nhau; số phải có trong bằng chứng
  const { extractSpecs } = require('../lib/extract-specs');
  const far = '材质: 塑料\n' + '其他说明'.repeat(30) + '\n赠品: 不锈钢勺子';
  const ev = await extractSpecs({ titleZh: '水杯测试远', specsZh: far, needKeys: ['material'] }, { llm: async () => ({ json: { attributes: [{ key: 'material', valueVi: 'thép không gỉ', sourceId: 'specs', evidenceText: '材质 不锈钢' }] } }) });
  check('bằng chứng ghép 2 dòng xa nhau bị loại', !ev.attributes.some((a) => a.key === 'material' && a.valueVi === 'thép không gỉ'), JSON.stringify(ev.attributes));
  const evn = await extractSpecs({ titleZh: '插座测试数', specsZh: [{ key: '规格', value: '10A' }], needKeys: ['voltage'] }, { llm: async () => ({ json: { attributes: [{ key: 'voltage', valueVi: '250', sourceId: 'specs', evidenceText: '10A' }] } }) });
  check('số không có trong bằng chứng bị loại (250 từ "10A")', !evn.attributes.some((a) => a.key === 'voltage'), JSON.stringify(evn.attributes));
}

// 3f. CEO 08/10/2026 — nhãn hiệu là tên riêng (không dịch) + ghép chất liệu theo bộ phận.
// Ca thật: kính lão 9004.90.10 (Taobao) — 镜片材质 PC / 镜框材质 金属 / 品牌 柚莎 / 货号 603 + 1 ảnh OCR.
{
  const GLASSES = {
    titleZh: '眉毛架老花眼镜中老年高档男高清防蓝光花镜工厂批商务变色老花镜',
    specsZh: [{ key: '镜片材质', value: 'PC' }, { key: '镜框材质', value: '金属' }, { key: '镜架材质', value: '金属' }, { key: '品牌', value: '柚莎' }, { key: '货号', value: '603' }],
    imageTexts: [{ url: 'https://img/glasses.jpg', text: '产品类型： 防蓝光老花镜 镜架材质：金属 产品重量： 25.8g 镜片 材质: PC 147mm 50mm 39mm 17mm 135mm' }],
    hsCode: '90049010',
  };
  const saved = llmTier.callLLMJson;
  let askedBrand = null;
  // AI soát ảnh: ứng viên "PC 147mm…" của bộ phận 镜片 → "PC" (ghi part). Nhãn hiệu KHÔNG được gửi dịch.
  llmTier.callLLMJson = async (system, user, o) => {
    if (!system.includes('THÔNG SỐ SẢN PHẨM')) return saved(system, user, o);
    const u = JSON.parse(user);
    askedBrand = Boolean(u.allowedKeys.brand) || (u.translate || []).some((t) => t.key === 'brand');
    return { json: { attributes: [{ key: 'material', valueVi: 'PC', part: '镜片', sourceId: 'img1', evidenceText: '镜片 材质: PC' }] }, provider: 'stub', model: 'stub' };
  };
  const rg = await buildDeclarationSheet(GLASSES);
  llmTier.callLLMJson = saved;
  const g = (k) => rg.json.fields.find((x) => x.key === k);
  check('brand chữ Hán → HAVE, giữ chữ gốc, có note, không gửi AI dịch', g('brand')?.status === 'HAVE' && g('brand').valueVi === '柚莎' && g('brand').valueZh === '柚莎' && /tên riêng/.test(g('brand').note || '') && askedBrand === false, JSON.stringify([g('brand'), askedBrand]));
  check('brand chữ Hán: trademark nhận chuỗi gốc, BRANDED, cờ brandHanOnly', rg.json.trademark.brand === '柚莎' && rg.json.trademark.brandZh === '柚莎' && rg.json.trademark.brandStatus === 'BRANDED' && rg.json.trademark.brandHanOnly === true, JSON.stringify(rg.json.trademark));
  check('brand chữ Hán không nằm trong missing', !rg.json.missing.some((m) => m.key === 'brand'), JSON.stringify(rg.json.missing));
  check('material ghép tròng/gọng theo thứ tự trang, method MERGED_PARTS', g('material')?.valueVi === 'tròng: PC; gọng: kim loại' && g('material').method === 'MERGED_PARTS' && g('material').status === 'HAVE', JSON.stringify(g('material')));
  check('material: mỗi mẩu giữ bằng chứng riêng', g('material')?.parts?.length === 2 && g('material').parts.every((p) => p.part?.vi && p.evidence?.text) && g('material').parts[1].evidence.text === '镜框材质：金属', JSON.stringify(g('material')?.parts));
  check('ảnh + trang cùng bộ phận (镜架材质 金属 / 镜片 材质 PC) không lặp', (g('material').valueVi.match(/kim loại/g) || []).length === 1 && (g('material').valueVi.match(/PC/g) || []).length === 1, g('material').valueVi);
  check('model 货号 Latin giữ nguyên', g('modelNumber')?.valueVi === '603' && g('modelNumber').status === 'HAVE');
  const dg = rg.json.description.customsDescription;
  check('mô tả ECUS: thành phần ghép, không chữ Hán, không lặp "PC", ≤200', /thành phần: tròng: PC; gọng: kim loại/.test(dg) && !/[㐀-鿿]/.test(dg) && (dg.match(/PC/g) || []).length === 1 && dg.length <= 200, dg);
  check('mô tả ECUS: nhãn chữ Hán bị bỏ khỏi mô tả, báo omittedHan', !/nhãn hiệu/.test(dg) && rg.json.description.descriptionMeta.omittedHan?.[0]?.key === 'brand', JSON.stringify(rg.json.description.descriptionMeta));
  // Tín hiệu BRAND_HAN_ONLY vẫn ghi dù ô không thiếu
  const { signalsFromSheet } = require('../lib/demand-signals');
  const sig = signalsFromSheet({ sheet: rg.json, mapped: { hsListings: [], policyLines: [] }, specsZh: GLASSES.specsZh });
  check('tín hiệu BRAND_HAN_ONLY vẫn ghi', sig.some((x) => x.t === 'BRAND_HAN_ONLY' && x.k === '柚莎'), JSON.stringify(sig.filter((x) => /BRAND/.test(x.t))));

  // Không có AI: vẫn ghép được từ trang (金属 dịch bảng cố định), ảnh chưa soát không chen vào
  llmTier.callLLMJson = async (system, user, o) => {
    if (system.includes('THÔNG SỐ SẢN PHẨM')) throw Object.assign(new Error('no llm'), { code: 'LLM' });
    return saved(system, user, o);
  };
  const rn = await buildDeclarationSheet({ ...GLASSES, titleZh: GLASSES.titleZh + '无AI' });
  llmTier.callLLMJson = saved;
  const mn = rn.json.fields.find((x) => x.key === 'material');
  check('AI lỗi: material vẫn ghép từ trang, không lẫn "147mm" của ảnh chưa soát', mn?.valueVi === 'tròng: PC; gọng: kim loại' && mn.status === 'HAVE', JSON.stringify(mn));

  // brand "无品牌" → "không nhãn hiệu" như cũ; brand Latin không đổi; known/supplement chữ Hán cho ô tên riêng được nhận
  extractReply = { attributes: [] };
  const rb = await buildDeclarationSheet({ titleZh: '老花镜无牌测试', specsZh: [{ key: '品牌', value: '无品牌' }, { key: '镜框材质', value: '金属' }], hsCode: '90049010' });
  const bb = rb.json.fields.find((x) => x.key === 'brand');
  check('brand 无品牌 → "không nhãn hiệu", NO_BRAND, không note', bb?.valueVi === 'không nhãn hiệu' && rb.json.trademark.brandStatus === 'NO_BRAND' && !bb.note, JSON.stringify([bb, rb.json.trademark.brandStatus]));
  check('brand Latin (Marc Lichte) không đổi, không note', f('brand')?.valueVi === 'Marc Lichte' && !f('brand').note);
  const rs = await buildDeclarationSheet({ titleZh: '老花镜补充测试', specsZh: [{ key: '镜框材质', value: '金属' }], hsCode: '90049010', supplements: [{ key: 'brand', valueVi: '柚莎', source: 'SALES' }, { key: 'material', valueVi: '金属', source: 'SALES' }] });
  check('supplement chữ Hán: nhận cho ô tên riêng (brand), vẫn bỏ cho ô khác (material)', rs.json.fields.find((x) => x.key === 'brand')?.valueVi === '柚莎' && rs.json.fields.find((x) => x.key === 'brand').source === 'SALES' && rs.json.fields.find((x) => x.key === 'material')?.valueVi === 'kim loại', JSON.stringify(rs.json.fields.filter((x) => ['brand', 'material'].includes(x.key)).map((x) => [x.key, x.valueVi, x.source])));
  // material một nguồn (không bộ phận) giữ luật cũ: 1 giá trị, không parts
  const r1s = await buildDeclarationSheet({ titleZh: '水壶单材质测试', specsZh: [{ key: '材质', value: '不锈钢' }], hsCode: '90049010' });
  const m1 = r1s.json.fields.find((x) => x.key === 'material');
  check('material đơn nguồn: giữ 1 giá trị, không parts/part', m1?.valueVi === 'thép không gỉ' && !m1.parts && !m1.part && m1.method === 'DICTIONARY', JSON.stringify(m1));
  // Cùng ô, 2 bộ phận nhưng ô KHÔNG có khái niệm bộ phận (voltage) → chọn 1 như cũ
  const rv = await buildDeclarationSheet({ titleZh: '插座电压测试', specsZh: [{ key: '额定电压', value: '220V' }, { key: '输入电压', value: '110V' }], hsCode: '85366932' });
  const vv = rv.json.fields.find((x) => x.key === 'voltage');
  check('ô không có khái niệm bộ phận (voltage) không bị ghép', vv?.valueVi === '220V' && !vv.parts, JSON.stringify(vv));
  // 1 bộ phận duy nhất (chỉ 镜框材质) → giá trị thường + ghi part, không ghép
  const rp = await buildDeclarationSheet({ titleZh: '镜框单件测试', specsZh: [{ key: '镜框材质', value: '金属' }], hsCode: '90049010' });
  const mp = rp.json.fields.find((x) => x.key === 'material');
  check('chỉ 1 bộ phận: giá trị thường + part, không ghép', mp?.valueVi === 'kim loại' && mp.part?.vi === 'gọng' && !mp.parts, JSON.stringify(mp));
  // Đơn vị bộ phận: partOfLabel / partBeforeLabel
  const { partOfLabel, partBeforeLabel } = require('../lib/extract-specs');
  check('partOfLabel: 镜片材质 → tròng/材质; 材质 → null', partOfLabel('镜片材质')?.part.vi === 'tròng' && partOfLabel('镜片材质').rest === '材质' && partOfLabel('材质') === null);
  check('partBeforeLabel: "镜片 材质: PC" trong chữ OCR → tròng', partBeforeLabel('材质', '产品重量： 25.8g 镜片 材质: PC 147mm')?.vi === 'tròng' && partBeforeLabel('材质', '产品重量： 25.8g 材质: PC') === null);
}

// 4. Không có mã HS → chỉ ô chung, chưa viết mô tả
extractReply = GOOD_REPLY;
const r4 = await buildDeclarationSheet({ ...SOCKET });
check('không mã: chỉ ô chung, không description', r4.status === 200 && !r4.json.hsCode && r4.json.fields.every((x) => x.origin === 'COMMON') && r4.json.description === undefined);

// 5. Chương 1–38 (thực phẩm): chất liệu/kích thước không bắt buộc
const food = sheetFieldDefs('19053120');
check('thực phẩm: chất liệu/kích thước không bắt buộc', food.defs.find((x) => x.key === 'material')?.required === false && food.defs.find((x) => x.key === 'dimensions')?.required === false);

// 5b. Mẫu ô theo dải nhóm (CEO 08/10/2026: "mỗi sản phẩm một nhóm đặc tính, phiếu không được
// luôn đòi điện áp/công suất"). Kính lão 9004.90.10 bị đòi nguyên lý + điện áp → sửa vĩ mô chương 90/94.
{
  const keys = (hs) => Object.fromEntries(sheetFieldDefs(hs).defs.map((d) => [d.key, d]));
  const tpl = (hs) => sheetFieldDefs(hs).heading?.template;
  const k9004 = keys('90049010');
  check('9004 kính mắt: không điện áp / nguyên lý / đại lượng đo', !k9004.voltage && !k9004.principle && !k9004.measurementType, Object.keys(k9004).join());
  check('9004 kính mắt: loại kính, tròng, gọng bắt buộc; độ chỉ khuyến nghị (kính râm không có độ)', ['eyewearType', 'lensMaterial', 'frameMaterial'].every((k) => k9004[k]?.required && k9004[k].origin === 'HEADING') && k9004.lensPower?.required === false && tpl('90049010') === 'eyewear', tpl('90049010'));
  check('9003 gọng kính: chất liệu gọng, không điện', keys('90031100').frameMaterial?.required && !keys('90031100').voltage);
  const k9018 = keys('90189090');
  check('9018 y tế: bộ phận tiếp xúc bắt buộc; phân loại rủi ro + nguồn điện tuỳ chọn', k9018.bodyContact?.required && k9018.riskClass?.required === false && k9018.powerSource?.required === false && !k9018.voltage, Object.keys(k9018).join());
  check('9027 thiết bị đo vẫn sensorInstrument (đại lượng đo + điện áp)', tpl('90275000') === 'sensorInstrument' && keys('90275000').measurementType?.required && keys('90275000').voltage?.required);
  check('9005 ống nhòm: độ phóng đại bắt buộc, nguồn điện không', keys('90051000').magnification?.required && keys('90051000').powerSource?.required === false);
  check('9017 thước/compa: không đòi điện áp', tpl('90178000') === 'measuringInstrument' && !keys('90178000').voltage);
  const k9401 = keys('94016100');
  check('9401 ghế: không ô điện, có loại nội thất + chất liệu + kích thước', !k9401.voltage && !k9401.power && !k9401.lightType && k9401.furnitureType?.required && k9401.material?.required && k9401.dimensions?.required, Object.keys(k9401).join());
  check('9405 đèn: vẫn có công suất + điện áp + loại đèn', ['power', 'voltage', 'lightType'].every((k) => keys('94054290')[k]?.required));
  check('8536 không đổi: điện áp, dòng, số cực', ['voltage', 'currentRating', 'poleCount'].every((k) => keys('85366932')[k]?.required) && tpl('85366932') === 'switchgear');
  check('8523 SSD/USB: dung lượng + kết nối, không điện áp', keys('85235100').storageCapacity?.required && !keys('85235100').voltage);
  check('8482 ổ bi: không còn mẫu van', tpl('84821000') === 'bearing' && !keys('84821000').valveType);
  check('6406 đế giày: không đòi mũi giày/size', tpl('64062000') === 'footwearPart' && !keys('64062000').upperMaterial);
  check('8215 thìa dĩa: không đòi vật liệu lưỡi', !keys('82159900').bladeMaterial && keys('82159900').toolType?.required);
  check('3406 nến: không đòi hoạt chất', tpl('34060000') === 'candle' && !keys('34060000').activeIngredient);
  // Ô mới phải nằm trong từ điển zh để AI rút được (declaration-sheet chỉ hỏi AI khóa có trong từ điển)
  const { dictionary } = require('../lib/zh-specs');
  const zhKeys = dictionary().keys || {};
  const newKeys = ['eyewearType', 'lensPower', 'lensMaterial', 'frameMaterial', 'magnification', 'powerSource', 'bodyContact', 'riskClass', 'furnitureType', 'focalLength'];
  check('ô mới có trong từ điển zh + catalog', newKeys.every((k) => zhKeys[k]?.zh?.length && require('../data/chapter-declaration-fields.json').fields[k]?.labelVi), newKeys.filter((k) => !zhKeys[k]).join());
  // Kính lão thật: thông số trang (镜片材质/镜框材质/度数/产品类别) khớp từ điển → không còn thiếu ô
  const { missingStructured } = require('../lib/declaration-fields');
  const miss = missingStructured('90049010', { nameZh: '老花镜', specsZh: [{ key: '镜片材质', value: 'PC' }, { key: '镜框材质', value: '金属' }, { key: '产品类别', value: '老花镜' }, { key: '货号', value: '603' }, { key: '度数', value: '+100度,+150度' }] });
  check('9004 thông số 1688 khớp từ điển → không thiếu ô bắt buộc', miss.length === 0, miss.map((m) => m.key).join());
}

// 6. Tín hiệu hàng nhái trên tên hàng
check('高仿 / 同款 → tín hiệu SHTT', counterfeitSignals('高仿 耐克同款 运动鞋').length === 2);
check('tên thường → không tín hiệu', counterfeitSignals('86型墙壁插座').length === 0);

// 7. Handler HTTP: rewrite /api/declaration-sheet → /api/describe?mode=sheet, cần Bearer
async function call(body, token = 'sheet-test-token', mode = 'sheet') {
  const res = { _s: 0, _j: null, headers: {}, setHeader(k, v) { this.headers[k] = v; }, getHeader(k) { return this.headers[k]; }, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } };
  await handler({ method: 'POST', url: '/api/describe', query: mode ? { mode } : {}, headers: token ? { authorization: `Bearer ${token}` } : {}, body }, res);
  return res;
}
check('HTTP: thiếu token → 401', (await call(SOCKET, null))._s === 401);
check('HTTP: body rỗng → 400', (await call({}))._s === 400);
extractReply = GOOD_REPLY;
const h = await call({ ...SOCKET, hsCode: '85366932' });
check('HTTP: 200 + fields', h._s === 200 && Array.isArray(h._j?.fields));
failDescribe = true;
const h2 = await call({ hsCode: '85366932', productName: 'Ổ cắm' }, 'sheet-test-token', null);
check('describe thường vẫn chạy (degraded khi AI lỗi)', h2._s === 200 && h2._j?.degraded === true, JSON.stringify([h2._s, h2._j?.degraded, h2._j?.error]));


// ── 09/10/2026: ô bắt buộc dài không được đẩy tên hàng/model ra khỏi mô tả ECUS (ca kính lão prod) ──
{
  const { composeFromSheet, clipSpec } = await import('../lib/declaration-sheet.js').then((m) => m.default || m);
  const F = (key, labelVi, valueVi, required = true) => ({ key, labelVi, valueVi, status: 'HAVE', required });
  const fields = [
    F('eyewearType', 'Loại kính mắt', 'kính chống ánh sáng xanh'), F('lensMaterial', 'Chất liệu tròng kính', 'PC'), F('frameMaterial', 'Chất liệu gọng kính', 'kim loại'),
    F('modelNumber', 'Model', '603'), F('dimensions', 'Kích thước', '147 x 50 x 39 mm (tổng rộng x tròng x đ cao), cầu mũi 17 mm, càng kính 135 mm'),
    F('lensPower', 'Độ kính', 'chống ánh sáng xanh, +100 độ, +150 độ, +200 độ', false), F('targetGroup', 'Đối tượng', 'nam trung niên và cao tuổi', false),
    F('application', 'Công dụng', 'kính lão thị chống ánh sáng xanh'),
    { ...F('material', 'Chất liệu / thành phần cấu tạo', 'tròng: PC; gọng: kim loại'), parts: [{ part: { zh: '镜片', vi: 'tròng' }, valueVi: 'PC' }, { part: { zh: '镜框', vi: 'gọng' }, valueVi: 'kim loại' }] },
    { ...F('brand', 'Nhãn hiệu', '柚莎'), valueZh: '柚莎' },
  ];
  const r = composeFromSheet(fields, [], { tenHang: 'Kính lão chống ánh sáng xanh', thongSoKyThuat: [] }, { brandStatus: 'BRANDED' }, { productName: 'Kính thuốc', origin: 'Trung Quốc', condition: 'Mới 100%' });
  check('ECUS giữ nguyên tên hàng khi ô bắt buộc dài', r.declaration.tenHang === 'Kính lão chống ánh sáng xanh', r.declaration.tenHang);
  check('ECUS giữ model 603', r.declaration.model === '603' && r.composed.text.includes('model 603'), r.composed.text);
  check('ECUS rút kích thước về cốt lõi thay vì bỏ', /(kích thước|KT) 147 x 50 x 39 mm/.test(r.composed.text) && !r.composed.text.includes('tổng rộng'), r.composed.text);
  check('ECUS ≤ 200 ký tự, không báo rơi ô bắt buộc', r.composed.text.length <= 200 && r.requiredDropped.length === 0, `${r.composed.text.length} ${r.requiredDropped.join(',')}`);
  check('clipSpec bỏ ngoặc + lấy vế đầu', clipSpec('147 x 50 x 39 mm (tổng rộng), cầu mũi 17 mm') === '147 x 50 x 39 mm');
}


// ── 09/10/2026: ô chất liệu theo bộ phận (mẫu 9004) gộp vào "thành phần", không thành dòng thông số ──
{
  const { composeFromSheet } = await import('../lib/declaration-sheet.js').then((m) => m.default || m);
  const F = (key, labelVi, valueVi, required = true, extra = {}) => ({ key, labelVi, valueVi, status: 'HAVE', required, ...extra });
  const fields = [
    F('eyewearType', 'Loại kính mắt', 'kính viễn lão'), F('lensMaterial', 'Chất liệu tròng kính', 'PC'), F('frameMaterial', 'Chất liệu gọng kính', 'kim loại'),
    F('modelNumber', 'Model', '603'), F('dimensions', 'Kích thước', '147×50-39-17-135mm'),
    F('lensPower', 'Độ kính', '+100 độ,+150 độ,+200 độ,+250 độ,+300 độ,+350 độ,+400 độ', false), F('targetGroup', 'Đối tượng', 'thông dụng', false),
    F('color', 'Màu sắc', 'vàng, bạc, vàng chuyển xám, bạc chuyển xám', false),
    F('application', 'Công dụng', 'kính lão chống ánh sáng xanh cho người lớn tuổi'), F('material', 'Chất liệu / thành phần cấu tạo', 'PC'),
    F('brand', 'Nhãn hiệu', '柚莎', true, { valueZh: '柚莎' }),
  ];
  const r = composeFromSheet(fields, [], { tenHang: 'Kính lão chống ánh sáng xanh', thongSoKyThuat: [] }, { brandStatus: 'BRANDED' }, { productName: 'Kính thuốc', origin: 'Trung Quốc', condition: 'Mới 100%' });
  check('thành phần gộp theo bộ phận', r.declaration.thanhPhanCauTao === 'tròng: PC; gọng: kim loại', r.declaration.thanhPhanCauTao);
  check('không lặp "chất liệu tròng kính" trong thông số', !r.composed.text.includes('chất liệu tròng kính') && !r.composed.text.includes('chất liệu gọng kính'), r.composed.text);
  check('model 603 còn trong mô tả (ca prod 09/10)', r.composed.text.includes('model 603'), r.composed.text);
  check('mô tả ≤ 200', r.composed.text.length <= 200, String(r.composed.text.length));
  const r2 = composeFromSheet([F('material', 'Chất liệu', 'thép không gỉ'), F('modelNumber', 'Model', 'X1')], [], { tenHang: 'Dao', thongSoKyThuat: [] }, { brandStatus: 'NO_BRAND' }, { productName: 'Dao', origin: 'Trung Quốc', condition: 'Mới 100%' });
  check('không có ô bộ phận → thành phần như cũ', r2.declaration.thanhPhanCauTao === 'thép không gỉ');
}


// ── 09/10/2026 (prod lần 2): tên AI dài dòng phải rút TRƯỚC khi bỏ model; rút theo vế dấu phẩy ──
{
  const { composeFromSheet } = await import('../lib/declaration-sheet.js').then((m) => m.default || m);
  const F = (key, labelVi, valueVi, required = true, extra = {}) => ({ key, labelVi, valueVi, status: 'HAVE', required, ...extra });
  const fields = [
    F('eyewearType', 'Loại kính mắt', 'kính viễn'), F('lensMaterial', 'Chất liệu tròng kính', 'PC'), F('frameMaterial', 'Chất liệu gọng kính', 'kim loại'),
    F('modelNumber', 'Model', '603'), F('dimensions', 'Kích thước', '147×50-39-17-135 mm'),
    F('lensPower', 'Độ kính', '+100 độ,+150 độ,+200 độ,+250 độ,+300 độ', false), F('color', 'Màu sắc', 'vàng, bạc, vàng chuyển xám, bạc chuyển xám', false),
    F('application', 'Công dụng', 'kính lão chống ánh sáng xanh cho người lớn tuổi'), F('material', 'Chất liệu / thành phần cấu tạo', 'PC'),
    F('brand', 'Nhãn hiệu', '柚莎', true, { valueZh: '柚莎' }),
  ];
  const r = composeFromSheet(fields, [], { tenHang: 'Kính lão chống ánh sáng xanh cho nam, lão hoá cao cấp, có đổi màu, gọng kim loại nửa viền', thongSoKyThuat: [] }, { brandStatus: 'BRANDED' }, { productName: 'Kính thuốc', origin: 'Trung Quốc', condition: 'Mới 100%' });
  check('tên dài rút theo vế dấu phẩy, không cụt ở "gọng"', r.declaration.tenHang === 'Kính lão chống ánh sáng xanh cho nam' || r.declaration.tenHang === 'Kính lão chống ánh sáng xanh cho nam, lão hoá cao cấp', r.declaration.tenHang);
  check('model 603 giữ lại thay vì tên dài', r.declaration.model === '603' && r.composed.text.includes('model 603'), r.composed.text);
  check('mô tả ≤ 200', r.composed.text.length <= 200, String(r.composed.text.length));
}


// ── 09/10/2026 (CEO): SKU đang chọn + bảng kiện + ảnh (vision) + chữ mô tả — ưu tiên nguồn
//    SKU đang chọn > bảng thuộc tính trang > bảng kiện > ảnh (vision/OCR) > mô tả ──
{
  const imageFacts = require('../lib/image-facts');
  const { filterDescriptionLines, normalizePackaging, normalizeSkuSelected, normalizeImages, PACKAGE_KEYS } = require('../lib/declaration-sheet');
  const { measureOf } = require('../lib/extract-specs');
  const savedLlm = llmTier.callLLMJson;
  const savedVision = imageFacts.readImageFacts;
  const SKU_IMG = 'https://cbu01.alicdn.com/img/ibank/sku-gold.jpg';
  const MAIN_IMG = 'https://cbu01.alicdn.com/img/ibank/main.jpg';
  const GL = {
    titleZh: '老花镜防蓝光商务金属半框中老年高清老花眼镜',
    specsZh: [
      { key: '颜色分类', value: '金色,银色,黑色,枪色' },
      { key: '镜片材质', value: 'PC' },
      { key: '尺寸', value: '147mm' },
      { key: '货号', value: '603' },
    ],
    skuSelected: [
      { group: '颜色分类', value: '商务金【升级防蓝光镜片】', imageUrl: SKU_IMG, qty: 2 },
      { group: '度数', value: '150度（建议50-54岁）' },
      { group: '镜片折射率', value: '150度（建议50-54岁）' },
      { group: '', value: 'bỏ' }, { group: '坏', value: '' }, 'rác', null,
    ],
    packaging: { sku: { 镜框颜色: '金色', 度数: '防蓝光' }, lengthCm: 17, widthCm: 11, heightCm: 10, volumeCm3: 1870, weightG: 40 },
    descriptionText: '欢迎光临本店，全场包邮\n镜架材质：金属\n产品重量 25.8g\n镜架材质：金属\n这是一段很长的广告文字没有任何参数\n',
    images: [{ url: MAIN_IMG, role: 'main' }, { url: SKU_IMG, role: 'sku' }, { url: 'ftp://bad', role: 'sku' }, { role: 'sku' }],
    hsCode: '90049010',
  };
  let lastUser = null;
  llmTier.callLLMJson = async (system, user, o) => {
    if (!system.includes('THÔNG SỐ SẢN PHẨM')) return savedLlm(system, user, o);
    lastUser = JSON.parse(user);
    const reply = [];
    if ((lastUser.translate || []).some((t) => t.key === 'color' && t.valueZh.startsWith('金色'))) reply.push({ key: 'color', valueVi: 'vàng, bạc, đen, xám', sourceId: 'specs', evidenceText: '颜色分类：金色,银色,黑色,枪色' });
    if ((lastUser.translate || []).some((t) => t.key === 'color' && t.valueZh.startsWith('商务金'))) reply.push({ key: 'color', valueVi: 'vàng thương gia', sourceId: 'specs', evidenceText: '已选规格(颜色分类)：商务金【升级防蓝光镜片】' });
    return { json: { attributes: reply }, provider: 'stub', model: 'stub' };
  };
  let visionCalls = [];
  imageFacts.readImageFacts = async (images, opts) => {
    visionCalls.push({ images, opts });
    return {
      images: images.map((i) => ({ ...i, fetched: true })), engine: { provider: 'gemini', model: 'stub-vision' },
      seenText: ['603', 'Blue Light Blocking', '防蓝光'],
      facts: [
        { key: 'frameMaterial', valueVi: 'kim loại', valueZh: null, evidence: 'thấy gọng kim loại màu vàng', confidence: 0.95, imageUrl: SKU_IMG },
        { key: 'lensMaterial', valueVi: 'nhựa', valueZh: null, evidence: 'tròng trong suốt', confidence: 0.6, imageUrl: SKU_IMG },
        { key: 'color', valueVi: 'đen', valueZh: null, evidence: 'gọng đen', confidence: 0.6, imageUrl: SKU_IMG },
        { key: 'eyewearType', valueVi: 'kính lão chống ánh sáng xanh', valueZh: null, evidence: 'nhãn Blue Light Blocking', confidence: 0.7, imageUrl: SKU_IMG },
      ],
    };
  };
  process.env.HS_SHEET_VISION = '1';
  const r = await buildDeclarationSheet(GL);
  const g = (k) => r.json.fields.find((x) => x.key === k) || r.json.extras.find((x) => x.key === k);
  check('SKU: 200, giữ skuSelected đã lọc (3 mục hợp lệ, có qty/imageUrl)', r.status === 200 && r.json.skuSelected?.length === 3 && r.json.skuSelected[0].qty === 2 && r.json.skuSelected[0].imageUrl === SKU_IMG, JSON.stringify(r.json.skuSelected));
  check('SKU đang chọn thắng bảng thuộc tính nhiều giá trị (color)', g('color')?.valueVi === 'vàng thương gia' && g('color').source === 'SITE', JSON.stringify(g('color')));
  check('SKU: method SKU_SELECTED, tin 0.95, bằng chứng "SKU đang chọn: nhóm=giá trị"', g('color')?.method === 'SKU_SELECTED' && g('color').confidence === 0.95 && g('color').evidence?.text === 'SKU đang chọn: 颜色分类=商务金【升级防蓝光镜片】', JSON.stringify(g('color')));
  check('SKU: nhóm 度数 dịch key → lensPower, số đo rút bằng regex (không chờ AI)', g('lensPower')?.valueVi === '150 độ' && g('lensPower').method === 'SKU_SELECTED' && !(lastUser?.translate || []).some((t) => t.key === 'lensPower'), JSON.stringify([g('lensPower'), lastUser?.translate]));
  check('SKU: nhóm lạ 镜片折射率 KHÔNG bị khớp giả thành chất liệu tròng', g('lensMaterial')?.valueVi === 'PC' && g('lensMaterial').source === 'SITE', JSON.stringify(g('lensMaterial')));
  check('measureOf: 150度（建议50-54岁） → "150 độ"; 220V giữ; chữ → null', measureOf('150度（建议50-54岁）') === '150 độ' && measureOf('220V') === '220V' && measureOf('金色') === null);
  // Kiện đóng gói
  check('kiện → ô riêng packageDimensions/Weight/Volume, nguồn SITE, bằng chứng 商品件重尺', g('packageDimensions')?.valueVi === '17×11×10 cm' && g('packageWeight')?.valueVi === '40 g' && g('packageVolume')?.valueVi === '1870 cm³' && [g('packageDimensions'), g('packageWeight'), g('packageVolume')].every((x) => x.source === 'SITE' && /商品件重尺/.test(x.evidence?.text || '') && x.packaging === true), JSON.stringify([g('packageDimensions'), g('packageWeight'), g('packageVolume')]));
  check('kiện KHÔNG đè kích thước sản phẩm từ trang', g('dimensions')?.valueVi === '147mm' && !g('dimensions').packaging, JSON.stringify(g('dimensions')));
  check('sheet.packaging ghi rõ là kiện, có sku + thể tích', r.json.packaging?.dimsCm === '17×11×10 cm' && r.json.packaging.sku?.镜框颜色 === '金色' && /KIỆN/.test(r.json.packaging.noteVi), JSON.stringify(r.json.packaging));
  const desc = r.json.description?.customsDescription || '';
  check('mô tả ECUS không dùng số đo kiện, vẫn có 147mm', !desc.includes('17×11×10') && !desc.includes('1870') && desc.includes('147mm'), desc);
  // Mô tả
  check('descriptionText lọc tất định: giữ dòng key：value + dòng số đơn vị, bỏ quảng cáo, bỏ trùng', filterDescriptionLines(GL.descriptionText) === '镜架材质：金属\n产品重量 25.8g', JSON.stringify(filterDescriptionLines(GL.descriptionText)));
  const descSrc = (lastUser?.sources || []).find((x) => x.id === 'desc');
  check('descriptionText vào AI như nguồn trang (id desc), sau specs, trước ảnh', descSrc && descSrc.text === '镜架材质：金属\n产品重量 25.8g' && lastUser.sources.findIndex((x) => x.id === 'specs') < lastUser.sources.findIndex((x) => x.id === 'desc'), JSON.stringify(lastUser?.sources?.map((x) => x.id)));
  // Ảnh → vision
  check('vision: gọi 1 lần, ảnh hợp lệ (bỏ ftp/thiếu url), có headingKeys + hsCode', visionCalls.length === 1 && visionCalls[0].images.length === 2 && visionCalls[0].images.every((i) => /^https:/.test(i.url)) && visionCalls[0].opts.hsCode === '90049010' && visionCalls[0].opts.headingKeys.frameMaterial, JSON.stringify(visionCalls[0]?.images));
  check('vision: điền ô thiếu (frameMaterial), nguồn IMAGE_AI, tin kẹp ≤ 0.8', g('frameMaterial')?.valueVi === 'kim loại' && g('frameMaterial').source === 'IMAGE_AI' && g('frameMaterial').confidence <= 0.8 && g('frameMaterial').status === 'HAVE' && g('frameMaterial').evidence?.imageUrl === SKU_IMG, JSON.stringify(g('frameMaterial')));
  check('vision: KHÔNG đè ô đã có từ trang (lensMaterial PC) / SKU (color)', g('lensMaterial')?.valueVi === 'PC' && g('color')?.valueVi === 'vàng thương gia', JSON.stringify([g('lensMaterial')?.valueVi, g('color')?.valueVi]));
  check('vision: headingKeys không gửi ô đã chắc (lensMaterial, color)', !visionCalls[0].opts.headingKeys.lensMaterial && !visionCalls[0].opts.headingKeys.color, JSON.stringify(visionCalls[0].opts.headingKeys));
  const imgs = r.json.images;
  check('sheet.images[] ghi role, used:true, preview = chữ AI thấy', imgs.length === 2 && imgs.every((i) => i.used === true && i.vision === true && /603 Blue Light/.test(i.preview)) && imgs.find((i) => i.url === SKU_IMG)?.role === 'sku', JSON.stringify(imgs));
  check('extraction.vision: used, engine, 2 ảnh, 4 facts', r.json.extraction.vision?.used === true && r.json.extraction.vision.engine?.model === 'stub-vision' && r.json.extraction.vision.images === 2, JSON.stringify(r.json.extraction.vision));
  check('mô tả ECUS ≤ 200, không chữ Hán', desc.length <= 200 && !/[㐀-鿿]/.test(desc), desc);

  // Không có images → không gọi vision; variant cũ vẫn chạy khi không có skuSelected
  visionCalls = [];
  const r2 = await buildDeclarationSheet({ titleZh: GL.titleZh + '无图', specsZh: GL.specsZh, variant: [{ label: '颜色分类', value: '商务金【升级防蓝光镜片】' }], hsCode: '90049010' });
  const c2 = r2.json.fields.find((x) => x.key === 'color') || r2.json.extras.find((x) => x.key === 'color');
  check('không images → không gọi vision, reason NO_IMAGES', visionCalls.length === 0 && r2.json.extraction.vision?.used === false && r2.json.extraction.vision.reason === 'NO_IMAGES', JSON.stringify(r2.json.extraction.vision));
  check('variant cũ (không skuSelected) vẫn thắng danh sách màu', c2?.valueVi === 'vàng thương gia' && c2.method === 'SKU_SELECTED', JSON.stringify(c2));

  // Ảnh host lạ → readImageFacts thật từ chối trước khi tải (không gọi mạng, không gọi AI)
  imageFacts.readImageFacts = savedVision;
  const r3 = await buildDeclarationSheet({ titleZh: GL.titleZh + '外链', specsZh: GL.specsZh, images: [{ url: 'https://evil.example.com/a.jpg', role: 'sku' }], hsCode: '90049010' });
  check('ảnh host lạ bị từ chối: vision không có ảnh, không lỗi, phiếu vẫn 200', r3.status === 200 && r3.json.extraction.vision?.images === 0 && !r3.json.extraction.vision.llmError && r3.json.images.length === 0, JSON.stringify(r3.json.extraction.vision));

  // Vision lỗi → bỏ qua, ghi llmError, phiếu vẫn lập
  imageFacts.readImageFacts = async (images) => ({ images: images.map((i) => ({ ...i, fetched: false })), seenText: [], facts: [], engine: null, llmError: { code: 'IMAGE_FETCH_FAILED', message: 'stub' } });
  const r4 = await buildDeclarationSheet({ ...GL, titleZh: GL.titleZh + '错', images: [{ url: MAIN_IMG, role: 'main' }] });
  check('vision lỗi: phiếu vẫn 200, extraction.vision.llmError, ảnh used:false có lý do', r4.status === 200 && r4.json.extraction.vision?.llmError?.code === 'IMAGE_FETCH_FAILED' && r4.json.images[0]?.used === false && /Không tải được/.test(r4.json.images[0].reasonVi), JSON.stringify([r4.json.extraction.vision, r4.json.images]));
  imageFacts.readImageFacts = async () => { throw new Error('boom'); };
  const r4b = await buildDeclarationSheet({ ...GL, titleZh: GL.titleZh + '炸' });
  check('vision ném lỗi: vẫn 200, llmError VISION_FAILED', r4b.status === 200 && r4b.json.extraction.vision?.llmError?.code === 'VISION_FAILED');

  // Tắt vision bằng env
  process.env.HS_SHEET_VISION = '0';
  visionCalls = [];
  imageFacts.readImageFacts = async (images, opts) => { visionCalls.push(1); return { images: [], seenText: [], facts: [], engine: null }; };
  const r5 = await buildDeclarationSheet({ ...GL, titleZh: GL.titleZh + '关' });
  check('HS_SHEET_VISION=0 → không gọi vision, reason DISABLED', visionCalls.length === 0 && r5.json.extraction.vision?.reason === 'DISABLED', JSON.stringify(r5.json.extraction.vision));
  delete process.env.HS_SHEET_VISION;

  // Kiện khi trang KHÔNG có kích thước sản phẩm → ô dimensions điền tạm từ kiện, đánh dấu packaging, không vào ECUS
  process.env.HS_SHEET_VISION = '0';
  const r6 = await buildDeclarationSheet({ titleZh: GL.titleZh + '无尺寸', specsZh: GL.specsZh.filter((x) => x.key !== '尺寸'), packaging: GL.packaging, hsCode: '90049010' });
  const d6 = r6.json.fields.find((x) => x.key === 'dimensions');
  check('không có KT sản phẩm → dimensions điền tạm từ kiện, packaging:true, note rõ', d6?.valueVi === '17×11×10 cm' && d6.packaging === true && /KIỆN/.test(d6.note || '') && d6.method === 'PACKAGING', JSON.stringify(d6));
  check('dimensions từ kiện không vào mô tả ECUS', !(r6.json.description?.customsDescription || '').includes('17×11×10'), r6.json.description?.customsDescription);
  delete process.env.HS_SHEET_VISION;

  // Phòng thủ đầu vào
  check('normalizePackaging: thiếu/sai số → null hoặc tính thể tích từ 3 cạnh', normalizePackaging({ lengthCm: 'x' }) === null && normalizePackaging(null) === null && normalizePackaging({ lengthCm: 10, widthCm: 5, heightCm: 2 })?.volumeCm3 === 100 && normalizePackaging({ weightG: 1500 })?.weightG === 1500);
  check('normalizeSkuSelected: bỏ mục hỏng, nhận label thay group', normalizeSkuSelected([{ label: '颜色', value: '红' }, {}, 'x']).length === 1 && normalizeSkuSelected('x').length === 0);
  check('normalizeImages: ≤3, bỏ URL hỏng, không images thì lấy ảnh SKU', normalizeImages([{ url: 'https://a/1.jpg' }, { url: 'https://a/2.jpg', role: 'sku' }, { url: 'https://a/3.jpg' }, { url: 'https://a/4.jpg' }, { url: 'nope' }]).length === 3 && normalizeImages([], [{ group: 'x', value: 'y', imageUrl: 'https://a/s.jpg' }])[0]?.role === 'sku');
  check('PACKAGE_KEYS có trong từ điển zh (包装尺寸 → packageDimensions, không còn là dimensions)', [...PACKAGE_KEYS].every((k) => require('../lib/zh-specs').dictionary().keys[k]) && require('../lib/zh-specs').keysForLabel('包装尺寸').join() === 'packageDimensions');

  llmTier.callLLMJson = savedLlm;
  imageFacts.readImageFacts = savedVision;
}


// ── 10/10/2026 (CEO): thư viện đặc điểm theo nhóm — phiếu lọc rác trước AI, lượt vá chỉ gửi nguồn liên quan ô thiếu ──
{
  const saved = llmTier.callLLMJson;
  const users = [];
  llmTier.callLLMJson = async (system, user, o) => {
    if (!system.includes('THÔNG SỐ SẢN PHẨM')) return saved(system, user, o);
    users.push({ system, u: JSON.parse(user) });
    // Lượt 1 bỏ sót chất liệu → lượt vá hỏi riêng material.
    return { json: { attributes: users.length === 1 ? GOOD_REPLY.attributes.filter((a) => a.key !== 'material') : [GOOD_REPLY.attributes.find((a) => a.key === 'material')] }, provider: 'stub', model: 'stub' };
  };
  const NOISY = { ...SOCKET, titleZh: SOCKET.titleZh + '词库', specsZh: [...SOCKET.specsZh, { key: '是否跨境货源', value: '否' }, { key: '发货地', value: '广东' }, { key: '风格', value: '现代简约' }, { key: '上市时间', value: '2024' }], hsCode: '85366932' };
  const r = await buildDeclarationSheet(NOISY);
  llmTier.callLLMJson = saved;
  const f = (k) => r.json.fields.find((x) => x.key === k);
  check('phiếu 8536: rác (是否跨境货源/发货地/风格/上市时间) không vào gói AI', !/跨境货源|发货地|风格|上市时间/.test(JSON.stringify(users[0]?.u.sources || [])), JSON.stringify(users[0]?.u.sources));
  check('phiếu 8536: ảnh thương hiệu/chính sách lọc dòng, bảng thông số vẫn gửi (10A/13A/250V)', JSON.stringify(users[0]?.u.sources).includes('10A/13A/250V'));
  check('phiếu 8536: SYSTEM lượt 1 có dòng "Ô cần cho nhóm này" (voltage, currentRating, poleCount)', /Ô cần cho nhóm này: .*voltage: Điện áp.*poleCount/.test(users[0]?.system || ''), users[0]?.system.split('\n').pop());
  check('phiếu 8536: ô bắt buộc vẫn đủ (missing rỗng), chất liệu từ lượt vá', r.json.missing.length === 0 && f('material')?.valueVi === 'đồng phốt-pho thiếc', JSON.stringify(r.json.missing));
  const rep = users[1]?.u;
  check('lượt vá: chỉ hỏi material; gói nhỏ hơn lượt 1; nguồn chỉ còn nhãn chất liệu + số đơn vị + SKU + tên', rep && Object.keys(rep.allowedKeys).join() === 'material' && JSON.stringify(rep).length < JSON.stringify(users[0].u).length && /材质：锡磷青铜/.test(JSON.stringify(rep.sources)) && !/插孔类型/.test(JSON.stringify(rep.sources)) && /一开多功能八孔/.test(JSON.stringify(rep.sources)), JSON.stringify(rep?.sources));
  check('extraction.filter: stats + dropped (lý do) + miscLabels; repairFilter có stats', r.json.extraction.filter?.source === 'heading' && r.json.extraction.filter.stats.specsIn === 10 && r.json.extraction.filter.dropped.some((d) => d.reason === 'NOISE') && Array.isArray(r.json.extraction.filter.miscLabels) && r.json.extraction.repairFilter?.stats, JSON.stringify(r.json.extraction));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
