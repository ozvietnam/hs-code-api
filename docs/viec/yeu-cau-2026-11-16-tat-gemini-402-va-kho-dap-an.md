# Yêu cầu: tắt Gemini trả phí (402) + bật kho đáp án sau #1359 — gửi: quản trị server — từ: DA-HS (hs-code-api)

Mục đích: Thực địa 16/11 12:45 VN — ngắt mạch Gemini MỞ vì lỗi thanh toán 402; trung vị Cổng 124 giây (vàng). QT đã chốt tắt Gemini trả phí (không hỏi anh Thắng). Sau khi gộp PR kho LED (#1359 / OZV-1211) cần migrate + seed + bật `HS_KHO_DAP_AN` để đáp án lưu không còn 0%.

Điều kiện trước:
- [ ] PR [#1359](https://github.com/ozvietnam/hs-code-api/pull/1359) đã vào `main` (GĐ gộp khi CI xanh) — chỉ cần cho phần B.
- Phần A (tắt Gemini 402) làm ngay, không chờ #1359.

## A. Tắt Gemini trả phí (402) — làm ngay

Cần làm (Coolify / env prod `hs-kb`):
1. Đặt `GEMINI_TRA_PHI_CHOT_CUOI=off` (mặc định đang `on` — #578).
2. Gỡ hoặc để trống `GEMINI_API_KEY` trên prod cho tới khi nạp tiền / đổi khoá mới (khoá hiện tại trả 402 → ngắt mạch mọi bước gemini 15 phút).
3. Giữ MiniMax (và chuỗi dự phòng khác) — lượt riêng tư vẫn cần MiniMax khi không còn Gemini trả phí.

Khi nào: ngay trong nhịp vận hành tiếp theo (16/11).

Kiểm tra xong (checklist):
- [ ] `GET /api/health` vẫn 200.
- [ ] Nhật ký 30 phút không còn dòng `[llm] ngắt mạch MỞ: gemini` vì 402.
- [ ] Một lượt `POST /api/suggest` mô tả hàng thường vẫn trả (không phụ thuộc Gemini trả phí).

Đường lùi (rollback): đặt lại `GEMINI_TRA_PHI_CHOT_CUOI=on` và `GEMINI_API_KEY` khi đã nạp tiền / khoá mới hoạt động (thử một lệnh ping Gemini không 402 trước khi bật lại).

## B. Kho đáp án LED — sau khi #1359 vào main

Cần làm:
1. Chạy migrate `0003_kho_dap_an.sql` trên Postgres prod (nếu chưa).
2. `node scripts/seed-kho-dap-an.mjs --write` (seed đèn LED gấu/thỏ → `94051199`).
3. Bật `HS_KHO_DAP_AN=on` trên Coolify; redeploy / reload env.

Khi nào: ngay sau khi GĐ báo #1359 đã gộp trên thẻ [OZV-1211](/OZV/issues/OZV-1211).

Kiểm tra xong (checklist):
- [ ] Lượt 2 cùng mô tả «đèn led cắm tường hình gấu» trả từ kho (hit), cửa HS rõ ràng nhanh hơn lần miss.
- [ ] Thực địa «trả từ đáp án đã lưu» > 0% trong cửa sổ đo sau vài giờ.

Đường lùi (rollback): `HS_KHO_DAP_AN=off` — mã vẫn chạy như cũ (mặc định off).

Tham chiếu: [OZV-1211](/OZV/issues/OZV-1211) · PR #1359 · mục tiêu A3 GĐ hs-code-api.
