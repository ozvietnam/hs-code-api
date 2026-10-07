# Bước 8 — Sổ tay chú giải: nâng phần đã đọc hiểu lên dạng máy dùng được

**Ngày:** 2026-10-07 · **Trạng thái:** 📋 Thiết kế đã chốt với CEO, chưa làm · **Ai làm:** agent/dev của repo, làm dần theo mục "Cách làm"

## Vì sao có bước này — và vì sao KHÔNG phải làm lại từ đầu

Dự án **đã** đọc hiểu chú giải cho đủ 1.269 nhóm (`data/chu-giai-heading.json`): `nhom`
(phạm vi) 1.212, `bao_gom` 815, `khong_bao_gom` 737, `loai_tru` 811, `tinh_chat` 1.265,
`phan_biet` 1.269, `sen` 219, `nguon` 1.269; chú giải chương `data/chu-giai-chuong.json`
(97, chương 84/85 đã nạp lại toàn văn #162); `data/legal-notes-enriched.json` 1.039 mã có
`tinh_chat` dạng cấu trúc (nguyên liệu / cấu tạo / nguyên lý / mục đích). **Phần đọc hiểu
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

Quy tắc bất biến: **mọi mục phải có `nguon` trỏ tới một câu nguyên văn có thật** (máy kiểm bằng
`verifyQuote` của `lib/classify.js`); mục không dẫn được nguồn thì bỏ, không giữ "cho đẹp".
`phienBan` ghi rõ 2017/2022/SEN để không trộn hai bản chú giải trong một mục.

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

## Liên quan
- Bước 2 G-2 (bóc mệnh đề loại trừ thành cấu trúc) và bước 5 D-3 (định tuyến 6 số): sổ tay là
  cách làm chung cho cả hai.
- `data/decision-tables/` (30 bảng, 1 verified): là "sổ tay đã được CEO duyệt" cho nhóm đó — ưu
  tiên tuyệt đối, sổ tay tự động không ghi đè.
- #159 báo cáo độ đầy đủ chú giải; #162 toàn văn chú giải 5 tập.
- Động cơ hai vòng + chốt chặn: bước 7 đợt 2, `lib/engine-loop.js`.
