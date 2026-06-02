// Layer: Infra
// Module: hs-classify
// O(1) lookup index for data/explanatory-notes.json (8203 mã, source bao_gom_index.json)
//
// Usage:
//   const { getNotesForHs, getNotesForHeading } = require('./explanatory-notes-index');
//   getNotesForHs('39261000')  → [{ hsCode, noteVi, noteType, sourceFile }]
//   getNotesForHeading('3926') → [{ hsCode, noteVi, ... }]  (all codes under that heading)

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'explanatory-notes.json');

let _byHs = null;   // Map<hsCode(8), entry>
let _byH4 = null;   // Map<headingCode(4), entry[]>

function ensureLoaded() {
  if (_byHs) return;
  const raw = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  // Data is an object keyed by arbitrary keys; values are the note entries
  const entries = Array.isArray(raw) ? raw : Object.values(raw);

  _byHs = new Map();
  _byH4 = new Map();

  for (const entry of entries) {
    const hs = String(entry.hsCode || '').replace(/\D/g, '');
    if (!hs) continue;

    // 8-digit index (exact code)
    if (!_byHs.has(hs)) _byHs.set(hs, []);
    _byHs.get(hs).push(entry);

    // 4-digit heading index
    const h4 = entry.headingCode || hs.slice(0, 4);
    if (h4) {
      if (!_byH4.has(h4)) _byH4.set(h4, []);
      _byH4.get(h4).push(entry);
    }
  }
}

/**
 * Get explanatory notes for an exact HS code (8 digits).
 * Returns [] if no notes found.
 */
function getNotesForHs(hsCode) {
  ensureLoaded();
  const code = String(hsCode || '').replace(/\D/g, '').slice(0, 8);
  return _byHs.get(code) || [];
}

/**
 * Get all explanatory notes under a 4-digit heading.
 * Returns [] if no notes found.
 */
function getNotesForHeading(headingCode) {
  ensureLoaded();
  const h4 = String(headingCode || '').replace(/\D/g, '').slice(0, 4);
  return _byH4.get(h4) || [];
}

/**
 * Get a compact summary for the classify engine: top noteVi text for an HS code.
 * Returns null if not found.
 */
function getNoteSummaryForHs(hsCode) {
  const notes = getNotesForHs(hsCode);
  if (!notes.length) return null;
  return {
    hsCode,
    noteVi: notes[0].noteVi || '',
    noteType: notes[0].noteType || '',
    sourceFile: notes[0].sourceFile || '',
  };
}

/**
 * Coverage stats (for reporting). Lazy — called only if needed.
 */
function getCoverageStats() {
  ensureLoaded();
  return {
    totalNoteEntries: _byHs.size,
    uniqueHeadingsCovered: _byH4.size,
  };
}

module.exports = { getNotesForHs, getNotesForHeading, getNoteSummaryForHs, getCoverageStats };
