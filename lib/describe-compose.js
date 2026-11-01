// ECUS/VNACCS "Mô tả hàng hóa" giới hạn 200 ký tự (tính cả dấu cách).
// Quy ước khai báo: xuất xứ + tình trạng luôn nằm CUỐI mô tả — không bao giờ bị cắt.
const ECUS_MAX_LENGTH = 200;

const SEP = '; ';

function buildHeadParts(declaration) {
  const parts = [];
  if (declaration.tenHang) parts.push({ key: 'tenHang', text: declaration.tenHang });
  if (declaration.nhanHieu && declaration.nhanHieu !== 'N/A') {
    parts.push({ key: 'nhanHieu', text: `nhãn hiệu ${declaration.nhanHieu}` });
  }
  if (declaration.model) parts.push({ key: 'model', text: `model ${declaration.model}` });
  if (declaration.thanhPhanCauTao) {
    parts.push({ key: 'thanhPhanCauTao', text: `thành phần: ${declaration.thanhPhanCauTao}` });
  }
  const specs = Array.isArray(declaration.thongSoKyThuat) ? declaration.thongSoKyThuat.filter(Boolean) : [];
  if (specs.length) {
    parts.push({ key: 'thongSoKyThuat', specs: [...specs] });
  }
  if (declaration.congDung) parts.push({ key: 'congDung', text: `công dụng: ${declaration.congDung}` });
  if (declaration.quyCach) parts.push({ key: 'quyCach', text: `quy cách: ${declaration.quyCach}` });
  return parts;
}

function buildTailParts(declaration) {
  const parts = [];
  if (declaration.xuatXu?.nameVi) parts.push(`xuất xứ ${declaration.xuatXu.nameVi}`);
  if (declaration.tinhTrang) parts.push(declaration.tinhTrang);
  return parts;
}

function partText(p) {
  if (p.specs) return `thông số: ${p.specs.join('; ')}`;
  return p.text;
}

function joinAll(headParts, tailParts) {
  const texts = [...headParts.map(partText), ...tailParts];
  return texts.join(SEP).replace(/\s+/g, ' ').trim();
}

// Thứ tự hy sinh khi vượt 200 ký tự — phần phụ trước, phần định danh sau.
// tenHang + xuất xứ + tình trạng không bao giờ bị drop (tenHang chỉ bị cắt ngắn khi bất khả khóng).
const DROP_ORDER = ['quyCach', 'congDung', 'thongSoKyThuat', 'thanhPhanCauTao', 'model', 'nhanHieu'];
// #324: nhóm máy móc (84/85 — template machineryGeneric bắt buộc power/voltage): thông số là chứng từ
// phân loại, KHÔNG bị hy sinh trước phụ đề. Đưa thông số xuống cuối thứ tự cắt + ưu tiên giữ dòng có số+đơn vị.
const DROP_ORDER_KEEP_SPECS = ['quyCach', 'congDung', 'thanhPhanCauTao', 'model', 'nhanHieu', 'thongSoKyThuat'];
// Đường dự phòng của /api/describe (LLM lỗi, #725 nhóm C): thứ tự GIỮ = tên hàng > model/mã > thông số phân biệt mã >
// chất liệu/công dụng > nhãn hiệu (xuất xứ + tình trạng luôn ở cuối, không bao giờ cắt) → thứ tự BỎ ngược lại.
const DROP_ORDER_DU_PHONG = ['quyCach', 'nhanHieu', 'congDung', 'thanhPhanCauTao', 'thongSoKyThuat', 'model'];
const SPEC_CO_BAT_BUOC_RE = /\d\s*(kw|w|hp|kva|v|a)\b|\b\d+\s*(kw|w|hp|kva|v|a)\b/i;
function xepSpecsUuTien(specs) {
  // Dòng mang số+đơn vị công suất/điện áp/dòng → xếp ĐẦU: rút gọn bỏ thông số bằng pop() (bỏ từ CUỐI), nên dòng phụ phải
  // nằm cuối để bị bỏ trước (#725 lỗi 31: trước đây xếp cuối nên pop() bỏ đúng công suất/điện áp).
  const coSo = []; const khongSo = [];
  for (const sp of specs) (SPEC_CO_BAT_BUOC_RE.test(sp) ? coSo : khongSo).push(sp);
  return [...coSo, ...khongSo];
}

