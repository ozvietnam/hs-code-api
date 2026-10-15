/**
 * Tuân thủ crawl cho mọi crawler nguồn ngoài (bước 12 — thẻ C-4, #299): robots.txt + giới hạn tần suất.
 * Không phụ thuộc thư viện ngoài; fetcher tiêm từ ngoài để test được và để crawler tự chọn agent.
 *
 * Luật sắt (docs/backlog/12-tien-le-quoc-te-dinh-danh-hang-mic.md, Nguyên tắc 3-4):
 *   - Mọi crawler PHẢI qua isAllowed() trước mỗi lượt lấy; robots không cho phép → không lấy.
 *   - Mọi crawler PHẢI qua bucket.take() để giữ QPS; không gọi fetch tự do.
 *   - robots.txt được cache theo TTL (mặc định 12 h) — không hỏi lại mỗi lượt.
 */
const ROBOTS_TTL_MS = 12 * 3600 * 1000;

/** Phân tích robots.txt dạng tối giản: nhóm User-agent gần nhất + Disallow/Allow/Crawl-delay.
 *  Hỗ trợ wildcard '*' trong pattern (chuẩn robots hỗ trợ tại mức Google). */
function parseRobots(text, userAgent = '*') {
  const groups = [];
  let cur = null;
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const [, key, val] = m;
    const k = key.toLowerCase();
    if (k === 'user-agent') {
      const ua = val.trim();
      // Đã có rule rồi lại gặp User-agent → nhóm mới; nhiều dòng User-agent liền nhau = cùng nhóm.
      if (cur && cur.touched) { groups.push(cur); cur = null; }
      if (!cur) cur = { uas: [], rules: [], delay: null, touched: false };
      cur.uas.push(ua.toLowerCase());
      cur.touched = false;
    } else if (cur) {
      cur.touched = true;
      if (k === 'disallow' || k === 'allow') cur.rules.push({ allow: k === 'allow', path: val.trim() });
      else if (k === 'crawl-delay') { const d = Number(val); if (Number.isFinite(d) && d > 0) cur.delay = d; }
    }
  }
  if (cur && cur.uas.length) groups.push(cur);
  const ua = String(userAgent || '*').toLowerCase();
  // Chọn nhóm khớp UA riêng trước, rồi mới '*'.
  const hit = groups.find((g) => g.uas.includes(ua)) || groups.find((g) => g.uas.includes('*')) || { rules: [], delay: null, uas: [] };
  return { rules: hit.rules, delayMs: hit.delay != null ? hit.delay * 1000 : null };
}

const pathToRe = (p) => new RegExp('^' + String(p).split('*').map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*'));

/** Có được phép lấy path này không (theo robots đã phân tích). Quy tắc xấp xỉ chuẩn: cụ thể nhất thắng. */
function isAllowed(robots, pathname) {
  const path = String(pathname || '/').split('?')[0] || '/';
  let best = null; // {allow, len}
  for (const r of robots.rules || []) {
    if (!r.path) continue;
    if (pathToRe(r.path).test(path) || pathToRe(r.path).test(path + '/')) {
      if (!best || r.path.length > best.len) best = { allow: r.allow, len: r.path.length };
    }
  }
  return best ? best.allow : true; // không rule → cho phép
}

/** Thùng token cố định dung lượng (token bucket): take() chờ tới khi có lượt. Đồng hồ/sleep tiêm được. */
class RateLimiter {
  constructor({ qps = 1, now = () => Date.now(), sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
    if (!(qps > 0)) throw new Error('qps phải > 0');
    this.interval = 1000 / qps;
    this.nextAt = 0;
    this.now = now; this.sleep = sleep; this.taken = 0;
  }
  async take() {
    const t = this.now();
    if (t < this.nextAt) await this.sleep(this.nextAt - t);
    this.nextAt = Math.max(this.nextAt, this.now()) + this.interval;
    this.taken += 1;
    return true;
  }
}

/** Bộ.fetch tuân thủ: robots (cache TTL) + rate limit. fetchFn tiêm được; mặc định global fetch. */
function makeCompliantFetcher({ fetchFn, qps = 1, userAgent, robotsTtlMs = ROBOTS_TTL_MS, now = () => Date.now() } = {}) {
  const f = fetchFn || ((url, opts) => fetch(url, opts));
  const bucket = new RateLimiter({ qps });
  const robotsCache = new Map(); // origin → {robots, expiresAt}
  const opts = { headers: { 'user-agent': userAgent || 'oz-hs-crawler/1.0 (+compliance robots; contact: ozfreight)' } };

  async function robotsFor(origin) {
    const hit = robotsCache.get(origin);
    if (hit && hit.expiresAt > now()) return hit.robots;
    let text = '';
    try {
      const r = await f(origin + '/robots.txt', opts);
      if (r.ok) text = await r.text();
    } catch { /* không đọc được robots → coi như không có rule; vẫn rate limit */ }
    const robots = parseRobots(text);
    robotsCache.set(origin, { robots, expiresAt: now() + robotsTtlMs });
    return robots;
  }

  return {
    /** GET một URL sau khi kiểm robots + chờ lượt. Trả response của fetchFn. */
    async get(url) {
      const u = new URL(url);
      const robots = await robotsFor(u.origin);
      if (!isAllowed(robots, u.pathname)) { const e = new Error(`robots.txt không cho phép ${u.pathname}`); e.code = 'ROBOTS_DISALLOWED'; throw e; }
      if (robots.delayMs && robots.delayMs > bucket.interval) await new RateLimiter({ qps: 1000 / robots.delayMs, now: bucket.now, sleep: bucket.sleep }).take();
      else await bucket.take();
      return f(url, opts);
    },
    bucket,
  };
}

module.exports = { parseRobots, isAllowed, RateLimiter, makeCompliantFetcher, ROBOTS_TTL_MS };
