#!/usr/bin/env node
/**
 * Khoá chặt ranh giới công khai / riêng tư.
 *
 * Mở nhầm một resource là lộ dữ liệu vận hành hoặc tri thức kinh doanh — sai kiểu
 * này không có cách sửa êm vì dữ liệu đã ra ngoài. Test này tồn tại để không ai
 * (kể cả AI) vô tình nới allowlist mà không nhận ra.
 */
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  isPublicRead,
  publicReadEnabled,
  PUBLIC_DATASET_RESOURCES,
  PUBLIC_ENDPOINTS,
} = require('../lib/public-access.js');

let passed = 0;
let failed = 0;
function assert(name, cond, detail) {
  if (cond) {
    console.log('PASS', name);
    passed += 1;
  } else {
    console.log('FAIL', name, detail === undefined ? '' : JSON.stringify(detail));
    failed += 1;
  }
}

// --- PHẢI KÍN: dữ liệu vận hành + tri thức kinh doanh + nội dung chưa verify ---
const MUST_STAY_PRIVATE = [
  ['admin_overview', 'dashboard vận hành'],
  ['admin_audit', 'nhật ký sửa dữ liệu'],
  ['admin_suggestions', 'đề xuất nội bộ'],
  ['kpi', 'chỉ số kinh doanh'],
  ['error_log', 'log lỗi hệ thống'],
  ['prompt_versions', 'prompt nội bộ'],
  ['oz_precedents', 'lịch sử tờ khai của Oz — tri thức kinh doanh riêng'],
  ['trademark', 'cảnh báo SHTT mới verify 1/53 nhãn'],
];
for (const [resource, why] of MUST_STAY_PRIVATE) {
  assert(
    `KÍN: dataset?resource=${resource} (${why})`,
    isPublicRead({ endpoint: 'dataset', resource, method: 'GET' }) === false,
  );
  assert(
    `KÍN: ${resource} không nằm trong allowlist`,
    !PUBLIC_DATASET_RESOURCES.has(resource),
  );
}

// --- PHẢI KÍN: mọi endpoint đốt tiền LLM --------------------------------------
for (const endpoint of ['suggest', 'describe', 'classify', 'match', 'feedback']) {
  assert(
    `KÍN: /api/${endpoint} (gọi LLM hoặc ghi dữ liệu)`,
    isPublicRead({ endpoint, method: 'GET' }) === false,
  );
  assert(`KÍN: ${endpoint} không nằm trong allowlist`, !PUBLIC_ENDPOINTS.has(endpoint));
}

// --- ĐƯỢC MỞ: kho tri thức tra cứu -------------------------------------------
for (const endpoint of ['tax', 'search', 'notes', 'kg_chapter', 'customs-types']) {
  assert(`MỞ: /api/${endpoint}`, isPublicRead({ endpoint, method: 'GET' }) === true);
}
for (const resource of ['kg_stats', 'chapters', 'conflicts', 'precedents', 'ministries', 'legal_docs', 'products', 'accuracy', 'data_quality']) {
  assert(`MỞ: dataset?resource=${resource}`, isPublicRead({ endpoint: 'dataset', resource, method: 'GET' }) === true);
}

// --- Chỉ GET/HEAD mới được mở -------------------------------------------------
for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
  assert(`${method} không bao giờ công khai (tax)`, isPublicRead({ endpoint: 'tax', method }) === false);
  assert(
    `${method} không bao giờ công khai (dataset/products)`,
    isPublicRead({ endpoint: 'dataset', resource: 'products', method }) === false,
  );
}
assert('HEAD được phép như GET', isPublicRead({ endpoint: 'tax', method: 'HEAD' }) === true);

// --- Resource lạ mặc định KÍN (allowlist, không phải blocklist) ---------------
for (const resource of ['', 'resource_moi_them', 'admin_bat_ky', '../../etc/passwd']) {
  assert(
    `resource lạ mặc định KÍN: ${JSON.stringify(resource)}`,
    isPublicRead({ endpoint: 'dataset', resource, method: 'GET' }) === false,
  );
}

// BẤT BIẾN QUAN TRỌNG: chuẩn hoá của lớp phân quyền phải TRÙNG với chuẩn hoá của
// định tuyến. api/dataset.js làm `String(req.query.resource||'').trim()` rồi mới
// route, nên public-access cũng phải trim. Lệch nhau là sinh lỗ hổng: một chuỗi
// có thể route tới resource kín mà lại lọt qua kiểm tra quyền.
assert(
  'khoảng trắng thừa: resource CÔNG KHAI vẫn công khai (khớp định tuyến)',
  isPublicRead({ endpoint: 'dataset', resource: ' kg_stats ', method: 'GET' }) === true,
);
assert(
  'khoảng trắng thừa: resource KÍN vẫn kín (không lách được bằng padding)',
  isPublicRead({ endpoint: 'dataset', resource: ' admin_audit ', method: 'GET' }) === false,
);
assert(
  'khoảng trắng thừa: oz_precedents vẫn kín',
  isPublicRead({ endpoint: 'dataset', resource: 'oz_precedents\t', method: 'GET' }) === false,
);
for (const endpoint of ['', 'endpoint_la', 'admin/overview']) {
  assert(`endpoint lạ mặc định KÍN: ${JSON.stringify(endpoint)}`, isPublicRead({ endpoint, method: 'GET' }) === false);
}

// --- Công tắc tắt khẩn cấp ----------------------------------------------------
const saved = process.env.HS_PUBLIC_READ;
process.env.HS_PUBLIC_READ = 'false';
assert('HS_PUBLIC_READ=false đóng toàn bộ đọc công khai', isPublicRead({ endpoint: 'tax', method: 'GET' }) === false);
assert('HS_PUBLIC_READ=false → publicReadEnabled() false', publicReadEnabled() === false);
process.env.HS_PUBLIC_READ = 'FALSE';
assert('công tắc không phân biệt hoa thường', isPublicRead({ endpoint: 'tax', method: 'GET' }) === false);
delete process.env.HS_PUBLIC_READ;
assert('mặc định (không set env) là MỞ', isPublicRead({ endpoint: 'tax', method: 'GET' }) === true);
if (saved === undefined) delete process.env.HS_PUBLIC_READ;
else process.env.HS_PUBLIC_READ = saved;

// --- Đầu vào rác không được làm sập hay mở nhầm -------------------------------
for (const bad of [undefined, {}, { endpoint: null }, { endpoint: 'tax', method: null }]) {
  let ok = true;
  let val = null;
  try {
    val = isPublicRead(bad);
  } catch {
    ok = false;
  }
  assert(`đầu vào rác không sập: ${JSON.stringify(bad)}`, ok && typeof val === 'boolean', val);
}

// --- Bất biến: allowlist không được rỗng, cũng không được phình bất thường ----
assert('có ít nhất 5 endpoint mở', PUBLIC_ENDPOINTS.size >= 5, PUBLIC_ENDPOINTS.size);
assert(
  'allowlist dataset không vượt 20 resource (phình = dấu hiệu mở ẩu)',
  PUBLIC_DATASET_RESOURCES.size <= 20,
  PUBLIC_DATASET_RESOURCES.size,
);

console.log(`\n${passed}/${passed + failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
