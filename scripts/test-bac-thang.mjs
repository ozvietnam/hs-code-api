#!/usr/bin/env node
/**
 * Bậc thang 4 → 6 → 8 (lib/do-thi/bac-thang.js, ADR-0004) và bất biến "chế độ do-thi: mọi đường ra đều qua kiemCongAdr0004".
 * AI giả lập, không mạng. Mỗi luật có ca thuận và ca ngược. Cây biểu thuế thật; sổ tay GIẢ (không khoá vào dữ liệu đang soạn — L3).
 */
import './test-isolate-data.mjs';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { boKiem } from './lib-luat.mjs';

const require = createRequire(import.meta.url);
globalThis.fetch = async () => { throw new Error('bài kiểm không được ra mạng'); };
for (const k of Object.keys(process.env)) if (/^HS_/.test(k)) delete process.env[k];
process.env.MIC_OFF = '1';
const { kiem, xong } = boKiem('test-bac-thang');
const BT = require('../lib/do-thi/bac-thang.js');
const { kiemCongAdr0004 } = require('../lib/cong-adr-0004.js');
const { doBacThang, nhanPhanQuyet } = await import('./do-bac-thang.mjs');

const KHONG_SO = () => null;
const canCu = (h4) => [{ nguon: `tenNhom.${h4}`, trich: BT.nguonNhom(h4)[`tenNhom.${h4}`] }];
/** AI giả: lần gọi thứ n trả tra[n] (hàm nhận yêu cầu, hoặc giá trị). */
function ai(...tra) {
  const goi = [];
  const f = async (_t, u) => { const r = tra[goi.length]; goi.push(u); const v = typeof r === 'function' ? r(u) : r; if (v instanceof Error) throw v; return v; };
  f.goi = goi; return f;
}
const chay = (o) => BT.chayBacThang({ canCuNhom: canCu(o.nhom), docSoTay: KHONG_SO, ...o });
const datCong = (r) => kiemCongAdr0004(r.banGhi, { nguonVanBan: r.nguonVanBan }).dat;
/** Mã "Dn" của dòng có tên chứa `s` trong yêu cầu. */
const D = (u, s) => (u.split('\n').find((l) => /^\[D\d+\]/.test(l) && l.includes(s)) || '').match(/^\[(D\d+)\]/)?.[1];

