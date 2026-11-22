// lib/do-thi/bo-may-trinh-tu.js — Đề xuất khuôn "bộ máy trình tự" theo ADR-0004 (#1636 Việc 4).
//
// Thay thế mô hình hậu kiểm của lib/gir.js bằng bộ máy trạng thái tất định 5 tầng (0 AI, 0 gọi mạng):
//   B0 Bản chất hàng & Máy chủ
//   -> B1 Quy tắc 1 (tên nhóm -> chú giải Phần/Chương loại trừ trước -> chú giải chi tiết -> WCO; Phần XVI qua Chú giải 2)
//   -> B2_B5 Quy tắc 2–5 (CHỈ áp dụng khi B1 không giải quyết được, kèm lý do; còn lại ghi BO_QUA)
//   -> B6_6SO Quy tắc 6 cấp 6 số (cùng cấp gạch ngang; tích hợp diXuong6 + cây HS/WCO)
//   -> B6_8SO Quy tắc 6 cấp 8 số VN (tích hợp doiChieuPhanNhom + truy máy chủ cho mẫu "Của hàng hóa thuộc phân nhóm X")
//   -> Kiểm chứng tiền lệ cuối (tienLeUngHo, không quyết mã)
//   -> Cổng tự kiểm ADR-0004 §3 (congKiemDinhADR0004).
//
// Cô lập hoàn toàn khỏi đường khách (chỉ khai trong data/luat/dau-noi.json kho.bangCanh.moDun).
'use strict';

const fs = require('fs');
const { dataReadPath } = require('../data-paths');
const { taxData } = require('../data');
const T = require('../hs-tree');
const TV = require('../tu-vung');
const DK = require('../dieu-kien-so');
const { loadSoTay } = require('../so-tay-gates');
const { xetChuGiai2PhanXVI, datLaiCache: datLaiCacheCG2 } = require('./chu-giai-2-phan-xvi');
const D = require('./index');
const G6 = require('./tieu-chi-6');
const { khongDau } = require('./tu-khoa');
const { tienLeUngHo } = require('./tien-le-ung-ho');
const { squash } = require('../so-tay');

const PHIEN_BAN = 'trinh-tu-v1';
const TRINH_TU_TANG = Object.freeze(['B0', 'B1', 'B2_B5', 'B6_6SO', 'B6_8SO']);
const KHOA_NHOM_HOP_LE = new Set(['ten_nhom', 'nhom']);

let _cgc = null;
let _cgh = null;
let _ops = null;
let _opsById = null;
let _wcoCsv = null;
let _chiMucDoThi = null;

function docChuGiaiChuong() {
  if (!_cgc) {
    _cgc = JSON.parse(fs.readFileSync(dataReadPath('chu-giai-chuong.json'), 'utf8'));
  }
  return _cgc;
}

function docChuGiaiHeading() {
  if (!_cgh) {
    _cgh = JSON.parse(fs.readFileSync(dataReadPath('chu-giai-heading.json'), 'utf8'));
  }
  return _cgh;
}

function docWcoOpinions() {
  if (!_ops) {
    _ops = JSON.parse(fs.readFileSync(dataReadPath('wco-op', 'opinions.json'), 'utf8'));
    _opsById = new Map(_ops.map((o) => [o.id, o]));
  }
  return { ops: _ops, byId: _opsById };
}

function docWcoCsv() {
  if (!_wcoCsv) {
    _wcoCsv = new Map();
    const lines = fs.readFileSync(dataReadPath('wco-hs-international.csv'), 'utf8').split('\n').slice(1);
    for (const l of lines) {
      const m = l.match(/^[^,]*,(\d{6}),("(?:[^"]|"")*"|[^,]*),(\d+),6\s*$/);
      if (m) _wcoCsv.set(m[1], m[2].replace(/^"|"$/g, '').replace(/""/g, '"'));
    }
  }
  return _wcoCsv;
}

/** Xoá cache bộ nhớ của bộ máy trình tự và các module đồ thị phụ thuộc. */
function datLaiCache() {
  _cgc = null;
  _cgh = null;
  _ops = null;
  _opsById = null;
  _wcoCsv = null;
  _chiMucDoThi = null;
  datLaiCacheCG2();
  D.datLai();
  T.reset();
}

const chu = (v) => (typeof v === 'string' ? v.trim() : '');
const so = (v) => String(v == null ? '' : v).replace(/\D/g, '');
const cham4 = (h4) => `${h4.slice(0, 2)}.${h4.slice(2, 4)}`;
const cham6 = (h6) => `${h6.slice(0, 4)}.${h6.slice(4, 6)}`;

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

/** Đọc giá trị nguồn thực trên đĩa cho `{ tep, khoa }` — dùng lại cho kiểm định trích nguyên văn. */
function docNguonTheoKhoa(tep, khoa) {
  if (!tep || !khoa) return null;
  if (tep === 'data/chu-giai-chuong.json') {
    const [ch, field] = String(khoa).split('.');
    if (!['chuong', 'phan'].includes(field)) return null;
    const v = docChuGiaiChuong()[ch]?.[field];
    return typeof v === 'string' && v.trim() ? v : null;
  }
  if (tep === 'data/chu-giai-heading.json') {
    const [h4, field] = String(khoa).split('.');
    if (!KHOA_NHOM_HOP_LE.has(field)) return null;
    const v = docChuGiaiHeading()[h4]?.[field];
    return typeof v === 'string' && v.trim() ? v : null;
  }
  if (tep === 'data/tax.json') {
    const [hs8, field] = String(khoa).split('.');
    if (!['vn', 'en'].includes(field)) return null;
    const v = taxData[hs8]?.[field];
    return typeof v === 'string' && v.trim() ? v : null;
  }
  if (tep === 'data/wco-op/opinions.json') {
    const dot = String(khoa).lastIndexOf('.');
    if (dot <= 0) return null;
    const id = khoa.slice(0, dot);
    const field = khoa.slice(dot + 1);
    const o = docWcoOpinions().byId.get(id);
    const v = o?.[field];
    return typeof v === 'string' && v.trim() ? v : null;
  }
  if (tep === 'data/wco-hs-international.csv') {
    const v = docWcoCsv().get(String(khoa));
    return typeof v === 'string' && v.trim() ? v : null;
  }
  return null;
}

function kiemTraTrichHopLe(tr) {
  if (!tr || typeof tr !== 'object') return 'khong-phai-object';
  if (tr.tep === 'data/chu-giai-chuong.json' && /^(39|40)\.phan$/.test(String(tr.khoa || ''))) {
    return 'cam-dung-phan-vi-cho-chuong-39-40';
  }
  const goc = docNguonTheoKhoa(tr.tep, tr.khoa);
  if (!goc) return `khoa-khong-ton-tai:${tr.tep}#${tr.khoa}`;
  const nv = chu(tr.nguyenVan);
  if (!nv) return 'thieu-nguyen-van';
  if (goc.includes(nv)) return null;
  const sGoc = squash(goc);
  const sNv = squash(nv);
  if (sNv.length >= 6 && sGoc.includes(sNv)) return null;
  return `khong-khop-nguyen-van:${tr.tep}#${tr.khoa}`;
}

function rutDoanNguyenVan(vanBan, mauTim, doDaiToiDa = 650) {
  if (!vanBan) return '';
  if (!mauTim) return vanBan.slice(0, doDaiToiDa).trim();
  const idx = mauTim instanceof RegExp ? vanBan.search(mauTim) : vanBan.indexOf(mauTim);
  if (idx < 0) return vanBan.slice(0, doDaiToiDa).trim();
  const truoc = vanBan.lastIndexOf('\n\n', idx);
  const start = truoc >= 0 && idx - truoc <= 180 ? truoc + 2 : Math.max(0, vanBan.lastIndexOf('\n', idx) + 1);
  let end = Math.min(vanBan.length, start + doDaiToiDa);
  if (end < vanBan.length) {
    const dong = vanBan.indexOf('\n\n', idx);
    if (dong > idx && dong - start <= doDaiToiDa) end = dong;
    else {
      const cuoiDong = vanBan.lastIndexOf('\n', end);
      if (cuoiDong > idx + 20) end = cuoiDong;
    }
  }
  return vanBan.slice(start, end).trim();
}

function trichChuGiaiChuong(ch2, field, mauTim, doDaiToiDa) {
  const ch = String(ch2 || '').padStart(2, '0');
  // 39.phan và 40.phan trong kho dữ liệu đang bị dính văn bản Phần VI — luôn chặn đọc nhầm.
  if ((ch === '39' || ch === '40') && field === 'phan') return null;
  const goc = docChuGiaiChuong()[ch]?.[field];
  if (typeof goc !== 'string' || !goc.trim()) return null;
  const maxLen = doDaiToiDa || (mauTim === '2. Theo Chú giải 1' ? 1200 : 650);
  const nv = rutDoanNguyenVan(goc, mauTim, maxLen);
  if (!nv) return null;
  return { tep: 'data/chu-giai-chuong.json', khoa: `${ch}.${field}`, nguyenVan: nv };
}

function trichChuGiaiHeading(h4, field, mauTim) {
  const ma = so(h4).slice(0, 4);
  if (!KHOA_NHOM_HOP_LE.has(field)) return null;
  const goc = docChuGiaiHeading()[ma]?.[field];
  if (typeof goc !== 'string' || !goc.trim()) return null;
  const nv = field === 'ten_nhom' ? goc.trim() : rutDoanNguyenVan(goc, mauTim);
  if (!nv) return null;
  return { tep: 'data/chu-giai-heading.json', khoa: `${ma}.${field}`, nguyenVan: nv };
}

function trichWcoOpinion(id, mauTim) {
  const o = docWcoOpinions().byId.get(id);
  if (!o || typeof o.text !== 'string' || !o.text.trim()) return null;
  const nv = mauTim ? rutDoanNguyenVan(o.text, mauTim, 550) : o.text.trim();
  return {
    tep: 'data/wco-op/opinions.json',
    khoa: `${id}.text`,
    nguyenVan: nv,
    ...(o.headingSuspect ? { headingSuspect: true } : {}),
    ...(o.headingContinued ? { headingContinued: true } : {}),
  };
}

function trichWcoCsv(hs6) {
  const ma = so(hs6).slice(0, 6);
  const v = docWcoCsv().get(ma);
  if (!v) return null;
  return { tep: 'data/wco-hs-international.csv', khoa: ma, nguyenVan: v };
}

function trichTax(hs8) {
  const ma = so(hs8).slice(0, 8);
  const v = taxData[ma]?.vn;
  if (typeof v !== 'string' || !v.trim()) return null;
  return { tep: 'data/tax.json', khoa: `${ma}.vn`, nguyenVan: v };
}

function thuTrichChuGiai2(ketQuaCG2) {
  const ra = [];
  for (const tr of ketQuaCG2?.trich || []) {
    if (!kiemTraTrichHopLe(tr)) {
      ra.push(tr);
      continue;
    }
    if (tr.tep === 'data/chu-giai-heading.json') {
      const [h4, field] = String(tr.khoa || '').split('.');
      const lai = trichChuGiaiHeading(h4, field, tr.nguyenVan.slice(0, 30));
      if (lai && !kiemTraTrichHopLe(lai)) ra.push(lai);
    } else if (tr.tep === 'data/chu-giai-chuong.json') {
      const [ch, field] = String(tr.khoa || '').split('.');
      const lai = trichChuGiaiChuong(ch, field, tr.nguyenVan.slice(0, 30), tr.nguyenVan.startsWith('2. Theo Chú giải 1') ? 1200 : undefined);
      if (lai && !kiemTraTrichHopLe(lai)) ra.push(lai);
    }
  }
  return gopTrich(ra);
}

// ──────────────────────────── Chỉ mục Đồ thị & Tiêu đề nhóm (0 AI) ────────────────────────────
const STOP_WORDS_DO_THI = new Set([
  'va', 'hoac', 'cua', 'bang', 'cho', 'dung', 'de', 'loai', 'khac', 'cac', 'nhung', 'tu', 'den',
  'voi', 'trong', 'ngoai', 'khong', 'co', 'da', 'duoc', 'the', 'theo', 'nhom', 'phan', 'cong', 'suat',
  'dien', 'ap', 'duong', 'kinh', 'mau', 'sac', 'dang', 'boc', 'cach', 'chi', 'bo', 'do', 'vat',
]);

function kiemNhomHopChatLieu(h4, chatLieu) {
  if (!chatLieu || !/^\d{4}$/.test(h4)) return true;
  const ch2 = Number(h4.slice(0, 2));
  if (chatLieu === 'đồng') {
    if (ch2 === 73 || ch2 === 76 || ch2 === 39 || ch2 === 69) return false;
  } else if (chatLieu === 'sắt thép' || chatLieu === 'thép không gỉ') {
    if (ch2 === 74 || ch2 === 76 || ch2 === 39 || ch2 === 69) return false;
  } else if (chatLieu === 'nhôm') {
    if (ch2 === 73 || ch2 === 74 || ch2 === 39 || ch2 === 69) return false;
  } else if (chatLieu === 'plastic') {
    if (ch2 >= 72 && ch2 <= 83) return false;
    if (ch2 === 69 || ch2 === 44) return false;
  } else if (chatLieu === 'gỗ') {
    if (ch2 === 39 || (ch2 >= 72 && ch2 <= 83)) return false;
  } else if (chatLieu === 'da thuộc') {
    if (h4 === '6401' || h4 === '6402' || ch2 === 39) return false;
  } else if (chatLieu === 'gốm sứ') {
    if (ch2 === 39 || (ch2 >= 72 && ch2 <= 83)) return false;
  }
  return true;
}

function xayDungChiMucDoThi() {
  if (_chiMucDoThi) return _chiMucDoThi;
  const bc = D.bangCanh();
  const c1Chuan = new Map();
  const UU_TIEN_KHO = { 'vn-product-synonyms': 4, 'hs-aliases': 3, 'trade-synonyms': 3, synonyms: 2, 'ten-khac': 2 };

  for (const [cumNorm, val] of bc.c1Map.entries()) {
    if (!cumNorm || !/[a-z]/.test(cumNorm)) continue;
    const words = cumNorm.split(/\s+/).filter(Boolean);
    if (words.length < 2 || words.length > 6) continue;
    const dich = (val?.dich || [])
      .map((d) => ({ h4: so(d.ma).slice(0, 4), w: UU_TIEN_KHO[d.nguonKho] || 1, phu: Boolean(d.phu) }))
      .filter((d) => d.h4.length === 4 && D.coNut(d.h4) && !d.phu);
    if (dich.length) c1Chuan.set(cumNorm, dich);
  }

  const hd = docChuGiaiHeading();
  const tieuDeChuan = [];
  for (const [h4, v] of Object.entries(hd)) {
    if (!/^\d{4}$/.test(h4) || !v?.ten_nhom || !D.coNut(h4)) continue;
    const sach = khongDau(String(v.ten_nhom).replace(/^\d{2}\.\d{2}\s*[–-]\s*/, '').replace(/\(\+\)/g, ''));
    const menhDe = sach.split(/[;,.]/).map((s) => s.trim()).filter((s) => s.length >= 4);
    const tokenSet = new Set(sach.split(/\s+/).filter((t) => t.length >= 2 && !STOP_WORDS_DO_THI.has(t)));
    tieuDeChuan.push({ h4, sach, menhDe, tokenSet });
  }

  _chiMucDoThi = { c1Chuan, tieuDeChuan };
  return _chiMucDoThi;
}

function timNhomQuaDoThi(tenHang, tenNorm, chatLieu) {
  const diem = new Map();
  const cong = (h4, score) => {
    if (!/^\d{4}$/.test(h4) || !D.coNut(h4)) return;
    if (!kiemNhomHopChatLieu(h4, chatLieu)) return;
    diem.set(h4, (diem.get(h4) || 0) + score);
  };

  // 1) Khớp cụm đầy đủ từ C1 (D.timCum)
  const c1Hit = D.timCum(tenHang);
  if (c1Hit?.dich?.length) {
    for (const d of c1Hit.dich) {
      cong(so(d.ma).slice(0, 4), 100);
    }
  }

  // 2) Quét n-gram (2..6 từ) trên c1Map của D.bangCanh()
  const { c1Chuan, tieuDeChuan } = xayDungChiMucDoThi();
  const words = tenNorm.split(/\s+/).filter(Boolean);
  for (let i = 0; i < words.length; i += 1) {
    for (let len = Math.min(6, words.length - i); len >= 2; len -= 1) {
      const cum = words.slice(i, i + len).join(' ');
      const hits = c1Chuan.get(cum);
      if (hits) {
        const posBoost = i === 0 ? 3.5 : i <= 2 ? 1.5 : 1;
        for (const h of hits) {
          cong(h.h4, len * h.w * posBoost);
        }
      }
    }
  }

  // 3) Khớp tiêu đề nhóm thực trong data/chu-giai-heading.json (<4d>.ten_nhom)
  const mauTieuDe = [
    { khi: ['bo do an', 'bo do nha bep', 'do gia dung bang nhua'], nhom: chatLieu === 'plastic' ? ['3924'] : chatLieu === 'gốm sứ' ? ['6911', '6912'] : ['3924', '7323'] },
    { khi: ['ong thep', 'ong va ong dan bang sat', 'ong dan bang thep', 'ong bang thep'], nhom: coCumNorm(tenNorm, ['khong han']) ? ['7304'] : coCumNorm(tenNorm, ['ong han', 'han ghep']) ? ['7306'] : ['7304', '7306'] },
    { khi: ['day dien cach dien', 'cap dien', 'cap dong boc nhua', 'cap dong', 'day cap dien'], nhom: ['8544'] },
    { khi: ['may bien ap', 'may bien the'], nhom: ['8504'] },
    { khi: ['dinh vit', 'bu long', 'dai oc', 'vit thep', 'oc vit', 'vit dau luc giac'], nhom: ['7318'] },
    { khi: ['ban go', 'ghe go', 'tu go', 'do noi that'], nhom: ['9403'] },
  ];
  for (const m of mauTieuDe) {
    if (coCumNorm(tenNorm, m.khi)) {
      for (const h4 of m.nhom) cong(h4, 80);
    }
  }

  // Bổ sung quét token tiêu đề đầu mô tả khi chưa đủ mạnh
  if (diem.size === 0 && words.length >= 2) {
    const dauCum = words.slice(0, Math.min(4, words.length)).filter((w) => !STOP_WORDS_DO_THI.has(w));
    if (dauCum.length >= 2) {
      for (const td of tieuDeChuan) {
        const khop = dauCum.filter((w) => td.tokenSet.has(w)).length;
        if (khop >= 2) cong(td.h4, khop * 8);
      }
    }
  }

  if (diem.size === 0) return [];
  const sorted = [...diem.entries()].sort((a, b) => b[1] - a[1]);
  const topScore = sorted[0][1];
  // Giữ các nhóm cùng dải điểm cao (vd 7304 & 7306 khi cùng khớp "ống thép")
  return sorted.filter(([, sc]) => sc >= topScore * 0.75).slice(0, 4).map(([h4]) => h4);
}

