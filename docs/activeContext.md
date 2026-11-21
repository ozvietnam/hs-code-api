# Bàn giao ca — hs-code-api

Tệp này ghi **việc đang dở và điều người sau cần biết ngay**. Mục mới nhất ở trên. Mỗi mục ngắn; chi tiết trỏ sang PR,
ADR, thẻ. Lộ trình dài hạn: `docs/backlog/README.md` và bảng việc Paperclip (repo chưa có `docs/roadmap.md`).

---

## 21/11/2026 — Luật đường khách (ADR-0001)

**Đã làm:** viết 11 luật L1–L11 (`docs/luat-duong-khach.md`), hai bảng nguồn sự thật (`data/luat/dau-noi.json`,
`data/luat/bang-co.json`), bốn cổng máy trong `npm test` + CI `Luat L1`, mẫu PR. Sửa các câu lỗi thời trong
`CLAUDE.md`, `AGENTS.md`, `docs/TONG-QUAN.md`, `docs/backlog/08`, `docs/van-hanh/bat-ho-so-shadow.md`.

**Đang đỏ, đã khai ngoại lệ có thẻ:**

| Chỗ | Thẻ |
|---|---|
| `/api/identify` chưa đọc sổ tay nhóm / sổ PN6; câu hỏi theo bảng chương | OZV-1670 |
| `/api/classify`: câu hỏi do LLM viết khi `HS_HOI_THEO_SO_TAY` còn tắt (mặc định); nhánh `earlyExitHoiTuR1` bỏ sổ tay | OZV-1707 |
| `lib/classify-guards.js` (động cơ cũ) đổ chuỗi của LLM thành câu hỏi | OZV-1707 |
| `soTay.outcome` khởi tạo bằng `"NONE"` (L6) | OZV-1707 |

**Hạn sắp tới:**

- **27/11/2026 — `HS_HO_SO=shadow` tới ngày xét.** Chủ (GĐ hs-code-api) lấy số theo `bang-co.json`, quyết bật / tắt /
  gia hạn. Chưa quyết thì `npm test` đỏ cho mọi PR. Ngày và ngưỡng là QT đặt tạm; chủ chỉnh trước ngày xét.

**Người gộp PR kế tiếp cần biết:**

- `HS_HOI_THEO_SO_TAY` (PR #1523, #1524) đã ở `main`, đang TẮT. Trưa 21/11 QT bật thử trên máy thật rồi phải tắt: ca
  van khí nén 5/2 động cơ dừng sớm ở `8412.21`, khách bị hỏi theo sổ nhóm 84.12. **Không bật lại** cho tới khi nhánh
  dừng sớm sửa xong (OZV-1707) và ca này ra đúng nhóm 84.81 (L3 bổ sung, L11).
- PR đang mở đụng tệp gọi LLM (`lib/identify.js`, `lib/engine-loop.js`…): thêm vào thân PR một dòng trả lời L1.

**Chưa làm, ghi ở ADR-0001 mục "Việc tiếp theo":** cờ `LLM_*` chưa vào bảng cờ; khung "tắt = như main" dùng chung;
nguồn tìm kiếm dự phòng cho máy thật.
