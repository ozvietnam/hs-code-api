# Sổ tay chú giải — LUẬT CHUNG (bắt buộc với CẢ người soạn lẫn người soát)

> Tách từ `docs/giao-viec/so-tay-giao-ngoai.md` ngày 28/10/2026 để mỗi vai chỉ nạp đúng phần cần (progressive disclosure).
> Người soạn đọc thêm [`SOAN-LO.md`](SOAN-LO.md). Người soát đọc thêm [`SOAT-LO.md`](SOAT-LO.md).
> Lịch sử và bài học đầy đủ các vòng: [`../so-tay-giao-ngoai.md`](../so-tay-giao-ngoai.md).

## Mười một luật bắt buộc (máy kiểm phần lớn, phần còn lại người duyệt soát)

1. Chỉ trích từ các nguồn trong tệp `<nhom>.txt`: `nhom<4>.nhom`, `ch<2>.chuong`, `phan<2>.phan`, `sen.*`, `tax.*`, `wco.*`.
2. `trich` là câu chép **nguyên văn** từ đúng nguồn ghi ở `nguon`, ≤ 300 ký tự. Được lược bằng "…". Giữ nguyên lỗi chính tả gốc.
3. `loaiTru` chỉ ghi khi nguồn **nêu đích danh** nhóm đích, và số nhóm phải có trong câu trích. Không tính số nhóm chỉ là ví dụ linh kiện, dải "từ X đến Y" hay "Chương N".
4. `phanBiet`: mã ngoài nhóm phải có trong câu trích.
5. `dieuKienVao` dạng số: số đó phải có trong câu trích.
6. `dong8`: đủ mọi dòng `tax.*` của nhóm. `loaiKhac` máy tự điền theo biểu thuế (tên dòng bắt đầu bằng "Loại khác" → `true`), không cần cân nhắc. Có SEN thì ưu tiên điều kiện từ SEN. Dòng trùng chữ mà nguồn không phân biệt được thì ghi rõ, không đoán.
7. Không ghép hai câu xa nhau thành một kết luận. Không thêm hiểu biết riêng vào `dieuKien`/`text`.
8. Không sửa mã, nguồn hay câu trích để máy kiểm cho qua. Không trích được thì **xoá mục**.
9. (11/10/2026) `cay` do máy sinh — **không soạn**. Chỉ điền `cay.tenDien[]` `{id, tenVi, nguon, trich}` cho nút bị lược (tiêu đề quốc gia 7 số, nhóm một gạch 5 số) hoặc phân nhóm 6 số chưa có tên tiếng Việt, khi nguồn có câu nêu tên đó. Nút đã có tên / dòng 8 số → máy loại.
10. `tieuChi6[]` `{hs6, fact, op, value, donVi, nguon, trich}`: tiêu chí cấp 6 số từ chú giải/SEN/`wco.<6 số>` — không lấy từ `tax.*`; số phải có trong trích. `dong8[].tieuChi` `{fact, op, value, donVi}` tuỳ chọn, cùng luật số.
11. Không ghi `nguonLoai` — máy gán `AI_DA_KIEM`; người soát độc lập mới đổi sang `NGUOI_DUYET`. Sau khi nạp chạy `node scripts/check-cay.mjs --nhom=<nhom> --chi-tiet` để thấy chỗ còn trống của nhóm.

## Ý nghĩa của `dieuKienVao` (quan trọng cho bước nối cổng)

Đó là các sự kiện *mô tả hàng thuộc nhóm*, không phải điều kiện cần. Cổng sau này **không được** loại một nhóm chỉ vì thiếu một `dieuKienVao`. Dùng chúng để gợi ý hỏi người khai, không để chặn.

## Quyết định đã đúc từ các vòng trước (không mở lại)

- **Không lô nào được gộp nếu chưa qua bước soát độc lập** — máy kiểm chỉ chứng minh câu trích có thật trong nguồn, không chứng minh nó nói đúng điều mục khẳng định (vòng 2 xoá 325 + sửa 95 trên ~1.300 mục; vòng 1 soát lại xoá 262 + sửa 281).

## `dieuKienSo` có kiểu theo `tu-vung@1` (30/10/2026, #573 — plan L1-3b)

