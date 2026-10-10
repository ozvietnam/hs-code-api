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

## Định dạng thật của bản scan (10/10/2026, OCR 16 trang thử)
OCR tốt (nhiễu 0,0006; hai cột 16/16). Nhưng mã đầu ý kiến hiện dạng **`3802.90` / `3808.59` — không có `/n`** — kèm dòng `Adoption : <năm>` và
`Application of GIRs 1 and 6 (…)`. Regex mặc định (`NNNN.NN/n`) vì thế ra 0 ý kiến. Cách chỉnh, theo thứ tự:

1. **Xem khung xương** (an toàn dán gửi, không có chữ nội dung): `node scripts/wco-op-skeleton.mjs --around=Adoption`. In nhãn mẫu lặp lại,
   hình dạng dòng mã và hình dạng các dòng quanh nhãn `Adoption` (chữ → `a`, số → `9`) — đủ thấy thứ tự mã → tên hàng → … → `Adoption`.
2. **Tách với mã trần**: `node scripts/wco-op-parse.mjs --infer-ord --confirm='^Adoption' --confirm-within=25`.
   - `--infer-ord`: nhận dòng bắt đầu bằng `NNNN.NN` (không theo sau `/`); thứ tự trong cùng mã **suy theo thứ tự xuất hiện**, đánh dấu `ordInferred`.
   - `--confirm`: ứng viên chỉ là đầu ý kiến nếu nhãn (ở đây `Adoption`) xuất hiện trong N dòng kế tiếp **trước mã đầu dòng tiếp theo** — loại mã
     gặp đầu dòng trong phần dẫn chiếu. Nếu `Adoption` đứng CUỐI ý kiến (sau mã) thì cổng này sẽ loại nhầm: xem khung xương rồi đổi nhãn/khoảng.
3. Đọc `parse-report.json`: `ordInferred`, `rejectedUnconfirmed` (mã bị loại vì thiếu nhãn), `rejectedBackward`, `issues.*`, `withAdoption`.

### Cấu trúc thật (toàn bộ 706 trang, 10/10/2026): `Adoption` là dòng CUỐI ý kiến
Kết quả `--infer-ord --confirm=^Adoption` trên cả cuốn: 134 ý kiến, **710 mã bị loại** — vì mã đứng ĐẦU ý kiến còn nhãn `Adoption : năm` ở CUỐI, mã kế tiếp ngay sau nhãn.
Neo đúng là "mã ngay sau dòng nhãn":
```bash
node scripts/wco-op-parse.mjs --anchor-after='^Adoption' --anchor-gap=2
```
- Mã dẫn chiếu giữa thân bài không đứng sau nhãn nên tự bị loại (không cần đoán độ dài ý kiến).
- Mã lùi so với ý kiến trước **được giữ** và báo `outOfOrder` (neo đã mạnh; lùi thường là OCR đọc sai chữ số) — soát tay danh sách đó.
- `withoutAdoption` > 0: ý kiến thiếu nhãn cuối, nghi hai ý kiến bị gộp (OCR mất dòng `Adoption`) — thường đi cùng `issues.tooLong`.
- `Adoption` xuất hiện cả ở cột Pháp; bản `pages-en.jsonl` chỉ nên có cột Anh, trừ vài trang đầu (bìa, mục lục) bị chấm ngôn ngữ nhầm — nằm trong `prefaceLines`.
- Các dòng dạng `99.999/a`, `99.999/a/9` (hơn 450 dòng) có thể là số hiệu tài liệu WCO của từng ý kiến (khác với thứ tự suy ra). Soi chúng bằng
  `node scripts/wco-op-skeleton.mjs --around='^\d{2}\.\d{3}/[A-Za-z]' --show=4` rồi báo em vị trí so với dòng mã; nếu đúng là số hiệu thì bắt nó thành `soHieu` để trích dẫn.

**Số hiệu chính thức:** nếu bản gốc không đánh số từng ý kiến thì `ordInferred` ≠ số hiệu. Phản hồi API (`canCuPhapLy`) khi đó chỉ trỏ **mã HS + trang bản PDF**,
không bày thứ tự suy ra như một số hiệu. Nếu bản gốc có số hiệu ở chỗ khác (vd dòng riêng), chỉnh `--id-regex` để bắt nó.

## Dùng sau khi có `opinions.json`
`lib/wco-op.js`: `get`, `byHs`, `quoteInOpinion` (máy kiểm câu trích, cùng cách chuẩn hoá với sổ tay), `parseSourceId`
(`wco-op.<hs>.<thứ tự>`). Thiếu kho riêng thì mọi hàm trả rỗng, CI và bản công khai chạy bình thường.
Bước tiếp (chưa làm, cần kho thật): thêm nguồn `wco-op.*` vào `lib/so-tay.js` + soát độc lập như mọi đợt sổ tay; phần công khai
chỉ gồm số hiệu, mã HS 6 số, câu mô tả tiếng Việt **tự viết** và con trỏ tới bản gốc — không có nguyên văn, không có bản dịch toàn văn.
