#!/usr/bin/env node
// scripts/test-doc-mot-lan.mjs — M-82 (#2483, ADR-0011): bộ kiểm tự động cho goi-chuong.mjs, goi-nhom.mjs (--soan-mu),
// và doc-mot-lan.mjs (kiểm khuôn chuẩn QT + kiểm trích nguyên văn tất định + dựng bảng/kết quả + cảnh báo cổng 6–14 không chặn).
// Tất định, không mạng, không gọi mô hình ngôn ngữ.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { napLuatCong, vanTay } from './ho-so-ma/cong.mjs';
import { napBieuMeta } from './ho-so-ma/bang-anh-em.mjs';
import { dungGoiChuong, chuanChuong2 } from './ho-so-ma/goi-chuong.mjs';
import { dungGoiNhom, thuThapCayNhom } from './ho-so-ma/goi-nhom.mjs';
import {
  kiemTrichNguyenVan,
  kiemMoHoDocMotLan,
  kiemKhoDocMotLan,
  dungBangVaKetQuaDocMotLan,
  kiemDocMotLanChuong,
} from './ho-so-ma/doc-mot-lan.mjs';

const GOC = fileURLToPath(new URL('..', import.meta.url));
const LUAT_THAT = path.join(GOC, 'data', 'luat-goc');
const HO_SO_THAT = path.join(GOC, 'data', 'ho-so-ma');

let xanh = 0;
let do_ = 0;
function ca(ten, dieuKien, chiTiet = '') {
  if (dieuKien) {
    xanh += 1;
    console.log(`PASS ${ten}`);
  } else {
    do_ += 1;
    const msg = typeof chiTiet === 'string' ? chiTiet : JSON.stringify(chiTiet).slice(0, 500);
    console.log(`FAIL ${ten}${msg ? ` — ${msg}` : ''}`);
  }
}

const L = napLuatCong(LUAT_THAT);
const bieuMeta = napBieuMeta(LUAT_THAT);

// ── 1. Kiểm goi-chuong.mjs (bậc 2 Chương 94) & goi-nhom.mjs (--soan-mu) ────────────────────────────
const goiCh94 = dungGoiChuong('94', { luat: LUAT_THAT, L });
const goiCh94Lan2 = dungGoiChuong('chuong:94', { luat: LUAT_THAT, L });
ca(
  'goi-chuong(94): đúng khuôn goi-chuong@1, Phần XX, đủ 6 nhóm 9401..9406, vân tay lặp lại y hệt',
  goiCh94.khuon === 'goi-chuong@1'
    && goiCh94.phan === 'XX'
    && JSON.stringify(goiCh94.cacNhom.map((n) => n.nhom)) === JSON.stringify(['9401', '9402', '9403', '9404', '9405', '9406'])
    && goiCh94.vanTayGoi === goiCh94Lan2.vanTayGoi,
  { phan: goiCh94.phan, nhom: goiCh94.cacNhom.map((n) => n.nhom) },
);
ca(
  'goi-chuong(94): có đủ GIR, chú giải pháp lý (:cg:), khái quát (:kq:), cạnh loại trừ ra/vào và ứng viên timCgct; 0 tb:/wco:',
  goiCh94.gir.length >= 6
    && goiCh94.luatNen.chuongCg.length > 0
    && goiCh94.luatNen.chuongKq.length > 0
    && goiCh94.loaiTru.ra.length > 0
    && goiCh94.loaiTru.vao.length > 0
    && goiCh94.chuongCanhTranh.length > 0
    && goiCh94.canhTranhTimThay.length > 0
    && goiCh94.cauTrongGoi.every((c) => !/^(?:tb|wco):/.test(c.id)),
);

let batLoiChuongSai = false;
try { chuanChuong2('77'); } catch { batLoiChuongSai = true; }
ca('chuanChuong2 từ chối chương dự phòng 77', batLoiChuongSai);

