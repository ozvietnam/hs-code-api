# Thiết kế: Vòng lặp "lấp CHƯA BIẾT" + Bộ nhớ đặc điểm sản phẩm + Tầng model nhanh

**Ngày:** 2026-10-20 · **Trạng thái:** 📝 Nháp để CEO chốt trước khi code · **Liên quan:** #365 (mở rộng sổ tay), `docs/backlog/08-so-tay-chu-giai.md`, brief nghiên cứu model nhanh (2026-10-20)

## Tóm tắt điều hành (đọc 1 phút)

Nút thắt hiện tại KHÔNG ở tra dữ liệu (<12s) mà ở model MiniMax M2.7 "ngồi nghĩ" 2–4 phút/mặt hàng. Nhưng phần "nghĩ" đó **phần lớn không cần**: khi đã đủ dữ kiện sản phẩm, chốt mã (kể cả 8 số) hầu hết là **tất định** qua tầng "sổ tay" có sẵn (điều kiện số + trích luật, không AI). Việc khó thật chỉ còn **(a) hiểu sản phẩm** và **(b) biết đặc điểm nào biểu thuế dùng để chia mã** — mà (b) sổ tay đã mã hoá sẵn.

Thiết kế này đề xuất:
1. **Vòng lặp lấp CHƯA BIẾT:** sổ tay chỉ ra đúng dữ kiện còn thiếu → hệ thống tự đi tìm (ưu tiên) hoặc hỏi khách → xác minh → **ghi lại để lần sau khỏi tìm**.
2. **Bộ nhớ đặc điểm sản phẩm:** kho "đáp án đã giải" (đặc điểm quyết định + bản chất, có nguồn), tách khỏi sổ tay (tiêu chí luật). Phân loại = khớp 2 kho → tất định.
3. **Tầng model nhanh (cục bộ):** rút đặc điểm + gợi nhóm 4–6 số + chỉ ra dữ kiện thiếu — thay bước "đoán nhóm" chậm của M2.7; model suy luận chỉ dùng cho ca mơ hồ/thiếu sổ tay.

Nguyên tắc sống còn: **model nhỏ là TRỢ LÝ DỮ KIỆN, không đoán thẳng mã** (đoán mã bỏ qua sổ tay → mất trích dẫn pháp lý). Ưu tiên chạy **cục bộ** (giải trọn ràng buộc bảo mật dữ liệu khách).

---

## 1. Nguyên lý (vì sao thiết kế thế này)

- Ta chỉ chốt được mã HS 100% tự tin khi **hiểu rõ sản phẩm**. Hiểu rồi thì áp mã nhẹ nhàng.
- Biểu thuế chia mã dựa trên **đặc điểm phân biệt** cụ thể (chất liệu, công suất, có phải bộ phận, ngưỡng kích thước…). Tầng **sổ tay** (`data/so-tay/<nhóm4>.json`) đã mã hoá đúng các đặc điểm này — có cấu trúc `{fact, op, value, đơn_vị}` + câu trích luật nguyên văn.
- Hàm `chotDong8()` cùng bộ chấm điều kiện (`lib/so-tay-gates.js`) chấm mỗi đặc điểm **tất định (không AI)** ra **THOẢ / TRÁI / CHƯA BIẾT** và sinh thẳng `missingFacts`.
- ⇒ **"Điểm tự tin thấp" = đang ở trạng thái CHƯA BIẾT** (thiếu đúng dữ kiện sổ tay đòi). Sửa điểm thấp KHÔNG phải bằng model đoán giỏi hơn, mà bằng **lấp đúng khoảng trống dữ kiện**.
- ⇒ "Suy nghĩ sâu" dời khỏi khâu áp mã, về **(a) hiểu sản phẩm** + **(b) biết đặc điểm quyết định** (sổ tay lo (b)).

## 2. Hiện trạng (số đo thật, đã kiểm trong repo)

- Độ chính xác máy mốc 07/07 (`data/accuracy-latest.json`, n=57 — bộ đo GĐ0 so với): **chương 73.7% · nhóm-4 64.9% · 6 số 40.4% · 8 số 24.6%** top-1; keyword thô 1.75%.
- Số đo mới hơn (13–15/10, sau khi bật sổ tay `gates`): 80 mẫu vàng Đ8 60.1–63.8%; bench 20 nhóm #253 Đ8 57.3%. Nút thắt hiện tại là **tốc độ model (llmMs 109–211 s, nghiệm thu #325)** + độ phủ sổ tay, không phải Đ8 = 24.6%.
- Sổ tay: **~174/1.269 nhóm** đã dựng, phủ ~90% tờ khai thật; prod đang bật `gates` (chưa `full`).
- Retrieval hiện **chỉ dùng từ khoá** (`lib/search-utils.js`); dense embedding từng bị bỏ vì API Gemini từ xa chậm — **chưa từng thử embedding cục bộ**.
- Model: MiniMax **M2.7-highspeed** không tắt được "suy nghĩ" (30–120s/lượt × 2–3 lượt). Repo **đã nối sẵn** thinking-off (MiniMax-M3) + cấu hình theo bước `LLM_STEP_*` → quick win chỉ cần đổi env.
- Mảnh ghép sẵn có để tái dùng: `missingFacts` (sổ tay chỉ thiếu gì), `micLookup` (`lib/mic-lookup.js`, đã tự quét made-in-china), `data/attributes.json` (sổ đăng ký đặc điểm chuẩn), `ProductAttribute`/`writeAttribute`/`selectBestValue` (ERP — lưu đặc điểm có bằng chứng), `lib/holdout.js` (tập giữ riêng 15%, seed 42).

