#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * scripts/do-fast-first-50-ca.mjs — Đo cổng tất định FAST-FIRST (OZV-631 / OZV-570) trên bộ 50 ca TB-TCHQ:
 * KHÔNG gọi LLM, KHÔNG mạng (MIC_OFF + micAllowed:false + HS_EMBED_POOL mặc định tắt + không set OZ_GOLD_BLOB_URL).
 *
 * Câu hỏi đo (thẻ OZV-631): nếu bật HS_CLASSIFY_FAST_FIRST ở prod thì bao nhiêu % lượt đi đường nhanh
 * (fastFirstUngVien trả đúng 1 mã 8 số ⇒ bỏ lời GIR vòng 2) và đường nhanh có chọn đúng mã không?
 *
 * Không có khoá LLM trên máy đo ⇒ KHÔNG đo được r1 thật; r1 được dựng TẤT ĐỊNH theo 2 chiều, giữ nguyên phần
 * dữ liệu thật của đường chạy (gọi đúng `gather()` — tiền lệ Oz, bảng quyết định, cặp mã dễ nhầm — như classifyLoop):
 *   [dung-huong] r1 dẫn đầu đúng PHÂN NHÓM 6 SỐ của mã vàng (`ca.ma`), tự tin 80 (≥ FAST_FIRST_TU_TIN=75),
 *                không dữ kiện thiếu (unknowns rỗng) — tức kịch bản LÝ TƯỞNG của vòng 1 thinking-off.
 *                ⇒ đo TỈ LỆ có đường nhanh + ĐỘ ĐÚNG của mã đường nhanh (so mã vàng).
 *   [sai-huong] r1 dẫn đầu mã dễ nhầm (`ca.maLan` — mã mà TB-TCHQ gốc đã nêu là nhầm), cùng độ tin.
 *                ⇒ đo CỔNG CÓ CHẶN ĐÚNG không: đường nhanh KHÔNG được trả mã nào (chặn ⇒ vòng 2 chạy như cũ);
 *                  trả mã ⇒ cổng thất thủ (bỏ vòng 2 theo hướng sai = chốt sai ở prod — rủi ro lớn nhất).
 *
 * Kết quả (4 số của thẻ) in ra stdout; chạy lại nhiều lần phải ra cùng số (toàn bộ dữ liệu tĩnh, không ngẫu nhiên).
 *
 * Cách dùng:
 *   node scripts/do-fast-first-50-ca.mjs              # tóm tắt 4 số + bảng ca bất thường
 *   node scripts/do-fast-first-50-ca.mjs --chi-tiet   # in mọi ca (cả hai chiều) ra stdout
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { docBo50Ca } from './benchmark-50-ca-tb-tchq.mjs';

const require = createRequire(import.meta.url);
process.env.HS_CLASSIFY_ENGINE = 'loop';
process.env.MIC_OFF = '1';
process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';

const { gather, fastFirstUngVien, FAST_FIRST_TU_TIN } = require('../lib/engine-loop.js');

const chiTiet = process.argv.includes('--chi-tiet');

/**
 * Dựng r1 tất định + chạy đúng trình tự thật của classifyLoop cho 1 mã dẫn đầu:
 * r1 (giả) → gather() (THẬT, không LLM/mạng) → productText (ghép như engine-loop.js) → fastFirstUngVien.
 */
