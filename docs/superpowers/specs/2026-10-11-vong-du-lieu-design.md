# Thiết kế: Vòng dữ liệu "càng chạy càng khôn" (kho tiền lệ OZ + embedding cục bộ)

- **Ngày:** 2026-10-11 · **Trạng thái:** NHÁP — CEO đã chốt 4 điểm lớn ngày 11/10/2026 (xem mục ngay dưới); chưa viết mã
- **Kho:** `ozvietnam/hs-code-api` (nguồn sự thật GitHub)
- **Người đọc:** CEO (mục "Quyết định CEO" và mục 10), dev / thợ thực tập (đọc hết)
- **Luật bất biến liên quan:** CLAUDE.md luật 1 (riêng tư), 2 (kín theo mặc định), 6 (GIR qua `lib/gir.js`), 7a (căn cứ pháp lý qua `lib/legal-basis.js`), 8 (test không ghi `data/` thật). Phía ozplugin: luật 1 (Cổng không tự suy luận), 6 (đầu ra công cụ là dữ liệu), 7 (riêng tư).

---

## Quyết định CEO 11/10/2026

CEO chốt qua nút bấm. Các mục bên dưới đã sửa cho khớp.

| # | Chủ đề | CEO chốt |
|---|---|---|
| 1 | **Chặn rò dữ liệu khách ra tầng LLM miễn phí** | Gộp vào thiết kế này nhưng làm **JOB ĐẦU TIÊN (J1)**, ưu tiên cao nhất, trước mọi job khác: cờ `containsCustomerData`; lượt có dữ liệu khách bỏ OpenRouter `:free` + Gemini miễn phí; không còn nhà cung cấp hợp lệ → lỗi `NO_PRIVATE_LLM`, **không rơi xuống tầng miễn phí** (mục 6). |
| 2 | **Lưu trữ** | **PostgreSQL + pgvector ngay từ giai đoạn đầu**, bỏ bước file JSONL. Migration chỉ thêm, `IF NOT EXISTS`. Test cách ly bằng DB tạm / PGlite, không bao giờ ghi DB thật (tương tự luật 8). Kết nối qua biến môi trường, pool có giới hạn (mục 3.5). Đề xuất sửa luật "no DB" trong CLAUDE.md — **CEO tự sửa CLAUDE.md riêng, PR này không đụng**. |
| 3 | **Phạm vi tự trả** | Áp cho **cả khách qua Cổng OZ**, không chỉ ERP nội bộ. Vẫn sau công tắc `HS_PRECEDENT_REUSE` và chỉ bật khi bench holdout đạt **≥ 98%** độ chính xác tự trả; điểm cắt cụ thể CEO chọn từ đường cong của job bench (J10) (mục 4.2). |
| 4 | **Dữ liệu ERP** | hs-code-api **KÉO bằng job đêm**. Đội ERP (erp-xnk, nay ở Gitea — PR này không sửa repo đó) dựng một API đọc nội bộ có token (mục 7). |

**Mặc định cho các câu chưa hỏi — CEO đổi được bất cứ lúc nào:**

| Chủ đề | Mặc định |
|---|---|
| Người duyệt mức B | CEO + chuyên viên được CEO chỉ định (danh sách trong env/DB). Cần **2 lượt duyệt** (hai người khác nhau) mới tính cho tự trả. |
| Cloudflare Workers AI dự phòng embedding | **TẮT** đến khi CEO chốt. |
| Hermes (cổng LiteLLM chung) | **Coi như chặn** với lượt có dữ liệu khách đến khi xác minh được nhà cung cấp phía sau. |
| Giữ mô tả nguyên văn (khách đã đồng ý) | **18 tháng**, sau đó xoá nguyên văn, giữ băm. |
| Công bố tiền lệ ra ngoài | **Không** công bố. |

---

## 0. Tóm tắt một phút (cho CEO)

Hôm nay mỗi lần khách hỏi mã HS, máy lại hỏi AI từ đầu, kể cả câu hỏi giống hệt hôm qua (chỉ `/api/suggest` nhớ được 24 giờ, trong RAM, mất khi khởi động lại). AI tốn tiền, chậm (30–280 giây) và có lúc sai.

Thiết kế này thêm một **"sổ tiền lệ đã xác nhận"**: mỗi khi một mã HS được **người thật xác nhận** (tờ khai đã thông quan trên ERP, hoặc chuyên viên/giám đốc duyệt), mặt hàng đó được ghi vào sổ cùng mã và lý do. Lần sau có mặt hàng **giống đủ mức**, máy trả luôn từ sổ, **không gọi AI**; giống vừa phải thì đưa tiền lệ cho AI làm tài liệu tham khảo.

```
  Khách hỏi ──► [Tra sổ tiền lệ] ──giống ≥ ngưỡng & đủ điều kiện──► Trả ngay (không AI, ~0,1 giây, 0 đồng)
                      │
                      └─ giống vừa ──► AI + tiền lệ làm ngữ cảnh ──► Trả (như hôm nay, chính xác hơn)
                      └─ không giống ─► AI như hôm nay
  Kết quả trả ra ──► CHƯA vào sổ. Chỉ vào sổ khi: tờ khai THÔNG QUAN  /  chuyên viên DUYỆT
```

Điều cốt lõi: **AI không bao giờ tự dạy chính nó.** Kết quả AI chưa được người hoặc Hải quan xác nhận thì không vào sổ.

---

## 1. Mục tiêu & chỉ số

