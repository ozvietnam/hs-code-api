# Báo cáo thẻ M-22 — Bỏ lời AI và trường nhiễm khỏi mọi ngữ cảnh đưa cho LLM

- **Phiếu:** #1909 (`docs/mong/phan-cong.json` thẻ `M-22`)
- **Nhánh:** `mong/m-22-khong-lan-ai` (tách từ `origin/main` `127785b1`)
- **Nguyên tắc:** ADR-0004, ADR-0005 — không đưa 5 trường nhiễm (`phan_biet`, `tinh_chat`, `khong_bao_gom`, `bao_gom`, `loai_tru`) và dữ liệu `AI_CHUA_KIEM` (`explanatory-notes.json`, `chu-giai-heading.json`, `chu-giai-chuong.json`, `notes.json`) vào ngữ cảnh LLM hay bộ tìm ứng viên. Không đổi lời nhắc `SYS_GIR`, không tăng số lượt LLM, không đổi chuỗi mô hình.

---

## 1. Kiểm kê toàn bộ chỗ xuất hiện 5 trường (`lib/`, `api/`, `scripts/`)

Kết quả quét `git grep -n -E 'phan_biet|tinh_chat|khong_bao_gom|bao_gom|loai_tru' -- lib/ api/ scripts/` trước khi sửa: tổng **124 dòng** (**33 dòng** ở `lib/`, **0 dòng** ở `api/`, **91 dòng** ở 21 tệp `scripts/`).