## 3. Kiến trúc đích (phân tầng)

```
Hồ sơ khách (tên vi/en/zh, mô tả, ảnh→chữ, link nguồn)
        │
 Tầng 0  HIỂU SẢN PHẨM — suy luận từ đầu vào, CHỈ nhận cái có câu trích gốc (chống bịa)
        │   → product facts + bản chất
 Tầng 1  NHANH (cục bộ) — embedding vi/zh + rerank trên kho nhãn → nhóm 4–6 số ứng viên + độ tin
        │   ↕ Bộ nhớ đặc điểm (mục 5): tra trước — đã biết thì khỏi tìm
 Tầng 2  SỔ TAY (tất định) — chấm điều kiện → chốt dòng 8 số, hoặc trả CHƯA BIẾT + missingFacts
        │
     ┌──┴── CHƯA BIẾT? ──┐
     không               có → VÒNG LẶP LẤP CHƯA BIẾT (mục 4)
     │                         tự tìm (micLookup mở rộng) → hỏi khách → xác minh → GHI LẠI
     ▼                         │
 CHỐT (có trích luật)     còn mơ hồ / thiếu sổ tay / tranh chấp GIR
                               ▼
 Tầng 3  MODEL SUY LUẬN (M2.7 / M3.1 / fast-host) — CHỈ cho ca khó, không cho mọi đơn
```

## 4. Vòng lặp lấp CHƯA BIẾT (chi tiết — trả lời 5 câu CEO)

Khi tầng 2 báo một đặc điểm là CHƯA BIẾT:

1. **Hỏi khách hay tự tìm? → định tuyến theo LOẠI dữ kiện.**
   - Đặc điểm *khách quan của hàng* (chất liệu, công suất, kích thước, thông số trang bán) → **tự tìm TRƯỚC** (mở rộng `micLookup` quét lại link 1688/made-in-china đã có).
   - Dữ kiện *chỉ khách biết* (mục đích dùng, biến thể, lẻ/bộ, giấy phép đầu cuối) → **hỏi khách** (`missingFacts` đã sinh câu hỏi đúng chỗ).
   - Luật: tự tìm trước, hỏi sau; hỏi khi tự tìm thất bại/mâu thuẫn. Có **trần chi phí + thời gian** cho tự tìm.
2. **Suy luận từ đầu vào:** làm mạnh ở Tầng 0, nhưng **chỉ nhận suy luận có câu trích gốc**; AI "đoán" không nguồn → coi là CHƯA BIẾT (không phải "đã biết").
3. **Tìm mở rộng hay đúng 1 dữ kiện? → 2 chế độ:**
   - Đã khoanh nhóm ứng viên → sổ tay chỉ đích danh đặc điểm quyết định → **tìm đúng 1 dữ kiện** (nhanh, rẻ, chuẩn).
   - Chưa rõ bản chất hàng → **tìm mở rộng để hiểu sản phẩm** → khoanh nhóm → quay lại tìm đúng 1 điểm.
4. **Tái bổ sung vào data:** tìm được + xác minh → **ghi vào Bộ nhớ đặc điểm** (mục 5), kèm nguồn gốc. Lần sau CHƯA BIẾT → THOẢ/TRÁI ngay, khỏi tìm lại.
5. **Ghi loại dữ liệu gì:** ghi **ĐÁP ÁN QUYẾT ĐỊNH (đặc điểm sổ tay hỏi, đã giải) + BẢN CHẤT sản phẩm**, KHÔNG đổ thông số thô. Thông số thô giữ làm *bằng chứng nguồn (link)*; data nuôi phân loại là đặc điểm đã chắt.

## 5. Schema Bộ nhớ đặc điểm sản phẩm

Hai tầng bộ nhớ, tách khỏi sổ tay (sổ tay = tiêu chí LUẬT "hỏi gì"; bộ nhớ = đáp án "đã biết gì"):

