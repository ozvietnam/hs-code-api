# M-81 — Nâng cấp cổng 7–9 cho phần bù có tên, nạp 12 bảng vàng đạt `DONG` và khoá bộ thử hồi quy

- **Thẻ & Luật nền**: `M-81` (`#2410#issuecomment-7217142503`, `PR #2429`) · `ADR-0005` (kho là bản đồ luật, mô hình đọc), `ADR-0007` (điều kiện nguyên tử và bảng anh em), `ADR-0008` (triển khai theo nhóm 4 số và sổ điểm), `ADR-0009` (làm rõ Cổng 7 và Cổng 8).
- **Phạm vi dữ liệu**: 12 nhóm bảng vàng thuộc 10 chương (`02.01, 30.04, 39.26, 42.02, 61.10, 73.26, 84.79, 85.01, 85.17, 85.43, 87.08, 90.31`) nạp vào `data/ho-so-ma/dieu-kien/{02,30,39,42,61,73,84,85,87,90}.jsonl` (định dạng `JSONL` — mỗi dòng một đối tượng JSON) và sinh `data/ho-so-ma/bang-anh-em/{02,30,39,42,61,73,84,85,87,90}.jsonl` bằng động cơ tất định, không đụng đường khách (`api/`, `lib/`, `data/prompts/`, `lib/ho-so-ma/ghep.js`).

> **QUY ƯỚC BẮT BUỘC (`#2410`)**: Từ nay trở đi, **12 nhóm bảng vàng (`02.01, 30.04, 39.26, 42.02, 61.10, 73.26, 84.79, 85.01, 85.17, 85.43, 87.08, 90.31`) CHỈ dùng làm bộ thử hồi quy (`regression test` — bài kiểm tự động chống tụt lùi) của cổng máy (`scripts/test-dieu-kien.mjs`), TUYỆT ĐỐI KHÔNG dùng để đo mù nữa.**

---

## 1. Ba thước dừng theo `ADR-0007 §8`

1. **Số bảng anh em đạt cổng 6–12**: **`176 / 176` bảng (`100%`)** trong phạm vi 12 nhóm đã nạp (`0` bảng gắn cờ `HO_PHU`, `0` bảng gắn cờ `VUNG_CHONG` máy; tính trên toàn biểu hiện hành là `176 / 3.493` bảng cha, `12 / 1.269` nhóm 4 số đạt `DONG`, `0 DO`).
2. **Số điều kiện `NGHIA_THUONG` đã đếm và có câu hỏi**: **`278 / 692` bản ghi `DIEU_KIEN`** (`100%` có `cauHoi` một dòng rõ ràng để dừng hỏi hoặc chốt kèm giả định theo quyết định 24/11; phân bổ toàn bộ 692 `DIEU_KIEN`: `NGHIA_THUONG = 278`, `DINH_NGHIA_LUAT = 164`, `MO_TA_HUONG_DAN = 204`, `NGUONG = 46`).
3. **Số cặp `VUNG_CHONG` chưa giải**:
   - **Trên cổng máy tự động (`Cổng 8`, khoảng số giao nhau cùng đại lượng hoặc danh sách `vungChong` chặn)**: **`0` cặp chặn** (trong tổng số `523` cặp anh em có tên của 12 nhóm: `309` cặp máy chứng minh rời nhau trực tiếp hoặc rời theo cấu trúc `truAnhEm`, `94` cặp có bản ghi `GIAI_CHONG`, `120` cặp gắn cảnh báo không chặn `CHUA_CHUNG_MINH_TACH`).
   - **Đối chiếu trung thực với phân tích tay trong 12 tài liệu bảng vàng (chờ chuyên viên nghiệp vụ duyệt quy tắc ưu tiên)**:
     - **9 cặp có ví dụ mặt hàng cụ thể trong tài liệu bảng vàng chưa ghi `GIAI_CHONG`** (hiện nằm trong `120` cặp `CHUA_CHUNG_MINH_TACH` của Cổng 8 vì văn bản luật không có câu tự giải; không tự ý bịa Quy tắc 3(a) hay 3(c) thay người làm nghề — xem bảng chi tiết ở Mục 4.1).
     - **11 cặp chồng lấn đã nạp bản ghi `GIAI_CHONG` đề xuất theo khối dữ liệu bảng vàng và gắn `ghiChu: "trangThaiGoc=..."` chờ chuyên viên nghiệp vụ xác nhận** (`85.43`: 7 cặp / 9 bản ghi `8151..8159`; `85.17`: 4 cặp / 8 bản ghi áp Quy tắc 3(a) qua Quy tắc 6 — xem Mục 4.2).

