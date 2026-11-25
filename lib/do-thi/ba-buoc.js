/**
 * lib/do-thi/ba-buoc.js
 * Logic chọn nhóm 4 số qua 3 bước: Lượt một -> Gói -> Lượt hai.
 */

function taoKetQua({
  trangThai = 'KHONG_DU',
  nhom = null,
  nhomConSong = [],
  duKien = [],
  goi = null,
  canCu = [],
  thieu = [],
  lyDo = '',
  buoc = [],
}) {
  return {
    trangThai,
    nhom,
    nhomConSong,
    duKien,
    goi,
    canCu,
    thieu,
    lyDo,
    buoc,
  };
}

function laSo(giaTri) {
  return typeof giaTri === 'number' && Number.isFinite(giaTri);
}

async function chayLuot({ ten, dungYeuCau, kiem, goiLLM }) {
  let yc;
  try {
    yc = dungYeuCau();
  } catch (e) {
    return { ok: false, ma: 'LOI_MA', lan: 0, kq: null };
  }

  async function thuMotLan(yeuCau) {
    let kqLLM;
    try {
      kqLLM = await goiLLM(ten, yeuCau);
    } catch (e) {
      return { ok: false, ma: 'LOI_LLM', kq: null };
    }

    try {
      const check = kiem(kqLLM);
      if (check && check.ok) {
        return { ok: true, ma: null, kq: check };
      }
      return {
        ok: false,
        ma: check && check.ma !== undefined ? check.ma : 'LOI_MA',
        kq: null,
      };
    } catch (e) {
      return { ok: false, ma: 'LOI_MA', kq: null };
    }
  }

  const lan1 = await thuMotLan(yc);
  if (lan1.ok) {
    return { ok: true, ma: null, lan: 1, kq: lan1.kq };
  }

  const lan2 = await thuMotLan(yc + '\n\nLẦN TRƯỚC SAI: ' + lan1.ma);
  if (lan2.ok) {
    return { ok: true, ma: null, lan: 2, kq: lan2.kq };
  }

  return { ok: false, ma: lan2.ma, lan: 2, kq: null };
}

async function chayBaBuoc(vao, phuThuoc) {
  const input = vao && typeof vao === 'object' && !Array.isArray(vao) ? vao : {};
  const moTa = input.moTa;
  const vaoDuKien = Array.isArray(input.duKien) ? input.duKien : [];
  const vaoUngVien = Array.isArray(input.ungVien) ? input.ungVien : [];

  const {
    goiLLM,
    luotMot,
    goiPhanBiet,
    luotHai,
    tran1 = 1300,
    tran2 = 7000,
  } = (phuThuoc && typeof phuThuoc === 'object' ? phuThuoc : {});

  // 1. Tiền xử lý ứng viên
  const uv = [];
  for (const u of vaoUngVien) {
    if (u && typeof u.nhom === 'string') {
      const cleaned = u.nhom.replace(/\D/g, '').slice(0, 4);
      if (cleaned.length === 4 && !uv.includes(cleaned)) {
        uv.push(cleaned);
      }
    }
  }

  if (uv.length === 0) {
    return taoKetQua({
      buoc: [{ ten: 'luot-mot', ok: false, ma: 'KHONG_UNG_VIEN', lan: 0 }],
    });
  }

  const buoc = [];

  // 2. Lượt một
  const l1 = await chayLuot({
    ten: 'luot-mot',
    dungYeuCau: () => luotMot.dungYeuCau({ moTa, duKien: vaoDuKien, ungVien: vaoUngVien, tran: tran1 }),
    kiem: (kq) => luotMot.kiemLoi(kq, { moTa, duKien: vaoDuKien, ungVien: vaoUngVien }),
    goiLLM,
  });
  buoc.push({ ten: 'luot-mot', ok: l1.ok, ma: l1.ok ? null : l1.ma, lan: l1.lan });

  // 3. Nhóm còn sống & dữ kiện rút được
  let nhomConSong = [];
  let duKienL1 = [];

  if (l1.ok) {
    const nhom = Array.isArray(l1.kq.nhom) ? l1.kq.nhom : [];
    const nhomNgoai = Array.isArray(l1.kq.nhomNgoai) ? l1.kq.nhomNgoai : [];
    nhomConSong = [...new Set([...nhom, ...nhomNgoai])].slice(0, 3);
    duKienL1 = Array.isArray(l1.kq.duKien) ? l1.kq.duKien : [];
  } else {
    nhomConSong = uv.slice(0, 3);
  }

  if (nhomConSong.length === 1) {
    const extra = uv.find((u) => !nhomConSong.includes(u));
    if (extra) nhomConSong.push(extra);
  }

  // 4. Gói
  let goi = null;
  try {
    const resGoi = goiPhanBiet([...nhomConSong], { tran: tran2 });
    if (resGoi && Array.isArray(resGoi.muc) && resGoi.muc.length > 0) {
      goi = resGoi;
      buoc.push({ ten: 'goi', ok: true, ma: null, lan: 0 });
    } else {
      buoc.push({ ten: 'goi', ok: false, ma: 'GOI_RONG', lan: 0 });
      return taoKetQua({ nhomConSong, duKien: duKienL1, buoc });
    }
  } catch (e) {
    buoc.push({ ten: 'goi', ok: false, ma: 'GOI_RONG', lan: 0 });
    return taoKetQua({ nhomConSong, duKien: duKienL1, buoc });
  }

  const goiSummary = {
    soMuc: goi.muc.length,
    boBot: laSo(goi.boBot) ? goi.boBot : 0,
    kyTu: laSo(goi.kyTu) ? goi.kyTu : 0,
  };

  // 5. Lượt hai
  const l2 = await chayLuot({
    ten: 'luot-hai',
    dungYeuCau: () => luotHai.dungYeuCau({ moTa, duKien: vaoDuKien, goi }),
    kiem: (kq) => luotHai.kiemTraLoi(kq, goi),
    goiLLM,
  });
  buoc.push({ ten: 'luot-hai', ok: l2.ok, ma: l2.ok ? null : l2.ma, lan: l2.lan });

  if (!l2.ok) {
    return taoKetQua({
      nhomConSong,
      duKien: duKienL1,
      goi: goiSummary,
      buoc,
    });
  }

  const canCu = Array.isArray(l2.kq.canCu) ? l2.kq.canCu : [];
  const thieu = Array.isArray(l2.kq.thieu) ? l2.kq.thieu : [];
  const lyDo = typeof l2.kq.lyDo === 'string' ? l2.kq.lyDo : (l2.kq.lyDo || '');
  const trangThai = thieu.length > 0 ? 'CAN_HOI' : 'CHOT_NHOM';

  return taoKetQua({
    trangThai,
    nhom: l2.kq.nhom || null,
    nhomConSong,
    duKien: duKienL1,
    goi: goiSummary,
    canCu,
    thieu,
    lyDo,
    buoc,
  });
}

module.exports = { chayBaBuoc };