function soatCanhBangCanh(tapNhom, b0) {
  D.bangCanh();
  const { tenNorm, boSung } = b0;
  const trich = [];
  const canhBao = [];
  const loaiTruBiKichHoat = [];
  const daSoat = { loaiTru: 0, c5: 0, c9: 0, c10: 0, c11: 0, wco: 0 };

  for (const h4 of tapNhom) {
    const tu = D.canhTu(h4);
    const toi = D.canhToi(h4);
    const ngang = D.canhNgangCuaNhom(h4);
    for (const c of [...tu, ...toi, ...ngang]) {
      if (c.loai === 'LOAI_TRU') daSoat.loaiTru += 1;
      else if (c.loai === 'C5') daSoat.c5 += 1;
      else if (c.loai === 'C9') daSoat.c9 += 1;
      else if (c.loai === 'C10') daSoat.c10 += 1;
      else if (c.loai === 'WCO') daSoat.wco += 1;
    }

    // Kiểm WCO từ cạnh WCO của nhóm
    for (const w of [...tu, ...toi].filter((e) => e.loai === 'WCO').slice(0, 3)) {
      const id = String(w.id || '').split(':').pop();
      if (!id) continue;
      const tr = trichWcoOpinion(id);
      if (tr && (tenNorm.split(/\s+/).some((tok) => tok.length >= 4 && khongDau(tr.nguyenVan).includes(tok)) || h4 === '3924' || h4 === '6402')) {
        trich.push(tr);
        if (tr.headingSuspect) {
          canhBao.push({
            loai: 'WCO_HEADING_SUSPECT',
            idWco: id,
            chiTiet: `Ý kiến WCO ${id} đánh dấu headingSuspect=true trong data/wco-op/opinions.json — giữ nguyên cờ.`,
          });
        }
      }
    }

    // Kiểm các cạnh LOAI_TRU / C5 rời khỏi h4 có khớp đặc tính hàng không
    for (const e of tu.filter((x) => x.loai === 'LOAI_TRU' || x.loai === 'C5')) {
      const dich = so(e.toi).slice(0, 4);
      if (dich.length !== 4 || !D.coNut(dich)) continue;
      if (h4 === '8544' && dich === '9001' && coCumNorm(tenNorm, ['cap quang', 'soi quang']) && !coCumNorm(tenNorm, ['cap dong'])) {
        loaiTruBiKichHoat.push({ tu: h4, toi: dich, dieuKien: e.dieuKien, trich: trichChuGiaiHeading(dich, 'ten_nhom') });
      }
      if (h4 === '3924' && dich === '8481' && boSung.coVan === true) {
        loaiTruBiKichHoat.push({ tu: h4, toi: dich, dieuKien: e.dieuKien, trich: trichChuGiaiHeading(dich, 'ten_nhom') });
      }
    }
  }

  return {
    trich: gopTrich(trich),
    canhBao,
    loaiTruBiKichHoat,
    daSoat,
  };
}

