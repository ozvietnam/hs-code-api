#!/usr/bin/env node
// "Song kiếm hợp bích": đo biểu thuế hs-code-api × sổ đăng ký cộng đồng oz-wiki-plhq trên TOÀN BỘ mã HS.
//   1. Độ phủ: văn bản mà cột chính sách dẫn, sổ cộng đồng có / chưa có
//   2. Hiệu lực: mã HS đang dẫn văn bản còn hiệu lực / đã hết / chưa xác minh
//   3. Hai lớp cảnh báo: quy tắc KTCN 2026 riêng của hs-code-api vs sổ cộng đồng — trùng, chỉ một bên
//   4. Việc trả ngược cho kho cộng đồng (văn bản thiếu, văn bản cần đối chiếu theo số mã HS chịu ảnh hưởng)
//   5. Thư viện văn bản riêng (data/legal-docs.json) lệch tình trạng với sổ cộng đồng
//   node scripts/bench-plhq.mjs [--json]   → in markdown; --json ghi data/plhq-bench-latest.json
import { writeFileSync } from 'fs';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { taxData } = require('../lib/data.js');
const { registryReview, registryMeta, libraryConflicts } = require('../lib/plhq-registry.js');
const { listDocs } = require('../lib/legal-docs.js');
const { policyBasisReview } = require('../lib/policy-regime.js');

const rows = Object.values(taxData);
const meta = registryMeta();
if (!meta) { console.error('Chưa có data/plhq-registry.json — chạy node scripts/sync-plhq.mjs'); process.exit(1); }

const coCs = rows.filter((r) => String(r.cs || '').trim());
const vanBan = new Map(); // khoá hiển thị → { found, tinhTrang, verified, hs: Set }
const loaiDong = { tatCaConHieuLuc: 0, coVanBanHetHieuLuc: 0, coVanBanChuaXacMinh: 0, coVanBanMotPhanHoacChuaCoHieuLuc: 0, coVanBanChuaCoTrongSo: 0, khongTrichDuoc: 0 };
const canhBao = { chiQuyTac: 0, chiSoCongDong: 0, caHai: 0, khongCo: 0 };
const soThem = new Map(); // văn bản sổ cộng đồng bắt thêm → số mã HS
let daDoiChieuDong = 0;

for (const r of coCs) {
  const reg = registryReview(r.cs);
  if (!reg) { loaiDong.khongTrichDuoc += 1; continue; }
  for (const c of reg.citations) {
    const k = c.found ? c.soHieu : c.cited;
    if (!vanBan.has(k)) vanBan.set(k, { found: c.found, tinhTrang: c.tinhTrang || null, verified: !!c.hieuLucDaDoiChieu, thay: c.biThayTheBoi || [], hs: new Set() });
    vanBan.get(k).hs.add(r.hs);
  }
  const f = reg.citations.filter((c) => c.found);
  if (reg.counts.notFound) loaiDong.coVanBanChuaCoTrongSo += 1;
  if (f.some((c) => c.tinhTrang === 'HET_HIEU_LUC' || c.tinhTrang === 'TAM_NGUNG_HIEU_LUC')) loaiDong.coVanBanHetHieuLuc += 1;
  else if (f.some((c) => c.tinhTrang === 'CHUA_XAC_MINH')) loaiDong.coVanBanChuaXacMinh += 1;
  else if (f.some((c) => c.tinhTrang === 'HET_HIEU_LUC_MOT_PHAN' || c.tinhTrang === 'CHUA_CO_HIEU_LUC')) loaiDong.coVanBanMotPhanHoacChuaCoHieuLuc += 1;
  else if (!reg.counts.notFound && f.every((c) => c.tinhTrang === 'CON_HIEU_LUC')) loaiDong.tatCaConHieuLuc += 1;
  if (f.length && f.every((c) => c.hieuLucDaDoiChieu)) daDoiChieuDong += 1;

  // Đối chiếu độc lập: quy tắc KTCN 2026 (căn cứ đã/gần chắc bị thay) vs sổ cộng đồng (văn bản HẾT/TẠM NGƯNG).
  const pb = policyBasisReview(r.cs);
  const quyTac = (pb?.items || []).some((i) => i.source === 'hs-code-api' && ['REPLACED', 'LIKELY_REPLACED'].includes(i.relation));
  const soCong = f.some((c) => c.tinhTrang === 'HET_HIEU_LUC' || c.tinhTrang === 'TAM_NGUNG_HIEU_LUC');
  const cong = (pb?.items || []).filter((i) => i.source === 'oz-wiki-plhq');
  if (quyTac && soCong) canhBao.caHai += 1;
  else if (quyTac) canhBao.chiQuyTac += 1;
  else if (soCong) canhBao.chiSoCongDong += 1;
  else canhBao.khongCo += 1;
  for (const i of cong) soThem.set(i.id.replace(/^plhq:/, ''), (soThem.get(i.id.replace(/^plhq:/, '')) || 0) + 1);
}

