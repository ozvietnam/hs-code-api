# Yêu cầu: bật nạp điểm tự động SePay cho Cổng `cong-oz` — gửi: quản trị server — từ: DA-HS (ozplugin)

Mục đích: khách chuyển khoản trên trang `/nap` được cộng điểm tự động trong vài phút, 24/7, thay cho việc OZ duyệt tay trên `/ops`. Đây là điều kiện để bán Cổng OZ cho nhiều khách trả phí. CEO đã xác nhận ngày 17/11/2026 rằng OZ có tài khoản SePay.

Điều kiện trước:
- Mã webhook đã có sẵn trong ozplugin (`apps/gateway/src/webhook/nap-sepay.ts`), **không cần sửa code**. Hiện tại `POST /webhook/nap/sepay` trả 404 vì chưa đặt env.
- Tài khoản SePay của OZ đã liên kết với tài khoản Techcombank 19128819290889, chủ tài khoản là công ty.

Cần làm:
1. Sinh một khoá ngẫu nhiên **≥ 32 ký tự** (ví dụ `openssl rand -hex 32`). **Không ghi khoá vào file này.**
2. Coolify → project `oz-cong` → `production` → app `cong-oz` → Environment: đặt
   - `OZ_NAP_PROVIDER=sepay`
   - `OZ_NAP_WEBHOOK_KEY=<khoá ở bước 1>`
3. Redeploy `cong-oz`.
4. Đăng nhập SePay → Tích hợp → Webhooks → Thêm webhook:
   - URL: `https://mcp.uythacnhapkhau.com/webhook/nap/sepay`
   - Sự kiện: tiền vào (giao dịch có tiền vào)
   - Tài khoản: Techcombank 19128819290889
   - Xác thực: **API Key** = đúng khoá ở bước 1
5. Báo người trực `/ops` biết từ giờ nạp được cộng tự động. Luồng duyệt tay U4b vẫn giữ làm dự phòng.

Khi nào: càng sớm càng tốt. Việc này chặn kế hoạch bán của CEO (giai đoạn 0, tháng 12/2026).

Kiểm tra xong (checklist):
- [ ] `curl -s -o /dev/null -w '%{http_code}' -X POST https://mcp.uythacnhapkhau.com/webhook/nap/sepay` **không còn 404**. Thiếu hoặc sai khoá thì trả 401/403.
- [ ] Trang `https://mcp.uythacnhapkhau.com/nap` (đã đăng nhập) hiện câu "điểm tự cộng trong vài phút" và không còn nút "Tôi đã chuyển".
- [ ] Nạp thử 50.000đ từ một tài khoản nội bộ với đúng nội dung `OZ…` trên trang `/nap`: điểm tăng 50 trong `xem_tai_khoan`, có dòng mới trong sổ cái và email biên nhận.
- [ ] Gửi lại cùng giao dịch (SePay "gửi lại webhook"): điểm **không** cộng lần hai (kiểm idempotency).

Đường lùi (rollback): xoá `OZ_NAP_PROVIDER` trên Coolify rồi redeploy. `/nap` sẽ tự quay về duyệt tay U4b, không mất dữ liệu vì sổ cái chỉ ghi thêm. Tắt webhook trong SePay.
