#!/usr/bin/env python3
"""M-14: tách chú giải chi tiết NHÓM thành từng ĐOẠN in -> data/luat-goc/nhom.jsonl. Tất định, không mạng, không AI.
  python3 scripts/luat-goc/nhom-tach.py <cgct-hs2022.txt> <doan-in-hs2022.tsv>
Đầu vào: bản chữ -layout (trang = thứ tự khối \\f, từ 1) và tệp ranh giới đoạn do nhom-doan-in.py rút từ cây cấu trúc của chính PDF đó; mã nhóm đối chiếu data/tax.json.
Phạm vi nhóm (rut, theo docs/mong/khuon-nut-luat.md và thẻ #1902):
  - thân bắt đầu tại tiêu đề nhóm NN.NN, chép đủ các dạng in: "10.01 -", "29.41-", "38.13- -", "90.20 -Máy", "29.31.", "38.07 ", "74.04 ", "8706 -";
  - cắt DANH SÁCH MÃ ngay sau tiêu đề (M-18), khối "Chú giải [chi tiết] phân nhóm" và dòng mã phân nhóm (M-15);
  - cắt trước Chương/Phần/Phân chương/TỔNG QUÁT/Chú giải của Chương (M-11/M-13), trước tham chiếu [NN.NN]; phụ lục tiếng Anh không vào nút.
Đoạn (tao_nut): mỗi đoạn in một nút; đoạn bị ngắt qua trang được nối; cha theo số hiệu mục, câu dẫn ':' và tiêu đề CHỮ HOA (dung_cay).
Nguyên văn tuyệt đối: chữ của nút là chữ đoạn in, trùng bản -layout từng ký tự; dấu trang trí (***) gắn cuối đoạn trước."""
import bisect
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
PHAN_CHUONG = re.compile(r"^\s*(?:Phân[\s-]+[Cc]hương|PHÂN[\s-]+CHƯƠNG)\s+[IVX]+\s*:")
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


# ─────────────────────────── ĐOẠN: mỗi đoạn in một nút ───────────────────────────
MUC_RX = re.compile(r"^(?:(?:và|hoặc)\s+)?(?P<so>\(?\((?P<ng>ij|IJ|[IỊ]j|ịj|[a-zđí]|[A-Z]|\d{1,2}|[ivx]{2,6}|[IVX]{2,6})\s?\)"
                    r"|(?P<nua>[a-zđ]|[A-Z]|\d{1,2}|[IVX]{2,5})\)(?=\s)"
                    r"|(?P<cham>[a-z]|[A-Z]|[IVX]{1,4}|\d{1,2})\s?\.(?=\s|-\s)"
                    r"|(?P<noi>\d{1,2})\s-(?=\s)|(?P<gach>[-–•+]|[*](?!\s*[*]))(?=\s))")
CHU_THICH = re.compile(r"^(?P<so>\(\*{1,3}\)|\*{1,2})\s*\S")
DECO = re.compile(r"^(?:[*ºo⁰°_\s]+|[.…\s]{6,}|hoặc|và)$")
MA_HS = re.compile(r"^(?:\d{4}\s?[.,-]\s?\d{2}|\d{2}\.\d{2}\.\d{2}|\d \d{3}\.\d{2}|\d{4} ?\d{2}|\d{4}\. -)(?!\d)")
GACH_MA = re.compile(r"^[-–—]\s*[-–—]?\s*\S")
KET = re.compile(r"[.:;!?…][\"”»)]*$")
LOAI_TRU = re.compile(r"không\s+(?:bao\s+)?(?:gồm|kể)|không\s+(?:được\s+)?(?:phân\s+loại|xếp)|không\s+thuộc|loại\s+trừ|bị\s+loại", re.I)
VE_NHOM = re.compile(r"\b(?:các\s+)?nhóm\s+(?:này|trên)\b|^(?:các\s+)?bộ\s+phận|^(?:các\s+)?phụ\s+(?:kiện|tùng)", re.I)
CAP_MUC = {"I": 0, "I.": 0, "A": 1, "A.": 1, "1": 2, "1.": 2, "a": 3, "a.": 3, "i": 4, "-": 5}
LA_MA = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii", "xiii", "xiv", "xv", "xvi", "xvii", "xviii", "xix", "xx", "xxi", "xxii", "xxiii", "xxiv", "xxv"]
CHU_THUONG = list("abcde") + ["f", "g", "h", "ij"] + list("klmnopqrstuvwxyz")


