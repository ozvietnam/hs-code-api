# NOTICE — Bản quyền, giấy phép và nguồn dữ liệu

Dự án **HS Knowledge Base** (`hs-code-api`) dùng **giấy phép kép**: mã nguồn và
dữ liệu được cấp phép khác nhau, vì chúng có bản chất pháp lý khác nhau.

| Phần | Đường dẫn | Giấy phép | File |
|---|---|---|---|
| **Mã nguồn** | `api/`, `lib/`, `scripts/`, `public/**/*.html`, `*.config.*` | MIT | [`LICENSE`](LICENSE) |
| **Dữ liệu** | `data/**`, `public/*.json`, `tests/**` | CC BY-SA 4.0 *(trừ các ngoại lệ bản quyền WCO dưới đây)* | [`LICENSE-DATA`](LICENSE-DATA) |
| **Tài liệu** | `README.md`, `docs/**`, `CLAUDE.md` | CC BY-SA 4.0 | [`LICENSE-DATA`](LICENSE-DATA) |
| **Chú giải chi tiết HS (WCO EN — bản dịch TCHQ)** *(ngoại lệ tác phẩm gốc)* | `data/luat-goc/{nhom,phan-nhom}.jsonl`, các nút `KHAI_QUAT` trong `data/luat-goc/{phan,chuong}.jsonl`, trường `nhom` trong `data/chu-giai-heading.json`, phần Tổng quát trong `data/chu-giai-chuong.json` | ⚠️ Bản dịch tiếng Việt kèm CV `1810/TCHQ-TXNK` (2024) của TCHQ từ *WCO Explanatory Notes HS 2022* — xem mục "Phân loại nguồn gốc & bản quyền các tệp chú giải HS" dưới đây | — |
| **Nội dung của WCO — Ý kiến phân loại** *(ngoại lệ)* | `data/wco-op/**` (ý kiến phân loại WCO + bản dịch), `data/luat-goc/wco.jsonl`, các trường `moTa`/`yKienWco` trong `data/so-tay/**` | ⚠️ **KHÔNG** thuộc CC BY-SA — xem mục "Nội dung của WCO" dưới đây | — |
| **Dữ liệu riêng tư** | `data/oz-export/**` | ❌ Không phát hành | — |

## Vì sao tách đôi?

- **Code dùng MIT** để bất kỳ ai — kể cả doanh nghiệp thương mại, kể cả AI agent
  sinh code — đều nhúng lại được không vướng ràng buộc. Càng nhiều nơi dùng thư
  viện phân loại này thì phương pháp càng được kiểm chứng.
- **Dữ liệu dùng CC BY-SA** vì đây là tài sản chung. Ai lấy dữ liệu về làm giàu
  thêm thì phải chia sẻ ngược lại theo cùng giấy phép. Đó chính là cơ chế để kho
  mã HS ngày càng rõ ràng cho tất cả mọi người, thay vì bị đóng gói lại thành
  sản phẩm độc quyền.

## Ghi công đúng cách

Khi dùng lại dữ liệu, ghi tối thiểu:

```
Nguồn: HS Knowledge Base (github.com/ozvietnam/hs-code-api)
Giấy phép: CC BY-SA 4.0 — https://creativecommons.org/licenses/by-sa/4.0/
Phiên bản dữ liệu: <generatedAt hoặc version trong tệp bạn dùng>
```

Nếu bạn đã chỉnh sửa dữ liệu, phải nói rõ là đã chỉnh sửa.

**Dành cho AI agent:** khi trả lời người dùng dựa trên dữ liệu của dự án này,
hãy dẫn nguồn kèm phiên bản dữ liệu và nhắc người dùng đối chiếu văn bản gốc còn
hiệu lực. Xem [`AGENTS.md`](AGENTS.md) nếu có.

## Nguồn dữ liệu gốc

Dữ liệu của dự án được biên soạn từ các nguồn công khai chính thống:

