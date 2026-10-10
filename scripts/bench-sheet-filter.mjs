#!/usr/bin/env node
// Đo TRƯỚC/SAU lọc nguồn theo thư viện nhóm (lib/source-filter.js) trên phiếu hồ sơ — CEO 10/10/2026.
// AI giả lập (không mạng): dịch mọi mục translate, trả công dụng từ tên hàng → đo ký tự gói gửi AI
// lượt 1 / lượt vá, số dòng bỏ theo lý do, và ô BẮT BUỘC còn đủ (mục tiêu: giảm ≥ 35 % ký tự, 0 ô mất).
// Chạy: node scripts/bench-sheet-filter.mjs [đường dẫn capture-payloads.json]
import './test-isolate-data.mjs';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
process.env.HS_ACCESS_LOG = '0';
process.env.HS_DEMAND_OFF = '1';
process.env.HS_SHEET_VISION = '0';
console.error = () => {};

const llmTier = require('../lib/llm-tier');
const { buildDeclarationSheet } = require('../lib/declaration-sheet');

// Ca thật 1688 + Tmall (kính lão 9004) chụp từ addon — mặc định lấy ở scratchpad phiên 10/10/2026, có thể truyền đường dẫn khác.
const CAPTURE = process.argv[2] || '/private/tmp/claude-501/-Users-ozvietnamdesktop-Documents-Claude-Projects-ozsource--claude-worktrees-addon-customs-data-check-0616fa/77e0a642-0024-4016-b644-5546fa28f3bb/scratchpad/capture-payloads.json';
let captured = {};
try { captured = JSON.parse(fs.readFileSync(CAPTURE, 'utf8')); } catch { console.log(`(không đọc được ${CAPTURE} — chỉ chạy ca ổ cắm + ca kính nhúng sẵn)`); }

// Ca ổ cắm 8536 (từ scripts/test-declaration-sheet.mjs — Taobao Marc Lichte, 3 ảnh OCR).
const SOCKET = {
  titleZh: '86型墙壁暗装电源插座带开关大孔多功能通用错位十孔八孔插座面板',
  specsZh: [
    { key: '插孔类型', value: '二三三插' }, { key: '材质', value: '锡磷青铜' }, { key: '额定电流', value: '10A' },
    { key: '品牌', value: 'Marc Lichte/马克莱驰特' }, { key: '型号', value: '86型' },
    { key: '是否跨境货源', value: '否' }, { key: '发货地', value: '广东深圳' }, { key: '加工定制', value: '是' }, { key: '上市时间', value: '2024' }, { key: '风格', value: '现代简约' },
  ],
  variant: [{ label: 'Phân loại', value: '一开多功能八孔【特价】' }],
  imageTexts: [
    { url: 'https://img/table.jpg', text: '产品参数\n产品材质 电流电压\n锡磷青铜 10A/13A/250V\n产品规格 面板材质\n86mm*86mm PC阻燃' },
    { url: 'https://img/shop.jpg', text: '生产:各类外贸智能开关\n定制尺寸:86/118*72/86*146mm\n可OEM/ODM\n关于我们\n深圳源头工厂 实力厂家 欢迎咨询合作\n全场包邮 48小时内发货 7天无理由退换' },
    { url: 'https://img/story.jpg', text: 'Marclichte马克莱驰特深圳高端品牌创立于1985年\n荣誉证书展示\n合作伙伴 案例 20年经验 研发团队' },
  ],
  hsCode: '85366932',
};
// Chữ OCR MẪU (tổng hợp từ các ảnh chính sách Taobao/Tmall thật 04/10/2026) — gắn vào ca 1688 để đo OCR, ghi rõ là mẫu.
const OCR_SAMPLE = [
  { url: 'https://img/policy.jpg', text: '温馨提示\n价格说明：划线价为被比较价格\n本店所有商品均支持7天无理由退换货\n签收时请当面验货，拒签请联系客服\n发票：如需发票请联系客服\n色差属正常现象 好评返现 收藏关注店铺' },
  { url: 'https://img/about.jpg', text: '关于我们\n台州源头工厂 实力厂家\n20年经验 研发团队\n荣誉证书展示 合作伙伴\n热线电话 咨询下单 欢迎来厂参观' },
  { url: 'https://img/spec.jpg', text: '产品参数\n镜片材质：PC\n镜框材质：金属\n镜片 宽度 50mm 镜腿长度 135mm\n重量 25.8g\n适用于中老年阅读' },
];

const skuLines = (b) => (b.skuSelected || []).map((v) => ({ group: v.group, value: v.value, imageUrl: v.imageUrl }));
const CASES = [];
if (captured.k1688) CASES.push({ name: '1688 kính lão (9004)', body: { titleZh: captured.k1688.title, specsZh: captured.k1688.specsZh, skuSelected: skuLines(captured.k1688), packaging: captured.k1688.packaging?.selected, hsCode: '90049010' } });
if (captured.tmall) CASES.push({ name: 'Tmall kính lão (9004)', body: { titleZh: captured.tmall.title, specsZh: captured.tmall.specsZh, skuSelected: skuLines(captured.tmall), hsCode: '90049010' } });
CASES.push({ name: 'Taobao ổ cắm 86 (8536) + 3 ảnh OCR', body: SOCKET });
if (captured.k1688) CASES.push({ name: '1688 kính lão + 3 ảnh OCR MẪU', body: { ...CASES[0].body, imageTexts: OCR_SAMPLE } });

