#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * #725 — lỗi cây HS / phạm vi "Loại khác" tìm thấy khi chạy tờ khai thật qua MCP (mã HS công khai, không chép tờ khai):
 *   4  LOAI_KHAC_KHOP_ANH_EM báo oan vì bỏ qua điều kiện tầng cha (84818059 ↔ 84818011/13 "Bằng đồng…" của nhánh van săm)
 *   5  /api/tree 85044019 mất điều kiện tiêu đề 8504401; 85365096 liệt 85365051/61 "Dòng điện dưới 16 A" không kèm tiêu đề
 *   28 84818072: tiêu đề 8481807 không tên gộp hai nhánh 4 gạch mà vẫn dinhNghiaDuoc true
 *   29 phân nhóm 845611 tenVi null (biểu thuế có dòng mã "- - Hoạt động bằng tia laser:")
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const T = require('../lib/hs-tree.js');
const rt = require('../lib/so-tay-runtime.js');
const B = require('../lib/bieu-thue.js');

let passed = 0; let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ` ${JSON.stringify(extra).slice(0, 400)}`}`); if (ok) passed += 1; else failed += 1; };

// ── lỗi 5: tiêu đề có tên là điều kiện khẳng định, không leo qua để "trừ" anh em của nó ────────────────────────────
{
  const lk = T.loaiKhacOf('85044019');
  check('5 85044019: dieuKienTieuDe = tiêu đề 8504401 nguyên văn biểu thuế', lk.dieuKienTieuDe.length === 1 && lk.dieuKienTieuDe[0].nut === '8504401'
    && /máy xử lý dữ liệu tự động.*thiết bị viễn thông/.test(lk.dieuKienTieuDe[0].tenVi) && /^bieu-thue@/.test(lk.dieuKienTieuDe[0].tenNguon), lk);
  check('5 85044019: chỉ trừ 85044011 (UPS) — không còn "trừ" oan 85044020/30/40 của tầng 850440', lk.truDayDu.join() === '85044011' && lk.dinhNghiaDuoc === true, lk);
  check('5 85044019: tầng 850440 ghi phaiThuoc 8504401, tru rỗng', lk.chuoi[1].nut === '850440' && lk.chuoi[1].phaiThuoc === '8504401' && lk.chuoi[1].tru.length === 0, lk.chuoi);
  const r = rt.loaiKhac('85044019');
  check('5 85044019 runtime: dieuKienTieuDe nhãn NGUYEN_VAN; truTheoTang[1].phaiThuoc', r.dieuKienTieuDe[0].nguonLoai === 'NGUYEN_VAN' && r.truTheoTang[1].phaiThuoc.id === '8504401', r);
  check('5 85044019 runtime: không còn "dòng cha cấp trên KHÔNG có trong nguồn" khi cây đã có tên tiêu đề cha',
    !/KHÔNG có trong nguồn/.test(JSON.stringify(r)), r.dieuKienSoTay);

  const r2 = rt.loaiKhac('85365096');
  const a51 = r2.anhEmCoTen.find((a) => a.hs === '85365051'); const a61 = r2.anhEmCoTen.find((a) => a.hs === '85365061');
  check('5 85365096: 85365051 dieuKien = "8536505 (<tên tiêu đề>) › Dòng điện dưới 16 A"', a51 && /^8536505 \(Công tắc điện tử .+\) › Dòng điện dưới 16 A$/.test(a51.dieuKien) && a51.tieuDeCha[0].id === '8536505', a51);
  check('5 85365096: 85365061 dieuKien nối tiêu đề 8536506', a61 && /^8536506 \(Loại khác, loại đóng ngắt mạch .+\) › Dòng điện dưới 16 A$/.test(a61.dieuKien), a61);
  check('5 85365096: dòng không có tiêu đề cha (85365020) không mang tieuDeCha', !r2.anhEmCoTen.find((a) => a.hs === '85365020').tieuDeCha);
  // 85369094 (#725 lỗi 25, đã sửa ở #726) — luật "Loại khác thuộc dòng bị trừ" vẫn thấy tiêu đề 8536901 ở tầng 853690.
  const lk94 = T.loaiKhacOf('85369094');
  check('85369094: vẫn trừ tiêu đề 8536901 ở tầng 853690; điều kiện tầng không mã "Dòng điện dưới 16 A"',
    lk94.chuoi.some((c) => c.nut === '853690' && c.tru.includes('8536901')) && lk94.dieuKienTieuDe.some((d) => /^853690~r\d+$/.test(d.nut) && d.tenVi === 'Dòng điện dưới 16 A'), lk94);
}

// ── lỗi 28: theo cấu trúc gạch (lớp tầng), không theo nhóm chữ số không tên ───────────────────────────────────────────
{
  const lk = T.loaiKhacOf('84818072');
  check('28 84818072: cha = tầng không mã "Van bi" (biểu thuế), chỉ trừ 84818071', /^848180~r\d+$/.test(lk.cha) && T.nodeOf(lk.cha).tenVi === 'Van bi' && lk.anhEmCoTen.join() === '84818071', lk);
  check('28 84818072: không gộp 84818073–79 (nhánh "Van cổng…", "Van nhiều cửa") vào anh em', !['84818073', '84818074', '84818077', '84818078', '84818079'].some((h) => lk.truDayDu.includes(h)), lk.truDayDu);
  check('28 84818072: dieuKienTieuDe "Van bi"; tầng 848180 trừ các nhánh trước "Loại khác:"', lk.dieuKienTieuDe.some((d) => d.tenVi === 'Van bi') && lk.chuoi[lk.chuoi.length - 1].nut === '848180' && lk.chuoi[lk.chuoi.length - 1].tru.includes('8481805'), lk);
  check('28 84818072: định nghĩa được (cấu trúc đã tách đúng), không lý do', lk.dinhNghiaDuoc === true && !lk.lyDoKhongDinhNghia, lk);

  // Tắt làm trong suốt nhóm chữ số không tên: tiêu đề 8481807 không tên còn trên đường đi ⇒ false kèm lý do.
  T.datTrongSuot(false);
  try {
    const cu = T.loaiKhacOf('84818072');
    const loai = (cu.lyDoKhongDinhNghia || []).map((l) => l.loai);
    check('28 không lớp tầng: 8481807 không tên ⇒ dinhNghiaDuoc false, lý do TIEU_DE_BI_LUOC_TEN', cu.dinhNghiaDuoc === false && loai.includes('TIEU_DE_BI_LUOC_TEN'), cu);
  } finally { T.datTrongSuot(true); }
  // Cây theo chữ số thuần: con của 8481807 gộp hai nhánh 4 gạch ⇒ có dấu hiệu (≥ 2 "Loại khác" trần 72/79, tên 71/78 trùng).
  const gCay = T.dauHieuGopNhanh(T.tree().nodes.get('8481807').children.map((id) => T.nodeOf(id))).map((x) => x.loai);
  check('28 cây chữ số 8481807: dấu hiệu gộp nhánh NHIEU_DONG_LOAI_KHAC_TRAN + TEN_ANH_EM_TRUNG', gCay.includes('NHIEU_DONG_LOAI_KHAC_TRAN') && gCay.includes('TEN_ANH_EM_TRUNG'), gCay);

  const g = T.dauHieuGopNhanh([
    { id: 'A1', cap: 8, tenVi: 'Bằng plastic', gach: 4 }, { id: 'A2', cap: 8, tenVi: 'Loại khác', loaiKhac: true, loaiKhacTran: true, gach: 4 },
    { id: 'B1', cap: 8, tenVi: 'Bằng plastic', gach: 4 }, { id: 'B2', cap: 8, tenVi: 'Loại khác', loaiKhac: true, loaiKhacTran: true, gach: 3 },
  ]);
  check('dauHieuGopNhanh (tổng hợp): tên trùng + 2 LK trần + gạch lệch', g.map((x) => x.loai).join() === 'TEN_ANH_EM_TRUNG,NHIEU_DONG_LOAI_KHAC_TRAN,GACH_LECH', g);
  check('dauHieuGopNhanh: tầng sạch → []', T.dauHieuGopNhanh([{ id: 'A', cap: 8, tenVi: 'Bằng đồng', gach: 3 }, { id: 'B', cap: 8, tenVi: 'Loại khác', loaiKhac: true, loaiKhacTran: true, gach: 3 }]).length === 0);
}

// ── toàn biểu: mọi dòng Loại khác — dinhNghiaDuoc false ⇔ có lý do; không dòng nào còn "trừ" anh em của tiêu đề có tên ──
{
  const t = T.tree(); let lk = 0; let lechLyDo = 0; let truQuaTieuDe = 0; let gop = 0;
  for (const n of new Set(t.nodes.values())) {
    if (n.cap !== 8 || !n.loaiKhac) continue;
    lk += 1;
    const x = T.loaiKhacOf(n.id);
    if (x.dinhNghiaDuoc === Boolean(x.lyDoKhongDinhNghia && x.lyDoKhongDinhNghia.length)) lechLyDo += 1;
    if (x.chuoi.some((c) => c.phaiThuoc && !c.phanConLai && c.tru.length)) truQuaTieuDe += 1;
    if ((x.lyDoKhongDinhNghia || []).some((l) => ['TEN_ANH_EM_TRUNG', 'NHIEU_DONG_LOAI_KHAC_TRAN', 'GACH_LECH'].includes(l.loai))) gop += 1;
  }
  check(`toàn biểu (${lk} dòng Loại khác): dinhNghiaDuoc false ⇔ có lyDoKhongDinhNghia`, lk > 3000 && lechLyDo === 0, { lechLyDo });
  check('toàn biểu: tầng đi qua tiêu đề có tên không trừ anh em (trừ "phần còn lại có tên")', truQuaTieuDe === 0, { truQuaTieuDe });
  check('toàn biểu: dấu hiệu gộp nhánh còn lại sau lớp tầng ≤ 5 dòng (chương 98)', gop <= 5, { gop });
}

// ── lỗi 4: máy nghi anh em khớp phải khớp cả tên tiêu đề cha của dòng anh em ───────────────────────────────────────────
{
  const sp = (tenHang) => ({ tenHang });
  check('4 84818059 (van trộn nóng lạnh bằng đồng): KHÔNG khớp 84818011/13 "Bằng đồng…" (khác nhánh)',
    rt.anhEmKhop('84818059', sp('Van trộn nước nóng lạnh bằng đồng hoặc hợp kim đồng, mạ crom')).length === 0);
  check('4 84818099 + van bi bằng đồng: KHÔNG khớp 84818011 (dòng nằm dưới tiêu đề "Van dùng cho săm")',
    !rt.anhEmKhop('84818099', sp('Van bi bằng đồng hoặc hợp kim đồng DN15')).some((k) => k.hs === '84818011'));
  const k = rt.anhEmKhop('84818099', sp('Van dùng cho săm xe đạp bằng đồng hoặc hợp kim đồng'));
  check('4 84818099 + van săm bằng đồng: khớp 84818011, dieuKien kèm tiêu đề "Van dùng cho săm"',
    k.some((x) => x.hs === '84818011' && /Van dùng cho săm › Bằng đồng hoặc hợp kim đồng|Van dùng cho săm\) › Bằng đồng/.test(x.dieuKien)), k);
  check('4 85365099 + công tắc bập bênh < 16 A: KHÔNG khớp 85365051 (tiêu đề "Công tắc điện tử …")',
    !rt.anhEmKhop('85365099', sp('Công tắc bập bênh dòng điện dưới 16 A')).some((x) => x.hs === '85365051'));
}

// ── lỗi 29: tên Việt phân nhóm 6 số theo dòng có mã của biểu ──────────────────────────────────────────────────────────
{
  const n = T.nodeOf('845611');
  check('29 845611: tenVi "Hoạt động bằng tia laser" nguyên văn biểu thuế', n.tenVi === 'Hoạt động bằng tia laser' && /^bieu-thue@/.test(n.tenNguon), n);
  check('29 852351: tên theo dòng mã của biểu hiện hành, không lấy tên sheet phụ (AHTN cũ)', T.nodeOf('852351').tenVi === 'Các thiết bị lưu trữ bền vững, thể rắn', T.nodeOf('852351').tenVi);
  let n6 = 0; let thieu = 0;
  for (const x of new Set(T.tree().nodes.values())) if (x.cap === 6) { n6 += 1; if (!x.tenVi) thieu += 1; }
  check(`29 toàn biểu: phân nhóm 6 số thiếu tenVi ≤ 2/${n6} (chương 98 không có dòng mã)`, thieu <= 2, { thieu });
  const tm = B.tenTheoMa([
    { soChuSo: 6, maChuan: '999911', moTaVi: '- - Hoạt động bằng tia laser:', moTaEn: '- - Operated by laser:', r: 7, gach: 2 },
    { soChuSo: 6, maChuan: '999911', moTaVi: '- - Bản lặp', r: 9, gach: 2 },
    { soChuSo: 8, maChuan: '99991110', moTaVi: '- - - Loại khác', r: 8, gach: 3 },
  ]);
  check('tenTheoMa (tổng hợp): bỏ gạch, giữ dòng đầu, chỉ mã 6 số, KHOP_MA', JSON.stringify(tm) === JSON.stringify({ 999911: { tenVi: 'Hoạt động bằng tia laser:', tenEn: 'Operated by laser:', r: 7, gach: 2, doTinCay: 'KHOP_MA' } }), tm);
}

// ── /api/tree ────────────────────────────────────────────────────────────────────────────────────────────────────────
{
  delete process.env.HS_API_TOKEN;
  const handler = require('../api/dataset.js');
  const res = { _s: 0, _j: null, _h: {}, getHeader(k) { return this._h[k]; }, setHeader(k, v) { this._h[k] = v; }, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } };
  await handler({ method: 'GET', url: '/api/tree', query: { resource: 'hs_tree', hs: '85044019' }, headers: {} }, res);
  const j = res._j;
  check('/api/tree 85044019: cha 8504401 có tên + tenNguon; loaiKhac.dieuKienTieuDe; anhEmCoTen chỉ UPS', res._s === 200 && j.cha.id === '8504401' && j.cha.tenNguon && j.loaiKhac.dieuKienTieuDe[0].id === '8504401'
    && j.loaiKhac.anhEmCoTen.map((a) => a.hs).join() === '85044011', j.loaiKhac);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
