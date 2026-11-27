# Thử tay thẻ định danh nút — nhóm 85.43, dòng 8543.70.90 "Loại khác"

QT làm tay ngày 27/11/2026, theo bản nháp khuôn `dinh-danh@1` (M-36, #1923). Mục đích: trước khi giao máy chạy toàn biểu, tự làm một ca khó, ghi lại cách nghĩ, chỗ dễ sai, và tự phản biện ba câu CEO đặt.

Chọn 85.43 vì nó là "Loại khác" ba tầng: nhóm 85.43 tự nó là phần còn lại của cả Danh mục; phân nhóm 8543.70 "Máy và thiết bị khác" là phần còn lại của nhóm; dòng 8543.70.90 là phần còn lại của phân nhóm.

## 1. Hiện trạng trước khi làm (đo trên `main`)

- Máy ghép `hoSo("85437090")`: 113 vấn đề trên đường đi, **không báo thiếu**. Nhưng ở cấp dòng chỉ có **một** bản ghi: `TACH_ANH_EM` "không thuộc 6 anh em có tên".
- Tóm tắt nút (M-36) của 8543.70.90: một ý "Phần còn lại trong 'Máy và thiết bị khác' sau: [6 tên anh em]".
- Ở cấp nhóm 85.43 có **65 bản ghi PHAI_LA**, rút từ danh sách 18 loại thiết bị trong Chú giải chi tiết. **Không bản ghi nào được đưa xuống phân nhóm hay dòng 8 số.**

→ Chỗ hở cấu trúc thật: ví dụ của luật **có**, nhưng dừng ở cấp nhóm. Không khâu nào chịu trách nhiệm "định tuyến" ví dụ xuống đúng dòng. Một LLM đọc dòng "Loại khác" chỉ thấy cái lỗ, dù luật đã cho sẵn khoảng 10 loại hàng thuộc đúng dòng này.

## 2. Định tuyến 18 ví dụ của Chú giải chi tiết 85.43 xuống dòng 8 số

Cách làm từng ví dụ: (1) đọc câu ví dụ; (2) so lần lượt với điều kiện của **anh em cùng cấp** từ phân nhóm xuống dòng (chỉ so cùng cấp — Quy tắc 6); (3) nếu vừa một anh em có tên → về đó; nếu không vừa anh em nào → về "Loại khác"; (4) nếu tuỳ dữ kiện → ghi rõ dữ kiện quyết định và cả hai nhánh.

| # | Ví dụ (câu luật) | Về đâu | Lý do / dữ kiện quyết định |
|---|---|---|---|
| 1 | Máy gia tốc hạt (`ct:5#1`) | 8543.10.00 | Trùng tên phân nhóm. Riêng loại đặc biệt để tạo tia X → 90.22 (`ct:10#1`) |
| 2 | Máy phát tín hiệu, máy phát xung, xung chuẩn, quét (`ct:11`) | 8543.20.00 | Trùng tên phân nhóm |
| 3 | Máy dò mìn, máy dò vật kim loại ngoại lai, dò ống chôn (`ct:12`) | **8543.70.90** | Không vừa 6 anh em có tên của 8543.70 |
| 4 | Bộ trộn tín hiệu micro, bộ điều chỉnh tần số (`ct:13`) | 8543.70.60 **hoặc** **8543.70.90** | Dữ kiện: *xử lý tín hiệu kỹ thuật số* **và** *kết nối được mạng có dây/không dây* → .60; thiếu một trong hai → .90. Thiết kế đặc biệt cho điện ảnh → 90.10 (`ct:13#4`) |
| 5 | Bộ giảm nhiễu dùng với máy ghi âm (`ct:14`) | **8543.70.90** | Không vừa anh em có tên |
| 6 | Thiết bị xông kính, chống sương mờ bằng điện trở cho phương tiện bay, tàu thuỷ, tàu hoả… (`ct:15`) | **8543.70.90** | Trừ loại cho xe đạp, xe có động cơ → 85.12 |
| 7 | Thiết bị đồng bộ máy phát (`ct:16`) | **8543.70.90** | Không vừa anh em có tên |
| 8 | Thiết bị kích nổ mìn bằng điện (dynamo + tụ) (`ct:17`) | **8543.70.90** | Không vừa anh em có tên |
| 9 | Máy khuếch đại trung tần, cao tần (`ct:18`) | 8543.70.50 **hoặc** **8543.70.90** | Dữ kiện: *có phải bộ khuếch đại vi sóng*. SEN ghi vi sóng "thường… khoảng 300 MHz hoặc cao hơn" — câu mô tả, **không** phải ngưỡng (Luật 6) |
| 10 | Máy, thiết bị mạ điện, điện phân, điện di (`ct:19`) | 8543.30.xx | Trùng tên phân nhóm; trừ máy nhóm 84.86 và dụng cụ đo điện di 90.27 |
| 11 | Thiết bị điện tử cho thuốc lá điện tử, EHTS (`ct:20–24`) | 8543.40.00 | Trùng tên phân nhóm; loại dùng một lần, hộp chứa → 24.04 (`ct:33`, `ct:34`) |
| 12 | Thiết bị phát tia cực tím dùng trong công nghiệp (`ct:25`) | 8543.70.40 **hoặc** **8543.70.90** | Dữ kiện: *đóng rắn vật liệu bằng tia cực tím trong sản xuất tấm mạch PCB/PWB/PCA* → .40; công dụng khác → .90 |
| 13 | Thiết bị phát và khuếch tán ôzôn, không nhằm mục đích y học (`ct:26`) | **8543.70.90** | Không vừa anh em có tên |
| 14 | Mô-đun nhạc điện tử gài vào đồng hồ, tách chén, thiếp (`ct:27`) | **8543.70.90** | Không vừa anh em có tên |
| 15 | Máy cung cấp năng lượng cho hàng rào điện (`ct:28`) | 8543.70.10 | Trùng tên dòng |
| 16 | Thiết bị hồng ngoại không dây điều khiển từ xa (`ct:29`) | 8543.70.21 / 8543.70.29 | Không phải sóng radio (tiêu đề 8543.70.2); dùng cho máy trò chơi điện tử video (trừ bộ điều khiển nhóm 95.04) → .21; còn lại → .29 |
| 17 | Thiết bị điện phát quang dạng dải, tấm, bảng (`ct:30`) | **8543.70.90** | Không vừa anh em có tên |
| 18 | Máy ghi dữ liệu chuyến bay kỹ thuật số (`ct:31`) | 8543.70.50 | Trùng tên dòng |

Kết quả: **8 ví dụ chắc chắn** về 8543.70.90 (#3, 5, 6, 7, 8, 13, 14, 17), **3 ví dụ rẽ nhánh theo dữ kiện** (#4, 9, 12). Trước khi làm: 0.

## 3. Thẻ định danh 8543.70.90 (làm tay)

- **phamViDuong** (phải là — tích luỹ qua các cấp):
  1. Thiết bị, dụng cụ **điện**, không nằm trong nhóm nào khác của Chương 85, cũng không ở chương nào khác của Danh mục, không ở Chú giải pháp lý Phần XVI hay Chương 85 (`nhom:8543:ct:1#1`).
  2. Có **chức năng riêng** (`ct:2#1`).
  3. Phần lớn hoạt động hoàn toàn bằng điện; được có tính năng cơ học **nếu chỉ phụ trợ** chức năng điện (`ct:3#1`, `ct:3#2`).
  4. Không phải máy gia tốc hạt, máy phát tín hiệu, máy mạ điện/điện phân/điện di, thiết bị thuốc lá điện tử (anh em cấp 6 số → vào 8543.70).
- **trucTach** (cấp 8543.70): một trục — **chức năng/loại thiết bị gọi tên**. Sáu giá trị đã có tên: cấp năng lượng hàng rào điện · điều khiển từ xa không bằng sóng radio · phiên dịch, từ điển · tách bụi, khử tĩnh điện, đóng rắn UV trong sản xuất PCB · khuếch đại vi sóng, ghi dữ liệu chuyến bay, đầu đọc điện tử di động · xử lý tín hiệu số nối mạng để trộn âm thanh, thiết bị thiết kế đặc biệt để nối mạng điện thoại/điện tín.
- **phanBu**: thiết bị điện có chức năng riêng mà chức năng **không thuộc** sáu giá trị trên.
- **duKienToiThieu** (để khẳng định .90 phải biết đủ):
  1. Chức năng chính của thiết bị là gì (để loại 6 anh em).
  2. Có nhóm nào khác của Danh mục mô tả cụ thể hơn không — đặc biệt Chương 84, 90, các nhóm khác của Chương 85 (`ct:1#2`).
  3. Tính năng cơ học (nếu có) có chỉ phụ trợ chức năng điện không.
  4. Nếu là bộ trộn/xử lý âm thanh: có xử lý số **và** kết nối mạng không.
  5. Nếu là bộ khuếch đại: có phải vi sóng không.
  6. Nếu phát tia cực tím: có dùng đóng rắn vật liệu trong sản xuất PCB không.
  7. Nếu là điều khiển từ xa: có dùng sóng radio không; có dùng cho máy trò chơi điện tử video không.
- **viDuThuoc**: #3, 5, 6, 7, 8, 13, 14, 17 ở bảng mục 2 (kèm id câu); **viDuReNhanh**: #4, 9, 12 (kèm dữ kiện quyết định).
- **deNham** (loại trừ có đích): tạo tia X → 90.22 · bộ trộn cho điện ảnh → 90.10 · chống sương cho xe đạp/xe có động cơ → 85.12 · thuốc lá điện tử dùng một lần, hộp chứa → 24.04 · cấy ion, lắng đọng hơi vật lý → 84.86 · thẻ thông minh → 85.23 · tẩu không dùng điện → 96.14 · máy mạ thuộc 84.86 · đo điện di → 90.27 · bộ điều khiển trò chơi → 95.04.
- **loaiKhacLong**: 85.43 (phần còn lại của Danh mục) → 8543.70 (trừ 4 phân nhóm có tên) → 8543.70.90 (trừ 6 dòng có tên).
- **quyTacKhiKhongVua**: Quy tắc 6 (chỉ so cùng cấp) nguyên văn; nhóm 85.43 tự đã là nơi nhận "chưa được chi tiết ở nơi khác".
- **choHo**: không thiếu ví dụ. Lưu ý: danh sách chú giải mở đầu bằng "không kể những cái khác" (`ct:4#1`) → ví dụ **không đóng**; hàng mới (chưa có tên ở đâu) vẫn có thể thuộc đây → nối M-80.
- **anhEmThatLac**: để trống (M-80).

## 4. Nhật ký cách nghĩ — chỗ dễ sai

1. **Bẫy "đã có hồ sơ là đủ"**: máy ghép báo 113 vấn đề, 0 thiếu — nhưng cấp dòng gần như rỗng nghĩa. Thước "số bản ghi" đánh lừa; thước đúng là "dòng Loại khác có hình hàng dương chưa".
2. **Bẫy gần chữ**: "máy khuếch đại cao tần" dễ bị đẩy vào 8543.70.50 vì chữ "khuếch đại". Phải so điều kiện ("vi sóng"), không so chữ (ADR-0005 cấm so giống/khác từng từ).
3. **Bẫy số trong câu mô tả**: SEN "khoảng 300 MHz hoặc cao hơn" trông như ngưỡng — không phải.
4. **Bẫy ví dụ đóng**: "không kể những cái khác" → không được kết luận "hàng không có trong danh sách thì không thuộc".
5. **Rẽ nhánh là kết quả đúng, không phải thất bại**: 3/18 ví dụ không định tuyến được nếu thiếu dữ kiện — đó chính là câu cần hỏi khách (ADR-0004: thiếu dữ kiện thì dừng hỏi ở bậc đó).

## 5. Tự phản biện ba câu CEO đặt

### 5.1. Nếu là LLM khác thì có làm thế không?
Không chắc, và đã có bằng chứng: dây chuyền hai phiếu (Gemma + MiniMax) chạy M-73 **đã** dừng ví dụ ở cấp nhóm — đúng hiện trạng mục 1. Thợ fork đã mắc bẫy số mô tả ("thường chứa", "có thể có"). Mô hình yếu hơn sẽ hay mắc bẫy gần chữ (mục 4.2).
Nên muốn LLM khác làm giống, phải **biến cách nghĩ thành quy trình có cổng**, không trông vào sự khéo của mô hình:
- Quy trình bắt buộc từng ví dụ: so anh em cùng cấp → kết luận một trong ba: `VE_DONG <id>` / `VE_LOAI_KHAC` / `RE_NHANH {duKien → id}`; mỗi kết luận trích câu điều kiện của anh em đã so.
- Cổng máy: mọi PHAI_LA ví dụ ở cấp nhóm phải được định tuyến (không bỏ sót); đích phải là lá cùng nhánh; `RE_NHANH` phải nêu dữ kiện có chữ trong câu điều kiện.
- Hai phiếu độc lập; lệch → hàng chờ người làm nghề. Đo trên chính 85.43: hai phiếu máy so với bảng tay ở mục 2 — khớp bao nhiêu / 18 thì mới tin để chạy rộng.

### 5.2. Có phù hợp để nhân rộng và chạy vòng lặp không?
Phù hợp nếu giữ ba tính chất:
- **Đơn vị việc nhỏ, đầu vào đóng**: một phân nhóm có "Loại khác" = (ví dụ cấp nhóm + điều kiện anh em + loại trừ). Không cần đọc cả biểu → song song được, như M-73 đêm qua.
- **Lặp lại được (idempotent) và có vân tay**: mỗi kết luận gắn vân tay câu luật; luật đổi câu nào chỉ chạy lại nút dính câu đó.
- **Phần lớn ô do máy ghép**: chỉ "định tuyến ví dụ" và "trục tách" cần LLM; còn lại tất định → rẻ, chạy vòng lặp không đốt token.
Rủi ro khi nhân rộng: (a) ví dụ không đóng → không được đòi "mọi Loại khác phải có ví dụ"; thiếu thì ghi `choHo`; (b) "chưa được chi tiết ở nơi khác" (như 85.43) cần biết cả Danh mục → phần đó thuộc bài toán cửa vào (M-37, M-79), không nhồi vào thẻ.

### 5.3. Có phù hợp cho cơ chế tìm lọc diện rộng, đa ngôn ngữ, nhiều nguồn, và làm bộ dữ liệu huấn luyện mô hình chuyên gia không?
Nền móng **đúng hướng**, nhưng **chưa đủ**:
- Đúng hướng: mỗi mẩu có nguồn (id câu + trích nguyên văn + vân tay); mỗi quyết định có lý do theo luật; nhãn hai phiếu KHỚP/LỆCH cho sẵn độ tin cậy; định tuyến ví dụ ở mục 2 chính là cặp "hàng → nút + lý do" — dạng dữ liệu huấn luyện suy luận phân loại tốt nhất.
- Còn thiếu:
  1. **Đa ngôn ngữ**: Danh mục HS là văn bản quốc tế; nối mỗi nút 6 số với bản tiếng Anh/Pháp chính thức của WCO và biểu thuế các nước (cùng 6 số) → kho song ngữ có căn cứ, đồng thời là nguồn "anh em thất lạc" (M-80).
  2. **Bộ chuẩn do người làm nghề duyệt** (M-78): nhãn hai mô hình còn nhiễu; cần một tập vàng nhỏ để đo và hiệu chỉnh.
  3. **Vết từng bước** (Lớp 5, sổ ghi vết ADR-0004): mô hình chuyên gia cần học *cách đi* (Phần → Chương → nhóm → 6 → 8, dừng hỏi), không chỉ học đáp án.
  4. **Cặp tương phản**: mỗi ví dụ kèm "anh em gần nhất và vì sao không phải" (đã có nguyên liệu: `deNham`, `RE_NHANH`).
  5. **Bản quyền**: Chú giải chi tiết là văn bản WCO; dùng nội bộ được, trước khi phát hành bộ dữ liệu/mô hình ra ngoài phải kiểm điều khoản.
  6. **Thước đo không dùng tờ khai** (CEO cấm chấm bằng mã tờ khai): đo bằng luật — đúng/sai/dừng hỏi theo bậc thang.

## 6. Điều chỉnh khuôn rút ra từ lần thử

- Thêm khâu **"định tuyến ví dụ"** làm khâu riêng (trước đây ngầm định ai đó làm) với ba kết luận `VE_DONG` / `VE_LOAI_KHAC` / `RE_NHANH`.
- Đổi tên ô `viDuThuoc/viDuKhongThuoc` thành `viDuThuoc` + `viDuReNhanh` (rẽ nhánh theo dữ kiện) + `deNham` (đã có đích).
- Thêm cờ `viDuMo` (danh sách luật "không kể những cái khác") — báo LLM không được suy ngược.

## 7. Bước kế (chờ CEO)
Cho hai phiếu máy làm lại đúng nhóm 85.43, so với bảng tay mục 2. Khớp ≥ 16/18 và 0 lỗi kiểu "gần chữ" thì mới chạy ra 3.357 dòng "Loại khác"; dưới mức đó thì sửa quy trình/lời dặn trước.
