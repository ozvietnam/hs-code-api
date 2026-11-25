#!/usr/bin/env node
// scripts/test-chu-giai-goc.mjs — M-21 (#1908): Cổng kiểm /api/notes đọc kho luật gốc.
// Yêu cầu QT:
// - Không câu nào trong /api/notes nằm ngoài kho luật gốc (quét TOÀN BỘ 1.269 nhóm).
// - Trả kèm cha và câu dẫn (dan) từ data/luat-goc/cau; đủ id, lop, nguon, trang.
// - Giữ khuôn trả cũ của ERP, thêm trường mới nutLuat[].
// - Bỏ nhánh ghép khong_bao_gom/bao_gom/loai_tru; Phần không còn mượn chương khác; cấp gạch lấy từ bieu.jsonl (không hs-tree).
import './test-isolate-data.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { boKiem } from './lib-luat.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(new URL('..', import.meta.url).pathname);

process.env.HS_API_TOKEN = process.env.HS_API_TOKEN || 'test-m21-token';

const { napKho, docNutTheoId, layPhan, layNhom, datLai } = require('../lib/chu-giai-goc');
const { buildNoteChain, buildChapterNote, getNotesCoverage } = require('../lib/gir-notes');
const { notesCoverage, notesCoverageWarning } = require('../lib/notes-coverage');
const notesHandler = require('../api/notes');

const { kiem, xong } = boKiem('test-chu-giai-goc');

function goiNotes(query) {
  let status = 0;
  let body = null;
  const headers = {};
  const req = {
    method: 'GET',
    url: '/api/notes',
    query,
    headers: { authorization: `Bearer ${process.env.HS_API_TOKEN}` },
  };
  const res = {
    setHeader(k, v) { headers[String(k).toLowerCase()] = v; },
    getHeader(k) { return headers[String(k).toLowerCase()]; },
    status(c) { status = c; return res; },
    json(p) { body = p; return res; },
    end() { return res; },
  };
  notesHandler(req, res);
  return { status, body };
}

const kho = napKho();
const chuanText = (s) => String(s || '').replace(/\s+/g, ' ').trim();

// Tập mọi nguyên văn hợp lệ trong 6+1 kho luật gốc để kiểm chứng không câu nào nằm ngoài kho luật gốc
const tapKhoGocHopLe = new Set();
const tapNutIdHopLe = new Set();
for (const [id, n] of kho.theoId) {
  tapNutIdHopLe.add(id);
  const t = chuanText(n.nguyenVan);
  if (t) tapKhoGocHopLe.add(t);
}
for (const text of kho.cauTextById.values()) {
  if (text) tapKhoGocHopLe.add(chuanText(text));
}

// ── 1. Quét TOÀN BỘ 1.269 nhóm: không câu/nút nào trong /api/notes nằm ngoài kho luật gốc ───────────────
const dsNhom = [];
for (const id of kho.bieuTheoId.keys()) {
  const m = /^bieu:(\d{4})$/.exec(id);
  if (m) dsNhom.push(m[1]);
}
dsNhom.sort();

let loiNgoaiKho = 0;
let mauLoi = null;
let tongNutLuatQuet = 0;
let tongCoCha = 0;
let tongCoDan = 0;
const dsThieuTruong = [];

for (const h4 of dsNhom) {
  const { status, body } = goiNotes({ hs: `${h4}0000` });
  if (status !== 200 || !body?.found || !Array.isArray(body.nutLuat) || body.nutLuat.length === 0) {
    loiNgoaiKho += 1;
    if (!mauLoi) mauLoi = { h4, status, lyDo: 'thieu nutLuat hoac !found' };
    continue;
  }
  for (const nl of body.nutLuat) {
    tongNutLuatQuet += 1;
    if (!tapNutIdHopLe.has(nl.id)) {
      loiNgoaiKho += 1;
      if (!mauLoi) mauLoi = { h4, nlId: nl.id, lyDo: 'nutId khong co trong kho luat goc' };
    }
    if (!nl.lop || nl.lop === 'TIEN_LE' || !('nguon' in nl) || !('trang' in nl) || !('cha' in nl) || !('dan' in nl)) {
      if (dsThieuTruong.length < 3) dsThieuTruong.push({ h4, nlId: nl.id });
    }
    if (nl.cha) tongCoCha += 1;
    if (nl.dan) tongCoDan += 1;
    if (!nl.biRutChoVua && typeof nl.nguyenVan === 'string') {
      const goc = kho.theoId.get(nl.id);
      if (!goc || chuanText(goc.nguyenVan) !== chuanText(nl.nguyenVan)) {
        loiNgoaiKho += 1;
        if (!mauLoi) mauLoi = { h4, nlId: nl.id, lyDo: 'nguyenVan lech kho luat goc' };
      }
    }
  }
  // Kiểm từng tầng trong chain: nếu không bị cắt cho vừa, mọi đoạn trong HEADING.noteVi đều phải nằm trong kho luật gốc
  const hd = (body.chain || []).find((e) => e.level === 'HEADING');
    if (hd && !hd.biCatChoVua && hd.noteVi) {
    if (hd.boTro) {
      loiNgoaiKho += 1;
      if (!mauLoi) mauLoi = { h4, lyDo: 'van con boTro AI ngoai kho goc' };
    }
    const cacDoan = String(hd.noteVi).split('\n\n').map(chuanText).filter(Boolean);
    for (const doan of cacDoan) {
      const khopKho = tapKhoGocHopLe.has(doan) || kho.theoId.get(`bieu:${h4}`)?.nguyenVan === doan;
      if (!khopKho) {
        const dsNhomH4 = kho.nhomNodes.get(h4) || [];
        if (!dsNhomH4.some((n) => chuanText(n.nguyenVan).includes(doan))) {
          loiNgoaiKho += 1;
          if (!mauLoi) mauLoi = { h4, lyDo: 'doan HEADING.noteVi nam ngoai kho luat goc', doan: doan.slice(0, 80) };
          break;
        }
      }
    }
  }
}

