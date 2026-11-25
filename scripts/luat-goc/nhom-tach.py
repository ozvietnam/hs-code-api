#!/usr/bin/env python3
"""M-14: tách chú giải chi tiết NHÓM từ bản chữ -> data/luat-goc/nhom.jsonl. Tất định, không mạng, không AI.
  python3 scripts/luat-goc/nhom-tach.py <cgct-hs2022.txt> [--doi-chieu]
Đầu vào: pdftotext bản chữ Chú giải chi tiết HS 2022 Toàn tập, trang = thứ tự khối \\f (từ 1); mã nhóm đối chiếu data/tax.json.
Ranh giới (theo docs/mong/khuon-nut-luat.md và thẻ #1902):
  - đoạn bắt đầu tại tiêu đề nhóm NN.NN, chép đủ các dạng in: "10.01 -", "29.41-", "38.13- -", "90.20 -Máy", "29.31.", "38.07 ", "74.04 ", "8706 -";
  - cắt DANH SÁCH MÃ ngay sau tiêu đề (thuộc M-18);
  - cắt trước khối "Chú giải [chi tiết] phân nhóm" và dòng mã phân nhóm (thuộc M-15); đoạn không nêu mã của 72.12/72.17 giữ lại theo chỉ dẫn QT;
  - cắt trước Chương/Phần/Phân chương/TỔNG QUÁT/Chú giải của Chương (M-11/M-13), trước tham chiếu [NN.NN] (nhóm không có chú giải in);
  - phụ lục tiếng Anh (ANNEX / LIST OF / PHỤ LỤC) không đưa vào nút, in ra stdout để ghi báo cáo thẻ.
Nguyên văn tuyệt đối: chỉ nối dòng bị ngắt và bỏ dòng số trang ở đầu/cuối trang (đúng như phang() của cổng); mọi ký tự khác — kể cả dấu trang trí (*, ***) và ô số giữa trang — giữ nguyên."""
import json
import os
import re
import sys
import unicodedata

GOC = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TAX = json.load(open(os.path.join(GOC, "data/tax.json"), encoding="utf8"))
H4 = {k[:4] for k in TAX}

NGUON = {"vanBan": "Chú giải chi tiết HS 2022 (bản dịch kèm CV 1810/TCHQ-TXNK 2024)", "ban": "HS2022"}
SO_TRANG = re.compile(r"^\s*[—–-]\s*\d{1,4}\s*[—–-]\s*$")
CHI_SO = re.compile(r"^\s*\d{1,4}\s*$")
TRANG_TRI = re.compile(r"^\s*[*_]{3,}\s*$")
DAU_VIET = re.compile(r"[ăâđêôơưàảáãạằẳẵặấầẩẫậèéẹẻẽếềểễệìíĩỉịòóõọổốồộớờởỡợùúũụủứừửữựỳýỷỹĂÂĐÊÔƠƯ]")
# tiêu đề khối phân nhóm trong chú giải nhóm (M-15): "Chú giải phân nhóm." / "Chú giải Phân nhóm" / "Các chú giải chi tiết phân nhóm"
TIEU_DE_KHOI = re.compile(r"^\s*(?:các\s+)?chú\s+giải(?:\s+chi\s+tiết)?\s+(?:các\s+)?phân\s+nhóm\s*[.:]?\s*$", re.I)
MA = r"(?:\d{4}\s?[.]\s?\d{2}|\d{2}\.\d{2}\.\d{2}|\d{4}\s+\d{2})"
TIEU_DE_MA = re.compile(rf"^\s*(?:(?:Các\s+)?[Pp]hân\s+nhóm|Subheading)\s*:?\s*(?:từ\s+)?{MA}(?:\s*(?:,|và|đến|,\s*và)?\s*(?:phân\s+nhóm\s+)?{MA})*\s*(?:,\s*và|,|và)?\s*[.:]?\s*$")
NOI_MA = re.compile(rf"^\s*{MA}(?:\s*(?:,|và|đến|,\s*và)?\s*{MA})*\s*(?:,\s*và|,|và)?\s*[.:]?\s*$")
CHUONG = re.compile(r"^\s*Ch[uư]?[ơo]ng\s+\d+\s*:")  # "Chương" chuẩn và "Chuong 33" (trang 748, bản in thiếu dấu)
PHAN = re.compile(r"^\s*PHẦN\s+[IVX]+\s*:")
PHAN_CHUONG = re.compile(r"^\s*(?:Phân\s+[Cc]hương|PHÂN\s+CHƯƠNG)\s+[IVX]+\s*:")
TONG_QUAT = re.compile(r"^\s*TỔNG\s+QUÁT\s*$")
CHU_GIAI_CHUONG = re.compile(r"^\s*(?:[Cc]hú\s+giải(?:\s+bổ\s+sung)?)\s*[.:]?\s*$")
NHOM_BO = re.compile(r"^\s*\[(\d{2})\.\s?(\d{2})\]\s*$")
PHU_LUC = re.compile(r"^\s*(?:PHỤ\s+LỤC|ANNEX|LIST\s+OF|List\s+of)\b")
# tiêu đề nhóm: đủ các dạng in của bản chữ
TIEU_DE_GACH = re.compile(r"^\s{0,10}\(?(?P<c1>\d{2})\s?[.]\s?(?P<c2>\d{2})\s*[.]?\s*[-–—]+\s*(?P<rest>.+)$")
TIEU_DE_TRANG = re.compile(r"^\s{0,10}\(?(?P<c1>\d{2})\s?[.]\s?(?P<c2>\d{2})\s*[.]?\s+(?P<rest>[^\W\d_].+)$")
TIEU_DE_BON = re.compile(r"^\s{0,6}(?P<ma>\d{4})\s+(?:[-–—]+\s*)?(?P<rest>[^\W\d_].+)$")
MA6 = re.compile(r"^\s*(?:\d{4}[.]\d{2}|\d{2}\.\d{2}\.\d{2}|\d{4}\s+\d{2})(?:\s*[-–—:]\s*|\s*$)")
CAP = re.compile(r"^\s*[-–—]{1,3}\s+\S")


