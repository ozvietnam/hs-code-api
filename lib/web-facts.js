// B1b (doc 12): tra thông tin còn thiếu của sản phẩm trên web — TÍN HIỆU, không phải căn cứ pháp lý.
// Nguồn search: GLM Coding Plan của OZ (đã thanh toán) qua endpoint Anthropic-compatible
// `POST /api/anthropic/v1/messages` với server tool `web_search_20250305` (test thật 26/10:
// trả đúng thông số Atlas Copco GA22 kèm URL nguồn, ~3k token/lượt).
// LUẬT RIÊNG TƯ: chỉ gửi brand/model/URL công khai + từ khoá mục tiêu — KHÔNG gửi nguyên văn
// mô tả của khách (giữ nguyên luật doc 12 Phần C).

const fs = require('node:fs');
const https = require('node:https');
const { recordUsage } = require('./usage-context');

/** Key đọc từ env ZAI_SEARCH_KEY (hs.env, chmod 600) — không bao giờ ghi vào code/log. */
function docZaiKey() {
  const k = (process.env.ZAI_SEARCH_KEY || '').trim();
  if (!k || k.length < 20) return null;
  return k;
}

function goiZai(key, than, timeoutMs = 45000) {
  const body = JSON.stringify({
    model: process.env.ZAI_SEARCH_MODEL || 'glm-4.7',
    max_tokens: 700,
    messages: [{ role: 'user', content: than }],
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
  });
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.z.ai',
        path: '/api/anthropic/v1/messages',
        method: 'POST',
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        timeout: timeoutMs,
      },
      (res) => {
        let buf = '';
        res.on('data', (c) => (buf += c));
        res.on('end', () => {
          if (res.statusCode !== 200) return reject(new Error(`ZAI_HTTP_${res.statusCode}`));
          try { resolve(JSON.parse(buf)); } catch (e) { reject(new Error('ZAI_JSON')); }
        });
      },
    );
    req.on('timeout', () => { req.destroy(new Error('ZAI_TIMEOUT')); });
    req.on('error', reject);
    req.end(body);
  });
}

/**
 * Trả { cauTraLoi, nguon[] } hoặc null khi chưa cấu hình/lỗi (B1b là tầng tuỳ chọn —
 * lỗi ở đây KHÔNG BAO GIỜ làm hỏng lượt phân loại chính).
 */
async function webFacts(o) {
  const key = docZaiKey();
  if (!key) return null;
  const thanhPhan = [o.brand, o.model, o.mucTieu].filter(Boolean).join(' — ');
  try {
    const r = await goiZai(key, `${thanhPhan}. Trả lời ngắn (tối đa 6 dòng) kèm URL nguồn ở cuối.`);
    // L0j (#547): ghi token z.ai vào ngữ cảnh usage (đếm chi phí / usage cho Cổng). Thiếu usage → -1.
    recordUsage({ provider: 'zai', model: process.env.ZAI_SEARCH_MODEL || 'glm-4.7', inputTokens: r?.usage?.input_tokens, outputTokens: r?.usage?.output_tokens });
    const nguon = [];
    let cauTraLoi = '';
    for (const b of r.content || []) {
      if (b.type === 'web_search_tool_result') {
        for ( const x of b.content || []) if (x.url) nguon.push({ title: x.title || '', url: x.url });
      } else if (b.type === 'text') cauTraLoi += b.text;
    }
    return { cauTraLoi: cauTraLoi.trim(), nguon: nguon.slice(0, 6) };
  } catch {
    return null;
  }
}

module.exports = { webFacts, docZaiKey };
