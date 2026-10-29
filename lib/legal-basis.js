// lib/legal-basis.js — Nguồn chân lý duy nhất cho việc trích dẫn TT 85/2026/TT-BTC (quy định về phân loại hàng hoá)
// và chỉ tiêu tờ khai của TT 121/2025/TT-BTC (mô tả hàng hóa 1.78 / 2.69, ghi chú 1.68 — xem citeChiTieu).
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
  // 9.1, 9.2.b, 10.1.d thêm 17/10/2026 (#337, gói căn cứ /api/evidence-pack); kiểm bằng check-legal-basis với
  // tests/fixtures/legal/tt85-2026-cong-bao-409.txt (pdftotext từ đúng PDF có sha256 ở TT85.sha256Pdf).
  '9.1': {
    dieu: '9', khoan: '1', trang: 6,
    trich: 'Hồ sơ đăng ký Danh mục: … Danh mục máy móc, thiết bị; các chi tiết, linh kiện rời của máy móc, thiết bị … Phiếu theo dõi trừ lùi',
  },
  '9.2.b': {
    dieu: '9', khoan: '2', diem: 'b', trang: 6,
    trich: 'Người khai hải quan nộp hồ sơ đăng ký Danh mục quy định tại khoản 1 Điều này trước thời điểm đăng ký tờ khai hải quan nhập khẩu lô hàng đầu tiên tại cơ quan hải quan nơi thuận tiện nhất',
  },
  '10.1.d': {
    dieu: '10', khoan: '1', diem: 'd', trang: 8,
    trich: 'Tài liệu kỹ thuật của hàng hóa hoặc bản phân tích thành phần sản phẩm (đối với trường hợp không khai thác được trên hệ thống)',
  },
};

const refOf = (c) => `Điều ${c.dieu}${c.khoan ? ` khoản ${c.khoan}` : ''}${c.diem ? ` điểm ${c.diem}` : ''} ${TT85.soHieu}`;

/** Trích một điều khoản. Id lạ → ném lỗi (không có trích dẫn tự do). */
function cite(id) {
  const c = CLAUSES[id];
  if (!c) throw new Error(`legal-basis: điều khoản không có trong danh sách được phép: ${id}`);
  return { id, vanBan: TT85.soHieu, dieu: c.dieu, ...(c.khoan ? { khoan: c.khoan } : {}), ...(c.diem ? { diem: c.diem } : {}), tham_chieu: refOf(c), trang: c.trang, trich: c.trich };
}

// ── TT 121/2025/TT-BTC: chỉ tiêu thông tin tờ khai (job L0d, #548) ───────────────────────────────────────────────────────────
// TT 121 không trích theo điều/khoản mà theo CHỈ TIÊU của mẫu số 01 (tờ khai điện tử nhập khẩu) / mẫu số 02 (tờ khai điện tử
// đối với hàng hóa xuất khẩu) Phụ lục II ban hành kèm TT 38/2015/TT-BTC, đã được sửa đổi, bổ sung tại Phụ lục I TT 39/2018/TT-BTC;
// TT 121 sửa tiếp ở khoản 2 Phụ lục I của nó ("Sửa đổi một số chỉ tiêu thông tin tại mẫu số 01, mẫu số 02 … Phụ lục II ban hành
// kèm Thông tư 38/2015/TT-BTC đã được sửa đổi, bổ sung tại Phụ lục I Thông tư 39/2018/TT-BTC như sau", Công báo tr. 133).
// Nguồn đã đọc: PDF Công báo số 60 ngày 27-01-2026 (oz-wiki-plhq raw/download/congbaocdn.chinhphu.vn/2026/1/29/121-2025-tt-btc.pdf,
// sha256 dưới đây). Bản chữ: tests/fixtures/legal/tt121-2025-cong-bao-60-trich.txt (pdftotext -layout cùng PDF). Kiểm:
//   node scripts/check-legal-basis.mjs --van-ban=121/2025/TT-BTC --text=tests/fixtures/legal/tt121-2025-cong-bao-60-trich.txt
// ĐIỀU KHÔNG ĐƯỢC NÓI. Chỉ tiêu 1.78 KHÔNG nói giới hạn 200 ký tự — đó là giới hạn ô của hệ thống VNACCS/ECUS, không phải chữ
// TT 121; nơi nào cần nói "≤ 200 ký tự" ghi là "giới hạn ô của hệ thống", không gắn vào citeChiTieu. Giới hạn 100 ký tự chỉ có ở
// phần Lưu ý của chỉ tiêu 1.68 "Phần ghi chú".
const TT121 = {
  soHieu: '121/2025/TT-BTC',
  ten: 'Sửa đổi, bổ sung một số điều của các Thông tư quy định về thủ tục hải quan, kiểm tra, giám sát hải quan, thuế xuất khẩu, thuế nhập khẩu và quản lý thuế đối với hàng hoá xuất khẩu, nhập khẩu',
  coQuan: 'Bộ Tài chính',
  ngayBanHanh: '2025-12-18',
  hieuLucTu: '2026-02-01',
  congBao: 'Công báo số 60 ngày 27-01-2026',
  sua: ['38/2015/TT-BTC', '39/2018/TT-BTC'],
  sha256Pdf: 'a210244bdded36cc9d5ca7b7b7f00c0d53f3623c2dda75b3ee5fbf4462a92ead',
};
const MAU_TT121 = {
  '01': 'Tờ khai điện tử nhập khẩu',
  '02': 'Tờ khai điện tử đối với hàng hóa xuất khẩu',
};

