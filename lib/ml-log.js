const fs = require('fs');
const { dataPath } = require('./data-paths');
const { mlLogDuocPhep, maLuotHienTai } = require('./share-consent');

const ML_LOG_PATH = dataPath('ml-log.jsonl');
const FEEDBACK_PATH = dataPath('feedback.jsonl');

function appendSuggestLog(entry) {
  // #261: lượt khách KHÔNG đồng ý chia sẻ → không ghi ml-log (mọi trường đều dẫn từ mô tả hàng).
  if (!mlLogDuocPhep()) return;
  try {
    const luot = maLuotHienTai();
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      endpoint: 'suggest',
      ...(luot ? { maLuot: luot } : {}),
      ...entry,
    });
    fs.appendFileSync(ML_LOG_PATH, `${line}\n`, { flag: 'a' });
  } catch {
    // best-effort on read-only FS
  }
}

/**
 * Bước 12 C-2 (#307): ghi lại lượt tín hiệu `signal:mic` ảnh hưởng xếp hạng ứng viên.
 * BỎ QUA hoàn toàn khi MIC_OFF=1 (tín hiệu không chạy nên không ghi log).
 * shape best-effort JSONL tương tự appendSuggestLog; tag endpoint='signal:mic' để KPI dashboard
 * sau này đếm được tỉ lệ lượt có/không có tín hiệu MIC mà không trộn với lượt suggest.
 */
function appendSignalMicLog(entry) {
  if (process.env.MIC_OFF === '1') return;
  // #261: tín hiệu mic mang tên/model hàng của khách → cùng luật ml-log.
  if (!mlLogDuocPhep()) return;
  try {
    const luot = maLuotHienTai();
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      endpoint: 'signal:mic',
      ...(luot ? { maLuot: luot } : {}),
      ...entry,
    });
    fs.appendFileSync(ML_LOG_PATH, `${line}\n`, { flag: 'a' });
  } catch {
    // best-effort on read-only FS
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

function readFeedbackOverrides() {
  if (!fs.existsSync(FEEDBACK_PATH)) return { total: 0, overrides: 0 };
  const lines = fs.readFileSync(FEEDBACK_PATH, 'utf8').split('\n').filter(Boolean);
  let overrides = 0;
  for (const line of lines) {
    try {
      const r = JSON.parse(line);
      if (r.feedbackType === 'DIRECTOR_HS_OVERRIDE') overrides++;
    } catch { /* skip */ }
  }
  return { total: lines.length, overrides };
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

  const feedbackStats = readFeedbackOverrides();
  const suggestCount = logs.filter((r) => r.endpoint === 'suggest').length;
  const feedbackOverrideRate = suggestCount > 0
    ? Math.round((feedbackStats.overrides / suggestCount) * 1000) / 10
    : null;

  return {
    generatedAt: new Date().toISOString(),
    totalLogs: logs.length,
    last7d: summarizePeriod(last7d),
    last30d: summarizePeriod(last30d),
    recentSuggests: logs.filter((r) => r.endpoint === 'suggest').slice(-20).reverse(),
    feedbackStats: {
      totalFeedback: feedbackStats.total,
      directorOverrides: feedbackStats.overrides,
      overrideRateVsSuggests: feedbackOverrideRate,
      note: 'Override rate computed from feedback.jsonl vs ml-log.jsonl totals',
    },
  };
}

module.exports = { appendSuggestLog, appendSignalMicLog, readMlLogs, buildKpiDashboard };