---

## 2. Thống kê chi tiết 12 nhóm bảng vàng trên kho thật

Chạy `node scripts/ho-so-ma/so-diem.mjs --kiem-dong --bat-buoc-tep-bang`:
`Sổ điểm: tổng 1269 | DONG=12 | CHUA=1257 | DO=0`.

| Nhóm | Chương | Bảng không `HO_PHU` | `DIEU_KIEN` | `GIAI_CHONG` (bản ghi / cặp) | `CANH_TRANH` | Cổng 8: Rời nhau / `CCMT` / `VUNG_CHONG` máy | Phân bổ `mo`: `NGHIA_THUONG` / `DINH_NGHIA_LUAT` / `MO_TA_HUONG_DAN` / `NGUONG` |
|---|---|---:|---:|---:|---:|---:|---:|
| `02.01` | `02` | `1 / 1` | `8` | `0 / 0` | `0` | `2 / 1 / 0` | `1 / 6 / 1 / 0` |
| `30.04` | `30` | `27 / 27` | `104` | `41 / 41` | `1` | `20 / 28 / 0` | `56 / 11 / 36 / 1` |
| `39.26` | `39` | `8 / 8` | `42` | `1 / 1` | `1` | `15 / 25 / 0` | `23 / 5 / 14 / 0` |
| `42.02` | `42` | `15 / 15` | `38` | `7 / 6` | `0` | `2 / 1 / 0` | `20 / 10 / 5 / 3` |
| `61.10` | `61` | `2 / 2` | `15` | `13 / 7` | `1` | `0 / 0 / 0` | `2 / 8 / 4 / 1` |
| `73.26` | `73` | `5 / 5` | `22` | `0 / 0` | `1` | `13 / 1 / 0` | `11 / 3 / 8 / 0` |
| `84.79` | `84` | `11 / 11` | `51` | `13 / 13` | `2` | `17 / 21 / 0` | `30 / 11 / 10 / 0` |
| `85.01` | `85` | `33 / 33` | `113` | `7 / 7` | `0` | `72 / 7 / 0` | `34 / 30 / 9 / 40` |
| `85.17` | `85` | `13 / 13` | `60` | `14 / 7` | `1` | `16 / 6 / 0` | `23 / 16 / 21 / 0` |
| `85.43` | `85` | `6 / 6` | `49` | `9 / 7` | `1` | `4 / 25 / 0` | `32 / 14 / 3 / 0` |
| `87.08` | `87` | `50 / 50` | `164` | `7 / 7` | `1` | `141 / 1 / 0` | `37 / 40 / 86 / 1` |
| `90.31` | `90` | `5 / 5` | `26` | `6 / 5` | `1` | `7 / 4 / 0` | `9 / 10 / 7 / 0` |
| **Tổng** | **10 tệp** | **`176 / 176`** | **`692`** | **`118 / 94`** | **`10`** | **`309 / 120 / 0`** | **`278 / 164 / 204 / 46`** |

*(Chú thích: `CCMT` = `CHUA_CHUNG_MINH_TACH` — cặp chưa chứng minh rời nhau bằng trục số/giá trị hoặc phủ định trực tiếp).*

---

