// lib/so-vet/kiem.js — M-51 (#1919): Hàm kiểm Sổ ghi vết từng bước (tất định, 0 LLM, mở rộng lib/cong-adr-0004.js).
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  kiemCongAdr0004,
  kiemTrichHopLe,
  laCanCuTienLe,
} = require('../cong-adr-0004');
const { phaiDoc } = require('../do-thi/phai-doc');
const { docKhoLuatGoc, dungDoThiDanChieu } = require('../do-thi/dan-chieu');
const {
  LOAI_BUOC,
  MA_LOI_SO_VET,
  chuanHoaTraLoiCanh,
} = require('./khuon');

const THU_MUC_MAC_DINH = path.join(__dirname, '..', '..', 'data', 'luat-goc');
const TAP_LOAI_BUOC = new Set(LOAI_BUOC);
const BUOC_PHAI_DOC_LUAT = new Set([
  'TEN',
  'CHU_GIAI_PHAN',
  'CHU_GIAI_CHUONG',
  'CHU_GIAI_PHAN_CHUONG',
  'CHU_GIAI_PHAN_NHOM',
]);
const BUOC_PHAI_DOC_DAY_DU = new Set(['CHU_GIAI_NHOM', 'SEN']);
const BUOC_PHAM_VI_CANH = new Set([
  'TEN',
  'CHU_GIAI_PHAN',
  'CHU_GIAI_CHUONG',
  'CHU_GIAI_PHAN_CHUONG',
  'CHU_GIAI_NHOM',
  'CHU_GIAI_PHAN_NHOM',
  'SEN',
]);

const RE_DAN_LOAI = /(?:không\s+bao\s+gồm|loại\s+trừ|không\s+áp\s+dụng|ngoại\s+trừ|trừ\s+(?:các\s+)?(?:loại|mặt\s+hàng|sản\s+phẩm|trường\s+hợp)?\s*[:;]|không\s+thuộc\s+(?:nhóm|chương|phần|phân\s+nhóm)\s+này)/iu;
const RE_DAU_CAU_LOAI = /(?:^|(?<![\p{L}\p{N}])(?:phần|chương|nhóm|phân\s+nhóm)\s+này\s+)(?:không\s+bao\s+gồm|loại\s+trừ|không\s+áp\s+dụng)/iu;

const CACHE_NGUON = new Map();

function so(v) {
  return String(v == null ? '' : v).replace(/\D/g, '');
}

function tachNutTuCau(id) {
  const s = String(id || '').trim();
  const idx = s.lastIndexOf('#');
  return idx > 0 ? s.slice(0, idx) : s;
}

/**
 * Nạp bản đồ câu, danh sách câu theo từng nút, cây câu dẫn `dan`, đồ thị `NHAC`,
 * và bảng `nghia-canh/*.jsonl` (M-33) từ thư mục kho luật gốc.
 */
function napNguonCau(thuMuc = THU_MUC_MAC_DINH, cauTheoId = null) {
  const dir = path.resolve(thuMuc || THU_MUC_MAC_DINH);
  let coSo = CACHE_NGUON.get(dir);
  if (!coSo) {
    const kho = docKhoLuatGoc(dir, { coCau: true });
    const nutHopLe = [];
    const nutTheoId = new Map();
    for (const n of kho.nut) {
      if (!n || !n.id) continue;
      if (n.lop === 'TIEN_LE' || String(n.id).startsWith('tb:')) continue;
      nutTheoId.set(n.id, n);
      nutHopLe.push(n);
    }

    const mapCauGoc = new Map();
    const cauTheoNut = new Map();
    const danTheoCau = new Map();
    const dirCau = path.join(dir, 'cau');
    const coKhoCauTrenDia = fs.existsSync(dirCau) && fs.statSync(dirCau).isDirectory();
    if (coKhoCauTrenDia) {
      for (const ten of fs.readdirSync(dirCau)) {
        if (!ten.endsWith('.jsonl') || ten === 'thong-bao.jsonl') continue;
        const lines = fs.readFileSync(path.join(dirCau, ten), 'utf8').split('\n').filter((l) => l.trim());
        for (const l of lines) {
          let c;
          try { c = JSON.parse(l); } catch { continue; }
          if (!c || !c.id) continue;
          const idx = c.id.lastIndexOf('#');
          const nutId = idx > 0 ? c.id.slice(0, idx) : c.id;
          const nut = nutTheoId.get(nutId);
          if (!nut || typeof nut.nguyenVan !== 'string') continue;
          mapCauGoc.set(c.id, nut.nguyenVan.slice(c.tu, c.den));
          if (!cauTheoNut.has(nutId)) cauTheoNut.set(nutId, []);
          cauTheoNut.get(nutId).push(c.id);
          if (c.dan) danTheoCau.set(c.id, c.dan);
        }
      }
    }

    const cauHopLe = (kho.cau || []).filter((c) => {
      if (!c || !c.id) return false;
      const nid = tachNutTuCau(c.id);
      return nutTheoId.has(nid);
    });
    const doThiNhac = dungDoThiDanChieu({
      nut: nutHopLe,
      cau: cauHopLe.length > 0 ? cauHopLe : null,
    });

    const nghiaCanh = napNghiaCanh(dir);
    coSo = {
      dir,
      nutTheoId,
      mapCauGoc,
      cauTheoNut,
      danTheoCau,
      coKhoCauTrenDia,
      doThiNhac,
      nghiaCanh,
    };
    CACHE_NGUON.set(dir, coSo);
  }

  const mapCau = new Map(coSo.mapCauGoc);
  if (cauTheoId && typeof cauTheoId === 'object') {
    const entries = cauTheoId instanceof Map ? cauTheoId.entries() : Object.entries(cauTheoId);
    for (const [k, v] of entries) {
      if (typeof v === 'string') mapCau.set(k, v);
    }
  }

  function traCau(idCau) {
    const id = String(idCau || '').trim();
    if (!id) return null;
    if (mapCau.has(id)) return mapCau.get(id);
    if (!coSo.coKhoCauTrenDia) {
      const nut = coSo.nutTheoId.get(tachNutTuCau(id));
      if (nut && typeof nut.nguyenVan === 'string') return nut.nguyenVan;
    }
    return null;
  }

  function laCauLoaiTru(cauId) {
    const goc = mapCau.get(cauId) || traCau(cauId) || '';
    if (RE_DAU_CAU_LOAI.test(String(goc).replace(/\s+/g, ' ').trim())) return true;
    let cur = coSo.danTheoCau.get(cauId);
    for (let hop = 0; hop < 3 && cur; hop += 1) {
      const textDan = String(mapCau.get(cur) || traCau(cur) || '').replace(/\s+/g, ' ').trim();
      if (textDan && RE_DAN_LOAI.test(textDan)) return true;
      cur = coSo.danTheoCau.get(cur);
    }
    return false;
  }

  return {
    ...coSo,
    mapCau,
    traCau,
    laCauLoaiTru,
  };
}

