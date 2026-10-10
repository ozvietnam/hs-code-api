# Tuyển tập ý kiến phân loại WCO (#196) — nhập kho riêng tư

TT 85/2026 Điều 6.1 yêu cầu tra 4 nguồn; nguồn 2 là **Tuyển tập ý kiến phân loại WCO** (WCO Compendium of Classification Opinions),
Oz có bản PDF 2022 (~800 trang, song ngữ Anh–Pháp, mua lại qua bên thứ ba). Chỉ dùng nội bộ.

## Nguyên tắc
1. **Không có chữ WCO nào trong repo.** `data/wco-op/*` bị `.gitignore` chặn (chỉ README). `scripts/test-wco-op.mjs` khoá điều này
   (npm test đỏ nếu ai bỏ ignore, hoặc commit PDF). Cả hai script từ chối ghi vào thư mục không bị ignore.
2. **PDF không đẩy qua git** (136 MB > giới hạn 100 MB của GitHub). Chép thẳng lên server vào `data/wco-op/` (`scp`/`rclone`).
3. **Chỉ lấy tiếng Anh.** Bản Pháp bị loại ngay ở bước 1.
4. Báo cáo (`extract-report.json`, `parse-report.json`) **không chứa chữ WCO** — dán gửi người chỉnh code được.

## Chạy (trên server có repo + Python 3 + `pip install pymupdf`)
```bash
# 0. thử vài trang để xem bố cục (in cấu trúc, chữ cắt 14 ký tự — không ghi tệp)
python3 scripts/wco-op-extract.py --pdf "data/wco-op/WCO Compendium 2022.pdf" --sample 12,13,200

# 1. PDF → tiếng Anh theo trang (thêm --ocr nếu báo "noTextPages" nhiều; cần tesseract + eng + fra)
python3 scripts/wco-op-extract.py --pdf "data/wco-op/WCO Compendium 2022.pdf"

# 2. tiếng Anh → từng ý kiến (data/wco-op/opinions.json)
node scripts/wco-op-parse.mjs
```
Đọc báo cáo:
- `extract-report.json`: `layouts` (two-col / single / two-col-unresolved), `noTextPages` (cần OCR), `sparsePages` (trang trống/bìa/mục lục),
  `unresolvedPages` (không chấm được ngôn ngữ → soát tay).
- `parse-report.json`: `opinions` (tổng), `rejectedBackward` (nghi dẫn chéo đầu dòng), `issues.unknownHs` (mã không có trong
  `data/wco-hs-international.csv` → thường là OCR/regex sai), `issues.ordinalGaps` (thứ tự nhảy → thiếu ý kiến), `tooShort`/`tooLong`.
Chưa khớp bố cục thật thì chỉnh bằng `--id-regex` (nhóm 1 = mã, nhóm 2 = thứ tự) hoặc báo lại kèm hai file báo cáo.

## Bản scan (706 trang, mỗi trang một ảnh, 0 lớp chữ) — phải OCR trước
Đã xác nhận 10/10/2026: `WCO-Compendium-2022.pdf` là bản scan. Quy trình: **OCR ra PDF có lớp chữ**, rồi trỏ `--pdf` vào bản OCR
(giữ nguyên toạ độ từng dòng nên script gạn cột Anh/Pháp dùng được; không cần cờ `--ocr` của script).
```bash
# chỉ thử 16 trang giữa sách trước (vài phút) để xem bố cục + chất lượng
nice -n 19 ionice -c3 ocrmypdf -l eng+fra --jobs 2 --deskew --rotate-pages --skip-text --optimize 0 \
  --output-type pdf --pages 100-115 WCO-Compendium-2022.pdf /tmp/wco-sample.ocr.pdf
python3 scripts/wco-op-extract.py --pdf /tmp/wco-sample.ocr.pdf --out data/wco-op --pages 100-115 --sample 100,101

# đạt thì chạy cả 706 trang, nền, thấp ưu tiên (khoảng 1–2 giờ với 2 luồng)
nice -n 19 ionice -c3 ocrmypdf -l eng+fra --jobs 2 --deskew --rotate-pages --skip-text --optimize 0 \
  --output-type pdf WCO-Compendium-2022.pdf data/wco-op/WCO-Compendium-2022.ocr.pdf
python3 scripts/wco-op-extract.py --pdf data/wco-op/WCO-Compendium-2022.ocr.pdf && node scripts/wco-op-parse.mjs
```
- `eng+fra` bắt buộc: cần OCR cả tiếng Pháp thì script mới nhận ra và loại được cột Pháp (chỉ `eng` sẽ ra chữ rác ở cột Pháp, lẫn vào tiếng Anh).
- `--output-type pdf` (không PDF/A) và `--optimize 0` để nhanh và không nén lại ảnh; không cần lưu trữ dài hạn.
- Bản OCR là **bản sao riêng tư**, nằm trong `data/wco-op/` như PDF gốc (bị `.gitignore` + `.dockerignore` chặn).

OCR không tuyệt đối, nên code đã xử lý:
- `wco-op-parse.mjs` sửa nhầm ký tự trong **mã đầu ý kiến** (O↔0, l/I/|↔1, S↔5, `,`↔`.`, `/`↔`l`) — chỉ sửa khi mã sau sửa có thật trong
  bảng WCO; `parse-report.json` ghi số mã đã sửa (`ocrFixedIds`).
- `extract-report.json` có `noisyPages` / `avgNoise` (trang nhiều ký tự rác → OCR lại hoặc soát tay).
- **Câu trích từ ý kiến WCO là trích từ chữ OCR, chưa chắc khớp bản gốc từng ký tự.** Vì vậy khi nối vào sổ tay, mọi mục `wco-op.*` phải
  được người soát đối chiếu với ảnh trang gốc (số trang `pdfPage` có trong `opinions.json`) trước khi nạp; máy chỉ chứng minh được
  "khớp chữ OCR", không chứng minh được "khớp tờ giấy".

## Dùng sau khi có `opinions.json`
`lib/wco-op.js`: `get`, `byHs`, `quoteInOpinion` (máy kiểm câu trích, cùng cách chuẩn hoá với sổ tay), `parseSourceId`
(`wco-op.<hs>.<thứ tự>`). Thiếu kho riêng thì mọi hàm trả rỗng, CI và bản công khai chạy bình thường.
Bước tiếp (chưa làm, cần kho thật): thêm nguồn `wco-op.*` vào `lib/so-tay.js` + soát độc lập như mọi đợt sổ tay; phần công khai
chỉ gồm số hiệu, mã HS 6 số, câu mô tả tiếng Việt **tự viết** và con trỏ tới bản gốc — không có nguyên văn, không có bản dịch toàn văn.
