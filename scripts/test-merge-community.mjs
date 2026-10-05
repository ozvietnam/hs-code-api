#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * Gộp community vào kho chính trên thư mục tạm — không đụng data/ production.
 */
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

let passed = 0;
let failed = 0;
function assert(name, cond, detail) {
  if (cond) {
    passed += 1;
    console.log('PASS', name);
  } else {
    failed += 1;
    console.error('FAIL', name, detail || '');
  }
}

const dir = mkdtempSync(join(tmpdir(), 'hs-merge-comm-'));
const dataDir = join(dir, 'data');
const communityDir = join(dir, 'community');
mkdirSync(join(communityDir, 'examples'), { recursive: true });
mkdirSync(dataDir, { recursive: true });

writeFileSync(join(dataDir, 'precedents.json'), JSON.stringify({
  '11082000': [{ tbTchqNumber: '3581/TB-TCHQ', productName: 'Fuji FF Inulin', year: 2022, outcome: '11082000' }],
  // Bản mỏng từ bảng cũ: cùng TB khác năm (không được đụng) + cùng TB cùng năm (phải được thay).
  '39269099': [
    { tbTchqNumber: '1049/TB-TCHQ', productName: 'Khuôn nhựa dùng để hàn Cell Pin', technicalSpec: null, year: 2024, outcome: '39269099', sourceFile: 'tb_tchq_index.json', sourceUrl: 'https://thuvienphapluat.vn/van-ban/Xuat-nhap-khau/Thong-bao-1049-TB-TCHQ-2024-x-1.aspx' },
    { tbTchqNumber: '1049/TB-TCHQ', productName: 'Khuôn nhựa dùng để hàn Cell Pin', technicalSpec: null, year: 2019, outcome: '39269099', sourceFile: 'tb_tchq_index.json' },
    { tbTchqNumber: '1049/TB-TCHQ', productName: 'Tấm đệm cao su silicon', technicalSpec: null, year: 2024, outcome: '39269099', sourceFile: 'tb_tchq_index.json' },
  ],
  // Tên lấy từ tiêu đề TVPL, dính đuôi "do … ban hành", tên thương mại — mô tả mới gần như không trùng từ.
  '27101989': [
    { tbTchqNumber: '1005/TB-TCHQ', productName: 'NOX-RUST 311HM do Tổng cục trưởng Tổng cục Hải quan ban hành', technicalSpec: ', công dụng:', year: 2025, outcome: '27101989', sourceFile: 'tb_tchq_index.json', sourceUrl: 'https://thuvienphapluat.vn/van-ban/Xuat-nhap-khau/Thong-bao-1005-TB-TCHQ-2025-x-646486.aspx' },
  ],
}, null, 2));
writeFileSync(join(dataDir, 'conflicts.json'), JSON.stringify({}, null, 2));

writeFileSync(join(communityDir, 'examples', 'vi-du-tien-le.json'), JSON.stringify({
  kind: 'precedent',
  contributor: { name: 'Nguyễn Văn A', github: 'example-user' },
  license: 'CC-BY-SA-4.0',
  records: [{
    hsCode: '84137090',
    description: 'Máy bơm nước ly tâm dân dụng mẫu',
    source: { type: 'TB-TCHQ', reference: '1234/TB-TCHQ', issuedDate: '2025-03-15' },
  }],
}));

writeFileSync(join(communityDir, 'tien-le-bom.json'), JSON.stringify({
  kind: 'precedent',
  contributor: { name: 'Trần Thị B', github: 'tran-b' },
  license: 'CC-BY-SA-4.0',
  submittedAt: '2026-09-09',
  records: [{
    hsCode: '84137090',
    description: 'Máy bơm nước ly tâm dân dụng, công suất 1HP, đầu bơm bằng gang, điện 220V, hàng mới 100%',
    source: { type: 'TB-TCHQ', reference: '9876/TB-TCHQ', issuedDate: '2025-06-01' },
    girRule: 'GIR 1',
    reasonVi: 'Bơm ly tâm dùng nước sạch, không phải bơm nhiên liệu.',
    confusedWith: ['84133090'],
  }],
}));