LIET_KE = re.compile(r"(?:gồm|kể đến|như|sau|loại|ví dụ|cái khác|không kể)[^:]{0,60}:(?:\n.*)?$", re.I)


def vi_tri(kieu, v):
    """Thứ tự của số hiệu trong kiểu đánh số, None nếu không thuộc kiểu. Bản in dùng (ij) gộp i–j."""
    if kieu in ("1", "1."):
        return int(v) if v.isdigit() else None
    if kieu in ("i", "I", "I."):
        t = v.lower()
        return LA_MA.index(t) + 1 if t in LA_MA and (v.islower() == (kieu == "i")) else None
    t = v.lower().replace("ịj", "ij")
    if (v.islower()) != (kieu in ("a", "a.")):
        return None
    if t in ("i", "j", "í"):
        t = "ij"
    return CHU_THUONG.index(t) + 1 if t in CHU_THUONG else None


def muc(s):
    """-> (so in, [(kiểu, vị trí)…] các cách đọc) nếu đoạn mở đầu bằng số hiệu mục; None nếu không."""
    m = MUC_RX.match(s)
    if not m or (s[0] in "vh" and not m.group("ng")):
        return None
    so = m.group("so")
    if m.group("gach"):
        return so, [("-", 1)]
    if m.group("ng") in ("Ịj", "ịj", "Ij"):
        return so, [("a", 9)]
    if m.group("cham"):
        v, ds = m.group("cham"), ("1.", "a.", "A.", "I.")
        if re.match(r"^[A-Z]\s?\.\s?[A-Z]\.", s) or (len(v) == 1 and v.islower() and not re.match(r"^[a-e]\.\s", s)):
            return None
    elif m.group("noi"):
        v, ds = m.group("noi"), ("1.",)
    else:
        v, ds = m.group("ng") or m.group("nua"), ("1", "a", "A", "i", "I")
    doc_ = [(k, vi_tri(k, v)) for k in ds]
    doc_ = [(k, n) for k, n in doc_ if n]
    return (so, doc_) if doc_ else None


def chu_hoa(s):
    """Tiêu đề kiểu CHỮ HOA (bỏ số hiệu mục và phần chữ thường trong ngoặc)."""
    t = MUC_RX.sub("", s, count=1)
    t = re.sub(r"\([^()]*[a-zà-ỹ][^()]*\)", "", t)
    chu = [c for c in t if c.isalpha()]
    if len(chu) < 3 or not re.search(r"[^\W\d_]{3,}", t) or not re.match(r"^\W*[^\W\d_]{2,}|^\W*[A-ZĐ]\s", t):
        return False
    if re.search(r"\d[A-Z]|[A-Z]\d", t):
        return False
    return sum(c.isupper() for c in chu) / len(chu) >= 0.9


def doc_doan(tep):
    ra = []
    for l in open(tep, encoding="utf8"):
        t, v = l.rstrip("\n").split("\t", 1)
        ra.append((t, re.sub(r"\s+", " ", unicodedata.normalize("NFC", v)).strip().replace("­", "")))
    return ra


def lien(s):
    return re.sub(r"\s+", "", unicodedata.normalize("NFC", s)).replace("­", "")


class BanIn:
    """Đoạn của bản in (cây cấu trúc PDF) + trang (bản chữ -layout). Hai dòng chữ bỏ khoảng trắng giống hệt nhau trong thân nhóm, trừ bảng 28.05."""

    def __init__(self, L, tep):
        ds = doc_doan(tep)
        self.K = [k for k, _ in ds]
        self.V = [v for _, v in ds]
        self.W = [lien(v) for v in self.V]
        self.dau, p = [], 0
        for w in self.W:
            self.dau.append(p)
            p += len(w)
        self.G = "".join(self.W)
        cg, self.trang, self.dongDai, self.mem, n = [], [], [], [], 0
        for tr, d in L:
            w = lien(d)
            for j, c in enumerate(re.sub(r"\s+", "", d)):
                if c == "\u00ad":
                    self.mem.append(n + j - sum(1 for y in self.mem if y >= n))
            n += len(w)
            cg.append(w)
            self.trang += [tr] * len(w)
            self.dongDai += [len(d)] * len(w)
        self.LG = "".join(cg)

    def cuoi(self, k):
        return self.dau[k] + len(self.W[k])

    def khoi(self, p):
        return bisect.bisect_right(self.dau, p) - 1


