# Bước 7 — Một engine: nối tri thức đã xây vào đường ERP đang dùng

**Ngày:** 2026-10-06 · **Trạng thái:** ⚙️ Đợt 1 xong (lõi dùng chung + cửa đối chiếu); còn nối từng bộ tri thức

## Vì sao có bước này

Kế hoạch gốc (`docs/methodology/PLAN-hs-classification-engine.md`, phương pháp
`hs-code-vn-SKILL.md` M0–M8) là **một** engine 6 tầng. Thực tế sau nửa năm, repo có
**3 luồng tra mã chạy song song**, mỗi luồng dùng một phần kho tri thức khác nhau:

| Luồng | Ai gọi | Đặc điểm |
|---|---|---|
| `/api/classify` (`lib/classify.js`) | **ERP / tiện ích OZSource** | Hiểu tiêu đề tiếng Trung, AI đề xuất nhóm + chọn mã có chú giải nhóm. Nghèo tri thức tầng 6/8 số |
| `/api/suggest` một món (`lib/suggest-core.js`) | MCP, người dùng ngoài | Giàu tri thức tầng 6/8 số (xem bảng dưới), nhanh |
| `/api/suggest` nhiều món (`handleBatch` trong `api/suggest.js`) | ít dùng | Luồng mỏng thứ ba — **chưa gộp** (việc E-5) |

Bản đồ tri thức → luồng (kiểm kê 06/10/2026):

| Tri thức đã xây | classify | suggest | Ghi chú |
|---|---|---|---|
| Hiểu tiêu đề tiếng Trung (`query-understand`) | có — **thay tên gốc** | có — chỉ để khớp chữ | E-2 |
| Ứng viên: AI đề xuất nhóm + tiền lệ Oz (`retrieve-candidates`) | có | có (`suggest-candidates`) | |
| Chú giải nhóm GỒM/LOẠI TRỪ trong prompt | có | không | |
| Bảng phân giải `conflict-tables` (B3.5) + `decision-tables` (B3.6) | có | có | |
| Kiểm dòng 8 số + mâu thuẫn có/không (`subheading-check`) | có | có | |
| Cổng tiền lệ TB-TCHQ (`precedent-search`) | có | có | |
| Chống thiên vị "Loại khác" (`residual-guard`) | **qua cửa đối chiếu** | có | 52% tờ khai thật là Loại khác |
| Cặp mã dễ nhầm (`confusion-pairs`) | **qua cửa đối chiếu** | có | |
| Sửa của nhân viên (`learned-corrections`) | **qua cửa đối chiếu** | có | |
| Bộ máy GIR (`gir-engine`, `gir.js`) | một phần | có | G-5 |
| 728 mệnh đề loại trừ có cấu trúc (`legal-notes-enriched.json`) | **không** | **không** | G-2 — chưa ai nối |
| Quy tắc hàng hỗn hợp (`mixture-rules.json`), `loai-khac-classifier` | không | không | E-4 |

## Đo sạch (D-4) — 80 tờ khai GIỮ RIÊNG + 33 món Taobao thật

`scripts/bench-classify-llm.mjs --engine=classify|suggest`, `HS_EVAL_EXCLUDE_HOLDOUT=1`
(trước đó bộ đo không bật cờ này → kho tiền lệ chứa chính tờ khai đang thi, số bị thổi
phồng ~10 điểm ở 8 số). Image `hs-code-api:d6f286cf`, MiniMax-M2.7-highspeed.

| Tỉ lệ đúng | 2 số | 4 số | 6 số | 8 số | Loại khác (44 mẫu) | Thời gian | Không ra mã |
|---|---|---|---|---|---|---|---|
| classify | 77,5 | 62,5 | 45,0 | 31,3 | 22,7 | 86 s | 8/80 |
| suggest | 75,0 | 60,0 | 52,5 | 37,5 | 29,5 | 18 s | 0 |
| Taobao — đúng nhóm 4 số | classify **88,9** | suggest 55,6 | | | | | |

Hai luồng **bù nhau**: classify mạnh phần trên (hiểu hàng, chọn nhóm), suggest mạnh
phần dưới (6/8 số). Hai luồng cùng ra một mã 8 số: 18/80 ca, đúng 15.

