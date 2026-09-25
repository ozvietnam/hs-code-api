// Sổ ngân sách (§2.1 nguyên tắc 6, §2.4). Hai loại trần:
//   - theo JOB cho mỗi lần chạy: fetch, llm, phút  (config/jobs.json)
//   - theo PROVIDER mỗi ngày UTC: request, token     (config/providers.json)
// Hết trần là dừng và báo, không "làm cho có".
import { load, save } from './store.mjs';

export class BudgetExceeded extends Error {
  constructor(kind, limit) {
    super(`hết ngân sách ${kind} (${limit})`);
    this.kind = kind;
  }
}

export function createRunBudget(limits = {}) {
  const used = { fetch: 0, llm: 0 };
  const started = Date.now();
  return {
    used,
    limits,
    spend(kind, n = 1) {
      const limit = limits[kind];
      if (limit != null && used[kind] + n > limit) throw new BudgetExceeded(kind, limit);
      used[kind] = (used[kind] || 0) + n;
    },
    remaining(kind) {
      const limit = limits[kind];
      return limit == null ? Infinity : Math.max(0, limit - (used[kind] || 0));
    },
    checkTime() {
      if (limits.minutes && Date.now() - started > limits.minutes * 60000) throw new BudgetExceeded('minutes', limits.minutes);
    },
  };
}

const utcDay = () => new Date().toISOString().slice(0, 10);

/** Sổ provider dùng chung giữa các job, reset mỗi ngày UTC. */
export function providerLedger() {
  const book = load('ledger', { day: utcDay(), providers: {}, history: [] });
  if (book.day !== utcDay()) {
    book.history.push({ day: book.day, providers: book.providers });
    book.history = book.history.slice(-60);
    book.day = utcDay();
    book.providers = {};
  }
  const row = (name) => (book.providers[name] ||= { requests: 0, tokens: 0, errors: 0, restUntil: 0 });
  return {
    book,
    canUse(p) {
      const r = row(p.name);
      if (r.restUntil && Date.now() < r.restUntil) return false;
      if (p.dailyRequests != null && r.requests >= p.dailyRequests) return false;
      if (p.dailyTokens != null && r.tokens >= p.dailyTokens) return false;
      return true;
    },
    record(name, { tokens = 0, ok = true, rateLimited = false } = {}) {
      const r = row(name);
      r.requests += 1;
      r.tokens += tokens;
      if (!ok) r.errors += 1;
      // 429 hai lần liên tiếp → nghỉ 1 giờ (§2.4)
      r.recent429 = rateLimited ? (r.recent429 || 0) + 1 : 0;
      if (r.recent429 >= 2) { r.restUntil = Date.now() + 3600 * 1000; r.recent429 = 0; }
      save('ledger', book);
    },
    flush() { save('ledger', book); },
  };
}
