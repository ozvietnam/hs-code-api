// lib/llm.mjs — Multi-provider LLM router (ESM, dùng cho scripts batch).
// Mục đích: KHÔNG bao giờ đập thẳng Gemini trả tiền cho job batch.
//
// Thứ tự (CEO chốt 04/10/2026): MiniMax gọi thẳng (gói trả phí, model highspeed) → Hermes →
// OpenRouter free. Gemini miễn phí chỉ là dự phòng cuối, nằm ở lib/llm-tier.js.
// Gemini KHÔNG nằm trong default order. Chỉ fallback khi ALLOW_GEMINI_FALLBACK=1.
//
// Usage:
//   import { chat, listConfigured } from '../lib/llm.mjs';
//   const { content, provider } = await chat([{role:'user',content:'...'}], { json:true });

function env(k) {
  const v = process.env[k];
  return v == null ? undefined : String(v).trim().replace(/^["']|["']$/g, '');
}

// Đọc env LAZY (lúc gọi, không phải lúc import) — để script load .env trước khi gọi chat()
function buildProviders() {
  return {
    // Hermes Pool (LiteLLM proxy dùng chung) — chuẩn OpenAI. Ưu tiên #1: ổn định, không đốt Gemini.
    // baseUrl + key CHỈ đến từ env (.env gitignored) — không hardcode IP nội bộ vào repo public.
    hermes: {
      baseUrl: env('HERMES_BASE_URL'),
      key: env('HERMES_API_KEY'),
      // HERMES_MODEL là tên hs-agent dùng trên vps-hsagent; đọc cả hai để một tệp env chạy được mọi nơi.
      // Cổng Hermes không có model tên 'reasoning' thì trả 404 model_not_found cho MỌI lời gọi.
      model: env('HERMES_ENRICH_MODEL') || env('HERMES_MODEL') || 'reasoning',
      style: 'openai',
    },
    minimax: {
      baseUrl: env('MINIMAX_BASE_URL') || 'https://api.minimax.io/v1',
      key: env('MINIMAX_API_KEY'),
      // Bản highspeed ~100 token/giây so với ~60 của bản thường (tài liệu MiniMax). Gói không
      // cho dùng bản highspeed thì tự lùi về fallbackModel trong cùng nhà cung cấp.
      model: env('MINIMAX_MODEL') || env('MINIMAX_ENRICH_MODEL') || 'MiniMax-M2.7-highspeed',
      fallbackModel: env('MINIMAX_FALLBACK_MODEL') || 'MiniMax-M2.7',
      style: 'openai',
    },
    openrouter: {
      baseUrl: env('OPENROUTER_BASE_URL') || 'https://openrouter.ai/api/v1',
      key: env('OPENROUTER_API_KEY'),
      model: env('OPENROUTER_ENRICH_MODEL') || 'google/gemma-3-27b-it:free',
      style: 'openai',
    },
    ollama: {
      baseUrl: env('OLLAMA_BASE_URL') || 'https://ollama.com/api',
      key: env('OLLAMA_API_KEY'),
      model: env('OLLAMA_ENRICH_MODEL') || 'gemma2',
      style: 'ollama',
    },
  };
}

// MiniMax gọi thẳng trước: một bước mạng, không xếp hàng sau các việc khác của cổng Hermes
// (đo 29/09: 33–38 % lượt qua Hermes lỗi vì giới hạn tốc độ). Gemini KHÔNG có ở đây — guard.
// Provider nào thiếu key sẽ tự bị skip (vd VPS chưa có MINIMAX_API_KEY → đi Hermes).
const DEFAULT_ORDER = ['minimax', 'hermes', 'openrouter'];

async function openaiChat(p, messages, { json, temperature = 0.1, maxTokens = 4000, signal } = {}) {
  const res = await fetch(`${p.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${p.key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: p.model,
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    }),
    signal,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`HTTP ${res.status}: ${t.slice(0, 250)}`);
  }
  // Một số router (9Router sau cổng Hermes) gắn "data: [DONE]" sau JSON kể cả khi không stream.
  const raw = (await res.text()).replace(/\s*(data:\s*\[DONE\]\s*)+$/, '').trim();
  const data = JSON.parse(raw);
  return data.choices?.[0]?.message?.content ?? '';
}

async function ollamaChat(p, messages, { json, temperature = 0.1, signal } = {}) {
  const res = await fetch(`${p.baseUrl}/chat`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${p.key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: p.model,
      messages,
      stream: false,
      options: { temperature },
      ...(json ? { format: 'json' } : {}),
    }),
    signal,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`HTTP ${res.status}: ${t.slice(0, 250)}`);
  }
  const data = await res.json();
  return data.message?.content ?? '';
}

/**
 * chat(messages, opts) → { content, provider, model }
 * opts: { json, temperature, maxTokens, order, allowGemini, timeoutMs }
 */
export async function chat(messages, opts = {}) {
  const PROVIDERS = buildProviders();
  const order = (opts.order || DEFAULT_ORDER).slice();
  if (opts.allowGemini || env('ALLOW_GEMINI_FALLBACK') === '1') {
    order.push('__gemini_blocked__'); // vẫn block — Gemini không impl ở router này (an toàn tuyệt đối)
  }
  const errors = [];
  const ac = opts.timeoutMs ? new AbortController() : null;
  const timer = ac ? setTimeout(() => ac.abort(), opts.timeoutMs) : null;
  try {
    for (const name of order) {
      if (name === '__gemini_blocked__') { errors.push('gemini: blocked by router (dùng script Gemini riêng nếu thực sự cần)'); continue; }
      const p = PROVIDERS[name];
      if (!p || !p.key) { errors.push(`${name}: no key`); continue; }
      if (!p.baseUrl) { errors.push(`${name}: no baseUrl`); continue; }
      const callOpts = { ...opts, signal: ac?.signal };
      const models = [p.model, ...(p.fallbackModel && p.fallbackModel !== p.model ? [p.fallbackModel] : [])];
      for (const model of models) {
        try {
          const pm = { ...p, model };
          const content = p.style === 'openai' ? await openaiChat(pm, messages, callOpts) : await ollamaChat(pm, messages, callOpts);
          if (!content || !content.trim()) { errors.push(`${name}/${model}: empty response`); break; }
          return { content, provider: name, model };
        } catch (e) {
          errors.push(`${name}/${model}: ${e.message}`);
          // Chỉ lùi model khi lỗi do model/gói (400/403/404); lỗi mạng, 429, 5xx → sang nhà cung cấp kế.
          if (!/HTTP (400|403|404)\b/.test(String(e.message))) break;
        }
      }
    }
  } finally {
    if (timer) clearTimeout(timer);
  }
  throw new Error('All providers failed:\n  ' + errors.join('\n  '));
}

export function listConfigured() {
  return Object.entries(buildProviders()).map(([n, p]) => ({ provider: n, hasKey: !!p.key, model: p.model, fallbackModel: p.fallbackModel || null, baseUrl: p.baseUrl }));
}
