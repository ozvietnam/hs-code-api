// lib/do-thi/bac-thang.js — BẬC THANG 4 → 6 → 8 (ADR-0004 B6, kế hoạch đồ thị mục 5 bước 6–7). Chỉ chạy sau HS_TIM_TRUOC=do-thi.
//
// Nhận nhóm 4 số ĐÃ CHỐT kèm căn cứ, chữ khách và một hàm gọi AI; đi từng CẤP GẠCH của cây biểu thuế, mỗi lần chỉ so các dòng anh em
// cùng cấp. Mỗi cấp:
//   (a) LUẬT trước: con duy nhất · cạnh C10 (xuong6, luật "trái cứng") · chotDong8 cho 8 số · loại trừ cứng còn một dòng.
//   (b) luật không quyết được → MỘT lời AI chỉ thấy các dòng cùng cấp nguyên văn của đúng nhánh đó + chú giải phân nhóm có nhắc nhánh.
//       Máy kiểm câu luật và câu chữ khách là chuỗi con thật; sai, hoặc còn thiếu dữ kiện → DUNG_HOI ở bậc đó.
// Bản ghi dựng theo khuôn lib/cong-adr-0004.js rồi chạy cổng; bậc vi phạm bị cắt về bậc cao nhất còn đạt. Không có đường nào ở đây
// đổi nhóm đã chốt, không đọc tiền lệ, không gọi mạng.
'use strict';

const T = require('../hs-tree');
const S = require('../so-tay');
const TV = require('../tu-vung');
const { kiemCongAdr0004, kiemTrichHopLe, laCanCuTienLe, CHUONG_PHAN_XV } = require('../cong-adr-0004');
const { kieuTieuDe, gotTen } = require('./phan-con-lai');
const { xetChuGiai2PhanXVI } = require('./chu-giai-2-phan-xvi');
const { phanTichHoiTruoc4So } = require('./hoi-truoc-4so');
const duongDoThi = require('./duong-do-thi');

const TRICH_TOI_THIEU = 6; //      cùng ngưỡng với cổng ADR-0004
const TRAN_CHU_GIAI = 3000; //     kế hoạch đồ thị mục 5 bước 6: tối đa 3.000 ký tự chú giải một lượt
const TRAN_DONG_HOI = 8; //        số dòng nêu trong một câu hỏi
const TRAN_CAU_HOI = 500;
const TRAN_SAU = 8; //             số cấp gạch tối đa (4 → 8 số không quá 6 cấp)

const so = (v) => String(v == null ? '' : v).replace(/\D/g, '');
const chu = (v) => (typeof v === 'string' ? v.normalize('NFC').replace(/\s+/g, ' ').trim() : '');
/** Chuẩn hoá để so câu trích: NFC, gộp khoảng trắng, không phân biệt hoa thường. KHÔNG bỏ dấu, không bỏ chữ nào. */
const chuanTrich = (v) => chu(v).toLowerCase();
const cat = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const tenNut = (id) => gotTen(T.nodeOf(id)?.tenVi || '');
const cham = (ma) => (ma.length > 4 ? `${ma.slice(0, 4)}.${ma.slice(4)}` : `${ma.slice(0, 2)}.${ma.slice(2)}`);

// ───────────────────────── Nguồn luật nguyên văn ─────────────────────────
let _cg = null;
const chuGiaiNhom = () => { if (!_cg) { try { _cg = require('../../data/chu-giai-heading.json'); } catch { _cg = {}; } } return _cg; };
const _nguon = new Map();
/** Mọi nguồn luật nguyên văn của một nhóm: chú giải nhóm / chương / phần, SEN, WCO, biểu thuế, tiêu đề, tên nhóm. */
function nguonNhom(h4) {
  if (!_nguon.has(h4)) {
    const ten = chu(chuGiaiNhom()[h4]?.ten_nhom);
    _nguon.set(h4, { ...S.sourcesFor(h4), ...S.nguonTieuDe(h4), ...(ten ? { [`tenNhom.${h4}`]: ten } : {}) });
  }
  return _nguon.get(h4);
}
/** Văn bản của một mã nguồn ("nhom8481.nhom", "ct.8481.16", "tenNhom.8481", "ch84.chuong"…), hoặc null khi không phải nguồn luật. */
function vanBanNguon(nguon, dsNhom) {
  const k = chu(nguon);
  const ct = /^ct\.(\d{4})\.(\d+)$/.exec(k); // cùng cách cắt với ban-do-4so.js doanChiTiet
  if (ct) {
    const e = chuGiaiNhom()[ct[1]];
    const doan = String(e && typeof e.nhom === 'string' ? e.nhom : '').split(/\n{2,}/).map((x) => x.trim()).filter(Boolean);
    return doan[Number(ct[2]) - 1] || null;
  }
  const tu = /^(?:nhom|tenNhom\.|sen\.|wco\.|tax\.|tieuDe\.)(\d{4})/.exec(k);
  for (const h of [...new Set([...(tu ? [tu[1]] : []), ...dsNhom])]) {
    const v = nguonNhom(h);
    if (Object.prototype.hasOwnProperty.call(v, k)) return v[k];
  }
  return null;
}
/** Mã nguồn + dòng nguyên văn của một nút cây biểu thuế (tieuDe.<id> hoặc tax.<id>); null khi nút không tên / không nguồn. */
function dongLuat(h4, id) {
  const v = nguonNhom(h4);
  for (const k of [`tieuDe.${id}`, `tax.${id}`]) if (v[k]) return { nguon: k, trich: chu(v[k]) };
  return null;
}
/** Căn cứ chọn nhóm 4 số: chỉ giữ mục là LUẬT (tra được nguồn, trích nguyên văn); tiền lệ / từ điển chưa duyệt bị bỏ. */
function canCuLuat(ds, dsNhom) {
  const ra = []; const bo = [];
  for (const m of Array.isArray(ds) ? ds : []) {
    const vb = m && !laCanCuTienLe(m) ? vanBanNguon(m.nguon, dsNhom) : null;
    if (vb != null && kiemTrichHopLe(m, { [chu(m.nguon)]: vb }).ok) ra.push({ nguon: chu(m.nguon), trich: chu(m.trich) });
    else bo.push(m?.id || m?.nguon || null);
  }
  return { ra, bo };
}

