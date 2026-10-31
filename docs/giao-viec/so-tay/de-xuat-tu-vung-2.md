# Đề xuất từ vựng `tu-vung@2` — khoá còn thiếu khi số hoá ranh giới 6→8 số

> Ngày 30/10/2026, #577 (L1-4, gia cố cho thợ rẻ). **Chỉ là đề xuất.** `data/tu-vung/tu-vung@1.json` khoá cứng theo bench
> (`bench-may-nghi`, `check-tu-vung`) và KHÔNG được sửa trong lúc số hoá lát 1. Thêm khoá là việc của L1-3a, cần Claude/GĐ
> duyệt, đo lại bench, rồi mới nâng phiên bản.

## Trạng thái: ĐÃ LÊN `tu-vung@2` (30/10/2026, nhánh `feat/tu-vung-2`)

- `data/tu-vung/tu-vung@2.json` = 53 khoá `tu-vung@1` **giữ nguyên** + 7 khoá: `chiHoacChuYeu`, `thietKeChoTreEm`,
  `daNapChuongTrinh` (CO_KHONG), `soLoi`, `soSoi`, `tiLe` (SO), `phuongPhapCheTao` (LIET_KE). Khoá mới mang `nguonLoai:
  AI_DA_KIEM` (`chamDuyetDocLap.khoaChuaCham`) tới khi có phiên chấm độc lập.
- Runtime + công cụ (`lib/tu-vung.js`, `so-hoa-ranh-gioi.mjs --goi/--tu-vung`) nạp `@2`. `tu-vung@1.json` KHÔNG sửa: bench lát 1 khoá băm theo
  `@1` — `check-tu-vung` đo độ phủ trên `@1` + kiểm siêu tập (`kiemSieuTap`); vân tay đọc 53 khoá `@1` ghi trước khi đổi
  (`scripts/fixtures/tu-vung/vang-doc-tu-vung-1.json`) phải khớp (`scripts/test-tu-vung-2.mjs`).
- Hai luật bộ đọc #667/#675 đã vào dữ liệu: `khongPhaiPhuDinh` (thêm ở cuối) và `cauTrucCo.laBoPhan`; hằng trong mã đã xoá.
- `soSoi` đọc đúng chữ "sợi" (8544.42.91 "hai sợi hoặc hơn" = sợi dẫn); khách khai "lõi" thì đọc ở `soLoi` — người soạn cân nhắc
  `HOAC` soSoi/soLoi. `tiLe`: đại lượng tử/mẫu lấy từ câu trích của điều kiện.
- Mở lại các mục `THIEU_KHOA_TU_VUNG` trong bản nháp là việc soạn riêng (job soạn), không làm trong nhánh này.

## Quy tắc cho người soạn (thợ) cho tới khi có `tu-vung@2`

Gặp chữ biểu cần một trong các ý dưới (hoặc bất kỳ ý nào `--tu-vung` không có khoá):

1. **Không tự đặt khoá**, không mượn khoá gần nghĩa (vd không dùng `duongKinhLoi` cho "số lõi"), không dồn ý vào `tenLoai`.
2. Để trống `dieuKienSo` của mục đó.
3. Ghi `ghiChuSoan`: `{"ma": "<mã>", "loai": "THIEU_KHOA_TU_VUNG", "khoaDeXuat": "<tên khoá dưới đây>", "ghiChu": "<trích nguyên văn chữ biểu cần khoá>"}`.
4. Chạy `--ap-spec` / `--kiem`: máy in **DỪNG** và thoát mã 3. Mở PR ở trạng thái DỪNG (mẫu PR trong `QUY-TRINH-SO-HOA.md`) và báo lại trên issue.

Máy giúp nhận ra: `--goi` gắn cờ `nghiThieuKhoa` cho mục có chữ gợi ý (số sợi/lõi, tỉ lệ, "chỉ hoặc chủ yếu", phương pháp chế tạo);
spec dùng khoá không có trong `tu-vung@1` bị từ chối với `THIEU_KHOA_TU_VUNG` (mã thoát 3).

## Khoá đề xuất

