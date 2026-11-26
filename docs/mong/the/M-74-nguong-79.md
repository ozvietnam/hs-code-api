# M-74 (#1966) — Ngưỡng số và phân dải anh em — Chương 79

- **Khuôn áp dụng:** `ho-so-ma@1` ([`docs/mong/khuon-ho-so-ma.md`](../khuon-ho-so-ma.md), [`docs/decisions/0006-ho-so-van-de-ma-8-so.md`](../../decisions/0006-ho-so-van-de-ma-8-so.md))
- **Kho dữ liệu (`RUT_TU_LUAT`, theo `data/lop-kho.json` trên `main`):**
  - `data/ho-so-ma/nguong/79.jsonl`: **13 bản ghi** (**9 `NGUONG`**, **3 `DINH_NGHIA`**, **1 `TACH_ANH_EM`**, **2** bản ghi "Loại khác" gắn `phuDinh`).
  - Áp dụng Luật 5 + Luật 7 & Luật 3/4: giữ 3 `DINH_NGHIA` ở `chuong:79`, gắn `NGUONG` kẽm không hợp kim (`>= 97,5%`) vào `bieu:790111` và `bieu:790112`, `NGUONG` hợp kim kẽm (`> 2,5%`) vào `bieu:790120`, gộp cỡ mắt sàng 63 micromét (thông số phép đo) vào bản ghi `>= 80%` của `bieu:790310` (xóa bản ghi `{tu:63, den:63}`), giữ kẽm kim loại `>= 85%` ở `7903.10` và `TACH_ANH_EM` `phuDinh` cho `7903.90`.
- **Đối soát số + đơn vị & `ranh-gioi` (Luật 6):**
  - Tổng câu trúng số+đơn vị (Phần XV + Chương 79 pháp lý + dòng biểu): **8** (`phan:XV:cg:8:b#1` đã có trong `nguong/XV.jsonl`; **7/7** câu Chương 79 đã rút thành bản ghi; 0 tệp `ranh-gioi/79*.json`).
- **Tuân thủ quy tắc QT:**
  - Không lấy thông số ví dụ, bảng mẫu hay ước lượng; trích đúng câu của chính nút; không gắn `gir:`, `wco:`, `tb:`; dùng bộ kiểm chung [`scripts/ho-so-ma/nguong-test.mjs`](../../../scripts/ho-so-ma/nguong-test.mjs) và [`scripts/ho-so-ma/cong.mjs`](../../../scripts/ho-so-ma/cong.mjs).
