// lib/xac-minh-nguon.js — máy mở nguồn kiểm chứng (#334). Fetch giả, không mạng.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { xacMinh, xacMinhNhieu, urlAnToan } = require('../lib/xac-minh-nguon.js');

let pass = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { pass++; console.log(`PASS ${n}`); } else { fail++; console.log(`FAIL ${n} ${x}`); } };

// ── URL an toàn ──
check('SSRF: localhost/IP nội bộ bị chặn', urlAnToan('http://127.0.0.1/x') === null && urlAnToan('http://192.168.1.5/x') === null);
check('URL hợp lệ qua', urlAnToan('https://mbraun.com/product') !== null);

// ── fetch giả ──
const fakeOk = async (url) => ({ ok: true, status: 200, arrayBuffer: async () => Buffer.from('<html>MBraun MB-200MOD Universal Glovebox with gas purification</html>') });
const fake404 = async () => ({ ok: false, status: 404, arrayBuffer: async () => Buffer.from('') });
const fakeHang = (url, opts) => new Promise((_, rej) => opts?.signal?.addEventListener('abort', () => rej(new Error('timeout'))));

const keepAlive = setInterval(() => {}, 1000); // AbortSignal.timeout không giữ event loop

// ── xacMinh 1 nguồn ──
const r1 = await xacMinh({ url: 'https://mbraun.com/x', trich: 'MB-200MOD Universal Glovebox' }, 'MB-200MOD', fakeOk);
check('nguồn 200 + trích có mặt → moDuoc + trichCoMat', r1.moDuoc === true && r1.trichCoMat === true);
check('có snapshotHash (sha256)', /^[0-9a-f]{64}$/.test(r1.snapshotHash || ''));
check('model có mặt trong nội dung', r1.modelCoMat === true);

const r2 = await xacMinh({ url: 'https://dead.example.com/x', trich: 'whatever' }, '', fake404);
check('nguồn 404 → moDuoc=false + lỗi', r2.moDuoc === false && r2.maTrang === 404);

const r3 = await xacMinh({ url: 'https://slow.example.com/x' }, '', fakeHang);
check('nguồn treo → lỗi timeout', r3.moDuoc === false && /timeout|abort/i.test(r3.loi || ''));

const r4 = await xacMinh({ url: 'http://192.168.1.5/admin' }, '', fakeOk);
check('SSRF bị chặn tại xacMinh', r4.moDuoc === false && /SSRF/i.test(r4.loi || ''));

// ── xacMinhNhieu: gán nhãn kết quả ──
const ds = [
  { url: 'https://a.example.com/x', trich: 'MB-200MOD Glovebox' },
  { url: 'https://b.example.com/y', trich: 'not found text' },
  { url: 'https://c.example.com/z' }, // không có trích
];
const fetchMulti = async (url) => {
  if (url.includes('a.example')) return { ok: true, status: 200, arrayBuffer: async () => Buffer.from('MB-200MOD Glovebox here') };
  if (url.includes('b.example')) return { ok: true, status: 200, arrayBuffer: async () => Buffer.from('totally different content') };
  return { ok: true, status: 200, arrayBuffer: async () => Buffer.from('nothing relevant') };
};
const nhieu = await xacMinhNhieu(ds, 'MB-200MOD', fetchMulti);
check('3 nguồn → 3 kết quả', nhieu.length === 3);
check('nguồn A (trích đúng) → xacMinhOk=true', nhieu[0]?.xacMinhOk === true);
check('nguồn B (trích không có) → xacMinhOk=false', nhieu[1]?.xacMinhOk === false);
check('nguồn C (không trích, không model match) → xacMinhOk=false', nhieu[2]?.xacMinhOk === false);

