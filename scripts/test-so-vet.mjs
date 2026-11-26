#!/usr/bin/env node
// scripts/test-so-vet.mjs — M-51 (#1919): Cổng kiểm Sổ ghi vết từng bước (Chương 76, kho câu, nghia-canh M-33 & mọi ca ngược).
// Tất định, 0 LLM, 0 sửa lib/cong-adr-0004.js, không nối vào đường khách đang chạy.
import './test-isolate-data.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { boKiem } from './lib-luat.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(new URL('..', import.meta.url).pathname);

const {
  KHUON_SO_VET,
  LOAI_BUOC,
  taoSoVet,
  ghiBuoc,
  kiemSoVet,
  napNguonCau,
  layCanhKiemBatBuoc,
  datLai,
} = require('../lib/so-vet');
const { phaiDoc } = require('../lib/do-thi/phai-doc');

const { kiem, xong } = boKiem('test-so-vet');

const KHO_DIR = path.join(ROOT, 'data', 'luat-goc');
const nguonCauThuc = napNguonCau(KHO_DIR);

const cauIdsCuaNut = (nutId) => nguonCauThuc.cauTheoNut.get(nutId) || [nutId];
const tatCaCauCuaDsNut = (dsNut) => dsNut.flatMap((id) => cauIdsCuaNut(id));
const nguyenVanCua = (cauId) => String(nguonCauThuc.traCau(cauId) || '').replace(/\s+/g, ' ').trim();

const pd76 = phaiDoc('bieu:76', { thuMuc: KHO_DIR, dayDu: true });
const pd7616 = phaiDoc('bieu:7616', { thuMuc: KHO_DIR, dayDu: true });
const pd761610 = phaiDoc('bieu:761610', { thuMuc: KHO_DIR, dayDu: true });

const layMucIds = (pd, tenBuoc, chiLuat = false) => {
  const b = pd.trinhTu.find((x) => x.buoc === tenBuoc);
  if (!b) return [];
  return b.muc.filter((m) => !chiLuat || m.lop === 'LUAT').map((m) => m.id || m.nut);
};

// Toàn bộ câu bắt buộc ở Chương 76 & Nhóm 7616
const dsCauPhan76 = tatCaCauCuaDsNut(layMucIds(pd76, 'CHU_GIAI_PHAN', true));
const dsCauPn76 = tatCaCauCuaDsNut(layMucIds(pd76, 'CHU_GIAI_PHAN_NHOM', true));
const dsCauNhom7616 = tatCaCauCuaDsNut(layMucIds(pd7616, 'CHU_GIAI_NHOM', false));
const dsCauSen7616 = tatCaCauCuaDsNut(layMucIds(pd7616, 'SEN', false));
const dsCauSen761610 = tatCaCauCuaDsNut(layMucIds(pd761610, 'SEN', false));

const { canh: canhKiem7616 } = layCanhKiemBatBuoc(pd7616, nguonCauThuc);
const uniqueCauKiem7616 = [...new Set(canhKiem7616.map((c) => c.cauId))];

const cungCap7616 = (pd76.capDuoi || []).map((x) => x.id);
const cungCap761610 = (pd7616.capDuoi || []).map((x) => x.id);
const cungCap76161090 = (pd761610.capDuoi || []).map((x) => x.id);

// Trả lời gộp theo từng câu cho toàn bộ cạnh cần kiểm của bieu:7616
function taoKiemCanhGopTheoCau7616({ cauChuaBiet = null, thieuChuKhachCau = null } = {}) {
  return uniqueCauKiem7616.map((cauId) => ({
    cauId,
    gopTheoCau: true,
    ketQua: cauChuaBiet && cauId === cauChuaBiet ? 'CHUA_BIET' : 'KHONG',
    chuKhach: thieuChuKhachCau && cauId === thieuChuKhachCau
      ? ''
      : (cauChuaBiet && cauId === cauChuaBiet
        ? 'khách chưa cung cấp thông số đầu vít/cơ cấu máy'
        : `đinh tán nhôm nguyên khối 6061, không rơi vào điều kiện nêu ở câu ${cauId}`),
  }));
}

// Mô tả hàng tự dựng hoàn toàn mới trên Chương 76 (KHÔNG lấy từ bộ thử)
const MO_TA_HANG_76 = 'Đinh tán nhôm nguyên khối 6061, đầu chỏm cầu, đường kính thân 4 mm, dài 12 mm, không có ren, dùng ghép tấm vỏ cabin.';

