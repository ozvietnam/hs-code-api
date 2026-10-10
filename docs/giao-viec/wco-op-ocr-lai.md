# Yêu cầu OCR lại — ý kiến WCO đang bị loại khỏi API (#196)

> Sinh tự động bởi `scripts/wco-op-ocr-request.mjs` — không có chữ nội dung của WCO. Tình trạng: **129/1038** ý kiến bị loại, gom thành **57 cụm**.

## Vì sao

Biển tiêu đề mã (chữ trắng nền xanh, ví dụ `4409.10 to 4409.29` hoặc `8471.30`) thường bị OCR làm rơi, nên ý kiến đứng ngay sau biển bị xếp nhầm vào mã trước đó. Cách kiểm: số thứ tự IN ở đầu mỗi ý kiến là số chính thức; khi nó nhỏ hơn thứ tự ta gán (đánh số bắt đầu lại) hoặc lớn hơn (thiếu ý kiến phía trước) thì mã/thứ tự không đáng tin và ý kiến đó **không được trả ra API**. Tránh sai: trích nhầm mã tệ hơn không trích.

## Cần anh làm gì

Với mỗi cụm trong bảng dưới, tìm trong PDF gốc **từ cuối ý kiến của mã "trước" đến đầu mã "sau"** (thường 1–3 trang), rồi gửi **một trong hai**:

1. Bản OCR lại của các trang đó **có cả dòng biển mã** (chữ trắng trên nền xanh) và dòng `(continued)` nếu có; hoặc
2. Ảnh chụp các trang đó (như 3 ảnh lần trước).

Em sẽ đọc mã thật của từng biển, gán lại mã/thứ tự bằng máy (không đoán), chạy lại cổng số thứ tự và trả ý kiến nào qua cổng vào API. Làm theo thứ tự bảng (xếp theo mức hay gặp trong tờ khai thật của Oz): vài cụm đầu đã đáng giá.

## Danh sách cụm

Cột "Oz" = số tờ khai thật (trên 10283) thuộc nhóm 4 số lớn nhất trong cụm. "Dòng" = số dòng trong tệp `WCO_Compendium_2022_Opinions_EN.md` (riêng tư). "Số in" = số thứ tự in ở đầu từng ý kiến (? = không đọc được). "Ứng viên" = số mã 6 số của WCO nằm giữa mã trước và mã sau.

