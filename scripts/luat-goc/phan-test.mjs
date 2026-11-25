#!/usr/bin/env node
/**
 * scripts/luat-goc/phan-test.mjs — Kiểm tra ngoại tuyến kho data/luat-goc/phan.jsonl và bộ trích phan-trich.mjs.
 * Chạy được 100% trong CI (không cần PDF/txt ngoài repo); nếu có LUAT_GOC_TXT thì đối chiếu luôn nguyên văn.
 */
import fs from 'node:fs';
import path from 'node:path';
import { boKiem, GOC } from '../lib-luat.mjs';
import { docBanChu, kiemKho, NGU_PHAP } from '../kiem-luat-goc.mjs';
import {
  ROMANS,
  SUA_TAY,
  lamSachDongPhan,
  phanTichMotPhan,
} from './phan-trich.mjs';

const { kiem, xong } = boKiem('phan-test');

const pPhan = path.join(GOC, 'data/luat-goc/phan.jsonl');
const pBatBuoc = path.join(GOC, 'data/luat-goc/bat-buoc.json');
kiem('tồn tại data/luat-goc/phan.jsonl', fs.existsSync(pPhan));

const rawLines = fs.readFileSync(pPhan, 'utf8').split('\n').filter((x) => x.trim());
const nuts = rawLines.map((l) => JSON.parse(l));
const byId = new Map(nuts.map((n) => [n.id, n]));
const batBuoc = JSON.parse(fs.readFileSync(pBatBuoc, 'utf8'));

kiem('tổng 701 nút (21 TEN + 204 CG + 34 CGPN + 442 KQ, mỗi đoạn in một nút)',
  nuts.length === 701 &&
  nuts.filter((x) => x.loai === 'TEN').length === 21 &&
  nuts.filter((x) => x.loai === 'CHU_GIAI').length === 204 &&
  nuts.filter((x) => x.loai === 'CHU_GIAI_PHAN_NHOM').length === 34 &&
  nuts.filter((x) => x.loai === 'KHAI_QUAT').length === 442
);

const banChu = process.env.LUAT_GOC_TXT ? docBanChu(process.env.LUAT_GOC_TXT, 'phan') : [];
const kqKiem = kiemKho('phan', rawLines, {
  vanBan: banChu.length ? banChu : null,
  kyVong: batBuoc.phan || null,
});
kiem(`kiemKho(phan) 0 lỗi, 0 cảnh báo (${banChu.length ? 'đối chiếu bản chữ' : 'chế độ ngoại tuyến CI'})`,
  kqKiem.loi.length === 0 && kqKiem.canhBao.length === 0,
  [...kqKiem.loi, ...kqKiem.canhBao].join(' | ')
);

// Kiểm tra đủ 21 Phần I..XXI theo thứ tự trang tăng dần
const roots = ROMANS.map((r) => byId.get(`phan:${r}`));
kiem('đủ 21 nút gốc phan:I..phan:XXI, trang tăng dần',
  roots.every((n, i) =>
    n &&
    n.loai === 'TEN' &&
    n.lop === 'LUAT' &&
    n.cha === null &&
    n.so === null &&
    n.nguyenVan.startsWith(`PHẦN ${ROMANS[i]}:`) &&
    (i === 0 || n.nguon.trang > roots[i - 1].nguon.trang)
  )
);

// Kiểm tra quan hệ cha-con và lớp luật
const viTri = new Map(nuts.map((n, i) => [n.id, i]));
kiem('mọi nút đều khớp NGU_PHAP, đúng lớp LUAT/HUONG_DAN, cha là tiền tố hợp lệ (kq: Phần, hoặc đoạn kq đứng trước cùng Phần)',
  nuts.every((n) => {
    if (!NGU_PHAP.test(n.id)) return false;
    if (n.loai === 'KHAI_QUAT' && n.lop !== 'HUONG_DAN') return false;
    if (n.loai !== 'KHAI_QUAT' && n.lop !== 'LUAT') return false;
    if (n.loai === 'KHAI_QUAT' && /:kq:\d+$/.test(n.cha || '')) {
      if (!byId.has(n.cha) || n.cha.split(':')[1] !== n.id.split(':')[1] || viTri.get(n.cha) >= viTri.get(n.id)) return false;
    } else if (n.cha !== null && (!byId.has(n.cha) || !n.id.startsWith(`${n.cha}:`))) return false;
    return n.nguon?.ban === 'HS2022' && Number.isInteger(n.nguon?.trang) && n.nguon.trang >= (n.nguon.soCongBao ? 1 : 8); // chữ theo TT31: trang Công báo
  })
);

// 12 Phần không có Chú giải Phần chỉ có đúng 1 nút TEN
const phanKhongChuGiai = ['III', 'V', 'VIII', 'IX', 'X', 'XII', 'XIII', 'XIV', 'XVIII', 'XIX', 'XX', 'XXI'];
kiem('12 Phần không có Chú giải chỉ có đúng 1 nút TEN',
  phanKhongChuGiai.every((r) => nuts.filter((n) => n.id === `phan:${r}` || n.id.startsWith(`phan:${r}:`)).length === 1)
);

