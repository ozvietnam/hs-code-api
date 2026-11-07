// Test nguồn vb.<id>.<doanId> — văn bản quy chuẩn chuyên ngành (#1101)
import './test-isolate-data.mjs';
import { execFileSync } from 'child_process';
import { join } from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let passed = 0, failed = 0;
const check = (n, c, d = '') => { if (c) { passed++; console.log('PASS', n); } else { failed++; console.error('FAIL', n, d); } };

const ROOT = join(import.meta.dirname, '..');

// 1. Máy kiểm: nguyenVan có trong chữ nguồn
const out = execFileSync('node', [join(ROOT, 'scripts/check-van-ban-chuyen-nganh.mjs')], { encoding: 'utf8' });
check('máy kiểm kho vb XANH (TT 08/2021 2 đoạn)', out.trim().endsWith('XANH'), out.slice(-200));

// 2. Nguồn vb đúng nút: 25010010 ∈ apDungCho d1; sai nút bị chặn
const C = require('../lib/ho-so/cong-ranh-gioi.js');
const fs = require('fs');
const spec = JSON.parse(fs.readFileSync(join(ROOT, 'docs/giao-viec/so-tay/spec/250100.json'), 'utf8'));
// đọc bản nháp qua HS_DATA_DIR (test-isolate-data) — không đụng bản sống data/ho-so (luật 4a)
const duLieuDir = process.env.HS_DATA_DIR;
mkdirSync(join(duLieuDir, 'ho-so/ranh-gioi'), { recursive: true });
fs.copyFileSync(join(ROOT, 'data', 'ho-so', 'ranh-gioi', '250100.json'), join(duLieuDir, 'ho-so/ranh-gioi/250100.json'));
const rg = JSON.parse(fs.readFileSync(join(duLieuDir, 'ho-so/ranh-gioi/250100.json'), 'utf8'));
const ban = { ...rg, trangThai: 'DUYET', duyet: { phien: 't', ngay: '2026-11-07', bam: 'x' }, dieuKienNut: [] };

check('dòng 25010010 dùng nguồn vb.tt08-2021-bnnptnt.d1', (rg.dong8 || []).some((d) => d.hs === '25010010' && d.nguon === 'vb.tt08-2021-bnnptnt.d1' && d.dieuKienSo?.some((x) => x.fact === 'daBoSungIot' && x.op === 'CO')));

// 3. Thử hàng (bước 6 thẻ): i-ốt ⇒ thoa; không i-ốt ⇒ không thoa
const t1 = C.thuViDuHang('250100', ban, '25010010', null, 'Muối thực phẩm đã bổ sung i-ốt, dùng ăn trực tiếp');
check('muối THỰC PHẨM + i-ốt ⇒ thoa:true', t1?.thoa === true, JSON.stringify(t1));
const t2 = C.thuViDuHang('250100', ban, '25010010', null, 'Muối thực phẩm không i-ốt');
check('muối THỰC PHẨM KHÔNG i-ốt ⇒ không thoa', t2?.thoa === false, JSON.stringify(t2));

// 4. Văn bản hết hiệu lực ⇒ lỗi cong3-van-ban-het-hieu-luc (làm kho giả trong tmp)
import { mkdtempSync, writeFileSync, mkdirSync, cpSync, copyFileSync } from 'fs';
import { tmpdir } from 'os';
const dir = mkdtempSync(join(tmpdir(), 'vb1101-'));
mkdirSync(join(dir, 'data/van-ban-chuyen-nganh/nguon'), { recursive: true });
cpSync(join(ROOT, 'data/van-ban-chuyen-nganh'), join(dir, 'data/van-ban-chuyen-nganh'), { recursive: true });
const kho = JSON.parse(fs.readFileSync(join(dir, 'data/van-ban-chuyen-nganh/van-ban.json'), 'utf8'));
kho.vanBan[0].hieuLuc.den = '2020-01-01';
writeFileSync(join(dir, 'data/van-ban-chuyen-nganh/van-ban.json'), JSON.stringify(kho));
const outHet = execFileSync('node', [join(ROOT, 'scripts/check-van-ban-chuyen-nganh.mjs'), `--kho=${join(dir, 'data/van-ban-chuyen-nganh/van-ban.json')}`, `--text=${join(dir, 'data/van-ban-chuyen-nganh/nguon/tt08-2021-bnnptnt.txt')}`], { encoding: 'utf8' });
check('máy kiểm báo HẾT HIỆU LỰC khi hieuLuc.den quá khứ', outHet.includes('HẾT HIỆU LỰC'), outHet.slice(0, 150));

// 5. Không đụng canCuPhapLy: lib/legal-basis.js không tham chiếu van-ban-chuyen-nganh
const lb = fs.readFileSync(join(ROOT, 'lib/legal-basis.js'), 'utf8');
check('legal-basis KHÔNG đụng nguồn vb (luật 7a)', !lb.includes('van-ban-chuyen-nganh'));

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