ERP thật 14 ngày (đến 06/10): **9/53 món "DONE" mà không có mã** — classify chờ
MiniMax quá giờ rồi trả rỗng.

## ĐÃ LÀM

1. **`lib/suggest-core.js`** — tách lõi `/api/suggest` khỏi handler HTTP, không đổi
   hành vi (test parity + gir-leak trỏ sang file mới).
2. **`classify()` = `classifyPrimary()` + cửa đối chiếu** (`mergeSecondOpinion`, hàm thuần):
   - chạy song song suggest-core trên chữ GỐC (tiêu đề + thông số);
   - bước chính rỗng → dùng kết quả cửa đối chiếu (độ tin ≤60, `review.needed`) — **không
     bao giờ trả rỗng** khi còn kết quả;
   - cùng nhóm 4 số, khác dòng → lấy dòng 8 số của suggest (`crossCheck.subheadingFrom`),
     TRỪ khi bước chính có căn cứ mạnh hơn: bảng quyết định đã chỉnh, bộ kiểm mâu thuẫn,
     mã 6 số đang chờ hỏi dữ kiện;
   - hai luồng khác mã 8 số → `review: { needed: true, reasons: ["Phân vân 2 mã …"] }` và
     cả hai mã nằm trong `results` để chuyên viên chọn. Trùng mã → `review.needed: false`.
   - Mô phỏng trên số đo D-4: đúng 4 số 62,5 → 65,0; 8 số 31,3 → 37,5; Taobao giữ 88,9;
     **sai mà không bị gắn cờ: 3/80**.
   - Tắt: `opts.crossCheck=false` hoặc `HS_CLASSIFY_CROSSCHECK=0`.
3. `scripts/test-classify-crosscheck.mjs` — 10 test (rỗng, cùng nhóm, khác nhóm, khoá bảng,
   khoá mâu thuẫn, NEED_FACTS, cửa đối chiếu lỗi).

## VIỆC MỞ RỘNG

### E-1 · ERP hiển thị `review` — P0 · ~1 ngày
ERP (`src/lib/extension/hs-policy.ts`) đọc `review.needed/reasons` + `crossCheck` → chip
"Phân vân 2 mã — chuyên viên xem lại" trong món hàng + danh sách chờ duyệt. Chưa làm thì
cờ chỉ nằm trong JSON.

### E-2 · Giữ tên GỐC làm khoá tìm — P0 · ~2 ngày
`prepareClassifyInput` đang THAY `tenHang` bằng tên tiếng Việt AI đặt; tên đó làm khoá cho
đề xuất nhóm, tìm tiền lệ, GIR. Gọi sai tên ở lượt đầu = sai cả chuỗi (hàng lưỡng dụng).
Sửa: tên AI đặt chỉ là gợi ý (`SUY_LUAN`); tìm tiền lệ theo model / chữ Trung; tên khai
ECUS lấy theo câu chữ biểu thuế SAU khi chốt mã.

### E-3 · Hết giờ MiniMax — P0 · ~1 ngày
Bước chính 90–240 s/món; prod chỉ có MiniMax (không Hermes/OpenRouter dự phòng). Cần: ngân
sách thời gian theo tầng, provider dự phòng, và đo tỉ lệ `PRIMARY_EMPTY` hằng tuần.

### E-4 · Nối từng bộ tri thức vào ĐÚNG tầng, đo sau mỗi lần — P1
Thứ tự: (a) `residual-guard` + `subheading-check` vào tầng 8 số của luồng chính (bỏ phụ
thuộc cửa đối chiếu); (b) G-2 mệnh đề loại trừ `legal-notes-enriched` vào tầng chọn nhóm;
(c) D-3 định tuyến 6 số; (d) `mixture-rules` (GIR 3b). Tri thức tra cứu cục bộ chạy cố định
mọi lượt — KHÔNG để AI tự quyết khi nào gọi (HSCodeComp: agent "chốt vội", bỏ công cụ).

### E-5 · Gộp `handleBatch` vào `suggestCore` — P2 · ~4h

