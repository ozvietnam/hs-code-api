# A3 — Quét câu >15s sau LED chotSom: đủ căn cứ thêm term hay không (2026-11-18, OZV-1348)

Bối cảnh: sau #1434, 4 câu top 24h đã <0,15s qua `earlyExitCoc`/chotSom (xem
`docs/a3-do-lai-sau-1431-2026-11-18.md`). Việc còn lại ([OZV-1348](https://github.com/ozvietnam/hs-code-api/issues/1348)):
quét **các câu còn wall >15s** trong nhật ký khách / bộ 50 ca, mỗi câu quyết định —
thêm term chotSom có căn cứ, hay ghi «không đủ căn cứ».

Nguồn câu quét: bảng đo 18/11 sáng trong `docs/a3-need-facts-waterfall-2026-11-18.md`
(7 câu wall >15s). Đo lại live 18/11 chiều bằng UA `OZ-A3-measure/1.0` trên
`https://hs-kb.uythacnhapkhau.com` (lệnh ở cuối file).

## Kết luận chính

**0/7 câu đủ căn cứ để thêm term chotSom 8 số.** Cả 7 câu đều là NEED_FACTS
*thật* — thông tin còn thiếu chính là thông tin quyết định phân nhóm/ lá trong
biểu thuế 2026 (mức lắp ráp, công suất, máy đích, thành phần, xe đích, kiểu
nối/khối lượng van, kiểu hàn/tiết diện ống). Theo luật "trích sai mã tệ hơn
không trích" (CLAUDE.md rule 6), chotSom 8 số cho các câu này sẽ là chốt *sai có
hệ thống* — nhanh hơn nhưng sai. PR này **không sửa `data/trade-synonyms.json`**.

Bằng chứng cộng thêm: **4/7 câu nhảy mã 8 số giữa hai lần đo** (sáng 18/11 →
chiều 18/11, cùng endpoint, không đổi dữ liệu) — chotSom vào đích không ổn định
là khoá nhầm mã vào nhiễu.

## Bảng đo live (khuôn 1: trước/sau; UA `OZ-A3-measure/1.0`)

| # | Câu | Sáng 18/11 (doc #1435) | Chiều 18/11 (nhịp này): wall | engine | r1Ms | rounds | status |
|---|-----|------------------------|------------------------------:|-------:|-----:|-------:|---------|
| 1 | bo mạch điện tử chưa lắp ráp đầy đủ linh kiện | 62,2s → 853400 | 17,8s → **853400** | 17,5s | 11,5s | 1 | NEED_FACTS |
| 2 | động cơ điện 3 pha công suất chưa rõ | 49,1s → 850152 | 18,1s → **850161** | 17,9s | 11,0s | 1 | NEED_FACTS |
| 3 | phụ tùng máy chưa rõ dùng cho máy nào | 38,9s → 848790 | 27,8s → **847990** | 27,7s | 21,8s | 1 | NEED_FACTS |
| 4 | keo dán gỗ công nghiệp | 32,6s → 35019020 | 23,2s → **35061000** | 23,0s | 22,7s | 1 | NEED_FACTS |
| 5 | tấm ốp xe ô tô | 24,4s → 870829 | 18,5s → **870829** | 18,3s | 18,0s | 1 | NEED_FACTS |
| 6 | van bi inox 304 DN25 PN16 | 20,3s → 848180 | 40,2s → **848180** | 40,1s | 33,2s | 1 | NEED_FACTS |
| 7 | ống thép không gỉ | 17,9s → 730630 | 21,0s → **730611** | 20,8s | 20,6s | 1 | NEED_FACTS |
| 8 | bóng đèn led tròn đuôi e27 9w 220v (đối chứng) | <0,15s (#1434) | **0,32s** (engine 0,16s) → 85395210 | — | 0 | 0 | REVIEW |
| 9 | máy bơm nước ly tâm dùng trong gia đình (đối chứng) | <0,15s (#1434) | **0,23s** (engine 0,02s) → 84137042 | — | 0 | 0 | REVIEW |

Ghi chú cột "sau": PR này không đổi dữ liệu ⇒ đo "sau" cùng câu sẽ lặp đúng kết
quả trên (không chạy lại để không đốt thêm lượt LLM vô nghĩa). Cột in đậm
trong 7 câu chậm là kết quả live lần đo nhịp này — **cả 7 câu vẫn >15s, tất cả
NEED_FACTS, `llmMs=0`, thời gian nằm gần hết trong r1Ms** (vòng thu thập/luật
R1 quyết định *hỏi lại*). Hai câu đối chứng chotSom (#1434) vẫn <0,5s wall —
cơ chế còn nguyên.

## Phân tích từng câu — «không đủ căn cứ vì…» (khuôn 2)

### 1. «Bo mạch điện tử chưa lắp ráp đầy đủ linh kiện» (853400, ổn định)

- Ranh giới 85.42 (mảng, mô-đun, điểm rời / lắp ráp không hoàn chỉnh) ↔ 85.34
  (bo mạch in đã gắn linh kiện) **chính là mức độ lắp ráp** — GIR 2(b) khi mảng
  + linh kiện rời, GIR 1 khi đã là bo mạch. Câu nói "chưa lắp đầy đủ" nhưng
  không nói *thiếu gì, có hàn không* → hai heading đều có thể.
- Lá trong 85.42 còn chia theo mức gắn linh kiện (854230 mảng/mô-đun có lắp
  thêm linh kiện thụ động và linh kiện hoạt động khác; 854290 loại khác).
- Nhánh 85.42 đang được xử riêng ở #1431/#1432 (cấm đụng theo thẻ) — chồng
  term ở đây còn phá việc đo trước/sau của PR đó.
- **Kết luận: không đủ căn cứ.** Câu này ở lớp "cần hỏi khách", không phải lớp
  "từ điển thương mại chốt được".

### 2. «Động cơ điện 3 pha công suất chưa rõ» (850152 sáng → 850161 chiều)

- Phân nhóm 85.01 chia **theo công suất** (≤750 W; >750 W÷7,5 kW; >7,5÷75 kW
  từng mốc; …). Công suất quyết định mã; "chưa rõ" là thiếu đúng trường phân
  nhóm — hai lần đo ra hai lá khác nhau (850152 / 850161) chứng tỏ engine tự
  suy đoán, không có đích chốt.
- **Kết luận: không đủ căn cứ** — NEED_FACTS đúng nghĩa; đường đúng là hỏi lại
  khách, không phải chotSom.

### 3. «Phụ tùng máy chưa rõ dùng cho máy nào» (848790 sáng → 847990 chiều)

- Note 3 Phần XVI / GIR 1: phụ tùng nhận diện theo **máy đích**; 84.87 chỉ là
  nhóm "cơ khí khác" khi *không* nhận diện được máy đích, 84.79 phụ tùng máy
  công tác khác. Hai lần đo rơi hai nhóm (848790 / 847990) — máy đích quyết
  định. Lá còn chia vật liệu (848710 gang / 848790 khác) — cũng chưa rõ.
- ChotSom 848790 khi khách *THẬT SỰ trả lời* "không xác định được máy" là hợp
  lệ — nhưng câu nhật ký đang là câu *chưa hỏi xong*. Thêm term bây giờ = chốt
  848790 cho cả "phụ tùng máy công trình", "phụ tùng máy dệt"… (sai nhóm con).
- **Kết luận: không đủ căn cứ** cho câu dạng này.

### 4. «Keo dán gỗ công nghiệp» (35019020 sáng → 35061000 chiều)

- 35.01 là keo **casein** (sản phẩm từ casein); keo dán gỗ trên thị trường VN
  phần lớn PVA/urea/epoxy → nhóm 35.06 (3506.10 đóng gói ≤1 kg bán lẻ /
  3506.91 loại khác) thậm chí 32.14. Thành phần quyết định heading — câu chỉ
  nêu công dụng. Hai lần đo ra đúng hai heading đó (3501 ↔ 3506): engine
  *suy đoán*, đích không ổn định.
- Chốt chotSom 35019020 từ term "keo dán gỗ" sẽ đóng cứng suy đoán thành mã
  chắc 85 điểm cho đa số keo gỗ (35.06) — sai có hệ thống.
- **Kết luận: không đủ căn cứ.** Tiền lệ TB-TCHQ cho keo đều gắn thành phần
  cụ thể, không có tiền lệ "keo dán gỗ = casein".

### 5. «Tấm ốp xe ô tô» (870829, ổn định ở 6 số)

- Lá 8708.29 chia **theo xe đích** (87.01/87.03/87.04: 87082911/21/31…) và
  theo chức năng (phụ kiện trang trí nội thất SEN / chắn bùn / thanh chống
  nắp ca-pô / loại khác). Câu không nêu dòng xe → không chọn lá; Note 3 Phần
  XVII nhận diện phụ tùng theo xe.
- **Kết luận: không đủ căn cứ** — thiếu đúng trường phân nhóm (xe đích);
  chotSom cơ chế hiện tại chỉ nhận mã 8 số có trong taxData.

### 6. «Van bi inox 304 DN25 PN16» (848180, dừng 6 số)

- Tiền lệ TB-TCHQ **43552** (van bi đồng thau, đóng mở bằng tay) kết luận
  8481.80.63 — nhưng theo cây CŨ (nhánh "van đường ống nước → loại khác").
  Cây 2026 (`data/bieu-thue/2026.04.05/ten-nut.json`) tách nhánh khác:
  8481.80.6 "van nối có núm" (Nipple joint), 8481.80.9 "loại khác" (gồm
  84818097 "điều khiển bằng tay, khối lượng dưới 3 kg, thép không gỉ…").
  Tiền lệ cũ không ánh xạ thẳng sang lá 2026; DN25/tay quay không nói khối
  lượng <3 kg hay kiểu nối núm. Prod cũng chỉ dừng 848180 (6 số).
- ChotSom 8481806x cho "van bi inox" sẽ sai cho van bi gang bọc inox, van bi
  hàn, van bi điều khiển điện…
- **Kết luận: không đủ căn cứ cho 8 số.** Ở mức heading 84.81 thì đúng — ứng
  viên tốt khi chotSom mở rộng nhận mã 6 số.

### 7. «Ống thép không gỉ» (730630 sáng → 730611 chiều)

- 73.06 chia theo: line pipe dầu khí (7306.11/19/21/29) vs ống hàn khác tiết
  diện tròn (7306.30.11→.99 theo thành phần/đường kính) vs loại khác bằng
  thép không gỉ (7306.40.20 OD>105 mm / .90). Hai lần đo rơi hai nhánh
  (7306.30 ↔ 7306.11) — câu chỉ nêu vật liệu, thiếu kiểu hàn/seamless, tiết
  diện, đường kính, công dụng.
- **Kết luận: không đủ căn cứ** — ống không gỉ đúc xuyên còn thuộc 73.04, hoàn
  toàn ngoài 73.06.

## Hai câu đối chứng — chotSom từ #1434 còn nguyên (khuôn 3)

«bóng đèn led tròn đuôi e27 9w 220v» 0,32s wall (engine 0,16s, rounds 0,
REVIEW 85395210) và «máy bơm nước ly tâm dùng trong gia đình» 0,23s wall
(engine 0,02s, rounds 0, REVIEW 84137042): cùng đợt đo, vẫn dưới ngưỡng —
cơ chế chotSom không hề hỏng, các câu >15s còn lại chậm vì *đúng* là thiếu
dữ kiện phân nhóm.

## Lệnh đo (đã chạy, số trong bảng trên là kết quả thật)

```bash
curl -sS -m 150 -A 'OZ-A3-measure/1.0' -X POST 'https://hs-kb.uythacnhapkhau.com/api/classify' \
  -H 'Content-Type: application/json' -d '{"tenHang":"<câu>"}' \
  | jq '{status, hs:.results[0].hs, ms, engineMs:.engine.ms, phases:.engine.phases, rounds:.engine.rounds, providers:.engine.providers}'
```

## Đề xuất nhịp sau (ngoài phạm vi thẻ này)

1. Câu 6 (van bi) và câu 3 (phụ tùng không rõ máy) là hai ứng viên đầu tiên
   khi cơ chế chotSom cho phép **chốt 6 số** / confidence thấp hơn — khi đó
   tiền lệ 43552 (84.81) có căn cứ ở mức heading.
2. Wall >15s của 7 câu nằm gần hết trong `r1Ms` (llmMs=0) — muốn giảm trễ
   trung vị mà không chốt sai thì đường đúng là rút vòng R1 hỏi lại
   (thuộc `lib/`, ngoài phạm vi cho phép của thẻ này).
