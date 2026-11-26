# M-75 (#1967) — Vấn đề chỉ liệt kê được — Chương 64 (+ Phần XII)

- **Khuôn áp dụng:** `ho-so-ma@1` ([`docs/mong/khuon-ho-so-ma.md`](../khuon-ho-so-ma.md), [`docs/decisions/0006-ho-so-van-de-ma-8-so.md`](../../decisions/0006-ho-so-van-de-ma-8-so.md))
- **Kho dữ liệu (`RUT_TU_LUAT`, theo `data/lop-kho.json` trên `main`):**
  - `data/ho-so-ma/liet-ke/XII.jsonl`: **1 bản ghi** (**0 `CHI_LIET_KE`** + **1 `BO_QUA`**) thuộc Phần XII.
  - `data/ho-so-ma/liet-ke/64.jsonl`: **20 bản ghi** (**17 `CHI_LIET_KE`** + **3 `BO_QUA`**) phủ 100% câu chứa cụm kích hoạt trên đường đi Chương 64 (+ Phần XII) (`0` nút con trùng nguyên văn tên tổ tiên).
- **Tuân thủ quy tắc QT:**
  - Chỉ giữ đúng tệp dữ liệu chương (+ Phần XII) và tài liệu thẻ; dùng bộ kiểm chung [`scripts/ho-so-ma/liet-ke-test.mjs`](../../../scripts/ho-so-ma/liet-ke-test.mjs) và [`scripts/ho-so-ma/cong.mjs`](../../../scripts/ho-so-ma/cong.mjs) (Cổng 4/5).
  - Không chứa `gir:`, `wco:`, `tb:`; không đặt nhãn `[...]` ở đầu `dieuKien`; tách mục loại trừ/tiêu đề sang `BO_QUA` với lý do tường minh.
