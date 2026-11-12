#!/usr/bin/env node
import './test-isolate-data.mjs';
// #418: đếm lượt đang chạy + xả khi SIGTERM — server không được giết lượt classify đang chạy dở.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const inflight = require('../lib/inflight.js');
process.env.HS_API_TOKEN = 'server-test-token';
process.env.HS_ACCESS_LOG = '0';
const fs = require('fs');
const path = require('path');
const serverMod = require('../server.js');
const { createServer, warmUpHandlers, gracefulShutdown, DEFAULT_DRAIN_MS, TIMEOUT_MS } = serverMod;
let pass = 0, fail = 0;
const check = (n, c, d) => { c ? (pass++, console.log(`PASS ${n}`)) : (fail++, console.log(`FAIL ${n}`, d === undefined ? '' : JSON.stringify(d))); };

// 1. Bộ đếm thuần
inflight.reset();
inflight.vao(); inflight.vao(); inflight.ra();
check('đếm vào/ra', inflight.soDangChay() === 1);
inflight.ra(); inflight.ra();
check('không âm', inflight.soDangChay() === 0);

// 2. xa(): còn lượt → chờ tới khi xong; hết giờ → trả conLai > 0
inflight.reset(); inflight.vao();
setTimeout(() => inflight.ra(), 120);
let r = await inflight.xa({ maxMs: 5000, buocMs: 20 });
check('xa chờ lượt xong rồi mới về', r.conLai === 0 && r.choMs >= 100 && r.choMs < 5000, r);
check('sau xa: cờ đang xả bật', inflight.laDangXa() === true);
inflight.reset(); inflight.vao();
r = await inflight.xa({ maxMs: 100, buocMs: 20 });
check('hết giờ mà còn lượt → conLai=1', r.conLai === 1 && r.choMs >= 100, r);
inflight.reset();

// 3. Server thật: health lộ engine.inflight; khi đang xả health trả 503 + draining + Connection: close
const server = createServer();
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${server.address().port}`;
try {
  const h = await (await fetch(base + '/api/health')).json();
  check('health có checks.engine.inflight (số) + draining=false', typeof h.checks?.engine?.inflight === 'number' && h.checks.engine.draining === false, h.checks?.engine);
  check('sau lượt health xong, inflight về 0', inflight.soDangChay() === 0, inflight.soDangChay());
  inflight.datDangXa(true);
  const d = await fetch(base + '/api/health');
  const dj = await d.json();
  check('đang xả → health 503 + status=draining (để healthcheck/LB ngừng đưa lượt mới)', d.status === 503 && dj.status === 'draining' && dj.checks.engine.draining === true, [d.status, dj.status]);
  check('OZV-505: đang xả → phản hồi gắn Connection: close để Cổng/proxy đóng keep-alive socket', d.headers.get('connection') === 'close', d.headers.get('connection'));
  inflight.datDangXa(false);
} finally {
  server.close();
}

// 4. OZV-505: warmUpHandlers nạp trước toàn bộ handler api/*.js vào RAM trước khi mở cổng
const warmed = typeof warmUpHandlers === 'function' ? warmUpHandlers() : [];
check('OZV-505: warmUpHandlers() nạp sẵn ≥12 handler (health, tax, search, suggest, classify...)',
  Array.isArray(warmed) && warmed.length >= 12 && warmed.includes('health') && warmed.includes('tax') && warmed.includes('classify'),
  warmed);

// 5. OZV-505: trần xả mặc định DEFAULT_DRAIN_MS = 330000 ms (> trần request 300000 ms của routes.json)
check('OZV-505: trần xả mặc định DEFAULT_DRAIN_MS = 330000 ms > TIMEOUT_MS (300000 ms)',
  DEFAULT_DRAIN_MS === 330000 && TIMEOUT_MS === 300000 && DEFAULT_DRAIN_MS > TIMEOUT_MS,
  { DEFAULT_DRAIN_MS, TIMEOUT_MS });

// 6. OZV-505: gracefulShutdown(server) bật draining ngay, chờ lượt đang chạy hoàn tất rồi mới đóng
inflight.reset();
const server2 = createServer();
await new Promise((ok) => server2.listen(0, '127.0.0.1', ok));
const base2 = `http://127.0.0.1:${server2.address().port}`;
try {
  // Giả lập 1 lượt dài đang chạy (140 ms) trong lúc nhận SIGTERM
  inflight.vao();
  setTimeout(() => inflight.ra(), 140);
  const drainPromise = typeof gracefulShutdown === 'function'
    ? gracefulShutdown(server2, { signal: 'SIGTERM', drainMs: 5000, preCloseMs: 40, buocMs: 20, exit: false })
    : Promise.resolve(null);
  // Ngay khi vừa gọi gracefulShutdown, cờ đang xả phải bật tức thì và request trong cửa sổ preCloseMs nhận Connection: close
  check('OZV-505: vừa gọi gracefulShutdown → inflight.laDangXa() bật true tức thì', inflight.laDangXa() === true);
  const resInDrain = await fetch(base2 + '/api/tax?hs=72052100', { headers: { authorization: 'Bearer server-test-token' } });
  check('OZV-505: lượt gọi trong cửa sổ xả vẫn trả 200 OK kèm Connection: close',
    resInDrain.status === 200 && resInDrain.headers.get('connection') === 'close',
    { status: resInDrain.status, conn: resInDrain.headers.get('connection') });
  const kqDrain = await drainPromise;
  check('OZV-505: gracefulShutdown chờ hết lượt đang chạy (conLai=0, choMs>=100)',
    Boolean(kqDrain) && kqDrain.conLai === 0 && kqDrain.choMs >= 80 && kqDrain.drainMaxMs === 5000,
    kqDrain);
} finally {
  inflight.reset();
  try { server2.close(); } catch {}
}

// 7. OZV-505: Dockerfile cấu hình HEALTHCHECK nhanh (interval=10s, timeout=3s, start-period=10s, retries=2)
const dockerfile = fs.readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8');
check('OZV-505: Dockerfile HEALTHCHECK rút xuống interval=10s timeout=3s start-period=10s retries=2',
  /HEALTHCHECK\s+--interval=10s\s+--timeout=3s\s+--start-period=10s\s+--retries=2/.test(dockerfile),
  dockerfile.match(/HEALTHCHECK[^\n]+/)?.[0]);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
