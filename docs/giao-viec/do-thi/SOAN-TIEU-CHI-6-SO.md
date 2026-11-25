# Soạn `tieuChi6` cho MỘT nhóm 4 số (khuôn g6@1)

> Việc của bạn: đọc MỘT gói soạn, trả về MỘT khối JSON. Không cần biết gì khác về dự án.
> Bạn KHÔNG phân loại hàng. Bạn chỉ chép lại, có cấu trúc, điều mà chữ luật trong gói nói về từng phân nhóm 6 số.
> Máy sẽ kiểm từng chữ. Viết rộng hơn chữ luật là bị trả về.

## 1. Đầu vào: gói soạn

| Trường | Là gì | Dùng để |
|---|---|---|
| `phanNhom[]` | Mọi phân nhóm 6 số của nhóm: `hs6`, `ten`, `kieu`, `nguonTen`; nếu nằm dưới một nhóm một gạch CÓ TÊN thì có thêm `thuocTang` + `tenTang` | Danh sách PHẢI phủ kín |
| `nguon{}` | Văn bản NGUYÊN VĂN, khoá là mã nguồn (`tieuDe.848110`, `tax.84122100`, `nhom8481.nhom`, `ch84.chuong`, `wco.848110`…) | CHỈ được trích từ đây |
| `khoaGoiY[]` | Khoá từ vựng dùng cho `fact`, kèm `kieu` và `op` hợp lệ | Chọn `fact` + `op` |
| `thongBaoPhanLoai[]` | Thông báo phân loại của hải quan thuộc nhóm (`so`, `ma`, tên hàng) | Chỉ để ghi `tienLe` |
| `toKhaiMau[]` | Tối đa 20 dòng tờ khai mẫu | Chỉ để hiểu hàng thật. KHÔNG phải căn cứ |

`kieu` của phân nhóm do máy đọc từ biểu thuế:

| `kieu` | Nghĩa | Bạn viết |
|---|---|---|
| `CO_TEN` | Có tên riêng ("Van giảm áp"), kể cả "X và các Y khác" ("Tượng nhỏ và các đồ trang trí khác") | Điều kiện lấy từ tên. Không `phanConLai` |
| `DU` | Phần còn lại trần ("Loại khác", "Thiết bị khác") | Đúng một mục `phanConLai: true`. Không điều kiện |
| `DU_CO_PHAM_VI` | Kết thúc bằng "… khác" nhưng có nội dung ("Thiết bị bảo vệ mạch điện khác") | Điều kiện lấy từ phần nội dung của tên, BỎ chữ "khác" (`value`: "Thiết bị bảo vệ mạch điện"), VÀ đúng một mục `phanConLai: true` |

## 2. Đầu ra: đúng một khối JSON

```json
{ "nhom": "8481", "tieuChi6": [ { …mục… }, { …mục… } ] }
```

Mỗi mục là MỘT điều kiện của MỘT phân nhóm. Một phân nhóm cần hai điều kiện thì viết hai mục cùng `hs6`.

| Trường | Bắt buộc | Nội dung |
|---|---|---|
| `hs6` | có | 6 số, lấy từ `phanNhom[]` |
| `nguon` | có | Một khoá của `nguon{}` trong gói |
| `trich` | có | Câu chép NGUYÊN VĂN từ đúng nguồn đó, tối đa 600 ký tự. Lược giữa câu thì dùng `…` |
| `dieuKien` | có ở mục điều kiện | Điều kiện vào bằng lời ngắn. Chỉ dùng chữ có trong `trich` |
| `fact`, `op`, `value` | có ở mục điều kiện | `fact` là một `khoa` trong `khoaGoiY`; `op` theo `kieu` của khoá đó (bảng dưới) |
| `tuKhoa` | có với `TEN_LOAI`, `CONG_DUNG` | Mảng cụm từ ngắn, mỗi cụm nằm nguyên trong `trich` và chỉ riêng phân nhóm này có. Là GỢI Ý để dò mô tả hàng, không phải điều kiện |
| `chieu` | không | `"PHAI_KHONG"` cho vế loại trừ ("trừ …") |
| `dieuKienTru` | không | Chuỗi hoặc mảng chuỗi ghi thứ bị loại từ vế loại trừ ("trừ …", "nhưng không bao gồm …", "không kể …") của `trich` (gắn trên mục khẳng định khi chưa có khoá phủ định riêng, không dùng trên mục phủ định / `phanConLai` / `chuaSoHoa`) |
| `phanConLai` | mục dư | `true`. Mục này chỉ có `hs6`, `phanConLai`, `nguon`, `trich` |
| `chuaSoHoa` | mục thiếu khoá | Một câu nói thiếu khoá gì (vd 7009.91 "Chưa có khung", 7009.92 "Có khung" — mục này cố ý không có `fact`/`dieuKien`). Chỉ gồm `hs6`, `chuaSoHoa`, `nguon`, `trich` |
| `uuTien` | không | `{ "nguon", "trich" }`: câu luật nói phân nhóm này được ưu tiên / xem xét trước |
| `tienLe` | không | `[{ "so", "ma" }]` chép từ `thongBaoPhanLoai[]`. Là ví dụ, không phải điều kiện |
| `kiemChung` | có ở mục công dụng (L15) | `[{ "hoi", "nguon", "trich" }]`: câu hỏi MỘT đặc tính quan sát / đo được giúp kiểm chứng công dụng mà chữ luật nêu; `trich` nguyên văn từ `nguon{}`, đặc tính được hỏi phải nằm trong `trich` |

