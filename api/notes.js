// api/notes.js — M-21 (#1908): Đọc chú giải từ kho luật gốc qua lib/chu-giai-goc.js + giữ khuôn ERP + thêm nutLuat[].
'use strict';

const { requireAuthUnlessPublic } = require('../lib/public-access');
const { setCors, handleOptions } = require('../lib/cors');
const { buildNoteChain, buildChapterNote } = require('../lib/gir-notes');
const { notesCoverage } = require('../lib/notes-coverage');
const { senFor } = require('../lib/sen');
const { normalizeHs, napKho, docNutTheoId, nutLuatCho } = require('../lib/chu-giai-goc');

const SIZE_CAP = 29500;

function xinFull(v) {
  const s = String(v || '').trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'all' || s === 'phan' || s === 'chuong';
}

function rutGonNutChoVua(dsNut, tangGiua, giuNguyenVan = false, rutDanId = false) {
  return dsNut
    .filter((n) => tangGiua.has(n.tang))
    .map((n) => (giuNguyenVan ? n : {
      id: n.id,
      lop: n.lop,
      nguon: n.nguon,
      trang: n.trang,
      cha: n.cha,
      dan: n.dan ? (rutDanId ? n.dan.id : n.dan) : null,
    }));
}

function urlFullTheoThamSo({ hsCode, heading, chapNum, level }) {
  const thamSo = hsCode
    ? `hs=${hsCode}`
    : heading
      ? `heading=${String(heading).trim()}`
      : chapNum && chapNum !== 'NaN'
        ? `chapter=${chapNum}`
        : 'hs=';
  return `/api/notes?${thamSo}${level ? `&level=${level}` : ''}&full=1`;
}

// Giữ trần ~30.000 ký tự JSON cho ERP khi !full: giữ nguyên id/lop/nguon/trang/cha/dan của nutLuat, chỉ thu phần lặp.
function gioiHanKichThuoc(payload, { hsCode, heading, chapNum } = {}) {
  if (JSON.stringify(payload).length <= SIZE_CAP) return payload;
  const fullUrl = urlFullTheoThamSo({ hsCode, heading, chapNum });
  const headingFullUrl = urlFullTheoThamSo({ hsCode, heading, chapNum, level: 'HEADING' });
  const gocNut = Array.isArray(payload.nutLuat) ? payload.nutLuat : null;
  if (gocNut && gocNut.length > 0) {
    payload.nutLuatDayDu = fullUrl;
    payload.nutLuatTongSo = gocNut.length;
    // Bậc 1: giữ nguyên văn tầng đang hỏi (HEADING/SUBHEADING/NATIONAL/SEN), giữ 6 trường cốt lõi Phần/Chương
    payload.nutLuat = gocNut.map((n) => (['HEADING', 'SUBHEADING', 'NATIONAL', 'SEN'].includes(n.tang) ? n : {
      id: n.id,
      lop: n.lop,
      nguon: n.nguon,
      trang: n.trang,
      cha: n.cha,
      dan: n.dan || null,
    }));
    if (JSON.stringify(payload).length <= SIZE_CAP) return payload;
    // Bậc 2: chỉ giữ nguyên văn tầng đang hỏi (Phần & Chương đã đủ trong chain[0] và content)
    payload.nutLuat = rutGonNutChoVua(gocNut, new Set(['HEADING', 'SUBHEADING', 'NATIONAL', 'SEN']), true);
    if (JSON.stringify(payload).length <= SIZE_CAP) return payload;
    // Bậc 3: rút gọn chỉ giữ 6 trường cốt lõi (id, lop, nguon, trang, cha, dan) cho tầng đang hỏi
    payload.nutLuat = rutGonNutChoVua(gocNut, new Set(['HEADING', 'SUBHEADING', 'NATIONAL', 'SEN']), false, false);
    if (JSON.stringify(payload).length <= SIZE_CAP) return payload;
    // Bậc 4: rút dan thành id câu dẫn
    payload.nutLuat = rutGonNutChoVua(gocNut, new Set(['HEADING', 'SUBHEADING', 'NATIONAL', 'SEN']), false, true);
    if (JSON.stringify(payload).length <= SIZE_CAP) return payload;
    // Bậc 5: thu gọn độ dài mảng nutLuat trước khi cắt HEADING.noteVi để giữ nguyên coverage.complete
    const fullShortNut = payload.nutLuat;
    let lo = 1;
    let hi = fullShortNut.length;
    let best = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      payload.nutLuat = fullShortNut.slice(0, mid);
      payload.nutLuatBiRut = true;
      if (JSON.stringify(payload).length <= SIZE_CAP) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    if (best > 0) {
      payload.nutLuat = fullShortNut.slice(0, best);
      payload.nutLuatBiRut = true;
      return payload;
    }
    payload.nutLuat = fullShortNut.slice(0, 1);
    payload.nutLuatBiRut = true;
  }
  let daCatHeading = false;
  for (const lim of [6000, 3000, 1200, 0]) {
    const h = (payload.chain || []).find((e) => e.level === 'HEADING' && e.noteVi);
    if (!h) break;
    h.noteVi = lim
      ? `${String(h.noteVi).slice(0, lim).replace(/\s+\S*$/, '')}… [cắt cho vừa trần ~30.000 ký tự — toàn văn: ${headingFullUrl}]`
      : null;
    h.biCatChoVua = true;
    daCatHeading = true;
    if (JSON.stringify(payload).length <= SIZE_CAP) break;
  }
  if (JSON.stringify(payload).length > SIZE_CAP && Array.isArray(payload.nutLuat) && payload.nutLuat.length > 0) {
    payload.nutLuat = [];
    payload.nutLuatBiRut = true;
  }
  if (daCatHeading && payload.coverage) {
    payload.coverage.complete = false;
    payload.coverage.gaps = [...(payload.coverage.gaps || []), {
      id: 'heading-note-shortened-for-size',
      tang: 'NHOM',
      description: `Chú giải nhóm bị cắt ngắn cho vừa trần ~30.000 ký tự của phản hồi — toàn văn: ${headingFullUrl}.`,
    }];
  }
  return payload;
}

