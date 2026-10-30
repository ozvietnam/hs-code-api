// Test /api/dataset?resource=hieu_luc_sap_doi — mốc VB lên/hết hiệu lực sắp tới (công cụ canh cho hệ thống)
import './test-isolate-data.mjs';
import { createRequire } from 'module';
import { existsSync, readFileSync, mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
let passed = 0, failed = 0;
const check = (n, c, d = '') => { if (c) { passed++; console.log('PASS', n); } else { failed++; console.error('FAIL', n, d); } };

const dir = mkdtempSync(join(tmpdir(), 'hs-hlsd-'));
mkdirSync(join(dir, 'data'), { recursive: true });
const root = join(fileURLToPath(import.meta.url), '..', '..');
for (const f of ['plhq-registry.json', 'tax.json']) {
  const src = join(root, 'data', f);
  if (existsSync(src)) writeFileSync(join(dir, 'data', f), readFileSync(src));
}
process.env.HS_PUBLIC_READ = 'true';
process.chdir(dir);

const handler = require('../api/dataset.js');
const headers = {};
const goi = async (query) => {
  const res = { status(c) { this.__c = c; return this; }, json(b) { this.__b = JSON.stringify(b); return this; }, setHeader(k, v) { headers[k] = v; }, getHeader(k) { return headers[k]; } };
  await handler({ method: 'GET', url: '/api/dataset', query, headers: {} }, res);
  return { code: res.__c, body: JSON.parse(res.__b || '{}') };
};

// Cửa sổ rộng bắt đủ mốc đã biết (TT 142/2026 lên 16-11-2026; NQ 43/2026 hết 31-12-2026; Luật 11/2026 lên 01-03-2027)
const r1 = await goi({ resource: 'hieu_luc_sap_doi', tu: '2026-10-30', so_ngay: '180' });
check('trả 200 + có items', r1.code === 200 && Array.isArray(r1.body.items) && r1.body.total > 0, JSON.stringify(r1.body).slice(0, 120));
const len = r1.body.items.filter((x) => x.suKien === 'LEN_HIEU_LUC');
const het = r1.body.items.filter((x) => x.suKien === 'HET_HIEU_LUC');
check('có LEN_HIEU_LUC (TT 142/2026 16-11-2026)', len.some((x) => x.soHieu === '142/2026/TT-BTC' && x.ngay === '2026-11-16'));
check('có HET_HIEU_LUC (NQ 43/2026 31-12-2026 — ưu đãi thuế xăng dầu)', het.some((x) => x.soHieu === '43/2026/NQ-CP' && x.ngay === '2026-12-31'));
check('Luật 11/2026 lên 01-03-2027', len.some((x) => x.soHieu === '11/2026/QH16' && x.ngay === '2027-03-01'));
check('sắp xếp theo ngày tăng dần', r1.body.items.every((x, i, a) => i === 0 || a[i - 1].ngay <= x.ngay));

// Cửa sổ hẹp chỉ bắt đúng 1 mốc
const r2 = await goi({ resource: 'hieu_luc_sap_doi', tu: '2026-11-10', so_ngay: '10' });
check('cửa sổ 10 ngày quanh 16-11 chỉ có TT 142/2026 LEN', r2.body.total === 1 && r2.body.items[0].soHieu === '142/2026/TT-BTC', JSON.stringify(r2.body.items));

// so_ngay giới hạn 1..3650, tu sai định dạng → mặc định hôm nay
const r3 = await goi({ resource: 'hieu_luc_sap_doi', so_ngay: '99999', tu: 'abc' });
check('tham số bất thường vẫn an toàn (tu mặc định hôm nay)', r3.code === 200 && /^\d{4}-\d{2}-\d{2}$/.test(r3.body.tu) && r3.body.soNgay === 3650);

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
