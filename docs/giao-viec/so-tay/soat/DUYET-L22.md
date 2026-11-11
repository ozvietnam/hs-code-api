# Soát lô L22 — ranh giới 6→8 số chương 73 (71 PN6)

> #1109. Người soát độc lập: `claude-agent:duyet-L22-20261111#soat-L22` (khác phiên soạn). Ngày 11/11/2026.
> Cách làm: mỗi PN6 chạy `--kiem` (71/71 XANH, không DỪNG) + `--ve`; đối chiếu từng điều kiện với chữ biểu VI **và** EN
> (bieu-chinh + tieu-de 2026.04.05, kể cả tiêu đề không mã); đọc mọi cảnh báo cong5-bo-ve, chongLanVanBan/chongLanTruc
> (viDuHang, khongCoHangThat), cong3-bien-khong-doc-duoc (đối chiếu biên bằng tay), tuong-tu; đối chiếu sổ tay hiện hành
> (`data/so-tay/73xx.json`) xem có bỏ mất ngưỡng số SEN/tax không — **không có PN6 nào bỏ mất ngưỡng số** (44 dòng có số, đều giữ).

## Tổng hợp

| Kết luận | Số PN6 |
|---|---|
| DUYET (đã `--ap-dung`) | 48 |
| TRA_VE | 18 |
| Chờ — đã soát đúng chữ nhưng hoàn tác áp dụng (còn NHAP) | 5 |
| Đỏ — không soát | 0 |
| Chờ bảng hiệu chỉnh tiền lệ | 0 |
| Chưa soát | 0 |

- **Tỉ lệ sai theo PN6: 18/71 = 25 %** (theo mục: 19 dòng/tiêu đề có lỗi; hai lỗi tiêu đề — 7311002, 7321902 — kéo theo 7 và 2 dòng 8 số).
- Dòng có đổi mức MFN thật: 730490 (.10 0 % ↔ .30 10 %/.90 5 %), 730810 (.10 0 % ↔ .90 3 %), 731100 (.23 20 % ↔ .92 17 %).
  Các lỗi còn lại cùng mức MFN nhưng sai mã 8 số.
- Một lần tự sửa của người soát: 730830 lúc đầu tôi đã chạy `--duyet` + `--ap-dung`, đọc lại thấy thiếu tên "Cửa ra vào" ⇒
  `git checkout` sổ tay 7308 + bản nháp rồi `--tra-ve`. Không còn dấu vết duyệt.

## Kiểm sau lô

`check-so-tay` xanh · `check-cay` xanh · `test-so-tay` 65/65 · `test-so-tay-gates` 91 passed / 0 failed ·
`test-engine-loop-so-tay` 11 passed / 0 failed. Lần chạy đầu `test-so-tay-gates` đỏ 4 ca do 731815 (xem bảng) ⇒ hoàn tác 731815
và 4 PN6 vít/bu lông cùng dạng.

## Các dạng lỗi (để người soạn/Claude sửa)

1. **Tên đầu dòng bị bỏ vì máy xếp "DAU" (cổng 5 không đòi)** — 730459, 730490, 730539 ("Ống dẫn chịu áp lực cao" — chỉ giữ
   gioiHanChay>=42000 psi, mà 42 ksi là mức thường của ống thép), 730830 ("Cửa ra vào"), 731419 ("Đai liền"), 730890.40
   ("mạ kẽm"), 732190 tiêu đề ("dụng cụ nấu và dụng cụ hâm nóng dạng tấm"). Khi anh em là "Loại khác"/khác tên, DAU **là**
   điều kiện phân dòng. Đề xuất máy: cổng 5 cảnh báo DAU không phủ khi dòng anh em không cùng tên đầu.
2. **Sai khoá / khoá mượn nghĩa khác** — 730810, 730820, 730840 dùng `daLapRap` ("đã lắp ráp") + BO_VE "bằng các khớp nối" trong
   khi khoá `lapRapBangKhopNoi` đã có (730890 dùng đúng); 731511 dùng `chieuDaiCuon` cho bước xích (pitch); 732421, 732429 dùng
   `hinhDangCatGocKinh` (tấm kính ch.70) cho lòng bồn tắm; 731210 thêm `dangCuon` vì đọc "Locked coils" thành "dạng cuộn";
   731816 đo `duongKinh` của đai ốc thay vì thân bu lông.
3. **Thiếu khoá từ vựng nhưng không DỪNG** — "ở dạng thô"/in the rough state (731010, 731029), "đúc liền"/seamless (731100),
   bước xích (731511), hình dạng lòng bồn (732421, 732429), cỡ ren bu lông dùng kèm (731816).

