// lib/do-thi/dan-chieu.js — M-32: Rút mọi dẫn chiếu thành cạnh NHAC, tất định, hai chiều.
//
// Chỉ đọc kho lớp 1 (data/luat-goc/*.jsonl, dùng kho `bieu` làm căn cứ tồn tại của nút biểu thuế);
// KHÔNG dùng lib/hs-tree.js, KHÔNG LLM, KHÔNG mạng, KHÔNG gán nhãn nghĩa cho cạnh.
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const BANG_PHAN_CHUONG = [
  ['I', ['01', '02', '03', '04', '05']],
  ['II', ['06', '07', '08', '09', '10', '11', '12', '13', '14']],
  ['III', ['15']],
  ['IV', ['16', '17', '18', '19', '20', '21', '22', '23', '24']],
  ['V', ['25', '26', '27']],
  ['VI', ['28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38']],
  ['VII', ['39', '40']],
  ['VIII', ['41', '42', '43']],
  ['IX', ['44', '45', '46']],
  ['X', ['47', '48', '49']],
  ['XI', ['50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62', '63']],
  ['XII', ['64', '65', '66', '67']],
  ['XIII', ['68', '69', '70']],
  ['XIV', ['71']],
  ['XV', ['72', '73', '74', '75', '76', '78', '79', '80', '81', '82', '83']],
  ['XVI', ['84', '85']],
  ['XVII', ['86', '87', '88', '89']],
  ['XVIII', ['90', '91', '92']],
  ['XIX', ['93']],
  ['XX', ['94', '95', '96']],
  ['XXI', ['97']],
];

const PHAN_LA_MA = BANG_PHAN_CHUONG.map(([p]) => p);
const PHAN_SANG_SO = Object.fromEntries(PHAN_LA_MA.map((p, i) => [p, i + 1]));
const SO_SANG_PHAN = Object.fromEntries(PHAN_LA_MA.map((p, i) => [String(i + 1), p]));
const CHUONG_SANG_PHAN = Object.fromEntries(
  BANG_PHAN_CHUONG.flatMap(([p, ds]) => ds.map((c) => [c, p])),
);

const LA_MA_CHUAN = new Set([
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI',
]);

const chuanChuong = (so) => {
  const n = Number.parseInt(String(so), 10);
  if (!Number.isFinite(n) || n < 1 || n > 99) return null;
  return String(n).padStart(2, '0');
};

const chuanPhan = (raw, { choPhepSo = false } = {}) => {
  const s = String(raw || '').trim();
  if (LA_MA_CHUAN.has(s)) return s;
  if (choPhepSo && /^\d{1,2}$/.test(s)) return SO_SANG_PHAN[String(Number.parseInt(s, 10))] || null;
  return null;
};

/** Suy Phần và Chương ngữ cảnh từ id của nút chứa câu luật. */
function suyBoiCanhNut(nutId) {
  const s = String(nutId || '');
  let m = /^phan:([IVX]+)(?::|$)/.exec(s);
  if (m) return { phan: m[1], chuong: null, nhomSo: null, goc: `phan:${m[1]}` };
  m = /^chuong:(\d{2})(?::pc:([IVX]+))?(?::|$)/.exec(s);
  if (m) return { phan: CHUONG_SANG_PHAN[m[1]] || null, chuong: m[1], phanChuong: m[2] || null, nhomSo: null, goc: `chuong:${m[1]}` };
  m = /^sen:phan:([IVX]+)(?::|$)/.exec(s);
  if (m) return { phan: m[1], chuong: null, nhomSo: null, goc: null };
  m = /^sen:chuong:(\d{2})(?::|$)/.exec(s);
  if (m) return { phan: CHUONG_SANG_PHAN[m[1]] || null, chuong: m[1], nhomSo: null, goc: `chuong:${m[1]}` };
  m = /^(?:nhom|pn|bieu|wco|sen):(\d{4,8})(?::|$)/.exec(s);
  if (m) {
    const ch = m[1].slice(0, 2);
    return { phan: CHUONG_SANG_PHAN[ch] || null, chuong: ch, nhomSo: m[1].slice(0, 4), goc: null };
  }
  return { phan: null, chuong: null, nhomSo: null, goc: null };
}

/**
 * Lập chỉ mục tồn tại các nút từ kho lớp 1 (không đụng hs-tree).
 * @param {Array<{id: string, loai?: string}>} danhSachNut
 */
function taoKhoNut(danhSachNut) {
  const tatCa = new Set();
  const theoThuong = new Map();
  const nhomSet = new Set();
  const pnSet = new Set();
  const dongSet = new Set();
  const chuongCo = new Set();
  const phanCo = new Set();
  let coNhomKho = false;

  for (const n of danhSachNut || []) {
    if (!n || !n.id) continue;
    tatCa.add(n.id);
    const th = n.id.toLowerCase();
    if (!theoThuong.has(th)) theoThuong.set(th, n.id);
    if (/^phan:[IVX]+$/.test(n.id)) phanCo.add(n.id.slice(5));
    else if (/^chuong:\d{2}$/.test(n.id)) chuongCo.add(n.id.slice(7));
    else if (/^bieu:\d{4}$/.test(n.id)) nhomSet.add(n.id.slice(5));
    else if (/^bieu:\d{6}$/.test(n.id)) pnSet.add(n.id.slice(5));
    else if (/^bieu:\d{8}$/.test(n.id)) dongSet.add(n.id.slice(5));
    else if (/^nhom:\d{4}:/.test(n.id)) coNhomKho = true;
  }

  return {
    tatCa,
    theoThuong,
    nhomBieu: [...nhomSet].sort(),
    nhomSet,
    phanNhomBieu: [...pnSet].sort(),
    pnSet,
    dongBieu: [...dongSet].sort(),
    dongSet,
    chuongCo,
    phanCo,
    coKho: {
      phan: phanCo.size > 0,
      chuong: chuongCo.size > 0,
      bieu: nhomSet.size > 0 || pnSet.size > 0 || dongSet.size > 0,
      gir: tatCa.has('gir:1'),
      nhom: coNhomKho,
    },
    giaiId(id) {
      if (!id) return null;
      if (tatCa.has(id)) return id;
      return theoThuong.get(id.toLowerCase()) || null;
    },
  };
}

