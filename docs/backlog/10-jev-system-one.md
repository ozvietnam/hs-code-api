# 10 — Jev (TypeSafe AI) ứng dụng vào chuỗi phân loại (đánh giá 14/10/2026, CEO đưa link)

> Nguồn: `typesafe.ai` + `docs.typesafe.ai` (introduction/quickstart). Jev là **System One model** —
> không sinh chữ, chỉ trả **quyết định có kiểu**: mỗi câu hỏi là `choice` (chọn 1 trong N ≤ 255,
> kèm `probabilities` + `confidence`), `score` (thang xếp hạng) hoặc `noul` (xác suất một mệnh đề
> đúng, 0–1). Một request chứa NHIỀU câu hỏi — chạy song song trên cùng `state` (text/JSON, tối đa
> ~32k token). ~70–500 ms/lượt; $42 / tỷ token input (~$0,0004 cho gói ~10k token). Có SDK Python/Node,
> có trên OpenRouter (`typesafe/jev-1.13`), có sẵn MCP server cộng đồng (`jev.mcp`).

## Vì sao Jev đáng bàn cho dự án này

Ba điểm đau ĐÃ ĐO của động cơ hiện tại (`09-hieu-suat-llm.md`) đúng vào sở trường của Jev:

| Điểm đau (đo được) | Jev giải thế nào |
|---|---|
| Chậm: 105–250 s/món vì vòng suy nghĩ dài × số vòng | Quyết định phụ ~0,1–0,5 s; chỉ ca khó mới cần bộ não sâu |
| Chốt nhầm vòng sửa: cổng chặn đẩy lên 4 vòng | Phân tầng 3 đường: tự tin cao → chốt ngay; giữa → review/leo thang; thấp → hỏi dữ kiện |
| **Calibration hỏng** (conf ≥ 80 mà sai 37,9 %; conf TB sai 87 vs đúng 95) | Jev trả **xác suất hiệu chuẩn từng câu** — đúng thứ mình thiếu để đặt ngưỡng |

Thêm điểm khớp thiết kế: `choice` bị **chặn trong danh sách phương án mình đưa** — Jev không thể bịa mã
ngoài candidate pool (đúng triết lý "máy chỉ chọn trong mã có trong biểu thuế").

## Bản đồ ứng dụng — chỗ dùng được, chỗ KHÔNG

**A. Bộ chọn dòng 8 số có xác suất (khớp nhất).** Sau `gather()`, gói bằng chứng ~9k token đã có sẵn
(chính là `state`): một request Jev gồm
- `choice` "dòng 8 số nào?" — criteria = 10 mã ứng viên, mỗi mã kèm tên dòng;
- các `noul` cho điều kiện sổ tay then chốt (vd "sản phẩm hoạt động bằng điện", "công suất trên 37,5 W");
- `score` "mức đủ dữ kiện để chốt".
Mã mình tự ghép 3 đường: **p_cao + qua cổng tất định → trả ngay** (bỏ vòng suy nghĩ); **giữa → chạy
bộ não sâu như hiện tại**; **thấp → NEED_FACTS** với đúng các `noul` chưa chắc (nối vào cơ chế
`nextAction.questions` sẵn có).

**B. Tín hiệu dữ kiện cho câu hỏi thiếu.** Sổ tay có 4.535 điều kiện chữ + 341 điều kiện số — đó là
tập "mệnh đề đúng/sai" đúng kiểu `noul`. Jev fan-out 8–15 câu một lượt, giá gần như không đổi, dùng để
(a) xếp hạng ứng viên, (b) chọn câu hỏi cần hỏi khách, (c) cảnh báo chéo. **Ranh giới bắt buộc giữ:**
Jev KHÔNG đưa trích dẫn → **không bao giờ thay cổng chứng cứ** (luật bất biến: máy chỉ chốt khi có
trích nguyên văn từ hồ sơ); số học/ngưỡng vẫn ở code (Jev không làm số học).

**C. Chỗ KHÔNG dùng Jev:** hiểu tiêu đề Trung (cần sinh chữ — Jev không sinh văn bản), sinh mô tả khai
báo (`describe` cần câu chữ), trích dẫn pháp lý, đọc ảnh (state là text/JSON), mọi thứ tất định đã có.

**D. Không nhét Jev vào Cổng MCP như một bước mạng mới.** Đặt trong `hs-code-api` (thư viện gọi trong
`engine-loop`), sau công tắc env — giữ nguyên hợp đồng MCP và lời dặn trợ lý.

## Thí điểm đề xuất (3 chặng, có cổng nghiệm thu từng chặng)

**P0 — Shadow trên đề vàng (không đụng prod, ~2–3 h máy).** Harness trong container `hs-bench`:
80 mẫu vàng × 2 lượt, mỗi mẫu gọi Jev 1 request (choice 10 ứng viên + 8 noul + 1 score), log đầy đủ
`probabilities`. Báo cáo: accuracy@1 của Jev vs động cơ hiện tại vs đáp án vàng; đường calibration
(chia bucket xác suất — đúng thật bao nhiêu?); độ trễ; chi phí; kiểm Jev đọc được **tiếng Việt + tiêu đề
Trung** (đề vàng có cả hai — điểm chưa có tài liệu, phải đo).
*Cổng qua P1:* ở vùng Jev tự tin cao, accuracy@1 ≥ động cơ hiện tại, **với độ phủ ≥ 40 %** mẫu.

**P1 — Shadow mở rộng trên kho nội bộ (763 tờ Oz + TB-TCHQ + corpus sản phẩm).** Kiểm calibration
trên dữ liệu thật đa dạng trước khi nghĩ tới khách. **Dữ liệu khách CHƯA đi** ở chặng này (luật #237 J1
+ điều khoản no-train của TypeSafe phải soát trước).

**P2 — Gate trong prod (sau review pháp lý).** Công tắc `JEV_TIENG=off|shadow|gate`:
- `shadow`: mọi lượt classify vẫn trả bằng động cơ hiện tại, Jev chạy song song để tích dữ liệu
  calibration thật (chỉ bật sau khi TypeSafe vào danh sách trắng no-train);
- `gate`: p_cao + qua cổng → trả sớm (bỏ vòng sâu); giữa → như cũ; thấp → NEED_FACTS.
Kỳ vọng: p50 từ 105–250 s xuống **< 20 s** cho nhóm dễ (Jev 0,5 s + gather song song), bộ não sâu chỉ
còn chạy cho nhóm khó; ngưỡng chốt sau khi có đường calibration từ P1 (ngưỡng phải hiệu chỉnh theo
từng loại câu — Noul và Choice không dùng chung ngưỡng).

## Việc cần CEO quyết

1. **Gật thí điểm P0** (không tốn tiền mặt đáng kể: ~$0,03 cho cả 80 mẫu × 2 — cần **1 API key TypeSafe**
   đăng ký ở console, hoặc em đi đường OpenRouter bằng khoá sẵn có — anh chọn đường nào).
2. Nếu P0 đạt: em trình số + đề xuất P1/P2 kèm câu hỏi pháp lý (TypeSafe no-train) trước khi đụng dữ liệu khách.

Cảnh báo sẵn (từ docs "snags", để không kỳ vọng sai): Jev đọc **nghĩa đen**, không cộng trừ, `score`
là thứ hạng không phải đo lường, và `state` có thể "tự lập luận" chống lại câu hỏi → câu hỏi phải
nguyên tử, khẳng định; mọi con số/ngưỡng vẫn ở code.
