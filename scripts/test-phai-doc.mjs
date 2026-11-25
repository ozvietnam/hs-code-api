#!/usr/bin/env node
// scripts/test-phai-doc.mjs — lib/do-thi/phai-doc.js: chạm một nút kéo ra hết những gì luật nối tới (ADR-0005). Tất định, không mạng, không AI.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { boKiem } from './lib-luat.mjs';

const require = createRequire(import.meta.url);
const { kiem, xong } = boKiem('test-phai-doc');
const { phaiDoc } = require('../lib/do-thi/phai-doc.js');
const cg = JSON.parse(fs.readFileSync(new URL('../data/chu-giai-heading.json', import.meta.url), 'utf8'));
const muc = (p, b) => p.trinhTu.find((x) => x.buoc === b);
const nut4 = (p, b) => new Set(muc(p, b).muc.map((m) => m.nut.slice(0, 4)));

const p = phaiDoc('7616');
kiem('7616: loại trừ ra gồm 58.09 và 96.04', nut4(p, 'LOAI_TRU_RA').has('5809') && nut4(p, 'LOAI_TRU_RA').has('9604'));
kiem('7616: loại trừ vào có 48.21 (chú giải 48.21 đẩy nhãn kim loại sang)', nut4(p, 'LOAI_TRU_VAO').has('4821'));
kiem('7616: nhắc tới 73.17, 73.18 (câu "được mô tả trong các chú giải nhóm 73.17 và 73.18")', nut4(p, 'NHAC_TOI').has('7317') && nut4(p, 'NHAC_TOI').has('7318'));
kiem('7318: được 76.16 nhắc (chiều vào)', nut4(phaiDoc('7318'), 'DUOC_NHAC').has('7616'));
kiem('cấp dưới đúng cấp gạch: 7616 → 761610 và 76169, không nhảy xuống 8 số', p.capDuoi.map((x) => x.ma).join() === '761610,76169');
kiem('Quy tắc 6: 761610 chỉ so với anh em cùng cấp', phaiDoc('761610').cungCap.map((x) => x.ma).join() === '76169' && /Quy tắc 6/.test(phaiDoc('761610').quyTac));
kiem('CA NGƯỢC: mã không có trong biểu / quá ngắn → null', phaiDoc('0000') === null && phaiDoc('76') === null && phaiDoc('') === null && phaiDoc(null) === null);
kiem('gọi hai lần ra giống hệt', JSON.stringify(phaiDoc('8536')) === JSON.stringify(phaiDoc('8536')));

// Bất biến trên toàn kho
const H = Object.keys(cg); const tat = new Map(H.map((h) => [h, phaiDoc(h)]).filter(([, x]) => x));
let thieuTrich = 0; let toKhai = 0; let lechChieu = 0;
for (const [h, x] of tat) {
  for (const b of x.trinhTu) for (const m of b.muc) { if (!m.trich || !m.nguon) thieuTrich += 1; if (/to[_\s-]?khai|oz-gold/i.test(`${m.nguon}`)) toKhai += 1; }
  if (muc(x, 'LOAI_TRU_RA').conLai) continue;
  for (const m of muc(x, 'LOAI_TRU_RA').muc) { const k = tat.get(m.nut.slice(0, 4)); if (k && m.nut.length === 4 && !muc(k, 'LOAI_TRU_VAO').conLai && !nut4(k, 'LOAI_TRU_VAO').has(h)) lechChieu += 1; }
}
kiem('mọi mục đều có câu trích và nguồn', thieuTrich === 0, String(thieuTrich));
kiem('không mục nào lấy từ tờ khai', toKhai === 0, String(toKhai));
kiem('A loại trừ sang B thì chạm B cũng thấy A', lechChieu === 0, String(lechChieu));

// Chú giải nhóm (toàn văn) nhắc nhóm nào thì chạm nhóm phải thấy nhóm đó. Con số là nợ đã biết: chỉ được GIẢM.
const NO_DA_BIET = 48;
let no = 0; const ds = [];
for (const [h, x] of tat) {
  const co = new Set(x.trinhTu.flatMap((b) => b.muc.map((m) => m.nut.slice(0, 4))));
  for (const k of new Set([...String(cg[h].nhom || '').matchAll(/(?<![\d.,])(\d{2})\.(\d{2})(?![\d.]\d|\d)/g)].map((a) => a[1] + a[2]))) if (k !== h && tat.has(k) && !co.has(k)) { no += 1; ds.push(`${h}→${k}`); }
}
kiem(`câu chú giải nhắc nhóm mà chưa có cạnh: ${no} ≤ ${NO_DA_BIET}`, no <= NO_DA_BIET, ds.slice(0, 20).join(' '));
if (process.argv.includes('--no')) console.log(ds.join(' '));

// Tách luật và bổ trợ trong /api/notes
const G = require('../lib/gir-notes.js');
const nh = G.buildNoteChain('54080000').find((e) => e.level === 'HEADING');
kiem('noteVi của nhóm không còn đoạn AI soạn', !/Phân biệt:/.test(nh.noteVi) && nh.noteVi.startsWith(String(cg['5408'].nhom).trim().slice(0, 60)));
kiem('đoạn AI soạn nằm riêng ở boTro, nhãn AI_CHUA_KIEM', nh.boTro?.[0]?.nhan === 'AI_CHUA_KIEM' && /KHÔNG phải luật/.test(nh.boTro[0].ghiChu));
xong();
