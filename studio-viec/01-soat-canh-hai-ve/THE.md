# Việc 01: soát cạnh loại trừ hai vế

## Vì sao
171 cạnh loại trừ trên main có câu trích của nhóm nguồn không nêu mã nhóm đích. Chúng được xếp bậc 1 (bậc luật). Cần biết cạnh nào đúng, cạnh nào đúng nhưng căn cứ yếu, cạnh nào sai.

## Đầu vào
`studio-viec/01-soat-canh-hai-ve/lo-01.json` … `lo-18.json` trên nhánh `tmp/studio-viec` (đọc qua raw.githubusercontent.com). Mỗi tệp: `canh` (tối đa 10 cạnh: id, nhomNguon, nhomDich, dieuKien, trich, canCuLoaiTru) và `chuGiai` (nguyên văn chú giải từng nhóm). Chỉ dùng văn bản trong tệp, không dùng trí nhớ về biểu thuế.

## Cách xét từng cạnh
Cạnh nói: hàng thoả `dieuKien` KHÔNG thuộc nhóm nguồn mà thuộc nhóm đích.
- `DUNG`: chú giải trong gói nêu hàng đó thuộc nhóm đích, hoặc loại khỏi nhóm nguồn. Phải chép `chungMinh` nguyên văn.
- `CAN_CU_YEU`: có vẻ đúng nhưng trích hiện có không chứng minh, hoặc `dieuKien` rộng hơn câu trích. Nếu trong gói có câu tốt hơn thì ghi `trichTotHon`.
- `SAI`: chú giải nói ngược lại, hoặc `dieuKien` lẫn hàng thuộc nhóm nguồn.
Không đủ chữ để chứng minh thì chọn `CAN_CU_YEU`. Không đoán.

## Đầu ra
Mỗi lô một tệp `data/do-thi/soat-canh-hai-ve/lo-NN.json`:
```json
{"khuon":"soat2ve@1","lo":1,"kq":[{"id":"C5:…","ketLuan":"DUNG","vi":"lý do ngắn","chungMinh":"câu nguyên văn","trichTotHon":{"nguon":"nhom8460.nhom","trich":"câu nguyên văn, tối đa 300 ký tự, được lược bằng …"}}]}
```
`chungMinh` bắt buộc khi DUNG; `trichTotHon` không bắt buộc. Đủ mọi cạnh của lô.

## Xong khi
`node studio-viec/01-soat-canh-hai-ve/kiem.mjs <thư mục kết quả>` báo lỗi 0. Mỗi PR 3 đến 6 lô, gửi từ fork vào `main`, CHỈ thêm tệp dưới `data/do-thi/soat-canh-hai-ve/`. Không sửa `data/so-tay/`.
