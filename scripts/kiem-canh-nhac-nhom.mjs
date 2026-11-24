import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Kiểm tra tính đúng đắn của dữ liệu cạnh nhấc nhóm
 * @param {any} duLieu Nội dung data/do-thi/canh-nhac-nhom.json
 * @param {any} chuGiai Nội dung data/chu-giai-heading.json
 * @returns {Array<{i: number, ma: string, chiTiet: string}>}
 */
export function kiemCanhNhacNhom(duLieu, chuGiai) {
  const errors = [];
  const seenPairs = new Set();

  // 1. Kiểm tra khuôn
  if (!duLieu || duLieu.khuon !== 'c17@1' || !Array.isArray(duLieu.canh)) {
    errors.push({ i: -1, ma: 'KHUON_SAI', chiTiet: 'khuon phải là "c17@1" và canh phải là mảng' });
    if (!duLieu || !Array.isArray(duLieu.canh)) return errors;
  }

  const norm = (s) => (typeof s === 'string' ? s.trim().replace(/\s+/g, ' ') : '');

  for (let i = 0; i < duLieu.canh.length; i++) {
    const item = duLieu.canh[i];
    if (!item) {
      errors.push({ i, ma: 'MA_SAI', chiTiet: 'mục dữ liệu bị null hoặc undefined' });
      continue;
    }

    const { tu, den, quanHe, nguon, trich } = item;
    const itemErrors = [];

    // MA_SAI
    const isTuValid = typeof tu === 'string' && /^\d{4}$/.test(tu);
    const isDenValid = typeof den === 'string' && /^\d{4}$/.test(den);
    if (!isTuValid || !isDenValid) {
      itemErrors.push({ ma: 'MA_SAI', chiTiet: `tu(${tu}) hoặc den(${den}) không đúng 4 chữ số` });
    }

    // TU_TRUNG_DEN
    if (tu === den && isTuValid) {
      itemErrors.push({ ma: 'TU_TRUNG_DEN', chiTiet: `tu và den trùng nhau: ${tu}` });
    }

    // QUAN_HE_LA
    const validQuanHe = ['LOAI_TRU', 'PHAN_BIET', 'NGUYEN_LIEU', 'DAN_CHIEU'];
    if (!validQuanHe.includes(quanHe)) {
      itemErrors.push({ ma: 'QUAN_HE_LA', chiTiet: `quanHe ${quanHe} không hợp lệ` });
    }

    // NGUON_SAI & TRICH_KHONG_NGUYEN_VAN & THIEU_MA
    let paragraph = null;
    const nguonMatch = typeof nguon === 'string' ? nguon.match(/^ct\.(\d{4})\.(\d+)$/) : null;

    if (!nguonMatch) {
      itemErrors.push({ ma: 'NGUON_SAI', chiTiet: `nguon ${nguon} sai định dạng ct.<nhóm 4 số>.<n>` });
    } else {
      const [_, nGroup, nIdxStr] = nguonMatch;
      const nIdx = parseInt(nIdxStr, 10);

      if (tu !== nGroup) {
        itemErrors.push({ ma: 'NGUON_SAI', chiTiet: `nhóm trong nguon (${nGroup}) khác tu (${tu})` });
      } else {
        const groupData = chuGiai?.[nGroup];
        const nhomText = groupData?.nhom;
        if (typeof nhomText !== 'string') {
          itemErrors.push({ ma: 'NGUON_SAI', chiTiet: `không tìm thấy nội dung chuỗi nhom cho nhóm ${nGroup}` });
        } else {
          const paras = nhomText
            .split(/\n{2,}/)
            .map(p => p.trim())
            .filter(p => p.length > 0);

          if (nIdx < 1 || nIdx > paras.length) {
            itemErrors.push({ ma: 'NGUON_SAI', chiTiet: `đoạn ${nIdx} không tồn tại trong nhóm ${nGroup} (có ${paras.length} đoạn)` });
          } else {
            paragraph = paras[nIdx - 1];
          }
        }
      }
    }

    // Kiểm tra trích
    const normTrich = norm(trich);
    if (!normTrich) {
      itemErrors.push({ ma: 'TRICH_KHONG_NGUYEN_VAN', chiTiet: 'trich rỗng hoặc chỉ gồm khoảng trắng' });
    } else if (paragraph === null) {
      itemErrors.push({ ma: 'TRICH_KHONG_NGUYEN_VAN', chiTiet: 'không thể xác minh nguyên văn do nguon sai' });
    } else {
      const normPara = norm(paragraph);
      if (!normPara.includes(normTrich)) {
        itemErrors.push({ ma: 'TRICH_KHONG_NGUYEN_VAN', chiTiet: 'trich không phải là chuỗi con của đoạn văn bản (sau khi chuẩn hóa khoảng trắng)' });
      }
    }

    // THIEU_MA: trich phải chứa mã den dạng NN.NN
    if (isDenValid) {
      const expectedMa = `${den.substring(0, 2)}.${den.substring(2)}`;
      if (typeof trich !== 'string' || !trich.includes(expectedMa)) {
        itemErrors.push({ ma: 'THIEU_MA', chiTiet: `trich không chứa mã den ${expectedMa}` });
      }
    }

    // TRUNG_LAP
    if (isTuValid && isDenValid) {
      const pair = `${tu}->${den}`;
      if (seenPairs.has(pair)) {
        itemErrors.push({ ma: 'TRUNG_LAP', chiTiet: `cặp ${pair} bị trùng lặp` });
      }
      seenPairs.add(pair);
    }

    itemErrors.forEach(e => errors.push({ i, ...e }));
  }

  return errors;
}

// --- CLI ---
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  try {
    const dataPath = path.join(process.cwd(), 'data/do-thi/canh-nhac-nhom.json');
    const chuGiaiPath = path.join(process.cwd(), 'data/chu-giai-heading.json');

    const duLieu = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const chuGiai = JSON.parse(fs.readFileSync(chuGiaiPath, 'utf8'));

    const errors = kiemCanhNhacNhom(duLieu, chuGiai);

    if (errors.length === 0) {
      console.log('✅ Đạt: Không có lỗi.');
      process.exit(0);
    } else {
      console.error(`❌ Phát hiện ${errors.length} lỗi:`);
      errors.slice(0, 20).forEach(e => {
        console.error(`[Mục ${e.i}] ${e.ma}: ${e.chiTiet}`);
      });
      if (errors.length > 20) {
        console.error(`... và ${errors.length - 20} lỗi khác.`);
      }
      process.exit(1);
    }
  } catch (err) {
    console.error('Lỗi khi chạy script:', err.message);
    process.exit(1);
  }
}
