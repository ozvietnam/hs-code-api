#!/usr/bin/env python3
"""Bổ sung điều khoản Phần còn thiếu trong data/luat/dieu-khoan-tang2.json (tất định, không LLM).

Nguyên nhân gốc (ca 76, 23/11/2026): bản tách điều khoản chỉ nhận chú giải Phần ghi "N. " (Phần XV, XVI), bỏ sót Phần ghi "N.-" (Phần XVII, XI...). Phần XVII
vì thế chỉ có mục chú giải chi tiết (khoản "5a", "5b"... trùng id), không có Chú giải 1-4 của Phần, gồm Chú giải 2(b) "bộ phận có công dụng chung (Phần XV)
không phải bộ phận của xe" là khoản tách khoá 8708 khỏi 8308.
Tệp ra: data/luat/dieu-khoan-bo-sung.json, cùng khuôn với dieu-khoan-tang2.json, id dạng phan:<gan>:chu_giai_bs:<khoản><điểm>.
Chỉ tách Phần có văn bản chú giải trong data/chu-giai-chuong.json mà tệp tang2 chưa có khoản 1 (hiện: Phần XVII, gan 86)."""
import json, os, re, sys

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
CHUONG_CUA_PHAN = {"86": ["86", "87", "88", "89"]}  # gan -> chương; khoá văn bản = chương đại diện
KHOA_VAN_BAN = {"86": "87"}
LA_MA = {"86": "XVII"}


def bo_dau_so(s): return s


def dich_cua(van, ten_nhom):
    """Đích của một điều khoản: nhóm 4 số (kể cả 'nhóm từ A đến B'), Chương (Cxx), Phần (P:XV)."""
    d = []
    for a, b, c, e in re.findall(r"(\d{2})\.(\d{2})\s+đến\s+(?:nhóm\s+)?(\d{2})\.(\d{2})", van):
        lo, hi = int(a + b), int(c + e)
        d += [n for n in sorted(ten_nhom) if lo <= int(n) <= hi]
    for a, b in re.findall(r"\b(\d{2})\.(\d{2})\b", van): d.append(a + b)
    for c in re.findall(r"Chương\s+(\d{1,2})\b", van): d.append("C" + c.zfill(2))
    for m in re.findall(r"Phần\s+(I{1,3}|IV|VI{0,3}|IX|XI{0,3}|XIV|XV|XVI{0,3}|XIX|XX|XXI)\b", van):
        if m != LA_MA.get("86"): d.append("P:" + m)  # Phần XVII nhắc chính nó: không phải đích
    out = []
    for x in d:
        if x not in out: out.append(x)
    return out


def tach(van_ban, gan, ten_nhom):
    i = van_ban.find("Chú giải")
    j = van_ban.find("TỔNG QUÁT", i)
    khoi = van_ban[i:j if j > 0 else None]
    dong = [l.rstrip() for l in khoi.split("\n")]
    # gộp dòng gãy
    ra, khoan, dan, cur = [], None, "", None

    def chot():
        nonlocal cur
        if cur: ra.append(cur); cur = None
    for l in dong[1:]:
        m = re.match(r"^(\d+)\.\s*-?\s*(.*)$", l)
        if m:
            chot(); khoan = m.group(1); phan_dau = m.group(2)
            dan = ""
            cur = {"khoan": khoan, "diem": "", "dan": "", "van": phan_dau, "dau": True}
            continue
        m = re.match(r"^\(([a-z]{1,2})\)\s*(.*)$", l)
        if m and khoan:
            chot(); cur = {"khoan": khoan, "diem": m.group(1), "dan": "", "van": m.group(0), "dau": False}
            continue
        if cur: cur["van"] += " " + l.strip()
    chot()
    # gắn đoạn dẫn cho điểm: khoản không điểm làm dẫn
    dan_cua = {}
    for r in ra:
        if r["dau"]: dan_cua[r["khoan"]] = r["van"]
    kq = []
    for r in ra:
        van = re.sub(r"\s+", " ", r["van"]).strip()
        dan = re.sub(r"\s+", " ", dan_cua.get(r["khoan"], "")).strip() if not r["dau"] else ""
        goc = (dan + " " + van) if dan else van
        loai_tru = bool(re.search(r"không bao gồm|không áp dụng", goc.lower()))
        kieu = "LOAI_TRU" if loai_tru else ("QUY_TAC_PHAN_LOAI" if re.search(r"phải phân loại|được phân loại|xếp vào|phân loại", goc) else "DINH_NGHIA_PHAM_VI")
        if r["dau"] and any(x["khoan"] == r["khoan"] and not x["dau"] for x in ra): continue  # khoản chỉ là dẫn của các điểm
        kq.append({"id": f"phan:{gan}:chu_giai_bs:{r['khoan']}{r['diem']}", "cap": "phan", "gan": gan, "vung": "chu_giai", "khoan": r["khoan"], "diem": r["diem"],
                   "kieu": kieu, "dich": dich_cua(van, ten_nhom), "dan": dan if (dan and loai_tru) else "", "nguyenVan": van, "hieuLuc": "BAT_BUOC",
                   "apChoChuong": CHUONG_CUA_PHAN[gan], "nguon": "data/chu-giai-chuong.json#%s.phan (tach_phan_bo_sung.py)" % KHOA_VAN_BAN[gan]})
    return kq


def main():
    import gzip
    ten = set()
    for l in gzip.open(f"{REPO}/data/bieu-thue/2026.04.05/bieu-chinh.jsonl.gz", "rt"):
        d = json.loads(l); m = d.get("maChuan") or ""
        if len(m) >= 4: ten.add(m[:4])
    cgc = json.load(open(f"{REPO}/data/chu-giai-chuong.json"))
    dk = json.load(open(f"{REPO}/data/luat/dieu-khoan-tang2.json"))
    ra = []
    for gan, kv in KHOA_VAN_BAN.items():
        co = any(x["cap"] == "phan" and x["gan"] == gan and x["khoan"] in ("1", "2") and x["vung"] == "chu_giai" for x in dk)
        if co: print("gan", gan, "đã có khoản 1/2, bỏ qua"); continue
        t = tach(cgc[kv]["phan"], gan, ten)
        print("gan", gan, "tách", len(t), "khoản:", ", ".join(x["id"].split(":")[-1] for x in t))
        ra += t
    json.dump(ra, open(f"{REPO}/data/luat/dieu-khoan-bo-sung.json", "w"), ensure_ascii=False, indent=1)


main()
