# ADR-0002 — Đồ thị tri thức: tìm kiếm chọn nhóm, đi cạnh xuống mã

- **Ngày:** 21/11/2026
- **Trạng thái:** CEO duyệt hướng và thứ tự giai đoạn 21/11/2026. PR này là giai đoạn 1 (chỉ dựng bảng cạnh + cổng máy).
- **Người quyết:** CEO; QT soạn.
- **Thay thế:** không. Bổ sung ADR-0001 (luật đường khách vẫn giữ nguyên, thêm một cổng máy).
- **Kế hoạch đầy đủ:** [`docs/ke-hoach-do-thi-tri-thuc-hs.md`](../ke-hoach-do-thi-tri-thuc-hs.md).

## Bối cảnh

Kho tri thức là các tệp rời, chỉ nối với nhau qua mã HS: muốn đọc tri thức của một mã thì phải đoán đúng mã trước.
Số đo ngày 21/11/2026 (QT đo trên kho, không LLM):

- 99,8% tri thức nằm sau bước AI đoán mã; 14.101 mục luật (sổ tay, chú giải, sổ PN6) chỉ mở được bằng mã.
- 76% cạnh loại trừ trong sổ tay chỉ có một chiều: sổ 84.81 nhắc sang 84.12, sổ 84.12 không nhắc lại.
- Ca van điện từ khí nén 5/2: kho có đủ đáp án (2 thông báo phân loại, 37 tờ khai mẫu, chú giải) nhưng máy ra `848180`
  (sáng) rồi `841221` (trưa); mã đúng `84812090`.

Nghiên cứu cùng ngày (3 bài báo 2026 + thử trên 2.000 tờ khai của OZ): với AI yếu, chọn nhóm 4 số bằng tìm kiếm; từ 4 số
xuống 6 và 8 số thì đi theo cạnh, mỗi bước AI chỉ đọc phần phân biệt.

## Quyết định

1. **Không đổi chỗ chứa.** Nút là chính các tệp đang có. Đồ thị là **bảng cạnh do máy sinh** từ các tệp đó
   (`lib/do-thi/dung-bang-canh.js`, lệnh `node scripts/dung-bang-canh.mjs`), tất định, không LLM, không sửa tệp gốc.
2. **Mỗi cạnh có trích nguyên văn và nguồn.** Khuôn: `{id, loai, bac, tu, toi, dieuKien?, trich, nguon, sinhTuDong, goc?}`.
   Cạnh thiếu `trich` hoặc `nguon` không được xuất, đếm theo lý do.
3. **Thứ bậc khi cạnh nói ngược nhau** (trường `bac`): 1 = luật có trích nguyên văn (C5, C6, C7, C11; sau này C9);
   2 = thông báo phân loại của hải quan; 3 = tờ khai mẫu OZ (C14). Tờ khai cũ không được tự mở nhánh dừng sớm khi đang bị
   bậc 1 hoặc bậc 2 phản đối. Chỉ nhận mã còn trong biểu thuế hiện hành; mã không còn thì đếm riêng, không xuất cạnh.
4. **Giai đoạn 1 dựng các cạnh máy sinh được ngay:** C5 loại trừ, C6 loại trừ ngược (đảo C5, 1-1), C7 phân biệt, C8 dễ
   nhầm, C11 tên riêng thắng "loại khác" (mức 6 số và 8 số), chỉ mục C1 gộp các kho cụm từ, hàm C14 `tienLeUngHo()`.
5. **Hai chế độ đi cạnh ngang tách riêng:** `moRongUngVien()` được kéo nhóm chưa là ứng viên, chỉ khi điều kiện của chính
   dòng loại trừ khớp mô tả hàng, có trần; `canhGiuaNhomConSong()` chỉ trả cạnh giữa các nhóm đã có.
6. **Bảng cạnh ở RAM, không commit.** Đo thật: 34.219 cạnh ≈ 19,6 MB + chỉ mục C1 ≈ 4,8 MB, vượt ngưỡng 5 MB. Repo chỉ
   commit số đếm `data/do-thi/thong-ke.json` và bảng xếp hạng lượng hàng `data/do-thi/xep-hang-luong-hang.json`.
7. **Thêm một cổng máy** vào `npm test`: `scripts/test-bang-canh.mjs`. Đỏ khi dựng lại không giống hệt; có cạnh thiếu
   trích / nguồn; có cạnh mồ côi; số cạnh lệch tệp thống kê quá ngưỡng; C6 không khớp 1-1 với C5; ca khoá van khí nén
   không đi được; có tệp ngoài `lib/do-thi/` nạp bảng cạnh mà bảng đấu nối chưa khai.
8. **Mọi đường đọc cùng một bảng cạnh.** `data/luat/dau-noi.json` có kho `bangCanh`; giai đoạn 1 mọi đường khai `khong`.
9. **Mỗi giai đoạn sau nằm sau công tắc mặc định tắt** (L1), bật trên máy thật để đo, không đạt thì tắt.