def sua_tay():
    """Sửa tay cho nhom-tach.py (M-14). Mỗi mục có trang (PDF, từ 1) và lý do. Không mục nào đổi chữ của văn bản gốc."""
    # Tiêu đề in sai mã nhóm: giữ nguyên văn dòng in, đổi mã NÚT theo mã 6 số in trong danh sách ngay dưới tiêu đề (đã xem trang).
    TIEU_DE_SAI = [
        (1543, "37.02-", "7302", "tiêu đề in '37.02-' giữa Chương 73; danh sách mã ngay dưới là 7302.10/30/40/90 — lỗi in của nhóm 73.02 (nhóm 37.02 thật ở trang 804)"),
        (2263, "90.20 -Máy", "9029", "tiêu đề in '90.20 -Máy đếm…' đứng sau nhóm 90.28; danh sách mã ngay dưới là 9029.10/90 — lỗi in của nhóm 90.29 (nhóm 90.20 thật ở trang 2226)"),
    ]
    # Thân chú giải nhóm 29.37 in TIẾP SAU các bảng phụ lục tiếng Anh (trang 595–625): dòng này chấm dứt phụ lục, mở đoạn tiếp theo.
    PHUC_LUC_TIEP = [
        (625, "(C) PROSTAGLANDINS", "2937", "thân chú giải nhóm 29.37 (mục C) in tiếp sau bảng phụ lục tiếng Anh, cùng trang 625"),
    ]
    # Đoạn đứng dưới tiêu đề "Chú giải phân nhóm" mà KHÔNG nêu mã phân nhóm nào: QT chỉ định thuộc kho nhóm (M-14).
    #   Đoạn "Với mục đích của các phân nhóm thuộc nhóm 72.10" (trang 1525) tự nêu phạm vi theo nhóm -> M-15 đã nhận, không nhận ở đây.
    KHONG_MA = [
        (1528, "Xem Chú giải cho các phân nhóm thuộc nhóm 72.10", "7212", "QT chỉ định ở #1902: đoạn không nêu mã phân nhóm nào của 72.12"),
        (1534, "Xem chú giải cho các phân nhóm thuộc nhóm 72-10", "7217", "QT chỉ định ở #1902: đoạn không nêu mã phân nhóm nào của 72.17"),
    ]
    return TIEU_DE_SAI, PHUC_LUC_TIEP, KHONG_MA