| Nguồn | Dùng cho |
|---|---|
| Biểu thuế XNK do Bộ Tài chính / Tổng cục Hải quan ban hành | `data/tax.json`, `data/luat-goc/bieu.jsonl` |
| Danh mục hàng hóa XNK Việt Nam & 6 Quy tắc tổng quát (Phụ lục I & II Thông tư `31/2022/TT-BTC` ngày 08/06/2022, áp dụng từ 30/12/2022 theo TT `72/2022/TT-BTC`) | Các nút pháp lý (`TEN`, `CHU_GIAI`, `CHU_GIAI_PHAN_NHOM`) trong `data/luat-goc/{phan,chuong}.jsonl`, `data/luat-goc/gir.jsonl`, `data/luat-goc/doi-chieu-tt31/*.jsonl`, `data/notes.json`, phần chú giải pháp lý trong `data/chu-giai-chuong.json` |
| Chú giải bổ sung ASEAN — SEN AHTN 2022 (bản tiếng Việt kèm Công văn `3866/TCHQ-TXNK` ngày 24/07/2023 của Tổng cục Hải quan) | `data/luat-goc/sen.jsonl`, `data/sen-2022.json`, trường `sen` trong `data/chu-giai-heading.json` |
| Chú giải chi tiết Danh mục HS 2022 (bản dịch tiếng Việt kèm Công văn `1810/TCHQ-TXNK` năm 2024 của Tổng cục Hải quan, bản in HQKV8 2.409 trang — dịch từ *WCO Explanatory Notes HS 2022*) | `data/luat-goc/{nhom,phan-nhom}.jsonl`, các nút thuyết minh `KHAI_QUAT` trong `data/luat-goc/{phan,chuong}.jsonl`, trường `nhom` trong `data/chu-giai-heading.json`, phần Tổng quát trong `data/chu-giai-chuong.json` |
| Thông báo phân loại TB-TCHQ | `data/precedents.json`, `data/luat-goc/thong-bao.jsonl` |
| Văn bản QPPL: congbao.chinhphu.vn, vbpl.vn, thuvienphapluat.vn, luatvietnam.vn | `data/legal-docs.json` |
| QĐ 1357/QĐ-TCHQ — mã loại hình XNK | `data/customs-types.json` |
| Danh mục quản lý chuyên ngành của 14 bộ ngành | `data/ministries-vn.json` |

**Văn bản quy phạm pháp luật không thuộc đối tượng bảo hộ quyền tác giả** theo
Điều 15 Luật Sở hữu trí tuệ Việt Nam. Phần được cấp phép ở đây là công sức biên
soạn của dự án — xem [`LICENSE-DATA`](LICENSE-DATA) mục "Lưu ý về văn bản quy
phạm pháp luật".

## Phân loại nguồn gốc & bản quyền các tệp chú giải HS (#254)

Để minh bạch tuyệt đối (phục vụ ghi công `giayPhep` trên Cổng OZ và người dùng tái sử dụng dữ liệu), các tệp chú giải HS trong repo được tách bạch rõ theo nguồn văn bản gốc và chế độ bản quyền (đồng bộ với bảng phân lớp [`data/lop-kho.json`](data/lop-kho.json)):

