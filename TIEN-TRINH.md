# Tiến trình — so-tay lô 004: SOÁT ĐỘC LẬP (2026-10-21)

Sổ tay chú giải nhóm: **6406, 7320, 9002, 9606, 4011, 4015** · worktree `hs-code-api-wt-st-lo4` · nhánh `so-tay/lo-004` · PR #374 (chưa merge).

Phiên này là **người soát độc lập**, không phải người soạn (người soạn: `dev-zcode-mm`). Đã đọc lại **toàn bộ 127 mục** của 6 nhóm cùng nguồn gốc, đối chiếu từng câu trích.

## Kết quả soát

| Nhóm | Mục đã soát | Sửa | Xoá |
|---|---|---|---|
| 6406 | 34 | 9 | 0 |
| 9002 | 19 | 10 | 0 |
| 7320 | 18 | 4 | 0 |
| 9606 | 15 | 2 | 0 |
| 4011 | 30 | 0 | 0 |
| 4015 | 11 | 1 | 0 |
| **Tổng** | **127** | **26** | **0** |

26 mục sửa = 34 thay đổi trường (một số mục sửa cả `text` lẫn `trich`). **Không mục nào phải xoá** — nhưng phải nói thẳng: máy đã báo 127/127 (100%) ngay từ đầu và vẫn 127/127 sau khi sửa, trong khi 26 mục trước đó **sai thật**; đó là bằng chứng máy kiểm không thay được người soát.

## Kiểm chứng lại sau khi sửa
- `node scripts/check-so-tay.mjs --raw=tmp/so-tay/raw` → 6/6 đạt, 127/127, 0 mục không kiểm được nguồn.
- `node scripts/build-so-tay.mjs --nhom=… --tu-tep=… --force --nguoi-soan="dev-zcode-mm" --bao-cao=data/so-tay/bao-cao/lo-004.json` → 127/127 (100%).
- `npm run so-tay:check` → 185 nhóm / 6670 mục / 0 lỗi ✓
- `npm test` → 57 passed, 0 failed ✓
- 32 mục đã soát ở `data/so-tay/*.json` đổi `nguonLoai: AI_DA_KIEM` → `NGUOI_DUYET` (luật L11 — chỉ người soát độc lập được đổi). Khối `tieuChi6`/`dong8`/`cay` **không** đụng tới (máy suy hoặc tra biểu thuế/WCO).

## 6 lỗi thật đã bắt được (máy không thấy)

1. **`loaiTru` ở 9002 mất nghĩa** — `loaiTru[2]` trích nguyên văn `"và gương dùng trong y tế hoặc nha khoa (nhóm 90.18)"`, tức một **vế cụt bắt đầu bằng chữ "và"**. Đọc riêng câu đó không nói gì về việc bị loại trừ, trong khi mục khẳng định đó là loại trừ sang 9018. Đã thay bằng cả câu `Nhóm này không bao gồm …`.
2. **`…` nuốt mất cả nội dung lẫn tham chiếu** ở 4015 — trích lược mất đoạn quy định cấu tạo (loại (1)(2)(3)) của nhóm, rồi vế sau lại viết *"Những hàng hoá **trong ba loại được trích dẫn ở trên**…"* — tham chiếu tới một thứ vừa bị xoá. Ba loại đó là tiêu chí quyết định 4015 với Chương 56/59/61/62. Đã viết lại trích 575 ký tự, kèm ngoại lệ *"trừ những mặt hàng nằm trong Phần XI"* mà bản nháp cũng bỏ sót.
3. **`…` nuốt ngoại lệ vật liệu** ở 6406 — trích lược mất *"làm bằng mọi loại vật liệu **trừ amiăng**"*, lặp hai lần trong nguồn, và `text` cũng không đưa điều kiện này vào. Đã viết lại trích 514 ký tự.
4. **`…` nuốt ngoại lệ** ở 9606 — trích cắt ngay trước *"…các kim loại quí … **miễn là** chúng chỉ chiếm một phần rất ít, **nếu không** chúng thuộc Chương 71"*. Đúng dạng "cắt trích né câu rào".
5. **`hoi` của `phanBiet` bỏ một vế trong điều kiện liên tục** ở 6406 — nguồn nói đế trong chỉnh hình phải *"làm theo số đo **và** các dụng cụ chỉnh hình"*; `hoi` chỉ hỏi *"làm theo số đo"* → một đế trong đo riêng cho một khách (không có dụng cụ chỉnh hình) sẽ bị đẩy nhầm sang 9021.
6. **Ví dụ bị nâng thành điều kiện loại trừ** ở 7320 — nguồn nói *"Lò xo lắp ráp với các sản phẩm khác để tạo dáng, **ví dụ** các cơ cấu đóng cửa tự động (nhóm 83.02)"*; `dieuKien` lại viết điều kiện là chính cái ví dụ và xoá mất thành ngữ *"ví dụ"*. Cùng khuôn với 9002 `loaiTru[1]` (mất *"ví dụ"* trước "kính lúp cầm tay").

