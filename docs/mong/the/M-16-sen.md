# M-16 – Chú giải bổ sung SEN 2022 (`data/luat-goc/sen.jsonl`)

**Có bản gốc.** Phụ lục kèm CV 3866/TCHQ-TXNK ngày 24/07/2023, tệp Word 55.807.488 byte, sha256 `ccc50ef8…07e7`, trùng kích thước từng byte với `chu_giai_SEN_2022.doc` trong thư mục Drive `chu_gia_SEN_2022` của CEO (cùng thư mục với PDF 386 trang mà `data/sen-2022.json` đã nhập). Kho này rút lại từ bản Word, không gộp hai kho cũ. Không commit bản gốc.

```
soffice --headless --convert-to docx:"MS Word 2007 XML" sen_2022.doc
python3 scripts/luat-goc/sen.py sen_2022.docx
antiword sen_2022.doc > raw.txt ; soffice --headless --convert-to pdf sen_2022.doc ; pdftotext -raw sen_2022.pdf pdf.txt
python3 scripts/luat-goc/sen-ban-chu.py raw.txt pdf.txt sen_2022.docx > <thư mục riêng>/sen.txt
LUAT_GOC_TXT=<thư mục riêng> node scripts/kiem-luat-goc.mjs sen
python3 scripts/luat-goc/sen-doi-chieu.py sen_2022.docx --ghi
```

## Số đếm
- Bản gốc có **397 mục có mã** (692 mã khác nhau) + 4 mục không mã. → **722 nút**: 720 `sen:` (677 mã 8 số, 1 mã 6 số, 42 mã nhóm 4 số) + 2 `chuong:87:cgbs`. Mỗi mã in ra một nút, cùng chữ, cùng `apChung` (448 nút), như kho phân nhóm. 28 nút `sen:…:2`/`:3`: cùng mã có mục thứ hai, thứ ba.
- Mọi mã in đều còn trong biểu. `39.01 - 39.12` trải ra 12 nhóm có thật. `271012.39` (in thiếu dấu chấm) giữ ở `so`.
- `nguyenVan` = dòng mã + tên mục + thân + dòng "(Nguồn: …)" như in. Hàng hai cột lấy cột tiếng Việt; hàng không chia cột (hình kèm lời song ngữ, bảng song ngữ) chép cả hàng. Bảng: mỗi hàng một dòng, ô cách nhau bằng tab. Chỉ số trên/dưới (m², CO₂) thành chữ thường.
- 453 nút có hình (`thieu`). Nhiều hình là ảnh có lời in sẵn bên trong (vd 0704.90.20 "Đầu hoa", 3924 lời hình): **chưa rút chữ trong hình**, chỉ đọc mắt 4 mục rỗng dưới đây.
- 24 chương bản gốc ghi "chưa có chú giải bổ sung" (77: "dành để sử dụng sau này"): 5 41 43 45 46 50 51 58 60 65 66 67 71 75 77 78 80 81 82 88 89 91 92 97. Chương 86 không có cả dòng tiêu đề.

## Kiểm
- Cổng có đối chiếu: **PASS, 722 nút, 0 lỗi, 0 cảnh báo**. `sen.txt` không đụng `data/`: gồm hai lần đọc khác của cùng bản Word (bản chữ kiểu antiword có sẵn cạnh tệp Word từ 04/2026, sha256 `4d2ac440…`; PDF do LibreOffice chuyển, qua pdftotext).
- **Điều phải biết về PASS:** chỉ với hai lần đọc đó thì 690/722 nút qua, 32 nút (14 mục có bảng nhiều cột hoặc hình đôi) đỏ vì hai lần đọc xếp ô theo thứ tự khác. `sen-ban-chu.py` thêm đoạn rút từ .docx cho đúng 14 mục đó. Bù lại: kiểm từng ô, từng dòng của **mọi** mục (3.000 ô/dòng) trong hai lần đọc độc lập: 0 ô không thấy; soi ảnh trang 0704.90.20, 3917.32.20, 4001.21, 4001.22.
- Chiều ngược (không sót): mọi câu tiếng Việt của bản antiword từ Chương 1 đều có trong mục, trừ tiêu đề chương, câu "chưa có chú giải bổ sung", và chính các bảng nhiều cột kể trên.
- **Trang**: là trang PDF 386 trang (từ `data/sen-2022.json`, khớp đúng bộ mã). Word chuyển PDF ra 388 trang, lệch 0–2 trang, tăng dần theo sách. **Thiếu trang 16 nút**: 2 nút 2710.12.31/39 (khoảng tr. 122), 12 nút 39.01–39.12 (khoảng tr. 168), 2 nút Chương 87 (khoảng tr. 355).

