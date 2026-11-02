# Gói việc SỔ TAY CHÚ GIẢI cho thợ ngoài (Google Studio) — đợt thử 8 nhóm

> **Bạn là thợ ngoài được thuê soạn sổ tay chú giải HS cho kho tri thức `hs-code-api` (Oz Việt Nam).**
> Làm đúng khuôn dưới đây thì sản phẩm ĐƯỢC DÙNG THẬT trong hệ thống phân loại HS đang chạy.
> Sai khuôn = máy loại toàn bộ mục — công sức mất trắng. Đọc hết file này trước khi làm.

## 0. Nguyên tắc vàng (bất di bất dịch)

1. **Mọi câu trích (`trich`) là chuỗi con NGUYÊN VĂN của nguồn (`nguon`) tương ứng trong GÓI SOẠN.** Không dịch lại, không sửa chính tả, không viết lại. Được lược bằng `" … "` (giữ đúng thứ tự chữ). Trích được máy đối chiếu từng ký tự — **trích bịa = mục bị loại**.
2. **Chỉ trích từ nguồn trong gói soạn** (`goi-soan/<nhóm>.json`, trường `nguon`). Không dùng kiến thức riêng, không tra web, không trích Wikipedia/WCO ngoài gói.
3. **Không bịa điều kiện** để "cho đủ". Mục không có căn cứ nguyên văn ⇒ bỏ hẳn mục đó (thiếu còn sửa được, bịa là hỏng).
4. Một nhóm = một file JSON tên đúng `<nhóm 4 số>.json` (vd `9701.json`).

## 1. Phạm vi đợt này — 8 nhóm

| Nhóm | Tên tóm tắt | Gói soạn |
|---|---|---|
| 9613 | Bản in offset, chưa gấp | `goi-soan/9613.json` (16 nguồn, 10 dòng 8 số) |
| 9614 | Bản in khác, chưa gấp | `goi-soan/9614.json` (5 nguồn, 2 dòng 8 số) |
| 9701 | Nghệ thuật: tranh, vẽ, collage | `goi-soan/9701.json` (15 nguồn, 6 dòng 8 số) |
| 9702 | Bưu thiếp in, lịch | `goi-soan/9702.json` |
| 9703 | Bản khắc gốc, bản in gốc | `goi-soan/9703.json` |
| 9704 | Bức tượng gốc | `goi-soan/9704.json` |
| 9705 | Bộ sưu tập kiểu mẫu có giá trị sưu tầm | `goi-soan/9705.json` |
| 9706 | Đồ cổ trên 100 năm | `goi-soan/9706.json` |

Gói soạn sinh bằng `node scripts/goi-soan-so-tay.mjs --nhom=<4 số>` — chứa: `nguon` (TOÀN BỘ văn bản nguyên văn được phép trích, mỗi mã nguồn một giá trị), `dong8` (danh sách dòng 8 số phải phủ), `huongDan`.

## 2. Định dạng file nộp — từng trường

```json
{
  "nhom": "9701",
  "phamVi": { "text": "<mô tả phạm vi nhóm bằng tiếng Việt, do bạn viết>", "nguon": "<mã nguồn>", "trich": "<chuỗi con nguyên văn>" },
  "dieuKienVao": [ { "fact": "<thanh_vo_dau_cach>", "op": "=", "value": true, "donVi": null, "ngoaiTru": [], "nguon": "<mã>", "trich": "<nguyên văn>" } ],
  "loaiTru": [ { "dieuKien": "<hiện tượng bị loại>", "sangNhom": "<nhóm 4 số đích>", "nguon": "<mã>", "trich": "<nguyên văn>" } ],
  "phanBiet": [ { "hoi": "<câu hỏi yes/no cho người khai>", "neuCo": "<nhóm nếu đúng>", "neuKhong": "<nhóm nếu sai>", "nguon": "<mã>", "trich": "<nguyên văn>" } ],
  "tieuChi6": [ { "hs6": "<6 số>", "fact": "<khoá>", "op": "<=|<|>=|>|=", "value": <số hoặc chuỗi>, "donVi": "<đơn vị như chữ trích>", "nguon": "<mã>", "trich": "<nguyên văn>" } ],
  "dong8": [ { "hs": "<8 số>", "dieuKien": "<điều kiện/tên dòng bằng tiếng Việt>", "loaiKhac": <true chỉ khi tên dòng là 'Loại khác'>, "nguon": "tax.<8 số>", "trich": "<hs> - <tên dòng nguyên văn từ gói>" } ],
  "phienBan": "HS2022",
  "taoBoi": { "provider": "google-studio:<tên model>", "luc": "<ISO timestamp>", "ms": null }
}
```

