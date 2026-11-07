# Siết dòng "chỉ xét tên" theo SEN (việc cho thợ)

Bối cảnh: phân tích 42 ca TB-TCHQ lệch chữ biểu (`docs/giao-viec/so-tay/tien-le-lech/`) cho thấy máy xếp sai khi tên hàng khai
trùng nguyên văn tên dòng mà hàng không đạt **định nghĩa** của dòng (vd 3926.90.93 "Khóa" = *Buckles*, khóa cài dây đai — không
phải khóa hãm cốp xe). 260 dòng 8 số hiện chỉ có điều kiện tên (`TEN_LOAI`) dù SEN định nghĩa rõ hơn. Danh sách:
`docs/giao-viec/so-tay/tien-le-lech/thu-17.json` → `dongChiTenCoSenChuaDung.ma`.

## Mẫu đã làm: 392690 .93 (PR #1092)

```json
"39269093": {
  "nguon": "sen.39269093",
  "trich": "Khóa nhựa được thiết kế để buộc chặt hai đầu rời … Khoá điều chỉnh được sử dụng để thắt chặt và nới lỏng dây đai … Móc treo là vật liệu … Nút chặn dây thường bao gồm",
  "dieuKienSo": [{"op":"HOAC","phuongAn":[
    [{"fact":"tenLoai","op":"TEN_LOAI","value":"Khóa"},{"fact":"congDung","op":"CONG_DUNG","value":"buộc chặt hai đầu rời"}],
    [{"fact":"tenLoai","op":"TEN_LOAI","value":"Khoá điều chỉnh"},{"fact":"congDung","op":"CONG_DUNG","value":"thắt chặt và nới lỏng dây đai"}],
    [{"fact":"tenLoai","op":"TEN_LOAI","value":"Móc treo"}],
    [{"fact":"tenLoai","op":"TEN_LOAI","value":"Nút chặn dây"}]]}]
}
```

## Làm với TỪNG dòng được giao

1. Đọc SEN của dòng: `node -e 'for(const m of require("./data/sen-2022.json").muc) if(m.ma.includes("<hs8>")) console.log(m.noiDung)'`.
2. SEN có nêu **tiêu chí phân biệt** mà chữ biểu thiếu không? Chỉ hai trường hợp được siết:
   - **(a) Tên dòng đa nghĩa**: cùng chữ ấy chỉ nhiều hàng khác bản chất (vd "Khóa" = khóa cài dây đai *buckle*, không phải ổ
     khóa) ⇒ thêm đặc điểm SEN dùng để chỉ đúng nghĩa.
   - **(b) Tiêu chí đo/kiểm được**: thông số có ngưỡng, vật liệu, cấu tạo, thành phần định lượng (vd "loại cứng" = mô-đun đàn hồi
     > 100.000 psi).
   - **KHÔNG siết** khi tên dòng đã đặc trưng (Miếng dán nicotin, Cám, Rượu sa kê…) và SEN chỉ tả công dụng **thông thường**,
     quy trình làm ra, nguồn gốc, hay kể ví dụ. Câu kiểu "được sử dụng làm thức ăn chăn nuôi", "dùng để cai thuốc lá" là MÔ TẢ,
     không phải tiêu chí: thêm nó làm hàng thật (khai đúng tên, không ghi công dụng) bị THIEU, hoặc hàng dùng khác (cám làm bánh)
     bị MAU_THUAN và đẩy sai sang "Loại khác" — tệ hơn không siết (PR #1138 bị đóng vì đúng lỗi này).
   - Không thuộc (a)/(b) ⇒ KHÔNG sửa; ghi vào báo cáo "không cần siết".
   - **Có** ⇒ viết lại mục `dong8["<hs8>"]` trong `docs/giao-viec/so-tay/spec/<pn6>.json` như mẫu:
     `"nguon": "sen.<hs8>"`, `"trich"` lược NGUYÊN VĂN từ SEN (≤ 300 ký tự, nối đoạn bằng "…", đúng thứ tự), điều kiện là tên
     **+** đặc điểm; mọi giá trị là chuỗi con NGUYÊN VĂN của `trich`. Ưu tiên khoá có kiểu (SO / CO_KHONG / LIET_KE) nếu
     `node scripts/so-hoa-ranh-gioi.mjs --tu-vung` có khoá hợp; không có thì `congDung` / `dungCho` CONG_DUNG.
   - Thêm `ghiChuSoan {ma:"<hs8>", loai:"QUYET_DINH", ghiChu:"Nghĩa hẹp theo SEN: <trích ngắn> ⇒ <điều kiện thêm>."}`.
3. `node scripts/so-hoa-ranh-gioi.mjs --ap-spec=docs/giao-viec/so-tay/spec/<pn6>.json` (KHÔNG sửa tay `data/ho-so/ranh-gioi/`).
4. **Không được làm tăng lỗi**: đếm `node scripts/so-hoa-ranh-gioi.mjs --kiem --pn6=<pn6> | grep -c "✗"` TRƯỚC và SAU; sau ≤ trước,
   và cổng 0/3 phải 0 lỗi. Tăng lỗi ⇒ `git checkout -- <hai tệp>`, ghi "không siết được: <mã lỗi>".
5. Thử hàng (bắt buộc, ghi vào PR):
   `node -e 'const C=require("./lib/ho-so/cong-ranh-gioi");const b=require("./data/ho-so/ranh-gioi/<pn6>.json");console.log(C.thuViDuHang("<pn6>",b,"<hs8>",null,"<hàng>"))'`
   — **hai hàng ĐÚNG** viết như tờ khai thật (tên + quy cách + đóng gói, KHÔNG chép chữ SEN vào mô tả) ⇒ cả hai `thoa:true`;
   một hàng chỉ trùng tên mà sai đặc điểm ⇒ `MAU_THUAN` hoặc `THIEU` (không được `thoa:true`). Hàng đúng mà ra `THIEU` /
   `MAU_THUAN` ⇒ điều kiện thêm là sai, hoàn tác, ghi "không siết được: hàng thật trượt".

## Không được

- Lấy chữ ngoài SEN / chữ biểu / chú giải (không web, không văn bản khác). Không bịa giá trị không có trong `trich`.
- Ngoại lệ #1101: nguồn `vb.<id>.<doanId>` (văn bản quy chuẩn chuyên ngành) ĐƯỢC DÙNG khi đoạn đã có trong `data/van-ban-chuyen-nganh/van-ban.json` và dòng 8 số nằm trong `apDungCho` của đoạn — không tự thêm văn bản mới vào kho trong PR siết SEN (mở issue riêng).
- Sửa `lib/`, `scripts/`, `data/tu-vung/`, tệp ngoài hai tệp của PN6.
- Tự duyệt (`--duyet`), tự merge.

## Nộp

Một PR mỗi lô, tiêu đề `[siết SEN] <tên lô>`, thân PR: bảng `hs8 | siết / không cần / không siết được | điều kiện thêm | thử hàng`.
Chạy `node scripts/test-cong-ranh-gioi.mjs` một lần trước khi mở PR.
