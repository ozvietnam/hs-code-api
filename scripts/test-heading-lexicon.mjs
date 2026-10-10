// Test thư viện đặc điểm theo nhóm (lib/heading-lexicon.js) + lọc nguồn trước AI (lib/source-filter.js) —
// CEO 10/10/2026: "lọc bớt rác chủ động, giảm áp lực và nhiễu cho LLM". LLM giả lập — không mạng.
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
process.env.HS_ACCESS_LOG = '0';
console.error = () => {};

const { lexiconFor, lexiconForKeys, labelKept, promptLine } = require('../lib/heading-lexicon');
const { filterSources, isNoiseLabel, MISC_MAX } = require('../lib/source-filter');
const { extractSpecs } = require('../lib/extract-specs');

let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass += 1; console.log(`PASS ${name}`); } else { fail += 1; console.log(`FAIL ${name} ${extra}`); }
};

// 1. Thư viện 9004 (kính mắt): giữ nhãn tròng/gọng/độ/nhãn hiệu/货号; bỏ 脸型/风格/上市年份
const l9004 = lexiconFor('90049010');
check('9004: nguồn heading, có ô nhóm + ô chung + origin', l9004.source === 'heading' && ['eyewearType', 'lensMaterial', 'frameMaterial', 'modelNumber', 'lensPower', 'application', 'material', 'brand', 'dimensions', 'origin'].every((k) => l9004.keepKeys.has(k)), [...l9004.keepKeys].join());
check('9004: không có khoá điện / chức năng máy', !l9004.keepKeys.has('voltage') && !l9004.keepKeys.has('machineFunction') && !l9004.keepKeys.has('applianceFunction'));
check('9004: giữ 镜片材质/镜框材质/度数/品牌/货号/产品类别', ['镜片材质', '镜框材质', '度数', '品牌', '货号', '产品类别', '镜架材质'].every((z) => labelKept(l9004, z)));
check('9004: nhãn ghép bộ phận 镜框颜色 (parts × màu) là nhãn keep', l9004.keepLabelsZh.has('镜框颜色') && labelKept(l9004, '镜框颜色'));
check('9004: 脸型/风格/上市年份/季节 không thuộc thư viện', !['脸型', '适合脸型', '风格', '上市年份/季节', '流行元素分类'].some((z) => labelKept(l9004, z)));
check('9004: nhãn rác toàn cục nhận diện được (≥40 nhãn)', ['脸型', '风格', '上市年份/季节', '是否跨境出口专供货源', '销售渠道类型', '省份'].every(isNoiseLabel) && Object.keys(require('../data/noise-labels-zh.json').labels).length >= 40);
check('9004: 镜片折射率 (bộ phận + phần lạ) KHÔNG keep (tránh khớp giả tròng)', !labelKept(l9004, '镜片折射率'));
check('9004: dòng prompt "Ô cần cho nhóm này" có key: labelVi', /^Ô cần cho nhóm này: .*lensMaterial: Chất liệu tròng kính/.test(promptLine(l9004)), promptLine(l9004));
check('cache: cùng nhóm trả cùng đối tượng', lexiconFor('90049010') === lexiconFor('9004'));

// 2. 8536 (thiết bị đóng cắt): giữ 额定电压/额定电流/插孔类型; chương 85 không có template nhóm → chapter
const l8536 = lexiconFor('85366932');
check('8536: giữ 额定电压 / 额定电流 / 插孔类型 (voltage, currentRating, poleCount)', ['额定电压', '额定电流', '插孔类型'].every((z) => labelKept(l8536, z)) && l8536.keepKeys.has('poleCount'));
check('8536: không giữ 度数 / 镜片折射率 (khoá kính)', !labelKept(l8536, '度数') && !labelKept(l8536, '镜片折射率'));
const lch = lexiconFor('85999999');
check('nhóm không có template → rơi về chương 85 (power, voltage)', lch.source === 'chapter' && lch.keepKeys.has('power') && lch.keepKeys.has('voltage'), lch.source);

