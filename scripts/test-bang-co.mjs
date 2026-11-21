#!/usr/bin/env node
/**
 * Cổng máy L1 + L5 + L8 (docs/luat-duong-khach.md): bảng cờ data/luat/bang-co.json phải khớp mã.
 *
 * Vì sao:
 *   - L8: docs/backlog/08 ghi máy thật chạy HS_SO_TAY=gates trong khi Dockerfile đặt full từ PR #361.
 *   - L1: công tắc của PR #1517 mặc định BẬT, không quay lui được; sai nhóm 5/10 trên máy thật.
 *   - L5: HS_HO_SO=shadow ghi "chạy bóng 5 ngày rồi trình bật" nhưng không ai là chủ lấy số, nằm im.
 *
 * Tĩnh, không LLM. ĐỎ khi:
 *   1. lib/, api/, server.js đọc một cờ HS_* chưa có trong bảng; hoặc bảng còn cờ mà mã đã bỏ.
 *   2. Đoạn mã chứng minh mặc định (chungCu) không còn nguyên văn trong tệp ⇒ ai đó đã sửa cách đọc cờ.
 *   3. ENV HS_* trong Dockerfile lệch cột "dockerfile" của bảng.
 *   4. Tài liệu vận hành nhắc một cờ HS_* không có trong bảng.
 *   5. Cờ đổi quyết định LLM (doiQuyetDinhLLM) mà bật sẵn, ngoài danh sách cờ cũ (danh sách chỉ được ngắn đi).
 *   6. Cờ có chế độ shadow thiếu khối "bong"; đang chạy bóng mà thiếu chủ / ngày xét / tiêu chí; hoặc QUÁ NGÀY XÉT.
 *
 * Mục 6 phụ thuộc ngày: tới ngày xét mà chưa quyết thì `npm test` đỏ cho mọi PR. Đó là chủ ý (L5: "quá ngày xét mà
 * chưa quyết là lỗi"). Cách gỡ ĐÚNG: chủ cờ quyết bật / tắt (sửa dangChayMayThat), hoặc gia hạn bằng cách sửa ngayXet
 * và thêm một dòng vào bong.giaHan [{ tu, den, lyDo }]. Đặt LUAT_HOM_NAY=YYYY-MM-DD để thử ngày khác.
 */
import { readdirSync } from 'node:fs';
import { GOC, doc, docJson, co, tepSanPham, boKiem, coTrongDoan } from './lib-luat.mjs';

const TRAN_LLM_BAT_SAN = 9; // 21/11/2026 — chỉ được HẠ. Tăng phải có ADR mới + QT duyệt.

const { kiem, xong } = boKiem('test-bang-co');
const bang = docJson('data/luat/bang-co.json');
const theoTen = new Map(bang.co.map((c) => [c.ten, c]));
const khongChuThich = (s) => s.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');

// ── 1. Cờ trong mã ⇄ cờ trong bảng ────────────────────────────────────────────────────────────────────────────────
const trongMa = new Set();
for (const t of tepSanPham()) for (const f of coTrongDoan(khongChuThich(doc(t)))) trongMa.add(f);
kiem('bảng không khai trùng tên cờ', theoTen.size === bang.co.length);
const chuaKhai = [...trongMa].filter((f) => !theoTen.has(f)).sort();
kiem(`mọi cờ HS_* trong mã đều có trong bảng (${trongMa.size} cờ)`, chuaKhai.length === 0,
  `chưa khai: ${chuaKhai.join(', ')} — thêm vào data/luat/bang-co.json (xem docs/luat-duong-khach.md mục "Thêm cờ HS_* mới")`);
const moCoi = bang.co.filter((c) => !trongMa.has(c.ten)).map((c) => c.ten);
kiem('bảng không còn cờ mà mã đã bỏ', moCoi.length === 0, `xoá khỏi bảng: ${moCoi.join(', ')}`);

