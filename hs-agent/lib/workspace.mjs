// Git cho agent (§2.1 nguyên tắc 1–2):
//   - mỗi lần chạy làm trong worktree riêng, nhánh agent/<job>/<ngày-giờ>, tách từ origin/main
//   - chỉ stage tệp khớp danh sách cho phép; tệp ĐÃ theo dõi ngoài vùng bị sửa → hủy ship
//   - chỉ push refs/heads/agent/* — tên nhánh khác bị từ chối ngay trong code
import { spawnSync } from 'child_process';
import { existsSync, rmSync, symlinkSync } from 'fs';
import { join } from 'path';
import { REPO, WORK } from './paths.mjs';

export function git(args, { cwd = REPO, allowFail = false, timeoutMs = 120000 } = {}) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', timeout: timeoutMs, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
  if (r.status !== 0 && !allowFail) {
    throw new Error(`git ${args.join(' ')} → ${r.status}: ${(r.stderr || r.stdout || '').trim().slice(0, 400)}`);
  }
  return { ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}

export function stamp(d = new Date()) {
  return new Date(d.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 16).replace(/[-:T]/g, '').replace(/^(\d{8})(\d{4})$/, '$1-$2');
}

// Gốc của worktree. Chỉ đổi khi thử harness trên máy dev (HS_AGENT_BASE=HEAD).
const BASE = process.env.HS_AGENT_BASE || 'origin/main';

/** Tạo worktree mới từ origin/main. Trả { dir, branch }. */
export function prepareWorktree(job) {
  git(['fetch', '--quiet', 'origin', 'main'], { allowFail: true, timeoutMs: 180000 });
  const dir = join(WORK, job);
  if (existsSync(dir)) {
    git(['worktree', 'remove', '--force', dir], { allowFail: true });
    rmSync(dir, { recursive: true, force: true });
  }
  git(['worktree', 'prune']);
  const branch = `agent/${job}/${stamp()}`;
  git(['worktree', 'add', '--quiet', '-B', branch, dir, BASE]);
  // node_modules: dùng chung với bản clone chuẩn (nếu có) để npm test chạy được.
  const nm = join(REPO, 'node_modules');
  if (existsSync(nm) && !existsSync(join(dir, 'node_modules'))) symlinkSync(nm, join(dir, 'node_modules'), 'dir');
  return { dir, branch };
}

export function removeWorktree(dir) {
  git(['worktree', 'remove', '--force', dir], { allowFail: true });
}

function globToRe(glob) {
  const s = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*');
  return new RegExp(`^${s}$`);
}

export function matchAny(path, globs) {
  return globs.some((g) => globToRe(g).test(path));
}

/** Liệt kê thay đổi trong worktree, tách theo vùng cho phép. */
export function classifyChanges(dir, allow) {
  // -z: tách bằng NUL, không trích dẫn đường dẫn, không bị trim làm lệch cột "XY path".
  const r = spawnSync('git', ['status', '--porcelain', '-z', '--untracked-files=all'], { cwd: dir, encoding: 'utf8' });
  const allowed = [];
  const blockedTracked = [];
  const ignoredUntracked = [];
  const entries = (r.stdout || '').split('\0').filter(Boolean);
  for (let i = 0; i < entries.length; i += 1) {
    const e = entries[i];
    const code = e.slice(0, 2);
    const path = e.slice(3);
    if (code[0] === 'R' || code[0] === 'C') i += 1; // bản ghi đổi tên kèm đường dẫn cũ
    if (path === 'node_modules') continue;
    if (matchAny(path, allow)) allowed.push(path);
    else if (code === '??') ignoredUntracked.push(path);
    else blockedTracked.push(path);
  }
  return { allowed, blockedTracked, ignoredUntracked };
}

export function commit(dir, files, message) {
  if (!files.length) return false;
  git(['add', '--', ...files], { cwd: dir });
  git(['-c', 'user.name=hs-agent (vps-hsagent)', '-c', 'user.email=hs-agent@users.noreply.github.com', 'commit', '--quiet', '-m', message], { cwd: dir });
  return true;
}

export function push(dir, branch) {
  if (!/^agent\/[a-z0-9-]+\/[0-9-]+$/.test(branch)) throw new Error(`từ chối push nhánh "${branch}" — chỉ được agent/<job>/<ngày>`);
  return git(['push', '--quiet', 'origin', `HEAD:refs/heads/${branch}`], { cwd: dir, allowFail: true, timeoutMs: 180000 });
}

const GH_REPO = process.env.HS_GITHUB_REPO || 'ozvietnam/hs-code-api';

export async function github(path, { method = 'GET', body } = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return { ok: false, status: 0, json: { message: 'thiếu GITHUB_TOKEN' } };
  const res = await fetch(`https://api.github.com/repos/${GH_REPO}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'hs-agent', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { ok: res.ok, status: res.status, json: await res.json().catch(() => ({})) };
}

export async function openPullRequest({ branch, title, body, labels = ['agent'] }) {
  const r = await github('/pulls', { method: 'POST', body: { title, head: branch, base: 'main', body, draft: false } });
  if (r.ok && labels.length) await github(`/issues/${r.json.number}/labels`, { method: 'POST', body: { labels } });
  return r.ok ? { ok: true, url: r.json.html_url, number: r.json.number } : { ok: false, error: `${r.status} ${r.json.message || ''}`.trim() };
}
