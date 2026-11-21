# Bàn giao ca — hs-code-api

Tệp này ghi **việc đang dở và điều người sau cần biết ngay**. Mục mới nhất ở trên. Mỗi mục ngắn; chi tiết trỏ sang PR,
ADR, thẻ. Lộ trình dài hạn: `docs/backlog/README.md` và bảng việc Paperclip (repo chưa có `docs/roadmap.md`).

---

## 21/11/2026 — Tìm trước, đoán sau (`HS_TIM_TRUOC`, mặc định TẮT)

**Đã làm (PR nhánh `qt/tim-truoc-doan-sau`):** `lib/tim-truoc.js` — trước vòng 1 của động cơ hai vòng, máy tìm tất định
trong kho bằng mô tả + tên ngắn (5 hàm tìm sẵn có, gộp bằng bỏ phiếu theo thứ hạng), đưa top 5 nhóm kèm bằng chứng vào
đầu vào vòng 1 (≤ 1.500 ký tự, lời dặn hệ thống không đổi) và nạp các nhóm đó + tối đa 2 nhóm dễ nhầm theo cạnh sổ tay
hai chiều vào `gather()`. Công cụ đo trong container: `scripts/do-phan-loai-tom-tat.mjs` + 3 tệp ca `scripts/ca-do/`.

**Số đã có (không LLM, 2.000 dòng gold bỏ-một-dòng, bản chặt: tắt alias, bỏ dòng trùng tên):** nhóm đúng nằm trong khối
vòng 1 ở 82,8–84,0%; bộ van khí nén 8481: 74/74. Chi phí (LLM giả, 98 dòng): tìm trước ~1,3 giây; vòng 1 thêm ~1.160 ký
tự; gói vòng 2 từ ~5,5 nghìn lên ~22 nghìn ký tự (chỉnh bằng `HS_TIM_TRUOC_NAP`).

**CHƯA đo bằng LLM thật.** QT bật trên máy thật rồi chạy `scripts/do-phan-loai-tom-tat.mjs` với 3 tệp ca, so trước / sau
(L1). Xấu hơn thì tắt trước, sửa sau.

**Việc kế (không nằm trong PR):** kho từ đồng nghĩa tiếng Việt cho `searchOzByKeyword` / `searchPrecedents`; chỉ mục chữ
cho sổ tay / chú giải; sửa `tieuChi6`.

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
