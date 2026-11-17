# Biên bản đối chiếu 3 văn bản pháp luật — Đánh giá PR #1362 (`community-data.json`)

**Mã thẻ:** OZV-1359 (Liên quan PR #1362)  
**Ngày lập biên bản:** 2026-11-17  
**Phạm vi:** Đối chiếu 3 văn bản pháp luật có biến động trạng thái (EXPIRED hàng loạt) trong `public/community-data.json` của PR #1362 so với registry pháp lý (`oz-wiki-plhq`).  
**Người thực hiện:** Thợ HS 02  
**Người soát:** Giám đốc dự án `hs-code-api` (ExecutionPolicy: review)

---

## 1. Bảng đối chiếu 3 văn bản mẫu

| Số hiệu văn bản | Loại & Cơ quan ban hành | Trạng thái cũ (trước #1362) | Trạng thái mới trong #1362 | Bằng chứng đối chiếu & Tình trạng thực tế | Kết luận hiệu lực |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. 113/2017/NĐ-CP** | Nghị định (Chính phủ) | `AMENDED` | `EXPIRED` | - Sửa đổi bởi: Nghị định 82/2022/NĐ-CP.<br>- Link/Nguồn: [Chính phủ / VBQPPL](https://congbao.chinhphu.vn/van-ban/nghi-dinh-so-113-2017-nd-cp-24884/19507.htm).<br>- Ngày ghi nhận: Thống kê tự động trong #1362 đánh dấu hết hạn toàn bộ (`EXPIRED`), tuy nhiên nhiều điều khoản quản lý hóa chất vẫn là căn cứ cốt lõi hoặc được kế thừa. | Chưa đủ căn cứ để coi là hết hiệu lực toàn bộ; cần đối chiếu từng điều khoản cụ thể. |
| **2. 62/2024/TT-BGTVT** | Thông tư (Bộ GTVT / Bộ Xây dựng) | `ACTIVE` | `EXPIRED` | - Nội dung: Sửa đổi, bổ sung Thông tư 12/2022/TT-BGTVT về danh mục sản phẩm, hàng hóa có khả năng gây mất an toàn thuộc Bộ GTVT.<br>- Link/Nguồn: [VBPL](https://vbpl.vn/search?q=62%2F2024%2FTT-BGTVT).<br>- Ngày ghi nhận: Đánh dấu `EXPIRED` hàng loạt trong đợt quét tự động mà chưa xác minh văn bản thay thế kế thừa. | Cần rà soát kỹ văn bản thay thế trước khi gộp trạng thái hết hiệu lực. |
| **3. 1182/QD-BCT** | Quyết định (Bộ Công Thương) | `EXPIRED` / `AMENDED` | `EXPIRED` / Biến động | - Nội dung: Về việc ban hành Danh mục các mặt hàng nhập khẩu (kèm mã HS) thực hiện kiểm tra chuyên ngành thuộc Bộ Công Thương.<br>- Link/Nguồn: [Thư viện Pháp luật](https://thuvienphapluat.vn/van-ban/Xuat-nhap-khau/Quyet-dinh-1182-QD-BCT-2021).<br>- Ngày ghi nhận: Biến động trạng thái liên tục giữa các bản vá quét tự động, gây rủi ro mất đồng bộ dữ liệu tra cứu kiểm tra chuyên ngành. | Cần giữ trạng thái ổn định theo registry chính thức (`oz-wiki-plhq`). |

---

## 2. Đúng 3 mẫu dẫn chứng chi tiết

### Mẫu dẫn chứng 1: Nghị định số 113/2017/NĐ-CP
- **Trích dẫn tiêu đề:** *Quy định chi tiết và hướng dẫn thi hành một số điều của Luật Hóa chất.*
- **Phân tích thực tế:** Trong đợt quét dữ liệu của #1362, trạng thái bị đổi đột ngột từ `AMENDED` thành `EXPIRED`. Tuy nhiên, văn bản này cùng Nghị định 82/2022/NĐ-CP sửa đổi vẫn đang được trích dẫn và tham chiếu rộng rãi trong hệ thống quản lý hóa chất và mã HS liên quan. Việc đổi trạng thái thành `EXPIRED` toàn bộ chưa qua đối chiếu chi tiết từng điều.

### Mẫu dẫn chứng 2: Thông tư số 62/2024/TT-BGTVT
- **Trích dẫn tiêu đề:** *Sửa đổi, bổ sung một số điều của Thông tư số 12/2022/TT-BGTVT ngày 30/6/2022 của Bộ trưởng Bộ Giao thông vận tải quy định danh mục sản phẩm, hàng hóa có khả năng gây mất an toàn thuộc trách nhiệm quản lý nhà nước của Bộ Giao thông vận tải.*
- **Phân tích thực tế:** Thông tư này có hiệu lực pháp lý điều chỉnh các mặt hàng chuyên ngành GTVT. Việc gộp tự động trong #1362 gắn nhãn `EXPIRED` hàng loạt mà thiếu sự đối chiếu với registry pháp lý gốc dẫn đến sai lệch tiềm ẩn trong logic kiểm tra chuyên ngành.

### Mẫu dẫn chứng 3: Quyết định số 1182/QĐ-BCT
- **Trích dẫn tiêu đề:** *Về việc ban hành Danh mục các mặt hàng nhập khẩu (kèm theo mã HS) thực hiện kiểm tra chuyên ngành thuộc Bộ Công Thương.*
- **Phân tích thực tế:** Quyết định này đóng vai trò tham chiếu quan trọng cho các mặt hàng kiểm tra chuyên ngành Bộ Công Thương. Sự dao động trạng thái trong các bản build tự động (`community-data.json`) chứng minh dữ liệu chưa được kiểm chứng tĩnh qua registry uy tín.

---

## 3. Kết luận quyết định

- **QUYẾT ĐỊNH:** **KHÔNG GỒP** phần `public/community-data.json` của #1362.
- **LÝ DO:** 
  1. Xảy ra hiện tượng **"EXPIRED hàng loạt"** tự động chưa được kiểm chứng đầy đủ qua registry pháp lý gốc (`oz-wiki-plhq`).
  2. Gộp PR này có nguy cơ làm đứt gãy hoặc sai lệch các căn cứ tra cứu kiểm tra chuyên ngành và danh mục hàng hóa trên hệ thống sản xuất.
  3. Đúng theo chỉ đạo của QT/GĐ: community-data chỉ được phép gộp khi có bằng chứng đối chiếu cụ thể qua biên bản 3 văn bản và qua xác thực registry.

---
*Biên bản lập bởi Thợ HS 02 — Phục vụ soát xét bởi Giám đốc dự án.*
