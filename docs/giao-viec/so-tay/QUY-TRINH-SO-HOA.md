# Quy trình số hoá ranh giới MỘT phân nhóm 6 số (PN6) — cho thợ (agent code giá rẻ)

> #577 (L1-4). Một issue nhãn `job` = một PN6 = một nhánh = một PR. Claude soát và duyệt; thợ KHÔNG duyệt.
> Người soát (L1-4c) dùng bảng soát [`SOAT-RANH-GIOI.md`](SOAT-RANH-GIOI.md).
> Làm ĐÚNG thứ tự, từng bước. Không chắc ⇒ DỪNG (mục 4) — dừng đúng chỗ được tính là làm tốt, ép cho xanh là làm hỏng.

## 0. Luật cấm (vi phạm một điều = PR bị đóng)

1. **Không đọc** `data/bench/*`, `data/oz-export/*`, `data/bench/ho-so-lat-1.tu-vung.json` (bộ đề chấm điểm + tờ khai khách).
   Không mở, không grep, không đưa vào ngữ cảnh.
2. **Không trích nguồn `AI_CHUA_KIEM`** (`explanatory-notes`, `legal-notes-enriched`, `loai-khac-index`, `hs-context`,
   `tax-enriched`…). Chỉ trích nguồn mà `--goi` in ra cho đúng mục đó.
3. **Mọi câu trích (`trich`) chép NGUYÊN VĂN** từ nguồn của CHÍNH mục đó (dòng 8 số ⇒ `tax.<chính nó>`; tiêu đề ⇒
   `tieuDe.<chính nó>`). Giữ cả lỗi chính tả gốc. Được lược bằng "…"; ≤ 300 ký tự.
4. **Điều kiện chỉ nói điều câu trích nói.** Không thêm hiểu biết riêng, không thêm điều kiện để "tách" hai dòng.
5. **Không tự duyệt**: không ghi `nguonLoai`, `trangThai`, `duyet`; không chạy `--duyet`, `--tra-ve`, `--ap-dung`; không bao
   giờ gắn `CLAUDE_DUYET`.
6. **Không tự đặt khoá từ vựng** — chỉ dùng khoá `--tu-vung` in ra. Không sửa `data/tu-vung/*`, `lib/*`, `scripts/*`.
7. Chỉ sửa/thêm đúng 2 tệp: `docs/giao-viec/so-tay/spec/<pn6>.json` và `data/ho-so/ranh-gioi/<pn6>.json` (máy sinh).
8. Không `git push --force`, không `--no-verify`, không sửa lịch sử commit đã đẩy.

## 1. Chuẩn bị (một lần mỗi job)

1. Đọc [`LUAT-CHUNG.md`](LUAT-CHUNG.md) — đủ cả tệp. Đọc tệp này hết một lượt trước khi làm.
2. `git fetch origin main && git switch -c so-hoa/<pn6> origin/main`
3. Định danh phiên của bạn (ghi vào spec): `<định danh>#soan-<pn6>`
   - Claude: `https://claude.ai/code/session_…#soan-<pn6>`
   - Thợ khác: `cursor:<tên mô hình>:<yyyymmddThhmm>#soan-<pn6>` (vd `cursor:gpt-5-mini:20261031T0910#soan-830140`).
4. `node scripts/so-hoa-ranh-gioi.mjs --help` — xem lệnh. Mã thoát: **0 xanh · 1 đỏ (sửa được) · 2 spec/lệnh sai · 3 DỪNG**.

## 2. Đọc gói soạn

1. `node scripts/so-hoa-ranh-gioi.mjs --goi --pn6=<pn6>` (cần máy đọc: thêm `--json`).
2. Thấy dòng `!!! DỪNG — … TẦNG KHÔNG MÃ` hoặc `[CẦN BẢNG HIỆU CHỈNH TIỀN LỆ …]` hoặc mục `CHẶN: …` ⇒ **DỪNG** (mục 4).
3. Ghi ra giấy nháp, cho TỪNG mục trong danh sách:
   - `DONG8` có `(phần còn lại — KHÔNG ghi điều kiện)` ⇒ dòng "Loại khác" trần: **không** đưa vào spec.
   - `TIEU_DE` có tên (trong cây hiện `[id] tên`) ⇒ cần điều kiện ở `dieuKienNut`. Tiêu đề "Loại khác" trần ⇒ bỏ qua.
   - Mục có `nghi phần còn lại có tên` ⇒ xem bước 3.6.
   - Mục có `nghi THIẾU KHOÁ` ⇒ xem bước 3.7.
   - Dòng `vế phải phủ (cổng 5): [GIỚI HẠN] "…" · [MỞ] "…"` ⇒ MỖI vế đó phải có điều kiện đọc tới, hoặc miễn `BO_VE` có lý do
     (bước 3.11). Xem chi tiết: `node scripts/so-hoa-ranh-gioi.mjs --ve --pn6=<pn6>` (sau khi đã có bản nháp).
4. Xem từ vựng: `node scripts/so-hoa-ranh-gioi.mjs --tu-vung` (một khoá: `--tu-vung --khoa=<khoá>`), đọc kiểu, op, đơn vị,
   giá trị hợp lệ, cách đọc.
