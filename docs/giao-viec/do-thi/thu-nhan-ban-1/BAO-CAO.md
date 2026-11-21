# Thử nhân bản lần 1: AI rẻ soạn `tieuChi6` cho 3 nhóm

Ngày 21/11/2026 · mã việc G6-1 · KHÔNG nhóm nào ở đây được áp vào `data/so-tay/`.

## Phép đo

- **Đầu vào của mô hình:** đúng hai thứ: tệp [`../SOAN-TIEU-CHI-6-SO.md`](../SOAN-TIEU-CHI-6-SO.md) (làm lời hệ thống) và gói soạn
  `node scripts/goi-soan-tieu-chi-6.mjs --nhom=XXXX`. Không ví dụ thêm, không sửa tay giữa các lượt.
- **Mô hình:** `ag/gemini-3-flash` qua 9Router trên .131 (kênh Gemini miễn phí), `temperature: 0`. Tổng 26 lượt gọi, 418.703 token.
- **Vòng sửa:** lượt 1 soạn; nếu cổng `scripts/kiem-tieu-chi-6.mjs` trả lỗi thì gửi lại nguyên danh sách lỗi, tối đa 2 lượt sửa.
- **Nhóm:** 8536 (thiết bị đóng ngắt điện, 10 phân nhóm, 207 dòng tờ khai mẫu), 3926 (sản phẩm nhựa khác, 5 phân nhóm, 370
  dòng), 7323 (đồ gia dụng sắt thép, 6 phân nhóm, 74 dòng). Hạng 2, 1, 15 trong các nhóm chưa có `tieuChi6`.
- **Ba lần chạy.** Sau mỗi lần, đọc tay bản đã qua cổng, tìm lỗi lọt, thêm luật + phép kiểm + ca tiêm lỗi, rồi chạy lại từ đầu.
  Lệnh chạy có gọi LLM nên không nằm trong repo; đầu ra từng lượt ở `lan-N/<nhóm>/luot-K.json`, số đếm ở `nhat-ky.json`.

## Kết quả

Số trong ô: số lỗi cổng trả ở lượt 1 → lượt 2 → lượt 3.

| Nhóm | Lần 1 (cổng bản đầu) | Lần 2 (thêm 7 phép kiểm, máy xếp thứ tự) | Lần 3 (thêm 4 phép kiểm) |
|---|---|---|---|
| 8536 | 10 → 3 → 6, KHÔNG qua | 5 → 2 → 0, qua sau 2 lượt sửa | 5 → 3 → 5, KHÔNG qua |
| 3926 | 2 → 2 → 3, KHÔNG qua | 2 → 1 → 0, qua sau 2 lượt sửa | 3 → 2 → 1, KHÔNG qua |
| 7323 | 12 → 1 → 0, qua sau 2 lượt sửa | 7 → 5 → 10, KHÔNG qua | 2 → 0, qua sau 1 lượt sửa |
| Qua cổng | 1/3 | 2/3 | 1/3 |

Đọc bảng: cổng càng chặt thì bản qua được càng sạch, nhưng mô hình này chỉ tự qua 1/3 nhóm. Hai nhóm còn lại dừng ở cổng
(đúng ý: không lọt), không phải dừng vì cổng sai.

## Lỗi cổng BẮT được (mô hình tự sửa được hay không)

