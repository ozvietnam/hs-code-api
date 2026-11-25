# M-19 – từng dòng: bản ghi không thành nút, và bốn danh sách thẻ hỏi

Máy sinh bởi `scripts/luat-goc/thong-bao.mjs`, đừng sửa tay. Vị trí `khoá#i` là `precedents.json[khoá][i]`.

## Bảng cân

| Kết cục | Bản ghi | Lý do |
|---|---:|---|
| NÚT | 3085 | |
| NUOC_NGOAI | 11 | Bản ghi nước ngoài (CBP Mỹ, ABF Úc), không phải thông báo của hải quan Việt Nam |
| CONG_VAN | 138 | Công văn hướng dẫn (…/TCHQ-TXNK, …/CHQ-NVTHQ…), không phải thông báo kết quả; chữ kho giữ là lời tóm tắt |
| KHONG_NAM | 39 | Không có năm, không có ngày; số thông báo lặp mỗi năm nên không định danh được |
| LOI_AGENT | 202 | Mô tả do agent viết lại, không phải chữ thông báo |
| DINH_CHINH | 2 | Văn bản đính chính thông báo khác; mô tả do máy ghép từ tiêu đề nhóm, không có hàng |
| MA_BI_DINH_CHINH | 1 | Mã đã bị chính thông báo đính chính thay; nút giữ ở mã đính chính |
| KHONG_MO_TA | 59 | Không có mô tả hàng (chữ giữ chỗ, "theo phụ lục", tiêu đề trang web) |
| LECH_TOAN_VAN | 15 | Mô tả không có trong toàn văn thông báo (dưới 60% cụm chữ): người cào viết lại hoặc thêm chi tiết |
| MA_LECH_TOAN_VAN | 0 | Mã kho ghi không có trong toàn văn; toàn văn kết luận mã khác |
| GOP_TRUNG | 1356 | Trùng thông báo và mã với một nút (nhiều người cào cùng một thông báo) |
| **Cộng** | **4908** | |

## 105 khoá mã 8 số không còn trong biểu

Giữ mã cũ, `conTrongBieu:false`, không đổi.

| Khoá | Bản ghi | Kết cục |
|---|---:|---|
| 03051000 | 1 | GOP_TRUNG 1 |
| 04031021 | 2 | NUT 2 |
| 04031091 | 3 | NUT 3 |
| 04031099 | 2 | NUT 2 |
| 04041010 | 1 | NUT 1 |
| 12112000 | 1 | NUT 1 |
| 15180031 | 1 | NUT 1 |
| 18063210 | 3 | GOP_TRUNG 2, NUT 1 |
| 19053200 | 4 | GOP_TRUNG 3, NUT 1 |
| 21011110 | 1 | NUT 1 |
| 21039040 | 2 | GOP_TRUNG 2 |
| 21039090 | 3 | GOP_TRUNG 2, NUT 1 |
| 21069070 | 5 | NUT 3, GOP_TRUNG 2 |
| 21069080 | 1 | NUT 1 |
| 22029030 | 20 | GOP_TRUNG 14, NUT 6 |
| 22087000 | 1 | NUT 1 |
| 22089090 | 1 | NUT 1 |
| 25010092 | 7 | NUT 4, GOP_TRUNG 3 |
| 25291000 | 1 | GOP_TRUNG 1 |
| 26011100 | 1 | GOP_TRUNG 1 |
| 26219000 | 2 | NUT 2 |
| 28353100 | 1 | NUT 1 |
| 29049000 | 1 | NUT 1 |
| 29209090 | 2 | NUT 2 |
| 29241900 | 1 | NUT 1 |
| 29313900 | 1 | NUT 1 |
| 30042090 | 1 | NUT 1 |
| 32041700 | 1 | NUT 1 |
| 32151900 | 2 | GOP_TRUNG 2 |
| 33012900 | 1 | NUT 1 |
| 34021190 | 2 | NUT 2 |
| 34021199 | 2 | NUT 2 |
| 34021200 | 3 | NUT 3 |
| 34021390 | 3 | NUT 3 |
| 34022014 | 1 | NUT 1 |
| 34022015 | 10 | NUT 8, GOP_TRUNG 2 |
| 34022095 | 1 | NUT 1 |
| 34029015 | 2 | NUT 2 |
| 35069100 | 4 | GOP_TRUNG 2, NUT 2 |
| 38021000 | 1 | NUT 1 |
| 38089119 | 1 | NUT 1 |
| 38089190 | 1 | NUT 1 |
| 38123000 | 1 | GOP_TRUNG 1 |
| 38220030 | 1 | NUT 1 |
| 38220090 | 8 | NUT 8 |
| 38247900 | 2 | NUT 2 |
| 38249070 | 3 | NUT 3 |
| 38249099 | 38 | NUT 37, KHONG_MO_TA 1 |
| 39072090 | 10 | NUT 8, GOP_TRUNG 2 |
| 39093100 | 6 | NUT 6 |
| 39159000 | 1 | NUT 1 |
| 39173290 | 1 | NUT 1 |
| 39206290 | 4 | NUT 1, GOP_TRUNG 3 |
| 39206300 | 1 | NUT 1 |
| 39209190 | 4 | NUT 4 |
| 42022200 | 1 | NUT 1 |
| 44014000 | 1 | GOP_TRUNG 1 |
| 44029090 | 3 | NUT 3 |
| 44219099 | 1 | NUT 1 |
| 48103139 | 1 | GOP_TRUNG 1 |
| 48114990 | 1 | KHONG_MO_TA 1 |
| 51111190 | 1 | NUT 1 |
| 51111990 | 3 | NUT 3 |
| 51121100 | 1 | GOP_TRUNG 1 |
| 52104100 | 4 | GOP_TRUNG 2, NUT 2 |
| 54024700 | 1 | NUT 1 |
| 54071029 | 2 | GOP_TRUNG 1, NUT 1 |
| 55099110 | 2 | GOP_TRUNG 1, NUT 1 |
| 68109100 | 2 | GOP_TRUNG 2 |
| 68129919 | 2 | GOP_TRUNG 1, NUT 1 |
| 68151099 | 8 | GOP_TRUNG 4, NUT 4 |
| 70193990 | 6 | GOP_TRUNG 3, NUT 3 |
| 72092600 | 2 | NUT 2 |
| 72107011 | 32 | NUT 18, GOP_TRUNG 14 |
| 72107090 | 1 | NUT 1 |
| 72123010 | 1 | NUT 1 |
| 72149121 | 2 | NUT 1, GOP_TRUNG 1 |
| 72165090 | 1 | NUT 1 |
| 72279000 | 2 | NUT 1, GOP_TRUNG 1 |
| 72299020 | 13 | GOP_TRUNG 6, NUT 7 |
| 72299090 | 2 | NUT 2 |
| 73063090 | 1 | NUT 1 |
| 73182900 | 1 | NUT 1 |
| 74101100 | 1 | NUT 1 |
| 76072090 | 2 | GOP_TRUNG 1, NUT 1 |
| 76169999 | 1 | NUT 1 |
| 84561100 | 1 | NUT 1 |
| 84798939 | 2 | NUT 1, GOP_TRUNG 1 |
| 85013140 | 1 | NUT 1 |
| 85061010 | 3 | NUT 3 |
| 85143090 | 3 | NUT 2, GOP_TRUNG 1 |
| 85161010 | 1 | NUT 1 |
| 85176229 | 1 | NUT 1 |
| 85177021 | 2 | NUT 2 |
| 85177092 | 5 | NUT 2, GOP_TRUNG 3 |
| 85258039 | 5 | NUT 2, GOP_TRUNG 3 |
| 85258040 | 1 | NUT 1 |
| 85258059 | 1 | NUT 1 |
| 85395000 | 3 | GOP_TRUNG 2, NUT 1 |
| 85444298 | 1 | NUT 1 |
| 90279010 | 1 | NUT 1 |
| 90330020 | 1 | GOP_TRUNG 1 |
| 94019099 | 1 | NUT 1 |
| 94054060 | 1 | NUT 1 |
| 94054099 | 2 | NUT 2 |

## 20 bản ghi không có trường số

Cả 20 có số trong `source.reference` (kho ghi theo khuôn khác), không phải mất số.

| Vị trí | Số (source.reference) | Ngày | Kết cục |
|---|---|---|---|
| 38012000#1 | 922/TB-TCHQ | 2019-02-15 | gộp vào `tb:922-2019:38012000` |
| 38063010#1 | 921/TB-TCHQ | 2019-02-15 | nút `tb:921-2019:38063010` |
| 38089290#5 | 796/TB-TCHQ | 2019-02-01 | gộp vào `tb:796-2019:38089290` |
| 38089290#6 | 1794/TB-TCHQ | 2018-04-05 | gộp vào `tb:1794-2018:38089290` |
| 38089290#7 | 3143/TB-TCHQ | 2019-05-21 | gộp vào `tb:3143-2019:38089290` |
| 38089319#1 | 1145/TB-TCHQ | 2018-03-05 | gộp vào `tb:1145-2018:38089319` |
| 38089320#1 | 1781/TB-TCHQ | 2020-03-20 | gộp vào `tb:1781-2020:38089320` |
| 38089490#3 | 2762/TB-TCHQ | 2018-05-21 | gộp vào `tb:2762-2018:38089490` |
| 38089910#1 | 602/TB-TCHQ | 2018-01-30 | nút `tb:602-2018:38089910` |
| 38089990#5 | 950/TB-TCHQ | 2018-02-12 | gộp vào `tb:950-2018:38089990` |
| 38099200#1 | 1125/TB-TCHQ | 2018-03-02 | gộp vào `tb:1125-2018:38099200` |
| 38101000#3 | 1559/TB-TCHQ | 2018-03-23 | nút `tb:1559-2018:38101000` |
| 38101000#4 | 2707/TB-TCHQ | 2023-06-01 | gộp vào `tb:2707-2023:38101000` |
| 38119090#1 | 3148/TB-TCHQ | 2019-05-21 | gộp vào `tb:3148-2019:38119090` |
| 38123900#15 | 1768/TB-TCHQ | 2020-03-19 | nút `tb:1768-2020:38123900` |
| 38123900#16 | 1925/TB-TCHQ | 2020-03-24 | nút `tb:1925-2020:38123900` |
| 38123900#17 | 1926/TB-TCHQ | 2020-03-24 | nút `tb:1926-2020:38123900` |
| 38123900#18 | 3292/TB-TCHQ | 2019-05-27 | gộp vào `tb:3292-2019:38123900` |
| 38123900#19 | 6240/TB-TCHQ | 2020-09-23 | gộp vào `tb:6240-2020:38123900` |
| 38123900#20 | 6495/TB-TCHQ | 2018-11-05 | gộp vào `tb:6495-2018:38123900` |

## 11 bản ghi nước ngoài

| Vị trí | Số | Nguồn |
|---|---|---|
| 170191#0 | M82908 | https://rulings.cbp.gov/ruling/M82908 |
| 170191#1 | M82910 | https://rulings.cbp.gov/ruling/M82910 |
| 210390#0 | M82909 | https://rulings.cbp.gov/ruling/M82909 |
| 293628#0 | M82915 | https://rulings.cbp.gov/ruling/M82915 |
| 611030#0 | M82912 | https://rulings.cbp.gov/ruling/M82912 |
| 621142#0 | M82913 | https://rulings.cbp.gov/ruling/M82913 |
| 741999#0 | M82916 | https://rulings.cbp.gov/ruling/M82916 |
| 842139#0 | 1679759 | https://www.abf.gov.au/tariff-classification-subsite/Pages/TariffConcessionOrders.aspx?ch=84 |
| 847989#0 | M82907 | https://rulings.cbp.gov/ruling/M82907 |
| 902580#0 | M82911 | https://rulings.cbp.gov/ruling/M82911 |
| 090420#0 | M82914 | https://rulings.cbp.gov/ruling/M82914 |

## 73 thông báo kho cũ gắn nhiều khoá mã (cùng số + cùng trường năm)

| Lớp | Thông báo |
|---|---:|
| A. Một mã lúc ban hành; kho để thêm dưới khoá khác (mã dẫn nối / khoá sai) | 53 |
| C. Gắn nhầm: một mã thành nút, bản ghi mã kia để riêng | 1 |
| D. Công văn nêu nhiều mã (để riêng) | 18 |
| F. Nhiều mã, mọi bản ghi để riêng vì chữ là lời agent | 1 |

