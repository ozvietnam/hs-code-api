# M-75 (#1967) — Vấn đề chỉ liệt kê được — Chương 74

- **Khuôn áp dụng:** `ho-so-ma@1` ([`docs/mong/khuon-ho-so-ma.md`](../khuon-ho-so-ma.md), [`docs/decisions/0006-ho-so-van-de-ma-8-so.md`](../../decisions/0006-ho-so-van-de-ma-8-so.md))
- **Kho dữ liệu (`RUT_TU_LUAT`, theo `data/lop-kho.json` trên `main`):**
  - `data/ho-so-ma/liet-ke/74.jsonl`: **22 bản ghi** (**13 `CHI_LIET_KE`** + **9 `BO_QUA`**) phủ 100% (20/20) câu chứa cụm kích hoạt `RE_KICH_HOAT_LIET_KE` thuộc Chương 74 (các câu Phần XV giữ nguyên ở `liet-ke/XV.jsonl`) và rà soát bổ sung **2** câu mới từ dò mở rộng `/dùng|sử dụng|phù hợp|thích hợp|bộ phận|.../` trên chú giải pháp lý + dòng biểu (`bieu:74198060#1`, `chuong:74:cg:1:c#1`), `0` nút con trùng nguyên văn tên tổ tiên, `0` dòng bảng.
- **Tuân thủ quy tắc QT:**
  - Chỉ giữ đúng tệp dữ liệu chương và tài liệu thẻ; dùng bộ kiểm chung [`scripts/ho-so-ma/liet-ke-test.mjs`](../../../scripts/ho-so-ma/liet-ke-test.mjs) và [`scripts/ho-so-ma/cong.mjs`](../../../scripts/ho-so-ma/cong.mjs) (Cổng 4/5).
  - Không chứa `gir:`, `wco:`, `tb:`; không đặt nhãn `[...]` ở đầu `dieuKien`; tách mục loại trừ/mô tả công dụng thông thường/tiêu đề lặp sang `BO_QUA` với lý do tường minh.
