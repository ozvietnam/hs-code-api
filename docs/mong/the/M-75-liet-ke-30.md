# M-75 (#1967) — Vấn đề chỉ liệt kê được — Chương 30

- **Khuôn áp dụng:** `ho-so-ma@1` ([`docs/mong/khuon-ho-so-ma.md`](../khuon-ho-so-ma.md), [`docs/decisions/0006-ho-so-van-de-ma-8-so.md`](../../decisions/0006-ho-so-van-de-ma-8-so.md))
- **Kho dữ liệu (`RUT_TU_LUAT`, theo `data/lop-kho.json` trên `main`):**
  - `data/ho-so-ma/liet-ke/30.jsonl`: **7 bản ghi** (**6 `CHI_LIET_KE`** + **1 `BO_QUA`**) phủ 100% câu chứa cụm kích hoạt riêng thuộc Chương 30 (`chuong:30` / `bieu:30*` / `nhom:30*`; các câu thuộc Phần VI nằm ở tệp `liet-ke/VI.jsonl`) (`0` nút con trùng nguyên văn tên tổ tiên).
- **Tuân thủ quy tắc QT:**
  - Chỉ giữ đúng tệp dữ liệu chương và tài liệu thẻ; dùng bộ kiểm chung [`scripts/ho-so-ma/liet-ke-test.mjs`](../../../scripts/ho-so-ma/liet-ke-test.mjs) và [`scripts/ho-so-ma/cong.mjs`](../../../scripts/ho-so-ma/cong.mjs) (Cổng 4/5).
  - Không chứa `gir:`, `wco:`, `tb:`; không đặt nhãn `[...]` ở đầu `dieuKien`; tách mục loại trừ/tiêu đề sang `BO_QUA` với lý do tường minh.
