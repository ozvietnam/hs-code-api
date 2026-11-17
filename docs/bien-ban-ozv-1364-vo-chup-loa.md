# OZV-1364 — Vỏ chụp loa (nón loa): đủ local + live classify, không sửa synonym

Đo 17/11/2026 ~20:23 UTC (nhịp Thợ HS 03). SHA nền: `origin/main` @ `f873addb`.

## Kết luận

Mục `vo-chup-loa-non-loa` trong `data/trade-synonyms.json` **đã đủ** — đuôi «model…» không phá khớp phrase. **Không thêm term, không mở PR sửa synonym** (tránh đụng [#1425](https://github.com/ozvietnam/hs-code-api/pull/1425) cùng tệp). Live `/api/classify` đã `earlyExitTradeChotSom` → **85189090** · REVIEW.

## 1. Local — `classifyLoop` (stub LLM, timeout 8s)

```bash
# đo tay 5 biến thể (kèm đuôi model)
node --input-type=module -e '…'   # log /tmp/ozv1364-measure.out
node scripts/test-engine-loop-chot-som-trade.mjs
# → 21 passed, 0 failed, EXIT=0
```

| Câu | match | status | top | earlyExit | ms |
| --- | --- | --- | --- | --- | ---: |
| vỏ chụp loa bằng nhựa tổng hợp (nón loa) | có | REVIEW | 85189090 | có | 1218 (lần đầu) |
| … (nón loa), model | có | REVIEW | 85189090 | có | 29 |
| … (nón loa), model ABC-123 | có | REVIEW | 85189090 | có | 7 |
| … (nón loa), model… | có | REVIEW | 85189090 | có | 9 |
| … (nón loa) model XYZ | có | REVIEW | 85189090 | có | 6 |

`llmCalls=0` mọi ca; entryId `vo-chup-loa-non-loa`.

## 2. Live prod (hs-kb)

| Endpoint | Câu | status | hs | earlyExit | ms |
| --- | --- | --- | --- | --- | ---: |
| `POST /api/classify` | …(nón loa), model ABC-123 | REVIEW | **85189090** | `earlyExitTradeChotSom` · entry `vo-chup-loa-non-loa` | **382** |
| `POST /api/suggest` | cùng câu | REVIEW | top1 **85189090** (`optionsHs`) | không (đi LLM MiniMax ~18s) | 18365 |

`/api/health`: `healthy`; `banDungLyDo.commit=khong-co-bien` (Coolify chưa gắn SHA — không suy ra lệch bản từ health).

## 3. Việc không làm

- Không sửa `data/trade-synonyms.json` (mục loa đã có; [#1425](https://github.com/ozvietnam/hs-code-api/pull/1425) còn mở trên entry đèn LED khác).
- Không đụng LED / FT-S13 / E27 / cốc / bơm / engine.
- Không gộp PR.

## 4. Chưa chắc / CẦN

- Thực địa 03:00 VN «dừng 6 số» có thể là lượt trước khi #1410 lên, hoặc đường `/api/suggest` (không earlyExit). Hiện classify đã 8 số.
- CẦN GĐ: nếu muốn suggest cũng earlyExit như classify → thẻ riêng (ngoài phạm vi A2 synonym này).
