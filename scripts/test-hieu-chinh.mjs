// scripts/test-hieu-chinh.mjs — bảng hiệu chỉnh tiền lệ (plan L1-4b; spec hồ sơ §8.1 `hieuChinh`, §11).
// Mục giả viết tay trên dữ liệu THẬT (precedents.json + biểu thuế + lat-1.json) để cổng máy kiểm đúng nguồn nguyên văn;
// cuối cùng kiểm bảng commit data/ho-so/hieu-chinh-tien-le.json. Không đọc data/bench/*, data/oz-export/*.
import './test-isolate-data.mjs';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import { TEST_DATA_DIR } from './test-isolate-data.mjs';
const require = createRequire(import.meta.url);
const H = require('../lib/ho-so/hieu-chinh.js');
const C = require('../lib/ho-so/cong-ranh-gioi.js');

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${typeof x === 'string' ? x : JSON.stringify(x)}`); } };
const clone = (x) => JSON.parse(JSON.stringify(x));
const coLoi = (r, tien) => r.loi.some((l) => l.startsWith(tien));

// Ba TB-TCHQ cùng chiều (cáp sạc điện thoại bọc plastic, lõi < 5 mm → 8544.42.99) — precedents.json#85444299[9..11].
const tb = (i, so) => ({
  soHieu: so, viTri: `precedents.json#85444299[${i}]`,
  trich: 'Cáp sạc và truyền dẫn tín hiệu điện thoại … mỗi lõi đã bọc cách điện bằng plastic và có đường kính mỗi lõi nhỏ hơn 5mm … mã số 8544.42.99 “- - - - Loại khác”',
});
const mucTienLe = () => ({
  id: '854442-T', maHs: '85444299', dongChuBieu: '85444294', loai: 'TIEN_LE_THAY_CHU_BIEU',
  dieuKien: [{ fact: 'tenLoai', op: 'TEN_LOAI', value: 'Cáp sạc' }, { fact: 'duongKinhLoi', op: '<', value: 5, donVi: 'mm' }],
  tbTchq: [tb(9, '1709/TB-TCHQ'), tb(10, '1710/TB-TCHQ'), tb(11, '1711/TB-TCHQ')],
  chuBieu: [{ nguon: 'tax.85444294', trich: 'Cáp điện cách điện bằng plastic, trong đó mỗi lõi có đường kính không quá 5 mm' }],
  lyDo: 'Ba TB-TCHQ cùng chiều xếp .99, chữ biểu .94 trỏ cáp bọc plastic lõi ≤ 5 mm.',
  duyetBoi: null, nguonLoai: 'AI_DA_KIEM',
});
// LECH một TB-TCHQ (cáp VGA bọc plastic, lõi 0,3 mm → .99) — precedents.json#85444299[1].
const mucLech = () => ({
  id: '854442-L', maHs: '85444299', dongChuBieu: '85444294', loai: 'LECH_CHUA_PHAN_XU',
  tbTchq: [{ soHieu: '524/TB-TCHQ', viTri: 'precedents.json#85444299[1]', trich: 'có cách điện bằng plastic … đường kính lõi mỗi sợi 0,3 mm … mã số 8544.42.99' }],
  chuBieu: [{ nguon: 'tax.85444294', trich: 'Cáp điện cách điện bằng plastic, trong đó mỗi lõi có đường kính không quá 5 mm' }],
  lyDo: 'Một TB-TCHQ lệch chữ biểu; chưa ai phân xử.', duyetBoi: null, nguonLoai: 'AI_DA_KIEM',
});
// Bảng giả phủ đủ 11 phân nhóm cờ canHieuChinhTienLe bằng mục KHONG_LECH tối thiểu (dùng lại TB 524 không hợp lệ cho mã khác,
// nên các phân nhóm khác lấy từ bảng thật nếu có) — ở đây chỉ kiểm từng mục, phủ kín kiểm riêng bằng `phuKin: false`.
const bang = (muc) => ({ phienBan: H.PHIEN_BAN, bieuThue: '2026.04.05', muc });
const kiem = (muc) => H.kiemBang(bang(muc), { phuKin: false });

// ── 1. Mục hợp lệ ─────────────────────────────────────────────────────────────────────────────────────────────
{
  const r = kiem([mucTienLe(), mucLech()]);
  check('1a TIEN_LE (3 TB-TCHQ cùng chiều) + LECH (1 TB-TCHQ) hợp lệ', r.hopLe === true && r.loi.length === 0, r.loi);
  const motObj = mucLech(); motObj.tbTchq = motObj.tbTchq[0]; motObj.chuBieu = motObj.chuBieu[0];
  check('1b tbTchq/chuBieu dạng object (đúng interface plan) cũng nhận', kiem([motObj]).hopLe, kiem([motObj]).loi);
}