| `kieu` của khoá | `op` | `value` |
|---|---|---|
| `TEN_LOAI` (khoá `tenLoai`) | `"TEN_LOAI"` | TÊN HÀNG chép nguyên từ `trich`; nhiều tên thay thế thì dùng mảng |
| `CONG_DUNG` (khoá `dungCho`, `congDung`) | `"CONG_DUNG"` | cụm công dụng chép nguyên từ `trich`; nhiều cụm thì dùng mảng |
| `CO_KHONG` (vd `laBoPhan`) | `"CO"` hoặc `"KHONG"` | bỏ trống |
| `LIET_KE` | `"TRONG"` | mảng giá trị trong `giaTriHopLe` |
| `SO` (vd `dienAp`) | `"<"`, `"<="`, `">"`, `">="` | SỐ có trong `trich`, đơn vị ở trường RIÊNG: `"fact": "dienAp", "op": "<=", "value": 60, "donVi": "V"`. Không viết `"60 V"`, không viết `{"so": 60}` |
| `CHAT_LIEU_THEO_VI_TRI` (khoá `chatLieu`) | `"LA"` | chất liệu có trong `trich` |

KHÔNG ghi `thuTu`: máy tự xếp thứ tự xét (theo mã; phân nhóm dư cuối tầng; phân nhóm có `uuTien` lên đầu).
Không thêm trường nào khác. Không viết lời giải thích ngoài khối JSON.

## 3. Luật cứng

Ví dụ lấy từ hai bản mẫu đã qua cổng: [`mau/8481.json`](mau/8481.json), [`mau/8412.json`](mau/8412.json).

**L1. Phủ kín.** Mọi `hs6` trong `phanNhom[]` phải có ít nhất một mục. Không thêm `hs6` ngoài danh sách.
- ĐÚNG: nhóm 8481 có 6 phân nhóm → có mục cho 848110, 848120, 848130, 848140, 848180, 848190.
- SAI: bỏ 848140 vì "ít gặp"; hoặc thêm 848150 (không có trong biểu).

**L2. Trích nguyên văn.** `trich` phải là chuỗi chép từ `nguon{}`, đúng khoá ghi ở `nguon`. Không sửa chữ, không dịch, không viết lại ý.
- ĐÚNG: `"nguon": "tieuDe.848110", "trich": "Van giảm áp"`.
- SAI: `"trich": "Van giảm áp suất của lưu chất trong đường ống"` (tự viết lại).

**L3. Trích tên của chính phân nhóm.** Tiêu đề lấy từ `nguonTen` của phân nhóm đó, hoặc từ `tieuDe.<thuocTang>` của nhóm một gạch chứa nó. Không lấy tên của phân nhóm khác. Không lấy dòng 8 số hay tiêu đề dài hơn 6 số.
- ĐÚNG: 841221 có hai mục: `tieuDe.84122` "Động cơ và mô tơ thủy lực" và `tax.84122100` "Chuyển động tịnh tiến (xi lanh)".
- SAI: 848130 trích `tieuDe.848140`; hoặc 848120 trích `tieuDe.8481201` (tiêu đề 7 số).