| Chỉ số | Định nghĩa | Hiện tại (ước) | Mục tiêu GĐ 2 | Đo bằng |
|---|---|---|---|---|
| **Tỷ lệ trả từ sổ** | % lượt `classify`/`suggest` trả từ kho tiền lệ, không gọi LLM | ~0% (chỉ cache 24h của suggest) | ≥ 30% lượt (ERP + Cổng) sau 3 tháng kể từ khi bật | `nhat_ky_luot.nguon_tra_loi` |
| **Độ chính xác tự trả** | Trong các lượt trả từ sổ, % khớp mã 8 số đúng | — | ≥ 98% trên holdout (CEO chốt 11/10) | bộ đề vàng holdout |
| **Độ chính xác tổng** | Top-1 mã 8 số trên bộ đề vàng holdout | đo ở J2 | không giảm; mục tiêu +5 điểm % | `scripts/` bench |
| **Chi phí LLM/lượt** | Tổng token × đơn giá / số lượt | đo ở J2 từ `usage` | giảm ≥ 30% | `usage` (`lib/usage-context.js`) |
| **Độ trễ** | p50 / p95 | 30–280 s (classify loop) | trả từ sổ: p95 < 1 s | `nhat_ky_luot.do_tre_ms` |

**Ngoài phạm vi:** đổi động cơ phân loại hai vòng (`lib/engine-loop.js`); mở công khai thêm endpoint; Track B (chatbot công khai) — vẫn hoãn.

---

## 2. Luồng dữ liệu

```
 ┌─────────────┐   (1) ghi lượt (ẩn danh)    ┌────────────────┐
 │ Cổng OZ /   │ ──────────────────────────► │ nhat_ky_luot   │
 │ ERP / admin │   ma_luot, cờ đồng ý        └───────┬────────┘
 └─────┬───────┘                                     │ (2) xác nhận (nối theo ma_luot
       │ gọi classify/suggest                        │     hoặc theo băm mô tả)
       ▼                                             ▼
 ┌──────────────────┐  (5) dùng lại      ┌────────────────────┐  (3) chỉ bản đã   ┌──────────────┐
 │ hs-code-api      │ ◄───────────────── │ kho_tien_le (OZ)   │ ◄──────────────── │ xac_nhan     │
 │ tra kho trước →  │                    │ + vector (4)       │   xác nhận A/B    │ A: ERP thông │
 │ LLM sau          │                    └────────────────────┘                   │    quan      │
 └──────────────────┘                                                            │ B: CV/GĐ     │
                                                                                 │    duyệt     │
                                                                                 │ C: khách chọn│
                                                                                 │  (chỉ tín    │
                                                                                 │   hiệu)      │
                                                                                 └──────────────┘
```

### 2.1 Nguồn xác nhận và mức tin cậy

| Mức | Nguồn | Vào `kho_tien_le`? | Được tự trả? | Ghi chú |
|---|---|---|---|---|
| **A** | Tờ khai đã **THÔNG QUAN** từ ERP (mô tả, mã HS 8 số, ngày, số tờ khai băm) | Có | Có (nếu qua điều kiện mục 4) | Cao nhất: Hải quan đã chấp nhận. Mỗi lần thông quan thêm → `so_lan_thong_quan += 1`. |
| **A0** | `data/oz-gold-final.jsonl` hiện có (5.155 mặt hàng, rút từ tờ khai OZ cũ, có `ozCount`) | Có (nạp mồi) | Có, như A | Mô tả đã được LLM chuẩn hoá lúc dựng → ghi `nguon='OZ_GOLD_LICH_SU'`. 15% giữ riêng làm đề thi (`lib/holdout.js`). |
| **B** | Chuyên viên/giám đốc **duyệt** qua `POST /api/feedback` (`status=approved`) | Có | Chỉ khi ≥ 2 lượt duyệt của 2 người khác nhau, hoặc kèm A (mặc định, CEO đổi được) | Người duyệt: CEO + chuyên viên được CEO chỉ định (mặc định, CEO đổi được). |
| **C** | Khách **chọn** một gợi ý trong danh sách | **Không** | Không | Chỉ ghi `xac_nhan` làm tín hiệu thống kê / ưu tiên hàng chờ duyệt. |
| — | Kết quả AI chưa ai xác nhận | **TUYỆT ĐỐI KHÔNG** | — | Chống "AI tự học cái sai của mình". Có test chặn (J7). |

Mâu thuẫn: cùng mặt hàng (tương đồng ≥ ngưỡng tự trả) mà hai bản xác nhận khác mã 8 số → **cả hai bị khoá tự trả** (`trang_thai='XUNG_DOT'`), đẩy vào hàng chờ duyệt. Mức A thắng B khi cùng mô tả chuẩn hoá giống hệt.

---

## 3. Mô hình dữ liệu

Tên bảng tiếng Việt không dấu cho khớp phía ozplugin (`luot_goi`, `dong_y`, `so_cai`).

