import '../scripts/test-isolate-data.mjs'; // rule bất biến 8: import './test-isolate-data.mjs'
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createRequire } from 'node:module';
import { chat, listConfigured } from '../lib/llm.mjs';

const require = createRequire(import.meta.url);
const { callLLMJson, llmStatus, configuredFallbacks, _internal } = require('../lib/llm-tier.js');
const { withPrivateData } = require('../lib/llm-privacy.js');

const ENV_KEYS = [
  'HS_BENCH_ONLY_9ROUTER',
  'HERMES_BASE_URL',
  'HERMES_API_KEY',
  'HERMES_MODEL',
  'HERMES_ENRICH_MODEL',
  'OPENAI_BASE_URL',
  'OPENAI_API_KEY',
  'OPENAI_MODEL',
  'MINIMAX_API_KEY',
  'MINIMAX_BASE_URL',
  'MINIMAX_MODEL',
  'GEMINI_API_KEY',
  'GEMINI_FREE_KEYS',
  'DEEPSEEK_API_KEY',
  'OPENROUTER_API_KEY',
  'GEMINI_TRA_PHI_CHOT_CUOI',
  'PREMIUM_PROVIDER',
  'LLM_NO_TRAIN_PROVIDERS',
  'HS_LLM_PRIVATE_ALL',
];

function clearLlmEnv() {
  for (const k of ENV_KEYS) delete process.env[k];
  _internal.cooldown.clear();
  _internal.ngatMach.clear();
}

function setAllProdKeys() {
  process.env.MINIMAX_API_KEY = 'prod-minimax-key';
  process.env.GEMINI_API_KEY = 'prod-gemini-paid-key';
  process.env.GEMINI_FREE_KEYS = 'prod-free-1,prod-free-2';
  process.env.DEEPSEEK_API_KEY = 'prod-deepseek-key';
  process.env.OPENROUTER_API_KEY = 'prod-openrouter-key';
}

test('1. HS_BENCH_ONLY_9ROUTER=1 + có đủ khoá bản thật nhưng thiếu cấu hình 9Router → chặn cứng BENCH_9ROUTER_NOT_CONFIGURED, không gọi provider nào', async () => {
  clearLlmEnv();
  setAllProdKeys();
  process.env.HS_BENCH_ONLY_9ROUTER = '1';

  const origFetch = globalThis.fetch;
  const externalCalls = [];
  globalThis.fetch = async (url) => {
    externalCalls.push(String(url));
    throw new Error(`Không được phép gọi fetch: ${url}`);
  };

  try {
    // 1a. Thiếu cả baseUrl lẫn key — callLLMJson (standard, premium, private)
    for (const opts of [{}, { tier: 'premium' }, { containsCustomerData: true }]) {
      await assert.rejects(
        () => callLLMJson('sys', 'user', opts),
        (err) => {
          assert.equal(err.code, 'BENCH_9ROUTER_NOT_CONFIGURED');
          assert.match(err.message, /BENCH_9ROUTER_NOT_CONFIGURED/);
          return true;
        },
      );
    }

    // 1b. Thiếu cả baseUrl lẫn key — chat() trực tiếp trong lib/llm.mjs
    await assert.rejects(
      () => chat([{ role: 'user', content: 'hi' }], { json: true }),
      (err) => {
        assert.equal(err.code, 'BENCH_9ROUTER_NOT_CONFIGURED');
        assert.match(err.message, /BENCH_9ROUTER_NOT_CONFIGURED/);
        return true;
      },
    );

    // 1c. Có HERMES_BASE_URL nhưng thiếu key → vẫn chặn cứng
    process.env.HERMES_BASE_URL = 'http://127.0.0.1:19999/v1';
    await assert.rejects(
      () => callLLMJson('sys', 'user'),
      (err) => err.code === 'BENCH_9ROUTER_NOT_CONFIGURED',
    );

    // 1d. Có OPENAI_API_KEY nhưng thiếu baseUrl → vẫn chặn cứng
    delete process.env.HERMES_BASE_URL;
    process.env.OPENAI_API_KEY = 'bench-worker-key';
    await assert.rejects(
      () => callLLMJson('sys', 'user'),
      (err) => err.code === 'BENCH_9ROUTER_NOT_CONFIGURED',
    );

    // 1e. llmStatus() khi thiếu cấu hình 9Router phải báo ok=false, order=[] (không lộ gemini/minimax)
    const st = llmStatus();
    assert.equal(st.ok, false);
    assert.deepEqual(st.order, []);
    assert.deepEqual(st.fallbacks, []);

    assert.equal(externalCalls.length, 0, `Không được gọi bất kỳ URL nào, nhưng đã gọi: ${externalCalls.join(', ')}`);
  } finally {
    globalThis.fetch = origFetch;
    clearLlmEnv();
  }
});