// ───────────────────────── Cây ─────────────────────────
const laLa = (id) => /^\d{8}$/.test(id) && !T.conTang(id).length;
/** Con một cấp gạch; nút không tên (biểu không in dòng tiêu đề) thì trong suốt: lấy con của nó. */
function conCungCap(id) {
  const ra = [];
  for (const c of T.conTang(id)) {
    if (!laLa(c) && !tenNut(c)) ra.push(...conCungCap(c)); else ra.push(c);
  }
  return ra;
}
function laDuoi(id) {
  if (laLa(id)) return [id];
  return T.conTang(id).flatMap(laDuoi);
}
const pnDuoi = (id) => [...new Set(laDuoi(id).map((x) => x.slice(0, 6)))];
/** Phân nhóm 6 số mà nút này ĐÃ xác định (mọi lá cùng một phân nhóm), hoặc null khi nút còn chứa nhiều phân nhóm. */
const pnCua = (id) => { const p = pnDuoi(id); return p.length === 1 ? p[0] : null; };

const laDu = (id) => ['DU', 'DU_CO_PHAM_VI'].includes(kieuTieuDe(tenNut(id)));
/** Anh em có tên phải bị loại trước khi chọn phần còn lại: "Loại khác" trần → mọi anh em có tên; "… khác" có phạm vi → anh em đứng trước. */
function anhEmPhaiLoai(id, anhEm) {
  const i = anhEm.indexOf(id);
  const ds = kieuTieuDe(tenNut(id)) === 'DU' ? anhEm.filter((x) => x !== id) : anhEm.slice(0, i);
  return ds.filter((x) => kieuTieuDe(tenNut(x)) !== 'DU');
}
const RE_DAN_MA = /(?:thuộc|của|cho)\s+(?:(?:các|hàng\s+h(?:óa|oá)|xe|máy|thiết\s+bị|loại)\s+)*(?:thuộc\s+)?(?:phân\s+nhóm|nhóm)\s+(\d{2}\.?\d{2}(?:\.\d{2}){0,2})/iu;
/** Mã máy chủ mà một dòng đòi ("Dùng cho xe đạp thuộc phân nhóm 8712.00.20"), bỏ vế "trừ …". ADR-0004 B6. */
function maMayChu(id) {
  const m = RE_DAN_MA.exec(tenNut(id).split(/(?<![\p{L}])trừ(?![\p{L}])/iu)[0]);
  return m ? so(m[1]) : null;
}
const khachNeuMa = (moTa, ma) => so(moTa).includes(ma) && new RegExp(ma.split('').join('[.\\s]?')).test(moTa);
/** Chọn `id` trong `anhEm` có đụng dòng "của hàng thuộc nhóm X" mà khách chưa cho biết máy chủ tới mức X không? */
function thieuMayChu(id, anhEm, daLoai, moTa) {
  const xet = [id, ...(laDu(id) ? anhEm.filter((x) => x !== id && !daLoai.has(x)) : [])];
  for (const x of xet) { const ma = maMayChu(x); if (ma && !khachNeuMa(moTa, ma)) return x; }
  return null;
}