async function doMotLuot(ca, maDanDau, nhan) {
  const h4 = maDanDau.slice(0, 4);
  const r1 = {
    // Giữ khuôn r1 y hệt stub replay1211 (benchmark-50-ca-tb-tchq.mjs): chỉ thay mã dẫn đầu.
    product: { nameVi: ca.cauKhach.slice(0, 160), purpose: '', mechanism: 'chưa rõ', material: '', evidence: {} },
    hypotheses: [{ chapter: h4.slice(0, 2), heading4: h4, subheading6: maDanDau.slice(0, 6), why: nhan, confidence: 80 }],
    verify: { searchVi: [ca.cauKhach.slice(0, 80)], notesChapters: [h4.slice(0, 2)], codes8: [maDanDau], micQuery: null, unknowns: [] },
  };
  const raw = { tenHang: ca.cauKhach };
  const gathered = await gather(r1, raw, { micAllowed: false });
  const p = r1.product;
  const productText = [raw.tenHang, raw.nameZh, raw.specs, raw.chatLieu, raw.congDung, p.nameVi, p.purpose, p.material, p.mechanism].filter(Boolean).join('\n');
  const kq = fastFirstUngVien({ r1, gathered, productText });
  // Tiền lệ vàng bị lọc vì khác phân nhóm 6 số của vòng 1: cổng NHÌN THẤY mã đúng nhưng tự loại (không chặn nhầm).
  const oz = gathered.ozPrecedents || [];
  const tienLeVangBiLoc = oz.some((o) => o.hs === ca.ma && (o.cov ?? 0) >= 75 && !String(o.hs).startsWith(maDanDau.slice(0, 6)));
  // CHẨN ĐOÁN vì sao không có đường nhanh (chỉ dùng cho chiều đúng hướng): phân tích cùng dữ liệu cổng đã nhìn thấy.
  const hs6 = maDanDau.slice(0, 6);
  const ozTrongPhanNhom = oz.filter((o) => String(o.hs).length === 8 && String(o.hs).startsWith(hs6));
  const chanDoan = kq.hs8 ? 'co-duong-nhanh'
    : ozTrongPhanNhom.some((o) => (o.cov ?? 0) >= 75) ? 'tien-le-roi-vao-cap-ma-de-nham' // có ứng viên ≥75% cùng phân nhóm nhưng bị conflictsDb loại
      : oz.some((o) => (o.cov ?? 0) >= 75) ? 'tien-le-khac-phan-nhom-6' // có tiền lệ Oz ≥75% nhưng KHÁC hs6 vòng 1
        : oz.length ? 'tien-le-khop-duoi-75' // có tiền lệ Oz nhưng độ khớp dưới ngưỡng tin
          : 'khong-tien-le-oz'; // không tìm thấy tờ khai Oz tương tự nào
  return { stt: ca.stt, maDanDau, hs8: kq.hs8 || null, tuTin: kq.tuTin ?? null, kieu: kq.kieu || null, lyDo: (kq.lyDo || []).join(',') || null, tienLeVangBiLoc, chanDoan };
}

/** ───────── CHIỀU 1 [dung-huong]: vòng 1 đúng hướng — tỉ lệ có đường nhanh + độ đúng ───────── */
async function chieuDungHuong(cases) {
  const luot = [];
  for (const ca of cases) luot.push(await doMotLuot(ca, ca.ma, 'đường nhanh: vòng 1 dẫn đúng phân nhóm vàng'));
  const coDuongNhanh = luot.filter((x) => x.hs8);
  const dung = coDuongNhanh.filter((x) => x.hs8 === cases[x.stt - 1].ma);
  const sai = coDuongNhanh.filter((x) => x.hs8 !== cases[x.stt - 1].ma);
  const chanDoan = {};
  for (const x of luot) chanDoan[x.chanDoan] = (chanDoan[x.chanDoan] || 0) + 1;
  return { luot, coDuongNhanh, dung, sai, chanDoan };
}

/** ───────── CHIỀU 2 [sai-huong]: vòng 1 đi theo mã dễ nhầm — cổng phải chặn, không được chốt ───────── */
async function chieuSaiHuong(cases) {
  const luot = [];
  for (const ca of cases) {
    for (const lan of ca.maLan) luot.push(await doMotLuot(ca, lan, 'đường nhanh: vòng 1 đi theo mã dễ nhầm'));
  }
  const chanDung = luot.filter((x) => !x.hs8);
  const thatThu = luot.filter((x) => x.hs8); // cổng trả mã khi vòng 1 sai hướng — KHÔNG được xảy ra
  const lyDoChan = {};
  for (const x of chanDung) lyDoChan[x.lyDo] = (lyDoChan[x.lyDo] || 0) + 1;
  const locHs6 = chanDung.filter((x) => x.tienLeVangBiLoc).length;
  return { luot, chanDung, thatThu, lyDoChan, locHs6 };
}

const pct = (n, t) => (t ? ((n / t) * 100).toFixed(1) : '0.0');

