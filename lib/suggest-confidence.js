function getRecencyWeight(date) {
  if (!date) return 0.6;
  const ts = Date.parse(date);
  if (!Number.isFinite(ts)) return 0.6;
  const ageDays = Math.max(0, (Date.now() - ts) / (1000 * 60 * 60 * 24));
  const halfLifeDays = 365;
  const weight = Math.pow(0.5, ageDays / halfLifeDays);
  return Math.min(1, Math.max(0.3, weight));
}

function applyHistoricalSignals({ suggestions, ozPrecedents, evidenceByHs }) {
  const hydrated = suggestions.map((suggestion) => {
    const related = ozPrecedents.filter((item) => item.hsCode === suggestion.hsCode);
    const approved = related.find((item) => item.outcome === 'APPROVED');
    const policyConflict = Boolean(evidenceByHs.get(suggestion.hsCode)?.hasPolicyWarning);
    const baseConfidence = Number(suggestion.confidence) || 0;
    let ozPrecedentBoost = 0;
    let recencyWeight = 0;
    if (approved && !policyConflict) {
      recencyWeight = getRecencyWeight(approved.date);
      ozPrecedentBoost = Math.round(Math.max(0, approved.similarity) * 6 * recencyWeight);
    }
    return {
      ...suggestion,
      confidence: Math.min(100, baseConfidence + ozPrecedentBoost),
      confidenceBreakdown: {
        baseConfidence,
        ozPrecedentBoost,
        precedentSimilarity: approved ? Number(approved.similarity.toFixed(3)) : null,
        recencyWeight: approved ? Number(recencyWeight.toFixed(3)) : null,
        policyConflictBlockedBoost: policyConflict && Boolean(approved),
      },
    };
  });

  const ozRejectedWarnings = ozPrecedents
    .filter((item) => item.outcome === 'REJECTED' && hydrated.some((s) => s.hsCode === item.hsCode))
    .map((item) => ({
      hsCode: item.hsCode,
      message: `Oz từng bị bác mã này ở tờ khai ${item.declId}`,
    }));
  const historicalOnlyWarnings = hydrated
    .filter((suggestion) => ozPrecedents.some((item) => item.hsCode === suggestion.hsCode))
    .map((suggestion) => ({
      hsCode: suggestion.hsCode,
      message: 'Historical precedent only: cần đối chiếu biểu thuế/policy hiện hành trước khi chốt mã.',
    }));
  const conflictWarnings = hydrated
    .filter((suggestion) => evidenceByHs.get(suggestion.hsCode)?.hasPolicyWarning)
    .map((suggestion) => ({
      hsCode: suggestion.hsCode,
      message: 'Policy hiện hành có cảnh báo, hệ thống không cộng confidence boost từ historical precedent.',
    }));

  return {
    suggestions: hydrated,
    warnings: [...ozRejectedWarnings, ...historicalOnlyWarnings, ...conflictWarnings],
  };
}

module.exports = {
  getRecencyWeight,
  applyHistoricalSignals,
};