## 3. Các nâng cấp cấu trúc ở Cổng 6–12, Khuôn và Động cơ bảng anh em

1. **Khuôn `ho-so-ma@1` (`scripts/ho-so-ma/khuon.mjs`)**:
   - Mở dải định danh `kiemId81` nhận hậu tố `8[1-9]\d{2,}` (thông báo lỗi chuẩn hoá thành `hs:<nut>:8[1-9]NN`, giữ tương thích `81\d{2,}` như `81100`, đồng thời nhận `hs:bieu:3004:8201`, `hs:bieu:6110:8200`, `hs:bieu:8517:8200..8215` khi một nút vượt quá 99 bản ghi).
   - Nâng giới hạn độ dài một dòng của `cauHoi` lên `600` ký tự (vẫn cấm ký tự xuống dòng `\n`) để bảo toàn nguyên văn 100% các câu hỏi mang đầy đủ danh sách loại trừ pháp lý của bảng vàng (như `hs:bieu:8708:8104` dài 527 ký tự).
2. **Nhận diện Phần bù có tên (`laPhanBuCoTen`) & `truAnhEm` tự động (`scripts/ho-so-ma/bang-anh-em.mjs`, `scripts/ho-so-ma/cong.mjs`)**:
   - Bổ sung hàm tất định `laPhanBuCoTen(nutId, L, bieuMeta)` nhận diện các dòng biểu thuế có mệnh đề chính là nhánh phần bù `"… khác"` (ví dụ `"- Máy và thiết bị khác:"` ở `8543.70`, `"- Máy và thiết bị cơ khí khác:"` ở `8479.8`, `"- Dụng cụ, thiết bị và máy khác:"` ở `9031.80`, `"- Thiết bị khác để phát hoặc nhận..."` ở `8517.6`, `"- Từ các vật liệu dệt khác"` ở `6110.90`, `"- Các bộ phận và phụ kiện khác:"` ở `8708.9`, v.v.), đồng thời loại trừ chính xác các câu liệt kê nội bộ (`"và các … khác"` ở `3926.40`, `"kể cả … khác"` ở `8479.30`, `"hoặc xe khác"` ở `8708.22`, `"kết hợp với … khác"` ở `8708.50`, `"chưa được chi tiết hoặc ghi ở nơi khác"`).
   - Hàm `tinhTruAnhEm` tự động điền `truAnhEm` cho cả `anhEm` lẫn `chuoiCha` từ: (i) `meta.phamViTru` của dòng `"Loại khác, ..."` có vế riêng; (ii) các cặp `GIAI_CHONG` cách `TRU` thuộc câu nguồn của nút phần bù khi hai bên chưa rời sẵn; và (iii) các anh em đứng trước của nhánh `laPhanBuCoTen` chưa rời nhau sẵn theo `haiNutRoiNhau`.
   - Hệ quả:
     - `cauHoiToiThieu` tự động gom đủ câu hỏi của các anh em bị trừ (`8543.70` = 12 câu, `8543.70.90` = 35 câu; `9031.80` = 9 câu, `9031.49.90` = 17 câu; `8479.8` = 18 câu, `8479.89.69` = 36 câu).
     - `doBangAnhEm` định tuyến máy có tên (`8543.20`, `8479.10`, `9031.10`, `8517.11`) đi thẳng vào đúng đích mà không nổ `CHONG_LAP` với nhánh `"… khác"`, và luôn dừng `RE_NHANH` khi anh em đứng trước còn `undefined`.
     - Cổng 8 ghi nhận cặp có quan hệ `truAnhEm` là **rời theo cấu trúc** (khớp bảng đối chứng của `85.43`, `84.79`, `90.31`).
   - Bổ sung tuỳ chọn dòng lệnh (`CLI` — giao diện dòng lệnh) `--nhom <ds-nhom>` và `--chi-nhom-co-dieu-kien` cho `bang-anh-em.mjs` để chỉ sinh bảng của những nhóm đã nạp `DIEU_KIEN`.
