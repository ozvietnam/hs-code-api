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

// Gạch sâu hơn chữ số: KHÔNG gom theo gạch (CEO 11/10: quan hệ ăn thẳng vào số, gạch chỉ là tầng hiển thị).
check('85043121 (5 gạch) và 85043123 (4 gạch) cùng cha 8504312 theo chữ số; gạch chỉ ghi lại', T.nodeOf('85043121').parent === '8504312' && T.nodeOf('85043123').parent === '8504312' && T.nodeOf('85043121').gach === 5 && T.nodeOf('85043123').gach === 4);
check('không có nút nào sinh từ gạch', ![...T.tree().nodes.values()].some((n) => n.cap === 'TIEU_DE_PHU'));

// Khung trên: phần → chương → nhóm, cũng từ chữ số (2 số đầu = chương) + data/hs-sections.json.
check('tổ tiên của 85044090: Phần XVI > Chương 85 > 8504 > 850440', T.ancestorsOf('85044090').map((n) => n.id).join('>') === 'P:XVI>85>8504>850440', T.ancestorsOf('85044090').map((n) => n.id).join('>'));
check('chương 85 có tên tiếng Việt từ chú giải chương và tên WCO', /Máy điện/.test(T.nodeOf('85').tenVi || '') && /Electrical/i.test(T.nodeOf('85').tenEn || ''), T.nodeOf('85').tenVi);
check('phần XVI có tên tiếng Việt, chứa chương 84 và 85', T.nodeOf('P:XVI').tenVi && T.nodeOf('P:XVI').children.includes('84') && T.nodeOf('P:XVI').children.includes('85'));
check('render được từ chương', /^CHƯƠNG 85/.test(T.render('85')) && /NHÓM 8504/.test(T.render('85')));

