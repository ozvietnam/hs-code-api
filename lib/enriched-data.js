const fs = require('fs');
const path = require('path');

let map = null;

function normalizeHsKey(hs) {
  return String(hs || '')
    .replace(/\./g, '')
    .trim()
    .padEnd(8, '0')
    .slice(0, 8);
}

/**
 * Lazy-load tax-enriched.json (Gemini policy parse output).
 * Cached per serverless instance.
 */
function getEnrichedMap() {
  if (map !== null) return map;
  const p = path.join(process.cwd(), 'data', 'tax-enriched.json');
  if (!fs.existsSync(p)) {
    map = {};
    return map;
  }
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    map = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  } catch {
    map = {};
  }
  return map;
}

function getEnrichedForHs(hs) {
  const code = normalizeHsKey(hs);
  const entry = getEnrichedMap()[code];
  if (!entry || typeof entry !== 'object') return null;
  return entry;
}

function enrichedEntryCount() {
  return Object.keys(getEnrichedMap()).length;
}

/** For tests / long-running scripts that rewrite the file on disk */
function clearEnrichedCache() {
  map = null;
}

module.exports = {
  getEnrichedForHs,
  enrichedEntryCount,
  clearEnrichedCache,
  normalizeHsKey,
};
