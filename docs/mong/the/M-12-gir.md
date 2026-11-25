# Báo cáo thẻ M-12 (#1900): Sáu quy tắc tổng quát (nguyên văn & chú giải chi tiết)

- **Nhánh:** `mong/m-12-gir` (tách từ `origin/mong/m-01-ket`)
- **Đầu ra dữ liệu:** `data/luat-goc/gir.jsonl` (**54 nút**, khuôn `nut-luat@1`: **13 `QUY_TAC`** + **41 `CHU_GIAI_CHI_TIET`**)
- **SHA-256 `gir.jsonl` (khớp 2 lần chạy liên tiếp):** `96a50481c9d805f6ca4e469ef3de8a90defa89ecc8a549d75eff4dc4b9c08d40`
- **Bộ trích tất định:** `scripts/luat-goc/gir-trich.mjs`
- **Bộ kiểm ngoại tuyến CI:** `scripts/luat-goc/gir-test.mjs` (đã đăng ký vào giữa `scripts/danh-sach-test.txt`)

---

## 1. Nguồn văn bản nhà nước & tình trạng hiệu lực

Toàn bộ dữ liệu được trích **trực tiếp từ Công báo điện tử nước CHXHCN Việt Nam (`congbao.chinhphu.vn`)** — ấn phẩm ký số của Văn phòng Chính phủ (không chép từ blog, trí nhớ hay `lib/gir.js`):

1. **Văn bản gốc ban hành 6 quy tắc và chú giải chi tiết:**
   - **Số hiệu:** Thông tư số `31/2022/TT-BTC` ngày `08/06/2022` của Bộ trưởng Bộ Tài chính (*Ban hành Danh mục hàng hóa xuất khẩu, nhập khẩu Việt Nam*).
   - **Trang Công báo gốc:** https://congbao.chinhphu.vn/van-ban/thong-tu-so-31-2022-tt-btc-37431/41056.htm
   - **PDF phần đầu (lời văn ban hành, Công báo số `523 + 524` ngày `08/07/2022`, ký số Văn phòng Chính phủ):**
     - URL: https://congbaocdn.chinhphu.vn/CongBaoCP/VanBan/2022/6/37431/41003-1-2022523-52431-2022-tt-btc.pdf
     - SHA-256 tệp tải về: `3b84ea8100eeaf914ccd3b64a96b5669fc3b4a344b08caa14cb69a762179586e`
   - **PDF phần cuối chứa toàn văn `Phụ lục II – Sáu quy tắc tổng quát` (Công báo số `557 + 558` ngày `08/07/2022`, tr.50..76 Công báo / tr.49..75 tệp PDF):**
     - URL: https://congbaocdn.chinhphu.vn/CongBaoCP/VanBan/2022/6/37431/41056-1-2022557-55831-2022-tt-btc.pdf
     - SHA-256 tệp tải về: `2c00a1c183113a85a152c0f182a290cc11ce36b29fb85ab704f4e0640fbccb2b`
   - **Tệp văn bản đối chiếu ngoại vi (`LUAT_GOC_TXT/gir.txt`):**
     - Trích cột tiếng Việt (bỏ cột tiếng Anh song song đổi bên chẵn/lẻ và bỏ dòng dọc `CÔNG BÁO/...` + số trang) từ tr.49..75 của PDF phần cuối bằng `pdftotext -bbox-layout` + cắt khe giữa trang (`valleyHits=0` ở cả 27 trang).
     - SHA-256 `gir.txt`: `d611dea5433f46f172c6b027623044f6700a82bd367d6ac3e0e4e39bdb0c0dcf`