def doc(tep):
    """-> [(trang, dòng)] đã NFC. Bỏ đúng như cổng kiem-luat-goc.mjs phang(): dòng trống / dòng số
    (— n —, n) ở ĐẦU và CUỐI trang; giữ nguyên mọi dòng giữa trang (kể cả bảng số, dấu *)."""
    t = unicodedata.normalize("NFC", open(tep, encoding="utf8").read())
    rong = lambda x: not x.strip() or re.match(r"^\s*[—–-]?\s*\d{1,4}\s*[—–-]?\s*$", x)
    ra = []
    for i, p in enumerate(t.split("\f"), 1):
        d = p.split("\n")
        while d and rong(d[0]):
            d.pop(0)
        while d and rong(d[-1]):
            d.pop()
        ra += [(i, x.rstrip()) for x in d]
    return ra


def ma_tieu_de(d):
    """-> mã nhóm 4 số nếu dòng là ứng viên tiêu đề nhóm, không thì None.
    Dạng có dấu nối nhận cả tên không dấu (nhiều tên hoá chất: "28.32 - Sulphit; thiosulphat.");
    dạng không dấu nối / in mã 4 số buộc có dấu tiếng Việt để không nhặt dòng mã và dòng bảng tiếng Anh."""
    for rx in (TIEU_DE_GACH, TIEU_DE_TRANG, TIEU_DE_BON):
        m = rx.match(d)
        if not m:
            continue
        rest = m.group("rest").lstrip(" \t-–—").strip()
        ma = (m.group("c1") + m.group("c2")) if "c1" in m.groupdict() else m.group("ma")
        if ma not in H4 or not rest or not rest[0].isupper():
            continue
        if rx is not TIEU_DE_GACH and not DAU_VIET.search(rest):
            continue
        return ma
    return None


def noi_dong(ds):
    """Nối dòng bị ngắt thành đoạn. Xuống đoạn khi: dòng sau là mục/gạch đầu dòng/tiêu đề HOA, dòng trang trí (***), hoặc dòng trước là câu đã đủ."""
    MUC = re.compile(r"^\s*(?:\((?:[a-zđ]{1,4}|[A-Z]{1,3}|\d{1,2})\)|\d{1,2}[.)]|[-–•])\s")
    HOA = re.compile(r"^\(?[A-ZĐÀ-Ỹ0-9][\sA-ZĐÀ-Ỹ0-9(),.:;/&'+-]{7,}\)?$")
    doan = []
    for _, d in ds:
        s = re.sub(r"\s+", " ", d.strip())
        if not s:
            continue
        if TRANG_TRI.match(s) or s == "*":  # dấu trang trí: giữ nguyên văn, mỗi dấu một dòng
            doan.append(s)
            continue
        if re.match(r"^\d{1,4}$", s) and doan and doan[-1] != "":  # ô số của bảng: nối vào dòng trên
            doan[-1] = doan[-1] + " " + s
            continue
        if doan and doan[-1] != "" and not TRANG_TRI.match(doan[-1]) and doan[-1] != "*":
            truoc = doan[-1]
            if MUC.match(s) or HOA.match(s):
                doan.append(s)
                continue
            if s[0].islower() or truoc.endswith(("-", "–", "/")) or truoc.endswith(","):
                doan[-1] = truoc + " " + s
                continue
            if len(truoc) + 1 + len(s.split(" ")[0]) >= 76 and not (re.search(r"[.:;]$", truoc) and len(truoc) < 80):
                doan[-1] = truoc + " " + s
                continue
        doan.append(s)
    return "\n".join(doan).strip("\n")


