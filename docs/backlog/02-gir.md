# Bước 2 — GIR trung thực: audit trail phải chịu được đối chất

**Ngày:** 2026-09-07 · **Trạng thái:** ✅ Xong (phần nền)

## Vấn đề đã sửa

`girRulesApplied[]` là **bằng chứng người khai đưa ra khi giải trình với Hải
quan**. Trước bước này nó được sinh ở **6 nơi** khác nhau, mâu thuẫn nhau và mâu
thuẫn cả với tài liệu API:

| Nguồn cũ | Nó thật sự làm gì | Sai ở đâu |
|---|---|---|
| `lib/gir-engine.js` | Cộng/trừ điểm heuristic | Gắn nhãn `GIR-2a` khi khớp từ khoá đặc tính — GIR 2(a) nói về hàng **chưa lắp ráp**, không liên quan. `GIR-3a` chỉ là ngưỡng điểm số. |
| `lib/suggest-evidence.js` | Checklist dữ kiện theo chương | Đặt tên là `girRulesApplied` nhưng không chứa quy tắc nào |
| `api/suggest.js` | `detectSet → GIR-3b` | Đúng, nhưng lẫn vào mảng chuỗi không có căn cứ |
| `lib/precedent-search.js` | `girPrecedentRule: 'GIR-4'` | GIR 4 là **biện pháp cuối cùng**; gắn mỗi khi có tiền lệ khớp là sai bản chất |
| `data/conflict-tables.json` | Bảng người soạn, có `source` | Đúng — nhưng bị trộn chung với các nguồn yếu, không phân biệt được |
| LLM trong `classify.js` | Model tự khai `"gir"` | Không kiểm chứng, trình bày như thể đã xác minh |

Hệ quả: một AI hoặc cán bộ đọc `girRulesApplied` không có cách nào biết mục nào
đủ chắc để đưa vào hồ sơ. Trích sai điều luật còn tệ hơn không trích — bị bác một
lần là mất uy tín cả hồ sơ.

## ĐÃ LÀM

**`lib/gir.js`** — nguồn chân lý duy nhất. Nguyên tắc: *không bao giờ phát ra một
trích dẫn GIR mà không kèm căn cứ và bằng chứng kiểm chứng được.*

- Registry đủ 6 quy tắc (9 khoá: 1, 2a, 2b, 3a, 3b, 3c, 4, 5, 6) kèm `titleVi` +
  `textVi` bám sát văn bản gốc WCO.
- **4 mức căn cứ** — người đọc phân biệt được ngay:

  | basis | Nguồn | Đưa vào hồ sơ giải trình? |
  |---|---|---|
  | `RULE_TABLE` | Bảng quyết định người soạn, có dẫn văn bản gốc | ✅ |
  | `DETERMINISTIC` | Code suy ra từ tín hiệu chắc chắn | ✅ |
  | `HEURISTIC` | Dò từ khoá / điểm ước lượng | ⚠️ cần người kiểm chứng |
  | `LLM_ASSERTED` | Model tự khai | ❌ |

- Mỗi trích dẫn kèm `evidence` cụ thể: cụm từ khớp, mã đã so sánh, khoảng cách
  điểm, trích đoạn chú giải loại trừ, `ruleId` của bảng quyết định.
- **GIR 4 chỉ áp khi không quy tắc nào khác áp được** — đúng bản chất "biện pháp
  cuối cùng".
- **GIR 3(c) chỉ áp khi thật sự hoà điểm (<3 điểm) VÀ mã chọn đúng là mã có thứ
  tự sau cùng** — trước đây gắn nhãn cả khi chọn nhầm mã đầu.
- **GIR 6 chỉ áp khi có ≥2 phân nhóm cùng nhóm 4 số** được đem so.
- LLM tự khai được ghi nhận nhưng đánh dấu `LLM_ASSERTED`, và **không nhân đôi**
  nếu quy tắc đó đã có căn cứ mạnh hơn.

**Tách bạch 3 trường trong response:**

| Trường | Nội dung |
|---|---|
| `girRulesApplied[]` | Chỉ trích dẫn có căn cứ |
| `rankingSignals[]` | Tín hiệu xếp hạng kỹ thuật — không có giá trị pháp lý |
| `chapterGuidance[]` | Checklist dữ kiện theo chương (nội dung cũ bị đặt nhầm tên) |

Kèm `girDisclaimer` bắt buộc.

**Kiểm chứng:** `scripts/test-gir.mjs` — **63 test**, gồm test hồi quy khoá chặt
lỗi cũ ("hàng hoàn chỉnh KHÔNG bị gắn GIR 2(a)"). Nối vào `npm test`.

**Tài liệu:** `docs/integration-guide.md`, `public/api-guide.json`, `CLAUDE.md`
rule #6 đã đồng bộ. Ghi rõ đây là **thay đổi hợp đồng** với ERP.

## ⚠️ Cần làm ở phía ERP

`erp-xnk` đang đọc `girRulesApplied` theo shape cũ. Sau khi PR này lên production,
ERP phải:
1. đọc shape mới (mảng object, không phải mảng chuỗi);
2. **hiển thị `basis` ngay cạnh mỗi trích dẫn** — người khai phải biết chỗ nào
   chắc, chỗ nào phải tự xác minh trước khi ký tờ khai;
