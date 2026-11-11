# Soát độc lập L1-4c — lô L7 (55 PN6, chương 23–27)

- Phiên soát: `claude-agent:duyet-L7-20261111#soat-L7` (khác phiên soạn của mọi bản).
- Ngày: 11/11/2026. Bảng soát: [`SOAT-RANH-GIOI.md`](../SOAT-RANH-GIOI.md) mục 0–5.
- Cách làm: mỗi PN6 chạy `--kiem` (cả 55 XANH, không DỪNG) và `--ve`; đặt TỪNG điều kiện (dòng + tiêu đề + tầng không mã) cạnh chữ biểu
  VI + EN; đọc mọi cảnh báo (BO_VE, chongLanVanBan, chongLanTruc + viDuHang/khongCoHangThat, bảng hiệu chỉnh tiền lệ). Nghi vấn về
  bộ so chữ được thử thật bằng `lib/dieu-kien-so.js#danhGiaTrenMap` (vd 270400, 251620, 230910).

## Tóm tắt

| Kết luận | Số PN6 |
|---|---|
| DUYET (đã `--ap-dung`) | 41 |
| TRA_VE | 13 |
| Duyệt được nhưng hoàn `--ap-dung` (làm đỏ `check-so-tay`) — vẫn NHAP | 1 (250100) |
| đỏ — không soát | 0 |
| chờ bảng hiệu chỉnh tiền lệ | 0 |
| chưa soát | 0 |

- Tỉ lệ sai theo PN6: **13/55 = 23,6%**. Theo dòng 8 số bị ảnh hưởng: **16 dòng** (230230 .10; 230910 .10; 240220 .20; 240399 .40
  (+.10 lưu ý); 240412 .10; 240491 .10; 240492 .10; 251512 .10/.20; 251612 .10/.20; 251620 .20; 262190 .10; 270400 .10/.20; 271019 .89).
- Theo kiểu lỗi: SAI TRỤC congDung ghi thành phần/nguồn gốc 5 (230910, 240220, 240399, 240491, 262190); THU HẸP do lấy câu MÔ TẢ của
  SEN làm điều kiện 2 (230230, 240492); định ngữ chung bị tách 2 (240412, 251620); liệt kê gói một chuỗi 1 (270400); vế liên hợp bị bỏ
  1 (271019); sai khoá khi đã có khoá tất định dựng riêng 2 (251512, 251612).
- Cổng 5 báo 2 cảnh báo `cong5-bo-ve` (230641 ×2, 271012 ×1 — tổng 3 vế miễn): cả 3 người soát xác nhận đúng (0 báo oan). Cổng 5 bỏ
  sót 4 lỗi phạm vi vế (240412, 251620, 270400, 271019) — xem "máy tách sai".

## Bảng từng PN6