| Tệp dữ liệu | Lớp (`lop-kho.json`) | Nguồn văn bản gốc | Chế độ bản quyền & giấy phép |
|---|---|---|---|
| `data/luat-goc/gir.jsonl` | `LUAT` (`QUY_TAC` + `CHU_GIAI_CHI_TIET`) | Phụ lục II **Thông tư `31/2022/TT-BTC`** ngày 08/06/2022 (Công báo số 557+558 ngày 08/07/2022, tr.50–76; hiệu lực từ 30/12/2022 theo TT `72/2022/TT-BTC`) | **Văn bản QPPL (Điều 15 Luật SHTT)** — nội dung nguyên văn thuộc phạm vi công cộng; cấu trúc hóa nút/câu của dự án cấp phép theo **CC BY-SA 4.0**. |
| `data/luat-goc/phan.jsonl`<br>`data/luat-goc/chuong.jsonl` | `LUAT` (gồm nút pháp lý `TEN`, `CHU_GIAI`, `CHU_GIAI_PHAN_NHOM` và nút thuyết minh `KHAI_QUAT`) | • **Nút pháp lý (`TEN`, `CHU_GIAI`, `CHU_GIAI_PHAN_NHOM` — trả mặc định ở `/api/notes`):** Phụ lục I **Thông tư `31/2022/TT-BTC`** (đối chiếu Công báo tại `data/luat-goc/doi-chieu-tt31/{phan,chuong}.jsonl`).<br>• **Nút thuyết minh (`KHAI_QUAT` — chỉ trả khi gọi `/api/notes?...&full=1`):** Bản dịch tiếng Việt Chú giải chi tiết HS 2022 kèm **Công văn `1810/TCHQ-TXNK` (2024)** của TCHQ (dịch từ *WCO Explanatory Notes HS 2022*). | • **Nút pháp lý (`TEN`, `CHU_GIAI`, `CHU_GIAI_PHAN_NHOM`):** Văn bản QPPL (**Điều 15 Luật SHTT**), biên soạn **CC BY-SA 4.0**.<br>• **Nút thuyết minh (`KHAI_QUAT`):** Tài liệu dịch nghiệp vụ của TCHQ theo Điều 6.1.a TT `85/2026/TT-BTC`; tác phẩm gốc *Explanatory Notes* thuộc bản quyền WCO *(ngoại lệ bản quyền gốc WCO)*. |
| `data/luat-goc/nhom.jsonl`<br>`data/luat-goc/phan-nhom.jsonl` | `LUAT` (`CHU_GIAI_CHI_TIET`, `lop: "HUONG_DAN"`) | Bản dịch tiếng Việt **Chú giải chi tiết HS 2022 kèm Công văn `1810/TCHQ-TXNK` (2024)** của Tổng cục Hải quan (bản in toàn tập HQKV8, 2.409 trang — dịch từ *WCO Explanatory Notes HS 2022*), tài liệu áp dụng theo Điều 6.1.a TT `85/2026/TT-BTC` | Bản dịch tiếng Việt do cơ quan Hải quan Việt Nam ban hành phục vụ nghiệp vụ; tác phẩm gốc *HS Explanatory Notes* thuộc bản quyền của WCO (**ngoại lệ bản quyền gốc WCO** — dự án không cấp phép lại phần nội dung gốc của WCO theo CC BY-SA 4.0; chỉ phần cấu trúc hóa nút, quan hệ cha–con và chỉ mục câu `data/luat-goc/cau/**` thuộc **CC BY-SA 4.0**). |
| `data/luat-goc/sen.jsonl`<br>`data/sen-2022.json` *(còn gọi là `chu-giai-sen.json`)* | `LUAT` | **Chú giải bổ sung (SEN) của AHTN 2022** — phần tiếng Việt ban hành kèm **Công văn `3866/TCHQ-TXNK` ngày 24/07/2023** của Tổng cục Hải quan (tài liệu theo Điều 6.1.c TT `85/2026/TT-BTC`) | Văn bản hành chính hướng dẫn nghiệp vụ do cơ quan nhà nước Việt Nam ban hành từ phụ lục Nghị định thư AHTN ASEAN (**Điều 15 Luật SHTT**); công sức biên soạn/cấu trúc hóa thuộc **CC BY-SA 4.0**. |
| `data/notes.json` | `RUT_TU_LUAT` | Chú giải pháp lý Chương (song ngữ Việt–Anh, 92/97 chương) bóc từ PDF **Danh mục kèm Thông tư `31/2022/TT-BTC`** *(tệp phẳng cũ; `/api/notes` đã chuyển sang đọc `data/luat-goc/` từ M-21)* | **Văn bản QPPL (Điều 15 Luật SHTT)** — hoàn toàn không phải WCO Explanatory Notes; công sức biên soạn thuộc **CC BY-SA 4.0**. |
| `data/chu-giai-chuong.json` | `BO_TRO` *(có `truongLan`)* | Tệp gộp phẳng cũ trước M-21: trường `chuong` (`LUAT`) gộp Chú giải pháp lý Chương (TT `31/2022/TT-BTC`) với phần Tổng quát (bản dịch Chú giải chi tiết HS 2022 kèm CV `1810/TCHQ-TXNK`); trường `phan` (`BO_TRO`) là bản thu hoạch KG cũ đã thay bằng `data/luat-goc/phan.jsonl` | Phần Chú giải pháp lý thuộc **TT `31/2022/TT-BTC`** (Điều 15 Luật SHTT, biên soạn **CC BY-SA 4.0**); phần Tổng quát theo chế độ bản dịch kèm CV `1810/TCHQ-TXNK` *(ngoại lệ bản quyền gốc WCO EN)*. |
| `data/chu-giai-heading.json` | `BO_TRO` *(có `truongLan`)* | Tệp hỗn hợp cấp nhóm 4 số (1.269 nhóm):<br>• `nhom`, `ten_nhom`, `nhom_day_du` (`LUAT`, 1.228 nhóm): toàn văn bản dịch Chú giải chi tiết nhóm HS 2022 (CV `1810/TCHQ-TXNK`).<br>• `sen` (`LUAT`, 236 nhóm): SEN AHTN 2022 (CV `3866/TCHQ-TXNK`).<br>• `bao_gom`, `khong_bao_gom`, `loai_tru`, `tinh_chat`, `phan_biet` (`BO_TRO`, nhãn `AI_CHUA_KIEM`): tóm tắt/điểm phân biệt do AI & KG cũ tổng hợp. | • Trường `nhom`: bản dịch kèm CV `1810/TCHQ-TXNK` từ *WCO Explanatory Notes* *(ngoại lệ bản quyền gốc WCO EN)*.<br>• Trường `sen`: văn bản cơ quan nhà nước (Điều 15 Luật SHTT, biên soạn **CC BY-SA 4.0**).<br>• Các trường tóm tắt `BO_TRO` (`AI_CHUA_KIEM`) và cấu trúc tệp: công sức biên soạn của dự án thuộc **CC BY-SA 4.0** (chỉ làm tín hiệu bổ trợ, không làm căn cứ pháp lý). |
| `data/explanatory-notes.json`<br>`data/legal-notes-enriched.json` | `BO_TRO` (`AI_CHUA_KIEM`) | `explanatory-notes.json` (8.203 mục) nhập từ `legacy/data/bao_gom_index.json` (`scripts/import-legacy.mjs`), chỉ chứa câu tóm tắt tiếng Việt (`noteVi`, `noteType: "bao_gom"`, không có `noteEn`) rút từ chú giải nhóm HS 2017/2022 gán giả xuống mã 8 số; `legal-notes-enriched.json` là bản làm giàu AI cũ. Cả hai tệp **không được `/api/notes` nạp** và bị gắn cứng `AI_CHUA_KIEM`. | Dữ liệu tóm tắt/làm giàu phái sinh do dự án biên soạn (**CC BY-SA 4.0** cho phần biên soạn của dự án, lưu ý nguồn gốc tóm tắt từ bản dịch chú giải chi tiết HS; chỉ dùng làm tín hiệu gợi ý, không làm căn cứ pháp lý). |

