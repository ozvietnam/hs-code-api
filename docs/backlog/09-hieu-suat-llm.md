# 09 — Hiệu suất LLM & truy vấn (nghiên cứu 14/10/2026, CEO yêu cầu)

> Bối cảnh: CEO chuyển bộ não phân loại từ Gemini trả phí về MiniMax (14/10, xem `07-mot-engine.md`).
> Câu hỏi: (1) miniMax plan gọi được gì — ảnh? video? (2) vì sao phân loại vẫn chậm dù data ít,
> cấu trúc đơn giản; có cần thêm mô hình nhanh hỗ trợ? (3) các bước cải tiến hiệu suất truy vấn MCP.
> **Mọi số dưới đây đo thật bằng key đang chạy prod** (probe API trực tiếp + container `hs-bench-llm`
> biệt lập từ image `3aa2f4dd`, không đụng container phục vụ).

## 0. TL;DR

- **MiniMax plan đọc ĐƯỢC ảnh** (model `MiniMax-M3` là multimodal) — chuyện "chỉ Gemini đọc ảnh"
  là do **mã của mình** mới nối Gemini, không phải hạn chế của plan. Quả táo thật: nhận đúng trong **1,4 s**.
- **Tắt "suy nghĩ" của M3**: cùng prompt, 8,6 s → **2,6 s** (và JSON hợp lệ). Đây chính là "mô hình
  ra quyết định nhanh" nằm sẵn trong plan, không cần thêm nhà cung cấp nào.
- **Nút thắt độ trễ KHÔNG phải data** mà là: (a) vòng sửa bị cổng chặn đẩy lên **4 vòng** (đo được
  209–251 s), (b) mỗi vòng một lời gọi LLM output dài (~45–60 s/vòng), (c) `gather()` chạy **tuần tự**
  (chú giải, tiền lệ, made-in-china, bảng quyết định — không song song như chú thích thiết kế), (d) khi
  bật thinking, R1 hay đốt trọn **100 s timeout** rồi mới rơi về thinking-off (đo trên prod: 207 s/món).
- **Plan có quota video**: `video 0/3 kỳ hiện tại, 0/21 tuần` — đúng như CEO nói, dùng được cho demo/marketing.

## 1. MiniMax plan gọi được gì (probe thật, key prod)

| Phép thử | Kết quả | Thời gian |
|---|---|---|
| `GET /v1/token_plan/remains` | HTTP 200 — quota theo kỳ + tuần (`general`, `video`) | — |
| `MiniMax-M3` + ảnh thật (wiki, quả táo) thinking-off | 200 — "Trong ảnh có một quả táo màu đỏ" | **1,4 s** |
| `MiniMax-M3` + **2 ảnh một lượt** | 200 — mô tả đúng | 2,0 s |
| `MiniMax-M3`, prompt ~2.000 token, thinking mặc định | 200 — trả `<think>` 399 reasoning token | 8,6 s |
| `MiniMax-M3` cùng prompt, `thinking:{type:disabled}` | 200 — JSON hợp lệ luôn | **2,6 s** |
| `MiniMax-M3` `reasoning_effort:"low"` | 200 — vẫn tốn reasoning | 8,1 s |
| `MiniMax-M2.7-highspeed` + thinking disabled | 200 nhưng **vẫn trả `<think>`** — M2.7 không tắt được suy nghĩ (khớp ghi chú mã) | 2,4 s+ |
| `MiniMax-M3.1-Flash-Preview` / `-Flash` qua `api.minimax.io/v1` | **400 unknown model** — bản này chỉ mở qua app riêng (MiniMax Code), đừng phụ thuộc | — |
| `MiniMax-VL-01` (model vision chuyên) | **400 unknown model** — vision đi qua chính M3 | — |
| `MiniMax-Text-01` + ảnh | 200 — bản cũ cũng nhận ảnh | 1,6 s |

Hệ quả:
1. **Vision nên chuyển về M3** (đọc ảnh SKU + tờ khai) — bỏ hẳn khoá Gemini trả phí cuối cùng.
2. **"Mô hình nhanh" cho câu hỏi của CEO = chính M3 với thinking tắt** (1,4–2,6 s), dùng làm tầng
   quyết định nhanh, bật suy nghĩ lại khi cổng chặn/nghi ngờ (cascade).
