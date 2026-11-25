#!/usr/bin/env python3
"""M-10: tách nút KHAI_QUAT của phan.jsonl, chuong.jsonl (kể cả Phân chương) thành từng ĐOẠN IN. Tất định, không mạng, không AI.
  python3 scripts/luat-goc/kq-tach.py <cgct-hs2022.txt> <doan-in-hs2022.tsv>            ghi lại hai kho (chạy sau phan-trich.mjs, chuong.py, tt31-ap.py)
  python3 scripts/luat-goc/kq-tach.py <cgct-hs2022.txt> <doan-in-hs2022.tsv> --kiem     chỉ kiểm: kho đang có = kết quả dựng lại
Chữ của nút lấy từ chính kho cũ (ghép các nút kq của một Phần / Chương / Phân chương rồi cắt lại theo ranh giới đoạn của cây cấu trúc PDF):
bỏ khoảng trắng, ghép nút mới = ghép nút cũ từng ký tự. Dòng trang trí (***) kho cũ không chép thì không thêm, chỉ dùng làm ranh giới mục.
Bảng = một nút, mỗi hàng một dòng. id đánh số lại liên tục theo thứ tự in; `so` = số hiệu in; `cha` theo dung_cay của nhom-tach.py (M-14):
câu dẫn ':' và tiêu đề là cha. Dòng TỔNG QUÁT / KHÁI QUÁT CHUNG là một nút, không làm cha (tương đương chính mục kq)."""
import collections
import importlib.util
import json
import os
import re
import sys

spec = importlib.util.spec_from_file_location("nt", os.path.join(os.path.dirname(os.path.abspath(__file__)), "nhom-tach.py"))
nt = importlib.util.module_from_spec(spec)
spec.loader.exec_module(nt)
TEN_KQ = re.compile(r"^(?:TỔNG QUÁT|KHÁI QUÁT CHUNG)\s*\.?$")
_hoa = nt.chu_hoa
TIEU_DE_KQ = re.compile(r"^Chú giải(?: Phần)? \d+\.$")
# "Chú giải chi tiết phân nhóm.", "Chú giải Phần 1." là tiêu đề mục; "BẢNG II" là tên bảng, không phải tiêu đề mục
nt.chu_hoa = lambda s: not s.startswith("BẢNG") and (_hoa(s) or bool(nt.TIEU_DE_KHOI.match(s) or TIEU_DE_KQ.match(s)))
# ở khái quát, đoạn nói về cả Chương / Phần không nằm trong mục cuối của danh sách trước nó
nt.VE_NHOM = re.compile(nt.VE_NHOM.pattern + r"|\b(?:các\s+)?(?:chương|phân\s+chương|phần)\s+(?:này|trên|từ)\b|^các\s+chương", re.I)


def khoi_cua(bi, S):
    """-> các khối in phủ kín S: [(khối đầu, khối cuối, từ, đến, bỏ)]. Bảng in xáo cột (Phần XI) so theo bộ chữ."""
    ung = []
    for m in re.finditer(re.escape(S[:40]), bi.G):
        k = bi.khoi(m.start())
        if bi.dau[k] != m.start():
            continue
        p, ra = 0, []
        while p < len(S):
            w = bi.W[k]
            if S.startswith(w, p):
                ra.append((k, k, p, p + len(w), False))
                p += len(w)
            elif nt.DECO.match(bi.V[k]):
                ra.append((k, k, p, p, True))
            elif bi.K[k] == "R":
                z = k
                while bi.K[z + 1] in "RO":
                    z += 1
                n = sum(len(x) for x in bi.W[k:z + 1])
                if collections.Counter(S[p:p + n]) != collections.Counter("".join(bi.W[k:z + 1])):
                    break
                ra.append((k, z, p, p + n, False))
                p, k = p + n, z
            else:
                break
            k += 1
        if p == len(S):
            ung.append(ra)
    assert len(ung) == 1, (len(ung), S[:60])
    return ung[0]


def cat(v, tu, den, bang):
    """Đoạn chữ cũ giữa hai vị trí (đếm ký tự không phải khoảng trắng)."""
    vt, n = [], 0
    for i, c in enumerate(v):
        if not c.isspace() and c != "­":
            if tu <= n < den:
                vt.append(i)
            n += 1
    s = v[vt[0]:vt[-1] + 1]
    return re.sub(r"[ \t]*\n\s*", "\n", s) if bang else re.sub(r"\s*\n\s*", " ", s)


