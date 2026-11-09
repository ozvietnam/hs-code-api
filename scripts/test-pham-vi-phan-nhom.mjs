// #1109: dieuKienNut[<pn6>] = phạm vi chính chữ phân nhóm — cổng 1 bỏ vector ngoài phạm vi; không vào sổ tay lúc chạy.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
const require = createRequire(import.meta.url);
const { nhapDongCung, gieoNhap, THU_MUC_DONG_CUNG_38864C8, THU_MUC_DONG_CUNG_C05A07A, THU_MUC_DONG_CUNG_454E512, THU_MUC_DONG_CUNG_0519921, THU_MUC_DONG_CUNG_71A17E0, THU_MUC_DONG_CUNG_B5BF024, THU_MUC_DONG_CUNG_8BAEF5E, THU_MUC_DONG_CUNG_BF788F5, THU_MUC_DONG_CUNG_5174A56, THU_MUC_DONG_CUNG_EC27049 } = await import('./fixtures/ho-so/nhap-dong-cung.mjs');
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
{ // 11. Q1 (GĐ đồng ý 07/11/2026): cặp khác trục không có hàng thật ⇒ viDuHang {cap, khongCoHangThat} thay hàng ví dụ
  const cum = (vd) => ({ nhanh: ['14049020', '14049030'], truc: { 14049020: 'CONG_DUNG', 14049030: 'TEN_LOAI' },
    cauHoiPhanBiet: 'Hàng này là loại dùng chủ yếu trong thuộc da hoặc nhuộm, hay là bông gòn?',
    trich: { 14049020: 'Loại dùng chủ yếu trong công nghệ thuộc da hoặc nhuộm', 14049030: 'Bông gòn' }, viDuHang: [vd], phanXu: null });
  const ld = 'Bông gòn dùng làm vật liệu nhồi; không có bông gòn nào dùng chủ yếu để thuộc da hoặc nhuộm.';
  const b0 = nhapDongCung('140490', THU_MUC_DONG_CUNG_B5BF024);
  check('11a 140490 chưa khai ⇒ chồng lấn trục (DỪNG cũ)', C.kiemRanhGioi('140490', b0).loi.some((l) => l.startsWith('cong2-chong-lan')));
  const b = nhapDongCung('140490', THU_MUC_DONG_CUNG_B5BF024); b.chongLanTruc = [cum({ cap: ['14049020', '14049030'], khongCoHangThat: ld })];
  const r = C.kiemRanhGioi('140490', b);
  check('11b khai khongCoHangThat ⇒ xanh + cảnh báo cho người soát', r.hopLe === true && r.canhBao.some((c) => c.startsWith('cong2-chong-lan-truc-khong-co-hang-that:0:')), r.loi);
  const b2 = nhapDongCung('140490', THU_MUC_DONG_CUNG_B5BF024); b2.chongLanTruc = [cum({ cap: ['14049020', '14049030'], khongCoHangThat: 'ngắn' })];
  check('11c lý do quá ngắn ⇒ lỗi hình dạng', C.kiemRanhGioi('140490', b2).loi.some((l) => l.startsWith('cong0-chong-lan-truc-vi-du-hinh-dang')));
  const b3 = nhapDongCung('140490', THU_MUC_DONG_CUNG_B5BF024); b3.chongLanTruc = [cum({ cap: ['14049020', '14049030'], hang: 'Bông gòn dùng thuộc da', khongCoHangThat: ld })];
  check('11d khai cả hang lẫn khongCoHangThat ⇒ lỗi hình dạng', C.kiemRanhGioi('140490', b3).loi.some((l) => l.startsWith('cong0-chong-lan-truc-vi-du-hinh-dang')));
}
{ // 12. Khoá SỐ là trục DAC_DIEM (07/11/2026, 730640): tầng "Ống dùng cho nồi hơi" ↔ .20 đường kính / .30 niken là chồng lấn thật
  const cum = (truc20) => ({ nhanh: ['7306401', '73064020', '73064030'], truc: { 7306401: 'CONG_DUNG', 73064020: truc20, 73064030: 'DAC_DIEM' },
    cauHoiPhanBiet: 'Ống này dùng cho nồi hơi, hay là ống đường kính ngoài trên 105 mm, hay là ống chứa niken ít nhất 30%?',
    trich: { 7306401: 'Ống dùng cho nồi hơi', 73064020: 'Ống và ống dẫn bằng thép không gỉ, có đường kính ngoài trên 105 mm',
      73064030: 'Ống và ống dẫn có chứa hàm lượng niken ít nhất là 30% tính theo khối lượng, với đường kính ngoài không quá 10 mm' },
    viDuHang: [
      { cap: ['7306401', '73064020'], hang: 'Ống thép không gỉ hàn, mặt cắt ngang hình tròn, đường kính ngoài 114,3 mm, dùng cho nồi hơi (ống bộ quá nhiệt)' },
      { cap: ['7306401', '73064030'], hang: 'Ống thép không gỉ hàn (hợp kim sắt-niken-crôm loại 800H), chứa niken 32% tính theo khối lượng, đường kính ngoài 9,53 mm, dùng cho nồi hơi' }],
    phanXu: null });
  const b0 = nhapDongCung('730640', THU_MUC_DONG_CUNG_B5BF024);
  check('12a 730640 chưa khai ⇒ cong2-chong-lan-truc', C.kiemRanhGioi('730640', b0).loi.some((l) => l.startsWith('cong2-chong-lan-truc:7306401:')));
  const b = nhapDongCung('730640', THU_MUC_DONG_CUNG_B5BF024); b.chongLanTruc = [cum('DAC_DIEM')];
  const r = C.kiemRanhGioi('730640', b);
  check('12b nhánh chỉ có khoá số khai DAC_DIEM + hàng thật hai chiều ⇒ xanh', r.hopLe === true, r.loi);
  const b2 = nhapDongCung('730640', THU_MUC_DONG_CUNG_B5BF024); b2.chongLanTruc = [cum('TEN_LOAI')];
  check('12c khai TEN_LOAI cho nhánh chỉ có khoá số ⇒ cong3-chong-lan-truc-truc-lech', C.kiemRanhGioi('730640', b2).loi.some((l) => l.startsWith('cong3-chong-lan-truc-truc-lech:0:73064020')));
}
{ // 13. Cặp DAC_DIEM ↔ DAC_DIEM trong cụm là cùng trục (07/11/2026, 721114): khai chongLanVanBan được, không phải chongLanTruc
  const b = nhapDongCung('721114', THU_MUC_DONG_CUNG_B5BF024);
  const r = C.kiemRanhGioi('721114', b);
  check('13a 721114: 5 cặp đặc điểm (lượn sóng/cuộn để cán lại/đai dải/tấm phổ dụng) khai chongLanVanBan ⇒ không còn -van-ban-truc', r.hopLe === true && !r.loi.some((l) => l.startsWith('cong2-chong-lan-van-ban-truc') || l.startsWith('cong2-chong-lan-truc')), r.loi);
  const b2 = nhapDongCung('721114', THU_MUC_DONG_CUNG_B5BF024);
  const m = (b2.dong8 || []).find((x) => x.hs === '72111415'); m.dieuKienSo = [{ fact: 'tenLoai', op: 'TEN_LOAI', value: 'Dạng cuộn để cán lại' }];
  check('13b đổi .15 sang khoá tên ⇒ cặp khác trục, chongLanVanBan không gỡ được', C.kiemRanhGioi('721114', b2).loi.some((l) => l.startsWith('cong2-chong-lan-van-ban-truc:72111414+72111415')), C.kiemRanhGioi('721114', b2).loi);
}
{ // 14. Ghép ứng viên (07/11/2026, lô 3): điều kiện trong HOẶC; đích chữ + mã ứng viên khi anh em bị phủ định ghi bằng mã
  for (const p of ['852910', '870829']) {
    const r = C.kiemRanhGioi(p, nhapDongCung(p, THU_MUC_DONG_CUNG_8BAEF5E));
    check(`14a ${p} (đích lồng, spec không đổi) không còn cong2-dong-khong-toi-duoc`, !r.loi.some((l) => l.startsWith('cong2-dong-khong-toi-duoc')), r.loi);
  }
  const b = nhapDongCung('870850', THU_MUC_DONG_CUNG_8BAEF5E);
  const r0 = C.kiemRanhGioi('870850', b);
  check('14b 870850 bản cũ (thiếu vế «không phải bộ phận») vẫn chồng lấn tầng lắp ráp ↔ bộ phận', r0.loi.some((l) => l.startsWith('cong2-chong-lan:')), r0.loi.slice(0, 3));
  for (const id of ['8708501', '8708502']) b.dieuKienNut.find((m) => m.id === id).dieuKienSo.push({ fact: 'laBoPhan', op: 'KHONG' });
  const r = C.kiemRanhGioi('870850', b);
  check('14c 870850 thêm laBoPhan KHONG ⇒ xanh, .96 «Bánh răng vành khăn» dưới tầng «Loại khác» tới được', r.hopLe === true, r.loi);
}
{ // 15. Lô 4 (07/11/2026): khoá từ vựng mới + chỉ số iốt không viết đơn vị
  const DK = require('../lib/dieu-kien-so.js'); const TV = require('../lib/tu-vung.js');
  const tr = '15119031 - - - - Có chỉ số iốt từ 30 trở lên, nhưng dưới 40';
  check('15a chiSoIot ≥ 30 (IV) đọc từ câu không viết đơn vị', DK.kiemDieuKien({ fact: 'chiSoIot', op: '>=', value: 30, donVi: 'IV' }, tr) === null);
  check('15b biên sau «, nhưng dưới 40» (có dấu phẩy) đọc được', DK.kiemDieuKien({ fact: 'chiSoIot', op: '<', value: 40, donVi: 'IV' }, tr) === null, DK.kiemDieuKien({ fact: 'chiSoIot', op: '<', value: 40, donVi: 'IV' }, tr));
  check('15c biên sai (< 45) vẫn bị bắt', DK.kiemDieuKien({ fact: 'chiSoIot', op: '<', value: 45, donVi: 'IV' }, tr) !== null);
  const doc = (k, t) => TV.docGiaTri(k, t).giaTri;
  check('15d thePhanDoan: «thể rắn» / «olein»', doc('thePhanDoan', 'Các phần phân đoạn thể rắn') === 'THE_RAN' && doc('thePhanDoan', 'olein hạt cọ') === 'THE_LONG');
  check('15e cachBienDoiDau: tái este hoá ≠ este hoá liên hợp', doc('cachBienDoiDau', 'Đã tái este hóa, trừ của cọ dầu') === 'TAI_ESTE_HOA' && doc('cachBienDoiDau', 'Đã este hóa liên hợp') === 'ESTE_HOA_LIEN_HOP' && doc('cachBienDoiDau', 'Elaiđin hóa, loại khác') === 'ELAIDIN_HOA');
  check('15f nhomPolyme: polypropylen ⇒ trùng hợp, nylon ⇒ trùng ngưng/tái sắp xếp, xenlulo acetat ⇒ không đọc', doc('nhomPolyme', 'Thanh nhựa polypropylen') === 'TRUNG_HOP' && doc('nhomPolyme', 'Sợi monofilament nylon') === 'TRUNG_NGUNG_HOAC_TAI_SAP_XEP' && doc('nhomPolyme', 'Thanh xenlulo acetat') === undefined);
  check('15g dangSanPhamNhom1518: «thổi khô» / «hỗn hợp … không ăn được»', doc('dangSanPhamNhom1518', 'dầu hạt lanh đã thổi khô') === 'DA_BIEN_DOI_HOA_HOC' && doc('dangSanPhamNhom1518', 'Các hỗn hợp hoặc các chế phẩm không ăn được từ mỡ') === 'HON_HOP_KHONG_AN_DUOC');
}
{ // 16. Lô 5 (07/11/2026): Chương 98 là lớp mã thay thế; tên nhóm 98xx từ biểu Tổng cục; máy in kết hợp theo bộ chức năng
  const T = require('../lib/hs-tree.js'); const TV = require('../lib/tu-vung.js');
  check('16a cây có tên nhóm 9810 nguyên văn biểu Tổng cục', T.nodeOf('9810')?.tenVi === 'Sắt hoặc thép để sản xuất tanh lốp xe' && /^bieu-thue@/.test(T.nodeOf('9810')?.tenNguon || ''), T.nodeOf('9810'));
  check('16b nhóm ngoài Chương 98 giữ tên chú giải (không bị tên dòng mã đè)', T.nodeOf('8443')?.tenVi && !T.nodeOf('8443')?.tenNguon, T.nodeOf('8443'));
  const r = C.kiemRanhGioi('981000', nhapDongCung('981000', THU_MUC_DONG_CUNG_BF788F5));
  check('16c 981000: hàng ngoài hai dòng 98 ⇒ cảnh báo cong1-chuong98-ngoai-dong, không còn cong1-khong-phu-kin', !r.loi.some((l) => l.startsWith('cong1-khong-phu-kin')) && r.canhBao.some((c) => c.startsWith('cong1-chuong98-ngoai-dong:')), r.loi);
  const doc = (t) => TV.docGiaTri('toHopChucNangMayIn', t).giaTri;
  check('16d máy in-copy-scan không fax ⇒ IN_COPY_SCAN (GĐ: .99); PC-Fax không tính fax; đủ bốn ⇒ IN_COPY_SCAN_FAX; in-copy-fax ⇒ IN_COPY_FAX', doc('Máy in đa năng in/copy/scan, in phun màu') === 'IN_COPY_SCAN' && doc('Máy in laser in, copy, scan, PC-Fax') === 'IN_COPY_SCAN' && doc('Máy in laser in, copy, scan, fax') === 'IN_COPY_SCAN_FAX' && doc('Máy in-copy-fax kết hợp') === 'IN_COPY_FAX' && doc('Máy in-copy, in bằng công nghệ in phun') === 'IN_COPY');
  { const DK = require('../lib/dieu-kien-so.js'); const b = nhapDongCung('844331', THU_MUC_DONG_CUNG_BF788F5);
    const H = (v) => ({ fact: 'toHopChucNangMayIn', op: 'TRONG', value: [v] }); const nutB = (id) => b.dieuKienNut.find((m) => m.id === id);
    nutB('8443311').dieuKienSo = [H('IN_COPY'), { fact: 'congNgheIn', op: 'TRONG', value: ['IN_PHUN'] }];
    nutB('8443312').dieuKienSo = [H('IN_COPY'), { fact: 'congNgheIn', op: 'TRONG', value: ['LASER'] }];
    nutB('8443313').dieuKienSo = [H('IN_COPY_FAX')];
    b.dong8.find((m) => m.hs === '84433191').dieuKienSo = [H('IN_COPY_SCAN_FAX')];
    check('16g 844331 ghi theo tổ hợp chức năng ⇒ xanh', C.kiemRanhGioi('844331', b).hopLe === true, C.kiemRanhGioi('844331', b).loi);
    const soTay = C.soTayTuNhap('844331', b);
    const r = DK.doiChieuPhanNhom('844331', [{ fact: 'toHopChucNangMayIn', giaTri: 'IN_COPY_SCAN', nguon: 'KHACH', trangThai: 'DA_CO' }, { fact: 'congNgheIn', giaTri: 'IN_PHUN', nguon: 'KHACH', trangThai: 'DA_CO' }], { soTay });
    const co = r.dong.filter((d) => d.ketQua === 'CO').map((d) => d.hs);
    check('16f máy in-copy-scan in phun, không fax ⇒ chỉ 84433199', co.length === 1 && co[0] === '84433199', r.dong.filter((d) => d.ketQua !== 'MAU_THUAN')); }
  const b = nhapDongCung('844331', THU_MUC_DONG_CUNG_BF788F5);
  check('16e 844331 bản cũ (tầng theo công nghệ in ↔ tầng in-copy-fax theo tên) chồng lấn', C.kiemRanhGioi('844331', b).loi.some((l) => l.startsWith('cong2-chong-lan')));
}
{ // 17. Lô 6 (07/11/2026, Chương 98): lớp tầng bọc ngoài / dòng lặp mã phân nhóm; laBoPhan KHONG theo anh em "Bộ phận"; mã tương ứng
  const T = require('../lib/hs-tree.js'); const S = require('../lib/so-tay.js');
  check('17a 984914: tiêu đề "Loại khác:" trần (r19480) bọc ngoài 9849143 — không KHONG_DAT', T.tangCua('984914').khongDat.length === 0 && T.conTang('984914~r19480').join() === '9849143');
  check('17b 984943: dòng lặp mã phân nhóm "- - Loại khác (trừ …)" (r19889) là tầng, .21/.29 nằm dưới', T.conTang('984943~r19889').join() === '98494321,98494329' && T.chaTang('98494310') === '984943');
  const b = nhapDongCung('984940', THU_MUC_DONG_CUNG_5174A56);
  check('17c 984940 bản cũ: ghế ↔ bộ phận chồng lấn', C.kiemRanhGioi('984940', b).loi.some((l) => l.startsWith('cong2-chong-lan:')));
  b.dieuKienNut.find((m) => m.id === '9849401').dieuKienSo.push({ fact: 'laBoPhan', op: 'KHONG' });
  const r = C.kiemRanhGioi('984940', b);
  check('17d thêm laBoPhan KHONG (anh em "Bộ phận") ⇒ xanh + cảnh báo căn cứ cấu trúc', r.hopLe === true && r.canhBao.includes('cong3-khong-bo-phan-tu-anh-em:9849401'), r.loi);
  const b2 = nhapDongCung('984940', THU_MUC_DONG_CUNG_5174A56);
  const m2 = b2.dong8.find((m) => m.hs === '98494011'); m2.dieuKienSo.push({ fact: 'laBoPhan', op: 'KHONG' });
  check('17e dòng KHÔNG có anh em "Bộ phận" ⇒ laBoPhan KHONG vẫn phải có chữ trong câu trích', C.kiemRanhGioi('984940', b2).loi.some((l) => l.startsWith('cong3-muc:98494011:')), C.kiemRanhGioi('984940', b2).loi);
  const src = S.sourcesFor('9811');
  check('17f nguồn tuongUng: hai dòng cùng chữ 9811.00.10 / .90 mang mã tương ứng nguyên văn biểu', /mã hàng tương ứng: 72\.24, 72\.25, 72\.26, 72\.27, 72\.28$/.test(src['tuongUng.98110010'] || '') && /mã hàng tương ứng: 72\.29$/.test(src['tuongUng.98110090'] || ''), [src['tuongUng.98110010'], src['tuongUng.98110090']]);
  const b3 = nhapDongCung('981100', THU_MUC_DONG_CUNG_5174A56);
  const A = 'Thép hợp kim có chứa nguyên tố Bo và/hoặc Crôm và/hoặc Titan trừ chủng loại thép cán phẳng được cán nóng — mã hàng tương ứng: ';
  b3.dong8 = [{ hs: '98110010', nguonLoai: 'AI_DA_KIEM', nguon: 'tuongUng.98110010', trich: `${A}72.24, 72.25, 72.26, 72.27, 72.28`, dieuKienSo: [{ fact: 'maHsTuongUng', op: 'CONG_DUNG', value: ['72.24', '72.25', '72.26', '72.27', '72.28'] }] },
    { hs: '98110090', nguonLoai: 'AI_DA_KIEM', nguon: 'tuongUng.98110090', trich: `${A}72.29`, dieuKienSo: [{ fact: 'maHsTuongUng', op: 'CONG_DUNG', value: ['72.29'] }] }];
  const r3 = C.kiemRanhGioi('981100', b3);
  check('17g 981100: hai dòng cùng chữ phân bằng maHsTuongUng ⇒ xanh', r3.hopLe === true, r3.loi);
  b3.dong8[1].dieuKienSo[0].value = ['72.28'];
  check('17h mã tương ứng sai (72.28 ở cả hai) ⇒ chồng lấn', C.kiemRanhGioi('981100', b3).loi.some((l) => l.startsWith('cong2-chong-lan')) || C.kiemRanhGioi('981100', b3).loi.some((l) => l.startsWith('cong3')), C.kiemRanhGioi('981100', b3).loi);
}
// Lô 7 (#1109): 984934, 984935 — vế tuỳ chọn «có hoặc không …», tên đầu liên hợp, ghép nối tiếp ≥ 3 tầng, hiệu chỉnh gạch biểu.
{
  const V = require('../lib/ho-so/tach-ve.js'); const T = require('../lib/hs-tree.js'); const TKM = require('../lib/ho-so/tang-khong-ma.js');
  const md = (s) => V.tachVe(s).ve.flatMap((v) => v.menhDe.filter((m) => !m.ngoac).map((m) => `${m.loai}/${m.kieu}:${m.chu}`));
  const a = md('Cầu chủ động có vi sai, có hoặc không kèm theo chi tiết khác của cụm hộp số, và các cầu bị động; các bộ phận của chúng');
  check('18a «có hoặc không kèm theo …» là vế PHỤ; «…, và các cầu bị động» là tên đầu', a.includes('PHU/TUY_CHON:có hoặc không kèm theo chi tiết khác của cụm hộp số') && a.includes('DAU/DAU:các cầu bị động') && !a.some((x) => x.startsWith('GIOI_HAN/KHONG')), a);
  const b = md('Các dụng cụ dùng cho các dụng cụ cầm tay, có hoặc không hoạt động bằng điện, hoặc dùng cho máy công cụ');
  check('18b dấu hiệu trong vế tuỳ chọn chưa qua dấu phẩy («bằng điện») không thành vế giới hạn; «hoặc dùng cho …» sau dấu phẩy vẫn là giới hạn', b.includes('PHU/TUY_CHON:có hoặc không hoạt động bằng điện') && !b.some((x) => /BANG:bằng điện/.test(x)) && b.some((x) => x.startsWith('GIOI_HAN/DUNG:dùng cho máy công cụ')) && !b.some((x) => /:hoặc$/.test(x)), b);
  const c = md('Giấy và bìa, có hoặc không trang trí bề mặt, ở dạng cuộn hoặc tờ');
  check('18c vế tuỳ chọn chỉ tới dấu phẩy đầu: «ở dạng cuộn hoặc tờ» vẫn là vế giới hạn', c.includes('PHU/TUY_CHON:có hoặc không trang trí bề mặt') && c.some((x) => x.startsWith('GIOI_HAN/') && /ở dạng cuộn/.test(x)), c);
  const t34 = TKM.tieuDeTrongPhanNhom('984934');
  const r65 = t34.find((x) => x.r === 19765); const r61 = t34.find((x) => x.r === 19761);
  check('18d 984934: «Loại khác» r19765 hiệu chỉnh gạch 3 → 4, nằm trong «Bộ phận» r19761 (mã tương ứng 8708.50.96/.99)', r65?.gach === 4 && r65.dongDuoi.join() === '98493459,98493460' && r61?.dongDuoi.includes('98493459') && T.chaTang('984934~r19765') === '984934~r19761', [r65, r61?.dongDuoi]);
  check('18e 984935: tiêu đề trước dòng lá đầu vào cây (Két nước r19797/r19798); tiêu đề phủ trọn phân nhóm là tên phân nhóm', T.chaTang('984935~r19798') === '984935~r19797' && T.nodeOf('984935')?.tenVi === 'Bộ phận khác và các phụ kiện' && T.chaTang('9849355') === '984935', [T.chaTang('984935~r19798'), T.nodeOf('984935')?.tenVi]);
  const b34 = nhapDongCung('984934', THU_MUC_DONG_CUNG_EC27049);
  b34.dong8.find((m) => m.hs === '98493480').phanConLai = ['98493479'];
  const r34 = C.kiemRanhGioi('984934', b34, { cong: [2] });
  check('18f 984934 cổng 2 xanh: chéo khoá «Cầu chủ động có vi sai» là tên đầu (cong2-ten-anh-em-roi); .13–.16 tới được nhờ ghép nối tiếp; .59/.60 tới được sau hiệu chỉnh gạch', r34.loi.length === 0 && r34.canhBao.includes('cong2-ten-anh-em-roi:98493411+98493458'), r34.loi.slice(0, 5));
  const r99 = C.kiemRanhGioi('846599', nhapDongCung('846599', THU_MUC_DONG_CUNG_EC27049));
  check('18h ghép nối tiếp theo TỪNG phương án HOẶC: 846599 .50 không trộn «đẽo bavia» với «khắc vạch» ⇒ vẫn xanh', r99.hopLe === true, r99.loi);
  // Soát #1158: 981820 .31/.39 không tới được vì tách "đích lồng" áp nhầm cho maHsTuongUng (mã tương ứng là định danh trực tiếp).
  const DK = require('../lib/dieu-kien-so.js');
  const st20 = C.soTayTuNhap('981820', nhapDongCung('981820', THU_MUC_DONG_CUNG_EC27049));
  const dk = (o) => Object.entries(o).map(([fact, giaTri]) => ({ fact, giaTri, nguon: 'KHACH', trangThai: 'DA_CO', bangChung: 'test' }));
  const v31 = DK.doiChieuDong8('98182031', dk({ tenLoai: 'Bơm nước', kieuBom: 'LY_TAM', soTangBom: 'MOT_TANG', kieuHutBom: 'MOT_CHIEU', huongTrucBom: 'NGANG', kieuTruyenDong: 'DAY_DAI', duongKinhTrong: 150, maHsTuongUng: '8413.70.11', laBoPhan: false, dungCho: 'ẑẑẑ' }), { soTay: st20 });
  check('18i 981820: bơm 8413.70.11 tới .31 — phủ định anh em .10 (mã 8413.20.10) TRÁI theo mã tương ứng, không bị tách đích lồng', v31.ketQua === 'CO', v31.duongDi.filter((e) => e.ketQua !== 'CO').map((e) => `${e.nut}:${e.ketQua}`));
  const b35 = nhapDongCung('984935', THU_MUC_DONG_CUNG_EC27049);
  b35.dong8 = b35.dong8.map((m) => (m.hs === '98493581' ? { ...m, dieuKienSo: [...m.dieuKienSo, { fact: 'laBoPhan', op: 'KHONG' }] } : m));
  const r35 = C.kiemRanhGioi('984935', b35, { cong: [3] });
  check('18g laBoPhan KHONG cạnh anh em «Các bộ phận khác» lấy căn cứ cấu trúc (984935 .81 «Thùng nhiên liệu»)', !r35.loi.some((l) => l.startsWith('cong3-muc:98493581')) && r35.canhBao.includes('cong3-khong-bo-phan-tu-anh-em:98493581'), r35.loi.filter((l) => l.includes('98493581')));
}
// Lô 8: «trừ loại …» là một dấu hiệu (981826), «cháy bằng …» là cách đốt (982130) — không cắt vế rỗng/nhầm vật liệu.
{
  const V = require('../lib/ho-so/tach-ve.js');
  const md = (s) => V.tachVe(s).ve.flatMap((v) => v.menhDe.filter((m) => !m.ngoac).map((m) => `${m.loai}/${m.kieu}:${m.chu}`));
  const a = md('Loại khác, trừ loại bằng đồng hoặc hợp kim đồng với đường kính trong từ 2,5 cm trở xuống');
  check('19a «trừ loại bằng đồng …» là MỘT vế trừ, không còn vế rỗng «trừ loại»', a.includes('GIOI_HAN/TRU:trừ loại bằng đồng hoặc hợp kim đồng') && !a.includes('GIOI_HAN/TRU:trừ loại'), a);
  const b = md('Loại khác, trừ loại dùng cho xe có động cơ');
  check('19b «trừ loại dùng cho …» giữ như cũ: một vế trừ trọn (dấu hiệu «trừ» không nuốt «loại dùng»)', b.includes('GIOI_HAN/TRU:trừ loại dùng cho xe có động cơ'), b);
  const c = md('Của loại khác, có động cơ đốt trong kiểu piston đốt cháy bằng tia lửa điện');
  check('19c «đốt cháy bằng tia lửa điện» không cắt «bằng» thành vế vật liệu', !c.some((x) => x.startsWith('GIOI_HAN/BANG')), c);
}
console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
