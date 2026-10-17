# data/bieu-thue — Biểu thuế XNK do Tổng cục Hải quan soạn, đọc KHÔNG bỏ sót

Nguồn: tệp Excel CEO đặt ở `data/oz-export/BIEU-THUE-XNK-<ngày>.xlsx` (gitignored, 30+ MB). Skill: `.claude/skills/bieu-thue-xnk/SKILL.md`.

Mỗi phiên bản một thư mục `<YYYY.MM.DD>/`:

| Tệp | Nội dung | Nhãn nguồn |
|---|---|---|
| `cot.json` | từ điển cột từng sheet: tiêu đề nguyên văn → khoá (`ma`, `moTaVi`, `thue.mfn`, `thue.rcep`…); cột lạ ghi rõ, vẫn giữ giá trị | — |
| `bieu-chinh.jsonl.gz` | sheet chính (BT2026): mọi dòng có mã (2/4/6/8/10 số), mọi cột, **chuỗi gốc** (`"0 (-CN)"`, `"*"`), `thue{}` 27 mức (MFN, TT, VAT, ACFTA, ATIGA, AJCEP, VJEPA, AKFTA, AANZFTA, AIFTA, VKFTA, VCFTA, VN-EAEU, CPTPP, AHKFTA, VN-Cuba, EVFTA, UKVFTA, VN-Lào, VN-Campuchia, VIFTA, RCEP A–F, TTĐB, XK, XK-CPTPP/EV/UKV, BVMT), `canCu{mức: {vanBan, hieuLuc}}` nghị định + ngày hiệu lực của TỪNG mức, vị trí dòng `r` | `NGUYEN_VAN` |
| `tieu-de.jsonl.gz` | mọi dòng tiêu đề không mã của mọi sheet (chương, nhóm, nhóm con `- Loại khác:`), số gạch, mã trước/sau | `NGUYEN_VAN` |
| `sheet/<sheet>.jsonl.gz` | 30 sheet còn lại (bảng từng sheet ở dưới): lộ trình từng FTA theo năm/mốc (`thue["atiga@2026"]`…), biểu XK, mã cũ/mới (CU/MOI) — **gitignored**, tái sinh bằng `trich.mjs` | `NGUYEN_VAN` |
| `ten-nut.json` | tên nguyên văn biểu thuế cho nút ảo của cây (`lib/hs-tree.js`): nhóm một gạch 5 số, tiêu đề quốc gia 7 số | `NGUYEN_VAN` |
| `doi-chieu-tax.json`, `tong-ket.json` | sha256 tệp, số liệu, bảo toàn ô, mã thiếu/thừa so với `tax.json` | — |

Bản thô từng ô: `data/oz-export/bieu-thue-raw/<phiên bản>/<sheet>.jsonl` (gitignored, tái sinh được bằng `trich.mjs`).
Đọc: `require('./lib/bieu-thue').docJsonlGz(path)`; phiên bản mới nhất: `phienBanMoiNhat()`. `lib/hs-tree.js` tự nạp `ten-nut.json`
của phiên bản mới nhất → nút ảo và phân nhóm 6 số có `tenVi` nguyên văn + `tenNguon: "bieu-thue@<phiên bản>"`.

Phiên bản 2026.04.05 (sha256 `2b55f20e…`): sheet chính 15.115 dòng mã (12.000 dòng 8 số, 11.871/11.871 mã `tax.json` có mặt, 78 trùng là chương 98 xuất hiện hai lần), 4.780 dòng tiêu đề; 2.160/2.194 nút ảo của cây có tên (khớp tập), 1.046/2.035 phân nhóm 6 số có tên tiếng Việt; 8 sheet phụ lục (BIA, HT, BANG, 6QT, PL1, PL2, EU, DB) bỏ qua có ý thức (giữ trong bản thô).
Không sửa tay các tệp này; sửa `lib/bieu-thue.js` rồi trích lại.

## Rà soát cột Chính sách mặt hàng (`cs`) theo từng mã 8 số — `2026.04.05/ra-soat-cs.json`

CEO yêu cầu 12/10/2026. So cột CY "Chính sách mặt hàng theo mã HS" của biểu chính 2026.04.05 với trường `cs` của `data/tax.json`
(gốc: biểu 01/01/2026, `data/versions/tax-v2026-01-01-base.json`) cho **11.871/11.871 mã 8 số**; số hiệu văn bản đối chiếu sổ
oz-wiki-plhq qua `lib/plhq-registry.js` (cầu nối — nội dung văn bản để oz-wiki làm, repo này không chép).

