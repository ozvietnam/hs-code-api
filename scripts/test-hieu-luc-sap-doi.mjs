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

// Cửa sổ rộng: TT 142/2026 đã CON_HIEU_LUC từ 16-11-2026 nên KHÔNG còn LEN;
// mốc LEN còn lại: TT 154/2026 (01-01-2027), Luật 11/2026 (01-03-2027); HET: NQ 43/2026 (31-12-2026).
const r1 = await goi({ resource: 'hieu_luc_sap_doi', tu: '2026-10-30', so_ngay: '180' });
check('trả 200 + có items', r1.code === 200 && Array.isArray(r1.body.items) && r1.body.total > 0, JSON.stringify(r1.body).slice(0, 120));
const len = r1.body.items.filter((x) => x.suKien === 'LEN_HIEU_LUC');
const het = r1.body.items.filter((x) => x.suKien === 'HET_HIEU_LUC');
check('142/2026 đã CON → không còn LEN_HIEU_LUC', !len.some((x) => x.soHieu === '142/2026/TT-BTC'));
check('có LEN_HIEU_LUC (TT 154/2026 01-01-2027)', len.some((x) => x.soHieu === '154/2026/TT-BTC' && x.ngay === '2027-01-01'));
check('có HET_HIEU_LUC (NQ 43/2026 31-12-2026 — ưu đãi thuế xăng dầu)', het.some((x) => x.soHieu === '43/2026/NQ-CP' && x.ngay === '2026-12-31'));
check('Luật 11/2026 lên 01-03-2027', len.some((x) => x.soHieu === '11/2026/QH16' && x.ngay === '2027-03-01'));
check('sắp xếp theo ngày tăng dần', r1.body.items.every((x, i, a) => i === 0 || a[i - 1].ngay <= x.ngay));

// Cửa sổ hẹp quanh 01-01-2027: TT 154 còn CHUA_CO → đúng 1 mốc LEN (372/NĐ-CP cũng 01-01 nhưng cùng ngày — bắt ≥1 gồm 154)
const r2 = await goi({ resource: 'hieu_luc_sap_doi', tu: '2026-12-28', so_ngay: '10' });
const len2 = (r2.body.items || []).filter((x) => x.suKien === 'LEN_HIEU_LUC');
check('cửa sổ quanh 01-01-2027 có TT 154/2026 LEN', len2.some((x) => x.soHieu === '154/2026/TT-BTC' && x.ngay === '2027-01-01'), JSON.stringify(r2.body.items));

// so_ngay giới hạn 1..3650, tu sai định dạng → mặc định hôm nay
const r3 = await goi({ resource: 'hieu_luc_sap_doi', so_ngay: '99999', tu: 'abc' });
check('tham số bất thường vẫn an toàn (tu mặc định hôm nay)', r3.code === 200 && /^\d{4}-\d{2}-\d{2}$/.test(r3.body.tu) && r3.body.soNgay === 3650);

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