def dinh_vi(bi, than, tieu_de, p_cu):
    """-> (chỉ số khối tiêu đề [..], khối đầu thân, khối cuối thân, vị trí kết thúc, chữ tiêu đề/mã lọt đã bỏ, chữ được trả lại)."""
    S = lien("".join(d for _, d in than))
    p = bi.G.find(S, p_cu)
    if p < 0:  # bảng 28.05: thứ tự cột khác nhau ⇒ neo hai đầu
        p = bi.G.find(S[:60], p_cu)
        e = bi.G.find(S[-60:], p) + 60
        assert p >= 0 and e - p == len(S), S[:60]
    else:
        e = p + len(S)
    a, z = bi.khoi(p), bi.khoi(e - 1)
    assert bi.cuoi(z) == e, bi.V[z]
    if not tieu_de:
        assert bi.dau[a] == p
        return None, a, z, e, "", ""
    q = bi.G.rfind(lien(tieu_de[0][1]), 0, p)
    assert 0 <= p - q < 6000, tieu_de
    h = bi.khoi(q)
    k = h + 1
    while bi.K[k] == "H4" or (bi.V[k][0].islower() and k <= a):
        k += 1
    td = list(range(h, k))
    while True:  # danh sách mã HS dưới tiêu đề (M-18)
        v = bi.V[k]
        if MA_HS.match(v):
            k += 1
            continue
        if GACH_MA.match(v) and bi.K[k] != "H4":
            n = k + 1
            while GACH_MA.match(bi.V[n]):
                n += 1
            if MA_HS.match(bi.V[n]):
                k += 1
                continue
        if v[0].islower() and not muc(v) and not KET.search(bi.V[k - 1]):
            k += 1
            continue
        break
    b = bi.dau[k]
    return td, k, z, e, bi.G[p:b] if b > p else "", bi.G[b:p] if b < p else ""


def don_vi(bi, a, z, vl):
    """Gộp khối in thành đơn vị (đoạn / bảng). vl: vị trí trong LG của ký tự đầu khối a."""
    ra = []
    for k in range(a, z + 1):
        n = len(bi.W[k])
        i = vl + bi.dau[k] - bi.dau[a]
        u = {"v": bi.V[k], "trang": bi.trang[i], "den": bi.trang[min(i + n - 1, len(bi.trang) - 1)], "bang": bi.K[k] in "RO", "_i": i, "k": [k]}
        for p in bi.mem:
            if i < p < i + n:  # gạch nối mềm có trong bản chữ
                j = d_ = 0
                while d_ < p - i:
                    d_ += not u["v"][j].isspace()
                    j += 1
                u["v"] = u["v"][:j] + "\u00ad" + u["v"][j:]
        t = ra[-1] if ra else None
        qua = t is not None and bi.trang[i] != bi.trang[i - 1]
        if t and u["bang"] and t["bang"]:
            t["v"] += ("\n" if bi.K[k] == "R" else " ") + u["v"]
        elif t and DECO.match(u["v"]) and not u["bang"]:
            t["v"] += "\n" + u["v"]
            t["deco"] = t.get("deco", False) or not u["v"].isalpha()
        elif t and not t["bang"] and not u["bang"] and not t.get("deco") and not muc(u["v"]) and (
                (qua and (u["v"][0].islower() or (not KET.search(t["v"]) and bi.dongDai[i - 1] >= 78)
                          or (chu_hoa(u["v"]) and chu_hoa(t["v"]))))
                or (re.match(r"^\d{2}\.\d{2}\)", u["v"]) and not KET.search(t["v"]))):
            t["v"] += " " + u["v"]   # đoạn bị ngắt qua trang
            t["noi"] = True
        else:
            ra.append(u)
            continue
        t["den"] = u["den"]
        t["k"].append(k)
    return ra


CAU = re.compile(r"(?<=[.;?!])[\"”»)]*\s+(?=[\"“(«]?[A-ZĐÀ-Ỹ])")
TAT = re.compile(r"(?:^|[\s(])(?:v\.v|vv|tr|sp|spp|var|cf|No|St|[A-ZĐ])\.$")


