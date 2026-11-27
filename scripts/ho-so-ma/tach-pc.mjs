#!/usr/bin/env node
// scripts/ho-so-ma/tach-pc.mjs — M-72 (#1964, ADR-0006): tách vấn đề đơn cấp Phần, Chương (Phân chương) từ câu luật.
// Hai mô hình khác nhà tách độc lập (Gemma máy nhà, Gemini qua agy); máy ghép hai phiếu, máy điền id câu, lop, nguon, vân tay.
//   node scripts/ho-so-ma/tach-pc.mjs --nut phan:XV --nut chuong:76 [--viec ~/hsm-viec] [--mo gemma,agy] [--chi-ghep] [--xem-goi]
//   --chi-ghep  không gọi mô hình, chỉ ghép lại từ đệm (sau khi sửa máy ghép)
//   --xem-goi   in lời hỏi lượt đầu của từng nút rồi dừng
import { fileURLToPath } from 'node:url';
import { chay, thamSo, dungGoi, chiaLuot, loiHoi, G } from './tach-chung.mjs';
import { napLuatCong } from './cong.mjs';

async function main() {
  const t = thamSo(process.argv.slice(2));
  const nuts = t.lay('--nut').map((s) => (/^\d{2}$/.test(s) ? `chuong:${s}` : s));
  if (!nuts.length || nuts.some((n) => !['PHAN', 'CHUONG', 'PHAN_CHUONG'].includes(G.capCuaNut(n)))) { console.error('cần --nut phan:XV | chuong:76 | chuong:28:pc:II'); process.exit(2); }
  if (t.xemGoi) { const L = napLuatCong(t.luat); for (const n of nuts) { const g = dungGoi(n, L, { anhEm: false }); console.log(loiHoi(g, chiaLuot(g)[0])); } return; }
  const r = await chay({ nuts, viec: t.viec, hoSo: t.hoSo, luat: t.luat, chiThuMuc: ['phan', 'chuong'], anhEm: () => false, chiGhep: t.chiGhep, mo: t.mo });
  console.log(JSON.stringify({ soBanGhi: r.banGhi.length, ...r.tk, loiMay: r.loiMay.length, loiPhieu: r.loiPhieu.length, tep: r.tep }));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(1); });
