#!/usr/bin/env node
/**
 * Accuracy benchmark: sample from Oz 10k declarations → compare suggest vs ground truth.
 *
 * Modes:
 *   --search-only   Only test search candidate layer (no Gemini, no API cost)
 *   (default)       Full pipeline: search + Gemini rerank + GIR + precedent
 *
 * Usage:
 *   node scripts/accuracy-benchmark.mjs --dry-run            # show sampling plan
 *   node scripts/accuracy-benchmark.mjs --search-only --limit=50   # search baseline, 50 samples
 *   node scripts/accuracy-benchmark.mjs --limit=10 --seed=42       # full pipeline, 10 samples
 *   GEMINI_API_KEY=... node scripts/accuracy-benchmark.mjs         # full run (200 samples)
 *
 * Output: data/accuracy-report-YYYY-MM-DD.json
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Parse args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const searchOnly = args.includes('--search-only');
const limitArg = args.find((a) => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 200;
const seedArg = args.find((a) => a.startsWith('--seed='));
const seed = seedArg ? parseInt(seedArg.split('=')[1], 10) : 42;
const outFile = args.find((a) => a.startsWith('--out='));
const outPath = outFile ? outFile.split('=')[1] : null;
const delayArg = args.find((a) => a.startsWith('--delay='));
const callDelay = delayArg ? parseInt(delayArg.split('=')[1], 10) : 2000;
// --via=hermes: rerank qua router lib/llm.mjs (Hermes Pool ưu tiên #1). Mặc định 'gemini' (giữ hành vi cũ).
const viaArg = args.find((a) => a.startsWith('--via='));
const via = viaArg ? viaArg.split('=')[1] : 'gemini';
// --candidates=hybrid: sinh candidate bằng buildSuggestCandidates (LLM heading + precedent + keyword)
// = đúng tầng /api/suggest sau khi wire. Mặc định 'keyword' (searchCandidates cũ).
const candArg = args.find((a) => a.startsWith('--candidates='));
const candMode = candArg ? candArg.split('=')[1] : 'keyword';
const noPrecedent = args.includes('--no-precedent');

// Deterministic PRNG (mulberry32)
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Load declarations
const declPath = join(ROOT, 'data', 'oz-declarations.jsonl');
if (!existsSync(declPath)) {
  console.error('Missing data/oz-declarations.jsonl — run import first');
  process.exit(1);
}

const lines = readFileSync(declPath, 'utf8').split('\n').filter(Boolean);
const declarations = lines.map((l) => {
  try { return JSON.parse(l); } catch { return null; }
}).filter(Boolean);

console.log(`Loaded ${declarations.length} declarations`);

function getChapter(hs) {
  return String(hs).replace(/\./g, '').trim().slice(0, 2);
}

// Group by chapter
const byChapter = new Map();
for (const decl of declarations) {
  const ch = getChapter(decl.hsCode);
  if (!byChapter.has(ch)) byChapter.set(ch, []);
  byChapter.get(ch).push(decl);
}

console.log(`Chapters: ${byChapter.size}`);

// Stratified sampling
const rng = mulberry32(seed);
const sampleSize = Math.min(limit, declarations.length);

const allocation = [...byChapter.entries()].map(([ch, items]) => ({
  chapter: ch,
  total: items.length,
  allocated: Math.max(1, Math.round((items.length / declarations.length) * sampleSize)),
}));

// Normalize
const totalAllocated = allocation.reduce((s, a) => s + a.allocated, 0);
const diff = sampleSize - totalAllocated;
if (diff !== 0) {
  const sorted = [...allocation].sort((a, b) => b.total - a.total);
  let remaining = diff;
  for (const a of sorted) {
    if (remaining === 0) break;
    if (remaining > 0) { a.allocated++; remaining--; }
    else if (a.allocated > 1) { a.allocated--; remaining++; }
  }
}

const sampled = [];
for (const alloc of allocation) {
  const shuffled = [...byChapter.get(alloc.chapter)].sort(() => rng() - 0.5);
  sampled.push(...shuffled.slice(0, alloc.allocated));
}
sampled.sort(() => rng() - 0.5);

console.log(`Sampling: ${sampled.length} records from ${allocation.length} chapters`);

if (dryRun) {
  console.log('\n=== DRY RUN ===');
  const top = allocation.sort((a, b) => b.allocated - a.allocated).slice(0, 20);
  console.log('Chapter | Total | Allocated');
  console.log('--------|-------|----------');
  for (const a of top) {
    console.log(`  ${a.chapter.padStart(2, ' ')}    | ${String(a.total).padStart(5, ' ')} | ${a.allocated}`);
  }
  console.log('\nFirst 5 samples:');
  for (const s of sampled.slice(0, 5)) {
    console.log(`  [${s.hsCode}] ${(s.productName || '').slice(0, 80)}`);
  }
  process.exit(0);
}

// Load shared libs
const { searchCandidates } = await import('../lib/search-utils.js');
const { translateToVi, getBrandHint } = await import('../lib/glossary.js');
let buildSuggestCandidates = null;
if (candMode === 'hybrid') {
  ({ buildSuggestCandidates } = await import('../lib/suggest-candidates.js'));
}

// Sinh candidate theo mode (keyword cũ vs hybrid mới).
async function getEvidence(description) {
  if (candMode === 'hybrid') {
    const { candidates } = await buildSuggestCandidates(description, {
      topCandidates: 12, perHeading: 6, includePrecedent: !noPrecedent, tier: via === 'hermes' ? 'standard' : 'premium', timeoutMs: 18000,
    });
    return candidates;
  }
  return searchCandidates(description, { topCandidates: 10 });
}

let geminiGenerateJson, applyGirRules, applyPrecedentBoost, routerChat, parseJsonLoose;
if (!searchOnly) {
  ({ applyGirRules } = await import('../lib/gir-engine.js'));
  ({ applyPrecedentBoost } = await import('../lib/precedent-search.js'));
  if (via === 'hermes') {
    ({ chat: routerChat } = await import('../lib/llm.mjs'));
    ({ parseJsonLoose } = await import('../lib/parse-json.js'));
  } else {
    ({ geminiGenerateJson } = await import('../lib/gemini.js'));
  }
}

const SYSTEM_PROMPT = `Bạn là chuyên gia phân loại hàng hóa hải quan Việt Nam.
Cho mô tả hàng hóa và danh sách mã HS candidate, hãy chọn tối đa 3 mã phù hợp nhất.
Chỉ trả JSON đúng schema:
{
  "suggestions": [
    { "hsCode": "85171300", "nameVi": "Tên hàng", "confidence": 92, "reasoning": "Giải thích" }
  ]
}
Không thêm text ngoài JSON.`;

async function retryGemini(fn, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const is429 = err.message?.includes('429');
      if (!is429 || attempt === maxRetries) throw err;
      const delay = Math.pow(2, attempt) * 5000 + Math.random() * 2000;
      process.stdout.write(`  [retry ${attempt + 1} in ${Math.round(delay / 1000)}s]`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

// --- Run ---
const mode = searchOnly ? `search-only (cand=${candMode})` : `full-pipeline (cand=${candMode}${noPrecedent ? ',no-prec' : ''}, via=${via})`;
console.log(`\nMode: ${mode} | ${sampled.length} samples\n`);

const results = [];
let top1Correct = 0, top3Correct = 0, errors = 0, noCandidates = 0;

for (let i = 0; i < sampled.length; i++) {
  const decl = sampled[i];
  const description = decl.productName || decl.customsDescription || '';
  if (!description || description.length < 5) {
    results.push({ decl, error: 'empty_description', skipped: true });
    continue;
  }

  const groundTruth = String(decl.hsCode).replace(/\./g, '').trim();
  const groundTruthRevised = decl.hsCodeRevised ? String(decl.hsCodeRevised).replace(/\./g, '').trim() : null;

  try {
    const glossaryVi = translateToVi(description);
    const brandHint = getBrandHint(description);
    const evidence = await getEvidence(description);

    if (evidence.length === 0) {
      noCandidates++;
      results.push({ decl: { hsCode: groundTruth }, error: 'no_candidates' });
      process.stdout.write(`  [${i + 1}/${sampled.length}] - GT=${groundTruth} NO CANDIDATES\n`);
      continue;
    }

    let suggestions;
    let llmModel = null, llmMs = null;

    if (searchOnly) {
      // Search-only: top candidates by search score, no LLM
      suggestions = evidence.slice(0, 3).map((e) => ({
        hsCode: e.hsCode,
        nameVi: e.nameVi,
        confidence: Math.round(e.score),
      }));
    } else {
      // Full pipeline: Gemini rerank + GIR + precedent
      const userPrompt = JSON.stringify({
        description,
        glossaryTranslation: glossaryVi !== description ? glossaryVi : undefined,
        brandHint,
        candidates: evidence.map(({ hsCode, nameVi, policyByHs, score }) => ({ hsCode, nameVi, policyByHs, score })),
        topReranked: 3,
      }, null, 2);

      let json, model, ms;
      if (via === 'hermes') {
        const started = Date.now();
        const { content, provider, model: m } = await routerChat(
          [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userPrompt }],
          { json: true, maxTokens: 2000, timeoutMs: 60000 },
        );
        json = parseJsonLoose(content);
        model = `${provider}/${m}`;
        ms = Date.now() - started;
      } else {
        ({ json, model, ms } = await retryGemini(() =>
          geminiGenerateJson({ systemPrompt: SYSTEM_PROMPT, userPrompt, modelEnv: 'GEMINI_RERANK_MODEL', defaultModel: 'gemini-2.5-flash' })
        ));
      }

      const rawSuggestions = (json.suggestions || []).slice(0, 3);
      const girRanked = applyGirRules(rawSuggestions, description);
      const precedentRanked = applyPrecedentBoost(girRanked.suggestions, description);
      suggestions = precedentRanked.suggestions;
      llmModel = model;
      llmMs = ms;
    }

    const top1 = suggestions[0]?.hsCode ? String(suggestions[0].hsCode).replace(/\./g, '').trim() : null;
    const top3Hs = suggestions.slice(0, 3).map((s) => String(s.hsCode).replace(/\./g, '').trim());

    const isTop1Correct = top1 === groundTruth || top1 === groundTruthRevised;
    const isTop3Correct = top3Hs.includes(groundTruth) || (groundTruthRevised && top3Hs.includes(groundTruthRevised));

    if (isTop1Correct) top1Correct++;
    if (isTop3Correct) top3Correct++;

    results.push({
      decl: { hsCode: groundTruth, hsCodeRevised: groundTruthRevised, chapter: getChapter(groundTruth), productName: description.slice(0, 120) },
      top1, top3: top3Hs,
      isTop1Correct, isTop3Correct,
      confidence: suggestions[0]?.confidence || null,
      llmModel, ms: llmMs,
    });

    const sym = isTop1Correct ? '✓' : (isTop3Correct ? '~' : '✗');
    process.stdout.write(`  [${i + 1}/${sampled.length}] ${sym} GT=${groundTruth} Top1=${top1} (${description.slice(0, 45)}...)\n`);

    if (!searchOnly && i < sampled.length - 1) {
      await new Promise((r) => setTimeout(r, callDelay));
    }
  } catch (err) {
    errors++;
    results.push({ decl: { hsCode: groundTruth, productName: description.slice(0, 100) }, error: err.message });
    process.stdout.write(`  [${i + 1}/${sampled.length}] ✗ ERROR: ${err.message.slice(0, 60)}\n`);
  }
}

// --- Report ---
const evaluated = results.filter((r) => !r.skipped && !r.error);
const totalEvaluated = evaluated.length;

const byChapterResult = {};
for (const r of evaluated) {
  if (!r.decl?.hsCode) continue;
  const ch = getChapter(r.decl.hsCode);
  if (!byChapterResult[ch]) byChapterResult[ch] = { total: 0, top1: 0, top3: 0 };
  byChapterResult[ch].total++;
  if (r.isTop1Correct) byChapterResult[ch].top1++;
  if (r.isTop3Correct) byChapterResult[ch].top3++;
}

const weakestChapters = Object.entries(byChapterResult)
  .map(([ch, d]) => ({ chapter: ch, ...d, top1Rate: d.total > 0 ? d.top1 / d.total : 0 }))
  .filter((d) => d.total >= 2)
  .sort((a, b) => a.top1Rate - b.top1Rate)
  .slice(0, 10);

const overallTop1 = totalEvaluated > 0 ? top1Correct / totalEvaluated : 0;
const overallTop3 = totalEvaluated > 0 ? top3Correct / totalEvaluated : 0;

const today = new Date().toISOString().split('T')[0];
const report = {
  benchmarkDate: new Date().toISOString(),
  mode,
  sampleSize: sampled.length,
  totalEvaluated,
  top1Correct,
  top3Correct,
  errors,
  noCandidates,
  overallTop1Rate: Math.round(overallTop1 * 10000) / 100,
  overallTop3Rate: Math.round(overallTop3 * 10000) / 100,
  seed,
  weakestChapters,
  byChapter: byChapterResult,
  results,
};

const reportPath = outPath || join(ROOT, 'data', `accuracy-report-${today}.json`);
writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log(`\n=== Accuracy Report (${mode}) ===`);
console.log(`Sample:      ${sampled.length}`);
console.log(`Evaluated:   ${totalEvaluated}`);
console.log(`Top-1:       ${top1Correct}/${totalEvaluated} = ${(overallTop1 * 100).toFixed(1)}%`);
console.log(`Top-3:       ${top3Correct}/${totalEvaluated} = ${(overallTop3 * 100).toFixed(1)}%`);
console.log(`Errors:      ${errors}`);
console.log(`No cand:     ${noCandidates}`);
console.log(`\nWeakest chapters:`);
for (const w of weakestChapters) {
  console.log(`  Ch ${w.chapter}: ${(w.top1Rate * 100).toFixed(0)}% (${w.top1}/${w.total})`);
}
console.log(`\nSaved: ${reportPath}`);

if (overallTop1 >= 0.75) {
  console.log(`\n✓ PASS: overall top-1 ≥ 75%`);
} else {
  console.log(`\n✗ FAIL: overall top-1 ${(overallTop1 * 100).toFixed(1)}% < 75% target`);
}