/**
 * Chỉ tiêu được phép trích. Khoá = "<chỉ tiêu>.<điểm>" hoặc "<chỉ tiêu>.luuY.<tên>" (gạch đầu dòng trong phần "Lưu ý").
 * `trich` NGUYÊN VĂN từng chữ, từng dấu (kiểm ở chế độ NGUYEN_VAN: chỉ gộp khoảng trắng/ngắt dòng, bỏ dòng đầu trang Công báo).
 * "…" là lược; "..." trong 1.68.8 là dấu chấm lửng CÓ TRONG văn bản (chỗ người khai điền số). `trang` = số trang Công báo in ở
 * đầu trang chứa câu (câu vắt trang ghi trang bắt đầu); đã đối chiếu PDF.
 */
const CHI_TIEU_TT121 = {
  '1.68.8': {
    mau: '01', chiTieu: '1.68', tenChiTieu: 'Phần ghi chú', diem: '8', trang: 141,
    trich: 'khai “đề nghị giải phóng hàng, stt ... giống stt ... tại tk ... đang chờ KQPTPL” tại chỉ tiêu “Ghi chú” trên tờ khai hải quan',
  },
  '1.68.luuY.100kyTu': {
    mau: '01', chiTieu: '1.68', tenChiTieu: 'Phần ghi chú', luuY: '100kyTu', trang: 141,
    trich: 'Trường hợp vượt quá giới hạn cho phép (100 ký tự) thì các nội dung tiếp theo được ghi vào ô “Số hiệu, ký hiệu”, “Khai chi tiết trị giá”, “Mô tả hàng hóa”',
  },
  '1.68.luuY.hys': {
    mau: '01', chiTieu: '1.68', tenChiTieu: 'Phần ghi chú', luuY: 'hys', trang: 142,
    trich: 'Trường hợp vượt quá giới hạn ký tự tại các ô nêu trên thì sử dụng nghiệp vụ HYS để đính kèm các nội dung cần khai báo tiếp',
  },
  '1.68.luuY.ngan': {
    mau: '01', chiTieu: '1.68', tenChiTieu: 'Phần ghi chú', luuY: 'ngan', trang: 142,
    trich: 'Trường hợp có nhiều nội dung cần ghi chú tại ô này thì mỗi nội dung được ngăn cách bởi dấu “;”',
  },
  '1.78.1': {
    mau: '01', chiTieu: '1.78', tenChiTieu: 'Mô tả hàng hóa', diem: '1', trang: 143,
    trich: 'Ghi rõ tên hàng, nhãn hiệu, quy cách phẩm chất, thông số kĩ thuật, thành phần, hàm lượng, tính chất lý hóa, cấu tạo, model, kí/mã hiệu, đặc tính, công dụng quy cách đóng gói, nhà sản xuất và các tiêu chí khác được sử dụng làm căn cứ xác định mã số của hàng hóa theo hợp đồng thương mại và tài liệu khác liên quan đến lô hàng',
  },
  '1.78.luuY.tenHang': {
    mau: '01', chiTieu: '1.78', tenChiTieu: 'Mô tả hàng hóa', luuY: 'tenHang', trang: 144,
    trich: 'Tên hàng hóa được khai bằng tiếng Việt hoặc tiếng Anh',
  },
  '1.78.3': {
    mau: '01', chiTieu: '1.78', tenChiTieu: 'Mô tả hàng hóa', diem: '3', trang: 145,
    trich: 'Trường hợp áp dụng kết quả phân tích, phân loại của lô hàng cùng tên hàng, thành phần, tính chất lý hóa, tính năng, công dụng, nhập khẩu từ cùng một nhà sản xuất đã được thông quan trước đó thì ghi số/ngày văn bản thông báo',
  },
  '2.69.1': {
    mau: '02', chiTieu: '2.69', tenChiTieu: 'Mô tả hàng hóa', diem: '1', trang: 151,
    trich: 'Khai rõ tên hàng, quy cách phẩm chất, thông số kĩ thuật, thành phần, hàm lượng, tính chất lý hóa, cấu tạo, model, kí/mã hiệu, đặc tính, công dụng, quy cách đóng gói, nhà sản xuất của hàng hóa và các tiêu chí khác được sử dụng làm căn cứ xác định mã số theo hợp đồng thương mại và tài liệu khác liên quan đến lô hàng',
  },
  '2.69.2': {
    mau: '02', chiTieu: '2.69', tenChiTieu: 'Mô tả hàng hóa', diem: '2', trang: 151,
    trich: 'Khai mã nước xuất xứ của hàng hóa xuất khẩu theo quy tắc: mô tả hàng hóa#&mã nước xuất xứ',
  },
  '2.69.3': {
    mau: '02', chiTieu: '2.69', tenChiTieu: 'Mô tả hàng hóa', diem: '3', trang: 151,
    trich: 'Trường hợp áp dụng kết quả phân tích, phân loại của lô hàng cùng tên hàng, thành phần, tính chất lý hóa, tính năng, công dụng, xuất khẩu từ cùng một nhà sản xuất đã được thông quan trước đó thì ghi số/ngày văn bản thông báo',
  },
};

