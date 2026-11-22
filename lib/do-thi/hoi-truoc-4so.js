// lib/do-thi/hoi-truoc-4so.js — Đặc tả chạy thử trạng thái "nhóm chưa chốt, hỏi trước" ở tầng 4 số (#1645 Việc 3).
//
// CÔ LẬP HOÀN TOÀN: CHƯA nối vào bất kỳ đường khách nào (api/*, lib/engine-loop.js, lib/classify.js, lib/identify.js).
// Chỉ dùng cho demo ngoại tuyến và kiểm thử tự động trước khi QT duyệt phương án & công tắc HS_*.
//
// Ràng buộc kỹ thuật bắt buộc:
//   - Tất định, không gọi LLM, không mạng.
//   - Không require data/so-tay/* trực tiếp (tra cạnh đồ thị qua ./index.js).
//   - Tuân thủ L2 (không dùng khoá câu hỏi ngoài lõi), không tự gán nhãn Quy tắc chung ngoài lõi,
//     và không đọc cờ cấu hình động cơ vì chưa nối đường khách.
'use strict';

const { dataReadPath } = require('../data-paths');
const { loadJson } = require('../data-cache');
const D = require('./index');

const TRANG_THAI_4SO = Object.freeze({
  CHOT_NHOM: 'CHOT_NHOM',
  CHUA_CHOT_NHOM_HOI_TRUOC: 'CHUA_CHOT_NHOM_HOI_TRUOC',
  KHONG_DU_CAN_CU: 'KHONG_DU_CAN_CU',
});

let _kho = null;
function taiKho() {
  if (_kho) return _kho;
  const cgh = loadJson(dataReadPath('chu-giai-heading.json'));
  const cgc = loadJson(dataReadPath('chu-giai-chuong.json'));
  const notes = loadJson(dataReadPath('notes.json'));
  _kho = { cgh, cgc, notes };
  return _kho;
}

const STOP_TIEU_DE = new Set([
  'các', 'loại', 'khác', 'bằng', 'hoặc', 'và', 'của', 'dùng', 'cho', 'trong', 'có', 'được', 'từ', 'như',
  'trên', 'dưới', 'với', 'những', 'một', 'bộ', 'phận', 'phụ', 'kiện', 'sản', 'phẩm', 'hàng', 'thiết', 'bị',
  'máy', 'dụng', 'cụ', 'đồ', 'thuộc', 'nhóm', 'chương', 'này', 'phần', 'kể', 'cả', 'trừ', 'tương', 'tự',
  'chưa', 'đã', 'hay', 'đến', 'nơi', 'chi', 'tiết', 'ghi', 'là', 'về', 'theo', 'tại', 'khi',
]);

