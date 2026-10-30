#!/usr/bin/env node
/**
 * Luật đi ranh giới 6→8 số (lib/dieu-kien-so.js#duongDiDong8) đi qua NÚT TẦNG KHÔNG MÃ của lớp tầng (lib/hs-tree.js):
 * tầng có tên ⇒ PHAI_CO điều kiện của tầng (`dieuKienNut` id `<pn6>~r<dòng>`); "Loại khác" dưới tầng chỉ phủ định anh em
 * TRONG tầng; tầng "Loại khác:" phủ định anh em của tầng. Sổ tay tiêm (fixture) — không đọc data/so-tay.
 */
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const DK = require('../lib/dieu-kien-so.js');

let pass = 0; let fail = 0;
const check = (name, cond, extra = '') => { if (cond) { pass += 1; console.log(`PASS ${name}`); } else { fail += 1; console.log(`FAIL ${name} ${typeof extra === 'string' ? extra : JSON.stringify(extra)}`); } };
const SO = (fact, op, value, donVi) => ({ fact, op, value, donVi });
const DUNG = (v) => ({ fact: 'dungCho', op: 'CONG_DUNG', value: v });
const TEN = (v) => ({ fact: 'tenLoai', op: 'TEN_LOAI', value: v });
const muc = (dk) => ({ nguonLoai: 'AI_DA_KIEM', nguon: 'x', trich: 'x', dieuKienSo: dk });
const tom = (dd) => dd.nhom.map((g) => `${g.chieu === 'PHAI_CO' ? '+' : '-'}${g.nut}${g.dieuKien ? '' : '?'}${g.lyDo ? `(${g.lyDo})` : ''}`).join(' ');

// ── 841459: hai tầng "Công suất không quá 125 kW:" (r13180) / "Loại khác:" (r13187) ───────────────────────────────
{
  const soTay = {
    nhom: '8414',
    dong8: [
      { hs: '84145910', ...muc([TEN('Quạt')]) }, { hs: '84145920', ...muc([TEN('Quạt gió phòng nổ')]) }, { hs: '84145930', ...muc([TEN('Máy thổi khí')]) },
      { hs: '84145941', ...muc([{ fact: 'coLuoiBaoVe', op: 'CO' }]) }, { hs: '84145950', ...muc([TEN('Máy thổi khí')]) },
      { hs: '84145991', ...muc([{ fact: 'coLuoiBaoVe', op: 'CO' }]) }, { hs: '84145992', ...muc([TEN('Quạt gió phòng nổ')]) },
    ],
    dieuKienNut: [{ id: '841459~r13180', ...muc([SO('congSuat', '<=', 125, 'kW')]) }],
  };
  const d41 = DK.duongDiDong8('84145941', { soTay });
  check('1a 84145941: +.41, 8414594 "Loại khác" chỉ phủ định .10/.20/.30 (trong tầng), rồi +tầng r13180 có điều kiện',
    tom(d41) === '+84145941 -84145910 -84145920 -84145930 +841459~r13180', tom(d41));
  check('1b … không còn lý do tang-bi-luoc (tầng có tên đã dựng lại), không đụng .50/.91/8414599', !d41.nhom.some((g) => g.lyDo === 'tang-bi-luoc' || ['84145950', '84145991', '8414599'].includes(g.nut)), tom(d41));
  const g = d41.nhom.find((x) => x.nut === '841459~r13180');
  check('1c nhóm của tầng: cap TANG, điều kiện lấy từ dieuKienNut theo id tầng', g && g.cap === 'TANG' && g.dieuKien?.[0]?.fact === 'congSuat', g);
  const d99 = DK.duongDiDong8('84145999', { soTay });
  check('1d 84145999: -.91 -.92, 8414599 phủ định .50, tầng r13187 "Loại khác" phủ định tầng r13180 (điều kiện công suất)',
    tom(d99) === '-84145991 -84145992 -84145950 -841459~r13180', tom(d99));
  const quat = [{ fact: 'congSuat', giaTri: 100, donVi: 'kW' }, { fact: 'tenLoai', giaTri: 'thiết bị thông gió' }, { fact: 'coLuoiBaoVe', giaTri: false }].map((x) => ({ ...x, nguon: 'KHACH', trangThai: 'DA_CO' }));
  const r = DK.doiChieuDong8('84145999', quat, { soTay });
  check('1e thiết bị 100 kW KHÔNG vào 84145999 (thuộc tầng ≤ 125 kW): MAU_THUAN do phủ định tầng r13180', r.ketQua === 'MAU_THUAN' && r.duongDi.some((e) => e.nut === '841459~r13180' && e.ketQua === 'MAU_THUAN'), r);
  const d50 = DK.duongDiDong8('84145950', { soTay: { ...soTay, dieuKienNut: [] } });
  check('1f thiếu điều kiện tầng ⇒ tầng là nhóm CHUA_SO_HOA (dieuKien null), không lý do cấu trúc', tom(d50) === '+84145950 -841459~r13180?', tom(d50));
}

