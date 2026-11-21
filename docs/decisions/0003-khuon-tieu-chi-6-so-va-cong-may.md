# ADR-0003 — Khuôn g6@1 cho `tieuChi6` và cổng máy trước khi nhân bản

- **Ngày:** 21/11/2026
- **Trạng thái:** đề xuất trong PR mẫu G6-0 / G6-1 (xếp chồng trên PR giai đoạn 1 của ADR-0002). QT soát rồi mới có hiệu lực.
- **Người quyết:** QT; trợ lý soạn.
- **Bổ sung:** ADR-0002 (cạnh C10, C13). Không thay ADR nào.

## Bối cảnh

106/115 nhóm cần phân biệt 6 số trong 120 nhóm đầu về lượng hàng chưa có `tieuChi6` (`data/do-thi/xep-hang-luong-hang.json`),
trong đó có 8481 và 8412. Ca van điện từ khí nén 5/2 (đúng 8481.20.90) dừng ở 8481.80 vì kho không có gì nói phân nhóm có tên
riêng phải xét trước phân nhóm dư. Giai đoạn 6 của kế hoạch sẽ giao AI rẻ soạn ~100 nhóm; lỗi số một của đợt soạn sổ ranh giới
là viết rộng hơn chữ luật (196/377 sổ bị trả về).

Khuôn `tieuChi6` đang có (`{hs6, fact, op, value, donVi, nguon, trich}`, 509 nhóm, 3.168 mục) dùng `fact` tự do và trích chủ yếu
tên tiếng Anh của WCO. Nó không ghi thứ tự xét, không có chỗ cho phân nhóm dư, và `fact` không nối được vào từ vựng dữ kiện (C13).

## Quyết định

1. **Mở rộng tương thích ngược, không đặt khuôn mới.** Mục cũ giữ nguyên và vẫn qua máy kiểm. Mục khuôn g6@1 thêm trường tuỳ
   chọn: `dieuKien` (lời ngắn), `tuKhoa` (gợi ý dò mô tả), `phanConLai` (phân nhóm dư), `chuaSoHoa` (thiếu khoá từ vựng),
   `uuTien` (câu luật nói ưu tiên), `tienLe` (ví dụ bậc 2), `thuTu` (máy xếp). Sổ tay đã qua cổng mang `kiemTra.tieuChi6.khuon`.
2. **`fact` là khoá tu-vung@2** và điều kiện được kiểm bằng `lib/dieu-kien-so.js` như điều kiện dòng 8 số: giá trị, ngưỡng, đơn
   vị phải có nguyên văn trong câu trích. Đây là cạnh C13.
3. **Nguồn trích thêm chữ tiếng Việt của biểu thuế ở đúng cấp 6 số:** `tieuDe.<pn6>`, `tieuDe.<nhóm một gạch>`, và `tax.<pn6>00`
   khi dòng lá chính là phân nhóm. Dòng 8 số thường, tiêu đề 7 số, tầng không mã vẫn bị loại.
4. **Thứ tự xét do máy xếp** (`thuTuMay`): theo mã; phân nhóm dư trần cuối tầng; phân nhóm có `uuTien` lên đầu. Người / AI soạn
   không ghi `thuTu`. Lý do: lần thử đầu, mô hình rẻ ghi sai `thuTu` ở cả 3 nhóm và không tự sửa được.
5. **Một cổng máy trước khi ghi:** `scripts/kiem-tieu-chi-6.mjs` (lõi `lib/do-thi/tieu-chi-6.js`), 24 mã lỗi + 3 cảnh báo.
   `scripts/goi-soan-tieu-chi-6.mjs --ap` chỉ ghi `data/so-tay/` khi 0 lỗi. `npm test` chạy cổng trên mọi sổ tay mang khuôn g6@1
   và chạy `scripts/test-tieu-chi-6.mjs` (mỗi mã lỗi có ít nhất một ca tiêm).
6. **Mục đã áp mang nhãn `AI_DA_KIEM`**, không phải nhãn duyệt. `lib/ho-so/duong-di.js` chỉ đọc `tieuChi6` đã duyệt, nên mục mới
   chưa vào động cơ hồ sơ cho tới khi có người / mô hình mạnh duyệt.
