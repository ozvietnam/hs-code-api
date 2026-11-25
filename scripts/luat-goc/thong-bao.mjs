#!/usr/bin/env node
// scripts/luat-goc/thong-bao.mjs — data/precedents.json → data/luat-goc/thong-bao.jsonl (khuôn nut-luat@1, lớp TIEN_LE) + docs/mong/the/M-19-tung-dong-thong-bao.md.
// Tất định, không mạng, không AI, không tờ khai, không đọc legacy-hs-mapping (không suy mã mới). Mỗi bản ghi kho cũ ra đúng một kết cục.
//   node scripts/luat-goc/thong-bao.mjs [--kiem]     --kiem: chỉ so với tệp đang có, lệch thì thoát 1
import fs from 'node:fs';
import path from 'node:path';
import { GOC, doc, docDong, chat, gon } from './thong-bao-doc.mjs';
import { BANG_CHUNG, THAY_THE } from './thong-bao-du-lieu-bang-chung.mjs';

const NGUONG_LECH = 60; // % cụm chữ của mô tả có trong toàn văn; dưới mức này là chữ không thuộc thông báo
const LY_DO = {
  NUOC_NGOAI: 'Bản ghi nước ngoài (CBP Mỹ, ABF Úc), không phải thông báo của hải quan Việt Nam',
  CONG_VAN: 'Công văn hướng dẫn (…/TCHQ-TXNK, …/CHQ-NVTHQ…), không phải thông báo kết quả; chữ kho giữ là lời tóm tắt',
  KHONG_NAM: 'Không có năm, không có ngày; số thông báo lặp mỗi năm nên không định danh được',
  LOI_AGENT: 'Mô tả do agent viết lại, không phải chữ thông báo',
  DINH_CHINH: 'Văn bản đính chính thông báo khác; mô tả do máy ghép từ tiêu đề nhóm, không có hàng',
  MA_BI_DINH_CHINH: 'Mã đã bị chính thông báo đính chính thay; nút giữ ở mã đính chính',
  KHONG_MO_TA: 'Không có mô tả hàng (chữ giữ chỗ, "theo phụ lục", tiêu đề trang web)',
  LECH_TOAN_VAN: `Mô tả không có trong toàn văn thông báo (dưới ${NGUONG_LECH}% cụm chữ): người cào viết lại hoặc thêm chi tiết`,
  MA_LECH_TOAN_VAN: 'Mã kho ghi không có trong toàn văn; toàn văn kết luận mã khác',
  GOP_TRUNG: 'Trùng thông báo và mã với một nút (nhiều người cào cùng một thông báo)',
};
const AGENT = /^agent-tbtchq-(?:ch8|dot5|thep)|^hs-agent/;
// Trang thuvienxuatnhapkhau.com: bản ghi do agent đọc rồi viết lại (kèm chú tiếng Anh trong ngoặc), không chép mục "Tên gọi theo cấu tạo, công dụng".
const VIET_LAI = (x) => x.nguoi === 'agent-tbtchq-toan-van' && /thuvienxuatnhapkhau\.com/.test(x.url || '');
const GIU_CHO = /^Hàng hóa thuộc nhóm \d{4} - xem|^\[SKIP|^Tại bảng|chưa tách được mô tả|^Thông báo \d+\/TB-T?CHQ \d{4} kết quả|\| HSTC$/;
// "(Theo phụ lục đính kèm)", ", 3, 4, 6 của tờ khai (chi tiết theo phụ lục đính kèm)": bỏ các cụm đó đi thì không còn chữ nào.
const trong = (s) => GIU_CHO.test(gon(s)) || chat(gon(s).replace(/\(?(?:chi tiết )?theo phụ lục đính kèm\)?/gi, '').replace(/của tờ khai/gi, '').replace(/[\d,.\s-]+/g, '')).length < 4;
// Kho cũ có ghi ba lần đính chính; nội dung lấy đúng trong bản ghi (precedents.json#32082090[13], #38249999[318], #38249999[128]), không suy.
const DINH_CHINH = {
  '1811/TB-TCHQ|2020': { boi: '2174/TB-TCHQ', ngay: '2020-04-03', maCu: '32082090', ma: '32089090' },
  '1909/TB-TCHQ|2020': { boi: '131/TB-TCHQ', ngay: '2021-01-12', maCu: null, ma: '38249999' },
  '1182/TB-TCHQ|2018': { boi: '1377/TB-TCHQ', ngay: null, maCu: null, ma: '38249999' },
};
const LA_DINH_CHINH = new Set(Object.entries(DINH_CHINH).map(([k, v]) => `${v.boi}|${k.split('|')[1]}`));
const CO_QUAN = { 'TB-TCHQ': 'Tổng cục Hải quan', 'TB-CHQ': 'Cục Hải quan' };

const dong = docDong(); const bieu = new Set(Object.keys(doc('data/tax.json')).filter((k) => /^\d{8}$/.test(k))); const dauBieu = new Set([...bieu].flatMap((m) => [m.slice(0, 4), m.slice(0, 6)]));
const ketCuc = new Map(); const nhom = new Map(); // viTri → { ma, ly, phu }
const bo = (x, ly, them = '') => ketCuc.set(x.viTri, { ly, them });
for (const x of dong) {
  const b = BANG_CHUNG[x.viTri] || {}; const khoa = `${x.soDay}|${x.nam}`;
  if (x.nuocNgoai) bo(x, 'NUOC_NGOAI', x.url);
  else if (!CO_QUAN[x.kyHieu]) bo(x, 'CONG_VAN', x.url);
  else if (!x.nam) bo(x, 'KHONG_NAM', x.url);
  else if (LA_DINH_CHINH.has(khoa)) bo(x, 'DINH_CHINH', `đính chính ${Object.keys(DINH_CHINH).find((k) => DINH_CHINH[k].boi === x.soDay).replace('|', ' năm ')}`);
  else if (DINH_CHINH[khoa]?.maCu === x.ma) bo(x, 'MA_BI_DINH_CHINH', `${DINH_CHINH[khoa].boi} đính chính thành ${DINH_CHINH[khoa].ma}`);
  else if (AGENT.test(x.nguoi) || VIET_LAI(x) || (/→/.test(x.ketLuan + x.moTa) && !(b.n >= 80))) bo(x, 'LOI_AGENT', b.n !== undefined ? `toàn văn chứa ${b.n}%` : 'không có toàn văn');
  else if (trong(x.moTa)) bo(x, 'KHONG_MO_TA', gon(x.moTa).slice(0, 80));
  else if (b.n !== undefined && b.n < NGUONG_LECH) bo(x, 'LECH_TOAN_VAN', `${b.n}%: "${gon(x.moTa).slice(0, 110)}"`);
  else if (Array.isArray(b.m) && !(DINH_CHINH[khoa]?.ma === x.ma)) bo(x, 'MA_LECH_TOAN_VAN', `toàn văn: ${b.m.join(', ')}`);
  else { const id = `tb:${x.so}${x.kyHieu === 'TB-TCHQ' ? '' : `.${x.kyHieu}`}-${x.nam}:${x.ma}`; if (!nhom.has(id)) nhom.set(id, []); nhom.get(id).push(x); }
}
// Cùng số, năm, mã: toàn kho là một thông báo do nhiều người cào. Chữ giữ: có nguyên vẹn trong toàn văn trước, rồi phủ cao hơn, rồi dài hơn, rồi thứ tự kho.
const hang = (x) => { const b = BANG_CHUNG[x.viTri] || {}; return [b.N || 0, b.n ?? -1, b.K || 0, x.moTa.length]; };
const soSanh = (a, b) => { const p = hang(a); const q = hang(b); for (let i = 0; i < p.length; i += 1) if (p[i] !== q[i]) return q[i] - p[i]; return 0; };
const thayTheo = new Map(); const biThay = new Map(); const them = (m, k, v) => { if (!m.has(k)) m.set(k, []); if (!m.get(k).some((y) => y.so === v.so && y.ngay === v.ngay)) m.get(k).push(v); };
for (const m of doc('data/tien-le-thay-the.json').muc) {
  const cu = `${m.cu.soHieu}|${m.cu.ngay.slice(0, 4)}`; const moi = `${m.moi.soHieu}|${m.moi.ngay.slice(0, 4)}`;
  them(biThay, cu, { so: m.moi.soHieu, ngay: m.moi.ngay, trich: m.canCu.trich, canCu: 'data/tien-le-thay-the.json' }); them(thayTheo, moi, { so: m.cu.soHieu, ngay: m.cu.ngay });
}
for (const m of THAY_THE) { them(biThay, `${m.cu}|${m.ngayCu.slice(0, 4)}`, { so: m.moi, ngay: m.ngayMoi, trich: m.trich, canCu: `toàn văn ${m.moi} năm ${m.namMoi}` }); them(thayTheo, `${m.moi}|${m.namMoi}`, { so: m.cu, ngay: m.ngayCu }); }

const nut = []; const dungThay = new Set();
for (const [id, ds] of [...nhom].sort((a, b) => { const [, x, m] = a[0].split(':'); const [, y, n] = b[0].split(':'); return m < n ? -1 : m > n ? 1 : x.split('-').at(-1) - y.split('-').at(-1) || parseInt(x, 10) - parseInt(y, 10) || (x < y ? -1 : 1); })) {
  const xep = [...ds].sort(soSanh); const x = xep[0]; const b = BANG_CHUNG[x.viTri] || {}; for (const y of xep.slice(1)) bo(y, 'GOP_TRUNG', id); ketCuc.set(x.viTri, { ly: 'NUT', them: id });
  const khoa = `${x.soDay}|${x.nam}`; const ngay = xep.find((y) => y.ngay)?.ngay || null; const loai = xep.find((y) => y.loaiTB)?.loaiTB || null; const dc = DINH_CHINH[khoa]; const bt = biThay.get(khoa) || []; const tt = thayTheo.get(khoa) || [];
  if (bt.length) dungThay.add(khoa); const bieuGoc = xep.find((y) => y.bieu)?.bieu || null;
  // Kết luận: chỉ giữ khi là chữ thông báo (khuôn "thuộc nhóm … mã số …"), không phải câu giữ chỗ "Theo TB-TCHQ …: …", và không lệch toàn văn.
  const kl = [x, ...xep].find((y) => { const c = BANG_CHUNG[y.viTri] || {}; return /thuộc\s+nhóm|thuộc\s+\d\d\.\d\d|phân nhóm|mã số/i.test(y.ketLuan) && !/^Theo TB-T?CHQ|Xem TB-T?CHQ|Căn cứ: TB-T?CHQ/.test(y.ketLuan) && !(c.k < 80); });
  const gc = [];
  if (x.maTu === 'outcome') gc.push(`kho cũ để dưới khoá ${x.khoa}`); if (x.maTu === 'hsCodeGoc') gc.push(`kho cũ để dưới mã dẫn nối ${x.khoa}`);
  if (x.namTu === 'url') gc.push('năm lấy từ địa chỉ nguồn'); if (x.khongSo) gc.push('số lấy từ source.reference của kho cũ'); if (b.g) gc.push(`ngày đầu văn bản trong toàn văn: ${b.g}`); if (b.m === 0) gc.push('toàn văn không in mã 8 số (bị cắt)');
  nut.push({
    id, loai: 'THONG_BAO', cha: null, so: x.soDay, nguyenVan: String(x.moTa).normalize('NFC').trim(), lop: 'TIEN_LE',
    nguon: { vanBan: `Thông báo ${x.soDay}${ngay ? ` ngày ${ngay}` : ` năm ${x.nam}`}`, ban: bieuGoc ? `biểu ${bieuGoc} (kho ghi)` : 'theo ngày ban hành (kho không ghi biểu)', trang: null, url: x.url, tep: x.tep },
    hieuLuc: { tu: ngay, den: bt.map((y) => y.ngay).filter(Boolean).sort()[0] || null },
    ngay, nam: x.nam, coQuan: CO_QUAN[x.kyHieu], loaiThongBao: loai, maLucBanHanh: x.ma, conTrongBieu: x.ma.length === 8 ? bieu.has(x.ma) : dauBieu.has(x.ma),
    thayThe: tt, biThay: bt, ...(dc && { dinhChinh: { boi: dc.boi, ngay: dc.ngay, ...(dc.maCu && { maTruocDinhChinh: dc.maCu }) } }),
    ketLuan: kl ? kl.ketLuan.normalize('NFC').trim() : null,
    doiChieu: b.n === undefined ? (b.p === 1 ? 'MA_KHOP_PDF_QUET' : b.p ? 'MA_LECH_PDF_QUET' : 'KHONG_CO_BAN_GOC') : b.N ? 'NGUYEN_VEN' : 'KHOP_MOT_PHAN', phuToanVan: b.n ?? null, ...(b.p && b.p !== 1 && { maPdfQuet: b.p }),
    khoCu: xep.map((y) => y.viTri), ...(gc.length && { ghiChu: gc.join('; ') }),
  });
}
const ra = `${nut.map((x) => JSON.stringify(x)).join('\n')}\n`;

// ── Báo cáo từng dòng ────────────────────────────────────────────────────────
const dem = {}; for (const { ly } of ketCuc.values()) dem[ly] = (dem[ly] || 0) + 1;
if (ketCuc.size !== dong.length || Object.values(dem).reduce((a, b) => a + b, 0) !== dong.length) throw new Error('bảng cân không khớp');
const o = (s) => gon(s).replace(/\|/g, '/'); const L = []; const theoVt = new Map(dong.map((x) => [x.viTri, x])); const kq = (x) => { const k = ketCuc.get(x.viTri); return k.ly === 'NUT' || k.ly === 'GOP_TRUNG' ? `${k.ly === 'NUT' ? 'nút' : 'gộp vào'} \`${k.them}\`` : k.ly; };
L.push('# M-19 – từng dòng: bản ghi không thành nút, và bốn danh sách thẻ hỏi', '', 'Máy sinh bởi `scripts/luat-goc/thong-bao.mjs`, đừng sửa tay. Vị trí `khoá#i` là `precedents.json[khoá][i]`.', '', '## Bảng cân', '', '| Kết cục | Bản ghi | Lý do |', '|---|---:|---|', `| NÚT | ${dem.NUT} | |`, ...Object.entries(LY_DO).map(([k, v]) => `| ${k} | ${dem[k] || 0} | ${v} |`), `| **Cộng** | **${dong.length}** | |`, '');
const chetKhoa = [...new Set(dong.map((x) => x.khoa))].filter((k) => k.length === 8 && !bieu.has(k)).sort();
L.push(`## ${chetKhoa.length} khoá mã 8 số không còn trong biểu`, '', 'Giữ mã cũ, `conTrongBieu:false`, không đổi.', '', '| Khoá | Bản ghi | Kết cục |', '|---|---:|---|');
for (const k of chetKhoa) { const ds = dong.filter((x) => x.khoa === k); const d = {}; for (const x of ds) { const l = ketCuc.get(x.viTri).ly; d[l] = (d[l] || 0) + 1; } L.push(`| ${k} | ${ds.length} | ${Object.entries(d).map(([a, b]) => `${a} ${b}`).join(', ')} |`); }
const ks = dong.filter((x) => x.khongSo); L.push('', `## ${ks.length} bản ghi không có trường số`, '', 'Cả 20 có số trong `source.reference` (kho ghi theo khuôn khác), không phải mất số.', '', '| Vị trí | Số (source.reference) | Ngày | Kết cục |', '|---|---|---|---|', ...ks.map((x) => `| ${x.viTri} | ${x.soDay} | ${x.ngay} | ${kq(x)} |`));
const nn = dong.filter((x) => x.nuocNgoai); L.push('', `## ${nn.length} bản ghi nước ngoài`, '', '| Vị trí | Số | Nguồn |', '|---|---|---|', ...nn.map((x) => `| ${x.viTri} | ${x.soDay} | ${x.url} |`));
const gm = new Map(); for (const x of dong) if (!x.nuocNgoai && !x.khongSo) { const k = `${x.soDay}|${x.namTu === 'kho' ? x.nam : null}`; if (!gm.has(k)) gm.set(k, []); gm.get(k).push(x); }
const nhieu = [...gm].filter(([, v]) => new Set(v.map((x) => x.khoa)).size > 1); const lopNhieu = {}; const dn = [];
for (const [k, v] of nhieu) {
  const song = v.filter((x) => ['NUT', 'GOP_TRUNG'].includes(ketCuc.get(x.viTri).ly)); const ids = new Set(song.map((x) => ketCuc.get(x.viTri).them));
  const lop = k.endsWith('|null') ? 'E. Khác năm hoặc không rõ năm: trùng số, không phải một thông báo' : v.every((x) => ketCuc.get(x.viTri).ly === 'CONG_VAN') ? 'D. Công văn nêu nhiều mã (để riêng)' : new Set(v.map((x) => x.ma)).size === 1 ? 'A. Một mã lúc ban hành; kho để thêm dưới khoá khác (mã dẫn nối / khoá sai)' : ids.size > 1 ? 'B. Nhiều mặt hàng thật: mỗi mã một nút' : ids.size === 1 ? 'C. Gắn nhầm: một mã thành nút, bản ghi mã kia để riêng' : 'F. Nhiều mã, mọi bản ghi để riêng vì chữ là lời agent';
  lopNhieu[lop] = (lopNhieu[lop] || 0) + 1; dn.push([lop, k, v]);
}
L.push('', `## ${nhieu.length} thông báo kho cũ gắn nhiều khoá mã (cùng số + cùng trường năm)`, '', '| Lớp | Thông báo |', '|---|---:|', ...Object.entries(lopNhieu).sort().map(([a, b]) => `| ${a} | ${b} |`), '', '| Lớp | Số, năm | Khoá kho cũ → mã lúc ban hành → kết cục |', '|---|---|---|');
for (const [lop, k, v] of dn.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))) L.push(`| ${lop[0]} | ${k.replace('|', ', ')} | ${v.map((x) => `${x.khoa}${x.ma !== x.khoa ? ` → ${x.ma}` : ''}: ${kq(x)}`).join('<br>')} |`);
for (const [ly, moTa] of Object.entries(LY_DO)) { if (ly === 'NUOC_NGOAI' || ly === 'GOP_TRUNG') continue; const ds = dong.filter((x) => ketCuc.get(x.viTri).ly === ly); L.push('', `## ${ly}: ${ds.length}`, '', moTa, '', '| Vị trí | Số | Năm | Mã | Bằng chứng / nguồn |', '|---|---|---|---|---|', ...ds.map((x) => `| ${x.viTri} | ${x.soDay} | ${x.nam ?? ''} | ${x.ma} | ${o(['LOI_AGENT'].includes(ly) ? `${x.nguoi}; ${ketCuc.get(x.viTri).them}; ${x.url}` : ketCuc.get(x.viTri).them)} |`)); }
const gop = dong.filter((x) => ketCuc.get(x.viTri).ly === 'GOP_TRUNG'); L.push('', `## GOP_TRUNG: ${gop.length}`, '', 'Từng bản ghi nằm ở trường `khoCu` của nút (phần tử đầu là bản được giữ chữ).', '', '## Thay thế', '', '| Thông báo bị thay | Bị thay bởi | Có nút | Căn cứ |', '|---|---|---|---|', ...[...biThay].sort().map(([k, v]) => `| ${k.replace('|', ', ')} | ${v.map((y) => `${y.so} (${y.ngay})`).join(', ')} | ${dungThay.has(k) ? 'có, đã ghi `hieuLuc.den`' : 'không có trong kho'} | ${v[0].canCu} |`));
const bc = `${L.join('\n')}\n`;
const f1 = path.join(GOC, 'data/luat-goc/thong-bao.jsonl'); const f2 = path.join(GOC, 'docs/mong/the/M-19-tung-dong-thong-bao.md');
if (process.argv.includes('--kiem')) { const khac = [[f1, ra], [f2, bc]].filter(([f, s]) => !fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== s); console.log(khac.length ? `LỆCH: ${khac.map((x) => x[0]).join(', ')}` : 'KHỚP'); process.exit(khac.length ? 1 : 0); }
fs.writeFileSync(f1, ra); fs.writeFileSync(f2, bc);
const c = (f) => nut.filter(f).length; const dd = {}; for (const x of nut) dd[x.doiChieu] = (dd[x.doiChieu] || 0) + 1;
console.log(JSON.stringify({ tong: dong.length, dem, lopNhieu, conTrongBieu: c((x) => x.conTrongBieu), khongCon: c((x) => !x.conTrongBieu), coNgay: c((x) => x.ngay), coKetLuan: c((x) => x.ketLuan), biThay: c((x) => x.biThay.length), thayThe: c((x) => x.thayThe.length), thieuUrl: c((x) => !x.nguon.url), doiChieu: dd, ngayKhacToanVan: c((x) => /ngày đầu văn bản/.test(x.ghiChu || '')), namTuUrl: c((x) => /năm lấy từ/.test(x.ghiChu || '')), soNguon: c((x) => /source\.reference/.test(x.ghiChu || '')), khacKhoa: c((x) => /kho cũ để dưới/.test(x.ghiChu || '')), cucHaiQuan: c((x) => x.coQuan === 'Cục Hải quan') }, null, 1));
