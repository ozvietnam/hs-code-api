# Bước 1 — Giấy phép: mở khoá pháp lý cho dự án

**Ngày:** 2026-09-07 · **Trạng thái:** ✅ Xong

## Vì sao phải làm trước mọi thứ khác

Repo đang public và trang chủ ghi "mã nguồn & dữ liệu mở", nhưng **không có file
giấy phép**. Theo luật bản quyền quốc tế, tác phẩm công bố mà không kèm giấy phép
thì mặc định **giữ toàn bộ bản quyền** — nghĩa là trước bước này, về mặt pháp lý:

- không ai được fork, dùng lại, hay phân phối dữ liệu của dự án;
- không ai gửi PR được một cách an toàn (không rõ họ cấp quyền gì cho mình);
- không doanh nghiệp/AI nào dám nhúng vào sản phẩm của họ.

Nói cách khác, mọi nỗ lực "mở cho cộng đồng" ở các bước sau đều vô hiệu nếu bước
này chưa xong.

## ĐÃ LÀM

| File | Nội dung |
|---|---|
| `LICENSE` | MIT cho mã nguồn (`api/`, `lib/`, `scripts/`, `public/**/*.html`) |
| `LICENSE-DATA` | CC BY-SA 4.0 cho dữ liệu (`data/**`, `public/*.json`, `docs/**`, `tests/**`), kèm miễn trừ trách nhiệm và lưu ý Điều 15 Luật SHTT |
| `NOTICE.md` | Bảng phạm vi giấy phép, lý do tách đôi, cách ghi công, bảng nguồn dữ liệu gốc, cam kết quyền riêng tư |
| `README.md` | Thêm mục "Giấy phép" |
| `public/index.html` | Footer nêu rõ MIT + CC BY-SA, kèm cảnh báo "không phải phán quyết Hải quan" |
| `package.json` | Thêm trường `"license": "MIT"` |

**Lý do tách đôi:** code MIT để ai cũng nhúng lại được không vướng ràng buộc —
càng nhiều nơi dùng thì phương pháp phân loại càng được kiểm chứng. Dữ liệu
CC BY-SA vì đó là tài sản chung: ai làm giàu thêm thì phải chia sẻ ngược, đúng cơ
chế để kho mã HS ngày càng rõ ràng thay vì bị đóng gói thành sản phẩm độc quyền.

## ⚠️ Quyết định một chiều — CEO xác nhận trước khi có người đóng góp đầu tiên

Đổi giấy phép **sau khi** đã có contributor bên ngoài là rất khó: phải xin lại
chấp thuận của từng người đã đóng góp. Vì vậy hai điểm này nên chốt ngay:

1. **CC BY-SA có thể cản một số doanh nghiệp.** Điều khoản "chia sẻ tương tự"
   buộc bên dùng phải mở lại dữ liệu phái sinh — có công ty sẽ né vì không muốn
   lộ tập dữ liệu nội bộ của họ. Nếu ưu tiên **độ phủ** (càng nhiều nơi dùng càng
   tốt) hơn **tính có đi có lại**, thì đổi sang **CC BY 4.0** ngay bây giờ.
   Khuyến nghị của tôi: **giữ BY-SA**, vì mục tiêu anh nêu là "user khác bổ sung
   data của họ vào", tức là cần cơ chế buộc trả lại.
2. **Chủ thể bản quyền đang ghi là `ozvietnam`** (tên tài khoản GitHub). Nếu
   muốn pháp nhân đứng tên (công ty, hoặc cá nhân đủ họ tên), sửa dòng
   `Copyright (c) 2026 ...` trong cả `LICENSE` và `LICENSE-DATA`.

## VIỆC MỞ RỘNG

### L-1 · Bật cơ chế chấp thuận giấy phép cho người đóng góp — P1 · ~2h

Hiện `NOTICE.md` chỉ *tuyên bố* rằng đóng góp được hiểu là cấp phép theo MIT /
CC BY-SA. Tuyên bố một chiều thì yếu. Cần một trong hai:

- **DCO (Developer Certificate of Origin)** — nhẹ, chỉ cần contributor ký
  `Signed-off-by:` trong commit; thêm GitHub Action `dco-check`. **Khuyến nghị.**
- **CLA** — chặt hơn nhưng dựng bot ký kết, rườm rà cho dự án cộng đồng nhỏ.

Nghiệm thu: có `.github/workflows/dco.yml` chặn PR thiếu sign-off, và
`CONTRIBUTING.md` (bước 4) hướng dẫn `git commit -s`.

### L-2 · Kèm toàn văn CC BY-SA 4.0 vào repo — P2 · ~30 phút

`LICENSE-DATA` hiện **dẫn link** tới bản chính thức trên creativecommons.org chứ
chưa chép toàn văn. Cách này hợp lệ (đúng khuyến nghị đánh dấu của chính CC),
nhưng repo sẽ bền hơn nếu tự chứa: nếu link chết hoặc người dùng ở môi trường
offline thì vẫn đọc được điều khoản.