| Kết quả | Số mã |
|---|---|
| Giống nhau | 7.011 |
| Cả hai trống | 3.831 |
| Khác nhau | 1.029 (460 mã biểu có mục mới; 684 mã tax còn mục biểu đã bỏ) |
| `tax.json` dính hai mục không có `;` (lỗi nhập cũ, vd 29031110) | 61 |

Thay đổi chính sách giữa 01/01/2026 → 05/04/2026 (mục × số mã): **mới** — tài nguyên khoáng sản chưa/đã chế biến (181/2025/NĐ-CP
PL1/PL2) 148 + 184; hoá chất Bảng 1/2/3 theo 33/2024 & 26/2026/NĐ-CP 80; khai báo hoá chất qua Cổng một cửa (Đ6 NĐ26) 59; VLXD
nhóm 2 (10/2024/TT-BXD) trước/sau thông quan 26 + 54; hoá chất cấm đầu tư kinh doanh (Đ5.5 NĐ26) 20; CBPG ván sợi 121/QĐ-BCT-2026,
kính nổi 228/QĐ-BCT-2026. **Bỏ** — toàn bộ danh mục hoá chất theo 113/2017/NĐ-CP (PL1/PL3/PL4/PL5) và 82/2022/NĐ-CP PL2
(604 + 322 + 257 + 196 + 48 mã, thay bằng NĐ 26/2026 hướng dẫn Luật Hoá chất 2025); CBPG ván sợi 2491/QĐ-BCT-2025, kính nổi
2093/QĐ-BCT-2025 (thay bằng QĐ 2026); pháo hoa 125/2021/TT-BCA (1 mã).

Cầu nối sổ oz-wiki (sổ bản 10/10/2026 lúc rà; CEO nạp 40 văn bản sheet HT vào sổ trưa 12/10 → bản 12/10 chỉ còn thiếu
33/2024/NĐ-CP ở cột chính sách và 28 văn bản *bị thay* nêu ở sheet HT — xem `van-ban-bieu-thue.json`): cột chính sách biểu 2026
trích được **62 số hiệu**; sổ 10/10 **thiếu 3** (181/2025/NĐ-CP — 332 mã, 33/2024/NĐ-CP — 60 mã, 228/QĐ-BCT — 2 mã); **12 văn bản sổ ghi đã hết hiệu lực sau 05/04/2026** mà biểu còn trích (12/2022 + 62/2024/TT-BGTVT 2.183 mã hết
01/07/2026 chưa ghi văn bản thay; 23/2019/QĐ-TTg → 31/2026/QĐ-TTg; 01/2021/TT-BLĐTBXH → 16/2026/TT-BNV; 10/2024/TT-BXD → 41/2026/TT-BXD;
29/2025/TT-BKHCN → 36/2026/TT-BKHCN; 04/2021/TT-BXD → 11/2026/TT-BXD; 69/2018/NĐ-CP → 292/2026/NĐ-CP; 691, 693, 715, 2105/QĐ-BCT).
4 mục không có số hiệu máy đọc được ("Đ6-NĐ26", "Đ5.5 NĐ26", "10.2022.TT.BTTT", dòng CITES bị tách). Sheet `HT` nêu 144 số hiệu,
sổ thiếu 66 (chủ yếu nghị định biểu thuế FTA 2022, biểu MFN/XK 2023–2025, thông tư PSR) — danh sách trong tệp để chuyển oz-wiki.

Tệp `ra-soat-cs.json` (`MAY_SUY`): `theoMa[]` từng mã khác nhau (`tax`, `bieu`, `mucMoi`, `mucBo`), `mucMoi`/`mucBo` tổng hợp,
`taxDinhMuc`, `vanBanCotChinhSach` (số hiệu, số mã, có trong sổ, tình trạng), `sheetHT.thieuTrongSoOzWiki`. **Không sửa `tax.json`
ở đây** — cập nhật `cs` đi qua phiên bản biểu thuế (`scripts/tariff-upload-xlsx.mjs` / `data/versions/`) khi CEO chốt.

### Cập nhật `cs` và cầu nối oz-wiki (CEO duyệt 12/10/2026)

