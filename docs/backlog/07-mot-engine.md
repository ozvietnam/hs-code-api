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

## DUY TRÌ THEO THỜI GIAN

| Nhịp | Việc | Vì sao |
|---|---|---|
| **Sau mỗi lần đổi pipeline/prompt** | `bench-classify-llm.mjs` cả hai `--engine`, ghi image SHA vào bảng trên | Không đo thì không biết tiến hay lùi |
| **Hằng tuần** | Đếm món ERP `DONE` không có mã + tỉ lệ `review.needed` | Rỗng = lỗi im lặng; cờ quá nhiều = nhân viên bỏ qua cờ |
| **Khi thêm tri thức mới** | Cập nhật bảng "Tri thức → luồng" ở trên | Lý do có bước này: tri thức xây xong mà không nối |

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
