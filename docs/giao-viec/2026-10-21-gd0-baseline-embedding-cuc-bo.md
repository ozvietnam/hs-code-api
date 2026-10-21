# Giao việc: GĐ0 — baseline đo embedding cục bộ offline (CPU/ONNX)

- **Giao:** 2026-10-21. **Người duyệt và gộp:** Claude (phiên quản lý / GĐ dự án). Dev **không tự gộp** vào `main` — mở PR, GĐ soát số rồi mới quyết.
- **Thiết kế gốc:** PR #366 (nhánh `docs/design-chua-biet-loop`, đang draft — **chưa merge nên chưa có trên `main`**), file `docs/design/2026-10-20-vong-lap-chua-biet-va-tang-model-nhanh.md` — **mục 9, GĐ 0**.
- **Roadmap thương mại:** ozvietnam/ozplugin#228 (nâng cấp năng lực phân loại HS cho sản phẩm **ozplugin** — cổng MCP `mcp.uythacnhapkhau.com`, bộ não là chính repo này).
- **Một câu mục tiêu:** đo xem **embedding cục bộ, chạy offline trên CPU/ONNX**, có đủ chính xác + đủ nhanh để thay bước "đoán nhóm" chậm của MiniMax M2.7 hay không. Có số → quyết **GO/NO-GO GĐ1**. **Chưa đụng prod** cho tới khi qua cổng đo.

## Checklist tiến độ (tracker đọc trạng thái ở đây)

- [ ] **J1** — Harness embedding CPU/ONNX chạy được + có số đo ms/câu
- [ ] **J2** — Index kho nhãn nhóm 4/6 số (trừ holdout) dựng xong, ghi kích thước + thời gian
- [ ] **J3** — Hàm retrieval + rerank trả ứng viên nhóm 4 và 6 số + độ tin
- [ ] **J4** — Đo trên holdout (server 88 luồng): bảng top-1/top-3 @4&6 số + độ trễ p50/p95/món
- [ ] **J5** — Báo cáo go/no-go (so M2.7 + ngưỡng độ trễ) → quyết GĐ1

> Mỗi job chỉ tick khi **acceptance của chính nó** đạt (xem từng J ở mục 2). J5 chỉ tick sau khi J1–J4 xong.

## 0. Mục tiêu GĐ0 + cổng go/no-go tổng

GĐ0 là bước **rẻ nhất, làm TRƯỚC khi cam kết train** gì cả. Toàn bộ chạy **offline trên `lib/holdout.js`** (tập giữ riêng 15%, seed 42), **0 data khách ra ngoài**, **0 thay đổi prod**.

**Cổng go/no-go tổng (quyết định cả giai đoạn):**

> **GO GĐ1** khi — và **chỉ khi** — **cả hai** điều kiện sau cùng đạt trên tập giữ riêng:
> 1. **top-1 ở nhóm 4 số ≥ M2.7 = 64,9%**. Mốc M2.7 lấy từ `data/accuracy-latest.json` (n=57, 2026-07-07: chương 73,7% · **nhóm-4 64,9%** · 6 số 40,4% · 8 số 24,6% top-1; keyword thô 1,75%).
> 2. **độ trễ < 1 giây/món**.
>
> Không đạt → **giữ M2.7**, xem lại hướng (đổi model / đổi rerank / hoặc dừng nhánh embedding). Chỉ cần **một** điều kiện trượt là NO-GO.

**Phạm vi đo:** chỉ nhắm **nhóm 4 và 6 số**. Mã 8 số có đuôi dài (median ~2 ví dụ/mã) → để **sổ tay** (tất định, có trích luật) lo, **KHÔNG** ép embedding gánh 8 số ở giai đoạn này.

## 1. Môi trường chạy (CEO chốt phần cứng 2026-10-21)

- **Máy chủ nhà:** **88 luồng CPU · 256 GB RAM · 4 TB đĩa · KHÔNG GPU**. Máy dev: **Mac M4 36 GB**.
- ⇒ Embedding chạy **CPU/ONNX**: `onnxruntime-node` hoặc `transformers.js` (backend CPU). **Không** phụ thuộc CUDA/GPU.
- ⇒ **Local-first khả thi trọn vẹn:** index + truy hồi chạy gọn trong RAM/đĩa của server, **data khách không ra ngoài** (giải trọn ràng buộc `lib/llm-privacy.js`).
- **Offline tuyệt đối:** KHÔNG gọi API embedding từ xa (dense embedding từng bị bỏ vì API Gemini xa chậm — đây là lần đầu thử embedding **cục bộ**). GĐ0 đo đúng kịch bản chạy tại máy.
- Code khởi đầu tham khảo: **MicroHS** (HF Space, MIT — `multilingual-e5-small` + k-NN, có vi/zh). Dùng để xác nhận hướng embedding đa ngữ cục bộ, **KHÔNG** drop-in cho VN 8 số.

## 2. Jobs cho dev

> Mỗi job ghi rõ **Việc · Acceptance (nghiệm thu) · Cách đo**. Làm tuần tự J1→J5. **J4 bắt buộc chạy trên server 88 luồng** (không lấy số tốc độ từ máy dev Mac làm cổng).

### J1 — Harness embedding CPU/ONNX

