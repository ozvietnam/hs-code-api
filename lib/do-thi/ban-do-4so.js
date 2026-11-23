// lib/do-thi/ban-do-4so.js — BẢN ĐỒ QUAN HỆ TẦNG 4 SỐ: gói soạn + cổng máy (khuôn bd4@1).
//
// Phục vụ ADR-0004, Quy tắc 1 — so nhóm: hàng được hiểu theo NGHĨA (dạng vật lý, chất liệu, chức năng / cơ chế, dùng ở đâu, ai dùng,
// là bộ phận của gì) rồi so với hồ sơ của từng nhóm 4 số và với cạnh phân biệt giữa các nhóm hay nhầm.
//
// Tất định, KHÔNG LLM, KHÔNG mạng, không ghi tệp. Việc của module này:
//   taoGoi(dsNhom)            → gói soạn { nhom, nguon, ten, ... } — mọi đoạn luật có id, mọi nhóm có danh sách láng giềng
//   renderGoi(goi)            → văn bản gói đưa cho Studio (Gemini)
//   kiemBanDo(bản, gói)       → { loi, vang } — cổng máy; lỗi đỏ chặn nạp
// Người soạn (Gemini) KHÔNG nằm trong repo; khuôn dùng làm System instructions ở docs/giao-viec/do-thi/SOAN-BAN-DO-4SO.md.
'use strict';

const fs = require('fs');
const crypto = require('crypto');
const { dataReadPath } = require('../data-paths');
const T = require('../hs-tree');
const { khongDau } = require('./tu-khoa');
const { gotTen } = require('./phan-con-lai');

const KHUON = 'bd4@1';
const KIEU_NHOM = ['THEO_CHUC_NANG', 'THEO_VAT_LIEU', 'BO_PHAN', 'CON_LAI', 'HANG_CU_THE'];
const LOAI_QUAN_HE = ['PHAN_BIET', 'LOAI_TRU', 'BAO_TRUM', 'BO_PHAN_CUA'];
const QUY_TAC = ['QT1', '2a', '2b', '3a', '3b', '3c'];
const TRUC_HO_SO = ['chucNang', 'coChe', 'dangVatLy', 'chatLieu', 'oDauAiDung', 'hangDuocNeu', 'dieuKienBatBuoc'];
/** Trục mà bỏ trống bị báo vàng. `chatLieu` rỗng = không giới hạn; `dieuKienBatBuoc` rỗng = luật không đặt điều kiện. */
const TRUC_CAN_CO = ['chucNang', 'coChe', 'dangVatLy', 'oDauAiDung', 'hangDuocNeu'];

const GIOI_HAN = { nhom: 30, kyTu: 150000, langGiengToiDa: 20, phamViLangGieng: 450, wcoToiDa: 450, wcoMoiNhom: 6, dkToiDa: 800 };
const TRONG_SO_LANG_GIENG = { C5: 5, C6: 5, C7: 5, LOAI_TRU: 5, CG2XVI: 4, C9: 3, C8: 2, WCO: 2 };

const docJson = (...p) => JSON.parse(fs.readFileSync(dataReadPath(...p), 'utf8'));
const so = (v) => String(v == null ? '' : v).replace(/\D/g, '');
const chu = (v) => (typeof v === 'string' ? v.trim() : '');
const cat = (s, n) => (String(s).length > n ? `${String(s).slice(0, n - 1)}…` : String(s));
const RE_MA_NHOM = /(?<!\d)(?<!\d\.)(\d{2})\.(\d{2})(?!\d)(?!\.\d)/g;

// ───────────────────────────────────────── Chuẩn hoá để so trích nguyên văn ─────────────────────────────────────────
/** Chỉ gộp khoảng trắng và đồng nhất dấu nháy / gạch ngang; KHÔNG bỏ dấu tiếng Việt, KHÔNG đổi hoa thường. */
function chuanHoa(s) {
  return String(s == null ? '' : s).normalize('NFC')
    .replace(/[“”„‟«»]/g, '"').replace(/[‘’‚‛]/g, "'")
    .replace(/[–—−]/g, '-').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}
/** `trich` là chuỗi con nguyên văn của `vanBan`? Dấu `…` / `...` trong trích tách thành các đoạn phải xuất hiện đúng thứ tự. */
function trichNguyenVan(trich, vanBan) {
  const t = chuanHoa(trich); const v = chuanHoa(vanBan);
  if (t.length < 6) return false;
  const doan = t.split(/…|\.{3}/).map((x) => x.trim()).filter((x) => x.length > 0);
  if (!doan.length || doan.every((x) => x.length < 3)) return false;
  let tu = 0;
  for (const d of doan) { const k = v.indexOf(d, tu); if (k < 0) return false; tu = k + d.length; }
  return true;
}

