// lib/tim-truoc.js — TÌM TRƯỚC, ĐOÁN SAU (công tắc HS_TIM_TRUOC, mặc định TẮT).
//
// VÌ SAO (đo 21/11, không LLM, 2.000 dòng data/oz-gold-final.jsonl bỏ-một-dòng): kho tìm BẰNG CHỮ đưa nhóm 4 số đúng vào
// top 5 ở ~88–93% ca, nhưng động cơ hai vòng cho AI đoán nhóm ở vòng 1 CHỈ từ hồ sơ thô; gather() chạy SAU vòng 1 và kết quả
// tìm theo mô tả chỉ thêm nhóm ở ~0,5% ca (cổng độ giống ≥0,6 + giống tên). Ca thật qua Cổng: "Van điện từ khí nén 5/2 thân
// nhôm…" → 848180 hoặc 841221; searchCandidates xếp 84812090 hạng 1 cho đúng câu đó nhưng vòng 1 không được thấy.
//
// LÀM GÌ: tất định, không gọi LLM, không đổi lời dặn hệ thống, không dựng kho/chỉ mục mới. Trước vòng 1 chạy CÁC HÀM TÌM
// SẴN CÓ bằng HAI câu (mô tả nguyên văn + tên ngắn), gộp bằng bỏ phiếu theo thứ hạng, lấy top 5 nhóm 4 số kèm bằng chứng
// ngắn → một KHỐI DỮ LIỆU ≤ 1.500 ký tự nối vào đầu vào vòng 1, và các nhóm đó được nạp vào gather() (chú giải / sổ tay /
// dòng biểu thuế) như ứng viên. Module này KHÔNG chọn mã, KHÔNG chặn kết quả, KHÔNG gắn nhãn GIR / canCuPhapLy (L3: nhóm
// vẫn do động cơ — vòng 1/vòng 2 — quyết). Lỗi bất kỳ ⇒ không có khối, động cơ chạy như cũ. Tắt công tắc ⇒ không được gọi.
//
// Nguồn (đều là hàm đang dùng ở chỗ khác):
//   tb      — searchPrecedents (TB-TCHQ / tiền lệ)                   lib/precedent-search.js
//   oz      — searchOzByKeyword (tờ khai Oz)                          lib/oz-precedent-search.js (gọi qua module: test thay được)
//   bieu    — searchCandidates (biểu thuế + alias + từ điển)          lib/search-utils.js
//   tuDien  — tradeClassifyHints (từ điển tên thương mại, người soạn)  lib/trade-classify-hints.js
//   deNham  — matchByText (cặp mã dễ nhầm: mã Hải quan hay ấn định)    lib/confusion-pairs.js
// Gộp: như phép đo nền (bỏ phiếu theo thứ hạng, điểm 1/(10+hạng), mỗi nguồn × mỗi câu là một lá phiếu).
// Cạnh sổ tay hai chiều (nhóm dễ nhầm): lib/so-tay-gates.js nhomLienQuanSoTay — chỉ khi HS_SO_TAY ≠ off.

const taxData = require('../data/tax.json');
const { searchPrecedents } = require('./precedent-search.js');
const ozSearch = require('./oz-precedent-search.js'); // gọi qua module để test thay được
const { searchCandidates } = require('./search-utils.js');
const { tradeClassifyHints, biCamTrade } = require('./trade-classify-hints.js');
const { matchByText } = require('./confusion-pairs.js');
const { soTayMode, nhomLienQuanSoTay } = require('./so-tay-gates.js');

const TOP_NHOM = 5;
const TRAN_DE_NHAM = 2;
const TRAN_KY_TU = 1500;
const TRAN_BANG_CHUNG = 2;
const TRAN_PN6 = 3;
const HANG_SO_PHIEU = 10; // 1/(10+hạng) — đúng hằng số của phép đo nền
const OZ_KHOP_HIEN = 60; // chỉ ĐƯA RA làm bằng chứng tờ khai khớp ≥60% từ khoá (cùng ngưỡng ozLines của gather); phiếu thì tính hết
const TRAN_CAU = 600;
const CHU_HAN = /[一-鿿]/;

