# M-75 (#1967) — Vấn đề chỉ liệt kê được — Chương 39 (+ Phần VII)

- **Khuôn áp dụng:** `ho-so-ma@1` ([`docs/mong/khuon-ho-so-ma.md`](../khuon-ho-so-ma.md), [`docs/decisions/0006-ho-so-van-de-ma-8-so.md`](../../decisions/0006-ho-so-van-de-ma-8-so.md))
- **Kho dữ liệu (`RUT_TU_LUAT`, khai trong `data/lop-kho.json`):**
  - `data/ho-so-ma/liet-ke/VII.jsonl`: **4 bản ghi `CHI_LIET_KE`** thuộc Phần VII (`phan:VII:cg:1#1` bộ hàng trộn Phần VI/VII, `phan:VII:cg:2#1` và `kq:5#2` sản phẩm in chuyển Chương 49 trừ 39.18/39.19, `phan:VII:kq:3#2` bộ hàng bán lẻ Quy tắc 3(b)).
  - `data/ho-so-ma/liet-ke/39.jsonl`: **27 bản ghi** (**12 `CHI_LIET_KE` + 15 `BO_QUA`**) phủ 100% câu chứa cụm kích hoạt thuộc Chương 39 và SEN 39 (`chuong:39:kq:94#1`, `chuong:39:kq:97#1`, `nhom:3926:ct:3#2`, `nhom:3926:ct:10#1`, `sen:39229011:1#11`, `sen:39231020:1#1`, `bieu:39229011`, `392530`, `39269020`).
  - Giữ nguyên **y hệt từng byte** `liet-ke/XVI.jsonl`, `liet-ke/84.jsonl`, `liet-ke/85.jsonl`.
  - Tổng phạm vi Chương 39 (+ Phần VII): **31/31 câu kích hoạt được phủ** (`0` thiếu).
- **Tuân thủ chỉ đạo QT:**
  - Không chứa `gir:`, `wco:`, `tb:` hay nhãn `[...]` đầu `dieuKien`.
  - Sửa mẫu câu hỏi `bieu:` trung tính cho Chương 39 (không gán nhầm Phần XV / máy móc Phần XVI).
  - Chuyển toàn bộ mục loại trừ M-72 (`chuong:39:cg:2:q/s/t/w#1`, `chuong:39:kq:72#1 → 32.14`, `105#1 → 35.06`, `nhom:3915:ct:4#1 → 71.12`) và câu mô tả ứng dụng sang `BO_QUA` với lý do tường minh.
- **Công cụ & bài kiểm:**
  - [`scripts/ho-so-ma/liet-ke-rut.mjs`](../../../scripts/ho-so-ma/liet-ke-rut.mjs) (`--chuong 39 --tao|--kiem|--bao-cao`)
  - [`scripts/ho-so-ma/liet-ke-39-test.mjs`](../../../scripts/ho-so-ma/liet-ke-39-test.mjs) (đã đăng ký vào `scripts/danh-sach-test.txt`)
