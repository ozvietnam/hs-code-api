# M-31 — Tách câu toàn kho luật gốc

Tất định (`scripts/luat-goc/cau.mjs`), không AI. Chữ câu không chép lại: đọc `nguyenVan.slice(tu, den)`.

| kho | nút | câu |
|---|---|---|
| bieu | 21478 | 21478 |
| chuong | 2439 | 4628 |
| gir | 54 | 161 |
| nhom | 20706 | 31890 |
| phan-nhom | 482 | 1986 |
| phan | 293 | 791 |
| sen | 730 | 3351 |
| thong-bao | 3085 | 10383 |
| wco | 980 | 4660 |

- Ghép câu = nguyên văn: đạt mọi nút, 9 kho (`cau.mjs --kiem`, nằm trong bộ kiểm CI).
- `dan`: id câu dẫn của mục liệt kê ("Nhóm này không bao gồm:"), theo `cha` của nút nếu có. Số câu có `dan`: 29589.
- Đoạn văn thường nằm dưới một mục KHÔNG thừa kế câu dẫn (ca thật 84.26: "Mặt khác, nhóm này bao gồm…" nằm ngay dưới danh sách loại trừ).
- Một câu duy nhất một id: `dan-chieu.js` đọc kho câu này qua `docKhoLuatGoc(…, {coCau:true})`; M-34 phải bật.
