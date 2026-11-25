// lib/tim-luat.js — M-41 (#1917): Tìm CHỮ trên câu luật thuộc 6 kho luật gốc (phan, chuong, nhom, phan-nhom, sen, bieu).
//
// Ranh giới bắt buộc (QT chốt trên #1917):
// - Chỉ tìm trên 6 kho gốc: phan, chuong, nhom, phan-nhom, sen, bieu.
// - KHÔNG đụng tiền lệ (lop TIEN_LE / tb:*), KHÔNG wco, KHÔNG tờ khai, KHÔNG từ điển tên thương mại, KHÔNG hs-tree, KHÔNG LLM.
// - Trả về nút + câu nhắc + câu dẫn (dan) + lớp + chiều ('LOAI' | 'NHAC') + đường đi tiếp (id gọi phaiDoc).
// - Không trả mã 8 số như kết luận. Không có câu nào nhắc thì trả rỗng và nói rỗng, không đoán.
// - Để sẵn chỗ cắm tìm nghĩa (`timNghia`) cho M-37, mặc định CHUA_CAM.
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const THU_MUC_MAC_DINH = path.join(__dirname, '..', 'data', 'luat-goc');
const KHO_DUOC_TIM = Object.freeze(['phan', 'chuong', 'nhom', 'phan-nhom', 'sen', 'bieu']);

const THU_TU_LOP = Object.freeze({
  LUAT: 0,
  HUONG_DAN: 1,
});

const THU_TU_KHO = Object.freeze({
  phan: 0,
  chuong: 1,
  bieu: 2,
  nhom: 3,
  'phan-nhom': 4,
  sen: 5,
});

const RE_DAN_LOAI = /(?:không\s+bao\s+gồm|loại\s+trừ|không\s+áp\s+dụng|ngoại\s+trừ|trừ\s+(?:các\s+)?(?:loại|mặt\s+hàng|sản\s+phẩm|trường\s+hợp)?\s*[:;]|không\s+thuộc\s+(?:nhóm|chương|phần|phân\s+nhóm)\s+này)/iu;
const RE_DAU_CAU_LOAI = /(?:^|(?<![\p{L}\p{N}])(?:phần|chương|nhóm|phân\s+nhóm)\s+này\s+)(?:không\s+bao\s+gồm|loại\s+trừ|không\s+áp\s+dụng)/iu;

const CACHE_CHI_MUC = new Map();

