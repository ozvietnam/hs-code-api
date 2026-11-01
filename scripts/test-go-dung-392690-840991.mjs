// Gỡ hai DỪNG cuối lát 1 (vòng 8 — 392690, 840991) (#577, sau PR #715: hai DỪNG còn lại). Hai quyết định GĐ (01/11/2026), test đỏ trước:
//   A. 392690 (#683) — chongLanVanBan giữa hai nhánh CÙNG TRỤC (cả hai CONG_DUNG, hoặc cả hai TEN_LOAI) được nhận kể cả khi
//      nút nằm trong cụm chongLanTruc đã khai: lệnh cấm vòng 3 chỉ nhắm cặp KHÁC trục (tên ↔ công dụng phải qua chongLanTruc).
//      Mọi đòi hỏi cũ của chongLanVanBan giữ nguyên (trích nguyên văn hai nhánh, `-chi-trich-tieu-de`, khai thừa ⇒ `-thua`).
//      Lúc chạy không đổi (chongLanVanBan ⇒ hai mã, không tự chọn).
//   B. 840991 (#661) — phần còn lại có tên (`phanConLai`, "… khác") phủ định ĐIỀU KIỆN của anh em được nêu; anh em là TẦNG thì
//      phủ định "điều kiện tầng VÀ điều kiện của một con" — hàng thoả tầng mà không vào con nào rơi về phần còn lại. Cùng nghĩa ở
//      cổng 1/2 (lib/ho-so/cong-ranh-gioi.js) và lúc chạy (lib/dieu-kien-so.js#duongDiDong8 → doiChieuDong8, lib/ho-so/duong-di.js
//      → doi-chieu.js). "Loại khác" trần không đổi.
// Chỉ đọc bản nháp ĐÔNG CỨNG (scripts/fixtures/ho-so/ranh-gioi-fb2706c/, main fb2706c sau #715) — KHÔNG đọc bản nháp sống của
// data/ho-so; không đọc data/bench/, data/oz-export/. Không LLM, không mạng.
import './test-isolate-data.mjs';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { nhapDongCung } from './fixtures/ho-so/nhap-dong-cung.mjs';
const require = createRequire(import.meta.url);
const C = require('../lib/ho-so/cong-ranh-gioi.js');
const ML = require('../lib/ho-so/ma-loi.js');
const DK = require('../lib/dieu-kien-so.js');
const D = require('../lib/ho-so/duong-di.js');
const HS = require('../lib/ho-so/index.js');
const { doiChieu } = require('../lib/ho-so/doi-chieu.js');
const { loadSoTay } = require('../lib/so-tay-gates.js');

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${typeof x === 'string' ? x : JSON.stringify(x).slice(0, 1500)}`); } };
const co = (ds, tien) => (ds || []).some((l) => l.startsWith(tien));
const clone = (x) => JSON.parse(JSON.stringify(x));
const docMd = (p) => fs.readFileSync(path.join('docs', 'giao-viec', 'so-tay', p), 'utf8');
const FB = path.join(process.cwd(), 'scripts', 'fixtures', 'ho-so', 'ranh-gioi-fb2706c');
const nhapFb = (pn6) => nhapDongCung(pn6, FB);

// ════ A. 392690 — chongLanVanBan cùng trục trong cụm trục ═══════════════════════════════════════════════════════════════
const TIEU_DE = {
  3926903: 'Các sản phẩm vệ sinh, y tế và phẫu thuật',
  3926904: 'Các thiết bị, dụng cụ an toàn và bảo vệ',
  3926905: 'Các sản phẩm dùng cho công nghiệp',
};
const DONG = {
  39269032: 'Khuôn plastic lấy dấu răng', 39269039: 'Loại khác',
  39269041: 'Lá chắn bảo vệ của cảnh sát', 39269042: 'Mặt nạ bảo hộ sử dụng khi hàn', 39269044: 'Đệm cứu sinh dùng để bảo vệ người ngã từ trên cao xuống', 39269049: 'Loại khác',
  39269053: 'Băng truyền (dây curoa) hoặc đai truyền hoặc băng tải hoặc đai tải', 39269055: 'Móc hình chữ J hoặc khối chùm bằng plastic dùng cho ngòi nổ, kíp nổ', 39269059: 'Loại khác',
  39269020: 'Quạt và màn che kéo bằng tay',
};
const tieuDeCua = (hs) => TIEU_DE[hs.slice(0, 7)];
const lyDo = (a, b) => `Chữ biểu tự chồng giữa hai nhóm theo công dụng (cùng trục): .${a.slice(6)} "${DONG[a]}" thuộc "${tieuDeCua(a)}" ↔ .${b.slice(6)} "${DONG[b]}" thuộc "${tieuDeCua(b)}"; hàng thoả cả hai nhóm công dụng; không có căn cứ thứ tự.`;
// Mười cặp cùng trục CONG_DUNG mà bản nháp fb2706c còn đỏ (3926903/3926904 congDung ↔ 3926905 dungCho).
const CAP_CUNG_TRUC = [
  ['39269032', '39269059'], ['39269039', '39269053'], ['39269039', '39269055'], ['39269039', '39269059'], ['39269041', '39269059'],
  ['39269042', '39269059'], ['39269044', '39269059'], ['39269049', '39269053'], ['39269049', '39269055'], ['39269049', '39269059'],
];
const khoa = ([a, b]) => `${a}+${b}`;
const bo392690 = () => { const b = nhapFb('392690'); b.ghiChuSoan = (b.ghiChuSoan || []).filter((g) => g.loai !== 'DUNG'); return b; };
{
  const b0 = bo392690();
  // A1: khai đủ mười cặp cùng trục (trích hai nhánh + chữ của chính dòng) ⇒ xanh; cụm chongLanTruc vẫn phủ cặp khác trục.
  const b1 = clone(b0); b1.chongLanVanBan = CAP_CUNG_TRUC.map(([a, b]) => ({ cap: [a, b], lyDo: lyDo(a, b) }));
  const r1 = C.kiemRanhGioi('392690', b1);
  // (Đối chứng: bản nháp fb2706c không khai — đỏ đúng 10 cặp cong2-chong-lan này + cong2-chong-lan-truc 3926903/04/05; A1d xanh
  // khi khai đủ 10 cặp và không -thua ⇒ đúng 10 cặp đó chồng lấn. Bỏ lượt đối chứng để test nhanh hơn ~40 s.)
  check('A1a khai 10 cặp cùng trục CONG_DUNG trong cụm trục ⇒ KHÔNG cong2-chong-lan-van-ban-truc', !co(r1.loi, 'cong2-chong-lan-van-ban-truc:'), r1.loi);
  check('A1b … cảnh báo cong2-chong-lan-van-ban cho đúng 10 cặp', CAP_CUNG_TRUC.every((c) => co(r1.canhBao, `cong2-chong-lan-van-ban:${khoa(c)}:`)), r1.canhBao);
  check('A1c … cụm trục 3926903/04/05 hết lỗi cong2-chong-lan-truc (cặp khác trục đã phủ bởi chongLanTruc, cặp cùng trục đã khai)', !co(r1.loi, 'cong2-chong-lan-truc:'), r1.loi);
  check('A1d … bản nháp XANH (mọi cổng)', r1.hopLe === true, r1.loi);
  check('A1e … cụm chongLanTruc vẫn chỉ phủ cặp khác trục (cảnh báo -da-khai giữ 17 cặp)', co(r1.canhBao, 'cong2-chong-lan-truc-da-khai:39269010,39269020,3926903,3926904,3926905,39269060,3926908:17'), r1.canhBao);

  // A2: đòi hỏi cũ giữ nguyên + cặp KHÁC trục vẫn bị cấm.
  const b2 = clone(b1);
  const bo = (k) => { b2.chongLanVanBan = b2.chongLanVanBan.filter((x) => khoa(x.cap) !== k); };
  // (i) cặp khác trục .20 (TEN_LOAI) ↔ .39 (CONG_DUNG), nằm trong cụm đã khai ⇒ khai chongLanVanBan vẫn là lỗi -van-ban-truc.
  b2.chongLanVanBan.push({ cap: ['39269020', '39269039'], lyDo: `.20 "${DONG[39269020]}" ↔ .39 "Loại khác" thuộc "${TIEU_DE[3926903]}"; không có căn cứ thứ tự.` });
  // (ii) cặp cùng trục chỉ trích tiêu đề tổ tiên ⇒ -chi-trich-tieu-de.
  bo('39269041+39269059');
  b2.chongLanVanBan.push({ cap: ['39269041', '39269059'], lyDo: `"${TIEU_DE[3926904]}" ↔ "${TIEU_DE[3926905]}": hai nhóm công dụng không loại trừ nhau.` });
  // (iii) cặp cùng trục KHÔNG chồng lấn (.32 khuôn lấy dấu răng ↔ .53 băng truyền — tên rời nhau) ⇒ -thua.
  b2.chongLanVanBan.push({ cap: ['39269032', '39269053'], lyDo: `.32 "${DONG[39269032]}" thuộc "${TIEU_DE[3926903]}" ↔ .53 "${DONG[39269053]}" thuộc "${TIEU_DE[3926905]}".` });
  const r2 = C.kiemRanhGioi('392690', b2, { cong: [0, 2, 3] });
  check('A2a cặp KHÁC trục .20↔.39 trong cụm khai chongLanVanBan ⇒ vẫn cong2-chong-lan-van-ban-truc', co(r2.loi, 'cong2-chong-lan-van-ban-truc:39269020+39269039:'), r2.loi);
  check('A2b … và cụm vẫn báo cong2-chong-lan-truc (khai đó không gỡ được trục)', co(r2.loi, 'cong2-chong-lan-truc:'), r2.loi);
  check('A2c … cặp cùng trục khai đúng KHÔNG bị kéo theo thành -van-ban-truc', !r2.loi.some((l) => l.startsWith('cong2-chong-lan-van-ban-truc:') && !l.startsWith('cong2-chong-lan-van-ban-truc:39269020+39269039:')), r2.loi);
  check('A2d cặp cùng trục chỉ trích tiêu đề ⇒ cong3-chong-lan-chi-trich-tieu-de', co(r2.loi, 'cong3-chong-lan-chi-trich-tieu-de:39269041+39269059'), r2.loi);
  check('A2e cặp cùng trục không chồng lấn ⇒ cong2-chong-lan-van-ban-thua', co(r2.loi, 'cong2-chong-lan-van-ban-thua:39269032+39269053'), r2.loi);

  // A3: không khai chongLanTruc — trục suy từ khoá thật (congDung ↔ dungCho đều CONG_DUNG) ⇒ cặp cùng trục khai không thành
  // -van-ban-truc; cặp khác trục chưa phủ vẫn đỏ (cong2-chong-lan + cong2-chong-lan-truc).
  const b3 = clone(b1); delete b3.chongLanTruc;
  const r3 = C.kiemRanhGioi('392690', b3, { cong: [0, 2] });
  check('A3a không chongLanTruc: cặp cùng trục đã khai KHÔNG thành -van-ban-truc (trục suy từ khoá: congDung/dungCho)', !co(r3.loi, 'cong2-chong-lan-van-ban-truc:'), r3.loi);
  check('A3b … cặp khác trục chưa phủ vẫn đỏ: cong2-chong-lan + cong2-chong-lan-truc', co(r3.loi, 'cong2-chong-lan:') && co(r3.loi, 'cong2-chong-lan-truc:'), r3.loi);
}
// A4: tài liệu + giải thích mã.
{
  const g = ML.giaiThich('cong2-chong-lan-van-ban-truc:39269020+39269039:x');
  check('A4a ma-loi: -van-ban-truc nói chỉ cặp KHÁC trục; cặp cùng trục được khai', /khác trục/i.test(`${g?.giaiThich} ${g?.cachSua}`) && /cùng trục/i.test(`${g?.giaiThich} ${g?.cachSua}`), g);
  const g2 = ML.giaiThich('cong2-chong-lan-truc:3926905:3926903,3926904');
  check('A4b ma-loi: cong2-chong-lan-truc nói cặp cùng trục trong cụm khai chongLanVanBan', /cùng trục/i.test(`${g2?.giaiThich} ${g2?.cachSua}`), g2);
  check('A4c LUAT-CHUNG + QUY-TRINH ghi vòng 8: chongLanVanBan cùng trục trong cụm trục', /Vòng 8/.test(docMd('LUAT-CHUNG.md')) && /cùng trục/i.test(docMd('LUAT-CHUNG.md')) && /cùng trục/i.test(docMd('QUY-TRINH-SO-HOA.md')));
}

// ════ B. 840991 — phần còn lại có tên phủ định ĐIỀU KIỆN của anh em được nêu (tầng ⇒ tầng VÀ một con) ═════════════════════
const b840 = nhapFb('840991');
const st840 = C.soTayTuNhap('840991', b840);
const dk = (fact, giaTri, donVi) => ({ fact, giaTri, ...(donVi ? { donVi } : {}), nguon: 'KHACH', trangThai: 'DA_CO', bangChung: String(giaTri) });
const nhom = (hs, st = st840) => DK.duongDiDong8(hs, { soTay: st }).nhom;
{
  const g = nhom('84099172').find((x) => x.nut === '840991~r12982');
  check('B1a .72 (dưới 8409917 phanConLai): PHAI_KHONG tầng r12982 mang conTang = hai con 8409915/8409916 (điều kiện riêng của con)',
    g && g.chieu === 'PHAI_KHONG' && Array.isArray(g.conTang) && g.conTang.map((p) => p.nut).join(',') === '8409915,8409916'
    && g.conTang.every((p) => p.dieuKien.some((c) => c.fact === 'dungCho') && p.dieuKien.some((c) => c.fact === 'congSuat')), g);
  const khac = nhom('84099172').filter((x) => ['8409911', '8409912', '8409913', '8409914'].includes(x.nut));
  check('B1b anh em tầng CÓ con "Loại khác" trần (8409911..14) ⇒ không conTang (thuộc tầng ≡ điều kiện tầng — như cũ)', khac.length === 4 && khac.every((x) => !x.conTang), khac);
  const lk = nhom('84099179').find((x) => x.nut === '84099171');
  check('B1c dòng "Loại khác" trần .79 phủ định anh em dòng — không conTang (luật "Loại khác" không đổi)', lk && !lk.conTang, lk);
  const st2 = clone(st840); st2.dieuKienNut.find((m) => m.id === '8409917').phanConLai = ['8409914'];
  check('B1d phanConLai mảng không nêu r12982 ⇒ không phủ định r12982 (không nhóm, không conTang)', !nhom('84099172', st2).some((x) => x.nut === '840991~r12982'), nhom('84099172', st2).map((x) => x.nut));
  // Con chưa số hoá ⇒ không biết con phủ gì ⇒ giữ luật cũ (phủ định cả tầng).
  const st3 = clone(st840); st3.dieuKienNut.find((m) => m.id === '8409916').dieuKienSo = [];
  check('B1e một con của tầng chưa số hoá ⇒ không conTang (giữ phủ định cả tầng — hướng an toàn)', !nhom('84099172', st3).find((x) => x.nut === '840991~r12982')?.conTang);
  // Con chia KÍN một khoá số ⇒ tầng phủ kín, không conTang (848180 r14579 "Van plastic khác" phanConLai nêu r14566 "Van cổng …"
  // có ba con ≤ 5 cm | 5–40 cm | > 40 cm) — chưa biết đường kính vẫn MÂU THUẪN như cũ, không hạ thành THIẾU. Spec đông cứng vòng 6.
  const b848 = C.apSpec(JSON.parse(fs.readFileSync('scripts/fixtures/ho-so/spec-vong-6/848180.json', 'utf8')), null, { ngay: '2026-10-31' }).banNhap;
  const st848 = C.soTayTuNhap('848180', b848);
  const g848 = (st) => DK.duongDiDong8('84818094', { soTay: st }).nhom.find((x) => x.nut === '848180~r14566');
  check('B1f 848180 .94 (dưới r14579 phanConLai): r14566 có ba con chia kín duongKinhTrong ⇒ PHAI_KHONG không conTang', g848(st848) && g848(st848).chieu === 'PHAI_KHONG' && !g848(st848).conTang, g848(st848));
  const st848b = clone(st848); st848b.dong8.find((m) => m.hs === '84818074').dieuKienSo = [{ fact: 'duongKinhTrong', op: '>', value: 50, donVi: 'cm' }];
  check('B1g … hở một khoảng (40–50 cm) ⇒ conTang ba con', g848(st848b)?.conTang?.length === 3, g848(st848b));
}
{
  const PHU = 'máy phát điện phụ của tàu thuyền thuộc Chương 89';
  const pn = (duKien, st = st840) => DK.doiChieuPhanNhom('840991', duKien, { soTay: st });
  const r1 = pn([dk('tenLoai', 'Thân động cơ'), dk('dungCho', PHU), dk('congSuat', 15000, 'W')]);
  check('B2a thân động cơ cho động cơ PHỤ của tàu Ch.89 (thoả tầng r12982, không con nào) ⇒ chỉ .72 (trước: không dòng nào)', JSON.stringify(r1.dongCo) === '["84099172"]', r1);
  const r1b = DK.doiChieuDong8('84099172', [dk('tenLoai', 'Thân động cơ'), dk('dungCho', PHU)], { soTay: st840 });
  check('B2b … kể cả chưa biết công suất (con nào cũng TRÁI dungCho) ⇒ .72 CO', r1b.ketQua === 'CO', r1b.duongDi.filter((e) => e.chieu === 'PHAI_KHONG'));
  const MAY_THUY = 'động cơ máy thủy của tàu thuyền thuộc Chương 89';
  const r2 = pn([dk('tenLoai', 'Thân động cơ'), dk('dungCho', MAY_THUY), dk('congSuat', 15000, 'W')]);
  check('B2c thân động cơ cho động cơ MÁY THỦY 15 kW ⇒ chỉ .51 (.72 MÂU THUẪN — hàng thuộc con 8409915)', JSON.stringify(r2.dongCo) === '["84099151"]'
    && r2.dong.find((d) => d.hs === '84099172').ketQua === 'MAU_THUAN', r2);
  const r3 = DK.doiChieuDong8('84099172', [dk('tenLoai', 'Thân động cơ'), dk('dungCho', MAY_THUY)], { soTay: st840 });
  check('B2d … máy thủy chưa biết công suất ⇒ .72 THIẾU, hỏi congSuat (không tự chốt)', r3.ketQua === 'THIEU' && r3.thieu.some((t) => t.fact === 'congSuat'), r3);
  const r4 = pn([dk('tenLoai', 'Thân động cơ'), dk('dungCho', 'xe thuộc nhóm 87.01')]);
  check('B2e hàng thoả anh em không có conTang (8409912) vẫn bị phủ định như cũ ⇒ chỉ .22', JSON.stringify(r4.dongCo) === '["84099122"]', r4);
}
{
  // Lúc chạy hồ sơ (lib/ho-so/duong-di.js → doi-chieu.js): cùng nghĩa.
  const st = clone(loadSoTay('8409') || { nhom: '8409', dong8: [], dieuKienNut: [] });
  const duyet = (m) => ({ ...m, nguonLoai: 'CLAUDE_DUYET' });
  st.nhom = '8409';
  st.dong8 = [...(st.dong8 || []).filter((m) => !String(m.hs).startsWith('840991')), ...st840.dong8.map(duyet)];
  st.dieuKienNut = [...(st.dieuKienNut || []).filter((m) => !String(m.id).startsWith('840991')), ...st840.dieuKienNut.map(duyet)];
  const hoSo = async (ma, duKien) => {
    const dd = D.dungDuongDi(ma, 'NHAP', { soTay: st, bangHieuChinh: { muc: [] } });
    return { dd, h: await doiChieu(HS.khungHoSo(dd, { duKien }), { soTay: st, bangHieuChinh: { muc: [] }, tinHieuDanhMuc: async () => [], tienLeMaKhac: async () => [], demKhoOz: async () => ({ tong: 0, maKhac: [] }) }) };
  };
  const { dd, h } = await hoSo('84099172', [dk('tenLoai', 'Thân động cơ'), dk('dungCho', 'máy phát điện phụ của tàu thuyền thuộc Chương 89')]);
  const e0 = dd.duongDiPhapLy.find((e) => e.nut === '840991~r12982');
  check('B3a dungDuongDi mang conTang sang mục PHAI_KHONG r12982', Array.isArray(e0?.conTang) && e0.conTang.length === 2, e0);
  const e = h.duongDiPhapLy.find((x) => x.nut === '840991~r12982');
  check('B3b doiChieu: động cơ phụ tàu Ch.89 ⇒ mục r12982 CO (không thuộc tầng vì không vào con nào)', e?.ketQua === 'CO', e);
  const { h: h2 } = await hoSo('84099172', [dk('tenLoai', 'Thân động cơ'), dk('dungCho', 'động cơ máy thủy của tàu thuyền thuộc Chương 89'), dk('congSuat', 15000, 'W')]);
  const e2 = h2.duongDiPhapLy.find((x) => x.nut === '840991~r12982');
  check('B3c doiChieu: máy thủy 15 kW ⇒ mục r12982 MAU_THUAN', e2?.ketQua === 'MAU_THUAN', e2);
}
{
  // Cổng 1: tầng không con "phần còn lại" mà hàng thoả tầng, không vào con nào, rơi về anh em phanConLai nêu tầng ⇒ không lỗ.
  const r = C.kiemRanhGioi('840991', b840, { cong: [0, 1] });
  check('B4a cổng 1: fb2706c hết cong1-khong-phu-kin:840991~r12982 (8409917 phanConLai nhận phần còn lại của tầng)', !co(r.loi, 'cong1-khong-phu-kin:840991~r12982'), r.loi);
  const b2 = clone(b840); b2.dieuKienNut.find((m) => m.id === '8409917').phanConLai = ['8409914'];
  const r2 = C.kiemRanhGioi('840991', b2, { cong: [0, 1] });
  check('B4b … phanConLai không nêu r12982 ⇒ vẫn cong1-khong-phu-kin:840991~r12982 (cổng không nới bừa)', co(r2.loi, 'cong1-khong-phu-kin:840991~r12982'), r2.loi);
  check('B4c LUAT-CHUNG + QUY-TRINH ghi: phanConLai phủ định điều kiện anh em; anh em là tầng ⇒ tầng VÀ một con', /tầng VÀ/i.test(docMd('LUAT-CHUNG.md')) && /tầng VÀ/i.test(docMd('QUY-TRINH-SO-HOA.md')));
}

console.log(`\n${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