### 3.1 `nhat_ky_luot` — mỗi lượt gọi một dòng (chỉ ghi thêm)

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `ma_luot` | text, khoá | Từ Cổng OZ (header) hoặc tự sinh UUID nếu không có |
| `nguoi_goi` | text | `cong-oz` / `erp` / `admin` / `cong-khai` (từ `lib/auth.js#serviceCaller`) |
| `endpoint` | text | `classify` / `suggest` / `describe` / `match` |
| `mo_ta_bam` | text | HMAC-SHA256(mô tả chuẩn hoá, khoá bí mật `HS_LOG_HMAC_KEY`). Luôn có. |
| `mo_ta_nguyen_van` | text, **null** | **Chỉ ghi khi `chia_se_du_lieu=true`**; còn lại NULL |
| `chia_se_du_lieu` | bool | Từ cờ đồng ý Cổng gửi kèm; ERP nội bộ = true (dữ liệu của OZ) |
| `ma_hs_tra_ve` | text | Top-1 (8 số) |
| `nguon_tra_loi` | text | `KHO_TIEN_LE` / `LLM` / `LLM_CO_TIEN_LE` / `CACHE` |
| `tien_le_id`, `do_tuong_dong` | text, real | Nếu có dùng kho |
| `do_tre_ms`, `usage` | int, json | `usage` như `lib/usage-context.js` |
| `phien_ban_bieu_thue` | text | id phiên bản đang hiệu lực (`data/versions/index.json`) |
| `tao_luc` | timestamptz | |

Không lưu IP, tên khách, số tờ khai thô. Giữ 18 tháng rồi xoá `mo_ta_nguyen_van` (giữ băm).

### 3.2 `xac_nhan` — mỗi sự kiện xác nhận một dòng (chỉ ghi thêm)

| Cột | Ghi chú |
|---|---|
| `id`, `ma_luot` (null được) | Nối với lượt gốc nếu có |
| `muc` | `A` / `A0` / `B` / `C` |
| `nguon_ref` | A: băm số tờ khai (HMAC, không giữ số thật); B: `feedbackId`; C: `ma_luot` |
| `mo_ta_chuan_hoa`, `mo_ta_bam` | |
| `ma_hs_8` | Phải có trong biểu thuế đang hiệu lực (kiểm như `api/feedback.js` đang làm) |
| `nguoi_xac_nhan` | B: mã người duyệt; A: `ERP` |
| `ngay_thong_quan` | A |
| `tao_luc` | |

### 3.3 `kho_tien_le` — sổ tiền lệ đã xác nhận (một mặt hàng × một mã)

| Cột | Ghi chú |
|---|---|
| `id` | |
| `mo_ta_chuan_hoa` | "tên hàng; chất liệu; công dụng; chức năng" (thứ tự cố định, bỏ model/size/brand) |
| `mo_ta_bam` | Khoá khớp tuyệt đối |
| `ma_hs_8` | |
| `ly_do` | Lý do ngắn (từ người duyệt hoặc phiên bản động cơ lúc xác nhận) |
| `gir_rules_applied` | json — **NGUYÊN VĂN** đầu ra `determineGir()` của `lib/gir.js` chạy **lúc xác nhận** (lưu làm hồ sơ; không tự gõ) |
| `can_cu_phap_ly` | json — **NGUYÊN VĂN** đầu ra `canCuPhapLy()` của `lib/legal-basis.js` lúc xác nhận |
| `so_lan_thong_quan` | Đếm từ mức A (A0 lấy `ozCount`) |
| `so_lan_duyet` | Đếm từ mức B |
| `nguon_cao_nhat` | `A` / `A0` / `B` |
| `phien_ban_bieu_thue` | Phiên bản lúc xác nhận gần nhất |
| `trang_thai` | `HIEU_LUC` / `XUNG_DOT` / `HET_HIEU_LUC` (mã bị đổi/xoá trong biểu thuế) / `THU_HOI` |
| `xac_nhan_ids` | Danh sách `xac_nhan.id` làm căn cứ |
| `cap_nhat_luc` | |

### 3.4 `vector` — embedding của `mo_ta_chuan_hoa`

`tien_le_id`, `model` (`bge-m3`), `phien_ban_model`, `so_chieu` (1024), `vec` (float32 đã chuẩn hoá độ dài = 1).
Đổi model → dựng lại toàn bộ (5k–100k dòng, vài phút–một giờ trên CPU), không trộn vector hai model.

### 3.5 Lưu ở đâu — CEO chốt: PostgreSQL + pgvector ngay từ đầu

Bảng so sánh đã trình CEO (giữ lại để dev hiểu vì sao):

| Tiêu chí | **PostgreSQL tự chủ + pgvector** (đã có trên .120) — **CHỌN** | JSONL + file Float32 nạp RAM — bỏ |
|---|---|---|
| Ghi đồng thời, chỉ ghi thêm | Giao dịch, khoá duy nhất — chắc chắn | Tự lo khoá file; dễ hỏng khi 2 tiến trình ghi |
| Tìm vector | `ORDER BY vec <=> $1` (HNSW), ~ms | Quét tuần tự trong JS; 100k dòng ~30–60 ms, ~400 MB RAM |
| Sao lưu | `pg_dump` vào backup đêm sẵn có | Copy thư mục `HS_DATA_DIR` |
| Báo cáo / nối với `luot_goi` của Cổng | Truy vấn SQL thẳng | Phải viết script |