// 3. Không mã → global: hợp từ điển, vẫn lọc noise, không có dòng prompt
const lg = lexiconFor(null);
check('global: mọi khoá từ điển, không dòng prompt', lg.source === 'global' && lg.keepKeys.size >= 80 && promptLine(lg) === '' && labelKept(lg, '功能') && labelKept(lg, '镜片材质'));
const fg = filterSources({ hsCode: null, specs: [{ key: '脸型', value: '圆脸' }, { key: '材质', value: '金属' }] });
check('global vẫn bỏ nhãn rác 脸型, giữ 材质', fg.specs.length === 1 && fg.specs[0].key === '材质' && fg.dropped[0]?.reason === 'NOISE', JSON.stringify(fg));

// 4. filterSources trên ca kính 1688 thật (CEO 10/10): 24 dòng → bỏ rác, giữ SKU, misc có 功能
const K1688 = [
  { key: '镜片材质', value: 'PC' }, { key: '镜片功能', value: '防蓝光' }, { key: '镜框材质', value: '金属' }, { key: '产品类别', value: '老花镜' },
  { key: '镜架材质', value: '金属' }, { key: '品牌', value: '柚莎' }, { key: '上市年份/季节', value: '2025年春季' }, { key: '货号', value: '603' },
  { key: '是否跨境出口专供货源', value: '否' }, { key: '镜框颜色', value: '金色,银色,金色变灰,银色变灰' }, { key: '度数', value: '防蓝光,+100度,+150度,+200度' },
  { key: '眼镜结构', value: '半框架' }, { key: '脸型', value: '长脸、圆脸、方脸、方圆脸、小脸、菱形脸' }, { key: '眼镜款式', value: '多边形' }, { key: '适合脸型', value: '圆脸' },
  { key: '风格', value: '商务,优雅,极简,休闲风,时尚OL,简约,轻奢风,高级感' }, { key: '包装', value: 'OPP独立包装袋' }, { key: '功能', value: '防蓝光' },
  { key: '产地', value: '台州' }, { key: '风格分类', value: '时尚通勤' }, { key: '适用人群', value: '通用' }, { key: '流行元素分类', value: '生活用品' },
  { key: '重量', value: '25.8g' }, { key: '奇怪标签', value: '147mm' },
];
const f1 = filterSources({ hsCode: '90049010', specs: K1688, skuLines: [{ key: '已选规格(镜框颜色)', value: '金色' }] });
const keptKeys = f1.specs.map((s) => s.key);
check('1688: rác bị bỏ với lý do NOISE', ['上市年份/季节', '是否跨境出口专供货源', '脸型', '适合脸型', '风格', '风格分类', '流行元素分类'].every((z) => f1.dropped.some((d) => d.label === z && d.reason === 'NOISE')) && !keptKeys.includes('脸型'), JSON.stringify(f1.dropped));
check('1688: SKU đang chọn luôn giữ', keptKeys.includes('已选规格(镜框颜色)'));
check('1688: số + đơn vị giữ dù nhãn lạ (奇怪标签: 147mm, 重量 25.8g)', keptKeys.includes('奇怪标签') && keptKeys.includes('重量'));
check('1688: 功能 / 镜片功能 / 眼镜结构 / 包装 → misc (AI thấy, từ điển không đọc)', ['功能', '镜片功能', '眼镜结构', '包装'].every((z) => f1.miscLabels.includes(z)) && f1.misc.includes('功能：防蓝光'), JSON.stringify(f1.miscLabels));
check('1688: stats specsIn 25 / specsKept ≤ 14, giảm ≥ 40 % dòng', f1.stats.specsIn === 25 && f1.stats.specsKept <= 14, JSON.stringify(f1.stats));
check('1688: ô bắt buộc nhóm còn nguồn (镜片材质, 镜框材质, 产品类别, 货号, 品牌)', ['镜片材质', '镜框材质', '产品类别', '货号', '品牌', '度数', '镜框颜色', '产地', '适用人群'].every((z) => keptKeys.includes(z)));

// 5. misc ≤ 300 ký tự
const many = Array.from({ length: 40 }, (_, i) => ({ key: `奇特属性${i}`, value: `值值值值值值值值值值${i}` }));
const fm = filterSources({ hsCode: '90049010', specs: many });
check('misc ≤ 300 ký tự, phần dư ghi MISC_FULL', fm.misc.length <= MISC_MAX && fm.dropped.some((d) => d.reason === 'MISC_FULL') && fm.dropped.length <= 30, `${fm.misc.length} ${fm.dropped.length}`);

