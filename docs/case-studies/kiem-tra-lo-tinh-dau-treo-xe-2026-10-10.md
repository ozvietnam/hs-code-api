# Kiểm tra HS - Thuế - Chính sách: Lọ tinh dầu thủy tinh treo xe ô tô

**Ngày kiểm:** 2026-10-10
**Mô tả hàng (từ ảnh):** Lọ thủy tinh tròn + nắp gỗ + dây thừng treo, có chứa chất lỏng màu (tinh dầu), nhiều màu, dùng để treo trên xe ô tô tỏa hương
**API nguồn:** https://hs-kb.uythacnhapkhau.com (production)
**Phương pháp:** Phân tích ảnh + tra mô tả qua API `POST /api/suggest` + đối chiếu 8 mã nghi vấn + tra tiền lệ TB-TCHQ + đọc `data/tax.json` trong repo

---

## 1. Phân tích hình ảnh

| Đặc điểm | Quan sát |
|----------|----------|
| Hình dạng | Lọ tròn, dẹt (dạng quả cầu), đường kính ước lượng 5-7cm |
| Chất liệu chính | Thủy tinh trong suốt (nhiều màu: vàng, đỏ, tím, xanh dương, nâu, đen) |
| Nắp | Nắp gỗ hình trụ, khía rãnh |
| Dây treo | Dây thừng (rope) bện 2-3 sợi, có hạt gỗ trang trí |
| Bên trong | Có chất lỏng màu (gần như chắc chắn là **tinh dầu**) |
| Công dụng | Treo trên xe ô tô để tỏa hương (car air freshener / aroma diffuser) |
| Đóng gói | Bán lẻ từng lọ |

## 2. GIR nghi vấn

Khi tra qua `POST /api/suggest` với description "Lọ tinh dầu thủy tinh treo xe ô tô, nắp gỗ, dây thừng, nhiều màu, dùng để tỏa hương", hệ thống trả **1 phương án với confidence thấp (30/100)** → cảnh báo `NEEDS_EXPERT`:

| HS | Conf | NameVi | Nhận xét |
|----|------|--------|----------|
| 9405.41.30 | 30 | Đèn tín hiệu / đèn cho phương tiện giao thông | **SAI** - API lạc đề, không phù hợp |
| API báo NEEDS_EXPERT | - | "AI chỉ tự tin 30/100 với gợi ý đầu — có thể không ứng viên nào đúng bản chất hàng" | - |

Em tra thêm các mã nghi vấn từ `data/tax.json`:

| Mã | nameVi (từ tax.json) | tt | mfn | acfta | vat | policy | nameEn |
|----|---------------------|----|----|-------|-----|--------|--------|
| **3307.49.10** | Các chế phẩm làm thơm phòng, có/không đặc tính khử trùng | 30% | 20% | 0% | 8/10 | NONE | Preparations for perfuming or deodorising rooms |
| 3307.49.90 | Loại khác (chế phẩm tỏa hương) | 30% | 20% | 0% | 8/10 | NONE | Other |
| 3307.30.00 | Muối thơm tắm + chế phẩm tắm khác | 30% | 20% | 0% | 8/10 | BLOCKING | Bath salts |
| 3307.90.40 | Nước hoa/mỹ phẩm khác | 30% | 20% | 0% | 8/10 | **BLOCKING** (đăng ký lưu hành 19/2024/TT-BYT) | Other perfumery |
| 3307.90.90 | Loại khác | 27% | 18% | 0% | 8/10 | **BLOCKING** (đăng ký lưu hành) | Other |
| **7013.99.00** | Đồ thủy tinh khác - loại khác | 22.5% | 15% | 0% | 8/10 | **NOTICE** (08/2023/TT-BCT - hàng tiêu dùng QSD NK) | Other glassware |
| 7013.28.00 | Đồ thủy tinh trang trí (Ly) - loại khác | 52.5% | 35% | 0% | 8/10 | NOTICE | Other |
| 3926.90.99 | Sản phẩm plastic khác | 18% | 12% | 0% | 8/10 | NOTICE | Other articles of plastics |
| 4421.99.90 | Sản phẩm gỗ khác | - | - | - | - | - | Wooden articles |
| 5607.90.90 | Dây thừng khác | 18% | 12% | 5% | 8/10 | NOTICE | Twine |

