#!/usr/bin/env node
// scripts/test-dieu-kien.mjs — M-81 (#2410, ADR-0007): kiểm khuôn DIEU_KIEN/GIAI_CHONG/CANH_TRANH,
// bang-anh-em.mjs, cổng 6–12 (cong.mjs), tach-dieu-kien.mjs (mock HTTP + fetchImpl) và so-phieu-dieu-kien.mjs.
// Chạy hoàn toàn trong os.tmpdir(), không gọi mạng ngoài, không đụng data/ho-so-ma/.
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  kiemBanGhi,
  kiemBangAnhEm,
  kiemTep,
  kiemKhoHoSo,
} from './ho-so-ma/khuon.mjs';
import {
  napBieuMeta,
  laLoaiKhacThuan,
  demDoanChamPhay,
  taoBangChoCha,
  dungBangAnhEm,
  sinhBangAnhEm,
} from './ho-so-ma/bang-anh-em.mjs';
import { chayCong, napLuatCong, parseCongArg, vanTay } from './ho-so-ma/cong.mjs';
import {
  tachDieuKienNut,
  tachDanhSachNut,
  chuanHoaDieuKien,
  goiOpenAICompatible,
} from './ho-so-ma/tach-dieu-kien.mjs';
import { soPhieuDieuKien } from './ho-so-ma/so-phieu-dieu-kien.mjs';

const GOC = fileURLToPath(new URL('..', import.meta.url));
const LUAT_THAT = path.join(GOC, 'data/luat-goc');

let passed = 0;
let failed = 0;
function kiem(ten, ok, chiTiet = '') {
  if (ok) {
    passed += 1;
    console.log(`PASS ${ten}`);
  } else {
    failed += 1;
    const msg = chiTiet ? ` — ${(typeof chiTiet === 'string' ? chiTiet : JSON.stringify(chiTiet)).slice(0, 500)}` : '';
    console.log(`FAIL ${ten}${msg}`);
  }
}

// ---------- 1. Tạo kho luật thu gọn trong os.tmpdir() từ data/luat-goc thật ----------
const TAM = fs.mkdtempSync(path.join(os.tmpdir(), 'm81-dk-'));
const LUAT = path.join(TAM, 'luat-goc');
fs.mkdirSync(path.join(LUAT, 'cau'), { recursive: true });
fs.mkdirSync(path.join(LUAT, 'nghia-canh'), { recursive: true });

const CHON_ID = (id) => (
  id === 'gir:3:b'
  || ['phan:I', 'phan:VIII', 'phan:XVI'].includes(id)
  || ['chuong:02', 'chuong:42', 'chuong:85'].includes(id)
  || id === 'bieu:02' || id === 'bieu:42' || id === 'bieu:85'
  || /^bieu:0201/.test(id)
  || id === 'bieu:4202' || /^bieu:42022/.test(id)
  || id === 'bieu:8501' || id === 'bieu:850110' || id === 'bieu:850110:td1' || /^bieu:8501102/.test(id)
  || /^bieu:854370/.test(id)
  || id === 'bieu:8543'
  || id === 'bieu:8479'
  || /^nhom:8479:ct:[1-7]$/.test(id)
);

const docDong = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()) : []);
const daChon = new Set();
for (const kho of ['phan', 'chuong', 'bieu', 'nhom', 'gir']) {
  const lines = docDong(path.join(LUAT_THAT, `${kho}.jsonl`)).filter((l) => {
    const o = JSON.parse(l);
    if (CHON_ID(o.id)) { daChon.add(o.id); return true; }
    return false;
  });
  fs.writeFileSync(path.join(LUAT, `${kho}.jsonl`), `${lines.join('\n')}${lines.length ? '\n' : ''}`);
  const cauLines = docDong(path.join(LUAT_THAT, 'cau', `${kho}.jsonl`)).filter((l) => daChon.has(JSON.parse(l).id.split('#')[0]));
  fs.writeFileSync(path.join(LUAT, 'cau', `${kho}.jsonl`), `${cauLines.join('\n')}${cauLines.length ? '\n' : ''}`);
}
fs.copyFileSync(path.join(LUAT_THAT, 'phan-chuong-nhom.json'), path.join(LUAT, 'phan-chuong-nhom.json'));

const L = napLuatCong(LUAT);
const bieuMeta = napBieuMeta(LUAT);
const dk = (nut, stt, ve, phu, kieu, mo, cauHoi, trich, nguon, extra = {}) => {
  const chu = L.chuCau(nguon);
  return {
    id: `hs:${nut}:${8100 + stt}`,
    nut,
    loai: 'DIEU_KIEN',
    ve,
    phu,
    kieu,
    ...extra,
    mo,
    cauHoi,
    trich,
    nguon,
    vanTay: vanTay(chu),
  };
};

