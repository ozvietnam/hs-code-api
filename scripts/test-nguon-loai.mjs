#!/usr/bin/env node
import './test-isolate-data.mjs';
/** lib/nguon-loai.js — nhãn loại nguồn dùng chung (#236 việc 2): tệp AI chưa kiểm được gắn nhãn ở mọi nơi nó lộ ra. */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const N = require('../lib/nguon-loai.js');

let passed = 0; let failed = 0;
const assert = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ` ${JSON.stringify(extra).slice(0, 300)}`}`); if (ok) passed += 1; else failed += 1; };

assert('5 nhãn mục + nhãn gộp DA_KIEM có mô tả', ['NGUYEN_VAN', 'MAY_SUY', 'AI_DA_KIEM', 'NGUOI_DUYET', 'AI_CHUA_KIEM', 'DA_KIEM'].every((k) => typeof N.NHAN[k] === 'string'));
assert('ba tệp AI cũ + hs-context + tax-enriched → AI_CHUA_KIEM', ['explanatory-notes.json', 'legal-notes-enriched.json', 'loai-khac-index.json', 'hs-context.json', 'tax-enriched.json'].every((f) => N.nhanCuaTep(f) === 'AI_CHUA_KIEM'));
assert('nguyên văn: tax, chú giải, SEN, TB-TCHQ, WCO; đã kiểm: so-tay/*, conflicts, decision-tables; tệp lạ → null (không đoán)',
  ['tax.json', 'chu-giai-heading.json', 'sen-2022.json', 'precedents.json', 'wco-op/opinions.json'].every((f) => N.nhanCuaTep(f) === 'NGUYEN_VAN')
  && N.nhanCuaTep('data/so-tay/8504.json') === 'DA_KIEM' && N.nhanCuaTep('conflicts.json') === 'DA_KIEM' && N.nhanCuaTep('decision-tables/8504.json') === 'DA_KIEM' && N.nhanCuaTep('gi-do.json') === null);
assert('duocTrich: chỉ AI_CHUA_KIEM bị cấm; thiếu nhãn (mục cũ đã qua máy kiểm) được', N.duocTrich('AI_CHUA_KIEM') === false && N.duocTrich(undefined) === true && N.duocTrich('AI_DA_KIEM') === true && N.duocTrich('MAY_SUY') === true);

// Mọi nơi tệp AI lộ ra phản hồi đều mang nhãn
const EN = require('../lib/explanatory-notes-index.js');
const sum = EN.getNoteSummaryForHs('85044090');
assert('explanatoryNote (classify/suggest/engine-loop) mang nguonLoai AI_CHUA_KIEM + ghiChu', sum && sum.nguonLoai === 'AI_CHUA_KIEM' && /chưa kiểm/.test(sum.ghiChu) && EN.NGUON_LOAI === 'AI_CHUA_KIEM', sum);
const chain = require('../lib/gir-notes.js').buildNoteChain('85044090');
const nat = chain.find((n) => n.level === 'NATIONAL');
assert('/api/notes chuỗi chú giải: cấp NATIONAL (từ explanatory-notes) mang nguonLoai AI_CHUA_KIEM; cấp trên không gắn nhãn AI', nat && nat.nguonLoai === 'AI_CHUA_KIEM' && chain.filter((n) => n.level !== 'NATIONAL').every((n) => !n.nguonLoai), chain.map((n) => n.level));
const lb = require('../lib/legal-basis.js').canCuPhapLy({ status: 'REVIEW', topHs: '85044090' }).cacBuoc[1].taiLieu[0];
assert('canCuPhapLy 6.1.a dựa nguyên văn chú giải nhóm (chu-giai-heading#nhom), nêu nhóm + toàn văn, ghi rõ explanatoryNote là AI chưa kiểm', lb.id === '6.1.a' && lb.trangThai === 'CO_NOI_DUNG' && lb.nhom === '8504' && lb.toanVan === true && /AI_CHUA_KIEM/.test(lb.ghiChu) && !/explanatoryNote\)/.test(lb.nguon), lb);
const lb9 = require('../lib/legal-basis.js').canCuPhapLy({ status: 'REVIEW', topHs: '98010000' }).cacBuoc[1].taiLieu[0];
assert('6.1.a: nhóm không có chú giải nguyên văn (ch.98) → KHONG_CO_DU_LIEU_CHO_MA_NAY dù explanatory-notes có thể có chữ', lb9.trangThai === 'KHONG_CO_DU_LIEU_CHO_MA_NAY', lb9);
const S = require('../lib/hs-tree-sources.js').sourcesOf('85044090');
assert('hs-tree-sources dùng chung bảng nhãn: explanatoryNotes/loaiKhacIndex AI_CHUA_KIEM, soTay DA_KIEM', S.nguon.explanatoryNotes?.nhan === 'AI_CHUA_KIEM' && (!S.nguon.loaiKhacIndex || S.nguon.loaiKhacIndex.nhan === 'AI_CHUA_KIEM') && S.nguon.soTay?.nhan === 'DA_KIEM', S.nguon);
// Dữ liệu thật đã nâng cấp: mọi mục sổ tay có nhãn, không mục nào AI_CHUA_KIEM
const fs = require('node:fs');
let thieu = 0; let cam = 0; let coCay = 0; let n = 0;
for (const f of fs.readdirSync('data/so-tay')) {
  if (!/^\d{4}\.json$/.test(f)) continue; n += 1;
  const s = JSON.parse(fs.readFileSync(`data/so-tay/${f}`, 'utf8'));
  if (s.cay?.nguonLoai === 'MAY_SUY' && Array.isArray(s.cay.nut)) coCay += 1;
  for (const k of ['dieuKienVao', 'loaiTru', 'phanBiet', 'tieuChi6', 'dong8']) for (const it of s[k] || []) { if (!it.nguonLoai) thieu += 1; if (it.nguonLoai === 'AI_CHUA_KIEM') cam += 1; }
}
assert(`sổ tay thật (${n} nhóm): mọi mục có nguonLoai, không mục AI_CHUA_KIEM, mọi nhóm có khối cay MAY_SUY`, n > 0 && thieu === 0 && cam === 0 && coCay === n, { thieu, cam, coCay, n });

// ── L0e (#550): nhãn CLAUDE_DUYET — một hệ nhãn duy nhất cho bộ đề / ranh giới do Claude chấm duyệt độc lập ──
assert('NHAN.CLAUDE_DUYET có mô tả và nói rõ KHÔNG phải người có chuyên môn', typeof N.NHAN.CLAUDE_DUYET === 'string' && /Claude chấm duyệt độc lập/.test(N.NHAN.CLAUDE_DUYET) && /KHÔNG phải người có chuyên môn/.test(N.NHAN.CLAUDE_DUYET), N.NHAN.CLAUDE_DUYET);
assert('NHAN_MUC_SOAN = AI_DA_KIEM < CLAUDE_DUYET < NGUOI_DUYET (tin cậy tăng dần)', N.NHAN_MUC_SOAN.join() === 'AI_DA_KIEM,CLAUDE_DUYET,NGUOI_DUYET', N.NHAN_MUC_SOAN);
assert('bộ đề mô tả data/bench/mo-ta-bo-de.json → CLAUDE_DUYET', N.nhanCuaTep('data/bench/mo-ta-bo-de.json') === 'CLAUDE_DUYET');
assert('bench khác chưa khai (vd cay-20-nhom) KHÔNG bị gán CLAUDE_DUYET hàng loạt → null (không đoán)', N.nhanCuaTep('data/bench/cay-20-nhom-2026-10-11.json') === null && N.nhanCuaTep('bench/identify-gold-20.jsonl') === null);
assert('NHAN_BO_DE: nhãn duy nhất bộ đề nhận là CLAUDE_DUYET', N.NHAN_BO_DE === 'CLAUDE_DUYET');
assert('duocTrich(CLAUDE_DUYET) = true', N.duocTrich('CLAUDE_DUYET') === true);
assert('cấp nút cây: CLAUDE_DUYET / AI_DA_KIEM / NGUOI_DUYET gộp vào DA_KIEM; NGUYEN_VAN, AI_CHUA_KIEM giữ; nhãn lạ → null',
  typeof N.nhanNut === 'function' && ['CLAUDE_DUYET', 'AI_DA_KIEM', 'NGUOI_DUYET'].every((x) => N.nhanNut(x) === 'DA_KIEM')
  && N.nhanNut('NGUYEN_VAN') === 'NGUYEN_VAN' && N.nhanNut('AI_CHUA_KIEM') === 'AI_CHUA_KIEM' && N.nhanNut('XYZ') === null);
{
  const ST = require('../lib/so-tay.js');
  const s8509 = JSON.parse(fs.readFileSync('data/so-tay/8509.json', 'utf8'));
  const it = s8509.dong8[0];
  const src = ST.sourcesFor('8509');
  assert('máy kiểm sổ tay: mục nguonLoai CLAUDE_DUYET qua được (như NGUOI_DUYET), AI_CHUA_KIEM vẫn bị loại',
    ST.checkItem('dong8', { ...it, nguonLoai: 'CLAUDE_DUYET' }, src, '8509') === null && ST.checkItem('dong8', { ...it, nguonLoai: 'NGUOI_DUYET' }, src, '8509') === null
    && ST.checkItem('dong8', { ...it, nguonLoai: 'AI_CHUA_KIEM' }, src, '8509') === 'nguon-loai-khong-hop-le:AI_CHUA_KIEM');
  const v = ST.verifySoTay({ dong8: [{ ...it, nguonLoai: 'CLAUDE_DUYET' }] }, '8509', src);
  assert('verifySoTay giữ nguyên nhãn CLAUDE_DUYET (không ghi đè thành AI_DA_KIEM)', v.soTay.dong8?.[0]?.nguonLoai === 'CLAUDE_DUYET', v.soTay.dong8);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
