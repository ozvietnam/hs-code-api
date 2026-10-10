// lib/legal-basis.js — Nguồn chân lý duy nhất cho việc trích dẫn TT 85/2026/TT-BTC (quy định về phân loại hàng hoá).
//
// VÌ SAO CÓ FILE NÀY
// CEO yêu cầu (10/10/2026): mọi cách gọi và cách trả lời của API phải có cơ sở pháp luật. Cũng như lib/gir.js với 6 quy tắc
// tổng quát, MỌI trích dẫn điều/khoản/điểm của TT 85/2026 phải đi qua đây: không nơi nào khác được tự gõ "Điều 6.1…".
// Trích sai điều luật tệ hơn không trích — người khai đưa phản hồi này cho Hải quan.
//
// Văn bản: TT 85/2026/TT-BTC ngày 30/06/2026, hiệu lực 15/09/2026, Công báo số 409 ngày 18-07-2026 (thay TT 14/2015 + TT 17/2021).
// Nguồn đã đọc: bản PDF Công báo trong kho oz-wiki-plhq (raw/download/congbaocdn.chinhphu.vn/2026/7/18/85-2026-tt-btc.pdf,
// sha256 dưới đây). `trich` là NGUYÊN VĂN; `scripts/check-legal-basis.mjs --text=<văn bản trích từ PDF>` kiểm từng câu.
//
// ĐIỀU KHÔNG ĐƯỢC NÓI. Điều 6.1 chỉ ghi "sử dụng các tài liệu sau: a) … b) … c) … d) …". Văn bản KHÔNG có cụm "theo thứ tự" hay
// "ưu tiên" — nên module chỉ nói "liệt kê a→d", không tự khẳng định thứ tự ưu tiên pháp lý. Nếu Quy trình của Cục Hải quan
// (Điều 17.1) quy định thứ tự thì bổ sung sau, kèm nguồn.

const TT85 = {
  soHieu: '85/2026/TT-BTC',
  ten: 'Quy định về phân loại hàng hoá, phân tích để phân loại hàng hoá xuất khẩu, nhập khẩu',
  coQuan: 'Bộ Tài chính',
  ngayBanHanh: '2026-06-30',
  hieuLucTu: '2026-09-15',
  congBao: 'Công báo số 409 ngày 18-07-2026',
  thay: ['14/2015/TT-BTC', '17/2021/TT-BTC'],
  sha256Pdf: '652932cd3e3dda1dd498a46cdddb9fe2be61daada3def3452c045eb400d4fdfe',
};

/**
 * Điều khoản được phép trích. Khoá = "điều.khoản[.điểm]". `trich` nguyên văn (các đoạn cách nhau bằng "…" là lược).
 * Thêm điều khoản mới = thêm vào đây + chạy check-legal-basis.
 */
