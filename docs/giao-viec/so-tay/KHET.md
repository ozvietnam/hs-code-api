# KHET — nhóm 4 số có trần số học là TRẠNG THÁI CUỐI (GĐ chốt 20/11/2026)

> GĐ đúc từ 3 tiền lệ: **8501** (#1467 · OZV-1555), **8511** (#1470 · OZV-1558), **8517** (#1471 · OZV-1559).
> Khet là KẾT LUẬN ĐÓNG của nhóm trong cuốn chiếu — không phải việc còn treo cho thợ nhận thử tiếp.

## Định nghĩa

- **Trần số học**: tỉ lệ chốt đúng TỐI ĐA chỉ bằng sửa dữ liệu trong phạm vi thợ (spec ranh giới + tệp data được phép
  theo thẻ), đo bằng **≥ 2 biến thể data-only** trên farm cách ly (`HS_DATA_DIR=/tmp/...`); mọi biến thể đều < 95%
  ⇒ nhóm **không thể SẠCH V1** trong phạm vi thợ.
- **Khet hợp lệ** khi mọi hướng thoát chặn ở tệp CẤM với thợ (`scripts/bo-kiem-luat.mjs` sinh ca, `lib/**` cổng/demotion),
  và báo cáo chỉ ra đúng **tệp + cơ chế tường** cho từng ca (không đoán chung chung).

## Ba tiền lệ (số đo đã GĐ kiểm lại khi gộp)

| Nhóm | PR · thẻ | Trần số học | Cơ chế tường (gốc khet) | Báo cáo |
|---|---|---|---|---|
| 8501 | #1467 · OZV-1555 | 42/47 = 89,4% | Tường sib-nút BUOP-absence: fact "bước" không đọc được từ text ⇒ nút CHUA_BIET ⇒ demotion hạ dòng ĐÚNG, sống sót dòng SAI (bất đối xứng .41/.91, .51/.60, 850131 .70/.80) | `spec/8501-bao-cao-khet-luot{1,2}.json` |
| 8511 | #1470 · OZV-1558 | 16/24 = 66,7% | Neo nguyên văn vướng cổng 1 (không nhận giá trị cụm-dài); cần đổi `sinhCaNhom` giữ chữ tầng cho ca dưới `loaiKhacTran` | `spec/8511-bao-cao-khet.json` |
| 8517 | #1471 · OZV-1559 | 19/24 = 79,2% | `cong2` vector lai 851779 (chồng cụm tên ↔ công dụng không tách rời được bằng data) | `spec/8517-bao-cao-khet.json` |

## Luật (không mở lại từng nhóm)

1. **Nhóm khet không nhận thêm thẻ thử.** GĐ không giao, thợ không tự nhận lại để "gỡ nốt" — mọi biến thể data-only
   tiếp theo chỉ dời vị trí tường, không bỏ được (đã chứng minh ở 8501 lượt 1: 3 biến thể, mỗi biến thể 1 chotSai mới).
2. **Chỉ mở lại khi có MỘT trong:** (a) **ca 6 số trích được** từ nguồn thật (TB-TCHQ, tiền lệ hiệu chỉnh, biểu thuế bản
   mới) đủ số liệu để máy đọc được fact đang tường; (b) GĐ quyết đổi cổng/sinh-ca (`lib/so-tay-gates.js` demotion,
   `sinhCaNhom`, cổng 1 nhận cụm-dài) — khi đó mở **thẻ riêng do GĐ tự làm**, không trả về thợ; (c) biểu thuế đối chiếu
   mới đổi chữ làm vỡ tường cũ.
3. **Khet vẫn phải giữ `chotSai=0`, `chotLoaiKhacSai=0`, `nemLoi=0`** (toan-bieu). Phần không chốt được để
   `khongTheChot`/hỏi lại — chốt sai tệ hơn không chốt.
4. `dem-nhom-sach` **không đếm** nhóm khet vào SẠCH V1; theo dõi ở danh sách dưới (chỉ GĐ cập nhật).
5. **Thẻ khet đạt** khi thợ nộp: báo cáo `docs/giao-viec/so-tay/spec/<nhom>-bao-cao-khet.json` theo khuôn 3 báo cáo
   sẵn có (phiên bản `bao-cao-khet@N`, `ketQuaDo` từng biến thể kèm lệnh, cơ chế từng ca, lệnh tái hiện), PR chỉ thêm
   docs — không đổi data/lib.

## Danh sách nhóm khet (GĐ cập nhật khi chốt thêm)

- 8501 · 8511 · 8517 (cột ở bảng trên — đủ 20/11/2026).