| # | Oz | Mã TRƯỚC (đã chắc) | Mã SAU (đã chắc) | Số ý kiến | Dòng | Số in | Mã đang gán | Ứng viên | Lý do |
|---|---:|---|---|---:|---|---|---|---:|---|
| 1 | 594 | 3923.90/3 (d.2595) | 3926.20/1 (d.2657) | 7 | 2599, 2607, 2617, 2627, 2633, 2641, 2653 | 1, 2, 3, 4, 5, 6, 7 | 3923.90/4, 3923.90/5, 3924.90/1, 3924.90/2, 3924.90/3, 3924.90/4, 3924.90/5 | 9 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước ý kiến này; đứng sau chỗ đánh số lại; số in lớn hơn thứ tự gán → thiếu ý kiến đứng trước (hoặc mã sai) |
| 2 | 300 | 8479.60/3 (d.4805) | 8481.80/1 (d.4871) | 11 | 4809, 4813, 4817, 4821, 4825, 4833, 4837, 4843, 4851, 4857, 4865 | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 | 8479.60/4, 8479.60/5, 8479.60/6, 8479.60/7, 8479.60/8, 8479.89/1, 8479.89/2, 8479.89/3, 8479.89/4, 8479.89/5, 8479.89/6 | 22 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước ý kiến này; đứng sau chỗ đánh số lại; số in lớn hơn thứ tự gán → thiếu ý kiến đứng trước (hoặc mã sai) |
| 3 | 291 | 8535.90/1 (d.5663) | 8536.50/1 (d.5681) | 2 | 5669, 5675 | 1, 2 | 8535.90/2, 8535.90/3 | 7 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất; tiêu đề mã bị mất / nghi sai (từ các vòng khôi phục trước) |
| 4 | 222 | 7321.19/1 (d.3965) | 7323.93/1 (d.3979) | 1 | 3971 | 1 | 7321.19/2 | 12 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất |
| 5 | 206 | 4202.12/1 (d.2823) | 4202.91/1 (d.2847) | 3 | 2829, 2835, 2839 | ?, 1, 1 | 4202.12/2, 4202.12/3, 4202.12/4 | 9 | không đọc được số in; đánh số bắt đầu lại giữa chừng → có biển mã bị mất; tiêu đề mã bị mất / nghi sai (từ các vòng khôi phục trước) |
| 6 | 206 | 4202.92/1 (d.2853) | 4303.90/1 (d.2871) | 2 | 2857, 2861 | 1, 2 | 4202.92/2, 4202.92/3 | 20 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất; tiêu đề mã bị mất / nghi sai (từ các vòng khôi phục trước) |
| 7 | 184 | 8537.10/1 (d.5705) | 8538.10/1 (d.5721) | 1 | 5713 | ? | 8537.10/2 | 3 | không đọc được số in |
| 8 | 152 | 8483.10/1 (d.4933) | 8483.50/1 (d.4943) | 1 | 4937 | 1 | 8483.10/2 | 5 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất |
| 9 | 131 | 9503.00/5 (d.6771) | 9503.00/7 (d.6781) | 1 | 6777 | 6 | 9503.00/6 | 1 | noi-dung-khong-khop-ma |
| 10 | 123 | 7326.90/8 (d.4047) | 7606.11/1 (d.4073) | 5 | 4051, 4057, 4061, 4065, 4069 | 1, 1, 2, 1, 1 | 7326.90/9, 7326.90/10, 7326.90/11, 7326.90/12, 7326.90/13 | 80 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất; tiêu đề mã bị mất / nghi sai (từ các vòng khôi phục trước) |
| 11 | 116 | 8487.90/5 (d.4983) | 8501.62/1 (d.4997) | 1 | 4989 | 1 | 8487.90/6 | 13 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất |
| 12 | 116 | 8501.62/1 (d.4997) | 8502.39/1 (d.5011) | 1 | 5003 | 1 | 8501.62/2 | 12 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất |
| 13 | 99 | 7312.10/2 (d.3937) | 7318.19/1 (d.3947) | 1 | 3941 | 1 | 7312.10/3 | 30 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất |
| 14 | 96 | 6405.20/1 (d.3591) | 6702.90/1 (d.3603) | 1 | 3595 | ? | 6405.20/2 | 22 | mở đầu bằng nhãn ảnh, không có số in → chưa xác định được |
| 15 | 88 | 8524.91/1 (d.5507) | 8526.91/1 (d.5525) | 2 | 5513, 5519 | 1, ? | 8524.91/2, 8524.91/3 | 11 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất; tiêu đề mã bị mất / nghi sai (từ các vòng khôi phục trước) |
| 16 | 71 | 9403.20/6 (d.6657) | 9403.60/1 (d.6679) | 2 | 6665, 6671 | ?, ? | 9403.20/7, 9403.20/8 | 5 | không đọc được số in |
| 17 | 67 | 9026.20/1 (d.6461) | 9027.30/1 (d.6487) | 2 | 6465, 6477 | 1, 2 | 9026.20/2, 9027.20/1 | 6 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước ý kiến này; số in lớn hơn thứ tự gán → thiếu ý kiến đứng trước (hoặc mã sai) |
| 18 | 63 | 8543.70/5 (d.5845) | 8603.10/1 (d.5871) | 2 | 5853, 5861 | ?, 1 | 8543.70/6, 8543.70/7 | 37 | mở đầu bằng nhãn ảnh, không có số in → chưa xác định được; đánh số bắt đầu lại giữa chừng → có biển mã bị mất |
| 19 | 60 | 8512.30/1 (d.5081) | 8513.10/1 (d.5093) | 1 | 5087 | 1 | 8512.30/2 | 4 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước ý kiến này |
| 20 | 46 | 8427.20/1 (d.4469) | 8431.49/1 (d.4501) | 4 | 4473, 4479, 4487, 4493 | 1, 2, ?, 1 | 8427.20/2, 8427.20/3, 8428.90/1, 8428.90/2 | 37 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất; tiêu đề mã bị mất / nghi sai (từ các vòng khôi phục trước); mở đầu bằng nhãn ảnh, không có số in → chưa xác định được |
| 21 | 45 | 8451.30/2 (d.4615) | 8466.10/1 (d.4649) | 5 | 4619, 4623, 4631, 4635, 4639 | 1, 2, 1, 1, ? | 8451.30/3, 8451.30/4, 8451.30/5, 8451.30/6, 8451.30/7 | 101 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất; tiêu đề mã bị mất / nghi sai (từ các vòng khôi phục trước) |
| 22 | 42 | 6212.90/2 (d.3461) | 6214.90/1 (d.3475) | 1 | 3467 | 1 | 6212.90/3 | 8 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất |
| 23 | 39 | 8443.32/1 (d.4577) | 8451.30/1 (d.4607) | 4 | 4583, 4589, 4593, 4597 | 1, ?, 2, 3 | 8443.32/2, 8443.32/3, 8443.99/1, 8443.99/2 | 42 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất; tiêu đề mã bị mất / nghi sai (từ các vòng khôi phục trước); số in lớn hơn thứ tự gán → thiếu ý kiến đứng trước (hoặc mã sai) |
| 24 | 34 | 8528.52/3 (d.5557) | 8528.52/5 (d.5573) | 1 | 5563 | ? | 8528.52/4 | 1 | mở đầu bằng nhãn ảnh, không có số in → chưa xác định được |
| 25 | 34 | 8528.62/1 (d.5601) | 8529.10/1 (d.5633) | 4 | 5609, 5613, 5619, 5627 | 1, 2, 3, 4 | 8528.52/9, 8528.52/10, 8528.52/11, 8528.71/1 | 6 | tiêu đề mã bị mất / nghi sai (từ các vòng khôi phục trước); số in lớn hơn thứ tự gán → thiếu ý kiến đứng trước (hoặc mã sai) |
| 26 | 32 | 9504.50/3 (d.6839) | 9506.29/1 (d.6851) | 1 | 6843 | 1 | 9504.50/4 | 9 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước ý kiến này |
| 27 | 32 | 9506.29/1 (d.6851) | 9506.91/1 (d.6861) | 1 | 6855 | ? | 9506.29/2 | 12 | mở đầu bằng nhãn ảnh, không có số in → chưa xác định được |
| 28 | 23 | 5808.10/2 (d.3217) | 5903.10/1 (d.3231) | 2 | 3221, 3227 | 1, 2 | 5808.10/3, 5808.10/4 | 14 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất; tiêu đề mã bị mất / nghi sai (từ các vòng khôi phục trước) |
| 29 | 23 | 8708.50/4 (d.6143) | 8708.99/1 (d.6157) | 1 | 6151 | 1 | 8708.50/5 | 9 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước ý kiến này |
| 30 | 21 | 4901.99/2 (d.3077) | 4911.99/1 (d.3085) | 1 | 3081 | 1 | 4823.90/2 | 16 | tiêu đề mã bị mất / nghi sai (từ các vòng khôi phục trước) |
| 31 | 21 | 4911.99/2 (d.3089) | 5208.51/1 (d.3113) | 3 | 3093, 3099, 3103 | 1, 2, 3 | 4823.90/3, 4823.90/4, 4823.90/5 | 119 | tiêu đề mã bị mất / nghi sai (từ các vòng khôi phục trước) |
| 32 | 19 | 6110.30/4 (d.3377) | 6114.30/1 (d.3389) | 1 | 3383 | 1 | 6110.30/5 | 16 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước ý kiến này |
| 33 | 19 | 9018.90/2 (d.6403) | 9019.10/1 (d.6415) | 1 | 6409 | ? | 9018.90/3 | 2 | không đọc được số in |
| 34 | 11 | 8507.30/1 (d.5049) | 8508.19/1 (d.5065) | 2 | 5055, 5061 | 1, 1 | 8507.30/2, 8507.30/3 | 7 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất; tiêu đề mã bị mất / nghi sai (từ các vòng khôi phục trước) |
| 35 | 7 | 4421.99/2 (d.2981) | 4811.10/1 (d.2993) | 1 | 2985 | 1 | 4421.99/3 | 97 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất |
| 36 | 7 | 4811.90/2 (d.3039) | 4811.90/4 (d.3049) | 1 | 3043 | ? | 4811.90/3 | 1 | không đọc được số in |
| 37 | 6 | 5607.50/1 (d.3183) | 5704.90/1 (d.3193) | 1 | 3187 | 1 | 5607.50/2 | 29 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất |
| 38 | 6 | 8309.90/1 (d.4171) | 8402.19/1 (d.4211) | 3 | 4177, 4185, 4191 | 1, 2, 3 | 8309.90/2, 8309.90/3, 8309.90/4 | 13 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất; tiêu đề mã bị mất / nghi sai (từ các vòng khôi phục trước) |
| 39 | 4 | 6903.90/1 (d.3677) | 6909.19/1 (d.3691) | 1 | 3683 | 1 | 6903.90/2 | 14 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất |
| 40 | 4 | 7610.90/1 (d.4089) | 8111.00/1 (d.4099) | 1 | 4093 | 1 | 7610.90/2 | 72 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất |
| 41 | 4 | 9027.90/1 (d.6513) | 9029.20/1 (d.6523) | 1 | 6519 | 1 | 9027.90/2 | 7 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước ý kiến này |
| 42 | 2 | 3602.00/2 (d.2095) | 3701.30/1 (d.2107) | 1 | 2099 | 1 | 3602.00/3 | 15 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất |
| 43 | 2 | 5601.22/1 (d.3145) | 5606.00/1 (d.3165) | 2 | 3151, 3157 | 1, 1 | 5601.22/2, 5601.22/3 | 19 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước ý kiến này; đánh số bắt đầu lại giữa chừng → có biển mã bị mất |
| 44 | 1 | 3907.29/1 (d.2443) | 3911.90/1 (d.2457) | 1 | 2451 | ? | 3907.29/2 | 21 | mở đầu bằng nhãn ảnh, không có số in → chưa xác định được |
| 45 | 0 | 1704.90/11 (d.421) | 1806.32/1 (d.433) | 1 | 425 | 1 | 1704.90/12 | 11 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất |
| 46 | 0 | 1904.90/4 (d.573) | 1905.32/1 (d.587) | 1 | 579 | ? | 1904.90/5 | 5 | mở đầu bằng nhãn ảnh, không có số in → chưa xác định được |
| 47 | 0 | 2208.90/1 (d.1101) | 2209.00/1 (d.1135) | 4 | 1107, 1115, 1121, 1127 | 3, 4, 5, 6 | 2208.90/2, 2208.90/3, 2208.90/4, 2208.90/5 | 2 | số in lớn hơn thứ tự gán → thiếu ý kiến đứng trước (hoặc mã sai) |
| 48 | 0 | 2404.11/1 (d.1239) | 2404.19/1 (d.1265) | 2 | 1247, 1257 | ?, ? | 2404.11/2, 2404.11/3 | 3 | mở đầu bằng nhãn ảnh, không có số in → chưa xác định được |
| 49 | 0 | 2614.00/1 (d.1323) | 2711.19/1 (d.1419) | 13 | 1329, 1335, 1341, 1347, 1351, 1355, 1371, 1375, 1381, 1389, 1397, 1405, 1411 | 1, 2, 3, ?, ?, ?, ?, ?, ?, 2, 2, 3, 4 | 2614.00/2, 2614.00/3, 2614.00/4, 2614.00/5, 2614.00/6, 2614.00/7, 2712.90/1, 2712.90/2, 2712.90/3, 2710.12/1, 2710.19/1, 2710.19/2, 2710.19/3 | 50 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất; tiêu đề mã bị mất / nghi sai (từ các vòng khôi phục trước); mở đầu bằng nhãn ảnh, không có số in → chưa xác định được; số in lớn hơn thứ tự gán → thiếu ý kiến đứng trước (hoặc mã sai) |
| 50 | 0 | 2714.90/1 (d.1425) | 2715.00/1 (d.1435) | 1 | 1429 | 1 | 2714.90/2 | 2 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất |
| 51 | 0 | 2901.10/1 (d.1495) | 2905.49/1 (d.1511) | 1 | 1503 | ? | 2901.10/2 | 88 | không đọc được số in |
| 52 | 0 | 2924.19/1 (d.1545) | 2933.69/1 (d.1557) | 1 | 1549 | 1 | 2924.19/2 | 79 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất |
| 53 | 0 | 4303.90/1 (d.2871) | 4410.11/1 (d.2889) | 2 | 2875, 2879 | 1, 1 | 4303.90/2, 4303.90/3 | 70 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất; tiêu đề mã bị mất / nghi sai (từ các vòng khôi phục trước) |
| 54 | 0 | 4411.12/1 (d.2897) | 4417.00/1 (d.2909) | 1 | 2903 | 1 | 4411.12/2 | 27 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất |
| 55 | 0 | 8609.00/1 (d.5879) | 8701.94/1 (d.5903) | 3 | 5887, 5891, 5895 | 1, 1, 2 | 8609.00/2, 8609.00/3, 8609.00/4 | 12 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước ý kiến này; đứng sau chỗ đánh số lại |
| 56 | 0 | 8701.94/2 (d.5907) | 8702.10/1 (d.5915) | 1 | 5911 | 1 | 8701.94/3 | 3 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất |
| 57 | 0 | 8704.21/3 (d.6023) | 8704.60/1 (d.6063) | 6 | 6029, 6033, 6037, 6043, 6051, 6055 | 1, 1, 2, 3, 4, 5 | 8704.21/4, 8704.21/5, 8704.21/6, 8704.21/7, 8704.31/1, 8704.31/2 | 11 | đánh số bắt đầu lại giữa chừng → có biển mã bị mất; tiêu đề mã bị mất / nghi sai (từ các vòng khôi phục trước); số in lớn hơn thứ tự gán → thiếu ý kiến đứng trước (hoặc mã sai) |

## Sau khi có bản OCR / ảnh

- Đặt tệp vào `data/wco-op/` (riêng tư, đã bị `.gitignore` + `.dockerignore` chặn) rồi báo em; không dán vào repo công khai.
- Em chạy: parse lại → `scripts/wco-op-ordcheck.mjs` → dịch bổ sung các ý kiến mới qua cổng → cập nhật sổ tay nếu thuộc nhóm đã nối.