| Lớp | Số, năm | Khoá kho cũ → mã lúc ban hành → kết cục |
|---|---|---|
| A | 1764/TB-TCHQ, 2018 | 15180012 → 15180031: gộp vào `tb:1764-2018:15180031`<br>15180031: nút `tb:1764-2018:15180031` |
| A | 7300/TB-TCHQ, 2018 | 19053200: gộp vào `tb:7300-2018:19053200`<br>19053210 → 19053200: nút `tb:7300-2018:19053200` |
| A | 7301/TB-TCHQ, 2018 | 19053200: nút `tb:7301-2018:19053200`<br>19053200: gộp vào `tb:7301-2018:19053200`<br>19053210 → 19053200: gộp vào `tb:7301-2018:19053200` |
| A | 6694/TB-TCHQ, 2017 | 19053200: gộp vào `tb:6694-2017:19053200`<br>19053210 → 19053200: nút `tb:6694-2017:19053200` |
| A | 3337/TB-TCHQ, 2018 | 21011110: nút `tb:3337-2018:21011110`<br>21011111 → 21011110: gộp vào `tb:3337-2018:21011110` |
| A | 813/TB-TCHQ, 2018 | 21039011 → 21039090: nút `tb:813-2018:21039090`<br>21039090: gộp vào `tb:813-2018:21039090`<br>21039090: gộp vào `tb:813-2018:21039090` |
| A | 1503/TB-TCHQ, 2018 | 21039011 → 21039090: gộp vào `tb:1503-2018:21039090`<br>21039090: nút `tb:1503-2018:21039090` |
| A | 7545/TB-TCHQ, 2018 | 21039011 → 21039040: nút `tb:7545-2018:21039040`<br>21039040: gộp vào `tb:7545-2018:21039040` |
| A | 7546/TB-TCHQ, 2018 | 21039011 → 21039040: nút `tb:7546-2018:21039040`<br>21039040: gộp vào `tb:7546-2018:21039040` |
| A | 1897/TB-TCHQ, 2018 | 22029030: gộp vào `tb:1897-2018:22029030`<br>22029030: gộp vào `tb:1897-2018:22029030`<br>22029950 → 22029030: nút `tb:1897-2018:22029030` |
| A | 1898/TB-TCHQ, 2018 | 22029030: gộp vào `tb:1898-2018:22029030`<br>22029030: gộp vào `tb:1898-2018:22029030`<br>22029950 → 22029030: nút `tb:1898-2018:22029030` |
| A | 1900/TB-TCHQ, 2018 | 22029030: gộp vào `tb:1900-2018:22029030`<br>22029030: nút `tb:1900-2018:22029030`<br>22029950 → 22029030: gộp vào `tb:1900-2018:22029030` |
| A | 1901/TB-TCHQ, 2018 | 22029030: gộp vào `tb:1901-2018:22029030`<br>22029030: nút `tb:1901-2018:22029030`<br>22029950 → 22029030: gộp vào `tb:1901-2018:22029030` |
| A | 1920/TB-TCHQ, 2018 | 22029030: gộp vào `tb:1920-2018:22029030`<br>22029030: nút `tb:1920-2018:22029030`<br>22029950 → 22029030: gộp vào `tb:1920-2018:22029030` |
| A | 1921/TB-TCHQ, 2018 | 22029030: gộp vào `tb:1921-2018:22029030`<br>22029030: gộp vào `tb:1921-2018:22029030`<br>22029950 → 22029030: nút `tb:1921-2018:22029030` |
| A | 1922/TB-TCHQ, 2018 | 22029030: gộp vào `tb:1922-2018:22029030`<br>22029030: gộp vào `tb:1922-2018:22029030`<br>22029950 → 22029030: nút `tb:1922-2018:22029030` |
| A | 2621/TB-TCHQ, 2018 | 22029030: gộp vào `tb:2621-2018:22029030`<br>22029030: nút `tb:2621-2018:22029030`<br>22029950 → 22029030: gộp vào `tb:2621-2018:22029030` |
| A | 3222/TB-TCHQ, 2018 | 22029030: nút `tb:3222-2018:22029030`<br>22029030: gộp vào `tb:3222-2018:22029030`<br>22029950 → 22029030: gộp vào `tb:3222-2018:22029030` |
| A | 3223/TB-TCHQ, 2018 | 22029030: nút `tb:3223-2018:22029030`<br>22029950 → 22029030: gộp vào `tb:3223-2018:22029030` |
| A | 3672/TB-TCHQ, 2019 | 22029030: gộp vào `tb:3672-2019:22029030`<br>22029950 → 22029030: nút `tb:3672-2019:22029030` |
| A | 832/TB-TCHQ, 2016 | 25291000: gộp vào `tb:832-2016:25291000`<br>25291010 → 25291000: nút `tb:832-2016:25291000` |
| A | 617/TB-TCHQ, 2018 | 26011100: gộp vào `tb:617-2018:26011100`<br>26011110 → 26011100: nút `tb:617-2018:26011100` |
| A | 5418/TB-TCHQ, 2022 | 32151110 → 32151900: nút `tb:5418-2022:32151900`<br>32151900: gộp vào `tb:5418-2022:32151900` |
| A | 5417/TB-TCHQ, 2022 | 32151110 → 32151900: nút `tb:5417-2022:32151900`<br>32151900: gộp vào `tb:5417-2022:32151900` |
| A | 3566/TB-TCHQ, 2022 | 35061000 → 35069100: nút `tb:3566-2022:35069100`<br>35069100: gộp vào `tb:3566-2022:35069100` |
| A | 3568/TB-TCHQ, 2022 | 35061000 → 35069100: nút `tb:3568-2022:35069100`<br>35069100: gộp vào `tb:3568-2022:35069100` |
| A | 1994/TB-TCHQ, 2019 | 38021000: nút `tb:1994-2019:38021000`<br>38021010 → 38021000: gộp vào `tb:1994-2019:38021000` |
| A | 825/TB-TCHQ, 2016 | 38123000: gộp vào `tb:825-2016:38123000`<br>38123100 → 38123000: nút `tb:825-2016:38123000` |
| A | 1012/TB-TCHQ, 2019 | 39093100: nút `tb:1012-2019:39093100`<br>39093110 → 39093100: gộp vào `tb:1012-2019:39093100` |
| A | 1013/TB-TCHQ, 2019 | 39093100: nút `tb:1013-2019:39093100`<br>39093110 → 39093100: gộp vào `tb:1013-2019:39093100` |
| A | 1098/TB-TCHQ, 2019 | 39093100: nút `tb:1098-2019:39093100`<br>39093110 → 39093100: gộp vào `tb:1098-2019:39093100` |
| A | 4145/TB-TCHQ, 2018 | 39093100: nút `tb:4145-2018:39093100`<br>39093110 → 39093100: gộp vào `tb:4145-2018:39093100` |
| A | 6632/TB-TCHQ, 2018 | 39093100: nút `tb:6632-2018:39093100`<br>39093110 → 39093100: gộp vào `tb:6632-2018:39093100` |
| A | 1054/TB-TCHQ, 2019 | 39093100: nút `tb:1054-2019:39093100`<br>39093110 → 39093100: gộp vào `tb:1054-2019:39093100` |
| A | 5126/TB-TCHQ, 2022 | 39201011 → 39206290: nút `tb:5126-2022:39206290`<br>39206290: gộp vào `tb:5126-2022:39206290` |
| A | 5124/TB-TCHQ, 2022 | 39201011 → 39206290: nút `tb:5124-2022:39206290`<br>39206290: gộp vào `tb:5124-2022:39206290` |
| A | 5125/TB-TCHQ, 2022 | 39201011 → 39206290: nút `tb:5125-2022:39206290`<br>39206290: gộp vào `tb:5125-2022:39206290` |
| A | 7421/TB-TCHQ, 2018 | 44011200 → 44014000: nút `tb:7421-2018:44014000`<br>44014000: gộp vào `tb:7421-2018:44014000` |
| A | 576/TB-TCHQ, 2018 | 48103130 → 48103139: nút `tb:576-2018:48103139`<br>48103139: gộp vào `tb:576-2018:48103139` |
| A | 5856/TB-TCHQ, 2018 | 51121100: gộp vào `tb:5856-2018:51121100`<br>51121110 → 51121100: nút `tb:5856-2018:51121100` |
| A | 1856/TB-TCHQ, 2018 | 55099100 → 55099110: gộp vào `tb:1856-2018:55099110`<br>55099110: gộp vào `tb:1856-2018:55099110`<br>55099110: nút `tb:1856-2018:55099110` |
| A | 814/TB-TCHQ, 2018 | 68109100: gộp vào `tb:814-2018:68109100`<br>68109100: gộp vào `tb:814-2018:68109100`<br>68109110 → 68109100: nút `tb:814-2018:68109100` |
| A | 2102/TB-TCHQ, 2018 | 68129919: gộp vào `tb:2102-2018:68129919`<br>68129919: nút `tb:2102-2018:68129919`<br>68129920 → 68129919: gộp vào `tb:2102-2018:68129919` |
| A | 3350/TB-TCHQ, 2019 | 72279000: nút `tb:3350-2019:72279000`<br>72279000: gộp vào `tb:3350-2019:72279000`<br>72279010 → 72279000: gộp vào `tb:3350-2019:72279000` |
| A | 2470/TB-TCHQ, 2022 | 84791010 → 84798939: nút `tb:2470-2022:84798939`<br>84798939: gộp vào `tb:2470-2022:84798939` |
| A | 7396/TB-TCHQ, 2018 | 85013130 → 85013140: gộp vào `tb:7396-2018:85013140`<br>85013140: nút `tb:7396-2018:85013140` |
| A | 4561/TB-TCHQ, 2022 | 85171100 → 85177092: nút `tb:4561-2022:85177092`<br>85177092: gộp vào `tb:4561-2022:85177092` |
| A | 4562/TB-TCHQ, 2022 | 85171100 → 85177092: nút `tb:4562-2022:85177092`<br>85177092: gộp vào `tb:4562-2022:85177092` |
| A | 3237/TB-TCHQ, 2022 | 85255000 → 85258039: nút `tb:3237-2022:85258039`<br>85258039: gộp vào `tb:3237-2022:85258039` |
| A | 3235/TB-TCHQ, 2022 | 85255000 → 85258039: nút `tb:3235-2022:85258039`<br>85258039: gộp vào `tb:3235-2022:85258039` |
| A | 3236/TB-TCHQ, 2022 | 85255000 → 85258039: nút `tb:3236-2022:85258039`<br>85258039: gộp vào `tb:3236-2022:85258039` |
| A | 2411/TB-TCHQ, 2018 | 90330000 → 90330020: nút `tb:2411-2018:90330020`<br>90330020: gộp vào `tb:2411-2018:90330020` |
| A | 4780/TB-TCHQ, 2022 | 03052010 → 03051000: nút `tb:4780-2022:03051000`<br>03051000: gộp vào `tb:4780-2022:03051000` |
| C | 1811/TB-TCHQ, 2020 | 32082090: MA_BI_DINH_CHINH<br>32089090: nút `tb:1811-2020:32089090` |
| D | 6523/TCHQ-TXNK, 2018 | 7323: CONG_VAN<br>9405: CONG_VAN |
| D | 6281/TCHQ-TXNK, 2017 | 8422: CONG_VAN<br>84361010: CONG_VAN |
| D | 1428/TCHQ-TXNK, 2020 | 8422: CONG_VAN<br>8433: CONG_VAN<br>8436: CONG_VAN |
| D | 4764/TCHQ-TXNK, 2018 | 73158200: CONG_VAN<br>73269099: CONG_VAN |
| D | 5342/TCHQ-TXNK, 2016 | 73159090: CONG_VAN<br>73269099: CONG_VAN<br>73269099: CONG_VAN |
| D | 8597/TCHQ-TXNK, 2015 | 73262090: CONG_VAN<br>73269099: CONG_VAN<br>94032090: CONG_VAN |
| D | 6419/TCHQ-TXNK, 2016 | 83024290: CONG_VAN<br>94032090: CONG_VAN |
| D | 2943/TCHQ-TXNK, 2020 | 84149029: CONG_VAN<br>84195010: CONG_VAN |
| D | 509/TCHQ-TXNK, 2024 | 84158299: CONG_VAN<br>84159049: CONG_VAN |
| D | 5039/TCHQ-TXNK, 2019 | 84184090: CONG_VAN<br>84185091: CONG_VAN |
| D | 2383/TCHQ-TXNK, 2018 | 84264100: CONG_VAN<br>87051000: CONG_VAN |
| D | 11955/TCHQ-TXNK, 2015 | 84379019: CONG_VAN<br>84379029: CONG_VAN |
| D | 6592/TCHQ-TXNK, 2018 | 84772020: CONG_VAN<br>84779039: CONG_VAN |
| D | 1713/TCHQ-TXNK, 2021 | 84796000: CONG_VAN<br>85098090: CONG_VAN |
| D | 3552/TCHQ-TXNK, 2021 | 87082995: CONG_VAN<br>87082998: CONG_VAN |
| D | 08/TCHQ-TXNK, 2023 | 94037010: CONG_VAN<br>95030010: CONG_VAN |
| D | 5725/TCHQ-TXNK, 2023 | 95045090: CONG_VAN<br>95063100: CONG_VAN<br>95063200: CONG_VAN<br>95063900: CONG_VAN |
| D | 5186/TCHQ-TXNK, 2021 | 03074310: CONG_VAN<br>03074390: CONG_VAN |
| F | 5722/TB-TCHQ, 2023 | 25174100: LOI_AGENT<br>25174900: LOI_AGENT |

## CONG_VAN: 138

Công văn hướng dẫn (…/TCHQ-TXNK, …/CHQ-NVTHQ…), không phải thông báo kết quả; chữ kho giữ là lời tóm tắt

