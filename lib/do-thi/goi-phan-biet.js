'use strict';

const { coNut, canhGiuaNhomConSong } = require('./index');

/**
 * Cắt GÓI PHÂN BIỆT từ bảng cạnh, chỉ giữa các nhóm 4 số được đưa vào.
 *
 * @param {string[]} dsNhom  Danh sách các nhóm 4 số
 * @param {{tran?: number}} [options]  Trần độ dài văn bản (mặc định 7000)
 * @returns {{nhom: string[], muc: Array, vanBan: string, kyTu: number, boBot: number}}
 */
function goiPhanBiet(dsNhom, { tran = 7000 } = {}) {
  if (!Array.isArray(dsNhom)) {
    return { nhom: [], muc: [], vanBan: '', kyTu: 0, boBot: 0 };
  }

  // 1. Chuẩn hoá dsNhom
  const nhomChuon = [];
  for (const x of dsNhom) {
    const n = String(x || '').replace(/\D/g, '').slice(0, 4);
    if (n && coNut(n) && !nhomChuon.includes(n)) {
      nhomChuon.push(n);
    }
    if (nhomChuon.length === 5) break;
  }

  if (nhomChuon.length < 2) {
    return { nhom: nhomChuon, muc: [], vanBan: '', kyTu: 0, boBot: 0 };
  }

  // 2. Lấy cạnh
  const edges = canhGiuaNhomConSong(nhomChuon, {
    loai: ['LOAI_TRU', 'C5', 'C7', 'C16', 'C6', 'C17', 'C8'],
    toiDa: 5000,
  });

  // 3. Chuyển thành mục
  const typeOrder = { 'LOAI_TRU': 0, 'C5': 1, 'C7': 2, 'C16': 3, 'C6': 4, 'C17': 5, 'C8': 6 };
  const items = edges.map((e) => {
    const tu4 = e.tu.slice(0, 4);
    const toi4 = e.toi.slice(0, 4);
    const sorted = [tu4, toi4].sort();
    const cap = sorted.join('-');

    let noiDung = '';
    if (e.loai === 'C7') {
      noiDung = `${e.hoi} Có → ${e.neuCo}; Không → ${e.neuKhong}`;
    } else if (e.loai === 'C16') {
      noiDung = `${e.dacDiem}: ${e.neu} → ${e.thi}; ${e.conNeu} → ${e.thiKia}`;
    } else if (e.loai === 'C17') {
      noiDung = e.quanHe || '';
    } else {
      noiDung = e.dieuKien || '';
    }

    const trich = (e.trich || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    const nguon = e.nguon || '';

    return { id: e.id, loai: e.loai, bac: e.bac, cap, noiDung, trich, nguon };
  });

  // 5. Sắp xếp trong một cap (làm trước để phục vụ bước 4)
  const sortedItems = items.sort((a, b) => {
    if (a.cap !== b.cap) return 0; // Sắp xếp nội bộ cap, so sánh toàn cục sẽ handle sau
    if (a.bac !== b.bac) return a.bac - b.bac;
    const orderA = typeOrder[a.loai] ?? 99;
    const orderB = typeOrder[b.loai] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
  });

  // 4. Bỏ trùng trong cùng cap, giữ mục đầu tiên theo thứ tự đã sắp xếp
  const capMap = new Map();
  const allProcessed = [];

  // Để đảm bảo thứ tự sắp xếp đúng, ta cần gom nhóm theo cap trước
  const caps = [...new Set(items.map((i) => i.cap))].sort();
  let totalAfterDedupe = 0;

  const deduplicatedByCap = {};
  for (const cap of caps) {
    const inCap = items
      .filter((i) => i.cap === cap)
      .sort((a, b) => {
        if (a.bac !== b.bac) return a.bac - b.bac;
        const orderA = typeOrder[a.loai] ?? 99;
        const orderB = typeOrder[b.loai] ?? 99;
        if (orderA !== orderB) return orderA - orderB;
        return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
      });

    const seenTrich = new Set();
    const filtered = [];
    for (const item of inCap) {
      if (!seenTrich.has(item.trich)) {
        seenTrich.add(item.trich);
        filtered.push(item);
      }
    }
    deduplicatedByCap[cap] = filtered;
    totalAfterDedupe += filtered.length;
  }

  // 6. Chọn vòng tròn
  const muc = [];
  let vanBan = '';
  const sortedCaps = caps;
  let round = 0;
  let hasMore = true;

  while (hasMore) {
    hasMore = false;
    for (const cap of sortedCaps) {
      const list = deduplicatedByCap[cap];
      if (round < list.length) {
        hasMore = true;
        const item = list[round];
        const line = `[${item.id}] (${item.cap}) ${item.noiDung} | "${item.trich}"`;

        const nextVanBan = vanBan ? `${vanBan}\n${line}` : line;
        if (nextVanBan.length <= tran) {
          vanBan = nextVanBan;
          muc.push(item);
        }
      }
    }
    round++;
  }

  return {
    nhom: nhomChuon,
    muc: muc,
    vanBan: vanBan,
    kyTu: vanBan.length,
    boBot: totalAfterDedupe - muc.length,
  };
}

module.exports = { goiPhanBiet };