3. Quota `video` 3/kỳ, 21/tuần: đủ cho video demo/marketing; không liên quan luồng phân loại.

## 2. Vì sao phân loại chậm dù data ít (đo thật)

**Kiến trúc hiện tại** (`lib/engine-loop.js`): vòng 1 hiểu hồ sơ → `gather()` kiểm chứng tất định →
vòng 2 quyết định → **cổng chặn**; chặn thì **sửa tối đa 2 vòng nữa** (`MAX_ROUNDS=4`,
`BUDGET_MS=285 s`, R1 timeout 100 s, R2 160 s; `maxTokens` 12.000/20.000).

| Đo | Cấu hình | Kết quả |
|---|---|---|
| Prod, máy khuếch tán tinh dầu | thinking **on** (mặc định hiện tại) | **207 s** — R1 đốt trọn 100 s timeout → tự lùi thinking-off → 3 cổng → 8509.80.90 |
| Bench, thinking **off**, mount `:ro` | 2 vòng | 105 s — 8509.80.90 |
| Bench, thinking **off**, cùng món, mount rw | **4 vòng** (cổng `CAU_TRICH_KHONG_CO` bắn 2 lượt) | **251 s / 209 s** — 8509.80.90 |
| Bench, "dụng cụ hái cau" | thinking off | 127 s — 8201.90.00 (3 lời gọi LLM) |
| Bench, "quạt thông gió" | thinking off | 42 s — 841459 |

Suy ra mô hình thời gian mỗi món ≈ **số vòng × (~45–60 s mỗi lời gọi, output dài) + gather tuần tự**.
Data nhỏ không giúp vì LLM vẫn tự sinh hồ sơ + lệnh + JSON lớn mỗi vòng; **giảm số vòng và độ dài
output là đòn chính**, không phải cắt data.

**`gather()` đang TUẦN TỰ** (đọc mã dòng ~197–262): vòng lặp `await` cho từng truy vấn tiền lệ Oz,
rồi made-in-china (≤ 3 truy vấn × (1 tìm + ≤ 4 trang) × timeout 10 s + nghỉ 600 ms), rồi bảng quyết
định… — chú thích thiết kế ghi "song song" nhưng mã chưa song song. Đây là phần cắt được nhiều giây
nhất mà không đụng chất lượng.

**Bài học bench:** mount `/data` kiểu `:ro` làm cache `mic-cache.json` (30 ngày) không ghi được —
số đo sai lệch giữa hai lượt. Bench phải mount rw (hoặc copy cache sẵn) để giống prod.

## 2b. Số pha đo thật 15/10 (instrumentation #298, MiniMax thinking mặc định = on)

Cùng 3 món, prod (`engine.phases` trong response classify):

| Món | ms tổng | r1Ms (vòng 1) | gatherMs (kiểm chứng) | llmMs (vòng 2+) | rounds |
|---|---:|---:|---:|---:|---:|
| Máy khuếch tán (thinking on) | 255 360 | 73 763 | 320 | 181 249 | 3 |
| Quạt thông gió | 136 766 | 20 036 | 9 093 | 107 564 | 2 |
| Dụng cụ hái cau | 178 525 | 30 775 | 6 952 | 140 764 | 3 |

**Kết luận chẩn đoán:** `gather` (toàn bộ tra chú giải/tiền lệ/mic/bảng) chỉ 0,3–9 s → **KHÔNG phải** nút thắt như phỏng đoán hôm qua; **~85–95% thời gian là lời gọi LLM** (r1 + các vòng 2+), tức `thinking` + độ dài output + số vòng. Bước 2 (song song hoá `gather`) tụt ưu tiên; đòn chính là **tầng nhanh thinking-off** (bước 1) và **cắt vòng sửa oan** (bước 3).

Tín hiệu sớm (3 món, container bench riêng, thinking-off): 255→**47,6 s** (85098090 ✓ — off còn ĐÚNG hơn: on trả 6 số 850980), 136→**38 s** (84145941 ✓), 178→**96,9 s** (82019000 ✓, nhưng 4 vòng vì cổng chặn). p50 136→47 s. **Đang xác thức bằng bench 80 mẫu vàng × 2 lượt on-vs-off** (`/opt/hs-bench4`, runner nền, ~4–5 h) — cổng nghiệm thu: Đ8 không giảm quá 2 điểm so với on.

