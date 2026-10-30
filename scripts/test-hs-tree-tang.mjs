#!/usr/bin/env node
/**
 * TẦNG KHÔNG MÃ trong cây HS (lib/hs-tree.js): tiêu đề không mã của biểu thuế ("- - - Loại khác:", "Bộ phận và phụ kiện:")
 * mà cây theo chữ số làm mất được dựng lại thành NÚT ẢO `<pn6>~r<dòng biểu>` — chỉ trong LỚP TẦNG (tangCua / chaTang /
 * conTang / nodeOf / renderTang). Cây theo chữ số (tree().nodes, parent/children, loaiKhacOf, stats) KHÔNG đổi — runtime giữ
 * nguyên. Chỉ đọc data/, không đọc data/bench, data/oz-export.
 */
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const T = require('../lib/hs-tree.js');

let pass = 0; let fail = 0;
const check = (name, cond, extra = '') => { if (cond) { pass += 1; console.log(`PASS ${name}`); } else { fail += 1; console.log(`FAIL ${name} ${typeof extra === 'string' ? extra : JSON.stringify(extra)}`); } };

// ── 0. Cây theo chữ số không đổi (runtime) ─────────────────────────────────────────────────────────────────────
const statsTruoc = JSON.stringify(T.stats());
const lkTruoc = JSON.stringify(T.loaiKhacOf('84145949'));

// ── 1. Hình dạng nút tầng ─────────────────────────────────────────────────────────────────────────────────────
{
  check('1a chuanMa giữ id tầng, bỏ ký tự lạ của mã số', T.chuanMa(' 841459~r13180 ') === '841459~r13180' && T.chuanMa('8414.59.41') === '84145941' && T.chuanMa('8414594') === '8414594');
  check('1b laIdTang', T.laIdTang('841459~r13180') && !T.laIdTang('8414594') && !T.laIdTang('841459~13180'));
  const v = T.tangCua('841459');
  check('1c tangCua(841459) có hai nút tầng r13180, r13187', v && v.tang.map((n) => n.id).join() === '841459~r13180,841459~r13187', v && v.tang.map((n) => n.id));
  const n = T.nodeOf('841459~r13180');
  check('1d nodeOf(id tầng) trả nút tầng: cap TANG_KHONG_MA, tên nguyên văn (bỏ gạch, bỏ ":"), gach, r, nguồn biểu thuế',
    n && n.cap === 'TANG_KHONG_MA' && n.tenVi === 'Công suất không quá 125 kW' && n.gach === 3 && n.r === 13180 && n.pn6 === '841459'
      && n.suyRa === true && n.khongMa === true && /^bieu-thue@\d{4}\.\d{2}\.\d{2}$/.test(n.tenNguon || ''), n);
  check('1e nút tầng có con theo chữ số: .10, .20, .30, 8414594 (đúng thứ tự)', T.conTang('841459~r13180').join() === '84145910,84145920,84145930,8414594', T.conTang('841459~r13180'));
  check('1f con của 841459 (lớp tầng) = hai nút tầng', T.conTang('841459').join() === '841459~r13180,841459~r13187', T.conTang('841459'));
  check('1g chaTang: 8414594 → 841459~r13180 → 841459; 84145950 → 841459~r13187', T.chaTang('8414594') === '841459~r13180' && T.chaTang('841459~r13180') === '841459' && T.chaTang('84145950') === '841459~r13187', [T.chaTang('8414594'), T.chaTang('841459~r13180'), T.chaTang('84145950')]);
  check('1h chaTang/conTang ngoài tầng = cây theo chữ số', T.chaTang('84145941') === '8414594' && T.conTang('8414594').join() === '84145941,84145949' && T.chaTang('841459') === T.nodeOf('841459').parent);
  check('1i nút tầng mang parent/children của lớp tầng', n.parent === '841459' && n.children.join() === '84145910,84145920,84145930,8414594');
  check('1j id tầng lạ → null', T.nodeOf('841459~r1') === null && T.nodeOf('999999~r5') === null && T.chaTang('841459~r1') === null);
}

