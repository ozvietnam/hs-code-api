# M-74 (#1966) — Ngưỡng số và phân dải anh em — Chương 67

- **Khuôn áp dụng:** `ho-so-ma@1` ([`docs/mong/khuon-ho-so-ma.md`](../khuon-ho-so-ma.md), [`docs/decisions/0006-ho-so-van-de-ma-8-so.md`](../../decisions/0006-ho-so-van-de-ma-8-so.md))
- **Kho dữ liệu (`RUT_TU_LUAT`, theo `data/lop-kho.json` trên `main`):**
  - `data/ho-so-ma/nguong/67.jsonl`: **0 bản ghi** (**0 `NGUONG`**, **0** bản ghi "Loại khác" gắn mảng `phuDinh`).
- **Kết quả rà luật gốc:** Đã kiểm tra toàn bộ `bieu:67*`, `chuong:67*`, `nhom:67*`, `pn:67*`, `sen:67*` — Chương 67 không có điều kiện ngưỡng số bắt buộc nào (chỉ có số đếm minh họa không phải ngưỡng); giữ tệp chương rỗng theo đúng hiện trạng luật.
- **Tuân thủ quy tắc QT:**
  - Không lấy thông số ví dụ, bảng mẫu hay ước lượng; trích đúng câu của chính nút; không gắn `gir:`, `wco:`, `tb:`; dùng bộ kiểm chung [`scripts/ho-so-ma/nguong-test.mjs`](../../../scripts/ho-so-ma/nguong-test.mjs) và [`scripts/ho-so-ma/cong.mjs`](../../../scripts/ho-so-ma/cong.mjs).
