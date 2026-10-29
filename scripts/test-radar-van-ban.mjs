// Test radar dò văn bản mới (#radar — repo sống thở từng ngày)
import './test-isolate-data.mjs';
import { soHieuTuSlug, thuocPhamVi, docRss, phanTich } from './radar-van-ban.mjs';
let passed = 0, failed = 0;
const check = (n, c, d = '') => { if (c) { passed++; console.log('PASS', n); } else { failed++; console.error('FAIL', n, d); } };

// 1. Trích số hiệu từ slug công báo
check('slug: VBHN-TT-NHNN', soHieuTuSlug('https://congbao.chinhphu.vn/van-ban/van-ban-hop-nhat-so-116-2026-vbhn-tt-nhnn-470863.htm') === '116/2026/VBHN-TT-NHNN');
check('slug: TT-BTC', soHieuTuSlug('https://congbao.chinhphu.vn/van-ban/thong-tu-so-38-2015-tt-btc-28278.htm') === '38/2015/TT-BTC');
check('slug: NĐ-CP', soHieuTuSlug('https://congbao.chinhphu.vn/van-ban/nghi-dinh-so-167-2025-nd-cp-214375.htm') === '167/2025/ND-CP');
check('slug: link lạ → null', soHieuTuSlug('https://congbao.chinhphu.vn/tin-tuc/xyz.htm') === null);

// 2. Lọc phạm vi — chỉ từ khoá (VBHN-BTC/BCT là ngoại lệ luôn theo dõi)
check('phạm vi: TT-BTC không từ khoá → bỏ (lọc siết 29/10)', !thuocPhamVi('38/2015/TT-BTC', 'quy định nội bộ tài chính'));
check('phạm vi: TT-BTC chạm từ khoá hải quan → bắt', thuocPhamVi('38/2015/TT-BTC', 'Quy định về thủ tục hải quan'));
check('phạm vi: ND-CP chạm xuất xứ → bắt', thuocPhamVi('384/2026/ND-CP', 'Quy định xác định xuất xứ hàng hóa'));
check('phạm vi: VBHN-BTC luôn theo dõi', thuocPhamVi('52/2026/VBHN-TT-BTC', 'mức thu phí thẩm định'));
check('phạm vi: bộ khác + từ khoá XNK vẫn bắt', thuocPhamVi('01/2026/TT-BNV', 'Quy định về kiểm tra chuyên ngành hàng hóa nhập khẩu'));
check('phạm vi: bộ khác + không liên quan → bỏ', !thuocPhamVi('02/2026/TT-BNV', 'Quy định tổ chức thi công chức'));

// 3. Parse RSS
const xml = `<?xml version="1.0"?><rss version="2.0"><channel><title>x</title>
<item><description><![CDATA[Thông tư quy định kiểm dịch thực vật nhập khẩu]]></description><pubDate>Thu, 29 Oct 2026 00:00:00 GMT</pubDate><link>https://congbao.chinhphu.vn/van-ban/thong-tu-so-99-2026-tt-bnnmt-999999.htm</link></item>
<item><description><![CDATA[Thông tư nội bộ tổ chức bộ máy]]></description><pubDate>Thu, 29 Oct 2026 00:00:00 GMT</pubDate><link>https://congbao.chinhphu.vn/van-ban/thong-tu-so-98-2026-tt-bnv-999998.htm</link></item>
<item><description><![CDATA[Thông tư quy định thủ tục hải quan hàng hóa xuất nhập khẩu (đã có trong sổ)]]></description><pubDate>Thu, 29 Oct 2026 00:00:00 GMT</pubDate><link>https://congbao.chinhphu.vn/van-ban/thong-tu-so-38-2015-tt-btc-28278.htm</link></item>
</channel></rss>`;
const items = docRss(xml);
check('rss: đọc đủ 3 item', items.length === 3);
const kq = phanTich(items);
check('đối chiếu: 38/2015/TT-BTC đã có trong sổ → bỏ', kq.boQuaDaCo.length === 1 && kq.boQuaDaCo[0].soHieu === '38/2015/TT-BTC');
check('đối chiếu: TT 99/2026/TT-BNNMT KDTV chưa có → MỚI', kq.moi.length === 1 && kq.moi[0].soHieu === '99/2026/TT-BNNMT');
check('lọc: TT-BNV nội bộ tổ chức → ngoài phạm vi', kq.ngoaiPhamVi.length === 1);

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
