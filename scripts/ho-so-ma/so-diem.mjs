#!/usr/bin/env node
// scripts/ho-so-ma/so-diem.mjs — M-81 (#2410, ADR-0008): sổ điểm tất định theo nhóm 4 số, tính hoàn toàn từ dữ liệu (KHÔNG tệp trạng thái riêng).
//   DONG: có DIEU_KIEN, không lỗi khuôn, bang-anh-em qua cổng 6–12 và vân tay mọi câu luật liên quan còn khớp.
//   CHUA: chưa có bản ghi nào thuộc nhóm (hàng đợi chỉ phát nhóm CHUA).
//   DO  : lỗi khuôn / trượt cổng 6–12 / vân tay câu luật đổi (chỉ mở lại đúng nút dính câu đổi).
//   node scripts/ho-so-ma/so-diem.mjs [--chuong 85] [--nhom 8543] [--hang-doi] [--kiem-nhom 8543] [--gioi-han 10] [--kiem-dong] [--json]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { napLuatCong, chayCong, vanTay } from './cong.mjs';
import { napBieuMeta, taoBangChoCha } from './bang-anh-em.mjs';
import { kiemKhoHoSo, kiemBangAnhEm, kiemBanGhi, LOAI_DIEU_KIEN } from './khuon.mjs';
import {
  chuanNhom4,
  thuThapCayNhom,
  dungGoiNhom,
  lietKeNhom4,
  docBangCanhTranhMd,
  DEFAULT_CANH_TRANH_MD,
} from './goi-nhom.mjs';

const require = createRequire(import.meta.url);
const G = require('../../lib/ho-so-ma/ghep.js');

const MO_CUA_NHOM = new Set(['DIEU_KIEN', 'GIAI_CHONG', 'CANH_TRANH']);

function locViDuTheoNhom(viDu, cayIds) {
  if (!Array.isArray(viDu) || !viDu.length) return [];
  return viDu.filter((vd) => {
    if (vd.cha && cayIds.has(vd.cha)) return true;
    if (vd.dich && cayIds.has(vd.dich)) return true;
    const ganKeys = Object.keys(vd.ganDieuKien || vd.gan || {});
    if (ganKeys.some((k) => {
      const m = /^hs:([^:]+(?::[^:]+)*):\d+$/.exec(k);
      return m && cayIds.has(m[1]);
    })) return true;
    return false;
  });
}

function locVungChongTheoNhom(vungChong, cayIds) {
  if (!Array.isArray(vungChong) || !vungChong.length) return [];
  return vungChong.filter((v) => (v.nut && cayIds.has(v.nut)) || (Array.isArray(v.cap) && v.cap.some((c) => cayIds.has(c))));
}

function chuanBiNguCanh(opts = {}) {
  const luat = opts.luat || G.LUAT_MAC_DINH;
  const hoSo = opts.hoSo || G.HO_SO_MAC_DINH;
  const L = opts.L || napLuatCong(luat);
  const bieuMeta = opts.bieuMeta || napBieuMeta(luat);
  const kho = opts.kho || kiemKhoHoSo(hoSo);
  const canhTranhMd = opts.canhTranhMd ?? DEFAULT_CANH_TRANH_MD;
  const canhTranhMap = opts.canhTranhMap || docBangCanhTranhMd(canhTranhMd);

  const dkTheoNhom = new Map();
  const gcTheoNhom = new Map();
  const ctTheoNhom = new Map();
  const hongTheoNhom = new Map();
  const nguongById = new Map();
  const dinhNghiaTheoCau = new Map();
  const bangAnhEmTheoCha = new Map();

  const layNhom4CuaNut = (nut) => {
    const m = /^bieu:(\d{4})/.exec(nut || '');
    return m ? m[1] : null;
  };

  for (const x of kho.banGhi || []) {
    if (x._hong) {
      if (MO_CUA_NHOM.has(x.loai)) {
        const n4 = layNhom4CuaNut(x.nut);
        if (n4) {
          if (!hongTheoNhom.has(n4)) hongTheoNhom.set(n4, []);
          hongTheoNhom.get(n4).push(x);
        }
      }
      continue;
    }
    if (x.loai === 'NGUONG') nguongById.set(x.id, x);
    else if (x.loai === 'DINH_NGHIA' && x.cau) {
      if (!dinhNghiaTheoCau.has(x.cau)) dinhNghiaTheoCau.set(x.cau, []);
      dinhNghiaTheoCau.get(x.cau).push(x);
    } else if (MO_CUA_NHOM.has(x.loai)) {
      const n4 = layNhom4CuaNut(x.nut);
      if (!n4) continue;
      const targetMap = x.loai === 'DIEU_KIEN' ? dkTheoNhom : (x.loai === 'GIAI_CHONG' ? gcTheoNhom : ctTheoNhom);
      if (!targetMap.has(n4)) targetMap.set(n4, []);
      targetMap.get(n4).push(x);
    }
  }

  for (const b of kho.bangAnhEm || []) {
    if (!b._hong && b.cha) bangAnhEmTheoCha.set(b.cha, b);
  }

  return {
    luat,
    hoSo,
    L,
    bieuMeta,
    kho,
    canhTranhMd,
    canhTranhMap,
    dkTheoNhom,
    gcTheoNhom,
    ctTheoNhom,
    hongTheoNhom,
    nguongById,
    dinhNghiaTheoCau,
    bangAnhEmTheoCha,
    viDu: opts.viDu || [],
    vungChong: opts.vungChong || [],
    batBuocTepBang: Boolean(opts.batBuocTepBang),
  };
}