// 6. OCR: bỏ dòng quảng cáo/chính sách, giữ bảng thông số + số đơn vị + bảng tách dòng; cắt 1.500/ảnh
const OCR = '关于我们\n我们是源头工厂，欢迎咨询\n全场包邮 48小时发货\n温馨提示：色差属正常现象\n产品参数\n材质\n304不锈钢\n额定电压：220V\n功率 1500W\n售后服务：全国联保\n适用于家庭厨房\n这是一段纯广告语\n';
const fo = filterSources({ hsCode: '85166000', imageTexts: [{ url: 'u1', text: OCR }, { url: 'u2', text: 'x'.repeat(10) + '\n' + '尺寸：'.concat('1'.repeat(2000)) }] });
const t1 = fo.ocr.find((o) => o.url === 'u1')?.text || '';
check('OCR: bỏ 关于我们/包邮/温馨提示/售后/quảng cáo', !/关于我们|包邮|温馨提示|全国联保|纯广告语|源头工厂/.test(t1), t1);
check('OCR: giữ 额定电压：220V, 功率 1500W, bảng tách dòng 材质 + 304不锈钢, dòng công dụng 适用于', ['额定电压：220V', '功率 1500W', '材质\n304不锈钢', '适用于家庭厨房'].every((x) => t1.includes(x)), t1);
check('OCR: lý do bỏ ghi OCR_NOISE:<từ>', fo.dropped.some((d) => d.src === 'ocr' && /^OCR_NOISE:/.test(d.reason)));
check('OCR: mỗi ảnh cắt 1.500 ký tự sau lọc', (fo.ocr.find((o) => o.url === 'u2')?.text.length || 0) <= 1500 && fo.dropped.some((d) => /^OCR_CUT/.test(d.reason)) && fo.stats.ocrCharsKept < fo.stats.ocrCharsIn);
// Dòng chứa từ rác nhưng có cặp nhãn keep：giá trị vẫn giữ
const fk = filterSources({ hsCode: '85166000', imageTexts: [{ url: 'u3', text: '售后服务：全国联保 额定功率：1500W' }] });
check('OCR: dòng có cặp nhãn keep (额定功率：1500W) giữ dù chứa 售后', fk.ocr[0]?.text.includes('额定功率：1500W'));

// 7. Mô tả: dòng đã lọc cấu trúc + bỏ nhãn rác / từ quảng cáo
const fd = filterSources({ hsCode: '90049010', descriptionText: '镜架材质：金属\n上市年份：2025\n客服：小王\n产品重量 25.8g' });
check('desc: giữ 镜架材质 + 25.8g, bỏ 上市年份 (NOISE) + 客服 (OCR_NOISE)', fd.desc === '镜架材质：金属\n产品重量 25.8g' && fd.dropped.length === 2, JSON.stringify([fd.desc, fd.dropped]));

// 8. Lượt vá (focusKeys): chỉ nhãn của khoá thiếu + số đơn vị + SKU; nhãn khác không vào misc
const lf = lexiconForKeys(['material', 'voltage']);
const ff = filterSources({ hsCode: '85366932', focusKeys: ['material'], specs: [{ key: '材质', value: '锡磷青铜' }, { key: '品牌', value: 'X' }, { key: '额定电流', value: '10A' }, { key: '已选规格(颜色)', value: '白' }] });
check('focus: thư viện thu hẹp đúng khoá', lf.source === 'focus' && lf.keepKeys.size === 2 && labelKept(lf, '材质') && !labelKept(lf, '品牌'));
check('focus: giữ 材质 + 10A (số đơn vị) + SKU; 品牌 bỏ NOT_FOCUS, misc rỗng', ff.specs.map((s) => s.key).join() === '材质,额定电流,已选规格(颜色)' && ff.dropped.some((d) => d.label === '品牌' && d.reason === 'NOT_FOCUS') && ff.misc === '', JSON.stringify(ff.specs.map((s) => s.key)));

