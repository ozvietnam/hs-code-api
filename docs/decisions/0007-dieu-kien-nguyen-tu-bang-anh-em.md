# ADR-0007: Điều kiện nguyên tử và bảng anh em — "Loại khác" đóng bằng tiêu chí

- Ngày: 27/11/2026 · Trạng thái: chấp nhận (CEO duyệt 27/11, sau phản biện của chuyên gia phân tích dữ liệu độc lập)
- Luật nền: ADR-0004 (bậc Quy tắc 6: 4→6→8 số, chỉ so cùng cấp), ADR-0005 (repo số hoá luật, LLM là người đọc), ADR-0006 (hồ sơ vấn đề)
- Thay cho: bản nháp M-36 "thẻ định danh nút" (#1923, chưa duyệt) — bỏ ô `trucTach` / `phanBu` dạng kể giá trị; bỏ mốc "16/18 khớp bảng tay" trong `docs/mong/thu-the-dinh-danh-8543.md` §7.

## Bối cảnh (đo 27/11 trên main)
- 3.357 / 11.871 mã 8 số là "Loại khác"; chỉ 107 có hình hàng dương trích từ chú giải. LLM nhìn "Loại khác" như một cái lỗ.
- Chỗ hở thật nằm ở **9.520 dòng có tên**, không ở dòng "Loại khác": 8.768 dòng chỉ có bản ghi `TACH_ANH_EM`; 6.561 trong số đó chỉ là khuôn "đáp ứng mô tả phân tách cùng cấp: &lt;tên&gt;" (chép lại tên dòng); 2.126 tên ghép (`;` / `hoặc` / `và` / `trừ`) để nguyên một bản ghi. Ô `duKien` nhiều nơi chứa mẩu tên ("Loại khác", tên cắt cụt) thay vì loại dữ kiện.
- Thử Gemma (máy GPU nhà, chữ luật thô) định tuyến 18 ví dụ chú giải 85.43 xuống 8 số: 15/18 khớp bảng tay; **3 ca trượt đúng là 3 ca phụ thuộc dữ kiện ẩn** (vi sóng; đóng rắn mạch in; nối điện thoại). Hai lượt cùng Gemma ở hai nhiệt độ tự khớp 18/18 → cùng một mô hình không phải hai phiếu độc lập.
- Gemma tách tên 8543.70 thành câu hỏi có/không: 14 giây, trích đúng; nhưng không thấy cặp chồng lấn nào (có ít nhất một: máy đọc sách điện tử có từ điển thoả cả .30 và .50) và sót chữ mở "vi sóng".
- Thế giới: chưa hệ nào đóng "Other" bằng ví dụ. GS1 GPC bắt mỗi thuộc tính có hai trạng thái đặc biệt UNCLASSIFIED (biết, không có tên trong danh sách) và UNIDENTIFIED (chưa biết) — đúng hai ô "Loại khác" và "dừng hỏi". Kiểm bảng quyết định (Calvanese–Dumas, arXiv 1603.07466; Vanthienen) bắt "chồng" và "lọt" bằng máy. HSGraphAgent (ACL 2026) có cạnh chứa/loại trừ nhưng mặc định mô tả đã đủ dữ kiện; phần "biết mình thiếu gì" chưa ai làm.

## Quyết định
1. **"Loại khác" không có nội dung riêng.** Loại khác của nút cha P = (phạm vi P) ∧ ¬(hợp các anh em có tên cùng cấp). Nó **đóng khi mỗi anh em có tên được viết thành công thức trên điều kiện nguyên tử có trích luật.** Danh sách sản phẩm thế giới về bản chất là mở: chỉ là THAM_KHAO (M-80), không bao giờ là điều kiện đóng.
2. **Loại bản ghi mới trong hồ sơ vấn đề** (khuôn `ho-so-ma@1`, thêm loại, không sửa bản ghi cũ):
   - `DIEU_KIEN` — mỗi bản ghi một điều kiện nguyên tử của một nút có tên: `{id, nut, loai:"DIEU_KIEN", ve, phu, kieu, mo, cauHoi, trich, nguon, vanTay}`.
     - `ve`: số thứ tự vế HOẶC (1..n; dấu `;` hay "hoặc" giữa các vế). Các điều kiện cùng `ve` là VÀ.
     - `phu`: `true` khi điều kiện mang nghĩa KHÔNG ("trừ…", "không kể…").
     - `kieu`: `CO_KHONG` | `SO` (kèm `nguong`: id bản ghi NGUONG đã có, không lặp số) | `GIA_TRI` (kèm `tap`: các giá trị nguyên văn của trục, ví dụ chất liệu mặt ngoài).
     - `mo`: `DINH_NGHIA_LUAT` (có chú giải/định nghĩa trích được) | `NGUONG` | `MO_TA_HUONG_DAN` (chú giải chi tiết mô tả nhưng không định nghĩa) | `NGHIA_THUONG` (chữ luật không định nghĩa — "vi sóng", "thiết kế đặc biệt").
     - `cauHoi`: một câu hỏi có/không về món hàng. `trich`: chuỗi con nguyên văn của câu luật `nguon`.
   - `GIAI_CHONG` — khi hai anh em có thể cùng thoả: `{nut (cha), cap:[A,B], cach: TRU|QUY_TAC_3|CHU_GIAI|NGUONG, trich, nguon}`.
   - `CANH_TRANH` — với nhóm "chưa được chi tiết hoặc ghi ở nơi khác": danh sách hữu hạn nhóm cạnh tranh + ba phép thử của chú giải 84.79 (`nhom:8479:ct:1–7`), trích nguyên văn.
   - Lưu `data/ho-so-ma/dieu-kien/<chương>.jsonl` (+ `giai-chong`, `canh-tranh` cùng thư mục). Id: `hs:<nut>:81NN`.
3. **`bang-anh-em@1` — máy sinh, không viết tay**, mỗi nút cha một bảng (`data/ho-so-ma/bang-anh-em/<chương>.jsonl`):
   - mỗi anh em có tên = HOẶC-của-VÀ trên id `DIEU_KIEN`; "Loại khác" = KHÔNG(hợp) + chuỗi điều kiện các cấp cha;
   - `cauHoiToiThieu` = điều kiện của chính nút ∪ (riêng "Loại khác") điều kiện của mọi anh em ∪ chuỗi cha — **máy ghép, không LLM**;
   - `co`: `HO_PHU` · `VUNG_CHONG` · `CHUA_CHUNG_MINH_TACH` · `NGHIA_THUONG` · `THIEU_VI_DU`.
   Thẻ định danh nút (M-36) chỉ còn là **phần hiển thị** sinh từ bảng này + hồ sơ.
4. **Cổng máy** (thêm vào `scripts/ho-so-ma/cong.mjs`, đánh số tiếp sau cổng 5):
   - 6 TÁCH: mỗi nút có tên ≥ 1 `DIEU_KIEN`; số vế ≥ số đoạn tách bởi `;` trong tên; `trich` là chuỗi con nguyên văn.
   - 7 PHỦ: nhóm anh em không có "Loại khác" phải chứng minh phủ kín phạm vi cha (cặp `phu` bù nhau, ngưỡng phủ kín, hoặc tập `GIA_TRI` đủ); không chứng minh được → cờ `HO_PHU`.
   - 8 CHỒNG: máy chỉ **chứng minh rời nhau** được khi hai anh em khác nhau trên cùng trục `SO`/`GIA_TRI`, hoặc một bên là `phu` của bên kia. Cặp còn lại → `CHUA_CHUNG_MINH_TACH` (đếm, không chặn). Cặp có phiếu LLM chỉ ra món hàng cụ thể thoả cả hai → `VUNG_CHONG` (chặn) cho tới khi có `GIAI_CHONG` trích luật hoặc người làm nghề duyệt.
   - 9 HỎI: `cauHoiToiThieu` sinh được cho mọi "Loại khác"; không nút nào thiếu chuỗi cha.
   - 10 DÒ: mỗi ví dụ chú giải/SEN là một ca thử `{trich, gán điều kiện, đích}`; chạy qua bảng phải ra đúng đích, hoặc rẽ nhánh đúng dữ kiện. Lệch = điểm lõi phải sửa (sửa điều kiện hoặc gắn cờ), không sửa ca thử.
   - 11 MỞ: 100% `DIEU_KIEN` có `mo`. `NGHIA_THUONG` ở vùng biên → dừng hỏi, hoặc chốt kèm giả định (quyết định CEO 24/11).
   - 12 BÙ: mọi nhóm "chưa chi tiết ở nơi khác" có `CANH_TRANH`.
5. **LLM chỉ làm ba việc hẹp**, luôn hai phiếu **khác hãng** (Gemma máy nhà + một mô hình hãng khác), `KHOP` / `LECH_PHIEU`, chỉ gửi chữ luật công khai: (a) tách tên dòng thành `DIEU_KIEN`; (b) gán điều kiện cho ví dụ chú giải (cổng 10); (c) chỉ ra món hàng cụ thể làm hai anh em chồng (cổng 8). Mọi bước khác tất định.
6. **Không đổi đường khách.** Dữ liệu mới không nạp vào `lib/engine-loop.js`, `lib/do-thi/`, `lib/tim-truoc.js`, và `lib/ho-so-ma/ghep.js` chưa đọc thư mục mới trong ADR này. Nối vào đường khách là thẻ quyết định riêng, sau khi đo bậc thang T1/T2/T3.
7. **Thử 4 nhóm khác kiểu trước khi cuốn chiếu:** 85.43 ("Loại khác" lồng + "chưa chi tiết ở nơi khác"), 85.01 (ngưỡng công suất + công dụng, lồng), 42.02 (trục chất liệu mặt ngoài, 3–4 tầng, có dòng không mã), 02.01 (không có "Loại khác", phải phủ kín). QT sửa bảng tay 85.43 (5 lỗi chuyên gia chỉ ra) làm chuẩn đối chiếu; khớp bảng tay **không** đồng nghĩa đúng luật — đọc từng ca lệch.
8. **Thước dừng (đóng), báo bằng 3 con số:** số bảng đạt cổng 6–12 / 3.493 (đích 100%); số `NGHIA_THUONG` đã đếm và có câu hỏi (đích: đếm hết, không đòi về 0); số `VUNG_CHONG` chưa giải (giảm dần qua người duyệt). Kết quả phân loại vẫn đo bằng bậc thang T1/T2/T3, không bằng thước này.

## Hệ quả
- M-76 "xong 96/96" chỉ đúng về số bản ghi; phần điều kiện của 6.561 dòng khuôn chép tên được làm lại qua `DIEU_KIEN`, không sửa bản ghi cũ.
- Mỗi bảng là một đơn vị việc nhỏ, có vân tay theo câu luật: luật đổi câu nào chỉ chạy lại bảng dính câu đó.
- Bản ghi (mô tả → gán điều kiện → đường đi → câu hỏi khi thiếu) là dạng dữ liệu huấn luyện mô hình chuyên gia mà HSCodeComp/ATLAS chưa có; đa ngôn ngữ bằng cách tách song song `moTaEn`, đối chiếu bản gốc WCO ở 6 số.
- Còn mở: tập vàng do người làm nghề duyệt; điều khoản bản quyền Chú giải WCO trước khi phát hành ra ngoài; thước "số câu hỏi cần để chốt".

## Không làm
- Không đóng "Loại khác" bằng danh sách sản phẩm; không viết luật tất định hiểu tên hàng (ADR-0005).
- Không dùng tiền lệ, tờ khai, dữ liệu khách làm căn cứ.