const nz = (s) => String(s || '').replace(/\D/g, '');
const clip = (s, n) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n)}…` : t; };
const _nhomCoThat = new Set();
const nhomCoThat = (h) => {
  if (!/^\d{4}$/.test(h)) return false;
  if (!_nhomCoThat.size) for (const k of Object.keys(taxData)) if (/^\d{8}$/.test(k)) _nhomCoThat.add(k.slice(0, 4));
  return _nhomCoThat.has(h);
};

/** Công tắc: chỉ "on" / "1" / "true" mới bật. Mặc định TẮT — tắt thì động cơ chạy y như trước. */
function bat() {
  return /^(on|1|true)$/i.test(String(process.env.HS_TIM_TRUOC || '').trim());
}

/**
 * HS_TIM_TRUOC_NAP — số nhóm đứng đầu được NẠP vào gather() (0–5; trống / không phải số = 5). Chỉ có tác dụng khi
 * HS_TIM_TRUOC bật. Khối đưa vào vòng 1 luôn đủ top 5; tham số này chỉ chỉnh phần gói vòng 2: đo 21/11 (LLM giả, 98 dòng
 * gold, HS_SO_TAY=full) nạp đủ 5 + 2 nhóm làm gói vòng 2 dài từ ~5,5 nghìn lên ~22 nghìn ký tự. 0 = không nạp nhóm nào.
 * Nhóm dễ nhầm theo sổ tay chỉ được nạp khi ứng viên mà nó nối tới cũng được nạp.
 */
function soNhomNap() {
  const v = String(process.env.HS_TIM_TRUOC_NAP ?? '').trim();
  return /^\d+$/.test(v) ? Math.min(TOP_NHOM, Number(v)) : TOP_NHOM;
}

/**
 * Tên ngắn TẤT ĐỊNH lấy từ tên hàng khách khai (không LLM): cụm đầu trước dấu ngắt, bỏ đuôi nhãn hiệu / model / NSX /
 * kích thước, bỏ token lẫn số, tối đa 10 từ. Mô tả dài làm loãng phép tìm chữ (đo nền: 53% ca trượt vào top 5 khi hỏi
 * bằng tên ngắn). Có chữ Hán (tiêu đề Taobao) → "" (kho chữ tiếng Việt không tìm được, bỏ qua).
 */
function tenNgan(tenHang) {
  const th = String(tenHang || '').replace(/\s+/g, ' ').trim();
  if (!th || CHU_HAN.test(th)) return '';
  let dau = th.split(/\s[—–-]\s|[:(,;\n]/)[0] || th;
  dau = dau.replace(/(^|\s)(nhãn hiệu|thương hiệu|model|nsx|hãng sản xuất|hãng sx|nhà sản xuất|kích thước|kích cỡ|quy cách|mới 100)(\s|$).*$/iu, ' ');
  dau = dau.replace(/\shiệu\s+(?=[A-Z0-9]).*$/u, ' ');
  const tu = dau.split(/\s+/).filter((t) => t && !/\d/.test(t)).slice(0, 10);
  return tu.join(' ').trim();
}

/** Mô tả nguyên văn (câu D): tên hàng + các trường khách khai. */
function cauMoTa(raw) {
  const r = raw || {};
  if (CHU_HAN.test(String(r.tenHang || ''))) return '';
  return clip([r.tenHang, r.chatLieu, r.congDung, r.chucNang, r.customerDescription].filter(Boolean).join(' '), TRAN_CAU).replace(/…$/, '');
}

/** Bỏ phiếu theo thứ hạng ở độ dài tiền tố L (4 hoặc 6): mỗi danh sách một lá phiếu, mã trùng tiền tố chỉ tính lần đầu. */
function gop(lists, L) {
  const diem = new Map();
  for (const l of lists) {
    const seen = new Set();
    let r = 0;
    for (const c of l || []) {
      const p = String(c).slice(0, L);
      if (p.length < L || seen.has(p)) continue;
      seen.add(p);
      r += 1;
      diem.set(p, (diem.get(p) || 0) + 1 / (HANG_SO_PHIEU + r));
    }
  }
  return [...diem.entries()].sort((a, b) => (b[1] - a[1]) || (a[0] < b[0] ? -1 : 1));
}

async function timMotCau(q, { locOz } = {}) {
  const o = { tb: [], oz: [], bieu: [], tuDien: null, deNham: [] };
  if (!q || q.length < 3) return o;
  try { o.tb = searchPrecedents(q, { topK: 30 }) || []; } catch { o.tb = []; }
  try {
    const items = (await ozSearch.searchOzByKeyword(q, { limit: 50 })).items || [];
    o.oz = typeof locOz === 'function' ? items.filter(locOz) : items;
  } catch { o.oz = []; }
  try { o.bieu = searchCandidates(q, { topCandidates: 20 }) || []; } catch { o.bieu = []; }
  try { o.tuDien = tradeClassifyHints(q); } catch { o.tuDien = null; }
  try { o.deNham = matchByText(q) || []; } catch { o.deNham = []; }
  return o;
}

const maTb = (x) => nz(x.finalHsCode || x.precedent?.finalHsCode).padEnd(8, '0').slice(0, 8);
const tenTb = (x) => x.precedent?.productNameRaw || x.precedent?.productName || x.productName || '';
const soTb = (x) => x.precedent?.tbTchqNumber || x.tbTchqNumber || x.precedent?.loaiNguon || 'tiền lệ';

/**
 * @param {object} raw hồ sơ gốc của khách (tenHang, chatLieu, congDung…)
 * @param {object} [opts] locOz: lọc tờ khai Oz (chỉ phép đo bỏ-một-dòng dùng); cau: {D,T} ghi đè hai câu hỏi (phép đo)
 * @returns {Promise<{khoi: string, nhomNap: string[], tomTat: object}>}
 */
async function timTruoc(raw, opts = {}) {
  const t0 = Date.now();
  // L6: "chưa tìm / bỏ qua / lỗi" có trạng thái riêng, không trùng "đã tìm, không có ứng viên".
  const rong = (trangThai) => ({ khoi: '', nhomNap: [], tomTat: { trangThai, nhom: [], nap: [], deNham: [], nguon: {}, kyTu: 0, ms: Date.now() - t0 } });
  try {
    const D = opts.cau?.D ?? cauMoTa(raw);
    let T = opts.cau?.T ?? tenNgan(raw?.tenHang);
    if (!D && !T) return rong(CHU_HAN.test(String(raw?.tenHang || '')) ? 'BO_QUA_TEN_CHU_HAN' : 'BO_QUA_KHONG_CO_TEN');
    if (T && T.toLowerCase() === String(D).toLowerCase()) T = ''; // hai câu trùng nhau → một lượt (thứ hạng gộp không đổi)
    const kq = [];
    if (D) kq.push(await timMotCau(D, opts));
    if (T) kq.push(await timMotCau(T, opts));

    const cam = [...new Set(kq.flatMap((k) => k.tuDien?.avoidPrefixes || []))];
    const dsTheoNguon = (k) => ({
      tb: k.tb.map(maTb),
      oz: k.oz.map((o) => nz(o.hsCode)),
      bieu: k.bieu.map((x) => nz(x.hsCode)),
      tuDien: [...(k.tuDien?.preferCodes || []).map((c) => nz(c.hs)), ...(k.tuDien?.preferHeadings || []).map(nz)],
      deNham: k.deNham.flatMap((h) => h.entry?._correct || []).map(nz),
    });
    const ds = kq.map(dsTheoNguon);
    const moiDs = ds.flatMap((d) => Object.values(d));
    const hop = (h) => nhomCoThat(h) && !biCamTrade(h, cam);
    const xep4 = gop(moiDs, 4).filter(([h]) => hop(h));
    const nhom = xep4.slice(0, TOP_NHOM).map(([h]) => h);
    if (!nhom.length) return rong('KHONG_CO_UNG_VIEN');

    // Nguồn nào bỏ phiếu cho nhóm nào (để đo).
    const nguon = {};
    for (const h of nhom) nguon[h] = [...new Set(ds.flatMap((d) => Object.entries(d).filter(([, l]) => l.some((c) => c.startsWith(h))).map(([n]) => n)))];

    // Cạnh sổ tay HAI CHIỀU: nhóm B có sổ tay trỏ sang ứng viên A (hoặc sổ tay A trỏ sang B) → "nhóm dễ nhầm", tối đa 2.
    let deNham = [];
    try {
      if (soTayMode() !== 'off') {
        const diem4 = new Map(xep4);
        const ung = new Map();
        // Sổ tay một nhóm có thể trỏ sang 20–30 nhóm (8481: 29). Trần 2 ⇒ phải xếp: chỉ nhận nhóm B mà phép tìm chữ CŨNG có
        // phiếu (ngoài top 5), ưu tiên B nối với ứng viên hạng cao hơn, rồi B nhiều phiếu hơn. B không có phiếu nào thì không
        // nạp (chọn bừa theo thứ tự số sẽ làm phình gói vòng 2 bằng nhóm không liên quan).
        nhom.forEach((a, i) => { for (const b of nhomLienQuanSoTay(a)) if (!nhom.includes(b) && hop(b) && diem4.has(b) && !ung.has(b)) ung.set(b, { nhom: b, voi: a, hang: i }); });
        deNham = [...ung.values()].sort((x, y) => (x.hang - y.hang) || ((diem4.get(y.nhom) || 0) - (diem4.get(x.nhom) || 0)) || (x.nhom < y.nhom ? -1 : 1)).slice(0, TRAN_DE_NHAM);
      }
    } catch { deNham = []; }

    // Bằng chứng ngắn cho từng nhóm (tối đa 2) + phân nhóm 6 số được bằng chứng chỉ tới.
    const muc = nhom.map((h) => {
      const bc = [];
      // Tiền lệ giống nhất của nhóm (trong cả hai câu), ghi kèm độ giống để AI tự cân — như dòng TIỀN LỆ TB-TCHQ của gather().
      const tb = kq.flatMap((k) => k.tb).filter((x) => maTb(x).startsWith(h)).sort((a, b) => (b.similarity || 0) - (a.similarity || 0))[0];
      if (tb) bc.push(`${soTb(tb)} → ${maTb(tb)} (giống ${Math.round((tb.similarity || 0) * 100)}%): ${clip(tenTb(tb), 70)}`);
      const ozTheoMa = new Map();
      for (const o of kq.flatMap((k) => k.oz)) {
        const c = nz(o.hsCode);
        if (!c.startsWith(h) || (o.matchCoverage || 0) < OZ_KHOP_HIEN) continue;
        const e = ozTheoMa.get(c) || { ma: c, so: 0, ten: o.tenHang, da: new Set() };
        const khoa = `${o.tenHang}|${o.chatLieu || ''}|${o.congDung || ''}`;
        if (!e.da.has(khoa)) { e.da.add(khoa); e.so += o.ozCount || 1; }
        ozTheoMa.set(c, e);
      }
      const oz = [...ozTheoMa.values()].sort((a, b) => (b.so - a.so) || (a.ma < b.ma ? -1 : 1))[0];
      if (oz) bc.push(`${oz.so} tờ khai OZ khai mã ${oz.ma}: ${clip(oz.ten, 50)}`);
      if (bc.length < TRAN_BANG_CHUNG) {
        const td = kq.flatMap((k) => k.tuDien?.matches || []).find((m) => (m.candidates || []).some((c) => nz(c.hsCode || c.hs).startsWith(h)));
        if (td) bc.push(`từ điển tên thương mại: ${clip(td.titleVi || td.entryId, 70)}`);
      }
      if (bc.length < TRAN_BANG_CHUNG) {
        const dn = kq.flatMap((k) => k.deNham).find((x) => (x.entry?._correct || []).some((c) => String(c).startsWith(h)));
        if (dn) bc.push(`cặp dễ nhầm ${dn.entry.id}: ${clip(dn.entry.nameVi, 60)}`);
      }
      if (bc.length < TRAN_BANG_CHUNG) {
        const bt = kq.flatMap((k) => k.bieu).find((x) => nz(x.hsCode).startsWith(h) && !/^[-\s]*loại khác/i.test(String(x.nameVi || '')));
        if (bt) bc.push(`dòng biểu thuế ${nz(bt.hsCode)}: ${clip(String(bt.nameVi || '').replace(/^[-\s]+/, ''), 60)}`);
      }
      const pn6 = gop(moiDs.map((l) => l.filter((c) => c.startsWith(h) && c.length >= 6)), 6).slice(0, TRAN_PN6).map(([p]) => p);
      return { nhom: h, pn6, bangChung: bc.slice(0, TRAN_BANG_CHUNG) };
    });

    const khoi = dungKhoi(muc, deNham);
    const nNap = soNhomNap();
    const nhomNap = [...nhom.slice(0, nNap), ...deNham.filter((d) => d.hang < nNap).map((d) => d.nhom)];
    return {
      khoi,
      nhomNap,
      tomTat: { trangThai: 'CO_UNG_VIEN', nhom, nap: nhomNap, pn6: Object.fromEntries(muc.map((m) => [m.nhom, m.pn6])), deNham: deNham.map((d) => d.nhom), nguon, tenNgan: T || null, soCau: kq.length, kyTu: khoi.length, ms: Date.now() - t0 },
    };
  } catch {
    return rong('LOI');
  }
}

const NHAN_KHOI = 'ỨNG VIÊN TÌM ĐƯỢC TRONG KHO THEO MÔ TẢ (máy tìm bằng chữ trong tiền lệ, tờ khai cũ, biểu thuế — là tín hiệu để cân nhắc, không phải đáp án; chú giải và GIR vẫn quyết định; đây KHÔNG phải hồ sơ của hàng, không chép làm evidence)';

/** Khối dữ liệu nối vào đầu vào vòng 1, ≤ TRAN_KY_TU ký tự: cắt bằng chứng của nhóm hạng thấp trước. */
function dungKhoi(muc, deNham) {
  const ban = muc.map((m) => ({ ...m, bangChung: [...m.bangChung] }));
  const ve = () => [
    `${NHAN_KHOI}:`,
    ...ban.map((m, i) => [`${i + 1}. Nhóm ${m.nhom}${m.pn6.length ? ` — phân nhóm: ${m.pn6.join(', ')}` : ''}`, ...m.bangChung.map((b) => `   • ${b}`)].join('\n')),
    deNham.length ? `Nhóm dễ nhầm theo sổ tay (cân nhắc cả hai phía): ${deNham.map((d) => `${d.nhom} (với ${d.voi})`).join(', ')}` : '',
  ].filter(Boolean).join('\n');
  let s = ve();
  for (let i = ban.length - 1; s.length > TRAN_KY_TU && i >= 0;) {
    if (ban[i].bangChung.length) ban[i].bangChung.pop(); else i -= 1;
    s = ve();
  }
  return s.length > TRAN_KY_TU ? s.slice(0, TRAN_KY_TU) : s;
}

module.exports = { bat, soNhomNap, timTruoc, tenNgan, cauMoTa, gop, dungKhoi, TOP_NHOM, TRAN_DE_NHAM, TRAN_KY_TU, NHAN_KHOI };
