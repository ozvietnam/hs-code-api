#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * tu-vung@2 (#577 L1-3a, đề xuất docs/giao-viec/so-tay/de-xuat-tu-vung-2.md) — siêu tập của tu-vung@1.
 *
 * Kiểm:
 *  1. Nạp: runtime/công cụ mặc định tu-vung@2; tu-vung@1 vẫn nạp được theo tên (bench lát 1 khoá băm theo @1, sha256 không đổi).
 *  2. Siêu tập: mọi khoá @1 GIỐNG HỆT trong @2 (kiemSieuTap), danh sách chung của @1 là tiền tố của @2.
 *  3. Hai luật bộ đọc #667/#675 đã chuyển vào dữ liệu (khongPhaiPhuDinh, cauTrucCo) và xoá khỏi mã — cách đọc 53 khoá @1 KHÔNG
 *     đổi: vân tay đọc ghi bằng mã TRƯỚC khi đổi (scripts/fixtures/tu-vung/vang-doc-tu-vung-1.json) phải khớp.
 *  4. Bộ đọc từng khoá mới: khẳng định / giá trị KHÔNG / phủ định (Vi), En, Zh.
 *  5. Câu hỏi Vi + Zh; bảng hiệu chỉnh tiền lệ 853710-01/02/03 hỏi daNapChuongTrinh; gói soạn ranh giới không còn "nghi thiếu khoá"
 *     cho ý đã có khoá.
 * Không gọi mạng/LLM, không ghi data/, không mở bộ đề lát 1 (data/bench/ho-so-lat-1*).
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { boChu, vanTay, TEP_VANG } from './vang-doc-tu-vung-1.mjs';
const require = createRequire(import.meta.url);
const T = require('../lib/tu-vung.js');

