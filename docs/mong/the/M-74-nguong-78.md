# M-74 (#1966) — Ngưỡng số và phân dải anh em — Chương 78

- **Khuôn áp dụng:** `ho-so-ma@1` ([`docs/mong/khuon-ho-so-ma.md`](../khuon-ho-so-ma.md), [`docs/decisions/0006-ho-so-van-de-ma-8-so.md`](../../decisions/0006-ho-so-van-de-ma-8-so.md))
- **Kho dữ liệu (`RUT_TU_LUAT`, theo `data/lop-kho.json` trên `main`):**
  - `data/ho-so-ma/nguong/78.jsonl`: **7 bản ghi** (**4 `NGUONG`**, **1 `DINH_NGHIA`**, **2 `TACH_ANH_EM`**, **3** bản ghi "Loại khác" gắn `phuDinh`).
  - Áp dụng Luật 5 + Luật 7 & Luật 1 + Luật 2: giữ `DINH_NGHIA` ở `chuong:78`, chuyển `NGUONG` `>= 99,9%` sang `bieu:780110` kèm `TACH_ANH_EM` `phuDinh` cho `bieu:78019`; giữ `NGUONG` cho `7804.11` (`<= 0,2 mm`), `7804.11.10`/`7804.11.90` (`0,15 mm`), và chuyển `7804.19` thành `TACH_ANH_EM` `phuDinh` (xóa khoảng `> 0,2 mm` vì `7804.11` là điều kiện ghép dạng lá/dải/lá mỏng + chiều dày, còn tấm mỏng `<= 0,2 mm` vẫn thuộc `7804.19`).
- **Đối soát số + đơn vị & `ranh-gioi` (Luật 6):**
  - Tổng câu trúng số+đơn vị (Phần XV + Chương 78 pháp lý + dòng biểu): **4** (`phan:XV:cg:8:b#1` đã có trong `nguong/XV.jsonl`; **3/3** câu Chương 78 gồm `780411#1`, `78041110#1`, `chuong:78:cgpn:1#1` đã rút thành bản ghi; 0 tệp `ranh-gioi/78*.json`).
- **Tuân thủ quy tắc QT:**
  - Không lấy thông số ví dụ, bảng mẫu hay ước lượng; trích đúng câu của chính nút; không gắn `gir:`, `wco:`, `tb:`; dùng bộ kiểm chung [`scripts/ho-so-ma/nguong-test.mjs`](../../../scripts/ho-so-ma/nguong-test.mjs) và [`scripts/ho-so-ma/cong.mjs`](../../../scripts/ho-so-ma/cong.mjs).
