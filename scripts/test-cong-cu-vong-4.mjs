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
    check(`1a ${ma.split(':')[0]}: gợi ý KHÔNG bảo đổi sang khoá khác`, !/dùng khoá khác|chọn khoá khác/iu.test(`${g.giaiThich} ${g.cachSua}`) && /không đổi/iu.test(g.cachSua || ''), g.cachSua);
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
  // #683: cong2-chong-lan-truc vẫn là lỗi nhưng không còn DỪNG — người soạn khai chongLanTruc (test-chong-lan-truc.mjs mục 7).
  check('3a 940541 (PR #627): .10 "Đèn pha"/.20 "Đèn rọi" (tên) ↔ .30 vế B dungCho (công dụng) ⇒ cong2-chong-lan-truc (lỗi, không còn DỪNG — #683)', co(r.loi, 'cong2-chong-lan-truc:') && !co(r.dung, 'cong2-chong-lan-truc:'), r.loi);
  check('3b … cặp đã khai (.10↔.30, .20↔.30) thành lỗi cong2-chong-lan-van-ban-truc', co(r.loi, 'cong2-chong-lan-van-ban-truc:94054110+94054130:') && co(r.loi, 'cong2-chong-lan-van-ban-truc:94054120+94054130:'), r.loi.filter((l) => l.includes('van-ban')));
  const r2 = C.kiemRanhGioi('940542', nhapDongCung('940542'), { cong: [2, 3] });
  check('3c 940542 (cùng cấu trúc) cũng báo trục (lỗi, không còn DỪNG — #683)', co(r2.loi, 'cong2-chong-lan-truc:') && !co(r2.dung, 'cong2-chong-lan-truc:'), r2.loi);
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