| PN6 | Kết luận | Ghi chú |
|---|---|---|
| 230120 | DUYET | .10/.20 "Of fish, protein <60% / ≥60% by weight": nguonGocSinhVat TU_CA + hamLuongProtein đúng biên. |
| 230230 | TRA_VE | .10 THU HẸP: chữ "Cám và cám mịn (pollard)" / "Bran and pollard" không có công dụng; thêm congDung "thức ăn" từ câu mô tả SEN ("… được sử dụng làm thức ăn chăn nuôi") ⇒ cám lúa mì dùng việc khác rơi .90. |
| 230240 | DUYET | .10 "Of rice" ↔ tenLoai "thóc gạo". |
| 230310 | DUYET | .10 "Of manioc (cassava) or sago" ↔ mảng hai phương án. |
| 230400 | DUYET | .10 "Defatted soya-bean flour, fit for human consumption"; tiêu đề 2304002 "Soya-bean meal"; .21 "Fit for human consumption". |
| 230641 | DUYET | BO_VE "có hàm lượng axit eruxic thấp" đúng — lặp nguyên văn phân nhóm 2306.41. |
| 230649 | DUYET | "Of other rape/colza seeds": "khác" trỏ 2306.41, không phải anh em ⇒ không cần phanConLai. |
| 230660 | DUYET | "Ground or in the form of pellets" ↔ tenLoai mảng; chưa có khoá tất định cho "dạng viên". |
| 230690 | DUYET | "Of maize (corn) germ". |
| 230910 | TRA_VE | .10 SAI TRỤC: "Chứa thịt" / "Containing meat" (thành phần) ghi congDung "thịt"; thử bộ so: congDung "thức ăn cho chó" ⇒ TRAI ⇒ rơi .90. Thiếu khoá ⇒ THIEU_KHOA_TU_VUNG. |
| 230990 | DUYET | Tiêu đề "Complete feed", .11–.14 "Of a kind suitable for …" (dungCho), .20 mảng 3 tên. |
| 240110 | DUYET | Khoá loaiThuocLaNguyenLieu dựng đúng cho .10/.20/.40/.50. |
| 240120 | DUYET | Như 240110 + .30 Oriental. |
| 240130 | DUYET | "Tobacco stems". |
| 240220 | TRA_VE | .20 SAI TRỤC: "có chứa thành phần từ đinh hương" / "Clove cigarettes" ghi congDung "đinh hương". |
| 240290 | DUYET | .10 mảng 3 tên, .20 "Cigarettes of tobacco substitutes"; "of tobacco substitutes" là phạm vi 2402.90. |
| 240311 | DUYET | dongGoiBanLe CO (khoá ghi rõ 2403.11.10). |
| 240319 | DUYET | Tiêu đề đóng gói bán lẻ, Ang Hoon ×2, .20 phanConLai + congDung đúng chữ. |
| 240391 | DUYET | dongGoiBanLe CO. |
| 240399 | TRA_VE | .40 SAI TRỤC: "khô hoặc không khô" / "whether or not dry" là tuỳ chọn, bị ghi thành giá trị congDung ["hít","ngậm","khô","không khô"]. Lưu ý .10 tenLoai "lá thuốc lá" đòi âm tiết "lá". |
| 240412 | TRA_VE | .10 SUY RỘNG: "E-cigarette liquid or gel" — "E-cigarette" bổ nghĩa cả hai; nháp chỉ gắn dungCho cho "gel" ⇒ mọi dạng lỏng 2404.12 lấn .10. |
| 240419 | DUYET | chuaNguyenLieuThayThe dựng riêng cho .10/.20. |
| 240491 | TRA_VE | .10 SAI TRỤC: "có nicotin" / "Nicotine chewing gum" ghi congDung "nicotin". |
| 240492 | TRA_VE | .10 THU HẸP: "Miếng dán nicotin" / "Nicotine patch"; thêm congDung "cai thuốc lá" từ câu mô tả SEN. |
| 250100 | Duyệt được, hoàn áp dụng (NHAP) | Đối chiếu đạt: .10 thêm daBoSungIot theo TT 08/2021/BNNPTNT, khớp bảng 250100-01/-02 KHONG_LECH. Nhưng `--ap-dung` đưa nguồn `vb.tt08-2021-bnnptnt.d1` vào sổ tay ⇒ `check-so-tay` FAIL `nguon-khong-duoc-trich` ⇒ đã `git checkout` sổ tay 2501 + bản nháp. Cần Claude cho phép nguồn `vb.*` ở sổ tay hoặc đổi cách dẫn nguồn, rồi duyệt lại. |
| 250840 | DUYET | "Fuller's earth". |
| 251010 | DUYET | "Apatite". |
| 251020 | DUYET | "Apatite". |
| 251512 | TRA_VE | .10/.20 SAI KHOÁ: "Dạng khối"/"Dạng tấm" ghi tenLoai so chữ; tu-vung@2 có dangKhoiHoacTamDa [DANG_KHOI, DANG_TAM] dựng riêng cho 2515.12.10/.20 và 2516.12.10/.20; phân nhóm không có Loại khác ⇒ lúc chạy không chốt được. |
| 251612 | TRA_VE | Như 251512. |
| 251620 | TRA_VE | .20 SUY RỘNG: "blocks or slabs of a rectangular (including square) shape" — nháp ["khối","tấm hình chữ nhật"]; thử bộ so: "Đá sa thạch khối thô" THOẢ cả .10 ("Thô") lẫn .20 ("khối") ⇒ .20 lấn .10. "Mới chỉ cắt" không có điều kiện. |
| 251990 | DUYET | "Fused magnesia; dead-burned (sintered) magnesia". |
| 252020 | DUYET | "Of a kind suitable for use in dentistry" ↔ dungCho. |
| 252310 | DUYET | "used in the manufacture of white cement" ↔ congDung. |
| 252329 | DUYET | "Coloured cement". |
| 252620 | DUYET | "Talc powder". |
| 252910 | DUYET | "Potash feldspar; soda feldspar". |
| 253020 | DUYET | "Kieserite", "Epsomite"; không dòng Loại khác. |
| 253090 | DUYET | Zircon micron + congDung "làm chất cản quang". |
| 260111 | DUYET | "Haematite and concentrates". |
| 260112 | DUYET | "Haematite and concentrates". |
| 261400 | DUYET | "Ilmenite ores and concentrates"; khớp bảng 261400-01 KHONG_LECH. |
| 262099 | DUYET | "Slag and hardhead of tin": "thiếc" là điều kiện riêng áp chung. |
| 262190 | TRA_VE | .10 SAI TRỤC: "thu được từ cặn mật củ cải đường …" (nguồn gốc) ghi congDung. |
| 270112 | DUYET | "Coking coal" ↔ tenLoai "Than" + congDung "để luyện cốc". |
| 270300 | DUYET | daDongBanh KHONG/CO; "đã hoặc chưa ép thành kiện" là tuỳ chọn. |
| 270400 | TRA_VE | .10/.20 THU HẸP: tenLoai MỘT chuỗi "Than cốc và than nửa cốc"; thử bộ so: "Than cốc luyện từ than đá" ⇒ TRAI ⇒ than cốc (hàng chính) không tới dòng nào. Sửa: mảng ["Than cốc","than nửa cốc"]. |
| 270799 | DUYET | "Carbon black feedstock". |
| 270900 | DUYET | "Crude petroleum oils", "Condensates". |
| 271012 | DUYET | Toàn bộ tiêu đề + tầng RON + .31–.92; BO_VE đúng; chongLanTruc đọc từng viDuHang/khongCoHangThat — chấp nhận. ghiChuSoan ghi "271012-01/-02 LECH_CHUA_PHAN_XU" nhưng bảng hiện là KHONG_LECH (ghi chú cũ, không ảnh hưởng điều kiện). Lưu ý: white spirit khử thơm (<1%) thoả cả .50 và .60 — chồng lấn chữ biểu thật, lúc chạy hỏi. |
| 271019 | TRA_VE | .89 THU HẸP: "Dầu trung khác và các chế phẩm" / "Other medium oils and preparations" — bỏ đầu ngữ "các chế phẩm" (SEN định nghĩa "dầu và chế phẩm" theo dải cất), không ghi chú. Phần còn lại (chongLanVanBan Q1, chongLanTruc 6 cặp) đã đọc — đạt. |
| 271114 | DUYET | "Ethylene". |
| 271121 | DUYET | "Of a kind used as a motor fuel". |
| 271290 | DUYET | "Paraffin wax". |
| 271500 | DUYET | "Polyurethane tar coatings". |