/** Chấm điểm một nhóm 4 số thuần từ dữ liệu luật + hồ sơ. */
export function chamDiemNhom(nhom4HoacNut, ctx = {}) {
  const c = ctx.dkTheoNhom ? ctx : chuanBiNguCanh(ctx);
  const nhom4 = chuanNhom4(nhom4HoacNut);
  const nut = `bieu:${nhom4}`;
  const chuong = nhom4.slice(0, 2);

  const { cayBieu } = thuThapCayNhom(nhom4, c.L, c.bieuMeta);
  const cayIds = new Set(cayBieu.map((n) => n.id));

  const dieuKien = (c.dkTheoNhom.get(nhom4) || []).filter((x) => cayIds.has(x.nut));
  const giaiChong = (c.gcTheoNhom.get(nhom4) || []).filter((x) => cayIds.has(x.nut));
  const canhTranh = (c.ctTheoNhom.get(nhom4) || []).filter((x) => cayIds.has(x.nut));
  const hongTrongNhom = (c.hongTheoNhom.get(nhom4) || []).filter((x) => cayIds.has(x.nut));

  const tenNhom = cayBieu[0]?.ten || '';
  const coBanGhi = dieuKien.length + giaiChong.length + canhTranh.length + hongTrongNhom.length > 0;

  if (!coBanGhi) {
    return {
      nhom: nhom4,
      nut,
      chuong,
      ten: tenNhom,
      trangThai: 'CHUA',
      congLoi: [],
      loi: [],
      canhBao: [],
      cauDoiVanTay: [],
      nutCanMoLai: [],
      bangAnhEmCu: false,
      thongKe: {
        soNutCay: cayBieu.length,
        dieuKien: 0,
        giaiChong: 0,
        canhTranh: 0,
        chuaChungMinhTach: 0,
        nghiaThuong: 0,
        thieuViDu: 0,
      },
    };
  }

  // Dựng gói đọc để kiểm tra toàn bộ vân tay câu luật trong gói
  const goi = dungGoiNhom(nhom4, {
    luat: c.luat,
    hoSo: c.hoSo,
    L: c.L,
    bieuMeta: c.bieuMeta,
    kho: c.kho,
    canhTranhMap: c.canhTranhMap,
    canhTranhMd: c.canhTranhMd,
    maxBytes: Infinity,
  });

  const loiSet = new Set();
  const cauDoiVanTaySet = new Set();
  const nutMoLaiVanTaySet = new Set();

  for (const x of hongTrongNhom) {
    const errs = kiemBanGhi(x);
    if (errs.length) for (const e of errs) loiSet.add(e);
    else loiSet.add(`${x.id || x.nut}: bản ghi hỏng khuôn`);
  }

  // 1. Kiểm tra độ tươi vân tay trên mọi câu luật mà nhóm dẫn chiếu
  const ghiLechCau = (cauId, nutId, recId, lyDo) => {
    cauDoiVanTaySet.add(cauId);
    nutMoLaiVanTaySet.add(nutId);
    loiSet.add(`${recId || nutId}: ${lyDo} (${cauId})`);
  };

  // Thu thập vanTayCau từ bang-anh-em/<ch>.jsonl đã lưu trên đĩa (nếu có cho nhóm này)
  const vanTayCauNhom = new Map();
  for (const b of c.bangAnhEmTheoCha.values()) {
    if (!b.vanTayCau || typeof b.vanTayCau !== 'object') continue;
    const thuocNhom = cayIds.has(b.cha) || (b.anhEm || []).some((ae) => cayIds.has(ae.nut));
    if (!thuocNhom) continue;
    for (const [cid, vt] of Object.entries(b.vanTayCau)) {
      if (!vanTayCauNhom.has(cid)) vanTayCauNhom.set(cid, []);
      vanTayCauNhom.get(cid).push(vt);
    }
  }

  for (const r of dieuKien) {
    const chu = /^tb:/.test(r.nguon || '') ? null : c.L.chuCau(r.nguon);
    if (chu === null) {
      ghiLechCau(r.nguon, r.nut, r.id, 'nguon không còn trong kho luật');
    } else if (vanTay(chu) !== r.vanTay) {
      ghiLechCau(r.nguon, r.nut, r.id, 'vân tay câu nguon đã đổi');
    }
    if (r.moNguon !== undefined) {
      const mnIds = Array.isArray(r.moNguon) ? r.moNguon : [r.moNguon];
      for (const mnId of mnIds) {
        const mnChu = /^tb:/.test(mnId) ? null : c.L.chuCau(mnId);
        if (mnChu === null) {
          ghiLechCau(mnId, r.nut, r.id, 'moNguon không còn trong kho luật');
        } else {
          const dnList = c.dinhNghiaTheoCau.get(mnId) || [];
          const vtHienTai = vanTay(mnChu);
          const lechDn = dnList.some((dn) => dn.van && dn.van !== vtHienTai);
          const lechDk = (
            (typeof r.moNguonVanTay === 'string' && typeof r.moNguon === 'string' && r.moNguon === mnId && r.moNguonVanTay !== vtHienTai)
            || (Boolean(r.moNguonVanTay) && typeof r.moNguonVanTay === 'object' && Object.hasOwn(r.moNguonVanTay, mnId) && r.moNguonVanTay[mnId] !== vtHienTai)
          );
          const lechBang = (vanTayCauNhom.get(mnId) || []).some((vt) => vt !== vtHienTai);
          if (lechDn || lechDk || lechBang) {
            ghiLechCau(mnId, r.nut, r.id, 'vân tay câu moNguon đã đổi');
          }
        }
      }
    }
    if (r.tapDuNguon !== undefined) {
      const tdIds = Array.isArray(r.tapDuNguon) ? r.tapDuNguon : [r.tapDuNguon];
      for (const tdId of tdIds) {
        const tdChu = /^(?:tb|wco):/.test(tdId || '') ? null : c.L.chuCau(tdId);
        if (tdChu === null) {
          ghiLechCau(tdId, r.nut, r.id, 'tapDuNguon không còn trong kho luật');
        } else {
          const vtHienTai = vanTay(tdChu);
          const lechDk = (
            (typeof r.tapDuNguonVanTay === 'string' && typeof r.tapDuNguon === 'string' && r.tapDuNguon === tdId && r.tapDuNguonVanTay !== vtHienTai)
            || (Boolean(r.tapDuNguonVanTay) && typeof r.tapDuNguonVanTay === 'object' && Object.hasOwn(r.tapDuNguonVanTay, tdId) && r.tapDuNguonVanTay[tdId] !== vtHienTai)
          );
          const lechBang = (vanTayCauNhom.get(tdId) || []).some((vt) => vt !== vtHienTai);
          if (lechDk || lechBang) {
            ghiLechCau(tdId, r.nut, r.id, 'vân tay câu tapDuNguon đã đổi');
          }
        }
      }
    }
    if (r.kieu === 'SO' && r.nguong) {
      const ng = c.nguongById.get(r.nguong);
      if (ng?.cau) {
        const ngChu = c.L.chuCau(ng.cau);
        if (ngChu === null || (ng.van && vanTay(ngChu) !== ng.van)) {
          ghiLechCau(ng.cau, r.nut, r.id, `vân tay câu NGUONG ${ng.id} đã đổi`);
        }
      }
    }
  }

  for (const g of giaiChong) {
    const chu = /^tb:/.test(g.nguon || '') ? null : c.L.chuCau(g.nguon);
    if (chu === null) {
      ghiLechCau(g.nguon, g.nut, g.id, 'GIAI_CHONG nguon không còn trong kho luật');
    } else if (g.vanTay && vanTay(chu) !== g.vanTay) {
      ghiLechCau(g.nguon, g.nut, g.id, 'GIAI_CHONG vân tay câu đã đổi');
    }
  }

  for (const ct of canhTranh) {
    const chu = /^tb:/.test(ct.nguon || '') ? null : c.L.chuCau(ct.nguon);
    if (chu === null) {
      ghiLechCau(ct.nguon, ct.nut, ct.id, 'CANH_TRANH nguon không còn trong kho luật');
    } else if (ct.vanTay && vanTay(chu) !== ct.vanTay) {
      ghiLechCau(ct.nguon, ct.nut, ct.id, 'CANH_TRANH vân tay câu đã đổi');
    }
      for (const p of ct.phepThu || []) {
      const pNguon = typeof p === 'string' ? p : p?.nguon;
      if (pNguon && c.L.chuCau(pNguon) === null) {
        ghiLechCau(pNguon, ct.nut, ct.id, 'CANH_TRANH phepThu không còn trong kho luật');
      }
    }
  }

  for (const b of c.bangAnhEmTheoCha.values()) {
    if (!b.vanTayCau || typeof b.vanTayCau !== 'object') continue;
    const thuocNhom = cayIds.has(b.cha) || (b.anhEm || []).some((ae) => cayIds.has(ae.nut));
    if (!thuocNhom) continue;
    for (const [cid, vt] of Object.entries(b.vanTayCau)) {
      if (cauDoiVanTaySet.has(cid)) continue;
      const bChu = /^(?:tb|wco):/.test(cid || '') ? null : c.L.chuCau(cid);
      if (bChu === null) {
        ghiLechCau(cid, b.cha, `bang-anh-em(${b.cha})`, 'vanTayCau không còn trong kho luật');
      } else if (vanTay(bChu) !== vt) {
        ghiLechCau(cid, b.cha, `bang-anh-em(${b.cha})`, 'vân tay câu vanTayCau đã đổi');
      }
    }
  }

  // 2. Dựng bang-anh-em tươi từ dữ liệu hiện hành và kiểm tra tệp bang-anh-em/<chuong>.jsonl (nếu có)
  const dkTheoNut = new Map();
  for (const x of dieuKien) {
    if (!dkTheoNut.has(x.nut)) dkTheoNut.set(x.nut, []);
    dkTheoNut.get(x.nut).push(x);
  }
  const gcTheoCha = new Map();
  for (const x of giaiChong) {
    if (!gcTheoCha.has(x.nut)) gcTheoCha.set(x.nut, []);
    gcTheoCha.get(x.nut).push(x);
  }
  const ctTheoNut = new Map();
  for (const x of canhTranh) {
    if (!ctTheoNut.has(x.nut)) ctTheoNut.set(x.nut, []);
    ctTheoNut.get(x.nut).push(x);
  }

  const viDuNhom = locViDuTheoNhom(c.viDu, cayIds);
  const vungChongNhom = locVungChongTheoNhom(c.vungChong, cayIds);
  const duLieuBang = {
    bieuMeta: c.bieuMeta,
    dkTheoNut,
    giaiChongTheoCha: gcTheoCha,
    canhTranhTheoNut: ctTheoNut,
    nguongById: c.nguongById,
    viDu: viDuNhom,
    vungChong: vungChongNhom,
  };

  let bangAnhEmCu = false;
  const tepBang = path.join(c.hoSo, 'bang-anh-em', `${chuong}.jsonl`);
  const coTepBang = fs.existsSync(tepBang);
  for (const n of cayBieu) {
    if (G.conCua(n.id, c.L.cay).length < 2) continue;
    const fresh = taoBangChoCha(n.id, c.L, duLieuBang);
    const errBang = kiemBangAnhEm(fresh);
    for (const e of errBang) loiSet.add(e);
    if (coTepBang) {
      const cu = c.bangAnhEmTheoCha.get(n.id);
      if (!cu || cu.vanTay !== fresh.vanTay) {
        bangAnhEmCu = true;
      }
    }
  }
  if (c.batBuocTepBang && bangAnhEmCu) {
    loiSet.add(`${nut}: bang-anh-em/${chuong}.jsonl cũ hoặc thiếu bảng của nhóm`);
  }

  // 3. Chạy cổng 6..12 trên dữ liệu tươi (không đọc bảng anh em cũ trên đĩa)
  const rCong = chayCong({
    luat: c.luat,
    hoSo: c.hoSo,
    phamVi: [nhom4],
    chiTrong: true,
    cong: [6, 7, 8, 9, 10, 11, 12],
    L: c.L,
    kho: c.kho,
    bieuMeta: c.bieuMeta,
    dungBangTrongKho: false,
    viDu: viDuNhom,
    vungChong: vungChongNhom,
  });

  const congLoi = [];
  const canhBao = [];
  const nutLoiCongSet = new Set();
  for (const k of [6, 7, 8, 9, 10, 11, 12]) {
    const gk = rCong.cong[k];
    if (!gk) continue;
    if (gk.loi?.length) {
      congLoi.push(k);
      for (const msg of gk.loi) {
        loiSet.add(`[Cổng ${k}] ${msg}`);
        const matches = msg.match(/bieu:\d{4,8}(?::td\d+)*/g);
        if (matches) {
          for (const mId of matches) {
            if (cayIds.has(mId)) nutLoiCongSet.add(mId);
          }
        }
      }
    }
    for (const cb of gk.canhBao || []) canhBao.push(`[Cổng ${k}] ${cb}`);
  }

  const cauDoiVanTay = [...cauDoiVanTaySet].sort();
  // Nếu có câu luật đổi vân tay -> chỉ mở lại ĐÚNG các nút dính câu đổi; nếu lỗi cổng thuần -> liệt kê nút lỗi cổng
  const nutCanMoLai = cauDoiVanTay.length > 0
    ? [...nutMoLaiVanTaySet].sort()
    : [...nutLoiCongSet].sort();

  const trangThai = (
    dieuKien.length > 0
    && hongTrongNhom.length === 0
    && congLoi.length === 0
    && cauDoiVanTay.length === 0
    && (!c.batBuocTepBang || !bangAnhEmCu)
  ) ? 'DONG' : 'DO';

  return {
    nhom: nhom4,
    nut,
    chuong,
    ten: tenNhom,
    trangThai,
    congLoi,
    loi: [...loiSet],
    canhBao,
    cauDoiVanTay,
    nutCanMoLai,
    bangAnhEmCu,
    vanTayGoi: goi.vanTayGoi,
    thongKe: {
      soNutCay: cayBieu.length,
      dieuKien: dieuKien.length,
      giaiChong: giaiChong.length,
      canhTranh: canhTranh.length,
      chuaChungMinhTach: rCong.cong[8]?.dem?.chuaChungMinhTach || 0,
      nghiaThuong: rCong.cong[11]?.dem?.nghiaThuong || 0,
      thieuViDu: rCong.cong[10]?.thieuViDu || 0,
    },
  };
}