Việc: tải `https://creativecommons.org/licenses/by-sa/4.0/legalcode.txt` lưu
thành `LICENSE-DATA-FULL.txt`, trỏ từ `LICENSE-DATA` sang. **Chép nguyên văn,
tuyệt đối không tóm tắt hay sửa chữ.**

### L-3 · Đánh dấu giấy phép ngay trong từng tệp dữ liệu — P1 · ~3h

Khi ai đó tải riêng `community-data.json` hay `tax.json`, tệp đó rời khỏi repo là
mất luôn thông tin giấy phép — không còn cách nào biết phải ghi nguồn thế nào.

Việc: thêm khối `_license` vào đầu mỗi tệp JSON công khai:

```json
"_license": {
  "data": "CC-BY-SA-4.0",
  "url": "https://creativecommons.org/licenses/by-sa/4.0/",
  "source": "HS Knowledge Base — github.com/ozvietnam/hs-code-api",
  "generatedAt": "<ISO date>",
  "disclaimer": "Tham khảo nghiệp vụ, không phải phán quyết Hải quan. Đối chiếu văn bản gốc còn hiệu lực."
}
```

Sửa trong `scripts/build-community-data.mjs` để sinh tự động. Ưu tiên
`public/community-data.json` và `public/api-guide.json` trước (đó là 2 tệp AI
ngoài tải nhiều nhất). Nghiệm thu: `npm run build` sinh ra tệp có `_license`, và
test kiểm tra trường này tồn tại.

### L-4 · Rà soát quyền phát hành của corpus "Loại khác" — P0 · ~4h

`data/loai-khac-products.jsonl` (11.072 sản phẩm) và `loai-khac-corpus.jsonl`
chứa **tên sản phẩm thu thập từ Shopee/Taobao**. Cần xác nhận trước khi mặc nhiên
phát hành theo CC BY-SA:

- Tên sản phẩm đơn lẻ thường quá ngắn để được bảo hộ quyền tác giả — rủi ro thấp.
- Nhưng nếu trong đó lẫn **mô tả dài do người bán viết**, hoặc **URL/ảnh/tên
  shop**, thì đó là nội dung của bên thứ ba, mình không có quyền cấp phép lại.
- Ngoài ra còn điều khoản sử dụng của chính sàn (scraping).

Việc: viết `scripts/audit-corpus-provenance.mjs` thống kê độ dài trường, phát
hiện URL / tên shop / đoạn văn dài; báo cáo ra `data/corpus-provenance-report.json`.
Nếu có nội dung rủi ro thì cắt bớt hoặc chuẩn hoá về danh từ chung.

Đây là **P0** vì đang phát hành công khai — sai là sai ngay bây giờ, không phải
sau này.

### L-5 · Ghi rõ giấy phép cho dữ liệu do AI sinh — P2 · ~1h

`tax-enriched.json`, `chu-giai-heading.json` (phần `phan_biet`),
`loai-khac-enriched.json` là **do LLM sinh ra** (Gemini / MiniMax). Cần một dòng
trong `NOTICE.md` nói rõ phần nào do AI biên soạn, để người dùng biết mức độ tin
cậy khác với dữ liệu chép từ văn bản gốc — và để minh bạch với các nền tảng có
chính sách về nội dung AI.

## DUY TRÌ THEO THỜI GIAN

Giấy phép là phần **ít thay đổi nhất** của dự án, nhưng không phải bất biến:

| Nhịp | Việc | Ghi chú |
|---|---|---|
| **Hằng năm** (tháng 1) | Cập nhật năm trong dòng `Copyright (c) 2026` → dải năm `2026-2027` | Tự động được bằng script trong CI |
| **Khi có contributor đầu tiên** | Thêm `CONTRIBUTORS.md`, cân nhắc chuyển `Copyright (c) ozvietnam` → `ozvietnam và những người đóng góp` | Một lần, nhưng phải nhớ |
| **Khi thêm nguồn dữ liệu mới** | Bổ sung dòng vào bảng "Nguồn dữ liệu gốc" trong `NOTICE.md` | Gắn vào checklist của PR |
| **Hằng quý** | Rà `NOTICE.md` xem bảng phạm vi giấy phép còn khớp cấu trúc thư mục không (thêm thư mục mới mà quên khai báo là lỗ hổng) | 15 phút |

> **Cảnh báo về nhịp cập nhật dữ liệu:** miễn trừ trách nhiệm trong `LICENSE-DATA`
> nói người dùng phải đối chiếu văn bản gốc còn hiệu lực. Điều đó **chỉ công bằng
> nếu mình có công bố ngày dữ liệu**. Vì vậy mọi tệp công khai bắt buộc phải có
> `generatedAt` — xem việc **L-3**. Nhịp làm mới dữ liệu thực tế (biểu thuế,
> chính sách, văn bản) sẽ được đặt ở bước 3 và bước 5.