// ───────────────────────── Trạng thái từng dòng theo luật ─────────────────────────
/** Cấp trên 6 số: dùng luật "trái cứng" của duong-do-thi.xuong6. */
function luatCap6({ h4, moTa, tenHang, docSoTay }) {
  const x6 = duongDoThi.xuong6(h4, moTa, docSoTay);
  const tc = docSoTay(h4)?.tieuChi6 || [];
  // B0: hàng có phải BỘ PHẬN hay không đọc ở TÊN HÀNG ("hàng là cái gì"), không đọc ở câu tả công dụng ("… bằng linh kiện quang
  // điện"). Hai chỗ nói khác nhau thì máy không dùng dữ kiện đó, kể cả để loại.
  const doc = (f, t) => { try { const r = TV.docGiaTri(f, t); return r?.trangThai === 'DA_CO' ? r.giaTri : null; } catch { return null; } };
  const lechBoPhan = tc.some((t) => t?.fact === 'laBoPhan') && doc('laBoPhan', moTa) !== doc('laBoPhan', tenHang);
  const loai = new Set(lechBoPhan ? [] : x6.loai.map((l) => l.hs6));
  const chot = lechBoPhan && tc.some((t) => t?.hs6 === x6.chot && t.fact === 'laBoPhan') ? null : x6.chot;
  const khop = new Set((x6.chiTiet || []).filter((q) => q.trangThai !== 'TRAI' && (q.trangThai === 'THOA' || (q.khop || []).length)).map((q) => q.hs6));
  return {
    x6, tieuChi: tc,
    trangThai: (id) => (pnDuoi(id).every((p) => loai.has(p)) ? 'LOAI' : 'CON'),
    /** Cạnh C10 chốt một phân nhóm nằm dưới nút này, và không anh em CÓ TÊN nào khác cũng khớp chữ khách. */
    chonCanh: (conSong) => {
      if (!chot) return null;
      const n = conSong.find((id) => pnDuoi(id).includes(chot));
      if (!n || laDu(n)) return null;
      const tranh = conSong.some((id) => id !== n && !laDu(id) && pnDuoi(id).some((p) => khop.has(p)));
      return tranh ? null : { id: n, canCu: tc.filter((t) => t.hs6 === chot && t.trich && t.nguon).map((t) => ({ nguon: t.nguon, trich: chu(t.trich) })) };
    },
    cauHoi: () => duongDoThi.cauHoiCuaCanh(x6).map((q) => ({ cauHoi: q, canCu: 'so-tay', nguon: `so-tay.${h4}.tieuChi6` })),
  };
}
/** Cấp dưới 6 số: chotDong8 + điều kiện dòng / điều kiện nút của sổ tay và sổ ranh giới đã duyệt. */
function luatCap8({ hs6, moTa, docSoTay }) {
  const g = require('../so-tay-gates');
  const s = docSoTay(hs6.slice(0, 4));
  let cd = null; if (s) try { cd = g.chotDong8({ hs: hs6, productText: moTa }); } catch { cd = null; }
  const la = cd?.checked && ['CHOT', 'LOAI_KHAC'].includes(cd.ketQua) && so(cd.hs).startsWith(hs6) ? so(cd.hs) : null;
  const { rg, dongCungPn6 } = s ? g.dong8HieuLuc(s, hs6) : { rg: null, dongCungPn6: [] };
  const dong = new Map(dongCungPn6.map((d) => [d.hs, d]));
  const nut = new Map((rg?.dieuKienNut || s?.dieuKienNut || []).filter((x) => x?.id && Array.isArray(x.dieuKienSo) && x.dieuKienSo.length).map((x) => [T.chuanMa(x.id), x]));
  const cham1 = (o) => { try { return Array.isArray(o?.dieuKienSo) && o.dieuKienSo.length ? g.danhGiaDong(o, moTa).trangThai : 'CHUA_BIET'; } catch { return 'CHUA_BIET'; } };
  const cache = new Map();
  const tt = (id) => {
    if (!cache.has(id)) {
      let r;
      if (laLa(id)) r = cham1(dong.get(id));
      else {
        const n = nut.get(id);
        r = n ? cham1({ hs: id, trich: n.trich, nguon: n.nguon, dieuKienSo: n.dieuKienSo }) : 'CHUA_BIET';
        if (r !== 'TRAI' && laDuoi(id).every((x) => tt(x) === 'TRAI')) r = 'TRAI';
      }
      cache.set(id, r);
    }
    return cache.get(id);
  };
  return {
    chotDong: cd,
    trangThai: (id) => (tt(id) === 'TRAI' ? 'LOAI' : 'CON'),
    /** chotDong8 chốt lá nằm dưới nút: nút là lá, hoặc tiêu đề có điều kiện đã THOẢ; không anh em có tên nào khác cũng thoả. */
    chonCanh: (conSong) => {
      if (!la) return null;
      const n = conSong.find((id) => laDuoi(id).includes(la));
      if (!n || laDu(n) || (n !== la && tt(n) !== 'THOA')) return null;
      if (conSong.some((id) => id !== n && !laDu(id) && tt(id) === 'THOA')) return null;
      return { id: n, canCu: (cd.traNguon || []).filter((x) => x?.nguon && x?.trich).map((x) => ({ nguon: x.nguon, trich: chu(x.trich) })) };
    },
    cauHoi: () => (cd?.ketQua === 'THIEU_SO_LIEU' ? (cd.missingFacts || []) : []).map((m) => chu(m.cauHoi)).filter(Boolean).slice(0, 2).map((q) => ({ cauHoi: q, canCu: 'so-tay', nguon: `so-tay.${hs6}.dong8` })),
  };
}

// ───────────────────────── Một lời AI cho một cấp ─────────────────────────
const _cgpn = new Map();
/** Các mục "Chú giải phân nhóm" của chương / phần có nhắc mã thuộc nhánh đang xét: [{nguon, trich}]. */
function chuGiaiPhanNhom(h4, dsPn) {
  const ch = h4.slice(0, 2);
  if (!_cgpn.has(h4)) {
    const ra = [];
    for (const [k, v] of Object.entries(nguonNhom(h4))) {
      if (k !== `ch${ch}.chuong` && k !== `phan${ch}.phan`) continue;
      const i = v.search(/Chú giải phân nhóm/iu);
      if (i < 0) continue;
      const doan = v.slice(i).split(/\n\s*(?:TỔNG QUÁT|KHÁI QUÁT|Chú giải chi tiết)/u)[0];
      for (const m of doan.split(/\n(?=\s*\d+\s*[.)]\s)/u).slice(1)) ra.push({ nguon: k, trich: chu(m) });
    }
    _cgpn.set(h4, ra);
  }
  const ma = new Set(dsPn.map((p) => `${p.slice(0, 4)}.${p.slice(4)}`));
  const ra = []; let dai = 0;
  for (const m of _cgpn.get(h4)) {
    if (![...m.trich.matchAll(/\d{4}\.\d{2}/g)].some((x) => ma.has(x[0]))) continue;
    if (dai + m.trich.length > TRAN_CHU_GIAI) continue;
    dai += m.trich.length; ra.push(m);
  }
  return ra;
}

function dungYeuCau({ moTa, duong, dong, chuGiai }) {
  return [
    `HÀNG (nguyên văn chữ khách): ${moTa}`,
    `ĐÃ CHỐT: ${duong}`,
    'CÁC DÒNG CÙNG CẤP (nguyên văn biểu thuế, chỉ được chọn trong đây):',
    ...dong.map((d) => `[${d.ma}] ${d.ten}${d.loai ? ' — MÁY ĐÃ LOẠI bằng dữ kiện khách nêu, không được chọn' : ''}`),
    ...(chuGiai.length ? ['CHÚ GIẢI PHÂN NHÓM (nguyên văn):', ...chuGiai.map((c, i) => `[G${i + 1}] ${c.trich}`)] : []),
    'YÊU CẦU: so các dòng trên với chữ khách, áp Quy tắc 6. Không dùng điều khách không nói. Chọn một dòng thì phải chép NGUYÊN VĂN câu luật của dòng đó (hoặc của chú giải phân nhóm) và NGUYÊN VĂN cụm chữ khách chứng minh. '
      + 'Dòng "khác" chỉ được chọn khi MỌI dòng có tên đứng trên đã bị loại: liệt kê từng dòng trong "loai", kèm câu luật nguyên văn của dòng đó và cụm chữ khách loại nó. '
      + 'Luật đòi một dữ kiện mà khách chưa nêu thì KHÔNG đoán: để "dong":"" và ghi dữ kiện đó vào "thieu" kèm câu luật nguyên văn đòi nó. '
      + 'Chỉ trả một đối tượng JSON {"dong":"D1","luat":"…","chu":"…","loai":[{"dong":"D2","luat":"…","chu":"…"}],"thieu":[{"duKien":"…","luat":"…"}]}',
  ].join('\n');
}