function danhSachChuongCoSan() {
  const kho = napKho();
  const s = new Set();
  for (const c2 of kho.chuongNodes.keys()) s.add(parseInt(c2, 10));
  for (const id of kho.bieuTheoId.keys()) {
    const m = /^bieu:(\d{2})$/.exec(id);
    if (m) s.add(parseInt(m[1], 10));
  }
  return [...s].filter(Number.isFinite).sort((a, b) => a - b);
}

module.exports = function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (requireAuthUnlessPublic(req, res, { endpoint: 'notes' })) return;

  const { chapter, heading, hs, id, level, full } = req.query;
  const levelFilter = String(level || '').trim() || null;
  const muonFull = xinFull(full);

  // Hỗ trợ tra trực tiếp 1 nút gốc theo ?id=<nutId>
  if (id && !chapter && !heading && !hs) {
    const nut = docNutTheoId(id);
    if (!nut) {
      return res.status(404).json({ found: false, id: String(id), message: `Không thấy nút luật "${id}" trong kho luật gốc.` });
    }
    return res.status(200).json({ found: true, id: nut.id, nut, nutLuat: [nut], source: 'Kho luật gốc HS 2022' });
  }

  if (!chapter && !heading && !hs) {
    return res.status(400).json({
      error: 'chapter, heading, hs, or id parameter required',
      examples: [
        '/api/notes?chapter=85',
        '/api/notes?heading=8509',
        '/api/notes?hs=85171300',
        '/api/notes?hs=85171300&level=all',
        '/api/notes?hs=85171300&full=1 (kèm cả phần KHÁI QUÁT CHUNG)',
        '/api/notes?id=nhom:7616:ct:9',
      ],
      availableChapters: danhSachChuongCoSan(),
    });
  }

  const hsCode = hs ? normalizeHs(hs) : null;
  const chapterFromHs = hsCode ? String(parseInt(hsCode.slice(0, 2), 10)) : null;
  const parsedChap = chapter
    ? parseInt(chapter, 10)
    : heading
      ? parseInt(String(heading || '').replace(/\./g, '').slice(0, 2), 10)
      : parseInt(chapterFromHs || '', 10);
  const chapNum = Number.isFinite(parsedChap) ? String(parsedChap) : null;

  if (hsCode && (levelFilter === 'all' || levelFilter)) {
    const chain = buildNoteChain(hsCode, { levelFilter: levelFilter || 'all', full: muonFull });
    if (chain.length === 0) {
      return res.status(404).json({
        found: false,
        hsCode,
        message: `No GIR note chain for ${hsCode}`,
      });
    }
    const nutLuat = nutLuatCho({ hs: hsCode, level: levelFilter, full: muonFull });
    let payload = {
      found: true,
      hsCode,
      level: levelFilter || 'all',
      coverage: notesCoverage(hsCode),
      sen: senFor(hsCode),
      chain,
      nutLuat,
      source: 'GIR 5-level chain (kho luật gốc: phan, chuong, nhom, phan-nhom, sen, bieu)',
    };
    if (!muonFull) payload = gioiHanKichThuoc(payload, { hsCode, heading, chapNum });
    return res.status(200).json(payload);
  }

  const chapEntry = chapNum ? buildChapterNote(chapNum, { hsCode, full: muonFull }) : null;
  const content = chapEntry ? chapEntry.noteVi : null;
  if (!chapEntry) {
    return res.status(404).json({
      found: false,
      chapter: Number.isFinite(parsedChap) ? parsedChap : null,
      message: `Dữ liệu kho luật gốc không có Chương ${chapNum || String(chapter || heading || hs || '').trim()}.`,
    });
  }

  const chain = hsCode ? buildNoteChain(hsCode, { full: muonFull }) : null;
  const chEnt = chain && chain.find((e) => e.level === 'CHAPTER');
  if (chEnt && content && chEnt.noteVi === content) {
    chEnt.noteVi = null;
    chEnt.ghiChu = 'Toàn văn Chú giải Chương nằm ở trường `content` — không lặp lại ở đây.';
  }

  const nutLuat = nutLuatCho({ chapter: chapNum, heading, hs: hsCode, full: muonFull });
  let payload = {
    found: true,
    chapter: parsedChap,
    hsCode,
    content,
    coverage: notesCoverage(hsCode || String(heading || '').replace(/\D/g, '') || String(chapNum).padStart(2, '0')),
    sen: hsCode ? senFor(hsCode) : null,
    chain,
    nutLuat,
    source: chapEntry.sourceDocument || 'Kho luật gốc HS 2022 (chuong.jsonl)',
  };
  if (!muonFull) payload = gioiHanKichThuoc(payload, { hsCode, heading, chapNum });
  return res.status(200).json(payload);
};
