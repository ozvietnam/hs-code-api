/**
 * lib/url-cong-khai.js — MỘT cổng chống SSRF cho mọi lần máy chủ tự mở URL do bên ngoài đưa vào
 * (nguồn LLM đề xuất, nguồn từ máy tìm kiếm, nguồn trong `dinhDanh` bên gọi gửi).
 *
 * Ba lớp, đều phải qua:
 *  1. TĨNH (kiemUrlTinh): chỉ http/https; không kèm user:pass; cổng 80/443/8080/8443; tên máy không phải tên nội bộ
 *     (localhost, *.local, *.internal, tên một nhãn…); nếu là địa chỉ IP thì phải là địa chỉ CÔNG KHAI.
 *  2. DNS (lookupAnToan): MỌI địa chỉ tên máy phân giải ra phải công khai — một địa chỉ riêng là chặn cả tên. Ở đường chạy
 *     thật, hàm này chính là hàm `lookup` của socket ⇒ địa chỉ đã kiểm cũng là địa chỉ được nối tới (không có khe
 *     "kiểm một đằng, nối một nẻo" / DNS rebinding).
 *  3. CHUYỂN HƯỚNG: tự đi từng bước (không để thư viện tự theo), tối đa SO_CHUYEN_HUONG bước, mỗi bước qua lại lớp 1 + 2.
 *
 * Dải bị chặn — IPv4: 0/8, 10/8, 100.64/10 (CGNAT), 127/8, 169.254/16 (link-local + metadata 169.254.169.254), 172.16/12,
 * 192.0.0/24, 192.0.2/24, 192.168/16, 198.18/15, 198.51.100/24, 203.0.113/24, 224/4, 240/4.
 * IPv6: ::, ::1, ::ffff:0:0/96 (IPv4 ánh xạ), 64:ff9b::/96 (NAT64), 2001::/32 (Teredo), 2001:db8::/32, 2002::/16 (6to4),
 * fc00::/7 (ULA, gồm metadata fd00:ec2::254), fe80::/10, ff00::/8.
 *
 * `fetchImpl` chỉ để test tiêm: khi có nó thì không có socket thật, lớp 2 chạy trước mỗi bước nếu test đưa kèm `lookup`.
 */
const net = require('node:net');
const dns = require('node:dns');
const http = require('node:http');
const https = require('node:https');
const zlib = require('node:zlib');

const SO_CHUYEN_HUONG = 4;
const CONG_CHO_PHEP = new Set(['', '80', '443', '8080', '8443']);
const TEN_NOI_BO = /(^|\.)(localhost|local|localdomain|internal|intranet|lan|home|corp|home\.arpa)$/i;

const CHAN = new net.BlockList();
for (const [d, n] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
  ['224.0.0.0', 4], ['240.0.0.0', 4]]) CHAN.addSubnet(d, n, 'ipv4');
for (const [d, n] of [['::', 128], ['::1', 128], ['64:ff9b::', 96], ['2001::', 32], ['2001:db8::', 32], ['2002::', 16],
  ['fc00::', 7], ['fe80::', 10], ['ff00::', 8]]) CHAN.addSubnet(d, n, 'ipv6');

// IPv4 ánh xạ (::ffff:a.b.c.d) để RIÊNG: đặt chung vào CHAN thì net.BlockList coi mọi IPv4 là thuộc dải này và chặn hết.
const ANH_XA = new net.BlockList();
ANH_XA.addSubnet('::ffff:0:0', 96, 'ipv6');

/** Địa chỉ IP (chuỗi) có phải địa chỉ CÔNG KHAI không. Không phải IP hợp lệ ⇒ false. */
function ipCongKhai(ip) {
  const s = String(ip ?? '').trim().replace(/^\[|\]$/g, '').replace(/%.*$/, ''); // bỏ ngoặc + zone id
  const ho = net.isIP(s);
  if (ho === 4) return !CHAN.check(s, 'ipv4');
  if (ho === 6) return !ANH_XA.check(s, 'ipv6') && !CHAN.check(s, 'ipv6'); // IPv4 ánh xạ: chặn hẳn, không có lý do chính đáng
  return false;
}

/**
 * Lớp 1 — kiểm tĩnh, không mạng.
 * @returns {{ok: true, url: string, tenMay: string, laIp: boolean} | {ok: false, lyDo: string}}
 */
