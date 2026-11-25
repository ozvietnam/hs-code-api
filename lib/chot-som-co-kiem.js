// lib/chot-som-co-kiem.js — DỪNG SỚM CÓ KIỂM (công tắc HS_CHOT_SOM_CO_KIEM, mặc định TẮT).
//
// VÌ SAO (ca thật qua Cổng 21/11 — "Van điện từ khí nén 5/2 thân nhôm, cổng ren 1/4 inch, dùng điều khiển xi lanh khí
// nén", MiniMax, động cơ loop): vòng 1 đặt giả thuyết đứng đầu 8412.21 (xi lanh thuỷ lực), khai unknowns ⇒ nhánh
// earlyExitHoiTuR1 (lib/engine-loop.js) dựng HOI từ giả thuyết đó và BỎ vòng 2 — vòng 2 mới là nơi AI đọc chú giải, dòng
// biểu thuế và sổ tay (HS_SO_TAY=full chỉ chèn sổ tay vào gói vòng 2). Cùng lúc đó hồ sơ vụ việc (gather) ĐÃ có sẵn tín
// hiệu trái nhóm mà không ai dùng để chặn: tờ khai Oz khớp ≥75% từ khoá xếp nhóm 8481, 3 shop made-in-china cùng ghi 8481.
// Các tín hiệu này chỉ được đem ra dựng cờ review / cảnh báo SAU khi đã bỏ vòng 2.
//
// LÀM GÌ: tất định, không gọi LLM, không đổi prompt. Trước khi dừng sớm HOI, xét các tín hiệu ĐÃ CÓ trong hồ sơ vụ việc;
// có ÍT NHẤT MỘT tín hiệu trái NHÓM 4 SỐ với giả thuyết đứng đầu của vòng 1 ⇒ KHÔNG dừng sớm: đi tiếp vòng 2 như đường
// thường (gói vòng 2 vốn đã mang TIỀN LỆ OZ / TIỀN LỆ TB-TCHQ / bảng shop made-in-china / chú giải + sổ tay các nhóm).
// Module này KHÔNG chọn mã, KHÔNG chặn kết quả, KHÔNG gắn nhãn GIR / canCuPhapLy: chỉ quyết "có được bỏ vòng 2 hay không".
// Lỗi bất kỳ ⇒ trả [] (dừng sớm như cũ). Tắt công tắc ⇒ không được gọi tới.
//
// Ngưỡng: dùng LẠI ngưỡng mã nguồn đang dùng ở chỗ khác, không đặt ngưỡng mới (trừ số shop — xem (3)):
//  (1) tien-le-oz   — CÙNG HÀM với cờ review "Tiền lệ Oz … xếp nhóm X" (engine-loop.js gọi tienLeOzDanDau): chỉ tờ khai
//                     khớp ≥75% từ khoá; nhóm dẫn đầu ≥3 tờ khai và ≥60% trọng số.
//  (2) tb-tchq      — CÙNG phép kiểm gather() dùng để kéo nhóm của tiền lệ vào hồ sơ (OZV-517): searchPrecedents top 4,
//                     độ giống ≥0,6 VÀ tên hàng khớp (lib/giong-ten-hang.js). Chỉ nguồn TB-TCHQ.
//  (3) made-in-china — ≥3 shop khác nhau cùng ghi một nhóm khác (đồng thuận của gather là ≥2; 2 shop vẫn chỉ cảnh báo như
//                     OZV-1389 — ca bo mạch 18/11 hai shop là nhiễu), trừ nhóm mà từ điển tên thương mại đã loại (OZV-1290).
//  (4) so-tay-loai-tru — sổ tay của nhóm đứng đầu có mục loaiTru mà tên hàng khớp cụm (cổng soTayGates, kiểu "phrase"),
//                     trỏ sang nhóm khác. Chỉ khi HS_SO_TAY ≠ off (một công tắc tắt khẩn cấp cho mọi chỗ đọc sổ tay).
//                     Phần lớn trùng với cổng G8 vốn chạy trên đáp án dừng sớm; giữ ở đây để lý do được GHI TÊN.

const taxData = require('../data/tax.json');
const { soTayGates, soTayMode } = require('./so-tay-gates.js');
const { searchPrecedents } = require('./precedent-search.js');
const { doGiongTenHang } = require('./giong-ten-hang.js');
const { biCamTrade } = require('./trade-classify-hints.js');

const nz = (s) => String(s || '').replace(/\D/g, '');
const nhomCoThat = (h) => /^\d{4}$/.test(h) && Object.keys(taxData).some((k) => k.startsWith(h));