2. **Văn bản điều chỉnh ngày hiệu lực & trạng thái hiện hành:**
   - Điều 4 Thông tư `31/2022/TT-BTC` quy định có hiệu lực từ `01/12/2022`, thay thế Thông tư `65/2017/TT-BTC` và Thông tư `09/2019/TT-BTC`.
   - **Thông tư số `72/2022/TT-BTC` ngày `30/11/2022`** (*Ngưng hiệu lực của Thông tư số 31/2022/TT-BTC*, Công báo số `901 + 902` ngày `12/12/2022`):
     - Trang Công báo: https://congbao.chinhphu.vn/van-ban/thong-tu-so-72-2022-tt-btc-38279/42504.htm
     - PDF ký số: https://congbaocdn.chinhphu.vn/CongBaoCP/VanBan/2022/11/38279/42504-1-2022901-90272-2022-tt-btc.pdf
     - SHA-256: `b78f1c400f699624f1cab150638b7567376cffcb606350032e2bedab3e569619`
     - Điều 1 ngưng hiệu lực thi hành TT `31/2022/TT-BTC` **từ ngày `01/12/2022` đến hết ngày `29/12/2022`**. Do đó ngày áp dụng thực tế của `31/2022/TT-BTC` là **`2022-12-30` (`30/12/2022`)**, đến nay (`25/11/2026`) **còn hiệu lực (`hieuLuc: { "tu": "2022-12-30", "den": null }`)**, chưa bị văn bản nào thay thế.

---

## 2. Thống kê 54 nút trong `data/luat-goc/gir.jsonl`

| Quy tắc / Nhóm | Nút `QUY_TAC` (`lop: LUAT`) | Trang CB | Nút `CHU_GIAI_CHI_TIET` (`lop: HUONG_DAN`) | Trang CB | Chú giải mục nguồn |
|---|---|---:|---|---:|---|
| Quy tắc 1 | `gir:1` | 50 | `gir:1:ct:1..5` (5 nút) | 51..53 | `CHÚ GIẢI QUY TẮC 1` `(I)..(V)` |
| Quy tắc 2 | `gir:2` | 52 | — | — | Đề mục `QUY TẮC 2` |
| Quy tắc 2(a) | `gir:2:a` | 52 | `gir:2:a:ct:1..9` (9 nút) | 53..57 | Chưa hoàn chỉnh `(I)..(IV)` + chưa lắp ráp `(V)..(IX)` |
| Quy tắc 2(b) | `gir:2:b` | 54 | `gir:2:b:ct:1..4` (4 nút) | 57..59 | Hỗn hợp và hợp chất `(X)..(XIII)` |
| Quy tắc 3 | `gir:3` | 59 | `gir:3:ct:1..2` (2 nút) | 60..61 | Tổng quan Quy tắc 3 `(I)..(II)` |
| Quy tắc 3(a) | `gir:3:a` | 59 | `gir:3:a:ct:1..3` (3 nút) | 61..63 | Đặc trưng nhất `(III)..(V)` |
| Quy tắc 3(b) | `gir:3:b` | 60 | `gir:3:b:ct:1..6` (6 nút) | 63..69 | Tính chất cơ bản & bộ bán lẻ `(VI)..(XI)` |
| Quy tắc 3(c) | `gir:3:c` | 60 | `gir:3:c:ct:1` (1 nút) | 69 | Thứ tự cuối cùng `(XII)` |
| Quy tắc 4 | `gir:4` | 69 | `gir:4:ct:1..3` (3 nút) | 70 | Hàng giống nhất `(I)..(III)` |
| Quy tắc 5 | `gir:5` | 70 | — | — | Câu dẫn Quy tắc 5 |
| Quy tắc 5(a) | `gir:5:a` | 71 | `gir:5:a:ct:1..3` (3 nút) | 71..73 | Hộp/bao bì chuyên dùng `(I)..(III)` |
| Quy tắc 5(b) | `gir:5:b` | 71 | `gir:5:b:ct:1..2` (2 nút) | 73..74 | Bao bì thông thường `(IV)..(V)` |
| Quy tắc 6 | `gir:6` | 74 | `gir:6:ct:1..3` (3 nút) | 74..76 | Phân nhóm cùng cấp độ `(I)..(III)` |
| **Tổng cộng** | **13 nút** | 50..74 | **41 nút** | 51..76 | **54 nút** (đủ 10 nút `bat-buoc.json`) |