## Máy tách sai / máy bỏ sót (cho Claude chỉnh `lib/ho-so/tach-ve.js` và cổng)

1. **240412 .10** — `cong5-dinh-ngu-tach` không bắt định ngữ đứng TRƯỚC trong chữ Anh ("E-cigarette liquid or gel"); chữ Việt đặt sau
   ("Dạng lỏng hoặc gel dùng cho thuốc lá điện tử") — máy coi vế "dùng cho thuốc lá điện tử" là "phủ" dù chỉ một phương án HOAC mang nó.
2. **251620 .20** — cả cụm "bằng cưa hoặc cách khác, thành khối hoặc tấm hình chữ nhật (kể cả hình vuông)" bị coi là MỘT vế và "phủ";
   không tách định ngữ chung "hình chữ nhật" của "khối hoặc tấm"; "Mới chỉ cắt" (Merely cut) không được nhận là vế GIỚI HẠN.
3. **270400 .10/.20** — `cong3-liet-ke-trong-mot-chuoi` bỏ qua "Than cốc và than nửa cốc" (EN "Coke and semi-coke": danh từ đầu số ít
   nên rơi vào ngoại lệ "danh từ ghép"). Đây là hai hàng; bộ so đọc thành VÀ.
4. **271019 .89** — đầu ngữ liên hợp thứ hai "và các chế phẩm" (EN "and preparations") không thành vế ⇒ bỏ không bị báo.
5. Đề xuất cổng mới: (a) cảnh báo khi giá trị `congDung` lấy từ vế "chứa/có/thu được từ …" (thành phần, nguồn gốc — 5 lỗi lô này);
   (b) cảnh báo khi mục có nguồn `sen.*` mà điều kiện có chữ không nằm trong chữ biểu `tax.*` của dòng (câu mô tả SEN thành điều kiện —
   230230, 240492); (c) cảnh báo TEN_LOAI khi tu-vung có khoá ghi chú nêu đúng mã dòng (251512, 251612).
6. **250100** — `--ap-dung` nhận nguồn `vb.*` nhưng `check-so-tay` không nhận ⇒ hai máy lệch nhau; cần thống nhất.

## Kiểm sau lô

`node scripts/check-so-tay.mjs` (0 mục không kiểm được nguồn, sau khi hoàn 250100), `node scripts/check-cay.mjs` (0 lỗi lệch cây),
`node scripts/test-so-tay.mjs` (65/65) — đều xanh.