const laChuSo = (c) => Boolean(c) && /[\p{L}\p{M}\p{N}]/u.test(c) && !/[㐀-鿿]/.test(c);
/** Câu `trich` có thật trong `vanBan` (nguyên cụm, không cắt giữa từ)? */
function coTrich(trich, vanBan) {
  const t = chuanTrich(trich); const v = chuanTrich(vanBan);
  if (!t) return false;
  for (let i = v.indexOf(t); i >= 0; i = v.indexOf(t, i + 1)) {
    if (!(laChuSo(t[0]) && laChuSo(v[i - 1])) && !(laChuSo(t[t.length - 1]) && laChuSo(v[i + t.length]))) return true;
  }
  return false;
}
const chuKhachHopLe = (c, moTa) => chu(c).length >= (/[㐀-鿿]/.test(c) ? 1 : 2) && coTrich(c, moTa);
/** Câu luật của một dòng: trọn tên dòng, hoặc một đoạn ≥ 6 ký tự của tên dòng / của chú giải phân nhóm đã đưa. */
const luatHopLe = (l, ten, chuGiai) => {
  const t = chuanTrich(l);
  if (!t) return false;
  if (t === chuanTrich(ten)) return true;
  return t.length >= TRICH_TOI_THIEU && [ten, ...chuGiai.map((c) => c.trich)].some((v) => coTrich(l, v));
};

/**
 * Máy kiểm câu trả lời AI của một cấp. Trả {ok:true, dong, canCu, chuKhach} hoặc {ok:false, ma, thieuLuat}.
 * `dong` = các dòng đã đưa (kèm id nút, ten, loai = máy đã loại).
 */
function kiemTraLoi(tho, { dong, chuGiai, moTa, anhEm }) {
  const hong = (ma, them = {}) => ({ ok: false, ma, thieuLuat: [], ...them });
  let j = tho;
  if (typeof tho === 'string') { try { j = JSON.parse(tho.slice(tho.indexOf('{'), tho.lastIndexOf('}') + 1)); } catch { return hong('KHONG_PHAI_JSON'); } }
  if (!j || typeof j !== 'object' || Array.isArray(j)) return hong('KHONG_PHAI_JSON');
  const tatCa = [...dong.map((d) => d.ten), ...chuGiai.map((c) => c.trich)];
  const thieu = (Array.isArray(j.thieu) ? j.thieu : []).filter((x) => (typeof x === 'string' ? chu(x) : chu(x?.duKien) || chu(x?.luat)));
  if (thieu.length) {
    const thieuLuat = [...new Set(thieu.map((x) => chu(x?.luat)).filter((l) => l.length >= TRICH_TOI_THIEU && tatCa.some((v) => coTrich(l, v))))];
    return hong('THIEU_DU_KIEN', { thieuLuat, thieu: thieu.map((x) => (typeof x === 'string' ? chu(x) : chu(x.duKien))).filter(Boolean).slice(0, 4) });
  }
  const theoMa = new Map(dong.map((d) => [d.ma, d]));
  const d = theoMa.get(chu(j.dong).replace(/[[\]]/g, ''));
  if (!d) return hong('NGOAI_DANH_SACH');
  if (d.loai) return hong('DONG_MAY_DA_LOAI');
  if (!luatHopLe(j.luat, d.ten, chuGiai)) return hong('CAU_LUAT_BIA');
  if (!chuKhachHopLe(j.chu, moTa)) return hong('CHU_KHACH_BIA');
  if (laDu(d.id)) {
    const loai = new Map((Array.isArray(j.loai) ? j.loai : []).map((x) => [chu(x?.dong).replace(/[[\]]/g, ''), x]));
    for (const id of anhEmPhaiLoai(d.id, anhEm)) {
      const e = dong.find((x) => x.id === id);
      if (!e || e.loai) continue;
      const x = loai.get(e.ma);
      if (!x) return hong('LOAI_KHAC_CHUA_LOAI_ANH_EM', { anhEm: id });
      if (!luatHopLe(x.luat, e.ten, chuGiai)) return hong('CAU_LUAT_BIA', { anhEm: id });
      if (!chuKhachHopLe(x.chu, moTa)) return hong('CHU_KHACH_BIA', { anhEm: id });
      if (coTrich(x.luat, moTa) || coTrich(x.chu, e.ten)) return hong('ANH_EM_KHOP_CHU_KHACH', { anhEm: id }); // chữ dùng để LOẠI lại chính là chữ của dòng đó
    }
  }
  const tuChuGiai = !coTrich(j.luat, d.ten) ? chuGiai.find((c) => coTrich(j.luat, c.trich)) : null;
  return { ok: true, dong: d, canCu: tuChuGiai ? [{ nguon: tuChuGiai.nguon, trich: chu(j.luat) }] : [], chuKhach: chu(j.chu) };
}

