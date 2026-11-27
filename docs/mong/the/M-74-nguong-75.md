# M-74 (#1966) — Rà ngược ngưỡng số và phân dải anh em — Chương 75

- **Khuôn áp dụng:** `ho-so-ma@1` ([`docs/mong/khuon-ho-so-ma.md`](../khuon-ho-so-ma.md), [`docs/decisions/0006-ho-so-van-de-ma-8-so.md`](../../decisions/0006-ho-so-van-de-ma-8-so.md))
- **Kho dữ liệu (`RUT_TU_LUAT`, khai trong `data/lop-kho.json`):**
  - `data/ho-so-ma/nguong/75.jsonl`: **15 bản ghi** (**`9 NGUONG`**, **`2 DINH_NGHIA`**, **`1 TACH_ANH_EM`**, **`3 BO_QUA`**; **`1`** bản ghi `"Loại khác"` mang mảng `phuDinh`).
  - **Biến động so với nền `origin/main` (`24` bản ghi):** **`+11`** thêm mới, **`4`** sửa (`hs:chuong:75:7401`, `hs:chuong:75:7402`, `hs:bieu:750810:7401`, `hs:bieu:750890:7401`), **`20`** gỡ (20 bản ghi `NGUONG` nhân bản mã phân nhóm trên 5 cặp `7502.10/20`, `7505.11/12`, `7505.21/22`, `7506.10/20`, `7507.11/12`).

| Chỉ tiêu | Nền `origin/main` | Sau rà ngược | Biến động |
|---|---:|---:|---|
| Tổng bản ghi | 24 | 15 | `+11` thêm / `4` sửa / `20` gỡ |
| `NGUONG` | 21 | 9 | Quy gọn CGPN 1(a)/(b) lên `chuong:75`, thêm bảng Fe/O/khác & nhánh `75.01` |
| `DINH_NGHIA` | 2 | 2 | Cập nhật đủ chi tiết bảng 1(a) & 3 nhánh `HOẶC` của 1(b) |
| `TACH_ANH_EM` (`phuDinh`) | 1 (1) | 1 (1) | Giữ phần bù De Morgan cho `bieu:750890` (phủ định `bieu:750810`) |
| `BO_QUA` | 0 | 3 | Ghi tường minh 3 câu mô tả thông thường tại đúng nút chủ câu (Luật 6 & 8) |
| `NGUONG` chứa mã HS trong `daiLuong` | 21/21 | **0/9** | **Sạch 100% mã HS** (`/(?:^\|[^\d])75(?:\.\d{2}\|\d{2})/` = `0`) |

- **Các điểm chuẩn hoá theo Luật 1–8 (`ho-so-nguong`):**
  - **Sạch 100% mã HS trong `daiLuong` & quy gọn CGPN 1(a)/(b) về `chuong:75` (Luật 3, 5, 7):**
    - CGPN 1 Chương 75 mở đầu *"1. Trong Chương này, các khái niệm sau có nghĩa:"* — phạm vi chung toàn Chương 75 (tương đồng Ch.76 và Ch.72 `#2444`). Chuyển toàn bộ định nghĩa và ngưỡng của `"Niken không hợp kim"` (CGPN 1(a)) và `"Hợp kim niken"` (CGPN 1(b)) từ 20 bản ghi nhân bản mang mã HS trong `daiLuong` về đúng 1 bộ tại `chuong:75`, bỏ hoàn toàn mọi mã `75xx`/`75.xx` khỏi `daiLuong`.
    - **Bổ sung 3 ngưỡng bảng giới hạn pháp lý bị sót trên `main` (`chuong:75:cgpn:1:a:ket#1`):** tách đầy đủ `Fe <= 0,5%`, `O <= 0,4%`, và `mỗi nguyên tố khác <= 0,3%` cho nhánh `"Niken không hợp kim"`, song song với `Ni + Co >= 99%` (`cgpn:1:a#1`) và `Co <= 1,5%` (`cgpn:1:a:i#1`).
    - **Tách rõ nhánh `HOẶC` cho `"Hợp kim niken"` (Luật 3):** giữ `Co > 1,5%` (nhánh `1(b)(i)`) và `tổng các nguyên tố khác trừ Ni và Co > 1%` (nhánh `1(b)(iii)`) với tên nhánh rõ ràng, tránh hiểu nhầm thành phân dải đơn trục giữa 5 cặp phân nhóm anh em (`7502.10/20`, `7505.11/12`, `7505.21/22`, `7506.10/20`, `7507.11/12`) vì hợp kim niken có thể có `Co <= 1,5%` nhưng vượt giới hạn bảng hoặc tổng nguyên tố khác `> 1%`.
  - **Nhóm `75.01` (`nhom:7501:ct:9#1`, Luật 3 & 4):** Bổ sung `NGUONG` tại `bieu:7501` (`>= 0,5%` lưu huỳnh, nhánh `fero-niken không tinh khiết`, miền ở lại `75.01`; fero-niken đã tinh luyện sang nhóm `72.02` nên ranh giới này không tạo phần bù `phuDinh` với nhóm `75.08`).
  - **Nhóm `75.08` (`chuong:75:cgpn:2#1`, Luật 1, 2, 7):** Giữ `NGUONG` `<= 6 mm` gắn trực tiếp vào `bieu:750810` (`daiLuong: "kích thước mặt cắt ngang dây niken"`, đã bỏ mã `7508.10`) và phần bù `TACH_ANH_EM` gắn `voi: ["bieu:750810"]` + `phuDinh: ["bieu:750810"]` cho `bieu:750890` (`- Loại khác:`) theo luật De Morgan (điều kiện ghép: tấm đan/phên/lưới + dây `<= 6 mm`; hàng không phải tấm đan/phên/lưới dù `<= 6 mm` như bu lông, đai ốc, a-nốt mạ điện vẫn thuộc `7508.90`, cấm gắn khoảng số đảo `> 6 mm`).
  - **Con số mô tả thông thường (Luật 6 & 8):** Ghi đủ **3 bản ghi `BO_QUA`** tại đúng nút chủ câu cho `chuong:75:kq:3#1` (`1453°C`), `nhom:7501:ct:8#1` (`50 mm`), và `nhom:7502:ct:4#2` (`96 x71 x 1,25cm` / `30,5cm`).
  - Mọi `id` theo khuôn `hs:<nut>:74NN`, `0` trùng lặp toàn kho `data/ho-so-ma/` (kể cả `liet-ke/75.jsonl`); `0` `tb:`, `wco:`, `gir:` và `0` dữ liệu khách hàng.
