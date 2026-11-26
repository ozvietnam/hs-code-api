# M-74 (#1966) — Ngưỡng số và phân dải anh em — Chương 84 (+ Phần XVI)

- **Khuôn áp dụng:** `ho-so-ma@1` ([`docs/mong/khuon-ho-so-ma.md`](../khuon-ho-so-ma.md), [`docs/decisions/0006-ho-so-van-de-ma-8-so.md`](../../decisions/0006-ho-so-van-de-ma-8-so.md))
- **Kho dữ liệu (`RUT_TU_LUAT`, khai trong `data/lop-kho.json`):**
  - `data/ho-so-ma/nguong/XVI.jsonl`: **2 bản ghi `NGUONG`** ở `phan:XVI` (`phan:XVI:kq:41#1` dung sai bi thép 84.82: `<= 1%` và `<= 0,05 mm`).
  - `data/ho-so-ma/nguong/84.jsonl`: **315 bản ghi `NGUONG`** từ Chú giải Chương/Phân nhóm (`7`, `9`, `pn:4`), Phân nhóm/Nhóm/SEN và tên dòng biểu thuế `bieu:84*`.
  - **Tổng: 317 bản ghi**, không chứa dữ liệu khách, tờ khai, `tb:`, `wco:`, `gir:`, hay thông số ví dụ/bảng mẫu tham khảo.
- **Áp dụng đầy đủ 3 quy ước QT chốt sau Chương 76:**
  1. **Không lấy thông số ví dụ / bảng mẫu tham khảo:** lọc bằng `laCauViDuHoacBangMau()` (loại các dải minh họa trong Chú giải như `nhom:8424` 3.000–4.000 bar, `nhom:8448` khoảng 0,1–2 mm, `nhom:8455` xấp xỉ 30–520 cm, `pn:842211` bảng kích thước đặt sàn, `pn:842441` ví dụ 3 bar/5 lít, `sen:84145930` ví dụ 0,5 m³/s).
  2. **Bảng thành phần hợp kim:** Chương 84 không có bảng thành phần mác hợp kim kiểu `5182/5082`.
  3. **Dòng *"Loại khác"* phủ định anh em:** có **55 bản ghi *"Loại khác"*** là phần bù 1 khoảng duy nhất (bao gồm ca lấp khoảng giữa `(18,65; 100] kW` ở `bieu:8408909` giữa `.9010 <= 18,65` và `.905 > 100`, cùng đồng thời `<= 21,10 kW` và `< 220 cc` ở `bieu:84143090`) được gắn `voi` + đánh dấu `phuDinh: bieu:...` ở đầu `ghiChu`.
- **Kiểm phân dải anh em (`kiemDaiAnhEm` + Cổng 3):**
  - Tổng **86 cụm anh em**: **80 cụm phủ kín `(-∞, +∞)`**, **6 cụm hữu hạn đúng cấu trúc biểu** (`840732` thừa hưởng `50..250 cc`; `841350/841360/841370` chia bơm nước `<= 8.000` / `8.000–13.000` còn *"Loại khác"* gồm cả bơm khác; `8415819` chia thêm lưu lượng `> 67,96 m³/phút`; `848180:td6` van plastic `< 1` / `1–2,5 cm` cạnh van vật liệu khác). **0 lỗi chồng dải, 0 lỗi hở dải, 0 lỗi `voi`.**
- **Đối chiếu `data/ho-so/ranh-gioi/84*.json`:** **258/258 tệp** (**170 dòng `dieuKienSo`**) đều đã đối chiếu và có `NGUONG` tương ứng tại nút hoặc nút con trực tiếp.
- **Công cụ & bài kiểm:**
  - [`scripts/ho-so-ma/nguong-rut.mjs`](../../../scripts/ho-so-ma/nguong-rut.mjs) (`--chuong 84 --tao|--kiem|--bao-cao`)
  - [`scripts/ho-so-ma/nguong-84-test.mjs`](../../../scripts/ho-so-ma/nguong-84-test.mjs) (đã đăng ký vào `scripts/danh-sach-test.txt`)
