#!/usr/bin/env node
// Danh sách VĂN BẢN mà biểu thuế Tổng cục nêu — để oz-wiki-plhq kéo về (tools/nhu-cau.mjs) và xếp việc; repo này
// chỉ là CẦU NỐI: không chép nội dung văn bản (CEO chốt 12/10/2026). Hai nguồn trong cùng tệp Excel:
//   1. Sheet HT "Hệ thống văn bản": cột F = văn bản hiện hành của từng biểu/danh mục, cột I = văn bản bị thay
//   2. Cột CY "Chính sách mặt hàng theo mã HS" của biểu chính (kèm số mã HS dẫn)
// Mỗi số hiệu đối chiếu sổ oz-wiki (lib/plhq-registry.js): có trong sổ chưa, tình trạng, hết hiệu lực từ ngày nào.
//   node scripts/bieu-thue/van-ban.mjs --phien-ban=2026.04.05   → data/bieu-thue/van-ban-bieu-thue.json
import fs from 'node:fs';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const P = require('../../lib/plhq-registry.js');
const { phienBanMoiNhat } = require('../../lib/bieu-thue.js');
const arg = (k, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const ver = arg('phien-ban') || phienBanMoiNhat();
const gon = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const tongKet = JSON.parse(fs.readFileSync(join(ROOT, 'data', 'bieu-thue', ver, 'tong-ket.json'), 'utf8'));
const vb = new Map(); // khoá → mục
const lay = (khoa, raw) => { if (!vb.has(khoa)) vb.set(khoa, { soHieu: raw, vaiTro: [], noiDung: [], soMaHs: 0 }); return vb.get(khoa); };

// 1. Sheet HT (bản thô gitignored — có mới đọc; không có thì chỉ dùng cột chính sách)
const htPath = join(ROOT, 'data', 'oz-export', 'bieu-thue-raw', ver, 'HT.jsonl');
let coHT = false;
if (fs.existsSync(htPath)) {
  coHT = true;
  for (const l of fs.readFileSync(htPath, 'utf8').trim().split('\n')) {
    const r = JSON.parse(l); const c = r.o.C ? gon(String(r.o.C.w ?? r.o.C.v)).slice(0, 90) : '';
    for (const [cot, vai] of [['F', 'HIEN_HANH'], ['I', 'BI_THAY_THE']]) {
      const f = r.o[cot] && String(r.o[cot].w ?? r.o[cot].v); if (!f) continue;
      for (const { khoa, raw } of P.trichSoHieu(f)) { const m = lay(khoa, raw); if (!m.vaiTro.includes(vai)) m.vaiTro.push(vai); if (c && !m.noiDung.includes(c)) m.noiDung.push(c); }
    }
  }
}
// 2. Cột chính sách biểu chính
const dong = zlib.gunzipSync(fs.readFileSync(join(ROOT, 'data', 'bieu-thue', ver, 'bieu-chinh.jsonl.gz'))).toString('utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((x) => x.soChuSo === 8);
const daDem = new Map();
for (const x of dong) for (const { khoa, raw } of P.trichSoHieu(x.chinhSach)) { const m = lay(khoa, raw); if (!m.vaiTro.includes('CHINH_SACH_MA_HS')) m.vaiTro.push('CHINH_SACH_MA_HS'); const s = daDem.get(khoa) || new Set(); s.add(x.maChuan); daDem.set(khoa, s); }
for (const [k, s] of daDem) vb.get(k).soMaHs = s.size;
// 3. Đối chiếu sổ
const vanBan = [...vb.values()].map((m) => { const l = P.lookup(m.soHieu); return { ...m, trongSo: !!l, tinhTrang: l ? l.tinhTrang : null, hetHieuLucTu: l?.hetHieuLucTu || null, biThayTheBoi: (l?.biThayTheBoi || []).slice(0, 5) }; })
  .sort((a, b) => Number(a.trongSo) - Number(b.trongSo) || b.soMaHs - a.soMaHs || a.soHieu.localeCompare(b.soHieu));
const out = { _comment: 'Văn bản mà biểu thuế XNK Tổng cục nêu (sheet HT + cột chính sách mặt hàng), đối chiếu sổ oz-wiki-plhq. Sinh bằng scripts/bieu-thue/van-ban.mjs — KHÔNG sửa tay. oz-wiki-plhq tools/nhu-cau.mjs kéo tệp này.',
  nguon: `bieu-thue@${ver}`, tep: tongKet.tep, sha256: tongKet.sha256, ngay: new Date().toISOString().slice(0, 10), coSheetHT: coHT,
  registryVersion: P.registryMeta()?.registryVersion || null,
  tong: vanBan.length, chuaCoTrongSo: vanBan.filter((v) => !v.trongSo).length, hetHieuLuc: vanBan.filter((v) => v.tinhTrang === 'HET_HIEU_LUC').length, vanBan };
fs.writeFileSync(join(ROOT, 'data', 'bieu-thue', 'van-ban-bieu-thue.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`biểu ${ver}: ${out.tong} số hiệu (HT: ${coHT ? 'có' : 'KHÔNG có bản thô'}), chưa có trong sổ ${out.chuaCoTrongSo}, hết hiệu lực ${out.hetHieuLuc} → data/bieu-thue/van-ban-bieu-thue.json`);