// ── 2. Trích phải nguyên văn ──────────────────────────────────────────────────────────────────────────────────
{
  const m = mucLech(); m.tbTchq[0].trich = m.tbTchq[0].trich.replace('0,3 mm', '0,4 mm');
  check('2a trích TB-TCHQ sửa một chữ → ĐỎ', coLoi(kiem([m]), 'hc-tb-trich-khong-co'), kiem([m]).loi);
  const m2 = mucLech(); m2.chuBieu[0].trich = 'Cáp điện cách điện bằng plastic, trong đó mỗi lõi có đường kính không quá 6 mm';
  check('2b trích chữ biểu sửa một chữ → ĐỎ', coLoi(kiem([m2]), 'hc-chu-bieu-trich-khong-co'), kiem([m2]).loi);
  const m3 = mucLech(); m3.tbTchq[0].trich = 'có cách điện bằng plastic … đường kính lõi mỗi sợi 0,3 mm';
  check('2c trích TB-TCHQ không kèm mã kết luận → ĐỎ', coLoi(kiem([m3]), 'hc-tb-trich-thieu-ma-ket-luan'), kiem([m3]).loi);
  const m4 = mucLech(); m4.chuBieu[0].nguon = 'nhom8544.bao_gom';
  check('2d chữ biểu lấy từ trường AI_CHUA_KIEM / ngoài biểu → ĐỎ', coLoi(kiem([m4]), 'hc-chu-bieu-nguon'), kiem([m4]).loi);
  const m5 = mucLech(); m5.chuBieu[0].nguon = 'tax.85444295'; m5.chuBieu[0].trich = 'Cáp điện cách điện bằng plastic';
  check('2e chữ biểu trích dòng khác dongChuBieu → ĐỎ', coLoi(kiem([m5]), 'hc-chu-bieu-sai-nut'), kiem([m5]).loi);
  const m6 = mucLech(); m6.chuBieu.push({ nguon: 'tieuDe.8544429', trich: 'Loại khác' });
  check('2f trích tiêu đề tổ tiên của dongChuBieu được nhận', kiem([m6]).hopLe, kiem([m6]).loi);
}

// ── 3. TIEN_LE_THAY_CHU_BIEU chỉ khi ≥ 2 TB-TCHQ cùng chiều hoặc người đã phân xử ───────────────────────────────
{
  const m = mucTienLe(); m.tbTchq = [m.tbTchq[0]];
  check('3a TIEN_LE một TB-TCHQ, không NGUOI_DUYET → ĐỎ', coLoi(kiem([m]), 'hc-tien-le-thieu-2-tb'), kiem([m]).loi);
  const m2 = mucTienLe(); m2.tbTchq = [tb(5, '1709/TB-TCHQ'), tb(9, '1709/TB-TCHQ')];
  m2.tbTchq[0].trich = 'Cáp sạc và truyền dẫn tín hiệu cho điện thoại, đã gắn đầu nối … mã số 8544.42.99';
  check('3b TIEN_LE hai bản ghi cùng một số hiệu → vẫn là một TB → ĐỎ', coLoi(kiem([m2]), 'hc-tien-le-thieu-2-tb'), kiem([m2]).loi);
  const m3 = mucTienLe(); m3.tbTchq = [m3.tbTchq[0], { soHieu: '354/TB-CHQ', viTri: 'precedents.json#85444299[4]', trich: 'Data link cable USB 2.0 TYPE C TO TYPE C … mã số 8544.42.99' }];
  check('3c TB-CHQ (không phải TB-TCHQ) không tính vào ngưỡng 2', coLoi(kiem([m3]), 'hc-tien-le-thieu-2-tb'), kiem([m3]).loi);
  const m4 = mucTienLe(); m4.tbTchq = [m4.tbTchq[0]]; m4.duyetBoi = 'NGUOI_DUYET';
  check('3d NGUOI_DUYET không kèm phanXu (ngày + ghi chú) → ĐỎ', coLoi(kiem([m4]), 'hc-nguoi-duyet-thieu-phan-xu'), kiem([m4]).loi);
  m4.phanXu = { nguoi: 'chuyên gia Oz', ngay: '2026-11-01', ghiChu: 'đồng ý theo TB-TCHQ' };
  check('3e một TB-TCHQ + NGUOI_DUYET có phanXu → hợp lệ', kiem([m4]).hopLe, kiem([m4]).loi);
  const m5 = mucTienLe(); m5.tbTchq.push({ soHieu: '524/TB-TCHQ', viTri: 'precedents.json#85444299[1]', trich: 'mã số 8544.42.99' });
  m5.tbTchq[3].viTri = 'precedents.json#85444294[0]';
  check('3f vị trí precedents không tồn tại → ĐỎ', coLoi(kiem([m5]), 'hc-tb-vi-tri'), kiem([m5]).loi);
  const m6 = mucLech(); m6.duyetBoi = 'NGUOI_DUYET'; m6.phanXu = { ngay: '2026-11-01', ghiChu: 'x' };
  check('3g LECH_CHUA_PHAN_XU mà đã có NGUOI_DUYET → ĐỎ (phân xử rồi thì đổi loại)', coLoi(kiem([m6]), 'hc-lech-da-duyet'), kiem([m6]).loi);
  const m7 = mucLech(); m7.duyetBoi = 'CLAUDE_DUYET';
  check('3h duyetBoi ngoài {null, NGUOI_DUYET} → ĐỎ', coLoi(kiem([m7]), 'hc-duyet-boi'), kiem([m7]).loi);
}

