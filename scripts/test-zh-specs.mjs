// Test kế hoạch OZSource H2 + H3 + H6: từ điển thông số tiếng Trung, danh sách còn thiếu theo
// nhóm 4 số, hai resource công khai declaration_fields / attribute_synonyms.
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
process.env.HS_API_TOKEN = 'zh-test-token';
process.env.HS_ACCESS_LOG = '0';

const { pairsFromText, extractZhSpecs, keysForLabel } = require('../lib/zh-specs.js');
const { missingChapterAttrs } = require('../lib/attributes.js');
const { declarationFields, missingStructured } = require('../lib/declaration-fields.js');
const dataset = require('../api/dataset.js');

let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass += 1; console.log(`PASS ${name}`); } else { fail += 1; console.log(`FAIL ${name} ${extra}`); }
};

// H2 — từ điển
check('材质 → material', keysForLabel('材质').includes('material'));
check('nhãn dài chứa nhãn từ điển: 产品额定功率 → power', keysForLabel('产品额定功率').includes('power'), JSON.stringify(keysForLabel('产品额定功率')));
check('容量 mơ hồ → cả volumeMl và storageCapacity', ['volumeMl', 'storageCapacity'].every((k) => keysForLabel('容量').includes(k)));
const pairs = pairsFromText('品牌：美的 型号：MJ-123 额定功率：1500W 额定电压：220V 材质：304不锈钢');
check('tách 5 cặp nhãn:giá trị trên một dòng', pairs.length === 5 && pairs[4].value === '304不锈钢', JSON.stringify(pairs));
check('tách theo dòng + dấu ；', pairsFromText('材质: ABS+PC\n尺寸：30*20*10cm\n容量：1.5L；颜色:白色').length === 4);
const ex = extractZhSpecs({
  specs: [{ key: '材质', value: '304不锈钢' }],
  texts: [{ url: 'https://img/1.jpg', text: '额定功率：1500W\n额定电压：220V~50Hz' }],
});
const power = ex.find((r) => r.key === 'power');
check('chữ OCR → power có bằng chứng ảnh', power?.value === '1500W' && power.evidence.source === 'IMAGE_OCR' && power.evidence.imageUrl === 'https://img/1.jpg', JSON.stringify(power));
check('thông số trang → material nguồn SITE', ex.find((r) => r.key === 'material')?.evidence.source === 'SITE');
check('missingChapterAttrs: có 材质 thì không đòi "chất liệu"',
  !missingChapterAttrs(['material', 'power'], { tenHang: 'nồi', specs: '材质：304不锈钢 功率：800W' }).length);
check('missingChapterAttrs: không có thông số thì vẫn đòi',
  missingChapterAttrs(['material'], { tenHang: 'nồi' }).length === 1);

// H3 — còn thiếu theo nhóm 4 số
const ssd = missingStructured('84717020', { tenHang: 'Ổ cứng SSD 1.92TB SATA', specs: '型号：PM883 容量：1.92TB' });
check('SSD không bị đòi điện áp, công suất, CPU, RAM', !ssd.some((m) => ['voltage', 'power', 'cpuModel', 'ramCapacity'].includes(m.key)), JSON.stringify(ssd.map((m) => m.key)));
const pump = missingStructured('8413', { tenHang: 'Máy bơm nước', specs: '额定功率：750W 额定电压：220V' });
check('máy bơm: có công suất/điện áp tiếng Trung → không đòi lại', !pump.some((m) => ['power', 'voltage'].includes(m.key)), JSON.stringify(pump.map((m) => m.key)));
check('mỗi trường thiếu có câu hỏi VI và ZH', pump.every((m) => m.questionVi && m.heading === '8413') && pump.some((m) => /请问/.test(m.questionZh || '')));

// H6 — resource công khai, không cần token
async function get(query) {
  const res = { _s: 0, _j: null, headers: {}, setHeader(k, v) { this.headers[k] = v; }, getHeader(k) { return this.headers[k]; }, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } };
  await dataset({ method: 'GET', url: '/api/dataset', query, headers: {} }, res);
  return res;
}
const df = await get({ resource: 'declaration_fields', hs: '8471' });
check('declaration_fields công khai: 8471 có cpuModel bắt buộc', df._s === 200 && df._j.fields.some((f) => f.key === 'cpuModel' && f.required), `${df._s} ${JSON.stringify(df._j).slice(0, 120)}`);
const dfBad = await get({ resource: 'declaration_fields', hs: '84' });
check('declaration_fields: mã < 4 số → 400', dfBad._s === 400);
const syn = await get({ resource: 'attribute_synonyms' });
check('attribute_synonyms công khai, có license', syn._s === 200 && syn._j.total > 50 && /CC BY/.test(syn._j.license), `${syn._s}`);
check('declarationFields 4 số không gắn hsCode 8 số', declarationFields('8413')?.hsCode === null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
