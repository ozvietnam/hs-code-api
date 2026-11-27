#!/usr/bin/env node
// scripts/do-cua-vao.mjs — M-79 (#1971): Thước đo cửa vào — mã đúng có trong danh sách ứng viên hay không.
//
// Nguyên tắc (ADR-0006, #1971):
// - Chỉ dựng thước đo, chưa chạy đo lớn; hỗ trợ nạp bộ đo ngoài (--bo <tep.json>) cho 10 mặt hàng CEO + hàng QT.
// - CẤM dùng tờ khai, dữ liệu khách hay tiền lệ (tb:) làm đáp án; mọi ca đo phải ghi căn cứ luật (canCuLuat) tồn tại thật trong data/luat-goc.
// - Tách rạch ròi chiều NHAC (ứng viên dương) và LOAI (loại trừ): nút chỉ xuất hiện ở chiều LOAI KHÔNG được tính là trúng ứng viên.
// - Chạy thật cửa vào M-41 (lib/tim-luat.js); mở sẵn chỗ cắm cho M-37 (timNghia) và M-52 (loc), mặc định CHUA_CAM.
// - Kiểu ca CAP (cặp tranh chấp, biên bản QT 26/11): ca có `nhomCanCo` (≥2 nhóm 4 số) — ĐẠT khi MỌI nhóm
//   trong cặp có mặt ở chiều NHAC Top-20. Không có "đáp án đúng", chỉ đo cửa vào có đưa đủ các nhóm cần so không.
// - CLI `--m37`: cắm thật lib/chi-muc-luat.js timNghia (M-37, bất đồng bộ). Chỉ mục data/luat-goc/chi-muc
//   nay dựng ở CI (#2030, .github/workflows/chi-muc.yml) — khi thiếu/cũ thì kênh báo THIEU_CHI_MUC, không lỗi.
// - Tất định, không mạng, không AI.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THU_MUC_LUAT_MAC_DINH = path.join(GOC, 'data', 'luat-goc');
const KHO_LUAT_GOC = ['phan', 'chuong', 'bieu', 'nhom', 'phan-nhom', 'sen'];

const { timLuat } = require(path.join(GOC, 'lib', 'tim-luat.js'));

const RE_CAM_NGUON_KHACH = /(?:^|[\s:/_-])(?:tb:|to[_ -]?khai|tờ\s*khai|oz-export|khach[_ -]?hang|khách\s*hàng)/iu;

/**
 * Bộ thử nhỏ dựng thước từ nguyên văn data/luat-goc (KHÔNG phải 10 mặt hàng CEO, KHÔNG chứa tờ khai/dữ liệu khách).
 * Dùng để kiểm thước hoạt động và minh hoạ 4 nhóm hiện tượng: khớp thẳng, bẫy phủ định/loại trừ, mù từ đồng nghĩa (chờ M-37), và ca ngược.
 */