def rut(L):
    """-> (nhóm, phụ lục, tham chiếu, kiểm tra). nhóm: {mã: [đoạn]}, đoạn: {'tieuDe', 'than', 'trang', 'ghiChu'}."""
    TIEU_DE_SAI, PHUC_LUC_TIEP, KHONG_MA = sua_tay()
    nhom, phu_luc, tham_chieu, ktra = {}, [], [], {"khoi_khong_ma": [], "tieu_de_giua_doan": []}
    ghi_chu_nhom = {}
    tim_thay = set()
    ma, che_do, doan, tieu_de, pl = None, "ngoai", None, None, None
    khoi_da_ma = False
    cuoi_ma_hs = None
    chuong_cuoi = None   # chương của dòng "Chương N:" gần nhất
    ma_cuoi = None       # nhóm tìm thấy gần nhất

    def hop_le(ma_moi):
        """Bản in xếp nhóm theo thứ tự tăng dần trong từng chương; tiêu đề hợp lệ phải nối tiếp thứ tự đó.
        Chặn dòng văn bản như '85.15. Những máy…' (tham chiếu nhóm đứng đầu dòng) giả làm tiêu đề."""
        if ma is not None:
            return ma_moi[:2] == ma[:2] and ma_moi > ma
        if ma_cuoi is not None and ma_moi[:2] == ma_cuoi[:2]:
            return ma_moi > ma_cuoi
        return chuong_cuoi is None or ma_moi[:2] == chuong_cuoi

    def dong_doan(vi):
        nonlocal doan
        if doan is not None and (doan["tieuDe"] or doan["than"]):
            nhom.setdefault(ma, []).append(doan)
        doan = None

    def dong_phu_luc(vi):
        nonlocal pl
        if pl is not None:
            pl["trangKetThuc"] = L[vi - 1][0] if vi else pl["trang"]
            phu_luc.append(pl)
            pl = None

    n = len(L)
    for k, (tr, d) in enumerate(L):
        s = d.strip()
        if tr <= 8 or not s:
            continue
        # (1) sửa tay: tiêu đề in sai mã
        claim = next(((a, b, c, g) for a, b, c, g in TIEU_DE_SAI if a == tr and s.startswith(b)), None)
        if claim:
            dong_doan(k); dong_phu_luc(k)
            ma, che_do, tieu_de, ma_cuoi = claim[2], "tieu_de", [(tr, d)], claim[2]
            tim_thay.add(ma)
            ghi_chu_nhom[ma] = claim[3]
            continue
        # (2) đang trong phụ lục tiếng Anh: chỉ thoát theo sửa tay, heading nhóm mới, hoặc biên giới chương/phần
        if che_do == "phu_luc":
            if next(((a, b, c, g) for a, b, c, g in PHUC_LUC_TIEP if a == tr and s.startswith(b)), None):
                dong_phu_luc(k)
                che_do, doan = "than", {"tieuDe": None, "than": [(tr, d)], "trang": tr,
                                        "ghiChu": "thân chú giải nhóm in tiếp sau bảng phụ lục tiếng Anh (xem báo cáo M-14)"}
                continue
            moi = ma_tieu_de(d)
            if moi and moi not in tim_thay and hop_le(moi) and DAU_VIET.search(d):
                dong_phu_luc(k); dong_doan(k)
                ma, che_do, tieu_de, ma_cuoi = moi, "tieu_de", [(tr, d)], moi
                tim_thay.add(moi)
                continue
            if CHUONG.match(d) or PHAN.match(d) or PHAN_CHUONG.match(d):
                dong_phu_luc(k); dong_doan(k)
                ma, che_do = None, "ngoai"
                m = CHUONG.match(d)
                if m:
                    chuong_cuoi = m.group(0).split()[1].rstrip(":").zfill(2)
                continue
            continue
        # (3) biên giới chương / phần / phân chương / tổng quát / chú giải chương
        if CHUONG.match(d) or PHAN.match(d) or PHAN_CHUONG.match(d) or TONG_QUAT.match(d) or CHU_GIAI_CHUONG.match(d):
            dong_doan(k); dong_phu_luc(k)
            ma, che_do = None, "ngoai"
            m = CHUONG.match(d)
            if m:
                chuong_cuoi = m.group(0).split()[1].rstrip(":").zfill(2)
            continue
        # (4) phụ lục tiếng Anh bắt đầu
        if PHU_LUC.match(d):
            dong_doan(k)
            pl = {"nhom": ma, "trang": tr, "trangKetThuc": None, "dongDau": s[:90]}
            che_do = "phu_luc"
            continue
        # (5) khối phân nhóm (M-15): chấm dứt đoạn hiện thời
        if TIEU_DE_KHOI.match(d):
            dong_doan(k)
            che_do, khoi_da_ma = "khoi", False
            continue
        if TIEU_DE_MA.match(d):
            dong_doan(k)
            che_do, khoi_da_ma = "khoi", True
            continue
        # (6) tiêu đề nhóm mới — đứng TRƯỚC nhánh khối phân nhóm để thoát khỏi khối
        moi = ma_tieu_de(d)
        if moi and moi not in tim_thay and hop_le(moi):
            if che_do in ("tieu_de", "ma_hs"):
                ktra["tieu_de_giua_doan"].append((tr, moi, s[:70]))
            dong_doan(k); dong_phu_luc(k)
            ma, che_do, tieu_de, ma_cuoi = moi, "tieu_de", [(tr, d)], moi
            tim_thay.add(moi)
            continue
        # (7) tham chiếu [NN.NN]: nhóm không có chú giải in — đứng trước nhánh khối phân nhóm
        if NHOM_BO.match(d):
            dong_doan(k)
            tham_chieu.append((tr, s))
            ma, che_do = None, "ngoai"
            continue
        if che_do == "khoi":
            if NOI_MA.match(d):
                khoi_da_ma = True
                continue
            if ma is not None and not khoi_da_ma and not TRANG_TRI.match(s):
                km = next(((a, b, c, g) for a, b, c, g in KHONG_MA if a == tr and c == ma and s.startswith(b)), None)
                if km:
                    dong_doan(k)
                    che_do, doan = "than", {"tieuDe": None, "than": [(tr, d)], "trang": tr, "ghiChu": km[3]}
                    continue
                ktra["khoi_khong_ma"].append((tr, ma, s[:80]))
            continue
        # (8) gom dòng tiêu đề bị ngắt
        if che_do == "tieu_de":
            het = tieu_de[-1][1].strip()
            if (s[0].islower() or (s[0] == "(" and not re.search(r"[.:;]$", het))) and not MA6.match(d) and not CAP.match(d):
                tieu_de.append((tr, d))
                continue
            che_do, doan, cuoi_ma_hs = "ma_hs", {"tieuDe": tieu_de, "than": [], "trang": tieu_de[0][0]}, None
            tieu_de = None
            # xử lý tiếp dòng hiện tại ở chế độ danh sách mã
        if che_do == "ma_hs":
            if MA6.match(d) or CAP.match(d):
                cuoi_ma_hs = s
                continue
            if s[0].islower():
                continue
            if s[0].isdigit() and cuoi_ma_hs and not re.search(r"[.:;]$", cuoi_ma_hs):
                continue
            che_do = "than"
            # xử lý tiếp dòng hiện tại ở chế độ thân
        # (9) thân đoạn
        if che_do == "than":
            if doan is None:
                doan = {"tieuDe": None, "than": [], "trang": tr}
            doan["than"].append((tr, d))
            cuoi_ma_hs = None
            continue
    dong_doan(n); dong_phu_luc(n)
    return nhom, phu_luc, tham_chieu, ktra, ghi_chu_nhom