- **Việc:** chọn model embedding đa ngữ — ứng viên **BGE-M3** hoặc **`AITeamVN/Vietnamese_Embedding`** — dựng harness nạp model qua `onnxruntime-node`/`transformers.js` (CPU), embed một tập câu test (mô tả hàng vi/zh). Ghi lại model + phiên bản + số luồng CPU đã cấu hình.
- **Acceptance:** embed chạy được end-to-end **trên CPU** (không GPU); in ra vector đúng số chiều; có **số đo tốc độ ms/câu** (trung bình + p95), kèm số luồng CPU.
- **Cách đo:** chạy N câu test (vd 200 câu), tổng thời gian ÷ N → ms/câu; thử 1 luồng vs nhiều luồng để biết điểm bão hoà throughput. Ghi vào báo cáo J1.

### J2 — Index kho nhãn (nhóm 4/6 số)

- **Việc:** embed tập nhãn (mô tả nhóm 4 số và 6 số) lấy từ `data/oz-gold-final.jsonl` **(trừ holdout)** — có thể bổ sung `data/precedents.json` làm precedents — rồi dựng **index vector lưu ra đĩa** (flat hoặc HNSW, miễn tái nạp được).
- **Acceptance:** index dựng xong, **tái nạp được**; ghi **số nhãn đã index · kích thước file index trên đĩa · thời gian dựng** (trên server 88 luồng).
- **Cách đo:** dùng `lib/holdout.js` để **loại đúng 15% giữ riêng** khỏi tập index (chống rò rỉ); đếm số vector; `stat` kích thước file; bấm giờ dựng.

### J3 — Retrieval + rerank

- **Việc:** viết hàm nhận **mô tả hàng (chữ)** → trả **top-k ứng viên nhóm 4 số và 6 số** kèm **độ tin** (điểm tương đồng đã chuẩn hoá). Thêm bước **rerank** trên top-k thô (cross-encoder nhẹ, hoặc rerank theo trùng từ khoá với `lib/search-utils.js`) nếu cải thiện kết quả.
- **Acceptance:** trả **ứng viên hợp lý** trên vài ví dụ thật (mắt thường thấy nhóm đúng nằm trong top-k); mỗi ứng viên có trường độ tin.
- **Cách đo:** chạy 5–10 ví dụ mô tả quen thuộc, in top-5 nhóm 4 & 6 số + điểm; GĐ soát định tính "có lý" trước khi sang J4.

### J4 — Đo trên holdout (CHẠY TRÊN SERVER 88 LUỒNG)

- **Việc:** chạy toàn bộ **tập holdout 15% (seed 42)** qua J3 → ghi bảng số đo đầy đủ.
- **Acceptance:** **bảng số đo đầy đủ** gồm: **top-1 và top-3 ở cả 4 số và 6 số**; **độ trễ p50/p95 mỗi món** (đo **trên server 88 luồng**, không phải Mac). Để cột cạnh M2.7 (64,9%@4số) và keyword (1,75%).
- **Cách đo:** `lib/holdout.js` cấp đúng tập giữ riêng; mỗi món tính nhóm dự đoán vs nhãn thật (khớp 4 số, 6 số); gom top-1/top-3; đo wall-clock từng món → p50/p95. Xuất 1 file JSON kết quả + 1 bảng markdown.

### J5 — Báo cáo go/no-go

- **Việc:** so số đo J4 với **cổng go/no-go tổng** (mục 0) → kết luận **GO / NO-GO GĐ1**.
- **Acceptance:** báo cáo nêu rõ: (a) top-1@4số đo được vs 64,9%; (b) độ trễ/món vs ngưỡng 1s; (c) **quyết GO hay NO-GO** + lý do; (d) nếu NO-GO: đề xuất bước kế (đổi model / đổi rerank / dừng nhánh).
- **Cách đo:** đối chiếu **cả hai** điều kiện cổng — cả hai đạt mới GO.

## 3. Ràng buộc bất biến (không được vi phạm)

1. **Giữ `nguon`/`trich` ở mọi đáp án.** Embedding chỉ ra **ứng viên nhóm**; chốt mã vẫn phải đi qua sổ tay (tất định, có trích luật). Không để embedding "nuốt" trích dẫn pháp lý.
2. **Model = TRỢ LÝ DỮ KIỆN, KHÔNG đoán thẳng mã.** Tầng 1 chỉ gợi **nhóm 4–6 số ứng viên + độ tin**, không xuất mã 8 số như kết luận cuối.
3. **Không đụng prod** cho tới khi qua cổng đo. Mọi thứ offline trên holdout; **0 data khách ra ngoài**.
4. **Loại đúng holdout khỏi tập index** (seed 42) — không đo trên dữ liệu đã thấy lúc index (chống rò rỉ, để số mới thật).
5. Đo tốc độ **trên server 88 luồng**, không lấy số từ Mac dev làm cổng go/no-go.

## 4. Liên quan

- **#366** — thiết kế kiến trúc đầy đủ (vòng lặp lấp CHƯA BIẾT + bộ nhớ đặc điểm + tầng model nhanh); GĐ0 là **mục 9** của doc đó.
- **ozvietnam/ozplugin#228** — roadmap thương mại nâng cấp năng lực phân loại HS cho sản phẩm ozplugin.
- **#365** — mở rộng sổ tay chú giải (chạy song song GĐ0; sổ tay lo phần chốt 8 số tất định).
