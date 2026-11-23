#!/usr/bin/env node
/**
 * scripts/test-cong-adr-0004.mjs — Kiểm cổng máy ADR-0004 (docs/decisions/0004-quy-trinh-phan-loai-chuan-6-quy-tac.md §3).
 * Luật L3: mỗi chốt chặn đều có ca THUẬN (vi phạm → đỏ đúng mã lỗi) và ca NGƯỢC (đủ chuẩn → xanh 0 lỗi).
 * Thuần tất định, không LLM, không mạng, không ghi data/.
 */
import './test-isolate-data.mjs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { kiemCongAdr0004, MA_LOI } = require('../lib/cong-adr-0004.js');

let pass = 0;
let fail = 0;
const kiem = (ten, dat, chiTiet = '') => {
  if (dat) { pass += 1; console.log(`PASS ${ten}`); }
  else { fail += 1; console.log(`FAIL ${ten}${chiTiet ? ` — ${chiTiet}` : ''}`); }
};

const NGUON_MAU = {
  'tieuDe.8481': '84.81 Vòi, van và các thiết bị tương tự dùng cho đường ống, thân nồi hơi, bể chứa, thùng chứa hoặc các loại tương tự, kể cả van giảm áp và van điều chỉnh bằng nhiệt.',
  'tieuDe.848120': '8481.20 - Van dùng cho truyền động dầu thủy lực hoặc khí nén',
  'tax.84812090': '8481.20.90 - - Loại khác',
  'cg.phanXVI.2a': 'Các bộ phận là hàng hóa được bao gồm trong bất kỳ nhóm nào của Chương 84 hoặc 85 thì trong mọi trường hợp phải được phân loại vào chính các nhóm tương ứng đó.',
  'tieuDe.7318': '73.18 Vít, bu lông, đai ốc, vít đầu vuông, vít móc, đinh tán, chốt, chốt định vị, vòng đệm và các sản phẩm tương tự, bằng sắt hoặc thép.',
};

const BAN_GHI_CHUAN = {
  ketLuan: 'CHOT',
  maHs: '84812090',
  qt1SoNhom: 1,
  quyTacApDung: ['QT1', 'QT6'],
  cacBuoc: ['B0', 'B1', 'B6', 'DOI_CHIEU_TIEN_LE'],
  tang: {
    tang4: {
      ma: '8481',
      canCu: [{ nguon: 'tieuDe.8481', trich: 'Vòi, van và các thiết bị tương tự dùng cho đường ống' }],
    },
    tang6: {
      ma: '848120',
      canCu: [{ nguon: 'tieuDe.848120', trich: 'Van dùng cho truyền động dầu thủy lực hoặc khí nén' }],
    },
    tang8: {
      ma: '84812090',
      canCu: [{ nguon: 'tax.84812090', trich: '8481.20.90 - - Loại khác' }],
    },
  },
  doiChieuTienLe: [{ loai: 'TB-TCHQ', ma: '84812090', so: '852/TB-TCHQ' }],
};

// ── 0. Hồ sơ chuẩn đi đủ B0 → B1 → B6 → Đối chiếu tiền lệ ──
{
  const kq = kiemCongAdr0004(BAN_GHI_CHUAN, { nguonVanBan: NGUON_MAU });
  kiem('hồ sơ chuẩn 8481.20.90 đủ trích luật 3 tầng + QT1/QT6 → xanh 0 lỗi', kq.dat && kq.loi.length === 0, JSON.stringify(kq.loi));
}

