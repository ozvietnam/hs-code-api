#!/usr/bin/env python3
"""M-15: đối chiếu kho phân nhóm bằng đường thứ hai. python3 scripts/luat-goc/phan-nhom-doi-chieu.py <cgct-hs2022.txt>
(1) dấu (+) ở tên nhóm / danh sách mã đầu nhóm  (2) đoạn chú giải phân nhóm trong kho cũ data/chu-giai-heading.json  (3) mã có trong data/tax.json"""
import importlib.util, json, os, re, sys, unicodedata
D = os.path.dirname(os.path.abspath(__file__)); GOC = os.path.dirname(os.path.dirname(D))
_s = importlib.util.spec_from_file_location("pn", os.path.join(D, "phan-nhom.py")); pn = importlib.util.module_from_spec(_s); _s.loader.exec_module(pn)
L = pn.doc(sys.argv[1])
NUT = [json.loads(x) for x in open(os.path.join(GOC, "data/luat-goc/phan-nhom.jsonl"), encoding="utf8")]
gon = lambda s: re.sub(r"\s+", " ", unicodedata.normalize("NFC", s)).strip()
chu = lambda s: re.sub(r"[^\w]+", "", gon(s).lower())

# (1) dấu (+): gắn theo dòng tên nhóm gần nhất phía trên; chỉ nhận trong 14 dòng có chữ kể từ tên nhóm và trước đoạn văn đầu tiên
nhom = None; cach = 0; cong = {}; la = []
for tr, d in L:
    if tr <= 8 or not d.strip(): continue
    m = pn.NHOM.match(d) or pn.NHOM4.match(d)
    ma4 = (m[1] + m[2] if m.re is pn.NHOM else m[1]) if m and not (m["hoa"] and not m["hoa"].isupper()) else None
    if ma4 in pn.H4: nhom = ma4; cach = 0
    cach += 1
    if re.search(r"\(\s*\+\s*\)[\s.*]*$", d) or (cach <= 14 and re.match(r"\s*\d{4}\.\d\d", d) and re.search(r"\(\s*\+\s*\)", d)): (cong.setdefault(nhom, []).append((tr, d.strip())) if cach <= 14 and nhom else la.append((tr, d.strip())))
coKhoi = {x["id"][3:7] for x in NUT}
print(f"(1) nhóm có dấu (+): {len(cong)}; nhóm có khối: {len(coKhoi)}")
print("   có (+) không có khối:", {k: v[0][0] for k, v in sorted(cong.items()) if k not in coKhoi})
print("   có khối không có (+):", sorted(coKhoi - set(cong)))
print("   (+) ngoài tên nhóm (không phải dấu chú giải):", [x for x in la])
ngay = [x for x in cong.items() if re.match(r"\s*\d{4}\.\d\d", x[1][0][1])]
print("   (+) gắn ở dòng mã 6 số:", ngay)

# (2) kho cũ
CU = json.load(open(os.path.join(GOC, "data/chu-giai-heading.json"), encoding="utf8"))
TD = re.compile(r"Ch[úu] gi[ảa]i(?: chi ti[ếê]t)? phân nhóm\s*[.:]?\s*(?=(?:Các )?phân nhóm|Subheading|Với mục|Xem)", re.I)
moi = {}
for x in NUT: moi.setdefault(x["id"][3:7], {})[x["nguyenVan"]] = 1
coCu = {}; thieu = []
for h, v in CU.items():
    t = gon((v or {}).get("nhom") or "") if isinstance(v, dict) else ""
    m = TD.search(t)
    if m: coCu[h] = t[m.end():]
for h, t in sorted(coCu.items()):
    ca = chu(" ".join(moi.get(h, {})))
    sot = [c for c in re.split(r"(?<=[.;:])\s+", t) if len(c) > 25 and chu(c) not in ca]
    if sot: thieu.append((h, len(sot), sot[0][:110]))
print(f"(2) kho cũ có đoạn phân nhóm: {len(coCu)} nhóm; mới không có: {sorted(set(coCu) - coKhoi)}; cũ không có: {sorted(coKhoi - set(coCu))}")
print("   câu của kho cũ không thấy trong kho mới:")
for x in thieu: print("    ", x)
# (3)
print("(3) mã không có trong biểu:", sorted({x["id"] for x in NUT if x["id"][3:9] not in pn.H6}))
print("   số nút có apChung:", sum("apChung" in x for x in NUT), "/", len(NUT))
