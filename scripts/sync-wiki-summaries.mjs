#!/usr/bin/env node
// scripts/sync-wiki-summaries.mjs — đồng bộ wiki/sources/*.md từ oz-wiki-plhq
// → data/plhq-wiki-summaries.json (cho lib/wiki-bridge.js).
//
//   node scripts/sync-wiki-summaries.mjs                    # tải từ GitHub
//   node scripts/sync-wiki-summaries.mjs --from <đường dẫn>  # đọc cục bộ
//   node scripts/sync-wiki-summaries.mjs --check              # chỉ kiểm, không ghi
//
// Mỗi file .md parse frontmatter (id, title, related_concepts) + 2-3 dòng đầu của
// ## Summary để làm tóm tắt. Slug = id; aliases = các dạng số hiệu suy ra.

import { existsSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'data', 'plhq-wiki-summaries.json');
const URL_LIST = 'https://api.github.com/repos/ozvietnam/oz-wiki-plhq/contents/wiki/sources';
const URL_RAW = (f) => `https://raw.githubusercontent.com/ozvietnam/oz-wiki-plhq/main/wiki/sources/${f}`;

const args = process.argv.slice(2);
const fromIdx = args.indexOf('--from');
const from = fromIdx >= 0 ? args[fromIdx + 1] : null;
const checkOnly = args.includes('--check');

/** Rút slug + aliases từ tên file (xx-yyyy-tt-bct.md). */
function slugFromFilename(name) {
  return name.replace(/\.md$/, '').toLowerCase();
}

/** Parse frontmatter + summary ngắn từ nội dung wiki source. */
function parseSource(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split('\n')) {
    const km = line.match(/^(\w+):\s*(.*)$/);
    if (km) fm[km[1]] = km[2].replace(/^["']|["']$/g, '').trim();
  }
  if (!fm.id) return null;

  // Lấy 2-3 dòng đầu của phần ## Summary (markdown body)
  const body = m[2];
  const sm = body.match(/##\s*Summary\s*\n+([\s\S]*?)(?:\n##|\n*$)/);
  let summary = '';
  if (sm) {
    summary = sm[1]
      .split('\n')
      .map((l) => l.replace(/^[*\->\s]+/, '').replace(/\*\*/g, '').trim())
      .filter((l) => l && !l.startsWith('|'))
      .slice(0, 3)
      .join(' ')
      .slice(0, 480); // giới hạn ~ 3 câu
  }

  // related_concepts (YAML list, mỗi dòng một "- slug")
  const rcIdx = m[1].indexOf('related_concepts:');
  let rc = [];
  if (rcIdx >= 0) {
    const rest = m[1].slice(rcIdx + 'related_concepts:'.length);
    for (const line of rest.split('\n')) {
      const rm = line.match(/^\s+-\s+["']?([^"']+)["']?\s*$/);
      if (rm) rc.push(rm[1].trim());
      else if (line.trim() && !line.startsWith(' ')) break; // kết thúc list
    }
  }

  return {
    soHieu: fm.id,
    title: fm.title || null,
    summary,
    relatedConcepts: rc,
    sourceFile: `wiki/sources/${fm.id}.md`,
    updated: fm.updated || null,
  };
}

async function loadFromGithub() {
  const res = await fetch(URL_LIST, { headers: { 'Accept': 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`GitHub list: HTTP ${res.status}`);
  const list = await res.json();
  const docs = [];
  for (const item of list) {
    if (!item.name.endsWith('.md')) continue;
    const r = await fetch(item.download_url);
    if (!r.ok) continue;
    const text = await r.text();
    const parsed = parseSource(text);
    if (parsed) docs.push(parsed);
  }
  return docs;
}

function loadFromLocal(path) {
  const items = [];
  for (const f of readdirSync(path)) {
    if (!f.endsWith('.md')) continue;
    const text = readFileSync(join(path, f), 'utf8');
    const parsed = parseSource(text);
    if (parsed) items.push(parsed);
  }
  return items;
}

// Suy ra aliases (dạng số hiệu) từ slug để tra cứu nhanh.
function aliasesFromSlug(slug) {
  // VD: '07-2026-tt-bct' → '07/2026/TT-BCT'
  const m = slug.match(/^(\d{1,5})-(\d{4})-([a-zđ-]+)$/);
  if (!m) return [];
  return [`${m[1]}/${m[2]}/${m[3].toUpperCase().replace('Đ', 'D').replace(/-([A-Z]+)/g, '-$1')}`];
}

let docs;
try {
  if (from) {
    docs = loadFromLocal(from);
  } else {
    docs = await loadFromGithub();
  }
} catch (e) {
  console.error('Lỗi:', e.message);
  process.exit(1);
}

// Gắn aliases
for (const d of docs) {
  d.aliases = aliasesFromSlug(d.soHieu);
}

const total = docs.length;
const hasSummary = docs.filter((d) => d.summary).length;
const hasConcepts = docs.filter((d) => d.relatedConcepts.length).length;
console.log(`${total} file wiki · ${hasSummary} có summary · ${hasConcepts} có related_concepts`);

const cu = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : null;
const cuDocs = cu?.documents || [];
const doi = JSON.stringify(cuDocs.map((d) => d.soHieu).sort()) !== JSON.stringify(docs.map((d) => d.soHieu).sort());

if (!checkOnly && doi) {
  writeFileSync(OUT, JSON.stringify({
    _comment: 'Bản chụp tóm tắt wiki từ kho cộng đồng oz-wiki-plhq (CC BY 4.0). lib/wiki-bridge.js đọc tệp này.',
    source: from || 'https://raw.githubusercontent.com/ozvietnam/oz-wiki-plhq/main/wiki/sources/',
    repo: 'https://github.com/ozvietnam/oz-wiki-plhq',
    license: 'CC BY 4.0',
    syncedAt: new Date().toISOString().slice(0, 10),
    total,
    documents: docs,
  }, null, 1) + '\n');
  console.log(`Đã ghi ${OUT.slice(ROOT.length + 1)} (${total} văn bản)`);
} else {
  console.log(doi ? 'Có đổi nhưng check-only' : 'Không đổi');
}