// ── 2. Từng dòng đủ trường + đoạn mã chứng minh mặc định còn nguyên ──────────────────────────────────────────────
const LOAI = new Set(['cong-tac', 'che-do', 'so', 'duong-dan', 'danh-sach', 'bi-mat', 'tien-to', 'thong-tin']);
const thieuTruong = bang.co.filter((c) => !c.macDinh || !LOAI.has(c.loai) || !c.chu || !(c.mucDich || '').trim() || typeof c.doiQuyetDinhLLM !== 'boolean' || !c.chungCu?.tep || !c.chungCu?.doan).map((c) => c.ten);
kiem('mọi cờ có macDinh, loai, chu, mucDich, doiQuyetDinhLLM, chungCu', thieuTruong.length === 0, thieuTruong.join(', '));
const congTacThieu = bang.co.filter((c) => (c.loai === 'cong-tac' || c.doiQuyetDinhLLM) && typeof c.macDinhBat !== 'boolean').map((c) => c.ten);
kiem('cờ công tắc và cờ đổi quyết định LLM ghi rõ macDinhBat', congTacThieu.length === 0, congTacThieu.join(', '));
const lech = bang.co.filter((c) => c.chungCu?.tep && !(co(c.chungCu.tep) && doc(c.chungCu.tep).includes(c.chungCu.doan))).map((c) => `${c.ten} (${c.chungCu.tep})`);
kiem('đoạn mã chứng minh mặc định còn nguyên văn trong tệp', lech.length === 0,
  `cách đọc cờ đã đổi: ${lech.join(', ')} — xem lại macDinh / macDinhBat rồi cập nhật chungCu.doan`);
const khongDocCo = bang.co.filter((c) => c.chungCu?.doan && !c.chungCu.doan.includes(c.ten)).map((c) => c.ten);
kiem('đoạn chứng minh có chứa chính tên cờ', khongDocCo.length === 0, khongDocCo.join(', '));