const refChiTieu = (m) => `Chỉ tiêu ${m.chiTieu}${m.diem ? ` điểm (${m.diem})` : m.luuY ? ' phần “Lưu ý”' : ''} mẫu số ${m.mau} Phụ lục II Thông tư 38/2015/TT-BTC (sửa đổi bởi TT 39/2018/TT-BTC, TT ${TT121.soHieu})`;

/** Trích một chỉ tiêu tờ khai (TT 121/2025). Id lạ → ném lỗi (không có trích dẫn tự do). */
function citeChiTieu(id) {
  const m = CHI_TIEU_TT121[id];
  if (!m) throw new Error(`legal-basis: chỉ tiêu không có trong danh sách được phép: ${id}`);
  return {
    id, vanBan: TT121.soHieu, vanBanGoc: '38/2015/TT-BTC', mau: m.mau, tenMau: MAU_TT121[m.mau], chiTieu: m.chiTieu, tenChiTieu: m.tenChiTieu,
    ...(m.diem ? { diem: m.diem } : {}), ...(m.luuY ? { luuY: m.luuY } : {}), tham_chieu: refChiTieu(m), trang: m.trang, trich: m.trich,
  };
}

/**
 * Phân giải một mục căn cứ trong tệp data/: con trỏ "chiTieu:<id>" → citeChiTieu(id).tham_chieu (tệp data không chép chữ căn cứ,
 * #559); chuỗi khác (vd "CV 5189/TCHQ-GSQL (2019)") giữ nguyên. Con trỏ lạ → ném lỗi như citeChiTieu.
 */
