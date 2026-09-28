# Yêu cầu mở cổng Hermes cho `hs-code-api` trên Vercel

Gửi: dev quản trị server (người bàn giao `vps-hsagent`).
Người yêu cầu: CEO. Soạn: phiên Claude Code, 28/09/2026.

## 1. Vì sao

`/api/suggest`, `/api/describe`, `/api/classify` trên Vercel hiện chỉ gọi được Gemini.
Gemini lỗi hoặc hết hạn mức thì ba API này rơi về chế độ không AI. Code đã có sẵn
đường gọi Hermes (`lib/llm-tier.js` → `lib/llm.mjs`, chuẩn OpenAI `/chat/completions`),
nhưng cổng Hermes hiện chỉ nghe trong mạng nội bộ, bằng `http`, nên Vercel không tới được.

Kết quả đo `/api/suggest` qua Hermes ngay trên `vps-hsagent`: xem mục 6.

## 2. Việc cần làm

1. **Một tên miền HTTPS công khai** trỏ về cổng Hermes, không mở cổng vào trên router.
   Đề xuất Cloudflare Tunnel (`cloudflared` chạy trên máy đang giữ cổng Hermes).
   Ví dụ tên: `hermes-hs.<miền-của-công-ty>`.
2. **Chỉ cho qua đúng hai đường**: `POST /v1/chat/completions` và `GET /v1/models`.
   Mọi đường khác (trang quản trị, `/key`, `/spend`, `/ui`…) trả 403/404 từ phía ngoài.
3. **Khóa riêng cho `hs-code-api` production**, tách khỏi khóa của `vps-hsagent`,
   để thu hồi độc lập. Nếu dùng Cloudflare Access thì cấp thêm service token
   (hai header `CF-Access-Client-Id` / `CF-Access-Client-Secret`); báo lại để bên
   dự án thêm header vào code.
4. **Giới hạn**: khoảng 30 lượt/phút và trần token/ngày cho khóa này. Thời gian chờ
   của tunnel ≥ 60 giây (model `MiniMax-M2.7` có phần suy nghĩ, một lượt gợi ý mất 10–30 giây).
5. **Nhật ký**: không đẩy nội dung prompt ra dịch vụ bên ngoài; giữ log truy cập ≤ 30 ngày.
6. **Tự khởi động lại**: `cloudflared` và cổng Hermes chạy dưới systemd, `Restart=always`.

## 3. Nghiệm thu (dev tự chạy rồi báo)

Từ một máy **ngoài** mạng công ty:

| Kiểm | Mong đợi |
|---|---|
| `curl -s https://<tên-miền>/v1/models -H "Authorization: Bearer <khóa>"` | 200, có tên model dùng cho dự án |
| `POST /v1/chat/completions` với câu ngắn, có khóa | 200 trong < 10 giây |
| Cùng lệnh, **không** khóa hoặc khóa sai | 401 |
| `GET https://<tên-miền>/ui`, `/key/list`, `/spend/logs` | 403 hoặc 404 |
| Tắt `cloudflared` rồi bật lại máy | tunnel tự lên lại |

## 4. Bàn giao lại cho CEO (qua kênh riêng, không ghi vào repo)

- `HERMES_BASE_URL` = `https://<tên-miền>/v1`
- `HERMES_API_KEY` = khóa riêng ở bước 2.3
- `HERMES_MODEL` = tên model (hiện là model chuyển tiếp sang `MiniMax-M2.7`)

CEO nạp ba biến này vào Vercel project `hs-code-api` (Production) rồi redeploy.
`lib/llm.mjs` đọc `HERMES_MODEL` (hoặc `HERMES_ENRICH_MODEL`) nên không cần sửa code.

## 5. Thứ tự gọi sau khi nạp

Gemini vẫn đi trước. Khi có bất kỳ provider dự phòng nào, `lib/llm-tier.js` chỉ chờ
Gemini **3 giây** rồi chuyển sang dự phòng. Đo trên prod 28/09: cả lượt `/api/suggest`
bằng Gemini mất 3,3–4,5 giây, nên với trần 3 giây nhiều lượt sẽ rơi sang Hermes (chậm hơn
nhiều). **Cùng lúc nạp Hermes, đặt `GEMINI_RACE_MS=8000`** trên Vercel để Gemini còn đủ
thời gian; Hermes chỉ nhận lượt khi Gemini lỗi thật, hết hạn mức hoặc treo.

`/api/health` sẽ báo `llm.fallbacks: ["hermes"]`. Chỉ đổi Hermes lên đi trước khi số đo
ở mục 6 cho thấy nó ngang Gemini.

## 6. Số đo

_Điền sau khi phép đo trên `vps-hsagent` chạy xong._
