# M-74 (#1966 / #1922) — Ngưỡng số và phân dải anh em — Chương 74

- **Khuôn áp dụng:** `ho-so-ma@1` ([`docs/mong/khuon-ho-so-ma.md`](../khuon-ho-so-ma.md), [`docs/decisions/0006-ho-so-van-de-ma-8-so.md`](../../decisions/0006-ho-so-van-de-ma-8-so.md))
- **Kho dữ liệu (`RUT_TU_LUAT`, theo `data/lop-kho.json` trên `main`):**
  - `data/ho-so-ma/nguong/74.jsonl`: **85 bản ghi** (**62 `NGUONG`**, **7 `DINH_NGHIA`**, **10 `TACH_ANH_EM`**, **6 `BO_QUA`**; tổng **13** bản ghi "Loại khác" / "… khác" gắn mảng `phuDinh`; **`0` mã dòng/nhóm HS trong `nguong.daiLuong`**).
- **Biến động rà ngược (trước → sau trên `74.jsonl`):**

| Chỉ tiêu | Trước (`main`) | Sau rà ngược | Chênh lệch / Ghi chú |
|---|---:|---:|---|
| Tổng bản ghi | 103 | **85** | +23 thêm mới · 46 sửa · -41 bỏ lặp · 16 giữ nguyên |
| `NGUONG` | 87 | **62** | Khử nhân bản đưa về đúng nút cha chung; bổ sung SEN `7410.11.10` (`<= 0,15 mm`) |
| `DINH_NGHIA` | 7 | **7** | Giữ đủ 6 thuật ngữ ở `chuong:74` + 1 thuật ngữ (`74.05`) ở `bieu:7405` (Luật 5) |
| `TACH_ANH_EM` | 9 | **10** | Bổ sung `bieu:74101190` (`phuDinh: ["bieu:74101110"]`) theo Luật 1 & 2 |
| `BO_QUA` | 0 | **6** | Ghi tường minh 6 câu mô tả thông thường (`nhom:7402/7403/7405`, `sen:74082910`) theo Luật 6 & 8 |
| Bản ghi mang `phuDinh` | 12 | **13** | `3 NGUONG` thuần 1 đại lượng (`7408.19`, `7408.11.90`, `7413.00.9`) + `10 TACH_ANH_EM` De Morgan |
| `daiLuong` chứa mã HS | 77 / 87 | **0 / 62** | **Sạch 100%** (regex `/(?:^\|[^\d])74(?:\.\d{2}\|\d{2})/` = `0`) |

- **Chuẩn hóa cấu trúc theo Luật 1–8 & làm sạch `daiLuong`:**
  - **Đưa ngưỡng định nghĩa vật liệu lên đúng nút cha chung (khử chồng dải giả giữa anh em, sạch mã HS):**
    - **Đồng tinh luyện** (`chuong:74:cg:1:a#1` `>= 99,85%`, `cg:1:a#2` `>= 97,5%` theo bảng tạp chất): rút gọn từ 26 bản ghi nhân bản trên 13 phân nhóm anh em về **16 bản ghi** trên đúng **8 nút cha chung** (`bieu:74031`, `bieu:740710`, `bieu:74081`, `bieu:74091`, `bieu:741011`, `bieu:741021`, `bieu:741110`, `bieu:741210`), dùng chung 2 chuỗi `daiLuong` sạch mã (`"hàm lượng đồng (đồng tinh luyện, nhánh nguyên chất)"` và `"hàm lượng đồng (đồng tinh luyện, nhánh bảng tạp chất)"`).
    - **Hợp kim đồng** (`chuong:74:cg:1:b:ii#1` `> 2,5%` tổng các nguyên tố khác): rút gọn từ 20 bản ghi nhân bản về **8 bản ghi** trên đúng **8 nút cha chung** (`bieu:74032`, `bieu:74072`, `bieu:74082`, `bieu:7409` nhánh hợp kim đồng cho `7409.2–7409.9`, `bieu:741012`, `bieu:741022`, `bieu:74112`, `bieu:741220`), dùng thống nhất `"tổng hàm lượng các nguyên tố khác (hợp kim đồng, nhánh tổng tạp chất)"`.
    - **Đồng thau** (`cgpn:1:a#4` Ni `< 5%`, `cgpn:1:a#6` Sn `< 3%`): đưa `7409.21`/`7409.29` lên cha chung `bieu:74092`, còn **12 bản ghi** trên 6 nút (`7403.21`, `7407.21`, `7408.21`, `7409.2`, `7411.21`, `7412.20.91`), `daiLuong`: `"hàm lượng niken (đồng thau)"` và `"hàm lượng thiếc (đồng thau)"`.
    - **Đồng thanh** (`cgpn:1:b#2` nhánh ngoại lệ kẽm > thiếc: Sn `>= 3%`, Zn `< 10%`): đưa `7409.31`/`7409.39` lên cha chung `bieu:74093`, còn **6 bản ghi** trên 3 nút (`7403.22`, `7408.29.10`, `7409.3`), tách rõ nhánh ngoại lệ theo Luật 3 với `duKien` nguyên văn.
    - **Bạc niken / Đồng-niken** (`cgpn:1:c#2` Ni `>= 5%`, `cgpn:1:d#1` Zn `<= 1%`): **6 bản ghi** trên 3 nút (`7408.22`, `7409.40`, `7411.22`), phân nhánh `HOẶC` theo Luật 3 (`"hàm lượng niken (nhánh bạc niken)"` và `"hàm lượng kẽm (nhánh đồng-niken)"`).
    - **Nhóm `74.05` & SEN:** gỡ sạch mã HS ở `bieu:7405` (`hàm lượng đồng (hợp kim đồng chủ)` `> 10%`; `hàm lượng phospho (đồng photphua)` `<= 15%`, chiều ở lại `74.05` theo Luật 4) và `bieu:74081910` (`<= 6 mm`); bổ sung `voi` hai chiều cho cặp `bieu:7409` ↔ `bieu:7410` (`chiều dày 0,15 mm`); bổ sung `NGUONG` SEN `bieu:74101110` (`tổng độ dày lớp đồng lá mỏng <= 0,15 mm`, `sen:74101110:1#1`).
  - **Phủ kín 100% `"Loại khác"` & phép thử De Morgan (Luật 1 & Luật 2):**
    - **`3 NGUONG` phần bù thuần 1 đại lượng:** `bieu:740819` (`<= 6 mm`, `phuDinh: ["bieu:740811"]`), `bieu:74081190` (`> 14 mm`, `phuDinh: ["bieu:74081120", "bieu:74081130"]`), `bieu:7413009` (`> 28,28 mm`, `phuDinh: ["bieu:7413001"]`).
    - **`10 TACH_ANH_EM` phần bù điều kiện ghép (không gắn khoảng số đảo):** `bieu:740329`, `bieu:740729`, `bieu:74081990`, `bieu:740829`, `bieu:74082990`, `bieu:740990`, `bieu:74101190` (mới), `bieu:741129`, `bieu:74122099`, `bieu:74198090`.
  - **Ghi `BO_QUA` cho câu mô tả thông thường (Luật 6 & Luật 8):** `6` bản ghi tại đúng nút chủ câu (`nhom:7402:ct:2#3`, `nhom:7402:ct:3#4`, `nhom:7403:ct:10#1`, `nhom:7405:ct:4#2`, `sen:74082910:1#2`, `sen:74082910:1#3`), không ghi thành `NGUONG`, không xóa im lặng.

