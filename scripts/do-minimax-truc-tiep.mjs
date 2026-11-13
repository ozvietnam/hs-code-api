#!/usr/bin/env node
/**
 * Test MiniMax API directly (B1 of OZV-722).
 * Usage: node scripts/do-minimax-truc-tiep.mjs
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

const apiKey = process.env.MINIMAX_API_KEY;
const baseUrl = process.env.MINIMAX_BASE_URL || 'https://api.minimax.io/v1';
const model = process.env.MINIMAX_MODEL || 'MiniMax-M2.7-highspeed';

if (!apiKey) {
  console.error('MINIMAX_API_KEY missing in environment or .env');
  process.exit(1);
}

const logLines = [];
function log(msg) {
  console.log(msg);
  logLines.push(msg);
}

async function main() {
  log(`Testing MiniMax directly: baseUrl=${baseUrl}, model=${model}, iterations=10`);
  let successCount = 0;
  let failCount = 0;
  const statuses = {};

  for (let i = 1; i <= 10; i++) {
    const start = Date.now();
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Xin chào, trả lời ngắn gọn: 1+1=?' }],
          temperature: 0.1,
          max_tokens: 100,
        }),
      });
      const latency = Date.now() - start;
      const text = await res.text();
      const truncated = text.replace(/\s+/g, ' ').slice(0, 300);

      statuses[res.status] = (statuses[res.status] || 0) + 1;
      if (res.ok) {
        successCount++;
        log(`[#${i}] status=${res.status} latency=${latency}ms ok=true body=${truncated}`);
      } else {
        failCount++;
        log(`[#${i}] status=${res.status} latency=${latency}ms ok=false body=${truncated}`);
      }
    } catch (e) {
      const latency = Date.now() - start;
      failCount++;
      log(`[#${i}] EXCEPTION latency=${latency}ms error=${e.message}`);
    }
  }

  log(`\nSummary: success=${successCount}, fail=${failCount}, statuses=${JSON.stringify(statuses)}`);
  fs.writeFileSync('/tmp/minimax-direct-test.log', logLines.join('\n') + '\n', 'utf8');
  log('Results written to /tmp/minimax-direct-test.log');
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
