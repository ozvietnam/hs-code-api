'use strict';

// lib/do-thi/luot-mot.js — AI lượt một (kế hoạch đồ thị mục 5 bước 3): lời nhắc tối đa 1.300 ký tự và bộ kiểm câu trả lời.

function gon(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/\s+/g, ' ').trim();
}

function dungYeuCau(args) {
  const { moTa, duKien, ungVien, tran = 1300 } = (args && typeof args === 'object') ? args : {};

  const h = 'HÀNG:\n' + gon(moTa).slice(0, 400);

  let dkStr = 'DỮ KIỆN KHÁCH NÓI:\n';
  const dks = Array.isArray(duKien) ? duKien.filter(s => gon(s) !== '') : [];
  if (dks.length === 0) {
    dkStr += '- (không có)';
  } else {
    dkStr += dks.slice(0, 5).map(s => '- ' + gon(s).slice(0, 120)).join('\n');
  }

  const normalizedUV = [];
  if (Array.isArray(ungVien)) {
    for (const uv of ungVien) {
      if (!uv || typeof uv !== 'object') continue;
      if (typeof uv.nhom !== 'string') continue;
      let n = uv.nhom.replace(/\D/g, '');
      if (n.length < 4) continue;
      n = n.slice(0, 4);
      if (normalizedUV.some(x => x.nhom === n)) continue;
      normalizedUV.push({ nhom: n, ten: uv.ten, bangChung: uv.bangChung });
    }
  }

  const y = 'YÊU CẦU:\n' + 'rút dữ kiện chỉ từ lời khách, mỗi dữ kiện kèm đoạn trích đúng chữ khách; giữ tối đa 3 nhóm trong ỨNG VIÊN; nhóm ngoài danh sách chỉ khi có lý do ở lyDoNgoai; không đoán; chỉ trả JSON {"duKien":[{"khoa":"","giaTri":"","trichKhach":""}],"nhom":["8481"],"lyDoNgoai":""}';

  const buildUVs = (uvs, withEvidence) => {
    if (!uvs || uvs.length === 0) return 'ỨNG VIÊN:\n- (không có)';
    return 'ỨNG VIÊN:\n' + uvs.map(uv => {
      if (!uv) return '- (không có)';
      const line = `- ${uv.nhom} ${gon(uv.ten).slice(0, 80)}`;
      const evidence = (withEvidence && gon(uv.bangChung)) ? ` | ${gon(uv.bangChung).slice(0, 120)}` : '';
      return line + evidence;
    }).join('\n');
  };

  const assemble = (uvs, withEvidence) => {
    return `${h}\n${dkStr}\n${buildUVs(uvs, withEvidence)}\n${y}`;
  };

  let currentUVs = [...normalizedUV];
  let res = assemble(currentUVs, true);

  if (res.length > tran) {
    let tempUVs = currentUVs.map(u => ({...u}));
    for (let i = tempUVs.length - 1; i >= 0; i--) {
      if (tempUVs[i].bangChung) {
        tempUVs[i].bangChung = '';
        res = assemble(tempUVs, true);
        if (res.length <= tran) return res;
      }
    }
    while (tempUVs.length > 1) {
      tempUVs.pop();
      res = assemble(tempUVs, true);
      if (res.length <= tran) return res;
    }
    // Final attempt: 1 candidate (if exists) and no evidence
    if (tempUVs.length > 0) {
      res = assemble([tempUVs[0]], false);
    } else {
      res = assemble([], false);
    }
  }

  return res;
}

function kiemLoi(tho, options) {
  const { moTa, duKien, ungVien } = options || {};
  let obj;
  if (typeof tho === 'string') {
    const start = tho.indexOf('{');
    const end = tho.lastIndexOf('}');
    if (start === -1 || end === -1 || start > end) return { ok: false, ma: 'KHONG_PHAI_JSON' };
    try {
      obj = JSON.parse(tho.slice(start, end + 1));
    } catch (e) {
      return { ok: false, ma: 'KHONG_PHAI_JSON' };
    }
  } else {
    obj = tho;
  }

  if (!obj || typeof obj !== 'object' || Array.isArray(obj) || obj === null) {
    return { ok: false, ma: 'KHONG_PHAI_JSON' };
  }

  const nhom = [];
  const nhomNgoai = [];
  const rawNhom = Array.isArray(obj.nhom) ? obj.nhom : [];

  const uvSet = new Set();
  if (Array.isArray(ungVien)) {
    for (const uv of ungVien) {
      if (uv && typeof uv === 'object' && typeof uv.nhom === 'string') {
        const n = uv.nhom.replace(/\D/g, '').slice(0, 4);
        if (n.length === 4) uvSet.add(n);
      }
    }
  }

  for (const nRaw of rawNhom) {
    if (typeof nRaw !== 'string') continue;
    const n = nRaw.replace(/\D/g, '');
    if (n.length !== 4) continue;
    if (nhom.includes(n)) continue;
    if (uvSet.has(n)) {
      if (nhom.length < 3) nhom.push(n);
    } else {
      if (gon(obj.lyDoNgoai).length >= 10 && nhomNgoai.length < 1) {
        nhomNgoai.push(n);
      }
    }
  }

  if (nhom.length === 0 && nhomNgoai.length === 0) {
    return { ok: false, ma: 'KHONG_CO_NHOM' };
  }

  const resultDuKien = [];
  let boDuKien = 0;
  const rawDK = Array.isArray(obj.duKien) ? obj.duKien : [];

  const moTaGon = gon(moTa);
  const dkKhachGon = Array.isArray(duKien) ? duKien.map(s => gon(s)) : [];

  for (const dk of rawDK) {
    if (!dk || typeof dk !== 'object') {
      boDuKien++;
      continue;
    }
    const k = gon(dk.khoa);
    const g = gon(dk.giaTri);
    const t = gon(dk.trichKhach);

    if (k === '' || g === '' || t.length < 2) {
      boDuKien++;
      continue;
    }

    const tLow = t.toLowerCase();
    const isSub = moTaGon.toLowerCase().includes(tLow) ||
                 dkKhachGon.some(s => s.toLowerCase().includes(tLow));

    if (!isSub) {
      boDuKien++;
      continue;
    }
    resultDuKien.push({ khoa: k, giaTri: g, trichKhach: t });
  }

  return { ok: true, nhom, nhomNgoai, duKien: resultDuKien, boDuKien };
}

module.exports = { dungYeuCau, kiemLoi };
