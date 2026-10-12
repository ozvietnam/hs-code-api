---
name: bieu-thue-xnk
description: Đọc tệp Excel BIỂU THUẾ XNK do Tổng cục Hải quan soạn (data/oz-export/BIEU-THUE-XNK-<ngày>.xlsx) thành dữ liệu có cấu trúc KHÔNG bỏ sót — mọi sheet, mọi cột (kể cả cột lạ và mọi FTA), mọi dòng (kể cả tiêu đề không mã) — rồi kiểm bảo toàn, đối chiếu tax.json và nối tên tiêu đề vào cây HS. Dùng khi có bản biểu thuế mới (mỗi năm/đợt), khi cần cột FTA (#251) hoặc tên nút ảo của cây (#236).
---

# Skill: đọc biểu thuế XNK không bỏ sót

Tệp này là **dữ liệu gốc** của toàn hệ (`tax.json`, cây HS, FTA, tiêu đề bị lược). Mỗi năm thay đổi ít nhưng mỗi lần đọc sai
là sai cả năm. Vì vậy quy trình là **đọc thô → người xem hồ sơ → trích → máy kiểm → mới dùng**, và máy **từ chối ghi** khi
không chứng minh được bảo toàn.

## Luật bất biến khi đọc

1. **Không bỏ dòng.** Dòng không có mã (tiêu đề chương/nhóm, "- Loại khác:", ghi chú) là dữ liệu — tên nút ảo của cây lấy từ đây.
2. **Không bỏ cột.** Cột không nhận ra → `khoa: null`, giá trị vẫn giữ trong `khac`; muốn dùng thì thêm mẫu vào `LOAI_COT` (`lib/bieu-thue.js`), không sửa tay dữ liệu.
3. **Không ép kiểu.** Thuế suất giữ chuỗi gốc (`"0 (-CN)"`, `"*"`, `"5/0"`); mã giữ chuỗi gốc có chấm + `maChuan` chữ số; dòng 10 số vẫn là 10 số.
4. **Bảo toàn ô là điều kiện ghi.** `oDaGhi === oKhongRong` cho từng sheet; sheet không nhận ra tiêu đề cột phải được khai bỏ qua có ý thức (`--bo-qua-sheet`), không im lặng.
5. **Không sửa tay kết quả.** Sai thì sửa `lib/bieu-thue.js`, thêm ca vào `scripts/test-bieu-thue.mjs`, trích lại.
6. Tệp nguồn ở `data/oz-export/` (gitignored). Kết quả có cấu trúc ở `data/bieu-thue/<phiên bản>/` được commit (biểu thuế là văn bản công khai; nhãn `NGUYEN_VAN`). Bản thô từng ô ở `data/oz-export/bieu-thue-raw/` (gitignored).

## Các bước

```bash
# 0. tệp đúng chỗ, git không thấy
ls -la data/oz-export/BIEU-THUE-XNK-*.xlsx && git check-ignore data/oz-export/BIEU-THUE-XNK-*.xlsx

# 1. KHÁM PHÁ — đọc hồ sơ in ra, KHÔNG chạy tiếp khi chưa trả lời được:
#    - sheet nào là biểu chính, sheet nào phụ lục/chú giải? sheet ẩn có dữ liệu không?
#    - tiêu đề cột ở dòng nào, có đúng là dòng tiêu đề (không phải dòng dữ liệu đầu)?
#    - cột LẠ là gì (đọc chữ tiêu đề nguyên văn) → cần thêm mẫu nhận dạng hay đúng là ghi chú?
#    - số dòng 8 số có gần 11.871 không? số tiêu đề không mã theo gạch có hợp lý không?
#    - BẢO TOÀN Ô có ĐỦ không?
node scripts/bieu-thue/kham-pha.mjs --file=data/oz-export/BIEU-THUE-XNK-2026.04.05.xlsx

# 2. TRÍCH — từ chối khi bảo toàn không đủ hoặc có sheet chưa khai bỏ qua
node scripts/bieu-thue/trich.mjs --file=data/oz-export/BIEU-THUE-XNK-2026.04.05.xlsx --phien-ban=2026.04.05 [--bo-qua-sheet="Phu luc"]

# 3. KIỂM — đỏ khi mất mã so với tax.json, mã trùng, dòng 8 số không mô tả, nút ảo không có trong cây
node scripts/bieu-thue/kiem.mjs --phien-ban=2026.04.05

# 4. So với phiên bản trước (nếu có): cột mới/mất, mã mới/mất — ghi vào mô tả PR
diff <(jq -S '.["<sheet>"].cot|map(.tieuDe)' data/bieu-thue/<cũ>/cot.json) <(jq -S '.["<sheet>"].cot|map(.tieuDe)' data/bieu-thue/2026.04.05/cot.json)

# 5. Commit data/bieu-thue/<phiên bản>/ + mô tả PR có: sha256, số dòng mã/tiêu đề/khác từng sheet, bảo toàn ô, cột lạ đã quyết ra sao, mã thiếu/thừa
```

## Kết quả lần đầu — BIEU-THUE-XNK-2026.04.05.xlsx (12/10/2026)

39 sheet. Sheet chính `BT2026` (100 cột): 15.115 dòng mã, 12.000 dòng 8 số (11.871/11.871 mã `tax.json` có mặt; 78 "trùng"
là chương 98 xuất hiện hai lần — bình thường), 4.780 dòng tiêu đề không mã, bảo toàn 921.562/921.562 ô. 27 mức thuế + cột
"Văn bản"/"Ngày hiệu lực" kèm TỪNG mức (RCEP A–F có cột căn cứ không tiêu đề → suy từ giá trị, `suyTuGiaTri`). 30 sheet FTA
theo năm/mốc (ATIGA 2022–2027, CPTPP (I)–(VII), VJEPA theo khoảng ngày…), biểu XK, CU/MOI (mã cũ/mới). 8 sheet phụ lục
(BIA, HT, BANG, 6QT, PL1, PL2, EU, DB) không có tiêu đề cột → bỏ qua có ý thức, vẫn nằm trong bản thô.
Tên nút: 2.160/2.194 nút ảo của cây + 1.046 phân nhóm 6 số có tên tiếng Việt nguyên văn → `lib/hs-tree.js` tự nạp.

## Sau khi có dữ liệu — ai dùng gì

- **#251 thuế FTA + loại C/O**: `dong.json[].thue` có mọi cột FTA chuỗi gốc → `lib/fta.js` đọc nghĩa (khuôn `lib/acfta.js`: loại trừ nước, nhiều mức → `needsReview`). Không chép FTA vào `tax.json` bằng tay.
- **#236 tên nút ảo**: `ten-nut.json` (`doTinCay: KHOP_TAP` = tập lá dưới tiêu đề khớp đúng tập lá của nút) → `lib/hs-tree.js` **đã** nạp làm `tenVi` nguyên văn cho nhóm một gạch / tiêu đề quốc gia / phân nhóm 6 số (`tenNguon: "bieu-thue@<phiên bản>"`); sổ tay `cay.tenDien` chỉ còn cho 34 nút biểu thuế cũng không đặt tên.
- **`tax.json`**: KHÔNG thay bằng tệp này trực tiếp; đối chiếu `doi-chieu-tax.json` rồi quyết định cập nhật qua `scripts/tariff-upload-xlsx.mjs`/phiên bản biểu thuế như trước.

## Khi tệp năm sau khác cấu trúc

`kham-pha` sẽ cho thấy cột LẠ / tiêu đề cột lệch dòng / sheet mới. Thêm mẫu vào `LOAI_COT`, thêm ca vào `scripts/test-bieu-thue.mjs`
(sổ Excel giả trong test mô phỏng đúng kiểu lệch đó), chạy `npm test`, rồi mới trích. Không "sửa cho qua" bằng `--ep`.