const ds = [...vanBan.entries()].map(([k, v]) => ({ soHieu: k, found: v.found, tinhTrang: v.tinhTrang, verified: v.verified, thay: v.thay, soMaHs: v.hs.size }))
  .sort((a, b) => b.soMaHs - a.soMaHs);
const timThay = ds.filter((d) => d.found);
const ketQua = {
  ngay: new Date().toISOString().slice(0, 10),
  registryVersion: meta.registryVersion,
  soVanBanTrongSo: meta.total,
  maHs: { tong: rows.length, coChinhSach: coCs.length, ...loaiDong, daDoiChieuHetCacVanBan: daDoiChieuDong },
  vanBanDuocDan: { tong: ds.length, coTrongSo: timThay.length, chuaCoTrongSo: ds.length - timThay.length, daDoiChieuHieuLuc: timThay.filter((d) => d.verified).length },
  haiLopCanhBao: canhBao,
  soCongDongBatThem: [...soThem.entries()].map(([soHieu, n]) => ({ soHieu, soMaHs: n })).sort((a, b) => b.soMaHs - a.soMaHs),
  traNguocChoKho: {
    chuaCoTrongSo: ds.filter((d) => !d.found).map(({ soHieu, soMaHs }) => ({ soHieu, soMaHs })),
    canDoiChieuTruoc: timThay.filter((d) => !d.verified).slice(0, 20).map(({ soHieu, tinhTrang, soMaHs }) => ({ soHieu, tinhTrang, soMaHs })),
  },
  theoVanBan: ds,
};
// 5. Lệch tình trạng: thư viện riêng ghi còn hiệu lực mà sổ cộng đồng ghi hết (hoặc ngược lại).
const thuVien = listDocs();
const lech = libraryConflicts(thuVien);
ketQua.thuVienLechSo = {
  tongThuVien: thuVien.length,
  lech: lech.map((x) => ({ code: x.code, thuVien: x.libraryStatus, so: x.registry.tinhTrang, soHieu: x.registry.soHieu, hieuLucDaDoiChieu: x.registry.hieuLucDaDoiChieu, xacMinh: x.registry.xacMinh })),
};