5. Có hạt giống ở `docs/giao-viec/so-tay/hat-giong/<pn6>.json` (issue sẽ nói) ⇒ chép nó sang
   `docs/giao-viec/so-tay/spec/<pn6>.json` làm điểm xuất phát, **nhưng vẫn kiểm từng điều kiện theo bước 3** — hạt giống do AI
   soạn, chưa ai duyệt; `loai` của ghi chú hạt giống do máy gán tạm (xem lại từng ghi chú); thay dòng `"phien": "ĐIỀN …"` bằng
   phiên của chính bạn (máy từ chối phiên còn chữ "ĐIỀN").

## 3. Viết spec `docs/giao-viec/so-tay/spec/<pn6>.json`

Khung:

```json
{
  "phienBan": "ranh-gioi-spec@1",
  "pn6": "<pn6>",
  "phien": "<định danh>#soan-<pn6>",
  "dong8": {
    "<hs8>": { "dieuKienSo": [ … ] }
  },
  "dieuKienNut": {
    "<id tiêu đề>": { "dieuKienSo": [ … ] }
  },
  "ghiChuSoan": [
    { "ma": "<hs8>", "loai": "QUYET_DINH", "ghiChu": "tax.<hs8>: \"<chữ>\" ⇒ <khoá> <op> <giá trị>" }
  ]
}
```

Cho TỪNG dòng có tên và TỪNG tiêu đề có tên, theo thứ tự:

1. Đọc chữ nguyên văn của mục (trong `--goi`). Tách các ý (vế) của chữ — `--goi` in sẵn các vế GIỚI HẠN / MỞ mà cổng 5 sẽ kiểm.
2. Với mỗi ý, chọn MỘT khoá từ `--tu-vung` (bảng cách viết ở `LUAT-CHUNG.md`):
   - số + đơn vị ⇒ khoá `SO`: `{"fact": "<khoá>", "op": "<=|<|>=|>", "value": <số>, "donVi": "<như chữ trích>"}`.
     "không quá" = `<=`, "dưới" = `<`, "trên" = `>`, "từ … trở lên" = `>=`. "1.000" = 1000, "22,38" = 22.38.
   - có/không ⇒ `CO_KHONG`: `{"fact": "<khoá>", "op": "CO"}`; chữ "Không …" ⇒ `"op": "KHONG"`.
   - một trong danh sách ⇒ `LIET_KE`: `{"fact": "<khoá>", "op": "TRONG", "value": ["<GIA_TRI>"]}` — giá trị lấy từ `--tu-vung`, chữ
     trích phải chứa một cách đọc của giá trị.
   - tên hàng ⇒ `{"fact": "tenLoai", "op": "TEN_LOAI", "value": "<chuỗi con nguyên văn>"}`; công dụng / dùng cho ⇒ `congDung`/`dungCho`
     với `"op": "CONG_DUNG"`. Mảng giá trị = "hoặc".
   - chất liệu ⇒ `{"fact": "chatLieu", "op": "LA", "value": "<vật liệu>", "viTri": "<nếu chữ nói vị trí>"}`.