const goi9405Mu = dungGoiNhom('9405', { luat: LUAT_THAT, L, bieuMeta, soanMu: true });
const cli9405Tmp = JSON.parse(
  execFileSync(process.execPath, [path.join(GOC, 'scripts', 'ho-so-ma', 'goi-nhom.mjs'), '--nhom', '9405', '--tom-tat'], {
    cwd: os.tmpdir(),
    encoding: 'utf8',
  }),
);
const cli9405SoanMuTmp = JSON.parse(
  execFileSync(process.execPath, [path.join(GOC, 'scripts', 'ho-so-ma', 'goi-nhom.mjs'), '--nhom', '9405', '--soan-mu', '--tom-tat'], {
    cwd: os.tmpdir(),
    encoding: 'utf8',
  }),
);
const cauIds9405Mu = new Set(goi9405Mu.cauTrongGoi.map((c) => c.id));
ca(
  'goi-nhom(9405): kèm nguyên văn GIR 1–6 + câu tên nhóm đích chú giải đẩy sang (59.08, 85.16, 85.31, 70.09, 83.03), đồng nhất vanTayGoi giữa hàm JS (--soan-mu) và CLI khác cwd',
  Array.isArray(goi9405Mu.gir)
    && goi9405Mu.gir.length >= 6
    && cauIds9405Mu.has('gir:1#1')
    && cauIds9405Mu.has('gir:3:a#1')
    && cauIds9405Mu.has('gir:3:c#1')
    && cauIds9405Mu.has('gir:6#1')
    && cauIds9405Mu.has('bieu:5908#1')
    && cauIds9405Mu.has('bieu:8516#1')
    && cauIds9405Mu.has('bieu:8531#1')
    && cauIds9405Mu.has('bieu:7009#1')
    && cauIds9405Mu.has('bieu:8303#1')
    && goi9405Mu.vanTayGoi === cli9405Tmp.vanTayGoi
    && goi9405Mu.vanTayGoi === cli9405SoanMuTmp.vanTayGoi
    && goi9405Mu.hoSoSanCo.daCo.dieuKien.length === 0
    && goi9405Mu.hoSoSanCo.nguong.length === 0
    && goi9405Mu.canhTranh === null
    && goi9405Mu.canhTranhTimThay.length > 0,
  { vanTayMu: goi9405Mu.vanTayGoi, vanTayCliTmp: cli9405Tmp.vanTayGoi, vanTayCliSoanMuTmp: cli9405SoanMuTmp.vanTayGoi },
);