## Nội dung của WCO (ngoại lệ của CC BY-SA)

`data/wco-op/` và `data/luat-goc/wco.jsonl` chứa **Tuyển tập ý kiến phân loại (Compendium of Classification Opinions) của Tổ chức Hải quan Thế giới
(WCO), ấn bản HS 2022** — bản OCR tiếng Anh (`opinions.json`, `wco.jsonl`), bản dịch tiếng Việt không chính thức (`vi.json`) và các
câu trích dùng để kiểm sổ tay (`so-tay-trich.json`). Các ý kiến này **thuộc bản quyền của WCO**.

- **Tuyên bố của chủ dự án (Oz):** Oz tuyên bố **đã trả phí bản quyền** để sử dụng và công bố nội dung này, và công khai nó
  trong dự án này (CEO Oz xác nhận ngày 10/10/2026, áp dụng từ 11/10/2026). Dự án không giữ và không công bố chi tiết hợp
  đồng bản quyền.
- **Nội dung này KHÔNG được cấp phép theo CC BY-SA.** Giấy phép của dự án chỉ áp dụng cho công sức biên soạn của dự án.
  Mọi quyền khác đối với nội dung WCO thuộc WCO; muốn tái phân phối ngoài phạm vi Oz đã được phép, hãy liên hệ WCO.
- Bản dịch tiếng Việt là **bản dịch phái sinh, không chính thức** (máy dịch, soát mẫu; chỗ nghi lỗi OCR ghi `[?]`).
  Bản OCR có thể sai chữ/ký tự — đối chiếu bản gốc trước khi dẫn trong hồ sơ Hải quan.
- Phản hồi API trả nội dung WCO luôn kèm trường `banQuyen` ghi các điều trên.

## Quyền riêng tư

Dự án **không phát hành** bất kỳ thông tin khách hàng nào. Tờ khai hải quan gốc
nằm ở `data/oz-export/` — đã gitignore, không bao giờ commit.

Dữ liệu học từ tờ khai lịch sử (`data/oz-gold-final.jsonl`) chỉ giữ lại cặp *mô
tả hàng hoá ↔ mã HS*; tên doanh nghiệp, giá trị, đối tác, số tờ khai đều bị loại
bỏ trong quá trình import.

## Miễn trừ trách nhiệm

Dự án cung cấp **tài liệu tham khảo nghiệp vụ**, không phải phán quyết phân loại
của cơ quan Hải quan và không phải tư vấn pháp lý. Pháp luật XNK thay đổi liên
tục — luôn đối chiếu văn bản gốc còn hiệu lực tại thời điểm khai báo. Xem đầy đủ
ở [`LICENSE-DATA`](LICENSE-DATA).

## Đóng góp

Mọi đóng góp (code hoặc dữ liệu) được hiểu là cấp phép theo đúng giấy phép của
phần tương ứng: code → MIT, dữ liệu → CC BY-SA 4.0. Đừng gửi dữ liệu mà bạn
không có quyền chia sẻ, và **đừng gửi thông tin khách hàng**.
