// lib/so-tay-cau-hoi.js — LÕI TẤT ĐỊNH sinh câu hỏi phân loại từ SỔ TAY THẬT (data/so-tay/<nhóm4số>.json).
//
// Tách NGUYÊN VĂN từ api/so-tay-questions.js (không đổi một phép tính nào) để hai nơi dùng CHUNG một lõi:
//   · POST /api/so-tay-questions (bước "Oz rà soát" của Cổng OZ / ERP) — hợp đồng trả về y như trước;
//   · lib/hoi-theo-so-tay.js (công tắc HS_HOI_THEO_SO_TAY) — dựng lại câu hỏi gửi khách của /api/classify theo sổ.
// KHÔNG gọi LLM, KHÔNG engine-loop, KHÔNG phụ thuộc cờ HS_SO_TAY: chỉ đọc sổ tay tĩnh đã kiểm nguồn + máy chốt dòng
// 8 số (lib/so-tay-gates.js) + danh mục trường khai (lib/declaration-fields.js).

const { loadSoTay, soTayGates, chotDong8, tacDongThueDong8, chatLieuTrong, MATERIALS, khoaCuaFact } = require('./so-tay-gates');
const { missingStructured } = require('./declaration-fields');

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

const clip = (s, n) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n)}…` : t; };
const hasVal = (v) => v != null && String(v).trim() !== '';

/**
 * Câu hỏi tất định cho mã `code` (4–8 chữ số, ĐÃ chuẩn hoá chỉ còn chữ số).
 * @param {{code: string, productText?: string, facts?: object}} p
 * @returns {{coSoTay: boolean, nhom: string, nguonSoTay?: string, questions: object[]}}
 */
function cauHoiSoTay({ code, productText = '', facts = {} } = {}) {
  const h4 = String(code || '').slice(0, 4);
  const s = loadSoTay(h4);
  if (!s) {
    // Nhóm chưa có sổ tay → bên gọi tự fallback (portal: /api/declaration-fields). KHÔNG ném lỗi.
    return { coSoTay: false, nhom: h4, questions: [] };
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
        // #OZV-723: fact khoá mới (tu-vung@2, vd `duongKinh`) tra ngược anh-xa-cu về nhãn của khoá cũ —
        // vẫn sinh câu number thân thiện, `key` giữ nguyên fact gốc để truy vết về điều kiện trong sổ tay.
        const label = FACT_LABELS[khoaCuaFact(fact) || fact];
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

  return {
    coSoTay: true,
    nhom: h4,
    nguonSoTay: `Sổ tay HS nhóm ${h4}${s.phienBan ? ` (${s.phienBan})` : ''}`,
    questions: clean,
  };
}

module.exports = { cauHoiSoTay, FACT_LABELS, MATERIAL_OPTIONS };
