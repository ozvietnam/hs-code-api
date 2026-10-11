#!/usr/bin/env node
/**
 * Nguồn gắn vào nút cây HS (#236): mỗi nút biết chú giải / SEN / TB-TCHQ / WCO / sổ tay nào nói về nó, kèm nhãn nguồn;
 * chỉ mục anh em cũ (loai-khac-index) được so với cây. Chỉ đọc data/, không ghi.
 */
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const T = require('../lib/hs-tree.js');
const S = require('../lib/hs-tree-sources.js');

let pass = 0; let fail = 0;
const check = (name, cond, extra = '') => { if (cond) { pass += 1; console.log(`PASS ${name}`); } else { fail += 1; console.log(`FAIL ${name} ${extra}`); } };

// nodeOf mở rộng
check('mã WCO xxxx00 (nhóm không chia) trỏ về nhóm 4 số', T.nodeOf('160100')?.id === '1601' && T.nodeOf('160100').cap === 4);
check('mã 5 số của phân nhóm một gạch trỏ về xxxxx0', T.nodeOf('85044')?.id === '850440');
check('nhóm 4 số có tên tiếng Việt từ chú giải nhóm, đã bỏ tiền tố mã', /^Máy biến điện/.test(T.nodeOf('8504').tenVi || ''), T.nodeOf('8504').tenVi);
check('mã không tồn tại → null', T.nodeOf('99999999') === null && S.sourcesOf('99999999') === null);

const s = S.sourcesOf('85042119');
check('lá 85042119: có chú giải chương + chú giải nhóm (NGUYEN_VAN)', s.nguon.chuGiaiChuong?.nhan === 'NGUYEN_VAN' && s.nguon.chuGiaiNhom?.co === true && s.nguon.chuGiaiNhom.nhan === 'NGUYEN_VAN');
check('lá 85042119: SEN đếm được, nhãn NGUYEN_VAN', s.nguon.sen?.co >= 1 && s.nguon.sen.nhan === 'NGUYEN_VAN', JSON.stringify(s.nguon.sen));
check('lá 85042119: sổ tay nhóm 8504 có, dong8 có mã này (DA_KIEM)', s.nguon.soTay?.co === true && s.nguon.soTay.dong8 === true && s.nguon.soTay.nhan === 'DA_KIEM', JSON.stringify(s.nguon.soTay));
check('lá 85042119: explanatory-notes / tax-enriched gắn nhãn AI_CHUA_KIEM', s.nguon.explanatoryNotes?.nhan === 'AI_CHUA_KIEM' && s.nguon.chinhSach?.nhan === 'AI_CHUA_KIEM');
check('lá 85042119: chỉ mục anh em cũ lệch cây (bằng chứng lỗi cũ)', s.nguon.loaiKhacIndex?.anhEmLechCay === true, JSON.stringify(s.nguon.loaiKhacIndex));

const s6 = S.sourcesOf('100111');
check('phân nhóm 100111: chú giải phân nhóm (khối "Chú giải phân nhóm" nhắc 1001.11)', s6 && s6.nguon.chuGiaiPhanNhom?.co === true && s6.nguon.chuGiaiPhanNhom.nhan === 'NGUYEN_VAN', JSON.stringify(s6?.nguon));

const s4 = S.sourcesOf('1601');
check('nhóm 1601: ý kiến WCO mã 160100 đếm vào nhóm', s4 && (s4.nguon.yKienWco?.co || 0) >= 1, JSON.stringify(s4?.nguon.yKienWco));
const s2 = S.sourcesOf('85');
check('chương 85: chỉ có chú giải chương, không có trường cấp dưới', s2 && s2.nguon.chuGiaiChuong && !s2.nguon.chuGiaiNhom && !s2.nguon.sen);
check('phần: không có nguồn (chỉ tên)', S.sourcesOf('P:XVI') && Object.keys(S.sourcesOf('P:XVI').nguon).length === 0);

// TB-TCHQ: khoá 4/6/8 số đều đếm được; nhóm đếm cả mã con
const tb4 = S.sourcesOf('3919'); const tb8 = S.sourcesOf('39199099') || S.sourcesOf('39191010');
check('TB-TCHQ: nhóm 3919 có khoá 4 số → đếm ≥ 1', tb4 && (tb4.nguon.tbTchq?.co || 0) >= 1, JSON.stringify(tb4?.nguon.tbTchq));

// Độ phủ
const cov = S.coverage();
check('coverage: đủ 4 cấp', ['chuong', 'nhom', 'phanNhom', 'la'].every((k) => cov[k]?.nut > 0), JSON.stringify(Object.keys(cov)));
check('coverage: chú giải nhóm phủ ≥ 95 % nhóm', cov.nhom.chuGiaiNhom / cov.nhom.nut >= 0.95, `${cov.nhom.chuGiaiNhom}/${cov.nhom.nut}`);
check('coverage: tên tiếng Việt nhóm ≥ 95 %', cov.nhom.coTenVi / cov.nhom.nut >= 0.95, `${cov.nhom.coTenVi}/${cov.nhom.nut}`);
check('coverage: chỉ mục anh em cũ lệch cây > 50 % (lý do thay bằng cây)', cov.la.loaiKhacIndexLech / cov.la.loaiKhacIndex > 0.5, `${cov.la.loaiKhacIndexLech}/${cov.la.loaiKhacIndex}`);
console.log('coverage:', JSON.stringify(cov));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