## 3. Khuyến nghị phân loại

### ✅ Mã chính: **3307.49.10** - "Các chế phẩm làm thơm phòng, có hoặc không có đặc tính khử trùng"

**Lý do chọn (GIR 1 - theo đặc trưng chính):**

1. Sản phẩm **chứa tinh dầu** (quan sát chất lỏng màu trong lọ) → đặc trưng chính là **chế phẩm tỏa hương**
2. Công dụng: **tỏa hương** (khử mùi, làm thơm không gian trong xe)
3. Theo chú giải 33.07 (heading 3307): "Các nhóm từ 33.03 đến 33.07 áp dụng... cho các sản phẩm, đã hoặc chưa pha trộn... phù hợp dùng cho các hàng hoá đã ghi trong các nhóm này và được **đóng gói để bán lẻ**"
4. Phân nhóm 3307.49: "Các chế phẩm dùng để làm thơm hoặc khử mùi phòng, kể cả các chế phẩm có mùi thơm dùng trong nghi lễ tôn giáo" → phù hợp
5. Mã 3307.49.10: "Các chế phẩm làm thơm phòng, có hoặc không có đặc tính khử trùng" → **chính xác nhất**

### Xác minh qua tiền lệ TB-TCHQ trong kho

Đã search toàn bộ kho TB-TCHQ (2.792 records) tìm các từ khóa: "lọ tinh dầu", "aroma", "khuếch tán", "car freshener", "lọ treo" → **không tìm được tiền lệ trực tiếp** cho "lọ tinh dầu treo xe ô tô".

Có 1 TB **5189/TB-TCHQ/2018** liên quan (chế phẩm làm thơm phòng, dạng rắn, 70g) → 3307.49.10 - cùng mã, cùng nhóm, **xác nhận pattern**.

### Lý do LOẠI các mã khác

| Mã | Vì sao loại |
|----|-------------|
| `3307.90.40/90` | "Nước hoa/mỹ phẩm khác" - dành cho sản phẩm dùng trên người (mỹ phẩm, nước hoa), không phải chế phẩm tỏa hương phòng. Có **BLOCKING policy** (đăng ký lưu hành 19/2024/TT-BYT) |
| `3307.30.00` | "Muối thơm tắm" - dành cho tắm/gội, không phù hợp |
| `7013.99.00` | Đồ thủy tinh trang trí - coi lọ là vật chứa. Nhưng GIR 1 ưu tiên đặc trưng (tinh dầu bên trong). **Có NOTICE policy** (08/2023/TT-BCT) - cảnh báo |
| `3926.90.99` | Sản phẩm plastic khác - áp dụng nếu lọ bằng nhựa. Ảnh cho thấy thủy tinh |
| `9405.41.30` | API đề xuất nhưng **SAI** - đây là đèn tín hiệu giao thông, không phải lọ tinh dầu |

### Trường hợp cần xem xét thêm

- Nếu **chỉ là lọ rỗng** (không có tinh dầu bên trong), người dùng tự mua tinh dầu đổ vào → xếp mã **7013.99.00** (đồ thủy tinh trang trí)
- Nếu có tinh dầu **đi kèm** (lọ + chai tinh dầu riêng) → có thể xếp **bộ** theo GIR 3(b) - bộ hàng - vào 3307.49.10
- Cần xác minh với nhà cung cấp

## 4. Thuế và chính sách (verify từ `data/tax.json` + API)

### Mã `3307.49.10` - từ data/tax.json (repo, đã verify)

