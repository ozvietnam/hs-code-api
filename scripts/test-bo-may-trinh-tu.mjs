// scripts/test-bo-may-trinh-tu.mjs
// Bộ đo kiểm tất định cho khuôn "bộ máy trình tự" (lib/do-thi/bo-may-trinh-tu.js) theo ADR-0004:
//   - 6 ca chuẩn bo-chuan-v1.json (BC-01..BC-06) + 100% kiểm tra trích dẫn nguyên văn
//   - 6+ ca phản chứng boSung thực (đổi dữ kiện -> đổi kết quả đúng luật)
//   - Nhánh hoạt động B2_B5 (GIR 3(b) khi B1 chưa chốt được duy nhất)
//   - Đủ 7 cổng báo đỏ của congKiemDinhADR0004 (ADR-0004 §3, kể cả Phần XV / Chương 73)
//   - Thước đo bậc thang T1 / T2 / T3 (ADR-0004 §4: sai = 0 ở T2 & T3)
//   - Cô lập đường khách: 0 tệp ngoài lib/do-thi/ nạp bo-may-trinh-tu.js, 0 AI/mạng, 0 cờ HS_* mới.

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import {
  baoDong,
  boKiem,
  coTrongDoan,
  doc,
  docJson,
  napTrucTiep,
  tepMa,
} from './lib-luat.mjs';

const require = createRequire(import.meta.url);
const M = require('../lib/do-thi/bo-may-trinh-tu.js');

const { kiem, xong } = boKiem('bo-may-trinh-tu');
const boChuan = docJson('data/bo-chuan/bo-chuan-v1.json');
const caTheoId = (id) => boChuan.ca.find((c) => c.id === id);
const nhomTuKetQua = (r) => r.ketQua.nhom || (r.ketQua.ma ? r.ketQua.ma.slice(0, 4) : null);

function kiemTraKetQuaHopLe(label, r) {
  kiem(`${label}: phienBan === 'trinh-tu-v1'`, r.phienBan === 'trinh-tu-v1', r.phienBan);
  kiem(
    `${label}: thứ tự 5 tầng không nhảy cóc`,
    JSON.stringify(r.cacTang.map((t) => t.tang)) === JSON.stringify(M.TRINH_TU_TANG),
    r.cacTang.map((t) => t.tang).join(' -> '),
  );
  kiem(
    `${label}: congKiemDinhADR0004.dat === true`,
    r.congKiemDinhADR0004?.dat === true,
    JSON.stringify(r.congKiemDinhADR0004?.viPham),
  );
  kiem(
    `${label}: tiền lệ chỉ kiểm chứng cuối (anhHuongChotMa === false)`,
    r.kiemChungTienLe?.vaiTro === 'KIEM_CHUNG_CUOI' && r.kiemChungTienLe?.anhHuongChotMa === false,
  );
  const loiTrich = [];
  for (const t of r.cacTang) {
    if (t.trangThai === 'BO_QUA') continue;
    if (!t.quyTac || !Array.isArray(t.trich) || t.trich.length === 0) {
      loiTrich.push(`${t.tang}: thiếu quyTac hoặc trich`);
      continue;
    }
    for (const tr of t.trich) {
      const err = M.kiemTraTrichHopLe(tr);
      if (err) loiTrich.push(`${t.tang}: ${err}`);
    }
  }
  kiem(`${label}: 100% trich[] nguyên văn khớp tệp thật trên đĩa`, loiTrich.length === 0, loiTrich.join('; '));
}

