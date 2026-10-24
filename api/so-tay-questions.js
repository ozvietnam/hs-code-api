// api/so-tay-questions.js — Câu hỏi phân loại TẤT ĐỊNH lấy từ SỔ TAY THẬT
// (data/so-tay/<nhóm4số>.json) cho bước "Oz rà soát" của Cổng OZ / ERP.
//
// VÌ SAO: bước "Oz rà soát" ở portal đang hỏi khách câu CHUNG CHUNG vì chỉ có
// /api/declaration-fields (danh mục trường khai TĨNH). Sổ tay thật biết ĐẶC ĐIỂM
// QUYẾT ĐỊNH cần hỏi để chốt mã (missingFacts của chotDong8, cổng soTayGates)
// nhưng trước đây chỉ chạy chui trong /api/classify (chậm, có cờ HS_SO_TAY).
// Endpoint này mở một cửa NHANH cho nó.
//
// TẤT ĐỊNH: KHÔNG gọi LLM, KHÔNG engine-loop, KHÔNG phụ thuộc cờ HS_SO_TAY —
// chỉ đọc sổ tay tĩnh đã kiểm nguồn + tái dùng máy chốt dòng 8 số
// (lib/so-tay-gates.js) và danh mục trường khai (lib/declaration-fields.js).
// Mục tiêu ~vài chục ms, ngang /api/declaration-fields.
//
// CÔNG KHAI như /api/declaration-fields: chỉ đọc dữ liệu tĩnh, không tốn tiền,
// không chạm dữ liệu khách. Công tắc đóng khẩn cấp dùng chung: HS_PUBLIC_READ=false
// → đòi Bearer token.
//
// #411 (24/10/2026 — phục vụ "Kỷ luật hỏi" phía ERP): bước 3 đọc cả productText (haystack
// của lib/attributes.js, cùng máy dò với /api/classify) nên câu chung TT39 mà mô tả đã nêu
// ("PN16", "inox 304", "25 mm", "380V", "3 pha"…) tự rụng; mỗi câu mang `loai`
// (DONG_BIEU | CONG | TT39); câu TT39 là TUỲ CHỌN (required:false) khi có productText; câu
// DONG_BIEU kèm `tacDongThue` (chênh MFN giữa các dòng 8 số mà câu quyết định — chỉ tính,
// không đổi thứ tự). Toàn bộ ADDITIVE: không gửi productText → payload y như cũ (+2 field).

const { setCors, handleOptions } = require('../lib/cors');
const { publicReadEnabled } = require('../lib/public-access');
const { requireAuth } = require('../lib/auth');
const { loadSoTay, soTayGates, chotDong8, tacDongThueDong8, chatLieuTrong, MATERIALS } = require('../lib/so-tay-gates');
const { missingStructured } = require('../lib/declaration-fields');

// Nhãn tiếng Việt thân thiện cho từng đại lượng máy (khớp LOAI_GIA_TRI trong lib/so-tay-gates.js).
const FACT_LABELS = {
  duong_kinh: 'Đường kính',
  chieu_rong: 'Chiều rộng',
  chieu_dai: 'Chiều dài',
  chieu_cao: 'Chiều cao',
  be_day: 'Độ dày',
  khoi_luong: 'Khối lượng',
  trong_luong: 'Trọng lượng',
  cong_suat: 'Công suất',
  dien_ap: 'Điện áp',
  dong_dien: 'Dòng điện',
  dung_tich: 'Dung tích',
  ham_luong: 'Hàm lượng',
  ap_suat: 'Áp suất',
};
// Phương án chất liệu lấy từ chính bảng vật liệu máy đọc được (lib/so-tay-gates.js#MATERIALS).
const MATERIAL_OPTIONS = MATERIALS.map(([ten]) => ten);

