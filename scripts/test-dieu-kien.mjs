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
  laPhanBuCoTen,
  tinhTruAnhEm,
  demDoanChamPhay,
  taoBangChoCha,
  dungBangAnhEm,
  sinhBangAnhEm,
  danhGiaCongThuc,
  doBangAnhEm,
  chungMinhPhuKin,
  chiaVeDieuKien,
  haiNutRoiNhau,
  laPhuCuaNhau,
  laChongSoTrungTruc,
  coNguonTapDuHopLe,
  moRongCayCon,
  laCauCapDuoiCon,
  timCauBoPhanTrenChuoiCha,
  chungMinhPhanHoachCauTruc,
} from './ho-so-ma/bang-anh-em.mjs';
import { chayCong, napLuatCong, parseCongArg, vanTay, chuanSo, cacNutCungDong } from './ho-so-ma/cong.mjs';
import {
  HUONG_DAN_TACH_DIEU_KIEN,
  tachDieuKienNut,
  tachDanhSachNut,
  chuanHoaDieuKien,
  docBool,
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

  kiem('khuon: chấp nhận hậu tố 8[1-9]d{2,} (8201, 81100) và từ chối id không phải 8[1-9]NN (7401)',
    !kiemBanGhi({ ...recOk, id: 'hs:bieu:85437050:8201' }).length
    && !kiemBanGhi({ ...recOk, id: 'hs:bieu:85437050:81100' }).length
    && kiemBanGhi({ ...recOk, id: 'hs:bieu:85437050:7401' }).some((l) => /8\[1-9\]NN/.test(l)));
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
  kiem('khuon: chấp nhận cauHoi <= 600 ký tự một dòng và từ chối nhiều dòng hoặc >600 ký tự',
    !kiemBanGhi({ ...recOk, cauHoi: 'x'.repeat(527) }).length
    && kiemBanGhi({ ...recOk, cauHoi: 'a\nb' }).some((l) => /cauHoi/.test(l))
    && kiemBanGhi({ ...recOk, cauHoi: 'x'.repeat(601) }).some((l) => /cauHoi/.test(l)));
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
    vanTay: vanTay(L.chuCau('nhom:8479:ct:4#1')),
  },
];