**L4. Không suy rộng.** Mọi từ có nghĩa trong `dieuKien`, mọi cụm trong `tuKhoa`, mọi `value` phải nằm trong `trich` của chính mục đó. Luật không nói thì không ghi, kể cả khi bạn biết chắc ngoài đời là đúng.
- ĐÚNG: 848120: `"dieuKien": "Van dùng trong truyền động dầu thủy lực hoặc truyền động khí nén"`, `"tuKhoa": ["thủy lực", "khí nén"]`.
- SAI: thêm `"điện từ"` vào `tuKhoa`, hoặc viết `"dieuKien": "Van điện từ 5/2 dùng trong truyền động khí nén"`. Chữ luật không có "điện từ" hay "5/2": đó là cách điều khiển, không phải tiêu chí của phân nhóm.

**L5. Tên thương mại và tờ khai không phải căn cứ.** `toKhaiMau` và `thongBaoPhanLoai` chỉ giúp bạn hiểu hàng. Không lấy chữ từ đó làm `trich`, `dieuKien`, `tuKhoa`.
- ĐÚNG: 848120 ghi `"tienLe": [{ "so": "851/TB-TCHQ", "ma": "84812090" }]` (ví dụ, tách riêng, đúng phân nhóm).
- SAI: thấy tờ khai "van tiết lưu" khai 84812090 rồi thêm `"van tiết lưu"` vào `tuKhoa` của 848120.

**L6. Phân nhóm `DU` không có điều kiện.** Nhận đúng MỘT mục `"phanConLai": true`, `nguon` là `nguonTen` của nó, `trich` là tiêu đề của nó.
- ĐÚNG: `{ "hs6": "848180", "phanConLai": true, "nguon": "tieuDe.848180", "trich": "848180 Thiết bị khác" }`.
- SAI: cho 848180 `"fact": "tenLoai", "value": "Thiết bị khác"`; hoặc lấy tên tiếng Anh `wco.848180` làm điều kiện cho nó.

**L7. Phân nhóm nằm trong một tầng thì mang điều kiện của tầng.** Phân nhóm có ghi `thuocTang` thì phải có một mục điều kiện trích từ `tieuDe.<thuocTang>`. Phân nhóm `DU` trong tầng: mục của tầng + mục `phanConLai`. Phân nhóm không ghi `thuocTang` thì không viết mục nào cho tầng.
- ĐÚNG: 841229 có mục `tieuDe.84122` "Động cơ và mô tơ thủy lực" và mục `phanConLai` trích `tax.84122900`.
- SAI: 841239 chỉ có mục `phanConLai` (mất điều kiện "dùng khí nén" của tầng).

**L8. `tenLoai` chỉ nhận TÊN HÀNG.** Chất liệu ("Bằng …"), trạng thái ("Đã / Chưa …") không phải tên hàng: dùng `chatLieu`, khoá có–không. Trong câu "X dùng cho / dùng trong / lắp vào Y": X là tên hàng (`tenLoai`), Y là `dungCho`. "Bộ phận" dùng `laBoPhan` với `op: "CO"`, không `value`, không `tuKhoa`. `value` không kết thúc bằng chữ "khác".
- ĐÚNG: 841221, tiêu đề "Chuyển động tịnh tiến (xi lanh)" → `"fact": "tenLoai", "value": "xi lanh"`. 848120 "Van dùng trong truyền động dầu thủy lực hoặc khí nén" → `"fact": "dungCho", "value": ["truyền động dầu thủy lực", "truyền động khí nén"]`. 848190 → `"fact": "laBoPhan", "op": "CO"`.
- SAI: 841231 ghi `"fact": "tenLoai", "value": "dùng khí nén"`; 848120 ghi `"fact": "tenLoai", "value": "truyền động khí nén"` (đó là thứ van dùng cho, không phải tên van); tự đặt `"fact": "cong_dung_truyen_dong"`.