async function chay() {
  // 1) Xuất khẩu chuẩn
  kiem('Xuất khẩu PHIEN_BAN === "trinh-tu-v1"', M.PHIEN_BAN === 'trinh-tu-v1');
  kiem(
    'Xuất khẩu TRINH_TU_TANG đủ 5 tầng',
    JSON.stringify(M.TRINH_TU_TANG) === JSON.stringify(['B0', 'B1', 'B2_B5', 'B6_6SO', 'B6_8SO']),
  );
  kiem(
    'Xuất khẩu đủ hàm chuẩn',
    typeof M.phanLoaiTheoTrinhTu === 'function'
      && typeof M.kiemDinhADR0004 === 'function'
      && typeof M.datLaiCache === 'function',
  );

  // 2) Chạy đủ 6 ca chuẩn trong bo-chuan-v1.json (không mock) & đo bậc thang ADR-0004 §4
  let t1Sai = 0;
  let t2Sai = 0;
  let t3Sai = 0;

  for (const ca of boChuan.ca) {
    const r = await M.phanLoaiTheoTrinhTu({ tenHang: ca.tenHang });
    kiemTraKetQuaHopLe(ca.id, r);
    kiem(
      `${ca.id}: khớp trangThai (${ca.ketQua.trangThai})`,
      r.ketQua.trangThai === ca.ketQua.trangThai,
      `${r.ketQua.trangThai} vs ${ca.ketQua.trangThai}`,
    );

    if (ca.ketQua.trangThai === 'CHOT') {
      kiem(`${ca.id}: chốt đúng mã ${ca.ketQua.ma}`, r.ketQua.ma === ca.ketQua.ma, r.ketQua.ma);
      if (r.ketQua.ma !== ca.ketQua.ma) t3Sai += 1;
    } else {
      kiem(`${ca.id}: không tự chốt mã khi DUNG_HOI`, r.ketQua.ma === null, String(r.ketQua.ma));
      kiem(
        `${ca.id}: có cauHoi căn cứ (>= 15 ký tự)`,
        typeof r.ketQua.cauHoi === 'string' && r.ketQua.cauHoi.trim().length >= 15,
        r.ketQua.cauHoi,
      );
      if (ca.ketQua.maTam) {
        kiem(`${ca.id}: giữ maTam === ${ca.ketQua.maTam}`, r.ketQua.maTam === ca.ketQua.maTam, r.ketQua.maTam);
      }
      const duUngVien = (ca.ketQua.maUngVien || []).every((m) => (r.ketQua.maUngVien || []).includes(m));
      kiem(`${ca.id}: đủ maUngVien [${(ca.ketQua.maUngVien || []).join(', ')}]`, duUngVien, JSON.stringify(r.ketQua.maUngVien));
      if (r.ketQua.ma !== null || !duUngVien) t3Sai += 1;
    }

    // Kiểm bậc thang T1 (4 số) và T2 (6 số) theo ADR-0004 §4
    const tB1 = r.cacTang.find((t) => t.tang === 'B1');
    const tB66 = r.cacTang.find((t) => t.tang === 'B6_6SO');
    if (ca.cacTang?.B1?.ketLuan) {
      const okT1 = tB1.ketLuan === ca.cacTang.B1.ketLuan || tB1.trangThai === 'DUNG_HOI';
      if (!okT1) t1Sai += 1;
    }
    if (ca.cacTang?.B6_6SO?.ketLuan && ca.cacTang.B6_6SO.ketLuan !== 'DUNG_HOI') {
      if (tB66.ketLuan !== ca.cacTang.B6_6SO.ketLuan) t2Sai += 1;
    }
  }

  // Minh bạch dữ liệu đặc thù ở BC-02 & BC-03
  const rBC02 = await M.phanLoaiTheoTrinhTu({ tenHang: caTheoId('BC-02').tenHang });
  const tr392490 = rBC02.cacTang
    .find((t) => t.tang === 'B1')
    .trich.find((x) => x.tep === 'data/wco-op/opinions.json' && x.khoa === '392490/4.text');
  kiem('BC-02: giữ cờ headingSuspect: true trên trích WCO 392490/4', tr392490?.headingSuspect === true);
  kiem(
    'BC-02: canhBaoDuLieu ghi nhận WCO_HEADING_SUSPECT',
    rBC02.canhBaoDuLieu.some((w) => w.loai === 'WCO_HEADING_SUSPECT'),
  );
  kiem(
    'BC-02: B1 dùng 39.chuong thay vì 39.phan bị lỗi Phần VI',
    rBC02.cacTang.find((t) => t.tang === 'B1').trich.some((x) => x.khoa === '39.chuong'),
  );

  const rBC03 = await M.phanLoaiTheoTrinhTu({ tenHang: caTheoId('BC-03').tenHang });
  kiem(
    'BC-03: canhBaoDuLieu ghi nhận CHUA_SO_HOA cho phân nhóm 6402.20',
    rBC03.canhBaoDuLieu.some((w) => w.loai === 'CHUA_SO_HOA' && w.ma === '640220'),
  );
  kiem('Thang đo ADR-0004 §4: sai = 0 ở T1, T2, T3 trên bộ chuẩn', t1Sai === 0 && t2Sai === 0 && t3Sai === 0);

  // 3) 6+ ca phản chứng boSung thực (đổi dữ kiện -> đổi kết quả đúng luật)
  const r01Nguoi = await M.phanLoaiTheoTrinhTu({ tenHang: caTheoId('BC-01').tenHang, boSung: { mayMeChoNguoi: true } });
  kiemTraKetQuaHopLe('PC-01a (choNguoi:true)', r01Nguoi);
  kiem('PC-01a: BC-01 + mayMeChoNguoi:true -> CHOT 84313120', r01Nguoi.ketQua.trangThai === 'CHOT' && r01Nguoi.ketQua.ma === '84313120');

  const r01Hang = await M.phanLoaiTheoTrinhTu({ tenHang: caTheoId('BC-01').tenHang, boSung: { mayMeChoNguoi: false } });
  kiemTraKetQuaHopLe('PC-01b (choNguoi:false)', r01Hang);
  kiem('PC-01b: BC-01 + mayMeChoNguoi:false -> CHOT 84313110', r01Hang.ketQua.trangThai === 'CHOT' && r01Hang.ketQua.ma === '84313110');

  const r02Van = await M.phanLoaiTheoTrinhTu({ tenHang: caTheoId('BC-02').tenHang, boSung: { coVan: true } });
  kiemTraKetQuaHopLe('PC-02 (coVan:true)', r02Van);
  kiem(
    'PC-02: BC-02 + coVan:true -> Chú giải 2(s) Ch.39 loại sang 8481 (8481.80, không còn 39249090)',
    nhomTuKetQua(r02Van) === '8481'
      && r02Van.ketQua.phanNhom === '848180'
      && r02Van.ketQua.ma !== '39249090'
      && r02Van.cacTang.find((t) => t.tang === 'B1').trich.some((x) => x.khoa === '39.chuong'),
  );

  const r03Chot = await M.phanLoaiTheoTrinhTu({ tenHang: caTheoId('BC-03').tenHang, boSung: { coChotCai: true } });
  kiemTraKetQuaHopLe('PC-03a (coChotCai:true)', r03Chot);
  kiem('PC-03a: BC-03 + coChotCai:true -> CHOT 64022000', r03Chot.ketQua.trangThai === 'CHOT' && r03Chot.ketQua.ma === '64022000');

  const r03KhongMuiHoi = await M.phanLoaiTheoTrinhTu({ tenHang: caTheoId('BC-03').tenHang, boSung: { coChotCai: false } });
  kiemTraKetQuaHopLe('PC-03b-hoi (coChotCai:false, thiếu mũi)', r03KhongMuiHoi);
  kiem(
    'PC-03b-hoi: BC-03 + coChotCai:false (thiếu muiBaoVe) -> DUNG_HOI ở 6402.99',
    r03KhongMuiHoi.ketQua.trangThai === 'DUNG_HOI' && r03KhongMuiHoi.ketQua.phanNhom === '640299',
  );

  const r03KhongChot = await M.phanLoaiTheoTrinhTu({ tenHang: caTheoId('BC-03').tenHang, boSung: { coChotCai: false, muiBaoVe: false } });
  kiemTraKetQuaHopLe('PC-03b (coChotCai:false, muiBaoVe:false)', r03KhongChot);
  kiem('PC-03b: BC-03 + coChotCai:false, muiBaoVe:false -> CHOT 64029990', r03KhongChot.ketQua.trangThai === 'CHOT' && r03KhongChot.ketQua.ma === '64029990');

  const r04Quay = await M.phanLoaiTheoTrinhTu({ tenHang: caTheoId('BC-04').tenHang, boSung: { trucQuay: true, dungChoXeChuong87: false } });
  kiemTraKetQuaHopLe('PC-04a (trucQuay:true)', r04Quay);
  kiem('PC-04a: BC-04 + trucQuay:true (ngoài xe Ch.87) -> CHOT 84833090', r04Quay.ketQua.trangThai === 'CHOT' && r04Quay.ketQua.ma === '84833090');

  const r04Tinh = await M.phanLoaiTheoTrinhTu({ tenHang: caTheoId('BC-04').tenHang, boSung: { trucQuay: false, phanNhomMayMe: '843041' } });
  kiemTraKetQuaHopLe('PC-04b (trucQuay:false, 843041)', r04Tinh);
  kiem('PC-04b: BC-04 + trucQuay:false, 843041 -> CHOT 84314300', r04Tinh.ketQua.trangThai === 'CHOT' && r04Tinh.ketQua.ma === '84314300');

  const r05Phat15k = await M.phanLoaiTheoTrinhTu({ tenHang: caTheoId('BC-05').tenHang, boSung: { loaiMayMe: 'may_phat_dien', congSuatKva: 15000 } });
  kiemTraKetQuaHopLe('PC-05a (may_phat_dien, 15000 kVA)', r05Phat15k);
  kiem('PC-05a: BC-05 + máy phát 15000 kVA -> CHOT 85030020', r05Phat15k.ketQua.trangThai === 'CHOT' && r05Phat15k.ketQua.ma === '85030020');

  const r05PhatThieuKva = await M.phanLoaiTheoTrinhTu({ tenHang: caTheoId('BC-05').tenHang, boSung: { loaiMayMe: 'may_phat_dien' } });
  kiemTraKetQuaHopLe('PC-05b (may_phat_dien thiếu kVA)', r05PhatThieuKva);
  kiem(
    'PC-05b: BC-05 + máy phát thiếu kVA -> DUNG_HOI (85030020 vs 85030090)',
    r05PhatThieuKva.ketQua.trangThai === 'DUNG_HOI'
      && r05PhatThieuKva.ketQua.maUngVien.includes('85030020')
      && r05PhatThieuKva.ketQua.maUngVien.includes('85030090'),
  );

  const r05KhongRoMay = await M.phanLoaiTheoTrinhTu({ tenHang: 'Giá đỡ chổi than dùng cho máy công nghiệp', boSung: { nhomMayMe: null } });
  kiemTraKetQuaHopLe('PC-05c (nhomMayMe:null)', r05KhongRoMay);
  kiem(
    'PC-05c: nhomMayMe:null -> DUNG_HOI',
    r05KhongRoMay.ketQua.trangThai === 'DUNG_HOI' && r05KhongRoMay.ketQua.ma === null,
  );

  const r06BotKho = await M.phanLoaiTheoTrinhTu({
    tenHang: caTheoId('BC-06').tenHang,
    boSung: { trangThaiVatLy: 'bot_kho_khong_pha_chat_mau', cauTrucLop: false },
  });
  kiemTraKetQuaHopLe('PC-06 (bot_kho, cauTrucLop:false)', r06BotKho);
  kiem(
    'PC-06: BC-06 + bột khô không cấu trúc lớp -> giữ Chương 76 (CHOT 76031000, không loại về 3212)',
    r06BotKho.ketQua.trangThai === 'CHOT' && r06BotKho.ketQua.nhom === '7603' && r06BotKho.ketQua.ma === '76031000',
  );

  // Ca Phần XV / Chương 73 thực: Lò xo thép dùng cho máy công nghiệp (CG 1(g) -> 7320) phải soát đủ CG 1(f) Phần XV & CG 2 Phần XVI
  const r7320 = await M.phanLoaiTheoTrinhTu({ tenHang: 'Lò xo cuộn bằng thép dùng cho máy công nghiệp', boSung: { nhomMayMe: '8428' } });
  kiemTraKetQuaHopLe('PC-Ch73 (lò xo thép -> 7320)', r7320);
  kiem(
    'PC-Ch73: Chương 73 có đủ trích Chú giải 1(f) Phần XV & Chú giải 2 Phần XVI và qua cổng SOAT_LOAI_TRU_PHAN_XV_XVI',
    nhomTuKetQua(r7320) === '7320' && r7320.congKiemDinhADR0004.daKiem.includes('SOAT_LOAI_TRU_PHAN_XV_XVI'),
  );
  kiem(
    'PC-Ch73: B1 trích 84.phan Note 2 đầy đủ cả (a), (b), (c) không bị cắt cụt 211 ký tự',
    r7320.cacTang.find((t) => t.tang === 'B1').trich.some((x) => x.khoa === '84.phan' && /\(a\)/.test(x.nguyenVan) && /\(b\)/.test(x.nguyenVan) && /\(c\)/.test(x.nguyenVan)),
  );
  kiem(
    'PC-Ch73: B6_6SO.trich không rò rỉ 640220 / 640299',
    !r7320.cacTang.find((t) => t.tang === 'B6_6SO').trich.some((x) => x.khoa === '640220' || x.khoa === '640299'),
  );

  // 3b) Toàn bộ ca đối kháng chống hardcode & rò rỉ (audit #1636 Việc 4)
  const r01Para = await M.phanLoaiTheoTrinhTu({ tenHang: 'Con lăn dùng cho thang máy tải hàng, thép' });
  kiemTraKetQuaHopLe('DK-01 (paraphrase BC-01 thang máy tải hàng)', r01Para);
  kiem(
    'DK-01: "Con lăn dùng cho thang máy tải hàng, thép" vào 8431.31 (không rơi sang 84314990, không rò 640220)',
    r01Para.ketQua.nhom === '8431'
      && r01Para.ketQua.phanNhom === '843131'
      && r01Para.ketQua.maUngVien.includes('84313110')
      && r01Para.ketQua.maUngVien.includes('84313120')
      && !r01Para.cacTang.find((t) => t.tang === 'B6_6SO').trich.some((x) => x.khoa === '640220'),
  );

  const rBacTrucVanThang = await M.phanLoaiTheoTrinhTu({ tenHang: 'Bạc trục dùng cho vận thăng' });
  kiemTraKetQuaHopLe('DK-02 (Bạc trục vận thăng)', rBacTrucVanThang);
  kiem(
    'DK-02: "Bạc trục dùng cho vận thăng" KHÔNG gán cứng 84314300, ứng viên 84833090 vs 84313110/20',
    !rBacTrucVanThang.ketQua.maUngVien.includes('84314300')
      && rBacTrucVanThang.ketQua.maUngVien.includes('84313110')
      && rBacTrucVanThang.ketQua.maUngVien.includes('84833090'),
  );

  const r04KhongPn = await M.phanLoaiTheoTrinhTu({ tenHang: caTheoId('BC-04').tenHang, boSung: { trucQuay: false } });
  kiemTraKetQuaHopLe('DK-03 (BC-04 trucQuay:false thiếu phanNhomMayMe)', r04KhongPn);
  kiem(
    'DK-03: thiếu phanNhomMayMe thì DUNG_HOI giữa 84314300 và 843149xx (không tự đoán 843049)',
    r04KhongPn.ketQua.trangThai === 'DUNG_HOI' && r04KhongPn.ketQua.ma === null && r04KhongPn.ketQua.maUngVien.includes('84314300'),
  );
  kiem(
    'DK-04: r04Tinh (843143) chỉ trích phân nhóm cùng cấp 2 gạch 84314x, KHÔNG trộn 1 gạch 843110/843120',
    !r04Tinh.cacTang.find((t) => t.tang === 'B6_6SO').trich.some((x) => x.khoa === '843110' || x.khoa === '843120'),
  );

  const rInox = await M.phanLoaiTheoTrinhTu({ tenHang: 'Đầu sen tắm bằng inox' });
  kiemTraKetQuaHopLe('DK-05 (Đầu sen inox)', rInox);
  kiem('DK-05: Đầu sen inox vào 7324 (tuyệt đối không vào 3924 plastic)', nhomTuKetQua(rInox) === '7324');

  const rDongSen = await M.phanLoaiTheoTrinhTu({ tenHang: 'Đầu sen tắm bằng đồng mạ crom' });
  kiemTraKetQuaHopLe('DK-06 (Đầu sen đồng mạ crom)', rDongSen);
  kiem('DK-06: Đầu sen đồng mạ crom vào 7418 (tuyệt đối không vào 3924 plastic)', nhomTuKetQua(rDongSen) === '7418');

  const rSenChuaRo = await M.phanLoaiTheoTrinhTu({ tenHang: 'Đầu sen tắm' });
  kiemTraKetQuaHopLe('DK-07 (Đầu sen tắm chưa nêu chất liệu)', rSenChuaRo);
  kiem(
    'DK-07: Đầu sen chưa nêu chất liệu phải DUNG_HOI hỏi chất liệu',
    rSenChuaRo.ketQua.trangThai === 'DUNG_HOI' && rSenChuaRo.ketQua.nhomUngVien.includes('3924') && rSenChuaRo.ketQua.nhomUngVien.includes('7324'),
  );

  const rDepDa = await M.phanLoaiTheoTrinhTu({ tenHang: 'Dép da đi trong nhà' });
  kiemTraKetQuaHopLe('DK-08 (Dép da đi trong nhà)', rDepDa);
  kiem(
    'DK-08: Dép da đi trong nhà xét 6403/6405, không rơi vào 6402',
    rDepDa.ketQua.trangThai === 'DUNG_HOI' && rDepDa.ketQua.nhomUngVien.includes('6403') && !rDepDa.ketQua.nhomUngVien.includes('6402'),
  );

  const rGiayMua = await M.phanLoaiTheoTrinhTu({ tenHang: 'Giày nhựa đi mưa' });
  kiemTraKetQuaHopLe('DK-09 (Giày nhựa đi mưa)', rGiayMua);
  kiem(
    'DK-09: Giày nhựa đi mưa DUNG_HOI ranh giới 6401 vs 6402',
    rGiayMua.ketQua.trangThai === 'DUNG_HOI' && rGiayMua.ketQua.nhomUngVien.includes('6401') && rGiayMua.ketQua.nhomUngVien.includes('6402'),
  );

  const rBotDong = await M.phanLoaiTheoTrinhTu({ tenHang: 'Bột đồng khô không pha chất màu' });
  kiemTraKetQuaHopLe('DK-10 (Bột đồng khô không pha chất màu)', rBotDong);
  kiem(
    'DK-10: Bột đồng khô không pha chất màu vào 7406 (không nhầm 7603 nhôm hay 3212)',
    nhomTuKetQua(rBotDong) === '7406' && rBotDong.ketQua.maUngVien.includes('74061000'),
  );

  const rVayPhaoHoa = await M.phanLoaiTheoTrinhTu({ tenHang: 'Bột nhôm vảy khô dùng làm pháo hoa' });
  kiemTraKetQuaHopLe('DK-11 (Bột nhôm vảy khô pháo hoa)', rVayPhaoHoa);
  kiem(
    'DK-11: Bột nhôm vảy khô pháo hoa giữ Chương 76 (CHOT 76032010)',
    rVayPhaoHoa.ketQua.trangThai === 'CHOT' && rVayPhaoHoa.ketQua.ma === '76032010',
  );

  const rNhaoDungMoiSon = await M.phanLoaiTheoTrinhTu({ tenHang: 'Bột nhôm dạng nhão dung môi sản xuất sơn' });
  kiemTraKetQuaHopLe('DK-12 (Bột nhôm dạng nhão dung môi sản xuất sơn)', rNhaoDungMoiSon);
  kiem('DK-12: Bột nhôm dạng nhão dung môi sản xuất sơn -> CHOT 32129011', rNhaoDungMoiSon.ketQua.trangThai === 'CHOT' && rNhaoDungMoiSon.ketQua.ma === '32129011');

  const rVaySon = await M.phanLoaiTheoTrinhTu({ tenHang: 'Vảy nhôm dùng cho sản xuất sơn' });
  kiemTraKetQuaHopLe('DK-13 (Vảy nhôm dùng cho sản xuất sơn)', rVaySon);
  kiem(
    'DK-13: Vảy nhôm sản xuất sơn vào 3212.90 và hỏi đúng ứng viên 32129011/14/19',
    rVaySon.ketQua.nhom === '3212' && rVaySon.ketQua.phanNhom === '321290' && rVaySon.ketQua.maUngVien.includes('32129011'),
  );

  // 3c) Ca tổng quát đi thông 5 tầng qua D.bangCanh() + timNhomQuaDoThi
  const rVit = await M.phanLoaiTheoTrinhTu({ tenHang: 'Vít thép đầu lục giác dùng cho máy nén khí' });
  kiemTraKetQuaHopLe('TQ-01 (Vít thép 7318)', rVit);
  kiem(
    'TQ-01: Vít thép 7318 câu hỏi đúng ngữ cảnh vít/bu lông (KHÔNG hỏi "Ống thép"), không rò 640220',
    nhomTuKetQua(rVit) === '7318'
      && !/ống thép/i.test(rVit.ketQua.cauHoi || '')
      && !rVit.cacTang.find((t) => t.tang === 'B6_6SO').trich.some((x) => x.khoa === '640220'),
  );

  const rBienAp = await M.phanLoaiTheoTrinhTu({ tenHang: 'Máy biến áp khô công suất 500 kVA' });
  kiemTraKetQuaHopLe('TQ-02 (Máy biến áp khô 500 kVA)', rBienAp);
  kiem('TQ-02: Máy biến áp khô 500 kVA vào đúng 8504.33', rBienAp.ketQua.nhom === '8504' && rBienAp.ketQua.phanNhom === '850433');

  const rCapDong = await M.phanLoaiTheoTrinhTu({ tenHang: 'Cáp đồng bọc nhựa PVC cách điện điện áp 80V' });
  kiemTraKetQuaHopLe('TQ-03 (Cáp đồng 80V)', rCapDong);
  kiem('TQ-03: Cáp đồng cách điện 80V vào 8544', nhomTuKetQua(rCapDong) === '8544');

  const rBanGo = await M.phanLoaiTheoTrinhTu({ tenHang: 'Bàn gỗ văn phòng' });
  kiemTraKetQuaHopLe('TQ-04 (Bàn gỗ văn phòng)', rBanGo);
  kiem('TQ-04: Bàn gỗ văn phòng -> CHOT 94033000', rBanGo.ketQua.trangThai === 'CHOT' && rBanGo.ketQua.ma === '94033000');

  const rMelamin = await M.phanLoaiTheoTrinhTu({ tenHang: 'Bộ đồ ăn bằng nhựa melamin' });
  kiemTraKetQuaHopLe('TQ-05 (Bộ đồ ăn melamin)', rMelamin);
  kiem(
    'TQ-05: Bộ đồ ăn melamin vào 3924.10 và hỏi 39241010 vs 39241099',
    rMelamin.ketQua.nhom === '3924' && rMelamin.ketQua.phanNhom === '392410' && rMelamin.ketQua.maUngVien.includes('39241010'),
  );

  const rOngThep = await M.phanLoaiTheoTrinhTu({ tenHang: 'Ống thép không gỉ' });
  kiemTraKetQuaHopLe('TQ-06 (Ống thép không gỉ)', rOngThep);
  kiem(
    'TQ-06: Ống thép không gỉ DUNG_HOI [7304, 7306] với nhánh thép không gỉ 730441/730640',
    rOngThep.ketQua.trangThai === 'DUNG_HOI'
      && rOngThep.ketQua.nhomUngVien.includes('7304')
      && rOngThep.ketQua.nhomUngVien.includes('7306')
      && rOngThep.ketQua.maUngVien.includes('73064090'),
  );

  // 4) Nhánh B2_B5 hoạt động thật (chỉ chạy khi B1 không chốt được duy nhất 1 nhóm)
  const rB25 = await M.phanLoaiTheoTrinhTu({
    tenHang: 'Bộ đồ dùng đóng gói bán lẻ gồm khay nhựa gia dụng và giá treo bằng sắt',
    boSung: { nhomGoiY: ['3924', '7324'], boBanLe: true, dacTinhCoBan: 'khay nhựa gia dụng 39.24' },
  });
  kiemTraKetQuaHopLe('B2_B5 (GIR 3b bộ bán lẻ)', rB25);
  const tB25 = rB25.cacTang.find((t) => t.tang === 'B2_B5');
  kiem(
    'B2_B5 kích hoạt GIR 3(b) khi B1 CHUA_CHOT_B1 và ghi rõ lyDo',
    tB25.trangThai === 'CHOT' && /GIR 3\(b\)/.test(tB25.quyTac) && typeof tB25.lyDo === 'string' && tB25.lyDo.length >= 10,
  );

  // 5) Ca phủ định cho đủ 7 cổng báo đỏ của kiemDinhADR0004 (ADR-0004 §3)
  const clone = (o) => JSON.parse(JSON.stringify(o));

  // Cổng 1: Tầng không kèm trích dẫn / nhảy cóc tầng
  const g1 = clone(r01Nguoi);
  g1.cacTang.find((t) => t.tang === 'B1').trich = [];
  const k1 = M.kiemDinhADR0004(g1);
  kiem('Cổng 1 ADR-0004: bắt lỗi tầng hoạt động thiếu trích dẫn', !k1.dat && k1.viPham.some((v) => v.ma === 'TRICH_VA_QUY_TAC_B1'));

  const g1Jump = clone(r01Nguoi);
  g1Jump.cacTang = g1Jump.cacTang.filter((t) => t.tang !== 'B0');
  const k1Jump = M.kiemDinhADR0004(g1Jump);
  kiem('Cổng 1b ADR-0004: bắt lỗi nhảy cóc tầng B0', !k1Jump.dat && k1Jump.viPham.some((v) => v.ma === 'KHONG_NHAY_COC_TANG'));

  // Cổng 2: Viện dẫn QT3 trong khi B1 đã chốt
  const g2 = clone(r01Nguoi);
  const t2 = g2.cacTang.find((t) => t.tang === 'B2_B5');
  t2.trangThai = 'CHOT';
  t2.ketLuan = '8431';
  t2.quyTac = 'GIR 3(a)';
  t2.trich = g2.cacTang.find((t) => t.tang === 'B1').trich;
  const k2 = M.kiemDinhADR0004(g2);
  kiem('Cổng 2 ADR-0004: bắt lỗi viện dẫn QT3 khi B1 đã quyết', !k2.dat && k2.viPham.some((v) => v.ma === 'KHONG_VIEN_DAN_QT3_KHI_B1_DA_QUYET'));

  // Cổng 3: Dùng tiền lệ quyết mã hoặc chạy tiền lệ trước B6_8SO
  const g3 = clone(r01Nguoi);
  g3.kiemChungTienLe.anhHuongChotMa = true;
  const k3 = M.kiemDinhADR0004(g3);
  kiem('Cổng 3 ADR-0004: bắt lỗi dùng tiền lệ quyết mã', !k3.dat && k3.viPham.some((v) => v.ma === 'TIEN_LE_CHI_KIEM_CHUNG_CUOI'));

  // Cổng 4: Mã thuộc Phần XV / Chương 73 mà thiếu trích dẫn thật Chú giải 1(f) Phần XV & 84/85.phan trong B1.trich (kể cả khi quyTac có nhắc chữ)
  const g4 = clone(r7320);
  g4.vetXet.find((v) => v.buoc === 'B1').daSoat.chuGiai1fPhanXV = false;
  g4.vetXet.find((v) => v.buoc === 'B1').daSoat.chuGiai2PhanXVI = false;
  const k4 = M.kiemDinhADR0004(g4);
  kiem(
    'Cổng 4 ADR-0004: bắt lỗi mã Phần XV / Chương 73 thiếu soát Chú giải 1(f) Phần XV & Chú giải 2 Phần XVI',
    !k4.dat && k4.viPham.some((v) => v.ma === 'SOAT_LOAI_TRU_PHAN_XV_XVI'),
  );

  const g4Strip = clone(r06BotKho);
  const b1Strip = g4Strip.cacTang.find((t) => t.tang === 'B1');
  b1Strip.trich = b1Strip.trich.filter((tr) => !/^(84|85)\.phan$/.test(tr.khoa));
  const k4Strip = M.kiemDinhADR0004(g4Strip);
  kiem(
    'Cổng 4b ADR-0004: xoá 84.phan khỏi B1.trich trên mã 7603 (dù quyTac vẫn nhắc Chú giải 2 Phần XVI) -> bắt buộc dat === false',
    !k4Strip.dat && k4Strip.viPham.some((v) => v.ma === 'SOAT_LOAI_TRU_PHAN_XV_XVI'),
  );

  // Cổng 5: Điều kiện đảo ngược vế "trừ / nhưng không" (KHOA_NGUOC_VE_TRU)
  const g5 = clone(r01Nguoi);
  g5.vetXet.find((v) => v.buoc === 'B6_6SO').coKhoaNguocVeTru = true;
  const k5 = M.kiemDinhADR0004(g5);
  kiem('Cổng 5 ADR-0004: bắt lỗi đảo ngược vế trừ (KHOA_NGUOC_VE_TRU)', !k5.dat && k5.viPham.some((v) => v.ma === 'KHONG_DAO_NGUOC_VE_TRU'));

  // Cổng 6: Điều kiện rộng hơn / hẹp hơn chữ luật, lệch chất liệu, hoặc trộn khác cấp gạch ngang
  const g6 = clone(r01Nguoi);
  g6.vetXet.find((v) => v.buoc === 'B0').mayChu = { khongRo: true, nhom: null, phanNhom: null, loai: null };
  const k6 = M.kiemDinhADR0004(g6);
  kiem(
    'Cổng 6 ADR-0004: bắt lỗi điều kiện rộng hơn chữ luật (chốt 84313120 nhưng thiếu máy chủ)',
    !k6.dat && k6.viPham.some((v) => v.ma === 'DIEU_KIEN_KHONG_LECH_CHU_LUAT'),
  );

  const g6Mix = clone(r04Tinh);
  const rTmp = await M.phanLoaiTheoTrinhTu({ tenHang: 'Bạc trục máy tời nâng', boSung: { nhomMayMe: '8425', trucQuay: false } });
  const tr843110 = rTmp.cacTang.find((t) => t.tang === 'B6_6SO').trich.find((x) => x.khoa === '843110');
  g6Mix.cacTang.find((t) => t.tang === 'B6_6SO').trich.push(tr843110);
  const k6Mix = M.kiemDinhADR0004(g6Mix);
  kiem(
    'Cổng 6a ADR-0004: trộn phân nhóm 1 gạch (843110) với 2 gạch (843143) -> bắt lỗi SO_SANH_CUNG_CAP_GACH',
    !k6Mix.dat && k6Mix.viPham.some((v) => v.ma === 'SO_SANH_CUNG_CAP_GACH'),
  );

  const g6Mat = clone(rBC02);
  g6Mat.vetXet.find((v) => v.buoc === 'B0').chatLieu = 'thép không gỉ';
  const k6Mat = M.kiemDinhADR0004(g6Mat);
  kiem(
    'Cổng 6b ADR-0004: chốt 39249090 khi chất liệu là thép không gỉ -> bắt lỗi DIEU_KIEN_KHONG_LECH_CHU_LUAT',
    !k6Mat.dat && k6Mat.viPham.some((v) => v.ma === 'DIEU_KIEN_KHONG_LECH_CHU_LUAT'),
  );

  // Cổng 7: Chốt mã khi thiếu dữ kiện hoặc rơi vào "Loại khác" khi chưa có đủ trích dẫn anh em cùng tầng
  const g7 = clone(r05Phat15k);
  g7.vetXet.find((v) => v.buoc === 'B6_8SO').khongTuRoiLoaiKhac = false;
  const k7 = M.kiemDinhADR0004(g7);
  kiem('Cổng 7 ADR-0004: bắt lỗi chốt mã khi thiếu dữ kiện / tự rơi Loại khác', !k7.dat && k7.viPham.some((v) => v.ma === 'CHOT_MA_DU_DU_KIEN'));

  const g7Sib = clone(rBC02);
  const b68Sib = g7Sib.cacTang.find((t) => t.tang === 'B6_8SO');
  b68Sib.trich = b68Sib.trich.filter((tr) => tr.khoa === '39249090.vn');
  const k7Sib = M.kiemDinhADR0004(g7Sib);
  kiem(
    'Cổng 7b ADR-0004: chốt 39249090 Loại khác nhưng xoá trích dẫn anh em cùng tầng -> bắt buộc dat === false',
    !k7Sib.dat && k7Sib.viPham.some((v) => v.ma === 'CHOT_MA_DU_DU_KIEN'),
  );

  // Kiểm tra bất biến hàm kiemDinhADR0004 từ bên ngoài với rỗng & 3 ca đối kháng phủ định mới
  assert.equal(M.kiemDinhADR0004(null).dat, false);

  const rKhongVan1 = await M.phanLoaiTheoTrinhTu({ tenHang: 'Đầu sen tắm bằng nhựa ABS không có van' }, { kiemChungTienLe: false });
  kiem('Phủ định không có van (ABS): giữ CHOT 39249090, không lật sang 8481', rKhongVan1.ketQua.trangThai === 'CHOT' && rKhongVan1.ketQua.ma === '39249090' && rKhongVan1.congKiemDinhADR0004.dat);

  const rKhongVan2 = await M.phanLoaiTheoTrinhTu({ tenHang: 'Bát sen tắm bằng nhựa PP không kèm van' }, { kiemChungTienLe: false });
  kiem('Phủ định không kèm van (PP): giữ CHOT 39249090, không lật sang 8481', rKhongVan2.ketQua.trangThai === 'CHOT' && rKhongVan2.ketQua.ma === '39249090' && rKhongVan2.congKiemDinhADR0004.dat);

  const rDongNonLam = await M.phanLoaiTheoTrinhTu({ tenHang: 'Bột đồng khô không có cấu trúc lớp không pha chất màu' }, { kiemChungTienLe: false });
  kiem('Phủ định không có cấu trúc lớp (7406): chốt 74061000, không lật sang 74062000', rDongNonLam.ketQua.trangThai === 'CHOT' && rDongNonLam.ketQua.ma === '74061000' && rDongNonLam.congKiemDinhADR0004.dat);

  const rNhomNonLam = await M.phanLoaiTheoTrinhTu({ tenHang: 'Bột nhôm non lamellar không pha chất màu' }, { kiemChungTienLe: false });
  kiem('Phủ định non lamellar (7603): chốt 76031000, không lật sang 760320', rNhomNonLam.ketQua.trangThai === 'CHOT' && rNhomNonLam.ketQua.ma === '76031000' && rNhomNonLam.congKiemDinhADR0004.dat);

  const rRong = await M.phanLoaiTheoTrinhTu({ tenHang: '' }, { kiemChungTienLe: false });
  kiem('Đầu vào rỗng: DUNG_HOI hợp lệ (hỏi tên hàng) và cổng ADR-0004 dat === true', rRong.ketQua.trangThai === 'DUNG_HOI' && rRong.ketQua.chiTietCauHoi?.khoa === 'tenHang' && rRong.congKiemDinhADR0004.dat);

  const rTuLa = await M.phanLoaiTheoTrinhTu({ tenHang: 'Abcdef' }, { kiemChungTienLe: false });
  kiem('Đầu vào 1 từ lạ không nhận diện: DUNG_HOI hợp lệ (hỏi mô tả chi tiết) và cổng ADR-0004 dat === true', rTuLa.ketQua.trangThai === 'DUNG_HOI' && rTuLa.ketQua.chiTietCauHoi?.khoa === 'moTaChiTiet' && rTuLa.congKiemDinhADR0004.dat);

  // 6) Kiểm tra cô lập đường khách (0 leak ngoài lib/do-thi/, 0 AI/HTTP, 0 cờ HS_*, 0 questionVi)
  const tepKhach = [
    ...tepMa('api'),
    ...tepMa('lib').filter((p) => !p.startsWith('lib/do-thi/')),
    'server.js',
  ];
  const roRi = tepKhach.filter((p) => {
    const bd = baoDong(p);
    return bd.has('lib/do-thi/bo-may-trinh-tu.js') || napTrucTiep(p).includes('lib/do-thi/bo-may-trinh-tu.js');
  });
  kiem('Cô lập đường khách: 0 tệp ngoài lib/do-thi/ nạp bo-may-trinh-tu.js', roRi.length === 0, roRi.join(', '));

  const maNguon = doc('lib/do-thi/bo-may-trinh-tu.js');
  kiem('0 gọi AI / HTTP / mạng trong bo-may-trinh-tu.js', !/(callLLM|\bfetch\s*\(|https?:\/\/)/.test(maNguon));
  kiem('0 cờ HS_* mới trong bo-may-trinh-tu.js', coTrongDoan(maNguon).size === 0);
  kiem('0 thuộc tính questionVi trong bo-may-trinh-tu.js', !/\bquestionVi\s*:/.test(maNguon));

  xong();
}

chay().catch((err) => {
  console.error(err);
  process.exit(1);
});