let pass = 0; let fail = 0;
const check = (n, c, d) => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n}`, d === undefined ? '' : JSON.stringify(d).slice(0, 700)); } };
const coTrong = (r, text) => typeof r?.bangChung === 'string' && r.bangChung.length > 0 && text.normalize('NFC').includes(r.bangChung);
const CJK = /[㐀-鿿]/u;
const clone = (x) => JSON.parse(JSON.stringify(x));
const KHOA_MOI = { chiHoacChuYeu: 'CO_KHONG', thietKeChoTreEm: 'CO_KHONG', daNapChuongTrinh: 'CO_KHONG', soLoi: 'SO', soSoi: 'SO', tiLe: 'SO', phuongPhapCheTao: 'LIET_KE' };

// ── 1. Nạp theo phiên bản ─────────────────────────────────────────────────────────────────────────────────────────
const tv1 = T.taiTuVung('tu-vung@1');
const tv2 = T.taiTuVung();
check('runtime nạp tu-vung@2 mặc định (TEP_TU_VUNG)', T.TEP_TU_VUNG === 'tu-vung/tu-vung@2.json' && tv2.phienBan === 'tu-vung@2', { tep: T.TEP_TU_VUNG, pb: tv2.phienBan });
check('tu-vung@1 vẫn nạp theo tên — bench lát 1 khoá theo @1 (PHIEN_BAN_KHOA_BENCH)', tv1.phienBan === 'tu-vung@1' && T.PHIEN_BAN_KHOA_BENCH === 'tu-vung@1' && tv1 !== tv2, { pb1: tv1.phienBan, khoa: T.PHIEN_BAN_KHOA_BENCH });
check('băm tu-vung@1 không đổi (67de4948a117…): tệp @1 không bị sửa', T.phienBan('tu-vung@1').sha256.startsWith('67de4948a117') && T.sha256Tep('data/tu-vung/tu-vung@1.json').startsWith('67de4948a117'), T.phienBan('tu-vung@1'));
check('phienBan() mặc định = tu-vung@2 + sha256 của tệp @2 (HoSoPhanLoai.phienBan.tuVung)', T.phienBan().ten === 'tu-vung@2' && T.phienBan().sha256 === T.sha256Tep('data/tu-vung/tu-vung@2.json'), T.phienBan());

// ── 2. Lược đồ + siêu tập ────────────────────────────────────────────────────────────────────────────────────────
check('tu-vung@2 qua máy kiểm lược đồ (0 lỗi)', T.kiemTuVung(tv2).length === 0, T.kiemTuVung(tv2));
check('tu-vung@1 vẫn qua máy kiểm lược đồ (0 lỗi)', T.kiemTuVung(tv1).length === 0, T.kiemTuVung(tv1));
check('kiemSieuTap(@1, @2) = 0 lỗi', typeof T.kiemSieuTap === 'function' && T.kiemSieuTap(tv1, tv2).length === 0, T.kiemSieuTap && T.kiemSieuTap(tv1, tv2));
{
  const k2 = new Map(tv2.khoa.map((k) => [k.khoa, k]));
  const lech = tv1.khoa.filter((k) => JSON.stringify(k) !== JSON.stringify(k2.get(k.khoa))).map((k) => k.khoa);
  check(`mọi khoá tu-vung@1 (${tv1.khoa.length}) có trong @2 và GIỐNG HỆT (so JSON)`, tv1.khoa.length === 53 && lech.length === 0, lech);
  const them = tv2.khoa.filter((k) => !tv1.khoa.some((x) => x.khoa === k.khoa)).map((k) => k.khoa).sort();
  check('@2 chỉ thêm đúng 7 khoá mới', JSON.stringify(them) === JSON.stringify(Object.keys(KHOA_MOI).sort()), them);
  check('khoá @1 giữ nguyên thứ tự ở đầu danh sách @2', tv1.khoa.every((k, i) => tv2.khoa[i]?.khoa === k.khoa));
}
if (typeof T.kiemSieuTap === 'function') {
  const loiCo = (mut, ma) => { const x = clone(tv2); mut(x); return T.kiemSieuTap(tv1, x).some((l) => l.startsWith(ma)); };
  for (const [ten, mut, ma] of [
    ['sửa nhãn một khoá @1', (x) => { x.khoa[0].nhanVi = 'điện áp (sửa)'; }, 'sieu-tap-khoa-lech'],
    ['xoá một khoá @1', (x) => { x.khoa.splice(3, 1); }, 'sieu-tap-thieu-khoa'],
    ['bỏ một mục khongPhaiPhuDinh của @1', (x) => { x.khongPhaiPhuDinh.shift(); }, 'sieu-tap-danh-sach'],
    ['chèn mục mới vào GIỮA phuDinhChung (đổi thứ tự @1)', (x) => { x.phuDinhChung.splice(1, 0, 'chả'); }, 'sieu-tap-danh-sach'],
    ['đổi hệ số đơn vị @1', (x) => { x.heDonVi.dai.cm = 11; }, 'sieu-tap-bang'],
    ['đổi biệt danh đơn vị @1', (x) => { x.bietDanhDonVi.mm = 'cm'; }, 'sieu-tap-bang'],
    ['bớt từ so sánh @1', (x) => { x.soSanh.truoc['<='].pop(); }, 'sieu-tap-bang'],
  ]) check(`kiemSieuTap ĐỎ khi ${ten}`, loiCo(mut, ma), (() => { const x = clone(tv2); mut(x); return T.kiemSieuTap(tv1, x); })());
}
{
  const loiCo = (mut, ma) => { try { const x = clone(tv2); mut(x); return T.kiemTuVung(x).some((l) => l.startsWith(ma)); } catch { return false; } };
  check('kiemTuVung ĐỎ: cauTrucCo trỏ khoá không có / không phải CO_KHONG', loiCo((x) => { x.cauTrucCo.khoaKhongCo = x.cauTrucCo.laBoPhan; }, 'cau-truc-khoa') && loiCo((x) => { x.cauTrucCo.dienAp = x.cauTrucCo.laBoPhan; }, 'cau-truc-khoa'));
  check('kiemTuVung ĐỎ: cauTrucCo mẫu hỏng', loiCo((x) => { x.cauTrucCo.laBoPhan[0].mau = '(('; }, 'mau-khong-hop-le'));
  check('kiemTuVung ĐỎ: demSo/docPhanSo chỉ cho SO; cumDaiThang chỉ cho LIET_KE', loiCo((x) => { x.khoa.find((k) => k.khoa === 'laBoPhan').demSo = true; }, 'co-chi-cho-kieu') && loiCo((x) => { x.khoa.find((k) => k.khoa === 'dienAp').cumDaiThang = true; }, 'co-chi-cho-kieu'));
  check('kiemTuVung ĐỎ: soChu giá trị không phải số nguyên dương', loiCo((x) => { x.soChu.hai = 'hai'; }, 'so-chu'));
  check('kiemTuVung ĐỎ: soSanhDem op lạ', loiCo((x) => { x.soSanhDem['=>'] = ['hơn']; }, 'so-sanh-dem'));
}

// ── 3. Luật bộ đọc #667/#675 đã vào dữ liệu, cách đọc @1 không đổi ─────────────────────────────────────────────────
{
  const src = fs.readFileSync('lib/tu-vung.js', 'utf8');
  check('#667 CUM_DANH_TU_KHONG không còn trong mã — nằm ở khongPhaiPhuDinh của @2', !/const CUM_DANH_TU_KHONG\s*=/.test(src) && ['không\\s+khí', 'không\\s+gian', 'không\\s+trung'].every((m) => (tv2.khongPhaiPhuDinh || []).includes(m)) && (tv2.khongPhaiPhuDinh || []).some((m) => m.startsWith('(?:chân|hàng)\\s+không(?!')), tv2.khongPhaiPhuDinh);
  check('#675 CAU_TRUC_CO không còn trong mã — nằm ở cauTrucCo.laBoPhan của @2', !/const CAU_TRUC_CO\s*=\s*\{/.test(src) && Array.isArray(tv2.cauTrucCo?.laBoPhan) && /rời/.test(tv2.cauTrucCo.laBoPhan[0].mau) && /tháo/.test(tv2.cauTrucCo.laBoPhan[0].truLaiTruoc), tv2.cauTrucCo);
  const vang = JSON.parse(fs.readFileSync(TEP_VANG, 'utf8'));
  const chu = boChu();
  check(`vân tay: bộ chữ không đổi (${chu.length} chữ)`, chu.length === vang.soChu && require('node:crypto').createHash('sha256').update(chu.join('\n')).digest('hex') === vang.sha256Chu, { co: chu.length, vang: vang.soChu });
  const vt = vanTay(T, tv1.khoa.map((k) => k.khoa), chu);
  const lech = Object.keys(vang.vanTay).filter((k) => JSON.stringify(vt[k]) !== JSON.stringify(vang.vanTay[k]));
  check(`vân tay đọc 53 khoá @1 trên mã + dữ liệu mới KHỚP bản ghi trước khi đổi (${Object.values(vang.vanTay).reduce((n, v) => n + v.soKetQua, 0)} kết quả)`, Object.keys(vang.vanTay).length === 53 && lech.length === 0, lech.map((k) => ({ k, co: vt[k], vang: vang.vanTay[k] })));
}

// ── 4. Khoá mới: nhãn, câu hỏi, cách đọc ───────────────────────────────────────────────────────────────────────────
for (const [khoa, kieu] of Object.entries(KHOA_MOI)) {
  let k = null; try { k = T.layKhoa(khoa); } catch { k = null; }
  check(`${khoa}: có trong tu-vung@2, kiểu ${kieu}, nhãn Vi/En/Zh, cachDoc Vi/En/Zh không rỗng`, Boolean(k) && k.kieu === kieu && k.nhanVi && k.nhanEn && CJK.test(k.nhanZh || '')
    && ['vi', 'en', 'zh'].every((l) => kieu === 'LIET_KE' ? Object.values(k.moTaGiaTri).every((m) => (m.cachDoc?.[l] || []).length) : (k.cachDoc?.[l] || []).length), k);
  let vi = null; let zh = null; try { vi = T.cauHoiCho(khoa, 'vi'); zh = T.cauHoiCho(khoa, 'zh'); } catch { /* đỏ ở dưới */ }
  check(`${khoa}: câu hỏi Vi + Zh (cauHoiCho)`, typeof vi === 'string' && vi.endsWith('?') && typeof zh === 'string' && CJK.test(zh) && /？$/.test(zh), { vi, zh });
  check(`${khoa}: nguonLoai AI_DA_KIEM (chưa chấm duyệt độc lập — không tự gắn CLAUDE_DUYET)`, k?.nguonLoai === 'AI_DA_KIEM', k?.nguonLoai);
}
check('chamDuyetDocLap @2: khoá mới CHUA_CHAM, liệt kê đủ 7 khoá', tv2.chamDuyetDocLap?.trangThai === 'CHUA_CHAM' && Object.keys(KHOA_MOI).every((k) => (tv2.chamDuyetDocLap?.khoaChuaCham || []).includes(k)), tv2.chamDuyetDocLap);

const doc = (khoa, t) => { try { return T.docGiaTri(khoa, t); } catch (e) { return { loi: String(e.message) }; } };
const la = (ten, khoa, t, v, them = {}) => {
  const r = doc(khoa, t);
  const ok = r.trangThai === 'DA_CO' && JSON.stringify(r.giaTri) === JSON.stringify(v) && coTrong(r, t)
    && (them.op === undefined || (them.op === null ? r.op === undefined : r.op === them.op)) && (!them.bc || r.bangChung.includes(them.bc));
  check(`${khoa} ${ten}: "${t}" ⇒ ${JSON.stringify(v)}${them.op ? ` op ${them.op}` : ''}${them.bc ? ` (bangChung ⊇ "${them.bc}")` : ''}`, ok, r);
};
const chuaBiet = (ten, khoa, t) => { const r = doc(khoa, t); check(`${khoa} ${ten}: "${t}" ⇒ CHUA_BIET`, r.trangThai === 'CHUA_BIET', r); return r; };

// chiHoacChuYeu — "chỉ hoặc chủ yếu dùng cho" (8414.59.10, 8537.10.20, 8420.10.10)
la('khẳng định (chữ biểu 8414.59.10)', 'chiHoacChuYeu', 'Quạt, loại chỉ sử dụng hoặc chủ yếu sử dụng để làm mát bộ vi xử lý', true, { bc: 'chỉ sử dụng hoặc chủ yếu sử dụng' });
la('khẳng định (chữ biểu 8537.10.20)', 'chiHoacChuYeu', 'Bảng phân phối chỉ dùng hoặc chủ yếu dùng với các hàng hóa thuộc nhóm 84.71', true, { bc: 'chỉ dùng hoặc chủ yếu dùng' });
la('khẳng định (chuyên dùng)', 'chiHoacChuYeu', 'Quạt tản nhiệt chuyên dùng cho CPU máy tính', true);
la('khẳng định En', 'chiHoacChuYeu', 'Cooling fan of a kind used solely or principally with CPUs', true);
la('khẳng định Zh', 'chiHoacChuYeu', '电脑CPU专用散热风扇', true);
la('khẳng định Zh (主要用于)', 'chiHoacChuYeu', '主要用于电信设备的配电板', true);
la('giá trị KHÔNG (đa dụng)', 'chiHoacChuYeu', 'Quạt công nghiệp đa dụng 220V', false);
la('giá trị KHÔNG En', 'chiHoacChuYeu', 'general purpose fan', false);
la('giá trị KHÔNG Zh', 'chiHoacChuYeu', '通用风扇', false);
la('phủ định', 'chiHoacChuYeu', 'Quạt không chuyên dùng cho máy tính', false, { bc: 'không chuyên dùng' });
chuaBiet('"không chỉ dùng cho" — không phải "chỉ dùng cho", không đoán', 'chiHoacChuYeu', 'Quạt không chỉ dùng cho máy tính mà còn cho tủ điện');
chuaBiet('"chủ yếu" không đi với dùng/sử dụng', 'chiHoacChuYeu', 'Quạt có thành phần chủ yếu là nhôm');
chuaBiet('không có chữ nào', 'chiHoacChuYeu', 'Quạt điện 220V 60W');

// thietKeChoTreEm — "được thiết kế chủ yếu cho trẻ em" (9503.00.80)
la('khẳng định (chữ biểu 9503.00.80)', 'thietKeChoTreEm', 'Thiết bị giáo dục điện tử tương tác cầm tay được thiết kế chủ yếu cho trẻ em', true, { bc: 'thiết kế chủ yếu cho trẻ em' });
la('khẳng định (dành cho trẻ em)', 'thietKeChoTreEm', 'Máy học tiếng Anh dành cho trẻ em từ 3 tuổi', true);
la('khẳng định En', 'thietKeChoTreEm', 'handheld learning toy designed for children aged 3+', true);
la('khẳng định Zh', 'thietKeChoTreEm', '儿童学习机，手持式', true);
la('giá trị KHÔNG (người lớn)', 'thietKeChoTreEm', 'Máy đọc sách điện tử dành cho người lớn', false);
la('giá trị KHÔNG Zh', 'thietKeChoTreEm', '成人用电子阅读器', false);
la('phủ định', 'thietKeChoTreEm', 'Thiết bị này không dành cho trẻ em', false, { bc: 'không dành cho trẻ em' });
chuaBiet('nhãn cảnh báo "không dành cho trẻ em dưới 3 tuổi" — không đoán', 'thietKeChoTreEm', 'Đồ chơi lắp ghép, không dành cho trẻ em dưới 3 tuổi');
chuaBiet('nhãn cảnh báo En', 'thietKeChoTreEm', 'Building blocks, not suitable for children under 3 years');
chuaBiet('không có chữ nào', 'thietKeChoTreEm', 'Máy học ngoại ngữ cầm tay, pin sạc');

// daNapChuongTrinh — bo mạch đã nạp chương trình/firmware (TB 4040, 1159/TB-TCHQ; hiệu chỉnh 853710-0x)
la('khẳng định', 'daNapChuongTrinh', 'Bo mạch điều khiển máy lọc không khí, đã nạp chương trình', true, { bc: 'đã nạp chương trình' });
la('khẳng định (firmware)', 'daNapChuongTrinh', 'PCBA đã nạp firmware điều khiển', true);
la('khẳng định En', 'daNapChuongTrinh', 'pre-programmed MCU control board', true);
la('khẳng định Zh', 'daNapChuongTrinh', '已烧录程序的控制板', true);
la('giá trị KHÔNG (trích 4040/TB-TCHQ)', 'daNapChuongTrinh', 'Bảng mạch điều khiển của thiết bị lọc không khí (bảng mạch chưa trải qua quá trình ghi dữ liệu điều khiển)', false, { bc: 'chưa trải qua quá trình ghi dữ liệu điều khiển' });
la('giá trị KHÔNG (trích 1159/TB-TCHQ)', 'daNapChuongTrinh', 'Bảng mạch đã được lắp ráp hoàn chỉnh tuy nhiên chưa được ghi phần mềm điều khiển ở công đoạn này', false, { bc: 'chưa được ghi phần mềm điều khiển' });
la('giá trị KHÔNG En', 'daNapChuongTrinh', 'unprogrammed control board', false);
la('giá trị KHÔNG Zh', 'daNapChuongTrinh', '未烧录的控制板', false);
la('phủ định', 'daNapChuongTrinh', 'bo mạch không nạp chương trình', false, { bc: 'không nạp chương trình' });
chuaBiet('"máy nạp chương trình" là tên thiết bị nạp, không phải bo mạch đã nạp', 'daNapChuongTrinh', 'Máy nạp chương trình cho vi điều khiển');
chuaBiet('không có chữ nào', 'daNapChuongTrinh', 'Bo mạch điều khiển máy lọc không khí có vi điều khiển');

// soLoi — số lõi dẫn
la('khẳng định', 'soLoi', 'Cáp điện 2 lõi, mỗi lõi 7 sợi, bọc PVC', 2, { op: null });
la('khẳng định số chữ', 'soLoi', 'dây điện bốn lõi bọc PVC', 4);
la('"hai lõi hoặc hơn" ⇒ >= 2', 'soLoi', 'Cáp dẹt có hai lõi hoặc hơn', 2, { op: '>=', bc: 'hai lõi hoặc hơn' });
la('En "two or more cores" ⇒ >= 2', 'soLoi', 'cable with two or more cores', 2, { op: '>=' });
la('Zh', 'soLoi', '4芯电缆', 4);
la('Zh "两芯及以上" ⇒ >= 2', 'soLoi', '两芯及以上电缆', 2, { op: '>=' });
la('so sánh phủ định "không quá 4 lõi" ⇒ <= 4', 'soLoi', 'cáp không quá 4 lõi', 4, { op: '<=' });
chuaBiet('"đường kính lõi 2 mm" là đường kính, không phải số lõi', 'soLoi', 'đường kính lõi 2 mm');
chuaBiet('không có số', 'soLoi', 'cáp lõi đồng bọc PVC');
chuaBiet('"mười hai lõi" (số ghép) — không đọc thành 2', 'soLoi', 'cáp mười hai lõi');
chuaBiet('"十二芯" (số ghép) — không đọc thành 2', 'soLoi', '十二芯电缆');
chuaBiet('"40 sợi" là số sợi, không phải số lõi', 'soLoi', 'cáp dẹt 40 sợi');

// soSoi — số sợi (chữ "sợi" của biểu: sợi dẫn 8544.42.91, sợi bện, sợi quang)
la('"hai sợi hoặc hơn" (chữ biểu 8544.42.91) ⇒ >= 2', 'soSoi', 'Cáp dữ liệu dẹt có hai sợi hoặc hơn, cách điện bằng cao su, plastic hoặc giấy', 2, { op: '>=', bc: 'hai sợi hoặc hơn' });
la('khẳng định', 'soSoi', 'dây đồng bện 7 sợi', 7, { op: null });
la('khẳng định (sợi quang)', 'soSoi', 'cáp quang 12 sợi', 12);
la('En', 'soSoi', 'stranded wire, 7 strands', 7);
la('Zh', 'soSoi', '7股绞线', 7);
la('so sánh phủ định "không ít hơn hai sợi" ⇒ >= 2', 'soSoi', 'cáp không ít hơn hai sợi', 2, { op: '>=' });
chuaBiet('"2 lõi" là số lõi', 'soSoi', 'cáp 2 lõi');
chuaBiet('"mỗi sợi 0,3 mm" là đường kính', 'soSoi', 'cáp lõi mỗi sợi 0,3 mm');
chuaBiet('không có số', 'soSoi', 'sợi thủy tinh cách điện');

// tiLe — tỉ lệ (không thứ nguyên, quy về "lần")
la('chữ biểu 7616.99.30 "trên 1/10 đường kính" ⇒ 0.1 op >', 'tiLe', 'Đồng xèng, hình tròn, kích thước chiều dày trên 1/10 đường kính', 0.1, { op: '>', bc: 'trên 1/10 đường kính' });
la('"tỉ lệ … 1:8"', 'tiLe', 'tỉ lệ dày so với đường kính 1:8', 0.125);
la('"gấp 3 lần"', 'tiLe', 'chiều dài gấp 3 lần chiều rộng', 3);
la('"tỷ lệ 10%"', 'tiLe', 'tỷ lệ 10%', 0.1);
la('En "exceeding 1/10 of the diameter" ⇒ op >', 'tiLe', 'thickness exceeding 1/10 of the diameter', 0.1, { op: '>' });
la('Zh "之比为1:10"', 'tiLe', '厚度与直径之比为1:10', 0.1);
la('so sánh phủ định "không quá 1/10 đường kính" ⇒ op <=', 'tiLe', 'chiều dày không quá 1/10 đường kính', 0.1, { op: '<=' });
chuaBiet('"1/2 inch" là kích thước', 'tiLe', 'ống ren 1/2 inch');
chuaBiet('"50/60Hz" là tần số', 'tiLe', 'nguồn điện 50/60Hz');
chuaBiet('không suy tỉ lệ từ hai kích thước', 'tiLe', 'đường kính 20 mm, dày 2 mm');
chuaBiet('"3 lần" không có chữ tỉ lệ', 'tiLe', 'rửa 3 lần trước khi dùng');

// phuongPhapCheTao — LIET_KE
la('được rèn', 'phuongPhapCheTao', 'Trục truyền động được rèn bằng thép hợp kim', 'REN');
la('cán nóng', 'phuongPhapCheTao', 'thép tấm cán nóng', 'CAN_NONG');
la('cán nguội En', 'phuongPhapCheTao', 'cold-rolled steel coil', 'CAN_NGUOI');
la('đúc áp lực', 'phuongPhapCheTao', 'vỏ nhôm đúc áp lực', 'DUC');
la('chữ biểu 7616.99.80 "đột dập và kéo giãn" — cụm dài thắng', 'phuongPhapCheTao', 'Sản phẩm dạng lưới được tạo hình bằng phương pháp đột dập và kéo giãn thành lưới', 'DOT_DAP_KEO_GIAN');
la('ép phun Zh', 'phuongPhapCheTao', '注塑外壳', 'EP_PHUN');
la('thổi khuôn', 'phuongPhapCheTao', 'chai nhựa thổi khuôn', 'THOI');
la('hàn En', 'phuongPhapCheTao', 'welded steel pipe', 'HAN');
la('đột dập', 'phuongPhapCheTao', 'giá đỡ bằng thép đột dập', 'DAP');
la('kéo nguội', 'phuongPhapCheTao', 'ống thép kéo nguội', 'KEO');
chuaBiet('"gang đúc" là vật liệu', 'phuongPhapCheTao', 'Nồi bằng gang đúc');
chuaBiet('"cast iron" là vật liệu', 'phuongPhapCheTao', 'cast iron pan');
chuaBiet('"máy hàn" là tên máy', 'phuongPhapCheTao', 'máy hàn điện tử 200A');
chuaBiet('"Hàn Quốc"', 'phuongPhapCheTao', 'xuất xứ Hàn Quốc');
chuaBiet('"kéo" là cái kéo', 'phuongPhapCheTao', 'dao kéo bằng thép không gỉ');
chuaBiet('phủ định "không được rèn"', 'phuongPhapCheTao', 'trục không được rèn');
{
  const r = chuaBiet('hai phương pháp khác nhau — không đoán', 'phuongPhapCheTao', 'thân đúc, nắp dập');
  check('phuongPhapCheTao hai phương pháp ⇒ ungVien [DUC, DAP]', JSON.stringify((r.ungVien || []).slice().sort()) === JSON.stringify(['DAP', 'DUC']), r);
}

// ── 5. Viết + kiểm giá trị ───────────────────────────────────────────────────────────────────────────────────────────
const viet = (khoa, v) => { try { return T.vietCum(khoa, v); } catch (e) { return `LOI ${e.message}`; } };
check('vietCum soLoi 2 ⇒ "2 lõi" (đơn vị đếm cách số)', viet('soLoi', 2) === '2 lõi', viet('soLoi', 2));
check('vietCum soSoi 7 ⇒ "7 sợi"', viet('soSoi', 7) === '7 sợi', viet('soSoi', 7));
check('vietCum tiLe 0.1 ⇒ "tỉ lệ 0,1 lần"', viet('tiLe', 0.1) === 'tỉ lệ 0,1 lần', viet('tiLe', 0.1));
check('vietCum phuongPhapCheTao REN ⇒ "được rèn"', viet('phuongPhapCheTao', 'REN') === 'được rèn', viet('phuongPhapCheTao', 'REN'));
check('vietCum chiHoacChuYeu true/false ⇒ không chép chữ biểu "chỉ hoặc chủ yếu"', viet('chiHoacChuYeu', true) === 'chuyên dùng' && viet('chiHoacChuYeu', false) === 'loại dùng chung', [viet('chiHoacChuYeu', true), viet('chiHoacChuYeu', false)]);
check('vietCum daNapChuongTrinh true/false', viet('daNapChuongTrinh', true) === 'đã nạp chương trình' && viet('daNapChuongTrinh', false) === 'chưa nạp chương trình', [viet('daNapChuongTrinh', true), viet('daNapChuongTrinh', false)]);
check('vietCum đơn vị @1 KHÔNG đổi ("CS: 75000W" — không cách)', T.vietCum('congSuat', 75000, { tat: true }) === 'CS: 75000W', T.vietCum('congSuat', 75000, { tat: true }));
{ const kg = (v) => { try { return T.kiemGiaTri('phuongPhapCheTao', v).trangThai; } catch { return 'LOI'; } };
  check('kiemGiaTri phuongPhapCheTao: "RANG" ngoài danh sách ⇒ CHUA_BIET; ["DUC","DAP"] ⇒ DA_CO', kg('RANG') === 'CHUA_BIET' && kg(['DUC', 'DAP']) === 'DA_CO'); }
{ const ch = (l) => { try { return T.cauHoiCho('daNapChuongTrinh', l); } catch { return ''; } };
  check('cauHoiCho daNapChuongTrinh hỏi "nạp chương trình" (Vi) và "烧录" (Zh)', /nạp chương trình/.test(ch('vi')) && /烧录/.test(ch('zh')), [ch('vi'), ch('zh')]); }

// ── 6. Bảng hiệu chỉnh tiền lệ 853710 hỏi daNapChuongTrinh (CEO 30/10: "chưa chốt, hỏi lại người khai") ─────────────
{
  const HC = require('../lib/ho-so/hieu-chinh.js');
  const bang = JSON.parse(fs.readFileSync('data/ho-so/hieu-chinh-tien-le.json', 'utf8'));
  for (const id of ['853710-01', '853710-02', '853710-03']) {
    const m = bang.muc.find((x) => x.id === id);
    check(`${id}: factPhanBiet = ["daNapChuongTrinh"]`, JSON.stringify(m?.factPhanBiet) === '["daNapChuongTrinh"]', m?.factPhanBiet);
  }
  const kq = HC.kiemBang(bang);
  check('bảng hiệu chỉnh thật qua máy kiểm (factPhanBiet daNapChuongTrinh hợp lệ)', kq.hopLe && kq.loi.length === 0, kq.loi);
  const hong = clone(bang);
  hong.muc.find((x) => x.id === '853710-02').factPhanBiet = ['khoaKhongCo'];
  const kq2 = HC.kiemBang(hong);
  check('máy kiểm ĐỎ khi factPhanBiet có khoá ngoài tu-vung (hc-fact-phan-biet)', kq2.loi.some((l) => l.startsWith('hc-fact-phan-biet:853710-02')), kq2.loi);
  const hong2 = clone(bang);
  hong2.muc.find((x) => x.id === '853710-02').factPhanBiet = 'daNapChuongTrinh';
  check('máy kiểm ĐỎ khi factPhanBiet không phải mảng', HC.kiemBang(hong2).loi.some((l) => l.startsWith('hc-fact-phan-biet:853710-02')), HC.kiemBang(hong2).loi);
}

// ── 7. Gói soạn ranh giới: ý đã có khoá ⇒ gợi ý khoá, không còn "nghi thiếu khoá" ─────────────────────────────────
{
  const C = require('../lib/ho-so/cong-ranh-gioi.js');
  const muc = (pn6, ma) => C.goiSoan(pn6).canSoHoa.find((x) => x.ma === ma) || {};
  for (const [pn6, ma, khoa] of [['841459', '84145910', 'chiHoacChuYeu'], ['842010', '84201010', 'chiHoacChuYeu'], ['854442', '85444291', 'soSoi'], ['761699', '76169930', 'tiLe'], ['761699', '76169980', 'phuongPhapCheTao']]) {
    const x = muc(pn6, ma);
    check(`gói soạn ${ma}: gợi ý khoá ${khoa} (goiYKhoa), không còn nghiThieuKhoa`, !x.nghiThieuKhoa && (x.goiYKhoa || []).some((g) => g.includes(khoa)), { nghi: x.nghiThieuKhoa, goiY: x.goiYKhoa });
  }
  const g = C.goiSoan('854442');
  check('gói soạn liệt kê khoá mới trong tuVung', Object.keys(KHOA_MOI).every((k) => g.tuVung.some((x) => x.khoa === k)), g.tuVung.map((x) => x.khoa).slice(-10));
}

// ── 8. Điều kiện có kiểu dùng khoá mới qua máy kiểm dieuKienSo (cổng 0/3 của bản nháp) trên CHÍNH chữ biểu ─────────────
{
  const DK = require('../lib/dieu-kien-so.js');
  const tax = JSON.parse(fs.readFileSync('data/tax.json', 'utf8'));
  const K = (c, hs) => { try { return DK.kiemDieuKien(c, tax[hs].vn); } catch (e) { return `LOI ${e.message}`; } };
  const dat = (ten, c, hs) => check(`dieuKienSo ${ten} trên tax.${hs} ⇒ đạt`, K(c, hs) === null, K(c, hs));
  const truot = (ten, c, hs, ma) => check(`dieuKienSo ${ten} trên tax.${hs} ⇒ lỗi ${ma}`, String(K(c, hs)).startsWith(ma), K(c, hs));
  dat('chiHoacChuYeu CO', { fact: 'chiHoacChuYeu', op: 'CO' }, '84145910');
  dat('chiHoacChuYeu CO', { fact: 'chiHoacChuYeu', op: 'CO' }, '85371020');
  dat('chiHoacChuYeu CO', { fact: 'chiHoacChuYeu', op: 'CO' }, '84201010');
  dat('thietKeChoTreEm CO', { fact: 'thietKeChoTreEm', op: 'CO' }, '95030080');
  dat('soSoi >= 2 sợi ("hai sợi hoặc hơn" — số chữ đọc được)', { fact: 'soSoi', op: '>=', value: 2, donVi: 'sợi' }, '85444291');
  truot('soSoi >= 3 sợi (ngưỡng không có trong trích)', { fact: 'soSoi', op: '>=', value: 3, donVi: 'sợi' }, '85444291', 'dieu-kien-so-nguong-khong-co-trong-trich');
  truot('soSoi > 2 sợi (op lệch chữ "hoặc hơn" = >=)', { fact: 'soSoi', op: '>', value: 2, donVi: 'sợi' }, '85444291', 'dieu-kien-so-nguong-khong-co-trong-trich');
  dat('tiLe > 0.1 lần ("trên 1/10 đường kính")', { fact: 'tiLe', op: '>', value: 0.1, donVi: 'lần' }, '76169930');
  truot('tiLe <= 0.1 lần (op lệch "trên")', { fact: 'tiLe', op: '<=', value: 0.1, donVi: 'lần' }, '76169930', 'dieu-kien-so-nguong-khong-co-trong-trich');
  dat('phuongPhapCheTao TRONG [DOT_DAP_KEO_GIAN]', { fact: 'phuongPhapCheTao', op: 'TRONG', value: ['DOT_DAP_KEO_GIAN'] }, '76169980');
  // khoá @1: ngưỡng vẫn phải có nguyên văn (không nới máy kiểm cho khoá cũ)
  check('dieuKienSo khoá @1 không đổi: duongKinhLoi <= 6 mm trên "không quá 5 mm" ⇒ lỗi ngưỡng', DK.kiemDieuKien({ fact: 'duongKinhLoi', op: '<=', value: 6, donVi: 'mm' }, 'mỗi lõi có đường kính không quá 5 mm') === 'dieu-kien-so-nguong-khong-co-trong-trich:6');
}

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
