# data/bieu-thue — Biểu thuế XNK do Tổng cục Hải quan soạn, đọc KHÔNG bỏ sót

Nguồn: tệp Excel CEO đặt ở `data/oz-export/BIEU-THUE-XNK-<ngày>.xlsx` (gitignored, 30+ MB). Skill: `.claude/skills/bieu-thue-xnk/SKILL.md`.

Mỗi phiên bản một thư mục `<YYYY.MM.DD>/`:

| Tệp | Nội dung | Nhãn nguồn |
|---|---|---|
| `cot.json` | từ điển cột từng sheet: tiêu đề nguyên văn → khoá (`ma`, `moTaVi`, `thue.mfn`, `thue.rcep`…); cột lạ ghi rõ, vẫn giữ giá trị | — |
| `bieu-chinh.jsonl.gz` | sheet chính (BT2026): mọi dòng có mã (2/4/6/8/10 số), mọi cột, **chuỗi gốc** (`"0 (-CN)"`, `"*"`), `thue{}` 27 mức (MFN, TT, VAT, ACFTA, ATIGA, AJCEP, VJEPA, AKFTA, AANZFTA, AIFTA, VKFTA, VCFTA, VN-EAEU, CPTPP, AHKFTA, VN-Cuba, EVFTA, UKVFTA, VN-Lào, VN-Campuchia, VIFTA, RCEP A–F, TTĐB, XK, XK-CPTPP/EV/UKV, BVMT), `canCu{mức: {vanBan, hieuLuc}}` nghị định + ngày hiệu lực của TỪNG mức, vị trí dòng `r` | `NGUYEN_VAN` |
| `tieu-de.jsonl.gz` | mọi dòng tiêu đề không mã của mọi sheet (chương, nhóm, nhóm con `- Loại khác:`), số gạch, mã trước/sau | `NGUYEN_VAN` |
| `sheet/<sheet>.jsonl.gz` | 30 sheet còn lại: lộ trình từng FTA theo năm/mốc (`thue["atiga@2026"]`…), biểu XK, mã cũ/mới (CU/MOI) — **gitignored**, tái sinh bằng `trich.mjs` | `NGUYEN_VAN` |
| `ten-nut.json` | tên nguyên văn biểu thuế cho nút ảo của cây (`lib/hs-tree.js`): nhóm một gạch 5 số, tiêu đề quốc gia 7 số | `NGUYEN_VAN` |
| `doi-chieu-tax.json`, `tong-ket.json` | sha256 tệp, số liệu, bảo toàn ô, mã thiếu/thừa so với `tax.json` | — |

Bản thô từng ô: `data/oz-export/bieu-thue-raw/<phiên bản>/<sheet>.jsonl` (gitignored, tái sinh được bằng `trich.mjs`).
Đọc: `require('./lib/bieu-thue').docJsonlGz(path)`; phiên bản mới nhất: `phienBanMoiNhat()`. `lib/hs-tree.js` tự nạp `ten-nut.json`
của phiên bản mới nhất → nút ảo và phân nhóm 6 số có `tenVi` nguyên văn + `tenNguon: "bieu-thue@<phiên bản>"`.

Phiên bản 2026.04.05 (sha256 `2b55f20e…`): sheet chính 15.115 dòng mã (12.000 dòng 8 số, 11.871/11.871 mã `tax.json` có mặt, 78 trùng là chương 98 xuất hiện hai lần), 4.780 dòng tiêu đề; 2.160/2.194 nút ảo của cây có tên (khớp tập), 1.046/2.035 phân nhóm 6 số có tên tiếng Việt; 8 sheet phụ lục (BIA, HT, BANG, 6QT, PL1, PL2, EU, DB) bỏ qua có ý thức (giữ trong bản thô).
Không sửa tay các tệp này; sửa `lib/bieu-thue.js` rồi trích lại.