/** Bộ tách câu dự phòng khi chưa truyền sẵn danh sách câu từ M-31. */
function tachCauCoBan(v) {
  const str = String(v || '');
  const tat = /(?:^|[\s(])(?:v\.v|vv|tr|sp|spp|var|subsp|cf|etc|No|St|Dr|[A-ZĐ])$/u;
  const dauMuc = /^\s*(?:\((?:[a-zđ]|ij|[ivxlc]+|[A-Z]|\d{1,2})\)|\d{1,2}\s*[.)]\s*-?|[-–•*])\s+/u;
  const neoDangDo = /(?:nhóm(?:\s+hàng)?|phân\s+nhóm|chương|phần|chú\s+giải|quy\s+tắc|heading|từ|đến|tới|tơi|hoặc|và|hay|and|thuộc|như|ví\s+dụ|,)\s*$/iu;
  const cat = new Set();
  for (let i = 0; i < str.length; i += 1) {
    const c = str[i];
    if (c === '\n') {
      const truocDong = str.slice(Math.max(0, i - 45), i).replace(/\s+$/, '');
      if (neoDangDo.test(truocDong)) continue;
      const sau = str.slice(i + 1);
      if (/^\s*\n/.test(sau) || dauMuc.test(sau)) cat.add(i + 1);
      continue;
    }
    if (c === ';') {
      if (/^\s/.test(str.slice(i + 1))) cat.add(i + 1);
      continue;
    }
    if (c !== '.' && c !== '?' && c !== '!') continue;
    const truoc = str.slice(Math.max(0, i - 12), i);
    const sau = str.slice(i + 1);
    if (c === '.' && /\d$/.test(truoc) && /^\d/.test(sau)) continue;
    if (c === '.' && tat.test(truoc)) continue;
    if (c === '.' && /(?:^|\n)\s*\d{1,2}$/.test(str.slice(0, i))) continue;
    if (/^["”’»)\]]*\s+["“(‘«]?[\p{Lu}\d(–-]/u.test(sau)) {
      const m = /^["”’»)\]]*/.exec(sau)[0].length;
      cat.add(i + 1 + m);
    }
  }
  const moc = [...cat].sort((a, b) => a - b);
  const ra = [];
  let tu = 0;
  for (const m of [...moc, str.length]) {
    let den = m;
    while (den < str.length && /\s/.test(str[den])) den += 1;
    if (den <= tu) continue;
    if (!str.slice(tu, den).trim() && ra.length) ra[ra.length - 1][1] = den;
    else ra.push([tu, den]);
    tu = den;
  }
  return ra;
}

const moRongKhoang = (mangSapTang, tu, den) => {
  if (tu > den) return [];
  const kq = [];
  for (const m of mangSapTang) {
    if (m >= tu && m <= den) kq.push(m);
    else if (m > den) break;
  }
  return kq;
};

const tachDiemCon = (chuoiDiem) => {
  const ds = [];
  const re = /\(\s*([a-zđ]{1,4}|[A-Z]|\d{1,2})\s*\)/gu;
  let m;
  while ((m = re.exec(chuoiDiem)) !== null) ds.push(m[1]);
  return ds;
};

const boKhoaVung = () => {
  const vung = [];
  return {
    biKhoa(tu, den) {
      return vung.some(([a, b]) => tu < b && den > a);
    },
    khoa(tu, den) {
      vung.push([tu, den]);
    },
    danhSach() {
      return vung;
    },
  };
};

// Kiểm tra tiền tố không phải mã HS (tiêu chuẩn kỹ thuật / số văn bản / đo lường).
const TIEN_TO_CHUAN = /(?:ISO|CAS|C\.I\.?|TCVN|ASTM|IEC|IEEE|DIN|JIS|AISI|SAE|API|EN|BS|UNI|GOST|Số|No\.?|TT-?\w*)\s*[-–:/]?\s*$/iu;
const HAU_TO_DON_VI = /^\s*(?:mmHg|mm|cm|dm|km|µm|nm|mg|kg|ml|g|l|m|kV|mA|Ah|Wh|kW|MW|W|V|kHz|MHz|GHz|Hz|kPa|MPa|GPa|Pa|bar|mbar|atm|psi|rpm|dB|mol|mmol|cal|kcal|kJ|ohm|dpi|cc|ppm|ppb|%|°[CF]?|giờ|phút|giây|năm|tháng|ngày|tuổi)(?![\p{L}\p{N}_])/iu;
const TRUOC_LA_TU_VUNG = /[\p{L}\p{N}_]$/u;
const SAU_LA_TU_VUNG = /^[\p{L}\p{N}_]/u;

function ghepChuGiaiId(phanHoacChuong, kieuCg, muc) {
  if (!phanHoacChuong || !muc || !muc.so) return null;
  const goc = phanHoacChuong.loai === 'PHAN' ? `phan:${phanHoacChuong.ma}` : `chuong:${phanHoacChuong.ma}`;
  const thanhPhan = [goc, kieuCg, String(Number.parseInt(muc.so, 10))];
  for (const d of muc.diem || []) {
    // Trong khuôn id lớp 1, điểm thường viết thường (phan/chuong sẽ đối chiếu theoThuong).
    thanhPhan.push(d);
  }
  return thanhPhan.join(':');
}

function phanTichDanhSachMucCg(chuoiMuc) {
  const kq = [];
  const tokenRe = /(?:(?:\((\d{1,2})\)|(\d{1,2}))(?:([a-zA-Z])(?![\p{L}\p{N}_])|((?:\s*\([a-zA-Zđ0-9]{1,4}\))*)))|((?:\s*\([a-zA-Zđ0-9]{1,4}\))+)/gu;
  let soGanNhat = null;
  let m;
  let pos = 0;
  let ketNoiTruoc = '';
  while ((m = tokenRe.exec(chuoiMuc)) !== null) {
    const gap = chuoiMuc.slice(pos, m.index).trim();
    if (gap) ketNoiTruoc = gap;
    pos = m.index + m[0].length;
    const laKhoang = /^(?:đến|tới|tơi|-|–)$/iu.test(ketNoiTruoc);
    if (m[1] || m[2]) {
      const so = Number.parseInt(m[1] || m[2], 10);
      const diem = m[3] ? [m[3]] : tachDiemCon(m[4] || '');
      if (laKhoang && diem.length === 0 && kq.length > 0 && kq[kq.length - 1].diem.length === 0) {
        const tuSo = Number.parseInt(kq[kq.length - 1].so, 10);
        if (so > tuSo && so - tuSo <= 30) {
          for (let k = tuSo + 1; k <= so; k += 1) kq.push({ so: String(k), diem: [] });
          soGanNhat = String(so);
          ketNoiTruoc = '';
          continue;
        }
      }
      soGanNhat = String(so);
      kq.push({ so: soGanNhat, diem });
    } else if (m[5] && soGanNhat) {
      const diemMoi = tachDiemCon(m[5]);
      const truoc = kq.length > 0 && kq[kq.length - 1].so === soGanNhat ? kq[kq.length - 1].diem : [];
      const gocCha = truoc.length > diemMoi.length ? truoc.slice(0, truoc.length - diemMoi.length) : [];
      const diemDayDu = [...gocCha, ...diemMoi];
      if (
        laKhoang &&
        diemMoi.length === 1 &&
        truoc.length > 0 &&
        /^[a-z]$/i.test(truoc[truoc.length - 1]) &&
        /^[a-z]$/i.test(diemMoi[0])
      ) {
        const c1 = truoc[truoc.length - 1].toLowerCase().charCodeAt(0);
        const c2 = diemMoi[0].toLowerCase().charCodeAt(0);
        if (c2 > c1 && c2 - c1 <= 20) {
          for (let c = c1 + 1; c <= c2; c += 1) {
            kq.push({ so: soGanNhat, diem: [...gocCha, String.fromCharCode(c)] });
          }
          ketNoiTruoc = '';
          continue;
        }
      }
      kq.push({ so: soGanNhat, diem: diemDayDu });
    }
    ketNoiTruoc = '';
  }
  return kq;
}

/**
 * Rút toàn bộ dẫn chiếu từ một câu luật (tất định, ưu tiên cụ thể -> khái quát).
 * @param {string} vanBan
 * @param {{id: string, nutId?: string, loaiNut?: string, khoNut?: ReturnType<typeof taoKhoNut>}} opts
 */
function rutDanChieuCau(vanBan, opts = {}) {
  const s = String(vanBan || '');
  const cauId = opts.id || '';
  const nutId = opts.nutId || (cauId.includes('#') ? cauId.slice(0, cauId.lastIndexOf('#')) : cauId);
  const loaiNut = opts.loaiNut || null;
  const khoNut = opts.khoNut || null;
  const boiCanh = suyBoiCanhNut(nutId);

  const khoa = boKhoaVung();
  const canh = [];
  const khongTonTai = [];
  const nghiLoiIn = [];
  const boQua = new Set();
  const daThemCanh = new Set();
  const daThemThieu = new Set();

  const ghiNhan = (denChuan, dang, trich, viTri, extra = null) => {
    if (!denChuan) return;
    const daGiai = khoNut ? khoNut.giaiId(denChuan) : denChuan;
    const mucTieu = daGiai || denChuan;
    // Tự trỏ vào chính nút đang đọc (hoặc tiêu đề của chính Phần/Chương/Phân chương)
    if (mucTieu === nutId || (loaiNut === 'TEN' && mucTieu === boiCanh.goc)) {
      boQua.add(viTri[0] + ':' + viTri[1]);
      return;
    }
    if (khoNut && !daGiai) {
      const khoaThieu = `${cauId}|${denChuan}`;
      if (!daThemThieu.has(khoaThieu)) {
        daThemThieu.add(khoaThieu);
        khongTonTai.push({
          tu: cauId,
          tuNut: nutId,
          den: denChuan,
          dang,
          trich,
          viTri,
          cau: s.trim(),
          ...(extra && extra.nghiLoiIn ? { nghiLoiIn: true } : {}),
        });
      }
      return;
    }
    const khoaCanh = `${cauId}|${mucTieu}`;
    if (daThemCanh.has(khoaCanh)) return;
    daThemCanh.add(khoaCanh);
    canh.push({
      tu: cauId,
      tuNut: nutId,
      den: mucTieu,
      loai: 'NHAC',
      dang,
      trich,
      viTri,
      ...(extra && extra.nghiLoiIn ? { nghiLoiIn: true } : {}),
    });
  };

  // ── 1a. "Chú giải 72.14" / "Chú giải 29.01, 29.07, và 29.33" → nhóm 4 số bieu:NNNN
  {
    const re = /\bchú\s+giải\s+(\d{2}\.\d{2}(?:\s*(?:,?\s*(?:và|hoặc|hay|and)|,|đến|tới|tơi|–|-)\s*(?:nhóm\s+)?\d{2}\.\d{2})*)(?![\p{L}\p{N}_])/giu;
    let m;
    while ((m = re.exec(s)) !== null) {
      const tu = m.index;
      const den = tu + m[0].length;
      if (khoa.biKhoa(tu, den)) continue;
      khoa.khoa(tu, den);
      const maRe = /\d{2}\.\d{2}/g;
      let mm;
      while ((mm = maRe.exec(m[1])) !== null) {
        const ma4 = mm[0].replace('.', '');
        ghiNhan(`bieu:${ma4}`, 'nhom', m[0], [tu, den]);
      }
    }
  }

  // ── 1b. "Chú giải Phần 2" / "Chú giải Phần 3 và 4 của Phần này" → phan:<P>:cg:<n>
  {
    const re = /\bchú\s+giải\s+phần\s+(\d{1,2}(?:\s*(?:,|và|hoặc|hay|đến|tới|tơi|–|-)\s*\d{1,2})*)(?:\s*(?:của|thuộc|cho)?\s*(phần\s+(?:[IVX]+|này)|phần))?(?![\p{L}\p{N}_])/giu;
    let m;
    while ((m = re.exec(s)) !== null) {
      const tu = m.index;
      const den = tu + m[0].length;
      if (khoa.biKhoa(tu, den)) continue;
      let phanMa = boiCanh.phan;
      if (m[2] && /phần\s+([IVX]+)/i.test(m[2])) {
        phanMa = chuanPhan(/phần\s+([IVX]+)/i.exec(m[2])[1].toUpperCase());
      }
      if (!phanMa) continue;
      khoa.khoa(tu, den);
      const dsMuc = phanTichDanhSachMucCg(m[1]);
      for (const muc of dsMuc) {
        ghiNhan(ghepChuGiaiId({ loai: 'PHAN', ma: phanMa }, 'cg', muc), 'chu_giai', m[0], [tu, den]);
      }
    }
  }

  // ── 1c. Chú giải / Chú giải phân nhóm / Chú giải bổ sung đầy đủ (/iu)
  {
    const mucPat = '(?:\\(\\d{1,2}\\)|\\d{1,2})(?:[a-zA-Z](?![\\p{L}\\p{N}_])|(?:\\s*\\([a-zA-Zđ0-9]{1,4}\\))*)';
    const mucListPat = `${mucPat}(?:\\s*(?:,|và|hoặc|hay|đến|tới|tơi|–|-)\\s*(?:đoạn\\s+|điểm\\s+)?(?:${mucPat}|(?:\\([a-zA-Zđ0-9]{1,4}\\))+))*`;
    const phamViPat = '(?:(?:,?\\s*(?:của|thuộc|tại|trong|cho)?\\s*)(?:phần\\s+(?:[ivx]+|\\d{1,2}|này|đó)|chương\\s+(?:\\d{1,2}|này|đó)|phần(?!\\s+(?:này|đó|[ivx0-9]))|chương(?!\\s+(?:này|đó|\\d))|này)|ở\\s+trên|nêu\\s+trên|trên\\s+đây)';
    const diemSauPhamViPat = '(?:[ \\t]*,[ \\t]+((?:\\([a-zA-Zđ0-9]{1,4}\\))+(?:[ \\t]*(?:,|và|hoặc|hay|đến|tới|tơi|–|-)[ \\t]*(?:\\([a-zA-Zđ0-9]{1,4}\\))+)*))?';
    const re = new RegExp(
      `\\bchú\\s+giải(?:\\s+(phân\\s+nhóm|bổ\\s+sung))?\\s+(${mucListPat})(?:\\s*${phamViPat}${diemSauPhamViPat})?(?![\\p{L}\\p{N}_])`,
      'giu',
    );
    let m;
    while ((m = re.exec(s)) !== null) {
      const tu = m.index;
      const den = tu + m[0].length;
      if (khoa.biKhoa(tu, den)) continue;
      const sauNgay = s.slice(den, den + 12);
      if (/^\.\d{2}/.test(sauNgay)) continue;
      const kieuCg = m[1]
        ? (/bổ/iu.test(m[1]) ? 'cgbs' : 'cgpn')
        : 'cg';
      const toanCum = m[0];
      let targetScope = null;
      const phanExplicit = /\bphần\s+([ivx]+|\d{1,2})(?![\p{L}\p{N}_])/iu.exec(toanCum);
      const chuongExplicit = /\bchương\s+(\d{1,2})(?![\p{L}\p{N}_])/iu.exec(toanCum);
      if (phanExplicit) {
        const rawP = /^\d+$/.test(phanExplicit[1]) ? phanExplicit[1] : phanExplicit[1].toUpperCase();
        const p = chuanPhan(rawP, { choPhepSo: true });
        if (p) targetScope = { loai: 'PHAN', ma: p };
      } else if (chuongExplicit) {
        const c = chuanChuong(chuongExplicit[1]);
        if (c) targetScope = { loai: 'CHUONG', ma: c };
      } else if (/\bchương\s+đó(?![\p{L}\p{N}_])/iu.test(toanCum)) {
        const prev = [...s.slice(0, tu).matchAll(/\bchương\s+(\d{1,2})(?![\p{L}\p{N}_])/giu)];
        if (prev.length) targetScope = { loai: 'CHUONG', ma: chuanChuong(prev[prev.length - 1][1]) };
      } else if (/\bphần\s+đó(?![\p{L}\p{N}_])/iu.test(toanCum)) {
        const prev = [...s.slice(0, tu).matchAll(/\bphần\s+([IVX]+)(?![\p{L}\p{N}_])/gu)];
        if (prev.length) targetScope = { loai: 'PHAN', ma: chuanPhan(prev[prev.length - 1][1]) };
      } else if (/\bphần(?:\s+này)?(?![\p{L}\p{N}_])/iu.test(toanCum)) {
        if (boiCanh.phan) targetScope = { loai: 'PHAN', ma: boiCanh.phan };
      } else if (/\bchương(?:\s+này)?(?![\p{L}\p{N}_])/iu.test(toanCum)) {
        if (boiCanh.chuong) targetScope = { loai: 'CHUONG', ma: boiCanh.chuong };
      } else if (boiCanh.phan && /^phan:/.test(nutId)) {
        targetScope = { loai: 'PHAN', ma: boiCanh.phan };
      } else if (boiCanh.chuong) {
        targetScope = { loai: 'CHUONG', ma: boiCanh.chuong };
      } else if (boiCanh.phan) {
        targetScope = { loai: 'PHAN', ma: boiCanh.phan };
      }
      if (!targetScope || !targetScope.ma) continue;
      khoa.khoa(tu, den);
      const chuoiMucDayDu = m[3] ? `${m[2]} ${m[3]}` : m[2];
      const dsMuc = phanTichDanhSachMucCg(chuoiMucDayDu);
      const mucGhi = m[3] && dsMuc.length > 1 ? dsMuc.slice(1) : dsMuc;
      for (const muc of mucGhi) {
        ghiNhan(ghepChuGiaiId(targetScope, kieuCg, muc), 'chu_giai', toanCum, [tu, den]);
      }
    }
  }

  // ── 2. Quy tắc tổng quát (GIR) 1..6
  {
    const qtItem = '(?:từ\\s+)?[1-6](?:\\s*\\([abc]\\))?';
    const re = new RegExp(
      `\\b(?:các\\s+)?quy\\s+tắc(?:\\s+tổng\\s+quát)?\\s+(${qtItem}(?:\\s*(?:,|và|hoặc|hay|đến|tới|tơi|–|-)\\s*(?:quy\\s+tắc\\s+)?(?:[1-6](?:\\s*\\([abc]\\))?|\\([abc]\\)))*)(?![\\p{L}\\p{N}_])`,
      'giu',
    );
    let m;
    while ((m = re.exec(s)) !== null) {
      const tu = m.index;
      const den = tu + m[0].length;
      if (khoa.biKhoa(tu, den)) continue;
      khoa.khoa(tu, den);
      const phan = m[1];
      const rangeRe = /([1-6])\s*(?:đến|tới|tơi|-|–)\s*(?:quy\s+tắc\s+)?([1-6])/giu;
      let rm;
      const daKhoang = new Set();
      while ((rm = rangeRe.exec(phan)) !== null) {
        const a = Number.parseInt(rm[1], 10);
        const b = Number.parseInt(rm[2], 10);
        if (b >= a) {
          for (let k = a; k <= b; k += 1) {
            ghiNhan(`gir:${k}`, 'quy_tac', m[0], [tu, den]);
            daKhoang.add(k);
          }
        }
      }
      const itemRe = /([1-6])(?:\s*\(([abc])\))?|\(([abc])\)/giu;
      let im;
      let lastRule = null;
      while ((im = itemRe.exec(phan)) !== null) {
        if (im[1]) {
          const so = Number.parseInt(im[1], 10);
          lastRule = so;
          if (im[2]) ghiNhan(`gir:${so}:${im[2].toLowerCase()}`, 'quy_tac', m[0], [tu, den]);
          else if (!daKhoang.has(so)) ghiNhan(`gir:${so}`, 'quy_tac', m[0], [tu, den]);
        } else if (im[3] && lastRule) {
          ghiNhan(`gir:${lastRule}:${im[3].toLowerCase()}`, 'quy_tac', m[0], [tu, den]);
        }
      }
    }
  }

  // ── 3. Phân nhóm 6 số & Dòng 8 số
  {
    const ma68 = '(?:\\d{4}\\.\\d{2}(?:\\.\\d{2})?|\\d{2}\\.\\d{2}\\.\\d{2}|\\.\\d{2}(?:\\.\\d{2})?)';
    const reAnc = new RegExp(
      `\\b(?:từ\\s+)?(?:các\\s+)?(?:phân\\s+nhóm|nhóm(?:\\s+hàng)?|mã(?:\\s+hàng)?)(?:\\s+từ)?\\s+(${ma68}(?:\\s*(?:,|và|hoặc|hay|and|đến|tới|tơi|–|-)\\s*(?:từ\\s+|phân\\s+nhóm\\s+|mã\\s+)?${ma68})*)(?![\\p{L}\\p{N}_])`,
      'giu',
    );
    let m;
    while ((m = reAnc.exec(s)) !== null) {
      const tu = m.index;
      const den = tu + m[0].length;
      if (khoa.biKhoa(tu, den)) continue;
      if (!/(?:\d{4}\.\d{2}|\d{2}\.\d{2}\.\d{2})/.test(m[1])) continue;
      khoa.khoa(tu, den);
      const tokenRe = /(\d{4}\.\d{2}(?:\.\d{2})?|\d{2}\.\d{2}\.\d{2}|\.\d{2}(?:\.\d{2})?)/g;
      const rawTokens = [];
      let prefix4 = null;
      let tm;
      while ((tm = tokenRe.exec(m[1])) !== null) {
        const full = tm[1].startsWith('.') && prefix4 ? `${prefix4}${tm[1]}` : tm[1];
        const digits = full.replace(/\./g, '');
        if (/^\d{4}/.test(digits)) prefix4 = digits.slice(0, 4);
        rawTokens.push({ raw: tm[1], digits, start: tm.index, end: tm.index + tm[0].length });
      }
      for (let i = 0; i < rawTokens.length; i += 1) {
        const cur = rawTokens[i];
        const nxt = rawTokens[i + 1];
        const giua = nxt ? m[1].slice(cur.end, nxt.start) : '';
        if (nxt && /^\s*(?:đến|tới|tơi|-|–)\s*(?:phân\s+nhóm\s+|mã\s+)?$/iu.test(giua) && cur.digits.length === nxt.digits.length) {
          const dang68 = cur.digits.length === 8 ? 'dong' : 'phan_nhom';
          const set68 = khoNut ? (cur.digits.length === 8 ? khoNut.dongSet : khoNut.pnSet) : null;
          const ds68 = khoNut ? (cur.digits.length === 8 ? khoNut.dongBieu : khoNut.phanNhomBieu) : null;
          if (cur.digits > nxt.digits) {
            nghiLoiIn.push({ tu: cauId, tuNut: nutId, trich: m[0], tuMa: cur.digits, denMa: nxt.digits, lyDo: 'khoang_nguoc' });
            ghiNhan(`bieu:${cur.digits}`, dang68, m[0], [tu, den], { nghiLoiIn: true });
            ghiNhan(`bieu:${nxt.digits}`, dang68, m[0], [tu, den], { nghiLoiIn: true });
          } else if (khoNut) {
            if (!set68.has(cur.digits)) ghiNhan(`bieu:${cur.digits}`, dang68, m[0], [tu, den]);
            if (!set68.has(nxt.digits)) ghiNhan(`bieu:${nxt.digits}`, dang68, m[0], [tu, den]);
            for (const k of moRongKhoang(ds68, cur.digits, nxt.digits)) ghiNhan(`bieu:${k}`, dang68, m[0], [tu, den]);
          } else {
            ghiNhan(`bieu:${cur.digits}`, dang68, m[0], [tu, den]);
            ghiNhan(`bieu:${nxt.digits}`, dang68, m[0], [tu, den]);
          }
          i += 1;
        } else {
          ghiNhan(`bieu:${cur.digits}`, cur.digits.length === 8 ? 'dong' : 'phan_nhom', m[0], [tu, den]);
        }
      }
    }

    // Mã chuẩn DDDD.DD(.DD) đứng riêng (ngoài tiền tố tiêu chuẩn / đơn vị đo)
    const reBare = /\b(\d{4}\.\d{2}(?:\.\d{2})?)\b(?![.\d])/g;
    while ((m = reBare.exec(s)) !== null) {
      const tu = m.index;
      const den = tu + m[0].length;
      if (khoa.biKhoa(tu, den)) continue;
      if (TIEN_TO_CHUAN.test(s.slice(Math.max(0, tu - 18), tu))) continue;
      if (HAU_TO_DON_VI.test(s.slice(den, den + 12))) continue;
      const digits = m[1].replace(/\./g, '');
      khoa.khoa(tu, den);
      ghiNhan(`bieu:${digits}`, digits.length === 8 ? 'dong' : 'phan_nhom', m[0], [tu, den]);
    }
  }

  // ── 4. Nhóm 4 số (hỗ trợ cả chú giải xen giữa, "hay"/"and", "từ..đến" giữa dãy, "heading", và khoảng ngược)
  {
    const ghiNhanDanhSachNhom = (listStr, { coChuNhom, toanCum, tu, den }) => {
      const masked = listStr.replace(/\([^()\n]*\)/g, (x) => ' '.repeat(x.length));
      const tokenRe = coChuNhom ? /(\d{2}\.\d{2}|\d{4})/g : /(\d{2}\.\d{2})/g;
      const rawTokens = [];
      let tm;
      while ((tm = tokenRe.exec(masked)) !== null) {
        if (/^\.\d{2}/.test(masked.slice(tm.index + tm[0].length, tm.index + tm[0].length + 4))) continue;
        if (!tm[1].includes('.') && HAU_TO_DON_VI.test(masked.slice(tm.index + tm[0].length, tm.index + tm[0].length + 12))) continue;
        const digits = tm[1].replace('.', '');
        rawTokens.push({ digits, start: tm.index, end: tm.index + tm[0].length });
      }
      if (!rawTokens.length) return false;
      for (let i = 0; i < rawTokens.length; i += 1) {
        const cur = rawTokens[i];
        const nxt = rawTokens[i + 1];
        const giua = nxt ? masked.slice(cur.end, nxt.start) : '';
        if (nxt && /^\s*(?:đến|tới|tơi|-|–)\s*(?:nhóm(?:\s+hàng)?\s+)?$/iu.test(giua)) {
          if (cur.digits > nxt.digits) {
            nghiLoiIn.push({ tu: cauId, tuNut: nutId, trich: toanCum, tuMa: cur.digits, denMa: nxt.digits, lyDo: 'khoang_nguoc' });
            ghiNhan(`bieu:${cur.digits}`, 'nhom', toanCum, [tu, den], { nghiLoiIn: true });
            ghiNhan(`bieu:${nxt.digits}`, 'nhom', toanCum, [tu, den], { nghiLoiIn: true });
          } else if (khoNut) {
            if (!khoNut.nhomSet.has(cur.digits)) ghiNhan(`bieu:${cur.digits}`, 'nhom', toanCum, [tu, den]);
            if (!khoNut.nhomSet.has(nxt.digits)) ghiNhan(`bieu:${nxt.digits}`, 'nhom', toanCum, [tu, den]);
            for (const k of moRongKhoang(khoNut.nhomBieu, cur.digits, nxt.digits)) {
              ghiNhan(`bieu:${k}`, 'nhom', toanCum, [tu, den]);
            }
          } else {
            ghiNhan(`bieu:${cur.digits}`, 'nhom', toanCum, [tu, den]);
            ghiNhan(`bieu:${nxt.digits}`, 'nhom', toanCum, [tu, den]);
          }
          i += 1;
        } else {
          ghiNhan(`bieu:${cur.digits}`, 'nhom', toanCum, [tu, den]);
        }
      }
      return true;
    };

    const nhomCode = '(?:\\d{2}\\.\\d{2}|\\d{4})';
    const glossPat = '(?:\\s*\\((?:(?!\\d{2}\\.\\d{2}|\\b(?:nhóm|phân\\s+nhóm|chương|phần|chú\\s+giải|heading)\\b)[^()\\n]){1,75}\\))?';
    const doiVoiPat = '(?:\\s+đối\\s+với\\s+[\\p{L}\\s]{1,25})?';
    const sepPat = `(?:,?\\s*(?:và|hoặc|hay|and)\\s+(?:từ\\s+)?|,\\s*(?:từ\\s+)?|\\s*(?:đến|tới|tơi|–|-)\\s*(?:nhóm(?:\\s+hàng)?\\s+)?|\\s*\\.\\s+(?=\\d{2}\\.\\d{2}\\s*(?:,|và|hoặc|hay|and|đến|tới|tơi|-|–|\\)))|\\s+(?=\\d{2}\\.\\d{2}))`;
    const anchorPat = '\\b(?:từ\\s+)?(?:các\\s+)?(?:(?:nhóm(?:\\s+hàng)?|heading)(?:\\s+(?:thích\\s+hợp|tương\\s+ứng))?(?:\\s+(?:như|gồm|sau(?:\\s+của\\s+chương\\s+này)?|từ))?|(?:thuộc|phân\\s+loại(?:\\s+vào)?|ví\\s+dụ,?\\s*(?:nhóm)?|xem(?:\\s+nhóm)?)(?:\\s+(?:nhóm(?:\\s+hàng)?|từ))?)';
    const reAnc = new RegExp(
      `${anchorPat}(?:\\s+|(?<=nhóm))(${nhomCode}(?:${glossPat}${doiVoiPat}${sepPat}${nhomCode})*${glossPat})(?![\\p{L}\\p{N}_])`,
      'giu',
    );
    let m;
    while ((m = reAnc.exec(s)) !== null) {
      const tu = m.index;
      const den = tu + m[0].length;
      if (khoa.biKhoa(tu, den)) continue;
      if (/^\s*\.\d{2}/.test(s.slice(den, den + 5))) continue;
      const coChuNhom = /\b(?:nhóm|heading)\b/iu.test(m[0]);
      if (!coChuNhom && !/\d{2}\.\d{2}/.test(m[1])) continue;
      if (!ghiNhanDanhSachNhom(m[1], { coChuNhom, toanCum: m[0], tu, den })) continue;
      khoa.khoa(tu, den);
    }

    // Dãy >=2 mã NN.NN nối tiếp nhau không có từ "nhóm" phía trước (vd: "32.08 đến 32.10,32.12 hoặc 32.13", "29.07, và 29.33.", tiêu đề SEN "39.02 39.03 39.04")
    const reList = new RegExp(
      `(?<![\\d.])(\\d{2}\\.\\d{2}(?:${glossPat}${doiVoiPat}(?:,?\\s*(?:và|hoặc|hay|and)\\s+(?:từ\\s+)?|,\\s*(?:từ\\s+)?|\\s*(?:đến|tới|tơi|–|-)\\s*|\\s*\\.\\s+(?=\\d{2}\\.\\d{2}\\s*(?:,|và|hoặc|hay|and|đến|tới|tơi|-|–|\\)))|\\s+(?=\\d{2}\\.\\d{2}))\\d{2}\\.\\d{2})+)(?!\\.\\d|\\d)`,
      'giu',
    );
    while ((m = reList.exec(s)) !== null) {
      const tu = m.index;
      const den = tu + m[0].length;
      if (khoa.biKhoa(tu, den)) continue;
      if (TIEN_TO_CHUAN.test(s.slice(Math.max(0, tu - 18), tu))) continue;
      // Nếu chỉ nối bằng gạch ngang trần ("13.23 – 94.64" trong bảng vật lý), ít nhất một đầu mút phải là nhóm có thật
      if (/^\d{2}\.\d{2}\s*[-–]\s*\d{2}\.\d{2}$/.test(m[1]) && khoNut) {
        const ms = [...m[1].matchAll(/\d{2}\.\d{2}/g)].map((x) => x[0].replace('.', ''));
        if (!ms.some((d) => khoNut.nhomSet.has(d))) continue;
      }
      khoa.khoa(tu, den);
      ghiNhanDanhSachNhom(m[1], { coChuNhom: false, toanCum: m[0], tu, den });
    }
  }

  // ── 5. Phân Chương
  {
    const re = /\bphân\s+chương\s+([IVX]+(?:\s*(?:,|và|hoặc|hay|đến|tới|tơi|–|-)\s*(?:phân\s+chương\s+)?[IVX]+)*)(?:\s*(?:của|thuộc)?\s*(chương\s+(?:\d{1,2}|này)|chương))?(?![\p{L}\p{N}_])/giu;
    let m;
    while ((m = re.exec(s)) !== null) {
      const tu = m.index;
      const den = tu + m[0].length;
      if (khoa.biKhoa(tu, den)) continue;
      let ch = boiCanh.chuong;
      if (m[2] && /chương\s+(\d{1,2})/i.test(m[2])) {
        ch = chuanChuong(/chương\s+(\d{1,2})/i.exec(m[2])[1]);
      } else {
        const truoc = s.slice(Math.max(0, tu - 30), tu);
        const pcM = /\bchương\s+(\d{1,2})\s*\(\s*$/iu.exec(truoc);
        if (pcM) ch = chuanChuong(pcM[1]);
      }
      if (!ch) continue;
      khoa.khoa(tu, den);
      const pcTokens = [];
      const lmRe = /[IVX]+/g;
      let lm;
      while ((lm = lmRe.exec(m[1])) !== null) {
        if (LA_MA_CHUAN.has(lm[0])) pcTokens.push({ ma: lm[0], start: lm.index, end: lm.index + lm[0].length });
      }
      for (let i = 0; i < pcTokens.length; i += 1) {
        const cur = pcTokens[i];
        const nxt = pcTokens[i + 1];
        const giua = nxt ? m[1].slice(cur.end, nxt.start) : '';
        if (nxt && /^\s*(?:đến|tới|tơi|-|–)\s*(?:phân\s+chương\s+)?$/iu.test(giua)) {
          const s1 = PHAN_SANG_SO[cur.ma];
          const s2 = PHAN_SANG_SO[nxt.ma];
          if (s1 && s2 && s2 >= s1) {
            for (let k = s1; k <= s2; k += 1) {
              ghiNhan(`chuong:${ch}:pc:${SO_SANG_PHAN[String(k)]}`, 'phan_chuong', m[0], [tu, den]);
            }
          }
          i += 1;
        } else {
          ghiNhan(`chuong:${ch}:pc:${cur.ma}`, 'phan_chuong', m[0], [tu, den]);
        }
      }
    }
  }

  // ── 6. Chương (2 chữ số, xử lý khoảng qua Chương 77 dự phòng)
  {
    const re = /\b(?:từ\s+)?(?:các\s+)?chương(?:\s+từ)?\s+(\d{1,2}(?:\s*(?:,|và|hoặc|hay|đến|tới|tơi|–|-)\s*(?:từ\s+|chương\s+)?\d{1,2})*)(?![\p{L}\p{N}_])/giu;
    let m;
    while ((m = re.exec(s)) !== null) {
      const tu = m.index;
      const den = tu + m[0].length;
      if (khoa.biKhoa(tu, den)) continue;
      khoa.khoa(tu, den);
      const tokRe = /\d{1,2}/g;
      const tokens = [];
      let tm;
      while ((tm = tokRe.exec(m[1])) !== null) {
        const so = Number.parseInt(tm[0], 10);
        if (so >= 1 && so <= 99) tokens.push({ so, ch: chuanChuong(so), start: tm.index, end: tm.index + tm[0].length });
      }
      for (let i = 0; i < tokens.length; i += 1) {
        const cur = tokens[i];
        const nxt = tokens[i + 1];
        const giua = nxt ? m[1].slice(cur.end, nxt.start) : '';
        if (nxt && /^\s*(?:đến|tới|tơi|-|–)\s*(?:chương\s+)?$/iu.test(giua)) {
          if (nxt.so < cur.so) {
            nghiLoiIn.push({ tu: cauId, tuNut: nutId, trich: m[0], tuMa: cur.ch, denMa: nxt.ch, lyDo: 'khoang_nguoc' });
            ghiNhan(`chuong:${cur.ch}`, 'chuong', m[0], [tu, den], { nghiLoiIn: true });
            ghiNhan(`chuong:${nxt.ch}`, 'chuong', m[0], [tu, den], { nghiLoiIn: true });
          } else {
            for (let k = cur.so; k <= nxt.so; k += 1) {
              const ch = chuanChuong(k);
              // Chương 77 để dự phòng (không có nút trong chuong.jsonl/bieu.jsonl): bỏ qua nếu nằm giữa khoảng
              if (k === 77 && k > cur.so && k < nxt.so) continue;
              ghiNhan(`chuong:${ch}`, 'chuong', m[0], [tu, den]);
            }
          }
          i += 1;
        } else {
          ghiNhan(`chuong:${cur.ch}`, 'chuong', m[0], [tu, den]);
        }
      }
    }
  }

  // ── 7. Phần I..XXI (từ khóa không phân biệt hoa thường, chữ La Mã PHẢI IN HOA [IVX]+)
  {
    const lm = '(?:XXI|XX|XIX|XVIII|XVII|XVI|XV|XIV|XIII|XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I)';
    const re = new RegExp(
      `\\b(?:từ\\s+)?(?:các\\s+)?[Pp][Hh][Ầầ][Nn](?:\\s+từ)?\\s+(${lm}(?:\\s*(?:,|và|hoặc|hay|đến|tới|tơi|–|-)\\s*(?:từ\\s+|[Pp][Hh][Ầầ][Nn]\\s+)?${lm})*)(?![\\p{L}\\p{N}_])`,
      'gu',
    );
    let m;
    while ((m = re.exec(s)) !== null) {
      const tu = m.index;
      const den = tu + m[0].length;
      if (khoa.biKhoa(tu, den)) continue;
      if (TRUOC_LA_TU_VUNG.test(s.slice(Math.max(0, tu - 1), tu)) && tu > 0) continue;
      if (SAU_LA_TU_VUNG.test(s.slice(den, den + 1))) continue;
      khoa.khoa(tu, den);
      const lmRe = new RegExp(lm, 'g');
      const tokens = [];
      let tm;
      while ((tm = lmRe.exec(m[1])) !== null) {
        if (LA_MA_CHUAN.has(tm[0])) {
          tokens.push({ ma: tm[0], so: PHAN_SANG_SO[tm[0]], start: tm.index, end: tm.index + tm[0].length });
        }
      }
      for (let i = 0; i < tokens.length; i += 1) {
        const cur = tokens[i];
        const nxt = tokens[i + 1];
        const giua = nxt ? m[1].slice(cur.end, nxt.start) : '';
        if (nxt && /^\s*(?:đến|tới|tơi|-|–)\s*(?:phần\s+)?$/iu.test(giua) && nxt.so >= cur.so) {
          for (let k = cur.so; k <= nxt.so; k += 1) {
            ghiNhan(`phan:${SO_SANG_PHAN[String(k)]}`, 'phan', m[0], [tu, den]);
          }
          i += 1;
        } else {
          ghiNhan(`phan:${cur.ma}`, 'phan', m[0], [tu, den]);
        }
      }
    }
  }

  return { canh, khongTonTai, nghiLoiIn, vungDaKhoa: khoa.danhSach() };
}

/**
 * Dựng đồ thị dẫn chiếu hai chiều (ra & vao) trên tập nút (và câu M-31 nếu có).
 */
function dungDoThiDanChieu({ nut = [], cau = null, khoNut = null, tachTheoCau = true } = {}) {
  const chiMuc = khoNut || taoKhoNut(nut);
  const loaiTheoNut = new Map(nut.map((n) => [n.id, n.loai]));
  const vanBanTheoNut = new Map(nut.map((n) => [n.id, n.nguyenVan || '']));

  const canh = [];
  const khongTonTai = [];
  const nghiLoiIn = [];
  const ra = new Map();
  const vao = new Map();
  const vungTheoCau = new Map();

  const themVaoMap = (map, k, v) => {
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(v);
  };

  if (Array.isArray(cau) && cau.length > 0) {
    for (const c of cau) {
      const pos = c.id.lastIndexOf('#');
      const nutId = pos > 0 ? c.id.slice(0, pos) : c.id;
      const nv = vanBanTheoNut.get(nutId);
      if (typeof nv !== 'string') continue;
      const text = nv.slice(c.tu, c.den);
      const r = rutDanChieuCau(text, { id: c.id, nutId, loaiNut: loaiTheoNut.get(nutId), khoNut: chiMuc });
      vungTheoCau.set(c.id, { nutId, text, vungDaKhoa: r.vungDaKhoa });
      for (const e of r.canh) {
        canh.push(e);
        themVaoMap(ra, e.tuNut, e);
        themVaoMap(vao, e.den, e);
      }
      for (const t of r.khongTonTai) khongTonTai.push(t);
      for (const g of r.nghiLoiIn) nghiLoiIn.push(g);
    }
  } else {
    for (const n of nut) {
      const nv = n.nguyenVan || '';
      const doan = (!tachTheoCau || n.loai === 'TEN') ? [[0, nv.length]] : tachCauCoBan(nv);
      doan.forEach(([tu, den], idx) => {
        const cId = `${n.id}#${idx + 1}`;
        const text = nv.slice(tu, den);
        const r = rutDanChieuCau(text, { id: cId, nutId: n.id, loaiNut: n.loai, khoNut: chiMuc });
        vungTheoCau.set(cId, { nutId: n.id, text, vungDaKhoa: r.vungDaKhoa });
        for (const e of r.canh) {
          canh.push(e);
          themVaoMap(ra, e.tuNut, e);
          themVaoMap(vao, e.den, e);
        }
        for (const t of r.khongTonTai) khongTonTai.push(t);
        for (const g of r.nghiLoiIn) nghiLoiIn.push(g);
      });
    }
  }

  let tongRa = 0;
  for (const ds of ra.values()) tongRa += ds.length;
  let tongVao = 0;
  for (const ds of vao.values()) tongVao += ds.length;

  const theoDang = {};
  for (const e of canh) theoDang[e.dang] = (theoDang[e.dang] || 0) + 1;

  return {
    canh,
    khongTonTai,
    nghiLoiIn,
    ra,
    vao,
    vungTheoCau,
    khoNut: chiMuc,
    canhRa(id) {
      if (ra.has(id)) return ra.get(id);
      return canh.filter((e) => e.tu === id);
    },
    canhVao(den) {
      return vao.get(den) || [];
    },
    thongKe: {
      soNut: nut.length,
      soCanh: canh.length,
      tongRa,
      tongVao,
      khopHaiChieu: tongRa === canh.length && tongVao === canh.length,
      soKhongTonTai: khongTonTai.length,
      soNghiLoiIn: nghiLoiIn.length,
      theoDang,
    },
  };
}

/** Đọc các kho *.jsonl trong thư mục (và tuỳ chọn `.nhom` của data/chu-giai-heading.json). */
function docKhoLuatGoc(thuMuc, { nhomTam = null, coCau = false } = {}) {
  const tep = fs.readdirSync(thuMuc).filter((f) => f.endsWith('.jsonl')).sort();
  const nut = [];
  const cau = [];
  for (const f of tep) {
    const raw = fs.readFileSync(path.join(thuMuc, f), 'utf8').split('\n');
    for (const line of raw) {
      if (line.trim()) nut.push(JSON.parse(line));
    }
  }
  const coNhomJsonl = tep.includes('nhom.jsonl');
  if (!coNhomJsonl && nhomTam && fs.existsSync(nhomTam)) {
    const cgh = JSON.parse(fs.readFileSync(nhomTam, 'utf8'));
    for (const [ma, obj] of Object.entries(cgh)) {
      if (/^\d{4}$/.test(ma) && obj && typeof obj.nhom === 'string' && obj.nhom.trim()) {
        nut.push({
          id: `nhom:${ma}:ct:1`,
          loai: 'CHU_GIAI_CHI_TIET',
          lop: 'HUONG_DAN',
          cha: `bieu:${ma}`,
          so: '1',
          nguyenVan: obj.nhom,
        });
      }
    }
  }
  if (coCau) {
    const cauDir = path.join(thuMuc, 'cau');
    if (fs.existsSync(cauDir)) {
      for (const f of fs.readdirSync(cauDir).filter((x) => x.endsWith('.jsonl')).sort()) {
        for (const line of fs.readFileSync(path.join(cauDir, f), 'utf8').split('\n')) {
          if (line.trim()) cau.push(JSON.parse(line));
        }
      }
    }
  }
  return { nut, cau, khoNut: taoKhoNut(nut), coNhomJsonl };
}

module.exports = {
  BANG_PHAN_CHUONG,
  PHAN_SANG_SO,
  SO_SANG_PHAN,
  CHUONG_SANG_PHAN,
  suyBoiCanhNut,
  taoKhoNut,
  tachCauCoBan,
  rutDanChieuCau,
  dungDoThiDanChieu,
  docKhoLuatGoc,
};
