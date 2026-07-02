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
// tenHang + xuất xứ + tình trạng không bao giờ bị drop (tenHang chỉ bị cắt ngắn khi bất khả kháng).
const DROP_ORDER = ['quyCach', 'congDung', 'thongSoKyThuat', 'thanhPhanCauTao', 'model', 'nhanHieu'];

function composeWithMeta(declaration, opts = {}) {
  if (!declaration) {
    return { text: '', length: 0, fullText: '', fullLength: 0, truncated: false, dropped: [], maxLength: ECUS_MAX_LENGTH };
  }
  const maxLength = opts.maxLength || ECUS_MAX_LENGTH;
  const headParts = buildHeadParts(declaration);
  const tailParts = buildTailParts(declaration);

  const fullText = joinAll(headParts, tailParts);
  let text = fullText;
  const dropped = [];

  if (text.length > maxLength) {
    for (const key of DROP_ORDER) {
      if (text.length <= maxLength) break;
      const idx = headParts.findIndex((p) => p.key === key);
      if (idx === -1) continue;

      if (key === 'thongSoKyThuat') {
        // Cắt từng thông số từ cuối trước khi bỏ cả cụm
        const part = headParts[idx];
        while (part.specs.length > 1 && joinAll(headParts, tailParts).length > maxLength) {
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
      if (text.length > maxLength) text = text.slice(0, maxLength).trim();
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

module.exports = { composeCustomsDescription, composeWithMeta, ECUS_MAX_LENGTH };
