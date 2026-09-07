#!/usr/bin/env node
/**
 * Bộ dữ liệu tĩnh cho CDN.
 *
 * Test này khoá ba thứ, và thứ nhất quan trọng hơn cả:
 *   1. KHÔNG xuất được thứ ngoài allowlist công khai — bản tĩnh nằm trên CDN,
 *      xuất nhầm một lần là phát tán vĩnh viễn, không thu hồi được.
 *   2. File tĩnh khớp ĐÚNG shape mà API trả về — AI ngoài đọc cả hai nguồn,
 *      lệch shape là lỗi âm thầm.
 *   3. Không vượt trần của nơi lưu trữ — vượt thì hỏng lúc deploy mới biết.
 */
import './test-isolate-data.mjs';
import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const {
  MAX_FILES,
  MAX_FILE_BYTES,
  OMITTED,
  assertPublicSource,
  checkLimits,
} = require('../lib/static-export.js');
const { PUBLIC_ENDPOINTS, PUBLIC_DATASET_RESOURCES } = require('../lib/public-access.js');

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
const throws = (fn) => {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
};

// --- 1. Ranh giới công khai ----------------------------------------------------
for (const ep of PUBLIC_ENDPOINTS) {
  assert(`cho phép endpoint công khai: ${ep}`, assertPublicSource(`endpoint:${ep}`) === true);
}
for (const r of PUBLIC_DATASET_RESOURCES) {
  assert(`cho phép resource công khai: ${r}`, assertPublicSource(`dataset:${r}`) === true);
}

// Những thứ CỐ Ý kín — mỗi cái là một kiểu rò rỉ khác nhau.
const MUST_REFUSE = [
  ['dataset:oz_precedents', 'lịch sử tờ khai của Oz — tri thức kinh doanh riêng'],
  ['dataset:trademark', 'cảnh báo SHTT mới verify 1/53 nhãn'],
  ['dataset:admin_overview', 'dữ liệu vận hành nội bộ'],
  ['dataset:admin_audit', 'nhật ký sửa dữ liệu'],
  ['dataset:kpi', 'chỉ số nội bộ'],
  ['dataset:error_log', 'log lỗi có thể lộ nội dung request'],
  ['dataset:prompt_versions', 'prompt là tài sản riêng'],
  ['endpoint:suggest', 'tốn tiền LLM mỗi lượt'],
  ['endpoint:describe', 'tốn tiền LLM mỗi lượt'],
  ['endpoint:classify', 'tốn tiền LLM mỗi lượt'],
  ['endpoint:feedback', 'ghi dữ liệu, không phải đọc'],
];
for (const [src, why] of MUST_REFUSE) {
  assert(`TỪ CHỐI ${src} (${why})`, throws(() => assertPublicSource(src)));
}

// Không được lẫn hai loại: 'tax' là endpoint chứ không phải resource, và ngược lại.
assert('không nhầm endpoint thành resource', throws(() => assertPublicSource('dataset:tax')));
assert('không nhầm resource thành endpoint', throws(() => assertPublicSource('endpoint:conflicts')));

// Đầu vào rác không được lọt.
for (const bad of ['', 'tax', 'endpoint:', ':tax', 'endpoint', null, undefined, 'ENDPOINT:tax']) {
  assert(`đầu vào rác bị từ chối: ${JSON.stringify(bad)}`, throws(() => assertPublicSource(bad)));
}

// --- 2. Trần lưu trữ -----------------------------------------------------------
assert('đạt trần thì không báo lỗi', checkLimits({ fileCount: 100, largestFileBytes: 1024 }).length === 0);
assert('vượt số file thì báo lỗi', checkLimits({ fileCount: MAX_FILES + 1, largestFileBytes: 1 }).length === 1);
assert(
  'file quá nặng thì báo lỗi',
  checkLimits({ fileCount: 1, largestFileBytes: MAX_FILE_BYTES + 1, largestFilePath: 'x.json' }).length === 1,
);

// --- 3. Danh sách cố ý bỏ có ghi lý do -----------------------------------------
for (const [k, why] of Object.entries(OMITTED)) {
  assert(`bỏ "${k}" có ghi lý do đủ rõ`, typeof why === 'string' && why.length > 40, why);
}