function taoSoVetChuan76() {
  const so = taoSoVet({
    moTaKhach: MO_TA_HANG_76,
    nguon: { kenh: 'test-tu-dung', chuong: '76' },
    qt1SoNhom: 1,
  });

  // Bước 1: VAO_CUA bieu:76 — đọc tên Chương 76 + toàn bộ Chú giải Phần XV & Chú giải phân nhóm Chương 76 + SEN phần XV
  ghiBuoc(so, {
    loai: 'VAO_CUA',
    nut: 'bieu:76',
    cungCapDaThay: ['bieu:76'],
    daDoc: ['bieu:76#1', ...dsCauPhan76, ...dsCauPn76, ...dsCauSen7616],
    trich: [{ cauId: 'bieu:76#1', doan: nguyenVanCua('bieu:76#1') }],
    chuKhach: 'Đinh tán nhôm nguyên khối 6061 dùng ghép tấm vỏ cabin',
    quyetDinh: { trangThai: 'MO_CUA', nutDich: 'bieu:76' },
    daSoKhongChon: [{ nut: 'bieu:73', viSaoKhongChon: 'Hàng bằng hợp kim nhôm, không phải sắt hoặc thép' }],
    quyTacGir: 'QT1',
  });

  // Bước 2: CHON tầng 4 số trong các nhóm cùng cấp của Chương 76 + đọc toàn bộ CHU_GIAI_NHOM & SEN nhóm 76.16
  ghiBuoc(so, {
    loai: 'CHON',
    nut: 'bieu:76',
    cungCapDaThay: cungCap7616,
    daDoc: ['bieu:7616#1', ...dsCauNhom7616, ...dsCauSen7616],
    trich: [{ cauId: 'bieu:7616#1', doan: nguyenVanCua('bieu:7616#1') }],
    chuKhach: 'Đinh tán nhôm nguyên khối không thuộc dạng thỏi, thanh, tấm hay cấu kiện kết cấu',
    quyetDinh: { trangThai: 'CHON_TANG_4', nutDich: 'bieu:7616' },
    daSoKhongChon: [
      { nut: 'bieu:7604', viSaoKhongChon: '76.04 là nhôm ở dạng thanh, que và hình' },
      { nut: 'bieu:7610', viSaoKhongChon: '76.10 là các kết cấu bằng nhôm như cửa, cầu, tháp' },
    ],
    quyTacGir: 'QT1',
  });

  // Bước 3: KIEM đầy đủ mọi câu loại trừ/cạnh của bieu:7616 kèm chữ khách
  ghiBuoc(so, {
    loai: 'KIEM',
    nut: 'bieu:7616',
    cungCapDaThay: cungCap7616,
    daDoc: ['nhom:7616:ct:1#1'],
    trich: [{ cauId: 'nhom:7616:ct:1#1', doan: 'Nhóm này bao gồm tất cả các sản phẩm bằng nhôm trừ các hàng hóa nằm trong các nhóm trước của chương này' }],
    chuKhach: 'đinh tán nhôm nguyên khối đầu chỏm cầu, không phải vải kim loại, phụ kiện rèm, ghim 83.05 hay bộ phận máy Phần XVI',
    quyetDinh: { trangThai: 'THONG_QUA_LOAI_TRU', nutDich: 'bieu:7616' },
    daSoKhongChon: [{ nut: 'bieu:8305', viSaoKhongChon: 'Không phải ghim dập văn phòng kim loại cơ bản nhóm 83.05' }],
    kiemCanh: taoKiemCanhGopTheoCau7616(),
    quyTacGir: 'QT1',
  });

  // Bước 4: CHON phân nhóm 6 số bieu:761610 + đọc các câu SEN áp cho 761610
  ghiBuoc(so, {
    loai: 'CHON',
    nut: 'bieu:7616',
    cungCapDaThay: cungCap761610,
    daDoc: ['bieu:761610#1', ...dsCauSen761610],
    trich: [{ cauId: 'bieu:761610#1', doan: 'Đinh, đinh bấm, ghim dập (trừ các loại thuộc nhóm 83.05), đinh vít, bu lông, đai ốc, đinh móc, đinh tán, chốt hãm, chốt định vị, vòng đệm' }],
    chuKhach: 'đinh tán nhôm, đầu chỏm cầu, không có ren',
    quyetDinh: { trangThai: 'CHON_TANG_6', nutDich: 'bieu:761610' },
    daSoKhongChon: [{ nut: 'bieu:76169', viSaoKhongChon: '7616.9 dành cho loại khác sau khi trừ nhóm đinh/vít/đinh tán 7616.10' }],
    quyTacGir: 'QT6',
  });

  // Bước 5: CHON dòng 8 số bieu:76161090
  ghiBuoc(so, {
    loai: 'CHON',
    nut: 'bieu:761610',
    cungCapDaThay: cungCap76161090,
    daDoc: ['bieu:76161090#1'],
    trich: [{ cauId: 'bieu:76161090#1', doan: nguyenVanCua('bieu:76161090#1') }],
    chuKhach: 'là đinh tán nhôm không có ren, không phải đinh hay ghim dập hay bu lông đai ốc',
    quyetDinh: { trangThai: 'CHON_TANG_8', nutDich: 'bieu:76161090' },
    daSoKhongChon: [
      { nut: 'bieu:76161010', viSaoKhongChon: '7616.10.10 chỉ dành cho đinh (- - Đinh), không phải đinh tán' },
      { nut: 'bieu:76161020', viSaoKhongChon: '7616.10.20 chỉ dành cho ghim dập, đinh móc, bulông và đai ốc' },
    ],
    quyTacGir: 'QT6',
  });

  // Bước 6: KET_LUAN chốt 8 số
  ghiBuoc(so, {
    loai: 'KET_LUAN',
    nut: 'bieu:76161090',
    cungCapDaThay: cungCap76161090,
    daDoc: ['bieu:76161090#1'],
    trich: [{ cauId: 'bieu:76161090#1', doan: nguyenVanCua('bieu:76161090#1') }],
    chuKhach: 'Đinh tán nhôm nguyên khối 6061, không có ren',
    quyetDinh: { trangThai: 'CHOT', maHs: '76161090', nutDich: 'bieu:76161090' },
    daSoKhongChon: [{ nut: 'bieu:76161020', viSaoKhongChon: 'Không có ren ngoài/trong dạng bulông hay đai ốc' }],
    quyTacGir: 'QT1, QT6',
  });

  return so;
}

