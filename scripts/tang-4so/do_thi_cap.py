"""Hồ sơ đi theo đồ thị (ADR-0002 + ADR-0004): thay cách nhồi nguyên văn cả Chương/Phần bằng đúng các khoản NỐI giữa các nhóm ứng viên,
và mở rộng ứng viên một bước theo cạnh. Nguồn: bảng cạnh lib/do-thi (xuất bằng xuat_canh_nhom.js, không viết lại), điều khoản đã tách
data/luat/dieu-khoan-tang2.json, Chú giải 2 Phần XVI, sổ tay data/so-tay/<nhóm>.json.

  dt = DoThiCap(repo)
  uv2, nguon = dt.mo_rong(uv, ho_so_hang)           # ứng viên sau khi đi 1 bước theo cạnh, kèm cạnh dẫn tới từng nhóm mới
  ks = dt.dieu_khoan_tach(uv2, ho_so_hang)          # list khoản nối, mỗi khoản nguyên văn + id + cạnh dẫn tới
"""
import glob, gzip, json, os, re, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from dieu_khoan import DieuKhoan, bo_dau, SO_LA_MA, THU_TU

_BO = {"dung", "cho", "cac", "loai", "khac", "bang", "hoac", "duoc", "trong", "nhung", "voi", "cua", "mot", "nay", "khong", "thiet", "may", "bo", "phan",
       "hang", "san", "pham", "nhom", "chu", "giai", "chuong", "thuoc", "kem", "khi", "tren", "duoi", "nhu", "tao", "dang", "theo", "nhieu", "cung", "cap",
       "tai", "den", "hai", "nao", "vao", "tuy", "neu", "gom", "nen", "lam", "tru", "chi"}
# Văn bản luật Việt Nam gọi "nhựa" là "plastic": đồng nghĩa duy nhất cần để từ khoá của hàng gặp được chữ luật.
_DONG_NGHIA = {"nhua": "plastic", "plastic": "nhua"}
LOAI_NGANG = ("C5", "C6", "LOAI_TRU", "C7")
HE_SO_PHO_BIEN = 25.0  # nhóm có bậc đối thủ lớn (bị nhiều nhóm loại trừ trỏ tới) bị giảm điểm hội tụ: 1 / (1 + bậc/25)


def tu_khoa(*chuoi):
    """Từ khoá của hàng (bỏ dấu, >= 4 chữ cái, bỏ từ chung chung)."""
    tu = set()
    for s in chuoi:
        if isinstance(s, (dict, list)): s = json.dumps(s, ensure_ascii=False)
        for w in re.findall(r"[a-z0-9]+", bo_dau(s or "")):
            if len(w) >= 3 and w not in _BO: tu.add(w); tu.add(_DONG_NGHIA[w]) if w in _DONG_NGHIA else None
    return tu


def so_khop(text, tu):
    """Số từ khoá của hàng có mặt trong text (đã bỏ dấu)."""
    return len(tu & set(re.findall(r"[a-z0-9]+", bo_dau(text or ""))))


def _hh_tu(h):
    """Từ khoá RIÊNG của hàng: tên hàng, tên khác, chất liệu, máy chủ. Không lấy chữ mô tả cơ chế/công dụng dài (khớp với mọi thứ)."""
    if not h: return set()
    dv = h.get("dangVatLy") if isinstance(h.get("dangVatLy"), dict) else {}
    return tu_khoa(h.get("moTa"), h.get("tenDung"), h.get("tenKhac"), dv.get("chatLieu"), h.get("laBoPhanCua"))


def _hh_tu_rong(h):
    """Từ khoá rộng (thêm bản chất, cơ chế, công dụng): chỉ dùng để chọn nhóm TRONG một Chương mà khoản luật đã chỉ ra."""
    if not h: return set()
    dv = h.get("dangVatLy") if isinstance(h.get("dangVatLy"), dict) else {}
    return _hh_tu(h) | tu_khoa(h.get("banChat"), h.get("coChe"), h.get("dungChoViecGi"), dv.get("hinhDang"))


def nhom4(x):
    m = re.match(r"^(\d{4})", x or "")
    return m.group(1) if m else None


