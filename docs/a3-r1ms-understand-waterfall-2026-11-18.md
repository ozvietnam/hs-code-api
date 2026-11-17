# A3 — khoanh `r1Ms` (understand) trên NEED_FACTS earlyExitHoi (OZV-1373)

Đo 18/11/2026 ~06:08–06:16 VN (Thợ HS 03). **Chỉ docs** — không sửa `lib/**` / `api/**` / `data/**`.

Bối cảnh: docs cha `docs/a3-need-facts-waterfall-2026-11-18.md` (PR #1432) khoanh NEED_FACTS ≥60s → sau khi hết R2, khe còn lại = `r1Ms` + `gatherMs`. GĐ đo 06:01 VN `bo mạch điện tử chưa lắp ráp đầy đủ linh kiện`: NEED_FACTS · **22531 ms** · rounds=1 · **r1Ms=15584** · gatherMs=6910 · llmMs=0 · minimax.

Mục tiêu nhịp này: trong `r1Ms` (~15 s khi `llmMs=0`) phần nào cắt được trước (timeout / maxTokens / gon / thinkingOff / độ dài prompt) — để nhịp sau giao cắt code không đoán.

`loadavg` lúc bắt đầu đo: `1.45 2.66 3.05`. Prod `/api/health`: `status=healthy`, `commit=null`, LLM order `minimax → gemini-free → gemini-paid`, mạch Gemini `THANH_TOAN` đang mở (bỏ qua).

## 1. Cấu hình đọc được (repo + debug prod)

| Nút | Mặc định repo (`lib/engine-loop.js`) | Prod đọc được (`engine.toiUu` / `engine.llm` với `debug=1`) |
| --- | --- | --- |
| `HS_GON_DAU_RA` | trống = **bật** | `toiUu.gonDauRa=true` |
| `R1_MAX_TOKENS` / gon | `R1_MAX_TOKENS_GON=6000` | `toiUu.r1MaxTokens=6000` |
| `LOOP_R1_TIMEOUT_MS` | **100000** ms | `llm.timeoutMs.understand=100000` |
| `HS_UNDERSTAND_FAILFAST_MS` | 15000 chỉ khi MiniMax **ngắt mạch TIMEOUT** bước understand | không áp (mạch Gemini THANH_TOAN, MiniMax khoẻ) |
| `HS_CLASSIFY_FAST_FIRST` / thinkingOff R1 | trống = **tắt** | `engine.fastFirst=null` (không thinking-off đầu lời) |
| Prompt `SYS_R1` / `SYS_R1_GON` | ~1962 / ~2786 ký tự (khối GỌN +823) | user `tenHang` ngắn (~27–55 ký tự) — không phải khe dài prompt |
| Lưới an toàn cut maxTokens → thinking-off | chỉ khi `finish_reason=length` | `ngatSuyNghi={}` trên mọi ca earlyExit đo được |

`r1Ms` = một lời gọi `step:'understand'` qua `callWithFallback` trong `classifyLoop` (đồng hồ bọc ngoài lời gọi).

## 2. Bảng ≥3 ca earlyExitHoi (`llmMs=0`, rounds=1)

UA `OZ-A3-measure/1.0` · `POST /api/classify` (cột `ee` từ `?debug=1`).

| Câu (tenHang công khai) | status | hs | ms | r1Ms | gatherMs | llmMs | rounds | provider | earlyExitHoi | Ghi chú |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| ống thép không gỉ | NEED_FACTS | 730619 | **6521** | **6308** | 156 | **0** | 1 | minimax | **true** (unknowns=5) | debug · toiUu gon+6k |
| hộp nhựa đựng hàng | NEED_FACTS | 392310 | **12156** | **11713** | 163 | **0** | 1 | minimax | **true** (unknowns=5) | debug |
| vải cotton chưa rõ dệt kim hay dệt thoi | NEED_FACTS | 520811 | **25968** | **25703** | 234 | **0** | 1 | minimax | **true** (unknowns=6) | debug · r1Ms đỉnh ~26 s |
| linh kiện máy chưa rõ loại máy | NEED_FACTS | 848690 | 15174 | 8865 | **5784** | **0** | 1 | minimax | (rounds=1·llmMs=0) | plain · gatherMs nhảy |
| ống thép không gỉ (lặp plain) | NEED_FACTS | 730630 | 8406 | 6086 | 1850 | 0 | 1 | minimax | — | cùng câu, r1Ms ~6 s |

Đối chứng cùng phiên — earlyExitHoi **hỏng cổng** → rơi R2 (không phải đường cần khoanh):

| Câu | status | hs | ms | r1Ms | gatherMs | llmMs | earlyExitHoi | lyDo |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bo mạch điện tử chưa lắp ráp đầy đủ linh kiện | NEED_FACTS | 853400 | 44149 | 10705 | 162 | **33232** | **false** | `MA_KHONG_TON_TAI` → gọi GIR |

(GĐ 06:01 cùng câu từng `llmMs=0` · r1Ms≈15,6 s — phụ thuộc R1 có unknowns + cổng gates sạch; nhịp này R1 chọn mã không tồn tại → mất early-exit.)

## 3. Phân tích nút cắt trong `r1Ms`

| Ứng viên | Có đang chạm trên earlyExitHoi? | Kết luận |
| --- | --- | --- |
| Timeout understand (100 s) / fail-fast 15 s | Không — lời gọi xong 6–26 s, không log timeout/thinking-off | **Không cắt được thêm bằng hạ timeout** (hạ timeout chỉ cắt đuôi, không rút median) |
| `maxTokens` 6000 + gon | Đã bật; `ngatSuyNghi` trống = không cụt length | **Đã tối ưu phía đầu ra** — không phải nút còn lại |
| `HS_GON_DAU_RA` | Đã bật prod | **Không còn việc bật gon** |
| Độ dài prompt hệ thống | ~2,8 k ký tự cố định; user rất ngắn | Cắt prompt chỉ tiết kiệm biên nhỏ; **không giải thích ~15 s** |
| `thinkingOff` / `HS_CLASSIFY_FAST_FIRST` | **Tắt** trên mọi ca đo; comment code: thinking-off đo được ~2–10 s thay 15–100 s | **Ứng viên app duy nhất còn lại** — nhưng §2c đã bác tắt thinking cứng vì mất điểm Đ8; cần A/B riêng đường NEED_FACTS nếu muốn mở |
| Latency MiniMax thinking-on | `r1Ms` ≈ ms log `step:understand` (6–26 s cùng cấu hình) | **Phần lớn khe là nhà cung cấp + thinking** |

`gatherMs` đôi khi vài giây (linh kiện 5,8 s) nhưng trên earlyExitHoi sạch thường <0,4 s — không phải khe chính của “~15 s r1Ms”.

## 4. Kết luận (1 câu)

**Không cắt thêm được bằng timeout / maxTokens / gon / rút prompt trên đường earlyExitHoi (`llmMs=0`) — các nút đó đã tối ưu; khe `r1Ms` ~6–26 s (trung vị ~12–15 s) là latency MiniMax `understand` thinking-on; muốn cắt ở app thì phải A/B `thinkingOff` (FAST_FIRST) có kiểm điểm, còn không thì chấp nhận khe nhà cung cấp.**

## 5. Lệnh kiểm lại

```bash
UA='OZ-A3-measure/1.0'
BASE=https://hs-kb.uythacnhapkhau.com
for q in 'ống thép không gỉ' 'hộp nhựa đựng hàng' 'vải cotton chưa rõ dệt kim hay dệt thoi'; do
  curl -sS -m 120 -A "$UA" -X POST "$BASE/api/classify?debug=1" \
    -H 'Content-Type: application/json' \
    -d "$(jq -nc --arg t "$q" '{tenHang:$t, debug:true}')" \
  | jq '{q:$q, status, hs:.results[0].hs, ms, rounds:.engine.rounds, phases:.engine.phases, toiUu:.engine.toiUu, ee:(.engine.log|map(select(has("earlyExitHoi"))))}'
done
```

Tham chiếu code (chỉ đọc): `lib/engine-loop.js` (`callWithFallback`, `phases.r1Ms`, `earlyExitHoiTuR1`, `gonDauRa`, `fastFirstBat`) · docs cha PR #1432.

Đã tra trí nhớ A3 + codegraph `callWithFallback` / `understandFailfastMs` / `earlyExitHoiTuR1`. Không đụng OZV-1372 / OZV-1348 / PR #1431.