| Field | Value | Nguồn |
|-------|-------|-------|
| `tt` (NK ưu đãi) | **30%** | data/tax.json["33074910"]["tt"] |
| `mfn` (MFN) | **20%** | data/tax.json["33074910"]["mfn"] |
| `acfta` | **0%** | data/tax.json["33074910"]["acfta"] (ghi "0 (-KH)" - 0% trừ Campuchia) |
| `vat` | **8/10** | data/tax.json["33074910"]["vat"] |
| `bvmt` | (rỗng) | data/tax.json |
| `cs` (chính sách) | (rỗng) | data/tax.json |
| `dvt` (đơn vị tính) | kg | data/tax.json |

### Verify qua API (production)

`GET https://hs-kb.uythacnhapkhau.com/api/tax?hs=33074910` trả:
- `taxNkTt: "30"` ✓
- `taxNkPreferential: "20"` (verify MFN = 20%, khớp với data/tax.json)
- `taxAcfta: "0"` ✓ (ghi chú "(-KH)" = trừ Campuchia)
- `taxVat: "8/10"` ✓
- `policyLevel: "NONE"` ✓
- `hasPolicyWarning: false` ✓
- `policyLines: []` (không có cảnh báo KTCL)

### So sánh thuế giữa các phương án (nếu từ TQ, có C/O Form E)

| Mã | tt (NK ưu đãi) | mfn (MFN) | ACFTA | VAT | Chênh vs 3307.49.10 |
|----|---|---|---|---|---|
| **3307.49.10** ⭐ | 30% | 20% | 0% | 8% | - |
| 3307.49.90 | 30% | 20% | 0% | 8% | cùng mức |
| 3307.90.40 | 30% | 20% | 0% | 8% | cùng thuế nhưng CÓ blocking policy |
| 3307.90.90 | 27% | 18% | 0% | 8% | -3% NK nhưng CÓ blocking policy |
| 7013.99.00 | 22.5% | 15% | 0% | 8% | -5% NK nếu không C/O; -20% với C/O; NHƯNG có NOTICE policy |

## 5. Chính sách quản lý chuyên ngành (KTCL)

- ✅ **Không thuộc danh mục KTCL** (policyLevel: NONE, hasPolicyWarning: false, policyLines: [])
- ✅ Không cần giấy phép đặc biệt (không phải mỹ phẩm, không phải thuốc)
- ✅ Không cần kiểm tra chất lượng nhà nước
- ✅ Không bị cấm/hạn chế nhập khẩu
- ⚠️ Cần **kiểm tra nhãn** (nhãn tiếng Việt, thành phần, hạn sử dụng)
- ⚠️ Cần **kiểm tra C/O Form E** nếu muốn hưởng 0% NK (đã có sẵn trong data)

## 6. Hồ sơ nhập khẩu cần chuẩn bị

| STT | Chứng từ | Ghi chú |
|-----|----------|---------|
| 1 | Tờ khai hải quan | ECUS mô tả: "Chế phẩm làm thơm phòng, dạng lỏng, đóng trong lọ thủy tinh có nắp gỗ và dây treo, dùng để tỏa hương trong xe ô tô, mã HS 3307.49.10" |
| 2 | Hợp đồng mua bán | - |
| 3 | Invoice + Packing list | Có thành phần tinh dầu, nồng độ |
| 4 | Bill of Lading / Airway bill | - |
| 5 | **C/O Form E** | Nếu muốn hưởng 0% NK (mã này đã được hưởng ACFTA) |
| 6 | MSDS (Material Safety Data Sheet) | Tùy NCC, không bắt buộc |
| 7 | Nhãn sản phẩm | Theo Nghị định 43/2017/NĐ-CP về nhãn hàng hóa |

## 7. Lưu ý đặc biệt

1. **Phân biệt với mỹ phẩm** (3307.90.40): Nếu nhà cung cấp ghi "perfume" hoặc "fragrance for body" → 3307.90.40 có **BLOCKING policy** (cần đăng ký lưu hành 19/2024/TT-BYT). Cần ghi rõ trên nhãn "Room freshener / Car air freshener" chứ không ghi "perfume".

2. **VAT 8% có thời hạn**: Chính sách giảm VAT 10% → 8% theo 174/2025/NĐ-CP chỉ có hiệu lực đến **31/12/2026** (còn 82 ngày). Sau thời điểm này về 10%.