def don_vi(bi, goc, V, khoi, lg):
    ra, cu = [], lg
    for a, z, tu, den, bo in khoi:
        if bo:
            if ra:
                ra[-1]["deco"] = True
            continue
        w = nt.lien(V)[tu:den] if a != z else bi.W[a]
        i = bi.LG.find(w, cu, cu + 8000)
        if i < 0:
            i = cu   # ô bảng bản chữ trộn cột: lấy vị trí đang đọc
            den_i = i
        else:
            den_i = i + len(w) - 1
            if len(w) >= 12:
                cu = i + len(w)
        bang = bi.K[a] in "RO"
        u = {"v": cat(V, tu, den, bang), "tu": tu, "den_": den, "trang": bi.trang[i], "den": bi.trang[den_i], "bang": bang, "_i": i, "_z": den_i}
        t = ra[-1] if ra else None
        qua = t is not None and bi.trang[i] != bi.trang[max(i - 1, 0)]
        if t and bang and t["bang"]:
            t["v"] += ("\n" if bi.K[a] == "R" else "  ") + u["v"]
        elif t and nt.DECO.match(u["v"]) and not bang:
            t["v"] += "\n" + u["v"]
            t["deco"] = t.get("deco", False) or not u["v"].isalpha()
        elif t and any(g == goc and u["v"].startswith(x) for g, x, _ in SUA_NOI):
            t["v"] += " " + u["v"]
        elif t and not t["bang"] and not bang and not t.get("deco") and not nt.muc(u["v"]) and not TEN_KQ.match(t["v"]) and (
                (qua and ((u["v"][0].islower() and bi.dongDai[i - 1] >= 60) or (not nt.KET.search(t["v"]) and (bi.dongDai[i - 1] >= 78 or len(t["v"]) > 200)) or (nt.chu_hoa(u["v"]) and nt.chu_hoa(t["v"]))))
                or (re.match(r"^\d{2}\.\d{2}\)", u["v"]) and not nt.KET.search(t["v"]))):
            if "--bao" in sys.argv:
                print("NỐI", bi.trang[i], bi.dongDai[i - 1], "…" + t["v"][-60:], "‖", u["v"][:60])
            t["v"] += " " + u["v"]   # đoạn bị ngắt qua trang
        else:
            ra.append(u)
            continue
        t["den"], t["den_"], t["_z"] = u["den"], den, u["_z"]
    return ra


