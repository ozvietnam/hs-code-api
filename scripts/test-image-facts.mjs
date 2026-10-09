// Test lib/image-facts.js — đọc ảnh SKU/ảnh chính bằng Gemini vision cho phiếu hồ sơ (09/10/2026).
// Không mạng, không khóa: fetch + Gemini được tiêm qua opts (fetchImpl / generate).
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
console.error = () => {};
const { readImageFacts, pickImages, hostAllowed, normalizeReply, MAX_BYTES } = require('../lib/image-facts');

let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass += 1; console.log(`PASS ${name}`); } else { fail += 1; console.log(`FAIL ${name} ${extra}`); }
};

const SKU = 'https://cbu01.alicdn.com/img/ibank/sku.jpg';
const MAIN = 'https://cbu01.alicdn.com/img/ibank/main.jpg';
const MAIN2 = 'https://ae01.alicdn.com/kf/main2.png';
const fakeRes = (bytes, type = 'image/jpeg', ok = true) => ({
  ok, headers: { get: (k) => (k === 'content-type' ? type : k === 'content-length' ? String(bytes.length) : null) },
  arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
});
const okFetch = async (url) => fakeRes(Buffer.from(`IMG:${url}`), /\.png/.test(url) ? 'image/png' : 'image/jpeg');

// 1. Lọc host + thứ tự sku trước main + tối đa 2 ảnh + bỏ trùng
check('hostAllowed: alicdn/aliexpress-media/taobao được, host lạ và ftp bị từ chối',
  hostAllowed('https://cbu01.alicdn.com/a.jpg') && hostAllowed('https://ae-pic-a1.aliexpress-media.com/kf/x.jpg') && hostAllowed('https://img.alicdn.com/bao/uploaded/x.jpg') && hostAllowed('https://gw.alicdn.com/x.jpg?x=1')
  && !hostAllowed('https://evil.example.com/alicdn.com/x.jpg') && !hostAllowed('https://alicdn.com.evil.io/x.jpg') && !hostAllowed('ftp://cbu01.alicdn.com/x.jpg') && !hostAllowed('nope'));
const picked = pickImages([{ url: MAIN, role: 'main' }, { url: 'https://evil.example.com/x.jpg', role: 'sku' }, { url: SKU, role: 'sku' }, { url: MAIN2, role: 'main' }, { url: SKU, role: 'sku' }, null, { role: 'sku' }]);
check('pickImages: host lạ bỏ, sku xếp trước main, bỏ trùng, giới hạn 2', picked.length === 2 && picked[0].url === SKU && picked[0].role === 'sku' && picked[1].url === MAIN, JSON.stringify(picked));

// 2. Không ảnh hợp lệ → không tải, không gọi AI, không lỗi
{
  let fetched = 0; let generated = 0;
  const r = await readImageFacts([{ url: 'https://evil.example.com/x.jpg', role: 'sku' }], { fetchImpl: async () => { fetched += 1; }, generate: async () => { generated += 1; return { json: {} }; } });
  check('host lạ: facts [], không fetch, không gọi AI, không llmError', r.facts.length === 0 && r.images.length === 0 && fetched === 0 && generated === 0 && !r.llmError, JSON.stringify(r));
}

// 3. Lỗi tải (mạng / 404 / quá cỡ) → facts [] + llmError IMAGE_FETCH_FAILED, không gọi AI
{
  let generated = 0;
  const r = await readImageFacts([{ url: SKU, role: 'sku' }, { url: MAIN, role: 'main' }], {
    fetchImpl: async (url) => (url === SKU ? Promise.reject(new Error('ECONNRESET')) : fakeRes(Buffer.alloc(10), 'image/jpeg', false)),
    generate: async () => { generated += 1; return { json: {} }; },
  });
  check('lỗi tải cả 2 ảnh → facts [], llmError IMAGE_FETCH_FAILED, không gọi AI', r.facts.length === 0 && r.llmError?.code === 'IMAGE_FETCH_FAILED' && generated === 0 && r.images.every((i) => i.fetched === false), JSON.stringify(r));
  const big = await readImageFacts([{ url: SKU, role: 'sku' }], { fetchImpl: async () => fakeRes(Buffer.alloc(MAX_BYTES + 1)), generate: async () => { generated += 1; return { json: {} }; } });
  check('ảnh > 3 MB bị bỏ, không gọi AI', big.llmError?.code === 'IMAGE_FETCH_FAILED' && generated === 0, JSON.stringify(big.llmError));
}

