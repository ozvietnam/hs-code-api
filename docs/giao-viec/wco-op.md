# Tuyển tập ý kiến phân loại WCO (#196) — nhập kho riêng tư

TT 85/2026 Điều 6.1 yêu cầu tra 4 nguồn; nguồn 2 là **Tuyển tập ý kiến phân loại WCO** (WCO Compendium of Classification Opinions),
Oz có bản PDF 2022 (~800 trang, song ngữ Anh–Pháp, mua lại qua bên thứ ba). Chỉ dùng nội bộ.

## Nguyên tắc
1. **Không có chữ WCO nào trong repo.** `data/wco-op/*` bị `.gitignore` chặn (chỉ README). `scripts/test-wco-op.mjs` khoá điều này
   (npm test đỏ nếu ai bỏ ignore, hoặc commit PDF). Cả hai script từ chối ghi vào thư mục không bị ignore.
2. **PDF không đẩy qua git** (136 MB > giới hạn 100 MB của GitHub). Chép thẳng lên server vào `data/wco-op/` (`scp`/`rclone`).
3. **Chỉ lấy tiếng Anh.** Bản Pháp bị loại ngay ở bước 1.
4. Báo cáo (`extract-report.json`, `parse-report.json`) **không chứa chữ WCO** — dán gửi người chỉnh code được.

## Nguồn chính từ 10/10/2026: bản OCR tiếng Anh dạng markdown (1.036 ý kiến)
Có bản OCR đã cắt riêng cột tiếng Anh, dạng markdown (`WCO_Compendium_2022_English_OCR.md`, ~860 KB), cấu trúc sạch hơn nhiều so với đường PDF → `pages-en.jsonl`:
`## Section …` → `### 3802.90` (mã 6 số) → `**1.** mô tả` → `*Application of GIRs 1 and 6.*` → `*Adoption: 2014*` (dòng CUỐI của ý kiến). Phần `## Annex` (bảng nhãn hiệu/thành phần) không phải ý kiến.

```bash
# đặt tệp vào data/wco-op/ (bị .gitignore + .dockerignore chặn), rồi:
node scripts/wco-op-parse-md.mjs --md=data/wco-op/WCO_Compendium_2022_English_OCR.md --expect=1036
```
Kết quả trên bản thật: **1.036 ý kiến / 309 mã — khớp số dòng `Adoption`**; mọi mã đều có trong bảng WCO (`unknownHs=0`), không trùng, không nhảy thứ tự. Báo cáo ghi: `withoutAdoptionYear` (3, năm rụng do scan),
`ordInferred` (xem dưới), `issues.tooShort` (4, là tên hàng ngắn thật), `headingsUnparsed`.

**Số hiệu:** số in sẵn `**n.**` bị OCR làm méo/lặp ở khoảng một nửa số ý kiến (404 lệch, 101 không đọc được), nên **không dùng làm số hiệu chính thức**. `ord` = vị trí
trong mã theo thứ tự xuất hiện (ổn định, tất định); `ordPrinted` giữ số in sẵn để đối chiếu. Con trỏ API (`canCuPhapLy` mục 6.1.b) là `{hs6, thuTuTrongMa, namThongQua}` và ghi rõ
không phải số hiệu chính thức.

Đường PDF → `pages-en.jsonl` → `wco-op-parse.mjs` bên dưới giữ làm phương án dự phòng (và để đối chiếu số lượng).

## ⚠ Lỗi dữ liệu đã phát hiện (10/10/2026): bản markdown làm RƠI tiêu đề mã
Ba ảnh trang gốc (Section XVI/13, /37, /39) cho thấy mỗi mã in thành một **dải xanh đậm chữ trắng** (`8471.30`, `8466.10`…). OCR đọc chữ trắng trên nền xanh kém nên nhiều dải
không thành `### mã`. Hệ quả: các ý kiến của mã mất tiêu đề bị **dồn vào mã đứng trước** (vd "Telescopic arm" của 8466.10 nằm ở `844230/13`; "Palm-size electronic organizer" của 8471.30
nằm ở `847050/2`). Số ý kiến (1.036) vẫn khớp vì đếm theo dòng `Adoption`, nhưng **gán mã thì sai ở nhiều chỗ**:
- 105 mã có số in sẵn của ý kiến quay về 1 giữa chừng (226 chỗ) → **461/1036 ý kiến nghi gán sai mã** (`headingSuspect`);
- 76/136 câu "See also Opinions 8467.19/1…" trỏ tới mã không có ý kiến nào trong dữ liệu (đúng vì mã đó bị mất tiêu đề).