// ──────────────────────────── B0: Bản chất hàng & Máy chủ ────────────────────────────
function coCumNorm(norm, dsCum) {
  return dsCum.some((c) => {
    const esc = khongDau(c).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^| )${esc}(?:$| )`).test(norm);
  });
}

function xacDinhMayChu(tenHang, tenNorm, boSung) {
  const coKhoaNhomMayMe = Object.prototype.hasOwnProperty.call(boSung, 'nhomMayMe');
  if ((coKhoaNhomMayMe && boSung.nhomMayMe === null) || boSung.khongRoMayMe === true) {
    return { khongRo: true, nhom: null, phanNhom: null, ma8: null, loai: null, choNguoi: null, trich: [] };
  }

  let nhom = null;
  let phanNhom = null;
  let ma8 = null;
  let loai = boSung.loaiMayMe || null;
  let choNguoi = typeof boSung.mayMeChoNguoi === 'boolean' ? boSung.mayMeChoNguoi : null;
  const trich = [];

  if (boSung.phanNhomMayMe) {
    const d = so(boSung.phanNhomMayMe);
    if (d.length >= 4) nhom = d.slice(0, 4);
    if (d.length >= 6) phanNhom = d.slice(0, 6);
    if (d.length >= 8) ma8 = d.slice(0, 8);
  }
  if (!nhom && boSung.nhomMayMe) {
    const raw = Array.isArray(boSung.nhomMayMe) ? boSung.nhomMayMe : [boSung.nhomMayMe];
    const valid = raw.map((x) => so(x).slice(0, 4)).filter((x) => x.length === 4);
    if (valid.length === 1) nhom = valid[0];
    else if (valid.length > 1) nhom = valid;
  }

  if (loai === 'may_phat_dien') nhom = nhom || '8502';
  else if (loai === 'dong_co_dien') nhom = nhom || '8501';
  else if (loai === 'van_thang' || loai === 'thang_may') {
    nhom = nhom || '8428';
    phanNhom = phanNhom || '842810';
  } else if (loai === 'may_khoan') {
    nhom = nhom || '8430';
  }

  // Suy từ văn bản tên hàng khi chưa có khai báo máy chủ tường minh
  const mayMeText = khongDau(boSung.mayMe || '');
  const gopText = `${tenNorm} ${mayMeText}`.trim();

  if (!nhom) {
    if (coCumNorm(gopText, ['van thang', 'thang may', 'thang tai hang', 'thang may tai hang', 'toi nang hang', 'toi nang kieu gau', 'thang cuon'])) {
      nhom = '8428';
      phanNhom = phanNhom || '842810';
      loai = loai || 'van_thang';
    } else if (coCumNorm(gopText, ['may khoan', 'may dao sau']) && !coCumNorm(gopText, ['cam tay'])) {
      nhom = '8430';
      loai = loai || 'may_khoan';
    } else if (coCumNorm(gopText, ['may phat dien', 'to may phat dien'])) {
      nhom = '8502';
      loai = loai || 'may_phat_dien';
    } else if (coCumNorm(gopText, ['dong co dien', 'mo to dien', 'motor dien'])) {
      nhom = '8501';
      loai = loai || 'dong_co_dien';
    } else if (coCumNorm(tenNorm, ['gia do choi than', 'bo phan giu choi than', 'khung giu choi than'])) {
      // Chú giải 85.45 mục (D) + 85.03(1) định danh giá đỡ chổi than là bộ phận của máy 85.01/85.02.
      nhom = '8501';
      loai = loai || 'dong_co_dien';
    } else if (coCumNorm(gopText, ['may nen khi'])) {
      nhom = '8414';
    } else if (coCumNorm(gopText, ['may bom', 'bom thuy luc'])) {
      nhom = '8413';
    } else if (coCumNorm(gopText, ['dong co xang'])) {
      nhom = '8407';
    } else if (coCumNorm(gopText, ['dong co diesel'])) {
      nhom = '8408';
    } else if (coCumNorm(gopText, ['may ep nhua'])) {
      nhom = '8477';
    } else if (coCumNorm(gopText, ['bang tai', 'bang truyen'])) {
      nhom = '8428';
      phanNhom = phanNhom || '842833';
    }
  }

  if (nhom === '8428' && phanNhom === '842810') {
    if (choNguoi === true || ma8 === '84281031') ma8 = '84281031';
    else if (choNguoi === false || ma8 === '84281039' || ma8 === '84281040') ma8 = ma8 || '84281039';
    trich.push(trichChuGiaiHeading('8428', 'ten_nhom'), trichTax('84281031'), trichTax('84281039'));
  } else if (nhom === '8430') {
    // Tuyệt đối không tự điền ngầm 8430.49 khi khách chưa nêu phân nhóm máy khoan (8430.41 vs 8430.49 vs 8430 khác).
    trich.push(trichChuGiaiHeading('8430', 'ten_nhom'), trichTax('84304100'), trichTax('84304990'));
  } else if (nhom === '8501' || nhom === '8502') {
    trich.push(trichChuGiaiHeading('8503', 'ten_nhom'), trichChuGiaiHeading('8545', 'nhom', 'Bộ phận giữ chổi than'));
  } else if (typeof nhom === 'string') {
    trich.push(trichChuGiaiHeading(nhom, 'ten_nhom'));
  }

  return { khongRo: false, nhom, phanNhom, ma8, loai, choNguoi, trich: gopTrich(trich) };
}

function docChatLieuChung(tenHang, tenNorm, boSung) {
  const raw = chu(boSung.chatLieu || boSung.vatLieu);
  if (raw) return raw;
  if (coCumNorm(tenNorm, ['dep da', 'giay da', 'da thuoc', 'bang da', 'da bo', 'da that', 'leather'])) return 'da thuộc';
  if (coCumNorm(tenNorm, ['gom su', 'bang su', 'chat lieu su', 'su ve sinh', 'ceramic', 'porcelain'])) return 'gốm sứ';
  if (coCumNorm(tenNorm, ['bang kem', 'hop kim kem', 'kem duc', 'zinc'])) return 'kẽm';
  if (coCumNorm(tenNorm, ['bang go', 'ban go', 'ghe go', 'tu go', 'go tu nhien', 'go cong nghiep'])) return 'gỗ';
  if (coCumNorm(tenNorm, ['thep khong gi', 'inox'])) return 'thép không gỉ';
  if (coCumNorm(tenNorm, ['dong ma crom', 'dong thau', 'bang dong', 'bot dong', 'vay dong', 'cap dong', 'day dong'])) return 'đồng';
  if (coCumNorm(tenNorm, ['nhom', 'aluminium'])) return 'nhôm';
  if (coCumNorm(tenNorm, ['thep', 'sat'])) return 'sắt thép';
  if (coCumNorm(tenNorm, ['nhua', 'plastic', 'abs', 'pvc', 'pp', 'pe', 'xop', 'melamin'])) return 'plastic';
  if (coCumNorm(tenNorm, ['cao su luu hoa cung', 'ebonit'])) return 'cao su cứng';
  if (coCumNorm(tenNorm, ['cao su'])) return 'cao su';
  if (coCumNorm(tenNorm, ['than chi', 'graphit', 'carbon'])) return 'than chì';
  if (coCumNorm(tenNorm, ['dong', 'thau'])) return 'đồng';
  return '';
}

function taoDuKienTuVung(tenHang, boSung, mayChu, chatLieu) {
  const ds = [];
  const tenNorm = khongDau(tenHang);
  const them = (fact, giaTri, extra = {}) => {
    if (giaTri === undefined || giaTri === null) return;
    ds.push({ fact, giaTri, nguon: 'KHACH', trangThai: 'DA_CO', ...extra });
  };
  if (Array.isArray(boSung._duKien)) ds.push(...boSung._duKien);

  const coPhuDinhSon = coCumNorm(tenNorm, [
    'khong pha chat mau', 'khong pha mau', 'khong dung lam son', 'khong dung san xuat son',
    'khong chua dung moi', 'lam phao hoa', 'bot kho', 'vay kho',
  ]) || boSung.phaChatMau === false
    || boSung.trangThaiVatLy === 'bot_kho_khong_pha_chat_mau'
    || boSung.trangThaiVatLy === 'bot_kho'
    || boSung.trangThaiVatLy === 'vay_kho';

  const laNhaoKhongNuoc = !coPhuDinhSon && (
    boSung.trangThaiVatLy === 'nhao_khong_nuoc'
    || boSung.trangThaiVatLy === 'long_khong_nuoc'
    || boSung.phaChatMau === true
    || coCumNorm(tenNorm, ['bot nhao', 'dang nhao', 'san xuat son', 'dung moi san xuat son', 'pha chat mau'])
  );

  const laBotNhaoNhomThuc = laNhaoKhongNuoc
    && chatLieu === 'nhôm'
    && coCumNorm(tenNorm, ['bot nhao', 'dang nhao']);

  const tl = TV.docTenLoaiDayDu(tenHang);
  if (laBotNhaoNhomThuc) {
    them('tenLoai', 'Bột nhão');
  } else if (coCumNorm(tenNorm, ['vay nhom']) && !coCumNorm(tenNorm, ['bot nhom']) && coPhuDinhSon) {
    them('tenLoai', 'Vảy nhôm');
  } else if (tl?.trangThai === 'DA_CO') {
    them('tenLoai', tl.giaTri);
  } else if (tenHang) {
    them('tenLoai', tenHang);
  }

  if (chatLieu) {
    const clMap = /nhôm|nhom/i.test(chatLieu) ? 'nhôm'
      : /thép|sắt|thep|sat/i.test(chatLieu) ? 'sắt thép'
        : /plastic|nhựa|nhua|abs|pvc|pp|pe|xốp|xop|melamin/i.test(chatLieu) ? 'plastic'
          : /cao su/i.test(chatLieu) ? 'cao su'
            : /đồng|dong/i.test(chatLieu) ? 'đồng' : chatLieu;
    them('chatLieu', [{ viTri: 'CHINH', chatLieu: clMap }]);
  }

  if (boSung.coVan === true) {
    them('laBoPhan', typeof boSung.laBoPhan === 'boolean' ? boSung.laBoPhan : false);
  }
  if (typeof boSung.laBoPhan === 'boolean') them('laBoPhan', boSung.laBoPhan);

  if (typeof boSung.congSuatKva === 'number' && Number.isFinite(boSung.congSuatKva)) {
    them('congSuatBieuKien', boSung.congSuatKva, { donVi: 'kVA' });
    them('congSuatDanhDinh', boSung.congSuatKva, { donVi: 'kVA' });
  } else {
    const mKva = String(tenHang || '').match(/(\d+(?:[.,]\d+)?)\s*kva\b/i);
    if (mKva) {
      const kvaVal = Number(mKva[1].replace(',', '.'));
      if (Number.isFinite(kvaVal)) them('congSuatDanhDinh', kvaVal, { donVi: 'kVA' });
    }
  }
  const mVolt = String(tenHang || '').match(/(\d+(?:[.,]\d+)?)\s*v(?:olt)?\b/i);
  if (mVolt) {
    const vVal = Number(mVolt[1].replace(',', '.'));
    if (Number.isFinite(vVal)) them('dienAp', vVal, { donVi: 'V' });
  }
  if (typeof boSung.duongKinhTrongMm === 'number' && Number.isFinite(boSung.duongKinhTrongMm)) {
    them('duongKinhTrong', boSung.duongKinhTrongMm, { donVi: 'mm' });
  }
  if (coCumNorm(tenNorm, ['may bien ap kho', 'bien ap kho'])) {
    them('suDungDienMoiLong', false);
  } else if (coCumNorm(tenNorm, ['dien moi long', 'ngam dau'])) {
    them('suDungDienMoiLong', true);
  }
  if (typeof boSung.coRen === 'boolean') them('coRen', boSung.coRen);

  // Thông tin bảo vệ mũi giày (6402)
  const mui = boSung.loaiMuiBaoVe !== undefined ? boSung.loaiMuiBaoVe : boSung.muiBaoVe;
  if (mui === false || mui === 'KHONG' || boSung.khongMuiBaoVe === true || /khong (?:co )?mui bao ve/i.test(khongDau(tenHang))) {
    them('loaiMuiBaoVe', DK.NGOAI_LIET_KE);
  } else if (mui === 'KIM_LOAI' || mui === 'PHI_KIM_LOAI') {
    them('loaiMuiBaoVe', mui);
  }

  // Thông tin máy chủ (dungCho)
  if (boSung.dungChoXeChuong87 === true) {
    them('dungCho', 'động cơ xe của Chương 87');
  } else if (mayChu.ma8 === '84281031') {
    them('dungCho', '8428.10.31');
  } else if (mayChu.ma8 === '84281039' || mayChu.ma8 === '84281040') {
    them('dungCho', '8428.10.39');
  } else if (mayChu.loai === 'may_phat_dien') {
    them('dungCho', 'máy phát điện thuộc nhóm 85.01 hoặc 85.02');
    them('laBoPhan', true);
  } else if (mayChu.loai === 'dong_co_dien') {
    // Tránh ghi dạng mã "85.01" vào chuỗi mô tả công dụng vì DK.doiChieuDong8#soMa sẽ khớp mã trước khi so từ "máy phát điện".
    them('dungCho', 'động cơ điện (không phải máy phát điện)');
    them('laBoPhan', true);
  } else if (mayChu.nhom && typeof mayChu.nhom === 'string') {
    const dc = mayChu.phanNhom
      ? `máy thuộc nhóm ${cham4(mayChu.nhom)}, phân nhóm ${cham6(mayChu.phanNhom)}`
      : `máy thuộc nhóm ${cham4(mayChu.nhom)}`;
    them('dungCho', dc);
  } else if (boSung.dungChoXeChuong87 === false) {
    them('dungCho', 'máy công nghiệp ngoài Chương 87');
  }

  // Thông tin hệ phân tán bột/vảy kim loại (3212.90): CHỈ gán khi KHÔNG có phủ định và thực sự là chế phẩm nhão/sơn
  if (!coPhuDinhSon && laNhaoKhongNuoc && coCumNorm(tenNorm, ['bot nhao', 'bot nhom', 'bot kim loai', 'vay nhom', 'bot dong', 'vay dong'])) {
    if (boSung.moiTruongNuoc === true) {
      them('moiTruongPhanTan', 'NUOC');
    } else if (boSung.moiTruongPhanTan) {
      them('moiTruongPhanTan', boSung.moiTruongPhanTan);
    } else {
      them('moiTruongPhanTan', 'KHONG_CHUA_NUOC');
    }
    them('dangLongHoacNhao', true);
    them('dungCho', boSung.dungCho || 'sản xuất sơn');
    them('dongGoiBanLe', Boolean(boSung.dongGoiBanLe));
  }

  return ds;
}

function xacDinhPhamViNhom(tenHang, tenNorm, boSung, mayChu) {
  if (boSung.boBanLe === true && Array.isArray(boSung.nhomGoiY) && boSung.nhomGoiY.length > 1) {
    return 'TONG_QUAT';
  }
  const nhomGoiY = Array.isArray(boSung.nhomGoiY)
    ? (boSung.nhomGoiY.length === 1 ? so(boSung.nhomGoiY[0]).slice(0, 4) : null)
    : (boSung.nhomGoiY ? so(boSung.nhomGoiY).slice(0, 4) : null);
  const laBotKimLoai = coCumNorm(tenNorm, ['bot nhao', 'bot nhom', 'vay nhom', 'bot dong', 'vay dong', 'bot kim loai'])
    || nhomGoiY === '3212' || nhomGoiY === '7603' || nhomGoiY === '7406';
  if (laBotKimLoai) return 'BOT_KIM_LOAI';

  const laVeSinh = coCumNorm(tenNorm, ['bat sen', 'dau sen', 'voi sen', 'voi hoa sen'])
    || (nhomGoiY === '3924' && coCumNorm(tenNorm, ['ve sinh', 'sen tam']));
  if (laVeSinh) return 'VE_SINH';

  const laGiayDep = coCumNorm(tenNorm, [
    'dep xop', 'dep nhua', 'giay nhua', 'dep cao su', 'giay xop', 'dep di trong nha',
    'dep da', 'giay da', 'giay di mua', 'giay nhua di mua', 'ung di mua', 'ung nhua', 'ung cao su',
  ]) || ['6401', '6402', '6403', '6405'].includes(nhomGoiY);
  if (laGiayDep) return 'GIAY_DEP_CH64';

  const laPhanXVI = Boolean(mayChu.nhom || mayChu.khongRo || boSung.trucQuay !== undefined || boSung.dungDien !== undefined || boSung.nhieuLoaiMay !== undefined)
    || coCumNorm(tenNorm, [
      'con lan', 'bac truc', 'o truot', 'goi do', 'vong bi', 'o bi', 'gia do choi than', 'choi than',
      'dong co', 'may phat', 'may bom', 'may nen', 'van dien tu', 'van giam ap', 'van bi', 'bu long',
      'lo xo', 'gioang', 'tu dien', 'bo loc', 'piston', 'xec mang', 'truc cam', 'truc khuyu', 'banh rang',
    ])
    || (nhomGoiY && (nhomGoiY.startsWith('84') || nhomGoiY.startsWith('85')));
  if (laPhanXVI) return 'PHAN_XVI';

  return 'TONG_QUAT';
}

function phanTichBanChatVaMayChu(dauVao = {}) {
  const tenHang = chu(dauVao.tenHang || dauVao.moTa);
  const tenNorm = khongDau(tenHang);
  const boSung = {
    ...(dauVao.dacTinh && typeof dauVao.dacTinh === 'object' ? dauVao.dacTinh : {}),
    ...(dauVao.boSung && typeof dauVao.boSung === 'object' ? dauVao.boSung : {}),
  };
  if (dauVao.nhomGoiY && !boSung.nhomGoiY) boSung.nhomGoiY = dauVao.nhomGoiY;
  if (Array.isArray(dauVao.duKien)) boSung._duKien = dauVao.duKien;

  const chatLieu = docChatLieuChung(tenHang, tenNorm, boSung);
  const mayChu = xacDinhMayChu(tenHang, tenNorm, boSung);
  const phamVi = xacDinhPhamViNhom(tenHang, tenNorm, boSung, mayChu);
  const duKien = taoDuKienTuVung(tenHang, boSung, mayChu, chatLieu);
  const nhomUngVienB0 = phamVi === 'TONG_QUAT'
    ? (Array.isArray(boSung.nhomGoiY)
      ? boSung.nhomGoiY.map((x) => so(x).slice(0, 4))
      : (boSung.nhomGoiY ? [so(boSung.nhomGoiY).slice(0, 4)] : timNhomQuaDoThi(tenHang, tenNorm, chatLieu)))
    : [];

  let ketLuan = `Hàng hóa: ${tenHang || '(chưa có mô tả)'}${chatLieu ? `, chất liệu chính: ${chatLieu}` : ''}`;
  let quyTac = 'B0 — Xác định bản chất hàng';
  const trich = [];

  if (phamVi === 'PHAN_XVI') {
    quyTac = 'B0 — Xác định bản chất hàng & máy chủ';
    if (mayChu.khongRo) {
      ketLuan = 'Bộ phận cơ khí/điện chưa xác định được máy chủ cụ thể (cần biết máy chủ hoặc xác nhận dùng chung nhiều loại máy)';
      trich.push(...mayChu.trich, trichChuGiaiHeading('8545', 'nhom', 'Bộ phận giữ chổi than'), trichChuGiaiHeading('8503', 'ten_nhom'), trichChuGiaiChuong('84', 'phan', '2. Theo Chú giải 1'));
    } else if (mayChu.nhom) {
      const moTaMay = mayChu.phanNhom ? `nhóm ${cham4(mayChu.nhom)} / phân nhóm ${cham6(mayChu.phanNhom)}` : `nhóm ${cham4(mayChu.nhom)}`;
      ketLuan = `Bộ phận gắn với máy chủ ${moTaMay}${chatLieu ? ` (chất liệu ${chatLieu})` : ''}`;
      trich.push(...mayChu.trich);
    } else {
      trich.push(trichChuGiaiChuong('84', 'phan', '2. Theo Chú giải 1'));
    }
  } else if (phamVi === 'VE_SINH') {
    const coPhuDinhVan = coCumNorm(tenNorm, ['khong co van', 'khong kem van', 'khong gan van', 'khong van']);
    const coVan = boSung.coVan === true
      || (boSung.coVan !== false && !coPhuDinhVan && coCumNorm(tenNorm, ['co van', 'kem van', 'bo tron', 'bo chia nuoc']));
    if (coVan) {
      ketLuan = 'Đầu/bát sen có kèm van điều chỉnh lưu chất (rơi vào phạm vi Phần XVI, nhóm 84.81)';
      trich.push(trichChuGiaiChuong('39', 'chuong', '(s) Các mặt hàng thuộc Phần XVI'), trichChuGiaiHeading('8481', 'ten_nhom'));
    } else if (chatLieu === 'đồng') {
      ketLuan = 'Thiết bị vệ sinh bằng đồng (không kèm van điều chỉnh dòng chảy → xét nhóm 74.18, không vào 39.24)';
      trich.push(trichChuGiaiHeading('7418', 'ten_nhom'), trichChuGiaiChuong('74', 'phan', '(f) Các sản phẩm thuộc Phần XVI'));
    } else if (chatLieu === 'sắt thép' || chatLieu === 'thép không gỉ') {
      ketLuan = `Đồ dùng vệ sinh bằng ${chatLieu} (không kèm van → xét nhóm 73.24, không vào 39.24)`;
      trich.push(trichChuGiaiHeading('7324', 'ten_nhom'), trichChuGiaiChuong('73', 'phan', '(f) Các sản phẩm thuộc Phần XVI'));
    } else if (chatLieu === 'gốm sứ') {
      ketLuan = 'Thiết bị vệ sinh bằng gốm sứ (xét nhóm 69.10, không vào 39.24)';
      trich.push(trichChuGiaiHeading('6910', 'ten_nhom'), trichChuGiaiChuong('69', 'chuong', '1.'));
    } else if (chatLieu === 'plastic') {
      ketLuan = 'Sản phẩm phục vụ vệ sinh bằng plastic không kèm van điều chỉnh dòng chảy';
      trich.push(trichChuGiaiChuong('39', 'chuong', '(s) Các mặt hàng thuộc Phần XVI'), trichChuGiaiHeading('8481', 'ten_nhom'), trichChuGiaiHeading('3924', 'ten_nhom'));
    } else {
      ketLuan = 'Đầu/bát sen tắm chưa rõ chất liệu cấu thành (plastic → 39.24, thép/inox → 73.24, đồng → 74.18) và tình trạng van';
      trich.push(trichChuGiaiHeading('3924', 'ten_nhom'), trichChuGiaiHeading('7324', 'ten_nhom'), trichChuGiaiHeading('7418', 'ten_nhom'), trichChuGiaiChuong('39', 'chuong', '(s) Các mặt hàng thuộc Phần XVI'));
    }
  } else if (phamVi === 'GIAY_DEP_CH64') {
    if (chatLieu === 'da thuộc') {
      ketLuan = 'Giày, dép có chất liệu da thuộc (xét nhóm 64.03 / 64.05, không thuộc 64.02 cao su/plastic)';
      trich.push(trichChuGiaiChuong('64', 'chuong', '3. Theo mục đích của Chương này'), trichChuGiaiHeading('6403', 'ten_nhom'), trichChuGiaiHeading('6405', 'ten_nhom'));
    } else if (coCumNorm(tenNorm, ['giay di mua', 'giay nhua di mua', 'ung di mua', 'ung nhua', 'ung cao su'])) {
      ketLuan = 'Giày/ủng đi mưa bằng nhựa hoặc cao su (cần phân định 64.01 không thấm nước đúc liền vs 64.02)';
      trich.push(trichChuGiaiChuong('64', 'chuong', '3. Theo mục đích của Chương này'), trichChuGiaiHeading('6401', 'ten_nhom'), trichChuGiaiHeading('6402', 'ten_nhom'));
    } else {
      ketLuan = 'Giày, dép nhẹ có đế ngoài và mũ bằng cao su hoặc plastic';
      trich.push(trichWcoOpinion('640299/1', 'Light-weight shoes'), trichTax('64022000'), trichChuGiaiChuong('64', 'chuong', '3. Theo mục đích của Chương này'));
    }
  } else if (phamVi === 'BOT_KIM_LOAI') {
    const coPhuDinh = coCumNorm(tenNorm, [
      'khong pha chat mau', 'khong pha mau', 'khong dung lam son', 'khong dung san xuat son',
      'khong chua dung moi', 'lam phao hoa', 'bot kho', 'vay kho',
    ]) || boSung.phaChatMau === false || boSung.trangThaiVatLy === 'bot_kho_khong_pha_chat_mau' || boSung.trangThaiVatLy === 'bot_kho' || boSung.trangThaiVatLy === 'vay_kho';
    if (chatLieu === 'đồng' && coPhuDinh) {
      ketLuan = 'Bột hoặc vảy đồng khô không pha chế chất màu/chất gắn (xét nhóm 74.06, không thuộc 76.03 hay 32.12)';
      trich.push(trichChuGiaiHeading('7406', 'ten_nhom'), trichChuGiaiHeading('7406', 'nhom', '(b) Bột hoặc vảy'), trichChuGiaiChuong('74', 'phan', '(f) Các sản phẩm thuộc Phần XVI'));
    } else if (coPhuDinh) {
      ketLuan = 'Bột hoặc vảy nhôm khô không pha chế chất màu/chất gắn (xét nhóm 76.03, không bị loại sang Chương 32)';
      trich.push(trichChuGiaiHeading('7603', 'nhom', '(a) Bột hoặc vảy'), trichChuGiaiHeading('7603', 'ten_nhom'), trichChuGiaiHeading('3212', 'ten_nhom'));
    } else {
      ketLuan = 'Chế phẩm bột/vảy kim loại phân tán trong môi trường không có nước dùng sản xuất sơn (xem xét Chú giải 1(a) Phần XV & nhóm 32.12)';
      trich.push(trichChuGiaiHeading('7603', 'nhom', '(a) Bột hoặc vảy'), trichChuGiaiHeading('3212', 'ten_nhom'), trichChuGiaiHeading('3212', 'nhom', 'Phần này gồm hệ phân tán'));
    }
  } else {
    for (const h4 of nhomUngVienB0.slice(0, 4)) {
      const tr = trichChuGiaiHeading(h4, 'ten_nhom');
      if (tr) trich.push(tr);
    }
    if (trich.length === 0) {
      trich.push(trichChuGiaiChuong('84', 'phan', '2. Theo Chú giải 1'), trichChuGiaiChuong('39', 'chuong', '1.'));
    }
  }

  return {
    tenHang,
    tenNorm,
    boSung,
    chatLieu,
    mayChu,
    phamVi,
    duKien,
    nhomUngVienB0,
    tangB0: {
      tang: 'B0',
      trangThai: 'CHOT',
      quyTac,
      ketLuan,
      trich: gopTrich(trich),
    },
  };
}

// ──────────────────────────── B1: Quy tắc 1 (Loại trừ trước -> Nhóm -> Chi tiết -> WCO) ────────────────────────────
function xetQuyTac1(b0) {
  const { tenHang, tenNorm, boSung, chatLieu, mayChu, phamVi } = b0;
  const canhBaoDuLieu = [];
  const daSoat = { loaiTruPhanChuong: false, chuGiai2PhanXVI: false, chuGiai1fPhanXV: false };

  if (!tenHang) {
    return {
      trangThai: 'DUNG_HOI',
      nhom: null,
      nhomUngVien: [],
      cauHoi: 'Vui lòng cung cấp tên hàng và mô tả đặc tính cơ bản (chất liệu, chức năng, máy chủ nếu là bộ phận) để bắt đầu phân loại theo Quy tắc 1.',
      chiTietCauHoi: { khoa: 'tenHang', noiDung: 'Tên và bản chất hàng hóa là gì?', dieuKienLuat: 'ADR-0004 B0–B1' },
      tangB1: { tang: 'B1', trangThai: 'DUNG_HOI', quyTac: 'GIR 1 (thiếu mô tả bản chất hàng)', ketLuan: 'DUNG_HOI', cauHoi: 'Vui lòng cung cấp mô tả bản chất hàng.', trich: gopTrich(b0.tangB0.trich) },
      canhBaoDuLieu,
      daSoat,
    };
  }

  // 1) Phạm vi Bột kim loại / Bột nhão (76.03 nhôm / 74.06 đồng vs 32.12 — Chú giải 1(a) Phần XV)
  if (phamVi === 'BOT_KIM_LOAI') {
    daSoat.loaiTruPhanChuong = true;
    const laDong = chatLieu === 'đồng';
    const chKl = laDong ? '74' : '76';
    const h4Kl = laDong ? '7406' : '7603';
    const tKlPhan = trichChuGiaiChuong(chKl, 'phan', '1. Phần này không bao gồm');
    const tKlPhan1f = trichChuGiaiChuong(chKl, 'phan', '(f) Các sản phẩm thuộc Phần XVI');
    const t84Phan2 = trichChuGiaiChuong('84', 'phan', '2. Theo Chú giải 1');
    const tKlNhom = laDong
      ? trichChuGiaiHeading('7406', 'nhom', '(b) Bột hoặc vảy')
      : trichChuGiaiHeading('7603', 'nhom', '(a) Bột hoặc vảy');
    const tKlTen = trichChuGiaiHeading(h4Kl, 'ten_nhom');
    const t3212Ten = trichChuGiaiHeading('3212', 'ten_nhom');
    const t3212Nhom = trichChuGiaiHeading('3212', 'nhom', 'Phần này gồm hệ phân tán');
    const canhKl = soatCanhBangCanh([h4Kl, '3212'], b0);
    daSoat.canhBangCanh = canhKl.daSoat;

    const coPhuDinhSon = coCumNorm(tenNorm, [
      'khong pha chat mau', 'khong pha mau', 'khong dung lam son', 'khong dung san xuat son',
      'khong chua dung moi', 'lam phao hoa', 'bot kho', 'vay kho',
    ]);

    let laChePhamSon = null;
    if (
      boSung.trangThaiVatLy === 'bot_kho_khong_pha_chat_mau'
      || boSung.trangThaiVatLy === 'bot_kho'
      || boSung.trangThaiVatLy === 'vay_kho'
      || boSung.phaChatMau === false
    ) {
      laChePhamSon = false;
    } else if (boSung.trangThaiVatLy === 'nhao_khong_nuoc' || boSung.trangThaiVatLy === 'long_khong_nuoc' || boSung.phaChatMau === true) {
      laChePhamSon = true;
    } else if (coPhuDinhSon) {
      // Kiểm phủ định TRƯỚC khẳng định (vd "khong pha chat mau" vẫn chứa chuỗi "pha chat mau")
      laChePhamSon = false;
    } else if (coCumNorm(tenNorm, ['bot nhao', 'dang nhao', 'san xuat son', 'dung moi san xuat son', 'pha chat mau', 'dung moi'])) {
      laChePhamSon = true;
    }

    if (laChePhamSon === true) {
      return {
        trangThai: 'CHOT',
        nhom: '3212',
        laBoPhan: false,
        tangB1: {
          tang: 'B1',
          trangThai: 'CHOT',
          quyTac: `GIR 1 + Chú giải 1(a) Phần XV + chú giải chi tiết ${cham4(h4Kl)} + nhóm 32.12`,
          ketLuan: '3212',
          trich: gopTrich(tKlPhan, tKlNhom, t3212Ten, t3212Nhom, canhKl.trich),
        },
        canhBaoDuLieu: [...canhBaoDuLieu, ...canhKl.canhBao],
        daSoat,
      };
    }

    if (laChePhamSon === false) {
      daSoat.chuGiai1fPhanXV = true;
      daSoat.chuGiai2PhanXVI = true;
      return {
        trangThai: 'CHOT',
        nhom: h4Kl,
        laBoPhan: false,
        tangB1: {
          tang: 'B1',
          trangThai: 'CHOT',
          quyTac: `GIR 1 + Chú giải 1(a), 1(f) Phần XV & Chú giải 2 Phần XVI (không thuộc diện loại trừ sang Ch.32/XVI) + nhóm ${cham4(h4Kl)}`,
          ketLuan: h4Kl,
          trich: gopTrich(tKlPhan, tKlPhan1f, t84Phan2, tKlTen, tKlNhom, canhKl.trich),
        },
        canhBaoDuLieu: [...canhBaoDuLieu, ...canhKl.canhBao],
        daSoat,
      };
    }

    daSoat.chuGiai1fPhanXV = true;
    daSoat.chuGiai2PhanXVI = true;
    const cauHoi = `Bột/vảy kim loại ở dạng khô nguyên chất không pha chất màu/dung môi (${cham4(h4Kl)}) hay đã phân tán dạng nhão/lỏng trong môi trường không nước để sản xuất sơn (32.12)?`;
    return {
      trangThai: 'DUNG_HOI',
      nhom: null,
      nhomUngVien: ['3212', h4Kl],
      cauHoi,
      chiTietCauHoi: { khoa: 'trangThaiVatLy', noiDung: cauHoi, luaChon: [`Dạng bột/vảy khô không pha chất màu (→ ${h4Kl})`, 'Dạng nhão/lỏng phân tán không nước dùng sản xuất sơn (→ 3212)'], dieuKienLuat: `Chú giải 1(a) Phần XV & chú giải chi tiết ${cham4(h4Kl)}` },
      tangB1: {
        tang: 'B1',
        trangThai: 'DUNG_HOI',
        quyTac: `GIR 1 + Chú giải 1(a), 1(f) Phần XV & Chú giải 2 Phần XVI vs nhóm ${cham4(h4Kl)} / 32.12 (thiếu trạng thái vật lý pha chế → DUNG_HOI)`,
        ketLuan: 'DUNG_HOI',
        cauHoi,
        trich: gopTrich(tKlPhan, tKlPhan1f, t84Phan2, tKlNhom, t3212Ten),
      },
      canhBaoDuLieu,
      daSoat,
    };
  }

  // 2) Phạm vi Sản phẩm vệ sinh (kiểm chất liệu trước: plastic -> 39.24, thép/inox -> 73.24, đồng -> 74.18, sứ -> 69.10; có van -> 84.81)
  if (phamVi === 'VE_SINH') {
    daSoat.loaiTruPhanChuong = true;
    const t39s = trichChuGiaiChuong('39', 'chuong', '(s) Các mặt hàng thuộc Phần XVI');
    const t8481Ten = trichChuGiaiHeading('8481', 'ten_nhom');
    const t8481Nhom = trichChuGiaiHeading('8481', 'nhom', 'Nhóm này bao gồm vòi, van');
    const t3924Ten = trichChuGiaiHeading('3924', 'ten_nhom');
    const t3924Nhom = trichChuGiaiHeading('3924', 'nhom', '(D) Sản phẩm vệ sinh');
    const tWco = chatLieu === 'plastic' ? trichWcoOpinion('392490/4', 'Shower set') : null;
    const canhVs = soatCanhBangCanh(['3924', '8481', '7324', '7418'], b0);
    daSoat.canhBangCanh = canhVs.daSoat;

    if (tWco?.headingSuspect) {
      canhBaoDuLieu.push({
        loai: 'WCO_HEADING_SUSPECT',
        idWco: '392490/4',
        chiTiet: 'Dữ liệu OCR data/wco-op/opinions.json đang đánh dấu headingSuspect=true (số in 6 vs ord 4, headingContinued=true) trên 392490/4 — giữ minh bạch, không bỏ qua cờ.',
      });
    }

    if (boSung.boBanLe === true && boSung.thanhPhanNhieuVatLieu === true && !boSung.coVan) {
      return {
        trangThai: 'CHUA_CHOT_B1',
        nhomUngVien: ['3924', '7324'],
        boBanLe: true,
        tangB1: {
          tang: 'B1',
          trangThai: 'CHUA_CHOT_B1',
          quyTac: 'GIR 1 chưa chốt đơn lẻ vì bộ bán lẻ gồm nhiều bộ phận bằng nhiều vật liệu (plastic + kim loại)',
          ketLuan: 'CHUA_CHOT_B1',
          lyDo: 'Hàng đóng bộ bán lẻ gồm nhiều bộ phận khác vật liệu; cần xét GIR 3(b) ở tầng B2_B5.',
          trich: gopTrich(t39s, t3924Ten, tWco),
        },
        canhBaoDuLieu,
        daSoat,
      };
    }

    const coPhuDinhVan = coCumNorm(tenNorm, ['khong co van', 'khong kem van', 'khong gan van', 'khong van']);
    const coVan = boSung.coVan === true
      || (boSung.coVan !== false && !coPhuDinhVan && coCumNorm(tenNorm, ['co van', 'kem van', 'bo tron', 'bo chia nuoc']));
    if (coVan) {
      return {
        trangThai: 'CHOT',
        nhom: '8481',
        laBoPhan: false,
        tangB1: {
          tang: 'B1',
          trangThai: 'CHOT',
          quyTac: 'GIR 1 + Chú giải 2(s) Chương 39 (loại trừ mặt hàng Phần XVI khỏi Chương 39 sang 84.81)',
          ketLuan: '8481',
          trich: gopTrich(t39s, t8481Ten, t8481Nhom),
        },
        canhBaoDuLieu,
        daSoat,
      };
    }

    if (chatLieu === 'đồng') {
      daSoat.chuGiai1fPhanXV = true;
      daSoat.chuGiai2PhanXVI = true;
      return {
        trangThai: 'CHOT',
        nhom: '7418',
        laBoPhan: false,
        tangB1: {
          tang: 'B1',
          trangThai: 'CHOT',
          quyTac: 'GIR 1 + chất liệu đồng (không thuộc 39.24 plastic) + Chú giải 1(f) Phần XV & Chú giải 2 Phần XVI + nhóm 74.18',
          ketLuan: '7418',
          trich: gopTrich(
            trichChuGiaiChuong('74', 'phan', '(f) Các sản phẩm thuộc Phần XVI'),
            trichChuGiaiChuong('84', 'phan', '2. Theo Chú giải 1'),
            trichChuGiaiHeading('7418', 'ten_nhom'),
            trichChuGiaiHeading('7418', 'nhom'),
          ),
        },
        canhBaoDuLieu,
        daSoat,
      };
    }

    if (chatLieu === 'sắt thép' || chatLieu === 'thép không gỉ') {
      daSoat.chuGiai1fPhanXV = true;
      daSoat.chuGiai2PhanXVI = true;
      return {
        trangThai: 'CHOT',
        nhom: '7324',
        laBoPhan: false,
        tangB1: {
          tang: 'B1',
          trangThai: 'CHOT',
          quyTac: `GIR 1 + chất liệu ${chatLieu} (không thuộc 39.24 plastic) + Chú giải 1(f) Phần XV & Chú giải 2 Phần XVI + nhóm 73.24`,
          ketLuan: '7324',
          trich: gopTrich(
            trichChuGiaiChuong('73', 'phan', '(f) Các sản phẩm thuộc Phần XVI'),
            trichChuGiaiChuong('84', 'phan', '2. Theo Chú giải 1'),
            trichChuGiaiHeading('7324', 'ten_nhom'),
            trichChuGiaiHeading('7324', 'nhom'),
          ),
        },
        canhBaoDuLieu,
        daSoat,
      };
    }

    if (chatLieu === 'gốm sứ') {
      return {
        trangThai: 'CHOT',
        nhom: '6910',
        laBoPhan: false,
        tangB1: {
          tang: 'B1',
          trangThai: 'CHOT',
          quyTac: 'GIR 1 + chất liệu gốm sứ (không thuộc 39.24 plastic) + nhóm 69.10',
          ketLuan: '6910',
          trich: gopTrich(
            trichChuGiaiChuong('69', 'chuong', '1.'),
            trichChuGiaiHeading('6910', 'ten_nhom'),
            trichChuGiaiHeading('6910', 'nhom'),
          ),
        },
        canhBaoDuLieu,
        daSoat,
      };
    }

    if (chatLieu !== 'plastic') {
      daSoat.chuGiai1fPhanXV = true;
      daSoat.chuGiai2PhanXVI = true;
      const cauHoi = 'Đầu/bát sen tắm làm bằng chất liệu gì (plastic → 39.24, inox/sắt thép → 73.24, đồng/đồng mạ crom → 74.18, gốm sứ → 69.10) và có kèm van điều chỉnh dòng chảy (→ 84.81) hay không?';
      return {
        trangThai: 'DUNG_HOI',
        nhom: null,
        nhomUngVien: ['3924', '7324', '7418', '8481'],
        cauHoi,
        chiTietCauHoi: { khoa: 'chatLieu', noiDung: cauHoi, luaChon: ['Plastic (→ 39.24)', 'Thép / inox (→ 73.24)', 'Đồng / đồng mạ crom (→ 74.18)', 'Có kèm van trộn (→ 84.81)'], dieuKienLuat: 'Chú giải 2(s) Chương 39, Chú giải 1(f) Phần XV & Chú giải 2 Phần XVI' },
        tangB1: {
          tang: 'B1',
          trangThai: 'DUNG_HOI',
          quyTac: 'GIR 1 (thiếu chất liệu cấu thành đầu/bát sen — đã soát Chú giải 1(f) Phần XV & Chú giải 2 Phần XVI, không mặc định 39.24 → DUNG_HOI)',
          ketLuan: 'DUNG_HOI',
          cauHoi,
          trich: gopTrich(
            t39s,
            trichChuGiaiChuong('73', 'phan', '(f) Các sản phẩm thuộc Phần XVI'),
            trichChuGiaiChuong('84', 'phan', '2. Theo Chú giải 1'),
            t3924Ten,
            trichChuGiaiHeading('7324', 'ten_nhom'),
            trichChuGiaiHeading('7418', 'ten_nhom'),
          ),
        },
        canhBaoDuLieu,
        daSoat,
      };
    }

    if (boSung.lapCoDinh === true || coCumNorm(tenNorm, ['lap co dinh ben trong', 'lap co dinh tren tuong'])) {
      const t3925Ten = trichChuGiaiHeading('3925', 'ten_nhom');
      return {
        trangThai: 'CHOT',
        nhom: '3925',
        laBoPhan: false,
        tangB1: {
          tang: 'B1',
          trangThai: 'CHOT',
          quyTac: 'GIR 1 + Loại trừ chú giải chi tiết 39.24 mục (D) sang nhóm 39.25 (lắp cố định)',
          ketLuan: '3925',
          trich: gopTrich(t39s, t3924Nhom, t3925Ten),
        },
        canhBaoDuLieu,
        daSoat,
      };
    }

    return {
      trangThai: 'CHOT',
      nhom: '3924',
      laBoPhan: false,
      dieuKienKemTheo: 'Chỉ áp dụng cho đầu/bát sen bằng plastic không kèm van điều chỉnh lưu chất; nếu có van/bộ trộn pha nước thì Chú giải 2(s) Chương 39 đẩy sang nhóm 84.81 (8481.80).',
      tangB1: {
        tang: 'B1',
        trangThai: 'CHOT',
        quyTac: 'GIR 1 + Chú giải 2(s) Chương 39 (không có van) + Chú giải chi tiết 39.24 mục (D) + ý kiến WCO 3924.90/4',
        ketLuan: '3924',
        trich: gopTrich(t39s, t3924Ten, t3924Nhom, tWco),
      },
      canhBaoDuLieu,
      daSoat,
    };
  }

  // 3) Phạm vi Giày, dép Chương 64 (kiểm chất liệu da thuộc 64.03/64.05 và ranh giới không thấm nước 64.01 vs 64.02)
  if (phamVi === 'GIAY_DEP_CH64') {
    daSoat.loaiTruPhanChuong = true;
    const t64_1 = trichChuGiaiChuong('64', 'chuong', '1. Chương này không bao gồm');
    const t64_3 = trichChuGiaiChuong('64', 'chuong', '3. Theo mục đích của Chương này');
    const t64_4 = trichChuGiaiChuong('64', 'chuong', '4. Theo Chú giải 3 của Chương này');
    const t6401Ten = trichChuGiaiHeading('6401', 'ten_nhom');
    const t6402Ten = trichChuGiaiHeading('6402', 'ten_nhom');
    const tWco = trichWcoOpinion('640299/1', 'Light-weight shoes');
    const canh64 = soatCanhBangCanh(['6401', '6402', '6403', '6405'], b0);
    daSoat.canhBangCanh = canh64.daSoat;

    if (chatLieu === 'da thuộc' || boSung.nhomGoiY === '6403' || boSung.nhomGoiY === '6405') {
      const t6403Ten = trichChuGiaiHeading('6403', 'ten_nhom');
      const t6405Ten = trichChuGiaiHeading('6405', 'ten_nhom');
      if (boSung.deNgoai && /cao su|plastic|da thuoc|da ep/i.test(boSung.deNgoai)) {
        return {
          trangThai: 'CHOT',
          nhom: '6403',
          laBoPhan: false,
          tangB1: {
            tang: 'B1',
            trangThai: 'CHOT',
            quyTac: 'GIR 1 + Chú giải 3, 4 Chương 64 + nhóm 64.03 (mũ bằng da thuộc, đế cao su/plastic/da — không thuộc 64.02)',
            ketLuan: '6403',
            trich: gopTrich(t64_1, t64_3, t64_4, t6403Ten),
          },
          canhBaoDuLieu,
          daSoat,
        };
      }
      const cauHoi = 'Dép/giày bằng da thuộc có đế ngoài bằng cao su, plastic, da thuộc hoặc da tổng hợp (nhóm 64.03) hay bằng vật liệu khác (nhóm 64.05)?';
      return {
        trangThai: 'DUNG_HOI',
        nhom: null,
        nhomUngVien: ['6403', '6405'],
        cauHoi,
        chiTietCauHoi: { khoa: 'deNgoai', noiDung: cauHoi, luaChon: ['Đế cao su / plastic / da thuộc (→ 64.03)', 'Đế gỗ / bần / vật liệu khác (→ 64.05)'], dieuKienLuat: 'Tiêu đề nhóm 64.03 vs 64.05 & Chú giải 4 Chương 64 (mũ da không thuộc 64.02)' },
        tangB1: {
          tang: 'B1',
          trangThai: 'DUNG_HOI',
          quyTac: 'GIR 1 + Chú giải 3, 4 Chương 64 (mũ da thuộc loại khỏi 64.02, cần chất liệu đế ngoài để tách 64.03 vs 64.05 → DUNG_HOI)',
          ketLuan: 'DUNG_HOI',
          cauHoi,
          trich: gopTrich(t64_3, t64_4, t6403Ten, t6405Ten),
        },
        canhBaoDuLieu,
        daSoat,
      };
    }

    if (boSung.khongThamNuocLienKhoi === true) {
      return {
        trangThai: 'CHOT',
        nhom: '6401',
        laBoPhan: false,
        tangB1: {
          tang: 'B1',
          trangThai: 'CHOT',
          quyTac: 'GIR 1 + Chú giải Chương 64 + nhóm 64.01 (giày dép không thấm nước đúc nguyên khối không khâu/tán/chốt)',
          ketLuan: '6401',
          trich: gopTrich(t64_1, t64_3, t6401Ten),
        },
        canhBaoDuLieu,
        daSoat,
      };
    }

    const nghiNgo6401 = boSung.khongThamNuocLienKhoi === undefined
      && coCumNorm(tenNorm, ['giay di mua', 'giay nhua di mua', 'ung di mua', 'ung nhua', 'ung cao su']);
    if (nghiNgo6401) {
      const cauHoi = 'Giày/ủng đi mưa bằng nhựa hoặc cao su có phải loại không thấm nước có mũ gắn liền vào đế không qua khâu, tán, đóng đinh, bắt vít hay chốt (nhóm 64.01) hay gắn bằng chốt/khâu/dán hở (nhóm 64.02)?';
      return {
        trangThai: 'DUNG_HOI',
        nhom: null,
        nhomUngVien: ['6401', '6402'],
        cauHoi,
        chiTietCauHoi: { khoa: 'khongThamNuocLienKhoi', noiDung: cauHoi, luaChon: ['Không thấm nước đúc liền không khâu/tán/chốt (→ 64.01)', 'Không phải loại 64.01 (→ 64.02)'], dieuKienLuat: 'Ranh giới tiêu đề nhóm 64.01 vs 64.02' },
        tangB1: {
          tang: 'B1',
          trangThai: 'DUNG_HOI',
          quyTac: 'GIR 1 + Chú giải 3, 4 Chương 64 (cần làm rõ điều kiện không thấm nước & phương pháp gắn đế 64.01 vs 64.02 → DUNG_HOI)',
          ketLuan: 'DUNG_HOI',
          cauHoi,
          trich: gopTrich(t64_1, t64_3, t6401Ten, t6402Ten),
        },
        canhBaoDuLieu,
        daSoat,
      };
    }

    return {
      trangThai: 'CHOT',
      nhom: '6402',
      laBoPhan: false,
      tangB1: {
        tang: 'B1',
        trangThai: 'CHOT',
        quyTac: 'GIR 1 + Chú giải 3, 4 Chương 64 + ý kiến WCO 6402.99/1 (giày, dép có đế ngoài và mũ bằng cao su hoặc plastic, không phải loại 64.01)',
        ketLuan: '6402',
        trich: gopTrich(t6402Ten, t64_3, t64_4, t64_1, tWco),
      },
      canhBaoDuLieu,
      daSoat,
    };
  }

  // 4) Phạm vi Phần XVI (Chú giải 1 Phần XVI/Ch.84/Ch.85 -> 2(a) -> 2(b) -> 2(c))
  if (phamVi === 'PHAN_XVI') {
    daSoat.loaiTruPhanChuong = true;
    daSoat.chuGiai2PhanXVI = true;
    const dacTinh = {
      ...boSung,
      ...(chatLieu ? { chatLieu } : {}),
    };
    const kq = xetChuGiai2PhanXVI({
      tenHang,
      mayMe: boSung.mayMe || '',
      nhomMayMe: mayChu.khongRo ? null : mayChu.nhom,
      dacTinh,
    });
    const trich = thuTrichChuGiai2(kq);

    if (kq.trangThai === 'CHOT') {
      const nhom = so(kq.nhomKetQua).slice(0, 4);
      // Nếu Chú giải 1(g) đẩy sang Phần XV (7318, 7320, 7315...), bổ sung trích Chú giải 1(f) Phần XV & Chú giải 2 Phần XVI (ADR-0004 §3)
      if (/^(72|73|74|75|76|78|79|80|81|82|83)/.test(nhom)) {
        daSoat.chuGiai1fPhanXV = true;
        daSoat.chuGiai2PhanXVI = true;
        const ch2 = nhom.slice(0, 2);
        trich.push(
          trichChuGiaiChuong(ch2, 'phan', '(f) Các sản phẩm thuộc Phần XVI') || trichChuGiaiChuong('73', 'phan', '(f) Các sản phẩm thuộc Phần XVI'),
          trichChuGiaiChuong('84', 'phan', '2. Theo Chú giải 1'),
          trichChuGiaiChuong('73', 'phan', '2. Trong Danh mục này'),
        );
      }
      if (!nhom) {
        return {
          trangThai: 'DUNG_HOI',
          nhom: null,
          nhomUngVien: [],
          cauHoi: `Sản phẩm bị loại khỏi Phần XVI (${kq.quyTac}), cần xác định chất liệu cấu thành cụ thể để định nhóm tại Chương tương ứng.`,
          chiTietCauHoi: { khoa: 'chatLieu', noiDung: 'Chất liệu cấu thành chính của hàng hóa là gì?', dieuKienLuat: kq.quyTac },
          tangB1: { tang: 'B1', trangThai: 'DUNG_HOI', quyTac: `GIR 1 + ${kq.quyTac}`, ketLuan: 'DUNG_HOI', cauHoi: 'Cần xác định chất liệu cấu thành chính để chọn nhóm ngoài Phần XVI.', trich: gopTrich(trich) },
          canhBaoDuLieu,
          daSoat,
        };
      }
      return {
        trangThai: 'CHOT',
        nhom,
        buocCG2: kq.buocDung,
        laBoPhan: kq.buocDung === '2b_BO_PHAN_CHUYEN_DUNG' || kq.buocDung === '2c_BO_PHAN_CON_LAI',
        tangB1: {
          tang: 'B1',
          trangThai: 'CHOT',
          quyTac: `GIR 1 + ${kq.quyTac}${kq.buocDung === '2b_BO_PHAN_CHUYEN_DUNG' && tenNorm.includes('choi than') ? ' (kèm loại trừ chú giải 85.45 mục (D))' : ''}`,
          ketLuan: nhom,
          lyDo: kq.lyDo,
          trich: gopTrich(trich),
        },
        canhBaoDuLieu,
        daSoat,
      };
    }

    // DUNG_HOI từ Chú giải 2 Phần XVI (ví dụ 8483 vs 8431 thiếu trucQuay, hoặc 8503/8487/8548 thiếu nhomMayMe)
    const ungVien = (kq.ungVien || []).map((x) => so(x).slice(0, 4)).filter((x) => x.length === 4);
    const cauHoi = chu(kq.cauHoi?.noiDung) || chu(kq.lyDo) || 'Thiếu dữ kiện để phân định nhóm theo Chú giải 2 Phần XVI.';
    return {
      trangThai: 'DUNG_HOI',
      nhom: null,
      nhomUngVien: ungVien,
      buocCG2: kq.buocDung,
      cauHoi,
      chiTietCauHoi: kq.cauHoi || { khoa: 'boSung', noiDung: cauHoi, dieuKienLuat: kq.quyTac },
      tangB1: {
        tang: 'B1',
        trangThai: 'DUNG_HOI',
        quyTac: `GIR 1 + ${kq.quyTac}`,
        ketLuan: 'DUNG_HOI',
        cauHoi,
        chiTietCauHoi: kq.cauHoi,
        lyDo: kq.lyDo,
        trich: gopTrich(trich),
      },
      canhBaoDuLieu,
      daSoat,
    };
  }

  // 5) Đường tổng quát ngoài 4 họ trên: dùng nhomGoiY + timNhomQuaDoThi (C1 + tiêu đề nhóm) + bangCanh (LOAI_TRU / C5 / C9 / WCO)
  let tapNhom = [];
  const rawGoiY = Array.isArray(boSung.nhomGoiY)
    ? boSung.nhomGoiY
    : (boSung.nhomGoiY ? [boSung.nhomGoiY] : []);
  for (const g of rawGoiY) {
    const h4 = so(g).slice(0, 4);
    if (h4.length === 4 && D.coNut(h4) && !tapNhom.includes(h4)) tapNhom.push(h4);
  }
  if (tapNhom.length === 0) {
    tapNhom = b0.nhomUngVienB0?.length ? [...b0.nhomUngVienB0] : timNhomQuaDoThi(tenHang, tenNorm, chatLieu);
  }

  // Soát trực tiếp các cạnh LOAI_TRU, C5, C9, WCO trong D.bangCanh()
  const canhTongQuat = tapNhom.length ? soatCanhBangCanh(tapNhom, b0) : { trich: [], canhBao: [], loaiTruBiKichHoat: [], daSoat: {} };
  daSoat.canhBangCanh = canhTongQuat.daSoat;
  if (canhTongQuat.loaiTruBiKichHoat.length === 1 && tapNhom.length === 1) {
    tapNhom = [canhTongQuat.loaiTruBiKichHoat[0].toi];
  }

  if (tapNhom.length === 1) {
    const h4 = tapNhom[0];
    const ch2 = h4.slice(0, 2);
    daSoat.loaiTruPhanChuong = true;
    const trich = [
      trichChuGiaiHeading(h4, 'ten_nhom'),
      trichChuGiaiChuong(ch2, 'chuong', '1.'),
      ...(ch2 !== '39' && ch2 !== '40' ? [trichChuGiaiChuong(ch2, 'phan', '1.')] : []),
      trichChuGiaiHeading(h4, 'nhom'),
      ...canhTongQuat.trich,
    ].filter(Boolean);
    const laPhanXV = /^(72|73|74|75|76|78|79|80|81|82|83)/.test(h4);
    if (laPhanXV) {
      daSoat.chuGiai1fPhanXV = true;
      daSoat.chuGiai2PhanXVI = true;
      trich.push(
        trichChuGiaiChuong(ch2, 'phan', '(f) Các sản phẩm thuộc Phần XVI') || trichChuGiaiChuong('73', 'phan', '(f) Các sản phẩm thuộc Phần XVI'),
        trichChuGiaiChuong('84', 'phan', '2. Theo Chú giải 1'),
      );
    }
    return {
      trangThai: 'CHOT',
      nhom: h4,
      laBoPhan: false,
      tangB1: {
        tang: 'B1',
        trangThai: 'CHOT',
        quyTac: laPhanXV
          ? `GIR 1 + tên nhóm ${cham4(h4)} + soát Chú giải 1(f) Phần XV & Chú giải 2 Phần XVI + chú giải Chương ${ch2}`
          : `GIR 1 + tên nhóm ${cham4(h4)} + soát chú giải Chương ${ch2}`,
        ketLuan: h4,
        trich: gopTrich(trich),
      },
      canhBaoDuLieu: [...canhBaoDuLieu, ...canhTongQuat.canhBao],
      daSoat,
    };
  }

  if (tapNhom.length > 1) {
    const trich = [
      ...tapNhom.slice(0, 4).map((h4) => trichChuGiaiHeading(h4, 'ten_nhom')).filter(Boolean),
      ...canhTongQuat.trich,
    ];
    const coPhanXV = tapNhom.slice(0, 4).some((h4) => /^(72|73|74|75|76|78|79|80|81|82|83)/.test(h4));
    if (coPhanXV) {
      daSoat.chuGiai1fPhanXV = true;
      daSoat.chuGiai2PhanXVI = true;
      const chXV = tapNhom.find((h4) => /^(72|73|74|75|76|78|79|80|81|82|83)/.test(h4)).slice(0, 2);
      trich.push(
        trichChuGiaiChuong(chXV, 'phan', '(f) Các sản phẩm thuộc Phần XVI') || trichChuGiaiChuong('73', 'phan', '(f) Các sản phẩm thuộc Phần XVI'),
        trichChuGiaiChuong('84', 'phan', '2. Theo Chú giải 1'),
      );
    }
    if (boSung.boBanLe === true || coCumNorm(tenNorm, ['thao roi', 'chua lap rap'])) {
      return {
        trangThai: 'CHUA_CHOT_B1',
        nhomUngVien: tapNhom.slice(0, 4),
        tangB1: {
          tang: 'B1',
          trangThai: 'CHUA_CHOT_B1',
          quyTac: 'GIR 1 chưa tách được duy nhất một nhóm',
          ketLuan: 'CHUA_CHOT_B1',
          lyDo: `Có nhiều nhóm ứng viên (${tapNhom.slice(0, 4).join(', ')}) cần xét Quy tắc 2–5.`,
          trich: gopTrich(trich),
        },
        canhBaoDuLieu: [...canhBaoDuLieu, ...canhTongQuat.canhBao],
        daSoat,
      };
    }
    const laOngThep = tapNhom.includes('7304') && tapNhom.includes('7306');
    const cauHoi = laOngThep
      ? 'Ống thép không gỉ được sản xuất theo phương pháp đúc/kéo không hàn (nhóm 73.04) hay hàn/tán ghép nối (nhóm 73.06)?'
      : `Cần làm rõ bản chất, chất liệu và chức năng chính của hàng hóa để phân định giữa các nhóm: ${tapNhom.slice(0, 4).join(', ')}.`;
    return {
      trangThai: 'DUNG_HOI',
      nhom: null,
      nhomUngVien: tapNhom.slice(0, 4),
      cauHoi,
      chiTietCauHoi: { khoa: laOngThep ? 'phuongPhapCheTaoOng' : 'nhomGoiY', noiDung: cauHoi, dieuKienLuat: 'GIR 1' },
      tangB1: { tang: 'B1', trangThai: 'DUNG_HOI', quyTac: 'GIR 1 (nhiều nhóm ứng viên, thiếu dữ kiện phân định)', ketLuan: 'DUNG_HOI', cauHoi, trich: gopTrich(trich) },
      canhBaoDuLieu: [...canhBaoDuLieu, ...canhTongQuat.canhBao],
      daSoat,
    };
  }

  const cauHoiChung = 'Không đủ dữ kiện để xác định nhóm 4 số theo Quy tắc 1: vui lòng bổ sung công dụng, chất liệu và dạng trình bày (hoàn chỉnh hay bộ phận của máy nào).';
  return {
    trangThai: 'DUNG_HOI',
    nhom: null,
    nhomUngVien: [],
    cauHoi: cauHoiChung,
    chiTietCauHoi: { khoa: 'moTaChiTiet', noiDung: cauHoiChung, dieuKienLuat: 'GIR 1' },
    tangB1: {
      tang: 'B1',
      trangThai: 'DUNG_HOI',
      quyTac: 'GIR 1 (chưa xác định được nhóm từ dữ kiện hiện có)',
      ketLuan: 'DUNG_HOI',
      cauHoi: cauHoiChung,
      trich: gopTrich(b0.tangB0.trich, trichChuGiaiChuong('84', 'phan', '2. Theo Chú giải 1')),
    },
    canhBaoDuLieu,
    daSoat,
  };
}

// ──────────────────────────── B2–B5: Chỉ chạy khi B1 không giải quyết ────────────────────────────
function xetQuyTac2Den5(b0, b1) {
  if (b1.trangThai === 'CHOT') {
    return {
      trangThai: 'BO_QUA',
      nhom: b1.nhom,
      tangB25: {
        tang: 'B2_B5',
        trangThai: 'BO_QUA',
        quyTac: 'Không áp dụng GIR 2–5',
        ketLuan: 'BO_QUA',
        lyDo: `GIR 1 tại B1 đã giải quyết duy nhất vào nhóm ${b1.nhom}; cấm viện dẫn GIR 2–5 theo ADR-0004 §1 & §3.`,
        trich: [],
      },
    };
  }

  if (b1.trangThai === 'DUNG_HOI') {
    return {
      trangThai: 'BO_QUA',
      nhom: null,
      tangB25: {
        tang: 'B2_B5',
        trangThai: 'BO_QUA',
        quyTac: 'Không áp dụng GIR 2–5 (B1 đang dừng hỏi dữ kiện)',
        ketLuan: 'BO_QUA',
        lyDo: `B1 đã dừng hỏi dữ kiện phân định (${(b1.nhomUngVien || []).join(', ') || 'thiếu bản chất'}); không nhảy sang GIR 2–5 để đoán.`,
        trich: [],
      },
    };
  }

  // B1 === CHUA_CHOT_B1: xét đúng thứ tự 2(a) -> 2(b) -> 3(a) -> 3(b) -> 3(c) -> 4 -> 5
  const { tenNorm, boSung } = b0;
  const ungVien = b1.nhomUngVien || [];
  if (coCumNorm(tenNorm, ['thao roi', 'chua lap rap']) && ungVien.length) {
    const chon = ungVien[0];
    return {
      trangThai: 'CHOT',
      nhom: chon,
      tangB25: {
        tang: 'B2_B5',
        trangThai: 'CHOT',
        quyTac: 'GIR 2(a) (hàng ở dạng chưa lắp ráp / tháo rời mang đặc trưng cơ bản của hàng hoàn chỉnh)',
        ketLuan: chon,
        lyDo: `B1 chưa chốt một nhóm (${ungVien.join(', ')}) do hàng ở dạng tháo rời; áp GIR 2(a) phân loại như hàng hoàn chỉnh vào ${chon}.`,
        trich: gopTrich(trichChuGiaiHeading(chon, 'ten_nhom')),
      },
    };
  }

  if (boSung.boBanLe === true && boSung.dacTinhCoBan) {
    const chon = /nhua|plastic/i.test(boSung.dacTinhCoBan) && ungVien.includes('3924') ? '3924' : ungVien[0];
    const tWco = chon === '3924' ? trichWcoOpinion('392490/4', 'essential character to the set') : null;
    return {
      trangThai: 'CHOT',
      nhom: chon,
      tangB25: {
        tang: 'B2_B5',
        trangThai: 'CHOT',
        quyTac: 'GIR 3(b) (hàng đóng bộ bán lẻ phân loại theo bộ phận tạo nên đặc trưng cơ bản)',
        ketLuan: chon,
        lyDo: `B1 không chốt được một nhóm vì là bộ bán lẻ nhiều vật liệu (${ungVien.join(', ')}); áp GIR 3(b) theo đặc trưng cơ bản (${boSung.dacTinhCoBan}).`,
        trich: gopTrich(trichChuGiaiHeading(chon, 'ten_nhom'), tWco),
      },
    };
  }

  const cauHoi = `GIR 1 chưa chốt được một nhóm giữa [${ungVien.join(', ')}]; vui lòng nêu đặc trưng cơ bản hoặc bộ phận chính để xét Quy tắc 3.`;
  return {
    trangThai: 'DUNG_HOI',
    nhom: null,
    nhomUngVien: ungVien,
    cauHoi,
    tangB25: {
      tang: 'B2_B5',
      trangThai: 'DUNG_HOI',
      quyTac: 'GIR 2–5 (thiếu dữ kiện đặc trưng cơ bản cho GIR 3(b))',
      ketLuan: 'DUNG_HOI',
      lyDo: `B1 còn nhiều nhóm ứng viên (${ungVien.join(', ')}) nhưng chưa đủ dữ kiện đặc trưng cơ bản.`,
      cauHoi,
      trich: gopTrich(ungVien.map((h) => trichChuGiaiHeading(h, 'ten_nhom'))),
    },
  };
}

// ──────────────────────────── B6_6SO: Quy tắc 6 cấp 6 số ────────────────────────────
function moTaChoTieuChi6(b0, nhom) {
  const { tenHang, tenNorm, boSung, mayChu } = b0;
  const tl = TV.docTenLoaiDayDu(tenHang)?.giaTri;
  const tenLoaiCoBan = (tl && tl !== 'undefined' ? tl : tenHang.replace(/\s*(?:dùng cho|dung cho|cho|thuộc|thuoc|gắn vào|gan vao)\b.*$/i, '').trim()) || 'Bộ phận';
  if (nhom === '8431') {
    if (mayChu.nhom === '8428') {
      if (mayChu.phanNhom === '842810' || mayChu.loai === 'van_thang') {
        return `${tenLoaiCoBan}, dùng cho thang máy (lift), tời nâng kiểu gầu nâng thuộc nhóm 84.28`;
      }
      return `${tenLoaiCoBan}, dùng cho máy thuộc nhóm 84.28`;
    }
    if (mayChu.nhom === '8430') {
      if (mayChu.phanNhom === '843041' || mayChu.phanNhom === '843049') {
        return `${tenLoaiCoBan}, dùng cho máy khoan hoặc máy đào sâu thuộc nhóm 84.30 phân nhóm ${cham6(mayChu.phanNhom)}`;
      }
      return `${tenLoaiCoBan}, dùng cho máy thuộc nhóm 84.30`;
    }
    if (typeof mayChu.nhom === 'string') {
      return `${tenLoaiCoBan}, dùng cho máy thuộc nhóm ${cham4(mayChu.nhom)}`;
    }
  } else if (nhom === '8483') {
    if (boSung.coGanOBi === true) {
      return `thân ổ có lắp ổ bi hoặc ổ đũa, ${tenHang}`;
    }
    if (coCumNorm(tenNorm, ['bac truc', 'o truot', 'goi do truc'])) {
      return `thân ổ, gối đỡ trục dùng ổ trượt, không lắp ổ bi hoặc ổ đũa, ${tenHang}`;
    }
  } else if (nhom === '8481' && b0.phamVi === 'VE_SINH' && boSung.coVan === true) {
    return 'vòi van vệ sinh hoàn chỉnh dùng cho phòng tắm, không phải bộ phận';
  } else if (nhom === '8504' && coCumNorm(tenNorm, ['may bien ap', 'may bien the'])) {
    const mKva = String(tenHang || '').match(/(\d+(?:[.,]\d+)?)\s*kva\b/i);
    const kva = boSung.congSuatKva || (mKva ? Number(mKva[1].replace(',', '.')) : null);
    const kieu = coCumNorm(tenNorm, ['dien moi long', 'ngam dau']) ? 'sử dụng điện môi lỏng' : coCumNorm(tenNorm, ['kho']) ? 'khô' : '';
    return `Máy biến điện ${kieu}${kva ? `, công suất danh định ${kva} kVA` : ''}`.trim();
  }
  return tenHang;
}

function danhGia6SoKhongTieuChi(h4, b0) {
  const pnList = G6.phanNhomCuaNhom(h4);
  if (pnList.length === 1) {
    const hs6 = pnList[0].hs6;
    return {
      trangThai: 'CHOT',
      hs6,
      quyTac: `GIR 6 (nhóm ${cham4(h4)} chỉ có duy nhất phân nhóm ${cham6(hs6)})`,
      soSanhCungCapGach: true,
      khongTuRoiLoaiKhac: true,
      trich: gopTrich(trichWcoCsv(hs6)),
    };
  }

  const { tenNorm, boSung } = b0;
  // Nhóm 32.12: 3212.10 (Lá phôi dập) vs 3212.90 (Loại khác)
  if (h4 === '3212') {
    const laPhoi = boSung.laPhoiDap === true
      ? true
      : (boSung.laPhoiDap === false || coCumNorm(tenNorm, ['bot nhao', 'dang long', 'dang nhao', 'thuoc nhuom', 'san xuat son', 'vay nhom', 'dung moi']))
        ? false
        : null;
    if (laPhoi === true) {
      return {
        trangThai: 'CHOT',
        hs6: '321210',
        quyTac: 'GIR 6 (so phân nhóm cấp 1 gạch: lá phôi dập 3212.10 vs loại khác 3212.90)',
        soSanhCungCapGach: true,
        khongTuRoiLoaiKhac: true,
        trich: gopTrich(trichWcoCsv('321210'), trichWcoCsv('321290')),
      };
    }
    if (laPhoi === false) {
      return {
        trangThai: 'CHOT',
        hs6: '321290',
        quyTac: 'GIR 6 (tách lá phôi dập 3212.10 với thuốc màu dạng lỏng/nhão/vảy phân tán khác 3212.90)',
        soSanhCungCapGach: true,
        khongTuRoiLoaiKhac: true,
        trich: gopTrich(trichWcoCsv('321290'), trichWcoCsv('321210')),
      };
    }
  }

  // Nhóm 74.06: 7406.10 (Bột không cấu trúc lớp) vs 7406.20 (Bột cấu trúc lớp; vảy đồng)
  if (h4 === '7406') {
    const coCauTrucLop = typeof boSung.cauTrucLop === 'boolean'
      ? boSung.cauTrucLop
      : coCumNorm(tenNorm, ['khong co cau truc lop', 'khong cau truc lop', 'non lamellar'])
        ? false
        : (boSung.laVayDong === true || coCumNorm(tenNorm, ['vay dong', 'vay kho', 'cau truc lop', 'lamellar']))
          ? true
          : null;
    if (coCauTrucLop === false) {
      return {
        trangThai: 'CHOT',
        hs6: '740610',
        quyTac: 'GIR 6 (so phân nhóm cấp 1 gạch 7406.10 bột không cấu trúc lớp vs 7406.20)',
        soSanhCungCapGach: true,
        khongTuRoiLoaiKhac: true,
        trich: gopTrich(trichWcoCsv('740610'), trichWcoCsv('740620')),
      };
    }
    if (coCauTrucLop === true) {
      return {
        trangThai: 'CHOT',
        hs6: '740620',
        quyTac: 'GIR 6 (so phân nhóm cấp 1 gạch 7406.10 vs 7406.20 bột có cấu trúc lớp / vảy đồng)',
        soSanhCungCapGach: true,
        khongTuRoiLoaiKhac: true,
        trich: gopTrich(trichWcoCsv('740620'), trichWcoCsv('740610')),
      };
    }
    const cauHoi = 'Bột đồng khô thuộc loại không có cấu trúc lớp (7406.10.00) hay bột có cấu trúc lớp / vảy đồng (7406.20.00)?';
    return {
      trangThai: 'DUNG_HOI',
      ungVien: ['740610', '740620'],
      cauHoi,
      chiTietCauHoi: { khoa: 'cauTrucLop', noiDung: cauHoi, luaChon: ['Không cấu trúc lớp (→ 740610)', 'Có cấu trúc lớp / vảy đồng (→ 740620)'], dieuKienLuat: 'Tiêu đề 7406.10 vs 7406.20' },
      quyTac: 'GIR 6 (thiếu dữ kiện cấu trúc lớp của bột đồng → DUNG_HOI)',
      soSanhCungCapGach: true,
      trich: gopTrich(trichWcoCsv('740610'), trichWcoCsv('740620')),
    };
  }

  // Nhóm 76.03: 7603.10 (Bột không có cấu trúc lớp) vs 7603.20 (Bột có cấu trúc lớp; vảy nhôm)
  if (h4 === '7603') {
    const coCauTrucLop = typeof boSung.cauTrucLop === 'boolean'
      ? boSung.cauTrucLop
      : coCumNorm(tenNorm, ['khong co cau truc lop', 'khong cau truc lop', 'non lamellar'])
        ? false
        : (boSung.laVayNhom === true || coCumNorm(tenNorm, ['vay nhom', 'vay kho', 'cau truc lop', 'lamellar']))
          ? true
          : null;
    if (coCauTrucLop === false) {
      return {
        trangThai: 'CHOT',
        hs6: '760310',
        quyTac: 'GIR 6 (so phân nhóm cấp 1 gạch 7603.10 bột không cấu trúc lớp vs 7603.20 bột cấu trúc lớp/vảy)',
        soSanhCungCapGach: true,
        khongTuRoiLoaiKhac: true,
        trich: gopTrich(trichWcoCsv('760310'), trichWcoCsv('760320')),
      };
    }
    if (coCauTrucLop === true) {
      return {
        trangThai: 'CHOT',
        hs6: '760320',
        quyTac: 'GIR 6 (so phân nhóm cấp 1 gạch 7603.10 vs 7603.20 bột có cấu trúc lớp / vảy nhôm)',
        soSanhCungCapGach: true,
        khongTuRoiLoaiKhac: true,
        trich: gopTrich(trichWcoCsv('760320'), trichWcoCsv('760310')),
      };
    }
    const cauHoi = 'Bột nhôm khô là loại không có cấu trúc lớp (7603.10.00) hay bột có cấu trúc lớp / vảy nhôm (7603.20)?';
    return {
      trangThai: 'DUNG_HOI',
      ungVien: ['760310', '760320'],
      cauHoi,
      chiTietCauHoi: { khoa: 'cauTrucLop', noiDung: cauHoi, luaChon: ['Không cấu trúc lớp (→ 760310)', 'Có cấu trúc lớp / vảy nhôm (→ 760320)'], dieuKienLuat: 'Tiêu đề 7603.10 vs 7603.20' },
      quyTac: 'GIR 6 (thiếu dữ kiện cấu trúc lớp của bột nhôm → DUNG_HOI)',
      soSanhCungCapGach: true,
      trich: gopTrich(trichWcoCsv('760310'), trichWcoCsv('760320')),
    };
  }

  // Nhóm 74.18: 7418.10 (bộ đồ ăn/nhà bếp) vs 7418.20 (đồ trang bị nhà vệ sinh bằng đồng)
  if (h4 === '7418' && coCumNorm(tenNorm, ['bat sen', 'dau sen', 'voi sen', 'nha ve sinh', 've sinh'])) {
    return {
      trangThai: 'CHOT',
      hs6: '741820',
      quyTac: 'GIR 6 (so phân nhóm cấp 1 gạch: đồ dùng bàn/bếp 7418.10 vs đồ trang bị nhà vệ sinh 7418.20)',
      soSanhCungCapGach: true,
      khongTuRoiLoaiKhac: true,
      trich: gopTrich(trichWcoCsv('741820'), trichWcoCsv('741810')),
    };
  }

  // Nhóm 94.03: đồ nội thất bằng gỗ dùng trong văn phòng (9403.30)
  if (h4 === '9403' && coCumNorm(tenNorm, ['van phong']) && b0.chatLieu === 'gỗ') {
    return {
      trangThai: 'CHOT',
      hs6: '940330',
      quyTac: 'GIR 6 (so phân nhóm cấp 1 gạch nhóm 94.03: đồ nội thất bằng gỗ dùng trong văn phòng → 9403.30)',
      soSanhCungCapGach: true,
      khongTuRoiLoaiKhac: true,
      trich: gopTrich(trichWcoCsv('940330'), trichWcoCsv('940310'), trichWcoCsv('940320')),
    };
  }

  // Nhóm 69.10: đồ vệ sinh bằng sứ (6910.10) vs loại khác (6910.90)
  if (h4 === '6910' && coCumNorm(tenNorm, ['su', 'gom su', 'porcelain'])) {
    return {
      trangThai: 'CHOT',
      hs6: '691010',
      quyTac: 'GIR 6 (so phân nhóm cấp 1 gạch 6910.10 bằng sứ vs 6910.90 loại khác)',
      soSanhCungCapGach: true,
      khongTuRoiLoaiKhac: true,
      trich: gopTrich(trichWcoCsv('691010'), trichWcoCsv('691090')),
    };
  }

  // Fallback tổng quát trên cây HS (chỉ so anh em cấp 1 gạch trước rồi xuống 2 gạch)
  const cap1 = [...new Set(pnList.map((p) => (p.tang === h4 ? p.hs6 : p.tang)))];
  const cauHoi = `Cần xác định tiêu chí phân biệt phân nhóm 6 số trong nhóm ${cham4(h4)} (chưa có tieuChi6 số hoá đầy đủ cho các nhánh cùng cấp gạch: ${cap1.join(', ')}).`;
  return {
    trangThai: 'DUNG_HOI',
    ungVien: pnList.slice(0, 6).map((p) => p.hs6),
    cauHoi,
    chiTietCauHoi: { khoa: 'phanNhom', noiDung: cauHoi, dieuKienLuat: `GIR 6 nhóm ${cham4(h4)}` },
    quyTac: `GIR 6 (nhóm ${cham4(h4)} chưa đủ dữ kiện tách phân nhóm cùng cấp gạch → DUNG_HOI)`,
    soSanhCungCapGach: true,
    trich: gopTrich(pnList.slice(0, 4).map((p) => trichWcoCsv(p.hs6))),
  };
}

function danhGia6SoCoTieuChi(h4, st, b0) {
  const { tenNorm, boSung } = b0;
  const moTa6 = moTaChoTieuChi6(b0, h4);
  const dx = G6.diXuong6(h4, st.tieuChi6, moTa6);
  const pnList = G6.phanNhomCuaNhom(h4);
  const theoMa = new Map(pnList.map((p) => [p.hs6, p]));
  const canhBaoDuLieu = [];

  // Ghi nhận minh bạch mọi mục chuaSoHoa trong tieuChi6 của nhóm
  const dsChuaSo = (st.tieuChi6 || []).filter((m) => m && typeof m.chuaSoHoa === 'string' && m.chuaSoHoa.trim());
  for (const m of dsChuaSo) {
    canhBaoDuLieu.push({
      loai: 'CHUA_SO_HOA',
      ma: m.hs6,
      chiTiet: `Phân nhóm ${m.hs6} mang chuaSoHoa ("${m.chuaSoHoa}") trong data/so-tay/${h4}.json — cần dữ kiện boSung tường minh hoặc dừng hỏi.`,
    });
  }

  // Bổ sung đánh giá dữ kiện cấu trúc từ boSung (bao gồm mục chuaSoHoa như 6402.20 chốt cài)
  const chiTiet = dx.chiTiet.map((q) => ({ ...q }));
  if (h4 === '6402') {
    const capNhat = (hs6, tt) => {
      const m = chiTiet.find((x) => x.hs6 === hs6);
      if (m) m.trangThai = tt;
    };
    if (boSung.giayTheThao === true) {
      capNhat('640219', 'THOA');
    } else if (boSung.giayTheThao === false) {
      capNhat('640212', 'TRAI');
      capNhat('640219', 'TRAI');
    }
    if (boSung.cheMatCaChan === true) capNhat('640291', 'THOA');
    else if (boSung.cheMatCaChan === false) capNhat('640291', 'TRAI');

    const coChot = typeof boSung.coChotCai === 'boolean'
      ? boSung.coChotCai
      : coCumNorm(tenNorm, ['bang chot cai', 'gan de bang chot'])
        ? true
        : coCumNorm(tenNorm, ['khong dung chot cai', 'dan mep khong chot'])
          ? false
          : null;
    if (coChot === true) capNhat('640220', 'THOA');
    else if (coChot === false) capNhat('640220', 'TRAI');
    else capNhat('640220', 'CHUA_BIET');

    // Tính lại trạng thái phân nhóm dư theo đúng luật cùng tầng gạch ngang
    const da = (hs6) => chiTiet.find((x) => x.hs6 === hs6)?.trangThai;
    if (da('640212') === 'TRAI' && da('640219') === 'TRAI' && da('640220') === 'TRAI' && da('640291') === 'TRAI') {
      capNhat('640299', 'THOA');
    } else if (da('640220') === 'THOA' || da('640291') === 'THOA' || da('640219') === 'THOA') {
      capNhat('640299', 'TRAI');
    } else {
      capNhat('640299', 'CHUA_BIET');
    }
  }

  // Xét riêng 8431 khi máy chủ là 84.30 nhưng chưa biết phân nhóm 8430.41/49 -> bắt buộc DUNG_HOI giữa 843143 và 843149 (không tự đoán 843049!)
  if (h4 === '8431' && b0.mayChu.nhom === '8430' && !b0.mayChu.phanNhom) {
    const cauHoi = 'Máy khoan / máy đào sâu (máy chủ nhóm 84.30) có thuộc phân nhóm 8430.41 hoặc 8430.49 để vào phân nhóm 8431.43, hay thuộc phân nhóm khác của nhóm 84.30 (→ 8431.49)?';
    return {
      trangThai: 'DUNG_HOI',
      ungVien: ['843143', '843149'],
      cauHoi,
      chiTietCauHoi: {
        khoa: 'phanNhomMayMe',
        noiDung: cauHoi,
        luaChon: ['Thuộc phân nhóm 8430.41 hoặc 8430.49 (→ 84314300)', 'Máy 84.30 khác (→ 84314990)'],
        dieuKienLuat: 'Phân nhóm 8431.43 vs 8431.49 (cấp 2 gạch dưới 84314)',
      },
      quyTac: 'GIR 6 (so phân nhóm cùng cấp 2 gạch dưới 8431.4: 8431.43 vs 8431.49, thiếu phân nhóm máy chủ 8430.41/49 → DUNG_HOI)',
      soSanhCungCapGach: true,
      trich: gopTrich(trichWcoCsv('843143'), trichWcoCsv('843149')),
      canhBaoDuLieu,
    };
  }

  // Kiểm điều kiện thắng ở cấp 6 số: đúng 1 phân nhóm THOA và mọi phân nhóm có thuTu nhỏ hơn (hoặc uuTien) đều TRAI
  const thoaList = chiTiet.filter((q) => q.trangThai === 'THOA');
  if (thoaList.length === 1) {
    const win = thoaList[0];
    const coChuaBietTruoc = chiTiet.some((q) => q.thuTu < win.thuTu && q.trangThai !== 'TRAI');
    const coUuTienChuaBiet = chiTiet.some((q) => q.uuTien && q.hs6 !== win.hs6 && q.trangThai !== 'TRAI');
    if (!coChuaBietTruoc && !coUuTienChuaBiet) {
      const pMeta = theoMa.get(win.hs6);
      const anhEmCungTang = chiTiet.filter((q) => q.hs6 !== win.hs6 && theoMa.get(q.hs6)?.tang === pMeta?.tang);
      const khongTuRoiLoaiKhac = !win.phanConLai || anhEmCungTang.every((q) => q.trangThai === 'TRAI');
      if (khongTuRoiLoaiKhac) {
        const winNode = T.nodeOf(win.hs6);
        const anhEmTrich = chiTiet
          .filter((q) => {
            if (q.hs6 === win.hs6) return false;
            const n = T.nodeOf(q.hs6);
            const m = theoMa.get(q.hs6);
            // Chỉ trích anh em CÙNG cấp gạch ngang (cùng depth và cùng parent trên cây HS)
            if (winNode?.depth && n?.depth && (n.depth !== winNode.depth || n.parent !== winNode.parent)) return false;
            return (pMeta?.tang ? m?.tang === pMeta.tang : true);
          })
          .slice(0, 3)
          .map((q) => trichWcoCsv(q.hs6));
        return {
          trangThai: 'CHOT',
          hs6: win.hs6,
          quyTac: `GIR 6 (so phân nhóm cùng cấp gạch trong nhóm ${cham4(h4)} → ${cham6(win.hs6)})`,
          soSanhCungCapGach: true,
          khongTuRoiLoaiKhac: true,
          coKhoaNguocVeTru: (st.tieuChi6 || []).some((m) => Boolean(G6.laKhoaNguocVeTru(m))),
          trich: gopTrich(trichWcoCsv(win.hs6), anhEmTrich),
          canhBaoDuLieu,
        };
      }
    }
  }

  // Chưa chốt được -> DUNG_HOI với câu hỏi gắn điều kiện luật & ứng viên còn sống
  let ungVien = chiTiet.filter((q) => q.trangThai !== 'TRAI').map((q) => q.hs6);
  if (h4 === '8431' && b0.mayChu.nhom === '8428') {
    ungVien = ungVien.filter((x) => x === '843131' || x === '843139');
  } else if (h4 === '8431' && b0.mayChu.nhom === '8430') {
    ungVien = ungVien.filter((x) => x.startsWith('84314'));
  } else if (h4 === '7318' && coCumNorm(tenNorm, ['vit', 'bu long', 'dau luc giac'])) {
    const uu = ungVien.filter((x) => /^73181/.test(x));
    if (uu.length >= 2) ungVien = uu;
  }
  const trich = gopTrich(ungVien.slice(0, 4).map((hs6) => trichWcoCsv(hs6)));
  let phanNhomTam = null;
  let cauHoi = '';
  let chiTietCauHoi = null;

  if (h4 === '6402' && ungVien.includes('640220') && ungVien.includes('640299')) {
    phanNhomTam = '640299';
    cauHoi = 'Kiểu quai dép có đai hoặc dây gắn mũ giày với đế bằng chốt cài (6402.20.00) hay dép xốp đúc/dán mép không dùng chốt cài (tạm xếp 6402.99.90)?';
    chiTietCauHoi = {
      khoa: 'coChotCai',
      noiDung: cauHoi,
      luaChon: ['Có quai/dây gắn đế bằng chốt cài (→ 64022000)', 'Đúc liền/dán mép không chốt cài (→ 640299)'],
      dieuKienLuat: 'Phân nhóm 6402.20 vs 6402.99 (GIR 6 + chú giải WCO 6402.99/1)',
    };
  } else if (h4 === '7318') {
    cauHoi = 'Vít/bu lông thuộc nhóm 73.18 đã được cắt ren (7318.1x: vít đầu vuông, vít gỗ 7318.12, vít tự hãm 7318.14, đinh vít và bu lông khác 7318.15) hay loại không có ren (7318.2x)?';
    chiTietCauHoi = {
      khoa: 'coRen',
      noiDung: cauHoi,
      luaChon: ['Đã được cắt ren — đinh vít/bu lông khác (→ 731815)', 'Vít tự hãm có ren (→ 731814)', 'Loại không có ren (→ 73182x)'],
      dieuKienLuat: 'GIR 6 phân nhóm cấp 1 gạch & 2 gạch nhóm 73.18',
    };
  } else {
    const thieuFact = dx.thieuFacts[0] || 'boSung';
    const cauTV = (() => { try { return TV.cauHoiCho(thieuFact, 'vi'); } catch { return null; } })();
    const cauBiLechOngThep = cauTV && /ống thép/i.test(cauTV) && !/^(7304|7305|7306|7307)$/.test(h4);
    cauHoi = (cauTV && !cauBiLechOngThep)
      ? cauTV
      : `Cần bổ sung dữ kiện phân định phân nhóm 6 số trong nhóm ${cham4(h4)} giữa các ứng viên: ${ungVien.join(', ')}.`;
    chiTietCauHoi = {
      khoa: thieuFact,
      noiDung: cauHoi,
      dieuKienLuat: `GIR 6 — tiêu chí tách phân nhóm nhóm ${cham4(h4)}`,
    };
  }

  return {
    trangThai: 'DUNG_HOI',
    ungVien,
    phanNhomTam,
    cauHoi,
    chiTietCauHoi,
    quyTac: `GIR 6 (so phân nhóm cùng cấp gạch trong nhóm ${cham4(h4)}: thiếu dữ kiện → DUNG_HOI)`,
    soSanhCungCapGach: true,
    trich,
    canhBaoDuLieu,
  };
}

function xetCap6So(b0, b1, b25) {
  const nhomChot = b25.nhom || b1.nhom;
  // Nếu ở tầng B1 đã dừng hỏi giữa nhiều nhóm (hoặc chưa khoanh được nhóm 4 số)
  if (!nhomChot) {
    const dsNhom = b1.nhomUngVien || [];
    if (dsNhom.length === 0) {
      return {
        trangThai: 'BO_QUA',
        hs6: null,
        ungVien: [],
        cauHoi: b1.cauHoi || b25.cauHoi,
        tangB66: {
          tang: 'B6_6SO',
          trangThai: 'BO_QUA',
          quyTac: 'Không áp dụng GIR 6 cấp 6 số (B1 chưa khoanh vùng được nhóm 4 số)',
          ketLuan: 'BO_QUA',
          lyDo: 'B1 đang dừng hỏi vì chưa xác định được nhóm 4 số; bỏ qua B6_6SO.',
          trich: [],
        },
        canhBaoDuLieu: [],
      };
    }

    const ungVien6 = [];
    for (const h4 of dsNhom) {
      if (h4 === '8483' && coCumNorm(b0.tenNorm, ['bac truc', 'o truot', 'goi do truc'])) ungVien6.push('848330');
      else if (h4 === '8431' && b0.mayChu.nhom === '8428') ungVien6.push((b0.mayChu.phanNhom === '842810' || b0.mayChu.loai === 'van_thang') ? '843131' : '843139');
      else if (h4 === '8431' && b0.mayChu.nhom === '8427') ungVien6.push('843120');
      else if (h4 === '8431' && b0.mayChu.nhom === '8425') ungVien6.push('843110');
      else if (h4 === '8431' && b0.mayChu.nhom === '8430') ungVien6.push('843143');
      else if (h4 === '7304' && coCumNorm(b0.tenNorm, ['khong gi', 'inox'])) ungVien6.push('730441', '730449');
      else if (h4 === '7306' && coCumNorm(b0.tenNorm, ['khong gi', 'inox'])) ungVien6.push('730640');
      else {
        const pn = G6.phanNhomCuaNhom(h4);
        if (pn.length) ungVien6.push(pn[0].hs6);
      }
    }
    const cauHoi = b1.cauHoi || b25.cauHoi || 'Chưa chốt được nhóm 4 số ở B1 để xuống phân nhóm 6 số.';
    return {
      trangThai: 'DUNG_HOI',
      hs6: null,
      ungVien: ungVien6,
      cauHoi,
      tangB66: {
        tang: 'B6_6SO',
        trangThai: 'DUNG_HOI',
        quyTac: `GIR 6 (các nhánh phân nhóm 6 số [${ungVien6.join(', ')}] phụ thuộc kết quả B1 → DUNG_HOI)`,
        ketLuan: 'DUNG_HOI',
        cauHoi,
        trich: gopTrich(ungVien6.map((p) => trichWcoCsv(p))),
      },
      canhBaoDuLieu: [],
    };
  }

  const st = loadSoTay(nhomChot);
  const kq6 = st && Array.isArray(st.tieuChi6) && st.tieuChi6.length > 0
    ? danhGia6SoCoTieuChi(nhomChot, st, b0)
    : danhGia6SoKhongTieuChi(nhomChot, b0);

  return {
    trangThai: kq6.trangThai,
    hs6: kq6.hs6 || null,
    ungVien: kq6.ungVien || (kq6.hs6 ? [kq6.hs6] : []),
    phanNhomTam: kq6.phanNhomTam || null,
    cauHoi: kq6.cauHoi || null,
    chiTietCauHoi: kq6.chiTietCauHoi || null,
    soSanhCungCapGach: kq6.soSanhCungCapGach,
    khongTuRoiLoaiKhac: kq6.khongTuRoiLoaiKhac,
    coKhoaNguocVeTru: Boolean(kq6.coKhoaNguocVeTru),
    canhBaoDuLieu: kq6.canhBaoDuLieu || [],
    tangB66: {
      tang: 'B6_6SO',
      trangThai: kq6.trangThai,
      quyTac: kq6.quyTac,
      ketLuan: kq6.trangThai === 'CHOT' ? kq6.hs6 : 'DUNG_HOI',
      ...(kq6.cauHoi ? { cauHoi: kq6.cauHoi } : {}),
      ...(kq6.chiTietCauHoi ? { chiTietCauHoi: kq6.chiTietCauHoi } : {}),
      trich: kq6.trich,
    },
  };
}

// ──────────────────────────── B6_8SO: Quy tắc 6 cấp 8 số VN ────────────────────────────
function laCuaHangHoaPhanNhom(tenDong) {
  return /(?:của\s+(?:hàng\s+hóa|máy\s+khoan|máy)|thuộc\s+phân\s+nhóm)\s*.*phân\s+nhóm|^(?:-\s*)*thuộc\s+phân\s+nhóm/i.test(String(tenDong || ''));
}

function dongLaCuaPn6(pn6) {
  const goc = T.nodeOf(pn6);
  if (!goc) return [];
  const ra = [];
  const duyet = (id) => {
    const n = T.nodeOf(id);
    if (!n) return;
    if (n.cap === 8 && n.id.startsWith(pn6)) {
      ra.push(n.id);
      return;
    }
    for (const c of T.conTang(n.id)) duyet(c);
  };
  duyet(goc.id);
  return [...new Set(ra)].sort();
}

function xetCap8So(b0, b1, b66) {
  // Trường hợp B6_6SO bị BO_QUA vì B1 chưa có nhóm 4 số -> bỏ qua B6_8SO hợp lệ
  if (b66.trangThai === 'BO_QUA') {
    return {
      trangThai: 'BO_QUA',
      ma: null,
      maUngVien: [],
      cauHoi: b66.cauHoi || b1.cauHoi,
      tangB68: {
        tang: 'B6_8SO',
        trangThai: 'BO_QUA',
        quyTac: 'Không áp dụng GIR 6 cấp 8 số VN (B1/B6_6SO chưa có nhóm ứng viên)',
        ketLuan: 'BO_QUA',
        lyDo: 'Chưa xác định được nhóm 4 số và phân nhóm 6 số nên bỏ qua B6_8SO.',
        trich: [],
      },
    };
  }

  // Trường hợp B6_6SO vẫn DUNG_HOI -> tổng hợp ứng viên 8 số và giữ DUNG_HOI
  if (b66.trangThai !== 'CHOT') {
    const maUngVien = [];
    const trich = [];
    if (b66.phanNhomTam === '640299' && b66.ungVien.includes('640220')) {
      maUngVien.push('64029990', '64022000');
      trich.push(trichTax('64022000'), trichTax('64029910'), trichTax('64029920'), trichTax('64029990'));
    } else if (b1.nhomUngVien?.includes('8483') && b1.nhomUngVien?.includes('8431')) {
      const m8483 = b0.boSung.dungChoXeChuong87 === true ? '84833030' : '84833090';
      maUngVien.push(m8483);
      trich.push(trichTax('84833030'), trichTax('84833090'));
      if (b0.mayChu.nhom === '8428') {
        maUngVien.push('84313110', '84313120');
        trich.push(trichTax('84313110'), trichTax('84313120'));
      } else {
        maUngVien.push('84314300');
        trich.push(trichTax('84314300'));
        if (!b0.mayChu.phanNhom) {
          maUngVien.push('84314990');
          trich.push(trichTax('84314990'));
        }
      }
    } else {
      for (const pn6 of b66.ungVien || []) {
        const ds8 = dongLaCuaPn6(pn6);
        const mau = ds8.slice(0, 2);
        if (ds8.length > 2) mau.push(ds8[ds8.length - 1]);
        for (const h8 of mau) {
          maUngVien.push(h8);
          trich.push(trichTax(h8));
        }
      }
    }
    const cauHoi = b66.cauHoi || b1.cauHoi;
    return {
      trangThai: 'DUNG_HOI',
      ma: null,
      maTam: b66.phanNhomTam === '640299' ? '64029990' : null,
      maUngVien: [...new Set(maUngVien)].filter((m) => Boolean(taxData[m])),
      cauHoi,
      chiTietCauHoi: b66.chiTietCauHoi || b1.chiTietCauHoi,
      tangB68: {
        tang: 'B6_8SO',
        trangThai: 'DUNG_HOI',
        quyTac: b66.phanNhomTam
          ? `GIR 6 (mã tạm ${b66.phanNhomTam}90 nếu không có chốt cài/mũi bảo vệ; giữ trạng thái DUNG_HOI theo B6_6SO)`
          : 'GIR 6 cấp 8 số VN (giữ trạng thái DUNG_HOI do tầng trước chưa chốt)',
        ketLuan: 'DUNG_HOI',
        cauHoi,
        trich: gopTrich(trich),
      },
    };
  }

  const pn6 = b66.hs6;
  const dsLa = dongLaCuaPn6(pn6);

  // Trường hợp phân nhóm chỉ có 1 dòng lá 8 số (vd 64022000, 76031000, 84314300)
  if (dsLa.length === 1) {
    const hs8 = dsLa[0];
    const tenDong = taxData[hs8]?.vn || '';
    const trich = [trichTax(hs8)];

    if (laCuaHangHoaPhanNhom(tenDong)) {
      if (hs8 === '84314300') {
        const phanNhomMayMe = b0.mayChu.phanNhom;
        if (phanNhomMayMe && phanNhomMayMe !== '843041' && phanNhomMayMe !== '843049') {
          const cauHoi = `Dòng 8431.43.00 chỉ áp dụng cho máy khoan/đào sâu thuộc phân nhóm 8430.41 hoặc 8430.49, trong khi máy chủ đang là ${cham6(phanNhomMayMe)}. Cần xác nhận lại phân nhóm máy chủ.`;
          return {
            trangThai: 'DUNG_HOI',
            ma: null,
            maUngVien: ['84314300', '84314990'],
            cauHoi,
            tangB68: { tang: 'B6_8SO', trangThai: 'DUNG_HOI', quyTac: 'GIR 6 (đối chiếu phân nhóm máy chủ 8430.41/49)', ketLuan: 'DUNG_HOI', cauHoi, trich: gopTrich(trich, trichTax('84304100'), trichTax('84304990')) },
          };
        }
        if (!phanNhomMayMe) {
          const cauHoi = 'Máy khoan / đào sâu (máy chủ nhóm 84.30) có thuộc phân nhóm 8430.41 (tự hành) hoặc 8430.49 (không tự hành) để vào 8431.43.00 không?';
          return {
            trangThai: 'DUNG_HOI',
            ma: null,
            maUngVien: ['84314300', '84314990'],
            cauHoi,
            tangB68: { tang: 'B6_8SO', trangThai: 'DUNG_HOI', quyTac: 'GIR 6 (thiếu phân nhóm máy chủ 8430.41/49 → DUNG_HOI)', ketLuan: 'DUNG_HOI', cauHoi, trich: gopTrich(trich, trichTax('84304100'), trichTax('84304990')) },
          };
        }
        trich.push(trichTax('84304100'), trichTax('84304990'));
      }
    }

    return {
      trangThai: 'CHOT',
      ma: hs8,
      khongTuRoiLoaiKhac: true,
      tangB68: {
        tang: 'B6_8SO',
        trangThai: 'CHOT',
        quyTac: `GIR 6 (phân nhóm ${cham6(pn6)} tương ứng duy nhất dòng ${hs8} trong biểu thuế VN)`,
        ketLuan: hs8,
        trich: gopTrich(trich),
      },
    };
  }

  // Kiểm riêng điều kiện máy chủ cho 8503.00 (khi máy chủ là máy phát điện nhưng thiếu công suất kVA -> bắt buộc DUNG_HOI)
  if (pn6 === '850300' && b0.mayChu.loai === 'may_phat_dien' && typeof b0.boSung.congSuatKva !== 'number') {
    const cauHoi = 'Máy phát điện (máy chủ thuộc nhóm 85.01 hoặc 85.02) có công suất biểu kiến từ 12.500 kVA trở lên (8503.00.20) hay dưới 12.500 kVA (8503.00.90)?';
    return {
      trangThai: 'DUNG_HOI',
      ma: null,
      maUngVien: ['85030020', '85030090'],
      cauHoi,
      chiTietCauHoi: { khoa: 'congSuatKva', noiDung: cauHoi, luaChon: ['Từ 12.500 kVA trở lên (→ 85030020)', 'Dưới 12.500 kVA (→ 85030090)'], dieuKienLuat: 'Biểu thuế VN 8503.00.20 vs 8503.00.90' },
      tangB68: {
        tang: 'B6_8SO',
        trangThai: 'DUNG_HOI',
        quyTac: 'GIR 6 (máy chủ là máy phát điện nhưng thiếu công suất biểu kiến kVA để tách 8503.00.20 vs 8503.00.90 → DUNG_HOI)',
        ketLuan: 'DUNG_HOI',
        cauHoi,
        trich: gopTrich(trichTax('85030020'), trichTax('85030090')),
      },
    };
  }

  // Kiểm riêng 8431.20.10 ("Thuộc phân nhóm 8427.10 hoặc 8427.20") khi pn6 === '843120'
  if (pn6 === '843120' && b0.mayChu.phanNhom !== '842710' && b0.mayChu.phanNhom !== '842720' && !b0.boSung.khongPhai84271020) {
    const cauHoi = 'Xe nâng (máy chủ nhóm 84.27) có thuộc phân nhóm 8427.10 (chạy điện) hoặc 8427.20 (tự hành khác) → 8431.20.10 hay 8427.90 (→ 8431.20.90)?';
    return {
      trangThai: 'DUNG_HOI',
      ma: null,
      maUngVien: ['84312010', '84312090'],
      cauHoi,
      chiTietCauHoi: { khoa: 'phanNhomMayMe', noiDung: cauHoi, dieuKienLuat: 'Biểu thuế VN 8431.20.10 vs .90' },
      tangB68: {
        tang: 'B6_8SO',
        trangThai: 'DUNG_HOI',
        quyTac: 'GIR 6 (mẫu "Thuộc phân nhóm 8427.10 hoặc 8427.20" — thiếu phân nhóm máy chủ → DUNG_HOI)',
        ketLuan: 'DUNG_HOI',
        cauHoi,
        trich: gopTrich(trichTax('84312010'), trichTax('84312090')),
      },
    };
  }

  // Đối chiếu ranh giới 6->8 số qua lib/dieu-kien-so.js#doiChieuPhanNhom & cạnh C11 của D.bangCanh()
  const kqPn = DK.doiChieuPhanNhom(pn6, b0.duKien);
  const trichDong = dsLa.slice(0, 6).map((h) => trichTax(h));

  // Với "Bộ đồ ăn bằng nhựa melamin": không để hồ sơ 392410 (tenLoai:"melamin") tự rơi xuống 39241099 Loại khác khi tên hàng nêu rõ melamin
  if (pn6 === '392410' && coCumNorm(b0.tenNorm, ['melamin']) && kqPn.dongCo.includes('39241099') && !kqPn.dongCo.includes('39241010')) {
    const cauHoi = 'Bộ đồ ăn bằng nhựa melamin được làm từ nhựa melamin thuần (3924.10.10 - Từ melamin) hay nhựa tổng hợp khác không thuần melamin (3924.10.99)?';
    return {
      trangThai: 'DUNG_HOI',
      ma: null,
      maUngVien: ['39241010', '39241099'],
      cauHoi,
      chiTietCauHoi: { khoa: 'tenLoai', noiDung: cauHoi, luaChon: ['Từ melamin (→ 39241010)', 'Plastic khác (→ 39241099)'], dieuKienLuat: 'Biểu thuế VN 3924.10.10 vs 3924.10.99' },
      tangB68: {
        tang: 'B6_8SO',
        trangThai: 'DUNG_HOI',
        quyTac: 'GIR 6 (đối chiếu 3924.10.10 "Từ melamin" vs .99 "Loại khác" — cần xác nhận làm từ melamin → DUNG_HOI)',
        ketLuan: 'DUNG_HOI',
        cauHoi,
        trich: gopTrich(trichTax('39241010'), trichTax('39241091'), trichTax('39241099')),
      },
    };
  }

  if (kqPn.dongCo.length === 1) {
    const winHs = kqPn.dongCo[0];
    const nWin = T.nodeOf(winHs);
    // Cấm chốt vào dòng "Của hàng hóa thuộc phân nhóm X" nếu thiếu máy chủ hoặc công suất
    if (winHs === '84312010' && b0.mayChu.phanNhom !== '842710' && b0.mayChu.phanNhom !== '842720') {
      // Sẽ rơi xuống DUNG_HOI bên dưới
    } else {
      // Chốt chặn ADR-0004 §3: Cấm rơi vào "Loại khác" nếu bất kỳ anh em cùng tầng chưa có đủ dữ kiện loại trừ (MAU_THUAN)
      const anhEmChuaTrai = nWin?.loaiKhac
        ? kqPn.dong.filter((d) => d.hs !== winHs && d.ketQua !== 'MAU_THUAN')
        : [];

      if (anhEmChuaTrai.length === 0) {
        const trichChot = [trichTax(winHs)];
        if (nWin?.loaiKhac) {
          // Lấy đầy đủ toàn bộ anh em 8 số cùng parent trên cây HS + kiểm cạnh C11
          D.canhTu(winHs).filter((e) => e.loai === 'C11');
          const anhEmCungCha = T.conTang(nWin.parent).filter((id) => id !== winHs && T.nodeOf(id)?.cap === 8);
          for (const sib of anhEmCungCha) trichChot.push(trichTax(sib));
          for (const d of kqPn.dong) {
            if (d.hs !== winHs) trichChot.push(trichTax(d.hs));
          }
        }
        return {
          trangThai: 'CHOT',
          ma: winHs,
          khongTuRoiLoaiKhac: true,
          tangB68: {
            tang: 'B6_8SO',
            trangThai: 'CHOT',
            quyTac: nWin?.loaiKhac
              ? `GIR 6 (vào ${winHs} Loại khác sau khi đã loại trừ toàn bộ anh em cùng tầng tại ${cham6(pn6)})`
              : `GIR 6 (khớp điều kiện biểu thuế VN tại dòng ${winHs})`,
            ketLuan: winHs,
            trich: gopTrich(trichChot),
          },
        };
      }
    }
  }

  // Chưa chốt được một dòng 8 số duy nhất -> DUNG_HOI kèm ứng viên và câu hỏi căn cứ
  const maUngVien = kqPn.dong
    .filter((d) => d.ketQua !== 'MAU_THUAN')
    .map((d) => d.hs);
  const dsUngVien = maUngVien.length >= 2 ? maUngVien.slice(0, 6) : dsLa.slice(0, 6);

  let cauHoi = '';
  let chiTietCauHoi = null;
  let quyTac = `GIR 6 cấp 8 số VN tại ${cham6(pn6)} (thiếu dữ kiện loại trừ/phân nhánh → DUNG_HOI)`;
  let trich = trichDong;

  if (pn6 === '843131') {
    cauHoi = 'Vận thăng (máy chủ nhóm 8428.10) có thiết kế để chở người (8428.10.31 → 84313120) hay chỉ chở hàng / tời nâng kiểu gầu nâng (8428.10.39 hoặc 8428.10.40 → 84313110)?';
    chiTietCauHoi = {
      khoa: 'mayMeChoNguoi',
      noiDung: cauHoi,
      luaChon: ['Chở người (8428.10.31 → 84313120)', 'Không chở người / tời nâng kiểu gầu nâng (8428.10.39/40 → 84313110)'],
      dieuKienLuat: 'GIR 6 mẫu "Của hàng hóa thuộc phân nhóm X": phân loại máy chủ 8428.10 trước khi xuống 8431.31.10/20',
    };
    quyTac = 'GIR 6 (phân loại theo phân nhóm máy chủ 8428.10.31 vs 8428.10.39/40 — thiếu dữ kiện → DUNG_HOI)';
    trich = [trichTax('84313110'), trichTax('84313120'), trichTax('84281031'), trichTax('84281039'), trichTax('84281040')];
  } else if (pn6 === '640299') {
    cauHoi = 'Dép xốp thuộc phân nhóm 6402.99 có gắn mũi bảo vệ bằng kim loại (6402.99.10), mũi bảo vệ phi kim loại (6402.99.20) hay không có mũi bảo vệ (6402.99.90)?';
    chiTietCauHoi = {
      khoa: 'muiBaoVe',
      noiDung: cauHoi,
      luaChon: ['Không có mũi bảo vệ (→ 64029990)', 'Mũi bảo vệ kim loại (→ 64029910)', 'Mũi bảo vệ phi kim loại (→ 64029920)'],
      dieuKienLuat: 'Biểu thuế VN 6402.99.10 / .20 / .90',
    };
  } else if (pn6 === '848180') {
    const uv8481 = ['84818051', '84818059', '84818095', '84818099'].filter((m) => Boolean(taxData[m]));
    cauHoi = 'Van/vòi bằng plastic thuộc phân nhóm 8481.80 có khoang pha trộn (8481.80.51/.59) hay van nước thường, và đường kính trong cửa nạp/thoát là bao nhiêu (< 1 cm, 1–2,5 cm, hay > 2,5 cm)?';
    chiTietCauHoi = {
      khoa: 'duongKinhTrongMm',
      noiDung: cauHoi,
      dieuKienLuat: 'Biểu thuế VN phân nhóm 8481.80 (cấu tạo khoang pha trộn và đường kính trong)',
    };
    return {
      trangThai: 'DUNG_HOI',
      ma: null,
      maUngVien: uv8481,
      cauHoi,
      chiTietCauHoi,
      tangB68: {
        tang: 'B6_8SO',
        trangThai: 'DUNG_HOI',
        quyTac: 'GIR 6 cấp 8 số VN tại 8481.80 (sổ PN6 chưa duyệt hết ranh giới & thiếu đường kính trong → DUNG_HOI)',
        ketLuan: 'DUNG_HOI',
        cauHoi,
        trich: gopTrich(uv8481.map((h) => trichTax(h))),
      },
    };
  } else if (pn6 === '321290') {
    const uv3212 = ['32129011', '32129014', '32129019'];
    cauHoi = 'Chế phẩm bột/vảy kim loại phân tán trong môi trường không nước dùng sản xuất sơn (3212.90) là bột nhão nhôm (3212.90.11), loại để sản xuất sơn cho da thuộc (3212.90.14) hay loại dùng sản xuất sơn khác (3212.90.19)?';
    chiTietCauHoi = {
      khoa: 'tenLoai',
      noiDung: cauHoi,
      luaChon: ['Bột nhão nhôm (→ 32129011)', 'Sơn cho da thuộc (→ 32129014)', 'Loại phân tán sản xuất sơn khác (→ 32129019)'],
      dieuKienLuat: 'Biểu thuế VN phân nhóm 3212.90.11 / .14 / .19',
    };
    return {
      trangThai: 'DUNG_HOI',
      ma: null,
      maUngVien: uv3212,
      cauHoi,
      chiTietCauHoi,
      tangB68: {
        tang: 'B6_8SO',
        trangThai: 'DUNG_HOI',
        quyTac: 'GIR 6 cấp 8 số VN tại 3212.90 (tách bột nhão nhôm 3212.90.11, sơn cho da thuộc .14 và vảy/chế phẩm sơn khác .19 → DUNG_HOI)',
        ketLuan: 'DUNG_HOI',
        cauHoi,
        trich: gopTrich(uv3212.map((h) => trichTax(h))),
      },
    };
  } else {
    const thieuFact = kqPn.dong
      .filter((d) => d.ketQua === 'THIEU')
      .map((d) => DK.doiChieuDong8(d.hs, b0.duKien).thieu?.[0])
      .find(Boolean);
    const cauBiLech = thieuFact?.cauHoi && /ống thép/i.test(thieuFact.cauHoi) && !/^(7304|7305|7306|7307)/.test(pn6);
    cauHoi = (thieuFact?.cauHoi && !cauBiLech)
      ? thieuFact.cauHoi
      : `Cần bổ sung dữ kiện phân biệt các dòng 8 số trong phân nhóm ${cham6(pn6)}: ${dsUngVien.join(', ')}.`;
    chiTietCauHoi = {
      khoa: thieuFact?.fact || 'boSung',
      noiDung: cauHoi,
      dieuKienLuat: `GIR 6 cấp 8 số VN tại ${cham6(pn6)}`,
    };
  }

  return {
    trangThai: 'DUNG_HOI',
    ma: null,
    maUngVien: dsUngVien,
    cauHoi,
    chiTietCauHoi,
    tangB68: {
      tang: 'B6_8SO',
      trangThai: 'DUNG_HOI',
      quyTac,
      ketLuan: 'DUNG_HOI',
      cauHoi,
      trich: gopTrich(trich),
    },
  };
}

// ──────────────────────────── Cổng tự kiểm ADR-0004 §3 ────────────────────────────
/**
 * Cổng tự kiểm định đầu ra theo đủ 7 điều kiện báo đỏ của ADR-0004 §3.
 * @param {object} ketQuaFull Kết quả trả về từ phanLoaiTheoTrinhTu()
 * @returns {{dat: boolean, viPham: Array<{ma: string, tang?: string, chiTiet: string}>, daKiem: string[]}}
 */
function kiemDinhADR0004(ketQuaFull) {
  const viPham = [];
  const daKiem = [];
  const ghi = (ma, dieuKien, chiTiet, tang) => {
    daKiem.push(ma);
    if (!dieuKien) viPham.push({ ma, ...(tang ? { tang } : {}), chiTiet });
  };

  if (!ketQuaFull || typeof ketQuaFull !== 'object') {
    return { dat: false, viPham: [{ ma: 'DAU_VAO_RONG', chiTiet: 'Kết quả không hợp lệ.' }], daKiem };
  }

  const cacTang = Array.isArray(ketQuaFull.cacTang) ? ketQuaFull.cacTang : [];
  const vetXet = Array.isArray(ketQuaFull.vetXet) ? ketQuaFull.vetXet : [];
  const kq = ketQuaFull.ketQua || {};

  // Cổng 1 (ADR-0004 §3): Không nhảy cóc tầng & mọi tầng hoạt động đều có quyTac + trích nguyên văn
  const thuTuThat = cacTang.map((t) => t?.tang);
  ghi(
    'KHONG_NHAY_COC_TANG',
    JSON.stringify(thuTuThat) === JSON.stringify(TRINH_TU_TANG),
    `Thứ tự tầng phải là [${TRINH_TU_TANG.join(' -> ')}], thực tế là [${thuTuThat.join(' -> ')}].`,
  );

  for (const t of cacTang) {
    if (!t) continue;
    const boQua = t.trangThai === 'BO_QUA' || t.ketLuan === 'BO_QUA';
    if (!boQua) {
      ghi(
        `TRICH_VA_QUY_TAC_${t.tang}`,
        typeof t.quyTac === 'string' && t.quyTac.trim().length > 0 && Array.isArray(t.trich) && t.trich.length > 0,
        `Tầng ${t.tang} thiếu quyTac hoặc trich[] nguyên văn.`,
        t.tang,
      );
      for (const tr of t.trich || []) {
        const err = kiemTraTrichHopLe(tr);
        if (err) {
          viPham.push({ ma: 'TRICH_KHONG_HOP_LE', tang: t.tang, chiTiet: `Trích dẫn lỗi ở ${t.tang}: ${err}` });
        }
      }
      if (t.trangThai === 'DUNG_HOI' || t.ketLuan === 'DUNG_HOI') {
        ghi(
          `DUNG_HOI_CO_CAU_HOI_${t.tang}`,
          typeof t.cauHoi === 'string' && t.cauHoi.trim().length > 5,
          `Tầng ${t.tang} dừng hỏi nhưng thiếu câu hỏi.`,
          t.tang,
        );
      }
    }
  }

  // Cổng 4 (ADR-0004 §3): Mã thuộc Phần XV / Chương 73 mà chưa soát Chú giải 1(f) Phần XV và Chú giải 2 Phần XVI
  const tangB1 = cacTang.find((t) => t?.tang === 'B1');
  const tangB25 = cacTang.find((t) => t?.tang === 'B2_B5');
  const tangB66 = cacTang.find((t) => t?.tang === 'B6_6SO');
  const tangB68 = cacTang.find((t) => t?.tang === 'B6_8SO');
  const buocB0Vet = vetXet.find((v) => v?.buoc === 'B0');
  const buocB1Vet = vetXet.find((v) => v?.buoc === 'B1');
  const buocB66 = vetXet.find((v) => v?.buoc === 'B6_6SO');
  const buocB68 = vetXet.find((v) => v?.buoc === 'B6_8SO');
  const nhomCuoi = chu(kq.nhom || (kq.ma ? kq.ma.slice(0, 4) : ''));
  const tapKiemPhanXV = [
    nhomCuoi,
    kq.ma,
    kq.maTam,
    ...(Array.isArray(kq.nhomUngVien) ? kq.nhomUngVien : []),
    ...(Array.isArray(kq.maUngVien) ? kq.maUngVien : []),
  ]
    .map((x) => so(x).slice(0, 4))
    .filter((x) => /^(72|73|74|75|76|78|79|80|81|82|83)/.test(x));
  if (tapKiemPhanXV.length > 0) {
    const trichB1 = tangB1?.trich || [];
    const soat1f = Boolean(buocB1Vet?.daSoat?.chuGiai1fPhanXV)
      && trichB1.some((x) => x.tep === 'data/chu-giai-chuong.json' && /^(72|73|74|75|76|78|79|80|81|82|83)\.phan$/.test(x.khoa) && /\(f\)|Phần XVI/i.test(x.nguyenVan));
    // Không cho qua bằng chuỗi quyTac: bắt buộc có trích dẫn thật 84.phan / 85.phan trong B1.trich
    const soatCG2 = Boolean(buocB1Vet?.daSoat?.chuGiai2PhanXVI)
      && trichB1.some((x) => x.tep === 'data/chu-giai-chuong.json' && /^(84|85)\.phan$/.test(x.khoa) && /2\.\s*Theo Chú giải 1|\(g\)\s*Các bộ phận có công dụng chung/i.test(x.nguyenVan));
    ghi(
      'SOAT_LOAI_TRU_PHAN_XV_XVI',
      soat1f && soatCG2,
      `Mã/ứng viên thuộc Phần XV / Chương 73 (${[...new Set(tapKiemPhanXV)].join(', ')}) nhưng B1.trich chưa có đủ trích dẫn thật Chú giải 1(f) Phần XV và Chú giải 2 Phần XVI (84/85.phan).`,
      'B1',
    );
  }

  // Cổng 2 (ADR-0004 §3): Không viện dẫn Quy tắc 3 (B2_B5) khi B1 đã chốt hoặc DUNG_HOI; khi dùng B2_B5 phải có lyDo
  if (tangB1 && tangB25) {
    const b1ChotHoacHoi = tangB1.trangThai === 'CHOT' || tangB1.trangThai === 'DUNG_HOI';
    const b25BoQua = tangB25.trangThai === 'BO_QUA' || tangB25.ketLuan === 'BO_QUA';
    const b25VienDanQT3 = /quy tắc 3|gir 3/i.test(tangB25.quyTac || '');
    if (b1ChotHoacHoi) {
      ghi(
        'KHONG_VIEN_DAN_QT3_KHI_B1_DA_QUYET',
        b25BoQua && !b25VienDanQT3,
        'B1 đã chốt hoặc dừng hỏi nhưng B2_B5 lại không BO_QUA hoặc vẫn viện dẫn Quy tắc 3.',
        'B2_B5',
      );
    }
    ghi(
      'B2_B5_CO_LY_DO',
      typeof tangB25.lyDo === 'string' && tangB25.lyDo.trim().length >= 10,
      'Tầng B2_B5 thiếu lyDo giải thích vì sao dùng hoặc bỏ qua.',
      'B2_B5',
    );
  }

  // Cổng 6a (ADR-0004 §3): Chỉ so sánh phân nhóm cùng cấp gạch ngang (kiểm thật trên cây HS)
  let cungCapGachThuc = buocB66?.soSanhCungCapGach !== false;
  if (cungCapGachThuc && tangB66 && tangB66.trangThai === 'CHOT') {
    const ds6 = (tangB66.trich || [])
      .filter((tr) => tr.tep === 'data/wco-hs-international.csv' && /^\d{6}$/.test(tr.khoa))
      .map((tr) => T.nodeOf(tr.khoa))
      .filter(Boolean);
    if (ds6.length >= 2) {
      const depths = new Set(ds6.map((n) => n.depth));
      const parents = new Set(ds6.map((n) => n.parent));
      if (depths.size > 1 || (ds6[0].depth >= 2 && parents.size > 1)) {
        cungCapGachThuc = false;
      }
    }
  }
  ghi(
    'SO_SANH_CUNG_CAP_GACH',
    cungCapGachThuc,
    'Tầng B6_6SO trộn phân nhóm khác cấp gạch ngang hoặc khác nhánh cha trên cây HS.',
    'B6_6SO',
  );

  // Cổng 6b (ADR-0004 §3): Điều kiện không rộng hơn hoặc hẹp hơn chữ luật
  const khongCoCoLech = buocB66?.dieuKienLechChuLuat !== true && buocB68?.dieuKienLechChuLuat !== true;
  let khopChuLuatDauRa = true;
  let lyDoLechLuat = 'Điều kiện đối chiếu rộng hơn hoặc hẹp hơn chữ luật.';
  if (kq.trangThai === 'CHOT') {
    const pnKyVong = chu(kq.phanNhom || String(kq.ma || '').slice(0, 6));
    const coTrich6 = !tangB66 || tangB66.trangThai === 'BO_QUA'
      || (tangB66.trich || []).some((tr) => tr.tep === 'data/wco-hs-international.csv' && tr.khoa === pnKyVong);
    const coTrich8 = Boolean(tangB68 && (tangB68.trich || []).some((tr) => tr.tep === 'data/tax.json' && tr.khoa === `${kq.ma}.vn`));
    if (!coTrich6 || !coTrich8) {
      khopChuLuatDauRa = false;
      lyDoLechLuat = 'Mã chốt thiếu đoạn trích chữ luật tương ứng (wco-hs-international.csv <6d> hoặc tax.json <8d>.vn).';
    }
    if (khopChuLuatDauRa && buocB0Vet?.chatLieu) {
      const cl = buocB0Vet.chatLieu;
      const clHop = kiemNhomHopChatLieu(nhomCuoi, cl)
        && !(nhomCuoi === '3924' && cl !== 'plastic')
        && !(nhomCuoi === '6403' && cl !== 'da thuộc');
      if (!clHop) {
        khopChuLuatDauRa = false;
        lyDoLechLuat = `Chất liệu (${cl}) trái với yêu cầu chữ luật của nhóm ${nhomCuoi} (rộng hơn chữ luật).`;
      }
    }
    const tenDong8 = taxData[kq.ma]?.vn || '';
    if (khopChuLuatDauRa && laCuaHangHoaPhanNhom(tenDong8)) {
      const mayChu = buocB0Vet?.mayChu;
      if (!mayChu || mayChu.khongRo || (!mayChu.nhom && !mayChu.phanNhom && !mayChu.loai)) {
        khopChuLuatDauRa = false;
        lyDoLechLuat = `Dòng ${kq.ma} là mẫu "Của/Thuộc phân nhóm X" nhưng B0 chưa xác định máy chủ hợp lệ (rộng hơn chữ luật).`;
      } else if (kq.ma === '84314300' && mayChu.phanNhom !== '843041' && mayChu.phanNhom !== '843049') {
        khopChuLuatDauRa = false;
        lyDoLechLuat = `Dòng 84314300 đòi hỏi phân nhóm máy chủ 8430.41 hoặc 8430.49 (hiện tại: ${mayChu.phanNhom || 'chưa rõ'}).`;
      } else if (kq.ma === '84312010' && mayChu.phanNhom !== '842710' && mayChu.phanNhom !== '842720') {
        khopChuLuatDauRa = false;
        lyDoLechLuat = `Dòng 84312010 đòi hỏi phân nhóm máy chủ 8427.10 hoặc 8427.20 (hiện tại: ${mayChu.phanNhom || 'chưa rõ'}).`;
      } else if ((kq.ma === '84313110' || kq.ma === '84313120') && (mayChu.nhom !== '8428' || (mayChu.choNguoi === null && !['84281031', '84281039', '84281040'].includes(mayChu.ma8)))) {
        khopChuLuatDauRa = false;
        lyDoLechLuat = `Dòng ${kq.ma} đòi hỏi phân định rõ máy chủ 8428.10.31 vs .39/.40.`;
      }
    }
    if (khopChuLuatDauRa && kq.ma === '85030020') {
      const mc = buocB0Vet?.mayChu;
      if (mc?.loai !== 'may_phat_dien' || typeof mc?.congSuatKva !== 'number' || mc.congSuatKva < 12500) {
        khopChuLuatDauRa = false;
        lyDoLechLuat = 'Dòng 85030020 đòi hỏi máy phát điện công suất biểu kiến từ 12.500 kVA trở lên.';
      }
    }
  }
  ghi(
    'DIEU_KIEN_KHONG_LECH_CHU_LUAT',
    khongCoCoLech && khopChuLuatDauRa,
    lyDoLechLuat,
    kq.trangThai === 'CHOT' ? 'B6_8SO' : undefined,
  );

  // Cổng 7 (ADR-0004 §3): Chốt mã khi thiếu dữ kiện thay vì dừng hỏi; không tự rơi vào "Loại khác"
  if (kq.trangThai === 'DUNG_HOI') {
    const laHoiMoTaBanDau = kq.chiTietCauHoi?.khoa === 'tenHang'
      || kq.chiTietCauHoi?.khoa === 'moTaChiTiet'
      || tangB1?.chiTietCauHoi?.khoa === 'tenHang'
      || tangB1?.chiTietCauHoi?.khoa === 'moTaChiTiet';
    const coUngVien = laHoiMoTaBanDau
      || (Array.isArray(kq.maUngVien) && kq.maUngVien.length >= 2)
      || (Array.isArray(kq.nhomUngVien) && kq.nhomUngVien.length >= 2);
    ghi(
      'DUNG_HOI_HOP_LE',
      !kq.ma && typeof kq.cauHoi === 'string' && kq.cauHoi.trim().length > 10 && coUngVien,
      'Kết quả DUNG_HOI thiếu câu hỏi hợp lệ hoặc thiếu danh sách ứng viên (>= 2) hoặc lại chốt mã.',
    );
  } else if (kq.trangThai === 'CHOT') {
    const maHopLe = /^\d{8}$/.test(String(kq.ma || '')) && Boolean(taxData[kq.ma]);
    const khongConTangHoi = cacTang.every((t) => t.trangThai !== 'DUNG_HOI' && t.ketLuan !== 'DUNG_HOI');
    const n8 = T.nodeOf(kq.ma);
    let duTrichAnhEmLoaiKhac = true;
    if (n8?.loaiKhac) {
      const anhEm = T.conTang(n8.parent).filter((id) => T.nodeOf(id)?.cap === 8);
      const khoaCo = new Set((tangB68?.trich || []).filter((tr) => tr.tep === 'data/tax.json').map((tr) => tr.khoa));
      duTrichAnhEmLoaiKhac = anhEm.every((id) => khoaCo.has(`${id}.vn`));
    }
    ghi(
      'CHOT_MA_DU_DU_KIEN',
      maHopLe
        && khongConTangHoi
        && duTrichAnhEmLoaiKhac
        && buocB66?.conDuKienThieu !== true
        && buocB68?.conDuKienThieu !== true
        && buocB66?.khongTuRoiLoaiKhac !== false
        && buocB68?.khongTuRoiLoaiKhac !== false,
      'Chốt mã khi điều kiện luật còn thiếu dữ kiện, còn tầng đang DUNG_HOI, hoặc rơi vào "Loại khác" khi B6_8SO.trich chưa chứng minh loại trừ đủ anh em cùng tầng.',
    );
  } else {
    ghi('TRANG_THAI_HOP_LE', false, `Trạng thái kết quả không hợp lệ: ${kq.trangThai}`);
  }

  // Cổng 3 (ADR-0004 §3): Không dùng tiền lệ làm căn cứ chọn mã (tiền lệ chỉ chạy bước cuối để kiểm chứng)
  const idxB68 = vetXet.findIndex((v) => v?.buoc === 'B6_8SO');
  const idxTL = vetXet.findIndex((v) => v?.buoc === 'KIEM_CHUNG_TIEN_LE');
  const tangDungGir4 = cacTang.some((t) => /gir\s*4|tiền\s*lệ\s*quyết/i.test(t?.quyTac || ''));
  ghi(
    'TIEN_LE_CHI_KIEM_CHUNG_CUOI',
    idxB68 >= 0
      && idxTL > idxB68
      && ketQuaFull.kiemChungTienLe?.anhHuongChotMa === false
      && ketQuaFull.kiemChungTienLe?.vaiTro === 'KIEM_CHUNG_CUOI'
      && !tangDungGir4,
    'Tiền lệ phải chạy sau B6_8SO và không được làm căn cứ chọn/đổi mã.',
  );

  // Cổng 5 (ADR-0004 §3): Điều kiện không đảo ngược vế "trừ / nhưng không" (cổng KHOA_NGUOC_VE_TRU)
  const cacNhomKiem = [...new Set([
    nhomCuoi,
    ...(Array.isArray(kq.nhomUngVien) ? kq.nhomUngVien : []),
  ].filter((h) => /^\d{4}$/.test(chu(h))))];
  const coDaoVeTru = buocB66?.coKhoaNguocVeTru === true
    || cacNhomKiem.some((h4) => (loadSoTay(h4)?.tieuChi6 || []).some((m) => Boolean(G6.laKhoaNguocVeTru(m))));
  ghi(
    'KHONG_DAO_NGUOC_VE_TRU',
    !coDaoVeTru,
    `Phát hiện điều kiện đảo ngược vế loại trừ (KHOA_NGUOC_VE_TRU) ở nhóm ${cacNhomKiem.join(', ') || '(không rõ)'}.`,
    'B6_6SO',
  );

  return { dat: viPham.length === 0, viPham, daKiem };
}

// ──────────────────────────── Hàm chính: phanLoaiTheoTrinhTu ────────────────────────────
/**
 * Phân loại hàng hóa tất định theo đúng trình tự 6 Quy tắc (ADR-0004):
 * B0 (Bản chất & máy chủ) -> B1 (GIR 1) -> B2_B5 (nếu B1 chưa đủ) -> B6_6SO -> B6_8SO -> Kiểm chứng tiền lệ cuối.
 * @param {object} [dauVao]
 * @param {string} [dauVao.tenHang] Tên/mô tả hàng hóa
 * @param {object} [dauVao.boSung] Dữ kiện bổ sung / câu trả lời cho các câu hỏi rẽ nhánh
 * @param {Array}  [dauVao.duKien] Danh sách dữ kiện có kiểu theo chuẩn lib/dieu-kien-so.js
 * @param {object} [opts]
 * @param {boolean} [opts.kiemChungTienLe=true] Có chạy tienLeUngHo ở bước cuối để kiểm chứng không
 * @returns {Promise<object>}
 */
async function phanLoaiTheoTrinhTu(dauVao = {}, opts = {}) {
  const vetXet = [];

  // Tầng B0
  const b0 = phanTichBanChatVaMayChu(dauVao);
  vetXet.push({
    buoc: 'B0',
    phamVi: b0.phamVi,
    chatLieu: b0.chatLieu || null,
    mayChu: {
      khongRo: b0.mayChu.khongRo,
      nhom: b0.mayChu.nhom,
      phanNhom: b0.mayChu.phanNhom,
      ma8: b0.mayChu.ma8,
      loai: b0.mayChu.loai,
      choNguoi: b0.mayChu.choNguoi ?? null,
      congSuatKva: typeof b0.boSung.congSuatKva === 'number' ? b0.boSung.congSuatKva : null,
    },
  });

  // Tầng B1
  const b1 = xetQuyTac1(b0);
  vetXet.push({
    buoc: 'B1',
    trangThai: b1.trangThai,
    nhom: b1.nhom || null,
    nhomUngVien: b1.nhomUngVien || null,
    daSoat: b1.daSoat,
  });

  // Tầng B2–B5
  const b25 = xetQuyTac2Den5(b0, b1);
  vetXet.push({
    buoc: 'B2_B5',
    trangThai: b25.trangThai,
    nhom: b25.nhom || null,
  });

  // Tầng B6 cấp 6 số
  const b66 = xetCap6So(b0, b1, b25);
  vetXet.push({
    buoc: 'B6_6SO',
    trangThai: b66.trangThai,
    hs6: b66.hs6 || null,
    ungVien: b66.ungVien,
    soSanhCungCapGach: b66.soSanhCungCapGach !== false,
    khongTuRoiLoaiKhac: b66.khongTuRoiLoaiKhac !== false,
    coKhoaNguocVeTru: Boolean(b66.coKhoaNguocVeTru),
  });

  // Tầng B6 cấp 8 số VN
  const b68 = xetCap8So(b0, b1, b66);
  vetXet.push({
    buoc: 'B6_8SO',
    trangThai: b68.trangThai,
    ma: b68.ma || null,
    maUngVien: b68.maUngVien || null,
    khongTuRoiLoaiKhac: b68.khongTuRoiLoaiKhac !== false,
  });

  const nhomChot = b25.nhom || b1.nhom || null;
  const dieuKienKemTheo = b1.dieuKienKemTheo
    || (b68.ma === '85030090' && coCumNorm(b0.tenNorm, ['gia do choi than', 'bo phan giu choi than', 'khung giu choi than'])
      ? 'Áp dụng mặc định cho động cơ điện hoặc máy phát điện công suất dưới 12.500 kVA; nếu dùng cho máy phát điện có công suất biểu kiến ≥ 12.500 kVA thì thuộc 8503.00.20.'
      : null);
  const ketQua = b68.trangThai === 'CHOT'
    ? {
      trangThai: 'CHOT',
      ma: b68.ma,
      nhom: nhomChot || b68.ma.slice(0, 4),
      phanNhom: b66.hs6 || b68.ma.slice(0, 6),
      ...(dieuKienKemTheo ? { dieuKienKemTheo } : {}),
    }
    : {
      trangThai: 'DUNG_HOI',
      ma: null,
      ...(b68.maTam ? { maTam: b68.maTam } : {}),
      maUngVien: b68.maUngVien || [],
      ...(nhomChot ? { nhom: nhomChot } : { nhomUngVien: b1.nhomUngVien || [] }),
      ...(b66.hs6 ? { phanNhom: b66.hs6 } : b66.phanNhomTam ? { phanNhomTam: b66.phanNhomTam } : {}),
      cauHoi: b68.cauHoi || b66.cauHoi || b1.cauHoi,
      ...((b68.chiTietCauHoi || b66.chiTietCauHoi || b1.chiTietCauHoi)
        ? { chiTietCauHoi: b68.chiTietCauHoi || b66.chiTietCauHoi || b1.chiTietCauHoi }
        : {}),
    };

  // Bước cuối: Kiểm chứng tiền lệ (KHÔNG bao giờ quyết mã)
  const maKiem = ketQua.ma || ketQua.maTam || ketQua.maUngVien?.[0] || ketQua.nhom || null;
  let kiemChungTienLe;
  if (opts.kiemChungTienLe === false) {
    kiemChungTienLe = { trangThai: 'CHUA_KIEM', lyDo: 'bo-qua-theo-tuy-chon', vaiTro: 'KIEM_CHUNG_CUOI', anhHuongChotMa: false, maDuocKiem: maKiem };
  } else if (maKiem && b0.tenHang.length >= 3) {
    const tl = await tienLeUngHo(b0.tenHang, maKiem);
    const lech = tl.trangThai === 'DA_KIEM' && (tl.ungHo === false || (tl.biPhanDoi || []).length > 0);
    kiemChungTienLe = {
      ...tl,
      vaiTro: 'KIEM_CHUNG_CUOI',
      anhHuongChotMa: false,
      maDuocKiem: maKiem,
      ...(ketQua.trangThai !== 'CHOT' ? { chiKiemChungKhongQuyetMa: true } : {}),
      canhBaoLechLuat: lech
        ? 'Tiền lệ (tờ khai/thông báo) có mã khác chuỗi luật — giữ kết quả theo luật, không đi theo tiền lệ (ADR-0004 §1).'
        : null,
    };
  } else {
    kiemChungTienLe = { trangThai: 'CHUA_KIEM', lyDo: 'chua-du-ma-hoac-mo-ta', vaiTro: 'KIEM_CHUNG_CUOI', anhHuongChotMa: false, maDuocKiem: maKiem };
  }

  vetXet.push({
    buoc: 'KIEM_CHUNG_TIEN_LE',
    trangThai: kiemChungTienLe.trangThai,
    maDuocKiem: maKiem,
    ungHo: kiemChungTienLe.ungHo ?? null,
    anhHuongChotMa: false,
  });

  const cacTang = [b0.tangB0, b1.tangB1, b25.tangB25, b66.tangB66, b68.tangB68];
  const canhBaoDuLieu = [...b1.canhBaoDuLieu, ...(b66.canhBaoDuLieu || [])];

  const ketQuaFull = {
    phienBan: PHIEN_BAN,
    dauVao: { tenHang: b0.tenHang, boSung: b0.boSung },
    ketQua,
    cacTang,
    kiemChungTienLe,
    canhBaoDuLieu,
    vetXet,
  };
  ketQuaFull.congKiemDinhADR0004 = kiemDinhADR0004(ketQuaFull);
  return ketQuaFull;
}

module.exports = {
  PHIEN_BAN,
  TRINH_TU_TANG,
  phanLoaiTheoTrinhTu,
  kiemDinhADR0004,
  kiemTraTrichHopLe,
  datLaiCache,
};
