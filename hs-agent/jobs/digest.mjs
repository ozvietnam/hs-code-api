// Digest 08:00 (§2.7): job nào chạy, bản ghi mới, cửa kiểm đỏ, token theo provider,
// PR agent đang chờ merge, hàng đợi. Kèm dọn log > 90 ngày.
import { load } from '../lib/store.mjs';
import { writeReport, sendTelegram } from '../lib/notify.mjs';
import { github } from '../lib/workspace.mjs';
import { prune, today } from '../lib/log.mjs';
import { configuredProviders } from '../lib/llm.mjs';
import { findIssues } from './watchdog.mjs';
import { readFileSync } from 'fs';
import { join } from 'path';
import { APP_DIR } from '../lib/paths.mjs';

const ICON = { ok: '✅', idle: '💤', waiting: '⏳', stale: '🟡', regression: '🔻', 'gate-red': '❌', 'ship-blocked': '🚧', budget: '💸', error: '❌' };

export default async function digest({ cfg, dryRun }) {
  const since = Date.now() - 24 * 3600 * 1000;
  // quản đốc chạy mỗi giờ — 24 dòng giống nhau làm digest khó đọc; mục "Việc chờ người" bên dưới đã tóm nó.
  const runs = load('runs', []).filter((r) => Date.parse(r.startedAt) >= since && r.job !== 'digest' && r.job !== 'watchdog');
  const queue = load('queue', { items: [] }).items;
  const ledger = load('ledger', { providers: {}, history: [] });
  const byState = queue.reduce((a, i) => ((a[i.state] = (a[i.state] || 0) + 1), a), {});
  const prs = await github('/pulls?state=open&per_page=50');
  const agentPrs = prs.ok ? prs.json.filter((p) => String(p.head?.ref || '').startsWith('agent/')) : null;
  const removed = prune(cfg.logRetentionDays || 90);
  const providers = configuredProviders('standard').map((p) => p.name);
  const usage = Object.entries(ledger.providers || {}).map(([n, v]) => `${n} ${v.requests} req/${v.tokens} tok${v.errors ? `/${v.errors} lỗi` : ''}`);

  const lines = [
    `🗂 hs-agent — ${today()}`,
    '',
    ...(runs.length ? runs.map((r) => `${ICON[r.status] || '•'} ${r.job} (${r.seconds}s): ${(r.lines || [])[0] || r.status}`) : ['Không job nào chạy trong 24 giờ qua.']),
    '',
    `Hàng đợi J2: ${Object.entries(byState).map(([k, v]) => `${k} ${v}`).join(' · ') || 'trống'}`,
    `PR agent chờ merge: ${agentPrs ? (agentPrs.length ? agentPrs.map((p) => `#${p.number}`).join(', ') : '0') : `? (${prs.json?.message || 'chưa có GITHUB_TOKEN'})`}`,
    `LLM: ${providers.length ? providers.join(', ') : 'CHƯA có khóa nào'}${usage.length ? ` · hôm nay ${usage.join('; ')}` : ''}`,
    ...(removed ? [`Dọn ${removed} tệp log cũ.`] : []),
    ...viecChoNguoi(),
  ];
  const text = lines.join('\n');
  const path = writeReport('digest', `${today()}.md`, text + '\n');
  const sent = dryRun ? { ok: false, reason: 'dry-run' } : await sendTelegram(text);
  return { status: 'ok', lines: [`digest ${path}`, sent.ok ? 'đã gửi Telegram' : `chưa gửi Telegram (${sent.reason})`] };
}

// §2.10: digest phải nói AI phải làm gì, không chỉ "đã chạy". Dùng cùng logic với quản đốc.
function viecChoNguoi() {
  try {
    const all = load('runs', []);
    const cfg = JSON.parse(readFileSync(join(APP_DIR, 'config', 'jobs.json'), 'utf8')).jobs.watchdog || {};
    const issues = findIssues({ runs: all, queue: load('queue', { items: [] }), env: process.env, cfg: { ...cfg, _llmCount: configuredProviders('standard').length } });
    const wd = all.filter((r) => r.job === 'watchdog' && !r.dryRun).pop();
    const wdSilent = !wd || Date.now() - Date.parse(wd.startedAt) > 3 * 3600 * 1000;
    return [
      '',
      issues.length ? `👉 Việc chờ người (${issues.length}):` : '👉 Không có việc chờ người.',
      ...issues.map((i) => `• [${i.owner}] ${i.text}`),
      ...(wdSilent ? ['⚠️ Quản đốc (watchdog) không chạy trong 3 giờ qua — kiểm hs-agent-watchdog.timer.'] : []),
    ];
  } catch (e) {
    return ['', `(không dựng được mục việc chờ người: ${e.message})`];
  }
}