**L9. Thiếu khoá thì nói thiếu, nhưng chỉ khi thật sự thiếu.** Vế là tên hàng thì dùng `tenLoai`; "dùng cho / lắp vào …" dùng `dungCho`; "bằng …" dùng `chatLieu`; vế mà một khoá trong `khoaGoiY` đọc được ("đã tráng men" → `daTrangMen`) thì dùng khoá đó. Chỉ khi không khoá nào hợp mới viết mục `chuaSoHoa` (vd `chatLieu` chưa có giá trị "da thuộc": vế "bằng da thuộc hoặc da thuộc tổng hợp" khai `chuaSoHoa`, `trich` là tiêu đề đó). Không mượn khoá gần nghĩa.
- ĐÚNG: 841221 "Chuyển động tịnh tiến (xi lanh)" → `"fact": "tenLoai", "value": "xi lanh"`.
- SAI: `{ "hs6": "841221", "chuaSoHoa": "thiếu khoá kiểu chuyển động", … }` (tenLoai dùng được); dùng `cachDieuKhien: KHI_NEN` cho "Động cơ và mô tơ dùng khí nén" (khoá đó là cách điều khiển, không phải nguồn động lực).

**L10. Danh sách thì dùng mảng; "kể cả" và "tương tự" không phải điều kiện.** Các tên trong vế "(kể cả …)" gộp vào mảng `value` của mục chính, không viết mục riêng (hai mục khẳng định là hai điều kiện CÙNG phải thoả). "các loại tương tự", "loại khác" không bao giờ là phần tử của `value` / `tuKhoa`.
- ĐÚNG: 3926.20 → MỘT mục `"value": ["Hàng may mặc", "đồ phụ trợ may mặc", "găng tay", "găng hở ngón", "găng bao tay"]`.
- SAI: thêm mục thứ hai `"value": ["găng tay", …]`; tách 3926.40 thành mục "Tượng nhỏ" + mục "đồ trang trí" (thành điều kiện CÙNG phải thoả); hoặc `"value": ["đồ nội thất", "thân xe", "các loại tương tự"]`, `"găng tay và các loại tương tự"`.

**L10b. Mỗi phần tử một tên.** Tiêu đề liệt kê nhiều tên ("A, B và C", "A; B") thì `value` là mảng, mỗi phần tử một tên chép nguyên từ `trich`.
- ĐÚNG: 848140 "Van an toàn hoặc van xả" → `"value": ["Van an toàn", "van xả"]`.
- SAI: `"value": "Van an toàn, van xả, v.v.., có hoặc không đi kèm với một còi báo"` (cả câu trong một chuỗi).

**L11. Vế loại trừ ("trừ …", "nhưng không bao gồm …", "không kể …") phải tách riêng.** Viết một mục `chieu: "PHAI_KHONG"` với `value` là thứ bị trừ, HOẶC gắn `dieuKienTru` trên mục khẳng định (khi không có khoá phủ định hẹp riêng — không dùng khoá rộng hơn chữ luật như `tinhDanHoi` để biểu diễn "nhưng không bao gồm sợi cao su"). Thứ bị trừ không bao giờ nằm trong `tuKhoa` hay `value` của mục khẳng định.
- ĐÚNG: 841210 "Động cơ phản lực trừ tua bin phản lực" → mục `value: "Động cơ phản lực"` và mục `chieu: "PHAI_KHONG", value: "tua bin phản lực"`. 600410 "Có hàm lượng sợi đàn hồi chiếm từ 5% trở lên tính theo khối lượng nhưng không bao gồm sợi cao su" → mục `hamLuongSoiDanHoi >= 5%` kèm `"dieuKienTru": ["sợi cao su"]`.
- SAI: bỏ vế loại trừ; dùng `tinhDanHoi` cho "nhưng không bao gồm sợi cao su"; hoặc mục khẳng định ghi `"tuKhoa": ["tua bin phản lực"]`.

**L12. `tuKhoa` phải riêng.** Cụm mà tiêu đề của phân nhóm khác cũng có, hoặc chữ chung hàng nào cũng mang ("thiết bị", "phụ kiện", "sản phẩm", "đồ dùng"), không phải dấu hiệu nhận ra phân nhóm này. Hai phân nhóm không được có bộ điều kiện giống nhau.
- ĐÚNG: 841221 = "thủy lực" + "xi lanh"; 841231 = "khí nén" + "xi lanh" (hai mục, cả hai cùng phải khớp).
- SAI: 841221 lấy `"tuKhoa": ["động cơ"]` cho mục của tầng (tiêu đề 841231 cũng có "động cơ" và "xi lanh" → bị chỉ nhầm).