export const BO_THU_LUAT_MAU = Object.freeze([
  // --- Ca thuận: cụm từ xuất hiện trực tiếp trong 6 kho luật gốc ---
  {
    id: 'luat-01-binh-nhom',
    loaiCa: 'THUAN',
    nhomHienTuong: 'KHOP_THANG',
    moTa: 'bình chứa bằng nhôm',
    nhomDung: '7611',
    phanNhomDung: '761100',
    canCuLuat: ['bieu:7611'],
    ghiChu: 'Tên nhóm 76.11 và 76.12 trong biểu thuế (phân biệt theo dung tích > / <= 300 lít).',
  },
  {
    id: 'luat-02-la-nhom-mong',
    loaiCa: 'THUAN',
    nhomHienTuong: 'KHOP_THANG',
    moTa: 'lá nhôm mỏng',
    nhomDung: '7607',
    phanNhomDung: null,
    canCuLuat: ['bieu:7607'],
    ghiChu: 'Nhóm 76.07: lá nhôm mỏng chiều dày không quá 0,2 mm.',
  },
  {
    id: 'luat-03-day-nhom',
    loaiCa: 'THUAN',
    nhomHienTuong: 'KHOP_THANG',
    moTa: 'dây nhôm',
    nhomDung: '7605',
    phanNhomDung: null,
    canCuLuat: ['bieu:7605'],
    ghiChu: 'Nhóm 76.05: dây nhôm.',
  },
  {
    id: 'luat-04-bu-long',
    loaiCa: 'THUAN',
    nhomHienTuong: 'KHOP_THANG',
    moTa: 'bu lông',
    nhomDung: '7318',
    phanNhomDung: null,
    canCuLuat: ['bieu:7318'],
    ghiChu: 'Nhóm 73.18 và Chú giải Phần XV: bu lông bằng sắt/thép.',
  },
  // --- Ca thuận có nhiễu phủ định / loại trừ ở đầu danh sách ---
  {
    id: 'luat-05-day-cap-cach-dien',
    loaiCa: 'THUAN',
    nhomHienTuong: 'BAY_PHU_DINH',
    moTa: 'dây cáp điện cách điện',
    nhomDung: '8544',
    phanNhomDung: null,
    canCuLuat: ['bieu:8544'],
    ghiChu: 'Nhóm 85.44; dễ bị 73.12 / 74.13 / 76.14 ("chưa cách điện") chen lên trên khi chỉ khớp chữ.',
  },
  {
    id: 'luat-06-nha-lap-ghep',
    loaiCa: 'THUAN',
    nhomHienTuong: 'BAY_LOAI_TRU',
    moTa: 'nhà lắp ghép',
    nhomDung: '9406',
    phanNhomDung: null,
    canCuLuat: ['bieu:9406'],
    ghiChu: 'Nhóm 94.06; nhiều chú giải loại trừ ("trừ nhà lắp ghép thuộc nhóm 94.06") chiếm vị trí đầu.',
  },
  // --- Ca thuận ngoài từ vựng nguyên văn luật (đo khoảng trống cần M-37 tìm nghĩa) ---
  {
    id: 'luat-07-may-bom-ly-tam',
    loaiCa: 'THUAN',
    nhomHienTuong: 'MU_TU_VUNG',
    moTa: 'máy bơm ly tâm',
    nhomDung: '8413',
    phanNhomDung: '841370',
    canCuLuat: ['bieu:8413', 'bieu:841370'],
    ghiChu: 'Nhóm 84.13 / 8413.70 ("bơm ly tâm khác"); từ "máy bơm ly tâm" lệch cụm chữ biểu thuế.',
  },
  {
    id: 'luat-08-thang-may-cho-nguoi',
    loaiCa: 'THUAN',
    nhomHienTuong: 'MU_TU_VUNG',
    moTa: 'thang máy chở người',
    nhomDung: '8428',
    phanNhomDung: '842810',
    canCuLuat: ['bieu:8428', 'bieu:842810'],
    ghiChu: 'Nhóm 84.28 / 8428.10 (thang máy chở người).',
  },
  {
    id: 'luat-09-vo-lon-nhom',
    loaiCa: 'THUAN',
    nhomHienTuong: 'MU_TU_VUNG',
    moTa: 'vỏ lon nước giải khát bằng nhôm',
    nhomDung: '7612',
    phanNhomDung: null,
    canCuLuat: ['bieu:7612'],
    ghiChu: 'Nhóm 76.12 (hộp/bình nhôm <= 300 lít); tên thông dụng không trùng chữ biểu thuế.',
  },
  {
    id: 'luat-10-ghe-xoay-van-phong',
    loaiCa: 'THUAN',
    nhomHienTuong: 'MU_TU_VUNG',
    moTa: 'ghế xoay văn phòng',
    nhomDung: '9401',
    phanNhomDung: null,
    canCuLuat: ['bieu:9401'],
    ghiChu: 'Nhóm 94.01 (ghế ngồi có thể điều chỉnh độ cao); cần tìm nghĩa M-37.',
  },
  // --- Ca CAP (cặp tranh chấp): không có "đáp án đúng", đạt khi MỌI nhóm trong cặp vào Top-20 NHAC ---
  {
    id: 'cap-01-may-tinh-bang-cam-ung',
    loaiCa: 'CAP',
    moTa: 'máy tính bảng có màn hình cảm ứng',
    nhomCanCo: ['8471', '8537'],
    canCuLuat: ['bieu:8471', 'bieu:8537'],
    ghiChu: 'Máy xử lý dữ liệu (84.71) so bảng điều khiển bằng điện (85.37); cửa vào phải đưa đủ cả hai nhóm để so.',
  },
  {
    id: 'cap-02-tu-dieu-khien-may-cong-cu',
    loaiCa: 'CAP',
    moTa: 'tủ điều khiển cho máy công cụ',
    nhomCanCo: ['8457', '8537'],
    canCuLuat: ['bieu:8457', 'bieu:8537'],
    ghiChu: 'Chú giải 84.57 (tủ điều khiển máy công cụ) cạnh 85.37; cặp tranh chấp điển hình.',
  },
  // --- Ca ngược: kiểm tra trung thực khi rỗng và không tính nhầm nút LOAI ---
  {
    id: 'nguoc-01-khong-ton-tai',
    loaiCa: 'NGUOC',
    kieuNguoc: 'RONG_KHONG_DOAN',
    moTa: 'vật thể hư cấu xyzzy 9999',
    nhomDung: null,
    phanNhomDung: null,
    canCuLuat: ['bieu:7611'],
    ghiChu: 'Cụm từ không tồn tại trong 6 kho luật gốc: cửa vào phải trả rỗng, không đoán bừa.',
  },
  {
    id: 'nguoc-02-ngan-qua',
    loaiCa: 'NGUOC',
    kieuNguoc: 'RONG_KHONG_DOAN',
    moTa: 'a',
    nhomDung: null,
    phanNhomDung: null,
    canCuLuat: ['bieu:7611'],
    ghiChu: 'Mô tả quá ngắn (< 2 ký tự chuẩn): cửa vào phải trả rỗng.',
  },
  {
    id: 'nguoc-03-cap-rong-tren-cap',
    loaiCa: 'NGUOC',
    kieuNguoc: 'RONG_KHONG_DOAN',
    moTa: 'vật thể hư cấu xyzzy cặp 9999',
    nhomCanCo: ['8471', '8537'],
    canCuLuat: ['bieu:8471', 'bieu:8537'],
    ghiChu: 'Cặp tranh chấp + mô tả vô nghĩa: cửa vào phải trả rỗng (không đưa đủ cặp một cách máy móc).',
  },
]);