// ── 3. Dockerfile ───────────────────────────────────────────────────────────────────────────────────────────────
const dockerfile = new Map();
for (const m of doc('Dockerfile').matchAll(/^\s*(?:ENV\s+)?(HS_[A-Z0-9_]+)=("[^"]*"|\S+)/gm)) dockerfile.set(m[1], m[2].replace(/^"|"$/g, '').replace(/\\$/, '').trim());
const dkLech = [];
for (const [ten, gt] of dockerfile) if ((theoTen.get(ten) || {}).dockerfile !== gt) dkLech.push(`${ten}: Dockerfile=${gt}, bảng=${(theoTen.get(ten) || {}).dockerfile ?? '(không ghi)'}`);
for (const c of bang.co) if (c.dockerfile !== undefined && !dockerfile.has(c.ten)) dkLech.push(`${c.ten}: bảng ghi dockerfile=${c.dockerfile} nhưng Dockerfile không đặt`);
kiem(`ENV HS_* trong Dockerfile khớp bảng (${dockerfile.size} biến)`, dkLech.length === 0, dkLech.join(' ; '));

// ── 4. Tài liệu vận hành không nhắc cờ không tồn tại ──────────────────────────────────────────────────────────────
const mdTrong = (d) => (co(d) ? readdirSync(`${GOC}/${d}`).filter((f) => f.endsWith('.md')).map((f) => `${d}/${f}`) : []);
const TAI_LIEU = ['AGENTS.md', 'CLAUDE.md', '.env.example', 'docs/luat-duong-khach.md', 'docs/deploy-coolify.md', ...mdTrong('docs/van-hanh')];
const ngoaiMa = bang.tenNgoaiMa?.ten || {};
const ngoaiMaSai = Object.entries(ngoaiMa).filter(([ten, tep]) => !(co(tep) && doc(tep).includes(ten))).map(([ten, tep]) => `${ten} → ${tep}`);
kiem('tên cờ ngoài mã (tenNgoaiMa) trỏ tới tệp còn đọc nó', ngoaiMaSai.length === 0, ngoaiMaSai.join(', '));
const laLa = [];
for (const t of TAI_LIEU.filter((x) => co(x))) {
  for (const m of doc(t).matchAll(/\bHS_[A-Z][A-Z0-9_]*[A-Z0-9]\b/g)) {
    const ten = m[0];
    if (theoTen.has(ten) || ngoaiMa[ten]) continue;
    if ([...theoTen.keys()].some((k) => k.startsWith(`${ten}_`)) && /_$|\*|…|\.\.\./.test(doc(t).slice(m.index + ten.length, m.index + ten.length + 3))) continue; // "HS_HO_SO_HAN_*"
    laLa.push(`${t}: ${ten}`);
  }
}
kiem(`tài liệu vận hành chỉ nhắc cờ có trong bảng (${TAI_LIEU.filter((x) => co(x)).length} tệp)`, laLa.length === 0,
  `${[...new Set(laLa)].join(' ; ')} — sửa tài liệu, hoặc nếu cờ do script đọc thì khai ở tenNgoaiMa`);

// ── 5. L1: cờ đổi quyết định LLM phải mặc định TẮT ────────────────────────────────────────────────────────────────
const batSan = bang.co.filter((c) => c.doiQuyetDinhLLM && (c.macDinhBat === true || c.dockerfile !== undefined)).map((c) => c.ten).sort();
const cu = [...(bang.doiQuyetDinhLLMDangBatSan?.ten || [])].sort();
const moiBat = batSan.filter((t) => !cu.includes(t));
kiem('L1: không có cờ MỚI đổi quyết định LLM mà bật sẵn', moiBat.length === 0,
  `${moiBat.join(', ')} — cờ đổi hành vi LLM trên đường khách phải mặc định TẮT và không đặt trong Dockerfile (L1). Gộp khi tắt, QT bật trên máy thật rồi đo`);
const cuThua = cu.filter((t) => !batSan.includes(t));
kiem('L1: danh sách cờ cũ bật sẵn không còn tên thừa', cuThua.length === 0, `xoá khỏi doiQuyetDinhLLMDangBatSan và hạ trần: ${cuThua.join(', ')}`);
kiem(`L1: danh sách cờ cũ bật sẵn (${cu.length}) khớp trần ${TRAN_LLM_BAT_SAN}`, cu.length === TRAN_LLM_BAT_SAN, 'danh sách chỉ được ngắn đi; ngắn đi rồi thì hạ TRAN_LLM_BAT_SAN cho khớp');

// ── 6. L5: cờ có chế độ shadow ───────────────────────────────────────────────────────────────────────────────────
const homNay = process.env.LUAT_HOM_NAY || new Date().toISOString().slice(0, 10);
const RE_NGAY = /^\d{4}-\d{2}-\d{2}$/;
const coBong = bang.co.filter((c) => (c.cheDo || []).includes('shadow'));
kiem(`L5: có ${coBong.length} cờ có chế độ shadow, cờ nào cũng có khối "bong"`, coBong.every((c) => c.bong && typeof c.bong.dangChayMayThat === 'boolean' && c.bong.chu && /^OZV-\d+$/.test(c.bong.the || '')),
  coBong.filter((c) => !c.bong || typeof c.bong.dangChayMayThat !== 'boolean' || !c.bong.chu || !/^OZV-\d+$/.test(c.bong.the || '')).map((c) => c.ten).join(', '));
for (const c of coBong.filter((x) => x.bong && x.bong.dangChayMayThat)) {
  const b = c.bong;
  const du = RE_NGAY.test(b.ngayXet || '') && (b.tieuChiBat || '').length >= 20 && (b.tieuChiTat || '').length >= 20 && (b.laySoODau || '').length >= 10;
  kiem(`L5: ${c.ten} đang chạy bóng ⇒ đủ chủ, ngày xét, tiêu chí bật, tiêu chí tắt, nơi lấy số`, du);
  if (du) {
    kiem(`L5: ${c.ten} chưa quá ngày xét ${b.ngayXet} (hôm nay ${homNay}, chủ: ${b.chu}, thẻ ${b.the})`, homNay <= b.ngayXet,
      `QUÁ NGÀY XÉT. ${b.chu} phải quyết: bật, tắt (sửa dangChayMayThat), hoặc gia hạn (sửa ngayXet + thêm dòng vào bong.giaHan kèm lý do). Lấy số: ${b.laySoODau}`);
    const gh = Array.isArray(b.giaHan) ? b.giaHan : [];
    kiem(`L5: ${c.ten} mỗi lần gia hạn có lý do`, gh.every((g) => RE_NGAY.test(g.tu || '') && RE_NGAY.test(g.den || '') && (g.lyDo || '').length >= 10));
  }
}

xong();
