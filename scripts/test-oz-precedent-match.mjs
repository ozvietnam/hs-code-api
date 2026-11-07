// Khoá cách so chữ của tìm tiền lệ Oz (lib/oz-precedent-search.js, 19/10/2026): nguyên từ, giữ dấu, trọng số IDF.
// Ca gốc: tấm thép bảo vệ gầm/pin Leapmotor bị cờ "Tiền lệ Oz xếp nhóm 5903" vì "gầm"→"gam" ⊂ "ngâm".
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const oz = require('../lib/oz-precedent-search.js');
let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => { if (cond) { pass++; console.log(`PASS ${name}`); } else { fail++; console.log(`FAIL ${name} ${extra}`); } };
const nz = (s) => String(s || '').replace(/\D/g, '');
const top = async (q, n = 5) => (await oz.searchOzByKeyword(q, { limit: n })).items || [];

// 1. Không còn khớp chuỗi con bỏ dấu
const gam = await top('tấm chắn gầm xe ô tô', 10);
check('"tấm chắn gầm xe ô tô" KHÔNG ra vải ngâm tẩm 5903', !gam.some((it) => nz(it.hsCode).startsWith('5903')), JSON.stringify(gam.map((i) => i.tenHang)));
check('… và mọi kết quả đều chứa nguyên từ "gầm" hoặc "chắn"', gam.every((it) => /\bgầm\b|\bchắn\b/u.test(String(it.tenHang).toLowerCase()) || it.matchCoverage < 75), JSON.stringify(gam.map((i) => [i.tenHang, i.matchCoverage])));
const rang = await top('Thanh răng', 5);
check('"Thanh răng" không đưa "Đèn thanh led" lên đầu', !(rang[0] && /đèn/i.test(rang[0].tenHang)), JSON.stringify(rang.map((i) => i.tenHang)));

// 2. Khớp ≥75% chỉ được do tiền lệ chắn gầm THẬT, không do chữ chung chung.
//    (11/2026: kho Oz nay CÓ tiền lệ "Ốp bảo vệ gầm xe ô tô 4 chỗ (tấm che gầm)" — cùng loại món
//     Leapmotor của ca gốc, nên khớp ≥75% là true positive. Guard giữ nguyên: mọi khớp ≥75% phải
//     chứa nguyên từ "gầm" (tiền lệ chắn gầm thật); nếu "Tấm silicone/kính…" mà ≥75% thì vẫn FAIL.)
for (const q of ['tấm bảo vệ gầm xe bảo vệ pin', 'tấm bảo vệ gầm', 'tấm chắn gầm xe ô tô', 'tấm bảo vệ pin xe điện']) {
  const items = await top(q, 5);
  const gia = items.filter((it) => it.matchCoverage >= 75 && !/gầm/u.test(String(it.tenHang).toLowerCase()));
  check(`"${q}": khớp ≥75% chỉ khi là tiền lệ chắn gầm thật (không do chữ chung chung)`, gia.length === 0, JSON.stringify(items.map((i) => [i.tenHang, i.matchCoverage])));
}

// 3. Truy vấn không dấu vẫn tìm được (so nguyên từ trên bản bỏ dấu)
const plain = await top('day rut nhua', 5);
check('"day rut nhua" (không dấu) vẫn ra dây rút nhựa', plain.some((it) => /dây rút/i.test(it.tenHang)), JSON.stringify(plain.map((i) => i.tenHang)));

// 4. Chữ không có trong kho (tên hãng/model) không kéo tụt độ khớp
const a = (await top('ổ cắm điện', 1))[0];
const b = (await top('ổ cắm điện Leapmotor XZ9000', 1))[0];
check('chữ lạ (hãng/model) bị bỏ khỏi mẫu số — độ khớp giữ nguyên', a && b && a.matchCoverage === b.matchCoverage, `${a?.matchCoverage} vs ${b?.matchCoverage}`);

// 5. Truy vấn rỗng / toàn chữ lạ
check('truy vấn toàn chữ lạ → 0 kết quả', (await top('zzqxw qqzzy', 5)).length === 0);

// 6. Công tắc so A/B
process.env.HS_OZ_MATCH = 'legacy';
const legacy = await top('tấm chắn gầm xe ô tô', 10);
delete process.env.HS_OZ_MATCH;
check('HS_OZ_MATCH=legacy còn chạy (đối chứng)', legacy.length > 0);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
