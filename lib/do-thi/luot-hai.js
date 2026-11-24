
function cleanText(t) {
  if (typeof t !== 'string') return '';
  return t.replace(/\s+/g, ' ').trim();
}

function dungYeuCau(params) {
  const { moTa, duKien, goi } = (params && typeof params === 'object' && !Array.isArray(params)) ? params : {};

  const h = cleanText(moTa);
  const dk = (Array.isArray(duKien) ? duKien : [])
    .filter(item => typeof item === 'string' && item.trim() !== '')
    .map(item => cleanText(item));

  const g = (goi && typeof goi === 'object' && !Array.isArray(goi)) ? goi : {};
  const nhom = Array.isArray(g.nhom) ? g.nhom.join(', ') : '';
  const vanBan = typeof g.vanBan === 'string' ? g.vanBan : '';

  let res = `HÀNG: ${h}\n`;
  res += `DỮ KIỆN KHÁCH NÓI:\n`;
  if (dk.length === 0) {
    res += `- (không có)\n`;
  } else {
    dk.forEach(item => { res += `- ${item}\n`; });
  }
  res += `NHÓM CÒN SỐNG: ${nhom}\n`;
  res += `CĂN CỨ: ${vanBan}\n`;
  res += `YÊU CẦU:\n`;
  res += `Chỉ chọn một nhóm trong NHÓM CÒN SỐNG; mỗi kết luận phải trích id trong CĂN CỨ; không dùng điều khách không nói; thiếu dữ kiện thì không đoán; chỉ trả một đối tượng JSON {"nhom":"....","canCu":["id"],"thieu":["dữ kiện còn thiếu"],"lyDo":"..."}`;

  return res;
}

function kiemTraLoi(tho, goi) {
  const g = (goi && typeof goi === 'object' && !Array.isArray(goi)) ? goi : {};
  const nhomList = Array.isArray(g.nhom) ? g.nhom : [];
  const mucList = Array.isArray(g.muc) ? g.muc : [];

  let data = tho;
  if (typeof tho === 'string') {
    const start = tho.indexOf('{');
    const end = tho.lastIndexOf('}');
    if (start === -1 || end === -1 || start > end) {
      return { ok: false, ma: 'KHONG_PHAI_JSON' };
    }
    try {
      data = JSON.parse(tho.substring(start, end + 1));
    } catch (e) {
      return { ok: false, ma: 'KHONG_PHAI_JSON' };
    }
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, ma: 'KHONG_PHAI_JSON' };
  }

  // 1. Nhóm
  let nhom = typeof data.nhom === 'string' ? data.nhom.replace(/[.\s]/g, '') : '';
  if (nhom.length !== 4 || !/^\d+$/.test(nhom) || !nhomList.includes(nhom)) {
    return { ok: false, ma: 'NHOM_NGOAI_DANH_SACH' };
  }

  // 2. Căn cứ
  const rawCanCu = data.canCu;
  if (!Array.isArray(rawCanCu)) {
    return { ok: false, ma: 'THIEU_CAN_CU' };
  }

  const stringsInCanCu = rawCanCu.filter(id => typeof id === 'string' && id.trim() !== '');
  if (stringsInCanCu.length === 0) {
    return { ok: false, ma: 'THIEU_CAN_CU' };
  }

  // 3. Căn cứ bịa
  const canCu = [];
  for (const id of rawCanCu) {
    if (typeof id !== 'string') return { ok: false, ma: 'CAN_CU_BIA' };
    if (!mucList.some(m => m && typeof m === 'object' && m.id === id)) return { ok: false, ma: 'CAN_CU_BIA' };
    if (!canCu.includes(id)) canCu.push(id);
  }

  // 4. Căn cứ lạc đề
  const hasRelevant = canCu.some(id => {
    const m = mucList.find(m => m && typeof m === 'object' && m.id === id);
    return m && typeof m.cap === 'string' && m.cap.split('-').includes(nhom);
  });
  if (!hasRelevant) {
    return { ok: false, ma: 'CAN_CU_LAC_DE' };
  }

  // Xử lý thieu và lyDo
  const thieu = (Array.isArray(data.thieu) ? data.thieu : [])
    .filter(item => typeof item === 'string' && item.trim() !== '')
    .map(item => item.trim());

  const lyDo = typeof data.lyDo === 'string' ? data.lyDo.trim() : '';

  return { ok: true, nhom, canCu, thieu, lyDo };
}

module.exports = { dungYeuCau, kiemTraLoi };
