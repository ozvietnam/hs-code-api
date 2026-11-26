#!/usr/bin/env node
// scripts/do-cua-vao-test.mjs — M-79 (#1971): bài kiểm thước đo cửa vào (ca thuận, ca ngược, chặn tờ khai, chỗ cắm M-37/M-52).
// Tất định, không mạng, không AI, dùng dữ liệu luật gốc thật data/luat-goc.

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BO_THU_LUAT_MAU,
  chayDoCuaVao,
  chamMotCa,
  chuanHoaUngVien,
  dinhDangBaoCaoMd,
  kiemBoDo,
  napTapNutLuat,
  rutMaTuNut,
} from './do-cua-vao.mjs';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let dat = 0;
let hong = 0;

function kiem(ten, dieuKien, chiTiet = '') {
  if (dieuKien) {
    dat += 1;
    console.log(`PASS ${ten}`);
  } else {
    hong += 1;
    const msg = typeof chiTiet === 'string' ? chiTiet : JSON.stringify(chiTiet).slice(0, 400);
    console.log(`FAIL ${ten}${msg ? ` — ${msg}` : ''}`);
  }
}

// 1. Rút mã HS từ ID nút luật gốc
kiem('rutMaTuNut: bieu:7611 -> nhom4=7611', rutMaTuNut('bieu:7611').nhom4 === '7611');
kiem('rutMaTuNut: bieu:761100 -> phanNhom6=761100', rutMaTuNut('bieu:761100').phanNhom6 === '761100');
kiem('rutMaTuNut: sen:76061232:1 -> ma8=76061232', rutMaTuNut('sen:76061232:1').ma8 === '76061232');
kiem('rutMaTuNut: nhom:8413:ct:4 -> nhom4=8413', rutMaTuNut('nhom:8413:ct:4').nhom4 === '8413');
kiem('rutMaTuNut: chuong:76 -> nhom4=null', rutMaTuNut('chuong:76').nhom4 === null);

// 2. Cổng độ sạch bộ đo (cấm tờ khai / dữ liệu khách / tb: / nút không có thật)
const tapNut = napTapNutLuat();
kiem('napTapNutLuat nạp được > 10000 nút thật từ data/luat-goc', tapNut.size > 10000, `size=${tapNut.size}`);

const kiemMau = kiemBoDo(BO_THU_LUAT_MAU, { tapNutLuat: tapNut });
kiem('BO_THU_LUAT_MAU vượt cổng kiểm bộ đo sạch', kiemMau.hopLe, kiemMau.loi);

const boToKhai = kiemBoDo([
  { id: 'bad-1', loaiCa: 'THUAN', moTa: 'bình nhôm', nhomDung: '7611', canCuLuat: ['tb:1234/TB-TCHQ'] },
], { tapNutLuat: tapNut });
kiem('ca ngược CHAN_TO_KHAI: từ chối canCuLuat chứa tb:', !boToKhai.hopLe && boToKhai.loi.some((s) => s.includes('vi phạm cấm')));

const boGhiChuToKhai = kiemBoDo([
  { id: 'bad-2', loaiCa: 'THUAN', moTa: 'bình nhôm', nhomDung: '7611', canCuLuat: ['bieu:7611'], ghiChu: 'lấy từ tờ khai khách hàng' },
], { tapNutLuat: tapNut });
kiem('ca ngược CHAN_TO_KHAI: từ chối ghiChu nhắc tờ khai', !boGhiChuToKhai.hopLe);

const boNutGia = kiemBoDo([
  { id: 'bad-3', loaiCa: 'THUAN', moTa: 'bình nhôm', nhomDung: '7611', canCuLuat: ['bieu:9999'] },
], { tapNutLuat: tapNut });
kiem('ca ngược NUT_THAT: từ chối canCuLuat không tồn tại trong data/luat-goc', !boNutGia.hopLe);

// 3. Ca ngược trọng yếu: nút chỉ xuất hiện ở chiều LOAI KHÔNG được tính là trúng ứng viên dương
const uvChiLoai = chuanHoaUngVien([
  { nut: 'bieu:7322', chieu: 'LOAI', cauId: 'phan:XV:kq:25#3' },
  { nut: 'bieu:7318', chieu: 'NHAC', cauId: 'phan:XV:kq:25#3' },
]);
const chamThuanBiLoai = chamMotCa(
  { id: 'trap-1', loaiCa: 'THUAN', moTa: 'bu lông', nhomDung: '7322', phanNhomDung: null },
  uvChiLoai,
  { rong: false }
);
kiem(
  'ca ngược KHONG_DEM_LOAI_LA_DUNG (ca thuận): 7322 chỉ ở chiều LOAI -> coNhom4=false, chiXuatHienOLoai=true',
  chamThuanBiLoai.coNhom4 === false && chamThuanBiLoai.chiXuatHienOLoai === true,
  chamThuanBiLoai
);