## Hai kho cũ so với bản gốc
- `.sen` trong `chu-giai-heading.json`: 236 nhóm, dựng lại từ `sen-2022.json` giống **từng ký tự** cả 236. Hai nguồn là một, không lệch nhau; lỗi của kho này là lỗi của kho kia.
- `sen-2022.json` 395 mục: 306 giống hệt bản gốc (trừ dòng Nguồn cuối mục), 67 chỉ thiếu chữ (chủ yếu lời hình), 2 chỉ thừa chữ, 20 vừa thiếu vừa thừa (phần lớn là đảo thứ tự ô trong bảng). Đáng kể:

| Mục | Lỗi của kho cũ |
|---|---|
| 2710.12.31, 2710.12.39 (xăng máy bay) | **mất mục**, cả mục bị nuốt vào 27.10 (thừa 3.076 ký tự) |
| 39.01–39.12 (DẠNG PHÂN TÁN) | **mất mục** |
| Phần XI (batik) | mất mục, bị nuốt vào 4911.99.40 (nhãn in!) |
| Phần XV (cách đo ống), Chương 87 (dạng CKD; khối lượng toàn bộ) | mất mục |
| 4001.21, 4001.22 | bảng bị cắt đôi (mất 2.407 và 1.380 ký tự), lẫn chữ Anh |
| 3922.90.11, 0810.90.94, 4823.90.91 | mất 430, 333, 470 ký tự |
| 2701.12.10, 3907.99.50 | lẫn mẩu chữ Anh; mất lời hình |

Danh sách đủ: chạy `sen-doi-chieu.py`. Theo bản gốc, không gộp chữ kho cũ.

## Mục rỗng (4, không phải 3): THIẾU trong nguồn
Bản gốc chỉ có tên mục và hình. Ghi ở `thieu`, không bù chữ: 3924.90.20 (tr. 194; lời in trong hình, đọc mắt: "Núm vú", "Khung ngực (không phải là miếng che ngực, cũng không phải bộ phận của máy hút sữa)"), 70.03–70.05 (tr. 278), 8414.80.42 (tr. 326), 8708.92.52/62 (tr. 365): lời hình chỉ có tiếng Anh. Bản gốc đã đọc, không phải lỗi rút.

## 971 dòng biểu có "(SEN)" (bảng từng dòng: `M-16-dong-sen.md`)
| Kết luận | Dòng |
|---|---|
| Có mục đúng mã 8 số | 646 |
| Mục cấp 5–7 số phủ | 5 |
| Mục cấp 4 số phủ | 236 |
| SEN cấp Chương 87 (dạng CKD; khối lượng toàn bộ theo thiết kế) | 23 |
| SEN cấp Phần XI (batik), chưa có id | 53 |
| **KHÔNG CÓ mục nào** | **8** |

8 dòng không có: 0303.23.00, 0304.31.00, 0304.61.00 (rô phi; mục rô phi chỉ in mã 0301.99.41), 1602.90.90, 2104.20.91 (mục cùng tên chỉ in 2104.10.11/91), 3822.90.10, 8404.90.11, 8404.90.21 (mục "thân, vỏ nồi hơi" chỉ in 8402.90.10, 8403.90.10). Không gán sang.

