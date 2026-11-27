# M-74 (#1966) — Ngưỡng số và phân dải anh em — Chương 80

- **Khuôn áp dụng:** `ho-so-ma@1` ([`docs/mong/khuon-ho-so-ma.md`](../khuon-ho-so-ma.md), [`docs/decisions/0006-ho-so-van-de-ma-8-so.md`](../../decisions/0006-ho-so-van-de-ma-8-so.md))
- **Kho dữ liệu (`RUT_TU_LUAT`, theo `data/lop-kho.json` trên `main`):**
  - `data/ho-so-ma/nguong/80.jsonl`: **11 bản ghi** (**8 `NGUONG`**, **2 `DINH_NGHIA`**, **1 `TACH_ANH_EM`** gắn `phuDinh`, **0 `BO_QUA`**; số bản ghi mang `phuDinh`: **1**).
  - **Biến động so với bản nền `origin/main` (`7` → `11` bản ghi):** **+4 thêm**, **4 sửa**, **0 bỏ**, **3 giữ nguyên**.
    - Giữ nguyên 2 `DINH_NGHIA` tại `chuong:80` (`hs:chuong:80:7401` `"Thiếc, không hợp kim"`, `hs:chuong:80:7402` `"Hợp kim thiếc"`) và 1 `TACH_ANH_EM` De Morgan tại `bieu:8007009` (`hs:bieu:8007009:7401`, `phuDinh: ["bieu:80070020", "bieu:80070030", "bieu:80070040"]`).
    - Làm sạch **100% mã HS trong `daiLuong`** (`2` → **`0`** bản ghi chứa mã HS trong `daiLuong`): bỏ mã `8001.10` / `8001.20` khỏi `hs:bieu:800110:7401` (`"hàm lượng thiếc"`) và `hs:bieu:800120:7401` (`"tổng hàm lượng các nguyên tố khác"`).
    - Bổ sung đủ 4 bản ghi `NGUONG` cho giới hạn bảng tạp chất **Bi (`0,1%`)** và **Cu (`0,4%`)** của Chú giải phân nhóm 1(a) & 1(b)(ii) (Luật 3, 4, 5, 7):
      - `hs:bieu:800110:7402` (`hàm lượng bismut (Bi)` `< 0,1%`) và `hs:bieu:800120:7402` (`nhánh bismut`, `hàm lượng bismut (Bi)` `>= 0,1%`);
      - `hs:bieu:800110:7403` (`hàm lượng đồng (Cu)` `< 0,4%`) và `hs:bieu:800120:7403` (`nhánh đồng`, `hàm lượng đồng (Cu)` `>= 0,4%`).
    - Chuẩn hóa Luật 3 trên `hs:bieu:80070030:7401`: nêu rõ ngưỡng chiều dày `<= 0,2 mm` (trừ phần bồi) **chỉ áp cho nhánh `"Lá mỏng"`**, không áp cho nhánh sau dấu `;` (`"dạng bột và vảy"`), đồng bộ `daiLuong: "chiều dày"` với `hs:bieu:80070020:7401` (`> 0,2 mm`).
- **Cụm phân dải anh em (`kiemDaiAnhEm`):** **3 cụm anh em**, **3/3 phủ kín**, **0 chồng**, **0 hở**:
  1. `bieu:8001` — `hàm lượng bismut (Bi)` (`%`): `bieu:800110` `(-∞; 0,1)` + `bieu:800120` `[0,1; +∞)` (phủ kín).
  2. `bieu:8001` — `hàm lượng đồng (Cu)` (`%`): `bieu:800110` `(-∞; 0,4)` + `bieu:800120` `[0,4; +∞)` (phủ kín).
  3. `bieu:800700` — `chiều dày` (`mm`): `bieu:80070030` `(-∞; 0,2]` (nhánh lá mỏng) + `bieu:80070020` `(0,2; +∞)` (phủ kín), kèm phần bù De Morgan `TACH_ANH_EM` `phuDinh` tại `bieu:8007009`.
- **Đối soát số + đơn vị & `ranh-gioi` (Luật 6 & 8):**
  - Tổng câu trúng số + đơn vị (Chú giải pháp lý Phần XV + Chương 80 + toàn bộ dòng biểu `bieu:80*` + `chuong:80:kq*` + `nhom:80*` + `sen:80*`): **5 câu** (**1** câu Phần XV `phan:XV:cg:8:b#1` đã xử lý tại `nguong/XV.jsonl`; **4/4** câu Chương 80 gồm `chuong:80:cgpn:1:a#1`, `chuong:80:cgpn:1:b:i#1`, `bieu:80070020#1`, `bieu:80070030#1` đều đã rút thành bản ghi `NGUONG`/`DINH_NGHIA`, kèm `chuong:80:cgpn:1:b:ii#1` dẫn chiếu bảng Bi/Cu; **0** câu mô tả tính chất thông thường chứa số+đơn vị trong `kq`/`nhom`/`sen` cần `BO_QUA`).
  - Đối chiếu chỉ-đọc `data/ho-so/ranh-gioi/80*.json`: có **2 tệp** (`800300.json` không có điều kiện số; `800700.json` có ngưỡng độ dày `0,2 mm` ở `80070020` và `80070030`), phủ **100%** (**0 thiếu**).
- **Tuân thủ quy tắc QT:**
  - Không lấy thông số ví dụ, bảng mẫu hay ước lượng; trích nguyên văn từ câu nguồn; `0` mã HS trong `daiLuong`; không gắn `gir:`, `wco:`, `tb:`; `0` trùng `id` toàn kho (`hs:<nut>:74NN`); dùng bộ kiểm chung [`scripts/ho-so-ma/nguong-test.mjs`](../../../scripts/ho-so-ma/nguong-test.mjs), [`scripts/ho-so-ma/nguong-rut.mjs`](../../../scripts/ho-so-ma/nguong-rut.mjs) và [`scripts/ho-so-ma/cong.mjs`](../../../scripts/ho-so-ma/cong.mjs).