| Vị trí | Số | Năm | Mã | Bằng chứng / nguồn |
|---|---|---|---|---|
| 3919#0 | 624/TCHQ-TXNK | 2025 | 3919 | https://thuvienxuatnhapkhau.com/cong-van-624-tchq-txnk-nam-2025-ve-phan-loai-mat-hang-nhan-nhua-tu-dinh-da-in-thong-tin.html |
| 7006#0 | 5498/TCHQ-TXNK | 2017 | 7006 | https://vbpl.ts24.com.vn/support/solutions/articles/16000064077 |
| 7323#0 | 5222/TCHQ-TXNK | 2019 | 7323 | https://vbpl.ts24.com.vn/support/solutions/articles/16000099462 |
| 7323#1 | 6523/TCHQ-TXNK | 2018 | 7323 | https://vbpl.ts24.com.vn/support/solutions/articles/16000087995 |
| 8422#0 | 6281/TCHQ-TXNK | 2017 | 8422 | https://vbpl.ts24.com.vn/support/solutions/articles/16000067610 |
| 8422#1 | 1428/TCHQ-TXNK | 2020 | 8422 | https://vbpl.ts24.com.vn/support/solutions/articles/16000107248 |
| 8432#0 | 7986/TCHQ-TXNK | 2016 | 8432 | https://vbpl.ts24.com.vn/support/solutions/articles/16000037699 |
| 8432#1 | 7342/TCHQ-TXNK | 2016 | 8432 | https://vbpl.ts24.com.vn/support/solutions/articles/16000035517 |
| 8433#0 | 1428/TCHQ-TXNK | 2020 | 8433 | https://vbpl.ts24.com.vn/support/solutions/articles/16000107248 |
| 8436#0 | 6959/TCHQ-TXNK | 2018 | 8436 | https://vbpl.ts24.com.vn/support/solutions/articles/16000088747 |
| 8436#1 | 7130/TCHQ-TXNK | 2018 | 8436 | https://vbpl.ts24.com.vn/support/solutions/articles/16000089218 |
| 8436#2 | 2631/TCHQ-TXNK | 2022 | 8436 | https://vbpl.ts24.com.vn/support/solutions/articles/16000139119 |
| 8436#3 | 2364/TXNK-PL | 2016 | 8436 | https://vbpl.ts24.com.vn/support/solutions/articles/16000046001 |
| 8436#4 | 648/TCHQ-TXNK | 2017 | 8436 | https://vbpl.ts24.com.vn/support/solutions/articles/16000052724 |
| 8436#5 | 1428/TCHQ-TXNK | 2020 | 8436 | https://vbpl.ts24.com.vn/support/solutions/articles/16000107248 |
| 8514#0 | 7781/TCHQ-TXNK | 2017 | 8514 | https://vbpl.ts24.com.vn/support/solutions/articles/16000070802 |
| 8517#0 | 1447/TCHQ-TXNK | 2024 | 8517 | https://thuvienxuatnhapkhau.com/cong-van-1447-tchq-txnk-vv-phan-loai-thiet-bi-deo-tay-thong-minh.html |
| 8535#0 | 2829/TCHQ-TXNK | 2016 | 8535 | https://vbpl.ts24.com.vn/support/solutions/articles/16000010463 |
| 8546#0 | 9772/TCHQ-TXNK | 2016 | 8546 | https://vbpl.ts24.com.vn/support/solutions/articles/16000044530 |
| 8701#0 | 1002/TCHQ-TXNK | 2017 | 8701 | https://vbpl.ts24.com.vn/support/solutions/articles/16000053247 |
| 8701#1 | 3520/TCHQ-TXNK | 2016 | 8701 | https://vbpl.ts24.com.vn/support/solutions/articles/16000005658 |
| 8704#0 | 1775/TCHQ-TXNK | 2017 | 8704 | https://vbpl.ts24.com.vn/support/solutions/articles/16000054972 |
| 8704#1 | 2829/TCHQ-TXNK | 2018 | 8704 | https://vbpl.ts24.com.vn/support/solutions/articles/16000079502 |
| 8705#0 | 4244/TCHQ-TXNK | 2019 | 8705 | https://vbpl.ts24.com.vn/support/solutions/articles/16000097121 |
| 8711#0 | 165/TCHQ-TXNK | 2018 | 8711 | https://vbpl.ts24.com.vn/support/solutions/articles/16000072571 |
| 8711#1 | 10328/TXNK-PL | 2020 | 8711 | https://vbpl.ts24.com.vn/support/solutions/articles/16000115224 |
| 9403#0 | 2125/TCHQ-TXNK | 2017 | 9403 | https://vbpl.ts24.com.vn/support/solutions/articles/16000055678 |
| 9403#1 | 858/CHQ-NVTHQ | 2025 | 9403 | https://vbpl.ts24.com.vn/support/solutions/articles/16000210753 |
| 9403#2 | 1933/TCHQ-TXNK | 2017 | 9403 | https://vbpl.ts24.com.vn/support/solutions/articles/16000055235 |
| 9405#0 | 6523/TCHQ-TXNK | 2018 | 9405 | https://vbpl.ts24.com.vn/support/solutions/articles/16000087995 |
| 401180#0 | 2491/TCHQ-TXNK |  | 401180 | https://camnangxnk-logistics.net/2491-tchq-txnk-ma-hs-lop-dac-chung-bang-cao-su-dung-cho-xe-tu-do-howo-hs-4011-80/ |
| 401180#1 | 6156/TCHQ-TXNK |  | 401180 | https://camnangxnk-logistics.net/cong-van-so-6156-tchq-txnk-v-v-xu-ly-vuong-mac-thue-mat-hang-lop-xe-dung-cho-khai-thac-mo-hs-4011-80/ |
| 730210#0 | 5157/TCHQ-TXNK | 2020 | 730210 | https://vbpl.ts24.com.vn/support/solutions/articles/16000112566 |
| 841391#0 | 780/TCHQ-GSQL | 2010 | 841391 | https://bikipxuatnhapkhau.vn/cv-780-tchq-gsql-hscode-dau-phun-ap-luc-chat-long/ |
| 848180#0 | 3936/TCHQ-TXNK | 2019 | 848180 | https://bikipxuatnhapkhau.vn/hs-code-voi-sen-voi-nuoc-8481-80-3936-tchq-tnxk-ngay-13-06-2019/ |
| 850610#0 | 6922/TCHQ-TXNK | 2020 | 850610 | https://vbpl.ts24.com.vn/support/solutions/articles/16000116252 |
| 853530#0 | 1213/TCHQ-TXNK | 2016 | 853530 | https://vbpl.ts24.com.vn/support/solutions/articles/16000008180 |
| 853710#0 | 6966/TCHQ-TXNK | 2018 | 853710 | https://vbpl.ts24.com.vn/support/solutions/articles/16000088751 |
| 870310#0 | 1920/TCHQ-TXNK | 2019 | 870310 | https://vbpl.ts24.com.vn/support/solutions/articles/16000093797 |
| 871190#0 | 11806/TCHQ-TXNK | 2016 | 871190 | https://vbpl.ts24.com.vn/support/solutions/articles/16000049913 |
| 871200#0 | 2252/TCHQ-TXNK | 2020 | 871200 | https://vbpl.ts24.com.vn/support/solutions/articles/16000108200 |
| 871639#0 | 524/TCHQ-TXNK | 2020 | 871639 | https://vbpl.ts24.com.vn/support/solutions/articles/16000106112 |
| 940190#0 | 8117/TCHQ-TXNK | 2020 | 940190 | https://vbpl.ts24.com.vn/support/solutions/articles/16000121855 |
| 18069090#10 | 698/TCHQ-TXNK | 2021 | 18069090 | https://thuvienxuatnhapkhau.com/cong-van-698-tchq-txnk-nam-2021-ve-viec-phan-loai-hang-hoa-mat-hang-socola-ferrero-rocher.html |
| 39269039#0 | 2594/TCHQ-TXNK |  | 39269039 | https://camnangxnk-logistics.net/2594-tchq-txnk-ma-hs-giay-tham-dau-oil-removing-paper-hs-3926-90-39/ |
| 39269099#22 | 3502/TCHQ-TXNK | 2022 | 39269099 | https://thuvienxuatnhapkhau.com/cong-van-3502-tchq-txnk-nam-2022-v-v-phan-loai-mat-hang-tham-tap-yoga-bang-plastic.html |
| 40169390#1 | 6495/TCHQ-TXNK |  | 40169390 | https://camnangxnk-logistics.net/6495-tchq-txnk-v-v-ma-hs-mat-hang-gioang-cao-su-4016-9390/ |
| 42029290#1 | 3162/TCHQ-TXNK | 2014 | 42029290 | https://caselaw.vn/van-ban-phap-luat/45291-cong-van-3162-tchq-txnk-nam-2014-ve-ket-qua-phan-loai-theo-thong-bao-1919-tb-tchq-do-tong-cuc-hai-quan-ban-hanh |
| 48239099#6 | 1253/TCHQ-TXNK |  | 48239099 | https://camnangxnk-logistics.net/1253-tchq-txnk-v-v-phan-loai-hang-hoa-mat-hang-que-giay-hs-4822/ |
| 49119990#2 | 2450/TCHQ-TXNK | 2023 | 49119990 | https://thuvienxuatnhapkhau.com/cong-van-2450-tchq-txnk-nam-2023-v-v-ma-hs-cua-mat-hang-mang-nhua-pet-da-in.html |
| 54074200#0 | 553/TCHQ-TXNK | 2021 | 54074200 | https://thuvienxuatnhapkhau.com/phan-loai-doi-voi-vai-det-thoi-da-duoc-tham-tam-rfl.html |
| 62114390#0 | 822/TCHQ-TXNK |  | 62114390 | https://camnangxnk-logistics.net/822-tchq-txnk-ma-hs-bo-quan-ao-dung-trong-moi-truong-ngam-nuoc-immersion-suits-co-chuc-nang-lam-noi-bao-ve-nguoi-mac-chong-mat-than-nhiet-hs-6211-4390/ |
| 69141000#0 | 1030/TCHQ-TXNK | 2022 | 69141000 | https://bikipxuatnhapkhau.vn/hscode-khuon-su-dung-de-san-xuat-gang-tay/ |
| 70181010#0 | 6915/TCHQ-TXNK | 2020 | 70181010 | https://vbpl.ts24.com.vn/support/solutions/articles/16000116459 |
| 72052100#0 | 4559/TCHQ-TXNK | 2024 | 72052100 | https://vbpl.ts24.com.vn/support/solutions/articles/16000205281 |
| 73158200#0 | 4764/TCHQ-TXNK | 2018 | 73158200 | https://bikipxuatnhapkhau.vn/cong-van-4764-tchq-txnk-nam-2018-phan-loai-hs-code-mat-hang-moc-cau-mat-noi-xich-vong-xich-chu/ |
| 73159090#0 | 5342/TCHQ-TXNK | 2016 | 73159090 | https://vbpl.ts24.com.vn/support/solutions/articles/16000022063 |
| 73262090#2 | 8597/TCHQ-TXNK | 2015 | 73262090 | https://vbpl.ts24.com.vn/support/solutions/articles/16000016484 |
| 73269099#9 | 4764/TCHQ-TXNK | 2018 | 73269099 | https://bikipxuatnhapkhau.vn/cong-van-4764-tchq-txnk-nam-2018-phan-loai-hs-code-mat-hang-moc-cau-mat-noi-xich-vong-xich-chu/ |
| 73269099#10 | 8941/TCHQ-TXNK | 2016 | 73269099 | https://vbpl.ts24.com.vn/support/solutions/articles/16000042018 |
| 73269099#11 | 5342/TCHQ-TXNK | 2016 | 73269099 | https://vbpl.ts24.com.vn/support/solutions/articles/16000022063 |
| 73269099#12 | 5342/TCHQ-TXNK | 2016 | 73269099 | https://vbpl.ts24.com.vn/support/solutions/articles/16000022063 |
| 73269099#13 | 8597/TCHQ-TXNK | 2015 | 73269099 | https://vbpl.ts24.com.vn/support/solutions/articles/16000016484 |
| 73269099#14 | 7799/TCHQ-TXNK | 2017 | 73269099 | https://vbpl.ts24.com.vn/support/solutions/articles/16000070803 |
| 83024290#0 | 6419/TCHQ-TXNK | 2016 | 83024290 | https://vbpl.ts24.com.vn/support/solutions/articles/16000031511 |
| 83025000#0 | 4548/TCHQ-TXNK | 2019 | 83025000 | https://bikipxuatnhapkhau.vn/cong-van-4548-tchq-txnk-hs-code-gian-gia-phoi-do-cay-phoi-do-bang-inox-8302-50-00/ |
| 84149029#0 | 2943/TCHQ-TXNK | 2020 | 84149029 | https://vbpl.ts24.com.vn/support/solutions/articles/16000109134 |
| 84158299#0 | 509/TCHQ-TXNK | 2024 | 84158299 | https://vbpl.ts24.com.vn/support/solutions/articles/16000179049 |
| 84159019#0 | 6596/TCHQ-TXNK | 2018 | 84159019 | https://vbpl.ts24.com.vn/support/solutions/articles/16000088206 |
| 84159049#0 | 509/TCHQ-TXNK | 2024 | 84159049 | https://vbpl.ts24.com.vn/support/solutions/articles/16000179049 |
| 84183090#0 | 298/TCHQ-TXNK | 2020 | 84183090 | https://vbpl.ts24.com.vn/support/solutions/articles/16000133921 |
| 84184090#0 | 5039/TCHQ-TXNK | 2019 | 84184090 | https://vbpl.ts24.com.vn/support/solutions/articles/16000112561 |
| 84185091#0 | 5039/TCHQ-TXNK | 2019 | 84185091 | https://vbpl.ts24.com.vn/support/solutions/articles/16000112561 |
| 84195010#0 | 2943/TCHQ-TXNK | 2020 | 84195010 | https://vbpl.ts24.com.vn/support/solutions/articles/16000109134 |
| 84212122#0 | 9381/CHQ-NVTHQ | 2025 | 84212122 | https://vbpl.ts24.com.vn/support/solutions/articles/16000224127 |
| 84242019#0 | 6289/TCHQ-TXNK | 2020 | 84242019 | https://vbpl.ts24.com.vn/support/solutions/articles/16000115240 |
| 84262000#0 | 6624/TCHQ-TXNK | 2018 | 84262000 | https://thuvienxuatnhapkhau.com/cong-van-6624-tchq-txnk-v-v-phan-loai-cau-hang-liebherr.html |
| 84264100#0 | 2383/TCHQ-TXNK | 2018 | 84264100 | https://vbpl.ts24.com.vn/support/solutions/articles/16000078549 |
| 84272000#0 | 2039/TCHQ-TXNK | 2021 | 84272000 | https://luatvietnam.vn/xuat-nhap-khau/cong-van-2039-tchq-txnk-2021-phan-loai-xe-nang-nang-nguoi-lam-viec-tren-cao-270019-d6.html |
| 84279000#0 | 7095/TCHQ-GSQL | 2007 | 84279000 | https://hethongphapluat.com/cong-van-7095-tchq-gsql-ve-phan-loai-xe-nang-tay-co-co-cau-nang-bang-thuy-luc-do-tong-cuc-hai-quan-ban-hanh.html |
| 84289090#0 | 2909/TCHQ-TXNK | 2020 | 84289090 | https://hethongphapluat.com/cong-van-2909-tchq-txnk-nam-2020-ve-phan-loai-mat-hang-xe-nang-nguoi-do-tong-cuc-hai-quan-ban-hanh.html |
| 84321000#0 | 3113/TCHQ-TXNK | 2019 | 84321000 | https://vbpl.ts24.com.vn/support/solutions/articles/16000095578 |
| 84322900#0 | 2991/TCHQ-TXNK | 2020 | 84322900 | https://vbpl.ts24.com.vn/support/solutions/articles/16000109593 |
| 84322900#1 | 2992/TCHQ-TXNK | 2020 | 84322900 | https://vbpl.ts24.com.vn/support/solutions/articles/16000109594 |
| 84322900#2 | 2865/TCHQ-TXNK | 2023 | 84322900 | https://vbpl.ts24.com.vn/support/solutions/articles/16000159456 |
| 84322900#3 | 2865/TCHQ-TXNK | 2023 | 84322900 | https://vbpl.ts24.com.vn/support/solutions/articles/16000159456 |
| 84322900#4 | 2343/TCHQ-TXNK | 2019 | 84322900 | https://vbpl.ts24.com.vn/support/solutions/articles/16000095978 |
| 84322900#5 | 247/TCHQ-TXNK | 2021 | 84322900 | https://hethongphapluat.com/cong-van-247-tchq-txnk-nam-2021-ve-phan-loai-may-xoi-dat-dung-trong-nong-nghiep-va-dieu-chinh-thue-suat-mat-hang-may-keo-dung-trong-nong-nghiep-do-tong-cuc-hai-quan-ban-hanh.html |
| 84322900#6 | 247/TCHQ-TXNK | 2021 | 84322900 | https://hethongphapluat.com/cong-van-247-tchq-txnk-nam-2021-ve-phan-loai-may-xoi-dat-dung-trong-nong-nghiep-va-dieu-chinh-thue-suat-mat-hang-may-keo-dung-trong-nong-nghiep-do-tong-cuc-hai-quan-ban-hanh.html |
| 84361010#0 | 7520/TCHQ-TXNK | 2017 | 84361010 | https://vbpl.ts24.com.vn/support/solutions/articles/16000069936 |
| 84361010#1 | 6161/TCHQ-TXNK | 2018 | 84361010 | https://vbpl.ts24.com.vn/support/solutions/articles/16000087100 |
| 84361010#2 | 6281/TCHQ-TXNK | 2017 | 84361010 | https://vbpl.ts24.com.vn/support/solutions/articles/16000067610 |
| 84368011#0 | 3935/TCHQ-TNXK | 2019 | 84368011 | https://vbpl.ts24.com.vn/support/solutions/articles/16000096649 |
| 84379019#0 | 11955/TCHQ-TXNK | 2015 | 84379019 | https://vbpl.ts24.com.vn/support/solutions/articles/16000018343 |
| 84379029#0 | 11955/TCHQ-TXNK | 2015 | 84379029 | https://vbpl.ts24.com.vn/support/solutions/articles/16000018343 |
| 84514000#2 | 7586/TCHQ-TXNK | 2017 | 84514000 | https://vbpl.ts24.com.vn/support/solutions/articles/16000069944 |
| 84542000#0 | 6446/TCHQ-TXNK | 2018 | 84542000 | https://vbpl.ts24.com.vn/support/solutions/articles/16000087989 |
| 84772020#0 | 6592/TCHQ-TXNK | 2018 | 84772020 | https://vbpl.ts24.com.vn/support/solutions/articles/16000088205 |
| 84779039#0 | 6592/TCHQ-TXNK | 2018 | 84779039 | https://vbpl.ts24.com.vn/support/solutions/articles/16000088205 |
| 84796000#0 | 1713/TCHQ-TXNK | 2021 | 84796000 | https://thuvienxuatnhapkhau.com/phan-loai-may-lam-mat-khong-khi-bang-bay-hoi.html |
| 84829900#0 | 1015/TCHQ-TXNK | 2020 | 84829900 | https://hscode.xn--thunops-2p4c.vn/2020/03/84829900-phan-loai-ong-lot-truc-vong-bi.html |
| 84833090#0 | 6591/TCHQ-TXNK | 2018 | 84833090 | https://luatvietnam.vn/hai-quan/cong-van-6591-tchq-txnk-2018-phan-loai-o-truot-168821-d6.html |
| 85081100#0 | 1864/TCHQ-TXNK | 2021 | 85081100 | https://vbpl.ts24.com.vn/support/solutions/articles/16000121366 |
| 85081100#1 | 6538/TCHQ-TXNK | 2019 | 85081100 | https://vbpl.ts24.com.vn/support/solutions/articles/16000101513 |
| 85081100#2 | 2578/TCHQ-TXNK | 2019 | 85081100 | https://vbpl.ts24.com.vn/support/solutions/articles/16000095088 |
| 85094000#0 | 5676/TCHQ-TXNK | 2019 | 85094000 | https://hethongphapluat.com/cong-van-5676-tchq-txnk-nam-2019-ve-phan-loai-hang-hoa-do-la-may-xay-tron-thuc-pham-va-do-uong-nhap-khau-tong-cuc-hai-quan-ban-hanh.html |
| 85098090#0 | 4198/TCHQ-TXNK | 2022 | 85098090 | https://caselaw.vn/van-ban-phap-luat/428712-cong-van-so-4198-tchq-txnk-ngay-06-10-2022-cua-tong-cuc-hai-quan-huong-dan-phan-loai-mat-hang-may-tam-nuoc |
| 85098090#3 | 1713/TCHQ-TXNK | 2021 | 85098090 | https://thuvienxuatnhapkhau.com/phan-loai-may-lam-mat-khong-khi-bang-bay-hoi.html |
| 85122099#0 | 1581/TCHQ-TXNK | 2022 | 85122099 | https://thuvienxuatnhapkhau.com/cong-van-1581-tchq-txnk-nam-2022-v-v-phan-loai-bo-den-suong-mu-drl-daytime-running-light-dung-cho-xe-o-to-mazda-cx-5.html |
| 85169030#0 | 6926/TCHQ-TXNK | 2013 | 85169030 | https://vbpl.ts24.com.vn/support/solutions/articles/16000025022 |
| 85176259#11 | 1601/TCHQ-TXNK | 2022 | 85176259 | https://thuvienxuatnhapkhau.com/cong-van-1601-tchq-txnk-nam-2022-phan-loai-thiet-bi-lien-lac-trong-nha-va-ngoai-cua.html |
| 85285910#0 | 1628/TCHQ-TXNK | 2020 | 85285910 | https://vbpl.ts24.com.vn/support/solutions/articles/16000106977 |
| 85286200#3 | 7656/TCHQ-TXNK | 2019 | 85286200 | https://vbpl.ts24.com.vn/support/solutions/articles/16000127982 |
| 85353019#0 | 10923/TCHQ-TXNK | 2015 | 85353019 | https://vbpl.ts24.com.vn/support/solutions/articles/16000017881 |
| 85399090#0 | 6100/TCHQ-TXNK | 2015 | 85399090 | https://vbpl.ts24.com.vn/support/solutions/articles/16000015635 |
| 85423100#0 | 11693/TCHQ-TXNK | 2015 | 85423100 | https://vbpl.ts24.com.vn/support/solutions/articles/16000018330 |
| 87031010#0 | 482/CHQ-NVTHQ | 2025 | 87031010 | https://vbpl.ts24.com.vn/support/solutions/articles/16000209739 |
| 87033253#0 | 3905/TCHQ-TXNK | 2020 | 87033253 | https://vbpl.ts24.com.vn/support/solutions/articles/16000110270 |
| 87051000#0 | 2383/TCHQ-TXNK | 2018 | 87051000 | https://vbpl.ts24.com.vn/support/solutions/articles/16000078549 |
| 87054000#0 | 1293/TCHQ-TXNK | 2018 | 87054000 | https://vbpl.ts24.com.vn/support/solutions/articles/16000076302 |
| 87082995#1 | 3552/TCHQ-TXNK | 2021 | 87082995 | https://thuvienxuatnhapkhau.com/cong-van-3552-tchq-txnk-nam-2021-ve-phan-loai-mat-hang-nap-thung-xe-ban-tai.html |
| 87082998#0 | 3552/TCHQ-TXNK | 2021 | 87082998 | https://thuvienxuatnhapkhau.com/cong-van-3552-tchq-txnk-nam-2021-ve-phan-loai-mat-hang-nap-thung-xe-ban-tai.html |
| 87141090#1 | 8953/TCHQ-TXNK | 2014 | 87141090 | https://vbpl.ts24.com.vn/support/solutions/articles/16000027013 |
| 87141090#2 | 346/TCHQ-TXNK | 2018 | 87141090 | https://vbpl.ts24.com.vn/support/solutions/articles/16000072912 |
| 90111000#0 | 11484/TCHQ-TXNK | 2015 | 90111000 | https://vbpl.ts24.com.vn/support/solutions/articles/16000018008 |
| 90230000#0 | 1294/TCHQ-TXNK | 2018 | 90230000 | https://vbpl.ts24.com.vn/support/solutions/articles/16000076303 |
| 94032090#3 | 8597/TCHQ-TXNK | 2015 | 94032090 | https://vbpl.ts24.com.vn/support/solutions/articles/16000016484 |
| 94032090#4 | 5950/CHQ-NVTHQ | 2025 | 94032090 | https://vbpl.ts24.com.vn/support/solutions/articles/16000224121 |
| 94032090#5 | 6419/TCHQ-TXNK | 2016 | 94032090 | https://vbpl.ts24.com.vn/support/solutions/articles/16000031511 |
| 94037010#0 | 08/TCHQ-TXNK | 2023 | 94037010 | https://vbpl.ts24.com.vn/support/solutions/articles/16000157718 |
| 95030010#0 | 08/TCHQ-TXNK | 2023 | 95030010 | https://vbpl.ts24.com.vn/support/solutions/articles/16000157718 |
| 95045090#0 | 5725/TCHQ-TXNK | 2023 | 95045090 | https://vbpl.ts24.com.vn/support/solutions/articles/16000172349 |
| 95063100#0 | 5725/TCHQ-TXNK | 2023 | 95063100 | https://vbpl.ts24.com.vn/support/solutions/articles/16000172349 |
| 95063200#0 | 5725/TCHQ-TXNK | 2023 | 95063200 | https://vbpl.ts24.com.vn/support/solutions/articles/16000172349 |
| 95063900#0 | 5725/TCHQ-TXNK | 2023 | 95063900 | https://vbpl.ts24.com.vn/support/solutions/articles/16000172349 |
| 040320#0 | 3771/TCHQ-TXNK | 2023 | 040320 | https://thuvienxuatnhapkhau.com/cong-van-3771-tchq-txnk-nam-2023-ve-phan-loai-mat-hang-sua-chua.html |
| 03074310#0 | 5186/TCHQ-TXNK | 2021 | 03074310 | https://thuvienxuatnhapkhau.com/cong-van-5186-tchq-txnk-nam-2021-vv-phan-loai-mat-hang-muc-nang-va-muc-ong-dong-lanh.html |
| 03074390#0 | 5186/TCHQ-TXNK | 2021 | 03074390 | https://thuvienxuatnhapkhau.com/cong-van-5186-tchq-txnk-nam-2021-vv-phan-loai-mat-hang-muc-nang-va-muc-ong-dong-lanh.html |

## KHONG_NAM: 39

Không có năm, không có ngày; số thông báo lặp mỗi năm nên không định danh được