test('2. HS_BENCH_ONLY_9ROUTER=1 (và on/true) + mock server OpenAI-compatible → đi đúng vào 9Router, không rò sang provider khác kể cả khi 9Router trả 500', async () => {
  clearLlmEnv();
  setAllProdKeys();

  let serverMode = 'ok';
  const routerRequests = [];
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    routerRequests.push({
      method: req.method,
      url: req.url,
      auth: req.headers.authorization,
      model: body.model,
    });
    if (serverMode === '500') {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: '9router upstream error' } }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    // Đính kèm đuôi data: [DONE] như 9Router thật
    res.end(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify({ hs: '84137090', modelUsed: body.model }) }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 12, completion_tokens: 8 },
      }) + '\ndata: [DONE]\n',
    );
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const mockBaseUrl = `http://127.0.0.1:${port}/v1`;

  const origFetch = globalThis.fetch;
  const leakedCalls = [];
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    if (!u.startsWith(`http://127.0.0.1:${port}`)) {
      leakedCalls.push(u);
      throw new Error(`Rò rỉ lời gọi ra ngoài 9Router: ${u}`);
    }
    return origFetch(url, init);
  };

  try {
    // 2a. Cấu hình qua OPENAI_BASE_URL + OPENAI_API_KEY (mặc định model gemini-2.5-flash)
    process.env.HS_BENCH_ONLY_9ROUTER = '1';
    process.env.OPENAI_BASE_URL = mockBaseUrl;
    process.env.OPENAI_API_KEY = 'worker-4keys-token';

    const st = llmStatus();
    assert.equal(st.ok, true);
    assert.deepEqual(st.order, ['hermes']);
    assert.deepEqual(st.fallbacks, ['hermes']);
    assert.equal(st.gemini, false);

    const r1 = await callLLMJson('system prompt', 'user prompt');
    assert.equal(r1.provider, 'hermes');
    assert.equal(r1.model, 'gemini-2.5-flash');
    assert.deepEqual(r1.json, { hs: '84137090', modelUsed: 'gemini-2.5-flash' });
    assert.equal(routerRequests.length, 1);
    assert.equal(routerRequests[0].url, '/v1/chat/completions');
    assert.equal(routerRequests[0].auth, 'Bearer worker-4keys-token');
    assert.equal(routerRequests[0].model, 'gemini-2.5-flash');

    // 2b. Cờ 'on' và 'true' + cấu hình HERMES_BASE_URL / HERMES_API_KEY / HERMES_MODEL + trong withPrivateData & tier=premium
    for (const flagVal of ['on', 'true']) {
      process.env.HS_BENCH_ONLY_9ROUTER = flagVal;
      delete process.env.OPENAI_BASE_URL;
      delete process.env.OPENAI_API_KEY;
      process.env.HERMES_BASE_URL = mockBaseUrl;
      process.env.HERMES_API_KEY = 'hermes-worker-token';
      process.env.HERMES_MODEL = 'gemini-2.5-pro';

      const r2 = await withPrivateData(() => callLLMJson('sys', 'usr', { tier: 'premium', containsCustomerData: true }));
      assert.equal(r2.provider, 'hermes');
      assert.equal(r2.model, 'gemini-2.5-pro');
      assert.equal(r2.json.modelUsed, 'gemini-2.5-pro');
    }

    // 2c. Khi mock server 9Router trả 500 → báo lỗi, TUYỆT ĐỐI KHÔNG rò sang MiniMax / Gemini trả phí / Gemini miễn phí / DeepSeek / OpenRouter
    serverMode = '500';
    const beforeCount = routerRequests.length;
    await assert.rejects(
      () => callLLMJson('sys', 'usr', { tier: 'premium' }),
      (err) => {
        assert.match(err.message, /HTTP 500/);
        return true;
      },
    );
    await assert.rejects(
      () => withPrivateData(() => callLLMJson('sys', 'usr', { containsCustomerData: true })),
      (err) => {
        assert.match(err.message, /HTTP 500/);
        return true;
      },
    );
    assert.equal(routerRequests.length, beforeCount + 2, 'Chỉ gọi đúng vào mock 9Router');
    assert.equal(leakedCalls.length, 0, `Không được rò sang provider khác khi 9Router 500: ${leakedCalls.join(', ')}`);

    // 2d. listConfigured() khi bật cờ chỉ báo hermes
    const cfgList = listConfigured();
    assert.deepEqual(cfgList.map((x) => x.provider), ['hermes']);
  } finally {
    globalThis.fetch = origFetch;
    await new Promise((resolve) => server.close(resolve));
    clearLlmEnv();
  }
});

test('3. Khi HS_BENCH_ONLY_9ROUTER tắt (không đặt hoặc =0/off/false) → hành vi cũ giữ nguyên 100%', async () => {
  clearLlmEnv();
  setAllProdKeys();

  const origFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.includes('api.minimax.io')) {
      const model = JSON.parse(init.body || '{}').model;
      calls.push(`minimax:${model}`);
      return new Response(
        JSON.stringify({ choices: [{ message: { content: JSON.stringify({ provider: 'minimax', model }) } }] }),
        { status: 200 },
      );
    }
    if (u.includes('generativelanguage.googleapis.com')) {
      const key = new URL(u).searchParams.get('key');
      calls.push(`gemini:${key}`);
      return new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ provider: 'gemini', key }) }] } }] }),
        { status: 200 },
      );
    }
    throw new Error(`Unexpected URL: ${u}`);
  };

  try {
    for (const offVal of [undefined, '', '0', 'off', 'false']) {
      if (offVal === undefined) delete process.env.HS_BENCH_ONLY_9ROUTER;
      else process.env.HS_BENCH_ONLY_9ROUTER = offVal;

      calls.length = 0;
      const rStd = await callLLMJson('sys', 'usr');
      assert.equal(rStd.provider, 'minimax');
      assert.equal(rStd.model, 'MiniMax-M2.7-highspeed');
      assert.deepEqual(calls, ['minimax:MiniMax-M2.7-highspeed']);

      calls.length = 0;
      const rPrem = await callLLMJson('sys', 'usr', { tier: 'premium' });
      assert.equal(rPrem.provider, 'gemini');
      assert.deepEqual(calls, ['gemini:prod-gemini-paid-key']);

      const st = llmStatus();
      assert.equal(st.ok, true);
      assert.ok(st.fallbacks.includes('minimax'));
      assert.equal(st.geminiPaid, true);
      assert.equal(st.geminiFreeKeys, 2);
    }
  } finally {
    globalThis.fetch = origFetch;
    clearLlmEnv();
  }
});