function lamSachTenNhom(tenRaw) {
  return String(tenRaw || '')
    .replace(/^\d{2}\.\d{2}\s*[-–—.]?\s*/, '')
    .replace(/\(\s*\+\s*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function rutGon(s, maxLen = 115) {
  const clean = String(s || '').replace(/\s+/g, ' ').trim().replace(/[.;:,]+$/, '');
  if (clean.length <= maxLen) return clean;
  const cut = clean.slice(0, maxLen);
  const sp = cut.lastIndexOf(' ');
  return `${sp > 30 ? cut.slice(0, sp) : cut}…`;
}

function tachVeTieuDe(tenNhom) {
  const s = lamSachTenNhom(tenNhom);
  if (!s) return [];
  const truIdx = s.search(/,\s*trừ\s+(?:loại|các\s+nhóm|nhóm|sản\s+phẩm)/i);
  const chinh = truIdx > 15 ? s.slice(0, truIdx).trim() : s;
  return chinh.split(/\s*;\s*/).map((x) => x.trim()).filter((x) => x.length >= 4);
}

function tapTu(s) {
  return new Set(
    String(s || '')
      .normalize('NFC')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2 && !STOP_TIEU_DE.has(w)),
  );
}

function xacDinhTruc(text) {
  const s = String(text || '').toLowerCase();
  if (/(?:cao su|plastic|nhựa|da thuộc|vật liệu dệt|thép không gỉ|thép hợp kim|nhôm|sợi thủy tinh|chất trợ dung|bọc|nhồi lõi|trần)/.test(s)) {
    return 'chat_lieu';
  }
  if (/(?:cơ cấu|cơ khí|van\b|bơm|đóng gói|gia công|xử lý dữ liệu|biến đổi|bán dẫn|chức năng riêng|điện)/.test(s)) {
    return 'co_cau';
  }
  if (/(?:tự dính|tấm|dạng sợi đơn|bện tao|cáp|xốp|ghép lớp|gia cố|chữ nhật|cắt hình|bo góc|hoàn thiện|nắp gập|ống)/.test(s)) {
    return 'hinh_dang';
  }
  if (/(?:lễ hội|nô-en|vệ sinh|y tế|nông nghiệp|xe có động cơ|rèm|trẻ em|86\s*cm|trang trí|nhà bếp)/.test(s)) {
    return 'cong_dung';
  }
  return 'pham_vi_nhom';
}

function dinhDangMa(h4) {
  return `${h4.slice(0, 2)}.${h4.slice(2)}`;
}

function timChuGiaiChuongLienQuan(chuong, textMoTa, cghH) {
  const { cgc, notes } = taiKho();
  const rawNote = String(cgc[chuong]?.chuong || notes[String(Number(chuong))] || '');
  if (!rawNote) return null;
  const paras = rawNote.split(/\n{2,}/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const terms = [...tapTu(`${textMoTa} ${cghH?.ten_nhom || ''}`)];
  let best = null;
  let bestScore = 0;
  for (const p of paras) {
    if (!/^(?:\d{1,2}\.|[a-z]\))/i.test(p)) continue;
    const pLow = p.toLowerCase();
    let score = 0;
    for (const w of terms) if (pLow.includes(w)) score += 1;
    if (pLow.includes(dinhDangMa(cghH?.ma || '')) || pLow.includes(cghH?.ma || '')) score += 3;
    if (/^\d{1,2}\./.test(p) && /(?:chỉ áp dụng|bao gồm|khái niệm|được hiểu|trừ)/i.test(p)) score += 1;
    if (score > bestScore && score >= 2) {
      bestScore = score;
      best = p;
    }
  }
  if (!best) return null;
  const numM = /^(\d{1,2})\./.exec(best);
  return {
    nhan: numM ? `Chú giải ${numM[1]} Ch.${Number(chuong)}` : `Chú giải Ch.${Number(chuong)}`,
    trich: rutGon(best, 100),
  };
}

function rutDieuKienTuNhom(h, nhomUngVien, moTa, edges) {
  const { cgh } = taiKho();
  const rec = cgh[h] || {};
  const tenSach = lamSachTenNhom(rec.ten_nhom || '');
  const anhEm = nhomUngVien.filter((x) => x !== h);

  // 1) Ưu tiên cạnh đồ thị trực tiếp (C5/C6/C7/C9/WCO) giữa các nhóm đang cùng sống
  const edgeMatch = [];
  for (const e of edges) {
    const tu4 = String(e.tu || '').slice(0, 4);
    const toi4 = String(e.toi || '').slice(0, 4);
    if (e.loai === 'C7' && (tu4 === h || toi4 === h) && e.hoi) {
      const laBenCo = String(e.neuCo || '').split(/[|,;\s]+/).some((c) => c.startsWith(h));
      const dk = String(e.hoi).replace(/\?+$/, '').trim();
      edgeMatch.push({
        prio: 100,
        dieuKien: laBenCo ? rutGon(dk, 105) : `không phải ${rutGon(dk, 95).replace(/^là\s+/i, '')}`,
        canCu: `${e.nguon}${e.trich ? ` ("${rutGon(e.trich, 65).replace(/;\s*/g, ', ')}")` : ''}`,
        nguon: `do-thi:${e.id}`,
      });
    } else if (e.loai === 'C5' && toi4 === h && e.dieuKien) {
      edgeMatch.push({
        prio: 95,
        dieuKien: rutGon(e.dieuKien, 105),
        canCu: `${e.nguon}${e.trich ? ` ("${rutGon(e.trich, 65).replace(/;\s*/g, ', ')}")` : ''}`,
        nguon: `do-thi:${e.id}`,
      });
    } else if (e.loai === 'C8' && toi4 === h && e.dieuKien) {
      edgeMatch.push({
        prio: 80,
        dieuKien: rutGon(e.dieuKien, 105),
        canCu: `${e.nguon}${e.canCu ? ` (${e.canCu.replace(/;\s*/g, ', ')})` : ''}`,
        nguon: `do-thi:${e.id}`,
      });
    }
  }
  if (edgeMatch.length) {
    edgeMatch.sort((a, b) => b.prio - a.prio);
    const best = edgeMatch[0];
    return {
      nhom: h,
      dieuKien: best.dieuKien,
      canCu: best.canCu,
      nguon: best.nguon,
      truc: xacDinhTruc(best.dieuKien),
    };
  }

  // 2) Tách vế đặc thù từ tên nhóm so với các nhóm anh em đang cạnh tranh
  const tuAnhEm = new Set();
  for (const sib of anhEm) {
    for (const w of tapTu(lamSachTenNhom(cgh[sib]?.ten_nhom || ''))) tuAnhEm.add(w);
  }
  const tuMoTa = tapTu(moTa);
  const clauses = tachVeTieuDe(tenSach);
  let bestClause = tenSach;
  let bestDiff = -1;
  for (const cl of clauses) {
    const words = [...tapTu(cl)];
    if (!words.length) continue;
    let uniqueCount = 0;
    let queryHit = 0;
    for (const w of words) {
      if (!tuAnhEm.has(w)) uniqueCount += 1;
      if (tuMoTa.has(w)) queryHit += 1;
    }
    const score = uniqueCount * 2 + queryHit - Math.max(0, words.length - 10) * 0.25;
    if (score > bestDiff) {
      bestDiff = score;
      bestClause = cl;
    }
  }

  // Nếu là nhóm phần còn lại chung chung ("… khác") mà không tách riêng được vật liệu/công dụng: bổ sung ngữ cảnh phần còn lại
  let dieuKien = rutGon(bestClause || tenSach, 105);
  if (/^(?:giày,\s*dép|các\s+sản\s+phẩm|các\s+loại\s+máy)\s+khác$/i.test(dieuKien) && anhEm.length) {
    dieuKien = `${dieuKien} (không thuộc ${anhEm.map(dinhDangMa).join(', ')})`;
  }

  // Bổ sung dấu vết chú giải chương hoặc CGCT khi có
  const chNote = timChuGiaiChuongLienQuan(h.slice(0, 2), moTa, { ...rec, ma: h });
  const hasCgct = Boolean(String(rec.nhom || '').trim());
  const maChuan = dinhDangMa(h);
  const canCu = chNote
    ? `${chNote.nhan}, CGCT ${maChuan}`
    : (hasCgct ? `Tên nhóm & CGCT ${maChuan}` : `Biểu thuế nhóm ${maChuan}`);
  const nguon = chNote
    ? `chu-giai-chuong.json#${h.slice(0, 2)}|chu-giai-heading.json#${h}`
    : `chu-giai-heading.json#${h}`;

  return {
    nhom: h,
    dieuKien,
    canCu,
    nguon,
    truc: xacDinhTruc(`${dieuKien} ${tenSach}`),
  };
}

function dinhDangDapAnDieuKien(nhanh) {
  if (!Array.isArray(nhanh) || !nhanh.length) return null;
  return nhanh
    .map((n, i) => `${i === 0 ? 'Nếu' : 'nếu'} ${n.dieuKien} → nhóm ${n.nhom} (${n.canCu})`)
    .join('; ');
}

function taoCauHoi(nhanh, trucList) {
  if (!Array.isArray(nhanh) || nhanh.length < 2) return null;
  const nhanTruc = {
    chat_lieu: 'vật liệu / cấu tạo',
    co_cau: 'cơ cấu / nguyên lý hoạt động',
    hinh_dang: 'hình dạng / mức độ gia công',
    cong_dung: 'công dụng / đối tượng sử dụng',
    pham_vi_nhom: 'đặc điểm kỹ thuật quyết định',
  };
  const moTaTruc = [...new Set(trucList)].map((t) => nhanTruc[t] || nhanTruc.pham_vi_nhom).join(', ');
  const cacLuaChon = nhanh.map((n) => `${n.dieuKien} (nhóm ${n.nhom})`).join('; hay ');
  return `Hồ sơ hiện chưa chốt được ở tầng 4 số. Cần xác định ${moTaTruc} của hàng: hàng thuộc trường hợp ${cacLuaChon}?`;
}

/**
 * Phân tích trạng thái hỏi trước ở tầng 4 số cho một danh sách nhóm ứng viên.
 * @param {{ moTa?: string, ungVien?: string[], quyTac?: string }} params
 */
function phanTichHoiTruoc4So({ moTa = '', ungVien = [], quyTac = 'QT1' } = {}) {
  const { cgh } = taiKho();
  const nhomUngVien = [...new Set(
    (Array.isArray(ungVien) ? ungVien : [])
      .map((x) => String(x || '').replace(/\D/g, '').slice(0, 4))
      .filter((h) => h.length === 4 && (D.coNut(h) || Boolean(cgh[h]))),
  )];

  if (!nhomUngVien.length) {
    return {
      trangThai: TRANG_THAI_4SO.KHONG_DU_CAN_CU,
      nhomUngVien: [],
      nhanh: [],
      dapAnDieuKien: null,
      cauHoi: 'Hồ sơ chưa có nhóm ứng viên hợp lệ; cần bổ sung tên hàng, chất liệu và công dụng.',
      trucPhanBiet: [],
      quyTac,
      canCu: [],
    };
  }

  if (nhomUngVien.length === 1) {
    const h = nhomUngVien[0];
    return {
      trangThai: TRANG_THAI_4SO.CHOT_NHOM,
      nhomUngVien,
      nhanh: [],
      dapAnDieuKien: null,
      cauHoi: null,
      trucPhanBiet: [],
      quyTac,
      canCu: [{ nhom: h, nguon: `chu-giai-heading.json#${h}`, canCu: `Tên nhóm & CGCT ${dinhDangMa(h)}` }],
    };
  }

  const edges = D.canhGiuaNhomConSong(nhomUngVien);
  const nhanh = nhomUngVien.map((h) => rutDieuKienTuNhom(h, nhomUngVien, moTa, edges));
  const trucPhanBiet = [...new Set(nhanh.map((n) => n.truc))];
  return {
    trangThai: TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC,
    nhomUngVien,
    nhanh,
    dapAnDieuKien: dinhDangDapAnDieuKien(nhanh),
    cauHoi: taoCauHoi(nhanh, trucPhanBiet),
    trucPhanBiet,
    quyTac,
    canCu: nhanh.map((n) => ({ nhom: n.nhom, nguon: n.nguon, canCu: n.canCu })),
  };
}

module.exports = {
  TRANG_THAI_4SO,
  phanTichHoiTruoc4So,
  dinhDangDapAnDieuKien,
};