| Vị trí | Số | Năm | Mã | Bằng chứng / nguồn |
|---|---|---|---|---|
| 853669#0 | 1138/TB-TCHQ |  | 853669 | https://camnangxnk-logistics.net/6258-tchq-txnk-1138-tb-tchq-v-v-phan-loai-ma-hs-dau-noi-dang-thanh-tuy-co-truong-hop-co-the-su-dung-voi-cau-dau-noi-loai-bat-vit-tuc-la-phai-co-dinh-dau-noi-vao-vi-tri-tiep-xuc-dien-tai-cau-dau-noi/ |
| 21039019#0 | 2382/TB-CHQ |  | 21039019 | https://luatvietnam.vn/xuat-nhap-khau/thong-bao-2382-tb-chq-cua-cuc-hai-quan-ve-ket-qua-xac-dinh-truoc-ma-so-doi-voi-chiet-xuat-cua-crab-extract-f-11926-l-415282-399819-d6.html |
| 32089019#0 | 2658/TB-TCHQ |  | 32089019 | https://camnangxnk-logistics.net/2658-tb-tchq-ma-hs-f-52-30-shd-5-vecni-muc-2-to-khai-hai-quan-vecni-di-tu-nhua-acrylic-nhua-amino-loai-chiu-duoc-nhiet-tren-100c-dang-hoa-tan-trong-dung-moi-huu-co-hs-3208-90-19/ |
| 32089019#1 | 2659/TB-TCHQ |  | 32089019 | https://camnangxnk-logistics.net/2658-tb-tchq-ma-hs-f-52-30-shd-5-vecni-muc-2-to-khai-hai-quan-vecni-di-tu-nhua-acrylic-nhua-amino-loai-chiu-duoc-nhiet-tren-100c-dang-hoa-tan-trong-dung-moi-huu-co-hs-3208-90-19/ |
| 32089019#2 | 2660/TB-TCHQ |  | 32089019 | https://camnangxnk-logistics.net/2658-tb-tchq-ma-hs-f-52-30-shd-5-vecni-muc-2-to-khai-hai-quan-vecni-di-tu-nhua-acrylic-nhua-amino-loai-chiu-duoc-nhiet-tren-100c-dang-hoa-tan-trong-dung-moi-huu-co-hs-3208-90-19/ |
| 32089090#23 | 2122/TB-TCHQ |  | 32089090 | https://camnangxnk-logistics.net/2122-tb-tchq-ma-hs-son-zettar-ep-2-b-17lit-thung-lam-tu-zinc-ducst-epoxy-resin-xylene-chat-lam-cung-1-thanh-phan-cua-son-zettar-ep-2h-3ii9-ecan-lam-tu-aliphatic-polyamide-amine-resin/ |
| 32089090#24 | 2122/TB-TCHQ |  | 32089090 | https://camnangxnk-logistics.net/2122-tb-tchq-ma-hs-son-zettar-ep-2-b-17lit-thung-lam-tu-zinc-ducst-epoxy-resin-xylene-chat-lam-cung-1-thanh-phan-cua-son-zettar-ep-2h-3ii9-ecan-lam-tu-aliphatic-polyamide-amine-resin/ |
| 32089090#25 | 1189/TB-TCHQ |  | 32089090 | https://camnangxnk-logistics.net/1189-tb-tchq-ma-hs-re-1538wpa-2020n-la-ban-thanh-pham-cua-son-di-tu-copolymer-dang-long-tp-methyl-methacrylate-copolymer-w-45-toluene-34-5-iso-butyl-alcohol-13-7n-butyl-alcohol-3ethyl-ac/ |
| 32089090#55 | 1823/TB-TCHQ |  | 32089090 | https://camnangxnk-logistics.net/1823-tb-tchq-ma-hs-polyulac-no-200-f-hb-choco-brown-b-h-son-chong-an-mon-dung-cho-son-vo-tau-bien-da-phan-tan-trong-moi-truong-khong-chua-nuoc-hang-moi-100-90-cap-x-3-3-kg-cap-hs-3208-90/ |
| 38249999#285 | 1092/TB-TCHQ |  | 38249999 | https://camnangxnk-logistics.net/1092-tb-tchq-ma-hs-che-pham-hoa-hoc-zinc-carbonate-pcc334-hang-khong-thuoc-tien-chat-hoa-chat-nguy-hiem-hs-3824-99-99/ |
| 38249999#286 | 1288/TB-TCHQ |  | 38249999 | https://camnangxnk-logistics.net/1288-tb-tchq-ma-hs-che-pham-hut-am-co-ham-luong-chinh-la-canxi-oxit-va-polyetylen-dang-hat-dung-de-hut-am-khong-khi-trong-san-xuat-san-pham-nhua-hs-3824-9999/ |
| 38249999#288 | 6487/TB-TCHQ |  | 38249999 | https://camnangxnk-logistics.net/6487-tb-tchq-ma-hs-chat-xu-ly-nuoc-thai-chua-can-su-dung-trong-qua-trinh-san-xuat-giay-poly-aluminium-chloride-pac-hs-3824-99-99/ |
| 38249999#290 | 1322/TB-TCHQ |  | 38249999 | https://camnangxnk-logistics.net/1322-tb-tchq-ma-hs-chat-tao-bot-bk-201-co-nguon-goc-tu-dau-thong-cong-thuc-hoa-hoc-c10h17oh-nong-do-70-dang-long-175kg-thung-dung-trong-tach-chiet-kim-loai-dong-ra-khoi-quang-dong-hs-3824-99-99/ |
| 38249999#292 | 1168/TB-TCHQ |  | 38249999 | https://camnangxnk-logistics.net/1168-tb-tchq-ma-hs-hat-don-mb-80-cancium-carbonate-masterbatch-fillerdung-de-san-xuat-bao-bi-nhua-thanh-phan-bao-gom-bot-da-caco3-chiem-80-1-nhua-chiem-20-dong-goi-25kg-bao-hs-3824-99-99-90/ |
| 38249999#473 | 1094/TB-TCHQ |  | 38249999 | https://camnangxnk-logistics.net/1094-tb-tchq-ma-hs-chat-phu-gia-c2-al2o3-55-sio2-35-cao-45-che-pham-hoa-hoc-co-chua-hon-hop-canxi-nhom-oxit-oxit-silic-va-phu-gia-dang-bot-hs-3824-9999/ |
| 38249999#474 | 1702/TB-TCHQ |  | 38249999 | https://camnangxnk-logistics.net/1702-tb-tchq-ma-hs-chat-ket-dinh-lam-tu-polyme-adhesive-tec9652kkyocera-chemical-tec96520-32kg-s-h-f0203-600-00-000-che-pham-dong-ran-vecni-co-thanh-phan-chinh-gom-organic-peroxide-xylene-alip/ |
| 39211391#4 | 2470/TB-TCHQ |  | 39211391 | https://camnangxnk-logistics.net/?s=3921 |
| 39269099#20 | 5110/TB-TCHQ |  | 39269099 | https://camnangxnk-logistics.net/5110-tb-tchq-ma-hs-thanh-nep-nhua-polycarbonate-dang-thanh-chua-gia-co-chua-gan-lop-mat-chua-khoan-lo-xe-ranh-dung-trong-xay-dung-kt-rong-20-60mm-dai-6000mm-day-6-0-8-0mm-10kg-thanh/ |
| 44187500#0 | 7164/TB-TCHQ |  | 44187500 | https://camnangxnk-logistics.net/7164-tb-tchq-ma-hs-van-lot-san-lam-tu-go-dan-go-soi-trang-go-soi-do-go-mai-chau-go-bach-dan-hs-4418-75-00/ |
| 48239099#4 | 3629/TB-TCHQ |  | 48239099 | https://camnangxnk-logistics.net/3629-tb-tchq-ma-hs-tam-giay-kraf-cach-dien-chua-tay-trang-mot-mat-trang-phu-lop-huu-co-khong-tu-dinh-mot-mat-dan-cac-thanh-giay-ep-day-8mm-rong-8mm-cach-nhau-35mm-ddp-025-vv-516mm-de-sx-may-bien-the-p/ |
| 48239099#5 | 3630/TB-TCHQ |  | 48239099 | https://camnangxnk-logistics.net/3629-tb-tchq-ma-hs-tam-giay-kraf-cach-dien-chua-tay-trang-mot-mat-trang-phu-lop-huu-co-khong-tu-dinh-mot-mat-dan-cac-thanh-giay-ep-day-8mm-rong-8mm-cach-nhau-35mm-ddp-025-vv-516mm-de-sx-may-bien-the-p/ |
| 54076990#1 | 1952/TB-TCHQ |  | 54076990 | https://camnangxnk-logistics.net/1952-tb-tchq-ma-hs-vai-moc-chua-duoc-xu-ly-hoan-tat-100-polyester-437f1-grade-c4-kho-69-vai-det-thoi-dinh-luong-356g-m2-su-dung-trong-nganh-may-mac-hs-5407-69-90/ |
| 72083990#7 | 6063/TB-TCHQ |  | 72083990 | https://camnangxnk-logistics.net/6063-tb-tchq-ma-hs-thep-cuon-can-nong-khong-hop-kim-da-can-phang-chua-trang-phu-ma-son-o-dang-cuon-dung-de-lam-ong-thep-hoac-ton-can-nguoi-kich-thuoc-2-75-mm-x-630mm-mac-thep-q195-hang-moi-100/ |
| 72091610#4 | 459/TB-TCHQ |  | 72091610 | https://camnangxnk-logistics.net/459-tb-tchq-ma-hs-thep-cuon-can-nguoi-can-phang-khong-hop-kim-chua-trang-phu-ma-son-hang-moi-100-tieu-chuan-jis-g3141-mac-thep-spcc-sd-kich-thuoc-1-2mm-x-1219mm-x-cuon-hs-7209-16-10/ |
| 72091690#2 | 1332/TB-TCHQ |  | 72091690 | https://camnangxnk-logistics.net/1332-tb-tchq-ma-hs-thep-khong-hop-kim-can-phang-chua-gia-cong-qua-muc-can-nguoi-chua-dat-phu-ma-trang-dang-cuon-tieu-chuan-j1s-g3141-mac-thep-spcc-sd-kich-thuoc-1-2mm-x-1530mm-x-c-hs-7209-16-9/ |
| 72092610#0 | 1754/TB-TCHQ |  | 72092610 | https://camnangxnk-logistics.net/1754-tb-tchq-ma-hs-thep-tam-can-nguoi-s45c-khong-hop-kim-can-phang-tieu-chuan-jis-g405-1-2005-co-ham-luong-carbon/ |
| 72254090#0 | 2644/TB-TCHQ |  | 72254090 | https://camnangxnk-logistics.net/2644-tb-tchq-ma-hs-thep-hop-kim-dang-tam-can-phang-can-nong-chua-trang-phu-ma-bo00008-everhard-mac-thep-jfe-eh-c500le-kich-thuoc-6-8mmx1500-2000nmx6000mm-hang-moi-100-muc-04-pltk-hs/ |
| 72261990#0 | 2238/TB-TCHQ |  | 72261990 | https://camnangxnk-logistics.net/2238-tb-tchq-ma-hs-thep-hop-kim-silic-ky-thuat-dien-can-phang-can-nguoi-dang-cuon-tphc-0-6/ |
| 85044090#5 | 1055/TB-TCHQ |  | 85044090 | https://camnangxnk-logistics.net/1054-tb-tchq-ma-hs-bo-chuyen-nguon-dien-va-chan-dong-dien-1-chieu-tu-12v-sang-48v-trong-truong-hop-khan-cap-cho-xe-tay-ga-part-adp-89-hang-moi-100-linh-kien-dung-cho-xe-may-honda-pcx-125cc-hs/ |
| 85049039#0 | 7626/TB-TCHQ |  | 85049039 | https://camnangxnk-logistics.net/7626-tb-tchq-ma-hs-loi-cua-cuon-cam-dung-cho-may-bien-the-amorphous-alloy-1k101-0025mm-x-213mm-xc-dung-duoc-cho-tat-ca-cac-may-co-cong-suat-khong-qua-10000k-va-hs-8504-90-39/ |
| 85182110#1 | 3328/TB-CHQ |  | 85182110 | https://luatvietnam.vn/xuat-nhap-khau/thong-bao-3328-tb-chq-cua-cuc-hai-quan-ve-ket-qua-xac-dinh-truoc-ma-so-doi-voi-thiet-bi-thong-bao-thanh-toan-chuyen-khoan-thanh-cong-tingee-6ls-399196-d6.html |
| 85365051#0 | 4012/TB-TCHQ |  | 85365051 | https://camnangxnk-logistics.net/4012-tb-tchq-ma-hs-cong-tac-dien-co-bat-nhanh-dung-cho-den-phanh-xe-may-hs-8536-50-51/ |
| 85366992#3 | 1151/TB-CHQ |  | 85366992 | https://luatvietnam.vn/xuat-nhap-khau/thong-bao-1151-tb-chq-cua-cuc-hai-quan-ve-ket-qua-xac-dinh-truoc-ma-so-doi-voi-power-strip-o-cam-dien-t411-397241-d6.html |
| 85369019#0 | 206/TB-TCHQ |  | 85369019 | https://camnangxnk-logistics.net/206-tb-tchq-ma-hs-cau-noi-nguon-dien-phu-kien-terminal-block-ys-ct-10-af-dien-ap-duoi-1000v-dung-nap-cho-tu-dien-nhan-hieu-yong-sung-hs-8536-90-19/ |
| 85369094#2 | 2492/TB-TCHQ |  | 85369094 | https://camnangxnk-logistics.net/2492-tb-tchq-ma-hs-nap-chup-bao-ve-tu-dien-bang-nhua-1fc81966000080-linh-kien-lap-rap-bo-phan-dien-xe-may-vamaha-moi-100-hs-8536-90-94/ |
| 85371019#3 | 4040/TB-TCHQ |  | 85371019 | https://camnangxnk-logistics.net/4040-tb-tchq-ma-hs-bang-mach-dieu-khien-cua-thiet-bi-loc-khong-khi-hs-85371019/ |
| 85371019#4 | 4800/TB-TCHQ |  | 85371019 | https://camnangxnk-logistics.net/4800-tb-tchq-ma-hs-modul-dieu-khien-tin-hieu-chieu-sang-cua-den-led-ky-hieu-lmu22bwn00_kgn-hs-8537-1019/ |
| 85437090#4 | 4056/TB-TCHQ |  | 85437090 | https://camnangxnk-logistics.net/4056-tb-tchq-ma-hs-may-tao-tan-so-thap-trong-thiet-bi-kich-thich-su-van-dong-cua-nhom-co-bang-dong-dien-hs-85437090/ |
| 94017100#0 | 382/TB-CHQ |  | 94017100 | https://luatvietnam.vn/xuat-nhap-khau/thong-bao-382-tb-chq-cua-cuc-hai-quan-ve-ket-qua-xac-dinh-truoc-ma-so-doi-voi-ghe-thu-gian-psio-trans-395442-d6.html |

## LOI_AGENT: 202

Mô tả do agent viết lại, không phải chữ thông báo