// ---------- 2. Kiểm khuôn (khuon.mjs) ----------
{
  const recOk = dk('bieu:85437050', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Có phải bộ khuếch đại vi sóng không?', 'Bộ khuếch đại vi sóng', 'bieu:85437050#1');
  const recSo = dk('bieu:85011022', 1, 1, false, 'SO', 'NGUONG', 'Công suất không quá 5 W?', 'công suất không quá 5 W', 'bieu:85011022#1', { nguong: 'hs:bieu:85011022:7401' });
  const recGt = dk('bieu:420221', 1, 1, false, 'GIA_TRI', 'MO_TA_HUONG_DAN', 'Chất liệu mặt ngoài là gì?', 'da thuộc hoặc da thuộc tổng hợp', 'bieu:420221#1', { tap: ['da thuộc', 'da thuộc tổng hợp'] });
  const gcOk = { id: 'hs:bieu:854370:8101', nut: 'bieu:854370', loai: 'GIAI_CHONG', cap: ['bieu:85437030', 'bieu:85437050'], cach: 'CHU_GIAI', trich: 'Máy, thiết bị điện có chức năng phiên dịch hoặc từ điển', nguon: 'bieu:85437030#1' };
  const ctOk = { id: 'hs:bieu:8543:8101', nut: 'bieu:8543', loai: 'CANH_TRANH', nhomCanhTranh: ['bieu:8479', 'bieu:8543'], phepThu: ['nhom:8479:ct:5#1', 'nhom:8479:ct:6#1', 'nhom:8479:ct:7#1'], trich: 'Không thể phân loại trong bất kỳ một nhóm cụ thể nào khác của chương này', nguon: 'nhom:8479:ct:4#1' };

  kiem('khuon: DIEU_KIEN CO_KHONG / SO / GIA_TRI hợp lệ', !kiemBanGhi(recOk).length && !kiemBanGhi(recSo).length && !kiemBanGhi(recGt).length);
  kiem('khuon: GIAI_CHONG & CANH_TRANH hợp lệ', !kiemBanGhi(gcOk).length && !kiemBanGhi(ctOk).length);

  kiem('khuon: từ chối id không phải 81NN', kiemBanGhi({ ...recOk, id: 'hs:bieu:85437050:7401' }).some((l) => /81NN/.test(l)));
  kiem('khuon: từ chối trường lạ trong DIEU_KIEN', kiemBanGhi({ ...recOk, la: 1 }).some((l) => /trường lạ "la"/.test(l)));
  kiem('khuon: từ chối kieu SO thiếu nguong hoặc mang tap', kiemBanGhi({ ...recOk, kieu: 'SO' }).some((l) => /kieu SO phải có nguong/.test(l)) && kiemBanGhi({ ...recSo, tap: ['x'] }).some((l) => /kieu SO không mang tap/.test(l)));
  kiem('khuon: từ chối kieu SO nhúng nguong object (phải trỏ id M-74)', kiemBanGhi({ ...recOk, kieu: 'SO', nguong: { tu: 0, den: 5 } }).some((l) => /id bản ghi NGUONG/.test(l)));
  kiem('khuon: từ chối kieu GIA_TRI thiếu tap hoặc rỗng', kiemBanGhi({ ...recOk, kieu: 'GIA_TRI' }).some((l) => /tap/.test(l)) && kiemBanGhi({ ...recGt, tap: [] }).some((l) => /tap/.test(l)));
  kiem('khuon: từ chối CO_KHONG mang nguong/tap', kiemBanGhi({ ...recOk, nguong: 'hs:bieu:1:7401' }).some((l) => /không mang nguong/.test(l)));
  kiem('khuon: từ chối cauHoi nhiều dòng hoặc >300 ký tự', kiemBanGhi({ ...recOk, cauHoi: 'a\nb' }).some((l) => /cauHoi/.test(l)) && kiemBanGhi({ ...recOk, cauHoi: 'x'.repeat(301) }).some((l) => /cauHoi/.test(l)));
  kiem('khuon: từ chối GIAI_CHONG cap trùng nhau / cach lạ', kiemBanGhi({ ...gcOk, cap: ['bieu:85437030', 'bieu:85437030'] }).some((l) => /cap/.test(l)) && kiemBanGhi({ ...gcOk, cach: 'DOAN' }).some((l) => /cach lạ/.test(l)));
  kiem('khuon: từ chối CANH_TRANH phepThu rỗng / nhomCanhTranh rỗng', kiemBanGhi({ ...ctOk, phepThu: [] }).some((l) => /phepThu/.test(l)) && kiemBanGhi({ ...ctOk, nhomCanhTranh: [] }).some((l) => /nhomCanhTranh/.test(l)));

  const legacyPhaiLa = { id: 'hs:bieu:85437050:1', nut: 'bieu:85437050', loai: 'PHAI_LA', dieuKien: 'Bộ khuếch đại vi sóng', trich: 'Bộ khuếch đại vi sóng', cau: 'bieu:85437050#1', duKien: [], lop: 'LUAT', nguon: 'x', van: recOk.vanTay, trangThai: 'KHOP' };
  kiem('khuon: kiemTep nhận dieu-kien/85.jsonl & 85-giai-chong.jsonl; từ chối loại cũ trong dieu-kien/', !kiemTep('dieu-kien/85.jsonl', JSON.stringify(recOk)).loi.length && !kiemTep('dieu-kien/85-giai-chong.jsonl', JSON.stringify(gcOk)).loi.length && kiemTep('dieu-kien/85.jsonl', JSON.stringify(legacyPhaiLa)).loi.some((l) => /không thuộc thư mục dieu-kien/.test(l)));
  kiem('khuon: kiemTep từ chối DIEU_KIEN đặt trong dong/', kiemTep('dong/85437050.jsonl', JSON.stringify(recOk)).loi.some((l) => /phải ghi ở thư mục dieu-kien/.test(l)));
}

// ---------- 3. Dữ liệu thử sạch cho cổng 6..12 & bang-anh-em ----------
const ng5W = {
  id: 'hs:bieu:85011022:7401',
  nut: 'bieu:85011022',
  loai: 'NGUONG',
  dieuKien: 'Động cơ bước loại khác có công suất không quá 5 W',
  trich: 'công suất không quá 5 W',
  cau: 'bieu:85011022#1',
  nguong: { daiLuong: 'công suất', donVi: 'W', tu: null, den: 5, gomTu: false, gomDen: true },
  duKien: ['công suất'],
  lop: 'LUAT',
  nguon: L.nut.get('bieu:85011022').nguon,
  van: vanTay(L.chuCau('bieu:85011022#1')),
  trangThai: 'KHOP',
};

const DUNG_8543 = [
  dk('bieu:8543', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Có phải máy hoặc thiết bị điện có chức năng riêng không?', 'Máy và thiết bị điện, có chức năng riêng', 'bieu:8543#1'),
  dk('bieu:854370', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải máy và thiết bị khác (không thuộc 8543.10–.40, không phải bộ phận)?', 'Máy và thiết bị khác', 'bieu:854370#1'),
  dk('bieu:85437010', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải máy cung cấp năng lượng cho hàng rào điện không?', 'Máy cung cấp năng lượng cho hàng rào điện', 'bieu:85437010#1'),
  dk('bieu:8543702', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải thiết bị điều khiển từ xa không?', 'Thiết bị điều khiển từ xa', 'bieu:8543702#1'),
  dk('bieu:8543702', 2, 1, true, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải thiết bị điều khiển từ xa bằng sóng radio (loại trừ)?', 'trừ thiết bị điều khiển từ xa bằng sóng radio', 'bieu:8543702#1'),
  dk('bieu:85437021', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải điều khiển từ xa hồng ngoại không dây cho máy chơi trò chơi điện tử video không?', 'Thiết bị điều khiển từ xa hồng ngoại không dây dùng cho máy chơi trò chơi điện tử video', 'bieu:85437021#1'),
  dk('bieu:85437021', 2, 1, true, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải bộ điều khiển trò chơi thuộc nhóm 95.04 (loại trừ)?', 'trừ bộ điều khiển trò chơi thuộc nhóm 95.04', 'bieu:85437021#1'),
  dk('bieu:85437030', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có chức năng phiên dịch hoặc từ điển không?', 'Máy, thiết bị điện có chức năng phiên dịch hoặc từ điển', 'bieu:85437030#1'),
  // 8543.70.40 có dấu ";" => tối thiểu 2 vế
  dk('bieu:85437040', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải máy tách bụi hoặc khử tĩnh điện chế tạo PCB/PWB/PCA không?', 'Máy tách bụi hoặc khử tĩnh điện trong quá trình chế tạo tấm mạch PCB/PWBs(1) hoặc PCAs(1)', 'bieu:85437040#1'),
  dk('bieu:85437040', 2, 2, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải máy làm đóng rắn vật liệu bằng tia cực tím sản xuất PCB/PWB/PCA không?', 'máy làm đóng rắn vật liệu bằng tia cực tím dùng trong sản xuất tấm mạch PCB/PWBs(1) hoặc PCAs(1)', 'bieu:85437040#1'),
  // 8543.70.50 có 3 đoạn ";" => 3 vế
  dk('bieu:85437050', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Có phải bộ khuếch đại vi sóng không?', 'Bộ khuếch đại vi sóng', 'bieu:85437050#1'),
  dk('bieu:85437050', 2, 2, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải máy ghi dữ liệu chuyến bay kỹ thuật số không?', 'máy ghi dữ liệu chuyến bay kỹ thuật số', 'bieu:85437050#1'),
  dk('bieu:85437050', 3, 3, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải đầu đọc điện tử di động chạy pin đọc/tái tạo văn bản, hình ảnh, âm thanh không?', 'đầu đọc điện tử di động hoạt động bằng pin để ghi và tái tạo văn bản, hình ảnh tĩnh hoặc tệp âm thanh', 'bieu:85437050#1'),
  // 8543.70.60 có 2 đoạn ";" => 2 vế
  dk('bieu:85437060', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải thiết bị xử lý tín hiệu số kết nối mạng để trộn âm thanh không?', 'Thiết bị xử lý tín hiệu kỹ thuật số có khả năng kết nối với mạng có dây hoặc không dây để trộn âm thanh', 'bieu:85437060#1'),
  dk('bieu:85437060', 2, 2, false, 'CO_KHONG', 'NGHIA_THUONG', 'Có được thiết kế đặc biệt để kết nối với thiết bị/mạng điện tín hoặc điện thoại không?', 'các sản phẩm được thiết kế đặc biệt để kết nối với thiết bị hoặc dụng cụ điện tín hoặc điện thoại hoặc với mạng điện tín hoặc điện thoại', 'bieu:85437060#1'),
  // CANH_TRANH cho 85.43 ("chưa được chi tiết hoặc ghi ở nơi khác")
  {
    id: 'hs:bieu:8543:8102',
    nut: 'bieu:8543',
    loai: 'CANH_TRANH',
    nhomCanhTranh: ['bieu:8479', 'bieu:8543'],
    phepThu: ['nhom:8479:ct:5#1', 'nhom:8479:ct:6#1', 'nhom:8479:ct:7#1'],
    trich: 'Không thể phân loại trong bất kỳ một nhóm cụ thể nào khác của chương này',
    nguon: 'nhom:8479:ct:4#1',
  },
];

// 8501.10.2: thử loaiKhacCoVe (85011022) + SO
const DUNG_8501102 = [
  dk('bieu:8501102', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải động cơ bước không?', 'Động cơ bước', 'bieu:8501102#1'),
  dk('bieu:85011021', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có dùng cho hàng hoá nhóm 84.15, 84.18, 84.50, 85.09 hoặc 85.16 không?', 'Loại dùng cho hàng hóa thuộc nhóm 84.15, 84.18, 84.50, 85.09 hoặc 85.16', 'bieu:85011021#1'),
  dk('bieu:85011022', 1, 1, false, 'SO', 'NGUONG', 'Công suất không quá 5 W?', 'công suất không quá 5 W', 'bieu:85011022#1', { nguong: 'hs:bieu:85011022:7401' }),
];

// 4202.2: thử GIA_TRI trục chất liệu mặt ngoài + Loại khác + 420222 phủ kín tập GIA_TRI
const CAU_HOI_MAT_NGOAI = 'Chất liệu mặt ngoài là vật liệu nào?';
const DUNG_42022 = [
  dk('bieu:42022', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải túi xách tay (kể cả có/không quai đeo vai, tay cầm) không?', 'Túi xách tay, có hoặc không có quai đeo vai, kể cả loại không có tay cầm', 'bieu:42022#1'),
  dk('bieu:420221', 1, 1, false, 'GIA_TRI', 'MO_TA_HUONG_DAN', CAU_HOI_MAT_NGOAI, 'Mặt ngoài bằng da thuộc hoặc da thuộc tổng hợp', 'bieu:420221#1', { tap: ['da thuộc', 'da thuộc tổng hợp'] }),
  dk('bieu:420222', 1, 1, false, 'GIA_TRI', 'MO_TA_HUONG_DAN', CAU_HOI_MAT_NGOAI, 'Mặt ngoài bằng tấm plastic hoặc vật liệu dệt', 'bieu:420222#1', { tap: ['tấm plastic', 'vật liệu dệt'] }),
  dk('bieu:42022210', 1, 1, false, 'GIA_TRI', 'MO_TA_HUONG_DAN', CAU_HOI_MAT_NGOAI, 'Mặt ngoài bằng tấm plastic', 'bieu:42022210#1', { tap: ['tấm plastic'] }),
  dk('bieu:42022220', 1, 1, false, 'GIA_TRI', 'MO_TA_HUONG_DAN', CAU_HOI_MAT_NGOAI, 'Mặt ngoài bằng vật liệu dệt', 'bieu:42022220#1', { tap: ['vật liệu dệt'] }),
];

// 0201: nhóm KHÔNG có "Loại khác", chứng minh phủ kín bằng cặp bù phu (có xương / không xương)
const DUNG_0201 = [
  dk('bieu:0201', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải thịt động vật họ trâu bò tươi hoặc ướp lạnh không?', 'Thịt của động vật họ trâu bò, tươi hoặc ướp lạnh', 'bieu:0201#1'),
  dk('bieu:020110', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải thịt cả con hoặc nửa con không?', 'Thịt cả con và nửa con', 'bieu:020110#1'),
  dk('bieu:020120', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Thịt có xương không?', 'Thịt pha có xương khác', 'bieu:020120#1'),
  dk('bieu:020130', 1, 1, true, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Thịt có xương không?', 'Thịt lọc không xương', 'bieu:020130#1'),
];

let hoSoCount = 0;
function ghiHoSoTam({ dkList = [], nguongList = [], bangList = [] } = {}) {
  hoSoCount += 1;
  const goc = path.join(TAM, `hs-${hoSoCount}`);
  const theoTep = new Map();
  for (const r of dkList) {
    const ch = r.nut.startsWith('chuong:') ? r.nut.slice(7, 9) : r.nut.slice(5, 7);
    const rel = `dieu-kien/${ch}.jsonl`;
    if (!theoTep.has(rel)) theoTep.set(rel, []);
    theoTep.get(rel).push(JSON.stringify(r));
  }
  for (const r of nguongList) {
    const ch = r.nut.slice(5, 7);
    const rel = `nguong/${ch}.jsonl`;
    if (!theoTep.has(rel)) theoTep.set(rel, []);
    theoTep.get(rel).push(JSON.stringify(r));
  }
  for (const b of bangList) {
    const rel = `bang-anh-em/${b.chuong}.jsonl`;
    if (!theoTep.has(rel)) theoTep.set(rel, []);
    theoTep.get(rel).push(JSON.stringify(b));
  }
  for (const [rel, lines] of theoTep) {
    const abs = path.join(goc, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, `${lines.join('\n')}\n`, 'utf8');
  }
  return goc;
}

const KHO_CHUAN = ghiHoSoTam({
  dkList: [...DUNG_8543, ...DUNG_8501102, ...DUNG_42022, ...DUNG_0201],
  nguongList: [ng5W],
});

// ---------- 4. Kiểm bang-anh-em.mjs ----------
{
  kiem('bang-anh-em: nhận diện Loại khác thuần vs loaiKhacCoVe', laLoaiKhacThuan('bieu:85437090', L, bieuMeta) && !laLoaiKhacThuan('bieu:85011022', L, bieuMeta) && laLoaiKhacThuan('bieu:85011029', L, bieuMeta));
  kiem('bang-anh-em: demDoanChamPhay chính xác', demDoanChamPhay(L.cay.theoId.get('bieu:85437040').ten) === 2 && demDoanChamPhay(L.cay.theoId.get('bieu:85437050').ten) === 3);

  const b85_1 = dungBangAnhEm({ chuong: '85', chaIds: ['bieu:854370', 'bieu:8543702', 'bieu:8501102'], luat: LUAT, hoSo: KHO_CHUAN, L });
  const b85_2 = dungBangAnhEm({ chuong: '85', chaIds: ['bieu:854370', 'bieu:8543702', 'bieu:8501102'], luat: LUAT, hoSo: KHO_CHUAN, L });
  kiem('bang-anh-em: tất định 100% (hai lần chạy vanTay y hệt)', b85_1.bang.length === 3 && b85_1.bang.every((b, i) => b.vanTay === b85_2.bang[i].vanTay && kiemBangAnhEm(b).length === 0));

  const t854370 = b85_1.bang.find((b) => b.cha === 'bieu:854370');
  const lk85437090 = t854370.anhEm.find((x) => x.nut === 'bieu:85437090');
  const expectedAskCount = DUNG_8543.filter((x) => x.loai === 'DIEU_KIEN' && !['bieu:85437021'].includes(x.nut)).length; // chuỗi cha (8543, 854370) + mọi anh em cấp 854370
  kiem('bang-anh-em: 85437090 (Loại khác) có công thức KHÔNG_HOP_VA_CHA & cauHoiToiThieu đủ cha + mọi anh em',
    lk85437090.laLoaiKhac === true
    && lk85437090.congThuc.loai === 'KHONG_HOP_VA_CHA'
    && lk85437090.congThuc.phuCua.includes('bieu:85437040')
    && lk85437090.cauHoiToiThieu.length === expectedAskCount
    && t854370.co.includes('NGHIA_THUONG')
    && t854370.co.includes('CHUA_CHUNG_MINH_TACH'),
    { co: t854370.co, ask: lk85437090.cauHoiToiThieu.length, expectedAskCount });

  const t8501102 = b85_1.bang.find((b) => b.cha === 'bieu:8501102');
  const ae22 = t8501102.anhEm.find((x) => x.nut === 'bieu:85011022');
  kiem('bang-anh-em: 85011022 (loaiKhacCoVe) giữ HOAC_CUA_VA + truAnhEm [85011021]', ae22.laLoaiKhac === false && ae22.congThuc.loai === 'HOAC_CUA_VA' && ae22.congThuc.truAnhEm.join(',') === 'bieu:85011021');

  const outRa = path.join(TAM, 'ra-bang');
  const s85 = sinhBangAnhEm({ chuong: '85', chaIds: ['bieu:854370'], luat: LUAT, hoSo: KHO_CHUAN, ra: outRa, ghi: true });
  const khoDocLai = kiemKhoHoSo(outRa);
  kiem('bang-anh-em: ghi tệp bang-anh-em/85.jsonl và kiemKhoHoSo qua 0 lỗi', fs.existsSync(s85.tep) && khoDocLai.loi.length === 0 && khoDocLai.bangAnhEm.length === 1, khoDocLai.loi);
}

// ---------- 5. Kiểm cổng 6..12 (cong.mjs) — ca xanh và ca ngược từng cổng ----------
{
  const viDu8543 = [
    // Đầu đọc sách điện tử có từ điển thoả cả .30 (từ điển) và .50 vế 3 (đầu đọc điện tử) -> tách bằng GIAI_CHONG bên dưới hoặc rẽ đúng nhánh
    {
      trich: 'Máy làm đóng rắn vật liệu bằng tia cực tím dùng trong sản xuất tấm mạch PCB',
      ganDieuKien: {
        'hs:bieu:85437010:8101': false,
        'hs:bieu:8543702:8101': false,
        'hs:bieu:8543702:8102': false,
        'hs:bieu:85437030:8101': false,
        'hs:bieu:85437040:8101': false,
        'hs:bieu:85437040:8102': true,
        'hs:bieu:85437050:8101': false,
        'hs:bieu:85437050:8102': false,
        'hs:bieu:85437050:8103': false,
        'hs:bieu:85437060:8101': false,
        'hs:bieu:85437060:8102': false,
      },
      dich: 'bieu:85437040',
    },
    {
      trich: 'Thiết bị điện có chức năng riêng biệt không rơi vào .10-.60 -> Loại khác 8543.70.90',
      ganDieuKien: {
        'hs:bieu:85437010:8101': false,
        'hs:bieu:8543702:8101': false,
        'hs:bieu:8543702:8102': false,
        'hs:bieu:85437030:8101': false,
        'hs:bieu:85437040:8101': false,
        'hs:bieu:85437040:8102': false,
        'hs:bieu:85437050:8101': false,
        'hs:bieu:85437050:8102': false,
        'hs:bieu:85437050:8103': false,
        'hs:bieu:85437060:8101': false,
        'hs:bieu:85437060:8102': false,
      },
      dich: 'bieu:85437090',
    },
    {
      trich: 'Thiếu dữ kiện có phải máy tách bụi / đóng rắn PCB không -> dừng hỏi',
      ganDieuKien: {
        'hs:bieu:85437010:8101': false,
        'hs:bieu:8543702:8101': false,
        'hs:bieu:85437030:8101': false,
        // cố tình bỏ trống 85437040
      },
      dich: null,
      duKien: ['hs:bieu:85437040:8101'],
    },
  ];

  const rGreen = chayCong({ luat: LUAT, hoSo: KHO_CHUAN, phamVi: ['bieu:854370', 'bieu:8543', 'bieu:42022', 'bieu:0201'], chiTrong: true, cong: [6, 7, 8, 9, 10, 11, 12], L, viDu: viDu8543 });
  const tatCaXanh = !rGreen.khuon.length && Object.values(rGreen.cong).every((c) => !c.loi.length);
  kiem('cổng 6–12: toàn bộ ca chuẩn XANH (kể cả khi có CHUA_CHUNG_MINH_TACH và NGHIA_THUONG)', tatCaXanh, rGreen.cong);
  kiem('cổng 8 CHỒNG: CHUA_CHUNG_MINH_TACH được đếm ở dem & canhBao, KHÔNG chặn', rGreen.cong[8].dem.chuaChungMinhTach > 0 && rGreen.cong[8].loi.length === 0, rGreen.cong[8]);
  kiem('cổng 8 CHỒNG: cặp GIA_TRI khác tap (420221 vs 420222) chứng minh rời nhau', rGreen.cong[8].dem.roiNhau >= 1, rGreen.cong[8].dem);
  kiem('cổng 11 MỞ: đếm NGHIA_THUONG nhưng không chặn', rGreen.cong[11].dem.nghiaThuong === 3 && rGreen.cong[11].loi.length === 0, rGreen.cong[11].dem);

  // Cổng 6 ca ngược
  const khoThieu40 = ghiHoSoTam({ dkList: DUNG_8543.filter((x) => x.nut !== 'bieu:85437040'), nguongList: [ng5W] });
  const r6a = chayCong({ luat: LUAT, hoSo: khoThieu40, phamVi: ['bieu:854370'], chiTrong: true, cong: [6], L });
  kiem('CA NGƯỢC cổng 6: nút có tên thiếu DIEU_KIEN ⇒ đỏ', r6a.cong[6].loi.some((l) => /bieu:85437040: nút có tên chưa có/.test(l)), r6a.cong[6].loi);

  const khoGopVe = ghiHoSoTam({
    dkList: DUNG_8543.map((x) => (x.nut === 'bieu:85437040' ? { ...x, ve: 1 } : x)),
  });
  const r6b = chayCong({ luat: LUAT, hoSo: khoGopVe, phamVi: ['bieu:854370'], chiTrong: true, cong: [6], L });
  kiem('CA NGƯỢC cổng 6: bieu:85437040 có 2 đoạn ";" nhưng chỉ 1 vế ⇒ đỏ', r6b.cong[6].loi.some((l) => /2 đoạn tách bởi ";"/.test(l)), r6b.cong[6].loi);

  const khoSaiTrich = ghiHoSoTam({
    dkList: DUNG_8543.map((x) => (x.id === 'hs:bieu:85437030:8101' ? { ...x, trich: 'chức năng phiên dịch tự bịa' } : x)),
  });
  const r6c = chayCong({ luat: LUAT, hoSo: khoSaiTrich, phamVi: ['bieu:854370'], chiTrong: true, cong: [6], L });
  kiem('CA NGƯỢC cổng 6: trich không nguyên văn ⇒ đỏ', r6c.cong[6].loi.some((l) => /trich không nguyên văn/.test(l)), r6c.cong[6].loi);

  const khoThieuNguong = ghiHoSoTam({ dkList: DUNG_8501102 }); // cố tình bỏ ng5W
  const r6d = chayCong({ luat: LUAT, hoSo: khoThieuNguong, phamVi: ['bieu:8501102'], chiTrong: true, cong: [6], L });
  kiem('CA NGƯỢC cổng 6: kieu SO trỏ nguong M-74 không tồn tại ⇒ đỏ', r6d.cong[6].loi.some((l) => /không có trong hồ sơ NGUONG/.test(l)), r6d.cong[6].loi);

  // Cổng 7 ca ngược (0201 không có Loại khác và không chứng minh được phủ kín)
  const khoHoPhu = ghiHoSoTam({
    dkList: [
      ...DUNG_0201.filter((x) => x.nut !== 'bieu:020130'),
      dk('bieu:020130', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Thịt lọc không xương?', 'Thịt lọc không xương', 'bieu:020130#1'),
    ],
  });
  const r7 = chayCong({ luat: LUAT, hoSo: khoHoPhu, phamVi: ['bieu:0201'], chiTrong: true, cong: [7], L });
  kiem('CA NGƯỢC cổng 7: nhóm không có "Loại khác" và không chứng minh được phủ kín ⇒ đỏ HO_PHU', r7.cong[7].loi.some((l) => /HO_PHU/.test(l)), r7.cong[7].loi);

  // Cổng 7: nhóm không có Loại khác nhưng phủ kín bằng dải NGUONG (-∞, +∞) ⇒ xanh
  const ngDuoi5 = { ...ng5W, id: 'hs:bieu:42022210:7401', nut: 'bieu:42022210', cau: 'bieu:85011022#1', nguong: { daiLuong: 'công suất', donVi: 'W', tu: null, den: 5, gomTu: false, gomDen: true } };
  const ngTren5 = { ...ng5W, id: 'hs:bieu:42022220:7401', nut: 'bieu:42022220', cau: 'bieu:85011022#1', nguong: { daiLuong: 'công suất', donVi: 'W', tu: 5, den: null, gomTu: false, gomDen: false } };
  const khoNguongKin = ghiHoSoTam({
    dkList: [
      dk('bieu:42022210', 1, 1, false, 'SO', 'NGUONG', 'Công suất <= 5 W?', 'công suất không quá 5 W', 'bieu:85011022#1', { nguong: ngDuoi5.id }),
      dk('bieu:42022220', 1, 1, false, 'SO', 'NGUONG', 'Công suất > 5 W?', 'công suất không quá 5 W', 'bieu:85011022#1', { nguong: ngTren5.id }),
    ],
    nguongList: [ngDuoi5, ngTren5],
  });
  const r7So = chayCong({ luat: LUAT, hoSo: khoNguongKin, phamVi: ['bieu:420222'], chiTrong: true, cong: [7, 8], L });
  kiem('cổng 7 & 8: dải SO (-∞,5] và (5,+∞) phủ kín không hở + chứng minh rời nhau', !r7So.cong[7].loi.length && !r7So.cong[8].loi.length && r7So.cong[8].dem.roiNhau === 1, { c7: r7So.cong[7], c8: r7So.cong[8] });

  // Cổng 8 ca ngược: hai ngưỡng SO chồng dải (<= 10 vs > 5) ⇒ VUNG_CHONG đỏ
  const ngDuoi10 = { ...ngDuoi5, nguong: { daiLuong: 'công suất', donVi: 'W', tu: null, den: 10, gomTu: false, gomDen: true } };
  const khoNguongChong = ghiHoSoTam({
    dkList: [
      dk('bieu:42022210', 1, 1, false, 'SO', 'NGUONG', 'Công suất <= 10 W?', 'công suất không quá 5 W', 'bieu:85011022#1', { nguong: ngDuoi10.id }),
      dk('bieu:42022220', 1, 1, false, 'SO', 'NGUONG', 'Công suất > 5 W?', 'công suất không quá 5 W', 'bieu:85011022#1', { nguong: ngTren5.id }),
    ],
    nguongList: [ngDuoi10, ngTren5],
  });
  const r8SoChong = chayCong({ luat: LUAT, hoSo: khoNguongChong, phamVi: ['bieu:420222'], chiTrong: true, cong: [8], L });
  kiem('CA NGƯỢC cổng 8: hai ngưỡng SO chồng dải (<=10 vs >5) ⇒ VUNG_CHONG đỏ', r8SoChong.cong[8].loi.some((l) => /VUNG_CHONG/.test(l)), r8SoChong.cong[8].loi);

  // Cổng 8 VUNG_CHONG chặn vs GIAI_CHONG gỡ
  const vungChong = [{ nut: 'bieu:854370', cap: ['bieu:85437030', 'bieu:85437050'], moTa: 'Đầu đọc sách điện tử có từ điển' }];
  const r8a = chayCong({ luat: LUAT, hoSo: KHO_CHUAN, phamVi: ['bieu:854370'], chiTrong: true, cong: [8], L, vungChong });
  kiem('CA NGƯỢC cổng 8: cặp có VUNG_CHONG chưa có GIAI_CHONG ⇒ đỏ', r8a.cong[8].loi.some((l) => /VUNG_CHONG giữa bieu:85437030 và bieu:85437050/.test(l)), r8a.cong[8].loi);

  const khoCoGiaiChong = ghiHoSoTam({
    dkList: [
      ...DUNG_8543,
      { id: 'hs:bieu:854370:8102', nut: 'bieu:854370', loai: 'GIAI_CHONG', cap: ['bieu:85437030', 'bieu:85437050'], cach: 'QUY_TAC_3', trich: 'Máy, thiết bị điện có chức năng phiên dịch hoặc từ điển', nguon: 'bieu:85437030#1' },
    ],
  });
  const r8b = chayCong({ luat: LUAT, hoSo: khoCoGiaiChong, phamVi: ['bieu:854370'], chiTrong: true, cong: [8], L, vungChong });
  kiem('cổng 8: thêm GIAI_CHONG hợp lệ gỡ VUNG_CHONG ⇒ xanh', !r8b.cong[8].loi.length && r8b.cong[8].dem.giaiChong === 1, r8b.cong[8]);

  // Cổng 9 ca ngược (nhóm có Loại khác nhưng các anh em đều thiếu DIEU_KIEN => cauHoiToiThieu rỗng)
  const khoThieuHoi = ghiHoSoTam({ dkList: [] });
  const r9 = chayCong({ luat: LUAT, hoSo: khoThieuHoi, phamVi: ['bieu:42022'], chiTrong: true, cong: [9], L });
  kiem('CA NGƯỢC cổng 9: Loại khác không có cauHoiToiThieu ⇒ đỏ', r9.cong[9].loi.some((l) => /cauHoiToiThieu/.test(l)), r9.cong[9].loi);

  // Cổng 10 ca ngược (ví dụ định tuyến sai đích)
  const r10 = chayCong({
    luat: LUAT,
    hoSo: KHO_CHUAN,
    phamVi: ['bieu:854370'],
    chiTrong: true,
    cong: [10],
    L,
    viDu: [{ ...viDu8543[0], dich: 'bieu:85437090' }],
  });
  kiem('CA NGƯỢC cổng 10: ví dụ chạy qua bảng lệch đích ⇒ đỏ', r10.cong[10].loi.length === 1 && /kỳ vọng bieu:85437090/.test(r10.cong[10].loi[0]), r10.cong[10]);

  // Cổng 11 ca ngược (NGHIA_THUONG thiếu câu hỏi hoặc mo lạ)
  const khoLoiMo = ghiHoSoTam({
    dkList: DUNG_8543.map((x) => (x.id === 'hs:bieu:85437050:8101' ? { ...x, cauHoi: '   ' } : x)),
  });
  const r11 = chayCong({ luat: LUAT, hoSo: khoLoiMo, phamVi: ['bieu:854370'], chiTrong: true, cong: [11], L });
  kiem('CA NGƯỢC cổng 11 / khuôn: NGHIA_THUONG thiếu cauHoi ⇒ đỏ', r11.khuon.length > 0, r11.khuon);

  // Cổng 12 ca ngược (85.43 thiếu CANH_TRANH)
  const khoThieuCt = ghiHoSoTam({ dkList: DUNG_8543.filter((x) => x.loai !== 'CANH_TRANH') });
  const r12 = chayCong({ luat: LUAT, hoSo: khoThieuCt, phamVi: ['bieu:8543'], chiTrong: true, cong: [12], L });
  kiem('CA NGƯỢC cổng 12: nhóm "chưa được chi tiết hoặc ghi ở nơi khác" thiếu CANH_TRANH ⇒ đỏ', r12.cong[12].loi.some((l) => /bieu:8543:.*CANH_TRANH/.test(l)), r12.cong[12].loi);

  // Parse --cong range
  kiem('cong.mjs: parseCongArg hỗ trợ "6..12" và "1,2,6..8"', parseCongArg('6..12').join(',') === '6,7,8,9,10,11,12' && parseCongArg('1,2,6..8').join(',') === '1,2,6,7,8');

  // CLI cong.mjs --cong 6..12 xanh trên kho chuẩn và đỏ khi có VUNG_CHONG
  const vcPath = path.join(TAM, 'vc.jsonl');
  fs.writeFileSync(vcPath, `${JSON.stringify(vungChong[0])}\n`, 'utf8');
  const cliOk = spawnSync(process.execPath, [path.join(GOC, 'scripts/ho-so-ma/cong.mjs'), '--luat', LUAT, '--ho-so', KHO_CHUAN, '--pham-vi', 'bieu:8543', '--chi-trong', '--cong', '6..12'], { encoding: 'utf8' });
  const cliVc = spawnSync(process.execPath, [path.join(GOC, 'scripts/ho-so-ma/cong.mjs'), '--luat', LUAT, '--ho-so', KHO_CHUAN, '--pham-vi', 'bieu:8543', '--chi-trong', '--cong', '8', '--vung-chong', vcPath], { encoding: 'utf8' });
  kiem('CLI cong.mjs --cong 6..12 thoát 0 khi xanh, thoát 1 khi có VUNG_CHONG', cliOk.status === 0 && /PASS cổng 8 CHỒNG/.test(cliOk.stdout) && cliVc.status === 1 && /FAIL cổng 8 CHỒNG/.test(cliVc.stdout), { ok: cliOk.status, vc: cliVc.status, out: cliOk.stdout.slice(-300) });
}

// ---------- 6. Kiểm tach-dieu-kien.mjs với HTTP mock server + fetchImpl ----------
{
  const srv = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      const body = JSON.parse(raw);
      const reply = {
        dieuKien: [
          {
            ve: 1,
            phu: false,
            kieu: 'CO_KHONG',
            mo: 'NGHIA_THUONG',
            cauHoi: 'Có phải bộ khuếch đại vi sóng không?',
            trich: 'Bộ khuếch đại vi sóng',
            nguon: 'bieu:85437050#1',
          },
          {
            ve: 2,
            phu: false,
            kieu: 'CO_KHONG',
            mo: 'MO_TA_HUONG_DAN',
            cauHoi: 'Có phải máy ghi dữ liệu chuyến bay kỹ thuật số không?',
            trich: 'máy ghi dữ liệu chuyến bay kỹ thuật số',
            nguon: 'bieu:85437050#1',
          },
          {
            ve: 3,
            phu: false,
            kieu: 'CO_KHONG',
            mo: 'MO_TA_HUONG_DAN',
            cauHoi: 'Câu bịa không nguyên văn',
            trich: 'câu trích không tồn tại trong luật',
            nguon: 'bieu:85437050#1',
          },
        ],
      };
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        model: body.model,
        choices: [{ message: { content: JSON.stringify(reply) } }],
      }));
    });
  });

  await new Promise((resolve) => srv.listen(0, '127.0.0.1', resolve));
  const { port } = srv.address();
  const mockUrl = `http://127.0.0.1:${port}/v1`;
  try {
    const outFile = path.join(TAM, 'tach-out.jsonl');
    const res = await tachDanhSachNut(['bieu:85437050', 'bieu:85437090'], {
      luat: LUAT,
      hoSo: KHO_CHUAN,
      L,
      url: mockUrl,
      model: 'mock-gpt-test',
      apiKey: 'test-token',
      out: outFile,
    });
    kiem('tach-dieu-kien: gọi mock OpenAI server, bỏ qua Loại khác, lọc bỏ trich không nguyên văn, ghi JSONL hợp lệ',
      res.banGhi.length === 2
      && res.loi.length === 1
      && res.banGhi.every((x) => kiemBanGhi(x).length === 0 && x.id.startsWith('hs:bieu:85437050:81'))
      && fs.existsSync(outFile),
      res);

    // Thử injectable fetchImpl cho SO dùng lại id NGUONG M-74
    const resSo = await tachDieuKienNut('bieu:85011022', L, {
      url: 'https://mock.local/v1',
      model: 'mock-model-b',
      nguongSanCo: [ng5W],
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                dieuKien: [{
                  ve: 1, phu: false, kieu: 'SO', nguong: 'hs:bieu:85011022:7401', mo: 'NGUONG',
                  cauHoi: 'Công suất không quá 5 W?', trich: 'công suất không quá 5 W', nguon: 'bieu:85011022#1',
                }],
              }),
            },
          }],
        }),
      }),
    });
    kiem('tach-dieu-kien: fetchImpl tái sử dụng id NGUONG M-74 hợp lệ', resSo.banGhi.length === 1 && resSo.banGhi[0].nguong === 'hs:bieu:85011022:7401' && !resSo.loi.length, resSo);

    // Thiếu URL báo lỗi rõ
    let thieuUrl = false;
    try { await goiOpenAICompatible({ url: '', model: 'm', messages: [] }); } catch { thieuUrl = true; }
    kiem('tach-dieu-kien: thiếu URL cổng báo lỗi rõ ràng', thieuUrl);

    // Chuẩn hoá từ chối nguồn tiền lệ tb:
    const rTb = chuanHoaDieuKien([{ ve: 1, phu: false, kieu: 'CO_KHONG', mo: 'NGHIA_THUONG', cauHoi: 'Hỏi?', trich: 'x', nguon: 'tb:1-2023:85437050#1' }], 'bieu:85437050', L);
    kiem('tach-dieu-kien: chuanHoaDieuKien từ chối nguồn tiền lệ tb:', rTb.banGhi.length === 0 && rTb.loi.some((e) => /tiền lệ/.test(e)));
  } finally {
    srv.close();
  }
}

// ---------- 7. Kiểm so-phieu-dieu-kien.mjs ----------
{
  const p1 = [
    dk('bieu:85437050', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Có phải bộ khuếch đại vi sóng không?', 'Bộ khuếch đại vi sóng', 'bieu:85437050#1'),
    dk('bieu:85437050', 2, 2, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải máy ghi dữ liệu chuyến bay không?', 'máy ghi dữ liệu chuyến bay kỹ thuật số', 'bieu:85437050#1'),
  ];
  const p2Khop = [
    dk('bieu:85437050', 9, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Bộ khuếch đại vi sóng?', 'Bộ khuếch đại vi sóng', 'bieu:85437050#1'),
    dk('bieu:85437050', 8, 2, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Máy ghi dữ liệu chuyến bay kỹ thuật số?', 'máy ghi dữ liệu chuyến bay', 'bieu:85437050#1'),
  ];
  const kqKhop = soPhieuDieuKien(p1, p2Khop);
  kiem('so-phieu-dieu-kien: hai phiếu đồng thuận ⇒ KHOP 100%, giữ trich dài hơn & id 81NN',
    kqKhop.thongKe.khop === 2 && kqKhop.thongKe.lechPhieu === 0 && kqKhop.ketQua.every((r) => r.trangThai === 'KHOP' && /^hs:bieu:85437050:810[12]$/.test(r.id) && kiemBanGhi(r).length === 0),
    kqKhop);

  const p2Lech = [
    { ...p2Khop[0], phu: true }, // lệch phu
    // thiếu điều kiện 2 -> chỉ có ở phiếu 1, thêm điều kiện 3 chỉ có ở phiếu 2
    dk('bieu:85437050', 3, 3, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Đầu đọc điện tử?', 'đầu đọc điện tử di động', 'bieu:85437050#1'),
  ];
  const kqLech = soPhieuDieuKien(p1, p2Lech);
  kiem('so-phieu-dieu-kien: lệch phu + lệch một bên ⇒ LECH_PHIEU với lý do rõ',
    kqLech.thongKe.khop === 0 && kqLech.thongKe.lechPhieu === 3 && kqLech.lechChiTiet.some((l) => l.lyDo.some((d) => /khác phu/.test(d))),
    kqLech);

  const f1 = path.join(TAM, 'p1.jsonl');
  const f2 = path.join(TAM, 'p2.jsonl');
  const f3 = path.join(TAM, 'p3.jsonl');
  fs.writeFileSync(f1, `${p1.map((x) => JSON.stringify(x)).join('\n')}\n`);
  fs.writeFileSync(f2, `${p2Khop.map((x) => JSON.stringify(x)).join('\n')}\n`);
  fs.writeFileSync(f3, `${p2Lech.map((x) => JSON.stringify(x)).join('\n')}\n`);
  const spKhop = spawnSync(process.execPath, [path.join(GOC, 'scripts/ho-so-ma/so-phieu-dieu-kien.mjs'), '--phieu-1', f1, '--phieu-2', f2, '--strict'], { encoding: 'utf8' });
  const spLech = spawnSync(process.execPath, [path.join(GOC, 'scripts/ho-so-ma/so-phieu-dieu-kien.mjs'), '--phieu-1', f1, '--phieu-2', f3, '--strict'], { encoding: 'utf8' });
  kiem('CLI so-phieu-dieu-kien --strict thoát 0 khi KHOP, thoát 1 khi LECH_PHIEU', spKhop.status === 0 && spLech.status === 1, { spKhop: spKhop.status, spLech: spLech.status });
}

fs.rmSync(TAM, { recursive: true, force: true });
console.log(`\ntest-dieu-kien: ${passed}/${passed + failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
