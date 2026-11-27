# M-74 (#1966) — Ngưỡng số và phân dải anh em — Chương 74

- **Khuôn áp dụng:** `ho-so-ma@1` ([`docs/mong/khuon-ho-so-ma.md`](../khuon-ho-so-ma.md), [`docs/decisions/0006-ho-so-van-de-ma-8-so.md`](../../decisions/0006-ho-so-van-de-ma-8-so.md))
- **Kho dữ liệu (`RUT_TU_LUAT`, theo `data/lop-kho.json` trên `main`):**
  - `data/ho-so-ma/nguong/74.jsonl`: **103 bản ghi** (**87 `NGUONG`**, **7 `DINH_NGHIA`**, **9 `TACH_ANH_EM`**, **12** bản ghi "Loại khác" gắn mảng `phuDinh`).
  - Áp dụng Luật 5 + Luật 7: giữ 6 `DINH_NGHIA` thuật ngữ vật liệu ở `chuong:74` và 1 `DINH_NGHIA` (`74.05`) ở `bieu:7405`; chuyển toàn bộ `NGUONG` của đồng tinh luyện (13 phân nhóm: `7403.11–7403.19`, `7407.10`, `7408.11`, `7408.19`, `7409.11`, `7409.19`, `7410.11`, `7410.21`, `7411.10`, `7412.10`), hợp kim đồng (20 phân nhóm), đồng thau (7 nút), đồng thanh (4 nút), bạc niken/đồng-niken (3 nút: `7408.22`, `7409.40`, `7411.22`) về đúng từng nút `bieu:` dùng thuật ngữ đó.
  - Áp dụng Luật 1 + Luật 2: bổ sung 9 `TACH_ANH_EM` không khoảng số gắn `voi`+`phuDinh` cho toàn bộ dòng "Loại khác" có anh em mang `NGUONG` hoặc điều kiện ghép (`7403.29`, `7407.29`, `7408.19.90`, `7408.29`, `7408.29.90`, `7409.90`, `7411.29`, `7412.20.99`, `7419.80.90`).
- **Đối soát số + đơn vị & `ranh-gioi` (Luật 6):**
  - Tổng câu trúng số+đơn vị (Phần XV + Chương 74 pháp lý + dòng biểu): **17** câu (`phan:XV:cg:8:b#1` đã có trong `nguong/XV.jsonl`; **16/16** câu Chương 74 gồm 7 dòng biểu + 9 câu Chú giải 1 / CGPN 1 đã rút thành bản ghi; câu `sen:74081910:1#2` `<= 6 mm` đã rút, `nhom:7402/7403/7405` mang cụm minh họa `"thường ở khoảng"` / `"thông thường"` và `sen:74082910:1#2..3` `"dao động"` bỏ qua hợp lệ; `ranh-gioi/740819.json` & `741300.json` phủ 100%).
- **Tuân thủ quy tắc QT:**
  - Không lấy thông số ví dụ, bảng mẫu hay ước lượng; trích đúng câu của chính nút; không gắn `gir:`, `wco:`, `tb:`; dùng bộ kiểm chung [`scripts/ho-so-ma/nguong-test.mjs`](../../../scripts/ho-so-ma/nguong-test.mjs) và [`scripts/ho-so-ma/cong.mjs`](../../../scripts/ho-so-ma/cong.mjs).
