# M-14 Chú giải chi tiết 1.228 nhóm

Kho: `data/luat-goc/nhom.jsonl`, **một đoạn in một nút**. Tất định, không mạng, không AI. Nguồn duy nhất: PDF "Chú giải chi tiết HS 2022 Toàn tập"; mã nhóm đối chiếu `data/tax.json`.

```
# một lần, ở máy có PDF và poppler (PDF Word có sẵn cây cấu trúc: mỗi đoạn một thẻ P, mỗi tiêu đề nhóm một thẻ H4)
pdfinfo -struct-text "Chu giai HS 2022 Toan tap (HQKV8).pdf" > struct.txt
python3 scripts/luat-goc/nhom-doan-in.py struct.txt > ~/luat-goc-txt/doan-in-hs2022.tsv      # sha256 87f8ceb4…669ae
python3 scripts/luat-goc/nhom-tach.py ~/luat-goc-txt/cgct-hs2022.txt ~/luat-goc-txt/doan-in-hs2022.tsv   # ghi nhom.jsonl
python3 scripts/luat-goc/nhom-kiem.py ~/luat-goc-txt/cgct-hs2022.txt [nhom.jsonl của 1dd2dadc]            # bất biến
LUAT_GOC_TXT=~/luat-goc-txt node scripts/kiem-luat-goc.mjs nhom                              # cổng
```

## Số đếm
- **20.706 nút / 1.228 nhóm**; 15.285 nút có `cha`, 12.135 nút có `so`, 2.200 nút kết bằng `:`, 372 nút qua trang (`trangDen`), 0 nút thiếu trang. Sâu nhất 8 tầng.
- 41 nhóm 98xx không có nút; 20 dòng tham chiếu `[NN.NN]` không tạo nút; Chương 77 không có chữ.
- Phụ lục tiếng Anh không vào nút: 29.37 (trang 595–625, thân in tiếp từ mục (C)), 29.42 (642–682), 33.07 (759–761), 44.21 (1014–1049), 71.18 (1482–1487).

## Ranh giới đoạn lấy từ đâu
Không đoán từ dòng: PDF do Word xuất có cây cấu trúc (tagged). Bỏ khoảng trắng, dải chữ của cây trùng bản `-layout` từng ký tự ở 1.230/1.231 thân nhóm (trừ bảng in cột 28.05). Kiểm bằng toạ độ (`pdftotext -bbox-layout`), hai dòng liền nhau cùng trang:
- trong một đoạn: 28.6 nghìn cặp, cách 16–22 pt (95% đúng 19 pt) – **không cặp nào ≥ 24 pt** trừ 9 cặp đo lệch dòng ⇒ không có hai đoạn bị nhập một;
- giữa hai đoạn: 21–28 pt; 403 cặp < 21 pt: xem 40 cặp, đều là mục `-`/(n) xếp sít, tiêu đề ngắn hoặc dòng câu dẫn lặp (toạ độ khớp nhầm) – ranh giới đúng.

Luật thêm:
1. Đoạn bị ngắt qua trang được nối (362 chỗ): đoạn sau mở bằng chữ thường, hoặc đoạn trước chưa hết câu và dòng cuối đầy dòng, hoặc hai nửa tiêu đề CHỮ HOA.
2. Câu dẫn kết bằng `:` in liền cuối một đoạn văn thường, ngay trước danh sách ⇒ nút riêng. Mục (A), (1)… kết bằng `:` giữ nguyên một nút và là cha của danh sách con.
3. Dấu trang trí (`***`, `º º`), dòng chỉ có "hoặc", dòng chấm gắn cuối đoạn trước sau `\n`. Bảng = một nút, mỗi hàng một dòng.
4. `cha`: ngăn xếp số hiệu (I)(A)(1)(a)(i), I., A., 1., a., `-`; (ij) gộp i–j; (i)/(I) đọc La Mã hay chữ cái theo mục kế. Mục đầu danh sách: cha là câu dẫn `:` ngay trước, không thì mục / tiêu đề ngay trước, không thì cùng cha với đoạn trước. Đoạn văn giữa hai mục cùng danh sách: cha là mục trước. Tiêu đề CHỮ HOA (có hoặc không số hiệu, "BỘ PHẬN") là cha tới tiêu đề cùng cấp. Đoạn sau mục **cuối**: theo nếp của các mục trước; "Nhóm này không bao gồm:" ở cuối nhóm trả về gốc (`null`), trừ khi mục trước cũng có danh sách loại trừ riêng.
5. `tenIn` (nút đầu) = tiêu đề in trọn; `so` = số hiệu in của mục.

Tiêu đề: 1.228/1.228 có `tenIn`; so tên nhóm ở `bieu.jsonl`: 1.000 trùng khít, 223 lệch vài chữ dịch, 5 bản in khác hẳn tên biểu (95.08, 96.20, 27.16, 40.11, 84.62 – đã xem, tiêu đề trọn). 83 nhóm có mảnh tiêu đề / danh sách mã lọt vào thân bản 1dd2dadc (93.02 "93.04."; 02.07, 03.02, 03.03 cả danh sách mã) đã bỏ.

