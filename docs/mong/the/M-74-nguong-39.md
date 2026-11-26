# M-74 (#1966) — Ngưỡng số và phân dải anh em — Chương 39

- **Khuôn áp dụng:** `ho-so-ma@1` ([`docs/mong/khuon-ho-so-ma.md`](../khuon-ho-so-ma.md), [`docs/decisions/0006-ho-so-van-de-ma-8-so.md`](../../decisions/0006-ho-so-van-de-ma-8-so.md))
- **Kho dữ liệu (`RUT_TU_LUAT`, khai trong `data/lop-kho.json`):**
  - `data/ho-so-ma/nguong/39.jsonl`: **60 bản ghi `NGUONG`** từ Chú giải Chương/Phân nhóm (`cg:2:e#1` > 50% dung môi → `32.08`, `cg:3:a#1` < 60% thể tích cất, `cg:3:c#1` >= 5 đơn vị monome, `cg:4#1` < 95%, `cg:8#3` tỉ lệ `<= 1,5 lần`, `cg:9#1` rộng `>= 45 cm`, `cg:11:a#1` `> 300 lít`, `cgpn:1:a:1/2#1` `>= 95%`, `kq:105#1` `<= 1 kg` → `35.06`), SEN (`DẠNG HẠT` 39.02/03/04/07/12 `< 10%` lưới `1 mm` và `>= 90%` lưới `5 mm`, `PLASTIC CỨNG` 7 phân nhóm `> 100.000 psi`, `DẠNG TẤM VÀ PHIẾN` 39.20/39.21/3920.61.10 `> 0,25 mm`) và tên dòng biểu thuế `bieu:39*` (trọng lượng riêng `0,94`, Izod `80 J/m`, độ nhớt `78 ml/g`, áp suất bục `27,6 MPa`, chất hóa dẻo `6%`, alpha-olefin `5%`, chiều rộng/dài/dày).
  - Giữ nguyên **y hệt từng byte** `nguong/XVI.jsonl`, `nguong/84.jsonl` và `nguong/85.jsonl`.
  - Không chứa dữ liệu khách, tờ khai, `tb:`, `wco:`, `gir:`, hay thông số ví dụ tham khảo (`25–35%` trong `3902.90.10`, `1–25%` trong `3909.39.91`, `khoảng 30%` trong `3912.20.11`, bảng thử `3917.32.20`).
- **Kiểm phân dải anh em (`kiemDaiAnhEm` + `kiemDonViDaiLuong` + Cổng 3):**
  - **7/7 cụm anh em đều phủ kín `(-∞, +∞)`** (`3901101`, `3901109`, `3901` polyetylen `0,94`, `3903909` Izod `80 J/m`, `39076` độ nhớt `78 ml/g`, `3919` chiều rộng `20 cm`, `39204` chất hóa dẻo `6%`). **0 lỗi chồng dải, 0 lỗi hở dải, 0 lỗi `voi`, 0 lỗi đơn vị.**
- **Đối chiếu `data/ho-so/ranh-gioi/39*.json`:** **92/92 tệp** (**36 dòng `dieuKienSo`**) đều đã đối chiếu và có `NGUONG` tương ứng tại nút hoặc nút SEN/nhóm cha trực tiếp (`0` thiếu).
- **Công cụ & bài kiểm:**
  - [`scripts/ho-so-ma/nguong-rut.mjs`](../../../scripts/ho-so-ma/nguong-rut.mjs) (`--chuong 39 --tao|--kiem|--bao-cao`)
  - [`scripts/ho-so-ma/nguong-39-test.mjs`](../../../scripts/ho-so-ma/nguong-39-test.mjs) (đã đăng ký vào `scripts/danh-sach-test.txt`)
