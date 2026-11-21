# Bàn giao ca — hs-code-api

Tệp này ghi **việc đang dở và điều người sau cần biết ngay**. Mục mới nhất ở trên. Mỗi mục ngắn; chi tiết trỏ sang PR,
ADR, thẻ. Lộ trình dài hạn: `docs/backlog/README.md` và bảng việc Paperclip (repo chưa có `docs/roadmap.md`).

---

## 21/11/2026 — Luật đường khách (ADR-0001)

**Đã làm:** viết 10 luật L1–L10 (`docs/luat-duong-khach.md`), hai bảng nguồn sự thật (`data/luat/dau-noi.json`,
`data/luat/bang-co.json`), bốn cổng máy trong `npm test` + CI `Luat L1`, mẫu PR. Sửa các câu lỗi thời trong
`CLAUDE.md`, `AGENTS.md`, `docs/TONG-QUAN.md`, `docs/backlog/08`, `docs/van-hanh/bat-ho-so-shadow.md`.

**Đang đỏ, đã khai ngoại lệ có thẻ:**

| Chỗ | Thẻ |
|---|---|
| `/api/identify` chưa đọc sổ tay nhóm / sổ PN6; câu hỏi theo bảng chương | OZV-1670 |
| `/api/classify`: câu hỏi do LLM viết; nhánh `earlyExitHoiTuR1` bỏ sổ tay | OZV-1707 (PR #1523) |
| `lib/classify-guards.js` (động cơ cũ) đổ chuỗi của LLM thành câu hỏi | OZV-1707 |
| `soTay.outcome` khởi tạo bằng `"NONE"` (L6) | OZV-1707 |

**Hạn sắp tới:**

- **27/11/2026 — `HS_HO_SO=shadow` tới ngày xét.** Chủ (GĐ hs-code-api) lấy số theo `bang-co.json`, quyết bật / tắt /
  gia hạn. Chưa quyết thì `npm test` đỏ cho mọi PR. Ngày và ngưỡng là QT đặt tạm; chủ chỉnh trước ngày xét.

**Người gộp PR kế tiếp cần biết:**

- PR #1523 gộp sau PR luật: phải khai cờ `HS_HOI_THEO_SO_TAY` và sửa ba chỗ trong `dau-noi.json` (cổng báo đích danh).
- PR đang mở đụng tệp gọi LLM (`lib/identify.js`, `lib/engine-loop.js`…): thêm vào thân PR một dòng trả lời L1.

**Chưa làm, ghi ở ADR-0001 mục "Việc tiếp theo":** cờ `LLM_*` chưa vào bảng cờ; khung "tắt = như main" dùng chung;
nguồn tìm kiếm dự phòng cho máy thật.