- **(i) Cache theo SẢN PHẨM** — khoá: SKU nhà cung cấp / model / link nguồn 1688. Lần nhập lại cùng hàng → dùng lại ngay.
- **(ii) Tri thức theo LỚP** — khoá: nhóm/loại hàng (vd "tai nghe TWS → bản chất nhóm 8518"). Đúng cho cả một lớp → đẩy dần về phía sổ tay / một tầng học.

Mỗi bản ghi đặc điểm (mô phỏng `ProductAttribute` + `attributes.json` đã có):
```jsonc
{
  "scope": "sku|model|lop",            // phạm vi đúng của đặc điểm
  "key": "<skuId|model|hs4|slug-lop>",
  "fact": "chat_lieu|cong_suat|...",   // canonical theo attributes.json
  "value": "...", "op": "=|<=|...",     // đáp án đã giải (khớp dạng điều kiện sổ tay)
  "banChat": "…",                       // bản chất sản phẩm (câu ngắn), chỉ ở bản ghi lớp/sku chính
  "evidence": { "source": "made-in-china|khach-khai|TB-TCHQ|…", "trich": "câu nguyên văn", "url": "…" },
  "doTin": 0.0,                          // độ tin
  "asOf": "2026-10-20",                 // ngày — để hết hạn / re-verify
  "verifiedBy": "auto|nguoi"
}
```
Nguyên tắc: **bắt buộc có `evidence` + `asOf`** (y kỷ luật `nguon`/`trich` của sổ tay) → giải trình được, re-verify/hết hạn được. **Không** lưu marketing/thông số vô quan.

## 6. Chỗ nối vào engine (điểm chạm, mức file)

- `api/classify.js` / `lib/engine-loop.js`: sau `gather()`, chèn **Tầng 1 (nhanh)** trước khi gọi LLM "đoán nhóm"; tra **Bộ nhớ đặc điểm** để biến CHƯA BIẾT→đã biết sớm.
- `lib/so-tay-gates.js` (`chotDong8`): khi trả CHƯA BIẾT/`missingFacts` → phát sự kiện vào **vòng lặp lấp** (mục 4) thay vì chỉ hỏi.
- `lib/mic-lookup.js`: mở rộng để **tìm đúng 1 dữ kiện** theo yêu cầu của sổ tay (không chỉ quét chung).
- ERP (`erp-xnk`): `ProductAttribute` + `selectBestValue` = nơi ghi/đọc Bộ nhớ đặc điểm theo SKU; hỏi khách qua luồng `missingFacts` sẵn có. (Giữ đúng ranh giới: engine không đọc DB khách; ERP truyền đặc điểm vào payload — theo chuẩn giỏ hàng.)

## 7. Bối cảnh model mã nguồn mở (đã tra lại 2026-10-20 — sửa chỗ brief ghi "không có")

