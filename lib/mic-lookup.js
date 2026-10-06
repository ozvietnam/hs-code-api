// Kiểm chứng chéo trên made-in-china.com (CEO 06/10/2026): hàng máy có model → xem nhiều shop ghi mã HS
// giống hay khác, và lấy "quan điểm nhà sản xuất" về tên gọi / công dụng / chất liệu.
//  - Chỉ đi đường robots.txt CHO PHÉP: /products-search/hot-china-products/<Slug>.html (các URL *.do? bị
//    Disallow). Đọc Ô CÓ CẤU TRÚC (bảng bac-item-label/value, JSON-LD) — không đọc văn quảng cáo.
//  - Mã HS trên trang là mã nhà bán Trung Quốc tự ghi (thường theo biểu thuế TQ): CHỈ là tín hiệu đối chiếu
//    ở cấp nhóm 4 số khi ≥2 SHOP KHÁC NHAU cùng ghi; không bao giờ là căn cứ chốt.
//  - Lịch sự: tuần tự, nghỉ giữa các lượt, 1 tìm kiếm + tối đa 4 trang/món, cache 30 ngày (/data/mic-cache.json).
const fs = require('fs');
const { dataPath } = require('./data-paths');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const KEEP = new Map([
  ['hs code', 'hsCode'], ['model no.', 'model'], ['model no', 'model'], ['material', 'material'], ['usage', 'usage'],
  ['application', 'application'], ['power type', 'powerType'], ['power source', 'powerType'], ['voltage', 'voltage'],
  ['power', 'power'], ['power (w)', 'power'], ['trademark', 'trademark'], ['origin', 'origin'], ['type', 'type'],
  ['function', 'function'], ['certification', 'certification'], ['capacity', 'capacity'], ['feature', 'feature'],
]);

let cache = null;
function loadCache() {
  if (cache) return cache;
  try { cache = JSON.parse(fs.readFileSync(dataPath('mic-cache.json'), 'utf8')); } catch { cache = {}; }
  return cache;
}
function saveCache() {
  try { fs.writeFileSync(dataPath('mic-cache.json'), JSON.stringify(cache)); } catch { /* cache tuỳ chọn */ }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, timeoutMs = 12000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'en' }, redirect: 'follow', signal: ac.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally { clearTimeout(t); }
}

/** "Wall Mounted Aroma Diffuser XS-105" → "Wall_Mounted_Aroma_Diffuser_XS_105" (đường tìm kiếm được phép). */
function slugify(q) {
  return String(q || '').replace(/[^A-Za-z0-9]+/g, ' ').trim().split(/\s+/).slice(0, 8).join('_');
}
const clean = (s) => String(s || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

/** Trích thông số có cấu trúc từ HTML trang sản phẩm. Hàm thuần (test được). */
function parseProductPage(html, url) {
  const labels = [...String(html).matchAll(/class="bac-item-label[^"]*"[^>]*>([\s\S]*?)<\//g)].map((m) => clean(m[1]));
  const values = [...String(html).matchAll(/class="bac-item-value[^"]*"[^>]*>([\s\S]*?)<\//g)].map((m) => clean(m[1]));
  const props = {};
  labels.forEach((l, i) => {
    const k = KEEP.get(l.toLowerCase());
    if (k && values[i] && !props[k]) props[k] = values[i].slice(0, 120);
  });
  // JSON-LD Product (một số giao diện ghi HS Code ở additionalProperty).
  for (const m of String(html).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const d = JSON.parse(m[1]);
      for (const it of (Array.isArray(d) ? d : [d])) {
        if (it?.['@type'] !== 'Product') continue;
        for (const p of it.additionalProperty || []) {
          const k = KEEP.get(String(p.name || '').toLowerCase());
          if (k && p.value && !props[k]) props[k] = String(p.value).slice(0, 120);
        }
        if (!props.name && it.name) props.name = String(it.name).slice(0, 160);
      }
    } catch { /* bỏ qua JSON hỏng */ }
  }
  if (!props.name) { const t = String(html).match(/<title>([\s\S]*?)<\/title>/); if (t) props.name = clean(t[1]).split(' - ')[0].slice(0, 160); }
  const hsDigits = String(props.hsCode || '').replace(/\D/g, '');
  const shop = (String(url).match(/https?:\/\/([a-z0-9-]+)\.en\.made-in-china\.com/i) || [])[1] || null;
  return { url, shop, name: props.name || null, hsCode: hsDigits.length >= 4 ? hsDigits : null, props: Object.fromEntries(Object.entries(props).filter(([k]) => !['name', 'hsCode'].includes(k))) };
}

/** Lấy link sản phẩm từ trang tìm kiếm — ưu tiên mỗi shop một link (nguồn độc lập). */
function parseSearchPage(html, max = 4) {
  const links = [...new Set([...String(html).matchAll(/https:\/\/([a-z0-9-]+)\.en\.made-in-china\.com\/product\/[A-Za-z0-9]+\/[^"'\s<>]+\.html/g)].map((m) => m[0]))];
  const byShop = new Map();
  for (const u of links) { const shop = u.match(/https:\/\/([a-z0-9-]+)\./)[1]; if (!byShop.has(shop)) byShop.set(shop, u); }
  return [...byShop.values()].slice(0, max);
}

/** Đồng thuận: nhóm 4 số được ≥2 shop khác nhau ghi. */
function consensusOf(pages) {
  const by = new Map();
  for (const p of pages) if (p.hsCode) { const h = p.hsCode.slice(0, 4); const s = by.get(h) || new Set(); s.add(p.shop || p.url); by.set(h, s); }
  const ranked = [...by.entries()].map(([heading4, shops]) => ({ heading4, shops: shops.size })).sort((a, b) => b.shops - a.shops);
  const top = ranked[0];
  return { heading4: top && top.shops >= 2 ? top.heading4 : null, shops: top?.shops || 0, allHeadings: ranked, pagesWithHs: pages.filter((p) => p.hsCode).length };
}

/**
 * micLookup(query, { max = 4 }) → { query, searched, pages:[{shop,url,name,hsCode,props}], consensus, cached }
 * query: tên tiếng Anh + model (do vòng 1 AI đặt). MIC_OFF=1 tắt hẳn.
 */
async function micLookup(query, opts = {}) {
  if (process.env.MIC_OFF === '1') return { query, searched: false, off: true, pages: [], consensus: consensusOf([]) };
  const slug = slugify(query);
  if (slug.length < 4) return { query, searched: false, pages: [], consensus: consensusOf([]) };
  const c = loadCache();
  const hit = c[slug];
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return { ...hit.data, cached: true };
  const out = { query, slug, searched: true, pages: [], consensus: null };
  try {
    const html = await get(`https://www.made-in-china.com/products-search/hot-china-products/${slug}.html`, opts.timeoutMs || 12000);
    const links = parseSearchPage(html, opts.max || 4);
    for (const u of links) {
      await sleep(600);
      try { out.pages.push(parseProductPage(await get(u, opts.timeoutMs || 12000), u)); } catch (e) { out.pages.push({ url: u, error: String(e.message).slice(0, 60) }); }
    }
  } catch (e) { out.error = String(e.message).slice(0, 80); }
  out.consensus = consensusOf(out.pages.filter((p) => !p.error));
  c[slug] = { at: Date.now(), data: out };
  saveCache();
  return out;
}

module.exports = { micLookup, parseProductPage, parseSearchPage, consensusOf, slugify };