/**
 * Đọc bảng cạnh nghĩa `data/luat-goc/nghia-canh/*.jsonl` (M-33) nếu đã có trên đĩa.
 */
function napNghiaCanh(dir) {
  const dirNc = path.join(dir, 'nghia-canh');
  if (!fs.existsSync(dirNc) || !fs.statSync(dirNc).isDirectory()) {
    return { coTep: false, canh: [] };
  }
  const files = fs.readdirSync(dirNc).filter((f) => f.endsWith('.jsonl') && f !== 'thong-bao.jsonl');
  if (files.length === 0) {
    return { coTep: false, canh: [] };
  }
  const canh = [];
  for (const f of files) {
    const lines = fs.readFileSync(path.join(dirNc, f), 'utf8').split('\n').filter((l) => l.trim());
    for (const l of lines) {
      let obj;
      try { obj = JSON.parse(l); } catch { continue; }
      if (!obj || !obj.tu || !obj.den) continue;
      if (String(obj.tu).startsWith('tb:') || String(obj.den).startsWith('tb:')) continue;
      canh.push(obj);
    }
  }
  return { coTep: true, canh };
}

function thuThapNutPhamVi(pd) {
  const nutPhamVi = new Set();
  if (!pd || !Array.isArray(pd.trinhTu)) return nutPhamVi;
  for (const b of pd.trinhTu) {
    if (!BUOC_PHAM_VI_CANH.has(b.buoc)) continue;
    for (const m of b.muc || []) {
      const nid = m.id || m.nut;
      if (nid) nutPhamVi.add(nid);
    }
  }
  return nutPhamVi;
}

/**
 * Lấy danh sách cạnh phải trả lời ở bước KIEM của `nutId`:
 * - Khi có `nghia-canh/*.jsonl` (M-33): lấy mọi `LOAI_SANG` (`KHOP`) và mọi `CHUA_RO`
 *   xuất phát từ chú giải của nút, Chương, Phần chứa nút.
 * - Khi chưa có `nghia-canh/*.jsonl`: lấy mọi cạnh `NHAC` từ `doThiNhac` của câu nằm dưới câu dẫn loại trừ.
 */
/** Ở tầng 4 số, câu chú giải phân nhóm (cgpn, pn) và đích là phân nhóm của chính nhóm đó thuộc Quy tắc 6, chưa tới lượt. */
function chuaToiLuot(pd, tuNut, nutDich) {
  const h = so(pd && pd.id);
  if (h.length !== 4) return false;
  if (/:cgpn(?::|$)/.test(tuNut) || /^pn:/.test(tuNut)) return true;
  const d = /^bieu:(\d+)/.exec(nutDich || '');
  return !!d && d[1].length > 4 && d[1].startsWith(h);
}

function layCanhKiemBatBuoc(pd, nguonCau) {
  const nutPhamVi = thuThapNutPhamVi(pd);
  const ra = [];
  const daCo = new Set();

  if (nguonCau.nghiaCanh && nguonCau.nghiaCanh.coTep) {
    for (const e of nguonCau.nghiaCanh.canh) {
      const tuCau = String(e.tu || '').trim();
      const tuNut = tachNutTuCau(tuCau);
      if (!nutPhamVi.has(tuNut) && !nutPhamVi.has(tuCau)) continue;
      const trangThai = String(e.trangThai || '').trim().toUpperCase();
      const loai = String(e.loai || '').trim().toUpperCase();
      const batBuoc = (trangThai === 'KHOP' && loai === 'LOAI_SANG') || trangThai === 'CHUA_RO';
      if (!batBuoc) continue;
      const nutDich = String(e.den || '').trim();
      if (chuaToiLuot(pd, tuNut, nutDich)) continue;
      const key = `${tuCau}|${nutDich}`;
      if (daCo.has(key)) continue;
      daCo.add(key);
      ra.push({
        cauId: tuCau,
        tuNut,
        nutDich,
        loai,
        trangThai,
        dieuKien: e.dieuKien || '',
      });
    }
    return { nguon: 'NGHIA_CANH', canh: ra };
  }

  for (const e of nguonCau.doThiNhac?.canh || []) {
    const tuNut = e.tuNut || tachNutTuCau(e.tu);
    if (!nutPhamVi.has(tuNut)) continue;
    const cauId = String(e.tu || '').trim();
    if (!nguonCau.laCauLoaiTru(cauId)) continue;
    const nutDich = String(e.den || '').trim();
    if (chuaToiLuot(pd, tuNut, nutDich)) continue;
    const key = `${cauId}|${nutDich}`;
    if (daCo.has(key)) continue;
    daCo.add(key);
    ra.push({
      cauId,
      tuNut,
      nutDich,
      loai: 'NHAC_LOAI',
      trangThai: 'NHAC',
      dieuKien: e.trich || '',
    });
  }
  return { nguon: 'NHAC_DAN_LOAI', canh: ra };
}

