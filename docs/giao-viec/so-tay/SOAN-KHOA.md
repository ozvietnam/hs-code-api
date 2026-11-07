# Soạn khoá từ vựng tu-vung@2 cho các PN6 còn thiếu khoá (repo /home/user/hs-code-api)

Bối cảnh: mỗi PN6 trong tệp đầu vào có ghi chú `THIEU_KHOA_TU_VUNG` — thợ soạn ranh giới 6→8 số không diễn đạt được một vế của chữ biểu thuế bằng khoá có sẵn. Việc của bạn là thiết kế KHOÁ (hoặc mở rộng khoá @2 sẵn có) để vế đó đọc được. Bạn KHÔNG soạn spec ranh giới (đợt sau làm).

Đầu vào: danh sách ghi chú `THIEU_KHOA_TU_VUNG` nêu trong issue (mỗi ghi chú: mã, khoá đề xuất, chữ biểu nguyên văn và vì sao khoá hiện có không đọc được; gốc ở `docs/giao-viec/so-tay/spec/<pn6>.json`).

## Đọc trước
- `docs/giao-viec/so-tay/LUAT-CHUNG.md` và `QUY-TRINH-SO-HOA.md` (để hiểu khoá được dùng thế nào), `lib/tu-vung.js` (docSo, docCoKhong, docLietKe, docGiaTri).
- Danh sách khoá hiện có: `<thư mục làm việc của bạn>/ten-khoa-hien-co.txt`. Xem chi tiết một khoá: `node scripts/so-hoa-ranh-gioi.mjs --tu-vung --khoa=<khoá>`.
- Mẫu khoá mới đã qua máy kiểm: `khoá lô 19–22 trong data/tu-vung/tu-vung@2.json (vd daGap, doXop, loaiPin, hamLuongMangan)` (CO_KHONG: daGap/daPhu; SO: motChieuTo/doXop; LIET_KE: loaiCaoSu/loaiPin/chatNgamTamTrangPhu).
- Chữ biểu thật của một dòng: `node scripts/so-hoa-ranh-gioi.mjs --goi --pn6=<pn6>` hoặc tra `data/bieu-thue/2026.04.05/bieu-chinh.jsonl.gz` (sheet BT2026, soChuSo 8).

## Việc cho TỪNG ghi chú
1. Thử đọc chữ biểu bằng khoá có sẵn: `node -e 'const T=require("./lib/tu-vung.js");console.log(T.docGiaTri("<khoá>","<chữ biểu>"))'`. Đọc được đúng ý ⇒ không cần khoá mới (ghi nhận trong báo cáo).
2. Không đọc được ⇒ thiết kế khoá:
   - ƯU TIÊN khoá dùng lại được cho nhiều dòng/PN6 và đúng NGHĨA CỦA CHỮ BIỂU (có/không, liệt kê giá trị, số + đơn vị). Không tạo khoá cho một cụm tình cờ; không tạo hai khoá gần nghĩa nhau (gộp).
   - Khoá phải đọc được CHÍNH XÁC chữ biểu nó trích, không đọc thêm (độ chính xác hơn độ phủ: trích sai mã tệ hơn không trích).
   - `kieu` ∈ CO_KHONG (có/không; cần cachDoc.phuDinh, cachDocKhong, cachViet {vi, viPhuDinh}), SO (heDonVi, donViChuan, canNguCanh, cachViet {vi:"… {giaTri} …"}, `docMoRong: true`), LIET_KE (giaTriHopLe + moTaGiaTri[giá trị]{nhanVi,nhanEn,nhanZh,cachDoc{vi,en,zh},cachViet}, `cumDaiThang: true`, cachViet {vi:"{giaTri}"}).
   - Bắt buộc: `khoa` (camelCase, không dấu), `nhanVi`, `nhanEn`, `nhanZh` (chữ Hán), `cachDoc` vi/en/zh đều không rỗng (LIET_KE: mỗi giá trị), `cauHoi` {vi kết thúc "?", zh kết thúc "？"}, `ghiChu` có ít nhất một mã 8 số dạng `4810.13.10 "chữ biểu nguyên văn"` NGOÀI ngoặc đơn (máy sẽ đọc dòng biểu thật đó và PHẢI ra DA_CO; muốn nêu thêm dòng đọc ra nhiều ứng viên thì đặt mã trong ngoặc đơn), `nguonLoai: "AI_DA_KIEM"`.
   - Đơn vị mới (vd cho SO): export `heDonViMoi` từ mô-đun mở rộng (xem dưới).
3. KHÔNG sửa/thêm giá trị cho 53 khoá @1 đóng băng (danh sách ở `<thư mục làm việc của bạn>/khoa-dong-bang-v1.txt`, gồm `chatLieu`, `soPha`, `dungCho`, `tenLoai`, `congDung`…). Nếu ý cần "thêm giá trị vào chatLieu/soPha…" ⇒ tạo khoá @2 MỚI (vd `vatLieuKhac` LIET_KE, `nhomPha`…) hoặc, với khoá @2 sẵn có (vd `loaiSoiDet`, `phuongPhapCheTao`), mở rộng bằng mô-đun.
4. Ghi chú nào KHÔNG phải thiếu khoá (cấu trúc cây, chồng lấn, "tầng không mã", cần phân xử) ⇒ bỏ qua và nêu trong báo cáo, đừng ép.

## Đầu ra

- Khoá mới thêm thẳng vào `data/tu-vung/tu-vung@2.json` (mảng `khoa` + tên vào `chamDuyetDocLap.khoaChuaCham`); mở rộng khoá @2 sẵn có thì sửa đúng khoá đó. Thêm tên khoá + kiểu vào `KHOA_MOI` trong `scripts/test-tu-vung-2.mjs`.
- Bảng đọc thử trong thân PR: `pn6 | mã | khoá | giá trị đọc ra` cho TỪNG ghi chú (giá trị đúng ý chữ biểu, không chỉ "đọc được").
- Ghi chú nào không phải thiếu khoá (cấu trúc cây, chồng lấn, giới hạn bộ máy) ⇒ nêu trong PR, không ép.
- Không soạn lại spec ranh giới trong cùng PR (đợt sau làm). Không tự merge.

## Máy kiểm khoá
`node scripts/test-tu-vung-2.mjs` (thêm khoá mới vào `KHOA_MOI` của tệp này) và `node scripts/check-tu-vung.mjs` phải xanh. Khoá mới vào thẳng `data/tu-vung/tu-vung@2.json` (mảng `khoa`, và `chamDuyetDocLap.khoaChuaCham`).
