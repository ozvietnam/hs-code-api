# Kiểm tra HS - Thuế - Chính sách: Má phanh dùng cho băng tải

**Ngày kiểm:** 2026-10-10
**Mô tả hàng:** Má phanh (brake pad) dùng cho băng tải công nghiệp
**API nguồn:** https://hs-kb.uythacnhapkhau.com (production)
**Phương pháp:** Tra 8 mã HS nghi vấn + classify mô tả → so sánh GIR

---

## 1. Phân tích mô tả

| Đặc điểm | Chi tiết |
|----------|----------|
| Tên tiếng Việt | Má phanh / brake pad / brake lining |
| Công dụng | Hãm/phanh cho băng tải công nghiệp |
| Vật liệu | Vật liệu ma sát composite (ceramic + phenolic resin) |
| Có dùng cho xe? | **KHÔNG** - chỉ dùng cho băng tải (máy móc công nghiệp) |
| Nhóm máy băng tải | 8425-8430 (máy nâng hạ, vận chuyển, xếp dỡ) |

## 2. GIR nghi vấn

Khi tra qua API `POST /api/suggest`, hệ thống đã trả 2 phương án hàng đầu:
1. `8431.39.90` (confidence 86) - **Phụ tùng cho máy nhóm 8425-8430**
2. `4016.93.90` (confidence 60) - Phụ tùng cao su khác

Em tra thêm các mã nghi vấn khác:

| Mã | Mô tả | NK (%) | ACFTA (%) | VAT | Ghi chú |
|----|-------|--------|-----------|-----|---------|
| **6813.20.10** | Lót và đệm phanh (vật liệu ma sát) | 15 | 0 | 8/10 | Phù hợp nếu xếp theo **vật liệu ma sát** |
| **6813.20.90** | Vật liệu ma sát khác | 15 | 0 | 8/10 | Tương tự 6813.20.10 |
| **8431.39.90** | Phụ tùng cho máy nhóm 8425-8430 (Loại khác) | **5** | **0** | 8/10 | ✅ **API #1 chọn** |
| **8431.10.29** | Phụ tùng máy nâng hạ (Loại khác) | 5 | 0 (-MY) | 8/10 | Tương tự |
| **8708.30.21** | Phanh trống/đĩa/hơi cho xe 87.01 | 30 | 0 | 8/10 | **LOẠI** - dùng cho xe |
| **4016.93.90** | Phụ tùng cao su khác | 4.5 | 0 | 8/10 | API #2, có cảnh báo |
| **7326.90.99** | Sản phẩm sắt/thép khác | 15 | 0 (-KH) | 10/8 | Nếu có khung thép |

## 3. Khuyến nghị phân loại

### ✅ Mã chính: **8431.39.90** - "Phụ tùng cho máy thuộc nhóm 8425-8430 - Loại khác"

**Lý do chọn (GIR 1 - nguyên tắc 1: theo mô tả nhóm):**
- Băng tải công nghiệp thuộc nhóm máy nâng hạ, vận chuyển, xếp dỡ → nhóm **84.25 - 84.30**
- Phụ tùng của các máy này phân vào **nhóm 84.31** (Các bộ phận)
- 84.31 chia theo máy cụ thể:
  - 84.31.10: cho máy nâng hạ
  - 84.31.20: cho máy xúc đào
  - 84.31.30: cho máy khác
  - 84.31.39: **cho các máy khác - loại khác** ← phù hợp nhất
- 84.31.39.90: mã 8 số "Loại khác" ← **đây là mã chính xác**

### Lý do LOẠI các mã khác

| Mã | Vì sao loại |
|----|-------------|
| `6813.20.10` | GIR 1 ưu tiên theo **công dụng** (phụ tùng máy) hơn **vật liệu** (ma sát). Chú giải nhóm 68.13 nói rõ: "trừ các sản phẩm thuộc Ch.84, 85, 87" nếu đã có nơi cụ thể hơn |
| `8708.30.xx` | **Dùng cho ô tô**, băng tải KHÔNG phải ô tô → loại |
| `4016.93.90` | Là phụ tùng **chung** bằng cao su, không mô tả cụ thể công dụng. Chỉ phù hợp khi KHÔNG xác định được máy cụ thể |
| `7326.90.99` | Quá chung chung, dùng khi KHÔNG có mã đặc thù nào khác |

## 4. Thuế và chính sách

### Mã `8431.39.90`

