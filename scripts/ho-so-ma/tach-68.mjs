#!/usr/bin/env node
// scripts/ho-so-ma/tach-68.mjs — M-76 (#1968): Tách vấn đề cấp 6 và 8 số (TACH_ANH_EM, "Loại khác" phủ định, SEN, chú giải phân nhóm).
//
// Nguyên tắc (ADR-0006, #1968):
// - Chỉ từ luật gốc (data/luat-goc): tên dòng biểu thuế (bieu), chú giải phân nhóm (phan-nhom), chú giải SEN (sen).
// - CẤM: dữ liệu khách, tờ khai, tiền lệ (tb:), ý kiến WCO (wco:), lời AI tự nghĩ.
// - Dòng "Loại khác": máy sinh 100% tất định, phủ định toàn bộ anh em có tên cùng cấp (ghi `phuDinh` vào `ghiChu` theo khuôn main hiện hành).
// - Không chép lại ngưỡng số M-74 (`NGUONG`) hay vấn đề chỉ liệt kê M-75 (`CHI_LIET_KE`); không lấy thông số hàng ví dụ/mẫu trong SEN.
// - Mặc định chỉ ghi vào `data/ho-so-ma/phan-nhom/*.jsonl` và `data/ho-so-ma/dong/*.jsonl` (đúng phạm vi M-76 trong `docs/mong/phan-cong.json`);
//   truyền `--gom-tieu-de-5` nếu QT mở [M-01] cho phép ghi tiêu đề 5 số vào `nhom/`.
//
// Dùng:
//   node scripts/ho-so-ma/tach-68.mjs --chuong 76 --tao
//   node scripts/ho-so-ma/tach-68.mjs --chuong 76 --kiem
//   node scripts/ho-so-ma/tach-68.mjs --chuong 76 --bao-cao

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { napLuatCong, vanTay, chuanSo, chayCong } from './cong.mjs';
import { kiemBanGhi } from './khuon.mjs';

const require = createRequire(import.meta.url);
const G = require('../../lib/ho-so-ma/ghep.js');

const RE_LOAI_KHAC = /^(?:loại\s+khác|khác)$/iu;
const RE_CAU_VI_DU_SEN = /(?:tấm\s+ultratouch|trọng\s+lượng\s+\d|thuộc\s+tính\s+nhiệt\s*:|chúng\s+có\s+thể\s+ở\s+dạng|ví\s+dụ\s+như\s+mẫu)/iu;

/** Bỏ dấu gạch đầu dòng biểu thuế ("- - - ") và dấu ":" cuối, giữ nguyên văn chữ bên trong. */
export function boGachTen(ten) {
  return String(ten || '')
    .replace(/^[\s\u00a0\-–—]+/u, '')
    .replace(/\s*:\s*$/u, '')
    .trim();
}

/** Kiểm tra tên dòng có phải dòng dư "Loại khác" thuần (không kèm điều kiện bổ sung) hay không. */
export function laLoaiKhac(ten) {
  return RE_LOAI_KHAC.test(boGachTen(ten));
}

/** Kiểm tra một câu SEN có phải câu mô tả thông số sản phẩm ví dụ/mẫu (không làm điều kiện phân loại) hay không. */
export function laCauViDuSen(cau) {
  return RE_CAU_VI_DU_SEN.test(String(cau || ''));
}

/** Kiểm tra ngoặc đơn cân bằng trong một cụm dữ kiện. */
function ngoacCanBang(s) {
  let d = 0;
  for (const ch of s) {
    if (ch === '(') d += 1;
    else if (ch === ')') {
      d -= 1;
      if (d < 0) return false;
    }
  }
  return d === 0;
}

