# Hướng dẫn tích hợp HS Code API — cho dự án backend ngoài

Tài liệu này dành cho developer của `erp-xnk` hoặc bất kỳ hệ thống nào muốn gọi API này.

## Base URL & Auth

```
Base: https://hs-kb.uythacnhapkhau.com

Authorization: Bearer <HS_API_TOKEN>   # chỉ cần cho quản trị / ghi dữ liệu
```

**Không cần token** (09/10/2026): nhóm tra cứu (GET) và 4 endpoint AI `suggest`, `describe`, `classify`, `match`
(không giới hạn lượt; đóng khẩn cấp bằng `HS_PUBLIC_LLM=false`). **Cần token**: `feedback`, `tariff` admin, dashboard
`admin_*`, `kpi`, `error_log`, `extract-specs`, `declaration-sheet`. ERP vẫn gửi token như cũ — gửi thừa không bị lỗi.
Token lấy từ biến môi trường của server hoặc hỏi admin.

---

## 1. Xác định mã HS cho 1 sản phẩm

### `POST /api/suggest`

Dùng khi người dùng nhập tên hàng → hệ thống trả về top 3 mã HS gợi ý.

```bash
curl -X POST https://.../api/suggest \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Máy bơm nước ly tâm Pentax 1.5HP 220V",
    "options": { "topReranked": 3 }
  }'
```

**Response:**
```json
{
  "suggestions": [
    {
      "hsCode": "84137090",
      "nameVi": "Bơm chất lỏng khác, loại khác",
      "confidence": 88,
      "reasoning": "Máy bơm ly tâm dân dụng, không phải bơm nhiên liệu hay bơm bê tông",
      "productExamples": ["Máy bơm nước ly tâm 1HP đầu gang", "Bơm tưới tiêu 2HP inox"],
      "learnedPenalty": null
    }
  ],
  "girRulesApplied": [
    {
      "rule": "GIR 6",
      "ruleKey": "6",
      "titleVi": "Phân loại ở cấp phân nhóm",
      "textVi": "Việc phân loại ở cấp phân nhóm được xác định theo nội dung của phân nhóm...",
      "basis": "DETERMINISTIC",
      "confidence": "high",
      "reasonVi": "Kết quả được chọn ở cấp phân nhóm giữa nhiều phân nhóm cùng nhóm 4 số...",
      "evidence": { "heading": "8413", "subheadingsCompared": ["84137090", "84138190"], "picked": "84137090" },
      "source": "WCO General Interpretative Rules"
    }
  ],
  "girDisclaimer": "Trích dẫn GIR là căn cứ tham khảo do hệ thống suy ra, KHÔNG phải phán quyết...",
  "canCuPhapLy": {
    "vanBan": { "soHieu": "85/2026/TT-BTC", "hieuLucTu": "2026-09-15", "congBao": "Công báo số 409 ngày 18-07-2026" },
    "trangThai": "CHUA_CHOT_CAN_XAC_NHAN",
    "cacBuoc": [
      { "buoc": 1, "canCu": ["4.1", "4.2.b", "4.2.c", "4.2.d"], "trangThai": "DA_AP_DUNG" },
      { "buoc": 2, "canCu": ["6.1"], "canDung": true, "taiLieu": [{ "id": "6.1.a", "trangThai": "CO_NOI_DUNG" }, { "id": "6.1.b", "trangThai": "CHUA_TRA_CUU" }, "…"] }
    ],
    "luuYPhapLy": [{ "canCu": ["5.2"], "basis": "RULE_TABLE" }],
    "dieuKhoan": { "4.1": { "tham_chieu": "Điều 4 khoản 1 85/2026/TT-BTC", "trang": 4, "trich": "Một mặt hàng có một mã số duy nhất…" }, "…": "…" }
  },
  "rankingSignals": [
    { "signal": "specificity_filter", "effect": "loại 2 ứng viên...", "note": "Ước lượng — CHƯA đối chiếu nguyên văn nhóm." }
  ],
  "chapterGuidance": [
    { "chapter": "84", "titleVi": "Máy móc cơ khí", "hints": [...], "requiredAttributes": [...] }
  ],
  "precedentMatches": [...],
  "confusionWarning": null,
  "explanatoryNote": { "noteVi": "...", "nguonLoai": "AI_CHUA_KIEM", "ghiChu": "chữ AI chưa kiểm — không làm căn cứ" },
  "cached": false,
  "ms": 1240
}
```

**`canCuPhapLy` — căn cứ pháp lý (TT 85/2026/TT-BTC, hiệu lực 15/09/2026).** Có trong `/api/suggest` và `/api/classify`.
- Bước 1 = Điều 4 (Danh mục VN + Biểu thuế + 6 quy tắc tổng quát; chi tiết quy tắc ở `girRulesApplied[]`). Bước 2 = Điều 6.1, **chỉ khi bước 1 chưa ra mã duy nhất**; `canDung` cho biết có cần dùng không. Điều 6.1 chỉ *liệt kê* a→d (Chú giải chi tiết HS, ý kiến phân loại WCO, SEN AHTN, CSDL Danh mục VN); văn bản **không** ghi "theo thứ tự" hay "ưu tiên", nên API không khẳng định thứ tự pháp lý.
- `6.1.a` dựa **nguyên văn chú giải nhóm** (toàn văn HS 2022 trong kệ sách; kèm `nhom`, `toanVan`), không dựa `explanatoryNote` — trường đó là chữ AI chưa kiểm (`nguonLoai: AI_CHUA_KIEM`, có `ghiChu`), chỉ gợi ý. Nhãn loại nguồn dùng chung: `NGUYEN_VAN` / `MAY_SUY` / `AI_DA_KIEM` / `NGUOI_DUYET` / `AI_CHUA_KIEM` (`lib/nguon-loai.js`); mọi mục sổ tay trong `soTay` mang `nguonLoai`, mục `AI_CHUA_KIEM` không bao giờ được trích.
- Trạng thái từng tài liệu nói đúng điều hệ thống biết: `CO_NOI_DUNG` (kệ sách có nội dung cho mã này), `KHONG_CO_DU_LIEU_CHO_MA_NAY`, `CHUA_TRA_CUU` (kho chưa nạp, hiện là ý kiến phân loại WCO), `CHUA_TRA_CUU_TRONG_LUOT_NAY`, `CO_TIEN_LE_KHOP`/`KHONG_CO_TIEN_LE_KHOP`. Phản hồi suggest/classify chỉ trả **con trỏ** tới ý kiến phân loại WCO (kèm `xemToanVan`); toàn văn xem ở `/api/wco-opinions` bên dưới.
- `dieuKhoan` chứa nguyên văn từng điều được dẫn (mỗi điều một lần); các bước chỉ nêu id. Đây là điều luật để tham khảo, **không phải quyết định phân loại**; người khai chịu trách nhiệm về mã số khai.

