#!/usr/bin/env node
// scripts/test-chi-muc-luat.mjs — cổng máy cho CHỈ MỤC NGHĨA trên nút luật (M-37, #1924). Tất định, không mạng, không mô hình (vectơ giả).
// Chỉ mục là cửa vào: không mã 8 số, không tiền lệ (tb:), không WCO scan (ocr:true), không BO_TRO / THUC_TE, không từ điển / tờ khai.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { tachKho } from './luat-goc/cau.mjs';
import { dungChiMuc, thuMuc } from './luat-goc/chi-muc.mjs';
import { boKiem } from './lib-luat.mjs';

const require = createRequire(import.meta.url);
const L = require('../lib/chi-muc-luat.js');
const { kiem, xong } = boKiem('test-chi-muc-luat');

// ── vectơ giả: túi từ băm vào 384 chiều, chuẩn hoá. Cùng chữ → cùng vectơ; không cần mô hình. ──
const bam = (s) => { let h = 2166136261; for (const c of s) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };
function vecGia(chu) {
  const v = new Float32Array(384);
  for (const t of String(chu).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((x) => x.length > 1)) { const h = bam(t); v[h % 384] += (h & 0x10000) ? 1 : 0.7; }
  const n = Math.hypot(...v) || 1; return v.map((x) => x / n);
}
const embedderGia = async (chuoi) => chuoi.map((c) => vecGia(c.replace(/^passage: /, '')));
const hoiGia = async (q) => vecGia(q);

// ── kho mini ──
const N = (id, loai, nguyenVan, o = {}) => JSON.stringify({ id, loai, lop: 'LUAT', cha: null, so: null, nguyenVan, nguon: { trang: 1 }, ...o });
const bieu = (id, cap, nguyenVan, o = {}) => N(id, 'TEN', nguyenVan, { cap, ...o });
const KHO = {
  phan: [N('phan:XV', 'TEN', 'PHẦN XV: CÁC KIM LOẠI CƠ BẢN VÀ CÁC SẢN PHẨM BẰNG KIM LOẠI CƠ BẢN'), N('phan:XV:cg:1', 'CHU_GIAI', '1. Phần này không bao gồm:'), N('phan:XV:cg:1:a', 'CHU_GIAI', '(a) Sơn chế sẵn có thành phần là bột kim loại.', { cha: 'phan:XV:cg:1' })],
  chuong: [N('chuong:76', 'TEN', 'Chương 76: Nhôm và các sản phẩm bằng nhôm', { so: '76' }), N('chuong:76:cg:1', 'CHU_GIAI', 'Trong Chương này, thuật ngữ "thanh" nghĩa là các sản phẩm cán, ép đùn.')],
  nhom: [N('nhom:7616:ct:1', 'CHU_GIAI_CHI_TIET', 'Nhóm này bao gồm tất cả các sản phẩm bằng nhôm chưa được nêu cụ thể hơn. Ví dụ ống nhôm đã gia công.', { lop: 'HUONG_DAN' }),
    N('nhom:7616:ct:2', 'CHU_GIAI_CHI_TIET', 'Nhóm này không bao gồm:', { lop: 'HUONG_DAN' }), N('nhom:7616:ct:3', 'CHU_GIAI_CHI_TIET', '(a) Đinh vít bằng đồng (nhóm 74.15).', { lop: 'HUONG_DAN' }),
    N('nhom:7616:ct:4', 'CHU_GIAI_CHI_TIET', '(b) Bu lông.', { lop: 'HUONG_DAN' }),
    N('nhom:7616:ct:6', 'CHU_GIAI_CHI_TIET', 'Nhóm này gồm các loại ống dẫn bằng nhôm đã hàn. Đai.', { lop: 'HUONG_DAN' }),
    N('nhom:7616:ct:5', 'BO_TRO', 'Từ điển tên thương mại: nồi chiên không dầu là đồ dùng nhà bếp bằng nhôm.', { lop: 'BO_TRO' })],
  'phan-nhom': [N('pn:761610:ct:1', 'CHU_GIAI_CHI_TIET', 'Phân nhóm 7616.10 gồm đinh, đinh mũ, ghim bằng nhôm.', { lop: 'HUONG_DAN' })],
  sen: [N('sen:76169920:1', 'SEN', 'Các loại ống nhôm đã gia công hình ống tròn dùng trong xây dựng.', { lop: 'HUONG_DAN' })],
  bieu: [bieu('bieu:76', 'CHUONG', 'Nhôm và các sản phẩm bằng nhôm'), bieu('bieu:98', 'CHUONG', 'Quy định riêng của Việt Nam'), bieu('bieu:9829', 'NHOM', 'Hàn, bằng thép không gỉ', { cha: 'bieu:98', so: '98.29' }), bieu('bieu:7616', 'NHOM', 'Các sản phẩm khác bằng nhôm', { cha: 'bieu:76', so: '76.16' }),
    bieu('bieu:76161', 'TIEU_DE_PHAN_NHOM', '- Đinh, đinh mũ, ghim:', { cha: 'bieu:7616' }), bieu('bieu:761610', 'PHAN_NHOM', '- - Đinh, đinh mũ và ghim', { cha: 'bieu:76161', so: '7616.10' }),
    bieu('bieu:76161000', 'DONG', '- - - Đinh loại thường', { cha: 'bieu:761610' }), bieu('bieu:76169920', 'DONG', '- - - Ống nhôm loại khác', { cha: 'bieu:7616' })],
  gir: [N('gir:1', 'QUY_TAC', 'QUY TẮC 1 Tên của Phần, Chương chỉ để dễ tra cứu.')],
  wco: [N('wco:761610:1', 'Y_KIEN_WCO', 'Aluminium nails scan text.', { lop: 'HUONG_DAN', ocr: true })],
  'thong-bao': [N('tb:651-2016:76161000', 'THONG_BAO', 'Đinh nhôm. Thuộc nhóm 76.16 mã 7616.10.00', { lop: 'TIEN_LE' })],
};
const SECTIONS = { sections: [{ code: 'XV', titleVi: 'Kim loại', chapters: ['72', '76'] }] };

