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
  danhGiaCongThuc,
  doBangAnhEm,
  chungMinhPhuKin,
  chiaVeDieuKien,
  haiNutRoiNhau,
} from './ho-so-ma/bang-anh-em.mjs';
import { chayCong, napLuatCong, parseCongArg, vanTay, chuanSo } from './ho-so-ma/cong.mjs';
import {
  tachDieuKienNut,
  tachDanhSachNut,
  chuanHoaDieuKien,
  goiOpenAICompatible,
  rutJsonDieuKien,
  dungLoiHoiGoiNhom,
  rutJsonGoiNhom,
  chuanHoaGoiNhom,
  tachGoiNhom,
} from './ho-so-ma/tach-dieu-kien.mjs';
import { soPhieuDieuKien } from './ho-so-ma/so-phieu-dieu-kien.mjs';
import {
  chuanNhom4,
  docBangCanhTranhMd,
  dungGoiNhom,
} from './ho-so-ma/goi-nhom.mjs';
import {
  chamDiemNhom,
  chamSoDiem,
  layHangDoi,
} from './ho-so-ma/so-diem.mjs';

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
  || ['chuong:02', 'chuong:39', 'chuong:42', 'chuong:85'].includes(id)
  || id === 'chuong:39:cg:1'
  || id === 'bieu:02' || id === 'bieu:42' || id === 'bieu:85'
  || /^bieu:0201/.test(id)
  || id === 'bieu:4202' || /^bieu:42022/.test(id)
  || id === 'bieu:8501' || id === 'bieu:850110' || id === 'bieu:850110:td1' || /^bieu:8501102/.test(id)
  || /^bieu:854370/.test(id)
  || id === 'bieu:8543'
  || id === 'bieu:8479'
  || /^nhom:8479:ct:[1-7]$/.test(id)
  || /^nhom:(0201|8501):/.test(id)
  || /^pn:4202/.test(id)
  || /^chuong:(02|42):(kq|cg):/.test(id)
);

const CHON_VANG_ID = (id) => (
  id === 'gir:3:b'
  || ['phan:I', 'phan:VIII', 'phan:XVI'].includes(id)
  || /^chuong:(02|39|42|84|85)\b/.test(id)
  || id === 'bieu:02' || id === 'bieu:42' || id === 'bieu:85'
  || /^bieu:0201/.test(id)
  || id === 'bieu:0207' || /^bieu:02074/.test(id)
  || /^bieu:4202/.test(id)
  || /^bieu:8501/.test(id)
  || id === 'bieu:8543' || /^bieu:854330/.test(id) || /^bieu:854370/.test(id)
  || id === 'bieu:8479'
  || /^nhom:(0201|4202|8479|8501):/.test(id)
  || /^pn:4202/.test(id)
  || /^sen:(4202|8501)/.test(id)
);

const docDong = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()) : []);
function taoKhoLuatTam(dir, chonFn) {
  fs.mkdirSync(path.join(dir, 'cau'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'nghia-canh'), { recursive: true });
  const daChon = new Set();
  for (const kho of ['phan', 'chuong', 'bieu', 'nhom', 'phan-nhom', 'gir', 'sen']) {
    const lines = docDong(path.join(LUAT_THAT, `${kho}.jsonl`)).filter((l) => {
      const o = JSON.parse(l);
      if (chonFn(o.id)) { daChon.add(o.id); return true; }
      return false;
    });
    fs.writeFileSync(path.join(dir, `${kho}.jsonl`), `${lines.join('\n')}${lines.length ? '\n' : ''}`);
    const cauPath = path.join(LUAT_THAT, 'cau', `${kho}.jsonl`);
    const cauLines = fs.existsSync(cauPath)
      ? docDong(cauPath).filter((l) => daChon.has(JSON.parse(l).id.split('#')[0]))
      : [];
    fs.writeFileSync(path.join(dir, 'cau', `${kho}.jsonl`), `${cauLines.join('\n')}${cauLines.length ? '\n' : ''}`);
  }
  fs.copyFileSync(path.join(LUAT_THAT, 'phan-chuong-nhom.json'), path.join(dir, 'phan-chuong-nhom.json'));
}
taoKhoLuatTam(LUAT, CHON_ID);
const LUAT_VANG = path.join(TAM, 'luat-vang');
taoKhoLuatTam(LUAT_VANG, CHON_VANG_ID);

const L = napLuatCong(LUAT);
const L_VANG = napLuatCong(LUAT_VANG);
const bieuMeta = napBieuMeta(LUAT);
const NGUONG_8501 = docDong(path.join(GOC, 'data/ho-so-ma/nguong/85.jsonl'))
  .map((l) => JSON.parse(l))
  .filter((x) => /^bieu:8501/.test(x.nut));
const NGUONG_4202 = docDong(path.join(GOC, 'data/ho-so-ma/nguong/42.jsonl'))
  .map((l) => JSON.parse(l))
  .filter((x) => /^bieu:4202/.test(x.nut));