// ── 4. Mã, số hiệu, chiều ───────────────────────────────────────────────────────────────────────────────────────
{
  const m = mucLech(); m.tbTchq[0].soHieu = '525/TB-TCHQ';
  check('4a số hiệu lệch bản ghi precedents → ĐỎ', coLoi(kiem([m]), 'hc-tb-so-hieu-lech'), kiem([m]).loi);
  const m2 = mucLech(); m2.maHs = '84713020'; m2.dongChuBieu = '84713090';
  check('4b mã ngoài lát 1 → ĐỎ', coLoi(kiem([m2]), 'hc-ngoai-lat-1'), kiem([m2]).loi);
  const m3 = mucLech(); m3.dongChuBieu = '85444299';
  check('4c dongChuBieu trùng maHs → ĐỎ', coLoi(kiem([m3]), 'hc-dong-chu-bieu'), kiem([m3]).loi);
  const m4 = mucLech(); m4.loai = 'TU_CHON';
  check('4d loai lạ → ĐỎ', coLoi(kiem([m4]), 'hc-loai'), kiem([m4]).loi);
  const m5 = mucLech(); m5.lyDo = ' ';
  check('4e thiếu lyDo → ĐỎ', coLoi(kiem([m5]), 'hc-ly-do-thieu'), kiem([m5]).loi);
  check('4f id trùng → ĐỎ', coLoi(kiem([mucLech(), mucLech()]), 'hc-id-trung'));
  // TIEN_LE mà có TB-TCHQ kết luận dòng chữ biểu (ngược chiều) → không còn "cùng chiều".
  const m6 = mucTienLe(); m6.maHs = '85444294'; m6.dongChuBieu = '85444299';
  m6.chuBieu = [{ nguon: 'tieuDe.8544429', trich: 'Loại khác' }];
  check('4g TIEN_LE mà TB-TCHQ kết luận dòng khác maHs → ĐỎ', coLoi(kiem([m6]), 'hc-tb-nguoc-chieu'), kiem([m6]).loi);
  const m7 = mucLech(); m7.maHs = '85444291';
  check('4h không TB-TCHQ nào kết luận maHs → ĐỎ', coLoi(kiem([m7]), 'hc-tb-khong-ket-luan-ma-hs'), kiem([m7]).loi);
  const m8 = mucLech(); m8.nguonLoai = 'AI_CHUA_KIEM';
  check('4i nguonLoai AI_CHUA_KIEM → ĐỎ', coLoi(kiem([m8]), 'hc-nguon-loai'), kiem([m8]).loi);
}

