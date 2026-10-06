// "trừ <vật liệu>" trong nhãn dòng biểu thuế (06/10/2026): bắt mâu thuẫn cứng + KHÔNG bắt nhầm mã đúng
// trên toàn bộ tờ khai thật (đo lúc viết: 0/5.152 — test đỏ nếu dữ liệu/quy tắc đổi làm bắt nhầm).
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { checkPolarity, exclusionConflicts } = require('../lib/subheading-check');
let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${x}`); } };
check('"trừ plastic" + nhựa PLA → mâu thuẫn', !checkPolarity('95030050', 'đồ chơi in 3D chất liệu nhựa PLA').ok);
check('"trừ plastic" + 塑料 → mâu thuẫn', !checkPolarity('95030050', '材质: 塑料').ok);
check('"trừ plastic" + gỗ → không mâu thuẫn', checkPolarity('95030050', 'đồ chơi xếp hình bằng gỗ').ok);
check('"trừ <loại hàng>" không áp (đi-ốt)', exclusionConflicts('85411000', 'Đi ốt dán ES1J 1000V').length === 0);
const gold = readFileSync(new URL('../data/oz-gold-final.jsonl', import.meta.url), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const fp = gold.filter((g) => { const hs = String(g.hsCode).replace(/\D/g, ''); return hs.length === 8 && [g.sampleDesc, g.tenHang].some((t) => t && exclusionConflicts(hs, t).length); });
check(`tờ khai thật: mã ĐÚNG không bị "trừ X" bắt nhầm (${fp.length}/${gold.length})`, fp.length === 0, JSON.stringify(fp.slice(0, 3).map((g) => [g.hsCode, String(g.sampleDesc).slice(0, 60)])));
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
