# M-19 – Thông báo kết quả phân loại (`data/luat-goc/thong-bao.jsonl`)

Rút tất định từ `data/precedents.json` (4.908 bản ghi). Không dùng tờ khai, không dùng `legacy-hs-mapping`, không AI. Lớp `TIEN_LE`: chỉ để kiểm ở bước cuối (ADR-0004). Từng dòng: `M-19-tung-dong-thong-bao.md`.

```
node scripts/luat-goc/thong-bao.mjs            # dựng kho + bảng từng dòng (không cần bản gốc)
node scripts/luat-goc/thong-bao.mjs --kiem     # dựng lại, so từng byte
node scripts/luat-goc/thong-bao-bang-chung.mjs <thư mục toàn văn> [--ban-chu <thong-bao.txt>]   # đo lại, chỉ chạy nơi có toàn văn
```

## Bảng cân

| Kết cục | Bản ghi |
|---|---:|
| **Nút** (3.085 thông báo, mỗi thông báo một mã 8 số; 1.070 mã) | **3.085** |
| Gộp trùng: cùng số, năm, mã lúc ban hành, do nhiều người cào; vị trí ở `khoCu` của nút | 1.356 |
| LOI_AGENT: mô tả agent viết lại, không phải chữ thông báo | 202 |
| CONG_VAN: công văn hướng dẫn, không phải thông báo kết quả | 138 |
| KHONG_MO_TA: chữ giữ chỗ, "theo phụ lục", tiêu đề trang web | 59 |
| KHONG_NAM: không năm, không ngày | 39 |
| LECH_TOAN_VAN: mô tả không có trong toàn văn | 15 |
| NUOC_NGOAI: 10 CBP, 1 ABF | 11 |
| DINH_CHINH: 2174/TB-TCHQ, 1377/TB-TCHQ (văn bản đính chính, không có hàng) | 2 |
| MA_BI_DINH_CHINH: 1811/TB-TCHQ để dưới 32082090 | 1 |
| **Cộng** | **4.908** |

"Để riêng" là không vào kho luật gốc; bản ghi vẫn nguyên trong kho cũ, có số, mã, địa chỉ nguồn trong bảng từng dòng để lấy lại bằng nguyên văn.

## Quy ước

- id `tb:<số>-<năm>:<mã lúc ban hành>` cho `TB-TCHQ`; ký hiệu khác ghi vào số: `tb:20639.TB-CHQ-2026:…`. Số 119 và 223 năm 2025 có ở cả hai ký hiệu, nên không dùng số trần cho `TB-CHQ`.
- Cùng thông báo, cùng mã, nhiều mặt hàng thì dùng hậu tố `_b`, `_c` sau năm (`tb:851-2023_b:84812090`). **Hiện không có nút nào cần:** trong 1.356 bản ghi gộp không có cặp nào cùng một tệp nguồn mà mô tả khác hàng; khác nhau là do hai người cào lấy hai mục của một thông báo.
- `maLucBanHanh`: `hsCodeGoc` nếu kho ghi; không thì `outcome` khi khác khoá; không thì khoá. 42 nút kho cũ để dưới khoá khác (mã dẫn nối hoặc khoá sai), ghi ở `ghiChu`. Không nút nào mang mã dẫn nối.
- `nguyenVan` = mô tả hàng đúng như kho giữ, kể cả dấu nối " — ", " - ", nhãn "TM:" và chữ "doanh nghiệp" kho cũ đã thay tên công ty. Nhiều bản thì giữ bản nguyên vẹn nhất so với toàn văn, rồi bản dài hơn.
- `ketLuan` = câu "thuộc nhóm … mã số …" của kho; 70 nút `null` (kho chỉ có câu giữ chỗ). Đã cắt hai câu kho cũ gắn thêm: "Dẫn nối … OZV-400", "Đính chính tại Thông báo …".
- `conTrongBieu` theo `data/tax.json`: 2.816 còn, 269 không còn (104 mã). `trang` null mọi nút. `hieuLuc.tu` = ngày ban hành (3.067 nút; 18 nút kho không có ngày). 15 nút lấy năm từ địa chỉ nguồn.

## Đối chiếu

**Cổng:** `PASS thong-bao: 3085 nút, 0 lỗi, 0 cảnh báo — CHƯA ĐỐI CHIẾU nguyên văn`.

**Với `LUAT_GOC_TXT` thì ĐỎ: 2.759 nút.** Bản chữ là toàn văn 2.300 thông báo (2.737 bản, 126 tệp cào tracuuhs của oz-wiki, sha256 `b8016849…e318`), nằm ngoài repo vì có tên, địa chỉ, mã số thuế doanh nghiệp. 813 nút đỏ vì không có toàn văn; số còn lại vì kho cũ ghép hai mục ("tên khai báo — tên theo cấu tạo") bằng dấu nối không có trong văn bản, cổng so liền câu nên trượt. Không sửa chữ để qua cổng.

Đo riêng, **toàn bộ** 2.272 nút có toàn văn, không lấy mẫu:

| | Nút |
|---|---:|
| Mọi mảnh mô tả có nguyên vẹn (chỉ bỏ khoảng trắng, dấu câu) | 1.924 |
| Khớp một phần: phủ 78–100% cụm 6 ký tự (thiếu chữ, "doanh nghiệp" thay tên, lỗi gõ) | 348 |
| Số đầu văn bản in đúng số của nút | 2.250 (22 văn bản mất phần đầu) |
| Tách được mã ở mục kết luận và **khớp `maLucBanHanh`** | 1.566/1.567 |

