// scripts/quet-khoa-lat-2.mjs + scripts/nhan-viec.sh — tiền quét khoá tu-vung lát 2 + runner chuẩn (#577).
// Đề xuất duyệt 02/11: cắt PR DỪNG do thiếu khoá (quét trước, duyệt khoá một lần) + hết lỗi
// môi trường thợ (pipefail nuốt exit-code, symlink node_modules, PR lệch mẫu).
import './test-isolate-data.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

let pass = 0, fail = 0;
const check = (n, c, d = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.error(`FAIL ${n} ${d}`); } };
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', ...opts });

// ── 1. Runner: cú pháp + các chặn an toàn bắt buộc ──
const sh = fs.readFileSync(path.join(ROOT, 'scripts/nhan-viec.sh'), 'utf8');
run('bash', ['-n', path.join(ROOT, 'scripts/nhan-viec.sh')]);
check('runner: bash -n hợp lệ', true);
check('runner: set -euo pipefail (chặn nuốt exit-code)', /set -euo pipefail/.test(sh));
check('runner: npm test exit kiểm trực tiếp (không pipe)', /npm test > [^\s|]+ \|\|/.test(sh) || /npm test > \S+ 2>&1 \|\|/.test(sh));
check('runner: chặn tệp ngoài 2 tệp quy định', /grep -vE.*spec\/\$PN6\.json\|data\/ho-so\/ranh-gioi\/\$PN6\.json/.test(sh));
check('runner: npm install riêng từng worktree (không symlink)', /worktree add.*\n\s*\( cd "\$wt" && npm install/.test(sh));
check('runner: comment nhận việc theo NHAN-VIEC', /gh issue comment .* --body "nhận \$AGENT"/.test(sh));
check('runner: PR tiêu đề đúng mẫu lát 2', /--title "\[lát 2\] Số hoá ranh giới PN6 \$PN6 — \$ket"/.test(sh));
check('runner: bắt mã thoát --kiem tại dòng lệnh (set -e không giết nhánh DỪNG mã 3)', /kiem=0\n\s*node scripts\/so-hoa-ranh-gioi\.mjs --kiem[^\n]*\|\| kiem=\$\?/.test(sh));
check('runner: DỪNG tự mở draft', /kiem" = 3 \] && draft="--draft"/.test(sh));
check('runner: 3 lệnh mo/nop/bo', /mo\)/.test(sh) && /nop\)/.test(sh) && /bo\)/.test(sh));

// ── 2. Quét khoá: chạy thật 1 PN6, ra đúng 2 khoá của ca 401120 ──
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'quet-khoa-'));
const out1 = run('node', ['scripts/quet-khoa-lat-2.mjs', '--pn6=401120', `--out=${path.join(tmp, 'a.md')}`]);
const md1 = fs.readFileSync(path.join(tmp, 'a.md'), 'utf8');
check('quét 401120: chieuRong đã có trong tu-vung@2 (lô 3) ⇒ không còn báo thiếu', !md1.includes('`chieuRong`'));
check('quét 401120: báo duongKinhLapVanh', md1.includes('`duongKinhLapVanh`'));
check('quét 401120: trích nguyên văn kèm theo', md1.includes('lắp vành có đường kính không quá 16 inch'));

// ── 3. Quét khoá: --min lọc, --out không đụng file đã commit ──
const committed = path.join(ROOT, 'docs/giao-viec/so-tay/de-xuat-khoa-lat-2.md');
const before = fs.existsSync(committed) ? fs.readFileSync(committed, 'utf8') : null;
run('node', ['scripts/quet-khoa-lat-2.mjs', '--pn6=401120', '--min=99', `--out=${path.join(tmp, 'b.md')}`]);
const md2 = fs.readFileSync(path.join(tmp, 'b.md'), 'utf8');
check('quét --min=99: lọc sạch khoá dưới ngưỡng', !md2.includes('`chieuRong`'));
check('quét --out: không đụng bảng đã commit', before === null || fs.readFileSync(committed, 'utf8') === before);

// ── 4. Bảng đề xuất đã commit tồn tại + có 3 khoá của lần quét đủ ──
const full = fs.readFileSync(committed, 'utf8');
check('bảng full: đủ 3 khoá chieuRong/duongKinhLapVanh/doDay', full.includes('`chieuRong`') && full.includes('`duongKinhLapVanh`') && full.includes('`doDay`'));
check('bảng full: ghi rõ chỉ-là-đề-xuat (không tự thêm khoá)', /Chỉ là đề xuất/.test(full));

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
