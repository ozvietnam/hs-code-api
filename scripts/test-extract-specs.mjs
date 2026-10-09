// Test kế hoạch OZSource H4: /api/extract-specs rút thông số từ CHỮ (thông số trang + chữ
// OCR do ozsource gửi). Từ điển trước, AI sau; AI đưa bằng chứng không có trong chữ nguồn
// thì bị bỏ. LLM giả lập — không mạng.
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
process.env.HS_API_TOKEN = 'extract-test-token';
process.env.HS_ACCESS_LOG = '0';

let llmReply = null;
let llmCalls = 0;
let lastUser = null;
const llmTier = require('../lib/llm-tier');
llmTier.callLLMJson = async (_system, user) => {
  llmCalls += 1;
  lastUser = JSON.parse(user);
  return { json: llmReply, provider: 'gemini-free', model: 'stub' };
};
console.error = () => {};

const handler = require('../api/classify.js');

let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass += 1; console.log(`PASS ${name}`); } else { fail += 1; console.log(`FAIL ${name} ${extra}`); }
};
async function extract(body, token = 'extract-test-token') {
  const res = { _s: 0, _j: null, headers: {}, setHeader(k, v) { this.headers[k] = v; }, getHeader(k) { return this.headers[k]; }, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } };
  await handler({ method: 'POST', url: '/api/classify', query: { mode: 'extract_specs' }, headers: token ? { authorization: `Bearer ${token}` } : {}, body }, res);
  return res;
}

// 1. Chỉ cần từ điển → không gọi AI
llmCalls = 0;
const r1 = await extract({
  specsZh: [{ key: '型号', value: 'MJ-123' }],
  imageTexts: [{ url: 'https://img/1.jpg', text: '产品参数\n额定功率：1500W\n额定电压：220V~50Hz' }],
  needKeys: ['power', 'voltage'],
});
const p1 = (r1._j?.attributes || []).find((a) => a.key === 'power');
check('từ điển đủ → không gọi AI', r1._s === 200 && llmCalls === 0 && r1._j.llmUsed === false, JSON.stringify(r1._j).slice(0, 200));
check('power 1500W, đơn vị W, bằng chứng ảnh', p1?.valueVi === '1500W' && p1.unit === 'W' && p1.method === 'DICTIONARY' && p1.evidence.imageUrl === 'https://img/1.jpg', JSON.stringify(p1));
check('không còn khóa thiếu', (r1._j?.missingKeys || []).length === 0);

// 2. Giá trị chữ Hán → AI dịch, giữ bằng chứng; AI bịa bằng chứng → bị bỏ
llmCalls = 0;
llmReply = { attributes: [
  { key: 'material', valueVi: 'thép không gỉ 304', sourceId: 'specs', evidenceText: '材质：304不锈钢' },
  { key: 'application', valueVi: 'dùng cho nhà bếp', sourceId: 'img1', evidenceText: '适用于厨房' }, // chữ này KHÔNG có trong nguồn
] };
const r2 = await extract({
  titleZh: '304不锈钢 电热水壶 1.8L',
  specsZh: [{ key: '材质', value: '304不锈钢' }],
  imageTexts: [{ url: 'https://img/2.jpg', text: '容量：1.8L\n功率：1500W' }],
  needKeys: ['material', 'application', 'volumeMl'],
});
const mat = (r2._j?.attributes || []).find((a) => a.key === 'material');
check('chữ Hán → gọi AI một lần', llmCalls === 1 && r2._j.llmUsed === true && r2._j.engine?.provider === 'gemini-free');
// 08/10/2026: chất liệu phổ biến (304不锈钢, 金属…) dịch bằng bảng cố định, không chờ AI.
check('material dịch sang tiếng Việt (bảng cố định), giữ giá trị gốc', mat?.valueVi === 'thép không gỉ 304' && mat.value === '304不锈钢' && mat.method === 'DICTIONARY', JSON.stringify(mat));
check('AI bịa bằng chứng → application bị bỏ, vẫn báo thiếu', !(r2._j.attributes || []).some((a) => a.key === 'application') && r2._j.missingKeys.includes('application'), JSON.stringify(r2._j.missingKeys));
check('容量 mơ hồ: có needKeys volumeMl → chỉ giữ volumeMl', (r2._j.attributes || []).some((a) => a.key === 'volumeMl') && !(r2._j.attributes || []).some((a) => a.key === 'storageCapacity'));
check('AI chỉ được hỏi khóa cần dịch/cần tìm', Object.keys(lastUser.allowedKeys).sort().join() === 'application', JSON.stringify(lastUser.allowedKeys));

// 3. Gọi lại cùng nội dung → lấy từ cache, không gọi AI
llmCalls = 0;
const r3 = await extract({
  titleZh: '304不锈钢 电热水壶 1.8L',
  specsZh: [{ key: '材质', value: '304不锈钢' }],
  imageTexts: [{ url: 'https://img/2.jpg', text: '容量：1.8L\n功率：1500W' }],
  needKeys: ['material', 'application', 'volumeMl'],
});
check('cùng nội dung → cached, không gọi AI', r3._j?.cached === true && llmCalls === 0);