// ───────────────────────────────────────── Tên nhóm / đoạn luật ─────────────────────────────────────────
const tenNhom = (h4) => {
  try { const n = T.nodeOf(h4); return { vi: gotTen(n.tenVi || ''), en: chu(n.tenEn) }; } catch { return { vi: '', en: '' }; }
};
let _chuGiai = null;
const chuGiaiNhom = () => (_chuGiai ||= docJson('chu-giai-heading.json'));
/** Chú giải chi tiết của nhóm → các đoạn đánh id `ct.<nhóm>.<n>` (cắt ở dòng trống, không đổi chữ). */
function doanChiTiet(h4) {
  const e = chuGiaiNhom()[h4];
  const vb = e && typeof e.nhom === 'string' ? e.nhom : '';
  return vb.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean).map((vanBan, i) => ({ id: `ct.${h4}.${i + 1}`, vanBan }));
}
let _dk = null;
function dieuKhoan() {
  if (_dk) return _dk;
  const ra = [];
  for (const tep of ['dieu-khoan-tang2.json', 'dieu-khoan-bo-sung.json']) {
    try { const d = docJson('luat', tep); if (Array.isArray(d)) ra.push(...d); } catch { /* chưa có tệp bổ sung */ }
  }
  _dk = ra.filter((x) => x && x.id && chu(x.nguyenVan));
  return _dk;
}
const nhacNhom = (vb, h4) => vb.includes(`${h4.slice(0, 2)}.${h4.slice(2)}`);
const nhomTrongVanBan = (vb) => [...String(vb).matchAll(RE_MA_NHOM)].map((m) => `${m[1]}${m[2]}`);
/** Khoản Chương / Phần chạm nhóm: `dich` chứa nhóm, hoặc văn bản nêu mã nhóm, hoặc khoản có `dich` thuộc chính Chương / Phần của nhóm. */
function dieuKhoanChamNhom(h4) {
  const c = h4.slice(0, 2);
  return dieuKhoan().filter((x) => {
    if ((x.dich || []).map(so).includes(h4) || nhacNhom(x.nguyenVan, h4)) return true;
    const thuocChuong = (x.cap === 'chuong' && x.gan === c) || (x.cap === 'phan' && (x.apChoChuong || []).includes(c));
    return thuocChuong && (x.dich || []).length > 0;
  });
}

// ───────────────────────────────────────── Láng giềng ─────────────────────────────────────────
let _canh = null;
const bangCanh = () => (_canh ||= require('./dung-bang-canh').dungBangCanh().canh);
let _cg2 = null;
/** Chú giải 2 Phần XVI: các khoản (a)(b)(c) → nhóm được nêu. Chỉ có ý nghĩa với nhóm Ch.84/85. */
function chuGiai2PhanXVI() {
  if (_cg2) return _cg2;
  _cg2 = [];
  try {
    const g = docJson('luat', 'chu-giai-2-phan-xvi.json').nguonGoc;
    const vb = String(g.nguyenVan || '');
    const phan = vb.split(/\n(?=\([a-c]\) )/);
    phan.forEach((p, i) => {
      const id = i === 0 && !/^\([a-c]\)/.test(p) ? 'px16.cg2.0' : `px16.cg2.${(p.match(/^\(([a-c])\)/) || [, String(i)])[1]}`;
      _cg2.push({ id, vanBan: p.replace(/\s*\n\s*/g, ' ').trim(), nhom: [...new Set(nhomTrongVanBan(p))] });
    });
  } catch { _cg2 = []; }
  return _cg2;
}
const h4Cua = (nut) => (/^\d{4,}$/.test(String(nut)) ? String(nut).slice(0, 4) : null);
function langGieng(h4, nut4) {
  const m = new Map();
  const them = (ma, loai) => { if (ma && ma !== h4 && nut4.has(ma)) { if (!m.has(ma)) m.set(ma, new Set()); m.get(ma).add(loai); } };
  for (const e of bangCanh()) {
    const a = h4Cua(e.tu); const b = h4Cua(e.toi);
    switch (e.loai) {
      case 'C5': case 'C6': case 'C7': case 'C8': case 'LOAI_TRU':
        if (a === h4) them(b, e.loai); else if (b === h4) them(a, e.loai);
        break;
      case 'C9': if (b === h4) for (const x of nhomTrongVanBan(e.trich)) them(x, 'C9'); break;
      case 'WCO': if (b === h4) for (const x of nhomTrongVanBan(e.trich).concat((String(e.trich).match(/(?<!\d)\d{4}(?!\d)/g) || []))) them(x, 'WCO'); break;
      default: break;
    }
  }
  if (h4.startsWith('84') || h4.startsWith('85')) {
    for (const k of chuGiai2PhanXVI()) if (k.nhom.includes(h4)) for (const x of k.nhom) them(x, 'CG2XVI');
  }
  const diem = (ls) => [...ls].reduce((s, l) => s + (TRONG_SO_LANG_GIENG[l] || 1), 0);
  return [...m.entries()].map(([ma, ls]) => ({ ma, loai: [...ls].sort(), diem: diem(ls) }))
    .sort((x, y) => y.diem - x.diem || (x.ma < y.ma ? -1 : 1));
}