// Điểm kiểm tra bắt buộc theo #1899 và điểm mới HS 2022
kiem('phan:XV:cg:2:a giữ nguyên dẫn chiếu (nhóm 90.21)', byId.get('phan:XV:cg:2:a')?.nguyenVan.includes('(nhóm 90.21)'));
kiem('phan:XV:cg:9:c có định nghĩa Dây và tỷ lệ 1/10 chiều rộng',
  byId.get('phan:XV:cg:9:c')?.nguyenVan.includes('Dây') && byId.get('phan:XV:cg:9:c')?.nguyenVan.includes('1/10 chiều rộng')
);
kiem('phan:XVI:cg:2:b có quy định nhóm 85.24 về nhóm 85.29', byId.get('phan:XVI:cg:2:b')?.nguyenVan.includes('85.24'));
kiem('phan:XVI:cg:6:B dẫn chiếu rác thải điện tử nhóm 85.49', byId.get('phan:XVI:cg:6:B')?.nguyenVan.includes('85.49'));
kiem('phan:VI:cg:4 có ưu tiên 38.27 (mới HS 2022)', byId.get('phan:VI:cg:4')?.nguyenVan.includes('38.27'));
kiem('phan:XI:cg:15 có quy định hàng dệt kết hợp điện tử/cơ khí', byId.get('phan:XI:cg:15')?.nguyenVan.includes('thành phần hóa học'));
kiem('phan:XI:cg:1:v không bị nhận nhầm thành La Mã :u:v', byId.has('phan:XI:cg:1:v') && !byId.has('phan:XI:cg:1:u:v'));
const kqXI = nuts.filter((n) => n.id.startsWith('phan:XI:kq:'));
kiem('Phần XI giữ đủ BẢNG I (Dạng sợi … Nhóm 56.07) và BẢNG II (Cách đóng gói …), mỗi bảng một nút nhiều dòng',
  kqXI.some((n) => n.nguyenVan === 'BẢNG I:') && kqXI.some((n) => n.nguyenVan === 'BẢNG II') &&
  kqXI.filter((n) => n.nguyenVan.split('\n').length > 30).length === 2
);
// Mỗi đoạn in một nút: không nút khái quát nào dồn hai mục; mục dưới câu dẫn có cha là câu dẫn
kiem('kq đánh số liền theo thứ tự in trong từng Phần',
  ['VI', 'VII', 'XI', 'XV', 'XVI', 'XVII'].every((r) => nuts.filter((n) => n.id.startsWith(`phan:${r}:kq:`)).every((n, i) => n.id === `phan:${r}:kq:${i + 1}`))
);
const danXV = byId.get(nuts.find((n) => n.nguyenVan.startsWith('(b) Dạng keo lỏng của kim loại cơ bản'))?.cha);
kiem('Phần XV: "(b) Dạng keo lỏng…" có cha là câu "nhóm này không bao gồm:", câu tách mang dan', (() => {
  const b = nuts.find((n) => n.nguyenVan.startsWith('(b) Dạng keo lỏng của kim loại cơ bản'));
  const cau = fs.readFileSync(path.join(GOC, 'data/luat-goc/cau/phan.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  return /nhóm này không bao gồm:$/.test(danXV?.nguyenVan || '') && cau.find((c) => c.id === `${b.id}#1`)?.dan === `${danXV.id}#1`;
})());

// Không lọt chú thích ảnh HQKV8 nào
const lotAnh = SUA_TAY.anhTrangTrinh.filter((a) =>
  nuts.some((n) => n.nguyenVan.includes(a.chu))
);
kiem('không sót chú thích ảnh trang trí HQKV8 nào trong kho', lotAnh.length === 0, JSON.stringify(lotAnh));

// Kiểm tra nút đoạn kết (:ket): cha = khoản, so: null, đứng sau các điểm con, nút khoản chỉ giữ câu dẫn
const idxOf = new Map(nuts.map((n, i) => [n.id, i]));
kiem('nút đoạn kết :ket hợp lệ (so=null, đứng sau điểm con, không còn doanSau)',
  ['phan:XV:cg:2', 'phan:XVII:cg:5', 'phan:XI:cgpn:1:g'].every((cha) => {
    const ket = byId.get(`${cha}:ket`);
    const nutCha = byId.get(cha);
    const conThuong = nuts.filter((n) => n.cha === cha && !n.id.endsWith(':ket'));
    const maxConIdx = Math.max(...conThuong.map((c) => idxOf.get(c.id)));
    return ket && ket.cha === cha && ket.so === null && idxOf.get(ket.id) > maxConIdx && /:\s*$/.test(nutCha?.nguyenVan || '');
  }) && nuts.every((n) => n.doanSau === undefined)
);

// Unit test ngoại tuyến cho phan-trich.mjs: tách La Mã (i),(ii) vs chữ cái (v), tách 6 (A) không chấm
const fakePages = new Array(8).fill('');
fakePages[7] = [
  'PHẦN I: TIÊU ĐỀ',
  'THỬ NGHIỆM',
  'Chú giải.',
  '1. Danh sách mẫu:',
  '(u) Mục u;',
  '(v) Mục v.',
  '2. Số đo:',
  '(a) Nhóm a:',
  '(i) Ý i;',
  '(ii) Ý ii.',
  'Phong cảnh Vịnh Hạ Long',
  '— 8 —',
].join('\n');
const fakeDong = lamSachDongPhan(fakePages, { roman: 'I', startPage: 8, endPage: 8 });
const fakeNuts = phanTichMotPhan(fakeDong, 'I', 8);
const fakeIds = new Set(fakeNuts.map((x) => x.id));
kiem('unit test: phân biệt (v) chữ cái với (i)/(ii) La Mã và bỏ chú thích ảnh',
  fakeIds.has('phan:I:cg:1:v') &&
  fakeIds.has('phan:I:cg:2:a:i') &&
  fakeIds.has('phan:I:cg:2:a:ii') &&
  !fakeNuts.some((x) => x.nguyenVan.includes('Vịnh Hạ Long'))
);

xong();