function chuanChu(s) {
  return String(s || '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function boDau(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .normalize('NFC');
}

function tachTu(s) {
  return s ? s.split(' ').filter(Boolean) : [];
}

function docDongJsonl(tep) {
  if (!fs.existsSync(tep)) return [];
  return fs.readFileSync(tep, 'utf8').split('\n').filter((l) => l.trim());
}

/**
 * Xác định chiều tạm theo câu dẫn (`CAU_DAN`, để chỗ nhận `nghia-canh` M-33 thay vào):
 * - 'LOAI' nếu nằm dưới câu dẫn (`dan` hoặc chuỗi cha tối đa 3 bậc) mang ý loại trừ,
 *   hoặc bản thân câu mở đầu bằng mệnh đề loại trừ ("Nhóm này không bao gồm...").
 * - 'NHAC' cho mọi trường hợp còn lại (chữ "trừ" trong ngoặc chỉ loại phần trong ngoặc, không loại cả câu).
 */
function xacDinhChieu(cauGoc, dsDanCau = []) {
  for (const danCau of dsDanCau) {
    if (danCau && RE_DAN_LOAI.test(danCau)) return 'LOAI';
  }
  const s = String(cauGoc || '').trim();
  if (RE_DAU_CAU_LOAI.test(s)) return 'LOAI';
  return 'NHAC';
}

function napChiMuc(thuMuc = THU_MUC_MAC_DINH) {
  const dir = path.resolve(thuMuc || THU_MUC_MAC_DINH);
  if (CACHE_CHI_MUC.has(dir)) return CACHE_CHI_MUC.get(dir);

  const cauGocTheoId = new Map();
  const danTheoCauId = new Map();
  const banGhi = [];

  for (const tenKho of KHO_DUOC_TIM) {
    const tepKho = path.join(dir, `${tenKho}.jsonl`);
    const dongNut = docDongJsonl(tepKho);
    if (!dongNut.length) continue;

    const nutTheoId = new Map();
    const dongHopLe = [];
    for (const l of dongNut) {
      let obj;
      try {
        obj = JSON.parse(l);
      } catch {
        continue;
      }
      if (!obj || !obj.id) continue;
      if (obj.lop === 'TIEN_LE' || String(obj.id).startsWith('tb:')) continue;
      nutTheoId.set(obj.id, obj);
      dongHopLe.push(l);
    }
    if (!dongHopLe.length) continue;

    const tepCau = path.join(dir, 'cau', `${tenKho}.jsonl`);
    if (!fs.existsSync(tepCau)) {
      throw new Error(`Thiếu tệp kho câu ${tepCau} cho kho ${tenKho}.jsonl (lib/tim-luat.js chỉ đọc kho câu sẵn, không tự tách).`);
    }
    const dsCau = docDongJsonl(tepCau).map((l) => JSON.parse(l));

    for (const c of dsCau) {
      if (!c || !c.id) continue;
      const hashIdx = c.id.lastIndexOf('#');
      if (hashIdx <= 0) continue;
      const nutId = c.id.slice(0, hashIdx);
      const nut = nutTheoId.get(nutId);
      if (!nut) continue;

      const nguyenVan = typeof nut.nguyenVan === 'string' ? nut.nguyenVan : '';
      const rawSlice = nguyenVan.slice(c.tu, c.den).replace(/\s+/g, ' ').trim();
      cauGocTheoId.set(c.id, rawSlice);
      if (c.dan) danTheoCauId.set(c.id, c.dan);

      if (!rawSlice) continue;
      const chuan = chuanChu(rawSlice);
      if (!chuan) continue;
      const khongDau = boDau(chuan);

      banGhi.push({
        kho: tenKho,
        nutId: nut.id,
        lop: nut.lop || 'LUAT',
        trang: nut.nguon?.trang ?? null,
        cauId: c.id,
        danId: c.dan || null,
        cauGoc: rawSlice,
        chuanPadded: ` ${chuan} `,
        khongDauPadded: ` ${khongDau} `,
        tapTuChuan: new Set(tachTu(chuan)),
        tapTuKhongDau: new Set(tachTu(khongDau)),
      });
    }
  }

  for (const r of banGhi) {
    const dsDan = [];
    let cur = r.danId;
    for (let hop = 0; hop < 3 && cur; hop += 1) {
      const text = cauGocTheoId.get(cur) || null;
      if (text) dsDan.push(text);
      cur = danTheoCauId.get(cur) || null;
    }
    r.danCau = r.danId ? cauGocTheoId.get(r.danId) || null : null;
    r.dsDanCau = dsDan;
  }

  const chiMuc = { dir, banGhi, tongCau: banGhi.length };
  CACHE_CHI_MUC.set(dir, chiMuc);
  return chiMuc;
}

function khopCau(r, qChuan, qKhongDau, tuChuan, tuKhongDau) {
  if (r.chuanPadded.includes(` ${qChuan} `)) {
    return { diem: 4, kieuKhop: 'CUM_CHUAN' };
  }
  if (r.khongDauPadded.includes(` ${qKhongDau} `)) {
    return { diem: 3, kieuKhop: 'CUM_KHONG_DAU' };
  }
  if (tuChuan.length >= 2 && tuChuan.every((t) => r.tapTuChuan.has(t))) {
    return { diem: 2, kieuKhop: 'DU_TU_CHUAN' };
  }
  if (tuKhongDau.length >= 2 && tuKhongDau.every((t) => r.tapTuKhongDau.has(t))) {
    return { diem: 1, kieuKhop: 'DU_TU_KHONG_DAU' };
  }
  return null;
}

function dinhDangTimNghia(q, { thuMuc, limit, timNghia }) {
  if (typeof timNghia !== 'function') {
    return {
      trangThai: 'CHUA_CAM',
      choCam: 'M-37',
      ghiChu: 'Chỗ cắm tìm nghĩa cho M-37 (chưa làm); hiện chỉ tìm chữ trên 6 kho luật gốc.',
    };
  }
  const ketQua = timNghia(q, { thuMuc, limit });
  return {
    trangThai: 'DA_CAM',
    choCam: 'M-37',
    ketQua: Array.isArray(ketQua) ? ketQua : [],
  };
}

/**
 * Tìm nút luật có câu nhắc tới hàng từ 6 kho luật gốc (phan, chuong, nhom, phan-nhom, sen, bieu).
 * - `timNghia`: chỗ cắm tìm nghĩa cho M-37 (mặc định CHUA_CAM).
 * - `nghiaCanh`: chỗ cắm lấy chiều từ M-33 (mặc định tính qua `CAU_DAN`).
 */
function timLuat(q, { thuMuc = THU_MUC_MAC_DINH, limit = 20, timNghia = null, nghiaCanh = null } = {}) {
  const tuKhoa = String(q || '').trim();
  const gioHan = Math.min(Math.max(Number.parseInt(limit, 10) || 20, 1), 50);
  const qChuan = chuanChu(tuKhoa);
  const timNghiaInfo = dinhDangTimNghia(tuKhoa, { thuMuc, limit: gioHan, timNghia });

  if (qChuan.length < 2) {
    return {
      cheDo: 'luat',
      tuKhoa,
      tong: 0,
      traVe: 0,
      khoTim: [...KHO_DUOC_TIM],
      cuaVao: [],
      rong: true,
      thongBao: 'Từ khóa tìm kiếm quá ngắn; trả rỗng và không đoán.',
      luuY: 'Chỉ trả nút luật có câu nhắc tới hàng làm cửa vào gọi phaiDoc; không kết luận mã 8 số.',
      timNghia: timNghiaInfo,
    };
  }

  const chiMuc = napChiMuc(thuMuc);
  const qKhongDau = boDau(qChuan);
  const tuChuan = [...new Set(tachTu(qChuan))];
  const tuKhongDau = [...new Set(tachTu(qKhongDau))];

  const trung = [];
  for (const r of chiMuc.banGhi) {
    const k = khopCau(r, qChuan, qKhongDau, tuChuan, tuKhongDau);
    if (!k) continue;
    let chieu = null;
    let chieuCachLay = 'CAU_DAN';
    if (typeof nghiaCanh === 'function') {
      const kqCanh = nghiaCanh({
        nut: r.nutId,
        cauId: r.cauId,
        cau: r.cauGoc,
        dan: r.danId ? { id: r.danId, cau: r.danCau } : null,
      });
      if (typeof kqCanh === 'string' && kqCanh.trim()) {
        chieu = kqCanh.trim();
        chieuCachLay = 'NGHIA_CANH';
      }
    }
    if (!chieu) {
      chieu = xacDinhChieu(r.cauGoc, r.dsDanCau);
    }
    trung.push({ r, ...k, chieu, chieuCachLay });
  }

  trung.sort((a, b) => {
    if (b.diem !== a.diem) return b.diem - a.diem;
    const la = THU_TU_LOP[a.r.lop] ?? 9;
    const lb = THU_TU_LOP[b.r.lop] ?? 9;
    if (la !== lb) return la - lb;
    const ka = THU_TU_KHO[a.r.kho] ?? 9;
    const kb = THU_TU_KHO[b.r.kho] ?? 9;
    if (ka !== kb) return ka - kb;
    return a.r.cauId < b.r.cauId ? -1 : a.r.cauId > b.r.cauId ? 1 : 0;
  });

  const cuaVao = trung.slice(0, gioHan).map(({ r, chieu, chieuCachLay, kieuKhop }) => ({
    nut: r.nutId,
    cauId: r.cauId,
    cau: r.cauGoc,
    dan: r.danId ? { id: r.danId, cau: r.danCau } : null,
    chieu,
    chieuCachLay,
    lop: r.lop,
    kho: r.kho,
    trang: r.trang,
    kieuKhop,
    duongDiTiep: {
      goiPhaiDoc: r.nutId,
      api: `/api/dataset?resource=phai_doc&id=${encodeURIComponent(r.nutId)}`,
    },
  }));

  return {
    cheDo: 'luat',
    tuKhoa,
    tong: trung.length,
    traVe: cuaVao.length,
    khoTim: [...KHO_DUOC_TIM],
    cuaVao,
    rong: cuaVao.length === 0,
    thongBao: cuaVao.length === 0
      ? 'Không có câu luật nào trong 6 kho gốc (phan, chuong, nhom, phan-nhom, sen, bieu) nhắc tới cụm từ này; hệ thống trả rỗng và không đoán.'
      : null,
    luuY: 'Chỉ trả nút luật có câu nhắc tới hàng làm cửa vào gọi phaiDoc; không kết luận mã 8 số.',
    timNghia: timNghiaInfo,
  };
}

function datLai() {
  CACHE_CHI_MUC.clear();
}

module.exports = {
  timLuat,
  datLai,
  KHO_DUOC_TIM,
  xacDinhChieu,
  chuanChu,
  boDau,
  napChiMuc,
};