const WCO_VI = () => { try { return docJson('wco-op', 'vi.json'); } catch { return {}; } };
let _wco = null;
function wcoCuaNhom(h4) {
  if (!_wco) { try { _wco = docJson('wco-op', 'opinions.json'); } catch { _wco = []; } }
  const vi = WCO_VI();
  return _wco.filter((o) => so(o.hs).startsWith(h4) && so(o.hs).length >= 4)
    .map((o) => ({ id: `wco.${o.id}`, pn6: so(o.hs), vanBan: cat(chu(vi[o.line]?.vi) || chu(o.text), GIOI_HAN.wcoToiDa) }))
    .filter((o) => o.vanBan)
    .map((o, i) => ({ o, i, nhac: nhomTrongVanBan(o.vanBan).some((m) => m !== h4) ? 1 : 0 }))
    .sort((a, b) => b.nhac - a.nhac || a.i - b.i).slice(0, GIOI_HAN.wcoMoiNhom).map((x) => x.o);
}
function soTayNhom(h4) {
  let s = null;
  try { s = docJson('so-tay', `${h4}.json`); } catch { return []; }
  const ra = [];
  const them = (kind, i, nhan, x) => { if (chu(x && x.trich)) ra.push({ nhan }); };
  (s.phanBiet || []).forEach((x, i) => them('pb', i, `HỎI "${chu(x.hoi)}" (nếu có → ${x.neuCo}; nếu không → ${x.neuKhong})`, x));
  (s.loaiTru || []).forEach((x, i) => them('lt', i, `LOẠI TRỪ "${chu(x.dieuKien)}" → ${x.sangNhom}`, x));
  (s.dieuKienVao || []).forEach((x, i) => them('dk', i, `ĐIỀU KIỆN VÀO "${chu(x.fact)} ${chu(x.op)} ${x.value == null ? '' : x.value}"`, x));
  return ra;
}

// ───────────────────────────────────────── Gói soạn ─────────────────────────────────────────
function taoGoi(dsNhom) {
  const nhom = [...new Set((dsNhom || []).map((x) => so(x)).filter((x) => x.length === 4))];
  if (!nhom.length) throw new Error('không có nhóm 4 số hợp lệ');
  const nut4 = new Set(Object.keys(require('../data').taxData).filter((c) => /^\d{8}$/.test(c)).map((c) => c.slice(0, 4)));
  const co = nhom.filter((h) => nut4.has(h));
  const bo = nhom.filter((h) => !nut4.has(h));
  const nguon = {}; const ten = {}; const out = {}; const dk = {}; const phamViLG = {};
  for (const h of co) {
    const ct = doanChiTiet(h); const st = soTayNhom(h); const wco = wcoCuaNhom(h); const dks = dieuKhoanChamNhom(h);
    ten[h] = tenNhom(h);
    for (const d of ct) nguon[d.id] = d.vanBan;
    for (const d of wco) nguon[d.id] = d.vanBan;
    for (const x of dks) { dk[x.id] = x; nguon[x.id] = cat(x.nguyenVan, GIOI_HAN.dkToiDa); }
    const lgTat = langGieng(h, nut4);
    const lg = lgTat.slice(0, GIOI_HAN.langGiengToiDa);
    out[h] = {
      ct: ct.map((d) => d.id), st: st.map((d) => d.nhan), wco: wco.map((d) => ({ id: d.id, pn6: d.pn6 })),
      dk: dks.map((x) => x.id), langGieng: lg.map((x) => ({ ma: x.ma, loai: x.loai })), langGiengBiCat: lgTat.length - lg.length,
      chuaCoChuGiaiChiTiet: ct.length === 0,
    };
  }
  // Đoạn phạm vi của láng giềng ngoài danh sách nhóm giao: tên + tối đa 2 đoạn đầu của chú giải chi tiết (≤ 700 ký tự).
  for (const h of co) {
    for (const l of out[h].langGieng) {
      if (out[l.ma] || ten[l.ma]) continue;
      ten[l.ma] = tenNhom(l.ma);
      let n = 0; const ids = [];
      for (const d of doanChiTiet(l.ma)) {
        if (n >= GIOI_HAN.phamViLangGieng || ids.length >= 2) break;
        nguon[d.id] = cat(d.vanBan, GIOI_HAN.phamViLangGieng - n); n += nguon[d.id].length; ids.push(d.id);
      }
      phamViLG[l.ma] = ids;
    }
  }
  const goi = { khuon: KHUON, nhom: out, nhomThuTu: co, nhomKhongTonTai: bo, ten, nguon, phamViLangGieng: phamViLG };
  goi.dkThuTu = Object.keys(dk).sort();
  goi.dk = Object.fromEntries(goi.dkThuTu.map((id) => [id, { kieu: dk[id].kieu, dich: dk[id].dich || [], cap: dk[id].cap, gan: dk[id].gan }]));
  goi.cg2 = (co.some((h) => /^8[45]/.test(h)) ? chuGiai2PhanXVI() : []).filter((k) => co.some((h) => k.nhom.includes(h)));
  for (const k of goi.cg2) nguon[k.id] = k.vanBan;
  goi.bam = crypto.createHash('sha1').update(JSON.stringify({ n: goi.nhom, g: goi.nguon })).digest('hex').slice(0, 12);
  return goi;
}

