// lib/engine-doc-luat.js — M-52 (#1920): Động cơ phan_loai_hs đọc luật trước, kết luận sau (ADR-0004, ADR-0005).
//
// Khung nguyên tắc:
// - Chỉ đọc 6 kho luật gốc (phan, chuong, nhom, phan-nhom, sen, bieu) qua tim-luat (M-41) + phai-doc (M-34)
//   và ghi/kiểm Sổ ghi vết qua lib/so-vet (M-51). Khi chưa có M-33 (nghia-canh), M-36 (tom-tat), M-37 (tim-nghia)
//   thì ghi rõ vào thieuKho và dùng fallback cạnh NHAC dưới câu dẫn loại trừ.
// - KHÔNG nối vào api/, lib/classify*.js, lib/engine-loop.js; KHÔNG thêm biến môi trường HS_*;
//   KHÔNG biết tên mô hình; KHÔNG tự đổi hay chọn thay kết luận của LLM.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { timLuat, chuanChu, boDau } = require('./tim-luat');
const { phaiDoc } = require('./do-thi/phai-doc');
const { kiemTrichHopLe, laCanCuTienLe } = require('./cong-adr-0004');
const { normalizeRuleKey } = require('./gir');
const {
  taoSoVet,
  ghiBuoc,
  kiemSoVet,
  napNguonCau,
  layCanhKiemBatBuoc,
  chuanHoaTraLoiCanh,
} = require('./so-vet');

const THU_MUC_MAC_DINH = path.dirname(path.resolve(__dirname, '..', 'data', 'luat-goc', 'bieu.jsonl'));

const GIOI_HAN_MAC_DINH = Object.freeze({
  toiDaCumTim: 6,
  toiDaTimLai: 2,
  toiDaNhomLoc: 8,
  toiDaNhomDoc: 3,
  toiDaDocThem: 2,
  toiDaCauNhac: 2,
  kyTuMoiCauNhac: 220,
  cauMoiLuotKiem: 25,
  toiDaChuyenHuong: 5,
  toiDaQuayLui: 3,
  toiDaLuotLLM: 45,
  tranKyTuPrompt: 60000,
});

/** Chừa chỗ cho phần nhắc sửa bài ở lượt làm lại (lỗi + bài làm trước). */
const DU_TRU_SUA_BAI = 5000;
const KHACH_KHONG_NEU = 'KHACH_KHONG_NEU';

const KHO_THIEU_MAC_DINH = Object.freeze({
  NGHIA_CANH: 'M-33:nghia-canh',
  TOM_TAT: 'M-36:tom-tat',
  TIM_NGHIA: 'M-37:tim-nghia',
});

const BUOC_PHAI_DOC_LUAT = new Set([
  'TEN',
  'CHU_GIAI_PHAN',
  'CHU_GIAI_CHUONG',
  'CHU_GIAI_PHAN_CHUONG',
  'CHU_GIAI_PHAN_NHOM',
]);
const BUOC_PHAI_DOC_DAY_DU = new Set(['CHU_GIAI_NHOM', 'SEN']);

function so(v) {
  return String(v == null ? '' : v).replace(/\D/g, '');
}

function dinhDangMoTa(moTa) {
  if (typeof moTa === 'string') return moTa.trim();
  if (!moTa || typeof moTa !== 'object') return '';
  if (typeof moTa.moTa === 'string' && moTa.moTa.trim()) return moTa.moTa.trim();
  return [
    moTa.tenHang,
    moTa.chatLieu,
    moTa.congDung,
    moTa.chucNang,
    moTa.specs,
    moTa.customerDescription,
  ].filter((x) => typeof x === 'string' && x.trim()).join(' | ');
}

function chuanNutBieu(v) {
  const s = String(v || '').trim();
  if (!s) return null;
  if (s.startsWith('tb:')) return null;
  if (s.startsWith('bieu:')) {
    // "bieu:" rỗng hay thiếu số ("bieu:", "bieu:ab") phải bị loại, không được cho qua nguyên xi.
    const db = so(s.slice(5));
    return db.length >= 2 ? `bieu:${db}` : null;
  }
  const d = so(s);
  return d.length >= 2 ? `bieu:${d}` : null;
}

function parseJsonAnToan(raw) {
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  try {
    return JSON.parse(s);
  } catch {
    const m = /\{[\s\S]*\}|\[[\s\S]*\]/.exec(s);
    if (!m) return null;
    try { return JSON.parse(m[0]); } catch { return null; }
  }
}

/**
 * Đọc kho tóm tắt nút (M-36) từ `data/luat-goc/tom-tat/*.jsonl` hoặc map truyền sẵn qua kho.tomTat.
 */
function docTomTatNut(dir, tomTatOverride = null) {
  if (tomTatOverride instanceof Map) {
    return { coTep: tomTatOverride.size > 0, map: tomTatOverride };
  }
  if (tomTatOverride && typeof tomTatOverride === 'object') {
    const m = new Map();
    for (const [k, v] of Object.entries(tomTatOverride)) {
      if (k && !String(k).startsWith('tb:') && v && typeof v === 'object') m.set(k, v);
    }
    return { coTep: m.size > 0, map: m };
  }

  const tomTatDir = path.join(dir, 'tom-tat');
  if (!fs.existsSync(tomTatDir) || !fs.statSync(tomTatDir).isDirectory()) {
    return { coTep: false, map: new Map() };
  }
  const files = fs.readdirSync(tomTatDir).filter((f) => f.endsWith('.jsonl') && f !== 'thong-bao.jsonl').sort();
  if (!files.length) return { coTep: false, map: new Map() };

  const map = new Map();
  for (const f of files) {
    const lines = fs.readFileSync(path.join(tomTatDir, f), 'utf8').split('\n').filter((l) => l.trim());
    for (const l of lines) {
      let obj;
      try { obj = JSON.parse(l); } catch { continue; }
      if (!obj || !obj.nut || String(obj.nut).startsWith('tb:')) continue;
      map.set(obj.nut, obj);
    }
  }
  return { coTep: map.size > 0, map };
}

function kiemTrichMang(trichArr, nguonCau, daDuaCau = null) {
  if (!Array.isArray(trichArr) || trichArr.length === 0) {
    return { ok: false, lyDo: 'thiếu câu trích nguyên văn (trich)' };
  }
  const cacheMap = {};
  for (let i = 0; i < trichArr.length; i += 1) {
    const t = trichArr[i];
    const cauId = String(t?.cauId || '').trim();
    const doan = String(t?.doan || '').trim();
    if (!cauId || !doan) {
      return { ok: false, lyDo: `trich[${i}] thiếu cauId hoặc doan` };
    }
    if (cauId.startsWith('tb:') || laCanCuTienLe({ nguon: cauId })) {
      return { ok: false, lyDo: `cấm trích nguồn tiền lệ "${cauId}"` };
    }
    const goc = nguonCau.traCau(cauId);
    if (!goc) {
      return { ok: false, lyDo: `không tìm thấy cauId "${cauId}" trong kho luật gốc` };
    }
    if (daDuaCau && !daDuaCau.has(cauId)) {
      return { ok: false, lyDo: `trich[${i}] "${cauId}" là câu CHƯA được đưa cho đọc ở bước nào — chỉ trích câu đã đọc` };
    }
    cacheMap[cauId] = goc;
    const kt = kiemTrichHopLe({ nguon: cauId, trich: doan }, cacheMap);
    if (!kt.ok) {
      return { ok: false, lyDo: `trich[${i}] "${cauId}" không khớp nguyên văn (${kt.lyDo})` };
    }
  }
  return { ok: true, chuan: trichArr.map((t) => ({ cauId: String(t.cauId).trim(), doan: String(t.doan).trim() })) };
}

const chuGon = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const chuanSoSanh = (s) => chuGon(s).normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const nutCuaCau = (cauId) => {
  const i = String(cauId || '').lastIndexOf('#');
  return i > 0 ? cauId.slice(0, i) : String(cauId || '');
};
/** Nút dùng chung cho mọi nhóm cùng Phần / Chương: chỉ đưa một lần. */
const laNutChung = (nutId) => /^(?:phan:|chuong:|sen:phan:|sen:chuong:|gir:|bieu:\d{2}$)/.test(nutId);

/** Chữ khách phải có thật trong mô tả (từng mảnh cách nhau bởi … ; |). */
function kiemChuKhach(chuKhach, moTaKhach, { choPhepKhongNeu = false } = {}) {
  const s = chuGon(chuKhach);
  if (!s) return { ok: false, lyDo: 'thiếu chuKhach' };
  if (choPhepKhongNeu && s.toUpperCase() === KHACH_KHONG_NEU) return { ok: true };
  const goc = ` ${chuanSoSanh(moTaKhach)} `;
  const manh = s.split(/…|\.\.\.|[;|]/).map(chuanSoSanh).filter(Boolean);
  const sai = manh.find((m) => !goc.includes(` ${m} `));
  if (!manh.length || sai) return { ok: false, lyDo: `chuKhach "${(sai || s).slice(0, 80)}" không có nguyên văn trong mô tả khách` };
  return { ok: true };
}

/** Chuẩn tên quy tắc do LLM ghi → QT1 / QT3b / QT6, nhận dạng qua lib/gir.js (luật 6: mọi trích dẫn quy tắc đi qua gir.js); không nhận ra thì trả nguyên chữ. */
function chuanGir(v) {
  const s = chuGon(v);
  const k = normalizeRuleKey(s.replace(/quy\s*tắc|^qt/iu, 'gir'));
  return k ? `QT${k}` : s;
}

/**
 * Các nút phải đọc của một nút biểu theo đúng chuẩn kiemSoVet (M-51), giữ nguyên thứ tự trình tự đọc.
 * Nút HUONG_DAN cấp Phần/Chương chỉ vào khi có câu phải KIEM (`nutCoCanh`).
 */
function gomNutPhaiDoc(pd, nguonCau, { nutCoCanh = new Set() } = {}) {
  const ra = [];
  const daCo = new Set();
  const d = so(pd?.id);
  for (const step of pd?.trinhTu || []) {
    const laLuat = BUOC_PHAI_DOC_LUAT.has(step.buoc);
    const laNhomSen = BUOC_PHAI_DOC_DAY_DU.has(step.buoc) && d.length >= 4;
    if (!laLuat && !laNhomSen) continue;
    for (const m of step.muc || []) {
      const id = m.id || m.nut;
      if (!id || daCo.has(id) || String(id).startsWith('tb:')) continue;
      const batBuoc = laNhomSen || (m.lop === 'LUAT' && !(step.buoc === 'CHU_GIAI_PHAN_NHOM' && d.length < 6));
      if (!batBuoc && !nutCoCanh.has(id)) continue;
      daCo.add(id);
      const cauIds = nguonCau.cauTheoNut.get(id) || [id];
      ra.push({ id, buoc: step.buoc, lop: m.lop, trang: m.trang ?? null, batBuoc, cauIds });
    }
  }
  return ra;
}

function vanBanNut(nut, nguonCau) {
  const dong = nut.cauIds.map((cid) => `  - [${cid}] ${chuGon(nguonCau.traCau(cid))}`);
  return `* ${nut.id} (${nut.buoc}, ${nut.lop}${nut.trang != null ? `, tr.${nut.trang}` : ''})\n${dong.join('\n')}`;
}

/** Chia mục theo thứ tự thành các lượt ≤ tran ký tự (không cắt chữ) và ≤ toiDaCau câu phải kiểm. */
function chiaLuot(muc, { tran, toiDaCau = Infinity, coChu = (x) => x.chu.length + 1, soCau = () => 0 }) {
  const luot = [];
  let cur = null;
  for (const m of muc) {
    const n = coChu(m);
    const c = soCau(m);
    if (!cur || (cur.muc.length && (cur.kyTu + n > tran || cur.cau + c > toiDaCau))) {
      cur = { muc: [], kyTu: 0, cau: 0 };
      luot.push(cur);
    }
    cur.muc.push(m);
    cur.kyTu += n;
    cur.cau += c;
  }
  return luot.map((l) => l.muc);
}

/** Đoạn câu ≤ max ký tự quanh cụm tìm; cắt bằng "…" ở biên từ, chữ giữ nguyên văn. */
function doanNhac(cau, moc, max) {
  const s = chuGon(cau);
  if (s.length <= max) return { doan: s, nguyen: true };
  const thap = s.toLowerCase();
  let idx = -1;
  for (const m of moc) {
    const k = chuGon(m).toLowerCase();
    if (k && (idx = thap.indexOf(k)) >= 0) break;
  }
  if (idx < 0) idx = 0;
  let tu = Math.max(0, idx - Math.floor(max / 3));
  if (tu > 0) tu = s.indexOf(' ', tu) + 1;
  let den = Math.min(s.length, tu + max - 4);
  if (den < s.length) den = s.lastIndexOf(' ', den);
  return { doan: `${tu > 0 ? '… ' : ''}${s.slice(tu, den)}${den < s.length ? ' …' : ''}`, nguyen: false };
}

