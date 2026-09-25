// Digest 08:00 (§2.7): job nào chạy, bản ghi mới, cửa kiểm đỏ, token theo provider,
// PR agent đang chờ merge, hàng đợi. Kèm dọn log > 90 ngày.
import { load } from '../lib/store.mjs';
import { writeReport, sendTelegram } from '../lib/notify.mjs';
import { github } from '../lib/workspace.mjs';
import { prune, today } from '../lib/log.mjs';
import { configuredProviders } from '../lib/llm.mjs';

const ICON = { ok: '✅', idle: '💤', waiting: '⏳', stale: '🟡', regression: '🔻', 'gate-red': '❌', 'ship-blocked': '🚧', budget: '💸', error: '❌' };

export default async function digest({ cfg, dryRun }) {
  const since = Date.now() - 24 * 3600 * 1000;
  const runs = load('runs', []).filter((r) => Date.parse(r.startedAt) >= since && r.job !== 'digest');
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
  ];
  const text = lines.join('\n');
  const path = writeReport('digest', `${today()}.md`, text + '\n');
  const sent = dryRun ? { ok: false, reason: 'dry-run' } : await sendTelegram(text);
  return { status: 'ok', lines: [`digest ${path}`, sent.ok ? 'đã gửi Telegram' : `chưa gửi Telegram (${sent.reason})`] };
}