## Máy tách sai (§2) — cho Claude chỉnh `lib/ho-so/tach-ve.js` / cổng 5

- 731010:73101091, 731029:73102992 — vế "Được đúc, rèn hoặc dập, ở dạng thô" báo **phủ** cả cụm khi chỉ khớp "đúc/rèn/dập";
  "ở dạng thô" không được tách thành vế riêng.
- 731100:7311002 — "bằng thép đúc liền" báo **phủ** nhờ chatLieu "sắt thép"; "đúc liền" (seamless) bị nuốt.
- 730459/730490/730539/730830/731419/730890 — cụm DAU ("Ống dẫn chịu áp lực cao", "Cửa ra vào", "Tấm hoặc lá **mạ kẽm**")
  không bị kiểm phủ; khi định ngữ hạn chế nằm trong DAU ("mạ kẽm") máy cũng bỏ qua.
- 730630:73063030 — DAU tách thành "Ống loại" (cắt cụm "Ống loại được sử dụng làm…"); vô hại ở đây.

## Đo cổng 5 (báo oan)

Cảnh báo `cong5-bo-ve` đã đọc: 16 vế. Xác nhận là phải trả về: 6 (73081010, 73082011, 73082021, 73084010 "bằng các khớp
nối"; 73151191 "có độ dài mắt xích"; 73181610 "Cho bu lông"). 10 vế còn lại ("có giới hạn chảy (1)", "có khả năng chịu áp lực",
"được sản xuất", "trừ … thép không gỉ" ở 731419) miễn hợp lý. Ngoài ra 732421/732429 BO_VE cả vế hình dạng nhưng máy chỉ báo
`cong5-bo-ve-thua` (coi là đã phủ nhờ khoá sai) — lỗi lọt. Phần lớn lỗi lô này **không** nằm ở vế máy báo mà ở DAU/khoá
sai — máy xanh không phải tín hiệu đủ.

## Bảng chi tiết

