# M-74 (#1966) — Ngưỡng số và phân dải anh em — Chương 75

- **Khuôn áp dụng:** `ho-so-ma@1` ([`docs/mong/khuon-ho-so-ma.md`](../khuon-ho-so-ma.md), [`docs/decisions/0006-ho-so-van-de-ma-8-so.md`](../../decisions/0006-ho-so-van-de-ma-8-so.md))
- **Kho dữ liệu (`RUT_TU_LUAT`, theo `data/lop-kho.json` trên `main`):**
  - `data/ho-so-ma/nguong/75.jsonl`: **24 bản ghi** (**21 `NGUONG`**, **2 `DINH_NGHIA`**, **1 `TACH_ANH_EM`** gắn `phuDinh`).
  - Áp dụng Luật 5 + Luật 7: giữ 2 `DINH_NGHIA` ở `chuong:75`, gắn `NGUONG` niken không hợp kim vào đúng 5 nút `bieu:` (`7502.10`, `7505.11`, `7505.21`, `7506.10`, `7507.11`) và `NGUONG` hợp kim niken vào đúng 5 nút `bieu:` (`7502.20`, `7505.12`, `7505.22`, `7506.20`, `7507.12`); gắn `cgpn:2#1` (`<= 6 mm`) trực tiếp vào `bieu:750810` và `TACH_ANH_EM` `phuDinh` cho `bieu:750890`.
- **Đối soát số + đơn vị & `ranh-gioi` (Luật 6):**
  - Tổng câu trúng số+đơn vị (Phần XV + Chương 75 pháp lý + dòng biểu): **6** (`phan:XV:cg:8:b#1` đã có trong `nguong/XV.jsonl`; **5/5** câu CGPN Chương 75 đã rút thành bản ghi; `nhom:7501`/`7502` ví dụ minh họa bỏ qua hợp lệ; 0 tệp `ranh-gioi/75*.json`).
- **Tuân thủ quy tắc QT:**
  - Không lấy thông số ví dụ, bảng mẫu hay ước lượng; trích đúng câu của chính nút; không gắn `gir:`, `wco:`, `tb:`; dùng bộ kiểm chung [`scripts/ho-so-ma/nguong-test.mjs`](../../../scripts/ho-so-ma/nguong-test.mjs) và [`scripts/ho-so-ma/cong.mjs`](../../../scripts/ho-so-ma/cong.mjs).