// ───────── main ─────────
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const bo = docBo50Ca();
  console.log(`Đo cổng FAST-FIRST trên ${bo.cases.length} ca TB-TCHQ (tests/bo-50-ca-tb-tchq.json) — không LLM, không mạng.`);
  console.log(`r1 giả: tự tin 80 (ngưỡng ${FAST_FIRST_TU_TIN}), unknowns rỗng — đo CỔNG + DỮ LIỆU thật, KHÔNG đo chất lượng vòng 1 LLM.\n`);

  const dh = await chieuDungHuong(bo.cases);
  console.log(`[1] TỈ LỆ CÓ ĐƯỜNG NHANH (vòng 1 đúng hướng): ${dh.coDuongNhanh.length}/${bo.cases.length} (${pct(dh.coDuongNhanh.length, bo.cases.length)}%)`);
  console.log(`[2] ĐỘ ĐÚNG CỦA ĐƯỜNG NHANH: ${dh.dung.length}/${dh.coDuongNhanh.length} (${pct(dh.dung.length, dh.coDuongNhanh.length)}%) — mã đường nhanh = mã vàng`);
  console.log(`[3] ĐƯỜNG NHANH SAI: ${dh.sai.length} ca`);
  for (const x of dh.sai) console.log(`    stt ${x.stt}: chọn ${x.hs8} (${x.kieu}) — mã vàng ${bo.cases[x.stt - 1].ma}`);
  console.log(`    VÌ SAO KHÔNG CÓ ĐƯỜNG NHANH (${bo.cases.length - dh.coDuongNhanh.length} ca còn lại — vòng 2 chạy như cũ, không rủi ro):`);
  for (const [cd, n] of Object.entries(dh.chanDoan).sort((a, b) => b[1] - a[1])) console.log(`    ${String(n).padStart(2)} ca · ${cd}`);

  const sh = await chieuSaiHuong(bo.cases);
  console.log(`\n[4] CỔNG CHẶN ĐÚNG (vòng 1 đi theo mã dễ nhầm — ${sh.luot.length} lượt): chặn ${sh.chanDung.length}/${sh.luot.length} (${pct(sh.chanDung.length, sh.luot.length)}%)`);
  for (const [lyDo, n] of Object.entries(sh.lyDoChan).sort((a, b) => b[1] - a[1])) console.log(`    ${String(n).padStart(2)} lượt · ${lyDo}`);
  console.log(`    trong số đó ${sh.locHs6} lượt NHÌN THẤY tiền lệ mã vàng (cov ≥ 75) nhưng tự loại vì khác phân nhóm 6 số vòng 1 — không chặn nhầm, không nuốt mã sai.`);
  const chotNham = sh.thatThu.filter((x) => x.hs8 === x.maDanDau); // cổng chốt ĐÚNG mã sai — rủi ro thật
  const tuSuaVeVang = sh.thatThu.filter((x) => x.hs8 !== x.maDanDau); // vòng 1 sai dòng 8 số → cổng trả mã KHÁC (đều = mã vàng, cùng phân nhóm 6)
  console.log(`    CỔNG CHỐT THEO HƯỚNG SAI (bỏ vòng 2 rồi chốt nhầm): ${chotNham.length} lượt`);
  for (const x of chotNham) console.log(`    stt ${x.stt}: dẫn ${x.maDanDau} → cổng chốt ${x.hs8} (${x.kieu}) — mã vàng ${bo.cases[x.stt - 1].ma}`);
  console.log(`    CỔNG TRẢ MÃ KHÁC HƯỚNG DẪN (tự sửa dòng 8 số, cùng phân nhóm 6): ${tuSuaVeVang.length} lượt`);
  for (const x of tuSuaVeVang) console.log(`    stt ${x.stt}: dẫn ${x.maDanDau} → cổng trả ${x.hs8} (${x.kieu}) — mã vàng ${bo.cases[x.stt - 1].ma}${x.hs8 === bo.cases[x.stt - 1].ma ? ' (đúng mã vàng)' : ''}`);

  if (chiTiet) {
    console.log('\n--- CHI TIẾT [dung-huong] ---');
    for (const x of dh.luot) console.log(`stt ${String(x.stt).padStart(2)} dẫn ${x.maDanDau} → ${x.hs8 ? `${x.hs8} (${x.kieu})` : `chặn: ${x.lyDo}`}`);
    console.log('--- CHI TIẾT [sai-huong] ---');
    for (const x of sh.luot) console.log(`stt ${String(x.stt).padStart(2)} dẫn ${x.maDanDau} → ${x.hs8 ? `${x.hs8} (${x.kieu})` : `chặn: ${x.lyDo}${x.tienLeVangBiLoc ? ' (lọc hs6)' : ''}`}`);
  }

  const anToan = dh.sai.length === 0 && sh.thatThu.filter((x) => x.hs8 === x.maDanDau).length === 0;
  console.log(`\nKẾT LUẬN: ${anToan
    ? `PHẦN TẤT ĐỊNH sạch — ${dh.coDuongNhanh.length}/${bo.cases.length} ca đúng hướng đi được đường nhanh, 0 ca chọn sai, 0 lượt chốt nhầm khi vòng 1 sai hướng.`
    : `CHƯA AN TOÀN ĐỂ BẬT — còn ca đường nhanh chọn sai mã / cổng chốt nhầm khi vòng 1 sai hướng (danh sách ở trên).`}`);
  console.log('(Lưu ý: chưa đo vòng 1 LLM thật — tỉ lệ prod còn phụ thuộc vòng 1 có đạt đúng hướng + tự tin ≥ 75 + unknowns rỗng hay không.)');
}
