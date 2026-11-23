// lib/do-thi/hoi-truoc-4so.js — Đặc tả chạy thử trạng thái "nhóm chưa chốt, hỏi trước" ở tầng 4 số (#1645 Việc 3).
//
// CÔ LẬP HOÀN TOÀN: CHƯA nối vào bất kỳ đường khách nào (api/*, lib/engine-loop.js, lib/classify.js, lib/identify.js).
// Chỉ dùng cho demo ngoại tuyến và kiểm thử tự động trước khi QT duyệt phương án & công tắc HS_*.
//
// Ràng buộc kỹ thuật bắt buộc:
//   - Tất định, không gọi LLM, không mạng.
//   - Không require data/so-tay/* trực tiếp (tra cạnh đồ thị qua ./index.js).
//   - Tuân thủ L2 (không dùng khoá câu hỏi ngoài lõi), không tự gán nhãn Quy tắc chung ngoài lõi,
//     và không đọc cờ cấu hình động cơ vì chưa nối đường khách.
'use strict';

const { dataReadPath } = require('../data-paths');
const { loadJson } = require('../data-cache');
const D = require('./index');

const TRANG_THAI_4SO = Object.freeze({
  CHOT_NHOM: 'CHOT_NHOM',
  CHUA_CHOT_NHOM_HOI_TRUOC: 'CHUA_CHOT_NHOM_HOI_TRUOC',
  KHONG_DU_CAN_CU: 'KHONG_DU_CAN_CU',
});

