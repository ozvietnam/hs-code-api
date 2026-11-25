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
const { timLuat } = require('./tim-luat');
const { phaiDoc } = require('./do-thi/phai-doc');
const { kiemTrichHopLe, laCanCuTienLe } = require('./cong-adr-0004');
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
  toiDaNhomDoc: 3,
  cauMoiLuotKiem: 25,
  toiDaChuyenHuong: 5,
  toiDaQuayLui: 3,
  toiDaLuotLLM: 35,
});

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
  if (s.startsWith('bieu:')) return s;
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

/**
 * Rút mọi cauId bắt buộc phải đọc của nút `nutId` theo đúng chuẩn M-51 (kiemSoVet)
 * và gom nội dung nguyên văn để in gọn vào prompt cho LLM.
 *
 * @param {object} pd
 * @param {object} nguonCau
 * @param {object} [tuyChon]
 * @param {boolean} [tuyChon.chiCapHienTai] Khi true (dùng ở XUONG_CAP): không lặp lại Phần/Chương/Nhóm và không lộ SEN của mã con sâu hơn.
 * @param {Set<string>} [tuyChon.daInMuc] Tránh in lặp các mục CHU_GIAI_PHAN_NHOM / SEN cấp Phần-Chương giữa nhiều nút con cùng cấp.
 */
function thuThapPhanPhaiDoc(pd, nguonCau, tuyChon = {}) {
  if (!pd || !Array.isArray(pd.trinhTu)) return { cauIds: [], doanVan: '' };
  const d = so(pd.id);
  const chiCapHienTai = Boolean(tuyChon?.chiCapHienTai);
  const daInMuc = tuyChon?.daInMuc instanceof Set ? tuyChon.daInMuc : null;
  const cauIds = [];
  const daThemCau = new Set();
  const dongPrompt = [];

  for (const step of pd.trinhTu) {
    const laBuocLuat = BUOC_PHAI_DOC_LUAT.has(step.buoc);
    const laBuocNhomSen = BUOC_PHAI_DOC_DAY_DU.has(step.buoc) && d.length >= 4;
    if (!laBuocLuat && !laBuocNhomSen) continue;
    if (step.buoc === 'CHU_GIAI_PHAN_NHOM' && d.length < 6) continue;

    const boQuaIn = chiCapHienTai && !['CHU_GIAI_PHAN_NHOM', 'SEN'].includes(step.buoc);
    const mucHopLe = [];
    for (const m of step.muc || []) {
      if (laBuocLuat && m.lop !== 'LUAT') continue;
      const mucId = m.id || m.nut;
      if (!mucId || String(mucId).startsWith('tb:')) continue;
      const dsCau = nguonCau.cauTheoNut.get(mucId) || [mucId];
      const cauTrongMuc = [];
      for (const cid of dsCau) {
        if (!daThemCau.has(cid)) {
          daThemCau.add(cid);
          cauIds.push(cid);
        }
        const chuCau = String(nguonCau.traCau(cid) || m.trich || '').replace(/\s+/g, ' ').trim();
        cauTrongMuc.push(`    - [${cid}] ${chuCau}`);
      }
      if (boQuaIn) continue;
      if (chiCapHienTai && step.buoc === 'SEN') {
        const mSenSo = /^sen:(\d+):/.exec(mucId);
        if (mSenSo && mSenSo[1].length > d.length) continue;
      }
      if (daInMuc) {
        if (daInMuc.has(mucId)) continue;
        daInMuc.add(mucId);
      }
      mucHopLe.push(`  * ${mucId} (${m.lop}${m.trang != null ? `, tr.${m.trang}` : ''}):\n${cauTrongMuc.join('\n')}`);
    }
    if (!boQuaIn && mucHopLe.length) {
      dongPrompt.push(`### ${step.buoc}\n${mucHopLe.join('\n')}`);
    }
  }

  return { cauIds, doanVan: dongPrompt.join('\n') };
}

function kiemTrichMang(trichArr, nguonCau) {
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
    cacheMap[cauId] = goc;
    const kt = kiemTrichHopLe({ nguon: cauId, trich: doan }, cacheMap);
    if (!kt.ok) {
      return { ok: false, lyDo: `trich[${i}] "${cauId}" không khớp nguyên văn (${kt.lyDo})` };
    }
  }
  return { ok: true, chuan: trichArr.map((t) => ({ cauId: String(t.cauId).trim(), doan: String(t.doan).trim() })) };
}

function rutNhom4TuKetQuaTimLuat(kqTim, ungVienMap, { phaiDocFn, thuMuc, tomTatMap }) {
  const items = Array.isArray(kqTim?.cuaVao) ? kqTim.cuaVao : [];
  const themNhom = (h4, ev) => {
    if (!/^\d{4}$/.test(h4)) return;
    const nutId = `bieu:${h4}`;
    let cur = ungVienMap.get(h4);
    if (!cur) {
      const pd = phaiDocFn(nutId, { thuMuc, dayDu: false });
      if (!pd) return;
      const tt = tomTatMap.get(nutId) || null;
      cur = {
        h4,
        id: nutId,
        ten: pd.ten || '',
        tomTat: tt ? {
          gom: (tt.gom || []).map((x) => x.y),
          khongGom: (tt.khongGom || []).map((x) => ({ y: x.y, den: x.den || [] })),
        } : null,
        chungCu: [],
      };
      ungVienMap.set(h4, cur);
    }
    if (!cur.chungCu.some((x) => x.cauId === ev.cauId)) {
      cur.chungCu.push(ev);
    }
  };

  for (const it of items) {
    if (!it || String(it.nut || '').startsWith('tb:') || it.lop === 'TIEN_LE') continue;
    const ev = { nut: it.nut, cauId: it.cauId, cau: it.cau, chieu: it.chieu };
    const mMa = /^(?:bieu|nhom|pn|sen):(\d{4,8})\b/.exec(it.nut || '');
    if (mMa) {
      themNhom(mMa[1].slice(0, 4), ev);
      continue;
    }
    // Nút cấp Phần / Chương có câu nhắc nhóm 4 số cụ thể (vd "nhóm 76.16")
    const chMatch = /^chuong:(\d{2}):/.exec(it.nut || '');
    for (const dm of String(it.cau || '').matchAll(/\b(\d{2})\.(\d{2})\b/g)) {
      const h4 = `${dm[1]}${dm[2]}`;
      if (!chMatch || h4.startsWith(chMatch[1])) themNhom(h4, ev);
    }
  }
}

function chuanHoaKetLuanLoi(trangThai, { bac = 0, ma = null, so, hoi = null, soLuotLLM, soKyTuDaDoc, thieuKho, thongKeBuoc, loiSo = [] }) {
  return {
    trangThai,
    bac,
    ma,
    so,
    hoi,
    soLuotLLM,
    soKyTuDaDoc,
    thieuKho,
    thongKeBuoc,
    loiSo,
  };
}

