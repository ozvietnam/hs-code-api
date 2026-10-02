# Chạy hs-code-api trên Coolify (server nhà) — thay Vercel

CEO chốt 29/09/2026: bỏ Vercel, chạy trên Coolify của server nhà. GitHub
`ozvietnam/hs-code-api` vẫn là nguồn sự thật; Coolify build từ nhánh `main`.

## 1. Vì sao lợi hơn Vercel cho dự án này

| | Vercel | Coolify server nhà |
|---|---|---|
| Ghi dữ liệu (feedback, audit, snapshot biểu thuế) | FS chỉ đọc → `/api/feedback` luôn 503, vòng học từ sửa sai không chạy | Ổ `/data` bền, ghi được |
| Gọi Hermes | Không tới được LAN → cần mở tunnel (`docs/yeu-cau-mo-cong-hermes.md`) | Cùng LAN với cổng Hermes → gọi thẳng, không cần tunnel |
| Giới hạn thời gian | `maxDuration` 300 s, cold start | Tiến trình chạy liên tục, không cold start |
| Chi phí | Gói Pro | Máy sẵn có |

## 2. Thành phần trong repo

- `server.js` — tiến trình Node thường, không thư viện ngoài. Đọc `rewrites` và
  `headers` từ `vercel.json` (giữ file này làm cấu hình định tuyến), phục vụ `public/`,
  chạy `api/<tên>.js`. Timeout 300 s. Test: `scripts/test-server.mjs`.
- `Dockerfile` — `node:22-alpine`, `npm run build` (như `buildCommand` cũ),
  `HS_DATA_DIR=/data`, healthcheck `/api/health`, cổng 3000.
- Chạy tay không cần Docker: `PORT=3000 HS_DATA_DIR=/srv/hs-data node server.js`.

## 3. Tạo ứng dụng trên Coolify

1. **New Resource → Application → GitHub**, repo `ozvietnam/hs-code-api`, nhánh `main`,
   Build Pack **Dockerfile**, cổng **3000**. Bật **Auto Deploy** khi có push vào `main`.
2. **Persistent Storage**: gắn một volume vào `/data`.
3. **Health check**: đường dẫn `/api/health`.
4. **Biến môi trường** (lấy giá trị từ nơi đang lưu, KHÔNG ghi vào repo):

   | Biến | Ghi chú |
   |---|---|
   | `HS_API_TOKEN`, `HS_ADMIN_TOKEN` | giữ nguyên giá trị đang dùng để ERP không phải đổi |
   | `GEMINI_API_KEY`, `GEMINI_RERANK_MODEL` | như prod hiện tại |
   | `HERMES_BASE_URL`, `HERMES_API_KEY`, `HERMES_MODEL` | địa chỉ LAN của cổng Hermes (như `/etc/hs-agent/env` trên vps-hsagent) |
   | `GEMINI_RACE_MS=8000` | bắt buộc khi có Hermes: cho Gemini đủ thời gian trước khi rơi sang Hermes |
   | `MINIMAX_API_KEY`, `OLLAMA_API_KEY`, `GEMINI_FREE_KEYS` | chỉ nếu còn dùng |

5. Gắn tên miền tạm, ví dụ `hs-kb-moi.uythacnhapkhau.com`, qua Cloudflare (tunnel hoặc
   bản ghi DNS trỏ về proxy của Coolify).

## 4. Chuyển đổi an toàn

1. Chạy song song: Vercel vẫn phục vụ `hs-kb`, Coolify ở tên miền tạm.
2. Kiểm trên tên miền tạm:
   - `GET /api/health` → `llm.fallbacks` có `hermes`.
   - `node scripts/bench-prod.mjs --url=https://hs-kb-moi... --input=data/bench/erp-titles-synth.jsonl`
     — so với Vercel cùng bộ đo; không được kém hơn.
   - `POST /api/feedback` → `200` (không còn `503`).
3. Đổi `hs-kb.uythacnhapkhau.com` trên Cloudflare sang Coolify. ERP không phải đổi gì.
4. Giữ Vercel 7 ngày làm đường lùi (đổi DNS về là xong).
5. Sau 7 ngày ổn định: ngắt Git integration và xoá project Vercel; xoá các khoá
   Vercel-only (`functions`, `buildCommand`, `outputDirectory`) khỏi `vercel.json` hoặc đổi
   tên file cấu hình định tuyến; cập nhật CLAUDE.md, README.

## 5. Lưu ý

- `coolify-host` là VM trên node `pve` (192.168.1.100). Quy tắc hạ tầng: node cũ chỉ
  quan sát; việc tạo ứng dụng trong Coolify là thao tác cấp ứng dụng, cần CEO duyệt.
- Dữ liệu đã ghi ở `/data` được ưu tiên đọc trước `data/` trong image
  (`lib/data-paths.js`). Snapshot biểu thuế sửa qua admin sẽ nằm ở `/data` và che bản
  trong repo cho tới khi xoá — đồng bộ lại vào GitHub định kỳ.
- Sao lưu volume `/data` theo lịch sao lưu của server.
