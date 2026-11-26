# M-74 — Ngưỡng số & phân dải anh em — Chương 01

## Tổng quan
- Tổng số bản ghi: **8** (`NGUONG`: 8, `phuDinh`: 3).
- Phạm vi áp dụng: Chương 1 (Động vật sống).

## Đối soát rà soát số + đơn vị & `ranh-gioi` (Luật 1, 6)
- Tổng số câu trúng số + đơn vị: **7** câu (`bieu:010391#1`, `01039100#1`, `010392#1`, `01039200#1`, `01051#1`, `01059441#1`, `01059491#1`; chú giải Phần I & Chương 1: 0 ngưỡng số).
- Toàn bộ **2/2** mã có điều kiện số trong `ranh-gioi/01*.json` (`010594.json`: `01059441`, `01059491` `≤ 2 kg`) đã rút thành `NGUONG`.
- Đã bổ sung đủ phần bù `NGUONG` + `phuDinh` cho 3 phân nhóm `Loại khác` thuần khối lượng (`01059`, `01059449`, `01059499`) và cặp đối xứng `010391` (`< 50 kg`) / `010392` (`≥ 50 kg`).
- Bỏ qua hợp lệ: 2 dòng 8 số lặp nguyên văn cha 6 số (`01039100`, `01039200`).

## Kết quả cổng
- `khuon.mjs`: 0 lỗi; `cong.mjs` Cổng 3, 4, 5: 0 lỗi; `doiChieuRanhGoi`: 0 thiếu.
