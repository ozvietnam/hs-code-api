#!/usr/bin/env python3
"""Tìm tổng lực: mọi thuộc tính của hàng (tên VN/EN, chất liệu, cấu tạo, cơ chế, chức năng, công dụng, máy chủ)
dò trên MỌI nguồn có chữ (tên nhóm/phân nhóm/dòng 8 số VN+EN, chú giải chi tiết, chú giải Phần/Chương, ý kiến WCO,
sổ tay, SEN), gom nhóm 4 số được nhắc tới, rồi sàng lọc theo trọng số thuộc tính + số nguồn.

Dùng như thư viện:  idx = ChiMuc(repo); idx.tim(cum_theo_thuoc_tinh) -> [(nhom, diem, bang_chung)]
"""
import gzip, json, re, unicodedata, collections, glob, os, math

def bo_dau(s):
    if not isinstance(s, str): s = json.dumps(s, ensure_ascii=False) if s is not None else ""
    s = unicodedata.normalize("NFD", s.lower().replace("đ", "d"))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", s).strip()

# Trọng số nguồn: văn bản luật gọi tên hàng nặng nhất; tờ khai không dùng.
W_NGUON = {"ten4": 3.0, "ten8": 2.0, "cgn": 2.5, "en": 2.0, "wco": 2.5, "chuong": 1.0, "sotay": 1.5, "sen": 1.5}
# Trọng số thuộc tính: tên hàng và chức năng quyết định; chất liệu chỉ phụ (nhóm vật liệu hay thắng phiếu oan).
W_TT = {"ten": 3.0, "ten_en": 3.0, "chuc_nang": 2.0, "cong_dung": 1.5, "co_che": 1.5, "cau_tao": 1.0,
        "may_chu": 1.5, "chat_lieu": 0.5}

class ChiMuc:
    def __init__(self, repo):
        self.docs = []  # (nhom, nguon, text_bo_dau, text_goc_ngan)
        add = lambda n, src, t: (n and len(n) == 4 and t) and self.docs.append((n, src, " " + bo_dau(t) + " ", t[:300]))
        for l in gzip.open(f"{repo}/data/bieu-thue/2026.04.05/bieu-chinh.jsonl.gz", "rt"):
            d = json.loads(l); m = d.get("maChuan") or ""
            if len(m) < 4: continue
            add(m[:4], "ten4" if len(m) == 4 else "ten8", d.get("moTaVi", ""))
            add(m[:4], "en", d.get("moTaEn", ""))
        for n, v in json.load(open(f"{repo}/data/chu-giai-heading.json")).items():
            if isinstance(v, dict):
                for k, t in v.items():
                    if isinstance(t, str):
                        for p in re.split(r"\n\s*\n", t): add(n[:4], "cgn", p)
        for v in json.load(open(f"{repo}/data/explanatory-notes.json")).values():
            add((v.get("headingCode") or "")[:4], "cgn", v.get("noteVi", ""))
        for v in json.load(open(f"{repo}/data/wco-op/vi.json")).values():
            add((v.get("hs") or "")[:4], "wco", v.get("vi", ""))
        for ch, v in json.load(open(f"{repo}/data/chu-giai-chuong.json")).items():
            if isinstance(v, dict):
                for t in v.values():
                    if not isinstance(t, str): continue
                    for p in re.split(r"\n\s*\n", t):
                        for n in set(re.findall(r"\b(\d{2})\.(\d{2})\b", p)):
                            add(n[0] + n[1], "chuong", p)
        for f in glob.glob(f"{repo}/data/so-tay/*.json"):
            n = os.path.basename(f)[:4]
            try: st = json.load(open(f))
            except Exception: continue
            for k in ("phamVi", "dieuKienVao", "phanBiet"):
                add(n, "sotay", json.dumps(st.get(k), ensure_ascii=False))
            for x in st.get("loaiTru") or []:
                if isinstance(x, dict):  # câu loại trừ trỏ SANG nhóm khác: là bằng chứng cho nhóm đích
                    m = re.sub(r"\D", "", str(x.get("sangNhom", "")))[:4]
                    add(m, "sotay", x.get("dieuKien", "") + " " + x.get("trich", ""))
        try:
            for x in json.load(open(f"{repo}/data/sen-2022.json")).get("muc", []):
                add(re.sub(r"\D", "", str(x.get("ma") or x.get("hs") or ""))[:4], "sen", json.dumps(x, ensure_ascii=False))
        except Exception: pass
        self.ten4 = {}
        for l in gzip.open(f"{repo}/data/bieu-thue/2026.04.05/bieu-chinh.jsonl.gz", "rt"):
            d = json.loads(l); m = d.get("maChuan") or ""
            if len(m) >= 4 and (d.get("soChuSo") == 4 or m[:4] not in self.ten4): self.ten4[m[:4]] = d.get("moTaVi", "")

    def tim(self, cum, top=15):
        """cum: {thuoc_tinh: [cụm từ...]}. Khớp nguyên cụm (đã bỏ dấu, có ranh giới từ)."""
        diem = collections.defaultdict(float); chung = collections.defaultdict(list)
        nguon_cua = collections.defaultdict(set); tt_cua = collections.defaultdict(set)
        for tt, ds in cum.items():
            for c in ds or []:
                q = " " + bo_dau(c) + " "
                if len(q.strip()) < 3: continue
                hit = collections.Counter()
                for n, src, t, goc in self.docs:
                    if q in t and n in self.ten4:
                        hit[(n, src)] += 1
                        if len(chung[n]) < 4: chung[n].append(f"[{src}|{tt}:{c}] {goc[:160]}")
                so_nhom = len({n for n, _ in hit})
                if not so_nhom: continue
                idf = math.log(1 + 1269 / so_nhom)  # cụm càng hiếm (ít nhóm nhắc) càng có giá trị phân biệt
                for (n, src), k in hit.items():
                    diem[n] += W_TT.get(tt, 1.0) * W_NGUON[src] * min(k, 3) ** 0.5 * idf
                    nguon_cua[n].add(src); tt_cua[n].add(tt)
        # Sàng lọc: thưởng nhóm được nhiều nguồn và nhiều thuộc tính cùng chỉ tới; phạt nhóm chỉ khớp chất liệu.
        kq = []
        for n, d in diem.items():
            d *= (1 + 0.25 * (len(nguon_cua[n]) - 1)) * (1 + 0.3 * (len(tt_cua[n]) - 1))
            if tt_cua[n] <= {"chat_lieu"}: d *= 0.3
            kq.append((n, round(d, 2), chung[n]))
        kq.sort(key=lambda x: -x[1])
        return kq[:top]
