# Soát độc lập lô L33: Chương 98 (50 PN6)

- Phiên soát: `claude-agent:duyet-L33-20261111#soat-L33` (#1109)
- Ngày: 11/11/2026
- Cách làm: với mỗi PN6 chạy `--kiem` (cả 50 PN6 xanh, không DỪNG), chạy `--ve`, rồi đặt từng điều kiện cạnh chữ biểu nguyên văn và tầng không mã (`data/bieu-thue/2026.04.05` bieu-chinh và tieu-de). Kiểm thêm **cột mã hàng tương ứng ở 97 chương** của từng dòng 98 (lưu ở trường `dvt`) và chữ VI/EN của dòng tương ứng ở 97 chương. Chương 98 trong biểu không có chữ EN. Đã đọc mọi cảnh báo cổng (BO_VE, cong1-chuong98-ngoai-dong, ten-anh-em, biên không đọc được) và đã tra `precedents.json` (chỉ có 9811.00.xx và 9837.00 có tiền lệ).
- Áp dụng phần BỔ SUNG 11/11: (1) không có `data/so-tay/98xx.json` nên không có ngưỡng số SEN/tax nào đang chạy bị mất; (2) và (3) gặp ở 980428 (khoá trục bảo quản trùng tên nhóm «hun khói») và 982710 (tên nhóm «có ren» chứa vế đối của dòng «không có ren»), cả hai PN6 đều trả về.

## Tổng kết

| Kết luận | Số PN6 |
|---|---|
| DUYET | 35 |
| TRA_VE | 15 |
| đỏ (không soát) | 0 |
| chờ bảng hiệu chỉnh tiền lệ | 0 |
| chưa soát | 0 |

Tỉ lệ sai theo PN6 là **15/50 = 30 %**. Số dòng 8 số bị ảnh hưởng trực tiếp (dòng nhận sai hàng hoặc không tới được): khoảng 20 dòng trên tổng khoảng 260 dòng của lô.

**Chưa áp dụng vào sổ tay (`--ap-dung`).** Cả 35 bản DUYET đều bị từ chối với lỗi `ENOENT data/so-tay/98xx.json`, vì Chương 98 chưa có tệp sổ tay nhóm nào. Bản DUYET vẫn nằm ở `data/ho-so/ranh-gioi/` và cần Claude/tech lead quyết cách tạo sổ tay cho Chương 98. Người soát không tự tạo tệp sổ tay.

**Lưu ý độc lập.** Ba bản soạn mang phiên `https://claude.ai/code/session_01Y2pGdeNRxMwYS2zRJGH1yU#soan-…`, trùng session gốc với phiên điều phối lô này: 981822 và 984942 (DUYET), 984943 (TRA_VE). Người soát là một phiên con khác, có ngữ cảnh riêng và soát độc lập. Công cụ chấp nhận vì chuỗi phiên khác nhau. GĐ dự án có thể giao người thứ hai soát lại hai bản DUYET này nếu muốn chặt hơn.

## Bảng kết luận

| PN6 | Kết luận | Ghi chú cụ thể |
|---|---|---|
| 980417 | TRA_VE | .11 **THU HẸP**: «Đã bỏ đầu» (tôm sú, mã tương ứng 0306.17.11) chỉ ghi `soCheTom TRONG [DA_BO_DAU]`. Ba giá trị của khoá loại trừ nhau và đọc theo kiểu dài thắng, nên tôm sú «đã bỏ đầu, còn đuôi» hay «bỏ đầu, bỏ đuôi» rơi vào .19. **Cùng lỗi ở 030617 đã DUYET (L2), cần mở lại.** |
| 980428 | TRA_VE | Lỗi theo BỔ SUNG mục 2: nhóm 9804 «đã được hun khói», nhưng dòng .11 «đã hấp chín hoặc luộc chín» dùng cùng khoá LIET_KE một giá trị `phuongPhapBaoQuan`, nên máy tự chốt .19. |
| 980800 | TRA_VE | .10 **SUY RỘNG**: «với nylon hoặc các polyamit khác» bị ghi thành `chatLieu LA plastic`. Tên nhóm 9808 vốn đã là «với plastic», nên vải canvas tráng PVC vào .10. Bản nháp còn khai BO_VE thừa. |
| 981100 | DUYET | Hai dòng cùng chữ, tách bằng `maHsTuongUng` (72.24–72.28 và 72.29). 16 tiền lệ dùng 9811.00.10/.90, khớp hướng tách. |
| 981200 | DUYET | .10 «Đã lắp ráp hoàn chỉnh» tương ứng 8408.20.10/21/22/23; .90 tương ứng 8408.20.93 (8701.10). |
| 981730 | DUYET | `bienApThichUng` khớp cột mã tương ứng 8504.33/34. |
| 981811 | DUYET | «Nắp chụp cách điện» ghi tenLoai + `coCachDien`. |
| 981812 | DUYET | Biên «từ 0,6% trở lên» thành >=; biên «từ 5 mm trở xuống» thành <=. Đã đối chiếu tay. |
| 981813 | DUYET | Tên nguyên văn. |
| 981814 | DUYET | Tên nguyên văn. |
| 981820 | DUYET | BO_VE «bằng tay» và «trừ … tịnh tiến/quay» được giữ tất định bằng `maHsTuongUng`, đúng quy ước Chương 98. |
| 981821 | DUYET | Đúng. |
| 981822 | DUYET | Biên kW và m3/phút đúng. Dòng .20 là phần còn lại sau bơm nhiệt. Bản soạn cùng session gốc, xem lưu ý độc lập ở trên. |
| 981824 | DUYET | `hoatDongBangDien` CO/KHONG. |
| 981826 | DUYET | .90 ghi HOAC (không phải đồng, hoặc > 2,5 cm), đúng vế trừ của chữ biểu. |
| 982130 | DUYET | Các dải khối lượng toàn bộ đúng biên. Các tầng tự đổ / diesel / tia lửa điện là phần còn lại (pcl). |
| 982710 | TRA_VE | Lỗi theo BỔ SUNG mục 3: tên nhóm 9827 «… thép đúc **có ren**» chứa vế đối của .10 «không có ren ở đầu ống», nên `coRen` đọc CÓ và .10 không tới được. Nên dùng `maHsTuongUng` 7304.24.10. Bản nháp còn khai BO_VE thừa. |
| 983412 | TRA_VE | .10 **SUY RỘNG**: bỏ «INOX 304» (thay bằng mọi mác thép không gỉ), bỏ «ren tiêu chuẩn 1» và «mạ chống rỉ». Máy tách sai nên cổng 5 vẫn báo «phủ». |
| 983610 | DUYET | Đúng. |
| 983620 | DUYET | Năm giá trị `kieuXeChoHang` đúng. |
| 983630 | DUYET | Đúng, có thêm TU_DO. |
| 983640 | DUYET | Đúng. |
| 983650 | DUYET | Đúng. |
| 984420 | TRA_VE | .33 **sai khoá**: «payload trên 200 tấn» bị ghi bằng `khoiLuong` (khối lượng tịnh của chiếc rơ-moóc). Phải dùng `khoiLuongToanBo` như spec 871639. .20 bỏ chữ «tự» của «tự dỡ hàng». |
| 984600 | DUYET | Đúng. |
| 984912 | DUYET | Đúng. Lỗi nhỏ: giá trị dungCho «sử dụng cho ô tô con» còn dính động từ. |
| 984913 | DUYET | Đúng. |
| 984914 | DUYET | `chieuRong` theo quy ước 4013. dungCho «loại lốp» thừa nhưng không đổi mã. |
| 984915 | TRA_VE | .21 **SUY RỘNG**: BO_VE bỏ vế «trừ viền cao su quanh kính cửa». Viền kính của xe 87.05 rơi vào .21, còn viền kính của xe 87.02–87.04 thoả cả .21 và .29. Nên dùng `maHsTuongUng` 4016.99.11/.13. |
| 984916 | DUYET | Hai dòng cùng chữ, tách bằng tầng tenLoai. |
| 984918 | DUYET | Đúng. |
| 984921 | DUYET | Dải dung tích xi lanh (cc) đúng. |
| 984922 | DUYET | Tầng tia lửa điện / diesel; biên đường kính trong và ngoài đúng. |
| 984923 | TRA_VE | Tầng 9849231 có giá trị tenLoai «dầu bôi trơn» là tên chất, không phải tên hàng; phải là «bơm dầu bôi trơn». Hiện không đổi mã nhưng giá trị bị bịa. |
| 984925 | DUYET | BO_VE «(trừ … 8415.20)» đúng vì tầng Loại khác đã phủ định 9849251. |
| 984926 | TRA_VE | Tầng r19595 **SUY RỘNG**: «Bộ lọc dầu hoặc xăng» bị ghi thành «Bộ lọc». Bộ lọc khí nạp vì thế rơi vào .19 thay vì .30. Tầng r19594/r19602 dùng tenLoai «Máy», «thiết bị lọc» trần, không còn định ngữ «chất lỏng» / «các loại khí». |
| 984927 | TRA_VE | Hai dòng cùng chữ nhưng khai `chongLanVanBan`. Quy ước Chương 98 (07/11) bắt tách bằng `maHsTuongUng` 8481.80.83/.93. |
| 984928 | DUYET | .20/.30 và .91/.99 tách bằng `maHsTuongUng`, đúng. |
| 984930 | TRA_VE | **Biểu thụt sai gạch** chưa hiệu chỉnh: theo mã tương ứng 8512.20, «Loại khác» r19666 và dòng .20 phải nằm dưới r19664. Hiện đèn đã lắp ráp không tới dòng 98 nào. Cần `GACH_HIEU_CHINH`; người soạn đáng lẽ phải DỪNG. |
| 984931 | DUYET | Đúng. |
| 984932 | DUYET | Đúng. |
| 984933 | DUYET | Đúng. |
| 984934 | TRA_VE | .76 **SUY RỘNG**: BO_VE «(trừ phân nhóm 8704.10)» với lý do sai («.72 cùng cây», trong khi .72 nằm dưới «Ốp đầu trục», không dưới «Bánh xe đã lắp lốp»). .79 BO_VE vế off-road. |
| 984935 | TRA_VE | .32 **SUY RỘNG**: BO_VE «(trừ … 8704.10)». Chính lyDo nói hàng 8704.10 rơi về .39, nhưng `dungCho` 87.04 vẫn nhận nó. |
| 984937 | DUYET | Đúng. |
| 984939 | DUYET | Đúng. |
| 984940 | DUYET | Đúng. |
| 984941 | TRA_VE | .10 có giá trị tenLoai «tái tạo âm thanh» bị mất chữ «kết hợp với thiết bị». Mọi máy thu thanh đều phát âm thanh nên đây là SUY RỘNG. Nên dùng `maHsTuongUng` 8527.21.x / 8527.29.00. |
| 984942 | DUYET | Biên W/kW, một pha / đa pha đúng. Bản soạn cùng session gốc, xem lưu ý độc lập ở trên. |
| 984943 | TRA_VE | Tầng r19889 **SUY RỘNG**: BO_VE vế trừ 8506.10/.30/.40/.60 «vì không có chữ để đọc», nhưng `loaiPin` đã có DIOXIT_MANGAN, OXIT_THUY_NGAN, OXIT_BAC, KEM_KHI. Pin kiềm vì thế rơi vào .21/.29. |

## Mẫu lỗi lặp lại (cho người soạn và Claude)

1. **BO_VE vế «(trừ phân nhóm/loại …)» trong khi có sẵn cách giữ tất định** (984915, 984934, 984935, 984943). Quy ước Chương 98 (07/11) đã cho dùng `maHsTuongUng` hoặc khoá liệt kê có sẵn. Hai lần lyDo còn mô tả sai cây (984934) hoặc tự mâu thuẫn với điều kiện (984935).
2. **Dòng 98 cùng chữ mà không dùng `maHsTuongUng`** (984927).
3. **Khoá trùng trục với tên nhóm/phân nhóm** (980428, 982710): đúng các mẫu 2 và 3 của BỔ SUNG 11/11.
4. **Giá trị tên mất định ngữ hoặc danh từ đầu chung** (980800, 983412, 984420 .20, 984923, 984926, 984941).
5. **Liệt kê loại trừ nhau trong khoá LIET_KE nhưng dòng biểu là tập cha** (980417, và 030617 đã DUYET).

## Máy tách sai (chuyển Claude chỉnh `lib/ho-so/tach-ve.js`)

| PN6 / mục | Chữ biểu | Cách tách sai |
|---|---|---|
| 98080010 | «Vải canvas đã được ngâm tẩm, tráng, phủ hoặc ép với …» | DAU «Vải canvas đã» \| GIOI_HAN «được ngâm tẩm …». Chữ «đã» bị tách khỏi cụm động từ. |
| 98341210 | «Ốc vít bằng thép, INOX 304, ren tiêu chuẩn 1, mạ chống rỉ, đường kính …» | Gộp «bằng thép, INOX 304, ren tiêu chuẩn 1, mạ chống rỉ» thành MỘT vế «bằng …», nên chatLieu phủ cả ba đặc tính khác. |
| 98181211 | «Có hàm lượng carbon từ 0,6% trở lên …» | Tách chủ ngữ «Có hàm lượng carbon» khỏi biên số thành vế riêng, buộc phải BO_VE. |
| 984916~r19493/r19496 | «Có kích cỡ và hình dạng phù hợp với từng loại xe …» | Tách «Có kích cỡ và hình dạng» khỏi «phù hợp với …». |
| 9849289 | «Bánh xe có răng, đĩa xích …» | DAU «Bánh xe» \| GIOI_HAN «có răng, đĩa xích và …»: cắt cụm danh từ «bánh xe có răng». |
| 98492319 | «Bơm nước loại được sử dụng cho …» | DAU «Bơm nước loại» \| «được sử dụng …». |
| 98493711 | «… sử dụng cho xe có động cơ, hoạt động bằng điện» | Gộp «sử dụng cho xe có động cơ, hoạt động» thành một vế, tách «bằng điện» riêng. |

Số vế cổng 5 báo trên các mục sai đều ở trạng thái «phủ» hoặc «MIỄN». Cổng 5 không bắt được lỗi nào trong 15 PN6 trả về: mọi lỗi đều nằm ở **giá trị** hoặc ở **BO_VE có lý do sai**. Việc người soát đọc lyDo và đối chiếu mã tương ứng vẫn là bắt buộc.
