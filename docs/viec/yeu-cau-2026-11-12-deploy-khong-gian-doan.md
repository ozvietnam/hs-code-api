# Yêu cầu: Triển khai blue-green 2 cổng cho hs-code-api để không rớt lượt khi nhận mã mới (OZV-505) — gửi: quản trị server — từ: DA-HS (hs-code-api)

- **Mục đích:** Loại bỏ hoàn toàn cửa sổ từ chối kết nối (`ECONNREFUSED` ~16 ms) mỗi khi `hs-code-api` nhận mã mới từ nhánh `main` (tuần 05–10/11 làm rớt 36/385 = 9,4% lượt `tra_thue` từ Cổng OZ thành từng cụm 8–9 lượt đúng lúc container khởi động lại), đồng thời bảo toàn các lượt `/api/classify` dài tới 300 giây.
- **Điều kiện trước:** PR của thẻ OZV-505 đã gộp vào `main` (`server.js` đã có `warmUpHandlers()` nạp sẵn 15 handler + giải nén biểu thuế trước khi mở cổng, `gracefulShutdown()` gắn `Connection: close` + chờ xả `HS_DRAIN_MS=330000` ms cho request 300 s, và `Dockerfile` đã rút `HEALTHCHECK` xuống `interval=10s`).
- **Cần làm (trên máy chủ triển khai — `/opt/hs-code-api/deploy-safe.sh`, giao Quản trị server / Claude hạ tầng):**
  1. **Bỏ hẳn dòng `cp -f "$DEPLOY"/server.js` trong `deploy-safe.sh`** (nếu còn) để container chạy đúng `server.js` của repo (đã có `warmUpHandlers`, `Connection: close` khi draining và `HS_DRAIN_MS=330000` ms).
  2. **Đặt thời gian chờ dừng container cũ `docker stop -t 360`** (`stop_grace_period: 360s`, lớn hơn trần request `300s` + trần xả `330s`).
  3. **Chuyển `deploy-safe.sh` sang bật container mới song song (blue-green 2 cổng nội bộ `3001` ↔ `3002`) trước khi dừng container cũ:**
     - Xác định cổng đang chạy (ví dụ `3001` → cổng kế tiếp `3002`).
     - Khởi chạy container mới ở cổng kế tiếp (`-p 127.0.0.1:<cổng_mới>:3000`), chờ `curl -sf http://127.0.0.1:<cổng_mới>/api/health` trả HTTP 200 (hoặc JSON hợp lệ có `checks.taxData.ok=true`).
     - Chuyển upstream của reverse proxy / tunnel sang `<cổng_mới>` (`nginx -s reload` hoặc cập nhật đích).
     - Cuối cùng mới gửi `docker stop -t 360 <container_cũ>` để container cũ xả nốt các lượt `/api/classify` đang chạy (tối đa 330 giây) rồi tự xoá.
- **Khi nào:** Ngay trong đợt cập nhật vận hành tiếp theo sau khi PR OZV-505 vào `main`.
- **Kiểm tra xong (checklist):**
  - [ ] `docker logs <container>` khi khởi động in dòng `listening on http://0.0.0.0:3000` sau khi `warmUpHandlers` hoàn tất; lượt `GET /api/tax?hs=72052100` đầu tiên phản hồi < 50 ms.
  - [ ] Chạy vòng lặp `curl -sf https://hs-kb.uythacnhapkhau.com/api/tax?hs=72052100` mỗi 100 ms trong suốt lúc chạy `deploy-safe.sh main --force`: **0 lượt lỗi kết nối / 0 lượt 5xx**.
  - [ ] Khi `docker stop -t 360 <container_cũ>`, `docker logs` in dòng `SIGTERM — dừng nhận request mới, chờ N lượt đang chạy (tối đa 330000 ms)` và `đã xả hết sau ... ms`.
- **Đường lùi (rollback):** Giữ bản sao `deploy-safe.sh.bak` trước khi sửa; nếu proxy đổi cổng lỗi thì khôi phục `deploy-safe.sh.bak` và trỏ lại cổng `3000` cố định (vẫn giữ bước 1 + 2: `server.js` của repo và `docker stop -t 360`).