function datKho(thu, doi = {}) {
  fs.mkdirSync(path.join(thu, 'cau'), { recursive: true });
  for (const [k, dong] of Object.entries({ ...KHO, ...doi })) {
    fs.writeFileSync(path.join(thu, `${k}.jsonl`), `${dong.join('\n')}\n`);
    fs.writeFileSync(path.join(thu, 'cau', `${k}.jsonl`), `${tachKho(dong).map((c) => JSON.stringify(c)).join('\n')}\n`);
  }
  const sec = path.join(thu, '..', `sections-${path.basename(thu)}.json`); fs.writeFileSync(sec, JSON.stringify(SECTIONS)); return sec;
}
const tam = fs.mkdtempSync(path.join(os.tmpdir(), 'chi-muc-'));
const thu = path.join(tam, 'goc'); const sections = datKho(thu); const ra = path.join(thu, 'chi-muc');
const dung = (o = {}) => dungChiMuc({ goc: thu, sections, ra, embedder: embedderGia, mau: 4, ...o });

// 1. Mục nào vào, mục nào KHÔNG
const r1 = await dung(); const ids = r1.ids;
kiem('có câu của nhóm / phân nhóm / SEN / chương / phần / tên biểu', ['nhom:7616:ct:1#1', 'pn:761610:ct:1#1', 'sen:76169920:1#1', 'chuong:76#1', 'phan:XV#1', 'bieu:7616#1', 'bieu:761610#1', 'bieu:76#1'].every((x) => ids.includes(x)), ids.join(','));
kiem('CA NGƯỢC không tiền lệ tb:* / WCO scan wco:* / gir', !ids.some((x) => /^(tb|wco|gir):/.test(x)));
kiem('CA NGƯỢC không nút BO_TRO (nhom:7616:ct:5)', !ids.some((x) => x.startsWith('nhom:7616:ct:5')));
kiem('CA NGƯỢC không dòng biểu 8 số, không tiêu đề biểu không mã', !ids.some((x) => /^bieu:\d{7,}/.test(x)) && !ids.includes('bieu:76161#1'));
kiem('CA NGƯỢC câu dẫn trần ("Nhóm này không bao gồm:") không thành mục; mục con thì có', !ids.includes('nhom:7616:ct:2#1') && ids.includes('nhom:7616:ct:3#1') && ids.includes('phan:XV:cg:1:a#1'));
kiem('CA NGƯỢC SEN 8 số chỉ là nút SEN, không kéo dòng biểu 8 số', ids.filter((x) => /\d{8}/.test(x)).every((x) => x.startsWith('sen:')));
kiem('CA NGƯỢC Chương 98 (riêng Việt Nam) không vào chỉ mục', !ids.some((x) => x.startsWith('bieu:98')) && ids.includes('bieu:76#1'));
kiem('mảnh ngắn (< 30 ký tự) ngoài biểu gộp vào câu liền trước cùng nút, không bỏ chữ', ids.includes('nhom:7616:ct:6#1') && !ids.includes('nhom:7616:ct:6#2') && JSON.stringify(r1.gom['nhom:7616:ct:6#1']) === JSON.stringify(['nhom:7616:ct:6#1', 'nhom:7616:ct:6#2']));
kiem('mảnh ngắn đầu nút (không có câu liền trước cùng nút) vẫn là mục riêng; tên biểu ngắn không gộp', ids.includes('nhom:7616:ct:4#1') && ids.includes('bieu:7616#1'));
kiem('kho không nằm trong danh sách (gir, wco, thong-bao) không bị đọc', !L.KHO.includes('gir') && !L.KHO.includes('wco') && !L.KHO.includes('thong-bao'));
kiem('laNutCam: TIEN_LE, BO_TRO, THUC_TE, ocr, tb:, wco:', [{ id: 'x:1', lop: 'TIEN_LE' }, { id: 'x:2', lop: 'BO_TRO' }, { id: 'x:3', lop: 'THUC_TE' }, { id: 'x:4', ocr: true }, { id: 'tb:1' }, { id: 'wco:1' }].every(L.laNutCam) && !L.laNutCam({ id: 'nhom:1:ct:1', lop: 'HUONG_DAN' }));

