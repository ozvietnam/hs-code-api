// J2 — Trích tiền lệ từ hàng đợi J1 → tệp community → cửa kiểm → PR.
// Cần LLM. Không có khóa nào → dừng êm, báo "chờ khóa" (không hạ chuẩn).
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fetchPage, htmlToText } from '../lib/fetcher.mjs';
import { callJson, configuredProviders } from '../lib/llm.mjs';
import { SYSTEM_PROMPT, buildUserPrompt, verifyRecords } from '../lib/extract.mjs';
import { load, save } from '../lib/store.mjs';
import { prepareWorktree, removeWorktree, classifyChanges, commit, push, openPullRequest } from '../lib/workspace.mjs';
import { runGate, gateTable } from '../lib/gate.mjs';
import { today } from '../lib/log.mjs';

function articleText(html) {
  const m = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  return htmlToText(m ? m[1] : html);
}

export default async function precedentExtract({ cfg, log, budget, dryRun }) {
  const queue = load('queue', { items: [] });
  const todo = queue.items.filter((i) => i.kind === 'classification' && (i.state === 'new' || i.state === 'retry')).slice(0, cfg.maxDocsPerRun);
  if (!todo.length) return { status: 'idle', lines: ['Hàng đợi trống.'] };
  if (!configuredProviders('standard').length) {
    return { status: 'waiting', lines: [`${todo.length}+ văn bản chờ trích nhưng chưa có khóa LLM nào trong /etc/hs-agent/env.`] };
  }

  const { dir, branch } = prepareWorktree('precedent-extract');
  const records = [];
  const docLines = [];
  try {
    for (const item of todo) {
      budget.checkTime();
      item.attempts = (item.attempts || 0) + 1;
      try {
        const { html } = await fetchPage(item.url, { budget });
        const text = articleText(html);
        if (text.length < 300) throw new Error('toàn văn quá ngắn');
        const { json, provider } = await callJson(SYSTEM_PROMPT, buildUserPrompt({ title: item.title, text }), { budget, tier: 'standard' });
        const v = verifyRecords(json, { text, ref: item.ref, date: item.date, url: item.url, repoDir: dir });
        item.provider = provider;
        if (v.noConclusion) {
          item.state = 'no-conclusion';
          item.note = String(v.noConclusion).slice(0, 200);
          docLines.push(`- ${item.ref}: không kết luận mã — ${item.note}`);
        } else if (!v.records.length) {
          item.state = item.attempts >= cfg.maxAttemptsPerDoc ? 'rejected' : 'retry';
          item.note = v.rejected.map((r) => `${r.hsCode}: ${r.why}`).join('; ').slice(0, 300) || 'LLM không trả bản ghi';
          docLines.push(`- ${item.ref}: 0 bản ghi qua kiểm (${item.note})`);
        } else {
          item.state = 'extracted';
          item.records = v.records.length;
          records.push(...v.records);
          docLines.push(`- [${item.ref}](${item.url}) → ${v.records.map((r) => r.hsCode).join(', ')}${v.rejected.length ? ` · bỏ ${v.rejected.length} (${v.rejected.map((r) => r.why).join('; ')})` : ''}`);
        }
      } catch (e) {
        if (e.code === 'LLM_ALL_FAILED' || e.code === 'LLM_NOT_CONFIGURED' || e.kind) {
          // Hết ngân sách / mọi provider đều lỗi: giữ văn bản cho lần sau, dừng vòng,
          // nhưng vẫn ship những bản ghi đã trích được ở trên.
          item.attempts -= 1;
          docLines.push(`- dừng sớm: ${e.message.slice(0, 160)}`);
          break;
        }
        item.state = item.attempts >= cfg.maxAttemptsPerDoc ? 'rejected' : 'retry';
        item.note = e.message.slice(0, 200);
        docLines.push(`- ${item.ref}: lỗi ${item.note}`);
      }
    }
  } finally {
    save('queue', queue);
  }

  if (!records.length) {
    removeWorktree(dir);
    return { status: 'ok', lines: [`Đã xử lý ${todo.length} văn bản, không có bản ghi mới qua kiểm.`, ...docLines] };
  }

  const file = `data/community/tb-tchq/agent-vbpl-${today()}.json`;
  mkdirSync(join(dir, 'data/community/tb-tchq'), { recursive: true });
  const existing = existsSync(join(dir, file)) ? JSON.parse(readFileSync(join(dir, file), 'utf8')).records || [] : [];
  writeFileSync(join(dir, file), JSON.stringify({
    kind: 'precedent',
    contributor: { name: 'hs-agent (vps-hsagent)', github: 'ozvietnam' },
    license: 'CC-BY-SA-4.0',
    submittedAt: today(),
    note: 'Tự động bởi hs-agent J2 từ vbpl.ts24.com.vn. Mỗi bản ghi đã kiểm: mã HS xuất hiện nguyên văn trong toàn văn, ≥60% từ mô tả có trong toàn văn, số hiệu/ngày lấy từ tiêu đề nguồn, qua lọc riêng tư.',
    records: [...existing, ...records],
  }, null, 2) + '\n');

  const node = process.execPath;
  const gate = runGate([
    { name: 'validate-community', cmd: [node, 'scripts/validate-community.mjs'], block: true },
    { name: 'park-old-tariff', cmd: [node, 'scripts/park-old-tariff-precedents.mjs'], block: true },
    { name: 'dedupe', cmd: [node, 'scripts/dedupe-community-precedents.mjs'], block: true },
    { name: 'audit (+ mở 5 url)', cmd: [node, 'scripts/audit-community-precedents.mjs', '--dir', 'data/community/tb-tchq', '--fetch', '5'], block: true },
    { name: 'merge-community', cmd: [node, 'scripts/merge-community.mjs'], block: true },
    { name: 'sync-doc-counts', cmd: [node, 'scripts/sync-doc-counts.mjs'], block: true },
    { name: 'npm test', cmd: ['npm', 'test', '--silent'], block: true },
    { name: 'bench:delta', cmd: [node, 'scripts/bench-delta.mjs'], block: false },
  ], { cwd: dir, log });

  const changes = classifyChanges(dir, cfg.writeAllow);
  const lines = [`${records.length} bản ghi từ ${todo.filter((i) => i.state === 'extracted').length} văn bản`, ...docLines];
  if (changes.blockedTracked.length) {
    removeWorktree(dir);
    return { status: 'error', lines: [...lines, `HỦY: script sửa tệp ngoài vùng cho phép: ${changes.blockedTracked.join(', ')}`] };
  }
  if (!gate.ok) {
    const failed = gate.results.find((r) => !r.pass);
    return { status: 'gate-red', lines: [...lines, `Cửa kiểm đỏ: ${failed?.name} — không mở PR. Worktree giữ ở ${dir} để xem.`] };
  }
  commit(dir, changes.allowed, `data(precedents): hs-agent J2 — ${records.length} tiền lệ từ vbpl.ts24 (${today()})`);
  if (dryRun) return { status: 'ok', lines: [...lines, `dry-run: đã commit ở ${branch}, không push.`] };

  const pushed = push(dir, branch);
  if (!pushed.ok) return { status: 'ship-blocked', lines: [...lines, `Chưa push được (${pushed.err.slice(0, 160)}) — kiểm deploy key.`] };
  const pr = await openPullRequest({
    branch,
    title: `data(precedents): hs-agent — ${records.length} tiền lệ mới từ vbpl.ts24 (${today()})`,
    body: [
      `Job J2 \`precedent-extract\` trên vps-hsagent. Nguồn: hàng đợi của J1 (vbpl.ts24.com.vn).`,
      '',
      '### Văn bản đã xử lý',
      ...docLines,
      '',
      '### Cửa kiểm',
      gateTable(gate),
      '',
      gate.soft ? '' : '⚠️ Cửa mềm (benchmark) đỏ — cần người xem trước khi merge.',
      '',
      '_Agent không merge. Người duyệt: mở từng url đối chiếu mã HS trước khi merge._',
    ].join('\n'),
    labels: gate.soft ? ['agent'] : ['agent', 'needs-review'],
  });
  return { status: pr.ok ? 'ok' : 'ship-blocked', lines: [...lines, pr.ok ? `PR: ${pr.url}` : `Đã push ${branch} nhưng chưa mở được PR (${pr.error}).`], pr: pr.url || null };
}
