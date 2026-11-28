#!/usr/bin/env node
// scripts/ho-so-ma/goi-duyet.mjs — MÁY DỰNG GÓI DUYỆT hồ sơ vấn đề (M-78, #1970) & gói duyệt M-81 (#2410).
//
// Chế độ M-78 (mặc định):
//   Người duyệt KHÔNG so với hàng của ai. Họ chấm: vấn đề có RÚT ĐÚNG từ câu luật không.
//   Mỗi Chương trọng điểm: 30 vấn đề chọn ngẫu nhiên + TOÀN BỘ LECH_PHIEU + mọi vấn đề
//   trích không khớp câu luật (máy tự cắm cờ ⚠). Ô chấm: Rút đúng / Rút sai / Không rõ.
//
// Chế độ M-81 (--m81):
//   Xuất mọi mục cần người làm nghề duyệt từ dữ liệu dieu-kien/ + bang-anh-em/ + luat-goc/:
//     I.   VUNG_CHONG chưa giải (chồng dải số, danh sách vungChong, hoặc bảng M-81-chuyen-*.md chưa có GIAI_CHONG)
//     II.  GIAI_CHONG mang ghiChu cần người duyệt (CAN_NGUOI_DUYET / VUNG_CHONG / chờ duyệt / LECH_PHIEU), gom 1 phiếu/cặp
//     III. NGHIA_THUONG ở vùng biên (hoặc toàn bộ khi bật --tat-ca-nghia-thuong)
//     IV.  Bảng anh em HO_PHU chưa chứng minh phủ kín phạm vi cha (khi không có dòng "Loại khác")
//   Xuất docs/mong/duyet/m81-<ngày>.md chia mục theo từng Chương (hoặc m81-ch<NN>-<ngày>.md khi lọc --chuong=NN).
//
// Người duyệt điền xong: --doc-bang=<tệp> đọc lại ô đã đánh (cả M-78 lẫn M-81 + Kết luận người duyệt).
// CHỈ TỪ LUẬT: không dữ liệu khách, không tờ khai, không tiền lệ, không lời AI.

import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { napLuatCong } from './cong.mjs';
import {
  napBieuMeta,
  laLoaiKhacThuan,
  laLoaiKhacCoVe,
  laPhanBuCoTen,
  haiNutRoiNhau,
  laChongSoTrungTruc,
  layTapDuHopLeTheoTruc,
  taoBanDoTruAnhEm,
  chiaVeDieuKien,
  chungMinhPhuKin,
} from './bang-anh-em.mjs';

const require = createRequire(import.meta.url);
const G = require('../../lib/ho-so-ma/ghep.js');
const { napLuat } = G;

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const HO_SO = path.join(GOC, 'data', 'ho-so-ma');
const LUAT = path.join(GOC, 'data', 'luat-goc');
const OUT = path.join(GOC, 'docs', 'ho-so', 'duyet');
const OUT_M81 = path.join(GOC, 'docs', 'mong', 'duyet');
const DOCS_THE_M81 = path.join(GOC, 'docs', 'mong', 'the');
const THU = ['phan', 'chuong', 'nhom', 'phan-nhom', 'dong', 'nguong', 'liet-ke'];
const KHO_LUAT_CHU = ['bieu', 'chuong', 'phan', 'nhom', 'phan-nhom', 'gir', 'sen', 'wco'];

const RE_GC_CAN_DUYET = /CAN_NGUOI_DUYET|VUNG_CHONG|chờ.*duyệt|cần.*duyệt/iu;
const RE_TU_KHOA_BIEN = /(?<![\p{L}\p{N}])(?:tương\s+tự|đặc\s+biệt|chủ\s+yếu|thông\s+thường|thích\s+hợp|loại\s+dùng\s+cho|có\s+chức\s+năng|có\s+khả\s+năng|khác)(?![\p{L}\p{N}])/iu;

const docJsonl = (f) => (
  fs.existsSync(f)
    ? fs.readFileSync(f, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l))
    : []
);

// ── nạp kho câu: id câu → {nut gốc (giữ nguyên id từ bản ghi cau), tu, den} ──
const cauBanGhiCua = (luatDir) => {
  const map = new Map();
  const cauDir = path.join(luatDir, 'cau');
  if (fs.existsSync(cauDir)) {
    for (const tep of fs.readdirSync(cauDir).sort()) {
      if (!tep.endsWith('.jsonl') || tep === 'thong-bao.jsonl') continue;
      for (const r of docJsonl(path.join(cauDir, tep))) {
        // GIỮ NGUYÊN nut gốc từ id câu — không quy về bieu (nhom:8415:ct:17 ≠ bieu:8415)
        const nut = String(r.id || '').split('#')[0];
        map.set(r.id, { nut, tep: tep.replace('.jsonl', ''), tu: r.tu, den: r.den ?? null });
      }
    }
  }
  return map;
};

// ── nút → chữ nguyenVan đầy đủ (nạp đủ cả sen.jsonl & wco.jsonl, không nạp thong-bao.jsonl) ──
const nutChuCua = (luatDir) => {
  const map = new Map();
  for (const tep of KHO_LUAT_CHU) {
    const f = path.join(luatDir, `${tep}.jsonl`);
    for (const r of docJsonl(f)) {
      if (r.id && r.lop !== 'TIEN_LE' && typeof r.nguyenVan === 'string') map.set(r.id, r.nguyenVan);
    }
  }
  return map;
};

/** Câu luật nguyên văn của một id câu — tra thẳng nut gốc từ bản ghi cau, không quy đổi. */
function cauChu(cauId, banGhi, nutChu) {
  const chuFull = nutChu.get(banGhi.nut);
  if (typeof chuFull !== 'string') return null;
  return chuFull.slice(banGhi.tu ?? 0, banGhi.den ?? chuFull.length);
}

/** Trích có nằm trong câu luật không (chuẩn hoá khoảng trắng như kiem-luat-goc). */
const chuanHoa = (s) => String(s || '').replace(/\s+/g, ' ').trim();
function trichNamTrongCau(r, cauChuText) {
  if (!r.trich || !cauChuText) return false;
  const c = chuanHoa(cauChuText);
  return chuanHoa(r.trich) === c || c.includes(chuanHoa(r.trich));
}

const sha256 = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

// ── thu vấn đề của một Chương: đọc mọi tệp hồ sơ có chương này (M-78) ──
function thuVanDe(chuong, hoSoDir) {
  const ds = [];
  for (const thu of THU) {
    const dir = path.join(hoSoDir, thu);
    if (!fs.existsSync(dir)) continue;
    for (const tep of fs.readdirSync(dir).sort()) {
      if (!tep.endsWith('.jsonl')) continue;
      for (const r of docJsonl(path.join(dir, tep))) {
        const nut = String(r.nut || '');
        const ch = /^chuong:(\d{2})/.exec(nut)?.[1] ?? (/^bieu:(\d{2})/.exec(nut)?.[1] ?? null);
        if (ch !== chuong) continue;
        ds.push({ ...r, thu });
      }
    }
  }
  return ds;
}

const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ── câu hỏi lời thường theo loại vấn đề (dữ kiện lấy từ bản ghi, không bịa) ──
function cauHoi(r) {
  if (r.loai === 'NGUONG' && r.nguong) {
    const n = r.nguong;
    const phamVi = n.tu != null && n.den != null ? `${n.gomTu ? 'từ' : 'trên'} ${n.tu} đến ${n.gomDen ? '' : 'dưới '}${n.den}` : n.den != null ? `không quá ${n.den}` : n.tu != null ? `từ ${n.tu} trở lên` : '(không ghi ngưỡng)';
    return `Hàng của anh/chị có ${n.daiLuong} trong khoảng ${phamVi} ${n.donVi} không?`;
  }
  if (r.loai === 'KHONG_DUOC_LA') return `Hàng của anh/chị CÓ phải là "${r.dieuKien}" không? (nếu đúng ⇒ không thuộc dòng này)`;
  if (r.loai === 'PHAI_LA') return `Hàng của anh/chị có đáp ứng "${r.dieuKien}" không?`;
  if (r.loai === 'TACH_ANH_EM') return `Theo mô tả, hàng của anh/chị thuộc trường hợp nào: ${r.dieuKien}?`;
  if (r.loai === 'CHI_LIET_KE') return `Hàng của anh/chị có nằm trong danh sách "${r.dieuKien}" không?`;
  return `Nhận định sau có đúng với hàng của anh/chị không: "${r.dieuKien}"?`;
}

