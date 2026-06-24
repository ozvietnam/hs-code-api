const fs = require('fs');
const path = require('path');

const PROMOTIONS_PATH = path.join(process.cwd(), 'data', 'pattern-promotions.jsonl');
const FEEDBACK_PATH   = path.join(process.cwd(), 'data', 'feedback.jsonl');

// Lazy singleton: { fromHs: [{ toHs, count, confidence }] }
let _corrections = null;

function loadCorrections() {
  if (_corrections) return _corrections;
  _corrections = {};

  // Approved promotions (already processed by admin)
  const promoLines = fs.existsSync(PROMOTIONS_PATH)
    ? fs.readFileSync(PROMOTIONS_PATH, 'utf8').split('\n').filter(Boolean)
    : [];
  for (const line of promoLines) {
    try {
      const { fromHs, toHs } = JSON.parse(line);
      if (!fromHs || !toHs || fromHs === toHs) continue;
      if (!_corrections[fromHs]) _corrections[fromHs] = {};
      _corrections[fromHs][toHs] = (_corrections[fromHs][toHs] || 0) + 1;
    } catch { /* skip */ }
  }

  // Approved overrides from feedback.jsonl (status = approved)
  const fbLines = fs.existsSync(FEEDBACK_PATH)
    ? fs.readFileSync(FEEDBACK_PATH, 'utf8').split('\n').filter(Boolean)
    : [];
  for (const line of fbLines) {
    try {
      const row = JSON.parse(line);
      if (row.status !== 'approved') continue;
      const { hsCodeAtTime: fromHs, correctedHsCode: toHs } = row;
      if (!fromHs || !toHs || fromHs === toHs) continue;
      if (!_corrections[fromHs]) _corrections[fromHs] = {};
      _corrections[fromHs][toHs] = (_corrections[fromHs][toHs] || 0) + 1;
    } catch { /* skip */ }
  }

  // Normalize to sorted array
  for (const fromHs of Object.keys(_corrections)) {
    _corrections[fromHs] = Object.entries(_corrections[fromHs])
      .map(([toHs, count]) => ({
        toHs,
        count,
        // confidence: 1 correction = 0.6, 2+ = 0.8, 3+ = 0.95
        confidence: count >= 3 ? 0.95 : count >= 2 ? 0.8 : 0.6,
      }))
      .sort((a, b) => b.count - a.count);
  }

  return _corrections;
}

/**
 * applyLearnedCorrections(suggestions)
 * Boosts/penalizes suggestions based on approved director overrides.
 * - If suggestion.hsCode was historically corrected to a different code → penalize -15
 * - If a historically correct toHs is not in suggestions but should be → add as hint
 * Returns modified suggestions array.
 */
function applyLearnedCorrections(suggestions) {
  const corrections = loadCorrections();
  if (!suggestions?.length) return suggestions;

  const modified = suggestions.map(s => {
    const corr = corrections[s.hsCode];
    if (!corr?.length) return s;
    // This HS was overridden in the past — penalize confidence
    const penalty = Math.round(corr[0].confidence * 15);
    return {
      ...s,
      confidence: Math.max(0, (s.confidence || 50) - penalty),
      learnedPenalty: { correctedTo: corr[0].toHs, count: corr[0].count, penalty },
    };
  });

  return modified.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
}

/**
 * getAccuracyStats() — tổng quan accuracy từ feedback thực tế
 */
function getAccuracyStats() {
  const fbLines = fs.existsSync(FEEDBACK_PATH)
    ? fs.readFileSync(FEEDBACK_PATH, 'utf8').split('\n').filter(Boolean)
    : [];

  const all = [];
  for (const line of fbLines) {
    try { all.push(JSON.parse(line)); } catch { /* skip */ }
  }

  const overrides = all.filter(r => r.feedbackType === 'DIRECTOR_HS_OVERRIDE');
  const approved = overrides.filter(r => r.status === 'approved');
  const rejected = overrides.filter(r => r.status === 'rejected');
  const pending  = overrides.filter(r => !r.status || r.status === 'pending');

  // Top overridden pairs: fromHs → toHs
  const pairCount = {};
  for (const r of approved) {
    const key = `${r.hsCodeAtTime}->${r.correctedHsCode}`;
    pairCount[key] = (pairCount[key] || 0) + 1;
  }
  const topOverridePairs = Object.entries(pairCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([pair, count]) => {
      const [fromHs, toHs] = pair.split('->');
      return { fromHs, toHs, count };
    });

  // Top codes most often wrong (fromHs)
  const fromHsCount = {};
  for (const r of approved) {
    if (!r.hsCodeAtTime) continue;
    fromHsCount[r.hsCodeAtTime] = (fromHsCount[r.hsCodeAtTime] || 0) + 1;
  }
  const topWrongCodes = Object.entries(fromHsCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([hsCode, count]) => ({ hsCode, count }));

  const totalFeedback = all.length;
  const totalOverrides = overrides.length;
  const overrideRate = totalFeedback > 0 ? +(totalOverrides / totalFeedback * 100).toFixed(1) : null;
  // Estimated accuracy: non-override rate among reviewed
  const reviewed = approved.length + rejected.length;
  const acceptedCorrectly = rejected.length; // rejected override = AI was correct
  const estAccuracy = reviewed > 0 ? +(acceptedCorrectly / reviewed * 100).toFixed(1) : null;

  return {
    generatedAt: new Date().toISOString(),
    totalFeedback,
    overrides: { total: totalOverrides, approved: approved.length, rejected: rejected.length, pending: pending.length },
    overrideRate,
    estAccuracy,
    learnedCorrections: Object.keys(loadCorrections()).length,
    topWrongCodes,
    topOverridePairs,
  };
}

module.exports = { applyLearnedCorrections, getAccuracyStats, loadCorrections };
