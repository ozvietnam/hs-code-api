#!/usr/bin/env node
/**
 * scripts/quan-ly-skill.mjs — Công cụ tất định quản lý, nâng cấp từ tra-tho/QT,
 * kiểm tra an toàn và đồng bộ `.agents/{rules,agents,prompts,skills}` với plugin
 * cục bộ `oz-orchestrator`.
 *
 * Thuần Node ESM, không phụ thuộc gói ngoài, tương thích Linux CI & macOS/Windows.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_REPO_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_PLUGIN_DIR = '/Users/ozvietnamdesktop/.gemini/config/plugins/oz-orchestrator';
export const SYNC_SUBDIRS = ['rules', 'agents', 'prompts', 'skills'];

const RE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RE_HS_TOKEN = /\bHS_[A-Z][A-Z0-9_]*[A-Z0-9]\b/g;
const RE_PRIVATE_DATA = /(?:\boz-export\b|\boz-gold\b|(?:^|[\s`"'(,/=])\.keys\/|(?:^|[\s`"'(,/=])\.env(?:\.(?!example\b)[A-Za-z0-9_.-]+)?(?=$|[\s`"'),:;*]))/i;
const RE_PRIVATE_GUARD = /(?:never|forbidden|prohibit|avoid|keep\b[^\n;]*\bout of git|cấm|tuyệt đối không|không bao giờ|không được|không đọc|không chạm|không đụng|không sửa|không commit|không push|không chạy|không lộ|không lọt|không dùng|không sử dụng|không nhắc|bảo vệ|tránh|chống rò rỉ|zero\b|scan[^\n]*trace|withPrivateData|forbiddenFiles)/i;
const RE_DANGEROUS_GIT = /(?:\bgh\s+pr\s+merge\b|\bgit\s+push\b[^\n.;]*\bmain\b|\bpush\s+(?:thẳng|trực tiếp|directly)[^\n.;]*\bmain\b)/i;
const RE_DANGEROUS_GUARD = /(?:never|forbidden|prohibit|avoid|cấm|tuyệt đối không|không tự|không bao giờ|không được|không chạy|do not|don't|chặn|chống|zero\b|never self-merge)/i;

// ── CLI Parsing ─────────────────────────────────────────────────────────────────────────────────

export function parseArgs(argv) {
  const flags = {};
  const multi = {};
  for (let i = 0; i < argv.length; i += 1) {
    const tok = argv[i];
    if (!tok.startsWith('--')) continue;
    const eq = tok.indexOf('=');
    let key;
    let val;
    if (eq >= 0) {
      key = tok.slice(2, eq);
      val = tok.slice(eq + 1);
    } else {
      key = tok.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        val = next;
        i += 1;
      } else {
        val = true;
      }
    }
    flags[key] = val;
    if (!multi[key]) multi[key] = [];
    multi[key].push(val);
  }
  return { flags, multi };
}

// ── Lightweight YAML Frontmatter Parser ─────────────────────────────────────────────────────────

function stripQuotes(s) {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

export function parseFrontmatter(content) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(content);
  if (!m) return { ok: false, error: 'Thiếu hoặc sai cặp dấu YAML frontmatter `---`' };
  const rawYaml = m[1];
  const body = m[2];
  const lines = rawYaml.split(/\r?\n/);
  const data = {};

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || /^\s*#/.test(line)) {
      i += 1;
      continue;
    }
    const kv = /^([A-Za-z0-9_]+):(.*)$/.exec(line);
    if (!kv) {
      return { ok: false, error: `Dòng YAML frontmatter không hợp lệ: "${line}"` };
    }
    const key = kv[1];
    const rest = kv[2].trim();

    if (rest === '>-' || rest === '>' || rest === '|' || rest === '|-') {
      const chunks = [];
      i += 1;
      while (i < lines.length && (/^\s+/.test(lines[i]) || !lines[i].trim())) {
        chunks.push(lines[i].trim());
        i += 1;
      }
      data[key] = chunks.filter(Boolean).join(rest.startsWith('|') ? '\n' : ' ').trim();
      continue;
    }

    if (rest === '') {
      // Check if followed by list items (`  - ...`)
      const arr = [];
      let j = i + 1;
      let isList = false;
      while (j < lines.length) {
        if (!lines[j].trim()) { j += 1; continue; }
        const item = /^\s+-\s+(.*)$/.exec(lines[j]);
        if (item) {
          isList = true;
          arr.push(stripQuotes(item[1]));
          j += 1;
        } else {
          break;
        }
      }
      data[key] = isList ? arr : '';
      i = isList ? j : i + 1;
      continue;
    }

    if (rest.startsWith('[') && rest.endsWith(']')) {
      const inner = rest.slice(1, -1).trim();
      data[key] = inner
        ? inner.split(',').map((x) => stripQuotes(x)).filter(Boolean)
        : [];
      i += 1;
      continue;
    }

    if (rest === 'true') data[key] = true;
    else if (rest === 'false') data[key] = false;
    else data[key] = stripQuotes(rest);
    i += 1;
  }

  return { ok: true, data, rawYaml, body };
}

function escapeYamlString(str) {
  return JSON.stringify(String(str));
}

function normalizeText(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// ── File Walk & Copy Helpers ────────────────────────────────────────────────────────────────────

function pathLstat(p) {
  try {
    return fs.lstatSync(p);
  } catch {
    return null;
  }
}

function findSymlinksRecursive(rootDir) {
  const symlinks = [];
  const rootStat = pathLstat(rootDir);
  if (!rootStat) return symlinks;
  if (rootStat.isSymbolicLink()) {
    symlinks.push('.');
    return symlinks;
  }
  if (!rootStat.isDirectory()) return symlinks;

  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const ent of entries) {
      if (ent.name.startsWith('.DS_Store')) continue;
      const full = path.join(dir, ent.name);
      if (ent.isSymbolicLink()) {
        symlinks.push(path.relative(rootDir, full).split(path.sep).join('/'));
      } else if (ent.isDirectory()) {
        walk(full);
      }
    }
  };
  walk(rootDir);
  return symlinks;
}

function assertNoSymlinksInRelativePath(baseDir, relPath) {
  const baseStat = pathLstat(baseDir);
  if (baseStat && baseStat.isSymbolicLink()) {
    throw new Error(`Từ chối thao tác qua symlink: ${baseDir}`);
  }
  const parts = relPath.split('/').filter(Boolean);
  let cur = baseDir;
  for (const part of parts) {
    cur = path.join(cur, part);
    const st = pathLstat(cur);
    if (st && st.isSymbolicLink()) {
      throw new Error(`Từ chối ghi đè hoặc đọc qua symlink tại đích: ${cur}`);
    }
  }
}

function listFilesRecursive(rootDir) {
  const out = [];
  const rootStat = pathLstat(rootDir);
  if (!rootStat || rootStat.isSymbolicLink() || !rootStat.isDirectory()) return out;
  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const ent of entries) {
      if (ent.name.startsWith('.DS_Store')) continue;
      const full = path.join(dir, ent.name);
      if (ent.isSymbolicLink()) continue;
      if (ent.isDirectory()) walk(full);
      else if (ent.isFile()) out.push(path.relative(rootDir, full).split(path.sep).join('/'));
    }
  };
  walk(rootDir);
  return out;
}

// ── Authoring & Upgrading Commands ──────────────────────────────────────────────────────────────

function readJsonLesson(jsonPath) {
  const abs = path.resolve(jsonPath);
  return JSON.parse(fs.readFileSync(abs, 'utf8'));
}

export function createSkill({ repoDir = DEFAULT_REPO_DIR, ten, moTa, mucDich, dryRun = false }) {
  if (!ten || !RE_SLUG.test(ten)) {
    throw new Error(`Tên skill không hợp lệ (chỉ dùng chữ thường/số/gạch ngang): "${ten || ''}"`);
  }
  if (!moTa || !String(moTa).trim()) {
    throw new Error('Thiếu --mo-ta khi tạo skill mới.');
  }
  const skillDir = path.join(repoDir, '.agents', 'skills', ten);
  const skillPath = path.join(skillDir, 'SKILL.md');
  if (fs.existsSync(skillPath)) {
    throw new Error(`Skill "${ten}" đã tồn tại tại ${skillPath}. Dùng --cap-nhat-skill để nâng cấp.`);
  }
  const purposeText = (mucDich && String(mucDich).trim()) || String(moTa).trim();
  const content = [
    '---',
    `name: ${ten}`,
    `description: ${escapeYamlString(moTa.trim())}`,
    '---',
    '',
    `# Skill \`${ten}\``,
    '',
    '## 1. Mục đích & Phạm vi',
    '',
    purposeText,
    '',
    '- **Nhánh & Worktree:** Làm việc trên worktree cô lập `/Users/ozvietnamdesktop/Documents/Claude/Projects/hs-code-api-wt/<slug>` với nhánh `agy/...` tách sạch từ `origin/main`.',
    '- **An toàn:** Không sửa đường khách L1 (`api/`, `lib/`, `data/prompts/`, `lib/llm-tier.js`, `lib/llm.mjs`), không lộ dữ liệu riêng tư (`data/oz-export/*`, `oz-gold*`, `.env`), tuyệt đối không chạy `gh pr merge` hay push thẳng lên `main`.',
    '',
    '---',
    '',
    '## 2. Quy tắc & Bài học thực tế',
    '',
    '*(Các luật mới rút ra từ lỗi `tra-tho` hoặc nhận xét của QT sẽ được nối tiếp dưới dạng `### Luật N — ...`.)*',
    '',
    '---',
    '',
    '## 3. Lệnh tự kiểm trước khi nộp',
    '',
    '```bash',
    'node scripts/quan-ly-skill.mjs --kiem',
    'node scripts/test-quan-ly-skill.mjs',
    '```',
    '',
  ].join('\n');

  if (!dryRun) {
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(skillPath, content, 'utf8');
  }
  return { skillPath, created: !dryRun, dryRun };
}

export function upgradeSkill({
  repoDir = DEFAULT_REPO_DIR,
  ten,
  luatTieuDe,
  quyTac,
  pr,
  viDu,
  dryRun = false,
}) {
  if (!ten || !RE_SLUG.test(ten)) {
    throw new Error(`Tên skill không hợp lệ: "${ten || ''}"`);
  }
  if (!luatTieuDe || !String(luatTieuDe).trim()) {
    throw new Error('Thiếu --luat-tieu-de khi cập nhật skill.');
  }
  if (!quyTac || !String(quyTac).trim()) {
    throw new Error('Thiếu --quy-tac khi cập nhật skill.');
  }
  const skillPath = path.join(repoDir, '.agents', 'skills', ten, 'SKILL.md');
  if (!fs.existsSync(skillPath)) {
    throw new Error(`Không tìm thấy skill "${ten}" tại ${skillPath}. Hãy tạo bằng --tao-skill trước.`);
  }

  const original = fs.readFileSync(skillPath, 'utf8');
  const titleClean = String(luatTieuDe).trim();
  const ruleClean = String(quyTac).trim();
  const prClean = pr ? String(pr).trim() : '';
  const exClean = viDu ? String(viDu).trim() : '';

  const ruleMatches = [...original.matchAll(/^### Luật (\d+)\s*[—–-]\s*(.+)$/gm)];
  const maxNum = ruleMatches.reduce((m, x) => Math.max(m, Number(x[1])), 0);
  const existing = ruleMatches.find((x) => normalizeText(x[2]) === normalizeText(titleClean));

  const buildExampleLine = () => {
    if (prClean && exClean) return `  - ${prClean}: ${exClean}`;
    if (exClean) return `  - ${exClean}`;
    if (prClean) return `  - ${prClean}`;
    return '';
  };

  if (existing) {
    // Idempotent update in place
    const startIdx = existing.index;
    const afterStart = original.slice(startIdx);
    const nextMatch = /\n(?:### Luật \d+|## \d*\.?|---(?:\r?\n|$))/.exec(afterStart.slice(1));
    const endIdx = nextMatch ? startIdx + 1 + nextMatch.index : original.length;
    const block = original.slice(startIdx, endIdx);

    let updatedBlock = block;
    // Update rule line if changed (callback avoids $& / $$ / $1 replacement expansion)
    if (/^- \*\*Quy tắc:\*\* .*$/m.test(updatedBlock)) {
      updatedBlock = updatedBlock.replace(/^- \*\*Quy tắc:\*\* .*$/m, () => `- **Quy tắc:** ${ruleClean}`);
    } else {
      updatedBlock = `${updatedBlock.trimEnd()}\n- **Quy tắc:** ${ruleClean}\n`;
    }

    const exLine = buildExampleLine();
    if (exLine) {
      const normalizedEx = normalizeText(exLine);
      const alreadyHasEx = updatedBlock.split('\n').some((l) => normalizeText(l) === normalizedEx);
      if (!alreadyHasEx) {
        if (/^- \*\*Lỗi cấm.*$/m.test(updatedBlock)) {
          updatedBlock = `${updatedBlock.trimEnd()}\n${exLine}\n`;
        } else {
          updatedBlock = `${updatedBlock.trimEnd()}\n- **Lỗi cấm (PR thật / nhận xét QT):**\n${exLine}\n`;
        }
      }
    }
    if (!updatedBlock.endsWith('\n')) updatedBlock += '\n';

    const nextContent = original.slice(0, startIdx) + updatedBlock + original.slice(endIdx);
    if (!dryRun && nextContent !== original) fs.writeFileSync(skillPath, nextContent, 'utf8');
    return { skillPath, updated: nextContent !== original, ruleNumber: Number(existing[1]), dryRun };
  }

  const nextNum = maxNum + 1;
  const lines = [
    `### Luật ${nextNum} — ${titleClean}`,
    `- **Quy tắc:** ${ruleClean}`,
  ];
  const exLine = buildExampleLine();
  if (exLine) {
    lines.push('- **Lỗi cấm (PR thật / nhận xét QT):**');
    lines.push(exLine);
  }
  const newBlock = `\n${lines.join('\n')}\n`;

  // Insert into Section 2 (before `## 3.` or before trailing `---` after section 2) or append cleanly
  let nextContent;
  const sec3Match = /\n(?:---\s*\n+)?##\s+(?:3\.|Các Bước|Quy trình|Lệnh)/i.exec(original);
  const placeholder = /\n\*\(Các luật mới rút ra[\s\S]*?\*\)\s*\n/;
  if (placeholder.test(original)) {
    nextContent = original.replace(placeholder, () => `${newBlock}\n`);
  } else if (sec3Match) {
    const pos = sec3Match.index;
    nextContent = `${original.slice(0, pos).trimEnd()}\n${newBlock}\n${original.slice(pos).replace(/^\n+/, '')}`;
  } else {
    nextContent = `${original.trimEnd()}\n${newBlock}`;
  }

  if (!dryRun) fs.writeFileSync(skillPath, nextContent, 'utf8');
  return { skillPath, updated: true, ruleNumber: nextNum, dryRun };
}

export function createPrompt({
  repoDir = DEFAULT_REPO_DIR,
  ten,
  vaiTro,
  skills = [],
  worktreePattern = '/Users/ozvietnamdesktop/Documents/Claude/Projects/hs-code-api-wt/<slug>',
  allowedFiles = ['.agents/**'],
  forbiddenFiles = ['api/**', 'lib/**', 'data/prompts/**', 'lib/llm-tier.js', 'lib/llm.mjs', 'data/oz-export/**', 'oz-gold*', '.env'],
  gates = ['node scripts/quan-ly-skill.mjs --kiem', 'node scripts/dem-ca-test.mjs <log>'],
  updatedFrom = [],
  dryRun = false,
}) {
  if (!ten || !RE_SLUG.test(ten)) {
    throw new Error(`Tên lời nhắc chú ong không hợp lệ: "${ten || ''}"`);
  }
  if (!vaiTro || !String(vaiTro).trim()) {
    throw new Error('Thiếu --vai-tro khi tạo lời nhắc chú ong.');
  }
  const skillList = (Array.isArray(skills) ? skills : [skills])
    .flatMap((s) => String(s || '').split(','))
    .map((s) => s.trim())
    .filter(Boolean);
  if (!skillList.length) skillList.push('oz-hs-code-ops');

  const promptDir = path.join(repoDir, '.agents', 'prompts');
  const promptPath = path.join(promptDir, `${ten}.md`);
  if (fs.existsSync(promptPath)) {
    throw new Error(`Lời nhắc "${ten}" đã tồn tại tại ${promptPath}. Dùng --cap-nhat-loi-nhac.`);
  }

  const fmtArr = (key, arr) =>
    arr.length ? `${key}:\n${arr.map((x) => `  - ${escapeYamlString(x)}`).join('\n')}` : `${key}: []`;
  const fmtPlainArr = (key, arr) =>
    arr.length ? `${key}:\n${arr.map((x) => `  - ${x}`).join('\n')}` : `${key}: []`;

  const content = [
    '---',
    `name: ${ten}`,
    `role: ${vaiTro.trim()}`,
    fmtPlainArr('skills', skillList),
    `worktreePattern: ${escapeYamlString(worktreePattern)}`,
    fmtArr('allowedFiles', allowedFiles),
    fmtArr('forbiddenFiles', forbiddenFiles),
    fmtArr('gates', gates),
    fmtArr('updatedFrom', updatedFrom),
    '---',
    '',
    `# Chú Ong ${ten} (\`${ten}\`)`,
    '',
    '## Nhiệm vụ & Kích hoạt',
    `- Vai trò: \`${vaiTro.trim()}\`. Tự động kích hoạt khi được \`ong-dieu-phoi\` giao lát việc độc lập trên worktree cô lập.`,
    `- Nạp đủ các skill được khai báo trong frontmatter (${skillList.map((s) => `\`${s}\``).join(', ')}) trước khi sửa tệp.`,
    '',
    '## Quy trình thực hiện',
    '1. Dựng hoặc mở worktree cô lập theo `worktreePattern` từ `origin/main` mới nhất (`agy/...`), nối symlink `node_modules`.',
    '2. Chỉ chỉnh sửa các tệp khớp `allowedFiles`, tuyệt đối không chạm `forbiddenFiles`.',
    '3. Chạy đủ cổng kiểm trong `gates`, xuất log kiểm chứng qua `node scripts/dem-ca-test.mjs <log>` và chờ `oz-pr-auditor` đánh giá `ĐẠT`.',
    '',
    '## Luật bắt buộc & Checklist tự kiểm',
    '- **Cấm chạm vùng cấm:** Không đụng nhánh `mong/*`, `/Users/ozvietnamdesktop/oz-work/*`, đường khách L1 hoặc dữ liệu riêng tư (`data/oz-export/*`, `oz-gold*`, `.env`).',
    '- **Cấm tự `gh pr merge` hoặc push thẳng lên `main`:** Chỉ mở/cập nhật PR từ nhánh `agy/...` và không tự merge.',
    '',
    '## Lệnh cổng kiểm & Bằng chứng',
    '```bash',
    ...gates,
    '```',
    '',
  ].join('\n');

  if (!dryRun) {
    fs.mkdirSync(promptDir, { recursive: true });
    fs.writeFileSync(promptPath, content, 'utf8');
  }
  return { promptPath, created: !dryRun, dryRun };
}

function updateYamlListField(rawYaml, fieldName, newItem) {
  if (!newItem) return rawYaml;
  const itemClean = String(newItem).trim();
  const lines = rawYaml.split(/\r?\n/);
  const idx = lines.findIndex((l) => new RegExp(`^${fieldName}:`).test(l));
  if (idx < 0) {
    lines.push(`${fieldName}:`, `  - ${escapeYamlString(itemClean)}`);
    return lines.join('\n');
  }

  const headerLine = lines[idx];
  const rest = headerLine.slice(fieldName.length + 1).trim();

  if (rest.startsWith('[') && rest.endsWith(']')) {
    const inner = rest.slice(1, -1).trim();
    const arr = inner ? inner.split(',').map((x) => stripQuotes(x)).filter(Boolean) : [];
    if (arr.some((x) => normalizeText(x) === normalizeText(itemClean))) return rawYaml;
    arr.push(itemClean);
    const replacement = [`${fieldName}:`, ...arr.map((x) => `  - ${escapeYamlString(x)}`)];
    lines.splice(idx, 1, ...replacement);
    return lines.join('\n');
  }

  // Block list
  let end = idx + 1;
  const existing = [];
  while (end < lines.length) {
    const m = /^\s+-\s+(.*)$/.exec(lines[end]);
    if (m) {
      existing.push(stripQuotes(m[1]));
      end += 1;
    } else if (!lines[end].trim()) {
      end += 1;
    } else {
      break;
    }
  }
  if (existing.some((x) => normalizeText(x) === normalizeText(itemClean))) return rawYaml;
  lines.splice(end, 0, `  - ${escapeYamlString(itemClean)}`);
  return lines.join('\n');
}

export function upgradePrompt({
  repoDir = DEFAULT_REPO_DIR,
  ten,
  quyTac,
  nguon,
  dryRun = false,
}) {
  if (!ten || !RE_SLUG.test(ten)) {
    throw new Error(`Tên lời nhắc chú ong không hợp lệ: "${ten || ''}"`);
  }
  if (!quyTac || !String(quyTac).trim()) {
    throw new Error('Thiếu --quy-tac khi cập nhật lời nhắc chú ong.');
  }
  const promptPath = path.join(repoDir, '.agents', 'prompts', `${ten}.md`);
  if (!fs.existsSync(promptPath)) {
    throw new Error(`Không tìm thấy lời nhắc "${ten}" tại ${promptPath}.`);
  }

  const original = fs.readFileSync(promptPath, 'utf8');
  const parsed = parseFrontmatter(original);
  if (!parsed.ok) throw new Error(`Frontmatter lỗi tại ${promptPath}: ${parsed.error}`);

  const ruleClean = String(quyTac).trim();
  const srcClean = nguon ? String(nguon).trim() : '';

  const nextYaml = srcClean
    ? updateYamlListField(parsed.rawYaml, 'updatedFrom', srcClean)
    : parsed.rawYaml;

  const bulletLine = srcClean ? `- **[${srcClean}]** ${ruleClean}` : `- ${ruleClean}`;
  let nextBody = parsed.body;

  const secRegex = /(^##\s+Luật bắt buộc[^\n]*\n)([\s\S]*?)(?=\n##\s+|(?![\s\S]))/m;
  const secMatch = secRegex.exec(nextBody);

  // Compare normalized checklist bullet rule text (stripping `- **[#ref]** ` prefix) inside the checklist section
  const normTarget = normalizeText(ruleClean);
  const stripChecklistBullet = (line) => {
    const m = /^\s*[-*]\s+(?:\*\*\[[^\]]+\]\*\*\s*)?(.*)$/.exec(line);
    return m ? normalizeText(m[1]) : null;
  };
  const alreadyPresent = secMatch
    ? secMatch[2]
        .split(/\r?\n/)
        .map(stripChecklistBullet)
        .some((item) => item !== null && item === normTarget)
    : false;

  if (!alreadyPresent) {
    if (secMatch) {
      const insertPos = secMatch.index + secMatch[0].length;
      const prefix = nextBody.slice(0, insertPos).trimEnd();
      const suffix = nextBody.slice(insertPos);
      nextBody = `${prefix}\n${bulletLine}\n${suffix.replace(/^\n+/, '\n')}`;
    } else {
      nextBody = `${nextBody.trimEnd()}\n\n## Luật bắt buộc & Checklist tự kiểm\n${bulletLine}\n`;
    }
  }

  const nextContent = `---\n${nextYaml}\n---\n${nextBody}`;
  if (!dryRun && nextContent !== original) fs.writeFileSync(promptPath, nextContent, 'utf8');
  return { promptPath, updated: nextContent !== original, dryRun };
}

// ── Validation (`--kiem`) ───────────────────────────────────────────────────────────────────────

export function validateRepo({
  repoDir = DEFAULT_REPO_DIR,
  pluginDir = DEFAULT_PLUGIN_DIR,
  batBuocPlugin = false,
}) {
  const errors = [];
  const warnings = [];
  const checkedFiles = [];

  const agentsRoot = path.join(repoDir, '.agents');
  if (!fs.existsSync(agentsRoot)) {
    return { ok: false, errors: [`Thiếu thư mục ${agentsRoot}`], warnings, checkedFiles };
  }

  for (const sym of findSymlinksRecursive(agentsRoot)) {
    errors.push(`.agents/${sym === '.' ? '' : sym}: Cấm symlink bên trong .agents/`);
  }

  // Load allowed HS_* flags from data/luat/bang-co.json
  const bangCoPath = path.join(repoDir, 'data', 'luat', 'bang-co.json');
  const allowedFlags = new Set();
  if (!fs.existsSync(bangCoPath)) {
    errors.push(`Thiếu tệp bảng cờ ${bangCoPath}`);
  } else {
    const bangCo = JSON.parse(fs.readFileSync(bangCoPath, 'utf8'));
    for (const c of bangCo.co || []) allowedFlags.add(c.ten);
    for (const k of Object.keys(bangCo.tenNgoaiMa?.ten || {})) allowedFlags.add(k);
  }

  const checkSafety = (relPath, content, fm = null) => {
    const fmMatch = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(content);
    const fmLineCount = fmMatch ? fmMatch[0].split(/\r?\n/).length - 1 : 0;
    const lines = content.split(/\r?\n/);
    let currentYamlKey = '';

    // Build logical lines joining trailing backslash continuations (`\\\n`) outside frontmatter
    const logicalLines = [];
    for (let idx = 0; idx < lines.length; idx += 1) {
      const startIdx = idx;
      let combined = lines[idx];
      const inFrontmatter = startIdx < fmLineCount;
      if (inFrontmatter) {
        const kv = /^([A-Za-z0-9_]+):/.exec(lines[idx]);
        if (kv) currentYamlKey = kv[1];
      }
      const yamlKeyAtStart = currentYamlKey;
      while (!inFrontmatter && /\\\s*$/.test(combined) && idx + 1 < lines.length) {
        idx += 1;
        combined = `${combined.replace(/\\\s*$/, ' ')}${lines[idx].trimStart()}`;
      }
      logicalLines.push({ lineNo: startIdx + 1, text: combined, inFrontmatter, yamlKey: yamlKeyAtStart });
    }

    const reportedDangerousLines = new Set();
    for (const entry of logicalLines) {
      const { lineNo, text: line, inFrontmatter, yamlKey } = entry;
      // 1. Undeclared HS_* tokens
      for (const m of line.matchAll(RE_HS_TOKEN)) {
        const token = m[0];
        const tail = line.slice(m.index + token.length, m.index + token.length + 3);
        if ([...allowedFlags].some((k) => k.startsWith(`${token}_`)) && /^(_\*|\*|…|\.\.\.)/.test(tail)) {
          continue;
        }
        if (!allowedFlags.has(token)) {
          errors.push(`${relPath}:${lineNo}: Nhắc cờ "${token}" chưa khai báo trong data/luat/bang-co.json`);
        }
      }
      // 2. Private customer data paths outside explicit prohibition/guard lines or YAML forbiddenFiles
      if (RE_PRIVATE_DATA.test(line)) {
        const safeYamlForbidden = inFrontmatter && yamlKey === 'forbiddenFiles';
        if (!safeYamlForbidden && !RE_PRIVATE_GUARD.test(line)) {
          errors.push(`${relPath}:${lineNo}: Tham chiếu dữ liệu riêng tư ngoài ngữ cảnh cấm/bảo vệ`);
        }
      }
      // 3. Dangerous git merge/push commands outside explicit prohibition lines
      if (RE_DANGEROUS_GIT.test(line) && !RE_DANGEROUS_GUARD.test(line)) {
        reportedDangerousLines.add(lineNo);
        errors.push(`${relPath}:${lineNo}: Chứa chỉ dẫn cho phép tự gộp PR hoặc push thẳng main ngoài ngữ cảnh cấm`);
      }
    }

    // 4. Multi-line command/prose chunks without trailing backslash (e.g., `git push origin\nmain`)
    let chunkStart = 0;
    let chunkParts = [];
    const flushChunk = () => {
      if (chunkParts.length > 1) {
        const joined = chunkParts.join(' ');
        if (
          !reportedDangerousLines.has(chunkStart)
          && RE_DANGEROUS_GIT.test(joined)
          && !RE_DANGEROUS_GUARD.test(joined)
        ) {
          errors.push(`${relPath}:${chunkStart}: Chứa chỉ dẫn đa dòng cho phép tự gộp PR hoặc push thẳng main ngoài ngữ cảnh cấm`);
        }
      }
      chunkStart = 0;
      chunkParts = [];
    };
    for (const entry of logicalLines) {
      if (entry.inFrontmatter) continue;
      const t = entry.text.trim();
      if (!t || /^```/.test(t) || /^(?:#+ |[-*] |\d+\. )/.test(entry.text)) {
        flushChunk();
        continue;
      }
      if (!chunkParts.length) chunkStart = entry.lineNo;
      chunkParts.push(t);
      if (/[.;!?]$/.test(t)) flushChunk();
    }
    flushChunk();

    const fmData = fm?.data;
    if (fmData) {
      if (fmData.autoMerge === true) errors.push(`${relPath}: frontmatter cấm autoMerge: true`);
      if (fmData.mainAgent === true) errors.push(`${relPath}: frontmatter cấm mainAgent: true`);
      if (Array.isArray(fmData.allowedFiles)) {
        for (const af of fmData.allowedFiles) {
          if (RE_PRIVATE_DATA.test(af)) {
            errors.push(`${relPath}: allowedFiles không được phép chứa vùng dữ liệu riêng tư (${af})`);
          }
        }
      }
    }
  };

  // 1. Check .agents/rules/AGENTS.md
  const rulesPath = path.join(agentsRoot, 'rules', 'AGENTS.md');
  if (!fs.existsSync(rulesPath)) {
    errors.push('Thiếu .agents/rules/AGENTS.md');
  } else {
    const rel = '.agents/rules/AGENTS.md';
    const content = fs.readFileSync(rulesPath, 'utf8');
    checkedFiles.push(rel);
    if (!/^#\s+\S/m.test(content)) errors.push(`${rel}: thiếu tiêu đề H1`);
    for (let sec = 1; sec <= 8; sec += 1) {
      if (!new RegExp(`^##\\s+${sec}\\.`, 'm').test(content)) {
        errors.push(`${rel}: thiếu mục "## ${sec}."`);
      }
    }
    if (!/hs-code-api-wt/i.test(content) || !/song song|parallel/i.test(content)) {
      errors.push(`${rel}: Mục 7 (R1) thiếu quy tắc worktree cô lập hs-code-api-wt / teamwork song song`);
    }
    if (!/quan-ly-skill\.mjs/i.test(content) || !/oz-orchestrator/i.test(content)) {
      errors.push(`${rel}: Mục 8 (R2) thiếu quy tắc scripts/quan-ly-skill.mjs & đồng bộ oz-orchestrator`);
    }
    checkSafety(rel, content);
  }

  // 2. Check .agents/agents/*.md
  const agentsDir = path.join(agentsRoot, 'agents');
  if (!fs.existsSync(path.join(agentsDir, 'oz-pr-auditor.md'))) {
    errors.push('Thiếu .agents/agents/oz-pr-auditor.md');
  }
  if (fs.existsSync(agentsDir)) {
    for (const f of fs.readdirSync(agentsDir).filter((x) => x.endsWith('.md')).sort()) {
      const rel = `.agents/agents/${f}`;
      const stem = f.replace(/\.md$/, '');
      const content = fs.readFileSync(path.join(agentsDir, f), 'utf8');
      checkedFiles.push(rel);
      const fm = parseFrontmatter(content);
      if (!fm.ok) {
        errors.push(`${rel}: ${fm.error}`);
      } else {
        if (fm.data.name !== stem) errors.push(`${rel}: frontmatter name="${fm.data.name}" phải khớp "${stem}"`);
        if (!String(fm.data.description || '').trim()) errors.push(`${rel}: thiếu description`);
        if (!Array.isArray(fm.data.tools) || fm.data.tools.length === 0) errors.push(`${rel}: thiếu mảng tools`);
        if (!/^#\s+\S/m.test(fm.body)) errors.push(`${rel}: thiếu tiêu đề H1`);
        if ((fm.body.match(/^##\s+\S/gm) || []).length < 2) errors.push(`${rel}: cần ít nhất 2 mục H2`);
        checkSafety(rel, content, fm);
      }
    }
  }

  // 3. Check .agents/prompts/*.md
  const promptsDir = path.join(agentsRoot, 'prompts');
  if (!fs.existsSync(promptsDir)) {
    errors.push('Thiếu thư mục .agents/prompts');
  } else {
    const promptFiles = fs.readdirSync(promptsDir).filter((x) => x.endsWith('.md')).sort();
    if (promptFiles.length === 0) errors.push('.agents/prompts/ không có tệp lời nhắc nào');
    for (const f of promptFiles) {
      const rel = `.agents/prompts/${f}`;
      const stem = f.replace(/\.md$/, '');
      const content = fs.readFileSync(path.join(promptsDir, f), 'utf8');
      checkedFiles.push(rel);
      const fm = parseFrontmatter(content);
      if (!fm.ok) {
        errors.push(`${rel}: ${fm.error}`);
      } else {
        const d = fm.data;
        if (d.name !== stem) errors.push(`${rel}: frontmatter name="${d.name}" phải khớp "${stem}"`);
        if (!String(d.role || '').trim()) errors.push(`${rel}: thiếu role`);
        if (!Array.isArray(d.skills) || d.skills.length === 0) errors.push(`${rel}: thiếu mảng skills`);
        if (!String(d.worktreePattern || '').trim()) errors.push(`${rel}: thiếu worktreePattern`);
        if (!Array.isArray(d.allowedFiles)) errors.push(`${rel}: thiếu mảng allowedFiles`);
        if (!Array.isArray(d.forbiddenFiles) || d.forbiddenFiles.length === 0) errors.push(`${rel}: thiếu mảng forbiddenFiles`);
        if (!Array.isArray(d.gates) || d.gates.length === 0) errors.push(`${rel}: thiếu mảng gates`);
        if (!Array.isArray(d.updatedFrom)) errors.push(`${rel}: thiếu mảng updatedFrom`);

        if (!/^#\s+\S/m.test(fm.body)) errors.push(`${rel}: thiếu tiêu đề H1`);
        if (!/^##\s+Nhiệm vụ & Kích hoạt/m.test(fm.body)) errors.push(`${rel}: thiếu mục "## Nhiệm vụ & Kích hoạt"`);
        if (!/^##\s+Luật bắt buộc & Checklist tự kiểm/m.test(fm.body)) errors.push(`${rel}: thiếu mục "## Luật bắt buộc & Checklist tự kiểm"`);
        if (!/^##\s+Lệnh cổng kiểm & Bằng chứng/m.test(fm.body)) errors.push(`${rel}: thiếu mục "## Lệnh cổng kiểm & Bằng chứng"`);
        checkSafety(rel, content, fm);
      }
    }
  }

  // 4. Check .agents/skills/*/SKILL.md
  const skillsDir = path.join(agentsRoot, 'skills');
  if (!fs.existsSync(skillsDir)) {
    errors.push('Thiếu thư mục .agents/skills');
  } else {
    const dirs = fs.readdirSync(skillsDir, { withFileTypes: true }).filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));
    if (dirs.length === 0) errors.push('.agents/skills/ không có skill nào');
    for (const dir of dirs) {
      const slug = dir.name;
      const skillFile = path.join(skillsDir, slug, 'SKILL.md');
      const rel = `.agents/skills/${slug}/SKILL.md`;
      if (!fs.existsSync(skillFile)) {
        errors.push(`Thiếu ${rel}`);
        continue;
      }
      const content = fs.readFileSync(skillFile, 'utf8');
      checkedFiles.push(rel);
      const fm = parseFrontmatter(content);
      if (!fm.ok) {
        errors.push(`${rel}: ${fm.error}`);
      } else {
        if (fm.data.name !== slug) errors.push(`${rel}: frontmatter name="${fm.data.name}" phải khớp thư mục "${slug}"`);
        if (!String(fm.data.description || '').trim()) errors.push(`${rel}: thiếu description`);
        if (!/^#\s+\S/m.test(fm.body)) errors.push(`${rel}: thiếu tiêu đề H1`);
        if ((fm.body.match(/^##\s+\S/gm) || []).length < 2) errors.push(`${rel}: cần ít nhất 2 mục H2`);
        checkSafety(rel, content, fm);
      }
    }
  }

  // 4b. Scan all remaining text/markdown/script files under .agents/{rules,agents,prompts,skills}
  const checkedSet = new Set(checkedFiles);
  for (const sub of SYNC_SUBDIRS) {
    const subDir = path.join(agentsRoot, sub);
    for (const rf of listFilesRecursive(subDir)) {
      const rel = `.agents/${sub}/${rf}`;
      if (checkedSet.has(rel)) continue;
      checkedSet.add(rel);
      checkedFiles.push(rel);
      const buf = fs.readFileSync(path.join(subDir, rf));
      if (!buf.includes(0)) {
        const content = buf.toString('utf8');
        const fm = parseFrontmatter(content);
        checkSafety(rel, content, fm.ok ? fm : null);
      }
    }
  }

  // 5. Parity check with pluginDir
  let pluginChecked = false;
  const plugRootStat = pluginDir ? pathLstat(pluginDir) : null;
  if (plugRootStat && plugRootStat.isSymbolicLink()) {
    errors.push(`Thư mục plugin là symlink, cấm theo sau: ${pluginDir}`);
  } else if (pluginDir && fs.existsSync(pluginDir)) {
    pluginChecked = true;
    for (const sub of SYNC_SUBDIRS) {
      const repoSub = path.join(agentsRoot, sub);
      const plugSub = path.join(pluginDir, sub);
      for (const sym of findSymlinksRecursive(plugSub)) {
        errors.push(`Symlink không hợp lệ trong plugin (${pluginDir}/${sub}/${sym})`);
      }
      const repoFiles = new Set(listFilesRecursive(repoSub));
      const plugFiles = new Set(listFilesRecursive(plugSub));

      for (const rf of repoFiles) {
        const src = path.join(repoSub, rf);
        const dst = path.join(plugSub, rf);
        const dstStat = pathLstat(dst);
        if (dstStat && dstStat.isSymbolicLink()) {
          errors.push(`Lệch plugin (${sub}/${rf}): đích là symlink, cấm theo sau (${dst})`);
          continue;
        }
        if (!dstStat) {
          errors.push(`Lệch plugin (${sub}/${rf}): thiếu trong ${pluginDir}`);
          continue;
        }
        if (Buffer.compare(fs.readFileSync(src), fs.readFileSync(dst)) !== 0) {
          errors.push(`Lệch nội dung byte-for-byte giữa .agents/${sub}/${rf} và ${pluginDir}/${sub}/${rf}`);
        }
      }
      for (const pf of plugFiles) {
        if (!repoFiles.has(pf)) {
          errors.push(`Thừa tệp trong plugin (${pluginDir}/${sub}/${pf}) không có ở .agents/${sub}/${pf}`);
        }
      }
    }
  } else if (batBuocPlugin) {
    errors.push(`Bắt buộc kiểm tra đồng bộ nhưng thư mục plugin không tồn tại: ${pluginDir}`);
  } else {
    warnings.push(`SKIP parity check: plugin-dir không tồn tại tại ${pluginDir}`);
  }

  return { ok: errors.length === 0, errors, warnings, checkedFiles, pluginChecked };
}

// ── Sync (`--dong-bo`) ──────────────────────────────────────────────────────────────────────────

export function syncPlugin({
  repoDir = DEFAULT_REPO_DIR,
  pluginDir = DEFAULT_PLUGIN_DIR,
  dryRun = false,
}) {
  const agentsRoot = path.join(repoDir, '.agents');
  if (!fs.existsSync(agentsRoot)) {
    throw new Error(`Thiếu thư mục ${agentsRoot}`);
  }
  const repoSymlinks = findSymlinksRecursive(agentsRoot);
  if (repoSymlinks.length > 0) {
    throw new Error(`Phát hiện symlink không hợp lệ trong .agents/: ${repoSymlinks.join(', ')}`);
  }
  const plugRootStat = pathLstat(pluginDir);
  if (plugRootStat && plugRootStat.isSymbolicLink()) {
    throw new Error(`Từ chối đồng bộ vì pluginDir là symlink: ${pluginDir}`);
  }

  const copied = [];
  const unchanged = [];
  const removed = [];

  for (const sub of SYNC_SUBDIRS) {
    const repoSub = path.join(agentsRoot, sub);
    const plugSub = path.join(pluginDir, sub);
    const plugSymlinks = findSymlinksRecursive(plugSub);
    if (plugSymlinks.length > 0) {
      throw new Error(`Từ chối ghi đè hoặc theo sau symlink trong plugin (${plugSub}): ${plugSymlinks.join(', ')}`);
    }

    const repoFiles = listFilesRecursive(repoSub);
    const repoSet = new Set(repoFiles);

    for (const rel of repoFiles) {
      const src = path.join(repoSub, rel);
      const dst = path.join(plugSub, rel);
      assertNoSymlinksInRelativePath(plugSub, rel);
      const srcBuf = fs.readFileSync(src);
      const dstStat = pathLstat(dst);
      const same = Boolean(dstStat && dstStat.isFile()) && Buffer.compare(srcBuf, fs.readFileSync(dst)) === 0;
      if (same) {
        unchanged.push(`${sub}/${rel}`);
      } else {
        copied.push(`${sub}/${rel}`);
        if (!dryRun) {
          fs.mkdirSync(path.dirname(dst), { recursive: true });
          fs.writeFileSync(dst, srcBuf);
        }
      }
    }

    for (const prel of listFilesRecursive(plugSub)) {
      if (!repoSet.has(prel)) {
        removed.push(`${sub}/${prel}`);
        if (!dryRun) {
          fs.rmSync(path.join(plugSub, prel), { force: true });
        }
      }
    }
  }

  return { pluginDir, dryRun, copied, unchanged, removed };
}

// ── Main CLI Runner ─────────────────────────────────────────────────────────────────────────────

function main() {
  const { flags, multi } = parseArgs(process.argv.slice(2));
  const repoDir = flags['repo-dir'] ? path.resolve(flags['repo-dir']) : DEFAULT_REPO_DIR;
  const pluginDir = flags['plugin-dir'] ? path.resolve(flags['plugin-dir']) : DEFAULT_PLUGIN_DIR;
  const dryRun = Boolean(flags['dry-run']);
  const lesson = flags['tu-json'] ? readJsonLesson(flags['tu-json']) : null;

  let ranAction = false;

  if (flags['tao-skill']) {
    ranAction = true;
    const res = createSkill({
      repoDir,
      ten: flags.ten || lesson?.skill || lesson?.ten,
      moTa: flags['mo-ta'] || lesson?.moTa,
      mucDich: flags['muc-dich'] || lesson?.mucDich,
      dryRun,
    });
    console.log(`PASS tao-skill${res.dryRun ? ' (DRY_RUN)' : ''}: ${path.relative(repoDir, res.skillPath)}`);
  }

  if (flags['cap-nhat-skill']) {
    ranAction = true;
    const res = upgradeSkill({
      repoDir,
      ten: flags.ten || lesson?.skill || lesson?.ten,
      luatTieuDe: flags['luat-tieu-de'] || lesson?.luatTieuDe,
      quyTac: flags['quy-tac'] || lesson?.quyTac,
      pr: flags.pr || lesson?.pr,
      viDu: flags['vi-du'] || lesson?.viDu,
      dryRun,
    });
    console.log(`PASS cap-nhat-skill${res.dryRun ? ' (DRY_RUN)' : ''}: ${path.relative(repoDir, res.skillPath)} (Luật ${res.ruleNumber}, changed=${res.updated})`);
  }

  if (flags['tao-loi-nhac']) {
    ranAction = true;
    const res = createPrompt({
      repoDir,
      ten: flags.ten || lesson?.loiNhac || lesson?.bee || lesson?.ten,
      vaiTro: flags['vai-tro'] || lesson?.vaiTro || lesson?.role,
      skills: multi.skill || lesson?.skills,
      worktreePattern: lesson?.worktreePattern,
      allowedFiles: lesson?.allowedFiles,
      forbiddenFiles: lesson?.forbiddenFiles,
      gates: lesson?.gates,
      updatedFrom: lesson?.updatedFrom || (lesson?.nguon ? [lesson.nguon] : []),
      dryRun,
    });
    console.log(`PASS tao-loi-nhac${res.dryRun ? ' (DRY_RUN)' : ''}: ${path.relative(repoDir, res.promptPath)}`);
  }

  if (flags['cap-nhat-loi-nhac']) {
    ranAction = true;
    const res = upgradePrompt({
      repoDir,
      ten: flags.ten || lesson?.loiNhac || lesson?.bee || lesson?.ten,
      quyTac: flags['quy-tac'] || lesson?.quyTacLoiNhac || lesson?.quyTac,
      nguon: flags.nguon || lesson?.nguon || lesson?.pr,
      dryRun,
    });
    console.log(`PASS cap-nhat-loi-nhac${res.dryRun ? ' (DRY_RUN)' : ''}: ${path.relative(repoDir, res.promptPath)} (changed=${res.updated})`);
  }

  // Standalone --tu-json convenience when no explicit --tao-*/--cap-nhat-* flag is given
  if (!ranAction && lesson && !flags.kiem && !flags['dong-bo']) {
    if ((lesson.skill || lesson.ten) && lesson.luatTieuDe && lesson.quyTac) {
      ranAction = true;
      const res = upgradeSkill({
        repoDir,
        ten: lesson.skill || lesson.ten,
        luatTieuDe: lesson.luatTieuDe,
        quyTac: lesson.quyTac,
        pr: lesson.pr,
        viDu: lesson.viDu,
        dryRun,
      });
      console.log(`PASS cap-nhat-skill (tu-json${res.dryRun ? ', DRY_RUN' : ''}): ${path.relative(repoDir, res.skillPath)} (Luật ${res.ruleNumber}, changed=${res.updated})`);
    }
    if ((lesson.loiNhac || lesson.bee) && (lesson.quyTacLoiNhac || lesson.quyTac)) {
      ranAction = true;
      const res = upgradePrompt({
        repoDir,
        ten: lesson.loiNhac || lesson.bee,
        quyTac: lesson.quyTacLoiNhac || lesson.quyTac,
        nguon: lesson.nguon || lesson.pr,
        dryRun,
      });
      console.log(`PASS cap-nhat-loi-nhac (tu-json${res.dryRun ? ', DRY_RUN' : ''}): ${path.relative(repoDir, res.promptPath)} (changed=${res.updated})`);
    }
  }

  if (flags['dong-bo']) {
    ranAction = true;
    const res = syncPlugin({ repoDir, pluginDir, dryRun });
    console.log(
      `PASS dong-bo${res.dryRun ? ' (DRY_RUN)' : ''}: copied=${res.copied.length}, unchanged=${res.unchanged.length}, removed=${res.removed.length} -> ${res.pluginDir}`,
    );
    for (const c of res.copied) console.log(`  + ${c}`);
    for (const r of res.removed) console.log(`  - ${r}`);
  }

  if (flags.kiem) {
    ranAction = true;
    const res = validateRepo({
      repoDir,
      pluginDir,
      batBuocPlugin: Boolean(flags['bat-buoc-plugin']),
    });
    for (const w of res.warnings) console.log(`WARN: ${w}`);
    if (res.ok) {
      console.log(`PASS quan-ly-skill --kiem: ${res.checkedFiles.length} tệp hợp lệ (pluginParity=${res.pluginChecked ? 'checked' : 'skipped'})`);
    } else {
      console.error(`FAIL quan-ly-skill --kiem: ${res.errors.length} lỗi`);
      for (const e of res.errors) console.error(`  ✗ ${e}`);
      process.exit(1);
    }
  }

  if (!ranAction) {
    console.error(
      'Dùng: node scripts/quan-ly-skill.mjs [--tao-skill | --cap-nhat-skill | --tao-loi-nhac | --cap-nhat-loi-nhac | --dong-bo | --kiem]',
    );
    process.exit(2);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (err) {
    console.error(`FAIL quan-ly-skill: ${err.message}`);
    process.exit(1);
  }
}
