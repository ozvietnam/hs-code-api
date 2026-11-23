import json, sys
P = sys.argv[1]
NGAY = "2026-11-23"
SUA = {
 37: dict(nhom=["9507", "5607", "5404"], batBuoc=["9507", "5607"], quyTac="QT1(thiếu dữ kiện → hỏi)",
   cauHoi="Dây đã được làm thành dây câu (gắn lưỡi, chì, phao, sẵn dùng) hay chỉ là dây/cước cuộn hoặc cắt đoạn chưa làm thành dây câu?",
   dap="Nếu đã làm thành dây câu (gắn lưỡi/chì/phao, sẵn dùng) → 9507; nếu chỉ là dây/cước cuộn hoặc cắt đoạn chưa làm thành dây câu → Phần XI (5607 dây bện; 5404 monofilament) (căn cứ: chuong:95:chu_giai:1c)",
   lyDo="Chú giải 1(c) Chương 95 loại dây/cước câu cá đã cắt đoạn nhưng chưa làm thành dây câu sang Phần XI; mô tả không nói đã làm thành dây câu hay chưa."),
 44: dict(nhom=["8538", "9033"], batBuoc=["8538", "9033"], quyTac="QT1(thiếu dữ kiện → hỏi)",
   cauHoi="Vỏ dùng cho bảng/tủ điều khiển điện (85.37) hay cho bộ điều khiển tự động (90.32)?",
   dap="Nếu vỏ cho bảng/tủ điều khiển điện 85.37 → 8538; nếu vỏ của bộ điều khiển tự động 90.32 → 9033 (căn cứ: chuong:90:chu_giai:2b, 2c; phan:84:chu_giai:2b)",
   lyDo="Loại bộ điều khiển chủ quyết định 8538 hay 9033; mô tả không nêu."),
 40: dict(nhom=["8424", "8483", "8484", "4016"], batBuoc=["8424"], quyTac="QT1(thiếu dữ kiện → hỏi)",
   cauHoi="Đệm chữ thập chỉ dùng cho máy phun 84.24, hay bản thân là hàng của một nhóm định danh (khớp nối 8483, gioăng 8484/4016)?",
   dap="Nếu là bộ phận chỉ dùng cho máy phun 84.24 và không thuộc nhóm riêng → 8424 (Chú giải 2(b) Phần XVI); nếu bản thân là khớp nối → 8483, gioăng/đệm kín → 8484 hoặc 4016 (Chú giải 2(a) Phần XVI)",
   lyDo="Bộ phận qua Chú giải 2 Phần XVI: nhóm định danh riêng thắng, còn không thì theo máy 8424; mô tả không nói đệm làm chức năng gì."),
}
rows = [json.loads(l) for l in open(P)]
for d in rows:
    s = SUA.get(d["ca"])
    if not s: continue
    d["suaNhan"] = {"boi": "QT", "ngay": NGAY, "lyDo": s["lyDo"], "truoc": {"ketQua": d["ketQua"], "nhom": d["nhom"]}}
    d.update(ketQua="PHAN_VAN", nhom=s["nhom"], nhomBatBuoc=s["batBuoc"], quyTac=s["quyTac"], cauHoi=s["cauHoi"], dapAnDieuKien=s["dap"],
             trichDan=s["lyDo"], heTra=None)
    d.pop("heStatus", None)
    if d["ca"] == 44: d["yeuToYeu"] = None
    if d["ca"] == 69: pass
for d in rows:
    if d["ca"] == 69:
        d["suaNhan"] = {"boi": "QT", "ngay": NGAY, "lyDo": "QT duyệt GIỮ nhãn CHOT 8423: cân bàn không thể có độ nhạy 5 cg; hệ hỏi ca này là hỏi thừa.", "truoc": None, "giuNhan": True}
open(P, "w").write("".join(json.dumps(d, ensure_ascii=False) + "\n" for d in rows))
