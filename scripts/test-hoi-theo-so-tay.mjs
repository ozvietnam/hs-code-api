#!/usr/bin/env node
// HS_HOI_THEO_SO_TAY — câu hỏi gửi khách phải có căn cứ từ sổ tay nhóm 4 số / sổ ranh giới PN6 đã DUYET / trường khai
// theo nhóm; câu LLM tự nghĩ không khớp sổ → ghiChuThem. Hậu xử lý TẤT ĐỊNH: không LLM, không đổi mã/độ tự tin/status.
// Ca gốc (qua Cổng 21/11): "Van điện từ khí nén 5/2 thân nhôm, cổng ren 1/4 inch (13 mm), dùng điều khiển xi lanh khí nén"
// → động cơ dừng 848180 (earlyExitHoi) và hỏi 6 câu LLM (điện áp cuộn dây, model, hãng…).
import './test-isolate-data.mjs';
import { TEST_DATA_DIR } from './test-isolate-data.mjs';
import { gieoNhap } from './fixtures/ho-so/nhap-dong-cung.mjs';
import fs from 'node:fs';
import path from 'node:path';
{
  fs.mkdirSync(path.join(TEST_DATA_DIR, 'so-tay'), { recursive: true });
  const st9026 = JSON.parse(fs.readFileSync('data/so-tay/9026.json', 'utf8'));
  st9026.dong8 = (st9026.dong8 || []).map((d) => (d.hs === '90262050' ? { ...d, dieuKienSo: [] } : d));
  fs.writeFileSync(path.join(TEST_DATA_DIR, 'so-tay/9026.json'), JSON.stringify(st9026));
  gieoNhap('848180', { pn6: '848180', trangThai: 'TRA_VE' });
  const st8536 = JSON.parse(fs.readFileSync('data/so-tay/8536.json', 'utf8'));
  st8536.dong8 = (st8536.dong8 || []).map((d) => (String(d.hs || '').startsWith('853650') ? { ...d, dieuKienSo: [] } : d));
  st8536.dieuKienNut = (st8536.dieuKienNut || []).filter((n) => !String(n.id || '').startsWith('853650'));
  fs.writeFileSync(path.join(TEST_DATA_DIR, 'so-tay/8536.json'), JSON.stringify(st8536));
}
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
process.env.MIC_OFF = '1';
process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';
for (const k of ['ZAI_WEB_FACTS', 'HS_GON_DAU_RA', 'HS_MAX_VONG_SUA', 'HS_SO_TAY', 'HS_SO_TAY_DONG', 'HS_CLASSIFY_FAST_FIRST', 'R1_MAX_TOKENS', 'GIR_MAX_TOKENS', 'HS_HOI_THEO_SO_TAY', 'HS_B1B_WEB']) {
  delete process.env[k];
}
process.env.CLASSIFY_BUDGET_MS = '285000';

const llmTier = require('../lib/llm-tier');
let script = [];
let llmCalls = 0;
llmTier.callLLMJson = async () => {
  llmCalls += 1;
  const next = script.shift();
  if (next instanceof Error) throw next;
  return { json: JSON.parse(JSON.stringify(next)), provider: 'stub', model: 'stub' };
};
console.error = () => {};
console.warn = () => {};
const H = require('../lib/hoi-theo-so-tay.js');
const { classifyLoop } = require('../lib/engine-loop.js');
const { missingStructured } = require('../lib/declaration-fields');
const { loadRanhGioiDuyet, loadSoTay } = require('../lib/so-tay-gates');
{
  const st8481 = loadSoTay('8481');
  st8481.dong8 = (st8481.dong8 || []).map((d) => (String(d.hs || '').startsWith('848180') ? { ...d, dieuKienSo: (d.dieuKienSo || []).filter((c) => ['duong_kinh', 'duongKinhTrong', 'chat_lieu', 'chatLieu'].includes(c.fact)) } : d));
  st8481.dieuKienNut = (st8481.dieuKienNut || []).filter((n) => !String(n.id || '').startsWith('848180'));
}
const { tuKhoa, khopDieuKien, tapTuMoTa } = require('../lib/do-thi/tu-khoa');