// ── dựng gói một chương (M-78 — bảo toàn 100% tương thích ngược) ──
function goi(chuong, ngay, soToiDa, opts = {}) {
  const hoSoDir = opts.hoSo || HO_SO;
  const luatDir = opts.luat || LUAT;
  const outDir = opts.out || OUT;
  void napLuat(luatDir);
  void sha256;
  void cauHoi;
  const nutChu = nutChuCua(luatDir);
  const cauBanGhi = cauBanGhiCua(luatDir);

  const ds = thuVanDe(chuong, hoSoDir);
  const lech = ds.filter((r) => r.trangThai === 'LECH_PHIEU');
  const rng = mulberry32(Number(chuong) * 7919 + Number(ngay.replaceAll('-', '')));
  const conLai = ds.filter((r) => !lech.includes(r));
  const xao = [...conLai].sort(() => rng() - 0.5);
  const chon = [...lech, ...xao.slice(0, Math.max(0, soToiDa - lech.length))].map((r) => {
    const banGhi = cauBanGhi.get(r.cau);
    const nutChuBanGhi = banGhi ? nutChu : null;
    const cau = banGhi && nutChuBanGhi ? cauChu(r.cau, banGhi, nutChuBanGhi) || '(câu không thấy trong nút — ghi nhận lỗi)' : '(không có bản ghi câu — ghi nhận lỗi)';
    const trichKhop = r.trich && cau !== '(không có bản ghi câu — ghi nhận lỗi)' && cau !== '(câu không thấy trong nút — ghi nhận lỗi)' ? trichNamTrongCau(r, cau) : true;
    return { ...r, cauLuat: cau, trichLe: !trichKhop && Boolean(r.trich) };
  });
  const tatCaTrichLe = chon.filter((r) => r.trichLe === true);
  const chonGomLe = [...chon];
  const daCo = new Set(chonGomLe.map((r) => r.id));
  for (const r of tatCaTrichLe) if (!daCo.has(r.id)) chonGomLe.push({ ...r, trichLe: true });

  const md = [
    `# Biên bản duyệt hồ sơ vấn đề — Chương ${chuong}`,
    ``,
    `Ngày: ${ngay} · Tổng vấn đề trong hồ sơ chương: ${ds.length} · Chọn: ${lech.length} lệch phiếu + ${chon.length - lech.length} ngẫu nhiên`,
    ``,
    `**Cách chấm:** Anh/chị đọc **câu luật nguyên văn**, rồi chấm dòng **Điều kiện** có nói đúng điều câu luật đòi không (đúng chiều, đúng số, đúng đơn vị, đúng mã).`,
    `**Chỉ từ luật:** không có mô tả hàng, tờ khai, tiền lệ hay dữ liệu khách.`,
    ``,
  ];
  const traLoi = { chuong, ngay, soLuong: chonGomLe.length, muc: [] };
  for (const [i, r] of chonGomLe.entries()) {
    const cau = r.cauLuat || '(không đọc được câu từ kho câu — ghi nhận lỗi)';
    const canhBaoTrich = r.trichLe === true ? `\n> ⚠ **trích không khớp câu luật** — kiểm tra nguồn` : '';
    md.push(`---`, ``, `### ${i + 1}. ${r.id}`, ``, `- **Cấp nút:** ${r.nut}`, `- **Loại:** ${r.loai}`, `- **Điều kiện:** ${r.dieuKien}`, canhBaoTrich, ``, `> **Câu luật nguyên văn:** "${cau}"`, `> Nguồn: ${r.nguon || '(không ghi nguồn)'} · Vân tay: \`${(r.van || '').slice(0, 12)}\``, ``, `- [ ] **Rút đúng**  - [ ] **Rút sai**  - [ ] **Không rõ**`, r.trichLe ? `> ⚠ trích không khớp` : '', ``);
    traLoi.muc.push({ id: r.id, nut: r.nut, loai: r.loai, cau: r.cau });
  }
  if (!chonGomLe.length) md.push('(không có vấn đề nào trong hồ sơ chương này)');

  fs.mkdirSync(outDir, { recursive: true });
  const tepMd = path.join(outDir, `chuong-${chuong}-${ngay}.md`);
  fs.writeFileSync(tepMd, md.join('\n') + '\n');
  const tepTraLoi = path.join(outDir, `chuong-${chuong}-${ngay}-tra-loi.json`);
  fs.writeFileSync(tepTraLoi, JSON.stringify(traLoi, null, 1) + '\n');
  return { tepMd, tepTraLoi, so: chonGomLe.length, lech: lech.length, tong: ds.length };
}

// ── Hỗ trợ M-81: chuẩn hoá mã, đọc câu luật, quét VUNG_CHONG / GIAI_CHONG / NGHIA_THUONG ──

function gonMotDong(s) {
  return String(s ?? '').replace(/\s+/g, ' ').trim();
}

function maNganNut(nutId) {
  return String(nutId || '').replace(/^bieu:/, '');
}

function dinhDangMaCham(nutId) {
  const m = /^bieu:(\d{4,8})(:td\d+)*$/.exec(String(nutId || ''));
  if (!m) return String(nutId || '');
  const d = m[1];
  const hauTo = m[2] || '';
  if (d.length === 4) return `${d.slice(0, 2)}.${d.slice(2)}${hauTo}`;
  if (d.length <= 6) return `${d.slice(0, 4)}.${d.slice(4)}${hauTo}`;
  return `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6)}${hauTo}`;
}