// ── 1. Ca ĐÚNG trọn vẹn dựng tay trên Chương 76 (đủ câu thật + CHU_GIAI_NHOM + SEN + gộp câu KIEM) ─────
{
  const soChuan = taoSoVetChuan76();
  const kq = kiemSoVet(soChuan, { thuMuc: KHO_DIR });
  kiem(
    `ca đúng trọn vẹn Chương 76 (đủ câu thật, CHU_GIAI_NHOM, SEN, gộp ${uniqueCauKiem7616.length} câu / ${canhKiem7616.length} cạnh) -> xanh 0 lỗi`,
    soChuan.khuon === KHUON_SO_VET && kq.dat === true && kq.loi.length === 0 && kq.thieu.length === 0 && kq.adr0004?.dat === true,
    JSON.stringify(kq.loi),
  );
}

// ── 2. Ca ĐÚNG nhánh CHUA_BIET + HOI + DUNG_HOI & ca ĐÚNG có QUAY_LUI ───────────────────────────────────────
{
  const soHoi = taoSoVet({ moTaKhach: 'Giá đỡ bằng nhôm cho máy CNC', qt1SoNhom: 2 });
  ghiBuoc(soHoi, {
    loai: 'VAO_CUA',
    nut: 'bieu:76',
    cungCapDaThay: ['bieu:76'],
    daDoc: ['bieu:76#1', ...dsCauPhan76, ...dsCauPn76],
    trich: [{ cauId: 'bieu:76#1', doan: nguyenVanCua('bieu:76#1') }],
    chuKhach: 'Giá đỡ bằng nhôm cho máy CNC',
    quyetDinh: { trangThai: 'MO_CUA', nutDich: 'bieu:76' },
    daSoKhongChon: [{ nut: 'bieu:84', viSaoKhongChon: 'Đang kiểm tra ở Chương 76 trước' }],
    quyTacGir: 'QT1',
  });
  ghiBuoc(soHoi, {
    loai: 'CHON',
    nut: 'bieu:76',
    cungCapDaThay: cungCap7616,
    daDoc: ['bieu:7616#1', ...dsCauNhom7616, ...dsCauSen7616],
    trich: [{ cauId: 'bieu:7616#1', doan: nguyenVanCua('bieu:7616#1') }],
    chuKhach: 'Giá đỡ bằng nhôm cho máy CNC',
    quyetDinh: { trangThai: 'CHON_TANG_4', nutDich: 'bieu:7616' },
    daSoKhongChon: [{ nut: 'bieu:7610', viSaoKhongChon: 'Không phải kết cấu xây dựng nhôm' }],
    quyTacGir: 'QT1',
  });
  ghiBuoc(soHoi, {
    loai: 'KIEM',
    nut: 'bieu:7616',
    cungCapDaThay: cungCap7616,
    daDoc: ['phan:XV:cg:1:f#1'],
    trich: [{ cauId: 'phan:XV:cg:1:f#1', doan: nguyenVanCua('phan:XV:cg:1:f#1') }],
    chuKhach: 'Giá đỡ bằng nhôm dùng cho máy công cụ nhưng chưa rõ có thuộc Phần XVI không',
    quyetDinh: { trangThai: 'CAN_HOI_KHACH', nutDich: 'bieu:7616' },
    daSoKhongChon: [{ nut: 'bieu:8466', viSaoKhongChon: 'Chưa đủ thông tin cơ cấu căn chỉnh để quyết định' }],
    kiemCanh: taoKiemCanhGopTheoCau7616({ cauChuaBiet: 'phan:XV:cg:1:f#1' }),
    quyTacGir: 'QT1',
  });
  ghiBuoc(soHoi, {
    loai: 'HOI',
    nut: 'bieu:7616',
    cungCapDaThay: ['bieu:7616'],
    daDoc: ['phan:XV:cg:1:f#1'],
    trich: [{ cauId: 'phan:XV:cg:1:f#1', doan: nguyenVanCua('phan:XV:cg:1:f#1') }],
    chuKhach: 'Chưa rõ bàn gá có phải loại chuyên dùng lắp máy CNC Phần XVI không',
    quyetDinh: { trangThai: 'DUNG_HOI', cauHoi: 'Giá đỡ này có cơ cấu kẹp/căn chỉnh chuyên dùng lắp lên máy CNC không?' },
    daSoKhongChon: [{ nut: 'bieu:8466', viSaoKhongChon: 'Chờ khách trả lời dữ kiện' }],
    quyTacGir: 'QT1',
  });
  ghiBuoc(soHoi, {
    loai: 'KET_LUAN',
    nut: 'bieu:7616',
    cungCapDaThay: ['bieu:7616'],
    daDoc: ['bieu:7616#1'],
    trich: [{ cauId: 'bieu:7616#1', doan: nguyenVanCua('bieu:7616#1') }],
    chuKhach: 'Chờ bổ sung thông số lắp máy CNC',
    quyetDinh: { trangThai: 'DUNG_HOI', maHs: '7616' },
    daSoKhongChon: [{ nut: 'bieu:8466', viSaoKhongChon: 'Tạm dừng hỏi để tránh chốt sai giữa 76.16 và 84.66' }],
    quyTacGir: 'QT1',
  });
  const kqHoi = kiemSoVet(soHoi, { thuMuc: KHO_DIR });
  kiem('ca đúng nhánh CHUA_BIET -> HOI -> DUNG_HOI -> xanh 0 lỗi', kqHoi.dat === true, JSON.stringify(kqHoi.loi));
}