7. **`tuKhoa` là gợi ý, không phải điều kiện.** Điều kiện là `fact` + `value`. Phép "áp tiêu chí bằng từ khoá" chỉ để đo trong
   cổng (cảnh báo `LECH_TO_KHAI_CAO`); không đường khách nào gọi.
8. **Bảng cạnh dựng thêm C10** từ mọi `tieuChi6` (cũ và mới): nhóm → phân nhóm, bậc 1, kèm `khoaDuKien` (C13).

## Phương án đã loại

| Phương án | Vì sao loại |
|---|---|
| Khuôn riêng, tệp riêng cho tiêu chí 6 số | Hai nơi chứa cùng một tri thức; `lib/hoi-theo-so-tay.js` và `lib/ho-so/duong-di.js` đã đọc `tieuChi6` trong sổ tay |
| Giữ `fact` tự do như khuôn cũ | Không nối được vào từ vựng dữ kiện; máy không kiểm được "giá trị có trong câu trích" |
| Để AI ghi `thuTu` | Đo thật: sai ở 3/3 nhóm, không tự sửa được; thứ tự suy được hoàn toàn từ cây biểu thuế + `uuTien` |
| Trích tên WCO tiếng Anh làm căn cứ chính | Chữ có giá trị pháp lý ở Việt Nam là biểu thuế tiếng Việt; tên WCO trong kho có dòng sai (841280 ghi "pneumatic…" cho phân nhóm "Loại khác") |
| Coi mọi tiêu đề "… khác" là phần còn lại | Sai với "Thiết bị bảo vệ mạch điện khác", "Tượng nhỏ và các đồ trang trí khác"; cổng bản đầu vì thế đỏ oan |

## Hệ quả

- `lib/so-tay.js#checkItem` nới ba điểm cho `tieuChi6` (nguồn `tieuDe.*` / `tax.<pn6>00`, điều kiện có kiểu, `phanConLai` /
  `chuaSoHoa`). 3.168 mục cũ không đổi kết quả kiểm (0 mục dùng khoá tu-vung).
- `data/do-thi/thong-ke.json` thêm loại cạnh C10. Sửa `tieuChi6` của nhiều nhóm thì dựng lại số đếm như các loại cạnh khác.
- `HS_HOI_THEO_SO_TAY` (mặc định tắt): khi bật, câu hỏi phân nhóm của 8481 / 8412 lấy `nguon` + `trich` từ `tieuChi6` thay cho
  danh sách tiêu đề. Khối sổ tay vòng 2 (`HS_SO_TAY=full`) không đọc `tieuChi6`: băm đầu ra `soTayBlock()` trước và sau giống nhau.
- Không thêm cờ `HS_*`.

## Giới hạn đã biết

- Cổng kiểm từng mục và sự tự mâu thuẫn giữa các phân nhóm; CHƯA kiểm "mọi vế của tiêu đề đã có mục phủ". Bỏ một vế làm tiêu chí
  rộng hơn luật mà vẫn qua cổng (7323.94, xem `docs/giao-viec/do-thi/thu-nhan-ban-1/BAO-CAO.md`).
- `value` hai vế nối "và" / "hoặc" không có dấu phẩy ("Động cơ và mô tơ thủy lực") được giữ một chuỗi; cổng chỉ chặn danh sách
  có dấu phẩy hoặc chấm phẩy.
- tu-vung@2 thiếu khoá nguồn động lực và kiểu chuyển động; mẫu 8412 ghi bằng `tenLoai`.
- `hangDu()` của cạnh C11 (giai đoạn 1) vẫn xếp "X và các Y khác" vào loại dư; cổng này dùng phân loại riêng `kieuTieuDe()`.

## Việc tiếp theo

- Phép kiểm "phủ vế" cho tiêu đề phân nhóm, rồi mới chạy loạt.
- QT đo ca van 5/2 trên máy thật sau khi gộp và khi bật lại `HS_HOI_THEO_SO_TAY` (điều kiện bật ở L3 bổ sung).
- Duyệt 18 mục của 8481 / 8412 để `lib/ho-so/duong-di.js` đọc được.