const CLAUSES = {
  '3.1': {
    dieu: '3', khoan: '1', trang: 3,
    trich: 'Trường hợp cơ quan hải quan không đủ cơ sở để xác định tính chính xác việc phân loại hàng hóa của người khai hải quan thì thực hiện phân tích, giám định hàng hóa',
  },
  '3.3': {
    dieu: '3', khoan: '3', trang: 3,
    trich: 'người khai hải quan có thể sử dụng các dịch vụ giám định hàng hóa của các tổ chức giám định theo quy định của pháp luật … và chịu trách nhiệm về tính chính xác, hợp pháp của tài liệu cung cấp',
  },
  '4.1': { dieu: '4', khoan: '1', trang: 4, trich: 'Một mặt hàng có một mã số duy nhất theo Danh mục hàng hóa xuất khẩu, nhập khẩu Việt Nam.' },
  '4.2.b': { dieu: '4', khoan: '2', diem: 'b', trang: 4, trich: 'Danh mục hàng hoá xuất khẩu, nhập khẩu Việt Nam' },
  '4.2.c': { dieu: '4', khoan: '2', diem: 'c', trang: 4, trich: 'Biểu thuế xuất khẩu, Biểu thuế nhập khẩu' },
  '4.2.d': {
    dieu: '4', khoan: '2', diem: 'd', trang: 4,
    trich: '6 (sáu) quy tắc tổng quát giải thích việc phân loại hàng hóa theo Hệ thống hài hoà mô tả và mã hoá hàng hóa',
  },
  '5.2': {
    dieu: '5', khoan: '2', trang: 4,
    trich: 'Kết quả phân loại hàng hóa được sử dụng để áp dụng mức thuế đối với một mặt hàng trên cơ sở thực hiện quy định tại các Biểu thuế áp dụng đối với hàng hóa xuất khẩu, nhập khẩu có hiệu lực tại thời điểm đăng ký tờ khai',
  },
  '6.1': {
    dieu: '6', khoan: '1', trang: 4,
    trich: 'nhưng chưa xác định được mã số duy nhất theo Danh mục hàng hóa xuất khẩu, nhập khẩu Việt Nam thì sử dụng các tài liệu sau',
  },
  '6.1.a': { dieu: '6', khoan: '1', diem: 'a', trang: 4, trich: 'Chú giải chi tiết Danh mục HS' },
  '6.1.b': { dieu: '6', khoan: '1', diem: 'b', trang: 4, trich: 'Tuyển tập ý kiến phân loại của WCO' },
  '6.1.c': { dieu: '6', khoan: '1', diem: 'c', trang: 4, trich: 'Chú giải bổ sung Danh mục AHTN' },
  '6.1.d': { dieu: '6', khoan: '1', diem: 'd', trang: 5, trich: 'Cơ sở dữ liệu về Danh mục hàng hóa xuất khẩu, nhập khẩu Việt Nam' },
  '6.2': {
    dieu: '6', khoan: '2', trang: 5,
    trich: 'áp dụng trực tiếp mô tả hàng hóa theo Danh mục HS, Danh mục AHTN để phân loại',
  },
  '6.3': {
    dieu: '6', khoan: '3', trang: 5,
    trich: 'chưa đủ cơ sở để xác định tên gọi, mô tả hàng hóa theo Danh mục hàng hóa xuất khẩu, nhập khẩu Việt Nam thì được sử dụng các tiêu chí, tiêu chuẩn, quy chuẩn do cơ quan, tổ chức, đơn vị có thẩm quyền ban hành',
  },
  '6.4': {
    dieu: '6', khoan: '4', trang: 5,
    trich: 'thì thực hiện theo Danh mục hàng hoá xuất khẩu, nhập khẩu Việt Nam và pháp luật về hải quan',
  },
  '8': {
    dieu: '8', trang: 6,
    trich: 'Hàng hóa là máy móc, thiết bị ở dạng chưa lắp ráp hoặc tháo rời thường do yêu cầu đóng gói, bảo quản hoặc vận chuyển thực hiện phân loại theo quy tắc 2a của 6 (sáu) quy tắc tổng quát giải thích Hệ thống HS',
  },
};

const refOf = (c) => `Điều ${c.dieu}${c.khoan ? ` khoản ${c.khoan}` : ''}${c.diem ? ` điểm ${c.diem}` : ''} ${TT85.soHieu}`;

/** Trích một điều khoản. Id lạ → ném lỗi (không có trích dẫn tự do). */
function cite(id) {
  const c = CLAUSES[id];
  if (!c) throw new Error(`legal-basis: điều khoản không có trong danh sách được phép: ${id}`);
  return { id, vanBan: TT85.soHieu, dieu: c.dieu, ...(c.khoan ? { khoan: c.khoan } : {}), ...(c.diem ? { diem: c.diem } : {}), tham_chieu: refOf(c), trang: c.trang, trich: c.trich };
}

// Trạng thái từ /api/suggest, /api/classify (cùng bảng — lib/suggest-status.js, lib/classify-guards.js) → ý nghĩa pháp lý.
const STATUS_MAP = {
  RESOLVED_BY_TABLE: 'XAC_DINH_THEO_DIEU_4', // bảng quyết định đã duyệt chốt được mã (người khai vẫn xác nhận)
  REVIEW: 'CHUA_CHOT_CAN_XAC_NHAN', // có gợi ý, người khai chọn/xác nhận
  NEED_FACTS: 'THIEU_DU_KIEN', // thiếu dữ kiện về hàng để áp quy tắc
  NEEDS_EXPERT: 'CHUA_XAC_DINH_DUOC',
  NO_CANDIDATES: 'CHUA_XAC_DINH_DUOC',
};

const UNASSEMBLED = /th[aá]o\s*r[oờ]i|ch[uư]a\s*l[aắ]p\s*r[aá]p|\b(?:ckd|skd)\b|unassembled|disassembled|knocked[\s-]*down/i;