### E-6 · Nguồn ngoài theo luật cố định — P1
made-in-china (pilot 06/10: chương 84/85/90, ≥2 shop cùng ghi mã → 6/6 đúng 6 số; hàng khác
5/11): chỉ bật cho hàng có model thuộc 84/85/90 hoặc khi hai luồng bất đồng; chỉ đọc ô có
cấu trúc (JSON-LD `HS Code`, Material, Application), không đọc văn quảng cáo.

### E-7 · Cờ chính sách THEO TÊN (đã làm 09/10/2026 — nhánh `feat/policy-name-listings`)
CEO 08/10: *"hàng có chính sách, dò theo tên gọi và chức năng chính mà không được gắn cờ để nhân viên
kiểm tra lại?"* — 9004.90.10 "Kính thuốc" là thiết bị y tế theo 05/2022/TT-BYT Điều 6 mục 43, nhưng văn bản
không có bảng mã HS nên `hsListings` (khớp theo mã) không bao giờ bật.
- `lib/policy-name-match.js` `matchPolicyByName({hs, tariffNameVi, productNameVi, purposeVi})`: khớp **cả cụm**
  âm tiết đã chuẩn hoá (`lib/vi-tokens.js`, giữ dấu) vào tên dòng biểu thuế + tên hàng + công dụng, lọc theo
  chương. Hai nguồn: `data/policy-name-rules.json` (soạn tay) + dòng `hs: null` của `plhq-hs-index`
  (`plhq-registry.nameListings()`, vế ≥ 2 âm tiết). Không LLM.
- Thang mức: **NOTICE** + `reviewByName: true` + `hasActionablePolicy: true`; `policyLines` thêm dòng
  "Có thể thuộc quản lý <bộ> theo <số hiệu> — "<cụm>" khớp <đâu> — chuyên viên kiểm"; `/api/tax` trả
  `policyByName[]`; `ministries` cộng thêm cơ quan ban hành văn bản khớp (`fromPolicyDoc: true`).
- `/api/tax?hs=…&name=…&purpose=…` (tuỳ chọn, ERP gửi sau); thiếu vẫn khớp bằng tên dòng biểu thuế.
- **Thêm mục vào `data/policy-name-rules.json`**: một object trong `rules[]` với `id`, `nguon` (số hiệu +
  điều/mục hoặc nơi trích — KHÔNG bịa), `soHieu`, `trichDan` (nguyên văn), `cumTu[]` (cụm tiếng Việt có
  dấu, 2+ âm tiết, tên hàng rõ — không đưa từ rộng như "hoá chất"), `chapters[]` (chương 2 số được phép
  khớp — chặn "kính" bắt kính xây dựng chương 70), `coQuan`, `loaiTacDong` (cùng bộ mã plhq-hs-index),
  `ghiChu` (NV cần kiểm gì). Chạy `node scripts/test-policy-name-match.mjs`.
- Việc mở: khi oz-wiki trích xong bảng 19/2024/TT-BYT (có mã) thì mục `byt-05-2022-d6-43-kinh-mat` trở
  thành lưới phụ — giữ, vì tên hàng vẫn bắt được mã khai sai nhóm.

### E-8 · Bảng quyết định CHƯA duyệt → tư vấn (advisory), không ghi đè (10/10/2026 — nhánh `feat/decision-table-8708`)
Ca ốp gầm Leapmotor (xem `05-decision-tables.md` D-7): bảng 8708 chưa CEO duyệt trước đây bị classify/engine-loop BỎ HẲN.
Nay cả hai động cơ: RESOLVED cùng nhóm 4 số → `decisionAdvisory {hs, ruleId, reasonVi, agrees, assumedFacts, noteVi}`;
khác mã → `antiPatternWarnings[decision-table-advisory]` + `review.needed` (áp ở mọi đường ra của cửa đối chiếu, kể cả khi
cửa đối chiếu lỗi) + mã bảng vào `results` (`source: decision-table-advisory`, confidence null). Engine-loop: dòng
"bảng quyết định chưa duyệt — chỉ tư vấn → RESOLVED …" trong gói kiểm chứng vòng 2 (`gather().tables`), G5 cảnh báo, kết quả
có `decisionAdvisory` + review. Không bao giờ `RESOLVED_BY_TABLE` / `RULE_TABLE` cho bảng chưa duyệt. ERP (E-1) nên hiển thị
cùng chip "Phân vân 2 mã". Test: `test-classify-decision-table` (+10), `test-classify-crosscheck` (+3), `test-decision-tables` (+11).

