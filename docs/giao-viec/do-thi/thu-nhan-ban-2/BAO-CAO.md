# Thử nhân bản lần 2: đo dao động, 5 nhóm × 3 lần

Ngày 21/11/2026 · mã việc G6-1 vòng 2 (PR #1549) · KHÔNG nhóm nào ở đây được áp vào `data/so-tay/`.

## Phép đo

- **Đầu vào của mô hình:** đúng tệp [`../SOAN-TIEU-CHI-6-SO.md`](../SOAN-TIEU-CHI-6-SO.md) (lời hệ thống) + gói soạn
  `node scripts/goi-soan-tieu-chi-6.mjs --nhom=XXXX`. Không ví dụ thêm, không sửa tay.
- **Mô hình:** `ag/gemini-3-flash` qua 9Router trên .131, `temperature: 0`. Tối đa 4 lượt (1 soạn + 3 sửa theo lỗi cổng).
- **Nhóm:** 8536, 3926, 7323 (như lần 1) + hai nhóm tiêu đề ghép trong top lượng hàng: **8544** (dây cáp điện; tầng "Dây đơn dạng
  cuộn", "Các vật dẫn điện khác, dùng cho điện áp …") và **4202** (hòm, vali, túi; 12 phân nhóm, vế chất liệu "bằng da thuộc hoặc da
  thuộc tổng hợp" / "bằng tấm plastic hoặc vật liệu dệt").
- **Năm vòng A → E**, mỗi vòng 5 nhóm × 3 lần chạy song song. Sau mỗi vòng: đọc tay mọi bản qua cổng, sửa cổng / hướng dẫn, chạy
  lại từ đầu. Đầu ra từng lượt của vòng E (cấu hình cuối lúc chạy) ở `lan-N/<nhóm>/`.
- **Mô hình pro miễn phí:** `ag/gemini-3.1-pro-low` và `ag/gemini-pro-agent` trên 9Router trả 404 ("Requested entity was not
  found"). Không thử `gemini/*-pro-*` vì không chắc kênh đó miễn phí. Không dùng Claude, MiniMax, DeepSeek.

## Kết quả theo vòng (số nhóm qua cổng / 5)

| Vòng | Cổng thay đổi trước vòng | Lần 1 | Lần 2 | Lần 3 | Lượt gọi | Token |
|---|---|---|---|---|---|---|
| A | phủ vế bản đầu, một hàm "phần còn lại", chặn chuaSoHoa lười | 2 | 2 | 2 | 47 | 936.600 |
| B | + vế "kể cả", cụm mở, lời báo lỗi đơn vị số, bỏ cụm đối tượng khi áp tiêu đề | 4 | 4 | 4 | 38 | 734.941 |
| C | phủ vế theo ĐIỀU KIỆN (không tính tuKhoa), đủ mọi âm tiết; chatLieu theo từng phương án | 4 | 4 | 3 | 42 | 858.425 |
| D | + đọc chất liệu theo mẫu dùng chung (sửa báo oan 4202) | 3 | 3 | 2 | 48 | 964.184 |
| E | vế giới hạn nhận điều kiện có kiểu; bỏ danh từ dư của phần còn lại có phạm vi; lời báo trích kèm chữ đúng | 3 | 5 | 4 | 48 | 946.576 |
| **Tổng** | | | | | **223** | **4.440.726** |

Vòng B đạt 4/4/4 nhưng đọc tay thấy lỗi lọt (dưới). Mỗi lần cổng chặt thêm thì số qua giảm rồi hồi lại một phần.

**Vòng E, chi tiết** (số lỗi qua từng lượt; "—" = không qua sau 4 lượt):

| Nhóm | Lần 1 | Lần 2 | Lần 3 |
|---|---|---|---|
| 8536 | 5→3→1→0 | 10→0 | 7→2→0 |
| 3926 | 6→1→1→0 | 3→2→1→0 | 3→1→2→0 |
| 7323 | 0 | 2→0 | 1→0 |
| 8544 | 7→4→2→2 — | 11→3→2→0 | 11→6→1→1 — |
| 4202 | 17→23→31→11 — | 10→0 | 13→11→10→0 |

**Chấm lại bản cuối vòng E bằng cổng cuối** (sau khi thêm 3 phép kiểm từ đọc tay vòng E): 3926 lần 1 đỏ (`TACH_LIET_KE`), 7323 lần 1
đỏ (`GIA_TRI_RONG`), 4202 lần 3 đỏ (`THIEU_VE_GIOI_HAN`). Số qua theo cổng cuối: **1 / 5 / 3**. Phần này là chấm lại đầu ra cũ,
chưa phải số của mô hình chạy với cổng cuối.

## Lỗi đọc tay thấy lọt, và phép kiểm đã thêm

| Vòng | Lọt | Ví dụ | Đã thêm |
|---|---|---|---|
| A | Bản cũ 7323.94 bỏ "đã tráng men" | xem lần 1 | `THIEU_VE_GIOI_HAN` (phủ vế) |
| A | "kể cả" tách thành điều kiện AND riêng | 3926.20 mục thứ hai "găng tay…" | `KE_CA_LA_DIEU_KIEN` |
| A | Cụm mở làm giá trị | 3926.30 `dungCho` có "các loại tương tự" | `GIA_TRI_RONG` |
| A | Mô hình lồng đơn vị vào value | 8536.41 `{"so":60,"donVi":"V"}` | lời báo lỗi nêu đúng dạng `"value": 60, "donVi": "V"` |
| B | **Từ khoá thay điều kiện** | 8536.70 `tenLoai: "Đầu nối"` + tuKhoa "cáp quang", không có `dungCho` ⇒ mọi đầu nối vào 8536.70; 3926.30 tương tự | phủ vế chỉ tính `value` / khoá, không tính `tuKhoa` |
| B | Khoá có/không nuốt cả vế tên hàng | 8544.11 chỉ `dangCuon` cho "Dây đơn dạng cuộn" (mất "dây đơn") | vế đầu ngữ phải mang đủ âm tiết |
| B | Bỏ một phương án của vế | 3926.10 "văn phòng" (mất "trường học"); 8544.20 "Cáp đồng trục" (mất "dây dẫn điện đồng trục") | đủ mọi âm tiết của vế |
| C | Từ khoá là giới từ | 3926.30 `tuKhoa: ["lắp vào"]` | `TU_KHOA_QUA_CHUNG` nhận cả "lắp vào / dùng / trong / với" |
| C/D | **Cổng báo oan** | 4202: "vải dệt" đọc được "vật liệu dệt" bằng mẫu dùng chung nhưng phủ vế không biết; 8544.42 `daGanDauNoi` phủ "Đã lắp với đầu nối điện" bị đòi thêm "điện"; "Các vật dẫn điện khác" (phần còn lại) bị đòi như tên riêng; `chuaSoHoa` cho "da thuộc" bị chặn dù tu-vung không có giá trị đó | sửa từng chỗ, mỗi chỗ một ca test |
| E | Vế chất liệu nhiều phương án chỉ khai một | 4202.12/.22/.32/.92 chỉ `plastic`, mất "vật liệu dệt" (lọt do nới ở vòng E) | vế "bằng …" phải đọc được MỌI phương án |
| E | Tách các tên của một câu thành nhiều mục | 3926.40 mục "Tượng nhỏ" + mục "đồ trang trí" (thành AND) | `TACH_LIET_KE` |
| E | Đuôi mở dính vào tên | 7323.10 "găng tay và các loại tương tự" | `GIA_TRI_RONG` nhận cả đuôi |

## Lỗi còn lọt (chưa có phép kiểm)

1. **Từ khoá đứng sau giới từ.** 4202.31 `tenLoai` "Các đồ vật … mang theo trong túi xách tay" kèm `tuKhoa: ["túi xách tay"]`. Chỉ
   là gợi ý dò mô tả (không vào điều kiện), nhưng dò sẽ chỉ nhầm túi xách tay vào 4202.31.
2. **Tên không phải tên hàng.** 7323.10 `value` "cọ rửa hoặc đánh bóng", `tuKhoa` "đánh bóng".
3. **Chất liệu mất chữ hình dạng.** "bằng tấm plastic" khai `chatLieu: plastic`: tu-vung không có khoá "dạng tấm".
4. **Phủ vế chưa so chiều.** "chưa tráng men" mà khai `daTrangMen: CO` vẫn được tính là phủ.

## Nhóm không qua và lý do

- **4202:** tu-vung@2 thiếu giá trị chất liệu "da thuộc" (mô hình phải khai `chuaSoHoa`, được cảnh báo `THIEU_KHOA_TU_VUNG`), và
  mô hình hay chép sai tiêu đề ("bằng plastic" thay cho "bằng tấm plastic"). Từ vòng E lời báo lỗi kèm chữ đúng của nguồn; 2/3 lần qua.
- **8544:** mô hình không ổn định ở "Cáp đồng trục và các dây dẫn điện đồng trục khác" (lúc bỏ phương án, lúc giữ chữ "khác", lúc
  tách hai mục) và ở "Dây đơn dạng cuộn".

## Kết luận

- **Chưa đạt tiêu chí chạy loạt** (≥ 4/5 nhóm qua cổng ở cả 3 lần và 0 lỗi lọt đọc tay). Gần nhất: vòng E 3/5/4 lúc chạy, nhưng có
  3 lỗi lọt; chấm lại bằng cổng cuối còn 1/5/3.
- Nhóm tiêu đề phẳng (8536, 3926, 7323) ổn định qua sau 1–3 lượt sửa. Nhóm tiêu đề ghép (8544, 4202) dao động mạnh giữa các lần
  cùng cấu hình.
- Không có mô hình pro miễn phí trên 9Router để thử.
- Đề xuất trước khi thử lại: (a) bổ sung tu-vung `chatLieu` "da thuộc", "da thuộc tổng hợp", khoá "dạng tấm"; (b) chỉ giao loạt cho
  nhóm có tiêu đề phẳng; nhóm tiêu đề ghép để mô hình mạnh soạn hoặc người soát từng bản; (c) chạy lại 5 nhóm × 3 lần với cổng
  cuối trước khi quyết.
