# M-10 Khái quát Phần, Chương, Phân chương: mỗi đoạn in một nút

Bệnh: `phan:XV:kq:4`, `phan:XVI:kq:1`… là cả khối nhiều đoạn nối thành một dòng; danh sách "(a)…(l)" sau "nhóm này không bao gồm:" mất xuống dòng nên câu không có `dan` (0/208 mục của kho Phần). `chuong.jsonl` cũng dính: 90 nút nối nhiều đoạn in, 42 chỗ cắt giữa đoạn, 26 chỗ xuống dòng thừa, và câu dẫn **sai** (Chương 63 "(2) Theo nhóm 63.08…" mang dẫn "phân chương này không bao gồm:"; Chương 26 (b)–(e) mang dẫn của (a); Chương 84 mục (B), (C) mang dẫn của (A)).

```
# sau phan-trich.mjs / chuong.py / tt31-ap.py (ba bước đó dựng kq kiểu cũ)
python3 scripts/luat-goc/kq-tach.py ~/luat-goc-txt/cgct-hs2022.txt ~/luat-goc-txt/doan-in-hs2022.tsv          # ghi phan.jsonl, chuong.jsonl
python3 scripts/luat-goc/kq-tach.py … --kiem                                                                   # dựng lại = kho (chạy lại không đổi)
node scripts/luat-goc/cau.mjs phan chuong
```

| | kq trước | kq sau | cả kho | câu kq có `dan` trước → sau | mục (a), (1), - … có `dan` |
|---|---|---|---|---|---|
| phan | 34 | 442 | 293 → 701 | 0 → 222 | 0/208 → 187/251 |
| chuong (kể cả Phân chương) | 967 | 2.099 | 2.439 → 3.571 | 884 → 1.009 | 762/906 → 803/906 |

- **Ranh giới đoạn**: cây cấu trúc PDF (`doan-in-hs2022.tsv`, như M-14). 113/113 khối khớp liền từng ký tự (hai bảng Phần XI bản chữ xáo cột: so theo bộ chữ, giữ chữ kho cũ).
- **Chữ lấy từ chính kho cũ**: bỏ khoảng trắng, ghép nút mới = ghép nút cũ (script dừng nếu sai). Dòng `***` kho cũ không chép thì không thêm, chỉ dùng làm ranh giới. Đoạn ngắt qua trang được nối (50 chỗ, `--bao` in ra).
- **id** đánh số lại liên tục `…:kq:n` (NGU_PHAP không đổi). `so` = số hiệu in. `cha` = đoạn dẫn kết bằng `:`, mục hoặc tiêu đề chứa nó; không có thì Phần / Chương / Phân chương. Dòng TỔNG QUÁT là một nút, không làm cha. Cây dựng bằng `dung_cay` của M-14; 17 chỗ sửa `cha` tay và 1 chỗ nối tay nằm trong script, có trang và lý do, không đổi chữ.
- Mục không có `dan` (64 + 103): dưới tiêu đề không phải câu dẫn ("(I) CÁC CHƯƠNG 50 ĐẾN 55"), hoặc Phần XI tr.1140 "(a)…(g)" câu dẫn in dấu chấm (có `cha` là câu đó).
- Kiểm: 0 mục nằm dưới câu kết "không bao gồm:" mà thiếu `dan` (75 câu dẫn loại trừ, 363 mục); 0 nút hai mục đầu dòng; đã đọc cây Phần VI, VII, XI, XV, XVI, XVII và Chương 28, 29, 39, 60, 69, 71, 72, 73, 84.
- Bản in thiếu số "(h)" ở Phần XV tr.1494: đoạn "Các bộ phận của giày, dép…" là con của câu dẫn, `so` null.

**Hệ quả**
- `doi-ma.json` dựng lại. Sửa `doi-ma-nguon.js` (M-35): `phan:NN` là số CHƯƠNG (50 → Phần XI), không phải số Phần (hàm cũ ra "L", "VI" cho chương 06); nối nhiều nút cho `phanNN.phan`; mối nối trước gạch đầu dòng; câu dẫn lặp lấy chỗ gần nhất. Không sửa thì 32 trích qua nhiều đoạn bị ghi nhầm là LUẬT CŨ.
- `nghia-canh` (M-33, #1956): bảng đổi câu và việc bỏ phiếu lại ở `~/ng3` trên máy dev; không bịa phiếu.