"Phủ" là theo mã, chưa xét mục 4 số có nói về dòng đó không. Hai hàng Chương 87 và Phần XI nhận theo đúng thuật ngữ in kèm "(SEN)" trong tên dòng của biểu; chỉ là kết luận trong bảng này, không ghi thành cạnh.

## Chờ QT quyết
1. **Mục cấp Phần chưa có id trong khuôn** (cổng M-01 chỉ nhận `sen:<4–8 số>`), nên CHƯA vào kho. Đề xuất mở `sen:phan:XI:1`, `sen:phan:XV:1` (chữ ở cuối tệp; `sen.py … --cap-phan` in ra).
2. **Chương 87** dùng `chuong:87:cgbs:1`, `:2` vì khuôn ghi "Khoản bổ sung Việt Nam/SEN trong chú giải chương"; nhưng `chuong:*` là kho M-13 (M-13 có `cgbs` = 0). Nếu muốn một kho một tiền tố thì đổi sang `sen:chuong:87:n`.
3. **Lời nói đầu SEN** (tr. 1) có luật dùng SEN, chưa có id: "Trong trường hợp có sự mâu thuẫn giữa cách giải thích của HS, EN và SEN thì phải tuân thủ theo HS và EN."
4. Bản gốc là tệp Word phụ lục. Bản PDF công văn đóng dấu (Drive: "Công văn 3866.TCHQ-TXNK ngày 24.7.23 Chú giải bổ sung SEN 2022.pdf") **chưa tải, chưa so**.
5. `hieuLuc` để null: văn bản phụ lục không in ngày hiệu lực.

## Chỗ nghi trong bản in (chép nguyên)
4001.22: "SSIR 10", "00.16", "11.00", "00.60", "00.80". 2601.11: cột "Độ cứng Mohs" in hai lần (cột Anh: Specific gravity). 9404.29.20: chữ "MÁT" in sang cột Anh. 1211.90.95: danh sách trầm hương nhảy số 3 và 7. 0801.19.10: "0,55" / "0.5" giữa hai cột. Hai mục 1602.31.91, 2106.90.96 chỉ dẫn sang mục SEN khác (cạnh cho lớp 2).

## Nguyên văn mục cấp Phần (chưa có id)
### PHẦN XI
ĐƯỢC IN BẰNG PHƯƠNG PHÁP BATIK TRUYỀN THỐNG
Theo mục đích của Phần XI, “được in bằng phương pháp Batik truyền thống” có nghĩa là vải được in hình ảnh, hoa văn nghệ thuật, họa tiết trang trí, biểu tượng, và mang tính bản sắc địa phương khi mà việc in được làm bằng tay và các dụng cụ thô sơ, sử dụng các dấu chấm và đường vẽ bằng sáp nóng để tránh thuốc nhuộm tác động lên vải (phương pháp chống thuốc nhuộm bằng sáp). Quá trình in bằng phương pháp batik truyền thống có thể để áp dụng trên vải từ các vật liệu dệt như lụa, lông cừu và lông động vật loại mịn, bông, xơ thực vật, hoặc xơ nhân tạo.
Có 3 phương pháp in Batik truyền thống như sau:
1. Được vẽ bằng tay bằng cách sử dụng công cụ đặc biệt có tên là “Canting Tulis”, được nhận dạng là “Batik Tulis”:
2. Được đóng dấu bằng tay, sử dụng công cụ đặc biệt bằng tay gọi là “Canting Cap”, được nhận dạng là “Batik Cap”:
3. Sự kết hợp giữa vẽ bằng tay và đóng dấu bằng tay, được nhận dạng là “Batik Kombinasi”:
Một số ví dụ khác của họa tiết Batik truyền thống:
(Nguồn: In-đô-nê-xi-a)
### PHẦN XV
CÁCH ĐO LƯỜNG CÁC ỐNG
Liên quan đến việc đo lường các ống (hình tròn, hình vuông hoặc hình chữ nhật,…) áp dụng khái niệm dưới đây:
Đường chéo của mặt cắt ngang là đoạn thẳng dài nhất có thể giữa hai góc đối diện.
Nguồn: Việt Nam và chuyên gia