**L13. Chỉ ghi `uuTien` khi luật nói ưu tiên.** `uuTien.trich` phải là câu luật nêu đúng số phân nhóm và nói nó được ưu tiên / xem xét trước. Không có câu như vậy thì không ghi.
- ĐÚNG: 848120: `"uuTien": { "nguon": "ch84.chuong", "trich": "Phân nhóm 8481.20 được ưu tiên xem xét trước trong các phân nhóm thuộc nhóm 84.81." }`.
- SAI: ghi `uuTien` vì "hay gặp nhất", hoặc trích một câu không có chữ ưu tiên.

**L14. Phủ đủ vế.** Tiêu đề phân nhóm (và tầng có tên chứa nó) có mấy vế nội dung thì phải có mục mang đủ mấy vế đó. Vế nối bằng dấu phẩy là CỘNG DỒN: "Bằng sắt hoặc thép, đã tráng men" là hai vế, cần hai mục. Bỏ một vế làm tiêu chí rộng hơn luật. Vế phải nằm trong ĐIỀU KIỆN (`value` / khoá), `tuKhoa` không tính. Vế có nhiều phương án ("bằng da thuộc hoặc da thuộc tổng hợp", "văn phòng hoặc trường học") thì `value` mang đủ mọi phương án. Vế mở ("có hoặc không có …", "kể cả …") không phải vế giới hạn.
- ĐÚNG: 7323.94 → mục `chatLieu` "sắt / thép" + mục `daTrangMen` `CO` + mục `chieu: "PHAI_KHONG"` "gang". 841221 → mục tầng "Động cơ và mô tơ thủy lực" + mục "xi lanh".
- SAI: 7323.94 chỉ có `chatLieu` (thiếu "đã tráng men"); 841221 chỉ có mục tầng (thiếu "Chuyển động tịnh tiến (xi lanh)").

**L15. Hỏi đặc tính kiểm chứng được, không hỏi mục đích hay tên gọi khách tự nhận.** Điều kiện và câu hỏi phải nhắm vào thứ nhìn thấy, đo được trên hàng (cấu tạo, kích thước, chất liệu, cơ cấu, thông số); chỉ được dùng công dụng khi chính chữ luật trích định nghĩa phân nhóm bằng công dụng, và khi đó phải kèm `kiemChung` hỏi một đặc tính có trong chữ luật.
- ĐÚNG: 848120 (chữ luật: "van dùng trong truyền động dầu thủy lực hoặc truyền động khí nén") → mục `dungCho` + `"kiemChung": [{ "hoi": "Van có làm việc trong hệ thủy lực hoặc khí nén mà nguồn năng lượng được cung cấp dưới dạng chất lưu nén (chất lỏng hoặc khí) không?", "nguon": "ch84.chuong", "trich": "trong hệ thủy lực hoặc khí nén mà từ đó nguồn năng lượng được cung cấp dưới dạng chất lưu nén (chất lỏng hoặc khí)" }]`. Đai lưng muốn vào 9506.91: hỏi "Đai có bản rộng đỡ lưng, khoá chịu lực, đệm lót không?".
- SAI: "Là đai chuyên dụng cho tập gym?", hay "Là các mặt hàng và thiết bị cho tập luyện thể chất nói chung, thể dục hoặc điền kinh?" (khách gọi hàng là "đai tập gym" sẽ tự trả lời "có", dù hàng chỉ là một thắt lưng có chốt khoá như thắt lưng da: "đai lưng" là chủ thể, "tập gym" là bối cảnh; tờ khai mẫu OZ "Đai lưng" khai 4 lần 6307.90.90, 1 lần 9506.91.00). Thêm "Van dùng để giảm áp" cho 848110 trong khi tiêu đề chỉ là "Van giảm áp".

Không chắc một điều thì KHÔNG ghi. Thiếu một `tuKhoa` không sao; thừa một chữ ngoài luật là bị trả về.

## 4. Cổng máy sẽ trả về những lỗi này

Chạy: `node scripts/kiem-tieu-chi-6.mjs --tep=<tệp của bạn>`. Bảng dưới là bảng tra nhanh theo luật; nguồn duy nhất của danh sách
mã là `MA_LOI` / `CANH_BAO` trong `lib/do-thi/tieu-chi-6.js`, in đầy đủ bằng `node scripts/kiem-tieu-chi-6.mjs --ma-loi`.