function kiemUrlTinh(url) {
  let u;
  try { u = new URL(String(url)); } catch { return { ok: false, lyDo: 'URL không hợp lệ' }; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return { ok: false, lyDo: 'chỉ nhận http/https' };
  if (u.username || u.password) return { ok: false, lyDo: 'URL kèm tài khoản' };
  if (!CONG_CHO_PHEP.has(u.port)) return { ok: false, lyDo: `cổng ${u.port} không được phép` };
  const tenMay = u.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
  if (!tenMay) return { ok: false, lyDo: 'thiếu tên máy' };
  if (net.isIP(tenMay)) {
    if (!ipCongKhai(tenMay)) return { ok: false, lyDo: 'địa chỉ IP nội bộ/đặc biệt' };
    return { ok: true, url: u.href, tenMay, laIp: true };
  }
  if (!tenMay.includes('.') || TEN_NOI_BO.test(tenMay)) return { ok: false, lyDo: 'tên máy nội bộ' };
  return { ok: true, url: u.href, tenMay, laIp: false };
}

function loiSsrf(lyDo) {
  const e = new Error(`SSRF bị chặn: ${lyDo}`);
  e.code = 'SSRF_BI_CHAN';
  return e;
}

/**
 * Lớp 2 — bọc một hàm lookup kiểu dns.lookup thành hàm lookup CHỈ trả địa chỉ công khai. Dùng làm `lookup` của socket.
 * Một địa chỉ riêng trong kết quả ⇒ lỗi (chặn cả tên, không "chọn địa chỉ sạch").
 */
function lookupAnToan(lookupGoc = dns.lookup) {
  return function lookup(tenMay, options, cb) {
    if (typeof options === 'function') { cb = options; options = {}; }
    const o = typeof options === 'number' ? { family: options } : { ...(options || {}) };
    lookupGoc(tenMay, { ...o, all: true }, (err, ds) => {
      if (err) return cb(err);
      const list = (Array.isArray(ds) ? ds : [{ address: ds, family: net.isIP(String(ds)) }]).filter((a) => a && a.address);
      if (!list.length) return cb(loiSsrf('tên máy không phân giải ra địa chỉ nào'));
      if (!list.every((a) => ipCongKhai(a.address))) return cb(loiSsrf('tên máy phân giải ra địa chỉ nội bộ'));
      return o.all ? cb(null, list) : cb(null, list[0].address, list[0].family || net.isIP(list[0].address));
    });
  };
}

/** Phân giải + kiểm (dạng Promise) — cho đường có fetchImpl tiêm kèm lookup, và cho test. */
function traCuuCongKhai(tenMay, lookupGoc) {
  return new Promise((resolve, reject) => lookupAnToan(lookupGoc)(tenMay, { all: true }, (e, ds) => (e ? reject(e) : resolve(ds))));
}

/** Giải nén an toàn cả khi stream bị cắt ngang ở maxBytes hoặc khi bung ra > maxBytes: trả tối đa maxBytes+1 byte đầu. */
function giaiNenDau(buf, nen, maxBytes) {
  if (!nen || nen === 'identity') return buf.length > maxBytes + 1 ? buf.subarray(0, maxBytes + 1) : buf;
  const gioiHan = maxBytes + 1;
  // Dùng sync stream (write + flush) để lấy toàn bộ các chunk giải nén thành công trước điểm bị cắt ngang mà không nổ ERR_BUFFER_TOO_LARGE.
  let st;
  if (nen === 'gzip' || nen === 'x-gzip') st = zlib.createGunzip({ finishFlush: zlib.constants.Z_SYNC_FLUSH });
  else if (nen === 'deflate') st = zlib.createInflate({ finishFlush: zlib.constants.Z_SYNC_FLUSH });
  else if (nen === 'br') st = zlib.createBrotliDecompress({ finishFlush: zlib.constants.BROTLI_OPERATION_FLUSH });
  else return buf.length > gioiHan ? buf.subarray(0, gioiHan) : buf;
  return new Promise((resolve) => {
    const out = []; let daLay = 0; let xong = false;
    const ket = () => {
      if (xong) return; xong = true;
      const gop = Buffer.concat(out);
      resolve(gop.length > gioiHan ? gop.subarray(0, gioiHan) : gop);
    };
    st.on('data', (c) => {
      if (xong) return;
      out.push(c); daLay += c.length;
      if (daLay >= gioiHan) { ket(); st.destroy(); }
    });
    st.on('end', ket);
    st.on('error', ket); // nếu đuôi stream bị cắt cụt, vẫn giữ toàn bộ các chunk đầu đã giải nén được
    st.end(buf);
  });
}

/** Một yêu cầu GET bằng node:http(s), socket dùng lookupAnToan; đọc tối đa maxBytes+1 byte. Trả vật giống Response. */
function yeuCauThat(url, { headers, signal, maxBytes, lookupGoc }) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.request(u, { method: 'GET', headers: { ...headers, 'accept-encoding': 'identity' }, lookup: lookupAnToan(lookupGoc), signal, agent: false }, (res) => {
      const status = res.statusCode || 0;
      const lay = (k) => { const v = res.headers[String(k).toLowerCase()]; return Array.isArray(v) ? v[0] : (v ?? null); };
      if (status >= 300 && status < 400) { res.resume(); return resolve({ status, ok: false, headers: { get: lay }, arrayBuffer: async () => Buffer.alloc(0) }); }
      const khuc = []; let tong = 0; let xong = false;
      const ket = async () => {
        if (xong) return; xong = true;
        const raw = Buffer.concat(khuc);
        const nen = String(lay('content-encoding') || '').toLowerCase();
        const buf = await giaiNenDau(raw, nen, maxBytes);
        resolve({ status, ok: status >= 200 && status < 300, headers: { get: lay }, arrayBuffer: async () => buf });
      };
      res.on('data', (c) => { tong += c.length; khuc.push(c); if (tong > maxBytes) { ket(); res.destroy(); } });
      res.on('end', ket);
      res.on('error', (e) => (xong ? null : reject(e)));
    });
    req.on('error', reject);
    req.end();
  });
}

