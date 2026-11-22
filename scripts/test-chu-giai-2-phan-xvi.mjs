#!/usr/bin/env node
/**
 * Cổng kiểm ADR-0004 Việc 2: Bảng thứ tự Chú giải 2 Phần XVI (data/luat/chu-giai-2-phan-xvi.json)
 * và module tất định lib/do-thi/chu-giai-2-phan-xvi.js.
 *
 * Kiểm:
 *   1. Mọi trích dẫn { tep, khoa, nguyenVan } trong JSON khớp 100% nguyên văn từ tệp nguồn thật.
 *   2. Đủ cấu trúc Chú giải 1 Phần XVI/Ch.84/Ch.85, 5 nhóm đầu Chú giải 2, 2(a) định danh riêng, 2(b)/2(c) theo chương 84/85.
 *   3. Đủ các ca bắt buộc và ca ngược của #1636 (giá đỡ chổi than → 8503; ổ trượt trục quay → 8483; thiếu trucQuay → DUNG_HOI;
 *      trucQuay: false → 8431; con lăn vận thăng → 8431; chổi than → 8545; vòng bi cầu → 8482; 8517+8525 → 8517; bu lông 1(g)).
 *   4. Không đường khách hàng nào nạp module này ở bước dựng bảng.
 */
import { createRequire } from 'node:module';
import { doc, docJson, baoDong, tepMa, boKiem } from './lib-luat.mjs';

const require = createRequire(import.meta.url);
const { kiem, xong } = boKiem('test-chu-giai-2-phan-xvi');

const { taiBangChuGiai2, datLaiCache, xetChuGiai2PhanXVI, THU_TU_AP_DUNG } = require('../lib/do-thi/chu-giai-2-phan-xvi.js');

const cgChuong = docJson('data/chu-giai-chuong.json');
const cgHeading = docJson('data/chu-giai-heading.json');
const taxData = docJson('data/tax.json');
const nguonMap = {
  'data/chu-giai-chuong.json': cgChuong,
  'data/chu-giai-heading.json': cgHeading,
  'data/tax.json': taxData,
};

function trichHopLe(t) {
  if (!t || typeof t.tep !== 'string' || typeof t.khoa !== 'string' || typeof t.nguyenVan !== 'string' || !t.nguyenVan.trim()) {
    return false;
  }
  const src = nguonMap[t.tep];
  if (!src) return false;
  let val = src;
  for (const part of t.khoa.split('.')) val = val?.[part];
  return typeof val === 'string' && val.includes(t.nguyenVan);
}

// ── 1. Kiểm cấu trúc và trích dẫn nguyên văn trong data/luat/chu-giai-2-phan-xvi.json ───────────────────────────
const bang = docJson('data/luat/chu-giai-2-phan-xvi.json');
kiem('phienBan === "HS2022"', bang.phienBan === 'HS2022');
kiem('thuTuApDung khớp 4 bước chuẩn ADR-0004 + Chú giải 2 Phần XVI',
  JSON.stringify(bang.thuTuApDung) === JSON.stringify(THU_TU_AP_DUNG));
kiem('nguonGoc có trích dẫn nguyên văn Chú giải 2 (2(a), 2(b), 2(c)) từ 84.phan',
  trichHopLe(bang.nguonGoc)
  && bang.nguonGoc.khoa === '84.phan'
  && bang.nguonGoc.nguyenVan.includes('(a)')
  && bang.nguonGoc.nguyenVan.includes('(b)')
  && bang.nguonGoc.nguyenVan.includes('(c)'));

const lt = Array.isArray(bang.loaiTruTruocKhiXet) ? bang.loaiTruTruocKhiXet : [];
const ltSai = lt.filter((m) => !trichHopLe(m.trich) || (m.trichBoSung && !trichHopLe(m.trichBoSung)));
kiem(`mọi mục trong loaiTruTruocKhiXet (${lt.length} mục) đều có trich nguyên văn hợp lệ`, lt.length >= 25 && ltSai.length === 0, ltSai.map((m) => m.id).join(', '));