let pass = 0;
let fail = 0;
const check = (n, c, x = '') => {
  if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${String(typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 700)}`); }
};
const voi = async (giaTri, fn) => {
  const cu = process.env.HS_HOI_THEO_SO_TAY;
  if (giaTri == null) delete process.env.HS_HOI_THEO_SO_TAY; else process.env.HS_HOI_THEO_SO_TAY = giaTri;
  try { return await fn(); } finally { if (cu == null) delete process.env.HS_HOI_THEO_SO_TAY; else process.env.HS_HOI_THEO_SO_TAY = cu; }
};

// ───────── Ca van 5/2: kết quả động cơ GIẢ LẬP đúng hình dạng phản hồi thật (earlyExitHoi, dừng 848180) ─────────
const VAN = { tenHang: 'Van điện từ khí nén 5/2 thân nhôm, cổng ren 1/4 inch (13 mm), dùng điều khiển xi lanh khí nén' };
const CAU_LLM = [
  'Điện áp cuộn dây, dòng điện và công suất tiêu thụ',
  'Áp suất vận hành và lưu lượng khí nén',
  'Cấu hình điện điều khiển nội tuyến hay ngoại tuyến',
  'Có kèm đầu nối, điện giới, giằng',
  'Model, nhãn hiệu và hãng sản xuất',
  'Có phải van điện từ thông thường hay van điện từ có phản hồi vị trí',
];
const ketQuaGia = (hs = '848180', raw = VAN, them = {}, alt = []) => ({
  status: 'NEED_FACTS',
  nextAction: { type: 'ASK_USER', questions: CAU_LLM.map((q) => ({ attribute: null, questionVi: q, whereToFind: 'ảnh tem/nhãn, thông số kỹ thuật / hỏi người bán' })), howToAnswerVi: 'Bổ sung dữ kiện (ảnh tem/nhãn, thông số) rồi gọi lại /api/classify.' },
  results: [{ hs, hsLevel: hs.length, confidence: 60, reason: 'Hồ sơ thiếu dữ kiện quyết định mã', duKien: hs.length < 8 }],
  missing: [...CAU_LLM],
  missingStructured: missingStructured(hs, raw),
  soTay: { mode: 'full', challenges: [], outcome: 'NONE', giaiTrinh: [] },
  dossier: {
    product: { nameVi: 'van điện từ khí nén 5/2', purpose: 'điều khiển xi lanh khí nén', material: 'nhôm', keySpecs: [{ k: 'cổng ren', v: '1/4 inch (13 mm)' }] },
    hypotheses: [{ chapter: '84', heading4: hs.slice(0, 4), subheading6: hs.slice(0, 6), confidence: 82 }],
    unknowns: [...CAU_LLM], decision: 'HOI', conditions: CAU_LLM.map((u) => ({ fact: u, status: 'UNKNOWN', evidence: '' })), alternatives: alt.map((h) => ({ hs: h, whyNot: 'còn cân nhắc' })),
  },
  engine: { name: 'loop', provider: 'minimax', gates: [{ hs, round: 2, unknowns: 6, earlyExitHoi: true }] },
  ...them,
});
// Ca sáng 21/11 nhưng vòng 2 CÒN GIỮ 848120 làm phương án (dossier.alternatives) ⇒ phân nhóm chưa chốt, được hỏi lại.
const ketQuaSong = (raw = VAN) => ketQuaGia('848180', raw, {}, ['848120']);

// 1) Công tắc TẮT (mặc định) → trả đúng đối tượng cũ, không thêm trường.
{
  const out = ketQuaGia();
  const truoc = JSON.stringify(out);
  const kq = await voi(null, () => H.apDung(out, { rawAttrs: VAN }));
  check('TẮT (mặc định): apDung trả ĐÚNG đối tượng cũ (===)', kq === out && JSON.stringify(kq) === truoc);
  check('TẮT: bat() === false; "off"/"0" cũng tắt', H.bat() === false && (await voi('off', () => H.bat())) === false && (await voi('0', () => H.bat())) === false);
  check('BẬT: chỉ "on"/"1"/"true"', (await voi('on', () => H.bat())) && (await voi('1', () => H.bat())) && (await voi('true', () => H.bat())));
}

// 2) Ca van 5/2 — BẬT (động cơ ra 848180, vòng 2 còn giữ 848120 làm phương án).
{
  const out = ketQuaSong();
  const truoc = JSON.stringify(out);
  const kq = await voi('on', () => H.apDung(out, { rawAttrs: VAN }));
  const qs = kq.nextAction.questions;
  const chu = qs.map((q) => q.questionVi).join(' ¦ ');
  check('van 5/2: không sửa đối tượng đầu vào (bản trong bộ nhớ đệm an toàn)', JSON.stringify(out) === truoc && kq !== out);
  check('van 5/2: canCuCauHoi = "so-tay"', kq.nextAction.canCuCauHoi === 'so-tay', kq.nextAction);
  check('van 5/2: tối đa 4 câu, ít nhất 2', qs.length <= 4 && qs.length >= 2, qs.length);
  check('van 5/2: câu ĐẦU là phân biệt phân nhóm 6 số, nêu cả 8481.20 và 8481.80', qs[0].loai === 'PHAN_NHOM_6' && /8481\.20/.test(qs[0].questionVi) && /8481\.80/.test(qs[0].questionVi) && /truyền động dầu thủy lực hoặc khí nén/.test(qs[0].questionVi), qs[0]);
  check('van 5/2: câu phân nhóm ghi nhận mô tả khớp chữ "khí nén" của 8481.20', (qs[0].phanNhomKhopMoTa || []).some((p) => p.hs6 === '848120' && p.cum === 'khí nén'), qs[0].phanNhomKhopMoTa);
  const iPn = qs.findIndex((q) => q.loai === 'PHAN_NHOM_6');
  const iDong = qs.findIndex((q) => q.loai === 'DONG_8');
  check('van 5/2: câu phân nhóm 6 số đứng TRƯỚC câu dòng 8 số', iPn === 0 && iDong > iPn, { iPn, iDong });
  const dk = qs.find((q) => q.loai === 'DONG_8' && /[Đđ]ường kính/.test(q.questionVi));
  check('van 5/2: có câu điều kiện dòng theo sổ — đường kính trong (cửa nạp/cửa thoát)', Boolean(dk) && /^tax\.8481/.test(dk.nguon) && /đường kính/i.test(dk.trich), dk);
  check('van 5/2: sổ ranh giới 848120 đang DUYET (tiền đề của căn cứ ranh-gioi-pn6)', Boolean(loadRanhGioiDuyet('848120')));
  check('van 5/2: câu đường kính trong phủ CẢ phân nhóm ứng viên thứ hai 848120, kèm căn cứ sổ ranh giới PN6 đã DUYET', Boolean(dk) && dk.phanNhom.includes('848180') && dk.phanNhom.includes('848120') && (dk.canCuThem || []).some((c) => c.canCu === 'ranh-gioi-pn6' && c.phanNhom === '848120' && /8481/.test(c.nguon)), dk);
  // Chỉ có câu mô tả trần của khách (vòng 1 chưa tách công dụng/cơ chế) → máy chốt dòng của 848120 còn thiếu "cách điều khiển".
  const tran = ketQuaSong();
  tran.dossier.product = { nameVi: 'van điện từ khí nén 5/2' };
  const kqTran = await voi('on', () => H.apDung(tran, { rawAttrs: VAN }));
  const rg = kqTran.nextAction.questions.find((q) => q.canCu === 'ranh-gioi-pn6');
  check('van 5/2 (mô tả trần): có câu canCu "ranh-gioi-pn6" của 848120 — cách điều khiển, nguồn nút 8481201', Boolean(rg) && rg.loai === 'DONG_8' && rg.phanNhom.includes('848120') && /điều khiển/.test(rg.questionVi) && /8481201/.test(rg.nguon) && /Van cổng điều khiển bằng tay/.test(rg.trich), kqTran.nextAction.questions);
  check('van 5/2: KHÔNG còn câu "điện áp cuộn dây" / "model, nhãn hiệu" trong câu hỏi', !/điện áp cuộn dây|nhãn hiệu|hãng sản xuất|phản hồi vị trí|đầu nối/i.test(chu), chu);
  check('van 5/2: câu LLM không khớp sổ nằm ở ghiChuThem', kq.nextAction.ghiChuThem.includes(CAU_LLM[0]) && kq.nextAction.ghiChuThem.includes(CAU_LLM[4]) && kq.nextAction.ghiChuThem.length >= 3, kq.nextAction.ghiChuThem);
  check('van 5/2: mô tả đã nêu "thân nhôm" → không hỏi lại vật liệu', !/vật liệu|chất liệu/i.test(chu), chu);
  const ap = qs.find((q) => q.canCu === 'truong-khai-nhom');
  check('van 5/2: trường khai theo nhóm (áp suất làm việc) đứng SAU câu của sổ, gộp câu "áp suất vận hành" của LLM', Boolean(ap) && /[Áá]p suất/.test(ap.questionVi) && ap.llmCungHoi === true && qs.indexOf(ap) > iDong && !kq.nextAction.ghiChuThem.includes(CAU_LLM[1]), ap);
  check('van 5/2: mọi câu có canCu hợp lệ + nguon + trich', qs.every((q) => ['so-tay', 'ranh-gioi-pn6', 'truong-khai-nhom'].includes(q.canCu) && q.nguon && q.trich), qs);
  check('van 5/2: tương thích ngược — mỗi câu vẫn có {attribute, questionVi, whereToFind}', qs.every((q) => 'attribute' in q && q.attribute === null && typeof q.questionVi === 'string' && q.questionVi && typeof q.whereToFind === 'string'), qs);
  check('van 5/2: KHÔNG đổi status / mã / độ tự tin / soTay / dossier / engine', kq.status === out.status && JSON.stringify(kq.results) === JSON.stringify(out.results) && JSON.stringify(kq.soTay) === JSON.stringify(out.soTay) && JSON.stringify(kq.dossier) === JSON.stringify(out.dossier) && JSON.stringify(kq.engine) === JSON.stringify(out.engine) && kq.nextAction.type === 'ASK_USER' && kq.nextAction.howToAnswerVi === out.nextAction.howToAnswerVi);
  check('van 5/2: missing = bản chữ của đúng danh sách câu hỏi', JSON.stringify(kq.missing) === JSON.stringify(qs.map((q) => q.questionVi)), kq.missing);
  check('van 5/2: thống kê đo được (llm.tong=6, sangGhiChu≥3, theoCanCu)', kq.hoiTheoSoTay.nhom === '8481' && kq.hoiTheoSoTay.llm.tong === 6 && kq.hoiTheoSoTay.llm.sangGhiChu >= 3 && kq.hoiTheoSoTay.theoCanCu['so-tay'] >= 1, kq.hoiTheoSoTay);
  const lan2 = await voi('on', () => H.apDung(kq, { rawAttrs: VAN }));
  check('van 5/2: áp dụng lần hai là no-op (lượt chạy lại B1b đi qua hai lần)', lan2 === kq);
  const lai = await voi('on', () => H.apDung(ketQuaSong(), { rawAttrs: VAN }));
  check('van 5/2: tất định — chạy lại cho đúng kết quả cũ', JSON.stringify(lai) === JSON.stringify(kq));
}

// 3) Dữ kiện đã có trong hồ sơ → không hỏi lại.
{
  const raw = { tenHang: `${VAN.tenHang}, đường kính trong cửa nạp 13 mm` };
  const kq = await voi('on', () => H.apDung(ketQuaSong(raw), { rawAttrs: raw }));
  check('đã nêu "đường kính trong cửa nạp 13 mm" → không còn câu đường kính', kq.nextAction.canCuCauHoi === 'so-tay' && !kq.nextAction.questions.some((q) => /[Đđ]ường kính/.test(q.questionVi)), kq.nextAction.questions.map((q) => q.questionVi));
  // keySpecs của vòng 1 cũng là hồ sơ
  const out2 = ketQuaSong();
  out2.dossier.product.keySpecs = [{ k: 'đường kính trong cửa nạp', v: '13 mm' }];
  const kq2 = await voi('on', () => H.apDung(out2, { rawAttrs: VAN }));
  check('product.keySpecs đã có đường kính trong → không hỏi lại', !kq2.nextAction.questions.some((q) => /[Đđ]ường kính/.test(q.questionVi)), kq2.nextAction.questions.map((q) => q.questionVi));
}

// 4) Nhóm ứng viên thứ hai mà sổ tay có phân biệt/loại trừ trỏ tới → câu phân biệt NHÓM, CHỈ khi điều kiện khớp mô tả.
{
  // Mô tả không nhắc gì tới đo / kiểm tra / điều khiển (mô tả van khí nén "dùng điều khiển xi lanh" CÓ chạm vế "điều khiển
  // tự động" của dòng loại trừ 90.26/90.32 — ranh giới thật van điện từ / bộ điều chỉnh tự động — nên không dùng làm ca lạc đề).
  const rawBi = { tenHang: 'Van bi tay gạt inox 304, ren trong DN25' };
  const out = ketQuaGia('848180', rawBi, {}, ['848120']);
  out.dossier.product = { nameVi: 'van bi tay gạt inox' };
  out.dossier.hypotheses.push({ chapter: '90', heading4: '9026', subheading6: '902620', confidence: 30 });
  const kq = await voi('on', () => H.apDung(out, { rawAttrs: rawBi }));
  check('ứng viên thứ hai 9026, mô tả van bi tay gạt (không đo / kiểm tra / điều khiển) → câu phân biệt / loại trừ 84.81–90.26 bị lọc lạc đề', !kq.nextAction.questions.some((q) => q.loai === 'PHAN_BIET_NHOM') && kq.hoiTheoSoTay.boLoc.lacDe >= 1, { qs: kq.nextAction.questions.map((q) => q.loai), boLoc: kq.hoiTheoSoTay.boLoc });
  const rawDo = { tenHang: 'Thiết bị kết hợp van với đồng hồ đo áp suất, gắn trực tiếp trên thân van, dùng cho đường ống khí nén' };
  const out2 = ketQuaGia('848180', rawDo, {}, ['848120']);
  out2.dossier.hypotheses.push({ chapter: '90', heading4: '9026', subheading6: '902620', confidence: 30 });
  const kq2 = await voi('on', () => H.apDung(out2, { rawAttrs: rawDo }));
  const q0 = kq2.nextAction.questions[0];
  check('ca ngược: mô tả "thiết bị kết hợp van với đồng hồ đo… gắn trực tiếp" → câu đầu là phân biệt nhóm theo phanBiet[] của sổ tay 8481 (→ 90.26)', q0.loai === 'PHAN_BIET_NHOM' && q0.canCu === 'so-tay' && /90\.26/.test(q0.questionVi) && q0.nguon && q0.trich, q0);
  check('ca ngược: một cặp nhóm một câu; phân nhóm 6 số đứng thứ hai; tổng ≤ 4', kq2.nextAction.questions.length <= 4 && kq2.nextAction.questions.filter((q) => q.loai === 'PHAN_BIET_NHOM').length === 1 && kq2.nextAction.questions.findIndex((q) => q.loai === 'PHAN_NHOM_6') === 1, kq2.nextAction.questions.map((q) => q.loai));
  const khong = await voi('on', () => H.apDung(ketQuaSong(), { rawAttrs: VAN }));
  check('không có nhóm ứng viên khác → KHÔNG hỏi phanBiet (không hỏi "đầu phun sprinkler" cho cái van)', !khong.nextAction.questions.some((q) => q.loai === 'PHAN_BIET_NHOM'));
}

// 4b) Ca thật 21/11 18:27 (HS_HOI_THEO_SO_TAY=on + HS_TIM_TRUOC=on, MiniMax): động cơ ra 848120 — đúng phân nhóm — nhưng khách
//     bị hỏi lại "phân nhóm nào của 84.81" (4/5 lượt) và "van trượt cho động cơ hơi nước" (2/5 lượt).
{
  const ra120 = (hyp, raw = VAN, alt = []) => { const o = ketQuaGia('848120', raw, {}, alt); o.dossier.hypotheses = hyp; return o; };
  const H120 = { chapter: '84', heading4: '8481', subheading6: '848120', confidence: 80 };
  const H180 = { chapter: '84', heading4: '8481', subheading6: '848180', confidence: 30 };
  const H8412 = { chapter: '84', heading4: '8412', subheading6: '841221', confidence: 15 };
  const coPn = (k) => k.nextAction.questions.some((q) => q.loai === 'PHAN_NHOM_6' || /phân nhóm nào của nhóm 84\.81/.test(q.questionVi));
  const coVanTruot = (k) => k.nextAction.questions.some((q) => /Van trượt cho động cơ hơi nước/.test(q.questionVi));
  const coDuongKinh = (k) => k.nextAction.questions.some((q) => q.loai === 'DONG_8' && /[Đđ]ường kính trong/.test(q.questionVi));
  for (const [ten, hyp] of [['giả thuyết chỉ 8481/848120', [H120]], ['giả thuyết vòng 1 còn ghi 848180 + 8412 (dựng lại đúng lượt thật)', [H120, H180, H8412]]]) {
    const kq = await voi('on', () => H.apDung(ra120(hyp), { rawAttrs: VAN }));
    check(`ra 848120, ${ten}: KHÔNG hỏi phân nhóm 84.81, KHÔNG hỏi van trượt hơi nước, CÓ câu đường kính trong`, !coPn(kq) && !coVanTruot(kq) && coDuongKinh(kq) && kq.nextAction.canCuCauHoi === 'so-tay', kq.nextAction.questions.map((q) => q.questionVi));
    check(`ra 848120, ${ten}: giữ câu tách dòng "Van cổng điều khiển bằng tay…" của sổ ranh giới 848120`, kq.nextAction.questions.some((q) => q.loai === 'DONG_8' && /Van cổng điều khiển bằng tay/.test(q.questionVi)), kq.nextAction.questions.map((q) => q.questionVi));
  }
  const that = await voi('on', () => H.apDung(ra120([H120, H180, H8412]), { rawAttrs: VAN }));
  check('ra 848120 (lượt thật): đếm boLoc — 1 câu phân nhóm bỏ vì đã chốt 6 số, ≥ 1 câu lạc đề', that.hoiTheoSoTay.boLoc.daChot6So === 1 && that.hoiTheoSoTay.boLoc.lacDe >= 1, that.hoiTheoSoTay.boLoc);
  const song = await voi('on', () => H.apDung(ra120([H120], VAN, ['848180']), { rawAttrs: VAN }));
  check('ca ngược: vòng 2 còn giữ 848180 (alternatives) cùng 848120 → VẪN hỏi câu phân nhóm 84.81', coPn(song), song.nextAction.questions.map((q) => q.questionVi));
  const out2 = ra120([H120]); out2.results.push({ hs: '84818099', confidence: 20, source: 'engine-loop:alt' });
  const song2 = await voi('on', () => H.apDung(out2, { rawAttrs: VAN }));
  check('ca ngược: results còn mã 8481.80.99 → VẪN hỏi câu phân nhóm 84.81', coPn(song2), song2.nextAction.questions.map((q) => q.questionVi));
  const rawHoi = { tenHang: 'Van điều khiển hơi nước cho động cơ hơi nước, thân gang' };
  const hoi = await voi('on', () => H.apDung(ra120([H120, H8412], rawHoi), { rawAttrs: rawHoi }));
  check('ca ngược: mô tả có "hơi nước" → VẪN hỏi câu loại trừ "Van trượt cho động cơ hơi nước" (→ 84.12)', coVanTruot(hoi), hoi.nextAction.questions.map((q) => q.questionVi));
  check('khopPhanBiet: "van" trùng tên nhóm 84.81 không đủ; cụm "hơi nước" là phần phân biệt', H.khopPhanBiet('Van trượt cho động cơ hơi nước', VAN.tenHang, '8481', '8412') === null && H.khopPhanBiet('Van trượt cho động cơ hơi nước', rawHoi.tenHang, '8481', '8412')?.phanBiet === 'hoi nuoc');
  check('khopPhanBiet: điều kiện toàn chữ tiêu đề hai nhóm ("Các van điều chỉnh bằng nhiệt", 84.81 / 90.32) chỉ khớp khi mô tả có đủ cả', H.khopPhanBiet('Các van điều chỉnh bằng nhiệt', 'Van điện từ khí nén 5/2', '8481', '9032') === null && Boolean(H.khopPhanBiet('Các van điều chỉnh bằng nhiệt', 'Van điều chỉnh bằng nhiệt cho két nước', '8481', '9032')));
  check('khopPhanBiet: "điều tốc li tâm" không khớp van thuỷ lực "điều khiển bằng tay" (âm tiết lẻ "điều" không đủ)', H.khopPhanBiet('Máy điều tốc li tâm dùng cho động cơ hơi nước', 'Van đóng ngắt dầu thủy lực điều khiển bằng tay', '8481', '8412') === null);
  check('khopPhanBiet: luật khớp gốc của bảng cạnh (khopDieuKien) VẪN khớp câu van trượt với mô tả van khí nén — lý do phải thêm bước phân biệt', Boolean(khopDieuKien(tuKhoa('Van trượt cho động cơ hơi nước'), tapTuMoTa(VAN.tenHang))));
}

// 4c) Bộ lọc bỏ hết câu của sổ → KHÔNG rơi về câu LLM: còn trường khai theo nhóm thì hỏi trường khai.
{
  const raw = { tenHang: 'Công tắc hành trình dùng cho máy công nghiệp' };
  const o = ketQuaGia('853650', raw);
  o.dossier.hypotheses.push({ chapter: '85', heading4: '8504', subheading6: '850440', confidence: 10 });
  const kq = await voi('on', () => H.apDung(o, { rawAttrs: raw }));
  const o0 = ketQuaGia('853650', raw);
  const kq0 = await voi('on', () => H.apDung(o0, { rawAttrs: raw }));
  check('tiền đề: 853650 (lồng nhiều cấp) không ứng viên khác → nhãn "llm"', kq0.nextAction.canCuCauHoi === 'llm', kq0.hoiTheoSoTay);
  check('8536.50 + ứng viên 8504 lạc đề ("Máy biến áp"): câu bị lọc, còn trường khai → nhãn "truong-khai-nhom", không giữ câu LLM', kq.nextAction.canCuCauHoi === 'truong-khai-nhom' && kq.hoiTheoSoTay.lyDo === 'loc-het-cau-so' && kq.hoiTheoSoTay.boLoc.lacDe >= 1 && kq.nextAction.questions.length > 0 && kq.nextAction.questions.every((q) => q.canCu === 'truong-khai-nhom') && kq.nextAction.ghiChuThem.includes(CAU_LLM[0]), { cc: kq.nextAction.canCuCauHoi, st: kq.hoiTheoSoTay, qs: kq.nextAction.questions.map((q) => q.questionVi) });
}

// 5) Động cơ mới dừng ở NHÓM 4 số → vẫn hỏi phân nhóm 6 số trước.
{
  const kq = await voi('on', () => H.apDung(ketQuaGia('8481'), { rawAttrs: VAN }));
  check('dừng ở 4 số: câu đầu là phân nhóm 6 số; có câu dòng của 848120 (phân nhóm khớp mô tả)', kq.nextAction.canCuCauHoi === 'so-tay' && kq.nextAction.questions[0].loai === 'PHAN_NHOM_6' && kq.nextAction.questions.some((q) => q.loai === 'DONG_8' && q.phanNhom.includes('848120')), kq.nextAction.questions.map((q) => [q.loai, q.phanNhom]));
}

// 6) Rơi về câu LLM (giữ nguyên hành vi cũ) + đánh dấu để đo.
{
  const out = ketQuaGia('999900');
  const kq = await voi('on', () => H.apDung(out, { rawAttrs: VAN }));
  check('nhóm chưa có sổ tay → câu hỏi GIỮ NGUYÊN, canCuCauHoi "llm", lý do ghi rõ', kq.nextAction.canCuCauHoi === 'llm' && JSON.stringify(kq.nextAction.questions) === JSON.stringify(out.nextAction.questions) && JSON.stringify(kq.missing) === JSON.stringify(out.missing) && kq.hoiTheoSoTay.lyDo === 'nhom-chua-co-so-tay' && !('ghiChuThem' in kq.nextAction), kq.hoiTheoSoTay);
  const out8 = ketQuaGia('84818099');
  out8.results[0].duKien = false;
  const kq8 = await voi('on', () => H.apDung(out8, { rawAttrs: VAN }));
  check('mã 8 số đã chốt mà vẫn hỏi → không dựng lại (canCuCauHoi "llm", lyDo ma-8-so)', kq8.nextAction.canCuCauHoi === 'llm' && kq8.hoiTheoSoTay.lyDo === 'ma-8-so' && JSON.stringify(kq8.nextAction.questions) === JSON.stringify(out8.nextAction.questions));
  const review = { status: 'REVIEW', nextAction: { type: 'USER_CONFIRM', optionsHs: ['84818099'] }, results: [{ hs: '84818099' }] };
  check('không phải lượt hỏi (REVIEW) → trả đúng đối tượng cũ', (await voi('on', () => H.apDung(review, { rawAttrs: VAN }))) === review);
  check('đầu vào rỗng → không ném lỗi', (await voi('on', () => H.apDung(null, {}))) === null);
}

// 6b) PR tiếp: nhãn "khong-can-hoi-dong", câu có/không cho dòng tên loại, đường lùi chọn dòng theo chữ biểu thuế.
{
  const gia = (hs, ten) => { const o = ketQuaGia(hs, { tenHang: ten }); o.dossier.product = {}; o.nextAction.questions = [{ attribute: null, questionVi: 'Điện áp cuộn dây?', whereToFind: 'x' }, { attribute: null, questionVi: 'Hãng sản xuất?', whereToFind: 'x' }]; o.missing = ['Điện áp cuộn dây?', 'Hãng sản xuất?']; return o; };
  const chay = (hs, ten) => voi('on', () => H.apDung(gia(hs, ten), { rawAttrs: { tenHang: ten } }));
  // (1) phân nhóm chỉ có MỘT dòng 8 số (3926.10.00), không có câu phân nhóm để hỏi → không phải "rơi về LLM"
  check('tiền đề: 392610 chỉ có 1 dòng 8 số; 830140 phẳng 3 dòng; 853650 lồng nhiều cấp', H.dong8Cua('392610').n8 === 1 && H.dong8Cua('830140').n8 === 3 && H.dong8Cua('830140').phang && !H.dong8Cua('853650').phang, [H.dong8Cua('392610'), H.dong8Cua('830140').n8, H.dong8Cua('853650').phang]);
  const mot = await chay('392610', 'kẹp giấy nhựa');
  check('1 dòng 8 số: canCuCauHoi "khong-can-hoi-dong" (lyDo mot-dong), không còn câu LLM trong câu hỏi', mot.nextAction.canCuCauHoi === 'khong-can-hoi-dong' && mot.hoiTheoSoTay.lyDo === 'mot-dong' && mot.nextAction.questions.length >= 1 && mot.nextAction.questions.every((q) => q.canCu === 'truong-khai-nhom') && mot.nextAction.ghiChuThem.includes('Điện áp cuộn dây?'), { na: mot.nextAction, st: mot.hoiTheoSoTay });
  const motRong = gia('392610', 'kẹp giấy nhựa'); motRong.missingStructured = [];
  const kqRong = await voi('on', () => H.apDung(motRong, { rawAttrs: { tenHang: 'kẹp giấy nhựa' } }));
  check('1 dòng 8 số + không thiếu trường khai nào: KHÔNG trả ASK_USER rỗng — giữ câu LLM, nhãn vẫn "khong-can-hoi-dong"', kqRong.nextAction.canCuCauHoi === 'khong-can-hoi-dong' && kqRong.hoiTheoSoTay.giuCauLlm === true && JSON.stringify(kqRong.nextAction.questions) === JSON.stringify(motRong.nextAction.questions), kqRong.nextAction);
  // (2) dữ kiện TÊN LOẠI chỉ ở MỘT dòng vẫn hỏi được: Có → dòng đó, Không → phần còn lại
  const khoa = await chay('830140', 'ổ khoá');
  const qKhoa = khoa.nextAction.questions.filter((q) => q.loai === 'DONG_8');
  check('8301.40 (sổ DUYET, tên loại mỗi dòng một kiểu): hỏi "Hàng có phải là …" cho Còng/xích tay và Khóa cửa', khoa.nextAction.canCuCauHoi === 'so-tay' && qKhoa.length === 2 && /Còng, xích tay/.test(qKhoa[0].questionVi) && /8301\.40\.10/.test(qKhoa[0].questionVi) && /Khóa cửa/.test(qKhoa[1].questionVi) && qKhoa.every((q) => q.canCu === 'ranh-gioi-pn6' && /^tax\.830140/.test(q.nguon) && q.options.includes('Chưa rõ') && /Không → các dòng còn lại/.test(q.questionVi)), khoa.nextAction.questions);
  const cua = await chay('830140', 'Khóa cửa tay gạt bằng hợp kim kẽm');
  check('8301.40: mô tả đã ghi "Khóa cửa" → máy tự chốt dòng, không hỏi lại "có phải khóa cửa"', !cua.nextAction.questions.some((q) => /có phải là "Khóa cửa"/.test(q.questionVi)), { cc: cua.nextAction.canCuCauHoi, st: cua.hoiTheoSoTay, qs: cua.nextAction.questions.map((q) => q.questionVi) });
  // (3) đường lùi: sổ ranh giới chưa DUYET, phân nhóm phẳng ≤ 6 dòng → MỘT câu chọn dòng theo chữ biểu thuế
  // KHÔNG khoá vào một sổ cụ thể: trạng thái duyệt của sổ ranh giới là dữ liệu SỐNG (22/11: #1531 duyệt 902620 làm ca cũ đỏ
  // trên chính main). Tự chọn lúc chạy một phân nhóm phẳng 2–6 dòng, có đúng một dòng "Loại khác" trần, sổ chưa DUYET.
  // Kho không còn phân nhóm nào như vậy ⇒ BỎ QUA có lý do. Còn ứng viên mà không ứng viên nào ra đường lùi ⇒ ĐỎ (lõi hỏng).
  const laLoaiKhacTran = (t) => /^lo[aạ]i kh[aá]c\s*(\(SEN\))?$/i.test(String(t || '').trim());
  const ungVienLui = [...new Set(Object.keys(require('../lib/data').taxData).filter((c) => /^\d{8}$/.test(c)).map((c) => c.slice(0, 6)))].sort().filter((pn6) => {
    if (loadRanhGioiDuyet(pn6) !== null) return false;
    const d = H.dong8Cua(pn6);
    return d.phang && d.n8 >= 2 && d.n8 <= 6 && d.dong.filter((x) => laLoaiKhacTran(x.tenVi)).length === 1 && d.dong.every((x) => x.tenVi);
  });
  let ap = null; let pnLui = null;
  for (const pn6 of ungVienLui.slice(0, 40)) {
    const k = await chay(pn6, 'hàng thử nghiệm');
    if (k.nextAction.canCuCauHoi === 'bieu-thue' && k.nextAction.questions[0] && k.nextAction.questions[0].loai === 'CHON_DONG_8') { ap = k; pnLui = pn6; break; }
  }
  if (!ungVienLui.length) {
    console.log('SKIP đường lùi "bieu-thue": kho không còn phân nhóm phẳng 2–6 dòng nào có sổ ranh giới chưa DUYET — không có dữ liệu thật để thử (không phải lỗi)');
  } else {
    check(`đường lùi: trong ${Math.min(40, ungVienLui.length)} phân nhóm phẳng sổ chưa DUYET (tự chọn lúc chạy, kho có ${ungVienLui.length}) có ít nhất một ra câu chọn dòng canCu "bieu-thue"`, Boolean(ap), ungVienLui.slice(0, 5));
  }
  if (ap) {
    const qAp = ap.nextAction.questions[0];
    const dong = H.dong8Cua(pnLui).dong;
    const cham = (hs) => `${hs.slice(0, 4)}.${hs.slice(4, 6)}.${hs.slice(6)}`;
    const lk = dong.find((x) => laLoaiKhacTran(x.tenVi));
    check(`${pnLui} (sổ chưa DUYET, ${dong.length} dòng phẳng): một câu chọn dòng, canCu "bieu-thue", nguồn + trích đủ mọi dòng của biểu thuế`, qAp.canCu === 'bieu-thue' && ap.nextAction.questions.filter((q) => q.loai === 'CHON_DONG_8').length === 1 && qAp.nguon.split('|').sort().join('|') === dong.map((x) => `tax.${x.hs}`).sort().join('|') && dong.every((x) => qAp.trich.includes(`${x.hs} ${x.tenVi}`)), qAp);
    check(`${pnLui}: "Loại khác" đặt CUỐI, ghi "không thuộc các loại trên"; có lựa chọn "Chưa rõ"`, qAp.options.length === dong.length + 1 && qAp.options.at(-2) === `${cham(lk.hs)} – Loại khác (không thuộc các loại trên)` && qAp.options.at(-1) === 'Chưa rõ' && ap.nextAction.questions.length <= 4, qAp.options);
  }
  const mach = await chay('853400', 'bo mạch');
  check('8534.00 (≥ 3 dòng tên loại, phẳng 4 dòng): một câu chọn dòng thay cho ba câu có/không', mach.nextAction.questions.filter((q) => q.loai === 'CHON_DONG_8').length === 1 && !mach.nextAction.questions.some((q) => q.loai === 'DONG_8') && /Loại khác \(không thuộc các loại trên\)$/.test(mach.nextAction.questions[0].options.at(-2)), mach.nextAction.questions.map((q) => [q.loai, q.options]));
  const ct = gia('853650', 'công tắc');
  const kqCt = await voi('on', () => H.apDung(ct, { rawAttrs: { tenHang: 'công tắc' } }));
  check('8536.50 (lồng nhiều cấp gạch, 12 dòng): KHÔNG liệt kê — giữ câu LLM, nhãn "llm"', kqCt.nextAction.canCuCauHoi === 'llm' && kqCt.hoiTheoSoTay.lyDo === 'long-nhieu-cap' && JSON.stringify(kqCt.nextAction.questions) === JSON.stringify(ct.nextAction.questions), kqCt.hoiTheoSoTay);
  check('mọi ca trên: tối đa 4 câu, status/mã không đổi', [mot, khoa, ap, mach, kqCt].filter(Boolean).every((k) => k.nextAction.questions.length <= 4 && k.status === 'NEED_FACTS' && k.results[0].confidence === 60));
}

// 7) Qua ĐỘNG CƠ thật (LLM giả): nhánh earlyExitHoi — bật/tắt công tắc cho CÙNG mã, cùng status, cùng số lời LLM.
{
  const R1 = {
    product: { nameVi: 'van điện từ khí nén 5/2', nameEn: '5/2 pneumatic solenoid valve', purpose: 'điều khiển xi lanh khí nén', mechanism: 'điện từ', material: 'nhôm', form: 'hoàn chỉnh', evidence: {} },
    hypotheses: [{ chapter: '84', heading4: '8481', subheading6: '848120', why: 'van truyền động khí nén', confidence: 80 }, { chapter: '84', heading4: '8481', subheading6: '848180', why: 'van khác', confidence: 30 }, { chapter: '84', heading4: '8412', subheading6: '841221', why: 'xi lanh', confidence: 15 }],
    verify: { searchVi: ['van điện từ khí nén'], codes8: ['84812090'], unknowns: CAU_LLM },
  };
  const chay = async (co) => voi(co, async () => {
    script = [JSON.parse(JSON.stringify(R1)), { decision: 'HOI', hs: '848120', confidence: 55, reason: 'thiếu dữ kiện', basis: [], conditions: [], alternatives: [], questions: CAU_LLM.map((q) => ({ fact: q, question: q, whereToFind: 'catalogue' })) }];
    llmCalls = 0;
    process.env.HS_SO_TAY = 'full';
    try { return { out: await classifyLoop({ ...VAN }, {}), llm: llmCalls }; } finally { delete process.env.HS_SO_TAY; }
  });
  const tat = await chay(null);
  const bat = await chay('on');
  const gon = (o) => JSON.stringify({ s: o.status, r: (o.results || []).map((r) => [r.hs, r.confidence, r.hsLevel]), d: o.dossier?.decision, st: o.soTay?.outcome, ms: o.missingStructured, g: (o.engine?.gates || []).map((g) => [g.round, g.hs, g.earlyExitHoi, g.decision]) });
  check('động cơ: lượt TẮT là NEED_FACTS/ASK_USER với câu của LLM, không có trường mới', tat.out.status === 'NEED_FACTS' && tat.out.nextAction?.type === 'ASK_USER' && !('canCuCauHoi' in tat.out.nextAction) && !('ghiChuThem' in tat.out.nextAction) && !('hoiTheoSoTay' in tat.out) && tat.out.nextAction.questions.some((q) => /Điện áp cuộn dây/.test(q.questionVi)), { s: tat.out.status, na: tat.out.nextAction });
  check('động cơ: BẬT không đổi status / mã / độ tự tin / quyết định / nhật ký cổng', gon(tat.out) === gon(bat.out), `${gon(tat.out)}\n${gon(bat.out)}`);
  check('động cơ: BẬT không thêm lượt LLM', tat.llm === bat.llm && bat.llm >= 1, { tat: tat.llm, bat: bat.llm });
  const qs = bat.out.nextAction?.questions || [];
  check('động cơ (dựng lại lượt thật 21/11 18:27, ra 848120): BẬT → câu theo sổ, không hỏi phân nhóm 84.81, không hỏi van trượt hơi nước, có đường kính trong, không còn "điện áp cuộn dây"', bat.out.results?.[0]?.hs === '848120' && bat.out.nextAction?.canCuCauHoi === 'so-tay' && !qs.some((q) => q.loai === 'PHAN_NHOM_6' || q.loai === 'PHAN_BIET_NHOM') && qs.some((q) => /[Đđ]ường kính trong/.test(q.questionVi)) && !qs.some((q) => /điện áp cuộn dây|Van trượt/i.test(q.questionVi)) && qs.length <= 4, { hs: bat.out.results?.[0]?.hs, cc: bat.out.nextAction?.canCuCauHoi, qs: qs.map((q) => q.questionVi), ly: bat.out.hoiTheoSoTay });
}

// 8) OZV-2037: ca khách thực địa «bộ tản nhiệt, model 65k-50l, chất liệu hợp kim» (dừng 870891, ứng viên 8708 / 8419 / 7604)
//    sinh đủ câu phân biệt nhóm 4 số có căn cứ chú giải (87.08 ↔ 84.19 và 76.04 ↔ 87.08) + câu dòng 8 số 870891, kèm ca ngược.
{
  const moTa = 'bộ tản nhiệt, model 65k-50l, chất liệu hợp kim';
  const out65k = {
    status: 'NEED_FACTS',
    results: [{ hs: '870891', confidence: 45, hsLevel: 6 }],
    nextAction: {
      type: 'ASK_USER',
      questions: [
        { attribute: null, questionVi: 'Hàng được lắp cho xe cơ giới, máy công nghiệp hay thiết bị sưởi/làm mát cụ thể' },
        { attribute: null, questionVi: 'Hàng là bộ phận/linh kiện của máy khác hay là hàng hoàn chỉnh?' },
      ],
    },
    dossier: {
      product: { nameVi: 'Bộ tản nhiệt', material: 'hợp kim', model: '65K-50L' },
      hypotheses: [
        { chapter: '87', heading4: '8708', subheading6: '870891', confidence: 45 },
        { chapter: '84', heading4: '8419', subheading6: '841950', confidence: 35 },
        { chapter: '76', heading4: '7604', subheading6: '760429', confidence: 15 },
      ],
    },
    missingStructured: [],
  };
  const kq65k = await voi('on', () => H.apDung(out65k, { rawAttrs: { tenHang: moTa } }));
  const qs65k = kq65k.nextAction?.questions || [];
  const pb65k = qs65k.filter((q) => q.loai === 'PHAN_BIET_NHOM');
  check('OZV-2037 (thuận): bộ tản nhiệt 65k-50l dừng 870891 → có 2 câu PHAN_BIET_NHOM (87.08↔84.19 và 76.04↔87.08) + 1 câu DONG_8 có đủ canCu/nguon/trich',
    kq65k.nextAction?.canCuCauHoi === 'so-tay'
    && pb65k.length === 2
    && pb65k.some((q) => q.canCu === 'so-tay' && q.nguon === 'phan87.phan' && /84\.19/.test(q.questionVi))
    && pb65k.some((q) => q.canCu === 'so-tay' && q.nguon === 'phan76.phan' && /76\.04/.test(q.questionVi))
    && qs65k.some((q) => q.loai === 'DONG_8' && q.canCu === 'ranh-gioi-pn6' && q.nguon === 'tieuDe.870891'),
    qs65k);

  const pbNguoc = H.cauPhanBietNhom('8708', ['8708', '8419', '7604'], 'má phanh đĩa trước dùng cho xe ô tô con');
  check('OZV-2037 (ngược): mô tả "má phanh đĩa trước" không chạm "bộ tản nhiệt" → không hỏi oan câu phân biệt bộ tản nhiệt',
    !pbNguoc.some((q) => /Bộ tản nhiệt/i.test(q.questionVi)),
    pbNguoc);
}

// 9) OZV-2072: headingHints 8419/8708/7604 cho «bộ tản nhiệt» — đẩy 84195020 lên top-1 khi có «hợp kim nhôm»
{
  const { expandSearchQuery } = require('../lib/search-query-expand.js');
  const { searchCandidates } = require('../lib/search-utils.js');
  const moTaNhieu = 'bộ tản nhiệt, model 65k-50l, chất liệu hợp kim nhôm';
  const hints = expandSearchQuery(moTaNhieu).headingHints || [];
  check('OZV-2072: expandSearchQuery(bộ tản nhiệt… hợp kim nhôm).headingHints có 8419, 8708, 7604',
    hints.includes('8419') && hints.includes('8708') && hints.includes('7604'),
    hints);
  const top10 = searchCandidates(moTaNhieu, { topCandidates: 10 }).map((c) => c.hsCode);
  check('OZV-2072: searchCandidates top-1 = 84195020 và top-10 có cả nhóm 8419 lẫn 7604',
    top10[0] === '84195020'
    && top10.some((hs) => String(hs).startsWith('8419'))
    && top10.some((hs) => String(hs).startsWith('7604')),
    top10);
}

// 10) OZV-2090: cạnh loại trừ 2 chiều 90.26 ↔ 90.30 cho câu thực địa «đồng hồ đo áp, đo dòng, chống mất pha , 3pha -380v»
{
  const moTa = 'đồng hồ đo áp, đo dòng, chống mất pha , 3pha -380v';
  const pb9030 = H.cauPhanBietNhom('9030', ['9030', '9026'], moTa);
  check('OZV-2090 (thuận 9030 → 9026): 9030 đứng đầu với [9030, 9026] sinh câu PHAN_BIET_NHOM từ nhom9030.nhom sang 90.26',
    pb9030.length === 1
    && pb9030[0].loai === 'PHAN_BIET_NHOM'
    && pb9030[0].canCu === 'so-tay'
    && pb9030[0].nguon === 'nhom9030.nhom'
    && /90\.26/.test(pb9030[0].questionVi)
    && /90\.30/.test(pb9030[0].questionVi)
    && Boolean(pb9030[0].trich),
    pb9030);

  const pb9026 = H.cauPhanBietNhom('9026', ['9026', '9030'], moTa);
  check('OZV-2090 (thuận 9026 → 9030): 9026 đứng đầu với [9026, 9030] sinh câu PHAN_BIET_NHOM từ nhom9026.nhom sang 90.30',
    pb9026.length === 1
    && pb9026[0].loai === 'PHAN_BIET_NHOM'
    && pb9026[0].canCu === 'so-tay'
    && pb9026[0].nguon === 'nhom9026.nhom'
    && /90\.30/.test(pb9026[0].questionVi)
    && /90\.26/.test(pb9026[0].questionVi)
    && Boolean(pb9026[0].trich),
    pb9026);

  const doi1 = 'máy hiện sóng số 100MHz';
  const doi2 = 'cảm biến đo mức nước siêu âm';
  const kqDoi1 = [...H.cauPhanBietNhom('9030', ['9030', '9026'], doi1), ...H.cauPhanBietNhom('9026', ['9026', '9030'], doi1)];
  const kqDoi2 = [...H.cauPhanBietNhom('9026', ['9026', '9030'], doi2), ...H.cauPhanBietNhom('9030', ['9030', '9026'], doi2)];
  check('OZV-2090 (đối chứng): "máy hiện sóng số 100MHz" và "cảm biến đo mức nước siêu âm" không hỏi oan 90.26 ↔ 90.30',
    kqDoi1.length === 0 && kqDoi2.length === 0,
    { kqDoi1, kqDoi2 });
}

// 11) OZV-2108: cạnh loại trừ 2 chiều 84.77 ↔ 84.22 cho ca 10 tầng 4 số «Máy đúc thổi túi cột khí / None / Thổi khí nén vào túi tạo xốp cột khí»
{
  const moTa = 'Máy đúc thổi túi cột khí / None / Thổi khí nén vào túi tạo xốp cột khí';
  const pb8477 = H.cauPhanBietNhom('8477', ['8477', '8422'], moTa);
  check('OZV-2108 (thuận 8477 → 8422): 8477 đứng đầu với [8477, 8422] sinh câu PHAN_BIET_NHOM từ nhom8477.nhom sang 84.22',
    pb8477.length === 1
    && pb8477[0].loai === 'PHAN_BIET_NHOM'
    && pb8477[0].canCu === 'so-tay'
    && pb8477[0].nguon === 'nhom8477.nhom'
    && /84\.22/.test(pb8477[0].questionVi)
    && /84\.77/.test(pb8477[0].questionVi)
    && Boolean(pb8477[0].trich),
    pb8477);

  const pb8422 = H.cauPhanBietNhom('8422', ['8422', '8477'], moTa);
  check('OZV-2108 (thuận 8422 → 8477): 8422 đứng đầu với [8422, 8477] sinh câu PHAN_BIET_NHOM từ nhom8422.nhom sang 84.77',
    pb8422.length === 1
    && pb8422[0].loai === 'PHAN_BIET_NHOM'
    && pb8422[0].canCu === 'so-tay'
    && pb8422[0].nguon === 'nhom8422.nhom'
    && /84\.77/.test(pb8422[0].questionVi)
    && /84\.22/.test(pb8422[0].questionVi)
    && Boolean(pb8422[0].trich),
    pb8422);

  const doi1 = 'máy rửa bát đĩa dùng trong gia đình';
  const doi2 = 'máy làm sạch hoặc làm khô chai lọ thủy tinh';
  const kqDoi1 = [...H.cauPhanBietNhom('8477', ['8477', '8422'], doi1), ...H.cauPhanBietNhom('8422', ['8422', '8477'], doi1)];
  const kqDoi2 = [...H.cauPhanBietNhom('8422', ['8422', '8477'], doi2), ...H.cauPhanBietNhom('8477', ['8477', '8422'], doi2)];
  check('OZV-2108 (đối chứng): "máy rửa bát đĩa dùng trong gia đình" và "máy làm sạch hoặc làm khô chai lọ thủy tinh" không hỏi oan 84.77 ↔ 84.22',
    kqDoi1.length === 0 && kqDoi2.length === 0,
    { kqDoi1, kqDoi2 });
}


// 12) OZV-2115 — cạnh loại trừ 2 chiều 73.18 <-> 83.02 cho ca 130 tầng 4 số «Ốc thăng bằng / thép không gỉ / None»
{
  const S = require('../lib/so-tay.js');
  const D = require('../lib/do-thi/index.js');
  const qOc = 'Ốc thăng bằng / thép không gỉ / None';
  // test-isolate tạo data/so-tay/ chỉ với 9026/8536 → dataReadPath('so-tay') trỏ tmp;
  // docSoTay() chỉ thấy các tệp trong tmp. Chép 7318/8302 vào isolate rồi dựng lại bảng cạnh.
  for (const nh of ['7318', '8302']) {
    fs.copyFileSync(path.join('data/so-tay', `${nh}.json`), path.join(TEST_DATA_DIR, 'so-tay', `${nh}.json`));
  }
  D.datLai();

  const st7318 = loadSoTay('7318');
  const st8302 = loadSoTay('8302');
  const lt7318 = (st7318?.loaiTru || []).find((x) => x.sangNhom === '8302');
  const lt8302 = (st8302?.loaiTru || []).find((x) => x.sangNhom === '7318');
  check('OZV-2115 (căn cứ): sổ tay 7318 và 8302 có loaiTru 2 chiều kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(
      lt7318 &&
        lt7318.canCuLoaiTru?.nguon === 'nhom8302.nhom' &&
        S.checkItem('loaiTru', lt7318, S.sourcesFor('7318'), '7318') === null
    ) &&
      Boolean(
        lt8302 &&
          lt8302.canCuLoaiTru?.nguon === 'nhom7318.nhom' &&
          S.checkItem('loaiTru', lt8302, S.sourcesFor('8302'), '8302') === null
      ),
    { lt7318, lt8302 });

  const c5Tu7318 = D.canhTu('7318', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '8302');
  const c5Tu8302 = D.canhTu('8302', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '7318');
  const mrTu7318 = D.moRongUngVien(['7318'], qOc);
  const mrTu8302 = D.moRongUngVien(['8302'], qOc);
  check('OZV-2115 (đồ thị 2 chiều): bảng cạnh C5 7318↔8302 và moRongUngVien kéo 2 chiều cho ca 130',
    c5Tu7318.length >= 1 &&
      c5Tu8302.length >= 1 &&
      mrTu7318.some((x) => x.nhom === '8302') &&
      mrTu8302.some((x) => x.nhom === '7318'),
    { c5Tu7318: c5Tu7318.length, c5Tu8302: c5Tu8302.length, mrTu7318, mrTu8302 });

  const pb7318 = H.cauPhanBietNhom('7318', ['7318', '8302'], qOc);
  check('OZV-2115 (thuận 7318 → 8302): 7318 đứng đầu với [7318, 8302] sinh câu PHAN_BIET_NHOM từ phan73.phan sang 83.02',
    pb7318.length === 1
    && pb7318[0].loai === 'PHAN_BIET_NHOM'
    && pb7318[0].canCu === 'so-tay'
    && pb7318[0].nguon === 'phan73.phan'
    && /83\.02/.test(pb7318[0].questionVi)
    && /73\.18/.test(pb7318[0].questionVi),
    pb7318);

  const pb8302 = H.cauPhanBietNhom('8302', ['8302', '7318'], qOc);
  check('OZV-2115 (thuận 8302 → 7318): 8302 đứng đầu với [8302, 7318] sinh câu PHAN_BIET_NHOM từ ch83.chuong sang 73.18',
    pb8302.length === 1
    && pb8302[0].loai === 'PHAN_BIET_NHOM'
    && pb8302[0].canCu === 'so-tay'
    && pb8302[0].nguon === 'ch83.chuong'
    && /73\.18/.test(pb8302[0].questionVi)
    && /83\.02/.test(pb8302[0].questionVi),
    pb8302);

  const dcBanLe7318 = H.cauPhanBietNhom('7318', ['7318', '8302'], 'Bản lề cửa gỗ bằng thép');
  const dcBanLe8302 = H.cauPhanBietNhom('8302', ['8302', '7318'], 'Bản lề cửa gỗ bằng thép');
  const dcBuLong7318 = H.cauPhanBietNhom('7318', ['7318', '8302'], 'Bu lông M8 bằng thép không gỉ dùng bắt mặt bích');
  const dcBuLong8302 = H.cauPhanBietNhom('8302', ['8302', '7318'], 'Bu lông M8 bằng thép không gỉ dùng bắt mặt bích');
  const dcThanhTreo7318 = H.cauPhanBietNhom('7318', ['7318', '8302'], 'Thanh treo rèm cửa bằng thép');
  const dcThanhTreo8302 = H.cauPhanBietNhom('8302', ['8302', '7318'], 'Thanh treo rèm cửa bằng thép');
  check('OZV-2115 (đối chứng): bản lề cửa, bu lông M8 và thanh treo rèm không hỏi oan 73.18 ↔ 83.02',
    dcBanLe7318.length === 0 &&
      dcBanLe8302.length === 0 &&
      dcBuLong7318.length === 0 &&
      dcBuLong8302.length === 0 &&
      dcThanhTreo7318.length === 0 &&
      dcThanhTreo8302.length === 0 &&
      !D.moRongUngVien(['7318'], 'Bản lề cửa gỗ bằng thép').some((x) => x.nhom === '8302') &&
      !D.moRongUngVien(['8302'], 'Bu lông M8 bằng thép không gỉ dùng bắt mặt bích').some((x) => x.nhom === '7318'),
    { dcBanLe7318, dcBanLe8302, dcBuLong7318, dcBuLong8302, dcThanhTreo7318, dcThanhTreo8302 });
}

// 13) OZV-2142 — cạnh loại trừ 2 chiều 61.03 <-> 61.11 cho ca 176 tầng 4 số «Bộ quần áo trẻ em / dệt kim cotton 90%, polyester 5% / None»
{
  const S = require('../lib/so-tay.js');
  const D = require('../lib/do-thi/index.js');
  const { phanTichHoiTruoc4So, TRANG_THAI_4SO } = require('../lib/do-thi/hoi-truoc-4so.js');
  const q176 = 'Bộ quần áo trẻ em / dệt kim cotton 90%, polyester 5% / None';
  for (const nh of ['6103', '6104', '6111']) {
    fs.copyFileSync(path.join('data/so-tay', `${nh}.json`), path.join(TEST_DATA_DIR, 'so-tay', `${nh}.json`));
  }
  D.datLai();

  const st6103 = loadSoTay('6103');
  const st6111 = loadSoTay('6111');
  const lt6103 = (st6103?.loaiTru || []).find((x) => x.sangNhom === '6111');
  const lt6111 = (st6111?.loaiTru || []).find((x) => x.sangNhom === '6103');
  check('OZV-2142 (căn cứ): sổ tay 6103 và 6111 có loaiTru 2 chiều kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(
      lt6103 &&
        lt6103.nguon === 'ch61.chuong' &&
        lt6103.canCuLoaiTru?.nguon === 'nhom6111.nhom' &&
        S.checkItem('loaiTru', lt6103, S.sourcesFor('6103'), '6103') === null
    ) &&
      Boolean(
        lt6111 &&
          lt6111.nguon === 'nhom6111.nhom' &&
          lt6111.canCuLoaiTru?.nguon === 'nhom6103.nhom' &&
          S.checkItem('loaiTru', lt6111, S.sourcesFor('6111'), '6111') === null
      ) &&
      lt6103.dieuKien !== lt6111.dieuKien,
    { lt6103, lt6111 });

  const c5Tu6103 = D.canhTu('6103', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '6111');
  const c5Tu6111 = D.canhTu('6111', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '6103');
  const mrTu6103 = D.moRongUngVien(['6103'], q176);
  const mrTu6111 = D.moRongUngVien(['6111'], q176);
  check('OZV-2142 (đồ thị 2 chiều): bảng cạnh C5 6103↔6111 và moRongUngVien kéo 2 chiều cho ca 176',
    c5Tu6103.length >= 1 &&
      c5Tu6111.length >= 1 &&
      mrTu6103.some((x) => x.nhom === '6111') &&
      mrTu6111.some((x) => x.nhom === '6103'),
    { c5Tu6103: c5Tu6103.length, c5Tu6111: c5Tu6111.length, mrTu6103, mrTu6111 });

  const ht2 = phanTichHoiTruoc4So({ moTa: q176, ungVien: ['6103', '6111'] });
  const ht3 = phanTichHoiTruoc4So({ moTa: q176, ungVien: ['6103', '6104', '6111'] });
  check('OZV-2142 (phanTichHoiTruoc4So): tách đủ nhánh điều kiện theo cạnh C5 cho [6103, 6111] và [6103, 6104, 6111] trên ca 176',
    ht2.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC &&
      (ht2.nhanh || []).every((n) => String(n.nguon || '').startsWith('do-thi:C5:')) &&
      new Set((ht2.nhanh || []).map((n) => n.dieuKien)).size === 2 &&
      Boolean(ht2.dapAnDieuKien && ht2.dapAnDieuKien.includes('→ nhóm 6103 (') && ht2.dapAnDieuKien.includes('→ nhóm 6111 (')) &&
      ht3.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC &&
      new Set((ht3.nhanh || []).map((n) => n.dieuKien)).size === 3 &&
      ['6103', '6104', '6111'].every((h) => ht3.dapAnDieuKien?.includes(`→ nhóm ${h} (`)),
    { ht2: ht2.dapAnDieuKien, ht3: ht3.dapAnDieuKien });

  const pb6103 = H.cauPhanBietNhom('6103', ['6103', '6111'], q176);
  check('OZV-2142 (thuận 6103 → 6111): 6103 đứng đầu với [6103, 6111] sinh câu PHAN_BIET_NHOM từ ch61.chuong sang 61.11',
    pb6103.length === 1 &&
      pb6103[0].loai === 'PHAN_BIET_NHOM' &&
      pb6103[0].canCu === 'so-tay' &&
      pb6103[0].nguon === 'ch61.chuong' &&
      /61\.11/.test(pb6103[0].questionVi) &&
      /61\.03/.test(pb6103[0].questionVi),
    pb6103);

  const pb6111 = H.cauPhanBietNhom('6111', ['6111', '6103'], q176);
  check('OZV-2142 (thuận 6111 → 6103): 6111 đứng đầu với [6111, 6103] sinh câu PHAN_BIET_NHOM từ nhom6111.nhom sang 61.03',
    pb6111.length === 1 &&
      pb6111[0].loai === 'PHAN_BIET_NHOM' &&
      pb6111[0].canCu === 'so-tay' &&
      pb6111[0].nguon === 'nhom6111.nhom' &&
      /61\.03/.test(pb6111[0].questionVi) &&
      /61\.11/.test(pb6111[0].questionVi),
    pb6111);

  const dcQuanDai6103 = H.cauPhanBietNhom('6103', ['6103', '6111'], 'Quần dài nam dệt kim từ bông');
  const dcQuanDai6111 = H.cauPhanBietNhom('6111', ['6111', '6103'], 'Quần dài nam dệt kim từ bông');
  const dcJacket6103 = H.cauPhanBietNhom('6103', ['6103', '6111'], 'Áo jacket nam dệt kim từ lông cừu');
  const dcJacket6111 = H.cauPhanBietNhom('6111', ['6111', '6103'], 'Áo jacket nam dệt kim từ lông cừu');
  const dcGangTay6103 = H.cauPhanBietNhom('6103', ['6103', '6111'], 'Găng tay trẻ sơ sinh dệt kim từ bông');
  const dcGangTay6111 = H.cauPhanBietNhom('6111', ['6111', '6103'], 'Găng tay trẻ sơ sinh dệt kim từ bông');
  check('OZV-2142 (đối chứng): quần dài nam, áo jacket nam và găng tay trẻ sơ sinh không hỏi oan 61.03 ↔ 61.11',
    dcQuanDai6103.length === 0 &&
      dcQuanDai6111.length === 0 &&
      dcJacket6103.length === 0 &&
      dcJacket6111.length === 0 &&
      dcGangTay6103.length === 0 &&
      dcGangTay6111.length === 0 &&
      !D.moRongUngVien(['6103'], 'Quần dài nam dệt kim từ bông').some((x) => x.nhom === '6111') &&
      !D.moRongUngVien(['6111'], 'Găng tay trẻ sơ sinh dệt kim từ bông').some((x) => x.nhom === '6103'),
    { dcQuanDai6103, dcQuanDai6111, dcJacket6103, dcJacket6111, dcGangTay6103, dcGangTay6111 });
}

// 14) OZV-2152 — cạnh loại trừ 2 chiều 63.07 <-> 58.02 cho ca 134 tầng 4 số «Khăn lau xe / Vải cotton / Lau xe»
{
  const S = require('../lib/so-tay.js');
  const D = require('../lib/do-thi/index.js');
  const { phanTichHoiTruoc4So, TRANG_THAI_4SO } = require('../lib/do-thi/hoi-truoc-4so.js');
  const q134 = 'Khăn lau xe / Vải cotton / Lau xe';
  for (const nh of ['6307', '5802']) {
    fs.copyFileSync(path.join('data/so-tay', `${nh}.json`), path.join(TEST_DATA_DIR, 'so-tay', `${nh}.json`));
  }
  D.datLai();

  const st6307 = loadSoTay('6307');
  const st5802 = loadSoTay('5802');
  const lt6307 = (st6307?.loaiTru || []).find((x) => x.sangNhom === '5802');
  const lt5802 = (st5802?.loaiTru || []).find((x) => x.sangNhom === '6307');
  check('OZV-2152 (căn cứ): sổ tay 6307 và 5802 có loaiTru 2 chiều kèm canCuLoaiTru nguyên văn đạt checkItem',
    Boolean(
      lt6307 &&
        lt6307.nguon === 'nhom6307.nhom' &&
        lt6307.canCuLoaiTru?.nguon === 'nhom5802.nhom' &&
        S.checkItem('loaiTru', lt6307, S.sourcesFor('6307'), '6307') === null
    ) &&
      Boolean(
        lt5802 &&
          lt5802.nguon === 'nhom5802.nhom' &&
          lt5802.canCuLoaiTru?.nguon === 'nhom6307.nhom' &&
          S.checkItem('loaiTru', lt5802, S.sourcesFor('5802'), '5802') === null
      ) &&
      lt6307.dieuKien !== lt5802.dieuKien,
    { lt6307, lt5802 });

  const c5Tu6307 = D.canhTu('6307', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '5802');
  const c5Tu5802 = D.canhTu('5802', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '6307');
  const mrTu6307 = D.moRongUngVien(['6307'], q134);
  const mrTu5802 = D.moRongUngVien(['5802'], q134);
  check('OZV-2152 (đồ thị 2 chiều): bảng cạnh C5 6307↔5802 và moRongUngVien kéo 2 chiều cho ca 134',
    c5Tu6307.length >= 1 &&
      c5Tu5802.length >= 1 &&
      mrTu6307.some((x) => x.nhom === '5802') &&
      mrTu5802.some((x) => x.nhom === '6307'),
    { c5Tu6307: c5Tu6307.length, c5Tu5802: c5Tu5802.length, mrTu6307, mrTu5802 });

  const ht2 = phanTichHoiTruoc4So({ moTa: q134, ungVien: ['6307', '5802'] });
  check('OZV-2152 (phanTichHoiTruoc4So): tách đủ nhánh điều kiện theo cạnh C5 cho [6307, 5802] trên ca 134',
    ht2.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC &&
      (ht2.nhanh || []).every((n) => String(n.nguon || '').startsWith('do-thi:C5:')) &&
      new Set((ht2.nhanh || []).map((n) => n.dieuKien)).size === 2 &&
      Boolean(ht2.dapAnDieuKien && ht2.dapAnDieuKien.includes('→ nhóm 6307 (') && ht2.dapAnDieuKien.includes('→ nhóm 5802 (')),
    { ht2: ht2.dapAnDieuKien });

  const pb6307 = H.cauPhanBietNhom('6307', ['6307', '5802'], q134);
  check('OZV-2152 (thuận 6307 → 5802): 6307 đứng đầu với [6307, 5802] sinh câu PHAN_BIET_NHOM từ nhom6307.nhom sang 58.02',
    pb6307.length === 1 &&
      pb6307[0].loai === 'PHAN_BIET_NHOM' &&
      pb6307[0].canCu === 'so-tay' &&
      pb6307[0].nguon === 'nhom6307.nhom' &&
      /58\.02/.test(pb6307[0].questionVi) &&
      /63\.07/.test(pb6307[0].questionVi),
    pb6307);

  const pb5802 = H.cauPhanBietNhom('5802', ['5802', '6307'], q134);
  check('OZV-2152 (thuận 5802 → 6307): 5802 đứng đầu với [5802, 6307] sinh câu PHAN_BIET_NHOM từ nhom5802.nhom sang 63.07',
    pb5802.length === 1 &&
      pb5802[0].loai === 'PHAN_BIET_NHOM' &&
      pb5802[0].canCu === 'so-tay' &&
      pb5802[0].nguon === 'nhom5802.nhom' &&
      /63\.07/.test(pb5802[0].questionVi) &&
      /58\.02/.test(pb5802[0].questionVi),
    pb5802);

  const dcAoCuu6307 = H.cauPhanBietNhom('6307', ['6307', '5802'], 'Áo cứu sinh và đai cứu sinh bằng vật liệu dệt');
  const dcAoCuu5802 = H.cauPhanBietNhom('5802', ['5802', '6307'], 'Áo cứu sinh và đai cứu sinh bằng vật liệu dệt');
  const dcCo6307 = H.cauPhanBietNhom('6307', ['6307', '5802'], 'Cờ đuôi nheo dùng trong ngành hàng hải');
  const dcCo5802 = H.cauPhanBietNhom('5802', ['5802', '6307'], 'Cờ đuôi nheo dùng trong ngành hàng hải');
  const dcTham6307 = H.cauPhanBietNhom('6307', ['6307', '5802'], 'Tấm thảm chần nổi vòng dùng để trải sàn');
  const dcTham5802 = H.cauPhanBietNhom('5802', ['5802', '6307'], 'Tấm thảm chần nổi vòng dùng để trải sàn');
  check('OZV-2152 (đối chứng): áo cứu sinh, cờ đuôi nheo và thảm chần không hỏi/kéo oan 63.07 ↔ 58.02',
    dcAoCuu6307.length === 0 &&
      dcAoCuu5802.length === 0 &&
      dcCo6307.length === 0 &&
      dcCo5802.length === 0 &&
      dcTham6307.length === 0 &&
      dcTham5802.length === 0 &&
      !D.moRongUngVien(['6307'], 'Áo cứu sinh và đai cứu sinh bằng vật liệu dệt').some((x) => x.nhom === '5802') &&
      !D.moRongUngVien(['5802'], 'Tấm thảm chần nổi vòng dùng để trải sàn').some((x) => x.nhom === '6307'),
    { dcAoCuu6307, dcAoCuu5802, dcCo6307, dcCo5802, dcTham6307, dcTham5802 });
}

// 15) OZV-2166 — cạnh loại trừ 2 chiều 59.09 <-> 59.11 cho ca 195 tầng 4 số «Cổ bạt mềm / Vải canvas phủ silicon chống cháy / Khớp nối ống gió»
{
  const S = require('../lib/so-tay.js');
  const D = require('../lib/do-thi/index.js');
  const { soTayGates, nhomLienQuanSoTay } = require('../lib/so-tay-gates.js');
  const { phanTichHoiTruoc4So, TRANG_THAI_4SO } = require('../lib/do-thi/hoi-truoc-4so.js');
  const q195 = 'Cổ bạt mềm / Vải canvas phủ silicon chống cháy / Khớp nối ống gió';
  for (const nh of ['5909', '5911', '5907', '6307']) {
    fs.copyFileSync(path.join('data/so-tay', `${nh}.json`), path.join(TEST_DATA_DIR, 'so-tay', `${nh}.json`));
  }
  D.datLai();

  const st5909 = loadSoTay('5909');
  const st5911 = loadSoTay('5911');
  const v5909 = S.verifySoTay(st5909, '5909');
  const v5911 = S.verifySoTay(st5911, '5911');
  const lt5909 = (st5909?.loaiTru || []).find((x) => x.sangNhom === '5911');
  const lt5911 = (st5911?.loaiTru || []).find((x) => x.sangNhom === '5909');
  check('OZV-2166 (verifySoTay & canCuLoaiTru): sổ tay 5909 và 5911 có loaiTru 2 chiều kèm canCuLoaiTru nguyên văn đạt checkItem và verifySoTay 100%',
    Boolean(
      lt5909 &&
        lt5909.nguon === 'ch59.chuong' &&
        lt5909.canCuLoaiTru?.nguon === 'nhom5911.nhom' &&
        S.checkItem('loaiTru', lt5909, S.sourcesFor('5909'), '5909') === null
    ) &&
      Boolean(
        lt5911 &&
          lt5911.nguon === 'nhom5911.nhom' &&
          lt5911.canCuLoaiTru?.nguon === 'nhom5909.nhom' &&
          S.checkItem('loaiTru', lt5911, S.sourcesFor('5911'), '5911') === null
      ) &&
      lt5909.dieuKien !== lt5911.dieuKien &&
      !/;/.test(lt5909.dieuKien) &&
      !/;/.test(lt5911.dieuKien) &&
      v5909.loai.length === 0 && v5909.dat === v5909.tong && st5909.kiemTra?.tong === v5909.tong && st5909.kiemTra?.dat === v5909.dat &&
      v5911.loai.length === 0 && v5911.dat === v5911.tong && st5911.kiemTra?.tong === v5911.tong && st5911.kiemTra?.dat === v5911.dat,
    { lt5909, lt5911, loai5909: v5909.loai, loai5911: v5911.loai });

  const c5Tu5909 = D.canhTu('5909', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '5911');
  const c5Tu5911 = D.canhTu('5911', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '5909');
  const c6Tu5909 = D.canhTu('5909', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '5911');
  const c6Tu5911 = D.canhTu('5911', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '5909');
  const giua = D.canhGiuaNhomConSong(['5909', '5911']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu5909 = D.moRongUngVien(['5909'], q195);
  const mrTu5911 = D.moRongUngVien(['5911'], q195);
  check('OZV-2166 (đồ thị 2 chiều & nhomLienQuanSoTay): bảng cạnh C5/C6 5909↔5911, canhGiuaNhomConSong, nhomLienQuanSoTay và moRongUngVien kéo 2 chiều cho ca 195',
    c5Tu5909.some((e) => e.nguon === 'ch59.chuong' && e.canCuLoaiTru?.nguon === 'nhom5911.nhom') &&
      c5Tu5911.some((e) => e.nguon === 'nhom5911.nhom' && e.canCuLoaiTru?.nguon === 'nhom5909.nhom') &&
      c6Tu5909.length >= 1 &&
      c6Tu5911.length >= 1 &&
      giua.length >= 2 &&
      nhomLienQuanSoTay('5909').includes('5911') &&
      nhomLienQuanSoTay('5911').includes('5909') &&
      mrTu5909.some((x) => x.nhom === '5911') &&
      mrTu5911.some((x) => x.nhom === '5909'),
    { c5Tu5909: c5Tu5909.length, c5Tu5911: c5Tu5911.length, giua: giua.length, mrTu5909, mrTu5911 });

  const ht2 = phanTichHoiTruoc4So({ moTa: q195, ungVien: ['5909', '5911'] });
  const ht3 = phanTichHoiTruoc4So({ moTa: q195, ungVien: ['5909', '5911', '6307'] });
  check('OZV-2166 (phanTichHoiTruoc4So): tách đủ nhánh điều kiện theo cạnh C5 cho [5909, 5911] và [5909, 5911, 6307] trên ca 195',
    ht2.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC &&
      (ht2.nhanh || []).every((n) => String(n.nguon || '').startsWith('do-thi:C5:')) &&
      new Set((ht2.nhanh || []).map((n) => n.dieuKien)).size === 2 &&
      Boolean(ht2.dapAnDieuKien && ht2.dapAnDieuKien.includes('→ nhóm 5909 (') && ht2.dapAnDieuKien.includes('→ nhóm 5911 (')) &&
      ht3.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC &&
      new Set((ht3.nhanh || []).map((n) => n.dieuKien)).size === 3 &&
      ['5909', '5911', '6307'].every((h) => ht3.dapAnDieuKien?.includes(`→ nhóm ${h} (`)),
    { ht2: ht2.dapAnDieuKien, ht3: ht3.dapAnDieuKien });

  const pb5909 = H.cauPhanBietNhom('5909', ['5909', '5911'], q195);
  check('OZV-2166 (thuận 5909 → 5911): 5909 đứng đầu với [5909, 5911] sinh câu PHAN_BIET_NHOM từ ch59.chuong sang 59.11',
    pb5909.length === 1 &&
      pb5909[0].loai === 'PHAN_BIET_NHOM' &&
      pb5909[0].canCu === 'so-tay' &&
      pb5909[0].nguon === 'ch59.chuong' &&
      /59\.11/.test(pb5909[0].questionVi) &&
      /59\.09/.test(pb5909[0].questionVi),
    pb5909);

  const pb5911 = H.cauPhanBietNhom('5911', ['5911', '5909'], q195);
  check('OZV-2166 (thuận 5911 → 5909): 5911 đứng đầu với [5911, 5909] sinh câu PHAN_BIET_NHOM từ nhom5911.nhom sang 59.09',
    pb5911.length === 1 &&
      pb5911[0].loai === 'PHAN_BIET_NHOM' &&
      pb5911[0].canCu === 'so-tay' &&
      pb5911[0].nguon === 'nhom5911.nhom' &&
      /59\.09/.test(pb5911[0].questionVi) &&
      /59\.11/.test(pb5911[0].questionVi),
    pb5911);

  const g5909 = soTayGates({ hs: '59090090', productText: q195, productName: q195, pool: [{ h4: '5911', from: 'test' }] });
  const g5911 = soTayGates({ hs: '59119090', productText: q195, productName: q195, pool: [{ h4: '5909', from: 'test' }] });
  check('OZV-2166 (soTayGates 2 chiều): bật cổng SO_TAY_LOAI_TRU cả 2 chiều 59.09 ↔ 59.11 trên ca 195',
    (g5909.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '5911') &&
      (g5911.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '5909'),
    { g5909: g5909.challenges, g5911: g5911.challenges });

  const dcVoi = 'Vòi cứu hỏa bện từ sợi tổng hợp dùng dẫn nước chữa cháy';
  const dcDem = 'Miếng đệm và miếng chèn bằng phớt dùng làm kín trục máy';
  const dcRay = 'Vải dùng để rây sàng bột trong công nghiệp';
  const pbVoi5909 = H.cauPhanBietNhom('5909', ['5909', '5911'], dcVoi);
  const pbVoi5911 = H.cauPhanBietNhom('5911', ['5911', '5909'], dcVoi);
  const pbDem5909 = H.cauPhanBietNhom('5909', ['5909', '5911'], dcDem);
  const pbDem5911 = H.cauPhanBietNhom('5911', ['5911', '5909'], dcDem);
  const pbRay5909 = H.cauPhanBietNhom('5909', ['5909', '5911'], dcRay);
  const pbRay5911 = H.cauPhanBietNhom('5911', ['5911', '5909'], dcRay);
  const gDc5909 = soTayGates({ hs: '59090010', productText: dcVoi, productName: dcVoi });
  const gDc5911 = soTayGates({ hs: '59119010', productText: dcDem, productName: dcDem });
  check('OZV-2166 (đối chứng): vòi cứu hỏa, miếng đệm phớt kỹ thuật và vải rây sàng không hỏi/kéo/bật cổng oan 59.09 ↔ 59.11',
    pbVoi5909.length === 0 &&
      pbVoi5911.length === 0 &&
      pbDem5909.length === 0 &&
      pbDem5911.length === 0 &&
      pbRay5909.length === 0 &&
      pbRay5911.length === 0 &&
      !(gDc5909.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '5911') &&
      !(gDc5911.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '5909') &&
      !D.moRongUngVien(['5909'], dcVoi).some((x) => x.nhom === '5911') &&
      !D.moRongUngVien(['5911'], dcDem).some((x) => x.nhom === '5909') &&
      !D.moRongUngVien(['5911'], dcRay).some((x) => x.nhom === '5909'),
    { pbVoi5909, pbVoi5911, pbDem5909, pbDem5911, pbRay5909, pbRay5911, gDc5909: gDc5909.challenges, gDc5911: gDc5911.challenges });
}

// 16) OZV-2169 — cạnh loại trừ 2 chiều 59.11 <-> 63.07 cho ca 195 tầng 4 số «Cổ bạt mềm / Vải canvas phủ silicon chống cháy / Khớp nối ống gió»
{
  const S = require('../lib/so-tay.js');
  const D = require('../lib/do-thi/index.js');
  const { soTayGates, nhomLienQuanSoTay } = require('../lib/so-tay-gates.js');
  const { phanTichHoiTruoc4So, TRANG_THAI_4SO } = require('../lib/do-thi/hoi-truoc-4so.js');
  const q195 = 'Cổ bạt mềm / Vải canvas phủ silicon chống cháy / Khớp nối ống gió';
  for (const nh of ['5911', '6307', '5909', '5907']) {
    fs.copyFileSync(path.join('data/so-tay', `${nh}.json`), path.join(TEST_DATA_DIR, 'so-tay', `${nh}.json`));
  }
  D.datLai();

  const st5911 = loadSoTay('5911');
  const st6307 = loadSoTay('6307');
  const v5911 = S.verifySoTay(st5911, '5911');
  const v6307 = S.verifySoTay(st6307, '6307');
  const lt5911 = (st5911?.loaiTru || []).find((x) => x.sangNhom === '6307');
  const lt6307 = (st6307?.loaiTru || []).find((x) => x.sangNhom === '5911');
  check('OZV-2169 (verifySoTay & canCuLoaiTru): sổ tay 5911 và 6307 có loaiTru 2 chiều kèm canCuLoaiTru nguyên văn đạt checkItem và verifySoTay 100%',
    Boolean(
      lt5911 &&
        lt5911.nguon === 'ch59.chuong' &&
        lt5911.canCuLoaiTru?.nguon === 'nhom6307.nhom' &&
        S.checkItem('loaiTru', lt5911, S.sourcesFor('5911'), '5911') === null
    ) &&
      Boolean(
        lt6307 &&
          lt6307.nguon === 'ch63.chuong' &&
          lt6307.canCuLoaiTru?.nguon === 'nhom5911.nhom' &&
          S.checkItem('loaiTru', lt6307, S.sourcesFor('6307'), '6307') === null
      ) &&
      lt5911.dieuKien !== lt6307.dieuKien &&
      !/;/.test(lt5911.dieuKien) &&
      !/;/.test(lt6307.dieuKien) &&
      v5911.loai.length === 0 && v5911.dat === v5911.tong && st5911.kiemTra?.tong === v5911.tong && st5911.kiemTra?.dat === v5911.dat &&
      v6307.loai.length === 0 && v6307.dat === v6307.tong && st6307.kiemTra?.tong === v6307.tong && st6307.kiemTra?.dat === v6307.dat,
    { lt5911, lt6307, loai5911: v5911.loai, loai6307: v6307.loai });

  const c5Tu5911 = D.canhTu('5911', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '6307');
  const c5Tu6307 = D.canhTu('6307', 'C5', { toiDa: Infinity }).filter((e) => e.toi === '5911');
  const c6Tu5911 = D.canhTu('5911', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '6307');
  const c6Tu6307 = D.canhTu('6307', 'C6', { toiDa: Infinity }).filter((e) => e.toi === '5911');
  const giua = D.canhGiuaNhomConSong(['5911', '6307']).filter((e) => e.loai === 'C5' || e.loai === 'C6');
  const mrTu5911 = D.moRongUngVien(['5911'], q195);
  const mrTu6307 = D.moRongUngVien(['6307'], q195);
  check('OZV-2169 (đồ thị 2 chiều & nhomLienQuanSoTay): bảng cạnh C5/C6 5911↔6307, canhGiuaNhomConSong, nhomLienQuanSoTay và moRongUngVien kéo 2 chiều cho ca 195',
    c5Tu5911.some((e) => e.nguon === 'ch59.chuong' && e.canCuLoaiTru?.nguon === 'nhom6307.nhom') &&
      c5Tu6307.some((e) => e.nguon === 'ch63.chuong' && e.canCuLoaiTru?.nguon === 'nhom5911.nhom') &&
      c6Tu5911.length >= 1 &&
      c6Tu6307.length >= 1 &&
      giua.length >= 2 &&
      nhomLienQuanSoTay('5911').includes('6307') &&
      nhomLienQuanSoTay('6307').includes('5911') &&
      mrTu5911.some((x) => x.nhom === '6307') &&
      mrTu6307.some((x) => x.nhom === '5911'),
    { c5Tu5911: c5Tu5911.length, c5Tu6307: c5Tu6307.length, giua: giua.length, mrTu5911, mrTu6307 });

  const ht2 = phanTichHoiTruoc4So({ moTa: q195, ungVien: ['5911', '6307'] });
  const ht3 = phanTichHoiTruoc4So({ moTa: q195, ungVien: ['5909', '5911', '6307'] });
  check('OZV-2169 (phanTichHoiTruoc4So): tách đủ nhánh điều kiện theo cạnh C5 cho [5911, 6307] và [5909, 5911, 6307] trên ca 195',
    ht2.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC &&
      (ht2.nhanh || []).every((n) => String(n.nguon || '').startsWith('do-thi:C5:')) &&
      new Set((ht2.nhanh || []).map((n) => n.dieuKien)).size === 2 &&
      Boolean(ht2.dapAnDieuKien && ht2.dapAnDieuKien.includes('→ nhóm 5911 (') && ht2.dapAnDieuKien.includes('→ nhóm 6307 (')) &&
      ht3.trangThai === TRANG_THAI_4SO.CHUA_CHOT_NHOM_HOI_TRUOC &&
      new Set((ht3.nhanh || []).map((n) => n.dieuKien)).size === 3 &&
      ['5909', '5911', '6307'].every((h) => ht3.dapAnDieuKien?.includes(`→ nhóm ${h} (`)),
    { ht2: ht2.dapAnDieuKien, ht3: ht3.dapAnDieuKien });

  const pb5911 = H.cauPhanBietNhom('5911', ['5911', '6307'], q195);
  check('OZV-2169 (thuận 5911 → 6307): 5911 đứng đầu với [5911, 6307] sinh câu PHAN_BIET_NHOM từ ch59.chuong sang 63.07',
    pb5911.length === 1 &&
      pb5911[0].loai === 'PHAN_BIET_NHOM' &&
      pb5911[0].canCu === 'so-tay' &&
      pb5911[0].nguon === 'ch59.chuong' &&
      /63\.07/.test(pb5911[0].questionVi) &&
      /59\.11/.test(pb5911[0].questionVi),
    pb5911);

  const pb6307 = H.cauPhanBietNhom('6307', ['6307', '5911'], q195);
  check('OZV-2169 (thuận 6307 → 5911): 6307 đứng đầu với [6307, 5911] sinh câu PHAN_BIET_NHOM từ ch63.chuong sang 59.11',
    pb6307.length === 1 &&
      pb6307[0].loai === 'PHAN_BIET_NHOM' &&
      pb6307[0].canCu === 'so-tay' &&
      pb6307[0].nguon === 'ch63.chuong' &&
      /59\.11/.test(pb6307[0].questionVi) &&
      /63\.07/.test(pb6307[0].questionVi),
    pb6307);

  const g5911 = soTayGates({ hs: '59119090', productText: q195, productName: q195, pool: [{ h4: '6307', from: 'test' }] });
  const g6307 = soTayGates({ hs: '63079090', productText: q195, productName: q195, pool: [{ h4: '5911', from: 'test' }] });
  check('OZV-2169 (soTayGates 2 chiều): bật cổng SO_TAY_LOAI_TRU cả 2 chiều 59.11 ↔ 63.07 trên ca 195',
    (g5911.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '6307') &&
      (g6307.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '5911'),
    { g5911: g5911.challenges, g6307: g6307.challenges });

  const dcAoCuu = 'Áo cứu sinh và đai cứu sinh bằng vật liệu dệt';
  const dcCo = 'Cờ đuôi nheo dùng trong ngành hàng hải';
  const dcDem = 'Miếng đệm và miếng chèn bằng phớt dùng làm kín trục máy';
  const dcRay = 'Vải dùng để rây sàng bột trong công nghiệp';
  const pbAo5911 = H.cauPhanBietNhom('5911', ['5911', '6307'], dcAoCuu);
  const pbAo6307 = H.cauPhanBietNhom('6307', ['6307', '5911'], dcAoCuu);
  const pbCo5911 = H.cauPhanBietNhom('5911', ['5911', '6307'], dcCo);
  const pbCo6307 = H.cauPhanBietNhom('6307', ['6307', '5911'], dcCo);
  const pbDem5911 = H.cauPhanBietNhom('5911', ['5911', '6307'], dcDem);
  const pbDem6307 = H.cauPhanBietNhom('6307', ['6307', '5911'], dcDem);
  const pbRay5911 = H.cauPhanBietNhom('5911', ['5911', '6307'], dcRay);
  const pbRay6307 = H.cauPhanBietNhom('6307', ['6307', '5911'], dcRay);
  const gDc5911 = soTayGates({ hs: '59119010', productText: dcDem, productName: dcDem });
  const gDc6307 = soTayGates({ hs: '63072000', productText: dcAoCuu, productName: dcAoCuu });
  check('OZV-2169 (đối chứng): áo cứu sinh, cờ đuôi nheo, miếng đệm phớt và vải rây sàng không hỏi/kéo/bật cổng oan 59.11 ↔ 63.07',
    pbAo5911.length === 0 &&
      pbAo6307.length === 0 &&
      pbCo5911.length === 0 &&
      pbCo6307.length === 0 &&
      pbDem5911.length === 0 &&
      pbDem6307.length === 0 &&
      pbRay5911.length === 0 &&
      pbRay6307.length === 0 &&
      !(gDc5911.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '6307') &&
      !(gDc6307.challenges || []).some((x) => x.gate === 'SO_TAY_LOAI_TRU' && x.target === '5911') &&
      !D.moRongUngVien(['6307'], dcAoCuu).some((x) => x.nhom === '5911') &&
      !D.moRongUngVien(['5911'], dcDem).some((x) => x.nhom === '6307') &&
      !D.moRongUngVien(['5911'], dcRay).some((x) => x.nhom === '6307'),
    { pbAo5911, pbAo6307, pbCo5911, pbCo6307, pbDem5911, pbDem6307, pbRay5911, pbRay6307, gDc5911: gDc5911.challenges, gDc6307: gDc6307.challenges });
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
