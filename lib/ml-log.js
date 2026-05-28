const fs = require('fs');
const path = require('path');

const ML_LOG_PATH = path.join(process.cwd(), 'data', 'ml-log.jsonl');

function appendSuggestLog(entry) {
  try {
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      endpoint: 'suggest',
      ...entry,
    });
    fs.appendFileSync(ML_LOG_PATH, `${line}\n`, { flag: 'a' });
  } catch {
    // best-effort on read-only FS (Vercel)
  }
}

function readMlLogs() {
  if (!fs.existsSync(ML_LOG_PATH)) return [];
  const lines = fs.readFileSync(ML_LOG_PATH, 'utf8').split('\n').filter(Boolean);
  const out = [];
  for (const line of lines) {
    try { out.push(JSON.parse(line)); } catch { /* skip */ }
  }
  return out;
}

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx];
}

function buildKpiDashboard() {
  const logs = readMlLogs();
  const now = Date.now();
  const day7 = 7 * 86400000;
  const day30 = 30 * 86400000;

  const last7d = logs.filter((r) => now - new Date(r.ts).getTime() < day7);
  const last30d = logs.filter((r) => now - new Date(r.ts).getTime() < day30);

  function summarizePeriod(records) {
    const latencies = records.map((r) => r.ms).filter((n) => typeof n === 'number' && n >= 0);
    latencies.sort((a, b) => a - b);

    const suggestions = records.filter((r) => r.endpoint === 'suggest');
    const total = suggestions.length;
    const overridden = suggestions.filter((r) => r.wasOverridden).length;
    const overrideRate = total > 0 ? Math.round((overridden / total) * 1000) / 10 : null;

    const confidenceValues = suggestions
      .map((r) => r.top1Confidence)
      .filter((n) => typeof n === 'number');
    confidenceValues.sort((a, b) => a - b);

    const hsOverrideCounts = {};
    for (const s of suggestions) {
      if (s.wasOverridden && s.top1Hs) {
        hsOverrideCounts[s.top1Hs] = (hsOverrideCounts[s.top1Hs] || 0) + 1;
      }
    }
    const topOverriddenHs = Object.entries(hsOverrideCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([hsCode, count]) => ({ hsCode, count }));

    return {
      total,
      overridden,
      overrideRate,
      latency: {
        p50: percentile(latencies, 0.5),
        p90: percentile(latencies, 0.9),
        p99: percentile(latencies, 0.99),
        avg: latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null,
      },
      confidence: {
        avg: confidenceValues.length
          ? Math.round(confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length)
          : null,
        p25: percentile(confidenceValues, 0.25),
        p50: percentile(confidenceValues, 0.5),
        p75: percentile(confidenceValues, 0.75),
      },
      topOverriddenHs,
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    totalLogs: logs.length,
    last7d: summarizePeriod(last7d),
    last30d: summarizePeriod(last30d),
    recentSuggests: logs.filter((r) => r.endpoint === 'suggest').slice(-20).reverse(),
  };
}

module.exports = { appendSuggestLog, readMlLogs, buildKpiDashboard };