// "Loại khác" định nghĩa bằng quan hệ.
{
  const lk = T.loaiKhacOf('85042119');
  check('85042119: cha 8504211, trừ anh em có tên [85042111], tổ tiên có tên 850421', lk && lk.cha === '8504211' && lk.anhEmCoTen.join() === '85042111' && lk.toTienCoTen === '850421' && lk.dinhNghiaDuoc === true, JSON.stringify(lk));
  const lk2 = T.loaiKhacOf('85044090');
  check('85044090: cha có tên (850440) → chuỗi 1 bước, trừ 8504401 (tiêu đề QG) … 85044040', lk2 && lk2.toTienCoTen === '850440' && lk2.chuoi.length === 1 && lk2.anhEmCoTen.includes('8504401') && lk2.anhEmCoTen.includes('85044040'), JSON.stringify(lk2));
  check('"Loại khác, dùng cho chiếu sáng gia dụng" (85392233) là LK có điều kiện, không phải LK trần', T.nodeOf('85392233').loaiKhac && !T.nodeOf('85392233').loaiKhacTran && T.nodeOf('85392239').loaiKhacTran);
  check('85392239: anh em có LK có điều kiện → chưa định nghĩa được bằng máy', T.loaiKhacOf('85392239').dinhNghiaDuoc === false);
  check('mã không phải Loại khác → null', T.loaiKhacOf('85042111') === null);
  // Đợt 0A (ghi-nhan-mo-ta-ecus mục 32.3): phạm vi "Loại khác" nhiều tầng = tổ tiên có tên TRỪ mọi tầng của chuoi.
  const lk3 = T.loaiKhacOf('39269099');
  const TANG_TIEU_DE = ['39269091', '39269092', '39269093'];
  const TANG_6_SO = ['39269010', '39269020', '3926903', '3926904', '3926905', '39269060', '3926908'];
  check('39269099: anhEmCoTen giữ tầng gần nhất (hợp đồng cũ) = 39269091–93', lk3 && lk3.anhEmCoTen.join() === TANG_TIEU_DE.join(), JSON.stringify(lk3));
  check('39269099: truDayDu = tầng tiêu đề 3926909 + tầng 6 số 392690 (đủ 10 nút, tầng gần trước), tổ tiên có tên 392690',
    lk3.truDayDu.join() === [...TANG_TIEU_DE, ...TANG_6_SO].join() && lk3.toTienCoTen === '392690' && lk3.chuoi.length === 2, JSON.stringify(lk3.truDayDu));
  const g3 = T.exclusionLeavesByTier('39269099');
  check('39269099: exclusionLeavesByTier mở tiêu đề tầng 6 số ra dòng lá có tên (39269032, 39269041…), bỏ "Loại khác" trần',
    g3.length === 2 && g3[0].nut === '3926909' && g3[0].la.join() === TANG_TIEU_DE.join() && g3[1].nut === '392690'
      && ['39269010', '39269020', '39269032', '39269041', '39269060', '39269081'].every((h) => g3[1].la.includes(h))
      && !g3[1].la.some((h) => T.nodeOf(h).loaiKhacTran), JSON.stringify(g3));
  check('39269099: namedExclusionLeaves = mọi tầng; namedSiblingLeaves (cũ) chỉ tầng gần',
    T.namedExclusionLeaves('39269099').length === g3[0].la.length + g3[1].la.length && T.namedSiblingLeaves('39269099').join() === TANG_TIEU_DE.join());
  // Một tầng: không đổi.
  check('85044090 (một tầng): truDayDu ≡ anhEmCoTen; namedExclusionLeaves ≡ namedSiblingLeaves',
    lk2.truDayDu.join() === lk2.anhEmCoTen.join() && T.namedExclusionLeaves('85044090').join() === T.namedSiblingLeaves('85044090').join());
  check('mã không phải Loại khác: namedExclusionLeaves ≡ namedSiblingLeaves, exclusionLeavesByTier rỗng',
    T.namedExclusionLeaves('85044011').join() === T.namedSiblingLeaves('85044011').join() && T.exclusionLeavesByTier('85044011').length === 0);
  // dinhNghiaDuoc xét MỌI tầng: tầng nhóm 0206 còn "Loại khác, tươi hoặc ướp lạnh" có điều kiện → chưa định nghĩa được.
  check('02062900: tầng trên còn "Loại khác, …" có điều kiện → dinhNghiaDuoc false', T.loaiKhacOf('02062900').dinhNghiaDuoc === false);
}

// Chương 98 (không có trong WCO) vẫn dựng được bằng chữ số.
check('chương 98: lá có đường về nhóm 4 số và chương 98', (() => { const n = [...T.tree().nodes.values()].find((x) => x.cap === 8 && x.id.startsWith('98')); const a = T.ancestorsOf(n.id).map((x) => x.id); return n && a.includes('98') && a.includes(n.id.slice(0, 4)); })());

// Bất biến toàn cục.
const s = T.stats();
console.log('thống kê:', JSON.stringify(s));
check('đủ 11.871 lá, 1.269 nhóm, 97 chương, 21 phần', s.la === Object.keys(require('../lib/data.js').taxData).length && s.nhom4 >= 1200 && s.chuong >= 96 && s.phan === 21, JSON.stringify(s));
check('mọi lá về được nhóm 4 số', s.laKhongVeNhom === 0);
check('không nút ảo nào trống con', s.nutAoKhongCon === 0);
check('đa số "Loại khác" định nghĩa được bằng quan hệ (≥ 70%)', s.loaiKhacDinhNghiaDuoc / s.loaiKhac >= 0.7, `${s.loaiKhacDinhNghiaDuoc}/${s.loaiKhac}`);
check('lệch gạch chỉ là ghi chú dữ liệu (có danh sách, không đổi cấu trúc)', Array.isArray(T.tree().anomalies) && T.tree().anomalies.every((a) => a.ma && a.loai === 'gach-lech'), String(s.batThuong));
check('render 8539 có nhóm, phân nhóm WCO và nhãn [LK]', /NHÓM 8539/.test(T.render('8539')) && /853921/.test(T.render('8539')) && /\[LK\]/.test(T.render('8539')));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