function maSangNutBieu(raw, L) {
  const s = String(raw || '').replace(/[`*]/g, '').trim();
  if (!s) return null;
  if (/^(?:bieu:\d{4,8}(?::td\d+)*|chuong:\d{2}(?::pc:[IVX]+)?|phan:[IVX]+)$/.test(s)) {
    return L.cay.theoId.has(s) ? s : null;
  }
  const [phanSo, ...tdParts] = s.replace(/^bieu:/, '').split(':');
  const digits = phanSo.replace(/\./g, '');
  if (!/^\d{4,8}$/.test(digits)) return null;
  const cand = `bieu:${digits}${tdParts.length ? `:${tdParts.join(':')}` : ''}`;
  return L.cay.theoId.has(cand) ? cand : null;
}

function nhom4CuaNut(nutId) {
  const so = G.soBieu(nutId);
  return so && so.length >= 4 ? `${so.slice(0, 2)}.${so.slice(2, 4)}` : null;
}

function tenBieuCuaNut(nutId, L, bieuMeta) {
  const ten = L.cay.theoId.get(nutId)?.ten ?? bieuMeta.get(nutId)?.nguyenVan ?? L.chuCau(`${nutId}#1`) ?? '';
  return gonMotDong(ten);
}

function traCauLuatAnToan(cauId, L, boDemLoi = null) {
  if (!cauId || /^tb:/.test(cauId)) {
    if (boDemLoi) boDemLoi.push(cauId || '(trống)');
    return '(không có câu luật hợp lệ trong kho luật gốc)';
  }
  const chu = L.chuCau(cauId);
  if (chu === null) {
    if (boDemLoi) boDemLoi.push(cauId);
    return `(không tìm thấy câu ${cauId} trong kho luật gốc)`;
  }
  return gonMotDong(chu);
}

function moTaKieuDieuKien(d, nguongById) {
  const phan = [`ve=${d.ve}`, `phu=${Boolean(d.phu)}`, `kieu=${d.kieu}`, `mo=${d.mo}`];
  if (d.kieu === 'GIA_TRI') {
    phan.push(`truc="${d.truc}"`);
    if (d.daTri !== undefined) phan.push(`daTri=${Boolean(d.daTri)}`);
    phan.push(`tap=${JSON.stringify(d.tap || [])}`);
  } else if (d.kieu === 'SO') {
    const ng = nguongById.get(d.nguong)?.nguong;
    if (ng) {
      const mien = `${ng.gomTu ? '[' : '('}${ng.tu ?? '-∞'}, ${ng.den ?? '+∞'}${ng.gomDen ? ']' : ')'}`;
      phan.push(`nguong=${d.nguong} (${ng.daiLuong}: ${mien}${ng.donVi ? ` ${ng.donVi}` : ''})`);
    } else {
      phan.push(`nguong=${d.nguong}`);
    }
  }
  return phan.join(' · ');
}

function dinhDangDanhSachDieuKienNut(nutId, dkTheoNut, L, bieuMeta, nguongById, loiCau) {
  const tenNut = tenBieuCuaNut(nutId, L, bieuMeta);
  const dks = dkTheoNut.get(nutId) || [];
  const dong = [`- **Nút \`${nutId}\` (\`${dinhDangMaCham(nutId)}\`):** "${tenNut}"`];
  if (!dks.length) {
    const cauBieu = L.cau.has(`${nutId}#1`) ? `${nutId}#1` : null;
    if (cauBieu) {
      dong.push(`  - *(Nút phần bù / không mang bản ghi \`DIEU_KIEN\` riêng)* — Câu biểu \`${cauBieu}\`: "${traCauLuatAnToan(cauBieu, L, loiCau)}"`);
    } else {
      dong.push(`  - *(Chưa có bản ghi \`DIEU_KIEN\` riêng trên nút này)*`);
    }
    return dong;
  }
  for (const d of dks) {
    const chuNguon = traCauLuatAnToan(d.nguon, L, loiCau);
    dong.push(`  - \`${d.id}\` (${moTaKieuDieuKien(d, nguongById)}) — trích: *"${gonMotDong(d.trich)}"*`);
    dong.push(`    > Câu luật (\`${d.nguon}\`): "${chuNguon}"`);
    const mns = Array.isArray(d.moNguon) ? d.moNguon : (d.moNguon ? [d.moNguon] : []);
    for (const mnId of mns) {
      if (mnId === d.nguon) continue;
      dong.push(`    > Câu định nghĩa/hướng dẫn (\`${mnId}\`): "${traCauLuatAnToan(mnId, L, loiCau)}"`);
    }
  }
  return dong;
}

function docDanhSachVungChongTuTep(vungChongOpt) {
  if (!vungChongOpt) return [];
  if (Array.isArray(vungChongOpt)) return vungChongOpt;
  if (typeof vungChongOpt === 'string' && fs.existsSync(vungChongOpt)) {
    const raw = fs.readFileSync(vungChongOpt, 'utf8').trim();
    if (!raw) return [];
    if (vungChongOpt.endsWith('.json')) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : (parsed.muc || []);
    }
    return raw.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
  }
  return [];
}

/** Quét bảng mục VUNG_CHONG chưa ghi GIAI_CHONG trong docs/mong/the/M-81-chuyen-*.md. */
function quetVungChongTuDocs(docsDir, L) {
  if (!docsDir || !fs.existsSync(docsDir)) return [];
  const kq = [];
  const teps = fs.readdirSync(docsDir).filter((f) => /^M-81-chuyen-.*\.md$/.test(f)).sort();
  for (const tep of teps) {
    const txt = fs.readFileSync(path.join(docsDir, tep), 'utf8');
    const cacPhan = txt.split(/^###\s+/m).slice(1);
    for (const phan of cacPhan) {
      const tieuDe = phan.split('\n')[0] || '';
      if (!/VUNG_CHONG.*chưa\s+ghi.*GIAI_CHONG/iu.test(tieuDe)) continue;
      for (const line of phan.split('\n')) {
        if (!line.trim().startsWith('|')) continue;
        const cols = line.split('|').slice(1, -1).map((c) => c.trim());
        if (cols.length < 4 || /^[-:\s]+$/.test(cols[0]) || cols[0] === '#') continue;
        const tachCap = cols[2].split(/\s*[×x]\s*/);
        if (tachCap.length !== 2) continue;
        const nutA = maSangNutBieu(tachCap[0], L);
        const nutB = maSangNutBieu(tachCap[1], L);
        if (!nutA || !nutB || nutA === nutB) continue;
        const chaA = L.cay.theoId.get(nutA)?.cha ?? null;
        const chaB = L.cay.theoId.get(nutB)?.cha ?? null;
        kq.push({
          nut: chaA && chaA === chaB ? chaA : (chaA || chaB),
          cap: [nutA, nutB],
          matHang: cols[3] ? cols[3].replace(/`/g, '') : '',
          matHangNguyenVan: cols[3] || '',
          lyDo: cols[4] ? cols[4].replace(/`/g, '') : '',
          lyDoNguyenVan: cols[4] || '',
          nguonPhatHien: `docs/mong/the/${tep}`,
        });
      }
    }
  }
  return kq;
}

function sapXepCapAnhEm(chaId, nutA, nutB, L) {
  const con = chaId ? G.conCua(chaId, L.cay) : [];
  const ia = con.indexOf(nutA);
  const ib = con.indexOf(nutB);
  if (ia >= 0 && ib >= 0 && ia !== ib) return ia < ib ? [nutA, nutB] : [nutB, nutA];
  return [nutA, nutB].sort();
}

/**
 * Xác định tất định một bản ghi DIEU_KIEN mang mo === 'NGHIA_THUONG' có nằm ở vùng biên cần người duyệt hay không.
 * Trả về { vungBien: boolean, lyDo: string[] }.
 */
function laNghiaThuongVungBien(dkRec, ctx = {}) {
  if (!dkRec || dkRec.loai !== 'DIEU_KIEN' || dkRec.mo !== 'NGHIA_THUONG') {
    return { vungBien: false, lyDo: [] };
  }
  const {
    L = null,
    bieuMeta = new Map(),
    dkTheoNut = new Map(),
    capBienTheoNut = new Map(),
    tatCaNghiaThuong = false,
  } = ctx;
  const lyDo = [];

  // (i) Điều kiện rào loại trừ hoặc điều kiện chung vế 0 chưa có định nghĩa luật
  if (dkRec.phu === true || dkRec.ve === 0) {
    lyDo.push(
      dkRec.phu === true && dkRec.ve === 0
        ? 'điều kiện loại trừ chung ở vế 0 (`ve=0, phu=true`) chưa có định nghĩa luật'
        : (dkRec.phu === true
          ? 'điều kiện rào loại trừ (`phu=true`) chưa có định nghĩa luật'
          : 'điều kiện chung áp cho mọi vế (`ve=0`) chưa có định nghĩa luật'),
    );
  }

  // (ii) Trục giá trị đa trị mở dễ giao thoa
  if (dkRec.daTri === true) {
    lyDo.push(`trục đa trị mở (\`daTri=true\`, trục "${dkRec.truc || ''}") dễ giao thoa giữa các nhánh`);
  }

  // (iii) Nút tham gia ít nhất một cặp chồng hoặc chưa chứng minh tách
  const dsCap = capBienTheoNut.get(dkRec.nut) || [];
  if (dsCap.length > 0) {
    const tomTat = dsCap.slice(0, 4).join(', ') + (dsCap.length > 4 ? `, … (+${dsCap.length - 4})` : '');
    lyDo.push(`nút tham gia cặp chồng / chưa chứng minh tách (${tomTat})`);
  }

  // (iv-a) Nằm trong vế đa điều kiện (>= 2 điều kiện cùng vế) dưới nút cha (từ cấp nhóm 4 số trở xuống) có "Loại khác" / phần bù "… khác"
  if (L) {
    const chaId = L.cay.theoId.get(dkRec.nut)?.cha ?? null;
    const anhEm = chaId && !/^bieu:\d{2}$/.test(chaId) ? G.conCua(chaId, L.cay) : [];
    const chaCoNhanhBu = anhEm.some((id) => (
      id !== dkRec.nut
      && (laLoaiKhacThuan(id, L, bieuMeta) || laLoaiKhacCoVe(id, L, bieuMeta) || laPhanBuCoTen(id, L, bieuMeta))
    ));
    if (chaCoNhanhBu) {
      const dksNut = dkTheoNut.get(dkRec.nut) || [dkRec];
      const cacVe = chiaVeDieuKien(dksNut).cacVe;
      const namTrongVeDaDk = cacVe.some(
        (v) => v.cacDieuKien.length >= 2 && v.cacDieuKien.some((it) => it.id === dkRec.id),
      );
      if (namTrongVeDaDk) {
        lyDo.push(`nằm trong vế đa điều kiện (\`>= 2\` điều kiện cùng vế) dưới cha \`${chaId}\` có nhánh "Loại khác" / phần bù`);
      }
    }
  }

  // (iv-b) Trích chứa từ khoá ranh giới mở
  const mTuKhoa = RE_TU_KHOA_BIEN.exec(dkRec.trich || '');
  if (mTuKhoa) {
    lyDo.push(`cụm trích chứa từ khoá ranh giới mở ("${gonMotDong(mTuKhoa[0])}")`);
  }

  if (!lyDo.length && tatCaNghiaThuong) {
    lyDo.push('chế độ `--tat-ca-nghia-thuong` (xuất toàn bộ điều kiện `NGHIA_THUONG`)');
  }

  return { vungBien: lyDo.length > 0, lyDo };
}

/**
 * Dựng gói người làm nghề duyệt cho M-81 từ dữ liệu dieu-kien/ + bang-anh-em/ + luat-goc/.
 * Không sửa dữ liệu kho; xuất docs/mong/duyet/m81-<ngày>.md (hoặc m81-ch<NN>-<ngày>.md khi truyền opts.chuong).
 */
function goiM81(ngay, opts = {}) {
  const ngayChuan = ngay || new Date().toISOString().slice(0, 10);
  const hoSoDir = opts.hoSo || HO_SO;
  const luatDir = opts.luat || LUAT;
  const outDir = opts.out || OUT_M81;
  const chuongLoc = opts.chuong ? String(opts.chuong).padStart(2, '0') : null;
  const nhomCoTruyen = opts.nhom !== undefined && opts.nhom !== null && String(opts.nhom).trim() !== '';
  const nhomRaw = Array.isArray(opts.nhom)
    ? opts.nhom
    : (typeof opts.nhom === 'string' ? opts.nhom.split(',') : []);
  let tapNhomLoc = null;
  if (nhomCoTruyen) {
    const danhSachSach = nhomRaw.map((x) => String(x ?? '').trim()).filter(Boolean);
    if (!danhSachSach.length) {
      throw new Error('Tham số --nhom rỗng: cần truyền mã nhóm 4 số hợp lệ (ví dụ 8413 hoặc 84.13)');
    }
    tapNhomLoc = new Set();
    for (const tok of danhSachSach) {
      if (!/^\d{2}\.?\d{2}$/.test(tok)) {
        throw new Error(`Mã nhóm 4 số không hợp lệ trong --nhom: "${tok}" (cần dạng XX.XX hoặc XXXX)`);
      }
      const bonSo = tok.replace('.', '');
      tapNhomLoc.add(`${bonSo.slice(0, 2)}.${bonSo.slice(2)}`);
    }
  }
  const tapChuongTuNhom = tapNhomLoc
    ? new Set([...tapNhomLoc].map((x) => x.slice(0, 2)))
    : null;
  const thuocPhamViNhom = (nutId) => {
    if (!tapNhomLoc) return true;
    const n4 = nhom4CuaNut(nutId);
    if (n4) return tapNhomLoc.has(n4);
    const ch = G.chuongCuaNut(nutId);
    if (ch) return tapChuongTuNhom.has(ch);
    return /^phan:/.test(String(nutId || ''));
  };
  const tatCaNghiaThuong = Boolean(opts.tatCaNghiaThuong);
  const docsDir = opts.docsDir !== undefined
    ? opts.docsDir
    : (path.resolve(hoSoDir) === path.resolve(HO_SO) ? DOCS_THE_M81 : null);

  const L = opts.L || napLuatCong(luatDir);
  const bieuMeta = opts.bieuMeta || napBieuMeta(luatDir);

  const dkDir = path.join(hoSoDir, 'dieu-kien');
  const baeDir = path.join(hoSoDir, 'bang-anh-em');
  const nguongDir = path.join(hoSoDir, 'nguong');

  const dks = [];
  const gcs = [];
  if (fs.existsSync(dkDir)) {
    for (const f of fs.readdirSync(dkDir).filter((x) => x.endsWith('.jsonl')).sort()) {
      for (const r of docJsonl(path.join(dkDir, f))) {
        if (!thuocPhamViNhom(r.nut)) continue;
        if (r.loai === 'DIEU_KIEN') dks.push(r);
        else if (r.loai === 'GIAI_CHONG') gcs.push(r);
      }
    }
  }

  const nguongById = new Map();
  if (fs.existsSync(nguongDir)) {
    for (const f of fs.readdirSync(nguongDir).filter((x) => x.endsWith('.jsonl')).sort()) {
      for (const r of docJsonl(path.join(nguongDir, f))) {
        if (r.loai === 'NGUONG' && r.id) nguongById.set(r.id, r);
      }
    }
  }

  const dkTheoNut = new Map();
  for (const d of dks) {
    if (!dkTheoNut.has(d.nut)) dkTheoNut.set(d.nut, []);
    dkTheoNut.get(d.nut).push(d);
  }

  const gcTheoCha = new Map();
  const gcCapHopLe = new Set();
  for (const g of gcs) {
    if (!Array.isArray(g.cap) || g.cap.length !== 2) continue;
    if (!gcTheoCha.has(g.nut)) gcTheoCha.set(g.nut, []);
    gcTheoCha.get(g.nut).push(g);
    const chu = !/^tb:/.test(g.nguon || '') ? L.chuCau(g.nguon) : null;
    if (chu !== null) {
      gcCapHopLe.add(`${g.nut}|${[...g.cap].sort().join('|')}`);
    }
  }

  // Tập các nút cha cần xét gia đình anh em từ cấp nhóm 4 số trở xuống (không gộp bieu:NN 2 số cấp Chương)
  const laChaGiaDinh = (chaId) => Boolean(
    chaId && !/^bieu:\d{2}$/.test(chaId) && thuocPhamViNhom(chaId) && G.conCua(chaId, L.cay).length >= 2,
  );
  const tapCha = new Set();
  if (fs.existsSync(baeDir)) {
    for (const f of fs.readdirSync(baeDir).filter((x) => x.endsWith('.jsonl')).sort()) {
      for (const b of docJsonl(path.join(baeDir, f))) {
        if (laChaGiaDinh(b?.cha)) tapCha.add(b.cha);
      }
    }
  }
  for (const nutId of dkTheoNut.keys()) {
    const chaId = L.cay.theoId.get(nutId)?.cha;
    if (laChaGiaDinh(chaId)) tapCha.add(chaId);
  }
  for (const chaId of gcTheoCha.keys()) {
    if (laChaGiaDinh(chaId)) tapCha.add(chaId);
  }

  // ── 1. Gom Nhóm I (VUNG_CHONG chưa giải) & tập cặp CHUA_CHUNG_MINH_TACH ──
  const vungChongMap = new Map(); // pairKey = `${cha}|${sortedA}|${sortedB}` -> entry
  const ccmtCapTheoNut = new Map(); // nut -> Set<string>

  const themCapBien = (map, nut, nhan) => {
    if (!map.has(nut)) map.set(nut, []);
    if (!map.get(nut).includes(nhan)) map.get(nut).push(nhan);
  };

  const dangKyVungChong = (chaRaw, rawA, rawB, info = {}) => {
    const nutA0 = maSangNutBieu(rawA, L) || rawA;
    const nutB0 = maSangNutBieu(rawB, L) || rawB;
    if (!nutA0 || !nutB0 || nutA0 === nutB0) return;
    if (!thuocPhamViNhom(nutA0) || !thuocPhamViNhom(nutB0)) return;
    const chaId = chaRaw || L.cay.theoId.get(nutA0)?.cha || L.cay.theoId.get(nutB0)?.cha || null;
    if (!chaId) return;
    const ch = G.chuongCuaNut(chaId) || G.chuongCuaNut(nutA0);
    if (!ch || (chuongLoc && ch !== chuongLoc)) return;
    const sortedKey = [nutA0, nutB0].sort().join('|');
    const fullKey = `${chaId}|${sortedKey}`;
    if (gcCapHopLe.has(fullKey)) return;
    const [nutA, nutB] = sapXepCapAnhEm(chaId, nutA0, nutB0, L);
    const cu = vungChongMap.get(fullKey);
    if (!cu) {
      vungChongMap.set(fullKey, {
        idPhieu: `M81-VC-${maNganNut(nutA)}-${maNganNut(nutB)}`,
        chuong: ch,
        nhom4: nhom4CuaNut(nutA) || nhom4CuaNut(chaId),
        cha: chaId,
        nutA,
        nutB,
        matHang: info.matHang || '',
        matHangNguyenVan: info.matHangNguyenVan || info.matHang || '',
        lyDo: info.lyDo || '',
        lyDoNguyenVan: info.lyDoNguyenVan || info.lyDo || '',
        nguonPhatHien: info.nguonPhatHien ? [info.nguonPhatHien] : [],
      });
    } else {
      if (!cu.matHang && info.matHang) {
        cu.matHang = info.matHang;
        cu.matHangNguyenVan = info.matHangNguyenVan || info.matHang;
      }
      if (!cu.lyDo && info.lyDo) {
        cu.lyDo = info.lyDo;
        cu.lyDoNguyenVan = info.lyDoNguyenVan || info.lyDo;
      }
      if (info.nguonPhatHien && !cu.nguonPhatHien.includes(info.nguonPhatHien)) {
        cu.nguonPhatHien.push(info.nguonPhatHien);
      }
    }
  };

  // (1.i) Quét các gia đình anh em để bắt chồng số laChongSoTrungTruc & ghi nhận CHUA_CHUNG_MINH_TACH
  for (const chaId of [...tapCha].sort()) {
    const ch = G.chuongCuaNut(chaId);
    if (!ch) continue;
    const con = G.conCua(chaId, L.cay);
    const coTen = con.filter((id) => !laLoaiKhacThuan(id, L, bieuMeta));
    const gcCha = (gcTheoCha.get(chaId) || []).filter(
      (g) => gcCapHopLe.has(`${chaId}|${[...g.cap].sort().join('|')}`),
    );
    const duongCha = G.duongDiNut(chaId, L.cay) || [];
    const dksDuongCha = duongCha.flatMap((b) => dkTheoNut.get(b.nut) || []);
    const tapDuTheoTruc = layTapDuHopLeTheoTruc(con, dkTheoNut, dkTheoNut.get(chaId) || [], dksDuongCha, { L });
    const truTheoNut = taoBanDoTruAnhEm(chaId, con, L, bieuMeta, dkTheoNut, gcCha, nguongById, { tapDuTheoTruc });
    for (let i = 0; i < coTen.length; i += 1) {
      for (let j = i + 1; j < coTen.length; j += 1) {
        const A = coTen[i];
        const B = coTen[j];
        const sortedKey = [A, B].sort().join('|');
        const fullKey = `${chaId}|${sortedKey}`;
        if (gcCapHopLe.has(fullKey)) continue;
        if ((truTheoNut.get(A) || []).includes(B) || (truTheoNut.get(B) || []).includes(A)) continue;
        const dksA = dkTheoNut.get(A) || [];
        const dksB = dkTheoNut.get(B) || [];
        if (!dksA.length && !dksB.length) continue;
        if (haiNutRoiNhau(dksA, dksB, nguongById, { tapDuTheoTruc })) continue;
        if (laChongSoTrungTruc(dksA, dksB, nguongById)) {
          dangKyVungChong(chaId, A, B, {
            lyDo: 'Hai ngưỡng số cùng đại lượng có khoảng giá trị giao nhau trên Cổng 8 (`laChongSoTrungTruc`), chưa có `GIAI_CHONG`',
            nguonPhatHien: 'Cổng 8 (chồng khoảng số)',
          });
        } else {
          if (!ccmtCapTheoNut.has(A)) ccmtCapTheoNut.set(A, new Set());
          if (!ccmtCapTheoNut.has(B)) ccmtCapTheoNut.set(B, new Set());
          ccmtCapTheoNut.get(A).add(B);
          ccmtCapTheoNut.get(B).add(A);
        }
      }
    }
  }

  // (1.ii) Nguồn opts.vungChong / --vung-chong
  for (const v of docDanhSachVungChongTuTep(opts.vungChong)) {
    if (!Array.isArray(v?.cap) || v.cap.length !== 2) continue;
    dangKyVungChong(v.nut || null, v.cap[0], v.cap[1], {
      matHang: v.matHang || v.moTa || '',
      lyDo: v.lyDo || 'Khai báo trong danh sách `vungChong` nhưng chưa có `GIAI_CHONG` trích luật',
      nguonPhatHien: 'vungChong đầu vào',
    });
  }

  // (1.iii) Nguồn bảng M-81-chuyen-*.md (chỉ lấy cặp thực sự có DIEU_KIEN cho cả hai nút trong hoSoDir và chưa có GIAI_CHONG)
  for (const v of quetVungChongTuDocs(docsDir, L)) {
    const [nutA, nutB] = v.cap;
    if (!dkTheoNut.has(nutA) || !dkTheoNut.has(nutB)) continue;
    dangKyVungChong(v.nut, nutA, nutB, v);
  }

  const dsVungChong = [...vungChongMap.values()].sort(
    (a, b) => a.chuong.localeCompare(b.chuong) || a.nutA.localeCompare(b.nutA) || a.nutB.localeCompare(b.nutB),
  );

  // ── 2. Gom Nhóm II (GIAI_CHONG mang ghiChu cần người duyệt / LECH_PHIEU) theo từng cặp ──
  const giaiChongPairMap = new Map();
  for (const g of gcs) {
    if (!Array.isArray(g.cap) || g.cap.length !== 2) continue;
    const canDuyet = RE_GC_CAN_DUYET.test(g.ghiChu || '') || g.trangThai === 'LECH_PHIEU';
    if (!canDuyet) continue;
    const ch = G.chuongCuaNut(g.nut) || G.chuongCuaNut(g.cap[0]);
    if (!ch || (chuongLoc && ch !== chuongLoc)) continue;
    const [nutA, nutB] = sapXepCapAnhEm(g.nut, g.cap[0], g.cap[1], L);
    const fullKey = `${g.nut}|${[nutA, nutB].sort().join('|')}`;
    if (!giaiChongPairMap.has(fullKey)) {
      giaiChongPairMap.set(fullKey, {
        idPhieu: `M81-GC-${maNganNut(nutA)}-${maNganNut(nutB)}`,
        chuong: ch,
        nhom4: nhom4CuaNut(nutA) || nhom4CuaNut(g.nut),
        cha: g.nut,
        nutA,
        nutB,
        banGhi: [],
      });
    }
    giaiChongPairMap.get(fullKey).banGhi.push(g);
  }
  const dsGiaiChong = [...giaiChongPairMap.values()].sort(
    (a, b) => a.chuong.localeCompare(b.chuong) || a.nutA.localeCompare(b.nutA) || a.nutB.localeCompare(b.nutB),
  );

  // ── 3. Lập bản đồ cặp chồng/biên theo từng nút & gom Nhóm III (NGHIA_THUONG vùng biên) ──
  const capBienTheoNut = new Map();
  const capDaCoVcHoacGc = new Set();
  for (const vc of vungChongMap.values()) {
    capDaCoVcHoacGc.add([vc.nutA, vc.nutB].sort().join('|'));
    themCapBien(capBienTheoNut, vc.nutA, `VUNG_CHONG với \`${vc.nutB}\``);
    themCapBien(capBienTheoNut, vc.nutB, `VUNG_CHONG với \`${vc.nutA}\``);
  }
  for (const gc of giaiChongPairMap.values()) {
    capDaCoVcHoacGc.add([gc.nutA, gc.nutB].sort().join('|'));
    themCapBien(capBienTheoNut, gc.nutA, `GIAI_CHONG chờ duyệt với \`${gc.nutB}\``);
    themCapBien(capBienTheoNut, gc.nutB, `GIAI_CHONG chờ duyệt với \`${gc.nutA}\``);
  }
  for (const [nut, doiTacSet] of ccmtCapTheoNut) {
    for (const dt of [...doiTacSet].sort()) {
      if (capDaCoVcHoacGc.has([nut, dt].sort().join('|'))) continue;
      themCapBien(capBienTheoNut, nut, `CHUA_CHUNG_MINH_TACH với \`${dt}\``);
    }
  }

  let tongNghiaThuong = 0;
  const dsNghiaThuong = [];
  const ctxBien = { L, bieuMeta, dkTheoNut, capBienTheoNut, tatCaNghiaThuong };
  for (const d of dks) {
    if (d.mo !== 'NGHIA_THUONG') continue;
    const ch = G.chuongCuaNut(d.nut);
    if (!ch || (chuongLoc && ch !== chuongLoc)) continue;
    tongNghiaThuong += 1;
    const kqBien = laNghiaThuongVungBien(d, ctxBien);
    if (!kqBien.vungBien) continue;
    dsNghiaThuong.push({
      idPhieu: `M81-NT-${d.id}`,
      chuong: ch,
      nhom4: nhom4CuaNut(d.nut),
      banGhi: d,
      lyDo: kqBien.lyDo,
    });
  }
  dsNghiaThuong.sort(
    (a, b) => a.chuong.localeCompare(b.chuong) || a.banGhi.nut.localeCompare(b.banGhi.nut) || a.banGhi.id.localeCompare(b.banGhi.id),
  );

  // ── 3b. Gom Nhóm IV (Bảng anh em HO_PHU chưa chứng minh phủ kín) ──
  const dsHoPhu = [];
  for (const chaId of [...tapCha].sort()) {
    const ch = G.chuongCuaNut(chaId);
    if (!ch || (chuongLoc && ch !== chuongLoc)) continue;
    const con = G.conCua(chaId, L.cay);
    if (con.length < 2) continue;
    if (!con.some((id) => (dkTheoNut.get(id) || []).length > 0)) continue;
    if (con.some((id) => laLoaiKhacThuan(id, L, bieuMeta))) continue;
    const gcCha = (gcTheoCha.get(chaId) || []).filter(
      (g) => gcCapHopLe.has(`${chaId}|${[...g.cap].sort().join('|')}`),
    );
    const duongCha = G.duongDiNut(chaId, L.cay) || [];
    const dksDuongCha = duongCha.flatMap((b) => dkTheoNut.get(b.nut) || []);
    const tapDuTheoTruc = layTapDuHopLeTheoTruc(con, dkTheoNut, dkTheoNut.get(chaId) || [], dksDuongCha, { L });
    const truTheoNut = taoBanDoTruAnhEm(chaId, con, L, bieuMeta, dkTheoNut, gcCha, nguongById, { tapDuTheoTruc });
    if (!chungMinhPhuKin(con, dkTheoNut, nguongById, dkTheoNut.get(chaId) || [], dksDuongCha, { chaId, L, bieuMeta, truTheoNut })) {
      dsHoPhu.push({
        idPhieu: `M81-HP-${maNganNut(chaId)}`,
        chuong: ch,
        nhom4: nhom4CuaNut(chaId) || nhom4CuaNut(con[0]),
        cha: chaId,
        con,
      });
    }
  }
  dsHoPhu.sort((a, b) => a.chuong.localeCompare(b.chuong) || a.cha.localeCompare(b.cha));

  // ── 4. Gom theo Chương & kết xuất Markdown ──
  const tapChuong = new Set([
    ...dsVungChong.map((x) => x.chuong),
    ...dsGiaiChong.map((x) => x.chuong),
    ...dsNghiaThuong.map((x) => x.chuong),
    ...dsHoPhu.map((x) => x.chuong),
  ]);
  if (chuongLoc) tapChuong.add(chuongLoc);
  const danhSachChuong = [...tapChuong].sort();

  const theoChuong = {};
  for (const ch of danhSachChuong) {
    const vc = dsVungChong.filter((x) => x.chuong === ch);
    const gc = dsGiaiChong.filter((x) => x.chuong === ch);
    const nt = dsNghiaThuong.filter((x) => x.chuong === ch);
    const hp = dsHoPhu.filter((x) => x.chuong === ch);
    const nhomSet = new Set([
      ...vc.map((x) => x.nhom4),
      ...gc.map((x) => x.nhom4),
      ...nt.map((x) => x.nhom4),
      ...hp.map((x) => x.nhom4),
    ].filter(Boolean));
    theoChuong[ch] = {
      chuong: ch,
      nhom4: [...nhomSet].sort(),
      vungChong: vc.length,
      giaiChong: gc.length,
      nghiaThuong: nt.length,
      hoPhu: hp.length,
      tong: vc.length + gc.length + nt.length + hp.length,
    };
  }

  const loiCau = [];
  const muc = [];
  const tongPhieu = dsVungChong.length + dsGiaiChong.length + dsNghiaThuong.length + dsHoPhu.length;
  const soBanGhiGc = dsGiaiChong.reduce((s, x) => s + x.banGhi.length, 0);

  const md = [
    `# Gói người làm nghề duyệt điều kiện nguyên tử & bảng anh em (M-81)${chuongLoc ? ` — Chương ${chuongLoc}` : ''}`,
    ``,
    `- **Ngày xuất gói:** ${ngayChuan}`,
    `- **Nguồn dữ liệu (tất định 100%, không AI, không mạng):** \`data/ho-so-ma/dieu-kien/*.jsonl\`, \`data/ho-so-ma/bang-anh-em/*.jsonl\`, \`data/ho-so-ma/nguong/*.jsonl\`, \`data/luat-goc/\` (không đọc tiền lệ \`tb:\`, không đọc dữ liệu khách hàng hay tờ khai).`,
    `- **Nguyên tắc duyệt (\`#2410#issuecomment-7219708144\`):** Gói này chỉ xuất phiếu để người làm nghề chấm **Đúng / Sai / Cần thêm** và ghi **Kết luận người duyệt** ngay dưới mỗi mục. Không tự sửa dữ liệu trong PR này; sau khi người duyệt trả lời xong mới mở PR cập nhật dữ liệu riêng (đọc lại tự động bằng \`node scripts/ho-so-ma/goi-duyet.mjs --doc-bang=<tệp>\`).`,
    `- **Tổng hợp toàn gói:** **${tongPhieu} phiếu** gồm **${dsVungChong.length}** cặp \`VUNG_CHONG\` chưa giải · **${dsGiaiChong.length}** cặp \`GIAI_CHONG\` chờ duyệt (${soBanGhiGc} bản ghi) · **${dsNghiaThuong.length} / ${tongNghiaThuong}** điều kiện \`NGHIA_THUONG\` ở vùng biên${tatCaNghiaThuong ? ' (đang bật `--tat-ca-nghia-thuong`)' : ''} · **${dsHoPhu.length}** bảng anh em \`HO_PHU\` chờ duyệt.`,
    ``,
    `## Bảng tổng hợp theo Chương`,
    ``,
    `| Chương | Nhóm 4 số có mục duyệt | I. \`VUNG_CHONG\` chưa giải | II. \`GIAI_CHONG\` chờ duyệt | III. \`NGHIA_THUONG\` vùng biên | IV. \`HO_PHU\` chờ duyệt | Tổng phiếu |`,
    `|---|---|---:|---:|---:|---:|---:|`,
  ];

  for (const ch of danhSachChuong) {
    const tk = theoChuong[ch];
    md.push(`| Chương ${ch} | ${tk.nhom4.map((n) => `\`${n}\``).join(', ') || '—'} | ${tk.vungChong} | ${tk.giaiChong} | ${tk.nghiaThuong} | ${tk.hoPhu} | **${tk.tong}** |`);
  }
  md.push(`| **Tổng cộng** | **${danhSachChuong.length} chương** | **${dsVungChong.length}** | **${dsGiaiChong.length}** | **${dsNghiaThuong.length}** | **${dsHoPhu.length}** | **${tongPhieu}** |`, ``);

  for (const ch of danhSachChuong) {
    const vcCh = dsVungChong.filter((x) => x.chuong === ch);
    const gcCh = dsGiaiChong.filter((x) => x.chuong === ch);
    const ntCh = dsNghiaThuong.filter((x) => x.chuong === ch);
    const hpCh = dsHoPhu.filter((x) => x.chuong === ch);
    const tenChuong = gonMotDong(L.cay.theoId.get(`chuong:${ch}`)?.ten || L.cay.theoId.get(`bieu:${ch}`)?.ten || '');

    md.push(
      `## Chương ${ch}${tenChuong ? ` — ${tenChuong}` : ''}`,
      ``,
      `Tổng mục cần duyệt trong Chương ${ch}: **${vcCh.length + gcCh.length + ntCh.length + hpCh.length} phiếu** (\`VUNG_CHONG\` chưa giải: **${vcCh.length}** · \`GIAI_CHONG\` chờ duyệt: **${gcCh.length}** · \`NGHIA_THUONG\` vùng biên: **${ntCh.length}** · \`HO_PHU\` chờ duyệt: **${hpCh.length}**).`,
      ``,
    );

    if (!vcCh.length && !gcCh.length && !ntCh.length && !hpCh.length) {
      md.push(`*(Không có mục cần người duyệt trong Chương ${ch})*`, ``);
      continue;
    }

    // Nhóm I: VUNG_CHONG chưa giải
    if (vcCh.length) {
      md.push(`#### I. Cặp \`VUNG_CHONG\` chưa giải — Chương ${ch} (${vcCh.length} phiếu)`, ``);
      for (const vc of vcCh) {
        const tenCha = tenBieuCuaNut(vc.cha, L, bieuMeta);
        md.push(
          `### [${vc.idPhieu}] ${vc.nutA} × ${vc.nutB}`,
          ``,
          `- **Loại mục duyệt:** \`VUNG_CHONG\` chưa có \`GIAI_CHONG\``,
          `- **Nút cha:** \`${vc.cha}\` (\`${dinhDangMaCham(vc.cha)}\`) — "${tenCha}"`,
          ...dinhDangDanhSachDieuKienNut(vc.nutA, dkTheoNut, L, bieuMeta, nguongById, loiCau),
          ...dinhDangDanhSachDieuKienNut(vc.nutB, dkTheoNut, L, bieuMeta, nguongById, loiCau),
        );
        const daInCauVc = new Set([
          ...(dkTheoNut.get(vc.nutA) || []).flatMap((d) => [d.nguon, ...(Array.isArray(d.moNguon) ? d.moNguon : (d.moNguon ? [d.moNguon] : []))]),
          ...(dkTheoNut.get(vc.nutB) || []).flatMap((d) => [d.nguon, ...(Array.isArray(d.moNguon) ? d.moNguon : (d.moNguon ? [d.moNguon] : []))]),
        ]);
        if (vc.matHangNguyenVan) {
          md.push(`- **Mặt hàng chồng cụ thể:** ${vc.matHangNguyenVan}`);
        }
        if (vc.lyDoNguyenVan) {
          md.push(`- **Lý do chưa ghi \`GIAI_CHONG\`:** ${vc.lyDoNguyenVan}`);
        }
        const vanBanVc = `${vc.matHangNguyenVan || ''} ${vc.lyDoNguyenVan || ''}`;
        const cauPhuIds = [...vanBanVc.matchAll(/\b((?:gir|phan|chuong|nhom|pn|bieu|sen|wco|tb):[A-Za-z0-9:._-]+#\d+)\b/g)].map((m) => m[1]);
        for (const cid of [...new Set(cauPhuIds)]) {
          const chuPhu = traCauLuatAnToan(cid, L, loiCau);
          if (!daInCauVc.has(cid)) {
            md.push(`  > Câu dẫn chiếu liên quan (\`${cid}\`): "${chuPhu}"`);
            daInCauVc.add(cid);
          }
        }
        md.push(
          `- **Câu hỏi cho người duyệt:** Khi mặt hàng thoả đồng thời hai nhánh trên, ưu tiên nhánh nào hoặc áp quy tắc/dữ kiện phân xử nào?`,
          ``,
          `- [ ] **Đúng**  - [ ] **Sai**  - [ ] **Cần thêm**`,
          `- **Kết luận người duyệt:** `,
          ``,
          `---`,
          ``,
        );
        muc.push({ id: vc.idPhieu, nhomMuc: 'VUNG_CHONG', chuong: ch, cha: vc.cha, cap: [vc.nutA, vc.nutB] });
      }
    }

    // Nhóm II: GIAI_CHONG mang ghiChu cần người duyệt
    if (gcCh.length) {
      md.push(`#### II. Quy tắc \`GIAI_CHONG\` đề xuất chờ người duyệt — Chương ${ch} (${gcCh.length} phiếu)`, ``);
      for (const gc of gcCh) {
        const tenCha = tenBieuCuaNut(gc.cha, L, bieuMeta);
        md.push(
          `### [${gc.idPhieu}] ${gc.nutA} × ${gc.nutB}`,
          ``,
          `- **Loại mục duyệt:** \`GIAI_CHONG\` đề xuất mang cờ chờ người làm nghề xác nhận (${gc.banGhi.length} bản ghi)`,
          `- **Nút cha:** \`${gc.cha}\` (\`${dinhDangMaCham(gc.cha)}\`) — "${tenCha}"`,
          ...dinhDangDanhSachDieuKienNut(gc.nutA, dkTheoNut, L, bieuMeta, nguongById, loiCau),
          ...dinhDangDanhSachDieuKienNut(gc.nutB, dkTheoNut, L, bieuMeta, nguongById, loiCau),
          `- **Bản ghi \`GIAI_CHONG\` đề xuất:**`,
        );
        for (const r of gc.banGhi) {
          const chuNguon = traCauLuatAnToan(r.nguon, L, loiCau);
          md.push(
            `  - \`${r.id || '(không id)'}\` · cách: \`${r.cach}\`${r.trangThai ? ` · trạng thái: \`${r.trangThai}\`` : ''}${r.ghiChu ? ` · ghi chú: *${gonMotDong(r.ghiChu)}*` : ''}`,
            `    - Trích dẫn: *"${gonMotDong(r.trich)}"*`,
            `    > **Câu luật nguyên văn (\`${r.nguon}\`):** "${chuNguon}"`,
          );
        }
        md.push(
          `- **Câu hỏi cho người duyệt:** Quy tắc giải chồng đề xuất trên có áp dụng đúng nghiệp vụ cho cặp anh em này không?`,
          ``,
          `- [ ] **Đúng**  - [ ] **Sai**  - [ ] **Cần thêm**`,
          `- **Kết luận người duyệt:** `,
          ``,
          `---`,
          ``,
        );
        muc.push({
          id: gc.idPhieu,
          nhomMuc: 'GIAI_CHONG',
          chuong: ch,
          cha: gc.cha,
          cap: [gc.nutA, gc.nutB],
          banGhiIds: gc.banGhi.map((x) => x.id),
        });
      }
    }

    // Nhóm III: NGHIA_THUONG ở vùng biên
    if (ntCh.length) {
      md.push(`#### III. Điều kiện \`NGHIA_THUONG\` ở vùng biên — Chương ${ch} (${ntCh.length} phiếu)`, ``);
      for (const nt of ntCh) {
        const d = nt.banGhi;
        const tenNut = tenBieuCuaNut(d.nut, L, bieuMeta);
        const chuNguon = traCauLuatAnToan(d.nguon, L, loiCau);
        md.push(
          `### [${nt.idPhieu}] ${d.nut} — "${gonMotDong(d.trich)}"`,
          ``,
          `- **Loại mục duyệt:** \`DIEU_KIEN\` mang \`mo="NGHIA_THUONG"\` ở vùng biên`,
          `- **Nút biểu:** \`${d.nut}\` (\`${dinhDangMaCham(d.nut)}\`) — "${tenNut}"`,
          `- **Điều kiện nguyên tử:** \`${d.id}\` · ${moTaKieuDieuKien(d, nguongById)}`,
          `- **Lý do xếp vùng biên:** ${nt.lyDo.join('; ')}`,
          `- **Cụm trích từ luật:** *"${gonMotDong(d.trich)}"*`,
          ``,
          `> **Câu luật nguyên văn (\`${d.nguon}\`):** "${chuNguon}"`,
          `> Vân tay câu: \`${(d.vanTay || '').slice(0, 12)}\``,
          ``,
          `- **Câu hỏi dừng hỏi hiện tại (\`cauHoi\`):** "${gonMotDong(d.cauHoi)}"`,
          `- **Câu hỏi cho người duyệt:** Cách hiểu ranh giới và câu hỏi dừng hỏi trên cho thuật ngữ chưa định nghĩa luật này đã chuẩn xác chưa?`,
          ``,
          `- [ ] **Đúng**  - [ ] **Sai**  - [ ] **Cần thêm**`,
          `- **Kết luận người duyệt:** `,
          ``,
          `---`,
          ``,
        );
        muc.push({ id: nt.idPhieu, dieuKienId: d.id, nhomMuc: 'NGHIA_THUONG', chuong: ch, nut: d.nut });
      }
    }

    // Nhóm IV: Bảng anh em HO_PHU chưa chứng minh phủ kín
    if (hpCh.length) {
      md.push(`#### IV. Bảng anh em \`HO_PHU\` chưa chứng minh phủ kín — Chương ${ch} (${hpCh.length} phiếu)`, ``);
      for (const hp of hpCh) {
        const tenCha = tenBieuCuaNut(hp.cha, L, bieuMeta);
        const cauChaId = L.cau.has(`${hp.cha}#1`) ? `${hp.cha}#1` : null;
        md.push(
          `### [${hp.idPhieu}] ${hp.cha} — Bảng anh em chưa chứng minh phủ kín`,
          ``,
          `- **Loại mục duyệt:** \`HO_PHU\` — nhóm không có dòng \`"Loại khác"\` nhưng chưa có câu luật đóng miền chứng minh phủ kín phạm vi cha`,
          `- **Nút cha:** \`${hp.cha}\` (\`${dinhDangMaCham(hp.cha)}\`) — "${tenCha}"`,
          ...(cauChaId ? [`  > **Câu biểu nút cha (\`${cauChaId}\`):** "${traCauLuatAnToan(cauChaId, L, loiCau)}"`] : []),
          ...dinhDangDanhSachDieuKienNut(hp.cha, dkTheoNut, L, bieuMeta, nguongById, loiCau),
          `- **Các nút anh em con trực tiếp (${hp.con.length} nút):**`,
          ...hp.con.flatMap((cid) => dinhDangDanhSachDieuKienNut(cid, dkTheoNut, L, bieuMeta, nguongById, loiCau)),
          `- **Câu hỏi cho người duyệt:** Các nhánh anh em con trên đã phủ kín thực tế phạm vi nút cha theo nghiệp vụ phân loại chưa, hay còn trường hợp hàng hoá hợp lệ của nút cha lọt giữa các nhánh (cần bổ sung căn cứ đóng miền / điều kiện)?`,
          ``,
          `- [ ] **Đúng**  - [ ] **Sai**  - [ ] **Cần thêm**`,
          `- **Kết luận người duyệt:** `,
          ``,
          `---`,
          ``,
        );
        muc.push({ id: hp.idPhieu, nhomMuc: 'HO_PHU', chuong: ch, cha: hp.cha, con: hp.con });
      }
    }
  }

  const noiDungMd = md.join('\n') + '\n';
  // Chốt chặn cuối: quét toàn văn gói xuất đảm bảo mọi token id câu đều có thật trong kho luật gốc (không tb:, không id ma)
  const tatCaTokenCau = [...noiDungMd.matchAll(/\b((?:gir|phan|chuong|nhom|pn|bieu|sen|wco|tb):[A-Za-z0-9:._-]+#\d+)\b/g)].map((m) => m[1]);
  for (const cid of [...new Set(tatCaTokenCau)]) {
    if (/^tb:/.test(cid) || L.chuCau(cid) === null) {
      if (!loiCau.includes(cid)) loiCau.push(cid);
    }
  }

  fs.mkdirSync(outDir, { recursive: true });
  const tenTep = chuongLoc ? `m81-ch${chuongLoc}-${ngayChuan}.md` : `m81-${ngayChuan}.md`;
  const tepMd = path.join(outDir, tenTep);
  fs.writeFileSync(tepMd, noiDungMd, 'utf8');

  return {
    tepMd,
    ngay: ngayChuan,
    chuong: chuongLoc,
    tongPhieu,
    soVungChong: dsVungChong.length,
    soGiaiChong: dsGiaiChong.length,
    soBanGhiGiaiChong: soBanGhiGc,
    soNghiaThuong: dsNghiaThuong.length,
    tongNghiaThuong,
    soHoPhu: dsHoPhu.length,
    dsHoPhu,
    loiCau,
    theoChuong,
    muc,
  };
}

// ── đọc lại ô đã đánh (hỗ trợ cả phiếu M-78 lẫn phiếu M-81 + Kết luận người duyệt) ──
function docBang(tep) {
  const s = fs.readFileSync(tep, 'utf8');
  const blok = s.split(/^### /m).slice(1);
  const ket = [];
  for (const rawBlock of blok) {
    const b = rawBlock.split(/^(?:---|\s*##\s|\s*####\s)/m)[0];
    const id = /^\[([^\]]+)\]/.exec(b)?.[1]
      || /^(\S+) —/.exec(b)?.[1]
      || /^(\d+)\./m.exec(b)?.[1]
      || null;
    const cacDau = [];
    if (/\[x\]\s*\*\*Rút đúng\*\*/iu.test(b)) cacDau.push('DUNG');
    if (/\[x\]\s*\*\*Rút sai\*\*/iu.test(b)) cacDau.push('SAI');
    if (/\[x\]\s*\*\*Không rõ\*\*/iu.test(b)) cacDau.push('KHONG_RO');
    if (/\[x\]\s*\*\*Đúng\*\*/iu.test(b)) cacDau.push('DUNG');
    if (/\[x\]\s*\*\*Sai\*\*/iu.test(b)) cacDau.push('SAI');
    if (/\[x\]\s*\*\*Cần thêm\*\*/iu.test(b)) cacDau.push('CAN_THEM');
    const dau = cacDau.length > 1 ? 'NHIEU_DAU' : (cacDau[0] || null);
    const mKetLuan = /^-\s*\*\*Kết luận người duyệt:\*\*\s*(.*)$/mu.exec(b);
    const ketLuan = mKetLuan ? mKetLuan[1].trim() : '';
    if (id && dau) {
      ket.push(ketLuan ? { id, dau, ketLuan } : { id, dau });
    }
  }
  return ket;
}

// ── xuất cho test import/require trực tiếp ──
export { goi, goiM81, docBang, laNghiaThuongVungBien };

// ── main CLI (chỉ chạy khi gọi trực tiếp tệp này, không sinh rác khi import/require) ──
function layGiaTriCo(args, tenCo) {
  const coBang = args.find((a) => a.startsWith(`${tenCo}=`));
  if (coBang) return coBang.slice(tenCo.length + 1);
  const idx = args.indexOf(tenCo);
  if (idx >= 0 && idx + 1 < args.length && !args[idx + 1].startsWith('--')) return args[idx + 1];
  return null;
}

function main(argv = process.argv.slice(2)) {
  const docBangTep = layGiaTriCo(argv, '--doc-bang');
  if (docBangTep) {
    const ket = docBang(docBangTep);
    console.log(`Đọc lại ${ket.length} ô đã đánh:`);
    const gom = {};
    for (const item of ket) (gom[item.dau] = gom[item.dau] || []).push(item);
    for (const [dau, ds] of Object.entries(gom)) {
      console.log(`  ${dau}: ${ds.length} — ${ds.map((x) => x.id).join(', ')}`);
      for (const x of ds) {
        if (x.ketLuan) console.log(`    · [${x.id}] Kết luận: ${x.ketLuan}`);
      }
    }
    console.log('→ Sửa tại nguồn: ô sai/cần thêm ⇒ mở PR cập nhật dữ liệu tương ứng theo kết luận người duyệt.');
    return;
  }

  const ngay = layGiaTriCo(argv, '--ngay') || new Date().toISOString().slice(0, 10);
  const chuongArg = layGiaTriCo(argv, '--chuong');
  const hoSoArg = layGiaTriCo(argv, '--ho-so');
  const luatArg = layGiaTriCo(argv, '--luat');
  const outArg = layGiaTriCo(argv, '--out');

  if (argv.includes('--m81')) {
    const nhomArg = layGiaTriCo(argv, '--nhom');
    const kq = goiM81(ngay, {
      chuong: chuongArg ? chuongArg.padStart(2, '0') : null,
      nhom: nhomArg || null,
      tatCaNghiaThuong: argv.includes('--tat-ca-nghia-thuong'),
      vungChong: layGiaTriCo(argv, '--vung-chong'),
      hoSo: hoSoArg ? path.resolve(hoSoArg) : HO_SO,
      luat: luatArg ? path.resolve(luatArg) : LUAT,
      out: outArg ? path.resolve(outArg) : OUT_M81,
    });
    console.log(
      `gói duyệt M-81${kq.chuong ? ` (chương ${kq.chuong})` : ''}: ${kq.tongPhieu} phiếu `
      + `(VUNG_CHONG=${kq.soVungChong}, GIAI_CHONG=${kq.soGiaiChong} [${kq.soBanGhiGiaiChong} bản ghi], `
      + `NGHIA_THUONG vùng biên=${kq.soNghiaThuong}/${kq.tongNghiaThuong}, HO_PHU=${kq.soHoPhu})`,
    );
    console.log(`  ${kq.tepMd}`);
    if (kq.loiCau.length) {
      console.error(`  ✗ Không tra được ${kq.loiCau.length} câu luật: ${kq.loiCau.join(', ')}`);
      process.exitCode = 1;
    }
    return;
  }

  const chuong = chuongArg ? chuongArg.padStart(2, '0') : '84';
  const toiDaRaw = layGiaTriCo(argv, '--toi-da');
  const toiDa = toiDaRaw ? Number(toiDaRaw) : 30;
  const kq = goi(chuong, ngay, toiDa, {
    hoSo: hoSoArg ? path.resolve(hoSoArg) : HO_SO,
    luat: luatArg ? path.resolve(luatArg) : LUAT,
    out: outArg ? path.resolve(outArg) : OUT,
  });
  console.log(`gói duyệt chương ${chuong}: ${kq.so} vấn đề (trong đó ${kq.lech} lệch phiếu; tổng hồ sơ chương ${kq.tong})`);
  console.log(`  ${kq.tepMd}`);
  console.log(`  ${kq.tepTraLoi}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