// 4. Gửi MỘT lượt AI với ≤ 2 ảnh base64 + allowedKeys; parse JSON lỏng về đúng khung
{
  const calls = [];
  const r = await readImageFacts([{ url: MAIN, role: 'main' }, { url: SKU, role: 'sku' }, { url: MAIN2, role: 'main' }], {
    hsCode: '90049010', titleZh: '老花镜', headingKeys: { frameMaterial: 'Chất liệu gọng kính', modelNumber: 'Model', color: 'Màu sắc' },
    fetchImpl: okFetch,
    generate: async (args) => {
      calls.push(args);
      return {
        model: 'models/stub-vision',
        json: {
          seenText: ['Model 603', '  防蓝光  ', 42, null, ''],
          facts: [
            { key: 'frameMaterial', valueVi: 'kim loại', evidence: 'thấy gọng kim loại', confidence: 0.95 },
            { key: 'frameMaterial', valueVi: 'nhựa', evidence: 'lặp key', confidence: 0.4 },
            { key: 'modelNumber', valueVi: '603', valueZh: '型号603', evidence: "nhãn in 'Model 603'", confidence: 'cao' },
            { key: 'voltage', valueVi: '220V', evidence: 'không trong allowedKeys' },
            { key: 'color', valueVi: '金色', evidence: 'chữ Hán trong valueVi' },
            { key: 'color', valueVi: 'vàng', evidence: '' },
            'rác', null,
          ],
        },
      };
    },
  });
  check('một lượt AI, 2 ảnh base64 (sku trước), mime theo ảnh', calls.length === 1 && calls[0].images.length === 2 && calls[0].images[0].mimeType === 'image/jpeg' && Buffer.from(calls[0].images[0].data, 'base64').toString() === `IMG:${SKU}` && calls[0].images[1].mimeType === 'image/jpeg', JSON.stringify(calls[0]?.images?.map((i) => i.mimeType)));
  const u = JSON.parse(calls[0].userPrompt);
  check('prompt mang allowedKeys + hsCode + titleZh + role từng ảnh', u.allowedKeys.frameMaterial === 'Chất liệu gọng kính' && u.hsCode === '90049010' && u.titleZh === '老花镜' && u.images[0].role === 'sku' && /seenText/.test(calls[0].systemPrompt), calls[0].userPrompt);
  check('seenText lọc: chỉ chuỗi có chữ, gọn khoảng trắng', JSON.stringify(r.seenText) === JSON.stringify(['Model 603', '防蓝光']), JSON.stringify(r.seenText));
  check('facts: key lạ / chữ Hán / không bằng chứng / lặp key bị bỏ; confidence kẹp ≤ 0.8, confidence hỏng → 0.5',
    r.facts.length === 2 && r.facts[0].key === 'frameMaterial' && r.facts[0].valueVi === 'kim loại' && r.facts[0].confidence === 0.8 && r.facts[1].key === 'modelNumber' && r.facts[1].confidence === 0.5 && r.facts[1].valueZh === '型号603' && r.facts.every((f) => f.imageUrl === SKU), JSON.stringify(r.facts));
  check('engine ghi gemini + model; images đánh dấu fetched', r.engine?.provider === 'gemini' && r.engine.model === 'models/stub-vision' && r.images.every((i) => i.fetched), JSON.stringify([r.engine, r.images]));
}

// 5. AI lỗi → facts [], llmError, không ném
{
  const r = await readImageFacts([{ url: SKU, role: 'sku' }], { fetchImpl: okFetch, generate: async () => { throw Object.assign(new Error('Gemini API error 429'), { code: 'GEMINI_API_ERROR' }); } });
  check('AI lỗi: facts [], llmError GEMINI_API_ERROR, ảnh vẫn fetched', r.facts.length === 0 && r.llmError?.code === 'GEMINI_API_ERROR' && r.images[0].fetched === true, JSON.stringify(r));
  const r2 = await readImageFacts([{ url: SKU, role: 'sku' }], { fetchImpl: okFetch, generate: async () => ({ json: 'không phải object' }) });
  check('AI trả JSON lạ → facts [], seenText [], không lỗi', r2.facts.length === 0 && r2.seenText.length === 0 && !r2.llmError, JSON.stringify(r2));
}

// 6. normalizeReply trực tiếp
check('normalizeReply: thiếu mọi thứ → rỗng', JSON.stringify(normalizeReply(null, {})) === JSON.stringify({ seenText: [], facts: [] }));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