/** Cắt ≤ maxLength tại ranh giới cụm ("; ") hoặc từ — không bao giờ để mảnh từ/khoá cụt ("…die", "…van g"). */
function catTheoRanhGioi(text, maxLength) {
  if (text.length <= maxLength) return text;
  const dau = text.slice(0, maxLength + 1);
  const cum = dau.lastIndexOf(SEP);
  if (cum > maxLength * 0.5) return dau.slice(0, cum).trim();
  const tu = dau.lastIndexOf(' ');
  return (tu > maxLength * 0.5 ? dau.slice(0, tu) : text.slice(0, maxLength)).replace(/[;,:\s]+$/, '').trim();
}

function composeWithMeta(declaration, opts = {}) {
  if (!declaration) {
    return { text: '', length: 0, fullText: '', fullLength: 0, truncated: false, dropped: [], maxLength: ECUS_MAX_LENGTH };
  }
  const maxLength = opts.maxLength || ECUS_MAX_LENGTH;
  const headParts = buildHeadParts(declaration);
  if (opts.keepSpecs) {
    const idx = headParts.findIndex((p) => p.key === 'thongSoKyThuat');
    if (idx !== -1) headParts[idx].specs = xepSpecsUuTien(headParts[idx].specs);
  }
  const tailParts = buildTailParts(declaration);

  const fullText = joinAll(headParts, tailParts);
  let text = fullText;
  const dropped = [];

  if (text.length > maxLength) {
    const order = opts.uuTien === 'duPhong' ? DROP_ORDER_DU_PHONG : opts.keepSpecs ? DROP_ORDER_KEEP_SPECS : DROP_ORDER;
    for (const key of order) {
      if (text.length <= maxLength) break;
      const idx = headParts.findIndex((p) => p.key === key);
      if (idx === -1) continue;

      if (key === 'thongSoKyThuat') {
        // Cắt từng thông số từ cuối trước khi bỏ cả cụm (giữ ít nhất 1 dòng — dòng số+đơn vị đã xếp ĐẦU khi keepSpecs)
        const part = headParts[idx];
        const floor = opts.keepSpecs || opts.uuTien === 'duPhong' ? Math.min(1, part.specs.length) : 1;
        while (part.specs.length > floor && joinAll(headParts, tailParts).length > maxLength) {
          part.specs.pop();
          dropped.push('thongSoKyThuat[item]');
        }
        if (joinAll(headParts, tailParts).length > maxLength) {
          headParts.splice(idx, 1);
          dropped.push(key);
        }
      } else {
        headParts.splice(idx, 1);
        dropped.push(key);
      }
      text = joinAll(headParts, tailParts);
    }

    // Bất khả kháng: chỉ còn tenHang + xuất xứ + tình trạng mà vẫn vượt →
    // cắt tenHang tại ranh giới từ, giữ nguyên đuôi bắt buộc.
    if (text.length > maxLength) {
      const tail = tailParts.join(SEP);
      const budget = maxLength - (tail ? tail.length + SEP.length : 0);
      const tenIdx = headParts.findIndex((p) => p.key === 'tenHang');
      if (tenIdx !== -1 && budget > 0) {
        let ten = headParts[tenIdx].text.replace(/\s+/g, ' ').trim();
        if (ten.length > budget) {
          ten = ten.slice(0, budget);
          const lastSpace = ten.lastIndexOf(' ');
          if (lastSpace > budget * 0.5) ten = ten.slice(0, lastSpace);
          headParts[tenIdx].text = ten.trim();
          dropped.push('tenHang[trimmed]');
        }
      }
      text = joinAll(headParts, tailParts);
      if (text.length > maxLength) text = catTheoRanhGioi(text, maxLength);
    }
  }

  return {
    text,
    length: text.length,
    fullText,
    fullLength: fullText.length,
    truncated: text !== fullText,
    dropped,
    maxLength,
  };
}

function composeCustomsDescription(declaration, opts = {}) {
  return composeWithMeta(declaration, opts).text;
}

module.exports = { composeCustomsDescription, composeWithMeta, catTheoRanhGioi, ECUS_MAX_LENGTH };