Mã lệch duy nhất là 1811/TB-TCHQ, đã được 2174/TB-TCHQ đính chính. 705 văn bản còn lại không tách được mã theo mẫu, nhưng mã của nút có in trong văn bản, trừ 4 nút toàn văn bị cắt mất mã (5439/2022, 3349/2024, 3408/2024, 2411/2018). 32 nút rút ngẫu nhiên (hạt 19): 22 đọc cạnh mục kết luận, đúng hàng cả 22; 10 nút còn lại đoạn in ra là phần cuối văn bản, chỉ dựa vào số phủ 92–99%. Ngày đầu văn bản khác kho: 1 nút (530/TB-TCHQ 2018), ghi ở `ghiChu`.

Không có toàn văn: 813 nút (chủ yếu luatvietnam 718, thuvienphapluat 80). Bản đọc PDF quét của 2 nút cho mã khác hẳn (`tb:2791-2018:72283010`, `tb:92-2019:72299020`): PDF nói hàng khác, nghi tệp PDF lệch năm; giữ mã kho, ghi `maPdfQuet`.

## Bốn danh sách của thẻ

- **105 khoá mã chết:** đều giữ mã cũ, `conTrongBieu:false`. 104 mã có nút; `48114990` không có nút (bản ghi duy nhất là chữ giữ chỗ). Không mã nào được đổi.
- **20 bản ghi không số:** không mất số; số nằm ở `source.reference`. 6 thành nút, 14 gộp trùng.
- **11 nước ngoài:** để riêng.
- **73 thông báo gắn nhiều khoá mã:** 53 thật ra một mã lúc ban hành (kho để thêm dưới mã dẫn nối hoặc khoá sai) → một nút; 18 là công văn nêu nhiều mã → để riêng; 1 gắn nhầm (1811: mã trước và sau đính chính); 1 hai mặt hàng hai mã thật (5722/TB-TCHQ 2023, 25174100 và 25174900) nhưng cả hai bản ghi là lời agent → để riêng. Không có thông báo nào còn mang hai mã trong kho mới.

## Lỗi của kho cũ lộ ra

- **14 bản ghi để sai khoá** (`tb_tchq_index.json`): khoá khác `outcome`, toàn văn in đúng `outcome` (vd 3235–3237/TB-TCHQ DJI Mini để dưới 85255000, thông báo kết luận 8525.80.39). **51 bản ghi "mở ký gửi"** để dưới mã dẫn nối; toàn văn in mã cũ.
- **2174/TB-TCHQ** để dưới đúng mã mà nó bãi đi (32082090).
- **15 mô tả không phải chữ của thông báo** (đọc cạnh toàn văn 10 bản): đúng loại hàng nhưng người cào thêm chi tiết văn bản không in (3131/2019 thêm số CAS, dạng tinh thể, công dụng; 2888/2018 thêm "giảm đau, hạ sốt"; 1795/2018 thêm kích thước 1830 x 2440 mm dù kết luận chỉ ghi "Gương thủy tinh chưa có khung") hoặc viết lại (3055–3057/2018, 280–287/2025, 123/2025 đổi "bộ căng xích cam" thành "Bộ căng … động cơ diesel"). Toàn văn có sẵn để lấy lại.
- **1097/TB-TCHQ 2020**: bản hiện hành đã sạch (819UV / Phenylbis…), toàn văn khớp.
- **23 câu "thay thế Thông báo …"** trong toàn văn, 11 câu chưa có trong `data/tien-le-thay-the.json`. Tổng 25 thông báo bị thay, 16 có nút (`biThay`, `hieuLuc.den` = ngày thông báo mới). Thêm từ toàn văn: 814/2018, 1629/2020, 1900/2020, 3119/2018, 5523/2024 — kho cũ vẫn coi là còn hiệu lực.

## Chỗ chưa chắc, cần QT quyết

1. `nguyenVan` theo kho cũ nên không qua cổng có đối chiếu. Muốn PASS thật: rút thẳng mục "Tên gọi theo cấu tạo, công dụng" từ 2.300 toàn văn, và xin bản gốc cho 813 nút còn lại.
2. 202 LOI_AGENT, 138 công văn, 39 không năm: có số và địa chỉ, có thể lấy lại. Công văn chưa có `loai` trong khuôn. Ranh giới LOI_AGENT đặt theo nhóm người cào (`agent-tbtchq-ch8*`, `-dot5-*`, `-thep-hoachat`) và dấu "→"; 27 bản ghi của nhóm này có toàn văn thì phủ 38–86%, không bản nào nguyên vẹn. 172 bản ghi không có toàn văn để kiểm.
3. Ngưỡng 60% của LECH_TOAN_VAN là lựa chọn; từ 60 đến dưới 80% còn 2 nút (`tb:1142-2018:28170010`, `tb:4466-2023:38122000`), đọc cạnh toàn văn: đúng hàng.
4. Ít nhất 23 nút có toàn văn in thêm một mã Chương 98 (9811, 9837); nút chỉ giữ mã 1–97, câu đầy đủ có trong toàn văn.
5. Hiệu lực chỉ biết qua câu thay thế có chữ. Không suy hết hạn theo thời hạn xác định trước mã số.
