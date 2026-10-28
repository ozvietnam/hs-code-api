// Test ghi miss JSONL khi tra_hieu_luc_van_ban found:false (#224/#209 — tự sinh issue)
import './test-isolate-data.mjs';
import { createRequire } from 'module';
import { existsSync, readFileSync, mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
let passed = 0, failed = 0;
const check = (n, c, d = '') => { if (c) { passed++; console.log('PASS', n); } else { failed++; console.error('FAIL', n, d); } };

// Đặt cwd tạm để JSONL ghi vào đó (không bẩn repo)
const dir = mkdtempSync(join(tmpdir(), 'hs-miss-'));
mkdirSync(join(dir, 'data'), { recursive: true });
// Chép dữ liệu thật cần cho legal_status lookup
const root = join(fileURLToPath(import.meta.url), '..', '..');
const dataFiles = ['plhq-registry.json', 'tax.json'];
for (const f of dataFiles) {
  const src = join(root, 'data', f);
  if (existsSync(src)) writeFileSync(join(dir, 'data', f), readFileSync(src));
}
process.env.HS_PUBLIC_READ = 'true';
process.chdir(dir);

const handler = require('../api/dataset.js');
const headers = {};
const res = {
  status(c) { this.__c = c; return this; },
  json(b) { this.__b = JSON.stringify(b); return this; },
  setHeader(k, v) { headers[k] = v; },
  getHeader(k) { return headers[k]; },
};

// Tra 1 số có thật + 1 số không có
await handler({ method: 'GET', url: '/api/dataset?resource=legal_status&so=06/2011/TT-BYT,99/9999/XX-YY', query: { resource: 'legal_status', so: '06/2011/TT-BYT,99/9999/XX-YY' }, headers: {} }, res);
const body = JSON.parse(res.__b || '{}');
const items = body.items || [];
check('tra đủ 2 số', items.length === 2, `n=${items.length}`);
check('số có thật: found=true', items[0]?.found === true, JSON.stringify(items[0]).slice(0, 100));
check('số không có: found=false', items[1]?.found === false);

// dataPath(): ghi thẳng vào HS_DATA_DIR do test-isolate-data đặt (thư mục riêng của isolate)
const missFile = join(process.env.HS_DATA_DIR, 'legal-status-miss.jsonl');
check('JSONL miss đã ghi', existsSync(missFile));
if (existsSync(missFile)) {
  const lines = readFileSync(missFile, 'utf8').trim().split('\n');
  const last = JSON.parse(lines[lines.length - 1]);
  check('JSONL chứa đúng số miss', Array.isArray(last.soHieu) && last.soHieu.includes('99/9999/XX-YY'), JSON.stringify(last));
  check('JSONL có ts', typeof last.ts === 'string' && last.ts.length > 10);
}

process.chdir(root);
console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
