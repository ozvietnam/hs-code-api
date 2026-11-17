# OZV-1360 — Phases ngoài engine sau earlyExit cốc

Đo 17/11/2026 (nhịp Thợ HS 01). Không sửa đường chạy prod; script đo: `scripts/do-ozv-1360-phases-ngoai-engine.mjs`.

## 1. Bảng phases (local, stub LLM, env giống prod: `HS_SO_TAY=full` `HS_GON_DAU_RA=on`)

Lệnh:

```bash
HS_SO_TAY=full HS_GON_DAU_RA=on HS_MAX_VONG_SUA=1 node scripts/do-ozv-1360-phases-ngoai-engine.mjs
```

| Bước | ms (lượt ấm) | Trong `engine.ms`? |
| --- | ---: | --- |
| searchPrecedents (trong gather) | ~78 | có |
| searchOzByKeyword | ~10 | có |
| buildTaxLookup | ~4 | có |
| countIndependentSources ×2 | ~3 | có |
| buildDeclarationOptions | ~2 | có |
| soTayRuntime.advise | **0** (không gọi — `HS_SO_TAY=full` đã gắn khối soTay gates) | sau snapshot nếu gọi |
| canCuPhapLy | ~0,3 | sau snapshot |
| b1bApDung | 0 (status ≠ NEED_FACTS) | sau snapshot |
| ganHoSoClassify | ~0,5 (`hoSoApDung(96170010)=false`) | ngoài classifyLoop |
| **classifyLoop wall − engine.ms** | **~1–2** | — |

Cộng các pha đã bọc ≈ gather/engine; **khe ngoài engine local ≈ 0**.

## 2. Live (UA `OZ-A3-measure/1.0`) — cùng đường earlyExit CHOT

| Câu | earlyExit | hs | ms | engineMs | gatherMs | b1bMs | khe |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| máy bơm nước ly tâm… | TradeChotSom | 84137042 | 145 | 144 | 128 | 0 | **1** |
| cốc giữ nhiệt… (bình…) | TradeChotSom | 96170010 | 10479–25320 | 112–2016 | 103–1836 | 0 | **8k–23k** |
| bình giữ nhiệt chân không | TradeChotSom | 96170010 | 5730 | 127 | — | 0 | **5603** |
| cốc giữ nhiệt inox 500ml | không (leo AI) | 961700 | 26299 | 26298 | — | 0 | **1** |

Khe lớn **chỉ** khi earlyExit CHOT ra **96170010**; bơm cùng đường CHOT khe≈0; local cốc khe≈0.

## 3. Thủ phạm (≥70% phần ngoài engine)

| Ứng viên (giả thuyết thẻ) | Kết luận | Bằng chứng |
| --- | --- | --- |
| `soTayRuntime.advise` | **Bác** | Prod `soTay.mode=full` → advise bị bỏ (`if (!loopOut.soTay)`); local advise đơn lẻ ~1,6 ms |
| WCO enrich / `wcoOp.byHs` | **Bác** (ngoài engine) | Gọi trong gather + nâng tự tin **trước** `engine.ms`; local ~1 ms |
| `ganHoSoClassify` / lớp bọc API | **Bác** | `hoSoApDung(96170010)=false`; local ~0,5 ms; bơm cùng API khe=0 |
| `b1bApDung` | **Bác** | `b1bMs=0`, status REVIEW |

**Trong engine (main, trước #1421):** `searchPrecedents` / gather nặng — đúng chỗ #1421 (`gatherChoChotSom`) cắt.

**Khe prod `ms−engineMs` 5–23 s:** chưa gắn được 1–2 hàm trong soTay/WCO/api; tái hiện ổn định trên earlyExit 96170010, không tái hiện local. Cần `phases` sau `classifyLoop` ở `api/classify.js` (đề xuất dưới) + waterfall OZV-1361.

## 4. Đề xuất cắt (không làm ở thẻ này nếu đụng #1421)

1. **Chờ gộp #1421** — cắt gather/taxLookup/countIndependentSources trên chotSom (đã có PR).
2. **PR nhỏ sau #1421** (không đụng `engine-loop` nếu xung đột): trong `api/classify.js` ghi `phases.classifyMs` / `phases.ganHoSoMs` / `phases.afterEngineMs = ms - engine.ms` để lần sau khoanh khe prod.
3. **Không** tối ưu `soTayRuntime.advise` cho việc này (không nằm trên đường `HS_SO_TAY=full`).

## Lệnh tái hiện

```bash
# Local phases
HS_SO_TAY=full HS_GON_DAU_RA=on HS_MAX_VONG_SUA=1 node scripts/do-ozv-1360-phases-ngoai-engine.mjs

# Live cốc vs bơm
curl -sS -A 'OZ-A3-measure/1.0' -X POST https://hs-kb.uythacnhapkhau.com/api/classify \
  -H 'Content-Type: application/json' \
  -d '{"tenHang":"cốc giữ nhiệt chân không (bình chân không)"}' \
  | jq '{hs:.results[0].hs,ms,engineMs:.engine.ms,gatherMs:.engine.phases.gatherMs,b1bMs:.engine.phases.b1bMs,khe:(.ms-.engine.ms)}'
```
