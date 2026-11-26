# Báo cáo M-74 — Gom test chung cho mọi chương (`nguong-test.mjs`)

- **Phạm vi:** `#1966` (`M-74`), đồng bộ trên `origin/main` (`9f940da8`, gồm `#1988` Ch.85 và `#1981` khuôn).
- **Thay đổi:**
  1. Nâng `scripts/ho-so-ma/nguong-test.mjs` thành bài kiểm **duy nhất** của thẻ M-74, tự quét mọi tệp `data/ho-so-ma/nguong/<chương>.jsonl` hiện có (`76`, `84`, `85` và mọi chương mới): khuôn `ho-so-ma@1`, Cổng 3 (`ANH EM` + `kiemDaiAnhEm`), Cổng 4 (`TRÍCH`), Cổng 5 (`VÂN TAY`), `kiemDonViDaiLuongTongQuat`, đối chiếu `data/ho-so/ranh-gioi/<chương>*.json`, kiểm không `tb:`/`wco:`/`gir:`, ca ngược và tái tạo tất định `76`/`84`/`85`.
  2. Gộp và xoá cả hai tệp `scripts/ho-so-ma/nguong-84-test.mjs` và `scripts/ho-so-ma/nguong-85-test.mjs`, xoá 2 dòng tương ứng khỏi `scripts/danh-sach-test.txt`.
  3. Dùng `r.cong[4].soKiem >= banGhiRiengChuong(ch).length` để các PR chương của M-74 và M-75 cùng tồn tại trên một chương mà không đụng số đếm.
