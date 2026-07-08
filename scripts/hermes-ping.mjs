#!/usr/bin/env node
/**
 * Verify HERMES_API_KEY + list allowed models for key-hs-knowledge.
 * Usage: npm run hermes:ping
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

const baseUrl = (process.env.HERMES_BASE_URL || '').replace(/\/$/, '');
const apiKey = process.env.HERMES_API_KEY;
const model = process.env.HERMES_ENRICH_MODEL || 'reasoning';

if (!apiKey || !baseUrl) {
  console.error('HERMES_BASE_URL + HERMES_API_KEY required in .env');
  process.exit(1);
}

const headers = { Authorization: `Bearer ${apiKey}` };

const modelsRes = await fetch(`${baseUrl}/models`, { headers });
if (!modelsRes.ok) {
  console.error(`GET /models failed: ${modelsRes.status} ${(await modelsRes.text()).slice(0, 200)}`);
  process.exit(1);
}
const models = await modelsRes.json();
const ids = (models.data || []).map((m) => m.id);
console.log('Models:', ids.join(', ') || '(empty)');

const chatRes = await fetch(`${baseUrl}/chat/completions`, {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model,
    messages: [{ role: 'user', content: 'Trả lời đúng 1 từ: pong' }],
    max_tokens: 16,
    temperature: 0,
  }),
});
if (!chatRes.ok) {
  console.error(`POST /chat/completions failed: ${chatRes.status} ${(await chatRes.text()).slice(0, 300)}`);
  process.exit(1);
}
const chat = await chatRes.json();
const reply = chat.choices?.[0]?.message?.content?.trim();
console.log(`Chat (${model}):`, reply || '(empty)');
console.log('OK — Hermes Pool reachable');
