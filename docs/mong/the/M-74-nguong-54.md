# M-74 (#1966) — Ngưỡng số và phân dải anh em — Chương 54

- **Khuôn áp dụng:** `ho-so-ma@1` ([`docs/mong/khuon-ho-so-ma.md`](../khuon-ho-so-ma.md), [`docs/decisions/0006-ho-so-van-de-ma-8-so.md`](../../decisions/0006-ho-so-van-de-ma-8-so.md))
- **Kho dữ liệu (`RUT_TU_LUAT`, theo `data/lop-kho.json` trên `main`):**
  - `data/ho-so-ma/nguong/54.jsonl`: **32 bản ghi** (**29 `NGUONG`**, **3 `TACH_ANH_EM`**, **3** bản ghi "Loại khác" gắn mảng `phuDinh`).
- **Tuân thủ quy tắc QT:**
  - Không lấy thông số ví dụ, bảng mẫu hay ước lượng; trích đúng câu của chính nút; không gắn `gir:`, `wco:`, `tb:`; dùng bộ kiểm chung [`scripts/ho-so-ma/nguong-test.mjs`](../../../scripts/ho-so-ma/nguong-test.mjs) và [`scripts/ho-so-ma/cong.mjs`](../../../scripts/ho-so-ma/cong.mjs).
