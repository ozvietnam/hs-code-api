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

// 4. Không có mã HS → chỉ ô chung, chưa viết mô tả
extractReply = GOOD_REPLY;
const r4 = await buildDeclarationSheet({ ...SOCKET });
check('không mã: chỉ ô chung, không description', r4.status === 200 && !r4.json.hsCode && r4.json.fields.every((x) => x.origin === 'COMMON') && r4.json.description === undefined);

// 5. Chương 1–38 (thực phẩm): chất liệu/kích thước không bắt buộc
const food = sheetFieldDefs('19053120');
check('thực phẩm: chất liệu/kích thước không bắt buộc', food.defs.find((x) => x.key === 'material')?.required === false && food.defs.find((x) => x.key === 'dimensions')?.required === false);

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

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
