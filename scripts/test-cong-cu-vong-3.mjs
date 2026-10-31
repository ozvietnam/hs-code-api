// Cổng ranh giới 6→8 số — vòng gia cố 3 (#577: vướng người soạn báo sau #681). Mỗi mục kèm test đỏ trước.
// Chỉ đọc bản nháp ĐÔNG CỨNG (scripts/fixtures/ho-so/ranh-gioi-7559407/) — KHÔNG đọc bản nháp sống (thư mục ranh-gioi của data/ho-so);
// không đọc data/bench/, data/oz-export/.
import './test-isolate-data.mjs';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import { nhapDongCung, THU_MUC_DONG_CUNG } from './fixtures/ho-so/nhap-dong-cung.mjs';
const require = createRequire(import.meta.url);
const C = require('../lib/ho-so/cong-ranh-gioi.js');
const V = require('../lib/ho-so/tach-ve.js');
const ML = require('../lib/ho-so/ma-loi.js');
const DK = require('../lib/dieu-kien-so.js');

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${typeof x === 'string' ? x : JSON.stringify(x)}`); } };
const co = (ds, tien) => ds.some((l) => l.startsWith(tien));
const cli = (...a) => spawnSync(process.execPath, ['scripts/so-hoa-ranh-gioi.mjs', ...a], { encoding: 'utf8', env: process.env });
const LD = (v) => ({ fact: 'loaiDongDien', op: 'TRONG', value: v });
const chuNeo = (c, t) => V.neoMot(c, t).map(([a, b]) => t.slice(a, b));
const k5 = (pn6, b) => C.kiemRanhGioi(pn6, b, { cong: [5] });

// ── 1. "VDC"/"V DC" ⇒ MOT_CHIEU, "VAC"/"V AC" ⇒ XOAY_CHIEU: bộ neo cổng 5 đọc ĐỦ cách đọc của khoá (như cổng 3) ─────────
{
  // tu-vung@2 (và @1) đã có "VDC"/"DC"/"VAC"/"AC" ở cachDoc.en; cổng 3 (lib/dieu-kien-so.js#kiemDieuKien) đọc mọi ngôn ngữ,
  // còn neo cổng 5 + --tu-vung chỉ đọc cachDoc.vi ⇒ người soạn 85371040 tưởng "120VDC" không đọc được (#681).
  check('1a neo cổng 5: "120VDC" ⇒ MOT_CHIEU', chuNeo(LD(['MOT_CHIEU']), 'điện áp đầu ra từ 24V đến 120VDC').includes('VDC'), chuNeo(LD(['MOT_CHIEU']), 'điện áp đầu ra từ 24V đến 120VDC'));
  check('1b neo cổng 5: "120 V DC" ⇒ MOT_CHIEU', chuNeo(LD(['MOT_CHIEU']), 'từ 24 V đến 120 V DC').includes('DC'));
  check('1c neo cổng 5: "220VAC" / "220 V AC" ⇒ XOAY_CHIEU', chuNeo(LD(['XOAY_CHIEU']), 'nguồn 220VAC').includes('VAC') && chuNeo(LD(['XOAY_CHIEU']), 'nguồn 220 V AC').includes('AC'));
  check('1d không neo bừa: "24V" không có DC; "ADC" không phải DC; giá trị khác không neo', !V.neoMot(LD(['MOT_CHIEU']), 'điện áp 24V').length
    && !V.neoMot(LD(['MOT_CHIEU']), 'bộ chuyển đổi ADC').length && !V.neoMot(LD(['XOAY_CHIEU']), 'từ 24V đến 120VDC').length);
  check('1e cổng 3 và cổng 5 cùng đọc (cổng 3 nhận "120VDC")', DK.kiemDieuKien(LD(['MOT_CHIEU']), '85371040 - - Bộ điều khiển động cơ có điện áp đầu ra từ 24V đến 120VDC') === null);
  // 85371040 (đông cứng): thêm loaiDongDien MOT_CHIEU, bỏ ghi chú DE_TRONG ⇒ điều kiện đúng chữ, cổng 3 + 5 sạch cho dòng này.
  const b = nhapDongCung('853710');
  const m = b.dong8.find((x) => x.hs === '85371040');
  m.dieuKienSo.push(LD(['MOT_CHIEU']));
  b.ghiChuSoan = b.ghiChuSoan.filter((g) => g.ma !== '85371040');
  const t = V.tachVe(V.chuBieu('85371040').vi).chu;
  const { neo } = V.neoDieuKien(m.dieuKienSo, t);
  check('1f 85371040: điều kiện loaiDongDien neo vào "120VDC" của chữ biểu', neo.some((n) => n.fact === 'loaiDongDien' && t.slice(n.bd, n.kt) === 'VDC'), neo.filter((n) => n.fact === 'loaiDongDien'));
  const r = C.kiemRanhGioi('853710', b, { cong: [3, 5] });
  check('1g 85371040 + loaiDongDien: không lỗi cổng 3/5, hết cong5-de-trong-chua-xu-ly:85371040', !r.loi.some((l) => l.includes('85371040')) && !co(r.canhBao, 'cong5-de-trong-chua-xu-ly:85371040'), { loi: r.loi, canhBao: r.canhBao.filter((c) => c.includes('85371040')) });
  const tv = cli('--tu-vung', '--khoa=loaiDongDien');
  check('1h --tu-vung in đủ cách đọc (VDC, VAC) — không chỉ tiếng Việt', tv.status === 0 && /VDC/.test(tv.stdout) && /VAC/.test(tv.stdout), tv.stdout);
  const x = C.goiSoan('853710').canSoHoa.find((y) => y.ma === '85371040') || {};
  check('1i gói soạn gợi ý khoá loaiDongDien cho chữ "120VDC"', (x.goiYKhoa || []).some((g) => /loaiDongDien/.test(g)), x.goiYKhoa);
}

// ── 2. Cổng 5 đọc số bằng CÙNG bộ đọc của cổng 3 ("hai sợi hoặc hơn" — khoá đếm demSo) ──────────────────────────────
{
  const SS = (v) => ({ fact: 'soSoi', op: '>=', value: v, donVi: 'sợi' });
  const t = 'Cáp dữ liệu dẹt có hai sợi hoặc hơn, loại khác';
  check('2a neo cổng 5: soSoi >= 2 sợi neo vào "hai sợi hoặc hơn"', chuNeo(SS(2), t).some((s) => /hai sợi/.test(s)), chuNeo(SS(2), t));
  check('2b … cổng 3 cũng nhận chính câu đó (một nguồn sự thật)', DK.kiemDieuKien(SS(2), `85444292 - - - - ${t}`) === null);
  check('2c số khác không neo (soSoi >= 3 trên "hai sợi")', !V.neoMot(SS(3), t).length);
  check('2d chữ số vẫn neo như cũ ("2 sợi")', chuNeo(SS(2), 'Cáp có 2 sợi trở lên').length > 0);
  // 854442 (đông cứng): bỏ BO_VE người soạn ghi chỉ vì bộ neo thiếu ⇒ vế .92 vẫn phủ.
  const b = nhapDongCung('854442');
  const iBoVe = b.ghiChuSoan.findIndex((g) => g.ma === '85444292' && g.loai === 'BO_VE');
  const coBoVe = k5('854442', b);
  b.ghiChuSoan.splice(iBoVe, 1);
  const r = k5('854442', b);
  check('2e 854442 .92 không BO_VE: vế "có hai sợi hoặc hơn, loại khác" được phủ (không cong5-ve-gioi-han-bi-bo)', iBoVe >= 0 && !co(r.loi, 'cong5-ve-gioi-han-bi-bo:85444292'), r.loi);
  check('2f … BO_VE cũ thành thừa (cảnh báo cong5-bo-ve-thua, không còn cong5-bo-ve)', co(coBoVe.canhBao, 'cong5-bo-ve-thua:85444292') && !co(coBoVe.canhBao, 'cong5-bo-ve:85444292'), coBoVe.canhBao.filter((c) => c.startsWith('cong5-bo-ve')));
}

// ── 3. Chồng lấn theo TRỤC ở cấp tiêu đề — khai chongLanVanBan không làm xanh ────────────────────────────────────────────
const CHU = {
  85444213: 'Loại khác, cách điện bằng cao su, plastic hoặc giấy', 85444223: 'Loại khác, cách điện bằng cao su, plastic hoặc giấy',
  85444219: 'Loại khác', 85444229: 'Loại khác', 85444233: 'Loại khác', 85444239: 'Loại khác',
  85444232: 'Cho xe thuộc nhóm 87.02, 87.03, 87.04 hoặc 87.11', 85444234: 'Cho xe thuộc nhóm 87.02, 87.03, 87.04 hoặc 87.11',
};
const CAP_854442 = [];
for (const a of ['85444213', '85444223']) for (const b of ['85444232', '85444233', '85444234', '85444239']) CAP_854442.push([a, b]);
for (const a of ['85444219', '85444229']) for (const b of ['85444234', '85444239']) CAP_854442.push([a, b]);
const TIEU_DE = 'Chữ biểu: tieuDe.8544423 "Cáp ắc qui" (trục tên) đứng cạnh tieuDe.8544421 "Dùng cho viễn thông, điện áp không quá 80 V" và tieuDe.8544422 "Dùng cho viễn thông, điện áp trên 80 V nhưng không quá 1.000 V" (trục công dụng); không câu nào loại trừ câu kia, không có căn cứ thứ tự';
{
  check('3a fixture: đủ 12 cặp chồng lấn của 854442 (.13/.19/.23/.29 × .32/.33/.34/.39)', CAP_854442.length === 12);
  // Biến thể A: lý do chỉ trích HAI TIÊU ĐỀ (đúng kiểu người soạn đã thử ở #681 — máy cho xanh giả).
  const bA = nhapDongCung('854442');
  bA.chongLanVanBan = CAP_854442.map((cap) => ({ cap, lyDo: TIEU_DE }));
  const rA = C.kiemRanhGioi('854442', bA, { cong: [2, 3] });
  check('3b khai đủ 12 cặp (trích tiêu đề) ⇒ VẪN ĐỎ', rA.hopLe === false, rA.loi.slice(0, 5));
  // #683 (quyết định GĐ): cong2-chong-lan-truc không còn là DỪNG — người soạn khai chongLanTruc (test-chong-lan-truc.mjs).
  check('3c … cong2-chong-lan-truc:8544423 (chồng theo trục cấp tiêu đề), là lỗi nhưng không còn trong dung[] (#683)', co(rA.loi, 'cong2-chong-lan-truc:8544423:') && !co(rA.dung, 'cong2-chong-lan-truc:8544423:'), rA.loi.filter((l) => l.startsWith('cong2-chong-lan-truc')));
  check('3d … cặp đã khai trong cụm trục KHÔNG hạ thành cảnh báo (lỗi cong2-chong-lan-van-ban-truc)', CAP_854442.every(([a, b]) => co(rA.loi, `cong2-chong-lan-van-ban-truc:${a}+${b}:`)) && !co(rA.canhBao, 'cong2-chong-lan-van-ban:'), rA.loi.filter((l) => l.startsWith('cong2-chong-lan-van-ban')).length);
  check('3e … lý do chỉ trích tiêu đề tổ tiên, không trích chữ của dòng nào trong cặp ⇒ cong3-chong-lan-chi-trich-tieu-de', CAP_854442.every(([a, b]) => rA.loi.includes(`cong3-chong-lan-chi-trich-tieu-de:${a}+${b}`)), rA.loi.filter((l) => l.startsWith('cong3-chong-lan')));
  // Biến thể B: lý do trích cả chữ của hai dòng ⇒ hết lỗi trích, nhưng chồng theo trục vẫn đỏ + DỪNG.
  const bB = nhapDongCung('854442');
  bB.chongLanVanBan = CAP_854442.map(([a, b]) => ({ cap: [a, b], lyDo: `${TIEU_DE}; .${a.slice(6)} "${CHU[a]}" ↔ .${b.slice(6)} "${CHU[b]}"` }));
  const rB = C.kiemRanhGioi('854442', bB, { cong: [2, 3] });
  check('3f khai đủ 12 cặp, trích đúng chữ hai dòng ⇒ không lỗi cong3-chong-lan-*', !rB.loi.some((l) => l.startsWith('cong3-chong-lan')), rB.loi.filter((l) => l.startsWith('cong3-chong-lan')));
  check('3g … vẫn ĐỎ cong2-chong-lan-truc:8544423 (thiết kế trục, không phải chữ tự chồng — khai chongLanTruc, #683)', rB.hopLe === false && co(rB.loi, 'cong2-chong-lan-truc:8544423:'), rB.loi.filter((l) => l.startsWith('cong2-chong-lan-truc')));
}
{
  // Khai hợp lệ (dòng ↔ dòng): 841459 .10 ↔ .30 (sen.84145930 "Máy thổi khí là quạt ly tâm…") — giữ xanh.
  const r = C.kiemRanhGioi('841459', nhapDongCung('841459'));
  check('3h 841459 (khai .10↔.30, .91↔.92) vẫn XANH, cặp khai là cảnh báo, không truc', r.hopLe === true && co(r.canhBao, 'cong2-chong-lan-van-ban:84145910+84145930:') && !co(r.loi, 'cong2-chong-lan-truc'), r.loi);
  // Dòng ↔ MỘT tiêu đề (bản đã DUYET): 853620 .20 ↔ 8536201 "Loại hộp đúc" — giữ xanh.
  const r2 = C.kiemRanhGioi('853620', nhapDongCung('853620'));
  check('3i 853620 (dòng ↔ một tiêu đề, bản DUYET) vẫn XANH', r2.hopLe === true, r2.loi);
  for (const ma of ['cong2-chong-lan-van-ban-truc:85444213+85444232:x', 'cong3-chong-lan-chi-trich-tieu-de:85444213+85444232']) check(`3j giải thích ${ma.split(':')[0]}`, Boolean(ML.giaiThich(ma)?.cachSua), ma);
  check('3k giải thích cong2-chong-lan-truc nói khai chongLanVanBan không gỡ được + cấp tiêu đề', /không gỡ/.test(ML.giaiThich('cong2-chong-lan-truc:8544423:8544421,8544422')?.giaiThich || '') && /tiêu đề/.test(ML.giaiThich('cong2-chong-lan-truc:8544423:8544421,8544422')?.giaiThich || ''));
}

// ── 4. Test công cụ không đọc bản nháp SỐNG (thư mục ranh-gioi của data/ho-so) ──────────────────────────────────────────────
{
  // Ngoại lệ có chủ đích: test-cong-ranh-gioi.mjs mục 8 KIỂM DỮ LIỆU sống (mọi bản nháp qua cổng 0+3; bản DUYET xanh đủ cổng).
  const NGOAI_LE = new Set(['test-cong-ranh-gioi.mjs']);
  const vi = fs.readdirSync('scripts').filter((f) => /^test-.*\.mjs$/.test(f) && !NGOAI_LE.has(f))
    .filter((f) => /data\/ho-so\/ranh-gioi\/|['"]data\/ho-so\/ranh-gioi['"]/.test(fs.readFileSync(path.join('scripts', f), 'utf8')));
  check('4a không test nào (ngoài kiểm dữ liệu) đọc bản nháp sống của data/ho-so', vi.length === 0, vi);
  const tep = fs.readdirSync(THU_MUC_DONG_CUNG).filter((f) => f.endsWith('.json'));
  check('4b bản đông cứng: tên tệp = pn6 của bản nháp', tep.length >= 10 && tep.every((f) => nhapDongCung(f.slice(0, 6)).pn6 === f.slice(0, 6)), tep);
  // CLI đọc bản đã gieo vào HS_DATA_DIR (ưu tiên hơn bản sống).
  const b = nhapDongCung('900490'); b.ghiChuSoan = [...(b.ghiChuSoan || []), { ma: '90049010', loai: 'QUYET_DINH', ghiChu: 'GIEO-THU-vong3' }];
  const { gieoNhap } = await import('./fixtures/ho-so/nhap-dong-cung.mjs');
  gieoNhap('900490', b);
  const k = cli('--kiem', '--pn6=900490', '--json');
  check('4c CLI --kiem đọc bản đã gieo (HS_DATA_DIR), không đọc bản sống', /"pn6": "900490"/.test(k.stdout) && fs.readFileSync(path.join(process.env.HS_DATA_DIR, 'ho-so', 'ranh-gioi', '900490.json'), 'utf8').includes('GIEO-THU-vong3'), k.stderr);
}

console.log(`\n${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