// ── 1. Bậc 4: không có trích luật thì không có mã ─────────────────────────────────────────────────────────────────
const DH = { nhom: '9105', moTa: 'Đồng hồ báo thức để bàn, chạy pin. nhựa' };
{
  const khong = await chay({ ...DH, canCuNhom: [] });
  kiem('bậc 4 không căn cứ → DUNG_HOI, không mã, có câu hỏi kèm căn cứ', khong.ma === '' && khong.trangThai === 'DUNG_HOI' && khong.lyDoDung === 'KHONG_CO_CAN_CU_LUAT' && khong.cauHoi.every((q) => q.cauHoi && q.canCu && q.nguon) && khong.cauHoi.length > 0);
  const tl = await chay({ ...DH, canCuNhom: [{ nguon: 'tb-tchq', loai: 'TB-TCHQ', trich: 'Đồng hồ báo thức thuộc 9105' }] });
  kiem('CA NGƯỢC tiền lệ làm căn cứ bậc 4 → không chốt', tl.ma === '' && tl.lyDoDung === 'KHONG_CO_CAN_CU_LUAT');
  const bia = await chay({ ...DH, canCuNhom: [{ nguon: 'tenNhom.9105', trich: 'Đồng hồ thông minh đeo tay' }] });
  kiem('CA NGƯỢC trích bịa ở bậc 4 → không chốt', bia.ma === '');
  const la = await chay({ ...DH, canCuNhom: [{ nguon: 'data/confusion-pairs.json#x', trich: 'Đồng hồ báo thức hay đồng hồ đeo' }] });
  kiem('CA NGƯỢC nguồn không phải luật (từ điển cặp dễ nhầm) → không chốt', la.ma === '');
  const thieu = await chay({ ...DH, thieu4: ['máy đồng hồ cá nhân hay không'] });
  kiem('bậc 4 còn thiếu dữ kiện luật đòi → DUNG_HOI ở bậc 4', thieu.ma === '' && thieu.lyDoDung === 'THIEU_DU_KIEN_BAC_4' && thieu.banGhi.duKienBatBuocThieu.length === 1 && datCong(thieu));
  const lu = await chay(DH);
  kiem('không AI, luật chưa quyết → giữ nhóm 4 số, hỏi ở bậc 6', lu.ma === '9105' && lu.trangThai === 'DUNG_HOI' && lu.soLoiAI === 0 && datCong(lu));
}
// ── 2. AI: mỗi cấp gạch một lời, chỉ thấy anh em cùng cấp ────────────────────────────────────────────────────────
const c1 = (u) => ({ dong: D(u, 'Đồng hồ báo thức'), luat: 'Đồng hồ báo thức', chu: 'Đồng hồ báo thức', loai: [], thieu: [] });
const c2 = (u) => ({ dong: D(u, 'Hoạt động bằng điện'), luat: 'Hoạt động bằng điện', chu: 'chạy pin', loai: [], thieu: [] });
{
  const f = ai(c1, c2); const r = await chay({ ...DH, goiLLM: f });
  kiem('thuận: hai cấp gạch → hai lời AI → 91051100, CHOT, cổng xanh', r.ma === '91051100' && r.trangThai === 'CHOT' && f.goi.length === 2 && datCong(r) && r.viPham.length === 0, JSON.stringify(r.vet));
  const dong = f.goi.map((u) => u.split('\n').filter((l) => /^\[D\d+\]/.test(l)));
  kiem('lời thứ nhất chỉ có 3 dòng một gạch; lời thứ hai chỉ có 2 dòng của nhánh đã chọn', dong[0].length === 3 && dong[1].length === 2 && !f.goi[0].includes('Hoạt động bằng điện') && !f.goi[1].includes('Đồng hồ treo tường'), JSON.stringify(dong));
  kiem('mỗi tầng có trích nguyên văn, tra được nguồn', ['tang4', 'tang6', 'tang8'].every((t) => r.banGhi.tang[t].canCu.length && r.banGhi.tang[t].canCu.every((c) => BT.coTrich(c.trich, BT.vanBanNguon(c.nguon, ['9105'])))));
}
const hong = async (ten, tra, lyDo, them = {}) => {
  const r = await chay({ ...DH, ...them, goiLLM: ai(tra) });
  kiem(`CA NGƯỢC ${ten} → DUNG_HOI (${lyDo}), giữ đúng bậc đã chốt`, r.trangThai === 'DUNG_HOI' && r.lyDoDung === lyDo && r.ma === '9105' && r.cauHoi.length > 0 && datCong(r), `${r.lyDoDung} ${r.ma}`);
  return r;
};
await hong('AI nhảy sang nhóm khác (9102)', { dong: '9102', luat: 'Đồng hồ báo thức', chu: 'báo thức' }, 'NGOAI_DANH_SACH');
await hong('AI chọn dòng không có trong cấp', { dong: 'D9', luat: 'Đồng hồ báo thức', chu: 'báo thức' }, 'NGOAI_DANH_SACH');
{
  const r = await hong('AI cố ra 8 số khi bậc 6 dừng', { dong: '', hs: '91051100', ma: '91051100', thieu: [{ duKien: 'nguồn điện', luat: 'Hoạt động bằng điện' }] }, 'THIEU_DU_KIEN');
  kiem('… không tầng 6 / tầng 8 nào được chốt', r.banGhi.tang.tang6?.trangThai === 'DUNG_HOI' && !r.banGhi.tang.tang8);
}
await hong('câu luật bịa', (u) => ({ ...c1(u), luat: 'Đồng hồ báo thức điện tử có radio' }), 'CAU_LUAT_BIA');
await hong('câu luật của dòng anh em, không phải dòng được chọn', (u) => ({ ...c1(u), luat: 'Đồng hồ treo tường' }), 'CAU_LUAT_BIA');
await hong('câu luật cắt vụn', (u) => ({ ...c1(u), luat: 'báo' }), 'CAU_LUAT_BIA');
await hong('chữ khách bịa', (u) => ({ ...c1(u), chu: 'có chuông báo' }), 'CHU_KHACH_BIA');
await hong('chữ khách cắt giữa từ', (u) => ({ ...c1(u), chu: 'ồng hồ' }), 'CHU_KHACH_BIA');
await hong('không phải JSON', 'em chọn báo thức', 'KHONG_PHAI_JSON');
await hong('AI lỗi mạng', new Error('mang'), 'LOI_LLM');
{
  const r = await chay({ ...DH, goiLLM: ai(c1, c2), conGio: (() => { let n = 0; return () => { n += 1; return n === 1; }; })() });
  kiem('hết giờ giữa chừng: dừng ở bậc cao nhất đã chốt, không đoán', r.trangThai === 'DUNG_HOI' && r.lyDoDung === 'HET_GIO' && r.ma === '9105' && r.soLoiAI === 1);
}
{
  const l = 'Hoạt động bằng điện';
  const r = await chay({ ...DH, goiLLM: ai(c1, { dong: '', thieu: [{ duKien: 'CHỮ CỦA AI', luat: l }, { duKien: 'x', luat: 'câu luật bịa ra' }] }) });
  kiem('thiếu dữ kiện: câu hỏi gắn câu luật nguyên văn, không mang lời AI, không mang câu luật bịa (L2)', r.cauHoi[0].cauHoi.includes(`"${l}"`) && !r.cauHoi.some((q) => /CHỮ CỦA AI|bịa ra/.test(q.cauHoi)) && r.cauHoi.every((q) => q.canCu && q.nguon), JSON.stringify(r.cauHoi));
}
// ── 3. "Loại khác" ───────────────────────────────────────────────────────────────────────────────────────────────
{
  const H = { nhom: '9105', moTa: 'Đồng hồ để bàn trang trí không chuông, chạy pin' };
  const bua = async (ten, loai, lyDo) => {
    const r = await chay({ ...H, goiLLM: ai((u) => ({ dong: D(u, 'Loại khác'), luat: 'Loại khác', chu: 'Đồng hồ để bàn', loai: loai(u) })) });
    kiem(`CA NGƯỢC "Loại khác" ${ten} → ${lyDo}`, r.lyDoDung === lyDo && r.ma === '9105', `${r.lyDoDung} ${r.ma}`);
  };
  const b = (u) => ({ dong: D(u, 'báo thức'), luat: 'Đồng hồ báo thức', chu: 'không chuông' });
  const t = (u) => ({ dong: D(u, 'treo tường'), luat: 'Đồng hồ treo tường', chu: 'để bàn' });
  await bua('không loại anh em nào', () => [], 'LOAI_KHAC_CHUA_LOAI_ANH_EM');
  await bua('sót một anh em', (u) => [b(u)], 'LOAI_KHAC_CHUA_LOAI_ANH_EM');
  await bua('loại bằng chữ khách bịa', (u) => [b(u), { ...t(u), chu: 'không treo được' }], 'CHU_KHACH_BIA');
  await bua('loại bằng câu luật bịa', (u) => [b(u), { ...t(u), luat: 'Đồng hồ treo' + ' cao' }], 'CAU_LUAT_BIA');
  await bua('lấy chữ KHỚP để loại', (u) => [b(u), { ...t(u), chu: 'Đồng hồ' }], 'ANH_EM_KHOP_CHU_KHACH');
  const r = await chay({ ...H, denBac: 6, goiLLM: ai((u) => ({ dong: D(u, 'Loại khác'), luat: 'Loại khác', chu: 'Đồng hồ để bàn', loai: [b(u), t(u)] }), c2) });
  kiem('thuận "Loại khác": mọi anh em có tên bị loại bằng chữ khách → đi tiếp 910591', r.ma === '910591' && datCong(r), `${r.lyDoDung} ${r.ma}`);
}
// ── 4. Dòng "của hàng thuộc phân nhóm X": phải phân loại máy chủ ──────────────────────────────────────────────────
{
  const X = { nhom: '8714', hs6: '871491', moTa: 'Càng xe đạp. nhôm. lắp xe đạp' };
  const chon = (u) => ({ dong: D(u, '8712.00.20'), luat: 'Dùng cho xe đạp thuộc phân nhóm 8712.00.20', chu: 'lắp xe đạp', loai: [] });
  const r = await chay({ ...X, goiLLM: ai(chon) });
  kiem('CA NGƯỢC chọn dòng "thuộc phân nhóm 8712.00.20" khi khách chưa nêu máy chủ tới mức đó → hỏi máy chủ, dừng ở 6 số', r.lyDoDung === 'CAN_PHAN_LOAI_MAY_CHU' && r.ma === '871491' && /8712\.00\.20/.test(r.cauHoi[0].cauHoi), `${r.lyDoDung} ${r.ma}`);
  const k = await chay({ ...X, goiLLM: ai((u) => ({ dong: D(u, 'Loại khác'), luat: 'Loại khác', chu: 'xe đạp', loai: [{ dong: D(u, '8712.00.20'), luat: 'Dùng cho xe đạp thuộc phân nhóm 8712.00.20', chu: 'nhôm' }] })) });
  kiem('CA NGƯỢC chọn "Loại khác" bên cạnh dòng đó cũng phải hỏi máy chủ', k.lyDoDung === 'CAN_PHAN_LOAI_MAY_CHU' && k.ma === '871491', k.lyDoDung);
  const co = await chay({ ...X, moTa: 'Càng xe đạp. nhôm. lắp xe đạp thuộc phân nhóm 8712.00.20', goiLLM: ai((u) => ({ ...chon(u), chu: 'xe đạp thuộc phân nhóm 8712.00.20' })) });
  kiem('thuận: khách nêu đúng mã máy chủ → chốt 87149110', co.ma === '87149110' && datCong(co), `${co.lyDoDung} ${co.ma}`);
  // Luật (chotDong8) cũng không được chốt dòng đòi máy chủ, và không được đổi phân nhóm 6 số đã chốt.
  const g = require('../lib/so-tay-gates.js'); const goc = g.chotDong8; const so8 = () => ({ dong8: [] });
  g.chotDong8 = () => ({ checked: true, ketQua: 'CHOT', hs: '87149110', traNguon: [] });
  const l = await chay({ ...X, docSoTay: so8 });
  kiem('CA NGƯỢC chotDong8 chốt dòng "thuộc phân nhóm X" → vẫn hỏi máy chủ', l.lyDoDung === 'CAN_PHAN_LOAI_MAY_CHU' && l.ma === '871491', `${l.lyDoDung} ${l.ma}`);
  g.chotDong8 = () => ({ checked: true, ketQua: 'CHOT', hs: '87149290', traNguon: [] });
  const n = await chay({ ...X, docSoTay: so8 });
  kiem('CA NGƯỢC chotDong8 trả dòng của phân nhóm khác → bỏ, giữ 871491', n.ma === '871491' && n.trangThai === 'DUNG_HOI', n.ma);
  g.chotDong8 = () => ({ checked: true, ketQua: 'CHOT', hs: '96170010', traNguon: [] });
  const y = await chay({ nhom: '9617', moTa: 'Phích chân không', docSoTay: so8 });
  kiem('thuận: chotDong8 chốt dòng có tên trong đúng phân nhóm → 8 số, cổng xanh', y.ma === '96170010' && y.trangThai === 'CHOT' && datCong(y), `${y.ma} ${y.lyDoDung}`);
  g.chotDong8 = goc;
  kiem('"trừ loại của phân nhóm …" không phải dòng đòi máy chủ', BT.maMayChu('847150') === null && BT.maMayChu('87149110') === '87120020');
}
// ── 5. Bộ phận rơi vào Phần XV ───────────────────────────────────────────────────────────────────────────────────
{
  const r = await chay({ nhom: '7326', moTa: 'Bộ phận máy dệt bằng thép' });
  kiem('CA NGƯỢC bộ phận máy chốt 73.26 chưa qua Chú giải 2 Phần XVI → hỏi ở bậc 4', r.ma === '' && r.lyDoDung === 'BO_PHAN_CHUA_QUA_CHU_GIAI_2_PHAN_XVI' && r.cauHoi.length > 0);
  const ok = await chay({ nhom: '7318', moTa: 'Bu lông thép dùng cho máy khoan', denBac: 4 });
  kiem('thuận: bu lông là bộ phận có công dụng chung (Chú giải 1 Phần XVI) → giữ 73.18, cổng xanh', ok.ma === '7318' && ok.banGhi.kiemBoPhan.daKiemChuGiai2PhanXVI === true && datCong(ok), ok.lyDoDung);
  const kbp = await chay({ nhom: '7326', moTa: 'Móc treo bằng thép', denBac: 4 });
  kiem('hàng không phải bộ phận: không bắt soát', kbp.ma === '7326' && !kbp.banGhi.laBoPhan);
}
// ── 6. Cạnh luật (sổ tay giả) ────────────────────────────────────────────────────────────────────────────────────
const so6 = (ds) => () => ({ kiemTra: { tieuChi6: { khuon: 'g6@1' } }, tieuChi6: ds, dong8: [] });
const soi = (hs6, tenLoai) => [...(tenLoai ? [{ hs6, fact: 'tenLoai', op: 'TEN_LOAI', value: tenLoai, tuKhoa: tenLoai, nguon: `tax.${hs6}00`, trich: 'Từ sợi nhân tạo' }] : []), { hs6, fact: 'loaiSoiDet', op: 'TRONG', value: ['NHAN_TAO'], nguon: `tax.${hs6}00`, trich: 'Từ sợi nhân tạo' }];
{
  const S = so6([...soi('610822', ['Quần xi líp', 'quần đùi bó']), ...soi('610832', ['Váy ngủ']), ...soi('610892', null)]);
  const bo = await chay({ nhom: '6108', moTa: 'Áo lót nữ. sợi tổng hợp', docSoTay: S, denBac: 6 });
  const x6 = require('../lib/do-thi/duong-do-thi.js').xuong6('6108', 'Áo lót nữ. sợi tổng hợp', S);
  kiem('CA NGƯỢC cạnh chốt 610892 nhưng 6108.9 là "Loại khác" và anh em có tên chưa bị loại cứng → không đi vào', x6.chot === '610892' && bo.ma === '6108' && bo.trangThai === 'DUNG_HOI', `${x6.chot} ${bo.ma}`);
  const th = await chay({ nhom: '6108', moTa: 'Quần xi líp nữ. sợi tổng hợp', docSoTay: so6(soi('610822', ['Quần xi líp', 'quần đùi bó'])), denBac: 6 });
  kiem('thuận: cạnh khớp phân nhóm có tên → 610822, có trích', th.ma === '610822' && datCong(th) && th.vet.every((v) => v.cach === 'CANH'), `${th.lyDoDung} ${JSON.stringify(th.vet)}`);
}
{
  const S = so6([{ hs6: '854190', fact: 'laBoPhan', op: 'CO', nguon: 'tax.85419000', trich: 'Bộ phận' }]);
  const r = await chay({ nhom: '8541', tenHang: 'Cảm biến quang', moTa: 'Cảm biến quang. phát hiện vật bằng linh kiện quang điện', docSoTay: S, denBac: 6 });
  kiem('CA NGƯỢC "linh kiện" chỉ có ở câu công dụng, không ở tên hàng → không chốt "Bộ phận"', r.ma === '8541', r.ma);
  const t = await chay({ nhom: '8541', tenHang: 'Bộ phận của điốt', moTa: 'Bộ phận của điốt. dùng lắp ráp', docSoTay: S, denBac: 6 });
  kiem('thuận: tên hàng là bộ phận → 854190', t.ma === '854190', `${t.ma} ${t.lyDoDung}`);
}
{
  const r = await chay({ nhom: '9617', moTa: 'Cốc giữ nhiệt chân không', denBac: 6 });
  kiem('nhóm không chia phân nhóm (xxxx.00): tầng 6 theo tên nhóm, không hỏi thừa', r.ma === '961700' && datCong(r) && r.vet[0].cach === 'CON_DUY_NHAT');
}
// ── 7. Cửa ra congRa ─────────────────────────────────────────────────────────────────────────────────────────────
{
  const bt = await chay({ ...DH, goiLLM: ai(c1, c2) });
  const ra = (o, b = bt) => BT.congRa({ status: 'REVIEW', nextAction: { type: 'USER_CONFIRM', optionsHs: (o || []).map((x) => x.hs) }, results: o, engine: {} }, b);
  const thuan = ra([{ hs: '91051100' }]);
  kiem('congRa thuận: đúng mã bậc thang → giữ nguyên, ghi adr0004.dat', thuan.status === 'REVIEW' && thuan.results.length === 1 && thuan.engine.adr0004.dat === true);
  for (const [ten, o, b] of [['không có bản ghi bậc thang', [{ hs: '91051100' }], null], ['mã đứng đầu khác nhóm', [{ hs: '91021100' }], bt], ['mã đứng đầu khác phân nhóm', [{ hs: '91052100' }], bt], ['mã sâu hơn bậc đã chốt', [{ hs: '91051100' }], await chay(DH)], ['bản ghi thiếu trích tầng 6', [{ hs: '91051100' }], { ...bt, banGhi: { ...bt.banGhi, tang: { ...bt.banGhi.tang, tang6: { ma: '910511', trangThai: 'CHOT', canCu: [] } } } }], ['bản ghi trích bịa tầng 8', [{ hs: '91051100' }], { ...bt, banGhi: { ...bt.banGhi, tang: { ...bt.banGhi.tang, tang8: { ...bt.banGhi.tang.tang8, canCu: [{ nguon: 'tax.91051100', trich: 'câu này không có trong biểu' }] } } } }]]) {
    const r = ra(o, b);
    kiem(`CA NGƯỢC congRa: ${ten} → không trả mã, trả hỏi`, r.results.length === 0 && r.status === 'NEED_FACTS' && r.nextAction.questions.length > 0 && r.nextAction.questions.every((q) => q.questionVi && q.canCu) && r.ecus === null, JSON.stringify(r).slice(0, 200));
  }
  const kem = ra([{ hs: '91051100' }, { hs: '91052100' }, { hs: '85176900' }]);
  kiem('congRa: mã kèm (tiền lệ, bảng tư vấn) bị bỏ, mã đứng đầu giữ nguyên', kem.results.map((x) => x.hs).join() === '91051100' && kem.status === 'REVIEW' && kem.nextAction.optionsHs.join() === '91051100');
  const rong = BT.congRa({ status: 'NEEDS_EXPERT', results: [], engine: {} }, null);
  kiem('congRa: không mã → giữ nguyên trạng thái, vẫn ghi adr0004', rong.status === 'NEEDS_EXPERT' && rong.engine.adr0004.dat === true);
}
// ── 8. BẤT BIẾN trên động cơ: chế độ do-thi, mọi đường ra qua cổng ────────────────────────────────────────────────
{
  process.env.HS_SO_TAY = 'full'; process.env.HS_TIM_TRUOC = 'do-thi'; process.env.HS_MAX_VONG_SUA = '1'; process.env.HS_GON_DAU_RA = 'on';
  const llm = require('../lib/llm-tier.js');
  const { classifyLoop } = require('../lib/engine-loop.js');
  const congMod = require('../lib/cong-adr-0004.js');
  const ktc = require('../lib/kiem-truoc-chot.js');
  const { taxData } = require('../lib/data.js');
  const tenNhomCua = (u, h) => [...u.matchAll(/\[([^\]]+)\] \((\d{4})-(\d{4})\)/g)].find((m) => m[2] === h && m[3] === h)?.[1];
  const l1 = (u) => ({ duKien: [], nhom: [...u.split('ỨNG VIÊN:')[1].matchAll(/^- (\d{4})/gm)].map((m) => m[1]).slice(0, 3), lyDoNgoai: '' });
  const l2 = (u) => { const h = /NHÓM CÒN SỐNG: (\d{4})/.exec(u)[1]; return { nhom: h, canCu: [tenNhomCua(u, h)], thieu: [], lyDo: 'tên nhóm' }; };
  // AI bậc thang tham lam: luôn chọn dòng đầu không bị loại, trích trọn tên dòng và chữ đầu của khách.
  const tham = (u) => { const d = u.split('\n').find((l) => /^\[D\d+\]/.test(l) && !l.includes('MÁY ĐÃ LOẠI')); const [, ma, ten] = /^\[(D\d+)\] (.*)$/.exec(d); return { dong: ma, luat: ten, chu: /HÀNG \(nguyên văn chữ khách\): (\S+ \S+)/.exec(u)[1].replace(/[.,]$/, ''), loai: [] }; };
  const KIEU = [
    ['thuận tham lam', { luot_mot: l1, luot_hai: l2, bac_thang: tham }],
    ['nhảy nhóm ở bậc thang', { luot_mot: l1, luot_hai: l2, bac_thang: { dong: '8517', luat: 'x', chu: 'y' } }],
    ['ra thẳng 8 số', { luot_mot: l1, luot_hai: l2, bac_thang: { dong: 'D1', hs: '84812090', luat: 'bịa', chu: 'bịa' } }],
    ['bậc thang lỗi', { luot_mot: l1, luot_hai: l2, bac_thang: new Error('x') }],
    ['lượt hai thiếu dữ kiện', { luot_mot: l1, luot_hai: (u) => ({ ...l2(u), thieu: ['vật liệu'] }), bac_thang: tham }],
    ['lượt hai bịa căn cứ', { luot_mot: l1, luot_hai: { nhom: '8481', canCu: ['K99'], thieu: [] }, bac_thang: tham }],
    ['lượt hai chọn nhóm ngoài gói', { luot_mot: l1, luot_hai: { nhom: '0101', canCu: ['K1'], thieu: [] }, bac_thang: tham }],
    ['lượt hai lỗi mạng', { luot_mot: l1, luot_hai: new Error('x'), bac_thang: tham }],
    ['mọi lượt lỗi', { luot_mot: new Error('x'), luot_hai: new Error('x'), bac_thang: new Error('x') }],
  ];
  const HANG = [{ tenHang: 'Van điện từ khí nén 5/2, cuộn coil 24VDC, thân nhôm' }, { tenHang: 'Váy liền thân trẻ em gái', chatLieu: 'Vải dệt kim sợi tổng hợp' }, { tenHang: 'Cốc giữ nhiệt chân không inox', congDung: 'giữ nhiệt' }, { tenHang: '电磁阀' }, { tenHang: 'Bộ phận máy dệt bằng thép' }];
  const goc = ktc.kiemTruocChot; let soCong = 0;
  const congGoc = congMod.kiemCongAdr0004;
  let hong = 0; let coMa = 0; let co8 = 0; const loi = [];
  for (const [ten, tra] of KIEU) for (const hang of HANG) {
    const buoc = [];
    llm.callLLMJson = async (_s, u, o = {}) => { buoc.push(o.step); const r = tra[o.step]; const v = typeof r === 'function' ? r(u) : r; if (v instanceof Error) throw v; if (v === undefined) throw new Error(`bước lạ ${o.step}`); return { json: JSON.parse(JSON.stringify(v)), provider: 'gia', model: 'gia' }; };
    // Tiền lệ "trùng khít chắc chắn" cố đôn một mã khác lên đầu: không được.
    const maKhac = (t) => Object.keys(taxData).find((x) => t && x.startsWith(t.slice(0, 4)) && x !== t) || '85176900'; // mã khác CÙNG nhóm: không bị lọc vì nhóm lạ
    ktc.kiemTruocChot = ({ topHs } = {}) => ({ coCo: true, canhBao: [{ ma: 'GIA', noiDung: 'tiền lệ giả ra mã khác' }], deXuat: [{ hs: maKhac(topHs), chacChan: true, diem: 1, chung: 9, soTienLe: '1/TB', reason: 'giả', evidence: 'giả', source: 'gia' }] });
    const out = await classifyLoop(hang, { mic: false });
    const bt = out.engine?.bacThang; const r = out.results || [];
    const sai = [];
    if (!out.engine?.adr0004 || out.engine.adr0004.dat !== true) sai.push('không qua cổng');
    if (buoc.some((b) => ['understand', 'gir'].includes(b))) sai.push(`gọi vòng cũ: ${buoc}`);
    if (out.engine?.adr0004?.boMa) sai.push(`phần KẾT QUẢ đưa mã lạ ${out.engine.adr0004.boMa}`);
    if (r[0]?.hs?.length === 8) co8 += 1;
    if (r.length && (!bt || r[0].hs !== bt.ma || !r[0].hs.startsWith(bt.nhom))) sai.push(`mã ${r[0]?.hs} khác bậc thang ${bt?.ma}`);
    if (r.length && r[0].hs.length === 8 && bt.trangThai !== 'CHOT') sai.push('8 số khi chưa CHOT');
    if (r.length && ['tang4', 'tang6'].some((t) => !(bt.tang[t]?.canCu || []).length)) sai.push('tầng thiếu trích');
    if (!r.length && !['NEED_FACTS', 'NEEDS_EXPERT'].includes(out.status)) sai.push(`trạng thái ${out.status}`);
    if (out.status === 'NEED_FACTS' && !(out.nextAction?.questions || []).every((q) => q.questionVi && q.canCu && q.nguon)) sai.push('câu hỏi thiếu căn cứ');
    if (out.status === 'NEED_FACTS' && !(out.nextAction?.questions || []).length) sai.push('hỏi mà không có câu hỏi');
    if (!Array.isArray(out.missing) || !out.canCuPhapLy) sai.push('lệch khuôn ERP');
    if (r.length) coMa += 1; soCong += 1;
    if (sai.length) { hong += 1; loi.push(`${ten} / ${hang.tenHang}: ${sai.join('; ')}`); }
  }
  ktc.kiemTruocChot = goc;
  kiem(`BẤT BIẾN do-thi: ${soCong} lượt (${KIEU.length} kiểu AI × ${HANG.length} hàng) đều qua cổng, không đổi nhóm, không 8 số khi bậc 6 dừng, không gọi vòng cũ`, hong === 0, loi.slice(0, 5).join(' | '));
  kiem('bất biến có lượt ra mã thật, có lượt ra đủ 8 số (không xanh vì toàn rỗng)', coMa >= 3 && co8 >= 1, `${coMa} ${co8}`);
  kiem('cổng dùng trong bài kiểm là cổng thật', congMod.kiemCongAdr0004 === congGoc);
  // Lỗi AI ≠ khách thiếu dữ kiện
  llm.callLLMJson = async () => { throw new Error('mang'); };
  const ban = await classifyLoop(HANG[0], { mic: false });
  kiem('AI lỗi ở bậc 4 → RETRY, không hỏi khách', ban.nextAction?.type === 'RETRY' && ban.results.length === 0, JSON.stringify(ban.nextAction));
  // Tĩnh: đường ra duy nhất
  const ma = fs.readFileSync(new URL('../lib/engine-loop.js', import.meta.url), 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  const goi = [...ma.matchAll(/classifyLoopGoc\(/g)].length;
  kiem('tĩnh: classifyLoopGoc chỉ được gọi trong classifyLoop, nhánh do-thi bọc congRa', goi === 3 && /congRa\(await classifyLoopGoc\(/.test(ma) && !/module\.exports = \{[\s\S]*classifyLoopGoc/.test(ma), String(goi));
  kiem('tĩnh: không còn đường dapAn8 / khoiVong2 cũ', !/dapAn8|khoiVong2/.test(ma));
  const api = fs.readFileSync(new URL('../api/classify.js', import.meta.url), 'utf8');
  kiem('tĩnh: api/classify không trả cache / kho đáp án khi do-thi', /dungCache = !doThi &&/.test(api) && /dungKhoOn = !doThi &&/.test(api));
  for (const k of ['HS_SO_TAY', 'HS_TIM_TRUOC', 'HS_MAX_VONG_SUA', 'HS_GON_DAU_RA']) delete process.env[k];
}
// ── 9. Máy đo ────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const ca = [{ tenHang: 'Cốc giữ nhiệt chân không', maDung: '96180000', nguonDong: 'gia:1' }, { tenHang: 'Cốc giữ nhiệt chân không', maDung: '96170010', nguonDong: 'gia:2' }];
  const k = await doBacThang(ca);
  kiem('máy đo: ba ô cộng đủ số ca, không vi phạm ADR', k.T2.dung + k.T2.sai + k.T2.hoi === 2 && k.T3.dung + k.T3.sai + k.T3.hoi === 2 && k.viPhamAdr === 0);
  const luat = BT.dongLuat('9617', '96170010');
  const { hopLe, loi } = nhanPhanQuyet([
    { nguonDong: 'gia:1', ma: '96170010', nguon: luat.nguon, cauLuat: luat.trich }, { nguonDong: 'gia:3', ma: '96170010' },
    { nguonDong: 'gia:4', ma: '96170010', nguon: luat.nguon, cauLuat: 'câu luật không có trong biểu' }, { nguonDong: 'gia:5', ma: '96170010', nguon: 'khong-co', cauLuat: luat.trich }, { nguonDong: 'gia:6', nguon: luat.nguon, cauLuat: luat.trich },
  ]);
  kiem('phán quyết: chỉ nhận dòng có câu luật nguyên văn; 4 dòng thiếu / bịa bị từ chối', hopLe.size === 1 && hopLe.has('gia:1') && loi.length === 4, JSON.stringify(loi));
  const coPq = await doBacThang([ca[0]], hopLe);
  kiem('có phán quyết thì chấm theo phán quyết (đưa sẵn nhóm theo phán quyết)', coPq.phanQuyetDung === 1 && coPq.T2.dung === 1);
  const X = [{ tenHang: 'Cốc giữ nhiệt chân không', maDung: '96170010', nguonDong: 'gia:7' }];
  const dungHoi = nhanPhanQuyet([{ nguonDong: 'gia:7', trangThai: 'DUNG_HOI', nguon: 'tenNhom.9617', cauLuat: BT.nguonNhom('9617')['tenNhom.9617'] }]);
  const h = await doBacThang(X, dungHoi.hopLe);
  kiem('CA NGƯỢC phán quyết DUNG_HOI mà máy ra mã → tính SAI', h.T2.sai === 1 && h.caSai.length >= 1 && h.caSai[0].luatMay.length > 0, JSON.stringify(h));
}
xong();
