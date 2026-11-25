#!/usr/bin/env python3
"""M-15: rút chú giải chi tiết PHÂN NHÓM nằm trong chú giải nhóm -> data/luat-goc/phan-nhom.jsonl. Tất định, không mạng, không AI.
  python3 scripts/luat-goc/phan-nhom.py <cgct-hs2022.txt> [--phang <thư mục>] [--ghi-chu <tệp.json>]
Đầu vào: pdftotext -layout, trang = thứ tự khối \\f (từ 1).
--phang: ghi <thư mục>/phan-nhom.txt = toàn văn, chỉ bỏ dòng số trang, để cổng đối chiếu nguyên văn."""
import importlib.util, json, os, re, sys, unicodedata
GOC = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_s = importlib.util.spec_from_file_location("sua", os.path.join(os.path.dirname(os.path.abspath(__file__)), "phan-nhom-sua-tay.py"))
SUA = importlib.util.module_from_spec(_s); _s.loader.exec_module(SUA)

NGUON = {"vanBan": "Chú giải chi tiết HS 2022 (bản dịch kèm CV 1810/TCHQ-TXNK 2024)", "ban": "HS2022"}
TAX = json.load(open(os.path.join(GOC, "data/tax.json"), encoding="utf8"))
H4 = {k[:4] for k in TAX}; H6 = {k[:6] for k in TAX}

SO_TRANG = re.compile(r"^\s*[—–-]\s*\d{1,4}\s*[—–-]\s*$")
TIEU_DE_KHOI = re.compile(r"^\s*(?:Các\s+)?chú\s+giải(?:\s+chi\s+tiết)?\s+(?:các\s+)?phân\s+nhóm\s*[.:]?\s*$", re.I)
MA = r"(?:\d{4}\s?[.]\s?\d{2}|\d{2}\.\d{2}\.\d{2}|\d{4} \d{2})"
TIEU_DE_MA = re.compile(rf"^\s*(?:(?:Các\s+)?[Pp]hân\s+nhóm|Subheading)\s*:?\s*(?:từ\s+)?{MA}(?:\s*(?:,|và|đến|,\s*và)?\s*(?:phân\s+nhóm\s+)?{MA})*\s*(?:,\s*và|,|và)?\s*[.:]?\s*$")
NOI_MA = re.compile(rf"^\s*{MA}(?:\s*(?:,|và|đến|,\s*và)?\s*{MA})*\s*(?:,\s*và|,|và)?\s*[.:]?\s*$")
NHOM = re.compile(r"^\s{0,10}\(?(\d\d)\s?[.]\s?(\d\d)\s*(?P<cham>[.]?)\s*(?:[-–—]\s*\S|(?P<hoa>[^\W\d_]))")
NHOM4 = re.compile(r"^\s{0,4}(\d{4})\s+[-–]\s+(?P<hoa>[^\W\d_])")
NHOM_BO = re.compile(r"^\s*\[(\d\d)\.(\d\d)\]\s*$")
CHUONG = re.compile(r"^\s*(?:Ch[ưu]ơng\s+\d+\s*:\s*\S|PHẦN\s+[IVX]+\s*:)")
PHAN_CHUONG = re.compile(r"^\s*(?:Phân\s+[Cc]hương|PHÂN CHƯƠNG)\s+[IVX]+\s*:")
PHU_LUC = re.compile(r"^\s*PHỤ LỤC\s*$")
TRANG_TRI = re.compile(r"^\s*[*_]+\s*$")
MUC = re.compile(r"^\s*(?:\((?:[a-zđ]{1,4}|[A-Z]|\d{1,2})\)|\d{1,2}[.)]|[-–•])\s")


def doc(tep):
    """-> [(trang, dòng)] đã NFC, bỏ dòng số trang, giữ dòng trống."""
    t = unicodedata.normalize("NFC", open(tep, encoding="utf8").read())
    return [(i, d.rstrip()) for i, p in enumerate(t.split("\f"), 1) for d in p.split("\n") if not SO_TRANG.match(d)]