/** Nạp tập toàn bộ ID nút thật trong 6 kho luật gốc để kiểm chứng canCuLuat. */
export function napTapNutLuat(thuMuc = THU_MUC_LUAT_MAC_DINH) {
  const dir = path.resolve(thuMuc || THU_MUC_LUAT_MAC_DINH);
  const ids = new Set();
  for (const kho of KHO_LUAT_GOC) {
    const tep = path.join(dir, `${kho}.jsonl`);
    if (!fs.existsSync(tep)) continue;
    for (const dong of fs.readFileSync(tep, 'utf8').split('\n')) {
      if (!dong.trim()) continue;
      try {
        const o = JSON.parse(dong);
        if (o && typeof o.id === 'string') ids.add(o.id);
      } catch {
        // Bỏ qua dòng hỏng (cổng kho luật gốc kiểm riêng)
      }
    }
  }
  return ids;
}

/** Rút mã nhóm 4 số / phân nhóm 6 số / mã 8 số từ ID nút luật (bieu:XXXX, nhom:XXXX:..., phan-nhom:XXXXXX:..., sen:XXXXXXXX:...). */
export function rutMaTuNut(nutId) {
  const s = String(nutId || '').trim();
  const m = /^(?:bieu|nhom|phan-nhom|sen):(\d{4,8})(?::|$)/.exec(s);
  if (!m) return { nhom4: null, phanNhom6: null, ma8: null };
  const so = m[1];
  return {
    nhom4: so.slice(0, 4),
    phanNhom6: so.length >= 6 ? so.slice(0, 6) : null,
    ma8: so.length === 8 ? so : null,
  };
}

/** Chuẩn hoá mã HS mục tiêu (chỉ giữ chữ số, cắt 4 hoặc 6 chữ số). */
export function chuanMa(raw, doDai) {
  if (raw === null || raw === undefined || raw === '') return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length < doDai) return null;
  return digits.slice(0, doDai);
}

/**
 * Kiểm tính hợp lệ & độ sạch của bộ đo:
 * - Bắt buộc có id, moTa, loaiCa ('THUAN' | 'NGUOC'), canCuLuat (mảng không rỗng các nút thật trong data/luat-goc).
 * - CẤM tuyệt đối bất kỳ dấu vết tờ khai / dữ liệu khách / tb: nào trong id, canCuLuat, ghiChu.
 */
