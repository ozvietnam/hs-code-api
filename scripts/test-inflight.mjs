#!/usr/bin/env node
import './test-isolate-data.mjs';
// #418: đếm lượt đang chạy + xả khi SIGTERM — server không được giết lượt classify đang chạy dở.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const inflight = require('../lib/inflight.js');
process.env.HS_API_TOKEN = 'server-test-token';
process.env.HS_ACCESS_LOG = '0';
const { createServer } = require('../server.js');
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

// 3. Server thật: health lộ engine.inflight; khi đang xả health trả 503 + draining
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
  inflight.datDangXa(false);
} finally {
  server.close();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