def gon(s):
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", s)).strip()


def tao_nut(nhom, ghi_chu_nhom):
    """-> danh sách nút theo thứ tự in. Tiêu đề nhóm in nguyên văn ở trường `so`; `nguyenVan` chỉ chứa thân đoạn
    (tiêu đề và thân bị danh sách mã HS chen giữa trong bản in, gộp lại sẽ làm vỡ đối chiếu nguyên văn từng câu)."""
    nut = []
    for ma in sorted(nhom, key=lambda m: min(x["trang"] for x in nhom[m])):
        for i, doan in enumerate(sorted(nhom[ma], key=lambda x: x["trang"]), 1):
            td = noi_dong(doan["tieuDe"]) if doan["tieuDe"] else None
            van = noi_dong(doan["than"])
            if not gon(van) and not td:
                continue
            nut.append({
                "id": f"nhom:{ma}:ct:{i}",
                "loai": "CHU_GIAI_CHI_TIET",
                "cha": None,
                "so": td,
                "nguyenVan": van,
                "lop": "HUONG_DAN",
                "nguon": dict(NGUON, trang=doan["trang"],
                              trangDen=doan["than"][-1][0] if doan["than"] else doan["trang"]),
                "hieuLuc": {"tu": None, "den": None},
                **({"ghiChu": doan["ghiChu"]} if doan.get("ghiChu") else {}),
            })
            if i == 1 and ma in ghi_chu_nhom:
                nut[-1]["ghiChu"] = ghi_chu_nhom[ma]
    return nut


def tu_kiem(L, nhom):
    """Mọi dòng gốc của mỗi đoạn phải nằm trong bản chữ đúng thứ tự (chỉ được bỏ dòng số trang / trang trí / trống)."""
    bo = [gon(d) for _, d in L if d.strip()]
    vi, sai = 0, []
    for ma in sorted(nhom, key=lambda m: min(x["trang"] for x in nhom[m])):
        for doan in sorted(nhom[ma], key=lambda x: x["trang"]):
            for _, d in [x for x in (doan["tieuDe"] or []) + doan["than"] if x[1] is not None]:
                g = gon(d)
                while vi < len(bo) and bo[vi] != g:
                    vi += 1
                if vi >= len(bo):
                    sai.append((ma, g[:70]))
                    vi = 0
                else:
                    vi += 1
    return sai


