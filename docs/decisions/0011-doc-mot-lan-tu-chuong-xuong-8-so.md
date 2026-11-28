# ADR-0011 — Đọc một lần từ chương xuống dòng 8 số; tiêu chuẩn QT cho cơ sở dữ liệu luật

- Trạng thái: CHẤP NHẬN (QT, 28/11/2026, theo chỉ đạo CEO 28/11)
- Thay phần cách làm của ADR-0008, ADR-0009 và ADR-0010 mục 3, 6, 7. Giữ ADR-0010 mục 1 (chấm đúng/sai, báo "dùng N lần thì mấy lần sai") và mục 2 (gói đủ luật, kéo nhóm cạnh tranh bằng `timCgct`). Đứng dưới ADR-0004 và ADR-0005.

## Bối cảnh

CEO 28/11: *"đọc 1 lần ra tất cả những gì cần để tạo thành cơ sở dữ liệu, chỗ nào còn mơ hồ bắt LLM mạnh đi giải thích, chứng minh, phản biện. rồi bắt nó hệ thống hóa lại luôn theo tiêu chuẩn của QT. làm từ 2 số trước, 4 số, 6 số, 8 số. vừa làm vừa bắt nó xây skill, tạo luôn sổ tay vì sao hay bị tra sai, sau còn đóng gói thành bài viết nghiên cứu khoa học."*

Cách cũ xây quanh cổng kiểm: mô hình rẻ soạn, cổng bắt lỗi, sai thì sửa cổng. Cổng chỉ kiểm được hình thức, không kiểm được nghĩa luật. Muốn ép đúng nghĩa bằng cổng thì phải viết cổng cho từng dòng biểu, tức là tự viết đáp án. Vòng thử 4 nhóm ra 12/191 ca mã sai (khoảng 16 lần dùng có 1 lần sai). Gốc là gói thiếu luật và người soạn đọc sai, không phải thiếu cổng.

## Quyết định

### 1. Người làm

- **Người đọc**: mô hình mạnh nhất không tốn tiền mới. agy dùng Gemini Pro hoặc Claude trong gói Antigravity (không tốn hạn mức Claude Max). Gemini bản nhẹ không làm người đọc.
- **Người phản biện**: một mô hình mạnh khác với người đọc. Ví dụ người đọc là Gemini Pro thì phản biện là Claude trong Antigravity.
- **QT**: viết và giữ tiêu chuẩn (mục 3), chấm kết quả thử so với bảng vàng, quyết khi nào mở rộng.
- **Máy**: dựng gói đủ luật và kiểm một điều tất định: câu trích có thật nguyên văn và gắn đúng câu nguồn. Máy không phán đúng sai. Cổng 6–14 cũ chỉ còn là cảnh báo cho người đọc, không phải điều kiện nghiệm thu.

### 2. Trình tự cho mỗi chương

1. **Bậc 2 (chương).** Máy dựng gói chương: chú giải phần, chú giải chương, chú giải tổng quát, tên mọi nhóm, và nhóm hoặc chương cạnh tranh do `timCgct` tìm. Người đọc đọc trọn một lần, ghi bản ghi `CHUONG` và danh sách `DIEM_MO_HO`.
2. **Bậc 4.** Với từng nhóm, đọc trọn gói nhóm (`goi-nhom.mjs`) một lần, lấy bản ghi `CHUONG` làm bối cảnh. Ghi bản ghi `NHOM` và `DIEM_MO_HO`.
3. **Bậc 6, rồi bậc 8.** Làm như bậc 4, lấy bản ghi bậc trên làm bối cảnh. Mỗi mã có điều kiện phân biệt với từng anh em cùng cấp. "Loại khác" là phần bù của các anh em, liệt kê bằng điều kiện.
4. **Điểm mơ hồ.** Mỗi `DIEM_MO_HO` đi đúng **một vòng**:
   - người phản biện viết *giải thích*, *chứng minh* (chỉ bằng câu luật nguyên văn, chú giải chi tiết và GIR), *phản biện* (lập luận mạnh nhất cho cách hiểu kia), rồi *kết luận*;
   - người đọc xem lại: đồng ý thì chốt; không đồng ý thì ghi cả hai cách hiểu và kết luận CHƯA ĐỦ DỮ KIỆN, kèm câu phải hỏi khách.
   - Không lặp vòng.