/** Gói → văn bản cho Studio. Mỗi đoạn luật một dòng `[id] chữ`; id là thứ duy nhất được dùng làm `nguon`. */
function renderGoi(goi) {
  const L = [];
  L.push(`# GÓI SOẠN BẢN ĐỒ 4 SỐ (khuôn ${goi.khuon}, mã gói ${goi.bam}) — ${goi.nhomThuTu.length} nhóm: ${goi.nhomThuTu.join(', ')}`);
  L.push('Quy ước: mỗi đoạn luật có dạng `[id] nguyên văn`. `nguon` trong đầu ra CHỈ được là một id có trong gói; `trich` CHỈ được là chuỗi con nguyên văn của đúng đoạn đó.');
  L.push('Mỗi nhóm có DANH SÁCH LÁNG GIỀNG: `den` của cạnh CHỈ được là một mã trong danh sách đó. Nhóm ngoài danh sách giao thì không soạn.');
  L.push('');
  for (const h of goi.nhomThuTu) {
    const g = goi.nhom[h];
    L.push(`######## NHÓM ${h} ########`);
    L.push(`Tên VN: ${goi.ten[h].vi}`);
    L.push(`Tên EN: ${goi.ten[h].en}`);
    L.push('');
    L.push(`--- Chú giải chi tiết nhóm ${h}${g.chuaCoChuGiaiChiTiet ? ' (KHÔNG CÓ trong kho — chỉ soạn từ các nguồn còn lại, thiếu thì khongChac)' : ''}`);
    for (const id of g.ct) L.push(`[${id}] ${goi.nguon[id]}`);
    L.push('');
    L.push(`--- Điều khoản Chương / Phần chạm nhóm ${h} (nội dung ở mục ĐIỀU KHOẢN cuối gói): ${g.dk.length ? g.dk.join(' | ') : '(không có)'}`);
    L.push('');
    if (g.st.length) {
      L.push(`--- Gợi ý từ sổ tay nhóm ${h} (đã soạn trước; CHỈ là gợi ý, căn cứ phải trích từ đoạn có id ở trên / dưới)`);
      for (const s of g.st) L.push(`- ${s}`);
      L.push('');
    }
    if (g.wco.length) {
      L.push(`--- Ý kiến phân loại WCO thuộc nhóm ${h}`);
      for (const w of g.wco) L.push(`[${w.id}] (${w.pn6}) ${goi.nguon[w.id]}`);
      L.push('');
    }
    L.push(`--- DANH SÁCH LÁNG GIỀNG của ${h} (chỉ các mã này được làm \`den\`)${g.langGiengBiCat ? `; đã cắt ${g.langGiengBiCat} láng giềng điểm thấp` : ''}`);
    L.push(g.langGieng.length ? g.langGieng.map((l) => `${l.ma} [${l.loai.join(',')}]`).join('; ') : '(không có láng giềng trong bảng cạnh — hoSo vẫn soạn, canh = [])');
    L.push('');
  }
  L.push('######## ĐIỀU KHOẢN CHƯƠNG / PHẦN (id gốc) ########');
  for (const id of goi.dkThuTu) {
    const d = goi.dk[id];
    L.push(`[${id}] (${d.kieu}${d.dich.length ? `; dích: ${d.dich.join(',')}` : ''}) ${goi.nguon[id]}`);
  }
  if (goi.cg2.length) {
    L.push('');
    L.push('######## CHÚ GIẢI 2 PHẦN XVI (bộ phận máy Ch.84 / 85; nhóm cùng một khoản là láng giềng của nhau) ########');
    for (const k of goi.cg2) L.push(`[${k.id}] ${k.vanBan}`);
  }
  const ngoai = Object.keys(goi.phamViLangGieng).sort();
  if (ngoai.length) {
    L.push('');
    L.push('######## LÁNG GIỀNG NGOÀI DANH SÁCH GIAO (chỉ để so sánh; KHÔNG soạn hồ sơ cho các nhóm này) ########');
    for (const m of ngoai) {
      L.push(`== ${m}: ${goi.ten[m].vi} | ${goi.ten[m].en}`);
      for (const id of goi.phamViLangGieng[m]) L.push(`[${id}] ${goi.nguon[id]}`);
    }
  }
  return `${L.join('\n')}\n`;
}

