# 11 — "Anh em của Jev": bản đồ hệ sinh thái + 3 đường cho nhà mình (nghiên cứu mở rộng 14/10/2026)

> Tiếp nối `10-jev-system-one.md` theo yêu cầu CEO: "nghiên cứu sâu hơn về jev và anh em của nó…
> cài thẳng lên server nhà, hoặc huấn luyện lại, hoặc dùng lại mô hình sau training của đội khác".
> **Mọi số trong bản này lấy từ nguồn gốc**: JevBench v1.4.2.2 (bản tổng hợp độc lập
> `freezetheflame/jev-ecosystem-research` — đọc từ JSON gốc, không qua bài viết tay), lab đo độc lập
> `yibie/laya-jev-lab` (Mac M4 Max, MLX — có script + raw output), model card Hugging Face. Chưa thử nghiệm gì.

## 0. TL;DR cho CEO

1. **"Anh em của Jev" là một hệ sinh thái thật**: 81 hệ Jev-mở vào bảng đo độc lập JevBench, 59 bản
   **thực sự đã train lại**; GitHub có 13.000+ repo liên quan. Đa số đứng trên Qwen3.5. Chi phí train
   đã rẻ: **$17 / 25 phút** (Tev1, Together) → $1.200 (Imajev-4B).
2. **Cảnh báo lớn nhất — "sập trần khi đề kín"**: trên tập đề công khai, Imajev-4B (67,37) và Jev gốc
   (63,29) so kè; nhưng chuyển sang tập **kín** (baseline ngẫu nhiên 29,3%): Imajev-4B **37,0%**, Jev gốc
   **36,7%**; chỉ GPT-6 Luna giữ 95,5%. Kết luận của bản tổng hợp: **Jev-class phá giá thành quyết định,
   KHÔNG phá trần năng lực**. → Dùng nó làm *tầng quyết định nhanh/rẻ trong không gian mình đã khoanh*
   (candidate pool của mình, câu hỏi nguyên tử), **không thay bộ não sâu cho ca khó**.