**Cách làm:**
- **Kết nối:** chỉ qua biến môi trường `HS_DATABASE_URL` (không hardcode IP nội bộ). Một module `lib/db.js` giữ **một pool có giới hạn** (`HS_PG_POOL_MAX`, mặc định 5; `statement_timeout` 5 s cho truy vấn kho) để lượt LLM 300 s không giữ kết nối. Thiếu biến hoặc DB lỗi → **bỏ qua kho, chạy như hôm nay** (không sập; `/api/health` báo `db: {ok:false}`); ghi nhật ký lỗi không chặn phản hồi.
- **Migration:** thư mục `db/migrations/NNNN-<tên>.sql`, **chỉ thêm, `CREATE … IF NOT EXISTS`**, không `DROP`, không sửa cột cũ; chạy bằng `npm run db:migrate` lúc khởi động container. `CREATE EXTENSION IF NOT EXISTS vector`.
- **Test cách ly (như luật 8):** test dùng **PGlite** (Postgres chạy trong tiến trình, có extension `vector`) hoặc DB tạm (container) qua `HS_TEST_DATABASE_URL`. Một tệp `scripts/test-isolate-db.mjs` import ở dòng đầu: tạo DB tạm, chạy migration, và **từ chối chạy** nếu chuỗi kết nối trỏ tới host không phải `localhost`/PGlite (chặn nhầm DB thật, học từ `db-guard` bên erp-xnk).
- **Truy cập:** mọi đọc/ghi kho đi qua `lib/precedent-store.js` (một chỗ), không rải SQL khắp `api/`.
- **Dữ liệu mới từ ERP/feedback không bao giờ vào git.** `oz-gold-final.jsonl` (đã có trong git) vẫn là nguồn mồi, được nạp vào DB.

**Đề xuất sửa CLAUDE.md (CEO tự sửa, PR này không đụng):** thay dòng "Data: JSON files trong `data/` (no DB cho serverless cold start nhanh)" bằng: *"Data: dữ liệu tra cứu tĩnh vẫn là JSON trong `data/`. Dữ liệu ghi lúc chạy của vòng tiền lệ (nhật ký lượt, xác nhận, kho tiền lệ, vector) nằm ở PostgreSQL + pgvector (`HS_DATABASE_URL`). Migration chỉ thêm, `IF NOT EXISTS`; test chỉ chạy trên PGlite/DB tạm, không bao giờ trên DB thật."* Đồng thời bỏ cụm "Gemini Embedding 001 (semantic search)" ở mục Tech stack (code hiện không dùng embedding lúc chạy).

---

## 4. Dùng lại an toàn

### 4.1 Thứ tự trong một lượt `classify` / `suggest`

```
mô tả ──► chuẩn hoá ──► (a) khớp băm tuyệt đối trong kho_tien_le?
                         (b) không thì embedding ──► top-k (k=5) lân cận
          ──► áp ĐIỀU KIỆN TỰ TRẢ ──đạt──► trả từ kho (không LLM)
                                   └─không─► nếu có lân cận ≥ ngưỡng ngữ cảnh:
                                             đưa vào động cơ làm ứng viên + ngữ cảnh
                                             (như cách ozPrecedents đang vào engine-loop.js:194)
                                           ► còn lại: như hôm nay
```

### 4.2 Điều kiện TỰ TRẢ (phải đạt TẤT CẢ)

1. **Độ giống:** cosine ≥ `T_TU_TRA` (khởi điểm **0,92**; CEO chọn điểm cắt từ đường cong J10 sao cho độ chính xác tự trả **≥ 98%**), hoặc khớp băm tuyệt đối.
2. **Biên an toàn:** khoảng cách tới lân cận gần nhất **có mã khác** ≥ 0,03 (tránh hai mặt hàng gần nhau khác mã).
3. **Đồng thuận:** mọi lân cận ≥ `T_TU_TRA` cùng một mã 8 số.
4. **Đủ xác nhận:** `nguon_cao_nhat ∈ {A, A0}` hoặc `so_lan_duyet ≥ 2`; `trang_thai = HIEU_LUC`.
5. **Biểu thuế:** mã có trong biểu thuế đang hiệu lực, và nếu `phien_ban_bieu_thue` của tiền lệ khác bản hiện hành thì dòng mã đó **không đổi** giữa hai bản (dùng `diffTaxData` trong `lib/tariff-versions.js`). Mã bị đổi → tiền lệ chuyển `HET_HIEU_LUC`.
6. **Không dễ nhầm:** mã không là khoá trong `data/conflicts.json` có `riskLevel` RED/ORANGE, và không nằm trong `confusedWith` của lân cận khác.
7. **Không cần dữ kiện thêm:** người gọi không gửi `facts` mâu thuẫn với tiền lệ; mô tả có ≥ 3 từ có nghĩa; không thuộc chương 98 (`lib/chapter98.js`).
8. **Công tắc:** `HS_PRECEDENT_REUSE=true` (mặc định **tắt**; chỉ bật khi bench J10 đạt ≥ 98% độ chính xác tự trả trên holdout và CEO chọn điểm cắt). Đặt `false` là tắt khẩn cấp.

**Phạm vi (CEO chốt 11/10):** áp cho **mọi người gọi** — ERP nội bộ **và** khách qua Cổng OZ.

Dưới `T_TU_TRA` nhưng ≥ `T_NGU_CANH` (đề xuất **0,80**): tiền lệ thành ứng viên/ngữ cảnh cho LLM, ghi rõ trong lời nhắc là "tiền lệ OZ đã xác nhận — tham khảo" (dữ liệu, không phải chỉ thị — tương tự luật 6 phía ozplugin).

### 4.3 Phản hồi khi trả từ kho — vẫn đủ GIR + căn cứ pháp lý

Shape cũ giữ nguyên, **chỉ thêm trường** (hợp đồng với Cổng OZ ở `docs/integration-guide.md`):