// ───────────────────────────────────────── Cổng máy ─────────────────────────────────────────
const MA_LOI = {
  KHUON_SAI: 'Thiếu trường, trường sai kiểu, giá trị ngoài danh sách cho phép (kieuNhom, loai, quyTac).',
  NHOM_NGOAI_DANH_SACH: 'Nhóm không nằm trong danh sách nhóm giao của gói.',
  NGUON_KHONG_CO: '`nguon` không phải một id có trong gói.',
  TRICH_KHONG_NGUYEN_VAN: '`trich` không phải chuỗi con nguyên văn của đoạn mang id `nguon` (hoặc quá ngắn / quá dài).',
  DEN_NGOAI_LANG_GIENG: '`den` không nằm trong danh sách láng giềng của nhóm trong gói.',
  LIET_KE_MOT_CHUOI: 'Một mục gói cả danh sách ("A, B và C"). Mỗi ý một mục.',
  CANH_THIEU_CAN_CU: 'Cạnh không có `canCu` nào (hoặc mục canCu thiếu nguon / trich).',
  DAC_DIEM_LA_TEN_NHOM: '`dacDiem` chỉ chép lại chữ của tên nhóm; phải là đặc điểm quan sát / hỏi được ở hàng.',
  CANH_HAI_CHIEU_MAU_THUAN: 'Cạnh A→B và B→A cùng điều kiện nhưng chỉ về hai nhóm khác nhau.',
  THI_SAI: '`thi` / `thiKia` phải là một trong hai nhóm của cạnh và khác nhau.',
};
const CANH_BAO = { HO_SO_TRUC_TRONG: 'Trục hồ sơ bỏ trống (chucNang, coChe, dangVatLy, oDauAiDung, hangDuocNeu).' };

const TU_NOI = /[,;]|\s+(?:và|hoặc)\s+/;
/** Một chuỗi gói cả danh sách: ≥ 3 vế ngắn nối bằng dấu phẩy / chấm phẩy / "và" / "hoặc". */
function laListKeMotChuoi(s) {
  const t = chu(s);
  if (!t || t.length > 260) return false;
  const ve = t.split(TU_NOI).map((x) => x.trim()).filter(Boolean);
  return ve.length >= 3 && ve.every((v) => v.split(/\s+/).length <= 7);
}
const tuCua = (s) => khongDau(String(s)).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const TU_DUNG_BD = new Set(['la', 'va', 'hoac', 'cua', 'cho', 'de', 'co', 'khong', 'nhung', 'cac', 'nhom', 'loai', 'khac', 'hay', 'trong', 'voi', 'duoc', 'dung', 'cac', 'mot', 'nay', 'do', 'tu', 'tren', 'bang', 'khong', 'chua', 'tru', 'ngoai']);
/** Mọi từ có nghĩa của `dacDiem` nằm trong MỘT tên, hoặc một cụm 4 từ liên tiếp của nó chép từ tên. */
function dacDiemLaTenNhom(dacDiem, cacTen) {
  const t = tuCua(dacDiem);
  const noiDung = t.filter((x) => !TU_DUNG_BD.has(x));
  for (const ten of cacTen) {
    const tt = tuCua(ten); const tap = new Set(tt);
    if (noiDung.length >= 2 && noiDung.every((x) => tap.has(x))) return true;
    if (t.length >= 4) {
      const chuoi = ` ${tt.join(' ')} `;
      for (let i = 0; i + 4 <= t.length; i += 1) if (chuoi.includes(` ${t.slice(i, i + 4).join(' ')} `)) return true;
    }
  }
  return false;
}
const jaccard = (a, b) => {
  const x = new Set(tuCua(a).filter((w) => !TU_DUNG_BD.has(w))); const y = new Set(tuCua(b).filter((w) => !TU_DUNG_BD.has(w)));
  if (!x.size || !y.size) return 0;
  let g = 0; for (const w of x) if (y.has(w)) g += 1;
  return g / (x.size + y.size - g);
};

/** Lấy danh sách bản đồ nhóm từ nội dung tệp: object `{nhom,…}`, mảng, hoặc `{banDo: […]}`; chấp nhận văn bản có khối ```json. */
function docBanDo(vanBan) {
  const gom = (d) => (Array.isArray(d) ? d : d && Array.isArray(d.banDo) ? d.banDo : d && Array.isArray(d.nhomList) ? d.nhomList : d && typeof d === 'object' ? [d] : []);
  try { return gom(JSON.parse(vanBan)); } catch { /* thử khối ```json */ }
  const ra = [];
  for (const m of String(vanBan).matchAll(/```(?:json)?\s*([\s\S]*?)```/g)) { try { ra.push(...gom(JSON.parse(m[1]))); } catch { /* bỏ khối hỏng */ } }
  return ra;
}