## Bất biến (`nhom-kiem.py`)
- **(a)** 20.705/20.706 nút là dải liền, đúng thứ tự trong bản `-layout` (còn lại: một nút bảng 28.05). So chữ bản 1dd2dadc theo nhóm: 1.084 y hệt; 75 chỉ bớt mảnh tiêu đề / mã ở đầu; 60 chỉ khác dấu nối cuối dòng; 2 được trả lại đoạn bị nuốt vào tiêu đề (29.11, 65.01); 29.20 bớt ba đoạn "Phân-Chương IX…" (thuộc `chuong:29:pc:IX`, kho M-13 đã có); 2837, 2921, 2931, 2937, 2939 cùng chữ khác thứ tự dòng công thức; 40.01 thêm ô "60 60 50 40 30" của bảng bị rơi.
  - Dấu nối: bản 1dd2dadc dựng từ bản chữ `-agy` nên mất dấu nối thật ở cuối dòng ("1400-1800°C" thành "14001800°C", "ortho-benzened…"). Bản này theo `-layout`, `-raw` và cây PDF (ba nguồn khớp nhau).
- **(b)** 0 nút có hai câu dẫn trái chiều; 0 nút có hai mục đánh số ở đầu dòng. Liệt kê **viết liền trong câu** giữ nguyên, không tách: 34.02 ct:2, 58.04 ct:4, 84.56 ct:11 (và vài chỗ "(i)… và (ii)…", "(a)… hoặc (b)…" trong 13.02, 29.37, 38.09, 84.43, 85.19, 90.25, 96.19).
- **(c)** 0 vi phạm: cha đứng trước, cùng nhóm, không vòng; số thứ tự liền; trang không lùi.
- **(d)** So dấu `\n\n` của `.nhom` (1.186 nhóm trùng chữ): 19.463 ranh giới chung, 880 chỉ có ở kho cũ, 262 chỉ có ở kho mới (lệch 5,5%); 631 nhóm trùng mọi ranh giới. 42 nhóm chữ khác (kho cũ dính nhóm khác / bảng) không so được ranh giới.
  - *Chỉ kho cũ*: cắt theo đầu dòng – 460 giữa câu, 420 ở câu bắt đầu đúng đầu dòng (dòng trước đầy dòng, cách dòng 19 pt ⇒ bản in không xuống đoạn). *Chỉ kho mới*: "BỘ PHẬN" bị kho cũ dính vào đoạn sau, và câu dẫn tách theo luật 2.
  - Đã xem tay 42 nhóm lệch nhiều nhất và 42 nhóm ngẫu nhiên có lệch: chỉ gặp hai nguyên nhân trên; đọc cả cây 7616, 9302, 8205, 8536, 8481, 8471, 3926, 6307, 2106, 8708, 9403, 4418 và 0102, 1905, 2309, 2844, 3402, 8414, 8443, 9018, 9503.
- Không trùng kho khác (phan, chuong, phan-nhom): 0 nút. Mọi đoạn in còn lại ngoài kho là tên / chú giải Chương–Phần, danh sách mã, phụ lục, chú thích ảnh.
- `cau.mjs` (M-31) chạy thử trên kho này: PASS; mục trong danh sách loại trừ có `dan` đúng câu dẫn 2.817/2.910. Phần lệch do `cau.mjs` bỏ qua `cha` với nút `:ct:` khi danh sách lồng nhau / có đoạn xen; nên dùng `cha` trước.

## Sửa tay (trong `sua_tay()`, có trang và lý do, không đổi chữ)
- **7302** (trang 1543, tiêu đề in `37.02-`), **9029** (trang 2263, in `90.20 -Máy đếm…`): nút theo mã trong danh sách mã ngay dưới, kèm `ghiChu`.
- **2937**: "(C) PROSTAGLANDINS…" trang 625 mở lại thân sau phụ lục (ct:63). **7212** ct:3, **7217** ct:15: đoạn không nêu mã phân nhóm, theo chỉ dẫn QT ở #1902.
- Không có sửa tay ranh giới đoạn.

## Chỗ chưa chắc
- Khoảng 12 đoạn có thể bị ngắt qua trang **đúng chỗ hết câu** (dòng cuối trang đầy dòng, kết bằng "."): không phân biệt được với đoạn hết thật, để nguyên hai nút (ví dụ 19.01, 51.05, 97.04).
- `cha` của đoạn đứng sau mục cuối danh sách là suy theo nếp (bản in không thụt đoạn tiếp của mục): chữ không đổi, chỉ `cha` có thể là mục cuối hay cấp trên.
- Số hiệu in sai thứ tự giữ nguyên, xếp cùng danh sách (32 chỗ: 2841 "(j)…(g)", 8501 "(í)", 7106 "(II)" lặp, 2844 hai "(c)", 8708 thiếu (M)…).
- Dòng trống chữ trong bản in (85.18 "………") giữ nguyên.
- Công thức / hình không có chữ trong PDF (Chương 29, 57) không rút được.
