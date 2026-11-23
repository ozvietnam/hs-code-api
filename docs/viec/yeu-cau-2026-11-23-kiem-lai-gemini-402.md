# Yêu cầu: kiểm lại tắt Gemini trả phí (402 tái phát) — gửi: quản trị server — từ: DA-HS (hs-code-api)

Mục đích: Thực địa 23/11 14:15 VN (CSDL Cổng + nhật ký bản chạy thật) lại **🟡 VÀNG**: ngắt mạch Gemini MỞ **2 lần / 30 phút** — lỗi thanh toán/khoá (`402: Gemini API error 402`). Trung vị lượt phân loại 24h = **39 giây** (mốc 28, đích 10). `/api/health` vẫn 200 nhưng health **không** kiểm chuỗi AI. Yêu cầu 16/11 (`yeu-cau-2026-11-16-tat-gemini-402-va-kho-dap-an.md`) đã nhờ tắt `GEMINI_TRA_PHI_CHOT_CUOI` / gỡ khoá 402 — có vẻ bị bật lại hoặc khoá vẫn bị gọi.

Điều kiện trước:
- [ ] Không cần PR mã — chỉ kiểm env máy thật `.120` / Coolify `hs-kb`.

## Cần làm (Coolify / env prod `hs-kb`)

1. Đọc lại `GEMINI_TRA_PHI_CHOT_CUOI` trên prod: nếu đang `on` → đặt `off`.
2. Nếu còn `GEMINI_API_KEY` trả 402: gỡ hoặc để trống cho tới khi nạp tiền / khoá mới (ping không 402 trước khi gắn lại).
3. Không đụng MiniMax / DeepSeek / Hermes — chuỗi dự phòng phải còn để khách không chết.
4. Xác nhận lại checklist của yêu cầu 16/11 phần A (ô còn trống thì đánh dấu tại tệp đó).

Khi nào: **ngay trong nhịp vận hành tiếp theo** (23/11 chiều) — đang làm chậm khách thật.

## Kiểm tra xong (checklist)

- [ ] `GET /api/health` vẫn 200.
- [ ] Nhật ký 30 phút **không** còn `[llm] ngắt mạch MỞ: gemini` vì 402.
- [ ] Một lượt `POST /api/suggest` hàng thường vẫn trả (không phụ thuộc Gemini trả phí).
- [ ] Trả lời ngắn trên thẻ thường trực [OZV-243](/OZV/issues/OZV-243) hoặc thẻ này: env đã `off` / khoá đã gỡ / còn kẹt gì.

## Đường lùi (rollback)

Đặt lại `GEMINI_TRA_PHI_CHOT_CUOI=on` và gắn khoá **chỉ khi** đã ping Gemini không 402.

Tham chiếu: thực địa máy đo 14:15 23/11 VN · `docs/viec/yeu-cau-2026-11-16-tat-gemini-402-va-kho-dap-an.md` · mục tiêu A3 GĐ hs-code-api.