def cat_cau(v):
    """Vị trí đầu câu trong đoạn."""
    return [m.end() for m in CAU.finditer(v) if not TAT.search(v[:m.start()].rstrip('"”») ')) and v[:m.start()].rstrip().endswith((".", ";", "?", "!", ")", "”", '"'))]


def tach_cau_dan(us):
    """Câu dẫn liệt kê in liền cuối một đoạn văn thường ⇒ nút riêng. Đoạn chứa hai câu dẫn trái chiều ⇒ tách trước câu dẫn sau."""
    ra = []
    for n, u in enumerate(us):
        sau = us[n + 1] if n + 1 < len(us) else None
        v = u["v"]
        vt = None
        if not u["bang"] and v.endswith(":") and not u.get("so_") and not muc(v) and sau is not None and (muc(sau["v"]) or sau["bang"]):
            ds = cat_cau(v)
            vt = ds[-1] if ds else None
        if vt is None and not u["bang"]:
            co, khong = [m.start() for m in re.finditer(r"(?<!không )bao gồm\s*:", v)], [m.start() for m in re.finditer(r"không bao gồm\s*:", v)]
            if co and khong:
                sau_ = max(co[0], khong[0])
                ds = [x for x in cat_cau(v) if x <= sau_]
                vt = ds[-1] if ds else None
        if vt:
            c = len(lien(v[:vt]))
            a_, b_ = dict(u, v=v[:vt].rstrip()), dict(u, v=v[vt:])
            a_["den"] = b_["trang"] = None  # tính lại theo vị trí
            a_["_c"], b_["_c"] = (0, c), (c, None)
            ra += [a_, b_]
        else:
            ra.append(u)
    return ra


