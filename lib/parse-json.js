// Parser JSON chịu lỗi cho output LLM reasoning (MiniMax-M2.7 emit <think> + đôi khi cụt).
// Dùng chung cho classify + retrieve-candidates.

function stripWrappers(s) {
  return String(s)
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<\/?think>/gi, '')
    .replace(/```json?/gi, '')
    .replace(/```/g, '')
    .trim();
}

// Vớt mọi object {...} hợp lệ trong text (kể cả khi array cụt giữa chừng)
function salvageObjects(s) {
  const out = [];
  let depth = 0, start = -1;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '{') { if (depth === 0) start = i; depth++; }
    else if (c === '}') { depth--; if (depth === 0 && start >= 0) { try { out.push(JSON.parse(s.slice(start, i + 1))); } catch {} start = -1; } }
  }
  return out;
}

/**
 * parseJsonLoose(content) → object.
 * 1) thử parse nguyên khối {...}; 2) salvage object con; 3) gom thành {results:[...]} nếu là item kết quả.
 */
function parseJsonLoose(content) {
  const s = stripWrappers(content);
  const first = s.indexOf('{'), last = s.lastIndexOf('}');
  if (first >= 0 && last > first) {
    try { return JSON.parse(s.slice(first, last + 1)); } catch { /* salvage */ }
  }
  const objs = salvageObjects(s);
  // object có 'results' hoặc 'headings' → là wrapper
  const wrapper = objs.find((o) => Array.isArray(o.results) || Array.isArray(o.headings));
  if (wrapper) return wrapper;
  // các object con là item kết quả (có hs/confidence) → bọc lại
  const items = objs.filter((o) => o.hs || o.confidence !== undefined);
  if (items.length) return { results: items, missing: [] };
  if (objs.length) return objs[0];
  throw new Error('No parseable JSON in LLM output');
}

module.exports = { parseJsonLoose, stripWrappers, salvageObjects };
