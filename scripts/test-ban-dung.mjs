#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * Kiểm chứng OZV-724: /api/health trả `commit` + `buildTime` để mọi phép đo prod biết đang đo bản nào.
 *
 * 1) lib/ban-dung.js: đọc biến môi trường build (SOURCE_COMMIT/GITHUB_SHA, BUILD_TIME), chuẩn hoá SHA 12
 *    ký tự + ISO UTC; rác/thiếu ⇒ null, KHÔNG ném.
 * 2) /api/health: có hai khoá mới, giữ nguyên khoá cũ ERP đang đọc (status, dataStatus, service...),
 *    và KHÔNG lộ tên nhánh / đường dẫn / tên biến môi trường ra phản hồi công khai.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { banDung, chuanSha, chuanThoiGian } = require('../lib/ban-dung');

let pass = 0;
let fail = 0;
function check(name, cond, detail) {
  if (cond) {
    pass++;
    console.log(`PASS ${name}`);
  } else {
    fail++;
    console.log(`FAIL ${name}`, detail === undefined ? '' : JSON.stringify(detail));
  }
}

// ── 1. chuẩn hoá ────────────────────────────────────────────────────────────────────────────────
check('chuanSha: SHA 40 ký tự → 12 ký tự chữ thường', chuanSha('A30B2334C0FFEE1234567890abcdef1234567890') === 'a30b2334c0ff');
check('chuanSha: SHA ngắn 7 ký tự giữ nguyên', chuanSha('a30b233') === 'a30b233');
check('chuanSha: chuỗi không phải SHA → null', chuanSha('refs/heads/main') === null);
check('chuanSha: rỗng / undefined / null → null', chuanSha('') === null && chuanSha(undefined) === null && chuanSha(null) === null);
check('chuanThoiGian: ISO → ISO UTC', chuanThoiGian('2026-11-13T10:00:00Z') === '2026-11-13T10:00:00.000Z');
check('chuanThoiGian: rác → null', chuanThoiGian('hôm qua') === null && chuanThoiGian('') === null);

// ── 2. banDung đọc biến môi trường ──────────────────────────────────────────────────────────────
const bd1 = banDung({ SOURCE_COMMIT: 'a30b2334c0ffee1234567890abcdef1234567890', BUILD_TIME: '2026-11-13T10:00:00Z' });
check('banDung: lấy SOURCE_COMMIT + BUILD_TIME', bd1.commit === 'a30b2334c0ff' && bd1.buildTime === '2026-11-13T10:00:00.000Z', bd1);

const bd2 = banDung({ GITHUB_SHA: '0f11808d1234567890abcdef1234567890abcdef' });
check('banDung: dự phòng GITHUB_SHA khi không có SOURCE_COMMIT', bd2.commit === '0f11808d1234', bd2);

const bd3 = banDung({ SOURCE_COMMIT: 'không-phải-sha', BUILD_TIME: 'hôm kia' });
check('banDung: biến rác → không ném, commit/buildTime không nhận giá trị rác', bd3.commit !== 'không-phải-sha' && bd3.buildTime === null, bd3);

const bd4 = banDung({});
check('banDung: env rỗng → trả object đủ 2 khoá, không ném', bd4 && 'commit' in bd4 && 'buildTime' in bd4, bd4);
check('banDung: env rỗng → buildTime là null hoặc ISO hợp lệ', bd4.buildTime === null || !Number.isNaN(new Date(bd4.buildTime).getTime()), bd4);
check('banDung: env rỗng → commit là null hoặc SHA ngắn (đọc .git khi dev local)', bd4.commit === null || /^[0-9a-f]{7,12}$/.test(bd4.commit), bd4);

// ── 3. /api/health ──────────────────────────────────────────────────────────────────────────────
const healthHandler = require('../api/health');
function goiHealth() {
  let body = null;
  let code = null;
  const req = { method: 'GET', headers: {} };
  const res = {
    setHeader() {},
    status(c) {
      code = c;
      return this;
    },
    json(payload) {
      body = payload;
      return this;
    },
  };
  healthHandler(req, res);
  return { body, code };
}

const cu = process.env.SOURCE_COMMIT;
const cuTime = process.env.BUILD_TIME;
process.env.SOURCE_COMMIT = 'a30b2334c0ffee1234567890abcdef1234567890';
process.env.BUILD_TIME = '2026-11-13T10:00:00Z';
const { body: h } = goiHealth();
if (cu === undefined) delete process.env.SOURCE_COMMIT; else process.env.SOURCE_COMMIT = cu;
if (cuTime === undefined) delete process.env.BUILD_TIME; else process.env.BUILD_TIME = cuTime;

check('/api/health: có khoá commit + buildTime', Boolean(h) && 'commit' in h && 'buildTime' in h, h && Object.keys(h));
check('/api/health: commit là SHA ngắn hoặc null', h?.commit === null || /^[0-9a-f]{7,12}$/.test(h?.commit || ''), h?.commit);
check('/api/health: buildTime là ISO hoặc null', h?.buildTime === null || !Number.isNaN(new Date(h?.buildTime).getTime()), h?.buildTime);
check(
  '/api/health: giữ nguyên khoá cũ ERP đang đọc',
  ['service', 'version', 'status', 'dataStatus', 'checks', 'stats', 'timestamp'].every((k) => k in (h || {})),
  h && Object.keys(h),
);

// Ràng buộc: endpoint công khai — không lộ tên nhánh / đường dẫn máy chủ / tên biến môi trường.
const chuoi = JSON.stringify(h || {});
check('/api/health: không lộ tên nhánh (refs/heads, ozv-...)', !/refs\/heads|\bmain\b|ozv-\d+/i.test(chuoi), chuoi.slice(0, 200));
check('/api/health: không lộ đường dẫn máy chủ', !/\/paperclip|\/home\/|\/app\/|\/data\//.test(chuoi), chuoi.slice(0, 200));
// (checks.llm.note ở main vốn nêu TÊN biến LLM cần đặt — đó là hướng dẫn cấu hình, không phải giá trị khoá,
//  và không thuộc phạm vi OZV-724. Ở đây chỉ chặn hai biến build mới + chính giá trị khoá.)
check('/api/health: không lộ tên biến build', !/SOURCE_COMMIT|BUILD_TIME|GITHUB_SHA/.test(chuoi), chuoi.slice(0, 200));
check(
  '/api/health: không lộ giá trị khoá đang đặt trong môi trường',
  !Object.entries(process.env)
    .filter(([k, v]) => /KEY|TOKEN|SECRET|PASSWORD|DATABASE_URL/i.test(k) && String(v || '').length >= 8)
    .some(([, v]) => chuoi.includes(v)),
);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
