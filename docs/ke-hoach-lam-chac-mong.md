# Kế hoạch làm chắc móng (bản nháp, 25/11/2026)

Theo ADR-0004 và ADR-0005. Thay cho phần "lộ trình" của `docs/ke-hoach-do-thi-tri-thuc-hs.md` khi CEO duyệt. Chỉ dùng thứ đã có; không thêm tầng mới.

## 1. Hiện trạng (kiểm kê chỉ đọc, 25/11)

**Vì sao LLM tốt mà đáp án sai**

| Chỗ hỏng | Bằng chứng |
|---|---|
| Nguồn luật cũ | Chú giải Phần là bản cũ, không ghi nguồn. Phần XV dừng ở Chú giải 8, trong khi chú giải Chương 76 viện dẫn Chú giải 9(c) Phần XV. Nghi thiếu tương tự ở VI, XI, XVI (đối chiếu PDF ở lớp 1) |
| Luật lẫn lời khác | Ba trường `bao_gom`, `khong_bao_gom`, `loai_tru` dính chữ chương sau và chữ lặp; `phan_biet` (AI soạn), `tinh_chat` (máy rút) đi vào ngữ cảnh như chú giải |
| Sáu quy tắc không có nguyên văn | `lib/gir.js` là bản diễn lại |
| Móc nối hở | Một số chương chưa có điều khoản; 47 chỗ chú giải nhắc nhóm mà chưa có cạnh; chạm một nhóm chưa kéo ra chú giải Phần, Chương |
| AI đoán trước, đọc sau | Vòng 1 không có chú giải; có nhánh dừng luôn ở đó. Vòng 2 cắt phần loại trừ còn 300 ký tự |
| Máy đè AI | 5 chỗ đổi mã sau khi AI chọn; từ điển xoá nhóm khỏi hồ sơ |
| Tờ khai làm căn cứ | Bỏ phiếu hai lần ở bước tìm, rồi vào gói AI đọc |
| Chồng chéo | 79 cờ, 23 đường khai báo, 8 kho tên khác, 16 PR mở, 738 nhánh |

**Đáng giữ:** biểu thuế 11.871 dòng; chú giải nhóm 1.228 nhóm bản 2022; chú giải chương 96 chương; SEN; 1.038 ý kiến WCO; 4.908 bản ghi thông báo phân loại; hơn 46.000 cạnh; cổng ADR-0004; `phai-doc.js`.

## 2. Làm gì, theo thứ tự (xong lớp trước mới sang lớp sau)

