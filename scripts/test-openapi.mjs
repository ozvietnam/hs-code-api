#!/usr/bin/env node
/**
 * public/openapi.json đủ để agent gọi tool đúng: mọi POST có requestBody, mọi
 * $ref trỏ tới schema có thật, suggest/tax có schema response cụ thể, và bản
 * commit khớp bản sinh từ scripts/build-openapi.mjs.
 */
import fs from 'fs';
import { execFileSync } from 'child_process';

const before = fs.readFileSync('public/openapi.json', 'utf8');
execFileSync('node', ['scripts/build-openapi.mjs'], { stdio: 'pipe' });
const after = fs.readFileSync('public/openapi.json', 'utf8');
const strip = (t) => t.replace(/"at": "\d{4}-\d{2}-\d{2}"/, '');
const spec = JSON.parse(after);

let fail = 0;
const check = (n, c, d) => { console.log(`${c ? 'PASS' : 'FAIL'} ${n}${!c && d ? ' ' + JSON.stringify(d) : ''}`); if (!c) fail += 1; };
// Luôn trả lại bản gốc — test không được làm bẩn repo.
fs.writeFileSync('public/openapi.json', before);
check('public/openapi.json khớp bản sinh (chạy node scripts/build-openapi.mjs)', strip(before) === strip(after));

const posts = Object.entries(spec.paths).filter(([, v]) => v.post).map(([k, v]) => [k, v.post]);
check('mọi POST có requestBody', posts.every(([, o]) => o.requestBody), posts.filter(([, o]) => !o.requestBody).map(([k]) => k));
const refs = [...after.matchAll(/"\$ref": "#\/components\/schemas\/([A-Za-z]+)"/g)].map((m) => m[1]);
const missing = refs.filter((r) => !spec.components.schemas[r]);
check('mọi $ref có schema', missing.length === 0, missing);
check('/api/suggest trả status + nextAction', Boolean(spec.paths['/api/suggest'].post.responses[200].content['application/json'].schema.properties?.nextAction));
check('/api/tax có tham số origin + schema acfta', spec.paths['/api/tax'].get.parameters.some((p) => p.name === 'origin') && Boolean(spec.paths['/api/tax'].get.responses[200].content['application/json'].schema.properties?.acfta));
process.exit(fail ? 1 : 0);