| Vị trí | Số | Năm | Mã | Bằng chứng / nguồn |
|---|---|---|---|---|
| 12081000#1 | 2342/TB-TCHQ | 2020 | 12081000 | agent-tbtchq-toan-van; không có toàn văn; https://thuvienxuatnhapkhau.com/thong-bao-2342-tb-tchq-nam-2020-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-khau-nhap-khau-la-bot-dau-nanh.html |
| 21069072#27 | 3940/TB-TCHQ | 2021 | 21069072 | agent-tbtchq-toan-van; toàn văn chứa 73%; https://thuvienxuatnhapkhau.com/thong-bao-3940-tb-tchq-nam-2021-ve-ket-qua-xac-dinh-truoc-ma-so-doi-voi-thuc-pham-bao-ve-suc-khoe-pikabiotic.html |
| 21069099#32 | 17752/TB-CHQ | 2026 | 21069099 | agent-tbtchq-toan-van; không có toàn văn; https://thuvienxuatnhapkhau.com/thong-bao-17752-tb-chq-nam-2026-ve-ket-qua-xac-dinh-truoc-ma-so-doi-voi-nuoc-lam-kem-da-vi-xoai-sun-lolly-sun-lolly-water-ice-with-mango-flavour-for-freezing.html |
| 25174100#0 | 5722/TB-TCHQ | 2023 | 25174100 | agent-tbtchq-toan-van; không có toàn văn; https://thuvienxuatnhapkhau.com/thong-bao-5722-tb-tchq-nam-2023-vv-phan-loai-mat-hang-bot-da-xuat-khau.html |
| 25174900#1 | 5722/TB-TCHQ | 2023 | 25174900 | agent-tbtchq-toan-van; không có toàn văn; https://thuvienxuatnhapkhau.com/thong-bao-5722-tb-tchq-nam-2023-vv-phan-loai-mat-hang-bot-da-xuat-khau.html |
| 27101990#13 | 4935/TB-TCHQ | 2015 | 27101990 | agent-tbtchq-toan-van; không có toàn văn; https://thuvienxuatnhapkhau.com/thong-bao-ket-qua-phan-loai-doi-voi-dau-cat-got-cutting-oil-scl-35.html |
| 32041110#0 | 7609/TB-TCHQ | 2015 | 32041110 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/3675-thong-bao-7609-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-thuoc-nhuom-do-tong-cuc-hai-quan-ban-hanh |
| 32041190#1 | 7014/TB-TCHQ | 2015 | 32041190 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/3902-thong-bao-7014-tb-tchq-nam-2015-ve-ket-qua-phan-loai-hang-hoa-xuat-nhap-khau-la-thuoc-nhuom-dung-trong-cong-nghiep-det-nhuom-do-tong-cuc-hai-quan-ban-hanh |
| 32041190#2 | 7013/TB-TCHQ | 2015 | 32041190 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/3903-thong-bao-7013-tb-tchq-nam-2015-ve-ket-qua-phan-loai-hang-hoa-xuat-nhap-khau-la-thuoc-nhuom-dung-trong-cong-nghiep-det-nhuom-do-tong-cuc-hai-quan-ban-hanh |
| 32041190#3 | 7012/TB-TCHQ | 2015 | 32041190 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/3904-thong-bao-7012-tb-tchq-nam-2015-ve-ket-qua-phan-loai-hang-hoa-xuat-nhap-khau-la-thuoc-nhuom-dung-trong-cong-nghiep-det-nhuom-do-tong-cuc-hai-quan-ban-hanh |
| 32041190#4 | 7011/TB-TCHQ | 2015 | 32041190 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/3905-thong-bao-7011-tb-tchq-nam-2015-ve-ket-qua-phan-loai-hang-hoa-xuat-nhap-khau-la-thuoc-nhuom-dung-trong-cong-nghiep-det-nhuom-do-tong-cuc-hai-quan-ban-hanh |
| 32041190#5 | 7010/TB-TCHQ | 2015 | 32041190 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/3906-thong-bao-7010-tb-tchq-nam-2015-ve-ket-qua-phan-loai-hang-hoa-xuat-nhap-khau-la-thuoc-nhuom-dung-trong-cong-nghiep-det-nhuom-do-tong-cuc-hai-quan-ban-hanh |
| 32041210#0 | 844/TB-TCHQ | 2016 | 32041210 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2233-thong-bao-844-tb-tchq-nam-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-thuoc-nhuom-axit-do-tong-cuc-hai-quan-ban-hanh |
| 32041210#1 | 718/TB-TCHQ | 2016 | 32041210 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2321-thong-bao-718-tb-tchq-nam-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-che-pham-mau-dang-long-do-tong-cuc-hai-quan-ban-hanh |
| 32041210#2 | 6929/TB-TCHQ | 2015 | 32041210 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/3936-thong-bao-6929-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-bot-mau-xanh-do-tong-cuc-hai-quan-ban-hanh |
| 32041210#3 | 6928/TB-TCHQ | 2015 | 32041210 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/3937-thong-bao-6928-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-bot-mau-vang-do-tong-cuc-hai-quan-ban-hanh |
| 32041210#4 | 6013/TB-TCHQ | 2015 | 32041210 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/4097-thong-bao-6013-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-thuoc-nhuom-axit-dang-bot-min-do-tong-cuc-hai-quan-ban-hanh |
| 32041300#0 | 5642/TB-TCHQ | 2015 | 32041300 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/4230-thong-bao-5642-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-che-pham-thuoc-nhuom-bazo-do-tong-cuc-hai-quan-ban-hanh |
| 32041300#1 | 3099/TB-TCHQ | 2015 | 32041300 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/5151-thong-bao-3099-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-phu-gia-hoa-chat-xi-ma-do-tong-cuc-hai-quan-ban-hanh |
| 32041300#2 | 2118/TB-TCHQ | 2015 | 32041300 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/5454-thong-bao-2118-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-thuoc-nhuom-phan-tan-do-tong-cuc-hai-quan-ban-hanh |
| 32041400#0 | 7003/TB-TCHQ | 2015 | 32041400 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/3893-thong-bao-7003-tb-tchq-nam-2015-ve-ket-qua-phan-loai-hang-hoa-xuat-nhap-khau-la-thuoc-nhuom-dung-trong-cong-nghiep-det-do-tong-cuc-hai-quan-ban-hanh |
| 32041400#1 | 5245/TB-TCHQ | 2015 | 32041400 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/4347-thong-bao-5245-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-thuoc-nhuom-truc-tiep-dang-bot-dung-de-nhuom-da-do-tong-cuc-hai-quan-ban-hanh |
| 32041400#2 | 714/TB-TCHQ | 2015 | 32041400 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/5811-thong-bao-714-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-phu-gia-ma-thanh-phan-co-chua-basic-dye-100-do-tong-cuc-hai-quan-ban-hanh |
| 32041600#0 | 2710/TB-TCHQ | 2016 | 32041600 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/1772-thong-bao-2710-tb-tchq-nam-2016-ve-ket-qua-phan-loai-hang-hoa-xuat-nhap-khau-la-thuoc-nhuom-hoat-tinh-solophenyl-blue-fgle-220-do-tong-cuc-hai-quan-ban-hanh |
| 32041600#1 | 7896/TB-TCHQ | 2015 | 32041600 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/3623-thong-bao-so-7896-tb-tchq-ngay-31-08-2015-ve-ket-qua-phan-loai-hang-hoa-xuat-nhap-khau-la-thuoc-nhuom-red-p-bn-gr-tinh-trang-hieu-luc-khong-xac-dinh |
| 32041600#2 | 7895/TB-TCHQ | 2015 | 32041600 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/3624-thong-bao-7895-tb-tchq-nam-2015-ve-ket-qua-phan-loai-hang-hoa-xuat-nhap-khau-la-thuoc-nhuom-yellow-p-2rn-gr-do-tong-cuc-hai-quan-ban-hanh |
| 32041600#3 | 4500/TB-TCHQ | 2015 | 32041600 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/4658-thong-bao-4500-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-thuoc-nhuom-hoat-tinh-dang-bot-do-tong-cuc-hai-quan-ban-hanh |
| 32041600#4 | 4498/TB-TCHQ | 2015 | 32041600 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/4660-thong-bao-4498-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-thuoc-nhuom-hoat-tinh-dang-bot-do-tong-cuc-hai-quan-ban-hanh |
| 32041900#0 | 860/TB-TCHQ | 2016 | 32041900 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2201-thong-bao-860-tb-tchq-nam-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-thuoc-mau-do-tong-cuc-hai-quan-ban-hanh |
| 32041900#1 | 816/TB-TCHQ | 2016 | 32041900 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2208-thong-bao-816-tb-tchq-nam-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-che-pham-mau-xanh-rgl-220-hf-dung-de-pha-xang-do-tong-cuc-hai-quan-ban-hanh |
| 32041900#2 | 14820/TB-TCHQ | 2014 | 32041900 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/6101-thong-bao-14820-tb-tchq-nam-2014-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-thuoc-mau-huu-co-phan-tan-trong-moi-truong-khong-chua-nuoc-dung-de-san-xuat-son-do-tong-cuc-hai-quan-ban-hanh |
| 32041900#3 | 14811/TB-TCHQ | 2014 | 32041900 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/6110-thong-bao-14811-tb-tchq-nam-2014-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-che-pham-lam-tu-mau-huu-co-tong-hop-dung-de-san-xuat-son-do-tong-cuc-hai-quan-ban-hanh |
| 32041900#4 | 14810/TB-TCHQ | 2014 | 32041900 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/6114-thong-bao-14810-tb-tchq-nam-2014-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-che-pham-lam-tu-mau-huu-co-tong-hop-dung-de-san-xuat-son-do-tong-cuc-hai-quan-ban-hanh |
| 32042000#1 | 2663/TB-TCHQ | 2015 | 32042000 | agent-tbtchq-thep-hoachat; không có toàn văn; https://luatvietnam.vn/xuat-nhap-khau/thong-bao-2663-tb-tchq-tong-cuc-hai-quan-300923-d6.html |
| 32042000#2 | 459/TB-TCHQ | 2016 | 32042000 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2480-thong-bao-459-tb-tchq-nam-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-che-pham-hoa-chat-co-chua-tac-nhan-tang-sang-huynh-quang-top-lucina-2000a-do-tong-cuc-hai-quan-ban-hanh |
| 32042000#3 | 458/TB-TCHQ | 2016 | 32042000 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2481-thong-bao-458-tb-tchq-nam-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-che-pham-hoa-chat-co-chua-chat-tang-sang-huynh-quang-top-lucina-2000mu-do-tong-cuc-hai-quan-ban-hanh |
| 32042000#4 | 7004/TB-TCHQ | 2015 | 32042000 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/3912-thong-bao-7004-tb-tchq-nam-2015-ve-ket-qua-phan-loai-hang-hoa-xuat-nhap-khau-la-che-pham-huu-co-tong-hop-dung-lam-tang-sang-huynh-quang-do-tong-cuc-hai-quan-ban-hanh |
| 32042000#5 | 5041/TB-TCHQ | 2015 | 32042000 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/4401-thong-bao-5041-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-chat-mau-huu-co-tong-hop-do-tong-cuc-hai-quan-ban-hanh |
| 32042000#6 | 4511/TB-TCHQ | 2015 | 32042000 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/4647-thong-bao-4511-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-mau-nuoc-huu-co-do-tong-cuc-hai-quan-ban-hanh |
| 32049000#0 | 8090/TB-TCHQ | 2015 | 32049000 | agent-tbtchq-thep-hoachat; không có toàn văn; https://luatvietnam.vn/xuat-nhap-khau/thong-bao-8090-tb-tchq-tong-cuc-hai-quan-98353-d6.html |
| 32049000#1 | 4733/TB-TCHQ | 2015 | 32049000 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/4539-thong-bao-4733-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-thuoc-mau-dung-pha-muc-trong-in-lua-do-tong-cuc-hai-quan-ban-hanh |
| 32049000#2 | 4732/TB-TCHQ | 2015 | 32049000 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/4540-thong-bao-4732-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-thuoc-mau-dung-pha-muc-trong-in-lua-do-tong-cuc-hai-quan-ban-hanh |
| 32049000#3 | 4730/TB-TCHQ | 2015 | 32049000 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/4542-thong-bao-4730-tb-tchq-nam-2015-ve-ket-qua-phan-loai-hang-hoa-xuat-nhap-khau-la-thuoc-mau-dung-pha-muc-trong-in-lua-do-tong-cuc-hai-quan-ban-hanh |
| 32049000#4 | 4736/TB-TCHQ | 2015 | 32049000 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/4560-thong-bao-4736-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-thuoc-mau-do-tong-cuc-hai-quan-ban-hanh |
| 32049000#5 | 4735/TB-TCHQ | 2015 | 32049000 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/4561-thong-bao-4735-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-thuoc-mau-do-tong-cuc-hai-quan-ban-hanh |
| 32061110#0 | 7255/TB-TCHQ | 2015 | 32061110 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/3811-thong-bao-7255-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-che-pham-thuoc-mau-do-tong-cuc-hai-quan-ban-hanh |
| 32061110#1 | 6004/TB-TCHQ | 2015 | 32061110 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/4106-thong-bao-6004-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-nguyen-lieu-san-xuat-thuoc-do-tong-cuc-hai-quan-ban-hanh |
| 32061110#2 | 4501/TB-TCHQ | 2015 | 32061110 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/4657-thong-bao-4501-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-thuoc-mau-chua-ham-luong-dioxit-titan-80-do-tong-cuc-hai-quan-ban-hanh |
| 32061110#3 | 3457/TB-TCHQ | 2015 | 32061110 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/5055-thong-bao-3457-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-thuoc-mau-do-tong-cuc-hai-quan-ban-hanh |
| 32061110#4 | 1524/TB-TCHQ | 2015 | 32061110 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/5613-thong-bao-1524-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-thuoc-mau-tu-dioxit-titan-do-tong-cuc-hai-quan-ban-hanh |
| 32061190#1 | 5407/TB-TCHQ | 2015 | 32061190 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/4286-thong-bao-5407-tb-tchq-nam-2015-ve-ket-qua-phan-loai-hang-hoa-xuat-nhap-khau-la-che-pham-thuoc-mau-vo-co-do-tong-cuc-hai-quan-ban-hanh |
| 32061190#2 | 1145/TB-TCHQ | 2015 | 32061190 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/5667-thong-bao-1145-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-che-pham-mau-mau-trang-farsperse-white-pw-cft-do-tong-cuc-hai-quan-ban-hanh |
| 32061910#0 | 412/TB-TCHQ | 2016 | 32061910 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2525-thong-bao-412-tb-tchq-nam-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-chat-hoan-tat-dung-trong-nganh-det-do-tong-cuc-hai-quan-ban-hanh |
| 32061910#1 | 4603/TB-TCHQ | 2015 | 32061910 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/4608-thong-bao-4603-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-muc-in-cac-loai-do-tong-cuc-hai-quan-ban-hanh |
| 32061990#3 | 6006/TB-TCHQ | 2015 | 32061990 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/4104-thong-bao-6006-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-bot-lam-ta-duoc-do-tong-cuc-hai-quan-ban-hanh |
| 32061990#4 | 3704/TB-TCHQ | 2015 | 32061990 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/5012-thong-bao-3704-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-che-pham-mau-vo-co-do-tong-cuc-hai-quan-ban-hanh |
| 32061990#5 | 12001/TB-TCHQ | 2014 | 32061990 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/7021-thong-bao-12001-tb-tchq-nam-2014-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-emu-white-fx-4174-30kg-dm-che-pham-thuoc-mau-vo-co-do-tong-cuc-hai-quan-ban-hanh |
| 32061990#6 | 11830/TB-TCHQ | 2014 | 32061990 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/7122-thong-bao-11830-tb-tchq-nam-2014-ve-ket-qua-phan-loai-doi-voi-chat-mau-xuat-nhap-khau-do-tong-cuc-hai-quan-ban-hanh |
| 32061990#7 | 11831/TB-TCHQ | 2014 | 32061990 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/7128-thong-bao-11831-tb-tchq-nam-2014-ve-ket-qua-phan-loai-doi-voi-che-pham-mau-vo-co-xuat-nhap-khau-do-tong-cuc-hai-quan-ban-hanh |
| 32062010#0 | 904/TB-TCHQ | 2016 | 32062010 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2179-thong-bao-904-tb-tchq-nam-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-che-pham-mau-vang-tu-hop-chat-crom-dung-lam-nguyen-lieu-trong-cong-nghiep-san-xuat-son-do-tong-cuc-hai-quan-ban-hanh |
| 32062010#1 | 6621/TB-TCHQ | 2015 | 32062010 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/3978-thong-bao-6621-tb-tchq-nam-2015-ve-ket-qua-phan-loai-hang-hoa-xuat-nhap-khau-la-dung-moi-de-san-xuat-hoa-chat-do-tong-cuc-hai-quan-ban-hanh |
| 32062010#2 | 5168/TB-TCHQ | 2015 | 32062010 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/4361-thong-bao-5168-tb-tchq-nam-2015-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-che-pham-mau-do-tong-cuc-hai-quan-ban-hanh |
| 32062010#3 | 4888/TB-TCHQ | 2015 | 32062010 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/4478-thong-bao-4888-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-che-pham-thuoc-mau-vo-co-do-tong-cuc-hai-quan-ban-hanh |
| 32062010#4 | 4503/TB-TCHQ | 2015 | 32062010 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/4655-thong-bao-4503-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-muoi-carbon-nguyen-lieu-san-xuat-son-do-tong-cuc-hai-quan-ban-hanh |
| 32064110#0 | 11747/TB-TCHQ | 2014 | 32064110 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/7178-thong-bao-11747-tb-tchq-nam-2014-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-chat-mau-huu-co-tong-hop-pigment-blue-n-3152-do-tong-cuc-hai-quan-ban-hanh |
| 32064210#0 | 8140/TB-TCHQ | 2013 | 32064210 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/8606-thong-bao-8140-tb-tchq-nam-2013-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-do-tong-cuc-hai-quan-ban-hanh |
| 32064990#0 | 3323/TB-TCHQ | 2016 | 32064990 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/1629-thong-bao-3323-tb-tchq-nam-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-chat-mau-huu-co-tong-hop-blue-3j-blue-organic-pigment-do-tong-cuc-hai-quan-ban-hanh |
| 32064990#1 | 827/TB-TCHQ | 2016 | 32064990 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2218-thong-bao-827-tb-tchq-nam-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-thuoc-mau-dung-trong-san-xuat-bao-pp-do-tong-cuc-hai-quan-ban-hanh |
| 32064990#2 | 554/TB-TCHQ | 2016 | 32064990 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2418-thong-bao-554-tb-tchq-nam-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-aluminium-powder-do-tong-cuc-hai-quan-ban-hanh |
| 32064990#3 | 4731/TB-TCHQ | 2015 | 32064990 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/4541-thong-bao-4731-tb-tchq-nam-2015-ve-ket-qua-phan-loai-hang-hoa-xuat-nhap-khau-la-thuoc-mau-dung-pha-muc-trong-in-lua-do-tong-cuc-hai-quan-ban-hanh |
| 32065010#1 | 2703/TB-TCHQ | 2015 | 32065010 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/5261-thong-bao-2703-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-bot-phat-quang-do-tong-cuc-hai-quan-ban-hanh |
| 32065010#2 | 11823/TB-TCHQ | 2014 | 32065010 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/7133-thong-bao-11823-tb-tchq-nam-2014-ve-ket-qua-phan-loai-doi-voi-bot-phat-quang-xuat-nhap-khau-do-tong-cuc-hai-quan-ban-hanh |
| 32081019#0 | 3701/TB-TCHQ | 2015 | 32081019 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/5015-thong-bao-3701-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-son-bong-phu-be-mat-chong-tia-tu-ngoai-goc-polymer-do-tong-cuc-hai-quan-ban-hanh |
| 32082090#9 | 2705/TB-TCHQ | 2016 | 32082090 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/1775-thong-bao-2705-tb-tchq-nam-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-son-chong-an-mon-do-tong-cuc-hai-quan-ban-hanh |
| 32082090#10 | 829/TB-TCHQ | 2016 | 32082090 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2216-thong-bao-829-tb-tchq-nam-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-son-cac-loai-do-tong-cuc-hai-quan-ban-hanh |
| 32082090#11 | 643/TB-TCHQ | 2016 | 32082090 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2358-thong-bao-643-tb-tchq-nam-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-polyme-acrylic-dang-nguyen-sinh-thanh-phan-chinh-la-acrylate-copolymer-do-tong-cuc-hai-quan-ban-hanh |
| 32089019#3 | 279/TB-TCHQ | 2016 | 32089019 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2595-thong-bao-279-tb-tchq-nam-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-vecni-cach-dien-fpu-a1-50-do-tong-cuc-hai-quan-ban-hanh |
| 32089019#4 | 11323/TB-TCHQ | 2015 | 32089019 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2862-thong-bao-11323-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-khau-nhap-khau-la-vecni-cach-dien-fpu-50v-do-tong-cuc-hai-quan-ban-hanh |
| 32089019#5 | 11322/TB-TCHQ | 2015 | 32089019 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2863-thong-bao-11322-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-khau-nhap-khau-la-vecni-cach-dien-fpu-a1-35-do-tong-cuc-hai-quan-ban-hanh |
| 32089090#18 | 720/TB-TCHQ | 2016 | 32089090 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2319-thong-bao-720-tb-tchq-nam-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-son-bong-tu-polymer-acrylic-do-tong-cuc-hai-quan-ban-hanh |
| 32089090#20 | 2710/TB-TCHQ | 2022 | 32089090 | agent-tbtchq-thep-hoachat; toàn văn chứa 65%; https://luatvietnam.vn/xuat-nhap-khau/thong-bao-2710-tb-tchq-2022-chat-xu-ly-loctite-bondace-224-2-15kg-294380-d6.html |
| 32089090#26 | 828/TB-TCHQ | 2016 | 32089090 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2217-thong-bao-828-tb-tchq-nam-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-dung-dich-polymer-do-tong-cuc-hai-quan-ban-hanh |
| 32089090#27 | 687/TB-TCHQ | 2016 | 32089090 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2308-thong-bao-687-tb-tchq-nam-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-polyurethane-resin-nhua-pu-do-tong-cuc-hai-quan-ban-hanh |
| 32089090#28 | 315/TB-TCHQ | 2016 | 32089090 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2567-thong-bao-so-315-tb-tchq-ngay-12-01-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-chat-mau-huu-co-dung-trong-san-xuat-son-tinh-trang-hieu-luc-khong-xac-dinh |
| 32089090#29 | 4942/TB-TCHQ | 2015 | 32089090 | agent-tbtchq-toan-van; không có toàn văn; https://thuvienxuatnhapkhau.com/phan-tich-phan-loai-son-dang-long-full-gloss-vinyl-lacquer.html |
| 32089090#54 | 3403/TB-TCHQ | 2018 | 32089090 | agent-tbtchq-thep-hoachat; toàn văn chứa 85%; https://luatvietnam.vn/xuat-nhap-khau/thong-bao-3403-tb-tchq-tong-cuc-hai-quan-298877-d6.html |
| 32129014#1 | 9862/TB-TCHQ | 2015 | 32129014 | agent-tbtchq-thep-hoachat; không có toàn văn; https://luatvietnam.vn/xuat-nhap-khau/thong-bao-9862-tb-tchq-tong-cuc-hai-quan-301540-d6.html |
| 32129019#8 | 9802/TB-TCHQ | 2015 | 32129019 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/3082-thong-bao-so-9802-tb-tchq-ngay-22-10-2015-ve-ket-qua-phan-loai-hang-hoa-xuat-nhap-khau-la-thuoc-mau-da-pha-che-dung-san-xuat-son-tinh-trang-hieu-luc-khong-xac-dinh |
| 32129019#9 | 5987/TB-TCHQ | 2015 | 32129019 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/4124-thong-bao-so-5987-tb-tchq-ngay-01-07-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-thuoc-mau-tu-kem-ferrit-tinh-trang-hieu-luc-khong-xac-dinh |
| 32129019#10 | 4943/TB-TCHQ | 2015 | 32129019 | agent-tbtchq-toan-van; không có toàn văn; https://thuvienxuatnhapkhau.com/phan-tich-phan-loai-thuoc-mau-dang-long-yellow-oxide-paste.html |
| 32129029#0 | 4933/TB-TCHQ | 2015 | 32129029 | agent-tbtchq-toan-van; không có toàn văn; https://thuvienxuatnhapkhau.com/thong-bao-4933-tb-tchq-ve-ket-qua-phan-loai-che-pham-thuoc-mau-8110422-eco-100-magenta-v-1-lit.html |
| 34059010#3 | 5102/TB-TCHQ | 2015 | 34059010 | agent-tbtchq-toan-van; không có toàn văn; https://thuvienxuatnhapkhau.com/phan-tich-phan-loai-bot-danh-bong-kim-loai-npl06.html |
| 37013000#1 | 5048/TB-TCHQ | 2015 | 37013000 | agent-tbtchq-toan-van; không có toàn văn; https://thuvienxuatnhapkhau.com/phan-tich-phan-loai-tam-ban-in-dung-trong-cong-nghiep-in-loai-ctp.html |
| 38123100#1 | 4938/TB-TCHQ | 2015 | 38123000 | agent-tbtchq-toan-van; không có toàn văn; https://thuvienxuatnhapkhau.com/thong-bao-ket-qua-phan-loai-doi-voi-hat-phu-gia-cesa-light-7103p-vn01.html |
| 38241000#0 | 394/TB-TCHQ | 2016 | 38241000 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2540-thong-bao-394-tb-tchq-nam-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-chat-chong-dinh-khuon-duc-do-tong-cuc-hai-quan-ban-hanh |
| 38241000#1 | 7889/TB-TCHQ | 2015 | 38241000 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/3612-thong-bao-7889-tb-tchq-nam-2015-ve-ket-qua-phan-loai-hang-hoa-xuat-nhap-khau-la-bentonite-dung-trong-lo-nung-luyen-kim-loai-do-tong-cuc-hai-quan-ban-hanh |
| 38241000#2 | 7887/TB-TCHQ | 2015 | 38241000 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/3613-thong-bao-7887-tb-tchq-nam-2015-ve-ket-qua-phan-loai-hang-hoa-xuat-nhap-khau-la-bentonite-dung-trong-lo-nung-luyen-kim-loai-do-tong-cuc-hai-quan-ban-hanh |
| 38241000#3 | 579/TB-TCHQ | 2014 | 38241000 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/8380-thong-bao-579-tb-tchq-nam-2014-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-do-tong-cuc-hai-quan-ban-hanh |
| 38244000#1 | 887/TB-TCHQ | 2016 | 38244000 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2184-thong-bao-887-tb-tchq-nam-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-polyete-dang-nguyen-sinh-dung-trong-cong-nghiep-xay-dung-do-tong-cuc-hai-quan-ban-hanh |
| 38244000#2 | 6856/TB-TCHQ | 2015 | 38244000 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/3955-thong-bao-6856-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-etylene-glycol-dang-khac-do-tong-cuc-hai-quan-ban-hanh |
| 38244000#3 | 4296/TB-TCHQ | 2015 | 38244000 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/4759-thong-bao-4296-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-bot-phu-gia-chong-tham-silane-siloxane-cho-vat-lieu-xay-dung-do-tong-cuc-hai-quan-ban-hanh |
| 38244000#4 | 4300/TB-TCHQ | 2015 | 38244000 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/4769-thong-bao-4300-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-bot-phu-gia-chong-tham-silane-siloxane-cho-vat-lieu-xay-dung-do-tong-cuc-hai-quan-ban-hanh |
| 38245000#1 | 14298/TB-TCHQ | 2014 | 38245000 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/6272-thong-bao-14298-tb-tchq-nam-2014-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-vua-chong-tham-xi-mang-polymer-do-tong-cuc-hai-quan-ban-hanh |
| 38249999#284 | 1601/TB-TCHQ | 2020 | 38249999 | agent-tbtchq-thep-hoachat; không có toàn văn; https://luatvietnam.vn/xuat-nhap-khau/thong-bao-1601-tb-tchq-2020-phan-loai-dung-dich-lam-cung-khuon-cat-294201-d6.html |
| 38249999#471 | 7299/TB-TCHQ | 2018 | 38249999 | agent-tbtchq-thep-hoachat; toàn văn chứa 76%; https://luatvietnam.vn/xuat-nhap-khau/thong-bao-7299-tb-tchq-tong-cuc-hai-quan-297780-d6.html |
| 38249999#472 | 1146/TB-TCHQ | 2018 | 38249999 | agent-tbtchq-thep-hoachat; toàn văn chứa 63%; https://luatvietnam.vn/xuat-nhap-khau/thong-bao-1146-tb-tchq-tong-cuc-hai-quan-299811-d6.html |
| 39073030#0 | 571/TB-TCHQ | 2016 | 39073030 | agent-tbtchq-thep-hoachat; không có toàn văn; https://luatvietnam.vn/xuat-nhap-khau/thong-bao-571-tb-tchq-tong-cuc-hai-quan-301076-d6.html |
| 39075010#0 | 4576/TB-TCHQ | 2015 | 39075010 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/4624-thong-bao-so-4576-tb-tchq-ngay-20-05-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-nguyen-lieu-san-xuat-son-tinh-trang-hieu-luc-khong-xac-dinh |
| 39199092#8 | 16238/TB-CHQ | 2025 | 39199092 | agent-tbtchq-toan-van; không có toàn văn; https://thuvienxuatnhapkhau.com/thong-bao-16238-tb-chq-nam-2025-ve-ket-qua-xac-dinh-truoc-ma-so-doi-voi-plastic-label.html |
| 39232990#1 | 7840/TB-TCHQ | 2013 | 39232990 | agent-tbtchq-dot5-hangtieudung; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/8676-thong-bao-7840-tb-tchq-nam-2013-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-do-tong-cuc-hai-quan-ban-hanh |
| 39269099#19 | 5812/TB-TCHQ | 2015 | 39269099 | agent-tbtchq-thep-hoachat; không có toàn văn; https://luatvietnam.vn/xuat-nhap-khau/thong-bao-5812-tb-tchq-tong-cuc-hai-quan-96113-d6.html |
| 39269099#21 | 3291/TB-TCHQ | 2016 | 39269099 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/1640-thong-bao-3291-tb-tchq-nam-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-mieng-nhua-dung-de-co-dinh-day-cap-do-tong-cuc-hai-quan-ban-hanh |
| 39269099#26 | 1049/TB-TCHQ | 2024 | 39269099 | agent-tbtchq-ch84b; toàn văn chứa 40%; https://caselaw.vn/van-ban-phap-luat/502741-thong-bao-so-1049-tb-tchq-ngay-14-03-2024-cua-tong-cuc-hai-quan-ket-qua-xac-dinh-truoc-ma-so-doi-voi-khuon-nhua-dung-de-han-cell-pin |
| 40169959#0 | 7167/TB-TCHQ | 2015 | 40169959 | agent-tbtchq-dot5-ch84b; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/3851-thong-bao-so-7167-tb-tchq-ngay-05-08-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-bo-thanh-su-hoan-chinh-dung-cho-hu-nghien-san-xuat-gach-ceramic-tinh-trang-hieu-luc-khong-xac-dinh |
| 42023200#1 | 3409/TB-TCHQ | 2024 | 42023200 | agent-tbtchq-thep-hoachat; toàn văn chứa 62%; https://thuvienxuatnhapkhau.com/thong-bao-3409-tb-tchq-nam-2024-ve-vo-gia-da-cho-dtdd-op-dien-thoai-2-mat.html |
| 42029190#1 | 4411/TB-TCHQ | 2015 | 42029190 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/4720-thong-bao-4411-tb-tchq-nam-2015-ve-ket-qua-xac-dinh-truoc-ma-so-la-vo-gia-da-cua-dien-thoai-di-dong-do-tong-cuc-hai-quan-ban-hanh |
| 42029190#2 | 4410/TB-TCHQ | 2015 | 42029190 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/4721-thong-bao-4410-tb-tchq-nam-2015-ve-ket-qua-xac-dinh-truoc-ma-so-cua-vo-gia-da-cua-dien-thoai-di-dong-do-tong-cuc-hai-quan-ban-hanh |
| 48114190#1 | 1252/TB-TCHQ | 2016 | 48114190 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2081-thong-bao-so-1252-tb-tchq-ngay-22-02-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-giay-tu-dinh-htmls-w-tinh-trang-hieu-luc-khong-xac-dinh |
| 48114190#2 | 51/TB-TCHQ | 2016 | 48114190 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2692-thong-bao-so-51-tb-tchq-ngay-05-01-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-giay-tu-dinh-al-w-3002-tinh-trang-hieu-luc-khong-xac-dinh |
| 48239099#3 | 4038/TB-TCHQ | 2015 | 48239099 | agent-tbtchq-dot5-hangtieudung; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/4879-thong-bao-4038-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-ong-long-cach-dien-do-tong-cuc-hai-quan-ban-hanh |
| 60064490#0 | 4940/TB-TCHQ | 2015 | 60064490 | agent-tbtchq-toan-van; không có toàn văn; https://thuvienxuatnhapkhau.com/thong-bao-ket-qua-phan-loai-doi-voi-vai-det-kim-soi-ngang-thanh-phan-59-xo-staple-visco-37-filament-polyester.html |
| 69149000#2 | 582/TB-TCHQ | 2014 | 69149000 | agent-tbtchq-dot5-kimkhi; không có toàn văn; https://vbpl.ts24.com.vn/support/solutions/articles/16000026748 |
| 69149000#3 | 583/TB-TCHQ | 2014 | 69149000 | agent-tbtchq-dot5-kimkhi; không có toàn văn; https://vbpl.ts24.com.vn/support/solutions/articles/16000026749 |
| 70060090#0 | 2961/TB-TCHQ | 2020 | 70060090 | agent-tbtchq-dot5-kimkhi; không có toàn văn; https://bikipxuatnhapkhau.vn/thong-bao-2961-tb-tchq-hscode-mat-kinh-bao-ve-4-nut-cua-cong-tac-cam-ung/ |
| 70060090#1 | 2963/TB-TCHQ | 2020 | 70060090 | agent-tbtchq-dot5-kimkhi; không có toàn văn; https://bikipxuatnhapkhau.vn/thong-bao-2963-tb-tchq-hscode-mat-kinh-bao-ve-2-nut-cua-cong-tac-cam-ung/ |
| 70060090#2 | 2958/TB-TCHQ | 2020 | 70060090 | agent-tbtchq-dot5-kimkhi; không có toàn văn; https://bikipxuatnhapkhau.vn/thong-bao-2958-tb-tchq-hscode-mat-kinh-bao-ve-cua-thiet-bi-do-chat-luong-khong-khi/ |
| 70071990#0 | 983/TB-TCHQ | 2016 | 70071990 | agent-tbtchq-dot5-kimkhi; không có toàn văn; https://bikipxuatnhapkhau.vn/thong-bao-983-tb-tchq-hs-code-mat-kinh-bep-ga/ |
| 72021900#0 | 4941/TB-TCHQ | 2015 | 72021900 | agent-tbtchq-toan-van; không có toàn văn; https://thuvienxuatnhapkhau.com/phan-tich-phan-loai-hop-kim-fero-mangan.html |
| 72082600#0 | 6629/TB-TCHQ | 2015 | 72082600 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/3988-thong-bao-6629-tb-tchq-nam-2015-ve-ket-qua-phan-loai-hang-hoa-xuat-nhap-khau-la-thep-can-nong-khong-hop-kim-do-tong-cuc-hai-quan-ban-hanh |
| 72083600#0 | 7439/TB-TCHQ | 2015 | 72083600 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/3719-thong-bao-7439-tb-tchq-nam-2015-ve-ket-qua-phan-loai-hang-hoa-xuat-nhap-khau-la-thep-tam-cuon-can-nong-phang-do-tong-cuc-hai-quan-ban-hanh |
| 72092890#0 | 1761/TB-TCHQ | 2018 | 72092890 | agent-tbtchq-thep-hoachat; toàn văn chứa 59%; https://bikipxuatnhapkhau.vn/hs-code-thep-tam-khong-hop-kim-can-nguoi-chua-dat-phu-ma-hoac-trang/ |
| 72112390#0 | 5095/TB-TCHQ | 2015 | 72112390 | agent-tbtchq-toan-van; không có toàn văn; https://thuvienxuatnhapkhau.com/phan-tich-phan-loai-cold-rolled-steel-strip-in-coil-thep-khong-hop-kim-can-phang-dang-cuon.html |
| 72122020#0 | 1504/TB-TCHQ | 2022 | 72122020 | agent-tbtchq-toan-van; toàn văn chứa 75%; https://thuvienxuatnhapkhau.com/thong-bao-1504-tb-tchq-nam-2022-ve-ket-qua-xac-dinh-truoc-ma-so-doi-voi-thep-khong-hop-kim-can-nguoi-dang-can-phang-do-tong-cuc-hai-quan-ban-hanh.html |
| 72149119#11 | 101/TB-TCHQ | 2020 | 72149119 | agent-tbtchq-thep-hoachat; toàn văn chứa 75%; https://luatvietnam.vn/xuat-nhap-khau/thong-bao-101-tb-tchq-2020-ket-qua-phan-loai-thep-tam-khong-hop-kim-can-phang-295923-d6.html |
| 72199000#3 | 3424/TB-TCHQ | 2018 | 72199000 | agent-tbtchq-thep-hoachat; toàn văn chứa 47%; https://caselaw.vn/van-ban-phap-luat/325429-thong-bao-so-3424-tb-tchq-ngay-18-06-2018-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-khau-nhap-khau-la-thep-hop-kim-do-tong-cuc-hai-quan-ban-hanh-tinh-trang-hieu-luc-khong-xac-dinh |
| 72201210#0 | 11538/TB-TCHQ | 2014 | 72201210 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/7290-thong-bao-so-11538-tb-tchq-ngay-23-09-2014-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-thep-khong-gi-can-nong-dang-cuon-tinh-trang-hieu-luc-khong-xac-dinh |
| 72253090#0 | 12551/TB-TCHQ | 2014 | 72253090 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/6823-thong-bao-12551-tb-tchq-nam-2014-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-thep-hop-kim-can-nong-do-tong-cuc-hai-quan-ban-hanh |
| 72253090#1 | 12550/TB-TCHQ | 2014 | 72253090 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/6824-thong-bao-12550-tb-tchq-nam-2014-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-thep-khong-hop-kim-do-tong-cuc-hai-quan-ban-hanh |
| 72253090#2 | 4334/TB-TCHQ | 2014 | 72253090 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/7969-thong-bao-4334-tb-tchq-nam-2014-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-thep-hop-kim-ham-luong-bo-0-0008-do-tong-cuc-hai-quan-ban-hanh |
| 72253090#3 | 4333/TB-TCHQ | 2014 | 72253090 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/7970-thong-bao-4333-tb-tchq-nam-2014-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-thep-hop-kim-ham-luong-bo-0-0008-do-tong-cuc-hai-quan-ban-hanh |
| 72254090#1 | 837/TB-TCHQ | 2016 | 72254090 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2240-thong-bao-837-tb-tchq-nam-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-thep-tam-hop-kim-cr-can-phang-rong-do-tong-cuc-hai-quan-ban-hanh |
| 72254090#2 | 118/TB-TCHQ | 2016 | 72254090 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/31498-cong-van-118-tb-tchq-nam-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-thep-tam-can-phang-hop-kim-titan-can-nong-chua-trang-phu-ma-do-tong-cuc-hai-quan-ban-hanh |
| 72254090#3 | 427/TB-TCHQ | 2014 | 72254090 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/8412-thong-bao-427-tb-tchq-nam-2014-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-do-tong-cuc-hai-quan-ban-hanh |
| 72254090#4 | 426/TB-TCHQ | 2014 | 72254090 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/8413-thong-bao-426-tb-tchq-nam-2014-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-do-tong-cuc-hai-quan-ban-hanh |
| 72254090#5 | 415/TB-TCHQ | 2014 | 72254090 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/8424-thong-bao-415-tb-tchq-nam-2014-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-do-tong-cuc-hai-quan-ban-hanh |
| 72259290#0 | 4337/TB-TCHQ | 2014 | 72259290 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/7968-thong-bao-so-4337-tb-tchq-ngay-21-04-2014-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-thep-tam-hop-kim-co-chua-nguyen-to-bo-can-phang-ma-kem-nhung-nong-dang-cuon-astm-a653m-ss345-tinh-trang-hieu-luc-khong-xac-dinh |
| 72269190#6 | 2789/TB-TCHQ | 2018 | 72269190 | agent-tbtchq-thep-hoachat; toàn văn chứa 72%; https://luatvietnam.vn/xuat-nhap-khau/thong-bao-2789-tb-tchq-tong-cuc-hai-quan-298729-d6.html |
| 72269210#1 | 13533/TB-TCHQ | 2014 | 72269210 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/6463-thong-bao-13533-tb-tchq-nam-2014-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-thep-hop-kim-can-nguoi-dang-dai-chua-phu-ma-do-tong-cuc-hai-quan-ban-hanh |
| 72269210#2 | 4334/TB-TCHQ | 2015 | 72269210 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/4734-thong-bao-4334-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-vong-thep-anode-anode-strip-do-tong-cuc-hai-quan-ban-hanh |
| 72269290#1 | 690/TB-TCHQ | 2016 | 72269290 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2345-thong-bao-690-tb-tchq-nam-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-thep-tam-can-nguoi-khong-hop-kim-dang-cuon-do-tong-cuc-hai-quan-ban-hanh |
| 72279010#0 | 385/TB-TCHQ | 2016 | 72279000 | agent-tbtchq-toan-van; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2521-thong-bao-so-385-tb-tchq-ngay-14-01-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-thep-thanh-hop-kim-dang-cuon-tinh-trang-hieu-luc-khong-xac-dinh |
| 72281010#0 | 12017/TB-TCHQ | 2014 | 72281010 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/7060-thong-bao-12017-tb-tchq-nam-2014-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-thep-gio-gia-cong-ket-thuc-nguoi-dang-thanh-mat-cat-ngang-hinh-tron-dac-mm-duong-kinh-steel-round-bar-s600-7-2mm-207pcs-iso-286-2-do-tong-cuc-hai-quan-ban-hanh |
| 72283010#4 | 1256/TB-TCHQ | 2016 | 72283010 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2077-thong-bao-1256-tb-tchq-nam-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-thep-hop-kim-ti-do-tong-cuc-hai-quan-ban-hanh |
| 72285090#3 | 387/TB-TCHQ | 2016 | 72285090 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2542-thong-bao-387-tb-tchq-nam-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-thep-lam-khuon-dao-thia-dia-do-tong-cuc-hai-quan-ban-hanh |
| 72287010#9 | 446/TB-TCHQ | 2014 | 72287010 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/8403-thong-bao-so-446-tb-tchq-ngay-15-01-2014-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-tinh-trang-hieu-luc-khong-xac-dinh |
| 72288090#0 | 5795/TB-TCHQ | 2015 | 72288090 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/4205-thong-bao-5795-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-ong-thep-duc-bang-thep-hop-kim-do-tong-cuc-hai-quan-ban-hanh |
| 72299091#6 | 1233/TB-TCHQ | 2019 | 72299091 | agent-tbtchq-thep-hoachat; toàn văn chứa 73%; https://luatvietnam.vn/xuat-nhap-khau/thong-bao-1233-tb-tchq-2019-phan-loai-day-thep-hop-kim-297059-d6.html |
| 82089000#1 | 436/TB-TCHQ | 2014 | 82089000 | agent-tbtchq-thep-hoachat; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/8399-thong-bao-so-436-tb-tchq-ngay-15-01-2014-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-tinh-trang-hieu-luc-khong-xac-dinh |
| 82089000#2 | 438/TB-TCHQ | 2014 | 82089000 | agent-tbtchq-dot5-kimkhi; không có toàn văn; https://vbpl.ts24.com.vn/support/solutions/articles/16000026728 |
| 84123100#1 | 757/TB-TCHQ | 2016 | 84123100 | agent-tbtchq-ch84a; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2282-thong-bao-757-tb-tchq-nam-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-bo-dieu-chinh-tiet-luu-do-tong-cuc-hai-quan-ban-hanh |
| 84287000#0 | 1538/TB-TCHQ | 2023 | 84287000 | agent-tbtchq-ch84b; toàn văn chứa 38%; https://caselaw.vn/van-ban-phap-luat/502954-thong-bao-so-1538-tb-tchq-ngay-05-04-2023-cua-tong-cuc-hai-quan-ve-ket-qua-xac-dinh-truoc-ma-so-doi-voi-robot-tu-hanh-agv |
| 84313990#1 | 5950/TB-TCHQ | 2024 | 84313990 | agent-tbtchq-ch84a; toàn văn chứa 86%; https://camnangxnk-logistics.net/wp-content/uploads/2024/12/5950.pdf |
| 84453010#0 | 8398/TB-TCHQ | 2015 | 84453010 | agent-tbtchq-dot5-ch84b; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/3370-thong-bao-so-8398-tb-tchq-ngay-16-09-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-may-xe-soi-model-tinh-trang-hieu-luc-khong-xac-dinh |
| 84514000#0 | 8660/TB-TCHQ | 2015 | 84514000 | agent-tbtchq-ch84b; không có toàn văn; https://vbpl.ts24.com.vn/support/solutions/articles/16000067953 |
| 84514000#1 | 56/TB-TCHQ | 2017 | 84514000 | agent-tbtchq-ch84b; không có toàn văn; https://vbpl.ts24.com.vn/support/solutions/articles/16000067953 |
| 84642010#0 | 8397/TB-TCHQ | 2015 | 84642010 | agent-tbtchq-dot5-ch84b; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/3371-thong-bao-so-8397-tb-tchq-ngay-16-09-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-may-mai-danh-bong-san-be-tong-cong-nghiep-va-phu-kien-tinh-trang-hieu-luc-khong-xac-dinh |
| 84649020#0 | 14968/TB-TCHQ | 2014 | 84649020 | agent-tbtchq-dot5-ch84b; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/6068-thong-bao-14968-tb-tchq-nam-2014-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-dao-cat-soi-quang-chinh-xac-swift-ci-01-do-tong-cuc-hai-quan-ban-hanh |
| 84715090#2 | 6468/TB-TCHQ | 2015 | 84715090 | agent-tbtchq-ch84b; không có toàn văn; https://vbpl.ts24.com.vn/support/solutions/articles/16000015811 |
| 84733090#4 | 437/TB-TCHQ | 2025 | 84733090 | agent-tbtchq-ch84b; toàn văn chứa 57%; https://caselaw.vn/van-ban-phap-luat/504134-thong-bao-so-437-tb-tchq-ngay-23-01-2025-cua-tong-cuc-hai-quan-ve-ket-qua-xac-dinh-truoc-ma-so-doi-voi-hpe-synergy-12000-frame-khung-may-chu-phien-hpe-synergy-12000 |
| 84796000#1 | 8399/TB-TCHQ | 2015 | 84796000 | agent-tbtchq-ch84b; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/3369-thong-bao-so-8399-tb-tchq-ngay-16-09-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-may-lam-mat-khong-khi-bang-hoi-nuoc-tinh-trang-hieu-luc-khong-xac-dinh |
| 84812090#1 | 852/TB-TCHQ | 2016 | 84812090 | agent-tbtchq-ch84a; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2225-thong-bao-852-tb-tchq-nam-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-van-truyen-dong-bang-khi-nen-do-tong-cuc-hai-quan-ban-hanh |
| 84812090#2 | 851/TB-TCHQ | 2016 | 84812090 | agent-tbtchq-ch84a; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2226-thong-bao-851-tb-tchq-nam-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-van-truyen-dong-bang-khi-nen-do-tong-cuc-hai-quan-ban-hanh |
| 84818099#2 | 92/TB-TCHQ | 2016 | 84818099 | agent-tbtchq-ch84a; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2681-thong-bao-92-tb-tchq-nam-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-thiet-bi-do-ap-suat-khi-sf6-siemens-do-tong-cuc-hai-quan-ban-hanh |
| 84818099#3 | 3582/TB-TCHQ | 2022 | 84818099 | agent-tbtchq-ch84a; toàn văn chứa 69%; https://bikipxuatnhapkhau.vn/may-say-kho-tay-dung-gio-tich-hop-voi-nuoc-dyson-wd04-hs-code-8481-80-99-3582-tb-tchq-ngay-30-8-2022/ |
| 84819090#0 | 5052/TB-TCHQ | 2022 | 84819090 | agent-tbtchq-ch84a; toàn văn chứa 54%; https://thutucxuatnhapkhau.vn/thong-bao-5052-tb-tchq-nam-2022/ |
| 84819090#1 | 4006/TB-TCHQ | 2022 | 84819090 | agent-tbtchq-ch84a; toàn văn chứa 72%; https://camnangxnk-logistics.net/4006-tb-tchq-ma-hs-than-van-la-bo-phan-cua-van-dieu-khien-khi-nap-de-dong-mo-toi-uu-khi-nap-cua-dong-co-o-to-hs-84819090/ |
| 84832090#0 | 24028/TB-CHQ | 2025 | 84832090 | agent-tbtchq-ch84a; không có toàn văn; https://camnangxnk-logistics.net/wp-content/uploads/2025/09/27.VBDI_24028.pdf |
| 84835000#1 | 4284/TB-TCHQ | 2023 | 84835000 | agent-tbtchq-ch84b; toàn văn chứa 78%; https://caselaw.vn/van-ban-phap-luat/504098-thong-bao-so-4284-tb-tchq-ngay-17-08-2023-cua-tong-cuc-hai-quan-ve-ket-qua-xac-dinh-truoc-ma-so-doi-voi-banh-dong-quat-tai-bot-may-nghien-than |
| 85013170#0 | 3609/TB-TCHQ | 2024 | 85013170 | agent-tbtchq-ch84a; toàn văn chứa 55%; https://camnangxnk-logistics.net/wp-content/uploads/2024/07/3609.pdf |
| 85042199#0 | 788/TB-TCHQ | 2016 | 85042199 | agent-tbtchq-ch85a; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2260-thong-bao-788-tb-tchq-nam-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-bien-dong-su-dung-dien-moi-long-do-tong-cuc-hai-quan-ban-hanh |
| 85044019#4 | 2307/TB-TCHQ | 2024 | 85044019 | agent-tbtchq-ch85a; toàn văn chứa 62%; https://thuvienxuatnhapkhau.com/thong-bao-2307-tb-tchq-nam-2024-ket-qua-xac-dinh-truoc-ma-so-sac-pin-cho-dien-thoai-di-dong-va-may-tinh-bang.html |
| 85044030#1 | 3633/TB-TCHQ | 2022 | 85044030 | agent-tbtchq-ch85a; toàn văn chứa 43%; https://hethongphapluat.com/thong-bao-3633-tb-tchq-nam-2022-ve-ket-qua-xac-dinh-truoc-ma-so-doi-voi-smps-adaptor-kda-150wk-do-tong-cuc-hai-quan-ban-hanh.html |
| 85044090#4 | 3333/TB-TCHQ | 2022 | 85044090 | agent-tbtchq-ch85a; toàn văn chứa 54%; https://hethongphapluat.com/thong-bao-3333-tb-tchq-nam-2022-ve-ket-qua-xac-dinh-truoc-ma-so-doi-voi-bo-nguon-cap-dien-lien-tuc-ups-ma-cene-mobile-power-do-tong-cuc-hai-quan-ban-hanh.html |
| 85051900#0 | 307/TB-TCHQ | 2016 | 85051900 | agent-tbtchq-ch85a; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2575-thong-bao-307-tb-tchq-nam-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-nam-cham-dang-tam-tu-cao-su-lien-ket-voi-tu-tinh-dat-hiem-do-tong-cuc-hai-quan-ban-hanh |
| 85072094#0 | 918/TB-TCHQ | 2021 | 85072094 | agent-tbtchq-ch85a; không có toàn văn; https://bikipxuatnhapkhau.vn/thong-bao-918-tb-tchq-bo-pin-kho-dung-cho-xe-dap-dien/ |
| 85162900#0 | 5342/TB-TCHQ | 2022 | 85162900 | agent-tbtchq-ch85a; toàn văn chứa 52%; https://caselaw.vn/van-ban-phap-luat/504491-thong-bao-so-5342-tb-tchq-ngay-09-12-2022-cua-tong-cuc-hai-quan-ve-ket-qua-xac-dinh-truoc-ma-so-doi-voi-may-suoi-co-thong-gio-va-say-kho |
| 85162900#1 | 5341/TB-TCHQ | 2022 | 85162900 | agent-tbtchq-ch85a; toàn văn chứa 60%; https://caselaw.vn/van-ban-phap-luat/504489-thong-bao-so-5341-tb-tchq-ngay-09-12-2022-cua-tong-cuc-hai-quan-ve-ket-qua-xac-dinh-truoc-ma-so-doi-voi-may-suoi-co-thong-gio |
| 85176253#0 | 11771/TB-TCHQ | 2014 | 85176253 | agent-tbtchq-ch85a; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/7185-thong-bao-11771-tb-tchq-nam-2014-ket-qua-xac-dinh-truoc-ma-so-thiet-bi-viba-pdh-do-tong-cuc-hai-quan-ban-hanh |
| 85176259#12 | 1915/TB-TCHQ | 2022 | 85176259 | agent-tbtchq-ch85a; toàn văn chứa 80%; https://bikipxuatnhapkhau.vn/thong-bao-1915-tb-tchq-ngay-27-5-2022-module-bluetooth-hs-code-8517-62-59/ |
| 85176259#13 | 6444/TB-TCHQ | 2024 | 85176259 | agent-tbtchq-ch85a; toàn văn chứa 55%; https://caselaw.vn/van-ban-phap-luat/504670-thong-bao-so-6444-tb-tchq-ngay-23-12-2024-cua-tong-cuc-hai-quan-ve-ket-qua-xac-dinh-truoc-ma-so-doi-voi-thiet-bi-deo-tay-thong-minh-huawei-watch-ultimate |
| 85182990#0 | 7239/TB-TCHQ | 2015 | 85182990 | agent-tbtchq-ch85a; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/3816-thong-bao-7239-tb-tchq-nam-2015-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-loa-chong-no-do-tong-cuc-hai-quan-ban-hanh |
| 85182990#1 | 2491/TB-TCHQ | 2022 | 85182990 | agent-tbtchq-ch85a; toàn văn chứa 39%; https://bikipxuatnhapkhau.vn/hs-code-loa-dien-thoai-di-dong-8518-29-90-2491-tb-tchq-ngay-24-6-2022/ |
| 85353020#0 | 15493/TB-TCHQ | 2014 | 85353020 | agent-tbtchq-dot5-ch85-90; không có toàn văn; https://vbpl.ts24.com.vn/support/solutions/articles/16000013660 |
| 85364990#0 | 7037/TB-TCHQ | 2015 | 85364990 | agent-tbtchq-ch85b; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/3888-thong-bao-7037-tb-tchq-nam-2015-ve-ket-qua-phan-loai-hang-hoa-xuat-nhap-khau-la-thiet-bi-dien-ro-le-do-tong-cuc-hai-quan-ban-hanh |
| 85364990#1 | 7037/TB-TCHQ | 2015 | 85364990 | agent-tbtchq-ch85b; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/3888-thong-bao-7037-tb-tchq-nam-2015-ve-ket-qua-phan-loai-hang-hoa-xuat-nhap-khau-la-thiet-bi-dien-ro-le-do-tong-cuc-hai-quan-ban-hanh |
| 85366992#2 | 4709/TB-TCHQ | 2021 | 85366992 | agent-tbtchq-toan-van; toàn văn chứa 53%; https://thuvienxuatnhapkhau.com/thong-bao-4709-tb-tchq-nam-2021-ket-qua-xac-dinh-truoc-ma-so-dau-noi-tron-dang-phich-cam.html |
| 85371012#1 | 489/TB-TCHQ | 2016 | 85371012 | agent-tbtchq-ch85b; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2459-thong-bao-489-tb-tchq-nam-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-cong-tac-dien-tu-doi-co-den-led-do-tong-cuc-hai-quan-ban-hanh |
| 85389019#1 | 1251/TB-TCHQ | 2016 | 85389019 | agent-tbtchq-ch85b; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2082-thong-bao-so-1251-tb-tchq-ngay-22-02-2016-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-dau-noi-voi-ban-mach-trong-sac-pin-dien-thoai-di-dong-tinh-trang-hieu-luc-khong-xac-dinh |
| 85389019#2 | 1249/TB-TCHQ | 2016 | 85389019 | agent-tbtchq-ch85b; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/2084-thong-bao-1249-tb-tchq-nam-2016-ve-ket-qua-phan-loai-doi-voi-hang-hoa-xuat-nhap-khau-la-dau-noi-cua-chan-sac-dien-thoai-di-dong-bang-dong-do-tong-cuc-hai-quan-ban-hanh |
| 85389019#3 | 193/TB-TCHQ | 2015 | 85389019 | agent-tbtchq-ch85b; không có toàn văn; https://caselaw.vn/van-ban-phap-luat/5904-thong-bao-193-tb-tchq-nam-2015-ve-ket-qua-xac-dinh-truoc-ma-so-cua-kim-dong-dau-cam-tai-nghe-do-tong-cuc-hai-quan-ban-hanh |
| 87089962#0 | 8017/TB-TCHQ | 2013 | 87089962 | agent-tbtchq-dot5-kimkhi; không có toàn văn; https://vbpl.ts24.com.vn/support/solutions/articles/16000025377 |
| 90029090#1 | 712/TB-TCHQ | 2022 | 90029090 | agent-tbtchq-thep-hoachat; không có toàn văn; https://bikipxuatnhapkhau.vn/thong-bao-712-tb-tchq-ngay-13-05-2022-thau-kinh-camera-dien-thoai-di-dong/ |