/**
 * GET một URL công khai, tự đi từng bước chuyển hướng và kiểm lại mỗi bước.
 * @param {string} url
 * @param {{timeoutMs?: number, headers?: object, maxBytes?: number, soChuyenHuong?: number}} [o]
 * @param {{fetchImpl?: Function, lookup?: Function}} [tiem] chỉ dùng trong test
 * @returns {Promise<{status:number, ok:boolean, arrayBuffer:Function, headers?:object, urlCuoi:string}>}
 * @throws lỗi code 'SSRF_BI_CHAN' khi bất kỳ bước nào không qua cổng
 */
async function fetchCongKhai(url, o = {}, tiem = {}) {
  const signal = AbortSignal.timeout(o.timeoutMs || 8000);
  const maxBytes = o.maxBytes || 512 * 1024;
  const tranBuoc = Number.isInteger(o.soChuyenHuong) ? o.soChuyenHuong : SO_CHUYEN_HUONG;
  let hienTai = String(url);
  for (let buoc = 0; buoc <= tranBuoc; buoc += 1) {
    const k = kiemUrlTinh(hienTai);
    if (!k.ok) throw loiSsrf(k.lyDo);
    let res;
    if (tiem.fetchImpl) {
      if (tiem.lookup && !k.laIp) await traCuuCongKhai(k.tenMay, tiem.lookup);
      res = await tiem.fetchImpl(k.url, { signal, headers: o.headers, redirect: 'manual' });
    } else {
      res = await yeuCauThat(k.url, { headers: o.headers, signal, maxBytes, lookupGoc: tiem.lookup });
    }
    const status = res?.status ?? 0;
    const dich = status >= 300 && status < 400 && res?.headers && typeof res.headers.get === 'function' ? res.headers.get('location') : null;
    if (!dich) { if (res && typeof res === 'object') res.urlCuoi = k.url; return res; }
    try { hienTai = new URL(dich, k.url).href; } catch { throw loiSsrf('đích chuyển hướng không hợp lệ'); }
  }
  throw loiSsrf(`quá ${tranBuoc} bước chuyển hướng`);
}

module.exports = { ipCongKhai, kiemUrlTinh, lookupAnToan, traCuuCongKhai, fetchCongKhai, giaiNenDau, SO_CHUYEN_HUONG };
