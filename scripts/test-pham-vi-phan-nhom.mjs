// #1109: dieuKienNut[<pn6>] = phạm vi chính chữ phân nhóm — cổng 1 bỏ vector ngoài phạm vi; không vào sổ tay lúc chạy.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
const require = createRequire(import.meta.url);
const { nhapDongCung, gieoNhap, THU_MUC_DONG_CUNG_38864C8 } = await import('./fixtures/ho-so/nhap-dong-cung.mjs');
const C = require('../lib/ho-so/cong-ranh-gioi.js');
const S = require('../lib/so-tay.js');
let pass = 0; let fail = 0;
const check = (n, c, d) => { if (c) pass++; else { fail++; console.log('✗', n, d === undefined ? '' : JSON.stringify(d).slice(0, 300)); } };

const src = { ...S.sourcesFor('8703'), ...S.nguonTieuDe('8703') };
check('1a nguồn tieuDe.<pn6> = tên nguyên văn phân nhóm', /trên 1\.500 cc nhưng không quá 3\.000 cc/.test(src['tieuDe.870323'] || ''), src['tieuDe.870323']);
// Bản đông cứng (test không đọc bản nháp sống — test-cong-cu-vong-3 4a); gieo vào HS_DATA_DIR cho CLI.
const b = nhapDongCung('870323', THU_MUC_DONG_CUNG_38864C8);
gieoNhap('870323', b);
check('1b bản 870323 có dieuKienNut[870323]', (b.dieuKienNut || []).some((m) => m.id === '870323'));
let out = ''; try { out = execFileSync('node', ['scripts/so-hoa-ranh-gioi.mjs', '--kiem', '--pn6=870323'], { encoding: 'utf8' }); } catch (e) { out = String(e.stdout || ''); }
check('2a 870323 không còn cong1-khong-phu-kin (vector 1.499 cc ngoài phân nhóm bị bỏ)', !/cong1-khong-phu-kin/.test(out), out.slice(-300));
check('2b 870323 qua cổng', /XANH 870323/.test(out), out.slice(-300));
// Bỏ mục phạm vi ⇒ lỗi cũ quay lại (chứng minh mục có tác dụng)
const b2 = { ...b, dieuKienNut: (b.dieuKienNut || []).filter((m) => m.id !== '870323') };
let k2 = null; try { k2 = C.kiemRanhGioi('870323', b2); } catch (e) { k2 = { loi: ['ERR ' + e.message] }; }
check('2c bỏ dieuKienNut[870323] ⇒ cong1-khong-phu-kin trở lại', (k2.loi || []).some((l) => /cong1-khong-phu-kin/.test(l)), (k2.loi || []).slice(0, 3));
// apDung bỏ mục id === pn6 (cong-ranh-gioi.js#apDung) — bản DUYET thật kiểm ở test-cong-ranh-gioi khi có PN6 đã duyệt mang mục này.
console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