const nz = (s) => String(s || '').replace(/\D/g, '');
const clip = (s, n) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n)}…` : t; };
const hasVal = (v) => v != null && String(v).trim() !== '';

module.exports = async function handler(req, res) {
  setCors(res, req);
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', hint: 'POST /api/so-tay-questions { hs: "<4–8 chữ số>", productText?, facts? }' });
  }
  // Mặc định công khai. Chỉ đòi token khi đã đóng cổng đọc công khai (HS_PUBLIC_READ=false).
  if (!publicReadEnabled() && requireAuth(req, res, {})) return;

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'DAU_VAO_SAI', chiTiet: ['Body không phải JSON hợp lệ.'] }); }
  }
  body = body && typeof body === 'object' && !Array.isArray(body) ? body : {};

  const code = nz(body.hs).slice(0, 8);
  if (code.length < 4) {
    return res.status(400).json({ error: 'DAU_VAO_SAI', chiTiet: ['Thiếu hoặc sai "hs" — cần mã 4–8 chữ số, vd "8481" hoặc "84811019".'] });
  }
  const h4 = code.slice(0, 4);
  const productText = typeof body.productText === 'string' ? body.productText : '';
  const facts = body.facts && typeof body.facts === 'object' && !Array.isArray(body.facts) ? body.facts : {};

  try {
    const s = loadSoTay(h4);
    if (!s) {
      // Nhóm chưa có sổ tay → portal tự fallback sang /api/declaration-fields. KHÔNG 500.
      res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=600');
      return res.status(200).json({ coSoTay: false, nhom: h4, questions: [] });
    }

    const questions = [];
    const seen = new Set();
    const add = (q) => { if (q && q.key && !seen.has(q.key)) { seen.add(q.key); questions.push(q); } };

    // 1) ĐẶC ĐIỂM QUYẾT ĐỊNH để chốt đuôi 8 số (máy chốt tất định — chotDong8).
    //    Chỉ khi THIEU_SO_LIEU: máy đã đọc hết số/vật liệu có trong productText rồi,
    //    phần CÒN THIẾU mới hỏi (tự lọc fact đã suy ra được từ mô tả).
    if (code.length >= 6) {
      const cd = chotDong8({ hs: code, productText });
      if (cd && cd.ketQua === 'THIEU_SO_LIEU' && Array.isArray(cd.missingFacts)) {
        const nguon = cd.traNguon && cd.traNguon[0] ? cd.traNguon[0] : null;
        for (const mf of cd.missingFacts) {
          const fact = String(mf.fact || '').trim();
          if (!fact) continue;
          // Tiền thuế treo trên câu trả lời (chênh MFN giữa các dòng 8 số mà đặc điểm này quyết định) — #411.
          const thue = tacDongThueDong8({ hs: code, fact });
          if (fact === 'chat_lieu' || fact === 'vat_lieu') {
            add({ key: 'chat_lieu', questionVi: 'Vật liệu chính của hàng là gì?', type: 'choice', options: MATERIAL_OPTIONS, required: true, loai: 'DONG_BIEU', tacDongThue: thue, nguon: nguon && nguon.nguon, trich: nguon && nguon.trich });
            continue;
          }
          const label = FACT_LABELS[fact];
          if (label) {
            add({ key: fact, questionVi: `${label}${mf.donVi ? ` (${mf.donVi})` : ''}?`, type: 'number', unit: mf.donVi || undefined, required: true, loai: 'DONG_BIEU', tacDongThue: thue, nguon: nguon && nguon.nguon, trich: nguon && nguon.trich });
          } else {
            // Đặc điểm chưa mô hình thành câu thân thiện → để Oz hỏi (ngôn ngữ luật).
            add({ key: fact, questionVi: `Cần xác định đặc điểm "${fact}"${mf.canThoa ? ` (điều kiện: ${mf.canThoa})` : ''} để chốt mã.`, type: 'choice', required: true, askStaff: true, loai: 'DONG_BIEU', tacDongThue: thue, nguon: nguon && nguon.nguon, trich: nguon && nguon.trich });
          }
        }
      }
    }

    // 2) Cổng sổ tay (loại trừ / ngưỡng / bộ phận / dòng "Loại khác") — máy NGHI khi hồ sơ
    //    có dấu hiệu lệch chú giải. Câu dùng ngôn ngữ luật hải quan → để "Oz hỏi" (askStaff).
    const g = soTayGates({ hs: code, productText });
    if (g && Array.isArray(g.challenges)) {
      for (const c of g.challenges) {
        const legal = Array.isArray(c.legal) && c.legal[0] ? c.legal[0] : null;
        add({ key: `gate_${c.gate}${c.target ? `_${c.target}` : ''}`, questionVi: c.questionVi, type: 'choice', options: ['Có', 'Không', 'Chưa rõ'], required: false, askStaff: true, loai: 'CONG', nguon: legal && legal.nguon, trich: legal && legal.trich });
      }
    }

    // 3) Trường khai bắt buộc còn thiếu theo nhóm hàng (TT 39/2018) — câu hỏi VI + ZH.
    //    missingStructured lọc trường đã có trong facts VÀ (#411) đã nêu trong productText: đưa mô tả vào
    //    `specs` — haystacks() của lib/attributes.js gộp specs vào chuỗi dò, nên `patterns`/`detect` của
    //    từng trường (data/chapter-declaration-fields.json, data/attributes.json) + từ điển nhãn tiếng Trung
    //    tự loại câu đã có đáp án ("PN16" → pressureRating, "inox" → material, "25 mm" → dimensions…).
    //    Không có productText → gọi y như cũ. Câu TT39 còn lại khi có mô tả là TUỲ CHỌN (ERP không hỏi khách,
    //    chuyên viên tự xác định) — khi không có mô tả giữ `required` như trước.
    const coMoTa = productText.trim() !== '';
    const hoSo = coMoTa ? { ...facts, specs: [facts.specs, productText].filter(hasVal).join(' • ') } : facts;
    // Vật liệu: máy dò của trường `material` chỉ bắt NHÃN ("chất liệu", "vật liệu"), không bắt TÊN vật liệu
    // ("inox 304", "nhựa PP") → đọc thêm bằng chính bảng vật liệu Việt + Hán mà bước 1 (chotDong8) dùng.
    const daCoVatLieu = coMoTa && chatLieuTrong(productText).length > 0;
    for (const f of missingStructured(code, hoSo)) {
      if (f.key === 'material' && (seen.has('chat_lieu') || daCoVatLieu)) continue; // đã hỏi ở bước 1 / mô tả đã nêu
      add({ key: f.key, questionVi: f.questionVi, questionZh: f.questionZh || undefined, type: 'choice', required: coMoTa ? false : Boolean(f.required), loai: 'TT39' });
    }

    // Không hỏi lại đặc điểm khách đã trả lời trong facts.
    const out = questions.filter((q) => !hasVal(facts[q.key]));

    // Dọn field rỗng cho response gọn + bám đúng CONTRACT.
    const clean = out.map((q) => {
      const o = { key: q.key, questionVi: q.questionVi, type: q.type, required: q.required, loai: q.loai };
      if (q.questionZh) o.questionZh = q.questionZh;
      if (q.unit) o.unit = q.unit;
      if (q.options) o.options = q.options;
      if (hasVal(q.nguon)) o.nguon = q.nguon;
      if (hasVal(q.trich)) o.trich = clip(q.trich, 240);
      if (q.askStaff) o.askStaff = true;
      if (q.tacDongThue) o.tacDongThue = q.tacDongThue; // chỉ câu DONG_BIEU (#411)
      return o;
    });

    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=600');
    return res.status(200).json({
      coSoTay: true,
      nhom: h4,
      nguonSoTay: `Sổ tay HS nhóm ${h4}${s.phienBan ? ` (${s.phienBan})` : ''}`,
      questions: clean,
    });
  } catch (e) {
    return res.status(500).json({ error: 'so-tay-questions failed', detail: e.message });
  }
};