// 9. extractSpecs với hsCode 9004: 功能 / 镜片功能 KHÔNG sinh machineFunction/applianceFunction; AI không nhận rác; prompt có dòng ô nhóm
let lastSystem = null; let lastUser = null;
const ex = await extractSpecs({ titleZh: '老花镜测试词库', hsCode: '90049010', specsZh: K1688, needKeys: ['eyewearType', 'lensMaterial', 'frameMaterial', 'modelNumber', 'application', 'brand'] }, { llm: async (s, u) => { lastSystem = s; lastUser = JSON.parse(u); return { json: { attributes: [] } }; } });
check('9004: không có machineFunction/applianceFunction trong attributes', !ex.attributes.some((a) => a.key === 'machineFunction' || a.key === 'applianceFunction'), JSON.stringify(ex.attributes.map((a) => a.key)));
check('9004: tròng PC / gọng 金属 (chờ dịch) / chất liệu kim loại / loại kính lão / model 603 vẫn rút được', ex.attributes.some((a) => a.key === 'lensMaterial' && a.valueVi === 'PC') && ex.attributes.some((a) => a.key === 'frameMaterial' && a.value === '金属') && ex.attributes.some((a) => a.key === 'material' && a.valueVi === 'kim loại') && ex.attributes.some((a) => a.key === 'eyewearType' && /kính lão/.test(a.valueVi)) && ex.attributes.some((a) => a.key === 'modelNumber' && a.valueVi === '603'), JSON.stringify(ex.attributes.map((a) => [a.key, a.valueVi])));
const specsSrc = (lastUser?.sources || []).find((s) => s.id === 'specs')?.text || '';
check('9004: gói gửi AI không còn 脸型/风格/上市年份; có nguồn misc với 功能', !/脸型|风格|上市年份/.test(specsSrc) && (lastUser.sources.find((s) => s.id === 'misc')?.text || '').includes('功能：防蓝光'), specsSrc);
check('9004: SYSTEM có dòng "Ô cần cho nhóm này", phần cũ giữ nguyên', /THÔNG SỐ SẢN PHẨM/.test(lastSystem) && /\nÔ cần cho nhóm này: .*eyewearType: Loại kính mắt/.test(lastSystem));
check('9004: extraction.filter có stats + dropped + miscLabels', ex.filter?.source === 'heading' && ex.filter.stats.specsIn === 24 && ex.filter.dropped.length >= 7 && ex.filter.miscLabels.includes('功能'), JSON.stringify(ex.filter));
const exOff = await extractSpecs({ titleZh: '老花镜测试词库关', specsZh: K1688, needKeys: ['eyewearType'] }, { llm: async (s, u) => { lastSystem = s; return { json: { attributes: [] } }; } });
check('không hsCode: không dòng ô nhóm, không filter.source heading', !/Ô cần cho nhóm này/.test(lastSystem) && exOff.filter?.source === 'global');

// 10. Tín hiệu nhu cầu LABEL_UNKNOWN từ misc (không định danh)
const { signalsFromSheet } = require('../lib/demand-signals');
const sig = signalsFromSheet({ sheet: { hsCode: '90049010', heading: { code: '9004' }, fields: [], missing: [], trademark: {}, extraction: { filter: ex.filter } }, mapped: { hsListings: [], policyLines: [] }, specsZh: [] });
check('LABEL_UNKNOWN: 功能 / 眼镜结构 / 包装 kèm nhóm 9004', ['功能', '眼镜结构', '包装'].every((z) => sig.some((s) => s.t === 'LABEL_UNKNOWN' && s.k === z && s.m.heading === '9004')), JSON.stringify(sig.filter((s) => s.t === 'LABEL_UNKNOWN')));

// 11. Tắt lọc bằng env → gói như cũ
process.env.HS_SOURCE_FILTER = '0';
const exRaw = await extractSpecs({ titleZh: '老花镜测试词库原', hsCode: '90049010', specsZh: K1688, needKeys: ['eyewearType'] }, { llm: async (s, u) => { lastUser = JSON.parse(u); return { json: { attributes: [] } }; } });
delete process.env.HS_SOURCE_FILTER;
check('HS_SOURCE_FILTER=0: gửi nguyên 24 dòng, không filter', /脸型/.test((lastUser.sources || []).find((s) => s.id === 'specs')?.text || '') && !exRaw.filter);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
