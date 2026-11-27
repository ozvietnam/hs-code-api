# M-75 (#1967) — Vấn đề chỉ liệt kê được — Chương 78

- **Khuôn áp dụng:** `ho-so-ma@1` ([`docs/mong/khuon-ho-so-ma.md`](../khuon-ho-so-ma.md), [`docs/decisions/0006-ho-so-van-de-ma-8-so.md`](../../decisions/0006-ho-so-van-de-ma-8-so.md))
- **Kho dữ liệu (`RUT_TU_LUAT`, theo `data/lop-kho.json` trên `main`):**
  - `data/ho-so-ma/liet-ke/78.jsonl`: **2 bản ghi** (**0 `CHI_LIET_KE`** + **2 `BO_QUA`**) phủ 100% (2/2) câu kích hoạt `RE_KICH_HOAT_LIET_KE` thuộc Chương 78 (câu Phần XV giữ nguyên ở `liet-ke/XV.jsonl`) và rà soát dò mở rộng LUAT (**0** câu mới). (`0` nút con trùng nguyên văn tên tổ tiên, `0` dòng bảng).
- **Tuân thủ quy tắc QT:**
  - Chỉ giữ đúng tệp dữ liệu chương và tài liệu thẻ; dùng bộ kiểm chung [`scripts/ho-so-ma/liet-ke-test.mjs`](../../../scripts/ho-so-ma/liet-ke-test.mjs) và [`scripts/ho-so-ma/cong.mjs`](../../../scripts/ho-so-ma/cong.mjs) (Cổng 4/5).
  - Không chứa `gir:`, `wco:`, `tb:`; không đặt nhãn `[...]` ở đầu `dieuKien`; tách mục loại trừ/mô tả công dụng thông thường sang `BO_QUA` với lý do tường minh.