3. **Chứng minh phủ kín có điều kiện cha ở Cổng 7 (`chungMinhPhuKin`)**:
   - Bổ sung bộ giải thoả có điều kiện phạm vi cha (`Cha ∧ ChuỗiCha ⟹ ⋁ Con_i`) bằng quay lui cắt tỉa (`DPLL` — thuật toán giải thoả điều kiện quay lui cắt tỉa) trên tích miền hữu hạn `GIA_TRI` đơn trị (kể cả phần tử đại diện ngoài tập `"__khac__"` và cặp giá trị đối xứng `"<x>"` / `"không <x>"` ở `84.79`), khoảng sơ cấp `SO` (có quy đổi đơn vị SI `kW→W`, `kVA→VA`, `kg→g`, `m/cm→mm`), và biến `CO_KHONG` (giải gọn cả nút có > 12 điều kiện, có `Cha = A ∨ B` như `3004.10`, hoặc thừa kế miền từ tổ tiên như `8708.22`, `8708.996`, `8501.31/.322/.323`).
   - Bổ sung kiểm chứng phân hoạch cấu trúc chặt cho: (i) cụm *Nguyên chiếc + Bộ phận + Phần bù có tên* (`84.79`, `85.17`, `85.43`, `90.31` — bắt buộc kiểm đủ `phu: true` ngưỡng `SO` đứng trước, và cả nhánh phần bù nguyên chiếc lẫn nhánh `"Bộ phận"` phải có ít nhất một vế không mang `GIA_TRI`/`SO` dương, tối đa 1 `CO_KHONG` dương); (ii) cụm `"<Hàng> và bộ phận của chúng"` có nhánh `"Các bộ phận khác"` (`8708.99.2` — bắt buộc có con nguyên chiếc khớp tên hàng chính của cha trên cùng trục đơn trị); (iii) cụm *"X và/; bộ phận của nó/chúng"* trên cùng trục đơn trị `GIA_TRI` (`8708.40/.50/.80/.91/.925/.926/.95`); và (iv) phân hoạch tích trục đơn trị có kiểm bắt buộc phủ định ngưỡng `SO` đứng trước (`85.01` gốc).
   - **Kiểm đối chứng trên phiếu lỗi của `PR #2429` và 5 ca âm tự động (`test-dieu-kien.mjs`)**: Cổng 7 bắt đỏ `HO_PHU` chính xác trên `p1-8501` (`bieu:8501` thiếu `phu` 37,5 W), `p1-8708` (`bieu:8708`, `bieu:8708996`), và 5 ca âm hồi quy (`870822`, `870880`, `8501`, `S1` thu hẹp giả `854370`, `S2` lệch tên nguyên chiếc `87089921`).