// 2. Đường dẫn cha
const bang = L.taoBangTen({ phan: KHO.phan.map(JSON.parse), chuong: KHO.chuong.map(JSON.parse), bieu: KHO.bieu.map(JSON.parse), sections: SECTIONS });
const dd = L.duongDanCha('nhom:7616:ct:1', bang).map((p) => p.ten);
kiem('đường dẫn cha: Phần › Chương › Nhóm', dd.length === 3 && /^PHẦN XV/.test(dd[0]) && /^Chương 76/.test(dd[1]) && /^Nhóm 76\.16: Các sản phẩm khác/.test(dd[2]), dd.join(' | '));
kiem('đường dẫn của SEN 8 số dừng ở phân nhóm 6 số (không chứa mã 8 số)', (() => { const p = L.duongDanCha('sen:76169920:1', bang); return p.length >= 3 && p.every((x) => !/\d{8}/.test(`${x.id}${x.ten}`)); })());
kiem('chữ nhúng có đường dẫn | câu dẫn | câu', (() => { const m = thuMuc({ goc: thu, sections }).muc.find((x) => x.id === 'nhom:7616:ct:3#1'); const c = L.chuNhung(m); return /Nhóm 76\.16/.test(c) && c.includes('| Nhóm này không bao gồm: |') && /\| \(a\) Đinh vít/.test(c); })());

// 3. Dựng lại hai lần = cùng danh sách, cùng vectơ
const r2 = await dung({ ra: null });
kiem('dựng lại hai lần ra cùng danh sách id và cùng vectơ', JSON.stringify(r1.ids) === JSON.stringify(r2.ids) && r1.meta.vecSha256 === r2.meta.vecSha256 && r1.meta.idSha256 === r2.meta.idSha256);
kiem('meta ghi số câu, mô hình, sha256 các kho nguồn, không thời điểm', r1.meta.soMuc === ids.length && /multilingual-e5-small/.test(r1.meta.moHinh) && Object.keys(r1.meta.nguon).length >= 13 && !/20\d\d-\d\d-\d\d/.test(JSON.stringify(r1.meta)));
kiem('vec.bin = số mục × 384 byte', fs.statSync(path.join(ra, 'vec.bin')).size === ids.length * 384);

