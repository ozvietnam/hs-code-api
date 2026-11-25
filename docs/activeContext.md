# Bàn giao ca — hs-code-api

Tệp này ghi **việc đang dở và điều người sau cần biết ngay**. Mục mới nhất ở trên. Mỗi mục ngắn; chi tiết trỏ sang PR,
ADR, thẻ. Lộ trình dài hạn: `docs/backlog/README.md` và bảng việc Paperclip (repo chưa có `docs/roadmap.md`).

---

## 21/11/2026 — Mẫu tiêu chí 6 số (G6-0 / G6-1): 8481, 8412 + cổng máy (ADR-0003)

**Đã làm (PR nhánh `qt/G6-0-mau-tieu-chi-6-so`, PR #1549, trên main sau #1539):** `tieuChi6` khuôn g6@1 cho 8481 (6 mục) và 8412
(12 mục), áp bằng `node scripts/goi-soan-tieu-chi-6.mjs --ap`. Bảng cạnh thêm loại C10 (3.186 cạnh từ 511 nhóm; 14 cạnh mang
khoá dữ kiện C13). Cổng `scripts/kiem-tieu-chi-6.mjs` (mã lỗi + cảnh báo khai tại `lib/do-thi/tieu-chi-6.js`, xem `--ma-loi`; vòng 2 thêm phủ vế; 21/11 thêm luật hỏi đặc tính CHI_HOI_MUC_DICH) + `scripts/test-tieu-chi-6.mjs` trong `npm test`.
Hướng dẫn cho AI soạn: [`docs/giao-viec/do-thi/SOAN-TIEU-CHI-6-SO.md`](giao-viec/do-thi/SOAN-TIEU-CHI-6-SO.md).

**CHƯA đổi đầu vào LLM nào.** `soTayBlock()` (khối sổ tay vòng 2) không đọc `tieuChi6`. `HS_HOI_THEO_SO_TAY` (đang tắt) khi bật
sẽ lấy căn cứ câu hỏi phân nhóm của 8481 / 8412 từ `tieuChi6`. Mục mới mang nhãn `AI_DA_KIEM`: động cơ hồ sơ chưa đọc.

**Thử nhân bản bằng `ag/gemini-3-flash`:** lần 1 (3 nhóm, [báo cáo](giao-viec/do-thi/thu-nhan-ban-1/BAO-CAO.md)); lần 2 (5 nhóm ×
3 lần × 5 vòng, 223 lượt gọi, [báo cáo](giao-viec/do-thi/thu-nhan-ban-2/BAO-CAO.md)): vòng cuối 3/5/4 nhóm qua, chấm lại bằng cổng
cuối 1/5/3. **Chưa đạt tiêu chí chạy loạt** (≥ 4/5 ở cả 3 lần, 0 lỗi lọt). Không có mô hình pro miễn phí trên 9Router. Việc kế:
bổ sung tu-vung `chatLieu` "da thuộc" + khoá "dạng tấm"; chạy lại 5 × 3 với cổng cuối; nhóm tiêu đề ghép để mô hình mạnh / người soát.

---

## 21/11/2026 — Đồ thị tri thức, giai đoạn 1: bảng cạnh máy sinh (ADR-0002)

**Kế hoạch CEO duyệt 21/11:** [`docs/ke-hoach-do-thi-tri-thuc-hs.md`](ke-hoach-do-thi-tri-thuc-hs.md). Quyết định:
[`docs/decisions/0002-do-thi-tri-thuc-tim-chon-nhom-di-canh-xuong-ma.md`](decisions/0002-do-thi-tri-thuc-tim-chon-nhom-di-canh-xuong-ma.md).

**Đã làm (PR nhánh `qt/do-thi-gd1-bang-canh`):** `lib/do-thi/` dựng bảng cạnh trong RAM từ tệp gốc (không LLM, không sửa
tệp gốc): C5 5.196 · C6 5.196 (đảo C5, 3.947 chiều sổ bên kia chưa ghi) · C7 3.267 · C8 1.609 · C11 18.951 (8.914 mức 6 số,
10.037 mức 8 số) · chỉ mục C1 gộp 21.269 cụm · hàm C14 `tienLeUngHo()`. Lệnh `node scripts/dung-bang-canh.mjs`; cổng
`scripts/test-bang-canh.mjs` trong `npm test`. Số đếm: `data/do-thi/thong-ke.json`; xếp hạng lượng hàng:
`data/do-thi/xep-hang-luong-hang.json` (93 nhóm chiếm 80% số dòng tờ khai mẫu).

**CHƯA nối đường khách nào.** `data/luat/dau-noi.json` kho `bangCanh`: mọi đường khai `khong`. Không thêm cờ `HS_*` (mốc 75 cờ).

**Việc kế:** giai đoạn 0 (số nền trên máy thật, QT) → giai đoạn 2 (tìm ứng viên đủ nguồn, mọi hàm tìm đọc bảng C1 gộp).
Trước khi nối: quyết cách nạp bảng lúc khởi động (dựng ~7,5 giây, ~100 MB RAM); đo tỉ lệ kéo oan của `moRongUngVien()`;
xử 17 cụm mâu thuẫn nhóm giữa các kho cụm từ. Nối `tienLeUngHo()` vào cả bốn nhánh dừng sớm (`nhanhBoQua`).
**Một vào – một ra:** giai đoạn nào bật thật phải kèm danh sách gỡ (kế hoạch mục 6.1).

---

## 21/11/2026 — Tìm trước, đoán sau (`HS_TIM_TRUOC`, mặc định TẮT)

**Đã làm (PR nhánh `qt/tim-truoc-doan-sau`):** `lib/tim-truoc.js` — trước vòng 1 của động cơ hai vòng, máy tìm tất định
trong kho bằng mô tả + tên ngắn (5 hàm tìm sẵn có, gộp bằng bỏ phiếu theo thứ hạng), đưa top 5 nhóm kèm bằng chứng vào
đầu vào vòng 1 (≤ 1.500 ký tự, lời dặn hệ thống không đổi). Nạp thêm các nhóm đó + tối đa 2 nhóm dễ nhầm theo cạnh sổ
tay hai chiều vào `gather()` là tuỳ chọn `HS_TIM_TRUOC_NAP` (mặc định 0 = không nạp, CEO 21/11). Công cụ đo trong container: `scripts/do-phan-loai-tom-tat.mjs` + 3 tệp ca `scripts/ca-do/`.

**Số đã có (không LLM, 2.000 dòng gold bỏ-một-dòng, bản chặt: tắt alias, bỏ dòng trùng tên):** nhóm đúng nằm trong khối
vòng 1 ở 82,8–84,0%; bộ van khí nén 8481: 74/74. Chi phí (LLM giả, 98 dòng): tìm trước ~1,3 giây; vòng 1 thêm ~1.160 ký
tự; gói vòng 2 không đổi ở mặc định `HS_TIM_TRUOC_NAP=0` (với 5: từ ~5,5 nghìn lên ~22 nghìn ký tự).

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