3. hiển thị `girDisclaimer`;
4. chuyển phần hiển thị checklist chương sang `chapterGuidance`.

Liên quan Issue #37.

## VIỆC MỞ RỘNG

### G-1 · GIR 3(a) thật — so nguyên văn mô tả nhóm — P1 · ~1 tuần

Hiện 3(a) **chưa được phát ra**, vì `specificityScore` chỉ là điểm ước lượng nội
bộ, không phải phép so "nhóm nào mô tả cụ thể hơn". Đây là quy tắc được viện dẫn
nhiều nhất trong tranh chấp mã HS, nên đáng đầu tư.

Việc: dựng bộ so sánh mô tả nhóm dùng `data/chu-giai-heading.json` (`nhom`) —
đếm số điều kiện hạn định (theo vật liệu / công dụng / kích thước / công suất),
nhóm nào nhiều điều kiện khớp hơn thì cụ thể hơn. Phát `basis: DETERMINISTIC` kèm
`evidence` là hai đoạn mô tả đem so.

Nghiệm thu: test chứng minh 3(a) chọn đúng trên ≥10 cặp nhóm đã biết đáp án
(lấy từ TB-TCHQ).

### G-2 · GIR 1 mạnh hơn — kiểm mệnh đề loại trừ có thật sự loại hàng này không — P1 · ~4 ngày

Hiện GIR 1 chỉ phát khi chú giải nhóm **có chứa** ngôn ngữ loại trừ (867/1269
nhóm = 68%) — mới là cảnh báo "có mệnh đề loại trừ, đi kiểm tra đi", chưa phải
kết luận.

Việc: bóc mệnh đề loại trừ thành dữ liệu có cấu trúc (`loai_tru: [{điều kiện, nhóm
thay thế}]`), rồi đối chiếu với thuộc tính hàng. Khi hàng **thoả** điều kiện loại
trừ → nâng lên `DETERMINISTIC` và **loại thẳng ứng viên đó**. Đây là bước biến GIR
1 từ ghi chú thành cây quyết định thật.

Phụ thuộc: dùng chung `attributes.json` với conflict-resolver (bước 5).

### G-3 · GIR 5 phân biệt 5(a) và 5(b) — P2 · ~2 ngày

Hiện gộp làm một. 5(a) là hộp đựng chuyên dùng dùng lâu dài; 5(b) là bao bì đóng
gói. Hệ quả thuế khác nhau. Cần tách detector và test riêng.

### G-4 · Đối chiếu chéo: LLM khai GIR nào vs hệ thống xác minh được gì — P1 · ~3 ngày

Nay đã ghi cả hai (`LLM_ASSERTED` vs căn cứ thật). Nên đo: **tỷ lệ LLM khai đúng
quy tắc**. Đây là chỉ số chất lượng suy luận, quý hơn cả điểm top-1.

Việc: script chấm trên bộ mẫu benchmark, xuất `data/gir-agreement-report.json`,
đưa lên `/community-data.json` để công khai.

### G-5 · Bổ sung `gir` vào `/api/classify` — P2 · ~1 ngày

`api/classify.js` có `resolver.gir` nhưng chưa chạy qua `lib/gir.js`, nên response
của `/api/classify` vẫn thiếu `basis`/`evidence`. Cần thống nhất.

## DUY TRÌ THEO THỜI GIAN

| Nhịp | Việc | Vì sao |
|---|---|---|
| **Khi WCO cập nhật HS** (5 năm/lần, gần nhất HS 2022, kế tiếp **HS 2028**) | Rà lại `GIR_RULES` — nội dung 6 quy tắc rất ổn định nhưng chú giải phần/chương thì đổi | Chú giải đổi là cây quyết định đổi theo |
| **Hằng quý** | Rà `data/conflict-tables.json`: mọi `gir` phải normalize được bằng `normalizeRuleKey`; mọi rule phải có `source` | Bảng người soạn là căn cứ mạnh nhất — sai ở đây lan ra toàn hệ thống |
| **Hằng tháng** | Đọc `data/ml-log.jsonl`: thống kê phân bố `basis`. Nếu `LLM_ASSERTED` chiếm ưu thế nghĩa là phần suy luận có căn cứ đang teo lại | Cảnh báo sớm chất lượng tụt |
| **Khi TCHQ ra TB phân loại mới** | Bổ sung vào `precedents.json` + cân nhắc dựng bảng quyết định nếu là cụm mã hay nhầm | Tiền lệ mới là căn cứ mạnh, để nguội thì mất giá trị |
| **Mỗi lần đổi prompt LLM** | Chạy lại G-4 để xem tỷ lệ khai đúng quy tắc có tụt không | Prompt đổi âm thầm làm hỏng suy luận |

> **Cảnh báo nhịp:** chú giải chương/nhóm trong `data/chu-giai-*.json` hiện
> **không có ngày hiệu lực**. Khi Bộ Tài chính ban hành thông tư biểu thuế mới,
> chú giải đổi mà hệ thống không biết mình đang dùng bản cũ. Cần thêm trường
> `hieuLucTu` / `vanBan` cho từng chú giải — việc này nên gộp vào bước 5.