/** Cắt chuỗi theo ranh giới từ (không cắt giữa chừng một từ). */
function catTheoTu(s, max) {
  const clean = String(s || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const idx = cut.lastIndexOf(' ');
  return (idx > Math.floor(max * 0.5) ? cut.slice(0, idx) : cut).trim();
}

/** Rút 1–3 cụm dữ kiện ngắn nguyên văn từ đoạn trích (đảm bảo luôn khớp cổng 4, không lệch ngoặc). */
export function rutDuKienTuTrich(trich, chuCau) {
  const s = String(trich || '').trim();
  const csCau = chuanSo(chuCau).toLowerCase();
  if (!s) return [];
  if (laLoaiKhac(s)) {
    return csCau.includes(chuanSo(s).toLowerCase()) ? [s] : [];
  }
  const boSen = s
    .replace(/\s*\(SEN\)\s*$/iu, '')
    .replace(/^\(\d+\)\s+/u, '')
    .trim();
  const phan = boSen
    .split(/[;,]|\s+nhưng\s+/iu)
    .map((p) => p.replace(/^[\s:\-–—]+|[\s:\-–—.]+$/g, '').trim())
    .map((p) => {
      if (ngoacCanBang(p)) return p;
      // Nếu tách trúng giữa cụm ngoặc đơn, lấy phần trước dấu '(' hoặc bỏ ngoặc lẻ ở rìa nếu vẫn còn trong câu
      const truocMo = p.split('(')[0].replace(/[\s:\-–—.]+$/g, '').trim();
      if (truocMo.length >= 3 && ngoacCanBang(truocMo) && csCau.includes(chuanSo(truocMo).toLowerCase())) return truocMo;
      const boRia = p.replace(/^[()]+|[()]+$/g, '').trim();
      return ngoacCanBang(boRia) ? boRia : '';
    })
    .filter((p) => p.length >= 3 && p.length <= 70 && ngoacCanBang(p) && csCau.includes(chuanSo(p).toLowerCase()));
  const kq = [];
  const daCo = new Set();
  for (const p of phan) {
    const k = p.toLowerCase();
    if (daCo.has(k)) continue;
    daCo.add(k);
    kq.push(p);
    if (kq.length >= 3) break;
  }
  if (!kq.length && boSen) {
    const gon = catTheoTu(boSen, 70);
    if (gon && csCau.includes(chuanSo(gon).toLowerCase())) kq.push(gon);
  }
  return kq;
}

/** Rút gọn điều kiện cho một dòng để không vượt quá giới hạn 300 ký tự của khuôn. */
function catGon(s, max = 285) {
  const clean = String(s || '').replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${catTheoTu(clean, max - 1)}…`;
}

/** Kiểm tra một dòng trong câu SEN có phải dòng tiêu đề in hoa (cho phép đơn vị đo như 1m, mm, cm) hay không. */
function laDongTieuDeSen(dong) {
  const t = dong.trim();
  if (!t) return true;
  if (/^\d{4}\.\d{2}\.\d{2}$/.test(t)) return true;
  // Bỏ số + đơn vị đo thường gặp (1m, 2mm, 5cm, 10kW...) trước khi kiểm chữ thường
  const boDonVi = t.replace(/\b\d+(?:[.,]\d+)?\s*(?:mm|cm|dm|km|m|kg|g|mg|ml|l|kw|w|v|a|hz|%)\b/giu, '');
  return !/[a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/u.test(boDonVi);
}

/** Cắt phần tiêu đề IN HOA đầu câu SEN #1 (ví dụ "7610.90.30 MÁI PHAO ... Mái phao của...") để lấy phần định nghĩa nguyên văn. */
export function catDinhNghiaSen(chuCau) {
  const raw = String(chuCau || '').replace(/\s*\(Nguồn:[^)]+\)\s*$/u, '').trim();
  // Nếu câu có xuống dòng giữa mã / tiêu đề IN HOA / phần định nghĩa, bỏ các dòng tiêu đề đầu
  if (raw.includes('\n')) {
    const dongs = raw.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
    let i = 0;
    while (i < dongs.length && laDongTieuDeSen(dongs[i])) i += 1;
    if (i > 0 && i < dongs.length) {
      return dongs.slice(i).join(' ').replace(/\s+/g, ' ').trim();
    }
  }
  const s = raw.replace(/\s+/g, ' ').trim();
  const m = /^\d{4}\.\d{2}\.\d{2}\s+[^a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]+?([A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ][a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ][\s\S]+)$/.exec(s);
  if (m && m[1]) return m[1].trim();
  return s;
}

/** Dựng bản ghi cho một nút con cùng cấp (dùng chung cho cả kho thật và bài kiểm đơn vị). */
export function taoBanGhiAnhEm({
  nut,
  ten,
  cauId,
  chuCau,
  lop,
  nguon,
  anhEm,
  tenAnhEmTheoId,
  soThuTu = 7601,
}) {
  const van = vanTay(chuCau);
  const id = `hs:${nut}:${soThuTu}`;
  const sach = boGachTen(ten);
  const voi = [...anhEm].sort();

  // 1. Dòng "Loại khác": máy sinh phủ định toàn bộ anh em có tên cùng cấp
  if (laLoaiKhac(ten)) {
    const anhEmCoTen = voi.filter((ae) => !laLoaiKhac(tenAnhEmTheoId.get(ae) || ''));
    const tomTatTen = anhEmCoTen
      .map((ae) => {
        const t = boGachTen(tenAnhEmTheoId.get(ae) || ae).replace(/\s*\(SEN\)\s*$/iu, '').trim();
        return t.length > 48 ? `${catTheoTu(t, 47)}…` : t;
      })
      .join('; ');
    const tienTo = `Loại khác (${nut.replace(/^bieu:/, '')}): không thuộc các anh em có tên cùng cấp (`;
    const maxTomTat = Math.max(40, 284 - tienTo.length);
    const tomTatGon = tomTatTen.length <= maxTomTat ? tomTatTen : `${catTheoTu(tomTatTen, maxTomTat - 1)}…`;
    const dieuKien = anhEmCoTen.length
      ? `${tienTo}${tomTatGon})`
      : `Loại khác (${nut.replace(/^bieu:/, '')}): phần còn lại ngoài các anh em cùng cấp`;
    const trich = chuanSo(chuCau).includes(chuanSo(sach)) ? sach : 'khác';
    return {
      id,
      nut,
      loai: 'TACH_ANH_EM',
      dieuKien,
      trich,
      cau: cauId,
      voi,
      duKien: rutDuKienTuTrich(trich, chuCau),
      lop,
      nguon,
      van,
      trangThai: 'KHOP',
      ghiChu: `phuDinh: ${anhEmCoTen.join(', ')}`,
    };
  }

  // 2. Dòng có tên: kiểm xem có trùng nguyên văn với anh em nào không (nếu trùng → VENH, không tự bịa điểm tách)
  const trungTenAnhEm = voi.some(
    (ae) => boGachTen(tenAnhEmTheoId.get(ae) || '').toLowerCase() === sach.toLowerCase()
  );
  const trich = chuanSo(chuCau).includes(chuanSo(sach)) ? sach : chuCau.trim();
  const maNgan = nut.replace(/^bieu:/, '');
  const dieuKien = catGon(
    trungTenAnhEm
      ? `Vênh: dòng ${maNgan} trùng tên với anh em cùng cấp ("${trich}"), chưa có câu luật tách riêng`
      : `Thuộc nhánh ${maNgan} khi hàng đáp ứng mô tả phân tách cùng cấp: ${trich}`
  );

  return {
    id,
    nut,
    loai: 'TACH_ANH_EM',
    dieuKien,
    trich,
    cau: cauId,
    voi,
    duKien: rutDuKienTuTrich(trich, chuCau),
    lop,
    nguon,
    van,
    trangThai: trungTenAnhEm ? 'VENH' : 'KHOP',
    ...(trungTenAnhEm ? { ghiChu: 'Chưa có câu luật phân biệt với anh em trùng tên — cần QT rà' } : {}),
  };
}

/** Dựng toàn bộ bản ghi M-76 (cấp phân nhóm 6 số, tiêu đề 7 số, dòng 8 số; tuỳ chọn tiêu đề 5 số) cho một Chương. */
export function dungHoSoChuong68(chuong, { luat = G.LUAT_MAC_DINH, gomTieuDe5 = false, L = null } = {}) {
  const cc = String(chuong || '').padStart(2, '0');
  if (!/^\d{2}$/.test(cc)) throw new Error(`Mã chương không hợp lệ: "${chuong}"`);
  L = L || napLuatCong(luat);

  const reNut = new RegExp(`^bieu:${cc}`);
  const dsNut = [...L.cay.theoId.values()]
    .filter((n) => reNut.test(n.id))
    .sort((a, b) => a.id.localeCompare(b.id));

  const theoTep = new Map(); // "phan-nhom/760519.jsonl" | "dong/76051910.jsonl" -> records[]
  const tieuDe5BoQua = [];
  const thongKe = {
    chuong: cc,
    tongBanGhi: 0,
    tachAnhEm: 0,
    loaiKhacPhuDinh: 0,
    boQuaConDon: 0,
    senVanDe: 0,
    phanNhomCtVanDe: 0,
    venh: 0,
    tieuDe5NgoaiPhamVi: 0,
  };

  const them = (nutId, banGhi) => {
    const thuMuc = G.thuMucCuaNut(nutId);
    const khoa = G.tepCuaNut(nutId, thuMuc);
    if (!thuMuc || !khoa) throw new Error(`Không xác định được tệp cho nút ${nutId}`);
    const tep = `${thuMuc}/${khoa}.jsonl`;
    if (!theoTep.has(tep)) theoTep.set(tep, []);
    theoTep.get(tep).push(banGhi);
    thongKe.tongBanGhi += 1;
  };

  // Bản đồ câu SEN & chú giải phân nhóm theo mã nút biểu
  const senTheoMa = new Map();
  const pnTheoMa = new Map();
  for (const cauId of L.cau.keys()) {
    const ms = /^sen:(\d{8}):\d+#(\d+)$/.exec(cauId);
    if (ms && ms[1].startsWith(cc)) {
      const k = `bieu:${ms[1]}`;
      if (!senTheoMa.has(k)) senTheoMa.set(k, []);
      senTheoMa.get(k).push(cauId);
    }
    const mp = /^pn:(\d{6}):ct:\d+#(\d+)$/.exec(cauId);
    if (mp && mp[1].startsWith(cc)) {
      const k = `bieu:${mp[1]}`;
      if (!pnTheoMa.has(k)) pnTheoMa.set(k, []);
      pnTheoMa.get(k).push(cauId);
    }
  }

  for (const n of dsNut) {
    const cap = G.capCuaNut(n.id);
    if (cap === 'CHUONG' || cap === 'NHOM') continue;
    if (cap === 'TIEU_DE_5' && !gomTieuDe5) {
      thongKe.tieuDe5NgoaiPhamVi += 1;
      tieuDe5BoQua.push({ nut: n.id, ten: n.ten, thuMucDich: `${G.thuMucCuaNut(n.id)}/${G.tepCuaNut(n.id, G.thuMucCuaNut(n.id))}.jsonl` });
      continue;
    }

    const cauId = `${n.id}#1`;
    const chuCau = L.chuCau(cauId);
    const nNguon = L.nut.get(n.id);
    if (chuCau === null || !nNguon) continue;

    const anhEm = G.anhEmCua(n.id, L.cay);
    if (anhEm.length === 0) {
      // Con duy nhất lặp tên cha: ghi BO_QUA để qua cổng 1 ĐỦ mà không nhân bản điều kiện của cha (ADR-0006)
      const cha = G.trenCua(n.id, L.cay).at(-1) || 'cấp cha';
      them(n.id, {
        id: `hs:${n.id}:7601`,
        nut: n.id,
        loai: 'BO_QUA',
        cau: cauId,
        lyDo: `Dòng con duy nhất lặp lại tên cấp cha (${cha}), không phát sinh điều kiện tách mới (ADR-0006 ghép theo đường đi)`,
        van: vanTay(chuCau),
      });
      thongKe.boQuaConDon += 1;
    } else {
      const tenAnhEmTheoId = new Map();
      for (const ae of anhEm) tenAnhEmTheoId.set(ae, L.cay.theoId.get(ae)?.ten || '');
      const bg = taoBanGhiAnhEm({
        nut: n.id,
        ten: n.ten,
        cauId,
        chuCau,
        lop: nNguon.lop,
        nguon: nNguon.nguon,
        anhEm,
        tenAnhEmTheoId,
        soThuTu: 7601,
      });
      them(n.id, bg);
      thongKe.tachAnhEm += 1;
      if (laLoaiKhac(n.ten)) thongKe.loaiKhacPhuDinh += 1;
      if (bg.trangThai === 'VENH') thongKe.venh += 1;
    }

    // Bổ sung vấn đề từ chú giải SEN (chỉ câu định nghĩa/đặc điểm chính, bỏ qua câu ví dụ/thông số mẫu)
    const dsSen = (senTheoMa.get(n.id) || []).sort((a, b) => Number(a.split('#')[1]) - Number(b.split('#')[1]));
    if (dsSen.length) {
      const cau1 = dsSen[0];
      const chu1 = L.chuCau(cau1);
      const nSen = L.nut.get(cau1.split('#')[0]);
      if (chu1 && nSen && !laCauViDuSen(chu1)) {
        const dinhNghia = catDinhNghiaSen(chu1);
        const trich = chuanSo(chu1).includes(chuanSo(dinhNghia)) ? dinhNghia : chu1.trim();
        them(n.id, {
          id: `hs:${n.id}:7602`,
          nut: n.id,
          loai: 'DINH_NGHIA',
          dieuKien: catGon(`Chú giải SEN ${n.id.replace(/^bieu:/, '')}: ${trich}`),
          trich,
          cau: cau1,
          duKien: rutDuKienTuTrich(trich, chu1),
          lop: nSen.lop,
          nguon: nSen.nguon,
          van: vanTay(chu1),
          trangThai: 'KHOP',
          ghiChu: `nguon_sen: ${cau1.split('#')[0]}`,
        });
        thongKe.senVanDe += 1;
      }
    }

    // Bổ sung chú giải phân nhóm (pn:<6so>:ct:1) nếu có
    const dsPn = (pnTheoMa.get(n.id) || []).sort((a, b) => Number(a.split('#')[1]) - Number(b.split('#')[1]));
    if (dsPn.length) {
      let seq = 7610;
      for (const cauPn of dsPn) {
        const chuPn = L.chuCau(cauPn);
        const nPn = L.nut.get(cauPn.split('#')[0]);
        if (!chuPn || !nPn) continue;
        // Chỉ lấy câu đầu (mở phạm vi cho phép) và các mục đánh số "(1)", "(2)", "(3)", "(4)"
        const soCau = Number(cauPn.split('#')[1]);
        const laMuc = /^\(\d+\)\s/.test(chuPn.trim());
        if (soCau !== 1 && !laMuc) continue;
        const sachPn = chuPn.replace(/^Phân\s+nhóm\s+\d{4}\s*\d{2}\s*/iu, '').replace(/\s+/g, ' ').trim();
        const trich = sachPn && chuanSo(chuPn).includes(chuanSo(sachPn)) ? sachPn : chuPn.replace(/\s+/g, ' ').trim();
        them(n.id, {
          id: `hs:${n.id}:${seq}`,
          nut: n.id,
          loai: 'PHAI_LA',
          dieuKien: catGon(`Chú giải phân nhóm ${n.id.replace(/^bieu:/, '')}: ${trich}`),
          trich,
          cau: cauPn,
          duKien: rutDuKienTuTrich(trich, chuPn),
          lop: nPn.lop,
          nguon: nPn.nguon,
          van: vanTay(chuPn),
          trangThai: 'KHOP',
        });
        seq += 1;
        thongKe.phanNhomCtVanDe += 1;
      }
    }
  }

  return { theoTep, tieuDe5BoQua, thongKe };
}

