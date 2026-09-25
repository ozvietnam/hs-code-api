// Log theo job/ngày: /srv/hs-agent/logs/<job>/<YYYY-MM-DD>.log (giữ 90 ngày — xem prune()).
import { appendFileSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';
import { LOGS } from './paths.mjs';

export function today(d = new Date()) {
  // Ngày theo giờ VN để khớp lịch người đọc.
  return new Date(d.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

export function createLogger(job) {
  const dir = join(LOGS, job);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${today()}.log`);
  const write = (level, msg) => {
    const line = `${new Date().toISOString()} ${level} ${msg}`;
    appendFileSync(file, line + '\n');
    (level === 'ERR' ? console.error : console.log)(line);
  };
  return {
    file,
    info: (m) => write('INF', m),
    warn: (m) => write('WRN', m),
    error: (m) => write('ERR', m),
  };
}

export function prune(days = 90) {
  const cutoff = Date.now() - days * 86400 * 1000;
  let removed = 0;
  for (const job of safeList(LOGS)) {
    const dir = join(LOGS, job);
    for (const f of safeList(dir)) {
      const p = join(dir, f);
      try {
        if (statSync(p).mtimeMs < cutoff) { unlinkSync(p); removed += 1; }
      } catch { /* bỏ qua */ }
    }
  }
  return removed;
}

function safeList(dir) {
  try { return readdirSync(dir); } catch { return []; }
}