// ───────────────────────── Câu hỏi ─────────────────────────
/** Câu hỏi của một cấp: máy dựng từ chữ luật, KHÔNG dùng lời của AI (L2). */
function cauHoiCap({ h4, cha, conSong, luat, thieuLuat = [], mayChu = null }) {
  const ra = [];
  if (mayChu) {
    const l = dongLuat(h4, mayChu);
    ra.push({ cauHoi: `Biểu thuế có dòng "${tenNut(mayChu)}": hàng này là của / dùng cho máy, xe, thiết bị nào (tên, loại, mã HS nếu có)?`, canCu: 'bieu-thue', nguon: l?.nguon || `tax.${mayChu}` });
  }
  for (const t of thieuLuat.slice(0, 2)) ra.push({ cauHoi: `Luật ghi: "${cat(t, 220)}". Hàng của anh/chị cụ thể thế nào ở điểm này?`, canCu: 'bieu-thue', nguon: `bieu-thue.${cha}` });
  ra.push(...luat.cauHoi());
  if (conSong.length > 1) {
    const ds = conSong.slice(0, TRAN_DONG_HOI);
    ra.push({
      cauHoi: cat(`Trong ${cham(h4)}${cha !== h4 && tenNut(cha) ? ` (${cat(tenNut(cha), 80)})` : ''}, hàng thuộc trường hợp nào: ${ds.map((id, i) => `(${i + 1}) ${cat(tenNut(id), 90)}`).join('; ')}${conSong.length > ds.length ? '; hoặc trường hợp khác trong nhóm' : ''}?`, TRAN_CAU_HOI),
      canCu: 'bieu-thue', nguon: ds.map((id) => dongLuat(h4, id)?.nguon || id).join('|'),
    });
  }
  const thay = new Set();
  return ra.filter((q) => q.cauHoi && !thay.has(q.cauHoi) && thay.add(q.cauHoi)).slice(0, 4);
}
/** Câu hỏi ở bậc 4: lib/do-thi/hoi-truoc-4so.js (cạnh + chú giải giữa các nhóm còn sống). */
function cauHoiBac4(moTa, dsNhom) {
  let r = null; try { r = phanTichHoiTruoc4So({ moTa, ungVien: dsNhom.slice(0, 3) }); } catch { r = null; }
  if (r?.cauHoi && r.nhomUngVien.length > 1) return [{ cauHoi: cat(chu(r.cauHoi), TRAN_CAU_HOI), canCu: 'so-tay', nguon: r.canCu.map((c) => c.nguon).join('|') }];
  const ten = dsNhom.filter((h) => nguonNhom(h)[`tenNhom.${h}`]);
  return [{
    cauHoi: ten.length ? `Cần rõ hàng là gì, làm bằng gì, dùng vào việc gì để đối chiếu tên nhóm: ${ten.slice(0, 3).map((h) => `${cham(h)} "${cat(nguonNhom(h)[`tenNhom.${h}`], 110)}"`).join('; ')}. Anh/chị mô tả thêm ba điểm đó giúp.` : 'Cần bổ sung tên hàng thông dụng, chất liệu, công dụng để tìm nhóm theo luật.',
    canCu: 'bieu-thue', nguon: ten.length ? ten.slice(0, 3).map((h) => `tenNhom.${h}`).join('|') : 'ten-nhom',
  }];
}

// ───────────────────────── B0/B1: bộ phận rơi vào Phần XV ─────────────────────────
const RE_BO_PHAN = /(?<![\p{L}])(?:bộ phận|linh kiện|phụ tùng|chi tiết máy)(?![\p{L}])|(?<![\p{L}])(?:của|cho|lắp vào|gắn vào)\s+(?:máy|động cơ|tổ máy)(?![\p{L}])/iu;
/** Hàng là bộ phận mà nhóm thuộc Chương 72–83: chạy Chú giải 1 / Chú giải 2 Phần XVI. null = không phải trường hợp này. */
function kiemBoPhan(h4, tenHang, moTa) {
  if (!CHUONG_PHAN_XV.has(h4.slice(0, 2)) || !RE_BO_PHAN.test(moTa)) return null;
  let r = null; try { r = xetChuGiai2PhanXVI({ tenHang }); } catch { r = null; }
  const khop = r?.trangThai === 'CHOT' && r.nhomKetQua === h4;
  return {
    laBoPhan: true, khop,
    kiem: { daKiemChuGiai1fPhanXV: khop, daKiemChuGiai2PhanXVI: khop },
    lyDo: r ? `${r.quyTac || ''}: ${r.nhomKetQua || r.trangThai}` : 'không chạy được Chú giải 2 Phần XVI',
    cauHoi: r?.cauHoi?.noiDung ? [{ cauHoi: `${chu(r.cauHoi.noiDung)} (${cat(chu(r.cauHoi.dieuKienLuat), 200)})`, canCu: 'so-tay', nguon: (r.trich || []).map((t) => `${t?.tep}#${t?.khoa}`).slice(0, 2).join('|') || 'chu-giai-2-phan-xvi' }] : [],
    trich: r?.trich || [],
  };
}

// ───────────────────────── Đi bậc thang ─────────────────────────
/**
 * @param {object} p
 * @param {string} p.nhom             nhóm 4 số đã chốt
 * @param {Array<{nguon, trich}>} p.canCuNhom  căn cứ chọn nhóm
 * @param {string[]} [p.nhomConSong]  các nhóm còn sống sau B1 (để tra nguồn căn cứ, dựng câu hỏi)
 * @param {string[]} [p.thieu4]       dữ kiện luật đòi còn thiếu ở bậc 4 (khác rỗng ⇒ DUNG_HOI ở bậc 4)
 * @param {string} p.moTa             chữ khách (duong-do-thi.moTaKhach)
 * @param {string} [p.tenHang]
 * @param {string} [p.hs6]            đưa sẵn phân nhóm (đo T3)
 * @param {4|6|8} [p.denBac]          dừng sau bậc này (đo T2)
 * @param {Function|null} [p.goiLLM]  (ten, yeuCau) => json; null ⇒ chỉ luật
 * @param {Function} [p.conGio]       () => boolean
 * @param {Function} [p.docSoTay]
 */
