# [M-74] Ngưỡng số và phân dải anh em — Chương 23

## Tổng quan
- Chương **23** (Phế liệu và phế thải từ ngành công nghiệp thực phẩm; thức ăn gia súc đã chế biến).
- Tổng số bản ghi: **24** (**18** `NGUONG`, **2** `DINH_NGHIA`, **4** `TACH_ANH_EM`, **4** nút nhận `phuDinh`).
- Quy ước định danh: toàn bộ bản ghi dùng `id` dạng `hs:<nut>:74NN` (`7401`..`7406`), không trùng với bất kỳ tệp nào trong `data/ho-so-ma/**`.

## Đối soát rà soát số + đơn vị & `ranh-gioi` (Luật 1–7)
- **Thống kê quét số + đơn vị (Luật 6):** Quét toàn bộ Phần IV + Chương 23 (`phan:IV`, `chuong:23`, `bieu:23*`, `nhom:23*`, `pn:23*`, `sen:23*`) trúng **11** câu chứa số + đơn vị (kèm **1** câu Chú giải phân nhóm `chuong:23:cgpn:1#1` dẫn chiếu định nghĩa có ngưỡng tại `chuong:12:cgpn:1#1` của Chương 12):
  - **Đã rút thành bản ghi (5 câu trúng số + 1 câu dẫn chiếu):**
    1. `phan:IV:cg:1#1` (khái niệm `"viên"` liên kết bằng ép trực tiếp hoặc pha thêm chất kết dính `≤ 3%` tính theo khối lượng): giữ **1** `DINH_NGHIA` ở `chuong:23` và tách **8** `NGUONG` nhánh dạng viên (Luật 3, Luật 5, Luật 7) gắn vào các nhóm/phân nhóm có quy định dạng viên trong lời biểu thuế: `bieu:2301`, `bieu:2302`, `bieu:2303`, `bieu:2304`, `bieu:2305`, `bieu:2306`, `bieu:23066010` (kèm phần bù `TACH_ANH_EM` `phuDinh: ["bieu:23066010"]` tại `bieu:23066090`), `bieu:2308`.
    2. `bieu:23012010#1` (`Từ cá, có hàm lượng protein dưới 60% tính theo khối lượng`) ↔ `bieu:23012020#1` (`Từ cá, có hàm lượng protein từ 60% trở lên tính theo khối lượng`): **2** `NGUONG` phân dải kín (`< 60%` và `≥ 60%`), kèm phần bù `TACH_ANH_EM` `phuDinh: ["bieu:23012010", "bieu:23012020"]` tại anh em `"Loại khác"` `bieu:23012090` (Luật 1 & Luật 2: `.10`/`.20` ghép điều kiện `"Từ cá"` + hàm lượng protein nên `.90` nhận hàng từ động vật giáp xác, thân mềm hoặc thủy sinh không xương sống khác, cấm gắn khoảng số đảo).
    3. `sen:23040010:1#1` & `sen:23040010:1#2` (bột đậu tương đã được khử chất béo, thích hợp dùng làm thức ăn cho người): **6** `NGUONG` gắn `bieu:23040010` (độ ẩm `< 8%`, protein `≥ 50%`, chất béo `< 1%`, chất xơ `< 1%`, chỉ số hòa tan nitơ `≥ 70%`, tỷ lệ lọt qua sàng mắt sàng 100 `≥ 95%`), kèm phần bù `TACH_ANH_EM` `phuDinh: ["bieu:23040010"]` tại `bieu:23040090` (Luật 1 & Luật 2).
    4. `chuong:23:cgpn:1#1` (Chú giải phân nhóm 1 Chương 23 cho `2306.41` dẫn chiếu định nghĩa tại Chú giải phân nhóm 1 Chương 12): **1** `DINH_NGHIA` gắn `bieu:230641` cho thuật ngữ `"hạt cải dầu (rape seeds hoặc colza seeds) có hàm lượng axit eruxic thấp"` và tách **2** `NGUONG` gắn `bieu:230641` trên câu `chuong:23:cgpn:1#1` (axit eruxic trong dầu không bay hơi `< 2%` và glucosinolate trong thành phần rắn `< 30 micromol/g` — Luật 5 & Luật 7), kèm phần bù `TACH_ANH_EM` `phuDinh: ["bieu:230641"]` tại anh em `"Loại khác"` `bieu:230649` (Luật 1 & Luật 2).
  - **Bỏ qua hợp lệ (6 câu — Luật 6):**
    1. `chuong:23:kq:3#1` (`"Thuật ngữ trong Chương này 'viên' để chỉ... chất kết dính... với hàm lượng không quá 3% tính theo trọng lượng"`): chú giải tổng quát (`HUONG_DAN`) diễn giải lặp lại quy định pháp lý của Chú giải 1 Phần IV (`phan:IV:cg:1#1`, `LUAT` đã rút).
    2. `nhom:2309:ct:42#1` (`"(a) Viên được sản xuất từ một loại nguyên liệu... chất kết dính... với hàm lượng không quá 3% tính theo trọng lượng (các nhóm 07.14, 12.14, 23.01, …)"`): chú giải chi tiết nhóm `23.09` dẫn chiếu lặp lại ngưỡng viên `≤ 3%` của các nhóm nguyên liệu (`07.14`, `12.14`, `23.01`…).
    3. `nhom:2309:ct:7#1` (`"(thường trên 10% tính theo trọng lượng)"`): tỷ lệ mật/chất làm ngọt minh họa thông thường (`"thường"`), không phải ngưỡng pháp lý bắt buộc.
    4. `nhom:2309:ct:33#2` (`"hàm lượng chất kháng sinh thường là từ 8% đến 16%"`): con số mô tả thông thường (`"thường là"`), không phải ngưỡng phân loại bắt buộc.
    5. `nhom:2309:ct:51#1` (`"hàm lượng chất kháng sinh thường không quá 70% (nhóm 38.24)"`): con số mô tả thông thường (`"thường"`) cho sản phẩm trung gian thuộc nhóm `38.24`.
    6. `sen:23040021:1#2` (`"Sản phẩm thường chứa độ ẩm không quá 12%, protein không ít hơn 46%, chất béo dưới 1,5%, chất xơ không quá 7% và tro không quá 6,5%."`): câu SEN mô tả chỉ tiêu thông thường (`"thường chứa"`), không phải điều kiện phân loại bắt buộc (Luật 6 — cùng nguyên tắc bỏ qua số trong câu mô tả `"thường"`).

## Kết quả cổng kiểm tra
- `node scripts/ho-so-ma/khuon.mjs`: **PASS** (0 lỗi).
- `node scripts/ho-so-ma/cong.mjs --pham-vi "chuong:23" --cong 4,5`: **PASS** (Cổng 4 TRÍCH: 0 lỗi; Cổng 5 VÂN TAY: 0 lỗi).
- `node scripts/ho-so-ma/nguong-rut.mjs --chuong 23 --kiem`: **PASS** (Cổng 3 riêng NGUONG/voi: 0 lỗi; `kiemDaiAnhEm`: 1 cụm anh em phủ kín dải `bieu:230120`, 0 lỗi; `kiemDonViDaiLuong`: 0 lỗi).
- `git diff --name-only origin/main...HEAD | node scripts/kiem-pham-vi-the.mjs "[M-74] Ngưỡng số & phân dải anh em — Chương 23" "agy/m-74-c23"`: **PASS phạm vi M-74**.