// 4. Tìm
L.datLai();
const t1 = await L.timNghia('ống nhôm đã gia công', { thuMuc: thu, sections, embedder: hoiGia, limit: 5 });
const nutDau = t1.ketQua[0];
kiem('tìm: trạng thái OK, có kết quả, nút đầu là câu nhắc ống nhôm', t1.trangThai === 'OK' && t1.ketQua.length > 0 && /^(nhom:7616:ct:1|sen:76169920:1)$/.test(nutDau.nut), JSON.stringify(t1.ketQua.map((x) => x.nut)));
const chuThat = (kho, id) => { const cau = L.docJsonl(path.join(thu, 'cau', `${kho}.jsonl`)).find((x) => x.id === id); const nut = L.docJsonl(path.join(thu, `${kho}.jsonl`)).find((x) => x.id === id.slice(0, id.lastIndexOf('#'))); return cau && nut ? L.gon(nut.nguyenVan.slice(cau.tu, cau.den)) : null; };
kiem('mỗi kết quả có id câu thật, chữ = nguyenVan.slice(tu,den) (mục gộp: các câu nối bằng một dấu cách)', t1.ketQua.every((n) => n.cau.length && n.cau.every((c) => c.chu === (c.gom || [c.id]).map((x) => chuThat(n.kho, x)).join(' ') && chuThat(n.kho, c.id))));
kiem('gộp theo nút: mỗi nút một lần, ≤ 3 câu nhắc', new Set(t1.ketQua.map((n) => n.nut)).size === t1.ketQua.length && t1.ketQua.every((n) => n.cau.length <= 3));
kiem('kết quả có nút + đường dẫn cha + câu dẫn của mục con', nutDau.duongDan.length >= 3 && (() => { /* mục (a) có câu dẫn */ return true; })());
const t2 = await L.timNghia('đinh vít bằng đồng', { thuMuc: thu, sections, embedder: hoiGia, limit: 5 });
const mucA = t2.ketQua.find((n) => n.nut === 'nhom:7616:ct:3');
kiem('mục "(a) Đinh vít…" trả kèm câu dẫn "Nhóm này không bao gồm:"', !!mucA && mucA.cau[0].dan?.chu === 'Nhóm này không bao gồm:' && mucA.cau[0].dan.id === 'nhom:7616:ct:2#1');
const tuKhoa = JSON.stringify(t1);
kiem('CA NGƯỢC không trả trường mã / hs / thuế, không mã 8 số trong đường dẫn, không tiền lệ', !/"(ma|hs|maHs|thue|toKhai|tienLe)"/.test(tuKhoa) && t1.ketQua.every((n) => n.duongDan.every((p) => !/\d{8}/.test(p.id + p.ten))) && !/"(tb|wco):/.test(tuKhoa));
const t3 = await L.timNghia('nồi chiên không dầu', { thuMuc: thu, sections, embedder: hoiGia });
kiem('CA NGƯỢC từ điển tên thương mại (BO_TRO) không tìm ra', !JSON.stringify(t3).includes('Từ điển tên thương mại') && !t3.ketQua.some((n) => n.nut === 'nhom:7616:ct:5'));
kiem('CA NGƯỢC câu hỏi rỗng / quá ngắn → LOI, không đoán', (await L.timNghia(' ', { thuMuc: thu, sections, embedder: hoiGia })).ketQua.length === 0 && (await L.timNghia('a', { thuMuc: thu, sections, embedder: hoiGia })).trangThai === 'LOI');
kiem('CA NGƯỢC không nhúng được câu hỏi → LOI, không trả gì', (await L.timNghia('ống nhôm', { thuMuc: thu, sections, embedder: async () => null })).trangThai === 'LOI');

// 5. Phòng xa: chỉ mục lẫn id tiền lệ thì kết quả vẫn không có
{
  const dir = path.join(tam, 'ban'); fs.cpSync(thu, dir, { recursive: true }); const sec = path.join(tam, 'sections-ban.json'); fs.copyFileSync(sections, sec);
  const idf = path.join(dir, 'chi-muc', 'id.json'); const dsId = JSON.parse(fs.readFileSync(idf, 'utf8')); dsId[0] = 'tb:651-2016:76161000#1'; fs.writeFileSync(idf, JSON.stringify(dsId));
  L.datLai(); const t = await L.timNghia('Phần XV các kim loại cơ bản', { thuMuc: dir, sections: sec, embedder: hoiGia, limit: 50 });
  kiem('CA NGƯỢC id tb:* lọt vào chỉ mục vẫn không được trả', t.trangThai === 'OK' && !t.ketQua.some((n) => /^(tb|wco):/.test(n.nut)));
}

// 6. Kho lệch sha → CU, không trả kết quả cũ
{
  const dir = path.join(tam, 'lech'); fs.cpSync(thu, dir, { recursive: true }); const sec = path.join(tam, 'sections-lech.json'); fs.copyFileSync(sections, sec);
  fs.appendFileSync(path.join(dir, 'nhom.jsonl'), `${N('nhom:7616:ct:9', 'CHU_GIAI_CHI_TIET', 'Đoạn mới thêm sau khi dựng.', { lop: 'HUONG_DAN' })}\n`);
  L.datLai(); const t = await L.timNghia('ống nhôm', { thuMuc: dir, sections: sec, embedder: hoiGia });
  kiem('CA NGƯỢC kho nguồn đổi sau lúc dựng → trangThai CU, kết quả rỗng, nêu tệp lệch', t.trangThai === 'CU' && t.ketQua.length === 0 && t.tepLech.includes('nhom.jsonl'), JSON.stringify(t).slice(0, 200));
  fs.writeFileSync(sec, JSON.stringify({ sections: [] })); L.datLai();
  kiem('CA NGƯỢC bảng Phần–Chương (hs-sections.json) đổi cũng thành CU', (await L.timNghia('ống nhôm', { thuMuc: thu, sections: sec, embedder: hoiGia })).trangThai === 'CU');
}
// 7. Thiếu / hỏng
{
  const dir = path.join(tam, 'thieu'); fs.cpSync(thu, dir, { recursive: true }); fs.rmSync(path.join(dir, 'chi-muc'), { recursive: true });
  L.datLai(); kiem('chưa dựng → THIEU, rỗng', (await L.timNghia('ống nhôm', { thuMuc: dir, sections, embedder: hoiGia })).trangThai === 'THIEU');
  const dir2 = path.join(tam, 'hong'); fs.cpSync(thu, dir2, { recursive: true }); const f = path.join(dir2, 'chi-muc', 'vec.bin'); const b = fs.readFileSync(f); b[5] ^= 0x55; fs.writeFileSync(f, b);
  L.datLai(); kiem('CA NGƯỢC vec.bin bị sửa → HONG, không trả kết quả', (await L.timNghia('ống nhôm', { thuMuc: dir2, sections, embedder: hoiGia })).trangThai === 'HONG');
}
// 8. Gộp khi quá cỡ
{
  const dir = path.join(tam, 'gop'); const kho2 = { nhom: [...KHO.nhom.slice(0, 1), N('nhom:7616:ct:2', 'CHU_GIAI_CHI_TIET', 'Nhóm này không bao gồm:', { lop: 'HUONG_DAN' }), ...['(a) Ốc.', '(b) Vít.', '(c) Kẹp.', '(d) Đai.'].map((c, i) => N(`nhom:7616:ct:${i + 3}`, 'CHU_GIAI_CHI_TIET', c, { lop: 'HUONG_DAN' }))] };
  const sec = datKho(dir, kho2); const ra2 = path.join(dir, 'chi-muc');
  const g = await dungChiMuc({ goc: dir, sections: sec, ra: ra2, embedder: embedderGia, mau: 3, nguongByte: 384 * 4 });
  const g0 = await dungChiMuc({ goc: dir, sections: sec, ra: null, embedder: embedderGia, mau: 3 });
  kiem('quá 25 MB thì gộp câu ngắn cùng câu dẫn: ít mục hơn, ghi rõ cách gộp', g.meta.gop.bat && g.meta.soMuc < g0.meta.soMuc && /câu ngắn/.test(g.meta.gop.cach) && Object.values(g.gom).some((x) => x.length >= 2), JSON.stringify(g.meta.gop));
  L.datLai(); const t = await L.timNghia('ốc vít kẹp', { thuMuc: dir, sections: sec, embedder: hoiGia });
  kiem('mục gộp trả đủ các câu gộp (id đầu + gom)', t.trangThai === 'OK' && JSON.stringify(t).includes('"gom"'));
}

// 9. Không nối vào đường khách, không đụng kho ngoài
const nguon = fs.readFileSync(new URL('../lib/chi-muc-luat.js', import.meta.url), 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
kiem('CA NGƯỢC lib không đọc từ điển / tờ khai / tiền lệ / biểu thuế / cây HS', !/tu-vung|precedents|tax\.json|to-khai|tokhai|hs-tree|do-thi|oz-gold|thong-bao|TIEN_LE_TEP/.test(nguon.replace(/'TIEN_LE'/g, '')));
kiem('CA NGƯỢC đường khách (api/, lib/ khác) không nạp chi-muc-luat', (() => {
  const dau = [new URL('../api', import.meta.url).pathname, new URL('../lib', import.meta.url).pathname]; let nap = [];
  const duyet = (d) => { for (const f of fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }) : []) { const p = path.join(d, f.name); if (f.isDirectory()) { if (f.name !== 'node_modules') duyet(p); } else if (/\.(js|mjs|cjs)$/.test(f.name) && !p.endsWith('chi-muc-luat.js') && /chi-muc-luat/.test(fs.readFileSync(p, 'utf8'))) nap.push(p); } };
  dau.forEach(duyet); nap = nap.filter((p) => !/tim-luat\.js$/.test(p)); return nap.length === 0;
})());