// ── 2. Tầng là TẬP CON anh em dưới một tiêu đề theo chữ số ─────────────────────────────────────────────────────
{
  check('2a 848310: tầng r14616 "Loại khác" nằm dưới 8483102, con .25/.26/.27; .24 ở ngoài',
    T.chaTang('848310~r14616') === '8483102' && T.conTang('848310~r14616').join() === '84831025,84831026,84831027'
      && T.conTang('8483102').join() === '84831024,848310~r14616' && T.chaTang('84831024') === '8483102' && T.nodeOf('848310~r14616').tenVi === 'Loại khác', T.conTang('8483102'));
  check('2b 854442: 8544423 "Cáp ắc qui" chia hết bởi hai tầng r16065 / r16068',
    T.conTang('8544423').join() === '854442~r16065,854442~r16068' && T.conTang('854442~r16065').join() === '85444232,85444233'
      && T.nodeOf('854442~r16065').tenVi === 'Cách điện bằng cao su hoặc plastic', T.conTang('8544423'));
  check('2c 950300: r18723 "Bộ phận và phụ kiện" dưới 9503002, con .22/.29; .21 ở ngoài',
    T.conTang('9503002').join() === '95030021,950300~r18723' && T.conTang('950300~r18723').join() === '95030022,95030029', T.conTang('9503002'));
  check('2d 853690: r15857 "Dòng điện dưới 16 A" dưới 8536909, .99 ở ngoài', T.conTang('8536909').join() === '853690~r15857,85369099', T.conTang('8536909'));
  check('2e 850110: hai tầng ngay dưới phân nhóm', T.conTang('850110').join() === '850110~r14830,850110~r14839' && T.conTang('850110~r14830').join() === '8501102,85011030,8501104', T.conTang('850110'));
  check('2f 840991: r12982 gom 8409915 + 8409916', T.conTang('840991~r12982').join() === '8409915,8409916' && T.chaTang('8409915') === '840991~r12982');
  check('2g 852351: r15544 "Loại khác" gom 8523512, .30, 8523519; 8523511 ở ngoài', T.conTang('852351').join() === '8523511,852351~r15544' && T.conTang('852351~r15544').join() === '8523512,85235130,8523519', T.conTang('852351'));
}

// ── 3. Tầng lồng nhau, trùng tập, không đặt được ─────────────────────────────────────────────────────────────
{
  check('3a 848180: tầng lồng — r14552 nằm trong r14551 (con .61/.62), r14551 dưới 8481806',
    T.chaTang('848180~r14552') === '848180~r14551' && T.conTang('848180~r14552').join() === '84818061,84818062' && T.chaTang('848180~r14551') === '8481806', [T.chaTang('848180~r14552'), T.chaTang('848180~r14551')]);
  check('3b 848180: r14562 "Loại khác" gom 8481807, 8481808, 8481809 (con trực tiếp phân nhóm); r14563 "Van bi" trong 8481807',
    T.conTang('848180~r14562').join() === '8481807,8481808,8481809' && T.chaTang('848180~r14563') === '8481807', T.conTang('848180~r14562'));
  const v9503 = T.tangCua('950300');
  check('3c 950300: r18732 "Loại khác:" trùng đúng tập lá của 9503009 (đã có tên) → TRUNG, không dựng nút',
    v9503.trung.some((x) => x.r === 18732 && x.nut === '9503009') && T.nodeOf('950300~r18732') === null && T.chaTang('95030091') === '9503009', v9503.trung);
  const v8703 = T.tangCua('870340');
  check('3d 870340: r16670 "Ô tô kiểu Sedan" cắt ngang 8703401/8703402 → KHONG_DAT (giữ chặn), r16661 "Dạng CKD" vẫn dựng được',
    v8703.khongDat.some((x) => x.r === 16670 && x.lyDo) && T.nodeOf('870340~r16670') === null && T.nodeOf('870340~r16661')?.cap === 'TANG_KHONG_MA', v8703.khongDat.map((x) => `${x.r}:${x.lyDo}`));
  const v1350 = T.tangCua('841350');
  check('3e phân nhóm không có tầng không mã → rỗng; lớp tầng = cây theo chữ số', v1350.tang.length === 0 && v1350.khongDat.length === 0 && T.conTang('841350').join() === T.nodeOf('841350').children.join());
  check('3f danh sách gốc (tangKhongMa) mang trạng thái từng dòng: CO_NUT / TRUNG / KHONG_DAT',
    T.tangCua('950300').ds.map((x) => `${x.r}:${x.trangThai}`).join() === '18723:CO_NUT,18732:TRUNG' && T.tangCua('950300').ds[0].id === '950300~r18723', T.tangCua('950300').ds);
}

// ── 4. In cây có tầng ───────────────────────────────────────────────────────────────────────────────────────
{
  const s = T.renderTang('848310');
  check('4a renderTang in nút tầng với id + "tầng không mã", lá lồng dưới nó', /\[848310~r14616\] Loại khác/.test(s) && /tầng không mã/.test(s) && /\n {6}84831025 /.test(s), s);
  check('4b render (cây theo chữ số) không đổi — không có id tầng', !/~r/.test(T.render('848310')));
}

// ── 5. Runtime không đổi ───────────────────────────────────────────────────────────────────────────────────────
{
  check('5a tree().nodes không chứa nút tầng', ![...T.tree().nodes.keys()].some((k) => k.includes('~')));
  check('5b parent/children theo chữ số không đổi (8414594 cha 841459; 841459 con theo chữ số)', T.nodeOf('8414594').parent === '841459' && T.nodeOf('841459').children.includes('8414594') && T.nodeOf('84831025').parent === '8483102');
  check('5c stats() không đổi sau khi dựng lớp tầng', JSON.stringify(T.stats()) === statsTruoc);
  check('5d loaiKhacOf không đổi', JSON.stringify(T.loaiKhacOf('84145949')) === lkTruoc);
  T.reset();
  check('5e reset() xoá cả lớp tầng, dựng lại được', T.conTang('841459').join() === '841459~r13180,841459~r13187');
}

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