## Phương án đã loại

| Phương án | Vì sao loại |
|---|---|
| Nạp nguyên sổ tay của nhiều nhóm vào một lượt LLM | Gói vòng 2 từ ~5,5 nghìn lên ~22 nghìn ký tự khi nạp 5 nhóm (đo 21/11, `HS_TIM_TRUOC_NAP=5`); AI yếu đọc loãng, chậm và đắt hơn. Thay bằng gói phân biệt 6–7 nghìn ký tự cắt theo cạnh giữa các nhóm còn sống |
| Mô hình xếp hạng lại (reranker) có sẵn trên mạng | Thử nghiệm ngày 21/11 trên tờ khai OZ cho kết quả tệ đi |
| Cơ sở dữ liệu đồ thị riêng | Bảng cạnh ~25 MB nằm gọn trong RAM; thêm một dịch vụ là thêm chỗ hỏng và chỗ lệch với tệp gốc. Khi bảng vượt sức chứa bộ nhớ mới tính lại |
| Huấn luyện / tinh chỉnh mô hình riêng | Biểu thuế và chú giải đổi theo thông tư; mô hình tinh chỉnh không trích được nguyên văn làm căn cứ và phải huấn luyện lại mỗi lần đổi |

## Hệ quả

- **Một vào – một ra (bắt buộc).** Mỗi giai đoạn bật thật phải kèm danh sách thứ bị thay và ngày gỡ; không gỡ thì không
  tính là xong giai đoạn (kế hoạch mục 6.1). Số cờ `HS_*` không được tăng ròng: mốc lúc mở PR này là 75 cờ trong
  `data/luat/bang-co.json` (21 cờ đổi quyết định LLM, 2 cờ có chế độ bóng), ghi ở `data/do-thi/thong-ke.json` mục
  `mocSoCo`. PR giai đoạn 1 không thêm cờ nào.
- **Giai đoạn 1 không đổi gì trên đường khách.** Không route nào nạp `lib/do-thi/`; cổng máy giữ điều đó.
- Sửa sổ tay, từ điển cặp dễ nhầm, tiền lệ hay biểu thuế làm đổi bảng cạnh. Lệch trong ngưỡng (max 20 cạnh, 2%) thì cổng
  không đỏ; lệch hơn thì chạy `node scripts/dung-bang-canh.mjs --ghi` và commit `data/do-thi/` cùng PR.
- Dựng bảng mất ~7,5 giây và ~100 MB RAM (đo trên .131). Giai đoạn 2 phải quyết cách nạp lúc khởi động trước khi nối.
- C6 sinh 5.196 cạnh (1-1 với C5), trong đó 3.947 cạnh là chiều mà sổ tay bên kia chưa tự ghi. Cạnh ngược có thể gây
  nhiễu (một nhóm bị trỏ từ hàng chục nhóm): chỉ kích hoạt khi điều kiện khớp mô tả, hoặc khi cả hai đầu là ứng viên.
- C8 từ từ điển cặp dễ nhầm mang bậc 4 (mọi mục `verified: false`): chỉ để gợi ý, không để chốt.

## Giới hạn đã biết của giai đoạn 1

- `tuKhoaDieuKien` / `tuKhoaTuTieuDe` là âm tiết không dấu rút bằng luật, chưa tách từ. Luật khớp ("âm tiết nội dung đầu
  tiên của điều kiện phải có trong mô tả") chưa đo tỉ lệ kéo oan trên bộ ca thật; đo ở giai đoạn 2.
- C11 mức 8 số chỉ phủ dòng "Loại khác…"; dòng "phần còn lại có tên" ("Bằng vật liệu khác") chưa có cạnh. 1.464 cạnh
  mang `dinhNghiaDuoc: false` (cây gộp nhánh / tiêu đề bị lược tên) chỉ nên dùng để gợi ý.
- C1 gộp chỉ dựng chỉ mục và hàm đọc; chưa hàm tìm nào đổi hành vi. 17 cụm mâu thuẫn nhóm giữa các kho chưa xử.
- C9 (chú giải phần / chương), C10, C12, C13, C2–C4 chưa dựng: thuộc giai đoạn sau.

## Việc tiếp theo

- Giai đoạn 0 (số nền trên máy thật) và giai đoạn 2 (tìm ứng viên đủ nguồn, mọi hàm tìm đọc bảng C1 gộp).
- Nối `tienLeUngHo()` vào cả bốn nhánh dừng sớm (`data/luat/dau-noi.json` mục `nhanhBoQua`, trường `phepKiemTienLe`).
- Giai đoạn 6 chỉ soạn cạnh cho các nhóm chiếm 80% lượng hàng: theo `data/do-thi/xep-hang-luong-hang.json` là 93 nhóm.
