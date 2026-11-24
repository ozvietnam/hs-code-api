'use strict';

// lib/do-thi/xuong-6so.js — đi cạnh C10 từ nhóm 4 số xuống phân nhóm 6 số (kế hoạch đồ thị mục 5 bước 6). Logic ba giá trị: thiếu dữ kiện thì
// không đoán, trả đúng dữ kiện cần hỏi kèm cạnh làm căn cứ. Phân nhóm dư ("loại khác") xét sau phân nhóm có tên (C11).

function chuan(x) {
  if (typeof x !== 'string') return '';
  return x.normalize('NFC').toLowerCase().trim().replace(/\s+/g, ' ');
}

function xetMuc(canh, duKien) {
  if (!canh || !duKien) return 'CHUA_BIET';
  if (canh.phanConLai === true || (canh.chuaSoHoa !== undefined && canh.chuaSoHoa !== null)) return 'CHUA_BIET';
  const fact = canh.fact;
  if (!fact || typeof fact !== 'string' || fact === '') return 'CHUA_BIET';
  if (!Object.prototype.hasOwnProperty.call(duKien, fact)) return 'CHUA_BIET';

  const item = duKien[fact];
  const giaTri = item?.giaTri;
  if (giaTri === undefined || giaTri === null || giaTri === '') return 'CHUA_BIET';

  const op = canh.op;
  const value = canh.value;

  let res = 'CHUA_BIET';

  if (['<', '<=', '>', '>='].includes(op)) {
    if (typeof giaTri !== 'number' || !Number.isFinite(giaTri) || typeof value !== 'number' || !Number.isFinite(value)) {
      return 'CHUA_BIET';
    }
    if (canh.donVi) {
      if (chuan(item.donVi) !== chuan(canh.donVi)) return 'CHUA_BIET';
    }
    if (op === '<') res = giaTri < value ? 'DUNG' : 'SAI';
    else if (op === '<=') res = giaTri <= value ? 'DUNG' : 'SAI';
    else if (op === '>') res = giaTri > value ? 'DUNG' : 'SAI';
    else if (op === '>=') res = giaTri >= value ? 'DUNG' : 'SAI';
  } else if (['=', 'LA', 'TRONG', 'in', 'TEN_LOAI', 'CONG_DUNG', 'TUONG_TU', '!='].includes(op)) {
    const values = Array.isArray(value) ? value : [value];
    let canCompare = false;
    let foundMatch = false;

    for (const v of values) {
      if (typeof giaTri === 'boolean' && typeof v === 'boolean') {
        canCompare = true;
        if (giaTri === v) foundMatch = true;
      } else if (typeof giaTri === 'number' && typeof v === 'number') {
        if (canh.donVi) {
          if (chuan(item.donVi) === chuan(canh.donVi)) {
            canCompare = true;
            if (giaTri === v) foundMatch = true;
          }
        } else {
          canCompare = true;
          if (giaTri === v) foundMatch = true;
        }
      } else if (typeof giaTri === 'string' && typeof v === 'string') {
        canCompare = true;
        if (chuan(giaTri) === chuan(v)) foundMatch = true;
      }
    }
    if (!canCompare) res = 'CHUA_BIET';
    else res = foundMatch === (op !== '!=') ? 'DUNG' : 'SAI';
  } else if (op === 'CO') {
    if (giaTri === true) res = 'DUNG';
    else if (giaTri === false) res = 'SAI';
    else res = 'CHUA_BIET';
  } else if (op === 'KHONG') {
    if (giaTri === true) res = 'SAI';
    else if (giaTri === false) res = 'DUNG';
    else res = 'CHUA_BIET';
  } else {
    res = 'CHUA_BIET';
  }

  if (canh.chieu === 'PHAI_KHONG') {
    if (res === 'DUNG') return 'SAI';
    if (res === 'SAI') return 'DUNG';
  }
  return res;
}

/** Thứ tự xét của phân nhóm: thuTu nguyên nhỏ nhất, không có thì 1. */
function thuTuCua(edges) {
  const t = edges.map((c) => c.thuTu).filter(Number.isInteger);
  return t.length ? Math.min(...t) : 1;
}