async function chayBacThang({ nhom, canCuNhom = [], nhomConSong = [], thieu4 = [], moTa, tenHang = null, hs6 = null, denBac = 8, goiLLM = null, conGio = () => true, docSoTay = require('../so-tay-gates').loadSoTay }) {
  const h4 = so(nhom).slice(0, 4); const mt = chu(moTa);
  const dsNhom = [...new Set([h4, ...nhomConSong.map((x) => so(x).slice(0, 4))])].filter((x) => x.length === 4);
  const ten = chu(tenHang) || mt.split('. ')[0];
  const k = { h4, mt, dsNhom, tang: {}, vet: [], cauHoi: [], lyDoDung: null, soLoiAI: 0, boPhan: kiemBoPhan(h4, ten, mt), canCuBo: [], thieu: [] };
  const dung = (bac, lyDo, cauHoi = []) => { k.tang[`tang${bac}`] = { trangThai: 'DUNG_HOI' }; k.lyDoDung = lyDo; k.cauHoi = cauHoi; return ketLuan(k); };

  // ── Bậc 4: nhóm đã chốt, máy kiểm lại căn cứ luật ──
  const cc = canCuLuat(canCuNhom, dsNhom); k.canCuBo = cc.bo;
  if (!mt) return dung(4, 'KHONG_CO_CHU_KHACH', cauHoiBac4(mt, dsNhom));
  if (!/^\d{4}$/.test(h4) || !T.conTang(h4).length) return dung(4, 'NHOM_KHONG_CO_TRONG_BIEU', cauHoiBac4(mt, dsNhom));
  if (thieu4.length) { k.thieu = thieu4.map(chu).filter(Boolean); return dung(4, 'THIEU_DU_KIEN_BAC_4', cauHoiBac4(mt, dsNhom)); }
  if (!cc.ra.length) return dung(4, 'KHONG_CO_CAN_CU_LUAT', cauHoiBac4(mt, dsNhom));
  if (k.boPhan && !k.boPhan.khop) return dung(4, 'BO_PHAN_CHUA_QUA_CHU_GIAI_2_PHAN_XVI', k.boPhan.cauHoi.length ? k.boPhan.cauHoi : cauHoiBac4(mt, dsNhom));
  k.tang.tang4 = { ma: h4, trangThai: 'CHOT', canCu: cc.ra };
  if (denBac <= 4) return ketLuan(k);

  // ── Đi xuống ──
  let cha = h4; let dich6 = null; const canCu6 = []; let canCu8 = [];
  // Nhóm không chia phân nhóm (xxxx.00): phân nhóm CHÍNH LÀ nhóm, luật của nó là tên nhóm; đi thẳng xuống các dòng 8 số.
  const motPn = pnCua(h4);
  if (motPn) {
    const tenH4 = nguonNhom(h4)[`tenNhom.${h4}`];
    dich6 = motPn;
    k.tang.tang6 = { ma: motPn, trangThai: 'CHOT', canCu: tenH4 ? [{ nguon: `tenNhom.${h4}`, trich: tenH4 }] : cc.ra };
    k.vet.push({ cap: 6, cha: h4, chon: motPn, cach: 'CON_DUY_NHAT' });
    if (denBac <= 6) return ketLuan(k);
  } else if (hs6) {
    const h = so(hs6).slice(0, 6);
    if (!h.startsWith(h4) || !T.nodeOf(h)) return dung(6, 'PHAN_NHOM_KHONG_CO_TRONG_BIEU');
    const l = dongLuat(h4, h) || dongLuat(h4, laDuoi(h)[0] || h) || dongLuat(h4, `${h}00`);
    dich6 = h; cha = T.nodeOf(h).id;
    k.tang.tang6 = { ma: h, trangThai: 'CHOT', canCu: l ? [l] : [] };
    if (laLa(cha)) { k.tang.tang8 = { ma: cha, trangThai: 'CHOT', canCu: l ? [l] : [] }; return ketLuan(k); }
  }
  let l6 = null; let l8 = null;
  for (let i = 0; i < TRAN_SAU; i += 1) {
    const anhEm = conCungCap(cha);
    if (!anhEm.length) break;
    const bac = dich6 ? 8 : 6;
    const luat = dich6 ? (l8 ||= luatCap8({ hs6: dich6, moTa: mt, docSoTay })) : (l6 ||= luatCap6({ h4, moTa: mt, tenHang: ten, docSoTay }));
    const daLoai = new Set(anhEm.filter((id) => luat.trangThai(id) === 'LOAI'));
    const conSong = anhEm.filter((id) => !daLoai.has(id));
    let chon = null; // {id, cach, canCu, chuKhach?}
    let mayChu = null; let aiHong = null;
    if (anhEm.length === 1) chon = { id: anhEm[0], cach: 'CON_DUY_NHAT', canCu: [] };
    else if (!conSong.length) aiHong = { ma: 'MOI_DONG_DEU_TRAI' };
    else {
      const canh = luat.chonCanh(conSong);
      if (canh) chon = { ...canh, cach: 'CANH' };
      else if (conSong.length === 1) chon = { id: conSong[0], cach: 'LOAI_TRU', canCu: [...daLoai].map((id) => dongLuat(h4, id)).filter(Boolean).slice(0, 6) };
      if (chon) { mayChu = thieuMayChu(chon.id, anhEm, daLoai, mt); if (mayChu) chon = null; }
      if (!chon && !mayChu && typeof goiLLM === 'function') {
        if (!conGio()) aiHong = { ma: 'HET_GIO' };
        else {
          const dong = anhEm.map((id, n) => ({ ma: `D${n + 1}`, id, ten: tenNut(id), loai: daLoai.has(id) })).filter((d) => d.ten);
          const chuGiai = chuGiaiPhanNhom(h4, anhEm.flatMap(pnDuoi));
          const duong = `nhóm ${cat(nguonNhom(h4)[`tenNhom.${h4}`] || cham(h4), 300)}${cha !== h4 ? ` → ${cat(tenNut(cha), 200)}` : ''}`;
          let tho = null; k.soLoiAI += 1;
          try { tho = await goiLLM('bac-thang', dungYeuCau({ moTa: mt, duong, dong, chuGiai })); } catch { aiHong = { ma: 'LOI_LLM' }; }
          if (!aiHong) {
            const kq = kiemTraLoi(tho, { dong, chuGiai, moTa: mt, anhEm });
            if (!kq.ok) aiHong = kq;
            else {
              mayChu = thieuMayChu(kq.dong.id, anhEm, daLoai, mt);
              if (!mayChu) chon = { id: kq.dong.id, cach: 'AI', canCu: kq.canCu, chuKhach: kq.chuKhach };
            }
          }
        }
      }
    }
    if (!chon) {
      const lyDo = mayChu ? 'CAN_PHAN_LOAI_MAY_CHU' : aiHong?.ma || 'LUAT_CHUA_QUYET_DUOC';
      if (aiHong?.thieu) k.thieu = aiHong.thieu;
      k.vet.push({ cap: bac, cha, cach: 'DUNG_HOI', lyDo, conSong, daLoai: [...daLoai], ...(aiHong?.anhEm ? { anhEm: aiHong.anhEm } : {}) });
      return dung(bac, lyDo, cauHoiCap({ h4, cha, conSong, luat, thieuLuat: aiHong?.thieuLuat, mayChu }));
    }
    k.vet.push({ cap: bac, cha, chon: chon.id, cach: chon.cach, ...(chon.chuKhach ? { chuKhach: chon.chuKhach } : {}) });
    const dongChon = dongLuat(h4, chon.id);
    const canCu = [...(dongChon ? [dongChon] : []), ...canCuLuat(chon.canCu, dsNhom).ra];
    if (bac === 6) {
      canCu6.push(...canCu);
      const p = pnCua(chon.id);
      if (p && (laLa(chon.id) || so(chon.id).length >= 6)) {
        dich6 = p; k.tang.tang6 = { ma: p, trangThai: 'CHOT', canCu: khuTrung(canCu6) };
        if (denBac <= 6) return ketLuan(k);
        if (laLa(chon.id)) { k.tang.tang8 = { ma: chon.id, trangThai: 'CHOT', canCu: khuTrung(canCu6) }; return ketLuan(k); }
      }
    } else {
      canCu8 = khuTrung([...canCu8, ...canCu]);
      if (laLa(chon.id)) { k.tang.tang8 = { ma: chon.id, trangThai: 'CHOT', canCu: canCu8 }; return ketLuan(k); }
    }
    cha = chon.id;
  }
  return dung(dich6 ? 8 : 6, 'CAY_KHONG_DI_TIEP_DUOC');
}
function khuTrung(ds) { const t = new Set(); return ds.filter((c) => { const id = `${c.nguon}\0${c.trich}`; return !t.has(id) && t.add(id); }); }