// 8501.10.2: thử loaiKhacCoVe (85011022) + SO
const DUNG_8501102 = [
  dk('bieu:8501102', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải động cơ bước không?', 'Động cơ bước', 'bieu:8501102#1', { moNguon: 'nhom:8501:ct:12#2' }),
  dk('bieu:85011021', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có dùng cho hàng hoá nhóm 84.15, 84.18, 84.50 hoặc 85.09 không?', 'Loại dùng cho hàng hóa thuộc nhóm 84.15, 84.18, 84.50, 85.09', 'bieu:85011021#1', { moNguon: 'bieu:85011021#1' }),
  dk('bieu:85011022', 1, 1, false, 'SO', 'NGUONG', 'Công suất không quá 5 W?', 'công suất không quá 5 W', 'bieu:85011022#1', { nguong: 'hs:bieu:85011022:7401' }),
];

// 4202.2: thử GIA_TRI trục chất liệu mặt ngoài + Loại khác + 420222 phủ kín tập GIA_TRI
const CAU_HOI_MAT_NGOAI = 'Chất liệu mặt ngoài là vật liệu nào?';
const DUNG_42022 = [
  dk('bieu:42022', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải túi xách tay (kể cả có/không quai đeo vai, tay cầm) không?', 'Túi xách tay, có hoặc không có quai đeo vai, kể cả loại không có tay cầm', 'bieu:42022#1', { moNguon: 'bieu:42022#1' }),
  dk('bieu:420221', 1, 1, false, 'GIA_TRI', 'MO_TA_HUONG_DAN', CAU_HOI_MAT_NGOAI, 'Mặt ngoài bằng da thuộc hoặc da thuộc tổng hợp', 'bieu:420221#1', { truc: 'chất liệu mặt ngoài', tap: ['da thuộc', 'da thuộc tổng hợp'], moNguon: 'pn:420211:ct:1#1' }),
  dk('bieu:420222', 1, 1, false, 'GIA_TRI', 'MO_TA_HUONG_DAN', CAU_HOI_MAT_NGOAI, 'Mặt ngoài bằng tấm plastic hoặc vật liệu dệt', 'bieu:420222#1', { truc: 'chất liệu mặt ngoài', tap: ['tấm plastic', 'vật liệu dệt'], moNguon: 'bieu:420222#1' }),
  dk('bieu:42022210', 1, 1, false, 'GIA_TRI', 'MO_TA_HUONG_DAN', CAU_HOI_MAT_NGOAI, 'Mặt ngoài bằng tấm plastic', 'bieu:42022210#1', { truc: 'chất liệu mặt ngoài', tap: ['tấm plastic'], tapDu: ['tấm plastic', 'vật liệu dệt'], tapDuNguon: 'bieu:420222#1', tapDuTrich: 'tấm plastic hoặc vật liệu dệt', moNguon: 'chuong:39:cg:1#2' }),
  dk('bieu:42022220', 1, 1, false, 'GIA_TRI', 'MO_TA_HUONG_DAN', CAU_HOI_MAT_NGOAI, 'Mặt ngoài bằng vật liệu dệt', 'bieu:42022220#1', { truc: 'chất liệu mặt ngoài', tap: ['vật liệu dệt'], tapDu: ['tấm plastic', 'vật liệu dệt'], tapDuNguon: 'bieu:420222#1', tapDuTrich: 'tấm plastic hoặc vật liệu dệt', moNguon: 'chuong:39:cg:1#3' }),
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
    { trich: 'V02-01 cả con', ganDieuKien: { 'hs:bieu:020110:8101': true, 'hs:bieu:020130:8101': true }, dich: 'bieu:02011000' },
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
  const luat9B = path.join(TAM, 'luat-9b');
  fs.cpSync(LUAT_VANG, luat9B, { recursive: true });
  const ct9B = {
    id: 'nhom:8501:ct:99',
    loai: 'CHU_THICH',
    cha: 'bieu:8501',
    lop: 'HUONG_DAN',
    nguon: { vanBan: 'synthetic-9b' },
    nguyenVan: 'Dòng điện làm việc gồm một chiều, xoay chiều và vạn năng một chiều/xoay chiều.',
  };
  fs.writeFileSync(path.join(luat9B, 'nhom.jsonl'), `${[...docDong(path.join(luat9B, 'nhom.jsonl')), JSON.stringify(ct9B)].join('\n')}\n`, 'utf8');
  fs.writeFileSync(path.join(luat9B, 'cau', 'nhom.jsonl'), `${[...docDong(path.join(luat9B, 'cau', 'nhom.jsonl')), JSON.stringify({ id: 'nhom:8501:ct:99#1', tu: 0, den: ct9B.nguyenVan.length })].join('\n')}\n`, 'utf8');
  const L_9B = napLuatCong(luat9B);
  const TD_NGUON_8501 = 'nhom:8501:ct:99#1';
  const TD_TRICH_8501 = 'một chiều, xoay chiều và vạn năng một chiều/xoay chiều';
  const CAU_HOI_MOT_PHA = 'Động cơ xoay chiều này có phải loại một pha (trái với loại đa pha — nhiều hơn một pha) không?';
  const VANG_8501 = [
    dkVang('bieu:8501', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Có phải động cơ điện hoặc máy phát điện không?', 'Động cơ điện và máy phát điện', 'bieu:8501#1'),
    dkVang('bieu:850110', 1, 1, false, 'GIA_TRI', 'DINH_NGHIA_LUAT', 'Loại máy là gì?', 'Động cơ', 'bieu:850110#1', { truc: 'loại máy', tap: ['Động cơ'], moNguon: 'nhom:8501:ct:2#1' }),
    dkVang('bieu:850110', 2, 1, false, 'SO', 'NGUONG', 'Công suất không quá 37,5 W?', 'công suất không quá 37,5 W', 'bieu:850110#1', { nguong: 'hs:bieu:850110:8501' }),
    dkVang('bieu:850110:td1', 1, 1, false, 'GIA_TRI', 'MO_TA_HUONG_DAN', 'Dòng điện làm việc?', 'một chiều', 'bieu:850110:td1#1', { truc: 'dòng điện làm việc', tap: ['một chiều'], moNguon: 'nhom:8501:ct:3#2' }),
    dkVang('bieu:850110:td2', 1, 1, true, 'GIA_TRI', 'MO_TA_HUONG_DAN', 'Dòng điện làm việc là một chiều?', 'Động cơ khác', 'bieu:850110:td2#1', { truc: 'dòng điện làm việc', tap: ['một chiều'], moNguon: 'nhom:8501:ct:3#2' }),
    dkVang('bieu:850110:td2', 2, 2, false, 'GIA_TRI', 'NGHIA_THUONG', 'Có phải động cơ vạn năng một chiều/xoay chiều không?', 'động cơ vạn năng (một chiều/xoay chiều)', 'bieu:850110:td2#1', { truc: 'dòng điện làm việc', tap: ['vạn năng một chiều/xoay chiều'] }),
    dkVang('bieu:8501102', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải động cơ bước không?', 'Động cơ bước', 'bieu:8501102#1', { moNguon: 'nhom:8501:ct:12#2' }),
    dkVang('bieu:85011030', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải động cơ hướng trục không?', 'Động cơ hướng trục', 'bieu:85011030#1', { moNguon: 'nhom:8501:ct:3#2' }),
    dkVang('bieu:85011021', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có dùng cho hàng hóa nhóm 84.15, 84.18, 84.50 hoặc 85.09 không?', 'Loại dùng cho hàng hóa thuộc nhóm 84.15, 84.18, 84.50, 85.09', 'bieu:85011021#1', { moNguon: 'bieu:85011021#1' }),
    dkVang('bieu:85011022', 1, 1, false, 'SO', 'NGUONG', 'Công suất không quá 5 W?', 'công suất không quá 5 W', 'bieu:85011022#1', { nguong: 'hs:bieu:85011022:8501' }),
    dkVang('bieu:85011041', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có dùng cho hàng hóa nhóm 84.15..85.09 không?', 'Loại dùng cho hàng hóa thuộc nhóm 84.15, 84.18, 84.50, 85.09', 'bieu:85011041#1', { moNguon: 'bieu:85011041#1' }),
    dkVang('bieu:8501105', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải động cơ bước không?', 'Động cơ bước', 'bieu:8501105#1', { moNguon: 'nhom:8501:ct:12#2' }),
    dkVang('bieu:85011051', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có dùng cho hàng hóa nhóm 84.15..85.09 không?', 'Loại dùng cho hàng hóa thuộc nhóm 84.15, 84.18, 84.50, 85.09', 'bieu:85011051#1', { moNguon: 'bieu:85011051#1' }),
    dkVang('bieu:85011060', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải động cơ hướng trục không?', 'Động cơ hướng trục', 'bieu:85011060#1', { moNguon: 'nhom:8501:ct:3#2' }),
    dkVang('bieu:85011091', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có dùng cho hàng hóa nhóm 84.15..85.09 không?', 'Loại dùng cho hàng hóa thuộc nhóm 84.15, 84.18, 84.50, 85.09', 'bieu:85011091#1', { moNguon: 'bieu:85011091#1' }),
    dkVang('bieu:850120', 1, 1, false, 'GIA_TRI', 'DINH_NGHIA_LUAT', 'Loại máy là gì?', 'Động cơ', 'bieu:850120#1', { truc: 'loại máy', tap: ['Động cơ'], moNguon: 'nhom:8501:ct:2#1' }),
    dkVang('bieu:850120', 2, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Dòng điện làm việc?', 'vạn năng một chiều/xoay chiều', 'bieu:850120#1', { truc: 'dòng điện làm việc', tap: ['vạn năng một chiều/xoay chiều'], tapDu: ['một chiều', 'xoay chiều', 'vạn năng một chiều/xoay chiều'], tapDuNguon: TD_NGUON_8501, tapDuTrich: TD_TRICH_8501 }),
    dkVang('bieu:850120', 3, 1, false, 'SO', 'NGUONG', 'Công suất trên 37,5 W?', 'công suất trên 37,5 W', 'bieu:850120#1', { nguong: 'hs:bieu:850120:8501' }),
    dkVang('bieu:85013', 1, 1, false, 'GIA_TRI', 'DINH_NGHIA_LUAT', 'Loại máy?', 'Động cơ một chiều', 'bieu:85013#1', { truc: 'loại máy', tap: ['Động cơ'], moNguon: 'nhom:8501:ct:2#1' }),
    dkVang('bieu:85013', 2, 1, false, 'GIA_TRI', 'MO_TA_HUONG_DAN', 'Dòng điện?', 'một chiều', 'bieu:85013#1', { truc: 'dòng điện làm việc', tap: ['một chiều'], tapDu: ['một chiều', 'xoay chiều', 'vạn năng một chiều/xoay chiều'], tapDuNguon: TD_NGUON_8501, tapDuTrich: TD_TRICH_8501, moNguon: 'nhom:8501:ct:3#2' }),
    dkVang('bieu:85013', 3, 1, true, 'SO', 'NGUONG', 'Công suất <= 37,5 W?', 'Động cơ một chiều khác', 'bieu:85013#1', { nguong: 'hs:bieu:850110:8501' }),
    dkVang('bieu:850131', 1, 1, false, 'SO', 'NGUONG', 'Công suất không quá 750 W?', 'Công suất không quá 750 W', 'bieu:850131#1', { nguong: 'hs:bieu:850131:8501' }),
    dkVang('bieu:85013130', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Dùng cho nhóm 84.15..85.09?', 'Động cơ loại dùng cho hàng hóa thuộc nhóm 84.15, 84.18, 84.50, 85.09', 'bieu:85013130#1', { moNguon: 'bieu:85013130#1' }),
    dkVang('bieu:85013160', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Dùng cho xe Chương 87?', 'Động cơ dùng cho xe của Chương 87', 'bieu:85013160#1', { moNguon: 'bieu:85013160#1' }),
    dkVang('bieu:850140', 1, 1, false, 'GIA_TRI', 'MO_TA_HUONG_DAN', 'Dòng điện?', 'xoay chiều', 'bieu:850140#1', { truc: 'dòng điện làm việc', tap: ['xoay chiều'], tapDu: ['một chiều', 'xoay chiều', 'vạn năng một chiều/xoay chiều'], tapDuNguon: TD_NGUON_8501, tapDuTrich: TD_TRICH_8501, moNguon: 'nhom:8501:ct:3#2' }),
    dkVang('bieu:850140', 2, 1, false, 'CO_KHONG', 'NGHIA_THUONG', CAU_HOI_MOT_PHA, 'một pha', 'bieu:850140#1'),
    dkVang('bieu:850140', 3, 1, true, 'SO', 'NGUONG', 'Công suất <= 37,5 W?', 'Động cơ xoay chiều khác', 'bieu:850140#1', { nguong: 'hs:bieu:850110:8501' }),
    dkVang('bieu:85015', 1, 1, false, 'GIA_TRI', 'MO_TA_HUONG_DAN', 'Dòng điện?', 'xoay chiều', 'bieu:85015#1', { truc: 'dòng điện làm việc', tap: ['xoay chiều'], tapDu: ['một chiều', 'xoay chiều', 'vạn năng một chiều/xoay chiều'], tapDuNguon: TD_NGUON_8501, tapDuTrich: TD_TRICH_8501, moNguon: 'nhom:8501:ct:3#2' }),
    dkVang('bieu:85015', 2, 1, true, 'CO_KHONG', 'NGHIA_THUONG', CAU_HOI_MOT_PHA, 'đa pha', 'bieu:85015#1'),
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
  const r8501_20_40 = haiNutRoiNhau(VANG_8501.filter((x) => x.loai === 'DIEU_KIEN' && x.nut === 'bieu:850120'), VANG_8501.filter((x) => x.loai === 'DIEU_KIEN' && x.nut === 'bieu:850140'), new Map(NGUONG_8501.map((x) => [x.id, x])), { L: L_9B });
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
    dkVang('bieu:42022210', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Chất liệu mặt ngoài?', 'tấm plastic', 'bieu:42022210#1', { truc: 'chất liệu mặt ngoài', tap: ['tấm plastic'], tapDu: ['tấm plastic', 'vật liệu dệt'], tapDuNguon: 'bieu:420222#1', tapDuTrich: 'tấm plastic hoặc vật liệu dệt' }),
    dkVang('bieu:42022220', 1, 1, false, 'GIA_TRI', 'DINH_NGHIA_LUAT', 'Chất liệu mặt ngoài?', 'vật liệu dệt', 'bieu:42022220#1', { truc: 'chất liệu mặt ngoài', tap: ['vật liệu dệt'], tapDu: ['tấm plastic', 'vật liệu dệt'], tapDuNguon: 'bieu:420222#1', tapDuTrich: 'tấm plastic hoặc vật liệu dệt', moNguon: 'chuong:39:cg:1#3' }),
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
// 10A. Cổng 8 CHỒNG với daTri:false + tapDu (rời nhau) vs daTri:false thiếu tapDu / daTri:true không GIAI_CHONG (CHUA_CHUNG_MINH_TACH) vs có GIAI_CHONG (giaiChong)
{
  const dkDonTriNoTapDuA = [dk('bieu:42022210', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Vật liệu?', 'tấm plastic', 'bieu:42022210#1', { truc: 'chất liệu mặt ngoài', tap: ['tấm plastic'], daTri: false })];
  const dkDonTriNoTapDuB = [dk('bieu:42022220', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Vật liệu?', 'vật liệu dệt', 'bieu:42022220#1', { truc: 'chất liệu mặt ngoài', tap: ['vật liệu dệt'], daTri: false })];
  const dkDonTriA = [{ ...dkDonTriNoTapDuA[0], tapDu: ['tấm plastic', 'vật liệu dệt'], tapDuNguon: 'bieu:420222#1', tapDuTrich: 'tấm plastic hoặc vật liệu dệt' }];
  const dkDonTriB = [{ ...dkDonTriNoTapDuB[0], tapDu: ['tấm plastic', 'vật liệu dệt'], tapDuNguon: 'bieu:420222#1', tapDuTrich: 'tấm plastic hoặc vật liệu dệt' }];
  const dkDaTriA = [{ ...dkDonTriNoTapDuA[0], daTri: true }];
  const dkDaTriB = [{ ...dkDonTriNoTapDuB[0], daTri: true }];

  const roiDonTri = haiNutRoiNhau(dkDonTriA, dkDonTriB) && !haiNutRoiNhau(dkDonTriNoTapDuA, dkDonTriNoTapDuB);
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
    && Array.isArray(rGoi.canhBao) && rGoi.canhBao.length === 0
    && rGoi.dieuKien.some((d) => d.nut === 'bieu:85437040' && d.daTri === true && d.phieu[0].daTri === true)
    && rGoi.giaiChong.length === 1
    && rGoi.canhTranh.length === 1
    && rGoi.banGhi.every((b) => kiemBanGhi(b).length === 0)
    && rBadNut.loi.some((l) => /không thuộc cây nhóm/.test(l))
    && rBadNut.loi.some((l) => /từ chối nguồn tiền lệ/.test(l)),
    { loi: rGoi.loi, canhBao: rGoi.canhBao, dk: rGoi.dieuKien.length, gc: rGoi.giaiChong.length, ct: rGoi.canhTranh.length, bad: rBadNut.loi });

  // 10C-2. Chống mất dữ liệu âm thầm khi gộp chunk: cùng trích khác điều kiện, trùng khoá khác nội dung phụ, và lặp chuoiCha giữa goiCon
  const { gopKetQuaChunk } = await import('./ho-so-ma/tach-dieu-kien.mjs');
  const nguong8543GiaLap = [
    { id: 'hs:bieu:8543:7401', nut: 'bieu:8543', dieuKien: 'Điện áp <= 50 V', nguong: { daiLuong: 'điện áp', donVi: 'V', tu: null, den: 50, gomTu: false, gomDen: true } },
    { id: 'hs:bieu:8543:7402', nut: 'bieu:8543', dieuKien: 'Công suất <= 100 W', nguong: { daiLuong: 'công suất', donVi: 'W', tu: null, den: 100, gomTu: false, gomDen: true } },
  ];
  // (a) Năm điều kiện KHÁC NHAU (khác cauHoi / khác kieu, truc, tap / khác nguong) nhưng CÙNG nut, ve, phu, nguon, trich -> giữ đủ 5, 0 canhBao
  const rCungTrich = await tachGoiNhom(goi8543Ct, {
    luat: LUAT_THAT,
    L: L_REAL,
    khongChia: true,
    nguongSanCo: nguong8543GiaLap,
    moHinh: 'test-cung-trich',
    callModel: async () => JSON.stringify({
      dieuKien: [
        { nut: 'bieu:8543', ve: 1, phu: false, kieu: 'CO_KHONG', mo: 'NGHIA_THUONG', cauHoi: 'Hàng hoá có phải là máy hoặc thiết bị điện không?', trich: 'Máy và thiết bị điện, có chức năng riêng', nguon: 'bieu:8543#1' },
        { nut: 'bieu:8543', ve: 1, phu: false, kieu: 'CO_KHONG', mo: 'NGHIA_THUONG', cauHoi: 'Thiết bị điện đó có chức năng riêng độc lập không?', trich: 'Máy và thiết bị điện, có chức năng riêng', nguon: 'bieu:8543#1' },
        { nut: 'bieu:8543', ve: 1, phu: false, kieu: 'GIA_TRI', truc: 'loại thiết bị trong nhóm', tap: ['máy điện', 'thiết bị điện'], mo: 'NGHIA_THUONG', cauHoi: 'Thuộc dạng máy điện hay thiết bị điện?', trich: 'Máy và thiết bị điện, có chức năng riêng', nguon: 'bieu:8543#1' },
        { nut: 'bieu:8543', ve: 1, phu: false, kieu: 'SO', nguong: 'hs:bieu:8543:7401', mo: 'NGUONG', cauHoi: 'Thỏa ngưỡng thông số kỹ thuật áp dụng?', trich: 'Máy và thiết bị điện, có chức năng riêng', nguon: 'bieu:8543#1' },
        { nut: 'bieu:8543', ve: 1, phu: false, kieu: 'SO', nguong: 'hs:bieu:8543:7402', mo: 'NGUONG', cauHoi: 'Thỏa ngưỡng thông số kỹ thuật áp dụng?', trich: 'Máy và thiết bị điện, có chức năng riêng', nguon: 'bieu:8543#1' },
      ],
      giaiChong: [],
      canhTranh: [],
    }),
  });

  // (b) Trùng khoá gộp (nut, ve, phu, nguon, trich, cauHoi, kieu, truc, tap) nhưng khác nội dung phụ (daTri / mo / moNguon) -> giữ đủ cả hai VÀ phát canhBao
  const rTrungKhoaKhacNoiDung = await tachGoiNhom(goi8543Ct, {
    luat: LUAT_THAT,
    L: L_REAL,
    khongChia: true,
    moHinh: 'test-trung-khoa-khac-noi-dung',
    callModel: async () => JSON.stringify({
      dieuKien: [
        { nut: 'bieu:85437040', ve: 1, phu: false, kieu: 'GIA_TRI', truc: 'loại tấm mạch', daTri: false, tap: ['PCB/PWBs(1)', 'PCAs(1)'], mo: 'NGHIA_THUONG', cauHoi: 'Dùng cho loại tấm mạch nào?', trich: 'tấm mạch PCB/PWBs(1) hoặc PCAs(1)', nguon: 'bieu:85437040#1' },
        { nut: 'bieu:85437040', ve: 1, phu: false, kieu: 'GIA_TRI', truc: 'loại tấm mạch', daTri: true, tap: ['PCAs(1)', 'PCB/PWBs(1)'], mo: 'NGHIA_THUONG', cauHoi: 'Dùng cho loại tấm mạch nào?', trich: 'tấm mạch PCB/PWBs(1) hoặc PCAs(1)', nguon: 'bieu:85437040#1' },
        { nut: 'bieu:8543', ve: 1, phu: false, kieu: 'CO_KHONG', mo: 'NGHIA_THUONG', cauHoi: 'Máy điện có chức năng riêng?', trich: 'Máy và thiết bị điện, có chức năng riêng', nguon: 'bieu:8543#1' },
        { nut: 'bieu:8543', ve: 1, phu: false, kieu: 'CO_KHONG', mo: 'DINH_NGHIA_LUAT', moNguon: 'nhom:8543:ct:1#1', cauHoi: 'Máy điện có chức năng riêng?', trich: 'Máy và thiết bị điện, có chức năng riêng', nguon: 'bieu:8543#1' },
        { nut: 'bieu:8543', ve: 1, phu: false, kieu: 'CO_KHONG', mo: 'DINH_NGHIA_LUAT', moNguon: 'nhom:8543:ct:2#1', cauHoi: 'Máy điện có chức năng riêng?', trich: 'Máy và thiết bị điện, có chức năng riêng', nguon: 'bieu:8543#1' },
      ],
      giaiChong: [],
      canhTranh: [],
    }),
  });

  // (c) Nhiều chunk goiCon trả lại chuoiCha/CANH_TRANH tương đương nghĩa:
  //     (i) tap đảo thứ tự, (ii) moNguon "id#1" vs ["id#1"] & mảng đảo thứ tự,
  //     (iii) CO_KHONG kèm tap:[], daTri:null, truc:"", nguong:"", moNguon thừa vs lược bỏ,
  //     (iv) CANH_TRANH.phepThu đảo thứ tự -> tất cả gộp còn đúng 1 bản ghi mỗi mục, 0 canhBao
  let demChunkLap = 0;
  const rHaiChunkLap = await tachGoiNhom('8543', {
    luat: LUAT_THAT,
    hoSo: path.join(TAM, 'empty-hoso'),
    L: L_REAL,
    canhTranhMd: ctMdTam,
    chiaTheo6So: true,
    moHinh: 'test-lap-chunk',
    callModel: async () => {
      demChunkLap += 1;
      const chan = demChunkLap % 2 === 0;
      const space = chan ? '  ' : ' ';
      return JSON.stringify({
        dieuKien: [
          // (i) GIA_TRI đảo thứ tự tap + chênh khoảng trắng + lược bỏ daTri:false
          chan
            ? { nut: 'bieu:8543', ve: 1, phu: false, kieu: 'GIA_TRI', truc: `loại${space}máy`, tap: ['thiết bị điện', 'máy điện'], mo: 'NGHIA_THUONG', cauHoi: `Máy${space}điện có chức năng riêng?`, trich: `Máy và${space}thiết bị điện, có chức năng riêng`, nguon: 'bieu:8543#1' }
            : { nut: 'bieu:8543', ve: 1, phu: false, kieu: 'GIA_TRI', truc: 'loại máy', daTri: false, tap: ['máy điện', 'thiết bị điện'], mo: 'NGHIA_THUONG', cauHoi: 'Máy điện có chức năng riêng?', trich: 'Máy và thiết bị điện, có chức năng riêng', nguon: 'bieu:8543#1' },
          // (ii-a) moNguon chuỗi đơn vs mảng 1 phần tử
          chan
            ? { nut: 'bieu:8543', ve: 2, phu: false, kieu: 'CO_KHONG', mo: 'DINH_NGHIA_LUAT', moNguon: ['nhom:8543:ct:1#1'], cauHoi: 'Thỏa định nghĩa chú giải nhóm?', trich: 'chức năng riêng', nguon: 'bieu:8543#1' }
            : { nut: 'bieu:8543', ve: 2, phu: false, kieu: 'CO_KHONG', mo: 'DINH_NGHIA_LUAT', moNguon: 'nhom:8543:ct:1#1', cauHoi: 'Thỏa định nghĩa chú giải nhóm?', trich: 'chức năng riêng', nguon: 'bieu:8543#1' },
          // (ii-b) moNguon mảng nhiều phần tử đảo thứ tự
          chan
            ? { nut: 'bieu:8543', ve: 3, phu: false, kieu: 'CO_KHONG', mo: 'MO_TA_HUONG_DAN', moNguon: ['nhom:8543:ct:1#2', 'nhom:8543:ct:1#1'], cauHoi: 'Thỏa mô tả hướng dẫn nhóm?', trich: 'chưa được chi tiết hoặc ghi ở nơi khác', nguon: 'bieu:8543#1' }
            : { nut: 'bieu:8543', ve: 3, phu: false, kieu: 'CO_KHONG', mo: 'MO_TA_HUONG_DAN', moNguon: ['nhom:8543:ct:1#1', 'nhom:8543:ct:1#2'], cauHoi: 'Thỏa mô tả hướng dẫn nhóm?', trich: 'chưa được chi tiết hoặc ghi ở nơi khác', nguon: 'bieu:8543#1' },
          // (iii) CO_KHONG mang tap:[], daTri:null, truc:"", nguong:"", moNguon thừa (mo=NGHIA_THUONG) + trường nháp ngoài khuôn vs lược bỏ
          chan
            ? { nut: 'bieu:8543', ve: 4, phu: false, kieu: 'CO_KHONG', mo: 'NGHIA_THUONG', cauHoi: 'Chưa ghi ở nơi khác trong chương?', trich: 'trong Chương này', nguon: 'bieu:8543#1' }
            : { nut: 'bieu:8543', ve: 4, phu: false, kieu: 'CO_KHONG', tap: [], daTri: null, truc: '', nguong: '', mo: 'NGHIA_THUONG', moNguon: 'nhom:8543:ct:1#1', nhapTam: 'chunk-le', cauHoi: 'Chưa ghi ở nơi khác trong chương?', trich: 'trong Chương này', nguon: 'bieu:8543#1' },
        ],
        giaiChong: [],
        // (iv) CANH_TRANH đảo thứ tự nhomCanhTranh và phepThu
        canhTranh: [
          chan
            ? { nut: 'bieu:8543', nhomCanhTranh: ['bieu:8543', 'bieu:8479'], phepThu: ['nhom:8543:ct:1#1', 'nhom:8479:ct:5#1'], trich: 'Không thể phân loại trong bất kỳ một nhóm cụ thể nào khác của chương này', nguon: 'nhom:8479:ct:4#1' }
            : { nut: 'bieu:8543', nhomCanhTranh: ['bieu:8479', 'bieu:8543'], phepThu: ['nhom:8479:ct:5#1', 'nhom:8543:ct:1#1'], trich: 'Không thể phân loại trong bất kỳ một nhóm cụ thể nào khác của chương này', nguon: 'nhom:8479:ct:4#1' },
        ],
      });
    },
  });
  const gopGcCt = gopKetQuaChunk([
    {
      dieuKien: [
        { nut: 'bieu:8543', ve: 1, phu: false, kieu: 'GIA_TRI', truc: 'loại máy', tap: ['Máy', 'thiết bị điện'], tapDu: ['Máy', 'thiết bị điện'], tapDuNguon: 'bieu:8543#1', tapDuTrich: 'Máy và thiết bị điện', cauHoi: 'Loại máy?', trich: 'Máy và thiết bị điện', nguon: 'bieu:8543#1' },
      ],
      giaiChong: [
        { nut: 'bieu:854370', cap: ['bieu:85437030', 'bieu:85437050'], cach: 'CHU_GIAI', trich: 'chức năng phiên dịch', nguon: 'bieu:85437030#1' },
      ],
      canhTranh: [
        { nut: 'bieu:8543', nhomCanhTranh: ['bieu:8479', 'bieu:8543'], phepThu: [{ nguon: 'nhom:8479:ct:5#1', trich: 'Không thể phân loại' }, { nguon: 'nhom:8543:ct:1#1', trich: 'chức năng riêng' }], trich: 'Không thể phân loại', nguon: 'nhom:8479:ct:4#1' },
      ],
    },
    {
      dieuKien: [
        { nut: 'bieu:8543', ve: 1, phu: false, kieu: 'GIA_TRI', truc: 'loại máy', tap: ['thiết bị điện', 'Máy'], tapDu: ['thiết bị điện', 'Máy'], tapDuNguon: 'bieu:8543#1', tapDuTrich: 'Máy và thiết bị điện', cauHoi: 'Loại máy?', trich: 'Máy và thiết bị điện', nguon: 'bieu:8543#1' },
      ],
      giaiChong: [
        { nut: 'bieu:854370', cap: ['bieu:85437050', 'bieu:85437030'], cach: 'CHU_GIAI', trich: 'chức năng phiên dịch', nguon: 'bieu:85437030#1' },
        { nut: 'bieu:854370', cap: ['bieu:85437030', 'bieu:85437050'], cach: 'CHU_GIAI', trich: 'từ điển', nguon: 'bieu:85437030#1' },
      ],
      canhTranh: [
        { nut: 'bieu:8543', nhomCanhTranh: ['bieu:8543', 'bieu:8479'], phepThu: [{ nguon: 'nhom:8543:ct:1#1', trich: 'chức năng  riêng' }, { nguon: 'nhom:8479:ct:5#1', trich: 'Không thể phân loại' }], trich: 'Không thể phân loại', nguon: 'nhom:8479:ct:4#1' },
        { nut: 'bieu:8543', nhomCanhTranh: ['bieu:8479', 'bieu:8543'], phepThu: [{ nguon: 'nhom:8543:ct:1#1', trich: 'chức năng riêng' }], trich: 'Không thể phân loại', nguon: 'nhom:8479:ct:4#1' },
      ],
    },
  ]);

  kiem('gopKetQuaChunk & tachGoiNhom (ca âm M-81): cùng trích khác điều kiện giữ đủ 5/5, đảo thứ tự tap/moNguon/phepThu & trường rỗng CO_KHONG gộp sạch 0 canhBao, khác daTri/moNguon/GC/CT giữ cả hai + canhBao',
    !rCungTrich.loi.length
    && rCungTrich.dieuKien.length === 5
    && rCungTrich.canhBao.length === 0
    && !rTrungKhoaKhacNoiDung.loi.length
    && rTrungKhoaKhacNoiDung.dieuKien.length === 5
    && rTrungKhoaKhacNoiDung.canhBao.length === 3
    && demChunkLap >= 2
    && !rHaiChunkLap.loi.length
    && rHaiChunkLap.dieuKien.length === 4
    && rHaiChunkLap.canhTranh.length === 1
    && rHaiChunkLap.canhBao.length === 0
    && gopGcCt.dieuKien.length === 1
    && gopGcCt.giaiChong.length === 2
    && gopGcCt.canhTranh.length === 2
    && gopGcCt.canhBao.length === 2,
    {
      cungTrich: { dk: rCungTrich.dieuKien.length, cb: rCungTrich.canhBao, loi: rCungTrich.loi },
      khacNoiDung: { dk: rTrungKhoaKhacNoiDung.dieuKien.length, cb: rTrungKhoaKhacNoiDung.canhBao, loi: rTrungKhoaKhacNoiDung.loi },
      haiChunkLap: { chunks: demChunkLap, dk: rHaiChunkLap.dieuKien.length, ct: rHaiChunkLap.canhTranh.length, cb: rHaiChunkLap.canhBao, loi: rHaiChunkLap.loi },
      gopGcCt: { dk: gopGcCt.dieuKien.length, gc: gopGcCt.giaiChong.length, ct: gopGcCt.canhTranh.length, cb: gopGcCt.canhBao },
    });
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
    { trich: 'V02-01 cả con', ganDieuKien: { 'hs:bieu:020110:8101': true, 'hs:bieu:020130:8101': true }, dich: 'bieu:02011000' },
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

// ---------- 11. Hồi quy Challenger R3 (moNguon staleness, vungChong Gate 8, docBool, cacNutCungDong 2308) ----------
{
  // R3-1: moNguon staleness khi không có DINH_NGHIA M-72/73 (qua moNguonVanTay và qua bang-anh-em.vanTayCau)
  const dkNormMn = chuanHoaDieuKien([
    {
      ve: 1, phu: false, kieu: 'CO_KHONG', mo: 'DINH_NGHIA_LUAT',
      moNguon: 'chuong:02:kq:34#1',
      cauHoi: 'Thịt có "có xương" không?', trich: 'có xương', nguon: 'bieu:020120#1',
    },
    {
      ve: 2, phu: false, kieu: 'CO_KHONG', mo: 'DINH_NGHIA_LUAT',
      moNguon: ['chuong:02:kq:34#1', 'chuong:02:kq:34#2'],
      cauHoi: 'Thịt có "có xương" theo 2 câu?', trich: 'có xương', nguon: 'bieu:020120#1',
    },
  ], 'bieu:020120', L_VANG);
  const vtKq1 = vanTay(L_VANG.chuCau('chuong:02:kq:34#1'));
  const vtKq2 = vanTay(L_VANG.chuCau('chuong:02:kq:34#2'));
  const mnKhuonBad1 = kiemBanGhi({ ...dkNormMn.banGhi[0], moNguonVanTay: 'not-sha256' });
  const mnKhuonBad2 = kiemBanGhi({ ...dkNormMn.banGhi[1], moNguonVanTay: { 'chuong:02:kq:34#1': vtKq1 } });
  const mnKhuonBad3 = kiemBanGhi({ ...dkVang('bieu:0201', 9, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Hỏi?', 'Thịt', 'bieu:0201#1'), moNguonVanTay: vtKq1 });

  // Tạo bản sao luật mutate chuong:02:kq:34#1 (không có DINH_NGHIA nào trong kho hồ sơ)
  const luatMnDoi = path.join(TAM, 'luat-mn-doi');
  fs.cpSync(LUAT_VANG, luatMnDoi, { recursive: true });
  const chLines = fs.readFileSync(path.join(luatMnDoi, 'chuong.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => {
    const o = JSON.parse(l);
    if (o.id === 'chuong:02') o.nguyenVan = o.nguyenVan.replace('có xương', 'CÓ XƯƠNG (ĐÃ SỬA)');
    return JSON.stringify(o);
  });
  fs.writeFileSync(path.join(luatMnDoi, 'chuong.jsonl'), `${chLines.join('\n')}\n`);
  const cauChLines = fs.readFileSync(path.join(luatMnDoi, 'cau', 'chuong.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => {
    const o = JSON.parse(l);
    if (o.id === 'chuong:02:kq:34#1') {
      const chuGoc = L_VANG.chuCau('chuong:02:kq:34#1');
      const chuMoi = chuGoc.replace('có xương', 'CÓ XƯƠNG (ĐÃ SỬA)');
      o.den = o.tu + chuMoi.length;
    }
    return JSON.stringify(o);
  });
  fs.writeFileSync(path.join(luatMnDoi, 'cau', 'chuong.jsonl'), `${cauChLines.join('\n')}\n`);
  const L_MN_DOI = napLuatCong(luatMnDoi);

  const VANG_0201_MN_VT = [
    dkVang('bieu:0201', 1, 1, false, 'GIA_TRI', 'DINH_NGHIA_LUAT', 'Động vật thuộc loài nào?', 'động vật họ trâu bò', 'bieu:0201#1', { truc: 'loài', tap: ['động vật họ trâu bò'], moNguon: 'nhom:0201:ct:1#1' }),
    dkVang('bieu:0201', 2, 1, false, 'GIA_TRI', 'MO_TA_HUONG_DAN', 'Sản phẩm là gì?', 'Thịt', 'bieu:0201#1', { truc: 'sản phẩm', tap: ['Thịt'], moNguon: 'chuong:02:kq:2#1' }),
    dkVang('bieu:0201', 3, 1, false, 'GIA_TRI', 'DINH_NGHIA_LUAT', 'Trạng thái bảo quản là gì?', 'tươi hoặc ướp lạnh', 'bieu:0201#1', { truc: 'trạng thái', tap: ['tươi', 'ướp lạnh'], moNguon: 'chuong:02:kq:20#1' }),
    dkVang('bieu:020110', 1, 1, false, 'GIA_TRI', 'DINH_NGHIA_LUAT', 'Thịt cả con/nửa con?', 'Thịt cả con và nửa con', 'bieu:020110#1', { truc: 'DANG', tap: ['cả con', 'nửa con'], moNguon: 'chuong:02:kq:2#1' }),
    dkVang('bieu:020120', 1, 1, true, 'GIA_TRI', 'DINH_NGHIA_LUAT', 'Thịt cả con/nửa con?', 'Thịt pha có xương khác', 'bieu:020120#1', { truc: 'DANG', tap: ['cả con', 'nửa con'], moNguon: 'chuong:02:kq:2#1' }),
    dkVang('bieu:020120', 2, 1, false, 'CO_KHONG', 'DINH_NGHIA_LUAT', 'Thịt có "có xương" không?', 'có xương', 'bieu:020120#1', { moNguon: 'chuong:02:kq:34#1', moNguonVanTay: vtKq1 }),
    dkVang('bieu:020130', 1, 1, true, 'CO_KHONG', 'DINH_NGHIA_LUAT', 'Thịt có "có xương" không?', 'Thịt lọc không xương', 'bieu:020130#1', { moNguon: 'chuong:02:kq:34#1', moNguonVanTay: vtKq1 }),
  ];
  const khoMnVt = ghiHoSoTam({ dkList: VANG_0201_MN_VT });
  const rMnVtDoi = chamDiemNhom('0201', { luat: luatMnDoi, hoSo: khoMnVt, L: L_MN_DOI });

  // Trường hợp không có moNguonVanTay trên DIEU_KIEN, nhưng đã sinh bang-anh-em/02.jsonl (vanTayCau)
  const VANG_0201_NO_MN_VT = VANG_0201_MN_VT.map(({ moNguonVanTay: _drop, ...rest }) => rest);
  const khoMnBang = ghiHoSoTam({ dkList: VANG_0201_NO_MN_VT });
  const rSinhBang02 = sinhBangAnhEm({ chuong: '02', chaIds: ['bieu:0201'], luat: LUAT_VANG, hoSo: khoMnBang, ghi: true });
  const rMnBangDoi = chamDiemNhom('0201', { luat: luatMnDoi, hoSo: khoMnBang, L: L_MN_DOI });

  kiem('HỒI QUY R3-1 (moNguon staleness): phát hiện đổi chữ moNguon qua moNguonVanTay và qua bang-anh-em.vanTayCau không cần DINH_NGHIA',
    dkNormMn.banGhi.length === 2
    && dkNormMn.banGhi[0].moNguonVanTay === vtKq1
    && dkNormMn.banGhi[1].moNguonVanTay?.['chuong:02:kq:34#1'] === vtKq1
    && dkNormMn.banGhi[1].moNguonVanTay?.['chuong:02:kq:34#2'] === vtKq2
    && mnKhuonBad1.length > 0 && mnKhuonBad2.length > 0 && mnKhuonBad3.length > 0
    && rMnVtDoi.trangThai === 'DO'
    && rMnVtDoi.cauDoiVanTay.includes('chuong:02:kq:34#1')
    && rMnVtDoi.nutCanMoLai.includes('bieu:020120') && rMnVtDoi.nutCanMoLai.includes('bieu:020130')
    && rSinhBang02.bang[0]?.vanTayCau?.['chuong:02:kq:34#1'] === vtKq1
    && rMnBangDoi.trangThai === 'DO'
    && rMnBangDoi.cauDoiVanTay.includes('chuong:02:kq:34#1')
    && rMnBangDoi.nutCanMoLai.includes('bieu:020120'),
    { rMnVtDoi, rMnBangDoi, vanTayCau: rSinhBang02.bang[0]?.vanTayCau });

  // R3-2: vungChong phải chặn Cổng 8 và so-diem DO kể cả khi haiNutRoiNhau === true (khớp bang-anh-em)
  const vcRoiNhau = [{ nut: 'bieu:0201', cap: ['bieu:020120', 'bieu:020130'] }];
  const r8VcRoi = chayCong({ luat: LUAT_VANG, hoSo: khoMnVt, phamVi: ['0201'], chiTrong: true, cong: [8], L: L_VANG, vungChong: vcRoiNhau });
  const rSdVcRoi = chamDiemNhom('0201', { luat: LUAT_VANG, hoSo: khoMnVt, L: L_VANG, vungChong: vcRoiNhau });
  const gc0201 = { id: 'hs:bieu:0201:8151', nut: 'bieu:0201', loai: 'GIAI_CHONG', cap: ['bieu:020120', 'bieu:020130'], cach: 'CHU_GIAI', trich: 'có xương', nguon: 'chuong:02:kq:34#1' };
  const khoVcGiai = ghiHoSoTam({ dkList: [...VANG_0201_MN_VT, gc0201] });
  const rSdVcGiai = chamDiemNhom('0201', { luat: LUAT_VANG, hoSo: khoVcGiai, L: L_VANG, vungChong: vcRoiNhau });

  kiem('HỒI QUY R3-2 (vungChong Gate 8): VUNG_CHONG chặn cổng 8 và so-diem DO dù haiNutRoiNhau=true; có GIAI_CHONG -> DONG',
    r8VcRoi.cong[8].dem.vungChong === 1
    && r8VcRoi.cong[8].loi.some((l) => /VUNG_CHONG/.test(l))
    && rSdVcRoi.trangThai === 'DO' && rSdVcRoi.congLoi.includes(8)
    && rSdVcGiai.trangThai === 'DONG',
    { c8: r8VcRoi.cong[8], sdVc: rSdVcRoi.congLoi, sdGiai: rSdVcGiai.trangThai });

  // R3-3: docBool & chuanHoaDieuKien không ép 'false' -> true cho phu / daTri
  const rBool = chuanHoaDieuKien([{
    ve: 1,
    phu: 'false',
    kieu: 'GIA_TRI',
    truc: 'chất liệu mặt ngoài',
    daTri: 'false',
    tap: ['tấm plastic'],
    mo: 'NGHIA_THUONG',
    cauHoi: 'Chất liệu mặt ngoài?',
    trich: 'tấm plastic',
    nguon: 'bieu:42022210#1',
  }], 'bieu:42022210', L_VANG);
  const rBoolBad = chuanHoaDieuKien([{
    ve: 1,
    phu: false,
    kieu: 'GIA_TRI',
    truc: 'chất liệu mặt ngoài',
    daTri: 'co-the',
    tap: ['tấm plastic'],
    mo: 'NGHIA_THUONG',
    cauHoi: 'Chất liệu mặt ngoài?',
    trich: 'tấm plastic',
    nguon: 'bieu:42022210#1',
  }], 'bieu:42022210', L_VANG);
  let docBoolErr = false;
  try { docBool('khong-hop-le'); } catch { docBoolErr = true; }
  kiem('HỒI QUY R3-3 (docBool): phu="false" & daTri="false" -> false, từ chối chuỗi boolean lạ',
    docBool('false') === false && docBool('0') === false && docBool(0) === false && docBool('no') === false && docBool('không') === false
    && docBool('true') === true && docBool('1') === true && docBool(1) === true && docBool('yes') === true && docBool('có') === true
    && docBoolErr
    && rBool.banGhi.length === 1 && rBool.banGhi[0].phu === false && rBool.banGhi[0].daTri === false
    && rBoolBad.banGhi.length === 0 && rBoolBad.loi.some((e) => /daTri không hợp lệ/.test(e)),
    { rBool, rBoolBad });

  // R3-4: chuỗi cungDong / suyRa nhiều bước trên biểu thật (bieu:2308 -> bieu:230800 -> bieu:23080000)
  const L_REAL = napLuatCong(LUAT_THAT);
  const metaReal = napBieuMeta(LUAT_THAT);
  const cd2308 = cacNutCungDong('bieu:2308', L_REAL, metaReal);
  const cdCycle = cacNutCungDong('a', { cay: { con: new Map(), theoId: new Map() } }, new Map([
    ['a', { cungDong: 'b' }],
    ['b', { cungDong: 'a' }],
  ]));
  const taoBo2308 = (nutDat) => ghiHoSoTam({
    dkList: [
      {
        id: `hs:${nutDat}:8101`,
        nut: nutDat,
        loai: 'DIEU_KIEN',
        ve: 1,
        phu: false,
        kieu: 'CO_KHONG',
        mo: 'NGHIA_THUONG',
        cauHoi: 'Có phải nguyên liệu/phế liệu thực vật dùng làm thức ăn chăn nuôi chưa được chi tiết ở nơi khác không?',
        trich: 'chưa được chi tiết hoặc ghi ở nơi khác',
        nguon: `${nutDat}#1`,
        vanTay: vanTay(L_REAL.chuCau(`${nutDat}#1`)),
      },
      {
        id: `hs:${nutDat}:8171`,
        nut: nutDat,
        loai: 'CANH_TRANH',
        nhomCanhTranh: ['bieu:1213', 'bieu:1214'],
        phepThu: [`${nutDat}#1`],
        trich: 'chưa được chi tiết hoặc ghi ở nơi khác',
        nguon: `${nutDat}#1`,
        vanTay: vanTay(L_REAL.chuCau(`${nutDat}#1`)),
      },
    ],
  });
  const sd2308_4 = chamDiemNhom('2308', { luat: LUAT_THAT, hoSo: taoBo2308('bieu:2308'), L: L_REAL, bieuMeta: metaReal });
  const sd2308_6 = chamDiemNhom('2308', { luat: LUAT_THAT, hoSo: taoBo2308('bieu:230800'), L: L_REAL, bieuMeta: metaReal });
  const sd2308_8 = chamDiemNhom('2308', { luat: LUAT_THAT, hoSo: taoBo2308('bieu:23080000'), L: L_REAL, bieuMeta: metaReal });
  const r2308Thieu = chayCong({ luat: LUAT_THAT, hoSo: khoRongCho2308(), phamVi: ['2308'], chiTrong: true, cong: [6, 12], L: L_REAL, bieuMeta: metaReal });
  function khoRongCho2308() { return ghiHoSoTam({ dkList: [] }); }

  kiem('HỒI QUY R3-4 (cacNutCungDong 2308): đặt DIEU_KIEN + CANH_TRANH ở 2308, 230800 hoặc 23080000 đều DONG; thiếu -> đỏ cổng 6 & 12',
    ['bieu:2308', 'bieu:230800', 'bieu:23080000'].every((id) => cd2308.includes(id))
    && cdCycle.length === 2
    && sd2308_4.trangThai === 'DONG'
    && sd2308_6.trangThai === 'DONG'
    && sd2308_8.trangThai === 'DONG'
    && r2308Thieu.cong[6].loi.length === 3
    && r2308Thieu.cong[12].loi.length === 3,
    { cd2308, sd4: sd2308_4.congLoi, sd6: sd2308_6.congLoi, sd8: sd2308_8.congLoi, thieu6: r2308Thieu.cong[6].loi.length, thieu12: r2308Thieu.cong[12].loi.length });
}

// ---------- 12. Hồi quy 5 điểm soát PR #2424 theo ADR-0009 ----------
{
  // 12A. Điểm 1 & Điểm 5: laPhuCuaNhau chỉ xét theo cấu trúc, bỏ so chuỗi con trich & nhánh chết veRoiNhau
  // Ca âm đúng nguyên văn QT: A trich: "plastic" (phu: false), B phu: true, trich: "plastic gia cố" cùng nguon
  const luatPlastic = path.join(TAM, 'luat-plastic');
  fs.cpSync(LUAT, luatPlastic, { recursive: true });
  const cauPlasticTxt = '- - Mặt ngoài bằng plastic hoặc plastic gia cố:';
  fs.writeFileSync(
    path.join(luatPlastic, 'bieu.jsonl'),
    `${docDong(path.join(luatPlastic, 'bieu.jsonl')).map((l) => {
      const o = JSON.parse(l);
      if (o.id === 'bieu:420222') o.nguyenVan = cauPlasticTxt;
      return JSON.stringify(o);
    }).join('\n')}\n`,
  );
  fs.writeFileSync(
    path.join(luatPlastic, 'cau', 'bieu.jsonl'),
    `${docDong(path.join(luatPlastic, 'cau', 'bieu.jsonl')).map((l) => {
      const o = JSON.parse(l);
      if (o.id === 'bieu:420222#1') { o.tu = 0; o.den = cauPlasticTxt.length; }
      return JSON.stringify(o);
    }).join('\n')}\n`,
  );
  const L_PLASTIC = napLuatCong(luatPlastic);

  const dkChaPlastic = dkWith(L_PLASTIC, 'bieu:420222', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Mặt ngoài bằng plastic hoặc plastic gia cố?', 'Mặt ngoài bằng plastic hoặc plastic gia cố', 'bieu:420222#1');
  const dkPlasticA_ck = dkWith(L_PLASTIC, 'bieu:42022210', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Mặt ngoài bằng plastic?', 'plastic', 'bieu:420222#1');
  const dkPlasticB_ck = dkWith(L_PLASTIC, 'bieu:42022220', 1, 1, true, 'CO_KHONG', 'NGHIA_THUONG', 'Mặt ngoài bằng plastic gia cố?', 'plastic gia cố', 'bieu:420222#1');
  const dkPlasticA_gt = dkWith(L_PLASTIC, 'bieu:42022210', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Chất liệu mặt ngoài?', 'plastic', 'bieu:420222#1', { truc: 'chất liệu mặt ngoài', tap: ['plastic'] });
  const dkPlasticB_gt = dkWith(L_PLASTIC, 'bieu:42022220', 1, 1, true, 'GIA_TRI', 'NGHIA_THUONG', 'Chất liệu mặt ngoài?', 'plastic gia cố', 'bieu:420222#1', { truc: 'chất liệu mặt ngoài', tap: ['plastic gia cố'] });

  const khoPlasticCk = ghiHoSoTam({ dkList: [dkChaPlastic, dkPlasticA_ck, dkPlasticB_ck] });
  const rPlasticCk = chayCong({ luat: luatPlastic, hoSo: khoPlasticCk, phamVi: ['bieu:420222'], chiTrong: true, cong: [4, 5, 6, 7, 8], L: L_PLASTIC });
  const bangPlasticCk = dungBangAnhEm({ chuong: '42', chaIds: ['bieu:420222'], luat: luatPlastic, hoSo: khoPlasticCk, L: L_PLASTIC }).bang[0];

  const khoPlasticGt = ghiHoSoTam({ dkList: [dkChaPlastic, dkPlasticA_gt, dkPlasticB_gt] });
  const rPlasticGt = chayCong({ luat: luatPlastic, hoSo: khoPlasticGt, phamVi: ['bieu:420222'], chiTrong: true, cong: [4, 5, 6, 7, 8], L: L_PLASTIC });

  // Kiểm thêm GIA_TRI khác truc nhưng cùng cauHoi + cùng tap + cùng nguon => KHÔNG bù, KHÔNG rời; cùng cấu trúc => bù
  const dkKhacTruc1 = dkWith(L_PLASTIC, 'bieu:42022210', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Chất liệu?', 'plastic', 'bieu:420222#1', { truc: 'mặt ngoài', tap: ['plastic'] });
  const dkKhacTruc2 = dkWith(L_PLASTIC, 'bieu:42022220', 1, 1, true, 'GIA_TRI', 'NGHIA_THUONG', 'Chất liệu?', 'plastic', 'bieu:420222#1', { truc: 'lớp lót', tap: ['plastic'] });
  const dkKhacTruc3 = { ...dkKhacTruc2, phu: false, tap: ['plastic gia cố'] };
  const dkCungTrucBu = { ...dkKhacTruc1, id: 'hs:bieu:42022220:8101', nut: 'bieu:42022220', phu: true };
  const dkCungCauBu = { ...dkPlasticA_ck, id: 'hs:bieu:42022220:8101', nut: 'bieu:42022220', phu: true };

  kiem('ADR-0009 Điểm 1 & 5 (plastic vs KHÔNG plastic gia cố): không coi chuỗi con trich là bù ⇒ cổng 7 đỏ HO_PHU & cổng 8 báo CHUA_CHUNG_MINH_TACH',
    laPhuCuaNhau(dkPlasticA_ck, dkPlasticB_ck) === false
    && laPhuCuaNhau(dkPlasticA_gt, dkPlasticB_gt) === false
    && laPhuCuaNhau(dkKhacTruc1, dkKhacTruc2) === false
    && laPhuCuaNhau(dkKhacTruc1, dkCungTrucBu) === true
    && laPhuCuaNhau(dkPlasticA_ck, dkCungCauBu) === true
    && haiNutRoiNhau([dkKhacTruc1], [dkKhacTruc3]) === false
    && !rPlasticCk.cong[4].loi.length && !rPlasticCk.cong[5].loi.length && !rPlasticCk.cong[6].loi.length
    && rPlasticCk.cong[7].loi.some((l) => /HO_PHU/.test(l))
    && rPlasticCk.cong[8].dem.roiNhau === 0 && rPlasticCk.cong[8].dem.chuaChungMinhTach === 1
    && bangPlasticCk.co.includes('HO_PHU') && bangPlasticCk.co.includes('CHUA_CHUNG_MINH_TACH')
    && !rPlasticGt.cong[4].loi.length && !rPlasticGt.cong[5].loi.length && !rPlasticGt.cong[6].loi.length
    && rPlasticGt.cong[7].loi.some((l) => /HO_PHU/.test(l))
    && rPlasticGt.cong[8].dem.roiNhau === 0 && rPlasticGt.cong[8].dem.chuaChungMinhTach === 1,
    { c6Ck: rPlasticCk.cong[6], c7Ck: rPlasticCk.cong[7], c8Ck: rPlasticCk.cong[8], co: bangPlasticCk.co, c7Gt: rPlasticGt.cong[7], c8Gt: rPlasticGt.cong[8] });

  // 12B. Điểm 2: Cổng 4 (TRÍCH) & Cổng 5 (VÂN TAY) chạy cho mọi bản ghi DIEU_KIEN / GIAI_CHONG / CANH_TRANH
  const gc45Ok = {
    id: 'hs:bieu:854370:8151',
    nut: 'bieu:854370',
    loai: 'GIAI_CHONG',
    cap: ['bieu:85437030', 'bieu:85437050'],
    cach: 'QUY_TAC_3',
    trich: 'Máy, thiết bị điện có chức năng phiên dịch hoặc từ điển',
    nguon: 'bieu:85437030#1',
    vanTay: vanTay(L.chuCau('bieu:85437030#1')),
  };
  const ct45Ok = {
    id: 'hs:bieu:8543:8171',
    nut: 'bieu:8543',
    loai: 'CANH_TRANH',
    nhomCanhTranh: ['bieu:8479', 'bieu:8543'],
    phepThu: [{ nguon: 'nhom:8479:ct:5#1', trich: 'cách thức hoạt động' }],
    trich: 'Không thể phân loại trong bất kỳ một nhóm cụ thể nào khác của chương này',
    nguon: 'nhom:8479:ct:4#1',
    vanTay: vanTay(L.chuCau('nhom:8479:ct:4#1')),
  };
  const dk45Ok = dk('bieu:85437030', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có chức năng phiên dịch không?', 'có chức năng phiên dịch', 'bieu:85437030#1', {
    moNguon: 'bieu:85437030#1',
    moNguonVanTay: vanTay(L.chuCau('bieu:85437030#1')),
  });
  const kho45Ok = ghiHoSoTam({ dkList: [dk45Ok, gc45Ok, ct45Ok] });
  const r45NoPv = chayCong({ luat: LUAT, hoSo: kho45Ok, phamVi: [], cong: [4, 5], L });
  const r45Pv = chayCong({ luat: LUAT, hoSo: kho45Ok, phamVi: ['bieu:8543'], chiTrong: true, cong: [4, 5], L });

  // Ca âm Cổng 4: trich sai trên DIEU_KIEN, GIAI_CHONG, CANH_TRANH và phepThu[].trich
  const kho4Sai = ghiHoSoTam({
    dkList: [
      { ...dk45Ok, trich: 'chữ bịa ở DIEU_KIEN' },
      { ...gc45Ok, trich: 'chữ bịa ở GIAI_CHONG' },
      { ...ct45Ok, trich: 'chữ bịa ở CANH_TRANH', phepThu: [{ nguon: 'nhom:8479:ct:5#1', trich: 'phép thử bịa' }] },
    ],
  });
  const r4Sai = chayCong({ luat: LUAT, hoSo: kho4Sai, phamVi: [], cong: [4, 5], L });

  // Ca âm Cổng 5: vanTay lệch trên DIEU_KIEN, GIAI_CHONG, CANH_TRANH và thiếu vanTay trên GIAI_CHONG
  const kho5Sai = ghiHoSoTam({
    dkList: [
      { ...dk45Ok, vanTay: '1'.repeat(64) },
      { ...gc45Ok, vanTay: '2'.repeat(64) },
      { ...ct45Ok, vanTay: '3'.repeat(64) },
      { id: 'hs:bieu:854370:8152', nut: 'bieu:854370', loai: 'GIAI_CHONG', cap: ['bieu:85437010', 'bieu:85437030'], cach: 'QUY_TAC_3', trich: 'Máy, thiết bị điện có chức năng phiên dịch hoặc từ điển', nguon: 'bieu:85437030#1' },
    ],
  });
  const r5Sai = chayCong({ luat: LUAT, hoSo: kho5Sai, phamVi: [], cong: [4, 5], L });

  kiem('ADR-0009 Điểm 2 (Cổng 4 & 5): kiểm trọn DIEU_KIEN, GIAI_CHONG, CANH_TRANH (cả phepThu & vanTay lệch/thiếu)',
    !r45NoPv.khuon.length && !r45NoPv.cong[4].loi.length && !r45NoPv.cong[5].loi.length
    && r45NoPv.cong[4].soKiem === 3 && r45NoPv.cong[5].soKiem === 4
    && !r45Pv.cong[4].loi.length && !r45Pv.cong[5].loi.length && r45Pv.cong[4].soKiem === 3
    && r4Sai.cong[4].loi.length === 4 && !r4Sai.cong[5].loi.length
    && ['hs:bieu:85437030:8101:', 'hs:bieu:854370:8151:', 'hs:bieu:8543:8171:'].every((p) => r4Sai.cong[4].loi.some((l) => l.startsWith(p)))
    && !r5Sai.cong[4].loi.length && r5Sai.cong[5].loi.length === 4
    && ['hs:bieu:85437030:8101:', 'hs:bieu:854370:8151:', 'hs:bieu:8543:8171:', 'hs:bieu:854370:8152:'].every((p) => r5Sai.cong[5].loi.some((l) => l.startsWith(p))),
    { r45NoPv: r45NoPv.cong, r4Sai: r4Sai.cong, r5Sai: r5Sai.cong });

  // 12C. Điểm 3: chongSoTrungTruc gắn cùng cờ VUNG_CHONG ở cả bang-anh-em.mjs và Cổng 8; có GIAI_CHONG thì gỡ cả hai
  const ngSoLe10 = { ...ng5W, id: 'hs:bieu:42022210:7401', nut: 'bieu:42022210', cau: 'bieu:85011022#1', nguong: { daiLuong: 'công suất', donVi: 'W', tu: null, den: 10, gomTu: false, gomDen: true } };
  const ngSoGt5 = { ...ng5W, id: 'hs:bieu:42022220:7401', nut: 'bieu:42022220', cau: 'bieu:85011022#1', nguong: { daiLuong: 'công suất', donVi: 'W', tu: 5, den: null, gomTu: false, gomDen: false } };
  const dkSo1 = dk('bieu:42022210', 1, 1, false, 'SO', 'NGUONG', 'Công suất <= 10 W?', 'công suất không quá 5 W', 'bieu:85011022#1', { nguong: ngSoLe10.id });
  const dkSo2 = dk('bieu:42022220', 1, 1, false, 'SO', 'NGUONG', 'Công suất > 5 W?', 'công suất không quá 5 W', 'bieu:85011022#1', { nguong: ngSoGt5.id });
  const khoSoChong = ghiHoSoTam({ dkList: [dkSo1, dkSo2], nguongList: [ngSoLe10, ngSoGt5] });
  const r8Chong = chayCong({ luat: LUAT, hoSo: khoSoChong, phamVi: ['bieu:420222'], chiTrong: true, cong: [8], L });
  const bangSoChong = dungBangAnhEm({ chuong: '42', chaIds: ['bieu:420222'], luat: LUAT, hoSo: khoSoChong, L }).bang[0];

  const gcSoGiai = {
    id: 'hs:bieu:420222:8151',
    nut: 'bieu:420222',
    loai: 'GIAI_CHONG',
    cap: ['bieu:42022210', 'bieu:42022220'],
    cach: 'NGUONG',
    trich: 'Mặt ngoài bằng tấm plastic hoặc vật liệu dệt',
    nguon: 'bieu:420222#1',
    vanTay: vanTay(L.chuCau('bieu:420222#1')),
  };
  const khoSoDaGiai = ghiHoSoTam({ dkList: [dkSo1, dkSo2, gcSoGiai], nguongList: [ngSoLe10, ngSoGt5] });
  const r8SoDaGiai = chayCong({ luat: LUAT, hoSo: khoSoDaGiai, phamVi: ['bieu:420222'], chiTrong: true, cong: [8], L });
  const bangSoDaGiai = dungBangAnhEm({ chuong: '42', chaIds: ['bieu:420222'], luat: LUAT, hoSo: khoSoDaGiai, L }).bang[0];

  kiem('ADR-0009 Điểm 3 (laChongSoTrungTruc): khoảng SO giao nhau gắn VUNG_CHONG khớp 100% giữa bang-anh-em.co và Cổng 8; có GIAI_CHONG thì gỡ cả hai',
    laChongSoTrungTruc([dkSo1], [dkSo2], new Map([[ngSoLe10.id, ngSoLe10], [ngSoGt5.id, ngSoGt5]])) === true
    && r8Chong.cong[8].dem.vungChong === 1 && r8Chong.cong[8].dem.chuaChungMinhTach === 0
    && r8Chong.cong[8].loi.some((l) => /VUNG_CHONG/.test(l))
    && bangSoChong.co.includes('VUNG_CHONG') && !bangSoChong.co.includes('CHUA_CHUNG_MINH_TACH')
    && !r8SoDaGiai.cong[8].loi.length && r8SoDaGiai.cong[8].dem.giaiChong === 1 && r8SoDaGiai.cong[8].dem.vungChong === 0
    && !bangSoDaGiai.co.includes('VUNG_CHONG') && !bangSoDaGiai.co.includes('CHUA_CHUNG_MINH_TACH'),
    { c8: r8Chong.cong[8], coChong: bangSoChong.co, c8Giai: r8SoDaGiai.cong[8], coGiai: bangSoDaGiai.co });

  // 12D. Điểm 4: trục đa trị daTri:true trên cả Cổng 8 lẫn bang-anh-em.co (không báo roiNhau)
  const dkDt1 = dk('bieu:42022210', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Hoạt chất?', 'tấm plastic', 'bieu:42022210#1', { truc: 'hoạt chất', daTri: true, tap: ['tấm plastic'] });
  const dkDt2 = dk('bieu:42022220', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Hoạt chất?', 'vật liệu dệt', 'bieu:42022220#1', { truc: 'hoạt chất', daTri: true, tap: ['vật liệu dệt'] });
  const khoDt = ghiHoSoTam({ dkList: [dkDt1, dkDt2] });
  const r8Dt = chayCong({ luat: LUAT, hoSo: khoDt, phamVi: ['bieu:420222'], chiTrong: true, cong: [8], L });
  const bangDt = dungBangAnhEm({ chuong: '42', chaIds: ['bieu:420222'], luat: LUAT, hoSo: khoDt, L }).bang[0];

  kiem('ADR-0009 Điểm 4 (trục đa trị daTri:true): tập GIA_TRI khác nhau trả CHUA_CHUNG_MINH_TACH ở cả Cổng 8 và bang-anh-em.co, roiNhau=0',
    r8Dt.cong[8].dem.roiNhau === 0
    && r8Dt.cong[8].dem.chuaChungMinhTach === 1
    && !r8Dt.cong[8].loi.length
    && r8Dt.cong[8].canhBao.some((c) => /CHUA_CHUNG_MINH_TACH/.test(c))
    && bangDt.co.includes('CHUA_CHUNG_MINH_TACH'),
    { c8: r8Dt.cong[8], co: bangDt.co });
}

// Bộ thử hồi quy 12 nhóm bảng vàng (02.01, 30.04, 39.26, 42.02, 61.10, 73.26, 84.79, 85.01, 85.17, 85.43, 87.08, 90.31) — từ nay chỉ dùng làm bộ thử hồi quy của cổng, KHÔNG dùng để đo mù nữa (#2410).
{
  const HO_SO_THAT = path.join(GOC, 'data/ho-so-ma');
  const NHOM_VANG_12 = ['0201', '3004', '3926', '4202', '6110', '7326', '8479', '8501', '8517', '8543', '8708', '9031'];
  const CHUONG_VANG_10 = ['02', '30', '39', '42', '61', '73', '84', '85', '87', '90'];
  const L_VANG12 = napLuatCong(LUAT_THAT);
  const metaVang12 = napBieuMeta(LUAT_THAT);

  // 13A. Sổ điểm 12 nhóm trên kho thật: 11/12 nhóm đạt DONG (kể cả 8708); chỉ duy nhất 8501 báo DO ở Cổng 7 (HO_PHU trung thực trên đúng 1 bảng bieu:8501 do không có câu luật đóng miền "vạn năng"), 0 VUNG_CHONG, khớp vân tay bang-anh-em
  const NHOM_DONG_11 = ['0201', '3004', '3926', '4202', '6110', '7326', '8479', '8517', '8543', '8708', '9031'];
  const NHOM_HO_PHU_1 = ['8501'];
  const sdVang12 = chamSoDiem({
    luat: LUAT_THAT,
    hoSo: HO_SO_THAT,
    batBuocTepBang: true,
    L: L_VANG12,
    bieuMeta: metaVang12,
  });
  const nhomByMa = new Map(sdVang12.nhom.map((x) => [x.nhom, x]));
  const bangTheoChaThat = new Map();
  let tongBangVang = 0;
  const dsChaHoPhu = [];
  let soBangVungChong = 0;
  for (const ch of CHUONG_VANG_10) {
    const pBang = path.join(HO_SO_THAT, 'bang-anh-em', `${ch}.jsonl`);
    for (const dong of docDong(pBang)) {
      const b = JSON.parse(dong);
      bangTheoChaThat.set(b.cha, b);
      const m = /^bieu:(\d{4})/.exec(b.cha || '');
      if (m && NHOM_VANG_12.includes(m[1])) {
        tongBangVang += 1;
        if ((b.co || []).includes('HO_PHU')) dsChaHoPhu.push(b.cha);
        if ((b.co || []).includes('VUNG_CHONG')) soBangVungChong += 1;
      }
    }
  }
  dsChaHoPhu.sort();

  kiem('HỒI QUY 12 BẢNG VÀNG (so-diem): 11/12 nhóm đạt DONG (kể cả 8708); duy nhất 8501 báo DO do HO_PHU trung thực trên đúng 1 bảng [bieu:8501], 0 VUNG_CHONG, khớp vân tay bang-anh-em',
    sdVang12.loiKho.length === 0
    && sdVang12.dong === 11
    && sdVang12.do === 1
    && tongBangVang === 176
    && JSON.stringify(dsChaHoPhu) === JSON.stringify(['bieu:8501'])
    && soBangVungChong === 0
    && NHOM_DONG_11.every((n4) => {
      const r = nhomByMa.get(n4);
      return r && r.trangThai === 'DONG' && r.congLoi.length === 0 && !r.bangAnhEmCu && r.cauDoiVanTay.length === 0;
    })
    && NHOM_HO_PHU_1.every((n4) => {
      const r = nhomByMa.get(n4);
      return r
        && r.trangThai === 'DO'
        && JSON.stringify(r.congLoi) === JSON.stringify([7])
        && r.loi.length === 1 && /^\[Cổng 7\] bieu:8501: HO_PHU/.test(r.loi[0])
        && !r.bangAnhEmCu
        && r.cauDoiVanTay.length === 0;
    }),
    {
      dong: sdVang12.dong,
      do: sdVang12.do,
      loiKho: sdVang12.loiKho,
      tongBangVang,
      dsChaHoPhu,
      soBangVungChong,
      r8501: nhomByMa.get('8501'),
      r8708: nhomByMa.get('8708'),
    });

  // 13B. Nhận diện phần bù có tên (laPhanBuCoTen), truAnhEm và cauHoiToiThieu
  const nutPhanBuCoTen = [
    'bieu:611090', 'bieu:84798', 'bieu:85013', 'bieu:850140', 'bieu:85015', 'bieu:85013170',
    'bieu:85176', 'bieu:854370', 'bieu:87082', 'bieu:87089', 'bieu:90314', 'bieu:903180',
  ];
  const nutKhongPhaiPhanBuCoTen = [
    'bieu:392640', // "Tượng nhỏ và các đồ trang trí khác" (liệt kê nội bộ "và các ... khác")
    'bieu:847930', // "kể cả ... khác"
    'bieu:870822', // "hoặc xe khác"
    'bieu:870850', // "kết hợp với các bộ phận truyền động khác"
    'bieu:8543',   // "chưa được chi tiết hoặc ghi ở nơi khác" (cổng 12, không phải anh em phần bù nội nhóm)
    'bieu:870829', // "- - Loại khác:" (Loại khác thuần)
    'bieu:85437090', // "Loại khác" thuần
  ];
  const layAe = (cha, con) => bangTheoChaThat.get(cha)?.anhEm?.find((x) => x.nut === con);
  const ae854370 = layAe('bieu:8543', 'bieu:854370');
  const ae85437090 = layAe('bieu:854370', 'bieu:85437090');
  const ae903180 = layAe('bieu:9031', 'bieu:903180');
  const ae90314990 = layAe('bieu:903149', 'bieu:90314990');
  const ae84798 = layAe('bieu:8479', 'bieu:84798');
  const ae84798969 = layAe('bieu:8479896', 'bieu:84798969');
  const ids854370 = new Set((ae854370?.cauHoiToiThieu || []).map((c) => c.id));
  const ids903180 = new Set((ae903180?.cauHoiToiThieu || []).map((c) => c.id));
  const ids84798 = new Set((ae84798?.cauHoiToiThieu || []).map((c) => c.id));

  kiem('HỒI QUY 12 BẢNG VÀNG (laPhanBuCoTen & cauHoiToiThieu): nhận diện đúng nhánh "… khác" và gom đủ câu hỏi anh em đứng trước',
    nutPhanBuCoTen.every((id) => laPhanBuCoTen(id, L_VANG12, metaVang12) === true)
    && nutKhongPhaiPhanBuCoTen.every((id) => laPhanBuCoTen(id, L_VANG12, metaVang12) === false)
    && JSON.stringify(ae854370?.congThuc?.truAnhEm) === JSON.stringify(['bieu:854310', 'bieu:854320', 'bieu:854330', 'bieu:854340'])
    && ['hs:bieu:854310:8101', 'hs:bieu:854320:8101', 'hs:bieu:854330:8101', 'hs:bieu:854340:8101'].every((id) => ids854370.has(id))
    && ae854370?.cauHoiToiThieu?.length === 12
    && ae85437090?.cauHoiToiThieu?.length === 35
    && JSON.stringify(ae903180?.congThuc?.truAnhEm) === JSON.stringify(['bieu:903110', 'bieu:903120', 'bieu:90314'])
    && ['hs:bieu:903110:8101', 'hs:bieu:903120:8101', 'hs:bieu:90314:8101'].every((id) => ids903180.has(id))
    && ae903180?.cauHoiToiThieu?.length === 9
    && ae90314990?.cauHoiToiThieu?.length === 17
    && JSON.stringify(ae84798?.congThuc?.truAnhEm) === JSON.stringify(['bieu:847910', 'bieu:847920', 'bieu:847930', 'bieu:847940', 'bieu:847950', 'bieu:847960', 'bieu:84797'])
    && ['hs:bieu:847910:8101', 'hs:bieu:847920:8101', 'hs:bieu:84797:8101'].every((id) => ids84798.has(id))
    && ae84798?.cauHoiToiThieu?.length === 18
    && ae84798969?.cauHoiToiThieu?.length === 36,
    {
      c854370: ae854370?.cauHoiToiThieu?.length,
      c85437090: ae85437090?.cauHoiToiThieu?.length,
      c903180: ae903180?.cauHoiToiThieu?.length,
      c90314990: ae90314990?.cauHoiToiThieu?.length,
      c84798: ae84798?.cauHoiToiThieu?.length,
      c84798969: ae84798969?.cauHoiToiThieu?.length,
    });

  // 13C. Định tuyến doBangAnhEm trên bảng thật: máy có tên không CHONG_LAP với "… khác"; anh em trước undefined -> dừng RE_NHANH; ve:0 loại trừ -> NGOAI_PHAM_VI
  const kq8543_20 = doBangAnhEm('bieu:8543', {
    'hs:bieu:8543:8101': true, 'hs:bieu:8543:8102': true, 'hs:bieu:8543:8103': true, 'hs:bieu:8543:8104': false,
    'hs:bieu:854310:8101': false,
    'hs:bieu:854320:8101': true,
    'hs:bieu:854330:8101': false, 'hs:bieu:854330:8102': false, 'hs:bieu:854330:8103': false,
    'hs:bieu:854340:8101': false, 'hs:bieu:854340:8102': false,
    'hs:bieu:854370:8101': true,
    'hs:bieu:854390:8101': false,
  }, bangTheoChaThat);

  const kq8479_10 = doBangAnhEm('bieu:8479', {
    'hs:bieu:8479:8101': true, 'hs:bieu:8479:8102': true, 'hs:bieu:8479:8103': false,
    'hs:bieu:847910:8101': true, 'hs:bieu:84791010:8101': true, 'hs:bieu:84791020:8101': true,
    'hs:bieu:847920:8101': false, 'hs:bieu:847930:8101': false, 'hs:bieu:847930:8104': false, 'hs:bieu:847940:8101': false,
    'hs:bieu:847950:8101': false, 'hs:bieu:847960:8101': false, 'hs:bieu:84797:8101': false,
    'hs:bieu:84798:8101': true, 'hs:bieu:847990:8101': false,
  }, bangTheoChaThat);

  const kq9031_10 = doBangAnhEm('bieu:9031', {
    'hs:bieu:9031:8101': false, 'hs:bieu:9031:8102': true, 'hs:bieu:9031:8103': false,
    'hs:bieu:903110:8101': true, 'hs:bieu:903110:8102': true,
    'hs:bieu:903120:8101': false, 'hs:bieu:90314:8101': false,
    'hs:bieu:903180:8101': true, 'hs:bieu:903190:8101': false,
  }, bangTheoChaThat);

  const kq8517_11 = doBangAnhEm('bieu:8517', {
    'hs:bieu:8517:8101': false, 'hs:bieu:8517:8102': false, 'hs:bieu:8517:8103': true,
    'hs:bieu:85171:8101': true,
    'hs:bieu:851711:8101': true, 'hs:bieu:851711:8102': true,
    'hs:bieu:851713:8101': false, 'hs:bieu:851714:8101': false,
    'hs:bieu:85176:8101': true, 'hs:bieu:85177:8101': false, 'hs:bieu:85177:8103': false,
  }, bangTheoChaThat);

  const kqReNhanh8543 = doBangAnhEm('bieu:8543', {
    'hs:bieu:8543:8101': true, 'hs:bieu:8543:8102': true, 'hs:bieu:8543:8103': true, 'hs:bieu:8543:8104': false,
    // 8543.10..40 đều để undefined
    'hs:bieu:854370:8101': true,
    'hs:bieu:854390:8101': false,
  }, bangTheoChaThat);

  const kqReNhanh8501 = doBangAnhEm('bieu:8501', {
    'hs:bieu:8501:8101': true, 'hs:bieu:8501:8103': false, 'hs:bieu:8501:8104': false,
    'hs:bieu:850110:8101': true,
    // công suất & dòng điện (8501.20 / 8501.3) để undefined
  }, bangTheoChaThat);

  const kqReNhanh9031 = doBangAnhEm('bieu:9031', {
    'hs:bieu:9031:8101': false, 'hs:bieu:9031:8102': true, 'hs:bieu:9031:8103': false,
    'hs:bieu:903110:8101': false,
    // 9031.20 để undefined
    'hs:bieu:90314:8101': true,
    'hs:bieu:903180:8101': true,
    'hs:bieu:903190:8101': false,
  }, bangTheoChaThat);

  const kqNgoai8708 = doBangAnhEm('bieu:8708', {
    'hs:bieu:8708:8101': true, 'hs:bieu:8708:8102': true, 'hs:bieu:8708:8103': true,
    'hs:bieu:8708:8104': true, // bị loại theo Chú giải 2 Phần XVII
  }, bangTheoChaThat);

  const kqNgoai6110 = doBangAnhEm('bieu:6110', {
    'hs:bieu:6110:8101': true, 'hs:bieu:6110:8102': true,
    'hs:bieu:6110:8106': true, // hàng may mặc trẻ sơ sinh <= 86 cm -> 61.11
  }, bangTheoChaThat);

  kiem('HỒI QUY 12 BẢNG VÀNG (doBangAnhEm): máy có tên đi thẳng không CHONG_LAP; anh em trước undefined -> RE_NHANH; ve:0 bị loại -> NGOAI_PHAM_VI',
    kq8543_20.trangThai === 'DICH' && kq8543_20.dich === 'bieu:854320'
    && kq8479_10.trangThai === 'DICH' && kq8479_10.dich === 'bieu:84791010'
    && kq9031_10.trangThai === 'DICH' && kq9031_10.dich === 'bieu:903110'
    && kq8517_11.trangThai === 'DICH' && kq8517_11.dich === 'bieu:851711'
    && kqReNhanh8543.trangThai === 'RE_NHANH' && kqReNhanh8543.cha === 'bieu:8543' && !kqReNhanh8543.duong.includes('bieu:854370')
    && kqReNhanh8501.trangThai === 'RE_NHANH' && kqReNhanh8501.cha === 'bieu:8501' && !kqReNhanh8501.duong.includes('bieu:85013')
    && kqReNhanh9031.trangThai === 'RE_NHANH' && kqReNhanh9031.cha === 'bieu:9031' && !kqReNhanh9031.duong.includes('bieu:90314') && !kqReNhanh9031.duong.includes('bieu:903180')
    && kqNgoai8708.trangThai === 'NGOAI_PHAM_VI' && kqNgoai8708.nutLoai === 'bieu:8708'
    && kqNgoai6110.trangThai === 'NGOAI_PHAM_VI' && kqNgoai6110.nutLoai === 'bieu:6110',
    { kq8543_20, kq8479_10, kq9031_10, kq8517_11, kqReNhanh8543, kqReNhanh8501, kqReNhanh9031, kqNgoai8708, kqNgoai6110 });

  // 13D. Ca âm Cổng 7 trên bản sao kho tạm: (1) hụt giá trị ở 870822; (2) hạ GIA_TRI -> CO_KHONG ở 870880; (3) bỏ phu ngưỡng 37,5 W ở 8501 -> bắt buộc báo HO_PHU đỏ
  const taoHoSoTamTuThat = (ten, ch, bienDoiDk, nguongList = []) => {
    const dir = path.join(TAM, ten);
    for (const sub of ['phan', 'chuong', 'nhom', 'phan-nhom', 'dong', 'nguong', 'liet-ke', 'dieu-kien']) {
      fs.mkdirSync(path.join(dir, sub), { recursive: true });
    }
    if (nguongList.length) {
      fs.writeFileSync(path.join(dir, 'nguong', `${ch}.jsonl`), `${nguongList.map((x) => JSON.stringify(x)).join('\n')}\n`);
    }
    const gocList = docDong(path.join(HO_SO_THAT, 'dieu-kien', `${ch}.jsonl`)).map((l) => JSON.parse(l));
    const moiList = bienDoiDk(gocList);
    fs.writeFileSync(path.join(dir, 'dieu-kien', `${ch}.jsonl`), `${moiList.map((x) => JSON.stringify(x)).join('\n')}\n`);
    return dir;
  };

  const nguong87 = docDong(path.join(HO_SO_THAT, 'nguong', '87.jsonl')).map((l) => JSON.parse(l));
  const nguong85 = docDong(path.join(HO_SO_THAT, 'nguong', '85.jsonl')).map((l) => JSON.parse(l));

  // Ca âm 1: xoá 87.02 khỏi 87082230 (làm 870822 không phủ hết phạm vi cha 87.01..87.05)
  const khoAm870822 = taoHoSoTamTuThat('am-870822', '87', (list) => list.map((r) => (
    r.id === 'hs:bieu:87082230:8101' ? { ...r, tap: ['87.04'] } : r
  )), nguong87);
  const rAm870822 = chayCong({ luat: LUAT_THAT, hoSo: khoAm870822, phamVi: ['bieu:870822'], chiTrong: true, cong: [7], L: L_VANG12, bieuMeta: metaVang12 });

  // Ca âm 2: hạ GIA_TRI của 8708801 & 8708809 thành CO_KHONG mất truc/tap
  const khoAm870880 = taoHoSoTamTuThat('am-870880', '87', (list) => list.map((r) => {
    if (r.id !== 'hs:bieu:8708801:8101' && r.id !== 'hs:bieu:8708809:8101') return r;
    const { truc: _t, tap: _tap, daTri: _dt, ...rest } = r;
    return { ...rest, kieu: 'CO_KHONG' };
  }), nguong87);
  const rAm870880 = chayCong({ luat: LUAT_THAT, hoSo: khoAm870880, phamVi: ['bieu:870880'], chiTrong: true, cong: [7], L: L_VANG12, bieuMeta: metaVang12 });

  // Ca âm 3: bỏ phu ngưỡng 37,5 W trên 85013/850140/85015 (dựng bản sao luat tạm có câu nhom:8501:ct:99#1 đóng miền dòng điện để bản chưa bỏ phu XANH Cổng 7, còn bản bỏ phu ĐỎ HO_PHU — không bị tầm thường hoá!)
  const luatAm8501 = path.join(TAM, 'luat-am-8501');
  fs.mkdirSync(path.join(luatAm8501, 'cau'), { recursive: true });
  fs.mkdirSync(path.join(luatAm8501, 'nghia-canh'), { recursive: true });
  for (const f of fs.readdirSync(LUAT_THAT)) {
    const src = path.join(LUAT_THAT, f);
    if (!fs.statSync(src).isFile()) continue;
    if (f === 'nhom.jsonl') {
      const ctAm = {
        id: 'nhom:8501:ct:99',
        loai: 'CHU_THICH',
        cha: 'bieu:8501',
        lop: 'HUONG_DAN',
        nguon: { vanBan: 'synthetic-am-8501' },
        nguyenVan: 'Dòng điện làm việc gồm một chiều, xoay chiều hoặc vạn năng một chiều/xoay chiều.',
      };
      fs.writeFileSync(path.join(luatAm8501, f), `${fs.readFileSync(src, 'utf8').trimEnd()}\n${JSON.stringify(ctAm)}\n`, 'utf8');
    } else {
      fs.symlinkSync(src, path.join(luatAm8501, f));
    }
  }
  for (const f of fs.readdirSync(path.join(LUAT_THAT, 'cau'))) {
    const src = path.join(LUAT_THAT, 'cau', f);
    if (!fs.statSync(src).isFile()) continue;
    if (f === 'nhom.jsonl') {
      const cauCtAm = { id: 'nhom:8501:ct:99#1', tu: 0, den: 'Dòng điện làm việc gồm một chiều, xoay chiều hoặc vạn năng một chiều/xoay chiều.'.length };
      fs.writeFileSync(path.join(luatAm8501, 'cau', f), `${fs.readFileSync(src, 'utf8').trimEnd()}\n${JSON.stringify(cauCtAm)}\n`, 'utf8');
    } else {
      fs.symlinkSync(src, path.join(luatAm8501, 'cau', f));
    }
  }
  for (const f of fs.readdirSync(path.join(LUAT_THAT, 'nghia-canh'))) {
    const src = path.join(LUAT_THAT, 'nghia-canh', f);
    if (fs.statSync(src).isFile()) fs.symlinkSync(src, path.join(luatAm8501, 'nghia-canh', f));
  }
  const L_AM_8501 = napLuatCong(luatAm8501);
  const ganTapDu8501 = (list) => list.map((r) => (
    r.id === 'hs:bieu:8501:8105'
      ? {
        ...r,
        tapDu: ['một chiều', 'xoay chiều', 'vạn năng một chiều/xoay chiều'],
        tapDuNguon: 'nhom:8501:ct:99#1',
        tapDuTrich: 'một chiều, xoay chiều hoặc vạn năng một chiều/xoay chiều',
        tapDuNguonVanTay: vanTay(L_AM_8501.chuCau('nhom:8501:ct:99#1')),
      }
      : r
  ));
  const khoDuong8501 = taoHoSoTamTuThat('duong-8501', '85', ganTapDu8501, nguong85);
  const rDuong8501 = chayCong({ luat: luatAm8501, hoSo: khoDuong8501, phamVi: ['bieu:8501'], chiTrong: true, cong: [6, 7], L: L_AM_8501, bieuMeta: metaVang12 });
  const khoAm8501 = taoHoSoTamTuThat('am-8501', '85', (list) => ganTapDu8501(list).filter((r) => (
    !['hs:bieu:85013:8103', 'hs:bieu:850140:8104', 'hs:bieu:85015:8104'].includes(r.id)
  )), nguong85);
  const rAm8501 = chayCong({ luat: luatAm8501, hoSo: khoAm8501, phamVi: ['bieu:8501'], chiTrong: true, cong: [7], L: L_AM_8501, bieuMeta: metaVang12 });

  // Ca âm S1 (R2-1 b1): thêm điều kiện thu hẹp giả GIA_TRI tap:["chạy pin"] vào nhánh phần bù nguyên chiếc bieu:854370 -> bắt buộc báo HO_PHU đỏ
  const khoAmS1 = taoHoSoTamTuThat('am-s1-854370', '85', (list) => [
    ...list,
    {
      id: 'hs:bieu:854370:8199',
      nut: 'bieu:854370',
      loai: 'DIEU_KIEN',
      ve: 1,
      phu: false,
      kieu: 'GIA_TRI',
      truc: 'nguon_dien',
      tap: ['chạy pin'],
      mo: 'NGHIA_THUONG',
      cauHoi: 'Máy có chạy pin không?',
      trich: 'Máy và thiết bị khác',
      nguon: 'bieu:854370#1',
      vanTay: vanTay(L_VANG12.chuCau('bieu:854370#1')),
    },
  ], nguong85);
  const rAmS1 = chayCong({ luat: LUAT_THAT, hoSo: khoAmS1, phamVi: ['bieu:8543'], chiTrong: true, cong: [7], L: L_VANG12, bieuMeta: metaVang12 });

  // Ca âm S2 (R2-1 b2): đổi hs:bieu:87089921:8101 từ tap:["Thùng nhiên liệu"] thành tap:["Nắp phụ"] -> không khớp tên hàng chính của cha bieu:8708992 -> bắt buộc báo HO_PHU đỏ
  const khoAmS2 = taoHoSoTamTuThat('am-s2-8708992', '87', (list) => list.map((r) => (
    r.id === 'hs:bieu:87089921:8101' ? { ...r, tap: ['Nắp phụ'] } : r
  )), nguong87);
  const rAmS2 = chayCong({ luat: LUAT_THAT, hoSo: khoAmS2, phamVi: ['bieu:8708992'], chiTrong: true, cong: [7], L: L_VANG12, bieuMeta: metaVang12 });

  kiem('HỒI QUY 12 BẢNG VÀNG (ca âm Cổng 7 + S1/S2): thiếu anh em 870822, hạ GIA_TRI 870880, bỏ phu 37,5 W 8501 (trên nền xanh đối chứng), thu hẹp giả 854370 (S1) và lệch tên nguyên chiếc 87089921 (S2) đều báo HO_PHU đỏ',
    rAm870822.cong[7].loi.some((l) => /bieu:870822.*HO_PHU/.test(l))
    && rAm870880.cong[7].loi.some((l) => /bieu:870880.*HO_PHU/.test(l))
    && rDuong8501.cong[6].loi.length === 0
    && rDuong8501.cong[7].loi.length === 0
    && rAm8501.cong[7].loi.some((l) => /bieu:8501.*HO_PHU/.test(l))
    && rAmS1.cong[7].loi.some((l) => /bieu:8543.*HO_PHU/.test(l))
    && rAmS2.cong[7].loi.some((l) => /bieu:8708992.*HO_PHU/.test(l)),
    {
      am870822: rAm870822.cong[7].loi,
      am870880: rAm870880.cong[7].loi,
      duong8501: { c6: rDuong8501.cong[6].loi, c7: rDuong8501.cong[7].loi },
      am8501: rAm8501.cong[7].loi,
      amS1: rAmS1.cong[7].loi,
      amS2: rAmS2.cong[7].loi,
    });

  // 13E. Kiểm sạch lời nhắc HUONG_DAN_TACH_DIEU_KIEN (không dính 12 mã vàng, không chứa "bảng vàng" / "tập vàng")
  const RE_MA_VANG = /\b(?:02\.?01|30\.?04|39\.?26|42\.?02|61\.?10|73\.?26|84\.?79|85\.?01|85\.?17|85\.?43|87\.?08|90\.?31)\b/i;
  kiem('HỒI QUY 12 BẢNG VÀNG (lời nhắc sạch): HUONG_DAN_TACH_DIEU_KIEN không chứa bất kỳ mã nào thuộc 12 nhóm vàng hay chữ bảng vàng/tập vàng',
    !RE_MA_VANG.test(HUONG_DAN_TACH_DIEU_KIEN) && !/bảng vàng|tập vàng/i.test(HUONG_DAN_TACH_DIEU_KIEN),
    HUONG_DAN_TACH_DIEU_KIEN);
}

// ---------- 14. Hồi quy tổng quát Cổng 6/7 (tapDu thuần tập hợp + chiếu biến cha) & Cổng 10 (chặn nhảy cóc qua undefined) ----------
{
  // 14A. Khuôn & Cổng 6 cho tapDu (ADR-0009 điểm 5): chỉ GIA_TRI đơn trị được mang tapDu >= 2 phần tử phân biệt, tap ⊆ tapDu; gia đình anh em phải nhất quán
  const recTapDuOk = dk('bieu:42022210', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Mặt ngoài bằng chất liệu gì?', 'tấm plastic', 'bieu:42022210#1', {
    truc: 'chất liệu mặt ngoài',
    tap: ['tấm plastic'],
    tapDu: ['tấm plastic', 'vật liệu dệt'],
    tapDuNguon: 'bieu:420222#1',
    tapDuTrich: 'tấm plastic hoặc vật liệu dệt',
  });
  const recCkTapDu = dk('bieu:85437050', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Có phải bộ khuếch đại vi sóng không?', 'Bộ khuếch đại vi sóng', 'bieu:85437050#1', {
    tapDu: ['có', 'không'],
  });
  const recSoTapDu = dk('bieu:85011022', 1, 1, false, 'SO', 'NGUONG', 'Công suất không quá 5 W?', 'công suất không quá 5 W', 'bieu:85011022#1', {
    nguong: 'hs:bieu:85011022:7401',
    tapDu: ['nhỏ', 'lớn'],
  });
  const recDaTriTapDu = { ...recTapDuOk, daTri: true };
  const recTapDu1 = { ...recTapDuOk, tapDu: ['tấm plastic', 'TẤM PLASTIC'] };
  const recTapNgoaiTapDu = { ...recTapDuOk, tap: ['da thuộc'], tapDu: ['tấm plastic', 'vật liệu dệt'] };

  // Cổng 6: (a) chỉ 1 anh em khai tapDu (cha không khai) -> đỏ; (b) 2 anh em khai tapDu lệch nhau -> đỏ; (c) khai đủ trên mọi anh em -> xanh
  const dkC6MotBen = [
    dk('bieu:420222', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Hàng thuộc phân nhóm này?', 'tấm plastic hoặc vật liệu dệt', 'bieu:420222#1'),
    recTapDuOk,
    dk('bieu:42022220', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Mặt ngoài bằng chất liệu gì?', 'vật liệu dệt', 'bieu:42022220#1', {
      truc: 'chất liệu mặt ngoài',
      tap: ['vật liệu dệt'],
    }),
  ];
  const rC6MotBen = chayCong({ luat: LUAT, hoSo: ghiHoSoTam({ dkList: dkC6MotBen }), phamVi: ['bieu:420222'], chiTrong: true, cong: [6], L });

  const dkC6Lech = [
    dkC6MotBen[0],
    recTapDuOk,
    dk('bieu:42022220', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Mặt ngoài bằng chất liệu gì?', 'vật liệu dệt', 'bieu:42022220#1', {
      truc: 'chất liệu mặt ngoài',
      tap: ['vật liệu dệt'],
      tapDu: ['tấm plastic', 'vật liệu dệt', 'cao su'],
      tapDuNguon: 'bieu:420222#1',
      tapDuTrich: 'tấm plastic hoặc vật liệu dệt',
    }),
  ];
  const rC6Lech = chayCong({ luat: LUAT, hoSo: ghiHoSoTam({ dkList: dkC6Lech }), phamVi: ['bieu:420222'], chiTrong: true, cong: [6], L });

  const dkC6DongNhat = [
    dkC6MotBen[0],
    recTapDuOk,
    dk('bieu:42022220', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Mặt ngoài bằng chất liệu gì?', 'vật liệu dệt', 'bieu:42022220#1', {
      truc: 'chất liệu mặt ngoài',
      tap: ['vật liệu dệt'],
      tapDu: ['tấm plastic', 'vật liệu dệt'],
      tapDuNguon: 'bieu:420222#1',
      tapDuTrich: 'tấm plastic hoặc vật liệu dệt',
    }),
  ];
  const rC6DongNhat = chayCong({ luat: LUAT, hoSo: ghiHoSoTam({ dkList: dkC6DongNhat }), phamVi: ['bieu:420222'], chiTrong: true, cong: [6], L });

  // Chặn 2 (Auditor R1): cha khai tapDu nhưng một anh em trên cùng trục lại gắn daTri:true -> Cổng 6 bắt đỏ
  const dkC6TronDaTri = [
    dk('bieu:420222', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Mặt ngoài bằng chất liệu gì?', 'tấm plastic hoặc vật liệu dệt', 'bieu:420222#1', {
      truc: 'chất liệu mặt ngoài',
      tap: ['tấm plastic', 'vật liệu dệt'],
      tapDu: ['tấm plastic', 'vật liệu dệt'],
      tapDuNguon: 'bieu:420222#1',
      tapDuTrich: 'tấm plastic hoặc vật liệu dệt',
    }),
    dk('bieu:42022210', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Mặt ngoài bằng chất liệu gì?', 'tấm plastic', 'bieu:42022210#1', {
      truc: 'chất liệu mặt ngoài',
      tap: ['tấm plastic'],
    }),
    dk('bieu:42022220', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Mặt ngoài bằng chất liệu gì?', 'vật liệu dệt', 'bieu:42022220#1', {
      truc: 'chất liệu mặt ngoài',
      daTri: true,
      tap: ['vật liệu dệt'],
    }),
  ];
  const rC6TronDaTri = chayCong({ luat: LUAT, hoSo: ghiHoSoTam({ dkList: dkC6TronDaTri }), phamVi: ['bieu:420222'], chiTrong: true, cong: [6], L });

  // Chặn 1 (Auditor R1 — Probe A & Probe B ở Bước 3 Cổng 7 khi nút cha nhiều vế):
  // Probe A: cha ve:1 là CO_KHONG (không khóa trục), ve:2 có tap:['tấm plastic','vật liệu dệt'] kèm tapDu 3 phần tử hợp lệ (thêm 'da thuộc' từ pn:420211:ct:1#1); con bỏ sót 'da thuộc' -> PHẢI ĐỎ HO_PHU
  const dkProbeA = [
    dk('bieu:420222', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Nhánh độc lập thứ nhất?', 'tấm plastic', 'bieu:420222#1'),
    dk('bieu:420222', 2, 2, false, 'GIA_TRI', 'NGHIA_THUONG', 'Chất liệu mặt ngoài?', 'tấm plastic hoặc vật liệu dệt', 'bieu:420222#1', {
      truc: 'chất liệu mặt ngoài',
      tap: ['tấm plastic', 'vật liệu dệt'],
      tapDu: ['tấm plastic', 'vật liệu dệt', 'da thuộc'],
      tapDuNguon: ['bieu:420222#1', 'pn:420211:ct:1#1'],
      tapDuTrich: ['tấm plastic hoặc vật liệu dệt', 'da thuộc'],
    }),
    dk('bieu:42022210', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Chất liệu mặt ngoài?', 'tấm plastic', 'bieu:42022210#1', { truc: 'chất liệu mặt ngoài', tap: ['tấm plastic'] }),
    dk('bieu:42022220', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Chất liệu mặt ngoài?', 'vật liệu dệt', 'bieu:42022220#1', { truc: 'chất liệu mặt ngoài', tap: ['vật liệu dệt'] }),
  ];
  const rProbeA = chayCong({ luat: LUAT, hoSo: ghiHoSoTam({ dkList: dkProbeA }), phamVi: ['bieu:420222'], chiTrong: true, cong: [7], L });

  // Probe B: cha ve:1 ràng buộc trục không có tapDu, ve:2 là CO_KHONG độc lập; con chỉ phủ tập của ve:1 -> PHẢI ĐỎ HO_PHU
  const dkProbeB = [
    dk('bieu:420222', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Chất liệu mặt ngoài?', 'tấm plastic hoặc vật liệu dệt', 'bieu:420222#1', {
      truc: 'chất liệu mặt ngoài',
      tap: ['tấm plastic', 'vật liệu dệt'],
    }),
    dk('bieu:420222', 2, 2, false, 'CO_KHONG', 'NGHIA_THUONG', 'Nhánh độc lập thứ hai?', 'vật liệu dệt', 'bieu:420222#1'),
    dk('bieu:42022210', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Chất liệu mặt ngoài?', 'tấm plastic', 'bieu:42022210#1', { truc: 'chất liệu mặt ngoài', tap: ['tấm plastic'] }),
    dk('bieu:42022220', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Chất liệu mặt ngoài?', 'vật liệu dệt', 'bieu:42022220#1', { truc: 'chất liệu mặt ngoài', tap: ['vật liệu dệt'] }),
  ];
  const rProbeB = chayCong({ luat: LUAT, hoSo: ghiHoSoTam({ dkList: dkProbeB }), phamVi: ['bieu:420222'], chiTrong: true, cong: [7], L });

  kiem('Khuôn, Cổng 6 & Cổng 7 đa vế cha (tapDu — ADR-0009 điểm 5): nhận hợp lệ; từ chối sai kiểu/trộn daTri/lệch hoặc nửa vời; Probe A & B cha 2 vế ⇒ đỏ HO_PHU',
    kiemBanGhi(recTapDuOk).length === 0
    && kiemBanGhi(recCkTapDu).some((l) => /không mang tapDu/.test(l))
    && kiemBanGhi(recSoTapDu).some((l) => /không mang tapDu/.test(l))
    && kiemBanGhi(recDaTriTapDu).some((l) => /đơn trị/.test(l))
    && kiemBanGhi(recTapDu1).some((l) => /ít nhất 2 giá trị/.test(l))
    && kiemBanGhi(recTapNgoaiTapDu).some((l) => /ngoài tapDu/.test(l))
    && rC6MotBen.cong[6].loi.some((l) => /phải khai trên mọi anh em cùng trục/.test(l))
    && rC6Lech.cong[6].loi.some((l) => /không thống nhất/.test(l))
    && rC6TronDaTri.cong[6].loi.some((l) => /daTri:true nên không được khai tapDu/.test(l))
    && rC6DongNhat.cong[6].loi.length === 0
    && rProbeA.cong[7].loi.some((l) => /bieu:420222.*HO_PHU/.test(l))
    && rProbeB.cong[7].loi.some((l) => /bieu:420222.*HO_PHU/.test(l)),
    {
      c6MotBen: rC6MotBen.cong[6].loi,
      c6Lech: rC6Lech.cong[6].loi,
      c6TronDaTri: rC6TronDaTri.cong[6].loi,
      c6DongNhat: rC6DongNhat.cong[6].loi,
      probeA: rProbeA.cong[7].loi,
      probeB: rProbeB.cong[7].loi,
    });

  // 14B. Cổng 7 (ADR-0009 điểm 5, 0 đoán chữ tiếng Việt):
  //   - Ca âm bắt buộc của QT: hai giá trị chữ "có X" / "không có X" trên GIA_TRI mà KHÔNG khai tapDu -> BẮT BUỘC ĐỎ HO_PHU (cả cổng 7 lẫn bang-anh-em.co)!
  //   - Ca dương 1: khai tapDu đồng nhất trên mọi anh em cùng trục + phần bù có tên + 16 biến boolean ở cha -> 0 HO_PHU
  //   - Ca dương 2: khai tapDu MỘT lần ở nút cha (anh em không lặp tapDu) -> Cổng 6 & Cổng 7 đều 0 lỗi
  //   - Ca âm 2: khai tapDu 3 phần tử ["hơi nước", "không hoạt động bằng hơi nước", "khí nén"] nhưng các con chỉ phủ 2 phần tử -> ĐỎ HO_PHU
  //   - Ca âm 3: có tapDu hợp lệ nhưng nhánh phần bù có tên bị gắn thêm điều kiện thu hẹp giả -> ĐỎ HO_PHU
  const luatSyn7 = path.join(TAM, 'luat-syn7');
  fs.cpSync(LUAT_VANG, luatSyn7, { recursive: true });
  const bieuSyn7Map = new Map([
    ['bieu:8543', 'Thiết bị chuyên dụng (dùng hơi nước hoặc không hoạt động bằng hơi nước) và cụm tín hiệu gắn nguồn cố định; bộ phận của chúng, chưa được chi tiết hoặc ghi ở nơi khác'],
    ['bieu:854310', '- Thiết bị buồng kín kiểu treo, trừ loại dùng ở khu vực công cộng:'],
    ['bieu:854320', '- Thiết bị để bàn dùng hơi nước:'],
    ['bieu:854330', '- Dây thiết bị dùng cho nghi lễ:'],
    ['bieu:854340', '- Thiết bị dùng hơi nước khác:'],
    ['bieu:854370', '- Thiết bị không hoạt động bằng hơi nước:'],
    ['bieu:854390', '- Cụm tín hiệu gắn nguồn cố định:'],
    ['bieu:020120', '- Có bộ phận gia nhiệt'],
    ['bieu:020130', '- Không có bộ phận gia nhiệt'],
  ]);
  const themCon99 = {
    id: 'bieu:854399',
    cha: 'bieu:8543',
    cap: 'PHAN_NHOM',
    lop: 'LUAT',
    nguon: { vanBan: 'synthetic' },
    nguyenVan: '- Bộ phận',
    loaiKhac: false,
    loaiKhacCoVe: false,
    khongMa: false,
    suyRa: false,
    cungDong: null,
    phamViTru: [],
  };
  const bieuLinesSyn7 = docDong(path.join(luatSyn7, 'bieu.jsonl')).map((l) => {
    const o = JSON.parse(l);
    if (bieuSyn7Map.has(o.id)) {
      o.nguyenVan = bieuSyn7Map.get(o.id);
      o.loaiKhac = false;
      o.loaiKhacCoVe = false;
    }
    return JSON.stringify(o);
  });
  for (const id of ['bieu:854310', 'bieu:854320', 'bieu:854340', 'bieu:854390']) {
    if (!bieuLinesSyn7.some((l) => JSON.parse(l).id === id)) {
      bieuLinesSyn7.push(JSON.stringify({
        ...themCon99,
        id,
        nguyenVan: bieuSyn7Map.get(id),
      }));
    }
  }
  bieuLinesSyn7.push(JSON.stringify(themCon99));
  // Bỏ các con sâu hơn của 854330/854370 và bỏ 020110 để 0201 chỉ còn đúng 2 con nhị phân "Có bộ phận gia nhiệt" / "Không có bộ phận gia nhiệt"
  const bieuFilteredSyn7 = bieuLinesSyn7.filter((l) => {
    const id = JSON.parse(l).id;
    return !/^bieu:8543(?:30|70)\d/.test(id) && id !== 'bieu:020110';
  });
  fs.writeFileSync(path.join(luatSyn7, 'bieu.jsonl'), `${bieuFilteredSyn7.join('\n')}\n`, 'utf8');

  const cauLinesSyn7 = docDong(path.join(luatSyn7, 'cau', 'bieu.jsonl')).filter((l) => {
    const nId = JSON.parse(l).id.split('#')[0];
    return !bieuSyn7Map.has(nId) && !/^bieu:8543(?:30|70)\d/.test(nId) && nId !== 'bieu:020110';
  });
  for (const [id, txt] of [...bieuSyn7Map.entries(), ['bieu:854399', themCon99.nguyenVan]]) {
    cauLinesSyn7.push(JSON.stringify({ id: `${id}#1`, tu: 0, den: txt.length }));
  }
  fs.writeFileSync(path.join(luatSyn7, 'cau', 'bieu.jsonl'), `${cauLinesSyn7.join('\n')}\n`, 'utf8');
  const ctSyn7Mt = {
    id: 'nhom:8543:ct:99',
    loai: 'CHU_THICH',
    cha: 'bieu:8543',
    lop: 'HUONG_DAN',
    nguon: { vanBan: 'synthetic-syn7' },
    nguyenVan: 'Môi trường lắp đặt thiết bị gồm tàu thuyền, nhà tắm, phòng thí nghiệm, xưởng đúc, hầm lò hoặc kho lạnh.',
  };
  fs.writeFileSync(path.join(luatSyn7, 'nhom.jsonl'), `${[...docDong(path.join(luatSyn7, 'nhom.jsonl')), JSON.stringify(ctSyn7Mt)].join('\n')}\n`, 'utf8');
  fs.writeFileSync(path.join(luatSyn7, 'cau', 'nhom.jsonl'), `${[...docDong(path.join(luatSyn7, 'cau', 'nhom.jsonl')), JSON.stringify({ id: 'nhom:8543:ct:99#1', tu: 0, den: ctSyn7Mt.nguyenVan.length })].join('\n')}\n`, 'utf8');

  const L_SYN7 = napLuatCong(luatSyn7);
  const metaSyn7 = napBieuMeta(luatSyn7);

  // Ca âm bắt buộc của QT (Điểm 4): 2 anh em GIA_TRI mang chữ "có bộ phận gia nhiệt" / "không có bộ phận gia nhiệt" KHÔNG khai tapDu -> PHẢI ĐỎ HO_PHU
  const dkCoKhongChuKhongTapDu = [
    dkWith(L_SYN7, 'bieu:020120', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Hàng có bộ phận gia nhiệt hay không?', 'Có bộ phận gia nhiệt', 'bieu:020120#1', {
      truc: 'trang bị gia nhiệt',
      tap: ['có bộ phận gia nhiệt'],
    }),
    dkWith(L_SYN7, 'bieu:020130', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Hàng có bộ phận gia nhiệt hay không?', 'Không có bộ phận gia nhiệt', 'bieu:020130#1', {
      truc: 'trang bị gia nhiệt',
      tap: ['không có bộ phận gia nhiệt'],
    }),
  ];
  const khoCoKhongChu = ghiHoSoTam({ dkList: dkCoKhongChuKhongTapDu });
  const rCoKhongChu = chayCong({ luat: luatSyn7, hoSo: khoCoKhongChu, phamVi: ['bieu:0201'], chiTrong: true, cong: [7], L: L_SYN7, bieuMeta: metaSyn7 });
  const bangCoKhongChu = dungBangAnhEm({ chuong: '02', chaIds: ['bieu:0201'], luat: luatSyn7, hoSo: khoCoKhongChu, L: L_SYN7 }).bang[0];

  kiem('CA NGƯỢC BẮT BUỘC (ADR-0009 điểm 5): hai dòng GIA_TRI "có X" / "không có X" KHÔNG khai tapDu ⇒ Cổng 7 và bang-anh-em đều gắn HO_PHU đỏ',
    rCoKhongChu.cong[7].loi.some((l) => /bieu:0201.*HO_PHU/.test(l))
    && Boolean(bangCoKhongChu?.co?.includes('HO_PHU')),
    { cong7: rCoKhongChu.cong[7].loi, co: bangCoKhongChu?.co });

  const Q_CUM = 'Hàng có phải cụm tín hiệu gắn nguồn cố định không?';
  const Q_BP = 'Hàng có phải bộ phận nhận biết được của thiết bị hoặc cụm tín hiệu thuộc nhóm này không?';
  const Q_NGUON = 'Nguồn vận hành là hơi nước hay không hoạt động bằng hơi nước?';
  const TAP_DU_NGUON = ['hơi nước', 'không hoạt động bằng hơi nước'];

  const dkChaSyn7 = [
    // 8 điều kiện loại trừ ve: 0 + 4 vế (tổng 16 biến boolean ở cha)
    ...[1, 2, 3, 4, 5, 6, 7, 8].map((i) => dkWith(
      L_SYN7, 'bieu:8543', i, 0, true, 'CO_KHONG', 'NGHIA_THUONG',
      `Hàng có thuộc trường hợp loại trừ chung số ${i} không?`, 'chưa được chi tiết', 'bieu:8543#1',
    )),
    dkWith(L_SYN7, 'bieu:8543', 11, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Có phải thiết bị chuyên dụng hoàn chỉnh không?', 'Thiết bị chuyên dụng', 'bieu:8543#1'),
    dkWith(L_SYN7, 'bieu:8543', 12, 1, true, 'CO_KHONG', 'NGHIA_THUONG', 'Thiết bị chuyên dụng có được ghi ở nơi khác không?', 'chưa được chi tiết hoặc ghi ở nơi khác', 'bieu:8543#1'),
    dkWith(L_SYN7, 'bieu:8543', 21, 2, false, 'CO_KHONG', 'NGHIA_THUONG', 'Có phải bộ phận của thiết bị chuyên dụng không?', 'bộ phận của chúng', 'bieu:8543#1'),
    dkWith(L_SYN7, 'bieu:8543', 22, 2, true, 'CO_KHONG', 'NGHIA_THUONG', 'Bộ phận thiết bị có ghi ở nơi khác không?', 'chưa được chi tiết hoặc ghi ở nơi khác', 'bieu:8543#1'),
    dkWith(L_SYN7, 'bieu:8543', 31, 3, false, 'CO_KHONG', 'NGHIA_THUONG', Q_CUM, 'cụm tín hiệu gắn nguồn cố định', 'bieu:8543#1'),
    dkWith(L_SYN7, 'bieu:8543', 32, 3, false, 'CO_KHONG', 'NGHIA_THUONG', 'Cụm tín hiệu có gắn nguồn cố định thường xuyên không?', 'gắn nguồn cố định', 'bieu:8543#1'),
    dkWith(L_SYN7, 'bieu:8543', 41, 4, false, 'CO_KHONG', 'NGHIA_THUONG', 'Có phải bộ phận của cụm tín hiệu không?', 'bộ phận của chúng', 'bieu:8543#1'),
    dkWith(L_SYN7, 'bieu:8543', 42, 4, true, 'CO_KHONG', 'NGHIA_THUONG', 'Bộ phận cụm tín hiệu có ghi ở nơi khác không?', 'chưa được chi tiết hoặc ghi ở nơi khác', 'bieu:8543#1'),
  ];
  const dkConSyn7KhongTapDu = [
    dkWith(L_SYN7, 'bieu:854310', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Kiểu thiết bị là gì?', 'Thiết bị buồng kín kiểu treo', 'bieu:854310#1', { truc: 'kiểu thiết bị', tap: ['buồng kín kiểu treo'] }),
    dkWith(L_SYN7, 'bieu:854310', 2, 1, false, 'GIA_TRI', 'NGHIA_THUONG', Q_NGUON, 'Thiết bị buồng kín', 'bieu:854310#1', { truc: 'nguồn vận hành', tap: ['hơi nước'] }),
    dkWith(L_SYN7, 'bieu:854310', 3, 1, true, 'CO_KHONG', 'NGHIA_THUONG', 'Có dùng ở khu vực công cộng không?', 'trừ loại dùng ở khu vực công cộng', 'bieu:854310#1'),
    dkWith(L_SYN7, 'bieu:854310', 4, 1, true, 'CO_KHONG', 'NGHIA_THUONG', Q_CUM, 'Cụm tín hiệu gắn nguồn cố định', 'bieu:854390#1'),
    dkWith(L_SYN7, 'bieu:854310', 5, 1, true, 'CO_KHONG', 'NGHIA_THUONG', Q_BP, 'Bộ phận', 'bieu:854399#1'),
    dkWith(L_SYN7, 'bieu:854320', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Kiểu thiết bị là gì?', 'Thiết bị để bàn', 'bieu:854320#1', { truc: 'kiểu thiết bị', tap: ['để bàn'] }),
    dkWith(L_SYN7, 'bieu:854320', 2, 1, false, 'GIA_TRI', 'NGHIA_THUONG', Q_NGUON, 'dùng hơi nước', 'bieu:854320#1', { truc: 'nguồn vận hành', tap: ['hơi nước'] }),
    dkWith(L_SYN7, 'bieu:854320', 3, 1, true, 'CO_KHONG', 'NGHIA_THUONG', Q_CUM, 'Cụm tín hiệu gắn nguồn cố định', 'bieu:854390#1'),
    dkWith(L_SYN7, 'bieu:854320', 4, 1, true, 'CO_KHONG', 'NGHIA_THUONG', Q_BP, 'Bộ phận', 'bieu:854399#1'),
    dkWith(L_SYN7, 'bieu:854330', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Kiểu thiết bị là gì?', 'Dây thiết bị', 'bieu:854330#1', { truc: 'kiểu thiết bị', tap: ['dây thiết bị'] }),
    dkWith(L_SYN7, 'bieu:854330', 2, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Có dùng cho nghi lễ không?', 'dùng cho nghi lễ', 'bieu:854330#1'),
    dkWith(L_SYN7, 'bieu:854330', 3, 1, true, 'CO_KHONG', 'NGHIA_THUONG', Q_CUM, 'Cụm tín hiệu gắn nguồn cố định', 'bieu:854390#1'),
    dkWith(L_SYN7, 'bieu:854330', 4, 1, true, 'CO_KHONG', 'NGHIA_THUONG', Q_BP, 'Bộ phận', 'bieu:854399#1'),
    dkWith(L_SYN7, 'bieu:854340', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', Q_NGUON, 'hơi nước', 'bieu:854340#1', { truc: 'nguồn vận hành', tap: ['hơi nước'] }),
    dkWith(L_SYN7, 'bieu:854340', 2, 1, true, 'CO_KHONG', 'NGHIA_THUONG', Q_CUM, 'Cụm tín hiệu gắn nguồn cố định', 'bieu:854390#1'),
    dkWith(L_SYN7, 'bieu:854340', 3, 1, true, 'CO_KHONG', 'NGHIA_THUONG', Q_BP, 'Bộ phận', 'bieu:854399#1'),
    dkWith(L_SYN7, 'bieu:854370', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', Q_NGUON, 'không hoạt động bằng hơi nước', 'bieu:854370#1', { truc: 'nguồn vận hành', tap: ['không hoạt động bằng hơi nước'] }),
    dkWith(L_SYN7, 'bieu:854370', 2, 1, true, 'CO_KHONG', 'NGHIA_THUONG', Q_CUM, 'Cụm tín hiệu gắn nguồn cố định', 'bieu:854390#1'),
    dkWith(L_SYN7, 'bieu:854370', 3, 1, true, 'CO_KHONG', 'NGHIA_THUONG', Q_BP, 'Bộ phận', 'bieu:854399#1'),
    dkWith(L_SYN7, 'bieu:854390', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', Q_CUM, 'Cụm tín hiệu gắn nguồn cố định', 'bieu:854390#1'),
    dkWith(L_SYN7, 'bieu:854390', 2, 1, true, 'CO_KHONG', 'NGHIA_THUONG', Q_BP, 'Bộ phận', 'bieu:854399#1'),
    dkWith(L_SYN7, 'bieu:854399', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', Q_BP, 'Bộ phận', 'bieu:854399#1'),
  ];
  const dkConSyn7 = dkConSyn7KhongTapDu.map((r) => (
    r.truc === 'nguồn vận hành'
      ? { ...r, tapDu: TAP_DU_NGUON, tapDuNguon: 'bieu:8543#1', tapDuTrich: 'dùng hơi nước hoặc không hoạt động bằng hơi nước' }
      : r
  ));
  const gcSyn7 = ['bieu:854310', 'bieu:854320', 'bieu:854330'].map((aeId, idx) => ({
    id: `hs:bieu:8543:${8151 + idx}`,
    nut: 'bieu:8543',
    loai: 'GIAI_CHONG',
    cap: [aeId, 'bieu:854340'],
    cach: 'TRU',
    trich: 'Thiết bị dùng hơi nước khác',
    nguon: 'bieu:854340#1',
    vanTay: vanTay(L_SYN7.chuCau('bieu:854340#1')),
  }));

  // Ca dương 1: tapDu khai trên mọi anh em cùng trục
  const khoSyn7Ok = ghiHoSoTam({ dkList: [...dkChaSyn7, ...dkConSyn7, ...gcSyn7] });
  const rSyn7Ok = chayCong({ luat: luatSyn7, hoSo: khoSyn7Ok, phamVi: ['bieu:8543'], chiTrong: true, cong: [6, 7], L: L_SYN7, bieuMeta: metaSyn7 });

  // Ca dương 2: tapDu khai MỘT lần ở điều kiện nút cha (anh em không lặp tapDu)
  const dkChaCoTapDu = [
    ...dkChaSyn7,
    dkWith(L_SYN7, 'bieu:8543', 13, 1, false, 'GIA_TRI', 'NGHIA_THUONG', Q_NGUON, 'Thiết bị chuyên dụng', 'bieu:8543#1', {
      truc: 'nguồn vận hành',
      tap: TAP_DU_NGUON,
      tapDu: TAP_DU_NGUON,
      tapDuNguon: 'bieu:8543#1',
      tapDuTrich: 'dùng hơi nước hoặc không hoạt động bằng hơi nước',
    }),
  ];
  const khoSyn7ChaTapDu = ghiHoSoTam({ dkList: [...dkChaCoTapDu, ...dkConSyn7KhongTapDu, ...gcSyn7] });
  const rSyn7ChaTapDu = chayCong({ luat: luatSyn7, hoSo: khoSyn7ChaTapDu, phamVi: ['bieu:8543'], chiTrong: true, cong: [6, 7], L: L_SYN7, bieuMeta: metaSyn7 });

  // Ca âm 14B-0: cùng 7 con chữ "hơi nước" / "không hoạt động bằng hơi nước" nhưng KHÔNG khai tapDu ở cả cha lẫn con -> HO_PHU
  const khoSyn7ThieuTapDu = ghiHoSoTam({ dkList: [...dkChaSyn7, ...dkConSyn7KhongTapDu, ...gcSyn7] });
  const rSyn7ThieuTapDu = chayCong({ luat: luatSyn7, hoSo: khoSyn7ThieuTapDu, phamVi: ['bieu:8543'], chiTrong: true, cong: [7], L: L_SYN7, bieuMeta: metaSyn7 });

  // Ca âm 14B-1: tapDu có 3 giá trị hợp lệ ["hơi nước", "không hoạt động bằng hơi nước", "thiết bị điện"] nhưng các con chỉ phủ 2 giá trị -> HO_PHU
  const khoSyn7HutTapDu = ghiHoSoTam({
    dkList: [
      ...dkChaSyn7,
      ...dkConSyn7.map((r) => (
        r.truc === 'nguồn vận hành'
          ? {
            ...r,
            tapDu: [...TAP_DU_NGUON, 'thiết bị điện'],
            tapDuNguon: ['bieu:8543#1', 'chuong:85#1'],
            tapDuTrich: ['dùng hơi nước hoặc không hoạt động bằng hơi nước', 'thiết bị điện'],
          }
          : r
      )),
      ...gcSyn7,
    ],
  });
  const rSyn7HutTapDu = chayCong({ luat: luatSyn7, hoSo: khoSyn7HutTapDu, phamVi: ['bieu:8543'], chiTrong: true, cong: [7], L: L_SYN7, bieuMeta: metaSyn7 });

  // Ca âm 14B-2: thêm điều kiện thu hẹp giả vào phần bù có tên 854340 -> HO_PHU
  const khoSyn7ThuHep = ghiHoSoTam({
    dkList: [
      ...dkChaSyn7,
      ...dkConSyn7,
      dkWith(L_SYN7, 'bieu:854340', 9, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Chỉ dùng ngoài trời?', 'hơi nước', 'bieu:854340#1'),
      ...gcSyn7,
    ],
  });
  const rSyn7ThuHep = chayCong({ luat: luatSyn7, hoSo: khoSyn7ThuHep, phamVi: ['bieu:8543'], chiTrong: true, cong: [7], L: L_SYN7, bieuMeta: metaSyn7 });

  // Kiểm thêm tinhTruAnhEm: khi cùng cặp vừa có cach:'TRU' (nguon thuộc con dưới) vừa có cach:'CHU_GIAI', KHÔNG được rơi mất truAnhEm
  const gcSyn7KemChuGiai = [
    ...gcSyn7,
    {
      id: 'hs:bieu:8543:8161',
      nut: 'bieu:8543',
      loai: 'GIAI_CHONG',
      cap: ['bieu:854310', 'bieu:854340'],
      cach: 'CHU_GIAI',
      trich: 'Thiết bị buồng kín kiểu treo',
      nguon: 'bieu:854310#1',
      vanTay: vanTay(L_SYN7.chuCau('bieu:854310#1')),
    },
  ];
  const dkMapSyn7 = new Map();
  for (const r of dkConSyn7) {
    if (!dkMapSyn7.has(r.nut)) dkMapSyn7.set(r.nut, []);
    dkMapSyn7.get(r.nut).push(r);
  }
  const tru40KemCg = tinhTruAnhEm(
    'bieu:854340',
    'bieu:8543',
    ['bieu:854310', 'bieu:854320', 'bieu:854330', 'bieu:854340', 'bieu:854370', 'bieu:854390', 'bieu:854399'],
    L_SYN7,
    metaSyn7,
    dkMapSyn7,
    gcSyn7KemChuGiai,
  );

  kiem('Cổng 7 (tổng hợp phần bù có tên + tapDu cha/anh em + 16 biến cha + TRU kèm CHU_GIAI): phủ kín 0 HO_PHU; thiếu tapDu / hụt phần tử tapDu / thu hẹp ⇒ đỏ HO_PHU',
    laPhanBuCoTen('bieu:854340', L_SYN7, metaSyn7) === true
    && JSON.stringify(tru40KemCg) === JSON.stringify(['bieu:854310', 'bieu:854320', 'bieu:854330'])
    && rSyn7Ok.cong[6].loi.length === 0
    && rSyn7Ok.cong[7].loi.length === 0
    && rSyn7ChaTapDu.cong[6].loi.length === 0
    && rSyn7ChaTapDu.cong[7].loi.length === 0
    && rSyn7ThieuTapDu.cong[7].loi.some((l) => /bieu:8543.*HO_PHU/.test(l))
    && rSyn7HutTapDu.cong[7].loi.some((l) => /bieu:8543.*HO_PHU/.test(l))
    && rSyn7ThuHep.cong[7].loi.some((l) => /bieu:8543.*HO_PHU/.test(l)),
    {
      tru40KemCg,
      ok6: rSyn7Ok.cong[6].loi,
      ok7: rSyn7Ok.cong[7].loi,
      chaTapDu6: rSyn7ChaTapDu.cong[6].loi,
      chaTapDu7: rSyn7ChaTapDu.cong[7].loi,
      thieuTapDu: rSyn7ThieuTapDu.cong[7].loi,
      hutTapDu: rSyn7HutTapDu.cong[7].loi,
      thuHep: rSyn7ThuHep.cong[7].loi,
    });

  // 14C. Cổng 10 / doBangAnhEm: chặn chốt sớm khi anh em còn undefined (trục daTri:true, khác trục CHUA_CHUNG_MINH_TACH, GIAI_CHONG ngược thứ tự)
  //      và đối chứng đi thẳng DICH khi đã loại trừ chắc chắn (GIAI_CHONG xuôi thứ tự, !daTri, laPhuCuaNhau, SO rời dải, hoặc gán false)
  // (1) Trục đa trị daTri:true không có GIAI_CHONG (42022210 undefined, 42022220 true)
  const dkRouteDaTri = [
    ...DUNG_42022.filter((x) => !['bieu:42022210', 'bieu:42022220'].includes(x.nut)),
    dk('bieu:42022210', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Kiểu cấp nhiệt là gì (tích trữ / trực tiếp)?', 'tấm plastic', 'bieu:42022210#1', { truc: 'kiểu cấp nhiệt', daTri: true, tap: ['tích trữ', 'trực tiếp'] }),
    dk('bieu:42022220', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Có phải kiểu nhúng trong bồn không?', 'vật liệu dệt', 'bieu:42022220#1', { truc: 'kiểu cấp nhiệt', daTri: true, tap: ['nhúng bồn'] }),
  ];
  const khoRouteDaTri = ghiHoSoTam({ dkList: dkRouteDaTri });
  const bangRouteDaTri = new Map(dungBangAnhEm({ chuong: '42', chaIds: ['bieu:420222'], luat: LUAT, hoSo: khoRouteDaTri, L }).bang.map((b) => [b.cha, b]));
  const kqDaTriUndef = doBangAnhEm('bieu:420222', { 'hs:bieu:42022220:8101': true }, bangRouteDaTri);
  const kqDaTriFalse = doBangAnhEm('bieu:420222', { 'hs:bieu:42022210:8101': false, 'hs:bieu:42022220:8101': true }, bangRouteDaTri);
  const c10DaTriPass = chayCong({
    luat: LUAT,
    hoSo: khoRouteDaTri,
    phamVi: ['bieu:420222'],
    chiTrong: true,
    cong: [10],
    L,
    viDu: [{ trich: 'Thiếu dữ kiện nhánh đa trị đứng trước', cha: 'bieu:420222', ganDieuKien: { 'hs:bieu:42022220:8101': true }, dich: null, duKien: ['hs:bieu:42022210:8101'] }],
  });
  const c10DaTriFailDich = chayCong({
    luat: LUAT,
    hoSo: khoRouteDaTri,
    phamVi: ['bieu:420222'],
    chiTrong: true,
    cong: [10],
    L,
    viDu: [{ trich: 'Cấm chốt sớm DICH khi nhánh đa trị kia undefined', cha: 'bieu:420222', ganDieuKien: { 'hs:bieu:42022220:8101': true }, dich: 'bieu:42022220' }],
  });

  // (2) Hai nhánh khác trục (CHUA_CHUNG_MINH_TACH): nhánh đứng trên true, nhánh đứng dưới undefined -> bắt buộc RE_NHANH
  const dkRouteKhacTruc = [
    ...DUNG_42022.filter((x) => !['bieu:42022210', 'bieu:42022220'].includes(x.nut)),
    dk('bieu:42022210', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Kiểu chi tiết bộ phận là gì?', 'tấm plastic', 'bieu:42022210#1', { truc: 'kiểu chi tiết', tap: ['khung chụp'] }),
    dk('bieu:42022220', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Bộ phận dùng cho thiết bị chủ nào?', 'vật liệu dệt', 'bieu:42022220#1', { truc: 'thiết bị chủ', daTri: true, tap: ['máy chuyên dụng'] }),
  ];
  const khoRouteKhacTruc = ghiHoSoTam({ dkList: dkRouteKhacTruc });
  const bangRouteKhacTruc = new Map(dungBangAnhEm({ chuong: '42', chaIds: ['bieu:420222'], luat: LUAT, hoSo: khoRouteKhacTruc, L }).bang.map((b) => [b.cha, b]));
  const kqKhacTrucUndef = doBangAnhEm('bieu:420222', { 'hs:bieu:420222:8101': true, 'hs:bieu:42022210:8101': true }, bangRouteKhacTruc);
  const kqKhacTrucFalse = doBangAnhEm('bieu:420222', { 'hs:bieu:420222:8101': true, 'hs:bieu:42022210:8101': true, 'hs:bieu:42022220:8101': false }, bangRouteKhacTruc);

  // (3) GIAI_CHONG:
  //     - cach:'TRU' có nguon thuộc nhánh dưới (42022220#1): trên true + dưới undefined -> DICH trên; trên undefined + dưới true -> RE_NHANH
  //     - cach:'TRU' có nguon thuộc nhánh trên (42022210#1, nhánh trên tự trừ nhánh dưới): dưới true + trên undefined -> DICH dưới
  //     - cach:'CHU_GIAI' / 'QUY_TAC_3' (đối xứng, nhánh sau có thể thắng nhánh trước): cả hai chiều một bên true + bên kia undefined -> BẮT BUỘC dừng RE_NHANH
  const gcRouteTruDuoi = {
    id: 'hs:bieu:420222:8151',
    nut: 'bieu:420222',
    loai: 'GIAI_CHONG',
    cap: ['bieu:42022210', 'bieu:42022220'],
    cach: 'TRU',
    trich: 'vật liệu dệt',
    nguon: 'bieu:42022220#1',
    vanTay: vanTay(L.chuCau('bieu:42022220#1')),
  };
  const khoRouteTruDuoi = ghiHoSoTam({ dkList: [...dkRouteKhacTruc, gcRouteTruDuoi] });
  const bangRouteTruDuoi = new Map(dungBangAnhEm({ chuong: '42', chaIds: ['bieu:420222'], luat: LUAT, hoSo: khoRouteTruDuoi, L }).bang.map((b) => [b.cha, b]));
  const kqTruTrenThang = doBangAnhEm('bieu:420222', { 'hs:bieu:42022210:8101': true }, bangRouteTruDuoi);
  const kqTruDuoiChoTren = doBangAnhEm('bieu:420222', { 'hs:bieu:42022:8101': true, 'hs:bieu:420222:8101': true, 'hs:bieu:42022220:8101': true }, bangRouteTruDuoi);

  const gcRouteTruTren = {
    id: 'hs:bieu:420222:8152',
    nut: 'bieu:420222',
    loai: 'GIAI_CHONG',
    cap: ['bieu:42022210', 'bieu:42022220'],
    cach: 'TRU',
    trich: 'tấm plastic',
    nguon: 'bieu:42022210#1',
    vanTay: vanTay(L.chuCau('bieu:42022210#1')),
  };
  const khoRouteTruTren = ghiHoSoTam({ dkList: [...dkRouteKhacTruc, gcRouteTruTren] });
  const bangRouteTruTren = new Map(dungBangAnhEm({ chuong: '42', chaIds: ['bieu:420222'], luat: LUAT, hoSo: khoRouteTruTren, L }).bang.map((b) => [b.cha, b]));
  const kqTruNguocDuoiThang = doBangAnhEm('bieu:420222', { 'hs:bieu:42022220:8101': true }, bangRouteTruTren);

  const gcRouteCg = {
    id: 'hs:bieu:420222:8153',
    nut: 'bieu:420222',
    loai: 'GIAI_CHONG',
    cap: ['bieu:42022210', 'bieu:42022220'],
    cach: 'CHU_GIAI',
    trich: 'tấm plastic hoặc vật liệu dệt',
    nguon: 'bieu:420222#1',
    vanTay: vanTay(L.chuCau('bieu:420222#1')),
  };
  const khoRouteCg = ghiHoSoTam({ dkList: [...dkRouteKhacTruc, gcRouteCg] });
  const bangRouteCg = new Map(dungBangAnhEm({ chuong: '42', chaIds: ['bieu:420222'], luat: LUAT, hoSo: khoRouteCg, L }).bang.map((b) => [b.cha, b]));
  const kqCgTrenChoDuoi = doBangAnhEm('bieu:420222', { 'hs:bieu:42022210:8101': true }, bangRouteCg);
  const kqCgDuoiChoTren = doBangAnhEm('bieu:420222', { 'hs:bieu:42022220:8101': true }, bangRouteCg);

  const gcRouteQt3 = { ...gcRouteCg, id: 'hs:bieu:420222:8154', cach: 'QUY_TAC_3' };
  const khoRouteQt3 = ghiHoSoTam({ dkList: [...dkRouteKhacTruc, gcRouteQt3] });
  const bangRouteQt3 = new Map(dungBangAnhEm({ chuong: '42', chaIds: ['bieu:420222'], luat: LUAT, hoSo: khoRouteQt3, L }).bang.map((b) => [b.cha, b]));
  const kqQt3TrenChoDuoi = doBangAnhEm('bieu:420222', { 'hs:bieu:42022210:8101': true }, bangRouteQt3);
  const kqQt3DuoiChoTren = doBangAnhEm('bieu:420222', { 'hs:bieu:42022220:8101': true }, bangRouteQt3);

  // (4) Đối chứng rời nhau hoàn toàn: (a) trục đơn trị !daTri; (b) laPhuCuaNhau; (c) SO rời dải
  const bangDonTri = new Map(dungBangAnhEm({ chuong: '42', chaIds: ['bieu:420222'], luat: LUAT, hoSo: KHO_CHUAN, L }).bang.map((b) => [b.cha, b]));
  const kqDonTriDich = doBangAnhEm('bieu:420222', { 'hs:bieu:42022210:8101': true }, bangDonTri);

  const dkRoutePhu = [
    dk('bieu:42022210', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Có khung gia cường không?', 'tấm plastic', 'bieu:42022210#1'),
    dk('bieu:42022220', 1, 1, true, 'CO_KHONG', 'NGHIA_THUONG', 'Có khung gia cường không?', 'vật liệu dệt', 'bieu:42022220#1'),
  ];
  const khoRoutePhu = ghiHoSoTam({ dkList: dkRoutePhu });
  const bangRoutePhu = new Map(dungBangAnhEm({ chuong: '42', chaIds: ['bieu:420222'], luat: LUAT, hoSo: khoRoutePhu, L }).bang.map((b) => [b.cha, b]));
  const kqPhuDich = doBangAnhEm('bieu:420222', { 'hs:bieu:42022220:8101': false }, bangRoutePhu); // phu:true với val=false => true, nhánh kia undefined nhưng bù nhau => DICH

  const ngRoi1 = { ...ng5W, id: 'hs:bieu:42022210:7401', nut: 'bieu:42022210', cau: 'bieu:85011022#1', nguong: { daiLuong: 'công suất', donVi: 'W', tu: null, den: 5, gomTu: false, gomDen: true } };
  const ngRoi2 = { ...ng5W, id: 'hs:bieu:42022220:7401', nut: 'bieu:42022220', cau: 'bieu:85011022#1', nguong: { daiLuong: 'công suất', donVi: 'W', tu: 5, den: null, gomTu: false, gomDen: false } };
  const khoRouteSo = ghiHoSoTam({
    dkList: [
      dk('bieu:42022210', 1, 1, false, 'SO', 'NGUONG', 'Công suất <= 5 W?', 'công suất không quá 5 W', 'bieu:85011022#1', { nguong: ngRoi1.id }),
      dk('bieu:42022220', 1, 1, false, 'SO', 'NGUONG', 'Công suất > 5 W?', 'công suất không quá 5 W', 'bieu:85011022#1', { nguong: ngRoi2.id }),
    ],
    nguongList: [ngRoi1, ngRoi2],
  });
  const bangRouteSo = new Map(dungBangAnhEm({ chuong: '42', chaIds: ['bieu:420222'], luat: LUAT, hoSo: khoRouteSo, L }).bang.map((b) => [b.cha, b]));
  const kqSoRoiDich = doBangAnhEm('bieu:420222', { 'hs:bieu:42022220:8101': true }, bangRouteSo, { hoSo: khoRouteSo });

  // (5) thuThapIdChuaRoCongThuc: không hỏi thừa câu hỏi của anh em đã chứng minh rời nhau với nhánh true khi bị nhánh chuaRoChan trỏ truAnhEm
  const TAP_DU_MOI_TRUONG = ['tàu thuyền', 'nhà tắm', 'phòng thí nghiệm', 'xưởng đúc', 'hầm lò', 'kho lạnh'];
  const TD_MT = {
    tapDu: TAP_DU_MOI_TRUONG,
    tapDuNguon: 'nhom:8543:ct:99#1',
    tapDuTrich: 'tàu thuyền, nhà tắm, phòng thí nghiệm, xưởng đúc, hầm lò hoặc kho lạnh',
  };
  const dk3Ae = [
    dkWith(L_SYN7, 'bieu:854310', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Môi trường lắp đặt là gì?', 'Thiết bị buồng kín kiểu treo', 'bieu:854310#1', { truc: 'môi trường lắp đặt', tap: ['tàu thuyền'], ...TD_MT }),
    dkWith(L_SYN7, 'bieu:854320', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Môi trường lắp đặt là gì?', 'Thiết bị để bàn', 'bieu:854320#1', { truc: 'môi trường lắp đặt', tap: ['nhà tắm'], ...TD_MT }),
    dkWith(L_SYN7, 'bieu:854330', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Có phải loại bơm hơi không?', 'Dây thiết bị', 'bieu:854330#1'),
    dkWith(L_SYN7, 'bieu:854340', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Môi trường lắp đặt là gì?', 'hơi nước', 'bieu:854340#1', { truc: 'môi trường lắp đặt', tap: ['phòng thí nghiệm'], ...TD_MT }),
    dkWith(L_SYN7, 'bieu:854370', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Môi trường lắp đặt là gì?', 'không hoạt động bằng hơi nước', 'bieu:854370#1', { truc: 'môi trường lắp đặt', tap: ['xưởng đúc'], ...TD_MT }),
    dkWith(L_SYN7, 'bieu:854390', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Môi trường lắp đặt là gì?', 'Cụm tín hiệu gắn nguồn cố định', 'bieu:854390#1', { truc: 'môi trường lắp đặt', tap: ['hầm lò'], ...TD_MT }),
    dkWith(L_SYN7, 'bieu:854399', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Môi trường lắp đặt là gì?', 'Bộ phận', 'bieu:854399#1', { truc: 'môi trường lắp đặt', tap: ['kho lạnh'], ...TD_MT }),
    {
      id: 'hs:bieu:8543:8159',
      nut: 'bieu:8543',
      loai: 'GIAI_CHONG',
      cap: ['bieu:854310', 'bieu:854330'],
      cach: 'TRU',
      trich: 'Dây thiết bị',
      nguon: 'bieu:854330#1',
      vanTay: vanTay(L_SYN7.chuCau('bieu:854330#1')),
    },
  ];
  const kho3Ae = ghiHoSoTam({ dkList: dk3Ae });
  const bang3Ae = new Map(dungBangAnhEm({ chuong: '85', chaIds: ['bieu:8543'], luat: luatSyn7, hoSo: kho3Ae, L: L_SYN7 }).bang.map((b) => [b.cha, b]));
  // 854320 ("nhà tắm") = true => 854310 ("tàu thuyền") đã rời nhau theo trục đơn trị có tapDu; 854330 có truAnhEm:[854310] chỉ được hỏi 854330:8101, cấm hỏi 854310:8101!
  const kqKhongHoiThua = doBangAnhEm('bieu:8543', { 'hs:bieu:854320:8101': true }, bang3Ae);

  kiem('Cổng 10 & doBangAnhEm (chặn nhảy cóc qua undefined + phân biệt TRU một chiều với CHU_GIAI/QUY_TAC_3 + không hỏi thừa anh em đã rời nhau)',
    kqDaTriUndef.trangThai === 'RE_NHANH'
    && JSON.stringify(kqDaTriUndef.thieuIds) === JSON.stringify(['hs:bieu:42022210:8101'])
    && kqDaTriFalse.trangThai === 'DICH' && kqDaTriFalse.dich === 'bieu:42022220'
    && !c10DaTriPass.cong[10].loi.length
    && c10DaTriFailDich.cong[10].loi.length === 1
    && kqKhacTrucUndef.trangThai === 'RE_NHANH'
    && JSON.stringify(kqKhacTrucUndef.thieuIds) === JSON.stringify(['hs:bieu:42022220:8101'])
    && kqKhacTrucFalse.trangThai === 'DICH' && kqKhacTrucFalse.dich === 'bieu:42022210'
    && kqTruTrenThang.trangThai === 'DICH' && kqTruTrenThang.dich === 'bieu:42022210'
    && kqTruDuoiChoTren.trangThai === 'RE_NHANH'
    && JSON.stringify(kqTruDuoiChoTren.thieuIds) === JSON.stringify(['hs:bieu:42022210:8101'])
    && kqTruNguocDuoiThang.trangThai === 'DICH' && kqTruNguocDuoiThang.dich === 'bieu:42022220'
    && kqCgTrenChoDuoi.trangThai === 'RE_NHANH'
    && JSON.stringify(kqCgTrenChoDuoi.thieuIds) === JSON.stringify(['hs:bieu:42022220:8101'])
    && kqCgDuoiChoTren.trangThai === 'RE_NHANH'
    && JSON.stringify(kqCgDuoiChoTren.thieuIds) === JSON.stringify(['hs:bieu:42022210:8101'])
    && kqQt3TrenChoDuoi.trangThai === 'RE_NHANH'
    && kqQt3DuoiChoTren.trangThai === 'RE_NHANH'
    && kqDonTriDich.trangThai === 'DICH' && kqDonTriDich.dich === 'bieu:42022210'
    && kqPhuDich.trangThai === 'DICH' && kqPhuDich.dich === 'bieu:42022220'
    && kqSoRoiDich.trangThai === 'DICH' && kqSoRoiDich.dich === 'bieu:42022220'
    && kqKhongHoiThua.trangThai === 'RE_NHANH'
    && JSON.stringify(kqKhongHoiThua.chuaRo) === JSON.stringify(['bieu:854330'])
    && JSON.stringify(kqKhongHoiThua.thieuIds) === JSON.stringify(['hs:bieu:854330:8101']),
    {
      kqDaTriUndef,
      kqKhacTrucUndef,
      kqTruTrenThang,
      kqTruDuoiChoTren,
      kqTruNguocDuoiThang,
      kqCgTrenChoDuoi,
      kqCgDuoiChoTren,
      kqQt3TrenChoDuoi,
      kqQt3DuoiChoTren,
      kqDonTriDich,
      kqPhuDich,
      kqSoRoiDich,
      kqKhongHoiThua,
    });

  // 14D. Bổ sung QT (#2410#issuecomment-7222984124):
  //   (a) Cổng 8 chỉ coi hai anh em GIA_TRI dương là rời nhau khi !daTri VÀ có tapDu hợp lệ; thiếu tapDu -> CHUA_CHUNG_MINH_TACH
  //   (b) Xếp hạng cảnh báo Cổng 8 đưa toàn bộ cặp [cùng trục: ...] lên đầu trước [khác trục], và CLI cong.mjs in đủ >20 dòng không cắt
  const dkC8KhongTapDu = [
    dk('bieu:42022210', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Mặt ngoài?', 'tấm plastic', 'bieu:42022210#1', { truc: 'chất liệu mặt ngoài', daTri: false, tap: ['tấm plastic'] }),
    dk('bieu:42022220', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Mặt ngoài?', 'vật liệu dệt', 'bieu:42022220#1', { truc: 'chất liệu mặt ngoài', daTri: false, tap: ['vật liệu dệt'] }),
  ];
  const khoC8KhongTapDu = ghiHoSoTam({ dkList: dkC8KhongTapDu });
  const r8KhongTapDu = chayCong({ luat: LUAT, hoSo: khoC8KhongTapDu, phamVi: ['bieu:420222'], chiTrong: true, cong: [8], L });
  const bang8KhongTapDu = dungBangAnhEm({ chuong: '42', chaIds: ['bieu:420222'], luat: LUAT, hoSo: khoC8KhongTapDu, L }).bang[0];

  const dkC8CoTapDu = dkC8KhongTapDu.map((r) => ({
    ...r,
    tapDu: ['tấm plastic', 'vật liệu dệt'],
    tapDuNguon: 'bieu:420222#1',
    tapDuTrich: 'tấm plastic hoặc vật liệu dệt',
  }));
  const khoC8CoTapDu = ghiHoSoTam({ dkList: dkC8CoTapDu });
  const r8CoTapDu = chayCong({ luat: LUAT, hoSo: khoC8CoTapDu, phamVi: ['bieu:420222'], chiTrong: true, cong: [8], L });
  const bang8CoTapDu = dungBangAnhEm({ chuong: '42', chaIds: ['bieu:420222'], luat: LUAT, hoSo: khoC8CoTapDu, L }).bang[0];

  // Bảng 8 con đều không phải phần bù (C(8,2) = 28 cặp > 20 dòng): 5 con đầu là CO_KHONG ([khác trục]), 3 con cuối cùng trục GIA_TRI không tapDu (3 cặp [cùng trục] nằm cuối thứ tự cây nhưng phải lên đầu canhBao!)
  const luatSyn8 = path.join(TAM, 'luat-syn8');
  fs.cpSync(luatSyn7, luatSyn8, { recursive: true });
  const ten40KhongPhanBu = '- Thiết bị dẫn hơi nước:';
  const themCon98 = { ...themCon99, id: 'bieu:854398', nguyenVan: '- Bộ phát tín hiệu phụ trợ' };
  const bieu8Txt = fs.readFileSync(path.join(luatSyn8, 'bieu.jsonl'), 'utf8').trim().split('\n').map((l) => {
    const o = JSON.parse(l);
    if (o.id === 'bieu:854340') o.nguyenVan = ten40KhongPhanBu;
    return JSON.stringify(o);
  });
  const idx99 = bieu8Txt.findIndex((l) => JSON.parse(l).id === 'bieu:854399');
  bieu8Txt.splice(idx99, 0, JSON.stringify(themCon98));
  fs.writeFileSync(path.join(luatSyn8, 'bieu.jsonl'), `${bieu8Txt.join('\n')}\n`, 'utf8');
  const cau8Txt = fs.readFileSync(path.join(luatSyn8, 'cau', 'bieu.jsonl'), 'utf8').trim().split('\n').map((l) => {
    const o = JSON.parse(l);
    if (o.id === 'bieu:854340#1') return JSON.stringify({ id: 'bieu:854340#1', tu: 0, den: ten40KhongPhanBu.length });
    return l;
  });
  cau8Txt.push(JSON.stringify({ id: 'bieu:854398#1', tu: 0, den: themCon98.nguyenVan.length }));
  fs.writeFileSync(path.join(luatSyn8, 'cau', 'bieu.jsonl'), `${cau8Txt.join('\n')}\n`, 'utf8');
  const L_SYN8 = napLuatCong(luatSyn8);

  const dkRank8 = [
    dkWith(L_SYN8, 'bieu:854310', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Nhánh độc lập 1?', 'Thiết bị buồng kín kiểu treo', 'bieu:854310#1'),
    dkWith(L_SYN8, 'bieu:854320', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Nhánh độc lập 2?', 'Thiết bị để bàn', 'bieu:854320#1'),
    dkWith(L_SYN8, 'bieu:854330', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Nhánh độc lập 3?', 'Dây thiết bị', 'bieu:854330#1'),
    dkWith(L_SYN8, 'bieu:854340', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Nhánh độc lập 4?', 'hơi nước', 'bieu:854340#1'),
    dkWith(L_SYN8, 'bieu:854370', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Nhánh độc lập 5?', 'không hoạt động bằng hơi nước', 'bieu:854370#1'),
    dkWith(L_SYN8, 'bieu:854390', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Nhóm tín hiệu là gì?', 'Cụm tín hiệu gắn nguồn cố định', 'bieu:854390#1', { truc: 'nhóm tín hiệu', tap: ['cụm cố định'] }),
    dkWith(L_SYN8, 'bieu:854398', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Nhóm tín hiệu là gì?', 'Bộ phát tín hiệu phụ trợ', 'bieu:854398#1', { truc: 'nhóm tín hiệu', tap: ['bộ phát phụ trợ'] }),
    dkWith(L_SYN8, 'bieu:854399', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Nhóm tín hiệu là gì?', 'Bộ phận', 'bieu:854399#1', { truc: 'nhóm tín hiệu', tap: ['bộ phận'] }),
  ];
  const khoRank8 = ghiHoSoTam({ dkList: dkRank8 });
  const rRank8 = chayCong({ luat: luatSyn8, hoSo: khoRank8, phamVi: ['bieu:8543'], chiTrong: true, cong: [8], L: L_SYN8 });
  const cliRank8 = spawnSync(
    process.execPath,
    [path.join(GOC, 'scripts/ho-so-ma/cong.mjs'), '--luat', luatSyn8, '--ho-so', khoRank8, '--pham-vi', 'bieu:8543', '--chi-trong', '--cong', '8'],
    { encoding: 'utf8' },
  );
  const dongCanhBaoCli = (cliRank8.stdout || '').split('\n').filter((l) => l.startsWith('  ! '));

  kiem('Cổng 8 (bổ sung ADR-0009 điểm 5): GIA_TRI thiếu tapDu -> CHUA_CHUNG_MINH_TACH, có tapDu -> roiNhau; xếp [cùng trục] lên đầu & CLI in trọn 28 dòng không cắt 20',
    r8KhongTapDu.cong[8].dem.roiNhau === 0
    && r8KhongTapDu.cong[8].dem.chuaChungMinhTach === 1
    && r8KhongTapDu.cong[8].dem.cungTruc === 1
    && r8KhongTapDu.cong[8].canhBao[0]?.includes('[cùng trục: chất liệu mặt ngoài — thiếu tapDu]')
    && bang8KhongTapDu.co.includes('CHUA_CHUNG_MINH_TACH')
    && r8CoTapDu.cong[8].dem.roiNhau === 1
    && r8CoTapDu.cong[8].dem.chuaChungMinhTach === 0
    && !bang8CoTapDu.co.includes('CHUA_CHUNG_MINH_TACH')
    && rRank8.cong[8].canhBao.length === 28
    && rRank8.cong[8].dem.cungTruc === 3
    && rRank8.cong[8].canhBao.slice(0, 3).every((l) => l.includes('[cùng trục: nhóm tín hiệu — thiếu tapDu] CHUA_CHUNG_MINH_TACH giữa'))
    && rRank8.cong[8].canhBao.slice(3).every((l) => l.includes('[khác trục] CHUA_CHUNG_MINH_TACH giữa'))
    && cliRank8.status === 0
    && dongCanhBaoCli.length === 28
    && dongCanhBaoCli.slice(0, 3).every((l) => l.includes('[cùng trục: nhóm tín hiệu — thiếu tapDu]')),
    {
      noTapDu: r8KhongTapDu.cong[8],
      withTapDu: r8CoTapDu.cong[8],
      rankTop4: rRank8.cong[8].canhBao.slice(0, 4),
      cliCount: dongCanhBaoCli.length,
    });
}

// ---------- 15. Hồi quy bắt buộc tapDuNguon + tapDuTrich (Cổng 4, 6, 7, 8, Khuôn & tach-dieu-kien — #2441#issuecomment-7224035193) ----------
{
  const recBase = dk('bieu:42022210', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Chất liệu mặt ngoài?', 'tấm plastic', 'bieu:42022210#1', {
    truc: 'chất liệu mặt ngoài',
    tap: ['tấm plastic'],
    tapDu: ['tấm plastic', 'vật liệu dệt'],
    tapDuNguon: 'bieu:420222#1',
    tapDuTrich: 'tấm plastic hoặc vật liệu dệt',
  });
  const recArrOk = {
    ...recBase,
    tapDuNguon: ['bieu:420222#1', 'chuong:39:cg:1#2'],
    tapDuTrich: ['tấm plastic hoặc vật liệu dệt', 'plastic'],
  };

  // Ca âm 4 (Khuôn): thiếu cặp, lệch độ dài mảng, mảng rỗng, lệch kiểu, trỏ tb:/wco:, hoặc đặt trên bản ghi không có tapDu / sai kiểu / daTri:true
  const { tapDuTrich: _b1, ...thieuTrich } = recBase;
  const { tapDuNguon: _b2, ...thieuNguon } = recBase;
  const { tapDu: _b3, ...thieuTapDu } = recBase;
  const lechDoDai = { ...recBase, tapDuNguon: ['bieu:420222#1', 'chuong:39:cg:1#2'], tapDuTrich: ['tấm plastic hoặc vật liệu dệt'] };
  const mangRong = { ...recBase, tapDuNguon: [], tapDuTrich: [] };
  const lechKieu = { ...recBase, tapDuNguon: ['bieu:420222#1'], tapDuTrich: 'tấm plastic hoặc vật liệu dệt' };
  const troTb = { ...recBase, tapDuNguon: 'tb:1-2023:4202#1', tapDuTrich: 'tấm plastic' };
  const troWco = { ...recBase, tapDuNguon: 'wco:420222:1#1', tapDuTrich: 'tấm plastic' };
  const troWcoMang = { ...recBase, tapDuNguon: ['bieu:420222#1', 'wco:420222:1#1'], tapDuTrich: ['tấm plastic', 'vật liệu dệt'] };
  const trenDaTri = { ...recBase, daTri: true };
  const trenCk = {
    ...dk('bieu:85437050', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Có phải bộ khuếch đại vi sóng không?', 'Bộ khuếch đại vi sóng', 'bieu:85437050#1'),
    tapDuNguon: 'bieu:85437050#1',
    tapDuTrich: 'Bộ khuếch đại vi sóng',
  };
  const chiCoTapDuKhongNguon = dk('bieu:42022210', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Chất liệu?', 'tấm plastic', 'bieu:42022210#1', {
    truc: 'chất liệu mặt ngoài',
    tap: ['tấm plastic'],
    tapDu: ['tấm plastic', 'vật liệu dệt'],
  });

  kiem('CA NGƯỢC 4 (Khuôn tapDuNguon/tapDuTrich): bắt thiếu cặp, lệch độ dài/kiểu, mảng rỗng, tb:/wco:, daTri/thiếu tapDu; cho phép tapDu không nguồn qua khuôn để Cổng 7 bắt HO_PHU',
    kiemBanGhi(recBase).length === 0
    && kiemBanGhi(recArrOk).length === 0
    && kiemBanGhi(chiCoTapDuKhongNguon).length === 0
    && kiemBanGhi(thieuTrich).some((l) => /đi theo cặp/.test(l))
    && kiemBanGhi(thieuNguon).some((l) => /đi theo cặp/.test(l))
    && kiemBanGhi(thieuTapDu).some((l) => /chỉ dùng khi kieu GIA_TRI đơn trị có khai tapDu/.test(l))
    && kiemBanGhi(lechDoDai).some((l) => /cùng độ dài/.test(l))
    && kiemBanGhi(mangRong).some((l) => /không rỗng/.test(l))
    && kiemBanGhi(lechKieu).some((l) => /chuỗi đơn hoặc cùng là mảng/.test(l))
    && kiemBanGhi(troTb).some((l) => /cấm tb: và wco:/.test(l))
    && kiemBanGhi(troWco).some((l) => /cấm tb: và wco:/.test(l))
    && kiemBanGhi(troWcoMang).some((l) => /cấm tb: và wco:/.test(l))
    && kiemBanGhi(trenDaTri).some((l) => /đơn trị/.test(l))
    && kiemBanGhi(trenCk).some((l) => /chỉ dùng khi kieu GIA_TRI đơn trị có khai tapDu/.test(l)),
    {
      thieuTrich: kiemBanGhi(thieuTrich),
      lechDoDai: kiemBanGhi(lechDoDai),
      troWco: kiemBanGhi(troWco),
    });

  // Dựng kho luật thu gọn không có "Loại khác" để thử Ca âm 1 ("một pha" / "đa pha" không nguồn), Ca âm 2 (vòng tròn), Ca âm 3 (sai trích), Ca dương
  const luatPha = path.join(TAM, 'luat-pha');
  fs.cpSync(LUAT, luatPha, { recursive: true });
  const bieuPhaOverride = new Map([
    ['bieu:420222', '- - Động cơ xoay chiều (gồm loại một pha hoặc đa pha):'],
    ['bieu:42022210', '- - - Loại một pha'],
    ['bieu:42022220', '- - - Loại đa pha'],
  ]);
  fs.writeFileSync(
    path.join(luatPha, 'bieu.jsonl'),
    `${docDong(path.join(luatPha, 'bieu.jsonl')).map((l) => {
      const o = JSON.parse(l);
      if (bieuPhaOverride.has(o.id)) o.nguyenVan = bieuPhaOverride.get(o.id);
      return JSON.stringify(o);
    }).join('\n')}\n`,
    'utf8',
  );
  fs.writeFileSync(
    path.join(luatPha, 'cau', 'bieu.jsonl'),
    `${docDong(path.join(luatPha, 'cau', 'bieu.jsonl')).map((l) => {
      const o = JSON.parse(l);
      const nId = o.id.split('#')[0];
      if (bieuPhaOverride.has(nId)) return JSON.stringify({ id: `${nId}#1`, tu: 0, den: bieuPhaOverride.get(nId).length });
      return l;
    }).join('\n')}\n`,
    'utf8',
  );
  const L_PHA = napLuatCong(luatPha);

  // Ca âm 1 (QT bắt buộc): khai tapDu: ["một pha", "đa pha"] nhưng KHÔNG có tapDuNguon / tapDuTrich -> Cổng 7 ĐỎ HO_PHU & Cổng 8 CHUA_CHUNG_MINH_TACH (roiNhau = 0)
  const dkChaPha = dkWith(L_PHA, 'bieu:420222', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Có phải động cơ xoay chiều không?', 'Động cơ xoay chiều', 'bieu:420222#1');
  const dkAm1A = dkWith(L_PHA, 'bieu:42022210', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Số pha?', 'một pha', 'bieu:42022210#1', {
    truc: 'số pha',
    tap: ['một pha'],
    tapDu: ['một pha', 'đa pha'],
  });
  const dkAm1B = dkWith(L_PHA, 'bieu:42022220', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Số pha?', 'đa pha', 'bieu:42022220#1', {
    truc: 'số pha',
    tap: ['đa pha'],
    tapDu: ['một pha', 'đa pha'],
  });
  const khoAm1 = ghiHoSoTam({ dkList: [dkChaPha, dkAm1A, dkAm1B] });
  const rAm1 = chayCong({ luat: luatPha, hoSo: khoAm1, phamVi: ['bieu:420222'], chiTrong: true, cong: [4, 5, 6, 7, 8], L: L_PHA });
  const bangAm1 = dungBangAnhEm({ chuong: '42', chaIds: ['bieu:420222'], luat: luatPha, hoSo: khoAm1, L: L_PHA }).bang[0];
  const kqRouteAm1 = doBangAnhEm('bieu:420222', { 'hs:bieu:420222:8101': true, 'hs:bieu:42022210:8101': true }, new Map([['bieu:420222', bangAm1]]), { L: L_PHA });

  kiem('CA NGƯỢC 1 (QT bắt buộc): tapDu ["một pha", "đa pha"] KHÔNG có tapDuNguon/tapDuTrich ⇒ Cổng 7 ĐỎ HO_PHU, Cổng 8 CHUA_CHUNG_MINH_TACH (roiNhau=0), doBangAnhEm dừng RE_NHANH',
    rAm1.khuon.length === 0
    && coNguonTapDuHopLe(dkAm1A, { L: L_PHA }) === false
    && haiNutRoiNhau([dkAm1A], [dkAm1B], new Map(), { L: L_PHA }) === false
    && rAm1.cong[7].loi.some((l) => /bieu:420222.*HO_PHU/.test(l))
    && rAm1.cong[8].dem.roiNhau === 0
    && rAm1.cong[8].dem.chuaChungMinhTach === 1
    && bangAm1.co.includes('HO_PHU')
    && bangAm1.co.includes('CHUA_CHUNG_MINH_TACH')
    && kqRouteAm1.trangThai === 'RE_NHANH',
    { c7: rAm1.cong[7].loi, c8: rAm1.cong[8], co: bangAm1.co, route: kqRouteAm1 });

  // Ca âm 2 (Chống vòng tròn): khai tapDu kèm tapDuNguon trỏ vào chính dòng biểu của anh em con (bieu:<con>#1) -> Cổng 6 ĐỎ VÀ Cổng 7 ĐỎ HO_PHU
  const dkAm2ConA = { ...dkAm1A, tapDuNguon: 'bieu:42022210#1', tapDuTrich: 'một pha' };
  const dkAm2ConB = { ...dkAm1B, tapDuNguon: 'bieu:42022220#1', tapDuTrich: 'đa pha' };
  const khoAm2Con = ghiHoSoTam({ dkList: [dkChaPha, dkAm2ConA, dkAm2ConB] });
  const rAm2Con = chayCong({ luat: luatPha, hoSo: khoAm2Con, phamVi: ['bieu:420222'], chiTrong: true, cong: [4, 6, 7, 8], L: L_PHA });
  const bangAm2Con = dungBangAnhEm({ chuong: '42', chaIds: ['bieu:420222'], luat: luatPha, hoSo: khoAm2Con, L: L_PHA }).bang[0];

  const dkAm2Cha = dkWith(L_PHA, 'bieu:420222', 2, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Số pha?', 'Động cơ xoay chiều', 'bieu:420222#1', {
    truc: 'số pha',
    tap: ['một pha', 'đa pha'],
    tapDu: ['một pha', 'đa pha'],
    tapDuNguon: 'bieu:42022210#1',
    tapDuTrich: 'một pha',
  });
  const khoAm2Cha = ghiHoSoTam({
    dkList: [
      dkChaPha,
      dkAm2Cha,
      { ...dkAm1A, tapDu: undefined },
      { ...dkAm1B, tapDu: undefined },
    ],
  });
  const rAm2Cha = chayCong({ luat: luatPha, hoSo: khoAm2Cha, phamVi: ['bieu:420222'], chiTrong: true, cong: [4, 6, 7, 8], L: L_PHA });

  kiem('CA NGƯỢC 2 (Chống vòng tròn tự chứng minh): tapDuNguon trỏ dòng biểu của chính anh em con (bieu:<con>#1) ⇒ Cổng 6 ĐỎ, Cổng 7 ĐỎ HO_PHU, Cổng 8 roiNhau=0',
    rAm2Con.cong[6].loi.some((l) => /trích dòng biểu của chính anh em con/.test(l))
    && rAm2Con.cong[7].loi.some((l) => /bieu:420222.*HO_PHU/.test(l))
    && rAm2Con.cong[8].dem.roiNhau === 0
    && bangAm2Con.co.includes('HO_PHU')
    && haiNutRoiNhau([dkAm2ConA], [dkAm2ConB], new Map(), { L: L_PHA }) === false
    && rAm2Cha.cong[4].loi.some((l) => /không nằm trên đường đi/.test(l))
    && rAm2Cha.cong[6].loi.some((l) => /trích dòng biểu của chính anh em con/.test(l)),
    { c6Con: rAm2Con.cong[6].loi, c7Con: rAm2Con.cong[7].loi, c4Cha: rAm2Cha.cong[4].loi, c6Cha: rAm2Cha.cong[6].loi });

  // Ca âm 3 (Cổng 4 kiểm trích & đường đi): tapDuTrich sai 1 chữ không nguyên văn -> Cổng 4 ĐỎ; tapDuNguon trỏ sang anh em kế bên -> Cổng 4 ĐỎ
  const dkAm3SaiChuA = { ...dkAm1A, tapDuNguon: 'bieu:420222#1', tapDuTrich: 'một pha hay đa pha' }; // chữ thật là "một pha hoặc đa pha"
  const dkAm3SaiChuB = { ...dkAm1B, tapDuNguon: 'bieu:420222#1', tapDuTrich: 'một pha hoặc đa pha' };
  const khoAm3SaiChu = ghiHoSoTam({ dkList: [dkChaPha, dkAm3SaiChuA, dkAm3SaiChuB] });
  const rAm3SaiChu = chayCong({ luat: luatPha, hoSo: khoAm3SaiChu, phamVi: ['bieu:420222'], chiTrong: true, cong: [4, 6, 7, 8], L: L_PHA });

  const dkAm3NgoaiDuong = { ...dkAm1A, tapDuNguon: 'bieu:420221#1', tapDuTrich: 'da thuộc' };
  const khoAm3NgoaiDuong = ghiHoSoTam({ dkList: [dkChaPha, dkAm3NgoaiDuong, dkAm3SaiChuB] });
  const rAm3NgoaiDuong = chayCong({ luat: luatPha, hoSo: khoAm3NgoaiDuong, phamVi: ['bieu:420222'], chiTrong: true, cong: [4], L: L_PHA });

  kiem('CA NGƯỢC 3 (Cổng 4 kiểm trích & đường đi): tapDuTrich sai 1 chữ hoặc tapDuNguon ngoài đường đi ⇒ Cổng 4 ĐỎ, Cổng 6 ĐỎ, Cổng 7 ĐỎ HO_PHU',
    rAm3SaiChu.cong[4].loi.some((l) => /tapDuTrich không nguyên văn câu bieu:420222#1/.test(l))
    && rAm3SaiChu.cong[6].loi.some((l) => /tapDuTrich không nguyên văn câu bieu:420222#1/.test(l))
    && rAm3SaiChu.cong[7].loi.some((l) => /bieu:420222.*HO_PHU/.test(l))
    && rAm3SaiChu.cong[8].dem.roiNhau === 0
    && rAm3NgoaiDuong.cong[4].loi.some((l) => /tapDuNguon bieu:420221#1.*không nằm trên đường đi/.test(l)),
    { c4SaiChu: rAm3SaiChu.cong[4].loi, c7SaiChu: rAm3SaiChu.cong[7].loi, c4Ngoai: rAm3NgoaiDuong.cong[4].loi });

  // Ca dương: khai tapDu + tapDuNguon + tapDuTrich từ câu nút cha & chú giải chương trên đường đi -> Cổng 4, 5, 6, 7, 8 đều XANH (0 HO_PHU, roiNhau = 1) + tach-dieu-kien chuẩn hoá & gộp
  const dkDuongA = {
    ...dkAm1A,
    tapDuNguon: ['bieu:420222#1', 'chuong:42:cg:3:A:a#1'],
    tapDuTrich: ['một pha hoặc đa pha', 'các tấm plastic'],
  };
  const dkDuongB = {
    ...dkAm1B,
    tapDuNguon: ['bieu:420222#1', 'chuong:42:cg:3:A:a#1'],
    tapDuTrich: ['một pha hoặc đa pha', 'các tấm plastic'],
  };
  const khoDuong = ghiHoSoTam({ dkList: [dkChaPha, dkDuongA, dkDuongB] });
  const rDuong = chayCong({ luat: luatPha, hoSo: khoDuong, phamVi: ['bieu:420222'], chiTrong: true, cong: [4, 5, 6, 7, 8], L: L_PHA });
  const bangDuong = dungBangAnhEm({ chuong: '42', chaIds: ['bieu:420222'], luat: luatPha, hoSo: khoDuong, L: L_PHA }).bang[0];
  const kqRouteDuong = doBangAnhEm('bieu:420222', { 'hs:bieu:420222:8101': true, 'hs:bieu:42022210:8101': true }, new Map([['bieu:420222', bangDuong]]), { L: L_PHA });

  const normTd = chuanHoaDieuKien([{
    ve: 1,
    phu: false,
    kieu: 'GIA_TRI',
    truc: 'số pha',
    tap: ['một pha'],
    tapDu: ['một pha', 'đa pha'],
    tapDuNguon: ['bieu:420222#1', 'chuong:42:cg:3:A:a#1'],
    tapDuTrich: ['"một pha hoặc đa pha."', '  các tấm plastic '],
    mo: 'NGHIA_THUONG',
    cauHoi: 'Số pha?',
    trich: 'một pha',
    nguon: 'bieu:42022210#1',
  }], 'bieu:42022210', L_PHA, { moHinh: 'mock-td' });
  const normTdSai = chuanHoaDieuKien([{
    ve: 1,
    phu: false,
    kieu: 'GIA_TRI',
    truc: 'số pha',
    tap: ['một pha'],
    tapDu: ['một pha', 'đa pha'],
    tapDuNguon: 'bieu:420222#1',
    tapDuTrich: 'câu trích bịa không có',
    mo: 'NGHIA_THUONG',
    cauHoi: 'Số pha?',
    trich: 'một pha',
    nguon: 'bieu:42022210#1',
  }], 'bieu:42022210', L_PHA);

  const { gopKetQuaChunk: gopChunkTd } = await import('./ho-so-ma/tach-dieu-kien.mjs');
  const gopDaoCap = gopChunkTd([
    { dieuKien: [{ nut: 'bieu:42022210', ve: 1, phu: false, kieu: 'GIA_TRI', truc: 'số pha', tap: ['một pha'], tapDu: ['một pha', 'đa pha'], tapDuNguon: ['bieu:420222#1', 'chuong:42:cg:3:A:a#1'], tapDuTrich: ['một pha hoặc đa pha', 'các tấm plastic'], cauHoi: 'Số pha?', trich: 'một pha', nguon: 'bieu:42022210#1' }] },
    { dieuKien: [{ nut: 'bieu:42022210', ve: 1, phu: false, kieu: 'GIA_TRI', truc: 'số pha', tap: ['một pha'], tapDu: ['đa pha', 'một pha'], tapDuNguon: ['chuong:42:cg:3:A:a#1', 'bieu:420222#1'], tapDuTrich: ['các tấm plastic', 'một pha  hoặc đa pha'], cauHoi: 'Số pha?', trich: 'một pha', nguon: 'bieu:42022210#1' }] },
  ]);
  const gopKhacCap = gopChunkTd([
    { dieuKien: [{ nut: 'bieu:42022210', ve: 1, phu: false, kieu: 'GIA_TRI', truc: 'số pha', tap: ['một pha'], tapDu: ['một pha', 'đa pha'], tapDuNguon: 'bieu:420222#1', tapDuTrich: 'một pha hoặc đa pha', cauHoi: 'Số pha?', trich: 'một pha', nguon: 'bieu:42022210#1' }] },
    { dieuKien: [{ nut: 'bieu:42022210', ve: 1, phu: false, kieu: 'GIA_TRI', truc: 'số pha', tap: ['một pha'], tapDu: ['một pha', 'đa pha'], tapDuNguon: 'chuong:42:cg:3:A:a#1', tapDuTrich: 'các tấm plastic', cauHoi: 'Số pha?', trich: 'một pha', nguon: 'bieu:42022210#1' }] },
  ]);

  kiem('CA DƯƠNG (tapDu + tapDuNguon + tapDuTrich): Cổng 4, 5, 6, 7, 8 đều XANH (0 HO_PHU, roiNhau=1), doBangAnhEm đi thẳng DICH, tach-dieu-kien chuẩn hoá & gộp cặp nguồn đúng',
    rDuong.khuon.length === 0
    && [4, 5, 6, 7, 8].every((c) => rDuong.cong[c].loi.length === 0)
    && rDuong.cong[8].dem.roiNhau === 1
    && rDuong.cong[8].dem.chuaChungMinhTach === 0
    && !bangDuong.co.includes('HO_PHU')
    && !bangDuong.co.includes('CHUA_CHUNG_MINH_TACH')
    && Boolean(bangDuong.vanTayCau?.['bieu:420222#1'])
    && kqRouteDuong.trangThai === 'DICH' && kqRouteDuong.dich === 'bieu:42022210'
    && normTd.banGhi.length === 1 && normTd.loi.length === 0
    && normTd.banGhi[0].tapDuTrich[0] === 'một pha hoặc đa pha'
    && normTd.banGhi[0].tapDuTrich[1] === 'các tấm plastic'
    && normTd.banGhi[0].tapDuNguonVanTay?.['bieu:420222#1'] === vanTay(L_PHA.chuCau('bieu:420222#1'))
    && normTd.banGhi[0].tapDuNguonVanTay?.['chuong:42:cg:3:A:a#1'] === vanTay(L_PHA.chuCau('chuong:42:cg:3:A:a#1'))
    && normTdSai.banGhi.length === 0 && normTdSai.loi.some((l) => /tapDuTrich không nguyên văn/.test(l))
    && gopDaoCap.dieuKien.length === 1 && gopDaoCap.canhBao.length === 0
    && gopKhacCap.dieuKien.length === 2 && gopKhacCap.canhBao.length === 1,
    { cong: rDuong.cong, co: bangDuong.co, normTd, gopDaoCap, gopKhacCap });

  // PROBE 1 (Kiểm toán Vòng 1): con 6 số (bieu:420221) mượn cungDong đi xuống cháu 8 số (bieu:42022100#1) làm tapDuNguon
  // -> Cổng 4, Cổng 6, Cổng 7 (HO_PHU) đều bắt ĐỎ, Cổng 8 roiNhau = 0 (cả khi có L và khi fallback tiền tố L=null)
  const luatProbe1 = path.join(TAM, 'luat-probe1');
  fs.cpSync(LUAT, luatProbe1, { recursive: true });
  const chuChau42022100 = '- - - Với mặt ngoài bằng da thuộc hoặc bằng tấm plastic hay vật liệu dệt';
  fs.writeFileSync(
    path.join(luatProbe1, 'bieu.jsonl'),
    `${docDong(path.join(luatProbe1, 'bieu.jsonl'))
      .map((l) => JSON.parse(l))
      .filter((o) => o.id !== 'bieu:420229' && o.id !== 'bieu:42022900')
      .map((o) => JSON.stringify(o.id === 'bieu:42022100' ? { ...o, nguyenVan: chuChau42022100 } : o))
      .join('\n')}\n`,
    'utf8',
  );
  fs.writeFileSync(
    path.join(luatProbe1, 'cau', 'bieu.jsonl'),
    `${docDong(path.join(luatProbe1, 'cau', 'bieu.jsonl'))
      .map((l) => JSON.parse(l))
      .filter((o) => !o.id.startsWith('bieu:420229'))
      .map((o) => JSON.stringify(o.id === 'bieu:42022100#1' ? { id: 'bieu:42022100#1', tu: 0, den: chuChau42022100.length } : o))
      .join('\n')}\n`,
    'utf8',
  );
  const L_PROBE1 = napLuatCong(luatProbe1);
  const dkProbe1Cha = dkWith(L_PROBE1, 'bieu:42022', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Có phải túi xách không?', 'Túi xách', 'bieu:42022#1');
  const dkProbe1A = dkWith(L_PROBE1, 'bieu:420221', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Chất liệu mặt ngoài?', 'da thuộc', 'bieu:420221#1', {
    truc: 'chất liệu mặt ngoài',
    tap: ['da thuộc'],
    tapDu: ['da thuộc', 'tấm plastic', 'vật liệu dệt'],
    tapDuNguon: 'bieu:42022100#1',
    tapDuTrich: 'da thuộc hoặc bằng tấm plastic hay vật liệu dệt',
  });
  const dkProbe1B = dkWith(L_PROBE1, 'bieu:420222', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Chất liệu mặt ngoài?', 'tấm plastic hoặc vật liệu dệt', 'bieu:420222#1', {
    truc: 'chất liệu mặt ngoài',
    tap: ['tấm plastic', 'vật liệu dệt'],
    tapDu: ['da thuộc', 'tấm plastic', 'vật liệu dệt'],
    tapDuNguon: 'bieu:42022100#1',
    tapDuTrich: 'da thuộc hoặc bằng tấm plastic hay vật liệu dệt',
  });
  const khoProbe1 = ghiHoSoTam({ dkList: [dkProbe1Cha, dkProbe1A, dkProbe1B] });
  const rProbe1 = chayCong({ luat: luatProbe1, hoSo: khoProbe1, phamVi: ['bieu:42022'], chiTrong: true, toiCap: '6', cong: [4, 6, 7, 8], L: L_PROBE1 });
  const bangProbe1 = dungBangAnhEm({ chuong: '42', chaIds: ['bieu:42022'], luat: luatProbe1, hoSo: khoProbe1, L: L_PROBE1 }).bang[0];
  const conSet42022 = new Set(['bieu:420221', 'bieu:420222']);

  kiem('PROBE 1 (Chặn cungDong đi xuống cháu 8 số & cây con đệ quy): con 6 số trích bieu:<cháu-8-số>#1 ⇒ Cổng 4, Cổng 6, Cổng 7 (HO_PHU) đều ĐỎ, Cổng 8 roiNhau=0',
    moRongCayCon(conSet42022, L_PROBE1).has('bieu:42022100')
    && laCauCapDuoiCon('bieu:42022100#1', conSet42022, { L: L_PROBE1 }) === true
    && laCauCapDuoiCon('bieu:42022100#1', conSet42022, { L: null }) === true
    && coNguonTapDuHopLe(dkProbe1A, { conSet: conSet42022, L: L_PROBE1 }) === false
    && coNguonTapDuHopLe(dkProbe1A, { conSet: conSet42022, L: null }) === false
    && haiNutRoiNhau([dkProbe1A], [dkProbe1B], new Map()) === false
    && rProbe1.cong[4].loi.some((l) => /hs:bieu:420221:8101: tapDuNguon bieu:42022100#1.*không nằm trên đường đi của bieu:420221/.test(l))
    && rProbe1.cong[6].loi.some((l) => /hs:bieu:420221:8101: tapDuNguon bieu:42022100#1.*không nằm trên đường đi của bieu:420221/.test(l))
    && rProbe1.cong[6].loi.some((l) => /bieu:42022: tapDuNguon "bieu:42022100#1" trích dòng biểu của chính anh em con hoặc nguồn cấp dưới/.test(l))
    && rProbe1.cong[7].loi.some((l) => /bieu:42022.*HO_PHU/.test(l))
    && rProbe1.cong[8].dem.roiNhau === 0
    && rProbe1.cong[8].dem.chuaChungMinhTach === 1
    && bangProbe1.co.includes('HO_PHU')
    && bangProbe1.co.includes('CHUA_CHUNG_MINH_TACH'),
    { c4: rProbe1.cong[4].loi, c6: rProbe1.cong[6].loi, c7: rProbe1.cong[7].loi, c8: rProbe1.cong[8], co: bangProbe1.co });

  // PROBE 2 (Kiểm toán Vòng 1): sửa chữ câu trong tapDuNguon ở bản sao luat-goc (giữ nguyên cụm tapDuTrich để Cổng 4 vẫn xanh)
  // -> cả Cổng 5 (cong.mjs) lẫn so-diem.mjs (KHÔNG cần tệp bang-anh-em) đều báo ĐỎ / DO và mở lại đúng nutCanMoLai!
  const vtKqProbe2Raw = vanTay(L_VANG.chuCau('chuong:02:kq:34#1'));
  const tdVtBadKhongNguon = kiemBanGhi({ ...chiCoTapDuKhongNguon, tapDuNguonVanTay: vtKqProbe2Raw });
  const tdVtBadHex = kiemBanGhi({ ...recBase, tapDuNguonVanTay: 'khong-phai-sha256' });
  const tdVtBadThieuKey = kiemBanGhi({ ...recArrOk, tapDuNguonVanTay: { 'bieu:420222#1': vtKqProbe2Raw } });
  const tdVtOkStr = kiemBanGhi({ ...recBase, tapDuNguonVanTay: vtKqProbe2Raw });
  const tdVtOkObj = kiemBanGhi({ ...recArrOk, tapDuNguonVanTay: { 'bieu:420222#1': vtKqProbe2Raw, 'chuong:39:cg:1#2': vtKqProbe2Raw } });

  const taoLuatProbe2 = (tenThuMuc, themHauTo = '') => {
    const dir = path.join(TAM, tenThuMuc);
    fs.cpSync(LUAT_VANG, dir, { recursive: true });
    const cauId = 'chuong:02:kq:34#1';
    const info = L_VANG.cau.get(cauId);
    const chuMoi = `Thịt trâu bò gồm dạng cả con, nửa con, pha có xương khác và lọc không xương.${themHauTo}`;
    const delta = chuMoi.length - (info.den - info.tu);
    fs.writeFileSync(
      path.join(dir, 'chuong.jsonl'),
      `${docDong(path.join(dir, 'chuong.jsonl')).map((l) => {
        const o = JSON.parse(l);
        if (o.id === info.nut) {
          o.nguyenVan = `${o.nguyenVan.slice(0, info.tu)}${chuMoi}${o.nguyenVan.slice(info.den)}`;
        }
        return JSON.stringify(o);
      }).join('\n')}\n`,
      'utf8',
    );
    fs.writeFileSync(
      path.join(dir, 'cau', 'chuong.jsonl'),
      `${docDong(path.join(dir, 'cau', 'chuong.jsonl')).map((l) => {
        const o = JSON.parse(l);
        if (o.id === cauId) return JSON.stringify({ ...o, den: o.den + delta });
        if (L_VANG.cau.get(o.id)?.nut === info.nut && o.tu >= info.den) {
          return JSON.stringify({ ...o, tu: o.tu + delta, den: o.den + delta });
        }
        return l;
      }).join('\n')}\n`,
      'utf8',
    );
    return dir;
  };
  const luatProbe2Goc = taoLuatProbe2('luat-probe2-goc', '');
  const luatProbe2Doi = taoLuatProbe2('luat-probe2-doi', ' (bổ sung sửa đổi văn bản luật)');
  const L_PROBE2_GOC = napLuatCong(luatProbe2Goc);
  const L_PROBE2_DOI = napLuatCong(luatProbe2Doi);
  const cauTargetId = 'chuong:02:kq:34#1';
  const vtKqProbe2 = vanTay(L_PROBE2_GOC.chuCau(cauTargetId));

  const TAP_DU_0201 = ['cả con', 'nửa con', 'pha có xương khác', 'lọc không xương'];
  const TD_0201 = {
    tapDu: TAP_DU_0201,
    tapDuNguon: cauTargetId,
    tapDuTrich: 'cả con, nửa con, pha có xương khác và lọc không xương',
    tapDuNguonVanTay: vtKqProbe2,
  };
  const dkProbe2List = [
    dkWith(L_PROBE2_GOC, 'bieu:0201', 1, 1, false, 'GIA_TRI', 'DINH_NGHIA_LUAT', 'Động vật thuộc loài nào?', 'động vật họ trâu bò', 'bieu:0201#1', { truc: 'loài', tap: ['động vật họ trâu bò'], moNguon: 'nhom:0201:ct:1#1' }),
    dkWith(L_PROBE2_GOC, 'bieu:0201', 2, 1, false, 'GIA_TRI', 'MO_TA_HUONG_DAN', 'Sản phẩm là gì?', 'Thịt', 'bieu:0201#1', { truc: 'sản phẩm', tap: ['Thịt'], moNguon: 'chuong:02:kq:2#1' }),
    dkWith(L_PROBE2_GOC, 'bieu:0201', 3, 1, false, 'GIA_TRI', 'DINH_NGHIA_LUAT', 'Trạng thái bảo quản là gì?', 'tươi hoặc ướp lạnh', 'bieu:0201#1', { truc: 'trạng thái', tap: ['tươi', 'ướp lạnh'], moNguon: 'chuong:02:kq:20#1' }),
    dkWith(L_PROBE2_GOC, 'bieu:020110', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Kiểu pha lọc của thịt?', 'Thịt cả con và nửa con', 'bieu:020110#1', { truc: 'kiểu pha lọc', tap: ['cả con', 'nửa con'], ...TD_0201 }),
    dkWith(L_PROBE2_GOC, 'bieu:020120', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Kiểu pha lọc của thịt?', 'Thịt pha có xương khác', 'bieu:020120#1', { truc: 'kiểu pha lọc', tap: ['pha có xương khác'], ...TD_0201 }),
    dkWith(L_PROBE2_GOC, 'bieu:020130', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Kiểu pha lọc của thịt?', 'Thịt lọc không xương', 'bieu:020130#1', { truc: 'kiểu pha lọc', tap: ['lọc không xương'], ...TD_0201 }),
  ];
  const khoProbe2NoBang = ghiHoSoTam({ dkList: dkProbe2List });
  const sdProbe2Goc = chamDiemNhom('0201', { luat: luatProbe2Goc, hoSo: khoProbe2NoBang, L: L_PROBE2_GOC });
  const rProbe2Doi = chayCong({ luat: luatProbe2Doi, hoSo: khoProbe2NoBang, phamVi: ['0201'], chiTrong: true, cong: [4, 5, 7], L: L_PROBE2_DOI });
  const sdProbe2Doi = chamDiemNhom('0201', { luat: luatProbe2Doi, hoSo: khoProbe2NoBang, L: L_PROBE2_DOI });

  // Kiểm bổ sung Cổng 5 bắt vanTayCau lệch trên bang-anh-em ngay cả khi bản ghi cũ chưa ghi tapDuNguonVanTay
  const khoProbe2CoBang = ghiHoSoTam({
    dkList: dkProbe2List.map(({ tapDuNguonVanTay: _b, ...rest }) => rest),
  });
  sinhBangAnhEm({ chuong: '02', chaIds: ['bieu:0201'], luat: luatProbe2Goc, hoSo: khoProbe2CoBang, ghi: true });
  const rProbe2Bang5 = chayCong({ luat: luatProbe2Doi, hoSo: khoProbe2CoBang, phamVi: ['0201'], chiTrong: true, cong: [5], L: L_PROBE2_DOI });

  kiem('PROBE 2 (tapDuNguonVanTay ở Khuôn, Cổng 5 & so-diem không cần bang-anh-em): đổi chữ câu tapDuNguon ⇒ Cổng 5 ĐỎ, Cổng 7 HO_PHU, so-diem báo DO & mở lại đúng nutCanMoLai',
    tdVtOkStr.length === 0 && tdVtOkObj.length === 0
    && tdVtBadKhongNguon.some((l) => /không mang tapDuNguonVanTay/.test(l))
    && tdVtBadHex.some((l) => /tapDuNguonVanTay phải là sha256 hex/.test(l))
    && tdVtBadThieuKey.some((l) => /khớp mọi phần tử tapDuNguon/.test(l))
    && !fs.existsSync(path.join(khoProbe2NoBang, 'bang-anh-em', '02.jsonl'))
    && sdProbe2Goc.trangThai === 'DONG'
    && rProbe2Doi.cong[4].loi.length === 0
    && rProbe2Doi.cong[5].loi.some((l) => /tapDuNguonVanTay lệch câu chuong:02:kq:34#1/.test(l))
    && rProbe2Doi.cong[7].loi.some((l) => /bieu:0201.*HO_PHU/.test(l))
    && sdProbe2Doi.trangThai === 'DO'
    && sdProbe2Doi.cauDoiVanTay.includes('chuong:02:kq:34#1')
    && ['bieu:020110', 'bieu:020120', 'bieu:020130'].every((nId) => sdProbe2Doi.nutCanMoLai.includes(nId))
    && rProbe2Bang5.cong[5].loi.some((l) => /bang-anh-em\(bieu:0201\): vanTayCau lệch câu chuong:02:kq:34#1/.test(l)),
    { sdGoc: sdProbe2Goc.trangThai, c5: rProbe2Doi.cong[5].loi, c7: rProbe2Doi.cong[7].loi, sdDoi: sdProbe2Doi, c5Bang: rProbe2Bang5.cong[5].loi });

  // PROBE 3 (Kiểm toán Vòng 1):
  //   (a) con A trích sen:<conA>:1#1, con B trích sen:<conB>:1#1 (nguồn cấp dưới + lệch nguồn)
  //   (b) hai anh em cùng trục khai tapDuNguon lệch nhau dù đều là câu tổ tiên hợp lệ
  //   -> Cổng 6 ĐỎ, Cổng 7 ĐỎ HO_PHU, Cổng 8 roiNhau = 0!
  const luatProbe3 = path.join(TAM, 'luat-probe3');
  fs.cpSync(luatPha, luatProbe3, { recursive: true });
  const senA = {
    id: 'sen:42022210:1',
    loai: 'SEN',
    cha: null,
    so: '4202.22.10',
    nguyenVan: 'Phân nhóm này chỉ áp dụng cho loại một pha hoặc đa pha chuyên biệt.',
    lop: 'HUONG_DAN',
    nguon: { vanBan: 'SEN thử nghiệm', ban: 'AHTN2022', trang: 1 },
    hieuLuc: { tu: '2023-07-24', den: null },
  };
  const senB = {
    ...senA,
    id: 'sen:42022220:1',
    so: '4202.22.20',
  };
  const senLinesP3 = [...docDong(path.join(luatProbe3, 'sen.jsonl')), JSON.stringify(senA), JSON.stringify(senB)];
  const cauSenLinesP3 = [
    ...docDong(path.join(luatProbe3, 'cau', 'sen.jsonl')),
    JSON.stringify({ id: 'sen:42022210:1#1', tu: 0, den: senA.nguyenVan.length }),
    JSON.stringify({ id: 'sen:42022220:1#1', tu: 0, den: senB.nguyenVan.length }),
  ];
  fs.writeFileSync(path.join(luatProbe3, 'sen.jsonl'), `${senLinesP3.join('\n')}\n`, 'utf8');
  fs.writeFileSync(path.join(luatProbe3, 'cau', 'sen.jsonl'), `${cauSenLinesP3.join('\n')}\n`, 'utf8');
  const cg42Pha = {
    id: 'chuong:42:cg:99',
    loai: 'CHU_GIAI',
    cha: 'chuong:42',
    lop: 'LUAT',
    nguon: { vanBan: 'synthetic-p3' },
    nguyenVan: 'Chú giải bổ sung này áp dụng cho loại một pha và đa pha.',
  };
  fs.writeFileSync(path.join(luatProbe3, 'chuong.jsonl'), `${[...docDong(path.join(luatProbe3, 'chuong.jsonl')), JSON.stringify(cg42Pha)].join('\n')}\n`, 'utf8');
  fs.writeFileSync(path.join(luatProbe3, 'cau', 'chuong.jsonl'), `${[...docDong(path.join(luatProbe3, 'cau', 'chuong.jsonl')), JSON.stringify({ id: 'chuong:42:cg:99#1', tu: 0, den: cg42Pha.nguyenVan.length })].join('\n')}\n`, 'utf8');
  const L_PROBE3 = napLuatCong(luatProbe3);

  const dkP3SenA = { ...dkAm1A, tapDuNguon: 'sen:42022210:1#1', tapDuTrich: 'một pha hoặc đa pha' };
  const dkP3SenB = { ...dkAm1B, tapDuNguon: 'sen:42022220:1#1', tapDuTrich: 'một pha hoặc đa pha' };
  const khoP3Sen = ghiHoSoTam({ dkList: [dkChaPha, dkP3SenA, dkP3SenB] });
  const rP3Sen = chayCong({ luat: luatProbe3, hoSo: khoP3Sen, phamVi: ['bieu:420222'], chiTrong: true, cong: [4, 6, 7, 8], L: L_PROBE3 });
  const bangP3Sen = dungBangAnhEm({ chuong: '42', chaIds: ['bieu:420222'], luat: luatProbe3, hoSo: khoP3Sen, L: L_PROBE3 }).bang[0];
  const conSet420222 = new Set(['bieu:42022210', 'bieu:42022220']);

  const dkP3LechA = { ...dkAm1A, tapDuNguon: 'bieu:420222#1', tapDuTrich: 'một pha hoặc đa pha' };
  const dkP3LechB = { ...dkAm1B, tapDuNguon: 'chuong:42:cg:99#1', tapDuTrich: 'một pha và đa pha' };
  const khoP3Lech = ghiHoSoTam({ dkList: [dkChaPha, dkP3LechA, dkP3LechB] });
  const rP3Lech = chayCong({ luat: luatProbe3, hoSo: khoP3Lech, phamVi: ['bieu:420222'], chiTrong: true, cong: [4, 6, 7, 8], L: L_PROBE3 });
  const bangP3Lech = dungBangAnhEm({ chuong: '42', chaIds: ['bieu:420222'], luat: luatProbe3, hoSo: khoP3Lech, L: L_PROBE3 }).bang[0];
  const kqRouteP3Lech = doBangAnhEm('bieu:420222', { 'hs:bieu:420222:8101': true, 'hs:bieu:42022210:8101': true }, new Map([['bieu:420222', bangP3Lech]]), { L: L_PROBE3 });

  kiem('PROBE 3 (Chặn sen:<con>:... & bắt buộc đồng nhất tapDuNguon giữa các anh em cùng trục): Cổng 6 ĐỎ, Cổng 7 ĐỎ HO_PHU, Cổng 8 roiNhau=0',
    laCauCapDuoiCon('sen:42022210:1#1', conSet420222, { L: L_PROBE3 }) === true
    && laCauCapDuoiCon('sen:42022210:1#1', conSet420222, { L: null }) === true
    && coNguonTapDuHopLe(dkP3SenA, { conSet: conSet420222, L: L_PROBE3 }) === false
    && coNguonTapDuHopLe(dkP3SenA, { conSet: conSet420222, L: null }) === false
    && rP3Sen.cong[4].loi.length === 0
    && rP3Sen.cong[6].loi.some((l) => /tapDuNguon "sen:42022210:1#1" trích dòng biểu của chính anh em con hoặc nguồn cấp dưới/.test(l))
    && rP3Sen.cong[6].loi.some((l) => /khai tapDuNguon không thống nhất giữa các bản ghi/.test(l))
    && rP3Sen.cong[7].loi.some((l) => /bieu:420222.*HO_PHU/.test(l))
    && rP3Sen.cong[8].dem.roiNhau === 0
    && bangP3Sen.co.includes('HO_PHU')
    && bangP3Sen.co.includes('CHUA_CHUNG_MINH_TACH')
    && haiNutRoiNhau([dkP3SenA], [dkP3SenB], new Map()) === false
    && rP3Lech.cong[4].loi.length === 0
    && rP3Lech.cong[6].loi.some((l) => /khai tapDuNguon không thống nhất giữa các bản ghi/.test(l))
    && rP3Lech.cong[7].loi.some((l) => /bieu:420222.*HO_PHU/.test(l))
    && rP3Lech.cong[8].dem.roiNhau === 0
    && bangP3Lech.co.includes('HO_PHU')
    && haiNutRoiNhau([dkP3LechA], [dkP3LechB], new Map(), { L: L_PROBE3 }) === false
    && kqRouteP3Lech.trangThai === 'RE_NHANH',
    { c6Sen: rP3Sen.cong[6].loi, c7Sen: rP3Sen.cong[7].loi, c6Lech: rP3Lech.cong[6].loi, c7Lech: rP3Lech.cong[7].loi, routeLech: kqRouteP3Lech });

  // PROBE 4 (Soát lớp hai #2452 — Điểm 3): mỗi giá trị trong tapDu phải xuất hiện nguyên văn trong ít nhất một tapDuTrich
  // Đặt tapDuTrich là tên chung của nút cha ("Động cơ xoay chiều") mà không chứa các phần tử tapDu -> Cổng 4 ĐỎ, Cổng 6 ĐỎ, Cổng 7 ĐỎ HO_PHU, Cổng 8 roiNhau=0, chuanHoaDieuKien bác bỏ!
  const dkP4A = {
    ...dkAm1A,
    tapDu: ['một pha', 'đa pha'],
    tapDuNguon: 'bieu:420222#1',
    tapDuTrich: 'Động cơ xoay chiều',
  };
  const dkP4B = {
    ...dkAm1B,
    tapDu: ['một pha', 'đa pha'],
    tapDuNguon: 'bieu:420222#1',
    tapDuTrich: 'Động cơ xoay chiều',
  };
  const khoP4 = ghiHoSoTam({ dkList: [dkChaPha, dkP4A, dkP4B] });
  const rP4 = chayCong({ luat: luatPha, hoSo: khoP4, phamVi: ['bieu:420222'], chiTrong: true, cong: [4, 6, 7, 8], L: L_PHA });
  const bangP4 = dungBangAnhEm({ chuong: '42', chaIds: ['bieu:420222'], luat: luatPha, hoSo: khoP4, L: L_PHA }).bang[0];
  const kqRouteP4 = doBangAnhEm('bieu:420222', { 'hs:bieu:420222:8101': true, 'hs:bieu:42022210:8101': true }, new Map([['bieu:420222', bangP4]]), { L: L_PHA });
  const normP4 = chuanHoaDieuKien([{
    ve: 1,
    phu: false,
    kieu: 'GIA_TRI',
    truc: 'số pha',
    tap: ['một pha'],
    tapDu: ['một pha', 'đa pha'],
    tapDuNguon: 'bieu:420222#1',
    tapDuTrich: 'Động cơ xoay chiều',
    mo: 'NGHIA_THUONG',
    cauHoi: 'Số pha?',
    trich: 'một pha',
    nguon: 'bieu:42022210#1',
  }], 'bieu:42022210', L_PHA);

  kiem('PROBE 4 (Điểm 3 #2452 — chống tapDu trích tên chung nút cha): giá trị tapDu không xuất hiện nguyên văn trong tapDuTrich ⇒ Cổng 4, 6, 7 (HO_PHU) đều ĐỎ, Cổng 8 roiNhau=0, chuanHoaDieuKien bác bỏ',
    coNguonTapDuHopLe(dkP4A, { L: L_PHA }) === false
    && coNguonTapDuHopLe(dkP4A, { L: null }) === false
    && haiNutRoiNhau([dkP4A], [dkP4B], new Map(), { L: L_PHA }) === false
    && rP4.cong[4].loi.some((l) => /giá trị tapDu "một pha" không xuất hiện nguyên văn trong bất kỳ tapDuTrich nào/.test(l))
    && rP4.cong[4].loi.some((l) => /giá trị tapDu "đa pha" không xuất hiện nguyên văn trong bất kỳ tapDuTrich nào/.test(l))
    && rP4.cong[6].loi.some((l) => /giá trị tapDu "một pha" không xuất hiện nguyên văn trong bất kỳ tapDuTrich nào/.test(l))
    && rP4.cong[7].loi.some((l) => /bieu:420222.*HO_PHU/.test(l))
    && rP4.cong[8].dem.roiNhau === 0
    && bangP4.co.includes('HO_PHU')
    && bangP4.co.includes('CHUA_CHUNG_MINH_TACH')
    && kqRouteP4.trangThai === 'RE_NHANH'
    && normP4.banGhi.length === 0
    && normP4.loi.some((l) => /giá trị tapDu "một pha" không xuất hiện nguyên văn trong bất kỳ tapDuTrich nào/.test(l)),
    { c4: rP4.cong[4].loi, c6: rP4.cong[6].loi, c7: rP4.cong[7].loi, c8: rP4.cong[8], co: bangP4.co, normLoi: normP4.loi });

  // PROBE 5 (Soát lớp hai #2452 — Điểm 2): nút cha khoá tập GIA_TRI đa trị (daTri:true) trên mọi vế
  //   - Ca dương: hợp các con GIA_TRI dương phủ hết tapCha -> Cổng 7 XANH (0 HO_PHU), Cổng 8 CHUA_CHUNG_MINH_TACH (roiNhau=0)
  //   - Ca âm: các con hụt 1 giá trị của tapCha -> Cổng 7 ĐỎ HO_PHU
  //   - Chốt an toàn cùng vế đa điều kiện daTri:true: không giao về rỗng làm lọt ca hụt
  const dkDtChaDu = dk('bieu:420222', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Tổ hợp lớp vỏ gồm những gì?', 'tấm plastic hoặc vật liệu dệt', 'bieu:420222#1', {
    truc: 'thành phần lớp vỏ',
    daTri: true,
    tap: ['tấm plastic', 'vật liệu dệt'],
  });
  const dkDtCon1 = dk('bieu:42022210', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Có lớp tấm plastic?', 'tấm plastic', 'bieu:42022210#1', {
    truc: 'thành phần lớp vỏ',
    daTri: true,
    tap: ['tấm plastic'],
  });
  const dkDtCon2 = dk('bieu:42022220', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Có lớp vật liệu dệt?', 'vật liệu dệt', 'bieu:42022220#1', {
    truc: 'thành phần lớp vỏ',
    daTri: true,
    tap: ['vật liệu dệt'],
  });
  const khoDtPhuKin = ghiHoSoTam({ dkList: [dkDtChaDu, dkDtCon1, dkDtCon2] });
  const rDtPhuKin = chayCong({ luat: LUAT, hoSo: khoDtPhuKin, phamVi: ['bieu:420222'], chiTrong: true, cong: [7, 8], L });
  const bangDtPhuKin = dungBangAnhEm({ chuong: '42', chaIds: ['bieu:420222'], luat: LUAT, hoSo: khoDtPhuKin, L }).bang[0];

  const dkDtCha3 = dk('bieu:420222', 1, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Tổ hợp lớp vỏ gồm những gì?', 'Mặt ngoài bằng tấm plastic hoặc vật liệu dệt', 'bieu:420222#1', {
    truc: 'thành phần lớp vỏ',
    daTri: true,
    tap: ['Mặt ngoài', 'tấm plastic', 'vật liệu dệt'],
  });
  const khoDtHut = ghiHoSoTam({ dkList: [dkDtCha3, dkDtCon1, dkDtCon2] });
  const rDtHut = chayCong({ luat: LUAT, hoSo: khoDtHut, phamVi: ['bieu:420222'], chiTrong: true, cong: [7], L });

  const dkDtChaPhuTrongVe = dk('bieu:420222', 2, 1, false, 'GIA_TRI', 'NGHIA_THUONG', 'Lớp phụ kèm theo?', 'Mặt ngoài', 'bieu:420222#1', {
    truc: 'thành phần lớp vỏ',
    daTri: true,
    tap: ['Mặt ngoài'],
  });
  const khoDt2DkHut = ghiHoSoTam({
    dkList: [
      dkDtChaDu,
      dkDtChaPhuTrongVe,
      dkDtCon1,
      { ...dkDtCon2, tap: ['tấm plastic'] },
    ],
  });
  const rDt2DkHut = chayCong({ luat: LUAT, hoSo: khoDt2DkHut, phamVi: ['bieu:420222'], chiTrong: true, cong: [7], L });

  kiem('PROBE 5 (Điểm 2 #2452 — chungMinhPhuKin mục 3 cho trục daTri:true): các con phủ hết tapCha ⇒ Cổng 7 XANH (0 HO_PHU) & Cổng 8 CHUA_CHUNG_MINH_TACH; hụt giá trị ⇒ ĐỎ HO_PHU',
    rDtPhuKin.cong[7].loi.length === 0
    && !bangDtPhuKin.co.includes('HO_PHU')
    && rDtPhuKin.cong[8].dem.roiNhau === 0
    && rDtPhuKin.cong[8].dem.chuaChungMinhTach === 1
    && bangDtPhuKin.co.includes('CHUA_CHUNG_MINH_TACH')
    && rDtHut.cong[7].loi.some((l) => /bieu:420222.*HO_PHU/.test(l))
    && rDt2DkHut.cong[7].loi.some((l) => /bieu:420222.*HO_PHU/.test(l)),
    { ok7: rDtPhuKin.cong[7].loi, ok8: rDtPhuKin.cong[8], co: bangDtPhuKin.co, hut7: rDtHut.cong[7].loi, hut2Dk: rDt2DkHut.cong[7].loi });

  // PROBE 6 (Soát lớp hai lần 2 #2452 — ADR-0009 mục 6):
  //   - Ca dương: bieu:9031 qua Cổng 7 nhờ căn cứ chuong:90#1 ("bộ phận và phụ kiện của chúng"), lưu vào bang-anh-em.vanTayCau
  //   - Ca âm đối kháng: xoá cụm bộ phận khỏi chuong:90#1 & bieu:90#1 nhưng cố tình chèn vào phan:XVIII#1 (kiểm ranh giới "tới tên Chương, không lấy tên Phần")
  //     -> timCauBoPhanTrenChuoiCha & chungMinhPhanHoachCauTruc trả null, Cổng 7 bắt ĐỎ bieu:9031: HO_PHU!
  const L_THAT_P6 = napLuatCong(LUAT_THAT);
  const metaThatP6 = napBieuMeta(LUAT_THAT);
  const dk90List = docDong(path.join(GOC, 'data/ho-so-ma/dieu-kien/90.jsonl'))
    .map((l) => JSON.parse(l))
    .filter((r) => r.loai === 'DIEU_KIEN');
  const dkTheoNut90 = new Map();
  for (const r of dk90List) {
    if (!dkTheoNut90.has(r.nut)) dkTheoNut90.set(r.nut, []);
    dkTheoNut90.get(r.nut).push(r);
  }
  const nguong90Map = new Map(
    docDong(path.join(GOC, 'data/ho-so-ma/nguong/90.jsonl')).map((l) => {
      const o = JSON.parse(l);
      return [o.id, o];
    }),
  );
  const con9031 = ['bieu:903110', 'bieu:903120', 'bieu:90314', 'bieu:903180', 'bieu:903190'];
  const kqCanCu9031 = chungMinhPhanHoachCauTruc(con9031, dkTheoNut90, nguong90Map, {
    chaId: 'bieu:9031',
    L: L_THAT_P6,
    bieuMeta: metaThatP6,
  });
  const bang9031That = docDong(path.join(GOC, 'data/ho-so-ma/bang-anh-em/90.jsonl'))
    .map((l) => JSON.parse(l))
    .find((b) => b.cha === 'bieu:9031');

  const luatProbe6 = path.join(TAM, 'luat-probe6');
  fs.mkdirSync(path.join(luatProbe6, 'cau'), { recursive: true });
  fs.mkdirSync(path.join(luatProbe6, 'nghia-canh'), { recursive: true });
  const chuCh90KhongBp = 'Chương 90: Dụng cụ và thiết bị quang học, nhiếp ảnh, điện ảnh, đo lường, kiểm tra, chính xác, y tế hoặc phẫu thuật';
  const chuBieu90KhongBp = 'Dụng cụ và thiết bị quang học, nhiếp ảnh, điện ảnh, đo lường, kiểm tra, chính xác, y tế hoặc phẫu thuật';
  const chuPhan18CoBp = 'PHẦN XVIII: DỤNG CỤ VÀ THIẾT BỊ ĐO LƯỜNG, KIỂM TRA; CÁC BỘ PHẬN VÀ PHỤ KIỆN CỦA CHÚNG';
  for (const f of fs.readdirSync(LUAT_THAT)) {
    const src = path.join(LUAT_THAT, f);
    if (!fs.statSync(src).isFile()) continue;
    if (f === 'chuong.jsonl') {
      const infoCh90 = L_THAT_P6.cau.get('chuong:90#1');
      const lines = docDong(src).map((l) => {
        const o = JSON.parse(l);
        if (o.id === infoCh90.nut) {
          o.nguyenVan = `${o.nguyenVan.slice(0, infoCh90.tu)}${chuCh90KhongBp}${o.nguyenVan.slice(infoCh90.den)}`;
        }
        return JSON.stringify(o);
      });
      fs.writeFileSync(path.join(luatProbe6, f), `${lines.join('\n')}\n`, 'utf8');
    } else if (f === 'bieu.jsonl') {
      const lines = docDong(src).map((l) => {
        const o = JSON.parse(l);
        if (o.id === 'bieu:90') o.nguyenVan = chuBieu90KhongBp;
        return JSON.stringify(o);
      });
      fs.writeFileSync(path.join(luatProbe6, f), `${lines.join('\n')}\n`, 'utf8');
    } else if (f === 'phan.jsonl') {
      const infoPhan18 = L_THAT_P6.cau.get('phan:XVIII#1');
      const lines = docDong(src).map((l) => {
        const o = JSON.parse(l);
        if (o.id === infoPhan18.nut) {
          o.nguyenVan = `${o.nguyenVan.slice(0, infoPhan18.tu)}${chuPhan18CoBp}${o.nguyenVan.slice(infoPhan18.den)}`;
        }
        return JSON.stringify(o);
      });
      fs.writeFileSync(path.join(luatProbe6, f), `${lines.join('\n')}\n`, 'utf8');
    } else {
      fs.symlinkSync(src, path.join(luatProbe6, f));
    }
  }
  for (const f of fs.readdirSync(path.join(LUAT_THAT, 'cau'))) {
    const src = path.join(LUAT_THAT, 'cau', f);
    if (!fs.statSync(src).isFile()) continue;
    if (f === 'chuong.jsonl') {
      const infoCh90 = L_THAT_P6.cau.get('chuong:90#1');
      const delta = chuCh90KhongBp.length - (infoCh90.den - infoCh90.tu);
      const lines = docDong(src).map((l) => {
        const o = JSON.parse(l);
        if (o.id === 'chuong:90#1') return JSON.stringify({ ...o, den: o.den + delta });
        if (L_THAT_P6.cau.get(o.id)?.nut === infoCh90.nut && o.tu >= infoCh90.den) {
          return JSON.stringify({ ...o, tu: o.tu + delta, den: o.den + delta });
        }
        return l;
      });
      fs.writeFileSync(path.join(luatProbe6, 'cau', f), `${lines.join('\n')}\n`, 'utf8');
    } else if (f === 'bieu.jsonl') {
      const lines = docDong(src).map((l) => {
        const o = JSON.parse(l);
        if (o.id === 'bieu:90#1') return JSON.stringify({ ...o, tu: 0, den: chuBieu90KhongBp.length });
        return l;
      });
      fs.writeFileSync(path.join(luatProbe6, 'cau', f), `${lines.join('\n')}\n`, 'utf8');
    } else if (f === 'phan.jsonl') {
      const infoPhan18 = L_THAT_P6.cau.get('phan:XVIII#1');
      const delta = chuPhan18CoBp.length - (infoPhan18.den - infoPhan18.tu);
      const lines = docDong(src).map((l) => {
        const o = JSON.parse(l);
        if (o.id === 'phan:XVIII#1') return JSON.stringify({ ...o, den: o.den + delta });
        if (L_THAT_P6.cau.get(o.id)?.nut === infoPhan18.nut && o.tu >= infoPhan18.den) {
          return JSON.stringify({ ...o, tu: o.tu + delta, den: o.den + delta });
        }
        return l;
      });
      fs.writeFileSync(path.join(luatProbe6, 'cau', f), `${lines.join('\n')}\n`, 'utf8');
    } else {
      fs.symlinkSync(src, path.join(luatProbe6, 'cau', f));
    }
  }
  for (const f of fs.readdirSync(path.join(LUAT_THAT, 'nghia-canh'))) {
    const src = path.join(LUAT_THAT, 'nghia-canh', f);
    if (fs.statSync(src).isFile()) fs.symlinkSync(src, path.join(luatProbe6, 'nghia-canh', f));
  }
  const L_PROBE6 = napLuatCong(luatProbe6);
  const metaProbe6 = napBieuMeta(luatProbe6);
  const canCuP6Am = timCauBoPhanTrenChuoiCha('bieu:9031', L_PROBE6);
  const kqPhanHoachP6Am = chungMinhPhanHoachCauTruc(con9031, dkTheoNut90, nguong90Map, {
    chaId: 'bieu:9031',
    L: L_PROBE6,
    bieuMeta: metaProbe6,
  });
  const rProbe6Am = chayCong({
    luat: luatProbe6,
    hoSo: path.join(GOC, 'data/ho-so-ma'),
    phamVi: ['bieu:9031'],
    chiTrong: true,
    cong: [5, 7],
    L: L_PROBE6,
    bieuMeta: metaProbe6,
  });

  kiem('PROBE 6 (ADR-0009 mục 6 — căn cứ câu bộ phận từ cha tới Chương, cấm mượn Phần): 9031 trả chuong:90#1 lưu vào vanTayCau; xoá khỏi Chương dù chèn vào Phần XVIII ⇒ Cổng 5 & Cổng 7 đều ĐỎ HO_PHU',
    kqCanCu9031?.dat === true
    && kqCanCu9031?.cauCanCu === 'chuong:90#1'
    && kqCanCu9031?.trichCanCu === 'bộ phận và phụ kiện của chúng'
    && bang9031That?.vanTayCau?.['chuong:90#1'] === vanTay(L_THAT_P6.chuCau('chuong:90#1'))
    && L_PROBE6.chuCau('phan:XVIII#1')?.toLowerCase().includes('bộ phận và phụ kiện của chúng') === true
    && canCuP6Am === null
    && kqPhanHoachP6Am === null
    && rProbe6Am.cong[5].loi.some((l) => /bang-anh-em\(bieu:9031\): vanTayCau lệch câu chuong:90#1/.test(l))
    && rProbe6Am.cong[7].loi.some((l) => /bieu:9031.*HO_PHU/.test(l)),
    { kqCanCu9031, vt90: bang9031That?.vanTayCau?.['chuong:90#1'], canCuP6Am, c5: rProbe6Am.cong[5].loi, c7: rProbe6Am.cong[7].loi });
}

fs.rmSync(TAM, { recursive: true, force: true });
console.log(`\ntest-dieu-kien: ${passed}/${passed + failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