function kiemMotBanDo(b, goi, loi, vang) {
  const nhom = so(b && b.nhom);
  const bao = (ma, muc, chiTiet) => loi.push({ ma, nhom, muc, chiTiet });
  const vangBao = (ma, muc, chiTiet) => vang.push({ ma, nhom, muc, chiTiet });
  if (nhom.length !== 4 || !goi.nhom[nhom]) { bao('NHOM_NGOAI_DANH_SACH', 'nhom', `nhóm "${b && b.nhom}" không có trong gói (${goi.nhomThuTu.join(', ')})`); return; }
  const g = goi.nhom[nhom];
  if (!KIEU_NHOM.includes(b.kieuNhom)) bao('KHUON_SAI', 'kieuNhom', `kieuNhom "${b.kieuNhom}" ngoài ${KIEU_NHOM.join('|')}`);
  const lgMa = new Set(g.langGieng.map((x) => x.ma));
  const tenNhomVi = goi.ten[nhom] ? [goi.ten[nhom].vi, goi.ten[nhom].en] : [];

  const kiemCanCu = (muc, nguon, trich) => {
    if (!chu(nguon) || !chu(trich)) { bao('CANH_THIEU_CAN_CU', muc, 'thiếu nguon hoặc trich'); return false; }
    if (!Object.prototype.hasOwnProperty.call(goi.nguon, nguon)) { bao('NGUON_KHONG_CO', muc, `nguon "${nguon}" không có trong gói`); return false; }
    if (String(trich).length > 600) { bao('TRICH_KHONG_NGUYEN_VAN', muc, `trich dài ${String(trich).length} ký tự (> 600)`); return false; }
    if (!trichNguyenVan(trich, goi.nguon[nguon])) { bao('TRICH_KHONG_NGUYEN_VAN', muc, `trich không là chuỗi con nguyên văn của [${nguon}]: "${cat(trich, 90)}"`); return false; }
    return true;
  };
  const kiemChuoi = (muc, v) => { if (laListKeMotChuoi(v)) vangBao('LIET_KE_MOT_CHUOI', muc, `"${cat(v, 90)}" gói một danh sách trong một chuỗi`); };

  if (!b.hoSo || typeof b.hoSo !== 'object') { bao('KHUON_SAI', 'hoSo', 'thiếu hoSo'); } else {
    for (const truc of TRUC_HO_SO) {
      const ds = b.hoSo[truc];
      if (!Array.isArray(ds)) { bao('KHUON_SAI', `hoSo.${truc}`, 'phải là mảng'); continue; }
      if (!ds.length && TRUC_CAN_CO.includes(truc)) vangBao('HO_SO_TRUC_TRONG', `hoSo.${truc}`, 'trục bỏ trống');
      ds.forEach((x, i) => {
        const muc = `hoSo.${truc}[${i}]`;
        const nhan = truc === 'hangDuocNeu' ? x && x.ten : x && x.y;
        if (!x || typeof x !== 'object' || !chu(nhan)) { bao('KHUON_SAI', muc, truc === 'hangDuocNeu' ? 'mục cần { ten, trich, nguon }' : 'mục cần { y, trich, nguon }'); return; }
        kiemChuoi(muc, nhan);
        kiemCanCu(muc, x.nguon, x.trich);
      });
    }
  }

  const canhs = Array.isArray(b.canh) ? b.canh : null;
  if (!canhs) bao('KHUON_SAI', 'canh', 'canh phải là mảng');
  (canhs || []).forEach((c, i) => {
    const muc = `canh[${i}]`;
    const den = so(c && c.den);
    if (!c || den.length !== 4) { bao('KHUON_SAI', muc, 'thiếu den (4 số)'); return; }
    if (!lgMa.has(den)) bao('DEN_NGOAI_LANG_GIENG', muc, `den ${den} không nằm trong láng giềng của ${nhom} (${[...lgMa].join(', ') || 'rỗng'})`);
    if (!LOAI_QUAN_HE.includes(c.loai)) bao('KHUON_SAI', muc, `loai "${c.loai}" ngoài ${LOAI_QUAN_HE.join('|')}`);
    if (!QUY_TAC.includes(c.quyTac)) bao('KHUON_SAI', muc, `quyTac "${c.quyTac}" ngoài ${QUY_TAC.join('|')}`);
    for (const k of ['dacDiem', 'neu', 'conNeu']) { if (!chu(c[k])) bao('KHUON_SAI', muc, `thiếu ${k}`); else kiemChuoi(`${muc}.${k}`, c[k]); }
    const thi = so(c.thi); const thiKia = so(c.thiKia);
    if (!(thi === nhom || thi === den) || !(thiKia === nhom || thiKia === den) || thi === thiKia) bao('THI_SAI', muc, `thi=${c.thi}, thiKia=${c.thiKia}; phải là {${nhom}, ${den}} và khác nhau`);
    if (chu(c.dacDiem)) {
      const tenDen = goi.ten[den] ? [goi.ten[den].vi, goi.ten[den].en] : [];
      // Đỏ khi dacDiem viện dẫn mã nhóm ("thuộc nhóm 42.02"): đó không phải đặc điểm của hàng. Chỉ trùng chữ với tên nhóm thì vàng —
      // tên nhóm luật thường CHÍNH là đặc điểm phân biệt (8301 "khóa mở bằng chìa, số hoặc điện"); soát chéo chấm lại.
      if (/nh[oó]m\s*\d{2}\.?\d{2}|\b\d{2}\.\d{2}\b/i.test(String(c.dacDiem))) bao('DAC_DIEM_LA_TEN_NHOM', muc, `dacDiem "${cat(c.dacDiem, 90)}" viện dẫn mã nhóm thay cho đặc điểm của hàng`);
      else if (dacDiemLaTenNhom(c.dacDiem, [...tenNhomVi, ...tenDen].filter(Boolean))) vangBao('DAC_DIEM_LA_TEN_NHOM', muc, `dacDiem "${cat(c.dacDiem, 90)}" chỉ lặp lại chữ trong tên nhóm ${nhom} hoặc ${den}`);
    }
    if (!Array.isArray(c.canCu) || !c.canCu.length) { bao('CANH_THIEU_CAN_CU', muc, 'canCu rỗng'); return; }
    c.canCu.forEach((cc, k) => kiemCanCu(`${muc}.canCu[${k}]`, cc && cc.nguon, cc && cc.trich));
  });
  if (!Array.isArray(b.khongChac)) bao('KHUON_SAI', 'khongChac', 'khongChac phải là mảng (có thể rỗng)');
  else b.khongChac.forEach((x, i) => { if (typeof x === 'string') kiemChuoi(`khongChac[${i}]`, x); });
}