4. **Khắc phục 5 lỗi kiểm toán `B1..B5` và làm sạch lời nhắc**:
   - **B1**: Giữ nguyên văn điều kiện gốc của `8543.70`, `8479.8`, `9031.80`, `9031.4`, `8517.6` (không gán `phu: true` bóp méo câu bộ phận; để `tinhTruAnhEm` tự gắn `truAnhEm`).
   - **B2**: Nhóm `90.31` giữ đúng 26 `DIEU_KIEN` (`9031.80` chỉ có 1 điều kiện `hs:bieu:903180:8101`, không thêm vế 2 sai Chú giải 2(a) Chương 90).
   - **B3**: Nhóm `85.01` giữ đúng `hs:bieu:85013:8102` là `phu: false, kieu: "GIA_TRI", truc: "dòng điện làm việc", tap: ["một chiều"]` và đủ 113 `DIEU_KIEN` theo `M-81-vang-8501.md`.
   - **B4**: Nhóm `39.26` gắn `daTri: true` cho trục `cong_dung` trên `3926.90.3/.4/.5` (`15` rời, `25 CCMT`); nhóm `73.26` giữ nguyên văn 100% `tap` của `7326.20.50` (`["Lồng nuôi gia cầm", "loại tương tự"]`) và `7326.20.60` (`["Bẫy chuột"]`) đúng `M-81-vang-7326.md:97-98`, nên theo luật trục `GIA_TRI` đơn trị của `ADR-0009` máy tính `13` rời và `1 CCMT` (tài liệu bảng vàng ghi chú tay khả năng giao ngữ nghĩa `"loại tương tự"` × `"Bẫy chuột"` chưa có món hàng cụ thể trong luật).
   - **B5**: Cập nhật đúng mã băm vân tay `SHA-256` (mã băm vân tay 256-bit) cho các bản ghi `GIAI_CHONG` dẫn `gir:6#2` / `gir:3:a#1` ở `85.17` và gắn trường `ghiChu` trạng thái chờ chuyên viên nghiệp vụ duyệt trực tiếp vào các bản ghi đề xuất của `85.17` và `85.43` trong `data/ho-so-ma/dieu-kien/85.jsonl`.
   - **Làm sạch `HUONG_DAN_TACH_DIEU_KIEN` (`scripts/ho-so-ma/tach-dieu-kien.mjs`)**: Thay mọi ví dụ dính mã bảng vàng bằng ký hiệu trung tính (`<tên trục cục bộ theo chữ luật>`, `bieu:XXXXXXXX#1`), tóm tắt 7 nguyên tắc chung của QT, 0 mã vàng và 0 chữ `"bảng vàng"` / `"tập vàng"`.

---

## 4. Danh mục đầy đủ các cặp chồng lấn chờ chuyên viên nghiệp vụ duyệt

### 4.1. Chín (9) cặp `VUNG_CHONG` có mặt hàng cụ thể trong tài liệu bảng vàng nhưng chưa ghi `GIAI_CHONG`

Các cặp dưới đây hiện được Cổng 8 đếm vào `CHUA_CHUNG_MINH_TACH` (không tự ý đặt quy tắc giải chồng khi chữ luật không nêu):

| # | Nhóm | Cặp anh em | Mặt hàng cụ thể thoả đồng thời hai nhánh | Lý do chưa ghi `GIAI_CHONG` |
|---:|---|---|---|---|
| 1 | `39.26` | `3926.20.10` × `3926.20.60` | Tạp dề bằng plastic dùng để chống các chất hóa học | Vừa là `"Tạp dề"` (`.10`), vừa là `"Các sản phẩm may mặc dùng để chống các chất hóa học..."` (`.60`); biểu thuế không nêu thứ tự ưu tiên |
| 2 | `84.79` | `8479.81` × `8479.82` | Máy phá gang (dập/đập vụn phế thải gang để nấu lại, `nhom:8479:ct:25#1`) | Vừa xử lý kim loại (`8479.81`), vừa có thao tác đập/nghiền (`8479.82`); chờ chuyên viên chốt ranh giới xử lý kim loại vs nghiền thông thường |
| 3 | `84.79` | `8479.81` × `8479.83` | Máy ép đẳng nhiệt lạnh dùng để ép bột kim loại (`sen:84798300:1#1`) | Vừa xử lý bột kim loại (`8479.81`), vừa được định danh trực tiếp ở `8479.83`; chờ chuyên viên duyệt áp Quy tắc 3(a) qua Quy tắc 6 |
| 4 | `84.79` | `8479.89.10` × `8479.89.50` | Thiết bị tự động gắn linh kiện kèm bộ phận đồng chỉnh dùng trong sản xuất lắp ráp tấm mạch in | Thoả mô tả thiết bị chuyên dùng cho tấm mạch in ở `.10` và vế 4 của `.50`; chờ chuyên viên chốt |
| 5 | `85.01` | `8501.31.30` × `8501.31.60` | Động cơ một chiều ≤ 750 W của máy điều hòa không khí nhóm 84.15 loại dùng cho người trong xe có động cơ Chương 87 (`bieu:841520#1`) | Vừa dùng cho hàng nhóm `84.15`, vừa dùng cho xe Chương `87`; biểu và chú giải `85.01` không nêu nhánh ưu tiên |
| 6 | `85.01` | `8501.32.21` × `8501.32.24` | Động cơ một chiều > 750 W đến 37,5 kW của máy điều hòa `8415.20` trên xe Chương 87 | Như cặp #5 |
| 7 | `85.01` | `8501.52.11` × `8501.52.12` | Động cơ xoay chiều đa pha > 750 W đến 1 kW của máy điều hòa `8415.20` trên xe Chương 87 | Như cặp #5 |
| 8 | `85.01` | `8501.52.21` × `8501.52.22` | Động cơ xoay chiều đa pha > 1 kW đến 37,5 kW của máy điều hòa `8415.20` trên xe Chương 87 | Như cặp #5 |
| 9 | `85.01` | `8501.52.31` × `8501.52.32` | Động cơ xoay chiều đa pha > 37,5 kW đến 75 kW của máy điều hòa `8415.20` trên xe Chương 87 | Như cặp #5 |

