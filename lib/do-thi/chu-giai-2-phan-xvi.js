// lib/do-thi/chu-giai-2-phan-xvi.js — Áp dụng tất định Chú giải 2 Phần XVI (HS2022, ADR-0004 Việc 2).
//
// 0 AI, không gọi mạng, chỉ đọc data/luat/chu-giai-2-phan-xvi.json (tĩnh, có trích dẫn nguyên văn từ
// data/chu-giai-chuong.json và data/chu-giai-heading.json). Nơi dùng: lib/do-thi/bac-thang.js (sau HS_TIM_TRUOC=do-thi, mặc định TẮT).
'use strict';

const fs = require('fs');
const { dataReadPath } = require('../data-paths');
const { khongDau } = require('./tu-khoa');

const THU_TU_AP_DUNG = [
  'LOAI_TRU_CHU_GIAI_1',
  '2a_DINH_DANH_RIENG',
  '2b_BO_PHAN_CHUYEN_DUNG',
  '2c_BO_PHAN_CON_LAI',
];

const NHOM_DAU_CG2 = new Set(['8484', '8544', '8545', '8546', '8547']);
const NHOM_8517_UU_TIEN = new Set(['8517', '8525', '8526', '8527', '8528']);
const DAU_NOI_MAY_ME = [
  ' dung cho ', ' su dung cho ', ' lap cho ', ' lap tren ', ' lap dat cho ', ' gan cho ', ' gan tren ',
  ' dung trong ', ' cua may ', ' cua thiet bi ', ' cua dong co ', ' cua to may ', ' cua ',
  ' cho may ', ' cho thiet bi ', ' cho dong co ', ' cho he thong ', ' cho van thang ', ' cho bang tai ',
];
const CUM_BO_PHAN_NOI_BO_GIU_NGUYEN = ['con lan dung cho o bi', 'bi thep dung cho o bi'];

let _cacheBang = null;
let _cacheChiMuc = null;

/**
 * Đọc và lưu cache bảng thứ tự Chú giải 2 Phần XVI từ data/luat/chu-giai-2-phan-xvi.json.
 * @returns {object}
 */
function taiBangChuGiai2() {
  if (_cacheBang) return _cacheBang;
  const raw = fs.readFileSync(dataReadPath('luat', 'chu-giai-2-phan-xvi.json'), 'utf8');
  const bang = JSON.parse(raw);

  const loaiTruTheoId = new Map();
  for (const m of bang.loaiTruTruocKhiXet || []) loaiTruTheoId.set(m.id, m);

  const nhom2aTheoMa = new Map();
  for (const m of bang.nhom2aDinhDanhRieng || []) nhom2aTheoMa.set(m.nhom, m);

  const nhom2bTheoMa = new Map();
  const mayMeSang2b = new Map();
  for (const ch of ['84', '85']) {
    for (const m of bang.nhom2bBoPhanTheoChuong?.[ch] || []) {
      nhom2bTheoMa.set(m.nhom, m);
      if (m.vaiTro === '2b') {
        for (const may of m.dungChoCacNhom || []) mayMeSang2b.set(may, m);
      }
    }
  }

  _cacheBang = bang;
  _cacheChiMuc = { loaiTruTheoId, nhom2aTheoMa, nhom2bTheoMa, mayMeSang2b };
  return _cacheBang;
}

/** Xoá cache (phục vụ test cô lập dữ liệu). */
function datLaiCache() {
  _cacheBang = null;
  _cacheChiMuc = null;
}

function chiMuc() {
  if (!_cacheChiMuc) taiBangChuGiai2();
  return _cacheChiMuc;
}

function chuanChu(s) {
  return khongDau(s || '');
}

