# M-75 (#1967) — Vấn đề chỉ liệt kê được — Chương 84 (+ Phần XVI)

- **Khuôn áp dụng:** `ho-so-ma@1` ([`docs/mong/khuon-ho-so-ma.md`](../khuon-ho-so-ma.md), [`docs/decisions/0006-ho-so-van-de-ma-8-so.md`](../../decisions/0006-ho-so-van-de-ma-8-so.md))
- **Kho dữ liệu (`RUT_TU_LUAT`, khai trong `data/lop-kho.json` trên `main`):**
  - `data/ho-so-ma/liet-ke/XVI.jsonl`: **51 bản ghi** (**18 `CHI_LIET_KE`** + **33 `BO_QUA`** trên `phan:XVI`).
  - `data/ho-so-ma/liet-ke/84.jsonl`: **352 bản ghi** (**244 `CHI_LIET_KE`** + **108 `BO_QUA`** trên `chuong:84`, `bieu:84*`, `nhom:84*`, `sen:84*`; đã bỏ 5 nút con trùng nguyên văn tên tổ tiên: `bieu:84012000`, `84014000`, `84314300`, `84424000`, `84663000`).
  - **Tổng: 403 bản ghi** (**262 `CHI_LIET_KE`**, **141 `BO_QUA`**), phủ **100%** câu khớp cụm kích hoạt trên đường đi Chương 84 và **0** nút con trùng tên tổ tiên.
- **Tuân thủ 3 quy tắc QT chốt trên PR `#1975`:**
  1. **Không ghép bản ghi `gir:*` vào Chương 84:** `0` bản ghi nguồn `gir:` hoặc gắn ở nút `gir:`.
  2. **`dieuKien` bỏ nhãn `[...]` đầu câu:** toàn bộ 262 câu `CHI_LIET_KE` viết tự nhiên, rõ câu hỏi pháp lý, `0` dòng mở bằng `[`.
  3. **Không chứa `wco:` hay `tb:`:** loại hoàn toàn nguồn tiền lệ và WCO theo ADR-0006.
- **Trọng tâm nội dung Chương 84 & Phần XVI:**
  - **Phần XVI (`phan:XVI`):** Chú giải 2(a)/2(b) phân loại bộ phận định danh vs bộ phận chỉ/chủ yếu dùng cho máy cụ thể vs 84.87/85.48; Chú giải 3 máy liên hợp/đa chức năng theo chức năng chính; Chú giải 4 tổ hợp chức năng; máy chưa hoàn chỉnh & tháo rời (`kq:64`, `kq:67`); máy đa chức năng/tổ hợp (`kq:70`, `kq:73`, `kq:83`).
  - **Chương 84 & biểu/chú giải (`84*`):** Ưu tiên 84.01–84.24 & 84.86 trước 84.25–84.80 (`chuong:84:cg:2`); khối chức năng 84.71 (`cg:6:C`, `kq:62`); máy đa chức năng về 84.79 (`cg:8#2`, `kq:56#2`); máy bán dẫn 84.86 (`cg:11:C`); các dòng biểu bộ phận/chuyên dùng (`84.09`, `84.31`, `84.48`, `84.52`, `84.66`, `84.73`, `84.86`, `8414.59.10`, `8418`, `8421`, `8424`, `8443.31`, `8456`, `8479.89.10`, `8483`); SEN `8423.90.30` áp dụng Quy tắc 3(c) khi không rõ mục đích cân xe hay cân khác.
- **Kiểm chứng chung:**
  - [`scripts/ho-so-ma/liet-ke-test.mjs`](../../../scripts/ho-so-ma/liet-ke-test.mjs) (`--pham-vi 84` qua Cổng 4/5 tại [`scripts/ho-so-ma/cong.mjs`](../../../scripts/ho-so-ma/cong.mjs))