def dung_cay(us):
    """Gán cha cho từng đơn vị (chỉ số trong us, hoặc None). Tất định; xem docs/mong/the/M-14-nhom.md."""
    for u in us:
        m = None if u["bang"] else muc(u["v"])
        u["muc"] = m
        u["hoa"] = not u["bang"] and chu_hoa(u["v"].split("\n")[0])
        u["hai"] = u["v"].split("\n")[0].endswith(":")
    n = len(us)

    def chon(ngan, i):
        """-> ('tiep', độ sâu, kiểu, vị trí) | ('moi', kiểu, vị trí) cho mục us[i] với ngăn xếp danh sách đang mở."""
        doc_ = us[i]["muc"][1]
        if doc_[0][0] == "-":
            if ngan and ngan[-1]["kieu"] == "-" and not us[i].get("_gachMoi"):
                return ("tiep", len(ngan) - 1, "-", 1)
            return ("moi", "-", 1)
        tiep = [(d, k, v) for d in range(len(ngan) - 1, -1, -1) for k, v in doc_ if ngan[d]["kieu"] == k and ngan[d]["so"] + 1 == v]
        moi = [(k, v) for k, v in doc_ if v == 1]
        if tiep and moi:  # (i) sau (h), (I) sau (H): nhìn mục đánh số kế
            kn = next((us[j]["muc"][1] for j in range(i + 1, n) if us[j]["muc"] and us[j]["muc"][1][0][0] != "-"), [])
            if any(k == moi[0][0] and v == 2 for k, v in kn):
                tiep = []
        if tiep:
            return ("tiep",) + tiep[0]
        if moi:
            return ("moi",) + moi[0]
        nhay = [(d, k, v) for d in range(len(ngan) - 1, -1, -1) for k, v in doc_ if ngan[d]["kieu"] == k and ngan[d]["so"] < v]
        if nhay:
            return ("tiep",) + nhay[0]
        return ("moi",) + doc_[0]

    def tiep_o_dau(ngan, i):
        """Độ sâu của danh sách (đang mở trước us[i]) sẽ còn mục kế ở phía sau; -1 nếu không."""
        sim = [dict(x, goc=True) for x in ngan]
        for j in range(i, n):
            if not us[j]["muc"]:
                continue
            c = chon(sim, j)
            if c[0] == "tiep":
                d = c[1]
                if sim[d].get("goc"):
                    return d if c[2] != "-" else -1
                del sim[d + 1:]
                sim[d] = dict(sim[d], so=c[3])
            else:
                sim.append({"kieu": c[1], "so": c[2]})
        return -1

    ngan = []      # danh sách đang mở: kieu, so, muc (chỉ số đơn vị mục cuối), cha, cac (các mục)
    hoa_le = None  # tiêu đề CHỮ HOA không số hiệu đang mở
    con = {}       # chỉ số đơn vị -> có đoạn con trực tiếp
    ngat = False
    tru_trong = {}  # mục -> có câu dẫn loại trừ bên trong
    mo_tran = None  # (câu dẫn, tiếng đầu) của liệt kê bằng đoạn văn
    danh_sach_tran = None  # (câu dẫn) cho liệt kê không đánh số
    for i, u in enumerate(us):
        truoc = i - 1 if i else None
        if i and us[i - 1].get("deco"):
            ngat = True
        if u["muc"]:
            danh_sach_tran = None
            u["_gachMoi"] = bool(u["muc"][1][0][0] == "-" and truoc is not None and (not us[truoc]["muc"] or (us[truoc]["hai"] and us[truoc]["muc"][1][0][0] != "-")))
            c = chon(ngan, i)
            if c[0] == "tiep":
                d = c[1]
                del ngan[d + 1:]
                if c[2] != "-" and us[truoc]["hai"] and not us[truoc]["muc"] and not us[truoc]["bang"] and us[truoc]["cha"] == ngan[d]["muc"]:
                    us[truoc]["cha"] = ngan[d]["cha"]   # "Loại thứ hai bao gồm:" + (v): số hiệu chạy tiếp dưới câu dẫn mới
                    ngan[d]["cha"] = truoc
                ngan[d].update(so=c[3], muc=i)
                ngan[d]["cac"].append(i)
                u["cha"] = ngan[d]["cha"]
            else:
                if truoc is None:
                    cha, sau = None, 0
                else:
                    t = us[truoc]
                    if t["hai"] or (t["hoa"] and not t["muc"]):
                        cha = truoc
                    elif t["muc"]:
                        cung = any(k == c[1] for k, _ in t["muc"][1]) and ngan and ngan[-1]["kieu"] == c[1]
                        cha = t["cha"] if cung else truoc
                    else:
                        cha = t["cha"]
                if truoc is not None and cha == truoc and us[truoc]["muc"] and not us[truoc]["hai"] and not us[truoc]["hoa"]:
                    # tiêu đề CHỮ HOA / số hiệu cấp cao hơn đứng ngay sau một mục cấp thấp: không nằm trong mục đó
                    while cha is not None and not us[cha]["hoa"] and (u["hoa"] or (us[cha]["muc"] and CAP_MUC[c[1]] < CAP_MUC[us[cha]["muc"][1][0][0]])):
                        cha = us[cha]["cha"]
                # đóng các danh sách không chứa cha
                giu = len(ngan)
                while giu and not trong(us, cha, ngan[giu - 1]["muc"]):
                    giu -= 1
                del ngan[giu:]
                ngan.append({"kieu": c[1], "so": c[2], "muc": i, "cha": cha, "cac": [i]})
                u["cha"] = cha
            if u["hoa"] and hoa_le is not None and not trong(us, u["cha"], hoa_le):
                hoa_le = None
            ngat = False
            continue
        # đoạn văn / bảng / câu dẫn / tiêu đề không số hiệu
        d = tiep_o_dau(ngan, i)
        goc = ngan[d]["muc"] if d >= 0 else None
        cha = goc
        sau = ngan[d + 1:] if d >= 0 else ngan[:]
        tru = u["hai"] and LOAI_TRU.search(u["v"][-220:])
        t = us[truoc] if truoc is not None else None
        if u["hoa"]:
            cha = goc
        elif danh_sach_tran is not None and not ngat and not u["hai"]:
            cha = danh_sach_tran
        elif t is not None and t["hai"] and not ngat and (u["bang"] or u["v"][0].islower() or u["v"].endswith((";", ",")) or not KET.search(u["v"])) and not u["hai"]:
            cha = truoc
            danh_sach_tran = truoc
        elif t is not None and not ngat and not u["hai"] and LIET_KE.search(t["v"]) and t["hai"] and not t["muc"]:
            cha = truoc
            mo_tran = (truoc, u["v"].split(" ")[0])
        elif mo_tran and not VE_NHOM.search(u["v"]) and t is not None and t["cha"] == mo_tran[0] and not t["muc"] and not ngat and u["v"].split(" ")[0] == mo_tran[1] and not u["hai"] and u["v"].split(" ")[0] not in ("Nhóm", "Các", "Những", "Tuy"):
            cha = mo_tran[0]
        elif ngat and d < 0:
            cha = None
        else:
            hoa = next((x for x in reversed(sau) if us[x["muc"]]["hoa"]), None)
            if hoa is not None:
                cha = hoa["muc"]
                anh_em = [m for m in hoa["cac"][:-1]]
                if tru and anh_em and not any(tru_trong.get(m) for m in anh_em) and not any(x["hoa"] for x in us[i + 1:]):
                    cha = goc
            elif hoa_le is not None and (goc is None or trong(us, hoa_le, goc)):
                cha = None if tru and d < 0 and VE_NHOM.search(u["v"][:40]) else hoa_le
                if cha is None:
                    hoa_le = None
            # đoạn tiếp của mục CUỐI danh sách: theo nếp của các mục trước, từ danh sách trong cùng ra
            ve = VE_NHOM.search(u["v"][:80])
            for x in reversed(sau):
                if us[x["muc"]]["hoa"] or x["kieu"] == "-" or t is None or not trong(us, truoc, x["muc"]):
                    break
                m, tr = x["muc"], x["cac"][:-1]
                ten = not KET.search(us[m]["v"])
                ten_anh = [y for y in tr if not KET.search(us[y]["v"])]
                nep = sum(1 for y in tr if con.get(y))
                if not tr or (tru and ve):
                    continue
                if truoc == m and ten and ten_anh and 2 * sum(1 for y in ten_anh if con.get(y)) >= len(ten_anh):
                    cha = m
                    break
                if 2 * nep >= len(tr) and (not ve or (x["kieu"][0] in "AI" and not LOAI_TRU.search(u["v"][:80]) and truoc == m and nep == len(tr) and any(con.get(y) == 2 for y in tr))):
                    cha = m
                    break
        u["cha"] = cha
        if cha is not None:
            con.setdefault(cha, 2 if truoc == cha and VE_NHOM.search(u["v"][:80]) else 1)
        if danh_sach_tran is not None and (cha != danh_sach_tran or u["v"].split("\n")[0].endswith(".")):
            danh_sach_tran = None
        # đóng các danh sách không chứa cha
        giu = len(ngan)
        while giu and not (trong(us, cha, ngan[giu - 1]["muc"])):
            giu -= 1
        if d >= 0:
            giu = max(giu, d + 1)
        del ngan[giu:]
        if u["hoa"]:
            hoa_le = i
        elif ngat and d < 0:
            hoa_le = None
        if tru:
            x = cha
            while x is not None:
                tru_trong[x] = True
                x = us[x]["cha"]
        ngat = False
    return us