/** Kiểm toàn bộ dòng "Loại khác" phải có ghi chú phuDinh chứa đủ anh em có tên cùng cấp và không tự phủ định chính mình. */
export function kiemPhuDinhChuong(theoTep, L) {
  const loi = [];
  for (const [tep, ds] of theoTep.entries()) {
    for (const r of ds) {
      if (r.loai !== 'TACH_ANH_EM') continue;
      const ten = L.cay.theoId.get(r.nut)?.ten || '';
      if (!laLoaiKhac(ten)) continue;
      const m = /^phuDinh:\s*(.+)$/.exec(String(r.ghiChu || '').trim());
      if (!m) {
        loi.push(`${tep}: ${r.id} (Loại khác) thiếu ghiChu "phuDinh: …"`);
        continue;
      }
      const dsPhuDinh = m[1].split(',').map((s) => s.trim()).filter(Boolean);
      const anhEmCoTen = G.anhEmCua(r.nut, L.cay)
        .filter((ae) => !laLoaiKhac(L.cay.theoId.get(ae)?.ten || ''))
        .sort();
      if (dsPhuDinh.includes(r.nut)) {
        loi.push(`${tep}: ${r.id} tự đưa chính mình vào phuDinh`);
      }
      for (const ae of anhEmCoTen) {
        if (!dsPhuDinh.includes(ae)) loi.push(`${tep}: ${r.id} thiếu anh em có tên ${ae} trong phuDinh`);
      }
    }
  }
  return loi;
}

