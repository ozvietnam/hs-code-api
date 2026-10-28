# Sổ tay chú giải — GÓI VIỆC NGƯỜI SOẠN (một lô)

> Tầng vận hành cho vai SOẠN. Đọc [`LUAT-CHUNG.md`](LUAT-CHUNG.md) TRƯỚC khi làm. Không cần đọc trọn `so-tay-giao-ngoai.md`.

## Các bước (lệnh có sẵn)

```bash
git clone https://github.com/ozvietnam/hs-code-api.git && cd hs-code-api && npm ci
LO=012; NHOM="$(awk -F, -v l=$LO '$1==l{gsub(/ /,",",$2); print $2}' docs/giao-viec/so-tay-lo.csv)"
git checkout -b so-tay/lo-$LO origin/main

# 1. Xuất nguồn và hướng dẫn (không cần khoá AI)
node scripts/build-so-tay.mjs --nhom=$NHOM --xuat-nguon=tmp/so-tay/nguon
#    → tmp/so-tay/nguon/_he-thong.txt  (lược đồ + luật, ĐỌC TRƯỚC)
#    → tmp/so-tay/nguon/<nhom>.txt     (nguồn nguyên văn, đọc HẾT)

# 2. Soạn tmp/so-tay/raw/<nhom>.json cho từng nhóm theo _he-thong.txt

# 3. Tự kiểm bản nháp (chạy bao nhiêu lần cũng được)
node scripts/check-so-tay.mjs --raw=tmp/so-tay/raw

# 4. Nạp: máy kiểm lần cuối, bỏ mục hỏng, ghi báo cáo riêng của lô
node scripts/build-so-tay.mjs --nhom=$NHOM --tu-tep=tmp/so-tay/raw --force \
  --nguoi-soan="<tên agent/người>" --bao-cao=data/so-tay/bao-cao/lo-$LO.json
npm run so-tay:check && npm test

# 5. Commit: data/so-tay/<nhom>.json + data/so-tay/bao-cao/lo-$LO.json (KHÔNG commit tmp/)
git add data/so-tay && git commit -m "data(so-tay): lô $LO — <k> nhóm, <đạt>/<tổng> mục" && git push -u origin so-tay/lo-$LO
```

## Mô tả PR phải có

- tỷ lệ đạt;
- 3 mục mẫu (1 loại trừ, 1 điều kiện số, 1 dòng 8 số);
- các nhóm có nguồn mỏng hoặc bất thường (theo mẫu phần 1 của `so-tay-giao-ngoai.md`);
- những mục `dieuKien` có ghi điều mà câu trích không nói.

## Lỗi máy TỰ LOẠI (biết trước để khỏi tốn vòng kiểm lại)

| Kiểu lỗi | Máy xử lý |
|---|---|
| `dieuKienVao` lấy từ tên phân nhóm WCO / SEN / dòng biểu thuế, trình bày như điều kiện vào cả nhóm 4 số ("công suất ≤ 750 W", "chu vi > 60 cm") | **Máy loại** (`dieu-kien-cap-phan-nhom`). Điều kiện phân nhóm thuộc `dong8` |
| `dieuKienVao` từ câu CHO PHÉP ("vẫn được phân loại ở đây ngay cả khi…", "đã hoặc chưa…") đặt `=true` | **Máy loại** (`dieu-kien-chi-cho-phep`) |
| `loaiTru` mà câu nguồn nói "thường thuộc nhóm X", "tùy trường hợp" | **Máy loại** (`loai-tru-chi-la-thuong`) |
| `phanBiet` có `hoi` nhắc mã phân nhóm hoặc "WCO" | **Máy loại** (`hoi-nhac-ma-phan-nhom`) |
| `loaiKhac` của dòng 8 số mỗi agent hiểu một kiểu | **Máy tự điền** theo biểu thuế (tên dòng bắt đầu bằng "Loại khác") |