| Nhóm | Tệp | Dòng | Vai trò trước khi sửa | Trạng thái sau M-22 |
| --- | --- | --- | --- | --- |
| **Thuộc phạm vi M-22 (trực tiếp)** | `lib/classify.js` | `128–132` (+ `52, 72–73, 183–188, 270`) | `headingNotes(h4)` đọc `chu-giai-heading.json` & `chu-giai-chuong.json`, ghép cả 5 trường vào `buildContext()` và `girNotesText()` đưa cho LLM; `chapNotes()` đọc `notes.json` không dùng. | **ĐÃ GỠ SẠCH.** Chuyển `headingNotes()` sang đọc kho luật gốc (`lib/chu-giai-goc.js` khi có mặt / fallback đọc thẳng `data/luat-goc/chuong.jsonl` + `nhom.jsonl`). `buildContext()` chỉ gửi nguyên văn `n.nhom`; `khongBaoGom/loaiTru/tinhChat/phanBiet` trả `''`; `baoGom` trả chính nguyên văn `n.nhom` để tương thích giao diện `headingBlock()` của `lib/engine-loop.js:942`. `explanatoryNote` chỉ trả ra trường HTTP UI gắn nhãn `AI_CHUA_KIEM`, **không** vào ngữ cảnh LLM. |
| **Thuộc phạm vi M-22 (trực tiếp)** | `lib/gir.js` | `413` (+ `219`) | `hasExclusionLanguage()` đọc `note?.tinh_chat`; nguồn mặc định ghi `data/chu-giai-heading.json`. | **ĐÃ GỠ SẠCH.** Bỏ `note?.tinh_chat` (chỉ kiểm `note?.nhom` và `note?.sen`); đổi mặc định sang `data/luat-goc/nhom.jsonl`. |
| **Thuộc phạm vi M-22 (trực tiếp)** | `lib/tim-cgct.js` | `136, 319–320` (+ `6–7, 171–172, 241, 277, 286`) | `xayChiMuc()` đọc `chu-giai-heading.json` (`ten_nhom`, `nhom`, `phan_biet`) và `explanatory-notes.json`. | **ĐÃ GỠ SẠCH.** Đọc thẳng 5 kho lớp `LUAT`: `bieu.jsonl` (tiêu đề nhóm HS 1–97, bỏ `98xx`), `chuong.jsonl` (chú giải Chương + cạnh đồng xuất hiện), `nhom.jsonl` (chú giải nhóm + liên kết chéo nguyên văn, cạnh ngược trọng số `0.68`), `phan-nhom.jsonl`, `sen.jsonl` + `tax.json`. |
| Đã xử lý ở M-21 (#1947) | `lib/gir-notes.js` | `29–30, 216–218, 228–229, 233, 273–276` | Đọc `chu-giai-heading.json` & `explanatory-notes.json`. | Chờ gộp PR `#1947` (M-21) sau M-34. |
| Đã xử lý ở M-21 (#1947) | `lib/notes-coverage.js` | `81` | Kiểm `!text(H.khong_bao_gom) && !text(H.loai_tru)`. | Chờ gộp PR `#1947` (M-21). |
| Bảng nhãn / siêu dữ liệu nguồn | `lib/nguon-loai.js`, `lib/explanatory-notes-index.js`, `lib/hs-tree-sources.js` | `40, 65–66`; `3`; `92` | Gắn nhãn `AI_CHUA_KIEM` / đếm danh sách trường hiện diện trên cây UI; không đưa 5 trường vào prompt LLM. | Giữ nguyên (được miễn trừ trong `test-khong-lan-ai.mjs`). |
| Đổi mã ID nguồn cũ (M-35) | `lib/do-thi/doi-ma-nguon.js` | `168` | Quy đổi ID `nhomXXXX.phan_biet` / `.tinh_chat` sang ID nút luật mới. Không đường khách nạp. | Giữ nguyên (ngoài luồng LLM). |
| Tên khoá câu hỏi nội bộ | `lib/hoi-theo-so-tay.js` | `183, 194` | Sinh `key: \`phan_biet_${nhomSo}...\`` từ `data/so-tay/[0-9]{4}.json`, không đọc 5 trường kho cũ. | Giữ nguyên (không đọc 5 trường dữ liệu). |
| Chỉ là chú thích | `lib/so-tay.js`, `lib/ten-sang-ma.js` | `10–11, 225`; `9` | Bình luận giải thích quy định cấm dùng 5 trường cũ. | Sạch mã thực thi (`0` vi phạm). |
| Script ngoài `lib/` + `api/` (91 dòng, 21 tệp) | `scripts/{bench-retrieve,build-loai-khac-chapter,do-do-thi-gd3,enrich-*,gen-*,generate-*,harvest-chu-giai,import-*,tang-4so/*,test-bo-chuan,test-engine-loop,test-gir-notes,test-hieu-chinh,test-so-tay}.mjs/.py` | Nhiều dòng | Công cụ dựng dữ liệu/bộ chuẩn cũ và các bộ kiểm cũ. | Ngoài phạm vi `M-22.tep`. Lưu ý mục `test-engine-loop.mjs:398` và `test-tim-cgct.mjs:154` ở Mục 3 bên dưới. |

---

## 2. Số đo trước / sau và cổng kiểm mới

| Hạng mục đo | Trước M-22 (`origin/main` `127785b1`) | Sau M-22 (`mong/m-22-khong-lan-ai`) |
| --- | --- | --- |
| Chỗ đọc 5 trường nhiễm trong `lib/classify.js`, `lib/gir.js`, `lib/tim-cgct.js` | **9 chỗ đọc / 3 tệp** | **0 chỗ đọc** |
| Nạp kho cũ (`chu-giai-heading.json`, `chu-giai-chuong.json`, `explanatory-notes.json`, `notes.json`) ở 3 mô-đun | **Cả 3 mô-đun đều nạp** | **0** |
| Số tệp `lib/` + `api/` ngoài danh sách miễn trừ có đọc 5 trường | `3` tệp (`classify`, `gir`, `tim-cgct`) | **0** / 234 tệp |
| Cổng mới `scripts/test-khong-lan-ai.mjs` (đã thêm vào `scripts/danh-sach-test.txt`) | Chưa có | **PASS 15/15** (quét tĩnh 234 tệp + chạy thật 3 mô-đun + ca ngược 5/5) |
| `scripts/test-lop-kho.mjs` (độ phủ lớp `LUAT`/`BO_TRO` trên 4.436 tệp `data/`) | 11/11 | Cập nhật `data/lop-kho.json` + **PASS 11/11** |
| `scripts/test-dau-noi.mjs` (L4 đấu nối API ↔ kho tri thức) | 118/118 | **PASS 118/118** |
| Tổ hợp 17 bộ cổng M-22 (`dem-ca-test.mjs /tmp/log-m22.txt`) | — | **ca xanh 490 (tổng kết 275 ca / 10 bộ) · ca đỏ 0 · EXIT=0** |

---

## 3. Lưu ý 2 bài kiểm cũ ngoài phạm vi `M-22.tep` (báo cáo QT xem xét)

Tuân thủ luật phạm vi thẻ (`docs/mong/phan-cong.json`), M-22 **không** tự ý sửa 2 tệp test cũ ngoài phạm vi dưới đây:

1. **`scripts/test-engine-loop.mjs:398` (`79 passed, 1 failed`):**
   - Duy nhất ca `headingBlock('1212')` (`gom1212Len >= 440`) đỏ vì `test-engine-loop.mjs:398` kiểm độ dài dòng đơn đầu tiên chứa `'GỒM:'` (`split('\n').find(l => l.includes('GỒM:'))`).
   - Trước đây `chu-giai-heading.json#bao_gom` là một đoạn văn phẳng bị mất tiêu đề mục `(A)–(D)` nên dòng 1 dài > 440 ký tự; nay `nhom.jsonl` giữ đúng nguyên văn HS 2022 có đầu mục `(A) Rong biển và các loại tảo khác.` ở dòng 1 (148 ký tự, tổng đoạn `GỒM` của `1212` dài **658 ký tự**). Tất cả **79/80** ca còn lại của `test-engine-loop.mjs` (`9503`, `5212`, `0 dòng chẻ đôi`, `0 mất chữ`, `0 cắt đôi số HS`) đều **PASS**.
2. **`scripts/test-tim-cgct.mjs:154` (`21 passed, 1 failed` — `95/100` trên `data/bo-chuan/4so-v1.jsonl`):**
   - Toàn bộ **21/21** ca cơ chế `tim-cgct` (`8210`, `7312`, `4015`, `8479`, `8481`, `6116/6302`, `9002`, `HS_TIEN_XU_LY`, tắt giữ nguyên từng byte) và **4/4** `test-gd2-toc-do-parity.mjs` đều **PASS**.
   - Trên `data/bo-chuan/4so-v1.jsonl`, toàn bộ **80/80 ca `CHOT` đạt 100%**; chỉ 5/20 ca `PHAN_VAN` (`95/100`) rơi khỏi top 10 khi không còn dùng trường nhiễm `phan_biet` / `explanatory-notes.json`:
     - `7223` ("Dây hàn bằng thép hợp kim"): bản cũ đạt #1 nhờ `explanatory-notes.json` **gán nhầm** văn bản *"thép hợp kim loại trừ thép không gỉ"* của `7224/7228` vào `7223` ("Dây thép không gỉ"); dùng luật gốc thì `7223` đứng #4 sau `7217, 7228, 7229`.
     - `3920` ("Dây chống bai / Nhựa TPU"): mất cạnh `3926 -> 3920` trước lấy từ `cgh['3926'].phan_biet` (`vd. 39.20-39.25`).
     - `8543` ("Bộ xử lý hình ảnh"), `8436` ("Máy tự động cắt kén tằm"), `6111` ("Váy liền thân trẻ em gái"): thiếu các cạnh liên kết/mô tả tóm tắt do `phan_biet` + `explanatory-notes.json` cũ từng cộng thêm.
   - Đề xuất QT cân nhắc: mở quyền sửa ca `1212` ở `test-engine-loop.mjs` (và điều chỉnh kỳ vọng/nhãn ở `test-tim-cgct.mjs` phần `4so-v1.jsonl` sạch không phụ thuộc trường nhiễm), tương tự PR `#1948` cho M-21.

---

## 4. Chốt hướng 1 theo nhận xét QT (26/11): giữ nguyên mã `lib/tim-cgct.js` bản `10cbfe68`, ghi công khai nợ 5 ca rơi

- Hoàn nguyên 100% `lib/tim-cgct.js` về đúng từng byte của `10cbfe68` (không vá từ khoá/trọng số theo ca).
- Chấp nhận kết quả đo thật `do-recall-4so.mjs --cgct=so-sanh --mode=ca-hai`: **95/100** (`CHOT 80/80, PHAN_VAN 15/20`; `split` `avg 45.5 ms`, `p95 87.9 ms`, `+9.8 ms/lượt`; `raw` `avg 45.2 ms`, `p95 89.6 ms`, `+9.7 ms/lượt`), giảm từ 100/100 do bỏ trường nhiễm cũ nên 5 nhóm láng giềng rơi xuống dưới cửa sổ top 10 của `TOP_NHOM_CGCT = 10`:
  - ca 47 (`8543`, Bộ xử lý hình ảnh): hạng **11/40**
  - ca 62 (`8436`, Máy tự động cắt kén tằm): hạng **11/40**
  - ca 65 (`7223`, Dây hàn bằng thép hợp kim): hạng **13/40**
  - ca 99 (`6111`, Váy liền thân trẻ em gái): hạng **20/40**
  - ca 23 (`3920`, Dây chống bai, chống giãn TPU): hạng **35/40**
- Đề xuất xử lý nợ ở thẻ riêng: nối cửa vào tìm nghĩa (M-37, #1946 đã ký) hoặc đánh giá lại ngưỡng `scripts/test-tim-cgct.mjs:154` khi không còn phụ thuộc trường nhiễm cũ.