def trong(us, x, m):
    """x là m hoặc nằm dưới m."""
    while x is not None:
        if x == m:
            return True
        x = us[x]["cha"]
    return False


def tao_nut(bi, nhom, ghi_chu_nhom):
    """-> (nút theo thứ tự in, số liệu kiểm)."""
    nut, kt = [], {"lot": [], "traLai": [], "tieuDe": {}, "doan": {}, "noi": 0, "roi": []}
    p_cu = l_cu = 0
    for ma in sorted(nhom, key=lambda m: min(x["trang"] for x in nhom[m])):
        stt = 0
        for doan in sorted(nhom[ma], key=lambda x: x["trang"]):
            td, a, z, e, lot, tra = dinh_vi(bi, doan["than"], doan["tieuDe"], p_cu)
            p_cu = e
            if lot:
                kt["lot"].append((ma, lot))
            if tra:
                kt["traLai"].append((ma, tra))
            B = bi.G[bi.dau[a]:bi.cuoi(z)]
            vl = bi.LG.find(B, l_cu)
            if vl < 0:
                kt["roi"].append(ma)
                vl0 = bi.LG.find(bi.W[a], l_cu)
                assert vl0 >= 0, ma
                us = don_vi_tu(bi, a, z, vl0)
            else:
                us = don_vi(bi, a, z, vl)
                l_cu = vl + len(B)
            kt["noi"] += sum(1 for u in us if u.get("noi"))
            kt["doan"][ma] = kt["doan"].get(ma, 0) + len(us)
            us = tach_cau_dan(us)
            for u in us:  # trang của nửa câu dẫn tách ra
                if "_c" in u:
                    x, y = u["_c"]
                    dai = len(lien(u["v"]))
                    tu = u["_i"] + x
                    u["trang"], u["den"] = bi.trang[tu], bi.trang[tu + dai - 1]
            dung_cay(us)
            ids = []
            for n, u in enumerate(us):
                stt += 1
                ids.append(f"nhom:{ma}:ct:{stt}")
                m = u["muc"] or (CHU_THICH.match(u["v"]) and (CHU_THICH.match(u["v"]).group("so"), None))
                x = {"id": ids[-1], "loai": "CHU_GIAI_CHI_TIET", "cha": None if u["cha"] is None else ids[u["cha"]],
                     "so": m[0] if m else None, "nguyenVan": u["v"], "lop": "HUONG_DAN",
                     "nguon": dict(NGUON, trang=u["trang"], **({"trangDen": u["den"]} if u["den"] != u["trang"] else {})),
                     "hieuLuc": {"tu": None, "den": None}}
                if stt == 1 and td:
                    x["tenIn"] = " ".join(bi.V[k] for k in td)
                    kt["tieuDe"][ma] = x["tenIn"]
                    if ma in ghi_chu_nhom:
                        x["ghiChu"] = ghi_chu_nhom[ma]
                if n == 0 and doan.get("ghiChu"):
                    x["ghiChu"] = doan["ghiChu"]
                nut.append(x)
    return nut, kt