{
  const soQuay = taoSoVetChuan76();
  soQuay.cacBuoc.splice(1, 0,
    {
      loai: 'CHON',
      nut: 'bieu:76',
      cungCapDaThay: cungCap7616,
      daDoc: ['bieu:7604#1', ...tatCaCauCuaDsNut(layMucIds(phaiDoc('bieu:7604', { thuMuc: KHO_DIR, dayDu: true }), 'CHU_GIAI_NHOM', false)), ...tatCaCauCuaDsNut(layMucIds(phaiDoc('bieu:7604', { thuMuc: KHO_DIR, dayDu: true }), 'SEN', false))],
      trich: [{ cauId: 'bieu:7604#1', doan: nguyenVanCua('bieu:7604#1') }],
      chuKhach: 'Ban đầu tưởng là thanh nhôm phôi trước khi đối chiếu hình dáng',
      quyetDinh: { trangThai: 'CHON_TANG_4', nutDich: 'bieu:7604' },
      daSoKhongChon: [{ nut: 'bieu:7616', viSaoKhongChon: 'Kiểm tra dạng thanh 76.04 trước' }],
      quyTacGir: 'QT1',
    },
    {
      loai: 'QUAY_LUI',
      nut: 'bieu:7604',
      cungCapDaThay: cungCap7616,
      daDoc: ['bieu:7604#1'],
      trich: [{ cauId: 'bieu:7604#1', doan: nguyenVanCua('bieu:7604#1') }],
      chuKhach: 'Hàng đã tán mũ thành phẩm đinh tán chứ không còn ở dạng thanh phôi 76.04',
      quyetDinh: { trangThai: 'QUAY_LUI', nutDich: 'bieu:76', lyDo: 'Không phải thanh phôi 76.04 vì đã gia công tạo đầu đinh tán hoàn chỉnh' },
      daSoKhongChon: [{ nut: 'bieu:7604', viSaoKhongChon: 'Đã loại vì là thành phẩm đinh tán' }],
      quyTacGir: 'QT1',
    },
  );
  const kqQuay = kiemSoVet(soQuay, { thuMuc: KHO_DIR });
  kiem('ca đúng có QUAY_LUI ghi rõ lý do về bieu:76 -> xanh 0 lỗi', kqQuay.dat === true, JSON.stringify(kqQuay.loi));
}