export function kiemBoDo(boDo, { tapNutLuat = null, thuMuc = THU_MUC_LUAT_MAC_DINH } = {}) {
  const loi = [];
  if (!Array.isArray(boDo) || boDo.length === 0) {
    return { hopLe: false, loi: ['Bộ đo rỗng hoặc không phải mảng.'] };
  }
  const tap = tapNutLuat || napTapNutLuat(thuMuc);
  const daThayId = new Set();

  for (let i = 0; i < boDo.length; i += 1) {
    const ca = boDo[i];
    const nhan = ca && ca.id ? ca.id : `#${i + 1}`;
    if (!ca || typeof ca !== 'object') {
      loi.push(`${nhan}: bản ghi không phải đối tượng JSON.`);
      continue;
    }
    if (!ca.id || typeof ca.id !== 'string') {
      loi.push(`${nhan}: thiếu id dạng chuỗi.`);
    } else if (daThayId.has(ca.id)) {
      loi.push(`${nhan}: trùng id "${ca.id}".`);
    } else {
      daThayId.add(ca.id);
    }

    if (typeof ca.moTa !== 'string' || !ca.moTa.trim()) {
      loi.push(`${nhan}: thiếu moTa.`);
    }
    if (ca.loaiCa !== 'THUAN' && ca.loaiCa !== 'NGUOC' && ca.loaiCa !== 'CAP') {
      loi.push(`${nhan}: loaiCa phải là "THUAN", "NGUOC" hoặc "CAP".`);
    }

    // Chặn nguồn khách / tờ khai / tiền lệ
    const truongKiem = [ca.id, ca.ghiChu, ca.nguon, ...(Array.isArray(ca.canCuLuat) ? ca.canCuLuat : [])];
    for (const v of truongKiem) {
      if (typeof v === 'string' && RE_CAM_NGUON_KHACH.test(v)) {
        loi.push(`${nhan}: vi phạm cấm dữ liệu khách/tờ khai/tiền lệ ("${v.slice(0, 80)}").`);
      }
    }

    if (!Array.isArray(ca.canCuLuat) || ca.canCuLuat.length === 0) {
      loi.push(`${nhan}: thiếu canCuLuat (bắt buộc dẫn ít nhất 1 nút trong data/luat-goc).`);
    } else {
      for (const idNut of ca.canCuLuat) {
        if (typeof idNut !== 'string' || !tap.has(idNut)) {
          loi.push(`${nhan}: canCuLuat "${idNut}" không tồn tại trong 6 kho data/luat-goc.`);
        }
      }
    }

    if (ca.loaiCa === 'THUAN') {
      if (!chuanMa(ca.nhomDung, 4)) {
        loi.push(`${nhan}: ca THUAN bắt buộc có nhomDung 4 chữ số hợp lệ.`);
      }
      if (ca.phanNhomDung !== null && ca.phanNhomDung !== undefined && !chuanMa(ca.phanNhomDung, 6)) {
        loi.push(`${nhan}: phanNhomDung "${ca.phanNhomDung}" không đủ 6 chữ số.`);
      }
    }

    if (ca.loaiCa === 'CAP') {
      if (!Array.isArray(ca.nhomCanCo) || ca.nhomCanCo.length < 2) {
        loi.push(`${nhan}: ca CAP bắt buộc có nhomCanCo ≥ 2 nhóm 4 số.`);
      } else {
        const daCo = new Set();
        for (const g of ca.nhomCanCo) {
          const ma = chuanMa(g, 4);
          if (!ma || String(g).length !== 4) {
            loi.push(`${nhan}: nhomCanCo "${g}" không phải nhóm 4 chữ số.`);
          } else if (daCo.has(ma)) {
            loi.push(`${nhan}: nhomCanCo trùng nhóm "${ma}".`);
          } else {
            daCo.add(ma);
            if (!Array.isArray(ca.canCuLuat) || !ca.canCuLuat.includes(`bieu:${ma}`)) {
              loi.push(`${nhan}: ca CAP phải dẫn canCuLuat gồm "bieu:${ma}" (mỗi nhóm trong cặp).`);
            }
          }
        }
      }
    }
  }

  return { hopLe: loi.length === 0, loi };
}

/**
 * Chuẩn hoá danh sách ứng viên trả về từ một cửa vào thành danh sách đã gộp trùng theo cấp (nhom4 / phanNhom6)
 * trong khi tách rõ NHAC (dương) và LOAI (loại trừ).
 */
export function chuanHoaUngVien(dsRaw = []) {
  const nhac = [];
  const loai = [];
  const thayNhacNhom = new Set();
  const thayLoaiNhom = new Set();

  for (let i = 0; i < dsRaw.length; i += 1) {
    const item = dsRaw[i];
    if (!item) continue;
    const nut = item.nut || item.id || item.nutId || '';
    const chieu = item.chieu === 'LOAI' ? 'LOAI' : 'NHAC';
    const ma = rutMaTuNut(nut);
    const dong = {
      viTriGoc: i + 1,
      nut,
      chieu,
      nhom4: ma.nhom4 || chuanMa(item.nhom4 || item.hs4, 4),
      phanNhom6: ma.phanNhom6 || chuanMa(item.phanNhom6 || item.hs6, 6),
      ma8: ma.ma8 || chuanMa(item.ma8 || item.hs8, 8),
      cauId: item.cauId || null,
    };
    if (chieu === 'LOAI') {
      loai.push(dong);
      if (dong.nhom4) thayLoaiNhom.add(dong.nhom4);
    } else {
      nhac.push(dong);
      if (dong.nhom4) thayNhacNhom.add(dong.nhom4);
    }
  }

  // Xếp hạng nhóm 4 số duy nhất theo thứ tự xuất hiện đầu tiên ở chiều NHAC
  const xepHangNhom4Nhac = [];
  const daGhi4 = new Set();
  for (const d of nhac) {
    if (d.nhom4 && !daGhi4.has(d.nhom4)) {
      daGhi4.add(d.nhom4);
      xepHangNhom4Nhac.push(d.nhom4);
    }
  }

  const xepHangPhanNhom6Nhac = [];
  const daGhi6 = new Set();
  for (const d of nhac) {
    if (d.phanNhom6 && !daGhi6.has(d.phanNhom6)) {
      daGhi6.add(d.phanNhom6);
      xepHangPhanNhom6Nhac.push(d.phanNhom6);
    }
  }

  return {
    tongDong: dsRaw.length,
    soDongNhac: nhac.length,
    soDongLoai: loai.length,
    nhac,
    loai,
    xepHangNhom4Nhac,
    xepHangPhanNhom6Nhac,
    tapNhom4Loai: [...thayLoaiNhom],
  };
}

