#!/usr/bin/env node
import './test-isolate-data.mjs';
/** lib/so-tay-runtime.js: sổ tay lúc chạy ở chế độ CỐ VẤN — đính vào phản hồi, không đổi mã đã chọn. */
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { dataPath } = require('../lib/data-paths.js');
const rt = require('../lib/so-tay-runtime.js');

let passed = 0; let failed = 0;
const assert = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ` ${extra}`}`); if (ok) passed += 1; else failed += 1; };

fs.mkdirSync(dataPath('so-tay'), { recursive: true });
const yk = (hs, n, extra = {}) => ({ hs, thuTuTrongMa: n, namThongQua: 2010 + n, moTa: `Mô tả mẫu ${hs}/${n} → mã ${hs.slice(0, 4)}.${hs.slice(4)}`, nguon: `wco-op.${hs}.${n}`, doTinCay: 'CHAC', daSoatAnh: false, dauVet: '0123456789abcdef', ...extra });
fs.writeFileSync(dataPath('so-tay', '8528.json'), JSON.stringify({
  nhom: '8528', phienBan: 'HS2022', yKienWcoDayDu: false,
  loaiTru: [
    { dieuKien: 'máy thu hình có gắn bộ dò', sangNhom: '8528', nguon: 'nhom8528.nhom' }, // trùng nhóm mình → bỏ
    { dieuKien: 'camera truyền hình, camera số', sangNhom: '8525', nguon: 'nhom8528.nhom' },
    { dieuKien: 'màn hình dùng trong máy tính', sangNhom: '8471|8543', nguon: 'nhom8528.nhom' },
  ],
  yKienWco: [yk('852852', 1), yk('852852', 2), yk('852862', 1)],
}));
fs.writeFileSync(dataPath('so-tay', '3926.json'), JSON.stringify({ nhom: '3926', loaiTru: [], yKienWcoDayDu: false, yKienWco: Array.from({ length: 11 }, (_, i) => yk('392690', i + 1)) }));
fs.writeFileSync(dataPath('so-tay', '9999.json'), '{ không phải json');
rt.reset();

const a = rt.advise({ topHs: '85285200', candidates: ['8525', '8471', '8528', '9503'] });
assert('advise: có sổ tay → CO_SO_TAY + chế độ CỐ VẤN', a.trangThai === 'CO_SO_TAY' && a.cheDo === 'CO_VAN' && a.nhom === '8528');
assert('canGiaiTrinh: chỉ nhóm đích đang là ứng viên (8525, 8471); bỏ nhóm không phải ứng viên (8543) và nhóm trùng chính mình', a.canGiaiTrinh.map((x) => x.sangNhom).join() === '8525,8471', JSON.stringify(a.canGiaiTrinh));
assert('canGiaiTrinh: là NGHI (có lý do, có nguồn), không phải kết luận', a.canGiaiTrinh.every((x) => x.nguon && /cần giải trình/.test(x.lyDo)) && /máy NGHI/.test(a.ghiChu));
assert('yKienWco: mã 8 số → chỉ đúng mã 6 số 8528.52 (không lẫn 8528.62)', a.yKienWco.length === 2 && a.yKienWco.every((x) => x.hs === '852852'));
assert('yKienWco: có mô tả tự viết + độ tin cậy + cờ chưa soát ảnh; KHÔNG lộ dấu vết/ trích', a.yKienWco[0].moTa && a.yKienWco[0].doTinCay === 'CHAC' && a.yKienWco[0].daSoatAnh === false && !('dauVet' in a.yKienWco[0]) && !('trich' in a.yKienWco[0]));
assert('yKienWcoDayDu=false được báo (không để hiểu là đủ)', a.yKienWcoDayDu === false);

const b = rt.advise({ topHs: '8528', candidates: [{ code4: '8525' }, { hs: '85171300' }] });
assert('mã 4 số: mọi ý kiến trong nhóm; ứng viên dạng đối tượng/8 số đều nhận', b.yKienWco.length === 3 && b.canGiaiTrinh.map((x) => x.sangNhom).join() === '8525');

const c = rt.advise({ topHs: '39269099', candidates: [] });
assert('giới hạn 8 ý kiến + báo số còn lại', c.yKienWco.length === 8 && c.yKienWcoConLai === 3 && c.canGiaiTrinh.length === 0);

assert('nhóm chưa có sổ tay → CHUA_CO_SO_TAY_CHO_NHOM (nói thật), vẫn là cố vấn', rt.advise({ topHs: '01012100' }).trangThai === 'CHUA_CO_SO_TAY_CHO_NHOM');
assert('không có mã → null (không bịa)', rt.advise({ topHs: null }) === null && rt.advise({}) === null && rt.advise({ topHs: '12' }) === null);
assert('file sổ tay hỏng → vẫn không làm hỏng endpoint (coi như chưa có sổ tay)', rt.advise({ topHs: '99990000' }).trangThai === 'CHUA_CO_SO_TAY_CHO_NHOM');

const input = { topHs: '85285200', candidates: ['8525'] };
const snap = JSON.stringify(input);
rt.advise(input);
assert('advise không sửa đầu vào', JSON.stringify(input) === snap);

process.env.HS_SOTAY_RUNTIME = 'false';
assert('tắt khẩn cấp HS_SOTAY_RUNTIME=false → null', rt.advise({ topHs: '85285200' }) === null);
delete process.env.HS_SOTAY_RUNTIME;

// Dữ liệu thật trong repo: 8528.52 phải có ý kiến (đã nạp #196)
fs.rmSync(dataPath('so-tay'), { recursive: true, force: true }); rt.reset();
const real = rt.advise({ topHs: '85285200', candidates: ['8525'] });
assert('dữ liệu thật: 8528.52 có ý kiến WCO trong sổ tay công khai', real.trangThai === 'CO_SO_TAY' && real.yKienWco.length >= 5 && real.yKienWco.every((x) => x.hs === '852852'), JSON.stringify(real).slice(0, 200));
assert('dữ liệu thật: không có trường nguyên văn nào lọt ra (chỉ moTa tự viết ≤ 300 ký tự)', real.yKienWco.every((x) => x.moTa.length <= 300 && !('trich' in x) && !('text' in x)));

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