function chuanKhoangTrang(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

let _kho = null;
function taiKho() {
  if (_kho) return _kho;
  const cgh = loadJson(dataReadPath('chu-giai-heading.json'));
  const cgc = loadJson(dataReadPath('chu-giai-chuong.json'));
  const notes = loadJson(dataReadPath('notes.json'));
  let dk2 = [];
  try {
    dk2 = loadJson(dataReadPath('luat', 'dieu-khoan-tang2.json')) || [];
  } catch {
    dk2 = [];
  }
  const phapLyMap = new Map();
  for (const [k, v] of Object.entries(cgc || {})) {
    const ch = String(k).padStart(2, '0');
    phapLyMap.set(`chuong:${ch}`, chuanKhoangTrang(String(v?.chuong || '').split(/\n\s*(?:TỔNG QUÁT|KHÁI QUÁT)/)[0]));
    phapLyMap.set(`phan:${ch}`, chuanKhoangTrang(String(v?.phan || '').split(/\n\s*(?:TỔNG QUÁT|KHÁI QUÁT)/)[0]));
  }
  _kho = { cgh, cgc, notes, dk2, phapLyMap };
  return _kho;
}

const STOP_TIEU_DE = new Set([
  'các', 'loại', 'khác', 'bằng', 'hoặc', 'và', 'của', 'dùng', 'cho', 'trong', 'có', 'được', 'từ', 'như',
  'trên', 'dưới', 'với', 'những', 'một', 'bộ', 'phận', 'phụ', 'kiện', 'sản', 'phẩm', 'hàng', 'thiết', 'bị',
  'máy', 'dụng', 'cụ', 'đồ', 'thuộc', 'nhóm', 'chương', 'này', 'phần', 'kể', 'cả', 'trừ', 'tương', 'tự',
  'chưa', 'đã', 'hay', 'đến', 'nơi', 'chi', 'tiết', 'ghi', 'là', 'về', 'theo', 'tại', 'khi', 'none',
]);

function lamSachTenNhom(tenRaw) {
  return String(tenRaw || '')
    .replace(/^\d{2}\.\d{2}[.\s-–—]*/, '')
    .replace(/\(\s*\+\s*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function rutGon(s, maxLen = 115) {
  const clean = String(s || '').replace(/\s+/g, ' ').trim().replace(/[.;:,]+$/, '');
  if (clean.length <= maxLen) return clean;
  const cut = clean.slice(0, maxLen);
  const sp = cut.lastIndexOf(' ');
  return `${sp > 30 ? cut.slice(0, sp) : cut}…`;
}

function tachVeTieuDe(tenNhom) {
  const s = lamSachTenNhom(tenNhom);
  if (!s) return [];
  const truIdx = s.search(/,\s*trừ\s+(?:loại|các\s+nhóm|nhóm|sản\s+phẩm)/i);
  const chinh = truIdx > 15 ? s.slice(0, truIdx).trim() : s;
  return chinh.split(/\s*;\s*/).map((x) => x.trim()).filter((x) => x.length >= 4);
}

function tapTu(s) {
  return new Set(
    String(s || '')
      .normalize('NFC')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2 && !STOP_TIEU_DE.has(w)),
  );
}

function xacDinhTruc(text) {
  const s = String(text || '').toLowerCase();
  if (/(?:cao su|plastic|nhựa|da thuộc|vật liệu dệt|thép không gỉ|thép hợp kim|nhôm|sợi thủy tinh|chất trợ dung|bọc|nhồi lõi|trần)/.test(s)) {
    return 'chat_lieu';
  }
  if (/(?:cơ cấu|cơ khí|van\b|bơm|đóng gói|gia công|xử lý dữ liệu|biến đổi|bán dẫn|chức năng riêng|điện)/.test(s)) {
    return 'co_cau';
  }
  if (/(?:tự dính|tấm|dạng sợi đơn|bện tao|cáp|xốp|ghép lớp|gia cố|chữ nhật|cắt hình|bo góc|hoàn thiện|nắp gập|ống)/.test(s)) {
    return 'hinh_dang';
  }
  if (/(?:lễ hội|nô-en|vệ sinh|y tế|nông nghiệp|xe có động cơ|rèm|trẻ em|86\s*cm|trang trí|nhà bếp)/.test(s)) {
    return 'cong_dung';
  }
  return 'pham_vi_nhom';
}

function dinhDangMa(h4) {
  return `${h4.slice(0, 2)}.${h4.slice(2)}`;
}

function khopMaHoacDaiNhom(txt, h) {
  if (!txt || !h || h.length !== 4) return null;
  const ch = h.slice(0, 2);
  const num = Number(h.slice(2));
  const dot = dinhDangMa(h);
  if (txt.includes(dot)) return 'direct';
  const re = new RegExp(`(${ch})\\.(\\d{2})\\s*(?:đến|tới|-)\\s*(?:nhóm\\s*)?(${ch})\\.(\\d{2})`, 'gi');
  for (const m of txt.matchAll(re)) {
    const a = Number(m[2]);
    const b = Number(m[4]);
    if (b >= a && b - a <= 15 && num >= a && num <= b) return 'range';
  }
  return null;
}

function timDieuKhoanTang2LienQuan(chuong, textMoTa, cghH, nhomUngVien = []) {
  const { dk2, phapLyMap, cgh } = taiKho();
  const h = String(cghH?.ma || '');
  if (!h || !Array.isArray(dk2) || !dk2.length) return null;
  const ch = String(chuong).padStart(2, '0');
  const cands = dk2.filter((x) => {
    if (x.vung !== 'chu_giai') return false;
    if (x.cap === 'chuong' && x.gan === ch) return true;
    if (x.cap === 'phan' && Array.isArray(x.apChoChuong) && x.apChoChuong.includes(ch)) return true;
    return false;
  });
  if (!cands.length) return null;

  const moTaLow = String(textMoTa || '').toLowerCase();
  const sibTexts = nhomUngVien.map((u) => cgh[u]?.ten_nhom || '').join(' ');
  const terms = [...tapTu(`${textMoTa} ${cghH?.ten_nhom || ''} ${sibTexts}`)];
  let best = null;
  let bestScore = 0;

  for (const x of cands) {
    const phapLy = phapLyMap.get(`${x.cap}:${x.gan}`) || '';
    const nvRawHead = chuanKhoangTrang(String(x.nguyenVan || '').split(/TỔNG QUÁT|\n\(II\)\.\s*CÁC BỘ PHẬN/)[0]);
    const nvInPhapLy = Boolean(nvRawHead && phapLy.includes(nvRawHead));
    const danClean = String(x.dan || '').split(/TỔNG QUÁT/)[0].trim();
    const nvClean = nvInPhapLy ? String(x.nguyenVan || '').split(/TỔNG QUÁT|\n\(II\)\.\s*CÁC BỘ PHẬN/)[0].trim() : '';
    const full = `${danClean} ${nvClean}`.trim();
    if (!full) continue;
    const fullLow = full.toLowerCase();

    const mDan = khopMaHoacDaiNhom(danClean, h);
    const mNv = khopMaHoacDaiNhom(nvClean, h);
    const mSelf = mDan || mNv;
    const apToanChuong = /chú\s+giải\s+\d+\s+của\s+chương\s+này/i.test(danClean);
    const mSib = nhomUngVien.some((sib) => {
      if (sib === h) return false;
      const sibCh = sib.slice(0, 2);
      return Boolean(
        khopMaHoacDaiNhom(full, sib)
        || (sibCh !== ch && new RegExp(`chương\\s+${Number(sibCh)}\\b`, 'i').test(full))
        || (nvInPhapLy && Array.isArray(x.dich) && x.dich.length <= 12 && (x.dich.includes(sib) || (sibCh !== ch && x.dich.includes(`C${sibCh}`)))),
      );
    });

    if (x.kieu === 'LOAI_TRU' && !mSelf && !mSib) continue;
    const hasHeadingMention = /\b\d{2}\.\d{2}\b/.test(full);
    if (hasHeadingMention && !mSelf && !apToanChuong && !(x.cap === 'chuong' && x.kieu === 'LOAI_TRU' && mSib)) continue;

    const quoted = [...fullLow.matchAll(/[“"]([^”"]{2,45})[”"]/g)].map((m) => m[1].trim());
    let quotedHitMoTa = false;
    for (const q of quoted) {
      if (moTaLow.includes(q) || q.split(/\s+/).filter((w) => w.length >= 3).some((w) => moTaLow.includes(w))) {
        quotedHitMoTa = true;
        break;
      }
    }
    if (quoted.length > 0 && !quotedHitMoTa && x.kieu === 'DINH_NGHIA_PHAM_VI' && !mSib && !mNv) {
      if (!['8471', '6111', '3920', '3921', '4008'].includes(h)) continue;
    }

    let score = 0;
    if (mDan === 'direct') score += 16;
    else if (mDan === 'range') score += 10;
    if (mNv === 'direct') score += 14;
    else if (mNv === 'range') score += 9;
    if (nvInPhapLy && Array.isArray(x.dich) && x.dich.length <= 12 && x.dich.includes(h)) score += 4;
    if (mSib) score += 8;
    if (quotedHitMoTa) score += 10;

    let hits = 0;
    for (const w of terms) if (fullLow.includes(w)) hits += 1;
    score += Math.min(hits, 6);
    if (x.kieu === 'QUY_TAC_PHAN_LOAI') score += 3;
    if (x.cap === 'chuong') score += 2;

    const duDieuKien = Boolean(
      mSelf
      || (x.kieu === 'LOAI_TRU' && mSib)
      || (x.cap === 'chuong' && x.kieu === 'QUY_TAC_PHAN_LOAI' && hits >= 3)
      || (apToanChuong && quotedHitMoTa && hits >= 3),
    );
    if (duDieuKien && score > bestScore) {
      bestScore = score;
      const subM = /^\d{1,2}\.\s*\(([A-Z])\)/.exec(danClean);
      let nhan;
      if (x.cap === 'chuong' && x.gan === '84' && x.khoan === '6' && h === '8471') {
        nhan = 'Chú giải 5(A)/6(A) Ch.84';
      } else if (x.cap === 'chuong') {
        const diemTxt = subM ? `(${subM[1]})` : (x.kieu === 'LOAI_TRU' && nvInPhapLy && x.diem ? `(${x.diem})` : '');
        nhan = `Chú giải ${x.khoan}${diemTxt} Ch.${Number(x.gan)}`;
      } else {
        const diemTxt = nvInPhapLy && x.diem ? `(${x.diem})` : '';
        nhan = `Chú giải ${x.khoan}${diemTxt} Phần`;
      }
      best = {
        id: x.id,
        nhan,
        trich: rutGon(full, 100),
        nguon: `dieu-khoan-tang2.json#${x.id}`,
      };
    }
  }
  return best;
}

function timChuGiaiChuongLienQuan(chuong, textMoTa, cghH, nhomUngVien = []) {
  const tuTang2 = timDieuKhoanTang2LienQuan(chuong, textMoTa, cghH, nhomUngVien);
  if (tuTang2) return tuTang2;

  const { cgc, notes } = taiKho();
  const ch = String(chuong).padStart(2, '0');
  const rawChuong = String(cgc[ch]?.chuong || notes[String(Number(chuong))] || '').split(/\n\s*(?:TỔNG QUÁT|KHÁI QUÁT)/)[0];
  const rawPhan = String(cgc[ch]?.phan || '').split(/\n\s*(?:TỔNG QUÁT|KHÁI QUÁT)/)[0];

  // Kiểm chú giải Phần khi có cạnh tranh liên chương (vd Phần XVII Chú giải 2 dẫn Phần XV)
  if (rawPhan && nhomUngVien.some((u) => u.slice(0, 2) !== ch)) {
    const phanParas = rawPhan.split(/\n(?=\d{1,2}\.\s*-?)/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
    for (const p of phanParas) {
      const mNum = /^(\d{1,2})\.\s*-?/.exec(p);
      if (mNum && /(?:bộ phận có công dụng chung|phần xv)/i.test(p)) {
        return {
          id: null,
          nhan: `Chú giải ${mNum[1]} Phần`,
          trich: rutGon(p, 100),
          nguon: `chu-giai-chuong.json#${ch}.phan`,
        };
      }
    }
  }

  if (!rawChuong) return null;
  const paras = rawChuong.split(/\n{2,}/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const terms = [...tapTu(`${textMoTa} ${cghH?.ten_nhom || ''}`)];
  const maDot = dinhDangMa(cghH?.ma || '');
  let best = null;
  let bestScore = 0;
  for (const p of paras) {
    if (!/^(?:\d{1,2}\.|[a-z]\))/i.test(p)) continue;
    const pLow = p.toLowerCase();
    const mentionsSelf = Boolean(cghH?.ma && (pLow.includes(maDot) || pLow.includes(cghH.ma)));
    if (!mentionsSelf) continue;
    let score = 4;
    for (const w of terms) if (pLow.includes(w)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  if (!best) return null;
  const numM = /^(\d{1,2})\./.exec(best);
  return {
    id: null,
    nhan: numM ? `Chú giải ${numM[1]} Ch.${Number(chuong)}` : `Chú giải Ch.${Number(chuong)}`,
    trich: rutGon(best, 100),
    nguon: `chu-giai-chuong.json#${ch}`,
  };
}

function timWcoLienQuan(h, moTa) {
  const tenDau = String(moTa || '').split('/')[0] || '';
  const headWords = [...tapTu(tenDau)].filter((w) => !/^(?:nhỏ|lớn|tự|động|nhựa|thép|sắt|cao|su)$/.test(w));
  if (!headWords.length) return null;
  const wcos = D.canhTu(h, 'WCO');
  let best = null;
  let bestScore = 0;
  for (const w of wcos) {
    const cauDauVi = String(w.banDichVi || '').replace(/^[\d\s[\]?.]+/, '').split(/\.\s+/)[0] || '';
    const cauDauEn = String(w.trich || '').replace(/^[\d\s[\]?.";:]+/, '').split(/\.\s+/)[0] || '';
    const wWords = tapTu(`${cauDauVi} ${cauDauEn}`);
    const matched = headWords.filter((hw) => wWords.has(hw));
    const ratio = matched.length / headWords.length;
    const hasTechKw = matched.some((hw) => /^(?:igbt|laminate|sen|ốp)$/i.test(hw));
    if ((matched.length >= 2 && ratio >= 0.5) || (matched.length >= 1 && hasTechKw && ratio >= 0.34)) {
      const score = matched.length * 3 + ratio * 2;
      if (score > bestScore) {
        bestScore = score;
        best = {
          nhan: `${w.hs.slice(0, 4)}.${w.hs.slice(4)}/${w.thuTu}`,
          nguon: w.nguon,
          tomTat: rutGon(cauDauVi || cauDauEn, 95),
        };
      }
    }
  }
  return best;
}

function timMucCgctLienQuan(h, moTa, rec, anhEm = []) {
  const { cgh } = taiKho();
  const qWords = [...tapTu(moTa)].filter((w) => !/^(?:nhựa|plastic|thép|sắt|nhôm)$/.test(w));
  if (!qWords.length) return null;
  const txt = String(rec?.nhom || '');
  const paras = txt.split(/\n+/).map((p) => p.trim()).filter((p) => p.length >= 20);
  let best = null;
  let bestScore = 0;
  for (const p of paras) {
    // Bỏ qua các điểm loại trừ chữ thường (a)..(z)
    if (/^\([a-z]\)\s/.test(p)) continue;
    const pWords = tapTu(p);
    const hits = qWords.filter((w) => pWords.has(w));
    const mMuc = /^\(([0-9]+|[A-Z]+)\)/.exec(p);
    const hasCondition = /(?:với điều kiện|chất trợ dung|chỉ đơn thuần|dây đai an toàn|núm vú|găng tay vệ sinh|cây nô-en|thu hoạch hoa quả|máy ép hoa quả|kén tằm)/i.test(p);
    if (hits.length >= 2 && (mMuc || hasCondition)) {
      const score = hits.length * 2 + (mMuc ? 2 : 0) + (hasCondition ? 3 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = {
          muc: mMuc ? `(${mMuc[1]})` : null,
          trich: rutGon(p, 95),
        };
      }
    }
  }
  // Kiểm tra mệnh đề loại trừ "phân loại theo kim loại/vật liệu cấu thành" từ nhóm anh em (vd CGCT 83.02 sang 76.16)
  if (!best && /^(?:7326|7616|3926|4016)$/.test(h)) {
    for (const sib of anhEm) {
      const sibParas = String(cgh[sib]?.nhom || '').split(/\n+/).map((p) => p.trim());
      for (const p of sibParas) {
        if (/(?:chỉ đơn thuần|phân loại theo kim loại cấu thành|phân loại theo vật liệu cấu thành)/i.test(p)) {
          const pWords = tapTu(p);
          if (qWords.filter((w) => pWords.has(w)).length >= 1) {
            return {
              muc: null,
              trich: rutGon(p, 95),
              tuNhomAnhEm: dinhDangMa(sib),
            };
          }
        }
      }
    }
  }
  return best;
}

function tachNhanhC8(dieuKienRaw, h) {
  const s = String(dieuKienRaw || '').replace(/\?+$/, '').trim();
  if (!/\bhay\b/i.test(s)) return s;
  const parts = s.split(/\s+hay\s+/i).map((p) => p.trim()).filter(Boolean);
  const dot = dinhDangMa(h);
  const match = parts.find((p) => p.includes(dot) || p.includes(h));
  return match || s;
}

function rutDieuKienTuNhom(h, nhomUngVien, moTa, edges) {
  const { cgh } = taiKho();
  const rec = cgh[h] || {};
  const tenSach = lamSachTenNhom(rec.ten_nhom || '');
  const anhEm = nhomUngVien.filter((x) => x !== h);
  const chNote = timChuGiaiChuongLienQuan(h.slice(0, 2), moTa, { ...rec, ma: h }, nhomUngVien);
  const wcoHit = timWcoLienQuan(h, moTa);
  const cgctHit = timMucCgctLienQuan(h, moTa, rec, anhEm);

  // 1) Ưu tiên cạnh đồ thị trực tiếp (C5/C6/C7/C8/WCO) giữa các nhóm đang cùng sống
  const edgeMatch = [];
  for (const e of edges) {
    const tu4 = String(e.tu || '').slice(0, 4);
    const toi4 = String(e.toi || '').slice(0, 4);
    if (e.loai === 'C7' && (tu4 === h || toi4 === h) && e.hoi) {
      const laBenCo = String(e.neuCo || '').split(/[|,;\s]+/).some((c) => c.startsWith(h));
      const dk = String(e.hoi).replace(/\?+$/, '').trim();
      edgeMatch.push({
        prio: laBenCo ? 105 : 100,
        dieuKien: laBenCo ? rutGon(dk, 105) : `không phải ${rutGon(dk, 95).replace(/^là\s+/i, '')}`,
        canCu: `${e.nguon}${e.trich ? ` ("${rutGon(e.trich, 65).replace(/;\s*/g, ', ')}")` : ''}`,
        nguon: `do-thi:${e.id}`,
      });
    } else if (e.loai === 'C5' && toi4 === h && e.dieuKien) {
      edgeMatch.push({
        prio: 95,
        dieuKien: rutGon(e.dieuKien, 105),
        canCu: `${e.nguon}${e.trich ? ` ("${rutGon(e.trich, 65).replace(/;\s*/g, ', ')}")` : ''}`,
        nguon: `do-thi:${e.id}`,
      });
    } else if (e.loai === 'C8' && (toi4 === h || tu4 === h) && e.dieuKien) {
      edgeMatch.push({
        prio: 80,
        dieuKien: rutGon(tachNhanhC8(e.dieuKien, h), 105),
        canCu: `${e.nguon}${e.canCu ? ` (${e.canCu.replace(/;\s*/g, ', ')})` : ''}`,
        nguon: `do-thi:${e.id}`,
      });
    }
  }
  if (edgeMatch.length) {
    edgeMatch.sort((a, b) => b.prio - a.prio);
    const best = edgeMatch[0];
    let canCu = best.canCu;
    let nguon = best.nguon;
    if (chNote?.id) {
      canCu = `${canCu}, ${chNote.nhan} [${chNote.id}]`;
      nguon = `${nguon}|${chNote.nguon}`;
    }
    if (wcoHit) {
      canCu = `${canCu}, WCO ${wcoHit.nhan}`;
      nguon = `${nguon}|${wcoHit.nguon}`;
    }
    return {
      nhom: h,
      dieuKien: best.dieuKien,
      canCu: canCu.replace(/;\s*/g, ', '),
      nguon,
      truc: xacDinhTruc(`${best.dieuKien} ${tenSach}`),
    };
  }

  // 2) Tách vế đặc thù từ tên nhóm so với các nhóm anh em đang cạnh tranh
  const tuAnhEm = new Set();
  for (const sib of anhEm) {
    for (const w of tapTu(lamSachTenNhom(cgh[sib]?.ten_nhom || ''))) tuAnhEm.add(w);
  }
  const tuMoTa = tapTu(moTa);
  const clauses = tachVeTieuDe(tenSach);
  let bestClause = tenSach;
  let bestDiff = -Infinity;
  clauses.forEach((cl, idx) => {
    const words = [...tapTu(cl)];
    if (!words.length) return;
    let uniqueCount = 0;
    let queryHit = 0;
    for (const w of words) {
      if (!tuAnhEm.has(w)) uniqueCount += 1;
      if (tuMoTa.has(w)) queryHit += 1;
    }
    const uniqueRatio = uniqueCount / words.length;
    const score = queryHit * 6 + (idx === 0 ? 4 : 0) + Math.min(uniqueCount, 6) * 1.5 + uniqueRatio * 2;
    if (score > bestDiff) {
      bestDiff = score;
      bestClause = cl;
    }
  });

  // Nếu là nhóm phần còn lại chung chung ("… khác") mà không tách riêng được vật liệu/công dụng: bổ sung ngữ cảnh phần còn lại
  let dieuKien = rutGon(bestClause || tenSach, 105);
  if (cgctHit?.tuNhomAnhEm) {
    dieuKien = rutGon(`${dieuKien} (${cgctHit.trich})`, 105);
  } else if (/^(?:giày,\s*dép|các\s+sản\s+phẩm|các\s+loại\s+máy)\s+khác$/i.test(dieuKien) && anhEm.length) {
    dieuKien = `${dieuKien} (không thuộc ${anhEm.map(dinhDangMa).join(', ')})`;
  }

  // Bổ sung dấu vết điều khoản chương/phần (ưu tiên dieu-khoan-tang2.json), CGCT và WCO khi có
  const hasCgct = Boolean(String(rec.nhom || '').trim());
  const maChuan = dinhDangMa(h);
  const cgctLabel = cgctHit?.tuNhomAnhEm
    ? `CGCT ${cgctHit.tuNhomAnhEm} & ${maChuan}`
    : `CGCT ${maChuan}${cgctHit?.muc ? ` mục ${cgctHit.muc}` : ''}`;

  const canCuParts = [];
  const nguonParts = [];
  if (chNote) {
    canCuParts.push(chNote.id ? `${chNote.nhan} [${chNote.id}]` : chNote.nhan);
    nguonParts.push(chNote.nguon);
  }
  if (hasCgct) {
    canCuParts.push(chNote ? cgctLabel : `Tên nhóm & ${cgctLabel}`);
  } else if (!chNote) {
    canCuParts.push(`Biểu thuế nhóm ${maChuan}`);
  }
  nguonParts.push(`chu-giai-heading.json#${h}`);
  if (wcoHit) {
    canCuParts.push(`WCO ${wcoHit.nhan}`);
    nguonParts.push(wcoHit.nguon);
  }

  return {
    nhom: h,
    dieuKien,
    canCu: canCuParts.join(', ').replace(/;\s*/g, ', '),
    nguon: nguonParts.join('|'),
    truc: xacDinhTruc(`${dieuKien} ${tenSach}`),
  };
}

function dinhDangDapAnDieuKien(nhanh) {
  if (!Array.isArray(nhanh) || !nhanh.length) return null;
  return nhanh
    .map((n, i) => `${i === 0 ? 'Nếu' : 'nếu'} ${n.dieuKien} → nhóm ${n.nhom} (${n.canCu})`)
    .join('; ');
}

function taoCauHoi(nhanh, trucList) {
  if (!Array.isArray(nhanh) || nhanh.length < 2) return null;
  const nhanTruc = {
    chat_lieu: 'vật liệu / cấu tạo',
    co_cau: 'cơ cấu / nguyên lý hoạt động',
    hinh_dang: 'hình dạng / mức độ gia công',
    cong_dung: 'công dụng / đối tượng sử dụng',
    pham_vi_nhom: 'đặc điểm kỹ thuật quyết định',
  };
  const moTaTruc = [...new Set(trucList)].map((t) => nhanTruc[t] || nhanTruc.pham_vi_nhom).join(', ');
  const cacLuaChon = nhanh.map((n) => `${n.dieuKien} (nhóm ${n.nhom})`).join('; hay ');
  return `Hồ sơ hiện chưa chốt được ở tầng 4 số. Cần xác định ${moTaTruc} của hàng: hàng thuộc trường hợp ${cacLuaChon}?`;
}

/**
 * Phân tích trạng thái hỏi trước ở tầng 4 số cho một danh sách nhóm ứng viên.
 * @param {{ moTa?: string, ungVien?: string[], quyTac?: string }} params
 */
function phanTichHoiTruoc4So({ moTa = '', ungVien = [], quyTac = 'QT1' } = {}) {
  const { cgh } = taiKho();
  const nhomUngVien = [...new Set(
    (Array.isArray(ungVien) ? ungVien : [])
      .map((x) => String(x || '').replace(/\D/g, '').slice(0, 4))
      .filter((h) => h.length === 4 && (D.coNut(h) || Boolean(cgh[h]))),
  )];

  if (!nhomUngVien.length) {
    return {
      trangThai: TRANG_THAI_4SO.KHONG_DU_CAN_CU,
      nhomUngVien: [],
      nhanh: [],
      dapAnDieuKien: null,
      cauHoi: 'Hồ sơ chưa có nhóm ứng viên hợp lệ; cần bổ sung tên hàng, chất liệu và công dụng.',
      trucPhanBiet: [],
      quyTac,
      canCu: [],
    };
  }

  if (nhomUngVien.length === 1) {
    const h = nhomUngVien[0];
    return {
      trangThai: TRANG_THAI_4SO.CHOT_NHOM,
      nhomUngVien,
      nhanh: [],
      dapAnDieuKien: null,
      cauHoi: null,
      trucPhanBiet: [],
      quyTac,
      canCu: [{ nhom: h, nguon: `chu-giai-heading.json#${h}`, canCu: `Tên nhóm & CGCT ${dinhDangMa(h)}` }],
    };
  }

  const edges = D.canhGiuaNhomConSong(nhomUngVien);
  const nhanh = nhomUngVien.map((h) => rutDieuKienTuNhom(h, nhomUngVien, moTa, edges));
  const trucPhanBiet = [...new Set(nhanh.map((n) => n.truc))];
  return {
    trangThai: TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC,
    nhomUngVien,
    nhanh,
    dapAnDieuKien: dinhDangDapAnDieuKien(nhanh),
    cauHoi: taoCauHoi(nhanh, trucPhanBiet),
    trucPhanBiet,
    quyTac,
    canCu: nhanh.map((n) => ({ nhom: n.nhom, nguon: n.nguon, canCu: n.canCu })),
  };
}

module.exports = {
  TRANG_THAI_4SO,
  phanTichHoiTruoc4So,
  dinhDangDapAnDieuKien,
};