/** Chấm một ca đo trên một danh sách ứng viên đã chuẩn hoá. */
export function chamMotCa(ca, ungVien, { rong = false } = {}) {
  const nhomDung = chuanMa(ca.nhomDung, 4);
  const phanNhomDung = chuanMa(ca.phanNhomDung, 6);

  if (ca.loaiCa === 'NGUOC') {
    const kieu = ca.kieuNguoc || 'RONG_KHONG_DOAN';
    if (kieu === 'RONG_KHONG_DOAN') {
      const dat = rong === true && ungVien.tongDong === 0;
      return {
        id: ca.id,
        loaiCa: 'NGUOC',
        kieuNguoc: kieu,
        dat,
        rong,
        tongDong: ungVien.tongDong,
        lyDo: dat ? 'Trả rỗng trung thực, không đoán.' : `Phải trả rỗng nhưng lại ra ${ungVien.tongDong} dòng.`,
      };
    }
    if (kieu === 'KHONG_DEM_LOAI_LA_DUNG') {
      const coNhac = nhomDung ? ungVien.xepHangNhom4Nhac.includes(nhomDung) : false;
      const coLoai = nhomDung ? ungVien.tapNhom4Loai.includes(nhomDung) : false;
      const dat = !coNhac && coLoai;
      return {
        id: ca.id,
        loaiCa: 'NGUOC',
        kieuNguoc: kieu,
        dat,
        coNhac,
        coLoai,
        lyDo: dat
          ? 'Tách đúng chiều LOAI, không đếm nhầm thành ứng viên dương.'
          : `Mong đợi chỉ nằm ở LOAI (coNhac=${coNhac}, coLoai=${coLoai}).`,
      };
    }
  }

  // Ca CAP (cặp tranh chấp): ĐẠT khi MỌI nhóm trong nhomCanCo có mặt ở chiều NHAC Top-20.
  // Không có "đáp án đúng"; nút chỉ xuất hiện ở chiều LOAI không tính.
  if (ca.loaiCa === 'CAP') {
    const nhomCanCo = (ca.nhomCanCo || []).map((g) => chuanMa(g, 4)).filter(Boolean);
    const chiTietNhom = nhomCanCo.map((ma) => {
      const idx = ungVien.xepHangNhom4Nhac.indexOf(ma);
      const hang = idx >= 0 ? idx + 1 : null;
      return { nhom4: ma, hang, co: hang !== null && hang <= 20, chiOLoai: hang === null && ungVien.tapNhom4Loai.includes(ma) };
    });
    const dat = chiTietNhom.length >= 2 && chiTietNhom.every((g) => g.co);
    return {
      id: ca.id,
      loaiCa: 'CAP',
      moTa: ca.moTa,
      rong,
      tongDong: ungVien.tongDong,
      soDongNhac: ungVien.soDongNhac,
      soDongLoai: ungVien.soDongLoai,
      nhomCanCo: chiTietNhom,
      soNhomCo: chiTietNhom.filter((g) => g.co).length,
      dat,
      top20Nhom4: ungVien.xepHangNhom4Nhac.slice(0, 20),
    };
  }

  const idx4 = nhomDung ? ungVien.xepHangNhom4Nhac.indexOf(nhomDung) : -1;
  const hangNhom4 = idx4 >= 0 ? idx4 + 1 : null;
  const idx6 = phanNhomDung ? ungVien.xepHangPhanNhom6Nhac.indexOf(phanNhomDung) : -1;
  const hangPhanNhom6 = idx6 >= 0 ? idx6 + 1 : null;
  const chiXuatHienOLoai = Boolean(
    nhomDung && hangNhom4 === null && ungVien.tapNhom4Loai.includes(nhomDung)
  );

  return {
    id: ca.id,
    loaiCa: 'THUAN',
    nhomHienTuong: ca.nhomHienTuong || 'KHAC',
    moTa: ca.moTa,
    nhomDung,
    phanNhomDung,
    rong,
    tongDong: ungVien.tongDong,
    soDongNhac: ungVien.soDongNhac,
    soDongLoai: ungVien.soDongLoai,
    coNhom4: hangNhom4 !== null,
    hangNhom4,
    trongTop5: hangNhom4 !== null && hangNhom4 <= 5,
    trongTop10: hangNhom4 !== null && hangNhom4 <= 10,
    trongTop20: hangNhom4 !== null && hangNhom4 <= 20,
    coPhanNhom6: phanNhomDung ? hangPhanNhom6 !== null : null,
    hangPhanNhom6,
    chiXuatHienOLoai,
    top5Nhom4: ungVien.xepHangNhom4Nhac.slice(0, 5),
    top3Loai: ungVien.tapNhom4Loai.slice(0, 3),
  };
}

