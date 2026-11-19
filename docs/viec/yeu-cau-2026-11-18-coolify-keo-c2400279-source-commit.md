# Yêu cầu: Coolify kéo main `c2400279` + SOURCE_COMMIT — gửi: quản trị server — từ: DA-HS (hs-code-api)

Mục đích: Mở cổng đo A3 (phases.afterEngineMs trên prod) và hết mập mờ bản chạy. Thực địa 18/11 05:00 VN vàng — trung vị 81s; `/api/health` vẫn `commit:null` / `buildTime:null` dù main đã có #1426.

Điều kiện trước:
- [x] [#1426](https://github.com/ozvietnam/hs-code-api/pull/1426) đã gộp → main `c2400279` (18/11 ~05:11 VN).

## A. Coolify kéo SHA mới

Cần làm (Coolify / dịch vụ `hs-kb`):
1. Deploy/kéo đúng commit `c2400279` (hoặc mới hơn trên `main`).
2. Xác nhận container healthy.

Khi nào: ngay — chặn đo live A3 (Paperclip OZV-1361 / OZV-1362).

Kiểm tra xong (checklist):
- [ ] `GET /api/health` → 200 · `status=healthy`
- [ ] Một lượt `POST /api/classify` body `{"tenHang":"cốc giữ nhiệt chân không (bình chân không)"}` trả JSON có `phases.afterEngineMs` (số ≥ 0)

Đường lùi: rollback Coolify về SHA trước đó nếu health đỏ.

## B. SOURCE_COMMIT / buildTime overlay (OZV-724)

Cần làm:
1. Đặt biến/overlay để `/api/health` trả `commit` = SHA đang chạy (không còn `null` / `khong-co-bien`).
2. `buildTime` có giá trị (không còn `khong-co-tep`) nếu pipeline đã sinh tệp.

Kiểm tra xong:
- [ ] `curl -sS https://hs-kb.uythacnhapkhau.com/api/health | jq '{commit,buildTime,banDungLyDo}'` — `commit` khác null.

## C. Nhắc lại Gemini 402 (đã có yêu cầu 16/11)

Nếu chưa làm: `GEMINI_TRA_PHI_CHOT_CUOI=off` + gỡ khoá 402 — xem `yeu-cau-2026-11-16-tat-gemini-402-va-kho-dap-an.md`.
