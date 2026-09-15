# Từ điển tên thương mại + ngữ cảnh dòng "Loại khác"

Ba lớp bổ sung cho `/api/search` và `/api/tax`, trả lời đúng một vấn đề: **biểu
thuế và người đi khai nói hai thứ tiếng khác nhau.**

| Lớp | File | Nguồn | Phủ được gì |
|---|---|---|---|
| Ngữ cảnh dòng dư | `data/hs-context.json` | cắt từ `data/loai-khac-index.json` | 3.383 mã tên chứa "Loại khác" |
| Từ điển tên thương mại | `data/trade-synonyms.json` | người soạn, đọc biểu thuế | ngành Oz chưa có tờ khai (chương 72–81…) |
| Cảnh báo VAT | `lib/vat-reduction.js` | `giam_vat` sẵn có trong `tax.json` | 1.561 mã không được giảm theo NĐ 174/2025 |

Lớp thứ tư đã có từ trước và **không** thay thế: `data/hs-aliases.json` — đào tự
động từ 5.156 tờ khai Oz. Xem `scripts/build-hs-aliases.mjs`.

---

## 1. Vì sao "Loại khác" là cái bẫy

| Con số | Giá trị |
|---|---|
| Tổng mã trong `tax.json` | 11.871 |
| Mã có tên **đúng bằng** "Loại khác" | 3.050 (25,7%) |
| Mã có tên **chứa** "loại khác" | 3.383 (28,5%) |

> RFC gốc ghi "hơn 42%". Số thật đo trên `data/tax.json` là 25,7% / 28,5%.

Tên "Loại khác" không mang thông tin. Nghĩa thật của mã nằm ở dòng cha — mà
`tax.json` **không có dòng cha**: cả 11.871 khoá đều là dòng lá 8 số, mọi dòng
tiêu đề nhóm đã bị lược bỏ khi dựng dữ liệu.

**Đừng thử suy ra dòng cha bằng cách đếm gạch đầu dòng.** Đã thử và đã bỏ: cách
đó gán "Chấn lưu dùng cho đèn phóng" (`85041000`) làm cha của `85044090` — hai
mặt hàng không liên quan gì nhau.

Thứ dùng được là câu "Lưu ý phân biệt" đã có sẵn trong `loai-khac-index.json`:

```
72254090 → "Thép hợp kim khác (không phải không gỉ), dạng cuộn dẹt, chiều rộng
            ≥ 600mm. Phân biệt với 7208-7210 (không hợp kim), 7219 (không gỉ)
            và 7226 (chiều rộng < 600mm)."
```

`scripts/build-hs-context.mjs` cắt riêng câu đó + tên mã anh em bị loại trừ, bỏ
phần còn lại: 7,6 MB → 1,4 MB, đủ nhẹ để tầng tìm kiếm nạp (+12 ms cold start).

```bash
npm run data:build-context
```

### Cách tầng tìm kiếm dùng nó

Chỉ mục ngược token → mã, dựng lười một lần (`contextHitCounts`). Chi phí tỉ lệ
với **số từ của câu hỏi**, không phụ thuộc kích thước biểu thuế. Bản đầu tiên
quét thẳng chuỗi cho từng dòng trong 12.000 dòng và làm benchmark 763 tờ khai
chạy quá 5 phút CPU — đừng quay lại cách đó.