/**
 * Động cơ đọc luật trước, kết luận sau.
 *
 * @param {object} opts
 * @param {string|object} opts.moTa     Mô tả hàng hoá gốc của khách
 * @param {Function} opts.goiLLM        Hàm bất đồng bộ hoặc đồng bộ (buoc, { prompt, schema, duLieu, nhietDo: 0 }) => JSON
 * @param {object} [opts.kho]           Kho & dịch vụ: { thuMuc, timLuatFn, timNghiaFn, phaiDocFn, kiemSoVetFn, tomTat }
 * @param {object} [opts.gioiHan]       Các ngưỡng an toàn (toiDaCumTim, toiDaTimLai, toiDaNhomDoc, cauMoiLuotKiem, toiDaChuyenHuong, toiDaQuayLui, toiDaLuotLLM)
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

  const thieuKho = [];
  if (!nguonCau.nghiaCanh?.coTep) thieuKho.push(KHO_THIEU_MAC_DINH.NGHIA_CANH);
  if (!tomTatRes.coTep) thieuKho.push(KHO_THIEU_MAC_DINH.TOM_TAT);
  if (!timNghiaFn) thieuKho.push(KHO_THIEU_MAC_DINH.TIM_NGHIA);

  const soVet = taoSoVet({
    moTaKhach,
    nguon: { dongCo: 'engine-doc-luat', thieuKho: [...thieuKho] },
  });

  let soLuotLLM = 0;
  let soKyTuDaDoc = 0;
  const thongKeBuocMap = new Map();

  const ghiThongKe = (buoc, promptLen) => {
    let entry = thongKeBuocMap.get(buoc);
    if (!entry) {
      entry = { buoc, soLuot: 0, soKyTu: 0 };
      thongKeBuocMap.set(buoc, entry);
    }
    entry.soLuot += 1;
    entry.soKyTu += promptLen;
  };

  const thongKeBuoc = () => [...thongKeBuocMap.values()];

  async function goiBuoc(buoc, payload) {
    if (soLuotLLM >= gh.toiDaLuotLLM) {
      throw new Error(`VUOT_GIOI_HAN_LUOT_LLM:${gh.toiDaLuotLLM}`);
    }
    const prompt = String(payload?.prompt || '');
    soLuotLLM += 1;
    soKyTuDaDoc += prompt.length;
    ghiThongKe(buoc, prompt.length);
    const raw = await goiLLM(buoc, {
      ...payload,
      prompt,
      nhietDo: 0,
    });
    return parseJsonAnToan(raw);
  }

  /** Gọi LLM cho 1 bước kèm kiểm tra; sai thì trả lại đúng bước đó cho làm lại đúng 1 lần. */
  async function goiVaKiem(buoc, taoGoi, kiemFn) {
    const kq1 = await goiBuoc(buoc, taoGoi({ thuLai: false, loiTruoc: null }));
    const v1 = kiemFn(kq1);
    if (v1.ok) return { ok: true, duLieu: v1.duLieu || kq1 };

    const kq2 = await goiBuoc(buoc, taoGoi({ thuLai: true, loiTruoc: v1.loi }));
    const v2 = kiemFn(kq2);
    if (v2.ok) return { ok: true, duLieu: v2.duLieu || kq2 };
    return { ok: false, loi: v2.loi };
  }

  const traKetQuaSoHong = (loiSo) => {
    soVet.loi = loiSo;
    return chuanHoaKetLuanLoi('SO_KHONG_DAT', {
      bac: 0,
      ma: null,
      so: soVet,
      hoi: null,
      soLuotLLM,
      soKyTuDaDoc,
      thieuKho,
      thongKeBuoc: thongKeBuoc(),
      loiSo,
    });
  };

  const traKetQuaHoi = (bac, ma, hoiObj) => chuanHoaKetLuanLoi('HOI', {
    bac,
    ma: ma || null,
    so: soVet,
    hoi: { ...hoiObj, bac },
    soLuotLLM,
    soKyTuDaDoc,
    thieuKho,
    thongKeBuoc: thongKeBuoc(),
    loiSo: [],
  });

  if (!moTaKhach) {
    ghiBuoc(soVet, {
      loai: 'VAO_CUA',
      nut: 'cua-vao',
      cungCapDaThay: [],
      daDoc: [],
      trich: [],
      chuKhach: '(trống)',
      quyetDinh: { trangThai: 'MO_TA_RONG' },
      daSoKhongChon: [],
      quyTacGir: 'QT1',
    });
    const cauHoi = 'Mô tả hàng hoá đang trống — vui lòng cung cấp tên hàng, chất liệu và công dụng.';
    ghiBuoc(soVet, {
      loai: 'HOI',
      nut: 'cua-vao',
      cungCapDaThay: [],
      daDoc: [],
      trich: [],
      chuKhach: '(trống)',
      quyetDinh: { trangThai: 'DUNG_HOI', cauHoi },
      daSoKhongChon: [],
      quyTacGir: 'QT1',
    });
    ghiBuoc(soVet, {
      loai: 'KET_LUAN',
      nut: 'cua-vao',
      cungCapDaThay: [],
      daDoc: [],
      trich: [],
      chuKhach: '(trống)',
      quyetDinh: { trangThai: 'DUNG_HOI', maHs: '' },
      daSoKhongChon: [],
      quyTacGir: 'QT1',
    });
    return traKetQuaHoi(0, null, {
      cauHoi,
      duKienThieu: ['tên hàng', 'chất liệu', 'công dụng'],
      haiNhanhPhanVan: [],
      lyDo: 'MO_TA_RONG',
    });
  }

  // ── BƯỚC 1: VAO_CUA ───────────────────────────────────────────────────────────────────────────────────────────────
  const vaoCuaRes = await goiVaKiem(
    'VAO_CUA',
    ({ thuLai, loiTruoc }) => ({
      prompt: [
        'BƯỚC VAO_CUA: Đọc mô tả khách nguyên văn bên dưới (KHÔNG đoán mã HS).',
        'Nêu bản chất hàng (là gì, vật liệu, chức năng, dùng với máy nào, dạng/trạng thái) kèm chữ khách nguyên văn, kê chuaBiet, và đưa ≤ 6 cụm chữ để tìm trong kho luật gốc.',
        thuLai ? `LẦN TRƯỚC BỊ TRẢ LẠI VÌ: ${loiTruoc}. Hãy sửa đúng khuôn.` : '',
        `MÔ TẢ KHÁCH: ${moTaKhach}`,
      ].filter(Boolean).join('\n'),
      schema: { banChat: [{ y: 'string', chuKhach: 'string' }], chuaBiet: ['string'], cumTim: ['string'] },
      duLieu: { moTaKhach },
    }),
    (out) => {
      if (!out || typeof out !== 'object') return { ok: false, loi: 'VAO_CUA không trả JSON hợp lệ' };
      const cumTim = Array.isArray(out.cumTim) ? out.cumTim.map((x) => String(x || '').trim()).filter((x) => x.length >= 2) : [];
      const banChat = Array.isArray(out.banChat) ? out.banChat.filter((x) => x && x.y && x.chuKhach) : [];
      if (!banChat.length) return { ok: false, loi: 'VAO_CUA thiếu banChat kèm chuKhach nguyên văn' };
      if (!cumTim.length) return { ok: false, loi: 'VAO_CUA thiếu cumTim (cần ít nhất 1 cụm từ khoá ≥ 2 ký tự)' };
      return { ok: true, duLieu: { ...out, banChat, cumTim: cumTim.slice(0, gh.toiDaCumTim) } };
    },
  );
  if (!vaoCuaRes.ok) return traKetQuaSoHong([vaoCuaRes.loi]);

  const vaoCua = vaoCuaRes.duLieu;
  const ungVienMap = new Map();
  const chayTimCum = (dsCum) => {
    for (const cum of dsCum.slice(0, gh.toiDaCumTim)) {
      const kq = timLuatFn(cum, { thuMuc: dir, limit: 15, timNghia: timNghiaFn });
      rutNhom4TuKetQuaTimLuat(kq, ungVienMap, { phaiDocFn, thuMuc: dir, tomTatMap: tomTatRes.map });
    }
  };
  chayTimCum(vaoCua.cumTim);

  // Tìm rỗng → HOI ở bậc 0, không đoán mã
  if (ungVienMap.size === 0) {
    const cauHoiTimRong = 'Không tìm thấy nhóm luật nào nhắc tới cụm từ mô tả hàng — vui lòng nêu rõ tên gọi thông thường, vật liệu cấu tạo và công dụng của hàng.';
    ghiBuoc(soVet, {
      loai: 'VAO_CUA',
      nut: 'cua-vao',
      cungCapDaThay: [],
      daDoc: [],
      trich: [],
      chuKhach: vaoCua.banChat.map((x) => x.chuKhach).join('; ') || moTaKhach,
      quyetDinh: { trangThai: 'TIM_RONG', cumTim: vaoCua.cumTim },
      daSoKhongChon: [],
      quyTacGir: 'QT1',
    });
    ghiBuoc(soVet, {
      loai: 'HOI',
      nut: 'cua-vao',
      cungCapDaThay: [],
      daDoc: [],
      trich: [],
      chuKhach: moTaKhach,
      quyetDinh: { trangThai: 'DUNG_HOI', cauHoi: cauHoiTimRong },
      daSoKhongChon: [],
      quyTacGir: 'QT1',
    });
    ghiBuoc(soVet, {
      loai: 'KET_LUAN',
      nut: 'cua-vao',
      cungCapDaThay: [],
      daDoc: [],
      trich: [],
      chuKhach: moTaKhach,
      quyetDinh: { trangThai: 'DUNG_HOI', maHs: '' },
      daSoKhongChon: [],
      quyTacGir: 'QT1',
    });
    const kqKiemRong = kiemSoVetFn(soVet, { thuMuc: dir, phaiDocFn });
    if (!kqKiemRong.dat) return traKetQuaSoHong(kqKiemRong.thieu);
    return traKetQuaHoi(0, null, {
      cauHoi: cauHoiTimRong,
      duKienThieu: Array.isArray(vaoCua.chuaBiet) && vaoCua.chuaBiet.length ? vaoCua.chuaBiet : ['tên hàng', 'vật liệu', 'công dụng'],
      haiNhanhPhanVan: [],
      lyDo: 'TIM_RONG',
    });
  }

  // ── BƯỚC 2: CHON_UNG_VIEN (chọn ≤ 3 nhóm 4 số đọc kỹ hoặc xin tìm lại ≤ 2 lần) ──────────────────────────────────
  let soLanTimLai = 0;
  let chonUv = null;
  while (true) {
    const danhSachUv = [...ungVienMap.values()];
    const uvIds = new Set(danhSachUv.map((x) => x.h4));
    const choPhepTimLai = soLanTimLai < gh.toiDaTimLai;

    const uvPromptBlock = danhSachUv.map((u) => {
      const tom = u.tomTat
        ? ` | tóm tắt(BO_TRO): gồm=[${u.tomTat.gom.join('; ')}], không gồm=[${u.tomTat.khongGom.map((k) => k.y).join('; ')}]`
        : '';
      const evs = u.chungCu.slice(0, 4).map((c) => `  - [${c.cauId}|${c.chieu}] ${c.cau}`).join('\n');
      return `* Nhóm ${u.h4} (${u.id}): ${u.ten}${tom}\n${evs}`;
    }).join('\n');

    const resUv = await goiVaKiem(
      'CHON_UNG_VIEN',
      ({ thuLai, loiTruoc }) => ({
        prompt: [
          `BƯỚC CHON_UNG_VIEN: Dưới đây là ${danhSachUv.length} nhóm 4 số được câu luật nhắc tới (KHÔNG phải đáp án sẵn).`,
          `Chọn 1..${gh.toiDaNhomDoc} nhóm để đọc kỹ, hoặc HOI, hoặc ${choPhepTimLai ? `TIM_LAI (còn ${gh.toiDaTimLai - soLanTimLai} lượt)` : '(đã hết lượt tìm lại, phải DOC_KY hoặc HOI)'}.`,
          'Nếu DOC_KY: bắt buộc ghi boQua nêu rõ vì sao bỏ TỪNG nhóm còn lại (một câu cho mỗi nhóm không chọn).',
          thuLai ? `LẦN TRƯỚC BỊ TRẢ LẠI VÌ: ${loiTruoc}. Hãy sửa lại.` : '',
          `MÔ TẢ KHÁCH: ${moTaKhach}`,
          uvPromptBlock,
        ].filter(Boolean).join('\n'),
        schema: {
          hanhDong: 'DOC_KY | TIM_LAI | HOI',
          nhomChon: ['string'],
          boQua: [{ nhom: 'string', lyDo: 'string' }],
          cumTim: ['string'],
          cauHoi: 'string',
        },
        duLieu: {
          ungVien: danhSachUv.map((u) => ({ h4: u.h4, id: u.id, ten: u.ten, tomTat: u.tomTat, chungCu: u.chungCu })),
          choPhepTimLai,
        },
      }),
      (out) => {
        if (!out || typeof out !== 'object') return { ok: false, loi: 'CHON_UNG_VIEN không trả JSON hợp lệ' };
        const hd = String(out.hanhDong || '').trim().toUpperCase();
        if (hd === 'TIM_LAI') {
          if (!choPhepTimLai) return { ok: false, loi: 'đã hết lượt TIM_LAI tối đa (2 lần)' };
          const cum = Array.isArray(out.cumTim) ? out.cumTim.map((x) => String(x || '').trim()).filter((x) => x.length >= 2) : [];
          if (!cum.length) return { ok: false, loi: 'TIM_LAI thiếu cumTim' };
          return { ok: true, duLieu: { ...out, hanhDong: 'TIM_LAI', cumTim: cum.slice(0, gh.toiDaCumTim) } };
        }
        if (hd === 'HOI') {
          if (!String(out.cauHoi || '').trim()) return { ok: false, loi: 'HOI thiếu cauHoi' };
          return { ok: true, duLieu: { ...out, hanhDong: 'HOI' } };
        }
        if (hd !== 'DOC_KY') return { ok: false, loi: `hanhDong "${hd}" không hợp lệ ở CHON_UNG_VIEN` };

        const chon = Array.isArray(out.nhomChon) ? [...new Set(out.nhomChon.map((x) => so(x).slice(0, 4)).filter(Boolean))] : [];
        if (!chon.length || chon.length > gh.toiDaNhomDoc) {
          return { ok: false, loi: `nhomChon phải có từ 1 đến ${gh.toiDaNhomDoc} nhóm` };
        }
        const ngoai = chon.filter((h) => !uvIds.has(h));
        if (ngoai.length) return { ok: false, loi: `chọn nhóm ngoài danh sách ứng viên: ${ngoai.join(', ')}` };

        const boQuaArr = Array.isArray(out.boQua) ? out.boQua : [];
        const boQuaMap = new Map(boQuaArr.map((x) => [so(x?.nhom).slice(0, 4), String(x?.lyDo || '').trim()]));
        const conLai = [...uvIds].filter((h) => !chon.includes(h));
        const thieuLyDo = conLai.filter((h) => !boQuaMap.get(h));
        if (thieuLyDo.length) {
          return { ok: false, loi: `thiếu giải thích vì sao bỏ nhóm còn lại: ${thieuLyDo.join(', ')}` };
        }
        return { ok: true, duLieu: { ...out, hanhDong: 'DOC_KY', nhomChon: chon, boQua: boQuaArr } };
      },
    );
    if (!resUv.ok) return traKetQuaSoHong([resUv.loi]);

    if (resUv.duLieu.hanhDong === 'TIM_LAI') {
      soLanTimLai += 1;
      chayTimCum(resUv.duLieu.cumTim);
      continue;
    }
    chonUv = resUv.duLieu;
    break;
  }

  if (chonUv.hanhDong === 'HOI') {
    ghiBuoc(soVet, {
      loai: 'VAO_CUA',
      nut: 'cua-vao',
      cungCapDaThay: [...ungVienMap.values()].map((x) => x.id),
      daDoc: [],
      trich: [],
      chuKhach: vaoCua.banChat.map((x) => x.chuKhach).join('; ') || moTaKhach,
      quyetDinh: { trangThai: 'CAN_HOI_CHON_UNG_VIEN' },
      daSoKhongChon: [],
      quyTacGir: 'QT1',
    });
    ghiBuoc(soVet, {
      loai: 'HOI',
      nut: 'cua-vao',
      cungCapDaThay: [...ungVienMap.values()].map((x) => x.id),
      daDoc: [],
      trich: [],
      chuKhach: moTaKhach,
      quyetDinh: { trangThai: 'DUNG_HOI', cauHoi: chonUv.cauHoi },
      daSoKhongChon: [],
      quyTacGir: 'QT1',
    });
    ghiBuoc(soVet, {
      loai: 'KET_LUAN',
      nut: 'cua-vao',
      cungCapDaThay: [...ungVienMap.values()].map((x) => x.id),
      daDoc: [],
      trich: [],
      chuKhach: moTaKhach,
      quyetDinh: { trangThai: 'DUNG_HOI', maHs: '' },
      daSoKhongChon: [],
      quyTacGir: 'QT1',
    });
    const kqKiemUv = kiemSoVetFn(soVet, { thuMuc: dir, phaiDocFn });
    if (!kqKiemUv.dat) return traKetQuaSoHong(kqKiemUv.thieu);
    return traKetQuaHoi(0, null, {
      cauHoi: chonUv.cauHoi,
      duKienThieu: Array.isArray(chonUv.duKienThieu) ? chonUv.duKienThieu : [],
      haiNhanhPhanVan: Array.isArray(chonUv.haiNhanhPhanVan) ? chonUv.haiNhanhPhanVan : [],
    });
  }

  // Ghi nhớ sổ tay theo từng bước để Bước 4/5/6 luôn có dữ kiện chuẩn
  const daBiLoai = new Set();
  const daKiemNhom = new Set();
  const pdNhomCache = new Map();
  const chuongDaMoCua = new Set();
  const nhomSong = [];
  let soLanChuyenHuong = 0;

  const docVaKiemMotNhom = async (h4) => {
    if (daKiemNhom.has(h4) || daBiLoai.has(h4)) return { trangThai: 'DA_QUA' };
    daKiemNhom.add(h4);

    const nutNhom = `bieu:${h4}`;
    const pd = phaiDocFn(nutNhom, { thuMuc: dir, dayDu: true });
    if (!pd) return { trangThai: 'KHONG_CO_NUT' };
    pdNhomCache.set(h4, pd);

    const ch2 = h4.slice(0, 2);
    const nutChuong = `bieu:${ch2}`;
    const pdChuong = phaiDocFn(nutChuong, { thuMuc: dir, dayDu: true });
    const cungCapChuong = (pdChuong?.capDuoi || []).map((x) => x.id);

    // Mở cửa chương một lần nếu chưa mở (gồm toàn bộ chữ Chương/Phần từ phaiDoc)
    if (!chuongDaMoCua.has(ch2) && pdChuong) {
      chuongDaMoCua.add(ch2);
      const { cauIds: cauIdsChuong } = thuThapPhanPhaiDoc(pdChuong, nguonCau);
      const cauIdsChuongGoc = [...cauIdsChuong];
      const bieuChCau = nguonCau.cauTheoNut.get(nutChuong)?.[0] || `${nutChuong}#1`;
      const tenChuongText = String(nguonCau.traCau(bieuChCau) || pdChuong.ten || '').trim();
      ghiBuoc(soVet, {
        loai: 'VAO_CUA',
        nut: nutChuong,
        cungCapDaThay: [nutChuong],
        daDoc: cauIdsChuongGoc,
        trich: tenChuongText ? [{ cauId: bieuChCau, doan: tenChuongText }] : [],
        chuKhach: vaoCua.banChat.map((x) => x.chuKhach).join('; ') || moTaKhach,
        quyetDinh: { trangThai: 'MO_CUA', nutDich: nutChuong, cumTim: vaoCua.cumTim },
        daSoKhongChon: (chonUv.boQua || []).map((b) => ({
          nut: chuanNutBieu(b.nhom) || String(b.nhom),
          viSaoKhongChon: String(b.lyDo || ''),
        })),
        quyTacGir: 'QT1',
      });
    }

    // Bước KIEM cạnh loại trừ (chia lô ≤ 25 câu, gộp theo cauId)
    const { cauIds: cauIdsNhom, doanVan: vanBanNhom } = thuThapPhanPhaiDoc(pd, nguonCau);
    const { canh: dsCanhBatBuoc } = layCanhKiemBatBuoc(pd, nguonCau);

    // Gộp cạnh theo cauId thành từng câu cần kiểm
    const canhTheoCau = new Map();
    for (const c of dsCanhBatBuoc) {
      let g = canhTheoCau.get(c.cauId);
      if (!g) {
        g = {
          cauId: c.cauId,
          cau: String(nguonCau.traCau(c.cauId) || '').replace(/\s+/g, ' ').trim(),
          cacDich: [],
          dieuKien: c.dieuKien || '',
        };
        canhTheoCau.set(c.cauId, g);
      }
      if (!g.cacDich.includes(c.nutDich)) g.cacDich.push(c.nutDich);
    }
    const dsCauKiem = [...canhTheoCau.values()];
    const kiemCanhTong = [];
    const danhSachThoa = [];
    const danhSachChuaBiet = [];

    for (let idx = 0; idx < dsCauKiem.length; idx += gh.cauMoiLuotKiem) {
      const loCau = dsCauKiem.slice(idx, idx + gh.cauMoiLuotKiem);
      const loCauIds = loCau.map((x) => x.cauId);
      const loPrompt = loCau.map((x, k) => `${k + 1}. [${x.cauId}] (đích: ${x.cacDich.join(', ')})${x.dieuKien ? ` | điều kiện: ${x.dieuKien}` : ''}\n   ${x.cau}`).join('\n');

      const resKiem = await goiVaKiem(
        'KIEM',
        ({ thuLai, loiTruoc }) => ({
          prompt: [
            `BƯỚC KIEM (${nutNhom}, lô ${Math.floor(idx / gh.cauMoiLuotKiem) + 1}): Kiểm từng câu/cạnh loại trừ bên dưới đối với hàng hoá.`,
            'Với MỖI cauId trong lô: trả ketQua ∈ {"THOA","KHONG","CHUA_BIET"} kèm chuKhach nguyên văn làm căn cứ.',
            'Nếu có câu THOA → ghi thêm chuyenHuong: { nutDich, trich: [{cauId, doan}] }.',
            thuLai ? `LẦN TRƯỚC BỊ TRẢ LẠI VÌ: ${loiTruoc}. Phải trả đủ mọi cauId và trích nguyên văn.` : '',
            `MÔ TẢ KHÁCH: ${moTaKhach}`,
            vanBanNhom,
            'CÁC CÂU/CẠNH PHẢI KIỂM:',
            loPrompt,
          ].filter(Boolean).join('\n'),
          schema: {
            kiemCanh: [{ cauId: 'string', ketQua: 'THOA|KHONG|CHUA_BIET', chuKhach: 'string', nutDich: 'string' }],
            chuyenHuong: { nutDich: 'string', trich: [{ cauId: 'string', doan: 'string' }], lyDo: 'string' },
            hoi: { cauHoi: 'string', duKienThieu: ['string'], trich: [{ cauId: 'string', doan: 'string' }] },
          },
          duLieu: { nut: nutNhom, loCau },
        }),
        (out) => {
          if (!out || typeof out !== 'object') return { ok: false, loi: 'KIEM không trả JSON hợp lệ' };
          const arr = Array.isArray(out.kiemCanh) ? out.kiemCanh : null;
          if (!arr) return { ok: false, loi: 'KIEM thiếu mảng kiemCanh' };
          const mapTraLoi = new Map();
          for (const item of arr) {
            const cid = String(item?.cauId || '').trim();
            const kq = chuanHoaTraLoiCanh(item?.ketQua);
            const ck = String(item?.chuKhach || '').trim();
            if (!cid || !kq || !ck) {
              return { ok: false, loi: `KIEM mục "${cid || '?'}" thiếu ketQua hợp lệ (THOA/KHONG/CHUA_BIET) hoặc thiếu chuKhach` };
            }
            mapTraLoi.set(cid, { ...item, cauId: cid, ketQua: kq, chuKhach: ck });
          }
          const thieu = loCauIds.filter((cid) => !mapTraLoi.has(cid));
          if (thieu.length) {
            return { ok: false, loi: `KIEM bỏ sót ${thieu.length} câu cần kiểm: ${thieu.join(', ')}` };
          }
          const thoa = [...mapTraLoi.values()].filter((x) => x.ketQua === 'THOA');
          if (thoa.length > 0) {
            const ch = out.chuyenHuong;
            const dich = chuanNutBieu(ch?.nutDich || thoa[0].nutDich || canhTheoCau.get(thoa[0].cauId)?.cacDich?.[0]);
            if (!dich) return { ok: false, loi: 'KIEM có THOA nhưng thiếu nutDich chuyển hướng' };
            if (ch?.trich) {
              const kt = kiemTrichMang(ch.trich, nguonCau);
              if (!kt.ok) return { ok: false, loi: `KIEM chuyenHuong: ${kt.lyDo}` };
            }
          }
          if (out.hoi?.trich) {
            const ktHoi = kiemTrichMang(out.hoi.trich, nguonCau);
            if (!ktHoi.ok) return { ok: false, loi: `KIEM hoi: ${ktHoi.lyDo}` };
          }
          return { ok: true, duLieu: { ...out, kiemCanh: loCauIds.map((cid) => mapTraLoi.get(cid)) } };
        },
      );
      if (!resKiem.ok) return { trangThai: 'SO_KHONG_DAT', loi: [resKiem.loi] };

      for (const item of resKiem.duLieu.kiemCanh) {
        kiemCanhTong.push({
          cauId: item.cauId,
          gopTheoCau: true,
          ketQua: item.ketQua,
          chuKhach: item.chuKhach,
        });
        if (item.ketQua === 'THOA') danhSachThoa.push({ item, chuyenHuong: resKiem.duLieu.chuyenHuong });
        else if (item.ketQua === 'CHUA_BIET') danhSachChuaBiet.push({ item, hoi: resKiem.duLieu.hoi });
      }
    }

    const firstTrichId = cauIdsNhom[0] || `${nutNhom}#1`;
    const firstTrichText = String(nguonCau.traCau(firstTrichId) || pd.ten || '').trim();
    const trichKiem = firstTrichText ? [{ cauId: firstTrichId, doan: firstTrichText }] : [];

    ghiBuoc(soVet, {
      loai: 'KIEM',
      nut: nutNhom,
      cungCapDaThay: cungCapChuong,
      daDoc: cauIdsNhom,
      trich: trichKiem,
      chuKhach: danhSachThoa[0]?.item?.chuKhach
        || danhSachChuaBiet[0]?.item?.chuKhach
        || kiemCanhTong[0]?.chuKhach
        || moTaKhach,
      quyetDinh: {
        trangThai: danhSachThoa.length ? 'LOAI_CHUYEN_HUONG' : (danhSachChuaBiet.length ? 'CAN_HOI_KHACH' : 'THONG_QUA_LOAI_TRU'),
        nutDich: nutNhom,
      },
      daSoKhongChon: [],
      kiemCanh: kiemCanhTong,
      quyTacGir: 'QT1',
    });

    if (danhSachThoa.length > 0) {
      daBiLoai.add(h4);
      const firstThoa = danhSachThoa[0];
      const canhGoc = canhTheoCau.get(firstThoa.item.cauId);
      const nutDich = chuanNutBieu(
        firstThoa.chuyenHuong?.nutDich
        || firstThoa.item.nutDich
        || canhGoc?.cacDich?.[0],
      );
      const cauThoaText = String(nguonCau.traCau(firstThoa.item.cauId) || firstTrichText || '').trim();
      const trichChuyen = firstThoa.chuyenHuong?.trich?.length
        ? firstThoa.chuyenHuong.trich
        : [{ cauId: firstThoa.item.cauId, doan: cauThoaText }];

      ghiBuoc(soVet, {
        loai: 'CHUYEN_HUONG',
        nut: nutNhom,
        cungCapDaThay: [nutNhom, nutDich],
        daDoc: [firstThoa.item.cauId],
        trich: trichChuyen,
        chuKhach: firstThoa.item.chuKhach,
        quyetDinh: {
          trangThai: 'CHUYEN_HUONG',
          nutDich,
          lyDo: firstThoa.chuyenHuong?.lyDo || `Thoả điều kiện loại trừ tại ${firstThoa.item.cauId}`,
        },
        daSoKhongChon: [{ nut: nutNhom, viSaoKhongChon: `Loại khỏi ${nutNhom} theo ${firstThoa.item.cauId}` }],
        quyTacGir: 'QT1',
      });
      return { trangThai: 'CHUYEN_HUONG', nutDich };
    }

    if (danhSachChuaBiet.length > 0) {
      const firstCb = danhSachChuaBiet[0];
      const cauCbText = String(nguonCau.traCau(firstCb.item.cauId) || firstTrichText || '').trim();
      const trichHoi = firstCb.hoi?.trich?.length
        ? firstCb.hoi.trich
        : [{ cauId: firstCb.item.cauId, doan: cauCbText }];
      const cauHoi = String(firstCb.hoi?.cauHoi || `Cần bổ sung dữ kiện để xác định điều kiện tại ${firstCb.item.cauId}: "${cauCbText}"`).trim();
      const duKienThieu = Array.isArray(firstCb.hoi?.duKienThieu) && firstCb.hoi.duKienThieu.length
        ? firstCb.hoi.duKienThieu
        : [firstCb.item.cauId];

      ghiBuoc(soVet, {
        loai: 'HOI',
        nut: nutNhom,
        cungCapDaThay: [nutNhom],
        daDoc: [firstCb.item.cauId],
        trich: trichHoi,
        chuKhach: firstCb.item.chuKhach,
        quyetDinh: { trangThai: 'DUNG_HOI', cauHoi },
        daSoKhongChon: [],
        quyTacGir: 'QT1',
      });
      ghiBuoc(soVet, {
        loai: 'KET_LUAN',
        nut: nutNhom,
        cungCapDaThay: [nutNhom],
        daDoc: [firstCb.item.cauId],
        trich: trichHoi,
        chuKhach: firstCb.item.chuKhach,
        quyetDinh: { trangThai: 'DUNG_HOI', maHs: h4 },
        daSoKhongChon: [],
        quyTacGir: 'QT1',
      });
      return {
        trangThai: 'HOI',
        bac: 4,
        ma: h4,
        hoi: {
          cauHoi,
          duKienThieu,
          haiNhanhPhanVan: [nutNhom, ...(canhTheoCau.get(firstCb.item.cauId)?.cacDich || [])],
        },
      };
    }

    nhomSong.push(h4);
    return { trangThai: 'SONG' };
  };

  // Duyệt hàng đợi nhóm 4 số + chuyển hướng (cấm quay lại nhóm đã bị loại)
  const hangDoi = [...chonUv.nhomChon];
  while (hangDoi.length > 0) {
    const h4 = hangDoi.shift();
    if (daBiLoai.has(h4) || daKiemNhom.has(h4)) continue;
    const kqKiemNhom = await docVaKiemMotNhom(h4);
    if (kqKiemNhom.trangThai === 'SO_KHONG_DAT') {
      return traKetQuaSoHong(kqKiemNhom.loi);
    }
    if (kqKiemNhom.trangThai === 'HOI') {
      const kqSvHoi = kiemSoVetFn(soVet, { thuMuc: dir, phaiDocFn });
      if (!kqSvHoi.dat) return traKetQuaSoHong(kqSvHoi.thieu);
      return traKetQuaHoi(4, kqKiemNhom.ma, kqKiemNhom.hoi);
    }
    if (kqKiemNhom.trangThai === 'CHUYEN_HUONG') {
      soLanChuyenHuong += 1;
      if (soLanChuyenHuong > gh.toiDaChuyenHuong) {
        return traKetQuaSoHong([`Vượt quá giới hạn chuyển hướng (${gh.toiDaChuyenHuong} lần).`]);
      }
      const dStr = so(kqKiemNhom.nutDich);
      const dichH4 = dStr.length >= 4 ? dStr.slice(0, 4) : null;
      if (dichH4 && !daBiLoai.has(dichH4) && !daKiemNhom.has(dichH4)) {
        hangDoi.unshift(dichH4);
      }
    }
  }

  if (nhomSong.length === 0) {
    const cauHoiEmpty = 'Các nhóm đã đọc đều rơi vào diện loại trừ — vui lòng bổ sung thông tin chi tiết về chức năng và cấu tạo hàng hoá.';
    ghiBuoc(soVet, {
      loai: 'HOI',
      nut: 'cua-vao',
      cungCapDaThay: [],
      daDoc: [],
      trich: [],
      chuKhach: moTaKhach,
      quyetDinh: { trangThai: 'DUNG_HOI', cauHoi: cauHoiEmpty },
      daSoKhongChon: [...daBiLoai].map((h) => ({ nut: `bieu:${h}`, viSaoKhongChon: 'Đã loại ở bước KIEM' })),
      quyTacGir: 'QT1',
    });
    ghiBuoc(soVet, {
      loai: 'KET_LUAN',
      nut: 'cua-vao',
      cungCapDaThay: [],
      daDoc: [],
      trich: [],
      chuKhach: moTaKhach,
      quyetDinh: { trangThai: 'DUNG_HOI', maHs: '' },
      daSoKhongChon: [],
      quyTacGir: 'QT1',
    });
    const kqSvEmpty = kiemSoVetFn(soVet, { thuMuc: dir, phaiDocFn });
    if (!kqSvEmpty.dat) return traKetQuaSoHong(kqSvEmpty.thieu);
    return traKetQuaHoi(4, null, { cauHoi: cauHoiEmpty, duKienThieu: ['chức năng', 'cấu tạo'], haiNhanhPhanVan: [] });
  }

  // ── BƯỚC 4 & 5 & 6: CHON_NHOM_4 → XUONG_CAP → KET_LUAN (có quay lui) ───────────────────────────────────────────
  const chonNhom4 = async () => {
    const nhomConSong = nhomSong.filter((h) => !daBiLoai.has(h));
    if (nhomConSong.length === 0) {
      return { ok: false, loi: 'Không còn nhóm 4 số nào chưa bị loại để chọn lại.' };
    }
    const uvSongIds = new Set(nhomConSong.map((h) => `bieu:${h}`));
    const dsSongInfo = nhomConSong.map((h) => {
      const pd = pdNhomCache.get(h) || phaiDocFn(`bieu:${h}`, { thuMuc: dir, dayDu: true });
      const { doanVan } = thuThapPhanPhaiDoc(pd, nguonCau);
      return `■ Nhóm ${h} (bieu:${h}): ${pd?.ten || ''}\n${doanVan}`;
    }).join('\n');

    const resChon4 = await goiVaKiem(
      'CHON_NHOM_4',
      ({ thuLai, loiTruoc }) => ({
        prompt: [
          `BƯỚC CHON_NHOM_4: Từ ${nhomConSong.length} nhóm đã đọc kỹ không bị loại (${nhomConSong.join(', ')}), chọn nhóm 4 số cuối cùng theo Quy tắc 1 (hoặc Quy tắc 2–5 và giải thích rõ vì sao Quy tắc 1 chưa đủ).`,
          'Bắt buộc kèm trích dẫn nguyên văn câu luật (cauId + doan) và nêu đã so nhóm nào, vì sao không chọn.',
          thuLai ? `LẦN TRƯỚC BỊ TRẢ LẠI VÌ: ${loiTruoc}. Hãy sửa đúng.` : '',
          `MÔ TẢ KHÁCH: ${moTaKhach}`,
          dsSongInfo,
        ].filter(Boolean).join('\n'),
        schema: {
          hanhDong: 'CHON | HOI',
          nutDich: 'string',
          quyTacGir: 'string',
          lyDoGir1ChuaDu: 'string',
          trich: [{ cauId: 'string', doan: 'string' }],
          chuKhach: 'string',
          daSoKhongChon: [{ nut: 'string', viSaoKhongChon: 'string' }],
          cauHoi: 'string',
          duKienThieu: ['string'],
          haiNhanhPhanVan: ['string'],
        },
        duLieu: { nhomSong: nhomConSong.map((h) => `bieu:${h}`) },
      }),
      (out) => {
        if (!out || typeof out !== 'object') return { ok: false, loi: 'CHON_NHOM_4 không trả JSON hợp lệ' };
        const hd = String(out.hanhDong || 'CHON').trim().toUpperCase();
        const ck = String(out.chuKhach || '').trim();
        if (!ck) return { ok: false, loi: 'CHON_NHOM_4 thiếu chuKhach' };
        const kt = kiemTrichMang(out.trich, nguonCau);
        if (!kt.ok) return { ok: false, loi: `CHON_NHOM_4: ${kt.lyDo}` };

        if (hd === 'HOI') {
          if (!String(out.cauHoi || '').trim()) return { ok: false, loi: 'CHON_NHOM_4 (HOI) thiếu cauHoi' };
          return { ok: true, duLieu: { ...out, hanhDong: 'HOI', trich: kt.chuan, chuKhach: ck } };
        }
        if (hd !== 'CHON') return { ok: false, loi: `hanhDong "${hd}" không hợp lệ ở CHON_NHOM_4` };

        const dich = chuanNutBieu(out.nutDich);
        const h4Dich = so(dich).slice(0, 4);
        if (!dich || (!uvSongIds.has(dich) && !phaiDocFn(dich, { thuMuc: dir, dayDu: false }))) {
          return { ok: false, loi: `nhóm "${out.nutDich}" không tồn tại` };
        }
        if (daBiLoai.has(h4Dich)) {
          return { ok: false, loi: `nhóm ${dich} đã bị loại ở bước KIEM, không được chọn lại` };
        }
        if (!uvSongIds.has(dich)) {
          return { ok: false, loi: `nhóm "${dich}" nằm ngoài nhóm ứng viên đã kiểm (${nhomConSong.map((h) => `bieu:${h}`).join(', ')})` };
        }
        const gir = String(out.quyTacGir || '').trim();
        if (!gir) return { ok: false, loi: 'CHON_NHOM_4 thiếu quyTacGir' };
        if (nhomConSong.length === 1 && /\b3\b|QT3|GIR\s*3/i.test(gir)) {
          return { ok: false, loi: 'QT1 đã còn 1 nhóm, cấm viện dẫn QT3' };
        }
        if (!/^(?:QT|GIR)?\s*1$/i.test(gir) && !String(out.lyDoGir1ChuaDu || '').trim()) {
          return { ok: false, loi: 'viện dẫn quy tắc ngoài QT1 phải nêu rõ lyDoGir1ChuaDu' };
        }
        const soKhac = Array.isArray(out.daSoKhongChon) ? out.daSoKhongChon : [];
        const nhomKhac = nhomConSong.filter((h) => h !== h4Dich);
        if (nhomKhac.length > 0 && soKhac.length === 0) {
          return { ok: false, loi: 'phải nêu daSoKhongChon với các nhóm đã so và vì sao không chọn' };
        }
        return { ok: true, duLieu: { ...out, hanhDong: 'CHON', nutDich: dich, h4Dich, quyTacGir: gir, trich: kt.chuan, chuKhach: ck, daSoKhongChon: soKhac } };
      },
    );
    return resChon4;
  };

  let resC4 = await chonNhom4();
  if (!resC4.ok) return traKetQuaSoHong([resC4.loi]);

  if (resC4.duLieu.hanhDong === 'HOI') {
    const d4 = resC4.duLieu;
    ghiBuoc(soVet, {
      loai: 'HOI',
      nut: nhomSong[0] ? `bieu:${nhomSong[0]}` : 'cua-vao',
      cungCapDaThay: nhomSong.map((h) => `bieu:${h}`),
      daDoc: d4.trich.map((t) => t.cauId),
      trich: d4.trich,
      chuKhach: d4.chuKhach,
      quyetDinh: { trangThai: 'DUNG_HOI', cauHoi: d4.cauHoi },
      daSoKhongChon: d4.daSoKhongChon || [],
      quyTacGir: d4.quyTacGir || 'QT1',
    });
    ghiBuoc(soVet, {
      loai: 'KET_LUAN',
      nut: nhomSong[0] ? `bieu:${nhomSong[0]}` : 'cua-vao',
      cungCapDaThay: nhomSong.map((h) => `bieu:${h}`),
      daDoc: [],
      trich: d4.trich,
      chuKhach: d4.chuKhach,
      quyetDinh: { trangThai: 'DUNG_HOI', maHs: nhomSong[0] || '' },
      daSoKhongChon: [],
      quyTacGir: d4.quyTacGir || 'QT1',
    });
    const kqSvH4 = kiemSoVetFn(soVet, { thuMuc: dir, phaiDocFn });
    if (!kqSvH4.dat) return traKetQuaSoHong(kqSvH4.thieu);
    return traKetQuaHoi(4, nhomSong[0] || null, {
      cauHoi: d4.cauHoi,
      duKienThieu: d4.duKienThieu || [],
      haiNhanhPhanVan: d4.haiNhanhPhanVan || nhomSong.map((h) => `bieu:${h}`),
    });
  }

  let lastNhom4Choice = resC4.duLieu;
  const ghiChonTang4 = (c4Data) => {
    const h4 = c4Data.h4Dich;
    const ch = h4.slice(0, 2);
    const pdChLocal = phaiDocFn(`bieu:${ch}`, { thuMuc: dir, dayDu: true });
    const pdH4 = pdNhomCache.get(h4) || phaiDocFn(`bieu:${h4}`, { thuMuc: dir, dayDu: true });
    const { cauIds: cauIdsH4 } = thuThapPhanPhaiDoc(pdH4, nguonCau);
    ghiBuoc(soVet, {
      loai: 'CHON',
      nut: `bieu:${ch}`,
      cungCapDaThay: (pdChLocal?.capDuoi || []).map((x) => x.id),
      daDoc: cauIdsH4,
      trich: c4Data.trich,
      chuKhach: c4Data.chuKhach,
      quyetDinh: {
        trangThai: 'CHON_TANG_4',
        nutDich: c4Data.nutDich,
        ...(c4Data.lyDoGir1ChuaDu ? { lyDoGir1ChuaDu: c4Data.lyDoGir1ChuaDu } : {}),
      },
      daSoKhongChon: c4Data.daSoKhongChon || [],
      quyTacGir: c4Data.quyTacGir,
    });
    return { h4, ch, pdChLocal, pdH4 };
  };

  const init4 = ghiChonTang4(lastNhom4Choice);
  let curH4 = init4.h4;
  let curCh = init4.ch;
  let pdCur = init4.pdH4;

  // Cập nhật qt1SoNhom trên sổ: nếu QT1 đủ 1 nhóm thì đặt 1 (cấm QT3)
  if (nhomSong.length === 1 && soVet.qt1SoNhom == null) {
    soVet.qt1SoNhom = 1;
    soVet.ungVienSauQt1 = [...nhomSong];
  } else if (nhomSong.length > 1 && soVet.qt1SoNhom == null) {
    soVet.qt1SoNhom = nhomSong.length;
    soVet.ungVienSauQt1 = [...nhomSong];
  }

  // Bước 5: Xuống cấp từng cấp gạch (KHÔNG bao giờ lộ cấp dưới trước khi chọn cấp trên)
  let curNut = resC4.duLieu.nutDich;
  let soLanQuayLui = 0;

  while (true) {
    pdCur = phaiDocFn(curNut, { thuMuc: dir, dayDu: true });
    if (!pdCur) return traKetQuaSoHong([`Không tìm thấy nút biểu thuế "${curNut}" trong phaiDoc().`]);
    const capDuoi = Array.isArray(pdCur.capDuoi) ? pdCur.capDuoi : [];
    if (capDuoi.length === 0) break;

    const capDuoiIds = capDuoi.map((x) => x.id);
    const tapCapDuoi = new Set(capDuoiIds);
    const childMaxDigits = Math.max(...capDuoi.map((x) => so(x.id).length));
    const bacBuoc = childMaxDigits <= 6 ? 6 : 8;

    // Thu thập tachVoi (M-36) + CHU_GIAI_PHAN_NHOM + SEN chỉ đúng cấp đang xét (KHÔNG lặp Phần/Chương hay lộ SEN mã con sâu hơn)
    const daInMucCap = new Set();
    const thongTinCon = capDuoi.map((c) => {
      const ttCon = tomTatRes.map.get(c.id);
      const pdCon = phaiDocFn(c.id, { thuMuc: dir, dayDu: true });
      const { cauIds: cidsCon, doanVan: vanCon } = thuThapPhanPhaiDoc(pdCon, nguonCau, {
        chiCapHienTai: true,
        daInMuc: daInMucCap,
      });
      const tvStr = ttCon?.tachVoi?.length
        ? `\n  Tách với (M-36 BO_TRO): ${ttCon.tachVoi.map((tv) => `với ${tv.voi}: ${tv.y} [${(tv.cau || []).join(',')}]`).join(' | ')}`
        : '';
      return {
        id: c.id,
        ma: c.ma,
        gach: c.gach,
        ten: c.ten,
        cauIds: cidsCon,
        promptText: `* ${c.id} (gạch=${c.gach}): ${c.ten}${tvStr}${vanCon ? `\n${vanCon}` : ''}`,
      };
    });

    const tachVoiCha = tomTatRes.map.get(curNut)?.tachVoi || [];
    const curDigits = so(curNut);
    const quayLuiHopLe = new Set([`bieu:${curCh}`]);
    if (curDigits.length > 4) quayLuiHopLe.add(`bieu:${curDigits.slice(0, 4)}`);
    if (curDigits.length > 6) quayLuiHopLe.add(`bieu:${curDigits.slice(0, 6)}`);

    const resCap = await goiVaKiem(
      'XUONG_CAP',
      ({ thuLai, loiTruoc }) => ({
        prompt: [
          `BƯỚC XUONG_CAP tại ${curNut} (bậc ${bacBuoc}): Chọn ĐÚNG MỘT nút con trực tiếp cùng cấp bên dưới (KHÔNG nhảy cấp), hoặc HOI nếu thiếu dữ kiện phân tách, hoặc QUAY_LUI nếu nút hiện tại không phù hợp.`,
          'Bắt buộc kèm trích nguyên văn cauId + doan, chuKhach, và daSoKhongChon.',
          thuLai ? `LẦN TRƯỚC BỊ TRẢ LẠI VÌ: ${loiTruoc}. Chỉ được chọn trong [${capDuoiIds.join(', ')}] và trích nguyên văn.` : '',
          `MÔ TẢ KHÁCH: ${moTaKhach}`,
          tachVoiCha.length ? `TÁCH VỚI CHA (${curNut}): ${tachVoiCha.map((t) => `${t.voi}: ${t.y}`).join(' | ')}` : '',
          `CÁC NÚT CON TRỰC TIẾP CÙNG CẤP CỦA ${curNut}:`,
          thongTinCon.map((x) => x.promptText).join('\n'),
        ].filter(Boolean).join('\n'),
        schema: {
          hanhDong: 'CHON | HOI | QUAY_LUI',
          nutDich: 'string',
          quyTacGir: 'string',
          trich: [{ cauId: 'string', doan: 'string' }],
          chuKhach: 'string',
          daSoKhongChon: [{ nut: 'string', viSaoKhongChon: 'string' }],
          lyDo: 'string',
          cauHoi: 'string',
          duKienThieu: ['string'],
          haiNhanhPhanVan: ['string'],
        },
        duLieu: {
          nut: curNut,
          bac: bacBuoc,
          capDuoi: thongTinCon.map((x) => ({ id: x.id, ma: x.ma, gach: x.gach, ten: x.ten })),
          quayLuiHopLe: [...quayLuiHopLe],
        },
      }),
      (out) => {
        if (!out || typeof out !== 'object') return { ok: false, loi: 'XUONG_CAP không trả JSON hợp lệ' };
        const hd = String(out.hanhDong || '').trim().toUpperCase();
        const ck = String(out.chuKhach || '').trim();
        if (!ck) return { ok: false, loi: 'XUONG_CAP thiếu chuKhach' };
        const kt = kiemTrichMang(out.trich, nguonCau);
        if (!kt.ok) return { ok: false, loi: `XUONG_CAP: ${kt.lyDo}` };

        if (hd === 'CHON') {
          const dich = chuanNutBieu(out.nutDich);
          if (!dich || !tapCapDuoi.has(dich)) {
            return { ok: false, loi: `nút "${out.nutDich}" nằm ngoài danh sách con cùng cấp [${capDuoiIds.join(', ')}]` };
          }
          return { ok: true, duLieu: { ...out, hanhDong: 'CHON', nutDich: dich, trich: kt.chuan, chuKhach: ck } };
        }
        if (hd === 'HOI') {
          if (!String(out.cauHoi || '').trim()) return { ok: false, loi: 'HOI thiếu cauHoi' };
          return { ok: true, duLieu: { ...out, hanhDong: 'HOI', trich: kt.chuan, chuKhach: ck } };
        }
        if (hd === 'QUAY_LUI') {
          const dich = chuanNutBieu(out.nutDich);
          const lyDo = String(out.lyDo || '').trim();
          if (lyDo.length < 6) return { ok: false, loi: 'QUAY_LUI thiếu lyDo (>= 6 ký tự)' };
          if (!dich || (!quayLuiHopLe.has(dich) && !phaiDocFn(dich, { thuMuc: dir, dayDu: false }))) {
            return { ok: false, loi: `QUAY_LUI nutDich "${out.nutDich}" không hợp lệ` };
          }
          if (daBiLoai.has(so(dich).slice(0, 4))) {
            return { ok: false, loi: `QUAY_LUI sang "${dich}" đã bị loại ở bước KIEM` };
          }
          return { ok: true, duLieu: { ...out, hanhDong: 'QUAY_LUI', nutDich: dich, lyDo, trich: kt.chuan, chuKhach: ck } };
        }
        return { ok: false, loi: `hanhDong "${hd}" không hợp lệ ở XUONG_CAP` };
      },
    );
    if (!resCap.ok) return traKetQuaSoHong([resCap.loi]);

    const dCap = resCap.duLieu;
    const girCap = String(dCap.quyTacGir || (bacBuoc >= 6 ? 'QT6' : 'QT1')).trim();

    if (dCap.hanhDong === 'HOI') {
      ghiBuoc(soVet, {
        loai: 'HOI',
        nut: curNut,
        cungCapDaThay: capDuoiIds,
        daDoc: dCap.trich.map((t) => t.cauId),
        trich: dCap.trich,
        chuKhach: dCap.chuKhach,
        quyetDinh: { trangThai: 'DUNG_HOI', cauHoi: dCap.cauHoi },
        daSoKhongChon: dCap.daSoKhongChon || [],
        quyTacGir: girCap,
      });
      ghiBuoc(soVet, {
        loai: 'KET_LUAN',
        nut: curNut,
        cungCapDaThay: capDuoiIds,
        daDoc: dCap.trich.map((t) => t.cauId),
        trich: dCap.trich,
        chuKhach: dCap.chuKhach,
        quyetDinh: { trangThai: 'DUNG_HOI', maHs: so(curNut) },
        daSoKhongChon: [],
        quyTacGir: girCap,
      });
      const kqSvHoi = kiemSoVetFn(soVet, { thuMuc: dir, phaiDocFn });
      if (!kqSvHoi.dat) return traKetQuaSoHong(kqSvHoi.thieu);
      return traKetQuaHoi(bacBuoc, so(curNut), {
        cauHoi: dCap.cauHoi,
        duKienThieu: Array.isArray(dCap.duKienThieu) ? dCap.duKienThieu : [],
        haiNhanhPhanVan: Array.isArray(dCap.haiNhanhPhanVan) && dCap.haiNhanhPhanVan.length
          ? dCap.haiNhanhPhanVan
          : capDuoiIds.slice(0, 2),
      });
    }

    if (dCap.hanhDong === 'QUAY_LUI') {
      soLanChuyenHuong += 0;
      soLanQuayLui += 1;
      if (soLanQuayLui > gh.toiDaQuayLui) {
        return traKetQuaSoHong([`Vượt quá giới hạn quay lui (${gh.toiDaQuayLui} lần).`]);
      }
      ghiBuoc(soVet, {
        loai: 'QUAY_LUI',
        nut: curNut,
        cungCapDaThay: capDuoiIds,
        daDoc: dCap.trich.map((t) => t.cauId),
        trich: dCap.trich,
        chuKhach: dCap.chuKhach,
        quyetDinh: { trangThai: 'QUAY_LUI', nutDich: dCap.nutDich, lyDo: dCap.lyDo },
        daSoKhongChon: [{ nut: curNut, viSaoKhongChon: dCap.lyDo }],
        quyTacGir: girCap,
      });

      const dichDigits = so(dCap.nutDich);
      if (dichDigits.length <= 2) {
        // Quay về cấp Chương: đánh dấu nhóm vừa bỏ, cho kiểm/chọn lại
        daBiLoai.add(curH4);
        const resC4Lai = await chonNhom4();
        if (!resC4Lai.ok) return traKetQuaSoHong([resC4Lai.loi]);
        lastNhom4Choice = resC4Lai.duLieu;
        const cap4 = ghiChonTang4(lastNhom4Choice);
        curH4 = cap4.h4;
        curCh = cap4.ch;
        pdCur = cap4.pdH4;
        curNut = resC4Lai.duLieu.nutDich;
      } else if (dichDigits.length === 4) {
        // Quay về cấp nhóm 4 số: neo lại bước CHON tầng 4 để sổ ADR giữ nguyên tang4CanCu
        if (dichDigits === curH4) {
          ghiChonTang4(lastNhom4Choice);
        }
        curNut = dCap.nutDich;
      } else {
        curNut = dCap.nutDich;
      }
      continue;
    }

    // hanhDong === 'CHON'
    const mucConChon = thongTinCon.find((x) => x.id === dCap.nutDich);
    const digitsChon = so(dCap.nutDich);
    const trangThaiChon = digitsChon.length === 6
      ? 'CHON_TANG_6'
      : (digitsChon.length === 8 ? 'CHON_TANG_8' : 'CHON_CAP_TRUNG_GIAN');

    ghiBuoc(soVet, {
      loai: 'CHON',
      nut: curNut,
      cungCapDaThay: capDuoiIds,
      daDoc: mucConChon?.cauIds || [],
      trich: dCap.trich,
      chuKhach: dCap.chuKhach,
      quyetDinh: { trangThai: trangThaiChon, nutDich: dCap.nutDich },
      daSoKhongChon: dCap.daSoKhongChon || [],
      quyTacGir: girCap,
    });
    curNut = dCap.nutDich;
  }

  // ── BƯỚC 6: KET_LUAN & kiemSoVet (lỗi cho LLM làm lại đúng bước hỏng 1 lần) ──────────────────────────────────────
  const maCuoi = so(curNut);
  const bacCuoi = maCuoi.length >= 8 ? 8 : (maCuoi.length >= 6 ? 6 : 4);
  const pdCuoi = phaiDocFn(curNut, { thuMuc: dir, dayDu: true });
  const { cauIds: cauIdsCuoi } = thuThapPhanPhaiDoc(pdCuoi, nguonCau);
  const cungCapCuoi = (phaiDocFn(pdCuoi?.cha || `bieu:${maCuoi.slice(0, 6)}`, { thuMuc: dir })?.capDuoi || []).map((x) => x.id);
  const cauCuoiId = cauIdsCuoi[0] || `${curNut}#1`;
  const cauCuoiText = String(nguonCau.traCau(cauCuoiId) || pdCuoi?.ten || '').trim();
  const buocChotTruoc = [...soVet.cacBuoc].reverse().find((b) => b.loai === 'CHON');

  ghiBuoc(soVet, {
    loai: 'KET_LUAN',
    nut: curNut,
    cungCapDaThay: cungCapCuoi.length ? cungCapCuoi : [curNut],
    daDoc: cauIdsCuoi.length ? cauIdsCuoi : [cauCuoiId],
    trich: buocChotTruoc?.trich?.length ? buocChotTruoc.trich : (cauCuoiText ? [{ cauId: cauCuoiId, doan: cauCuoiText }] : []),
    chuKhach: buocChotTruoc?.chuKhach || moTaKhach,
    quyetDinh: { trangThai: 'CHOT', maHs: maCuoi, nutDich: curNut },
    daSoKhongChon: buocChotTruoc?.daSoKhongChon || [],
    quyTacGir: buocChotTruoc?.quyTacGir || 'QT1, QT6',
  });

  let kqKiemSo = kiemSoVetFn(soVet, { thuMuc: dir, phaiDocFn });
  if (!kqKiemSo.dat) {
    const loiDau = kqKiemSo.loi.find((x) => Number.isInteger(x?.buoc));
    const idxSua = loiDau ? loiDau.buoc : soVet.cacBuoc.length - 1;
    const buocHong = soVet.cacBuoc[idxSua];

    const kqSua = await goiBuoc('SUA_BUOC', {
      prompt: [
        `BƯỚC SUA_BUOC: Sổ ghi vết bị từ chối tại bước #${idxSua + 1} (${buocHong?.loai || '?'}).`,
        `LỖI: ${kqKiemSo.thieu.join(' | ')}`,
        'Hãy trả về bản sửa hợp lệ cho bước hỏng này (giữ nguyên cấu trúc bước của sổ ghi vết).',
      ].join('\n'),
      schema: { buocSua: 'object' },
      duLieu: { buocIndex: idxSua, buocHong, loi: kqKiemSo.loi, thieu: kqKiemSo.thieu },
    });

    const buocMoi = kqSua?.buocSua && typeof kqSua.buocSua === 'object' ? kqSua.buocSua : kqSua;
    if (buocMoi && typeof buocMoi === 'object' && buocMoi.loai) {
      soVet.cacBuoc[idxSua] = buocMoi;
      kqKiemSo = kiemSoVetFn(soVet, { thuMuc: dir, phaiDocFn });
    }
    if (!kqKiemSo.dat) {
      return traKetQuaSoHong(kqKiemSo.thieu);
    }
  }

  return chuanHoaKetLuanLoi('KET_LUAN', {
    bac: bacCuoi,
    ma: maCuoi,
    so: soVet,
    hoi: null,
    soLuotLLM,
    soKyTuDaDoc,
    thieuKho,
    thongKeBuoc: thongKeBuoc(),
    loiSo: [],
  });
}

module.exports = {
  chayDocLuat,
  docTomTatNut,
  thuThapPhanPhaiDoc,
  KHO_THIEU_MAC_DINH,
  GIOI_HAN_MAC_DINH,
};