kiem(
  `quét TOÀN BỘ ${dsNhom.length} nhóm: 0 câu/nút trong /api/notes nằm ngoài kho luật gốc (${tongNutLuatQuet} lượt nút)`,
  dsNhom.length >= 1200 && loiNgoaiKho === 0,
  JSON.stringify(mauLoi),
);
kiem(
  `mọi nút trong nutLuat[] có đủ id, lop (khác TIEN_LE), nguon, trang, cha, dan`,
  dsThieuTruong.length === 0 && tongCoCha > 0 && tongCoDan > 0,
  { thieu: dsThieuTruong, tongCoCha, tongCoDan },
);

// ── 2. Kiểm tra `cha` & `dan` (câu dẫn "không bao gồm:" từ kho cau) ──────────────────────────────────────
const r7616 = goiNotes({ hs: '7616' });
const n7616Ct9 = (r7616.body?.nutLuat || []).find((x) => x.id === 'nhom:7616:ct:9');
kiem(
  '7616: nhom:7616:ct:9 có cha="nhom:7616:ct:8" và dan.cau="Nhóm này không bao gồm:"',
  Boolean(n7616Ct9 && n7616Ct9.cha === 'nhom:7616:ct:8' && n7616Ct9.dan?.id === 'nhom:7616:ct:8#1' && /không bao gồm/i.test(n7616Ct9.dan?.cau || '')),
  n7616Ct9,
);

const nutDon = docNutTheoId('nhom:7616:ct:9');
kiem('docNutTheoId("nhom:7616:ct:9") trả đủ lớp/nguồn/trang/cha/dan', nutDon && nutDon.id === 'nhom:7616:ct:9' && nutDon.trang === 1616 && nutDon.cha === 'nhom:7616:ct:8' && nutDon.dan?.id === 'nhom:7616:ct:8#1');

const rById = goiNotes({ id: 'nhom:7616:ct:9' });
kiem('/api/notes?id=nhom:7616:ct:9 trả 200 + đúng nút gốc', rById.status === 200 && rById.body?.nut?.id === 'nhom:7616:ct:9');

// ── 3. Phần không còn mượn chương khác & cấp gạch lấy từ bieu.jsonl (không hs-tree) ──────────────────────
const r5401 = goiNotes({ hs: '5401' });
const phan5401 = (r5401.body?.chain || []).find((e) => e.level === 'SECTION');
kiem(
  '5401: Phần XI lấy trực tiếp từ phan.jsonl, KHÔNG còn muonChuongCungPhan',
  Boolean(phan5401 && phan5401.code === 'XI' && !('muonChuongCungPhan' in phan5401) && (phan5401.noteVi || '').length > 4000),
  { code: phan5401?.code, hasMuon: phan5401 && ('muonChuongCungPhan' in phan5401), len: phan5401?.noteVi?.length },
);

const pV = layPhan('25');
kiem('Phần V (Chương 25) không có chú giải trong phan.jsonl -> coChuGiai=false', pV && pV.section?.code === 'V' && pV.coChuGiai === false);

// Kiểm mã 85235111 từ bieu.jsonl có gach (lấy từ kho bieu, không hs-tree)
const chain8523 = buildNoteChain('85235111');
const nat8523 = chain8523.find((e) => e.level === 'NATIONAL');
kiem('85235111: cấp gạch lấy trực tiếp từ bieu.jsonl', Boolean(nat8523 && nat8523.gach === 4 && !nat8523.nguonLoai), JSON.stringify(nat8523));

