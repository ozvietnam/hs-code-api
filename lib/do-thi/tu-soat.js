'use strict';

// lib/do-thi/tu-soat.js — tự soát kết quả: độ tin, cờ, hồ sơ căn cứ (kế hoạch đồ thị mục 5 bước 8, C14 + C15).

/**
 * Tự soát một kết quả phân loại, KHÔNG đổi mã.
 * @param {Object} options
 * @param {string} options.ma - mã HS
 * @param {Object} options.goi - gói mục
 * @param {Object} options.luotHai - kết quả lượt hai
 * @param {Object} options.xuong6 - trạng thái xuống 6 số
 * @param {Object} options.tienLe - trạng thái tiền lệ
 * @returns {Object} { doTin, co, hoSo }
 */
function tuSoat(options) {
  const { ma, goi, luotHai, xuong6, tienLe } = options || {};

  const cleanMa = typeof ma === 'string' ? ma.replace(/\D/g, '') : '';

  let canCuThat = [];
  if (luotHai && luotHai.ok === true && Array.isArray(luotHai.canCu)) {
    const seenIds = new Set();
    canCuThat = luotHai.canCu.reduce((acc, id) => {
      if (typeof id !== 'string' || seenIds.has(id)) return acc;
      seenIds.add(id);
      const item = (goi && Array.isArray(goi.muc))
        ? goi.muc.find(m => m && m.id === id)
        : null;
      if (item) acc.push(item);
      return acc;
    }, []);
  }

  const co = [];

  if (![4, 6, 8].includes(cleanMa.length)) {
    co.push('MA_LA');
  }

  if (luotHai && luotHai.ok === true && typeof luotHai.nhom === 'string') {
    if (cleanMa.length < 4 || cleanMa.substring(0, 4) !== luotHai.nhom) {
      co.push('NHOM_LECH');
    }
  }

  if (canCuThat.length === 0) {
    co.push('THIEU_CAN_CU');
  }

  if (canCuThat.length > 0) {
    const allLowBac = canCuThat.every(item => item && ![1, 2, 3].includes(item.bac));
    if (allLowBac) {
      co.push('CAN_CU_BAC_THAP');
    }
  }

  if (xuong6 && xuong6.trangThai === 'CHOT' && typeof xuong6.chot === 'string' && /^\d{6}$/.test(xuong6.chot)) {
    if (cleanMa.length >= 6 && cleanMa.substring(0, 6) !== xuong6.chot) {
      co.push('LECH_6');
    }
  }

  if (cleanMa.length >= 6) {
    if (!xuong6 || typeof xuong6 !== 'object' || xuong6.trangThai !== 'CHOT') {
      co.push('CHUA_XUONG_6');
    }
  }

  if (tienLe && Array.isArray(tienLe.biPhanDoi)) {
    if (tienLe.biPhanDoi.some(item => item && [1, 2].includes(item.bac))) {
      co.push('PHAN_DOI_BAC_CAO');
    }
  }

  if (tienLe && tienLe.ungHo === false) {
    co.push('TIEN_LE_LECH');
  }

  if (!tienLe || typeof tienLe !== 'object' || typeof tienLe.ungHo !== 'boolean') {
    co.push('CHUA_CO_TIEN_LE');
  }

  let doTin = 'CAO';
  const thapFlags = ['MA_LA', 'NHOM_LECH', 'THIEU_CAN_CU', 'LECH_6', 'PHAN_DOI_BAC_CAO'];
  if (co.some(f => thapFlags.includes(f))) {
    doTin = 'THAP';
  } else if (co.length > 0) {
    doTin = 'VUA';
  }

  const hoSo = [
    {
      buoc: 'CHON_NHOM',
      ketLuan: (luotHai && luotHai.ok === true && typeof luotHai.nhom === 'string') ? luotHai.nhom : null,
      canCu: canCuThat.map(item => ({
        id: item.id,
        trich: typeof item.trich === 'string' ? item.trich : '',
        nguon: typeof item.nguon === 'string' ? item.nguon : ''
      })),
      ghiChu: canCuThat.length === 0 ? 'chưa có' : ''
    },
    {
      buoc: 'XUONG_6',
      ketLuan: (xuong6 && xuong6.trangThai === 'CHOT' && typeof xuong6.chot === 'string') ? xuong6.chot : null,
      canCu: (xuong6 && Array.isArray(xuong6.loai))
        ? xuong6.loai.reduce((acc, item) => {
            if (item && typeof item.canh === 'string' && item.canh !== '') {
              if (!acc.some(existing => existing.id === item.canh)) {
                acc.push({ id: item.canh, trich: '', nguon: '' });
              }
            }
            return acc;
          }, [])
        : [],
      ghiChu: ''
    },
    {
      buoc: 'TIEN_LE',
      ketLuan: (tienLe && typeof tienLe.ungHo === 'boolean') ? tienLe.ungHo : null,
      canCu: (tienLe && Array.isArray(tienLe.biPhanDoi))
        ? tienLe.biPhanDoi.reduce((acc, item) => {
            if (item && typeof item.id === 'string' && item.id !== '') {
              if (!acc.some(existing => existing.id === item.id)) {
                acc.push({
                  id: item.id,
                  trich: '',
                  nguon: typeof item.loai === 'string' ? item.loai : ''
                });
              }
            }
            return acc;
          }, [])
        : [],
      ghiChu: ''
    }
  ];

  hoSo[1].ghiChu = hoSo[1].canCu.length === 0 ? 'chưa có' : '';
  hoSo[2].ghiChu = hoSo[2].canCu.length === 0 ? 'chưa có' : '';

  return { doTin, co, hoSo };
}

module.exports = { tuSoat };