// Ngưỡng tiền lệ Oz — MỘT nguồn: khối dựng cờ review trong lib/engine-loop.js cũng gọi tienLeOzDanDau() bên dưới.
const OZ_KHOP_TOI_THIEU = 75;
const OZ_SO_TO_KHAI_TOI_THIEU = 3;
const OZ_TY_TRONG_TOI_THIEU = 0.6;
// Ngưỡng TB-TCHQ — PHẢI khớp gather() (OZV-517).
const TB_TOP_K = 4;
const TB_DO_GIONG_TOI_THIEU = 0.6;
const MIC_SO_SHOP_TOI_THIEU = 3;
const TRAN_NHOM_NAP = 2;

/** Công tắc: chỉ "on" / "1" / "true" mới bật. Mặc định TẮT — tắt thì động cơ dừng sớm y như trước. */
function bat() {
  return /^(on|1|true)$/i.test(String(process.env.HS_CHOT_SOM_CO_KIEM || '').trim());
}

/** Nhóm tiền lệ Oz dẫn đầu theo đúng luật của cờ review; null khi không nhóm nào đạt ngưỡng. */
function tienLeOzDanDau(ozPrecedents) {
  const byHead = new Map();
  for (const o of ozPrecedents || []) {
    const hs = nz(o?.hs);
    if ((o?.cov || 0) >= OZ_KHOP_TOI_THIEU && hs.length >= 4) byHead.set(hs.slice(0, 4), (byHead.get(hs.slice(0, 4)) || 0) + (o.oz || 1));
  }
  const ranked = [...byHead.entries()].sort((a, b) => b[1] - a[1]);
  const total = ranked.reduce((a, [, w]) => a + w, 0);
  const lead = ranked[0];
  if (!lead || lead[1] < OZ_SO_TO_KHAI_TOI_THIEU || lead[1] / total < OZ_TY_TRONG_TOI_THIEU) return null;
  return { nhom: lead[0], soToKhai: lead[1] };
}

/**
 * Tín hiệu tất định TRÁI NHÓM 4 SỐ với giả thuyết đứng đầu của vòng 1.
 * @param {object} p
 * @param {string} p.hs           mã đáp án dừng sớm (4–6 số) — nhóm đứng đầu lấy từ 4 số đầu
 * @param {object} p.gathered     hồ sơ vụ việc của gather() (ozPrecedents, mic, tradeHints)
 * @param {object} [p.r1]         kết quả vòng 1 (product.*) — dựng lại câu truy hồi TB-TCHQ y như gather()
 * @param {object} [p.raw]        hồ sơ gốc của khách (tenHang)
 * @param {string} [p.productText] @param {string} [p.productName] @param {string} [p.form]
 * @returns {Array<{ma: string, nhom: string, chiTiet: string}>} rỗng ⇒ được dừng sớm như cũ
 */
