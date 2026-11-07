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
2. SEN có nêu **đặc điểm xác định** ngoài cái tên không (công dụng, thành phần, cấu tạo, dạng, thông số)?
   - **Không** (SEN chỉ tả tên loài, nhắc lại tên, kể ví dụ) ⇒ KHÔNG sửa; ghi vào báo cáo "không cần siết".
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
   — một hàng ĐÚNG định nghĩa SEN ⇒ `thoa:true`; một hàng chỉ trùng tên mà sai đặc điểm ⇒ `MAU_THUAN` hoặc `THIEU` (không được `thoa:true`).

## Không được

- Lấy chữ ngoài SEN / chữ biểu / chú giải (không web, không văn bản khác). Không bịa giá trị không có trong `trich`.
- Sửa `lib/`, `scripts/`, `data/tu-vung/`, tệp ngoài hai tệp của PN6.
- Tự duyệt (`--duyet`), tự merge.

## Nộp

Một PR mỗi lô, tiêu đề `[siết SEN] <tên lô>`, thân PR: bảng `hs8 | siết / không cần / không siết được | điều kiện thêm | thử hàng`.
Chạy `node scripts/test-cong-ranh-gioi.mjs` một lần trước khi mở PR.
