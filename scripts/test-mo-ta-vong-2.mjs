import './test-isolate-data.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { boTruongThieuVaoMoTa, gopVong2, rutGiaTriTheoNhan } from '../lib/describe-missing-inline.mjs';

const require = createRequire(import.meta.url);

test('boTruongThieuVaoMoTa: trường bắt buộc thiếu → ghi "(thiếu: CPU, RAM)" trong mô tả', () => {
  const r = boTruongThieuVaoMoTa({
    text: 'Máy tính xách tay kể cả notebook; model Latitude 5420; xuất xứ Trung Quốc; Mới 100%',
    missingRequired: [{ key: 'cpuModel', labelVi: 'CPU' }, { key: 'ramCapacity', labelVi: 'RAM' }],
    gioiHan: 200,
  });
  assert.ok(r.text.includes('(thiếu: CPU, RAM)'), r.text);
  assert.ok(r.text.length <= 200);
  assert.ok(r.text.endsWith('Mới 100%'), 'đuôi không đổi');
});

test('boTruongThieuVaoMoTa: không thiếu → text nguyên vẹn', () => {
  const t = 'Máy bơm ly tâm; công suất 0.75 kW; xuất xứ Ý; Mới 100%';
  const r = boTruongThieuVaoMoTa({ text: t, missingRequired: [], gioiHan: 200 });
  assert.equal(r.text, t);
});

test('boTruongThieuVaoMoTa: vượt 200 → nén nhãn thiếu (CPU,RAM không cắt giữa)', () => {
  const dai = 'Đồ nội thất khác và các bộ phận của chúng bằng gỗ thông ghép sẵn; không gồm tủ hút hơi độc; xuất xứ Việt Nam; Mới 100%';
  const r = boTruongThieuVaoMoTa({ text: dai, missingRequired: [{ key: 'a', labelVi: 'kiểu dáng' }, { key: 'b', labelVi: 'kích thước' }, { key: 'c', labelVi: 'màu' }], gioiHan: 200 });
  assert.ok(r.text.length <= 200);
  assert.ok(r.text.includes('thiếu:'));
});

test('gopVong2: fact tự tìm được (web/attribute) chèn vào chapterSpecific, còn thiếu mới mở ngoặc', () => {
  const r = gopVong2({
    missingRequired: [{ key: 'cpuModel', labelVi: 'CPU' }, { key: 'ramCapacity', labelVi: 'RAM' }],
    factTimDuoc: { cpuModel: 'Core i5-1135G7' },
  });
  assert.deepEqual(r.daBoSung, ['cpuModel']);
  assert.deepEqual(r.conThieu.map((m) => m.key), ['ramCapacity']);
});

test('gopVong2: không tìm được gì → mọi trường đều còn thiếu', () => {
  const r = gopVong2({ missingRequired: [{ key: 'cpuModel', labelVi: 'CPU' }], factTimDuoc: {} });
  assert.deepEqual(r.conThieu.map((m) => m.key), ['cpuModel']);
});

// ── L0b (#553): rút giá trị trường thiếu từ câu trả lời web ──
test('rutGiaTriTheoNhan: "Công suất: 22 kW, điện áp 380V" → "22 kW"', () => {
  assert.equal(rutGiaTriTheoNhan('Công suất: 22 kW, điện áp 380V', 'Công suất'), '22 kW');
});

test('rutGiaTriTheoNhan: nhãn có ngoặc "(V)" → không ném lỗi, "220V"', () => {
  assert.equal(rutGiaTriTheoNhan('Điện áp (V): 220V', 'Điện áp (V)'), '220V');
  assert.doesNotThrow(() => rutGiaTriTheoNhan('Cổng C++ [mới]: 2 cổng', 'Cổng C++ [mới]'));
  assert.equal(rutGiaTriTheoNhan('Cổng C++ [mới]: 2 cổng', 'Cổng C++ [mới]'), '2 cổng');
});

test('rutGiaTriTheoNhan: không có nhãn → null', () => {
  assert.equal(rutGiaTriTheoNhan('không có thông tin', 'Công suất'), null);
  assert.equal(rutGiaTriTheoNhan('', 'Công suất'), null);
});

test('rutGiaTriTheoNhan: "power 7.5 kw" → "7.5 kw" (trước đây \\w thành w nên trả null)', () => {
  assert.equal(rutGiaTriTheoNhan('power 7.5 kw', 'power'), '7.5 kw');
});

test('describe vòng 2: giá trị web rút được thì trường đó không còn trong "(thiếu: …)"', async () => {
  for (const k of ['GEMINI_API_KEY', 'GEMINI_FREE_KEYS', 'MINIMAX_API_KEY', 'OPENROUTER_API_KEY', 'HERMES_API_KEY', 'DEEPSEEK_API_KEY']) delete process.env[k];
  const llmTier = require('../lib/llm-tier');
  const wf = require('../lib/web-facts.js');
  const savedLlm = llmTier.callLLMJson;
  const savedWf = wf.webFacts;
  llmTier.callLLMJson = async () => ({ json: { declaration: { tenHang: 'Máy bơm nước ly tâm', nhanHieu: 'Pentax', model: 'CM50' } }, provider: 'stub', model: 'stub' });
  wf.webFacts = async () => ({ cauTraLoi: 'power: 7.5 kW; voltage: 380V; flowRate: 30 m3/h', nguon: [] });
  try {
    const { describeProduct } = require('../lib/describe-core.js');
    const out = await describeProduct({ hsCode: '84137011', productName: 'Máy bơm nước ly tâm' });
    assert.equal(out.status, 200);
    const mo = out.json.customsDescription;
    assert.ok(out.json.compliance.missingRequired.includes('chapterSpecific.power'), 'ca thử phải thiếu power');
    assert.ok(!/thiếu:[^)]*power/.test(mo), `power đã tìm được trên web mà vẫn ghi thiếu: ${mo}`);
    assert.ok(!/thiếu:[^)]*voltage/.test(mo), `voltage đã tìm được trên web mà vẫn ghi thiếu: ${mo}`);
  } finally {
    llmTier.callLLMJson = savedLlm;
    wf.webFacts = savedWf;
  }
});
