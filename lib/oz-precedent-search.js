const fs = require('fs');
const path = require('path');

const DECLARATIONS_PATH = path.join(__dirname, '..', 'data', 'oz-declarations.jsonl');
const EMBEDDINGS_PATH = path.join(__dirname, '..', 'data', 'oz-declaration-embeddings.json');

let cachedDeclarations = null;
let cachedEmbeddings = null;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 30_000;

function loadJsonlRecords(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function loadEmbeddings(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function ensureCache() {
  const now = Date.now();
  if (cachedDeclarations && cachedEmbeddings && now - cacheLoadedAt < CACHE_TTL_MS) {
    return;
  }
  cachedDeclarations = loadJsonlRecords(DECLARATIONS_PATH);
  cachedEmbeddings = loadEmbeddings(EMBEDDINGS_PATH);
  cacheLoadedAt = now;
}

function recordKey(record) {
  return `${record.sourceFile || 'unknown'}#${record.declId}#${record.sourceRow}`;
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return -1;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i];
    const y = b[i];
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }
  if (!normA || !normB) return -1;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function embedQuery(query) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const error = new Error('GEMINI_API_KEY is not configured');
    error.code = 'GEMINI_NOT_CONFIGURED';
    throw error;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`;
  const payload = {
    model: 'models/gemini-embedding-001',
    content: { parts: [{ text: query }] },
    outputDimensionality: 768,
    taskType: 'SEMANTIC_SIMILARITY',
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(`Gemini embedding error ${response.status}: ${detail.slice(0, 240)}`);
    error.code = 'GEMINI_API_ERROR';
    throw error;
  }
  const data = await response.json();
  const values = data?.embedding?.values;
  if (!Array.isArray(values)) {
    const error = new Error('Gemini embedding returned empty vector');
    error.code = 'GEMINI_EMPTY';
    throw error;
  }
  return values;
}

async function searchOzPrecedents(description, options = {}) {
  const topK = Math.max(1, Math.min(Number(options.topK) || 5, 20));
  ensureCache();
  if (!cachedDeclarations.length || !Object.keys(cachedEmbeddings).length) return [];

  const queryEmbedding = await embedQuery(description);
  const scored = [];

  for (const decl of cachedDeclarations) {
    const vector = cachedEmbeddings[recordKey(decl)] || cachedEmbeddings[decl.declId];
    if (!vector) continue;
    const similarity = cosineSimilarity(queryEmbedding, vector);
    if (similarity < 0) continue;
    scored.push({
      declId: decl.declId,
      hsCode: decl.hsCode,
      outcome: decl.outcome || 'UNKNOWN',
      productName: decl.productName,
      similarity,
    });
  }

  return scored.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
}

module.exports = {
  searchOzPrecedents,
};
