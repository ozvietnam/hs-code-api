// Cổng ranh giới 6→8 số — vòng gia cố 4 (#577: soát 21 PR thợ #620–#647). Mỗi mục kèm test đỏ trước.
// Chỉ đọc bản nháp ĐÔNG CỨNG (scripts/fixtures/ho-so/ranh-gioi-7559407/, ranh-gioi-88444a8/, ranh-gioi-pr/) — KHÔNG đọc
// bản nháp sống của data/ho-so; không đọc data/bench/, data/oz-export/.
import './test-isolate-data.mjs';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import { nhapDongCung, gieoNhap, THU_MUC_DONG_CUNG_88444A8, nhapPr } from './fixtures/ho-so/nhap-dong-cung.mjs';
const require = createRequire(import.meta.url);
const C = require('../lib/ho-so/cong-ranh-gioi.js');
const V = require('../lib/ho-so/tach-ve.js');
const ML = require('../lib/ho-so/ma-loi.js');
const DK = require('../lib/dieu-kien-so.js');
const TV = require('../lib/tu-vung.js');

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${typeof x === 'string' ? x : JSON.stringify(x)}`); } };
const co = (ds, tien) => ds.some((l) => l.startsWith(tien));
const cli = (...a) => spawnSync(process.execPath, ['scripts/so-hoa-ranh-gioi.mjs', ...a], { encoding: 'utf8', env: process.env });
const menhDe = (ma) => { const c = V.chuBieu(ma); return V.tachVe(c.vi, c.en).ve.map((v) => v.menhDe); };
const docMd = (p) => fs.readFileSync(path.join('docs', 'giao-viec', 'so-tay', p), 'utf8');
const nhap88 = (pn6) => nhapDongCung(pn6, THU_MUC_DONG_CUNG_88444A8);

// ── 1. Hướng dẫn cho thợ: không đổi khoá để né điểm mù; QUY-TRINH/LUAT-CHUNG có ví dụ cho các lỗi lặp lại ─────────────────
{
  for (const ma of ['cong2-diem-mu:dungCho:8517624>85176243', 'cong2-dong-khong-toi-duoc:85176261']) {
    const g = ML.giaiThich(ma) || {};
    check(`1a ${ma.split(':')[0]}: gợi ý KHÔNG bảo đổi sang khoá khác`, !/khoá khác|đổi khoá|congDung thay|tenLoai thay/iu.test(`${g.giaiThich} ${g.cachSua}`), g.cachSua);
    check(`1b ${ma.split(':')[0]}: gợi ý nói giữ CÙNG khoá cho anh em + DỪNG khi vẫn không tới`, /cùng (?:một )?khoá/iu.test(g.cachSua || '') && /DỪNG/u.test(g.cachSua || ''), g.cachSua);
  }
  const qt = docMd('QUY-TRINH-SO-HOA.md');
  check('1c QUY-TRINH: không còn "sau khi đã thử đổi khoá"', !/sau khi đã thử đổi khoá/u.test(qt));
  check('1d QUY-TRINH: "Loại khác" trần không ghi DE_TRONG (ví dụ)', /Loại khác"? trần[^\n]*DE_TRONG|DE_TRONG[^\n]*"Loại khác" trần/u.test(qt) && /cong5-de-trong-chua-xu-ly/u.test(qt));
  check('1e QUY-TRINH: cấm đổi khoá (congDung/tenLoai thay dungCho) để né cong2-diem-mu — có ví dụ 851762', /né[^\n]*cong2-diem-mu|cong2-diem-mu[^\n]*né/u.test(qt) && /851762/u.test(qt));
  check('1f QUY-TRINH: không nuốt "và (các) bộ phận của chúng" và chất liệu của hàng ĐÍCH ("ống bằng gang đúc")', /bộ phận của chúng/u.test(qt) && /gang đúc/u.test(qt));
  check('1g QUY-TRINH: cặp tên ↔ công dụng hai anh em là DỪNG (ví dụ 940541)', /940541/u.test(qt) && /tên ↔ công dụng/u.test(qt));
  check('1h QUY-TRINH: LIET_KE phủ đúng các vế của tiêu đề ⇒ BO_VE (ví dụ 8536503)', /8536503/u.test(qt) && /NGAT_SOC_DONG/u.test(qt));
  check('1i QUY-TRINH: quy ước "X và bộ phận" nhiều anh em (871410, 845290) + khong-tat-dinh vẫn là lỗi', /871410/u.test(qt) && /845290/u.test(qt) && /khong-tat-dinh/u.test(qt));
  check('1j QUY-TRINH: nhãn tuVung theo từ vựng của lần chạy (--nhan-tu-vung)', /--nhan-tu-vung/u.test(qt));
  check('1k LUAT-CHUNG ghi các quyết định vòng 4', /dải mã|8701\.91 đến 8701\.95/u.test(docMd('LUAT-CHUNG.md')) && /tên ↔ công dụng/u.test(docMd('LUAT-CHUNG.md')));
}

// ── 2. dungCho theo DẢI mã: "8701.91 đến 8701.95" ⇒ mọi mã của dải có trong cây (cổng + bộ so lúc chạy dùng chung) ─────────
{
  const ma = DK.maThamChieu('xe kéo thuộc phân nhóm 8701.10 hoặc 8701.91 đến 8701.95');
  check('2a maThamChieu nở dải 8701.91 đến 8701.95 ⇒ 870191…870195 (+ 870110)', ['870110', '870191', '870192', '870193', '870194', '870195'].every((x) => ma.includes(x)) && !ma.includes('870196'), ma);
  check('2b "từ 8701.91 đến 8701.95" và "8701.91–8701.95" cũng nở', DK.maThamChieu('từ 8701.91 đến 8701.95').includes('870193') && DK.maThamChieu('phân nhóm 8701.91–8701.95').includes('870194'), [DK.maThamChieu('từ 8701.91 đến 8701.95'), DK.maThamChieu('phân nhóm 8701.91–8701.95')]);
  check('2c dải nhóm "87.01 đến 87.03" ⇒ 8701, 8702, 8703; chỉ mã có trong cây', ['8701', '8702', '8703'].every((x) => DK.maThamChieu('nhóm 87.01 đến 87.03').includes(x)) && DK.maThamChieu('nhóm 87.01 đến 87.03').length === 3, DK.maThamChieu('nhóm 87.01 đến 87.03'));
  check('2d không nở bừa: hai mã khác cấp / ngược chiều / không có "đến"', DK.maThamChieu('8701.91 và 87.05').length === 2 && DK.maThamChieu('8701.95 đến 8701.91').length === 2, [DK.maThamChieu('8701.91 và 87.05'), DK.maThamChieu('8701.95 đến 8701.91')]);
  const c11 = { fact: 'dungCho', op: 'CONG_DUNG', value: 'xe kéo thuộc phân nhóm 8701.10 hoặc 8701.91 đến 8701.95' };
  check('2e bộ so lúc chạy: hàng cho xe kéo 8701.93 THOẢ .11 (trước: TRÁI)', DK.danhGiaDieuKien(c11, { fact: 'dungCho', giaTri: 'phân nhóm 8701.93' }).trangThai === 'THOA');
  check('2f … xe kéo 8701.99 (ngoài dải) vẫn TRÁI', DK.danhGiaDieuKien(c11, { fact: 'dungCho', giaTri: 'phân nhóm 8701.99' }).trangThai === 'TRAI');
  // 848390 (đông cứng, main 88444a8): xe kéo 8701.92 (GIỮA dải) — trước đây .11 TRÁI và luật đi đẩy hàng sang .13 "xe kéo
  // KHÁC thuộc nhóm 87.01" (sai mã); nay chỉ .11 CO.
  const b = nhap88('848390');
  const soTay = C.soTayTuNhap('848390', b);
  const dk = [{ fact: 'dungCho', giaTri: 'phân nhóm 8701.92' }, { fact: 'laBoPhan', giaTri: true }, { fact: 'congDung', giaTri: '8483.10' }].map((x) => ({ ...x, nguon: 'KHACH', trangThai: 'DA_CO' }));
  const coDong = ['84839011', '84839013', '84839014', '84839015', '84839019'].filter((hs) => DK.doiChieuDong8(hs, dk, { soTay }).ketQua === 'CO');
  check('2g 848390 đông cứng: bộ phận cho xe kéo 8701.92 ⇒ chỉ .11 CO (không rơi sang .13 "xe kéo khác")', coDong.length === 1 && coDong[0] === '84839011', coDong);
  const r2 = C.kiemRanhGioi('848390', b);
  check('2h … cổng (có thử mã giữa dải) vẫn XANH cho 848390 đông cứng', r2.hopLe === true, r2.loi);
}

// ── 3. Chồng lấn TRỤC tên ↔ công dụng ở cấp DÒNG (hai anh em, không tiêu đề) — 940541 ────────────────────────────────────
{
  const b = nhapPr('940541', '662e097');
  const r = C.kiemRanhGioi('940541', b, { cong: [2, 3] });
  check('3a 940541 (PR #627): .10 "Đèn pha"/.20 "Đèn rọi" (tên) ↔ .30 vế B dungCho (công dụng) ⇒ cong2-chong-lan-truc + DỪNG', co(r.loi, 'cong2-chong-lan-truc:') && co(r.dung, 'cong2-chong-lan-truc:'), r.loi);
  check('3b … cặp đã khai (.10↔.30, .20↔.30) thành lỗi cong2-chong-lan-van-ban-truc', co(r.loi, 'cong2-chong-lan-van-ban-truc:94054110+94054130:') && co(r.loi, 'cong2-chong-lan-van-ban-truc:94054120+94054130:'), r.loi.filter((l) => l.includes('van-ban')));
  const r2 = C.kiemRanhGioi('940542', nhapDongCung('940542'), { cong: [2, 3] });
  check('3c 940542 (cùng cấu trúc) cũng DỪNG trục', co(r2.dung, 'cong2-chong-lan-truc:'), r2.loi);
  const r3 = C.kiemRanhGioi('853641', nhap88('853641'));
  check('3d 853641 (loaiRoLe LIET_KE ↔ dungCho — không phải tên thuần) vẫn XANH, không trục', r3.hopLe === true && !co(r3.loi, 'cong2-chong-lan-truc'), r3.loi);
  const r4 = C.kiemRanhGioi('853620', nhapDongCung('853620'));
  check('3e 853620 (dòng ↔ tiêu đề, dongDien ↔ dungCho) vẫn XANH', r4.hopLe === true, r4.loi);
}

// ── 4. chiHoacChuYeu: "được thiết kế chỉ để", "designed only for" ──────────────────────────────────────────────────────
{
  const CH = { fact: 'chiHoacChuYeu', op: 'CO' };
  const t = '85176243 - - - - Bộ điều khiển và bộ thích ứng (adaptor), kể cả cổng nối, cầu nối, bộ định tuyến và các thiết bị tương tự khác được thiết kế chỉ để kết nối với máy xử lý dữ liệu tự động thuộc nhóm 84.71 ';
  check('4a cổng 3 nhận chiHoacChuYeu CO trên câu 85176243 ("được thiết kế chỉ để")', DK.kiemDieuKien(CH, t) === null, DK.kiemDieuKien(CH, t));
  check('4b "thiết kế chỉ để" (không "được") cũng đọc', DK.kiemDieuKien(CH, 'Thiết bị thiết kế chỉ để lắp vào máy') === null);
  check('4c EN "designed only for" / "solely designed for"', DK.kiemDieuKien(CH, 'apparatus designed only for connection') === null && DK.kiemDieuKien(CH, 'parts solely designed for machines') === null);
  const tv1 = TV.taiTuVung('tu-vung@1'); const tv2 = TV.taiTuVung('tu-vung@2');
  check('4d tu-vung@2 vẫn là siêu tập của @1; @1 không đổi (67de4948a117)', TV.kiemSieuTap(tv1, tv2).length === 0 && TV.sha256Tep('data/tu-vung/tu-vung@1.json').startsWith('67de4948a117'));
  const tvb = V.tachVe(V.chuBieu('85176243').vi).chu;
  check('4e cổng 5 neo chiHoacChuYeu vào "được thiết kế chỉ"', V.neoMot(CH, tvb).some(([a, b2]) => /thiết kế chỉ/u.test(tvb.slice(a, b2))), V.neoMot(CH, tvb).map(([a, b2]) => tvb.slice(a, b2)));
}

// ── 5. Bộ tách vế: "có dải …", "có hình dạng đặc biệt hoặc thích hợp để …", "kể cả … gồm …" ─────────────────────────────
{
  const g1 = menhDe('85181011')[0].filter((x) => x.loai === 'GIOI_HAN');
  check('5a 85181011: "có dải" không còn là vế riêng — "có dải tần số từ 300 Hz đến 3.400 Hz" là MỘT vế biên số', !g1.some((x) => x.chu === 'có dải') && g1.some((x) => /^có dải tần số từ 300 Hz đến 3\.400 Hz$/u.test(x.chu)), g1.map((x) => x.chu));
  const b1 = nhapPr('851810', '6d2f78f');
  const r1 = C.kiemRanhGioi('851810', b1, { cong: [5] });
  check('5b 851810 (PR #637, không BO_VE): không cong5-ve-gioi-han-bi-bo:85181011', !co(r1.loi, 'cong5-ve-gioi-han-bi-bo:85181011'), r1.loi);
  const g2 = menhDe('39231020')[0].filter((x) => x.loai === 'GIOI_HAN');
  check('5c 39231020: "có hình dạng đặc biệt hoặc thích hợp để …" là MỘT vế (chữ Anh "specially shaped or fitted for")', !g2.some((x) => x.chu === 'có hình dạng đặc biệt') && g2.some((x) => /^có hình dạng đặc biệt hoặc thích hợp để vận chuyển/u.test(x.chu)), g2.map((x) => x.chu));
  const b2 = nhapPr('392310', 'd28e7ac');
  b2.ghiChuSoan = b2.ghiChuSoan.filter((g) => g.loai !== 'DE_TRONG');
  const r2 = C.kiemRanhGioi('392310', b2, { cong: [5] });
  check('5d 392310 (PR #629, bỏ DE_TRONG, không BO_VE): không cong5-ve-gioi-han-bi-bo:39231020', !co(r2.loi, 'cong5-ve-gioi-han-bi-bo:39231020'), r2.loi);
  const khongEn = V.tachVe('Loại khác, có hình dạng đặc biệt hoặc thích hợp để vận chuyển tấm bán dẫn').ve[0].menhDe.filter((x) => x.loai === 'GIOI_HAN');
  check('5e thận trọng: không có chữ Anh xác nhận ⇒ vẫn tách "có hình dạng đặc biệt" (giữ cờ)', khongEn.some((x) => x.chu === 'có hình dạng đặc biệt'), khongEn.map((x) => x.chu));
  const enKhac = V.tachVe('Hộp có hình dạng đặc biệt hoặc thích hợp để đựng bút', 'Boxes of special shape, or suitable for pens').ve[0].menhDe.filter((x) => x.loai === 'GIOI_HAN');
  check('5f thận trọng: chữ Anh không có cấu trúc "X or Y for" chung ⇒ vẫn tách', enKhac.some((x) => x.chu === 'có hình dạng đặc biệt'), enKhac.map((x) => x.chu));
  const g3 = menhDe('8536505')[1];
  check('5g 8536505 vế 2: "gồm một tranzito và một chip logic" là vế GIỚI HẠN (không nuốt vào "kể cả …")', g3.some((x) => x.loai === 'GIOI_HAN' && /^gồm một tranzito và một chip logic/u.test(x.chu)) && g3.some((x) => x.loai === 'PHU' && x.chu === 'kể cả công tắc bảo vệ quá nhiệt điện tử'), g3.map((x) => `${x.loai}:${x.chu}`));
  const bg = V.tachVe('Loại có đường kính (bao gồm cả lốp) trên 100 mm; bảng phân phối, bao gồm cả panel đỡ; tủ gồm cả giá đỡ').ve.flatMap((v) => v.menhDe);
  check('5h "bao gồm", "gồm cả" vẫn là PHU (kể cả), không thành vế giới hạn', !bg.some((x) => x.loai === 'GIOI_HAN' && /^(?:bao )?gồm/u.test(x.chu)), bg.map((x) => `${x.loai}:${x.chu}`));
}

// ── 7. "X và (các) bộ phận của chúng" nhiều anh em: chồng lấn do bộ so chữ tự do VẪN là lỗi (chính sách cổng 2 không đổi) ──
{
  const b = nhapPr('871410', 'dec1594');
  const HO = (ds) => { const ten = ds.find((c) => c.fact === 'tenLoai'); return [{ op: 'HOAC', phuongAn: [[ten], [{ fact: 'laBoPhan', op: 'CO' }, { fact: 'dungCho', op: 'CONG_DUNG', value: ten.value }]] }]; };
  for (const hs of ['87141030', '87141040', '87141060', '87141070']) { const m = b.dong8.find((x) => x.hs === hs); m.dieuKienSo = HO(m.dieuKienSo); }
  b.ghiChuSoan = b.ghiChuSoan.filter((g) => g.loai !== 'DE_TRONG');
  const r = C.kiemRanhGioi('871410', b, { cong: [2, 5] });
  const cl = r.loi.filter((l) => l.startsWith('cong2-chong-lan:'));
  check('7a 871410 dạng HOAC: vế mở phủ (không cong5-ve-mo-bi-bo)', !co(r.loi, 'cong5-ve-mo-bi-bo'), r.loi.filter((l) => l.startsWith('cong5')));
  check('7b … chồng lấn tên trần ↔ "bộ phận của …" đều :khong-tat-dinh và VẪN là lỗi (không hạ thành cảnh báo)', cl.length > 0 && cl.every((l) => l.endsWith(':khong-tat-dinh')) && !co(r.canhBao, 'cong2-chong-lan:'), cl.length);
}

// ── 8. Nhãn tuVung theo từ vựng của lần chạy: --nhan-tu-vung chỉ đổi đúng dòng nhãn ─────────────────────────────────────
{
  const goc = fs.readFileSync(path.join(THU_MUC_DONG_CUNG_88444A8, '848390.json'), 'utf8');
  check('8a fixture 848390 mang nhãn tu-vung@1', /"tuVung": "tu-vung@1"/.test(goc));
  const p = gieoNhap('848390', JSON.parse(goc));
  fs.writeFileSync(p, goc); // giữ nguyên định dạng gốc
  const k = cli('--nhan-tu-vung', '--pn6=848390');
  const sau = fs.readFileSync(p, 'utf8');
  const khac = goc.split('\n').filter((l, i) => l !== sau.split('\n')[i]);
  check('8b --nhan-tu-vung: nhãn thành tu-vung@2, chỉ đúng MỘT dòng đổi', k.status === 0 && /"tuVung": "tu-vung@2"/.test(sau) && khac.length === 1 && goc.split('\n').length === sau.split('\n').length, { status: k.status, out: k.stdout + k.stderr, khac });
  // Bản nháp NHAP mà sinh lại từ spec thì đổi cả trường khác ⇒ bỏ qua, không ghi.
  const lech = JSON.parse(goc); lech.dong8.find((m) => m.hs === '84839014').dieuKienSo = [{ fact: 'dungCho', op: 'CONG_DUNG', value: 'nhóm 87.11' }];
  const lechTxt = `${JSON.stringify(lech, null, 2)}\n`;
  fs.writeFileSync(p, lechTxt);
  const k2 = cli('--nhan-tu-vung', '--pn6=848390');
  check('8c bản NHAP lệch spec ⇒ BỎ QUA (không ghi), in lý do', fs.readFileSync(p, 'utf8') === lechTxt && /BỎ QUA/u.test(k2.stdout), k2.stdout + k2.stderr);
  // Bản DUYET: chỉ đổi nhãn, băm duyệt không đổi (tuVung ngoài băm) ⇒ cổng 0 vẫn xanh.
  const d = nhapDongCung('853620'); const dTxt = `${JSON.stringify({ ...d, tuVung: 'tu-vung@1' }, null, 2)}\n`;
  const pd = gieoNhap('853620', d); fs.writeFileSync(pd, dTxt);
  const k3 = cli('--nhan-tu-vung', '--pn6=853620');
  const dSau = JSON.parse(fs.readFileSync(pd, 'utf8'));
  check('8d bản DUYET: chỉ đổi nhãn, cổng 0 xanh (băm duyệt không đổi)', k3.status === 0 && dSau.tuVung === 'tu-vung@2' && C.kiemRanhGioi('853620', dSau, { cong: [0] }).hopLe, k3.stdout + k3.stderr);
}

console.log(`\n${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
