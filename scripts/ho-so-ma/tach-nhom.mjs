#!/usr/bin/env node
// scripts/ho-so-ma/tach-nhom.mjs — M-73 (#1965, ADR-0006): tách vấn đề đơn cấp nhóm 4 số (tên nhóm, chú giải chi tiết nhóm,
// cạnh M-33 đi ra và đi vào, tách với anh em cùng Chương). Hai phiếu độc lập (Gemma máy nhà, Gemini qua agy), máy ghép.
//   node scripts/ho-so-ma/tach-nhom.mjs --chuong 76 | --nhom 7605 [--nhom …] [--viec ~/hsm-viec] [--mo gemma,agy] [--chi-ghep] [--xem-goi]
// Tiêu đề 5 số chưa làm ở đây: anh em của nó là phân nhóm 6 số (M-76).
import { fileURLToPath } from 'node:url';
import { chay, thamSo, dungGoi, chiaLuot, loiHoi, G } from './tach-chung.mjs';
import { napLuatCong } from './cong.mjs';

async function main() {
  const t = thamSo(process.argv.slice(2));
  const L0 = G.napLuat(t.luat);
  const nuts = [
    ...t.lay('--chuong').flatMap((c) => G.conCua(`chuong:${c}`, L0).filter((id) => G.capCuaNut(id) === 'NHOM')),
    ...t.lay('--nhom').map((s) => `bieu:${s.replace(/\D/g, '')}`),
  ];
  if (!nuts.length || nuts.some((n) => G.capCuaNut(n) !== 'NHOM' || !L0.theoId.has(n))) { console.error('cần --chuong NN hoặc --nhom NNNN có thật'); process.exit(2); }
  if (t.xemGoi) { const L = napLuatCong(t.luat); for (const n of nuts) { const g = dungGoi(n, L); console.log(loiHoi(g, chiaLuot(g)[0])); } return; }
  const r = await chay({ nuts, viec: t.viec, hoSo: t.hoSo, luat: t.luat, chiGhep: t.chiGhep, mo: t.mo });
  console.log(JSON.stringify({ soBanGhi: r.banGhi.length, ...r.tk, loiMay: r.loiMay.length, loiPhieu: r.loiPhieu.length, tep: r.tep }));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(1); });
