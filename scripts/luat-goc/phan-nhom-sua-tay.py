"""Sửa tay cho phan-nhom.py (M-15). Mỗi mục có trang (PDF, từ 1) và lý do. Không mục nào đổi chữ của văn bản gốc."""

# Dòng kết thúc khối: nằm sau khối nhưng không phải tiêu đề nhóm/chương. (trang, đầu dòng đúng nguyên văn)
KET_KHOI = [
    (629, "(*) Nếu một tên được sử dụng trong Danh mục chung quốc tế",
     "chú thích chân của danh mục hormon nhóm 29.37, in dưới khối 2937.11–2937.19; không thuộc chú giải phân nhóm"),
]

# Đoạn đứng dưới tiêu đề "Chú giải phân nhóm" nhưng không có dòng tiêu đề mã.
#   caNhom=True : câu nêu đích danh "các phân nhóm thuộc nhóm NN.NN" -> mỗi phân nhóm của nhóm đó một nút
#   caNhom=False: không nêu mã nào -> KHÔNG tạo nút, ghi vào báo cáo
KHONG_TIEU_DE = [
    (1525, "7210", "Với mục đích của các phân nhóm thuộc nhóm 72.10", True,
     "câu tự nêu phạm vi: các phân nhóm thuộc nhóm 72.10"),
    (1528, "7212", "Xem Chú giải cho các phân nhóm thuộc nhóm 72.10", False,
     "đứng dưới 72.12, không nêu phân nhóm nào của 72.12"),
    (1534, "7217", "Xem chú giải cho các phân nhóm thuộc nhóm 72-10", False,
     "đứng dưới 72.17, không nêu phân nhóm nào của 72.17"),
]

# Khối thiếu dòng "Chú giải phân nhóm" (chỉ có dòng "Phân nhóm NNNN.NN") – đã xem trang
THIEU_TIEU_DE_KHOI = [
    (1395, "6903", "dòng đầu trang 1395, ngay sau hết chú giải nhóm 69.03 ở trang 1394; nhóm có (+)"),
    (2273, "9030", "sau dấu *** cuối chú giải nhóm 90.30; nhóm có (+)"),
]

# Phần của khối là hình / công thức ảnh, không có trong lớp chữ: nút ghi trường `thieu`, KHÔNG chép vào nguyenVan.
# (trang tiêu đề khối, mã, ghi chú đọc từ ảnh trang). 70.19 (trang 1441–1448) chỉ có ảnh chụp minh hoạ, không chữ: ghi ở báo cáo thẻ.
HINH = [
    (943, ["401170"], "ảnh minh hoạ kiểu lốp, trang 943–944"),
    (944, ["401180"], "ảnh minh hoạ kiểu lốp, trang 944"),
    (1008, ["441871"], "hình minh hoạ sàn khảm, trang 1009"),
    (1224, ["560721"], "công thức dạng ảnh, trang 1224: R = 17.400/n - 18"),
    (1225, ["560741"], "công thức dạng ảnh ở mục (a), trang 1225: R = 32.400/n"),
    (1238, ["580122", "580132"], "hình tiết diện sợi dọc, trang 1238"),
    (1401, ["690740"], "toàn bộ nội dung là hình kèm tên chi tiết dạng ảnh, trang 1402"),
]