// ── 3. Điểm 3 QT: kiểm thử kho mô phỏng M-33 (data/luat-goc/nghia-canh/*.jsonl) ───────────────────────────
{
  const tmpNc = fs.mkdtempSync(path.join(os.tmpdir(), 'm51-nghia-canh-'));
  try {
    fs.mkdirSync(path.join(tmpNc, 'cau'), { recursive: true });
    fs.mkdirSync(path.join(tmpNc, 'nghia-canh'), { recursive: true });
    const node76 = { id: 'bieu:76', loai: 'TEN', lop: 'LUAT', cha: null, so: null, nguyenVan: 'Nhôm và các sản phẩm bằng nhôm', nguon: { vanBan: 'BT', ban: '2026', trang: 1 }, hieuLuc: { tu: null, den: null } };
    const node7616 = { id: 'bieu:7616', loai: 'TEN', lop: 'LUAT', cha: 'bieu:76', so: null, nguyenVan: 'Các sản phẩm khác bằng nhôm', nguon: { vanBan: 'BT', ban: '2026', trang: 1 }, hieuLuc: { tu: null, den: null } };
    const node761610 = { id: 'bieu:761610', loai: 'TEN', lop: 'LUAT', cha: 'bieu:7616', so: null, nguyenVan: '- Đinh, đinh vít, đinh tán bằng nhôm', nguon: { vanBan: 'BT', ban: '2026', trang: 1 }, hieuLuc: { tu: null, den: null } };
    const node76161090 = { id: 'bieu:76161090', loai: 'TEN', lop: 'LUAT', cha: 'bieu:761610', so: null, nguyenVan: '- - Loại khác bằng nhôm', nguon: { vanBan: 'BT', ban: '2026', trang: 1 }, hieuLuc: { tu: null, den: null } };
    const nodeCg = { id: 'chuong:76:cg:1', loai: 'CHU_GIAI', lop: 'LUAT', cha: null, so: '1', nguyenVan: 'Chương này không bao gồm đồ chơi bằng nhôm thuộc Chương 95.', nguon: { vanBan: 'CG', ban: 'HS2022', trang: 10 }, hieuLuc: { tu: null, den: null } };
    const nodeCg2 = { id: 'chuong:76:cg:2', loai: 'CHU_GIAI', lop: 'LUAT', cha: null, so: '2', nguyenVan: 'Xem thêm định nghĩa hợp kim tại chú giải phân nhóm và quy định áp dụng nhóm 76.16.', nguon: { vanBan: 'CG', ban: 'HS2022', trang: 10 }, hieuLuc: { tu: null, den: null } };

    fs.writeFileSync(path.join(tmpNc, 'bieu.jsonl'), [node76, node7616, node761610, node76161090].map((x) => JSON.stringify(x)).join('\n') + '\n');
    fs.writeFileSync(path.join(tmpNc, 'chuong.jsonl'), [nodeCg, nodeCg2].map((x) => JSON.stringify(x)).join('\n') + '\n');
    fs.writeFileSync(path.join(tmpNc, 'cau', 'bieu.jsonl'), [
      { id: 'bieu:76#1', tu: 0, den: node76.nguyenVan.length },
      { id: 'bieu:7616#1', tu: 0, den: node7616.nguyenVan.length },
      { id: 'bieu:761610#1', tu: 0, den: node761610.nguyenVan.length },
      { id: 'bieu:76161090#1', tu: 0, den: node76161090.nguyenVan.length },
    ].map((x) => JSON.stringify(x)).join('\n') + '\n');
    fs.writeFileSync(path.join(tmpNc, 'cau', 'chuong.jsonl'), [
      { id: 'chuong:76:cg:1#1', tu: 0, den: nodeCg.nguyenVan.length },
      { id: 'chuong:76:cg:2#1', tu: 0, den: nodeCg2.nguyenVan.length },
    ].map((x) => JSON.stringify(x)).join('\n') + '\n');

    // Kho nghia-canh M-33: chỉ LOAI_SANG KHOP và CHUA_RO là bắt buộc; GOM / DINH_NGHIA KHÔNG bắt buộc
    fs.writeFileSync(path.join(tmpNc, 'nghia-canh', 'chuong.jsonl'), [
      { tu: 'chuong:76:cg:1#1', den: 'bieu:9503', trangThai: 'KHOP', loai: 'LOAI_SANG', dieuKien: 'Đồ chơi bằng nhôm' },
      { tu: 'chuong:76:cg:2#1', den: 'bieu:8419', trangThai: 'CHUA_RO', loai: 'LOAI_SANG', dieuKien: 'Bộ trao đổi nhiệt nhôm chưa rõ công dụng' },
      { tu: 'chuong:76:cg:2#1', den: 'bieu:7616', trangThai: 'KHOP', loai: 'GOM', dieuKien: 'Áp dụng nhóm 76.16' },
      { tu: 'chuong:76:cg:2#1', den: 'chuong:76:cgpn:1', trangThai: 'KHOP', loai: 'DINH_NGHIA', dieuKien: 'Định nghĩa hợp kim' },
    ].map((x) => JSON.stringify(x)).join('\n') + '\n');

    const taoSoNc = (kiemCanh) => {
      const s = taoSoVet({ moTaKhach: 'Đinh tán nhôm mẫu', qt1SoNhom: 1 });
      ghiBuoc(s, { loai: 'VAO_CUA', nut: 'bieu:76', cungCapDaThay: ['bieu:76'], daDoc: ['bieu:76#1', 'chuong:76:cg:1#1', 'chuong:76:cg:2#1'], trich: [{ cauId: 'bieu:76#1', doan: node76.nguyenVan }], chuKhach: 'Đinh tán nhôm', quyetDinh: { trangThai: 'MO_CUA', nutDich: 'bieu:76' }, daSoKhongChon: [], quyTacGir: 'QT1' });
      ghiBuoc(s, { loai: 'CHON', nut: 'bieu:76', cungCapDaThay: ['bieu:7616'], daDoc: ['bieu:7616#1'], trich: [{ cauId: 'bieu:7616#1', doan: node7616.nguyenVan }], chuKhach: 'Đinh tán nhôm', quyetDinh: { trangThai: 'CHON_TANG_4', nutDich: 'bieu:7616' }, daSoKhongChon: [], quyTacGir: 'QT1' });
      ghiBuoc(s, { loai: 'KIEM', nut: 'bieu:7616', cungCapDaThay: ['bieu:7616'], daDoc: ['chuong:76:cg:1#1'], trich: [{ cauId: 'chuong:76:cg:1#1', doan: nodeCg.nguyenVan }], chuKhach: 'Đinh tán nhôm, không phải đồ chơi hay bộ trao đổi nhiệt', quyetDinh: { trangThai: 'THONG_QUA', nutDich: 'bieu:7616' }, daSoKhongChon: [], kiemCanh, quyTacGir: 'QT1' });
      ghiBuoc(s, { loai: 'CHON', nut: 'bieu:7616', cungCapDaThay: ['bieu:761610'], daDoc: ['bieu:761610#1'], trich: [{ cauId: 'bieu:761610#1', doan: node761610.nguyenVan }], chuKhach: 'Đinh tán nhôm', quyetDinh: { trangThai: 'CHON_TANG_6', nutDich: 'bieu:761610' }, daSoKhongChon: [], quyTacGir: 'QT6' });
      ghiBuoc(s, { loai: 'CHON', nut: 'bieu:761610', cungCapDaThay: ['bieu:76161090'], daDoc: ['bieu:76161090#1'], trich: [{ cauId: 'bieu:76161090#1', doan: node76161090.nguyenVan }], chuKhach: 'Đinh tán nhôm', quyetDinh: { trangThai: 'CHON_TANG_8', nutDich: 'bieu:76161090' }, daSoKhongChon: [], quyTacGir: 'QT6' });
      ghiBuoc(s, { loai: 'KET_LUAN', nut: 'bieu:76161090', cungCapDaThay: ['bieu:76161090'], daDoc: ['bieu:76161090#1'], trich: [{ cauId: 'bieu:76161090#1', doan: node76161090.nguyenVan }], chuKhach: 'Đinh tán nhôm', quyetDinh: { trangThai: 'CHOT', maHs: '76161090', nutDich: 'bieu:76161090' }, daSoKhongChon: [], quyTacGir: 'QT1, QT6' });
      return s;
    };

    const pdMock = (id) => {
      if (id === 'bieu:76') return { id: 'bieu:76', trinhTu: [{ buoc: 'TEN', muc: [{ id: 'bieu:76', lop: 'LUAT' }] }, { buoc: 'CHU_GIAI_CHUONG', muc: [{ id: 'chuong:76:cg:1', lop: 'LUAT' }, { id: 'chuong:76:cg:2', lop: 'LUAT' }] }], cungCap: [], capDuoi: [{ id: 'bieu:7616' }] };
      if (id === 'bieu:7616') return { id: 'bieu:7616', trinhTu: [{ buoc: 'TEN', muc: [{ id: 'bieu:7616', lop: 'LUAT' }] }, { buoc: 'CHU_GIAI_CHUONG', muc: [{ id: 'chuong:76:cg:1', lop: 'LUAT' }, { id: 'chuong:76:cg:2', lop: 'LUAT' }] }], cungCap: [], capDuoi: [{ id: 'bieu:761610' }] };
      if (id === 'bieu:761610') return { id: 'bieu:761610', trinhTu: [{ buoc: 'TEN', muc: [{ id: 'bieu:761610', lop: 'LUAT' }] }, { buoc: 'CHU_GIAI_CHUONG', muc: [{ id: 'chuong:76:cg:1', lop: 'LUAT' }, { id: 'chuong:76:cg:2', lop: 'LUAT' }] }], cungCap: [], capDuoi: [{ id: 'bieu:76161090' }] };
      return { id: 'bieu:76161090', trinhTu: [{ buoc: 'TEN', muc: [{ id: 'bieu:76161090', lop: 'LUAT' }] }, { buoc: 'CHU_GIAI_CHUONG', muc: [{ id: 'chuong:76:cg:1', lop: 'LUAT' }, { id: 'chuong:76:cg:2', lop: 'LUAT' }] }], cungCap: [], capDuoi: [] };
    };

    datLai();
    const okNc = kiemSoVet(taoSoNc([
      { cauId: 'chuong:76:cg:1#1', nutDich: 'bieu:9503', ketQua: 'KHONG', chuKhach: 'đinh tán, không phải đồ chơi' },
      { cauId: 'chuong:76:cg:2#1', nutDich: 'bieu:8419', ketQua: 'KHONG', chuKhach: 'không phải bộ trao đổi nhiệt' },
    ]), { thuMuc: tmpNc, phaiDocFn: pdMock });
    kiem('mock nghia-canh M-33: trả lời đủ LOAI_SANG KHOP + CHUA_RO (bỏ qua GOM/DINH_NGHIA) -> xanh', okNc.dat === true, JSON.stringify(okNc.loi));

    const sotChuaRo = kiemSoVet(taoSoNc([
      { cauId: 'chuong:76:cg:1#1', nutDich: 'bieu:9503', ketQua: 'KHONG', chuKhach: 'đinh tán, không phải đồ chơi' },
    ]), { thuMuc: tmpNc, phaiDocFn: pdMock });
    kiem('mock nghia-canh M-33 CA NGƯỢC: bỏ sót cạnh CHUA_RO -> đỏ KIEM_SOT_CANH_LOAI_TRU', !sotChuaRo.dat && sotChuaRo.loi.some((x) => x.ma === 'KIEM_SOT_CANH_LOAI_TRU'), JSON.stringify(sotChuaRo.loi));

    const sotLoaiSang = kiemSoVet(taoSoNc([
      { cauId: 'chuong:76:cg:2#1', nutDich: 'bieu:8419', ketQua: 'KHONG', chuKhach: 'không phải bộ trao đổi nhiệt' },
    ]), { thuMuc: tmpNc, phaiDocFn: pdMock });
    kiem('mock nghia-canh M-33 CA NGƯỢC: bỏ sót cạnh LOAI_SANG KHOP -> đỏ KIEM_SOT_CANH_LOAI_TRU', !sotLoaiSang.dat && sotLoaiSang.loi.some((x) => x.ma === 'KIEM_SOT_CANH_LOAI_TRU'), JSON.stringify(sotLoaiSang.loi));
  } finally {
    fs.rmSync(tmpNc, { recursive: true, force: true });
    datLai();
  }
}