## DINH_CHINH: 2

Văn bản đính chính thông báo khác; mô tả do máy ghép từ tiêu đề nhóm, không có hàng

| Vị trí | Số | Năm | Mã | Bằng chứng / nguồn |
|---|---|---|---|---|
| 32082090#13 | 2174/TB-TCHQ | 2020 | 32082090 | đính chính 1811/TB-TCHQ năm 2020 |
| 38249999#318 | 1377/TB-TCHQ | 2018 | 38249999 | đính chính 1182/TB-TCHQ năm 2018 |

## MA_BI_DINH_CHINH: 1

Mã đã bị chính thông báo đính chính thay; nút giữ ở mã đính chính

| Vị trí | Số | Năm | Mã | Bằng chứng / nguồn |
|---|---|---|---|---|
| 32082090#12 | 1811/TB-TCHQ | 2020 | 32082090 | 2174/TB-TCHQ đính chính thành 32089090 |

## KHONG_MO_TA: 59

Không có mô tả hàng (chữ giữ chỗ, "theo phụ lục", tiêu đề trang web)

| Vị trí | Số | Năm | Mã | Bằng chứng / nguồn |
|---|---|---|---|---|
| 17049020#0 | 2415/TB-TCHQ | 2022 | 17049020 | Thông báo 2415/TB-TCHQ 2022 kết quả xác định trước mã số đối với Hershey kisses |
| 18069090#0 | 3649/TB-TCHQ | 2023 | 18069090 | Thông báo 3649/TB-TCHQ 2023 kết quả xác định trước mã số KINOHIMITSU SKNNY COCOA |
| 20089790#0 | 1713/TB-TCHQ | 2022 | 20089790 | Hàng hóa thuộc nhóm 2008 - xem TB-TCHQ 1713/TB-TCHQ để biết chi tiết kỹ thuật |
| 21039011#0 | 3790/TB-TCHQ | 2019 | 21039011 | 5, 8 của tờ khai (chi tiết theo phụ lục đính kèm) - (Chi tiết theo phụ lục đính |
| 21039011#1 | 3790/TB-TCHQ | 2019 | 21039011 | [SKIP: theo phụ lục đính kèm - không có data mô tả] |
| 21039013#11 | 3788/TB-TCHQ | 2019 | 21039013 | (Chi tiết theo phụ lục đính kèm) - (Chi tiết theo phụ lục đính kèm) |
| 21039013#12 | 3788/TB-TCHQ | 2019 | 21039013 | , 3, 4, 6, 7, 9, 12 của tờ khai (chi tiết theo phụ lục đính kèm) -, 3, 4, 6, 7, |
| 21039013#13 | 3788/TB-TCHQ | 2019 | 21039013 | [SKIP: theo phụ lục đính kèm - không có data mô tả] |
| 25174900#0 | 7241/TB-TCHQ | 2017 | 25174900 | Hàng hóa thuộc nhóm 2517 - xem TB-TCHQ 7241/TB-TCHQ để biết chi tiết kỹ thuật |
| 28352990#0 | 1071/TB-TCHQ | 2018 | 28352990 | Hàng hóa thuộc nhóm 2835 - xem TB-TCHQ 1071/TB-TCHQ để biết chi tiết kỹ thuật |
| 29071900#0 | 3131/TB-TCHQ | 2019 | 29071900 | Hàng hóa thuộc nhóm 2907 - xem TB-TCHQ 3131/TB-TCHQ để biết chi tiết kỹ thuật |
| 29072300#0 | 2046/TB-TCHQ | 2020 | 29072300 | Hàng hóa thuộc nhóm 2907 - xem TB-TCHQ 2046/TB-TCHQ để biết chi tiết kỹ thuật |
| 29096000#0 | 677/TB-TCHQ | 2016 | 29096000 | Hàng hóa thuộc nhóm 2909 - xem TB-TCHQ 677/TB-TCHQ để biết chi tiết kỹ thuật |
| 29173910#0 | 426/TB-TCHQ | 2016 | 29173910 | Hàng hóa thuộc nhóm 2917 - xem TB-TCHQ 426/TB-TCHQ để biết chi tiết kỹ thuật |
| 29215900#0 | 3244/TB-TCHQ | 2019 | 29215900 | Hàng hóa thuộc nhóm 2921 - xem TB-TCHQ 3244/TB-TCHQ để biết chi tiết kỹ thuật |
| 29242930#0 | 2888/TB-TCHQ | 2018 | 29242930 | Hàng hóa thuộc nhóm 2924 - xem TB-TCHQ 2888/TB-TCHQ để biết chi tiết kỹ thuật |
| 29269000#0 | 746/TB-TCHQ | 2016 | 29269000 | Hàng hóa thuộc nhóm 2926 - xem TB-TCHQ 746/TB-TCHQ để biết chi tiết kỹ thuật |
| 29359000#2 | 3220/TB-TCHQ | 2018 | 29359000 | Hàng hóa thuộc nhóm 2935 - xem TB-TCHQ 3220/TB-TCHQ để biết chi tiết kỹ thuật |
| 29389000#0 | 6276/TB-TCHQ | 2020 | 29389000 | Hàng hóa thuộc nhóm 2938 - xem TB-TCHQ 6276/TB-TCHQ để biết chi tiết kỹ thuật |
| 30049099#19 | 732/TB-TCHQ | 2023 | 30049099 | Thông báo 732/TB-TCHQ 2023 kết quả xác định trước mã số Thuốc Phosphalugel / HST |
| 33074910#0 | 2276/TB-TCHQ | 2024 | 33074910 | Thông báo 2276/TB-TCHQ năm 2024 về kết quả xác định trước mã số đối với Miếng dá |
| 33079050#6 | 5751/TB-TCHQ | 2023 | 33079050 | Thông báo 5751/TB-TCHQ 2023 kết quả xác định trước mã số VISMED® / HSTC |
| 34011140#2 | 716/TB-TCHQ | 2023 | 34011140 | Thông báo 716/TB-TCHQ 2023 kết quả xác định trước mã số DETTOL ORIGINAL ANTIBACT |
| 34011140#3 | 717/TB-TCHQ | 2023 | 34011140 | Thông báo 717/TB-TCHQ 2023 kết quả xác định trước mã số đối với DETTOL REPLENISH |
| 34024290#1 | 192/TB-TCHQ | 2024 | 34024290 | Thông báo 192/TB-TCHQ năm 2024 kết quả xác định trước mã số đối với FATTY ALCOHO |
| 34049090#0 | 4514/TB-TCHQ | 2023 | 34049090 | Thông báo 4514/TB-TCHQ 2023 kết quả xác định trước mã số / HSTC |
| 35040000#5 | 2518/TB-TCHQ | 2024 | 35040000 | Thông báo 2518/TB-TCHQ năm 2024 về kết quả xác định trước mã số đối với PEPTIPLU |
| 35061000#1 | 5147/TB-TCHQ | 2023 | 35061000 | Thông báo 5147/TB-TCHQ 2023 kết quả xác định trước mã số / HSTC |
| 35061000#6 | 3819/TB-TCHQ | 2022 | 35061000 | Thông báo 3819/TB-TCHQ 2022 kết quả xác định trước mã số keo hai mặt DS512H / HS |
| 38249099#16 | 5985/TB-TCHQ | 2018 | 38249099 | (Theo Phụ lục đính kèm) - (Theo Phụ lục đính kèm) |
| 38249970#25 | 2614/TB-TCHQ | 2023 | 38249970 | Thông báo 2614/TB-TCHQ 2023 kết quả xác định trước mã số đối với Sub4salt F3000 |
| 38249999#105 | 1782/TB-TCHQ | 2020 | 38249999 | Hàng hóa thuộc nhóm 3824 - xem TB-TCHQ 1782/TB-TCHQ để biết chi tiết kỹ thuật |
| 38249999#314 | 4211/TB-TCHQ | 2019 | 38249999 | (Theo phụ lục đính kèm) - (Theo phụ lục đính kèm) |
| 38249999#319 | 2345/TB-TCHQ | 2018 | 38249999 | Thông báo 2345/TB-TCHQ 2018 kết quả xác định trước mã số đối với Bột Cobalt Lith |
| 38249999#343 | 1218/TB-TCHQ | 2019 | 38249999 | [SKIP: theo phụ lục đính kèm - không có data mô tả] |
| 39032090#0 | 1651/TB-TCHQ | 2016 | 39032090 | Hàng hóa theo Thông báo 1651/TB-TCHQ — chưa tách được mô tả chi tiết từ văn bản |
| 41152000#0 | 6359/TB-TCHQ | 2018 | 41152000 | Hàng hóa thuộc nhóm 4115 - xem TB-TCHQ 6359/TB-TCHQ để biết chi tiết kỹ thuật |
| 44187500#1 | 7164/TB-TCHQ | 2018 | 44187500 | Tại bảng kê đính kèm - Tại bảng đính kèm |
| 48114990#0 | 3630/TB-TCHQ | 2019 | 48114990 | [SKIP: theo phụ lục đính kèm - không có data mô tả] |
| 48119099#7 | 3865/TB-TCHQ | 2019 | 48119099 | (theo Phụ lục đính kèm) - (theo Phụ lục đính kèm) |
| 48239099#8 | 3629/TB-TCHQ | 2019 | 48239099 | [SKIP: theo phụ lục đính kèm - không có data mô tả] |
| 56039200#5 | 6742/TB-TCHQ | 2018 | 56039200 | (Theo phụ lục đính kèm). - (Theo phụ lục đính kèm). |
| 59070060#0 | 6304/TB-TCHQ | 2023 | 59070060 | Thông báo 6304/TB-TCHQ 2023 kết quả xác định trước mã số / HSTC |
| 60053790#7 | 3268/TB-TCHQ | 2018 | 60053790 | [SKIP: theo phụ lục đính kèm - không có data mô tả] |
| 73202090#0 | 7274/TB-TCHQ | 2017 | 73202090 | Hàng hóa thuộc nhóm 7320 - xem TB-TCHQ 7274/TB-TCHQ để biết chi tiết kỹ thuật |
| 76169990#1 | 10967/TB-CHQ | 2025 | 76169990 | Hàng hóa thuộc nhóm 7616 - xem TB-TCHQ 10967/TB-CHQ để biết chi tiết kỹ thuật |
| 83113091#0 | 1825/TB-TCHQ | 2022 | 83113091 | Thông báo 1825/TB-TCHQ 2022 kết quả xác định trước mã số đối với dây hàn bằng th |
| 84145910#0 | 150/TB-TCHQ | 2024 | 84145910 | Thông báo 150/TB-TCHQ 2024 kết quả xác định trước mã số ASSY-EU FAN MODULE / HST |
| 85198199#0 | 2625/TB-CHQ | 2025 | 85198199 | Hàng hóa thuộc nhóm 8519 - xem TB-TCHQ 2625/TB-CHQ để biết chi tiết kỹ thuật |
| 85319090#0 | 7389/TB-TCHQ | 2018 | 85319090 | Hàng hóa thuộc nhóm 8531 - xem TB-TCHQ 7389/TB-TCHQ để biết chi tiết kỹ thuật |
| 85437090#6 | 1777/TB-TCHQ | 2018 | 85437090 | Theo phụ lục đính kèm. Theo phụ lục đính kèm. |
| 85437090#8 | 1777/TB-TCHQ | 2018 | 85437090 | [SKIP: theo phụ lục đính kèm - không có data mô tả] |
| 85437090#11 | 1777/TB-TCHQ | 2018 | 85437090 | Theo phụ lục đính kèm. - Theo phụ lục đính kèm. |
| 90191010#0 | 1776/TB-TCHQ | 2018 | 90191010 | Hàng hóa thuộc nhóm 9019 - xem TB-TCHQ 1776/TB-TCHQ để biết chi tiết kỹ thuật |
| 90191010#1 | 1776/TB-TCHQ | 2018 | 90191010 | [SKIP: theo phụ lục đính kèm - không có data mô tả] |
| 90191010#4 | 1776/TB-TCHQ | 2018 | 90191010 | Theo phụ lục đính kèm. - Theo phụ lục đính kèm. |
| 90191090#0 | 4419/TB-TCHQ | 2022 | 90191090 | Thông báo 4419/TB-TCHQ 2022 kết quả xác định trước mã số thanh lăn mát xa không |
| 90191090#1 | 4420/TB-TCHQ | 2022 | 90191090 | Thông báo 4420/TB-TCHQ 2022 kết quả xác định trước mã số ống lăn mát xa không dù |
| 02101990#0 | 988/TB-TCHQ | 2019 | 02101990 | Hàng hóa thuộc nhóm 0210 - xem TB-TCHQ 988/TB-TCHQ để biết chi tiết kỹ thuật |