3. **ACFTA "0 (-KH)"**: Nghĩa là thuế 0% cho hầu hết các nước ACFTA, TRỪ **Campuchia** (vì nước này có MFN cao hơn).

4. **Mô tả ECUS nên ghi**: "Chế phẩm làm thơm phòng dạng lỏng, thành phần: hương liệu + dung môi, đựng trong lọ thủy tinh có nắp gỗ và dây treo, dùng để tỏa hương trong xe ô tô, mã HS 3307.49.10" - tránh ghi "lọ tinh dầu" chung chung.

5. **Nếu nghi ngờ có tinh dầu nguyên chất (>50%)**: có thể xếp **3301** (tinh dầu), nhưng thực tế sản phẩm bán lẻ thường là chế phẩm (tinh dầu pha loãng) → 3307.49.10 phù hợp hơn.

6. **Lưu ý pháp lý theo chú giải 33.07**: "Các nhóm từ 33.03 đến 33.07 áp dụng... cho các sản phẩm, **đã hoặc chưa pha trộn**... **phù hợp dùng cho các hàng hoá đã ghi trong các nhóm này**" → không phụ thuộc vào bao bì (lọ thủy tinh hay nhựa đều được).

## 8. Test bằng API tự động

```bash
# Tra cứu
curl "https://hs-kb.uythacnhapkhau.com/api/tax?hs=33074910"
curl "https://hs-kb.uythacnhapkhau.com/api/tax?hs=33074990"
curl "https://hs-kb.uythacnhapkhau.com/api/tax?hs=70139900"

# Tra mô tả
curl "https://hs-kb.uythacnhapkhau.com/api/suggest" \
  -H "Content-Type: application/json" \
  -d '{"description":"Lọ tinh dầu thủy tinh treo xe ô tô, nắp gỗ, dây thừng, tỏa hương"}'

# Xem tiền lệ
curl "https://hs-kb.uythacnhapkhau.com/api/precedents?hs=33074910&limit=10"

# Smoke test (tự động 19 endpoint)
node scripts/qa-api-smoke.mjs
```

## 9. Kết luận

> **Mã HS chính xác: 3307.49.10 - "Các chế phẩm làm thơm phòng, có hoặc không có đặc tính khử trùng"**
>
> - **Thuế NK:** tt=30% (ưu đãi), mfn=20% (verify từ data/tax.json), ACFTA=0% (-KH)
> - **VAT:** 8% (đến 31/12/2026 theo 174/2025/NĐ-CP)
> - **KTCL:** Không có yêu cầu đặc biệt (policyLevel: NONE)
> - **Tiền lệ:** TB-TCHQ 5189/2018 (cùng nhóm 3307.49.10) - chế phẩm làm thơm phòng
> - **Mức độ tự tin:** ★★★★☆ (Cao - đã xác minh từ data/tax.json + API, có tiền lệ cùng nhóm, GIR 1 rõ ràng; trừ 1 sao vì không có tiền lệ trực tiếp cho lọ tinh dầu treo xe)

---

**Nguồn trích dẫn:**
- Chú giải nhóm 33.07 (heading note từ API `/api/notes?hs=33070000`)
- [TB-TCHQ 5189/2018] - "Chế phẩm làm thơm phòng, thành phần chính có chứa hương liệu, chất mang gel, nước..., dạng rắn" → 3307.49.10
- [WCO Explanatory Notes to HS 2022] - Chú giải 33.07
- [ACFTA Agreement - Annex 2 PSR]
- [174/2025/NĐ-CP] - Giảm thuế GTGT 8% đến 31/12/2026
- Biểu thuế XNK ưu đãi Việt Nam 2026 - data/tax.json (hs-code-api repo)

**Trường hợp cần CEO duyệt:**
- Nếu NCC khẳng định chỉ là **lọ rỗng** (không có tinh dầu) → 7013.99.00
- Nếu có **chai tinh dầu đi kèm** riêng → có thể khai 2 dòng (lọ + tinh dầu) hoặc bộ theo GIR 3(b)
