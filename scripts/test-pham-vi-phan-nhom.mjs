// #1109: dieuKienNut[<pn6>] = phạm vi chính chữ phân nhóm — cổng 1 bỏ vector ngoài phạm vi; không vào sổ tay lúc chạy.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
const require = createRequire(import.meta.url);
const { nhapDongCung, gieoNhap, THU_MUC_DONG_CUNG_38864C8, THU_MUC_DONG_CUNG_C05A07A, THU_MUC_DONG_CUNG_454E512, THU_MUC_DONG_CUNG_0519921, THU_MUC_DONG_CUNG_71A17E0 } = await import('./fixtures/ho-so/nhap-dong-cung.mjs');
const C = require('../lib/ho-so/cong-ranh-gioi.js');
const S = require('../lib/so-tay.js');
let pass = 0; let fail = 0;
const check = (n, c, d) => { if (c) pass++; else { fail++; console.log('✗', n, d === undefined ? '' : JSON.stringify(d).slice(0, 300)); } };

const src = { ...S.sourcesFor('8703'), ...S.nguonTieuDe('8703') };
check('1a nguồn tieuDe.<pn6> = tên nguyên văn phân nhóm', /trên 1\.500 cc nhưng không quá 3\.000 cc/.test(src['tieuDe.870323'] || ''), src['tieuDe.870323']);
// Bản đông cứng (test không đọc bản nháp sống — test-cong-cu-vong-3 4a); gieo vào HS_DATA_DIR cho CLI.
const b = nhapDongCung('870323', THU_MUC_DONG_CUNG_38864C8);
gieoNhap('870323', b);
check('1b bản 870323 có dieuKienNut[870323]', (b.dieuKienNut || []).some((m) => m.id === '870323'));
let out = ''; try { out = execFileSync('node', ['scripts/so-hoa-ranh-gioi.mjs', '--kiem', '--pn6=870323'], { encoding: 'utf8' }); } catch (e) { out = String(e.stdout || ''); }
check('2a 870323 không còn cong1-khong-phu-kin (vector 1.499 cc ngoài phân nhóm bị bỏ)', !/cong1-khong-phu-kin/.test(out), out.slice(-300));
check('2b 870323 qua cổng', /XANH 870323/.test(out), out.slice(-300));
// Bỏ mục phạm vi ⇒ lỗi cũ quay lại (chứng minh mục có tác dụng)
const b2 = { ...b, dieuKienNut: (b.dieuKienNut || []).filter((m) => m.id !== '870323') };
let k2 = null; try { k2 = C.kiemRanhGioi('870323', b2); } catch (e) { k2 = { loi: ['ERR ' + e.message] }; }
check('2c bỏ dieuKienNut[870323] ⇒ cong1-khong-phu-kin trở lại', (k2.loi || []).some((l) => /cong1-khong-phu-kin/.test(l)), (k2.loi || []).slice(0, 3));
// apDung bỏ mục id === pn6 (cong-ranh-gioi.js#apDung) — bản DUYET thật kiểm ở test-cong-ranh-gioi khi có PN6 đã duyệt mang mục này.
// Cổng 1, tầng "Loại khác" trần (#1109): 870460 tầng 8704609 phủ định anh em 8704602 "không quá 5 tấn" ⇒ vector 4.999,995 kg
// (sinh từ biên "trên 5 tấn" của con .91) thuộc 8704602, không phải lỗ hổng của 8704609.
{
  const r = C.kiemRanhGioi('870460', nhapDongCung('870460', THU_MUC_DONG_CUNG_C05A07A));
  check('3a 870460 không còn cong1-khong-phu-kin:8704609', !r.loi.some((l) => l.startsWith('cong1-khong-phu-kin:8704609')), r.loi.filter((l) => l.startsWith('cong1')));
  // Phản chứng: bỏ điều kiện của anh em 8704602 ⇒ không còn gì loại vector ⇒ hở trở lại.
  const b = nhapDongCung('870460', THU_MUC_DONG_CUNG_C05A07A);
  b.dieuKienNut = b.dieuKienNut.map((m) => (m.id === '8704602' ? { ...m, dieuKienSo: [{ fact: 'khoiLuongToanBo', op: '<=', value: 1, donVi: 'tấn' }] } : m));
  const r2 = C.kiemRanhGioi('870460', b);
  check('3b 870460 anh em đổi "không quá 1 tấn" ⇒ vector 4.999,995 kg hở thật ở 8704609', r2.loi.some((l) => l.startsWith('cong1-khong-phu-kin:8704609')), r2.loi.filter((l) => l.startsWith('cong1')));
}
// Cổng 1, dải mã ở tầng cha (#1109): 851140 tầng 8511403 "87.01 đến 87.05", con .31/.32/.33 chia theo nhóm ⇒ phủ kín.
{
  const r = C.kiemRanhGioi('851140', nhapDongCung('851140', THU_MUC_DONG_CUNG_C05A07A));
  check('4a 851140 không còn cong1-khong-phu-kin:8511403', !r.loi.some((l) => l.startsWith('cong1-khong-phu-kin')), r.loi);
  const b = nhapDongCung('851140', THU_MUC_DONG_CUNG_C05A07A);
  b.dong8 = b.dong8.map((m) => (m.hs === '85114033' ? { ...m, dieuKienSo: [{ fact: 'dungCho', op: 'CONG_DUNG', value: '87.04' }] } : m));
  const r2 = C.kiemRanhGioi('851140', b);
  check('4b 851140 bỏ 87.05 khỏi mọi con ⇒ dải hở thật (dungCho=87.05)', r2.loi.some((l) => /cong1-khong-phu-kin:8511403:.*87\.05/.test(l)), r2.loi.filter((l) => l.startsWith('cong1')));
}
// "Loại khác, <vế>" khai phanConLai true ⇒ chỉ phủ định anh em ĐỨNG TRƯỚC (#1109, 850432): .20 "Loại khác, dùng cho đồ chơi"
// đứng trước tầng 8504324 "Loại khác, ≤ 10 kVA" — biến áp đồ chơi 8 kVA thuộc .20. Không khai ⇒ như cũ (.20 không tới được).
{
  const b0 = nhapDongCung('850432', THU_MUC_DONG_CUNG_454E512);
  const r0 = C.kiemRanhGioi('850432', b0);
  check('5a 850432 chưa khai ⇒ cong2-dong-khong-toi-duoc:85043220 (luật cũ: LK có vế phủ định MỌI anh em)', r0.loi.some((l) => l === 'cong2-dong-khong-toi-duoc:85043220'), r0.loi.slice(0, 4));
  const b = nhapDongCung('850432', THU_MUC_DONG_CUNG_454E512);
  const dat = (id) => { const m = [...(b.dong8 || []), ...(b.dieuKienNut || [])].find((x) => (x.hs || x.id) === id); m.phanConLai = true; };
  ['85043220', '85043230', '8504324'].forEach(dat);
  const r = C.kiemRanhGioi('850432', b);
  check('5b 850432 khai phanConLai ⇒ hết dong-khong-toi-duoc, cổng 0 sạch', !r.loi.some((l) => /dong-khong-toi-duoc|cong0/.test(l)), r.loi.slice(0, 4));
  const den = (id, h) => C.thuViDuHang('850432', b, id, null, h);
  check('5c biến áp đồ chơi 8 kVA ⇒ .20 thoả, tầng .4 không', den('85043220', 'Biến áp dùng cho đồ chơi, công suất 8 kVA').thoa === true && den('8504324', 'Biến áp dùng cho đồ chơi, công suất 8 kVA').thoa === false);
  check('5d biến áp khô 8 kVA ⇒ tầng .4', den('8504324', 'Máy biến áp khô công suất 8 kVA').thoa === true);
  // Khai trên anh em ĐỨNG CUỐI là thừa (mặc định đã phủ định mọi anh em = anh em đứng trước).
  const b2 = nhapDongCung('850432', THU_MUC_DONG_CUNG_454E512);
  b2.dieuKienNut.find((x) => x.id === '8504325').phanConLai = true;
  check('5e phanConLai trên "Loại khác, <vế>" đứng cuối ⇒ cong0-phan-con-lai-thua', C.kiemRanhGioi('850432', b2).loi.includes('cong0-phan-con-lai-thua:8504325'));
}
// ── Đợt sửa bộ máy #1109 (07/11/2026) ──
const M = THU_MUC_DONG_CUNG_0519921;
const muc = (b, id) => [...(b.dong8 || []), ...(b.dieuKienNut || [])].find((x) => (x.hs || x.id) === id);
{ // 6. Trục vật liệu qua HOẶC (830629 .10 "Bằng đồng hoặc chì" = HOAC [chatLieu đồng | kimLoaiCoBanKhac CHI] ↔ .20 niken, .30 nhôm)
  const r = C.kiemRanhGioi('830629', nhapDongCung('830629', M));
  check('6a 830629 hết cong2-chong-lan (bung HOẶC khi so trục vật liệu)', !r.loi.some((l) => l.startsWith('cong2-chong-lan')), r.loi);
  const b = nhapDongCung('830629', M); muc(b, '83062920').dieuKienSo = [{ fact: 'kimLoaiCoBanKhac', op: 'TRONG', value: ['CHI'] }];
  check('6b phản chứng: .20 cũng "chì" ⇒ chồng lấn thật trở lại', C.kiemRanhGioi('830629', b).loi.some((l) => l.startsWith('cong2-chong-lan:83062910+83062920')));
}
{ // 7. Vế "trừ loại thuộc phân nhóm X" ⇒ phanConLai [X] (841590 .15 ↔ .13)
  const b = nhapDongCung('841590', M); muc(b, '84159015').phanConLai = ['84159013'];
  const r = C.kiemRanhGioi('841590', b);
  check('7a 841590 .15 phanConLai [.13] theo vế "trừ loại thuộc" ⇒ hết chồng .13↔.15, cổng 3 không đòi chữ "khác"', !r.loi.some((l) => /84159013\+84159015|phan-con-lai-khong-co-chu-khac/.test(l)), r.loi.slice(0, 4));
  const b2 = nhapDongCung('841590', M); muc(b2, '84159015').phanConLai = ['84159014'];
  check('7b phanConLai trỏ mã chữ không nêu ⇒ cong3-phan-con-lai-khong-co-chu-khac', C.kiemRanhGioi('841590', b2).loi.includes('cong3-phan-con-lai-khong-co-chu-khac:84159015'));
}
{ // 8. "Loại khác, kể cả bia ale" là phần còn lại trần (220300 tầng 2203009)
  const b = nhapDongCung('220300', M); b.dieuKienNut = b.dieuKienNut.filter((x) => x.id !== '2203009');
  const r = C.kiemRanhGioi('220300', b);
  check('8a 220300 không khai tầng 2203009 ⇒ không còn cong1-chua-so-hoa (tầng là "Loại khác" trần)', !r.loi.some((l) => l.startsWith('cong1-chua-so-hoa')), r.loi);
  const DK = require('../lib/dieu-kien-so.js');
  const tran = (tenVi) => DK.laLoaiKhacTranTen({ tenVi });
  check('8b nhận dạng "Loại khác" trần', tran('Loại khác') && tran('- - Loại khác:') && tran('Loại khác, kể cả bia ale') && tran('Loại khác, kể cả nửa con'));
  check('8c "Loại khác, kể cả … trừ …" và "Loại khác, <vế>" KHÔNG trần', !tran('Loại khác, kể cả dạng hỗn hợp trừ loại thuộc phân nhóm 2008.19') && !tran('Loại khác, dùng cho đồ chơi'));
}
{ // 9. Phần còn lại CÓ TÊN loại vector của anh em bị phủ định (870892 tầng 8708926 ⊥ 8708925 "8704.10")
  const r = C.kiemRanhGioi('870892', nhapDongCung('870892', M));
  check('9a 870892 không còn vector dungCho=8704.10 hở ở 8708926', !r.loi.some((l) => /cong1-khong-phu-kin:8708926:dungCho=8704\.10/.test(l)), r.loi.slice(0, 3));
}
{ // 10. Mục phạm vi phân nhóm không xét vế cổng 5 (020760 phạm vi từ wco.020760 "fresh, chilled or frozen")
  const r = C.kiemRanhGioi('020760', nhapDongCung('020760', THU_MUC_DONG_CUNG_71A17E0));
  check('10a 020760 xanh, không cong5 trên mục phạm vi', r.hopLe === true && !r.loi.some((l) => l.startsWith('cong5') && l.includes(':020760:')), r.loi);
}
console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