/** Tổng hợp chỉ số cho một kênh cửa vào. */
function tongHopKenh(ketQuaCa) {
  const thuan = ketQuaCa.filter((x) => x.loaiCa === 'THUAN');
  const nguoc = ketQuaCa.filter((x) => x.loaiCa === 'NGUOC');
  const cap = ketQuaCa.filter((x) => x.loaiCa === 'CAP');
  const coYeuCau6 = thuan.filter((x) => x.phanNhomDung);
  const dem = (arr, fn) => arr.filter(fn).length;
  const tiLe = (tu, mau) => (mau > 0 ? Number(((tu / mau) * 100).toFixed(1)) : null);

  return {
    tongCaThuan: thuan.length,
    trungNhom4: dem(thuan, (x) => x.coNhom4),
    tiLeTrungNhom4: tiLe(dem(thuan, (x) => x.coNhom4), thuan.length),
    trungTop5: dem(thuan, (x) => x.trongTop5),
    tiLeTop5: tiLe(dem(thuan, (x) => x.trongTop5), thuan.length),
    trungTop10: dem(thuan, (x) => x.trungTop10),
    tiLeTop10: tiLe(dem(thuan, (x) => x.trungTop10), thuan.length),
    trungTop20: dem(thuan, (x) => x.trungTop20),
    tiLeTop20: tiLe(dem(thuan, (x) => x.trungTop20), thuan.length),
    caRongTrenThuan: dem(thuan, (x) => x.rong),
    chiXuatHienOLoai: dem(thuan, (x) => x.chiXuatHienOLoai),
    soCaCoPhanNhom6: coYeuCau6.length,
    trungPhanNhom6: dem(coYeuCau6, (x) => x.coPhanNhom6 === true),
    tongCaCap: cap.length,
    capDat: dem(cap, (x) => x.dat),
    tiLeCapDat: tiLe(dem(cap, (x) => x.dat), cap.length),
    capTrungMotPhan: dem(cap, (x) => !x.dat && x.soNhomCo > 0),
    capKhongNhomNao: dem(cap, (x) => !x.dat && x.soNhomCo === 0 && !x.rong),
    tongCaNguoc: nguoc.length,
    caNguocDat: dem(nguoc, (x) => x.dat),
  };
}

/**
 * Chạy thước đo cửa vào trên một bộ đo sạch (đã qua kiemBoDo). Bất đồng bộ (kênh M-37 phải await).
 * - Kênh mặc định: `m41_tim_luat` (chạy thật lib/tim-luat.js).
 * - Kênh cắm thêm: `timNghia` (M-37) và `loc` (M-52); nếu không truyền thì báo CHUA_CAM.
 *   Kênh M-37: hàm thật (lib/chi-muc-luat.js) bất đồng bộ và trả `{trangThai, ketQua}`; THIEU/CU/HONG
 *   (chỉ mục vắng hoặc cũ — được dựng ở CI #2030) → kênh báo THIEU_CHI_MUC, không lỗi.
 */