function xuongSau(dsCanh, duKien) {
  if (!Array.isArray(dsCanh)) return { trangThai: 'KHONG_KHOP', chot: null, conLai: [], loai: [], hoi: [] };

  const groups = {};
  for (const c of dsCanh) {
    if (!c || typeof c.toi !== 'string' || !/^\d{6}$/.test(c.toi)) continue;
    if (!groups[c.toi]) groups[c.toi] = [];
    groups[c.toi].push(c);
  }

  const sortedToi = Object.keys(groups).sort((a, b) => {
    const ttA = thuTuCua(groups[a]);
    const ttB = thuTuCua(groups[b]);
    if (ttA !== ttB) return ttA - ttB;
    return a < b ? -1 : 1;
  });

  const groupMeta = {};
  for (const toi of sortedToi) {
    groupMeta[toi] = {
      tt: thuTuCua(groups[toi]),
      edges: groups[toi]
    };
  }

  const groupResults = {};
  const groupDetails = {};

  for (const toi of sortedToi) {
    const edges = groupMeta[toi].edges;
    const tt = groupMeta[toi].tt;

    const evaluated = [];
    const processedIdx = new Set();
    for (let i = 0; i < edges.length; i++) {
      if (processedIdx.has(i)) continue;
      const c = edges[i];

      const orMembers = edges.filter((other, idx) =>
        idx !== i &&
        other.nguon === c.nguon &&
        other.trich === c.trich &&
        (other.fact === 'chatLieu' || other.fact === 'vatLieuKhac') &&
        c.fact === other.fact &&
        (other.op === 'LA' || other.op === 'TRONG') &&
        (c.op === 'LA' || c.op === 'TRONG') &&
        other.chieu !== 'PHAI_KHONG' &&
        c.chieu !== 'PHAI_KHONG' &&
        (other.trich || '').includes('hoặc') &&
        (c.trich || '').includes('hoặc')
      );

      if (orMembers.length > 0) {
        const members = [c, ...orMembers];
        const ress = members.map(m => xetMuc(m, duKien));
        let res = 'CHUA_BIET';
        if (ress.includes('DUNG')) res = 'DUNG';
        else if (ress.every(r => r === 'SAI')) res = 'SAI';
        evaluated.push({ res, id: c.id, isOr: true, members });
        edges.forEach((other, idx) => {
          if (orMembers.includes(other)) processedIdx.add(idx);
        });
        processedIdx.add(i);
      } else {
        evaluated.push({ res: xetMuc(c, duKien), id: c.id, isOr: false, edge: c });
        processedIdx.add(i);
      }
    }

    let status = 'CON_XET';
    let firstSaiId = null;
    const hasPhanConLai = edges.some(c => c.phanConLai === true);

    if (!hasPhanConLai) {
      const anySai = evaluated.some(e => e.res === 'SAI');
      const allDung = evaluated.every(e => e.res === 'DUNG');
      if (anySai) {
        status = 'LOAI';
        firstSaiId = evaluated.find(e => e.res === 'SAI')?.id;
      } else if (allDung) {
        status = 'DUNG';
      }
    } else {
      const conditions = evaluated.filter(e => e.isOr || e.edge.phanConLai !== true);
      const anySai = conditions.some(e => e.res === 'SAI');
      if (anySai) {
        status = 'LOAI';
        firstSaiId = conditions.find(e => e.res === 'SAI')?.id;
      } else {
        const others = sortedToi.filter(t => t !== toi);
        const anySmallerDung = others.some(t => groupMeta[t].tt < tt && groupResults[t] === 'DUNG' && !groupMeta[t].edges.some(c => c.phanConLai === true));
        const allSmallerLoai = others.filter(t => groupMeta[t].tt < tt).every(t => groupResults[t] === 'LOAI');
        const thisAllDung = conditions.every(e => e.res === 'DUNG');
        if (allSmallerLoai && thisAllDung) status = 'DUNG';
        else if (anySmallerDung) status = 'LOAI';
      }
    }
    groupResults[toi] = status;
    groupDetails[toi] = { firstSaiId, evaluated };
  }

  const nonLoai = sortedToi.filter(t => groupResults[t] !== 'LOAI');
  if (nonLoai.length === 0) {
    return {
      trangThai: 'KHONG_KHOP',
      chot: null,
      conLai: [],
      loai: sortedToi.map(t => ({ hs6: t, canh: groupDetails[t].firstSaiId })),
      hoi: []
    };
  }

  const minTt = Math.min(...nonLoai.map(t => groupMeta[t].tt));
  const atMinTt = nonLoai.filter(t => groupMeta[t].tt === minTt);

  let trangThai, chot;
  if (atMinTt.length === 1 && groupResults[atMinTt[0]] === 'DUNG') {
    trangThai = 'CHOT';
    chot = atMinTt[0];
  } else {
    trangThai = 'CAN_HOI';
    chot = null;
  }

  const conLai = nonLoai;
  const loai = sortedToi.filter(t => groupResults[t] === 'LOAI').map(t => ({ hs6: t, canh: groupDetails[t].firstSaiId }));

  const hoi = [];
  if (trangThai === 'CAN_HOI') {
    const factsMap = new Map();
    for (const toi of nonLoai) {
      if (groupResults[toi] === 'CON_XET') {
        const evaled = groupDetails[toi].evaluated;
        for (const e of evaled) {
          if (e.res === 'DUNG') continue;
          for (const m of e.isOr ? e.members : [e.edge]) {
            if (m.phanConLai || (m.chuaSoHoa !== undefined && m.chuaSoHoa !== null) || typeof m.fact !== 'string' || !m.fact) continue;
            if (xetMuc(m, duKien) !== 'CHUA_BIET') continue;
            if (!factsMap.has(m.fact)) factsMap.set(m.fact, { hs6: [], edges: [] });
            const item = factsMap.get(m.fact);
            if (!item.hs6.includes(toi)) item.hs6.push(toi);
            item.edges.push(m);
          }
        }
      }
    }
    const viTri = new Map(dsCanh.map((c, i) => [c, i]));
    for (const [f, item] of factsMap) {
      item.hs6.sort();
      hoi.push({ fact: f, hs6: item.hs6, canh: item.edges.sort((x, y) => viTri.get(x) - viTri.get(y)).map((x) => x.id) });
    }
    hoi.sort((a, b) => {
      if (b.hs6.length !== a.hs6.length) return b.hs6.length - a.hs6.length;
      if (a.fact < b.fact) return -1;
      if (a.fact > b.fact) return 1;
      return 0;
    });
  }

  return { trangThai, chot, conLai, loai, hoi };
}

module.exports = { xetMuc, xuongSau };