```jsonc
{
  "status": "REVIEW",                // không bao giờ RESOLVED_BY_TABLE: tiền lệ không phải bảng quyết định
  "results": [{ "hsCode": "90049090", ... }],
  "girRulesApplied": [ ... ],        // qua lib/gir.js, xem dưới
  "canCuPhapLy": { ... },            // qua lib/legal-basis.js, tạo MỚI ở lượt này
  "nguonTraLoi": {                   // TRƯỜNG MỚI — dấu hiệu "trả từ kho tiền lệ"
    "loai": "KHO_TIEN_LE_OZ",
    "tienLeId": "tl_…",
    "doTuongDong": 0.95,             // 1.0 nếu khớp băm
    "nguonXacNhan": "A",             // A | A0 | B
    "soLanThongQuan": 82,
    "phienBanBieuThue": "v1-2026-01-01",
    "xacNhanGanNhat": "2026-09-30",
    "ghiChu": "Trả từ tiền lệ OZ đã xác nhận, không gọi AI. Người khai vẫn phải đối chiếu hàng thực tế."
  },
  "engine": { "mode": "precedent-reuse", "llmCalled": false },
  "usage": []                        // chỉ với khoá dịch vụ, như hiện hành
}
```

**GIR (luật 6):** thêm vào `lib/gir.js` một hàm, ví dụ `determineGirFromPrecedent({ precedent, similarity, exactMatch })`. Không nơi nào khác tự gắn nhãn `GIR-*`.
- Khớp băm tuyệt đối: dùng lại các mục `gir_rules_applied` đã lưu, **giữ nguyên `basis`** (không bao giờ nâng), thêm `evidence.tienLeId` và `source` ghi "tiền lệ OZ đã xác nhận ngày …".
- Chỉ giống theo vector: mọi mục **hạ xuống `HEURISTIC`** (mặt hàng *giống*, không phải *chính nó*), `evidence: { tienLeId, doTuongDong }`.
- Nếu không có mục nào: không bịa — trả mảng rỗng + `girDisclaimer` như hiện hành.

**Căn cứ pháp lý (luật 7a):** gọi `canCuPhapLy({ status, topHs, description })` **mới** ở lượt này (luật có thể đổi; bản lưu lúc xác nhận chỉ làm hồ sơ). Lượt tự trả **không tra TB-TCHQ** nên **bỏ trống `precedentCount`** → 6.1.d tự ra `CHUA_TRA_CUU_TRONG_LUOT_NAY`. Kho tiền lệ OZ **không phải tài liệu nêu tại Điều 6.1** → không được đếm vào `precedentCount`, không được trình bày như căn cứ pháp lý; nó chỉ nằm ở `nguonTraLoi`. Không thêm điều khoản mới vào `CLAUSES`.

### 4.4 Cache LRU hiện có

`lib/suggest-cache.js` giữ nguyên (khoá theo mô tả + facts + mode). Kho tiền lệ đứng **trước** LLM, sau cache. Không đưa kết quả cache vào kho (cache = kết quả AI chưa xác nhận).

---

## 5. Embedding

| | Lựa chọn | Ghi chú |
|---|---|---|
| **Chính** | **bge-m3** (1024 chiều, đa ngôn ngữ Việt/Trung/Anh) chạy **cục bộ trên CPU máy chủ nhà** .120 (16 lõi, 64 GB) | Phục vụ qua API chuẩn OpenAI `/v1/embeddings`: `llama-server --embedding` (bản GGUF) hoặc text-embeddings-inference bản CPU (có thêm `/rerank` cho `bge-reranker-v2-m3` sau này). Ước tính vài chục ms/mô tả ngắn — **đo thật ở J5/J13**. Dữ liệu không ra khỏi nhà. |
| **Thử** | LM Studio trên Mac 16 GB, cùng API `/v1/embeddings` | Chỉ để CEO/dev thử, không phục vụ thật. |
| **Dự phòng** | Cloudflare Workers AI `@cf/baai/bge-m3` — **TẮT** (mặc định, CEO đổi được) | Cùng model → cùng không gian vector, dùng lẫn được. Cloudflare công bố không dùng dữ liệu khách để huấn luyện — chỉ bật khi CEO xác nhận điều khoản. |
| **CẤM** | Gemini Embedding miễn phí (và mọi tầng miễn phí) cho dữ liệu khách | Tầng miễn phí Google được dùng dữ liệu để huấn luyện. `lib/gemini.js` embedding hiện không dùng lúc chạy (`retrieve-candidates.js:3`) — giữ vậy. |

Cấu hình: `EMBED_BASE_URL`, `EMBED_MODEL=bge-m3`, `EMBED_FALLBACK=none` (mặc định; `cloudflare` chỉ khi CEO chốt). Embedding hỏng → **bỏ qua kho, đi LLM như hôm nay** (không sập, ghi `nguon_tra_loi=LLM`, cảnh báo `/api/health`).

Khác với sổ tay (luật 7b — chỉ cố vấn), kho tiền lệ **có đổi quyết định** (tự trả không qua AI). Vì vậy nó chỉ bật sau khi bench J10 đạt ≥ 98%, đúng tinh thần 7b "nối vào quyết định chỉ sau khi đo bench".

Lưu ý: `retrieve-candidates.js` ghi "KHÔNG dùng dense embeddings" vì embo-01 chậm/vỡ batch khi dùng để **sinh nhóm 4 số trên toàn biểu thuế**. Thiết kế này dùng embedding cho việc khác — **tìm tiền lệ giống** trong kho nhỏ — và có bench so sánh (J10) trước khi bật.

---

## 6. Riêng tư & tuân thủ