- `npm run bieu-thue:cap-nhat-cs -- --phien-ban=2026.04.05` (`scripts/bieu-thue/cap-nhat-cs.mjs`): thay trường `cs` của **mọi**
  mã 8 số trong `data/tax.json` bằng cột CY của biểu đã trích — đi qua `lib/tariff-mutations.js uploadTariffMap` → phiên bản
  `v2-2026-04-05-cs` trong `data/versions/` + thay `tax.json`; mọi trường khác giữ nguyên; `--kho` để xem trước. Kết quả lần
  chạy khô 12/10/2026: đổi 1.029 mã (thêm 112, bỏ trống 367, sửa 550 — gồm 61 mã dính mục). **Đã chạy thật 17/10/2026
  (CEO chốt)**: `tax.json` + phiên bản `v2-2026-04-05-cs` (snapshot `data/versions/tax-2026-04-05-cs.json`, commit kèm) — 8 kiểu dòng
  chính sách mới được thêm luật ở `lib/policy-levels.js` (TNKS NĐ 181/2025 → INFO; khoáng sản XK → INFO; khai báo hóa chất
  1CQG, hóa chất cấm ĐTKD → BLOCKING); còn 1 dòng `Than cám (41/2019/TT-BCT)` chưa phân loại.
- `npm run bieu-thue:van-ban` (`scripts/bieu-thue/van-ban.mjs`) → **`data/bieu-thue/van-ban-bieu-thue.json`**: mọi số hiệu văn bản
  mà biểu thuế nêu (sheet `HT` cột F hiện hành / cột I bị thay + cột chính sách kèm số mã HS), đối chiếu sổ oz-wiki
  (`trongSo`, `tinhTrang`, `hetHieuLucTu`, `biThayTheBoi`). oz-wiki-plhq `tools/nhu-cau.mjs` kéo tệp này về
  `nhu-cau/bieu-thue-van-ban.json` và `tools/diem-mu.mjs` sinh việc `BIEU_THUE_*`. Tệp chỉ có số hiệu + tên biểu/danh mục,
  **không có nội dung văn bản** — nội dung là việc của oz-wiki. 2026.04.05 (sổ 12/10): 150 số hiệu, sổ chưa có 29 (1 hiện hành:
34/2024/NĐ-CP; 1 cột chính sách: 33/2024/NĐ-CP; 27 văn bản bị thay), 20 hết hiệu lực — trong đó 13 văn bản biểu còn coi là hiện
hành mà sổ ghi hết (6 chưa ghi văn bản thay: 12/2022 + 62/2024/TT-BGTVT, 691, 693, 715, 2105/QĐ-BCT).

## Từng sheet chứa gì (khám phá 12/10/2026, tệp 2026.04.05)

Cột `Mã`/`Mô tả`/`Thuế` là khoá trong `cot.json`; "dòng mã" = dòng có mã 2–10 số; "khác" = dòng giữ nguyên ô, không vào dòng mã/tiêu đề.

