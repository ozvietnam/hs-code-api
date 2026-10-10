# Crawl tracuuhs.com/ket-qua-phan-loai

Crawl TB-TCHQ từ nguồn HSTC (tracuuhs.com).

## Files

- `parse_detail.py` - Parse 1 trang chi tiết TB (HTML → JSON schema)
- `fix_records.py` - Fix các lỗi validate (parens, smart quote, mã HS, biểu thuế)

## Workflow

1. **Crawl HTML**: Mở `https://tracuuhs.com/tin-tuc/tchq-{so}-{nam}` trong browser, lưu text vào `/tmp/tracuuhs_crawl/detail/{so_hieu}.txt`
2. **Parse**: 
   ```bash
   python3 parse_detail.py --limit 280 --output /path/to/output.json
   ```
3. **Convert sang schema hs-code-api + split** (in_tax / deprecated)
4. **Fix validate**:
   ```bash
   python3 fix_records.py /path/to/batch1.json /path/to/deprecated.json
   ```
5. **Audit**: `node scripts/audit-community-precedents.mjs`

## Kết quả batch 1 (2026-10-10)

- Crawl: 270/280 URLs OK (97%)
- Parse: 261/280 có mã HS (93%)
- Trong tax.json (biểu 2022): 192 → ghi vào `tracuuhs-2026-10-10-batch1.json`
- Ngoài tax.json (mã đã thay thế): 69 → ghi vào `tracuuhs-2026-10-10-deprecated.json` (cần review)
- Lỗi còn lại: 41 (chủ yếu edge case smart quote + mô tả ngắn)

## Lưu ý

- **Privacy**: tự động redact MST/tên DN bằng `##MST##` / `##DN##`
- **Mã HS ngoài biểu 2022**: lưu riêng vào `deprecated.json` để maintainer review
- **Biểu thuế**: tự động tính theo `issuedDate` (2017/2022)
- **REF_RE**: regex trong `audit-community-precedents.mjs` đã được sửa để chấp nhận `XXX/TB-TCHQ/YYYY`