- **Kiểm phân dải anh em (`kiemDaiAnhEm` + Cổng 3):**
  - **4/4 cụm anh em phủ kín `(-∞, +∞)`, `0` chồng dải, `0` hở dải, `0` lỗi đơn vị:**
    1. `bieu:74` (`chiều dày`, `mm`): `bieu:7410` (`<= 0,15`) · `bieu:7409` (`> 0,15`).
    2. `bieu:74081` (`kích thước mặt cắt ngang lớn nhất`, `mm`): `bieu:740819` (`<= 6`) · `bieu:740811` (`> 6`).
    3. `bieu:740811` (`kích thước mặt cắt ngang lớn nhất`, `mm`): `bieu:74081120` (`<= 8`) · `bieu:74081130` (`(8; 14]`) · `bieu:74081190` (`> 14`).
    4. `bieu:741300` (`đường kính`, `mm`): `bieu:7413001` (`<= 28,28`) · `bieu:7413009` (`> 28,28`).

- **Đối soát số + đơn vị & `ranh-gioi` (Luật 6):**

| Tầng nguồn quét | Tổng câu trúng số+đơn vị | Đã rút thành bản ghi | `BO_QUA` (mô tả thường) | Đã phủ ở tệp/mức khác (bỏ qua hợp lệ) |
|---|---:|---:|---:|---:|
| Phần XV (`phan:XV:cg*`) | 1 | 0 | 0 | 1 (`phan:XV:cg:8:b#1` đã có trong `nguong/XV.jsonl`) |
| Chú giải pháp lý Chương 74 (`chuong:74:cg*`, `cgpn*`) | 10 | **10** | 0 | 0 (`cg:1:a#1,#2`, `cg:1:b:ii#1`, `cg:1:c#1,#2`, `cgpn:1:a#4,#6`, `1:b#2`, `1:c#2`, `1:d#1`) |
| Dòng biểu Chương 74 (`bieu:74*`) | 7 | **7** | 0 | 0 (`7408.11`, `7408.11.20`, `7408.11.30`, `74.09`, `74.10`, `7413.00.1`, `7419.80.80`) |
| Chú giải bổ sung SEN (`sen:74*`) | 4 | **2** | **2** | 0 (`74081910`, `74101110` rút `NGUONG`; `74082910:1#2,#3` ghi `BO_QUA`) |
| Chú giải chi tiết nhóm (`nhom:74*`) | 15 | 0 | **4** | 11 (nhắc lại ngưỡng đã rút ở lớp `LUAT`: `nhom:7403/7405/7409/7410`; 4 câu mô tả thường `7402/7403/7405` ghi `BO_QUA`) |
| **Tổng cộng** | **37** | **19** | **6** | **12** (**0 câu bị bỏ sót**) |

- **Đối chiếu `data/ho-so/ranh-gioi/74*.json`:** Đọc chỉ-đọc `14/14` tệp `ranh-gioi/74*.json`; toàn bộ mã có `dieuKienSo` dạng số (`74081120`, `74081130`, `74081910`, `741300`, `74198080`) đều phủ `100%` tại đúng nút hoặc nút con (`0` thiếu dưới Cổng 4 `nguong-test.mjs`). Không chỉnh sửa `data/ho-so/ranh-gioi/`.
- **Tuân thủ quy tắc QT:**
  - Không lấy thông số ví dụ, bảng mẫu hay ước lượng; trích nguyên văn từ `data/luat-goc/`; không gắn `gir:`, `wco:`, `tb:`; `0` dữ liệu khách; dùng bộ kiểm chung [`scripts/ho-so-ma/nguong-test.mjs`](../../../scripts/ho-so-ma/nguong-test.mjs), [`scripts/ho-so-ma/nguong-rut.mjs`](../../../scripts/ho-so-ma/nguong-rut.mjs) và [`scripts/ho-so-ma/cong.mjs`](../../../scripts/ho-so-ma/cong.mjs).