| Sheet | Nội dung | Dòng mã / tiêu đề | Cột đáng chú ý | Dùng cho |
|---|---|---|---|---|
| `BT2026` | **Biểu chính**: mọi mã kèm 27 mức thuế + văn bản/ngày hiệu lực từng mức, ĐVT vi/en, chính sách mặt hàng (cột CY), giảm VAT (CZ) | 15.115 / 4.780 | `thue.*`, `canCu.*`, `chinhSach`, `giamVat` | #251, #236, `tax.json` |
| `AC` | ACFTA (NĐ 118/2022) một mức + **loại trừ nước** (`loaiTruNuoc`: KH, CN, ID, TH, MM, MY… 110 tổ hợp) | 14.527 / 2.466 | `thue.acfta`, `them.loaiTruNuoc` | #251 (C/O mẫu E) |
| `AT` | ATIGA 2022→2027 từng năm + **quy tắc xuất xứ từng dòng** (`quyTacXuatXu`: RVC40, CTSH, CC, WO, quy tắc dệt may… 78 dạng) | 14.453 / 2.468 | `thue.atiga@<năm>`, `them.quyTacXuatXu` | #251 (C/O mẫu D, PSR) |
| `AJ` | AJCEP theo mốc 30/12/2022, 1/4/2023 … 1/4/2027 (khoá là ngày **bắt đầu**; ngày kết thúc ở dòng phụ r9 trong `khac`) | 14.507 / 2.468 | `thue.ajcep@<mốc>` | #251 (mẫu AJ) |
| `VJ` | VJEPA theo khoảng ngày `01/4/2025 - 31/3/2026` … | 14.511 / 2.468 | `thue.vjepa@<khoảng>` | #251 (mẫu VJ/JV) |
| `AK` | AKFTA một mức, loại trừ nước (`0(-LA)` giữ nguyên ở cột I), cột `GIC` đánh dấu 181 dòng, mã có chấm + mã phẳng (cột D) | 13.344 / 3.639 | `thue.akfta`, `them.loaiTruNuoc`, `khac.H=GIC` | #251 (mẫu AK) |
| `AANZ` | AANZFTA hai cột mức (`aanzfta`, `aanzfta@2`), 6 dòng hạn ngạch `(NHN: 50)` | 14.469 / 2.471 | `them.hanNgach` | #251 (mẫu AANZ) |
| `AI` | AIFTA theo mốc 30/12/2022 → 01/01/2027 (ngày "đến" ở dòng phụ) | 14.467 / 2.466 | `thue.aifta@<mốc>` | #251 (mẫu AI) |
| `VK` | VKFTA 2022→2027, cột `GIC` | 14.514 / 2.469 | `thue.vkfta@<năm>` | #251 (mẫu VK) |
| `VC` | VCFTA 2022→2027 | 14.573 / 2.473 | `thue.vcfta@<năm>` | #251 (mẫu VC) |
| `EAV` | VN–EAEU 2022→2027, 17 dòng hạn ngạch thuế quan (TT 04/2023/TT-BCT) | 14.547 / 2.472 | `thue.vn_eaeu@<năm>`, `them.hanNgach` | #251 (mẫu EAV) |
| `CPTPP` | CPTPP theo năm thứ (I)→(VII), ghi chú `*`/`TRQ1`/`TRQ2`, cột **hàng tân trang** theo NĐ 77/2023 (BCT/BGTVT/BYT…, 1.071 dòng) | 14.660 / 2.476 | `thue.cptpp@(n)`, `ghiChu`, `khac.L` | #251 (mẫu CPTPP), KTCN #243 |
| `AKH` | AHKFTA 2022→2027 | 14.542 / 2.472 | `thue.ahkfta@<năm>` | #251 (mẫu AHK) |
| `EV-NK` | EVFTA nhập khẩu 2022→2027, cột J `X` đánh dấu 2.538 dòng (chưa rõ nghĩa — giữ nguyên) | 14.575 / 2.470 | `thue.evfta@<năm>`, `khac.J` | #251 (EUR.1) |
| `VNCU` | VN–Cuba: chỉ 841 dòng mã (biểu rút gọn), mốc `2022` và `2023 - 2027` | 841 / 241 | `thue.vn_cuba@…` | #251 (VNCB) |
| `UKV` | UKVFTA 2022→2027 | 14.575 / 2.467 | `thue.ukvfta@<năm>` | #251 (EUR.1) |
| `VI` | VIFTA (NĐ 131/2024) 2024→2027, cột J = số chữ số của mã | 14.510 / 2.493 | `thue.vifta@<năm>` | #251 (mẫu VI) |
| `VNCAM` | VN–Campuchia (NĐ 56/2026): chỉ 41 dòng, 15 dòng hạn ngạch | 41 / 3 | `thue.vn_cam@2025/2026`, `them.hanNgach` | #251 (mẫu S) |
| `RCEPT-A`, `B`…`F` | RCEP sáu biểu theo nhóm nước (A–F) 2022→2027, mỗi sheet ~14.538 dòng | 14.536–14.538 | `thue.rcep@<năm>` (sheet nào = nhóm nước nào) | #251 (mẫu RCEP) |
| `XK` | **Biểu thuế xuất khẩu** (NĐ 26/2023 … 199/2025): 1.935 dòng mã, **127 dòng 10 số** (vd 1211.90.17.10 trầm hương), văn bản + ngày văn bản từng dòng; cột B/F/G là cột phụ công thức, **lệch một dòng từ r1123** (sau một dòng chèn) → không dùng B làm mã; dòng cuối "hàng hoá không quy định ở trên có giá trị tài nguyên… ≥ 51 %" (mặt hàng 211, không mã) nằm ở tiêu đề | 1.935 / 431 | `thue.xk`, `canCu.xk` | tra thuế XK |
| `EV-XK`, `UKV-XK`, `CPTPP-XK` | Biểu XK ưu đãi theo hiệp định (EVFTA 1.060, UKVFTA 1.061, CPTPP 758 dòng) | 758–1.061 | `thue.evfta@…`, `thue.xk_ukvfta@…`, `thue.xk_cptpp@(n)` | tra thuế XK ưu đãi |
| `MT` | Biểu thuế **bảo vệ môi trường** 2026: 8 nhóm (xăng dầu, than, HCFC, túi ni lông, thuốc BVTV hạn chế) mức tuyệt đối đồng/đơn vị, năm 2026 và từ 01/01/2027, kèm nghị quyết — **không có mã HS** nên 0 dòng mã, nội dung ở `tieu-de`/`khac` | 0 / 19 | — | tra BVMT (cột `thue.bvmt` biểu chính đã có) |
| `CU` | 10.813 mã 8 số TT 65/2017, cột H `X` đánh dấu **833 mã không còn** trong biểu 2023 | 10.813 / 1 | `maTuongUng` | chuyển mã cũ → mới |
| `MOI` | 11.414 mã 8 số TT 31/2022, cột H `X` đánh dấu **1.434 mã mới** từ 2023 | 11.414 / 1 | `khac.H` | như trên |

