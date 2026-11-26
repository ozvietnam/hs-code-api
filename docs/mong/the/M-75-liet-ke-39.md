# M-75 (#1967) — Vấn đề chỉ liệt kê được — Chương 39 (+ Phần VII)

- **Khuôn áp dụng:** `ho-so-ma@1` ([`docs/mong/khuon-ho-so-ma.md`](../khuon-ho-so-ma.md), [`docs/decisions/0006-ho-so-van-de-ma-8-so.md`](../../decisions/0006-ho-so-van-de-ma-8-so.md))
- **Kho dữ liệu (`RUT_TU_LUAT`, khai trong `data/lop-kho.json` trên `main`):**
  - `data/ho-so-ma/liet-ke/VII.jsonl`: **4 bản ghi `CHI_LIET_KE`** thuộc Phần VII (`phan:VII:cg:1#1` bộ hàng trộn Phần VI/VII, `phan:VII:cg:2#1` và `kq:5#2` sản phẩm in chuyển Chương 49 trừ 39.18/39.19, `phan:VII:kq:3#2` bộ hàng bán lẻ Quy tắc 3(b)).
  - `data/ho-so-ma/liet-ke/39.jsonl`: **26 bản ghi** (**11 `CHI_LIET_KE` + 15 `BO_QUA`**; đã bỏ 1 nút con trùng nguyên văn tên tổ tiên `bieu:39253000`), phủ 100% câu chứa cụm kích hoạt thuộc Chương 39 và SEN 39 (`chuong:39:kq:94#1`, `chuong:39:kq:97#1`, `nhom:3926:ct:3#2`, `nhom:3926:ct:10#1`, `sen:39229011:1#11`, `sen:39231020:1#1`, `bieu:39229011`, `39269020`).
  - Tổng phạm vi Chương 39 (+ Phần VII): **30 bản ghi**, **0** nút con trùng tên tổ tiên.
- **Tuân thủ chỉ đạo QT:**
  - Không chứa `gir:`, `wco:`, `tb:` hay nhãn `[...]` đầu `dieuKien`.
  - Sửa mẫu câu hỏi `bieu:` trung tính cho Chương 39 (không gán nhầm Phần XV / máy móc Phần XVI).
  - Chuyển toàn bộ mục loại trừ M-72 (`chuong:39:cg:2:q/s/t/w#1`, `chuong:39:kq:72#1 → 32.14`, `105#1 → 35.06`, `nhom:3915:ct:4#1 → 71.12`) và câu mô tả ứng dụng sang `BO_QUA` với lý do tường minh.
- **Kiểm chứng chung:**
  - [`scripts/ho-so-ma/liet-ke-test.mjs`](../../../scripts/ho-so-ma/liet-ke-test.mjs) (`--pham-vi 39` qua Cổng 4/5 tại [`scripts/ho-so-ma/cong.mjs`](../../../scripts/ho-so-ma/cong.mjs))
