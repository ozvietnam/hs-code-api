const customsTypesData = require('../data/customs-types.json');
const { geminiGenerateJson } = require('./gemini');

const typesByCode = customsTypesData.types || {};

function listTypes({ direction, category } = {}) {
  return Object.values(typesByCode).filter((row) => {
    if (direction && row.direction !== direction) return false;
    if (category && row.category !== category) return false;
    return true;
  });
}

function getTypeByCode(code) {
  const key = String(code || '').toUpperCase().trim();
  return typesByCode[key] || null;
}

function recommendByRules({ scenario = '', hsCode, direction, buyer }) {
  const s = String(scenario || '').toLowerCase();
  const dir = direction || (/\b(xuất|xk|export)\b/.test(s) ? 'XK' : /\b(nhập|nk|import)\b/.test(s) ? 'NK' : null);

  if (/\bnhập\b.*gia công|\bnhập\b.*gia cong|gia công.*\bnhập\b|nvl gia công/.test(s)) {
    return { recommended: 'A21', confidence: 0.9, reasoning: 'NK nguyên liệu gia công', method: 'rules' };
  }
  if (/\bnhập\b.*chế xuất|\bnhập\b.*che xuat|chế xuất.*\bnhập\b/.test(s)) {
    return { recommended: 'A22', confidence: 0.9, reasoning: 'NK chế xuất', method: 'rules' };
  }

  if (dir === 'XK' || /\b(xuất khẩu|xuất)\b/.test(s)) {
    if (/gia công|gia cong|processing/.test(s)) {
      return { recommended: 'B13', confidence: 0.88, reasoning: 'Xuất sản phẩm gia công', method: 'rules' };
    }
    if (/chế xuất|che xuat/.test(s)) {
      return { recommended: 'B14', confidence: 0.85, reasoning: 'Xuất chế xuất', method: 'rules' };
    }
    if (/tạm xuất|tam xuat/.test(s)) {
      return { recommended: 'B21', confidence: 0.82, reasoning: 'Tạm xuất tái nhập', method: 'rules' };
    }
  }

  if (dir === 'NK' || !dir) {
    if (/đầu tư|dau tu|tscđ|tscd|máy móc thiết bị|may moc thiet bi/.test(s)) {
      return { recommended: 'A41', confidence: 0.9, reasoning: 'NK tài sản đầu tư / máy móc thiết bị', method: 'rules' };
    }
    if (/sản xuất|san xuat|nguyên liệu|nvl|bán thành phẩm/.test(s)) {
      return { recommended: 'A12', confidence: 0.82, reasoning: 'NK phục vụ sản xuất kinh doanh', method: 'rules' };
    }
    if (/mẫu|mau|sample/.test(s)) {
      return { recommended: 'A43', confidence: 0.8, reasoning: 'NK hàng mẫu', method: 'rules' };
    }
    if (/tmđt|ecommerce|thương mại điện tử/.test(s)) {
      return { recommended: 'H11', confidence: 0.78, reasoning: 'NK qua thương mại điện tử', method: 'rules' };
    }
    if (/iphone|điện thoại|bán|kinh doanh|thương mại/.test(s)) {
      return {
        recommended: 'A11',
        confidence: 0.85,
        reasoning: 'NK kinh doanh tiêu dùng — hàng hóa thương mại',
        method: 'rules',
      };
    }
  }

  const fallback = dir === 'XK' ? 'B11' : 'A11';
  return {
    recommended: fallback,
    confidence: 0.65,
    reasoning: `Mặc định ${fallback === 'B11' ? 'xuất' : 'nhập'} kinh doanh thương mại`,
    method: 'rules',
  };
}

async function recommendCustomsType(input) {
  const rules = recommendByRules(input);
  if (rules.confidence >= 0.85) {
    const detail = getTypeByCode(rules.recommended);
    return { ...rules, type: detail };
  }

  try {
    const codes = listTypes({ direction: input.direction }).map((t) => t.code);
    const { json } = await geminiGenerateJson({
      systemPrompt: `Chọn một mã loại hình XNK Việt Nam (QĐ 1357). Chỉ trả JSON: {"recommended":"A11","confidence":0.9,"reasoning":"..."}. Mã hợp lệ: ${codes.join(', ')}`,
      userPrompt: JSON.stringify(input, null, 2),
      modelEnv: 'GEMINI_RERANK_MODEL',
      defaultModel: 'gemini-2.5-flash',
    });
    const code = String(json.recommended || rules.recommended).toUpperCase();
    return {
      recommended: code,
      confidence: json.confidence ?? rules.confidence,
      reasoning: json.reasoning || rules.reasoning,
      method: 'gemini',
      type: getTypeByCode(code),
    };
  } catch {
    const detail = getTypeByCode(rules.recommended);
    return { ...rules, type: detail };
  }
}

module.exports = {
  customsTypesData,
  listTypes,
  getTypeByCode,
  recommendByRules,
  recommendCustomsType,
};
