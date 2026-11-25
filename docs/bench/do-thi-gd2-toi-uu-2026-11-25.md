# Báo cáo tối ưu độ chậm Giai đoạn 2 (Việc D1 — 2026-11-25)

> **Lưu ý kiểm chứng (Rule L1 / Mac dev):** Toàn bộ số đo dưới đây chạy ngoại tuyến (`0 LLM`, `0 mạng`, `Zero-PII`) trên máy Mac dev — chỉ dùng làm **tự kiểm** tầng tìm (`timTruoc` / tìm ứng viên), không đụng prompt, số lượt LLM hay chuỗi mô hình, và cờ `HS_TIEN_XU_LY` / `HS_TIM_CGCT` giữ nguyên mặc định `OFF` trong `data/luat/bang-co.json`.

## 1. Phân rã điểm nóng trước tối ưu (300 ca S-7 `sach`)

Đo bằng `scripts/do-do-thi-gd2.mjs` + profiler phân rã từng thành phần trong `timTruoc`:

- Trước tối ưu (trên Mac dev, nền `origin/main` `d561ae11`):
  - `OFF`: trung vị **132,5 ms** · p95 **232,1 ms**
  - `ON` (`HS_TIEN_XU_LY=on`, model nghĩa 20.718 mục S-7): trung vị **166,6 ms** · p95 **291,2 ms** · delta `+34,1 ms` (bản 24/11 trên báo cáo trước là `+104,9 ms`)
- Tỉ trọng thời gian trước tối ưu (theo lượt gọi trên 300 ca S-7 `sach`):
  - `searchCandidates` (`lib/search-utils.js`): **102,76 ms** trung vị / **35,49 s** tổng (quét 11.871 dòng × NFD `removeDiacritics` + `new RegExp` + tiền xử lý regex `query-parse`, `glossary`, `material-taxonomy`, `search-query-expand`, `hs-aliases` trên mọi truy vấn)
  - `searchPrecedents` (`lib/precedent-search.js`): **47,78 ms** trung vị / **15,57 s** tổng (quét tuyến tính toàn kho tiền lệ + `tier1HsForQuery` lặp qua toàn bộ cụm tier-1)
  - `searchOzByKeyword` (`lib/oz-precedent-search.js`): **8,56 ms** trung vị / **2,76 s** tổng (quét toàn bộ `cachedGold` + gọi `isHeldOut`/`AsyncLocalStorage.getStore()` từng bản ghi)
  - `embedCau` + `timTheoNghiaTrucTiep`: **2,81 ms + 5,68 ms** trung vị
  - `timCgct` (khi bật `HS_TIM_CGCT=on`): **24,00 ms** trung vị / **8,42 s** tổng (cấp phát `Map` + object `{score, accHits}` cho từng posting)

## 2. Các tối ưu không mất thông tin đã áp dụng

- `lib/search-utils.js`: tiền tính 1 lần `vnLower`, `vnPlain`, `vnHead`, `vnHeadPlain`, `hasUsageMarker` cho bảng biểu thuế; tiền tính `ownChecks`, `wordChecks`, `phraseChecks` cho mỗi truy vấn; thay `.map().filter()` bằng vòng `for` đơn.
- `lib/precedent-search.js`: thêm chỉ mục ngược `precTokenMap`, `precByHs4`, `intlIndices`, `tier1TokenToPhrases`, tiền tính `_hDen` và `prepareQueryScore()`, giữ nguyên thứ tự gốc qua `_idx` / `_rank` và tự dựng lại chỉ mục nếu mảng `loadFlatPrecedents()` bị push thêm trong test.
- `lib/oz-precedent-search.js`: tiền tính `_heldOut` và `_freqBoost` trong `ensureCache()`, nhấc `evalExcludesHoldout()` ra ngoài vòng lặp, thêm inverted index `plainPostings` giữ thứ tự tie-break theo `idx`.
- `lib/query-parse.js`, `lib/glossary.js`, `lib/material-taxonomy.js`, `lib/search-query-expand.js`, `lib/hs-aliases.js`: biên dịch sẵn `RegExp`, danh sách mục từ điển, và bucket `aliasesByFirstWord` lúc nạp module.
- `lib/embed-pool.js`: unroll 8-chiều phép nhân vô hướng `int8` trong `timTheoNghiaTrucTiep` (`dim = 384`).
- `lib/tim-cgct.js`: thay `new Map()` trong `chamMotTruyVan` bằng buffer `Float64Array` / `Uint16Array` / `Uint8Array` / `Int32Array` tái sử dụng trên `idx`.

## 3. Số đo trước / sau & đối chiếu sha256 `origin/main`

### Bất biến đầu ra (300 ca S-7 + 30 ca Van khí nén)
So sánh sha256 đầu ra giữa bản sau tối ưu và `origin/main` (`d561ae11`):
- `OFF` (300 ca S-7): **0/300 khác** (`78a3476e44e5715e`)
- `ON` (`HS_TIEN_XU_LY=on`, 300 ca S-7): **0/300 khác** (`6775b0a6e7e0deb0`)
- `ON + HS_TIM_CGCT=on` (300 ca S-7): **0/300 khác** (`5aa7a63cb2e2e5bd`)
- Gọi trực tiếp `searchCandidates` + `searchPrecedents` + `searchOzByKeyword` (30 ca Van khí nén): **0/30 khác** (`f3d106d04e512c68`)

### Đo nhiều lần trên 300 ca S-7 `sach`

| Lần chạy | OFF med / p95 (ms) | ON med / p95 (ms) | Delta med / p95 | Top-1 / Top-5 / PN6@3 (ON) |
|---|---:|---:|---:|---|
| Trước tối ưu (nền `origin/main`, Mac dev) | 132,5 / 232,1 | 166,6 / 291,2 | +34,1 / +59,1 ms | 75,3% / 92,0% / 87,3% |
| Sau tối ưu — S-7 lượt 1 | 30,2 / 64,4 | 44,3 / 85,8 | +14,1 / +21,4 ms | 75,3% / 92,0% / 87,3% |
| Sau tối ưu — S-7 lượt 2 | 30,1 / 64,2 | 44,5 / 84,4 | +14,4 / +20,2 ms | 75,3% / 92,0% / 87,3% |
| Sau tối ưu — S-7 lượt 3 | 30,2 / 65,2 | 44,4 / 86,0 | +14,2 / +20,8 ms | 75,3% / 92,0% / 87,3% |
| Sau tối ưu — Đủ 4 bộ (`s7`) | 29,0 / 59,4 | 44,9 / 84,8 | +15,9 / +25,4 ms | 75,3% / 92,0% / 87,3% |
| Sau tối ưu — `HS_TIM_CGCT=on` (`s7`) | 41,5 / 86,7 | 59,4 / 108,6 | +17,9 / +21,9 ms | 75,3% / 92,0% / 90,0% |

- Độ chậm tăng thêm của `ON` so với `OFF` đạt **+14,1–15,9 ms** trung vị (vượt xa ngưỡng mục tiêu `<= 100 ms`), và tổng thời gian `ON` (**44,3–44,9 ms**) nhanh hơn **3×** so với `OFF` trước tối ưu (**132,5 ms**).
- Lệnh tái lập:
  ```bash
  node scripts/do-do-thi-gd2.mjs --so-sanh-tien-xu-ly --chi-bo=s7
  ```
