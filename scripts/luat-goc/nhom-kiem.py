#!/usr/bin/env python3
"""M-14: kiểm bất biến của data/luat-goc/nhom.jsonl. Tất định, không mạng, không AI. Thoát 1 khi có vi phạm.
  python3 scripts/luat-goc/nhom-kiem.py <cgct-hs2022.txt> [bản nhom.jsonl cũ, ví dụ: git show 1dd2dadc:data/luat-goc/nhom.jsonl > /tmp/cu.jsonl]
(a) ghép các nút của nhóm (bỏ khoảng trắng) là một dải liền trong bản chữ; so với bản cũ, phân loại từng chỗ khác
(b) không nút nào có hai câu dẫn trái chiều; không nút nào chứa hai mục đánh số ở đầu dòng
(c) cha đứng trước con, cùng nhóm
(d) số đoạn so với dấu ngắt \\n\\n của .nhom trong data/chu-giai-heading.json"""
import collections
import difflib
import importlib.util
import json
import os
import re
import sys

spec = importlib.util.spec_from_file_location("nt", os.path.join(os.path.dirname(os.path.abspath(__file__)), "nhom-tach.py"))
nt = importlib.util.module_from_spec(spec)
spec.loader.exec_module(nt)


def main():
    X = [json.loads(l) for l in open(os.path.join(nt.GOC, "data/luat-goc/nhom.jsonl"), encoding="utf8")]
    nhom = collections.defaultdict(list)
    for x in X:
        nhom[x["id"][5:9]].append(x)
    loi = []
    # (c)
    thay = {}
    for x in X:
        if x["cha"] is not None and (x["cha"] not in thay or x["cha"][:9] != x["id"][:9]):
            loi.append(f"(c) {x['id']}: cha {x['cha']} không đứng trước / khác nhóm")
        thay[x["id"]] = x
    for ma, ds in nhom.items():
        if [x["id"] for x in ds] != [f"nhom:{ma}:ct:{i}" for i in range(1, len(ds) + 1)]:
            loi.append(f"{ma}: số thứ tự hở")
        if any(a["nguon"]["trang"] > b["nguon"]["trang"] for a, b in zip(ds, ds[1:])):
            loi.append(f"{ma}: trang lùi")
        if "tenIn" not in ds[0]:
            loi.append(f"{ma}: thiếu tenIn")
    # (b)
    dong_noi = []
    for x in X:
        v = x["nguyenVan"]
        if re.search(r"(?<!không )bao gồm\s*:", v) and re.search(r"không bao gồm\s*:", v):
            loi.append(f"(b) {x['id']}: hai câu dẫn trái chiều")
        if not x.get("so") and "\n" in v:
            continue  # bảng
        if sum(1 for d in v.split("\n") if nt.muc(d)) > 1:
            loi.append(f"(b) {x['id']}: hai mục đánh số")
        m = re.findall(r"(?:^|[:;,.]\s|và\s|hoặc\s)\((\d|[a-z]|[ivx]+)\)\s", v)
        if m[:2] in (["1", "2"], ["a", "b"], ["i", "ii"]):
            dong_noi.append(x["id"])
    # (a)
    L = nt.doc(sys.argv[1])
    LG = "".join(nt.lien(d) for _, d in L)
    lech = []
    for ma, ds in nhom.items():
        t, p = [nt.lien(x["nguyenVan"]) for x in ds], 0
        if "".join(t) not in LG:
            # thân in làm nhiều phần (chen phụ lục / khối phân nhóm): từng nút vẫn phải là dải liền, đúng thứ tự
            for x, s in zip(ds, t):
                q = LG.find(s, p)
                if q < 0:
                    lech.append(x["id"])
                else:
                    p = q + len(s)
    print(f"{len(X)} nút / {len(nhom)} nhóm")
    print(f"(a) nút không phải dải liền đúng thứ tự trong bản chữ -layout: {len(lech)} {lech}")
    if len(sys.argv) > 2:
        cu = collections.defaultdict(str)
        for l in open(sys.argv[2], encoding="utf8"):
            x = json.loads(l)
            cu[x["id"][5:9]] += nt.lien(x["nguyenVan"])
        c = collections.Counter()
        khac = collections.defaultdict(list)
        for ma, ds in nhom.items():
            moi = "".join(nt.lien(x["nguyenVan"]) for x in ds)
            if moi == cu[ma]:
                c["y hệt"] += 1
            elif cu[ma].endswith(moi):
                c["chỉ bớt mảnh tiêu đề / danh sách mã ở đầu"] += 1
            elif moi.endswith(cu[ma]):
                c["chỉ thêm đoạn bị bản cũ nuốt vào tiêu đề"] += 1
                khac["thêm"].append(ma)
            elif cu[ma].startswith(moi):
                c["chỉ bớt đuôi lọt (Phân chương IX)"] += 1
                khac["đuôi"].append(ma)
            else:
                k = moi.replace("-", "").replace("–", "")
                g = cu[ma].replace("-", "").replace("–", "")
                if k == g or g.endswith(k):
                    c["chỉ khác dấu nối cuối dòng"] += 1
                elif collections.Counter(k) == collections.Counter(g) or not (collections.Counter(k) - collections.Counter(g)):
                    c["cùng chữ, khác thứ tự (công thức, bảng)"] += 1
                    khac["thứ tự"].append(ma)
                else:
                    c["KHÁC"] += 1
                    khac["KHÁC"].append((ma, [(g[a - 5:b + 5], k[x - 5:y + 5]) for t, a, b, x, y in difflib.SequenceMatcher(None, g, k, autojunk=False).get_opcodes() if t != "equal"][:3]))
        print("(a) so bản cũ từng nhóm:", dict(c), dict(khac))
    print(f"(b)(c): {len(loi)} vi phạm; liệt kê viết liền trong câu (giữ theo bản in, không tách): {len(dong_noi)} {dong_noi}")
    for l in loi[:20]:
        print("  ", l)
    # (d)
    CU = json.load(open(os.path.join(nt.GOC, "data/chu-giai-heading.json"), encoding="utf8"))
    n_ = lambda s: re.sub(r"[^\w]+", "", s).lower()
    t = collections.Counter()
    so = collections.Counter()
    for ma, ds in nhom.items():
        P = [x["nguyenVan"] for x in ds]
        C = [p for p in re.split(r"\n\s*\n", nt.unicodedata.normalize("NFC", CU[ma]["nhom"])) if n_(p)]
        so["bằng" if len(P) == len(C) else "mới nhiều hơn" if len(P) > len(C) else "cũ nhiều hơn"] += 1
        a, b = "".join(map(n_, P)), "".join(map(n_, C))
        o = b.find(a)
        if o < 0:
            t["nhóm khác chữ, không so được ranh giới"] += 1
            continue
        def moc(Q):
            s, k = set(), 0
            for q in Q:
                s.add(k)
                k += len(n_(q))
            return s
        A, B = moc(P), {k - o for k in moc(C) if o <= k < o + len(a)} | {0}
        t["ranh giới cả hai"] += len(A & B)
        t["chỉ kho mới"] += len(A - B)
        t["chỉ kho cũ"] += len(B - A)
        t["nhóm trùng mọi ranh giới"] += A == B
    print("(d) số đoạn từng nhóm:", dict(so), "| ranh giới:", dict(t))
    sys.exit(1 if loi or len(lech) > 60 else 0)


main()
