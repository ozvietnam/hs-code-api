#!/usr/bin/env node
/** Khoá gộp qt-duyet: chữ ký đúng mới mở; sai sha / sai PR / sai khoá / thiếu tệp đều đóng. Không mạng. */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { quyet, thuocVungKhoa, thongDiep } from '../.github/qt-duyet/qt-duyet.mjs';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0;
const kiem = (ten, dk) => { assert.ok(dk, ten); n += 1; console.log(`PASS ${ten}`); };
const K = crypto.generateKeyPairSync('ed25519'); const K2 = crypto.generateKeyPairSync('ed25519');
const pub = K.publicKey.export({ type: 'spki', format: 'pem' });
const repo = 'o/r'; const sha = 'a'.repeat(40); const sha2 = 'b'.repeat(40);
const ky = (so, s, k = K) => `QT-DUYET ${s} ${crypto.sign(null, Buffer.from(thongDiep(repo, so, s)), k.privateKey).toString('base64')}`;
const q = (tep, binhLuan, so = 7, s = sha) => quyet({ repo, so, sha: s, tep, binhLuan, khoaCongKhai: pub }).state;

kiem('chỉ data/docs/scripts → không khoá', q(['data/so-tay/8481.json', 'docs/a.md', 'scripts/test-a.mjs'], []) === 'success');
for (const t of ['lib/engine-loop.js', 'api/classify.js', 'server.js', 'data/luat/bang-co.json', 'data/prompts/a.txt', '.github/workflows/x.yml', 'Dockerfile', 'package.json']) kiem(`${t} → khoá`, thuocVungKhoa(t) && q(['docs/a.md', t], []) === 'pending');
kiem('chữ ký đúng → mở', q(['lib/a.js'], ['chào', `ghi chú\n${ky(7, sha)}\n`]) === 'success');
kiem('CA NGƯỢC: gõ "QT DUYỆT" không chữ ký → khoá', q(['lib/a.js'], ['**QT DUYỆT.**', `QT-DUYET ${sha} ${'A'.repeat(86)}==`]) === 'pending');
kiem('CA NGƯỢC: chữ ký commit cũ, đẩy commit mới → khoá lại', q(['lib/a.js'], [ky(7, sha)], 7, sha2) === 'pending');
kiem('CA NGƯỢC: chép chữ ký từ PR khác → khoá', q(['lib/a.js'], [ky(8, sha)]) === 'pending');
kiem('CA NGƯỢC: ký bằng khoá khác → khoá', q(['lib/a.js'], [ky(7, sha, K2)]) === 'pending');
kiem('CA NGƯỢC: sửa sha trong dòng ký → khoá', q(['lib/a.js'], [ky(7, sha).replace(sha, sha2)], 7, sha2) === 'pending');
kiem('không đọc đủ danh sách tệp → khoá', q(null, []) === 'pending');
const yml = fs.readFileSync(path.join(GOC, '.github/workflows/qt-duyet.yml'), 'utf8');
kiem('workflow chỉ checkout main, không chạm mã của PR', /ref: main/.test(yml) && (yml.match(/actions\/checkout@/g) || []).length === 1 && !/head\.(sha|ref)|github\.head_ref|comment\.body|pull_request\.(title|body)/.test(yml));
kiem('khoá công khai trong repo đọc được, là ed25519', crypto.createPublicKey(fs.readFileSync(path.join(GOC, '.github/qt-duyet/qt-duyet.pub.pem'), 'utf8')).asymmetricKeyType === 'ed25519');
kiem('không có khoá riêng trong .github', !fs.readdirSync(path.join(GOC, '.github/qt-duyet')).some((f) => /PRIVATE KEY/.test(fs.readFileSync(path.join(GOC, '.github/qt-duyet', f), 'utf8').replace(/ed25519: khoá riêng/g, ''))));
console.log(`\n${n} passed, 0 failed`);