def ma_trong(tieu_de):
    """-> (mã nêu tên theo thứ tự, khoảng đã trải). Khoảng 'từ A đến B' / 'A đến B' trải ra các phân nhóm có thật trong biểu."""
    s = re.sub(r"\s+", " ", tieu_de)
    toks = re.findall(rf"{MA}|đến", s); ra = []; khoang = []
    for k, x in enumerate(toks):
        if x == "đến": continue
        m = re.sub(r"\D", "", x)
        if k and toks[k - 1] == "đến" and ra:
            dau = ra[-1]; giua = sorted(c for c in H6 if c[:4] == dau[:4] and dau < c < m)
            khoang.append((dau, m, giua)); ra += giua
        ra.append(m)
    return list(dict.fromkeys(ra)), khoang


def noi_dong(ds):
    """Nối dòng bị ngắt. Xuống đoạn khi: dòng sau là mục/gạch đầu dòng, hoặc chữ đầu dòng sau đáng lẽ còn vừa dòng trước."""
    doan = []
    for _, d in ds:
        s = re.sub(r"\s+", " ", d.strip())
        if not s or TRANG_TRI.match(s): continue
        if doan:
            truoc = doan[-1][1]
            if truoc.strip().endswith(".") and len(s) < 30 and s[0].isupper():
                doan.append((s, d.rstrip())); continue
            if not MUC.match(s + " ") and len(truoc) + 1 + len(s.split(" ")[0]) >= 76 and not (re.search(r"[.:;]$", truoc.strip()) and len(truoc) < 80 and s[0].isupper()):
                doan[-1] = (doan[-1][0] + " " + s, d.rstrip()); continue
        doan.append((s, d.rstrip()))
    return "\n".join(x[0] for x in doan)


def rut(L):
    """-> (khối [{nhom, trang, tieuDe, ma, khoang, than, hetO}], ghi chú)"""
    khoi = []; ngoai = []; nhom = None; trong = False; cur = None; n = len(L)

    def dong(vi):
        nonlocal cur
        if cur is not None:
            cur["hetO"] = (L[vi][0], L[vi][1].strip()[:70]) if vi < n else None
            khoi.append(cur); cur = None

    k = 0
    while k < n:
        tr, d = L[k]
        if tr <= 8: k += 1; continue  # mục lục, quy tắc tổng quát
        m = NHOM.match(d) or NHOM4.match(d)
        if m and m["hoa"] and not m["hoa"].isupper(): m = None
        ma4 = None
        if m: ma4 = m[1] + m[2] if m.re is NHOM else m[1]
        # "29.05. Sorbitol…" là dòng ngắt giữa câu, "29.31. Hợp chất…" là tên nhóm: có dấu chấm mà không có gạch thì chỉ nhận khi nối tiếp nhóm trước
        if ma4 and m.re is NHOM and m["hoa"] and m["cham"] and not (nhom and ma4[:2] == nhom[:2] and ma4 > nhom): ma4 = None
        if CHUONG.match(d) or PHAN_CHUONG.match(d):
            dong(k); trong = False; nhom = None if CHUONG.match(d) else nhom; k += 1
            if PHAN_CHUONG.match(d): nhom = None
            continue
        if (ma4 in H4 if ma4 else False) or NHOM_BO.match(d) or PHU_LUC.match(d) or any(tr == a and d.strip().startswith(b) for a, b, _ in SUA.KET_KHOI):
            dong(k); trong = False
            if ma4: nhom = ma4
            k += 1; continue
        if TIEU_DE_KHOI.match(d):
            dong(k)
            if nhom is None: ngoai.append((tr, next(x[1].strip()[:90] for x in L[k + 1:] if x[1].strip())))
            else: trong = True
            k += 1; continue
        if nhom and TIEU_DE_MA.match(d):
            dong(k)
            if not trong and not any(tr == a and nhom == b for a, b, _ in SUA.THIEU_TIEU_DE_KHOI):
                raise SystemExit(f"khối không có dòng 'Chú giải phân nhóm' chưa có trong sửa tay: trang {tr} nhóm {nhom}: {d.strip()}")
            trong = True
            td = [d.strip()]; q = k
            while re.search(r"(?:,|và)\s*$", td[-1]) and NOI_MA.match(L[q + 1][1]):
                q += 1; td.append(L[q][1].strip())
            tieu_de = re.sub(r"\s+", " ", " ".join(td)); ma, kh = ma_trong(tieu_de)
            cur = {"nhom": nhom, "trang": tr, "tieuDe": tieu_de, "ma": ma, "khoang": kh, "than": []}
            k = q + 1; continue
        if trong:
            if cur is None and d.strip() and not TRANG_TRI.match(d):
                cur = {"nhom": nhom, "trang": tr, "tieuDe": None, "ma": [], "khoang": [], "than": []}
            if cur is not None: cur["than"].append((tr, d))
        k += 1
    dong(n)
    return khoi, ngoai


