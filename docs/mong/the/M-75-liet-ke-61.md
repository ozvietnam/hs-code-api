# M-75 (#1967) — Vấn đề chỉ liệt kê được — Chương 61 (+ Phần XI)

- **Khuôn áp dụng:** `ho-so-ma@1` ([`docs/mong/khuon-ho-so-ma.md`](../khuon-ho-so-ma.md), [`docs/decisions/0006-ho-so-van-de-ma-8-so.md`](../../decisions/0006-ho-so-van-de-ma-8-so.md))
- **Kho dữ liệu (`RUT_TU_LUAT`, theo `data/lop-kho.json` trên `main`):**
  - `data/ho-so-ma/liet-ke/XI.jsonl`: **4 bản ghi** (**2 `CHI_LIET_KE`** + **2 `BO_QUA`**) thuộc Phần XI.
  - `data/ho-so-ma/liet-ke/61.jsonl`: **15 bản ghi** (**13 `CHI_LIET_KE`** + **2 `BO_QUA`**) phủ 100% câu chứa cụm kích hoạt trên đường đi Chương 61 (+ Phần XI) (`0` nút con trùng nguyên văn tên tổ tiên).
- **Tuân thủ quy tắc QT:**
  - Chỉ giữ đúng tệp dữ liệu chương (+ Phần XI) và tài liệu thẻ; dùng bộ kiểm chung [`scripts/ho-so-ma/liet-ke-test.mjs`](../../../scripts/ho-so-ma/liet-ke-test.mjs) và [`scripts/ho-so-ma/cong.mjs`](../../../scripts/ho-so-ma/cong.mjs) (Cổng 4/5).
  - Không chứa `gir:`, `wco:`, `tb:`; không đặt nhãn `[...]` ở đầu `dieuKien`; tách mục loại trừ/tiêu đề sang `BO_QUA` với lý do tường minh.