Thêm, không thay: điều kiện cũ (fact snake_case như `duong_kinh`, op `<=`/`LA`/`HOAC`) giữ nguyên. Điều kiện **có kiểu** khi `fact` là khoá của `data/tu-vung/tu-vung@1.json`; lược đồ và máy kiểm ở `lib/dieu-kien-so.js`.

| Kiểu khoá | Điều kiện | Trích phải có |
|---|---|---|
| `SO` | `{fact, op: <=\|<\|>=\|>, value, donVi}` (đơn vị cùng hệ của khoá) | số + đơn vị (nhận "1.000", "19,5") |
| `CO_KHONG` | `{fact, op: CO\|KHONG}` | một mẫu `cachDoc` của khoá |
| `LIET_KE` | `{fact, op: TRONG, value: [..]}` (mọi giá trị ∈ `giaTriHopLe`) | mẫu `cachDoc` của TỪNG giá trị |
| `TEN_LOAI` / `CONG_DUNG` | `{fact, op: TEN_LOAI\|CONG_DUNG, value: chuỗi \| [chuỗi, …] ("hoặc")}` | chính chữ của từng giá trị |
| `CHAT_LIEU_THEO_VI_TRI` | `{fact: chatLieu, op: LA, value: chuỗi \| [..], viTri?}` | mẫu của vật liệu (+ chữ vị trí nếu ≠ CHINH) |

- `chieu: PHAI_KHONG` (mặc định `PHAI_CO`) chỉ cho `TRONG`/`TEN_LOAI`/`CONG_DUNG`/`LA`; với `CO_KHONG`/`SO` dùng `KHONG` / đảo op.
- Dòng "Loại khác" **trần** không mang điều kiện. Dòng "Loại khác, <vế>" được mang điều kiện có kiểu cho vế riêng.
- Điều kiện của **tiêu đề** (nút 7 số / 5 số có tên) ghi ở `dieuKienNut[]` `{id, dieuKienSo, nguon, trich}`; nguồn `tieuDe.<id>` = tên nguyên văn của biểu thuế Tổng cục (`lib/so-tay.js#nguonTieuDe`). Tiêu đề "Loại khác" trần không ghi.
- So chữ tự do (`TEN_LOAI`, `CONG_DUNG`) là **không tất định**: chotDong8 không chốt bằng nó; bộ chấm hồ sơ (`doiChieuDong8`) gắn `tatDinh: false`.

## Số hoá ranh giới 6→8 số lát 1 — bản nháp + cổng máy (30/10/2026, #577 — plan L1-4a)

- Bản nháp: `data/ho-so/ranh-gioi/<pn6>.json` (`ranh-gioi@1`) — runtime **không** đọc. Công cụ: `scripts/so-hoa-ranh-gioi.mjs`
  (`--goi`, `--tao-nhap`, `--kiem`, `--duyet`, `--tra-ve`, `--ap-dung`, `--tom-tat`; chọn `--pn6=a,b` hoặc `--dot=1..5`). Cổng ở `lib/ho-so/cong-ranh-gioi.js`.
- Chỉ điều kiện **có kiểu** (bảng trên). Cổng 0 hình dạng/nhãn/quy trình; cổng 1 phủ kín theo luật đi tiêu đề có tên; cổng 2 không
  vector biên nào làm hai dòng cùng CO; cổng 3 trích nguyên văn đúng nút (mọi đoạn "…" kể cả đoạn ngắn, đúng thứ tự) + điều kiện khớp
  chữ (cực CO/KHONG, biên ≤/<).
- Nhãn: nháp `AI_DA_KIEM`; chỉ `--duyet` của **phiên khác người soạn**, cổng xanh (và có bảng hiệu chỉnh tiền lệ nếu phân nhóm có cờ)
  mới nâng `CLAUDE_DUYET`; sửa sau duyệt ⇒ cổng 0 đỏ. Chỉ bản DUYET được `--ap-dung` vào `data/so-tay/<nhóm>.json`.
- Không ép qua cổng: không diễn đạt được bằng từ vựng, chữ biểu chồng lấn, tiêu đề bị lược tên ⇒ để đỏ, ghi `ghiChuSoan`.