/**
 * Gom nhóm 4 số được câu luật nhắc tới. Câu chiều LOAI mà chỉ sang nhóm khác thì nhóm được chỉ cũng có mặt (chieu CHI_SANG).
 * Không chấm điểm, không xếp hạng.
 */
function rutNhom4TuKetQuaTimLuat(kqTim, ungVienMap, { phaiDocFn, thuMuc, tomTatMap, nguonCau, dichTheoCau, cum }) {
  const themNhom = (h4, ev) => {
    if (!/^\d{4}$/.test(h4) || h4 >= '9800') return; // Chương 98: mục riêng, không phải cửa vào phân loại
    const nutId = `bieu:${h4}`;
    let cur = ungVienMap.get(h4);
    if (!cur) {
      const pd = phaiDocFn(nutId, { thuMuc, dayDu: false });
      if (!pd) return;
      cur = { h4, id: nutId, ten: pd.ten || '', tomTat: tomTatMap.get(nutId) || null, chungCu: [] };
      ungVienMap.set(h4, cur);
    }
    const cu = cur.chungCu.find((x) => x.cauId === ev.cauId);
    if (!cu) cur.chungCu.push(ev);
  };

  // Cụm có dấu thì không nhận câu chỉ khớp khi bỏ dấu ("nhôm" ~ "nhóm"): đó là chữ khác, không phải câu nhắc tới hàng.
  const cumCoDau = boDau(chuanChu(cum)) !== chuanChu(cum);
  for (const it of Array.isArray(kqTim?.cuaVao) ? kqTim.cuaVao : []) {
    if (cumCoDau && /KHONG_DAU$/.test(it?.kieuKhop || '')) continue;
    if (!it || String(it.nut || '').startsWith('tb:') || it.lop === 'TIEN_LE') continue;
    const ev = { nut: it.nut, cauId: it.cauId, cau: chuGon(nguonCau.traCau(it.cauId) || it.cau), chieu: it.chieu, kho: it.kho, cum: [cum] };
    const mMa = /^(?:bieu|nhom|pn|sen):(\d{4,8})\b/.exec(it.nut || '');
    const h4Chinh = mMa ? mMa[1].slice(0, 4) : null;
    if (h4Chinh) themNhom(h4Chinh, ev);

    const dich = dichTheoCau.get(it.cauId) || [];
    if (it.chieu === 'LOAI') {
      // Câu loại trừ chỉ đường: nhóm được chỉ sang phải có mặt kèm chính câu đó.
      for (const d of dich) {
        if (d.h4 === h4Chinh) continue;
        themNhom(d.h4, { ...ev, chieu: 'CHI_SANG', tu: h4Chinh || it.nut, cum: [d.chu, cum] });
      }
    } else if (!h4Chinh) {
      for (const d of dich) themNhom(d.h4, { ...ev, cum: [d.chu, cum] });
    }
  }
}

/** Tối đa `toiDa` câu nhắc của một nhóm: ưu tiên kho biểu rồi nhóm; luôn chừa một chỗ cho câu loại trừ chỉ sang nhóm này. */
function chonCauNhac(u, { toiDa, max }) {
  // Tên nhóm 4 số → chú giải nhóm → dòng biểu sâu hơn (chỉ dùng khi thiếu, vì lộ cấp dưới) → Phần / Chương / SEN.
  const bac = (e) => (/^bieu:\d{4}$/.test(e.nut) ? 0 : String(e.nut).startsWith('nhom:') ? 1 : String(e.nut).startsWith('bieu:') ? 2 : 3);
  const xep = [...u.chungCu].sort((a, b) => bac(a) - bac(b)
    || Number(a.cau.length > max) - Number(b.cau.length > max)
    || (a.cauId < b.cauId ? -1 : 1));
  const ra = xep.slice(0, toiDa);
  const chiSang = xep.find((e) => e.chieu === 'CHI_SANG');
  if (chiSang && !ra.includes(chiSang)) ra[ra.length < toiDa ? ra.length : toiDa - 1] = chiSang;
  return ra.map((e) => ({ ...e, ...doanNhac(e.cau, e.cum, max) }));
}

const NHAN_CHIEU = Object.freeze({
  NHAC: 'NHAC',
  LOAI: 'LOAI: câu loại trừ hàng khỏi chính nhóm này',
});
const dongNhac = (e, u) => `  - [${e.cauId}|${nhanChieu(e)}] ${e.nguyen && chuGon(u.ten).includes(e.doan) ? '(chính tên nhóm)' : e.doan}`;
const nhanChieu = (e) => (e.chieu === 'CHI_SANG' ? `CHI_SANG: câu loại trừ của ${e.tu}, chỉ sang nhóm này` : (NHAN_CHIEU[e.chieu] || e.chieu));

function chuanHoaKetLuanLoi(trangThai, { bac = 0, ma = null, so: soVet, hoi = null, soLuotLLM, soKyTuDaDoc, thieuKho, thongKeBuoc, loiSo = [] }) {
  return { trangThai, bac, ma, so: soVet, hoi, soLuotLLM, soKyTuDaDoc, thieuKho, thongKeBuoc, loiSo };
}

/**
 * Động cơ đọc luật trước, kết luận sau.
 *
 * @param {object} opts
 * @param {string|object} opts.moTa     Mô tả hàng hoá gốc của khách
 * @param {Function} opts.goiLLM        Hàm (buoc, { prompt, schema, duLieu, nhietDo: 0 }) => JSON. Mô hình chỉ cần đọc `prompt` + `schema`;
 *                                      `duLieu` chỉ để bài kiểm giả lập, không chứa gì ngoài thứ đã có trong prompt.
 * @param {object} [opts.kho]           { thuMuc, timLuatFn, timNghiaFn, phaiDocFn, kiemSoVetFn, tomTat }
 * @param {object} [opts.gioiHan]       Ghi đè GIOI_HAN_MAC_DINH
 */