| Mã lỗi | Bạn đã làm gì | Sửa |
|---|---|---|
| `KHUON_SAI` | Thiếu trường, trường lạ, `op` không hợp `kieu`, khoá `SO` thiếu `donVi`, `trich` quá 600 ký tự, phân nhóm không phải `DU` thiếu điều kiện/`chuaSoHoa` riêng | Bảng mục 2 |
| `PHAN_NHOM_KHONG_TON_TAI` / `THIEU_PHAN_NHOM` | `hs6` lạ / bỏ sót phân nhóm | L1 |
| `NGUON_KHONG_TON_TAI` / `TRICH_KHONG_NGUYEN_VAN` | `nguon` ngoài gói / `trich` không có trong nguồn | L2 |
| `NGUON_LAC_PHAN_NHOM` | Trích tên của phân nhóm khác | L3 |
| `SUY_RONG` | `dieuKien` / `tuKhoa` / `value` / `dieuKienTru` có chữ ngoài `trich` (hoặc `dieuKienTru` không nằm trong vế loại trừ) | L4, L5, L11 |
| `TIEN_LE_SAI` | `tienLe` không có trong gói hoặc không ra phân nhóm này | L5 |
| `DU_SAI_KHAI` / `DU_MANG_DIEU_KIEN` | Phân nhóm `DU` / `DU_CO_PHAM_VI` thiếu `phanConLai`, `CO_TEN` lại khai `phanConLai`, hoặc `DU` mang điều kiện riêng | L6, L7, bảng `kieu` |
| `THIEU_DIEU_KIEN_TANG` | Phân nhóm trong một tầng có tên mà không có mục trích `tieuDe.<thuocTang>` | L7 |
| `KHOA_DU_KIEN_LA` / `SAI_KHOA_THUOC_TINH` | `fact` tự đặt / `tenLoai` nhận một thuộc tính | L8, L9 |
| `KHOA_RONG_HON_LUAT` | Khoá / giá trị `tu-vung@2` rộng hơn chữ luật (`gốm sứ` cho chỉ "sứ", `sắt thép` cho chỉ "sắt"/"thép", `kim loại` cho kim loại cụ thể, `chatLieu` làm rơi chữ thu hẹp như "tổng hợp"/"xốp"/"lưu hóa", hoặc `tinhDanHoi` cho chỉ "sợi đàn hồi" / trừ "sợi cao su") | L9; chọn khoá hẹp đúng luật hoặc khai `chuaSoHoa` |
| `KHOA_HEP_HON_LUAT` | Khoá / giá trị `tu-vung@2` hẹp hơn chữ luật: luật nói cả họ mà bạn chọn một thứ trong họ (`chatLieu: "vải dệt"` khi luật nêu "vật liệu dệt" — làm rơi vải không dệt/nỉ; một kim loại cụ thể hoặc `kimLoaiCoBanKhac` cho "kim loại cơ bản"; khoá polyme chuyên biệt / `PLASTIC_XOP` cho "plastic" chung) | L9; dùng khoá đúng tầm chữ luật: `vatLieuKhac: "VAT_LIEU_DET"`, `chatLieu: "kim loại"`, `chatLieu: "plastic"`. Cùng khoá `kim loại` là RỘNG nếu luật chỉ nêu một kim loại cụ thể — rộng/hẹp xét theo `trich`, không xét theo khoá |
| `TEN_LOAI_SAU_GIOI_TU` / `TEN_CO_CHU_KHAC` | `tenLoai` nhận thứ đứng sau "dùng cho" / `value` còn chữ "khác" | L8 |
| `LIET_KE_MOT_CHUOI` | Một chuỗi gói cả danh sách | L10 |
| `GIA_TRI_RONG` / `KE_CA_LA_DIEU_KIEN` / `TACH_LIET_KE` | "các loại tương tự" trong value / tên trong "kể cả" thành mục riêng / các tên của một câu tách thành nhiều mục | L10 |
| `THIEU_VE_TRU` / `TU_KHOA_TRONG_VE_TRU` | Bỏ vế loại trừ ("trừ …", "nhưng không bao gồm …", "không kể …") / lấy thứ bị loại làm dấu hiệu | L11 |
| `KHOA_NGUOC_VE_TRU` | Mục khẳng định (`op` `TRONG` / `LA` / `CO`) chọn khoá ĐỌC ra thứ nằm ở vế loại trừ mà không khớp phần khẳng định của câu `trich` — đảo ngược vế trừ. Bắt cả khoá có kiểu (số, có–không, liệt kê), không chỉ chữ trong `value` / `tuKhoa` | L11; khoá của mục khẳng định phải đọc phần khẳng định; thứ bị trừ chuyển sang mục `chieu: "PHAI_KHONG"` hoặc `dieuKienTru` |
| `TIEU_DE_CHI_LAC` / `TU_KHOA_QUA_CHUNG` / `TRUNG_DIEU_KIEN` | `tuKhoa` dùng chữ của phân nhóm khác / chữ chung / hai phân nhóm giống nhau | L12 |
| `THU_TU_KHONG_CAN_CU` | `uuTien` không phải câu luật nói ưu tiên | L13 |
| `THIEU_VE_GIOI_HAN` | Một vế của tiêu đề / tầng không có mục nào mang | L14 |
| `CHUA_SO_HOA_CO_KHOA` | Khai `chuaSoHoa` trong khi có khoá hợp | L9 |
| `THU_TU_SAI` / `DU_KHONG_CUOI` | Ghi `thuTu` bằng tay và ghi sai | Bỏ `thuTu` |
| `CHI_HOI_MUC_DICH` | Điều kiện / `kiemChung.hoi` chỉ có lời mục đích, công dụng tự nhận, tên gọi ("dùng cho", "chuyên dụng", "cho tập", "phục vụ"…) mà không có đặc tính kiểm chứng được, và câu trích không định nghĩa bằng công dụng đó | L15 |

