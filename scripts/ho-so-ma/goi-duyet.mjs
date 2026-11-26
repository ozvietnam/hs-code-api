#!/usr/bin/env node
// scripts/ho-so-ma/goi-duyet.mjs — MÁY DỰNG GÓI DUYỆT hồ sơ vấn đề (M-78, #1970).
//
// Người duyệt KHÔNG so với hàng của ai. Họ chấm: vấn đề có RÚT ĐÚNG từ câu luật không.
// Mỗi Chương trọng điểm: 30 vấn đề chọn ngẫu nhiên + TOÀN BỘ LECH_PHIEU + mọi vấn đề
// trích không khớp câu luật (máy tự cắm cờ ⚠). Ô chấm: Rút đúng / Rút sai / Không rõ.
// Người duyệt điền xong: --doc-bang=<tệp> đọc lại để sửa tại nguồn.
//
// CHỈ TỪ LUẬT: không dữ liệu khách, không tờ khai, không tiền lệ, không lời AI.

import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { napLuat } from '../../lib/ho-so-ma/ghep.js';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const HO_SO = path.join(GOC, 'data', 'ho-so-ma');
const LUAT = path.join(GOC, 'data', 'luat-goc');
const CAU = path.join(LUAT, 'cau');
const OUT = path.join(GOC, 'docs', 'ho-so', 'duyet');
const THU = ['phan', 'chuong', 'nhom', 'phan-nhom', 'dong', 'nguong', 'liet-ke'];

const args = process.argv.slice(2);
const optDocBang = args.find((a) => a.startsWith('--doc-bang='));
const optChuong = args.find((a) => a.startsWith('--chuong='));
const optNgay = args.find((a) => a.startsWith('--ngay='));
const optToiDa = args.find((a) => a.startsWith('--toi-da='));

const docJsonl = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l)) : []);

// ── nạp kho câu: id câu → {nut gốc (giữ nguyên id từ bản ghi cau), tu, den} ──
const cauBanGhiCua = (luatDir) => {
  const map = new Map();
  const cauDir = path.join(luatDir, 'cau');
  if (fs.existsSync(cauDir)) {
    for (const tep of fs.readdirSync(cauDir)) {
      if (!tep.endsWith('.jsonl')) continue;
      for (const r of docJsonl(path.join(cauDir, tep))) {
        // GIỮ NGUYÊN nut gốc từ id câu — không quy về bieu (nhom:8415:ct:17 ≠ bieu:8415)
        const nut = String(r.id || '').split('#')[0];
        map.set(r.id, { nut, tep: tep.replace('.jsonl', ''), tu: r.tu, den: r.den ?? null });
      }
    }
  }
  return map;
};

// ── nút → chữ nguyenVan đầy đủ (nạp từ data/luat-goc + các nhánh mong/* cho kho chưa merge) ──
const nutChuCua = (luatDir) => {
  const map = new Map();
  for (const tep of ['bieu', 'chuong', 'phan', 'nhom', 'phan-nhom', 'gir']) {
    const f = path.join(luatDir, `${tep}.jsonl`);
    for (const r of docJsonl(f)) if (r.id && typeof r.nguyenVan === 'string') map.set(r.id, r.nguyenVan);
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
  const chon = [...lech, ...xao.slice(0, Math.max(0, soToiDa - lech.length))].map((r) => {
    const banGhi = cauBanGhi.get(r.cau);
    const nutChuBanGhi = banGhi ? nutChu : null;
    const cau = banGhi && nutChuBanGhi ? cauChu(r.cau, banGhi, nutChuBanGhi) || '(câu không thấy trong nút — ghi nhận lỗi)' : '(không có bản ghi câu — ghi nhận lỗi)';
    // M-78 điểm 3: máy tự cắm cờ — trích KHÔNG nằm trong câu luật ⇒ ⚠ + luôn đưa vào gói
    const trichKhop = r.trich && cau !== '(không có bản ghi câu — ghi nhận lỗi)' && cau !== '(câu không thấy trong nút — ghi nhận lỗi)' ? trichNamTrongCau(r, cau) : true;
    return { ...r, cauLuat: cau, trichLe: !trichNamTrongCau };
  });
  // M-78 điểm 3 (nâng cao): cả những mã trich không khớp (kể cả KHOP) luôn vào gói
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
    const canhBaoTrich = r.trichKhop === true ? `\n> ⚠ **trích không khớp câu luật** — kiểm tra nguồn` : '';
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

// ── đọc lại ô đã đánh ──
function docBang(tep) {
  const s = fs.readFileSync(tep, 'utf8');
  const blok = s.split(/^### /m).slice(1);
  const ket = [];
  for (const b of blok) {
    const id = /^(\S+) —/.exec(b)?.[1] || /^(\d+)\./m.exec(b)?.[1];
    const dau = /\[x\] \*\*Rút đúng\*\*/i.test(b) ? 'DUNG' : /\[x\] \*\*Rút sai\*\*/i.test(b) ? 'SAI' : /\[x\] \*\*Không rõ\*\*/i.test(b) ? 'KHONG_RO' : null;
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
