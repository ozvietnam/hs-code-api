#!/usr/bin/env node
// scripts/ho-so-ma/so-phieu-dieu-kien.mjs — M-81 (#2410, ADR-0007): đối chiếu tất định hai phiếu DIEU_KIEN độc lập -> KHOP / LECH_PHIEU.
// Không gọi LLM, không mạng.
//   node scripts/ho-so-ma/so-phieu-dieu-kien.mjs --phieu-1 <p1.jsonl> --phieu-2 <p2.jsonl> [--out <out.jsonl>] [--bao-cao] [--strict]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chuanSo } from './cong.mjs';

const trichChuan = (s) => chuanSo(s).toLowerCase();

function trichChongNhau(a, b) {
  const ta = trichChuan(a.trich);
  const tb = trichChuan(b.trich);
  if (!ta || !tb) return false;
  if (ta === tb || ta.includes(tb) || tb.includes(ta)) return true;
  if (a.kieu === 'SO' && b.kieu === 'SO' && a.nguong && a.nguong === b.nguong) return true;
  return false;
}

function tapGiongNhau(a, b) {
  const sa = [...new Set((a || []).map((x) => chuanSo(x).toLowerCase()))].sort();
  const sb = [...new Set((b || []).map((x) => chuanSo(x).toLowerCase()))].sort();
  return sa.length === sb.length && sa.every((v, i) => v === sb[i]);
}

const normMoNguon = (v) => (Array.isArray(v) ? v : (v ? [v] : [])).map((x) => chuanSo(x)).filter(Boolean).sort();
const moNguonGiongNhau = (a, b) => {
  const sa = normMoNguon(a);
  const sb = normMoNguon(b);
  return sa.length === sb.length && sa.every((v, i) => v === sb[i]);
};
const fmtMoNguon = (v) => (normMoNguon(v).join(',') || '(thiếu)');

function diemGiong(a, b) {
  if (a.nut !== b.nut || a.nguon !== b.nguon) return -1;
  if (!trichChongNhau(a, b)) return -1;
  let diem = 1;
  const ta = trichChuan(a.trich);
  const tb = trichChuan(b.trich);
  if (ta && ta === tb) diem += 2;
  if (a.phu === b.phu) diem += 1;
  if (a.kieu === b.kieu) diem += 1;
  if (a.mo === b.mo) diem += 1;
  if (a.ve === b.ve) diem += 1;
  if (a.kieu === 'SO' && a.nguong === b.nguong) diem += 1;
  if (a.kieu === 'GIA_TRI' && b.kieu === 'GIA_TRI') {
    if (a.truc && b.truc && chuanSo(a.truc).toLowerCase() === chuanSo(b.truc).toLowerCase()) diem += 1;
    if (tapGiongNhau(a.tap, b.tap)) diem += 1;
  }
  if ((a.moNguon !== undefined || b.moNguon !== undefined) && moNguonGiongNhau(a.moNguon, b.moNguon)) diem += 1;
  return diem;
}

function lyDoKhac(a, b) {
  const lyDo = [];
  if (a.phu !== b.phu) lyDo.push(`khác phu (${a.phu} vs ${b.phu})`);
  if (a.kieu !== b.kieu) lyDo.push(`khác kieu (${a.kieu} vs ${b.kieu})`);
  if (a.mo !== b.mo) lyDo.push(`khác mo (${a.mo} vs ${b.mo})`);
  if (a.ve !== b.ve) lyDo.push(`khác ve (${a.ve} vs ${b.ve})`);
  if (a.kieu === 'SO' && b.kieu === 'SO' && a.nguong !== b.nguong) lyDo.push(`khác nguong (${a.nguong} vs ${b.nguong})`);
  if (a.kieu === 'GIA_TRI' && b.kieu === 'GIA_TRI') {
    if (chuanSo(a.truc || '').toLowerCase() !== chuanSo(b.truc || '').toLowerCase()) {
      lyDo.push(`khác truc (${a.truc || '(thiếu)'} vs ${b.truc || '(thiếu)'})`);
    }
    if (!tapGiongNhau(a.tap, b.tap)) lyDo.push('khác tap');
  }
  if ((a.mo === 'DINH_NGHIA_LUAT' || a.mo === 'MO_TA_HUONG_DAN' || b.mo === 'DINH_NGHIA_LUAT' || b.mo === 'MO_TA_HUONG_DAN' || a.moNguon !== undefined || b.moNguon !== undefined)
    && !moNguonGiongNhau(a.moNguon, b.moNguon)) {
    lyDo.push(`khác moNguon (${fmtMoNguon(a.moNguon)} vs ${fmtMoNguon(b.moNguon)})`);
  }
  return lyDo;
}

const tomTatPhieu = (r, macDinh) => ({
  mo: r?.phieu?.[0]?.mo || macDinh,
  ve: r.ve,
  phu: r.phu,
  kieu: r.kieu,
  ...(r.truc !== undefined ? { truc: r.truc } : {}),
  ...(r.nguong !== undefined ? { nguong: r.nguong } : {}),
  ...(r.tap !== undefined ? { tap: r.tap } : {}),
  moDieuKien: r.mo,
  ...(r.moNguon !== undefined ? { moNguon: r.moNguon } : {}),
  cauHoi: r.cauHoi,
  trich: r.trich,
  nguon: r.nguon,
});

/**
 * So sánh hai danh sách DIEU_KIEN từ hai phiếu độc lập.
 * Trả `{ ketQua, thongKe: { tong, khop, lechPhieu, tiLeKhop }, lechChiTiet }`.
 */