def main():
    a = sys.argv[1:]; L = doc(a[0]); khoi, ngoai = rut(L)
    nut = []; dem = {}; gc = {"khongNeuMa": [], "maKhongCo": [], "khoang": [], "ngoaiNhom": ngoai, "khoi": []}
    for b in khoi:
        than = noi_dong(b["than"])
        if b["tieuDe"] is None:
            st = [x for x in SUA.KHONG_TIEU_DE if x[0] == b["trang"] and x[1] == b["nhom"] and than.startswith(x[2])]
            if not st: raise SystemExit(f"đoạn không tiêu đề mã chưa có trong sửa tay: trang {b['trang']} nhóm {b['nhom']}: {than[:90]}")
            if not st[0][3]: gc["khongNeuMa"].append([b["trang"], b["nhom"], than]); continue
            b["ma"] = sorted(c for c in H6 if c[:4] == b["nhom"]); van = than; so = None
        else:
            so = re.sub(r"[.:]\s*$", "", b["tieuDe"]); van = b["tieuDe"] + "\n" + than
        if not than: raise SystemExit(f"khối rỗng trang {b['trang']} {b['tieuDe']}")
        for x in b["khoang"]: gc["khoang"].append([b["trang"], *x])
        that = b["ma"]  # đủ mọi mã in trong tiêu đề, kể cả mã không còn trong biểu (gắn ghiChu)
        for c in b["ma"]:
            if c not in H6: gc["maKhongCo"].append([b["trang"], b["nhom"], c, b["tieuDe"]])
        gc["khoi"].append({"nhom": b["nhom"], "trang": b["trang"], "den": b["than"][-1][0], "ma": that, "tieuDe": b["tieuDe"], "het": b["hetO"], "dai": len(van), "cuoi": van[-60:]})
        for c in that:
            dem[c] = dem.get(c, 0) + 1
            x = {"id": f"pn:{c}:ct:{dem[c]}", "loai": "CHU_GIAI_CHI_TIET", "cha": None, "so": so, "nguyenVan": van, "lop": "HUONG_DAN",
                 "nguon": {**NGUON, "trang": b["trang"]}, "hieuLuc": {"tu": None, "den": None}}
            if len(that) > 1: x["apChung"] = that
            if c not in H6: x["ghiChu"] = "mã in trong tiêu đề khối không có trong biểu thuế hiện hành (mã cũ hoặc lỗi in)"
            for tr, ds, g in SUA.HINH:
                if tr == b["trang"] and c in ds: x["thieu"] = g
            nut.append(x)
    nut.sort(key=lambda x: (x["id"].split(":")[1], int(x["id"].split(":")[3])))
    with open(os.path.join(GOC, "data/luat-goc/phan-nhom.jsonl"), "w", encoding="utf8") as f:
        for x in nut: f.write(json.dumps(x, ensure_ascii=False, separators=(",", ":")) + "\n")
    if "--phang" in a:
        t = a[a.index("--phang") + 1]; os.makedirs(t, exist_ok=True)
        open(os.path.join(t, "phan-nhom.txt"), "w", encoding="utf8").write("\n".join(d for _, d in L))
    if "--ghi-chu" in a: json.dump(gc, open(a[a.index("--ghi-chu") + 1], "w"), ensure_ascii=False, indent=1)
    print(f"{len(nut)} nút, {len(dem)} phân nhóm, {len({c[:4] for c in dem})} nhóm, {len(gc['khoi'])} khối; "
          f"ngoài nhóm {len(ngoai)}, không nêu mã {len(gc['khongNeuMa'])}, mã không có {len(gc['maKhongCo'])}")


if __name__ == "__main__": main()
