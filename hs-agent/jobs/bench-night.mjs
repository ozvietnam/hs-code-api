// J3 — Đo đêm trên main: npm test + bench:delta --full (763 tờ khai giữ riêng).
// So với trung vị 7 lần đo trước; mức nào giảm quá alertDropPoints → báo ngay.
import { spawnSync } from 'child_process';
import { load, save } from '../lib/store.mjs';
import { writeReport, sendTelegram } from '../lib/notify.mjs';
import { git } from '../lib/workspace.mjs';
import { today } from '../lib/log.mjs';
import { REPO } from '../lib/paths.mjs';

const LEVELS = ['chương', 'nhóm', 'phân nhóm', '8 số'];

export function parseBench(out) {
  const res = { top1: [], top3: [] };
  let cur = null;
  for (const line of String(out).split('\n')) {
    if (/---\s*Top-1/.test(line)) cur = 'top1';
    else if (/---\s*Top-3/.test(line)) cur = 'top3';
    else if (cur && /Đúng/.test(line)) {
      const nums = [...line.matchAll(/(\d+(?:\.\d+)?)%/g)].map((m) => Number(m[1]));
      if (nums.length) res[cur].push(nums.length >= 2 ? nums[1] : nums[0]);
    }
  }
  return res.top1.length === 4 && res.top3.length === 4 ? res : null;
}

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };

export default async function benchNight({ cfg, log, dryRun }) {
  const head = git(['rev-parse', '--short', 'HEAD']).out;
  const node = process.execPath;
  const t = spawnSync('npm', ['test', '--silent'], { cwd: REPO, encoding: 'utf8', timeout: 20 * 60000, maxBuffer: 64 << 20 });
  const testsOk = t.status === 0;
  log.info(`npm test trên ${head}: ${testsOk ? 'xanh' : 'ĐỎ'}`);
  const b = spawnSync(node, ['scripts/bench-delta.mjs', '--full'], { cwd: REPO, encoding: 'utf8', timeout: 40 * 60000, maxBuffer: 64 << 20 });
  const bench = parseBench(b.stdout);
  if (!bench) return { status: 'error', lines: [`bench-delta không ra số (exit ${b.status}): ${(b.stderr || b.stdout || '').slice(-300)}`] };

  const hist = load('bench', []);
  const prev = hist.slice(-7);
  const drops = [];
  for (const k of ['top1', 'top3']) {
    bench[k].forEach((v, i) => {
      const m = median(prev.map((h) => h[k][i]));
      if (m != null && m - v > cfg.alertDropPoints) drops.push(`${k} ${LEVELS[i]}: ${m} → ${v}`);
    });
  }
  hist.push({ date: today(), commit: head, testsOk, ...bench });
  save('bench', hist.slice(-400));

  const line = (k) => bench[k].map((v, i) => `${LEVELS[i]} ${v}%`).join(' · ');
  writeReport('bench', `${today()}.md`, `# Đo đêm ${today()} — ${head}\n\n- npm test: ${testsOk ? 'xanh' : 'ĐỎ'}\n- Top-1: ${line('top1')}\n- Top-3: ${line('top3')}\n${drops.length ? `\n## Giảm so với trung vị 7 lần trước\n${drops.map((d) => `- ${d}`).join('\n')}\n` : ''}`);
  if ((drops.length || !testsOk) && !dryRun) {
    await sendTelegram(`⚠️ hs-agent đo đêm ${head}: ${!testsOk ? 'npm test ĐỎ. ' : ''}${drops.join('; ')}`);
  }
  return {
    status: drops.length || !testsOk ? 'regression' : 'ok',
    lines: [`${head} · test ${testsOk ? 'xanh' : 'ĐỎ'}`, `Top-1 ${line('top1')}`, `Top-3 ${line('top3')}`, ...drops.map((d) => `GIẢM ${d}`)],
    bench,
  };
}