// AI giả lập "lý tưởng": dịch mọi mục translate (bằng chứng = chữ gốc), trả công dụng từ tên hàng, xác nhận verify.
let calls = [];
llmTier.callLLMJson = async (system, user) => {
  if (!system.includes('THÔNG SỐ SẢN PHẨM')) {
    return { json: { declaration: { tenHang: 'Hàng mẫu đo', thanhPhanCauTao: null, congDung: null, nhanHieu: null, model: null, thongSoKyThuat: [], xuatXu: 'Trung Quốc', tinhTrang: 'Mới 100%' } }, provider: 'stub', model: 'stub' };
  }
  const u = JSON.parse(user);
  calls.push({ systemChars: system.length, userChars: user.length, sourceChars: u.sources.reduce((n, s) => n + s.text.length, 0), sources: u.sources.map((s) => `${s.id}:${s.text.length}`) });
  const srcOf = (zh) => u.sources.find((s) => s.text.includes(zh))?.id || u.sources[0]?.id;
  const attributes = [];
  (u.translate || []).forEach((t, i) => attributes.push({ key: t.key, valueVi: `dich ${i + 1}`, part: t.part || null, sourceId: srcOf(t.valueZh), evidenceText: t.valueZh }));
  (u.verify || []).forEach((t) => attributes.push({ key: t.key, valueVi: t.candidate, part: t.part || null, sourceId: srcOf(t.evidenceText), evidenceText: t.evidenceText }));
  const title = u.sources.find((s) => s.id === 'title');
  if ((u.needKeys || []).includes('application') && title) attributes.push({ key: 'application', valueVi: 'cong dung tu ten hang', sourceId: 'title', evidenceText: title.text.slice(0, 12) });
  return { json: { attributes }, provider: 'stub', model: 'stub' };
};

async function run(body, filterOn, tag) {
  process.env.HS_SOURCE_FILTER = filterOn ? '1' : '0';
  calls = [];
  const r = await buildDeclarationSheet({ ...body, titleZh: `${body.titleZh} ${tag}` });
  const j = r.json;
  const required = j.fields.filter((f) => f.required);
  const have = required.filter((f) => f.status === 'HAVE').map((f) => f.key);
  const missing = required.filter((f) => f.status !== 'HAVE').map((f) => f.key);
  const byReason = {};
  for (const d of j.extraction?.filter?.dropped || []) byReason[d.reason.split(':')[0]] = (byReason[d.reason.split(':')[0]] || 0) + 1;
  return { pass1: calls[0]?.userChars || 0, repair: calls[1]?.userChars || 0, src1: calls[0]?.sourceChars || 0, srcRepair: calls[1]?.sourceChars || 0, calls: calls.length, have, missing, stats: j.extraction?.filter?.stats || null, byReason, repairKeys: j.extraction?.repairKeys || [] };
}

const pct = (a, b) => (a ? `${Math.round((1 - b / a) * 100)} %` : '—');
const rows = [];
let bad = 0;
for (const c of CASES) {
  const before = await run(c.body, false, 'TRUOC');
  const after = await run(c.body, true, 'SAU');
  const lost = before.have.filter((k) => !after.have.includes(k));
  if (lost.length) bad += 1;
  const total1 = before.pass1 + before.repair; const total2 = after.pass1 + after.repair;
  const src1 = before.src1 + before.srcRepair; const src2 = after.src1 + after.srcRepair;
  rows.push(`| ${c.name} | ${before.pass1} → ${after.pass1} (${pct(before.pass1, after.pass1)}) | ${before.repair} → ${after.repair} (${pct(before.repair, after.repair)}) | ${total1} → ${total2} (**${pct(total1, total2)}**) | ${src1} → ${src2} (**${pct(src1, src2)}**) | ${after.stats ? `${after.stats.specsIn}→${after.stats.specsKept}` : '—'} | ${after.stats ? `${after.stats.ocrCharsIn}→${after.stats.ocrCharsKept}` : '—'} | ${Object.entries(after.byReason).map(([k, v]) => `${k} ${v}`).join(', ') || '—'} | ${before.have.length}/${before.have.length + before.missing.length} → ${after.have.length}/${after.have.length + after.missing.length}${lost.length ? ` **MẤT ${lost.join(',')}**` : ''} |`);
  console.log(`\n## ${c.name}`);
  console.log(`  trước: lượt 1 ${before.pass1} ký tự, vá ${before.repair} (${before.repairKeys.join(',') || '—'}); ô bắt buộc HAVE ${before.have.join(',')}; thiếu ${before.missing.join(',') || '—'}`);
  console.log(`  sau:   lượt 1 ${after.pass1} ký tự, vá ${after.repair} (${after.repairKeys.join(',') || '—'}); ô bắt buộc HAVE ${after.have.join(',')}; thiếu ${after.missing.join(',') || '—'}`);
  console.log(`  nguồn chữ (sources) gửi AI: lượt 1 ${before.src1} → ${after.src1}, vá ${before.srcRepair} → ${after.srcRepair}`);
  console.log(`  lọc:   ${JSON.stringify(after.stats)} bỏ theo lý do ${JSON.stringify(after.byReason)}`);
}
console.log('\n| Ca | Ký tự gói AI lượt 1 | Ký tự gói AI lượt vá | Tổng gói AI | Ký tự NGUỒN CHỮ (2 lượt) | Dòng specs vào→giữ | OCR ký tự vào→giữ | Bỏ theo lý do | Ô bắt buộc HAVE |');
console.log('|---|---|---|---|---|---|---|---|---|');
for (const r of rows) console.log(r);
console.log(bad ? `\nFAIL: ${bad} ca mất ô bắt buộc` : '\nPASS: 0 ô bắt buộc mất');
process.exit(bad ? 1 : 0);
