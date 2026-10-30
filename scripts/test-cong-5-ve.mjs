// Cổng 5 (cong5-ve) — phạm vi của VẾ bổ nghĩa trong chữ biểu thuế (#577, soát L1-4c đợt 2 #659: 8,8% sai theo mục, gần
// hết là một kiểu máy không thấy được: bỏ vế mở ⇒ hẹp hơn chữ; bỏ vế giới hạn / tách định ngữ chung ⇒ rộng hơn chữ).
// Chạy trên bản nháp THẬT đã commit (data/ho-so/ranh-gioi/) + biến thể sửa tay; không đọc data/bench/, data/oz-export/.
import './test-isolate-data.mjs';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const C = require('../lib/ho-so/cong-ranh-gioi.js');
const V = require('../lib/ho-so/tach-ve.js');
const ML = require('../lib/ho-so/ma-loi.js');

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${typeof x === 'string' ? x : JSON.stringify(x)}`); } };
const clone = (x) => JSON.parse(JSON.stringify(x));
const nhap = (pn6) => JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/ho-so/ranh-gioi', `${pn6}.json`), 'utf8'));
// Chỉ cổng 0 + 5: cổng 5 không cần vector (nhanh); cổng 1–3 đã có test riêng.
const k5 = (pn6, b) => C.kiemRanhGioi(pn6, b, { cong: [5] });
const co = (ds, tien) => ds.some((l) => l.startsWith(tien));
const loi5 = (r) => r.loi.filter((l) => l.startsWith('cong5-'));
const menhDe = (kq, loai) => kq.ve.flatMap((v) => v.menhDe).filter((m) => m.loai === loai).map((m) => m.chu);

// ── 1. Tách vế (thuần chữ, tất định) ─────────────────────────────────────────────────────────────────────────────
{
  const a = V.tachVe('- - Dây buộc dùng cho giày, ủng, áo nịt ngực (corset) và các loại tương tự(SEN)');
  check('1a vế mở "và các loại tương tự"', menhDe(a, 'MO').includes('và các loại tương tự'), menhDe(a, 'MO'));
  check('1b vế giới hạn "dùng cho giày, ủng, áo nịt ngực (corset)" (ngoặc nằm trong, (SEN) bị bỏ)', menhDe(a, 'GIOI_HAN').some((x) => x.startsWith('dùng cho giày, ủng, áo nịt ngực')), menhDe(a, 'GIOI_HAN'));
  check('1c ngoặc chú thích "(corset)" là PHU (không đòi phủ)', menhDe(a, 'PHU').includes('(corset)'), menhDe(a, 'PHU'));
  check('1d đầu ngữ "Dây buộc"', menhDe(a, 'DAU')[0] === 'Dây buộc', menhDe(a, 'DAU'));

  const b = V.tachVe('- - - Đèn tín hiệu không nhấp nháy dùng cho sân bay; đèn dùng cho phương tiện giao thông đường sắt, đầu máy, tàu thủy, phương tiện bay, hoặc hải đăng, bằng kim loại cơ bản');
  check('1e ";" tách hai vế', b.ve.length === 2, b.ve.length);
  check('1f vế A có giới hạn "không nhấp nháy"', b.ve[0].menhDe.some((m) => m.loai === 'GIOI_HAN' && m.chu === 'không nhấp nháy'), b.ve[0].menhDe);
  check('1g vế B: danh sách sau "dùng cho" không bị cắt ở dấu phẩy; "bằng kim loại cơ bản" là giới hạn riêng',
    b.ve[1].menhDe.filter((m) => m.loai === 'GIOI_HAN').map((m) => m.chu.replace(/,\s*$/, '')).join(' | ') === 'dùng cho phương tiện giao thông đường sắt, đầu máy, tàu thủy, phương tiện bay, hoặc hải đăng | bằng kim loại cơ bản',
    b.ve[1].menhDe);

  const c = V.tachVe('- - - - Chế hòa khí và bộ phận của chúng');
  check('1h vế mở "và bộ phận của chúng"', menhDe(c, 'MO').includes('và bộ phận của chúng'), menhDe(c, 'MO'));

  const d = V.tachVe('Đầu nối cáp gồm một phích cắm kiểu giắc, đầu cuối có hoặc không có chân cắm, đầu nối, hoặc bộ thích ứng (adaptor) sử dụng cho cáp đồng trục:');
  check('1i "có hoặc không có" không phải vế giới hạn', !menhDe(d, 'GIOI_HAN').some((x) => /không có/.test(x)), menhDe(d, 'GIOI_HAN'));
  check('1j "sử dụng cho cáp đồng trục" là giới hạn', menhDe(d, 'GIOI_HAN').includes('sử dụng cho cáp đồng trục'), menhDe(d, 'GIOI_HAN'));

  const e = V.tachVe('- - - - Loại khác, loại sử dụng để tái tạo các tập lệnh, dữ liệu, âm thanh và hình ảnh, được ghi ở dạng mã nhị phân để máy có thể đọc được, và có thể thao tác hoặc có thể tương tác với người sử dụng, thông qua một máy xử lý dữ liệu tự động; phương tiện lưu trữ được định dạng riêng (đã ghi)');
  check('1k "Loại khác," đầu dòng là CON_LAI', menhDe(e, 'CON_LAI').length === 1, menhDe(e, 'CON_LAI'));
  check('1l có giới hạn chứa "có thể thao tác"', menhDe(e, 'GIOI_HAN').some((x) => x.includes('có thể thao tác')), menhDe(e, 'GIOI_HAN'));

  const f = V.tachVe('Dùng cho vòi, van các loại (trừ van dùng cho săm và lốp không săm) và các thiết bị tương tự có đường kính trong từ 25 mm trở xuống:');
  check('1m ngoặc "(trừ …)" là giới hạn', menhDe(f, 'GIOI_HAN').some((x) => x.startsWith('(trừ van dùng cho săm')), menhDe(f, 'GIOI_HAN'));
  check('1n vế mở "và các thiết bị tương tự"', menhDe(f, 'MO').includes('và các thiết bị tương tự'), menhDe(f, 'MO'));
  check('1o biên số "có đường kính trong từ 25 mm trở xuống" là giới hạn riêng', menhDe(f, 'GIOI_HAN').includes('có đường kính trong từ 25 mm trở xuống'), menhDe(f, 'GIOI_HAN'));

  const g = V.tachVe('- - - Trục cam và trục khuỷu dùng cho động cơ xe của Chương 87');
  check('1p "của" trong vế công dụng không cắt vế', menhDe(g, 'GIOI_HAN').includes('dùng cho động cơ xe của Chương 87'), menhDe(g, 'GIOI_HAN'));
  check('1q đầu ngữ liên hợp "Trục cam" + "trục khuỷu"', JSON.stringify(g.ve[0].lienHop.map((x) => x.chu)) === '["Trục cam","trục khuỷu"]', g.ve[0].lienHop);

  const h = V.tachVe('- - - Loại chưa ghi');
  check('1r "Loại <thuộc tính>" ⇒ thuộc tính là giới hạn', menhDe(h, 'GIOI_HAN').includes('chưa ghi'), h.ve[0].menhDe);

  check('1s tách vế tất định', JSON.stringify(V.tachVe('Quạt và màn che kéo bằng tay')) === JSON.stringify(V.tachVe('Quạt và màn che kéo bằng tay')));
}

// ── 2. Chữ biểu của mục: VI + EN cùng dòng (dòng 8 số, tiêu đề có tên, tầng không mã) ──────────────────────────────
{
  const a = V.chuBieu('63079070');
  check('2a dòng 8 số: VI + EN', /Quạt và màn che kéo bằng tay/.test(a.vi) && /Fans and handscreens/.test(a.en), a);
  const b = V.chuBieu('8536901');
  check('2b tiêu đề có tên: VI + EN', /cho dây dẫn và cáp/.test(b.vi) && /for wires and cables/.test(b.en), b);
  const c = V.chuBieu('840991~r12982');
  check('2c tầng không mã: VI + EN', /tàu thuyền thuộc Chương 89/.test(c.vi) && /vessels of Chapter 89/.test(c.en), c);
}

// ── 3. Sáu bản bị trả về ở #659 — PHẢI đỏ đúng mã ───────────────────────────────────────────────────────────────────
{
  const r = k5('630790', nhap('630790'));
  check('3a 630790: .80 bỏ vế mở "và các loại tương tự" ⇒ cong5-ve-mo-bi-bo', co(r.loi, 'cong5-ve-mo-bi-bo:63079080:'), loi5(r));
  check('3b 630790: .70 "kéo bằng tay" gắn cho cả quạt (chữ Anh "Fans and handscreens") ⇒ cong5-dinh-ngu-tach', co(r.loi, 'cong5-dinh-ngu-tach:63079070'), loi5(r));
  check('3c 630790: ghi chú DE_TRONG ⇒ cảnh báo cong5-de-trong-chua-xu-ly', co(r.canhBao, 'cong5-de-trong-chua-xu-ly:63079080'), r.canhBao);
}
{
  const r = k5('840991', nhap('840991'));
  for (const hs of ['84099111', '84099121', '84099131', '84099141', '84099171']) check(`3d 840991: ${hs} bỏ "và bộ phận của chúng" ⇒ cong5-ve-mo-bi-bo`, co(r.loi, `cong5-ve-mo-bi-bo:${hs}:`), loi5(r));
}
{
  const r = k5('848190', nhap('848190'));
  check('3e 848190: 8481902 bỏ "và các thiết bị tương tự" ⇒ cong5-ve-mo-bi-bo', co(r.loi, 'cong5-ve-mo-bi-bo:8481902:'), loi5(r));
}
{
  const r = k5('852351', nhap('852351'));
  check('3f 852351: .30 bỏ "có thể thao tác hoặc … tương tác …" ⇒ cong5-ve-gioi-han-bi-bo', r.loi.some((l) => l.startsWith('cong5-ve-gioi-han-bi-bo:85235130:') && l.includes('có thể thao tác')), loi5(r));
}
{
  const r = k5('853690', nhap('853690'));
  check('3g 853690: 8536901 "Đầu nối" tách khỏi "cho dây dẫn và cáp" ⇒ cong5-dinh-ngu-tach', co(r.loi, 'cong5-dinh-ngu-tach:8536901'), loi5(r));
  check('3h 853690: .93 "Phiến đầu nối" mất "cáp điện thoại" (chữ Anh "Telephone patch panels") ⇒ cong5-dinh-ngu-tach', co(r.loi, 'cong5-dinh-ngu-tach:85369093'), loi5(r));
}
{
  const r = k5('940542', nhap('940542'));
  check('3i 940542: .30 bỏ "không nhấp nháy" ⇒ cong5-ve-gioi-han-bi-bo', co(r.loi, 'cong5-ve-gioi-han-bi-bo:94054230:không nhấp nháy'), loi5(r));
}

// ── 4. Sửa đúng ⇒ hết lỗi; miễn vế BO_VE có lý do ⇒ hết lỗi; lý do rỗng / "người soát xem" / DE_TRONG ⇒ đỏ ─────────
{
  // 840991: cách diễn đạt đúng người soát chỉ ra — HOAC[ [tenLoai], [laBoPhan CO + dungCho] ].
  const b = nhap('840991');
  const m = b.dong8.find((x) => x.hs === '84099111');
  m.dieuKienSo = [{ op: 'HOAC', phuongAn: [[{ fact: 'tenLoai', op: 'TEN_LOAI', value: 'Chế hòa khí' }], [{ fact: 'laBoPhan', op: 'CO' }, { fact: 'dungCho', op: 'CONG_DUNG', value: 'Chế hòa khí' }]] }];
  const r = k5('840991', b);
  check('4a 840991: HOAC laBoPhan + dungCho phủ vế mở ⇒ .11 hết cong5-ve-mo-bi-bo', !co(r.loi, 'cong5-ve-mo-bi-bo:84099111:') && co(r.loi, 'cong5-ve-mo-bi-bo:84099121:'), loi5(r));
}
{
  const ve = 'dùng cho giày, ủng, áo nịt ngực (corset) và các loại tương tự';
  const b = nhap('630790');
  b.dong8.find((x) => x.hs === '63079080').dieuKienSo = [{ fact: 'tenLoai', op: 'TEN_LOAI', value: 'Dây buộc' }];
  const r0 = k5('630790', b);
  check('4b 630790: bỏ hẳn danh sách đóng ⇒ hết vế mở bị bỏ, nhưng vế giới hạn "dùng cho …" chưa phủ ⇒ cong5-ve-gioi-han-bi-bo', !co(r0.loi, 'cong5-ve-mo-bi-bo:63079080:') && co(r0.loi, 'cong5-ve-gioi-han-bi-bo:63079080:'), loi5(r0));
  b.ghiChuSoan.push({ ma: '63079080', loai: 'BO_VE', ve, lyDo: 'Vế mở "và các loại tương tự" không liệt kê được bằng danh sách đóng; theo quy ước 392690 không ghi danh sách đóng làm điều kiện — người khai mô tả công dụng, cán bộ đối chiếu.' });
  const r1 = k5('630790', b);
  check('4c 630790: miễn vế BO_VE có lý do ⇒ .80 hết lỗi cổng 5', !loi5(r1).some((l) => l.includes(':63079080')), loi5(r1));
  check('4d 630790: miễn vế hiện ra trong cảnh báo (người soát thấy)', co(r1.canhBao, 'cong5-bo-ve:63079080:'), r1.canhBao);
  for (const lyDo of ['', '  ', 'người soát xem', 'DE_TRONG', 'Người soát xem.']) {
    const x = clone(b); x.ghiChuSoan[x.ghiChuSoan.length - 1].lyDo = lyDo;
    const r = k5('630790', x);
    check(`4e lý do miễn vế "${lyDo}" ⇒ cong5-bo-ve-ly-do (không tính là đã xử lý)`, co(r.loi, 'cong5-bo-ve-ly-do:63079080') && co(r.loi, 'cong5-ve-gioi-han-bi-bo:63079080:'), loi5(r));
  }
  const y = clone(b); y.ghiChuSoan[y.ghiChuSoan.length - 1].ve = 'dùng cho giày và dép các loại';
  const ry = k5('630790', y);
  check('4f vế miễn không có nguyên văn trong chữ biểu ⇒ cong5-bo-ve-khong-co-trong-chu', co(ry.loi, 'cong5-bo-ve-khong-co-trong-chu:63079080'), loi5(ry));
}
{
  // 940542: "không nhấp nháy" chưa có khoá tu-vung@1 — miễn vế BO_VE có lý do thì cổng 5 qua (người soát quyết).
  const b = nhap('940542');
  b.ghiChuSoan.push({ ma: '94054230', loai: 'BO_VE', ve: 'không nhấp nháy', lyDo: 'tu-vung@1 chưa có khoá nhấp nháy (đề xuất khoaDeXuat nhapNhay); tạm bỏ vế, runtime phải hỏi thêm khi mô tả là đèn tín hiệu sân bay.' });
  const r = k5('940542', b);
  check('4g 940542: miễn "không nhấp nháy" ⇒ .30 hết cong5-ve-gioi-han-bi-bo', !co(r.loi, 'cong5-ve-gioi-han-bi-bo:94054230:'), loi5(r));
}
{
  // 853690 .93: định ngữ chung "cáp điện thoại" bằng một điều kiện riêng ⇒ hết tách định ngữ.
  const b = nhap('853690');
  b.dong8.find((x) => x.hs === '85369093').dieuKienSo = [{ fact: 'tenLoai', op: 'TEN_LOAI', value: ['Phiến đầu nối', 'khối đấu nối'] }, { fact: 'dungCho', op: 'CONG_DUNG', value: 'cáp điện thoại' }];
  const r = k5('853690', b);
  check('4h 853690: .93 định ngữ chung thành điều kiện riêng ⇒ hết cong5-dinh-ngu-tach:85369093', !co(r.loi, 'cong5-dinh-ngu-tach:85369093'), loi5(r));
}
{
  // 630790 .70: "kéo bằng tay" chỉ đi với màn che ⇒ HOAC[[Quạt], [màn che + BANG_TAY]] hết tách định ngữ.
  const b = nhap('630790');
  b.dong8.find((x) => x.hs === '63079070').dieuKienSo = [{ op: 'HOAC', phuongAn: [[{ fact: 'tenLoai', op: 'TEN_LOAI', value: 'Quạt' }], [{ fact: 'tenLoai', op: 'TEN_LOAI', value: 'màn che' }, { fact: 'cachDieuKhien', op: 'TRONG', value: ['BANG_TAY'] }]] }];
  const r = k5('630790', b);
  check('4i 630790: định ngữ chỉ gắn cho màn che (HOAC) ⇒ hết cong5-dinh-ngu-tach:63079070', !co(r.loi, 'cong5-dinh-ngu-tach:63079070'), loi5(r));
}

// ── 5. DE_TRONG không phải đã xử lý: --duyet từ chối tới khi người soát ghi kết luận ─────────────────────────────────
{
  const b = nhap('630790');
  b.dong8.find((x) => x.hs === '63079080').dieuKienSo = [{ fact: 'tenLoai', op: 'TEN_LOAI', value: 'Dây buộc' }];
  b.dong8.find((x) => x.hs === '63079070').dieuKienSo = [{ op: 'HOAC', phuongAn: [[{ fact: 'tenLoai', op: 'TEN_LOAI', value: 'Quạt' }], [{ fact: 'tenLoai', op: 'TEN_LOAI', value: 'màn che' }, { fact: 'cachDieuKhien', op: 'TRONG', value: ['BANG_TAY'] }]] }];
  b.ghiChuSoan.push({ ma: '63079080', loai: 'BO_VE', ve: 'dùng cho giày, ủng, áo nịt ngực (corset) và các loại tương tự', lyDo: 'Vế mở không liệt kê được bằng danh sách đóng; quy ước 392690 — không ghi danh sách đóng làm điều kiện.' });
  b.trangThai = 'NHAP';
  const ds = C.dsDeTrong(b);
  check('5a dsDeTrong nhận ghi chú loai DE_TRONG', ds.includes('63079080'), ds);
  let thongBao = '';
  try { C.duyet(b, { phien: 'https://claude.ai/code/session_x#soat-630790', ngay: '2026-10-31' }); } catch (e) { thongBao = e.message; }
  check('5b duyet từ chối khi còn DE_TRONG chưa có kết luận', /cong5-de-trong-chua-xu-ly/.test(thongBao), thongBao);
  thongBao = '';
  try { C.duyet(b, { phien: 'https://claude.ai/code/session_x#soat-630790', ngay: '2026-10-31', giaiQuyet: [{ ma: '63079080', ketLuan: 'người soát xem' }] }); } catch (e) { thongBao = e.message; }
  check('5c kết luận "người soát xem" không tính', /cong5-de-trong-chua-xu-ly/.test(thongBao), thongBao);
  let out = null; thongBao = '';
  try { out = C.duyet(b, { phien: 'https://claude.ai/code/session_x#soat-630790', ngay: '2026-10-31', giaiQuyet: [{ ma: '63079080', ketLuan: 'Đã đối chiếu: vế mở được miễn bằng BO_VE theo quy ước 392690; danh sách đóng đã bỏ.' }] }); } catch (e) { thongBao = e.message; }
  check('5d duyet nhận khi có kết luận cho từng DE_TRONG; ghi vào bản ghi duyệt', out && out.duyet.giaiQuyetDeTrong?.[0]?.ma === '63079080', thongBao || out?.duyet);
  if (out) {
    const r = k5('630790', out);
    check('5e bản đã duyệt có kết luận ⇒ không còn cảnh báo DE_TRONG', !co(r.canhBao, 'cong5-de-trong-chua-xu-ly'), r.canhBao);
  }
  // Ghi chú QUYET_DINH mà chữ là "người soát xem" cũng là DE_TRONG.
  const x = nhap('940542');
  check('5f ghi chú chứa "người soát xem" ⇒ DE_TRONG', C.dsDeTrong(x).includes('94054230'), C.dsDeTrong(x));
}

// ── 6. Mã lỗi có lời giải thích; spec nhận BO_VE ───────────────────────────────────────────────────────────────────
{
  for (const ma of ['cong5-ve-gioi-han-bi-bo:94054230:không nhấp nháy', 'cong5-ve-mo-bi-bo:8481902:và các thiết bị tương tự', 'cong5-dinh-ngu-tach:8536901', 'cong5-de-trong-chua-xu-ly:63079080', 'cong5-bo-ve-ly-do:630790:0', 'cong5-bo-ve-khong-co-trong-chu:630790:0', 'cong5-bo-ve:630790:x']) {
    check(`6a giải thích ${ma.split(':')[0]}`, Boolean(ML.giaiThich(ma)), ma);
  }
  check('6b BO_VE là loại ghi chú hợp lệ', C.LOAI_GHI_CHU.includes('BO_VE'));
  const b = nhap('940542');
  const spec = { phienBan: 'ranh-gioi-spec@1', pn6: '940542', phien: b.soanBoi.phien,
    dong8: Object.fromEntries(b.dong8.filter((m) => m.dieuKienSo.length || m.phanConLai !== undefined).map((m) => [m.hs, { dieuKienSo: m.dieuKienSo, ...(m.phanConLai !== undefined ? { phanConLai: m.phanConLai } : {}) }])),
    chongLanVanBan: b.chongLanVanBan,
    ghiChuSoan: [{ ma: '94054230', loai: 'BO_VE', ve: 'không nhấp nháy', lyDo: 'tu-vung@1 chưa có khoá nhấp nháy; người soát quyết.' }] };
  const { loi, banNhap } = C.apSpec(spec, b, { ngay: '2026-10-31' });
  check('6c apSpec nhận ghi chú BO_VE {ma, loai, ve, lyDo} (không cần ghiChu)', loi.length === 0 && banNhap?.ghiChuSoan?.[0]?.ve === 'không nhấp nháy', loi);
}

// ── 7. CLI: --ve in phân tích vế; --kiem in lỗi cổng 5 kèm giải thích ───────────────────────────────────────────────
{
  let out = ''; let code = 0;
  try { out = execFileSync(process.execPath, ['scripts/so-hoa-ranh-gioi.mjs', '--ve', '--pn6=940542'], { encoding: 'utf8', env: process.env, stdio: 'pipe' }); } catch (e) { out = String(e.stdout); code = e.status; }
  check('7a CLI --ve in vế giới hạn chưa phủ của .30 (mã thoát 1)', code === 1 && /94054230/.test(out) && /không nhấp nháy/.test(out) && /CHƯA PHỦ/.test(out), out.slice(0, 600));
  let txt = ''; try { execFileSync(process.execPath, ['scripts/so-hoa-ranh-gioi.mjs', '--kiem', '--pn6=940542'], { encoding: 'utf8', env: process.env, stdio: 'pipe' }); } catch (e) { txt = String(e.stdout); }
  check('7b CLI --kiem in cong5-ve-gioi-han-bi-bo + lời giải thích', /cong5-ve-gioi-han-bi-bo:94054230/.test(txt) && /BO_VE/.test(txt), txt.slice(0, 800));
}

console.log(`\n${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