const dkWith = (luatObj, nut, stt, ve, phu, kieu, mo, cauHoi, trich, nguon, extra = {}) => {
  const chu = luatObj.chuCau(nguon);
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
const dk = (nut, stt, ve, phu, kieu, mo, cauHoi, trich, nguon, extra = {}) => (
  dkWith(L, nut, stt, ve, phu, kieu, mo, cauHoi, trich, nguon, extra)
);
const dkVang = (nut, stt, ve, phu, kieu, mo, cauHoi, trich, nguon, extra = {}) => (
  dkWith(L_VANG, nut, stt, ve, phu, kieu, mo, cauHoi, trich, nguon, extra)
);

// ---------- 2. Kiểm khuôn (khuon.mjs) ----------
{
  const recOk = dk('bieu:85437050', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Có phải bộ khuếch đại vi sóng không?', 'Bộ khuếch đại vi sóng', 'bieu:85437050#1');
  const recSo = dk('bieu:85011022', 1, 1, false, 'SO', 'NGUONG', 'Công suất không quá 5 W?', 'công suất không quá 5 W', 'bieu:85011022#1', { nguong: 'hs:bieu:85011022:7401' });
  const recGt = dk('bieu:420221', 1, 1, false, 'GIA_TRI', 'MO_TA_HUONG_DAN', 'Chất liệu mặt ngoài là gì?', 'da thuộc hoặc da thuộc tổng hợp', 'bieu:420221#1', { truc: 'chất liệu mặt ngoài', tap: ['da thuộc', 'da thuộc tổng hợp'], moNguon: 'pn:420211:ct:1#1' });
  const recVe0 = dk('bieu:4202', 6, 0, true, 'CO_KHONG', 'NGHIA_THUONG', 'Có phải túi plastic dùng một lần không?', 'Túi làm bằng các tấm plastic, đã hoặc chưa in, có tay cầm, không được thiết kế để sử dụng lâu dài', 'chuong:42:cg:3:A:a#1');
  const recMnArr = dk('bieu:020120', 2, 1, false, 'CO_KHONG', 'DINH_NGHIA_LUAT', 'Thịt có xương không?', 'có xương', 'bieu:020120#1', { moNguon: ['chuong:02:kq:34#1', 'chuong:02:kq:34#2'] });
  const gcOk = { id: 'hs:bieu:854370:8101', nut: 'bieu:854370', loai: 'GIAI_CHONG', cap: ['bieu:85437030', 'bieu:85437050'], cach: 'CHU_GIAI', trich: 'Máy, thiết bị điện có chức năng phiên dịch hoặc từ điển', nguon: 'bieu:85437030#1' };
  const ctOk = { id: 'hs:bieu:8543:8101', nut: 'bieu:8543', loai: 'CANH_TRANH', nhomCanhTranh: ['bieu:8479', 'bieu:8543'], phepThu: ['nhom:8479:ct:5#1', 'nhom:8479:ct:6#1', 'nhom:8479:ct:7#1'], trich: 'Không thể phân loại trong bất kỳ một nhóm cụ thể nào khác của chương này', nguon: 'nhom:8479:ct:4#1' };

  kiem('khuon: DIEU_KIEN CO_KHONG / SO / GIA_TRI / ve=0 / moNguon[] hợp lệ', !kiemBanGhi(recOk).length && !kiemBanGhi(recSo).length && !kiemBanGhi(recGt).length && !kiemBanGhi(recVe0).length && !kiemBanGhi(recMnArr).length);
  kiem('khuon: GIAI_CHONG & CANH_TRANH hợp lệ', !kiemBanGhi(gcOk).length && !kiemBanGhi(ctOk).length);

  kiem('khuon: từ chối id không phải 81NN', kiemBanGhi({ ...recOk, id: 'hs:bieu:85437050:7401' }).some((l) => /81NN/.test(l)));
  kiem('khuon: từ chối ve < 0', kiemBanGhi({ ...recOk, ve: -1 }).some((l) => /ve phải là số nguyên >= 0/.test(l)));
  kiem('khuon: từ chối trường lạ trong DIEU_KIEN', kiemBanGhi({ ...recOk, la: 1 }).some((l) => /trường lạ "la"/.test(l)));
  kiem('khuon: từ chối kieu SO thiếu nguong, mang tap hoặc mang truc', kiemBanGhi({ ...recOk, kieu: 'SO' }).some((l) => /kieu SO phải có nguong/.test(l)) && kiemBanGhi({ ...recSo, tap: ['x'] }).some((l) => /kieu SO không mang tap/.test(l)) && kiemBanGhi({ ...recSo, truc: 'công suất' }).some((l) => /kieu SO không mang truc/.test(l)));
  kiem('khuon: từ chối kieu SO nhúng nguong object (phải trỏ id M-74)', kiemBanGhi({ ...recOk, kieu: 'SO', nguong: { tu: 0, den: 5 } }).some((l) => /id bản ghi NGUONG/.test(l)));
  kiem('khuon: từ chối kieu GIA_TRI thiếu truc hoặc thiếu tap/rỗng', kiemBanGhi({ ...recOk, kieu: 'GIA_TRI' }).some((l) => /tap/.test(l)) && kiemBanGhi({ ...recGt, truc: undefined }).some((l) => /phải có truc/.test(l)) && kiemBanGhi({ ...recGt, tap: [] }).some((l) => /tap/.test(l)));
  kiem('khuon: từ chối CO_KHONG mang nguong/tap/truc/daTri và SO mang daTri', kiemBanGhi({ ...recOk, nguong: 'hs:bieu:1:7401' }).some((l) => /không mang nguong/.test(l)) && kiemBanGhi({ ...recOk, truc: 'x' }).some((l) => /không mang truc/.test(l)) && kiemBanGhi({ ...recOk, daTri: true }).some((l) => /không mang daTri/.test(l)) && kiemBanGhi({ ...recSo, daTri: true }).some((l) => /không mang daTri/.test(l)));
  kiem('khuon: GIA_TRI chấp nhận daTri boolean và từ chối daTri không phải boolean',
    !kiemBanGhi({ ...recGt, daTri: true }).length
    && !kiemBanGhi({ ...recGt, daTri: false }).length
    && kiemBanGhi({ ...recGt, daTri: 'co' }).some((l) => /daTri phải là boolean/.test(l)));
  kiem('khuon: từ chối DINH_NGHIA_LUAT/MO_TA_HUONG_DAN thiếu moNguon hoặc tb:, từ chối NGHIA_THUONG/NGUONG mang moNguon',
    kiemBanGhi({ ...recGt, moNguon: undefined }).some((l) => /phải có moNguon/.test(l))
    && kiemBanGhi({ ...recGt, mo: 'DINH_NGHIA_LUAT', moNguon: 'tb:1-2023:4202#1' }).some((l) => /moNguon/.test(l))
    && kiemBanGhi({ ...recOk, moNguon: 'bieu:85437050#1' }).some((l) => /không mang moNguon/.test(l))
    && kiemBanGhi({ ...recSo, moNguon: 'bieu:85011022#1' }).some((l) => /không mang moNguon/.test(l)));
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
  dk('bieu:854370', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải máy và thiết bị khác (không thuộc 8543.10–.40, không phải bộ phận)?', 'Máy và thiết bị khác', 'bieu:854370#1', { moNguon: 'bieu:854370#1' }),
  dk('bieu:85437010', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải máy cung cấp năng lượng cho hàng rào điện không?', 'Máy cung cấp năng lượng cho hàng rào điện', 'bieu:85437010#1', { moNguon: 'bieu:85437010#1' }),
  dk('bieu:8543702', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải thiết bị điều khiển từ xa không?', 'Thiết bị điều khiển từ xa', 'bieu:8543702#1', { moNguon: 'bieu:8543702#1' }),
  dk('bieu:8543702', 2, 1, true, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải thiết bị điều khiển từ xa bằng sóng radio (loại trừ)?', 'trừ thiết bị điều khiển từ xa bằng sóng radio', 'bieu:8543702#1', { moNguon: 'bieu:8543702#1' }),
  dk('bieu:85437021', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải điều khiển từ xa hồng ngoại không dây cho máy chơi trò chơi điện tử video không?', 'Thiết bị điều khiển từ xa hồng ngoại không dây dùng cho máy chơi trò chơi điện tử video', 'bieu:85437021#1', { moNguon: 'bieu:85437021#1' }),
  dk('bieu:85437021', 2, 1, true, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải bộ điều khiển trò chơi thuộc nhóm 95.04 (loại trừ)?', 'trừ bộ điều khiển trò chơi thuộc nhóm 95.04', 'bieu:85437021#1', { moNguon: 'bieu:85437021#1' }),
  dk('bieu:85437030', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có chức năng phiên dịch hoặc từ điển không?', 'Máy, thiết bị điện có chức năng phiên dịch hoặc từ điển', 'bieu:85437030#1', { moNguon: 'bieu:85437030#1' }),
  // 8543.70.40 có dấu ";" => tối thiểu 2 vế
  dk('bieu:85437040', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải máy tách bụi hoặc khử tĩnh điện chế tạo PCB/PWB/PCA không?', 'Máy tách bụi hoặc khử tĩnh điện trong quá trình chế tạo tấm mạch PCB/PWBs(1) hoặc PCAs(1)', 'bieu:85437040#1', { moNguon: 'bieu:85437040#1' }),
  dk('bieu:85437040', 2, 2, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải máy làm đóng rắn vật liệu bằng tia cực tím sản xuất PCB/PWB/PCA không?', 'máy làm đóng rắn vật liệu bằng tia cực tím dùng trong sản xuất tấm mạch PCB/PWBs(1) hoặc PCAs(1)', 'bieu:85437040#1', { moNguon: 'bieu:85437040#1' }),
  // 8543.70.50 có 3 đoạn ";" => 3 vế
  dk('bieu:85437050', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Có phải bộ khuếch đại vi sóng không?', 'Bộ khuếch đại vi sóng', 'bieu:85437050#1'),
  dk('bieu:85437050', 2, 2, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải máy ghi dữ liệu chuyến bay kỹ thuật số không?', 'máy ghi dữ liệu chuyến bay kỹ thuật số', 'bieu:85437050#1', { moNguon: 'bieu:85437050#1' }),
  dk('bieu:85437050', 3, 3, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải đầu đọc điện tử di động chạy pin đọc/tái tạo văn bản, hình ảnh, âm thanh không?', 'đầu đọc điện tử di động hoạt động bằng pin để ghi và tái tạo văn bản, hình ảnh tĩnh hoặc tệp âm thanh', 'bieu:85437050#1', { moNguon: 'bieu:85437050#1' }),
  // 8543.70.60 có 2 đoạn ";" => 2 vế
  dk('bieu:85437060', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải thiết bị xử lý tín hiệu số kết nối mạng để trộn âm thanh không?', 'Thiết bị xử lý tín hiệu kỹ thuật số có khả năng kết nối với mạng có dây hoặc không dây để trộn âm thanh', 'bieu:85437060#1', { moNguon: 'bieu:85437060#1' }),
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
  dk('bieu:8501102', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải động cơ bước không?', 'Động cơ bước', 'bieu:8501102#1', { moNguon: 'nhom:8501:ct:12#2' }),
  dk('bieu:85011021', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có dùng cho hàng hoá nhóm 84.15, 84.18, 84.50, 85.09 hoặc 85.16 không?', 'Loại dùng cho hàng hóa thuộc nhóm 84.15, 84.18, 84.50, 85.09 hoặc 85.16', 'bieu:85011021#1', { moNguon: 'bieu:85011021#1' }),
  dk('bieu:85011022', 1, 1, false, 'SO', 'NGUONG', 'Công suất không quá 5 W?', 'công suất không quá 5 W', 'bieu:85011022#1', { nguong: 'hs:bieu:85011022:7401' }),
];

// 4202.2: thử GIA_TRI trục chất liệu mặt ngoài + Loại khác + 420222 phủ kín tập GIA_TRI
const CAU_HOI_MAT_NGOAI = 'Chất liệu mặt ngoài là vật liệu nào?';
const DUNG_42022 = [
  dk('bieu:42022', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải túi xách tay (kể cả có/không quai đeo vai, tay cầm) không?', 'Túi xách tay, có hoặc không có quai đeo vai, kể cả loại không có tay cầm', 'bieu:42022#1', { moNguon: 'bieu:42022#1' }),
  dk('bieu:420221', 1, 1, false, 'GIA_TRI', 'MO_TA_HUONG_DAN', CAU_HOI_MAT_NGOAI, 'Mặt ngoài bằng da thuộc hoặc da thuộc tổng hợp', 'bieu:420221#1', { truc: 'chất liệu mặt ngoài', tap: ['da thuộc', 'da thuộc tổng hợp'], moNguon: 'pn:420211:ct:1#1' }),
  dk('bieu:420222', 1, 1, false, 'GIA_TRI', 'MO_TA_HUONG_DAN', CAU_HOI_MAT_NGOAI, 'Mặt ngoài bằng tấm plastic hoặc vật liệu dệt', 'bieu:420222#1', { truc: 'chất liệu mặt ngoài', tap: ['tấm plastic', 'vật liệu dệt'], moNguon: 'bieu:420222#1' }),
  dk('bieu:42022210', 1, 1, false, 'GIA_TRI', 'MO_TA_HUONG_DAN', CAU_HOI_MAT_NGOAI, 'Mặt ngoài bằng tấm plastic', 'bieu:42022210#1', { truc: 'chất liệu mặt ngoài', tap: ['tấm plastic'], moNguon: 'chuong:39:cg:1#2' }),
  dk('bieu:42022220', 1, 1, false, 'GIA_TRI', 'MO_TA_HUONG_DAN', CAU_HOI_MAT_NGOAI, 'Mặt ngoài bằng vật liệu dệt', 'bieu:42022220#1', { truc: 'chất liệu mặt ngoài', tap: ['vật liệu dệt'], moNguon: 'chuong:39:cg:1#3' }),
];

// 0201: nhóm KHÔNG có "Loại khác", chứng minh phủ kín bằng cặp bù phu (có xương / không xương)
const DUNG_0201 = [
  dk('bieu:0201', 1, 1, false, 'CO_KHONG', 'DINH_NGHIA_LUAT', 'Có phải thịt động vật họ trâu bò tươi hoặc ướp lạnh không?', 'Thịt của động vật họ trâu bò, tươi hoặc ướp lạnh', 'bieu:0201#1', { moNguon: 'nhom:0201:ct:1#1' }),
  dk('bieu:020110', 1, 1, false, 'CO_KHONG', 'DINH_NGHIA_LUAT', 'Có phải thịt cả con hoặc nửa con không?', 'Thịt cả con và nửa con', 'bieu:020110#1', { moNguon: 'chuong:02:kq:2#1' }),
  dk('bieu:020120', 1, 1, false, 'CO_KHONG', 'DINH_NGHIA_LUAT', 'Thịt có xương không?', 'Thịt pha có xương khác', 'bieu:020120#1', { moNguon: 'chuong:02:kq:34#1' }),
  dk('bieu:020130', 1, 1, true, 'CO_KHONG', 'DINH_NGHIA_LUAT', 'Thịt có xương không?', 'Thịt lọc không xương', 'bieu:020130#1', { moNguon: 'chuong:02:kq:34#1' }),
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

  // Regression 1: truAnhEm tri-state trên loaiKhacCoVe (85011022)
  const bang8501Map = new Map([[t8501102.cha, t8501102]]);
  const eval22ChuaRo = danhGiaCongThuc(ae22.congThuc, { 'hs:bieu:85011022:8101': true }, t8501102);
  const route22ChuaRo = doBangAnhEm('bieu:8501102', { 'hs:bieu:85011022:8101': true }, bang8501Map);
  const eval22False = danhGiaCongThuc(ae22.congThuc, { 'hs:bieu:85011022:8101': false }, t8501102);
  const route22Dung = doBangAnhEm('bieu:8501102', { 'hs:bieu:85011021:8101': false, 'hs:bieu:85011022:8101': true }, bang8501Map);
  const route21Trung = doBangAnhEm('bieu:8501102', { 'hs:bieu:85011021:8101': true, 'hs:bieu:85011022:8101': true }, bang8501Map);
  kiem('HỒI QUY 1 (truAnhEm tri-state): 85011021=undefined + 85011022=true -> undefined & RE_NHANH hỏi 85011021',
    eval22ChuaRo === undefined
    && route22ChuaRo.trangThai === 'RE_NHANH'
    && route22ChuaRo.thieuIds.includes('hs:bieu:85011021:8101')
    && eval22False === false
    && route22Dung.trangThai === 'DICH' && route22Dung.dich === 'bieu:85011022'
    && route21Trung.trangThai === 'DICH' && route21Trung.dich === 'bieu:85011021',
    { eval22ChuaRo, route22ChuaRo, eval22False, route22Dung, route21Trung });

  // Regression 2: KHONG_HOP_VA_CHA với cha phu:true & cha nhiều vế OR trên 85437029
  const t8543702 = b85_1.bang.find((b) => b.cha === 'bieu:8543702');
  const lk29 = t8543702.anhEm.find((x) => x.nut === 'bieu:85437029');
  const gan29Ok = {
    'hs:bieu:8543:8101': true,
    'hs:bieu:854370:8101': true,
    'hs:bieu:8543702:8101': true,
    'hs:bieu:8543702:8102': false,
    'hs:bieu:85437021:8101': false,
  };
  const eval29Ok = danhGiaCongThuc(lk29.congThuc, gan29Ok, t8543702);
  const eval29ViPhamPhu = danhGiaCongThuc(lk29.congThuc, { ...gan29Ok, 'hs:bieu:8543702:8102': true }, t8543702);
  const eval29ThieuCha = danhGiaCongThuc(lk29.congThuc, { 'hs:bieu:8543702:8101': true, 'hs:bieu:8543702:8102': false, 'hs:bieu:85437021:8101': false }, t8543702);
  const bangOrCha = {
    ...t8543702,
    chuoiCha: t8543702.chuoiCha.map((c) => (c.nut === 'bieu:8543702'
      ? {
        ...c,
        congThuc: {
          loai: 'HOAC_CUA_VA',
          cacVe: [
            { ve: 1, cacDieuKien: [{ id: 'hs:bieu:8543702:8101', phu: false, kieu: 'CO_KHONG' }] },
            { ve: 2, cacDieuKien: [{ id: 'hs:bieu:8543702:8102', phu: false, kieu: 'CO_KHONG' }] },
          ],
        },
      }
      : c)),
  };
  const eval29OrCha = danhGiaCongThuc(lk29.congThuc, { ...gan29Ok, 'hs:bieu:8543702:8101': false, 'hs:bieu:8543702:8102': true }, bangOrCha);
  const eval29NoBang = danhGiaCongThuc({ loai: 'KHONG_HOP_VA_CHA', phuCua: [], chuoiCha: ['hs:bieu:8543:8101'] }, {});
  const eval29NoBangFalse = danhGiaCongThuc({ loai: 'KHONG_HOP_VA_CHA', phuCua: [], chuoiCha: ['hs:bieu:8543:8101'] }, { 'hs:bieu:8543:8101': false });
  kiem('HỒI QUY 2 (KHONG_HOP_VA_CHA): xử lý đúng cha phu:true, cha nhiều vế OR, truyền undefined khi thiếu cha và fallback không có bang',
    eval29Ok === true && eval29ViPhamPhu === false && eval29ThieuCha === undefined && eval29OrCha === true && eval29NoBang === undefined && eval29NoBangFalse === false,
    { eval29Ok, eval29ViPhamPhu, eval29ThieuCha, eval29OrCha, eval29NoBang, eval29NoBangFalse });

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

  // Regression 3: Gate 10 DÒ >= 3 tầng (8543 -> 854370 -> 8543702 -> 85437021) không bỏ qua tầng giữa 854370
  const r10_3tang = chayCong({
    luat: LUAT,
    hoSo: KHO_CHUAN,
    phamVi: ['bieu:8543'],
    chiTrong: true,
    cong: [10],
    L,
    viDu: [{
      trich: 'Bỏ khoá 8543 nhưng gán 85437010=true xung đột với đích 85437021',
      ganDieuKien: { 'hs:bieu:85437010:8101': true, 'hs:bieu:85437021:8101': true },
      dich: 'bieu:85437021',
    }],
  });
  kiem('HỒI QUY 3 (cổng 10 startCha 3 tầng): vào tại 854370 và bắt lệch bieu:85437010 vs 85437021 ⇒ đỏ',
    r10_3tang.cong[10].loi.length === 1 && /85437010/.test(r10_3tang.cong[10].loi[0]),
    r10_3tang.cong[10]);

  // Regression 4: chungMinhPhuKin GIA_TRI không bỏ qua điều kiện VÀ phụ hay lệch trục câu hỏi
  const khoGtThemAnd = ghiHoSoTam({
    dkList: [
      ...DUNG_42022,
      dk('bieu:42022210', 2, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Có khoá kéo không?', 'tấm plastic', 'bieu:42022210#1'),
    ],
  });
  const r7GtAnd = chayCong({ luat: LUAT, hoSo: khoGtThemAnd, phamVi: ['bieu:420222'], chiTrong: true, cong: [7], L });
  const khoGtLechTruc = ghiHoSoTam({
    dkList: DUNG_42022.map((x) => (x.nut === 'bieu:42022210' ? { ...x, truc: 'màu sắc', cauHoi: 'Màu sắc là gì?' } : x)),
  });
  const r7GtTruc = chayCong({ luat: LUAT, hoSo: khoGtLechTruc, phamVi: ['bieu:420222'], chiTrong: true, cong: [7], L });
  const dk42And = new Map([
    ['bieu:42022210', [
      ...DUNG_42022.filter((x) => x.nut === 'bieu:42022210'),
      dk('bieu:42022210', 2, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Có khoá kéo không?', 'tấm plastic', 'bieu:42022210#1'),
    ]],
    ['bieu:42022220', DUNG_42022.filter((x) => x.nut === 'bieu:42022220')],
  ]);
  const dk42Cha = DUNG_42022.filter((x) => x.nut === 'bieu:420222');
  const directAndOk = chungMinhPhuKin(['bieu:42022210', 'bieu:42022220'], dk42And, new Map(), dk42Cha) === false;
  const directOk = chungMinhPhuKin(['bieu:42022210', 'bieu:42022220'], new Map([
    ['bieu:42022210', DUNG_42022.filter((x) => x.nut === 'bieu:42022210')],
    ['bieu:42022220', DUNG_42022.filter((x) => x.nut === 'bieu:42022220')],
  ]), new Map(), dk42Cha) === true;
  kiem('HỒI QUY 4 (cổng 7 GIA_TRI): thêm điều kiện VÀ phụ hoặc lệch trục câu hỏi ⇒ đỏ HO_PHU',
    directOk && directAndOk && r7GtAnd.cong[7].loi.some((l) => /HO_PHU/.test(l)) && r7GtTruc.cong[7].loi.some((l) => /HO_PHU/.test(l)),
    { directOk, directAndOk, and: r7GtAnd.cong[7].loi, truc: r7GtTruc.cong[7].loi });

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
            moNguon: 'bieu:85437050#1',
            cauHoi: 'Có phải máy ghi dữ liệu chuyến bay kỹ thuật số không?',
            trich: 'máy ghi dữ liệu chuyến bay kỹ thuật số',
            nguon: 'bieu:85437050#1',
          },
          {
            ve: 3,
            phu: false,
            kieu: 'CO_KHONG',
            mo: 'MO_TA_HUONG_DAN',
            moNguon: 'bieu:85437050#1',
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

    // Regression 6: rutJsonDieuKien tách được mảng JSON bọc chữ mở đầu + ```json ... ```
    const wrappedFenced = 'Đây là kết quả tách điều kiện:\n```json\n[{"ve":1,"phu":false,"kieu":"CO_KHONG","mo":"NGHIA_THUONG","cauHoi":"Có phải bộ khuếch đại vi sóng không?","trich":"Bộ khuếch đại vi sóng","nguon":"bieu:85437050#1"}]\n```\nXin cảm ơn.';
    const wrappedBare = 'Kết quả: [{"ve":1,"trich":"Bộ khuếch đại vi sóng"}] kết thúc.';
    const arrFenced = rutJsonDieuKien(wrappedFenced);
    const arrBare = rutJsonDieuKien(wrappedBare);
    kiem('HỒI QUY 6 (rutJsonDieuKien): tách mảng JSON khi có chữ dẫn trước khối ```json hoặc [...] trần',
      Array.isArray(arrFenced) && arrFenced.length === 1 && arrFenced[0].trich === 'Bộ khuếch đại vi sóng'
      && Array.isArray(arrBare) && arrBare.length === 1 && arrBare[0].ve === 1,
      { arrFenced, arrBare });
  } finally {
    srv.close();
  }
}

// ---------- 7. Kiểm so-phieu-dieu-kien.mjs ----------
{
  const p1 = [
    dk('bieu:85437050', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Có phải bộ khuếch đại vi sóng không?', 'Bộ khuếch đại vi sóng', 'bieu:85437050#1'),
    dk('bieu:85437050', 2, 2, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải máy ghi dữ liệu chuyến bay không?', 'máy ghi dữ liệu chuyến bay kỹ thuật số', 'bieu:85437050#1', { moNguon: 'bieu:85437050#1' }),
  ];
  const p2Khop = [
    dk('bieu:85437050', 9, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Bộ khuếch đại vi sóng?', 'Bộ khuếch đại vi sóng', 'bieu:85437050#1'),
    dk('bieu:85437050', 8, 2, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Máy ghi dữ liệu chuyến bay kỹ thuật số?', 'máy ghi dữ liệu chuyến bay', 'bieu:85437050#1', { moNguon: 'bieu:85437050#1' }),
  ];
  const kqKhop = soPhieuDieuKien(p1, p2Khop);
  kiem('so-phieu-dieu-kien: hai phiếu đồng thuận ⇒ KHOP 100%, giữ trich dài hơn & id 81NN',
    kqKhop.thongKe.khop === 2 && kqKhop.thongKe.lechPhieu === 0 && kqKhop.ketQua.every((r) => r.trangThai === 'KHOP' && /^hs:bieu:85437050:810[12]$/.test(r.id) && kiemBanGhi(r).length === 0),
    kqKhop);

  const p2Lech = [
    { ...p2Khop[0], phu: true }, // lệch phu
    // thiếu điều kiện 2 -> chỉ có ở phiếu 1, thêm điều kiện 3 chỉ có ở phiếu 2
    dk('bieu:85437050', 3, 3, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Đầu đọc điện tử?', 'đầu đọc điện tử di động', 'bieu:85437050#1', { moNguon: 'bieu:85437050#1' }),
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

  // Regression 5: bản ghi chuỗi con đứng trước không cướp cặp khớp nguyên văn
  const p1Order = [
    dk('bieu:85437050', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Có dùng vi sóng không?', 'vi sóng', 'bieu:85437050#1'),
    dk('bieu:85437050', 2, 1, true, 'CO_KHONG', 'NGHIA_THUONG', 'Trừ bộ khuếch đại vi sóng?', 'Bộ khuếch đại vi sóng', 'bieu:85437050#1'),
  ];
  const p2Order = [
    dk('bieu:85437050', 7, 1, true, 'CO_KHONG', 'NGHIA_THUONG', 'Trừ bộ khuếch đại vi sóng?', 'Bộ khuếch đại vi sóng', 'bieu:85437050#1'),
  ];
  const kqOrder = soPhieuDieuKien(p1Order, p2Order);
  kiem('HỒI QUY 5 (soPhieuDieuKien): chuỗi con đứng trước không cướp khớp tuyệt đối ⇒ 1 KHOP, 1 LECH_PHIEU',
    kqOrder.thongKe.tong === 2 && kqOrder.thongKe.khop === 1 && kqOrder.thongKe.lechPhieu === 1,
    kqOrder);

  // Kiểm soPhieuDieuKien bắt lệch truc và lệch moNguon
  const pTruc1 = [dk('bieu:420221', 1, 1, false, 'GIA_TRI', 'DINH_NGHIA_LUAT', 'Chất liệu mặt ngoài?', 'da thuộc hoặc da thuộc tổng hợp', 'bieu:420221#1', { truc: 'chất liệu mặt ngoài', tap: ['da thuộc'], moNguon: 'pn:420211:ct:1#1' })];
  const pTruc2 = [dk('bieu:420221', 2, 1, false, 'GIA_TRI', 'DINH_NGHIA_LUAT', 'Chất liệu mặt ngoài?', 'da thuộc hoặc da thuộc tổng hợp', 'bieu:420221#1', { truc: 'vật liệu chính', tap: ['da thuộc'], moNguon: 'chuong:39:cg:1#2' })];
  const kqTrucLech = soPhieuDieuKien(pTruc1, pTruc2);
  kiem('so-phieu-dieu-kien: bắt lệch truc và lệch moNguon ⇒ LECH_PHIEU',
    kqTrucLech.thongKe.lechPhieu === 1
    && kqTrucLech.lechChiTiet[0].lyDo.some((d) => /khác truc/.test(d))
    && kqTrucLech.lechChiTiet[0].lyDo.some((d) => /khác moNguon/.test(d)),
    kqTrucLech);

  const pDaTri1 = [dk('bieu:420221', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Hoạt chất?', 'da thuộc', 'bieu:420221#1', { truc: 'hoạt chất', tap: ['da thuộc'], daTri: true })];
  const pDaTri2 = [dk('bieu:420221', 2, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Hoạt chất?', 'da thuộc', 'bieu:420221#1', { truc: 'hoạt chất', tap: ['da thuộc'], daTri: false })];
  const kqDaTriLech = soPhieuDieuKien(pDaTri1, pDaTri2);
  kiem('so-phieu-dieu-kien: bắt lệch daTri (true vs false) ⇒ LECH_PHIEU',
    kqDaTriLech.thongKe.lechPhieu === 1 && kqDaTriLech.lechChiTiet[0].lyDo.some((d) => /khác daTri/.test(d)),
    kqDaTriLech);
}

// ---------- 8. Hồi quy Challenger R2 ----------
{
  // R2-1A: multi-level chuoiCha với nút trung gian loaiKhac: true (8543309 -> 85433091, 85433099)
  const dk854330 = [
    dkVang('bieu:8543', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Máy điện có chức năng riêng?', 'Máy và thiết bị điện, có chức năng riêng', 'bieu:8543#1'),
    dkVang('bieu:854330', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Máy dùng trong mạ điện, điện phân hoặc điện di?', 'Máy và thiết bị dùng trong mạ điện, điện phân hoặc điện di', 'bieu:854330#1'),
    dkVang('bieu:85433020', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Thiết bị xử lý ướt PCB/PWBs?', 'Thiết bị xử lý ướt bằng phương pháp nhúng trong dung dịch hóa chất hoặc điện hóa', 'bieu:85433020#1'),
    dkVang('bieu:85433091', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Máy mạ điện sản xuất mạch in?', 'Máy mạ điện và điện phân chỉ dùng hoặc chủ yếu dùng để sản xuất mạch in', 'bieu:85433091#1'),
  ];
  const kho854330 = ghiHoSoTam({ dkList: dk854330 });
  const b8543309 = dungBangAnhEm({ chuong: '85', chaIds: ['bieu:8543309'], luat: LUAT_VANG, hoSo: kho854330, L: L_VANG }).bang[0];
  const ae99 = b8543309.anhEm.find((x) => x.nut === 'bieu:85433099');
  const ganBase = { 'hs:bieu:8543:8101': true, 'hs:bieu:854330:8101': true, 'hs:bieu:85433091:8101': false };
  const evalExcl = danhGiaCongThuc(ae99.congThuc, { ...ganBase, 'hs:bieu:85433020:8101': true }, b8543309);
  const evalOk = danhGiaCongThuc(ae99.congThuc, { ...ganBase, 'hs:bieu:85433020:8101': false }, b8543309);
  kiem('HỒI QUY R2-1A (8543309): chuoiCha qua trung gian loaiKhac:true loại trừ 85433020=true -> false, false -> true',
    evalExcl === false && evalOk === true && kiemBangAnhEm(b8543309).length === 0,
    { evalExcl, evalOk, err: kiemBangAnhEm(b8543309) });

  // R2-1B: multi-level chuoiCha với nút trung gian loaiKhacCoVe: true (020745 -> 02074510, 02074590)
  const dk020745 = [
    dkVang('bieu:02074', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Của vịt, ngan?', 'Của vịt, ngan', 'bieu:02074#1'),
    dkVang('bieu:020741', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Chưa chặt mảnh, tươi hoặc ướp lạnh?', 'Chưa chặt mảnh, tươi hoặc ướp lạnh', 'bieu:020741#1'),
    dkVang('bieu:020742', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Chưa chặt mảnh, đông lạnh?', 'Chưa chặt mảnh, đông lạnh', 'bieu:020742#1'),
    dkVang('bieu:020743', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Gan béo, tươi hoặc ướp lạnh?', 'Gan béo, tươi hoặc ướp lạnh', 'bieu:020743#1'),
    dkVang('bieu:020744', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Loại khác, tươi hoặc ướp lạnh?', 'tươi hoặc ướp lạnh', 'bieu:020744#1'),
    dkVang('bieu:020745', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Đông lạnh?', 'đông lạnh', 'bieu:020745#1'),
    dkVang('bieu:02074510', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Gan béo?', 'Gan béo', 'bieu:02074510#1'),
  ];
  const kho020745 = ghiHoSoTam({ dkList: dk020745 });
  const b020745 = dungBangAnhEm({ chuong: '02', chaIds: ['bieu:020745'], luat: LUAT_VANG, hoSo: kho020745, L: L_VANG }).bang[0];
  const ae02074590 = b020745.anhEm.find((x) => x.nut === 'bieu:02074590');
  const gan020745Ok = {
    'hs:bieu:02074:8101': true,
    'hs:bieu:020745:8101': true,
    'hs:bieu:020741:8101': false,
    'hs:bieu:020742:8101': false,
    'hs:bieu:020743:8101': false,
    'hs:bieu:020744:8101': false,
    'hs:bieu:02074510:8101': false,
  };
  const eval45Ok = danhGiaCongThuc(ae02074590.congThuc, gan020745Ok, b020745);
  const eval45Excl = danhGiaCongThuc(ae02074590.congThuc, { ...gan020745Ok, 'hs:bieu:020741:8101': true }, b020745);
  const eval45Undef = danhGiaCongThuc(ae02074590.congThuc, { ...gan020745Ok, 'hs:bieu:020741:8101': undefined }, b020745);
  kiem('HỒI QUY R2-1B (020745): chuoiCha qua loaiKhacCoVe:true đánh giá đúng truAnhEm ngoài bang.anhEm',
    eval45Ok === true && eval45Excl === false && eval45Undef === undefined && kiemBangAnhEm(b020745).length === 0,
    { eval45Ok, eval45Excl, eval45Undef, err: kiemBangAnhEm(b020745) });

  // R2-2: chuanHoaDieuKien phieu[0].mo === moHinh (không bị ghi đè bởi mo)
  const rMoHinh = chuanHoaDieuKien([{
    ve: 0,
    phu: true,
    kieu: 'CO_KHONG',
    mo: 'MO_TA_HUONG_DAN',
    moNguon: 'bieu:85437050#1',
    cauHoi: 'Có phải bộ khuếch đại vi sóng không?',
    trich: 'Bộ khuếch đại vi sóng',
    nguon: 'bieu:85437050#1',
  }], 'bieu:85437050', L, { moHinh: 'gpt-4o-test' });
  kiem('HỒI QUY R2-2 (tach-dieu-kien): phieu[0].mo === moHinh, ve=0 & moNguon được giữ nguyên',
    rMoHinh.banGhi.length === 1
    && rMoHinh.banGhi[0].ve === 0
    && rMoHinh.banGhi[0].moNguon === 'bieu:85437050#1'
    && rMoHinh.banGhi[0].phieu[0].mo === 'gpt-4o-test'
    && rMoHinh.banGhi[0].phieu[0].moDieuKien === 'MO_TA_HUONG_DAN',
    rMoHinh);

  // R2-3: rutJsonDieuKien không bị [1] hoặc [ghi chú] trước JSON đánh lừa
  const prose1 = rutJsonDieuKien('Theo mục [1]:\n{"dieuKien":[{"ve":1,"trich":"x"}]}');
  const prose2 = rutJsonDieuKien('Theo [ghi chú]:\n{"dieuKien":[{"ve":1,"trich":"x"}]}');
  kiem('HỒI QUY R2-3 (rutJsonDieuKien): bỏ qua [1] và [ghi chú] trước {"dieuKien":[...]}',
    Array.isArray(prose1) && prose1.length === 1 && prose1[0].trich === 'x'
    && Array.isArray(prose2) && prose2.length === 1 && prose2[0].trich === 'x',
    { prose1, prose2 });
}

// ---------- 9. Ba bộ ca thử Bảng Vàng (#2410 / #2412 / #2413): 02.01, 85.01, 42.02 ----------
// 9A. Bảng vàng 02.01 (truc, moNguon, phủ kín 3 anh em {A, ¬A ∧ B, ¬B}, cổng 6/7/8/10)
{
  const CAU_HOI_DANG = 'Thịt có ở dạng cả con (thân thịt, có hoặc không có đầu) hoặc nửa con (thân thịt bổ dọc làm đôi) không?';
  const CAU_HOI_XUONG = 'Thịt có "có xương" theo Chú giải phân nhóm Chương 2 không?';
  const VANG_0201 = [
    dkVang('bieu:0201', 1, 1, false, 'GIA_TRI', 'DINH_NGHIA_LUAT', 'Động vật thuộc loài nào?', 'động vật họ trâu bò', 'bieu:0201#1', { truc: 'loài', tap: ['động vật họ trâu bò'], moNguon: 'nhom:0201:ct:1#1' }),
    dkVang('bieu:0201', 2, 1, false, 'GIA_TRI', 'MO_TA_HUONG_DAN', 'Sản phẩm là gì?', 'Thịt', 'bieu:0201#1', { truc: 'sản phẩm', tap: ['Thịt'], moNguon: 'chuong:02:kq:2#1' }),
    dkVang('bieu:0201', 3, 1, false, 'GIA_TRI', 'DINH_NGHIA_LUAT', 'Trạng thái bảo quản là gì?', 'tươi hoặc ướp lạnh', 'bieu:0201#1', { truc: 'trạng thái', tap: ['tươi', 'ướp lạnh'], moNguon: 'chuong:02:kq:20#1' }),
    dkVang('bieu:0201', 4, 1, true, 'CO_KHONG', 'NGHIA_THUONG', 'Có không thích hợp làm thức ăn cho người không?', 'không thích hợp làm thức ăn cho người', 'chuong:02:cg:1:a#1'),
    dkVang('bieu:020110', 1, 1, false, 'GIA_TRI', 'DINH_NGHIA_LUAT', CAU_HOI_DANG, 'Thịt cả con và nửa con', 'bieu:020110#1', { truc: 'DANG', tap: ['cả con', 'nửa con'], moNguon: 'chuong:02:kq:2#1' }),
    dkVang('bieu:020120', 1, 1, true, 'GIA_TRI', 'DINH_NGHIA_LUAT', CAU_HOI_DANG, 'Thịt pha có xương khác', 'bieu:020120#1', { truc: 'DANG', tap: ['cả con', 'nửa con'], moNguon: 'chuong:02:kq:2#1' }),
    dkVang('bieu:020120', 2, 1, false, 'CO_KHONG', 'DINH_NGHIA_LUAT', CAU_HOI_XUONG, 'có xương', 'bieu:020120#1', { moNguon: ['chuong:02:kq:34#1', 'chuong:02:kq:34#2'] }),
    dkVang('bieu:020130', 1, 1, true, 'CO_KHONG', 'DINH_NGHIA_LUAT', CAU_HOI_XUONG, 'không xương', 'bieu:020130#1', { moNguon: 'chuong:02:kq:34#1' }),
  ];
  const kho0201 = ghiHoSoTam({ dkList: VANG_0201 });
  const viDu0201 = [
    { trich: 'V02-01 cả con', ganDieuKien: { 'hs:bieu:020110:8101': true }, dich: 'bieu:02011000' },
    { trich: 'V02-03 không rõ có xương', ganDieuKien: { 'hs:bieu:020110:8101': false, 'hs:bieu:020120:8101': false }, dich: null, duKien: ['hs:bieu:020120:8102'] },
    { trich: 'V02-05 có xương', ganDieuKien: { 'hs:bieu:020110:8101': false, 'hs:bieu:020120:8101': false, 'hs:bieu:020120:8102': true, 'hs:bieu:020130:8101': true }, dich: 'bieu:02012000' },
    { trich: 'V02-06 không xương', ganDieuKien: { 'hs:bieu:020110:8101': false, 'hs:bieu:020120:8101': false, 'hs:bieu:020120:8102': false, 'hs:bieu:020130:8101': false }, dich: 'bieu:02013000' },
  ];
  const r0201 = chayCong({ luat: LUAT_VANG, hoSo: kho0201, phamVi: ['bieu:0201'], chiTrong: true, cong: [6, 7, 8, 9, 10, 11], L: L_VANG, viDu: viDu0201 });
  kiem('BẢNG VÀNG 02.01: cổng 6–11 XANH, cổng 7 phủ kín {A, ¬A ∧ B, ¬B}, cổng 8 roiNhau=2 & chuaChungMinhTach=1',
    !r0201.khuon.length
    && [6, 7, 8, 9, 10, 11].every((c) => !r0201.cong[c].loi.length)
    && r0201.cong[8].dem.roiNhau === 2
    && r0201.cong[8].dem.chuaChungMinhTach === 1
    && r0201.cong[10].thieuViDu === 0,
    { khuon: r0201.khuon, cong: r0201.cong });

  const r0201HoPhu = chayCong({
    luat: LUAT_VANG,
    hoSo: ghiHoSoTam({ dkList: VANG_0201.filter((x) => x.nut !== 'bieu:020130').concat([dkVang('bieu:020130', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Khác?', 'Thịt lọc không xương', 'bieu:020130#1')]) }),
    phamVi: ['bieu:0201'],
    chiTrong: true,
    cong: [7],
    L: L_VANG,
  });
  kiem('BẢNG VÀNG 02.01 ca ngược: thiếu ¬B ⇒ cổng 7 đỏ HO_PHU', r0201HoPhu.cong[7].loi.some((l) => /HO_PHU/.test(l)), r0201HoPhu.cong[7].loi);
}

// 9B. Bảng vàng 85.01 (truc, NGUONG.daiLuong, 850110 tautology {A, ¬A ∨ B}, 850162 khoảng con, VUNG_CHONG vs CHUA_CHUNG_MINH_TACH)
{
  const VANG_8501 = [
    dkVang('bieu:8501', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Có phải động cơ điện hoặc máy phát điện không?', 'Động cơ điện và máy phát điện', 'bieu:8501#1'),
    dkVang('bieu:850110', 1, 1, false, 'GIA_TRI', 'DINH_NGHIA_LUAT', 'Loại máy là gì?', 'Động cơ', 'bieu:850110#1', { truc: 'loại máy', tap: ['Động cơ'], moNguon: 'nhom:8501:ct:2#1' }),
    dkVang('bieu:850110', 2, 1, false, 'SO', 'NGUONG', 'Công suất không quá 37,5 W?', 'công suất không quá 37,5 W', 'bieu:850110#1', { nguong: 'hs:bieu:850110:8501' }),
    dkVang('bieu:850110:td1', 1, 1, false, 'GIA_TRI', 'MO_TA_HUONG_DAN', 'Dòng điện làm việc?', 'một chiều', 'bieu:850110:td1#1', { truc: 'dòng điện làm việc', tap: ['một chiều'], moNguon: 'nhom:8501:ct:3#2' }),
    dkVang('bieu:850110:td2', 1, 1, true, 'GIA_TRI', 'MO_TA_HUONG_DAN', 'Dòng điện làm việc là một chiều?', 'Động cơ khác', 'bieu:850110:td2#1', { truc: 'dòng điện làm việc', tap: ['một chiều'], moNguon: 'nhom:8501:ct:3#2' }),
    dkVang('bieu:850110:td2', 2, 2, false, 'GIA_TRI', 'NGHIA_THUONG', 'Có phải động cơ vạn năng một chiều/xoay chiều không?', 'động cơ vạn năng (một chiều/xoay chiều)', 'bieu:850110:td2#1', { truc: 'dòng điện làm việc', tap: ['vạn năng một chiều/xoay chiều'] }),
    dkVang('bieu:8501102', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải động cơ bước không?', 'Động cơ bước', 'bieu:8501102#1', { moNguon: 'nhom:8501:ct:12#2' }),
    dkVang('bieu:85011030', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải động cơ hướng trục không?', 'Động cơ hướng trục', 'bieu:85011030#1', { moNguon: 'nhom:8501:ct:3#2' }),
    dkVang('bieu:85011021', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có dùng cho hàng hóa nhóm 84.15, 84.18, 84.50, 85.09 hoặc 85.16 không?', 'Loại dùng cho hàng hóa thuộc nhóm 84.15, 84.18, 84.50, 85.09 hoặc 85.16', 'bieu:85011021#1', { moNguon: 'bieu:85011021#1' }),
    dkVang('bieu:85011022', 1, 1, false, 'SO', 'NGUONG', 'Công suất không quá 5 W?', 'công suất không quá 5 W', 'bieu:85011022#1', { nguong: 'hs:bieu:85011022:8501' }),
    dkVang('bieu:85011041', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có dùng cho hàng hóa nhóm 84.15..85.16 không?', 'Loại dùng cho hàng hóa thuộc nhóm 84.15, 84.18, 84.50, 85.09 hoặc 85.16', 'bieu:85011041#1', { moNguon: 'bieu:85011041#1' }),
    dkVang('bieu:8501105', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải động cơ bước không?', 'Động cơ bước', 'bieu:8501105#1', { moNguon: 'nhom:8501:ct:12#2' }),
    dkVang('bieu:85011051', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có dùng cho hàng hóa nhóm 84.15..85.16 không?', 'Loại dùng cho hàng hóa thuộc nhóm 84.15, 84.18, 84.50, 85.09 hoặc 85.16', 'bieu:85011051#1', { moNguon: 'bieu:85011051#1' }),
    dkVang('bieu:85011060', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải động cơ hướng trục không?', 'Động cơ hướng trục', 'bieu:85011060#1', { moNguon: 'nhom:8501:ct:3#2' }),
    dkVang('bieu:85011091', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có dùng cho hàng hóa nhóm 84.15..85.16 không?', 'Loại dùng cho hàng hóa thuộc nhóm 84.15, 84.18, 84.50, 85.09 hoặc 85.16', 'bieu:85011091#1', { moNguon: 'bieu:85011091#1' }),
    dkVang('bieu:850120', 1, 1, false, 'GIA_TRI', 'DINH_NGHIA_LUAT', 'Loại máy là gì?', 'Động cơ', 'bieu:850120#1', { truc: 'loại máy', tap: ['Động cơ'], moNguon: 'nhom:8501:ct:2#1' }),
    dkVang('bieu:850120', 2, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Dòng điện làm việc?', 'vạn năng một chiều/xoay chiều', 'bieu:850120#1', { truc: 'dòng điện làm việc', tap: ['vạn năng một chiều/xoay chiều'] }),
    dkVang('bieu:850120', 3, 1, false, 'SO', 'NGUONG', 'Công suất trên 37,5 W?', 'công suất trên 37,5 W', 'bieu:850120#1', { nguong: 'hs:bieu:850120:8501' }),
    dkVang('bieu:85013', 1, 1, false, 'GIA_TRI', 'DINH_NGHIA_LUAT', 'Loại máy?', 'Động cơ một chiều', 'bieu:85013#1', { truc: 'loại máy', tap: ['Động cơ'], moNguon: 'nhom:8501:ct:2#1' }),
    dkVang('bieu:85013', 2, 1, false, 'GIA_TRI', 'MO_TA_HUONG_DAN', 'Dòng điện?', 'một chiều', 'bieu:85013#1', { truc: 'dòng điện làm việc', tap: ['một chiều'], moNguon: 'nhom:8501:ct:3#2' }),
    dkVang('bieu:85013', 3, 1, true, 'SO', 'NGUONG', 'Công suất <= 37,5 W?', 'Động cơ một chiều khác', 'bieu:85013#1', { nguong: 'hs:bieu:850110:8501' }),
    dkVang('bieu:850131', 1, 1, false, 'SO', 'NGUONG', 'Công suất không quá 750 W?', 'Công suất không quá 750 W', 'bieu:850131#1', { nguong: 'hs:bieu:850131:8501' }),
    dkVang('bieu:85013130', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Dùng cho nhóm 84.15..85.16?', 'Động cơ loại dùng cho hàng hóa thuộc nhóm 84.15, 84.18, 84.50, 85.09 hoặc 85.16', 'bieu:85013130#1', { moNguon: 'bieu:85013130#1' }),
    dkVang('bieu:85013160', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Dùng cho xe Chương 87?', 'Động cơ dùng cho xe của Chương 87', 'bieu:85013160#1', { moNguon: 'bieu:85013160#1' }),
    dkVang('bieu:850140', 1, 1, false, 'GIA_TRI', 'MO_TA_HUONG_DAN', 'Dòng điện?', 'xoay chiều', 'bieu:850140#1', { truc: 'dòng điện làm việc', tap: ['xoay chiều'], moNguon: 'nhom:8501:ct:3#2' }),
    dkVang('bieu:850140', 2, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Số pha?', 'một pha', 'bieu:850140#1', { truc: 'số pha (động cơ xoay chiều)', tap: ['một pha'] }),
    dkVang('bieu:850140', 3, 1, true, 'SO', 'NGUONG', 'Công suất <= 37,5 W?', 'Động cơ xoay chiều khác', 'bieu:850140#1', { nguong: 'hs:bieu:850110:8501' }),
    dkVang('bieu:85015', 1, 1, false, 'GIA_TRI', 'MO_TA_HUONG_DAN', 'Dòng điện?', 'xoay chiều', 'bieu:85015#1', { truc: 'dòng điện làm việc', tap: ['xoay chiều'], moNguon: 'nhom:8501:ct:3#2' }),
    dkVang('bieu:85015', 2, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Số pha?', 'đa pha', 'bieu:85015#1', { truc: 'số pha (động cơ xoay chiều)', tap: ['đa pha'] }),
    dkVang('bieu:85015', 3, 1, true, 'SO', 'NGUONG', 'Công suất <= 37,5 W?', 'Động cơ xoay chiều khác', 'bieu:85015#1', { nguong: 'hs:bieu:850110:8501' }),
    dkVang('bieu:850162', 1, 1, false, 'SO', 'NGUONG', 'Công suất > 75 và <= 375 kVA?', 'Công suất trên 75 kVA nhưng không quá 375 kVA', 'bieu:850162#1', { nguong: 'hs:bieu:850162:8501' }),
    dkVang('bieu:85016210', 1, 1, false, 'SO', 'NGUONG', 'Công suất > 75 và <= 150 kVA?', 'Công suất trên 75 kVA nhưng không quá 150 kVA', 'bieu:85016210#1', { nguong: 'hs:bieu:85016210:8501' }),
    dkVang('bieu:85016220', 1, 1, false, 'SO', 'NGUONG', 'Công suất > 150 và <= 375 kVA?', 'Công suất trên 150 kVA nhưng không quá 375 kVA', 'bieu:85016220#1', { nguong: 'hs:bieu:85016220:8501' }),
    { id: 'hs:bieu:850110:8109', nut: 'bieu:850110', loai: 'GIAI_CHONG', cap: ['bieu:850110:td1', 'bieu:850110:td2'], cach: 'QUY_TAC_3', trich: 'kể cả động cơ vạn năng (một chiều/xoay chiều)', nguon: 'bieu:850110:td2#1' },
  ];
  const kho8501 = ghiHoSoTam({ dkList: VANG_8501, nguongList: NGUONG_8501 });
  const r8501_10 = chayCong({ luat: LUAT_VANG, hoSo: kho8501, phamVi: ['bieu:850110'], chiTrong: true, cong: [6, 7, 8, 10], L: L_VANG, viDu: [
    { trich: 'Động cơ bước thiếu DC5', cha: 'bieu:8501102', ganDieuKien: { 'hs:bieu:8501102:8101': true, 'hs:bieu:85011022:8101': true }, dich: null, duKien: ['hs:bieu:85011021:8101'] },
    { trich: 'Loại khác dưới 8501102', cha: 'bieu:8501102', ganDieuKien: { 'hs:bieu:8501102:8101': true, 'hs:bieu:85011021:8101': false, 'hs:bieu:85011022:8101': false }, dich: 'bieu:85011029' },
  ] });
  const r8501_62 = chayCong({ luat: LUAT_VANG, hoSo: kho8501, phamVi: ['bieu:850162'], chiTrong: true, cong: [6, 7, 8, 10], L: L_VANG, viDu: [
    { trich: 'Máy phát 100 kVA', ganDieuKien: { 'hs:bieu:85016210:8101': true, 'hs:bieu:85016220:8101': false }, dich: 'bieu:85016210' },
  ] });
  const r8501_20_40 = haiNutRoiNhau(VANG_8501.filter((x) => x.loai === 'DIEU_KIEN' && x.nut === 'bieu:850120'), VANG_8501.filter((x) => x.loai === 'DIEU_KIEN' && x.nut === 'bieu:850140'), new Map(NGUONG_8501.map((x) => [x.id, x])));
  const r8501_40_5 = haiNutRoiNhau(VANG_8501.filter((x) => x.loai === 'DIEU_KIEN' && x.nut === 'bieu:850140'), VANG_8501.filter((x) => x.loai === 'DIEU_KIEN' && x.nut === 'bieu:85015'), new Map(NGUONG_8501.map((x) => [x.id, x])));
  const r8501_10_3 = haiNutRoiNhau(VANG_8501.filter((x) => x.loai === 'DIEU_KIEN' && x.nut === 'bieu:850110'), VANG_8501.filter((x) => x.loai === 'DIEU_KIEN' && x.nut === 'bieu:85013'), new Map(NGUONG_8501.map((x) => [x.id, x])));
  const r8501_vc = chayCong({
    luat: LUAT_VANG,
    hoSo: kho8501,
    phamVi: ['bieu:850131'],
    chiTrong: true,
    cong: [8],
    L: L_VANG,
    vungChong: [{ nut: 'bieu:850131', cap: ['bieu:85013130', 'bieu:85013160'], moTa: 'Động cơ quạt làm mát xe' }],
  });
  const kho8501_ho = ghiHoSoTam({
    dkList: VANG_8501,
    nguongList: NGUONG_8501.map((n) => (n.id === 'hs:bieu:85016220:8501' ? { ...n, nguong: { ...n.nguong, den: 350 } } : n)),
  });
  const r8501_62_ho = chayCong({ luat: LUAT_VANG, hoSo: kho8501_ho, phamVi: ['bieu:850162'], chiTrong: true, cong: [7], L: L_VANG });

  kiem('BẢNG VÀNG 85.01: 850110 {A, ¬A ∨ B} + 850162 khoảng con (75,375] phủ kín cổng 7, cổng 8 chứng minh rời nhau qua truc & phu SO',
    !r8501_10.khuon.length && !r8501_62.khuon.length
    && [6, 7, 8, 10].every((c) => !r8501_10.cong[c].loi.length && !r8501_62.cong[c].loi.length)
    && r8501_10.cong[8].dem.chuaChungMinhTach >= 1
    && r8501_20_40 && r8501_40_5 && r8501_10_3
    && r8501_vc.cong[8].dem.vungChong === 1 && r8501_vc.cong[8].loi.some((l) => /VUNG_CHONG/.test(l))
    && r8501_62_ho.cong[7].loi.some((l) => /HO_PHU/.test(l)),
    { c10: r8501_10.cong, c62: r8501_62.cong, r20_40: r8501_20_40, r40_5: r8501_40_5, r10_3: r8501_10_3, vc: r8501_vc.cong[8], ho62: r8501_62_ho.cong[7] });
}

// 9C. Bảng vàng 42.02 (ve: 0 phân phối, moNguon chéo chương chuong:39:cg:1#2, truc phủ 420222, V42-13 NGOAI_PHAM_VI, 3-tầng Loại khác)
{
  const VANG_4202 = [
    dkVang('bieu:4202', 1, 1, false, 'GIA_TRI', 'MO_TA_HUONG_DAN', 'Sản phẩm nhóm 1?', 'Hòm, vali, xắc đựng đồ nữ trang, cặp tài liệu, cặp sách, túi, cặp đeo vai cho học sinh, bao kính, bao ống nhòm, hộp camera, hộp nhạc cụ, bao súng, bao súng ngắn', 'bieu:4202#1', { truc: 'loại hàng', tap: ['Hòm, vali, hộp camera'], moNguon: 'nhom:4202:ct:3#2' }),
    dkVang('bieu:4202', 2, 2, false, 'GIA_TRI', 'MO_TA_HUONG_DAN', 'Sản phẩm nhóm 2?', 'túi du lịch, túi đựng đồ ăn hoặc đồ uống có phủ lớp cách, túi đựng đồ vệ sinh cá nhân, ba lô, túi xách tay, túi đi chợ, xắc cốt, ví', 'bieu:4202#1', { truc: 'loại hàng', tap: ['túi xách tay, ví'], moNguon: 'nhom:4202:ct:4#3' }),
    dkVang('bieu:4202', 3, 2, false, 'GIA_TRI', 'DINH_NGHIA_LUAT', 'Vật liệu sản xuất?', 'da thuộc hoặc da thuộc tổng hợp, bằng tấm plastic, bằng vật liệu dệt, bằng sợi lưu hóa hoặc bằng bìa', 'bieu:4202#1', { truc: 'vật liệu', tap: ['da thuộc hoặc da thuộc tổng hợp', 'tấm plastic', 'vật liệu dệt', 'sợi lưu hóa', 'bìa'], moNguon: 'nhom:4202:ct:4#1' }),
    dkVang('bieu:4202', 4, 3, false, 'GIA_TRI', 'MO_TA_HUONG_DAN', 'Sản phẩm nhóm 2?', 'hộp đựng đồ trang sức, hộp đựng phấn, hộp đựng dao kéo', 'bieu:4202#1', { truc: 'loại hàng', tap: ['hộp đựng đồ trang sức'], moNguon: 'nhom:4202:ct:4#3' }),
    dkVang('bieu:4202', 5, 3, false, 'GIA_TRI', 'NGHIA_THUONG', 'Vật liệu phủ?', 'được phủ toàn bộ hoặc chủ yếu bằng các vật liệu trên hoặc bằng giấy', 'bieu:4202#1', { truc: 'vật liệu phủ', tap: ['da thuộc', 'giấy'] }),
    // ve: 0 loại trừ chung Chú giải 3(A)
    dkVang('bieu:4202', 6, 0, true, 'CO_KHONG', 'NGHIA_THUONG', 'Có phải túi plastic có tay cầm dùng một lần (39.23)?', 'Túi làm bằng các tấm plastic, đã hoặc chưa in, có tay cầm, không được thiết kế để sử dụng lâu dài', 'chuong:42:cg:3:A:a#1'),
    dkVang('bieu:4202', 7, 0, true, 'CO_KHONG', 'NGHIA_THUONG', 'Có phải sản phẩm bằng vật liệu tết bện (46.02)?', 'Sản phẩm bằng vật liệu tết bện', 'chuong:42:cg:3:A:b#1'),
    dkVang('bieu:42021', 1, 1, false, 'GIA_TRI', 'MO_TA_HUONG_DAN', 'Sản phẩm?', 'Hòm, vali, xắc đựng đồ nữ trang, cặp tài liệu, cặp sách, túi, cặp đeo vai cho học sinh', 'bieu:42021#1', { truc: 'loại hàng', tap: ['Hòm, vali, cặp sách'], moNguon: 'nhom:4202:ct:3#2' }),
    dkVang('bieu:420211', 1, 1, false, 'GIA_TRI', 'DINH_NGHIA_LUAT', 'Chất liệu mặt ngoài?', 'Mặt ngoài bằng da thuộc hoặc da thuộc tổng hợp', 'bieu:420211#1', { truc: 'chất liệu mặt ngoài', tap: ['da thuộc', 'da thuộc tổng hợp'], moNguon: 'pn:420211:ct:1#1' }),
    dkVang('bieu:42021110', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Loại hàng?', 'Vali hoặc túi, cặp', 'bieu:42021110#1', { truc: 'loại hàng', tap: ['Vali', 'túi, cặp'] }),
    dkVang('bieu:42021110', 2, 1, false, 'SO', 'NGUONG', 'Chiều dài <= 56 cm?', '56cm', 'bieu:42021110#1', { nguong: 'hs:bieu:42021110:7401' }),
    dkVang('bieu:420212', 1, 1, false, 'GIA_TRI', 'DINH_NGHIA_LUAT', 'Chất liệu mặt ngoài?', 'Mặt ngoài bằng plastic hoặc vật liệu dệt', 'bieu:420212#1', { truc: 'chất liệu mặt ngoài', tap: ['plastic', 'vật liệu dệt'], moNguon: 'chuong:39:cg:1#2' }),
    dkVang('bieu:4202121', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Cặp đeo vai học sinh?', 'Túi, cặp đeo vai cho học sinh', 'bieu:4202121#1'),
    dkVang('bieu:42021211', 1, 1, false, 'GIA_TRI', 'DINH_NGHIA_LUAT', 'Chất liệu mặt ngoài?', 'sợi lưu hóa', 'bieu:42021211#1', { truc: 'chất liệu mặt ngoài', tap: ['sợi lưu hóa'], moNguon: 'chuong:39:cg:1#2' }),
    dkVang('bieu:42022', 1, 1, false, 'GIA_TRI', 'MO_TA_HUONG_DAN', 'Sản phẩm?', 'Túi xách tay', 'bieu:42022#1', { truc: 'loại hàng', tap: ['Túi xách tay'], moNguon: 'bieu:42022#1' }),
    dkVang('bieu:420221', 1, 1, false, 'GIA_TRI', 'DINH_NGHIA_LUAT', 'Chất liệu mặt ngoài?', 'da thuộc hoặc da thuộc tổng hợp', 'bieu:420221#1', { truc: 'chất liệu mặt ngoài', tap: ['da thuộc', 'da thuộc tổng hợp'], moNguon: 'pn:420211:ct:1#1' }),
    dkVang('bieu:420222', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Chất liệu mặt ngoài?', 'tấm plastic hoặc vật liệu dệt', 'bieu:420222#1', { truc: 'chất liệu mặt ngoài', tap: ['tấm plastic', 'vật liệu dệt'] }),
    dkVang('bieu:42022210', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Chất liệu mặt ngoài?', 'tấm plastic', 'bieu:42022210#1', { truc: 'chất liệu mặt ngoài', tap: ['tấm plastic'] }),
    dkVang('bieu:42022220', 1, 1, false, 'GIA_TRI', 'DINH_NGHIA_LUAT', 'Chất liệu mặt ngoài?', 'vật liệu dệt', 'bieu:42022220#1', { truc: 'chất liệu mặt ngoài', tap: ['vật liệu dệt'], moNguon: 'chuong:39:cg:1#3' }),
    dkVang('bieu:42023', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Thường mang theo trong túi/túi xách tay?', 'Các đồ vật thuộc loại thường mang theo trong túi hoặc trong túi xách tay', 'bieu:42023#1', { moNguon: 'pn:420231:ct:2#1' }),
    { id: 'hs:bieu:4202:8109', nut: 'bieu:4202', loai: 'GIAI_CHONG', cap: ['bieu:42022', 'bieu:42023'], cach: 'CHU_GIAI', trich: 'Các phân nhóm này bao gồm những mặt hàng thuộc loại thường được đóng trong bao hoặc trong túi', nguon: 'pn:420231:ct:2#1' },
  ];
  const kho4202 = ghiHoSoTam({ dkList: VANG_4202, nguongList: NGUONG_4202 });
  const bang4202Map = new Map(
    dungBangAnhEm({ chuong: '42', chaIds: ['bieu:4202', 'bieu:42022', 'bieu:420222', 'bieu:42029', 'bieu:420299'], luat: LUAT_VANG, hoSo: kho4202, L: L_VANG }).bang.map((b) => [b.cha, b]),
  );
  const b4202 = bang4202Map.get('bieu:4202');
  const b4202_selfStep = b4202.chuoiCha.find((c) => c.nut === 'bieu:4202');
  const ve0Distributed = b4202_selfStep.congThuc.cacVe.length === 3
    && b4202_selfStep.congThuc.cacVe.every((v) => v.ve >= 1
      && v.cacDieuKien.some((x) => x.id === 'hs:bieu:4202:8106')
      && v.cacDieuKien.some((x) => x.id === 'hs:bieu:4202:8107'));

  // Nút chỉ có ve: 0 -> gom thành 1 vế
  const onlyVe0Ct = chiaVeDieuKien([VANG_4202.find((x) => x.id === 'hs:bieu:4202:8106')]);
  const onlyVe0Ok = onlyVe0Ct.cacVe.length === 1 && onlyVe0Ct.cacVe[0].ve === 1 && onlyVe0Ct.cacVe[0].cacDieuKien[0].id === 'hs:bieu:4202:8106';

  const b420299 = bang4202Map.get('bieu:420299');
  const lk42029990 = b420299.anhEm.find((x) => x.nut === 'bieu:42029990');
  const askIds99 = new Set(lk42029990.cauHoiToiThieu.map((c) => c.id));
  const hoi3TangOk = ['hs:bieu:4202:8106', 'hs:bieu:4202:8107', 'hs:bieu:42021:8101', 'hs:bieu:42022:8101', 'hs:bieu:42023:8101'].every((id) => askIds99.has(id));

  const viDu4202 = [
    { trich: 'V42-01 túi xách da thuộc', cha: 'bieu:42022', ganDieuKien: { 'hs:bieu:420221:8101': true, 'hs:bieu:420222:8101': false }, dich: 'bieu:42022100' },
    { trich: 'V42-11 cặp học sinh thiếu mặt ngoài', cha: 'bieu:4202121', ganDieuKien: {}, dich: null, duKien: ['hs:bieu:42021211:8101'] },
    { trich: 'V42-13 túi plastic dùng 1 lần (39.23)', cha: 'bieu:4202', ganDieuKien: { 'hs:bieu:4202:8106': true, 'hs:bieu:42022:8101': true }, ngoaiPhamVi: true },
  ];
  const r4202 = chayCong({ luat: LUAT_VANG, hoSo: kho4202, phamVi: ['bieu:42022', 'bieu:4202121', 'bieu:42021110'], chiTrong: true, cong: [6, 7, 8, 9, 10, 11], L: L_VANG, viDu: [viDu4202[0], viDu4202[1]] });
  const r4202Root = chayCong({ luat: LUAT_VANG, hoSo: kho4202, phamVi: ['bieu:4202'], chiTrong: true, cong: [8, 9, 10], L: L_VANG, viDu: [viDu4202[2]] });

  // Negative Gate 6 tests: (a) thiếu moNguon, (b) ve:0 phu:false thiếu ve:2 trên nút có ";"
  const khoThieuMn = ghiHoSoTam({
    dkList: VANG_4202.map((x) => (x.id === 'hs:bieu:42021211:8101' ? { ...x, moNguon: undefined } : x)),
    nguongList: NGUONG_4202,
  });
  const r6ThieuMn = chayCong({ luat: LUAT_VANG, hoSo: khoThieuMn, phamVi: ['bieu:42021211'], chiTrong: true, cong: [6], L: L_VANG });
  const khoVe0ThieuVe2 = ghiHoSoTam({
    dkList: DUNG_8543.map((x) => (x.nut === 'bieu:85437040' ? (x.ve === 2 ? { ...x, ve: 0, phu: false } : x) : x)),
  });
  const r6Ve0ThieuVe2 = chayCong({ luat: LUAT, hoSo: khoVe0ThieuVe2, phamVi: ['bieu:854370'], chiTrong: true, cong: [6], L });

  kiem('BẢNG VÀNG 42.02: ve:0 phân phối 3 vế + gom 1 vế, chuong:39 moNguon chéo chương, 420222 PHỦ, 3-tầng HỎI, V42-13 NGOAI_PHAM_VI',
    ve0Distributed
    && onlyVe0Ok
    && hoi3TangOk
    && !r4202.khuon.length
    && [6, 7, 8, 9, 10, 11].every((c) => !r4202.cong[c].loi.length)
    && [8, 9, 10].every((c) => !r4202Root.cong[c].loi.length)
    && r4202Root.cong[8].dem.roiNhau >= 1
    && r4202Root.cong[8].dem.giaiChong === 1
    && r6ThieuMn.khuon.some((l) => /moNguon/.test(l))
    && r6Ve0ThieuVe2.cong[6].loi.some((l) => /2 đoạn tách bởi ";"/.test(l)),
    { ve0Distributed, onlyVe0Ok, hoi3TangOk, r4202: r4202.cong, r4202Root: r4202Root.cong, r6Mn: r6ThieuMn.khuon, r6Ve0: r6Ve0ThieuVe2.cong[6] });
}

// ---------- 10. Kiểm thử ADR-0008: daTri cổng 8, goi-nhom.mjs, tachGoiNhom, so-diem.mjs & bảng vàng trên origin/main ----------
// 10A. Cổng 8 CHỒNG với daTri:false (rời nhau) vs daTri:true không GIAI_CHONG (CHUA_CHUNG_MINH_TACH) vs có GIAI_CHONG (giaiChong)
{
  const dkDonTriA = [dk('bieu:42022210', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Vật liệu?', 'tấm plastic', 'bieu:42022210#1', { truc: 'chất liệu mặt ngoài', tap: ['tấm plastic'], daTri: false })];
  const dkDonTriB = [dk('bieu:42022220', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Vật liệu?', 'vật liệu dệt', 'bieu:42022220#1', { truc: 'chất liệu mặt ngoài', tap: ['vật liệu dệt'], daTri: false })];
  const dkDaTriA = [{ ...dkDonTriA[0], daTri: true }];
  const dkDaTriB = [{ ...dkDonTriB[0], daTri: true }];

  const roiDonTri = haiNutRoiNhau(dkDonTriA, dkDonTriB);
  const roiDaTri = haiNutRoiNhau(dkDaTriA, dkDaTriB);
  const khoDaTriNoGc = ghiHoSoTam({ dkList: [...DUNG_42022.filter((x) => !['bieu:42022210', 'bieu:42022220'].includes(x.nut)), ...dkDaTriA, ...dkDaTriB] });
  const r8DaTriNoGc = chayCong({ luat: LUAT, hoSo: khoDaTriNoGc, phamVi: ['bieu:420222'], chiTrong: true, cong: [8], L });

  const gcDaTri = { id: 'hs:bieu:420222:8151', nut: 'bieu:420222', loai: 'GIAI_CHONG', cap: ['bieu:42022210', 'bieu:42022220'], cach: 'QUY_TAC_3', trich: 'Mặt ngoài bằng tấm plastic hoặc vật liệu dệt', nguon: 'bieu:420222#1' };
  const khoDaTriWithGc = ghiHoSoTam({ dkList: [...DUNG_42022.filter((x) => !['bieu:42022210', 'bieu:42022220'].includes(x.nut)), ...dkDaTriA, ...dkDaTriB, gcDaTri] });
  const r8DaTriWithGc = chayCong({ luat: LUAT, hoSo: khoDaTriWithGc, phamVi: ['bieu:420222'], chiTrong: true, cong: [8], L });

  kiem('Cổng 8 (daTri): daTri:false rời nhau, daTri:true không GIAI_CHONG -> CHUA_CHUNG_MINH_TACH, có GIAI_CHONG -> giaiChong=1',
    roiDonTri === true
    && roiDaTri === false
    && r8DaTriNoGc.cong[8].dem.roiNhau === 0
    && r8DaTriNoGc.cong[8].dem.chuaChungMinhTach === 1
    && r8DaTriWithGc.cong[8].dem.giaiChong === 1
    && r8DaTriWithGc.cong[8].dem.chuaChungMinhTach === 0,
    { roiDonTri, roiDaTri, noGc: r8DaTriNoGc.cong[8], withGc: r8DaTriWithGc.cong[8] });
}

// 10B. goi-nhom.mjs trên kho luật thật (8543, 8501, 2308) + goiCon + M-81-canh-tranh.md fixture
{
  const L_REAL = napLuatCong(LUAT_THAT);
  const goi8543 = dungGoiNhom('85.43', { luat: LUAT_THAT, L: L_REAL, canhTranhMd: path.join(TAM, 'khong-ton-tai.md'), maxBytes: 25000 });
  const hasKhongMa = goi8543.cayBieu.some((n) => n.id === 'bieu:8543309' && n.khongMa) && goi8543.cayBieu.some((n) => n.id === 'bieu:8543702' && n.khongMa);
  const hasSuyRa = goi8543.cayBieu.some((n) => n.id === 'bieu:85431000' && n.cungDong === 'bieu:854310');
  const noTbOrWco = !goi8543.cauTrongGoi.some((c) => /^(?:tb|wco):/.test(c.id))
    && !goi8543.luatNen.sen.some((m) => /^tb:/.test(m.id))
    && !Object.keys(goi8543.luatNen).some((k) => /wco|phan_biet/i.test(k));
  const goiConOk = goi8543.goiCon.length === 6 && goi8543.goiCon.every((c) => c.chuoiCha.length === 1 && c.anhEmCungCap.length === 6);

  const goi2308 = dungGoiNhom('2308', { luat: LUAT_THAT, L: L_REAL, canhTranhMd: path.join(TAM, 'khong-ton-tai.md') });
  const goi2308Ok = goi2308.cayBieu.length === 3 && goi2308.goiCon.length === 0 && goi2308.cauTrongGoi.length > 0;

  const ctMdTam = path.join(TAM, 'M-81-canh-tranh.md');
  const ctFixture = [
    '# Fixture canh tranh',
    '## 3. CANH_TRANH từng nút',
    '### 8543 — n8 = 19',
    '```jsonl',
    JSON.stringify({ id: 'hs:bieu:8543:8101', nut: 'bieu:8543', loai: 'CANH_TRANH', cap: 4, n8: 19, canhTranh: [{ nhom: '85.18', kieu: 'LOAI_TRU', trich: 'Chương 85', nguon: 'nhom:8543:ct:1' }], phepThu: [{ trich: 'Không thể phân loại', nguon: 'nhom:8479:ct:4', chung: true }] }),
    '```',
    '## 4. canhTranhChung',
    '```jsonl',
    JSON.stringify({ pham: 'phan:XVI', loai: 'CANH_TRANH_CHUNG', canhTranh: [{ nhom: 'Chương 90', kieu: 'LOAI_TRU', trich: 'Chương 90', nguon: 'phan:XVI:cg:1:m' }] }),
    '```',
  ].join('\n');
  fs.writeFileSync(ctMdTam, ctFixture, 'utf8');
  const parsedCt = docBangCanhTranhMd(ctMdTam);
  const goi8543Ct = dungGoiNhom('8543', { luat: LUAT_THAT, L: L_REAL, canhTranhMd: ctMdTam });

  kiem('goi-nhom.mjs: cây đủ khongMa & cungDong, loại tb:/WCO/PHAN_BIET, goiCon chia 6 phân nhóm, 2308 con duy nhất & M-81-canh-tranh.md',
    chuanNhom4('bieu:85.43') === '8543'
    && goi8543.khuon === 'goi-nhom@1'
    && goi8543.canhTranh === null
    && hasKhongMa
    && hasSuyRa
    && noTbOrWco
    && goiConOk
    && goi2308Ok
    && parsedCt.coTep && parsedCt.byNut.has('bieu:8543') && parsedCt.canhTranhChung.has('phan:XVI')
    && goi8543Ct.canhTranh?.muc?.length === 1 && goi8543Ct.canhTranh?.canhTranhChung?.length === 1,
    { cay: goi8543.cayBieu.length, goiCon: goi8543.goiCon.length, goi2308: goi2308.cayBieu.length });

  // 10C. tach-dieu-kien.mjs gói nhóm 4 số (dungLoiHoiGoiNhom, rutJsonGoiNhom, tachGoiNhom với mock HTTP + goiCon)
  const msgsGoi = dungLoiHoiGoiNhom(goi8543Ct);
  const promptOk = msgsGoi.length === 2
    && /CÂY BIỂU THUẾ/.test(msgsGoi[1].content)
    && /NHÓM CẠNH TRANH SẴN CÓ/.test(msgsGoi[1].content)
    && /\[bieu:8543#1\]/.test(msgsGoi[1].content)
    && !/\btb:/.test(msgsGoi[1].content);
  const parsedObj = rutJsonGoiNhom('Theo [1]:\n{"dieuKien":[{"nut":"bieu:8543","ve":1,"phu":false,"kieu":"CO_KHONG","mo":"NGHIA_THUONG","cauHoi":"H?","trich":"Máy","nguon":"bieu:8543#1"}],"giaiChong":[],"canhTranh":[]}');

  const srvGoi = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (d) => { raw += d; });
    req.on('end', () => {
      const payload = JSON.parse(raw);
      const userPrompt = payload.messages?.[1]?.content || '';
      const isChunk70 = /PHÂN ĐOẠN PHÂN NHÓM:\s*bieu:854370/.test(userPrompt);
      const reply = isChunk70
        ? {
          dieuKien: [
            { nut: 'bieu:854370', ve: 1, phu: false, kieu: 'CO_KHONG', mo: 'NGHIA_THUONG', cauHoi: 'Máy và thiết bị khác?', trich: 'Máy và thiết bị khác', nguon: 'bieu:854370#1' },
            { nut: 'bieu:85437040', ve: 1, phu: false, kieu: 'GIA_TRI', truc: 'loại tấm mạch', daTri: true, tap: ['PCB/PWBs(1)', 'PCAs(1)'], mo: 'NGHIA_THUONG', cauHoi: 'Dùng cho loại tấm mạch nào?', trich: 'tấm mạch PCB/PWBs(1) hoặc PCAs(1)', nguon: 'bieu:85437040#1' },
          ],
          giaiChong: [
            { nut: 'bieu:854370', cap: ['bieu:85437030', 'bieu:85437050'], cach: 'CHU_GIAI', trich: 'Máy, thiết bị điện có chức năng phiên dịch hoặc từ điển', nguon: 'bieu:85437030#1' },
          ],
          canhTranh: [],
        }
        : {
          dieuKien: [
            { nut: 'bieu:8543', ve: 1, phu: false, kieu: 'CO_KHONG', mo: 'NGHIA_THUONG', cauHoi: 'Máy điện có chức năng riêng?', trich: 'Máy và thiết bị điện, có chức năng riêng', nguon: 'bieu:8543#1' },
          ],
          giaiChong: [],
          canhTranh: [
            { nut: 'bieu:8543', nhomCanhTranh: ['bieu:8479', 'bieu:8543'], phepThu: ['nhom:8479:ct:5#1'], trich: 'Không thể phân loại trong bất kỳ một nhóm cụ thể nào khác của chương này', nguon: 'nhom:8479:ct:4#1' },
          ],
        };
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(reply) } }] }));
    });
  });
  await new Promise((resolve) => srvGoi.listen(0, '127.0.0.1', resolve));
  const addrGoi = srvGoi.address();
  const rGoi = await tachGoiNhom('8543', {
    luat: LUAT_THAT,
    hoSo: path.join(TAM, 'empty-hoso'),
    L: L_REAL,
    canhTranhMd: ctMdTam,
    chiaTheo6So: true,
    url: `http://127.0.0.1:${addrGoi.port}/v1`,
    model: 'adr8-mock',
  });
  const rBadNut = chuanHoaGoiNhom({
    dieuKien: [
      { nut: 'bieu:8501', ve: 1, phu: false, kieu: 'CO_KHONG', mo: 'NGHIA_THUONG', cauHoi: 'Ngoài nhóm?', trich: 'x', nguon: 'bieu:8543#1' },
      { nut: 'bieu:8543', ve: 1, phu: false, kieu: 'CO_KHONG', mo: 'NGHIA_THUONG', cauHoi: 'Tb?', trich: 'x', nguon: 'tb:1#1' },
    ],
  }, goi8543Ct, L);
  await new Promise((resolve) => srvGoi.close(resolve));

  kiem('tach-dieu-kien.mjs (ADR-0008): dungLoiHoiGoiNhom, rutJsonGoiNhom, tachGoiNhom qua mock HTTP + chia goiCon + daTri & GIAI_CHONG & CANH_TRANH',
    promptOk
    && parsedObj.dieuKien.length === 1
    && !rGoi.loi.length
    && rGoi.dieuKien.some((d) => d.nut === 'bieu:85437040' && d.daTri === true && d.phieu[0].daTri === true)
    && rGoi.giaiChong.length === 1
    && rGoi.canhTranh.length === 1
    && rGoi.banGhi.every((b) => kiemBanGhi(b).length === 0)
    && rBadNut.loi.some((l) => /không thuộc cây nhóm/.test(l))
    && rBadNut.loi.some((l) => /từ chối nguồn tiền lệ/.test(l)),
    { loi: rGoi.loi, dk: rGoi.dieuKien.length, gc: rGoi.giaiChong.length, ct: rGoi.canhTranh.length, bad: rBadNut.loi });
}

// 10D. so-diem.mjs (CHUA -> DO -> DONG -> đổi 1 câu luật mở lại ĐÚNG nút dính câu đó + CLI)
{
  const khoRong = path.join(TAM, 'hs-rong');
  fs.mkdirSync(khoRong, { recursive: true });
  const rChua = chamDiemNhom('0201', { luat: LUAT_VANG, hoSo: khoRong, L: L_VANG });
  const qChua = layHangDoi({ chuong: '02', luat: LUAT_VANG, hoSo: khoRong, L: L_VANG });

  const VANG_0201_FULL = [
    dkVang('bieu:0201', 1, 1, false, 'GIA_TRI', 'DINH_NGHIA_LUAT', 'Động vật thuộc loài nào?', 'động vật họ trâu bò', 'bieu:0201#1', { truc: 'loài', tap: ['động vật họ trâu bò'], moNguon: 'nhom:0201:ct:1#1' }),
    dkVang('bieu:0201', 2, 1, false, 'GIA_TRI', 'MO_TA_HUONG_DAN', 'Sản phẩm là gì?', 'Thịt', 'bieu:0201#1', { truc: 'sản phẩm', tap: ['Thịt'], moNguon: 'chuong:02:kq:2#1' }),
    dkVang('bieu:0201', 3, 1, false, 'GIA_TRI', 'DINH_NGHIA_LUAT', 'Trạng thái bảo quản là gì?', 'tươi hoặc ướp lạnh', 'bieu:0201#1', { truc: 'trạng thái', tap: ['tươi', 'ướp lạnh'], moNguon: 'chuong:02:kq:20#1' }),
    dkVang('bieu:020110', 1, 1, false, 'GIA_TRI', 'DINH_NGHIA_LUAT', 'Thịt cả con/nửa con?', 'Thịt cả con và nửa con', 'bieu:020110#1', { truc: 'DANG', tap: ['cả con', 'nửa con'], moNguon: 'chuong:02:kq:2#1' }),
    dkVang('bieu:020120', 1, 1, true, 'GIA_TRI', 'DINH_NGHIA_LUAT', 'Thịt cả con/nửa con?', 'Thịt pha có xương khác', 'bieu:020120#1', { truc: 'DANG', tap: ['cả con', 'nửa con'], moNguon: 'chuong:02:kq:2#1' }),
    dkVang('bieu:020120', 2, 1, false, 'CO_KHONG', 'DINH_NGHIA_LUAT', 'Thịt có "có xương" không?', 'có xương', 'bieu:020120#1', { moNguon: ['chuong:02:kq:34#1', 'chuong:02:kq:34#2'] }),
    dkVang('bieu:020130', 1, 1, true, 'CO_KHONG', 'DINH_NGHIA_LUAT', 'Thịt có "có xương" không?', 'Thịt lọc không xương', 'bieu:020130#1', { moNguon: 'chuong:02:kq:34#1' }),
  ];
  const viDu0201Full = [
    { trich: 'V02-01 cả con', ganDieuKien: { 'hs:bieu:020110:8101': true }, dich: 'bieu:02011000' },
    { trich: 'V02-05 có xương', ganDieuKien: { 'hs:bieu:020110:8101': false, 'hs:bieu:020120:8101': false, 'hs:bieu:020120:8102': true, 'hs:bieu:020130:8101': true }, dich: 'bieu:02012000' },
  ];
  const kho0201Dong = ghiHoSoTam({ dkList: VANG_0201_FULL });
  const rDong = chamDiemNhom('0201', { luat: LUAT_VANG, hoSo: kho0201Dong, L: L_VANG, viDu: viDu0201Full });
  const qSauDong = layHangDoi({ chuong: '02', luat: LUAT_VANG, hoSo: kho0201Dong, L: L_VANG, viDu: viDu0201Full });

  const kho0201Do = ghiHoSoTam({ dkList: VANG_0201_FULL.filter((x) => x.nut !== 'bieu:020130') });
  const rDo = chamDiemNhom('0201', { luat: LUAT_VANG, hoSo: kho0201Do, L: L_VANG });

  // Đổi 1 câu luật bieu:020120#1 trong bản sao kho luật -> chỉ mở lại đúng bieu:020120
  const luatDoi = path.join(TAM, 'luat-doi');
  fs.cpSync(LUAT_VANG, luatDoi, { recursive: true });
  const bieuDoiLines = fs.readFileSync(path.join(luatDoi, 'bieu.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => {
    const o = JSON.parse(l);
    if (o.id === 'bieu:020120') o.nguyenVan = '- Thịt pha có xương khác (đã sửa)';
    return JSON.stringify(o);
  });
  fs.writeFileSync(path.join(luatDoi, 'bieu.jsonl'), `${bieuDoiLines.join('\n')}\n`);
  const cauBieuDoiLines = fs.readFileSync(path.join(luatDoi, 'cau', 'bieu.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => {
    const o = JSON.parse(l);
    if (o.id === 'bieu:020120#1') o.den = '- Thịt pha có xương khác (đã sửa)'.length;
    return JSON.stringify(o);
  });
  fs.writeFileSync(path.join(luatDoi, 'cau', 'bieu.jsonl'), `${cauBieuDoiLines.join('\n')}\n`);
  const L_DOI = napLuatCong(luatDoi);
  const rMoLai = chamDiemNhom('0201', { luat: luatDoi, hoSo: kho0201Dong, L: L_DOI, viDu: viDu0201Full });

  // CLI so-diem.mjs (--kiem-dong thoát 0 khi DONG, thoát 1 khi DO)
  const cliDong = spawnSync(process.execPath, [
    path.join(GOC, 'scripts/ho-so-ma/so-diem.mjs'),
    '--nhom', '0201', '--luat', LUAT_VANG, '--ho-so', kho0201Dong, '--kiem-dong', '--json',
  ], { encoding: 'utf8' });
  const cliDo = spawnSync(process.execPath, [
    path.join(GOC, 'scripts/ho-so-ma/so-diem.mjs'),
    '--nhom', '0201', '--luat', luatDoi, '--ho-so', kho0201Dong, '--kiem-dong', '--json',
  ], { encoding: 'utf8' });

  kiem('so-diem.mjs: CHUA (hang-doi) -> DONG -> DO (cổng 6/7) -> đổi 1 câu bieu:020120#1 mở lại đúng nutCanMoLai=[bieu:020120] & CLI --kiem-dong',
    rChua.trangThai === 'CHUA'
    && qChua.hangDoi.some((x) => x.nhom === '0201')
    && rDong.trangThai === 'DONG'
    && !qSauDong.hangDoi.some((x) => x.nhom === '0201')
    && rDo.trangThai === 'DO' && rDo.congLoi.includes(6)
    && rMoLai.trangThai === 'DO'
    && rMoLai.cauDoiVanTay.length === 1 && rMoLai.cauDoiVanTay[0] === 'bieu:020120#1'
    && rMoLai.nutCanMoLai.length === 1 && rMoLai.nutCanMoLai[0] === 'bieu:020120'
    && cliDong.status === 0 && JSON.parse(cliDong.stdout).dong === 1
    && cliDo.status === 1 && JSON.parse(cliDo.stdout).do === 1,
    { rChua: rChua.trangThai, rDong: rDong.trangThai, rDo: rDo.congLoi, rMoLai: { tt: rMoLai.trangThai, cau: rMoLai.cauDoiVanTay, nut: rMoLai.nutCanMoLai }, cliDong: cliDong.status, cliDo: cliDo.status });
}

// 10E. Đọc kiểm chứng 2 bảng vàng đã gộp trên origin/main (docs/mong/the/M-81-vang-8543.md & M-81-vang-8501.md)
{
  const L_REAL = napLuatCong(LUAT_THAT);
  const layKhoiJsonl = (mdRel) => {
    const txt = fs.readFileSync(path.join(GOC, mdRel), 'utf8');
    return [...txt.matchAll(/```jsonl\n([\s\S]*?)```/g)]
      .map((m) => m[1].trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)));
  };
  const khoi8543 = layKhoiJsonl('docs/mong/the/M-81-vang-8543.md');
  const khoi8501 = layKhoiJsonl('docs/mong/the/M-81-vang-8501.md');
  const vang8543Dk = khoi8543[0] || [];
  const vang8543Gc = khoi8543[1] || [];
  const vang8501Dk = khoi8501[0] || [];
  const vang8501Gc = khoi8501[1] || [];

  const khopNguyenVan = [...vang8543Dk, ...vang8543Gc, ...vang8501Dk, ...vang8501Gc].every((o) => {
    const chu = L_REAL.chuCau(o.nguon);
    if (!chu) return false;
    if (!chuanSo(chu).includes(chuanSo(o.trich))) return false;
    if (o.vanTay && vanTay(chu) !== o.vanTay) return false;
    return true;
  });

  // Nạp 113 DIEU_KIEN + 7 GIAI_CHONG của 85.01 (bổ sung moNguon còn thiếu trước #2413) cùng NGUONG thật của Chương 85 để chấm qua cổng 6–11 + so-diem.mjs
  const dk8501Test = vang8501Dk.map((o) => (
    (o.mo === 'DINH_NGHIA_LUAT' || o.mo === 'MO_TA_HUONG_DAN') && !o.moNguon
      ? { ...o, moNguon: o.nguon }
      : o
  ));
  const kho8501Real = ghiHoSoTam({ dkList: [...dk8501Test, ...vang8501Gc], nguongList: NGUONG_8501 });
  const r8501RealCong = chayCong({ luat: LUAT_THAT, hoSo: kho8501Real, phamVi: ['8501'], chiTrong: true, cong: [6, 7, 8, 9, 11], L: L_REAL });
  const r8501Sodiem = chamDiemNhom('8501', { luat: LUAT_THAT, hoSo: kho8501Real, L: L_REAL });

  kiem('Bảng vàng trên origin/main (85.43: 49 DK+9 GC; 85.01: 113 DK+7 GC): 100% nguyên văn & vanTay khớp kho thật, 85.01 sạch khuôn + cổng 8/9/11',
    vang8543Dk.length === 49 && vang8543Gc.length === 9
    && vang8501Dk.length === 113 && vang8501Gc.length === 7
    && khopNguyenVan
    && r8501RealCong.khuon.length === 0
    && r8501RealCong.cong[8].loi.length === 0
    && r8501RealCong.cong[9].loi.length === 0
    && r8501RealCong.cong[11].loi.length === 0
    && r8501Sodiem.trangThai === 'DO' && r8501Sodiem.congLoi.includes(6),
    { n8543: vang8543Dk.length, n8501: vang8501Dk.length, khopNguyenVan, khuon: r8501RealCong.khuon.length, congLoi: r8501Sodiem.congLoi });
}

fs.rmSync(TAM, { recursive: true, force: true });
console.log(`\ntest-dieu-kien: ${passed}/${passed + failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
