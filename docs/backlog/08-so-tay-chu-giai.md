# Bước 8 — Sổ tay chú giải: nâng phần đã đọc hiểu lên dạng máy dùng được

**Ngày:** 2026-10-07 · **Trạng thái:** 🔧 Kệ sách xong (HS 2022 #163, SEN 2022 #166); bước 1 xong 60 nhóm (#168); nhóm còn lại đóng gói giao agent ngoài ([giao việc](../giao-viec/so-tay-giao-ngoai.md)) · **Ai làm:** agent/dev của repo, làm dần theo mục "Cách làm"

| Bước | Trạng thái |
|---|---|
| Kệ sách: toàn văn chú giải HS 2022 + SEN 2022 | ✅ #162, #163, #166 |
| Máy kiểm nguồn `lib/so-tay.js` (`trich` nguyên văn, nhóm đích trong câu trích, ngưỡng số, dòng 8 số) + `npm run so-tay:check` | ✅ |
| 1. Dựng ~60 nhóm — `data/so-tay/` | ✅ 60 nhóm (#168), sau đó soát độc lập lại 09/10 — bài học: [so-tay-giao-ngoai](../giao-viec/so-tay-giao-ngoai.md) |
| 1a. Vòng 2: 60 nhóm hay gặp nhất trong tờ khai thật + soát độc lập cả hai vòng | ✅ 120 nhóm, 4.109 mục (#169) |
| 1c. Đợt 1 theo tần suất (#194): 32 nhóm, lô xếp theo ưu tiên | ✅ 152 nhóm, 4.930 mục, phủ 90,1 % tờ khai thật (#198) |
| 1d. Ý kiến WCO (#196) nối vào sổ tay: mục `yKienWco`, 430 ý kiến ở 97 nhóm (đợt 1: 25 nhóm hay gặp nhất, 93 ý kiến, phủ 42,5 % tờ khai; đợt 2: 337 ý kiến còn lại trong các nhóm đã có sổ tay); nguyên văn ở kho riêng, công khai chỉ có mã/số hiệu/năm/mô tả tự viết/dấu vết | ✅ (chưa soát ảnh trang gốc — `daSoatAnh:false`) |
| 1b. 1.076 nhóm còn lại — 180 lô xếp theo ưu tiên ([so-tay-lo.csv](../giao-viec/so-tay-lo.csv)); lô 8 đạt phủ 95 % | ⬜ |
| 2. Chạy khô các cổng (không AI) | ✅ 09/10 — trên 763 tờ khai giữ riêng thay cho 113 kết quả lưu trên .120; 4 cổng bật oan ≤ 3,2 % với 152 nhóm (mục "Trạng thái 09/10") |
| 3a. Nối sổ tay vào phản hồi ở **chế độ cố vấn** (`lib/so-tay-runtime.js`: `soTay.canGiaiTrinh` = kết cục C kiểu *nghi*, `soTay.yKienWco`; không đổi mã/trạng thái/prompt; tắt bằng `HS_SOTAY_RUNTIME=false`) | ✅ 10/10/2026 |
| 3b. Nối vào *quyết định* sau công tắc `HS_SO_TAY` (mặc định tắt; 4 cổng máy nghi + một lượt giải trình AI, kết cục CHANGED/EXPLAINED/UNRESOLVED/NO_TIME) | ✅ đo #193 đạt 13/10 (mục "Trạng thái 13/10") — **đã bật `gates` trên prod** |
| 4. Dựng đủ 1.269 nhóm | ⬜ |
| 5. Vòng sửa | ⬜ |

## Vì sao có bước này — và vì sao KHÔNG phải làm lại từ đầu

Dự án **đã** đọc hiểu chú giải cho đủ 1.269 nhóm (`data/chu-giai-heading.json`): `bao_gom` 815,
`khong_bao_gom` 737, `loai_tru` 811, `tinh_chat` 1.265, `phan_biet` 1.269, `nguon` 1.269. **Kệ sách
(nguyên văn) đã đủ từ 07/10/2026:** `nhom` = toàn văn Chú giải chi tiết **HS 2022** cho 1.228/1.228
nhóm (trừ ch.98, `phien_ban: '2022'`, #163); `chu-giai-chuong.json` 96 chương bản 2022; **SEN 2022**
theo mã 8 số ở `data/sen-2022.json` (395 mục, 683 mã; `lib/sen.js`) và trường `sen` của 236 nhóm;
`data/legal-notes-enriched.json` 1.039 mã có `tinh_chat` dạng cấu trúc (nguyên liệu / cấu tạo /
nguyên lý / mục đích). **Phần đọc hiểu
đã có.** Thứ còn thiếu là ba điểm khiến động cơ chạy thật chưa dùng được nó:

1. **Chưa có cấu trúc để máy chủ khớp.** `loai_tru` là chữ thô (có đoạn ghép vỡ, vd 8509:
   "nhóm 82.10 oặc quạt… (nhóm 84.14) út có gắn quạt"); máy chủ không biết câu nào đẩy sang
   nhóm nào, ngưỡng số nào, điều kiện nào là có/không.
2. **Chưa có con trỏ về nguyên văn.** Không chỉ được câu gốc để giải trình với Hải quan,
   không phân biệt được đoạn nào từ HS 2022 / 2017 / SEN.
3. **Luồng chạy chưa dùng đúng tầng.** `lib/engine-loop.js` cắt chú giải nhóm còn 300–450 ký
   tự rồi bơm cho AI; không có cổng nào đọc loại trừ/ngưỡng số bằng máy.

CEO chốt mô hình **ba tầng** (07/10/2026): *kệ sách* (nguyên văn, chỉ để dẫn chiếu) →
*sổ tay* (đã tiêu hoá, có cấu trúc, máy đọc được, AI đọc 2–4 nhóm/món) → *bộ não* (AI suy
luận lúc chạy). Chú giải dài **đọc kỹ không sót MỘT LẦN** khi dựng sổ tay, không phải mỗi
món. Bộ chuẩn HSCodeComp (2025) đo được: đưa luật thô cho AI làm **giảm** độ chính xác.

## Sổ tay là gì — lược đồ `data/so-tay/<nhom4>.json`

```jsonc
{
  "nhom": "8509", "phienBan": "HS2022+SEN2022", "dungTuNguon": ["chu-giai-heading.8509", "chu-giai-chuong.85#CG4"],
  "phamVi": "Thiết bị cơ-điện gia dụng có động cơ điện gắn liền.",           // 1–2 dòng
  "dieuKienVao": [                                                             // máy kiểm được khi có dữ kiện
    { "fact": "dung_trong_gia_dinh", "op": "=", "value": true, "nguon": "ch85.CG4 §1" },
    { "fact": "dong_co_dien_gan_lien", "op": "=", "value": true, "nguon": "nhom8509.nhom ¶1" },
    { "fact": "trong_luong_kg", "op": "<=", "value": 20, "ngoaiTru": ["máy đánh bóng sàn", "xay thức ăn", "ép trái cây"], "nguon": "ch85.CG4 §(B)" }
  ],
  "loaiTru": [                                                                 // CÓ NHÓM ĐÍCH → máy so với ứng viên
    { "dieuKien": "máy hút bụi", "sangNhom": "8508", "nguon": "nhom8509.loai_tru (a)" },
    { "dieuKien": "quạt, chụp hút có gắn quạt", "sangNhom": "8414", "nguon": "nhom8509.loai_tru (a)" },
    { "dieuKien": "máy giặt, máy sấy", "sangNhom": "8450|8451", "nguon": "…" }
  ],
  "phanBiet": [                                                                // câu hỏi có/không → AI hoặc người trả lời
    { "hoi": "Thiết bị có chức năng riêng không nêu ở nhóm nào khác của Chương 85?", "neuCo": "8543", "neuKhong": "8509", "nguon": "nhom8509.phan_biet" }
  ],
  "boPhan": { "quyTac": "Phần XVI CG2", "tomTat": "Bộ phận chuyên dùng → cùng nhóm máy; bộ phận công dụng chung → nhóm riêng", "nguon": "chu-giai-chuong.XVI#CG2" },
  "dong8": [                                                                   // điều kiện quyết định từng dòng VN
    { "hs": "85098010", "dieuKien": "là máy đánh bóng sàn", "nguon": "tax.85098010" },
    { "hs": "85098020", "dieuKien": "là thiết bị tiêu huỷ chất thải nhà bếp", "nguon": "tax.85098020" },
    { "hs": "85098090", "dieuKien": "không thuộc .10/.20", "loaiKhac": true }
  ]
}
```

Quy tắc bất biến: **mọi mục phải có `nguon` (mã nguồn) + `trich` (câu nguyên văn chép từ nguồn đó)**;
máy kiểm bằng `lib/so-tay.js` (chặt hơn `verifyQuote`: mọi đoạn của câu trích phải có nguyên văn, nhóm
đích loại trừ phải được nêu trong câu trích, ngưỡng số phải có trong câu trích); mục không dẫn được nguồn
thì bỏ, không giữ "cho đẹp". Mã nguồn: `nhom<4>.nhom|loai_tru|…`, `ch<2>.chuong`, `phan<2>.phan`,
`sen.<mã>`, `tax.<8 số>`.
`phienBan` ghi rõ 2017/2022/SEN để không trộn hai bản chú giải trong một mục.

### Mở rộng 11/10/2026 (#236 việc 2, CEO duyệt): nhãn loại nguồn + cây + tiêu chí 6 số

```jsonc
{
  "cay": {                                   // MÁY SINH từ lib/hs-tree.js (chữ số của mã) mỗi lần dựng/kiểm — không soạn tay
    "nguonLoai": "MAY_SUY", "sinhTu": "lib/hs-tree.js",
    "nut": [ { "id": "8504211", "cap": "TIEU_DE_QG", "cha": "850421", "tenVi": null, "tenEn": null, "suyRa": true }, "…" ],
    "tenDien": [                             // người soạn ĐIỀN tên cho nút bị lược / phân nhóm chưa có tên tiếng Việt — máy kiểm trích như mọi mục
      { "id": "8504211", "tenVi": "Máy biến đổi đo lường", "nguon": "sen.85042111", "trich": "…", "nguonLoai": "AI_DA_KIEM" }
    ]
  },
  "tieuChi6": [                              // tiêu chí kỹ thuật cấp 6 số có cấu trúc; nguồn chú giải/SEN/wco.<6 số>, KHÔNG tax.*
    { "hs6": "850421", "fact": "cong_suat_kva", "op": "<=", "value": 650, "donVi": "kVA", "nguon": "wco.850421", "trich": "…not exceeding 650kVA", "nguonLoai": "AI_DA_KIEM" }
  ],
  "dong8": [
    { "hs": "85044090", "dieuKien": "…", "loaiKhac": true, "nguon": "tax.85044090", "trich": "Loại khác", "nguonLoai": "AI_DA_KIEM",
      "tieuChi": null,                       // tuỳ chọn {fact, op, value, donVi}: phân biệt dòng này với anh em; số phải có trong trích
      "phamViLoaiKhac": { "nguonLoai": "MAY_SUY", "cha": "850440", "truAnhEm": ["8504401", "85044020", "85044030", "85044040"], "toTienCoTen": "850440", "dinhNghiaDuoc": true } }
  ]
}
```

- `nguonLoai` trên **mọi** mục (`lib/nguon-loai.js`): mục soạn = `AI_DA_KIEM` (máy đã kiểm trích; máy tự gán khi thiếu) hoặc `NGUOI_DUYET` (quy trình soát độc lập ghi); khối máy sinh = `MAY_SUY`. `AI_CHUA_KIEM` hay nhãn lạ → máy loại mục. Runtime (`lib/so-tay-runtime.js`) **không trích** mục `AI_CHUA_KIEM`.
- Máy kiểm cây `scripts/check-cay.mjs` (trong `npm test`): sổ tay lệch cây hiện hành (biểu thuế đổi) → đỏ; chỗ còn trống (lá chưa có `dong8`, nút ảo chưa có tên, phân nhóm chưa có `tieuChi6`) → báo, là việc của vòng soạn.
- Nâng cấp tệp cũ tại chỗ: `npm run so-tay:nang-cap` (chạy lại máy kiểm, không làm rơi mục).

## Cách làm (từng bước, mỗi bước có nghiệm thu)

1. **Dựng cho ~60 nhóm có trong bộ đo trước** (danh sách từ `bench-classify-llm` kết quả đã lưu
   trên .120 `/tmp/egcb/out/v5-*.json`; lấy nhóm của `truth`, `top`, `top3`). Script
   `scripts/build-so-tay.mjs`: đầu vào = `chu-giai-heading` + `chu-giai-chuong` (toàn văn) +
   `tax.json` dòng 8 số + `legal-notes-enriched.tinh_chat`; **một lượt AI/nhóm** (Gemini 3.8-flash
   hoặc M3) ép ra lược đồ trên; sau đó máy kiểm từng `nguon`. Mục không kiểm được → ghi vào
   `so-tay/_bao-cao.json` để người xem.
   *Nghiệm thu:* ≥ 95 % mục có nguồn kiểm được; CEO đọc 3–5 mục chấm "giống sổ tay của tôi".
2. **Chạy khô các cổng trên 113 kết quả đã lưu, KHÔNG gọi AI**: cổng loại trừ (nhóm đích ∈ ứng
   viên), cổng ngưỡng số, cổng bộ phận, cổng dòng 8 số. Báo bảng: mỗi cổng bật bao nhiêu lần,
   bật đúng (mã đang sai) / bật oan (mã đang đúng).
   *Nghiệm thu:* cổng nào bật oan > 10 % thì sửa tiêu chí, chưa nối.
3. **Nối vào `lib/engine-loop.js`** theo luồng 4 kết cục (xem dưới); gói vòng 2 chỉ còn: hồ sơ
   gốc + dòng biểu thuế các mã ứng viên + sổ tay 2–4 nhóm. Đo token/món trước–sau.
   *Nghiệm thu:* token/món giảm; "sai mà không cờ" không tăng; đúng 8 số không giảm quá sai số.
4. **Dựng đủ 1.269 nhóm** (chạy đêm, vài chục nghìn đồng), có báo cáo độ đầy đủ như #159.
5. **Vòng sửa:** phát hiện mục sai → issue/PR sửa `data/so-tay/<nhom>.json` (wiki/ADR nếu là quyết
   định nghiệp vụ) → `npm run so-tay:check` kiểm nguồn → dựng lại.

## Luồng dùng sổ tay lúc chạy (đã chốt với CEO 07/10)

Máy chủ không hiểu nghĩa; nó chỉ nhận ra chắc chắn **mã/nhóm nêu đích danh, ngưỡng số, từ khoá
vật liệu/cơ chế trong từ điển**. Mọi suy luận nghĩa còn lại là của AI nhưng phải trích dẫn.

| Kết cục | Khi nào | Làm gì |
|---|---|---|
| **A. Khẳng định** ("OZ đề xuất, đủ căn cứ" — chuyên viên ký mới thành mã khai) | Bảng quyết định đã duyệt khớp (duy nhất "100 %"); hoặc qua hết cổng B, không cổng C nào bật, AI có ≥ 1 điều kiện ĐẠT trích nguyên văn | Trả mã, không cờ |
| **B. Chặn cứng** | Mã không có trong biểu thuế; câu trích đặc tính không có trong hồ sơ gốc; nhãn dòng "trừ X / không có X" mà hồ sơ khớp từ điển ngược lại | Vòng 3 bắt buộc đổi/sửa; sau trần → chuyên viên |
| **C. Yêu cầu giải trình** (máy *nghi*, không kết luận) | Sổ tay nhóm đã chọn có loại trừ **đích danh** nhóm khác đang là giả thuyết / tiền lệ / made-in-china; hồ sơ ghi "bộ phận" mà mã là máy hoàn chỉnh (hoặc ngược lại); tiền lệ Oz ≥ 75 % hoặc ≥ 2 shop khác nhóm; hai mã cùng đủ điều kiện (GIR 3) | Vòng 3 chỉ nhận đúng câu hỏi + đúng đoạn luật (≤ 1.500 ký tự), phải trả lời bằng trích dẫn hồ sơ; qua → A và **lưu vào hồ sơ giải trình**; không → DE_XUAT |
| **D. Hỏi dữ kiện** | Điều kiện quyết định CHƯA RÕ và là điều kiện khẳng định về hàng | Câu hỏi thuộc tính (không nhắc mã) cho khách/nhân viên; có dữ kiện → chạy lại vòng 2 |

Ngân sách: vòng 2 mặc định ≤ 4.000 token/món. Chú giải dài chỉ vào khi C bật hoặc vòng 1 xin
đích danh điều khoản.

## Trạng thái 09/10/2026 — bước 2 + 3

**Mã:** `lib/so-tay-gates.js` (cổng + khối sổ tay cho gói vòng 2) · nối trong `lib/engine-loop.js` · chạy khô
`npm run so-tay:dry-run` (`scripts/so-tay-dry-run.mjs`, kết quả `data/so-tay/bao-cao/chay-kho.json`) · test
`scripts/test-so-tay-gates.mjs`, `scripts/test-engine-loop-so-tay.mjs` (AI giả).

**Bốn cổng (kết cục C — máy nghi, không chặn):**

| Cổng | Bật khi | Bật oan trên mã ĐÚNG (152 nhóm sổ tay → 651 mẫu có sổ tay; lượt đầu 120 nhóm/601 mẫu cho kết quả gần như nhau) |
|---|---|---|
| `SO_TAY_LOAI_TRU` | Sổ tay nhóm đã chọn loại trừ đích danh một nhóm khác, và **tên hàng** (danh từ đầu, trước định ngữ) chứa tên hàng của mệnh đề loại trừ | **3,2 %** (theo pool ứng viên: 16,9 % — không đạt; cả hai: 0,8 %) |
| `SO_TAY_NGUONG` | Điều kiện vào nhóm có ngưỡng khối lượng / điện áp / dung tích mà mọi số đọc được trong hồ sơ đều trái ngưỡng (trừ ngoại lệ "khối lượng bất kỳ") | 0,2 % |
| `SO_TAY_BO_PHAN` | Vòng 1 đọc ra hàng là **bộ phận** mà dòng chọn là hàng hoàn chỉnh, trong nhóm có dòng bộ phận riêng | 0,8 % |
| `SO_TAY_DONG8` | Chọn dòng "Loại khác" trong khi tên một dòng cụ thể cùng phân nhóm 6 số nằm trong tên hàng | 0,9 % |

Bài học chạy khô (đã sửa trước khi nối): khớp mọi mảnh của câu → bật oan cao ("Dây cáp điện **có đầu nối**" khớp
loại trừ "đầu nối … → 85.36"); chỉ khớp **danh từ đầu** của cả hai phía. "… and parts thereof" (7323.93) không phải dòng
bộ phận. Chiều ngược của cổng bộ phận (hàng "hoàn chỉnh" mà chọn dòng bộ phận) bỏ: bánh xe đẩy vừa là món hoàn chỉnh
vừa là bộ phận. Giới hạn của số đo: mã của luồng không AI sai quá xa (đúng nhóm 37,9 %) nên số **bật đúng** chưa nói
được gì — phải đo bằng AI thật.

**Luồng trong động cơ** (`HS_SO_TAY=gates`): sau khi qua mọi chốt chặn, cổng sổ tay nghi → **một** lượt giải trình:
câu hỏi + đúng đoạn luật có nguồn (≤ 1.500 ký tự), máy bổ sung chú giải + dòng biểu thuế của nhóm đích. AI đổi mã
→ `CHANGED`; giữ mã và mọi mục có câu trích **có thật trong hồ sơ gốc** → `EXPLAINED` (lưu `soTay.giaiTrinh[]` — hồ sơ
giải trình); không → `UNRESOLVED` + cờ `review` "Sổ tay chú giải: …"; hết giờ → `NO_TIME` + cờ. Không hỏi lần hai.
`HS_SO_TAY=full` thêm: nhóm đã có sổ tay thì gói vòng 2 dùng sổ tay thay chú giải thô bị cắt. `HS_SO_TAY_LOAI_TRU=
pool+phrase` đổi cổng loại trừ sang chế độ chặt hơn. Phản hồi có khối `soTay {mode, outcome, challenges[], giaiTrinh[]}`.

Sửa kèm: nhóm máy chủ bổ sung (chốt chặn "nhóm chưa kiểm", nhóm đích sổ tay) không còn bị cắt khỏi trần 4 nhóm của gói.

**Việc tiếp theo — cần máy có khoá AI (.120):**
```bash
for m in off gates full; do
  HS_CLASSIFY_ENGINE=loop LOOP_PROVIDER=gemini HS_SO_TAY=$m \
    node scripts/bench-classify-llm.mjs --engine=classify --set=gold --limit=80 --out=/tmp/so-tay-$m.json
done   # chạy mỗi chế độ ≥ 2 lần (chênh giữa 2 lần ±5–7 điểm)
```
Nghiệm thu bước 3 (giữ nguyên tiêu chí gốc): `wrongUnflagged` không tăng; đúng 8 số không giảm quá sai số;
`avgPromptCharsR2` của `full` giảm so với `off`; `soTay.changedHarmful` ≤ `soTay.changedHelpful`. Đạt → đặt
`HS_SO_TAY` trong `hs.env` rồi `deploy-safe.sh main --force`.

## Trạng thái 13/10/2026 — đo bằng AI thật (#193) xong, đạt với `gates`

Chạy đúng kịch bản trên .120 (image `8db37f90` = PR #190 sau khi gộp main; `LOOP_PROVIDER=gemini`,
bộ 80 mẫu vàng `--set=gold --limit=80`, mỗi chế độ 2 lượt, container đo biệt lập `hs-bench` tách khỏi
prod vì timer auto-deploy 5 phút thay container nhánh). Kết quả trung bình 2 lượt:

| Chế độ | Đ2 | Đ4 | Đ6 | Đ8 | Top3-Đ8 | "Loại khác" Đ8 | Sai-không-cờ | Cờ | Gói R2 (ký tự) | Cổng bắn / kết cục |
|---|---|---|---|---|---|---|---|---|---|---|
| off | 86,8 | 78,7 | 73,0 | 60,4 | 78,0 | 52,8 | 17,6 | 37,5 | 9.074 | — (chỉ cố vấn 3a bám 79–80/80) |
| gates | 86,3 | 78,8 | 72,5 | 60,1 | 76,9 | 50,0 | **16,3** | 35,1 | **8.987** | 4–5 lượt, toàn EXPLAINED, 0 CHANGED |
| full | 85,6 | 78,0 | 71,1 | 61,1 | 81,2 | 54,6 | 16,4 | 39,4 | 9.800 | 5–6 lượt: 4 EXPLAINED, 1 CHANGED (lợi), 1–2 UNRESOLVED |

Chênh giữa 2 lần cùng chế độ ±4–7 điểm (đúng như dự báo). Chấm 4 điều nghiệm thu:
1. Sai-không-cờ không tăng — **đạt** (off 17,6 → gates 16,3, full 16,4).
2. Đúng 8 số không giảm quá sai số — **đạt** (gates −0,3, full +0,7; đều gọn trong sai số run-to-run).
3. Gói `full` nhỏ hơn `off` — **không đạt** (9.800 > 9.074, +8 %); `gates` thì nhỏ hơn (8.987 < 9.074).
4. `changedHarmful` ≤ `changedHelpful` — **đạt** (0 hại; full có 1 đổi mã có lợi 84833090 → 84139190).

Đọc tay (#193 bước 3): **0 ca changedHarmful**; 2 ca UNRESOLVED (full, cổng `SO_TAY_DONG8`) đều là
cổng **nghi đúng hướng** — hệ đang chọn dòng "Loại khác" trong khi đáp án thật là dòng cụ thể cùng phân nhóm
(bộ xúc xắc 9503.00.60, bộ điều khiển DMX512 8537.10) — AI không giải trình được nên lên cờ chuyên viên,
đúng triết lý "máy nghi, không chặn". Không mục sổ tay nào sai nghĩa → không phải sửa `data/so-tay/`.

**Quyết định: bật `HS_SO_TAY=gates`** (full không tốt hơn rõ rệt và vướng điều gói). File đo gốc
`/opt/hs-bench/so-tay-{off,gates,full}-r{1,2}.json` giữ trên .120 (không commit — theo chuẩn không
ghi dữ liệu đo vào repo).

## Trạng thái 13/10/2026 (khuya) — CHỐT DÒNG 8 SỐ (#195): máy sẵn sàng, chưa đủ phủ để bật

**Đã xây (nhánh #195, đủ 3 tầng bóc→kiểm→chấm):** `dieuKienSo` có cấu trúc `{fact, op, value, donVi}`
trên 341 mục / ~40 nhóm sổ tay (máy kiểm `check-so-tay`: số + đơn vị nguyên văn trong trích, 0 lỗi);
op `LA` (chất liệu — bảng alias Việt + Hán dùng chung); op `HOAC` (phép chọn giữa các khoảng —
`phuongAn` nối OR trong, AND ngoài, có guard ngữ nghĩa "hoặc"); cổng `chotDong8()` trong
`lib/so-tay-gates.js` sau công tắc RIÊNG `HS_SO_TAY_DONG=on` (mặc định TẮT, độc lập `HS_SO_TAY`):
CHOT (đúng 1 dòng thoả, tự tin ≥85 + trích), LOAI_KHAC (phủ định HOÀN CHỈNH: mọi anh em có điều kiện
đã kiểm + đúng 1 dòng LK), THIEU_SO_LIEU (hỏi dữ kiện), TRANH_CAP (cờ chuyên viên), KHONG_THE_CHOT
(điểm mù — trả `chotDong.lyDo`).

**Chạy khô 763 tờ giữ riêng (mã đúng):** oan **0/663 (0%)**; máy xác nhận đúng dòng 10 ca; hỏi dữ kiện
2; cờ tranh cấp 1; còn **97,4% KHONG_THE_CHOT = bản đồ điểm mù** (1.119/1.230 PN6 chưa số hoá — top:
5407/6204/6104/6005/6006 dệt may, 3824, 9506, 9401/9405, 7019).

**Bench vòng 2 (gates vs gates+dong, 80 mẫu vàng, mỗi chế độ 2 lượt, container biệt lập trên .120):**

| Chế độ | Đ8 (2 lượt) | sai-không-cờ | cờ | lỗi |
|---|---|---|---|---|
| gates | 63,8 · 61,3 | 13,8 · 13,8 | 43,8 · 45 | 0 · 0 |
| gates+dong | 57,5 · 63,3 | 15 · 19 | 37,5 · 31,3 | 0 · 1 |

**Đọc số cho đúng:** cổng chốt dòng chỉ bắt lửa ~10/763 ca (**1,05%**) — trên 80 mẫu vàng ≈ 1 ca/lượt,
nên chênh lệch giữa hai chế độ (−2,2 điểm Đ8; +3,2 sai-không-cờ) là **nhiễu LLM** (nội bộ chế độ dong
lệch nhau 5,8 điểm), không kết luận được lợi hay hại. `changedHarmful` = 0 cả hai chế độ.

**Quyết định: GIỮ `HS_SO_TAY_DONG` TẮT ở prod** (kỷ luật #193: đo đủ mới bật; hiện chưa chứng minh
được lợi ích vì phủ quá mỏng). **Điều kiện mở khóa:** số hoá `dieuKienSo` cho PN6 của các nhóm hay
gặp (giao với #141 và các nhóm trong đề vàng): **9004, 8708, 6204, 6403, 9405, 7019, 8539** — đủ để
cổng bắt lửa >5% số mẫu; sau đó chạy lại bench này (script/kịch bản đã sẵn ở mục trên).

## Trạng thái 24/10/2026 — #411 `/api/so-tay-questions` đọc productText + `loai` + `tacDongThue` (phục vụ "Kỷ luật hỏi" phía ERP)

Bước 3 (câu chung TT 39/2018) trước đây chỉ lọc theo `facts`, không đọc `productText` → khách ghi
"van cổng inox 304 … đường kính trong 25 mm … PN16" vẫn bị hỏi lại 4 câu `required:true` (chặn nút
Gửi ở portal). Sửa (nhánh `feat/411-so-tay-questions-product-text`): đưa mô tả vào haystack của
`missingStructured` (cùng máy dò với `/api/classify`), vật liệu đọc thêm bằng bảng `MATERIALS` của
`chotDong8`; mỗi câu mang `loai` (`DONG_BIEU` · `CONG` · `TT39`); câu TT39 là tuỳ chọn khi có mô tả;
câu `DONG_BIEU` kèm `tacDongThue` (chênh MFN giữa các dòng 8 số cùng PN6 mà câu quyết định —
`lib/so-tay-gates.js#tacDongThueDong8`, chỉ tính, không đổi thứ tự). Không `productText` → payload y cũ.

Đo trên 5.133 mô tả thật có sổ tay (`data/oz-gold-final.jsonl`): câu TT39 **3,75 → 1,98/món (−47 %)**;
soát tay 40 câu bị bỏ: 0 bỏ sai, 1 ca mép (`form` bắt "thanh" trong "nút bịt thanh nẹp rèm"). Độ phủ
câu sắc vẫn là điểm nghẽn: 146 PN6 có `dieuKienSo` (88 phủ định hoàn chỉnh), **94/146 chênh MFN = 0**
(vd 3920.xx `be_day` đều 6 %) → việc tiếp theo (ngoài #411): nâng `tieuChi6` (181 nhóm / 1.427 tiêu chí)
thành câu sắc có trích để tăng "câu có căn cứ" (hiện 29/131 nhóm trên bộ 830 dòng ERP).

## Liên quan
- Bước 2 G-2 (bóc mệnh đề loại trừ thành cấu trúc) và bước 5 D-3 (định tuyến 6 số): sổ tay là
  cách làm chung cho cả hai.
- `data/decision-tables/` (30 bảng, 1 verified): là "sổ tay đã được CEO duyệt" cho nhóm đó — ưu
  tiên tuyệt đối, sổ tay tự động không ghi đè.
- #159 báo cáo độ đầy đủ chú giải; #162 toàn văn chú giải 5 tập.
- Động cơ hai vòng + chốt chặn: bước 7 đợt 2, `lib/engine-loop.js`.