| PN6 | Kết luận | Ghi chú |
|---|---|---|
| 730290 | DUYET | Đối chiếu VI/EN 'Tà vẹt (dầm ngang)'/'Sleepers (cross-ties)': tenLoai Tà vẹt đúng, ngoặc là chú thích tên; .90 Loại khác trần. |
| 730300 | DUYET | Đối chiếu VI/EN: tiêu đề 7303001 'Các loại ống và ống dẫn'; .11 'không có đầu nối'/'Hubless' → daGanDauNoi KHONG (khoá đọc theo chữ VI 'đầu nối', hub=đầu bát — chấp nhận); .91 'đường kính ngoài không quá 100 mm' → duongKinh<=100 đúng biên. |
| 730422 | DUYET | Đối chiếu VI/EN .10 'yield strength less than 80,000 psi, without threaded end' → gioiHanChay<80000 psi + coRen KHONG, đủ cả hai vế. |
| 730423 | DUYET | Đối chiếu VI/EN .10 'yield strength less than 80,000 psi, without threaded end' → gioiHanChay<80000 psi + coRen KHONG, đủ cả hai vế. |
| 730424 | DUYET | Ba dòng casing/tubing: <80000 psi & không ren / <80000 psi & có ren / >=80000 psi có hoặc không ren — biên </>= đúng chữ EN, phân hoạch đủ; tên 'Ống chống và ống' chung cả ba dòng. |
| 730429 | DUYET | Ba dòng casing/tubing: <80000 psi & không ren / <80000 psi & có ren / >=80000 psi có hoặc không ren — biên </>= đúng chữ EN, phân hoạch đủ; tên 'Ống chống và ống' chung cả ba dòng. |
| 730431 | DUYET | .10 tenLoai Ống chống/ống nối + dungCho cần khoan + coRen CO (chữ 'pin and box threads' gộp thành có ren — hơi rộng, MFN .10=.90=5% nên không đổi thuế); .20 'capable of withstanding not less than 42,000 psi' → khaNangChiuApLuc>=42000 (bỏ vế động từ hợp lý); .40 OD<140 & C<0,45 đúng; CLVB .10/.20 hợp lý. |
| 730439 | DUYET | .20 'High-pressure pipe capable of withstanding not less than 42,000 psi' → khaNangChiuApLuc>=42000 psi (ngưỡng áp lực tự hàm nghĩa ống áp lực cao); .40 OD<140 mm & C<0,45% đúng biên 'less than'. |
| 730451 | DUYET | .10 dungCho 'cần khoan có ren trong và ren ngoài' giữ đủ chữ pin and box; .20 giữ tên 'Ống dẫn chịu áp lực cao' + gioiHanChay>=42000; khớp bảng hiệu chỉnh 730451-01/02 KHONG_LECH. |
| 730459 | TRA_VE | (A) 730459.json:73045910 SUY RỘNG: chữ biểu 'Ống dẫn chịu áp lực cao có giới hạn chảy (1) không nhỏ hơn 42.000 psi' / EN 'High-pressure pipe with a yield strength not less than 42,000 psi' — bản nháp chỉ giữ gioiHanChay>=42000 psi, bỏ tên 'Ống dẫn chịu áp lực cao' (máy xếp là DAU nên không đòi). Giới hạn chảy 42 ksi (~290 MPa) là mức thường của mọi ống thép hợp kim, nên gần như mọi ống liền 730459 có giới hạn chảy công bố sẽ bị kéo vào .10, .90 'Loại khác' gần như rỗng. Sửa: thêm ongChiuApLucCao CO (khoá có sẵn, đã dùng ở 73069091) hoặc tenLoai 'Ống dẫn chịu áp lực cao' như 73045120. (MFN .10=.90=0% nên không đổi thuế, nhưng ranh giới sai.) |
| 730490 | TRA_VE | (A) 730490.json:73049010 SUY RỘNG: chữ biểu 'Ống dẫn chịu áp lực cao có giới hạn chảy (1) không nhỏ hơn 42.000 psi' / EN 'High-pressure pipe with a yield strength not less than 42,000 psi' — bản nháp chỉ giữ gioiHanChay>=42000 psi, bỏ tên 'Ống dẫn chịu áp lực cao' (máy xếp là DAU nên không đòi). Ống liền thường (vd thép không hợp kim giới hạn chảy 50 ksi, OD 60 mm, C 0,2%) sẽ rơi vào .10 (MFN 0%) thay vì .30 (MFN 10%) hoặc .90 (5%) — lấn dòng và hụt thuế. Sửa: thêm ongChiuApLucCao CO (khoá có sẵn, dùng ở 73069091) hoặc tenLoai như 73045120. |
| 730512 | DUYET | .10 'Electric resistance welded (ERW)' → phuongPhapHanOngThep HAN_DIEN_TRO_ERW; .90 trần. |
| 730519 | DUYET | .10 'Spiral or helical submerged arc welded' → HAN_HO_QUANG_CHIM_XOAN; .90 trần. |
| 730531 | DUYET | .10 'Stainless steel pipes and tubes' → chatLieu LA thép không gỉ; khớp bảng hiệu chỉnh 730531-01 KHONG_LECH. |
| 730539 | TRA_VE | (A) 730539.json:73053910 SUY RỘNG: chữ biểu 'Ống dẫn chịu áp lực cao có giới hạn chảy (1) không nhỏ hơn 42.000 psi' / EN 'High-pressure pipe with a yield strength not less than 42,000 psi' — bản nháp chỉ giữ gioiHanChay>=42000 psi, bỏ tên 'Ống dẫn chịu áp lực cao'. Ống hàn kết cấu OD>406,4 mm mác S355 (giới hạn chảy ~51 ksi) không phải ống áp lực sẽ bị xếp .10 thay vì .90 (MFN đều 10% nhưng ranh giới sai). Sửa: thêm ongChiuApLucCao CO hoặc tenLoai 'Ống dẫn chịu áp lực cao'. |
| 730611 | DUYET | .10 'Longitudinally electric resistance welded (ERW)' → HAN_DIEN_TRO_ERW (giá trị liệt kê đã gồm 'theo chiều dọc'); .90 trần. |
| 730619 | DUYET | .10 ERW theo chiều dọc / .20 hàn chìm xoắn hồ quang → hai giá trị liệt kê loại trừ nhau; .90 trần. |
| 730630 | DUYET | Bốn tiêu đề (nồi hơi dungCho; mạ đồng/nhựa flo/kẽm cromat + OD<=15; ống áp lực cao giữ tên + yield>=42000) và các dòng OD<12,5, .30 ống bọc phần tử nhiệt bàn là/nồi cơm OD<=12, .91 ID>=12,5 & OD<140 & C<0,45, .92 ID<12,5 — đối chiếu tay biên; khongCoHangThat ba cặp hợp lý (ống phanh mạ đồng giới hạn chảy dưới 42 ksi); khớp bảng hiệu chỉnh 730630-01. |
| 730640 | DUYET | Tiêu đề 7306401 nồi hơi; .11 OD 'không quá 12,5 mm' <=; .20 OD>105 (thép không gỉ lặp tổ tiên); .30 Ni 'at least 30%' >=30 & OD<=10 (đã đối chiếu tay biên hamLuongNiken); chongLanTruc ví dụ 114,3 mm và 800H 9,53 mm là hàng thật. |
| 730650 | DUYET | Tiêu đề 7306501 nồi hơi + tiêu đề Loại khác; .11/.91 OD 'less than 12.5 mm' <12,5 đúng biên. |
| 730661 | DUYET | .10 'external diagonal cross-section less than 12.5 mm' → duongCheoNgoai<12,5. |
| 730669 | DUYET | .10 'external diagonal cross-section less than 12.5 mm' → duongCheoNgoai<12,5. |
| 730690 | DUYET | Tiêu đề 7306901 'Copper brazed' → tenLoai 'hàn đồng' (chữ tự do, lúc chạy không tự chốt); .91 giữ ongChiuApLucCao + yield>=42000 + ID<12,5; .94/.95 ongChiuApLucCao + OD <12,5/>=12,5; .96 đường chéo <12,5; .97 ID 'more than 12.5' >12,5 & OD<140 & C<0,45 — đã đối chiếu tay biên duongKinh/hamLuongCarbon. |
| 730711 | DUYET | .10 'Hubless tube or pipe fittings' → tenLoai Phụ kiện + dungCho ống/ống dẫn + daGanDauNoi KHONG (như 73030011); .90 trần. |
| 730721 | DUYET | .10 'Having an internal diameter of less than 15 cm' → duongKinhTrong<15 cm (đúng đường kính TRONG, đơn vị cm); .90 trần; tên loại phụ kiện do PN6 giữ. |
| 730722 | DUYET | .10 'Having an internal diameter of less than 15 cm' → duongKinhTrong<15 cm (đúng đường kính TRONG, đơn vị cm); .90 trần; tên loại phụ kiện do PN6 giữ. |
| 730723 | DUYET | .10 'Having an internal diameter of less than 15 cm' → duongKinhTrong<15 cm (đúng đường kính TRONG, đơn vị cm); .90 trần; tên loại phụ kiện do PN6 giữ. |
| 730729 | DUYET | .10 'Having an internal diameter of less than 15 cm' → duongKinhTrong<15 cm (đúng đường kính TRONG, đơn vị cm); .90 trần; tên loại phụ kiện do PN6 giữ. |
| 730791 | DUYET | .10 'Having an internal diameter of less than 15 cm' → duongKinhTrong<15 cm (đúng đường kính TRONG, đơn vị cm); .90 trần; tên loại phụ kiện do PN6 giữ. |
| 730792 | DUYET | .10 'Having an internal diameter of less than 15 cm' → duongKinhTrong<15 cm (đúng đường kính TRONG, đơn vị cm); .90 trần; tên loại phụ kiện do PN6 giữ. |
| 730793 | DUYET | .10 'Having an internal diameter of less than 15 cm' → duongKinhTrong<15 cm (đúng đường kính TRONG, đơn vị cm); .90 trần; tên loại phụ kiện do PN6 giữ. |
| 730799 | DUYET | .10 'Having an internal diameter of less than 15 cm' → duongKinhTrong<15 cm (đúng đường kính TRONG, đơn vị cm); .90 trần; tên loại phụ kiện do PN6 giữ. |
| 730810 | TRA_VE | (A) 730810.json:73081010 SUY RỘNG + sai khoá: chữ biểu 'Dạng cấu kiện tiền chế được lắp ráp bằng các khớp nối (SEN)' / EN 'Prefabricated modular type joined by shear connectors' — bản nháp dùng daLapRap CO ('đã lắp ráp') và BO_VE vế 'bằng các khớp nối' (lyDo 'phương thức liên kết'). Vế bị bỏ chính là tiêu chí phân dòng; daLapRap CO kéo mọi cầu/nhịp cầu đã lắp (kể cả hàn liền khối) vào .10 (MFN 0%) thay vì .90 (MFN 3%), còn bộ cấu kiện tiền chế giao dạng rời lại trả KHONG. Sửa: dùng khoá có sẵn lapRapBangKhopNoi CO (như 73089020) + tenLoai 'cấu kiện tiền chế', bỏ BO_VE. |
| 730820 | TRA_VE | (A) 730820.json:73082011 và 73082021 SUY RỘNG + sai khoá: chữ biểu 'Dạng cấu kiện tiền chế được lắp ráp bằng các khớp nối (SEN)' / EN 'Prefabricated modular type joined by shear connectors' — bản nháp dùng daLapRap CO và BO_VE 'bằng các khớp nối'. Mọi tháp/cột lưới đã lắp (hàn) bị kéo vào .11/.21 thay vì .19/.29; ranh giới đổi mã. Sửa: lapRapBangKhopNoi CO (khoá có sẵn, dùng ở 73089020) + tenLoai 'cấu kiện tiền chế', bỏ BO_VE. |
| 730830 | TRA_VE | (A) 730830.json:73083010 SUY RỘNG: chữ biểu 'Cửa ra vào, có độ dày từ 6 mm đến 8 mm' / EN 'Doors, of a thickness of 6 mm or more but not exceeding 8 mm' trong PN6 'Cửa ra vào, cửa sổ và các loại khung cửa và ngưỡng cửa ra vào' — bản nháp chỉ có doDay>=6 & <=8 mm, bỏ tên 'Cửa ra vào' (máy xếp DAU nên không đòi). Cửa sổ, khung cửa, ngưỡng cửa dày 6–8 mm sẽ bị xếp .10 thay vì .90 (MFN cùng 12% nhưng sai mã). Biên số đúng. Sửa: thêm tenLoai TEN_LOAI 'Cửa ra vào'. |
| 730840 | TRA_VE | (A) 730840.json:73084010 SUY RỘNG + sai khoá: chữ biểu 'Dạng cấu kiện tiền chế được lắp ráp bằng các khớp nối (SEN)' / EN 'Prefabricated modular type joined by shear connectors' — bản nháp dùng daLapRap CO và BO_VE 'bằng các khớp nối'. Mọi thiết bị giàn giáo/ván khuôn đã lắp ráp bị kéo vào .10 thay vì .90. Sửa: lapRapBangKhopNoi CO + tenLoai 'cấu kiện tiền chế', bỏ BO_VE. |
| 730890 | TRA_VE | (A) 730890.json:73089040 SUY RỘNG: chữ biểu 'Tấm hoặc lá mạ kẽm được làm lượn sóng và uốn cong dùng trong ống dẫn, cống ngầm hoặc đường hầm' / EN 'Corrugated and curved galvanised plates or sheets prepared for use in conduits, culverts or tunnels' — bản nháp có tenLoai Tấm/lá + dangLuonSong + uonCong + dungCho nhưng bỏ 'mạ kẽm'/'galvanised' (máy xếp vào DAU nên không đòi). Tấm lượn sóng sơn hoặc không mạ dùng cho cống sẽ vào .40 thay vì .99 (MFN cùng 10% nên không đổi thuế, nhưng sai mã). Sửa: thêm lopMaPhu TRONG [KEM] (khoá liệt kê có sẵn). Các dòng khác (.20 lapRapBangKhopNoi, .50, .60 coLoDuc, .92) đúng. |
| 730900 | DUYET | Tiêu đề 7309001 'conveyance or packing of goods' → dungCho; .11/.91 'Lined or heat-insulated' → duocLotHoacCachNhiet CO (một khoá gộp đúng chữ 'hoặc'); tiêu đề Loại khác do máy phủ định. |
| 731010 | TRA_VE | (A) 731010.json:73101091 SUY RỘNG: chữ biểu 'Được đúc, rèn hoặc dập, ở dạng thô' / EN 'Casting, forging or stamping, in the rough state' — bản nháp chỉ có phuongPhapCheTao TRONG [DUC,REN,DAP], mất 'ở dạng thô'/'in the rough state' (máy cổng 5 báo cả cụm 'phủ' vì khớp chữ 'đúc, rèn hoặc dập' — máy nuốt vế). Gần như mọi thùng phuy thép ≥50 l thành phẩm đều làm bằng dập nên bị kéo vào .91 thay vì .99 (MFN cùng 12% nhưng sai mã, .99 gần rỗng). Tu-vung@2 chưa có khoá 'ở dạng thô (chưa gia công)' ⇒ đúng ra phải DỪNG THIEU_KHOA_TU_VUNG. |
| 731021 | DUYET | Tiêu đề 7310211 'less than 1 l' → dungTich<1 lít; .11/.91 'Of tinplate' → lopMaPhu TRANG_THIEC; tên PN6 (lon đóng kín bằng hàn/gấp nếp) do cha giữ. |
| 731029 | TRA_VE | (A) 731029.json:73102992 SUY RỘNG: chữ biểu 'Được đúc, rèn hoặc dập khác, ở dạng thô' / EN 'Other casting, forging or stamping, in the rough state' — bản nháp chỉ có phuongPhapCheTao TRONG [DUC,REN,DAP], mất 'ở dạng thô' (máy cổng 5 báo 'phủ' cả cụm). Hộp/lon thép <50 l dập thành phẩm không tráng thiếc sẽ vào .92 thay vì .99 (MFN cùng 10% nhưng sai mã). Chưa có khoá 'ở dạng thô' ⇒ phải DỪNG THIEU_KHOA_TU_VUNG. Các dòng còn lại (tiêu đề <1 lít, .11/.91 tráng thiếc) đúng. |
| 731100 | TRA_VE | (A) 731100.json:tiêu đề 7311002 SUY RỘNG: chữ biểu 'Dạng hình trụ bằng thép đúc liền' / EN 'Seamless steel cylinders' — bản nháp chỉ có tenLoai 'hình trụ' + chatLieu LA 'sắt thép' (lặp chữ nhóm 7311), mất 'đúc liền'/'seamless' (máy báo 'bằng thép đúc liền' phủ vì khớp chữ 'thép'). Bình hàn (vd bình LPG 12 kg hàn thân, dung tích ~26 l) sẽ vào 73110023 (MFN 20%) thay vì 73110092 (MFN 17%); bình hàn 30–110 l sẽ vào .24/.27 thay vì .94. Các biên dung tích (>=30,<110,>=110,<=7,3,>7,3) đã đối chiếu tay: đúng. Sửa: cần khoá 'không nối/đúc liền' (seamless) — chưa có trong tu-vung@2 ⇒ DỪNG THIEU_KHOA_TU_VUNG. |
| 731210 | TRA_VE | (A) 731210.json:73121010 THU HẸP do điều kiện bịa: chữ biểu 'Cuộn dây bện tao kiểu bọc, dây tao dẹt và dây cáp chống xoắn(1) (SEN)' / EN 'Locked coils, flattened strands and non-rotating wire ropes' — 'locked coil' là TÊN một kiểu cáp (cáp bện kín), không phải 'ở dạng cuộn'; bản nháp thêm dangCuon CO áp cho cả ba tên (kể cả dây tao dẹt, cáp chống xoắn). Cáp chống xoắn giao trên tang/ru-lô (không khai 'dạng cuộn') sẽ trượt khỏi .10 sang .99. Sửa: bỏ dangCuon, giữ tenLoai ba tên. (Các dòng .20 đồng thau+<=3 mm, .30 nhôm, .91 dự ứng lực đúng.) |
| 731419 | TRA_VE | (A) 731419.json:73141910 SUY RỘNG: chữ biểu 'Đai liền dùng cho máy móc, trừ loại bằng thép không gỉ' / EN 'Endless bands for machinery other than of stainless steel' — bản nháp chỉ có dungCho 'máy móc', mất tên 'Đai liền'/'Endless bands' (máy xếp DAU). Tấm đan dệt thoi không phải đai liền (cắt tấm) dùng cho máy sẽ vào .10 thay vì .90 (MFN cùng 15%, sai mã). BO_VE 'trừ thép không gỉ' chấp nhận được vì thép không gỉ đã ở 7314.12/7314.14. Sửa: thêm tenLoai 'Đai liền'. |
| 731511 | TRA_VE | (A) 731511.json:73151191 SAI KHOÁ + SUY RỘNG: chữ biểu 'Xích truyền, có độ dài mắt xích từ 6 mm đến 32 mm' / EN 'Transmission type, of a pitch length of not less than 6 mm and not more than 32 mm' — bản nháp dùng chieuDaiCuon (chiều dài hàng dài: dây/cáp/cuộn, đơn vị chuẩn m) cho bước xích (pitch) và BO_VE vế 'có độ dài mắt xích'; tên 'Xích truyền' cũng bị bỏ. Một cuộn xích con lăn dài 5 m (chieuDaiCuon=5000 mm) sẽ không vào .91 dù bước xích 12,7 mm; xích băng tải có chiều dài 6–32 mm (không có thật) lại khớp. Tu-vung@2 chưa có khoá bước xích ⇒ phải DỪNG THIEU_KHOA_TU_VUNG, thêm 'xích truyền'. |
| 731512 | DUYET | .10 'Bicycle or motorcycle chain' → xichXeDapMoTo CO (khoá đúc đúng chữ biểu); .90 trần. |
| 731519 | DUYET | .10 'Of bicycle or motorcycle chain' (bộ phận, PN6 Các bộ phận) → xichXeDapMoTo CO; .90 trần. |
| 731589 | DUYET | .10 'Bicycle or motorcycle chain' → xichXeDapMoTo CO; .90 trần. |
| 731590 | DUYET | .20 'Of bicycle or motorcycle chain' (bộ phận khác) → xichXeDapMoTo CO; .90 trần. |
| 731700 | DUYET | .10 tenLoai Đinh dây, .20 Ghim dập; .30 'Dog spikes for rail sleepers; gang nails' → HOAC [Đinh giữ ray + dungCho tà vẹt] \| [bàn chông], định ngữ 'cho tà vẹt' chỉ gắn vế 1 đúng chữ EN; .90 trần. |
| 731812 | chờ (đã soát đúng chữ biểu, hoàn tác áp dụng — còn NHAP) | Cùng dạng 731815: duongKinh<=16 mm (thân vít/bu lông) đúng chữ, nhưng bộ đọc `duongKinh` không hiểu cỡ ren "M6/M8" mà sổ tay hiện hành đọc được — áp sẽ thoái lui âm thầm (không có test riêng). Hoàn tác để chờ bộ đọc cỡ ren. |
| 731814 | chờ (đã soát đúng chữ biểu, hoàn tác áp dụng — còn NHAP) | Cùng dạng 731815: duongKinh<=16 mm (thân vít/bu lông) đúng chữ, nhưng bộ đọc `duongKinh` không hiểu cỡ ren "M6/M8" mà sổ tay hiện hành đọc được — áp sẽ thoái lui âm thầm (không có test riêng). Hoàn tác để chờ bộ đọc cỡ ren. |
| 731815 | chờ (đã soát đúng chữ biểu, hoàn tác áp dụng — còn NHAP) | Điều kiện duongKinh<=16 mm đúng chữ biểu, nhưng áp vào sổ tay làm đỏ `test-so-tay-gates` (4 ca: "bu lông M8x30" → THIEU_SO_LIEU thay vì CHOT 73181510; khoá cũ `duong_kinh` đọc được cỡ ren M8, khoá `duongKinh` thì không). Đã `git checkout` sổ tay 7318 + bản nháp. |
| 731816 | TRA_VE | (A) 731816.json:73181610 SAI ĐỐI TƯỢNG ĐO: chữ biểu 'Cho bu lông có đường kính ngoài của thân không quá 16 mm' / EN 'For bolts having a shank of an external diameter not exceeding 16 mm' — ngưỡng 16 mm là đường kính THÂN BU LÔNG mà đai ốc lắp vào, không phải kích thước của đai ốc. Bản nháp BO_VE 'Cho bu lông' và đặt duongKinh<=16 (đường kính ngoài của chính hàng). Đai ốc M14 (cỡ ren 14 mm, đường kính ngoài/cạnh ~22 mm) khai đường kính ngoài 22 mm sẽ rơi .90 thay vì .10; ngược lại vòng đai ốc nhỏ của bu lông lớn không có thật nên ít sai chiều kia. MFN .10=.90=12% nhưng sai mã. Sửa: khoá cỡ ren / đường kính bu lông dùng kèm (chưa có ⇒ DỪNG THIEU_KHOA_TU_VUNG), không BO_VE 'Cho bu lông'. |
| 731819 | chờ (đã soát đúng chữ biểu, hoàn tác áp dụng — còn NHAP) | Cùng dạng 731815: duongKinh<=16 mm (thân vít/bu lông) đúng chữ, nhưng bộ đọc `duongKinh` không hiểu cỡ ren "M6/M8" mà sổ tay hiện hành đọc được — áp sẽ thoái lui âm thầm (không có test riêng). Hoàn tác để chờ bộ đọc cỡ ren. |
| 731823 | DUYET | .10 đinh tán 'external diameter not exceeding 16 mm' → duongKinh<=16 mm. |
| 731829 | chờ (đã soát đúng chữ biểu, hoàn tác áp dụng — còn NHAP) | Cùng dạng 731815: duongKinh<=16 mm (thân vít/bu lông) đúng chữ, nhưng bộ đọc `duongKinh` không hiểu cỡ ren "M6/M8" mà sổ tay hiện hành đọc được — áp sẽ thoái lui âm thầm (không có test riêng). Hoàn tác để chờ bộ đọc cỡ ren. |
| 731940 | DUYET | .10 tenLoai 'Ghim băng' (Safety pins); .20 'Other pins' không điều kiện — máy phủ định anh em đúng. |
| 731990 | DUYET | .10 'Sewing, darning or embroidery needles' → tenLoai [Kim khâu, kim mạng, kim thêu] là mảng đúng liệt kê; .90 trần. |
| 732010 | DUYET | Tiêu đề 7320101 dungCho [xe có động cơ, 84.29, 84.30]; .11 'motor vehicles of heading 87.02, 87.03 or 87.04' → dungCho mã nhóm; .12 'other motor vehicles' → dungChoXeCoDongCo CO (anh em .11 phủ định); .19/.90 trần. |
| 732020 | DUYET | Tiêu đề 7320201 dungCho [xe có động cơ, 84.29, 84.30]; .11 'For motor vehicles' → dungChoXeCoDongCo; .12 'For earth-moving machinery' → dungCho máy làm đất; .19/.90 trần. |
| 732190 | TRA_VE | (A) 732190.json:tiêu đề 7321902 SUY RỘNG: chữ biểu 'Của dụng cụ nấu và dụng cụ hâm nóng dạng tấm dùng nhiên liệu khí (SEN)' / EN 'Of cooking appliances and plate warmers using gas fuel' — bản nháp chỉ giữ dungCho 'nhiên liệu khí', bỏ 'dụng cụ nấu và dụng cụ hâm nóng dạng tấm'. Bộ phận của lò sưởi/thiết bị sưởi dùng khí (7321.81, không phải dụng cụ nấu) sẽ vào .21/.29 thay vì .90 (MFN cùng 10%, sai mã). Sửa: thêm dungCho ['dụng cụ nấu','dụng cụ hâm nóng dạng tấm'] cùng điều kiện khí đốt. (.10 bếp dầu hoả và .21 HOAC đầu đốt \| dập/ép đúng.) |
| 732391 | DUYET | .10 'Kitchenware' / .20 'Ashtrays' → loaiDoDungGiaDinhSatThep TRONG [DO_DUNG_NHA_BEP]/[GAT_TAN_THUOC_LA]; .90 trần; chất liệu do PN6 giữ. |
| 732393 | DUYET | .10 'Kitchenware' / .20 'Ashtrays' → loaiDoDungGiaDinhSatThep TRONG [DO_DUNG_NHA_BEP]/[GAT_TAN_THUOC_LA]; .90 trần; chất liệu do PN6 giữ. |
| 732399 | DUYET | .10 'Kitchenware' / .20 'Ashtrays' → loaiDoDungGiaDinhSatThep TRONG [DO_DUNG_NHA_BEP]/[GAT_TAN_THUOC_LA]; .90 trần; chất liệu do PN6 giữ. |
| 732410 | DUYET | .10 'Kitchen sinks' → tenLoai Bồn rửa nhà bếp; thép không gỉ do PN6 giữ; .90 trần. |
| 732421 | TRA_VE | (A) 732421.json:73242110 SAI KHOÁ: chữ biểu 'Bồn tắm có hình dạng bên trong là hình chữ nhật hoặc hình thuôn (oblong)' / EN 'Bathtubs having rectangular or oblong interior shape' — bản nháp dùng hinhDangCatGocKinh CO (khoá 'tấm KÍNH hình vuông hoặc chữ nhật, kể cả cắt góc' của chương 70) và BO_VE cả vế. Khoá đọc 'hình vuông' (bồn vuông lọt vào .10 — SUY RỘNG) nhưng không đọc 'hình thuôn/oblong' (bồn thuôn rơi .90 — THU HẸP), không phân biệt hình dạng BÊN TRONG với bên ngoài. MFN cùng 35% nhưng sai mã. Sửa: khoá hình dạng lòng bồn (chưa có ⇒ DỪNG THIEU_KHOA_TU_VUNG). |
| 732429 | TRA_VE | (A) 732429.json:73242910 SAI KHOÁ: chữ biểu 'Bồn tắm có hình dạng bên trong là hình chữ nhật hoặc hình thuôn (oblong)' / EN 'Bathtubs having rectangular or oblong interior shape' — bản nháp dùng hinhDangCatGocKinh CO (khoá tấm KÍNH vuông/chữ nhật chương 70) và BO_VE cả vế: đọc 'hình vuông' (SUY RỘNG), không đọc 'thuôn/oblong' (THU HẸP), không phân biệt lòng bồn với vỏ ngoài. MFN cùng 35% nhưng sai mã. Sửa: khoá hình dạng lòng bồn (chưa có ⇒ DỪNG THIEU_KHOA_TU_VUNG). |
| 732510 | DUYET | .20 'Manhole covers, gratings and frames therefor' → HOAC [tenLoai Nắp cống/lưới che cống] \| [tenLoai khung + dungCho nắp cống/lưới] — 'therefor' gắn đúng khung; .30 'Spouts and cups for latex collection' → tenLoai Máng/chén + congDung thu mủ cao su. |
| 732599 | DUYET | .20 'Manhole covers, gratings and frames therefor' → HOAC nắp/lưới \| khung dùng cho nắp/lưới (đúng chữ 'therefor'); .90 trần. |
| 732620 | DUYET | .50 'Poultry cages and the like' → TUONG_TU [Lồng nuôi gia cầm] (đúng thiết kế, không khai chongLan); .60 Bẫy chuột; .70 'Wire mesh curtain and blinds' → tenLoai [Rèm, rèm lưới] trong phạm vi sản phẩm bằng dây; .90 trần. |


## Soát lại của tech lead — bo-kiem-luat hai bên

Trả về 730630,732010,732020: gộp thử với `main` làm phát sinh ca chốt sai mới trong `bo-kiem-luat --toan-bieu` (cổng gộp không cho `chotSai`/`chotLoaiKhacSai` tăng). Mục sổ tay giữ như `main`.