## 2c. Kết luận chốt 16/10 — ĐÃ ĐO ĐỦ 4 TỔ HỢP THINKING, KHÔNG có "cầu nối env" (bước 1 đóng)

Bổ sung ô còn thiếu của 2b: `UNDERSTAND:off` đơn lẻ (GIR giữ thinking mặc định) + `R1_MAX_TOKENS=6000`,
ảnh `1646d50a` (kèm gather song song #330), 80 mẫu vàng, lượt 1 đủ (`/opt/hs-bench5/bench-uoff-r1.json`;
lượt 2 dừng giữa chừng cho tiết kiệm quota vì lượt 1 đã fail dứt khoát cả hai cổng):

| Chế độ | p50 / p90 (s) | TB (s) | Đ8 top1 | Đ6 | top3-8 | Ghi chú |
|---|---|---:|---:|---:|---:|---|
| **on** (mặc định) r1/r2 | 115/149 · 250/251 | 136/156 | 56,3/53,8 | 66,3/67,5 | 75/68,8 | baseline |
| off (cả 2 vòng) r1/r2 | 54/57 · 106/101 | 62/63 | 38,8/40,0 | 56,3/52,5 | 56,3/61,3 | nhanh 2,3× nhưng Đ8 −16 |
| low (cả 2 vòng) r1/r2 | 203/121 · 300/239 | 200/138 | 47,5/58,8 | 58,8/70,0 | 60/72,5 | nhiễu ±10 điểm, không nhanh |
| **uoff (chỉ vòng 1 off)** r1 | **146 · 253** | **157** | **46,3** | 60,0 | 57,5 | **fail cả 2 cổng** |

**Kết luận:**
1. **Tắt thinking vòng 1 cũng bị bác** (Đ8 46,3 vs on 53,8–56,3 = −7÷−10 điểm, vượt xa cổng ≤2; p50 146 s
   KHÔNG nhanh hơn on — TB 157 s còn chậm hơn 136 s). Cơ chế hợp lý: trích xuất hồ sơ yếu đi → pool ứng viên
   vòng 2 tệ hơn → cổng chặn bắn nhiều hơn → thêm vòng sửa → tổng thời gian không giảm mà chất lượng giảm.
2. **Bước 1 (env-only) ĐÓNG**: không tồn tại tổ hợp env thinking nào vừa giữ chất lượng vừa hạ p50.
   Prod giữ nguyên mặc định (thinking on). Không ai cần đo lại cell này.
3. Đường đã duyệt và ĐÃ LIVE thay cho cầu nối env: **async "trợ lý cầm điện thoại"** (ozplugin #182 —
   biên nhận <2 s, `ket_qua_phan_loai`, `bo_sung_du_kien`, cache 24 h; E2E prod 16/10: biên nhận 0,2–0,8 s,
   engine chạy trọn qua mạng nội bộ Docker — **phát hiện kèm**: `HS_BASE_URL` prod cũ trỏ domain công khai
   nên chính chặng Cổng→backend cũng bị trần Cloudflare 125 s cắt, đã đổi sang `http://hs-code-api:3000`)
   + bước 2 đã merge (#330, gather micLookup song song — an toàn 0 rủi ro chất lượng nhưng lợi nhỏ vì
   gather chỉ 0,3–9 s).
3b. Bằng chứng cơ chế cho `low`: probe API cho thấy `reasoning_effort:"low"` trên M3 gần như không giảm
   suy nghĩ (8,1 s ≈ on 9,0 s trên prompt ngắn) — khớp số bench (nhiễu ±10 điểm, TB không giảm).
4. Đòn trong engine còn lại: **bước 3 (cắt vòng sửa oan)** và **bước 4 (ngắn hoá output)** — llmMs 85–95%.

## 3. Các bước cải tiến (xếp theo tỉ lệ lợi/kỳ công, kèm cách nghiệm thu)