function safe(fn, dflt) {
  try { return fn(); } catch { return dflt; }
}

/**
 * Căn cứ pháp lý của một lượt phân loại.
 * @param {object} ctx
 * @param {string} ctx.status        trạng thái của endpoint (RESOLVED_BY_TABLE | REVIEW | NEED_FACTS | NEEDS_EXPERT | NO_CANDIDATES)
 * @param {string|null} ctx.topHs    mã đứng đầu (4–8 số) hoặc null
 * @param {string} [ctx.description] mô tả hàng (chỉ dùng để nhận dấu hiệu hàng tháo rời, Điều 8)
 * @param {number} [ctx.precedentCount] số TB-TCHQ khớp mà lượt này ĐÃ tra (0 = đã tra, không có; bỏ trống = lượt này không tra)
 * @param {number} [ctx.girDeterminations] số mục trong girRulesApplied[] (chi tiết quy tắc ở đó, qua lib/gir.js)
 */
function canCuPhapLy(ctx = {}) {
  const { status, topHs = null, description = '', precedentCount, girDeterminations = 0 } = ctx;
  const trangThai = STATUS_MAP[status] || 'CHUA_XAC_DINH_DUOC';
  const hs = String(topHs || '').replace(/\D/g, '');
  const hasTop = hs.length >= 4;

  // 6.1.a Chú giải chi tiết HS — có nội dung cho mã top không
  const note = hasTop ? safe(() => require('./explanatory-notes-index').getNoteSummaryForHs(hs), null) : null;
  // 6.1.b Tuyển tập ý kiến phân loại WCO — kho riêng tư (data/wco-op); chỉ trả SỐ HIỆU, không trả nguyên văn
  const wcoOp = require('./wco-op');
  let wco;
  if (!wcoOp.available()) wco = { trangThai: 'CHUA_TRA_CUU', ghiChu: 'Kho Tuyển tập ý kiến phân loại WCO chưa nạp vào hệ thống nên chưa tra cứu nguồn này.' };
  else {
    const found = hs.length >= 6 ? wcoOp.byHs(hs.slice(0, 6)) : [];
    // Số hiệu chỉ là "chính thức" khi bản gốc ghi rõ; thứ tự do máy suy ra (ordInferred) thì chỉ trỏ trang PDF, không giả làm số hiệu.
    wco = found.length
      ? {
        trangThai: 'CO_Y_KIEN',
        yKien: found.slice(0, 10).map((o) => (o.ordInferred ? `${o.hs} (trang ${o.pages[0]} bản PDF)` : o.id)),
        ...(found.some((o) => o.ordInferred) ? { ghiChu: 'Bản gốc không đánh số từng ý kiến: dẫn theo mã HS và trang bản PDF, không phải số hiệu chính thức.' } : {}),
      }
      : { trangThai: 'KHONG_CO_Y_KIEN_CHO_MA_NAY' };
  }
  // 6.1.c SEN của AHTN
  const sen = hs.length === 8 ? safe(() => require('./sen').senFor(hs), null) : null;

  // Trạng thái nguồn: chỉ nói điều hệ thống THẬT SỰ biết. "CO_NOI_DUNG" = kệ sách có nội dung cho mã này (kèm trong phản hồi);
  // không đồng nghĩa với việc AI đã đối chiếu từng chữ.
  const taiLieu = [
    { id: '6.1.a', nguon: 'Chú giải chi tiết HS 2022 (kệ sách của hệ thống; xem explanatoryNote)', trangThai: note ? 'CO_NOI_DUNG' : 'KHONG_CO_DU_LIEU_CHO_MA_NAY' },
    { id: '6.1.b', nguon: 'Tuyển tập ý kiến phân loại WCO (kho riêng tư)', ...wco },
    { id: '6.1.c', nguon: 'SEN AHTN 2022 (kệ sách của hệ thống)', trangThai: sen ? 'CO_NOI_DUNG' : hs.length === 8 ? 'KHONG_CO_DU_LIEU_CHO_MA_NAY' : 'CHUA_CO_MA_8_SO' },
    {
      id: '6.1.d', nguon: 'Cơ sở dữ liệu Danh mục VN: biểu thuế + TB-TCHQ của hệ thống',
      trangThai: !Number.isFinite(precedentCount) ? 'CHUA_TRA_CUU_TRONG_LUOT_NAY' : precedentCount > 0 ? 'CO_TIEN_LE_KHOP' : 'KHONG_CO_TIEN_LE_KHOP',
      ...(precedentCount > 0 ? { soTienLe: precedentCount } : {}),
    },
  ];

  const cacBuoc = [
    {
      buoc: 1,
      moTa: 'Áp dụng Danh mục hàng hóa xuất khẩu, nhập khẩu Việt Nam, Biểu thuế và 6 quy tắc tổng quát.',
      canCu: ['4.1', '4.2.b', '4.2.c', '4.2.d'],
      trangThai: hasTop ? 'DA_AP_DUNG' : 'KHONG_CO_UNG_VIEN',
      ghiChu: girDeterminations
        ? 'Quy tắc đã trích và mức tin cậy từng trích dẫn: xem girRulesApplied[] (trường basis).'
        : 'Không có quy tắc nào được trích: xem girRulesApplied[] và girDisclaimer.',
    },
    {
      buoc: 2,
      moTa: 'Chỉ khi áp dụng bước 1 mà chưa xác định được mã số duy nhất thì sử dụng các tài liệu liệt kê tại Điều 6.1.',
      canCu: ['6.1'],
      canDung: trangThai !== 'XAC_DINH_THEO_DIEU_4',
      cachLietKe: 'Văn bản liệt kê a)→d); không ghi rõ "theo thứ tự" hay "ưu tiên".',
      taiLieu,
    },
  ];

  const huongTiep = [];
  if (trangThai === 'CHUA_XAC_DINH_DUOC' || trangThai === 'THIEU_DU_KIEN') {
    huongTiep.push({
      moTa: 'Vẫn chưa đủ cơ sở xác định tên gọi, mô tả hàng hóa theo Danh mục: có thể dùng tiêu chí, tiêu chuẩn, quy chuẩn do cơ quan có thẩm quyền ban hành.',
      canCu: ['6.3'],
    });
    huongTiep.push({
      moTa: 'Cần xác định tính chất, thành phần, công dụng của hàng: người khai có thể dùng dịch vụ giám định và chịu trách nhiệm về tài liệu cung cấp; cơ quan hải quan phân tích khi không đủ cơ sở.',
      canCu: ['3.3', '3.1'],
    });
  }

  const luuY = [
    {
      moTa: 'Mức thuế và chính sách quản lý áp dụng theo Biểu thuế có hiệu lực tại thời điểm đăng ký tờ khai.',
      canCu: ['5.2'],
      basis: 'RULE_TABLE',
    },
  ];
  if (UNASSEMBLED.test(String(description))) {
    luuY.push({
      moTa: 'Mô tả có dấu hiệu máy móc, thiết bị chưa lắp ráp hoặc tháo rời: Điều 8 hướng dẫn cách phân loại; nhập về nhiều chuyến thì làm theo Điều 9. Đây là nhận diện bằng từ khoá, người khai tự xác định.',
      canCu: ['8'],
      basis: 'HEURISTIC',
    });
  }

  // Mỗi điều khoản được dẫn xuất hiện MỘT lần ở đây (nguyên văn + trang); các bước chỉ nêu id.
  const used = [...new Set([...cacBuoc, ...huongTiep, ...luuY].flatMap((x) => x.canCu).concat(taiLieu.map((t) => t.id)))];
  const dieuKhoan = Object.fromEntries(used.map((id) => { const { id: _id, ...rest } = cite(id); return [id, rest]; }));

  return {
    vanBan: { soHieu: TT85.soHieu, ten: TT85.ten, coQuan: TT85.coQuan, ngayBanHanh: TT85.ngayBanHanh, hieuLucTu: TT85.hieuLucTu, congBao: TT85.congBao },
    trangThai,
    cacBuoc,
    ...(huongTiep.length ? { huongTiep } : {}),
    luuYPhapLy: luuY,
    dieuKhoan,
    disclaimer: 'Đây là điều luật hệ thống đối chiếu để tham khảo, không phải quyết định phân loại. Người khai hải quan chịu trách nhiệm về mã số khai; cơ quan hải quan có thẩm quyền xác định mã số.',
  };
}

module.exports = { TT85, CLAUSES, cite, canCuPhapLy, STATUS_MAP };