const TU_PHU_DINH = new Set(['khong', 'chua', 'tru', 'ngoai', 'khac']);
// Có ≥1 chữ phủ định ⇒ vế phủ định ("không xốp và chưa gia cố" là MỘT vế phủ định, không phải phủ định kép).
const cucTinh = (s) => (tuCua(s).some((w) => TU_PHU_DINH.has(w) && w !== 'khac') ? 1 : 0);
/** Hai vế điều kiện "giống nhau": từ nội dung trùng ≥ 60% VÀ cùng cực tính (có / không). */
const giongDieuKien = (a, b) => jaccard(a, b) >= 0.6 && cucTinh(a) === cucTinh(b);

/** Mâu thuẫn hai chiều giữa các bản đồ (cùng tệp + bản đã nạp `them`). A→B nói X thì A, B→A nói X thì B. */
function kiemHaiChieu(tatCa, loi) {
  const canh = [];
  for (const b of tatCa) for (const c of Array.isArray(b && b.canh) ? b.canh : []) {
    const a = so(b.nhom); const d = so(c && c.den);
    if (a.length === 4 && d.length === 4 && chu(c.dacDiem)) canh.push({ a, d, c, i: b.canh.indexOf(c), moi: !b.__daNap, tep: b.__tep || null });
  }
  const dem = new Set();
  for (let i = 0; i < canh.length; i += 1) for (let j = i + 1; j < canh.length; j += 1) {
    const x = canh[i]; const y = canh[j];
    if (!(x.a === y.d && x.d === y.a)) continue;
    if (jaccard(x.c.dacDiem, y.c.dacDiem) < 0.6) continue;
    const thiX = so(x.c.thi); const thiY = so(y.c.thi); const kiaX = so(x.c.thiKia); const kiaY = so(y.c.thiKia);
    const song = giongDieuKien(x.c.neu, y.c.neu) && thiX && thiY && thiX !== thiY;
    const nguoc = giongDieuKien(x.c.neu, y.c.conNeu) && thiX && kiaY && thiX !== kiaY;
    if (song || nguoc) {
      const khoa = [x.a, x.d, i, j].join('|'); if (dem.has(khoa)) continue; dem.add(khoa);
      const ben = x.moi ? x : y; // ghi lỗi vào cạnh của bản MỚI (bản đã nạp giữ nguyên)
      loi.push({ ma: 'CANH_HAI_CHIEU_MAU_THUAN', nhom: ben.a, muc: `canh[${ben.i}]`, doiChieu: `${x.a}→${x.d} ↔ ${y.a}→${y.d}`, chiTiet: `"${cat(x.c.dacDiem, 60)}": ${x.a}→${x.d} nói "${cat(x.c.neu, 50)}" → ${thiX}, còn ${y.a}→${y.d} nói "${cat(song ? y.c.neu : y.c.conNeu, 50)}" → ${song ? thiY : kiaY}` });
    }
  }
}