const chamNguocLoai = chamMotCa(
  { id: 'trap-2', loaiCa: 'NGUOC', kieuNguoc: 'KHONG_DEM_LOAI_LA_DUNG', moTa: 'bu lông', nhomDung: '7322' },
  uvChiLoai,
  { rong: false }
);
kiem('ca ngược KHONG_DEM_LOAI_LA_DUNG (chế độ NGUOC) đạt', chamNguocLoai.dat === true, chamNguocLoai);

// 4. Chạy thước đo thật với M-41 (lib/tim-luat.js) trên data/luat-goc thật
const kq = chayDoCuaVao({ boDo: BO_THU_LUAT_MAU, limit: 20 });
const m41 = kq.kenh.m41_tim_luat;
kiem('kênh m41_tim_luat có trạng thái DA_CAM', m41.trangThai === 'DA_CAM');
kiem('kênh m37_tim_nghia mặc định CHUA_CAM', kq.kenh.m37_tim_nghia.trangThai === 'CHUA_CAM');
kiem('kênh m52_loc mặc định CHUA_CAM', kq.kenh.m52_loc.trangThai === 'CHUA_CAM');
kiem('tất cả ca ngược RONG_KHONG_DOAN trên M-41 đều ĐẠT', m41.tongHop.caNguocDat === m41.tongHop.tongCaNguoc, m41.tongHop);

const ca7611 = m41.chiTiet.find((c) => c.id === 'luat-01-binh-nhom');
kiem('M-41 đưa 7611 vào top-5 cho "bình chứa bằng nhôm"', ca7611 && ca7611.trongTop5 === true, ca7611);

const ca7607 = m41.chiTiet.find((c) => c.id === 'luat-02-la-nhom-mong');
kiem('M-41 đưa 7607 vào top-5 cho "lá nhôm mỏng"', ca7607 && ca7607.trongTop5 === true, ca7607);

const ca8544 = m41.chiTiet.find((c) => c.id === 'luat-05-day-cap-cach-dien');
kiem('M-41 đưa 8544 vào top-5 cho "dây cáp điện cách điện"', ca8544 && ca8544.trongTop5 === true, ca8544);

const caMuTuVung = m41.chiTiet.find((c) => c.id === 'luat-09-vo-lon-nhom');
kiem('thước đo ghi nhận trung thực ca rỗng trên M-41 ("vỏ lon nước giải khát bằng nhôm")', caMuTuVung && caMuTuVung.rong === true && caMuTuVung.coNhom4 === false, caMuTuVung);

// 5. Chỗ cắm M-37 (timNghia) và M-52 (loc) hoạt động khi truyền hàm giả lập
const kqCam = chayDoCuaVao({
  boDo: [BO_THU_LUAT_MAU[0], BO_THU_LUAT_MAU[10]],
  limit: 10,
  timNghia: (moTa) => (moTa.includes('nhôm') ? [{ nut: 'bieu:7611', chieu: 'NHAC' }] : []),
  loc: (moTa) => (moTa.includes('nhôm') ? { ungVien: [{ nut: 'bieu:761100', chieu: 'NHAC' }] } : { ungVien: [] }),
});
kiem('chỗ cắm M-37 chuyển sang DA_CAM và chấm đúng 1/1 ca thuận + 1/1 ca ngược', kqCam.kenh.m37_tim_nghia.trangThai === 'DA_CAM' && kqCam.kenh.m37_tim_nghia.tongHop.trungNhom4 === 1 && kqCam.kenh.m37_tim_nghia.tongHop.caNguocDat === 1);
kiem('chỗ cắm M-52 chuyển sang DA_CAM và chấm đúng 1/1 phân nhóm 6 số', kqCam.kenh.m52_loc.trangThai === 'DA_CAM' && kqCam.kenh.m52_loc.tongHop.trungPhanNhom6 === 1);

// 6. Định dạng báo cáo Markdown & chạy CLI --json
const md = dinhDangBaoCaoMd(kq);
kiem('dinhDangBaoCaoMd sinh bảng kênh M-41 / M-37 / M-52', md.includes('m41_tim_luat') && md.includes('CHUA_CAM'));

const cli = spawnSync(process.execPath, [path.join(GOC, 'scripts', 'do-cua-vao.mjs'), '--json', '--limit', '10'], {
  cwd: GOC,
  encoding: 'utf8',
});
let parsedCli = null;
try { parsedCli = JSON.parse(cli.stdout); } catch { parsedCli = null; }
kiem('CLI --json thoát 0 và xuất JSON hợp lệ', cli.status === 0 && parsedCli && parsedCli.phienBanThuoc === 'm79-cua-vao@1', cli.stderr);

console.log(`\nTổng kết M-79: ${dat} xanh, ${hong} đỏ.`);
process.exit(hong === 0 ? 0 : 1);