Quy tắc từng phần:

- **`phamVi`** (bắt buộc): 1 mục — nói nhóm này chứa gì, phạm vi ra sao. `text` do bạn tổng hợp; `trich` nguyên văn từ chú giải nhóm (`nhom<4>.nhom` trong gói) hoặc SEN (`sen.<mã>`).
- **`dieuKienVao`** (bắt buộc nếu nhóm có chú giải định nghĩa): điều kiện để hàng RƠI VÀO nhóm này. `fact` đặt tên khóa gạch_dưới_tiếng_Việt_không_dấu, mô tả bản chất (vd `la_hat_gieo_trong`, `la_tranhtuong_ve`). `op` cố định `"="`, `value` `true`. `ngoaiTru`: mảng chuỗi mô tả các ngoại lệ con (nếu chú giải nói "trừ…").
- **`loaiTru`** (bắt buộc nếu chú giải có "Nhóm này không bao gồm…"): mỗi mục một hiện tượng bị loại + `sangNhom` là nhóm đích mà chú giải chỉ dẫn.
- **`phanBiet`** (nếu có loaiTru): sinh từ loaiTru — mỗi cái một câu hỏi `hoi` nhắm đúng hiện tượng, `neuCo` = `sangNhom`, `neuKhong` = nhóm hiện tại.
- **`tieuChi6`** (tuỳ chọn, chỉ khi nguồn có TIÊU CHÍ SỐ/ĐỊNH LƯỢNG phân biệt các phân nhóm 6 số — vd "trên 100 năm tuổi", "không quá 3 chiếm"): mỗi tiêu chí một mục, `fact` khóa gạch dưới, op so sánh, value + donVi đúng như chữ.
- **`dong8`** (BẮT BUỘC, phủ MỌI dòng 8 số trong `dong8` của gói soạn — đủ số lượng, không thêm không bớt): mỗi dòng một mục. `nguon` luôn `tax.<8 số>`. `trich` = `<hs> - <tên dòng nguyên văn>` (chép từ `dong8[].tenVi` của gói — giữ nguyên mức gạch đầu dòng `-`/`- -`). `dieuKien`: mô tả điều kiện/tên dòng bằng tiếng Việt dễ hiểu; nếu tên dòng chỉ là "Loại khác" thì mô tả bản chất phần còn lại (những gì KHÔNG thuộc các dòng anh em đã nêu) và `loaiKhac: true`.
- **KHÔNG ghi** các trường máy quản: `cay`, `kiemTra`, `nguonLoai`, `boPhan`, `yKienWco`, `bangQuyetDinh` — máy sinh/gắn lúc nạp.

### Ví dụ thật (nhóm 1209 đã duyệt — chép khuôn, không chép nội dung)