### Lớp 0. Dừng chồng thêm — 1 ngày
- Không thêm: cờ, mục từ điển tên thương mại, bảng xung đột, cổng khớp chữ, bộ đo.
- Đóng hoặc đông lạnh PR trái ADR-0005 (#1669, #1646, #1860, #1866, #1867); #1894 chỉ giữ phần cổng và ghi vết.
- Đổi mật khẩu cơ sở dữ liệu (lộ trong nhật ký phiên 25/11).
- *Xong khi:* danh sách PR mở chỉ còn thứ phục vụ các lớp dưới.

### Lớp 1. Tài liệu gốc đủ và đúng bản — 4–6 ngày
- Nhập lại chú giải **21 Phần** từ PDF HS 2022, mỗi Phần một nút, không chép lặp theo chương.
- Sáu quy tắc: nguyên văn và chú giải chi tiết.
- Chú giải **phân nhóm** tách thành nút riêng; bổ sung Ch. 02, 51, 67 vào bảng điều khoản; 2937, 2939, 2942, 4421 bỏ phụ lục tiếng Anh dính vào.
- Ý kiến WCO: 129 ý kiến nghi sai mã để riêng tới khi soát ảnh.
- Mỗi **trường** (không phải mỗi tệp) có: nguồn, bản, hiệu lực, loại (luật / rút từ luật / bổ trợ / thực tế).
- *Xong khi:* mọi câu đối chiếu được với tài liệu gốc; mọi chỗ viện dẫn "Chú giải N Phần X" đều trỏ tới một nút có thật.

### Lớp 2. Tách lẫn, bỏ trùng — 2–3 ngày
- Bỏ khỏi kho luật: `bao_gom`, `khong_bao_gom`, `loai_tru`, `phan_biet`, `tinh_chat`. Nội dung đúng đã có ở toàn văn nhóm.
- Mỗi thứ một kho: SEN, chú giải nhóm, chú giải chương, loại trừ. Kho trùng chuyển sang đọc kho chính rồi xoá.
- Lời AI, từ điển, tên khác, tờ khai chuyển sang khu **bổ trợ**, có nhãn; không mô-đun luật nào được nạp khu này.
- *Xong khi:* cổng máy đỏ nếu kho luật chứa trường không phải luật, hoặc mô-đun luật nạp khu bổ trợ.

### Lớp 3. Sơ đồ quan hệ kín — 5–7 ngày
- Một **mã câu luật** dùng chung. Tách câu (GPU đang chạy); mọi cạnh trỏ tới mã câu.
- `phai-doc` kéo đủ: chú giải Phần, Chương, nhóm, phân nhóm, điều khoản, loại trừ hai chiều, định nghĩa, dẫn chiếu, SEN, WCO, dòng cùng cấp.
- Vá 47 chỗ nhắc nhóm chưa có cạnh; dẫn chiếu tới Phần, Chương và tới Chú giải đánh số cũng là cạnh.
- Nhãn loại ý do AI gắn là **gợi ý**, không phải điều kiện để cạnh tồn tại: câu nhắc tới đâu thì có cạnh tới đó.
- *Xong khi:* số chỗ nhắc tới mà không có cạnh = 0 trên toàn kho; chạm A thấy B thì chạm B thấy A.

### Lớp 4. MCP trả luật, không trả đống mã — 3 ngày
- `tra_cay_hs`: `phaiDoc` (#1898). `tra_chu_giai`: đúng nút, kèm đường đi tiếp.
- `tim_ma_hs`: trả **nút luật có nhắc tới hàng** kèm câu nhắc; bỏ tờ khai, bỏ từ điển khỏi thứ hạng.
- Viết lại lời dẫn của Cổng thành trình tự ADR-0004.
- *Xong khi:* không công cụ tra cứu nào trả tờ khai hay lời AI lẫn trong luật.

**MỐC QUYẾT ĐỊNH (sau lớp 4):** anh chọn 10 mặt hàng. Một LLM tốt, chỉ dùng MCP, đi từng bước và nộp sổ ghi vết. Soát bằng luật, không bằng tờ khai. Nếu chuỗi trích dẫn không dẫn tới kết luận đứng được thì **bỏ hẳn phần phân loại, chỉ giữ kho luật làm công cụ tra cứu**.

### Lớp 5. Quy trình từng bước có ghi vết — 5–7 ngày
- Mỗi bước: đề cập · đã đọc · trích · quyết định · mã khác đã so · quy tắc. Repo ghi sổ, kiểm câu trích có thật, kiểm nút bắt buộc đã đọc (dùng `lib/cong-adr-0004.js` có sẵn).
- `phan_loai_hs` chạy theo đường này: **đọc luật trước, kết luận sau**.
- *Xong khi:* không kết quả nào ra khỏi Cổng mà thiếu sổ ghi vết.

### Lớp 6. Gỡ phần máy đè AI — làm ngay sau lớp 5, 3–4 ngày
Thứ tự: cờ chết và động cơ cũ → từ điển đổi mã và xoá nhóm → tờ khai trong tìm và trong gói → chốt dòng 8 số, đôn thông báo trùng tên (hạ thành cảnh báo) → chốt sớm. Gỡ nhóm nào thì xoá mã nhóm đó.
- *Xong khi:* số chỗ đổi mã sau khi AI kết luận = 0; cờ `HS_*` từ 79 xuống dưới 40.

### Lớp 7. Bồi đắp (khi thừa token)
Bách khoa cấu tạo, nguyên lý, tên gọi khác: gắn vào nút luật, có kiểm duyệt, nhãn bổ trợ.

## 3. Thời gian
Cộng các lớp 0–4: 15–20 ngày làm việc tới mốc quyết định; thêm 8–11 ngày cho lớp 5–6. Đây là ước lượng; phần chưa chắc nhất là lớp 1 (chất lượng PDF) và lớp 3.

## 4. Cách làm
- Một lớp một lúc. Mỗi lớp một cổng máy kiểm **dữ liệu**; không chạy bộ chấm mã.
- Mỗi ngày báo CEO một dòng: lớp nào, còn bao nhiêu chỗ hở.
- GPU: tách câu, rồi tách chú giải phân nhóm. Thợ khác chỉ nhận việc trong lớp đang làm, có cổng máy.
- Đường khách giữ nguyên tới lớp 6, trừ sửa lỗi làm khách hỏng việc.