5. **Hệ thống hoá.** Người đọc gom kết quả về đúng tiêu chuẩn mục 3. Máy kiểm câu trích có thật.
6. **Vừa làm vừa ghi** (mục 4): cập nhật skill, sổ tay tra sai, sổ tay phương pháp.

### 3. Tiêu chuẩn QT — mỗi bản ghi phải có

Chung cho mọi bản ghi: `ma`, `ten` (nguyên văn biểu), `canCu: [{idCau, trich}]` (nguyên văn), `nguoiDoc` (tên mô hình), `vanTayGoi`.

- **`CHUONG` (2 số)**
  - `phamVi`: hàng thuộc chương, kèm câu luật;
  - `loaiTru`: hàng bị đẩy sang chương khác, kèm chương đích và câu luật;
  - `dinhNghia`: thuật ngữ được chú giải định nghĩa;
  - `uuTien`: quy tắc ưu tiên trong chương;
  - `trucChinh`: các trục chia nhóm của chương (vật liệu, chức năng, cấu tạo, công dụng…), mỗi trục kèm câu luật;
  - `canhTranh`: chương hay bị nhầm, kèm câu phân ranh.
- **`NHOM` (4 số)**
  - `dieuKienCanDu`: hàng thuộc nhóm khi nào, kèm câu luật;
  - `loaiTru`: nhóm đích và câu luật;
  - `canhTranh`: mỗi nhóm `timCgct` xếp trên nhóm này phải có câu phân ranh, hoặc lý do không cạnh tranh có trích;
  - `trucPhanNhom`: trục chia xuống 6 số.
- **Bậc 6 và 8**: dùng lại khuôn `DIEU_KIEN` và bảng anh em đã có (ADR-0007), gồm trục, giá trị, `trich`, phần bù "Loại khác", `cauHoi`. Thêm `ketQua` cho từng mã: ĐÚNG khi có đủ câu luật ở mọi bậc trên đường đi và mọi anh em bị loại bằng câu luật; nếu không thì CHƯA ĐỦ DỮ KIỆN kèm câu hỏi.
- **`DIEM_MO_HO`**: `cauHoi` (câu hỏi pháp lý), `cachHieu[]`, `giaiThich`, `chungMinh[]` (trích), `phanBien`, `ketLuan` (CHỐT / CHỐT KÈM GIẢ ĐỊNH / CHƯA ĐỦ DỮ KIỆN), `cauHoiKhach`, `nguoiPhanBien`.

### 4. Sản phẩm đi kèm

- **Skill** `.agents/skills/doc-mot-lan/`: cách đọc từng bậc. Người đọc tự cập nhật sau mỗi chương, kèm ví dụ thật.
- **Sổ tay vì sao hay tra sai** `docs/so-tay-tra-sai/<chương>.md`: mỗi mục ghi hàng hay bị khai nhầm vào đâu, vì sao nhầm (tên thương mại, chức năng chính, vật liệu, bộ phận…), và câu luật gỡ.
- **Sổ tay phương pháp** `docs/nghien-cuu/doc-mot-lan.md`: ghi cách làm, số đo từng chương, các kiểu mơ hồ gặp được. Sau thí điểm, đây là chất liệu cho bài nghiên cứu khoa học.

### 5. Thí điểm và đo

- Thí điểm **Chương 94**: 6 nhóm. Chương có bảng vàng 94.05 để so.
- QT chấm 94.05 so với bảng vàng theo đúng/sai, báo "dùng N lần thì mấy lần sai".
- Đạt 0 lần sai thì mở rộng theo thứ tự chương khách hỏi nhiều (`data/ho-so-ma/thu-tu-cuon-chieu.json`, gom theo chương).
- Không đạt thì tìm gốc ở gói hoặc ở người đọc, không thêm cổng.
- Hàng đợi M-81 theo nhóm dừng hẳn; các khoá `m81-nhom/*` nhả sau khi thí điểm có kết quả.
