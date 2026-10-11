#!/usr/bin/env node
/**
 * Cây HS 4 → 6 → 8 dựng từ chữ số (#236): cha đúng, anh em không dính nhau qua ranh giới mã, "Loại khác" định nghĩa
 * bằng quan hệ, nút ảo luôn có con, mọi lá về được nhóm. Chỉ đọc data/tax.json, không ghi gì.
 */
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const T = require('../lib/hs-tree.js');

let pass = 0; let fail = 0;
const check = (name, cond, extra = '') => { if (cond) { pass += 1; console.log(`PASS ${name}`); } else { fail += 1; console.log(`FAIL ${name} ${extra}`); } };
const ids = (arr) => arr.map((n) => n.id);

// Cạm bẫy cũ (lib/hs-breadcrumb.js): lần ngược theo gạch gán 85041000 làm cha của 85044090.
check('85044090 cha là phân nhóm WCO 850440, không phải lá 85041000', T.nodeOf('85044090').parent === '850440', T.nodeOf('85044090').parent);
check('850440 là phân nhóm một gạch (xxxx.x0), con trực tiếp của nhóm 8504', T.nodeOf('850440').parent === '8504' && T.nodeOf('850440').depth === 1);
check('850421 (xxxx.xy) nằm dưới nhóm một gạch 85042, dưới 8504', T.nodeOf('850421').parent === '85042' && T.nodeOf('85042').parent === '8504');
check('tên tiếng Anh WCO gắn vào 850421', /transformer/i.test(T.nodeOf('850421').tenEn || ''), T.nodeOf('850421').tenEn);

// Anh em cùng độ sâu nhưng khác mã KHÔNG dính nhau.
check('85042111 và 85042192 khác cha (8504211 vs 8504219)', T.nodeOf('85042111').parent === '8504211' && T.nodeOf('85042192').parent === '8504219');
check('tiêu đề quốc gia 8504219 nghi là "Loại khác:" (chữ số 7 = 9)', T.nodeOf('8504219').nghiLoaiKhac === true && T.nodeOf('8504211').nghiLoaiKhac === false);
check('anh em của 85042119 chỉ là 85042111', ids(T.siblingsOf('85042119')).join() === '85042111', ids(T.siblingsOf('85042119')).join());

// Lá cấp quốc gia thứ nhất (chữ số 8 = 0) là con trực tiếp của phân nhóm.
check('85042310 (…10) con trực tiếp của 850423', T.nodeOf('85042310').parent === '850423');
check('85044020 (…20) con trực tiếp của 850440, cùng cha với 85044090', T.nodeOf('85044020').parent === '850440' && ids(T.siblingsOf('85044090')).includes('85044020'));

// Một dòng = chính phân nhóm.
check('85393200 là chính phân nhóm 853932 (mã 6 số trỏ vào lá, có tên WCO)', T.nodeOf('85393200').laPhanNhom === '853932' && T.nodeOf('853932').id === '85393200' && /mercury|sodium/i.test(T.nodeOf('85393200').tenEn || ''), T.nodeOf('85393200').tenEn);
check('nhóm không chia (xxxx0000) treo thẳng dưới nhóm 4 số', (() => { const n = [...T.tree().nodes.values()].find((x) => x.cap === 8 && x.id.endsWith('0000')); return n && n.parent === n.id.slice(0, 4); })());

// Sâu hơn chữ số: tiêu đề phụ gom theo dãy, cắt tại "Loại khác" trần.
check('85043121/85043122 chung một tiêu đề phụ, tách khỏi 85043123', T.nodeOf('85043121').parent === T.nodeOf('85043122').parent && T.nodeOf('85043121').parent !== T.nodeOf('85043123').parent);
check('tiêu đề phụ của 85043121 nằm dưới 8504312', T.nodeOf(T.nodeOf('85043121').parent).parent === '8504312');
check('85043411–13 và 85043414–19 là hai nhóm anh em (cắt sau "Loại khác" trần 85043413)', T.nodeOf('85043413').parent === T.nodeOf('85043411').parent && T.nodeOf('85043414').parent !== T.nodeOf('85043413').parent && T.nodeOf('85043419').parent === T.nodeOf('85043414').parent);

// "Loại khác" định nghĩa bằng quan hệ.
{
  const lk = T.loaiKhacOf('85042119');
  check('85042119: cha 8504211, trừ anh em có tên [85042111], tổ tiên có tên 850421', lk && lk.cha === '8504211' && lk.anhEmCoTen.join() === '85042111' && lk.toTienCoTen === '850421' && lk.dinhNghiaDuoc === true, JSON.stringify(lk));
  const lk2 = T.loaiKhacOf('85044090');
  check('85044090: cha có tên (850440) → chuỗi 1 bước, trừ 85044011-group…85044040', lk2 && lk2.toTienCoTen === '850440' && lk2.chuoi.length === 1 && lk2.anhEmCoTen.includes('8504401') && lk2.anhEmCoTen.includes('85044040'), JSON.stringify(lk2));
  check('"Loại khác, dùng cho chiếu sáng gia dụng" (85392233) là LK có điều kiện, không phải LK trần', T.nodeOf('85392233').loaiKhac && !T.nodeOf('85392233').loaiKhacTran && T.nodeOf('85392239').loaiKhacTran);
  check('85392239: anh em có LK có điều kiện → chưa định nghĩa được bằng máy', T.loaiKhacOf('85392239').dinhNghiaDuoc === false);
  check('mã không phải Loại khác → null', T.loaiKhacOf('85042111') === null);
}

// Chương 98 (không có trong WCO) vẫn dựng được bằng chữ số.
check('chương 98: lá có đường về nhóm 4 số', (() => { const n = [...T.tree().nodes.values()].find((x) => x.cap === 8 && x.id.startsWith('98')); return n && T.ancestorsOf(n.id)[0]?.cap === 4; })());

// Bất biến toàn cục.
const s = T.stats();
console.log('thống kê:', JSON.stringify(s));
check('đủ 11.871 lá, 1.269 nhóm', s.la === Object.keys(require('../lib/data.js').taxData).length && s.nhom4 >= 1200, JSON.stringify(s));
check('mọi lá về được nhóm 4 số', s.laKhongVeNhom === 0);
check('không nút ảo nào trống con', s.nutAoKhongCon === 0);
check('đa số "Loại khác" định nghĩa được bằng quan hệ (≥ 70%)', s.loaiKhacDinhNghiaDuoc / s.loaiKhac >= 0.7, `${s.loaiKhacDinhNghiaDuoc}/${s.loaiKhac}`);
check('bất thường gạch ít (< 2% lá; chủ yếu chương 98 và dòng mất gạch)', s.batThuong < s.la * 0.02, String(s.batThuong));
check('render 8539 có nhóm, phân nhóm WCO và nhãn [LK]', /NHÓM 8539/.test(T.render('8539')) && /853921/.test(T.render('8539')) && /\[LK\]/.test(T.render('8539')));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