const idsLt = new Set(lt.map((m) => m.id));
kiem('loaiTruTruocKhiXet đủ Chú giải 1 Phần XVI (1a-1c, 1g, 1k-1l), Ch.84, Ch.85 và 5 nhóm đầu CG2 (8484, 8544-8547)',
  ['CG1_PXVI_1a', 'CG1_PXVI_1b', 'CG1_PXVI_1c', 'CG1_PXVI_1g', 'CG1_PXVI_1k', 'CG1_PXVI_1l',
    'CG1_CH84_1a', 'CG1_CH84_1b', 'CG1_CH85_1a', 'CG1_CH85_1b',
    'CG2_DAU_8484', 'CG2_DAU_8544', 'CG2_DAU_8545', 'CG2_DAU_8546', 'CG2_DAU_8547'].every((id) => idsLt.has(id)));

const m2a = Array.isArray(bang.nhom2aDinhDanhRieng) ? bang.nhom2aDinhDanhRieng : [];
const NHOM_2A_BAT_BUOC = [
  '8407', '8408', '8412', '8413', '8414', '8421', '8481', '8482', '8483', '8484',
  '8501', '8502', '8504', '8505', '8507', '8511', '8512', '8532', '8533', '8534',
  '8535', '8536', '8539', '8540', '8541', '8542', '8544', '8545', '8546', '8547',
];
const NHOM_BO_PHAN_CAM_2A = new Set(['8409', '8431', '8448', '8466', '8473', '8487', '8503', '8522', '8529', '8538', '8548']);
const tap2a = new Set(m2a.map((m) => m.nhom));
kiem(`nhom2aDinhDanhRieng (${m2a.length} nhóm) đủ tối thiểu 30 nhóm bắt buộc và KHÔNG chứa nhóm bộ phận 2(b)/2(c)`,
  NHOM_2A_BAT_BUOC.every((n) => tap2a.has(n)) && m2a.every((m) => !NHOM_BO_PHAN_CAM_2A.has(m.nhom)));

const m2aSai = m2a.filter((m) =>
  !trichHopLe(m.trich)
  || m.tenNhom !== cgHeading[m.nhom]?.ten_nhom
  || !Array.isArray(m.loaiTruRieng)
  || m.loaiTruRieng.some((lr) => !trichHopLe(lr.trich)));
kiem('mọi mục trong nhom2aDinhDanhRieng có tenNhom nguyên văn, trich và loaiTruRieng[].trich hợp lệ',
  m2aSai.length === 0, m2aSai.map((m) => m.nhom).join(', '));

const m8483 = m2a.find((m) => m.nhom === '8483');
const m8545 = m2a.find((m) => m.nhom === '8545');
kiem('nhóm 8483 ghi rõ điều kiện bắt buộc chuyenDong: TRUC_QUAY và loại trừ sang 8482, 6815',
  m8483?.dieuKienApDung?.chuyenDong === 'TRUC_QUAY'
  && m8483.loaiTruRieng.some((lr) => lr.chuyenSang.includes('8482'))
  && m8483.loaiTruRieng.some((lr) => lr.chuyenSang.includes('6815')));
kiem('nhóm 8545 loại trừ riêng bộ phận giữ chổi than sang 8503',
  m8545?.loaiTruRieng.some((lr) => lr.chuyenSang.includes('8503') && lr.trich.khoa === '8545.nhom'));

const m2b = bang.nhom2bBoPhanTheoChuong || {};
const m2b84 = m2b['84'] || [];
const m2b85 = m2b['85'] || [];
const m2bTatCa = [...m2b84, ...m2b85];
const m2bSai = m2bTatCa.filter((m) =>
  !trichHopLe(m.trich)
  || (m.trichBoSung && !trichHopLe(m.trichBoSung))
  || m.tenNhom !== cgHeading[m.nhom]?.ten_nhom
  || (m.loaiTruRieng || []).some((lr) => !trichHopLe(lr.trich)));
