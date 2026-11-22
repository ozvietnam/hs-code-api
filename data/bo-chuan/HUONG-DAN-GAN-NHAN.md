# Hướng dẫn gắn nhãn bộ chuẩn theo luật (ADR-0004)

Tài liệu này quy định cách soạn và mở rộng `data/bo-chuan/*.json` theo **ADR-0004** (`docs/decisions/0004-quy-trinh-phan-loai-chuan-6-quy-tac.md`). Mọi đóng góp ca chuẩn mới phải tuân thủ đủ 6 nguyên tắc dưới đây trước khi mở PR.

## 1. Nguyên tắc gốc: Luật trước, tờ khai không phải chân lý
- **Không chép mã tờ khai làm đáp án.** Bộ chuẩn cũ lấy từ tờ khai có tới 3/5 ca mẫu sai luật hoặc thiếu điều kiện.
- Mọi kết luận phải đi theo trình tự bắt buộc **B0 → B1 → B2–B5 → B6**; **tiền lệ TB-TCHQ / tờ khai cũ chỉ dùng kiểm chứng cuối cùng**, không dùng làm căn cứ chọn mã.
- Thiếu dữ kiện mà luật cần để rẽ nhánh → đáp án chuẩn là **`DUNG_HOI`** kèm câu hỏi gắn đúng điều kiện luật thiếu dữ kiện, **không được đoán**.

## 2. Cấu trúc một ca trong `data/bo-chuan/`
Mỗi ca gồm 5 trường chính:
- `id`: định danh duy nhất (ví dụ `BC-01`, `BC-02`, ...).
- `tenHang`: mô tả hàng đúng như đầu vào thực tế cần phân loại.
- `ketQua`:
  - Khi đủ dữ kiện: `{ "trangThai": "CHOT", "ma": "<8 số>", "nhom": "<4 số>", "phanNhom": "<6 số>" }` (có thể kèm `dieuKienKemTheo` nếu cần lưu ý biên rẽ nhánh khi cấu hình thay đổi, ví dụ *"có van thì 8481.80"*).
  - Khi thiếu dữ kiện luật cần: `{ "trangThai": "DUNG_HOI", "maUngVien": ["<8 số>", ...], "cauHoi": "<câu hỏi tiếng Việt chỉ rõ dữ kiện còn thiếu và mã tương ứng>", "maTam": "<tuỳ chọn nếu ADR chỉ rõ mã tạm như Dép xốp>" }`.
- `cacTang`: danh sách tuần tự các tầng đã xét (`B0`, `B1`, `B2_B5` nếu dùng, `B6_6SO`, `B6_8SO`). Mỗi tầng BẮT BUỘC có:
  - `tang`: tên tầng (`B0` | `B1` | `B2_B5` | `B6_6SO` | `B6_8SO`).
  - `quyTac`: quy tắc quyết định ở tầng đó (ví dụ `GIR 1 + Chú giải 2(b) Phần XVI`, `GIR 6`).
  - `ketLuan`: kết luận cụ thể ở tầng đó (mã nhóm/phân nhóm/dòng hoặc `DUNG_HOI` kèm `cauHoi`).
  - `trich`: mảng ít nhất 1 trích dẫn `{ "tep": "<đường dẫn trong repo>", "khoa": "<khoá thật trong tệp>", "nguyenVan": "<trích nguyên văn từ giá trị của khoá đó>" }`.
- `ghiChuPhapLy`: giải thích ngắn gọn ranh giới pháp lý và lý do hệ cũ từng sai (nếu có).

## 3. Quy tắc viết `trich[]` (máy kiểm tự động)
1. Mọi trích dẫn PHẢI trỏ tới tệp và khoá có thật trong kho dữ liệu hiện hành:
   - `data/chu-giai-chuong.json` → `<2 số>.phan` hoặc `<2 số>.chuong` (chú ý Phần XVI đọc `84.phan` / `85.phan`, Phần XV đọc `76.phan`, không dùng bản Phần gán nhầm ở Chương 39–40).
   - `data/chu-giai-heading.json` → `<4 số>.ten_nhom` hoặc `<4 số>.nhom` (KHÔNG trích các trường tóm tắt `bao_gom`, `khong_bao_gom`, `loai_tru`, `phan_biet`, `tinh_chat`).
   - `data/wco-hs-international.csv` → `<6 số>` (tên phân nhóm chính thức WCO).
   - `data/tax.json` → `<8 số>.vn` (tên dòng biểu thuế VN hiện hành).
   - `data/wco-op/opinions.json` → `<id>.text` (ví dụ `392490/4.text`, `640299/1.text`).
2. Chuỗi `nguyenVan` phải xuất hiện nguyên văn (khớp sau chuẩn hoá chữ/số hoặc nguyên chuỗi con) bên trong nội dung đọc từ `tep` + `khoa`. Không tóm tắt, không tự bịa số liệu.

## 4. Quy tắc điền từng tầng B0 → B1 → B2–B5 → B6
1. **B0 (Bản chất & máy chủ):** Nêu bản chất vật lý/công dụng, chất liệu chính, dạng trình bày. Nếu là **bộ phận** thì BẮT BUỘC xác định **máy chủ** (ví dụ vận thăng → `8428.10`, máy khoan → `8430.41`/`8430.49`, động cơ điện → `8501`) trước khi xuống B1.
2. **B1 (GIR 1 + Chú giải Phần/Chương/Nhóm/WCO):**
   - Kiểm **điều loại trừ** ở Chú giải Phần và Chú giải Chương TRƯỚC khi nhận nhóm.
   - Với bộ phận thuộc Phần XVI, đi đúng thứ tự Chú giải 2: **2(a)** nhóm định danh riêng (kèm điều kiện riêng của nhóm đó, như `84.83` đòi hỏi có trục quay; và câu loại trừ riêng như `85.45` đẩy *bộ phận giữ chổi than* ra) → **2(b)** nhóm bộ phận chuyên dùng / nhóm máy chủ → **2(c)** `84.87` / `85.48`.
   - Khi GIR 1 chỉ còn 1 nhóm duy nhất thì DỪNG ở tầng nhóm và ghi rõ `GIR 1`, **không viện dẫn GIR 3**.
3. **B2–B5:** Chỉ thêm tầng này khi B1 không giải quyết được và ghi rõ lý do B1 chưa đủ.
4. **B6 (GIR 6 — 6 số và 8 số):** So các phân nhóm cùng cấp gạch, xuống dòng 8 số theo biểu thuế VN. Với dòng 8 số dạng *"Của hàng hóa thuộc phân nhóm X"* (ví dụ `8431.31.10` vs `8431.31.20`), phải truy ngược phân nhóm máy chủ (`8428.10.31` vs `8428.10.39`); nếu thiếu dữ kiện về máy chủ thì trả `DUNG_HOI` kèm câu hỏi.

## 5. Kiểm tra trước khi mở PR
Chạy máy kiểm bắt buộc:
```bash
node scripts/test-bo-chuan.mjs
```
Bảo đảm 0 lỗi thiếu quy tắc, 0 lỗi khoá không tồn tại, 0 lỗi trích không nguyên văn. Không bao giờ ghi dữ liệu tờ khai gốc hoặc thông tin khách hàng thật vào `data/bo-chuan/`.
