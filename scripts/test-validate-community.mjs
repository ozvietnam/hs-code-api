#!/usr/bin/env node
/** Lớp chất lượng của validate-community: tệp tiền lệ TB-TCHQ nộp từ 2026-10-05. */
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = mkdtempSync(join(tmpdir(), 'validate-community-'));
let passed = 0;
let failed = 0;
const assert = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ` ${extra}`}`);
  if (ok) passed += 1; else failed += 1;
};

const good = {
  hsCode: '74071040',
  description: 'Đồng tinh luyện dạng thanh, mặt cắt chữ nhật 15 x 2 mm, dùng làm thanh cái dẫn điện',
  source: { type: 'TB-TCHQ', reference: '1573/TB-TCHQ', issuedDate: '2020-03-13', url: 'https://example.vn/tb-1573' },
  attributes: { bieuThue: '2017', loaiTB: 'KET_QUA_PHAN_LOAI' },
  reasonVi: 'Thuộc nhóm 74.07 "Đồng ở dạng thanh, que và dạng hình", phân nhóm 7407.10 "- Bằng đồng tinh luyện", mã số 7407.10.40 "- - Dạng thanh và que khác". Căn cứ kết quả phân tích: đồng tinh luyện, dạng thanh đặc.',
};
const doc = (records, submittedAt = '2026-10-05') => ({
  kind: 'precedent', contributor: { name: 'HMAC' }, license: 'CC-BY-SA-4.0', submittedAt, records,
});
const run = (name, body) => {
  const f = join(dir, `${name}.json`);
  writeFileSync(f, JSON.stringify(body));
  const r = spawnSync(process.execPath, [join(root, 'scripts', 'validate-community.mjs'), f], { encoding: 'utf8' });
  return { status: r.status, out: r.stdout + r.stderr };
};

assert('bản ghi đủ chuẩn qua', run('good', doc([good])).status === 0, run('good', doc([good])).out);
let r = run('zero', doc([{ ...good, hsCode: '00000000', description: 'Hàng hóa theo Thông báo 1672/TB-TCHQ' }]));
assert('chặn mã giả 00000000', r.status === 1 && /không phải mã thật/.test(r.out), r.out);
assert('chặn mô tả giữ chỗ', /chữ giữ chỗ/.test(r.out), r.out);
r = run('cut', doc([{ ...good, reasonVi: 'Thuộc nhóm 74.07 "Đồng ở dạng thanh, que và dạng hình", phân nhóm 7407.10 "- Bằng đồng tinh luyện", mã số 7407.10.40 (kể cả loại' }]));
assert('chặn lý do bị cắt cụt', r.status === 1 && /ngoặc mở/.test(r.out), r.out);
r = run('nohs', doc([{ ...good, reasonVi: 'Thuộc nhóm 74.07 "Đồng ở dạng thanh, que và dạng hình", phân nhóm 7407.10 "- Bằng đồng tinh luyện" theo kết quả phân tích mẫu.' }]));
assert('chặn lý do không có mã kết luận', r.status === 1 && /không chứa mã kết luận/.test(r.out), r.out);
r = run('short', doc([{ ...good, reasonVi: 'thuộc nhóm hàng hóa xác định trước mã số' }]));
assert('chặn lý do giữ chỗ', r.status === 1 && /dưới 80 ký tự/.test(r.out), r.out);
r = run('dup', doc([good, { ...good }]));
assert('không chặn trùng trong cùng tệp (merge tự bỏ)', r.status === 0, r.out);
const f1 = join(dir, 'a.json');
const f2 = join(dir, 'b.json');
writeFileSync(f1, JSON.stringify(doc([good])));
writeFileSync(f2, JSON.stringify(doc([good])));
const both = spawnSync(process.execPath, [join(root, 'scripts', 'validate-community.mjs'), f1, f2], { encoding: 'utf8' });
assert('chặn cùng bản ghi ở hai tệp', both.status === 1 && /trùng bản ghi/.test(both.stdout + both.stderr), both.stdout + both.stderr);
r = run('old', doc([{ ...good, reasonVi: 'ngắn' }], '2026-09-24'));
assert('tệp cũ (trước 05/10) không bị lớp mới chặn', r.status === 0, r.out);

// Từ 06/10: evidence.soHieu + evidence.ketLuan của chính trang đã mở.
const ev = { soHieu: 'Số: 1573/TB-TCHQ', ketLuan: 'mã số 7407.10.40 "- - Dạng thanh và que khác"' };
r = run('ev-ok', doc([{ ...good, evidence: ev }], '2026-10-06'));
assert('có evidence khớp thì qua', r.status === 0, r.out);
r = run('ev-missing', doc([good], '2026-10-06'));
assert('thiếu evidence bị chặn', r.status === 1 && /evidence\.soHieu/.test(r.out), r.out);
r = run('ev-other', doc([{ ...good, evidence: { ...ev, soHieu: 'Số: 1599/TB-TCHQ' } }], '2026-10-06'));
assert('trang là văn bản khác bị chặn', r.status === 1 && /không phải 1573/.test(r.out), r.out);
r = run('ev-code', doc([{ ...good, hsCode: '38249999', evidence: ev }], '2026-10-06'));
assert('mã không có trong câu kết luận bị chặn', r.status === 1 && /không có trong câu kết luận/.test(r.out), r.out);
r = run('ev-desc', doc([{ ...good, description: good.description + ' (- Thành phần: đồng 99' , evidence: ev }], '2026-10-06'));
assert('mô tả bị cắt bị chặn', r.status === 1 && /description có ngoặc mở/.test(r.out), r.out);

r = run('bt', doc([{ ...good, attributes: { bieuThue: '2022', loaiTB: 'KET_QUA_PHAN_LOAI' }, evidence: ev }], '2026-10-06'));
assert('biểu thuế không khớp ngày ký bị chặn', r.status === 1 && /phân loại theo biểu 2017/.test(r.out), r.out);
r = run('bt-old', doc([{ ...good, attributes: { bieuThue: '2022' } }], '2026-09-24'));
assert('biểu thuế sai bị chặn cả ở tệp cũ', r.status === 1 && /bieuThue 2022 sai/.test(r.out), r.out);
r = run('short40', doc([{ ...good, description: 'Thép cán nguội 1-3mm dạng cuộn', evidence: ev }], '2026-10-06'));
assert('mô tả dưới 40 ký tự bị chặn (từ 06/10)', r.status === 1 && /dưới 40 ký tự/.test(r.out), r.out);

r = run('pad', doc([{ ...good, description: 'Đồng tinh chế dạng dải - Đồng ở dạng thanh, que và dạng hình', evidence: ev }], '2026-10-06'));
assert('mô tả nối tên nhóm biểu thuế bị chặn', r.status === 1 && /nối thêm tên nhóm/.test(r.out), r.out);
r = run('ph2', doc([{ ...good, description: 'Hàng hóa TB 1573 theo thông báo - đồng tinh luyện dạng thanh', evidence: ev }], '2026-10-06'));
assert('chữ giữ chỗ "Hàng hóa TB … theo thông báo" bị chặn', r.status === 1 && /chữ giữ chỗ/.test(r.out), r.out);
r = run('dash-ok', doc([{ ...good, description: 'Thanh cái dẫn điện - đồng tinh luyện dạng thanh, mặt cắt chữ nhật 15 x 2 mm', evidence: ev }], '2026-10-06'));
assert('gạch nối bình thường trong mô tả vẫn qua', r.status === 0, r.out);

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