writeFileSync(join(communityDir, 'doc-lai-1005.json'), JSON.stringify({
  kind: 'precedent',
  contributor: { name: 'HMAC' },
  license: 'CC-BY-SA-4.0',
  records: [{
    hsCode: '27101989',
    description: 'Chế phẩm dầu chống gỉ cho chi tiết kim loại, hàm lượng dầu có nguồn gốc dầu mỏ trên 70% khối lượng, phân đoạn dầu trung',
    source: { type: 'TB-TCHQ', reference: '1005/TB-TCHQ', issuedDate: '2025-02-27' },
    reasonVi: 'Thuộc nhóm 27.10 "Dầu có nguồn gốc từ dầu mỏ…", phân nhóm 2710.19 "- Loại khác", mã số 2710.19.89 "- - - Dầu trung khác và các chế phẩm khác". Chế phẩm chứa trên 70% dầu trung có nguồn gốc dầu mỏ.',
  }],
}));

// Hai tệp cùng trích một mặt hàng của 720/TB-TCHQ: bản ngắn + bản đủ — gộp nhiều lần phải ổn định.
writeFileSync(join(communityDir, 'a-ban-ngan-720.json'), JSON.stringify({
  kind: 'precedent', contributor: { name: 'agent-a' }, license: 'CC-BY-SA-4.0',
  records: [{
    hsCode: '32089090', description: 'Sơn bóng từ polymer acrylic BECKRY TOP 25 dạng lỏng',
    source: { type: 'TB-TCHQ', reference: '720/TB-TCHQ', issuedDate: '2016-01-26' },
    reasonVi: 'Chất phủ từ polyme tổng hợp phân tán trong môi trường không chứa nước → 3208.90.90.',
  }],
}));
writeFileSync(join(communityDir, 'b-ban-du-720.json'), JSON.stringify({
  kind: 'precedent', contributor: { name: 'agent-b' }, license: 'CC-BY-SA-4.0',
  records: [{
    hsCode: '32089090', description: 'Sơn bóng từ polymer acrylic BECKRY TOP 25: chất phủ từ epoxy acrylate, dung môi hữu cơ, dạng lỏng',
    source: { type: 'TB-TCHQ', reference: '720/TB-TCHQ', issuedDate: '2016-01-26' },
    reasonVi: 'Thuộc nhóm 32.08 "Sơn và vecni… làm từ các loại polyme tổng hợp… đã phân tán hoặc hòa tan trong môi trường không chứa nước", phân nhóm 3208.90 "- Loại khác", mã số 3208.90.90 "- - Loại khác".',
  }],
}));

writeFileSync(join(communityDir, 'doc-lai-1049.json'), JSON.stringify({
  kind: 'precedent',
  contributor: { name: 'agent-doc-lai' },
  license: 'CC-BY-SA-4.0',
  records: [{
    hsCode: '39269099',
    description: 'Khuôn nhựa dùng để hàn Cell Pin, làm từ nhựa PPS chịu nhiệt, dạng khay có rãnh định vị',
    source: { type: 'TB-TCHQ', reference: '1049/TB-TCHQ', issuedDate: '2024-04-02' },
    reasonVi: 'Thuộc nhóm 39.26 "Các sản phẩm khác bằng plastic", phân nhóm 3926.90 "- Loại khác", mã số 3926.90.99 "- - - Loại khác". Sản phẩm bằng plastic chỉ để định vị chi tiết khi hàn, không phải khuôn tạo hình của nhóm 84.80.',
    girRule: 'GIR 1',
  }],
}));

writeFileSync(join(communityDir, 'conflict-hint.json'), JSON.stringify({
  kind: 'conflict-table',
  contributor: { name: 'Lê C' },
  license: 'CC-BY-SA-4.0',
  records: [{
    hsCode: '84812090',
    description: 'Van khí nén công nghiệp hay bị nhầm van xe',
    source: { type: 'chu-giai-WCO', reference: 'heading 8481.20' },
    reasonVi: '8481.20 là van truyền động khí nén/thủy lực.',
    confusedWith: ['84818083'],
  }],
}));