Sheet phụ lục (không có tiêu đề cột → `--bo-qua-sheet`, vẫn đủ trong bản thô `bieu-thue-raw/`):

| Sheet | Nội dung | Giá trị |
|---|---|---|
| `BIA` | trang bìa, 0 ô chữ (chỉ hình) | — |
| `HT` | **Hệ thống văn bản**: 27 biểu thuế (viết tắt, **mẫu C/O**: E, D, AJ, JV, AK, AANZ, AI, VK, VC, EAV, VNCB, AHK, EUR.1, S, CPTPP, RCEP), số/ngày văn bản, ngày hiệu lực, văn bản bị thay; 6 thông tư quy tắc mặt hàng cụ thể; **95 văn bản chính sách mặt hàng** (cấm, KTCN, CBPG, hạn ngạch, dược, CITES…) | **cao** — nguồn cho bảng hiệp định ↔ mẫu C/O (#251) và `legal-docs.json` |
| `BANG` | 9 bảng kèm biểu (ngũ cốc tinh bột/tro/sàng; giấy kraft độ bục/độ bền; giới hạn nguyên tố hợp kim đồng/nhôm/chì/kẽm/thiếc; vải mành nylon ch.98) — tiêu chí kỹ thuật của chú giải | trung bình — `tieuChi6`/`dong8.tieuChi` sổ tay |
| `6QT` | Sáu quy tắc tổng quát + chú giải quy tắc, song ngữ (TT 31/2022) | thấp — `lib/gir.js` đã có; đối chiếu câu chữ |
| `PL1` | Danh mục hàng hoá **không được giảm VAT** (NĐ 174/2025) theo mã ngành sản phẩm cấp 1–7 + mã HS (334 dòng có mã, 217 mã số thuần) | cao — giải nghĩa cột `giamVat` biểu chính |
| `PL2` | Hàng hoá/dịch vụ chịu TTĐB không được giảm VAT (NĐ 174/2025), 17 dòng chữ | thấp |
| `EU` | 27 lãnh thổ thành viên EU (NĐ 116/2022) | thấp — kiểm xuất xứ EVFTA |
| `DB` | Biểu thuế **TTĐB 2026** (Luật 66/2025/QH15): thuế suất theo lộ trình đến 2031 (thuốc lá, rượu, bia, xe, nước giải khát có đường…), mức tuyệt đối — không mã HS | trung bình — cột `thue.ttdb` biểu chính là mức hiện hành |

Lỗi nguồn đã phát hiện (giữ nguyên, không sửa máy): `XK` dòng 1123 có mức "10%. Từ ngày 01/01/2027 áp dụng 15%" (NĐ 199/2025) nhưng
**ô mã trống** (dòng chèn; cột phụ B lệch) — nằm ở `khac` với cờ `CO_THUE_KHONG_MA`, `kiem.mjs` in cảnh báo; cần người đối chiếu
văn bản xem thuộc 2804.70.00.10 (phốt pho vàng) hay 2804.70.00.90.
