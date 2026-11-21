#!/usr/bin/env node
/**
 * Cổng máy L4 (docs/luat-duong-khach.md): bảng đấu nối data/luat/dau-noi.json phải khớp mã.
 *
 * Vì sao: sổ tay nhóm và sổ ranh giới PN6 nâng cấp ở kho nhưng /api/identify không đọc, /api/classify nhánh
 * earlyExitHoiTuR1 bỏ qua — không ai biết cho tới khi khách gặp (21/11/2026). Bảng này trả lời "đường nào đọc tri
 * thức nào" mà không phải đọc lại mã; test này giữ cho bảng không nói dối.
 *
 * Đối chiếu TĨNH (chỉ đọc tệp, không nạp mã sản phẩm, không LLM): đồ thị require/import thật của từng tệp trong api/.
 * ĐỎ khi: route chưa khai · khai "co" mà mã không nạp module đọc kho · khai "khong" mà mã đã nạp · cờ ghi trong bảng
 * không có trong mã · có tệp mới đọc kho mà chưa khai là module đọc · nhánh bỏ qua đã biến mất khỏi mã.
 */
import { doc, docJson, co, tepMa, baoDong, boKiem, coTrongDoan } from './lib-luat.mjs';

const { kiem, xong } = boKiem('test-dau-noi');
const bang = docJson('data/luat/dau-noi.json');
const bangCo = new Set(docJson('data/luat/bang-co.json').co.map((c) => c.ten));
const routes = docJson('routes.json').rewrites || [];
const LOAI = new Set(['phan-loai', 'soan-thao', 'tra-cuu']);
const RE_THE = /^OZV-\d+$/;
const KHO = Object.keys(bang.kho);
const khongChuThich = (s) => s.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');

// ── 1. Mọi tệp xử lý trong api/ đều được khai ────────────────────────────────────────────────────────────────────
const tepApi = tepMa('api');
const duong = bang.duong;
const theoDuong = new Map(duong.map((d) => [d.duong, d]));
kiem(`bảng không khai trùng đường (${duong.length} đường)`, theoDuong.size === duong.length);
const chuaKhai = tepApi.filter((t) => !duong.some((d) => d.tep === t));
kiem(`mọi tệp api/*.js đều có trong bảng (${tepApi.length} tệp)`, chuaKhai.length === 0, `chưa khai: ${chuaKhai.join(', ')} — thêm vào data/luat/dau-noi.json mục "duong"`);
const tepMat = duong.filter((d) => !co(d.tep)).map((d) => `${d.duong} → ${d.tep}`);
kiem('mọi đường trong bảng trỏ tới tệp có thật', tepMat.length === 0, tepMat.join(', '));
const loaiSai = duong.filter((d) => !LOAI.has(d.loai) || typeof d.congGoi !== 'boolean' || typeof d.llm !== 'boolean').map((d) => d.duong);
kiem('mọi đường có loai hợp lệ + congGoi + llm', loaiSai.length === 0, loaiSai.join(', '));

// ── 2. routes.json: đường gộp (rewrite) vào tệp xử lý có đường khách thì phải khai riêng ───────────────────────────
const dichCua = (r) => { const m = /^\/api\/([a-z0-9_-]+)/i.exec(r.destination || ''); return m ? `api/${m[1]}.js` : null; };
const tepKhach = new Set(duong.filter((d) => d.loai !== 'tra-cuu').map((d) => d.tep));
const rwThieu = routes.filter((r) => tepKhach.has(dichCua(r)) && !theoDuong.has(r.source)).map((r) => `${r.source} → ${r.destination}`);
kiem('mọi đường gộp trong routes.json vào tệp xử lý đường khách đều được khai', rwThieu.length === 0, `chưa khai: ${rwThieu.join(' ; ')}`);
const rwLac = routes.filter((r) => dichCua(r) && !co(dichCua(r))).map((r) => r.source);
kiem('routes.json không trỏ tới tệp api/ không tồn tại', rwLac.length === 0, rwLac.join(', '));
const modeSai = duong.filter((d) => d.mode && !routes.some((r) => r.source === d.duong && dichCua(r) === d.tep)).map((d) => d.duong);
kiem('đường khai "mode" có dòng gộp tương ứng trong routes.json', modeSai.length === 0, modeSai.join(', '));

// ── 3. Kho tri thức: module đọc kho phải đủ ────────────────────────────────────────────────────────────────────────
const maSanPham = [...tepMa('lib'), ...tepApi];
for (const [k, kho] of Object.entries(bang.kho)) {
  const mat = kho.moDun.filter((m) => !co(m));
  kiem(`kho ${k}: module đọc kho có thật`, mat.length === 0, mat.join(', '));
  if (!kho.dauVet.length) continue;
  const coDau = (t) => { const s = khongChuThich(doc(t)); return kho.dauVet.some((d) => s.includes(d)); };
  const sot = maSanPham.filter((t) => coDau(t) && !kho.moDun.includes(t));
  kiem(`kho ${k}: không có tệp nào đọc ${kho.duLieu} mà chưa khai là module đọc`, sot.length === 0, `thêm vào kho.${k}.moDun (rồi soát lại các đường nạp nó): ${sot.join(', ')}`);
  const thua = kho.moDun.filter((m) => co(m) && !coDau(m));
  kiem(`kho ${k}: module đã khai còn đọc kho thật`, thua.length === 0, `không còn dấu vết đọc kho: ${thua.join(', ')}`);
}