1. **Cờ `containsCustomerData`** — **JOB ĐẦU TIÊN (J1), CEO chốt 11/10** — truyền qua `callLLMJson(…, { containsCustomerData: true })` (và `chat()` của `lib/llm.mjs`). Khi bật, router **bỏ qua**: Gemini miễn phí (`GEMINI_FREE_KEYS`), mọi model OpenRouter đuôi `:free` (mặc định hiện tại `google/gemma-3-27b-it:free`), và mọi nhà cung cấp chưa được đánh dấu "không huấn luyện trên dữ liệu" trong danh sách trắng `LLM_NO_TRAIN_PROVIDERS` (mặc định: `minimax`, `gemini` trả phí; **Hermes coi như chặn** đến khi xác minh nhà cung cấp phía sau — mặc định, CEO đổi được). Không còn nhà cung cấp hợp lệ → lỗi `NO_PRIVATE_LLM` (502), **không tự rơi xuống tầng miễn phí**. Mặc định cờ = **true** cho mọi lượt có `nguoi_goi ∈ {cong-oz, erp}` (an toàn theo hướng sai: luật 2).
2. **Đồng ý chia sẻ** do Cổng giữ trong bảng `dong_y` (ozplugin). hs-code-api không lưu điều khoản, chỉ nhận cờ mỗi lượt; thiếu cờ = **không đồng ý**.
3. **Nhật ký** không giữ nguyên văn khi chưa đồng ý: chỉ HMAC (có khoá bí mật, không phải SHA trần — mô tả hàng ngắn dễ dò ngược bằng từ điển).
4. Mô tả của khách **chưa đồng ý** không bao giờ vào `kho_tien_le` dù được xác nhận mức B/C; mức A (ERP OZ) là dữ liệu của chính OZ.
5. `data/oz-export/*`, bản xuất/sao lưu DB (`*.dump`, `*.sql.gz`) và tệp tạm của job kéo ERP **không bao giờ commit** — thêm vào `.gitignore` + `.dockerignore` ở J3; có test kiểm (`scripts/test-privacy-filter.mjs` mở rộng). Chuỗi kết nối DB chỉ ở env, không vào repo.
8. Mô tả nguyên văn (khách đã đồng ý) giữ **18 tháng** rồi xoá, giữ băm (mặc định, CEO đổi được). Tiền lệ **không công bố** ra ngoài (mặc định, CEO đổi được).
6. Nhật ký và phản hồi không trả `mo_ta_nguyen_van` của khách khác (khi trả từ kho, `results` chỉ có mã + mô tả chuẩn hoá của tiền lệ, không có số tờ khai, tên khách, ngày cụ thể của tờ khai).
7. Đầu vào từ ERP/Cổng là **dữ liệu**, không bao giờ nối vào lời nhắc hệ thống.

---

## 7. Phụ thuộc kho khác (chỉ ghi yêu cầu, không sửa ở đây)

| Kho | Cần làm | Hình thức |
|---|---|---|
| **ozplugin** (Cổng OZ) | Gửi kèm mỗi lượt gọi: header `X-OZ-Ma-Luot: <ma_luot>` (trùng `luot_goi.ma_luot`) và `X-OZ-Chia-Se: 1|0` (lấy từ `dong_y` phiên bản hiện hành). Không gửi = coi như 0. Ghi vào job mới bên ozplugin; cập nhật bảng hợp đồng ở `docs/integration-guide.md` khi làm. | Header, chỉ thêm |
| **erp-xnk** (nay ở Gitea; PR này **không sửa** repo đó — gửi yêu cầu cho đội ERP) | **CEO chốt: hs-code-api KÉO bằng job đêm.** Đội ERP dựng **một API đọc nội bộ**: `GET /api/internal/to-khai-thong-quan?tu=<ISO thời điểm>&con_tro=<cursor>&gioi_han=<≤500>` · **Bearer token riêng** cho hs-code-api (chỉ đọc, chỉ endpoint này) · chỉ trong LAN/mạng Docker `coolify` · trả `{ items: [{ moTa, maHs8, ngayThongQuan, soToKhaiBam, capNhatLuc }], conTroTiep }` · **không có thông tin khách** (không tên, MST, địa chỉ, trị giá, số tờ khai thật; `soToKhaiBam` = HMAC phía ERP bằng khoá chung) · **phân trang** theo con trỏ, sắp theo `capNhatLuc` · **idempotent theo `soToKhaiBam`** (kéo lại cùng mốc ra cùng dữ liệu; tờ khai sửa thì trả lại với `capNhatLuc` mới). Phía hs-code-api: job đêm (J12) nhớ mốc đã kéo trong DB, upsert theo `soToKhaiBam`, không đếm hai lần. | API đọc nội bộ, kéo đêm |

---

## 8. Kế hoạch thử trên Mac 16 GB (LM Studio)

Mục tiêu: CEO tự thấy kho tiền lệ có đáng không, **trước** khi đụng máy chủ.

1. LM Studio: tải **bge-m3 GGUF** (Q8 ~600 MB) + **một model chat 7–8B** bản Q4 (~5 GB; ví dụ dòng Qwen 7–8B hoặc Llama 3.x 8B — chọn bản LM Studio có sẵn). Bật server cục bộ (`http://localhost:1234/v1`).
2. Script `scripts/bench-vong-du-lieu.mjs` (J10) chạy kho trên **PGlite** (không cần cài Postgres trên Mac), đọc `.env` cục bộ: `EMBED_BASE_URL=http://localhost:1234/v1`, `LOCAL_CHAT_BASE_URL=…` (tuỳ chọn).
3. Bộ đề: **holdout** của `oz-gold-final.jsonl` (`lib/holdout.js`, 15%, seed 42) với `HS_EVAL_EXCLUDE_HOLDOUT=1` để kho không chứa đáp án ("học thuộc đề") + bộ ERP bench sẵn có (`scripts/build-erp-bench.mjs`) nếu có.
4. So sánh:

| Cấu hình | Mô tả |
|---|---|
| **A** | Hiện tại (`/api/classify` như production; LLM thật — chạy mẫu nhỏ 50–100 câu vì tốn tiền/thời gian) |
| **B1** | Kho tiền lệ + vector, **chỉ tự trả** (ngoài ngưỡng thì tính là "không trả lời") — đo độ chính xác tự trả theo từng ngưỡng 0,80…0,98 |
| **B2** | B1 + ngoài ngưỡng thì đưa tiền lệ làm ngữ cảnh cho LLM |
| **B-local** (tuỳ chọn) | B2 với model chat 7–8B cục bộ, chỉ để tham khảo chất lượng, **không** phải đề xuất triển khai |

5. Đầu ra: bảng `chính xác top-1 / top-3 (8 số)`, `% tự trả`, `độ chính xác trong nhóm tự trả`, `p50/p95 độ trễ`, `chi phí ước tính` (token × đơn giá MiniMax từ `usage`), và **đường cong ngưỡng** để CEO chọn `T_TU_TRA`.

Lưu ý: LM Studio **chưa có endpoint rerank** → bench không đo rerank; muốn thử `bge-reranker-v2-m3` thì dùng text-embeddings-inference (Docker) trên máy chủ ở GĐ sau. Mac 16 GB chạy đồng thời bge-m3 + model 8B Q4 được nhưng chậm — chạy embedding toàn kho trước, lưu file, rồi mới chạy chat.

---

## 9. Chia giai đoạn & job (TDD: test đỏ trước, mỗi job một PR)

Mọi job: test ghi file thì `import './test-isolate-data.mjs'`, test đụng DB thì `import './test-isolate-db.mjs'` ở dòng đầu (luật 8 + quyết định 2); thêm vào `npm test`; không ghi `data/` thật, không nối DB thật.

### GĐ 0 — Chặn rò (ƯU TIÊN SỐ 1, làm trước mọi job khác)
| Job | Việc | Nghiệm thu |
|---|---|---|
| **J1** | Cờ `containsCustomerData` trong `lib/llm-tier.js` + `lib/llm.mjs`; mặc định bật cho `cong-oz`/`erp`; bỏ Gemini miễn phí, model OpenRouter `:free`, Hermes và nhà cung cấp ngoài `LLM_NO_TRAIN_PROVIDERS`; lỗi `NO_PRIVATE_LLM` | Test: cờ bật → không bao giờ gọi `gemini-free`, model `:free`, Hermes; hết nhà cung cấp hợp lệ → `NO_PRIVATE_LLM` (502), không rơi xuống free; cờ tắt → hành vi cũ (`scripts/test-llm-tier.mjs` xanh); `/api/health` báo danh sách nhà cung cấp được nhận dữ liệu khách |

### GĐ 1 — Nền: đo, Postgres + pgvector, embedding
| Job | Việc | Nghiệm thu |
|---|---|---|
| **J2** | `scripts/bench-vong-du-lieu.mjs` cấu hình A (đo nền) | Cùng seed ra cùng tập; số liệu nền ghi vào PR |
| **J3** | `lib/db.js` (pool giới hạn, `HS_DATABASE_URL`), `db/migrations/` + `npm run db:migrate`, `scripts/test-isolate-db.mjs` (PGlite/DB tạm, chặn host lạ) | Test: migration chạy hai lần không lỗi (idempotent); chuỗi kết nối trỏ host ngoài localhost/PGlite → test từ chối chạy; thiếu `HS_DATABASE_URL` → app vẫn chạy, health báo `db.ok=false`; không có `DROP` trong migration (kiểm tự động) |
| **J4** | Migration bảng `nhat_ky_luot`, `xac_nhan`, `kho_tien_le`, `vector` (pgvector, chỉ mục HNSW) + `lib/precedent-store.js` | Test trên PGlite: ghi thêm/đọc; khoá duy nhất (`mo_ta_bam`, `ma_hs_8`); top-k cosine khớp tính tay trên 10 vector |
| **J5** | `lib/embed.js`: client `/v1/embeddings` (LM Studio / llama-server), chuẩn hoá L2, batch, timeout, hỏng → `null`; Cloudflare chỉ khi `EMBED_FALLBACK=cloudflare` | Test với máy chủ giả: 1024 chiều, độ dài 1; lỗi mạng trả null không ném; không bao giờ gọi Gemini; mặc định không gọi Cloudflare |
| **J6** | `scripts/nap-moi-kho-tien-le.mjs`: nạp `oz-gold-final.jsonl` thành mức A0 vào DB (bỏ holdout khi cờ eval) + tính vector | Đủ 5.155 − holdout dòng; chạy lại không nhân đôi |