kiem('nhom2bBoPhanTheoChuong tách rõ "84" và "85", đủ 8409/8431/8448/8466/8473/8487 + 8503/8517/8522/8529/8538/8548, trich hợp lệ',
  ['8409', '8431', '8448', '8466', '8473', '8487'].every((n) => m2b84.some((x) => x.nhom === n))
  && ['8503', '8517', '8522', '8529', '8538', '8548'].every((n) => m2b85.some((x) => x.nhom === n))
  && m2b84.find((x) => x.nhom === '8487')?.vaiTro === '2c'
  && m2b85.find((x) => x.nhom === '8548')?.vaiTro === '2c'
  && m2bSai.length === 0,
  m2bSai.map((m) => m.nhom).join(', '));

// ── 2. Kiểm nạp bảng, sạch đường khách hàng & đăng ký trong dau-noi.json ──────────────────────────────────────
datLaiCache();
const bangTai = taiBangChuGiai2();
kiem('taiBangChuGiai2() nạp đúng bảng JSON thuần và lặp lại cho cùng dữ liệu',
  bangTai.phienBan === 'HS2022' && taiBangChuGiai2() === bangTai);

const dauNoi = docJson('data/luat/dau-noi.json');
kiem('lib/do-thi/chu-giai-2-phan-xvi.js được khai trong dau-noi.json (kho.bangCanh.moDun)',
  (dauNoi.kho?.bangCanh?.moDun || []).includes('lib/do-thi/chu-giai-2-phan-xvi.js'));

const duongKhachNap = [...tepMa('api'), 'lib/classify.js', 'lib/engine-loop.js', 'lib/llm-tier.js', 'lib/llm.mjs']
  .filter((t) => baoDong(t).has('lib/do-thi/chu-giai-2-phan-xvi.js'));
kiem('không đường khách hàng nào nạp lib/do-thi/chu-giai-2-phan-xvi.js ở việc này',
  duongKhachNap.length === 0, duongKhachNap.join(', '));

// ── 3. Kiểm đủ các ca bắt buộc và ca ngược của #1636 ──────────────────────────────────────────────────────────
function moiTrichHopLe(kq) {
  return Array.isArray(kq?.trich) && kq.trich.length > 0 && kq.trich.every(trichHopLe);
}

// Ca 1: giá đỡ chổi than (8501) → 8503 (có trích 8545.nhom, 84.phan, 8503.nhom)
const c1 = xetChuGiai2PhanXVI({ tenHang: 'giá đỡ chổi than', nhomMayMe: '8501' });
kiem('ca #1636: giá đỡ chổi than (nhomMayMe: 8501) → CHOT 8503, có trích 8545.nhom, 84.phan, 8503.nhom',
  c1.trangThai === 'CHOT'
  && c1.nhomKetQua === '8503'
  && c1.buocDung === '2b_BO_PHAN_CHUYEN_DUNG'
  && c1.trich.some((t) => t.khoa === '8545.nhom')
  && c1.trich.some((t) => t.khoa === '84.phan')
  && c1.trich.some((t) => t.khoa === '8503.nhom')
  && moiTrichHopLe(c1),
  JSON.stringify({ trangThai: c1.trangThai, nhomKetQua: c1.nhomKetQua, khoa: c1.trich.map((t) => t.khoa) }));

// Ca 2: ổ trượt có trục quay (bạc trục ty máy khoan, 8430, trucQuay: true) → 8483 (2a thắng 8431)
const c2 = xetChuGiai2PhanXVI({ tenHang: 'bạc trục ty máy khoan', nhomMayMe: '8430', dacTinh: { trucQuay: true } });
kiem('ca #1636: bạc trục ty máy khoan (8430, trucQuay: true) → CHOT 8483 (2a thắng 8431)',
  c2.trangThai === 'CHOT' && c2.nhomKetQua === '8483' && c2.buocDung === '2a_DINH_DANH_RIENG' && moiTrichHopLe(c2),
  JSON.stringify({ trangThai: c2.trangThai, nhomKetQua: c2.nhomKetQua }));

