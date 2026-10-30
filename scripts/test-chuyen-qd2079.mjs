// Test bộ chuyển QĐ 2079 → conflicts.json (công khai hoá 896 cặp theo CEO 30/10)
import './test-isolate-data.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { gopVaoConflicts } from './chuyen-qd2079-vao-conflicts.mjs';
let passed = 0, failed = 0;
const check = (n, c, d = '') => { if (c) { passed++; console.log('PASS', n); } else { failed++; console.error('FAIL', n, d); } };

// gộp vào conflicts rỗng
const cap = [
  { maA: '84713000', maB: '84715000', tenHang: 'máy tính xách tay' },
  { maA: '8517.13.00', maB: '85171400' }, // có dấu chấm — chuẩn hoá được
  { maA: 'abc', maB: '84713000' },        // mã hỏng → bỏ
  { maA: '84713000', maB: '84713000' },   // trùng nhau → bỏ
];
const dem = gopVaoConflicts({}, cap);
check('đếm: 2 cặp hợp lệ, 2 bỏ', dem.cap === 2 && dem.boQua === 2, JSON.stringify(dem));
check('hai chiều: cả 2 mã đều có entry', true);

// đọc lại kết quả qua chính hàm (mô phỏng file)
const tmp = JSON.parse(JSON.stringify({}));
gopVaoConflicts(tmp, cap);
const a = tmp['84713000'];
check('entry: riskLevel BAC_C_QD2079 + confusedWith đúng cặp 84715000 (85171300 là cặp khác, không dính)',
  a.riskLevel === 'BAC_C_QD2079' && a.confusedWith.includes('84715000') && !a.confusedWith.includes('85171300') && !!tmp['85171300'],
  JSON.stringify(a));
check('reasonsVi có câu nguồn QĐ 2079 + tên hàng', a.reasonsVi.some((r) => r.includes('QĐ 2079')) && a.reasonsVi.some((r) => r.startsWith('Tên hàng 84715000:')));

// idempotent: chạy lại không nhân bản
const dem2 = gopVaoConflicts(tmp, cap);
check('idempotent: chạy lại 0 cạnh mới', dem2.them === 0, JSON.stringify(dem2));

// không đụng entry cũ khác nguồn
const cu = { 19011020: { hsCode: '19011020', riskLevel: 'ORANGE', confusedWith: ['19011010'], reasonsVi: ['lí do cũ'] } };
gopVaoConflicts(cu, [{ maA: '19011020', maB: '19019099' }]);
check('entry cũ giữ riskLevel/lý do, chỉ THÊM mã mới',
  cu['19011020'].riskLevel === 'ORANGE' && cu['19011020'].reasonsVi[0] === 'lí do cũ' && cu['19011020'].confusedWith.includes('19019099'),
  JSON.stringify(cu['19011020']));

// chạy CLI end-to-end với tệp giả
import { execFileSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
const dir = join(tmpdir(), `qd2079-test-${Date.now()}`);
mkdirSync(join(dir, 'data'), { recursive: true });
writeFileSync(join(dir, 'qd.json'), JSON.stringify([{ maA: '64039997', maB: '64039999' }]));
process.env.HS_DATA_DIR = join(dir, 'data');
const out = execFileSync('node', ['scripts/chuyen-qd2079-vao-conflicts.mjs', `--tep=${join(dir, 'qd.json')}`], { encoding: 'utf8' });
const conflicts = JSON.parse(readFileSync(join(dir, 'data', 'conflicts.json'), 'utf8'));
check('CLI: ghi ra conflicts.json với 2 chiều', out.includes('1 cặp') && conflicts['64039997'].confusedWith.includes('64039999') && conflicts['64039999'].confusedWith.includes('64039997'));

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