## DUY TRÌ THEO THỜI GIAN

| Nhịp | Việc | Vì sao |
|---|---|---|
| **Sau mỗi lần đổi pipeline/prompt** | `bench-classify-llm.mjs` cả hai `--engine`, ghi image SHA vào bảng trên | Không đo thì không biết tiến hay lùi |
| **Hằng tuần** | Đếm món ERP `DONE` không có mã + tỉ lệ `review.needed` | Rỗng = lỗi im lặng; cờ quá nhiều = nhân viên bỏ qua cờ |
| **Khi thêm tri thức mới** | Cập nhật bảng "Tri thức → luồng" ở trên | Lý do có bước này: tri thức xây xong mà không nối |
| **Khi có văn bản KTCN mới không bảng mã** | Thêm mục `data/policy-name-rules.json` (E-7) | Không có mã thì chỉ tên mới bật được cờ |

## Đợt 2 (06–07/10/2026) — động cơ hai vòng + chốt chặn (`lib/engine-loop.js`, bật `HS_CLASSIFY_ENGINE=loop`)

CEO chốt lại kiến trúc: **AI là bộ não phân loại, suy luận trước — dữ liệu tĩnh là CHỐT CHẶN, không phải gợi ý.**
Phần AI độc lập trong ERP (`hs-suggest.ts`) là thiết kế có chủ đích, không phải lỗi như bước 7 đợt 1 đã ghi.

| Vòng | Ai làm | Việc | Mẫu |
|---|---|---|---|
| 1 | AI | Hồ sơ hỗn độn → hồ sơ bản chất 3 thứ tiếng (ô nào cũng kèm nguyên văn) + giả thuyết Chương→Nhóm→Phân nhóm theo GIR + lệnh kiểm chứng (từ khoá Việt, chương cần mở, mã cần xem, truy vấn made-in-china) | `LLM_STEP_UNDERSTAND=MiniMax-M3` |
| — | Máy chủ | Thực hiện lệnh kiểm chứng, **bổ sung lệnh bắt buộc AI quên**: chú giải + dòng biểu thuế mọi nhóm nêu; tiền lệ Oz theo mọi tên Việt; TB-TCHQ; bảng quyết định; cặp mã dễ nhầm; chính sách (biểu thuế + oz-wiki); made-in-china khi có model / chương 84-85-90 (`lib/mic-lookup.js`, robots-allowed, chỉ ô có cấu trúc, cache 30 ngày) | tất định |
| 2 | AI | Quyết định trên gói đã gom: CHOT / DE_XUAT (tranh chấp GIR 3) / HOI (câu hỏi về thuộc tính hàng, không nhắc mã) | `LLM_STEP_GIR=MiniMax-M3` |
| — | Máy chủ | **Chốt chặn**: mã tồn tại · câu trích đặc tính & điều kiện ĐẠT/TRÁI phải có trong HỒ SƠ GỐC (không phải chữ AI vòng 1 — chống tự chứng nhận) · "trừ X"/"không có X" · nhóm chưa kiểm chú giải (máy tự bổ sung) · made-in-china ≥2 shop khác nhóm (hàng máy) · bảng đã duyệt ghi đè | tất định |
| 3–4 | AI | Chỉ khi bị chặn: nhận đúng lý do, sửa hoặc giải thích bằng câu chữ luật | M3 |

Đo thử 2 món thật (07/10): dao hái cau → 8201.90.00 (67–88 s, 2 lượt AI); máy khuếch tán tinh dầu → 8509.80.90 (146 s, cờ tranh chấp).
M2.7 làm "bộ não" không đạt: vòng 1 đoán 9507 (cần câu), vòng 2 vượt 150 s; M3 đúng cả hai và nhanh gấp đôi.
Số đo bộ sạch ghi ở PR tương ứng. Việc mở: E-6 made-in-china đã có bản đầu; câu hỏi CHƯA RÕ chỉ lấy điều kiện khẳng định (phủ định là loại trừ AI đã cân nhắc).