def doi_chieu(nut):
    """So với kho cũ data/chu-giai-heading.json .nhom: câu cũ không thấy trong kho mới, và chiều ngược lại."""
    CU = json.load(open(os.path.join(GOC, "data/chu-giai-heading.json"), encoding="utf8"))
    chu = lambda s: re.sub(r"[^\w]+", "", gon(s).lower())
    cau = lambda t: [c for c in re.split(r"(?<=[.;:])\s+", t) if len(c) > 25]
    moi = {}
    for x in nut:
        moi.setdefault(x["id"][5:9], []).append(x["nguyenVan"])
    cu_moi, moi_cu = [], []
    co_cu = {h for h, v in CU.items() if isinstance(v, dict) and gon(v.get("nhom") or "")}
    for h in sorted(co_cu):
        t = gon(CU[h]["nhom"])
        ca = chu(" ".join(moi.get(h, [])))
        sot = [c for c in cau(t) if chu(c) not in ca]
        if sot:
            cu_moi.append((h, len(sot), sot[0][:100]))
    for h in sorted(moi):
        if h not in co_cu:
            continue
        ca = chu(gon(CU[h]["nhom"]))
        sot = [c for c in cau(" ".join(moi[h])) if chu(c) not in ca]
        if sot:
            moi_cu.append((h, len(sot), sot[0][:100]))
    return co_cu, cu_moi, moi_cu


def main():
    a = [x for x in sys.argv[1:] if not x.startswith("--")]
    L = doc(a[0])
    nhom, phu_luc, tham_chieu, ktra, ghi_chu_nhom = rut(L)
    nut = tao_nut(nhom, ghi_chu_nhom)
    ra = os.path.join(GOC, "data/luat-goc/nhom.jsonl")
    os.makedirs(os.path.dirname(ra), exist_ok=True)
    with open(ra, "w", encoding="utf8") as f:
        for x in nut:
            f.write(json.dumps(x, ensure_ascii=False) + "\n")

    print(f"nút ghi ra data/luat-goc/nhom.jsonl: {len(nut)} nút / {len(nhom)} nhóm")
    co_cu, cu_moi, moi_cu = doi_chieu(nut)
    print(f"kho cũ .nhom không rỗng: {len(co_cu)} nhóm; nhóm có nút: {len(nhom)}")
    thieu = sorted(co_cu - set(nhom))
    them = sorted(set(nhom) - co_cu)
    print(f"  cũ có, mới THIẾU nút: {thieu}")
    print(f"  mới có, cũ không có: {them}")
    print(f"nhóm trong biểu không có nút (in tham chiếu [NN.NN] hoặc không có chú giải in): {len(H4 - set(nhom))}")
    print(f"  tham chiếu [NN.NN]: {len({x[1] for x in tham_chieu})} nhóm, {len(tham_chieu)} dòng")
    print(f"phụ lục tiếng Anh tách ra (không vào nút): {len(phu_luc)}")
    for pl in phu_luc:
        print(f"   nhóm {pl['nhom']} | trang {pl['trang']}-{pl['trangKetThuc']} | {pl['dongDau']!r}")
    sai = tu_kiem(L, nhom)
    print(f"tự kiểm dòng nguyên văn theo bản chữ: {'PASS' if not sai else 'FAIL'} ({len(sai)} dòng lệch)")
    for x in sai[:10]:
        print("   ", x)
    print(f"đoạn không nêu mã dưới tiêu đề khối (chỉ 72.12/72.17 được nhận vào nút): {len(ktra['khoi_khong_ma'])}")
    for x in ktra["khoi_khong_ma"]:
        print("   ", x)
    print(f"nghi tiêu đề nhóm xuất hiện giữa đoạn (kiểm tra thủ công): {len(ktra['tieu_de_giua_doan'])}")
    for x in ktra["tieu_de_giua_doan"]:
        print("   ", x)
    if "--doi-chieu" in sys.argv:
        print(f"kho cũ có, mới không ({len(cu_moi)} nhóm):")
        for x in cu_moi:
            print("   ", x)
        print(f"mới có, cũ không ({len(moi_cu)} nhóm):")
        for x in moi_cu:
            print("   ", x)


if __name__ == "__main__":
    main()