// ── 1. Cổng trích luật theo tầng (THIEU_TRICH_LUAT_TANG & TRICH_KHONG_NGUYEN_VAN) ──
{
  const thieuTang6 = {
    ...BAN_GHI_CHUAN,
    tang: { ...BAN_GHI_CHUAN.tang, tang6: { ma: '848120', canCu: [] } },
  };
  const kq1 = kiemCongAdr0004(thieuTang6, { nguonVanBan: NGUON_MAU });
  kiem('Cổng 1 (thuận): tầng 6 thiếu trích luật → đỏ THIEU_TRICH_LUAT_TANG',
    !kq1.dat && kq1.loi.some((l) => l.ma === 'THIEU_TRICH_LUAT_TANG' && l.tang === 'tang6'), JSON.stringify(kq1.loi));

  const dungHoiTang6 = {
    ...BAN_GHI_CHUAN,
    ketLuan: 'DUNG_HOI',
    maHs: '8481',
    tang: { tang4: BAN_GHI_CHUAN.tang.tang4, tang6: { trangThai: 'DUNG_HOI' } },
  };
  const kq2 = kiemCongAdr0004(dungHoiTang6, { nguonVanBan: NGUON_MAU });
  kiem('Cổng 1 (ngược): tầng 4 đủ trích, tầng 6 đặt DUNG_HOI → xanh 0 lỗi', kq2.dat, JSON.stringify(kq2.loi));

  const trichBia = {
    ...BAN_GHI_CHUAN,
    tang: {
      ...BAN_GHI_CHUAN.tang,
      tang4: { ma: '8481', canCu: [{ nguon: 'tieuDe.8481', trich: 'van điện từ công nghiệp tự bịa không có trong luật' }] },
    },
  };
  const kq3 = kiemCongAdr0004(trichBia, { nguonVanBan: NGUON_MAU });
  kiem('Cổng 1 (nguyên văn): trích bịa không có trong nguồn → đỏ TRICH_KHONG_NGUYEN_VAN',
    !kq3.dat && kq3.loi.some((l) => l.ma === 'TRICH_KHONG_NGUYEN_VAN' && l.tang === 'tang4'), JSON.stringify(kq3.loi));

  const trichChamLung = {
    ...BAN_GHI_CHUAN,
    tang: {
      ...BAN_GHI_CHUAN.tang,
      tang4: { ma: '8481', canCu: [{ nguon: 'tieuDe.8481', trich: 'Vòi, van … dùng cho đường ống' }] },
    },
  };
  const kq4 = kiemCongAdr0004(trichChamLung, { nguonVanBan: NGUON_MAU });
  kiem('Cổng 1 (ngược nguyên văn): trích có dấu "…" đúng thứ tự trong nguồn → xanh', kq4.dat, JSON.stringify(kq4.loi));
}

// ── 2. Cổng cấm viện dẫn QT3 khi QT1 đã đủ 1 nhóm ──
{
  const qt3Thua = { ...BAN_GHI_CHUAN, qt1SoNhom: 1, quyTacApDung: ['QT1', 'QT3(a)', 'QT6'] };
  const kq1 = kiemCongAdr0004(qt3Thua, { nguonVanBan: NGUON_MAU });
  kiem('Cổng 2 (thuận): QT1 còn 1 nhóm nhưng viện dẫn QT3(a) → đỏ QT3_THUA_KHI_QT1_DU',
    !kq1.dat && kq1.loi.some((l) => l.ma === 'QT3_THUA_KHI_QT1_DU'), JSON.stringify(kq1.loi));

  const qt3HopLe = {
    ...BAN_GHI_CHUAN,
    qt1SoNhom: 2,
    quyTacApDung: ['QT1', 'QT3(b)', 'QT6'],
    cacBuoc: ['B0', 'B1', 'B3', 'B6', 'DOI_CHIEU_TIEN_LE'],
  };
  const kq2 = kiemCongAdr0004(qt3HopLe, { nguonVanBan: NGUON_MAU });
  kiem('Cổng 2 (ngược): QT1 còn 2 nhóm phải dùng QT3(b) → không báo QT3_THUA_KHI_QT1_DU',
    kq2.dat, JSON.stringify(kq2.loi));
}

// ── 3. Cổng cấm lấy tiền lệ làm căn cứ chính ──
{
  const chiTienLe = {
    ...BAN_GHI_CHUAN,
    tang: {
      ...BAN_GHI_CHUAN.tang,
      tang4: { ma: '8481', canCu: [{ loai: 'TB-TCHQ', nguon: 'TB-852/TCHQ', trich: 'Van điện từ khí nén 5/2 xếp 8481.20.90' }] },
    },
  };
  const kq1 = kiemCongAdr0004(chiTienLe, { nguonVanBan: NGUON_MAU });
  kiem('Cổng 3 (thuận): lấy TB-TCHQ làm căn cứ tầng 4 → đỏ TIEN_LE_LAM_CAN_CU_CHINH',
    !kq1.dat && kq1.loi.some((l) => l.ma === 'TIEN_LE_LAM_CAN_CU_CHINH' && l.tang === 'tang4'), JSON.stringify(kq1.loi));

  const tronTienLe = {
    ...BAN_GHI_CHUAN,
    canCuChinh: [
      { nguon: 'tieuDe.8481', trich: 'Vòi, van và các thiết bị tương tự' },
      { loai: 'TO_KHAI_OZ', nguon: 'oz_precedent', trich: '11 tờ khai Oz xếp 84812090' },
    ],
  };
  const kq2 = kiemCongAdr0004(tronTienLe, { nguonVanBan: NGUON_MAU });
  kiem('Cổng 3 (thuận): trộn tờ khai Oz vào canCuChinh → đỏ TIEN_LE_LAM_CAN_CU_CHINH',
    !kq2.dat && kq2.loi.some((l) => l.ma === 'TIEN_LE_LAM_CAN_CU_CHINH'), JSON.stringify(kq2.loi));
}

