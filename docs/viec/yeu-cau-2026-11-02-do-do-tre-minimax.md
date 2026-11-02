# Yêu cầu: đo độ trễ MiniMax trên prod để chốt thời gian chờ của /api/classify — gửi: quản trị server — từ: DA-HS (hs-code-api)

**Mục đích.** #725 lỗi 45: `/api/classify` (engine loop, khoá dịch vụ) trả `NEEDS_EXPERT` / `ENGINE_TIMEOUT` ở vòng 0 khi MiniMax
là nhà cung cấp hợp lệ duy nhất còn sống (khoá Gemini trả phí đang trả 402, CEO chọn không nạp). PR `fix/725-45-timeout-minimax`
sửa nguyên nhân gốc (lỗi 402 của Gemini che lỗi thật của MiniMax nên lưới an toàn "gọi lại tắt suy nghĩ" không chạy) và đặt
**giá trị tạm** cho thời gian chờ:

| Hằng / biến | Giá trị tạm | Căn cứ hiện có |
|---|---|---|
| `LOOP_THINKING_OFF_TIMEOUT_MS` (lần gọi lại tắt suy nghĩ) | 45000 | 1,5 × ~30 s một lời gọi `/api/describe` bằng MiniMax-M2.7-highspeed (02/11) |
| `LOOP_R1_TIMEOUT_MS` / `LOOP_R2_TIMEOUT_MS` | 100000 / 160000 (giữ nguyên) | số đo 25–26/10: vòng 1 20–74 s, vòng 2 70–107 s |
| `LLM_NGAT_MACH_THANH_TOAN_MS` (bỏ qua Gemini sau 402) | 900000 (15 phút) | một lần dò 402 < 1 s, 0 đồng |

Cần số đo thật để chỉnh các giá trị này cho đúng, và để xác nhận vòng 1 có chạm trần `maxTokens` (6000) không.

**Điều kiện trước.**
- PR trên đã gộp vào `main` và Coolify đã kéo bản mới (để `debug` trả `engine.log` có `timeoutMs` từng bước).
- Có quyền SSH vào máy chủ hs-code-api và đọc được `docker logs` / thư mục `/data` của container.
- **Không** dán khoá nào vào file này, issue hay chat.

**Cần làm.**
1. **Ghi lại cấu hình hiện tại** (chỉ TÊN biến và GIÁ TRỊ không bí mật; khoá chỉ ghi "có"/"không"): `MINIMAX_MODEL`, `MINIMAX_FALLBACK_MODEL`,
   `LOOP_MODEL`, `LLM_STEP_UNDERSTAND`, `LLM_STEP_GIR`, mọi biến bắt đầu bằng `LLM_TIMEOUT_MS_`, `LOOP_R1_TIMEOUT_MS`, `LOOP_R2_TIMEOUT_MS`,
   `CLASSIFY_BUDGET_MS`, `R1_MAX_TOKENS`, `GIR_MAX_TOKENS`, `HS_GON_DAU_RA`, `HS_MAX_VONG_SUA`, `GEMINI_TRA_PHI_CHOT_CUOI`,
   `LLM_NO_TRAIN_PROVIDERS`, `GEMINI_API_KEY` (có/không), `MINIMAX_API_KEY` (có/không).
   Đặc biệt: nếu có `LLM_TIMEOUT_MS_UNDERSTAND` / `LLM_TIMEOUT_MS_GIR` / `LLM_TIMEOUT_MS_DEFAULT` nhỏ hơn 60000 thì ghi rõ — giá trị đó là
   trần theo bước và sẽ cắt gần như mọi lượt MiniMax có suy luận.
2. **Trích độ trễ từ log của container** (`server.js` in mỗi request một dòng `<ISO> <METHOD> <URL> <status> <N>ms`; dòng này
   không có thân request nên không có mô tả hàng). Lấy 7 ngày gần nhất cho `POST /api/describe` và `POST /api/classify`, tính
   p50 / p95 / max của `N` và đếm số dòng status 502/504. Ví dụ (chỉnh tên container cho đúng):

   ```bash
   docker logs --since 168h <container-hs-code-api> 2>&1 \
     | grep -E ' POST /api/(classify|describe)' \
     | awk '{print $3, $4, $5}' > /tmp/do-tre.txt        # url, status, ms — không có mô tả hàng
   ```

   Đồng thời đếm số dòng `[llm] ngắt mạch MỞ` trong cùng log (cho biết MiniMax có timeout liên tiếp ở bước nào, và Gemini có bị
   ngắt vì 402 không).

3. **Chạy 5 lượt đo** `/api/classify` bằng khoá dịch vụ `oz-noi-bo` (không dùng khoá của khách), mô tả hàng **tự đặt, không lấy từ
   tờ khai** (ví dụ "Kẹp giấy văn phòng bằng thép mạ niken, dài 28 mm"), thêm `"debug": true`. Mỗi lượt chép lại **chỉ** các trường
   `ms`, `status`, `engine.rounds`, `engine.phases`, `engine.log[].{step,fallback,cause,ms,timeoutMs}`, `engine.llm`. Chi phí: 5 lượt
   MiniMax (gói trả phí đang dùng), không đụng Gemini.
4. Dán kết quả bước 1–3 vào cuối file này (mục "Kết quả") và báo GĐ.

**Khi nào.** Sau khi PR trên lên prod; không gấp (giá trị tạm đã đủ cho classify ra mã khi chỉ còn MiniMax).

**Kiểm tra xong (checklist).**
- [ ] Bước 1: bảng cấu hình (không có khoá)
- [ ] Bước 2: p50 / p95 / max ms + số 502/504 cho `/api/describe` và `/api/classify` (7 ngày), số dòng `ngắt mạch MỞ`
- [ ] Bước 3: 5 lượt debug, có `engine.log` và `engine.phases`
- [ ] Không có mô tả hàng của khách, không có khoá trong kết quả

**Đường lùi (rollback).** Việc này chỉ đọc, không đổi gì trên server. Nếu sau khi PR lên prod mà classify chậm bất thường: đặt
`LOOP_THINKING_OFF_TIMEOUT_MS=30000` (về giá trị cũ) trong env của container rồi khởi động lại.

## Kết quả

_(quản trị server điền)_
