const http = require('node:http');
const https = require('node:https');
const { URL } = require('node:url');

/**
 * Tra cứu web qua máy tìm kiếm nội bộ (SearXNG) tại HS_TIM_KIEM_URL.
 * Trả về mảng { tieuDe, url, doanTrich } hoặc null nếu lỗi/không có biến/quá giờ.
 * Mỗi tên miền tối đa 2 kết quả; bỏ kết quả không có đoạn trích. Không ghi câu hỏi vào log.
 */
function timWeb(cauHoi, opts = {}) {
  const urlBase = (process.env.HS_TIM_KIEM_URL || '').trim();
  if (!urlBase || !cauHoi) return Promise.resolve(null);
  const soKetQua = opts.soKetQua || 5;
  const timeoutMs = opts.timeoutMs || 6000;

  let targetUrl = '';
  try {
    targetUrl = `${urlBase.replace(/\/+$/, '')}/search?format=json&q=${encodeURIComponent(cauHoi)}`;
  } catch {
    return Promise.resolve(null);
  }

  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return Promise.resolve(null);
  }

  const client = parsed.protocol === 'https:' ? https : http;

  return new Promise((resolve) => {
    let settled = false;
    const req = client.get(
      targetUrl,
      {
        timeout: timeoutMs,
        headers: {
          'User-Agent': 'HS-Code-API-SearXNG/1.0',
          'Accept': 'application/json',
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          if (!settled) {
            settled = true;
            resolve(null);
          }
          return;
        }
        let buf = '';
        res.on('data', (c) => (buf += c));
        res.on('end', () => {
          if (settled) return;
          settled = true;
          try {
            const data = JSON.parse(buf);
            const results = data.results || data.items || [];
            const domainCounts = {};
            const parsedResults = [];
            for (const item of results) {
              const doanTrich = (item.content || item.snippet || '').trim();
              const url = (item.url || '').trim();
              const tieuDe = (item.title || '').trim();
              if (!doanTrich || !url) continue;
              let hostname = '';
              try {
                hostname = new URL(url).hostname;
              } catch {
                continue;
              }
              domainCounts[hostname] = (domainCounts[hostname] || 0) + 1;
              if (domainCounts[hostname] > 2) continue;
              parsedResults.push({ tieuDe, url, doanTrich });
              if (parsedResults.length >= soKetQua) break;
            }
            resolve(parsedResults.length ? parsedResults : null);
          } catch {
            resolve(null);
          }
        });
      }
    );

    req.on('timeout', () => {
      if (!settled) {
        settled = true;
        req.destroy();
        resolve(null);
      }
    });

    req.on('error', () => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    });
  });
}

module.exports = { timWeb };
