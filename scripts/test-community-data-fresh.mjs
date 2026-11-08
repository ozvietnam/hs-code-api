#!/usr/bin/env node
/** #562 (phần 2): public/community-data.json sinh tay phải theo kịp data/ — không cũ hơn commit cuối
 *  của data/ quá 7 ngày. Chọn phương án "kiểm trong test" thay vì sinh lúc build/deploy vì deploy trên
 *  .120 là wrapper server.js tự dựng (đụng hạ tầng), còn test chạy trong npm test ở mọi máy từ CI đến
 *  máy dev — cũ thì đỏ ngay, không cần ai nhớ chạy lại script. Không có git (tarball) thì chỉ kiểm
 *  generatedAt còn hợp lệ + không quá 90 ngày (lưới dưới cùng, không phụ thuộc máy). */
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const check = (n, c, d) => { c ? (pass++, console.log(`PASS ${n}`)) : (fail++, console.log(`FAIL ${n}`, d === undefined ? '' : JSON.stringify(d))); };

const tep = join(root, 'public', 'community-data.json');
let gen = null;
try { gen = new Date(JSON.parse(readFileSync(tep, 'utf8')).generatedAt); } catch {}
check('community-data.json có generatedAt hợp lệ', gen instanceof Date && !Number.isNaN(gen.getTime()), gen);

let dataDate = null;
try { dataDate = new Date(execSync('git log -1 --format=%cI -- data/', { cwd: root, encoding: 'utf8' }).trim()); } catch {}
if (dataDate) {
  const tre = dataDate.getTime() - gen.getTime();
  check('generatedAt không cũ hơn commit cuối data/ quá 7 ngày', tre <= 7 * 864e5, { generatedAt: gen.toISOString(), dataCommit: dataDate.toISOString(), treNgay: Math.round(tre / 864e5) });
} else {
  console.log('SKIP so sánh với data/ — không có git (giới hạn 90 ngày bên dưới vẫn chạy)');
}
check('generatedAt không quá 90 ngày (lưới dưới cùng)', Date.now() - gen.getTime() <= 90 * 864e5, gen && gen.toISOString());

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