Cửa vào cho dòng dư đòi **cả hai**: ≥ 2 token khớp **và** tỉ lệ khớp ≥ 0,4. Chỉ
đếm số lượng thì câu mô tả chung chung ("Là máy móc có chức năng cơ khí riêng
biệt…") kéo 908 dòng dư vào mọi truy vấn dài.

---

## 2. Thêm một mục vào từ điển tên thương mại

`data/trade-synonyms.json`. Một mục tối thiểu:

```json
{
  "id": "ten-khong-dau-gach-noi",
  "titleVi": "Tên người đọc hiểu",
  "terms": ["cụm người ta gõ", "mác hàng", "tên tiếng Anh"],
  "excludeIfAny": ["cụm làm mục này KHÔNG áp dụng"],
  "excludeReasonVi": "Vì sao gặp cụm đó thì tắt mục này",
  "candidates": [
    { "hs": "84796000", "whenVi": "Áp dụng khi…", "confidence": "high" }
  ],
  "avoid": [{ "prefix": "8415", "whyVi": "Vì sao mã này là bẫy" }],
  "askVi": ["Câu hỏi gạn thông tin còn thiếu"],
  "gir": "3a",
  "basis": "RULE_TABLE",
  "sourceVi": "Dẫn nguyên văn biểu thuế / chú giải"
}
```

**Luật bắt buộc** — `npm run test:trade-synonyms` sẽ chặn nếu vi phạm:

1. Mã trong `candidates[].hs` phải tồn tại trong `tax.json`. Mã chết = mất tính năng.
2. Mục nào cũng phải có `sourceVi`. Không dẫn được nguồn thì đừng thêm.
3. `confidence` chỉ nhận `high` / `medium` / `low`.
4. Mỗi ứng viên phải có `whenVi`. Người tra cần biết mình thuộc ứng viên nào —
   riêng thép làm khuôn, mã đúng phụ thuộc khổ rộng 600 mm.

**Khi dữ liệu không khẳng định nổi một mã thì để nhiều ứng viên `low` kèm
`askVi`, đừng chốt bừa.** Mục `masterbatch` là ví dụ: mã đúng phụ thuộc chất màu
vô cơ hay hữu cơ, không suy ra được từ tên hàng.

### `avoid` loại HẲN, không phải trừ điểm

Hỏi "tấm thép làm khuôn nhựa" mà bộ khuôn `8480` nằm hạng hai thì người khai vẫn
gật — tên hàng nghe khớp hoàn toàn. Nên mã trong `avoid` bị loại khỏi kết quả và
trả về ở trường riêng `avoidedCodes` kèm lý do. Loại **công khai**, không giấu.

### `excludeIfAny` là cái phanh

Một bảng tra tay mà sai thì sai có hệ thống, lần nào cũng sai. Hai cái phanh đang
chạy:

- `inverter` trong "máy điều hòa inverter" là **tính năng**, không phải bộ biến
  tần 8504 → mục `bien-tan-vfd` tự tắt.
- "bộ khuôn ép nhựa bằng thép P20" nói về **khuôn thành phẩm** → mục
  `thep-lam-khuon` tự tắt, và mục `bo-khuon-ep-nhua` nhận, trả về `8480.71`.

Mác thép dạng số trần (`2311`) chỉ được tính khi câu có thêm từ ngữ cảnh
(`numericTermContext`), nếu không thì "mua 2311 cái bút bi" cũng dính.

---

## 3. Cảnh báo VAT

Quy ước trường `vat` trong biểu thuế: `"A/B"` = **A đang áp dụng**, B là mức còn
lại. `"10/8"` nghĩa là đang 10% (không được giảm). Đọc ngược là sai cả nghìn dòng.

`vatReductionOf(row)` trả:

```json
{ "rate": "10", "alternateRate": "8", "reduced": false, "eligible": false,
  "noteVi": "Không được giảm VAT theo 174/2025/NĐ-CP - PL1: …",
  "legalBasis": "174/2025/NĐ-CP", "severity": "warning" }
```

`/api/tax` vốn đã trả `taxVatReduction` — nhưng là văn xuôi, ERP không branch
được. `/api/search` thì trước đây chưa trả gì, trong khi đó mới là nơi người ta
**chọn** mã.

---

## 4. Công tắc vận hành

| Biến | Mặc định | Tác dụng khi đặt `off` |
|---|---|---|
| `HS_TRADE_SYNONYMS` | `on` | tắt từ điển tên thương mại |
| `HS_ALIAS_SEARCH` | `on` | tắt bảng alias đào từ tờ khai |

Gợi ý xấu thì tắt ngay bằng biến môi trường, không phải chờ deploy lại.

---

## 5. Kiểm thử

```bash
npm run test:trade-synonyms   # từ điển + breadcrumb + VAT
npm run test:aliases          # bảng alias đào tự động
npm run bench:aliases         # đo trên tập giữ riêng
```