function thamChieuCua(ref) {
  const s = String(ref ?? '');
  return s.startsWith('chiTieu:') ? citeChiTieu(s.slice('chiTieu:'.length)).tham_chieu : s;
}

// Dòng đầu trang của bản pdftotext Công báo ("CÔNG BÁO/Số 60/Ngày 27-01-2026   141") và dòng mốc của tệp trích trong kho.
const DONG_DAU_TRANG = /^\s*CÔNG BÁO\/Số \d+\/Ngày \d{2}-\d{2}-\d{4}\s+\d+\s*$/;
const DONG_MOC = /^(#|###) /;
const gopKhoang = (s) => String(s || '').normalize('NFC').replace(/\s+/g, ' ').trim();

/**
 * Kiểm mỗi `trich` có trong văn bản. `cheDo`:
 *  - 'NGUYEN_VAN' (TT 121): từng chữ, từng dấu; chỉ gộp khoảng trắng/ngắt dòng; bỏ dòng đầu trang + dòng mốc; các đoạn giữa "…"
 *    phải xuất hiện ĐÚNG THỨ TỰ.
 *  - 'BO_DAU_CAU' (TT 85, như cũ): bỏ mọi ký tự không phải chữ/số, chữ thường; từng đoạn có mặt.
 * @returns {{id: string, ok: boolean, thieu: string[]}[]}
 */
function kiemNguyenVan(entries, text, { cheDo = 'BO_DAU_CAU' } = {}) {
  if (cheDo === 'NGUYEN_VAN') {
    const src = gopKhoang(String(text || '').split('\n').filter((l) => !DONG_DAU_TRANG.test(l) && !DONG_MOC.test(l)).join('\n'));
    return Object.entries(entries).map(([id, c]) => {
      const frags = String(c.trich).split(/…|\.{3,}/).map(gopKhoang).filter((f) => f.length >= 6);
      const thieu = [];
      let from = 0;
      for (const f of frags) {
        const at = src.indexOf(f, from);
        if (at < 0) thieu.push(f); else from = at + f.length;
      }
      return { id, ok: frags.length > 0 && thieu.length === 0, thieu };
    });
  }
  const { squash } = require('./wco-op');
  const src = squash(text);
  return Object.entries(entries).map(([id, c]) => {
    const thieu = String(c.trich).split(/…|\.{3,}/).map(squash).filter((f) => f.length >= 6).filter((f) => !src.includes(f));
    return { id, ok: thieu.length === 0, thieu };
  });
}

/** Sổ văn bản mà scripts/check-legal-basis.mjs kiểm được: số hiệu → { muc, cheDo }. */
const SO_VAN_BAN = {
  [TT85.soHieu]: { muc: CLAUSES, cheDo: 'BO_DAU_CAU', donVi: 'điều khoản' },
  [TT121.soHieu]: { muc: CHI_TIEU_TT121, cheDo: 'NGUYEN_VAN', donVi: 'chỉ tiêu' },
};

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

let _cgNhom = null;
/** Chú giải chi tiết nhóm (nguyên văn, data/chu-giai-heading.json#nhom) có nội dung cho nhóm 4 số không → {nhom, dayDu} | null. Nạp một lần. */
function chuGiaiNhomCua(h4) {
  if (!_cgNhom) {
    const H = JSON.parse(require('fs').readFileSync(require('./data-paths').dataReadPath('chu-giai-heading.json'), 'utf8'));
    _cgNhom = new Map(Object.entries(H).filter(([, v]) => String(v?.nhom || '').trim()).map(([k, v]) => [k, v.nhom_day_du === true]));
  }
  return _cgNhom.has(h4) ? { nhom: h4, dayDu: _cgNhom.get(h4) } : null;
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

  // 6.1.a Chú giải chi tiết HS — NGUYÊN VĂN chú giải nhóm (chu-giai-heading.json#nhom, toàn văn HS 2022) của nhóm 4 số của mã top.
  // KHÔNG dựa vào explanatory-notes.json (chữ AI chưa kiểm, lib/nguon-loai.js): trường explanatoryNote trong phản hồi chỉ là gợi ý.
  const note = hasTop ? safe(() => chuGiaiNhomCua(hs.slice(0, 4)), null) : null;
  // 6.1.b Tuyển tập ý kiến phân loại WCO (data/wco-op, công khai từ 11/10/2026): phản hồi chỉ trả CON TRỎ (nhẹ); toàn văn ở /api/wco-opinions
  const wcoOp = require('./wco-op');
  let wco;
  if (!wcoOp.available()) {
    // Máy chủ không có kho riêng (bị .gitignore/.dockerignore chặn): lấy CON TRỎ từ sổ tay công khai (data/so-tay, dựng từ kho khi có bản quyền).
    const st = hs.length >= 4 ? safe(() => require('./so-tay-runtime').yKienWco(hs), null) : null;
    wco = st && st.items.length
      ? {
        trangThai: 'CO_Y_KIEN',
        nguonTraCuu: 'SO_TAY',
        yKien: st.items.slice(0, 10).map((x) => ({ hs6: x.hs, thuTuTrongMa: x.thuTuTrongMa, ...(x.namThongQua ? { namThongQua: x.namThongQua } : {}), doTinCay: x.doTinCay, xemToanVan: `/api/wco-opinions?hs=${x.hs}&n=${x.thuTuTrongMa}` })),
        ...(st.items.length > 10 ? { conLai: st.items.length - 10 } : {}),
        ghiChu: 'Con trỏ lấy từ sổ tay (dựng từ Tuyển tập ý kiến WCO bản 2022 tại thời điểm dựng; máy chủ này không giữ kho gốc). Danh sách có thể chưa đủ: ý kiến chưa đối chiếu được mã/số in không có ở đây. Đối chiếu bản gốc trước khi dẫn.',
      }
      : { trangThai: 'CHUA_TRA_CUU', ghiChu: 'Kho Tuyển tập ý kiến phân loại WCO chưa nạp vào hệ thống và sổ tay chưa có ý kiến cho mã này nên chưa tra cứu được nguồn này.' };
  } else {
    const found = hs.length >= 6 ? wcoOp.byHs(hs.slice(0, 6)) : [];
    // Chỉ trả CON TRỎ tới ý kiến (mã HS + vị trí trong mã + năm thông qua), không trả nguyên văn. Vị trí khớp số thứ tự IN ở đầu ý kiến
    // trong Compendium 2022 (scripts/wco-op-ordcheck.mjs loại ý kiến không đối chiếu được; ngoại lệ: ý kiến đầu của mã mà số in không đọc được).
    wco = found.length
      ? {
        trangThai: 'CO_Y_KIEN',
        yKien: found.slice(0, 10).map((o) => ({
          hs6: o.hs, thuTuTrongMa: o.ord, ...(o.adoption ? { namThongQua: o.adoption } : {}),
          xemToanVan: `/api/wco-opinions?hs=${o.hs}&n=${o.ord}`,
          // CHAC = mã đọc từ tiêu đề trong bản OCR; SUY_LUAN = tiêu đề bị OCR làm rơi, mã khôi phục bằng luật máy hoặc suy luận có kiểm (lib/wco-op.js#doTinCay).
          doTinCay: wcoOp.doTinCay(o),
        })),
        ...(found.length > 10 ? { conLai: found.length - 10 } : {}),
        ghiChu: 'Con trỏ tới Tuyển tập ý kiến phân loại WCO (bản 2022): mã HS, vị trí trong mã (khớp số thứ tự in ở đầu ý kiến), năm thông qua. Danh sách có thể chưa đủ: ý kiến chưa đối chiếu được mã/số in bị loại. doTinCay = SUY_LUAN là mã khôi phục do OCR làm rơi tiêu đề. Đối chiếu bản gốc trước khi dẫn.',
      }
      : wcoOp.incomplete()
        ? { trangThai: 'CHUA_TRA_CUU_DAY_DU', ghiChu: 'Kho ý kiến phân loại WCO chưa gán đủ mã cho mọi ý kiến (đang khôi phục tiêu đề mã bị OCR làm rơi): không kết luận "mã này không có ý kiến".' }
        : { trangThai: 'KHONG_CO_Y_KIEN_CHO_MA_NAY' };
  }
  // 6.1.c SEN của AHTN
  const sen = hs.length === 8 ? safe(() => require('./sen').senFor(hs), null) : null;

  // Trạng thái nguồn: chỉ nói điều hệ thống THẬT SỰ biết. "CO_NOI_DUNG" = kệ sách có nội dung cho mã này (kèm trong phản hồi);
  // không đồng nghĩa với việc AI đã đối chiếu từng chữ.
  const taiLieu = [
    { id: '6.1.a', nguon: 'Chú giải chi tiết HS 2022 (nguyên văn chú giải nhóm trong kệ sách của hệ thống; xem /api/notes và sổ tay soTay)', trangThai: note ? 'CO_NOI_DUNG' : 'KHONG_CO_DU_LIEU_CHO_MA_NAY', ...(note ? { nhom: note.nhom, toanVan: note.dayDu } : {}), ghiChu: 'Trường explanatoryNote trong phản hồi là chữ AI chưa kiểm (nguonLoai AI_CHUA_KIEM), không phải nguồn này.' },
    { id: '6.1.b', nguon: 'Tuyển tập ý kiến phân loại WCO (Compendium 2022; toàn văn tại /api/wco-opinions)', ...wco },
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

/**
 * Căn cứ về HỒ SƠ kèm theo cho gói căn cứ soát/giải trình (/api/evidence-pack, #337). Chỉ nêu điều văn bản nói:
 *  - 10.1.d: hồ sơ yêu cầu phân tích, phân loại (do cơ quan hải quan lập) gồm tài liệu kỹ thuật hoặc bản phân tích thành phần.
 *  - 9.1 + 9.2.b: chỉ khi mô tả có dấu hiệu hàng chưa lắp ráp/tháo rời (Điều 8 → Điều 9): hồ sơ đăng ký Danh mục, nộp trước
 *    lô đầu tiên. Nhận diện bằng từ khoá nên ghi HEURISTIC; người khai tự xác định có thuộc trường hợp nhập nhiều chuyến không.
 * @param {{description?: string}} ctx
 */
function canCuHoSo(ctx = {}) {
  const muc = [{
    moTa: 'Khi cơ quan hải quan yêu cầu phân tích, phân loại: hồ sơ yêu cầu phân tích gồm tài liệu kỹ thuật của hàng hóa hoặc bản phân tích thành phần sản phẩm (trường hợp không khai thác được trên hệ thống). Tài liệu này nên có sẵn trong hồ sơ giải trình (gợi ý của hệ thống).',
    canCu: ['10.1.d'],
    basis: 'RULE_TABLE',
  }];
  if (UNASSEMBLED.test(String(ctx.description || ''))) {
    muc.push({
      moTa: 'Mô tả có dấu hiệu máy móc, thiết bị chưa lắp ráp hoặc tháo rời: nếu nhập về nhiều chuyến thì hồ sơ đăng ký Danh mục gồm Danh mục máy móc, thiết bị, linh kiện rời và Phiếu theo dõi trừ lùi, nộp trước khi đăng ký tờ khai lô hàng đầu tiên. Đây là nhận diện bằng từ khoá, người khai tự xác định.',
      canCu: ['8', '9.1', '9.2.b'],
      basis: 'HEURISTIC',
    });
  }
  const used = [...new Set(muc.flatMap((m) => m.canCu))];
  return {
    trangThai: 'CO_CAN_CU',
    muc,
    dieuKhoan: Object.fromEntries(used.map((id) => { const { id: _id, ...rest } = cite(id); return [id, rest]; })),
  };
}

module.exports = { TT85, CLAUSES, cite, TT121, CHI_TIEU_TT121, citeChiTieu, thamChieuCua, kiemNguyenVan, SO_VAN_BAN, canCuPhapLy, canCuHoSo, STATUS_MAP };