3. **Đường sáng nhất cho nhà mình: Laya** — bản mã nguồn mở đúng giao thức Jev:
   - `convaiinnovations/laya-multilingual` (Hugging Face): **mmBERT 322M, ~647MB, 100+ ngôn ngữ**
     (có tiếng Việt + tiếng Trung), **giấy phép Apache 2.0** (dùng thương mại được), chạy **CPU** được.
   - **Server tương thích Jev**: `exfly/laya-jev-compatible-server` — `POST /v1/systemone` chuẩn
     typesafe-sdk, `LAYA_DEVICE=cpu` mặc định → **cài thẳng lên .120, code phía mình đổi mỗi `base_url`**.
   - **Dữ liệu khách không rời máy nhà** → không vướng danh sách trắng nhà cung cấp (#237 J1).
   - Hạn chế phải nhớ: **ngữ cảnh 1.024 token** (cửa sổ 8k) → phải **nén state**; bản phát hành
     **chưa hiệu chuẩn** → phải tự temperature-calibration trên dữ liệu mình; lab độc lập đo được ca
     "tự tin mà sai" → ngưỡng phải tune theo từng loại câu hỏi, không bê nguyên từ Jev.
4. **Đường train lại (có công thức học thuật đầy đủ)**: `ZimmyGao/openjev-rlcd` (arXiv 2609.38850) —
   RLCD hai chặng "calibrate → reinforce" trên **Qwen3-1.7B**, cần **1 GPU 48GB** (RTX 6000 Ada, ~1–1,5h/lượt
   400 bước). Số liệu: RLCD đạt Brier 0,135 / AURC 0,034 / **coverage@5% = 81%** (SFT+TS chỉ 6%) — đúng
   thứ mình thiếu (calibration). Mình có **dữ liệu miền** hiếm ai có: 80 mẫu vàng, 763 tờ khai Oz,
   TB-TCHQ, sổ tay, tiền lệ → fine-tune một decider "tiếng của ngành hải quan VN" là khả thi với vài
   chục đô thuê GPU. Hướng dẫn fine-tune từng bước (tiếng Trung): `datawhalechina/jev-cookbook`.

## 1. Bảng chọn nhanh các "anh em" đáng chú ý

| Hệ | Điểm JevBench (tổng) | Đặc tính | Ghi chú cho mình |
|---|---:|---|---|
| Imajev-4B | 67,37 | Mạnh nhất + **đọc được ảnh** | Nặng cho Xeon không GPU; cần GPU |
| Plumb-4B | 65,84 | Trục "thông minh" cao nhất, p50 183ms | Nhẹ hơn Imajev về vận hành |
| decider-4b v2 | 64,13 | Bản cộng đồng phổ biến | 4B → CPU khó |
| Jev 1.13.0 (gốc) | 63,29 | API đóng, 652ms | Đối chứng; dữ liệu khách → phải soát no-train |
| Hopper | — | **Calibration tốt nhất bảng** | Ứng viên nếu đo thấy Laya lệch |
| AnyJev L0 | — | Không cần train (Nokia + Hunyuan) | …nhưng ôm model nền lớn |
| **Laya (multilingual, 322M)** | — (không nằm top đầu) | **Apache 2.0, CPU, 33ms(T4), 100+ ngôn ngữ** | **Ứng viên số 1 cho self-host .120** |
| Intern-Decision 4B | 90,02 (tự công bố) | **Chưa bên thứ ba kiểm** | Đừng đưa vào tính toán |

Nhắc lại bài học từ bảng: **mọi thứ trong nhóm này sập độ chính xác 48–57 điểm trên đề kín, kể cả Jev
gốc** — nên thiết kế đúng là "máy khoanh vùng + decider chọn trong vùng + người/bộ não sâu cho ca kín".

## 2. Đo độc lập Laya vs Jev (đáng tin nhất đang có) — `yibie/laya-jev-lab`

40 ticket tiếng Trung (chính là loại văn bản gần bài toán mình):

| | Đúng | Confidence TB | Độ trễ |
|---|---:|---:|---:|
| Jev (API) | **31/40 = 78%** | 0,88 | 588 ms |
| Laya (local) | 23/40 = 57% | 0,71 | **7,6 ms** |

**Cascade Laya→Jev, ngưỡng 0,60: đúng bằng Jev (78%) mà nhanh 1,8×, 45% ca giải quyết tại chỗ.**
Kết luận dùng được ngay cho mình: nếu self-host Laya trên .120 làm tầng 1, phần "cao tay" đẩy lên
bộ não M3 hiện có (thay vì Jev API) — kiến trúc y hệt, không cần thêm nhà cung cấp.

Bài học câu hỏi (rất khớp sổ tay của mình):
- `noul` đáng tin cho **dữ kiện** ("hồ sơ có nhắc X không?" → 0,996), vô dụng cho **phán đoán** ("lịch sự không?" → loạn).
- `choice` ổn khi phương án rời rạc, rõ; nhưng có ca **"tự tin 0,92 mà sai"** khi hồ sơ chứa hai ý chồng nhau → ngưỡng phải hiệu chỉnh trên chính dữ liệu mình, không bê từ người khác.

## 3. Ba đường cho nhà mình (hạ tầng thật: Xeon 16 nhân, 62GB RAM, **KHÔNG GPU**)

### Đường A — Gọi API (Jev gốc hoặc mạnh nhất qua OpenRouter)
- Nhanh nhất để thử (mình có sẵn khoá OpenRouter): `typesafe/jev-1.13`, `typesafe/jev-router`.
- Vướng: **dữ liệu khách đi ra ngoài** → phải soát no-train trước khi lên prod; phù hợp **chỉ để đo
  trên đề vàng / kho nội bộ**.

### Đường B — Self-host Laya trên .120 (khuyến nghị làm trước)
- `pip install` + `snapshot_download convaiinnovations/laya-multilingual` (~647MB) + `layalib`
  (Jev-compatible server, `LAYA_DEVICE=cpu`) → chạy như một service nội bộ cùng docker network với hs-code-api.
- **Dữ liệu khách không rời máy**; chi phí biên = 0; độ trễ CPU cần đo thật (MLX M4 7,6ms; Xeon CPU
  ước 10–30× chậm hơn — vẫn thắng xa 45–60s/vòng M3).
- Việc kèm theo bắt buộc: (1) **nén state ≤1k token** (tên hàng + chất liệu + công dụng + danh sách
  ứng viên có nhãn ngắn + 5–8 câu `noul` dữ kiện); (2) **temperature calibration trên dev set của mình**;
  (3) đo đường calibration + "cao tay" trước khi cho chốt.

### Đường C — Train lại decider "tiếng ngành" trên dữ liệu Oz
- Công thức có sẵn: `openjev-rlcd` (Qwen3-1.7B, hai chặng, tài liệu + code + logs); fine-tune Laya
  trên dữ liệu mình cũng là biến thể của đường này (Laya Apache 2.0 cho phép).
- Dữ liệu mình: 80 mẫu vàng (có đáp án), 763 tờ khai Oz, TB-TCHQ, 341 điều kiện số hoá + câu hỏi sổ tay,
  tiền lệ Oz → **tập huấn luyện miền mà gần như không đội ngoài nào có**.
- Chi phí: thuê 1 GPU 48GB vài giờ (mức giá đã thấy: $17–50/lượt); sau train chạy CPU tại nhà như Đường B.
- Đây là đường "hào kinh tế": decider hiểu tiếng Việt hải quan + calibrated theo chuẩn của mình.

## 4. Kế hoạch thử nghiệm đề xuất (thay P0 cũ — mở rộng thành 3 nhánh đo song song)

**P0' — Shadow 3 nhánh trên 80 mẫu vàng (2 lượt), trong container bench, không đụng prod:**
1. Động cơ hiện tại (baseline đã có: gates 60,1% Đ8).
2. Jev gốc qua OpenRouter (đối chứng "hàng thật").
3. Laya-multilingual self-host trong chính container bench (CPU) — sau 1 lượt calibration nhiệt độ trên dev split.
State dùng chung một khuôn nén ≤1k token (chuẩn bị 1 lần, dùng cho cả 2 decider).
Đo: choice-đúng-trong-pool, noul-dữ-kiện, đường calibration (ECE), độ trễ Xeon CPU, chi phí.
**Cổng qua P1:** một decider đạt "vùng tự tin cao: đúng ≥ động cơ hiện tại" với **độ phủ ≥ 40%** + ECE ≤ 0,1.

**P1 — Cascade thật trong engine (sau cổng P0'):** decider thắng làm tầng 1; tự tin thấp → M3 sâu như cũ;
dữ kiện thiếu → NEED_FACTS. Đo lại p50/p90 như `09-hieu-suat-llm.md`.

**P2 — Train "decider Oz" (nếu P1 cần thêm độ chính xác miền):** RLCD/fine-tune trên dữ liệu mục 3C,
thuê GPU, so lại trên đề vàng trước khi thay tầng 1.

## 5. Checklist pháp lý/kỹ thuật trước khi dùng

- Laya: **Apache 2.0** → OK thương mại (ghi công theo yêu cầu giấy phép nếu phân phối lại).
- Các model khác trong bảng: giấy phép theo model nền (Gemma/Qwen/LFM…) — **soát từng cái trước khi dùng**.
- Jev gốc/hosted: soát điều khoản no-train **trước khi** gửi dữ liệu khách.
- Số "193× nhanh / 444× rẻ" của Jev là do hãng tự đo — không đưa vào tính toán mua sắm.
- JevBench chạy nhanh (v1.5.x đã ra, điểm đổi liên tục) — chốt số phải ghi rõ phiên bản.

## 6. Chốt của CEO 14/10/2026 (ghi nhận — triển khai sau)

- **Ghi nhận kế hoạch P0′→P2 (mục 4), triển khai sau.** Chưa mua/ký gì với TypeSafe.
- **Chỉ tin kết quả nếu TRAIN ĐƯỢC**: decider mua sẵn/API (kể cả Jev gốc) tối đa là **tầng lọc nhanh** — CEO không tin "quyết định nhanh mà đúng" cho bài toán này. Đường đáng đi là Đường C (train trên dữ liệu miền của mình), làm sau khi cần.
- **Điều kiện bắt buộc cho MỌI kết quả chốt mã (cả hệ, không riêng Jev):** phải kèm **bằng chứng pháp lý đầy đủ** — **một trong 6 nguyên tắc GIR**, dẫn chứng điều khoản/biểu thuế nguyên văn, **catalogue máy** (made-in-china), **nguyên lý hoạt động** của hàng. Tầng nhanh/decider **không bao giờ** được phát mã thiếu chuỗi bằng chứng; thiếu → trả `NEED_FACTS`/`NEEDS_EXPERT` theo đúng hệ cổng chặn hiện có.
- **Ưu tiên trước mắt thay cho P0′** (theo phản hồi khách thật #166 ngày 14/10 — classify bị 524 vì chạy > 100 s): (1) trả `maLuot` trong **mọi nhánh lỗi** + hạn nội bộ < 100 s kèm `retryable`; (2) tầng nhanh hiệu suất theo leo thang của `09-hieu-suat-llm.md` (đo trước — thêm ms từng lượt vào engine, bench 80 mẫu); (3) các mục #166 còn lại (tra_thu_tuc gộp dữ liệu chính sách, nhãn `AI_CHUA_KIEM` cho trường enrichment, kênh báo lỗi `bao_loi`).

Nguồn: JevBench v1.4.2.2 qua `freezetheflame/jev-ecosystem-research`; lab đo `yibie/laya-jev-lab`;
`exfly/laya-jev-compatible-server`; `ZimmyGao/openjev-rlcd` (arXiv 2609.38850); `datawhalechina/jev-cookbook`;
`convaiinnovations/laya` (Hugging Face, Apache 2.0); danh mục `yibie/awesome-jev`; `mode-io/vllm-jev`.