// ── 4. Đường phân loại: khai đủ 4 kho + lõi câu hỏi, khớp đồ thị require ───────────────────────────────────────────
const chuCua = (tep) => [...baoDong(tep)].map((t) => doc(t)).join('\n');
const _co = new Map();
const coCuaTep = (tep) => { if (!_co.has(tep)) _co.set(tep, coTrongDoan(chuCua(tep))); return _co.get(tep); };
const loiMoDun = bang.loiCauHoi.moDun.filter((m) => co(m));
kiem('lõi câu hỏi: có ít nhất một module lõi tồn tại trên cây này', loiMoDun.length > 0);

for (const d of duong.filter((x) => x.loai === 'phan-loai')) {
  if (d.nhu) {
    const g = theoDuong.get(d.nhu);
    kiem(`${d.duong}: "nhu" trỏ tới đường cùng tệp xử lý`, Boolean(g && g.tep === d.tep && g.doc), d.nhu);
    continue;
  }
  const dong = baoDong(d.tep);
  for (const k of KHO) {
    const e = d.doc && d.doc[k];
    if (!kiem(`${d.duong}: có khai kho ${k}`, e && ['co', 'khong'].includes(e.trangThai))) continue;
    const napDuoc = bang.kho[k].moDun.filter((m) => dong.has(m));
    if (e.trangThai === 'co') {
      const qua = Array.isArray(e.qua) ? e.qua : [];
      const lac = qua.filter((m) => !bang.kho[k].moDun.includes(m) || !dong.has(m));
      kiem(`${d.duong} · ${k}: khai "co" và mã nạp đúng module đã ghi`, qua.length > 0 && lac.length === 0, qua.length ? `mã của ${d.tep} KHÔNG nạp: ${lac.join(', ')}` : 'thiếu "qua"');
      const coLa = (e.co || []).filter((c) => !bangCo.has(c) || !coCuaTep(d.tep).has(c));
      kiem(`${d.duong} · ${k}: cờ chặn có trong bảng cờ và trong mã của đường này`, coLa.length === 0, coLa.join(', '));
    } else {
      kiem(`${d.duong} · ${k}: khai "khong" có lý do`, typeof e.lyDo === 'string' && e.lyDo.length >= 10);
      if (!d.mode) kiem(`${d.duong} · ${k}: khai "khong" và mã đúng là không nạp module đọc kho`, napDuoc.length === 0, `mã đã nạp ${napDuoc.join(', ')} — sửa bảng thành "co" (kèm "qua" + cờ) hoặc gỡ nạp`);
      if (d.congGoi && (k === 'soTayNhom' || k === 'soPn6')) kiem(`${d.duong} · ${k}: Cổng gọi mà chưa đọc sổ ⇒ có số thẻ theo dõi`, RE_THE.test(e.the || ''), 'thiếu "the": "OZV-…"');
    }
  }
  const l = d.loiCauHoi;
  if (!kiem(`${d.duong}: có khai loiCauHoi`, l && ['co', 'khong', 'khong-hoi'].includes(l.trangThai))) continue;
  const napLoi = loiMoDun.filter((m) => dong.has(m));
  if (l.trangThai === 'co') {
    kiem(`${d.duong}: khai dùng lõi câu hỏi và mã có nạp lõi`, napLoi.length > 0, `mã của ${d.tep} không nạp tệp nào trong ${loiMoDun.join(', ')}`);
    const coLa = (l.co || []).filter((c) => !bangCo.has(c) || !coCuaTep(d.tep).has(c));
    kiem(`${d.duong}: cờ chặn lõi câu hỏi có trong bảng cờ và trong mã`, coLa.length === 0, coLa.join(', '));
  } else {
    const ngoaiChinhNo = napLoi.filter((m) => m !== d.tep);
    if (!d.mode) kiem(`${d.duong}: khai chưa dùng lõi câu hỏi và mã đúng là chưa nạp lõi`, ngoaiChinhNo.length === 0, `mã đã nạp ${ngoaiChinhNo.join(', ')} — sửa loiCauHoi thành "co" kèm cờ chặn ("co": ["HS_…"])`);
    if (l.trangThai === 'khong') {
      kiem(`${d.duong}: chưa dùng lõi câu hỏi có lý do`, typeof l.lyDo === 'string' && l.lyDo.length >= 10);
      if (d.congGoi) kiem(`${d.duong}: Cổng gọi mà câu hỏi chưa qua lõi ⇒ có số thẻ theo dõi`, RE_THE.test(l.the || ''), 'thiếu "the": "OZV-…"');
    }
  }
}

// ── 5. Nhánh bỏ qua đã biết: còn trong mã thì còn trong bảng, hết thì phải xoá ────────────────────────────────────
for (const n of bang.nhanhBoQua) {
  const con = co(n.tep) && doc(n.tep).includes(n.dauVet);
  kiem(`nhánh bỏ qua "${n.ten}": còn trong ${n.tep}`, con, 'nhánh đã đổi tên hoặc đã gỡ — cập nhật hoặc xoá mục này khỏi nhanhBoQua');
  kiem(`nhánh bỏ qua "${n.ten}": có thẻ, lý do, đường và kho hợp lệ`, RE_THE.test(n.the || '') && (n.lyDo || '').length >= 10 && theoDuong.has(n.duong) && (n.boQua || []).length > 0 && n.boQua.every((k) => KHO.includes(k)));
}

xong();