| Mã lỗi | Ở đâu | Sửa được trong 2 lượt? |
|---|---|---|
| `SUY_RONG` | 7323 lần 1: bịa chất liệu "gang" cho câu trích "Loại khác"; 3926 lần 3: `value` tự ghép "đồ dùng trong trường học" | có |
| `TIEN_LE_SAI` | 8536, 3926: gắn thông báo của phân nhóm khác | có |
| `THIEU_VE_TRU` | 7323: "Bằng sắt (trừ gang đúc) hoặc thép" không có mục phủ định | có |
| `TRUNG_DIEU_KIEN` | 7323: 732391 và 732392 cùng "gang", thiếu "tráng men" | có |
| `KHUON_SAI` (khoá số thiếu `donVi`, `value` là chuỗi) | 8536: "điện áp không quá 60 V" | chỉ sau khi lời báo lỗi nêu ví dụ |
| `LIET_KE_MOT_CHUOI` | 8536 "Đui đèn, phích cắm và ổ cắm"; 3926 "Phụ kiện lắp vào đồ nội thất, trên thân xe…" | KHÔNG ổn định: sửa chỗ này hỏng chỗ khác |
| `TEN_LOAI_SAU_GIOI_TU` | 8536: lấy "sợi quang, cáp quang" làm tên loại của "Đầu nối dùng cho sợi quang…" | có: lượt sau ra đúng `tenLoai: "Đầu nối"` + `dungCho` |
| `THU_TU_SAI` / `DU_KHONG_CUOI` (lần 1) | cả 3 nhóm: mọi phân nhóm `thuTu: 1`, hoặc mỗi mục một số | KHÔNG → bỏ hẳn khỏi việc của AI, máy xếp |

## Lỗi LỌT cổng (đọc tay thấy) và phép kiểm đã thêm

| Lần | Lỗi lọt | Ví dụ | Đã thêm |
|---|---|---|---|
| 1 | Cổng tự sai: coi mọi tiêu đề "… khác" là phần còn lại trần | 8536.30 "Thiết bị bảo vệ mạch điện khác", 3926.40 "Tượng nhỏ và các đồ trang trí khác" bị cấm mang điều kiện → hai phân nhóm trùng nhau, mô hình không thể qua | Ba kiểu `CO_TEN` / `DU` / `DU_CO_PHAM_VI`; cảnh báo `DU_CAN_NGUOI_XEM` |
| 1 | Bắt AI ghi `thuTu` | xem trên | `thuTuMay()`: máy xếp; AI chỉ khai `uuTien` |
| 1 | Dùng `tenLoai` cho thuộc tính | 7323.91 `tenLoai: "Bằng gang đúc, chưa tráng men"` | `SAI_KHOA_THUOC_TINH` + mục `chuaSoHoa` khi thiếu khoá (`THIEU_KHOA_TU_VUNG`) |
| 1 | Lấy thứ bị trừ làm dấu hiệu | 7323.94 `tuKhoa: ["gang đúc"]` từ "(trừ gang đúc)" | `TU_KHOA_TRONG_VE_TRU`, `THIEU_VE_TRU` |
| 1 | Từ khoá chung của nhiều phân nhóm | "gang đúc" ở 732391 khớp cả tiêu đề 732392; đo trên tờ khai chỉ sai 12/74 | `TIEU_DE_CHI_LAC`: áp tiêu chí lên chính tiêu đề của từng phân nhóm |
| 1 | Cả danh sách trong một chuỗi | 8536.61 `value: "Đui đèn, phích cắm và ổ cắm"` | `LIET_KE_MOT_CHUOI` |
| 1 | Bỏ điều kiện của tầng | (chưa xảy ra, thấy khi viết luật L7) | `THIEU_DIEU_KIEN_TANG` |
| 2 | `value` chép cả chữ "khác" | 8536.30 `value: "Thiết bị bảo vệ mạch điện khác"` | `TEN_CO_CHU_KHAC` |
| 2 | Tên loại là thứ hàng dùng cho | 8536.70 `tenLoai: ["sợi quang", "cáp quang"]` (cáp quang sẽ bị chỉ vào đầu nối) | `TEN_LOAI_SAU_GIOI_TU` |
| 2 | Từ khoá là chữ chung | 3926.30 `tuKhoa: ["Phụ kiện", …]`: chỉ sai 13/36 dòng có kết luận nhưng dưới ngưỡng 10% tổng | `TU_KHOA_QUA_CHUNG`; ngưỡng cảnh báo thêm "sai quá 25% số dòng có kết luận" |
| 2 | Hướng dẫn mơ hồ về tầng "Loại khác" | 7323: mỗi phân nhóm thêm một mục rỗng trích "73239 Loại khác", không tự gỡ được | Gói soạn không đưa tầng tên "Loại khác"; lỗi "mục rỗng: xoá mục này" |

