# ADR-0008: Triển khai M-81 theo cả nhóm 4 số — người soạn mạnh, tập vàng làm thước

- Ngày: 27/11/2026 · Trạng thái: chấp nhận (CEO duyệt 27/11 chiều)
- Bổ sung cho: ADR-0007 (giữ nguyên mục tiêu, khuôn, cổng 6–12, thước dừng). ADR này chỉ đổi **cách sản xuất** và thêm ba ô khuôn.

## Bối cảnh
- Móng lớp 3 (M-72…M-76) chia việc **theo loại bản ghi**, chạy dọc toàn biểu (ngưỡng mọi chương, liệt kê mọi chương, anh em mọi chương). Mỗi thợ nhìn một nút qua một lăng kính → đủ số bản ghi, nối được cây quan hệ, nhưng **chưa ai đọc trọn một gia đình anh em** (nhóm → phân nhóm → dòng + chú giải + nhóm cạnh tranh). Hệ quả đo được: 6.561 dòng có tên chỉ chép tên; "Loại khác" không định nghĩa được.
- 27/11, mỗi trợ lý mô hình mạnh đọc trọn **một nhóm 4 số trong một ngữ cảnh** (~15–20 phút, ~300 nghìn token) cho bảng vàng 85.43, 85.01, 42.02, 02.01, 84.79, 90.31, 39.26, 73.26 (#2412–#2417) và tìm ra cái cách cũ bỏ sót: cặp chồng thật, nhóm cạnh tranh 85.18, SEN tự mâu thuẫn (8501.10.30), dòng gần như rỗng (4202.99.10 vì "plastic" gồm sợi lưu hoá), ô khuôn còn thiếu.
- Cùng ngày, Gemma 31B định tuyến 18 ví dụ 85.43: trượt đúng các ca rẽ nhánh, không thấy cặp chồng nào → mô hình nhỏ không đủ sức **soạn** bảng anh em.
- Bài học sổ tay (11/2026): cổng "trục" từng loay hoay vì coi trục là khoá từ vựng **toàn biểu**. Trục thật ra **cục bộ trong từng gia đình anh em** (42.02: vật liệu mặt ngoài; 85.01: loại dòng điện). Chỉ đại lượng có đơn vị mới dùng chung — đã có NGUONG.

## Quyết định
1. **Đơn vị việc = cả một nhóm 4 số** (~1.228 gói), không tách từng dòng. Nhóm quá dài thì chia theo phân nhóm 6 số nhưng gói vẫn mang trọn chuỗi cha và anh em cùng cấp.
2. **Gói đọc do máy dựng** (dùng `phai-doc`/sơ đồ quan hệ đã có): lời văn mọi cấp, chú giải Phần/Chương/nhóm/chi tiết/phân nhóm, SEN, NGUONG / DINH_NGHIA / liệt kê sẵn có, câu loại trừ trỏ vào và trỏ ra, `CANH_TRANH` (#2411). Cây quan hệ cũ giữ nguyên vai trò: là thứ cho máy biết phải gom gì vào gói.
3. **Người soạn** = mô hình mạnh, ngữ cảnh lớn, miễn phí (Gemini qua AI Studio / Antigravity). **Người soi** = mô hình hãng khác (MiniMax qua van, .131) làm việc hẹp trên bảng đã soạn: chỉ ra chồng, hở, ca rẽ nhánh bị bỏ sót. Gemma/MiniMax không soạn.
4. **Claude chỉ làm tập vàng và phân xử phiếu lệch**, vào các khung sắp đặt lại hạn mức (~300 nghìn token/nhóm → không dùng cho cuốn chiếu). Tập vàng: ~30 nhóm phân tầng theo kiểu (ngưỡng, vật liệu, công dụng, bộ phận, hoá chất, dệt may, "chưa chi tiết ở nơi khác", không có Loại khác). Bản soạn của Gemini phải đạt so với tập vàng trước khi cuốn chiếu.
5. **Ba ô khuôn thêm vào `DIEU_KIEN`** (từ bảng vàng): `truc` — bắt buộc khi `kieu=GIA_TRI`, tên trục nguyên văn trong gia đình anh em (với `SO` lấy `daiLuong` của NGUONG); cổng 8 chỉ chứng minh rời nhau khi cùng `truc`. `moNguon` — id câu định nghĩa, bắt buộc khi `mo=DINH_NGHIA_LUAT` hoặc `MO_TA_HUONG_DAN`. `ve: 0` — điều kiện áp chung mọi vế (thường là `phu` cho "trừ…").
6. **Chia việc theo hàng đợi nhóm 4 số** (ai xong lấy nhóm kế), không theo dải chương cố định — để nhóm khó/dễ tự cân tải giữa thợ Paperclip, bầy agy, phiên fork AI Studio.

## Hệ quả
- Script tách (`tach-dieu-kien.mjs`, M-81 PR 1) nhận **gói một nhóm 4 số**, không nhận danh sách dòng lẻ.
- Đợt thử 4 nhóm (M-81 PR 2) trở thành phép đo: bản Gemini so với bảng vàng 85.43 / 85.01 / 42.02 / 02.01.
- Thẻ M-72…M-76 không làm lại; dữ liệu của chúng là nguyên liệu trong gói đọc.