```json
{
  "nhom": "1209",
  "phamVi": {
    "text": "Hạt, quả và mầm dùng để gieo trồng; không gồm các sản phẩm được nêu ở phần cuối của Chú giải này…",
    "nguon": "nhom1209.nhom",
    "trich": "Nhóm 12.09 gồm tất cả các loại hạt, quả và mầm dùng để gieo trồng. … Tuy nhiên, nhóm này không bao gồm các sản phẩm như các sản phẩm được nêu ở phần cuối của Chú giải này"
  },
  "dieuKienVao": [
    { "fact": "la_hat_qua_va_mam_dung_de_gieo_trong", "op": "=", "value": true, "donVi": null, "ngoaiTru": [], "nguon": "nhom1209.nhom", "trich": "Nhóm 12.09 gồm tất cả các loại hạt, quả và mầm dùng để gieo trồng." }
  ],
  "loaiTru": [
    { "dieuKien": "Hệ sợi nấm", "sangNhom": "0602", "nguon": "nhom1209.nhom", "trich": "Nhóm này không bao gồm: … (a) Hệ sợi nấm (nhóm 06.02)." }
  ],
  "phanBiet": [
    { "hoi": "Hàng là hệ sợi nấm?", "neuCo": "0602", "neuKhong": "1209", "nguon": "nhom1209.nhom", "trich": "Nhóm này không bao gồm: … (a) Hệ sợi nấm (nhóm 06.02)." }
  ],
  "dong8": [
    { "hs": "12091000", "dieuKien": "Hạt củ cải đường (sugar beet)", "loaiKhac": false, "nguon": "tax.12091000", "trich": "12091000 - Hạt củ cải đường (sugar beet)" },
    { "hs": "12092100", "dieuKien": "Hạt cỏ linh lăng (alfalfa)", "loaiKhac": false, "nguon": "tax.12092100", "trich": "12092100 - - Hạt cỏ linh lăng (alfalfa)" }
  ],
  "phienBan": "HS2022"
}
```

Xem thêm nhóm thật đầy đủ: [`data/so-tay/8482.json`](../../../data/so-tay/8482.json) (nhóm phức tạp hơn — có `tieuChi6`, `boPhan`).

## 3. Tự kiểm trước khi nộp (bắt buộc — chạy được bằng JavaScript thuần)

1. File parse được JSON; `nhom` đúng tên file; có `phamVi`; `dong8` đủ số dòng bằng `dong8` trong gói soạn (so khớp từng `hs`).
2. Mọi mục có `nguon` + `trich`; `trich` LÀ chuỗi con (sau khi bỏ các đoạn `" … "` lược) của `nguon.<mã nguồn>` trong gói — kiểm bằng `nguon[ma].includes(doan)`.
3. Không có trường nào ngoài danh mục mục 2 (trừ `taoBoi`, `phienBan`).
4. `loaiTru`/`phanBiet` đi theo cặp, số lượng bằng nhau.

## 4. Nộp sản phẩm

- Đầu ra: 8 file `9613.json` … `9706.json` (mỗi file một nhóm, đúng tên).
- Gửi cho CEO (tải về/đính kèm). Bên nhận sẽ chạy **cổng máy** (`check-so-tay --raw`) đối chiếu từng trích với nguồn thật: mục đạt giữ nguyên, mục lệch bị loại hoặc trả về sửa. Sau cổng mới nạp vào kho chính — thợ ngoài không tự nạp, không tự duyệt.
- Đợt này là THỬ: đạt ≥ 90% mục qua cổng ⇒ mở rộng giao các lô sau.

## 5. Mẹo theo từng nhóm đợt này

- **9613/9614**: chú giải nhóm phân biệt rõ "offset" vs "in khác"; SEN có thêm chi tiết công nghệ in — dùng `sen.<mã>` cho tiêu chí in offset nếu chú giải nhóm chưa đủ.
- **9701/9703/9704**: chữ chú giải quan trọng nhất là "hoàn toàn do tác giả tạo ra bằng tay" / "bản gốc" — đặt `dieuKienVao.fact` đúng bản chất này.
- **9705/9706**: tiêu chí định lượng có sẵn trong chú giải ("có giá trị sưu tầm", "tuổi trên 100 năm") — mạnh dạn làm `tieuChi6` với `fact` như `tuoi_tren_100_nam`, trích nguyên văn câu chứa con số/tiêu chí.