export function soPhieuDieuKien(phieu1, phieu2) {
  const ds1 = [...(phieu1 || [])].filter((x) => x && x.loai === 'DIEU_KIEN');
  const ds2 = [...(phieu2 || [])].filter((x) => x && x.loai === 'DIEU_KIEN');
  const ungVien = [];
  for (let i = 0; i < ds1.length; i += 1) {
    for (let j = 0; j < ds2.length; j += 1) {
      const d = diemGiong(ds1[i], ds2[j]);
      if (d >= 0) {
        const lenDiff = Math.abs(trichChuan(ds1[i].trich).length - trichChuan(ds2[j].trich).length);
        ungVien.push({ i, j, d, lenDiff });
      }
    }
  }
  ungVien.sort((x, y) => (y.d - x.d) || (x.lenDiff - y.lenDiff) || (x.i - y.i) || (x.j - y.j));

  const ghep1 = new Map();
  const daDung2 = new Set();
  for (const c of ungVien) {
    if (ghep1.has(c.i) || daDung2.has(c.j)) continue;
    ghep1.set(c.i, c.j);
    daDung2.add(c.j);
  }

  const ketQuaTho = [];
  const lechChiTiet = [];

  for (let i = 0; i < ds1.length; i += 1) {
    const a = ds1[i];
    if (!ghep1.has(i)) {
      const ban = {
        ...a,
        trangThai: 'LECH_PHIEU',
        phieu: [tomTatPhieu(a, 'phieu-1'), { mo: 'phieu-2', trangThai: 'KHONG_CO' }],
        ghiChu: 'Chỉ có ở phiếu 1',
      };
      ketQuaTho.push(ban);
      lechChiTiet.push({ nut: a.nut, nguon: a.nguon, lyDo: ['chỉ có ở phiếu 1'], phieu1: a.trich, phieu2: null });
      continue;
    }

    const j = ghep1.get(i);
    const b = ds2[j];
    const lyDo = lyDoKhac(a, b);
    const chon = b.trich.length > a.trich.length ? b : a;
    if (lyDo.length === 0) {
      ketQuaTho.push({
        ...chon,
        trangThai: 'KHOP',
        phieu: [tomTatPhieu(a, 'phieu-1'), tomTatPhieu(b, 'phieu-2')],
      });
    } else {
      ketQuaTho.push({
        ...a,
        trangThai: 'LECH_PHIEU',
        phieu: [tomTatPhieu(a, 'phieu-1'), tomTatPhieu(b, 'phieu-2')],
        ghiChu: lyDo.join('; '),
      });
      lechChiTiet.push({ nut: a.nut, nguon: a.nguon, lyDo, phieu1: a.trich, phieu2: b.trich });
    }
  }

  for (let j = 0; j < ds2.length; j += 1) {
    if (daDung2.has(j)) continue;
    const b = ds2[j];
    ketQuaTho.push({
      ...b,
      trangThai: 'LECH_PHIEU',
      phieu: [{ mo: 'phieu-1', trangThai: 'KHONG_CO' }, tomTatPhieu(b, 'phieu-2')],
      ghiChu: 'Chỉ có ở phiếu 2',
    });
    lechChiTiet.push({ nut: b.nut, nguon: b.nguon, lyDo: ['chỉ có ở phiếu 2'], phieu1: null, phieu2: b.trich });
  }

  // Đánh số lại id hs:<nut>:81NN tất định theo (nut, ve, nguon, trich)
  ketQuaTho.sort((x, y) =>
    String(x.nut).localeCompare(String(y.nut))
    || (x.ve - y.ve)
    || String(x.nguon).localeCompare(String(y.nguon))
    || String(x.trich).localeCompare(String(y.trich)),
  );
  const demNut = new Map();
  const ketQua = ketQuaTho.map((r) => {
    const k = (demNut.get(r.nut) || 0) + 1;
    demNut.set(r.nut, k);
    return { ...r, id: `hs:${r.nut}:${8100 + k}` };
  });

  const khop = ketQua.filter((r) => r.trangThai === 'KHOP').length;
  const lechPhieu = ketQua.length - khop;
  const tong = ketQua.length;
  const tiLeKhop = tong ? Number((khop / tong).toFixed(4)) : 1;

  return {
    ketQua,
    thongKe: { tong, khop, lechPhieu, tiLeKhop },
    lechChiTiet,
  };
}

export const soHaiPhieuDieuKien = soPhieuDieuKien;

function docJsonl(tep) {
  return fs.readFileSync(path.resolve(tep), 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

function main() {
  const a = process.argv.slice(2);
  const lay = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  const p1 = lay('--phieu-1') || lay('--a');
  const p2 = lay('--phieu-2') || lay('--b');
  if (!p1 || !p2) {
    console.error('Thiếu --phieu-1 <p1.jsonl> --phieu-2 <p2.jsonl>');
    process.exit(2);
  }
  const r = soPhieuDieuKien(docJsonl(p1), docJsonl(p2));
  const out = lay('--out');
  if (out) {
    const abs = path.resolve(out);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, `${r.ketQua.map((x) => JSON.stringify(x)).join('\n')}${r.ketQua.length ? '\n' : ''}`, 'utf8');
  }
  if (a.includes('--bao-cao') || a.includes('--json')) {
    console.log(JSON.stringify({ thongKe: r.thongKe, lechChiTiet: r.lechChiTiet }, null, 2));
  } else {
    console.log(`So phiếu DIEU_KIEN: ${r.thongKe.khop}/${r.thongKe.tong} KHOP, ${r.thongKe.lechPhieu} LECH_PHIEU`);
    for (const l of r.lechChiTiet.slice(0, 30)) {
      console.log(`  ! ${l.nut} (${l.nguon}): ${l.lyDo.join(', ')}`);
    }
  }
  if (a.includes('--strict') && r.thongKe.lechPhieu > 0) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