def don_vi_tu(bi, a, z, vl0):
    """28.05 (bảng in cột, bản chữ trộn thứ tự ô): tìm trang theo từng khối."""
    cu = vl0
    vt = []
    for k in range(a, z + 1):
        i = bi.LG.find(bi.W[k], cu, cu + 6000)
        if i < 0:
            i = cu
        elif len(bi.W[k]) >= 12:
            cu = i
        vt.append(i)
    goc = bi.trang
    ra = []
    for n, k in enumerate(range(a, z + 1)):
        i = vt[n]
        u = {"v": bi.V[k], "trang": goc[i], "den": goc[i + len(bi.W[k]) - 1] if bi.LG[i:i + len(bi.W[k])] == bi.W[k] else goc[i], "bang": bi.K[k] in "RO", "_i": i, "k": [k]}
        if ra and u["bang"] and ra[-1]["bang"]:
            ra[-1]["v"] += ("\n" if bi.K[k] == "R" else " ") + u["v"]
            ra[-1]["k"].append(k)
        elif ra and DECO.match(u["v"]):
            ra[-1]["v"] += "\n" + u["v"]
            ra[-1]["deco"] = True
        else:
            ra.append(u)
    return ra


def main():
    a = [x for x in sys.argv[1:] if not x.startswith("--")]
    if len(a) < 2:
        sys.exit(__doc__)
    L = doc(a[0])
    nhom, phu_luc, tham_chieu, ktra, ghi_chu_nhom = rut(L)
    nut, kt = tao_nut(BanIn(L, a[1]), nhom, ghi_chu_nhom)
    with open(os.path.join(GOC, "data/luat-goc/nhom.jsonl"), "w", encoding="utf8") as f:
        for x in nut:
            f.write(json.dumps(x, ensure_ascii=False) + "\n")
    print(f"nhom.jsonl: {len(nut)} nút / {len(nhom)} nhóm; đoạn bị ngắt trang đã nối: {kt['noi']}; thân không khớp liền bản chữ -layout: {kt['roi']}")
    print(f"mảnh tiêu đề / danh sách mã lọt vào thân bản 1dd2dadc đã bỏ: {len(kt['lot'])} nhóm")
    for x in kt["lot"]:
        print("   ", x[0], x[1][:70])
    print(f"đoạn bản 1dd2dadc bỏ sót (nhầm vào tiêu đề) đã trả lại thân: {[(m, t[:50]) for m, t in kt['traLai']]}")
    print(f"nhóm trong biểu không có nút: {len(H4 - set(nhom))}; tham chiếu [NN.NN]: {len(tham_chieu)} dòng; phụ lục tiếng Anh tách ra: {len(phu_luc)}")
    for pl in phu_luc:
        print(f"   nhóm {pl['nhom']} | trang {pl['trang']}-{pl['trangKetThuc']} | {pl['dongDau']!r}")
    print(f"đoạn không nêu mã dưới tiêu đề khối phân nhóm: {len(ktra['khoi_khong_ma'])} {ktra['khoi_khong_ma']}")


if __name__ == "__main__":
    main()