| Khoản | Mức | Ghi chú |
|--------|-----|---------|
| **Thuế NK ưu đãi (TT)** | **5%** | Áp dụng cho nước không có FTA hoặc FTA chưa dùng |
| **ACFTA (T-VN, C/O Form E)** | **0%** | Ưu đãi FTA |
| **VAT** | **8%** (giảm từ 10%, còn hiệu lực đến 31/12/2026) | Cơ sở: 174/2025/NĐ-CP |
| **Thuế BVMT** | Không có | - |
| **Hạn ngạch quota** | Không | - |
| **Chính sách đặc biệt** | `policyLevel: NONE` | Không bị chặn |

### So sánh thuế giữa các phương án

| Mã | NK (%) | ACFTA (%) | VAT | Tiết kiệm nếu dùng ACFTA |
|----|--------|-----------|-----|--------------------------|
| **8431.39.90** ⭐ | 5 | 0 | 8 | -5% |
| 6813.20.10 | 15 | 0 | 8 | -15% |
| 4016.93.90 | 4.5 | 0 | 8 | -4.5% |
| 7326.90.99 | 15 | 0 | 10/8 | -15% |

## 5. Chính sách quản lý chuyên ngành (KTCL)

- ✅ **Không thuộc danh mục KTCL** (policy level NONE)
- ✅ Không cần giấy phép đặc biệt
- ✅ Không cần kiểm tra chất lượng nhà nước
- ✅ Không bị cấm/hạn chế nhập khẩu
- ⚠️ Cần **kiểm tra C/O Form E** nếu muốn hưởng thuế 0% (nếu xuất xứ Trung Quốc)

## 6. Hồ sơ nhập khẩu cần chuẩn bị

| STT | Chứng từ | Ghi chú |
|-----|----------|---------|
| 1 | Tờ khai hải quan | ECUS mô tả: "Má phanh dùng cho băng tải, vật liệu ma sát composite, mã HS 8431.39.90" |
| 2 | Hợp đồng mua bán | - |
| 3 | Invoice + Packing list | - |
| 4 | Bill of Lading / Airway bill | - |
| 5 | **C/O Form E** | Nếu muốn hưởng 0% thuế NK |
| 6 | Certificate of Quality | Tùy NCC (không bắt buộc theo KTCL) |

## 7. Lưu ý đặc biệt

1. **VAT 8% có thời hạn**: Chính sách giảm VAT 10% → 8% theo 174/2025/NĐ-CP chỉ có hiệu lực đến **31/12/2026**. Sau thời điểm này cần đối chiếu Nghị định mới.

2. **C/O Form E với hàng Trung Quốc**:
   - Mã `8431.39.90` thuộc biểu thuế NK ưu đãi ACFTA → có thể hưởng 0%
   - Cần kiểm tra quy tắc xuất xứ (PSR) cụ thể cho mã này trong Phụ lục 2 ACFTA

3. **Mô tả ECUS nên ghi**: "Má phanh (brake lining) dùng cho băng tải công nghiệp, vật liệu ma sát composite (ceramic, phenolic resin), kích thước [dàyxrộngxcao] mm" - tránh ghi chung "phụ tùng" hoặc "linh kiện".

4. **Nếu hàng dùng cho máy cụ thể** (không phải băng tải): cần tra lại vì 84.31 có nhiều phân nhóm theo loại máy (8425-8430).

## 8. Test bằng API tự động

```bash
# Tra cứu
curl "https://hs-kb.uythacnhapkhau.com/api/tax?hs=84313990"
curl "https://hs-kb.uythacnhapkhau.com/api/suggest" \
  -H "Content-Type: application/json" \
  -d '{"description":"Má phanh dùng cho băng tải công nghiệp, vật liệu ma sát composite"}'

# Smoke test (tự động 19 endpoint)
node scripts/qa-api-smoke.mjs
```

## 9. Kết luận

> **Mã HS chính xác: 8431.39.90 - "Phụ tùng cho máy thuộc nhóm 8425-8430 - Loại khác"**
>
> - **Thuế NK:** 5% (TT) hoặc 0% (ACFTA Form E)
> - **VAT:** 8% (đến 31/12/2026)
> - **KTCL:** Không có yêu cầu đặc biệt
> - **Mức độ tự tin:** ★★★★☆ (Cao - API #1 chọn với 86% confidence, GIR 1, không có cảnh báo policy)

---

**Người duyệt:** Chuyên viên hải quan / Bộ phận phân loại HS
**Tài liệu tham chiếu:**
- [WCO Explanatory Notes to HS 2022] - Chú giải nhóm 84.31
- [ACFTA Agreement - Annex 2 PSR]
- [174/2025/NĐ-CP] - Giảm thuế GTGT 8% đến 31/12/2026
- Biểu thuế XNK ưu đãi Việt Nam 2026