### GĐ 2 — Xác nhận, bench, dùng lại (sau công tắc)
| Job | Việc | Nghiệm thu |
|---|---|---|
| **J7** | Xác nhận mức B từ feedback `approved`; danh sách người duyệt (CEO + chuyên viên chỉ định); 2 lượt duyệt của 2 người mới tính tự trả | Test: `pending`/`rejected` không vào kho; người ngoài danh sách không tính; 1 lượt duyệt → vào kho nhưng chưa tự trả; **kết quả AI chưa xác nhận không bao giờ vào kho** (test chặn riêng); hai mã khác cùng mô tả → `XUNG_DOT` |
| **J8** | `lib/gir.js#determineGirFromPrecedent` | Khớp băm giữ nguyên basis, không bao giờ nâng; khớp vector → mọi mục `HEURISTIC`; mọi mục có `basis`+`evidence`+`source`; `scripts/test-gir-leak.mjs` xanh |
| **J9** | Ghi `nhat_ky_luot` (HMAC, nguyên văn chỉ khi đồng ý, xoá nguyên văn sau 18 tháng) + đọc header Cổng `X-OZ-Ma-Luot`/`X-OZ-Chia-Se` | Thiếu header chia sẻ → `mo_ta_nguyen_van` null; thiếu khoá HMAC → không ghi và cảnh báo health; DB lỗi → phản hồi vẫn trả bình thường |
| **J10** | Bench B1/B2 trên holdout (PGlite), xuất **đường cong ngưỡng** (độ chính xác tự trả, % tự trả theo từng ngưỡng 0,80…0,98) | Báo cáo trong PR; CEO chọn điểm cắt ≥ 98%; cùng seed ra cùng kết quả |
| **J11** | `lib/precedent-reuse.js`: 8 điều kiện mục 4.2, nối vào `classify`/`suggest` cho mọi người gọi, sau `HS_PRECEDENT_REUSE` | Mỗi điều kiện một ca test đỏ→xanh; tắt cờ → phản hồi y hệt hôm nay (so snapshot); `canCuPhapLy` 6.1.d = `CHUA_TRA_CUU_TRONG_LUOT_NAY`; có `nguonTraLoi`; ngưỡng đọc từ env theo điểm cắt CEO chọn |

### GĐ 3 — Nối ERP & lên máy chủ
| Job | Việc | Nghiệm thu |
|---|---|---|
| **J12** | Job đêm kéo API đọc nội bộ ERP (mục 7), nhớ mốc, upsert mức A | Test với máy chủ ERP giả: phân trang hết; kéo lại cùng mốc không đếm hai lần; mã không có trong biểu thuế → bỏ qua + ghi lỗi; thiếu `soToKhaiBam` → bỏ qua; token sai → dừng, cảnh báo health |
| **J13** | Dựng bge-m3 trên .120 (llama-server hoặc TEI), health báo embedding | Đo p95 embedding thật; health `embedding: {ok, model, p95Ms}` |
| **J14** | Tiền lệ hết hiệu lực khi biểu thuế đổi (hook vào `admin/update`) | Mã bị đổi trong bản biểu thuế mới → `HET_HIEU_LUC`, không còn tự trả |

Bảng theo dõi chỉ số (mục 1) đưa vào `/api/dataset?resource=kpi` (kín, Bearer) cuối GĐ 2.

---

## 10. Việc còn cần CEO

**Đã chốt 11/10/2026:** chặn rò làm trước (J1) · Postgres + pgvector từ đầu · tự trả cho cả khách qua Cổng, chỉ bật khi ≥ 98% · ERP: hs-code-api kéo đêm. Các mặc định (người duyệt, 2 lượt duyệt, Cloudflare tắt, Hermes chặn, 18 tháng, không công bố) — xem bảng đầu tài liệu, CEO đổi được.

**Còn cần CEO:**
1. **Sửa CLAUDE.md** của hs-code-api theo đề xuất ở mục 3.5 (bỏ luật "no DB" cho dữ liệu ghi lúc chạy) — CEO tự sửa, ngoài PR này.
2. **Chọn điểm cắt ngưỡng** từ đường cong J10 (≥ 98%) rồi mới bật `HS_PRECEDENT_REUSE`.
3. **Danh sách chuyên viên** được CEO chỉ định làm người duyệt mức B.
4. **Gửi yêu cầu API đọc nội bộ cho đội ERP** (mục 7) và cấp khoá HMAC chung để băm số tờ khai.
5. Khi muốn: xác minh nhà cung cấp phía sau Hermes; quyết bật Cloudflare dự phòng.

---

## Phụ lục — dữ kiện đã kiểm khi viết

- `lib/retrieve-candidates.js:3` — không dùng dense embedding lúc chạy.
- `lib/suggest-cache.js` — LRU RAM 500 mục / 24 h, chỉ `/api/suggest`; `classify`/`describe` không cache.
- `lib/llm-tier.js` — chuỗi MiniMax → Hermes → OpenRouter → BytePlus → Gemini miễn phí (`GEMINI_FREE_KEYS`) → Gemini trả phí; chưa có giới hạn đồng thời; `lib/llm.mjs` OpenRouter mặc định model `:free`.
- `lib/oz-precedent-search.js` — đã có kho `oz-gold-final.jsonl` (5.155 dòng), tìm theo từ khoá, loại holdout khi `HS_EVAL_EXCLUDE_HOLDOUT=1`; `engine-loop.js:194` đưa kết quả vào ngữ cảnh động cơ.
- `api/feedback.js` + `lib/feedback-store.js` — JSONL qua `dataPath`, có `status` pending/approved/rejected, kiểm `correctedHsCode` có trong biểu thuế.
- `lib/legal-basis.js#canCuPhapLy` — `precedentCount` bỏ trống → 6.1.d `CHUA_TRA_CUU_TRONG_LUOT_NAY`.
- ozplugin spec 2026-10-10: bảng `luot_goi (ma_luot, …)`, `dong_y (tai_khoan_id, phiên bản điều khoản, chia sẻ dữ liệu, lúc)`.
- ADR-025 (erp-xnk): hs-code-api chạy Docker trên .120, ERP gọi được nội bộ qua mạng `coolify`.