0. **Đo trước khi tối ưu (1 dòng code):** ghi `ms` + `provider` của TỪNG lượt gọi vào `engine.gates`
   (hoặc `log`), rồi chạy bench chuẩn **80 mẫu vàng × 2 lượt** trên container biệt lập với các tổ hợp env.
   Không có bước này thì mọi con số sau chỉ là phỏng đoán.
1. **Env-only, làm được ngay:** `LLM_STEP_UNDERSTAND=MiniMax-M3:off` (chặn hẳn đường đốt 100 s timeout
   rồi mới lùi — đã đo prod đang đi đúng đường đó), cân nhắc `LLM_STEP_GIR=MiniMax-M3:low` để giữ độ
   sâu ở vòng quyết định. Kỳ vọng: món trung bình **207 s → 60–90 s** (đúng 2 vòng, không timeout).
2. **Song song hoá `gather()`** (`Promise.all` cho: chú giải các nhóm, tìm tiền lệ Oz theo từng tên,
   made-in-china, bảng quyết định, cặp mã dễ nhầm). Kỳ vọng −20…60 s/vòng với món có nhiều nhóm/truy vấn.
   Việc này cần test (thứ tự/log không đổi, kết quả giống khi chạy tuần tự).
3. **Cắt vòng sửa oan:** cổng `CAU_TRICH_KHONG_CO` ("mọi câu trích đều không có trong hồ sơ gốc") bắn
   liên tục và đẩy vòng 2 → 3 → 4 (đo được). Hai hướng: (a) siết câu lệnh prompt "chỉ trích NGUYÊN VĂN
   từ hồ sơ gốc, không diễn giải"; (b) rà lại `verifyQuote` (NFC một lần rồi — đo lại tỉ lệ bắn giả trên
   80 mẫu). Cân nhắc trần sửa **1 vòng** mặc định; vòng sửa thứ hai chỉ khi ERP bật "kỹ".
4. **Giảm độ dài output:** `maxTokens` R1 12.000 → 4–6k (đo tỉ lệ cắt JSON), yêu cầu JSON gọn
   (không lặp lại nguyên văn dài trong output; trích ngắn). Mỗi 2.000 token output ≈ 20 s ở ~100 tps.
5. **Cache kết quả classify** theo hash thuộc tính (tenHang/chất liệu/công dụng/thông số chuẩn hoá),
   TTL ngắn (ngày) — ERP gửi lặp SKU; người dùng MCP hỏi lặp món. Tận dụng prompt-caching đã thấy
   (`cached_tokens` trong usage): giữ khối hệ thống tĩnh đứng đầu prompt.
6. **Chuyển vision sang M3** (bỏ khoá Gemini trả phí hoàn toàn): `lib/image-facts.js` thêm
   `minimaxGenerateWithImages` (chat/completions, `image_url` data-URL) làm mặc định; `declaration-sheet.js`
   đổi điều kiện bật vision từ `GEMINI_API_KEY` sang `MINIMAX_API_KEY`; test ảnh thật + giữ HS_SHEET_VISION=0/1.
7. **Phía Cổng MCP:** hạn Cổng cho classify là 305 s (đủ), nhưng client ngoài (claude.ai) thường cắt
   sớm hơn (~60 s) → mục tiêu trả **p50 < 60 s** để không bị cắt; cân nhắc progress notification nếu
   sau này vẫn muốn chạy dài. Các tool tra cứu tất định (tra_thue, tim_ma_hs) không LLM — đo lại để
   chắc < 1 s.
8. **Video (quota 3/kỳ, 21/tuần):** để dành demo/marketing; không đưa vào luồng phân loại.

## 4. KPI & nghiệm thu

