// Gọi LLM qua các provider tương thích OpenAI, theo thứ tự config/providers.json,
// có sổ ngân sách ngày. Provider thiếu key / hết trần / đang nghỉ → bỏ qua.
// Không in key ra log. Không gửi dữ liệu /srv/hs-private cho provider ngoài.
import { readFileSync } from 'fs';
import { join } from 'path';
import { APP_DIR } from './paths.mjs';
import { providerLedger } from './budget.mjs';

export function loadProviders() {
  const cfg = JSON.parse(readFileSync(join(APP_DIR, 'config', 'providers.json'), 'utf8'));
  return cfg.providers.map((p) => ({
    ...p,
    key: process.env[p.keyEnv] ? String(process.env[p.keyEnv]).trim() : '',
    baseUrl: (p.baseUrlEnv && process.env[p.baseUrlEnv]) || p.baseUrl,
    model: (p.modelEnv && process.env[p.modelEnv]) || p.model,
  }));
}

export function configuredProviders(tier = 'standard') {
  return loadProviders().filter((p) => p.key && p.baseUrl && (!p.tiers || p.tiers.includes(tier)));
}

/** Thân trả lời OpenAI-compatible. Một số router (9Router) gắn thêm "data: [DONE]" sau JSON cả khi không stream. */
export function parseBody(raw) {
  const s = String(raw || '').replace(/\s*(data:\s*\[DONE\]\s*)+$/, '').trim();
  try { return JSON.parse(s); } catch { return {}; }
}

export function parseJsonLoose(text) {
  const s = String(text || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  try { return JSON.parse(s); } catch { /* thử cắt khối */ }
  const m = s.match(/```(?:json)?\s*([\s\S]*?)```/) || s.match(/(\{[\s\S]*\})/);
  if (m) return JSON.parse(m[1]);
  throw new Error('LLM không trả JSON');
}

/**
 * @returns {Promise<{json:any, provider:string, model:string}>}
 */
export async function callJson(system, user, { tier = 'standard', budget, maxTokens = 3000, timeoutMs = 90000 } = {}) {
  const ledger = providerLedger();
  const errors = [];
  for (const p of configuredProviders(tier)) {
    if (!ledger.canUse(p)) { errors.push(`${p.name}: hết trần/đang nghỉ`); continue; }
    budget?.spend('llm');
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(`${p.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${p.key}`, 'Content-Type': 'application/json', ...(p.extraHeaders || {}) },
        body: JSON.stringify({
          model: p.model,
          temperature: 0,
          max_tokens: maxTokens,
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
          ...(p.jsonMode ? { response_format: { type: 'json_object' } } : {}),
        }),
        signal: ctl.signal,
      });
      const body = parseBody(await res.text().catch(() => ''));
      const tokens = body?.usage?.total_tokens || 0;
      if (!res.ok) {
        ledger.record(p.name, { tokens, ok: false, rateLimited: res.status === 429 });
        errors.push(`${p.name}: HTTP ${res.status}`);
        continue;
      }
      ledger.record(p.name, { tokens, ok: true });
      const content = body?.choices?.[0]?.message?.content;
      return { json: parseJsonLoose(content), provider: p.name, model: p.model };
    } catch (e) {
      ledger.record(p.name, { ok: false });
      errors.push(`${p.name}: ${e.name === 'AbortError' ? 'timeout' : e.message}`);
    } finally {
      clearTimeout(t);
    }
  }
  const err = new Error(errors.length ? `không provider nào trả lời — ${errors.join('; ')}` : 'không có khóa LLM nào trong /etc/hs-agent/env');
  // Provider trả lời được nhưng nội dung không ra JSON → lỗi của RIÊNG văn bản này (thử lại lần sau), không phải hết provider.
  const onlyBadJson = errors.length && errors.every((x) => /không trả JSON|JSON/.test(x));
  err.code = !errors.length ? 'LLM_NOT_CONFIGURED' : onlyBadJson ? 'LLM_BAD_JSON' : 'LLM_ALL_FAILED';
  throw err;
}
