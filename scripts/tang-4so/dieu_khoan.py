"""Tầng điều khoản: với mỗi nhóm ứng viên gom mọi điều khoản chú giải đang có hiệu lực (Chương chứa nhóm + Phần chứa Chương),
đã tách ở data/luat/dieu-khoan-tang2.json. Thứ tự: LOAI_TRU -> QUY_TAC_PHAN_LOAI -> DINH_NGHIA_PHAM_VI (-> CHUA_XEP nếu liên quan).
Chú giải 2 Phần XVI lấy từ data/luat/chu-giai-2-phan-xvi.json."""
import json, re, unicodedata

def bo_dau(s):
    if not isinstance(s, str): s = json.dumps(s, ensure_ascii=False) if s is not None else ""
    s = unicodedata.normalize("NFD", (s or "").lower().replace("đ", "d"))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", s).strip()

THU_TU = ["LOAI_TRU", "QUY_TAC_PHAN_LOAI", "DINH_NGHIA_PHAM_VI", "CHUA_XEP"]
SO_LA_MA = {"01": "I", "06": "VI", "16": "IV", "50": "XI", "72": "XV", "84": "XVI", "86": "XVII"}


class DieuKhoan:
    def __init__(self, repo):
        self.dk = json.load(open(f"{repo}/data/luat/dieu-khoan-tang2.json"))
        self.theo_id = {x["id"]: x for x in self.dk}
        self.cg2 = json.load(open(f"{repo}/data/luat/chu-giai-2-phan-xvi.json"))
        self.chuong = {}
        self.phan = []
        for x in self.dk:
            if x["vung"] != "chu_giai": continue  # chu_giai_phan_nhom: dùng ở B6 (phân nhóm), không dùng ở tầng nhóm
            if x["cap"] == "chuong": self.chuong.setdefault(x["gan"], []).append(x)
            else: self.phan.append(x)

    def hieu_luc(self, ch):
        """Mọi điều khoản đang có hiệu lực cho Chương ch: của Chương rồi của Phần chứa Chương."""
        return list(self.chuong.get(ch, [])), [x for x in self.phan if ch in (x.get("apChoChuong") or [])]

    def la_phan_xvi(self, ch): return ch in ("84", "85")

    def khoi(self, ch, tu, cap=7000):
        """Khối văn bản điều khoản của một Chương (kèm Phần) cho prompt + danh sách id đã đưa vào."""
        c, p = self.hieu_luc(ch)
        ids, out = [], []
        for ten, ds in (("CHƯƠNG " + ch, c), ("PHẦN " + SO_LA_MA.get(self._phan_gan(ch), "?"), p)):
            for kieu in THU_TU:
                xs = [x for x in ds if x["kieu"] == kieu]
                if kieu == "CHUA_XEP":  # chỉ giữ khi dính chữ của hàng
                    xs = [x for x in xs if any(t in bo_dau(x["nguyenVan"]) for t in tu)]
                if kieu == "DINH_NGHIA_PHAM_VI":  # định nghĩa: lọc theo liên quan, giữ ngắn
                    xs = [x for x in xs if any(t in bo_dau(x["nguyenVan"]) for t in tu)][:8]
                for x in xs:
                    nv = re.sub(r"\s+", " ", x["nguyenVan"]).strip()
                    dan = re.sub(r"\s+", " ", x.get("dan") or "").strip()
                    dich = (" → đích: " + ",".join(x["dich"])) if x.get("dich") else ""
                    dong = f"[{x['id']}] ({ten}/{kieu}) " + (f"{dan[:90]} " if dan and kieu == "LOAI_TRU" else "") + nv[:320] + dich
                    out.append(dong); ids.append(x["id"])
        txt = "\n".join(out)
        return txt[:cap], ids

    def _phan_gan(self, ch):
        for x in self.phan:
            if ch in (x.get("apChoChuong") or []): return x["gan"]
        return ""

    def dich_loai_tru(self, ch):
        """Các đích (nhóm 4 số hoặc Chương) mà điều loại trừ của Chương+Phần trỏ tới: (id, nguyenVan, [đích])."""
        c, p = self.hieu_luc(ch)
        return [(x["id"], x["nguyenVan"], x["dich"]) for x in c + p if x["kieu"] == "LOAI_TRU" and x.get("dich")]

    def cg2_khoi(self):
        n = self.cg2["nguonGoc"]["nguyenVan"]
        b = self.cg2["nhom2bBoPhanTheoChuong"]
        bang = "; ".join(f"{y['nhom']} (bộ phận của máy nhóm {','.join(y['dungChoCacNhom']) or 'còn lại'})" for ch in b for y in b[ch])
        dd = ", ".join(sorted({y["nhom"] for y in self.cg2["nhom2aDinhDanhRieng"]}))
        return ("[CG2-PXVI] Chú giải 2 Phần XVI (thứ tự áp dụng 2a → 2b → 2c; sau khi đã soát loại trừ Chú giải 1 Phần XVI):\n" + n +
                "\nBảng 2(b) bộ phận theo máy: " + bang + "\nNhóm định danh riêng 2(a) (thắng nhóm bộ phận): " + dd)

    def nhom_2b_cho(self, nhom_may):
        """Nhóm bộ phận 2(b) dành cho các nhóm máy cho trước."""
        r = []
        for ch, ds in self.cg2["nhom2bBoPhanTheoChuong"].items():
            for y in ds:
                if set(y["dungChoCacNhom"]) & set(nhom_may): r.append(y["nhom"])
        return r