- **Chỗ khuyết trong bản gốc:** Không có (`Phụ lục II` Công báo `557 + 558` có đủ cả nguyên văn 6 quy tắc và toàn bộ 41 đoạn chú giải chi tiết tiếng Việt).
- **Dị bản trong bản in Công báo (giữ nguyên văn, ghi `ghiChu`):**
  - `gir:3:ct:2` (Công báo tr.61): đoạn `(II)` mở đầu bằng ví dụ `"Chú giải 4(B) Chương 97"`, nhưng câu kết ngay sau lại ghi `"Chú giải 5 (B) Chương 97"` (do HS 2022 đổi đánh số Chương 97). Văn bản trong `gir.jsonl` giữ nguyên theo bản in Công báo và ghi chú rõ ở trường `ghiChu`.

---

## 3. Đối chiếu với `lib/gir.js` (bản tóm tắt cũ trong repo)

1. **`lib/gir.js` là bản diễn lại ngắn (~1–3 câu/quy tắc), không phải nguyên văn Thông tư `31/2022/TT-BTC`:**
   - `GIR_RULES['1'].textVi` tóm còn 2 câu và bỏ cụm điều kiện pháp lý cuối `"và theo các quy tắc dưới đây nếu các nhóm hoặc các Chú giải đó không có yêu cầu nào khác"`.
   - `GIR_RULES['3a'].textVi` bỏ toàn bộ đoạn thứ hai rất quan trọng của Quy tắc 3(a) về trường hợp hai hay nhiều nhóm chỉ liên quan đến *một phần* của nguyên liệu/bộ bán lẻ thì phải coi là *"thể hiện đặc trưng ngang nhau"*.
   - `GIR_RULES['3b']` dùng cụm *"đặc trưng cơ bản"*, trong khi nguyên văn TT `31/2022/TT-BTC` là *"tính chất cơ bản"* (`"bộ phận cấu thành tạo ra tính chất cơ bản của chúng, trong chừng mực tiêu chí này được áp dụng"`).
   - `GIR_RULES['5']` gộp chung `5(a)` và `5(b)` vào một khóa `'5'` (mất cấu trúc tách `5(a)` / `5(b)` và cụm loại trừ bao bì *có tính chất cơ bản nổi trội hơn*).
   - `GIR_RULES['6']` không chứa đoạn cuối `"Theo Quy tắc này thì các chú giải phần và chương có liên quan cũng được áp dụng, trừ khi nội dung mô tả trong phân nhóm có những yêu cầu khác"`.
2. **`lib/gir.js` hoàn toàn không có 41 nút `CHU_GIAI_CHI_TIET`:** thiếu toàn bộ ví dụ chính thức của WCO/BTC (điều kiện `"phôi"`, `"chưa lắp ráp"`, 3 điều kiện bắt buộc của `"bộ được đóng gói để bán lẻ"`, ví dụ 1(a)/(b) bộ spaghetti/sandwich vs chọn đồ rời không phải bộ, 5 điều kiện bao bì 5(a), và quy tắc 1-gạch/2-gạch ở Quy tắc 6).

---

## 4. Kiểm chứng đã chạy

- `node scripts/luat-goc/gir-trich.mjs --ghi` (chạy 2 lần): cùng ra 54 nút, SHA-256 `96a50481c9d805f6ca4e469ef3de8a90defa89ecc8a549d75eff4dc4b9c08d40`.
- `LUAT_GOC_TXT="$HOME/luat-goc-txt" node scripts/kiem-luat-goc.mjs gir`: `PASS gir: 54 nút, 0 lỗi, 0 cảnh báo — đối chiếu 1 bản chữ`.
- `env -u LUAT_GOC_TXT node scripts/luat-goc/gir-test.mjs`: `7 passed, 0 failed` (`EXIT=0`).
- `LUAT_GOC_TXT="$HOME/luat-goc-txt" node scripts/luat-goc/gir-test.mjs`: `7 passed, 0 failed` (`EXIT=0`).
- `node scripts/test-danh-sach-test.mjs`: `18/18 passed, 0 failed`.
