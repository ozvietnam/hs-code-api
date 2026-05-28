#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const INPUT_JSONL = path.join(ROOT, 'data/oz-declarations.jsonl');
const OUTPUT_JSON = path.join(ROOT, 'data/oz-declaration-embeddings.json');
const BATCH_SIZE = 100;
const BATCH_DELAY_MS = 4000;
const MAX_RETRY = 5;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readDeclarations() {
  if (!fs.existsSync(INPUT_JSONL)) {
    throw new Error(`Missing declarations file: ${INPUT_JSONL}`);
  }
  return fs
    .readFileSync(INPUT_JSONL, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function loadExistingEmbeddings() {
  if (!fs.existsSync(OUTPUT_JSON)) return {};
  try {
    return JSON.parse(fs.readFileSync(OUTPUT_JSON, 'utf8'));
  } catch {
    return {};
  }
}

function buildText(record) {
  return [
    record.productName || '',
    record.brand || '',
    record.model || '',
    record.customsDescription || '',
  ]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function recordKey(record) {
  return `${record.sourceFile || 'unknown'}#${record.declId}#${record.sourceRow}`;
}

function textFingerprint(text) {
  return crypto.createHash('sha1').update(text).digest('hex');
}

async function requestBatchEmbeddings(texts, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=${apiKey}`;
  const body = {
    requests: texts.map((text) => ({
      model: 'models/gemini-embedding-001',
      content: { parts: [{ text }] },
      outputDimensionality: 768,
      taskType: 'SEMANTIC_SIMILARITY',
    })),
  };

  let attempt = 0;
  while (attempt < MAX_RETRY) {
    attempt += 1;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const data = await response.json();
      const embeddings = data?.embeddings;
      if (!Array.isArray(embeddings) || embeddings.length !== texts.length) {
        throw new Error(`Invalid batch embedding result count: ${embeddings?.length ?? 'none'}`);
      }
      const vectors = embeddings.map((entry) => entry?.values || []);
      if (vectors.some((vector) => !Array.isArray(vector) || vector.length !== 768)) {
        throw new Error('One or more embeddings have invalid dimensions');
      }
      return vectors;
    }

    const status = response.status;
    const detail = await response.text();
    const retriable = status === 429 || status >= 500;
    if (!retriable || attempt >= MAX_RETRY) {
      throw new Error(`Embedding API failed (${status}): ${detail.slice(0, 300)}`);
    }
    const waitMs = 1000 * 2 ** (attempt - 1);
    await sleep(waitMs);
  }

  throw new Error('Unexpected embedding loop exit');
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const records = readDeclarations();
  const embeddings = loadExistingEmbeddings();

  const pendingRecords = records.filter((record) => !embeddings[recordKey(record)]);
  const uniqueTextMap = new Map();
  for (const record of pendingRecords) {
    const text = buildText(record);
    if (!text) continue;
    const key = textFingerprint(text);
    const group = uniqueTextMap.get(key) || { text, recordKeys: [] };
    group.recordKeys.push(recordKey(record));
    uniqueTextMap.set(key, group);
  }
  const pending = Array.from(uniqueTextMap.values());

  console.log(`Total declarations: ${records.length}`);
  console.log(`Already embedded: ${records.length - pendingRecords.length}`);
  console.log(`Pending embed records: ${pendingRecords.length}`);
  console.log(`Pending unique texts: ${pending.length}`);

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE);
    const batchNo = Math.floor(i / BATCH_SIZE) + 1;
    const batchTotal = Math.ceil(pending.length / BATCH_SIZE);
    console.log(`Embedding batch ${batchNo}/${batchTotal} (${batch.length} unique texts)...`);

    const vectors = await requestBatchEmbeddings(batch.map((item) => item.text), apiKey);
    for (let j = 0; j < batch.length; j += 1) {
      const item = batch[j];
      const vector = vectors[j];
      for (const key of item.recordKeys) {
        embeddings[key] = vector;
      }
    }

    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(embeddings), 'utf8');

    if (i + BATCH_SIZE < pending.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  const embeddedCount = records.filter((record) => Boolean(embeddings[recordKey(record)])).length;
  console.log(`Embedding complete: ${embeddedCount}/${records.length}`);
  if (embeddedCount !== records.length) {
    throw new Error(`Embedding count mismatch: expected ${records.length}, got ${embeddedCount}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