3. **Các anh em cùng tầng dùng CÙNG khoá** khi chữ cho phép (vd đều `tenLoai`, hoặc đều `loaiCongTac`) — giảm chồng lấn giả.
   **Không đổi sang khoá khác để né cảnh báo** (vòng 4, lỗi lặp lại ở #620–#647): chữ "dùng cho …" ở tiêu đề và ở dòng con đều là
   `dungCho`; không viết tiêu đề bằng `congDung` hay dòng con bằng `tenLoai` chỉ để né `cong2-diem-mu` /
   `cong2-dong-khong-toi-duoc`. Đổi khoá làm máy mất phép so cùng trục — che lỗi chứ không sửa. Máy đã tự ghép giá trị
   "<dưới> <trên>" cho cùng khoá (#653); vẫn không tới được ⇒ DỪNG. Gợi ý nào của công cụ bảo đổi khoá là lỗi công cụ, báo Claude.
   - Ví dụ SAI (851762, PR #634): tiêu đề `8517624` "Thiết bị dùng cho hệ thống hữu tuyến…" ghi `congDung` "để tránh điểm mù với
     85176243 dùng dungCho"; `85176261` "Dùng cho điện báo hoặc điện thoại…" ghi `tenLoai` "sóng vô tuyến" "để tránh điểm mù với
     tiêu đề cha dùng congDung". ĐÚNG: cả ba ghi `dungCho` (chữ "dùng cho" ⇒ `dungCho`), để cảnh báo hiện ra cho người soát.
4. "Loại khác, <vế>" ⇒ chỉ ghi điều kiện của **vế** (máy tự phủ định anh em).
5. Mỗi ý có ngưỡng riêng ("A, ≤ 11 A; B, ≤ 1.000 V") ⇒ HOẶC: `{"op": "HOAC", "phuongAn": [[…ý A…], […ý B…]]}`. Không gộp ngưỡng
   của một ý cho cả dòng.
6. Phần còn lại CÓ TÊN ("Động cơ khác", "Cáp … plastic khác", "…, loại khác") ⇒ thêm `"phanConLai": true` vào mục (phủ định mọi anh
   em đứng trước). Chỉ phủ định một số anh em ⇒ `"phanConLai": ["<hs>", …]`. Nội dung chỉ là "các loại khác" (không có ý khẳng
   định riêng) ⇒ `{"dieuKienSo": [], "phanConLai": true}`. Chữ có "khác" mà KHÔNG phải phần còn lại ⇒ `"phanConLai": false` + ghi
   chú `QUYET_DINH` nói vì sao.
7. Một ý KHÔNG có khoá ⇒ để `"dieuKienSo": []` cho mục đó và thêm ghi chú
   `{"ma": "<mã>", "loai": "THIEU_KHOA_TU_VUNG", "khoaDeXuat": "<tên khoá>", "ghiChu": "<chữ nguyên văn cần khoá>"}`
   (khoá đề xuất: [`de-xuat-tu-vung-2.md`](de-xuat-tu-vung-2.md)) ⇒ sẽ DỪNG.
8. Ý nói "(bao gồm …)", "kể cả …", cách đo, ví dụ minh hoạ, ngoặc chú thích ("(corset)", "(LPG)") ⇒ KHÔNG thành điều kiện (cổng 5
   coi là PHU, không đòi phủ); ghi `ghiChuSoan` loai `QUYET_DINH` giải thích. **Nhưng** "gồm …" (consisting of) là GIỚI HẠN, kể cả
   khi đứng trong "kể cả …": 8536505 "công tắc điện tử, kể cả công tắc bảo vệ quá nhiệt điện tử **gồm một tranzito và một chip
   logic** …" — chữ Anh "including …, consisting of a transistor and a logic chip": "gồm …" giới hạn công tắc điện tử, phải phủ
   (máy tách thành vế GIỚI HẠN từ vòng 4). "bao gồm", "gồm cả" vẫn là kể cả.
   **Dòng "Loại khác" trần: KHÔNG ghi ghi chú `DE_TRONG`** (vòng 4, lỗi lặp lại ở gần hết PR #620–#647): dòng này không có điều
   kiện nào để "để trống" — ghi `DE_TRONG` chỉ bật cảnh báo `cong5-de-trong-chua-xu-ly` và bắt người soát giải quyết suông. Không ghi
   gì, hoặc nếu muốn ghi lại lý do thì dùng `QUYET_DINH`:
   `{"ma": "85181090", "loai": "QUYET_DINH", "ghiChu": "tax.85181090 \"Loại khác\" trần ⇒ không điều kiện (máy phủ định anh em)"}`. **Không dùng `DE_TRONG` để bỏ một vế GIỚI HẠN hay vế
   MỞ** — đó là đúng chỗ người soát đợt 2 (#659) tìm thấy 4/6 lỗi; cổng 5 cảnh báo mọi ghi chú `DE_TRONG` / "người soát xem" và
   `--duyet` từ chối tới khi người soát ghi kết luận (bước 3.11).
9. Chữ dài > 300 ký tự (thường tiêu đề) ⇒ thêm `"trich": "<đoạn đầu> … <đoạn chứa bằng chứng>"` — mọi đoạn nguyên văn, đúng thứ tự.
   Còn lại KHÔNG ghi `trich`/`nguon` (máy tự chép nguyên văn).
10. Mỗi quyết định một ghi chú `ghiChuSoan` (loai `QUYET_DINH` | `DE_TRONG` | `CHONG_LAN` | `LECH_TIEN_LE` | `THIEU_KHOA_TU_VUNG` | `DUNG` | `BO_VE`).
11. **Cổng 5 — phạm vi VẾ bổ nghĩa** (#659: 8,8% mục sai, gần hết kiểu này). Với mỗi mục có điều kiện:
    - **Vế GIỚI HẠN** ("không nhấp nháy", "có thể thao tác hoặc … tương tác …", "dùng cho/để/cho …", "bằng …", "của …" ngay sau danh
      từ đầu, biên số, "(trừ …)", "…, hoàn chỉnh", phần sau "Loại …") ⇒ phải có điều kiện mà chữ của nó nằm trong vế (giá trị
      `TEN_LOAI`/`CONG_DUNG` là chuỗi con của vế; số của `SO`; chữ đọc của `CO_KHONG`/`LIET_KE`/chất liệu). Bỏ vế giới hạn = điều kiện
      **RỘNG hơn chữ** ⇒ `cong5-ve-gioi-han-bi-bo`. Vế chỉ lặp chữ của tầng cha ("Cho xe …" dưới "Dùng cho xe thuộc nhóm 87.11") không
      cần phủ.
    - **Vế MỞ** ("… và các loại tương tự", "và các thiết bị tương tự", "và bộ phận của chúng", "và các loại … khác") ⇒ KHÔNG liệt kê
      đóng danh sách đứng trước nó thành điều kiện (quy ước 392690) — làm vậy là **HẸP hơn chữ** ⇒ `cong5-ve-mo-bi-bo`. Hai cách đúng:
      phủ chính vế mở ("X và bộ phận của chúng" ⇒ `{"op":"HOAC","phuongAn":[[tenLoai "X"],[laBoPhan CO, dungCho "X"]]}`), hoặc bỏ điều
      kiện liệt kê rồi miễn vế giới hạn chứa danh sách bằng `BO_VE` (dưới).
    - **Định ngữ chung** đi với MỌI danh từ đầu liên hợp — đối chiếu chữ Anh của cùng dòng: "Connection and contact elements **for wires
      and cables**" ⇒ "Đầu nối và các bộ phận … cho dây dẫn và cáp" là định ngữ CHUNG: tenLoai ["Đầu nối","các bộ phận"] + một điều kiện
      riêng cho "dây dẫn và cáp", không nhét định ngữ vào một giá trị tenLoai. "Fans and handscreens" ⇒ "kéo bằng tay" chỉ của màn che:
      `HOAC [[tenLoai "Quạt"], [tenLoai "màn che", cachDieuKhien BANG_TAY]]`. "Telephone patch panels" ⇒ "cáp điện thoại" chung cho cả
      "Phiến đầu nối" lẫn "khối đấu nối". Sai ⇒ `cong5-dinh-ngu-tach`.
    - **Không nuốt vế bổ nghĩa** (vòng 4, lỗi lặp lại):
      - "X và (các) bộ phận của chúng" là vế MỞ — không viết chỉ `tenLoai` "X". Vd 871410 .60 "Phanh và bộ phận của chúng" ⇒
        `{"op":"HOAC","phuongAn":[[{"fact":"tenLoai","op":"TEN_LOAI","value":"Phanh"}],[{"fact":"laBoPhan","op":"CO"},{"fact":"dungCho","op":"CONG_DUNG","value":"Phanh"}]]}`
        (nhiều anh em cùng mẫu: xem mục 4 "Quy ước X và bộ phận").
      - Chất liệu / loại của **hàng ĐÍCH** sau "dùng cho" thuộc về đích, không phải của hàng: "Phụ kiện dùng cho ống bằng gang đúc" ⇒
        `dungCho` "ống bằng gang đúc" (chuỗi con nguyên văn chứa cả chất liệu) — SAI: `dungCho` "ống" (bỏ vế "bằng gang đúc" ⇒ rộng
        hơn chữ) hoặc `chatLieu` "gang" (gán chất liệu của ống cho phụ kiện ⇒ sai trục).
    - **Giá trị LIET_KE định nghĩa đúng bằng các vế của tiêu đề** (quyết định GĐ vòng 4 — công cụ không đổi): vd tiêu đề 8536503 "Loại
      ngắt mạch khi có sốc dòng điện cao; loại đảo mạch dùng cho bếp…; công tắc micro; công tắc nguồn cho máy thu truyền hình…; công
      tắc cho quạt điện; công tắc xoay, … cho máy điều hòa không khí" ↔ `loaiCongTac` `NGAT_SOC_DONG` (nhãn của giá trị chính là sáu vế
      đó, xem `--tu-vung --khoa=loaiCongTac`). Máy chỉ neo được chữ đọc của giá trị ("công tắc micro"), các vế khác báo chưa phủ.
      Người soạn khai `BO_VE` cho từng vế còn lại với `lyDo` trích định nghĩa: "giá trị NGAT_SOC_DONG của loaiCongTac được định nghĩa
      (nhanVi tu-vung@2) đúng bằng sáu vế của tiêu đề 8536503, gồm vế này". Người soát L1-4c chấp nhận hoặc trả về. Không viết
      `DE_TRONG` / "người duyệt xem nhãn có khớp không".
    - **Máy tách vế đã sửa (vòng 4)** — không còn cần `BO_VE` cho: "có dải tần số từ 300 Hz đến 3.400 Hz" (một vế biên số, 85181011);
      "có hình dạng đặc biệt hoặc thích hợp để vận chuyển …" (một vế, chỉ khi chữ Anh cùng dòng có cấu trúc "shaped or fitted for" —
      39231020). Chữ "được thiết kế chỉ để" / "designed only for" đọc được bằng `chiHoacChuYeu` (85176243).
    - **Không phủ được** (thiếu khoá, hoặc quy ước đã đúc cho phép bỏ) ⇒ miễn vế TƯỜNG MINH:
      `{"ma": "<mã>", "loai": "BO_VE", "ve": "<nguyên văn vế, chép từ --ve>", "lyDo": "<vì sao bỏ vế mà không sai mã>"}`. `lyDo` rỗng,
      dưới 10 ký tự, "người soát xem", "DE_TRONG" ⇒ `cong5-bo-ve-ly-do` (không tính, vế vẫn đỏ). Thiếu khoá thật ⇒ vẫn ghi
      `THIEU_KHOA_TU_VUNG` (DỪNG) — `BO_VE` không thay cho DỪNG khi bỏ vế làm đổi mã.

## 4. Áp spec, kiểm, sửa — vòng lặp

1. `node scripts/so-hoa-ranh-gioi.mjs --ap-spec=docs/giao-viec/so-tay/spec/<pn6>.json`
2. Đọc mã thoát + từng dòng `✗` (lỗi) / `!` (cảnh báo) và dòng `→` (giải thích + cách sửa) ngay dưới. Muốn rõ hơn:
   `node scripts/so-hoa-ranh-gioi.mjs --giai-thich=<dán nguyên mã>`.
3. Mã 2 (spec sai) ⇒ sửa spec theo thông báo, quay lại 4.1.
4. Mã 1 (đỏ) ⇒ sửa ĐÚNG lỗi đầu tiên theo dòng `→`, quay lại 4.1. Tối đa **8 vòng**; quá 8 vòng vẫn đỏ ⇒ DỪNG.
5. Mã 3 (DỪNG) ⇒ sang mục 5.
6. Mã 0 (XANH) ⇒ đọc lại MỌI cảnh báo `!`:
   - `cong3-bien-khong-doc-duoc` ⇒ tự đối chiếu op/biên lần nữa với chữ; ghi ghi chú `QUYET_DINH` nói đã đối chiếu tay.
   - `nghi-phan-con-lai` ⇒ quyết `phanConLai` true/mảng hoặc `false`, ghi lý do.
   - `cong2-diem-mu` ⇒ ghi chú cho người soát.
   - `cong1-lay-mau` / `cong2-lay-mau` ⇒ cổng chỉ thử mẫu; ghi chú cho người soát.
   - `can-bang-hieu-chinh-tien-le-da-co` ⇒ soạn theo CHỮ BIỂU, ghi chú `LECH_TIEN_LE` trỏ mục bảng.
   - `cong2-chong-lan-van-ban` ⇒ cặp bạn đã khai, giữ.
   - `cong5-bo-ve` ⇒ vế bạn đã miễn; người soát sẽ đọc `lyDo` — kiểm lại lý do đứng được một mình.
   - `cong5-de-trong-chua-xu-ly` ⇒ ghi chú `DE_TRONG`/"người soát xem" của bạn chưa phải đã xử lý: thay bằng điều kiện, `BO_VE` có lý
     do, hoặc `DUNG`. Còn giữ ⇒ nói rõ trong PR mục "Cảnh báo còn lại".
7. `npm test` phải xanh (in `=== ALL TESTS PASSED ===`).
8. **Nhãn `tuVung`** của bản nháp = từ vựng runtime lúc chạy `--ap-spec` (hiện `tu-vung@2`). Nhánh soạn trước khi từ vựng đổi mang nhãn
   cũ: sau `git merge origin/main` chạy lại `--ap-spec` (nhãn tự đúng). Không sửa tay. (Claude sửa nhãn hàng loạt bằng
   `--nhan-tu-vung`: chỉ đổi dòng nhãn, bỏ qua bản NHAP mà sinh lại từ spec khác ngoài nhãn.)

**Chồng lấn (`cong2-chong-lan`)** — làm theo thứ tự, dừng ở bước đầu tiên khớp:
1. Biên ≤/< sai, giá trị liệt kê sai ⇒ sửa.
2. Anh em dùng khoá khác nhau cho cùng một loại ý ⇒ đổi về một khoá.
3. Một dòng là phần còn lại có tên ⇒ `phanConLai`.
4. Hai câu chữ biểu THẬT SỰ không loại trừ nhau (vd "Rơ le kỹ thuật số" ↔ "dùng cho quạt điện") ⇒ khai
   `"chongLanVanBan": [{"cap": ["<hsA>", "<hsB>"], "lyDo": "… .A \"<chữ nguyên văn nhánh A>\" … .B \"<chữ nguyên văn nhánh B>\" …; không có căn cứ thứ tự"}]`
   — `lyDo` PHẢI trích trong ngoặc kép chữ của cả hai nhánh, và ít nhất một câu trích là chữ NGUYÊN VĂN của chính một trong hai
   dòng của cặp (chỉ trích tiêu đề tổ tiên ⇒ `cong3-chong-lan-chi-trich-tieu-de`). Không khai cho chồng lấn do bộ so chữ hay do
   "khác" cuối dòng.
5. Không bước nào khớp ⇒ DỪNG.
6. **Chồng lấn theo TRỤC** (một nhánh chia theo tên cạnh nhánh chia theo công dụng — 392690, 401699, 854442 "Cáp ắc qui" ↔ "Dùng
   cho viễn thông…") ⇒ `cong2-chong-lan-truc`. Máy bắt cả ở cấp TIÊU ĐỀ/TẦNG (nhánh chồng ≥ 2 nhánh anh em khi cụm có tiêu
   đề, hoặc hai tiêu đề chia theo tên ↔ công dụng). Khai `chongLanVanBan` KHÔNG gỡ được trục — kể cả khai đủ mọi cặp; cặp khai
   trong cụm trục thành lỗi `cong2-chong-lan-van-ban-truc`. Thấy nhiều cặp chồng cùng một cặp tiêu đề ⇒ nghĩ tới trục trước.
   **Cấp DÒNG, kể cả chỉ 2 anh em** (quyết định GĐ vòng 4): hai dòng anh em, một dòng chỉ có khoá tên (`tenLoai`), dòng kia có khoá
   công dụng (`dungCho`/`congDung`), không chung khoá nào, chồng lấn thật ⇒ tên ↔ công dụng = trục — không khai
   `chongLanVanBan`; khai `chongLanTruc` (mục 4a, #683). Dòng có HOAC: xét từng phương án. Ví dụ 940541 (PR #627): .10 "Đèn pha", .20 "Đèn rọi khác" (tên) ↔ .30 vế B
   "đèn dùng cho phương tiện giao thông đường sắt, đầu máy, tàu thủy, …, bằng kim loại cơ bản" (công dụng) — đèn pha cho đầu máy thoả
   cả hai; khai `chongLanVanBan` .10↔.30, .20↔.30 ⇒ máy báo `cong2-chong-lan-truc` (cùng cấu trúc: 940542, 841459 .10↔.30). Ngược lại cặp có/không,
   liệt kê, số ↔ công dụng ("Rơ le kỹ thuật số" `loaiRoLe` ↔ "dùng cho quạt điện" — 853641) vẫn khai `chongLanVanBan` như bước 4.
   **Không DỪNG nữa (#683):** làm theo mục 4a.
7. **Quy ước "X và (các) bộ phận của chúng" giữa nhiều anh em** (quyết định GĐ vòng 4 — công cụ không đổi): vế này nghĩa là "X, hoặc bộ
   phận của X" ⇒ giữ đúng dạng `HOAC [[tenLoai X…], [laBoPhan CO, dungCho X…]]` (bước 3.11), không viết tắt thành tenLoai. Dạng này
   thường sinh `cong2-chong-lan` với các anh em chỉ có tên (vector "tenLoai Yên xe + là bộ phận + dungCho Khung"). Cổng 2 KHÔNG hạ
   chồng lấn so chữ tự do thành cảnh báo ở bất kỳ đâu (ngoại lệ duy nhất: chồng lấn TRỤC tên ↔ công dụng đã khai `chongLanTruc`, mục 4a) — đuôi `:khong-tat-dinh` chỉ là nhãn, chồng lấn vẫn là LỖI (LUAT-CHUNG, cổng 2;
   "tên cụ thể hơn thắng" là luật riêng, không phải nới chung). Vậy:
   - mọi cặp chồng lấn đều `:khong-tat-dinh` (hai bên chữ tự do) ⇒ vẫn đỏ ⇒ **DỪNG** (ghi chú `DUNG` nêu mẫu "X và bộ phận của chúng"
     nhiều anh em; không khai `chongLanVanBan`, không đổi khoá để né) — Claude/GĐ quyết riêng;
   - có cặp chồng lấn tất định (không có đuôi) ⇒ chồng lấn thật ⇒ **DỪNG**.
   Ca đã gặp: 871410 (PR #635) .30 "Khung và càng xe … và các bộ phận của chúng", .40, .60 "Phanh và bộ phận của chúng", .70 ↔ .10 "Yên
   xe", .20, .50 — 18 cặp, đều `:khong-tat-dinh`; 845290 (PR #633) .12/.92 "Bàn, tủ, chân máy và nắp và các bộ phận của chúng" ↔
   .11/.91. Cả hai: DỪNG. Không sửa bản nháp của người khác để thử.

### 4a. Chồng lấn trục — khai `chongLanTruc` (#683)

Khi `--kiem` báo `cong2-chong-lan-truc:<nút>:<các nhánh>` và bạn đã chắc chồng lấn KHÔNG do khoá/biên sai (bước 1–3 ở trên):

1. Xoá mọi cặp `chongLanVanBan` của cụm đó (nếu có).
2. Thêm vào spec — MỘT mục cho cả cụm, các nhánh là anh em cùng cha (nút in sau mã lỗi + các nhánh in sau dấu `:`):
   ```json
   "chongLanTruc": [{
     "nhanh": ["8544421", "8544422", "8544423"],
     "truc": { "8544421": "CONG_DUNG", "8544422": "CONG_DUNG", "8544423": "TEN_LOAI" },
     "cauHoiPhanBiet": "Cáp này là \"Cáp ắc qui\" (8544423) hay là cáp \"Dùng cho viễn thông\" (8544421/8544422)? …",
     "trich": { "8544421": "Dùng cho viễn thông, điện áp không quá 80 V", "8544422": "…", "8544423": "Cáp ắc qui" },
     "phanXu": null
   }]
   ```
   - `truc`: `TEN_LOAI` khi điều kiện RIÊNG của nhánh có khoá tên (`tenLoai`); `CONG_DUNG` khi có khoá công dụng (`congDung`,
     `dungCho`). Máy đối chiếu với khoá thật (`cong3-chong-lan-truc-truc-lech`). Mọi nhánh cùng một trục ⇒ không phải trục, DỪNG.
   - `trich`: chữ biểu NGUYÊN VĂN của chính từng nhánh (như `trich` của mục) — máy kiểm bằng cùng bộ kiểm của cổng 3.
   - `cauHoiPhanBiet`: một câu hỏi tiếng Việt, viết TỪ chữ biểu, giúp người khai/chuyên gia nói hàng thuộc nhánh nào; kết thúc
     bằng `?`. Không trả lời hộ, không nêu nhánh nào "ưu tiên".
   - **`phanXu` LUÔN `null`.** Chỉ Claude/người soát điền, và chỉ khi có nguồn kiểm được: chú giải nguyên văn (`CHU_GIAI`), tiền lệ
     qua bảng hiệu chỉnh (`TIEN_LE`), hoặc quyết định người duyệt (`NGUOI_DUYET {nguoi, ngay, quyetDinh, kenh}`). Spec có
     `phanXu` khác `null` ⇒ `spec-khoa-cam`. Không tự suy "mô tả cụ thể nhất" (GIR 3(a)), không ghi nhãn GIR.
3. `--ap-spec` rồi `--kiem`: cặp chồng giữa nhánh khác trục hết lỗi, còn cảnh báo `cong2-chong-lan-truc-da-khai` (giữ). Cặp ngoài
   cụm, cặp cùng trục vẫn là lỗi — sửa theo bước 1–3. Xoá ghi chú `DUNG` cũ của cụm nếu cổng đã xanh.
4. Lúc chạy, hàng thoả cả hai nhánh ⇒ hồ sơ trả chưa chốt `chong-lan-truc` kèm `cauHoiPhanBiet` — máy không tự chọn nhánh.

## 5. Điều kiện DỪNG (không tự xử lý — báo Claude)

| Dấu hiệu | Ở đâu |
|---|---|
| Tầng không mã KHÔNG biểu diễn được | `--goi` in `!!! DỪNG — … TẦNG KHÔNG MÃ`; lỗi `cong1-tang-khong-ma-khong-dat` (tầng có nút `<pn6>~r<dòng>` thì khai `dieuKienNut`, không DỪNG) |
| Tiêu đề bị lược tên / tầng bị lược | `CHẶN: tieu-de-bi-luoc-ten`; lỗi `cong1-tieu-de-bi-luoc-ten`, `cong1-tang-bi-luoc` |
| Thiếu khoá từ vựng | spec dùng khoá lạ (`THIEU_KHOA_TU_VUNG`, mã 3), hoặc bạn ghi ghi chú `THIEU_KHOA_TU_VUNG` |
| Chồng lấn theo trục mà không khai được `chongLanTruc` (mọi nhánh cùng trục, nhánh không có khoá tên/công dụng) | `cong0-chong-lan-truc-mot-truc`, `cong3-chong-lan-truc-truc-lech` không sửa được (khai được ⇒ mục 4a, không DỪNG) |
| Phân nhóm có cờ tiền lệ mà bảng hiệu chỉnh CHƯA CÓ MỤC cho PN6 | `[CẦN BẢNG HIỆU CHỈNH TIỀN LỆ — … chưa có mục …]`; DỪNG `can-bang-hieu-chinh-tien-le:<pn6>:chua-co` (bảng đã có mục ⇒ không DỪNG) |
| Dòng không tới được mà không sửa được | lỗi `cong2-dong-khong-toi-duoc` khi giá trị đã đúng chữ và anh em cùng khoá — KHÔNG đổi khoá để né (bước 3.3) |
| Cổng nào đó chỉ xanh được nếu bịa chữ / thêm điều kiện chữ không nói | bất kỳ |
| Quá 8 vòng sửa vẫn đỏ, hoặc dòng quá nhiều tổ hợp mà mẫu không tới được | `cong2-qua-nhieu-to-hop:<dòng>` |
| Vế giới hạn/vế mở không có khoá mà bỏ nó làm đổi mã 8 số | `cong5-ve-gioi-han-bi-bo` / `cong5-ve-mo-bi-bo` mà không viết được `lyDo` thật cho `BO_VE` ⇒ `THIEU_KHOA_TU_VUNG` hoặc `DUNG` |
| Bạn không chắc một điều kiện nói đúng chữ | — |

Khi DỪNG: giữ spec đến chỗ đã làm (mục chưa chắc để `"dieuKienSo": []` + ghi chú loai `DUNG`), chạy `--ap-spec` lần cuối, commit,
mở PR **draft** theo mẫu dưới với tiêu đề bắt đầu `[DỪNG]`, và bình luận trên issue: mã DỪNG + 1–2 câu vì sao. Không cố tiếp.

## 6. Commit + PR

1. `git add docs/giao-viec/so-tay/spec/<pn6>.json data/ho-so/ranh-gioi/<pn6>.json` (chỉ hai tệp này).
2. Commit: `feat(so-tay): số hoá ranh giới <pn6> (#<số issue>)` — thân commit: kết quả `--kiem` (XANH/ĐỎ/DỪNG).
3. `git push -u origin so-hoa/<pn6>` rồi mở PR vào `main` (nếu `gh pr create` lỗi 403:
   `gh api repos/ozvietnam/hs-code-api/pulls -X POST -f title=… -f head=so-hoa/<pn6> -f base=main -F draft=true -f body=…`).
4. Người soát: Claude (gắn `@claude` hoặc để Claude tự nhận). Không merge PR của chính mình.

### Mẫu PR (chép nguyên, điền `<…>`)

```markdown
## [L1-4] Số hoá ranh giới PN6 <pn6> — <XANH | DỪNG: mã>

Closes #<số issue>

### Kết quả máy
- `--ap-spec` mã thoát: <0|1|3>
- `node scripts/so-hoa-ranh-gioi.mjs --kiem --pn6=<pn6>`:
  ```
  <dán nguyên phần in ra>
  ```
- `npm test`: <=== ALL TESTS PASSED === | lỗi gì>

### Đã làm
- Dòng có điều kiện: <n>/<tổng dòng có tên>; tiêu đề có điều kiện: <n>/<tổng tiêu đề có tên>
- Khoá dùng: <danh sách khoá>
- phanConLai: <mã | không>
- HOAC: <mã | không>
- chongLanVanBan: <cặp + một câu lý do | không>
- chongLanTruc: <nhánh + trục + câu hỏi phân biệt | không> (phanXu luôn null)

### Cảnh báo còn lại và cách tôi xử lý
- <mã cảnh báo> — <đã đối chiếu tay / ghi chú gì>
- BO_VE: <mã: "vế" — lý do | không>

### DỪNG (nếu có)
- <mã DỪNG> — <vì sao, mục nào>

### Tự kiểm (đánh dấu từng ô)
- [ ] Không đọc data/bench/*, data/oz-export/*
- [ ] Mọi trích nguyên văn từ nguồn của chính mục; không trích nguồn AI_CHUA_KIEM
- [ ] Không ghi nguonLoai/trangThai/duyet; không chạy --duyet/--tra-ve/--ap-dung
- [ ] Mọi vế GIỚI HẠN / MỞ in ở `--ve` đều "phủ", "lặp chữ tổ tiên" hoặc "MIỄN (BO_VE)" có lý do thật; không vế nào bỏ bằng DE_TRONG
- [ ] Định ngữ chung (đối chiếu chữ Anh) gắn cho MỌI danh từ đầu; định ngữ riêng chỉ gắn cho danh từ của nó
- [ ] Không sửa tệp ngoài spec/<pn6>.json và data/ho-so/ranh-gioi/<pn6>.json
- [ ] Không force-push, không --no-verify

Người soát: Claude
```

## 7. Ví dụ đã làm (đọc để bắt chước — KHÔNG chép)

| Mẫu | Xem | Học gì |
|---|---|---|
| Ngưỡng số, 1 dòng có tên + Loại khác | [`830220`](../../../data/ho-so/ranh-gioi/830220.json) | `>` / `<=` theo chữ; ghi chú khi bộ đọc không đọc được biên |
| Có/không đơn | [`961700`](../../../data/ho-so/ranh-gioi/961700.json) | `CO_KHONG`, cachDocKhong |
| Công dụng "hoặc" | [`851680`](../../../data/ho-so/ranh-gioi/851680.json) | mảng = hoặc |
| Tiêu đề có tên + ngưỡng | [`841350`](../../../data/ho-so/ranh-gioi/841350.json), [`851830`](../../../data/ho-so/ranh-gioi/851830.json) | `dieuKienNut` |
| Liệt kê + "Loại khác, <vế>" + trích lược | [`853650`](../../../data/ho-so/ranh-gioi/853650.json) | `LIET_KE`, lược "…" tiêu đề dài |
| Tiêu đề lồng nhau | [`853669`](../../../data/ho-so/ranh-gioi/853669.json) | Loại khác ở nhiều tầng |
| Chữ biểu tự chồng lấn (khai đúng) | [`853641`](../../../data/ho-so/ranh-gioi/853641.json), [`853620`](../../../data/ho-so/ranh-gioi/853620.json) | `chongLanVanBan` trích hai nhánh |
| Chồng lấn trục tên ↔ công dụng (khai đúng) | [`854442`](../../../data/ho-so/ranh-gioi/854442.json) (cấp tiêu đề: "Cáp ắc qui" ↔ "Dùng cho viễn thông…"), [`940542`](../../../data/ho-so/ranh-gioi/940542.json), [`841459`](../../../data/ho-so/ranh-gioi/841459.json) (cấp dòng) | `chongLanTruc`, `phanXu: null` |
| Phần còn lại có tên | [`850131`](../../../data/ho-so/ranh-gioi/850131.json) ("Động cơ khác"), [`848190`](../../../data/ho-so/ranh-gioi/848190.json) ("Thân, loại khác") | `phanConLai` |
| Tầng không mã có tên | [`848310`](../../../data/ho-so/ranh-gioi/848310.json), [`853690`](../../../data/ho-so/ranh-gioi/853690.json) | `dieuKienNut` cho `<pn6>~r<dòng>` |
| ĐỎ đúng (không ép) | [`950300`](../../../data/ho-so/ranh-gioi/950300.json), [`850110`](../../../data/ho-so/ranh-gioi/850110.json) (dòng không tới được do giới hạn bộ so chữ), [`392690`](../../../data/ho-so/ranh-gioi/392690.json), [`401699`](../../../data/ho-so/ranh-gioi/401699.json) (chồng lấn theo trục, chưa khai `chongLanTruc`) | khi nào để đỏ và DỪNG |

Các bản trên là JSON nháp do máy sinh; spec tương ứng của bạn chỉ chứa phần `dieuKienSo` / `ghiChuSoan` / `chongLanVanBan` / `chongLanTruc`.