// Ca 3 (ngược): bạc trục ty máy khoan thiếu trucQuay → DUNG_HOI ['8483', '8431'] kèm câu hỏi & trích cả 2(a) lẫn 2(b)
const c3 = xetChuGiai2PhanXVI({ tenHang: 'bạc trục ty máy khoan', nhomMayMe: '8430' });
kiem('ca ngược #1636: bạc trục ty máy khoan thiếu trucQuay → DUNG_HOI ["8483", "8431"], đủ câu hỏi + trích 2(a) & 2(b)',
  c3.trangThai === 'DUNG_HOI'
  && c3.nhomKetQua === null
  && JSON.stringify(c3.ungVien) === JSON.stringify(['8483', '8431'])
  && Boolean(c3.cauHoi?.noiDung)
  && c3.trich.some((t) => t.khoa === '8483.nhom')
  && c3.trich.some((t) => t.khoa === '8431.nhom')
  && moiTrichHopLe(c3),
  JSON.stringify({ trangThai: c3.trangThai, ungVien: c3.ungVien, khoa: c3.trich.map((t) => t.khoa) }));

// Ca 4 (ngược): bạc trục ty máy khoan trucQuay: false → CHOT 8431 (2b)
const c4 = xetChuGiai2PhanXVI({ tenHang: 'bạc trục ty máy khoan', nhomMayMe: '8430', dacTinh: { trucQuay: false } });
kiem('ca ngược #1636: bạc trục ty máy khoan (trucQuay: false) → CHOT 8431 (rơi xuống 2b)',
  c4.trangThai === 'CHOT' && c4.nhomKetQua === '8431' && c4.buocDung === '2b_BO_PHAN_CHUYEN_DUNG' && moiTrichHopLe(c4),
  JSON.stringify({ trangThai: c4.trangThai, nhomKetQua: c4.nhomKetQua }));

// Ca 5: con lăn vận thăng (8428) → 8431
const c5 = xetChuGiai2PhanXVI({ tenHang: 'con lăn vận thăng', nhomMayMe: '8428' });
kiem('ca #1636: con lăn vận thăng (nhomMayMe: 8428) → CHOT 8431 (2b)',
  c5.trangThai === 'CHOT' && c5.nhomKetQua === '8431' && c5.buocDung === '2b_BO_PHAN_CHUYEN_DUNG' && moiTrichHopLe(c5),
  JSON.stringify({ trangThai: c5.trangThai, nhomKetQua: c5.nhomKetQua }));

// Ca 6: chổi than → 8545 (2a thắng 8503)
const c6 = xetChuGiai2PhanXVI({ tenHang: 'chổi than', nhomMayMe: '8501' });
kiem('ca #1636: chổi than (dù gắn máy 8501) → CHOT 8545 (2a thắng 8503)',
  c6.trangThai === 'CHOT' && c6.nhomKetQua === '8545' && c6.buocDung === '2a_DINH_DANH_RIENG' && moiTrichHopLe(c6));

// Ca 7: vòng bi cầu → 8482 (2a thắng 8431)
const c7 = xetChuGiai2PhanXVI({ tenHang: 'vòng bi cầu', nhomMayMe: '8428' });
kiem('ca #1636: vòng bi cầu (dù dùng cho 8428) → CHOT 8482 (2a thắng 8431)',
  c7.trangThai === 'CHOT' && c7.nhomKetQua === '8482' && c7.buocDung === '2a_DINH_DANH_RIENG' && moiTrichHopLe(c7));

// Ca 8: bộ phận chỉ dùng cho 8517 và 8525 → 8517 (quy tắc ưu tiên 2b)
const c8a = xetChuGiai2PhanXVI({ tenHang: 'mô-đun thu phát chuyên dùng', nhomMayMe: ['8517', '8525'] });
const c8b = xetChuGiai2PhanXVI({ tenHang: 'mô-đun thu phát chuyên dùng', nhomMayMe: '8517, 8525' });
kiem('ca #1636: bộ phận chỉ dùng cho 8517 và 8525 → CHOT 8517 (ngoại lệ 2b thắng 8529)',
  c8a.trangThai === 'CHOT' && c8a.nhomKetQua === '8517' && c8a.buocDung === '2b_BO_PHAN_CHUYEN_DUNG'
  && c8b.nhomKetQua === '8517' && moiTrichHopLe(c8a));

