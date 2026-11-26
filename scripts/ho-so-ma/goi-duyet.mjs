#!/usr/bin/env node
// scripts/ho-so-ma/goi-duyet.mjs — MÁY DỰNG GÓI DUYỆT hồ sơ vấn đề (M-78, #1970).
//
// Mỗi Chương trọng điểm: 30 vấn đề chọn ngẫu nhiên (seed cố định theo chương + ngày) + TOÀN BỘ vấn đề
// LECH_PHIEU (hai mô hình đọc luật ra hai kết luận). Trình bày dễ đọc: câu luật nguyên văn +
// câu hỏi lời thường + 3 ô đánh dấu Đúng / Sai / Không rõ. Người duyệt điền xong:
//   node scripts/ho-so-ma/goi-duyet.mjs --doc-bang=<tệp đã điền>
// máy đọc lại các ô đã đánh, in tóm tắt để sửa ngay tại nguồn.
//
// CHỈ TỪ LUẬT: không dữ liệu khách, không tờ khai, không tiền lệ, không lời AI.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { napLuat } from '../../lib/ho-so-ma/ghep.js';

const GOC = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const HO_SO = path.join(GOC, 'data', 'ho-so-ma');
const LUAT = path.join(GOC, 'data', 'luat-goc');
const OUT = path.join(GOC, 'docs', 'ho-so', 'duyet');
const THU = ['phan', 'chuong', 'nhom', 'phan-nhom', 'dong', 'nguong', 'liet-ke'];

const args = process.argv.slice(2);
const optDocBang = args.find((a) => a.startsWith('--doc-bang='));
const optChuong = args.find((a) => a.startsWith('--chuong='));
const optNgay = args.find((a) => a.startsWith('--ngay='));
const optToiDa = args.find((a) => a.startsWith('--toi-da='));

const docJsonl = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l)) : []);

// nút → bản ghi câu (nạp theo thư mục kho luật — mặc định data/luat-goc/cau)
const cauBanGhiCua = (luatDir) => {
  const map = new Map();
  const cauDir = path.join(luatDir, 'cau');
  if (fs.existsSync(cauDir)) {
    for (const tep of fs.readdirSync(cauDir)) {
      if (!tep.endsWith('.jsonl')) continue;
      for (const r of docJsonl(path.join(cauDir, tep))) map.set(r.id, { tep: tep.replace('.jsonl', ''), tu: r.tu, den: r.den ?? null });
    }
  }
  return map;
};
const cauBanGhi = cauBanGhiCua(LUAT);

// nút → chữ nguyenVan đầy đủ (nạp theo thư mục kho luật — mặc định data/luat-goc)
const nutChuCua = (luatDir) => {
  const map = new Map();
  for (const tep of ['bieu', 'chuong', 'phan', 'nhom', 'phan-nhom', 'gir']) {
    const f = path.join(luatDir, `${tep}.jsonl`);
    for (const r of docJsonl(f)) if (r.id && typeof r.nguyenVan === 'string') map.set(r.id, r.nguyenVan);
  }
  return map;
};
const nutChu = nutChuCua(LUAT);

/** Câu luật nguyên văn của một id câu — cần bản ghi câu + nutChu của thư mục đang xét. */
function cauChu(cauId, banGhi, nutChu) {
  const nut = nutCuaCauId(cauId);
  const chuFull = nutChu.get(nut);
  if (typeof chuFull !== 'string') return null;
  return chuFull.slice(banGhi.tu ?? 0, banGhi.den ?? chuFull.length);
}

/** Nút chủ của câu (giống ghep.chuCuaCau nhưng trả nguyên id nút trên cây bieu/chuong). */
function nutCuaCauId(cauId) {
  const nut = String(cauId || '').split('#')[0];
  if (/^sen:md:/.test(nut)) return null;
  if ((/^gir:/.test(nut))) return nut;
  let m;
  if ((m = /^phan:([IVX]+)(?::|$)/.exec(nut))) return `phan:${m[1]}`;
  if ((m = /^chuong:(\d{2}):pc:([IVX]+)(?::|$)/.exec(nut))) return `chuong:${m[1]}:pc:${m[2]}`;
  if ((m = /^chuong:(\d{2})(?::|$)/.exec(nut))) return `chuong:${m[1]}`;
  if ((m = /^bieu:(\d{2})$/.exec(nut))) return `chuong:${m[1]}`;
  if (/^bieu:\d{2,8}(?::td\d+)*$/.test(nut)) return nut;
  if ((m = /^nhom:(\d{4}):/.exec(nut))) return `bieu:${m[1]}`;
  if ((m = /^pn:(\d{6}):/.exec(nut))) return `bieu:${m[1]}`;
  if ((m = /^sen:chuong:(\d{2}):/.exec(nut))) return `chuong:${m[1]}`;
  if ((m = /^sen:phan:([IVX]+):/.exec(nut))) return `phan:${m[1]}`;
  if ((m = /^sen:(\d{4,8}):/.exec(nut))) return `bieu:${m[1]}`;
  if ((m = /^wco:(\d{6}):/.exec(nut))) return `bieu:${m[1]}`;
  return null;
}