- **Độ trễ:** classify p50 < 60 s, p90 < 120 s (đo 80 mẫu, 2 lượt, cùng lô như #193).
- **Chất lượng:** Đ8 không giảm quá 2 điểm so với baseline (60,1 % gates ở phép đo 13/10); sai-không-cờ < 10 %.
- **Chi phí:** 0 lượt Gemini trả phí trong 7 ngày (sau khi xong bước 6).
- Mỗi bước phải chạy trên container biệt lập trước, đạt mới đổi env/merge — giữ đúng luật #193.

## 5. Việc đề xuất làm ngay (chờ CEO gật)

> **Cập nhật 14/10/2026:** phản hồi khách thật (#166, ozplugin) xác nhận hậu quả — `phan_loai_hs` bị
> Cloudflare cắt 524 ở 100 s, 3/3 lượt lỗi không kèm `maLuot`. Độ trễ không còn là chuyện chi phí:
> khách thật không dùng được. Thứ tự ưu tiên mục 5 giữ nguyên, nhưng bước 1-2 lên trước.

1. Bench chuẩn hóa bước 0+1 (thêm ms vào gates + 80 mẫu × 2 tổ hợp env) — tốn ~1 buổi máy, không tốn tiền mặt (plan bao).
2. Song song hoá `gather()` (PR nhỏ, có test).
3. Chuyển vision sang M3 (PR nhỏ, có test) — cắt nốt khoá Gemini trả phí.

## 6. Trạng thái 26/10/2026 — bước 3 + 4 bật MẶC ĐỊNH (CEO: "bật đi xem hiệu quả thế nào")

Nhánh `perf/gon-dau-ra-cat-vong-sua` (`lib/engine-loop.js`, mục TỐI ƯU). Không đổi mẫu (MiniMax), không đụng thinking (§2c).
- **`HS_GON_DAU_RA`** (trống = bật): khối "GỌN ĐẦU RA" nối sau prompt R1/R2 — trần số mục/ký tự đúng bằng phần code ĐỌC
  (bảng `TRAN`, mỗi số dẫn tới dòng `slice`/`clip` tương ứng; test khoá hai bên khớp nhau), JSON một dòng, không chép lại hồ
  sơ, giữ nguyên yêu cầu nguồn/trích. `maxTokens` R1 12.000 → **6.000**, R2 20.000 → **10.000** (tính cả `<think>` — chỉ chặn
  đuôi; lý do từng số ở chú thích `R1_MAX_TOKENS_GON`); `R1_MAX_TOKENS`/`GIR_MAX_TOKENS` vẫn ghi đè. JSON cụt / mảnh vụn vớt từ
  `<think>` (thiếu `product`/`hypotheses`, hoặc thiếu `decision`) → lưới "tắt suy nghĩ" sẵn có, không chạy trên mảnh vụn.
- **`HS_MAX_VONG_SUA`** (trống = **1**): tối đa 1 vòng sửa THEO LÝ DO BỊ CHẶN (lượt giải trình sổ tay — tối đa 1 — không tính);
  chạm trần → đáp án cuối + cờ như cũ (NEEDS_EXPERT/GATE_BLOCKED). Cùng công tắc: **NHOM_CHUA_KIEM tất định** — máy gom chú
  giải nhóm rồi chạy lại MỌI chốt chặn trên cùng đáp án; nhận không cần vòng AI chỉ khi nhóm có sổ tay + mã 8 số khớp tờ khai
  Oz (≥ 75%) hoặc bảng quyết định đã duyệt + không cảnh báo phân nhóm (ghi `engine.gates[].tatDinh` + `antiPatternWarnings`);
  sổ tay nghi → gộp vào lượt giải trình (một vòng thay hai); còn lại → vòng AI như cũ.
- **Tắt khẩn:** `HS_GON_DAU_RA=off HS_MAX_VONG_SUA=off` → prompt + luồng trùng từng byte bản bbc85f6
  (`scripts/test-engine-loop-gon.mjs` so với golden master `tests/fixtures/engine-loop-goc/`). `HS_MAX_VONG_SUA=0` là trần
  0 vòng sửa, KHÔNG phải công tắc tắt.
- **Đo (chưa đo bằng AI thật):** `scripts/bench-classify-llm.mjs` nay ghi token vào/ra từng bước (withUsage), số lượt chạm trần
  maxTokens, lượt lùi, cổng chặn từng vòng, bước tất định, `engine.toiUu` (chống đo nhầm nhánh) và p50/p90 ĐỘ TRỄ TỪNG MÓN.
  Hai nhánh A (`off`/`off`) và B (mặc định) × 40 mẫu vàng, cùng container; cổng nghiệm thu như §4.

Nguồn tham khảo: tài liệu nền tảng MiniMax — platform.minimax.io (API Models, subscribe/coding-plan);
số đo trong tài liệu này là probe trực tiếp bằng key prod ngày 14/10/2026.
