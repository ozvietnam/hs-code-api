# Soát độc lập lô S3 — 50 bản ranh giới chương 70-97

**Phiên soát**: `claude-code:<timestamp>#soat-s3` (TBD khi bắt đầu soát)

**Issue**: #1106

**Quy trình**: Soát theo `docs/giao-viec/so-tay/SOAT-RANH-GIOI.md`.
- Kiểm (`--kiem`) từng PN6
- Xem chi tiết (`--ve`) + soát theo 5 cổng + tiền lệ + bảng hiệu chỉnh
- Duyệt + áp dụng hoặc trả về với lý do

## Kết luận soát (50 PN6)

| PN6 | Kết luận | Lý do / Cạnh báo |
|-----|----------|------------------|
| 721070 | **TBD** | Kiểm trước |
| 721240 | **TBD** | |
| 722870 | **TBD** | |
| 722990 | **TBD** | |
| 722611 | **TBD** | |
| 848330 | **TBD** | |
| 721491 | **TBD** | |
| 720839 | **TBD** | |
| 721499 | **TBD** | |
| 722691 | **TBD** | |
| 721230 | **TBD** | |
| 722850 | **TBD** | |
| 721710 | **TBD** | |
| 760612 | **TBD** | |
| 901910 | **TBD** | |
| 721119 | **TBD** | |
| 722699 | **TBD** | |
| 730890 | **TBD** | |
| 760429 | **TBD** | |
| 852990 | **TBD** | |
| 700521 | **TBD** | |
| 720916 | **TBD** | |
| 721640 | **TBD** | |
| 722830 | **TBD** | |
| 732620 | **TBD** | |
| 760720 | **TBD** | |
| 847330 | **TBD** | |
| 850450 | **TBD** | |
| 702000 | **TBD** | |
| 722540 | **TBD** | |
| 722840 | **TBD** | |
| 850490 | **TBD** | |
| 850980 | **TBD** | |
| 901839 | **TBD** | |
| 940320 | **TBD** | |
| 701090 | **TBD** | |
| 720827 | **TBD** | |
| 720917 | **TBD** | |
| 721650 | **TBD** | |
| 722692 | **TBD** | |
| 730451 | **TBD** | |
| 740811 | **TBD** | |
| 851829 | **TBD** | |
| 721250 | **TBD** | |
| 721730 | **TBD** | |
| 722530 | **TBD** | |
| 722599 | **TBD** | |
| 730669 | **TBD** | |
| 831110 | **TBD** | |
| 841989 | **TBD** | |

## Lệnh kiểm cuối (khi xong)

```bash
# Kiểm máy
node scripts/check-so-tay.mjs
node scripts/check-cay.mjs
node scripts/test-so-tay.mjs
node scripts/test-cong-ranh-gioi.mjs
```

## Tóm tắt

- **Duyệt + áp dụng**: TBD
- **Trả về**: TBD (tỉ lệ cao là bình thường)
- **Đỏ không soát**: TBD
- **Lỗi / Không xác định**: TBD
