#!/usr/bin/env node
/**
 * Sprint 1 — Policy enricher (Issue #5)
 * Batch-call Gemini to parse tax.json[*].cs into structured warnings.
 *
 * Usage:
 *   GEMINI_API_KEY=... node scripts/enrich-policies.mjs --limit=5 --dry-run
 *   GEMINI_API_KEY=... node scripts/enrich-policies.mjs --batch=5 --concurrency=2
 *
 * Env:
 *   GEMINI_ENRICH_MODEL — default gemini-2.5-pro
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const TAX_PATH = path.join(ROOT, 'data', 'tax.json');
const OUT_PATH = path.join(ROOT, 'data', 'tax-enriched.json');

const SEVERITIES = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

const SYSTEM_PROMPT = `Bạn là chuyên gia pháp lý hải quan và phân loại hàng hóa Việt Nam.
Nhiệm vụ: đọc đoạn chính sách (policyText) của từng mã HS và trả về JSON có key "items": mảng object, mỗi phần tử tương ứng một mã đầu vào THEO ĐÚNG THỨ TỰ.

Mỗi phần tử phải có dạng:
{
  "hsCode": "85171300",
  "warnings": {
    "requiresLicense": boolean,
    "licenseTypes": string[],
    "requiresInspection": boolean,
    "inspectionTypes": string[],
    "requiresQuarantine": boolean,
    "dualUseControl": boolean,
    "ministries": string[],
    "legalDocs": [
      { "code": "08/2023/TT-BCT", "type": "Thông tư", "year": 2023, "section": "PL1.I", "issuer": "BCT" }
    ],
    "summary": string (tiếng Việt, ngắn gọn),
    "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    "rawText": string (copy nguyên policyText đầu vào)
  }
}

Few-shot:
- Nếu có "giấy phép" → requiresLicense true, licenseTypes có thể gồm "NK" hoặc "XK".
- "kiểm dịch" → requiresQuarantine true.
- "kiểm tra chất lượng", "CR", "hợp quy" → requiresInspection true.
- "mật mã dân sự", kiểm soát CNTT → dualUseControl true nếu phù hợp.
- Trích mã văn bản dạng số/năm/loại (vd 211/2025/NĐ-CP, 08/2023/TT-BCT) vào legalDocs.

Chỉ trả JSON, không markdown.`;

function parseArgs() {
  const a = process.argv.slice(2);
  const o = {
    limit: Infinity,
    offset: 0,
    batch: 5,
    concurrency: 2,
    dryRun: false,
    out: OUT_PATH,
  };
  for (const arg of a) {
    if (arg === '--dry-run') o.dryRun = true;
    else if (arg.startsWith('--limit=')) o.limit = parseInt(arg.slice(8), 10) || 0;
    else if (arg.startsWith('--offset=')) o.offset = parseInt(arg.slice(9), 10) || 0;
    else if (arg.startsWith('--batch=')) o.batch = Math.max(1, parseInt(arg.slice(8), 10) || 5);
    else if (arg.startsWith('--concurrency=')) o.concurrency = Math.max(1, parseInt(arg.slice(14), 10) || 2);
    else if (arg.startsWith('--out=')) o.out = path.resolve(arg.slice(6));
  }
  return o;
}

function normalizeHs(hs) {
  return String(hs).replace(/\./g, '').trim().padEnd(8, '0').slice(0, 8);
}

function validateWarnings(w, rawText) {
  if (!w || typeof w !== 'object') return null;
  const out = {
    requiresLicense: Boolean(w.requiresLicense),
    licenseTypes: Array.isArray(w.licenseTypes) ? w.licenseTypes.map(String) : [],
    requiresInspection: Boolean(w.requiresInspection),
    inspectionTypes: Array.isArray(w.inspectionTypes) ? w.inspectionTypes.map(String) : [],
    requiresQuarantine: Boolean(w.requiresQuarantine),
    dualUseControl: Boolean(w.dualUseControl),
    ministries: Array.isArray(w.ministries) ? w.ministries.map(String) : [],
    legalDocs: Array.isArray(w.legalDocs)
      ? w.legalDocs
          .filter((d) => d && typeof d === 'object')
          .map((d) => ({
            code: d.code != null ? String(d.code) : '',
            type: d.type != null ? String(d.type) : '',
            year: typeof d.year === 'number' ? d.year : parseInt(d.year, 10) || null,
            section: d.section != null ? String(d.section) : null,
            issuer: d.issuer != null ? String(d.issuer) : null,
          }))
      : [],
    summary: w.summary != null ? String(w.summary).slice(0, 2000) : '',
    severity: SEVERITIES.has(w.severity) ? w.severity : 'MEDIUM',
    rawText: w.rawText != null ? String(w.rawText) : String(rawText || ''),
  };
  return out;
}

async function geminiBatch(items, model, apiKey) {
  const userPayload = {
    task: 'Parse policy text for each HS code',
    items: items.map((x) => ({ hsCode: x.hs, policyText: x.cs })),
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: JSON.stringify(userPayload, null, 2) }] }],
      generationConfig: {
        temperature: 0.15,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const t = await response.text();
    throw new Error(`Gemini ${response.status}: ${t.slice(0, 400)}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');

  const parsed = JSON.parse(text);
  const list = parsed.items || parsed.results || parsed;
  if (!Array.isArray(list)) throw new Error('Expected JSON array or { items: [] }');

  const byHs = new Map();
  for (const row of list) {
    if (!row || !row.hsCode) continue;
    const code = normalizeHs(row.hsCode);
    const w = validateWarnings(row.warnings, items.find((i) => i.hs === code)?.cs);
    if (w) byHs.set(code, w);
  }
  return byHs;
}

async function geminiSingle(hs, cs, model, apiKey) {
  const map = await geminiBatch([{ hs, cs }], model, apiKey);
  return map.get(normalizeHs(hs)) || null;
}

async function ollamaBatch(items, model, apiKey, baseUrl) {
  const userPayload = {
    task: 'Parse policy text for each HS code',
    items: items.map((x) => ({ hsCode: x.hs, policyText: x.cs })),
  };

  const url = `${baseUrl}/chat`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(userPayload, null, 2) },
      ],
      stream: false,
      format: 'json',
      options: { temperature: 0.15 },
    }),
  });

  if (!response.ok) {
    const t = await response.text();
    throw new Error(`Ollama ${response.status}: ${t.slice(0, 400)}`);
  }

  const data = await response.json();
  let text = data.message?.content || '';
  if (!text) throw new Error('Empty Ollama response');

  // Strip markdown code fences if present
  text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  const parsed = JSON.parse(text);
  const list = parsed.items || parsed.results || parsed;
  if (!Array.isArray(list)) throw new Error('Expected JSON array or { items: [] }');

  const byHs = new Map();
  for (const row of list) {
    if (!row || !row.hsCode) continue;
    const code = normalizeHs(row.hsCode);
    const w = validateWarnings(row.warnings, items.find((i) => i.hs === code)?.cs);
    if (w) byHs.set(code, w);
  }
  return byHs;
}

async function ollamaSingle(hs, cs, model, apiKey, baseUrl) {
  const map = await ollamaBatch([{ hs, cs }], model, apiKey, baseUrl);
  return map.get(normalizeHs(hs)) || null;
}

async function openaiCompatBatch(items, model, apiKey, baseUrl, providerLabel) {
  const userPayload = {
    task: 'Parse policy text for each HS code',
    items: items.map((x) => ({ hsCode: x.hs, policyText: x.cs })),
  };

  const url = `${baseUrl}/chat/completions`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(userPayload, null, 2) },
      ],
      temperature: 0.15,
      stream: false,
    }),
  });

  if (!response.ok) {
    const t = await response.text();
    throw new Error(`${providerLabel} ${response.status}: ${t.slice(0, 400)}`);
  }

  const data = await response.json();
  let text = data.choices?.[0]?.message?.content || '';
  if (!text) throw new Error(`Empty ${providerLabel} response`);

  text = text.replace(/<think[^>]*>[\s\S]*?<\/think>/gi, '').trim();
  text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  const parsed = JSON.parse(text);
  const list = parsed.items || parsed.results || parsed;
  if (!Array.isArray(list)) throw new Error('Expected JSON array or { items: [] }');

  const byHs = new Map();
  for (const row of list) {
    if (!row || !row.hsCode) continue;
    const code = normalizeHs(row.hsCode);
    const w = validateWarnings(row.warnings, items.find((i) => i.hs === code)?.cs);
    if (w) byHs.set(code, w);
  }
  return byHs;
}

async function openaiCompatSingle(hs, cs, model, apiKey, baseUrl, providerLabel) {
  const map = await openaiCompatBatch([{ hs, cs }], model, apiKey, baseUrl, providerLabel);
  return map.get(normalizeHs(hs)) || null;
}

function loadOut(p) {
  if (!fs.existsSync(p)) return {};
  try {
    const o = JSON.parse(fs.readFileSync(p, 'utf8'));
    return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
  } catch {
    return {};
  }
}

function saveOut(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(`${p}.tmp`, JSON.stringify(obj, null, 0), 'utf8');
  fs.renameSync(`${p}.tmp`, p);
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function runPool(tasks, concurrency, fn) {
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const my = idx++;
      await fn(tasks[my], my);
    }
  }
  await Promise.all(Array(Math.min(concurrency, Math.max(tasks.length, 1))).fill(0).map(() => worker()));
}

async function main() {
  const opts = parseArgs();

  // Provider priority: --provider flag > MINIMAX > OLLAMA > GEMINI
  const providerFlag = (process.argv.find((a) => a.startsWith('--provider=')) || '').split('=')[1] || '';

  const minimaxKey = process.env.MINIMAX_API_KEY;
  const minimaxModel = process.env.MINIMAX_ENRICH_MODEL || 'MiniMax-M2.7';
  const minimaxBase = process.env.MINIMAX_BASE_URL || 'https://api.minimax.io/v1';

  const ollamaKey = process.env.OLLAMA_API_KEY;
  const ollamaModel = process.env.OLLAMA_ENRICH_MODEL || 'gemma4:31b';
  const ollamaBase = process.env.OLLAMA_BASE_URL || 'https://ollama.com/api';

  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const openrouterModel = process.env.OPENROUTER_ENRICH_MODEL || 'google/gemma-3-27b-it:free';
  const openrouterBase = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

  const geminiKey = process.env.GEMINI_API_KEY;
  const geminiModel = (process.env.GEMINI_ENRICH_MODEL || 'gemini-2.5-flash').replace(/^models\//, '');

  let provider, model, apiKey, batchFn, singleFn, extraArgs;

  if (providerFlag === 'openrouter' || (!providerFlag && openrouterKey && !minimaxKey)) {
    provider = 'openrouter';
    model = openrouterModel;
    apiKey = openrouterKey;
    batchFn = openaiCompatBatch;
    singleFn = openaiCompatSingle;
    extraArgs = [openrouterKey, openrouterBase, 'OpenRouter'];
  } else if (providerFlag === 'minimax' || (!providerFlag && minimaxKey)) {
    provider = 'minimax';
    model = minimaxModel;
    apiKey = minimaxKey;
    batchFn = openaiCompatBatch;
    singleFn = openaiCompatSingle;
    extraArgs = [minimaxKey, minimaxBase, 'MiniMax'];
  } else if (providerFlag === 'ollama' || (!providerFlag && ollamaKey)) {
    provider = 'ollama';
    model = ollamaModel;
    apiKey = ollamaKey;
    batchFn = ollamaBatch;
    singleFn = ollamaSingle;
    extraArgs = [ollamaKey, ollamaBase];
  } else {
    provider = 'gemini';
    model = geminiModel;
    apiKey = geminiKey;
    batchFn = geminiBatch;
    singleFn = geminiSingle;
    extraArgs = [geminiKey];
  }

  const tax = JSON.parse(fs.readFileSync(TAX_PATH, 'utf8'));
  const withPolicy = Object.values(tax).filter((r) => r.cs && String(r.cs).trim());

  let queue = withPolicy.map((r) => ({ hs: normalizeHs(r.hs), cs: String(r.cs).trim() }));
  queue = queue.slice(opts.offset);
  if (Number.isFinite(opts.limit)) queue = queue.slice(0, opts.limit);

  const existing = loadOut(opts.out);
  queue = queue.filter((q) => !existing[q.hs]);

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        provider,
        model,
        totalWithPolicy: withPolicy.length,
        toProcess: queue.length,
        batch: opts.batch,
        concurrency: opts.concurrency,
        dryRun: opts.dryRun,
        out: opts.out,
      },
      null,
      2
    )
  );

  if (opts.dryRun) {
    // eslint-disable-next-line no-console
    console.log('Dry run — first 3 would process:', queue.slice(0, 3).map((x) => x.hs));
    return;
  }

  if (!apiKey) {
    // eslint-disable-next-line no-console
    console.error('Set MINIMAX_API_KEY, OPENROUTER_API_KEY, OLLAMA_API_KEY, or GEMINI_API_KEY');
    process.exit(1);
  }

  const batchFnRef = batchFn;
  const singleFnRef = singleFn;

  const batches = chunk(queue, opts.batch);
  const merged = { ...existing };
  let done = 0;

  await runPool(batches, opts.concurrency, async (batch, batchIdx) => {
    let byHs;
    let retries = 3;
    while (retries > 0) {
      try {
        byHs = await batchFnRef(batch, model, ...extraArgs);
        break;
      } catch (e) {
        retries--;
        if (retries <= 0) {
          // eslint-disable-next-line no-console
          console.warn(`Batch ${batchIdx} failed after 3 retries: ${e.message}`);
          byHs = new Map();
          break;
        }
        // eslint-disable-next-line no-console
        console.warn(`Batch ${batchIdx} error (retries left: ${retries}): ${e.message}`);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
    if (byHs.size < batch.length) {
      for (const row of batch) {
        if (!byHs.has(row.hs)) {
          try {
            const w = await singleFnRef(row.hs, row.cs, model, ...extraArgs);
            if (w) byHs.set(row.hs, w);
          } catch {
            // skip individual failures
          }
        }
      }
    }

    const enrichModel = provider === 'gemini' ? `models/${model}` : `${provider}/${model}`;
    const enrichedAt = new Date().toISOString();
    for (const row of batch) {
      const w = byHs.get(row.hs);
      if (!w) {
        // eslint-disable-next-line no-console
        console.warn('Missing enrichment for', row.hs);
        continue;
      }
      merged[row.hs] = {
        hsCode: row.hs,
        warnings: w,
        enrichedAt,
        enrichModel,
      };
    }
    done += batch.length;
    saveOut(opts.out, merged);
    // eslint-disable-next-line no-console
    console.log(`Progress: ${done}/${queue.length} (saved)`);
  });

  // eslint-disable-next-line no-console
  console.log('Done. Total keys in output:', Object.keys(merged).length);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