export async function chayDoCuaVao({
  boDo = BO_THU_LUAT_MAU,
  thuMuc = THU_MUC_LUAT_MAC_DINH,
  limit = 20,
  timNghia = null,
  loc = null,
  tenBo = 'BO_THU_LUAT_MAU (dựng thước, chưa phải 10 mặt hàng CEO)',
} = {}) {
  const tapNutLuat = napTapNutLuat(thuMuc);
  const kiem = kiemBoDo(boDo, { tapNutLuat, thuMuc });
  if (!kiem.hopLe) {
    throw new Error(`Bộ đo không hợp lệ:\n- ${kiem.loi.join('\n- ')}`);
  }

  const kenh = {};

  // 1. Kênh M-41 (tìm chữ trên 6 kho luật gốc — đã gộp main)
  const kqM41 = boDo.map((ca) => {
    const res = timLuat(ca.moTa, { thuMuc, limit });
    const uv = chuanHoaUngVien(res.cuaVao || []);
    return chamMotCa(ca, uv, { rong: Boolean(res.rong) });
  });
  kenh.m41_tim_luat = {
    trangThai: 'DA_CAM',
    the: 'M-41',
    moTa: 'Tìm chữ trên 6 kho luật gốc (lib/tim-luat.js)',
    tongHop: tongHopKenh(kqM41),
    chiTiet: kqM41,
  };

  // 2. Kênh M-37 (tìm nghĩa trên nút luật — lib/chi-muc-luat.js timNghia, bất đồng bộ)
  if (typeof timNghia === 'function') {
    const kqM37 = [];
    let lechChiMuc = null;
    for (const ca of boDo) {
      const res = await timNghia(ca.moTa, { thuMuc, limit });
      // Chỉ mục vắng/cũ/hỏng là lỗi cả kênh (dựng ở CI #2030) — báo THIEU_CHI_MUC, không lỗi, không chấm nửa chừng.
      if (res && !Array.isArray(res) && res.trangThai && ['THIEU', 'CU', 'HONG'].includes(res.trangThai)) {
        lechChiMuc = { trangThai: res.trangThai, lyDo: String(res.lyDo || '') };
        break;
      }
      const ds = Array.isArray(res) ? res : (res.cuaVao || res.ketQua || []);
      const uv = chuanHoaUngVien(ds);
      kqM37.push(chamMotCa(ca, uv, { rong: ds.length === 0 }));
    }
    kenh.m37_tim_nghia = lechChiMuc
      ? {
          trangThai: 'THIEU_CHI_MUC',
          the: 'M-37',
          moTa: `Chỉ mục nghĩa chưa dùng được (${lechChiMuc.trangThai}: ${lechChiMuc.lyDo}) — dựng: npm run build:chi-muc-luat`,
          tongHop: null,
          chiTiet: [],
        }
      : {
          trangThai: 'DA_CAM',
          the: 'M-37',
          moTa: 'Chỉ mục nghĩa trên nút luật (lib/chi-muc-luat.js)',
          tongHop: tongHopKenh(kqM37),
          chiTiet: kqM37,
        };
  } else {
    kenh.m37_tim_nghia = {
      trangThai: 'CHUA_CAM',
      the: 'M-37',
      moTa: 'Chỗ cắm sẵn cho chỉ mục nghĩa M-37; dùng CLI --m37 để cắm thật.',
      tongHop: null,
      chiTiet: [],
    };
  }

  // 3. Kênh M-52 bước LOC (động cơ đọc luật trước — chỗ cắm sẵn)
  if (typeof loc === 'function') {
    const kqM52 = boDo.map((ca) => {
      const res = loc(ca.moTa, { thuMuc, limit }) || {};
      const ds = Array.isArray(res) ? res : (res.ungVien || res.cuaVao || []);
      const uv = chuanHoaUngVien(ds);
      return chamMotCa(ca, uv, { rong: ds.length === 0 });
    });
    kenh.m52_loc = {
      trangThai: 'DA_CAM',
      the: 'M-52',
      moTa: 'Bước LOC của động cơ đọc luật M-52',
      tongHop: tongHopKenh(kqM52),
      chiTiet: kqM52,
    };
  } else {
    kenh.m52_loc = {
      trangThai: 'CHUA_CAM',
      the: 'M-52',
      moTa: 'Chỗ cắm sẵn cho bước LOC của động cơ M-52 (#1955 đang nháp).',
      tongHop: null,
      chiTiet: [],
    };
  }

  return {
    phienBanThuoc: 'm79-cua-vao@1',
    tenBo,
    limit,
    tongCa: boDo.length,
    ngayChay: new Date().toISOString().slice(0, 10),
    luuY: 'Chỉ dựng thước đo trên căn cứ luật (data/luat-goc), không dùng tờ khai làm đáp án.',
    kenh,
  };
}