const pct = (a, b) => (b ? `${Math.round((a / b) * 1000) / 10}%` : '—');
const m = ketQua.maHs;
const md = [
  `# hs-code-api × oz-wiki-plhq — ${ketQua.ngay}`,
  '',
  `Sổ cộng đồng phiên bản ${meta.registryVersion} (${meta.total} văn bản). Biểu thuế ${m.tong} mã, ${m.coChinhSach} mã có cột chính sách.`,
  '',
  '## 1. Độ phủ văn bản',
  `- Văn bản được biểu thuế dẫn: **${ketQua.vanBanDuocDan.tong}**; sổ cộng đồng có **${ketQua.vanBanDuocDan.coTrongSo}** (${pct(ketQua.vanBanDuocDan.coTrongSo, ketQua.vanBanDuocDan.tong)}); đã đối chiếu hiệu lực nguồn A: **${ketQua.vanBanDuocDan.daDoiChieuHieuLuc}**.`,
  '',
  '## 2. Mã HS theo tình trạng văn bản được dẫn',
  '| Nhóm | Số mã | Tỷ lệ |',
  '|---|---|---|',
  `| Dẫn ít nhất một văn bản HẾT hiệu lực / tạm ngưng | ${m.coVanBanHetHieuLuc} | ${pct(m.coVanBanHetHieuLuc, m.coChinhSach)} |`,
  `| Không hết hiệu lực nhưng có văn bản CHƯA XÁC MINH | ${m.coVanBanChuaXacMinh} | ${pct(m.coVanBanChuaXacMinh, m.coChinhSach)} |`,
  `| Có văn bản hết hiệu lực MỘT PHẦN hoặc CHƯA có hiệu lực | ${m.coVanBanMotPhanHoacChuaCoHieuLuc} | ${pct(m.coVanBanMotPhanHoacChuaCoHieuLuc, m.coChinhSach)} |`,
  `| Mọi văn bản được dẫn đều ghi còn hiệu lực | ${m.tatCaConHieuLuc} | ${pct(m.tatCaConHieuLuc, m.coChinhSach)} |`,
  `| Có văn bản sổ cộng đồng chưa có | ${m.coVanBanChuaCoTrongSo} | ${pct(m.coVanBanChuaCoTrongSo, m.coChinhSach)} |`,
  `| Không trích được số hiệu | ${m.khongTrichDuoc} | ${pct(m.khongTrichDuoc, m.coChinhSach)} |`,
  `| Mọi văn bản đã đối chiếu hiệu lực nguồn A | ${m.daDoiChieuHetCacVanBan} | ${pct(m.daDoiChieuHetCacVanBan, m.coChinhSach)} |`,
  '',
  '## 3. Hai lớp cảnh báo căn cứ cũ',
  `Tính độc lập (quy tắc = căn cứ đã/gần chắc bị thay; sổ = văn bản được dẫn HẾT hiệu lực/tạm ngưng):`,
  `- Cả hai cùng báo: **${canhBao.caHai}** mã · chỉ quy tắc KTCN 2026 của hs-code-api: **${canhBao.chiQuyTac}** · chỉ sổ cộng đồng: **${canhBao.chiSoCongDong}** · không bên nào: ${canhBao.khongCo}.`,
  ...(ketQua.soCongDongBatThem.length ? ['- Cảnh báo mới /api/tax nhận thêm từ sổ cộng đồng (quy tắc riêng không có):', ...ketQua.soCongDongBatThem.map((x) => `  - ${x.soHieu}: ${x.soMaHs} mã`)] : []),
  '',
  '## 4. Việc trả ngược cho kho cộng đồng',
  `- Chưa có trong sổ (${ketQua.traNguocChoKho.chuaCoTrongSo.length}): ${ketQua.traNguocChoKho.chuaCoTrongSo.map((x) => `${x.soHieu} (${x.soMaHs} mã)`).join(', ') || 'không'}`,
  '- Cần đối chiếu hiệu lực trước (xếp theo số mã HS chịu ảnh hưởng):',
  ...ketQua.traNguocChoKho.canDoiChieuTruoc.map((x, i) => `  ${i + 1}. ${x.soHieu} — ${x.tinhTrang} — ${x.soMaHs} mã`),
  '',
  '## 5. Thư viện /api/legal-docs lệch tình trạng với sổ cộng đồng',
  `${ketQua.thuVienLechSo.lech.length}/${ketQua.thuVienLechSo.tongThuVien} văn bản lệch — đối chiếu nguồn A rồi sửa bên sai:`,
  ...ketQua.thuVienLechSo.lech.map((x) => `- ${x.code}: thư viện ${x.thuVien}, sổ ${x.so} (${x.xacMinh}${x.hieuLucDaDoiChieu ? ', đã đối chiếu' : ''})`),
].join('\n');
console.log(md);
if (process.argv.includes('--json')) {
  writeFileSync(join(ROOT, 'data', 'plhq-bench-latest.json'), JSON.stringify(ketQua, null, 1) + '\n');
  console.error('Đã ghi data/plhq-bench-latest.json');
}