def tach(bi, goc, cu):
    V = "\n".join(x["nguyenVan"] for x in cu)
    S = nt.lien(V)
    khoi = khoi_cua(bi, S)
    # chỗ đứng trong bản -layout: khối đầu đủ dài, đúng trang của nút cũ đầu tiên
    k0 = next(x for x in khoi if not x[4] and len(bi.W[x[0]]) >= 12)
    lg = -1
    while True:
        lg = bi.LG.find(bi.W[k0[0]], lg + 1)
        assert lg >= 0, goc
        if bi.trang[lg] in (cu[0]["nguon"]["trang"], cu[0]["nguon"]["trang"] + 1):
            break
    us = don_vi(bi, goc, V, khoi, max(0, lg - k0[2] - 8))
    us = nt.tach_cau_dan(us)
    for u in us:
        if "_c" in u:
            x, y = u.pop("_c")
            n = len(nt.lien(u["v"]))
            u["trang"], u["den"] = bi.trang[u["_i"] + x], bi.trang[u["_i"] + x + n - 1]
    dau = 0
    while dau < len(us) and TEN_KQ.match(us[dau]["v"]):
        us[dau]["cha"] = us[dau]["muc"] = None
        dau += 1
    cay = nt.dung_cay(us[dau:])
    # danh sách cấp cao hơn mở ngay sau danh sách của một câu dẫn ("…ba điều kiện sau: (a)(b)(c)" rồi "(A)"): không thuộc câu dẫn đó
    for p, q in enumerate(cay):
        con = [u for u in cay if u["cha"] == p and u["muc"]] if q["hai"] else []
        for u in con[1:]:
            k0, k1 = {k for k, _ in con[0]["muc"][1]}, {k for k, _ in u["muc"][1]}
            if not k0 & k1 and max(map(CAP, k1)) < min(map(CAP, k0)):
                if "--bao" in sys.argv:
                    print("CẤP", goc, q["v"][-50:], "‖", con[0]["v"][:15], "‖", u["v"][:40])
                u["cha"] = q["cha"]
    # mục cấp cao hơn nằm dưới mục cấp thấp không phải câu dẫn ("(2) Sự thiêu kết" rồi "(A) Sự biến dạng dẻo nóng"): lên tới mục cùng cấp
    for u in cay:
        c = u["cha"]
        while u["muc"] and c is not None and cay[c]["muc"] and not cay[c]["hai"] and not cay[c]["hoa"] \
                and max(CAP(k) for k, _ in u["muc"][1]) < min(CAP(k) for k, _ in cay[c]["muc"][1]):
            c = cay[c]["cha"]
            if c is not None and cay[c]["hai"] and not cay[c]["muc"]:
                c = cay[c]["cha"]
        if c != u["cha"]:
            if "--bao" in sys.argv:
                print("LÊN", goc, u["v"][:50], "‖ từ", cay[u["cha"]]["v"][:40], "‖ tới", None if c is None else cay[c]["v"][:40])
            u["cha"] = c
    tim = lambda dau_: next((i for i, u in enumerate(cay) if u["v"].startswith(dau_)), None)
    for g, tu_, den_, cha_, _ in SUA_CHA:
        if g != goc:
            continue
        i, j, h = tim(tu_), tim(den_ or tu_), tim(cha_) if cha_ else None
        assert i is not None and j is not None and i <= j and (cha_ is None or (h is not None and h < i)), (g, tu_)
        cu_cha = cay[i]["cha"]
        for u in cay[i:j + 1]:
            if u["cha"] == cu_cha:
                u["cha"] = h
    ra = []
    for n, u in enumerate(us, 1):
        m = u["muc"] or (nt.CHU_THICH.match(u["v"]) and (nt.CHU_THICH.match(u["v"]).group("so"), None))
        c = u["cha"]
        moi = {"id": f"{goc}:{n}", "loai": "KHAI_QUAT", "cha": cu[0]["id"].rsplit(":kq:", 1)[0] if c is None else f"{goc}:{c + dau + 1}",
               "so": m[0] if m else None, "nguyenVan": u["v"], "lop": "HUONG_DAN",
               "nguon": dict({k: v for k, v in cu[0]["nguon"].items() if k in ("vanBan", "ban")}, trang=u["trang"], **({"trangDen": u["den"]} if u["den"] != u["trang"] else {})),
               "hieuLuc": {"tu": None, "den": None}}
        ra.append({k: moi[k] for k in cu[0]})   # giữ thứ tự trường của kho
    assert nt.lien("".join(x["nguyenVan"] for x in ra)) == S, goc
    assert all(a["nguon"]["trang"] <= b["nguon"]["trang"] for a, b in zip(ra, ra[1:])), (goc, [x["nguon"]["trang"] for x in ra])
    return ra


def main():
    a = [x for x in sys.argv[1:] if not x.startswith("--")]
    if len(a) < 2:
        sys.exit(__doc__)
    bi = nt.BanIn(nt.doc(a[0]), a[1])
    hong = 0
    for kho in ("phan", "chuong"):
        f = os.path.join(nt.GOC, f"data/luat-goc/{kho}.jsonl")
        tho = open(f, encoding="utf8").read()
        N = [json.loads(l) for l in tho.split("\n") if l.strip()]
        ra, i, kqc, kqm, hien = [], 0, 0, 0, set()
        while i < len(N):
            if N[i]["loai"] != "KHAI_QUAT":
                ra.append(N[i])
                i += 1
                continue
            goc = N[i]["id"].rsplit(":", 1)[0]
            j = i
            while j < len(N) and N[j]["loai"] == "KHAI_QUAT" and N[j]["id"].rsplit(":", 1)[0] == goc:
                assert not set(N[j]) - {"id", "loai", "cha", "so", "nguyenVan", "lop", "nguon", "hieuLuc"}, N[j]["id"]
                j += 1
            assert goc not in hien, goc
            hien.add(goc)
            moi = tach(bi, goc, N[i:j])
            kqc, kqm = kqc + j - i, kqm + len(moi)
            ra += moi
            i = j
        chu = "".join(json.dumps(x, ensure_ascii=False, separators=SEP[kho]) + "\n" for x in ra)
        if "--kiem" in sys.argv:
            hong += chu != tho
        else:
            open(f, "w", encoding="utf8").write(chu)
        print(f"{kho}: {len(hien)} khối, kq {kqc} -> {kqm} nút; cả kho {len(N)} -> {len(ra)}" + (f" {'KHÁC kho' if chu != tho else 'khớp kho'}" if "--kiem" in sys.argv else ""))
    sys.exit(1 if hong else 0)