## Lỗi CÒN lọt sau lần 3 (chưa có phép kiểm)

1. **Bỏ vế của tiêu đề.** 7323.94 "Bằng sắt (trừ gang đúc) hoặc thép, đã tráng men": bản qua cổng có chất liệu + vế trừ nhưng
   thiếu `daTrangMen: CO`. Tiêu chí vì thế RỘNG hơn chữ luật (đồ thép chưa tráng men cũng thoả). Đây đúng là lớp lỗi "suy rộng"
   đã làm 196/377 sổ ranh giới bị trả về, ở dạng thiếu điều kiện chứ không phải thừa chữ. Cổng kiểm từng mục, chưa kiểm "mọi vế
   của tiêu đề đã có mục phủ". `lib/ho-so/tach-ve.js` (cổng 5 của sổ ranh giới) không tách được vế này khi không có bản tiếng Anh.
2. **Tên không phải tên hàng.** 7323.10 `value: […, "cọ rửa", "đánh bóng", …]`: "đánh bóng" là việc, không phải hàng.
3. **Lạm dụng `chuaSoHoa`.** Lần 2, 8536.61/.69: khai "thiếu khoá" cho "Đui đèn, phích cắm và ổ cắm" trong khi `tenLoai` dùng
   được. Chỉ có cảnh báo `THIEU_KHOA_TU_VUNG`.
4. **`DU_CO_PHAM_VI` chọn sai.** 3926.40 "Tượng nhỏ và các đồ trang trí khác" là tên riêng, mô hình vẫn khai `phanConLai`. Chỉ có
   cảnh báo `DU_CAN_NGUOI_XEM`.
5. **Chọn câu trích yếu.** Mô hình gần như chỉ trích tiêu đề; chú giải chi tiết nhóm có câu định nghĩa rõ hơn thì ít dùng (trừ
   3926.20 "trừ đồ chơi", dùng đúng). Cổng không đo "có câu tốt hơn mà không dùng".

## Kết luận cho việc nhân bản ~100 nhóm

- **Chưa giao hàng loạt cho `gemini-3-flash` một mình.** Nhóm tiêu đề phẳng, mỗi phân nhóm một ý (7323) thì qua. Nhóm có tiêu đề
  ghép ("A, B và C", "X lắp vào A, B hoặc tương tự") thì dao động: sửa lỗi này sinh lỗi kia, 2 lượt sửa không đủ.
- **Cổng đang chặn đúng chiều:** bản không đạt thì không ghi được vào sổ tay (`--ap` từ chối). Rủi ro còn lại nằm ở 5 lỗi lọt
  trên, trước hết là lỗi 1.
- **Việc cần trước khi chạy loạt:** (a) phép kiểm "phủ vế" cho tiêu đề phân nhóm; (b) quyết một trong hai: cho 3–4 lượt sửa, hoặc
  chuyển nhóm tiêu đề ghép sang mô hình mạnh hơn (quyết định về hạn mức, thuộc CEO theo kế hoạch mục 10.2); (c) người hoặc mô
  hình mạnh đọc mọi cảnh báo `DU_CAN_NGUOI_XEM`, `THIEU_KHOA_TU_VUNG`, `LECH_TO_KHAI_CAO` trước khi áp.
- **Thiếu khoá từ vựng** lộ ra ngay ở mẫu: tu-vung@2 chưa có khoá nguồn động lực (thủy lực / khí nén) và kiểu chuyển động (tịnh
  tiến / quay). Mẫu 8412 đang ghi bằng `tenLoai`.