// ── 5. Điều kiện phạm vi: khoá tu-vung@1, giá trị có trong câu trích TB-TCHQ ───────────────────────────────────────
{
  const m = mucTienLe(); m.dieuKien = { fact: 'tenLoai', op: 'TEN_LOAI', value: 'Cáp sạc ô tô điện' };
  check('5a dieuKien có chữ không có trong trích TB-TCHQ → ĐỎ', coLoi(kiem([m]), 'hc-dieu-kien'), kiem([m]).loi);
  const m2 = mucTienLe(); m2.dieuKien = { fact: 'loaiCap', op: 'TEN_LOAI', value: 'Cáp sạc' };
  check('5b dieuKien khoá ngoài tu-vung@1 → ĐỎ', coLoi(kiem([m2]), 'hc-dieu-kien'), kiem([m2]).loi);
  const m3 = mucTienLe(); m3.dieuKien = { fact: 'tenLoai', op: 'TEN_LOAI', value: 'Cáp sạc' };
  check('5c dieuKien một object đúng → hợp lệ', kiem([m3]).hopLe, kiem([m3]).loi);
}

// ── 6. Phủ kín: mọi phân nhóm cờ canHieuChinhTienLe phải có ≥ 1 mục ─────────────────────────────────────────────
{
  const r = H.kiemBang(bang([mucTienLe()]));
  check('6a bảng chỉ có 854442 → ĐỎ thiếu mục cho 392690', r.loi.includes('hc-thieu-muc-cho-pn6:392690'), r.loi);
  check('6b … nhưng không báo thiếu cho 854442', !r.loi.includes('hc-thieu-muc-cho-pn6:854442'), r.loi);
  check('6c phienBan sai → ĐỎ', coLoi(H.kiemBang({ ...bang([]), phienBan: 'x' }, { phuKin: false }), 'hc-phien-ban'));
}

// ── 7. Bảng commit ──────────────────────────────────────────────────────────────────────────────────────────────
{
  const tep = path.join(process.cwd(), 'data', 'ho-so', 'hieu-chinh-tien-le.json');
  check('7a có data/ho-so/hieu-chinh-tien-le.json', fs.existsSync(tep));
  let that = null; try { that = JSON.parse(fs.readFileSync(tep, 'utf8')); } catch { that = null; }
  const r = that ? H.kiemBang(that) : { hopLe: false, loi: ['khong-doc-duoc'] };
  check('7b bảng commit qua cổng (trích nguyên văn, ngưỡng TIEN_LE, phủ kín 11 phân nhóm)', r.hopLe, r.loi);
  const muc = that?.muc || [];
  for (const pn6 of ['392690', '854442']) {
    check(`7c ${pn6} (bắt buộc) có mục lệch thật (TIEN_LE/LECH), không chỉ KHONG_LECH`, muc.some((m) => m.maHs.startsWith(pn6) && m.loai !== 'KHONG_LECH'));
  }
  check('7d 854442: ranh giới .94↔.99 có mục (dòng TB-TCHQ lệch spec §11)', muc.some((m) => m.maHs === '85444299' && m.dongChuBieu === '85444294'));
  check('7e mucCua(85444299) trả các mục của mã', H.mucCua('85444299').length >= 1 && H.mucCua('85444299').every((m) => m.maHs === '85444299'));
  let out = ''; let ma = 0;
  try { out = execFileSync('node', ['scripts/check-hieu-chinh.mjs'], { encoding: 'utf8' }); } catch (e) { ma = e.status; out = String(e.stdout || ''); }
  check('7f scripts/check-hieu-chinh.mjs thoát 0 trên bảng commit', ma === 0 && /XANH/.test(out), out.slice(-400));
  check('7g cổng ranh giới thấy bảng cho 392690 (hết chặn duyệt vì thiếu bảng)', C.coHieuChinh('392690') && C.coHieuChinh('854442'));
}

// ── 8. Bảng hỏng thì check-hieu-chinh thoát ≠ 0 (đọc qua HS_DATA_DIR của test) ──────────────────────────────────
{
  const dir = path.join(TEST_DATA_DIR, 'ho-so'); fs.mkdirSync(dir, { recursive: true });
  const hong = bang([mucTienLe()]); hong.muc[0].tbTchq = [hong.muc[0].tbTchq[0]];
  fs.writeFileSync(path.join(dir, 'hieu-chinh-tien-le.json'), JSON.stringify(hong));
  let ma = 0; let out = '';
  try { out = execFileSync('node', ['scripts/check-hieu-chinh.mjs'], { encoding: 'utf8', env: { ...process.env, HS_DATA_DIR: TEST_DATA_DIR } }); } catch (e) { ma = e.status; out = String(e.stdout || ''); }
  check('8a bảng hỏng → check-hieu-chinh thoát ≠ 0, in mã lỗi', ma !== 0 && /hc-tien-le-thieu-2-tb/.test(out), out.slice(-400));
  fs.rmSync(path.join(dir, 'hieu-chinh-tien-le.json'));
}

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
