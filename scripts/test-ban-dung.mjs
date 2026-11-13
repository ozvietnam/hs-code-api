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
import fs from 'fs';
import os from 'os';
import path from 'path';
const require = createRequire(import.meta.url);
const { banDung, chuanSha, chuanThoiGian, docTepThoiGian } = require('../lib/ban-dung');

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

// ── 2b. OZV-755: LÝ DO vì sao rỗng ──────────────────────────────────────────────────────────────
// prod trả commit:null + buildTime:null mà không nói vì sao ⇒ không phân biệt được "ảnh không dựng
// bằng Dockerfile của repo" (không có tệp .build-time) với "dựng đúng nhưng đọc không nổi tệp".
check('banDung: có biến hợp lệ → không có lyDo', bd1.lyDo === undefined || bd1.lyDo === null, bd1.lyDo);

// `{ git: false }` dựng lại đúng cảnh prod: ảnh không có .git nên không có dự phòng nào cho commit.
const bdL1 = banDung({}, { git: false });
check('banDung: env rỗng → lyDo.commit là mã slug', typeof bdL1.lyDo?.commit === 'string' && /^[a-z-]+$/.test(bdL1.lyDo.commit), bdL1.lyDo);
check('banDung: env rỗng, không có biến commit → lyDo.commit = khong-co-bien', bdL1.lyDo?.commit === 'khong-co-bien', bdL1.lyDo);

const bdL2 = banDung({ SOURCE_COMMIT: 'không-phải-sha', BUILD_TIME: 'hôm kia' }, { git: false });
check('banDung: biến rác → lyDo.commit = bien-sai-dinh-dang', bdL2.lyDo?.commit === 'bien-sai-dinh-dang', bdL2.lyDo);
check('banDung: biến thời gian rác → lyDo.buildTime = bien-sai-dinh-dang', bdL2.lyDo?.buildTime === 'bien-sai-dinh-dang', bdL2.lyDo);

// Tín hiệu phân biệt hai giả thuyết: đọc tệp .build-time ở đường dẫn chỉ định.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ozv755-'));
const tepThieu = path.join(tmp, 'khong-ton-tai');
const tepRong = path.join(tmp, 'rong');
const tepRac = path.join(tmp, 'rac');
const tepTot = path.join(tmp, 'tot');
fs.writeFileSync(tepRong, '   \n');
fs.writeFileSync(tepRac, 'hôm kia\n');
fs.writeFileSync(tepTot, '2026-11-13T10:00:00Z\n');

check('docTepThoiGian: tệp KHÔNG tồn tại → khong-co-tep (ảnh không dựng bằng Dockerfile repo)',
  docTepThoiGian(tepThieu).lyDo === 'khong-co-tep', docTepThoiGian(tepThieu));
check('docTepThoiGian: tệp rỗng → tep-rong', docTepThoiGian(tepRong).lyDo === 'tep-rong', docTepThoiGian(tepRong));
check('docTepThoiGian: tệp có rác → tep-sai-dinh-dang', docTepThoiGian(tepRac).lyDo === 'tep-sai-dinh-dang', docTepThoiGian(tepRac));
check('docTepThoiGian: tệp hợp lệ → có buildTime, không có lyDo',
  docTepThoiGian(tepTot).buildTime === '2026-11-13T10:00:00.000Z' && !docTepThoiGian(tepTot).lyDo, docTepThoiGian(tepTot));

// Giả thuyết 2 (quyền đọc): chmod 000 — bỏ qua khi chạy bằng root vì root đọc được mọi tệp.
fs.chmodSync(tepTot, 0o000);
const khiCam = docTepThoiGian(tepTot);
if (typeof process.getuid === 'function' && process.getuid() === 0) {
  console.log('SKIP docTepThoiGian: chạy bằng root nên không thử được ca cấm đọc');
} else {
  check('docTepThoiGian: cấm đọc → khong-doc-duoc-tep (khác hẳn khong-co-tep)', khiCam.lyDo === 'khong-doc-duoc-tep', khiCam);
}
fs.chmodSync(tepTot, 0o644);
fs.rmSync(tmp, { recursive: true, force: true });

// Dựng lại ĐÚNG cảnh prod đang gặp: không biến, không .git, không tệp .build-time.
const nhuProd = banDung({}, { git: false, tep: tepThieu });
check('banDung: cảnh prod (không biến + không tệp) → lyDo đủ hai mặt',
  nhuProd.commit === null && nhuProd.buildTime === null
    && nhuProd.lyDo?.commit === 'khong-co-bien' && nhuProd.lyDo?.buildTime === 'khong-co-tep', nhuProd);

check('mã lý do: không lộ đường dẫn / tên biến môi trường',
  ['khong-co-bien', 'bien-sai-dinh-dang', 'khong-co-tep', 'tep-rong', 'tep-sai-dinh-dang', 'khong-doc-duoc-tep']
    .every((m) => /^[a-z-]+$/.test(m)));

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

check('/api/health: có biến build hợp lệ → KHÔNG kèm banDungLyDo', !('banDungLyDo' in (h || {})), h && Object.keys(h));

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
