#!/usr/bin/env node
/**
 * MiniMax quota + enricher tracker
 * Polls tax-enriched.json every 5 min, reports progress, estimates ETA.
 * Runs until enricher PID dies or target reached.
 *
 * Usage:
 *   node scripts/minimax-tracker.mjs [enricher-pid]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const ENRICHED_PATH = path.join(ROOT, 'data', 'tax-enriched.json');
const TAX_PATH = path.join(ROOT, 'data', 'tax.json');

const POLL_MS = 5 * 60 * 1000; // 5 minutes
const TARGET = 7928;
const MINIMAX_QUOTA = 1500;
const MINIMAX_WINDOW_HRS = 5;

let pidToWatch = process.argv[2] ? parseInt(process.argv[2], 10) : null;

function getCounts() {
  const tax = JSON.parse(fs.readFileSync(TAX_PATH, 'utf8'));
  const withPolicy = Object.values(tax).filter((r) => r.cs && String(r.cs).trim()).length;
  let enriched = 0;
  if (fs.existsSync(ENRICHED_PATH)) {
    const data = JSON.parse(fs.readFileSync(ENRICHED_PATH, 'utf8'));
    enriched = Object.keys(data).length;
  }
  return { withPolicy, enriched, remaining: withPolicy - enriched };
}

function isPidRunning(pid) {
  if (!pid) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function formatTime(ms) {
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min}m`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

let prevEnriched = 0;
let prevTime = Date.now();
let startEnriched = 0;

function poll() {
  const { withPolicy, enriched, remaining } = getCounts();
  const now = Date.now();

  if (startEnriched === 0) startEnriched = enriched;

  const deltaEnriched = enriched - prevEnriched;
  const deltaTime = now - prevTime;
  const rate = deltaTime > 0 ? (deltaEnriched / (deltaTime / 60000)) : 0; // per min

  const totalDelta = enriched - startEnriched;
  const totalTime = now - (now - deltaTime * (enriched / Math.max(deltaEnriched, 1)));
  const avgRate = totalDelta > 0 && deltaTime > 0 ? (deltaEnriched / (deltaTime / 60000)) : rate;

  const etaMin = rate > 0 ? remaining / rate : Infinity;
  const pct = ((enriched / withPolicy) * 100).toFixed(1);

  const apiCallsUsed = Math.ceil(totalDelta / 10);
  const apiCallsNeeded = Math.ceil(remaining / 10);
  const quotaPct = ((apiCallsUsed / MINIMAX_QUOTA) * 100).toFixed(1);

  const pidAlive = isPidRunning(pidToWatch);

  const ts = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  console.log(`[${ts}] ${enriched}/${withPolicy} (${pct}%) | Rate: ${rate.toFixed(1)}/min | ETA: ${etaMin < Infinity ? formatTime(etaMin * 60000) : '...'} | API: ~${apiCallsUsed} used, ~${apiCallsNeeded} needed (${quotaPct}% quota) | PID ${pidToWatch || '?'}: ${pidAlive ? 'alive' : 'DEAD'}`);

  if (remaining <= 0) {
    console.log(`\n=== DONE === All ${withPolicy} HS codes enriched!`);
    process.exit(0);
  }

  if (!pidAlive && pidToWatch) {
    console.log(`\n=== ENRICHER DIED === PID ${pidToWatch} no longer running. ${remaining} codes remaining.`);
    console.log(`Restart with: node scripts/enrich-policies.mjs --batch=10 --concurrency=3 --provider=minimax`);
    process.exit(1);
  }

  prevEnriched = enriched;
  prevTime = now;
}

// Initial poll
console.log('=== MiniMax Enricher Tracker ===');
console.log(`Target: ${TARGET} HS codes | Quota: ${MINIMAX_QUOTA} req / ${MINIMAX_WINDOW_HRS}hrs`);
console.log(`Polling every ${POLL_MS / 60000} min | Ctrl+C to stop\n`);
poll();

setInterval(poll, POLL_MS);
