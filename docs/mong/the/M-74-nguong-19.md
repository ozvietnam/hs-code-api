# [M-74] Ngưỡng số và phân dải anh em — Chương 19

- Chương **19** (Chế phẩm từ ngũ cốc, bột, tinh bột hoặc sữa; các loại bánh).
- Tổng số bản ghi: **12** (10 `NGUONG`, 2 `TACH_ANH_EM`).
- Điểm chính:
  - Chú giải 1(a) (`≤ 20%` thịt/cá/thủy sinh, trừ sản phẩm nhồi 19.02): gắn `chuong:19` (ghi rõ ngoại lệ sản phẩm nhồi 19.02) và `nhom:1902:ct:9#1` gắn `bieu:190230`.
  - `bieu:1901`: 2 nhánh `HOẶC` (`< 40%` ca cao khử béo cho bột/tinh bột/malt; `< 5%` ca cao khử béo cho 04.01–04.04 — Luật 3).
  - `bieu:19011092` (`1 < tuổi ≤ 3`) và `bieu:19011099` (`TACH_ANH_EM`, Luật 2).
  - `bieu:1904` (`≤ 6%` ca cao khử béo — Chú giải 3); `bieu:190510` (`≤ 10%` nước) + `bieu:190590` (`TACH_ANH_EM`); `bieu:190531` bánh quy ngọt (`≥ 50%` hỗn hợp bột/đường/béo, `≤ 12%` nước, `≤ 35%` chất béo).
  - Bỏ qua nhiệt độ gia nhiệt `120°C đến 150°C` trong `nhom:1903:ct:2#1` (thông số quy trình công nghệ).
- Kiểm tra: `khuon`, `cong 3/4/5`, `kiemDaiAnhEm`, `kiemDonViDaiLuongTongQuat`, `doiChieuRanhGoi`, `test-ho-so-ma`, `kiem-pham-vi-the` đều **0 lỗi**.

## Sửa bổ sung theo QT (@ae144fe5)
- Xoá bản ghi `NGUONG` ở `chuong:19` để không áp sai lên sản phẩm nhồi `1902.20`.
- Gắn ngưỡng `≤ 20%` lên từng nút hợp lệ: `bieu:1901`, `bieu:19021`, `bieu:190230` (đã có), `bieu:190240`, `bieu:1903`, `bieu:1904`, `bieu:1905` (KHÔNG gắn `1902.20`). Tổng bản ghi sau sửa: **17**.