// ── 4. Mỗi lỗi một CA NGƯỢC (đầy đủ 3 điểm QT + 3 lỗ hổng auditor + ADR-0004) ─────────────────────────────
const kiemCaNguoc = (ten, suaFn, maKyVong, checkChiTiet = null) => {
  const s = taoSoVetChuan76();
  suaFn(s);
  const r = kiemSoVet(s, { thuMuc: KHO_DIR });
  const khop = r.loi.filter((l) => l.ma === maKyVong);
  const okChiTiet = !checkChiTiet || khop.some((l) => checkChiTiet(l.chiTiet || ''));
  kiem(`CA NGƯỢC ${ten} -> đỏ ${maKyVong}`, !r.dat && khop.length > 0 && okChiTiet && r.thieu.length > 0, JSON.stringify(r.loi));
};

// Ca ngược điểm 1 của QT: đọc ...#1 của nút 3 câu thật (chuong:76:cgpn:1:a gồm 3 câu #1,#2,#3)
kiemCaNguoc(
  'điểm 1 QT: chỉ đọc chuong:76:cgpn:1:a#1 trên nút 3 câu (thiếu #2, #3)',
  (s) => {
    s.cacBuoc[0].daDoc = s.cacBuoc[0].daDoc.filter((id) => id === 'chuong:76:cgpn:1:a#1' || !id.startsWith('chuong:76:cgpn:1:a#'));
  },
  'THIEU_NUT_BAT_BUOC_PHAI_DOC',
  (msg) => msg.includes('chuong:76:cgpn:1:a#2') && msg.includes('chuong:76:cgpn:1:a#3'),
);

// Ca ngược điểm 2a của QT: thiếu 1 câu trong CHU_GIAI_NHOM (nhom:7616:ct:6#2)
kiemCaNguoc(
  'điểm 2 QT: thiếu 1 câu CHU_GIAI_NHOM (nhom:7616:ct:6#2)',
  (s) => {
    s.cacBuoc[1].daDoc = s.cacBuoc[1].daDoc.filter((id) => id !== 'nhom:7616:ct:6#2');
  },
  'THIEU_NUT_BAT_BUOC_PHAI_DOC',
  (msg) => msg.includes('nhom:7616:ct:6#2'),
);

// Ca ngược điểm 2b của QT: thiếu SEN bắt buộc của đúng nút (sen:76169920:1#1)
kiemCaNguoc(
  'điểm 2 QT: thiếu SEN bắt buộc của nhóm 7616 (sen:76169920:1#1)',
  (s) => {
    s.cacBuoc[0].daDoc = s.cacBuoc[0].daDoc.filter((id) => !id.startsWith('sen:76169920:1'));
    s.cacBuoc[1].daDoc = s.cacBuoc[1].daDoc.filter((id) => !id.startsWith('sen:76169920:1'));
  },
  'THIEU_NUT_BAT_BUOC_PHAI_DOC',
  (msg) => msg.includes('sen:76169920:1'),
);

