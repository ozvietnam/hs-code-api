// B1b (doc 12): tra thông tin còn thiếu của sản phẩm trên web — TÍN HIỆU, không phải căn cứ pháp lý.
// Nguồn search: GLM Coding Plan của OZ (đã thanh toán) qua endpoint Anthropic-compatible
// `POST /api/anthropic/v1/messages` với server tool `web_search_20250305` (test thật 26/10:
// trả đúng thông số Atlas Copco GA22 kèm URL nguồn, ~3k token/lượt).
// LUẬT RIÊNG TƯ: chỉ gửi brand/model/URL công khai + từ khoá mục tiêu — KHÔNG gửi nguyên văn
// mô tả của khách (giữ nguyên luật doc 12 Phần C). Lượt riêng tư: chỉ brand/model (L0a #546, CEO 29/10).

const fs = require('node:fs');
const https = require('node:https');
const { isPrivate } = require('./llm-privacy');
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

const KHUON_CAU_HOI = '. Trả lời ngắn (tối đa 6 dòng) kèm URL nguồn ở cuối.';
// mucTieu ở chế độ riêng tư chỉ được là danh sách khoá từ vựng (vd "power, voltage", "cong_suat") — không chữ tự do.
const KHOA_TU_VUNG_RE = /^[A-Za-z][A-Za-z0-9_]*(\s*,\s*[A-Za-z][A-Za-z0-9_]*)*$/;

function catChuoi(v, max) {
  if (v == null) return '';
  return String(v).replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Ngoại lệ hẹp CEO chốt 29/10: lượt riêng tư được gửi nhãn hiệu + model sang z.ai. `off` = đóng khẩn. */
function hieuModelRiengTuBat() {
  return String(process.env.ZAI_RIENG_TU_HIEU_MODEL || 'on').trim().toLowerCase() !== 'off';
}

function ghiBoQua(lyDo) {
  try { process.stderr.write(`${JSON.stringify({ type: 'web_facts_bo_qua', lyDo })}\n`); } catch { /* log hỏng không làm hỏng lượt chính */ }
}

/**
 * Trả { cauTraLoi, nguon[] } hoặc null khi chưa cấu hình/lỗi (B1b là tầng tuỳ chọn —
 * lỗi ở đây KHÔNG BAO GIỜ làm hỏng lượt phân loại chính).
 * Chỉ đọc `brand`, `model`, `url`, `mucTieu`; mọi khoá khác (tenHang, moTa, productName…) bị bỏ qua.
 * Chế độ riêng tư (withPrivateData): chỉ gửi khi ZAI_RIENG_TU_HIEU_MODEL bật, đầu vào chỉ có brand/model
 * (không url) và mucTieu là khoá từ vựng — z.ai KHÔNG thuộc LLM_NO_TRAIN_PROVIDERS, đây là ngoại lệ riêng.
 * `deps.goi` là mũi tiêm cho test (thay lời gọi z.ai).
 */
async function webFacts(o, deps = {}) {
  const goi = deps.goi || goiZai;
  const brand = catChuoi(o && o.brand, 60);
  const model = catChuoi(o && o.model, 60);
  const urlRaw = catChuoi(o && o.url, 500);
  const url = /^https?:\/\//i.test(urlRaw) ? urlRaw : '';
  const mucTieu = catChuoi(o && o.mucTieu, 200);
  if (!brand && !model && !url) return null;
  const key = docZaiKey();
  if (!key) return null;
  if (isPrivate() && (!hieuModelRiengTuBat() || url || !(brand || model) || (mucTieu && !KHOA_TU_VUNG_RE.test(mucTieu)))) {
    ghiBoQua('RIENG_TU_NGOAI_HIEU_MODEL');
    return null;
  }
  const thanhPhan = [brand, model, url, mucTieu].filter(Boolean).join(' — ');
  try {
    const r = await goi(key, `${thanhPhan}${KHUON_CAU_HOI}`);
    // L0j (#547): ghi token z.ai vào ngữ cảnh usage (đếm chi phí / usage cho Cổng). Thiếu usage → -1.
    recordUsage({ provider: 'zai', model: process.env.ZAI_SEARCH_MODEL || 'glm-4.7', inputTokens: r?.usage?.input_tokens, outputTokens: r?.usage?.output_tokens });
    const nguon = [];
    let cauTraLoi = '';
    for (const b of r.content || []) {
      if (b.type === 'web_search_tool_result') {
        for (const x of b.content || []) if (x.url) nguon.push({ title: x.title || '', url: x.url });
      } else if (b.type === 'text') cauTraLoi += b.text;
    }
    return { cauTraLoi: cauTraLoi.trim(), nguon: nguon.slice(0, 6) };
  } catch {
    return null;
  }
}

module.exports = { webFacts, docZaiKey };
