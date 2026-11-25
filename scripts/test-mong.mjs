#!/usr/bin/env node
// scripts/test-mong.mjs — cổng kho luật gốc và cổng phạm vi thẻ (docs/mong). Tất định, không mạng, không AI.
import fs from 'node:fs';
import { boKiem } from './lib-luat.mjs';
import { kiemKho, NGU_PHAP } from './kiem-luat-goc.mjs';
import { kiemPhamVi, trungSoHuu } from './kiem-pham-vi-the.mjs';

const { kiem, xong } = boKiem('test-mong');
const pc = JSON.parse(fs.readFileSync(new URL('../docs/mong/phan-cong.json', import.meta.url), 'utf8'));
for (const id of ['gir:1', 'gir:2:a', 'gir:2:a:ct:1', 'phan:XV', 'phan:XV:cg:9:c', 'phan:XV:cg:1:ij', 'chuong:76:cgpn:1:a:ii', 'nhom:7616:ct:3', 'pn:761610:ct:1', 'sen:76169920:1', 'wco:852852:6', 'bieu:76161', 'tb:851-2023:84812090']) kiem(`id hợp lệ ${id}`, NGU_PHAP.test(id));
for (const id of ['', 'phan:15', 'chuong:7', 'nhom:761:ct:1', 'nhom:7616', 'gir:7', 'bieu:7', 'phan:XV:cg']) kiem(`CA NGƯỢC id sai "${id}"`, !NGU_PHAP.test(id));
const nut = (o) => JSON.stringify({ id: 'phan:XV', loai: 'TEN', lop: 'LUAT', cha: null, so: null, nguyenVan: 'Kim loại cơ bản', nguon: { vanBan: 'x', ban: 'HS2022', trang: 1 }, hieuLuc: { tu: null, den: null }, ...o });
const loi = (ds, o) => kiemKho('t', ds, o).loi.join(' | ');
kiem('nút đúng: 0 lỗi', loi([nut({})]) === '');
kiem('trùng id', /trùng id/.test(loi([nut({}), nut({})])));
kiem('thiếu nguồn / trang / hiệu lực', /nguon\.vanBan/.test(loi([nut({ nguon: {} })])) && /hieuLuc/.test(loi([nut({ hieuLuc: null })])));
kiem('cha không có', /cha "phan:I" không có/.test(loi([nut({ cha: 'phan:I' })])));
kiem('dính tiêu đề chương khác', /dính tiêu đề Chương 55/.test(loi([nut({ id: 'nhom:5408:ct:1', loai: 'CHU_GIAI_CHI_TIET', lop: 'HUONG_DAN', nguyenVan: 'vải\nChương 55\nXơ sợi' })])));
kiem('không nguyên văn', /không nguyên văn/.test(loi([nut({ nguyenVan: 'Câu này không có trong văn bản gốc.' })], { vanBan: 'Kim loại cơ bản và sản phẩm' })));
kiem('thiếu nút bắt buộc', /thiếu nút bắt buộc phan:XV:cg:9/.test(loi([nut({})], { kyVong: { 'phan:XV:cg:9': 'v' } })));
kiem('phân công: không hai thẻ song song cùng sở hữu một mẫu tệp', trungSoHuu(pc).length === 0, trungSoHuu(pc).join('; '));
kiem('phân công: thẻ chờ đều có thật', Object.values(pc.the).every((t) => t.sau.every((s) => pc.the[s])));
const p = (tieuDe, tep, nhanh = 'mong/x') => kiemPhamVi({ tieuDe, nhanh, tep, phanCong: pc });
kiem('đúng phạm vi', p('[M-11] x', ['data/luat-goc/phan.jsonl', 'scripts/danh-sach-test.txt']).ok);
kiem('CA NGƯỢC đụng tệp thẻ khác', !p('[M-11] x', ['data/luat-goc/chuong.jsonl']).ok);
kiem('CA NGƯỢC đụng mã đường khách từ thẻ dữ liệu', !p('[M-14] x', ['lib/engine-loop.js']).ok);
kiem('CA NGƯỢC nhánh mong/ mà thiếu mã thẻ', !p('sửa chút', ['README.md']).ok);
kiem('PR thường không bị chặn', p('fix: abc', ['lib/a.js'], 'oz/x').ok);
xong();
