# M-74 — Ngưỡng số & phân dải anh em — Chương 04

## Tổng quan
- Tổng số bản ghi: **33** (**28** `NGUONG`, **2** `DINH_NGHIA`, **3** `TACH_ANH_EM`, **8** `phuDinh`).
- Phạm vi áp dụng: Chương 4 (Sữa, sản phẩm bơ sữa, trứng, mật ong, sản phẩm ăn được gốc động vật).

## Đối soát rà soát số + đơn vị & `ranh-gioi` (Luật 1–7)
- Toàn bộ **9/9** mã có điều kiện số trong `ranh-gioi/04*.json` (`0402.10.41/42`, `0402.10.91/92`, `0402.21.20/30`, `0402.29.20/30`, `0406.20.10`) cùng **4** phân dải hàm lượng chất béo `0401.10–0401.50` và các phần bù `Loại khác` (`04021049`, `04021099`, `04022190`, `04022990`, `04062090`) đã rút đầy đủ.
- Luật 1 & 2 (điều kiện ghép → `TACH_ANH_EM`):
  - `bieu:04029` mang `TACH_ANH_EM` (`phuDinh: ["bieu:040210", "bieu:04022"]`) do `0402.10` và `0402.2` ghép dạng rắn/bột + hàm lượng chất béo.
  - `bieu:040490` mang `TACH_ANH_EM` (`phuDinh: ["bieu:040410"]`) do `0404.10` mang hai ngưỡng loại trừ whey (`≤ 95%` lactoza khan, `≤ 80%` whey protein theo `cg:5:b, d`).
  - `bieu:040590` mang `TACH_ANH_EM` (`phuDinh: ["bieu:040510", "bieu:040520"]`) do `0405.10` (bơ: 80–95% béo, ≤ 2% chất khô không béo, ≤ 16% nước) và `0405.20` (chất phết: 39–<80% béo) định nghĩa đa chiều.
- Luật 4 & 5 & 7: `DINH_NGHIA` `bơ` và `chất phết từ bơ sữa` giữ tại `chuong:04`, các `NGUONG` gắn đúng nút `bieu:040510`, `bieu:040520`, `bieu:040410`, `bieu:040210/04022` (`nhom:0402:ct:2#1` tinh bột ≤ 5% trong sữa bột).
- Bỏ qua có căn cứ: `chuong:04:cg:4:a, b` (5% béo, 70–85% chất khô) chỉ áp dụng có điều kiện riêng cho sản phẩm **cô đặc whey pha sữa** để coi là pho mát `04.06`, không phải ngưỡng chung lọc `04.06` (nếu gắn lên `04.06` sẽ loại sai pho mát tươi `0406.10` theo Luật 4); `nhom:0405:ct:10#1` (`< 39%` loại khỏi `04.05`) đã là biên dưới của `0405.20` (`≥ 39%`).

## Kết quả cổng
- `khuon.mjs`: 0 lỗi; `cong.mjs` Cổng 3, 4, 5: 0 lỗi; `doiChieuRanhGoi`: 0 thiếu.
