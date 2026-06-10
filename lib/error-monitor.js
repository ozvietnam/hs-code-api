const fs = require('fs');
const path = require('path');

const LOG_PATH = path.join(process.cwd(), 'data', 'error-log.jsonl');

// Lazy-init Sentry only if SENTRY_DSN env + @sentry/node package available
let _sentryStatus = 'pending'; // 'pending' | 'ready' | 'unavailable'
let _Sentry = null;
function getSentry() {
  if (_sentryStatus !== 'pending') return _Sentry;
  if (!process.env.SENTRY_DSN) { _sentryStatus = 'unavailable'; return null; }
  try {
    _Sentry = require('@sentry/node');
    _Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.05 });
    _sentryStatus = 'ready';
  } catch {
    _sentryStatus = 'unavailable';
    _Sentry = null;
  }
  return _Sentry;
}

/**
 * captureError(err, context)
 * Logs error to data/error-log.jsonl + Sentry (if SENTRY_DSN configured).
 * context: { endpoint, description, hsCode, ... } — no PII
 */
function captureError(err, context = {}) {
  const entry = {
    ts: new Date().toISOString(),
    message: err.message || String(err),
    code: err.code || null,
    caller: err.stack?.split('\n')[1]?.trim() || null,
    ...context,
  };

  // Structured local log (best-effort on Vercel read-only FS)
  try {
    fs.appendFileSync(LOG_PATH, `${JSON.stringify(entry)}\n`);
  } catch { /* read-only FS on Vercel — skip */ }

  // Console always (visible in Vercel function logs)
  console.error(`[error-monitor] ${entry.ts} ${entry.code || 'ERR'} ${entry.message}`, context.endpoint ? `(${context.endpoint})` : '');

  // Sentry optional
  const Sentry = getSentry();
  if (Sentry) {
    Sentry.withScope(scope => {
      for (const [k, v] of Object.entries(context)) scope.setExtra(k, v);
      Sentry.captureException(err);
    });
  }
}

/** Read recent error log entries for admin dashboard. */
function readErrorLog(limit = 50) {
  if (!fs.existsSync(LOG_PATH)) return [];
  const lines = fs.readFileSync(LOG_PATH, 'utf8').split('\n').filter(Boolean);
  const out = [];
  for (const line of lines.slice(-limit * 2)) {
    try { out.push(JSON.parse(line)); } catch { /* skip */ }
  }
  return out.slice(-limit).reverse();
}

module.exports = { captureError, readErrorLog };