// ── 2. Kiểm khuôn chuẩn QT & máy kiểm nguyên văn trên chương nhỏ 13 trong os.tmpdir() ──────────────
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'm82-test-'));
try {
  const dmhTrungModel = {
    khuon: 'doc-mot-lan-mo-ho@1',
    id: 'mh:9405:01',
    nut: 'bieu:9405',
    nhom: '9405',
    cauHoi: 'Câu hỏi pháp lý thử?',
    cachHieu: ['Cách hiểu 1', 'Cách hiểu 2'],
    canCuNguoiDoc: [{ idCau: 'bieu:9405#1', trich: L.chuCau('bieu:9405#1') }],
    nguoiDoc: 'gemini-4-hydrogen-tiered-xhigh',
    nguoiPhanBien: 'gemini-4-hydrogen-tiered-xhigh',
    soVongPhanBien: 1,
    phanBien: {
      giaiThich: 'Giải thích thử',
      chungMinh: [{ idCau: 'gir:1#1', trich: L.chuCau('gir:1#1') }],
      phanBien: 'Phản biện thử',
      ketLuan: 'CHỐT',
    },
    chotNguoiDoc: {
      dongYPhanBien: true,
      doiKetLuanSauPhanBien: false,
      ketLuanCuoi: 'CHỐT',
      lyDo: 'Đồng ý',
      cauHoiKhach: null,
    },
  };
  ca(
    'ca ngược doc-mot-lan: DIEM_MO_HO có nguoiPhanBien trùng nguoiDoc bị từ chối',
    kiemMoHoDocMotLan(dmhTrungModel, '94').some((e) => e.includes('khác với nguoiDoc')),
    kiemMoHoDocMotLan(dmhTrungModel, '94'),
  );

  const dmhThieuCauHoiKhach = {
    ...dmhTrungModel,
    nguoiPhanBien: 'gemini-4-argon-high',
    chotNguoiDoc: {
      dongYPhanBien: true,
      doiKetLuanSauPhanBien: true,
      ketLuanCuoi: 'CHƯA ĐỦ DỮ KIỆN',
      lyDo: 'Thiếu dữ kiện',
      cauHoiKhach: null,
    },
  };
  ca(
    'ca ngược doc-mot-lan: DIEM_MO_HO kết luận CHƯA ĐỦ DỮ KIỆN mà thiếu cauHoiKhach bị từ chối',
    kiemMoHoDocMotLan(dmhThieuCauHoiKhach, '94').some((e) => e.includes('cauHoiKhach')),
    kiemMoHoDocMotLan(dmhThieuCauHoiKhach, '94'),
  );

  const hoSoSaiTm = path.join(tmpRoot, 'ho-so-sai-tm');
  fs.mkdirSync(path.join(hoSoSaiTm, 'doc-mot-lan', 'abc'), { recursive: true });
  fs.mkdirSync(path.join(hoSoSaiTm, 'doc-mot-lan', '94'), { recursive: true });
  const rSaiTm = kiemKhoDocMotLan(hoSoSaiTm);
  ca(
    'ca ngược doc-mot-lan: thư mục con không phải 2 chữ số hoặc rỗng trong doc-mot-lan bị báo lỗi rõ',
    rSaiTm.loi.some((e) => e.includes('doc-mot-lan/abc')) && rSaiTm.loi.some((e) => e.includes('doc-mot-lan/94: thư mục chương rỗng')),
    rSaiTm.loi,
  );

  // Dựng chương mẫu 13 (1301, 1302) để kiểm trọn vòng dungBangVaKetQuaDocMotLan + kiemDocMotLanChuong
  const hoSoTmp = path.join(tmpRoot, 'ho-so-13');
  const dml13 = path.join(hoSoTmp, 'doc-mot-lan', '13');
  fs.mkdirSync(dml13, { recursive: true });
  const goiCh13 = dungGoiChuong('13', { luat: LUAT_THAT, L });
  const cauTenCh13 = 'bieu:13#1';
  const recCh13 = {
    khuon: 'doc-mot-lan-chuong@1',
    ma: '13',
    nut: 'chuong:13',
    phan: goiCh13.phan,
    ten: L.cay.theoId.get('bieu:13').ten,
    nguoiDoc: 'gemini-4-hydrogen-tiered-xhigh',
    vanTayGoi: goiCh13.vanTayGoi,
    canCu: [{ idCau: cauTenCh13, trich: L.chuCau(cauTenCh13) }],
    phamVi: [{ moTa: 'Nhựa cánh kiến đỏ, gôm, nhựa cây và chất chiết xuất thực vật', canCu: [{ idCau: cauTenCh13, trich: L.chuCau(cauTenCh13) }] }],
    loaiTru: [],
    dinhNghia: [],
    uuTien: [],
    trucChinh: [{ truc: 'bản chất tự nhiên vs chiết xuất', moTa: 'Chia nhựa tự nhiên 13.01 và chất chiết xuất 13.02', canCu: [{ idCau: 'bieu:1301#1', trich: L.chuCau('bieu:1301#1') }] }],
    canhTranh: [],
    diemMoHo: [],
  };
  fs.writeFileSync(path.join(dml13, 'chuong.json'), `${JSON.stringify(recCh13, null, 2)}\n`, 'utf8');

  const allDk13 = [];
  let seq = 8101;
  for (const ma4 of ['1301', '1302']) {
    const goiN = dungGoiNhom(ma4, { luat: LUAT_THAT, L, bieuMeta, soanMu: true });
    const { cayBieu } = thuThapCayNhom(ma4, L, bieuMeta);
    const dkNhom = [];
    for (const n of cayBieu) {
      if (n.loaiKhac || !n.cauIds.length) continue;
      const cid = n.cauIds[0];
      const chu = L.chuCau(cid);
      seq += 1;
      dkNhom.push({
        id: `hs:${n.id}:${seq}`,
        nut: n.id,
        loai: 'DIEU_KIEN',
        ve: 1,
        phu: false,
        kieu: 'CO_KHONG',
        mo: 'NGHIA_THUONG',
        cauHoi: `Hàng có đúng là "${chu.slice(0, 80)}" không?`,
        trich: chu,
        nguon: cid,
        vanTay: vanTay(chu),
      });
    }
    allDk13.push(...dkNhom);
    const nhomFileObj = {
      khuon: 'doc-mot-lan-nhom@1',
      nhom: {
        ma: ma4,
        nut: `bieu:${ma4}`,
        ten: L.cay.theoId.get(`bieu:${ma4}`).ten,
        nguoiDoc: 'gemini-4-hydrogen-tiered-xhigh',
        vanTayGoi: goiN.vanTayGoi,
        canCu: [{ idCau: `bieu:${ma4}#1`, trich: L.chuCau(`bieu:${ma4}#1`) }],
        dieuKienCanDu: [{ moTa: L.chuCau(`bieu:${ma4}#1`), canCu: [{ idCau: `bieu:${ma4}#1`, trich: L.chuCau(`bieu:${ma4}#1`) }] }],
        loaiTru: [],
        canhTranh: [],
        khongCanhTranh: goiN.canhTranhTimThay.map((u) => ({
          nhom: `bieu:${u.nhom}`,
          lyDo: 'Khác bản chất hàng hoá theo tên nhóm nguyên văn',
          canCu: [{ idCau: `bieu:${ma4}#1`, trich: L.chuCau(`bieu:${ma4}#1`) }],
        })),
        trucPhanNhom: [],
      },
      dieuKien: dkNhom,
      ma6: [],
      ma8: [],
      diemMoHo: [],
    };
    fs.writeFileSync(path.join(dml13, `${ma4}.json`), `${JSON.stringify(nhomFileObj, null, 2)}\n`, 'utf8');
  }
  fs.writeFileSync(path.join(dml13, 'dieu-kien.jsonl'), `${allDk13.map((x) => JSON.stringify(x)).join('\n')}\n`, 'utf8');

  const dmh13 = {
    khuon: 'doc-mot-lan-mo-ho@1',
    id: 'mh:1302:01',
    nut: 'bieu:1302',
    nhom: '1302',
    loaiMoHo: 'RANH_GIOI_CHUONG_NHOM',
    cauHoi: 'Chiết xuất thực vật pha chế đồ uống thuộc 13.02 hay Chương 21?',
    cachHieu: ['Thuộc 13.02 nếu là chiết xuất đơn thuần', 'Thuộc Chương 21 nếu đã pha chế thành chế phẩm thực phẩm'],
    canCuNguoiDoc: [{ idCau: 'bieu:1302#1', trich: L.chuCau('bieu:1302#1') }],
    nguoiDoc: 'gemini-4-hydrogen-tiered-xhigh',
    nguoiPhanBien: 'gemini-4-argon-high',
    soVongPhanBien: 1,
    phanBien: {
      giaiThich: 'Đối chiếu nguyên văn tên nhóm 13.02 và chú giải Chương 13.',
      chungMinh: [{ idCau: 'gir:1#1', trich: L.chuCau('gir:1#1') }],
      phanBien: 'Nếu đã phối trộn phụ gia thực phẩm vượt phạm vi chiết xuất nguyên liệu thì sang Chương 21.',
      ketLuan: 'CHƯA ĐỦ DỮ KIỆN',
    },
    chotNguoiDoc: {
      dongYPhanBien: true,
      doiKetLuanSauPhanBien: true,
      ketLuanCuoi: 'CHƯA ĐỦ DỮ KIỆN',
      lyDo: 'Cần biết thành phần phối trộn thực tế của sản phẩm.',
      cauHoiKhach: 'Sản phẩm là chất chiết xuất thực vật nguyên liệu hay chế phẩm đã phối trộn nhiều thành phần dùng làm đồ uống?',
    },
  };
  fs.writeFileSync(path.join(dml13, 'diem-mo-ho.jsonl'), `${JSON.stringify(dmh13)}\n`, 'utf8');

  dungBangVaKetQuaDocMotLan('13', { luat: LUAT_THAT, hoSo: hoSoTmp, L, bieuMeta, ghi: true });
  const kq13 = kiemDocMotLanChuong('13', { luat: LUAT_THAT, hoSo: hoSoTmp, L, bieuMeta, canhBaoCong: true });
  ca(
    'doc-mot-lan: chương mẫu 13 qua trọn khuôn chuẩn QT + trích nguyên văn + phủ đủ mã 6/8 số (cảnh báo cổng 6–14 không chặn)',
    kq13.ok === true && kq13.thongKe.ma8So.tong > 0 && kq13.canhBaoCong614 !== null,
    { loiKhuon: kq13.loiKhuon, loiTrich: kq13.loiTrich, loiPhu: kq13.loiPhu },
  );

  // Ca ngược: câu trích không nguyên văn trong chungMinh -> kiemDocMotLanChuong bắt đỏ ở loiTrich
  const dmhBia = {
    ...dmh13,
    phanBien: {
      ...dmh13.phanBien,
      chungMinh: [{ idCau: 'gir:1#1', trich: 'Chữ tự diễn giải không có nguyên văn trong GIR 1' }],
    },
  };
  fs.writeFileSync(path.join(dml13, 'diem-mo-ho.jsonl'), `${JSON.stringify(dmhBia)}\n`, 'utf8');
  const kq13Bia = kiemDocMotLanChuong('13', { luat: LUAT_THAT, hoSo: hoSoTmp, L, bieuMeta, canhBaoCong: false });
  ca(
    'ca ngược doc-mot-lan: câu trích không nguyên văn trong chungMinh bị bắt đỏ tức thì',
    kq13Bia.ok === false && kq13Bia.loiTrich.length === 1,
    kq13Bia.loiTrich,
  );

  // Ca ngược: bỏ sót ứng viên timCgct trong <nhóm>.json -> kiemDocMotLanChuong bắt đỏ ở loiPhu
  fs.writeFileSync(path.join(dml13, 'diem-mo-ho.jsonl'), `${JSON.stringify(dmh13)}\n`, 'utf8');
  const obj1301 = JSON.parse(fs.readFileSync(path.join(dml13, '1301.json'), 'utf8'));
  obj1301.nhom.canhTranh = [];
  obj1301.nhom.khongCanhTranh = [];
  fs.writeFileSync(path.join(dml13, '1301.json'), `${JSON.stringify(obj1301, null, 2)}\n`, 'utf8');
  const kq13ThieuCt = kiemDocMotLanChuong('13', { luat: LUAT_THAT, hoSo: hoSoTmp, L, bieuMeta, canhBaoCong: false });
  ca(
    'ca ngược doc-mot-lan: bỏ sót ứng viên timCgct trong <nhóm>.json bị bắt đỏ ở loiPhu',
    kq13ThieuCt.ok === false && kq13ThieuCt.loiPhu.some((e) => e.includes('ứng viên timCgct')),
    kq13ThieuCt.loiPhu,
  );

  // Ca ngược: vanTayGoi trong <nhóm>.json hoặc chuong.json lệch với gói dựng lại -> kiemDocMotLanChuong bắt đỏ ở loiTrich
  const obj1302 = JSON.parse(fs.readFileSync(path.join(dml13, '1302.json'), 'utf8'));
  const vanTayCu1302 = obj1302.nhom.vanTayGoi;
  obj1302.nhom.vanTayGoi = '0'.repeat(64);
  fs.writeFileSync(path.join(dml13, '1302.json'), `${JSON.stringify(obj1302, null, 2)}\n`, 'utf8');
  const kq13LechVanTay = kiemDocMotLanChuong('13', { luat: LUAT_THAT, hoSo: hoSoTmp, L, bieuMeta, canhBaoCong: false });
  ca(
    'ca ngược doc-mot-lan: vanTayGoi ghi trong <nhóm>.json lệch gói dựng lại bị bắt đỏ ở loiTrich',
    kq13LechVanTay.ok === false && kq13LechVanTay.loiTrich.some((e) => e.includes('1302.json: nhom.vanTayGoi') && e.includes('không khớp gói nhóm dựng lại')),
    kq13LechVanTay.loiTrich,
  );
  obj1302.nhom.vanTayGoi = vanTayCu1302;
  fs.writeFileSync(path.join(dml13, '1302.json'), `${JSON.stringify(obj1302, null, 2)}\n`, 'utf8');

  const ch13Lech = JSON.parse(fs.readFileSync(path.join(dml13, 'chuong.json'), 'utf8'));
  ch13Lech.vanTayGoi = 'f'.repeat(64);
  fs.writeFileSync(path.join(dml13, 'chuong.json'), `${JSON.stringify(ch13Lech, null, 2)}\n`, 'utf8');
  const kqCh13Lech = kiemDocMotLanChuong('13', { luat: LUAT_THAT, hoSo: hoSoTmp, L, bieuMeta, canhBaoCong: false });
  ca(
    'ca ngược doc-mot-lan: vanTayGoi ghi trong chuong.json lệch gói chương dựng lại bị bắt đỏ ở loiTrich',
    kqCh13Lech.ok === false && kqCh13Lech.loiTrich.some((e) => e.includes('chuong.json: vanTayGoi') && e.includes('không khớp gói chương dựng lại')),
    kqCh13Lech.loiTrich,
  );
} finally {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
}

