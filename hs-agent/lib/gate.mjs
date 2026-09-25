// Cửa kiểm (§2.3): chạy lần lượt, dừng ở cửa CHẶN đầu tiên đỏ.
// Cửa MỀM đỏ (benchmark) không chặn nhưng PR bị gắn nhãn needs-review.
import { spawnSync } from 'child_process';

/**
 * @param {Array<{name:string, cmd:string[], block:boolean, allowExit?:number[]}>} steps
 * @returns {{ok:boolean, soft:boolean, results:Array}}
 */
export function runGate(steps, { cwd, log, timeoutMs = 30 * 60000 } = {}) {
  const results = [];
  let ok = true;
  let soft = true;
  for (const s of steps) {
    const t0 = Date.now();
    const r = spawnSync(s.cmd[0], s.cmd.slice(1), { cwd, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024, env: { ...process.env, CI: '1' } });
    const pass = (s.allowExit || [0]).includes(r.status);
    const tail = `${r.stdout || ''}\n${r.stderr || ''}`.trim().split('\n').slice(-12).join('\n');
    results.push({ name: s.name, pass, block: s.block, status: r.status, seconds: Math.round((Date.now() - t0) / 1000), tail });
    log?.[pass ? 'info' : 'warn'](`gate ${pass ? '✓' : '✗'} ${s.name} (${r.status}, ${Math.round((Date.now() - t0) / 1000)}s)`);
    if (!pass && s.block) { ok = false; break; }
    if (!pass) soft = false;
  }
  return { ok, soft, results };
}

export function gateTable(gate) {
  const rows = gate.results.map((r) => `| ${r.pass ? '✅' : r.block ? '❌' : '⚠️'} | \`${r.name}\` | ${r.seconds}s |`);
  const fails = gate.results.filter((r) => !r.pass).map((r) => `<details><summary>${r.name}</summary>\n\n\`\`\`\n${r.tail}\n\`\`\`\n</details>`);
  return ['| | Cửa kiểm | Thời gian |', '|---|---|---|', ...rows, '', ...fails].join('\n');
}