### Trạng thái 07/10/2026 chiều (đã lên prod)
- **Bộ não = Gemini 3.8-flash** (#164): `LOOP_PROVIDER=gemini`, `LOOP_GEMINI_MODEL=gemini-3.8-flash`, key trả phí trong `hs.env`; 503/429 thử lại 5/15/30 s rồi rơi về MiniMax-M3 (M3 tắt thinking nếu vượt token). Đo sạch 80 tờ khai: 8 số 57,5–58,8 (M3 51–57,5), top3 76; Taobao 33: 4 số 100; 35–45 s/món. Biến thiên giữa hai lần chạy ±5–7 điểm → so sánh mẫu phải chạy ≥2 lần.
- **Cổng trích dẫn** `verifyQuote` (lib/classify.js): so khớp cả câu sau khi bỏ dấu câu/khoảng trắng (NFC, chỉ giữ chữ-số) trước khi tách mảnh — trước đó câu trích nguyên văn có "/()*" bị bác → cờ giả 32–56 %.
- **Cờ tiền lệ Oz**: tiền lệ cov ≥ 75, ≥ 3 tờ, ≥ 60 % trọng số mà khác nhóm 4 số với mã chọn → `review.needed`.
- **Vòng phản hồi từ ERP** (#165): `POST /api/feedback` nhận thêm `source`, `input{titleZh,specsZh,nameVi,facts}`, `systemTop3`, `agrees`, `chosenBy`. ERP (Gitea #305) gửi mỗi khi nhân viên chốt mã; mã chốt đi theo món sang đơn hàng (`OrderItem.hsCode`). Việc mở: đọc lại các bản ghi này thành tiền lệ Oz có lý do (hiện `learned-corrections` chưa dùng trường `input`).
- Gọi tay để thử: `Authorization: Bearer $HS_API_TOKEN`, body `{tenHang, nameZh, specs}` (ERP gửi đúng thế; thiếu `tenHang` → 400).
- Việc kế của repo: bước 8 (sổ tay chú giải) — xem `08-so-tay-chu-giai.md`.

### Phiếu: SKU đang chọn + kiện + ảnh (vision) — 09/10/2026 (`feat/sheet-images-sku`)
CEO: thẻ cấu trúc trên sàn (bảng thuộc tính, SKU đang chọn, bảng kiện) là nguồn chính xác nhất; ảnh SKU khách chọn
thể hiện thông tin cụ thể; ảnh chi tiết chỉ bổ sung rộng. `/api/declaration-sheet` nhận thêm `skuSelected`, `packaging`,
`descriptionText`, `images` (chi tiết: `docs/integration-guide.md` §5c; openapi).
- **Luật ưu tiên nguồn, ô nào có rồi nguồn yếu hơn không đè:** người bổ sung > **SKU đang chọn** (tất định, tin 0.95,
  số đo rút regex, thắng bảng thuộc tính liệt kê nhiều giá trị) > bảng thuộc tính trang > bảng kiện (ô riêng `package*`,
  không vào mô tả ECUS, không đè kích thước sản phẩm) > ảnh (vision `IMAGE_AI` ≤ 0.8 / OCR) > mô tả (chỉ dòng có cấu trúc).
- Vision: `lib/image-facts.js` + `geminiGenerateWithImages` (lib/gemini.js) — ≤ 2 ảnh, một lượt, host sàn, 3 MB, 8 s;
  `HS_SHEET_VISION` bật/tắt. Từ điển zh thêm `packageDimensions/packageWeight/packageVolume` (包装尺寸 rời khỏi `dimensions`).
- Sửa vĩ mô kèm theo: nhãn = bộ phận + phần lạ (镜片折射率) không còn khớp giả thành ô của bộ phận (lensMaterial).
- Việc mở: đo thật vision trên 20 món 1688 (ảnh SKU có chữ in vs ảnh render); nếu AI hay trả màu/chất liệu quan sát sai
  → hạ trần tin cậy ô quan sát xuống 0.6 hoặc chỉ nhận `seenText`.

### Mã HS nhà cung cấp tự khai — `supplierHs` (09/10/2026, `feat/classify-supplier-hs`)
CEO: thêm sàn made-in-china — trang sản phẩm ghi sẵn HS của nhà cung cấp (mã TQ 8–10 số, chỉ 6 số đầu theo HS quốc tế).
Đúng tầng: **một nguồn kiểm chứng** (ưu tiên hơn "shop khác" vì đúng trang NCC), không phải đáp án.
- `POST /api/classify` nhận `supplierHs {code, source, url}` (phòng thủ: chỉ chữ số ≥ 6, source/url cắt ngắn, nhóm phải có
  trong biểu thuế VN — không thì bỏ). `lib/engine-loop.js`: `normalizeSupplierHs` / `supplierAgree`.
- `gather`: nhóm NCC luôn vào `headings` (chú giải + dòng biểu thuế); gói kiểm chứng có mục "NHÀ CUNG CẤP KHAI HS" kèm
  dòng biểu thuế VN của phân nhóm 6 số. `candidates.precedentCodes` không trộn mã TQ.
- Cổng G7 `NCC_KHAI_KHAC_NHOM`: khác NHÓM chưa giải trình → chặn 1 lần (vòng 2); sau cùng vẫn khác nhóm → `review.needed`
  "NCC khai … / hệ thống chọn …". Khác 6 số cùng nhóm → warning nhẹ. Cùng 6 số → +5 tin cậy, basis `NHA_SAN_XUAT`.
- Output `dossier.supplier {code, hs6, heading4, source, url, agree: SAME6|SAME4|DIFF}`. Động cơ cũ: chỉ thêm lý do
  `review` khi khác nhóm (`withSupplierHsReview`, lib/classify.js).
- Việc mở: đo thật trên lô made-in-china đầu tiên — tỉ lệ NCC khai đúng nhóm so với mã chuyên viên chốt; nếu NCC đúng
  nhóm > 90 % thì cân nhắc nâng từ "cảnh báo" lên "chặn tới trần vòng".

### Thư viện đặc điểm theo nhóm — lọc trước AI (10/10/2026, `feat/heading-lexicon-filter`)
CEO 10/10: *"Thư viện các đặc điểm, tính chất, từ khoá của từng nhóm mục tiêu — lọc bớt rác chủ động, giảm áp lực và
nhiễu cho LLM."* Đo thật ca kính lão 1688 (9004): AI nhận 24 dòng thông số, 10 dòng rác (上市年份/季节, 脸型, 风格…)
= 47 % ký tự; OCR đưa nguyên 60 % quảng cáo/chính sách; 2 lượt AI cùng gói; 镜片功能 → 功能 đẻ `machineFunction`.
Dựng từ mầm có sẵn, không viết từ điển mới:
- `lib/heading-lexicon.js` `lexiconFor(hs)`: ô bắt buộc + nên có của nhóm (`heading-declaration-fields`, rơi về chương,
  không mã → toàn từ điển 'global') + ô chung TT 39 + origin → `keepKeys` / `keepLabelsZh` (nhãn zh qua
  `attribute-synonyms-zh` + nhãn ghép bộ phận `parts-zh` × chất liệu/màu/kích thước). Cache theo nhóm.
- `data/noise-labels-zh.json`: 78 nhãn rác toàn cục (mỗi nhãn 1 ghi chú vì sao) + mẫu `^是否(跨境|进口|现货…)` +
  `ocrNoise` (NOISE + POLICY chuyển từ addon `src/lib/ocr-score.ts`). Addon giữ bản riêng để CHỌN ẢNH; đây lọc DÒNG.
- `lib/source-filter.js` `filterSources`: SKU đang chọn luôn giữ > nhãn thuộc thư viện / giá trị có số+đơn vị giữ >
  nhãn rác bỏ > còn lại `misc` ≤ 300 ký tự (AI thấy, từ điển không đọc). OCR: bỏ dòng có từ quảng cáo (trừ dòng có cặp
  nhãn keep), giữ dòng nhãn：giá trị / số+đơn vị / nhãn keep (+ dòng kế — bảng OCR tách nhãn và giá trị) / dấu hiệu công
  dụng (用于…), ≤ 1.500 ký tự/ảnh. Mô tả: `filterDescriptionLines` + luật rác. Tắt: `HS_SOURCE_FILTER=0`.
- Nối: `extractSpecs` nhận `hsCode` (+ `focusKeys`) → lọc TRƯỚC từ điển và `sourcesOf`; khoá sinh từ nhãn bộ phận phải
  ∈ keepKeys (镜片功能 không còn đẻ machineFunction cho kính). Phiếu: lượt VÁ gửi `focusKeys = ô còn thiếu` → chỉ
  nhãn của ô đó + số+đơn vị + SKU + tên hàng. Prompt SYSTEM thêm 1 dòng "Ô cần cho nhóm này: key: labelVi".
  Trả `extraction.filter {source, stats, dropped ≤ 30 (lý do), miscLabels}`; nhãn misc → tín hiệu nhu cầu `LABEL_UNKNOWN`
  (`/api/demand` mục `unknownLabels`, kèm nhóm, không định danh) để thư viện lớn dần từ hàng thật.
- Đo trước/sau (`scripts/bench-sheet-filter.mjs`, AI giả lập dịch mọi mục; ca 1688/Tmall từ addon 10/10, ổ cắm từ test):

| Ca | Gói AI lượt 1 | Gói AI lượt vá | Tổng gói AI | Nguồn chữ 2 lượt | Specs vào→giữ | OCR ký tự | Ô bắt buộc |
|---|---|---|---|---|---|---|---|
| 1688 kính lão 9004 | 1086 → 973 (−10 %) | 542 → 255 (−53 %) | **−25 %** | 746 → 352 (**−53 %**) | 24→12 | — | 8/8 → 8/8 |
| Tmall kính lão 9004 | 1192 → 1111 (−7 %) | 594 → 455 (−23 %) | **−12 %** | 780 → 614 (−21 %) | 15→9 | — | 6/8 → 6/8 |
| Taobao ổ cắm 8536 + 3 ảnh OCR | 830 → 688 (−17 %) | 725 → 480 (−34 %) | **−25 %** | 726 → 391 (**−46 %**) | 11→6 | 201→116 | 6/8 → 6/8 |
| 1688 kính + 3 ảnh OCR *mẫu* | 1375 → 1056 (−23 %) | 831 → 338 (−59 %) | **−37 %** | 1152 → 462 (**−60 %**) | 24→12 | 203→55 | 8/8 → 8/8 |

  0 ô bắt buộc mất ở cả 4 ca. Mục tiêu −35 % đạt trên **nguồn chữ** (phần nhiễu thật) ở 3/4 ca và trên cả gói khi có
  OCR; gói lượt 1 của ca chỉ có bảng thuộc tính giảm ít (7–10 %) vì phần cố định (allowedKeys, translate lặp lại
  giá trị gốc) chiếm hơn nửa gói — muốn giảm nữa phải đổi giao thức user JSON (việc mở, chưa đụng).
- Việc mở: (1) gắn fact so-tay/legal-notes vào khoá thuộc tính (chưa có chữ zh) để thư viện nhóm có thêm từ khoá luật;
  (2) `translate` không lặp giá trị đã có trong `sources` (đổi giao thức → phải bench lại MiniMax/Gemini);
  (3) 眼镜款式 → eyewearType trong từ điển đang khớp "多边形" (hình gọng) thành loại kính — sửa từ điển; (4) đo thật
  prod 20 món 1688 xem `misc`/`LABEL_UNKNOWN` gom ra nhãn nào cần đưa vào thư viện.

### Bảng phương án khai — `dossier.declarationOptions` (10/10/2026, `feat/declaration-options`)
CEO (ca tấm bảo vệ gầm/pin thép mangan dập định hình theo xe Leapmotor): *"Kết quả hơi bó hẹp vào 1 nhóm (8708.29 vs
8708.99), trong khi khai là tấm thép định hình sẵn (7326) cũng có thể được. Làm sao để không bỏ lỡ những phương án kiểu
như vậy."* Động cơ chỉ đưa phương án thay thế TRONG cùng nhóm → chuyên viên không thấy đường phân loại theo vật liệu.
- `lib/declaration-options.js` `buildDeclarationOptions({top, results, dossier, gathered, origin, review, materialTexts,
  partTexts})` → ≤ 4 phương án `{hs, nameVi, kind, canCuVi, dieuKienVi, ruiRo THAP|VUA|CAO, ruiRoVi, thue{mfn, acftaCn,
  acftaNoteVi, vat}, coChinhSach{level, lineVi}, khuyenNghi, ghiChuVi?}`. Bốn nguồn: (a) mã chọn `CHON` (khuyến nghị duy
  nhất; rủi ro theo CHOT/DE_XUAT/HOI/cờ review/độ tin); (b) `CUNG_NHOM` từ `results[1..]` + `dossier.alternatives`
  (AI khác nhóm → `KHAC`); (c) `THEO_VAT_LIEU` — vật liệu chính (product.material → ô chất liệu → thông số; từ khoá
  Việt/Anh/Trung, kiểm biên từ) → `data/material-fallback-headings.json` (thép 73.26/73.08 kết cấu, nhôm 76.16, đồng
  74.19, plastic 39.26, cao su 40.16, gỗ 44.21, thuỷ tinh 70.20, dệt 63.07, da 42.05, gốm 69.14), CHỈ khi hàng là bộ
  phận/phụ kiện/tấm/vỏ/giá đỡ và mã chọn chưa thuộc nhóm công dụng chung (73.18, 73.20, 83.01…); (d) `KHAC` từ NCC tự
  khai khác nhóm, made-in-china đồng thuận khác nhóm, tiền lệ Oz (cov ≥ 75, ≥ 3 tờ) khác nhóm.
- **Đúng luật, không gợi ý khai sai:** rủi ro đường vật liệu theo PHẦN của mã chọn — XVI/XVII/Chương 90 = **CAO** (Chú
  giải 2 Phần XVI, 2(b)+3 Phần XVII, 2 Chương 90: bộ phận nhận dạng được cho máy/xe xếp theo máy/xe; chỉ "bộ phận công
  dụng chung" theo Chú giải 2 Phần XV mới theo vật liệu), XV = VUA, còn lại = VUA (GIR 3(a)). Vẫn LIỆT KÊ để chuyên viên
  thấy; AI vòng 2 đã loại đúng mã đó → `ghiChuVi` ghi lý do AI loại. Thuế/cờ từng phương án qua `buildTaxLookup`
  (ACFTA theo `acfta.forOrigin`, CN bị "(-CN)" → `acftaCn: null` + ghi chú; `coChinhSach` = policyLevel + dòng
  BLOCKING/NOTICE đầu).
- Nối: `classifyLoop` → `dossier.declarationOptions` (bỏ qua khi còn cổng chặn); `SYS_R2` thêm yêu cầu `alternatives`
  khác nhóm/chương theo vật liệu kèm `whyNot` (gate không đổi — mã khác nhóm vẫn bị `NOT_IN_CANDIDATE_HEADINGS` khỏi
  `results`, nhưng vào bảng phương án). Động cơ cũ (`classify()` → `withDeclarationOptions`): chỉ (a)+(b)+(c).
- Test `scripts/test-declaration-options.mjs` (25 ca, AI giả, cả hai động cơ). ERP: `hsCodeSuggestions[0].declarationOptions` (≤ 4, cắt
  chuỗi), trang NV `HsManagePanel` bảng "Phương án khai (cân nhắc)" — không hiện cho khách.
- Việc mở: (1) đo thật 20 món bộ phận xe/máy — tỉ lệ chuyên viên chọn phương án ≠ máy; (2) `KHAC` từ bảng quyết định
  chưa duyệt (`decision-table-advisory`) đang đi qua `results` → đã vào bảng, chưa có test riêng; (3) vật liệu composite
  (sợi carbon, kim loại không rõ) chưa có đường.