// Ca ngược điểm 3 QT: chế độ gộp theo câu bỏ sót 1 câu loại trừ
kiemCaNguoc('điểm 3 QT: KIEM gộp theo câu bỏ sót 1 câu có cạnh NHAC loại trừ', (s) => {
  s.cacBuoc[2].kiemCanh = s.cacBuoc[2].kiemCanh.slice(1);
}, 'KIEM_SOT_CANH_LOAI_TRU');

// Ca ngược auditor #1: bỏ hẳn bước KIEM dù nhóm 7616 có cạnh cần kiểm
kiemCaNguoc('auditor: bỏ hẳn bước KIEM không đi qua bước nào', (s) => {
  s.cacBuoc.splice(2, 1);
}, 'KIEM_SOT_CANH_LOAI_TRU');

// Ca ngược auditor #2: sổ cụt chỉ có 1 bước VAO_CUA (không KET_LUAN / HOI)
kiemCaNguoc('auditor: sổ cụt chỉ có VAO_CUA không kết thúc KET_LUAN/HOI', (s) => {
  s.cacBuoc = [s.cacBuoc[0]];
}, 'THIEU_TRUONG_BUOC');

kiemCaNguoc('loại bước ngoài 7 bước chuẩn', (s) => {
  s.cacBuoc[0].loai = 'DOAN_MO';
}, 'LOAI_BUOC_KHONG_HOP_LE');

kiemCaNguoc('thiếu trường bắt buộc (chuKhach, quyTacGir, daSoKhongChon)', (s) => {
  s.cacBuoc[1].chuKhach = '';
  delete s.cacBuoc[1].quyTacGir;
  s.cacBuoc[1].daSoKhongChon = null;
}, 'THIEU_TRUONG_BUOC');

kiemCaNguoc('đoạn trích bịa không có trong nguyên văn câu', (s) => {
  s.cacBuoc[1].trich = [{ cauId: 'bieu:7616#1', doan: 'Câu luật tự bịa hoàn toàn không có trong bieu:7616' }];
}, 'TRICH_KHONG_CO_TRONG_CAU');

kiemCaNguoc('thiếu đọc nút bắt buộc phaiDoc (bỏ phan:XV:cg:1)', (s) => {
  s.cacBuoc[0].daDoc = s.cacBuoc[0].daDoc.filter((id) => !id.startsWith('phan:XV:cg:1#'));
}, 'THIEU_NUT_BAT_BUOC_PHAI_DOC');

kiemCaNguoc('CHON nút ngoài nhánh/cùng cấp (đứng 761610 lại chọn bieu:76169)', (s) => {
  s.cacBuoc[4].cungCapDaThay = ['bieu:76169'];
  s.cacBuoc[4].quyetDinh.nutDich = 'bieu:76169';
}, 'CHON_NGOAI_CUNG_CAP_NHANH');

kiemCaNguoc('KIEM trả lời cạnh thiếu chữ khách', (s) => {
  s.cacBuoc[2].kiemCanh[0].chuKhach = '   ';
}, 'KIEM_TRA_LOI_CANH_KHONG_HOP_LE');

kiemCaNguoc('CHUA_BIET mà vẫn KET_LUAN chốt mã không HOI', (s) => {
  s.cacBuoc[2].kiemCanh = taoKiemCanhGopTheoCau7616({ cauChuaBiet: uniqueCauKiem7616[0] });
}, 'CHUA_BIET_KHONG_CO_HOI');

kiemCaNguoc('nhảy cóc thứ tự 4 -> 8 bỏ qua tầng 6 số', (s) => {
  s.cacBuoc.splice(3, 1);
}, 'SAI_THU_TU_TANG_4_6_8');

kiemCaNguoc('QUAY_LUI không ghi lý do', (s) => {
  s.cacBuoc.splice(2, 0, {
    loai: 'QUAY_LUI',
    nut: 'bieu:7616',
    cungCapDaThay: cungCap7616,
    daDoc: ['bieu:7616#1'],
    trich: [{ cauId: 'bieu:7616#1', doan: nguyenVanCua('bieu:7616#1') }],
    chuKhach: 'Quay lại Chương 76',
    quyetDinh: { trangThai: 'QUAY_LUI', nutDich: 'bieu:76', lyDo: '' },
    daSoKhongChon: [{ nut: 'bieu:7616', viSaoKhongChon: 'Đổi hướng' }],
    quyTacGir: 'QT1',
  });
}, 'QUAY_LUI_THIEU_LY_DO');

kiemCaNguoc('CHUYEN_HUONG thiếu nút đích / trích', (s) => {
  s.cacBuoc.splice(2, 0, {
    loai: 'CHUYEN_HUONG',
    nut: 'bieu:7616',
    cungCapDaThay: cungCap7616,
    daDoc: ['bieu:7616#1'],
    trich: [],
    chuKhach: 'Chuyển sang nhóm khác',
    quyetDinh: { trangThai: 'CHUYEN_HUONG' },
    daSoKhongChon: [{ nut: 'bieu:7616', viSaoKhongChon: 'Chuyển hướng' }],
    quyTacGir: 'QT1',
  });
}, 'CHUYEN_HUONG_THIEU_DICH');

kiemCaNguoc('đưa nút tiền lệ tb:* vào sổ ghi vết', (s) => {
  s.cacBuoc[0].daDoc.push('tb:1234-2024:76161090#1');
}, 'TIEN_LE_TRONG_SO_VET');

