#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * Job L1-5f (#648): bench offline đường hồ sơ trên bộ đề công khai #543 (scripts/do-ho-so-bench.mjs).
 * Kiểm hàm chấm thuần + chạy thật 1 ca thuộc lát 1 (BD-96-03) KHÔNG MẠNG: fetch/LLM bị chặn, không ghi tệp nào.
 */
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0; let fail = 0;
const check = (n, c, d) => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n}${d !== undefined ? ` — ${JSON.stringify(d).slice(0, 400)}` : ''}`); } };

let B = null;
try { B = await import('./do-ho-so-bench.mjs'); } catch (e) { check('scripts/do-ho-so-bench.mjs nạp được (không tự chạy khi import)', false, String(e.message)); }
if (B) {
  let tuChoi = false;
  try { B.kiemTepBoDe(path.join(ROOT, 'data', 'bench', 'ho-so-lat-1.json')); } catch { tuChoi = true; }
  check('từ chối bộ đề lát 1 khoá băm', tuChoi);
  check('nhận bộ đề công khai #543', B.kiemTepBoDe('data/bench/mo-ta-bo-de.json') === 'data/bench/mo-ta-bo-de.json');
  check('số "trước" ghi đúng kế hoạch: 50 / 43 / 16 / 18 %', B.SO_TRUOC.lat1.duKien === 0.5 && B.SO_TRUOC.lat1.chuCam === 0.43 && B.SO_TRUOC.lat1.doiAnhEm === 0.16 && B.SO_TRUOC.lat1.boDuKien === 0.18);

  const dk = { tuKhoa: ['chưa có ruột'] };
  check('boDuKienKhoiMoTa: bỏ đoạn chứa dữ kiện', B.boDuKienKhoiMoTa('Vỏ phích, chưa có ruột, mới 100%', dk) === 'Vỏ phích, mới 100%');
  check('boDuKienKhoiMoTa: câu không có dữ kiện ⇒ null', B.boDuKienKhoiMoTa('Vỏ phích, mới 100%', dk) === null);
  check('chuoiCham: bản nháp ⇒ đạt rỗng, cuối = moTaBanNhap', JSON.stringify(B.chuoiCham({ banNhap: true, moTaBanNhap: 'X, [cần: Y]' })) === JSON.stringify({ dat: '', cuoi: 'X, [cần: Y]' }));
  check('chuoiCham: bản đạt ⇒ moTaEcus ∪ khaiTiepHys', B.chuoiCham({ banNhap: false, moTaEcus: 'A', khaiTiepHys: 'B' }).dat === 'A, B');
  check('chamDuKien: bỏ dữ kiện khongDuCanCu', JSON.stringify(B.chamDuKien({ duKienQuyetDinh: [{ cap: 4, tuKhoa: ['phích'] }, { cap: 8, tuKhoa: ['zzz'], khongDuCanCu: true }] }, 'vỏ phích')) === JSON.stringify([{ cap: 4, co: true }]));
  check('coDuKienMoiThieu: fact chưa biết mới ⇒ true', B.coDuKienMoiThieu({ duKien: [{ fact: 'a', trangThai: 'CHUA_BIET' }] }, { duKien: [{ fact: 'a', trangThai: 'CHUA_BIET' }, { fact: 'b', trangThai: 'CHUA_BIET' }] }) === true);
  check('coDuKienMoiThieu: không có gì mới ⇒ false', B.coDuKienMoiThieu({ duKien: [{ fact: 'a', trangThai: 'CHUA_BIET' }] }, { duKien: [{ fact: 'a', trangThai: 'CHUA_BIET' }] }) === false);

  // chạy thật trên ca cuối (BD-96-03, mã lát 1 có ranh giới duyệt) — giới hạn n bằng cách lọc qua --n không được: dùng tệp đầy đủ, n = 38 tốn thời gian ⇒ n nhỏ + ca 96
  const kq = await B.chayBench({ n: 38 }).catch((e) => ({ loi: String(e.message) }));
  check('chayBench chạy xong không lỗi', !kq.loi, kq.loi);
  if (!kq.loi) {
    check('không gọi mạng (fetch 0 lần)', kq.mang.lanGoiFetch === 0, kq.mang);
    check('đủ ba lát áp dụng / lát 1 / tất cả', ['apDung', 'lat1', 'tatCa'].every((k) => kq.tong[k] && Number.isInteger(kq.tong[k].soCa)) && kq.tong.tatCa.soCa === 38, Object.keys(kq.tong));
    check('có ít nhất một ca áp dụng (BD-96-03)', kq.tong.apDung.soCa >= 1, kq.tong.apDung);
    check('không ca nào lỗi động cơ', kq.tong.tatCa.loi === 0, kq.theoCa.filter((r) => !r.trangThai));
    check('đường mới: "xuất xứ" 0 % trên mọi ca', kq.tong.tatCa.xuatXu.so === 0);
    check('đường mới: trích dẫn sai = 0', kq.tong.tatCa.trichSai.sai === 0, kq.tong.tatCa.trichSai);
    const bd9603 = kq.theoCa.find((r) => r.id === 'BD-96-03');
    check('#675 BD-96-03 đổi sang dòng anh em ⇒ MAU_THUAN (luật đọc "Vỏ ngoài rời của", không cần LLM)', bd9603 && bd9603.doiAnhEm === 'MAU_THUAN', bd9603);
    // L1-4c đợt 3 (850110, 854442 duyệt) nới tập áp dụng: BD-85-08 đổi sang 85011091 "dùng cho hàng hóa thuộc nhóm 84.15…".
    // #697 fix/soma-ten-ma: bộ so tên↔mã (lib/ten-sang-ma.js) + đọc "dùng cho" sau danh sách "không phải …" ⇒ BẮT được (MAU_THUAN).
    // maTroToi còn null CÓ LÝ DO: đường của .91 phủ định 8501105/85011060 theo kieuDongCoDien, mà bộ đọc LIET_KE chưa đọc danh sách
    // phủ định "không phải động cơ bước, không phải động cơ hướng trục" ⇒ .91 chưa thoả TRỌN đường đi ⇒ không trỏ mã (an toàn).
    // Luật: không ca nào trượt; ca bắt hoặc trỏ ĐÚNG mã anh em, hoặc (chỉ ca trong danh sách) không trỏ mã nào — không bao giờ sai mã.
    const BIET_KHONG_TRO = new Set(['BD-85-08']);
    const daeAD = kq.theoCa.filter((r) => r.lat === 'apDung' && r.doiAnhEm);
    const truot = daeAD.filter((r) => r.doiAnhEm !== 'MAU_THUAN').map((r) => r.id);
    const khongTroLa = daeAD.filter((r) => r.doiAnhEm === 'MAU_THUAN' && !r.doiAnhEmMa && !BIET_KHONG_TRO.has(r.id)).map((r) => r.id);
    const saiMa = kq.tong.apDung.doiAnhEm.bat - kq.tong.apDung.doiAnhEm.chiDungMa - daeAD.filter((r) => r.doiAnhEm === 'MAU_THUAN' && !r.doiAnhEmMa).length;
    check('#675/#697 áp dụng: bắt MỌI ca đổi anh em (2/2), không ca nào trỏ SAI mã; không trỏ mã chỉ ở ca biết lý do', kq.tong.apDung.doiAnhEm.bat === kq.tong.apDung.doiAnhEm.n && kq.tong.apDung.doiAnhEm.n >= 2 && !truot.length && !khongTroLa.length && saiMa === 0, { tong: kq.tong.apDung.doiAnhEm, truot, khongTroLa, saiMa });
    const bd8501 = kq.theoCa.find((r) => r.id === 'BD-85-01');
    check('#697 BD-85-01 (85444299, cáp sạc điện thoại — CEO chốt theo TB-TCHQ .99): ca chuẩn KHÔNG còn MAU_THUAN', bd8501 && bd8501.chuanTrangThai && bd8501.chuanTrangThai !== 'MAU_THUAN', bd8501);
    check('kết quả chỉ có số + mã/id công khai (không câu mô tả)', !JSON.stringify(kq).includes('moTaMau') && !/Bình giữ nhiệt|Cáp sạc/.test(JSON.stringify(kq)));
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
