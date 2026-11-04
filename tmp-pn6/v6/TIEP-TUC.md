# Tiếp tục vòng PN6 v6 (ghi 04/11 18:20)
- Nhánh dữ liệu: `so-hoa/pn6-c84` → PR #1010 (336 PN6 xanh, NHAP). Gộp khi CI xanh.
- Hàng chờ: `queue.txt` (27 gói, chạy theo thứ tự; gói đầu `g-c74-1-c83-1` đã nạp vào chat mới nhưng model báo "isn't available" lúc 18:18 — chạy lại).
- Chat Studio: mở chat MỚI trong tab (chat cũ 1qUvBM0q7UA6JfL1gCFTu_dB7ZbcI3OBB đã ~830k token): system = `system-v6.md`, prompt = gói; Run; Drive lưu trễ ~1 lượt.
- Thu hoạch: `tools/th2.sh <toolresult Drive>` (đọc `cho-thu-hoach.txt`), worktree `/home/claude/working/wt-c84` nhánh `so-hoa/pn6-c84` (phiên mới: clone lại, chạy ap.sh trong repo).
- Treo: `treo.txt` (103 PN6) — vòng sửa riêng, ưu tiên ch.87 (cong2-chong-lan, cong1-chua-so-hoa) kèm `--kiem`.
- Tỉ lệ đo được: 60–97 %/gói, trung bình ~75 %; ~3–4 phút/gói 30 PN6.