function themLoi(loi, thieu, entry) {
  loi.push(entry);
  if (entry.chiTiet) thieu.push(`[${entry.ma}] ${entry.chiTiet}`);
}

function capNhatTangKhiQuayHoacChuyen(trangThaiTang, nutDich) {
  const digits = String(nutDich || '').startsWith('bieu:') ? so(nutDich) : '';
  if (!digits || digits.length < 4) {
    trangThaiTang.nhom4 = null;
    trangThaiTang.gach5 = null;
    trangThaiTang.pn6 = null;
    trangThaiTang.dong8 = null;
    return;
  }
  if (digits.length === 4) {
    trangThaiTang.nhom4 = digits;
    trangThaiTang.gach5 = null;
    trangThaiTang.pn6 = null;
    trangThaiTang.dong8 = null;
  } else if (digits.length === 5) {
    trangThaiTang.nhom4 = digits.slice(0, 4);
    trangThaiTang.gach5 = digits;
    trangThaiTang.pn6 = null;
    trangThaiTang.dong8 = null;
  } else if (digits.length === 6) {
    trangThaiTang.nhom4 = digits.slice(0, 4);
    trangThaiTang.gach5 = null;
    trangThaiTang.pn6 = digits;
    trangThaiTang.dong8 = null;
  } else if (digits.length === 7) {
    trangThaiTang.nhom4 = digits.slice(0, 4);
    trangThaiTang.gach5 = digits;
    trangThaiTang.pn6 = digits.slice(0, 6);
    trangThaiTang.dong8 = null;
  }
}

function taoBanGhiAdr(soVet, daQuetCanhChuaBietChuaHoi) {
  const tang4CanCu = [];
  const tang6CanCu = [];
  const tang8CanCu = [];
  let ma4 = null;
  let ma6 = null;
  let ma8 = null;
  const quyTacSet = new Set();

  for (const b of soVet.cacBuoc) {
    if (b.quyTacGir) {
      for (const part of String(b.quyTacGir).split(/[,;+]/).map((x) => x.trim()).filter(Boolean)) {
        quyTacSet.add(part);
      }
    }
    const dsTrich = Array.isArray(b.trich)
      ? b.trich.map((t) => ({ nguon: t?.cauId, trich: t?.doan }))
      : [];
    if (b.loai === 'QUAY_LUI' || b.loai === 'CHUYEN_HUONG') {
      const d = String(b.quyetDinh?.nutDich || '').startsWith('bieu:') ? so(b.quyetDinh.nutDich) : '';
      if (!d || d.length < 4) {
        ma4 = null; ma6 = null; ma8 = null;
        tang4CanCu.length = 0; tang6CanCu.length = 0; tang8CanCu.length = 0;
      } else if (d.length === 4 || d.length === 5) {
        ma4 = d.slice(0, 4);
        tang4CanCu.length = 0;
        if (b.loai === 'CHUYEN_HUONG') tang4CanCu.push(...dsTrich);
        ma6 = null; ma8 = null;
        tang6CanCu.length = 0; tang8CanCu.length = 0;
      } else if (d.length === 6 || d.length === 7) {
        ma4 = d.slice(0, 4);
        ma6 = d.slice(0, 6);
        tang6CanCu.length = 0;
        if (b.loai === 'CHUYEN_HUONG') tang6CanCu.push(...dsTrich);
        ma8 = null;
        tang8CanCu.length = 0;
      }
    } else if (b.loai === 'CHON' && b.quyetDinh?.nutDich) {
      const d = String(b.quyetDinh.nutDich).startsWith('bieu:') ? so(b.quyetDinh.nutDich) : '';
      if (d.length === 4) {
        ma4 = d;
        tang4CanCu.length = 0;
        tang4CanCu.push(...dsTrich);
        ma6 = null; ma8 = null;
        tang6CanCu.length = 0; tang8CanCu.length = 0;
      } else if (d.length === 5) {
        ma6 = null; ma8 = null;
        tang6CanCu.length = 0; tang8CanCu.length = 0;
      } else if (d.length === 7) {
        // Cấp gạch trung gian dưới phân nhóm 6 số đã chọn: giữ nguyên tầng 6, chỉ xoá tầng 8.
        ma8 = null;
        tang8CanCu.length = 0;
      } else if (d.length === 6) {
        ma6 = d;
        tang6CanCu.length = 0;
        tang6CanCu.push(...dsTrich);
        ma8 = null;
        tang8CanCu.length = 0;
      } else if (d.length === 8) {
        ma8 = d;
        tang8CanCu.length = 0;
        tang8CanCu.push(...dsTrich);
      }
    }
  }

  const buocCuoi = [...soVet.cacBuoc].reverse().find((b) => b.loai === 'KET_LUAN');
  const coHoi = soVet.cacBuoc.some((b) => b.loai === 'HOI');
  const ketLuan = buocCuoi
    ? String(buocCuoi.quyetDinh?.trangThai || 'CHOT').trim().toUpperCase()
    : (coHoi ? 'DUNG_HOI' : 'CHOT');
  const maHs = buocCuoi?.quyetDinh?.maHs
    ? so(buocCuoi.quyetDinh.maHs)
    : (ma8 || ma6 || ma4 || '');

  const tang = {};
  if (ma4) tang.tang4 = { ma: ma4, canCu: tang4CanCu };
  if (ma6) tang.tang6 = { ma: ma6, canCu: tang6CanCu };
  if (ma8) {
    tang.tang8 = { ma: ma8, canCu: tang8CanCu };
  } else if (ketLuan === 'DUNG_HOI' && ma4) {
    if (!ma6) tang.tang6 = { trangThai: 'DUNG_HOI' };
    else tang.tang8 = { trangThai: 'DUNG_HOI' };
  }

  const cacBuocAdr = [];
  if (soVet.laBoPhan || soVet.mayChu) cacBuocAdr.push('B0');
  if (ma4 || soVet.cacBuoc.some((b) => b.loai === 'VAO_CUA' || b.loai === 'KIEM')) cacBuocAdr.push('B1');
  if (ma6 || ma8) cacBuocAdr.push('B6');

  return {
    ketLuan,
    maHs,
    tang,
    qt1SoNhom: soVet.qt1SoNhom,
    ungVienSauQt1: soVet.ungVienSauQt1,
    quyTacApDung: [...quyTacSet],
    laBoPhan: soVet.laBoPhan,
    mayChu: soVet.mayChu,
    kiemBoPhan: soVet.kiemBoPhan,
    duKienBatBuocThieu: daQuetCanhChuaBietChuaHoi,
    cacBuoc: cacBuocAdr,
  };
}