| Dự án | Bản chất | Dùng được gì cho OZ | Hạn chế |
|---|---|---|---|
| **MicroHS** (HF model [`Mead0w1ark/multilingual-e5-small-hs-codes`](https://huggingface.co/Mead0w1ark/multilingual-e5-small-hs-codes), MIT) | embedding `multilingual-e5-small` + k-NN, 6 số, **có vi/zh** | **Tham khảo + khởi đầu Tầng 1** (xác nhận hướng embedding đa ngữ) | data synthetic, chưa kiểm tờ khai thật; 6 số |
| **ATLAS** (`flexifyai/atlas-llama3.3-70b-hts-classification`) | LLaMA-3.3-70B fine-tune HTS/HS, tự host | mốc tham chiếu (6 số ~57.5%); chứng minh fine-tune khả thi | **HTS Mỹ, tiếng Anh, 70B nặng**, license chưa rõ |
| **HSGraphAgent** (ACL 2026) | LLM ép sinh theo đường cây hợp lệ | **ý tưởng chống mã bịa** (đúng ca malt gặp ở test) | chưa rõ có code; nghiên cứu |
| **HS4** (GitHub, TF-IDF+SVM) | phân loại 4 số + top-3 | baseline nhẹ để so | 4 số, US CROSS |
| **KoELECTRA** (Korea Customs 2021) | top-3 95.5% / 265 phân nhóm | bằng chứng hướng encoder khả thi | Hàn, không repo công khai |

**Kết luận:** không model nào drop-in cho VN 8 số, nhưng (a) MicroHS xác nhận hướng embedding đa ngữ cục bộ, MIT, học được; (b) HSGraphAgent cho cơ chế **constrained decoding** chống mã không tồn tại; (c) ATLAS là mốc fine-tune. **Vai của chúng = trợ lý dữ kiện / khởi đầu Tầng 1, KHÔNG thay sổ tay.**

## 8. Bảo mật & ràng buộc bất biến

- **Ưu tiên cục bộ:** model chạy trên máy chủ OZ → data khách không ra ngoài (giải trọn ràng buộc `lib/llm-privacy.js`).
- Nếu dùng fast-host (Groq/Cerebras/Fireworks…): cần DPA + thêm vào `LLM_NO_TRAIN_PROVIDERS` allowlist trước. SambaNova điều khoản chưa rõ → chưa dùng cho data khách.
- Mọi đặc điểm/đáp án ghi lại phải có **nguồn + câu trích** (giữ năng lực giải trình pháp lý).

---

## 9. KẾ HOẠCH TỪNG BƯỚC (offline trước, không đụng prod cho tới khi có số)

> Mỗi giai đoạn có **cổng đo + quyết định go/no-go**. Tất cả giai đoạn 0 chạy **offline trên `lib/holdout.js`**, **0 data khách ra ngoài**, **0 thay đổi prod**.

### GĐ 0 — Baseline đo (rẻ nhất, làm TRƯỚC khi cam kết train) · ~1–2 tuần
- **Việc:** dựng Tầng 1 thử: embedding tiếng Việt cục bộ (BGE-M3 / `AITeamVN/Vietnamese_Embedding`, chạy ONNX/transformers.js trên máy chủ) index kho nhãn (`oz-gold`, precedents) → truy hồi → rerank → gom ra **nhóm 4 và 6 số** + độ tin. Tham khảo code MicroHS.
- **Đo (trên holdout 15%, seed 42):** top-1/top-3 ở 4 số và 6 số; độ trễ/món; so với M2.7 (64.9%@4số) và keyword (1.75%).
- **Đạt:** top-1@4số ≥ M2.7 **và** độ trễ < 1s/món → GO GĐ1. Không đạt → giữ M2.7, xem lại.
- **Rủi ro:** đuôi dài ở 8 số (median 2 ví dụ/mã) → **chỉ nhắm 4–6 số ở tầng này**, 8 số để sổ tay.

### GĐ 1 — Thay bước "đoán nhóm" + quick win tốc độ · ~1 tuần (chỉ khi GĐ0 đạt)
- Nối Tầng 1 vào `engine-loop.js` làm nguồn **ứng viên nhóm** (thay/bổ sung bước LLM đoán nhóm).
- Quick win song song: bật thinking-off cho các bước đơn giản qua `LLM_STEP_*` (đo `#193`-style trước khi bật prod).
- **Đo:** độ chính xác không giảm, độ trễ giảm mạnh. Bật sau cổng đo.

### GĐ 2 — Bộ nhớ đặc điểm + tự tìm 1 dữ kiện · ~1–2 tuần
- Dựng schema mục 5 (tái dùng `ProductAttribute`/`attributes.json`); đọc trước khi tìm, ghi sau khi tìm.
- Mở rộng `micLookup` để **tìm đúng dữ kiện** sổ tay đòi (`missingFacts`).
- **Đo:** tỉ lệ CHƯA BIẾT tự lấp được (không cần hỏi khách); tỉ lệ tái dùng cache lần nhập lại.

### GĐ 3 — Mở rộng sổ tay (song song, liên tục) + chống mã bịa
- Đẩy #365 (long-tail sổ tay theo `so-tay-lo.csv`) — có thể dùng AI **trợ giúp soạn** (người/máy kiểm trích dẫn).
- Thêm **constrained decoding** (ý HSGraphAgent): model chỉ được xuất mã tồn tại trong cây → chặn ca "mã không có trong biểu thuế" (gặp ở test malt).
- **Đo:** % tờ khai được sổ tay phủ; số ca NEEDS_EXPERT do mã bịa → 0.

### GĐ 4 — Vòng lặp đầy đủ + định tuyến theo độ tin
- Ráp cả vòng (mục 3–4): định tuyến confidence (cao → chốt; vừa → hỏi/tìm; thấp/mơ hồ → model suy luận).
- Model suy luận (M2.7 / M3.1 / fast-host đã vào allowlist) **chỉ cho ca khó**.
- **Đo:** % đơn chốt không cần model suy luận; độ trễ p50/p95; độ chính xác tổng.

### Xuyên suốt
- Không đổi prod khi chưa qua cổng đo. Giữ `nguon`/`trich` ở mọi đáp án. Ưu tiên cục bộ; fast-host chỉ sau DPA + allowlist.

## 10. Câu hỏi mở (cần CEO/kỹ thuật chốt)
- Máy chủ Coolify có GPU không, hay chạy embedding trên CPU (ONNX)? → ảnh hưởng chọn model Tầng 1.
- Bộ nhớ đặc điểm đặt ở ERP (`ProductAttribute`) hay DB riêng của engine? (đề xuất: ERP giữ per-SKU, engine giữ per-lớp).
- Ngưỡng độ tin để auto-chốt vs hỏi khách — chốt trên dữ liệu thật ở GĐ4.