| Khoá đề xuất | Kiểu | Đơn vị / giá trị | Chữ biểu gặp ở lát 1 (ví dụ) | Ghi chú thiết kế |
|---|---|---|---|---|
| `soLoi` | `SO` | lõi (số nguyên) | 8544.42.91 "Cáp dữ liệu dẹt có hai sợi hoặc hơn" (sợi = lõi dẫn); cáp nhiều lõi ở 8544.49 | Cần đọc số chữ ("hai", "ba") lẫn số ("2 lõi"); "hai … hoặc hơn" = `>= 2`. |
| `soSoi` | `SO` | sợi | dây/cáp bện, sợi quang (85.44, 90.01) | Tách khỏi `soLoi` nếu chữ biểu phân biệt sợi bện với lõi dẫn; nếu không, gộp một khoá `soLoi`. |
| `tiLe` | `SO` (không thứ nguyên) hoặc cặp `{tu, mau}` | tỉ số, vd `0.1` | "độ dày không quá 1/10 đường kính", "chiều dài gấp … lần" | Cần nói rõ đại lượng tử/mẫu; có thể tách thành khoá riêng theo cặp đại lượng (vd `tiLeDayTrenDuongKinh`). |
| `chiHoacChuYeu` | `CO_KHONG` (kèm `dungCho`) | — | 8414.59.10 "loại chỉ sử dụng hoặc chủ yếu sử dụng để làm mát bộ vi xử lý…" | Hiện chỉ ghi được `dungCho`; "chỉ hoặc chủ yếu" là mức ràng buộc khác "dùng cho" — cổng không được coi hai câu tương đương. |
| `phuongPhapCheTao` | `LIET_KE` | `DUC`, `REN`, `CAN_NONG`, `CAN_NGUOI`, `KEO`, `DAP`, `HAN`, `EP_PHUN`, `THOI` … | "được rèn", "cán nóng", "đúc" (72.xx, 73.xx, 84.83 trục rèn) | `cachDoc` phải phân biệt "gang đúc" (vật liệu) với "được đúc" (phương pháp). |

## Việc cần làm khi lên `tu-vung@2` (L1-3a)

- Thêm khoá + `cachDoc` vi/en/zh + `cauHoi`, `nguonLoai: CLAUDE_DUYET` sau soát độc lập.
- `lib/tu-vung.js#docGiaTri` đọc được số chữ ("hai sợi") và phân số ("1/10").
- Chạy lại `node scripts/check-tu-vung.mjs`, `node scripts/bench-may-nghi.mjs`; bench không được tụt.
- Mở lại các mục `THIEU_KHOA_TU_VUNG` đã ghi trong bản nháp (`grep -l THIEU_KHOA_TU_VUNG data/ho-so/ranh-gioi/*.json`).

## Luật bộ đọc tạm đặt trong `lib/tu-vung.js` — chuyển vào dữ liệu khi lên `tu-vung@2` (#667, #675)

`tu-vung@1` khoá băm nên hai luật dưới nằm ở BỘ ĐỌC (mã), không ở tệp dữ liệu. Khi nâng phiên bản, chuyển chúng vào dữ liệu rồi xoá khỏi mã:

| Luật (hằng trong `lib/tu-vung.js`) | Nội dung | Đích ở `tu-vung@2` |
|---|---|---|
| `CUM_DANH_TU_KHONG` | Cụm danh từ chứa "không" không phải phủ định: "không khí", "không gian", "không trung"; "chân không", "hàng không" chỉ khi chữ ngay sau không phải chữ hay theo sau phủ định (có, phải, được, dùng, chứa, gắn…) | `khongPhaiPhuDinh` (cần cho phép mẫu có lookahead) |
| `CAU_TRUC_CO.laBoPhan` | Cấu trúc "X rời của Y" ⇒ `laBoPhan = true`; trừ "tháo/dạng/để/chưa rời của" (hàng tháo rời, GIR 2(a)) | `laBoPhan.cachDoc` (mẫu cấu trúc) |

Bộ đọc cũng đổi hai điểm không cần dữ liệu: cụm giá trị KHÔNG bị phủ định ("không hoàn chỉnh") không còn được đọc thành giá trị
KHÔNG (bỏ, không đoán); bằng chứng phủ định chỉ gồm chữ phủ định khi giá trị thật sự đến từ phủ định.

## Bổ sung #606 (31/10/2026) — `phuongThucTruyenDan`

Đã thêm vào `tu-vung@2` (không đụng `tu-vung@1` — khoá bench): `phuongThucTruyenDan` LIET_KE `VO_TUYEN` ("sóng vô tuyến", "vô
tuyến", "không dây", "radio"; EN radio, wireless; ZH 无线) | `HUU_TUYEN` ("hữu tuyến", "có dây" trừ dây đeo/da/kéo…; EN wired,
wireline, line system(s), carrier-current/digital line; ZH 有线). Lý do: 851762 .53/.61/.92 "điện báo hoặc điện thoại truyền dẫn
dưới dạng sóng vô tuyến" — định ngữ chung của hai danh từ (EN "radio-telephony or radio-telegraphy") cần một điều kiện riêng.
`nguonLoai` AI_DA_KIEM, nằm trong `chamDuyetDocLap.khoaChuaCham` (chờ chấm độc lập).