/**
 * Cổng máy. `bangBanDo` = nội dung tệp Studio trả (đã `docBanDo`). `daNap` = các bản đã nạp (để bắt mâu thuẫn hai chiều xuyên nhóm).
 * @returns {{loi: object[], vang: object[], nhomXanh: string[], nhomDo: string[]}}
 */
function kiemBanDo(bangBanDo, goi, { daNap = [] } = {}) {
  const loi = []; const vang = [];
  const ds = Array.isArray(bangBanDo) ? bangBanDo : [];
  if (!ds.length) loi.push({ ma: 'KHUON_SAI', nhom: null, muc: 'tep', chiTiet: 'không đọc được bản đồ nào trong tệp' });
  for (const b of ds) kiemMotBanDo(b, goi, loi, vang);
  kiemHaiChieu([...daNap.map((b) => ({ ...b, __daNap: true })), ...ds], loi);
  // Lỗi ở MỘT mục (hoSo.<trục>[i]) hoặc MỘT cạnh (canh[i]…) chỉ bỏ mục / cạnh đó; lỗi ở cấp nhóm (nhom, kieuNhom, hoSo, canh, khongChac) làm đỏ cả nhóm.
  const MUC = /^(hoSo\.[a-zA-Z]+\[\d+\]|canh\[\d+\])/;
  const banSach = {}; const boMuc = {}; const nhomDoSet = new Set();
  for (const b of ds) {
    const h = so(b && b.nhom); if (h.length !== 4 || !goi.nhom[h]) continue;
    const cua = loi.filter((x) => x.nhom === h);
    if (cua.some((x) => !MUC.test(String(x.muc || '')))) { nhomDoSet.add(h); continue; }
    const bo = new Set(cua.map((x) => String(x.muc).match(MUC)[1]));
    const hoSo = {}; for (const t of TRUC_HO_SO) hoSo[t] = (b.hoSo[t] || []).filter((_, i) => !bo.has(`hoSo.${t}[${i}]`));
    const canh = (b.canh || []).filter((_, i) => !bo.has(`canh[${i}]`));
    if (!TRUC_HO_SO.some((t) => hoSo[t].length)) { nhomDoSet.add(h); continue; }
    banSach[h] = { ...b, hoSo, canh }; boMuc[h] = bo.size;
  }
  const nhomDo = [...nhomDoSet];
  const nhomXanh = Object.keys(banSach).filter((h) => !nhomDoSet.has(h));
  return { loi, vang, nhomXanh, nhomDo, banSach, boMuc };
}

// ───────────────────────────────────────── Tra ngược id đoạn → chữ gốc (cho lib/do-thi/dung-bang-canh.js, cạnh C16) ─────────────────────────────────────────
/**
 * Chữ GỐC (không cắt) của một id đoạn trong gói, hoặc [] nếu id không còn. Dùng để kiểm lại trích khi dựng bảng cạnh: gói chỉ cắt
 * ĐUÔI (dk, wco, phạm vi láng giềng) nên chuỗi con của bản cắt vẫn là chuỗi con của bản gốc.
 */
function vanBanTheoId(id) {
  const s = String(id || '');
  let m;
  if ((m = s.match(/^ct\.(\d{4})\.(\d+)$/))) { const d = doanChiTiet(m[1])[Number(m[2]) - 1]; return d ? [d.vanBan] : []; }
  if (s.startsWith('wco.')) {
    const ma = s.slice(4);
    try {
      const ops = docJson('wco-op', 'opinions.json'); const vi = WCO_VI();
      const o = ops.find((x) => x.id === ma);
      return o ? [chu(vi[o.line]?.vi), chu(o.text)].filter(Boolean) : [];
    } catch { return []; }
  }
  if (s.startsWith('px16.cg2.')) return chuGiai2PhanXVI().filter((k) => k.id === s).map((k) => k.vanBan);
  const dk = dieuKhoan().find((x) => x.id === s);
  return dk ? [dk.nguyenVan] : [];
}

module.exports = { tenNhom, vanBanTheoId, KHUON, KIEU_NHOM, LOAI_QUAN_HE, QUY_TAC, TRUC_HO_SO, MA_LOI, CANH_BAO, GIOI_HAN, taoGoi, renderGoi, kiemBanDo, docBanDo, trichNguyenVan, chuanHoa, laListKeMotChuoi, dacDiemLaTenNhom, langGieng, doanChiTiet };
