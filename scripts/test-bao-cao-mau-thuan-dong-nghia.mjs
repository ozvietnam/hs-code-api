#!/usr/bin/env node
/**
 * Cổng kiểm cho G1-2 (docs/do-thi/mau-thuan-dong-nghia.md và scripts/bao-cao-mau-thuan-dong-nghia.mjs):
 *   - Chạy lại ra tệp markdown giống hệt (sha256 trùng khớp, không có dấu thời gian)
 *   - Mọi đích trong báo cáo tồn tại trong biểu thuế hiện hành (DoThi.coNut)
 *   - Mọi cụm trong bangCanh().c1.mauThuan đều có mặt; mọi cụm báo cáo đều tra được bằng timCum()
 *   - Tổng phân loại (a)+(b)+(c)+(d) khớp tổng từng loại; xếp đúng thứ tự tổng TK đích giảm dần
 *   - Đơn vị kiểm hàm phanLoaiCum cho cả (a), (b), (c) và ca ngược (d)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { GOC, boKiem } from './lib-luat.mjs';
import { taoBaoCao, dinhDangMarkdown, phanLoaiCum } from './bao-cao-mau-thuan-dong-nghia.mjs';

process.chdir(GOC);
const require = createRequire(import.meta.url);
const DoThi = require('../lib/do-thi/index.js');
const { kiem, xong } = boKiem('test-bao-cao-mau-thuan-dong-nghia');

const bam = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

const tepMd = path.join(GOC, 'docs/do-thi/mau-thuan-dong-nghia.md');
kiem('có tệp docs/do-thi/mau-thuan-dong-nghia.md', fs.existsSync(tepMd));

const mdDia = fs.existsSync(tepMd) ? fs.readFileSync(tepMd, 'utf8') : '';
const bc1 = taoBaoCao();
const md1 = dinhDangMarkdown(bc1);
const bc2 = taoBaoCao();
const md2 = dinhDangMarkdown(bc2);

kiem('chạy lại ra tệp giống hệt (sha256 khớp docs/do-thi/mau-thuan-dong-nghia.md)', bam(mdDia) === bam(md1), `dia=${bam(mdDia).slice(0, 12)} gen=${bam(md1).slice(0, 12)}`);
kiem('hai lần dựng liên tiếp ra cùng sha256', bam(md1) === bam(md2));
kiem('tệp báo cáo ghi rõ lệnh dựng lại', mdDia.includes('node scripts/bao-cao-mau-thuan-dong-nghia.mjs --ghi'));
kiem('tệp báo cáo không chứa dấu thời gian ISO', !/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(mdDia));

// Kiểm tra mọi đích đều có nút hợp lệ trong biểu thuế hiện hành
const tatCaMuc = [...bc1.khacNhom4, ...bc1.khacPn6CungNhom];
const dichKhongTonTai = [];
const khongTraDuoc = [];
for (const x of tatCaMuc) {
  if (!DoThi.timCum(x.cum)) khongTraDuoc.push(x.cum);
  for (const d of x.dich) {
    if (!DoThi.coNut(d.ma)) dichKhongTonTai.push(`${x.cum}->${d.ma}`);
  }
}
kiem(`mọi đích đều tồn tại trong biểu thuế hiện hành (${tatCaMuc.length} cụm)`, dichKhongTonTai.length === 0, dichKhongTonTai.slice(0, 5).join(', '));
kiem('mọi cụm trong báo cáo đều tra được bằng timCum()', khongTraDuoc.length === 0, khongTraDuoc.slice(0, 5).join(', '));

// Mọi cụm trong c1.mauThuan đều nằm trong Loại 1
const b = DoThi.bangCanh();
const khoaN4 = new Set(bc1.khacNhom4.map((x) => x.khoa));
const thieuMauThuan = b.c1.mauThuan.filter((m) => !khoaN4.has(m.khoa)).map((m) => m.cum);
kiem(`đủ toàn bộ ${b.c1.mauThuan.length} cụm lệch hẳn trong c1.mauThuan`, thieuMauThuan.length === 0, thieuMauThuan.join(', '));

// Tổng cộng khớp số lượng và thứ tự xếp hạng đúng
for (const [ten, ds, tk] of [
  ['Loại 1 (>=2 nhóm 4 số)', bc1.khacNhom4, bc1.tongQuan.khacNhom4],
  ['Loại 2 (cùng nhóm, >=2 PN6)', bc1.khacPn6CungNhom, bc1.tongQuan.khacPn6CungNhom],
]) {
  const congLoai = tk.theoLoai.a + tk.theoLoai.b + tk.theoLoai.c + tk.theoLoai.d;
  kiem(`${ten}: tổng (a)+(b)+(c)+(d) = tổng cụm (${congLoai} == ${ds.length})`, congLoai === ds.length && ds.length > 0);
  const dungThuTu = ds.every((x, i) => i === 0 || ds[i - 1].tongToKhaiDich >= x.tongToKhaiDich);
  kiem(`${ten}: xếp theo tổng số dòng tờ khai giảm dần`, dungThuTu);
}

// Kiểm tra "bình thủy" đã hết mâu thuẫn sau #1611 (bỏ đích 7013 sai, giữ 9617), còn các cụm chờ thực vẫn có mặt đúng loại
const binhThuy = bc1.khacNhom4.find((x) => x.khoa === 'binh thuy');
const binhThuyC1 = DoThi.timCum('bình thủy');
kiem('cụm "bình thủy" đã sạch khỏi khacNhom4 và chỉ trỏ 9617 (trade-synonyms)', !binhThuy && Boolean(binhThuyC1) && binhThuyC1.dich.every((d) => d.ma.startsWith('9617')), JSON.stringify({ binhThuy, binhThuyC1 }));
const giay = bc1.khacNhom4.find((x) => x.khoa === 'giay');
kiem('cụm mẫu "giay" (6403/6404) có mặt trong khacNhom4 và xếp loại (b)', Boolean(giay) && giay.phanLoai.maLoai === 'b', JSON.stringify(giay));
const vanAnToan = bc1.khacPn6CungNhom.find((x) => x.khoa === 'van an toan');
kiem('cụm mẫu "van an toàn" (848140/848180) có mặt trong khacPn6CungNhom và xếp loại (a)', Boolean(vanAnToan) && vanAnToan.phanLoai.maLoai === 'a' && vanAnToan.phanLoai.nhan.includes('trade-synonyms'), JSON.stringify(vanAnToan));

// Kiểm tra định dạng bảng markdown không bị vỡ dòng
const tableLines = mdDia.split('\n').filter((l) => l.startsWith('|'));
const brokenRows = tableLines.filter((l) => l.split('|').length < 8);
kiem('bảng markdown không có hàng vỡ cột', brokenRows.length === 0, brokenRows.slice(0, 3).join(' || '));

// Kiểm tra CLI chạy không ghi tệp thoát 0 và in JSON hợp lệ
const cliOut = execFileSync(process.execPath, [path.join(GOC, 'scripts/bao-cao-mau-thuan-dong-nghia.mjs')], { cwd: GOC, encoding: 'utf8' });
const cliJson = JSON.parse(cliOut);
kiem('CLI không --ghi in JSON có đủ thống kê khacNhom4 và khacPn6CungNhom', cliJson.khacNhom4?.tongCum === bc1.khacNhom4.length && cliJson.khacPn6CungNhom?.tongCum === bc1.khacPn6CungNhom.length);

// Đơn vị test hàm phanLoaiCum (có ca thuận và ca ngược không phán xử bừa)
kiem('phanLoaiCum(a): 1 đích có TK+TB, đích kia 0/0 -> nghi đích sai ở kho X', phanLoaiCum([
  { ma: '7013', nguonKho: ['hs-aliases'], soToKhai: 2, soThongBao: 2 },
  { ma: '9617', nguonKho: ['trade-synonyms'], soToKhai: 0, soThongBao: 0 },
]).maLoai === 'a');
kiem('phanLoaiCum(b): >= 2 đích có TK -> cụm mơ hồ thật', phanLoaiCum([
  { ma: '6403', nguonKho: ['vn-product-synonyms'], soToKhai: 17, soThongBao: 0 },
  { ma: '6404', nguonKho: ['hs-aliases'], soToKhai: 22, soThongBao: 0 },
]).maLoai === 'b');
kiem('phanLoaiCum(c): 0 đích có TK -> chưa có căn cứ', phanLoaiCum([
  { ma: '7408', nguonKho: ['synonyms'], soToKhai: 0, soThongBao: 0 },
  { ma: '8544', nguonKho: ['english-product-map'], soToKhai: 0, soThongBao: 1 },
]).maLoai === 'c');
kiem('ca ngược phanLoaiCum(d): 1 đích có TK nhưng TB=0 -> KHÔNG xếp vào (a)', phanLoaiCum([
  { ma: '8479', nguonKho: ['hs-aliases'], soToKhai: 2, soThongBao: 0 },
  { ma: '8428', nguonKho: ['trade-synonyms'], soToKhai: 0, soThongBao: 0 },
]).maLoai === 'd');

xong();