- **Đối soát câu chứa chữ số + đơn vị theo Luật 6:**
  - Pháp lý Phần XV (`phan:XV:cg*`): **1/1** câu (`phan:XV:cg:8:b#1`) đã phủ trong `data/ho-so-ma/nguong/XV.jsonl` (không chạm `XV.jsonl`).
  - Pháp lý Chương 75 (`chuong:75:cg*`, `cgpn*`): **5/5** câu trúng số+đơn vị (`cgpn:1:a#1`, `cgpn:1:a:i#1`, `cgpn:1:b:i#1`, `cgpn:1:b:iii#1`, `cgpn:2#1`) + **1/1** bảng giới hạn pháp lý (`cgpn:1:a:ket#1`: `Fe 0.5`, `O 0.4`, `Other elements, each 0.3` theo `% by weight`) = **6/6** đã rút đủ thành bản ghi (`0` bỏ sót).
  - Chú giải tổng quát Chương 75 (`chuong:75:kq*`): **1/1** câu trúng số+đơn vị (`chuong:75:kq:3#1`, `"nóng chảy ở 1453°C"`) → đã ghi **`BO_QUA`** hợp lệ (`hs:chuong:75:7410`).
  - Dòng biểu thuế (`bieu:75*`): **0/48** dòng chứa số+đơn vị.
  - Chú giải chi tiết nhóm (`nhom:75*`): **3/3** câu trúng số+đơn vị đã xử lý đủ (**1 `NGUONG`** tại `bieu:7501` cho `nhom:7501:ct:9#1`; **2 `BO_QUA`** cho câu mô tả thông thường `nhom:7501:ct:8#1` và `nhom:7502:ct:4#2`).
  - `pn:75*` & `sen:75*`: **0** câu.
  - **Tổng Chương 75:** **9/9** câu trúng regex số+đơn vị + **1** bảng pháp lý `cgpn:1:a:ket#1` = **10/10** đã xử lý (**7** rút thành `NGUONG`/`DINH_NGHIA`, **3** ghi `BO_QUA`, **0** bỏ sót).
- **Đối chiếu `data/ho-so/ranh-gioi/75*.json` (chỉ-đọc):**
  - Có **1 tệp** (`data/ho-so/ranh-gioi/750890.json`: `75089030`, `75089050`, `75089090`), chứa **0** điều kiện số (`dieuKienSo` chỉ có `op: "TEN_LOAI"`), khớp 100% Cổng 4 `nguong-test.mjs`; không sửa `data/ho-so/ranh-gioi/`.
- **Kiểm phân dải anh em (`kiemDaiAnhEm` + `kiemDonViDaiLuong` + Cổng 3):**
  - **0** cụm anh em nhiều khoảng số cùng đại lượng (`bieu:750810`/`750890` tách bằng `NGUONG` + `TACH_ANH_EM` De Morgan `phuDinh`; CGPN 1(a)/(b) nằm tại `chuong:75`), **`0`** lỗi chồng dải, **`0`** lỗi hở dải, **`0`** lỗi `voi`/`phuDinh`, **`0`** lỗi đơn vị khớp đại lượng, **`0/9`** `NGUONG` mang mã HS trong `daiLuong`.
- **Công cụ & bài kiểm:**
  - [`scripts/ho-so-ma/cong.mjs`](../../../scripts/ho-so-ma/cong.mjs) (`--pham-vi chuong:75 --cong 4,5`), [`scripts/ho-so-ma/nguong-rut.mjs`](../../../scripts/ho-so-ma/nguong-rut.mjs) (`--chuong 75 --kiem`)
  - [`scripts/ho-so-ma/nguong-test.mjs`](../../../scripts/ho-so-ma/nguong-test.mjs), [`scripts/test-ho-so-ma.mjs`](../../../scripts/test-ho-so-ma.mjs), [`scripts/test-ho-so-ma-tra.mjs`](../../../scripts/test-ho-so-ma-tra.mjs), [`scripts/test-lop-kho.mjs`](../../../scripts/test-lop-kho.mjs)