Cảnh báo (không chặn, người soát đọc): `CONG_DUNG_THIEU_DAC_TINH_KIEM_CHUNG` (chữ luật định nghĩa bằng công dụng, được phép, nhưng phân nhóm chưa có `kiemChung` hay mục đặc tính nào: thêm theo L15), `LECH_TO_KHAI_CAO` (dò `tuKhoa` trên tờ khai mẫu chỉ sai quá 10% số dòng, hoặc quá 25% số dòng có kết luận: `tuKhoa` quá rộng thì thu hẹp; KHÔNG sửa tiêu chí cho khớp tờ khai khi chữ luật nói khác), `THIEU_KHOA_TU_VUNG` (mục `chuaSoHoa` mà máy không thấy khoá hợp: người soát xem có cần thêm khoá từ vựng).

Nhận lại danh sách lỗi thì sửa đúng mục bị nêu và trả lại TOÀN BỘ khối JSON.

## 5. Dành cho người giao việc

```bash
node scripts/goi-soan-tieu-chi-6.mjs --nhom=XXXX --out=tmp/goi-g6      # gói soạn (tất định, không LLM)
# đưa tệp này + tmp/goi-g6/XXXX.json cho AI soạn → lưu trả lời vào tmp/g6/XXXX.json
node scripts/kiem-tieu-chi-6.mjs --tep=tmp/g6/XXXX.json                # cổng; --json cho vòng sửa tự động
node scripts/goi-soan-tieu-chi-6.mjs --ap=tmp/g6/XXXX.json             # 0 lỗi mới ghi data/so-tay/XXXX.json (máy gắn thuTu)
node scripts/dung-bang-canh.mjs --ghi && npm test                      # dựng lại số đếm bảng cạnh (cạnh C10), commit cùng PR
```

- Tối đa 2 lượt sửa theo lỗi cổng. Vẫn đỏ thì bỏ nhóm đó, ghi vào báo cáo, không sửa tay cho qua.
- Qua cổng CHƯA phải là đúng. Cổng bắt lỗi chép, lỗi khuôn và lỗi tự mâu thuẫn; chọn sai `fact`, chọn câu trích không phải tiêu chí
  thì người soát phải đọc. Mục đã áp mang nhãn `AI_DA_KIEM` (máy đã kiểm trích, chưa ai duyệt): động cơ hồ sơ chỉ dùng mục đã duyệt.
- Đọc mọi cảnh báo trước khi áp. `LECH_TO_KHAI_CAO` kèm danh sách ca: xem từng ca là tiêu chí sai hay tờ khai lệch luật.
- Lỗi lọt cổng tìm thấy khi soát: thêm luật vào mục 3, thêm phép kiểm vào `lib/do-thi/tieu-chi-6.js`, thêm ca tiêm lỗi vào
  `scripts/test-tieu-chi-6.mjs`. Báo cáo các lần thử nhân bản: [`thu-nhan-ban-1/`](thu-nhan-ban-1/).
