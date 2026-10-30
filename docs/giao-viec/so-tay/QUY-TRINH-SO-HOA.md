# Quy trình số hoá ranh giới MỘT phân nhóm 6 số (PN6) — cho thợ (agent code giá rẻ)

> #577 (L1-4). Một issue nhãn `job` = một PN6 = một nhánh = một PR. Claude soát và duyệt; thợ KHÔNG duyệt.
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

1. Đọc chữ nguyên văn của mục (trong `--goi`). Tách các ý (vế) của chữ.
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
8. Ý nói "(bao gồm …)", cách đo, ví dụ minh hoạ ⇒ KHÔNG thành điều kiện; ghi `ghiChuSoan` loai `DE_TRONG` giải thích.
9. Chữ dài > 300 ký tự (thường tiêu đề) ⇒ thêm `"trich": "<đoạn đầu> … <đoạn chứa bằng chứng>"` — mọi đoạn nguyên văn, đúng thứ tự.
   Còn lại KHÔNG ghi `trich`/`nguon` (máy tự chép nguyên văn).
10. Mỗi quyết định một ghi chú `ghiChuSoan` (loai `QUYET_DINH` | `DE_TRONG` | `CHONG_LAN` | `LECH_TIEN_LE` | `THIEU_KHOA_TU_VUNG` | `DUNG`).

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
7. `npm test` phải xanh (in `=== ALL TESTS PASSED ===`).

**Chồng lấn (`cong2-chong-lan`)** — làm theo thứ tự, dừng ở bước đầu tiên khớp:
1. Biên ≤/< sai, giá trị liệt kê sai ⇒ sửa.
2. Anh em dùng khoá khác nhau cho cùng một loại ý ⇒ đổi về một khoá.
3. Một dòng là phần còn lại có tên ⇒ `phanConLai`.
4. Hai câu chữ biểu THẬT SỰ không loại trừ nhau (vd "Rơ le kỹ thuật số" ↔ "dùng cho quạt điện") ⇒ khai
   `"chongLanVanBan": [{"cap": ["<hsA>", "<hsB>"], "lyDo": "… .A \"<chữ nguyên văn nhánh A>\" … .B \"<chữ nguyên văn nhánh B>\" …; không có căn cứ thứ tự"}]`
   — `lyDo` PHẢI trích trong ngoặc kép chữ của cả hai nhánh. Không khai cho chồng lấn do bộ so chữ hay do "khác" cuối dòng.
5. Không bước nào khớp ⇒ DỪNG.

## 5. Điều kiện DỪNG (không tự xử lý — báo Claude)

| Dấu hiệu | Ở đâu |
|---|---|
| Tầng không mã KHÔNG biểu diễn được | `--goi` in `!!! DỪNG — … TẦNG KHÔNG MÃ`; lỗi `cong1-tang-khong-ma-khong-dat` (tầng có nút `<pn6>~r<dòng>` thì khai `dieuKienNut`, không DỪNG) |
| Tiêu đề bị lược tên / tầng bị lược | `CHẶN: tieu-de-bi-luoc-ten`; lỗi `cong1-tieu-de-bi-luoc-ten`, `cong1-tang-bi-luoc` |
| Thiếu khoá từ vựng | spec dùng khoá lạ (`THIEU_KHOA_TU_VUNG`, mã 3), hoặc bạn ghi ghi chú `THIEU_KHOA_TU_VUNG` |
| Chồng lấn theo trục | lỗi `cong2-chong-lan-truc` |
| Phân nhóm có cờ tiền lệ mà bảng hiệu chỉnh CHƯA CÓ MỤC cho PN6 | `[CẦN BẢNG HIỆU CHỈNH TIỀN LỆ — … chưa có mục …]`; DỪNG `can-bang-hieu-chinh-tien-le:<pn6>:chua-co` (bảng đã có mục ⇒ không DỪNG) |
| Dòng không tới được mà không sửa được | lỗi `cong2-dong-khong-toi-duoc` sau khi đã thử đổi khoá |
| Cổng nào đó chỉ xanh được nếu bịa chữ / thêm điều kiện chữ không nói | bất kỳ |
| Quá 8 vòng sửa vẫn đỏ, hoặc dòng quá nhiều tổ hợp mà mẫu không tới được | `cong2-qua-nhieu-to-hop:<dòng>` |
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

### Cảnh báo còn lại và cách tôi xử lý
- <mã cảnh báo> — <đã đối chiếu tay / ghi chú gì>

### DỪNG (nếu có)
- <mã DỪNG> — <vì sao, mục nào>

### Tự kiểm (đánh dấu từng ô)
- [ ] Không đọc data/bench/*, data/oz-export/*
- [ ] Mọi trích nguyên văn từ nguồn của chính mục; không trích nguồn AI_CHUA_KIEM
- [ ] Không ghi nguonLoai/trangThai/duyet; không chạy --duyet/--tra-ve/--ap-dung
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
| Phần còn lại có tên | [`850131`](../../../data/ho-so/ranh-gioi/850131.json) ("Động cơ khác"), [`848190`](../../../data/ho-so/ranh-gioi/848190.json) ("Thân, loại khác") | `phanConLai` |
| Tầng không mã có tên | [`848310`](../../../data/ho-so/ranh-gioi/848310.json), [`853690`](../../../data/ho-so/ranh-gioi/853690.json) | `dieuKienNut` cho `<pn6>~r<dòng>` |
| ĐỎ đúng (không ép) | [`841459`](../../../data/ho-so/ranh-gioi/841459.json), [`854442`](../../../data/ho-so/ranh-gioi/854442.json) (thiếu khoá từ vựng), [`950300`](../../../data/ho-so/ranh-gioi/950300.json), [`850110`](../../../data/ho-so/ranh-gioi/850110.json) (dòng không tới được do giới hạn bộ so chữ), [`392690`](../../../data/ho-so/ranh-gioi/392690.json), [`401699`](../../../data/ho-so/ranh-gioi/401699.json) (chồng lấn theo trục) | khi nào để đỏ và DỪNG |

Các bản trên là JSON nháp do máy sinh; spec tương ứng của bạn chỉ chứa phần `dieuKienSo` / `ghiChuSoan` / `chongLanVanBan`.