// ── 7. "X và (các) bộ phận của chúng" nhiều anh em — quyết định GĐ 31/10 thay vòng 4: tên nguyên văn rời nhau của anh em ⇒ ──
// loại trừ (cảnh báo cong2-ten-anh-em-roi), KHÔNG hạ lỗi thành cảnh báo cong2-chong-lan. Ca tên chứa nhau: test-bo-phan-cua-chung.mjs.
{
  const b = nhapPr('871410', 'dec1594');
  const HO = (ds) => { const ten = ds.find((c) => c.fact === 'tenLoai'); return [{ op: 'HOAC', phuongAn: [[ten], [{ fact: 'laBoPhan', op: 'CO' }, { fact: 'dungCho', op: 'CONG_DUNG', value: ten.value }]] }]; };
  for (const hs of ['87141030', '87141040', '87141060', '87141070']) { const m = b.dong8.find((x) => x.hs === hs); m.dieuKienSo = HO(m.dieuKienSo); }
  b.ghiChuSoan = b.ghiChuSoan.filter((g) => g.loai !== 'DE_TRONG');
  const r = C.kiemRanhGioi('871410', b, { cong: [2, 5] });
  const cl = r.loi.filter((l) => l.startsWith('cong2-chong-lan:'));
  check('7a 871410 dạng HOAC: vế mở phủ (không cong5-ve-mo-bi-bo)', !co(r.loi, 'cong5-ve-mo-bi-bo'), r.loi.filter((l) => l.startsWith('cong5')));
  check('7b … tên đầu nguyên văn rời nhau: hết cong2-chong-lan, có cong2-ten-anh-em-roi, không hạ thành cảnh báo cong2-chong-lan', cl.length === 0 && co(r.canhBao, 'cong2-ten-anh-em-roi:') && !co(r.canhBao, 'cong2-chong-lan:'), cl);
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

// ════ 9. "X và (các) bộ phận của chúng" ở NHIỀU anh em — luật tên nguyên văn của anh em (quyết định GĐ 31/10/2026, thay mục 7 ═
// Trong một cha, tenLoai X (dòng A) ↔ laBoPhan CO + dungCho Y (dòng B), X/Y tên ĐẦU nguyên văn của chính dòng mình, rời nhau
// đúng như cổng coi hai giá trị tenLoai X ↔ tenLoai Y của anh em (không ứng viên nào thoả cả hai) ⇒ loại trừ. Tên chứa nhau, tên
// không nguyên văn, trục tên ↔ công dụng không laBoPhan ⇒ vẫn lỗi. Chỉ là luật CHỨNG MINH của cổng; runtime không đổi.
// Fixture đông cứng ranh-gioi-571d7a5/ (main 571d7a5).
const D571 = path.join(process.cwd(), 'scripts', 'fixtures', 'ho-so', 'ranh-gioi-571d7a5');
const nhap571 = (pn6) => nhapDongCung(pn6, D571);
const chong = (r) => r.loi.filter((l) => l.startsWith('cong2-chong-lan:'));
const cap = (l) => l.split(':')[1];
const HOAC = (ten) => [{ op: 'HOAC', phuongAn: [[{ fact: 'tenLoai', op: 'TEN_LOAI', value: ten }], [{ fact: 'laBoPhan', op: 'CO' }, { fact: 'dungCho', op: 'CONG_DUNG', value: ten }]] }];
const dat = (b, hs, ds) => { b.dong8.find((m) => m.hs === hs).dieuKienSo = ds; return b; };

// ── 9.1 871410 (main 571d7a5, dạng HOAC đúng QUY-TRINH 3.11): tên đầu nguyên văn rời nhau ⇒ hết chồng lấn ─────────────────
{
  const b = nhap571('871410');
  const truoc = b.dong8.filter((m) => JSON.stringify(m.dieuKienSo).includes('HOAC')).map((m) => m.hs);
  check('9.1a fixture 871410 có HOAC ở .30/.40/.60/.70', JSON.stringify(truoc) === JSON.stringify(['87141030', '87141040', '87141060', '87141070']), truoc);
  const r = C.kiemRanhGioi('871410', b, { cong: [2, 3, 5] });
  check('9.1b không còn cong2-chong-lan nào (trước: 18 cặp :khong-tat-dinh)', chong(r).length === 0, chong(r));
  check('9.1c … kể cả 6 cặp giữa chính bốn dòng HOAC (.30/.40/.60/.70)', !chong(r).some((l) => ['87141030', '87141040', '87141060', '87141070'].filter((h) => cap(l).includes(h)).length === 2), chong(r));
  check('9.1d không còn cong2-chong-lan-truc (đồ thị trục dựng trên chồng lấn thật)', !co(r.loi, 'cong2-chong-lan-truc'), r.loi);
  check('9.1e cặp được chứng minh bằng luật mới hiện cảnh báo cong2-ten-anh-em-roi cho người soát (vd .10+.30, .30+.60)', co(r.canhBao, 'cong2-ten-anh-em-roi:87141010+87141030') && co(r.canhBao, 'cong2-ten-anh-em-roi:87141030+87141060'), r.canhBao);
  check('9.1f "giảm xóc" (vế "kể cả …" ngay sau danh từ đầu .30) là tên của chính dòng: .30 ↔ .70 "Giảm thanh" không chồng', !chong(r).some((l) => cap(l) === '87141030+87141070'), chong(r));
  check('9.1g cổng 3 + 5 vẫn xanh trên fixture (luật không đụng trích/vế)', !r.loi.some((l) => /^cong[35]-/.test(l)), r.loi);
}

// ── 9.2 Không nới hơn tiền lệ tenLoai ↔ tenLoai ──────────────────────────────────────────────────────────────────────────
{
  // 2a TÊN CHỨA NHAU (845290 thật): .11 tenLoai "bàn đạp" ↔ .12 "bộ phận của Bàn" — "bàn đạp" chứa "Bàn". Trước GĐ (a)
  // (mục 10) là lỗi; nay "tên cụ thể hơn thắng" áp vào phương án HOAC + cặp chéo khoá ⇒ .11 thắng, không còn chồng lấn.
  const b = nhap571('845290');
  const ban = ['Bàn', 'tủ', 'chân máy', 'nắp'];
  dat(b, '84529012', HOAC(ban)); dat(b, '84529092', HOAC(ban));
  const r = C.kiemRanhGioi('845290', b, { cong: [2] });
  check('9.2a 845290 HOAC: .11 "bàn đạp" ↔ .12 "Bàn …, và các bộ phận của chúng" ⇒ tên cụ thể hơn thắng (mục 10), hết .11+.12', !chong(r).some((l) => cap(l) === '84529011+84529012'), chong(r));
  // Tách riêng nhánh "bộ phận" của .12 (không nhánh tên) để thấy đúng cặp chéo khoá: tenLoai "bàn đạp" ↔ bộ phận của "Bàn".
  const bp = nhap571('845290');
  dat(bp, '84529012', [{ fact: 'laBoPhan', op: 'CO' }, { fact: 'dungCho', op: 'CONG_DUNG', value: ban }]);
  const rp = C.kiemRanhGioi('845290', bp, { cong: [2] });
  check('9.2a2 … cặp chéo khoá tên CHỨA nhau: tenLoai "bàn đạp" ↔ laBoPhan + dungCho "Bàn" ⇒ tên cụ thể hơn thắng (mục 10)', !chong(rp).some((l) => cap(l) === '84529011+84529012'), chong(rp));
  check('9.2b … tương tự .91+.92', !chong(r).some((l) => cap(l) === '84529091+84529092'), chong(r));
  // 2c TÊN KHÔNG NGUYÊN VĂN của chính dòng: .60 "Má phanh" (không có trong chữ "Phanh và bộ phận của chúng") ⇒ vẫn lỗi.
  const b2 = dat(nhap571('871410'), '87141060', HOAC('Má phanh'));
  const r2 = C.kiemRanhGioi('871410', b2, { cong: [2] });
  check('9.2c 871410 .60 dùng tên "Má phanh" (không nguyên văn chữ .60) ⇒ .10+.60 vẫn chồng lấn', chong(r2).some((l) => cap(l) === '87141010+87141060'), chong(r2));
  // 2d TRỤC tên ↔ công dụng (không laBoPhan): .60 chỉ dungCho "Phanh" ⇒ vẫn chồng (không phải "bộ phận của X").
  const b3 = dat(nhap571('871410'), '87141060', [{ fact: 'dungCho', op: 'CONG_DUNG', value: 'Phanh' }]);
  const r3 = C.kiemRanhGioi('871410', b3, { cong: [2] });
  check('9.2d 871410 .60 dungCho "Phanh" KHÔNG laBoPhan (trục tên ↔ công dụng) ⇒ .10+.60 vẫn chồng lấn', chong(r3).some((l) => cap(l) === '87141010+87141060'), chong(r3));
  // 2e CÙNG tên hai bên: .70 viết tên "Phanh" (tên của .60) — dù tạm bỏ qua trích, tên trùng ⇒ không rời.
  const b4 = dat(nhap571('871410'), '87141070', HOAC('Giảm thanh'));
  b4.dong8.find((m) => m.hs === '87141050').dieuKienSo = [{ fact: 'tenLoai', op: 'TEN_LOAI', value: 'Phanh' }];
  const r4 = C.kiemRanhGioi('871410', b4, { cong: [2] });
  check('9.2e .50 tenLoai "Phanh" (không phải tên chữ .50) ↔ .60 bộ phận của "Phanh" ⇒ vẫn chồng lấn', chong(r4).some((l) => cap(l) === '87141050+87141060'), chong(r4));
  // 2f tenLoai ↔ tenLoai của anh em: hành vi cũ (tên cụ thể hơn thắng) không đổi.
  const b5 = nhap571('845290');
  const r5 = C.kiemRanhGioi('845290', b5, { cong: [2] });
  check('9.2f 845290 tenLoai trần (.11 "bàn đạp" ↔ .12 "Bàn"): như cũ, không chồng lấn (tên cụ thể hơn thắng)', chong(r5).length === 0, chong(r5));
}

// ── 9.3 Bản nháp đông cứng đang XANH có laBoPhan vẫn xanh; bản đỏ vẫn đỏ đúng chỗ ─────────────────────────────────────────
{
  const r1 = C.kiemRanhGioi('848390', nhapDongCung('848390', THU_MUC_DONG_CUNG_88444A8));
  check('9.3a 848390 (88444a8, laBoPhan + dungCho) vẫn XANH', r1.hopLe === true, r1.loi);
  const r2 = C.kiemRanhGioi('950300', nhapDongCung('950300'), { cong: [2] });
  check('9.3b 950300 (7559407): kết quả cổng 2 không đổi — không cảnh báo cong2-ten-anh-em-roi', !co(r2.canhBao, 'cong2-ten-anh-em-roi'), r2.canhBao);
  const r3 = C.kiemRanhGioi('401699', nhapDongCung('401699'), { cong: [2] });
  check('9.3c 401699 (7559407, trục tên ↔ công dụng) vẫn báo cong2-chong-lan-truc', co(r3.loi, 'cong2-chong-lan-truc'), r3.loi.slice(0, 5));
}

// ── 9.4 Lời giải thích + quy trình ghi luật mới ──────────────────────────────────────────────────────────────────────────
{
  const g = ML.giaiThich('cong2-ten-anh-em-roi:87141010+87141030') || {};
  check('9.4a ma-loi: cong2-ten-anh-em-roi có giải thích (cảnh báo, không DỪNG)', /tên/u.test(g.giaiThich || '') && /bộ phận/u.test(g.giaiThich || '') && !g.dung, g);
  const gc = ML.giaiThich('cong2-chong-lan:87141010+87141030:x:khong-tat-dinh') || {};
  check('9.4b ma-loi cong2-chong-lan: gợi ý dạng HOAC "X và bộ phận của chúng" với tên nguyên văn', /bộ phận của chúng/u.test(gc.cachSua || ''), gc.cachSua);
  const qt = fs.readFileSync(path.join('docs', 'giao-viec', 'so-tay', 'QUY-TRINH-SO-HOA.md'), 'utf8');
  check('9.4c QUY-TRINH mục 4 bước 7 thay: không còn "Cả hai: DỪNG", có luật tên nguyên văn + cong2-ten-anh-em-roi', !/Cả hai: DỪNG/u.test(qt) && /cong2-ten-anh-em-roi/u.test(qt) && /nguyên văn/u.test(qt), '');
  check('9.4d LUAT-CHUNG ghi quyết định mới (thay "VẪN là lỗi … ⇒ DỪNG" của vòng 4)', /cong2-ten-anh-em-roi/u.test(fs.readFileSync(path.join('docs', 'giao-viec', 'so-tay', 'LUAT-CHUNG.md'), 'utf8')));
  // Runtime không đổi: động cơ vẫn đánh giá dữ kiện — hàng "Yên xe" là bộ phận cho "Khung" vẫn THOẢ cả hai dòng (chưa chốt).
  const b = nhap571('871410');
  const soTay = C.soTayTuNhap('871410', b);
  const dk = [{ fact: 'tenLoai', giaTri: 'Yên xe' }, { fact: 'laBoPhan', giaTri: true }, { fact: 'dungCho', giaTri: 'Khung' }].map((x) => ({ ...x, nguon: 'KHACH', trangThai: 'DA_CO' }));
  const coDong = ['87141010', '87141030'].filter((hs) => DK.doiChieuDong8(hs, dk, { soTay }).ketQua === 'CO');
  check('9.4e runtime không đổi: dữ kiện thoả cả .10 và .30 thì động cơ vẫn thấy cả hai CO (không tự chốt)', coDong.length === 2, coDong);
}

// ════ 10. "Tên cụ thể hơn thắng" vào phương án HOAC + cặp chéo khoá (quyết định GĐ phương án (a), #600) ═══════════════════
// Cùng ngữ nghĩa với trường hợp không HOAC (DK.tenCuTheHon, không định nghĩa lại): mục có HOAC trải thành các phương án THOẢ
// trên dữ kiện; MỌI cặp phương án (A, B) phải phân được cùng một chiều. Cặp chéo khoá tenLoai X ↔ laBoPhan CO + dungCho Y: so
// tên X ↔ Y bằng tenCuTheHon (đổi dungCho phân biệt của bên "bộ phận" thành khoá tên). Ở cổng, cặp chéo khoá chỉ nhận khi X/Y là
// tên đầu NGUYÊN VĂN của chính nút rẽ nhánh (như tenAnhEmRoi). Lúc chạy doiChieuPhanNhom dùng CÙNG hàm (không có xanh giả).
// Fixture đông cứng ranh-gioi-53359a1/ (main 53359a1, sau #692: 845290 dạng HOAC, DỪNG).
const D533 = path.join(process.cwd(), 'scripts', 'fixtures', 'ho-so', 'ranh-gioi-53359a1');
const nhap533 = (pn6) => nhapDongCung(pn6, D533);
const TEN = (v) => ({ fact: 'tenLoai', op: 'TEN_LOAI', value: v });
const BP = { fact: 'laBoPhan', op: 'CO' };
const DUNG = (v) => ({ fact: 'dungCho', op: 'CONG_DUNG', value: v });
const FX = (o) => DK.chuanDuKien(Object.entries(o).map(([fact, giaTri]) => ({ fact, giaTri, nguon: 'KHACH', trangThai: 'DA_CO' })));
const BAN = ['Bàn', 'tủ', 'chân máy', 'nắp'];
const D11 = [TEN(['Thân trên và thân dưới máy', 'đế đỡ', 'bánh đà', 'bộ phận che chắn dây đai', 'bàn đạp'])];
const D12 = [{ op: 'HOAC', phuongAn: [[TEN(BAN)], [BP, DUNG(BAN)]] }];

// ── 10.1 Hàm dùng chung lib/dieu-kien-so.js#tenCuTheHonDong ───────────────────────────────────────────────────────────────
{
  check('10.1a có DK.tenCuTheHonDong (hàm dùng chung cổng + lúc chạy)', typeof DK.tenCuTheHonDong === 'function');
  const f = (...a) => (typeof DK.tenCuTheHonDong === 'function' ? DK.tenCuTheHonDong(...a) : NaN);
  const F1 = FX({ tenLoai: 'bàn đạp', laBoPhan: true, dungCho: 'Bàn' });
  check('10.1b tenCuTheHon cũ KHÔNG xét điều kiện trong HOAC (khoảng trống của runtime trước GĐ (a))', DK.tenCuTheHon(D11, D12, F1) === 0);
  check('10.1c HOAC: .11 "bàn đạp" thắng .12 (phương án tên "Bàn" + phương án bộ phận của "Bàn") — cả hai chiều gọi', f(D11, D12, F1) === 1 && f(D12, D11, F1) === -1, [f(D11, D12, F1), f(D12, D11, F1)]);
  const F2 = FX({ tenLoai: 'bàn đạp' });
  check('10.1d HOAC chỉ phương án tên THOẢ (laBoPhan chưa biết) ⇒ .11 thắng (như tenLoai ↔ tenLoai)', f(D11, D12, F2) === 1, f(D11, D12, F2));
  const F3 = FX({ tenLoai: 'bàn đạp', laBoPhan: true, dungCho: 'tủ' });
  check('10.1e một cặp phương án không phân được (bộ phận của "tủ" ↔ "bàn đạp") ⇒ 0 (mọi cặp phải phân cùng chiều)', f(D11, D12, F3) === 0, f(D11, D12, F3));
  check('10.1f chéo khoá không HOAC: tenLoai "bàn đạp" ↔ laBoPhan + dungCho "Bàn" ⇒ 1', f(D11, [BP, DUNG(BAN)], F1) === 1 && f([BP, DUNG(BAN)], D11, F1) === -1);
  check('10.1g chéo khoá cùng ngữ nghĩa tenCuTheHon, đối xứng: bộ phận của "bàn đạp" cụ thể hơn tên "Bàn" ⇒ -1', f([TEN('Bàn')], [BP, DUNG('bàn đạp')], FX({ tenLoai: 'Bàn', laBoPhan: true, dungCho: 'bàn đạp' })) === -1);
  check('10.1h chéo khoá KHÔNG laBoPhan (tên ↔ công dụng = trục) ⇒ 0', f(D11, [DUNG(BAN)], FX({ tenLoai: 'bàn đạp', dungCho: 'Bàn' })) === 0);
  const Fk = FX({ tenLoai: 'bàn đạp', laBoPhan: true, dungCho: 'Bàn', congDung: 'khâu' });
  check('10.1i bên CHUNG còn ràng buộc chữ tự do khoá khác (congDung) ⇒ 0 — luật trục của tenCuTheHon giữ nguyên', f(D11, [BP, DUNG(BAN), { fact: 'congDung', op: 'CONG_DUNG', value: 'khâu' }], Fk) === 0);
  check('10.1j chéo khoá với tuỳ chọn cheo từ chối (cổng: tên không nguyên văn) ⇒ 0', f(D11, D12, F1, { cheo: () => false }) === 0);
  // Không HOAC, không chéo khoá: y hệt tenCuTheHon (test-cong-cu-vong-2 mục 4, test-cong-cu-tho-re 3m).
  const Fp = FX({ tenLoai: 'Bạc piston', duongKinh: { giaTri: 50, donVi: 'mm' } });
  const piston = [TEN('Piston'), { fact: 'duongKinh', op: '>=', value: 50, donVi: 'mm' }];
  check('10.1k không HOAC: trùng tenCuTheHon ("Bạc piston" ⊃ "Piston" + giới hạn số)', f(piston, [TEN('Bạc piston')], Fp) === DK.tenCuTheHon(piston, [TEN('Bạc piston')], Fp) && f(piston, [TEN('Bạc piston')], Fp) === -1);
  const Fb = FX({ tenLoai: 'xe của búp bê' });
  check('10.1l không HOAC: trùng tenCuTheHon ("xe của búp bê" ⊃ "Búp bê")', f([TEN('xe của búp bê')], [TEN('Búp bê')], Fb) === 1);
}

// ── 10.2 Cổng 2 trên fixture 845290 (main 53359a1): hết DỪNG chồng lấn .11+.12 / .91+.92 ────────────────────────────────────
{
  const b = nhap533('845290');
  check('10.2a fixture 845290 (53359a1): .12/.92 dạng HOAC đúng QUY-TRINH 3.11', JSON.stringify(b.dong8.find((m) => m.hs === '84529012').dieuKienSo) === JSON.stringify(D12));
  const r = C.kiemRanhGioi('845290', b, { cong: [2] });
  check('10.2b không còn cong2-chong-lan (trước: .11+.12, .91+.92 :khong-tat-dinh)', chong(r).length === 0, chong(r));
  check('10.2c không còn cong2-chong-lan-truc (đồ thị trục dựng trên chồng lấn thật)', !co(r.loi, 'cong2-chong-lan-truc'), r.loi);
  // Không nới: tên KHÔNG nguyên văn của chính dòng (.12 phương án ghi "đạp" — không có trong chữ .12) ⇒ cặp chéo khoá không nhận.
  const b2 = dat(nhap533('845290'), '84529092', [{ op: 'HOAC', phuongAn: [[TEN(['Bàn', 'đạp'])], [BP, DUNG(['Bàn', 'đạp'])]] }]);
  const r2 = C.kiemRanhGioi('845290', b2, { cong: [2] });
  check('10.2d tên không nguyên văn ("đạp" cho .92) ⇒ .91+.92 VẪN cong2-chong-lan', chong(r2).some((l) => cap(l) === '84529091+84529092'), chong(r2));
  // Không nới: trục tên ↔ công dụng (dungCho không laBoPhan) vẫn lỗi.
  const b3 = dat(nhap533('845290'), '84529092', [DUNG(BAN)]);
  const r3 = C.kiemRanhGioi('845290', b3, { cong: [2] });
  check('10.2e .92 chỉ dungCho "Bàn…" (không laBoPhan, trục) ⇒ .91+.92 VẪN chồng lấn', chong(r3).some((l) => cap(l) === '84529091+84529092'), chong(r3));
}

// ── 10.3 Lúc chạy (doiChieuPhanNhom) khớp cổng — không xanh giả ───────────────────────────────────────────────────────────
{
  const b = nhap533('845290');
  const soTay = C.soTayTuNhap('845290', b);
  const dk = (o) => Object.entries(o).map(([fact, giaTri]) => ({ fact, giaTri, nguon: 'KHACH', trangThai: 'DA_CO' }));
  const r1 = DK.doiChieuPhanNhom('845290', dk({ tenLoai: 'bàn đạp', laBoPhan: true, dungCho: 'Bàn' }), { soTay });
  check('10.3a bàn đạp là bộ phận của "Bàn" (ngoài 8452.10): chỉ .91 (trước: .91 + .92)', JSON.stringify(r1.dongCo) === JSON.stringify(['84529091']) && r1.dong.find((d) => d.hs === '84529092')?.biLanTen === true, r1);
  const r2 = DK.doiChieuPhanNhom('845290', dk({ tenLoai: 'bàn đạp', dungCho: 'máy thuộc phân nhóm 8452.10.00' }), { soTay });
  check('10.3b bàn đạp của máy 8452.10.00: chỉ .11 (phương án tên "Bàn" của .12 bị lấn)', JSON.stringify(r2.dongCo) === JSON.stringify(['84529011']), r2);
  const r3 = DK.doiChieuPhanNhom('845290', dk({ tenLoai: 'bàn đạp', laBoPhan: true, dungCho: 'tủ' }), { soTay });
  check('10.3c bàn đạp là bộ phận của "tủ": không phân được ⇒ vẫn .91 + .92 (không tự chốt)', JSON.stringify(r3.dongCo) === JSON.stringify(['84529091', '84529092']), r3);
  // Luật "tên nguyên văn rời nhau" (tenAnhEmRoi) vẫn chỉ là luật chứng minh của cổng: runtime không đổi (9.4e).
  const b7 = nhap571('871410'); const st7 = C.soTayTuNhap('871410', b7);
  const r7 = DK.doiChieuPhanNhom('871410', dk({ tenLoai: 'Yên xe', laBoPhan: true, dungCho: 'Khung' }), { soTay: st7 });
  check('10.3d 871410 "Yên xe" là bộ phận của "Khung" (tên rời nhau): runtime vẫn thấy .10 + .30 (không đổi)', ['87141010', '87141030'].every((h) => r7.dongCo.includes(h)), r7.dongCo);
}

// ── 10.4 Quy trình + luật chung ghi quyết định GĐ (a) ─────────────────────────────────────────────────────────────────────
{
  const qt = docMd('QUY-TRINH-SO-HOA.md'); const lc = docMd('LUAT-CHUNG.md');
  check('10.4a QUY-TRINH bỏ "Không áp \\"tên cụ thể hơn thắng\\" cho cặp chéo khoá", ghi tenCuTheHonDong', !/Không áp "tên cụ thể hơn thắng" cho cặp chéo khoá/u.test(qt) && /tenCuTheHonDong/u.test(qt));
  check('10.4b LUAT-CHUNG ghi tên cụ thể hơn thắng áp vào phương án HOAC + cặp chéo khoá', /tenCuTheHonDong/u.test(lc) && /HOAC/u.test(lc));
}

// ════ 11. Vòng 5 — liệt kê HOẶC gói trong MỘT chuỗi chữ tự do (soát L1-4c đợt 3 #697, phát hiện hàng đầu) ═══════════════
// Bộ so chữ đòi ĐỦ âm tiết của một giá trị TEN_LOAI/CONG_DUNG ⇒ "A, B hoặc C" trong một chuỗi bị đọc thành VÀ (HẸP hơn chữ).
// Máy chặn: giá trị có " hoặc " / dấu ";" / liệt kê phẩy, không có mã HS ⇒ `cong3-liet-ke-trong-mot-chuoi:<mục>:<fact>`.
// Ngoại lệ: liệt kê nối "và" mà chữ Anh cùng dòng xác nhận liên hợp sau giới từ ("for transport, handling and storage");
// dấu phẩy có cả ở chữ Anh mà chữ Anh không liệt kê and/or ("Slugs, round"); giá trị có mã HS (maThamChieu lo).
// Fixture đông cứng ranh-gioi-f457a19/ (trước #699) và ranh-gioi-719cacc/ (main 719cacc).
const DF45 = path.join(process.cwd(), 'scripts', 'fixtures', 'ho-so', 'ranh-gioi-f457a19');
const D719 = path.join(process.cwd(), 'scripts', 'fixtures', 'ho-so', 'ranh-gioi-719cacc');
const nhap719 = (pn6) => nhapDongCung(pn6, D719);
const lietKe = (r) => r.loi.filter((l) => l.startsWith('cong3-liet-ke-trong-mot-chuoi:'));
const kiemLk = (pn6, b) => lietKe(C.kiemRanhGioi(pn6, b, { cong: [3] }));
{
  // 11.1 ca trúng (soát đợt 3): 841459 .10 + 950300 .91 bản trước soạn lại
  const r1 = kiemLk('841459', nhapDongCung('841459', DF45));
  check('11.1a 841459 (f457a19) .10 congDung "làm mát bộ vi xử lý, …, máy xử lý dữ liệu tự động hoặc các khối …" ⇒ lỗi', r1.includes('cong3-liet-ke-trong-mot-chuoi:84145910:congDung'), r1);
  const r2 = kiemLk('950300', nhapDongCung('950300', DF45));
  check('11.1b 950300 (f457a19) .91 tenLoai "xếp khối hoặc cắt rời hình chữ số, chữ cái hoặc hình con vật" ⇒ lỗi', r2.includes('cong3-liet-ke-trong-mot-chuoi:95030091:tenLoai'), r2);
  check('11.1c … đúng một lỗi mỗi bản (các giá trị khác không trúng)', r1.length === 1 && r2.length === 1, [r1, r2]);
  // 11.2 bản soạn lại (719cacc): đã tách mảng ⇒ không trúng
  check('11.2a 841459 (719cacc, dungCho tách mảng) ⇒ không lỗi', kiemLk('841459', nhap719('841459')).length === 0, kiemLk('841459', nhap719('841459')));
  check('11.2b 950300 (719cacc, .91 HOAC mảng; "bộ đồ chơi tạo chữ và tập nói" không dấu phẩy) ⇒ không lỗi', kiemLk('950300', nhap719('950300')).length === 0);
  // 11.3 ngoại lệ
  const r3 = kiemLk('853710', nhap719('853710'));
  check('11.3a 853710 .30 "dịch chuyển, xử lý và kẹp giữ" (EN "for transport, handling and storage") ⇒ KHÔNG lỗi', r3.length === 0, r3);
  const r4 = kiemLk('852351', nhap719('852351'));
  check('11.3b 852351 .30 "tái tạo các tập lệnh, dữ liệu, âm thanh và hình ảnh" (EN "of instructions, data, sound and image") ⇒ KHÔNG lỗi', r4.length === 0, r4);
  const r5 = kiemLk('761699', nhap719('761699'));
  check('11.3c 761699 .30 "Đồng xèng, hình tròn" (EN "Slugs, round," — dấu phẩy thuộc tính, không and/or) ⇒ KHÔNG lỗi', r5.length === 0, r5);
  const r6 = kiemLk('848340', nhap719('848340'));
  check('11.3d 848340 .30 "máy thuộc nhóm 84.29 hoặc 84.30" (có mã HS — maThamChieu đọc HOẶC) ⇒ KHÔNG lỗi', r6.length === 0, r6);
  // 11.4 ca trúng thật trên bản đông cứng 719cacc
  const r7 = kiemLk('392690', nhap719('392690'));
  check('11.4a 392690 3926908 "Tấm thẻ … đồ nữ trang hoặc những đồ vật nhỏ …" ⇒ lỗi', r7.includes('cong3-liet-ke-trong-mot-chuoi:3926908:tenLoai'), r7);
  check('11.4b 392690 .20 "khung và tay cầm, quai kèm theo" (dấu cuối là phẩy, không phải "và") ⇒ lỗi', r7.includes('cong3-liet-ke-trong-mot-chuoi:39269020:tenLoai'), r7);
  const r8 = kiemLk('401699', nhap719('401699'));
  check('11.4c 401699 4016995 dungCho "thiết bị điện hoặc cơ khí" ⇒ lỗi', r8.includes('cong3-liet-ke-trong-mot-chuoi:4016995:dungCho'), r8);
  const r9 = kiemLk('732690', nhap719('732690'));
  check('11.4d 732690 .70 "mấu, gai, đinh móc lắp trên giày …" (dấu phẩy chỉ ở chữ Việt; EN "riding boot spurs") ⇒ lỗi', r9.includes('cong3-liet-ke-trong-mot-chuoi:73269070:tenLoai'), r9);
  // 11.5 liệt kê HÀNG nối "và" không sau giới từ (EN "Tricycles, scooters, pedal cars and similar wheeled toys") ⇒ vẫn lỗi
  const b10 = nhap719('950300');
  b10.dong8.find((m) => m.hs === '95030010').dieuKienSo = [TEN('Xe đạp ba bánh, xe đẩy, xe có bàn đạp và đồ chơi tương tự có bánh')];
  const r10 = kiemLk('950300', b10);
  check('11.5a liệt kê tên hàng "A, B, C và D" (không giới từ ở EN) gói một chuỗi ⇒ lỗi', r10.includes('cong3-liet-ke-trong-mot-chuoi:95030010:tenLoai'), r10);
  // 11.6 dấu ";" và trong HOAC + PHAI_KHONG
  const b11 = nhap719('950300');
  b11.dong8.find((m) => m.hs === '95030091').dieuKienSo = [{ op: 'HOAC', phuongAn: [[TEN('bộ xếp chữ; bộ đồ chơi in hình')], [TEN('máy may đồ chơi')]] }];
  check('11.6a giá trị có ";" trong phương án HOAC ⇒ lỗi', kiemLk('950300', b11).includes('cong3-liet-ke-trong-mot-chuoi:95030091:tenLoai'));
  const b12 = nhap719('950300');
  b12.dong8.find((m) => m.hs === '95030050').dieuKienSo = [TEN('đồ chơi xây dựng'), { fact: 'tenLoai', op: 'TEN_LOAI', value: 'xe đẩy hoặc xe có bàn đạp', chieu: 'PHAI_KHONG' }];
  check('11.6b PHAI_KHONG gói "hoặc" cũng lỗi (phủ định VÀ ≠ phủ định HOẶC)', kiemLk('950300', b12).includes('cong3-liet-ke-trong-mot-chuoi:95030050:tenLoai'));
  // 11.7 giải thích + tài liệu
  const g = ML.giaiThich('cong3-liet-ke-trong-mot-chuoi:84145910:congDung') || {};
  check('11.7a ma-loi: có giải thích, gợi ý tách MẢNG chuỗi con nguyên văn, không DỪNG', /mảng/u.test(g.cachSua || '') && /nguyên văn/u.test(g.cachSua || '') && !g.dung, g);
  check('11.7b QUY-TRINH + SOAT-RANH-GIOI + LUAT-CHUNG ghi mã mới', ['QUY-TRINH-SO-HOA.md', 'SOAT-RANH-GIOI.md', 'LUAT-CHUNG.md'].every((p) => /cong3-liet-ke-trong-mot-chuoi/u.test(docMd(p))));
}

// ════ 12. Vòng 5 — đích "của chúng" ↔ tên tiêu đề tổ tiên (950300, quyết định GĐ) ═══════════════════════════════════════
// 950300 .30 HOAC [[tenLoai "Xe điện"], [tenLoai [đường ray, đèn hiệu, phụ kiện], dungCho "Xe điện"]] ("… của chúng" / "therefor").
// Nhánh búp bê (9503002 "Búp bê" → tầng r18723 "Bộ phận và phụ kiện" → .21/.22/.29) không có dungCho (đích nằm ở TÊN tiêu đề
// cha) ⇒ vector "tenLoai phụ kiện quần áo Búp bê + dungCho Xe điện" làm .21/.22/.29 và .30 cùng CO. Luật chứng minh mới của cổng 2:
// một bên có dungCho Y (Y = tên đầu nguyên văn của chính dòng, chữ dòng có "của chúng"/"therefor"), bên kia KHÔNG có dungCho và
// một tiêu đề tổ tiên trên nhánh mang tên đầu nguyên văn X; X, Y rời nhau như luật #692 ⇒ loại trừ. Runtime không đổi (hỏi).
{
  const b = nhap719('950300');
  const r = C.kiemRanhGioi('950300', b, { cong: [2] });
  check('12.1a 950300 (719cacc) không còn cong2-chong-lan (trước: .21/.22/.29 + .30 :khong-tat-dinh)', chong(r).length === 0, chong(r));
  check('12.1b cặp chứng minh bằng luật mới hiện cảnh báo cong2-dich-cua-chung-roi cho người soát', ['95030021', '95030022', '95030029'].every((h) => co(r.canhBao, `cong2-dich-cua-chung-roi:${h}+95030030`)), r.canhBao);
  // Không nới: Y chứa nhau / có ứng viên thoả cả hai ("xe của búp bê" thoả cả "Búp bê" lẫn "Xe")
  const b2 = nhap719('950300');
  b2.dong8.find((m) => m.hs === '95030030').dieuKienSo = [{ op: 'HOAC', phuongAn: [[TEN('Xe điện')], [TEN(['đường ray', 'đèn hiệu', 'phụ kiện']), DUNG('Xe')]] }];
  const r2 = C.kiemRanhGioi('950300', b2, { cong: [2] });
  check('12.2a đích "Xe" ↔ "Búp bê": ứng viên "xe của búp bê" thoả cả hai ⇒ VẪN chồng lấn (cùng độ chặt #692)', chong(r2).some((l) => cap(l).endsWith('+95030030')), chong(r2));
  // Không nới: Y không phải tên ĐẦU của chính dòng ("đường ray" nằm trong vế "kể cả …", không phải danh từ đầu)
  const b3 = nhap719('950300');
  b3.dong8.find((m) => m.hs === '95030030').dieuKienSo = [{ op: 'HOAC', phuongAn: [[TEN('Xe điện')], [TEN(['đèn hiệu', 'phụ kiện']), DUNG('đường ray')]] }];
  const r3 = C.kiemRanhGioi('950300', b3, { cong: [2] });
  check('12.2b đích "đường ray" (không phải danh từ đầu .30) ⇒ VẪN chồng lấn', chong(r3).some((l) => cap(l).endsWith('+95030030')), chong(r3));
  // Không nới: luật chỉ cho bên KHÔNG có dungCho (đích tự do). Bên búp bê mang dungCho ⇒ vector tự quyết như cũ.
  const b4 = nhap719('950300');
  b4.dieuKienNut.find((m) => m.id === '9503002').dieuKienSo = [TEN('Búp bê'), DUNG('Búp bê')];
  const r4 = C.kiemRanhGioi('950300', b4, { cong: [2] });
  check('12.2c bên búp bê CÓ dungCho (không tự do) ⇒ luật không áp, không cảnh báo cong2-dich-cua-chung-roi', !co(r4.canhBao, 'cong2-dich-cua-chung-roi'), r4.canhBao);
  // Hồi quy: các luật cũ không đổi
  const r5 = C.kiemRanhGioi('871410', nhap571('871410'), { cong: [2] });
  check('12.3a 871410 (571d7a5) vẫn không chồng lấn, không cảnh báo cong2-dich-cua-chung-roi', chong(r5).length === 0 && !co(r5.canhBao, 'cong2-dich-cua-chung-roi'), r5.loi);
  const r6 = C.kiemRanhGioi('401699', nhapDongCung('401699'), { cong: [2] });
  check('12.3b 401699 (7559407, trục) vẫn cong2-chong-lan-truc', co(r6.loi, 'cong2-chong-lan-truc'), r6.loi.slice(0, 3));
  const r7 = C.kiemRanhGioi('848390', nhapDongCung('848390', THU_MUC_DONG_CUNG_88444A8));
  check('12.3c 848390 (88444a8) vẫn XANH', r7.hopLe === true, r7.loi);
  // Runtime không đổi: hàng thoả cả hai ⇒ động cơ thấy cả hai dòng, không tự chọn (hỏi)
  const soTay = C.soTayTuNhap('950300', nhap719('950300'));
  const dk = (o) => Object.entries(o).map(([fact, giaTri]) => ({ fact, giaTri, nguon: 'KHACH', trangThai: 'DA_CO' }));
  const rt = DK.doiChieuPhanNhom('950300', dk({ tenLoai: 'phụ kiện quần áo búp bê', dungCho: 'Xe điện' }), { soTay });
  check('12.4a runtime: hàng "phụ kiện quần áo búp bê" dùng cho "Xe điện" ⇒ vẫn .22 + .30 CO (không tự chốt — hỏi)', ['95030022', '95030030'].every((h) => rt.dongCo.includes(h)) && rt.dongCo.length >= 2, rt.dongCo);
  const rt2 = DK.doiChieuPhanNhom('950300', dk({ tenLoai: 'phụ kiện', dungCho: 'Xe điện' }), { soTay });
  check('12.4b runtime: "phụ kiện" cho "Xe điện" ⇒ chỉ .30', JSON.stringify(rt2.dongCo) === JSON.stringify(['95030030']), rt2.dongCo);
  const g = ML.giaiThich('cong2-dich-cua-chung-roi:95030022+95030030') || {};
  check('12.5a ma-loi: cong2-dich-cua-chung-roi có giải thích (cảnh báo, không DỪNG)', /của chúng/u.test(g.giaiThich || '') && /tiêu đề/u.test(g.giaiThich || '') && !g.dung, g);
  check('12.5b QUY-TRINH + LUAT-CHUNG + SOAT-RANH-GIOI ghi luật mới', ['QUY-TRINH-SO-HOA.md', 'SOAT-RANH-GIOI.md', 'LUAT-CHUNG.md'].every((p) => /cong2-dich-cua-chung-roi/u.test(docMd(p))));
}

console.log(`\n${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