/** Ghi các tệp JSONL ra thư mục data/ho-so-ma. */
export function ghiHoSo(theoTep, thuMucHoSo = G.HO_SO_MAC_DINH) {
  const daGhi = [];
  for (const [tepTuongDoi, ds] of [...theoTep.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const duongDan = path.join(thuMucHoSo, tepTuongDoi);
    fs.mkdirSync(path.dirname(duongDan), { recursive: true });
    const noiDung = `${ds.map((x) => JSON.stringify(x)).join('\n')}\n`;
    fs.writeFileSync(duongDan, noiDung, 'utf8');
    daGhi.push(tepTuongDoi);
  }
  return daGhi;
}

function main() {
  const a = process.argv.slice(2);
  const lay = (k) => {
    const i = a.indexOf(k);
    return i >= 0 && a[i + 1] ? a[i + 1] : null;
  };
  const chuong = lay('--chuong') || '76';
  const luat = path.resolve(lay('--luat') || G.LUAT_MAC_DINH);
  const hoSo = path.resolve(lay('--ho-so') || G.HO_SO_MAC_DINH);
  const gomTieuDe5 = a.includes('--gom-tieu-de-5');
  const L = napLuatCong(luat);

  const kq = dungHoSoChuong68(chuong, { luat, gomTieuDe5, L });

  if (a.includes('--tao')) {
    const daGhi = ghiHoSo(kq.theoTep, hoSo);
    console.log(`Đã ghi ${daGhi.length} tệp (${kq.thongKe.tongBanGhi} bản ghi) cho Chương ${kq.thongKe.chuong}.`);
  }

  // Kiểm hình thức + phủ định + cổng 4, 5
  const loiKhuon = [];
  for (const [tep, ds] of kq.theoTep.entries()) {
    for (const r of ds) {
      for (const e of kiemBanGhi(r)) loiKhuon.push(`${tep}: ${e}`);
    }
  }
  const loiPhuDinh = kiemPhuDinhChuong(kq.theoTep, L);

  if (a.includes('--bao-cao') || (!a.includes('--tao') && !a.includes('--kiem'))) {
    console.log(JSON.stringify({ thongKe: kq.thongKe, soTep: kq.theoTep.size, tieuDe5BoQua: kq.tieuDe5BoQua, loiKhuon: loiKhuon.length, loiPhuDinh: loiPhuDinh.length }, null, 2));
  }

  if (a.includes('--kiem')) {
    const congKq = chayCong({ luat, hoSo, phamVi: [kq.thongKe.chuong], chiTrong: true, cong: [4, 5], L });
    const tongLoi = loiKhuon.length + loiPhuDinh.length + congKq.khuon.length + congKq.cong[4].loi.length + congKq.cong[5].loi.length;
    console.log(`${tongLoi === 0 ? 'PASS' : 'FAIL'} M-76 Chương ${kq.thongKe.chuong}: ${kq.thongKe.tongBanGhi} bản ghi, ${kq.theoTep.size} tệp | khuôn=${loiKhuon.length + congKq.khuon.length} | phủ định=${loiPhuDinh.length} | cổng4=${congKq.cong[4].loi.length} | cổng5=${congKq.cong[5].loi.length}`);
    for (const e of [...loiKhuon, ...loiPhuDinh, ...congKq.khuon, ...congKq.cong[4].loi, ...congKq.cong[5].loi].slice(0, 30)) {
      console.log(`  ✗ ${e}`);
    }
    process.exit(tongLoi === 0 ? 0 : 1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
