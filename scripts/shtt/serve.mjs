#!/usr/bin/env node
/**
 * Server HTTP cho backend "oz-shtt" — phục vụ `GET /v1/check` cho công cụ `kiem_tra_shtt`
 * của Cổng OZ (repo ozplugin). CHỈ ĐỌC dữ liệu data/shtt; không ghi gì.
 *
 * ⚠️ Đây là trạm chạy thử NỘI BỘ, KHÔNG phải prod hs-kb.
 *
 * Biến môi trường:
 *   OZ_SHTT_KEY     nếu đặt → bắt buộc header x-api-key khớp, sai → 401. Không đặt → mở
 *                   (chỉ dùng chạy thử nội bộ; in cảnh báo ra stderr).
 *   OZ_SHTT_HOST    host bind (mặc định 0.0.0.0)
 *   OZ_SHTT_PORT    cổng (mặc định 8130)
 *   OZ_SHTT_DIR     thư mục data/shtt (mặc định kho thật) — dùng để chạy thử cách ly.
 *
 * Route:
 *   GET /healthz   → { ok: true, ... }
 *   GET /v1/check  → CheckResult (200) | { error } (400 đầu vào sai / 500 lỗi khác)
 */
import http from 'node:http';
import { chamRuiRo, docDuLieu, DIR_SHTT_MAC_DINH } from '../../lib/shtt-check.mjs';

const HOST = process.env.OZ_SHTT_HOST || '0.0.0.0';
const PORT = Number(process.env.OZ_SHTT_PORT) || 8130;
const KEY = String(process.env.OZ_SHTT_KEY || '').trim();
const DIR = process.env.OZ_SHTT_DIR || DIR_SHTT_MAC_DINH;

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type, x-api-key',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

/**
 * Tạo server. Nạp dữ liệu 1 lần lúc khởi động (cache RAM). `deps.data` cho test tiêm thẳng.
 */
export function createShttServer(deps = {}) {
  const data = deps.data || docDuLieu(deps.dir || DIR);
  const key = deps.key != null ? String(deps.key).trim() : KEY;

  return http.createServer((req, res) => {
    try {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, OPTIONS',
          'access-control-allow-headers': 'content-type, x-api-key',
        });
        res.end();
        return;
      }

      const url = new URL(req.url, 'http://localhost');

      if (req.method === 'GET' && url.pathname === '/healthz') {
        sendJson(res, 200, {
          ok: true,
          vnCrawled: data.vnCrawled,
          dataAsOf: data.dataAsOf,
          sources: data.sources,
        });
        return;
      }

      if (req.method === 'GET' && url.pathname === '/v1/check') {
        // Xác thực (nếu có cấu hình khoá).
        if (key) {
          const got = String(req.headers['x-api-key'] || '').trim();
          if (got !== key) {
            sendJson(res, 401, { error: 'Sai hoặc thiếu x-api-key.' });
            return;
          }
        }
        let out;
        try {
          out = chamRuiRo({
            brand: url.searchParams.get('brand'),
            hs: url.searchParams.get('hs'),
            origin: url.searchParams.get('origin') || 'CN',
            importer: url.searchParams.get('importer') || undefined,
            data,
          });
        } catch (e) {
          if (e && e.dauVaoSai) {
            sendJson(res, 400, { error: e.message });
            return;
          }
          throw e;
        }
        sendJson(res, 200, out);
        return;
      }

      sendJson(res, 404, { error: 'Không tìm thấy route.' });
    } catch (e) {
      // Không lộ stack.
      sendJson(res, 500, { error: 'Lỗi máy chủ nội bộ.' });
      try {
        process.stderr.write(`[oz-shtt] 500 ${(e && e.message) || e}\n`);
      } catch {
        /* bỏ qua */
      }
    }
  });
}

// Chạy trực tiếp: node scripts/shtt/serve.mjs
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = createShttServer();
  if (!KEY) {
    process.stderr.write(
      '[oz-shtt] CẢNH BÁO: OZ_SHTT_KEY chưa đặt → /v1/check mở không xác thực. Chỉ dùng chạy thử nội bộ.\n',
    );
  }
  server.listen(PORT, HOST, () => {
    process.stdout.write(JSON.stringify({ type: 'khoi_dong', host: HOST, port: PORT }) + '\n');
  });
}