// ── 3. Nếu kho thật đã có data/ho-so-ma/doc-mot-lan/94/ thì kiểm trực tiếp 100% ───────────────────
if (fs.existsSync(path.join(HO_SO_THAT, 'doc-mot-lan', '94'))) {
  const kq94 = kiemDocMotLanChuong('94', { luat: LUAT_THAT, hoSo: HO_SO_THAT, L, bieuMeta, canhBaoCong: true });
  ca(
    `kho thật data/ho-so-ma/doc-mot-lan/94/ đạt chuẩn QT & 100% trích nguyên văn (${kq94.thongKe?.tongCauTrichDaKiem || 0} câu trích)`,
    kq94.ok === true
      && kq94.thongKe?.soBanGhiChuong === 1
      && kq94.thongKe?.soBanGhiNhom === 6
      && kq94.thongKe?.ma8So?.tong === 127
      && kq94.thongKe?.soDiemMoHo >= 1,
    { loiKhuon: kq94.loiKhuon, loiTrich: kq94.loiTrich, loiPhu: kq94.loiPhu, thongKe: kq94.thongKe },
  );
}

ca('kiemTrichNguyenVan chặn nguồn tb: và wco:', !kiemTrichNguyenVan('tb:123#1', 'abc', L).ok && !kiemTrichNguyenVan('wco:9405:1#1', 'abc', L).ok);

console.log(`\n${xanh}/${xanh + do_} passed, ${do_} failed`);
process.exit(do_ ? 1 : 0);