function tinHieuTraiNhom({ hs, gathered, r1, raw, productText = '', productName = '', form = '' } = {}) {
  const out = [];
  const h4 = nz(hs).slice(0, 4);
  if (h4.length !== 4 || !gathered) return out;
  const them = (ma, nhom, chiTiet) => { if (nhom && nhom !== h4 && nhomCoThat(nhom)) out.push({ ma, nhom, chiTiet }); };
  const tradeAvoid = gathered.tradeHints?.avoidPrefixes || [];

  // (1) tiền lệ Oz (bỏ các mã thuộc nhóm từ điển tên thương mại đã loại trừ theo chú giải)
  try {
    const ozHopLe = tradeAvoid.length
      ? (gathered.ozPrecedents || []).filter((o) => !biCamTrade(nz(o?.hs), tradeAvoid))
      : gathered.ozPrecedents;
    const lead = tienLeOzDanDau(ozHopLe);
    if (lead) them('tien-le-oz', lead.nhom, `${lead.soToKhai} tờ khai Oz khớp ≥${OZ_KHOP_TOI_THIEU}% từ khoá xếp nhóm ${lead.nhom}`);
  } catch { /* tín hiệu tuỳ chọn */ }

  // (2) TB-TCHQ khớp mô tả
  try {
    const product = r1?.product || {};
    const tenHang = raw?.tenHang || product.nameVi || '';
    const cau = [product.nameVi, product.purpose, product.material, raw?.tenHang].filter(Boolean).join(' ');
    const hang = { tenHang, moTa: [product.nameVi, product.purpose, product.material, raw?.tenHang].filter(Boolean).join('. ') };
    const daCo = new Set();
    for (const x of cau ? searchPrecedents(cau, { topK: TB_TOP_K }) : []) {
      if ((x.similarity || 0) < TB_DO_GIONG_TOI_THIEU) continue;
      if ((x.precedent?.loaiNguon || x.loaiNguon) !== 'TB-TCHQ') continue;
      const tenTB = x.precedent?.productNameRaw || x.precedent?.productName || x.productName || '';
      if (!doGiongTenHang(hang, tenTB).giong) continue;
      const nhom = nz(x.finalHsCode || x.precedent?.finalHsCode).slice(0, 4);
      if (daCo.has(nhom)) continue;
      daCo.add(nhom);
      them('tb-tchq', nhom, `${x.precedent?.tbTchqNumber || x.tbTchqNumber || 'TB-TCHQ'} (tên hàng khớp, giống ${Math.round((x.similarity || 0) * 100)}%) kết luận nhóm ${nhom}`);
    }
  } catch { /* tín hiệu tuỳ chọn */ }

  // (3) made-in-china
  try {
    const mic = gathered.mic?.consensus;
    const nhom = nz(mic?.heading4).slice(0, 4);
    const prefer = gathered.tradeHints?.preferCodes || [];
    const h4LaTradeHigh = prefer.some((c) => c?.confidence === 'high' && nz(c.hs).slice(0, 4) === h4);
    const micLaTradePhu = h4LaTradeHigh
      && prefer.some((c) => nz(c?.hs).slice(0, 4) === nhom)
      && !prefer.some((c) => c?.confidence === 'high' && nz(c.hs).slice(0, 4) === nhom);
    if (nhom && (mic.shops || 0) >= MIC_SO_SHOP_TOI_THIEU && !biCamTrade(nhom, tradeAvoid) && !micLaTradePhu) {
      them('made-in-china', nhom, `${mic.shops} shop made-in-china cùng ghi nhóm ${nhom}`);
    }
  } catch { /* tín hiệu tuỳ chọn */ }

  // (4) sổ tay nhóm đứng đầu loại trừ đích danh
  try {
    if (soTayMode() !== 'off') {
      const ch = soTayGates({ hs: nz(hs), productText, productName, form, pool: [] }, { loaiTruRequire: 'phrase', dong8: false }).challenges || [];
      for (const c of ch) {
        if (c.gate !== 'SO_TAY_LOAI_TRU' || !c.matched) continue;
        them('so-tay-loai-tru', nz(c.target).slice(0, 4), `sổ tay nhóm ${h4} loại trừ "${c.matched}" sang nhóm ${nz(c.target).slice(0, 4)}`);
      }
    }
  } catch { /* tín hiệu tuỳ chọn */ }

  return out;
}

/** Nhóm trái chiều CHƯA có trong hồ sơ vụ việc — động cơ nạp chú giải + dòng biểu thuế (gather) trước vòng 2. */
function nhomCanNap(tinHieu, headings) {
  const co = new Set(headings || []);
  return [...new Set((tinHieu || []).map((t) => t.nhom))].filter((n) => !co.has(n)).slice(0, TRAN_NHOM_NAP);
}

/**
 * soTay.daTra (luật L6 — "chưa tra" khác "đã tra, không nghi"): `outcome: "NONE"` là giá trị khởi tạo nên nhánh dừng sớm bỏ
 * vòng 2 cũng mang "NONE". Thêm TRƯỜNG MỚI thay vì đổi giá trị cũ (bên đọc outcome không vỡ):
 *   daTra: true  — một lượt vòng 2 thật đã chạy (AI đọc gói chú giải + sổ tay) VÀ cổng sổ tay đã xét đáp án của nó;
 *   daTra: false — kèm lyDoChuaTra: vì sao đáp án cuối chưa qua bước đó.
 * @param {object} p  { daTra: boolean, log: object[] (engine.gates), hs: string }
 */
function soTayDaTra({ daTra, log = [], hs = '' } = {}) {
  if (daTra) return { daTra: true };
  const co = (k, v = true) => log.some((l) => l && l[k] === v);
  let lyDo = 'khong-ro';
  if (co('earlyExitTradeChotSom')) lyDo = 'chot-som-tu-dien';
  else if (co('earlyExitHoi')) lyDo = 'dung-som-hoi';
  else if (co('earlyExitConflict')) lyDo = 'dung-som-bang-xung-dot';
  else if (co('boQuaVong2')) lyDo = 'fast-first';
  else if (nz(hs).length < 6) lyDo = 'ma-duoi-6-so';
  else lyDo = 'bi-chan-hoac-loi';
  return { daTra: false, lyDoChuaTra: lyDo };
}

module.exports = { bat, tinHieuTraiNhom, tienLeOzDanDau, nhomCanNap, soTayDaTra, MIC_SO_SHOP_TOI_THIEU };