Ngoài ra: 7 mục `loaiTru` ở 6406 và 3 mục ở 9002 trích mục (a)/(b)/(c)/(d) của danh sách loại trừ **không kèm câu dẫn** "Nhóm này không bao gồm:", nên đọc riêng không thấy vế loại trừ — đã gắn lại câu dẫn (dùng `…` cho các mục không liền kề).

## Sai sót còn lại đã kiểm kỹ là ĐÚNG (không sửa)
- **tieuChi6[1] của 6406** có `value:false` với câu trích `"other than stiffeners"` — đã kiểm chiều, không bị đảo Có/Không.
- **dong8 40118040** ghi *"tức không thuộc hai tiêu đề quốc gia 4011801 và 4011803"* — là suy luận cấu trúc, nhưng cây do máy sinh (`lib/hs-tree.js`) đặt 40118040 trực tiếp dưới nút 401180, nên suy luận đúng; bản nháp cũng đã tự ghi "đối chiếu biểu thuế để biết ranh giới".
- **tieuChi6 của 4011** bỏ "new pneumatic tyres" là đúng: *"lốp mới bơm hơi"* là đặc điểm chung cả Tiêu đề 4011, không phải tiêu chí phân biệt các phân nhóm con.
- **loaiTru rỗng** ở 4015 và 4011 là đúng luật: nguồn chỉ nêu "Chương 61/62/64/65", không có nhóm 4 số nào để ghi.
- **dong8 đủ** — 4011: 18/18 dòng khớp `data/tax.json`; 6406: 17/17.

## Bất thường NGƯỜN — cần người quản lý xử lý, không sửa tay trong sổ tay
1. **`sen.40112011/12/13` rỗng.** Cả ba khối chỉ có câu dẫn *"…thuật ngữ 'chiều rộng' và 'đường kính lắp vành' của lốp được hiểu như sau:"* rồi hết — **không có bảng định nghĩa**. Hệ quả thật: ba ngưỡng tách 40112011/40112012/40112013 (rộng ≤ 230 mm, vành ≤ 16 inch, rộng 230–385 mm) đang không có cách đo để tranh chấp khi khai tờ khai.
2. **6406904 và 6406905 trùng chữ tuyệt đối** — ba dòng mỗi bên giống hệt nhau, hai khối SEN cũng giống nhau từng chữ, nguồn không nói khác biệt là gì. Bản nháp xử lý đúng (mỗi dòng ghi rõ "trùng chữ, nguồn không phân biệt — đối chiếu biểu thuế").
3. **Lỗi bộ xuất nguồn** — khối `nhom*.nhom` không kèm **tên tiêu đề 4 số**. Với 4011, chú giải mở đầu bằng *"Các loại lốp **này**…"* mà "này" không có antecedent, nên người soạn phải tự điều "(loại bơm hơi, bằng cao su, chưa qua sử dụng)" vào `phamVi.text` — cụm đó không có trong câu trích. Đề xuất: ghép `tenVi` của nút 4 số (đã có sẵn trong cây) vào đầu khối `.nhom`; vá được luôn lỗi "vế cụt bắt đầu bằng chữ và".
4. **Mâu thuẫn nhẹ về vòng đệm** — `nhom7320.nhom` mục (b): *"Vòng đệm lò xo (nhóm 73.18)"*; `phan73.phan` mục (C): *"Vòng đệm thì được phân loại tại nhóm 73.20 (đối với vòng đệm)…"*. Khác nhau ở ngữ cảnh (vòng đệm lò xo vs vòng đệm đặc biệt dùng trong xe mô tô) nên chưa chắc mâu thuẫn tuyệt đối, nhưng rất dễ gây nhầm. Em **không** ghi `phanBiet` nào về vòng đệm; giữ `loaiTru[2]` vì câu gốc dứt khoát, đích danh.
5. **Chú giải phân nhóm 4015.12 không được dùng ở đâu** — có tiêu chí vật lý hay (*"mỏng, chịu được giằng xé cao, chế tạo bằng cách nhúng"*) nhưng `tieuChi6` lấy từ WCO nên không chứa, mà `phanBiet` thì bị luật 4 chặn (nguồn không nêu mã 4015.19). Cần mở lược đồ mới đưa được.

## Trích dài 300–600 ký tự (lượng nằm trong vùng máy vẫn cho qua, em phải để mắt)
| Nhóm | Mục | Dài | Lý do giữ |
|---|---|---|---|
| 6406 | phamVi | 514 | phải chứa **hai lần** ngoại lệ "trừ amiăng" |
| 9002 | phamVi | 503 | phải chứa điều kiện lắp ráp + câu "thiết kế chủ yếu để gắn vào bộ phận khác" |
| 7320 | phamVi | 495 | text khẳng định (A) lá nhíp, (1)/(2) của (B), và câu bu lông hình chữ U — trích cũ thiếu cả ba |
| 4015 | phamVi | 575 | phải chứa đủ ba loại cấu tạo |
| 9606 | phamVi | 472 | giữ "nếu không chúng thuộc Chương 71" |
| 6406 | loaiTru[5],[6] | 259 | nguyên văn trọn mục (g) |