// Ca 9: bu lông công dụng chung → loại ở Chú giải 1(g) Phần XVI (không vào 84/85)
const c9 = xetChuGiai2PhanXVI({ tenHang: 'bu lông công dụng chung', nhomMayMe: '8428' });
kiem('ca #1636: bu lông công dụng chung → loại ở Chú giải 1(g) Phần XVI (7318, không vào 84/85)',
  c9.trangThai === 'CHOT'
  && c9.buocDung === 'LOAI_TRU_CHU_GIAI_1'
  && c9.diemLoaiTru === '1(g)'
  && !/^(84|85)/.test(c9.nhomKetQua)
  && moiTrichHopLe(c9),
  JSON.stringify({ buocDung: c9.buocDung, nhomKetQua: c9.nhomKetQua, diem: c9.diemLoaiTru }));

// ── 4. Các ca bổ sung biên luật (cao su 4016, nhựa, than chì 6815, 8483 gối đỡ, 8479, 2(c) 8487/8548, bẫy chữ "sử dụng") ──
const c10 = xetChuGiai2PhanXVI({ tenHang: 'gioăng cao su', nhomMayMe: '8413', dacTinh: { chatLieu: 'cao su lưu hóa' } });
kiem('ca biên: gioăng cao su lưu hóa → loại ở Chú giải 1(a) Phần XVI (4016)',
  c10.trangThai === 'CHOT' && c10.buocDung === 'LOAI_TRU_CHU_GIAI_1' && c10.nhomKetQua === '4016' && moiTrichHopLe(c10));

const c11 = xetChuGiai2PhanXVI({ tenHang: 'ổ trượt bằng than chì', nhomMayMe: '8430', dacTinh: { chatLieu: 'than chì' } });
kiem('ca biên: ổ trượt bằng than chì → loại trừ riêng 84.83 sang 6815',
  c11.trangThai === 'CHOT' && c11.nhomKetQua === '6815' && moiTrichHopLe(c11));

const c12 = xetChuGiai2PhanXVI({ tenHang: 'gối đỡ vòng bi', nhomMayMe: '8428' });
kiem('ca biên: gối đỡ vòng bi → 8483 (loại trừ 8482 sang 8483)',
  c12.trangThai === 'CHOT' && c12.nhomKetQua === '8483' && moiTrichHopLe(c12));

const c13 = xetChuGiai2PhanXVI({ tenHang: 'bộ phận sử dụng cho máy ép công nghiệp', nhomMayMe: '8479' });
kiem('ca biên + bẫy chữ: "sử dụng cho máy nhóm 8479" không bị nhầm "sứ" (6909) → CHOT 8479 (2b)',
  c13.trangThai === 'CHOT' && c13.nhomKetQua === '8479' && c13.buocDung === '2b_BO_PHAN_CHUYEN_DUNG' && moiTrichHopLe(c13));

const c14 = xetChuGiai2PhanXVI({ tenHang: 'tay gạt cơ khí', nhomMayMe: ['8419', '8479'], dacTinh: { dungDien: false } });
const c15 = xetChuGiai2PhanXVI({ tenHang: 'cảm biến điện dùng cho nhiều máy', nhomMayMe: ['8514', '8543'], dacTinh: { dungDien: true } });
const c16 = xetChuGiai2PhanXVI({ tenHang: 'linh kiện dùng cho nhiều loại máy', dacTinh: { nhieuLoaiMay: true } });
kiem('ca 2(c): nhiều loại máy không điện → 8487; nhiều loại máy có điện → 8548; thiếu phân định điện → DUNG_HOI ["8487", "8548"]',
  c14.nhomKetQua === '8487' && c14.buocDung === '2c_BO_PHAN_CON_LAI' && moiTrichHopLe(c14)
  && c15.nhomKetQua === '8548' && c15.buocDung === '2c_BO_PHAN_CON_LAI' && moiTrichHopLe(c15)
  && c16.trangThai === 'DUNG_HOI' && JSON.stringify(c16.ungVien) === JSON.stringify(['8487', '8548']) && moiTrichHopLe(c16));

xong();
