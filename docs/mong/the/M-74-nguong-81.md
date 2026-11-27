# M-74 (#1966) — Ngưỡng số và phân dải anh em — Chương 81

- **Khuôn áp dụng:** `ho-so-ma@1` ([`docs/mong/khuon-ho-so-ma.md`](../khuon-ho-so-ma.md), [`docs/decisions/0006-ho-so-van-de-ma-8-so.md`](../../decisions/0006-ho-so-van-de-ma-8-so.md))
- **Kho dữ liệu (`RUT_TU_LUAT`, theo `data/lop-kho.json` trên `main`):**
  - `data/ho-so-ma/nguong/81.jsonl`: **10 bản ghi** (**10 `NGUONG`**, **0 `DINH_NGHIA`**, **5** bản ghi "Loại khác" gắn mảng `phuDinh`).
- **Đối soát số + đơn vị & `ranh-gioi` (Luật 6):**
  - Tổng câu trúng số+đơn vị (Phần XV + Chương 81 + dòng biểu): **5** (`phan:XV:cg:8:b#1` đã có trong `nguong/XV.jsonl`; **4/4** dòng biểu `810411`/`81041100`, `810610` cùng 3 phân nhóm `810921`/`810931`/`810991` dưới 1/500 đã rút thành bản ghi kèm đủ **5** phần bù `"Loại khác"` `phuDinh`: `810419`, `810690`, `810929`, `810939`, `810999`).
- **Tuân thủ quy tắc QT:**
  - Không lấy thông số ví dụ, bảng mẫu hay ước lượng; trích đúng câu của chính nút; không gắn `gir:`, `wco:`, `tb:`; dùng bộ kiểm chung [`scripts/ho-so-ma/nguong-test.mjs`](../../../scripts/ho-so-ma/nguong-test.mjs) và [`scripts/ho-so-ma/cong.mjs`](../../../scripts/ho-so-ma/cong.mjs).