function chuanCoDau(s) {
  return String(s || '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function coCum(chu, cum) {
  if (!chu || !cum) return false;
  const esc = cum.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^| )${esc}(?:$| )`).test(chu);
}

function coBatKyCum(chu, dsCum) {
  return dsCum.some((c) => coCum(chu, c));
}

function batDauBangCum(chu, cum) {
  if (!chu || !cum) return false;
  return chu === cum || chu.startsWith(`${cum} `);
}

function batDauBangBatKyCum(chu, dsCum) {
  return dsCum.some((c) => batDauBangCum(chu, c));
}

function tachNhomMayMe(nhomMayMe, dacTinh = {}) {
  const nguon = [];
  if (Array.isArray(nhomMayMe)) nguon.push(...nhomMayMe);
  else if (nhomMayMe != null) nguon.push(nhomMayMe);
  if (Array.isArray(dacTinh?.cacNhomMayMe)) nguon.push(...dacTinh.cacNhomMayMe);

  const ra = [];
  const thay = new Set();
  for (const x of nguon) {
    const sach = String(x || '').replace(/(\d{2})\.(\d{2})/g, '$1$2');
    for (const m of sach.matchAll(/\b((?:84|85)\d{2})\d*\b/g)) {
      if (!thay.has(m[1])) {
        thay.add(m[1]);
        ra.push(m[1]);
      }
    }
  }
  return ra;
}

function gopTrich(...ds) {
  const ra = [];
  const thay = new Set();
  for (const t of ds.flat()) {
    if (!t || !t.tep || !t.khoa || !t.nguyenVan) continue;
    const key = `${t.tep}|${t.khoa}|${t.nguyenVan}`;
    if (!thay.has(key)) {
      thay.add(key);
      ra.push(t);
    }
  }
  return ra;
}

function trichNote2(phan, muc) {
  const nv = phan?.nguonGoc?.nguyenVan || '';
  const start = nv.indexOf(muc);
  if (start < 0) return phan?.nguonGoc;
  const endMarker = muc === '(a)' ? '(b)' : muc === '(b)' ? '(c)' : null;
  const end = endMarker ? nv.indexOf(endMarker, start) : nv.length;
  return {
    tep: phan.nguonGoc.tep,
    khoa: phan.nguonGoc.khoa,
    nguyenVan: nv.slice(start, end > start ? end : nv.length).trim(),
  };
}

function docChatLieu(chuThe, chuTheGoc, dacTinh = {}) {
  const clRaw = dacTinh.chatLieu || dacTinh.vatLieu || '';
  const cl = chuanChu(clRaw);
  const clDia = chuanCoDau(clRaw);
  const gop = cl || chuThe;
  const gopDia = clDia || chuTheGoc;
  const laCaoSuCung = coBatKyCum(gop, ['cao su cung', 'cao su luu hoa cung', 'ebonit', 'ebonite']);
  return {
    nhua: coBatKyCum(gop, ['nhua', 'plastic', 'pvc', 'abs', 'pp', 'pe', 'pa', 'pom', 'nylon', 'ptfe', 'teflon', 'polyme']),
    caoSuMem: !laCaoSuCung && coBatKyCum(gop, ['cao su', 'cao su luu hoa', 'rubber', 'epdm', 'nbr', 'silicone']),
    thanChi: coBatKyCum(gop, ['than chi', 'graphit', 'graphite', 'cacbon', 'carbon']),
    // Tránh nhầm "sử dụng" (su dung) hoặc "cao su" (cao su) thành gốm sứ
    gomSu: coBatKyCum(gop, ['gom su', 'bang su', 'chat lieu su', 'vat lieu su', 'su ky thuat', 'ceramic', 'porcelain'])
      || coBatKyCum(gopDia, ['gốm', 'sứ'])
      || (cl && coBatKyCum(cl, ['gom', 'su']) && !coCum(cl, 'cao su')),
    thuyTinh: coBatKyCum(gop, ['thuy tinh', 'glass']),
    daThuoc: coBatKyCum(gop, ['da thuoc', 'da tong hop', 'da long']),
    det: coBatKyCum(gop, ['vai det', 'vat lieu det', 'soi det', 'ni ky thuat', 'phot len']),
  };
}

function docChuyenDongQuay(tenNorm, dacTinh = {}) {
  if (typeof dacTinh.trucQuay === 'boolean') return dacTinh.trucQuay;
  if (typeof dacTinh.chuyenDongQuay === 'boolean') return dacTinh.chuyenDongQuay;
  const cd = chuanChu(dacTinh.chuyenDong || dacTinh.loaiChuyenDong || '');
  if (cd === 'truc quay' || cd === 'quay' || cd === 'xoay') return true;
  if (cd === 'chay thang' || cd === 'tinh tien' || cd === 'khong quay') return false;
  if (coBatKyCum(tenNorm, ['truc quay', 'chuyen dong quay'])) return true;
  if (coBatKyCum(tenNorm, ['chay thang', 'tinh tien', 'khong quay'])) return false;
  return null;
}

/**
 * Tách phần danh từ chủ thể đứng trước quan hệ máy mẹ ("dùng cho...", "của...", hoặc tên máy mẹ ở cuối).
 * Giữ lại bản đã bóc lượng từ dẫn đầu ("01 chiếc...", "cụm...") để khớp 2(a) đúng tại vị trí chủ thể (index 0).
 */
function tachChuTheHang(tenNorm, tenGoc, mayMeNorm) {
  let catIdx = tenNorm.length;
  if (!CUM_BO_PHAN_NOI_BO_GIU_NGUYEN.some((c) => coCum(tenNorm, c))) {
    for (const sep of DAU_NOI_MAY_ME) {
      const idx = tenNorm.indexOf(sep);
      if (idx > 0 && idx < catIdx) catIdx = idx;
    }
  }
  let chuThe = tenNorm.slice(0, catIdx).trim();
  if (mayMeNorm && chuThe.endsWith(` ${mayMeNorm}`) && chuThe.length > mayMeNorm.length + 2) {
    chuThe = chuThe.slice(0, -mayMeNorm.length).trim();
  }
  const soTu = chuThe ? chuThe.split(' ').length : 0;
  const chuTheGoc = tenGoc.split(' ').slice(0, soTu).join(' ').trim();
  const boLuong = (s) => s.replace(/^(?:\d+\s+)?(?:chiec|chiếc|cai|cái|cum|cụm)\s+/i, '').trim();
  return {
    chuThe,
    chuTheGoc,
    chuTheDau: boLuong(chuThe),
    chuTheGocDau: boLuong(chuTheGoc),
  };
}

// ──────────────────────────── Bước 1: Soát Chú giải 1 & đầu Chú giải 2 ────────────────────────────
function soatChuGiai1({ tenNorm, chuTheObj, dsNhomMayMe, dacTinh, chatLieu, bang, idx }) {
  const { chuThe, chuTheDau, chuTheGocDau } = chuTheObj;
  const trich1g = idx.loaiTruTheoId.get('CG1_PXVI_1g');
  const chotLoaiTru = (nhomKetQua, muc, lyDo, trichThem = []) => ({
    trangThai: 'CHOT',
    nhomKetQua,
    buocDung: 'LOAI_TRU_CHU_GIAI_1',
    quyTac: `${muc.nhomLoaiTru === 'CHU_GIAI_1_PHAN_XVI' ? `Chú giải ${muc.diem} Phần XVI` : muc.diem}`,
    diemLoaiTru: muc.diem,
    lyDo,
    ungVien: [nhomKetQua],
    cauHoi: null,
    trich: gopTrich(muc.trich, muc.trichBoSung, ...trichThem),
  });

  // 0) 5 nhóm loại trừ ở đầu Chú giải 2 (bộ phận của hàng hóa thuộc 8484, 8544, 8545, 8546, 8547)
  const boPhanCua5 = dacTinh.boPhanCuaNhom ? String(dacTinh.boPhanCuaNhom).replace(/\D/g, '').slice(0, 4) : null;
  if (boPhanCua5 && NHOM_DAU_CG2.has(boPhanCua5)) {
    const muc = idx.loaiTruTheoId.get(`CG2_DAU_${boPhanCua5}`);
    const nhomKq = boPhanCua5 === '8545' && coBatKyCum(tenNorm, ['gia do choi than', 'bo phan giu choi than'])
      ? null
      : (chatLieu.nhua ? '3926' : 'Chương theo chất liệu');
    if (nhomKq) {
      return chotLoaiTru(nhomKq, muc, `Bộ phận của hàng hóa thuộc nhóm ${boPhanCua5} bị loại khỏi phạm vi Chú giải 2 Phần XVI, phân loại theo chất liệu cấu thành.`);
    }
  }

  // 1) Chú giải 1(g): Bộ phận có công dụng chung (Chú giải 2 Phần XV) hoặc tương tự bằng plastic (Chương 39)
  const laVitTruyen = batDauBangBatKyCum(chuTheDau, ['vit bi', 'vit dua', 'truc vit', 'vit me', 'may ban vit']);
  const laBanhXich = batDauBangBatKyCum(chuTheDau, ['banh xich', 'dia xich']);
  const laVanHoanChinh = batDauBangBatKyCum(chuTheDau, ['van dien tu', 'van giam ap', 'van bi', 'van buom', 'van cong', 'van mot chieu', 'van tiet luu', 'van thuy luc', 'van khi nen', 'van an toan', 'voi nuoc'])
    || (batDauBangCum(chuTheGocDau, 'van') && !batDauBangBatKyCum(chuTheDau, ['van thang', 'van tai', 'van hanh', 'van chuyen', 'van toc']));
  const laOngLotCachDien = batDauBangBatKyCum(chuTheDau, ['ong dan day dien', 'phu kien cach dien']);
  const laKhopTruc = batDauBangBatKyCum(chuTheDau, ['khop noi truc', 'khop noi van nang', 'khop cac dang']);

  let nhom1g = null;
  if (batDauBangBatKyCum(chuTheDau, ['bu long', 'bulong', 'oc vit', 'dinh vit', 'dai oc', 'ecu', 'e cu', 'dinh tan', 'chot che', 'long den', 'vong dem lo xo'])
      || (batDauBangCum(chuTheGocDau, 'vít') && !laVitTruyen)) {
    nhom1g = chatLieu.nhua ? '3926' : '7318';
  } else if (batDauBangBatKyCum(chuTheDau, ['lo xo', 'la lo xo']) && !coCum(chuThe, 'dong ho')) {
    nhom1g = chatLieu.nhua ? '3926' : '7320';
  } else if ((batDauBangBatKyCum(chuTheDau, ['day xich', 'xich tai', 'xich con lan']) || batDauBangCum(chuTheGocDau, 'xích')) && !laBanhXich) {
    nhom1g = chatLieu.nhua ? '3926' : '7315';
  } else if (batDauBangBatKyCum(chuTheDau, ['cap thep', 'day cap thep']) && !coBatKyCum(tenNorm, ['cach dien', 'cap dien'])) {
    nhom1g = '7312';
  } else if (batDauBangBatKyCum(chuTheDau, ['cut noi ong', 'te noi ong', 'co noi ong', 'mat bich', 'khop noi ong'])
      && !laVanHoanChinh && !laOngLotCachDien && !laKhopTruc) {
    nhom1g = chatLieu.nhua ? '3917' : '7307';
  } else if (batDauBangBatKyCum(chuTheDau, ['ban le', 'banh xe day', 'tay nam cua']) && !coCum(chuThe, 'con lan')) {
    nhom1g = chatLieu.nhua ? '3926' : '8302';
  } else if (batDauBangBatKyCum(chuTheDau, ['o khoa', 'khoa cua'])) {
    nhom1g = chatLieu.nhua ? '3926' : '8301';
  } else if (dacTinh.boPhanCongDungChung === true || dacTinh.loaiTruChuGiai1 === '1(g)') {
    nhom1g = chatLieu.nhua ? '3926' : '7318';
  }
  if (nhom1g) {
    return chotLoaiTru(
      nhom1g,
      trich1g,
      `Bộ phận có công dụng chung bị loại khỏi Phần XVI theo Chú giải 1(g) Phần XVI và Chú giải 2 Phần XV → ${nhom1g}.`,
    );
  }

  // 2) Chú giải 1(a): Băng truyền/dây đai plastic (39) hoặc cao su lưu hóa (40.10), sản phẩm kỹ thuật cao su lưu hóa trừ cao su cứng (40.16)
  const laDai = batDauBangBatKyCum(chuTheDau, ['bang truyen', 'bang tai', 'day dai', 'day curoa']);
  const laBoLamKinCoKhi = batDauBangBatKyCum(chuTheDau, ['bo lam kin kieu co khi', 'bo lam kin co khi', 'phot co khi', 'vong lam kin dau', 'phot chan dau']);
  if (dacTinh.loaiTruChuGiai1 === '1(a)' || (chatLieu.caoSuMem && !laBoLamKinCoKhi && !batDauBangCum(chuTheDau, 'bo gioang'))) {
    const muc = idx.loaiTruTheoId.get('CG1_PXVI_1a');
    const nhom = laDai ? '4010' : '4016';
    return chotLoaiTru(nhom, muc, `Sản phẩm bằng cao su lưu hóa (trừ cao su cứng) bị loại khỏi Phần XVI theo Chú giải 1(a) → ${nhom}.`);
  }
  if (chatLieu.nhua && laDai) {
    const muc = idx.loaiTruTheoId.get('CG1_PXVI_1a');
    return chotLoaiTru('3926', muc, 'Băng truyền, băng tải hoặc dây đai bằng plastic bị loại khỏi Phần XVI theo Chú giải 1(a) → Chương 39 (3926).');
  }

  // 3) Chú giải 1(b), 1(c), 1(e), 1(h), 1(o), 1(q) Phần XVI
  if (dacTinh.loaiTruChuGiai1 === '1(b)' || (chatLieu.daThuoc && batDauBangBatKyCum(chuTheDau, ['dem da', 'mieng dem da', 'gioang da', 'dai da', 'san pham bang da']))) {
    const muc = idx.loaiTruTheoId.get('CG1_PXVI_1b');
    return chotLoaiTru('4205', muc, 'Sản phẩm bằng da thuộc hoặc da tổng hợp dùng cho mục đích kỹ thuật bị loại khỏi Phần XVI theo Chú giải 1(b) → 4205.');
  }
  if (dacTinh.loaiTruChuGiai1 === '1(c)' || batDauBangBatKyCum(chuTheDau, ['ong chi', 'bo bin', 'suot soi', 'loi ong soi', 'truc cuon chi'])) {
    const muc = idx.loaiTruTheoId.get('CG1_PXVI_1c');
    const nhom = chatLieu.nhua ? '3926' : 'Chương 39/44/48/Phần XV';
    return chotLoaiTru(nhom, muc, 'Ống chỉ, trục cuốn, bô bin bị loại khỏi Phần XVI theo Chú giải 1(c), phân loại theo vật liệu cấu thành.');
  }
  if (dacTinh.loaiTruChuGiai1 === '1(e)' || (chatLieu.det && laDai)) {
    const muc = idx.loaiTruTheoId.get('CG1_PXVI_1e');
    const nhom = laDai ? '5910' : '5911';
    return chotLoaiTru(nhom, muc, `Băng truyền/dây đai hoặc sản phẩm kỹ thuật bằng vật liệu dệt bị loại khỏi Phần XVI theo Chú giải 1(e) → ${nhom}.`);
  }
  if (dacTinh.loaiTruChuGiai1 === '1(h)' || (batDauBangCum(chuTheDau, 'ong khoan') && !coCum(chuThe, 'dan huong'))) {
    const muc = idx.loaiTruTheoId.get('CG1_PXVI_1h');
    return chotLoaiTru('7304', muc, 'Ống khoan bị loại khỏi Phần XVI theo Chú giải 1(h) → 7304.');
  }
  if (dacTinh.loaiTruChuGiai1 === '1(k)' || dacTinh.loaiTruChuGiai1 === '1(o)'
      || batDauBangBatKyCum(chuTheDau, ['mui khoan', 'dao phay', 'dao tien', 'mui ta ro', 'khuon dap'])) {
    const muc = idx.loaiTruTheoId.get('CG1_PXVI_1o');
    return chotLoaiTru('8207', muc, 'Dụng cụ có thể thay đổi bị loại khỏi Phần XVI theo Chú giải 1(o) (và 1(k)) → 8207.');
  }
  if (batDauBangCum(chuTheDau, 'ban chai') && !coCum(chuThe, 'choi than')) {
    const muc = idx.loaiTruTheoId.get('CG1_PXVI_1o');
    return chotLoaiTru('9603', muc, 'Bàn chải sử dụng như bộ phận máy bị loại khỏi Phần XVI theo Chú giải 1(o) → 9603.');
  }
  if (dacTinh.loaiTruChuGiai1 === '1(l)' || dacTinh.thuocPhanXVII === true) {
    const muc = idx.loaiTruTheoId.get('CG1_PXVI_1l');
    return chotLoaiTru('Phần XVII', muc, 'Sản phẩm thuộc Phần XVII bị loại khỏi Phần XVI theo Chú giải 1(l).');
  }
  if (dacTinh.loaiTruChuGiai1 === '1(q)' || batDauBangBatKyCum(chuTheDau, ['monopod', 'bipod', 'tripod', 'gay chup anh'])) {
    const muc = idx.loaiTruTheoId.get('CG1_PXVI_1q');
    return chotLoaiTru('9620', muc, 'Chân đế monopod/bipod/tripod bị loại khỏi Phần XVI theo Chú giải 1(q) → 9620.');
  }

  // 4) Chú giải 1 Chương 84 & Chương 85 (đá mài, gốm sứ, thủy tinh)
  const laDien = dacTinh.dungDien === true || (dsNhomMayMe.length > 0 && dsNhomMayMe.every((m) => m.startsWith('85')));
  if (batDauBangBatKyCum(chuTheDau, ['da mai', 'da nghien'])) {
    const muc = idx.loaiTruTheoId.get('CG1_CH84_1a');
    return chotLoaiTru('6804', muc, 'Đá nghiền, đá mài thuộc Chương 68 bị loại khỏi Chương 84 theo Chú giải 1(a) Chương 84 → 6804.');
  }
  if (chatLieu.gomSu && !laDien && !coBatKyCum(tenNorm, ['cach dien', 'tu dien', 'bugi'])) {
    const muc = idx.loaiTruTheoId.get('CG1_CH84_1b');
    return chotLoaiTru('6909', muc, 'Máy móc hoặc bộ phận bằng vật liệu gốm sứ bị loại khỏi Chương 84 theo Chú giải 1(b) Chương 84 → 6909.');
  }
  if (chatLieu.thuyTinh && batDauBangBatKyCum(chuTheDau, ['vo thuy tinh bong den', 'vo bong den', 'ong thuy tinh den'])) {
    const muc = idx.loaiTruTheoId.get('CG1_CH85_1b');
    return chotLoaiTru('7011', muc, 'Sản phẩm thủy tinh vỏ bóng đèn/ống đèn bị loại khỏi Chương 85 theo Chú giải 1(b) Chương 85 → 7011.');
  }
  if (chatLieu.thuyTinh && !laDien && !coCum(tenNorm, 'cach dien')) {
    const muc = idx.loaiTruTheoId.get('CG1_CH84_1c');
    return chotLoaiTru('7020', muc, 'Máy, thiết bị và bộ phận bằng thủy tinh bị loại khỏi Chương 84 theo Chú giải 1(c) Chương 84 → 7020.');
  }

  void bang;
  return null;
}

// ──────────────────────────── Bước 2: Soát 2(a) Nhóm định danh riêng ────────────────────────────
// Mọi cụm trong `cum` / `cumGocCoDau` được kiểm neo theo CHỦ THỂ ở đầu chuỗi (`chuTheDau` / `chuTheGocDau`),
// nên tên máy mẹ đứng sau danh từ bộ phận ("piston động cơ xăng", "vòng đệm máy phát điện", "bộ lọc dầu máy phát điện")
// KHÔNG BAO GIỜ cướp nhầm nhóm của máy mẹ!
const LUAT_KHOP_2A = [
  { nhom: '8545', cum: ['choi than', 'dien cuc than', 'dien cuc graphit', 'than dien cuc', 'choi carbon', 'choi kim loai'] },
  {
    nhom: '8483',
    kieu: '8483',
    oTruot: ['o truot', 'goi do truc dung o truot', 'bac truc', 'bac lot truc', 'bac truot'],
    cum: [
      'goi do vong bi', 'than o', 'goi do truc', 'truc truyen dong', 'truc cam', 'truc khuyu',
      'tay bien', 'banh rang', 'cum banh rang', 'hop so', 'vit bi', 'vit dua', 'vit me bi',
      'banh da', 'rong roc', 'puli', 'ly hop', 'khop noi truc', 'khop noi van nang', 'dia xich',
      'banh xich', 'bo dieu toc', 'co cau dieu toc', 'truc don gian khong truyen luc',
    ],
  },
  { nhom: '8482', cum: ['vong bi', 'o bi', 'o dua', 'o lan', 'bac dan', 'bi thep o bi', 'con lan dung cho o bi'] },
  {
    nhom: '8481',
    kieu: '8481',
    cum: [
      'van dien tu', 'van giam ap', 'van bi', 'van buom', 'van cong', 'van mot chieu',
      'van tiet luu', 'van khi nen', 'van thuy luc', 'van an toan', 'van hut', 'van nen',
      'van xa', 'van nap', 'van truot', 'voi nuoc', 'num bom mo',
    ],
    cumGocCoDau: ['van'],
  },
  { nhom: '8484', cum: ['bo lam kin kieu co khi', 'bo lam kin co khi', 'phot co khi', 'bo gioang', 'bo dem gioang', 'gioang tam kim loai'] },
  { nhom: '8501', kieu: '8501', cum: ['dong co dien', 'mo to dien', 'motor dien', 'may phat dien'] },
  { nhom: '8502', cum: ['to may phat dien', 'may bien doi dien quay'] },
  { nhom: '8504', cum: ['may bien ap', 'bien the', 'cuon cam', 'bo chinh luu', 'nguon xung', 'bo doi nguon'] },
  { nhom: '8505', cum: ['nam cham dien', 'nam cham vinh cuu', 'ly hop dien tu', 'ly hop nam cham dien', 'phanh dien tu', 'ban cap tu'] },
  { nhom: '8506', cum: ['pin kho', 'bo pin khong sac'] },
  { nhom: '8507', cum: ['ac quy', 'ac qui', 'pin sac', 'pin lithium'] },
  { nhom: '8511', cum: ['bugi', 'cuon day danh lua', 'mo bin danh lua', 'cu de', 'dong co khoi dong'] },
  { nhom: '8512', cum: ['den pha xe', 'den xi nhan', 'coi xe', 'can gat nuoc xe'] },
  { nhom: '8516', cum: ['dien tro dot nong', 'dien tro nhiet', 'thanh gia nhiet dien', 'day mai so'] },
  { nhom: '8518', cum: ['micro', 'loa dien', 'tai nghe', 'bo khuech dai am tan', 'tang am dien'] },
  { nhom: '8523', cum: ['the nho', 'o cung ssd', 'the thong minh', 'usb nho'] },
  { nhom: '8524', cum: ['mo dun man hinh det', 'module man hinh det', 'man hinh lcd', 'tam man hinh lcd'] },
  { nhom: '8530', cum: ['thiet bi tin hieu giao thong'] },
  { nhom: '8531', cum: ['chuong bao', 'coi bao', 'bao dong chong trom', 'bao chay'] },
  { nhom: '8537', cum: ['tu dien dieu khien', 'tu phan phoi dien', 'bang dieu khien dien'], cumGocCoDau: ['tủ điện'] },
  { nhom: '8532', cumGocCoDau: ['tụ điện'], cumKhongDauNeuKhongTu: ['tu dien'] },
  { nhom: '8533', cum: ['dien tro', 'bien tro', 'chiet ap'] },
  { nhom: '8534', cum: ['mach in', 'bang mach in', 'pcb'] },
  { nhom: '8535', cum: ['cau dao cao ap', 'aptomat cao ap', 'chong set cao ap'] },
  { nhom: '8536', cum: ['cau dao', 'aptomat', 'ro le', 'cong tac dien', 'cong tac', 'cau chi', 'phich cam', 'o cam', 'dui den', 'dau noi dien', 'hop dau noi', 'dau noi soi quang'] },
  { nhom: '8539', cum: ['bong den', 'den led', 'bong den led', 'den soi dot', 'den huynh quang'] },
  { nhom: '8540', cum: ['den dien tu', 'ong dien tu', 'ong tia am cuc'] },
  { nhom: '8541', cum: ['di ot', 'tranzito', 'linh kien ban dan', 'te bao quang dien', 'pin mat troi', 'tam pin mat troi', 'cam bien ban dan', 'di ot phat quang'] },
  { nhom: '8542', cum: ['mach tich hop', 'vi mach', 'ic'] },
  { nhom: '8544', cum: ['day dien cach dien', 'cap dien cach dien', 'cap dong truc', 'day cap dien', 'bo day dien', 'cap soi quang'] },
  { nhom: '8546', cum: ['vat cach dien', 'su cach dien'] },
  { nhom: '8547', cum: ['phu kien cach dien', 'ong dan day dien lot cach dien', 'loi cuon day cach dien'] },
  { nhom: '8407', cum: ['dong co xang', 'dong co dot trong tia lua dien'] },
  { nhom: '8408', cum: ['dong co diesel', 'dong co ban diesel'] },
  { nhom: '8412', cum: ['xi lanh thuy luc', 'xi lanh khi nen', 'dong co thuy luc', 'dong co khi nen'] },
  { nhom: '8413', cum: ['bom chat long', 'bom thuy luc', 'bom dau', 'bom nuoc', 'bom xang', 'bom phun', 'may bom'] },
  { nhom: '8414', cum: ['bom chan khong', 'bom khong khi', 'may nen khi', 'quat gio', 'quat lam mat', 'quat tan nhiet', 'quat hut'] },
  { nhom: '8421', cum: ['bo loc dau', 'bo loc gio', 'bo loc khi', 'bo loc nuoc', 'bo loc', 'bo phan loc', 'loc dau', 'loc gio', 'loc khi', 'loc nuoc', 'loi loc', 'may ly tam'] },
  { nhom: '8480', cum: ['khuon duc', 'hop khuon duc', 'khuon ep nhua'] },
  { nhom: '8486', cum: ['may san xuat ban dan'] },
  { nhom: '8402', cum: ['noi hoi tao hoi nuoc', 'noi hoi qua nhiet'] },
  { nhom: '8404', cum: ['thiet bi phu tro noi hoi', 'bo tiet kiem nhien lieu noi hoi'] },
  { nhom: '8406', cum: ['tua bin hoi nuoc'] },
  { nhom: '8410', cum: ['tua bin thuy luc', 'banh xe guong nuoc'] },
  { nhom: '8411', cum: ['tua bin phan luc', 'tua bin khi'] },
  { nhom: '8416', cum: ['dau dot lo luyen', 'may nap nhien lieu co khi'] },
  { nhom: '8425', cum: ['toi nang hoan chinh', 'pa lang hoan chinh', 'kich thuy luc hoan chinh'] },
  { nhom: '8426', cum: ['can truc hoan chinh', 'cong truc hoan chinh'] },
  { nhom: '8428', cum: ['thang may hoan chinh', 'bang tai hoan chinh'] },
];

function timNhom2bChoMayMe(dsNhomMayMe, idx) {
  if (!dsNhomMayMe.length) return { loai: 'KHONG_CO' };
  const tap = new Set(dsNhomMayMe);
  if (tap.has('8517') && [...tap].every((m) => NHOM_8517_UU_TIEN.has(m)) && [...tap].some((m) => m !== '8517')) {
    return { loai: 'UU_TIEN_8517', muc: idx.nhom2bTheoMa.get('8517') };
  }
  if (dsNhomMayMe.every((m) => NHOM_DAU_CG2.has(m))) {
    return { loai: 'LOAI_BO_PHAN_5_NHOM_DAU_CG2', nhom: dsNhomMayMe[0] };
  }
  const nhomDich = new Set();
  let coNhomChuyen = false;
  let thieuNhomChuyen = false;
  for (const m of dsNhomMayMe) {
    const boPhan = idx.mayMeSang2b.get(m);
    if (boPhan) {
      coNhomChuyen = true;
      nhomDich.add(boPhan.nhom);
    } else {
      thieuNhomChuyen = true;
      nhomDich.add(m);
    }
  }
  if (nhomDich.size === 1) {
    const ma = [...nhomDich][0];
    if (coNhomChuyen && !thieuNhomChuyen) return { loai: 'NHOM_BO_PHAN_2B', muc: idx.nhom2bTheoMa.get(ma), nhom: ma };
    return { loai: 'NHOM_MAY_CHU', nhom: ma };
  }
  return { loai: 'NHIEU_LOAI_MAY' };
}

function kiemNgoaiLe8545({ tenNorm, chuTheDau, dacTinh, muc2a, trich2a, idx, vetXet, loaiTruDaGhi }) {
  const laGiaDo = batDauBangBatKyCum(chuTheDau, ['gia do', 'bo phan giu', 'khung giu', 'gia giu', 'o giu'])
    && coCum(tenNorm, 'choi than');
  if (laGiaDo) {
    loaiTruDaGhi.push(muc2a.loaiTruRieng[0].trich);
    vetXet.push({
      buoc: '2a_DINH_DANH_RIENG',
      ketQua: 'LOAI_TRU_SANG_2B',
      chiTiet: 'Bộ phận giữ/giá đỡ chổi than (đã hoặc chưa gắn chổi than) bị loại khỏi 85.45 theo chú giải 85.45 mục (D) → chuyển xét 2(b).',
    });
    return { dung: false };
  }
  if (batDauBangCum(chuTheDau, 'choi kim loai')) {
    const nhom = dacTinh.dienAp > 1000 ? '8535' : '8536';
    return {
      dung: true,
      ketThuc: {
        trangThai: 'CHOT',
        nhomKetQua: nhom,
        buocDung: '2a_DINH_DANH_RIENG',
        quyTac: 'Chú giải 2(a) Phần XVI + Loại trừ 85.45',
        lyDo: `Chổi kim loại phủ bôi trơn than chì bị loại khỏi 85.45 sang ${nhom}.`,
        ungVien: [nhom],
        cauHoi: null,
        trich: gopTrich(trich2a, muc2a.loaiTruRieng[1].trich, idx.nhom2aTheoMa.get(nhom)?.trich),
      },
    };
  }
  if (batDauBangCum(chuTheDau, 'dien tro than')) {
    return {
      dung: true,
      ketThuc: {
        trangThai: 'CHOT',
        nhomKetQua: '8533',
        buocDung: '2a_DINH_DANH_RIENG',
        quyTac: 'Chú giải 2(a) Phần XVI + Loại trừ 85.45',
        lyDo: 'Điện trở than bị loại khỏi 85.45 sang 85.33.',
        ungVien: ['8533'],
        cauHoi: null,
        trich: gopTrich(trich2a, muc2a.loaiTruRieng[2].trich, idx.nhom2aTheoMa.get('8533')?.trich),
      },
    };
  }
  if (!batDauBangBatKyCum(chuTheDau, ['choi than', 'dien cuc than', 'dien cuc graphit', 'than dien cuc', 'choi carbon'])) {
    return { dung: false };
  }
  return {
    dung: true,
    ketThuc: {
      trangThai: 'CHOT',
      nhomKetQua: '8545',
      buocDung: '2a_DINH_DANH_RIENG',
      quyTac: 'Chú giải 2(a) Phần XVI',
      lyDo: 'Chổi than / điện cực graphit được định danh riêng tại nhóm 85.45 (thắng nhóm bộ phận 2(b)).',
      ungVien: ['8545'],
      cauHoi: null,
      trich: gopTrich(trich2a, { tep: 'data/chu-giai-heading.json', khoa: '8545.ten_nhom', nguyenVan: muc2a.tenNhom }, muc2a.trich),
    },
  };
}

function kiemNgoaiLe8483({ tenNorm, chuTheDau, dsNhomMayMe, dacTinh, chatLieu, muc2a, bang, trich2a, idx, vetXet, loaiTruDaGhi }) {
  const khopOTruot = batDauBangBatKyCum(chuTheDau, ['o truot', 'goi do truc dung o truot', 'bac truc', 'bac lot truc', 'bac truot']);
  const khopChung = batDauBangBatKyCum(chuTheDau, [
    'goi do vong bi', 'than o', 'goi do truc', 'truc truyen dong', 'truc cam', 'truc khuyu',
    'tay bien', 'banh rang', 'cum banh rang', 'hop so', 'vit bi', 'vit dua', 'vit me bi',
    'banh da', 'rong roc', 'puli', 'ly hop', 'khop noi truc', 'khop noi van nang', 'dia xich',
    'banh xich', 'bo dieu toc', 'co cau dieu toc', 'truc don gian khong truyen luc',
  ]);
  if (!khopOTruot && !khopChung) return { dung: false };

  if (chatLieu.thanChi && (khopOTruot || batDauBangBatKyCum(chuTheDau, ['o', 'bac']))) {
    return {
      dung: true,
      ketThuc: {
        trangThai: 'CHOT',
        nhomKetQua: '6815',
        buocDung: '2a_DINH_DANH_RIENG',
        quyTac: 'Loại trừ riêng nhóm 84.83 → 68.15',
        lyDo: 'Ổ bằng than chì hoặc carbon khác bị loại khỏi 84.83 sang 68.15.',
        ungVien: ['6815'],
        cauHoi: null,
        trich: gopTrich(muc2a.loaiTruRieng[1].trich, idx.loaiTruTheoId.get('CG1_CH84_1a')?.trich),
      },
    };
  }
  if (batDauBangBatKyCum(chuTheDau, ['ly hop dien tu', 'ly hop nam cham dien'])) {
    return {
      dung: true,
      ketThuc: {
        trangThai: 'CHOT',
        nhomKetQua: '8505',
        buocDung: '2a_DINH_DANH_RIENG',
        quyTac: 'Chú giải 2(a) Phần XVI + Loại trừ 84.83 → 85.05',
        lyDo: 'Ly hợp nam châm điện bị loại khỏi 84.83 sang nhóm 85.05.',
        ungVien: ['8505'],
        cauHoi: null,
        trich: gopTrich(trich2a, muc2a.loaiTruRieng[3].trich, idx.nhom2aTheoMa.get('8505')?.trich),
      },
    };
  }
  if (batDauBangCum(chuTheDau, 'truc don gian khong truyen luc')) {
    loaiTruDaGhi.push(muc2a.loaiTruRieng[2].trich);
    return { dung: false };
  }
  if (khopOTruot) {
    const trucQuay = docChuyenDongQuay(tenNorm, dacTinh);
    if (trucQuay === false) {
      loaiTruDaGhi.push(muc2a.trich);
      vetXet.push({
        buoc: '2a_DINH_DANH_RIENG',
        ketQua: 'KHONG_THOA_DIEU_KIEN_8483',
        chiTiet: 'Ổ trượt/bạc trục không có trục quay (chỉ chạy thẳng) → không đạt điều kiện 84.83 mục (B), chuyển xét 2(b).',
      });
      return { dung: false };
    }
    if (trucQuay === null) {
      const kq2b = timNhom2bChoMayMe(dsNhomMayMe, idx);
      const trich2b = trichNote2(bang, '(b)');
      const la2b = kq2b.loai === 'NHOM_BO_PHAN_2B';
      const ungVien = la2b ? ['8483', kq2b.nhom] : (kq2b.nhom ? ['8483', kq2b.nhom] : ['8483']);
      const luaChon = la2b ? ['Có trục quay (→ 8483)', `Chỉ chạy thẳng / tịnh tiến (→ ${kq2b.nhom})`] : ['Có trục quay (→ 8483)', 'Chỉ chạy thẳng / tịnh tiến'];
      return {
        dung: true,
        ketThuc: {
          trangThai: 'DUNG_HOI',
          nhomKetQua: null,
          buocDung: '2a_DINH_DANH_RIENG',
          quyTac: la2b ? 'Chú giải 2(a) vs 2(b) Phần XVI (thiếu điều kiện trục quay của 84.83)' : 'Chú giải 2(a) Phần XVI (thiếu điều kiện trục quay của 84.83)',
          lyDo: la2b
            ? `Ổ trượt/bạc trục chưa rõ trục có chuyển động quay (84.83) hay chỉ chạy thẳng theo máy chủ (${kq2b.nhom}).`
            : 'Ổ trượt/bạc trục chưa rõ trục có quay tròn hay không để chốt nhóm 84.83.',
          ungVien,
          cauHoi: {
            khoa: 'trucQuay',
            noiDung: 'Trục/ty đi qua bạc trục có chuyển động quay tròn không, hay chỉ chạy thẳng (tịnh tiến)?',
            luaChon,
            dieuKienLuat: 'Chú giải chi tiết nhóm 84.83 mục (B): gối đỡ trục dùng ổ trượt tạo ra một ổ trục trơn trong đó có một trục hoặc trục quay.',
            batBuoc: true,
          },
          trich: gopTrich(
            trich2a,
            { tep: 'data/chu-giai-heading.json', khoa: '8483.ten_nhom', nguyenVan: muc2a.tenNhom },
            muc2a.trich,
            trich2b,
            la2b ? { tep: 'data/chu-giai-heading.json', khoa: `${kq2b.nhom}.ten_nhom`, nguyenVan: kq2b.muc.tenNhom } : null,
            la2b ? kq2b.muc.trich : null,
          ),
        },
      };
    }
  }
  return {
    dung: true,
    ketThuc: {
      trangThai: 'CHOT',
      nhomKetQua: '8483',
      buocDung: '2a_DINH_DANH_RIENG',
      quyTac: 'Chú giải 2(a) Phần XVI',
      lyDo: khopOTruot
        ? 'Ổ trượt / bạc trục có trục quay đáp ứng điều kiện mục (B) nhóm 84.83 → 84.83 (thắng nhóm bộ phận 2(b)).'
        : 'Bộ phận truyền động / thân ổ được định danh riêng tại nhóm 84.83.',
      ungVien: ['8483'],
      cauHoi: null,
      trich: gopTrich(trich2a, { tep: 'data/chu-giai-heading.json', khoa: '8483.ten_nhom', nguyenVan: muc2a.tenNhom }, muc2a.trich),
    },
  };
}

function kiemNgoaiLe8481({ tenNorm, chuTheObj, dsNhomMayMe, muc2a, trich2a, idx, vetXet, loaiTruDaGhi }) {
  const { chuTheDau, chuTheGocDau } = chuTheObj;
  const khopVan = batDauBangBatKyCum(chuTheDau, [
    'van dien tu', 'van giam ap', 'van bi', 'van buom', 'van cong', 'van mot chieu',
    'van tiet luu', 'van khi nen', 'van thuy luc', 'van an toan', 'van hut', 'van nen',
    'van xa', 'van nap', 'van truot', 'voi nuoc', 'num bom mo',
  ]) || (batDauBangCum(chuTheGocDau, 'van') && !batDauBangBatKyCum(chuTheDau, ['van thang', 'van tai', 'van hanh', 'van chuyen', 'van toc']));
  if (!khopVan) return { dung: false };

  if (batDauBangCum(chuTheDau, 'num bom mo')) {
    const muc8487 = idx.nhom2bTheoMa.get('8487');
    return {
      dung: true,
      ketThuc: {
        trangThai: 'CHOT',
        nhomKetQua: '8487',
        buocDung: '2c_BO_PHAN_CON_LAI',
        quyTac: 'Loại trừ chú giải 84.81 → 84.87',
        lyDo: 'Núm bơm mỡ không tự động bị loại khỏi 84.81 sang 84.87.',
        ungVien: ['8487'],
        cauHoi: null,
        trich: gopTrich(muc2a.loaiTruRieng[0].trich, muc8487?.trich),
      },
    };
  }

  // Kiểm cả `tenNorm` (trước khi cắt "dùng cho...") và `dsNhomMayMe` để bắt đúng van bộ phận không hoàn chỉnh
  const vanMayNen = batDauBangBatKyCum(chuTheDau, ['van hut', 'van nen'])
    && (coBatKyCum(tenNorm, ['may nen', 'may nen khi', 'bom chan khong']) || dsNhomMayMe.includes('8414'));
  const vanDongCo = batDauBangBatKyCum(chuTheDau, ['van xa', 'van nap', 'xu pap', 'xupap'])
    && (coBatKyCum(tenNorm, ['dong co', 'dong co dot trong', 'dong co xang', 'dong co diesel']) || dsNhomMayMe.some((m) => m === '8407' || m === '8408'));
  const vanTruotHoiNuoc = batDauBangCum(chuTheDau, 'van truot')
    && (coBatKyCum(tenNorm, ['dong co hoi nuoc', 'tua bin hoi']) || dsNhomMayMe.includes('8406') || dsNhomMayMe.includes('8412'));

  if (vanMayNen || vanDongCo || vanTruotHoiNuoc) {
    loaiTruDaGhi.push(muc2a.loaiTruRieng[0].trich);
    vetXet.push({
      buoc: '2a_DINH_DANH_RIENG',
      ketQua: 'LOAI_TRU_SANG_2B',
      chiTiet: 'Van bộ phận điều chỉnh dòng bên trong máy (chưa tạo van hoàn chỉnh) bị loại khỏi 84.81 theo chú giải 84.81 → chuyển xét 2(b).',
    });
    return { dung: false };
  }

  return {
    dung: true,
    ketThuc: {
      trangThai: 'CHOT',
      nhomKetQua: '8481',
      buocDung: '2a_DINH_DANH_RIENG',
      quyTac: 'Chú giải 2(a) Phần XVI',
      lyDo: 'Vòi, van hoàn chỉnh được định danh riêng tại nhóm 84.81 theo Chú giải 2(a) Phần XVI.',
      ungVien: ['8481'],
      cauHoi: null,
      trich: gopTrich(trich2a, { tep: 'data/chu-giai-heading.json', khoa: '8481.ten_nhom', nguyenVan: muc2a.tenNhom }, muc2a.trich),
    },
  };
}

function kiemNgoaiLe8501({ tenNorm, chuTheObj, dsNhomMayMe, muc2a, trich2a, loaiTruDaGhi, vetXet }) {
  const { chuTheDau, chuTheGocDau } = chuTheObj;
  // Ngoại lệ 8501(a) CHỈ kích hoạt khi thực sự là trống/con lăn CÓ KẾT HỢP mô tơ điện / động cơ điện cho băng tải/băng truyền
  const laTrongKhongDau = chuTheDau === chuTheGocDau && batDauBangCum(chuTheDau, 'trong');
  const laTrongHoacConLan = batDauBangCum(chuTheGocDau, 'trống') || laTrongKhongDau || batDauBangCum(chuTheDau, 'con lan');
  const coMoToDien = coBatKyCum(tenNorm, ['mo to dien', 'motor dien', 'dong co dien', 'gan mo to', 'ket hop mo to', 'co mo to', 'gan dong co', 'ket hop dong co']);
  const choBangTai = coBatKyCum(tenNorm, ['bang tai', 'bang truyen', 'van thang']);
  if (laTrongHoacConLan && coMoToDien && choBangTai) {
    loaiTruDaGhi.push(muc2a.loaiTruRieng[0].trich);
    vetXet.push({
      buoc: '2a_DINH_DANH_RIENG',
      ketQua: 'LOAI_TRU_SANG_2B',
      chiTiet: 'Trống/con lăn kết hợp mô tơ điện dùng cho băng tải/truyền bị loại khỏi 85.01 sang 84.31.',
    });
    return { dung: false, ep8431: dsNhomMayMe.length === 0 };
  }

  if (!batDauBangBatKyCum(chuTheDau, ['dong co dien', 'mo to dien', 'motor dien', 'may phat dien'])) {
    return { dung: false };
  }

  return {
    dung: true,
    ketThuc: {
      trangThai: 'CHOT',
      nhomKetQua: '8501',
      buocDung: '2a_DINH_DANH_RIENG',
      quyTac: 'Chú giải 2(a) Phần XVI',
      lyDo: 'Động cơ điện / máy phát điện được định danh riêng tại nhóm 85.01 theo Chú giải 2(a) Phần XVI.',
      ungVien: ['8501'],
      cauHoi: null,
      trich: gopTrich(trich2a, { tep: 'data/chu-giai-heading.json', khoa: '8501.ten_nhom', nguyenVan: muc2a.tenNhom }, muc2a.trich),
    },
  };
}

function xet2aDinhDanhRieng({ tenNorm, chuTheObj, dsNhomMayMe, dacTinh, chatLieu, bang, idx, vetXet }) {
  const { chuTheDau, chuTheGocDau } = chuTheObj;
  const trich2a = trichNote2(bang, '(a)');
  const loaiTruDaGhi = [];
  let ep8431Tu8501 = false;

  for (const luat of LUAT_KHOP_2A) {
    const muc2a = idx.nhom2aTheoMa.get(luat.nhom);
    if (!muc2a) continue;

    if (luat.nhom === '8545') {
      const kq = kiemNgoaiLe8545({ tenNorm, chuTheDau, dacTinh, muc2a, trich2a, idx, vetXet, loaiTruDaGhi });
      if (kq.dung) return { ketThuc: kq.ketThuc, loaiTruDaGhi, ep8431Tu8501 };
      continue;
    }
    if (luat.nhom === '8483') {
      const kq = kiemNgoaiLe8483({ tenNorm, chuTheDau, dsNhomMayMe, dacTinh, chatLieu, muc2a, bang, trich2a, idx, vetXet, loaiTruDaGhi });
      if (kq.dung) return { ketThuc: kq.ketThuc, loaiTruDaGhi, ep8431Tu8501 };
      continue;
    }
    if (luat.nhom === '8481') {
      const kq = kiemNgoaiLe8481({ tenNorm, chuTheObj, dsNhomMayMe, muc2a, trich2a, idx, vetXet, loaiTruDaGhi });
      if (kq.dung) return { ketThuc: kq.ketThuc, loaiTruDaGhi, ep8431Tu8501 };
      continue;
    }
    if (luat.nhom === '8501') {
      const kq = kiemNgoaiLe8501({ tenNorm, chuTheObj, dsNhomMayMe, muc2a, trich2a, loaiTruDaGhi, vetXet });
      if (kq.ep8431) ep8431Tu8501 = true;
      if (kq.dung) return { ketThuc: kq.ketThuc, loaiTruDaGhi, ep8431Tu8501 };
      continue;
    }

    // Khớp theo cụm chủ thể ở đầu chuỗi (có dấu nếu quy tắc yêu cầu phân biệt dấu như tủ/tụ)
    let khop = false;
    if (luat.nhom === '8537') {
      khop = batDauBangBatKyCum(chuTheDau, luat.cum) || batDauBangBatKyCum(chuTheGocDau, luat.cumGocCoDau || []);
    } else if (luat.nhom === '8532') {
      khop = batDauBangBatKyCum(chuTheGocDau, luat.cumGocCoDau)
        || (chuTheDau === chuTheGocDau && batDauBangBatKyCum(chuTheDau, luat.cumKhongDauNeuKhongTu));
    } else {
      khop = batDauBangBatKyCum(chuTheDau, luat.cum || []);
    }
    if (!khop) continue;

    // Ngoại lệ riêng 8516 (carbon → 8545) và 8534 (đã gắn linh kiện)
    if (luat.nhom === '8516' && (chatLieu.thanChi || coBatKyCum(tenNorm, ['bang carbon', 'bang cacbon', 'bang than']))) {
      const m8545 = idx.nhom2aTheoMa.get('8545');
      return {
        ketThuc: {
          trangThai: 'CHOT',
          nhomKetQua: '8545',
          buocDung: '2a_DINH_DANH_RIENG',
          quyTac: 'Chú giải 2(a) Phần XVI + Loại trừ 85.16 → 85.45',
          lyDo: 'Điện trở đốt nóng làm từ carbon/graphit bị loại khỏi 85.16 sang 85.45.',
          ungVien: ['8545'],
          cauHoi: null,
          trich: gopTrich(trich2a, muc2a.loaiTruRieng[0].trich, m8545?.trich),
        },
        loaiTruDaGhi,
        ep8431Tu8501,
      };
    }
    if (luat.nhom === '8534' && coBatKyCum(tenNorm, ['da gan linh kien', 'lap linh kien', 'bo mach dieu khien'])) {
      loaiTruDaGhi.push(muc2a.loaiTruRieng[0].trich);
      continue;
    }

    const nhomChot = (luat.nhom === '8536' && (dacTinh.dienAp > 1000 || coCum(tenNorm, 'cao ap'))) ? '8535' : luat.nhom;
    const mucChot = idx.nhom2aTheoMa.get(nhomChot) || muc2a;
    return {
      ketThuc: {
        trangThai: 'CHOT',
        nhomKetQua: nhomChot,
        buocDung: '2a_DINH_DANH_RIENG',
        quyTac: 'Chú giải 2(a) Phần XVI',
        lyDo: `Bộ phận được định danh riêng tại nhóm ${nhomChot} theo Chú giải 2(a) Phần XVI (thắng nhóm bộ phận 2(b)).`,
        ungVien: [nhomChot],
        cauHoi: null,
        trich: gopTrich(trich2a, { tep: 'data/chu-giai-heading.json', khoa: `${nhomChot}.ten_nhom`, nguyenVan: mucChot.tenNhom }, mucChot.trich),
      },
      loaiTruDaGhi,
      ep8431Tu8501,
    };
  }

  return { ketThuc: null, loaiTruDaGhi, ep8431Tu8501 };
}

// ──────────────────────────── Bước 3 & 4: 2(b) Bộ phận chuyên dùng → 2(c) Phần còn lại ────────────────────────────
function xet2bVa2c({ tenNorm, chuTheObj, mayMeNorm, dsNhomMayMe, dacTinh, chatLieu, loaiTruDaGhi, ep8431Tu8501, bang, idx, vetXet }) {
  const { chuTheDau } = chuTheObj;
  const trich2b = trichNote2(bang, '(b)');
  const trich2c = trichNote2(bang, '(c)');
  const coNhieuLoaiMay = dacTinh.nhieuLoaiMay === true || dacTinh.dungChungNhieuMay === true
    || coBatKyCum(`${tenNorm} ${mayMeNorm}`, ['nhieu loai may', 'nhieu may khac nhau', 'dung chung cho nhieu may']);

  const ds2b = ep8431Tu8501 && dsNhomMayMe.length === 0 ? ['8428'] : dsNhomMayMe;

  // Bước 3: Chú giải 2(b)
  if (!coNhieuLoaiMay && ds2b.length > 0) {
    const kq2b = timNhom2bChoMayMe(ds2b, idx);
    if (kq2b.loai === 'LOAI_BO_PHAN_5_NHOM_DAU_CG2') {
      const muc = idx.loaiTruTheoId.get(`CG2_DAU_${kq2b.nhom}`);
      const nhomKq = chatLieu.nhua ? '3926' : 'Chương theo chất liệu';
      return {
        trangThai: 'CHOT',
        nhomKetQua: nhomKq,
        buocDung: 'LOAI_TRU_CHU_GIAI_1',
        quyTac: muc.diem,
        lyDo: `Bộ phận của hàng hóa thuộc nhóm ${kq2b.nhom} bị loại ở đầu Chú giải 2 Phần XVI, không áp 2(b)/2(c).`,
        ungVien: [nhomKq],
        cauHoi: null,
        trich: gopTrich(...loaiTruDaGhi, muc.trich, muc.trichBoSung),
      };
    }
    if (kq2b.loai === 'UU_TIEN_8517') {
      return {
        trangThai: 'CHOT',
        nhomKetQua: '8517',
        buocDung: '2b_BO_PHAN_CHUYEN_DUNG',
        quyTac: 'Chú giải 2(b) Phần XVI (quy tắc ưu tiên 85.17 và 85.25–85.28)',
        lyDo: `Bộ phận phù hợp để chỉ sử dụng cho hàng hóa thuộc các nhóm ${ds2b.join(', ')} (gồm 85.17 và 85.25–85.28) được phân loại vào nhóm 85.17.`,
        ungVien: ['8517'],
        cauHoi: null,
        trich: gopTrich(...loaiTruDaGhi, trich2b, kq2b.muc.trich, kq2b.muc.trichBoSung, { tep: 'data/chu-giai-heading.json', khoa: '8517.ten_nhom', nguyenVan: kq2b.muc.tenNhom }),
      };
    }
    if (kq2b.loai === 'NHOM_BO_PHAN_2B') {
      if (kq2b.nhom === '8473' && batDauBangBatKyCum(chuTheDau, ['tui dung', 'hop dung', 'vo dung', 'ba lo'])) {
        return {
          trangThai: 'CHOT',
          nhomKetQua: '4202',
          buocDung: '2b_BO_PHAN_CHUYEN_DUNG',
          quyTac: 'Loại trừ tiêu đề nhóm 84.73',
          lyDo: 'Vỏ, hộp đựng và các loại tương tự bị loại khỏi tiêu đề nhóm 84.73.',
          ungVien: ['4202'],
          cauHoi: null,
          trich: gopTrich(...loaiTruDaGhi, { tep: 'data/chu-giai-heading.json', khoa: '8473.ten_nhom', nguyenVan: kq2b.muc.tenNhom }, kq2b.muc.trich),
        };
      }
      vetXet.push({ buoc: '2b_BO_PHAN_CHUYEN_DUNG', ketQua: kq2b.nhom, chiTiet: `Máy chủ (${ds2b.join(', ')}) có nhóm bộ phận chuyên dùng ${kq2b.nhom}.` });
      return {
        trangThai: 'CHOT',
        nhomKetQua: kq2b.nhom,
        buocDung: '2b_BO_PHAN_CHUYEN_DUNG',
        quyTac: 'Chú giải 2(b) Phần XVI',
        lyDo: `Bộ phận chỉ dùng/chủ yếu dùng cho máy thuộc nhóm ${ds2b.join(', ')} → nhóm bộ phận chuyên dùng ${kq2b.nhom}.`,
        ungVien: [kq2b.nhom],
        cauHoi: null,
        trich: gopTrich(...loaiTruDaGhi, trich2b, { tep: 'data/chu-giai-heading.json', khoa: `${kq2b.nhom}.ten_nhom`, nguyenVan: kq2b.muc.tenNhom }, kq2b.muc.trich, kq2b.muc.trichBoSung),
      };
    }
    if (kq2b.loai === 'NHOM_MAY_CHU') {
      const m = kq2b.nhom;
      vetXet.push({ buoc: '2b_BO_PHAN_CHUYEN_DUNG', ketQua: m, chiTiet: `Máy chủ ${m} không có nhóm bộ phận riêng → phân loại theo nhóm máy chủ ${m}.` });
      return {
        trangThai: 'CHOT',
        nhomKetQua: m,
        buocDung: '2b_BO_PHAN_CHUYEN_DUNG',
        quyTac: 'Chú giải 2(b) Phần XVI',
        lyDo: `Bộ phận chỉ dùng/chủ yếu dùng cho máy thuộc nhóm ${m} (không có nhóm bộ phận chuyên dùng riêng) → phân loại vào nhóm ${m}.`,
        ungVien: [m],
        cauHoi: null,
        trich: gopTrich(...loaiTruDaGhi, trich2b),
      };
    }
    vetXet.push({
      buoc: '2b_BO_PHAN_CHUYEN_DUNG',
      ketQua: 'KHONG_XAC_DINH_MOT_MAY',
      chiTiet: `Các nhóm máy chủ (${ds2b.join(', ')}) không cùng một nhóm hoặc một nhóm bộ phận chuyên dùng → chuyển xét 2(c).`,
    });
  } else if (!coNhieuLoaiMay && ds2b.length === 0) {
    const ungVien = coCum(tenNorm, 'choi than') && batDauBangBatKyCum(chuTheDau, ['gia do', 'bo phan giu', 'khung giu', 'gia giu'])
      ? ['8503', '8487', '8548']
      : ['8487', '8548'];
    return {
      trangThai: 'DUNG_HOI',
      nhomKetQua: null,
      buocDung: '2b_BO_PHAN_CHUYEN_DUNG',
      quyTac: 'Chú giải 2(b) vs 2(c) Phần XVI (thiếu thông tin máy chủ)',
      lyDo: 'Chưa xác định được bộ phận chỉ dùng/chủ yếu dùng cho máy cụ thể nào (2b) hay dùng chung cho nhiều loại máy (2c).',
      ungVien,
      cauHoi: {
        khoa: 'nhomMayMe',
        noiDung: 'Bộ phận này dùng chuyên cho máy/thiết bị cụ thể nào (máy chủ), hay dùng chung cho nhiều loại máy khác nhau?',
        luaChon: ['Dùng cho một máy cụ thể (nêu tên/nhóm máy chủ)', 'Dùng chung cho nhiều loại máy khác nhau'],
        dieuKienLuat: 'Chú giải 2(b) Phần XVI yêu cầu xác định máy cụ thể hoặc nhóm máy cùng loại trước khi rơi xuống Chú giải 2(c) (84.87 / 85.48).',
        batBuoc: true,
      },
      trich: gopTrich(...loaiTruDaGhi, trich2b, trich2c),
    };
  }

  // Bước 4: Chú giải 2(c) — phần còn lại 84.87 (không dùng điện) hoặc 85.48 (điện)
  const muc8487 = idx.nhom2bTheoMa.get('8487');
  const muc8548 = idx.nhom2bTheoMa.get('8548');
  let dungDien = null;
  if (typeof dacTinh.dungDien === 'boolean') dungDien = dacTinh.dungDien;
  else if (typeof dacTinh.coDien === 'boolean') dungDien = dacTinh.coDien;
  else if (coBatKyCum(tenNorm, ['bo phan dien', 'mach dien', 'cuon day', 'tiep diem dien', 'cam bien dien'])) dungDien = true;
  else if (coBatKyCum(tenNorm, ['khong dung dien', 'co khi', 'num bom mo', 'vong lam kin dau', 'phot chan dau', 'tay quay', 'tay gat'])) dungDien = false;
  else if (String(dacTinh.chuong || '') === '85') dungDien = true;
  else if (String(dacTinh.chuong || '') === '84') dungDien = false;
  else if (ds2b.length > 0 && ds2b.every((m) => m.startsWith('85'))) dungDien = true;
  else if (ds2b.length > 0 && ds2b.every((m) => m.startsWith('84'))) dungDien = false;

  if (dungDien === true) {
    return {
      trangThai: 'CHOT',
      nhomKetQua: '8548',
      buocDung: '2c_BO_PHAN_CON_LAI',
      quyTac: 'Chú giải 2(c) Phần XVI',
      lyDo: 'Bộ phận điện không định danh riêng và không xác định chuyên dùng cho một loại máy cụ thể → nhóm 85.48.',
      ungVien: ['8548'],
      cauHoi: null,
      trich: gopTrich(...loaiTruDaGhi, trich2c, { tep: 'data/chu-giai-heading.json', khoa: '8548.ten_nhom', nguyenVan: muc8548.tenNhom }, muc8548.trich),
    };
  }
  if (dungDien === false) {
    return {
      trangThai: 'CHOT',
      nhomKetQua: '8487',
      buocDung: '2c_BO_PHAN_CON_LAI',
      quyTac: 'Chú giải 2(c) Phần XVI',
      lyDo: 'Bộ phận cơ khí không dùng điện, không định danh riêng và không xác định chuyên dùng cho một loại máy cụ thể → nhóm 84.87.',
      ungVien: ['8487'],
      cauHoi: null,
      trich: gopTrich(...loaiTruDaGhi, trich2c, { tep: 'data/chu-giai-heading.json', khoa: '8487.ten_nhom', nguyenVan: muc8487.tenNhom }, muc8487.trich),
    };
  }

  return {
    trangThai: 'DUNG_HOI',
    nhomKetQua: null,
    buocDung: '2c_BO_PHAN_CON_LAI',
    quyTac: 'Chú giải 2(c) Phần XVI (thiếu phân định điện / không dùng điện)',
    lyDo: 'Bộ phận thuộc Chú giải 2(c) nhưng chưa rõ là bộ phận điện (85.48) hay bộ phận cơ khí không dùng điện (84.87).',
    ungVien: ['8487', '8548'],
    cauHoi: {
      khoa: 'dungDien',
      noiDung: 'Bộ phận này là bộ phận điện (có cuộn dây, tiếp điểm, nối điện…) hay bộ phận cơ khí không dùng điện?',
      luaChon: ['Bộ phận cơ khí không dùng điện (→ 8487)', 'Bộ phận điện (→ 8548)'],
      dieuKienLuat: 'Chú giải 2(c) Phần XVI và Chú giải chi tiết nhóm 84.87 / 85.48 tách bộ phận không dùng điện (84.87) với bộ phận điện (85.48).',
      batBuoc: true,
    },
    trich: gopTrich(...loaiTruDaGhi, trich2c, muc8487.trich, muc8548.trich),
  };
}

/**
 * Xét phân loại một bộ phận máy theo đúng thứ tự Chú giải 2 Phần XVI (ADR-0004):
 *   1) Loại trừ Chú giải 1 Phần XVI, Chú giải 1 Ch.84/85 và 5 nhóm mở đầu Chú giải 2.
 *   2) Chú giải 2(a): nhóm định danh riêng (xử lý loại trừ riêng và điều kiện bắt buộc trước).
 *   3) Chú giải 2(b): nhóm bộ phận chuyên dùng hoặc nhóm máy chủ (ưu tiên 85.17 + 85.25..85.28 → 85.17).
 *   4) Chú giải 2(c): phần còn lại 84.87 / 85.48.
 * @param {{tenHang?: string, mayMe?: string, nhomMayMe?: string|string[], dacTinh?: object}} [thamSo]
 */
function xetChuGiai2PhanXVI({ tenHang = '', mayMe = '', nhomMayMe = null, dacTinh = {} } = {}) {
  const bang = taiBangChuGiai2();
  const idx = chiMuc();
  const tenNorm = chuanChu(tenHang);
  const tenGoc = chuanCoDau(tenHang);
  const mayMeNorm = chuanChu(mayMe);
  const chuTheObj = tachChuTheHang(tenNorm, tenGoc, mayMeNorm);
  const dsNhomMayMe = tachNhomMayMe(nhomMayMe, dacTinh);
  const chatLieu = docChatLieu(chuTheObj.chuThe, chuTheObj.chuTheGoc, dacTinh);
  const vetXet = [];

  // Bước 1: Soát Chú giải 1
  const kq1 = soatChuGiai1({ tenNorm, chuTheObj, dsNhomMayMe, dacTinh, chatLieu, bang, idx });
  if (kq1) {
    vetXet.push({ buoc: 'LOAI_TRU_CHU_GIAI_1', ketQua: kq1.nhomKetQua, chiTiet: kq1.lyDo });
    return { ...kq1, vetXet };
  }
  vetXet.push({ buoc: 'LOAI_TRU_CHU_GIAI_1', ketQua: 'QUA', chiTiet: 'Không bị loại trừ bởi Chú giải 1 Phần XVI / Ch.84 / Ch.85.' });

  // Bước 2: Soát 2(a)
  const { ketThuc, loaiTruDaGhi, ep8431Tu8501 } = xet2aDinhDanhRieng({ tenNorm, chuTheObj, dsNhomMayMe, dacTinh, chatLieu, bang, idx, vetXet });
  if (ketThuc) {
    vetXet.push({ buoc: '2a_DINH_DANH_RIENG', ketQua: ketThuc.nhomKetQua || ketThuc.trangThai, chiTiet: ketThuc.lyDo });
    return { ...ketThuc, vetXet };
  }
  if (!vetXet.some((v) => v.buoc === '2a_DINH_DANH_RIENG')) {
    vetXet.push({ buoc: '2a_DINH_DANH_RIENG', ketQua: 'KHONG_KHOP_2A', chiTiet: 'Không thuộc nhóm định danh riêng theo Chú giải 2(a).' });
  }

  // Bước 3 & 4: Soát 2(b) rồi 2(c)
  const kq2bc = xet2bVa2c({ tenNorm, chuTheObj, mayMeNorm, dsNhomMayMe, dacTinh, chatLieu, loaiTruDaGhi, ep8431Tu8501, bang, idx, vetXet });
  return { ...kq2bc, vetXet };
}

module.exports = {
  THU_TU_AP_DUNG,
  taiBangChuGiai2,
  datLaiCache,
  xetChuGiai2PhanXVI,
};