/** Dựng tóm tắt dễ đọc dạng Markdown để in màn hình hoặc ghi tệp --bao-cao. */
export function dinhDangBaoCaoMd(kq) {
  const lines = [];
  lines.push(`# Báo cáo thước đo cửa vào (${kq.phienBanThuoc})`);
  lines.push('');
  lines.push(`- **Bộ đo:** ${kq.tenBo} (${kq.tongCa} ca, limit=${kq.limit})`);
  lines.push(`- **Lưu ý:** ${kq.luuY}`);
  lines.push('');
  lines.push('| Kênh | Thẻ | Trạng thái | Trúng nhóm 4 (NHAC) | Top-5 | Top-10 | Đủ cặp CAP | Rỗng trên ca thuận | Ca ngược đạt |');
  lines.push('|---|---|---|---|---|---|---|---|---|');
  for (const [ten, k] of Object.entries(kq.kenh)) {
    if (k.trangThai !== 'DA_CAM') {
      lines.push(`| \`${ten}\` | ${k.the} | ${k.trangThai} | — | — | — | — | — | — |`);
      continue;
    }
    const t = k.tongHop;
    const cap = t.tongCaCap > 0 ? `${t.capDat}/${t.tongCaCap} (${t.tiLeCapDat}%)` : '—';
    lines.push(
      `| \`${ten}\` | ${k.the} | ${k.trangThai} | ${t.trungNhom4}/${t.tongCaThuan} (${t.tiLeTrungNhom4}%) | ${t.trungTop5}/${t.tongCaThuan} | ${t.trungTop10}/${t.tongCaThuan} | ${cap} | ${t.caRongTrenThuan} | ${t.caNguocDat}/${t.tongCaNguoc} |`
    );
  }
  lines.push('');
  lines.push('## Chi tiết kênh M-41 (`lib/tim-luat.js`)');
  lines.push('');
  lines.push('| Ca | Loại | Mô tả | Nhóm đúng | Hạng NHAC | Dòng NHAC / LOAI | Top-5 nhóm NHAC |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const c of kq.kenh.m41_tim_luat.chiTiet) {
    if (c.loaiCa === 'NGUOC') {
      lines.push(`| \`${c.id}\` | NGUOC (${c.kieuNguoc}) | — | — | ${c.dat ? 'ĐẠT' : 'HỎNG'} | tổng=${c.tongDong ?? 0} | ${c.lyDo} |`);
    } else if (c.loaiCa === 'CAP') {
      continue; // Ca CAP có bảng riêng bên dưới, không trộn vào bảng ca thuận
    } else {
      const hang = c.hangNhom4 ? `#${c.hangNhom4}` : (c.rong ? 'RỖNG' : 'KHÔNG THẤY');
      lines.push(
        `| \`${c.id}\` | ${c.nhomHienTuong} | ${c.moTa} | \`${c.nhomDung}\` | ${hang} | ${c.soDongNhac} / ${c.soDongLoai} | ${c.top5Nhom4.join(', ') || '—'} |`
      );
    }
  }
  for (const [ten, k] of Object.entries(kq.kenh)) {
    if (k.trangThai !== 'DA_CAM' || !(k.chiTiet || []).some((c) => c.loaiCa === 'CAP')) continue;
    lines.push('');
    lines.push(`## Chi tiết cặp tranh chấp (CAP) — kênh \`${ten}\``);
    lines.push('');
    lines.push('ĐẠT = mọi nhóm trong cặp có mặt ở chiều NHAC Top-20 (nút chỉ ở LOAI không tính).');
    lines.push('');
    lines.push('| Ca | Mô tả | Nhóm cần có | Nhóm có mặt (hạng NHAC) | Nhóm thiếu | ĐẠT | Top-10 nhóm NHAC |');
    lines.push('|---|---|---|---|---|---|---|');
    for (const c of k.chiTiet.filter((x) => x.loaiCa === 'CAP')) {
      const coMat = (c.nhomCanCo || []).filter((g) => g.co).map((g) => `${g.nhom4}(#${g.hang})`);
      const thieu = (c.nhomCanCo || []).filter((g) => !g.co).map((g) => `${g.nhom4}${g.chiOLoai ? ' (chỉ LOAI)' : ''}`);
      lines.push(
        `| \`${c.id}\` | ${c.moTa} | ${(c.nhomCanCo || []).map((g) => g.nhom4).join(', ')} | ${coMat.join(', ') || '—'} | ${thieu.join(', ') || '—'} | ${c.dat ? 'ĐẠT' : 'THIẾU'} | ${(c.top20Nhom4 || []).slice(0, 10).join(', ') || '—'} |`
      );
    }
  }
  return `${lines.join('\n')}\n`;
}

function phanTichThamSo(argv) {
  const out = { bo: null, limit: 20, json: false, baoCao: null, thuMuc: THU_MUC_LUAT_MAC_DINH, m37: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--json') out.json = true;
    else if (a === '--m37') out.m37 = true;
    else if (a === '--bo' && argv[i + 1]) { out.bo = argv[i + 1]; i += 1; }
    else if (a === '--limit' && argv[i + 1]) { out.limit = Number.parseInt(argv[i + 1], 10) || 20; i += 1; }
    else if (a === '--bao-cao' && argv[i + 1]) { out.baoCao = argv[i + 1]; i += 1; }
    else if (a === '--thu-muc' && argv[i + 1]) { out.thuMuc = argv[i + 1]; i += 1; }
  }
  return out;
}

// Khối CLI chạy trong async IIFE (không top-level await — giữ cho module require được từ CJS).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  (async () => {
    const opts = phanTichThamSo(process.argv.slice(2));
    let boDo = BO_THU_LUAT_MAU;
    let tenBo = 'BO_THU_LUAT_MAU (dựng thước từ data/luat-goc)';
    if (opts.bo) {
      const raw = JSON.parse(fs.readFileSync(path.resolve(opts.bo), 'utf8'));
      boDo = Array.isArray(raw) ? raw : (raw.ca || raw.danhSach || []);
      tenBo = path.basename(opts.bo);
    }
    const wiring = {};
    if (opts.m37) {
      const { timNghia } = require(path.join(GOC, 'lib', 'chi-muc-luat.js'));
      wiring.timNghia = timNghia;
    }
    const kq = await chayDoCuaVao({ boDo, thuMuc: opts.thuMuc, limit: opts.limit, tenBo, ...wiring });
    if (opts.baoCao) {
      fs.mkdirSync(path.dirname(path.resolve(opts.baoCao)), { recursive: true });
      fs.writeFileSync(path.resolve(opts.baoCao), dinhDangBaoCaoMd(kq), 'utf8');
    }
    if (opts.json) {
      console.log(JSON.stringify(kq, null, 2));
    } else {
      console.log(dinhDangBaoCaoMd(kq));
    }
  })().catch((e) => {
    console.error('LỖI:', e && e.message);
    process.exit(1);
  });
}
