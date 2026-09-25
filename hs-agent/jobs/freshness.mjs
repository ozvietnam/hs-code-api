// J5 — Kiểm hạn đối chiếu dữ liệu (scripts/check-freshness.mjs), chạy trên main.
import { spawnSync } from 'child_process';
import { REPO } from '../lib/paths.mjs';

export default async function freshness() {
  const r = spawnSync(process.execPath, ['scripts/check-freshness.mjs'], { cwd: REPO, encoding: 'utf8', timeout: 5 * 60000 });
  const out = (r.stdout || '').split('\n');
  const stale = out.filter((l) => l.startsWith('✗'));
  return {
    status: r.status === 0 ? 'ok' : 'stale',
    lines: r.status === 0 ? [`Mọi nguồn còn hạn (${out.filter((l) => l.startsWith('✓')).length} nguồn).`] : stale.map((l) => l.replace(/^✗\s*/, '')),
  };
}