/**
 * Kiểm tra toàn bộ Sổ ghi vết: đủ trường, nguyên văn câu trích, đọc đủ mọi câu của nút bắt buộc
 * (gồm TEN, CHU_GIAI_PHAN, CHU_GIAI_CHUONG, CHU_GIAI_PHAN_CHUONG, CHU_GIAI_NHOM, CHU_GIAI_PHAN_NHOM, SEN),
 * CHON cùng cấp cùng nhánh, KIEM đủ mọi cạnh nghia-canh (hoặc NHAC dưới câu dẫn loại trừ),
 * CHUA_BIET phải có HOI, thứ tự 4 -> 6 -> 8, quay lui có lý do, và gọi cổng kiemCongAdr0004().
 */
function kiemSoVet(soVet, {
  thuMuc = THU_MUC_MAC_DINH,
  cauTheoId = null,
  phaiDocFn = phaiDoc,
} = {}) {
  const loi = [];
  const thieu = [];

  if (!soVet || typeof soVet !== 'object' || !Array.isArray(soVet.cacBuoc) || soVet.cacBuoc.length === 0) {
    themLoi(loi, thieu, {
      ma: 'SO_VET_RONG',
      chiTiet: MA_LOI_SO_VET.SO_VET_RONG,
    });
    return { dat: false, loi, thieu, adr0004: null };
  }

  const nguonCau = napNguonCau(thuMuc, cauTheoId);
  const nguonVanBanMap = {};
  const daDocCau = new Set();
  const daDocNutTrucTiep = new Set();
  const tangState = { nhom4: null, gach5: null, pn6: null, dong8: null };
  const nutDaKiem = new Set();
  const coBuocLoc = soVet.cacBuoc.some((b) => b?.loai === 'LOC');
  const nhomDuocDoc = new Set();
  const canhChuaBietChoHoi = [];
  const tatCaChuaBietChuaGiai = [];

  const goiPhaiDoc = (id) => {
    try {
      return phaiDocFn(id, { thuMuc: nguonCau.dir, dayDu: true });
    } catch {
      return phaiDocFn(id);
    }
  };

  /**
   * Trả về các câu chưa đọc của nút bắt buộc:
   * - Nếu người đọc ghi thẳng id nút (không có #) -> xem như đã đọc nút.
   * - Nếu kho câu có các câu của nút -> CHỈ tính đã đọc khi MỌI câu của nút nằm trong daDocCau; thiếu câu nào trả câu đó.
   */
  const cauConThieuCuaNut = (mucId) => {
    if (daDocNutTrucTiep.has(mucId)) return [];
    const dsCau = nguonCau.cauTheoNut.get(mucId);
    if (dsCau && dsCau.length > 0) {
      return dsCau.filter((cid) => !daDocCau.has(cid));
    }
    return daDocCau.has(`${mucId}#1`) ? [] : [mucId];
  };

  for (let i = 0; i < soVet.cacBuoc.length; i += 1) {
    const b = soVet.cacBuoc[i];
    const nhanBuoc = `Bước #${i + 1} (${b?.loai || '?'})`;

    if (!b || typeof b !== 'object' || !TAP_LOAI_BUOC.has(b.loai)) {
      themLoi(loi, thieu, {
        ma: 'LOAI_BUOC_KHONG_HOP_LE',
        buoc: i,
        chiTiet: `${nhanBuoc}: loại bước "${b?.loai}" không hợp lệ.`,
      });
      continue;
    }

    // 1. Đủ 8 trường bắt buộc trên mỗi bước
    const thieuTruong = [];
    if (!String(b.nut || '').trim()) thieuTruong.push('nut');
    if (!Array.isArray(b.cungCapDaThay)) thieuTruong.push('cungCapDaThay');
    if (!Array.isArray(b.daDoc)) thieuTruong.push('daDoc');
    if (!Array.isArray(b.trich)) thieuTruong.push('trich');
    if (!String(b.chuKhach || '').trim()) thieuTruong.push('chuKhach');
    if (!b.quyetDinh || typeof b.quyetDinh !== 'object') thieuTruong.push('quyetDinh');
    if (!Array.isArray(b.daSoKhongChon)) thieuTruong.push('daSoKhongChon');
    if (!String(b.quyTacGir || '').trim()) thieuTruong.push('quyTacGir');
    if (thieuTruong.length > 0) {
      themLoi(loi, thieu, {
        ma: 'THIEU_TRUONG_BUOC',
        buoc: i,
        chiTiet: `${nhanBuoc} thiếu trường: ${thieuTruong.join(', ')}.`,
      });
    }

    // 2. Tích lũy daDoc (không suy 1 câu -> cả nút!) + chặn tiền lệ + kiểm nguyên văn từng câu trích
    if (Array.isArray(b.daDoc)) {
      for (const rawId of b.daDoc) {
        const id = String(rawId || '').trim();
        if (!id) continue;
        if (id.startsWith('tb:') || laCanCuTienLe({ nguon: id })) {
          themLoi(loi, thieu, {
            ma: 'TIEN_LE_TRONG_SO_VET',
            buoc: i,
            chiTiet: `${nhanBuoc}: cấm đưa nút tiền lệ "${id}" vào danh sách daDoc.`,
          });
          continue;
        }
        if (id.includes('#')) daDocCau.add(id);
        else daDocNutTrucTiep.add(id);
      }
    }

    if (Array.isArray(b.trich)) {
      for (const t of b.trich) {
        const cauId = String(t?.cauId || '').trim();
        const doan = String(t?.doan || '');
        if (!cauId || !doan.trim()) {
          themLoi(loi, thieu, {
            ma: 'TRICH_KHONG_CO_TRONG_CAU',
            buoc: i,
            chiTiet: `${nhanBuoc}: phần tử trich thiếu cauId hoặc doan.`,
          });
          continue;
        }
        if (cauId.startsWith('tb:') || laCanCuTienLe({ nguon: cauId })) {
          themLoi(loi, thieu, {
            ma: 'TIEN_LE_TRONG_SO_VET',
            buoc: i,
            chiTiet: `${nhanBuoc}: cấm trích nút tiền lệ "${cauId}".`,
          });
          continue;
        }
        const goc = nguonCau.traCau(cauId);
        if (!goc) {
          themLoi(loi, thieu, {
            ma: 'TRICH_KHONG_CO_TRONG_CAU',
            buoc: i,
            chiTiet: `${nhanBuoc}: không tìm thấy nguyên văn câu "${cauId}" trong kho luật gốc.`,
          });
          continue;
        }
        nguonVanBanMap[cauId] = goc;
        const kt = kiemTrichHopLe({ nguon: cauId, trich: doan }, nguonVanBanMap);
        if (!kt.ok) {
          themLoi(loi, thieu, {
            ma: 'TRICH_KHONG_CO_TRONG_CAU',
            buoc: i,
            chiTiet: `${nhanBuoc}: trích tại "${cauId}" không khớp nguyên văn (${kt.lyDo}).`,
          });
        }
      }
    }

    // 3. Kiểm nút bắt buộc theo phaiDoc() đã đọc đủ mọi câu chưa (gồm cả CHU_GIAI_NHOM và SEN)
    const nutCanKiemDoc = b.loai === 'CHON' && b.quyetDinh?.nutDich ? b.quyetDinh.nutDich : b.nut;
    if ((b.loai === 'CHON' || b.loai === 'KIEM' || b.loai === 'KET_LUAN') && String(nutCanKiemDoc || '').startsWith('bieu:')) {
      const pdBatBuoc = goiPhaiDoc(nutCanKiemDoc);
      if (pdBatBuoc && Array.isArray(pdBatBuoc.trinhTu)) {
        const thieuMuc = [];
        const d = so(nutCanKiemDoc);
        for (const step of pdBatBuoc.trinhTu) {
          const laBuocLuat = BUOC_PHAI_DOC_LUAT.has(step.buoc);
          const laBuocNhomSen = BUOC_PHAI_DOC_DAY_DU.has(step.buoc) && d.length >= 4;
          if (!laBuocLuat && !laBuocNhomSen) continue;
          if (step.buoc === 'CHU_GIAI_PHAN_NHOM' && d.length < 6) continue;
          for (const muc of step.muc || []) {
            if (laBuocLuat && muc.lop !== 'LUAT') continue;
            const mucId = muc.id || muc.nut;
            if (!mucId) continue;
            const cauThieu = cauConThieuCuaNut(mucId);
            for (const ct of cauThieu) thieuMuc.push(ct);
          }
        }
        if (thieuMuc.length > 0) {
          themLoi(loi, thieu, {
            ma: 'THIEU_NUT_BAT_BUOC_PHAI_DOC',
            buoc: i,
            chiTiet: `${nhanBuoc} tại ${nutCanKiemDoc} thiếu đọc ${thieuMuc.length} mục/câu bắt buộc theo phaiDoc(): ${thieuMuc.slice(0, 8).join(', ')}${thieuMuc.length > 8 ? '…' : ''}.`,
          });
        }
      }
    }

    // 4. Kiểm bước CHON: cùng cấp cùng nhánh + đúng thứ tự 4 -> 6 -> 8
    if (b.loai === 'CHON') {
      const nutDich = String(b.quyetDinh?.nutDich || '').trim();
      const pdDung = goiPhaiDoc(b.nut);
      if (!nutDich || !pdDung) {
        themLoi(loi, thieu, {
          ma: 'CHON_NGOAI_CUNG_CAP_NHANH',
          buoc: i,
          chiTiet: `${nhanBuoc}: không xác định được nút đứng "${b.nut}" hoặc thiếu quyetDinh.nutDich.`,
        });
      } else {
        const capDuoiIds = (pdDung.capDuoi || []).map((x) => x.id);
        const cungCapIds = [pdDung.id, ...(pdDung.cungCap || []).map((x) => x.id)];
        const hopLe = capDuoiIds.length > 0 && !b.quyetDinh?.cungCapNgang ? capDuoiIds : cungCapIds;
        const tapHopLe = new Set(hopLe);
        const daThaySet = new Set(Array.isArray(b.cungCapDaThay) ? b.cungCapDaThay : []);
        const ngoaiDaThay = (Array.isArray(b.cungCapDaThay) ? b.cungCapDaThay : []).filter((x) => !tapHopLe.has(x));

        if (!tapHopLe.has(nutDich) || !daThaySet.has(nutDich) || ngoaiDaThay.length > 0) {
          themLoi(loi, thieu, {
            ma: 'CHON_NGOAI_CUNG_CAP_NHANH',
            buoc: i,
            chiTiet: `${nhanBuoc}: chọn "${nutDich}" từ "${b.nut}" không nằm gọn trong nút cùng cấp cùng nhánh [${hopLe.join(', ')}]${ngoaiDaThay.length ? ` (cungCapDaThay chứa nút lạ: ${ngoaiDaThay.join(', ')})` : ''}.`,
          });
        }
      }

      if (nutDich.startsWith('bieu:')) {
        const digits = so(nutDich);
        if (digits.length === 4) {
          tangState.nhom4 = digits;
          tangState.gach5 = null;
          tangState.pn6 = null;
          tangState.dong8 = null;
        } else if (digits.length === 5 || digits.length === 7) {
          if (!tangState.nhom4 || !digits.startsWith(tangState.nhom4)) {
            themLoi(loi, thieu, {
              ma: 'SAI_THU_TU_TANG_4_6_8',
              buoc: i,
              chiTiet: `${nhanBuoc}: chọn nút trung gian "${nutDich}" khi chưa chọn nhóm 4 số chứa nó (đang có nhom4=${tangState.nhom4 || 'chưa'}).`,
            });
          } else if (digits.length === 5) {
            tangState.gach5 = digits;
            tangState.pn6 = null;
            tangState.dong8 = null;
          } else {
            tangState.dong8 = null;
          }
        } else if (digits.length === 6) {
          if (!tangState.nhom4 || !digits.startsWith(tangState.nhom4)) {
            themLoi(loi, thieu, {
              ma: 'SAI_THU_TU_TANG_4_6_8',
              buoc: i,
              chiTiet: `${nhanBuoc}: chọn phân nhóm 6 số "${digits}" trước khi chọn nhóm 4 số chứa nó (đang có nhom4=${tangState.nhom4 || 'chưa'}).`,
            });
          } else {
            tangState.pn6 = digits;
            tangState.dong8 = null;
          }
        } else if (digits.length === 8) {
          if (!tangState.nhom4 || !tangState.pn6 || !digits.startsWith(tangState.pn6)) {
            themLoi(loi, thieu, {
              ma: 'SAI_THU_TU_TANG_4_6_8',
              buoc: i,
              chiTiet: `${nhanBuoc}: chọn dòng 8 số "${digits}" khi chưa đi qua đủ tầng 4 → 6 chứa nó (đang có nhom4=${tangState.nhom4 || 'chưa'}, pn6=${tangState.pn6 || 'chưa'}).`,
            });
          } else {
            tangState.dong8 = digits;
          }
        }
      }
    }

    // 4b. Bước LOC: giữ ∪ bỏ = đúng các nhóm đã thấy, nhóm bỏ phải có lý do (được gộp theo lý do).
    if (b.loai === 'LOC') {
      const thay = new Set((Array.isArray(b.cungCapDaThay) ? b.cungCapDaThay : []).map((x) => so(x)));
      const giu = (Array.isArray(b.quyetDinh?.giu) ? b.quyetDinh.giu : []).map((x) => so(x));
      const boQua = Array.isArray(b.quyetDinh?.boQua) ? b.quyetDinh.boQua : [];
      const bo = boQua.filter((x) => String(x?.lyDo || '').trim().length >= 6).flatMap((x) => (Array.isArray(x.nhom) ? x.nhom : [])).map((x) => so(x));
      const tapGiu = new Set(giu);
      const tapBo = new Set(bo);
      const sot = [...thay].filter((x) => !tapGiu.has(x) && !tapBo.has(x));
      const trung = giu.filter((x) => tapBo.has(x));
      const la = [...giu, ...bo].filter((x) => !thay.has(x));
      if (thay.size === 0 || sot.length || trung.length || la.length) {
        themLoi(loi, thieu, {
          ma: 'LOC_KHONG_PHU_DU',
          buoc: i,
          chiTiet: `${nhanBuoc}: ${thay.size === 0 ? 'không có nhóm nào đã thấy' : `sót [${sot.slice(0, 8).join(', ')}], vừa giữ vừa bỏ [${trung.join(', ')}], nhóm lạ [${la.slice(0, 8).join(', ')}]`}.`,
        });
      }
      for (const x of giu) nhomDuocDoc.add(x.slice(0, 4));
    }

    // 5. Kiểm bước KIEM: lấy cạnh từ nghia-canh (M-33) hoặc fallback cạnh NHAC dưới câu dẫn loại trừ; hỗ trợ trả lời gộp theo câu
    if (b.loai === 'KIEM') {
      nutDaKiem.add(b.nut);
      if (coBuocLoc && !nhomDuocDoc.has(so(b.nut).slice(0, 4))) {
        themLoi(loi, thieu, {
          ma: 'KIEM_NGOAI_LOC',
          buoc: i,
          chiTiet: `${nhanBuoc}: KIEM "${b.nut}" nhưng nhóm này không do LOC giữ và không do CHUYEN_HUONG chỉ sang.`,
        });
      }
      const pdKiem = goiPhaiDoc(b.nut);
      const { canh: dsCanhBatBuoc } = layCanhKiemBatBuoc(pdKiem, nguonCau);
      const traLoi = Array.isArray(b.kiemCanh) ? b.kiemCanh : null;
      if (!traLoi) {
        themLoi(loi, thieu, {
          ma: 'KIEM_SOT_CANH_LOAI_TRU',
          buoc: i,
          chiTiet: `${nhanBuoc} tại ${b.nut}: thiếu mảng kiemCanh trả lời ${dsCanhBatBuoc.length} cạnh cần kiểm.`,
        });
      } else {
        const traLoiTheoCau = new Map();
        const daDungIdx = new Set();

        for (let ti = 0; ti < traLoi.length; ti += 1) {
          const item = traLoi[ti];
          if (!item || typeof item !== 'object') {
            themLoi(loi, thieu, {
              ma: 'KIEM_TRA_LOI_CANH_KHONG_HOP_LE',
              buoc: i,
              chiTiet: `${nhanBuoc} mục kiemCanh[${ti}]: không phải đối tượng hợp lệ.`,
            });
            continue;
          }
          const kqCanh = chuanHoaTraLoiCanh(item.ketQua);
          if (!kqCanh || !String(item.chuKhach || '').trim()) {
            themLoi(loi, thieu, {
              ma: 'KIEM_TRA_LOI_CANH_KHONG_HOP_LE',
              buoc: i,
              chiTiet: `${nhanBuoc} mục ${item.cauId || item.nutDich || `#${ti}`}: thiếu kết quả hợp lệ (THOA/KHONG/CHUA_BIET) hoặc thiếu chuKhach.`,
            });
            continue;
          }
          const laGopTheoCau = item.cauId && (item.gopTheoCau === true || !item.nutDich || item.nutDich === '*');
          if (laGopTheoCau) {
            traLoiTheoCau.set(String(item.cauId).trim(), { item, kqCanh });
          }
          if (kqCanh === 'CHUA_BIET') {
            const moTa = `${item.cauId || item.nguonCanh || '?'}->${item.nutDich || '*'} (chưa biết dữ kiện)`;
            canhChuaBietChoHoi.push({ nut: b.nut, moTa });
            tatCaChuaBietChuaGiai.push(moTa);
          }
        }

        const sot = [];
        for (const c of dsCanhBatBuoc) {
          if (traLoiTheoCau.has(c.cauId)) continue;
          const idxKhop = traLoi.findIndex((t, ti) => {
            if (daDungIdx.has(ti) || !t || typeof t !== 'object') return false;
            if (t.nutDich !== c.nutDich) return false;
            if (t.cauId) return String(t.cauId).trim() === c.cauId;
            if (t.nguonCanh) return String(t.nguonCanh).trim() === c.tuNut;
            return false;
          });
          if (idxKhop < 0) {
            sot.push(`${c.cauId}->${c.nutDich}`);
          } else {
            daDungIdx.add(idxKhop);
          }
        }
        if (sot.length > 0) {
          themLoi(loi, thieu, {
            ma: 'KIEM_SOT_CANH_LOAI_TRU',
            buoc: i,
            chiTiet: `${nhanBuoc} tại ${b.nut}: bỏ sót ${sot.length}/${dsCanhBatBuoc.length} cạnh cần kiểm (${sot.slice(0, 6).join(', ')}${sot.length > 6 ? '…' : ''}).`,
          });
        }
      }
    }

    // 6. Bước HOI giải phóng hàng đợi CHUA_BIET
    if (b.loai === 'HOI') {
      canhChuaBietChoHoi.length = 0;
    }

    // 7. QUAY_LUI phải ghi lý do; CHUYEN_HUONG phải có đích & trích; cập nhật lại tầng
    if (b.loai === 'QUAY_LUI') {
      const lyDo = String(b.quyetDinh?.lyDo || '').trim();
      const nutDich = String(b.quyetDinh?.nutDich || '').trim();
      if (lyDo.length < 6 || !nutDich) {
        themLoi(loi, thieu, {
          ma: 'QUAY_LUI_THIEU_LY_DO',
          buoc: i,
          chiTiet: `${nhanBuoc}: QUAY_LUI thiếu nutDich hoặc lyDo (>= 6 ký tự).`,
        });
      }
      capNhatTangKhiQuayHoacChuyen(tangState, nutDich);
    }

    if (b.loai === 'CHUYEN_HUONG') {
      const nutDich = String(b.quyetDinh?.nutDich || '').trim();
      if (!nutDich || !Array.isArray(b.trich) || b.trich.length === 0) {
        themLoi(loi, thieu, {
          ma: 'CHUYEN_HUONG_THIEU_DICH',
          buoc: i,
          chiTiet: `${nhanBuoc}: CHUYEN_HUONG phải ghi rõ quyetDinh.nutDich và câu trich dẫn chiếu.`,
        });
      }
      capNhatTangKhiQuayHoacChuyen(tangState, nutDich);
      if (so(nutDich).length >= 4) nhomDuocDoc.add(so(nutDich).slice(0, 4));
    }

    // 8. Bước KET_LUAN: kiểm đủ KIEM trước khi chốt, kiểm CHUA_BIET -> HOI, và kiểm 4 -> 6 -> 8
    if (b.loai === 'KET_LUAN') {
      const tt = String(b.quyetDinh?.trangThai || 'CHOT').trim().toUpperCase();
      const laDungHoi = tt === 'DUNG_HOI' || tt === 'NEED_FACTS';
      if (!laDungHoi && (canhChuaBietChoHoi.length > 0 || tatCaChuaBietChuaGiai.length > 0)) {
        themLoi(loi, thieu, {
          ma: 'CHUA_BIET_KHONG_CO_HOI',
          buoc: i,
          chiTiet: `${nhanBuoc}: chốt mã "${b.quyetDinh?.maHs || '?'}" trong khi còn cạnh CHUA_BIET (${tatCaChuaBietChuaGiai.join('; ')}); bắt buộc phải HOI / DUNG_HOI.`,
        });
      }
      const maChot = so(b.quyetDinh?.maHs);
      if (!laDungHoi) {
        if (maChot.length < 4) {
          themLoi(loi, thieu, {
            ma: 'SAI_THU_TU_TANG_4_6_8',
            buoc: i,
            chiTiet: `${nhanBuoc}: kết luận CHOT nhưng thiếu mã HS hợp lệ.`,
          });
        } else if (maChot.length === 8) {
          if (!tangState.nhom4 || !tangState.pn6 || !tangState.dong8 || !maChot.startsWith(tangState.pn6) || tangState.dong8 !== maChot) {
            themLoi(loi, thieu, {
              ma: 'SAI_THU_TU_TANG_4_6_8',
              buoc: i,
              chiTiet: `${nhanBuoc}: kết luận mã 8 số "${maChot}" nhưng chuỗi CHON chưa đủ 4→6→8 (${tangState.nhom4 || '?'} → ${tangState.pn6 || '?'} → ${tangState.dong8 || '?'}).`,
            });
          }
        }
        const nutNhomCanKiem = tangState.nhom4 ? `bieu:${tangState.nhom4}` : b.nut;
        const pdNhom = nutNhomCanKiem ? goiPhaiDoc(nutNhomCanKiem) : null;
        if (pdNhom) {
          const { canh: dsCanhNhom } = layCanhKiemBatBuoc(pdNhom, nguonCau);
          if (dsCanhNhom.length > 0 && !nutDaKiem.has(nutNhomCanKiem) && !nutDaKiem.has(b.nut)) {
            themLoi(loi, thieu, {
              ma: 'KIEM_SOT_CANH_LOAI_TRU',
              buoc: i,
              chiTiet: `${nhanBuoc}: chốt tại ${nutNhomCanKiem} (${dsCanhNhom.length} cạnh cần kiểm) nhưng sổ chưa có bước KIEM.`,
            });
          }
        }
      }
    }
  }

  const coKetThuc = soVet.cacBuoc.some((b) => b && (b.loai === 'KET_LUAN' || b.loai === 'HOI'));
  if (!coKetThuc) {
    themLoi(loi, thieu, {
      ma: 'THIEU_TRUONG_BUOC',
      chiTiet: 'Sổ ghi vết chưa kết thúc bằng bước KET_LUAN hoặc HOI.',
    });
  }

  if (canhChuaBietChoHoi.length > 0) {
    themLoi(loi, thieu, {
      ma: 'CHUA_BIET_KHONG_CO_HOI',
      chiTiet: `Có ${canhChuaBietChoHoi.length} cạnh loại trừ ở trạng thái CHUA_BIET nhưng sổ chưa có bước HOI sau đó (${canhChuaBietChoHoi.map((x) => x.moTa).join('; ')}).`,
    });
  }

  // Gọi trực tiếp cổng ADR-0004 (không viết lại cổng thứ hai)
  const banGhiAdr = taoBanGhiAdr(soVet, tatCaChuaBietChuaGiai);
  const adr0004 = kiemCongAdr0004(banGhiAdr, { nguonVanBan: nguonVanBanMap });
  for (const e of adr0004.loi) {
    const trung = loi.some((x) => x.ma === e.ma && x.tang === e.tang);
    if (!trung) themLoi(loi, thieu, e);
  }

  return {
    dat: loi.length === 0,
    loi,
    thieu,
    adr0004,
  };
}

function datLai() {
  CACHE_NGUON.clear();
}

module.exports = {
  kiemSoVet,
  napNguonCau,
  napNghiaCanh,
  layCanhKiemBatBuoc,
  datLai,
};