// ── 4. Giữ khuôn trả cũ của ERP + SIZE_CAP + full=1 ───────────────────────────────────────────────────────
const r8481 = goiNotes({ hs: '8481' });
const size8481 = JSON.stringify(r8481.body).length;
kiem(
  '8481: giữ khuôn ERP (found, chapter, content, coverage, chain, sen) + nutLuat[] và vừa SIZE_CAP (<= 30.000)',
  r8481.status === 200
    && r8481.body?.found === true
    && r8481.body?.chapter === 84
    && typeof r8481.body?.content === 'string' && r8481.body.content.includes('Chú giải phân nhóm')
    && r8481.body?.coverage?.complete === true
    && Array.isArray(r8481.body?.nutLuat) && r8481.body.nutLuat.length > 0
    && size8481 <= 30000,
  JSON.stringify({ size8481, nutLuatCount: r8481.body?.nutLuat?.length, cov: r8481.body?.coverage }),
);

const r8481Full = goiNotes({ hs: '8481', level: 'all', full: '1' });
const phan8481Full = (r8481Full.body?.chain || []).find((e) => e.level === 'SECTION');
kiem(
  '8481 full=1: PHẦN có KHÁI QUÁT CHUNG và nutLuat giữ đủ nguyên văn',
  Boolean(phan8481Full && /KHÁI QUÁT CHUNG/.test(phan8481Full.noteVi || '') && r8481Full.body?.nutLuat?.every((n) => !n.biRutChoVua)),
);

const r81 = goiNotes({ chapter: '81' });
kiem('81: nói thẳng biểu gốc không có chú giải chương riêng', r81.status === 200 && /KHÔNG CÓ chú giải/i.test(r81.body?.content || ''));

const cov52 = notesCoverage('52051100');
kiem('52051100: notesCoverage complete=true từ kho luật gốc', cov52.complete === true && cov52.gaps.length === 0);
const warn0 = notesCoverageWarning('00000000');
kiem('CA NGƯỢC 00000000: notesCoverageWarning báo thiếu', Boolean(warn0 && warn0.id === 'notes-incomplete'));
const rNotFound = goiNotes({ hs: '00000000' });
kiem('CA NGƯỢC mã không tồn tại -> 404 found=false', rNotFound.status === 404 && rNotFound.body?.found === false);

// ── 5. CA NGƯỢC cô lập kho & kiểm tĩnh: không BO_TRO / TIEN_LE / hs-tree / LLM / scripts/ ─────────────────
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'm21-co-lap-'));
try {
  fs.writeFileSync(path.join(tmpDir, 'thong-bao.jsonl'), `${JSON.stringify({ id: 'tb:999-2026:99999999', loai: 'THONG_BAO', lop: 'TIEN_LE', cha: null, so: null, nguyenVan: 'tien_le_khong_duoc_lot_m21', nguon: { vanBan: 'TB', ban: 'VN', trang: 1 }, hieuLuc: { tu: null, den: null } })}\n`);
  datLai();
  const nutTb = docNutTheoId('tb:999-2026:99999999', { thuMuc: tmpDir });
  kiem('CA NGƯỢC không đọc thong-bao / lop TIEN_LE', nutTb === null);
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  datLai();
}

for (const rel of ['lib/chu-giai-goc.js', 'lib/gir-notes.js', 'lib/notes-coverage.js']) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\n').filter((l) => !/^\s*(?:\/\/|\*|\/\*)/.test(l)).join('\n');
  const cam = ['chu-giai-heading', 'chu-giai-chuong', 'explanatory-notes', 'notes.json', 'hs-tree', 'oz-gold', 'precedents', 'synonyms', 'thong-bao', 'callLLM', 'callLlm', 'scripts/']
    .filter((k) => src.includes(k));
  kiem(`tĩnh: ${rel} sạch khỏi kho cũ/BO_TRO/TIEN_LE/hs-tree/LLM (${cam.join(', ') || 'sạch'})`, cam.length === 0, cam);
}

const covGlobal = getNotesCoverage();
kiem('getNotesCoverage() đếm trực tiếp từ kho luật gốc', covGlobal.bySection === 9 && covGlobal.byHeading >= 1200 && covGlobal.byNational >= 10000, JSON.stringify(covGlobal));

if (process.argv.includes('--thong-ke')) {
  console.log('\n=== THỐNG KÊ M-21 ===');
  console.log(JSON.stringify({
    soNhomQuet: dsNhom.length,
    tongLuotNutLuat: tongNutLuatQuet,
    nutCoCha: tongCoCha,
    nutCoDan: tongCoDan,
    loiNgoaiKho,
    size8481Bytes: size8481,
    getNotesCoverage: covGlobal,
  }, null, 2));
}

xong();
