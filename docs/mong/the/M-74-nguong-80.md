# M-74 (#1966) — Ngưỡng số và phân dải anh em — Chương 80

- **Khuôn áp dụng:** `ho-so-ma@1` ([`docs/mong/khuon-ho-so-ma.md`](../khuon-ho-so-ma.md), [`docs/decisions/0006-ho-so-van-de-ma-8-so.md`](../../decisions/0006-ho-so-van-de-ma-8-so.md))
- **Kho dữ liệu (`RUT_TU_LUAT`, theo `data/lop-kho.json` trên `main`):**
  - `data/ho-so-ma/nguong/80.jsonl`: **7 bản ghi** (**4 `NGUONG`**, **2 `DINH_NGHIA`**, **1 `TACH_ANH_EM`** gắn `phuDinh`).
  - Áp dụng Luật 5 + Luật 7 & Luật 1 + Luật 2: giữ 2 `DINH_NGHIA` ở `chuong:80`, gắn `NGUONG` sang `bieu:800110` (`>= 99%`) và `bieu:800120` (`> 1%`), rút cặp `80070020` / `80070030` (`0,2 mm`) và `TACH_ANH_EM` `phuDinh` cho `bieu:8007009`.
- **Đối soát số + đơn vị & `ranh-gioi` (Luật 6):**
  - Tổng câu trúng số+đơn vị (Phần XV + Chương 80 pháp lý + dòng biểu): **5** (`phan:XV:cg:8:b#1` đã có trong `nguong/XV.jsonl`; **4/4** câu Chương 80 đã rút thành bản ghi; 0 tệp `ranh-gioi/80*.json`).
- **Tuân thủ quy tắc QT:**
  - Không lấy thông số ví dụ, bảng mẫu hay ước lượng; trích đúng câu của chính nút; không gắn `gir:`, `wco:`, `tb:`; dùng bộ kiểm chung [`scripts/ho-so-ma/nguong-test.mjs`](../../../scripts/ho-so-ma/nguong-test.mjs) và [`scripts/ho-so-ma/cong.mjs`](../../../scripts/ho-so-ma/cong.mjs).