**`GET /api/wco-opinions` — ý kiến phân loại WCO (Compendium 2022), công khai, không cần token.**
- `?hs=8528` | `?hs=852852` | `?hs=85285200` → danh sách con trỏ `{hs, thuTuTrongMa, namThongQua, doTinCay, xemToanVan}`; thêm `&chiTiet=1` để kèm toàn văn (tối đa 20).
- `?hs=852852&n=6` → toàn văn: `nguyenVanEn` (bản OCR), `banDichVi` (bản dịch tiếng Việt **không chính thức**, chỗ nghi lỗi OCR ghi `[?]`), `quyTacApDung`, `nguon`, `doTinCay`, `daSoatAnh`, `luuY`, `banQuyen`.
- **Chỉ ý kiến đã qua cổng mã/thứ tự** được trả (OCR làm rơi biển tiêu đề mã ở một số ý kiến; trích nhầm mã tệ hơn không trích). Danh sách **có thể chưa đủ** — không có kết quả không có nghĩa là mã này không có ý kiến (`daySuDu:false`).
- **Bản quyền:** nội dung thuộc WCO; Oz tuyên bố đã trả phí bản quyền để sử dụng và công bố; nội dung này không thuộc CC BY-SA (xem `NOTICE.md`). Mọi phản hồi kèm `banQuyen`.
- `nguyenVanEn` là OCR từ bản scan, `daSoatAnh:false` = chưa đối chiếu ảnh trang gốc: đối chiếu bản gốc trước khi dẫn trong hồ sơ Hải quan.

**`soTay` — sổ tay chú giải, chế độ cố vấn.** Có trong `/api/suggest` và `/api/classify` khi nhóm của mã đã chọn có sổ tay (152 nhóm; nhóm chưa có → `trangThai: CHUA_CO_SO_TAY_CHO_NHOM`).
- **Không đổi** mã đã chọn, trạng thái, cờ hay prompt: chỉ đính thêm thông tin. Hệ thống ERP cứ xử lý như cũ; hiển thị `soTay` cho chuyên viên nếu muốn.
- `canGiaiTrinh[]` = máy **nghi**, chưa kết luận: sổ tay nhóm đã chọn loại trừ đích danh một nhóm khác mà nhóm đó cũng đang là ứng viên. Chưa đo tỉ lệ báo oan — đừng dùng làm cổng chặn tự động.
- `yKienWco[]` = tóm tắt **tự viết** của ý kiến phân loại WCO cho đúng mã (6 số), kèm số thứ tự in, năm thông qua, `doTinCay` (`CHAC` | `SUY_LUAN`). Không phải nguyên văn; `daSoatAnh:false` = chưa đối chiếu ảnh trang gốc; `yKienWcoDayDu:false` = danh sách có thể chưa đủ.
- `canCuPhapLy` mục 6.1.b lấy con trỏ từ kho `data/wco-op` (đi kèm bản triển khai); nếu kho không có thì lấy từ sổ tay (`nguonTraCuu: "SO_TAY"`).
- Tắt khẩn cấp: env `HS_SOTAY_RUNTIME=false`.

## Hợp đồng cho Cổng OZ (`ozvietnam/ozplugin`, MCP gateway) — 11/10/2026

Cổng là máy chủ MCP bọc các endpoint dưới đây và bán/cấp cho khách qua Claude Desktop, Cursor, DSH. Hợp đồng từ phía kho này:

