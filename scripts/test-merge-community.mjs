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

// ── Bước 12 (B-3): intl-precedent — trường quốc tế + dấu vết lấy dữ liệu phải vào kho ──
writeFileSync(join(communityDir, 'intl-thu.json'), JSON.stringify({
  kind: 'intl-precedent',
  contributor: { name: 'zcode-cbp-crawler', github: 'ozvietnam' },
  license: 'CC-BY-SA-4.0',
  submittedAt: '2026-10-15T00:00:00Z',
  records: [{
    hsCode: '847989',
    description: 'CBP CROSS M82907: anaerobic and hypoxia workstations',
    source: { type: 'CBP-CROSS-RULING', reference: 'M82907', url: 'https://rulings.cbp.gov/ruling/M82907', issuedDate: '2006-04-24', license: 'public-domain-us-gov' },
    attributes: { instrumentType: 'RULING', country: 'US' },
    reasonVi: 'The applicable subheading for the anaerobic workstation will be 8479.89.98.',
    evidence: { soHieu: 'M82907', ketLuan: 'The applicable subheading will be 8479.89.98.' },
    snapshotHash: 'a'.repeat(64),
    retrievedAt: '2026-10-15',
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

// Refresh cùng tệp nguồn (luật 13/10/2026): nộp lại bản đầy đủ hơn → thay tại chỗ, không nhân bản.
const refreshFile = join(communityDir, 'refresh-lot.json');
const refreshBase = {
  kind: 'precedent', contributor: { name: 'agent-refresh' }, license: 'CC-BY-SA-4.0',
  records: [{
    hsCode: '85366932',
    description: 'Đầu nối điện thoại Connector 12P dùng cho bo mạch điện thoại di động, hàng mới 100%',
    source: { type: 'TB-TCHQ', reference: '5150/TB-TCHQ', issuedDate: '2020-05-15' },
    reasonVi: 'Thuộc nhóm 85.36 “Thiết bị điện để đóng ngắt mạch điện”, mã số 8536.69.32 “- - Loại khác” tại Danh mục hàng hóa xuất khẩu, nhập khẩu Việt Nam.',
  }],
};
writeFileSync(refreshFile, JSON.stringify(refreshBase));
spawnSync(process.execPath, [join(root, 'scripts', 'merge-community.mjs'), '--community-dir', communityDir, '--data-dir', dataDir], { encoding: 'utf8' });
const après1 = JSON.parse(readFileSync(join(dataDir, 'precedents.json'), 'utf8'));
assert('refresh: lần đầu vào kho, chưa có loaiTB', après1['85366932']?.length === 1 && !après1['85366932'][0].loaiTB);

writeFileSync(refreshFile, JSON.stringify({
  ...refreshBase,
  records: [{ ...refreshBase.records[0], description: refreshBase.records[0].description + ' (bản chỉnh mô tả)', attributes: { bieuThue: '2017', loaiTB: 'KET_QUA_PHAN_LOAI', legacyHs: true, legacyHsRemap: '8536.69.32' }, confusedWith: ['85369019'] }],
}));
spawnSync(process.execPath, [join(root, 'scripts', 'merge-community.mjs'), '--community-dir', communityDir, '--data-dir', dataDir], { encoding: 'utf8' });
const après2 = JSON.parse(readFileSync(join(dataDir, 'precedents.json'), 'utf8'));
assert('refresh: nộp lại bản giàu hơn → thay tại chỗ, không nhân bản', après2['85366932']?.length === 1, `n=${après2['85366932']?.length}`);
assert('refresh: loaiTB + confusedWith đã vào kho', après2['85366932'][0].loaiTB === 'KET_QUA_PHAN_LOAI' && (après2['85366932'][0].confusedWith || []).includes('85369019'));
assert('refresh: sửa mô tả tại tệp nguồn cũng được cập nhật', /bản chỉnh mô tả/.test(après2['85366932'][0].productName), après2['85366932'][0].productName);
assert('refresh: cờ legacyHs + remap vào kho', après2['85366932'][0].legacyHs === true && après2['85366932'][0].legacyHsRemap === '8536.69.32');

// Tệp nguồn ĐỔI TÊN sau khi đã gộp (tracuuhs-* → legal-customs-*) và mô tả đầu bị sửa (khoá 40 ký tự
// đổi): bản nộp lại vẫn phải nâng cấp TẠI CHỖ (không nhân bản) và tự cập nhật tên tệp nguồn mới.
const renameFile = join(communityDir, 'tb-tchq-ren', 'legal-customs-lot-ren.json');
mkdirSync(join(communityDir, 'tb-tchq-ren'), { recursive: true });
writeFileSync(renameFile, JSON.stringify({
  kind: 'precedent', contributor: { name: 'agent-rename' }, license: 'CC-BY-SA-4.0',
  records: [{
    hsCode: '84834090',
    description: 'Hộp giảm tốc bánh răng nghiêng dùng cho băng tải công nghiệp, tỷ số truyền 1:30',
    source: { type: 'TB-TCHQ', reference: '777/TB-TCHQ', issuedDate: '2021-03-10' },
    reasonVi: 'Thuộc nhóm 84.83 “Trục truyền, trục khuỷu, tay biên, ổ bi…”, phân nhóm 8483.40 “- Hộp số và các bộ phận giảm tốc khác…”, mã số 8483.40.90 “- - Loại khác” tại Danh mục hàng hóa xuất khẩu, nhập khẩu Việt Nam.',
  }],
}));
{
  const cur = JSON.parse(readFileSync(join(dataDir, 'precedents.json'), 'utf8'));
  cur['84834090'] = [{
    tbTchqNumber: '777/TB-TCHQ', productName: 'Hộp giảm tốc bánh răng dùng cho băng tải (mô tả cũ đã sửa)',
    technicalSpec: 'Thuộc nhóm 84.83, mã số 8483.40.90.', year: 2021, outcome: '84834090',
    sourceFile: 'community:tb-tchq-ren/tracuuhs-lot-ren.json',
  }];
  writeFileSync(join(dataDir, 'precedents.json'), JSON.stringify(cur));
}
spawnSync(process.execPath, [join(root, 'scripts', 'merge-community.mjs'), '--community-dir', communityDir, '--data-dir', dataDir], { encoding: 'utf8' });
const après3 = JSON.parse(readFileSync(join(dataDir, 'precedents.json'), 'utf8'));
assert('đổi tên tệp + sửa mô tả: nâng cấp tại chỗ, không nhân bản', après3['84834090']?.length === 1, `n=${après3['84834090']?.length}`);
assert('đổi tên tệp + sửa mô tả: lý do được thay bằng bản đủ', String(après3['84834090']?.[0]?.technicalSpec || '').length > 150 && /8483\.40\.90/.test(après3['84834090'][0].technicalSpec));
assert('đổi tên tệp: tự cập nhật tên tệp nguồn mới', après3['84834090'][0].sourceFile === 'community:tb-tchq-ren/legal-customs-lot-ren.json', après3['84834090'][0].sourceFile);


// B-3: kiểm intl-precedent vào kho với đủ trường quốc tế
{
  const kho = JSON.parse(readFileSync(join(dataDir, 'precedents.json'), 'utf8'));
  const itl = (kho['847989'] || []).find((p) => p.tbTchqNumber === 'M82907');
  assert('intl-precedent vào kho theo kind mới', !!itl, JSON.stringify(kho['847989'] || []).slice(0, 200));
  assert('intl: đủ instrumentType/country/snapshotHash/retrievedAt/sourceLicense', itl?.instrumentType === 'RULING' && itl?.country === 'US' && /^[0-9a-f]{64}$/.test(itl?.snapshotHash || '') && itl?.retrievedAt === '2026-10-15' && itl?.sourceLicense === 'public-domain-us-gov', JSON.stringify(itl).slice(0, 260));
}

// ── Bước 12 (B-3): mic-product → ghi kho riêng data/mic-products.json, KHÔNG đụng precedents ──
writeFileSync(join(dataDir, 'mic-products.json'), JSON.stringify({ documents: [], generatedAt: '2026-10-15T00:00:00Z' }, null, 2));
mkdirSync(join(communityDir, 'mic'), { recursive: true });
const micLotFile = join(communityDir, 'mic', 'mic-lot-2026-10-15.json');
writeFileSync(micLotFile, JSON.stringify({
  kind: 'mic-product',
  contributor: { name: 'mic-agent-2026-10', github: 'ozvietnam' },
  license: 'CC-BY-SA-4.0',
  submittedAt: '2026-10-15T00:00:00Z',
  records: [
    { title: 'Reading Glasses Blue Light PC Frame', skuId: 'gpDYSaTAVEkZ', urlNguon: 'https://gpDYSaTAVEkZ.en.made-in-china.com/product/prod1.html', retrievedAt: '2026-10-15', hsCodeHint: '9004900009', specs: [{ key: 'Material', value: 'PC Frame' }] },
    { title: 'Wireless Earbuds TWS Bluetooth 5.3', skuId: 'abcXYZ987', urlNguon: 'https://abcxyz.en.made-in-china.com/product/prod2.html', retrievedAt: '2026-10-15', hsCodeHint: '8518300099', specs: [{ key: 'Battery', value: '500mAh' }] },
  ],
}));
spawnSync(process.execPath, [join(root, 'scripts', 'merge-community.mjs'), '--community-dir', communityDir, '--data-dir', dataDir], { encoding: 'utf8' });
const mic1 = JSON.parse(readFileSync(join(dataDir, 'mic-products.json'), 'utf8'));
assert('mic: ghi vào kho riêng mic-products.json với shape {documents, generatedAt}', Array.isArray(mic1.documents) && typeof mic1.generatedAt === 'string');
assert('mic: 2 bản ghi đầu tiên vào kho', mic1.documents?.length === 2, `n=${mic1.documents?.length}`);
assert('mic: ghi skuId, title, hsCodeHint', mic1.documents[0].skuId === 'gpDYSaTAVEkZ' && /Reading Glasses/.test(mic1.documents[0].title) && mic1.documents[0].hsCodeHint === '9004900009');
assert('mic: ghi contributor + sourceFile', mic1.documents[0].contributor?.name === 'mic-agent-2026-10' && mic1.documents[0].sourceFile?.includes('mic-lot-2026-10-15.json'));
assert("mic: KHÔNG đụng precedents.json (kiểm tra bản ghi '11082000' cũ vẫn còn)", JSON.parse(readFileSync(join(dataDir, 'precedents.json'), 'utf8'))['11082000']?.length === 1);
assert('mic: KHÔNG đụng precedents.json (84137090 vẫn 1)', JSON.parse(readFileSync(join(dataDir, 'precedents.json'), 'utf8'))['84137090']?.length === 1);

// Refresh: nộp lại cùng tệp với bản giàu hơn (giàu thêm specs) → thay tại chỗ, không nhân bản
const refreshLot = JSON.parse(readFileSync(micLotFile, 'utf8'));
writeFileSync(micLotFile, JSON.stringify({
  ...refreshLot,
  records: [
    { ...refreshLot.records[0], title: 'Reading Glasses Blue Light PC Frame + Metal Hinge', specs: [{ key: 'Material', value: 'PC Frame' }, { key: 'Hinge', value: 'Metal' }] },
    refreshLot.records[1],
  ],
}));
spawnSync(process.execPath, [join(root, 'scripts', 'merge-community.mjs'), '--community-dir', communityDir, '--data-dir', dataDir], { encoding: 'utf8' });
const mic2 = JSON.parse(readFileSync(join(dataDir, 'mic-products.json'), 'utf8'));
assert('mic refresh: thay tại chỗ, không nhân bản', mic2.documents?.length === 2, `n=${mic2.documents?.length}`);
assert('mic refresh: title được cập nhật', /Metal Hinge/.test(mic2.documents[0].title), mic2.documents[0].title);
assert('mic refresh: specs được làm giàu', mic2.documents[0].specs?.length === 2, JSON.stringify(mic2.documents[0].specs));

// Nộp lại y hệt → skippedDup (vẫn 2 docs, không thêm)
spawnSync(process.execPath, [join(root, 'scripts', 'merge-community.mjs'), '--community-dir', communityDir, '--data-dir', dataDir], { encoding: 'utf8' });
const mic3 = JSON.parse(readFileSync(join(dataDir, 'mic-products.json'), 'utf8'));
assert('mic y hệt: skip dup, vẫn 2 docs', mic3.documents?.length === 2, `n=${mic3.documents?.length}`);

// Refresh same source nhận diện bằng skuId HOẶC urlNguon (giàu hơn ở 1 trong 2 đều được)
writeFileSync(micLotFile, JSON.stringify({
  ...refreshLot,
  records: [
    { ...refreshLot.records[0], urlNguon: 'https://gpDYSaTAVEkZ.en.made-in-china.com/product/prod1-renamed-slug.html' },
    refreshLot.records[1],
  ],
}));
spawnSync(process.execPath, [join(root, 'scripts', 'merge-community.mjs'), '--community-dir', communityDir, '--data-dir', dataDir], { encoding: 'utf8' });
const mic4 = JSON.parse(readFileSync(join(dataDir, 'mic-products.json'), 'utf8'));
assert('mic refresh theo skuId cũng match khi urlNguon đổi (cùng sourceFile)', mic4.documents?.length === 2 && /prod1-renamed/.test(mic4.documents[0].urlNguon), JSON.stringify(mic4.documents[0]));

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