// --- 4. Chạy build thật (một chương) rồi soi kết quả ---------------------------
const out = mkdtempSync(join(tmpdir(), 'hs-static-'));
try {
  execFileSync(process.execPath, [join(root, 'scripts', 'build-static.mjs')], {
    env: { ...process.env, HS_STATIC_OUT: out, HS_STATIC_SAMPLE: '01' },
    stdio: 'pipe',
  });

  const manifest = JSON.parse(readFileSync(join(out, 'index.json'), 'utf8'));
  assert('có manifest index.json', Boolean(manifest.generatedAt));
  assert('manifest đánh dấu đây là bản mẫu', manifest.sampleChapterOnly === '01');
  assert('manifest nêu giấy phép dữ liệu', /CC BY-SA/.test(manifest.licenseData || ''));
  assert('manifest có miễn trừ trách nhiệm', (manifest.disclaimer || '').length > 80);
  assert('manifest nói rõ phần LLM không nằm trong bộ tĩnh', /suggest/.test(manifest.liveApi?.note || ''));
  assert('manifest liệt kê thứ cố ý bỏ', Boolean(manifest.omitted?.products));

  // Mọi nguồn ghi trong manifest phải nằm trong allowlist — soi lại lần nữa từ
  // phía sản phẩm, không tin mỗi lời khai của build script.
  const badSources = (manifest.entries || []).filter((e) => throws(() => assertPublicSource(e.source)));
  assert('mọi nguồn trong manifest đều công khai hợp lệ', badSources.length === 0, badSources);

  // Không được có thư mục nào của tài nguyên kín lọt vào output.
  const v1 = readdirSync(join(out, 'v1'));
  for (const forbidden of ['oz-precedent', 'trademark', 'admin', 'kpi', 'error-log', 'prompt']) {
    assert(`không có thư mục "${forbidden}" trong output`, !v1.some((d) => d.includes(forbidden)), v1);
  }
  assert('không xuất corpus sản phẩm (chờ rà quyền L-4)', !v1.includes('products') && !existsSync(join(out, 'v1', 'products.json')));

  // Shape phải khớp API: so file tĩnh với chính hàm mà api/tax.js gọi.
  const { mapTaxLookup } = require('../lib/tax-mapper.js');
  const { taxData } = require('../lib/data.js');
  const sampleHs = Object.keys(taxData).filter((h) => h.startsWith('01')).sort()[0];
  const staticDoc = JSON.parse(readFileSync(join(out, 'v1', 'code', `${sampleHs}.json`), 'utf8'));
  const apiDoc = mapTaxLookup(sampleHs);
  assert(`file tĩnh ${sampleHs} khớp shape API`, staticDoc.hsCode === apiDoc.hsCode && staticDoc.nameVi === apiDoc.nameVi, {
    staticKeys: Object.keys(staticDoc).length,
    apiKeys: Object.keys(apiDoc).length,
  });
  assert('file tĩnh dùng camelCase như hợp đồng ERP', 'nameVi' in staticDoc && !('vn' in staticDoc));

  // Chuỗi chú giải gom theo nhóm 4 số, tra được bằng mã.
  const chainDir = join(out, 'v1', 'notes', 'chain');
  if (existsSync(chainDir)) {
    const f = readdirSync(chainDir)[0];
    const bundle = JSON.parse(readFileSync(join(chainDir, f), 'utf8'));
    assert('chuỗi chú giải gom theo nhóm 4 số', /^\d{4}\.json$/.test(f), f);
    assert('tra được chuỗi của từng mã qua byCode', Object.keys(bundle.byCode || {}).length > 0);
    assert('mã trong bundle thuộc đúng nhóm', Object.keys(bundle.byCode).every((h) => h.startsWith(bundle.heading)));
  }

  // Điểm vào cho AI phải đi kèm, nếu không bộ tĩnh chỉ là đống JSON không ai đọc nổi.
  for (const f of ['AGENTS.md', 'llms.txt', 'openapi.json', 'LICENSE-DATA']) {
    assert(`kèm ${f} để AI biết đường đọc`, existsSync(join(out, f)));
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}

console.log(`\n${passed}/${passed + failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