const run = spawnSync(process.execPath, [
  join(root, 'scripts', 'merge-community.mjs'),
  '--community-dir', communityDir,
  '--data-dir', dataDir,
], { encoding: 'utf8' });

assert('merge exit 0', run.status === 0, run.stderr || run.stdout);
const precedents = JSON.parse(readFileSync(join(dataDir, 'precedents.json'), 'utf8'));
const conflicts = JSON.parse(readFileSync(join(dataDir, 'conflicts.json'), 'utf8'));

assert('không gộp tệp examples/', !precedents['84137090']?.some((p) => p.tbTchqNumber === '1234/TB-TCHQ'));
assert('gộp precedent thật', Array.isArray(precedents['84137090']) && precedents['84137090'].length === 1);
assert('giữ tên contributor', precedents['84137090'][0].contributor?.name === 'Trần Thị B');
assert('giữ số hiệu TB-TCHQ', precedents['84137090'][0].tbTchqNumber === '9876/TB-TCHQ');
assert('không xoá precedent cũ', precedents['11082000']?.length === 1);
assert('conflict hint vào conflicts.json', (conflicts['84812090']?.confusedWith || []).includes('84818083'));
assert('conflict ghi contributor', (conflicts['84812090']?.communityContributors || []).includes('Lê C'));
assert('có merge log', existsSync(join(dataDir, 'community-merge-log.jsonl')));
assert('mang issuedDate sang precedents', precedents['84137090'][0].issuedDate === '2025-06-01');
const p1049 = precedents['39269099'];
assert('bản mỏng cùng TB/năm/mặt hàng được THAY, không thêm dòng', p1049.length === 3, `n=${p1049.length}`);
const up = p1049.find((p) => p.year === 2024 && /PPS/.test(p.productName));
assert('bản thay có lý do + GIR + ngày', up && up.technicalSpec.length > 150 && up.girRule === 'GIR 1' && up.issuedDate === '2024-04-02');
assert('bản thay giữ link cũ khi bản mới không có', up?.sourceUrl?.includes('Thong-bao-1049'));
assert('không đụng TB cùng số khác năm', p1049.some((p) => p.year === 2019 && p.sourceFile === 'tb_tchq_index.json'));
assert('không đụng mặt hàng khác cùng TB', p1049.some((p) => /silicon/.test(p.productName) && p.sourceFile === 'tb_tchq_index.json'));
const p1005 = precedents['27101989'];
assert('bản mỏng duy nhất cùng TB/năm/mã được THAY dù tên cũ không trùng từ', p1005.length === 1 && /dầu chống gỉ/.test(p1005[0].productName), JSON.stringify(p1005.map((p) => p.productName)));

const again = spawnSync(process.execPath, [
  join(root, 'scripts', 'merge-community.mjs'),
  '--community-dir', communityDir,
  '--data-dir', dataDir,
], { encoding: 'utf8' });
const after = JSON.parse(readFileSync(join(dataDir, 'precedents.json'), 'utf8'));
assert('chạy lại không nhân bản', after['84137090'].length === 1, `n=${after['84137090']?.length}`);
assert('chạy lại không nhân bản bản đã thay', after['39269099'].length === 3, `n=${after['39269099']?.length}`);
assert('chạy lại không nhân bản 1005', after['27101989'].length === 1, `n=${after['27101989']?.length}`);
assert('720: chỉ giữ bản đủ', precedents['32089090'].length === 1 && precedents['32089090'][0].technicalSpec.length > 150, `n=${precedents['32089090']?.length}`);
spawnSync(process.execPath, [join(root, 'scripts', 'merge-community.mjs'), '--community-dir', communityDir, '--data-dir', dataDir], { encoding: 'utf8' });
const third = JSON.parse(readFileSync(join(dataDir, 'precedents.json'), 'utf8'));
assert('gộp lần 2, lần 3 không dao động', after['32089090'].length === 1 && third['32089090'].length === 1 && JSON.stringify(third) === JSON.stringify(after));
assert('chạy lại exit 0', again.status === 0, again.stderr || again.stdout);

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