// ───────────────────────── Bản ghi + cổng ADR-0004 ─────────────────────────
const BAC = ['tang4', 'tang6', 'tang8'];
const chot = (t) => t?.trangThai === 'CHOT';
function maCao(tang) { for (const b of [...BAC].reverse()) if (chot(tang[b])) return tang[b].ma; return ''; }
function dungBanGhi(k) {
  const ma = maCao(k.tang);
  const coDung = BAC.some((b) => k.tang[b]?.trangThai === 'DUNG_HOI');
  return {
    ketLuan: ma.length === 8 && !coDung ? 'CHOT' : 'DUNG_HOI', maHs: ma, tang: k.tang,
    ungVienSauQt1: chot(k.tang.tang4) ? [k.h4] : k.dsNhom,
    quyTacApDung: [...(chot(k.tang.tang4) ? ['QT1'] : []), ...(chot(k.tang.tang6) ? ['QT6'] : [])],
    cacBuoc: ['B0', 'B1', ...(chot(k.tang.tang6) ? ['B6'] : [])],
    ...(k.boPhan ? { laBoPhan: true, kiemBoPhan: k.boPhan.kiem } : {}),
    duKienBatBuocThieu: coDung ? (k.thieu.length ? k.thieu : [k.lyDoDung].filter(Boolean)) : [],
  };
}
function nguonCuaBanGhi(tang, dsNhom) {
  const ra = {};
  // Mã nguồn không tra được ⇒ văn bản rỗng ⇒ cổng báo TRICH_KHONG_NGUYEN_VAN (không để cổng bỏ qua vì thiếu nguồn).
  for (const b of BAC) for (const c of tang[b]?.canCu || []) ra[c.nguon] = vanBanNguon(c.nguon, dsNhom) ?? '';
  return ra;
}
/** Dựng bản ghi, chạy cổng, cắt về bậc cao nhất còn đạt. */
function ketLuan(k) {
  const viPham = [];
  let banGhi = dungBanGhi(k); let nguonVanBan = nguonCuaBanGhi(k.tang, k.dsNhom);
  for (let i = 0; i <= BAC.length; i += 1) {
    const r = kiemCongAdr0004(banGhi, { nguonVanBan });
    if (r.dat) break;
    viPham.push(...r.loi);
    const hong = BAC.find((b) => r.loi.some((l) => l.tang === b)) || [...BAC].reverse().find((b) => chot(k.tang[b])) || 'tang4';
    const tu = BAC.indexOf(hong);
    k.tang = Object.fromEntries(Object.entries(k.tang).filter(([b]) => BAC.indexOf(b) < tu));
    k.tang[hong] = { trangThai: 'DUNG_HOI' };
    k.lyDoDung = `CONG_ADR_0004:${r.loi[0].ma}`;
    if (!k.cauHoi.length) k.cauHoi = cauHoiBac4(k.mt, k.dsNhom);
    banGhi = dungBanGhi(k); nguonVanBan = nguonCuaBanGhi(k.tang, k.dsNhom);
  }
  const ma = banGhi.maHs;
  return { ma, bac: ma.length, trangThai: banGhi.ketLuan, nhom: k.h4, banGhi, nguonVanBan, vet: k.vet, cauHoi: banGhi.ketLuan === 'CHOT' ? [] : k.cauHoi, lyDoDung: k.lyDoDung, viPham, soLoiAI: k.soLoiAI, canCuBo: k.canCuBo, ...(k.boPhan ? { boPhan: { khop: k.boPhan.khop, lyDo: k.boPhan.lyDo } } : {}) };
}