/** Chấm điểm toàn bộ nhóm 4 số trong một chương hoặc toàn biểu (hoặc một nhóm cụ thể). */
export function chamSoDiem(opts = {}) {
  const ctx = chuanBiNguCanh(opts);
  const chuong = opts.chuong !== undefined && opts.chuong !== null
    ? String(opts.chuong).padStart(2, '0')
    : null;
  if (chuong !== null && !/^\d{2}$/.test(chuong)) {
    throw new Error(`Mã chương không hợp lệ: "${opts.chuong}"`);
  }
  const nhomList = Array.isArray(opts.nhom)
    ? opts.nhom.map(chuanNhom4)
    : (opts.nhom ? String(opts.nhom).split(',').map((s) => s.trim()).filter(Boolean).map(chuanNhom4) : null);
  const dsNhom = nhomList && nhomList.length
    ? [...new Set(nhomList)]
    : lietKeNhom4({ chuong, luat: ctx.luat, L: ctx.L });

  const nhom = dsNhom.map((n) => chamDiemNhom(n, ctx));
  const dong = nhom.filter((x) => x.trangThai === 'DONG').length;
  const chua = nhom.filter((x) => x.trangThai === 'CHUA').length;
  const doCount = nhom.filter((x) => x.trangThai === 'DO').length;

  return {
    khuon: 'so-diem@1',
    chuong,
    tongNhom: nhom.length,
    dong,
    chua,
    do: doCount,
    loiKho: ctx.kho.loi.filter((l) => /^dieu-kien\//.test(l)),
    nhom,
  };
}

/** Phát hàng đợi các nhóm `CHUA` theo thứ tự tất định (tuyệt đối không phát nhóm DONG hay DO). */
export function layHangDoi(opts = {}) {
  const res = chamSoDiem(opts);
  const chuaList = res.nhom.filter((x) => x.trangThai === 'CHUA');
  const gioiHan = Number.isInteger(opts.gioiHan) && opts.gioiHan > 0
    ? opts.gioiHan
    : (opts.gioiHan ? Number.parseInt(opts.gioiHan, 10) : null);
  const hangDoi = gioiHan && gioiHan > 0 ? chuaList.slice(0, gioiHan) : chuaList;
  return {
    tongNhom: res.tongNhom,
    dong: res.dong,
    chua: res.chua,
    do: res.do,
    hangDoi,
  };
}

function docDanhSachTuyChon(tep) {
  if (!tep) return [];
  const raw = fs.readFileSync(path.resolve(tep), 'utf8').trim();
  if (!raw) return [];
  if (raw.startsWith('[')) return JSON.parse(raw);
  return raw.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
}

function main() {
  const a = process.argv.slice(2);
  const lay = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  const luat = path.resolve(lay('--luat') || G.LUAT_MAC_DINH);
  const hoSo = path.resolve(lay('--ho-so') || G.HO_SO_MAC_DINH);
  const canhTranhMd = lay('--canh-tranh') ? path.resolve(lay('--canh-tranh')) : DEFAULT_CANH_TRANH_MD;
  const chuong = lay('--chuong');
  const nhomArg = lay('--kiem-nhom') || lay('--nhom');
  const gioiHan = lay('--gioi-han');
  const hangDoiMode = a.includes('--hang-doi');
  const kiemDong = a.includes('--kiem-dong');
  const jsonMode = a.includes('--json');
  const batBuocTepBang = a.includes('--bat-buoc-tep-bang');
  const viDu = docDanhSachTuyChon(lay('--vi-du'));
  const vungChong = docDanhSachTuyChon(lay('--vung-chong'));

  if (chuong !== null && !/^\d{1,2}$/.test(String(chuong))) {
    console.error(`Mã chương không hợp lệ: "${chuong}"`);
    process.exit(2);
  }
  let dsNhomCli = null;
  if (nhomArg !== null) {
    try {
      dsNhomCli = String(nhomArg).split(',').map((s) => s.trim()).filter(Boolean).map(chuanNhom4);
      if (!dsNhomCli.length) throw new Error(`Mã nhóm 4 số không hợp lệ: "${nhomArg}"`);
    } catch (err) {
      console.error(err.message);
      process.exit(2);
    }
  }

  if (hangDoiMode) {
    const q = layHangDoi({ luat, hoSo, chuong, nhom: dsNhomCli, gioiHan, canhTranhMd, viDu, vungChong, batBuocTepBang });
    if (jsonMode) {
      console.log(JSON.stringify(q, null, 2));
    } else {
      console.log(`Hàng đợi CHUA: ${q.hangDoi.length}/${q.chua} nhóm (DONG=${q.dong}, DO=${q.do}, tổng=${q.tongNhom})`);
      for (const item of q.hangDoi) console.log(`  - ${item.nhom} (${item.ten.slice(0, 80)})`);
    }
    process.exit(kiemDong && q.do > 0 ? 1 : 0);
  }

  const res = chamSoDiem({ luat, hoSo, chuong, nhom: dsNhomCli, canhTranhMd, viDu, vungChong, batBuocTepBang });
  if (jsonMode) {
    console.log(JSON.stringify(res, null, 2));
  } else if (dsNhomCli && dsNhomCli.length === 1) {
    const r = res.nhom[0];
    console.log(`${r.trangThai} ${r.nhom} (${r.nut}): DIEU_KIEN=${r.thongKe.dieuKien}, GIAI_CHONG=${r.thongKe.giaiChong}, CANH_TRANH=${r.thongKe.canhTranh}, congLoi=[${r.congLoi.join(',')}]`);
    if (r.cauDoiVanTay.length) console.log(`  câu đổi vân tay: ${r.cauDoiVanTay.join(', ')}`);
    if (r.nutCanMoLai.length) console.log(`  nút cần mở lại: ${r.nutCanMoLai.join(', ')}`);
    for (const l of r.loi.slice(0, 30)) console.log(`  ✗ ${l}`);
  } else {
    console.log(`Sổ điểm${res.chuong ? ` Chương ${res.chuong}` : ''}: tổng ${res.tongNhom} | DONG=${res.dong} | CHUA=${res.chua} | DO=${res.do}`);
    for (const item of res.nhom.filter((x) => x.trangThai === 'DO').slice(0, 30)) {
      console.log(`  ✗ DO ${item.nhom} congLoi=[${item.congLoi.join(',')}] nutMoLai=[${item.nutCanMoLai.join(',')}]`);
    }
  }
  if (kiemDong && (res.do > 0 || res.loiKho.length > 0)) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
