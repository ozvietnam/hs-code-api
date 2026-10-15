// lib/crawl-compliance.js — robots.txt + rate limiter (bước 12, thẻ C-4). Tất định, không mạng.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { parseRobots, isAllowed, RateLimiter, makeCompliantFetcher } = require('../lib/crawl-compliance.js');

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${x}`); } };

// ── robots.txt ──
const txt = `# robots
User-agent: *
Disallow: /admin
Disallow: /api/private*
Allow: /api/public
Crawl-delay: 2

User-agent: BadBot
Disallow: /
`;
const rb = parseRobots(txt, 'GoodBot/1.0');
check('nhóm * áp cho UA lạ: chặn /admin, cho /api/public', isAllowed(rb, '/admin') === false && isAllowed(rb, '/api/public') === true && isAllowed(rb, '/api/ruling/M1') === true);
check('Crawl-delay đọc được (2 s)', rb.delayMs === 2000);
const rbBad = parseRobots(txt, 'BadBot');
check('UA bị chặn riêng: Disallow / → mọi đường bị chặn', isAllowed(rbBad, '/anything') === false);
check('Allow cụ thể hơn Disallow thắng (/api/public dưới /api/private* không khớp)', isAllowed(rb, '/api/private/x') === false);
check('robots rỗng → cho phép tất cả', isAllowed(parseRobots(''), '/x') === true);
check('wildcard: Disallow /api/private* chặn /api/privateXYZ', isAllowed(parseRobots('User-agent: *\nDisallow: /api/private*'), '/api/privateXYZ') === false);

// ── rate limiter ──
{
  let clock = 1000;
  const slept = [];
  const rl = new RateLimiter({ qps: 2, now: () => clock, sleep: async (ms) => { clock += ms; slept.push(ms); } });
  await rl.take();
  check('lượt đầu không chờ', slept.length === 0);
  await rl.take();
  check('lượt hai chờ đúng 1/qps = 500 ms', slept.length === 1 && slept[0] === 500);
  await rl.take();
  check('lượt ba chờ tiếp 500 ms (đồng hồ tiến bởi sleep)', slept.length === 2 && slept[1] === 500 && rl.taken === 3);
}

// ── fetcher tuân thủ ──
{
  const calls = [];
  let clock = 0;
  const fx = makeCompliantFetcher({
    qps: 10,
    now: () => clock,
    fetchFn: async (url) => {
      calls.push(String(url));
      if (String(url).endsWith('/robots.txt')) return { ok: true, text: async () => 'User-agent: *\nDisallow: /secret\n' };
      return { ok: true, text: async () => `body ${url}` };
    },
  });
  const r = await fx.get('https://x.test/api/ruling/M1');
  check('lấy được qua robots (2 lượt gọi: robots + url)', (await r.text()) === 'body https://x.test/api/ruling/M1' && calls.length === 2);
  let denied = null;
  try { await fx.get('https://x.test/secret/page'); } catch (e) { denied = e; }
  check('robots chặn → lỗi ROBOTS_DISALLOWED, không gọi fetch trang', denied?.code === 'ROBOTS_DISALLOWED' && calls.length === 2);
  await fx.get('https://x.test/api/ruling/M2');
  check('robots được cache — lượt sau không hỏi lại robots.txt', calls.length === 3 && calls.filter((c) => c.endsWith('robots.txt')).length === 1);
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
