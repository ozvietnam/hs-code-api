# Giao việc: dựng sổ tay chú giải cho các nhóm còn lại (giao agent ngoài)

- **Giao:** 2026-10-07. **Người duyệt và gộp:** Claude (phiên quản lý). Agent ngoài **không tự gộp** vào `main`.
- **Thiết kế:** [`docs/backlog/08-so-tay-chu-giai.md`](../backlog/08-so-tay-chu-giai.md).
- **Phạm vi:** 1.168 nhóm 4 số còn lại (đã trừ 60 nhóm bước 1, trừ chương 98), chia sẵn **195 lô** trong
  [`so-tay-lo.csv`](so-tay-lo.csv). Mỗi lô có tối đa 6 nhóm và ≤ 350 nghìn ký tự nguồn.
- **Một agent nhận một lô.** Ghi tên vào cột `nguoi_lam` và chuyển `trang_thai` sang `dang-lam`. Làm xong một lô thì mở **một PR**.

## 1. Kết quả bước 1 và bài học (60 nhóm, 07/10/2026)

Bước 1 do phiên quản lý giao cho 10 agent con, mỗi agent 6 nhóm. Agent con soạn sổ tay theo đúng quy trình dưới đây.

| | |
|---|---|
| Mục đạt máy kiểm | **2.237/2.274 (98,4 %)**, 0 nhóm lỗi |
| Sổ tay ghi được | 58 phạm vi, 317 điều kiện vào, 530 loại trừ, 236 câu hỏi phân biệt, 40 quy tắc bộ phận, 1.056 dòng 8 số. 20 nhóm có dùng SEN |
| Chi phí mỗi agent (6 nhóm) | 145–280 nghìn token, 5–13 phút |
| Chi phí mỗi nhóm | ≈ 35 nghìn token. Nhóm dài nhất (8504, 78 nghìn ký tự nguồn) tốn gấp đôi |
| Soát tay ngẫu nhiên 13 mục | 13/13 đúng nghĩa |

Lỗi tìm được trong lúc làm, và cách đã xử lý:

| Lỗi | Xử lý |
|---|---|
| Các trường `bao_gom`, `khong_bao_gom`, `loai_tru`, `phan_biet`, `tinh_chat` thu qua KG là tóm tắt hoặc cắt dán, có chỗ gán nhầm nhóm (8480 mang nội dung 8482; 3307 mang chú giải Chương 34; 2917 khẳng định sai) | Máy kiểm **chỉ cho trích văn bản pháp lý nguyên văn**. Mục ghi các trường đó mà câu có nguyên văn ở nguồn thật thì được gắn lại nguồn, còn lại bị loại |
| Chú giải Phần của ch.39 và ch.40 là chú giải Phần VI, không phải Phần VII | Máy kiểm bỏ `phan<ch>.phan` khi văn bản không thuộc đúng Phần |
| Dòng biểu thuế VN chỉ ghi "- - - Loại khác", thiếu tên phân nhóm cha | Thêm nguồn `wco.<6 số>` (tên phân nhóm WCO) |
| Chú giải chương bị cắt trong prompt (ch.72 mất mục (IV)(B)) | Nới trần: chương 40 nghìn, Phần 25 nghìn ký tự |
| `phanBiet` trỏ tới mã mà câu trích không nêu (3812 → 2917 trong khi nguồn chỉ nói "Chương 29") | Máy kiểm loại câu này |
| Ghép hai câu xa nhau thành một kết luận (mạch MCO → 85.42) | Prompt cấm. **Máy chưa bắt được**, người duyệt phải soát |
| Agent ghi tên phân nhóm theo hiểu biết riêng vào `dieuKien` | Prompt cấm, có nguồn `wco` thay thế. **Máy không kiểm `dieuKien`**, người duyệt phải soát |

Lỗi của dữ liệu nguồn (kệ sách), cần sửa riêng chứ không sửa trong sổ tay:

- 8518: chú giải nhóm có đoạn "………", thiếu các phần B–D.
- 1702: mất dòng đầu.
- 3208, 4202: mất dòng tên nhóm.
- Chú giải nhóm còn dùng số hiệu chú giải chương cũ (8541 ghi "Chú giải 8 (a)", bản hiện hành là 12(a)).
- SEN gắn ở dòng cha: 8504 (đầu điện áp cao), 8536.

## 2. Gói việc cho một lô

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

Mô tả PR phải có:
- tỷ lệ đạt;
- 3 mục mẫu (1 loại trừ, 1 điều kiện số, 1 dòng 8 số);
- các nhóm có nguồn mỏng hoặc bất thường (theo mẫu phần 1);
- những mục `dieuKien` có ghi điều mà câu trích không nói.

## 3. Luật bắt buộc (máy kiểm phần lớn, phần còn lại người duyệt soát)

1. Chỉ trích từ các nguồn trong tệp `<nhom>.txt`: `nhom<4>.nhom`, `ch<2>.chuong`, `phan<2>.phan`, `sen.*`, `tax.*`, `wco.*`.
2. `trich` là câu chép **nguyên văn** từ đúng nguồn ghi ở `nguon`, ≤ 300 ký tự. Được lược bằng "…". Giữ nguyên lỗi chính tả gốc.
3. `loaiTru` chỉ ghi khi nguồn **nêu đích danh** nhóm đích, và số nhóm phải có trong câu trích. Không tính số nhóm chỉ là ví dụ linh kiện, dải "từ X đến Y" hay "Chương N".
4. `phanBiet`: mã ngoài nhóm phải có trong câu trích.
5. `dieuKienVao` dạng số: số đó phải có trong câu trích.
6. `dong8`: đủ mọi dòng `tax.*` của nhóm. Có SEN thì ưu tiên điều kiện từ SEN. Dòng trùng chữ mà nguồn không phân biệt được thì ghi rõ, không đoán.
7. Không ghép hai câu xa nhau thành một kết luận. Không thêm hiểu biết riêng vào `dieuKien`/`text`.
8. Không sửa mã, nguồn hay câu trích để máy kiểm cho qua. Không trích được thì **xoá mục**.

## 4. Người duyệt (phiên quản lý) làm gì với mỗi PR

- CI xanh, `so-tay:check` xanh, tỷ lệ đạt của lô ≥ 95 %.
- Soát ngẫu nhiên ≥ 10 % số mục: `dieuKien`/`hoi` có đúng nghĩa với câu trích không, có ghép câu hay thêm hiểu biết riêng không.
- Bổ sung lỗi kệ sách mới phát hiện vào phần 1. Lỗi lặp lại thì đưa thành luật máy (`lib/so-tay.js`) cho các lô sau.
- Đạt thì gộp và cập nhật `so-tay-lo.csv` (`trang_thai=xong`, `pr`).

Ước tính toàn bộ 195 lô: khoảng 40 triệu token. 10 agent chạy song song thì khoảng 4 giờ.