### 4.2. Mười một (11) cặp đã ghi bản đề xuất `GIAI_CHONG` trong kho và đánh dấu `ghiChu` chờ chuyên viên xác nhận

| Nhóm | Cặp anh em (`id` bản ghi trong `85.jsonl`) | Cách đề xuất (`nguon`) | Nội dung cần chuyên viên nghiệp vụ xác nhận |
|---|---|---|---|
| `85.43` | `8543.70.30 × 8543.70.50` (`hs:bieu:854370:8151..8153`), `8543.70.30 × 8543.70.60` (`hs:bieu:854370:8154`), `8543.70.50 × 8543.70.60` (`hs:bieu:854370:8155`), `8543.70.10 × 8543.70.60` (`hs:bieu:854370:8156`), `8543.70.2 × 8543.70.60` (`hs:bieu:854370:8157`) | `CHU_GIAI` (`phan:XVI:cg:3#1`, `gir:6#2`) / `QUY_TAC_3` (`gir:3:c#1`, `gir:3:a#1`) | Đã gắn `ghiChu: "trangThaiGoc=VUNG_CHONG..."` trực tiếp trong `85.jsonl` theo `M-81-vang-8543.md` (máy đọc sách điện tử có từ điển; ưu tiên mô tả chức năng trước mô tả thiết kế kết nối ở `.60` vế 2) |
| `85.43` | `8543.20 × 8543.90` (`hs:bieu:8543:8158`), `8543.70 × 8543.90` (`hs:bieu:8543:8159`) | `CHU_GIAI` (`phan:XVI:cg:2:a#1`) | Đã gắn `ghiChu: "trangThaiGoc=CAN_NGUOI_DUYET..."` trong `85.jsonl`: áp Chú giải 2(a) Phần XVI xuống phân nhóm qua Quy tắc 6 câu 2 để ưu tiên máy cụ thể trước bộ phận `8543.90` |
| `85.17` | `8517.61 × 8517.62` (`hs:bieu:85176:8151..8152`), `8517.62.30 × 8517.62.4` (`hs:bieu:851762:8151..8152`), `8517.62.41 × 8517.62.43` (`hs:bieu:8517624:8151..8152`), `8517.79.10 × 8517.79.2` (`hs:bieu:851779:8151..8152`) | `QUY_TAC_3` (`gir:3:a#1`, `bieu:851761#1`, `bieu:85176230#1`, `bieu:85176241#1`, `nhom:8471:ct:71#1`, `bieu:85177910#1`) | Đã gắn `ghiChu: "trangThaiGoc=CAN_NGUOI_DUYET..."` trong `85.jsonl`: so độ cụ thể của mô tả phân nhóm theo Quy tắc 3(a) qua Quy tắc 6 theo `M-81-vang-8517.md` |
