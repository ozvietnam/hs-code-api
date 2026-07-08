// Conflict Resolver — bảng quyết định deterministic (DESIGN 2026-07-08).
// Post-refiner trên top-3 LLM; chỉ override khi attrs đủ evidence cứng.

function resolveAttr(attrs, canonicalKey, registry) {
  const def = registry?.[canonicalKey];
  if (!def) return { value: null, present: false };
  const raw = attrs?.[canonicalKey] ?? (def.aliasVi ? attrs?.[def.aliasVi] : undefined);
  if (raw == null || String(raw).trim() === '') return { value: null, present: false };
  const value = String(raw).trim();
  return { value, present: true };
}

function narrowMembers(table, inputs) {
  const narrowed = table.members.filter((hs) =>
    table.rules.some((r) =>
      r.hs === hs && Object.keys(r.when).every((k) => !(k in inputs) || inputs[k] === r.when[k]),
    ),
  );
  return [...new Set(narrowed)];
}

function pickRule(matched, hitPolicy) {
  if (!matched.length) return null;
  if (hitPolicy === 'PRIORITY') {
    return matched.reduce((best, r) => (r.priority > best.priority ? r : best), matched[0]);
  }
  return matched[0];
}

function resolveConflict(top, results, attrs, deps = {}) {
  try {
    if (!top?.hs || top.hs.length !== 8) {
      return { status: 'SKIP', reason: 'no 8-digit top' };
    }

    const conflictsDb = deps.conflictsDb || {};
    const tablesDb = deps.tablesDb || {};
    const registry = deps.registry || {};

    const group = conflictsDb[top.hs]?.group;
    if (!group) return { status: 'SKIP', reason: 'no group' };

    const table = tablesDb.tables?.[group];
    if (!table) return { status: 'SKIP', reason: 'no table' };

    const inputs = {};
    const ask = [];

    for (const inp of table.inputs || []) {
      const def = registry[inp.attribute];
      if (!def) continue;
      const { value, present } = resolveAttr(attrs, inp.attribute, registry);
      if (present && def.domain.includes(value)) {
        inputs[inp.attribute] = value;
      } else {
        ask.push({ attribute: inp.attribute, questionVi: def.questionVi });
      }
    }

    const matched = (table.rules || []).filter((r) =>
      Object.keys(r.when).every((k) => inputs[k] === r.when[k]),
    );

    if (matched.length >= 1) {
      const pick = pickRule(matched, table.hitPolicy || 'PRIORITY');
      const trace = [{
        ruleId: pick.id,
        when: pick.when,
        hs: pick.hs,
        gir: pick.gir,
        reasonVi: pick.reasonVi,
        source: pick.source,
      }];
      const overrodeLlm = pick.hs !== top.hs;
      return {
        status: 'RESOLVED',
        group,
        decidedHs: pick.hs,
        overrodeLlm,
        gir: pick.gir,
        reasonVi: pick.reasonVi,
        trace,
        ask: [],
      };
    }

    const narrowed = narrowMembers(table, inputs);
    if (ask.length) {
      return { status: 'INSUFFICIENT', group, narrowed, ask, trace: [] };
    }
    return { status: 'NARROWED', group, narrowed, ask: [], trace: [] };
  } catch {
    return { status: 'SKIP', reason: 'resolver error' };
  }
}

module.exports = { resolveConflict, resolveAttr, narrowMembers };
