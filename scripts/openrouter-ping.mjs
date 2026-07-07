#!/usr/bin/env node
/**
 * Verify OPENROUTER_API_KEY + optional free model call.
 * Usage: npm run openrouter:ping
 * Loads .env from repo root when vars are not already set.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENV_PATH = path.join(ROOT, '.env');

function loadDotEnv() {
  if (!fs.existsSync(ENV_PATH)) return;
  for (const line of fs.readFileSync(ENV_PATH, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq);
    const val = trimmed.slice(eq + 1);
    if (!process.env[key]) process.env[key] = val;
  }
}

loadDotEnv();

const apiKey = process.env.OPENROUTER_API_KEY;
const model = process.env.OPENROUTER_MODEL || 'openrouter/free';
const referer = process.env.OPENROUTER_SITE_URL || 'http://localhost';
const title = process.env.OPENROUTER_APP_NAME || 'hs-code-api';

if (!apiKey) {
  console.error('OPENROUTER_API_KEY missing. Add to .env — see docs/openrouter.md');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
  'HTTP-Referer': referer,
  'X-OpenRouter-Title': title,
};

async function main() {
  const keyRes = await fetch('https://openrouter.ai/api/v1/auth/key', { headers });
  const keyJson = await keyRes.json();
  if (!keyRes.ok) {
    console.error('auth/key failed:', keyRes.status, JSON.stringify(keyJson).slice(0, 400));
    process.exit(1);
  }

  const chatRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
      max_tokens: 8,
    }),
  });
  const chatJson = await chatRes.json();
  const text = chatJson.choices?.[0]?.message?.content;

  console.log(
    JSON.stringify(
      {
        ok: chatRes.ok,
        keyLabel: keyJson.data?.label,
        isFreeTier: keyJson.data?.is_free_tier,
        usageMonthly: keyJson.data?.usage_monthly,
        modelRequested: model,
        modelUsed: chatJson.model,
        reply: text?.trim() || null,
        error: chatJson.error || null,
      },
      null,
      2
    )
  );

  if (!chatRes.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