// ── 848310: "- - - Loại khác:" (r14616) dưới 8483102 gom .25/.26/.27 — xanh giả "trục cam xe máy ≤ 2.000 cc" ───────
{
  const soTay = {
    nhom: '8483',
    dong8: [
      { hs: '84831024', ...muc([DUNG('xe thuộc nhóm 87.11')]) },
      { hs: '84831025', ...muc([SO('dungTichXiLanh', '<=', 2000, 'cc')]) },
      { hs: '84831026', ...muc([SO('dungTichXiLanh', '>', 2000, 'cc'), SO('dungTichXiLanh', '<=', 3000, 'cc')]) },
      { hs: '84831027', ...muc([SO('dungTichXiLanh', '>', 3000, 'cc')]) },
    ],
    dieuKienNut: [{ id: '8483102', ...muc([TEN(['Trục cam', 'trục khuỷu']), DUNG('động cơ xe của Chương 87')]) }],
  };
  const d = DK.duongDiDong8('84831025', { soTay });
  check('2a 84831025: +.25, tầng r14616 "Loại khác" phủ định .24, +8483102', tom(d) === '+84831025 -84831024 +8483102', tom(d));
  const xeMay = [{ fact: 'dungTichXiLanh', giaTri: 150, donVi: 'cc' }, { fact: 'dungCho', giaTri: 'xe thuộc nhóm 87.11' }, { fact: 'tenLoai', giaTri: 'Trục cam' }].map((x) => ({ ...x, nguon: 'KHACH', trangThai: 'DA_CO' }));
  check('2b trục cam xe máy 150 cc: 84831025 MAU_THUAN (thuộc .24), không còn thoả cả hai', DK.doiChieuDong8('84831025', xeMay, { soTay }).ketQua === 'MAU_THUAN');
  const pn = DK.doiChieuPhanNhom('848310', xeMay, { soTay });
  check('2c doiChieuPhanNhom: chỉ 84831024 CO', pn.dongCo.join() === '84831024', pn.dongCo);
  const oto = xeMay.map((x) => (x.fact === 'dungCho' ? { ...x, giaTri: 'xe thuộc nhóm 87.03' } : x.fact === 'dungTichXiLanh' ? { ...x, giaTri: 1500 } : x));
  check('2d trục cam ô tô 1.500 cc (nhóm 87.03): 84831025 CO', DK.doiChieuDong8('84831025', oto, { soTay }).ketQua === 'CO', DK.doiChieuDong8('84831025', oto, { soTay }));
}

// ── 854442: 8544423 "Cáp ắc qui" chia hai tầng r16065 (cách điện cao su/plastic) / r16068 ("Loại khác") ─────────────
{
  const soTay = { nhom: '8544', dong8: [{ hs: '85444232', ...muc([DUNG('xe thuộc nhóm 87.02, 87.03, 87.04 hoặc 87.11')]) }, { hs: '85444234', ...muc([DUNG('xe thuộc nhóm 87.02, 87.03, 87.04 hoặc 87.11')]) }], dieuKienNut: [] };
  const d33 = DK.duongDiDong8('85444233', { soTay });
  check('3a 85444233 "Loại khác": chỉ phủ định .32 (cùng tầng), không phủ định .34; tầng r16065 có tên ⇒ PHAI_CO (chưa số hoá)',
    tom(d33) === '-85444232 +854442~r16065? +8544423?', tom(d33));
  const d39 = DK.duongDiDong8('85444239', { soTay });
  check('3b 85444239: -.34, tầng r16068 "Loại khác" phủ định tầng r16065', tom(d39) === '-85444234 -854442~r16065? +8544423?', tom(d39));
}

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