// 4. AI lỗi → vẫn trả phần từ điển, giá trị chữ Hán valueVi=null, có llmError
llmTier.callLLMJson = async () => { throw Object.assign(new Error('rate limit'), { status: 429 }); };
const r4 = await extract({ specsZh: [{ key: '面料成分', value: '纯棉' }, { key: '尺寸', value: '30x20cm' }] });
check('AI lỗi → 200, có llmError, dimensions vẫn có', r4._s === 200 && r4._j.llmError && (r4._j.attributes || []).some((a) => a.key === 'dimensions' && a.valueVi === '30x20cm'), JSON.stringify(r4._j).slice(0, 200));
check('AI lỗi → fiberContent trả valueVi=null để hỏi người', (r4._j.attributes || []).some((a) => a.key === 'fiberContent' && a.valueVi === null));

// 5. Thiếu chữ → 400; thiếu token → 401
check('không có chữ → 400', (await extract({ needKeys: ['power'] }))._s === 400);
check('không token → 401', (await extract({ titleZh: 'x' }, null))._s === 401);

// 6. Chữ OCR thật (Tmall 575585063487, ảnh "产品信息" — mẫu từ ozsource PR #15): từ điển đủ, không gọi AI
llmTier.callLLMJson = async (_s, user) => { llmCalls += 1; lastUser = JSON.parse(user); return { json: llmReply, provider: 'minimax', model: 'stub' }; };
llmCalls = 0;
const real = await extract({
  imageTexts: [{ url: 'm30.jpg', text: '产品信息\n名称：联想M120Pro无线鼠标 接口：内置USB接口\n型号：M120Pro 按键数：3个\n品牌：联想 尺寸：118×61×38mm\n人体工学：是 重量：100g\n分辨率：1000DPI 工作方式：光电鼠标\n可选颜色：黑 适用机型：台式机/笔记本' }],
  needKeys: ['modelNumber', 'dimensions', 'netWeight', 'connectivity'],
});
const rk = Object.fromEntries((real._j?.attributes || []).map((a) => [a.key, a.valueVi]));
check('OCR thật: model, kích thước, trọng lượng lấy từ từ điển', rk.modelNumber === 'M120Pro' && rk.dimensions === '118×61×38mm' && rk.netWeight === '100g', JSON.stringify(rk));
const asked = Object.keys(lastUser?.allowedKeys || {}).sort().join();
// 08/10/2026: nhãn hiệu 联想 là tên riêng → giữ nguyên chữ gốc, không gửi AI dịch.
check('OCR thật: chỉ giá trị chữ Hán (接口, 颜色) gửi AI dịch; nhãn hiệu giữ gốc, số đo thì không', llmCalls === 1 && asked === 'color,connectivity' && rk.brand === '联想', asked + ' ' + rk.brand);

// 7. Bằng chứng khác dấu câu / xuống dòng với chữ OCR vẫn được nhận
llmCalls = 0;
llmReply = { attributes: [{ key: 'material', valueVi: 'thép không gỉ 304', sourceId: 'img1', evidenceText: '材质：304不锈钢' }] };
const r7 = await extract({ imageTexts: [{ url: 'u7', text: '产品参数\n材质\n304不锈钢\n容量 1.5L' }], needKeys: ['material'] });
check('OCR tách dòng không dấu hai chấm, AI chép có dấu → vẫn nhận', (r7._j?.attributes || []).some((a) => a.key === 'material' && a.valueVi === 'thép không gỉ 304'), JSON.stringify(r7._j));


// ── 09/10/2026 (ca Tmall kính lão): SKU đang chọn chữ Hán không dịch được → giữ chữ gốc; số đo không đơn vị / model=năm bị chặn ──
llmReply = { attributes: [] };
llmCalls = 0;
const r9 = await extract({
  titleZh: '老花镜男款2026新款高清防蓝光',
  specsZh: [{ key: '已选规格(颜色分类)', value: '商务金【升级防蓝光镜片】' }, { key: '尺寸', value: '5310' }, { key: '型号', value: '2026' }],
  needKeys: ['color', 'dimensions', 'modelNumber'],
});
const c9 = (r9._j?.attributes || []).find((a) => a.key === 'color');
check('SKU đang chọn không dịch được → giữ chữ gốc, selected, tin 0,9', c9 && c9.valueVi === '商务金【升级防蓝光镜片】' && c9.selected === true && c9.method === 'SKU_ORIGINAL' && c9.confidence >= 0.9, JSON.stringify(c9));
const d9 = (r9._j?.attributes || []).find((a) => a.key === 'dimensions' && a.valueVi);
check('kích thước "5310" (không đơn vị) bị chặn', !d9, JSON.stringify(d9));
const m9 = (r9._j?.attributes || []).find((a) => a.key === 'modelNumber' && a.valueVi);
check('model "2026" (năm) bị chặn', !m9, JSON.stringify(m9));
const r10 = await extract({ specsZh: [{ key: '尺寸', value: '147×50-39-17-135mm' }, { key: '重量', value: '35g' }], needKeys: ['dimensions', 'netWeight'] });
const d10 = (r10._j?.attributes || []).find((a) => a.key === 'dimensions' && a.valueVi);
const w10 = (r10._j?.attributes || []).find((a) => a.key === 'netWeight' && a.valueVi);
check('kích thước có đơn vị/dấu × vẫn nhận', !!d10, JSON.stringify(r10._j?.attributes?.slice(0, 3)));
check('khối lượng "35g" vẫn nhận', !!w10, JSON.stringify(w10));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