kiemCaNguoc('kế thừa ADR-0004: viện dẫn QT3 khi QT1 đã khoanh 1 nhóm', (s) => {
  s.cacBuoc[1].quyTacGir = 'QT1, QT3(a)';
}, 'QT3_THUA_KHI_QT1_DU');

kiemCaNguoc('kế thừa ADR-0004: bộ phận chốt Chương 76 (Phần XV) thiếu kiểm CG 1(f) & CG 2 PXVI', (s) => {
  s.laBoPhan = true;
  s.mayChu = 'máy dập kim loại 84.62';
  s.kiemBoPhan = null;
}, 'BO_PHAN_THIEU_KIEM_LOAI_TRU_PXVI');

// ── 4b. Bước LOC (M-52 #1955): phủ đủ, có lý do, KIEM phải qua LOC hoặc CHUYEN_HUONG ────────────────────────
{
  const coLoc = (sua = {}, quyetDinh = {}) => {
    const s = taoSoVetChuan76();
    s.cacBuoc.splice(1, 0, {
      loai: 'LOC',
      nut: 'cua-vao',
      cungCapDaThay: ['bieu:7604', 'bieu:7616', 'bieu:7318'],
      daDoc: ['bieu:7616#1'],
      trich: [],
      chuKhach: 'Đinh tán nhôm nguyên khối 6061',
      quyetDinh: {
        trangThai: 'LOC_GIU',
        giu: ['bieu:7604', 'bieu:7616'],
        boQua: [{ lyDo: 'Nhóm sắt hoặc thép, hàng bằng nhôm', nhom: ['bieu:7318'] }],
        ...quyetDinh,
      },
      daSoKhongChon: [],
      quyTacGir: 'QT1',
      ...sua,
    });
    return kiemSoVet(s, { thuMuc: KHO_DIR });
  };
  const ma = (kq) => kq.loi.map((x) => x.ma);
  kiem('LOC phủ đủ, bỏ gộp theo lý do -> đạt', coLoc().dat === true, ma(coLoc()).join(','));
  kiem('LOC sót nhóm -> LOC_KHONG_PHU_DU', ma(coLoc({}, { boQua: [] })).includes('LOC_KHONG_PHU_DU'));
  kiem('LOC bỏ không lý do -> LOC_KHONG_PHU_DU', ma(coLoc({}, { boQua: [{ lyDo: '', nhom: ['bieu:7318'] }] })).includes('LOC_KHONG_PHU_DU'));
  kiem('LOC vừa giữ vừa bỏ -> LOC_KHONG_PHU_DU', ma(coLoc({}, { boQua: [{ lyDo: 'Nhóm sắt hoặc thép', nhom: ['bieu:7318', 'bieu:7604'] }] })).includes('LOC_KHONG_PHU_DU'));
  kiem('LOC nhóm lạ -> LOC_KHONG_PHU_DU', ma(coLoc({}, { giu: ['bieu:7604', 'bieu:7616', 'bieu:9403'] })).includes('LOC_KHONG_PHU_DU'));
  kiem('KIEM nhóm LOC đã bỏ -> KIEM_NGOAI_LOC', ma(coLoc({}, { giu: ['bieu:7604'], boQua: [{ lyDo: 'Nhóm khác loại hàng', nhom: ['bieu:7318', 'bieu:7616'] }] })).includes('KIEM_NGOAI_LOC'));
}

// ── 5. Kiểm tra ranh giới M-51: không sửa lib/cong-adr-0004.js, không nối vào api/, không LLM ───────────────
{
  const tepSoVet = ['khuon.js', 'kiem.js', 'index.js'].map((f) => fs.readFileSync(path.join(ROOT, 'lib', 'so-vet', f), 'utf8')).join('\n');
  const khongChuThich = tepSoVet.split('\n').filter((l) => !/^\s*(?:\/\/|\*|\/\*)/.test(l)).join('\n');
  kiem('tĩnh: lib/so-vet/** không gọi LLM và không nạp scripts/', !/callLLM|callLlm|scripts\//.test(khongChuThich));

  const apiFiles = fs.readdirSync(path.join(ROOT, 'api')).filter((f) => f.endsWith('.js'));
  const noiVaoApi = apiFiles.filter((f) => fs.readFileSync(path.join(ROOT, 'api', f), 'utf8').includes('so-vet'));
  kiem('tĩnh: KHÔNG tự nối lib/so-vet vào bất kỳ api/*.js nào (chờ QT nối ở M-52)', noiVaoApi.length === 0, noiVaoApi.join(', '));

  const adrDiff = execFileSync('git', ['diff', '--name-only', '--', 'lib/cong-adr-0004.js'], { cwd: ROOT, encoding: 'utf8' }).trim();
  kiem('tĩnh: lib/cong-adr-0004.js không bị sửa đổi', adrDiff === '', adrDiff);
}

if (process.argv.includes('--thong-ke')) {
  const so = taoSoVetChuan76();
  const kq = kiemSoVet(so, { thuMuc: KHO_DIR });
  console.log('\n=== THỐNG KÊ M-51 ===');
  console.log(JSON.stringify({
    khuon: so.khuon,
    loaiBuoc: LOAI_BUOC,
    soBuocCaChuan76: so.cacBuoc.length,
    soCauKiemGopO7616: uniqueCauKiem7616.length,
    soCanhKiemO7616: canhKiem7616.length,
    soCauBatBuocDaDoc: so.cacBuoc.reduce((n, b) => n + b.daDoc.length, 0),
    dat: kq.dat,
  }, null, 2));
}

xong();