class DoThiCap:
    def __init__(self, repo, ten=None, lam_moi=False):
        self.repo = repo
        self.dk = DieuKhoan(repo, bo_sung=True)
        self.ten = ten if ten is not None else self._doc_ten()
        self.cgn = json.load(open(f"{repo}/data/chu-giai-heading.json"))
        self._so_tay = {}
        self.canh = self._nap_canh(lam_moi)
        self.theo_nhom = {}
        self.theo_id = {e["id"]: e for e in self.canh}
        for e in self.canh:
            a, b = nhom4(e["tu"]), nhom4(e["toi"])
            for g in {a, b} - {None}: self.theo_nhom.setdefault(g, []).append(e)
        self.nhom_theo_chuong = {}
        for n in self.ten: self.nhom_theo_chuong.setdefault(n[:2], []).append(n)
        self._dung_idf()
        doi = {}
        for e in self.canh:
            if e["loai"] in LOAI_NGANG + ("C8",):
                a, b = nhom4(e["tu"]), nhom4(e["toi"])
                if a and b and a != b: doi.setdefault(a, set()).add(b); doi.setdefault(b, set()).add(a)
        self.bac_nhom = {g: len(v) for g, v in doi.items()}  # số nhóm đối thủ của mỗi nhóm trong bảng cạnh (nhóm nào cũng bị trỏ tới nhiều = thông tin loãng)
        self.dk_theo_id = self.dk.theo_id

    def _van_ban_nhom(self, n):
        cg = self.cgn.get(n)
        cg = cg.get("nhom") if isinstance(cg, dict) else (cg or "")
        return self.ten.get(n, ""), (cg or "")[:4000]

    def _dung_idf(self):
        """Trọng số hiếm của từ khoá: ln(N / số nhóm có từ đó trong tên + chú giải chi tiết). Từ chung chung (dùng, loại...) được trọng số thấp."""
        import math
        df, N = {}, 0
        self._tokens = {}
        for n in self.ten:
            a, b = self._van_ban_nhom(n)
            ta, tb = set(re.findall(r"[a-z0-9]+", bo_dau(a))), set(re.findall(r"[a-z0-9]+", bo_dau(b)))
            self._tokens[n] = (ta, tb)
            N += 1
            for w in ta | tb: df[w] = df.get(w, 0) + 1
        self.idf = {w: math.log(N / c) for w, c in df.items()}

    def lien_quan(self, b, tu):
        """Độ liên quan của nhóm b với từ khoá của hàng: tổng trọng số hiếm của từ khoá có trong TÊN nhóm + 0,15 x (trọng số các từ có trong chú giải chi tiết, trần 30)."""
        ta, tb = self._tokens.get(b, (set(), set()))
        return sum(self.idf.get(w, 0) for w in tu & ta) + 0.15 * min(30.0, sum(self.idf.get(w, 0) for w in (tu & tb) - ta))

    # ---------------- nạp dữ liệu ----------------
    def _doc_ten(self):
        ten = {}
        for l in gzip.open(f"{self.repo}/data/bieu-thue/2026.04.05/bieu-chinh.jsonl.gz", "rt"):
            d = json.loads(l); m = d.get("maChuan") or ""
            if len(m) >= 4 and (d.get("soChuSo") == 4 or m[:4] not in ten): ten[m[:4]] = d.get("moTaVi", "")
        return ten

    def _nap_canh(self, lam_moi):
        """Bảng cạnh mức nhóm: xuất từ lib/do-thi bằng node (7 giây), lưu đệm theo thời gian sửa nguồn."""
        nguon = [f"{self.repo}/lib/do-thi/dung-bang-canh.js", f"{self.repo}/scripts/tang-4so/xuat_canh_nhom.js"] + glob.glob(f"{self.repo}/data/so-tay/*.json") + glob.glob(f"{self.repo}/data/luat/*.json")
        moi = max(os.path.getmtime(f) for f in nguon if os.path.exists(f))
        dem = os.path.join(tempfile.gettempdir(), "tang4so-canh-nhom.json")
        if lam_moi or not os.path.exists(dem) or os.path.getmtime(dem) < moi:
            subprocess.run(["node", f"{self.repo}/scripts/tang-4so/xuat_canh_nhom.js", dem + ".tmp"], check=True, cwd=self.repo, stdout=subprocess.DEVNULL)
            os.replace(dem + ".tmp", dem)
        return json.load(open(dem))

    def so_tay(self, n):
        if n not in self._so_tay:
            try: self._so_tay[n] = json.load(open(f"{self.repo}/data/so-tay/{n}.json"))
            except Exception: self._so_tay[n] = {}
        return self._so_tay[n]

    # ---------------- tiện ích ----------------
    def _phan_cua(self, n):
        return self.dk._phan_gan(n[:2])

    def _dich_chi_toi(self, dich, b):
        """Đích của khoản trỏ tới nhóm b: đúng nhóm b, hoặc Chương của b (Cxx), hoặc Phần của b (P:XV)."""
        g = self._phan_cua(b)
        return b in dich or ("C" + b[:2]) in dich or (g and ("P:" + SO_LA_MA.get(g, "?")) in dich)

    def _dich_cu_the(self, x, b):
        """Khoản nêu ĐÍCH DANH nhóm b (không phải chỉ nhắc cả Chương/Phần) và danh sách đích không quá dài (bỏ khối liệt kê chung chung)."""
        d = x.get("dich") or []
        return b in d and len(d) <= 12

    def la_bo_phan(self, h):
        mc = (h or {}).get("laBoPhanCua")
        return bool(mc) and str(mc).lower() not in ("null", "none", "")

    def _khoan(self, id_, kieu, nguon_loai, van, canh, ten, ghi=""):
        return {"id": id_, "kieu": kieu, "nguon": nguon_loai, "ten": ten, "nguyenVan": re.sub(r"[ \t]+", " ", van).strip(), "canh": canh, "ghi": ghi}

    def canh_giua(self, a, b):
        """Cạnh LOAI_TRU / phân biệt / dễ nhầm giữa hai nhóm (cả hai chiều) + ý kiến WCO của một nhóm có nhắc nhóm kia."""
        ra, thay = [], set()
        for e in self.theo_nhom.get(a, []):
            ga, gb = nhom4(e["tu"]), nhom4(e["toi"])
            if e["loai"] in LOAI_NGANG and {ga, gb} == {a, b}:
                k = (e["loai"] in ("C5", "C6", "LOAI_TRU") and "loaitru", re.sub(r"\s+", " ", e["trich"])[:160])
                if k in thay: continue
                thay.add(k); ra.append(e)
        for g, kia in ((a, b), (b, a)):  # ý kiến WCO của nhóm g nhắc nhóm kia
            for e in self.theo_nhom.get(g, []):
                if e["loai"] != "WCO" or nhom4(e["tu"]) != g: continue
                van = (e.get("banDichVi") or "") + " " + (e.get("trich") or "")
                if re.search(r"\b%s\.%s\b" % (kia[:2], kia[2:]), van) or re.search(r"\b%s\b" % kia, van):
                    k = ("wco", e["idWco"])
                    if k not in thay: thay.add(k); ra.append(e)
        return ra

    def _khoan_dinh_nghia_toi(self, x, b):
        """Khoản định nghĩa y (của Phần/Chương chứa nhóm b) nêu đích danh b và dùng cùng cụm từ với khoản loại trừ x (>= 3 chữ liền nhau, vd "công dụng chung")."""
        dich = x.get("dich") or []
        pb = self._phan_cua(b)
        if not (("C" + b[:2]) in dich or (pb and ("P:" + SO_LA_MA.get(pb, "?")) in dich)): return []
        def tri(t):
            w = bo_dau(t).split()
            return {" ".join(w[i:i + 3]) for i in range(len(w) - 2)}
        tx = tri(x["nguyenVan"])
        c, p = self.dk.hieu_luc(b[:2])
        r = []
        for y in c + p:
            if y["kieu"] != "DINH_NGHIA_PHAM_VI" or b not in (y.get("dich") or []) or len(y["dich"]) > 14: continue
            if tx & tri((y.get("dan") or "") + " " + y["nguyenVan"]): r.append(y)
        return r[:1]

    # ---------------- (2) mở rộng ứng viên theo cạnh ----------------
    def nhom_con_lai(self, ch):
        """Nhóm 'các sản phẩm khác ...' của Chương (nhóm gọi theo vật liệu/công dụng chung, đối thủ thường trực của nhóm gọi đúng tên)."""
        r = []
        for n in self.nhom_theo_chuong.get(ch, []):
            t = self.ten.get(n, "").lower()
            if re.match(r"^(các )?(sản phẩm|mặt hàng|hàng hóa|vật phẩm|đồ|chi tiết|loại)[^,;:]{0,25}khác", t) and "bằng" in t[:60]: r.append(n)
            elif "có chức năng riêng" in t[:60] and "chưa được chi tiết" in t: r.append(n)  # 84.79, 85.43: nhóm còn lại của máy móc (Chú giải 5 Chương 84, Chú giải 2(c) Phần XVI)
        return r

    def _nhom_trong(self, ds_chuong, tu, toi_da=3, nguong=1):
        """Nhóm của các Chương cho trước (Chương do chính khoản luật chỉ ra) có TÊN nhóm khớp >= nguong từ khoá của hàng; điểm = 2 x từ khớp tên + từ khớp chú giải chi tiết >= 3."""
        r = []
        for ch in ds_chuong:
            for n in self.nhom_theo_chuong.get(ch, []):
                ta, tb = self._tokens.get(n, (set(), set()))
                kt = len(tu & ta)
                s = kt * 2 + len(tu & tb)
                if kt >= nguong and s >= 3: r.append((s, n))
        r.sort(reverse=True)
        return [n for _, n in r[:toi_da]]

    def _chuong_cua_dich(self, dich):
        r = [d[1:] for d in dich if re.fullmatch(r"C\d{2}", d)]
        for d in dich:
            if d.startswith("P:"):
                for y in self.dk.phan:
                    if "P:" + SO_LA_MA.get(y["gan"], "?") == d: r += list(y.get("apChoChuong") or []); break
        return sorted(set(r))

    def mo_rong(self, ung_vien, h, toi_da_them=12, he_so_lq=0.6):
        """Đi 1 bước theo cạnh sang nhóm chưa là ứng viên. Đồ thị ĐỀ XUẤT (độ phủ), độ liên quan với chữ của hàng XẾP HẠNG:
          điểm(B) = Σ_A trọng số cạnh(A→B) / (1 + bậc(A)/20)  +  he_so_lq x liên quan(B, hàng).
          Trọng số cạnh: C7 (câu hỏi phân biệt) 2,0; C5/C6/LOAI_TRU 1,5; C8 (thông báo phân loại) 1,0; khoản Chương/Phần nêu đích danh B 1,5 (loại trừ) / 1,0 (định nghĩa, khi nêu cả A);
          khoản trỏ cả Chương/Phần: nhóm của Chương khớp tên hàng 1,0; nhóm 'các sản phẩm khác bằng ...' cùng Chương với A 1,0; bộ phận máy 2(b) 2,0.
          Mỗi nguồn A chỉ tính cạnh mạnh nhất tới B; bậc(A) = số nhóm A đề xuất (chống nhóm trung tâm kéo cả rổ). Lấy tối đa toi_da_them nhóm; KHÔNG cắt vì độ dài.
        Trả (danh sách ứng viên mới, {nhóm thêm: {diem, conv, lq, ly: [...]}}). Bảng xếp hạng đầy đủ nằm ở self.xep_cuoi (để kiểm)."""
        tu = _hh_tu(h)
        tu_rong = _hh_tu_rong(h)
        uv = list(dict.fromkeys(ung_vien))
        co = set(uv)
        tot = {}  # b -> {a: pts}
        ly = {}

        cau_truc = ("CON_LAI", "CG2_2b", "CON_LAI_VAT_LIEU")  # quan hệ cấu trúc: không phạt theo bậc

        def cong(b, pts, a, loai, id_):
            if b in co or b not in self.ten or b == a: return
            m = tot.setdefault(b, {})
            m[(a, loai in cau_truc)] = max(m.get((a, loai in cau_truc), 0), pts)
            L = ly.setdefault(b, [])
            if not any(x["tu"] == a and x["loai"] == loai for x in L): L.append({"tu": a, "loai": loai, "id": id_, "pts": pts})

        for a in uv:
            for e in self.theo_nhom.get(a, []):
                if e["loai"] not in LOAI_NGANG + ("C8",): continue
                ga, gb = nhom4(e["tu"]), nhom4(e["toi"])
                if ga == gb or not ga or not gb: continue
                if e["loai"] not in ("C7", "C8") and ga != a: continue  # cạnh loại trừ có hướng: chỉ đi RA từ a
                kia = gb if ga == a else ga
                # cùng Chương: đối thủ trực tiếp (+1,5); điều kiện của cạnh khớp chữ của hàng (+0,75 mỗi từ, trần 4,5): cạnh nói đúng về loại hàng này
                cong(kia, {"C7": 2.0, "C8": 1.0}.get(e["loai"], 1.5) + (1.5 if e["loai"] != "C8" and kia[:2] == a[:2] else 0)
                     + min(4.5, 0.75 * so_khop(e.get("dieuKien") or e.get("hoi") or "", tu)), a, e["loai"], e["id"])
            c, p = self.dk.hieu_luc(a[:2])
            for x in c + p:
                dich = x.get("dich") or []
                if not dich or len(dich) > 14 or x["kieu"] not in ("LOAI_TRU", "DINH_NGHIA_PHAM_VI"): continue
                loai_tru = x["kieu"] == "LOAI_TRU"
                if loai_tru or a in dich:  # định nghĩa chỉ tính khi nêu đích danh a
                    for d in dich:
                        if re.fullmatch(r"\d{4}", d) and (loai_tru or d != a): cong(d, 1.5 if loai_tru else 1.0, a, "DK_" + x["kieu"], x["id"])
                    chd = [ch for ch in self._chuong_cua_dich(dich) if ch != a[:2]]
                    if chd:
                        for n in self._nhom_trong(chd, tu): cong(n, 1.0, a, "DK_CHUONG", x["id"])
            if a not in self.nhom_con_lai(a[:2]):
                for r in self.nhom_con_lai(a[:2]): cong(r, 3.0 if self.lien_quan(r, tu) > 0 else 1.0, a, "CON_LAI", "CAY:" + a[:2])
        # quét theo vật liệu: nhóm "các sản phẩm khác bằng <vật liệu>" mà vật liệu có trong hồ sơ hàng (kể cả khi Chương đó chưa có ứng viên nào)
        for ch in sorted(self.nhom_theo_chuong):
            for r in self.nhom_con_lai(ch):
                if r not in co and "bằng" in self.ten.get(r, "").lower()[:60] and self.lien_quan(r, tu) > 0: cong(r, 2.0, "-", "CON_LAI_VAT_LIEU", "CAY:" + ch)
        if self.la_bo_phan(h):
            for n in self.dk.nhom_2b_cho([u for u in uv if self.dk.la_phan_xvi(u[:2])]): cong(n, 2.0, "CG2-PXVI", "CG2_2b", "phan:84:chu_giai:2b")
        bac = {}
        for b, m in tot.items():
            for (a, ct) in m: bac[a] = bac.get(a, 0) + (0 if ct else 1)
        xep = []
        for b, m in tot.items():
            conv = (sum(p for (a, ct), p in m.items() if ct)  # quan hệ cấu trúc (nhóm còn lại, 2(b)): không giảm điểm
                    + sum(p / (1 + bac[a] / 40.0) for (a, ct), p in m.items() if not ct) / (1 + self.bac_nhom.get(b, 0) / HE_SO_PHO_BIEN))
            lq = self.lien_quan(b, tu)
            xep.append((conv + he_so_lq * lq, b, conv, lq))
        xep.sort(key=lambda t: (-t[0], t[1]))
        self.xep_cuoi = xep
        chon = xep[:toi_da_them]
        return uv + [b for _, b, _, _ in chon], {b: {"diem": round(d, 2), "conv": round(cv, 2), "lq": round(lq, 2), "ly": ly[b]} for d, b, cv, lq in chon}

    # ---------------- (1) các khoản nối ----------------
    def trong_tam(self, uv, h, goc=None):
        """Nhóm trọng tâm: 8 nhóm khớp chữ của hàng nhất + 4 ứng viên gốc đầu danh sách. Hồ sơ đầy đủ (chú giải chi tiết dài + điều kiện vào nhóm) chỉ dành cho nhóm này."""
        tu = _hh_tu(h)
        goc = goc if goc is not None else uv
        return set(sorted(uv, key=lambda n: -self.lien_quan(n, tu))[:8]) | set(goc[:4])

    def nhom_day_du(self, uv, h, goc=None):
        """Nhóm được hồ sơ đầy đủ (chú giải chi tiết + điều kiện vào nhóm): 6 nhóm khớp chữ của hàng nhất + 3 ứng viên gốc đầu danh sách; nhóm còn lại: tên + chú giải gọn."""
        tu = _hh_tu(h)
        goc = goc if goc is not None else uv
        return set(sorted(uv, key=lambda n: -self.lien_quan(n, tu))[:6]) | set(goc[:3])

    _UU_TIEN = {"LOAI_TRU": 3.0, "C7": 3.0, "PHAN_BIET": 3.0, "DINH_NGHIA_PHAM_VI": 2.5, "QUY_TAC_PHAN_LOAI": 2.5, "C5": 2.0, "C6": 2.0, "WCO": 2.0, "C8": 1.0}

    def dieu_khoan_tach(self, ung_vien, h, nguon_mo_rong=None, so_goc=None, toi_da_moi_cap=2):
        """Chỉ trả khoản NỐI giữa các ứng viên (mỗi khoản nguyên văn + id + cạnh dẫn tới):
        (a) khoản loại trừ/điều kiện của Chương/Phần nhóm A mà đích nêu nhóm B (hoặc Chương/Phần KHÁC của B);
        (b) cạnh LOAI_TRU / phân biệt (C7) / dễ nhầm (C8) / ý kiến WCO giữa A và B trong bảng cạnh;
        (c) hàng là bộ phận máy: Chú giải 1 Phần XVI liên quan + Chú giải 2(a)(b)(c) Phần XVI;
        (d) phanBiet trong sổ tay của ứng viên mà đầu kia cũng là ứng viên;
        (e) khoản định nghĩa của Chương ứng viên có chữ của hàng (>= 2 từ khoá).
        Một cặp (A,B) chỉ xét khi cả hai nhóm đáng xét: tên nhóm khớp chữ của hàng, hoặc là nhóm do đồ thị kéo thêm, hoặc nằm trong 10 ứng viên đầu;
        mỗi cặp giữ tối đa toi_da_moi_cap khoản mạnh nhất (khoản loại trừ/phân biệt trước, tiền lệ sau). Không cắt theo độ dài.
        so_goc: số ứng viên gốc ở đầu danh sách (mặc định: tất cả trừ nhóm có trong nguon_mo_rong)."""
        uv = list(dict.fromkeys(ung_vien))
        tu = _hh_tu(h)
        mr = nguon_mo_rong or {}
        goc = uv[:so_goc] if so_goc is not None else [n for n in uv if n not in mr]
        dang_xet = {n for n in uv if n in mr or n in goc[:10] or self.lien_quan(n, tu) > 0}
        trong_tam = self.trong_tam(uv, h, goc)  # cặp phải có ít nhất một nhóm trọng tâm
        cap, rieng, thay = {}, [], {}  # cap: khoá cặp -> [(điểm, khoản)]

        def ghi(k, cap_khoa, loai):
            imp = self._UU_TIEN.get(loai, 2.0) + 0.5 * so_khop(k["nguyenVan"], tu)
            if cap_khoa is None: rieng.append(k)
            else: cap.setdefault(cap_khoa, []).append((imp, k))

        def ten_chuong(x): return ("Chương " + x["gan"]) if x["cap"] == "chuong" else "Phần " + SO_LA_MA.get(x["gan"], x["gan"])

        def van_dk(x): return (x.get("dan") + " " if x.get("dan") else "") + x["nguyenVan"]

        chuong = sorted({n[:2] for n in uv})
        # (a)
        for a in uv:
            c, p = self.dk.hieu_luc(a[:2])
            pa = self._phan_cua(a)
            for x in c + p:
                dich = x.get("dich") or []
                if x["kieu"] not in ("LOAI_TRU", "QUY_TAC_PHAN_LOAI", "DINH_NGHIA_PHAM_VI") or not dich or len(dich) > 14: continue
                if x["cap"] == "phan" and x.get("gan") == "84" and x["kieu"] != "LOAI_TRU": continue  # Chú giải 2 Phần XVI: xử lý riêng ở (c)
                for b in uv:
                    if b == a or a not in dang_xet or b not in dang_xet or not ({a, b} & trong_tam): continue
                    pb = self._phan_cua(b)
                    ten_b = b in dich
                    ngoai = (("C" + b[:2] in dich and b[:2] != a[:2]) or (pb and pb != pa and ("P:" + SO_LA_MA.get(pb, "?")) in dich)) and (x["kieu"] == "DINH_NGHIA_PHAM_VI" or so_khop(x["nguyenVan"], tu) >= 2 or (so_khop(x["nguyenVan"], tu) >= 1 and self.lien_quan(b, tu) > 0))  # khoản loại trừ trỏ cả Chương/Phần: chỉ khi có chữ của hàng (>= 2 từ, hoặc 1 từ và tên nhóm B cũng khớp hàng)
                    if x["kieu"] == "DINH_NGHIA_PHAM_VI": ok = (a in dich) and (ten_b or ngoai)
                    elif x["kieu"] == "QUY_TAC_PHAN_LOAI": ok = ten_b and len(dich) <= 8
                    else: ok = ten_b or ngoai
                    if ok: ghi(self._khoan(x["id"], x["kieu"], "dieu-khoan", van_dk(x), [f"{a}->{b}"], ten_chuong(x)), frozenset((a, b)), x["kieu"])
                    elif x["kieu"] == "LOAI_TRU":  # chuỗi hai khoản: khoản của A loại một loại hàng (vd "bộ phận công dụng chung, Phần XV"), khoản của B định nghĩa loại hàng đó nêu đích danh B
                        for y in self._khoan_dinh_nghia_toi(x, b):
                            ghi(self._khoan(x["id"], x["kieu"], "dieu-khoan", van_dk(x), [f"{a}->{b}(2 khoản)"], ten_chuong(x)), frozenset((a, b)), x["kieu"])
                            ghi(self._khoan(y["id"], y["kieu"], "dieu-khoan", van_dk(y), [f"{a}->{b}(2 khoản)"], ten_chuong(y)), frozenset((a, b)), y["kieu"])
        # (a1) nhóm còn lại "máy ... có chức năng riêng, chưa được chi tiết" (84.79, 85.43): khoản của Chương/Phần của A nói về "chức năng riêng" (vd Chú giải 5(E) Chương 84)
        for b in uv:
            if "chuc nang rieng" not in bo_dau(self.ten.get(b, "")) or b not in dang_xet: continue
            for a in uv:
                if a == b or a not in dang_xet or not ({a, b} & trong_tam) or a[:2] not in ("84", "85"): continue
                c, p = self.dk.hieu_luc(a[:2])
                for x in c + p:
                    if x["kieu"] in ("QUY_TAC_PHAN_LOAI", "DINH_NGHIA_PHAM_VI", "CHUA_XEP") and "chuc nang rieng" in bo_dau(x["nguyenVan"]) and len(x["nguyenVan"]) <= 2500:
                        ghi(self._khoan(x["id"], x["kieu"], "dieu-khoan", van_dk(x), [f"{a}->{b}(chức năng riêng)"], ten_chuong(x)), frozenset((a, b)), "QUY_TAC_PHAN_LOAI")
        # (a2) khoản đã dẫn tới nhóm được mở rộng
        for b, v in list(mr.items())[:6]:  # chỉ 6 nhóm kéo thêm điểm cao nhất
            for l in v["ly"]:
                y = self.dk_theo_id.get(l["id"])
                if y and l["loai"].startswith("DK_"): ghi(self._khoan(y["id"], y["kieu"], "dieu-khoan", van_dk(y), [f"{l['tu']}->{b}(mo-rong)"], ten_chuong(y)), frozenset((l["tu"], b)), y["kieu"])
        # (b)
        for i, a in enumerate(uv):
            for b in uv[i + 1:]:
                if a[:4] == b[:4] or a not in dang_xet or b not in dang_xet or not ({a, b} & trong_tam): continue
                for e in self.canh_giua(a, b):
                    van = (e.get("banDichVi") or e["trich"]) if e["loai"] == "WCO" else e["trich"]
                    if e["loai"] == "C7": van = (e.get("hoi") or "") + " [" + (e["trich"] or "") + "]"
                    kieu = "LOAI_TRU" if e["loai"] in ("C5", "C6", "LOAI_TRU") else e["loai"]
                    ghi(self._khoan(e["id"], e["loai"], e.get("nguon") or "bang-canh", van, [f"{a}<->{b}"], "cạnh " + e["loai"]), frozenset((a, b)), "C5" if kieu == "LOAI_TRU" else kieu)
        # (d)
        for a in uv:
            for i, pb in enumerate(self.so_tay(a).get("phanBiet") or []):
                if not isinstance(pb, dict): continue
                co, kh = nhom4(pb.get("neuCo")), nhom4(pb.get("neuKhong"))
                kia = kh if co == a else co if kh == a else None
                if kia and kia in uv and kia != a and a in dang_xet and kia in dang_xet and ({a, kia} & trong_tam):
                    ghi(self._khoan(f"so-tay:{a}:phanBiet[{i}]", "PHAN_BIET", pb.get("nguon") or "so-tay", (pb.get("hoi") or "") + " [" + (pb.get("trich") or "") + "]", [f"{a}<->{kia}"], "sổ tay " + a), frozenset((a, kia)), "PHAN_BIET")
        # (c) bộ phận máy
        if self.la_bo_phan(h):
            for x in self.dk.cg2["loaiTruTruocKhiXet"]:
                if not x["id"].startswith("CG1_PXVI_"): continue
                lien = False
                for cs in x["chuyenSang"]:
                    m = re.fullmatch(r"Chương (\d{2})", cs)
                    if re.fullmatch(r"\d{4}", cs) and cs in uv: lien = True
                    if m and any(n[:2] == m.group(1) for n in uv): lien = True
                    if cs == "Phần XVII" and any(n[:2] in ("86", "87", "88", "89") for n in uv): lien = True
                    if cs == "Phần XV" and any(70 < int(n[:2]) < 84 for n in uv): lien = True
                if lien or so_khop(x["trich"]["nguyenVan"], tu) >= 2:
                    ghi(self._khoan("phan:84:chu_giai:" + x["id"][len("CG1_PXVI_"):], "LOAI_TRU", "cg2", x["trich"]["nguyenVan"], ["CG1-PXVI"], "Chú giải 1 Phần XVI"), None, "")
            for id_ in ("2a", "2b", "2c"):
                y = self.dk_theo_id.get("phan:84:chu_giai:" + id_)
                if y: ghi(self._khoan(y["id"], y["kieu"], "dieu-khoan", y["nguyenVan"], ["CG2-PXVI"], "Chú giải 2 Phần XVI"), None, "")
        # (e)
        for ch in sorted({n[:2] for n in trong_tam}):
            xs = [(so_khop(x["nguyenVan"], tu), x) for x in self.dk.chuong.get(ch, []) if x["kieu"] == "DINH_NGHIA_PHAM_VI" and len(x["nguyenVan"]) <= 1500]
            for s, x in sorted(xs, key=lambda t: -t[0])[:2]:
                if s >= 3: ghi(self._khoan(x["id"], x["kieu"], "dieu-khoan", x["nguyenVan"], [f"DINH_NGHIA:Chuong{ch}:{s}tu"], "Chương " + ch), None, "")
        ra = []

        def them(k):
            if k["id"] in thay:
                for c in k["canh"]:
                    if c not in thay[k["id"]]["canh"]: thay[k["id"]]["canh"].append(c)
                return
            thay[k["id"]] = k; ra.append(k)

        for k in rieng: them(k)
        for khoa, ds in sorted(cap.items(), key=lambda kv: sorted(kv[0])):
            for imp, k in sorted(ds, key=lambda t: (-t[0], t[1]["id"]))[:toi_da_moi_cap]: them(k)
        return ra

    def khoi_van_ban(self, ks):
        """Dựng khối chữ cho prompt: [id] (nguồn) nguyên văn  <- cạnh dẫn tới."""
        return "\n".join(f"[{k['id']}] ({k['ten']}/{k['kieu']}) {k['nguyenVan']}  <- nối: {', '.join(k['canh'][:4])}" for k in ks)