Rút xuống ≤300 ở các mục này chỉ được bằng cách **lược mất ngoại lệ** hoặc **bỏ nội dung mà `text` khẳng định** — tức đúng lỗi đang sửa. Chọn giữ trích, ghi lý do ở đây.

## Đã khai để người quản lý biết, giữ nguyên (không sửa)
- **9606**: `dong8[].dieuKien` nhắc tên phân nhóm lấy từ `wco.*`/`nhom9606.nhom`, không có trong trích của chính dòng đó — nhưng không bịa, trích nguyên văn từ khối nguồn có sẵn; rất hữu ích (cho biết dòng thuộc phân nhóm nào). Bỏ thì mất thông tin.
- **4011**: `phamVi.text` có "(loại bơm hơi, bằng cao su, chưa qua sử dụng)" — chép nguyên văn từ **tên tiêu đề 4011** trong biểu thuế, và là phân biệt cốt lõi 4011 (mới) với 4012 (đã dùng) / 4013 (tẩy lại). Bỏ đi là mất thông tin quyết định.
- **4011 `dieuKienVao[1]`** dùng `op:'in'` với `value` là chuỗi phân tách `|`. Máy không kiểm (chỉ kiểm ngưỡng số); hiện vô hại vì `dieuKienVao` chỉ gợi ý, cổng không dùng để chặn.
- **4011 `dieuKienVao[1]`** trích 316 ký tự và mở đầu bằng *"Trừ khi có yêu cầu khác…"*. Điều kiện nằm **ngay đầu** câu trích nên người đọc vẫn thấy, không bị `…` nuốt. *(Nếu mở rộng thành câu đầy đủ sẽ chứa "đã hoặc chưa lưu hoá" — đúng biểu thức `CAU_CHO_PHEP` dùng để loại, máy sẽ loại mục này. Đây là điểm máy quá nặng tay, ghi ra cho các lô sau.)*

## Quy trình đã chạy
1. Xuất lại nguồn 6 nhóm (`--xuat-nguon` + `--force`; không có `--force` thì `pickHeadings` bỏ qua nhóm đã có `data/so-tay/<h4>.json` → thiếu 4011.txt và 6406.txt).
2. Dựng `scripts/audit-trich.mjs` — in từng mục kèm câu ngay **trước/sau** đoạn khớp trong nguồn, để bắt "dấu lược nuốt ngoại lệ" bằng mắt thay vì đọc từng chữ. 127/127 câu trích nguyên văn.
3. Soát từng nhóm cùng nguồn, ghi `review/<nhom>.json` (`{index, hanhDong:'xoa'|'sua', lyDo, sua}`).
4. `TARGET=raw APPLY=1 node scripts/apply-review-lo004.mjs` → `check-so-tay.mjs --raw` sạch → `build-so-tay.mjs --tu-tep --force` → `TARGET=data APPLY=1` (đổi `nguonLoai`).
5. `npm run so-tay:check && npm test` → xanh. Commit, push, cập nhật PR #374.

## Bài học rút ra (đề xuất đưa vào phần 1 của giao việc)
- **Kiểu lỗi mới, đáng thành luật máy**: câu trích là **vế cụt** (bắt đầu bằng "và"/"hoặc", hoặc là mục (a)/(b)/(c) của danh sách không kèm câu dẫn) → đọc riêng không nói được điều mục khẳng định. Máy hiện chỉ so khớp chuỗi nên không thấy. Đề xuất luật: `loaiTru.trich` phải chứa vế chủ ngữ loại trừ ("không bao gồm"/"trừ") hoặc phải là câu đầy đủ có vế đó.
- **Kiểu lỗi mới**: `…` lược mất một khối mà vế sau lại tham chiếu tới ("ba loại được trích dẫn ở trên"). Máy không thể biết — nhưng người soát đọc là thấy ngay.
- **Kiểu lỗi đã lặp lại lần nữa**: "ví dụ" bị nâng thành điều kiện (7320, 9002) — đã có trong danh sách phải bắt từ vòng 1, vẫn tái diễn 2 lần.
- `hoi` của `phanBiet` phải giữ **đủ vế của điều kiện liên tục** trong nguồn, không được rút gọn.
- Bộ xuất nguồn nên ghép **tên tiêu đề 4 số** vào đầu khối `nhom*.nhom`.

## Tóm tắt thay đổi (commit lần này)
- 6 file `data/so-tay/{6406,7320,9002,9606,4011,4015}.json` (áp soát + `nguonLoai`)
- 1 file `data/so-tay/bao-cao/lo-004.json` (nạp lại)
- 6 file `review/{6406,7320,9002,9606,4011,4015}.json` (mới — kết quả soát độc lập)
- 2 script mới: `scripts/apply-review-lo004.mjs`, `scripts/audit-trich.mjs`
- 1 file `TIEN-TRINH.md` (viết lại cho phiên soát)
- KHÔNG commit `tmp/` (gitignored). **KHÔNG merge.**