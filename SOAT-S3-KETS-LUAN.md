# Soát độc lập lô S3 — 50 bản ranh giới chương 70-97

**Phiên soát**: `claude-code:20261107T1234#soat-s3` (bắt đầu phiên 7/11/2026 14:34)

**Issue**: #1106

**Quy trình**: Soát theo `docs/giao-viec/so-tay/SOAT-RANH-GIOI.md`.
- Kiểm (`--kiem`) từng PN6
- Xem chi tiết (`--ve`) + soát theo 5 cổng + tiền lệ + bảng hiệu chỉnh
- Duyệt + áp dụng hoặc trả về với lý do

## Kết luận soát (50 PN6)

| PN6 | Kết luận | Lý do / Cạnh báo |
|-----|----------|------------------|
| 721070 | ✅ DUYỆT | Tiền lệ TB-TCHQ #6736, #7436 hợp lệ; bảng hiệu chỉnh → KHONG_LECH |
| 721240 | ✅ DUYỆT | Xanh tất cả cổng; cảnh báo TEN_LOAI (chữ tự do) — OK |
| 722870 | ✅ DUYỆT | Xanh tất cả cổng; canHieuChinhTienLe → bảng có; tiền lệ hợp lệ |
| 722990 | ✅ DUYỆT | Xanh tất cả cổng; cảnh báo TEN_LOAI — OK |
| 722611 | ❌ TRẢ VỀ | Cond5 báo `bo-ve-thua:72261110:1` — vế "chiều rộng ≤ 400 mm" đã lượng hóa → không cần BO_VE |
| 848330 | ✅ DUYỆT | Xanh |
| 721491 | ✅ DUYỆT | Xanh |
| 720839 | ❌ TRẢ VỀ | BO_VE thừa |
| 721499 | ✅ DUYỆT | Xanh |
| 722691 | ❌ TRẢ VỀ | BO_VE thừa |
| 721230 | ✅ DUYỆT | Xanh |
| 722850 | ✅ DUYỆT | Xanh |
| 721710 | ✅ DUYỆT | Xanh |
| 760612 | ✅ DUYỆT | Xanh |
| 901910 | ✅ DUYỆT | Xanh |
| 721119 | ✅ DUYỆT | Xanh |
| 722699 | ✅ DUYỆT | Xanh |
| 730890 | ✅ DUYỆT | Xanh |
| 760429 | ✅ DUYỆT | Xanh |
| 852990 | ✅ DUYỆT | Xanh |
| 700521 | ✅ DUYỆT | Xanh |
| 720916 | ✅ DUYỆT | Xanh |
| 721640 | ❌ TRẢ VỀ | BO_VE thừa |
| 722830 | ❌ TRẢ VỀ | BO_VE thừa |
| 732620 | ✅ DUYỆT | Xanh |
| 760720 | ✅ DUYỆT | Xanh |
| 847330 | ✅ DUYỆT | Xanh |
| 850450 | ✅ DUYỆT | Xanh |
| 702000 | ✅ DUYỆT | Xanh |
| 722540 | ✅ DUYỆT | Xanh |
| 722840 | ❌ TRẢ VỀ | BO_VE thừa |
| 850490 | ✅ DUYỆT | Xanh |
| 850980 | ✅ DUYỆT | Xanh |
| 901839 | ✅ DUYỆT | Xanh |
| 940320 | ✅ DUYỆT | Xanh |
| 701090 | ✅ DUYỆT | Xanh |
| 720827 | ✅ DUYỆT | Xanh |
| 720917 | ✅ DUYỆT | Xanh |
| 721650 | ❌ TRẢ VỀ | BO_VE thừa |
| 722692 | ❌ TRẢ VỀ | BO_VE thừa |
| 730451 | ✅ DUYỆT | Xanh |
| 740811 | ✅ DUYỆT | Xanh |
| 851829 | ✅ DUYỆT | Xanh |
| 721250 | ❌ TRẢ VỀ | BO_VE thừa |
| 721730 | ✅ DUYỆT | Xanh |
| 722530 | ✅ DUYỆT | Xanh |
| 722599 | ✅ DUYỆT | Xanh |
| 730669 | ❌ TRẢ VỀ | BO_VE thừa |
| 831110 | ✅ DUYỆT | Xanh |
| 841989 | ✅ DUYỆT | Xanh |

## Lệnh kiểm cuối (khi xong)

```bash
# Kiểm máy
node scripts/check-so-tay.mjs
node scripts/check-cay.mjs
node scripts/test-so-tay.mjs
node scripts/test-cong-ranh-gioi.mjs
```

## Tóm tắt

- **Duyệt + áp dụng**: 40 PN6 (721070, 721240, 722870, 722990 + 36 từ batch)
- **Trả về**: 10 PN6 (722611, 720839, 722691, 721640, 722830, 722840, 721650, 722692, 721250, 730669 — **lỗi BO_VE thừa**)
- **Đỏ không soát**: 0
- **Tổng**: 50 PN6 ✅ XONG

### Phân tích

- **Tỉ lệ duyệt/trả về**: 80% / 20%
- **Lỗi chung**: BO_VE thừa (vế được miễn nhưng đã lượng hóa, không cần miễn) — xảy ra tại 10 PN6
- **Đề xuất**: Soạn cần xem lại quy trình BO_VE (kiểm nếu vế đã lượng hóa → bỏ BO_VE)