// ───────────────────────── Cho động cơ ─────────────────────────
/** Từ kết quả chonNhom (duong-do-thi) chạy bậc thang. */
async function tuChonNhom({ kq, raw, goiLLM, conGio }) {
  const muc = new Map((kq.goi?.muc || []).map((m) => [m.id, m]));
  return chayBacThang({
    nhom: kq.luotHai.nhom, canCuNhom: kq.luotHai.canCu.map((id) => muc.get(id)).filter(Boolean), nhomConSong: kq.tomTat.nhomConSong || [],
    thieu4: kq.luotHai.thieu, moTa: duongDoThi.moTaKhach(raw), tenHang: raw?.tenHang, goiLLM, conGio,
  });
}
/** Đáp án đúng khuôn vòng 2 (r2) để đi qua chốt chặn và phần KẾT QUẢ của động cơ. Chỉ gọi khi bt.bac ≥ 6. */
function dapAn(bt, lyDoNhom = '') {
  const chotHet = bt.trangThai === 'CHOT';
  const ten = { tang4: 'Nhóm', tang6: 'Phân nhóm', tang8: 'Dòng' };
  return {
    decision: chotHet ? 'CHOT' : 'HOI', hs: bt.ma,
    confidence: bt.vet.some((v) => v.cach === 'AI') ? 75 : 85,
    reason: cat(`${chu(lyDoNhom) ? `${chu(lyDoNhom)}. ` : ''}Đi bậc thang theo luật tới ${bt.ma}${chotHet ? '' : `; dừng hỏi ở bậc kế (${bt.lyDoDung})`}.`, 400),
    basis: BAC.filter((b) => chot(bt.banGhi.tang[b])).flatMap((b) => bt.banGhi.tang[b].canCu.slice(0, 2).map((c) => ({ stream: 'CHU_GIAI', claim: `${ten[b]} ${bt.banGhi.tang[b].ma}`, evidence: c.trich.slice(0, 240), ref: c.nguon }))),
    conditions: [], alternatives: [],
    questions: bt.cauHoi.map((q, i) => ({ fact: `bac-thang.${bt.ma}.${i + 1}`, question: q.cauHoi, whereToFind: 'Tem nhãn, bảng thông số, catalogue hoặc ảnh hàng', canCu: q.canCu, nguon: q.nguon })),
  };
}
/** Tóm tắt để ghi engine.bacThang (không kèm văn bản nguồn). */
function tomTat(bt) {
  return { ma: bt.ma, trangThai: bt.trangThai, nhom: bt.nhom, lyDoDung: bt.lyDoDung, vet: bt.vet, soLoiAI: bt.soLoiAI, viPham: bt.viPham.map((v) => ({ ma: v.ma, tang: v.tang || null })), tang: Object.fromEntries(Object.entries(bt.banGhi.tang).map(([b, t]) => [b, { ma: t.ma || null, trangThai: t.trangThai, canCu: t.canCu || [] }])), quyTac: bt.banGhi.quyTacApDung, ...(bt.boPhan ? { boPhan: bt.boPhan } : {}) };
}

/**
 * CỬA RA DUY NHẤT của chế độ do-thi: mọi kết quả trước khi tới khách qua kiemCongAdr0004. Không có bản ghi bậc thang, hoặc mã đứng
 * đầu không đúng mã bậc thang, hoặc cổng không đạt ⇒ không trả mã nào, trả hỏi. Chỉ bớt, không bao giờ thêm hay đổi mã.
 */
function congRa(out, bt) {
  if (!out || typeof out !== 'object') return out;
  const ds = Array.isArray(out.results) ? out.results : [];
  const banGhi = bt ? bt.banGhi : { ketLuan: ds.length ? 'CHOT' : 'DUNG_HOI', maHs: so(ds[0]?.hs) };
  const r = kiemCongAdr0004(banGhi, { nguonVanBan: bt?.nguonVanBan || {} });
  const duoc = r.dat && bt && bt.ma.length >= 6 ? bt.ma : null;
  const giu = duoc ? ds.filter((x) => so(x?.hs) === duoc) : [];
  const boMa = ds.map((x) => so(x?.hs)).filter((x) => x !== duoc);
  const engine = { ...(out.engine || {}), adr0004: { dat: r.dat, loi: r.loi.map((l) => l.ma), ketLuan: banGhi.ketLuan, maHs: banGhi.maHs || null, ...(boMa.length ? { boMa } : {}) } };
  if (!boMa.length) return { ...out, engine };
  const conMa = giu.length > 0;
  const cauHoi = (bt?.cauHoi?.length ? bt.cauHoi : cauHoiBac4('', bt?.dsNhom || (bt ? [bt.nhom] : [])));
  return {
    ...out, engine, results: giu,
    ...(conMa && so(ds[0]?.hs) === duoc ? (Array.isArray(out.nextAction?.optionsHs) ? { nextAction: { ...out.nextAction, optionsHs: [duoc] } } : {}) : {
      status: 'NEED_FACTS', ecus: null,
      nextAction: { type: 'ASK_USER', questions: hienThi(cauHoi), howToAnswerVi: CACH_TRA_LOI },
      missing: cauHoi.map((q) => q.cauHoi),
    }),
  };
}
const CACH_TRA_LOI = 'Bổ sung dữ kiện (ảnh tem/nhãn, thông số) rồi gọi lại /api/classify.';
/** Câu hỏi đúng khuôn nextAction.questions của ERP, kèm căn cứ. */
const hienThi = (ds) => ds.map((q) => ({ attribute: null, questionVi: q.cauHoi, whereToFind: 'Tem nhãn, bảng thông số, catalogue hoặc ảnh hàng', canCu: q.canCu, nguon: q.nguon }));

module.exports = { chayBacThang, tuChonNhom, dapAn, tomTat, congRa, cauHoiBac4, hienThi, CACH_TRA_LOI, kiemTraLoi, coTrich, conCungCap, vanBanNguon, dongLuat, nguonNhom, chuGiaiPhanNhom, maMayChu, anhEmPhaiLoai, tenNut };
