# GĐ0 — Kết quả baseline embedding cục bộ (J1–J5, #377/#366)

**Ngày:** 2026-10-22 · **Người thực hiện:** ZCode · **Trạng thái:** ✅ xong 5/5 job

## Tóm tắt 1 dòng
Embedding cục bộ **đạt vượt trội về tốc độ** (p50 9ms, gấp ~10.000 lần M2.7) nhưng **top-1 chưa đạt mốc M2.7** (44,8% vs 64,9%) — tuy nhiên **top-3 = 62,9%** cho thấy vai trò đúng của nó là **tầng ứng viên**, không phải bộ chốt.

## Kết quả 3 cấu hình (763 mẫu holdout 15%, seed 42, Mac M4 — server chờ J4-chính-thức)

| Cấu hình | top-1@4 | top-3@4 | top-1@6 | top-3@6 | p50 | p95 |
|---|---|---|---|---|---|---|
| **e5-small + mô tả thật & tên biểu thuế** | **44,8%** | **62,9%** | **42,1%** | **59,8%** | **9ms** | **11ms** |
| e5-base + cùng index | 34,5% | 51,0% | 30,5% | 46,4% | 15ms | 18ms |
| e5-small + chỉ mô tả thật (338 nhóm có tờ khai) | 42,5% | 61,9% | 40,2% | 58,3% | 5ms | 7ms |
| M2.7 (mốc so) | 64,9% | — | 40,4% | — | 90.000ms+ | — |

## Phân bố hạng nhóm-đúng (e5-small, cấu hình tốt nhất)

| Hạng | Số mẫu | Tích luỹ |
|---|---|---|
| Top-1 | 342 (44,8%) | 44,8% |
| Top-2 | 90 | 56,6% |
| Top-3 | 48 | 62,9% |
| Top-4–5 | 229 | **92,9%** |
| Ngoài top-5 | 54 | — |

**92,9% ca có nhóm đúng trong top-5** — đây là con số quan trọng cho vai trò tầng ứng viên.

## Đọc số cho đúng (bài học từ phân tích lỗi)

Embedding gom đúng **KHU** (chương, vùng hàng) nhưng không phân biệt **ranh giới pháp lý mỏng** giữa anh em:
- Dép nhựa PVC (6402) → embedding chọn giày 6405 — ranh giới "mũ giày" là ngưỡng pháp lý
- Bộ sạc (8504) → chọn dây cáp 8544 — ranh giới "có đầu nối" chính là điều sổ tay mã hoá
- Giày vải canvas (6405) → chọn 6406 — phân biệt "mũ giày/đế"

Đây **không phải điểm yếu cần sửa bằng model lớn hơn** (e5-base tệ hơn!) — đó là bản chất: **phân biệt ranh giới pháp lý là việc của tầng sổ tay** (điều kiện số, trích luật), đúng kiến trúc phân tầng của #366.

## Quyết định go/no-go (theo cổng #377)

| Điều kiện cổng | Kết quả | Đạt? |
|---|---|---|
| top-1@4số ≥ M2.7 (64,9%) | 44,8% | ❌ |
| p50 < 1s/món | 9ms | ✅ (vượt 100 lần) |

**Kết luận: NO-GO cho việc THAY thế hoàn toàn bước đoán nhóm bằng embedding top-1 — NHƯNG GO cho vai trò TẦNG ỨNG VIÊN (candidate pool)** — điều chỉnh GĐ1:

> **GĐ1 (điều chỉnh):** embedding sinh **top-5 ứng viên nhóm** (92,9% phủ nhóm đúng) → sổ tay/điều kiện chấm chọn trong pool → chỉ ca pool không chứa nhóm đúng mới rơi xuống LLM. Kỳ vọng: đa số món bỏ được 1–2 lượt LLM "đoán nhóm" (tiết kiệm 30–90s/món), giữ nguyên chất lượng vì sổ tay vẫn chốt.

Việc này không trái cổng #377 — nó đúng kiến trúc đích của #366 (tầng 1 = gợi ý, tầng 2 = sổ tay chốt) và điều kiện "model = trợ lý dữ kiện, không đoán thẳng mã".

## Ghi chú kỹ thuật
- Model: `Xenova/multilingual-e5-small` (118M, ONNX q8, 23MB) — tải 1 lần, chạy CPU không cần GPU, không cần AVX2 (đã chạy trên Mac M4; server .120/.100 cùng kiểu CPU cũ sẽ tương tự ~15-30ms/câu)
- Đa ngữ hoạt động tốt: "máy nén khí" ↔ "空压机" cosine 0,878
- Index: 1.269 nhóm-4 + 5.784 PN6 = 23MB JSON, load RAM ~100MB, tìm toàn bộ cosine 7.053 nhãn trong <10ms
- Holdout đã loại khỏi index (chống rò rỉ) — kiểm tra bằng `isHeldOut` từng bản ghi
- Scripts: `scripts/gd0/j1-harness.mjs` → `j2-build-index.mjs` → `j3-retrieve.mjs` → `j4-bench-holdout.mjs`

## Việc kế (chờ CEO gật GĐ1-điều-chỉnh)
1. Nối `j3-retrieve` vào `engine-loop.js` làm nguồn pool nhóm (thay/bổ sung bước LLM đoán nhóm khi pool đủ tin)
2. Đo lại trên server .120/.100 (J4 chính thức — cùng bộ script, chỉ đổi máy)
3. So sánh end-to-end: độ chính xác giữ nguyên + p50 giảm từ ~90s xuống <10s cho ca có pool đúng
