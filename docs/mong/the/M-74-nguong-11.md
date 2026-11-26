# M-74 — Ngưỡng số & phân dải anh em — Chương 11

## Tổng quan
- Tổng số bản ghi: **83** (**77** `NGUONG`, **1** `DINH_NGHIA`, **5** `TACH_ANH_EM`, **5** nút nhận `phuDinh`).
- Phạm vi áp dụng: Chương 11 (Sản phẩm xay xát; malt; tinh bột; inulin; gluten lúa mì).

## Đối soát rà soát số + đơn vị & `ranh-gioi` (Luật 1–7)
- Luật 5 & 7 (Chú giải 2(A) & 2(B) Chương 11):
  - **Nhóm 11.01 & 11.02** (áp dụng cả 2(A) tinh bột/tro và 2(B) lọt sàng 315/500 micron): `bieu:1101` (lúa mì/meslin: >45%, ≤2,5%, 315µm ≥80%), `bieu:1101001` (gluten bổ sung ≤10%), `bieu:110220` (ngô: >45%, ≤2%, 500µm ≥90%), `bieu:11029010` (gạo: >45%, ≤1,6%, 315µm ≥80%), `bieu:11029020` (lúa mạch đen: >45%, ≤2,5%, 315µm ≥80%), và `bieu:11029090` tách nhánh theo 4 loại ngũ cốc (`nhánh lúa đại mạch`, `nhánh yến mạch`, `nhánh lúa miến`, `nhánh kiều mạch`).
  - **Nhóm 11.03** (áp dụng 2(A) tinh bột >45% & tro theo loại + Chú giải 3 sàng 2mm/1,25mm ≥95% + Chú giải 1 Phần II dạng viên ≤3%): `bieu:110311` (lúa mì), `bieu:110313` (ngô), `bieu:110319` (sàng 1,25mm), `bieu:11031910` (meslin), `bieu:11031920` (gạo), `bieu:11031990` (5 nhánh ngũ cốc còn lại), `bieu:110320` (dạng viên).
  - **Nhóm 11.04** (áp dụng 2(A) tinh bột >45% & tro theo loại, không gắn 2(B)): `bieu:110412` (yến mạch), `bieu:11041910` (ngô), `bieu:11041990` (5 nhánh còn lại), `bieu:110422` (yến mạch), `bieu:110423` (ngô), `bieu:11042920` (2 nhánh lúa đại mạch / lúa mạch đen), `bieu:11042990` (4 nhánh còn lại). Riêng **`1104.30` (mầm ngũ cốc)** không gắn ngưỡng theo Chú giải 2(A) câu cuối (`"luôn luôn được phân loại vào nhóm 11.04"`).
- Luật 1 & 2 (`TACH_ANH_EM`): `bieu:110290` (`phuDinh: ["bieu:110220"]`), `bieu:11029090` (`phuDinh: ["bieu:11029010", "bieu:11029020"]`), `bieu:11031990` (`phuDinh: ["bieu:11031910", "bieu:11031920"]`), `bieu:11041990` (`phuDinh: ["bieu:11041910"]`), `bieu:11042990` (`phuDinh: ["bieu:11042920"]`).
- Không tạo `NGUONG` riêng cho cỡ mắt sàng (`315 micron`, `500 micron`, `2 mm`, `1,25 mm`) mà gộp vào `daiLuong` kèm đơn vị `%`.
- Bỏ qua có căn cứ: `1101:ct:5#1`/`1102:ct:6#1` (cả hai vế cacao đều loại khỏi Chương 11 sang 18.06/19.01), `1103:ct:7#1` (lặp lại `phan:II:cg:1#1`), `1108:ct:2#4` (nhiệt độ hồ hoá 60°C), `1109:ct:2#1` (85–95% mô tả thành phần tự nhiên).

## Kết quả cổng
- `khuon.mjs`: 0 lỗi; `cong.mjs` Cổng 3, 4, 5: 0 lỗi.