// ── 4. Cổng bộ phận rơi vào Phần XV (Ch.72–83) ──
{
  const boPhanThieu = {
    ketLuan: 'CHOT',
    maHs: '7318',
    laBoPhan: true,
    mayChu: 'máy ép nhựa 84.77',
    qt1SoNhom: 1,
    quyTacApDung: ['QT1'],
    tang: {
      tang4: { ma: '7318', canCu: [{ nguon: 'tieuDe.7318', trich: 'Vít, bu lông, đai ốc … bằng sắt hoặc thép' }] },
    },
    kiemBoPhan: { daKiemChuGiai1fPhanXV: true, daKiemChuGiai2PhanXVI: false },
  };
  const kq1 = kiemCongAdr0004(boPhanThieu, { nguonVanBan: NGUON_MAU });
  kiem('Cổng 4 (thuận): bộ phận chốt 7318 (Phần XV) thiếu kiểm CG2 Phần XVI → đỏ BO_PHAN_THIEU_KIEM_LOAI_TRU_PXVI',
    !kq1.dat && kq1.loi.some((l) => l.ma === 'BO_PHAN_THIEU_KIEM_LOAI_TRU_PXVI'), JSON.stringify(kq1.loi));

  const boPhanDu = {
    ...boPhanThieu,
    kiemBoPhan: { daKiemBoPhanCongDungChung: true, daKiemChuGiai2PhanXVI: true },
  };
  const kq2 = kiemCongAdr0004(boPhanDu, { nguonVanBan: NGUON_MAU });
  kiem('Cổng 4 (ngược): bộ phận chốt 7318 đã kiểm đủ bộ phận công dụng chung + CG2 Phần XVI → xanh',
    kq2.dat, JSON.stringify(kq2.loi));
}

// ── 5. Cổng dừng-hỏi khi thiếu dữ kiện điều kiện luật ──
{
  const chotLieu = {
    ...BAN_GHI_CHUAN,
    ketLuan: 'CHOT',
    duKienBatBuocThieu: ['loaiTruyenDong'],
  };
  const kq1 = kiemCongAdr0004(chotLieu, { nguonVanBan: NGUON_MAU });
  kiem('Cổng 5 (thuận): thiếu dữ kiện điều kiện luật mà ketLuan = CHOT → đỏ CHOT_KHI_THIEU_DU_KIEN_LUAT',
    !kq1.dat && kq1.loi.some((l) => l.ma === 'CHOT_KHI_THIEU_DU_KIEN_LUAT'), JSON.stringify(kq1.loi));

  const dungHoiDung = {
    ...BAN_GHI_CHUAN,
    ketLuan: 'DUNG_HOI',
    maHs: '8481',
    tang: { tang4: BAN_GHI_CHUAN.tang.tang4, tang6: { trangThai: 'DUNG_HOI' } },
    duKienBatBuocThieu: ['loaiTruyenDong'],
  };
  const kq2 = kiemCongAdr0004(dungHoiDung, { nguonVanBan: NGUON_MAU });
  kiem('Cổng 5 (ngược): thiếu dữ kiện điều kiện luật và đặt DUNG_HOI → xanh', kq2.dat, JSON.stringify(kq2.loi));
}

// ── 6. Thứ tự bước ADR-0004 ──
{
  const tienLeTruocB1 = { ...BAN_GHI_CHUAN, cacBuoc: ['B0', 'DOI_CHIEU_TIEN_LE', 'B1', 'B6'] };
  const kq1 = kiemCongAdr0004(tienLeTruocB1, { nguonVanBan: NGUON_MAU });
  kiem('Thứ tự bước (thuận): DOI_CHIEU_TIEN_LE trước B1 → đỏ SAI_THU_TU_BUOC',
    !kq1.dat && kq1.loi.some((l) => l.ma === 'SAI_THU_TU_BUOC'), JSON.stringify(kq1.loi));

  const b3KhiQt1Du = { ...BAN_GHI_CHUAN, qt1SoNhom: 1, cacBuoc: ['B0', 'B1', 'B3', 'B6'] };
  const kq2 = kiemCongAdr0004(b3KhiQt1Du, { nguonVanBan: NGUON_MAU });
  kiem('Thứ tự bước (thuận): chạy B3 khi QT1 đã khoanh còn 1 nhóm → đỏ SAI_THU_TU_BUOC',
    !kq2.dat && kq2.loi.some((l) => l.ma === 'SAI_THU_TU_BUOC'), JSON.stringify(kq2.loi));

  kiem('MA_LOI xuất đủ 7 mã lỗi ADR-0004', Object.keys(MA_LOI).length === 7);
}

console.log(`\ntest-cong-adr-0004: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
console.log('=== ALL TESTS PASSED ===');
