# Thời hạn giữ nhật ký runtime (#261 — phục vụ trang chính sách riêng tư của Cổng OZ)

| Chuỗi dữ liệu | Tệp / nơi | Thời hạn giữ | Cơ chế xoá |
|---|---|---|---|
| Nhật ký truy vấn kỹ thuật | `data/access-log.jsonl` (volume `/data`) | **90 ngày** (`HS_LOG_RETENTION_DAYS`) | `npm run logs:prune` — cron `.120` chạy hằng ngày 02:40 (giữ dòng không có `ts` hợp lệ = bỏ dòng hỏng; viết atomic) |
| Mẫu tin huấn luyện (suggest/ml, tín hiệu mic) | `data/ml-log.jsonl` | **90 ngày** (`HS_LOG_RETENTION_DAYS`) | như trên |
| Chi phí LLM lượt công khai (#547) — chỉ số, nhà cung cấp/mẫu, endpoint; **không** đầu vào/đầu ra | `data/llm-cost-public.jsonl` | **400 ngày** (`HS_LLM_COST_RETENTION_DAYS`) | như trên |
| Phản hồi giám đốc (override) | `data/feedback.jsonl` | **365 ngày** (`HS_FEEDBACK_RETENTION_DAYS`) | như trên |
| Log stdout theo từng request | docker json-file của container `hs-code-api` | **xoay tự động**: `--log-opt max-size=10m --log-opt max-file=3` (≈30 MB gần nhất) đặt trong `run-container.sh` trên máy chủ | rotation của Docker |

**Phạm vi dữ liệu trong log (luật #261):** chỉ ghi nội dung mô tả hàng khi request mang
`X-OZ-Chia-Se: 1`. Mặc định (thiếu header = không đồng ý): `ml-log` không ghi dòng;
`access-log` bỏ `querySnippet` (giữ route/ms/mã HS kết quả); log stdout che giá trị
`q`/`moTa`/`description` còn lại độ dài. Khi đồng ý, mọi dòng ghi kèm `maLuot`
(`X-OZ-Ma-Luot`) để truy vết đúng một lượt gọi. Test ràng buộc: `scripts/test-share-consent.mjs`
(gồm test tích hợp stdout qua server thật).