## LECH_TOAN_VAN: 15

Mô tả không có trong toàn văn thông báo (dưới 60% cụm chữ): người cào viết lại hoặc thêm chi tiết

| Vị trí | Số | Năm | Mã | Bằng chứng / nguồn |
|---|---|---|---|---|
| 17049099#4 | 181/TB-TCHQ | 2021 | 17049099 | 28%: "Kẹo hình bút chì thương hiệu Kanro - Colored Pencil Candy (Japan), dạng kẹo cứng nhiều màu, đóng hộp nhỏ" |
| 29071900#2 | 3131/TB-TCHQ | 2019 | 29071900 | 18%: "3,5-Dimethylphenol (CAS 108-68-9), dạng tinh thể, dùng làm nguyên liệu tổng hợp hữu cơ - 3,5-Dimethylphenol dù" |
| 29181100#1 | 508/TB-TCHQ | 2018 | 29181100 | 52%: "Chất nhũ hóa E481 (muối natri của axit béo stearoyl hoá lacto), dùng để phá hủy axit béo trong dầu cọ." |
| 29242930#1 | 2888/TB-TCHQ | 2018 | 29242930 | 39%: "Acetaminophen (paracetamol) - hoạt chất dùng làm nguyên liệu sản xuất thuốc giảm đau, hạ sốt." |
| 39263000#3 | 287/TB-TCHQ | 2025 | 39263000 | 47%: "Sản phẩm nhựa đã hoàn thiện, 81.3% Polyphenylene ether (PPE) + 18.7% đồng C19720, kích thước 122.8 x 84.1 x 65" |
| 39263000#4 | 286/TB-TCHQ | 2025 | 39263000 | 47%: "Sản phẩm nhựa đã hoàn thiện, 95.6% Polypropylene (PP) + 4.4% Polyoxymethylene (POM), kích thước 119.4 x 131.6 " |
| 39263000#5 | 285/TB-TCHQ | 2025 | 39263000 | 47%: "Sản phẩm nhựa đã hoàn thiện, 95.6% Polypropylene (PP) + 4.4% Polyoxymethylene (POM), kích thước 119.4 x 131.6 " |
| 39263000#6 | 284/TB-TCHQ | 2025 | 39263000 | 51%: "Sản phẩm nhựa đã hoàn thiện, 96.15% Polypropylene (PP) + 3.85% thép carbon thấp SWCH10R, kích thước 196.7 x 95" |
| 39263000#9 | 280/TB-TCHQ | 2025 | 39263000 | 50%: "Sản phẩm nhựa đã hoàn thiện, 100% Polypropylene (PP), kích thước 78.5 x 65.8 x 56.4 mm, gắn trên thân xe hơi c" |
| 68159900#10 | 7173/TB-TCHQ | 2018 | 68159900 | 32%: "Sản phẩm chịu lửa dạng tờ từ đá basalt nấu chảy - Sản phẩm từ đá basalt nấu chảy, dạng tờ phẳng, chịu lửa, dùn" |
| 70099100#6 | 1795/TB-TCHQ | 2018 | 70099100 | 30%: "Gương thủy tinh chưa có khung, kích thước 5mm x 1830mm x 2440mm, dùng cho trang trí nội thất" |
| 84099149#0 | 123/TB-TCHQ | 2025 | 84099149 | 56%: "Bộ căng - Bộ căng dùng cho động cơ diesel" |
| 85369012#4 | 3055/TB-TCHQ | 2018 | 85369012 | 47%: "Terminal - Đầu nối điện dạng terminal dùng cho thiết bị điện tử, dây dẫn điện" |
| 85369019#4 | 3056/TB-TCHQ | 2018 | 85369019 | 47%: "Terminal - Đầu nối điện dạng terminal dùng cho thiết bị điện tử, dây dẫn điện" |
| 85369019#5 | 3057/TB-TCHQ | 2018 | 85369019 | 47%: "Terminal - Đầu nối điện dạng terminal dùng cho thiết bị điện tử, dây dẫn điện" |