**Chốt an toàn (đã có trong code):** ý kiến `headingSuspect` không bao giờ được trả cho API; khi kho còn ý kiến loại này, mã nào không có ý kiến đáng tin sẽ ghi
`CHUA_TRA_CUU_DAY_DU`, **không** ghi "không có ý kiến". Chưa dùng bất kỳ ý kiến nào làm nguồn sổ tay cho tới khi khôi phục xong.

**Khôi phục (tất định, không AI)** — đọc mã thẳng từ ẢNH dải xanh rồi ghép với markdown:
```bash
# 1. trên server có bản scan + tesseract:  pip install pymupdf numpy pillow
python3 scripts/wco-op-banners.py --pdf data/wco-op/WCO-Compendium-2022.pdf --crops data/wco-op/banner-crops   # → data/wco-op/banners.jsonl (~30 phút)
# 2. ghép mã vào ý kiến (ghi opinions.json, bản gốc lưu opinions.raw.json):
node scripts/wco-op-fix-headings.mjs --banners=data/wco-op/banners.jsonl
```
Thử riêng một ảnh trang: `python3 scripts/wco-op-banners.py --image trang.png --detect-only` (đếm dải). Trên 3 ảnh mẫu: tìm đúng 4/4 dải và ảnh dải sau khi đảo màu đọc rõ.
`heading-fix-report.json`: `resolved` (đoạn khôi phục), `unresolved[]` (lý do: thiếu ranh giới, nhiều tổ hợp, dải không đọc được), `headingSuspectAfter`, `ordPrintedMismatchAfter` (phải gần 0:
số in sẵn chính là số hiệu dùng trong câu "See also …/n", nên khi mã đúng thì thứ tự theo vị trí = số in sẵn).

## Bản OCR mới (10/10/2026, `WCO_Compendium_2022_Opinions_EN.md`): 531 tiêu đề thay vì 313
OCR lại sạch hơn: nhận được nhiều dải mã hơn, kể cả dạng `### 8471.30 (continued)` (mã tiếp tục sang trang sau). Kết quả `wco-op-parse-md.mjs` trên bản này:
**1.038 ý kiến / 434 mã** (1.036 dòng `Adoption` + 2 ý kiến mất dòng Adoption vẫn giữ được); `unknownHs=0`, không trùng. Ý kiến nghi sai mã giảm **461 → 169**.

Hai lớp khôi phục, đều tất định:
1. **Từ tiêu đề `(continued)` (đã có trong `wco-op-parse-md.mjs`):** nếu ý kiến đầu tiên dưới một tiêu đề có số in sẵn n > 1 thì n−1 ý kiến ngay trước (số in sẵn 1..n−1) thuộc
   cùng mã nhưng dải mã trang đầu bị rơi → chuyển về mã đó. Bản này: 25 khối / 41 ý kiến (vd ý kiến "Palm-size electronic organizer" về lại 8471.30). Nếu số in sẵn của các ý kiến trước không khớp thì KHÔNG chuyển.
2. **Từ ảnh dải mã (`wco-op-banners.py` + `wco-op-fix-headings.mjs`)** cho phần còn lại (88 chỗ số in sẵn quay về 1 mà không có tiêu đề tiếp nối, vd 8467.19 vẫn nằm trong 8466.10).

Thứ tự chạy trên server (sau `git pull`):
```bash
node scripts/wco-op-parse-md.mjs --md=data/wco-op/WCO_Compendium_2022_Opinions_EN.md --expect=1036
python3 scripts/wco-op-banners.py --pdf data/wco-op/WCO-Compendium-2022.pdf --crops data/wco-op/banner-crops
node scripts/wco-op-fix-headings.mjs --banners=data/wco-op/banners.jsonl
```

## Vá tiếp khi không có ảnh dải mã: suy luận có kiểm + dịch tiếng Việt (10/10/2026)
Còn 88 chỗ / 117 khối mất tiêu đề mà tiêu đề tiếp nối không cứu được (chỉ ~3 chỗ suy được tất định từ các câu "See also"). Khi không đọc được ảnh dải mã:
- `scripts/wco-op-apply-inferred.mjs`: nhận kết quả suy luận mã từ HAI lượt độc lập; máy kiểm mã nằm giữa hai tiêu đề đọc được, tăng nghiêm ngặt trong run; **chỉ nhận khi hai lượt cùng
  chọn một mã và cả hai không "low"** (mã đúng có thể nằm ngoài khoảng ứng viên nếu một tiêu đề kế bị OCR sai, khi đó agent buộc chọn bừa). Ý kiến được gán mang `headingInferred` +
  `headingBasis: LLM_AGREED`; còn lại giữ `headingSuspect` (không ra API).
- `scripts/wco-op-check-vi.mjs`: máy kiểm bản dịch tiếng Việt — mọi con số của bản gốc phải còn trong bản dịch (đổi dấu thập phân/nghìn được); lệch → dịch lại/soát tay.

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
