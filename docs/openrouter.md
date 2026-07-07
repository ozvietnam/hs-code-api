# OpenRouter — fallback LLM (free models)

Dùng khi **Gemini hết quota**, **Minimax/Ollama lỗi**, hoặc cần chạy script enrich/benchmark tạm mà không muốn trả tiền Google.

Production API (`/api/suggest`, `/api/describe`) vẫn dùng **Gemini** trên Vercel. OpenRouter chỉ cấu hình **local** qua file `.env` (đã gitignore).

## Lấy key

1. Đăng ký: https://openrouter.ai/
2. **Keys** → tạo API key (`sk-or-v1-...`)
3. Dán vào `.env`:

```bash
OPENROUTER_API_KEY=sk-or-v1-...
```

Key lưu tại: **`.env`** (cùng chỗ `GEMINI_API_KEY`, `MINIMAX_API_KEY`). Không commit file này.

Mẫu biến: [`.env.example`](../.env.example).

## Biến môi trường

| Biến | Bắt buộc | Mặc định | Ý nghĩa |
|------|----------|----------|---------|
| `OPENROUTER_API_KEY` | Có | — | Bearer token OpenRouter |
| `OPENROUTER_MODEL` | Không | `openrouter/free` | Model slug hoặc router tự chọn model free |
| `OPENROUTER_SITE_URL` | Không | — | Header `HTTP-Referer` (tùy chọn, leaderboard) |
| `OPENROUTER_APP_NAME` | Không | `hs-code-api` | Header `X-OpenRouter-Title` |

## Model free — chọn thế nào

OpenRouter đánh dấu model **$0** bằng hậu tố `:free` hoặc router `openrouter/free`.

**Khuyến nghị khi bí:**

| Model | Ghi chú |
|-------|---------|
| `openrouter/free` | Router tự chọn model free đang rảnh — đã test OK |
| `meta-llama/llama-3.3-70b-instruct:free` | Mạnh nhưng hay **429 rate limit** giờ cao điểm |
| `google/gemma-4-31b-it:free` | Gemma free mới |
| `qwen/qwen3-coder:free` | Viết code / JSON |
| `openai/gpt-oss-20b:free` | Nhẹ, nhanh |

Danh sách đầy đủ: https://openrouter.ai/models?max_price=0  
Hoặc API: `GET https://openrouter.ai/api/v1/models` (lọc `pricing.prompt === "0"`).

### Giới hạn free (quan trọng)

- Tài khoản **chưa nạp credit**: khoảng **~50 request/ngày** cho toàn bộ model free (theo FAQ OpenRouter).
- Nạp ≥ **$10** credit → free models tăng lên **~1000 request/ngày**.
- Model free **không** phù hợp production ERP; chỉ dev / enrich offline / thử prompt.

## Kiểm tra key đã cài đúng

```bash
npm run openrouter:ping
```

Hoặc thủ công (load `.env` trước):

```bash
set -a && source .env && set +a
curl -sS https://openrouter.ai/api/v1/auth/key \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" | jq .
```

## Gọi API (OpenAI-compatible)

Endpoint: `POST https://openrouter.ai/api/v1/chat/completions`

```bash
set -a && source .env && set +a

curl -sS https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -H "HTTP-Referer: ${OPENROUTER_SITE_URL:-http://localhost}" \
  -H "X-OpenRouter-Title: ${OPENROUTER_APP_NAME:-hs-code-api}" \
  -d '{
    "model": "'"${OPENROUTER_MODEL:-openrouter/free}"'",
    "messages": [{"role": "user", "content": "Trả lời đúng một từ: OK"}],
    "max_tokens": 16
  }'
```

JSON mode (giống Gemini enrich):

```json
{
  "model": "qwen/qwen3-coder:free",
  "response_format": { "type": "json_object" },
  "messages": [
    { "role": "system", "content": "Output valid JSON only." },
    { "role": "user", "content": "..." }
  ]
}
```

## Dùng với script trong repo

| Việc | Cách |
|------|------|
| Enrich policy offline | Ưu tiên `npm run data:enrich-policies` với `MINIMAX` / `OLLAMA` / `GEMINI` (xem `scripts/enrich-policies.mjs`). OpenRouter chưa gắn sẵn — dùng `curl` hoặc ping để thử prompt. |
| Dev local API | `npx vercel dev` đọc `.env` tự động; OpenRouter **không** thay Gemini trên Vercel trừ khi anh code thêm. |
| Cursor / Claude Code | Settings → override OpenAI base URL `https://openrouter.ai/api/v1` + API key OpenRouter (tài liệu: https://openrouter.ai/docs/quickstart). |

## Deploy Vercel (nếu sau này cần)

```bash
vercel env add OPENROUTER_API_KEY production
vercel env add OPENROUTER_MODEL production   # optional
```

Hiện tại **không bắt buộc** — endpoint live vẫn dùng `GEMINI_API_KEY`.

## Bảo mật

- **Không** paste key vào chat, issue GitHub, hoặc commit.
- Key đã lộ trong chat → nên **revoke** tại https://openrouter.ai/settings/keys và tạo key mới vào `.env`.
- `.env` đã nằm trong `.gitignore`.

## Tham chiếu

- Quickstart: https://openrouter.ai/docs/quickstart  
- FAQ (free limits): https://openrouter.ai/docs/faq  
- Models: https://openrouter.ai/models  
