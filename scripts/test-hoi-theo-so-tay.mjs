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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