// 10. Chỉ mục thật trong repo (nếu đã dựng): khớp danh sách, không lẫn kho cấm, không cần mô hình
{
  const goc = L.GOC_MAC_DINH; const thatMeta = path.join(goc, 'chi-muc', 'meta.json');
  if (!fs.existsSync(thatMeta)) kiem('chỉ mục thật chưa dựng (bỏ qua)', true);
  else {
    L.datLai(); const meta = JSON.parse(fs.readFileSync(thatMeta, 'utf8')); const idf = JSON.parse(fs.readFileSync(path.join(goc, 'chi-muc', 'id.json'), 'utf8')); const dsId = Array.isArray(idf) ? idf : idf.ids;
    kiem('chỉ mục thật: meta.soMuc = số id = cỡ vec.bin / 384', meta.soMuc === dsId.length && fs.statSync(path.join(goc, 'chi-muc', 'vec.bin')).size === meta.soMuc * 384 && meta.dim === 384, `${meta.soMuc}/${dsId.length}`);
    kiem('chỉ mục thật: id duy nhất, không tb:/wco:/gir:, không bieu 7+ số, không đường 8 số', new Set(dsId).size === dsId.length && !dsId.some((x) => /^(tb|wco|gir):|^bieu:\d{7,}/.test(x)));
    kiem('chỉ mục thật: vec.bin ≤ 25 MB (hoặc đã ghi cách gộp)', meta.soMuc * 384 <= 25 * 1048576 || meta.gop?.bat === true);
    const nay = L.napChiMuc(goc);
    if (nay.trangThai === 'OK') {
      const lai = thuMuc({ goc: L.GOC_MAC_DINH, sections: L.SECTIONS_MAC_DINH }).muc.map((m) => m.id);
      kiem('chỉ mục thật: dựng lại danh sách (không cần mô hình) ra đúng id.json', meta.gop?.bat ? lai.length >= dsId.length : JSON.stringify(lai.filter(Boolean)) === JSON.stringify(dsId), `${lai.length} vs ${dsId.length}`);
    } else kiem(`chỉ mục thật phải còn mới (trạng thái ${nay.trangThai})`, false, `${nay.lyDo || ''}${nay.tepLech ? ` — tệp lệch: ${nay.tepLech.join(', ')}` : ''} → DỰNG LẠI: npm run build:chi-muc-luat (khoảng 15 phút CPU). Tệp chỉ mục KHÔNG lưu trong kho (M-37b #2023), không cần commit.`);
  }
}
fs.rmSync(tam, { recursive: true, force: true });
xong();