## MA_LECH_TOAN_VAN: 0

Mã kho ghi không có trong toàn văn; toàn văn kết luận mã khác

| Vị trí | Số | Năm | Mã | Bằng chứng / nguồn |
|---|---|---|---|---|

## GOP_TRUNG: 1356

Từng bản ghi nằm ở trường `khoCu` của nút (phần tử đầu là bản được giữ chữ).

## Thay thế

| Thông báo bị thay | Bị thay bởi | Có nút | Căn cứ |
|---|---|---|---|
| 125/TB-TCHQ, 2017 | 3424/TB-TCHQ (2018-06-18) | không có trong kho | data/tien-le-thay-the.json |
| 1629/TB-TCHQ, 2020 | 1133/TB-TCHQ (2022-04-01) | có, đã ghi `hieuLuc.den` | toàn văn 1133/TB-TCHQ năm 2022 |
| 1813/TB-TCHQ, 2018 | 1979/TB-TCHQ (2018-04-13) | không có trong kho | toàn văn 1979/TB-TCHQ năm 2018 |
| 18172/TB-CHQ, 2025 | 19758/TB-CHQ (2025-08-15) | có, đã ghi `hieuLuc.den` | data/tien-le-thay-the.json |
| 1900/TB-TCHQ, 2020 | 657/TB-TCHQ (2022-02-28) | có, đã ghi `hieuLuc.den` | toàn văn 657/TB-TCHQ năm 2022 |
| 293/TB-TCHQ, 2018 | 2719/TB-TCHQ (2018-05-17) | có, đã ghi `hieuLuc.den` | data/tien-le-thay-the.json |
| 3119/TB-TCHQ, 2018 | 5388/TB-TCHQ (2018-09-14) | có, đã ghi `hieuLuc.den` | toàn văn 5388/TB-TCHQ năm 2018 |
| 3349/TB-TCHQ, 2024 | 3408/TB-TCHQ (2024-07-12) | có, đã ghi `hieuLuc.den` | data/tien-le-thay-the.json |
| 3675/TB-TCHQ, 2019 | 2094/TB-TCHQ (2020-03-31) | có, đã ghi `hieuLuc.den` | data/tien-le-thay-the.json |
| 3676/TB-TCHQ, 2019 | 2093/TB-TCHQ (2020-03-31) | có, đã ghi `hieuLuc.den` | data/tien-le-thay-the.json |
| 3677/TB-TCHQ, 2019 | 2092/TB-TCHQ (2020-03-31) | có, đã ghi `hieuLuc.den` | data/tien-le-thay-the.json |
| 3678/TB-TCHQ, 2019 | 2091/TB-TCHQ (2020-03-31) | có, đã ghi `hieuLuc.den` | data/tien-le-thay-the.json |
| 3682/TB-TCHQ, 2019 | 2090/TB-TCHQ (2020-03-31) | có, đã ghi `hieuLuc.den` | data/tien-le-thay-the.json |
| 3884/TB-TCHQ, 2018 | 1329/TB-TCHQ (2019-03-08) | không có trong kho | data/tien-le-thay-the.json |
| 3989/TB-TCHQ, 2020 | 4389/TB-TCHQ (2022-10-18) | không có trong kho | toàn văn 4389/TB-TCHQ năm 2022 |
| 5523/TB-TCHQ, 2024 | 638/TB-TCHQ (2025-02-12) | có, đã ghi `hieuLuc.den` | toàn văn 638/TB-TCHQ năm 2025 |
| 6025/TB-TCHQ, 2018 | 2499/TB-TCHQ (2020-04-20) | có, đã ghi `hieuLuc.den` | data/tien-le-thay-the.json |
| 606/TB-TCHQ, 2021 | 658/TB-TCHQ (2022-02-28) | không có trong kho | toàn văn 658/TB-TCHQ năm 2022 |
| 6267/TB-TCHQ, 2015 | 206/TB-TCHQ (2018-01-12) | không có trong kho | toàn văn 206/TB-TCHQ năm 2018 |
| 6448/TB-TCHQ, 2023 | 3245/TB-TCHQ (2024-07-05) | có, đã ghi `hieuLuc.den` | data/tien-le-thay-the.json |
| 6449/TB-TCHQ, 2023 | 3246/TB-TCHQ (2024-07-05) | có, đã ghi `hieuLuc.den` | data/tien-le-thay-the.json |
| 722/TB-TCHQ, 2017 | 3058/TB-TCHQ (2018-05-31) | không có trong kho | toàn văn 3058/TB-TCHQ năm 2018 |
| 7902/TB-TCHQ, 2017 | 7274/TB-TCHQ (2018-12-11) | không có trong kho | toàn văn 7274/TB-TCHQ năm 2018 |
| 814/TB-TCHQ, 2018 | 3310/TB-TCHQ (2018-06-12) | có, đã ghi `hieuLuc.den` | toàn văn 3310/TB-TCHQ năm 2018 |
| 99/TB-TCHQ, 2021 | 4124/TB-TCHQ (2021-08-20) | không có trong kho | data/tien-le-thay-the.json |
