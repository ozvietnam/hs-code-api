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

const again = spawnSync(process.execPath, [
  join(root, 'scripts', 'merge-community.mjs'),
  '--community-dir', communityDir,
  '--data-dir', dataDir,
], { encoding: 'utf8' });
const after = JSON.parse(readFileSync(join(dataDir, 'precedents.json'), 'utf8'));
assert('chạy lại không nhân bản', after['84137090'].length === 1, `n=${after['84137090']?.length}`);
assert('chạy lại exit 0', again.status === 0, again.stderr || again.stdout);

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