| Cổng cần | Trạng thái ở hs-code-api | Ghi chú hợp đồng |
|---|---|---|
| Khoá dịch vụ có tên (13.2) | ✅ `HS_SERVICE_TOKENS="cong-oz:<khoá>,erp:<khoá>"` (`lib/auth.js#serviceCaller`) | Nhật ký phân biệt được Cổng / ERP / quản trị. `HS_API_TOKEN` cũ vẫn dùng được. |
| Chi phí vốn mỗi lượt (13.1) | ✅ `usage: [{provider, model, inputTokens, outputTokens}]` ở `/api/classify`, `/api/describe` | **Chỉ** trả cho khoá dịch vụ; công khai / `HS_API_TOKEN` không có trường này. Token không biết = `-1`. Không bao giờ chuyển `usage` cho khách. |
| `tra_thue` → `GET /api/tax?hs=&origin=` | ✅ công khai | — |
| `tim_ma_hs` → `GET /api/search` | ✅ công khai, **lexical** | Tìm theo từ khoá; mô tả dài/đồng nghĩa yếu. Phân loại thật dùng `/api/classify` (thu phí). Đây là cách giải quyết mục 2 của #67. |
| `tra_chu_giai` → `GET /api/notes` | ✅ công khai | — |
| `tra_tien_le` (J4) → `GET /api/precedents?hs=` hoặc `?q=` | ✅ cả hai nhánh | ⚠️ Nhánh `?hs=` **không có tiền lệ → HTTP 404** `{found:false}`; nhánh `?q=` trả 200 `{found:false}`. Adapter của Cổng coi mọi `!res.ok` là `BACKEND_LOI` nên **phải xử lý 404 ở precedents là "không có tiền lệ"**, không phải lỗi. Có cả `hs` lẫn `q` thì API ưu tiên `q`; Cổng muốn ưu tiên mã thì chỉ gửi `hs`. |
| `tra_hieu_luc_van_ban` (J5) → `GET /api/dataset?resource=legal_status&so=` | ✅ | `registry.registryVersion` (vd `2026-10-10`) là phiên bản để ghi vào `nguon[0].phienBan`. Tối đa 50 số hiệu/lượt. |
| `sinh_mo_ta_khai_bao` (J6) → `POST /api/describe` | ✅ | `compliance.{score,level,warnings[]}` đi nguyên văn. LLM lỗi → vẫn 200 nhưng `degraded:true` + `llmError:{code,message,retryable}` + warning `DESCRIPTION_DEGRADED` (#67 mục 1): Cổng phải báo khách "bản tạm, nên gọi lại" khi `retryable`. |
| `phan_loai_hs` → `POST /api/classify` | ✅ | `girRulesApplied[]`, `canCuPhapLy` đi nguyên văn. Trường **thêm mới (chỉ thêm, không đổi shape)**: `soTay` (sổ tay cố vấn, có thể vắng) và `canCuPhapLy…yKien[].xemToanVan`. |
| Ý kiến phân loại WCO (kỹ năng 3 "tranh chấp") | ✅ **mới** `GET /api/wco-opinions?hs=` / `&n=` — công khai | Toàn văn + bản dịch + `banQuyen`. Đề xuất công cụ miễn phí `tra_y_kien_wco` bên Cổng. |
| Tắt chế độ mở của 4 lệnh LLM | ⏸ chờ M3 (CEO duyệt: tắt cùng lúc thu tiền) | `HS_PUBLIC_LLM=false` khi tới lúc; khoá dịch vụ không bị ảnh hưởng. |
| Dữ liệu khách không ra tầng LLM miễn phí (#237 J1) | ✅ tự động cho **mọi lượt có khoá dịch vụ** (`suggest`, `classify`, `describe`) | LLM chỉ đi nhà cung cấp trong `LLM_NO_TRAIN_PROVIDERS` (mặc định MiniMax + khoá Gemini trả phí); không Gemini miễn phí, không mẫu `:free`, không Hermes. Hết nhà cung cấp hợp lệ → `describe` trả `degraded:true` + `llmError.code="NO_PRIVATE_LLM"`; `classify` trả `status` lỗi động cơ kèm `llmError` chứa `NO_PRIVATE_LLM`. Cổng báo khách "hệ thống tạm không nhận, thử lại sau", **không** gọi lại bằng khoá khác. Kiểm: `GET /api/health` → `llm.private.providers`. |
| `extract-specs`, `declaration-sheet` | 🔒 kín | Không đưa vào Cổng khi CEO chưa chốt (luật bất biến 2). |
| Gói căn cứ soát/giải trình (S3, hs-code-api#337) → `POST /api/evidence-pack` | ✅ **mới** — 🔒 KÍN (khoá dịch vụ / `HS_API_TOKEN`), **không gọi LLM** | Xem mục con *Gói căn cứ* ngay dưới. |

Fixture hợp đồng: Cổng ghi phản hồi thật bằng `apps/gateway/scripts/ghi-fixture.ts`; kho này chỉ **thêm** trường, không đổi tên/bỏ trường đã có — đổi gì phá hợp đồng phải ghi ở mục này trước.

### Gói căn cứ — `POST /api/evidence-pack` (17/10/2026, #337)

Rewrite `/api/evidence-pack` → `/api/dataset?resource=evidence_pack`. Chỉ `POST`; `GET` → 405. Không token → 401 (không nằm trong
allowlist `lib/public-access.js`). Không gọi LLM nên không có chi phí vốn: khoá dịch vụ nhận `usage: []`.

**Đầu vào** (khớp `YeuCauGoiCanCuInput` của Cổng, `.strict()`): `{ maHs: string[1..2] (mỗi mã đúng 8 chữ số), moTa: string (1–2000 sau trim), thongSo?: string (≤ 2000) }`.
Trường lạ, sai kiểu, sai độ dài → `400 { error: "DAU_VAO_SAI", chiTiet: string[] }`.

**Đầu ra** (camelCase):

```
{ goiCanCu: GoiCanCu[],              // cùng thứ tự maHs
  soSanhCap?: { maA, maB, cungChuong, cungNhom4, cungPhanNhom6, trongBangDeNham, ghiChu },   // chỉ khi 2 mã
  phienBanGoiCanCu, phienBanBieuThue, khongDungLlm: true, disclaimer, usage? }
```

Mỗi `GoiCanCu` = `{ maHs, coTrongBieu, viTri, chuGiai, loaiKhac, gir, canCuPhapLy, yKienWco, tienLe, capDeNham, thue }`.
**Mọi phần luôn có mặt và là object có `trangThai`**; danh sách nằm ở `items` và chỉ có khi không rỗng — không bao giờ có mảng rỗng im lặng.

| Phần | Nguồn | `trangThai` có thể gặp |
|---|---|---|
| `viTri` | `lib/hs-tree.js` (cây theo chữ số) + tên dòng biểu thuế | `CO_DU_LIEU` |
| `chuGiai` | `items[]` = `{cap: PHAN\|CHUONG\|NHOM\|SEN, ma, nguyenVan, nguon, phienBan}` — **nguyên văn**; `thieu[]` = chỗ chú giải còn thiếu | `CO_NOI_DUNG` |
| `loaiKhac` | phạm vi "Loại khác" = cha trừ `anhEmCoTen[]` | `LA_DONG_LOAI_KHAC`, `KHONG_PHAI_DONG_LOAI_KHAC` |
| `gir` | **chỉ** `lib/gir.js`; `items[]` có `basis`/`evidence`/`source` + `disclaimer` | `CO_TRICH_DAN`, `KHONG_CO_TRICH_DAN` |
| `canCuPhapLy` | **chỉ** `lib/legal-basis.js` (`canCuPhapLy` như `/api/classify`) + `hoSo` (Điều 10.1.d; Điều 8, 9.1, 9.2.b khi mô tả có dấu hiệu tháo rời) | như `/api/classify` (`CHUA_CHOT_CAN_XAC_NHAN`: mã do người gọi đưa vào) |
| `yKienWco` | `lib/wco-op.js#byHs/view`; mỗi mục có `nguyenVanEn`, `banDichVi`, `banQuyen`, `xemToanVan` | `CO_Y_KIEN`, `KHONG_CO_Y_KIEN_CHO_MA_NAY`, `CHUA_TRA_CUU_DAY_DU` |
| `tienLe` | `data/precedents.json` (TB-TCHQ + CBP/ABF); `items[].khop` = `DUNG_MA`/`CUNG_PHAN_NHOM`/`CUNG_NHOM`/`MO_TA_TUONG_TU`, `xacMinhNguon.muc` = `CO_BAN_CHUP`/`CO_DUONG_DAN`/`CHUA_XAC_MINH`; `tienLeMaKhac[]` = mô tả tương tự nhưng kết luận nhóm khác | `CO_TIEN_LE_KHOP`, `KHONG_CO_TIEN_LE_KHOP` |
| `capDeNham` | `data/conflicts.json` + bảng quyết định qua `lib/conflict-resolver.js` (`tieuChiPhanBiet[]`) | `CO_CAP_DE_NHAM`, `KHONG_CO_TRONG_BANG` |
| `thue` | đúng shape `GET /api/tax` | `CO_DU_LIEU` |

Phần nào không tra được (mã không có trong biểu, kho chưa nạp…) → `{ trangThai: "CHUA_TRA_CUU", ghiChu }`. Cổng **không** được
diễn giải `CHUA_TRA_CUU` thành "không có". Gói có thể lớn (chú giải phần/chương nguyên văn, ~80–170 KB cho 2 mã).
Bộ ca thử: `tests/fixtures/soat/ca-tong-hop.json` (38 ca công khai: TB-TCHQ, ý kiến WCO, dòng ACFTA "(-CN)", ca CEO thử qua Cổng).

### ⚠️ Thay đổi hợp đồng `girRulesApplied` (2026-09)

Trước đây trường này chứa **checklist dữ kiện theo chương**, dù tên gọi là "GIR
rules applied" — và tài liệu thì mô tả nó là mảng chuỗi. Cả hai đều không khớp
code. Nay đã tách bạch:

| Trường | Nội dung | Dùng để |
|---|---|---|
| `girRulesApplied[]` | Trích dẫn quy tắc GIR **có căn cứ**, mỗi mục kèm `basis` + `evidence` + `source` | Audit trail, hồ sơ giải trình Hải quan |
| `girDisclaimer` | Cảnh báo pháp lý bắt buộc hiển thị kèm | Bảo vệ người khai |
| `rankingSignals[]` | Tín hiệu xếp hạng kỹ thuật (heuristic) | Debug, KHÔNG dùng làm căn cứ pháp lý |
| `chapterGuidance[]` | Checklist dữ kiện theo chương (nội dung cũ của `girRulesApplied`) | Nhắc NV nhập thiếu thông tin gì |

**Đọc `basis` trước khi tin:**

| basis | Nghĩa | Đưa vào hồ sơ giải trình? |
|---|---|---|
| `RULE_TABLE` | Bảng quyết định do người soạn, có dẫn văn bản gốc | ✅ Được |
| `DETERMINISTIC` | Code suy ra từ tín hiệu chắc chắn | ✅ Được |
| `HEURISTIC` | Dò từ khoá / điểm ước lượng | ⚠️ Cần người kiểm chứng |
| `LLM_ASSERTED` | Mô hình tự khai, chưa kiểm chứng | ❌ Không |

ERP nên hiển thị `basis` ngay cạnh mỗi trích dẫn — người khai phải biết chỗ nào
chắc, chỗ nào cần tự xác minh trước khi ký tờ khai.

**Lưu ý ERP:**
- **KHÔNG tự động điền mã theo `confidence`.** `confidence` là con số mô hình AI
  tự khai cộng điểm thưởng, CHƯA hiệu chuẩn: trên 200 tờ khai thật, nhóm 90–99
  điểm chỉ đúng 16%. Luôn hiển thị 3 gợi ý và để người khai chọn/xác nhận.
- `engine: "deterministic"` + `degraded: true`: AI lỗi hoặc mọi mã AI trả đều
  bị loại — gợi ý là thứ tự tìm kiếm, `confidence: null`. Bắt buộc người có
  chuyên môn chọn.
- `llmRejectedCodes[]`: mã AI trả nhưng không có trong biểu thuế / ngoài danh
  sách ứng viên — đã bị loại, chỉ để minh bạch.
- `status` + `nextAction`: đọc trước tiên — `NEED_FACTS` / `REVIEW` /
  `RESOLVED_BY_TABLE` / `NEEDS_EXPERT` / `NO_CANDIDATES` (xem AGENTS.md mục 4).
  `rejectedFacts[]`: câu trả lời không quy đổi được, kèm `optionsVi` để hỏi lại.
- `missingFacts[]`: hỏi người dùng đúng các câu `questionVi`, rồi gọi lại
  `/api/suggest` với cùng `description` + `facts: { <attribute>: <giá trị> }`.
- `cached: true`: kết quả từ cache, `ms` ~0
- `productExamples[]`: chỉ có cho mã "Loại khác" — tên hàng THẬT từ tờ khai (có thể rỗng).
  `productExamplesGenerated[]`: câu máy sinh, chưa kiểm chứng — hiển thị kèm nhãn "ví dụ tham khảo"
- `learnedPenalty`: có nghĩa là AI từng gợi sai mã này, đã trừ điểm tự động

### `POST /api/classify` — thêm `supplierHs` (mã nhà cung cấp tự khai, 09/10/2026)

Sàn made-in-china ghi sẵn mã HS do nhà cung cấp khai trên trang sản phẩm. ERP gửi kèm:

```json
{ "tenHang": "…", "nameZh": "…", "specs": "…",
  "supplierHs": { "code": "90049090", "source": "made-in-china", "url": "https://….en.made-in-china.com/product/…" } }
```

- Mã TQ 8–10 số: **chỉ 6 số đầu** theo HS quốc tế, đuôi là của TQ → máy chủ KHÔNG lấy nguyên mã làm mã VN.
- Đúng tầng: **một nguồn kiểm chứng**, không phải đáp án. Nhóm 4 số của nhà cung cấp được xem chú giải + dòng biểu
  thuế như mọi nhóm khác; AI vòng 2 thấy "Nhà cung cấp khai HS <6 số> (nhóm …)" kèm dòng biểu thuế VN tương ứng.
- Chọn **khác nhóm 4 số** mà chưa giải trình → cổng `NCC_KHAI_KHAC_NHOM` chặn một lần; sau cùng vẫn khác nhóm →
  `review.needed` với lý do "NCC khai … / hệ thống chọn …". Khác 6 số cùng nhóm → chỉ cảnh báo nhẹ
  (`antiPatternWarnings`). Cùng 6 số → tăng tin cậy (+5, ghi `basis` stream `NHA_SAN_XUAT`).
- Trả `dossier.supplier = { code, hs6, heading4, source, url, agree: "SAME6" | "SAME4" | "DIFF" }` (động cơ loop);
  `attrs.supplierHs` là bản đã chuẩn hoá (`null` nếu rác: không đủ 6 chữ số / nhóm không có trong biểu thuế).

---

## 2. Xác định mã HS hàng loạt (nhập PO)

### `POST /api/suggest` với `items[]`

Dùng khi nhập PO có nhiều dòng hàng — gọi 1 lần thay vì N lần.

```bash
curl -X POST https://.../api/suggest \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      { "id": "line-001", "description": "iPhone 15 Pro Max 256GB" },
      { "id": "line-002", "description": "Máy bơm nước Pentax 1.5HP" },
      { "id": "line-003", "description": "Dầu cọ tinh luyện RBD phuy 200L" }
    ],
    "options": { "topReranked": 2 }
  }'
```

**Response:**
```json
{
  "total": 3,
  "truncated": false,
  "results": [
    { "id": "line-001", "suggestions": [...], "ms": 1100 },
    { "id": "line-002", "suggestions": [...], "ms": 950, "cached": true },
    { "id": "line-003", "suggestions": [...], "ms": 1300 }
  ],
  "totalMs": 1400
}
```

**Giới hạn:** tối đa 20 items/request. Nếu PO có nhiều hơn → chia batch.

---

## 3. Tra thuế cho mã HS

### `GET /api/tax?hs=<code>[&origin=CN]`

```bash
curl "https://.../api/tax?hs=10019911&origin=CN"
```

**Response (rút gọn):**
```json
{
  "found": true,
  "hsCode": "10019911",
  "nameVi": "- - - - Meslin (SEN)",
  "unitVi": "kg",
  "taxNkTt": "5",
  "taxNkPreferential": "0",
  "taxAcfta": "0 (-CN)",
  "taxAcftaChina": { "origin": "CN", "eligible": false, "rate": null,
                     "noteVi": "Hàng xuất xứ CN KHÔNG được hưởng mức ACFTA 0% (\"0 (-CN)\") — áp MFN." },
  "taxVat": "*/5/8/10",
  "acfta": {
    "raw": "0 (-CN)", "available": true, "rate": 0, "excludedCountries": ["CN"],
    "needsReview": false,
    "forOrigin": { "origin": "CN", "eligible": false, "rate": null, "noteVi": "..." }
  },
  "policyByHs": "Kiểm dịch thực vật (01/2024/TT-BNNPTNT M9)",
  "hasPolicyWarning": true
}
```

**Lưu ý:**
- **ĐỪNG đọc số đầu của `taxAcfta`.** Chuỗi `"0 (-CN)"` nghĩa là nước trong
  ngoặc KHÔNG được hưởng mức đó — 510 dòng loại trừ đích danh Trung Quốc. Dùng
  `acfta.forOrigin` (theo `?origin=`, mặc định `CN`) hoặc `taxAcftaChina`:
  - `eligible: false` → áp MFN (`taxNkPreferential`), không dùng C/O mẫu E
  - `eligible: null` → biểu gốc có nhiều mức cho mã này, tra dòng 10 số trước khi khai
  - `higherThanMfn: true` → ACFTA cao hơn MFN, nên khai MFN
- `taxAcftaChina` cũng có trong kết quả `/api/search` và `/api/suggest`.
- Mã chương 98 có thêm `mappedHs` — mã hàng tương ứng tại Mục I; VAT, chính
  sách và tên tiếng Anh theo mã đó.
- Response được cache `public, max-age=86400` — ERP có thể giữ kết quả 24h
- `hasPolicyWarning: true` → hiển thị cảnh báo cho NV kế toán
- `policyByHs` → raw text policy; bản đã phân tích nằm ở trường `warnings` (mục 4)

---

## 3b. Cây quan hệ HS (phần → chương → nhóm → phân nhóm → tiêu đề quốc gia → dòng 8 số) — 11/10/2026

Từ 11/10/2026 mọi quan hệ cha/anh em trong phản hồi lấy từ `lib/hs-tree.js`: suy **từ chữ số của mã** (2 số = chương,
4 = nhóm, 5–6 = phân nhóm WCO theo quy ước `xxxx.x0` một gạch / `xxxx.xy` hai gạch, 7 = tiêu đề quốc gia, 8 = dòng lá).
Số gạch trong tên dòng chỉ là tầng hiển thị. Trước đó anh em suy theo gạch — sai ở 1.964/3.383 mã "Loại khác".

| Nơi | Trường | Ý nghĩa |
|---|---|---|
| `GET /api/tax` (trường cấp cao nhất) | `siblingHsCodes[]` | Dòng 8 số **cùng cha thật** (vd 85044090 → 85044020, 85044030, 85044040; không còn 85041000) |
| | `parentCode`, `parentSuyRa` | Cha thật theo chữ số; `parentSuyRa: true` = tiêu đề bị lược khi nhập biểu thuế (vd `8504211`), tên chưa có |
| | `siblingGroupCodes[]`, `treePath[]` | Anh em là nhóm con (tiêu đề); đường từ phần tới cha |
| | `parentSubheadingCode`, `indentationLevel`, `treeLevel` | Giữ như cũ |
| `POST /api/suggest`, `/api/classify` → `soTay` | `viTri` | Vị trí mã đã chọn: `nut`, `duongDan[]`, `cha {id, ten, suyRa}`, `anhEm[]`. Có cả khi nhóm chưa có sổ tay. Nút bị lược mà sổ tay đã điền tên (kèm trích, máy kiểm) có thêm `tenSoTay {tenVi, nguon, trich, nguonLoai}` và `duongDan[]` ghi "tên theo sổ tay: …" |
| | `loaiKhac` (chỉ khi mã đã chọn là dòng "Loại khác") | `toTienCoTen` trừ `anhEmCoTen[]`; mỗi anh em kèm `dieuKien` + `nguon` + `trich` từ sổ tay (đã máy kiểm) nếu có. **Cố vấn**: không đổi mã; là danh sách người khai phải chứng minh hàng KHÔNG rơi vào |
| | `canGiaiTrinh[].loai` | `LOAI_TRU_SANG_NHOM` (sổ tay loại trừ sang nhóm đang là ứng viên) hoặc **`ANH_EM_CO_TEN_KHOP`** (mã chọn là "Loại khác" trần mà mô tả hàng khớp dòng anh em có tên: `hs`, `tenVi`, `doKhop`, `nguon`, `trich`). Cả hai là máy **nghi**, chưa đo tỉ lệ báo oan — Cổng/ERP hiển thị để người khai giải trình hoặc xem lại mã, **không** tự đổi mã |
| `POST /api/classify`, `/api/suggest` + header `X-OZ-Eval-Holdout: 1` | — | Lượt bench chống rò: kho tiền lệ Oz bỏ tập giữ riêng chỉ trong lượt này. Chỉ bớt ngữ cảnh, không mở gì thêm; khách thường không gửi |
| `GET /api/tree?hs=` (mới, công khai) | `nut`, `duongDan[]`, `cha`, `anhEm[]`, `con[]`, `loaiKhac`, `nguon{}` | Một mã (2/4/6/8 số, hoặc 5/7 số cho nút trung gian) → toàn bộ quan hệ + phạm vi "Loại khác" + nguồn gắn vào nút với nhãn `NGUYEN_VAN` / `DA_KIEM` / `AI_CHUA_KIEM`. Mã WCO `xxxx00` trỏ về nhóm. Đây là nguồn cho công cụ MCP `tra_cay_hs` bên Cổng OZ |
| `GET /api/notes` → `chain[]` | `nguonLoai` | Cấp `NATIONAL` (từ `explanatory-notes.json`) mang `nguonLoai: AI_CHUA_KIEM` + `ghiChu`; các cấp phần/chương/nhóm/phân nhóm là nguyên văn |
| `GET /api/tax`, `GET /api/search` → `breadcrumb` | `levels[]`, `trail` | Nay có tên tiếng Việt chương/nhóm (từ chú giải) và cả tiêu đề bị lược ("Tiêu đề 8504211 (tên bị lược)") |
| | `path[]`, `parentId`, `siblingHsCodes[]`, `anhEmCoTen[]`, `toTienCoTen` | Mới. Với dòng "Loại khác": phạm vi = `toTienCoTen` trừ `anhEmCoTen` (cha trừ anh em có tên) |
| | `isResidual`, `scopeVi`, `excludesVi` | Giữ như cũ; `scopeVi`/`excludesVi` là chữ AI (chưa kiểm), chỉ gợi ý |
| `GET /api/kg_chapter?chapter=85&tree=1` | nút `level` | Thêm hai loại nút ảo: `ONE_DASH_GROUP` (nhóm một gạch, vd `85042`) và `NATIONAL_HEADER` (tiêu đề quốc gia, vd `8504211`), đều `suyRa: true`, `name` có thể `null`. `SUBHEADING` có `nameEn` WCO. Dòng lá giữ nguyên trường cũ. Tên nhóm lấy từ chú giải nhóm thay vì dòng lá đầu |

Nút ảo không bịa tên. **Từ 12/10/2026** tên tiếng Việt của nhóm một gạch, tiêu đề quốc gia và phân nhóm 6 số lấy **nguyên văn từ biểu thuế XNK của Tổng cục** (`data/bieu-thue/<phiên bản>/ten-nut.json`, nhãn `NGUYEN_VAN`, `tenNguon: "bieu-thue@2026.04.05"`): 2.160/2.194 nút ảo và 1.046/2.035 phân nhóm 6 số đã có tên — `viTri`, `breadcrumb`, `/api/tree`, `/api/kg_chapter?tree=1` tự có tên. 34 nút còn lại vẫn `name: null` / "tên bị lược" cho tới khi sổ tay điền kèm trích dẫn.

## 4. Tra chi tiết chính sách kiểm tra chuyên ngành

### `GET /api/tax?hs=<code>` (trường `warnings`)

Thông tin policy được parse sẵn trong response tax:

```json
{
  "warnings": {
    "requiresLicense": false,
    "requiresInspection": true,
    "inspectionTypes": ["chat-luong"],
    "requiresQuarantine": false,
    "dualUseControl": false,
    "ministries": ["BKHCN"],
    "legalDocs": [
      { "code": "32/2023/TT-BKHCN", "type": "Thông tư", "year": 2023, "issuer": "BKHCN" }
    ],
    "summary": "Hàng hóa thuộc nhóm phải kiểm tra chất lượng nhập khẩu.",
    "severity": "MEDIUM"
  }
}
```

**Mapping severity → UX:**
| severity | Màu | Hành động ERP |
|----------|-----|---------------|
| `HIGH` | 🔴 Đỏ | Block nhập, yêu cầu giấy phép trước |
| `MEDIUM` | 🟡 Vàng | Cảnh báo NV, cần chuẩn bị hồ sơ kiểm tra |
| `LOW` | 🟢 Xanh | Ghi chú, không block |

---

## 5. Sinh mô tả khai báo Hải quan (TT 39/2018)

### `POST /api/describe`

Dùng khi NV cần soạn mô tả hàng hóa cho tờ khai.

```bash
curl -X POST https://.../api/describe \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "hsCode": "84137090",
    "productName": "Máy bơm nước ly tâm",
    "brand": "Pentax",
    "model": "CM50",
    "origin": "IT",
    "technicalSpec": "Công suất 1.5HP, điện áp 220V/50Hz, lưu lượng 3m³/h",
    "condition": "Mới 100%"
  }'
```

**Response:**
```json
{
  "declaration": {
    "tenHang": "Máy bơm nước ly tâm",
    "nhanHieu": "Pentax",
    "model": "CM50",
    "xuatXu": "Italia",
    "tinhTrang": "Mới 100%",
    "donViTinh": "cái",
    "thongSoKyThuat": ["Công suất: 1.5HP", "Điện áp: 220V/50Hz", "Lưu lượng: 3m³/h"],
    "congDung": "Bơm nước sinh hoạt và tưới tiêu"
  },
  "customsDescription": "Máy bơm nước ly tâm, nhãn hiệu Pentax, model CM50, xuất xứ Italia, mới 100%, công suất 1.5HP, điện áp 220V/50Hz, lưu lượng 3m³/h, dùng bơm nước sinh hoạt và tưới tiêu",
  "compliance": {
    "score": 92,
    "level": "PASS",
    "warnings": []
  },
  "ms": 890
}
```

**ERP dùng `customsDescription`** để điền vào ô "Mô tả hàng hóa" trên phần mềm khai báo.

---

## 5b. Phiếu hồ sơ khai báo (thông số trang + chữ trong ảnh → ô cần khai)

`POST /api/declaration-sheet` (Bearer). Gom việc **chọn thông tin cho tờ khai** về một chỗ:
ô chung TT 39/2018 (công dụng, chất liệu, kích thước, nhãn hiệu, model) + ô theo nhóm hàng
(339 nhóm 4 số). Dịch vụ không lưu gì — bên gọi lưu phiếu của từng món.

```bash
curl -X POST "$BASE/api/declaration-sheet" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{
  "titleZh": "86型墙壁暗装电源插座带开关",
  "specsZh": [{"key":"材质","value":"锡磷青铜"},{"key":"额定电流","value":"10A"}],
  "variant": [{"label":"Phân loại","value":"一开多功能八孔"}],
  "imageTexts": [{"url":"https://img/9.jpg","text":"产品规格 面板材质\n86mm*86mm PC阻燃"}],
  "hsCode": "85366932",
  "supplements": [{"key":"voltage","valueVi":"250V","source":"DOCUMENT"}]
}'
```

Trả về:
- `fields[]` — mỗi ô: `valueVi`, `status` (`HAVE` | `UNVERIFIED` máy đọc từ ảnh nhưng chưa soát |
  `UNTRANSLATED` | `MISSING`), `source` (`SITE` | `IMAGE_OCR` | `IMAGE_AI` | người bổ sung), `method` (`DICTIONARY` | `LLM` |
  `SKU_SELECTED` | `PACKAGING` | `VISION` | `MERGED_PARTS` | `SUPPLEMENT` | `KNOWN`), `evidence` (đoạn chữ + link ảnh).
- `missing[]` — ô bắt buộc còn thiếu, kèm `questionVi` / `questionZh` để hỏi khách / shop.
- `images[]` — ảnh nào có thông số (`used`), ảnh nào bị gạt (quảng cáo, giới thiệu thương hiệu, chính sách shop).
- `trademark` — nhãn hiệu, rủi ro nhãn được bảo hộ (TT 13/2015 & 13/2020), chữ gợi hàng nhái trên tên hàng (高仿, 原单, 同款…).
- Có `hsCode`: `description.customsDescription` — mô tả ECUS **ghép tất định từ phiếu** (ô bắt buộc không bị rơi, ≤200 ký tự);
  `policy` — mức chính sách (xem mục 3).

Gửi lại `supplements` (khách/NV/chứng từ bổ sung) mỗi lần lập lại phiếu — chúng thắng dữ liệu trang.
Gửi `known` (ô đã rút lần trước) để đỡ một lượt AI.

### 5c. SKU đang chọn + bảng kiện + ảnh (vision) + mô tả (09/10/2026)

CEO: *"thẻ cấu trúc trên sàn (bảng thuộc tính, SKU đang chọn, bảng kiện) là nguồn chính xác nhất; ảnh SKU khách chọn
thể hiện nhiều thông tin cụ thể; ảnh chi tiết chỉ bổ sung rộng."* Phiếu nhận thêm 4 trường (đều tuỳ chọn, thiếu/sai hình → bỏ):

```jsonc
{
  "skuSelected": [                                   // lựa chọn ĐANG CHỌN — nguồn mạnh nhất về biến thể (thay variant)
    {"group":"颜色分类","value":"商务金【升级防蓝光镜片】","imageUrl":"https://cbu01.alicdn.com/…jpg","qty":2},
    {"group":"度数","value":"150度（建议50-54岁）"}
  ],
  "packaging": {"sku":{"镜框颜色":"金色"},"lengthCm":17,"widthCm":11,"heightCm":10,"volumeCm3":1870,"weightG":40}, // bảng 商品件重尺
  "descriptionText": "镜架材质：金属\n产品重量 25.8g\n…",       // chữ 商品详情 ≤ 8.000 ký tự
  "images": [{"url":"https://cbu01.alicdn.com/…sku.jpg","role":"sku"},{"url":"https://cbu01.alicdn.com/…main.jpg","role":"main"}] // ≤ 3
}
```

**Luật ưu tiên nguồn** (ô nào đã có từ nguồn mạnh hơn thì nguồn yếu hơn không đè):
`supplements` (người bổ sung) > **SKU đang chọn** > bảng thuộc tính trang (`specsZh`) > bảng kiện (`packaging`) > ảnh (vision `images` / OCR `imageTexts`) > mô tả (`descriptionText`).

- **`skuSelected`** → mỗi `{group,value}` thành ô (`method: SKU_SELECTED`, tin 0.95, `evidence.text` = `SKU đang chọn: 颜色分类=商务金…`).
  Nhóm dịch key qua từ điển (`颜色分类` → `color`, `度数` → `lensPower`); giá trị có số đo (度/°/mm/V/W…) rút bằng regex, không chờ AI
  (`150度（建议50-54岁）` → `150 độ`); phần chữ Hán còn lại AI dịch như thông số trang. Khi `specsZh` liệt kê nhiều giá trị
  (`金色,银色,黑色`) thì giá trị đang chọn **thắng**. Nhóm lạ (镜片折射率) không bị khớp giả thành ô khác.
- **`packaging`** → ô riêng `packageDimensions` (`17×11×10 cm`), `packageWeight` (`40 g`), `packageVolume` (`1870 cm³`), nguồn `SITE`,
  evidence `包装信息/商品件重尺 (SKU đang chọn)`, cờ `packaging:true`. Đây là **kiện đóng gói**, không phải kích thước sản phẩm:
  KHÔNG đè ô `dimensions` đã có từ trang/ảnh; chỉ khi trang không có kích thước mới điền tạm vào `dimensions` (kèm `packaging:true`
  + `note`). Mô tả ECUS **không dùng** số đo kiện. `sheet.packaging` trả lại bảng kiện đã chuẩn hoá.
- **`images`** → `lib/image-facts.js`: tải ≤ 2 ảnh (role `sku` trước, rồi `main`; timeout 8 s; ≤ 3 MB; chỉ host alicdn /
  aliexpress-media / taobao — host lạ bị bỏ, không tải), gửi **một** lượt Gemini vision (`GEMINI_VISION_MODEL`, mặc định `gemini-3.8-flash`).
  AI liệt kê chữ nhìn thấy + thuộc tính quan sát được trong danh sách ô của nhóm, kèm bằng chứng. Kết quả vào phiếu với
  `source: IMAGE_AI`, `method: VISION`, tin ≤ 0.8, **chỉ điền ô còn thiếu/chưa soát** — không đè ô từ SITE/SKU.
  `images[]` của phiếu ghi `role`, `used`, `vision`, `preview` = chữ AI thấy. `extraction.vision` = `{used, engine, images, facts, llmError?}`.
  Bật/tắt: `HS_SHEET_VISION=1|0` (không đặt → bật khi có `GEMINI_API_KEY`). Không có `images` → không gọi vision. Lỗi ảnh/AI → bỏ qua, phiếu vẫn lập.
  Không có `images` mà `skuSelected[].imageUrl` có → dùng ảnh SKU đó.
- **`descriptionText`** → lọc tất định trước AI: chỉ giữ dòng dạng `nhãn：giá trị` hoặc có số + đơn vị, bỏ trùng, cắt 4.000 ký tự;
  đưa vào AI rút thông số như một nguồn chữ trang (`sourceId: desc`), xếp sau bảng thuộc tính, trước chữ OCR.

**Mức chính sách** (`/api/tax`, cũng có trong phiếu): `policyLines[]` = từng dòng cột chính sách kèm `level`
`BLOCKING` (giấy phép, KTCN/hợp quy, kiểm dịch…) | `NOTICE` (chỉ áp tình huống riêng: hàng đã qua sử dụng,
TNTX, cửa khẩu phụ, phòng vệ thương mại) | `INFO` (không ràng buộc NK thương mại, vd danh mục cư dân biên giới).
**Bật cờ cảnh báo theo `hasActionablePolicy`**, không theo việc cột chính sách có chữ.

### Nhu cầu từ hàng thật — `GET /api/demand` (công khai)

Mỗi lần lập phiếu có mã HS, hs-code-api ghi lại chỗ hổng tri thức của món đó (không định danh):
mã HS chưa đối chiếu danh mục KTCN 2026, nhãn hiệu chưa có trong danh sách theo dõi, chữ gợi hàng nhái,
ô bắt buộc hay thiếu, nhãn thông số tiếng Trung từ điển chưa hiểu. `GET /api/demand?days=90` trả bản gom —
**chỉ mức ưu tiên Cao/Vừa/Thấp, không số lượng, tên hàng, link, shop hay khách** (CEO chốt 05/10/2026).

Ai dùng:
- **oz-wiki-plhq** — `tools/nhu-cau.mjs` kéo `ktcn2026` vào báo cáo điểm mù → việc trích bảng mã HS / hợp quy.
- **hs-code-api** — workflow `demand-issue` hằng ngày cập nhật issue "Nhu cầu từ hàng thật (tự động)" (nhãn hiệu, từ điển, template).

## 6. Tra sản phẩm ví dụ cho mã Loại khác

### `GET /api/products?hs=<code>`

Khi user không chắc mã "Loại khác" có đúng không — show ví dụ thực tế.

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://.../api/products?hs=84137090&limit=5"
```

**Response:**
```json
{
  "found": true,
  "hsCode": "84137090",
  "isLoaiKhac": true,
  "productCount": 10,
  "potential": "saturated",
  "products": [
    "Máy bơm ly tâm đầu gang 1HP",
    "Bơm tưới tiêu trục đứng 2HP inox",
    "Máy bơm nước giếng khoan 0.5HP",
    "Bơm tuần hoàn nước nóng Grundfos UP20-14"
  ]
}
```

**Batch:**
```bash
GET /api/products?hs=84137090,84136090,84138190
```

---

## 7. Tra chú giải / cảnh báo nhầm lẫn

### `GET /api/conflicts?hs=<code>`

Kiểm tra mã HS có dễ nhầm không trước khi chốt.

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://.../api/conflicts?hs=84137090"
```

**Response (nếu có rủi ro):**
```json
{
  "found": true,
  "hsCode": "84137090",
  "riskLevel": "MEDIUM",
  "confusedWith": ["84136090", "84139190"],
  "reasonsVi": ["Bơm gia dụng vs công nghiệp — phân biệt bằng công suất và điện áp"]
}
```

---

## 8. Accuracy & Monitoring

### `GET /api/accuracy`

Xem AI đang chính xác thế nào (từ feedback thực tế của director).

```bash
curl -H "Authorization: Bearer $TOKEN" "https://.../api/accuracy"
```

```json
{
  "totalFeedback": 145,
  "overrides": { "total": 23, "approved": 18, "rejected": 5 },
  "overrideRate": 15.9,
  "estAccuracy": 78.3,
  "topWrongCodes": [
    { "hsCode": "84137090", "count": 3 }
  ]
}
```

### `GET /api/errors`

Lỗi production gần nhất (chỉ admin).

---

## 9. Quy trình tích hợp đề xuất cho ERP

```
Người dùng nhập tên hàng
        ↓
POST /api/suggest { description }
        ↓
  missingFacts có?
  ├─ YES → hỏi user các câu questionVi → gọi lại với facts{}
  └─ NO  → Hiển thị 3 gợi ý (kèm basis, cảnh báo), user chọn + xác nhận
           (degraded=true → đánh dấu "chưa qua AI", bắt buộc chuyên viên duyệt)
        ↓
GET /api/tax?hs=<code>
  ├─ acfta.forOrigin.eligible = false? (VD "0 (-CN)": hàng TQ KHÔNG được ACFTA)
  │     └─ Áp MFN, không dùng C/O mẫu E
  ├─ hasPolicyWarning = true?
  │     └─ Hiển thị banner cảnh báo + warnings[].summary
  │         severity=HIGH → block, yêu cầu upload giấy phép
  └─ Không có policy → tiếp tục bình thường
        ↓
(Khi cần khai báo) POST /api/describe { hsCode, productName, ... }
        ↓
Điền customsDescription vào tờ khai
```

---

## 10. Error Handling

| HTTP Status | Ý nghĩa | Xử lý |
|-------------|---------|-------|
| `200` | OK | Dùng data |
| `400` | Thiếu param | Fix request |
| `401` | Sai/thiếu token | Check env `HS_API_TOKEN` |
| `404` | Mã HS không tồn tại | Báo user mã không hợp lệ |
| `200` + `degraded: true` | AI lỗi/không cấu hình — suggest trả gợi ý theo tìm kiếm, describe trả bản khai dựng từ dữ kiện nhập | Dùng được nhưng bắt buộc người duyệt; gọi lại sau để có kết quả AI |
| `502` / `503` | Lỗi ngoài dự kiến | Retry sau 3s (max 2 lần) |

**Retry pattern cho ERP:**
```javascript
async function suggestWithRetry(description, maxRetries = 2) {
  for (let i = 0; i <= maxRetries; i++) {
    const res = await fetch('/api/suggest', { ... });
    if (res.ok) return res.json();
    if (res.status === 502 && i < maxRetries) {
      await new Promise(r => setTimeout(r, 3000 * (i + 1)));
      continue;
    }
    throw new Error(`Suggest failed: ${res.status}`);
  }
}
```

---

## 11. Caching khuyến nghị phía ERP

| Endpoint | Server cache | ERP nên cache thêm |
|----------|-------------|-------------------|
| `/api/tax` | 24h (CDN) | Session (same PO tab) |
| `/api/products` | 7 ngày | Có thể localStorage 1 ngày |
| `/api/suggest` | 5 min (private) | Không cache — personalized |
| `/api/conflicts` | 24h | Session |
| `/api/accuracy` | Không cache | Không cache |

---

## Env variables cần thiết (server riêng)

```bash
HS_API_TOKEN=<secret>          # Bearer token cho ERP
GEMINI_API_KEY=<key>           # Nên có; thiếu thì suggest/describe dùng chuỗi fallback bên dưới
MINIMAX_API_KEY=<key>          # Fallback LLM (prod đang dùng)
OPENROUTER_API_KEY=<key>       # Fallback LLM khi Gemini lỗi (nên có)
SENTRY_DSN=<dsn>               # Optional error monitoring
HS_PUBLIC_LLM=true             # mặc định true: suggest/describe/classify/match không cần token; false = đóng lại, cần Bearer
```
