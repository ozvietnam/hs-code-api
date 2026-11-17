# A3 waterfall — phase NEED_FACTS ≥60s (OZV-1369)

Đo 18/11/2026 ~05:45–06:10 VN (Thợ HS 01). **Không** đụng `lib/ho-so/**`. Mục tiêu: khoanh phase nào làm ca NEED_FACTS kiểu top 24h (trung vị khách 81s) chạy ≥60s — để nhịp sau cắt đúng chỗ.

Bối cảnh thực địa GĐ: 3 lượt gần nhất có 2 NEED_FACTS · dừng 6 số (81s / 118s). Docs cửa sổ cốc (khác đường): `docs/a3-waterfall-coc-ngoai-engine.md`.

`loadavg` lúc bắt đầu đo: `1.84 3.14 2.66` (máy agent). Prod `/api/health`: `status=healthy`, `commit=null` (SHA chưa biết — CẦN QT).

## 1. Tái hiện ≥60s (NEED_FACTS · dừng 6 số)

| Câu (tenHang công khai) | status | hs | ms | engineMs | classifyMs | ganHoSoMs | afterEngineMs | r1Ms | gatherMs | llmMs | b1bMs | rounds | providers |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| bo mạch điện tử chưa lắp ráp đầy đủ linh kiện | NEED_FACTS | 853400 | **62175** | 62174 | 62175 | **0** | **1** | 17454 | 6086 | **38419** | 1 | 2 | minimax×2 |

→ Đủ tiêu chí thẻ: NEED_FACTS · 6 số · ms≥60. Gần ngưỡng: `động cơ điện 3 pha công suất chưa rõ` → NEED_FACTS 850152 · **49079** ms (`r1Ms` 16087 + `llmMs` 26211).

## 2. Bảng đối chiếu NEED_FACTS (chỉ số đo được)

| Câu ngắn | status | hs | ms | r1Ms | gatherMs | llmMs | b1bMs | ganHoSoMs | afterEngineMs | Ghi chú |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| bo mạch… linh kiện | NEED_FACTS | 853400 | 62175 | 17454 | 6086 | **38419** | 1 | 0 | 1 | **≥60s** · 2 vòng AI |
| động cơ điện 3 pha công suất chưa rõ | NEED_FACTS | 850152 | 49079 | 16087 | 6574 | **26211** | 0 | 0 | 2 | gần 60s · có R2 |
| phụ tùng máy chưa rõ dùng cho máy nào | NEED_FACTS | 848790 | 38866 | **31274** | 7560 | 0 | 1 | 0 | 1 | earlyExitHoi · gemini-free |
| keo dán gỗ công nghiệp | NEED_FACTS | 35019020 | 32584 | 14621 | 211 | **17722** | 1 | 0 | 2 | có R2 · ra 8 số |
| tấm ốp xe ô tô | NEED_FACTS | 870829 | 24429 | **23977** | 234 | 0 | 1 | 0 | 1 | earlyExitHoi · top cũ |
| van bi inox 304… DN25 PN16 | NEED_FACTS | 848180 | 20277 | 13199 | 6522 | 0 | 1 | 0 | 1 | earlyExitHoi |
| ống thép không gỉ | NEED_FACTS | 730630 | 17934 | **17116** | 580 | 0 | 1 | 0 | 9 | earlyExitHoi |
| hộp nhựa đựng hàng | NEED_FACTS | 392310 | 8469 | 7947 | 218 | 0 | 0 | 0 | 1 | earlyExitHoi |

Đối chứng earlyExit CHOT (không NEED_FACTS) cùng phiên:

| Câu | status | hs | ms | ganHoSoMs | afterEngineMs |
| --- | --- | ---: | ---: | ---: | ---: |
| máy bơm nước ly tâm dùng trong gia đình | REVIEW | 84137042 | 65 | 0 | 1 |
| bóng đèn led tròn đuôi e27 9w 220v | REVIEW | 85395210 | 723 | 2 | 201 |
| cốc giữ nhiệt chân không (bình chân không hoàn chỉnh) | REVIEW | 96170010 | 11544 | **11493** | 11495 |

→ Khe `ganHoSoMs` lớn vẫn chỉ đường cốc earlyExit (đã khoanh OZV-1367/#1431) — **không** giải thích trung vị NEED_FACTS 81s.

## 3. Kết luận (1 câu)

Ứng viên cắt tiếp trên đường NEED_FACTS ≥60s là **`llmMs` (vòng AI ≥2 / R2 trong `classifyLoop`)** — ca 62s: 38,4/62 s; cộng **`r1Ms`** (~17 s); **`ganHoSoMs`/`afterEngineMs`/`b1bMs` ≈ 0–1 ms** trên mọi ca NEED_FACTS đo được nhịp này (không cắt hồ sơ cho A3 này).

## 4. Lệnh kiểm lại

```bash
UA='OZ-A3-measure/1.0'
BASE=https://hs-kb.uythacnhapkhau.com
curl -sS -m 120 -A "$UA" -X POST "$BASE/api/classify" \
  -H 'Content-Type: application/json' \
  -d '{"tenHang":"bo mạch điện tử chưa lắp ráp đầy đủ linh kiện"}' \
  | jq '{status, hs:.results[0].hs, ms, engineMs:.engine.ms, phases, enginePhases:.engine.phases, rounds:.engine.rounds, providers:.engine.providers}'
```

Tham chiếu: `api/classify.js` (`kemPhasesNgoaiEngine`) · `lib/engine-loop.js` (`phases.r1Ms` / `gatherMs` / `llmMs` / `b1bMs`) · docs cốc `a3-waterfall-coc-ngoai-engine.md`.