async function chayDocLuat({ moTa, goiLLM, kho = {}, gioiHan = {} } = {}) {
  if (typeof goiLLM !== 'function') {
    throw new Error('chayDocLuat() bắt buộc phải truyền hàm goiLLM(buoc, goi).');
  }
  const gh = { ...GIOI_HAN_MAC_DINH, ...(gioiHan || {}) };
  const dir = path.resolve(kho?.thuMuc || THU_MUC_MAC_DINH);
  const timLuatFn = kho?.timLuatFn || timLuat;
  const timNghiaFn = typeof kho?.timNghiaFn === 'function' ? kho.timNghiaFn : null;
  const phaiDocFn = kho?.phaiDocFn || phaiDoc;
  const kiemSoVetFn = kho?.kiemSoVetFn || kiemSoVet;

  const moTaKhach = dinhDangMoTa(moTa);
  const nguonCau = napNguonCau(dir);
  const tomTatRes = docTomTatNut(dir, kho?.tomTat || null);
  const traGon = (cid) => chuGon(nguonCau.traCau(cid));

  const thieuKho = [];
  if (!nguonCau.nghiaCanh?.coTep) thieuKho.push(KHO_THIEU_MAC_DINH.NGHIA_CANH);
  if (!tomTatRes.coTep) thieuKho.push(KHO_THIEU_MAC_DINH.TOM_TAT);
  if (!timNghiaFn) thieuKho.push(KHO_THIEU_MAC_DINH.TIM_NGHIA);

  const soVet = taoSoVet({ moTaKhach, nguon: { dongCo: 'engine-doc-luat', thieuKho: [...thieuKho] } });

  let soLuotLLM = 0;
  let soKyTuDaDoc = 0;
  const thongKeBuocMap = new Map();
  /** Câu / nút đã thật sự nằm trọn trong một prompt. daDoc của sổ chỉ lấy từ đây. */
  const daDuaCau = new Set();
  const daDuaNut = new Set();
  /** Câu luật LLM tự kê là có đề cập tới hàng (đã kiểm nguyên văn), theo cauId. */
  const cauDeCap = new Map();
  /** Câu kê khi DOC_THEM → nhóm đang đọc mà nó phục vụ. */
  const deCapThemCua = new Map();

  const muc = (buoc) => {
    let e = thongKeBuocMap.get(buoc);
    if (!e) {
      e = { buoc, soLuot: 0, soKyTu: 0, kyTuLonNhat: 0, soLuotChia: 0, biTraLai: [] };
      thongKeBuocMap.set(buoc, e);
    }
    return e;
  };
  const thongKeBuoc = () => [...thongKeBuocMap.values()];
  const ghiChia = (buoc, soLuot) => { if (soLuot > 1) muc(buoc).soLuotChia += soLuot - 1; };

  async function goiBuoc(buoc, payload) {
    if (soLuotLLM >= gh.toiDaLuotLLM) throw new Error(`VUOT_GIOI_HAN_LUOT_LLM:${gh.toiDaLuotLLM}`);
    const prompt = String(payload?.prompt || '');
    if (prompt.length > gh.tranKyTuPrompt) throw new Error(`PROMPT_VUOT_TRAN:${buoc}:${prompt.length}>${gh.tranKyTuPrompt}`);
    soLuotLLM += 1;
    soKyTuDaDoc += prompt.length;
    const e = muc(buoc);
    e.soLuot += 1;
    e.soKyTu += prompt.length;
    e.kyTuLonNhat = Math.max(e.kyTuLonNhat, prompt.length);
    const raw = await goiLLM(buoc, { ...payload, prompt, nhietDo: 0 });
    return parseJsonAnToan(raw);
  }

  const khoiMoTa = `MÔ TẢ KHÁCH: ${moTaKhach}`;
  const daDuaKhi = (nuts) => {
    for (const n of nuts) {
      daDuaNut.add(n.id);
      for (const c of n.cauIds) daDuaCau.add(c);
    }
  };
  /** Ngân sách chữ cho phần thân sau khi trừ khung lệnh, mô tả và chỗ sửa bài. */
  const nganSach = (...khung) => gh.tranKyTuPrompt - DU_TRU_SUA_BAI - khoiMoTa.length
    - khung.reduce((t, k) => t + String(k || '').length + 1, 0);

  /** Gọi một bước kèm kiểm; sai thì trả lại đúng bước đó, kèm lý do và bài làm trước, làm lại đúng một lần. */
  async function goiVaKiem(buoc, { dong, schema, duLieu }, kiemFn) {
    const prompt1 = [...dong.slice(0, -1).filter(Boolean), khoiMoTa, dong[dong.length - 1]].filter(Boolean).join('\n');
    const kq1 = await goiBuoc(buoc, { prompt: prompt1, schema, duLieu });
    const v1 = kiemFn(kq1);
    if (v1.ok) return { ok: true, duLieu: v1.duLieu || kq1 };
    muc(buoc).biTraLai.push(String(v1.loi).slice(0, 300));

    let sua = `LẦN TRƯỚC BỊ TRẢ LẠI VÌ: ${String(v1.loi).slice(0, 1500)}. Sửa đúng chỗ đó, phần còn lại giữ nguyên nếu vẫn đúng.`;
    const baiTruoc = kq1 ? JSON.stringify(kq1) : '';
    if (baiTruoc && baiTruoc.length + sua.length + prompt1.length + 40 <= gh.tranKyTuPrompt) sua += `\nBÀI LÀM TRƯỚC: ${baiTruoc}`;
    const kq2 = await goiBuoc(buoc, { prompt: `${prompt1}\n${sua}`, schema, duLieu });
    const v2 = kiemFn(kq2);
    if (v2.ok) return { ok: true, duLieu: v2.duLieu || kq2 };
    muc(buoc).biTraLai.push(String(v2.loi).slice(0, 300));
    return { ok: false, loi: v2.loi };
  }

  const ketQua = (trangThai, them) => chuanHoaKetLuanLoi(trangThai, {
    so: soVet, soLuotLLM, soKyTuDaDoc, thieuKho, thongKeBuoc: thongKeBuoc(), ...them,
  });
  const traKetQuaSoHong = (loiSo) => {
    soVet.loi = loiSo;
    return ketQua('SO_KHONG_DAT', { bac: 0, ma: null, hoi: null, loiSo });
  };

  /** Ghi HOI + KET_LUAN(DUNG_HOI), kiểm sổ, trả HOI. */
  const dungHoi = ({ bac, ma = null, nut = 'cua-vao', cungCap = [], trich = [], chuKhach, quyTacGir = 'QT1', daSoKhongChon = [], hoi }) => {
    const chung = { nut, cungCapDaThay: cungCap, daDoc: [], trich, chuKhach: chuKhach || moTaKhach || '(trống)', quyTacGir };
    ghiBuoc(soVet, { ...chung, loai: 'HOI', quyetDinh: { trangThai: 'DUNG_HOI', cauHoi: hoi.cauHoi }, daSoKhongChon });
    ghiBuoc(soVet, { ...chung, loai: 'KET_LUAN', quyetDinh: { trangThai: 'DUNG_HOI', maHs: ma || '' }, daSoKhongChon: [] });
    const kq = kiemSoVetFn(soVet, { thuMuc: dir, phaiDocFn });
    if (!kq.dat) return traKetQuaSoHong(kq.thieu);
    return ketQua('HOI', { bac, ma, hoi: { duKienThieu: [], haiNhanhPhanVan: [], ...hoi, bac } });
  };

  const DAN_CHU_KHACH = 'chuKhach phải chép nguyên văn từ MÔ TẢ KHÁCH (nhiều mảnh thì nối bằng "…").';
  const DAN_DE_CAP = 'cauDeCap: kê cauId mọi câu vừa đọc có đề cập tới hàng này (nhận, loại, định nghĩa, điều kiện), kèm y (nói gì về hàng); không chép lại câu. Không có thì để mảng rỗng. Các bước sau chỉ thấy lại những câu kê ở đây.';
  const SCHEMA_TRICH = [{ cauId: 'string', doan: 'string (nguyên văn)' }];

  /** LLM chỉ kê id câu + ý; nguyên văn do máy lấy từ kho (không bắt chép lại, không có chỗ chép sai). */
  const nhanCauDeCap = (arr) => {
    if (arr == null) return { ok: true, chuan: [] };
    if (!Array.isArray(arr)) return { ok: false, loi: 'cauDeCap phải là mảng' };
    const chuan = [];
    for (const x of arr) {
      const cauId = chuGon(typeof x === 'string' ? x : x?.cauId);
      if (!daDuaCau.has(cauId) || !traGon(cauId)) return { ok: false, loi: `cauDeCap: "${cauId}" không phải câu đã đưa cho đọc` };
      chuan.push({ cauId, doan: traGon(cauId), y: chuGon(x?.y) });
    }
    return { ok: true, chuan };
  };
  const luuCauDeCap = (ds) => {
    for (const x of ds || []) if (!cauDeCap.has(x.cauId)) cauDeCap.set(x.cauId, x);
  };
  /** Căn cứ chọn phải có ít nhất một câu ngoài lời 6 Quy tắc (tên nhóm, phân nhóm, chú giải…). */
  const chiCoGir = (ds) => ds.every((t) => t.cauId.startsWith('gir:'));
  const dongDeCap = (x) => `  - [${x.cauId}] ${x.doan}${x.y ? ` → ${x.y}` : ''}`;

  const kiemDeCap = (buoc) => (out) => {
    if (!out || typeof out !== 'object') return { ok: false, loi: `${buoc} không trả JSON hợp lệ` };
    const dc = nhanCauDeCap(out.cauDeCap);
    return dc.ok ? { ok: true, duLieu: { cauDeCap: dc.chuan } } : dc;
  };

  async function chay() {
    if (!moTaKhach) {
      ghiBuoc(soVet, {
        loai: 'VAO_CUA', nut: 'cua-vao', cungCapDaThay: [], daDoc: [], trich: [], chuKhach: '(trống)',
        quyetDinh: { trangThai: 'MO_TA_RONG' }, daSoKhongChon: [], quyTacGir: 'QT1',
      });
      return dungHoi({
        bac: 0,
        chuKhach: '(trống)',
        hoi: {
          cauHoi: 'Mô tả hàng hoá đang trống — vui lòng cung cấp tên hàng, chất liệu và công dụng.',
          duKienThieu: ['tên hàng', 'chất liệu', 'công dụng'],
          lyDo: 'MO_TA_RONG',
        },
      });
    }

    // ── BƯỚC 1: VAO_CUA ─────────────────────────────────────────────────────────────────────────────────────────
    const vaoCuaRes = await goiVaKiem('VAO_CUA', {
      dong: [
        'BƯỚC VAO_CUA: đọc mô tả khách (KHÔNG đoán mã, KHÔNG nêu nhóm).',
        'banChat: từng ý về bản chất hàng (là gì, vật liệu, chức năng, dùng cho máy / hàng nào, dạng và trạng thái). ' + DAN_CHU_KHACH,
        'chuaBiet: dữ kiện khách chưa nêu mà có thể đổi cách phân loại.',
        `cumTim: 1–${gh.toiDaCumTim} cụm NGẮN (2–4 từ) để tìm CHỮ trong biểu thuế và chú giải: tên hàng và tên gọi khái quát hơn, vật liệu + dạng, công dụng, hàng mà nó là bộ phận. Mọi từ trong một cụm phải cùng nằm trong một câu luật mới tìm ra, nên cụm dài sẽ rỗng.`,
        null,
      ],
      schema: { banChat: [{ y: 'string', chuKhach: 'string' }], chuaBiet: ['string'], cumTim: ['string'] },
      duLieu: { moTaKhach },
    }, (out) => {
      if (!out || typeof out !== 'object') return { ok: false, loi: 'VAO_CUA không trả JSON hợp lệ' };
      const cumTim = Array.isArray(out.cumTim) ? out.cumTim.map(chuGon).filter((x) => x.length >= 2) : [];
      const banChat = Array.isArray(out.banChat) ? out.banChat.filter((x) => x && x.y && x.chuKhach) : [];
      if (!banChat.length) return { ok: false, loi: 'VAO_CUA thiếu banChat kèm chuKhach nguyên văn' };
      for (const b of banChat) {
        const kt = kiemChuKhach(b.chuKhach, moTaKhach);
        if (!kt.ok) return { ok: false, loi: `VAO_CUA banChat: ${kt.lyDo}` };
      }
      if (!cumTim.length) return { ok: false, loi: 'VAO_CUA thiếu cumTim (cần ít nhất 1 cụm ≥ 2 ký tự)' };
      return { ok: true, duLieu: { ...out, banChat, cumTim: cumTim.slice(0, gh.toiDaCumTim) } };
    });
    if (!vaoCuaRes.ok) return traKetQuaSoHong([vaoCuaRes.loi]);
    const vaoCua = vaoCuaRes.duLieu;
    const chuKhachVao = vaoCua.banChat.map((x) => x.chuKhach).join('; ');
    const khoiBanChat = `BẢN CHẤT HÀNG (đã ghi ở VAO_CUA): ${vaoCua.banChat.map((x) => `${chuGon(x.y)} ("${chuGon(x.chuKhach)}")`).join(' | ')}`;

    const dichTheoCau = new Map();
    for (const e of nguonCau.doThiNhac?.canh || []) {
      const m = /^bieu:(\d{4})/.exec(e.den || '');
      if (!m) continue;
      let a = dichTheoCau.get(e.tu);
      if (!a) { a = []; dichTheoCau.set(e.tu, a); }
      if (!a.some((x) => x.h4 === m[1])) a.push({ h4: m[1], chu: e.trich || '' });
    }
    const ungVienMap = new Map();
    const cumDaTim = [];
    const chayTimCum = (dsCum) => {
      for (const cum of dsCum.slice(0, gh.toiDaCumTim)) {
        const kq = timLuatFn(cum, { thuMuc: dir, limit: 15, timNghia: timNghiaFn });
        const truoc = ungVienMap.size;
        rutNhom4TuKetQuaTimLuat(kq, ungVienMap, { phaiDocFn, thuMuc: dir, tomTatMap: tomTatRes.map, nguonCau, dichTheoCau, cum });
        cumDaTim.push({ cum, soCau: Array.isArray(kq?.cuaVao) ? kq.cuaVao.length : 0, nhomMoi: ungVienMap.size - truoc });
      }
    };
    chayTimCum(vaoCua.cumTim);
    ghiBuoc(soVet, {
      loai: 'VAO_CUA', nut: 'cua-vao', cungCapDaThay: [], daDoc: [], trich: [], chuKhach: chuKhachVao,
      quyetDinh: { trangThai: ungVienMap.size ? 'MO_CUA' : 'TIM_RONG', banChat: vaoCua.banChat, chuaBiet: vaoCua.chuaBiet || [], cumTim: cumDaTim },
      daSoKhongChon: [], quyTacGir: 'QT1',
    });
    const hoiTimRong = (lyDo) => dungHoi({
      bac: 0,
      hoi: {
        cauHoi: 'Không tìm thấy nhóm luật nào nhắc tới cụm từ mô tả hàng — vui lòng nêu rõ tên gọi thông thường, vật liệu cấu tạo và công dụng của hàng.',
        duKienThieu: Array.isArray(vaoCua.chuaBiet) && vaoCua.chuaBiet.length ? vaoCua.chuaBiet : ['tên hàng', 'vật liệu', 'công dụng'],
        lyDo,
      },
    });
    if (ungVienMap.size === 0) return hoiTimRong('TIM_RONG');

    // ── BƯỚC 2: LOC (nhiều nhóm, mỗi nhóm tên + ≤ 2 câu nhắc → giữ ≤ 8) rồi CHON_UNG_VIEN (≤ 8 nhóm kèm tóm tắt → đọc kỹ ≤ 3) ──
    let soLanTimLai = 0;

    const chuLoc = (u) => {
      const cn = chonCauNhac(u, { toiDa: gh.toiDaCauNhac, max: gh.kyTuMoiCauNhac });
      return {
        u,
        cauNhac: cn,
        chu: [`* ${u.h4} | ${u.ten}`, ...cn.map((e) => dongNhac(e, u))].join('\n'),
      };
    };
    const chiDuaPhanChuong = (cau) => {
      const ds = (cau || []).map(nutCuaCau);
      return ds.length > 0 && ds.every(laNutChung);
    };
    const chuChon = (gon) => (u, dsCung) => {
      const tt = u.tomTat;
      const cung = new Set(dsCung.map((x) => x.h4));
      const khoi = [`■ ${u.h4} | ${u.ten}`];
      if (tt) {
        const gom = gon ? [] : (tt.gom || []).filter((x) => !chiDuaPhanChuong(x.cau));
        const khongGom = tt.khongGom || [];
        const tach = (tt.tachVoi || []).filter((x) => so(x.voi).slice(0, 4) !== u.h4 && cung.has(so(x.voi).slice(0, 4)));
        khoi.push('  tóm tắt(BO_TRO, không phải luật):');
        const nguon = (x) => ((x.cau || []).length ? ` [${x.cau.join(', ')}]` : '');
        for (const x of gom) khoi.push(`  gồm: ${chuGon(x.y)}${nguon(x)}`);
        for (const x of khongGom) khoi.push(`  không gồm: ${chuGon(x.y)}${(x.den || []).length ? ` → ${x.den.join(', ')}` : ''}${nguon(x)}`);
        for (const x of tach) khoi.push(`  tách với ${so(x.voi).slice(0, 4)}: ${chuGon(x.y)}${nguon(x)}`);
      } else if (tomTatRes.coTep) {
        const t = `${KHO_THIEU_MAC_DINH.TOM_TAT}:${u.h4}`;
        if (!thieuKho.includes(t)) thieuKho.push(t);
      }
      const cn = chonCauNhac(u, { toiDa: tt ? gh.toiDaCauNhac : 4, max: tt ? gh.kyTuMoiCauNhac : 600 });
      for (const e of cn) khoi.push(dongNhac(e, u));
      return { u, cauNhac: cn, chu: khoi.join('\n') };
    };

    /** Một vòng giữ/bỏ: chia lượt theo nhóm khi vượt trần, mỗi lượt một bước LOC trong sổ. */
    async function vongGiu(buoc, ds, { toiDa, dungMuc, lenh, choPhepTimLai, trangThai }) {
      const schema = {
        hanhDong: choPhepTimLai ? 'GIU | TIM_LAI | HOI' : 'GIU | HOI',
        nhomGiu: ['string 4 số'],
        boQua: [{ lyDo: 'string', nhom: ['string 4 số'], ...(buoc === 'CHON_UNG_VIEN' ? { cau: ['cauId của ý / câu làm lý do'] } : {}) }],
        cumTim: ['string (khi TIM_LAI)'],
        cauHoi: 'string (khi HOI)',
        duKienThieu: ['string (khi HOI)'],
      };
      const luotChia = chiaLuot(dungMuc(ds), { tran: nganSach(lenh(1, 99, 99), khoiBanChat) });
      ghiChia(buoc, luotChia.length);
      const giu = [];
      for (let li = 0; li < luotChia.length; li += 1) {
        const luot = luotChia[li];
        const ids = luot.map((x) => x.u.h4);
        const tap = new Set(ids);
        const res = await goiVaKiem(buoc, {
          dong: [lenh(luot.length, li + 1, luotChia.length), khoiBanChat, luot.map((x) => x.chu).join('\n')],
          schema,
          duLieu: {
            ungVien: luot.map((x) => ({ h4: x.u.h4, id: x.u.id, ten: x.u.ten, cauNhac: x.cauNhac.map((e) => ({ cauId: e.cauId, chieu: e.chieu, doan: e.doan })) })),
            choPhepTimLai,
            luot: li + 1,
            tongLuot: luotChia.length,
          },
        }, (out) => {
          if (!out || typeof out !== 'object') return { ok: false, loi: `${buoc} không trả JSON hợp lệ` };
          const hd = String(out.hanhDong || '').trim().toUpperCase();
          if (hd === 'TIM_LAI') {
            if (!choPhepTimLai) return { ok: false, loi: `đã hết lượt TIM_LAI tối đa (${gh.toiDaTimLai} lần)` };
            const cum = Array.isArray(out.cumTim) ? out.cumTim.map(chuGon).filter((x) => x.length >= 2) : [];
            if (!cum.length) return { ok: false, loi: 'TIM_LAI thiếu cumTim' };
            return { ok: true, duLieu: { ...out, hanhDong: 'TIM_LAI', cumTim: cum.slice(0, gh.toiDaCumTim) } };
          }
          if (hd === 'HOI') {
            if (!chuGon(out.cauHoi)) return { ok: false, loi: 'HOI thiếu cauHoi' };
            return { ok: true, duLieu: { ...out, hanhDong: 'HOI' } };
          }
          if (hd !== 'GIU' && hd !== 'DOC_KY') return { ok: false, loi: `hanhDong "${hd}" không hợp lệ ở ${buoc}` };
          const h4s = (v) => (Array.isArray(v) ? v : [v]).map((x) => so(x).slice(0, 4)).filter((x) => x.length === 4);
          const chon = [...new Set(h4s(out.nhomGiu || out.nhomChon || []))];
          if (chon.length > toiDa) return { ok: false, loi: `${buoc}: giữ tối đa ${toiDa} nhóm, đang giữ ${chon.length}` };
          if (!chon.length && luotChia.length === 1) return { ok: false, loi: `${buoc}: phải giữ ít nhất 1 nhóm, hoặc TIM_LAI / HOI` };
          const bo = (Array.isArray(out.boQua) ? out.boQua : [])
            .map((x) => ({
              lyDo: chuGon(x?.lyDo),
              nhom: [...new Set(h4s(x?.nhom || []))],
              cau: (Array.isArray(x?.cau) ? x.cau : []).map(chuGon).filter((c) => nguonCau.traCau(c)),
            }))
            .filter((x) => x.nhom.length);
          const tapBo = new Set(bo.filter((x) => x.lyDo.length >= 6).flatMap((x) => x.nhom));
          const ngoai = [...chon, ...bo.flatMap((x) => x.nhom)].filter((h) => !tap.has(h));
          if (ngoai.length) return { ok: false, loi: `${buoc}: nhóm ngoài danh sách đang xét: ${[...new Set(ngoai)].join(', ')}` };
          const trung = chon.filter((h) => tapBo.has(h));
          if (trung.length) return { ok: false, loi: `${buoc}: vừa giữ vừa bỏ: ${trung.join(', ')}` };
          const thieu = ids.filter((h) => !chon.includes(h) && !tapBo.has(h));
          if (thieu.length) return { ok: false, loi: `${buoc}: thiếu giải thích vì sao bỏ nhóm còn lại: ${thieu.join(', ')}` };
          return { ok: true, duLieu: { hanhDong: 'GIU', giu: chon, boQua: bo } };
        });
        if (!res.ok) return { loi: res.loi };
        if (res.duLieu.hanhDong !== 'GIU') return res.duLieu;
        giu.push(...res.duLieu.giu);
        for (const x of luot) for (const e of x.cauNhac) if (e.nguyen) daDuaCau.add(e.cauId);
        ghiLoc({ ids, luot, giu: res.duLieu.giu, boQua: res.duLieu.boQua, trangThai, luotSo: li + 1, tongLuot: luotChia.length });
      }
      return { hanhDong: 'GIU', giu };
    }

    function ghiLoc({ ids, luot, giu, boQua, trangThai, luotSo = 1, tongLuot = 1 }) {
      const tapGiu = new Set(giu);
      ghiBuoc(soVet, {
        loai: 'LOC',
        nut: 'cua-vao',
        cungCapDaThay: ids.map((h) => `bieu:${h}`),
        daDoc: [...new Set(luot.flatMap((x) => x.cauNhac.filter((e) => e.nguyen).map((e) => e.cauId)))],
        trich: luot.filter((x) => tapGiu.has(x.u.h4)).flatMap((x) => x.cauNhac.map((e) => ({ cauId: e.cauId, doan: e.doan }))).filter((t) => t.doan.length >= 6),
        chuKhach: chuKhachVao,
        quyetDinh: { trangThai, giu: giu.map((h) => `bieu:${h}`), boQua: boQua.map((x) => ({ lyDo: x.lyDo, nhom: x.nhom.map((h) => `bieu:${h}`), ...(x.cau?.length ? { cau: x.cau } : {}) })), luot: luotSo, tongLuot },
        daSoKhongChon: boQua.flatMap((x) => x.nhom.map((h) => ({ nut: `bieu:${h}`, viSaoKhongChon: x.lyDo }))),
        quyTacGir: 'QT1',
      });
    }

    const theoMa = (a, b) => (a.h4 < b.h4 ? -1 : 1);

    /** LOC → CHON_UNG_VIEN trên một tập nhóm. Trả {nhomChon} | {loi} | {hoi}. Nhóm đã xét xong ở lần trước không bị LOC lại. */
    async function locVaChon(dsDau, { choTim = true } = {}) {
      let ds = [...dsDau].sort(theoMa);
      let daGhiLoc = false;
      while (true) {
        // LOC cho tới khi còn ≤ 8
        let timLai = null;
        while (ds.length > gh.toiDaNhomLoc) {
          const choPhep = choTim && soLanTimLai < gh.toiDaTimLai;
          const kq = await vongGiu('LOC', ds, {
            toiDa: gh.toiDaNhomLoc,
            dungMuc: (x) => x.map(chuLoc),
            choPhepTimLai: choPhep,
            trangThai: 'LOC_GIU',
            lenh: (n, li, tong) => [
              `BƯỚC LOC (lượt ${li}/${tong}): dưới đây là ${n} nhóm 4 số có câu luật nhắc tới cụm tìm, xếp theo số nhóm, KHÔNG phải xếp hạng. Mỗi nhóm chỉ có tên và tối đa ${gh.toiDaCauNhac} câu nhắc.`,
              `Giữ tối đa ${gh.toiDaNhomLoc} nhóm có thể chứa hàng này để đọc tiếp (hanhDong GIU, nhomGiu). Chưa chắc thì GIỮ; chỉ bỏ nhóm mà tên nhóm đã cho thấy là hàng khác, vật liệu khác, công dụng khác.`,
              'CHI_SANG nghĩa là câu loại trừ của nhóm khác chỉ hàng sang nhóm này; LOAI nghĩa là câu loại hàng khỏi chính nhóm này.',
              'Mọi nhóm bỏ phải nằm trong boQua, gộp theo lý do: [{lyDo, nhom:["7301","7302"]}]. Không được sót nhóm nào.',
              choPhep ? 'Nếu không nhóm nào hợp: TIM_LAI kèm cumTim mới. Nếu mô tả không đủ để biết hàng là gì: HOI.' : 'Nếu mô tả không đủ để biết hàng là gì: HOI.',
            ].join('\n'),
          });
          if (kq.loi) return kq;
          if (kq.hanhDong === 'TIM_LAI') { timLai = kq; break; }
          if (kq.hanhDong === 'HOI') return { hoi: kq };
          const tapGiu = new Set(kq.giu);
          const moi = ds.filter((u) => tapGiu.has(u.h4));
          daGhiLoc = true;
          if (moi.length === 0) return { rong: true };
          if (moi.length === ds.length) return { loi: `LOC không thu hẹp được ${ds.length} nhóm` };
          ds = moi;
        }

        // CHON_UNG_VIEN cho tới khi còn ≤ 3
        let muCapGon = 0;
        while (!timLai) {
          if (!daGhiLoc) {
            // ≤ 8 nhóm ngay từ đầu: không cần lượt LOC, ghi sổ giữ hết.
            daGhiLoc = true;
            ghiLoc({ ids: ds.map((u) => u.h4), luot: ds.map(chuLoc), giu: ds.map((u) => u.h4), boQua: [], trangThai: 'GIU_HET' });
            for (const u of ds) for (const e of chuLoc(u).cauNhac) if (e.nguyen) daDuaCau.add(e.cauId);
          }
          const choPhep = choTim && soLanTimLai < gh.toiDaTimLai;
          const gon = muCapGon > 0;
          const kq = await vongGiu('CHON_UNG_VIEN', ds, {
            toiDa: gh.toiDaNhomDoc,
            dungMuc: (x) => x.map((u) => chuChon(gon)(u, x)),
            choPhepTimLai: choPhep,
            trangThai: 'CHON_DOC_KY',
            lenh: (n, li, tong) => [
              `BƯỚC CHON_UNG_VIEN (lượt ${li}/${tong}): ${n} nhóm còn lại, kèm tóm tắt rút từ chú giải (bổ trợ, KHÔNG phải luật) và câu nhắc.`,
              `Chọn 1..${gh.toiDaNhomDoc} nhóm để ĐỌC KỸ nguyên văn chú giải (hanhDong GIU, nhomGiu). Chưa phải kết luận: nhóm chọn sẽ được đọc chú giải và soát loại trừ ở bước sau.`,
              'Các nhóm không chọn phải nằm trong boQua [{lyDo, nhom:[...]}], lý do nêu rõ khác ở đâu, kèm cau (cauId trong ngoặc vuông của ý làm lý do, nếu có). Không được sót nhóm nào.',
              choPhep ? `Nếu không nhóm nào hợp: TIM_LAI kèm cumTim mới (còn ${gh.toiDaTimLai - soLanTimLai} lượt). Thiếu dữ kiện: HOI.` : '(đã hết lượt tìm lại, phải GIU hoặc HOI)',
            ].join('\n'),
          });
          if (kq.loi) return kq;
          if (kq.hanhDong === 'TIM_LAI') { timLai = kq; break; }
          if (kq.hanhDong === 'HOI') return { hoi: kq };
          if (!kq.giu.length) return { rong: true };
          if (kq.giu.length <= gh.toiDaNhomDoc) return { nhomChon: kq.giu };
          // Nhiều lượt cộng lại vẫn > 3: vòng nữa; không hẹp thêm thì bỏ phần "gồm" (giữ câu loại, câu nhắc).
          const tapGiu = new Set(kq.giu);
          const moi = ds.filter((u) => tapGiu.has(u.h4));
          if (moi.length === ds.length) {
            if (muCapGon) return { loi: `CHON_UNG_VIEN không thu hẹp được ${ds.length} nhóm` };
            muCapGon = 1;
          }
          ds = moi;
        }

        // TIM_LAI: chỉ nhóm mới + nhóm đang giữ vào LOC tiếp
        soLanTimLai += 1;
        const truoc = new Set(ungVienMap.keys());
        chayTimCum(timLai.cumTim);
        const moi = [...ungVienMap.values()].filter((u) => !truoc.has(u.h4));
        ghiBuoc(soVet, {
          loai: 'VAO_CUA', nut: 'cua-vao', cungCapDaThay: [], daDoc: [], trich: [], chuKhach: chuKhachVao,
          quyetDinh: { trangThai: 'TIM_LAI', cumTim: cumDaTim.slice(-timLai.cumTim.length), nhomMoi: moi.map((u) => u.id) },
          daSoKhongChon: [], quyTacGir: 'QT1',
        });
        ds = [...ds, ...moi].sort(theoMa);
      }
    }

    const chonUv = await locVaChon([...ungVienMap.values()]);
    if (chonUv.loi) return traKetQuaSoHong([chonUv.loi]);
    if (chonUv.rong) return hoiTimRong('KHONG_NHOM_NAO_HOP');
    if (chonUv.hoi) {
      return dungHoi({
        bac: 0,
        cungCap: [],
        hoi: { cauHoi: chonUv.hoi.cauHoi, duKienThieu: Array.isArray(chonUv.hoi.duKienThieu) ? chonUv.hoi.duKienThieu : [] },
      });
    }

    // ── BƯỚC 3: đọc kỹ + KIEM ──────────────────────────────────────────────────────────────────────────────────
    const daBiLoai = new Map();
    const daKiemNhom = new Set();
    const pdNhomCache = new Map();
    const nhomSong = [];
    const traLoiChung = new Map();
    let soLanChuyenHuong = 0;

    const canCuBatBuoc = (pd) => gomNutPhaiDoc(pd, nguonCau).flatMap((n) => n.cauIds);

    const docVaKiemMotNhom = async (h4) => {
      daKiemNhom.add(h4);
      const nutNhom = `bieu:${h4}`;
      const pd = phaiDocFn(nutNhom, { thuMuc: dir, dayDu: true });
      if (!pd) return { trangThai: 'KHONG_CO_NUT' };
      pdNhomCache.set(h4, pd);

      const canhTheoCau = new Map();
      for (const c of layCanhKiemBatBuoc(pd, nguonCau).canh) {
        let g = canhTheoCau.get(c.cauId);
        if (!g) {
          g = { cauId: c.cauId, tuNut: c.tuNut, cau: traGon(c.cauId), cacDich: [], dieuKien: nguonCau.nghiaCanh?.coTep ? (c.dieuKien || '') : '' };
          canhTheoCau.set(c.cauId, g);
        }
        if (!g.cacDich.includes(c.nutDich)) g.cacDich.push(c.nutDich);
      }
      const nutCoCanh = new Set([...canhTheoCau.values()].map((g) => g.tuNut));
      const nutTatCa = gomNutPhaiDoc(pd, nguonCau, { nutCoCanh });
      const nutMoi = nutTatCa.filter((n) => !daDuaNut.has(n.id));
      const tapMoi = new Set(nutMoi.map((n) => n.id));

      // Câu chung Phần/Chương đã trả lời KHONG cho chính hàng này thì dùng lại; câu THOA phải hỏi lại đúng cho nhóm này.
      const kiemCanhTong = [];
      const hoiLai = [];
      const cauTheoNutMoi = new Map();
      for (const g of canhTheoCau.values()) {
        if (tapMoi.has(g.tuNut)) {
          if (!cauTheoNutMoi.has(g.tuNut)) cauTheoNutMoi.set(g.tuNut, []);
          cauTheoNutMoi.get(g.tuNut).push(g);
          continue;
        }
        const cu = traLoiChung.get(g.cauId);
        if (cu && cu.ketQua === 'KHONG') kiemCanhTong.push({ ...cu, gopTheoCau: true, dungLaiTu: cu.nut });
        else hoiLai.push(g);
      }

      const dongCau = (g) => `  ? [${g.cauId}] → ${g.cacDich.join(', ')}${g.dieuKien ? ` | điều kiện: ${g.dieuKien}` : ''}`;
      const dongDan = (g) => {
        const dan = nguonCau.danTheoCau.get(g.cauId);
        return dan && !tapMoi.has(nutCuaCau(dan)) ? `    (dưới câu dẫn [${dan}] ${traGon(dan)})` : '';
      };
      const mucDoc = [];
      for (const n of nutMoi) {
        const cau = cauTheoNutMoi.get(n.id) || [];
        const than = vanBanNut(n, nguonCau);
        for (let k = 0; k === 0 || k < cau.length; k += gh.cauMoiLuotKiem) {
          const lo = cau.slice(k, k + gh.cauMoiLuotKiem);
          mucDoc.push({ nut: n, cau: lo, chu: [than, ...lo.flatMap((g) => [dongCau(g), dongDan(g)]).filter(Boolean)].join('\n') });
        }
      }
      for (const g of hoiLai) {
        mucDoc.push({ nut: null, cau: [g], chu: [`* ${g.tuNut} (đã đưa ở nhóm trước; hỏi lại cho ${nutNhom})`, `  - [${g.cauId}] ${g.cau}`, dongCau(g), dongDan(g)].filter(Boolean).join('\n') });
      }

      const tenNhom = `NHÓM ĐANG ĐỌC: ${nutNhom} — ${pd.ten || ''}`;
      const lenh = (li, tong, n) => [
        `BƯỚC KIEM (${nutNhom}, lượt ${li}/${tong}): đọc nguyên văn các nút luật dưới đây. Dòng "? [cauId] → đích" là câu loại trừ / dẫn sang nơi khác phải trả lời (${n} câu).`,
        'kiemCanh: với MỖI câu có dấu "?", trả ketQua cho ĐÚNG HÀNG NÀY: THOA = hàng rơi đúng vào câu đó nên bị loại khỏi nhóm đang đọc và sang đích; KHONG = hàng không thuộc điều câu nói; CHUA_BIET = chỉ khi hàng có thể rơi vào câu đó và thiếu đúng một dữ kiện khách chưa nêu.',
        `${DAN_CHU_KHACH} Khách không nêu gì liên quan thì ghi chuKhach = "${KHACH_KHONG_NEU}" (không dùng cho THOA).`,
        'Có THOA: ghi chuyenHuong {nutDich (một trong các đích của câu đó), trich, lyDo}. Có CHUA_BIET: ghi hoi {cauHoi, duKienThieu, trich}. Không để THOA và CHUA_BIET cùng lượt.',
        DAN_DE_CAP,
        `docThem: khi một câu vừa đọc bảo áp dụng / xem chú giải của nhóm khác cho hàng này, ghi nút đó (bieu:NNNN, tối đa ${gh.toiDaDocThem}) để được đọc thêm. Không dùng để đoán nhóm khác.`,
      ].join('\n');
      const luotChia = chiaLuot(mucDoc, {
        tran: nganSach(lenh(99, 99, 99), tenNhom, khoiBanChat),
        toiDaCau: gh.cauMoiLuotKiem,
        soCau: (x) => x.cau.length,
      });
      ghiChia('KIEM', luotChia.length);

      const danhSachThoa = [];
      const danhSachChuaBiet = [];
      const trichKiem = [];
      const dsDocThem = [];
      for (let li = 0; li < luotChia.length; li += 1) {
        const luot = luotChia[li];
        const loCau = luot.flatMap((x) => x.cau);
        const loCauIds = loCau.map((x) => x.cauId);
        const nutLuot = luot.map((x) => x.nut).filter(Boolean);
        const cauLuot = new Set([...nutLuot.flatMap((n) => n.cauIds), ...loCauIds, ...loCau.map((g) => nguonCau.danTheoCau.get(g.cauId)).filter(Boolean)]);
        for (const c of cauLuot) daDuaCau.add(c);
        const resKiem = await goiVaKiem('KIEM', {
          dong: [lenh(li + 1, luotChia.length, loCau.length), khoiBanChat, tenNhom, luot.map((x) => x.chu).join('\n')],
          schema: {
            kiemCanh: [{ cauId: 'string', ketQua: 'THOA|KHONG|CHUA_BIET', chuKhach: 'string' }],
            chuyenHuong: { nutDich: 'string', trich: SCHEMA_TRICH, lyDo: 'string' },
            hoi: { cauHoi: 'string', duKienThieu: ['string'], trich: SCHEMA_TRICH },
            cauDeCap: [{ cauId: 'string', y: 'string' }],
            docThem: ['string (bieu:NNNN)'],
          },
          duLieu: { nut: nutNhom, loCau, luot: li + 1, tongLuot: luotChia.length },
        }, (out) => {
          if (!out || typeof out !== 'object') return { ok: false, loi: 'KIEM không trả JSON hợp lệ' };
          const arr = Array.isArray(out.kiemCanh) ? out.kiemCanh : (loCauIds.length ? null : []);
          if (!arr) return { ok: false, loi: 'KIEM thiếu mảng kiemCanh' };
          const mapTraLoi = new Map();
          for (const item of arr) {
            const cid = chuGon(item?.cauId);
            if (!loCauIds.includes(cid)) continue;
            const kq = chuanHoaTraLoiCanh(item?.ketQua);
            if (!kq) return { ok: false, loi: `KIEM mục "${cid}" thiếu ketQua hợp lệ (THOA/KHONG/CHUA_BIET)` };
            const ck = kiemChuKhach(item?.chuKhach, moTaKhach, { choPhepKhongNeu: kq !== 'THOA' });
            if (!ck.ok) return { ok: false, loi: `KIEM mục "${cid}": ${ck.lyDo}` };
            mapTraLoi.set(cid, { cauId: cid, ketQua: kq, chuKhach: chuGon(item.chuKhach) });
          }
          const thieu = loCauIds.filter((cid) => !mapTraLoi.has(cid));
          if (thieu.length) return { ok: false, loi: `KIEM bỏ sót ${thieu.length} câu cần kiểm: ${thieu.join(', ')}` };
          const thoa = [...mapTraLoi.values()].filter((x) => x.ketQua === 'THOA');
          const chuaBiet = [...mapTraLoi.values()].filter((x) => x.ketQua === 'CHUA_BIET');
          if (thoa.length && chuaBiet.length) {
            return { ok: false, loi: 'KIEM không vừa trả THOA vừa trả CHUA_BIET trong cùng lượt: đã loại dứt khoát thì không để CHUA_BIET; còn thiếu dữ kiện quyết định thì để CHUA_BIET và không THOA' };
          }
          let chuyenHuong = null;
          if (thoa.length) {
            const dichThoa = thoa.flatMap((x) => canhTheoCau.get(x.cauId).cacDich);
            const tho = out.chuyenHuong?.nutDich || dichThoa.find((x) => chuanNutBieu(x));
            const dich = chuanNutBieu(tho);
            if (!dich) return { ok: false, loi: 'KIEM có THOA nhưng thiếu chuyenHuong.nutDich' };
            const dd = so(dich);
            const hop = dichThoa.some((x) => {
              const s = so(x);
              if (/^(?:phan|gir):/.test(x)) return true;
              // Đích phải nằm trong (hoặc trùng) nút đích của câu THOA: "bieu:7610" thỏa câu chỉ tới "bieu:76",
              // còn ngược lại (câu chỉ tới "bieu:7610" mà chọn "bieu:76") là mở rộng trái phép ra cả chương.
              return s && dd.startsWith(s);
            });
            if (!hop) return { ok: false, loi: `KIEM chuyenHuong.nutDich "${dich}" không phải đích của câu THOA (${[...new Set(dichThoa)].slice(0, 12).join(', ')})` };
            const trichCh = out.chuyenHuong?.trich?.length ? out.chuyenHuong.trich : [{ cauId: thoa[0].cauId, doan: traGon(thoa[0].cauId) }];
            const kt = kiemTrichMang(trichCh, nguonCau, daDuaCau);
            if (!kt.ok) return { ok: false, loi: `KIEM chuyenHuong: ${kt.lyDo}` };
            chuyenHuong = { nutDich: dich, trich: kt.chuan, lyDo: chuGon(out.chuyenHuong?.lyDo) || `Thoả câu loại trừ ${thoa[0].cauId}`, thoa: thoa[0] };
          }
          let hoi = null;
          if (chuaBiet.length) {
            if (!chuGon(out.hoi?.cauHoi)) return { ok: false, loi: 'KIEM có CHUA_BIET nhưng thiếu hoi.cauHoi' };
            const trichHoi = out.hoi?.trich?.length ? out.hoi.trich : [{ cauId: chuaBiet[0].cauId, doan: traGon(chuaBiet[0].cauId) }];
            const kt = kiemTrichMang(trichHoi, nguonCau, daDuaCau);
            if (!kt.ok) return { ok: false, loi: `KIEM hoi: ${kt.lyDo}` };
            hoi = { ...out.hoi, trich: kt.chuan };
          }
          const dc = nhanCauDeCap(out.cauDeCap);
          if (!dc.ok) return dc;
          const docThem = [...new Set((Array.isArray(out.docThem) ? out.docThem : []).map((x) => so(x).slice(0, 4)).filter((x) => x.length === 4))];
          const laLa = docThem.find((h) => ![...cauLuot].some((c) => (dichTheoCau.get(c) || []).some((d) => d.h4 === h)));
          if (laLa) return { ok: false, loi: `KIEM docThem "${laLa}" không phải nhóm được câu nào trong lượt này dẫn tới` };
          return { ok: true, duLieu: { kiemCanh: loCauIds.map((cid) => mapTraLoi.get(cid)), chuyenHuong, hoi, cauDeCap: dc.chuan, docThem } };
        });
        if (!resKiem.ok) return { trangThai: 'SO_KHONG_DAT', loi: [resKiem.loi] };

        daDuaKhi(nutLuot);
        luuCauDeCap(resKiem.duLieu.cauDeCap);
        trichKiem.push(...resKiem.duLieu.cauDeCap.map(({ cauId, doan }) => ({ cauId, doan })));
        for (const item of resKiem.duLieu.kiemCanh) {
          kiemCanhTong.push({ ...item, gopTheoCau: true });
          if (laNutChung(canhTheoCau.get(item.cauId).tuNut)) traLoiChung.set(item.cauId, { ...item, nut: nutNhom });
          if (item.ketQua === 'CHUA_BIET') danhSachChuaBiet.push({ item, hoi: resKiem.duLieu.hoi });
        }
        if (resKiem.duLieu.chuyenHuong) danhSachThoa.push(resKiem.duLieu.chuyenHuong);
        for (const h of resKiem.duLieu.docThem) if (h !== h4 && !dsDocThem.includes(h)) dsDocThem.push(h);
      }

      // Dẫn chiếu "chú giải nhóm X được áp dụng": đưa đúng chú giải nhóm X để đọc và kê câu, không biến X thành ứng viên.
      const daDocThem = danhSachThoa.length || danhSachChuaBiet.length ? [] : dsDocThem.slice(0, gh.toiDaDocThem);
      const cauDocThem = [];
      for (const h of daDocThem) {
        // Nút chính bieu:<h> là căn cứ bắt buộc của lượt này — daDuaNut toàn cục (nút đã vào prompt lượt khác)
        // không có nghĩa lượt này có nó: lọc trôi nút chính thì DOC_THEM rỗng nhưng sổ vẫn ghi docThem.
        const nutThem = gomNutPhaiDoc(phaiDocFn(`bieu:${h}`, { thuMuc: dir, dayDu: true }), nguonCau)
          .filter((n) => (n.id === `bieu:${h}` || (n.buoc === 'CHU_GIAI_NHOM' && !daDuaNut.has(n.id))));
        const lenhThem = `BƯỚC DOC_THEM (${nutNhom}): chú giải nhóm ${h} mà câu vừa đọc dẫn tới. Đọc phần áp dụng được cho nhóm đang đọc, KHÔNG chọn nhóm ${h}. ${DAN_DE_CAP}`;
        const luotThem = chiaLuot(nutThem.map((n) => ({ nut: n, chu: vanBanNut(n, nguonCau) })), { tran: nganSach(lenhThem, khoiBanChat, tenNhom) });
        ghiChia('DOC_THEM', luotThem.length);
        for (const luot of luotThem) {
          for (const x of luot) for (const c of x.nut.cauIds) daDuaCau.add(c);
          const r = await goiVaKiem('DOC_THEM', {
            dong: [lenhThem, khoiBanChat, tenNhom, luot.map((x) => x.chu).join('\n')],
            schema: { cauDeCap: [{ cauId: 'string', y: 'string' }] },
            duLieu: { nut: nutNhom, docThem: h },
          }, kiemDeCap('DOC_THEM'));
          if (!r.ok) return { trangThai: 'SO_KHONG_DAT', loi: [r.loi] };
          daDuaKhi(luot.map((x) => x.nut));
          cauDocThem.push(...luot.flatMap((x) => x.nut.cauIds));
          luuCauDeCap(r.duLieu.cauDeCap);
          trichKiem.push(...r.duLieu.cauDeCap.map(({ cauId, doan }) => ({ cauId, doan })));
          for (const x of r.duLieu.cauDeCap) deCapThemCua.set(x.cauId, h4);
        }
      }

      const cauTen = nguonCau.cauTheoNut.get(nutNhom)?.[0] || `${nutNhom}#1`;
      ghiBuoc(soVet, {
        loai: 'KIEM',
        nut: nutNhom,
        cungCapDaThay: [nutNhom],
        daDoc: [...new Set([...nutTatCa.flatMap((n) => n.cauIds), ...cauDocThem])].filter((c) => daDuaCau.has(c)),
        trich: trichKiem.length ? trichKiem : [{ cauId: cauTen, doan: traGon(cauTen) }],
        chuKhach: danhSachChuaBiet[0]?.item.chuKhach || danhSachThoa[0]?.thoa.chuKhach || chuKhachVao,
        quyetDinh: {
          trangThai: danhSachChuaBiet.length ? 'CAN_HOI_KHACH' : (danhSachThoa.length ? 'LOAI_CHUYEN_HUONG' : 'THONG_QUA_LOAI_TRU'),
          nutDich: nutNhom,
          soLuotDoc: luotChia.length,
          cauDungLai: kiemCanhTong.filter((x) => x.dungLaiTu).length,
          ...(daDocThem.length ? { docThem: daDocThem.map((h) => `bieu:${h}`) } : {}),
        },
        daSoKhongChon: [],
        kiemCanh: kiemCanhTong,
        quyTacGir: 'QT1',
      });

      if (danhSachChuaBiet.length) {
        const cb = danhSachChuaBiet[0];
        return {
          trangThai: 'HOI',
          nut: nutNhom,
          ma: h4,
          trich: cb.hoi.trich,
          chuKhach: cb.item.chuKhach,
          hoi: {
            cauHoi: chuGon(cb.hoi.cauHoi),
            duKienThieu: Array.isArray(cb.hoi.duKienThieu) && cb.hoi.duKienThieu.length ? cb.hoi.duKienThieu : [cb.item.cauId],
            haiNhanhPhanVan: [nutNhom, ...canhTheoCau.get(cb.item.cauId).cacDich],
          },
        };
      }
      if (danhSachThoa.length) {
        daBiLoai.set(h4, danhSachThoa[0]);
        const dsDich = [];
        for (const ch of danhSachThoa) {
          if (dsDich.includes(ch.nutDich)) continue;
          dsDich.push(ch.nutDich);
          ghiBuoc(soVet, {
            loai: 'CHUYEN_HUONG',
            nut: nutNhom,
            cungCapDaThay: [nutNhom, ch.nutDich],
            daDoc: ch.trich.map((t) => t.cauId),
            trich: ch.trich,
            chuKhach: ch.thoa.chuKhach,
            quyetDinh: { trangThai: 'CHUYEN_HUONG', nutDich: ch.nutDich, lyDo: ch.lyDo },
            daSoKhongChon: [{ nut: nutNhom, viSaoKhongChon: ch.lyDo }],
            quyTacGir: 'QT1',
          });
        }
        return { trangThai: 'CHUYEN_HUONG', dsDich };
      }
      nhomSong.push(h4);
      return { trangThai: 'SONG' };
    };

    const hangDoi = [...chonUv.nhomChon];
    while (hangDoi.length > 0) {
      const h4 = hangDoi.shift();
      if (daBiLoai.has(h4) || daKiemNhom.has(h4)) continue;
      const kq = await docVaKiemMotNhom(h4);
      if (kq.trangThai === 'SO_KHONG_DAT') return traKetQuaSoHong(kq.loi);
      if (kq.trangThai === 'HOI') {
        return dungHoi({ bac: 4, ma: kq.ma, nut: kq.nut, cungCap: [kq.nut], trich: kq.trich, chuKhach: kq.chuKhach, hoi: kq.hoi });
      }
      if (kq.trangThai !== 'CHUYEN_HUONG') continue;
      soLanChuyenHuong += 1;
      if (soLanChuyenHuong > gh.toiDaChuyenHuong) return traKetQuaSoHong([`Vượt quá giới hạn chuyển hướng (${gh.toiDaChuyenHuong} lần).`]);
      const them = [];
      for (const nutDich of kq.dsDich) {
        const d = so(nutDich);
        if (d.length >= 4) {
          them.push(d.slice(0, 4));
        } else if (d.length === 2) {
          // Câu loại trừ chỉ sang cả Chương: đưa các nhóm của Chương đó qua LOC / CHON, không đoán nhóm.
          const pdCh = phaiDocFn(`bieu:${d}`, { thuMuc: dir, dayDu: true });
          const dsCh = (pdCh?.capDuoi || []).map((c) => ({
            h4: so(c.id).slice(0, 4), id: c.id, ten: c.ten || '', tomTat: tomTatRes.map.get(c.id) || null,
            chungCu: ungVienMap.get(so(c.id))?.chungCu || [],
          })).filter((u) => u.h4.length === 4 && !daBiLoai.has(u.h4) && !daKiemNhom.has(u.h4));
          if (dsCh.length) {
            const kqCh = await locVaChon(dsCh, { choTim: false });
            if (kqCh.loi) return traKetQuaSoHong([kqCh.loi]);
            // LLM trả HOI (mô tả thiếu để chọn nhóm trong chương): đưa câu hỏi của LLM lên, không nuốt.
            // Ghi sổ tại 'cua-vao' (tiền lệ hoiHetNhom / chonUv.hoi): chương chưa đọc chú giải bắt buộc
            // nên KET_LUAN(DUNG_HOI) tại bieu:<chương> sẽ bị máy kiểm sổ bắt THIEU_NUT_BAT_BUOC_PHAI_DOC.
            if (kqCh.hoi) {
              return dungHoi({
                bac: 4,
                cungCap: dsCh.map((u) => `bieu:${u.h4}`),
                hoi: { cauHoi: kqCh.hoi.cauHoi, duKienThieu: Array.isArray(kqCh.hoi.duKienThieu) ? kqCh.hoi.duKienThieu : [] },
              });
            }
            if (kqCh.nhomChon) them.push(...kqCh.nhomChon);
          }
        }
      }
      for (const h of them.reverse()) if (!daBiLoai.has(h) && !daKiemNhom.has(h)) hangDoi.unshift(h);
    }

    const hoiHetNhom = (lyDo) => dungHoi({
      bac: 4,
      daSoKhongChon: [...daBiLoai].map(([h, ch]) => ({ nut: `bieu:${h}`, viSaoKhongChon: ch.lyDo })),
      hoi: {
        cauHoi: 'Các nhóm đã đọc đều rơi vào diện loại trừ — vui lòng bổ sung thông tin chi tiết về chức năng và cấu tạo hàng hoá.',
        duKienThieu: Array.isArray(vaoCua.chuaBiet) && vaoCua.chuaBiet.length ? vaoCua.chuaBiet : ['chức năng', 'cấu tạo'],
        lyDo,
      },
    });
    if (nhomSong.length === 0) return hoiHetNhom('MOI_NHOM_BI_LOAI');

    // ── BƯỚC 4: CHON_NHOM_4 ────────────────────────────────────────────────────────────────────────────────────
    const khoiGir = (dsQt) => dsQt.flatMap((n) => [...nguonCau.nutTheoId.keys()].filter((id) => new RegExp(`^gir:${n}(?::[abc])?$`).test(id)))
      .map((id) => ({ id, buoc: 'QUY_TAC', lop: 'LUAT', trang: null, cauIds: nguonCau.cauTheoNut.get(id) || [id] }));

    const chonNhom4 = async () => {
      const conSong = nhomSong.filter((h) => !daBiLoai.has(h));
      if (!conSong.length) return { het: true };
      const uvSongIds = new Set(conSong.map((h) => `bieu:${h}`));
      const gir = khoiGir(conSong.length > 1 ? [1, 2, 3, 4, 5] : [1]);
      const lenh = [
        `BƯỚC CHON_NHOM_4: ${conSong.length} nhóm đã đọc kỹ và soát hết câu loại trừ (${conSong.join(', ')}). Chọn nhóm 4 số theo Quy tắc 1; chỉ dùng Quy tắc 2–5 khi nêu được lyDoGir1ChuaDu.`,
        'trich: câu luật làm căn cứ chọn (cauId + doan chép nguyên văn từ các câu dưới đây). daSoKhongChon: MỌI nhóm còn lại và vì sao không chọn. quyTacGir viết dạng QT1, QT2a, QT3b… ' + DAN_CHU_KHACH,
        'Hai nhóm cùng nhận hàng mà thiếu một dữ kiện để tách: HOI, nêu cauHoi, duKienThieu, haiNhanhPhanVan.',
      ].join('\n');
      const khoiLoai = daBiLoai.size ? `NHÓM ĐÃ BỊ LOẠI Ở KIEM: ${[...daBiLoai].map(([h, ch]) => `${h} (${ch.lyDo} [${ch.trich[0]?.cauId || ''}])`).join(' | ')}` : '';
      const nutRieng = (h) => gomNutPhaiDoc(pdNhomCache.get(h), nguonCau).filter((n) => n.buoc === 'CHU_GIAI_NHOM' || n.id === `bieu:${h}`);
      const keTheoNhom = (h) => [...cauDeCap.values()].filter((x) => deCapThemCua.get(x.cauId) === h);
      const nutChungDaKe = [...cauDeCap.values()].filter((x) => !/^(?:nhom|bieu):/.test(x.cauId) || /^bieu:\d{2}#/.test(x.cauId));
      const khoiDau = [
        gir.map((n) => vanBanNut(n, nguonCau)).join('\n'),
        nutChungDaKe.length ? `CÂU PHẦN / CHƯƠNG / SEN BẠN ĐÃ KÊ KHI ĐỌC:\n${nutChungDaKe.map(dongDeCap).join('\n')}` : '',
        khoiLoai,
      ].filter(Boolean).join('\n');
      const khoiThem = (h) => (keTheoNhom(h).length ? `\nCâu bạn kê từ chú giải nhóm khác được dẫn áp dụng:\n${keTheoNhom(h).map(dongDeCap).join('\n')}` : '');
      let than = conSong.map((h) => `■ ${h}\n${nutRieng(h).map((n) => vanBanNut(n, nguonCau)).join('\n')}${khoiThem(h)}`).join('\n');
      if (than.length > nganSach(lenh, khoiBanChat, khoiDau)) {
        // Toàn văn đã đưa trọn ở KIEM; vượt trần thì chỉ đưa tên nhóm + các câu LLM đã kê, không cắt câu nào.
        muc('CHON_NHOM_4').rutVeTrich = true;
        than = conSong.map((h) => {
          const ke = [...cauDeCap.values()].filter((x) => nutCuaCau(x.cauId).startsWith(`nhom:${h}:`));
          const ten = nutRieng(h).filter((n) => n.id === `bieu:${h}`);
          return `■ ${h} (chú giải nhóm đã đọc ở KIEM; dưới đây là câu bạn đã kê)\n${ten.map((n) => vanBanNut(n, nguonCau)).join('\n')}\n${ke.map(dongDeCap).join('\n')}${khoiThem(h)}`;
        }).join('\n');
      }
      for (const n of gir) for (const c of n.cauIds) daDuaCau.add(c);

      return goiVaKiem('CHON_NHOM_4', {
        dong: [lenh, khoiBanChat, khoiDau, than],
        schema: {
          hanhDong: 'CHON | HOI', nutDich: 'string (bieu:NNNN)', quyTacGir: 'string', lyDoGir1ChuaDu: 'string', trich: SCHEMA_TRICH,
          chuKhach: 'string', daSoKhongChon: [{ nut: 'string', viSaoKhongChon: 'string' }],
          cauHoi: 'string', duKienThieu: ['string'], haiNhanhPhanVan: ['string'],
        },
        duLieu: { nhomSong: conSong.map((h) => `bieu:${h}`) },
      }, (out) => {
        if (!out || typeof out !== 'object') return { ok: false, loi: 'CHON_NHOM_4 không trả JSON hợp lệ' };
        const hd = String(out.hanhDong || 'CHON').trim().toUpperCase();
        const ck = kiemChuKhach(out.chuKhach, moTaKhach);
        if (!ck.ok) return { ok: false, loi: `CHON_NHOM_4: ${ck.lyDo}` };
        const kt = kiemTrichMang(out.trich, nguonCau, daDuaCau);
        if (!kt.ok) return { ok: false, loi: `CHON_NHOM_4: ${kt.lyDo}` };
        const chung = { ...out, trich: kt.chuan, chuKhach: chuGon(out.chuKhach) };
        if (hd === 'HOI') {
          if (!chuGon(out.cauHoi)) return { ok: false, loi: 'CHON_NHOM_4 (HOI) thiếu cauHoi' };
          return { ok: true, duLieu: { ...chung, hanhDong: 'HOI' } };
        }
        if (hd !== 'CHON') return { ok: false, loi: `hanhDong "${hd}" không hợp lệ ở CHON_NHOM_4` };
        const dich = chuanNutBieu(out.nutDich);
        const h4Dich = so(dich).slice(0, 4);
        if (dich && daBiLoai.has(h4Dich)) return { ok: false, loi: `nhóm ${dich} đã bị loại ở bước KIEM, không được chọn lại` };
        if (!dich || !uvSongIds.has(dich)) {
          return { ok: false, loi: `nhóm "${out.nutDich}" nằm ngoài nhóm đã đọc và kiểm (${[...uvSongIds].join(', ')})` };
        }
        if (chiCoGir(kt.chuan)) return { ok: false, loi: 'CHON_NHOM_4: trich chỉ có lời Quy tắc, thiếu câu tên nhóm / chú giải làm căn cứ' };
        const girC = chuanGir(out.quyTacGir);
        if (!girC) return { ok: false, loi: 'CHON_NHOM_4 thiếu quyTacGir' };
        if (conSong.length === 1 && /\b3\b|QT3|GIR\s*3/i.test(girC)) return { ok: false, loi: 'QT1 đã còn 1 nhóm, cấm viện dẫn QT3' };
        if (girC !== 'QT1' && !chuGon(out.lyDoGir1ChuaDu)) return { ok: false, loi: 'viện dẫn quy tắc ngoài QT1 phải nêu rõ lyDoGir1ChuaDu' };
        const soKhac = Array.isArray(out.daSoKhongChon) ? out.daSoKhongChon : [];
        const daSo = new Set(soKhac.filter((x) => chuGon(x?.viSaoKhongChon)).map((x) => so(x?.nut).slice(0, 4)));
        const sot = conSong.filter((h) => h !== h4Dich && !daSo.has(h));
        if (sot.length) return { ok: false, loi: `phải nêu daSoKhongChon với các nhóm đã đọc và vì sao không chọn: ${sot.join(', ')}` };
        return { ok: true, duLieu: { ...chung, hanhDong: 'CHON', nutDich: dich, h4Dich, quyTacGir: girC, daSoKhongChon: soKhac } };
      });
    };

    const traHoiChonNhom4 = (d4) => {
      const conSong = nhomSong.filter((h) => !daBiLoai.has(h));
      const cungCap = conSong.map((h) => `bieu:${h}`);
      return dungHoi({
        bac: 4,
        ma: conSong.length === 1 ? conSong[0] : null,
        nut: cungCap[0] || 'cua-vao',
        cungCap,
        trich: d4.trich,
        chuKhach: d4.chuKhach,
        quyTacGir: chuanGir(d4.quyTacGir) || 'QT1',
        daSoKhongChon: Array.isArray(d4.daSoKhongChon) ? d4.daSoKhongChon : [],
        hoi: { cauHoi: d4.cauHoi, duKienThieu: d4.duKienThieu || [], haiNhanhPhanVan: d4.haiNhanhPhanVan?.length ? d4.haiNhanhPhanVan : cungCap },
      });
    };

    const resC4 = await chonNhom4();
    if (!resC4.ok) return traKetQuaSoHong([resC4.loi]);
    if (resC4.duLieu.hanhDong === 'HOI') return traHoiChonNhom4(resC4.duLieu);
    let lastNhom4Choice = resC4.duLieu;
    const lastChonTheoNut = new Map();

    const ghiChonTang4 = (c4) => {
      const h4 = c4.h4Dich;
      const ch = h4.slice(0, 2);
      const pdH4 = pdNhomCache.get(h4) || phaiDocFn(`bieu:${h4}`, { thuMuc: dir, dayDu: true });
      ghiBuoc(soVet, {
        loai: 'CHON',
        nut: `bieu:${ch}`,
        cungCapDaThay: nhomSong.filter((h) => !daBiLoai.has(h) && h.startsWith(ch)).map((h) => `bieu:${h}`),
        daDoc: canCuBatBuoc(pdH4).filter((c) => daDuaCau.has(c)),
        trich: c4.trich,
        chuKhach: c4.chuKhach,
        quyetDinh: { trangThai: 'CHON_TANG_4', nutDich: c4.nutDich, ...(c4.lyDoGir1ChuaDu ? { lyDoGir1ChuaDu: c4.lyDoGir1ChuaDu } : {}) },
        daSoKhongChon: c4.daSoKhongChon || [],
        quyTacGir: c4.quyTacGir,
      });
      return { h4, ch };
    };
    const init4 = ghiChonTang4(lastNhom4Choice);
    let curH4 = init4.h4;
    let curCh = init4.ch;
    if (soVet.qt1SoNhom == null) {
      soVet.qt1SoNhom = nhomSong.length;
      soVet.ungVienSauQt1 = [...nhomSong];
    }

    // ── BƯỚC 5: XUONG_CAP từng cấp gạch (không lộ cấp dưới trước khi chọn cấp trên) ─────────────────────────────
    let curNut = lastNhom4Choice.nutDich;
    let soLanQuayLui = 0;
    const duaO = new Map(); // nút chú giải phân nhóm → nút đứng đã đưa
    const daBacNut = new Map(); // nút quay về → [{ nut: nhánh đã bị bác ở QUAY_LUI, lyDo }]

    while (true) {
      const pdCur = phaiDocFn(curNut, { thuMuc: dir, dayDu: true });
      if (!pdCur) return traKetQuaSoHong([`Không tìm thấy nút biểu thuế "${curNut}" trong phaiDoc().`]);
      const capDuoi = Array.isArray(pdCur.capDuoi) ? pdCur.capDuoi : [];
      if (capDuoi.length === 0) break;
      const capDuoiIds = capDuoi.map((x) => x.id);
      const tapCapDuoi = new Set(capDuoiIds);
      const bacBuoc = Math.max(...capDuoi.map((x) => so(x.id).length)) <= 6 ? 6 : 8;

      // Nút luật của cấp đang so: chú giải phân nhóm (đưa một lần cho mọi nút con, không lặp ở cấp sau) + SEN không sâu hơn cấp con.
      const nutCap = [];
      const tapNutCap = new Set();
      for (const c of capDuoi) {
        const d = so(c.id);
        for (const n of gomNutPhaiDoc(phaiDocFn(c.id, { thuMuc: dir, dayDu: true }), nguonCau)) {
          if (tapNutCap.has(n.id) || !['CHU_GIAI_PHAN_NHOM', 'SEN'].includes(n.buoc)) continue;
          if (n.buoc === 'SEN') {
            const m = /^sen:(\d+):/.exec(n.id);
            if (!m || m[1].length > d.length) continue;
          } else if (duaO.has(n.id) && duaO.get(n.id) !== curNut) continue;
          tapNutCap.add(n.id);
          nutCap.push(n);
        }
      }
      const tenCon = (c) => `* ${c.id} (${'-'.repeat(c.gach || 0) || '0 gạch'})\n${(nguonCau.cauTheoNut.get(c.id) || []).map((cid) => `  - [${cid}] ${traGon(cid)}`).join('\n') || `  - ${c.ten}`}`;
      const laAnhEm = (v) => { const s = so(v); return capDuoiIds.some((id) => so(id) === s); };
      const tach = [];
      for (const c of capDuoi) {
        for (const t of tomTatRes.map.get(c.id)?.tachVoi || []) if (laAnhEm(t.voi)) tach.push(`  ${c.id} tách với ${t.voi}: ${chuGon(t.y)}`);
      }
      for (const t of tomTatRes.map.get(curNut)?.tachVoi || []) if (laAnhEm(t.voi)) tach.push(`  TÁCH VỚI CHA (${curNut}): ${t.voi}: ${chuGon(t.y)}`);
      const khoiTach = tach.length ? `TÓM TẮT TÁCH NHAU (M-36 BO_TRO, không phải luật):\n${tach.join('\n')}` : '';
      const tenCha = (nguonCau.cauTheoNut.get(curNut) || []).map((cid) => `[${cid}] ${traGon(cid)}`).join(' ');
      const khoiTen = `CÁC NÚT CON CÙNG CẤP CỦA ${curNut} (${tenCha || chuGon(pdCur.ten)}):\n${capDuoi.map(tenCon).join('\n')}`;
      const gir6 = khoiGir([6]);
      const khoiGir6 = gir6.map((n) => vanBanNut(n, nguonCau)).join('\n');
      const deCapCap = [...cauDeCap.values()].filter((x) => !tapNutCap.has(nutCuaCau(x.cauId)) && (/:cgpn:|^pn:/.test(x.cauId) || nutCuaCau(x.cauId).startsWith(`nhom:${curH4}:`) || deCapThemCua.get(x.cauId) === curH4));
      const khoiDeCap = deCapCap.length ? `CÂU CHÚ GIẢI BẠN ĐÃ KÊ KHI ĐỌC:\n${deCapCap.map(dongDeCap).join('\n')}` : '';
      const quayLuiHopLe = new Set([`bieu:${curCh}`]);
      const curDigits = so(curNut);
      if (curDigits.length > 4) quayLuiHopLe.add(`bieu:${curDigits.slice(0, 4)}`);
      if (curDigits.length > 6) quayLuiHopLe.add(`bieu:${curDigits.slice(0, 6)}`);
      const lenh = [
        `BƯỚC XUONG_CAP tại ${curNut}: theo Quy tắc 6, chỉ so các nút con CÙNG CẤP dưới đây, CHON đúng một (không nhảy cấp).`,
        'trich: câu luật làm căn cứ (cauId + doan nguyên văn, tên nút con cũng là câu luật). daSoKhongChon: các nút con khác và vì sao không. quyTacGir: QT6. ' + DAN_CHU_KHACH,
        `Thiếu đúng dữ kiện tách hai nút con: HOI (cauHoi, duKienThieu, haiNhanhPhanVan). Không nút con nào hợp vì đã đi nhầm: QUAY_LUI (nutDich là một trong ${[...quayLuiHopLe].join(', ')}; lyDo).`,
        DAN_DE_CAP,
      ].join('\n');
      let mucNut = nutCap.map((n) => ({ nut: n, chu: vanBanNut(n, nguonCau) }));
      const bacTruoc = daBacNut.get(curNut) || [];
      const khoiDaBac = bacTruoc.length
        ? `NHÁNH ĐÃ BỊ BẠC Ở QUAY_LUI TRƯỚC ĐÂY TẠI NÚT NÀY — CẤM CHỌN LẠI, CHỌN NHÁNH KHÁC:\n${bacTruoc.map((x) => `  - ${x.nut}: ${x.lyDo}`).join('\n')}`
        : '';
      const tranCap = nganSach(lenh, khoiBanChat, khoiTen, khoiTach, khoiGir6, khoiDeCap, khoiDaBac);
      let khoiDocTruoc = '';
      for (const c of capDuoi) for (const cid of nguonCau.cauTheoNut.get(c.id) || []) daDuaCau.add(cid);
      for (const n of gir6) for (const c of n.cauIds) daDuaCau.add(c);
      if (mucNut.reduce((t, x) => t + x.chu.length + 1, 0) > tranCap) {
        // Vượt trần: đọc trước theo nút (không cắt chữ), kê câu đề cập; bước chọn chỉ thấy các câu đã kê.
        const lenhDoc = `BƯỚC DOC_CAP tại ${curNut}: đọc nguyên văn các nút luật dưới đây, chưa chọn. ${DAN_DE_CAP}`;
        const luotDoc = chiaLuot(mucNut, { tran: nganSach(lenhDoc, khoiBanChat, khoiTen) });
        ghiChia('DOC_CAP', luotDoc.length + 1);
        const ke = [];
        for (const luot of luotDoc) {
          for (const x of luot) for (const c of x.nut.cauIds) daDuaCau.add(c);
          const r = await goiVaKiem('DOC_CAP', {
            dong: [lenhDoc, khoiBanChat, khoiTen, luot.map((x) => x.chu).join('\n')],
            schema: { cauDeCap: [{ cauId: 'string', y: 'string' }] },
            duLieu: { nut: curNut },
          }, kiemDeCap('DOC_CAP'));
          if (!r.ok) return traKetQuaSoHong([r.loi]);
          daDuaKhi(luot.map((x) => x.nut));
          luuCauDeCap(r.duLieu.cauDeCap);
          ke.push(...r.duLieu.cauDeCap);
        }
        for (const x of mucNut) duaO.set(x.nut.id, curNut);
        mucNut = [];
        khoiDocTruoc = `CÂU BẠN ĐÃ KÊ Ở DOC_CAP:\n${ke.map(dongDeCap).join('\n') || '  (không có câu nào đề cập)'}`;
      } else {
        for (const x of mucNut) { duaO.set(x.nut.id, curNut); for (const c of x.nut.cauIds) daDuaCau.add(c); }
      }
      const khoiNut = mucNut.length ? `CHÚ GIẢI PHÂN NHÓM / SEN CẤP NÀY:\n${mucNut.map((x) => x.chu).join('\n')}` : khoiDocTruoc;

      const resCap = await goiVaKiem('XUONG_CAP', {
        dong: [lenh, khoiBanChat, khoiGir6, khoiDeCap, khoiNut, khoiDaBac, khoiTach, khoiTen],
        schema: {
          hanhDong: 'CHON | HOI | QUAY_LUI', nutDich: 'string (bieu:…)', quyTacGir: 'string', trich: SCHEMA_TRICH, chuKhach: 'string',
          daSoKhongChon: [{ nut: 'string', viSaoKhongChon: 'string' }], lyDo: 'string', cauHoi: 'string', duKienThieu: ['string'], haiNhanhPhanVan: ['string'],
          cauDeCap: [{ cauId: 'string', y: 'string' }],
        },
        duLieu: { nut: curNut, bac: bacBuoc, capDuoi: capDuoi.map((x) => ({ id: x.id, ma: x.ma, gach: x.gach, ten: x.ten })), quayLuiHopLe: [...quayLuiHopLe] },
      }, (out) => {
        if (!out || typeof out !== 'object') return { ok: false, loi: 'XUONG_CAP không trả JSON hợp lệ' };
        const hd = String(out.hanhDong || '').trim().toUpperCase();
        const ck = kiemChuKhach(out.chuKhach, moTaKhach);
        if (!ck.ok) return { ok: false, loi: `XUONG_CAP: ${ck.lyDo}` };
        const kt = kiemTrichMang(out.trich, nguonCau, daDuaCau);
        if (!kt.ok) return { ok: false, loi: `XUONG_CAP: ${kt.lyDo}` };
        const dc = nhanCauDeCap(out.cauDeCap);
        if (!dc.ok) return { ok: false, loi: `XUONG_CAP: ${dc.loi}` };
        const chung = { ...out, trich: kt.chuan, chuKhach: chuGon(out.chuKhach), cauDeCap: dc.chuan };
        const dich = chuanNutBieu(out.nutDich);
        if (hd === 'CHON') {
          if (!dich || !tapCapDuoi.has(dich)) {
            return { ok: false, loi: `nút "${out.nutDich}" nằm ngoài danh sách con cùng cấp [${capDuoiIds.join(', ')}]` };
          }
          if (bacTruoc.some((x) => x.nut === dich)) {
            return { ok: false, loi: `nút "${dich}" đã bị bác ở lượt QUAY_LUI trước tại nút này, không được chọn lại` };
          }
          if (chiCoGir(kt.chuan)) return { ok: false, loi: 'XUONG_CAP: trich chỉ có lời Quy tắc 6, thiếu câu tên phân nhóm / chú giải làm căn cứ' };
          const daSo = new Set((Array.isArray(out.daSoKhongChon) ? out.daSoKhongChon : []).filter((x) => chuGon(x?.viSaoKhongChon)).map((x) => so(x?.nut)));
          const sot = capDuoiIds.filter((id) => id !== dich && !daSo.has(so(id)));
          if (sot.length) return { ok: false, loi: `XUONG_CAP: daSoKhongChon sót nút cùng cấp: ${sot.join(', ')}` };
          return { ok: true, duLieu: { ...chung, hanhDong: 'CHON', nutDich: dich } };
        }
        if (hd === 'HOI') {
          if (!chuGon(out.cauHoi)) return { ok: false, loi: 'HOI thiếu cauHoi' };
          return { ok: true, duLieu: { ...chung, hanhDong: 'HOI' } };
        }
        if (hd === 'QUAY_LUI') {
          const lyDo = chuGon(out.lyDo);
          if (lyDo.length < 6) return { ok: false, loi: 'QUAY_LUI thiếu lyDo (>= 6 ký tự)' };
          if (!dich || !quayLuiHopLe.has(dich)) {
            return { ok: false, loi: `QUAY_LUI nutDich "${out.nutDich}" phải thuộc danh sách tổ tiên hợp lệ [${[...quayLuiHopLe].join(', ')}]` };
          }
          if (so(dich).length >= 4 && daBiLoai.has(so(dich).slice(0, 4))) return { ok: false, loi: `QUAY_LUI sang "${dich}" đã bị loại ở bước KIEM` };
          return { ok: true, duLieu: { ...chung, hanhDong: 'QUAY_LUI', nutDich: dich, lyDo } };
        }
        return { ok: false, loi: `hanhDong "${hd}" không hợp lệ ở XUONG_CAP` };
      });
      if (!resCap.ok) return traKetQuaSoHong([resCap.loi]);
      const dCap = resCap.duLieu;
      const girCap = chuanGir(dCap.quyTacGir) || 'QT6';
      daDuaKhi(mucNut.map((x) => x.nut));
      luuCauDeCap(dCap.cauDeCap);

      if (dCap.hanhDong === 'HOI') {
        return dungHoi({
          bac: bacBuoc, ma: curDigits, nut: curNut, cungCap: capDuoiIds, trich: dCap.trich, chuKhach: dCap.chuKhach, quyTacGir: girCap,
          daSoKhongChon: Array.isArray(dCap.daSoKhongChon) ? dCap.daSoKhongChon : [],
          hoi: {
            cauHoi: dCap.cauHoi,
            duKienThieu: Array.isArray(dCap.duKienThieu) ? dCap.duKienThieu : [],
            haiNhanhPhanVan: Array.isArray(dCap.haiNhanhPhanVan) ? dCap.haiNhanhPhanVan : [],
          },
        });
      }

      if (dCap.hanhDong === 'QUAY_LUI') {
        soLanQuayLui += 1;
        if (soLanQuayLui > gh.toiDaQuayLui) return traKetQuaSoHong([`Vượt quá giới hạn quay lui (${gh.toiDaQuayLui} lần).`]);
        ghiBuoc(soVet, {
          loai: 'QUAY_LUI', nut: curNut, cungCapDaThay: capDuoiIds, daDoc: dCap.trich.map((t) => t.cauId), trich: dCap.trich, chuKhach: dCap.chuKhach,
          quyetDinh: { trangThai: 'QUAY_LUI', nutDich: dCap.nutDich, lyDo: dCap.lyDo },
          daSoKhongChon: [{ nut: curNut, viSaoKhongChon: dCap.lyDo }], quyTacGir: girCap,
        });
        const dichDigits = so(dCap.nutDich);
        if (dichDigits.length <= 2) {
          daBiLoai.set(curH4, { lyDo: `Quay lui: ${dCap.lyDo}`, trich: dCap.trich });
          const lai = await chonNhom4();
          if (lai.het) return hoiHetNhom('QUAY_LUI_HET_NHOM');
          if (!lai.ok) return traKetQuaSoHong([lai.loi]);
          if (lai.duLieu.hanhDong === 'HOI') return traHoiChonNhom4(lai.duLieu);
          lastNhom4Choice = lai.duLieu;
          const c = ghiChonTang4(lastNhom4Choice);
          curH4 = c.h4;
          curCh = c.ch;
          curNut = lastNhom4Choice.nutDich;
        } else {
          // Neo lại bước CHON tầng 4 / tầng 6 để sổ giữ căn cứ của tầng đang đứng.
          if (dichDigits.length === 4 && dichDigits === curH4) ghiChonTang4(lastNhom4Choice);
          if (dichDigits.length === 6 && lastChonTheoNut.get(dCap.nutDich)) ghiBuoc(soVet, lastChonTheoNut.get(dCap.nutDich));
          // Ghi nhớ nhánh vừa bị bác để lượt kế tại nút quay về thấy ngay trong prompt và validator chặn chọn lại.
          const bac = daBacNut.get(dCap.nutDich) || [];
          bac.push({ nut: curNut, lyDo: dCap.lyDo });
          daBacNut.set(dCap.nutDich, bac);
          curNut = dCap.nutDich;
        }
        continue;
      }

      const digitsChon = so(dCap.nutDich);
      const pdChon = phaiDocFn(dCap.nutDich, { thuMuc: dir, dayDu: true });
      const buocChon = {
        loai: 'CHON',
        nut: curNut,
        cungCapDaThay: capDuoiIds,
        daDoc: canCuBatBuoc(pdChon).filter((c) => daDuaCau.has(c)),
        trich: dCap.trich,
        chuKhach: dCap.chuKhach,
        quyetDinh: { trangThai: digitsChon.length === 6 ? 'CHON_TANG_6' : (digitsChon.length === 8 ? 'CHON_TANG_8' : 'CHON_CAP_TRUNG_GIAN'), nutDich: dCap.nutDich },
        daSoKhongChon: dCap.daSoKhongChon || [],
        quyTacGir: girCap,
      };
      if (digitsChon.length === 6) lastChonTheoNut.set(dCap.nutDich, buocChon);
      ghiBuoc(soVet, buocChon);
      curNut = dCap.nutDich;
    }

    // ── BƯỚC 6: KET_LUAN & kiemSoVet (bước hỏng cho LLM làm lại đúng 1 lần) ─────────────────────────────────────
    const maCuoi = so(curNut);
    const pdCuoi = phaiDocFn(curNut, { thuMuc: dir, dayDu: true });
    const cungCapCuoi = (pdCuoi?.cungCap || []).map((x) => x.id);
    const buocChot = [...soVet.cacBuoc].reverse().find((b) => b.loai === 'CHON');
    ghiBuoc(soVet, {
      loai: 'KET_LUAN',
      nut: curNut,
      cungCapDaThay: [...new Set([curNut, ...cungCapCuoi])],
      daDoc: canCuBatBuoc(pdCuoi).filter((c) => daDuaCau.has(c)),
      trich: buocChot.trich,
      chuKhach: buocChot.chuKhach,
      quyetDinh: { trangThai: 'CHOT', maHs: maCuoi, nutDich: curNut },
      daSoKhongChon: buocChot.daSoKhongChon || [],
      quyTacGir: buocChot.quyTacGir,
    });

    let kqKiemSo = kiemSoVetFn(soVet, { thuMuc: dir, phaiDocFn });
    if (!kqKiemSo.dat) {
      const loiDau = kqKiemSo.loi.find((x) => Number.isInteger(x?.buoc));
      const idxSua = loiDau ? loiDau.buoc : soVet.cacBuoc.length - 1;
      const buocHong = soVet.cacBuoc[idxSua];
      // Chỉ cho sửa phần LLM viết; máy giữ nút, thứ đã đưa đọc và quyết định.
      const phanLLM = ['trich', 'chuKhach', 'daSoKhongChon', 'quyTacGir', 'kiemCanh'].filter((k) => k in buocHong);
      const kqSua = await goiBuoc('SUA_BUOC', {
        prompt: [
          `BƯỚC SUA_BUOC: sổ ghi vết bị từ chối tại bước #${idxSua + 1} (${buocHong?.loai || '?'} tại ${buocHong?.nut}).`,
          `LỖI: ${kqKiemSo.thieu.join(' | ').slice(0, 4000)}`,
          `Chỉ được sửa: ${phanLLM.join(', ')}. Trích phải nguyên văn câu đã đọc.`,
          khoiMoTa,
          `PHẦN ĐANG GHI: ${JSON.stringify(Object.fromEntries(phanLLM.map((k) => [k, buocHong[k]])))}`,
        ].join('\n'),
        schema: { buocSua: Object.fromEntries(phanLLM.map((k) => [k, '…'])) },
        duLieu: { buocIndex: idxSua, buocHong, loi: kqKiemSo.loi, thieu: kqKiemSo.thieu },
      });
      const sua = kqSua?.buocSua && typeof kqSua.buocSua === 'object' ? kqSua.buocSua : kqSua;
      if (sua && typeof sua === 'object') {
        const moi = { ...buocHong };
        for (const k of phanLLM) if (sua[k] != null) moi[k] = sua[k];
        soVet.cacBuoc[idxSua] = moi;
        kqKiemSo = kiemSoVetFn(soVet, { thuMuc: dir, phaiDocFn });
      }
      if (!kqKiemSo.dat) return traKetQuaSoHong(kqKiemSo.thieu);
    }

    return ketQua('KET_LUAN', { bac: maCuoi.length >= 8 ? 8 : (maCuoi.length >= 6 ? 6 : 4), ma: maCuoi, hoi: null, loiSo: [] });
  }

  try {
    return await chay();
  } catch (err) {
    if (/^(?:VUOT_GIOI_HAN_LUOT_LLM|PROMPT_VUOT_TRAN):/.test(err?.message || '')) return traKetQuaSoHong([err.message]);
    throw err;
  }
}

module.exports = {
  chayDocLuat,
  docTomTatNut,
  gomNutPhaiDoc,
  chiaLuot,
  kiemChuKhach,
  KHO_THIEU_MAC_DINH,
  GIOI_HAN_MAC_DINH,
  KHACH_KHONG_NEU,
};
