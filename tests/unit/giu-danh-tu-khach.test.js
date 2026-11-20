'use strict';

require('../../scripts/test-isolate-data.mjs');
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const engineLoop = require('../../lib/engine-loop.js');

// OZV-1613: vòng 1 (R1) bỏ danh từ khách khai khi viết lại tên — khách khai "van fv420"
// bị nameVi "camera giám sát FV420" → searchTextVi sai, hỏi màn hình/độ phân giải cho van.
// Guard tất định phục hồi danh từ. KHÔNG sửa SYS_R1/round1Input: gon test ghim sha256 prompt
// hệ thống (GĐ 13/11) — tầng sửa là MÁY sau vòng 1, không hy vọng LLM ngoan.

describe('lib/engine-loop.js — giuDanhTuKhach (OZV-1613)', () => {
  const { giuDanhTuKhach } = engineLoop;

  test('ca gốc: "van fv420" viết lại thành "camera giám sát FV420" → phục hồi "van" lên đầu nameVi', () => {
    const r = giuDanhTuKhach('van fv420', 'camera giám sát FV420');
    assert.equal(r && r.danhTu, 'van');
    assert.equal(r.nameVi, 'van camera giám sát FV420');
  });

  test('nameVi đã giữ danh từ → KHÔNG đụng (camera vẫn camera)', () => {
    assert.equal(giuDanhTuKhach('camera ip 2mp hồng ngoại', 'camera IP hồng ngoại 2MP'), null);
    assert.equal(giuDanhTuKhach('van bi 1 inch inox', 'van bi inox 1 inch'), null);
  });

  test('so không-dấu hai chiều: khách gõ không dấu "may say", nameVi có dấu "máy sấy" → coi là đã giữ', () => {
    assert.equal(giuDanhTuKhach('may say toc cao', 'máy sấy tóc cao cấp'), null);
  });

  test('tenHang có chữ Hán (tiêu đề Taobao) → guard không áp (khách có thể gọi khác bản chất)', () => {
    assert.equal(giuDanhTuKhach('阀门 FV420', 'van điều khiển FV420'), null);
  });

  test('thiếu đầu vào → null an toàn', () => {
    assert.equal(giuDanhTuKhach('', 'abc'), null);
    assert.equal(giuDanhTuKhach('van fv420', ''), null);
    assert.equal(giuDanhTuKhach(null, null), null);
  });

  test('token đầu là số/model ("1/2 inch van bi") → bỏ số, lấy "inch"? không — lấy token CHỮ đầu: "van" còn thiếu thì phục hồi', () => {
    // "1/2 inch van bi": token chữ đầu là "inch" (từ chỉ kích thước, không phải danh từ chỉ hàng).
    // Guard cố ý KHÔNG đoán từ loại: chỉ so token chữ ĐẦU TIÊN dài ≥3 ("inch" 4 ký tự...) —
    // ca này inch có trong nameVi bình thường nên vô hại; ca nguy hiểm ("van" bị bỏ) đã phủ ở test trên.
    const r = giuDanhTuKhach('1/2 inch van bi', 'van bi inox');
    assert.equal(r, null); // "inch" không nằm trong nameVi nhưng "van" vẫn còn → mong muốn null
  });

  // Mô phỏng ĐÚNG bản chạy prod 12:15 20/11 (OZV-1613): vòng 1 viết lại "van fv420" thành
  // "camera giám sát FV420", neo 8525; made-in-china theo model FV420 ra 3 shop đồng thuận nhóm 8481
  // (van khí nén) nhưng nhóm đó không vào gói kiểm chứng → vòng 2 không có mã 8481 để đối chiếu.
  // LLM + MIC + Oz/web đều giả — không mạng, không key (máy agent không có key LLM thật).
  test('đầu-cuối: vòng 1 bỏ "van" + MIC 3 shop 8481 → nameVi giữ "van", gói vòng 2 có nhóm 8481', async () => {
    const llmTier = require('../../lib/llm-tier');
    const micMod = require('../../lib/mic-lookup.js');
    const ozMod = require('../../lib/oz-precedent-search');
    const webMod = require('../../lib/web-facts.js');
    const micThat = micMod.micLookup; const ozThat = ozMod.searchOzByKeyword; const webThat = webMod.webFacts;
    const llmThat = llmTier.callLLMJson;
    const R1_PROD = { product: { nameVi: 'camera giám sát FV420', nameEn: 'FV420 surveillance camera', purpose: 'Giám sát và ghi hình hình ảnh', mechanism: 'điện', model: 'FV420', form: 'chưa rõ', evidence: {} }, hypotheses: [{ chapter: '85', heading4: '8525', subheading6: '852519', why: 'FV420 có thể là model camera giám sát', confidence: 72 }], verify: { searchVi: ['camera giám sát FV420'], codes8: [], micQuery: null, unknowns: [] } };
    const pages = [
      { shop: 'pneumaticcylinders', hsCode: '8481802190', name: 'Experienced Valve OEM Service Supplier FV420' },
      { shop: 'isaiah-intell', hsCode: '8481804090', name: 'Fv420 Factory Price Pneumatic Component' },
      { shop: 'jungongpneumatic', hsCode: '8481100090', name: 'Pneumatic Foot Switch Fv420' },
    ];
    const r2Prompt = [];
    const ozQueries = [];
    try {
      ozMod.searchOzByKeyword = async (q) => { ozQueries.push(q); return { items: [] }; };
      webMod.webFacts = async () => null;
      micMod.micLookup = async () => ({ pages, cached: false });
      llmTier.callLLMJson = async (system, user, opts = {}) => {
        if (/VÒNG 1/.test(String(system))) return { json: R1_PROD, provider: 'stub', model: 'stub' };
        r2Prompt.push(user);
        return { json: { decision: 'HOI', hs: '848180', confidence: 10, reason: 'chưa rõ van hay camera', basis: [], conditions: [], alternatives: [], questions: [{ fact: 'bản chất hàng', question: 'FV420 là van khí nén hay camera giám sát?', whereToFind: 'hỏi người bán' }] }, provider: 'stub', model: 'stub' };
      };
      const out = await engineLoop.classifyLoop({ tenHang: 'van fv420' }, { kenhGoi: 'erp' });
      // (1) searchTextVi/nameVi GIỮ chữ "van" của khách khai.
      const nameVi = (out.dossier && out.dossier.product && out.dossier.product.nameVi) || '';
      assert.match(nameVi, /^van /i, `nameVi phải bắt đầu bằng "van": ${nameVi}`);
      const qu = out.queryUnderstanding || {};
      assert.ok(/van/i.test(String(qu.searchTextVi || '')), `queryUnderstanding.searchTextVi phải chứa "van": ${JSON.stringify(qu)}`);
      // (2) Nhóm 8481 (3 shop đồng thuận) phải vào gói kiểm chứng vòng 2 — không chỉ nằm ở signal.
      assert.ok(r2Prompt.length >= 1, 'phải có lời gọi vòng 2');
      assert.match(r2Prompt[0], /8481/, 'gói vòng 2 phải nhắc nhóm 8481');
      assert.ok(JSON.stringify(out.candidates && out.candidates.headings || []).includes('8481'), `candidates.headings phải có 8481: ${JSON.stringify(out.candidates && out.candidates.headings)}`);
      // (3) OZV-1630: gather(r1, raw) phải nhận r1.product.nameVi đã qua giuDanhTuKhach.
      assert.ok(
        ozQueries.includes('van camera giám sát FV420'),
        `ozMod.searchOzByKeyword phải được gọi với "van camera giám sát FV420": ${JSON.stringify(ozQueries)}`,
      );
      assert.ok(
        r2Prompt[0].includes('"nameVi":"van camera giám sát FV420"'),
        'HỒ SƠ BẢN CHẤT trong r2Prompt[0] phải có "nameVi":"van camera giám sát FV420"',
      );
    } finally {
      micMod.micLookup = micThat; ozMod.searchOzByKeyword = ozThat; webMod.webFacts = webThat; llmTier.callLLMJson = llmThat;
    }
  });
});
