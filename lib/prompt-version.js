const fs = require('fs');
const path = require('path');

const PROMPTS_DIR = path.join(process.cwd(), 'data', 'prompts');
const INDEX_PATH = path.join(PROMPTS_DIR, 'index.json');

let _index = null;

function loadIndex() {
  if (_index) return _index;
  try {
    _index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  } catch {
    _index = { active: null, experiment: null };
  }
  return _index;
}

function loadPromptFile(name) {
  const p = path.join(PROMPTS_DIR, `${name}.md`);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8').trim();
}

/**
 * Pick which prompt variant to use for this request.
 * Returns { promptText, variant } where variant = 'active' | 'experiment'.
 *
 * Uses a deterministic hash-like approach: pick experiment variant based on
 * a simple counter stored per-instance (not truly random, but evenly distributed).
 */
let _callCount = 0;
function getPrompt(fallback = '') {
  const index = loadIndex();

  // Determine variant
  let variant = 'active';
  const exp = index.experiment;
  if (exp && exp.candidate && typeof exp.rolloutPct === 'number' && exp.rolloutPct > 0) {
    _callCount = (_callCount + 1) % 100;
    if (_callCount < exp.rolloutPct) {
      variant = 'experiment';
    }
  }

  const name = variant === 'experiment' ? exp.candidate : (index.active || null);
  const text = name ? loadPromptFile(name) : null;
  return {
    promptText: text || fallback,
    variant,
    promptVersion: name || 'fallback',
  };
}

/** List all available prompt versions (file names without .md) */
function listPromptVersions() {
  const index = loadIndex();
  let files = [];
  try {
    files = fs.readdirSync(PROMPTS_DIR)
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.replace(/\.md$/, ''));
  } catch { /* no dir */ }
  return {
    active: index.active,
    experiment: index.experiment || null,
    available: files.sort(),
  };
}

/** Clear cache (for tests / hot-reload) */
function clearPromptCache() {
  _index = null;
}

module.exports = { getPrompt, listPromptVersions, clearPromptCache };
