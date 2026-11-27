# M-74 (#1966) — Ngưỡng số và phân dải anh em — Chương 85

- **Khuôn áp dụng:** `ho-so-ma@1` ([`docs/mong/khuon-ho-so-ma.md`](../khuon-ho-so-ma.md), [`docs/decisions/0006-ho-so-van-de-ma-8-so.md`](../../decisions/0006-ho-so-van-de-ma-8-so.md))
- **Kho dữ liệu (`RUT_TU_LUAT`, khai trong `data/lop-kho.json`):**
  - `data/ho-so-ma/nguong/85.jsonl`: **273 bản ghi `NGUONG`** từ Chú giải Chương/Phân nhóm (`chuong:85:cg:4:b#1` nhóm 85.09 `<= 20 kg`, `chuong:85:cgpn:1#2..4` camera tốc độ cao 8525.81, `chuong:85:cgpn:4#1` radio cát sét bỏ túi 8527.12 `170 x 100 x 45 mm`) và tên dòng biểu thuế `bieu:85*`.
  - Phần XVI (`data/ho-so-ma/nguong/XVI.jsonl`) giữ nguyên từ Chương 84 (**y hệt từng byte**), không sinh bản ghi thừa hay trùng lặp.
  - Không chứa dữ liệu khách, tờ khai, `tb:`, `wco:`, `gir:`, hay thông số ví dụ tham khảo.
- **Đơn vị & quy đổi trục anh em bổ sung cho Chương 85:**
  - Mở rộng bộ tách đơn vị điện/tần số/dung lượng: `kvar`, `kVA`, `VA`, `kV`, `VDC`/`VAC` → `V`, `mA`/`A`, `GHz`/`MHz`/`kHz`/`Hz`, `Ah`/`mAh`, `inch`, cùng số đường tín hiệu (`85184040`) và số sợi cáp dẹt (`85444291`/`92`).
  - Quy đổi thống nhất trong cùng cụm anh em pha trộn `W` ↔ `kW` (nhóm `8501`) và hỗ trợ cận trên loại trừ `"nhưng dưới"` (`<` cho `[66; 110) kV`, `(1; 66) kV`, `(1,5; 16) A`).
  - Mở rộng `kiemDonViDaiLuong()` kiểm bắt chéo `điện áp ↔ V/kV`, `dòng điện ↔ A/mA`, `tần số ↔ Hz..GHz`, `dung lượng phóng điện ↔ Ah/mAh`, `công suất phản kháng ↔ kvar`, `sức chứa túi/hộp chứa bụi ↔ lít` (tách khỏi `sức chứa vải khô` dùng `kg`), `một chiều` chiều dài giấy chỉ áp dụng khi đơn vị là `mm/cm/m` (giữ `850120` là `công suất`).
- **Kiểm phân dải anh em (`kiemDaiAnhEm` + Cổng 3):**
  - Tổng **82 cụm anh em**: **72 cụm phủ kín `(-∞, +∞)`**, **10 cụm hữu hạn đúng cấu trúc biểu** (`850132`, `850152`, `850162`, `850212`, `8504219`, `853929`, `854442`, `8544429`, `854460`, và `853530` đã bù kín khoảng giữa `(40; 66) kV` vào `bieu:85353090` *"Loại khác"* với `phuDinh: bieu:8535301, bieu:85353020` dưới nhóm 85.35 `> 1 kV`). **0 lỗi chồng dải, 0 lỗi hở dải, 0 lỗi `voi`, 0 lỗi đơn vị.**
- **Đối chiếu `data/ho-so/ranh-gioi/85*.json`:** **163/163 tệp** (**155 dòng `dieuKienSo`**) đều đã đối chiếu và có `NGUONG` tương ứng tại nút hoặc nút con trực tiếp (`0` thiếu).
- **Công cụ & bài kiểm:**
  - [`scripts/ho-so-ma/nguong-rut.mjs`](../../../scripts/ho-so-ma/nguong-rut.mjs) (`--chuong 85 --tao|--kiem|--bao-cao`)
  - [`scripts/ho-so-ma/nguong-85-test.mjs`](../../../scripts/ho-so-ma/nguong-85-test.mjs) (đã đăng ký vào `scripts/danh-sach-test.txt`)