// ── Cổng chống SSRF dùng chung (lib/url-cong-khai.js) ──
{
  const U = require('../lib/url-cong-khai.js');
  const IP_CHAN = ['127.0.0.1', '127.255.255.254', '10.0.0.1', '10.255.255.255', '172.16.0.1', '172.20.5.5', '172.31.255.255', '192.168.0.1', '192.168.1.5', '169.254.169.254', '169.254.1.1', '100.64.0.1', '100.127.255.255', '0.0.0.0', '224.0.0.1', '255.255.255.255',
    '::1', '::', 'fc00::1', 'fd00:ec2::254', 'fdff:ffff::1', 'fe80::1', 'ff02::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1', '::ffff:8.8.8.8', '64:ff9b::a00:1', '2002:7f00:1::1'];
  const IP_QUA = ['8.8.8.8', '93.184.216.34', '172.15.255.255', '172.32.0.1', '100.63.255.255', '100.128.0.1', '169.253.1.1', '192.167.1.1', '2606:4700:4700::1111', '2a00:1450:4001::200e'];
  check(`ipCongKhai: ${IP_CHAN.length} địa chỉ riêng/loopback/link-local/CGNAT/metadata (v4+v6) đều bị chặn`, IP_CHAN.every((ip) => U.ipCongKhai(ip) === false), IP_CHAN.filter((ip) => U.ipCongKhai(ip)).join());
  check(`ipCongKhai: ${IP_QUA.length} địa chỉ công khai sát biên đều qua; chuỗi không phải IP ⇒ false`, IP_QUA.every((ip) => U.ipCongKhai(ip) === true) && U.ipCongKhai('a.example.com') === false && U.ipCongKhai('') === false, IP_QUA.filter((ip) => !U.ipCongKhai(ip)).join());
  const URL_CHAN = ['http://127.0.0.1/x', 'http://10.1.2.3/', 'http://172.16.0.9/', 'http://172.31.0.9/', 'http://192.168.1.5/admin', 'http://169.254.169.254/latest/meta-data/', 'http://[::1]/', 'http://[fc00::1]/', 'http://[fd00:ec2::254]/', 'http://[fe80::1]/', 'http://[::ffff:10.0.0.1]/',
    'http://2130706433/', 'http://0x7f.1/', 'http://127.1/', 'http://0177.0.0.1/', 'http://localhost/', 'http://LOCALHOST./', 'http://db.internal/', 'http://may-in.local/', 'http://intranet/', 'ftp://a.example.com/', 'file:///etc/passwd', 'javascript:alert(1)', 'gopher://a.example.com/', 'https://u:p@a.example.com/', 'https://a.example.com:22/', 'https://a.example.com:6379/', 'khong-phai-url', ''];
  check(`kiemUrlTinh + urlAnToan: ${URL_CHAN.length} URL xấu (IP riêng mọi cách viết, tên nội bộ, scheme lạ, kèm tài khoản, cổng lạ) đều bị chặn`, URL_CHAN.every((u) => U.kiemUrlTinh(u).ok === false && urlAnToan(u) === null), URL_CHAN.filter((u) => U.kiemUrlTinh(u).ok || urlAnToan(u)).join(' | '));
  check('kiemUrlTinh: URL công khai (kể cả cổng 8080/8443, IP công khai) qua', ['https://a.example.com/x?y=1', 'http://a.example.com:8080/', 'https://a.example.com:8443/p', 'http://8.8.8.8/'].every((u) => U.kiemUrlTinh(u).ok === true));

  // Bộ phân giải giả: tên → danh sách địa chỉ
  const DNS = { 'cong-khai.example.com': ['93.184.216.34'], 'rieng.example.com': ['10.0.0.7'], 'lan-lon.example.com': ['93.184.216.34', '192.168.1.9'], 'v6-rieng.example.com': ['fd00::9'], 'meta.example.com': ['169.254.169.254'], 'loop.example.com': ['127.0.0.1'], 'chuyen.example.com': ['93.184.216.34'], 'vong.example.com': ['93.184.216.34'] };
  const demDns = [];
  const dnsGia = (ten, o, cb) => { demDns.push(ten); const ds = DNS[ten]; if (!ds) return cb(Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' })); return cb(null, ds.map((a) => ({ address: a, family: a.includes(':') ? 6 : 4 }))); };
  const tra = (ten, o = {}) => new Promise((r) => U.lookupAnToan(dnsGia)(ten, o, (e, a, f) => r({ e, a, f })));
  const k1 = await tra('cong-khai.example.com'); const k2 = await tra('cong-khai.example.com', { all: true });
  check('lookupAnToan: tên phân giải ra địa chỉ công khai ⇒ trả đúng địa chỉ đó (cả dạng all)', !k1.e && k1.a === '93.184.216.34' && k1.f === 4 && Array.isArray(k2.a) && k2.a[0].address === '93.184.216.34', JSON.stringify([k1, k2]));
  for (const ten of ['rieng.example.com', 'lan-lon.example.com', 'v6-rieng.example.com', 'meta.example.com', 'loop.example.com']) {
    const k = await tra(ten);
    check(`lookupAnToan: "${ten}" phân giải ra ${DNS[ten].join('+')} ⇒ chặn (SSRF_BI_CHAN), không trả địa chỉ nào`, k.e && k.e.code === 'SSRF_BI_CHAN' && k.a === undefined, JSON.stringify(k));
  }
  check('lookupAnToan: tên không phân giải được ⇒ chuyển tiếp lỗi DNS', (await tra('khong-co.example.com')).e?.code === 'ENOTFOUND');

  // fetchCongKhai + chuyển hướng (fetch giả có Location)
  const goiFetch = [];
  const TRANG_CH = {
    'https://chuyen.example.com/ra-rieng-ip': { status: 302, location: 'http://192.168.1.5/admin' },
    'https://chuyen.example.com/ra-meta': { status: 301, location: 'http://169.254.169.254/latest/meta-data/' },
    'https://chuyen.example.com/ra-ten-rieng': { status: 307, location: 'https://rieng.example.com/x' },
    'https://chuyen.example.com/ra-v6': { status: 302, location: 'http://[::1]:8080/' },
    'https://chuyen.example.com/ra-file': { status: 302, location: 'file:///etc/passwd' },
    'https://chuyen.example.com/tuong-doi': { status: 302, location: '/dich' },
    'https://chuyen.example.com/dich': { status: 200, than: 'đích công khai MB-200MOD' },
    'https://vong.example.com/a': { status: 302, location: 'https://vong.example.com/a' },
  };
  const fetchCh = async (url, o) => { goiFetch.push({ url, redirect: o && o.redirect }); const t = TRANG_CH[url]; if (!t) return { ok: false, status: 404, headers: { get: () => null }, arrayBuffer: async () => Buffer.from('') }; return { ok: t.status === 200, status: t.status, headers: { get: (k) => (String(k).toLowerCase() === 'location' ? t.location || null : null) }, arrayBuffer: async () => Buffer.from(t.than || '') }; };
  const thu = async (url) => { try { return { res: await U.fetchCongKhai(url, {}, { fetchImpl: fetchCh, lookup: dnsGia }) }; } catch (e) { return { e }; } };
  for (const [duoi, ten] of [['ra-rieng-ip', 'IP riêng 192.168.x'], ['ra-meta', 'metadata 169.254.169.254'], ['ra-ten-rieng', 'tên phân giải ra 10.x'], ['ra-v6', 'IPv6 loopback'], ['ra-file', 'scheme file:']]) {
    const n0 = goiFetch.length;
    const k = await thu(`https://chuyen.example.com/${duoi}`);
    check(`fetchCongKhai: chuyển hướng sang ${ten} ⇒ chặn, KHÔNG gửi yêu cầu nào tới đích`, k.e?.code === 'SSRF_BI_CHAN' && goiFetch.length - n0 === 1, JSON.stringify([k.e?.message, goiFetch.slice(n0)]));
  }
  const kTd = await thu('https://chuyen.example.com/tuong-doi');
  check('fetchCongKhai: chuyển hướng tương đối sang trang công khai ⇒ theo, trả trang đích; luôn gọi với redirect:"manual"', kTd.res?.status === 200 && kTd.res.urlCuoi === 'https://chuyen.example.com/dich' && goiFetch.every((g) => g.redirect === 'manual'), JSON.stringify(kTd.e?.message));
  const n1 = goiFetch.length; const kV = await thu('https://vong.example.com/a');
  check(`fetchCongKhai: vòng chuyển hướng ⇒ dừng sau ${U.SO_CHUYEN_HUONG} bước (${U.SO_CHUYEN_HUONG + 1} yêu cầu), báo lỗi`, kV.e?.code === 'SSRF_BI_CHAN' && goiFetch.length - n1 === U.SO_CHUYEN_HUONG + 1, String(goiFetch.length - n1));
  const n2 = goiFetch.length; const kR = await thu('https://rieng.example.com/x'); const kL = await thu('http://127.0.0.1/x');
  check('fetchCongKhai: URL đầu là tên phân giải ra địa chỉ riêng / IP loopback ⇒ chặn trước khi gửi yêu cầu', kR.e?.code === 'SSRF_BI_CHAN' && kL.e?.code === 'SSRF_BI_CHAN' && goiFetch.length === n2);

  // xacMinh / xacMinhNhieu đi qua cùng cổng
  const xm = async (url) => xacMinh({ url, trich: 'đích công khai MB-200MOD' }, 'MB-200MOD', fetchCh, { lookup: dnsGia });
  const x1 = await xm('https://chuyen.example.com/tuong-doi'); const x2 = await xm('https://chuyen.example.com/ra-rieng-ip'); const x3 = await xm('https://rieng.example.com/x'); const x4 = await xm('https://chuyen.example.com/ra-meta');
  check('xacMinh: chuyển hướng công khai ⇒ đọc trang đích (moDuoc + trichCoMat)', x1.moDuoc === true && x1.trichCoMat === true, JSON.stringify(x1));
  check('xacMinh: chuyển hướng sang địa chỉ riêng / metadata, hoặc tên phân giải ra địa chỉ riêng ⇒ moDuoc=false + lỗi SSRF', [x2, x3, x4].every((x) => x.moDuoc === false && x.snapshotHash === null && /SSRF/.test(x.loi || '')), JSON.stringify([x2.loi, x3.loi, x4.loi]));
  const xn = await xacMinhNhieu([{ url: 'https://chuyen.example.com/dich', trich: 'đích công khai' }, { url: 'https://lan-lon.example.com/x', trich: 'x'.repeat(10) }, { url: 'http://[fd00:ec2::254]/' }], 'MB-200MOD', fetchCh, { lookup: dnsGia });
  check('xacMinhNhieu: truyền lookup xuống; nguồn công khai OK, tên lẫn địa chỉ riêng + IPv6 ULA bị chặn', xn.length === 3 && xn[0].xacMinhOk === true && xn[1].xacMinhOk === false && /SSRF/.test(xn[1].loi || '') && xn[2].xacMinhOk === false && /SSRF/.test(xn[2].loi || ''), JSON.stringify(xn.map((x) => x.loi)));
}

clearInterval(keepAlive);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
