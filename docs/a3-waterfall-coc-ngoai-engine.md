# A3 waterfall — khe ngoài engine sau earlyExit cốc (OZV-1367)

Biên bản sạch thay các lần OZV-1361×3 (PR #1423/#1429 đã đóng). Số khớp [OZV-1360](a3-ozv-1360-phases-ngoai-engine.md) + phases `#1426` (`c2400279`). **Không** gán ms bịa cho `soTay` / `ganHoSo` local.

Timer ngoài engine (main ≥ `#1426`): `api/classify.js` — `t0→t1` = `classify()`, `t1→t2` = `ganHoSoClassify`, `afterEngineMs = ms − engine.ms`.

## 1. Bảng bước sau CHOT sớm (ngoài `engine.ms`)

| Bước | Tệp / hàm | sync/async | Local (OZV-1360 + test phases) | Live prod (GĐ 05:20 VN + thợ đo lại) |
| --- | --- | --- | ---: | ---: |
| `classifyLoop` / engine | `lib/engine-loop.js` → `engine.ms` | async | cốc ~1,1 s (stub/warm) | cốc 18–326 ms · bơm ~17–49 ms |
| `canCuPhapLy` / b1b (trong engine snapshot) | engine phases | sync | ~0–0,3 ms · `b1bMs=0` | không tách thêm · `b1b` không ăn khe |
| `soTayRuntime.advise` | `lib/so-tay-runtime.js` | sync nếu gọi | **0 — không gọi** khi `HS_SO_TAY=full` | **bác** (không trên đường; **không** gán 1–2 s) |
| WCO enrich / `wcoOp.byHs` | gather trước snapshot | async trong engine | ~1 ms · **trong** `engine.ms` | **bác** (ngoài engine) |
| Cửa sổ `ganHoSoClassify` (`t2−t1`) | `api/classify.js` → `lib/ho-so/api.js#ganHoSoClassify` | async | **0–0,5 ms** (`hoSoApDung(96170010)=false` local) | cốc **13573–25177 ms** · bơm/LED **0** |
| Hàm con trong cửa sổ (`cheDoHieuLuc` / `hoSoApDung` / `chayHoSo` / shadow) | cùng tệp `lib/ho-so/api.js` | lẫn | chưa tách | **chưa đo / chưa khoanh hàm** |
| `kemPhasesNgoaiEngine` (gắn JSON) | `api/classify.js` | sync | ≪1 ms | ≪1 ms |

**Cộng khe:** local `afterEngineMs` ≈ 0–151 ms (làm tròn / overhead HTTP). Live earlyExit **96170010**: `afterEngineMs` ≈ `ganHoSoMs` (GĐ: 13773 ≈ 13573 + `classifyMs−engineMs`; thợ: 25178 ≈ 25177).

## 2. Số đo đối chiếu (không mâu thuẫn OZV-1360)

### Local — khe ≈ 0 (OZV-1360 + script phases)

```bash
HS_SO_TAY=full HS_GON_DAU_RA=on HS_MAX_VONG_SUA=1 node scripts/test-classify-phases-after-engine.mjs
```

Kết quả nhịp này (worktree `origin/main`):

```json
{"hs":"96170010","ms":1272,"engineMs":1121,"phases":{"classifyMs":1268,"ganHoSoMs":0,"afterEngineMs":151}}
```

→ Local vẫn đúng OZV-1360: `ganHoSo` / cửa hồ sơ **không** ăn giây trên máy agent.

### Live — khe lớn chỉ cốc 96170010 (phases đã có trên Coolify)

| Câu | hs | ms | engineMs | afterEngineMs | classifyMs | ganHoSoMs | Nguồn |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| cốc giữ nhiệt… | 96170010 | 14099 | 326 | 13773 | 522 | **13573** | GĐ 05:20 VN |
| máy bơm… | 84137042 | 50 | 49 | 1 | 50 | **0** | GĐ |
| LED e27… | 85395210 | 163 | 163 | 0 | 163 | **0** | GĐ |
| cốc giữ nhiệt… | 96170010 | 25196 | 18 | 25178 | 19 | **25177** | thợ nhịp này |
| máy bơm… | 84137042 | 17 | 17 | 0 | 17 | **0** | thợ nhịp này |

⇒ Khe ngoài engine live **nằm trong cửa sổ timer `ganHoSoClassify`**. Local OZV-1360 (~0,5 ms) vẫn đúng — **lệch môi trường prod**, không bác số local.

## 3. Kết luận

- Thủ phạm **ngoài engine** đã khoanh được **cửa sổ**: `await ganHoSoClassify` (`mocPhases.ganHoSoMs = t2−t1` ở `api/classify.js`).
- Thủ phạm **chưa khoanh được hàm** bên trong cửa sổ (early-return `!hoSoApDung` vs `chayHoSo` khi `apDung`, hay bước sync/cheDo/shadow).
- Đã **bác** (không đo lại / không tối ưu cho khe này): `soTayRuntime.advise`, WCO ngoài engine, tối ưu thứ OZV-1360 đã bác trên local.
- OZV-1360 «bác ganHoSo ~0,5 ms» = **đúng trên local**; live chứng minh cùng tên cửa sổ có thể ~13–25 s — không được bịa ms 1–5 s cho ganHoSo/soTay như các PR 1361 cũ.

## 4. Top 3 bước đo tiếp (không đề xuất tối ưu thứ đã bác)

1. **In nhánh trong `ganHoSoClassify` trên prod** (log tạm / phases con): `cheDoHieuLuc`, `hoSoApDung(96170010)`, có/không vào `chayHoSo` — so cốc vs bơm cùng một deploy ≥ `c2400279`.
2. **Nếu `apDung=true` trên prod cho 96170010:** bấm giờ `chayHoSo` / `vietMoTa` / IO DB — tìm hàm con ăn ~10–25 s.
3. **Nếu `apDung=false` mà `ganHoSoMs` vẫn lớn:** đo event-loop / chờ khác trong cùng tick (hiện tượng lệch env); không quay lại tối ưu soTay.

## 5. Lệnh đo

```bash
# Local (xanh kỳ vọng ganHoSoMs ≈ 0)
HS_SO_TAY=full HS_GON_DAU_RA=on HS_MAX_VONG_SUA=1 node scripts/test-classify-phases-after-engine.mjs

# Live cốc vs bơm — in phases
curl -sS -A 'OZ-A3-measure/1.0' -X POST https://hs-kb.uythacnhapkhau.com/api/classify \
  -H 'Content-Type: application/json' \
  -d '{"tenHang":"cốc giữ nhiệt chân không (bình chân không)"}' \
  | jq '{hs:.results[0].hs,ms,engineMs:.engine.ms,phases}'

curl -sS -A 'OZ-A3-measure/1.0' -X POST https://hs-kb.uythacnhapkhau.com/api/classify \
  -H 'Content-Type: application/json' \
  -d '{"tenHang":"máy bơm nước ly tâm 1.5HP"}' \
  | jq '{hs:.results[0].hs,ms,engineMs:.engine.ms,phases}'
```

Tham chiếu: `docs/a3-ozv-1360-phases-ngoai-engine.md` · `api/classify.js` (`kemPhasesNgoaiEngine`, `mocPhases`) · commit phases `c2400279` (#1426).