// ── thu vấn đề của một Chương: đọc mọi tệp hồ sơ có chương này ──
function thuVanDe(chuong, hoSoDir) {
  const ds = [];
  for (const thu of THU) {
    const dir = path.join(hoSoDir, thu);
    if (!fs.existsSync(dir)) continue;
    for (const tep of fs.readdirSync(dir)) {
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

// ── dựng gói một chương ──
function goi(chuong, ngay, soToiDa, opts = {}) {
  const hoSoDir = opts.hoSo || HO_SO;
  const luatDir = opts.luat || LUAT;
  const outDir = opts.out || OUT;
  const L = napLuat(luatDir);
  const nutChu = nutChuCua(luatDir);
  const cauBanGhi = cauBanGhiCua(luatDir);
  const ds = thuVanDe(chuong, hoSoDir);
  const lech = ds.filter((r) => r.trangThai === 'LECH_PHIEU');
  const rng = mulberry32(Number(chuong) * 7919 + Number(ngay.replaceAll('-', '')));
  const conLai = ds.filter((r) => !lech.includes(r));
  const xao = [...conLai].sort(() => rng() - 0.5);
  const chon = [...lech, ...xao.slice(0, Math.max(0, soToiDa - lech.length))];

  const md = [
    `# Biên bản duyệt hồ sơ vấn đề — Chương ${chuong}`,
    ``,
    `Ngày: ${ngay} · Tổng vấn đề trong hồ sơ chương: ${ds.length} · Chọn: ${lech.length} lệch phiếu + ${chon.length - lech.length} ngẫu nhiên`,
    ``,
    `**Cách duyệt:** với mỗi vấn đề, đánh dấu ✗ vào đúng một ô (Đúng / Sai / Không rõ) so với hàng của anh/chị.`,
    `**Chỉ từ luật:** không có mô tả hàng, tờ khai, tiền lệ hay dữ liệu khách.`,
    ``,
  ];
  const traLoi = { chuong, ngay, soLuong: chon.length, muc: [] };
  for (const [i, r] of chon.entries()) {
    const banGhi = cauBanGhi.get(r.cau);
    const cau = banGhi ? cauChu(r.cau, banGhi, nutChu) || '(câu không thấy trong nút — ghi nhận lỗi)' : '(không có bản ghi câu — ghi nhận lỗi)';
    md.push(`---`, ``, `### ${i + 1}. ${r.id}`, ``, `- **Cấp nút:** ${r.nut}`, `- **Loại:** ${r.loai}`, `- **Câu hỏi:** ${cauHoi(r)}`, `- **Điều kiện:** ${r.dieuKien}`, ``, `> **Câu luật nguyên văn:** "${cau}"`, `> Nguồn: ${r.nguon || '(không ghi nguồn)'} · Vân tay: \`${(r.van || '').slice(0, 12)}\``, ``, `- [ ] **Đúng**  - [ ] **Sai**  - [ ] **Không rõ**`, ``);
    traLoi.muc.push({ id: r.id, nut: r.nut, loai: r.loai, cau: r.cau });
  }
  if (!chon.length) md.push('(không có vấn đề nào trong hồ sơ chương này)');

  fs.mkdirSync(outDir, { recursive: true });
  const tepMd = path.join(outDir, `chuong-${chuong}-${ngay}.md`);
  fs.writeFileSync(tepMd, md.join('\n') + '\n');
  const tepTraLoi = path.join(outDir, `chuong-${chuong}-${ngay}-tra-loi.json`);
  fs.writeFileSync(tepTraLoi, JSON.stringify(traLoi, null, 1) + '\n');
  return { tepMd, tepTraLoi, so: chon.length, lech: lech.length, tong: ds.length };
}

// ── đọc lại ô đã đánh ──
function docBang(tep) {
  const s = fs.readFileSync(tep, 'utf8');
  const blok = s.split(/^### /m).slice(1);
  const ket = [];
  for (const b of blok) {
    const id = /^(\S+) —/.exec(b)?.[1] || /^(\d+)\./m.exec(b)?.[1];
    const dau = /\[x\] \*\*Đúng\*\*/i.test(b) ? 'DUNG' : /\[x\] \*\*Sai\*\*/i.test(b) ? 'SAI' : /\[x\] \*\*Không rõ\*\*/i.test(b) ? 'KHONG_RO' : null;
    if (id && dau) ket.push({ id, dau });
  }
  return ket;
}

// ── xuất cho test import trực tiếp ──
export { goi, docBang };

// ── main ──
if (optDocBang) {
  const ket = docBang(optDocBang.slice(11));
  console.log(`Đọc lại ${ket.length} ô đã đánh:`);
  const gom = {};
  for (const { id, dau } of ket) (gom[dau] = gom[dau] || []).push(id);
  for (const [dau, ids] of Object.entries(gom)) console.log(`  ${dau}: ${ids.length} — ${ids.join(', ')}`);
  console.log('→ Sửa tại nguồn: ô sai với hồ sơ ⇒ sửa spec/nháp tương ứng (id in trên).');
} else {
  const chuong = optChuong ? optChuong.split('=').slice(1).join('=') : '84';
  const ngay = optNgay ? optNgay.split('=').slice(1).join('=') : new Date().toISOString().slice(0, 10);
  const toiDa = optToiDa ? Number(optToiDa.split('=').slice(1).join('=')) : 30;
  const kq = goi(chuong, ngay, toiDa);
  console.log(`gói duyệt chương ${chuong}: ${kq.so} vấn đề (trong đó ${kq.lech} lệch phiếu; tổng hồ sơ chương ${kq.tong})`);
  console.log(`  ${kq.tepMd}`);
  console.log(`  ${kq.tepTraLoi}`);
}