# Sửa tay `cha` (không đổi chữ): (khối, đầu đoạn đầu, đầu đoạn cuối | None, đầu đoạn cha | None = gốc, lý do). Áp cho các đoạn cùng cha cũ trong dải. Đã xem trang.
SUA_CHA = [
    ("phan:XI:kq", "Sợi được đề cập ở trên có khi còn", "Sợi có thể ở dạng chưa được tẩy trắng", "(1) Khái quát chung.", "tr.1138: nói về cả sợi xe, sợi cáp, sợi đơn; không riêng (iii)"),
    ("phan:XI:kq", "(a) Sợi tơ đơn, phế liệu tơ", "(g) Sợi đơn, sợi xe hay sợi cáp làm từ vật liệu dệt bất kỳ đã cuốn", "Mặc dù vậy các loại sợi dưới đây", "tr.1140–1141: câu dẫn in dấu chấm thay dấu hai chấm"),
    ("phan:XI:kq", "Tuy nhiên, vải denim của các phân nhóm", "Hơn nữa là loại vải chéo 3 sợi", "Chú giải chi tiết phân nhóm.", "tr.1146: dấu hai chấm trước đó dẫn vào hình"),
    ("phan:XV:kq", "Các bộ phận của giày, dép trừ", None, "Ngoài những mặt hàng được đề cập tại Chú giải 1", "tr.1494: bản in thiếu số (h), đoạn đứng giữa (g) và (ij)"),
    ("phan:XVII:kq", "Các bộ phận và phụ kiện, ngay cả khi xác định", None, "(C) Các bộ phận và phụ kiện được mô tả", "tr.2100: thân của (C)"),
    ("chuong:39:kq", "Các copolyme và các polyme pha trộn", None, None, "tr.882: tiêu đề mục (chữ thường)"),
    ("chuong:39:kq", "Phế liệu, phế thải và mảnh vụn từ vật liệu plastic", "Các sản phẩm kết hợp của plastic với vật liệu dệt", None, "tr.885: các mục tiêu đề chữ thường sau Dạng nguyên sinh"),
    ("chuong:39:kq", "Sự phân loại các polyme pha trộn", "Các ví dụ sau đây minh họa sự phân loại các polyme", "Chú giải phân nhóm.", "tr.891: tiêu đề mục (chữ thường)"),
    ("chuong:60:kq", "(I) Dệt kim sợi ngang", None, "(A) Vải dệt kim", "tr.1278: (I), (II) là hai loại của (A)"),
    ("chuong:60:kq", "(II) Dệt kim sợi dọc", None, "(A) Vải dệt kim", "tr.1278"),
    ("chuong:60:kq", "Dệt kim sợi dọc cũng bao gồm thêm:", None, "(II) Dệt kim sợi dọc", "tr.1279"),
    ("chuong:60:kq", "Tất cả các loại vải trong đoạn (I) và (II)", None, "(A) Vải dệt kim", "tr.1279"),
    ("chuong:60:kq", "(B) Vải móc", None, "Nói chung, các sản phẩm này bao gồm:", "tr.1279: cùng danh sách với (A)"),
    ("chuong:69:kq", "Sau khi tạo hình, công đoạn nung", "Tùy theo thành phần và qui trình nung", None, "tr.1390: hết danh sách công đoạn (i)–(v)"),
    ("chuong:71:kq", "Chương này cũng không bao gồm:", None, None, "tr.1456: nói về cả Chương"),
    ("chuong:72:kq", "Theo Chú giải 3 của Chương này, các sản phẩm sắt", "(C) Sự gia công tiếp theo", "(IV) Sản xuất thành phẩm", "tr.1504–1507: thân của (IV), gồm (A), (B), (C)"),
    ("chuong:73:kq", "Chú giải Tổng quát Chương 72", None, None, "tr.1542: nói về cả Chương"),
]
# đoạn bị ngắt qua trang đúng trước chữ giống số hiệu mục: (khối, đầu nửa sau, lý do)
SUA_NOI = [("chuong:71:kq", "(C) trên đây, nhưng không áp dụng", "tr.1455–1456: 'mục (A), (B) và ‖ (C) trên đây'")]
CAP = lambda k: nt.CAP_MUC.get(k, 9)
SEP = {"phan": (",", ":"), "chuong": (", ", ": ")}   # giữ cách ghi dòng của từng kho
if __name__ == "__main__":
    main()
