#!/usr/bin/env python3
"""Tầng 4 số theo ADR-0004 (bản vòng sửa): gom ứng viên -> tầng điều khoản -> phán xử bằng LLM mạnh (Antigravity)
-> luật cứng "phải hỏi" (tất định) -> CHOT / PHAN_VAN kèm điều khoản căn cứ.

  python3 scripts/tang-4so/so_nhom.py --ca-sai docs/tang-4so/ca-sai-v1-vong0.json --vong 1 --ra ket-qua.jsonl

Chỉ đo các ca trong --ca-sai (luật đo: cấm chạy lại cả bộ). Mỗi ca tối đa 2 lượt gọi LLM mạnh.
Hồ sơ hàng dùng lại từ --hh (hh_agy.py tạo), không chạy lại."""
import argparse, collections, gzip, json, os, re, sys, urllib.request, importlib.util

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from dieu_khoan import DieuKhoan, bo_dau, SO_LA_MA as SO_LA_MA_P
from do_thi_cap import DoThiCap, _hh_tu as _tu_chinh, so_khop as _so_khop
import agy

ap = argparse.ArgumentParser()
ap.add_argument("--repo", default=os.path.abspath(os.path.join(HERE, "..", "..")))
ap.add_argument("--bo-chuan", default="data/bo-chuan/4so-v1.jsonl")
ap.add_argument("--ca-sai", required=True)
ap.add_argument("--hh", default=os.path.expanduser("~/hh-agy-v1.jsonl"))
ap.add_argument("--cum", default="docs/tang-4so/cache-cum-v1.jsonl", help="bộ nhớ đệm cụm từ dò luật")
ap.add_argument("--ra", required=True)
ap.add_argument("--uv-cu", nargs="*", default=[], help="các tệp ca-sai/ket-qua của vòng trước: gộp ứng viên cũ, không để rớt")
ap.add_argument("--vong", type=int, default=1)
ap.add_argument("--llm-nha", default=os.environ.get("LLM_NHA", "http://192.168.1.68:11434/v1/chat/completions"))
ap.add_argument("--toi-da-uv", type=int, default=22)
ap.add_argument("--song-song", type=int, default=3)
ap.add_argument("--nao", choices=["agy", "tep"], default="agy", help="agy: gọi LLM mạnh; tep: ghi prompt ra tệp rồi thoát, lần sau đọc đáp án từ tệp")
ap.add_argument("--thu-muc", help="thư mục D cho --nao tep: D/hoi/<ca>-<luot>.txt, D/dap/<ca>-<luot>.json, D/meta/<ca>-<luot>.json")
ap.add_argument("--gioi-han-kb", type=int, default=60)
ap.add_argument("--phan-bien", action="store_true", help="lượt kiểm phản biện giả định ẩn trước khi CHOT (mới viết, chưa đo bằng LLM thật)")
ap.add_argument("--ho-so", choices=["cu", "do-thi"], default="cu", help="cu: khối điều khoản nguyên Chương/Phần (đường cũ); do-thi: chỉ khoản nối giữa các ứng viên + mở rộng ứng viên theo cạnh (scripts/tang-4so/do_thi_cap.py)")
A = ap.parse_args()
REPO = A.repo
P = lambda p: p if os.path.isabs(p) else os.path.join(REPO, p)

# ---------------- dữ liệu luật ----------------
TEN = {}
for l in gzip.open(f"{REPO}/data/bieu-thue/2026.04.05/bieu-chinh.jsonl.gz", "rt"):
    d = json.loads(l); m = d.get("maChuan") or ""
    if len(m) >= 4 and (d.get("soChuSo") == 4 or m[:4] not in TEN): TEN[m[:4]] = d.get("moTaVi", "")
CGN = json.load(open(f"{REPO}/data/chu-giai-heading.json"))
DK = DieuKhoan(REPO)
DT = DoThiCap(REPO, ten=TEN) if A.ho_so == "do-thi" else None
_sp = importlib.util.spec_from_file_location("ttl", os.path.join(HERE, "tim_tong_luc.py"))
ttl = importlib.util.module_from_spec(_sp); _sp.loader.exec_module(ttl)
IDX = ttl.ChiMuc(REPO)

def so_tay(n):
    try: return json.load(open(f"{REPO}/data/so-tay/{n}.json"))
    except Exception: return {}

def nhom_hop_le(x):
    x = re.sub(r"\D", "", str(x))[:4]
    return x if x in TEN else None

def tu_khoa(*chuoi):
    bo = {"dung", "cho", "cac", "loai", "khac", "bang", "hoac", "duoc", "trong", "nhung", "voi", "cua", "mot", "nay", "cac", "khong", "co"}
    tu = set()
    for s in chuoi:
        for w in re.findall(r"[a-z0-9]+", bo_dau(s if isinstance(s, str) else json.dumps(s, ensure_ascii=False) if s else "")):
            if len(w) >= 4 and w not in bo: tu.add(w)
    return sorted(tu)

def doan_khop(text, tu, cap):
    if not text: return ""
    doan = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    if not doan: return ""
    chon = [doan[0]] + [p for p in doan[1:] if any(t in bo_dau(p) for t in tu)]
    return "\n".join(chon)[:cap]

# ---------------- hồ sơ hàng ----------------
def chuan(s): return (s or "").replace("\n", " ").strip()
HH = {}
for l in open(A.hh):
    try: d = json.loads(l); HH[chuan(d["moTa"])] = d
    except Exception: pass

CUM = {}
if os.path.exists(P(A.cum)):
    for l in open(P(A.cum)):
        try: d = json.loads(l); CUM[d["moTa"]] = d["cum"]
        except Exception: pass

def llm_nha(msg, mx=3000):
    """Máy nhà: chỉ việc phụ (tách cụm từ). Không sẵn thì trả None, người gọi dùng đường thay thế."""
    b = {"model": "gpt-oss:120b", "max_tokens": mx, "reasoning_effort": "low", "response_format": {"type": "json_object"},
         "messages": [{"role": "user", "content": msg}]}
    try:
        r = json.load(urllib.request.urlopen(urllib.request.Request(A.llm_nha, json.dumps(b).encode(),
            {"Content-Type": "application/json", "Authorization": "Bearer x"}), timeout=60))
        return json.loads(r["choices"][0]["message"]["content"] or "{}")
    except Exception:
        return None

def cum_tu_ho_so(mo, h):
    """Đường thay thế khi máy nhà không trả lời: cụm ngắn lấy thẳng từ hồ sơ hàng."""
    def ngan(x): return [c.strip() for c in re.split(r"[,;/()]|\bvà\b", x or "") if 2 <= len(c.split()) <= 4 or len(c.split()) == 1 and len(c) > 3][:5]
    dv = h.get("dangVatLy") or {}
    ten = [h.get("tenDung")] + list(h.get("tenKhac") or [])
    return {"ten": [t for t in ten if t and len(t.split()) <= 5], "ten_en": [t for t in (h.get("tenKhac") or []) if t and re.search(r"[a-z]", t) and len(t.split()) <= 4],
            "chat_lieu": ngan(dv.get("chatLieu") if isinstance(dv, dict) else ""), "cau_tao": ngan(dv.get("hinhDang") if isinstance(dv, dict) else ""),
            "chuc_nang": ngan(h.get("dungChoViecGi")), "co_che": ngan(h.get("coChe")), "cong_dung": [],
            "may_chu": [h["laBoPhanCua"]] if h.get("laBoPhanCua") and len(str(h["laBoPhanCua"]).split()) <= 6 else []}

def lay_cum(mo, h, bc):
    if mo in CUM: return CUM[mo]
    cum = llm_nha("Hàng: \"%s\"\nHiểu biết: %s\nLiệt kê CỤM TỪ NGẮN (1–4 chữ) để dò trong biểu thuế/chú giải HS tiếng Việt và tiếng Anh, "
                  "kể cả tên gọi khác trong văn bản luật. JSON {\"ten\":[],\"ten_en\":[],\"chat_lieu\":[],\"cau_tao\":[],\"co_che\":[],"
                  "\"chuc_nang\":[],\"cong_dung\":[],\"may_chu\":[]}" % (mo, json.dumps({k: h.get(k) for k in ("tenDung", "banChat", "coChe", "dungChoViecGi", "laBoPhanCua")}, ensure_ascii=False)))
    nguon = "gpt-oss"
    if not cum or not any(cum.values()):
        cum, nguon = cum_tu_ho_so(mo, h), "ho-so"
    with open(P(A.cum), "a") as f: f.write(json.dumps({"moTa": mo, "cum": cum, "nguon": nguon}, ensure_ascii=False) + "\n")
    CUM[mo] = cum
    return cum

# ---------------- gom ứng viên ----------------
def gom_ung_vien(ca, mo, h, bc):
    tu = tu_khoa(mo, h.get("tenDung"), h.get("banChat"), h.get("coChe"), h.get("dungChoViecGi"))
    cum = lay_cum(mo, h, bc)
    tim_het = [n for n, _, _ in IDX.tim(cum, top=200)]  # tính MỘT lần cho mỗi ca
    ca["_tim"] = tim_het[:8]
    uv = []
    # ứng viên đã gom ở vòng trước (gồm đề xuất AI) giữ nguyên và đứng đầu: không bỏ nhóm đã có (lỗi vòng 1: cắt ở 16 làm rớt nhóm đúng)
    for x in ca.get("ungVien") or []:
        n = nhom_hop_le(x)
        if n and n not in uv: uv.append(n)
    for n in tim_het[:8]:
        if n not in uv: uv.append(n)
    # điều loại trừ (Chương + Phần) có đích -> thêm nhóm đích khi điều đó dính chữ của hàng
    them = []
    for n in list(uv):
        for id_, nv, dich in DK.dich_loai_tru(n[:2]):
            if not any(t in bo_dau(nv) for t in tu): continue
            for dd in dich:
                if re.fullmatch(r"\d{4}", dd):
                    if dd in TEN and dd not in uv and dd not in them: them.append(dd)
                elif re.fullmatch(r"C\d{2}", dd):  # đích là cả Chương: lấy nhóm của Chương đó khớp hàng nhất
                    ch = dd[1:]
                    r = [m for m in tim_het if m[:2] == ch][:2]
                    for m in r:
                        if m not in uv and m not in them: them.append(m)
    # bộ phận máy: thêm nhóm bộ phận 2(b) ứng với máy chủ tìm được
    mc = h.get("laBoPhanCua")
    if mc and str(mc).lower() not in ("null", "none"):
        maychu = [n for n, _, _ in IDX.tim({"ten": [str(mc)], "may_chu": [str(mc)]}, top=6)]  # một lần mỗi ca
        for m in DK.nhom_2b_cho(maychu):
            if m not in uv and m not in them: them.append(m)
        for n in maychu:
            if n not in uv and n not in them: them.append(n)
    uv = (uv + them)[: A.toi_da_uv]
    if DT:  # đi 1 bước theo cạnh LOAI_TRU / phân biệt: nhóm bị sót tự lộ ra; KHÔNG cắt vì độ dài
        uv, ca["_dt_nguon"] = DT.mo_rong(uv, h)
        ca["_dt_goc"] = len(uv) - len(ca["_dt_nguon"])
    return uv, tu

# ---------------- hồ sơ từng nhóm ----------------
def ho_so_nhom(n, tu, cap_cgn=1400, day_du=True):
    st = so_tay(n)
    cgn = CGN.get(n) or {}
    cgn_txt = cgn.get("nhom") if isinstance(cgn, dict) else str(cgn)
    vao = [f"- {x.get('fact','')} {x.get('op','')} {x.get('value','')} (trích: {str(x.get('trich',''))[:140]})" for x in (st.get("dieuKienVao") or [])[:6] if isinstance(x, dict)] if day_du else []
    return (f"### Nhóm {n}: {TEN.get(n,'?')}\n[Chú giải chi tiết {n}] {doan_khop(cgn_txt, tu, cap_cgn)}\n"
            + ("[Sổ tay – điều kiện vào nhóm (trái điều kiện thì LOẠI)]\n" + "\n".join(vao) + "\n" if vao else ""))

def ho_so_nhom_gon(n, h, uv, muc):
    """Hồ sơ gọn của một nhóm (chế độ đồ thị). muc="day_du": tên nhóm + chú giải chi tiết chỉ giữ đoạn đầu (phạm vi), đoạn có chữ của hàng (>= 2 từ khoá) và đoạn loại trừ/trỏ
    sang ứng viên khác + điều kiện vào nhóm; muc="gon": tên + đoạn phạm vi (nhóm đáng xét còn lại, nhóm do đồ thị kéo thêm; khoản nối nằm ở khối khoản); muc="ten": chỉ tên nhóm."""
    cgn = CGN.get(n) or {}
    txt = cgn.get("nhom") if isinstance(cgn, dict) else str(cgn)
    doan = [p.strip() for p in re.split(r"\n\s*\n", txt or "") if p.strip()]
    ten = TEN.get(n, "?")
    ra = [f"### Nhóm {n}: {ten if muc == 'day_du' else ten[:200]}"]
    if muc != "ten" and doan: ra.append("[Phạm vi] " + re.sub(r"\s+", " ", doan[0])[: 400 if muc == "day_du" else 220])
    if muc == "day_du":
        tu = _tu_chinh(h)
        dau = [f"{m[:2]}.{m[2:]}" for m in uv if m != n]
        giu = []
        for p in doan[1:]:
            tro = any(d in p for d in dau) and re.search(r"không bao gồm|loại trừ|trừ |ngoại trừ|khác với", p, re.I)
            if tro or _so_khop(p, tu) >= 2: giu.append(re.sub(r"\s+", " ", p)[:300])
            if len(giu) >= 3: break
        if giu: ra.append("[Đoạn liên quan] " + " | ".join(giu))
        st = so_tay(n)
        vao = [f"- {x.get('fact','')} {x.get('op','')} {x.get('value','')} (trích: {str(x.get('trich',''))[:90]})" for x in (st.get("dieuKienVao") or [])[:3] if isinstance(x, dict)]
        if vao: ra.append("[Sổ tay – điều kiện vào nhóm (trái điều kiện thì LOẠI)]\n" + "\n".join(vao))
    return "\n".join(ra) + "\n"

GIOI_HAN_BYTE = 115000  # argv của Linux tối đa 128 KB cho một đối số
_KHOI_CACHE = {}

def _cỡ_chương(ch, tu):
    k = (ch, tuple(tu))
    if k not in _KHOI_CACHE: _KHOI_CACHE[k] = len(DK.khoi_chuong(ch, tu)[0].encode())
    return _KHOI_CACHE[k]

def dung_prompt(ca, mo, h, uv, tu, da_loai=None):
    """Giữ NGUYÊN VĂN mọi điều khoản đang dùng (không cắt). Quá giới hạn thì giảm chú giải chi tiết, rồi bỏ bớt ứng viên xếp sau
    (ưu tiên bỏ nhóm là ứng viên duy nhất của một Chương có khối điều khoản lớn). Trả (prompt, ids, text_all, uv đã dùng, nhóm bị bỏ)."""
    gh = A.gioi_han_kb * 1024 if A.nao == "tep" else GIOI_HAN_BYTE
    uv, bo = list(uv), []
    if DT:  # hồ sơ đi theo đồ thị: không cắt ứng viên vì độ dài; quá 40 KB thì báo
        p = _dung_prompt(ca, mo, h, uv, tu, None, 1400, da_loai)
        if len(p[0].encode()) > 40 * 1024: print(f"BAO: ca {ca.get('ca')} hồ sơ {len(p[0].encode()) // 1024} KB > 40 KB (không cắt)", file=sys.stderr)
        return (*p, uv, bo)
    while True:
        for cap_cgn in (1400, 900, 500):
            p = _dung_prompt(ca, mo, h, uv, tu, None, cap_cgn, da_loai)
            if len(p[0].encode()) <= gh: return (*p, uv, bo)
        if len(uv) <= 3: return (*p, uv, bo)
        def bac(n):  # số lớn = bỏ trước; nhóm trọng tài vừa nêu (nhomThieu) bỏ SAU CÙNG
            return -1 if n in (ca.get("_moi") or []) else 0 if n in (ca.get("uuTien") or []) else 1 if n in (ca.get("_tim") or []) else 2
        dem = collections.Counter(n[:2] for n in uv)
        tang = max(bac(n) for n in uv)
        ds = [n for n in uv if bac(n) == tang]
        x = max(ds, key=lambda n: ((dem[n[:2]] == 1) * _cỡ_chương(n[:2], tu), uv.index(n)))
        uv.remove(x); bo.append(x)

def _dung_prompt(ca, mo, h, uv, tu, cap_ch, cap_cgn, da_loai=None):
    chuong = sorted({n[:2] for n in uv})
    lq = DK.lien_quan(uv)
    khoi, ids = [], set()
    if DT:
        nguon = {n: v for n, v in (ca.get("_dt_nguon") or {}).items() if n in uv}
        ks = DT.dieu_khoan_tach(uv, h, nguon)
        ids = {k["id"] for k in ks}
        khoi = ["=== CÁC KHOẢN LUẬT NỐI GIỮA CÁC NHÓM ỨNG VIÊN (nguyên văn; mỗi khoản kèm cạnh dẫn tới: A->B là khoản của Chương/Phần của A nói tới B; A<->B là cạnh phân biệt/loại trừ giữa A và B) ===\n" + DT.khoi_van_ban(ks)]
        chuong = []
    for ch in chuong:
        t, i = DK.khoi_chuong(ch, tu, lq); khoi.append(f"=== ĐIỀU KHOẢN CỦA CHƯƠNG {ch} (áp cho nhóm thuộc Chương {ch}) ===\n{t}"); ids |= set(i)
    for gan in sorted({DK._phan_gan(ch) for ch in chuong} - {""}):  # điều khoản Phần: ghi một lần cho mọi Chương của Phần
        cs = [ch for ch in chuong if DK._phan_gan(ch) == gan]
        t, i = DK.khoi_phan(gan, tu, lq); khoi.append(f"=== ĐIỀU KHOẢN CỦA PHẦN {SO_LA_MA_P.get(gan, gan)} (áp cho mọi nhóm thuộc Chương {', '.join(cs)}) ===\n{t}"); ids |= set(i)
    cg2 = DK.cg2_khoi() if any(DK.la_phan_xvi(c) for c in chuong) else ""
    if DT:  # hồ sơ gọn: nhóm đầy đủ = 6 nhóm khớp hàng nhất + 3 ứng viên gốc đầu; còn lại tên + phạm vi
        tt = DT.nhom_day_du(uv, h, [n for n in uv if n not in (ca.get("_dt_nguon") or {})])
        nguon_dt = ca.get("_dt_nguon") or {}
        dx = DT.nhom_dang_xet(uv, h, nguon_dt, [n for n in uv if n not in nguon_dt])
        ho_so = "\n".join(ho_so_nhom_gon(n, h, uv, "day_du" if n in tt else "gon" if (n in dx or n in nguon_dt) else "ten") for n in uv)
    else:
        ho_so = "\n".join(ho_so_nhom(n, tu, cap_cgn) for n in uv)
    bc = {k: h.get(k) for k in ("tenDung", "banChat", "dangVatLy", "dungChoViecGi", "coChe", "oDau", "aiDung", "laBoPhanCua", "tenKhac", "canXacNhan") if h.get(k)}
    da_loai_txt = ""
    vang = {n: x for n, x in (da_loai or {}).items() if n not in uv}  # nhóm đã có kết luận ở lượt 1 mà không được mở hồ sơ ở lượt này
    if vang:
        def dong(n, x):
            cc = ', '.join(x.get('dieuKhoan') or []) or '(tên nhóm/chú giải chi tiết)'
            tr = re.sub(chr(10), ' ', str(x.get('trich') or ''))[:200]
            if x.get('ketLuan') == 'LOAI': return f"- {n} {TEN.get(n,'')[:70]} | đã loại, căn cứ: {cc} | {tr}"
            return f"- {n} {TEN.get(n,'')[:70]} | lượt 1 kết luận {x.get('ketLuan')} (điều kiện vào: {x.get('dieuKienVao')}); không đủ chỗ cho hồ sơ, giữ nguyên kết luận lượt 1"
        da_loai_txt = ("\n\nNHÓM ĐÃ CÓ KẾT LUẬN Ở LƯỢT 1 (không mở hồ sơ ở lượt này; KHÔNG xét lại, KHÔNG đưa vào \"xet\", hệ giữ nguyên kết luận):\n"
                       + "\n".join(dong(n, x) for n, x in vang.items()))
    text_all = "\n".join(khoi) + "\n" + ho_so + "\n" + cg2
    prompt = (
        "Bạn là chuyên gia phân loại HS Việt Nam. CHỈ xét tầng NHÓM 4 số, đúng trình tự ADR-0004 (6 Quy tắc tổng quát):\n"
        "1) Hiểu bản chất hàng (đã có dưới đây). KHÔNG dựa vào tờ khai, KHÔNG dựa vào trí nhớ về mã; chỉ dựa vào văn bản đưa dưới đây.\n"
        "2) Quy tắc 1: với MỖI nhóm ứng viên soát theo thứ tự: (i) các điều LOẠI TRỪ của Chương và Phần (có số hiệu [id]) — nếu một điều loại trừ áp cho hàng thì nhóm bị LOẠI, trích id; "
        "(ii) điều QUY TẮC PHÂN LOẠI; (iii) tên nhóm + chú giải chi tiết + điều kiện vào nhóm; (iv) với bộ phận máy: Chú giải 2 Phần XVI theo thứ tự 2(a)→2(b)→2(c), nhóm định danh riêng (8482, 8483, 8501, 8545...) thắng nhóm bộ phận chung. "
        "Nhóm gọi ĐÚNG TÊN hàng thắng nhóm chỉ nêu theo vật liệu/công dụng chung (\"sản phẩm bằng...\", \"khác\"). Chỉ còn một nhóm thì DỪNG (QT1), không viện Quy tắc 3.\n"
        "3) Chỉ khi Quy tắc 1 không đủ mới dùng 3a→3b→3c, và phải nói rõ vì sao QT1 không đủ.\n"
        "4) PHẢI HỎI, KHÔNG ĐOÁN: nếu hai nhóm trở lên còn khớp mà điểm khác nhau giữa chúng là một dữ kiện hồ sơ hàng KHÔNG có (hoặc nằm trong canXacNhan), "
        "thì nhóm đó là CHUA_RO và daCo=false, kết quả là PHAN_VAN với nhánh điều kiện. Dữ kiện đã có trong hồ sơ (kể cả suy ra chắc chắn từ mô tả) thì daCo=true.\n"
        "5) KIỂM NHẠY CẢM (bắt buộc): với từng mục trong canXacNhan của hồ sơ hàng, và mọi dữ kiện khác mà CHỮ LUẬT (tên nhóm, điều kiện vào nhóm, chú giải, điều loại trừ) dùng để tách nhóm, tự hỏi: "
        "nếu giá trị dữ kiện này khác đi thì hàng có sang nhóm KHÁC trong danh sách không? Nếu CÓ và hồ sơ chưa nêu giá trị đó → ghi vào \"nhayCam\" (daCo=false). "
        "Không ghi dữ kiện chỉ ảnh hưởng thuế suất, thương hiệu, model, kích thước; không ghi khi hồ sơ đã nêu rõ. Đừng chốt chỉ vì chọn giả định dễ nhất cho dữ kiện còn thiếu.\n"
        "6) Điều loại trừ chỉ áp khi hàng thực sự là thứ mà điều đó gọi tên và nhóm đích có mô tả khớp hàng; nhóm đích không gọi đúng hàng thì điều loại trừ KHÔNG áp.\n\n"
        f"HÀNG: \"{mo}\"\nBẢN CHẤT (hồ sơ hàng): {json.dumps(bc, ensure_ascii=False)}\n\n"
        + "\n".join(khoi) + ("\n\n" + cg2 if cg2 else "") + "\n\nHỒ SƠ CÁC NHÓM ỨNG VIÊN:\n" + ho_so + da_loai_txt +
        "\n\nTrả JSON thuần (không giải thích ngoài JSON):\n"
        "{\"xet\": [{\"nhom\": \"xxxx\", \"ketLuan\": \"KHOP|LOAI|CHUA_RO\", \"dieuKhoan\": [\"id điều khoản áp dụng, đúng số hiệu ở trên\"], "
        "\"trich\": \"trích nguyên văn ≤200 chữ làm căn cứ (điều khoản hoặc tên nhóm/chú giải chi tiết)\", "
        "\"dieuKienVao\": \"đặc điểm QUAN SÁT ĐƯỢC của hàng để vào nhóm này (ngắn)\", "
        "\"duKienQuyetDinh\": \"dữ kiện phân biệt nhóm này với nhóm khác\", \"daCo\": true|false}],\n"
        " \"ketQua\": \"CHOT|PHAN_VAN\", \"nhom\": \"xxxx nếu CHOT\", \"quyTac\": \"QT1|QT3a|QT3b|QT3c\",\n"
        " \"nhanh\": [{\"neu\": \"đặc điểm quan sát được\", \"nhom\": \"xxxx\", \"canCu\": [\"id điều khoản\"]}] (nếu PHAN_VAN, ≥2 nhánh khác nhóm),\n"
        " \"cauHoi\": \"câu hỏi khách, gắn đúng điều kiện luật cần dữ kiện\" (nếu PHAN_VAN),\n"
        " \"nhayCam\": [{\"duKien\": \"dữ kiện chưa có mà chữ luật dùng để tách nhóm\", \"daCo\": false, \"giaTriA\": \"đặc điểm quan sát được (phương án A)\", \"nhomA\": \"xxxx\", \"canCuA\": [\"id\"], \"giaTriB\": \"đặc điểm quan sát được (phương án B)\", \"nhomB\": \"yyyy\", \"canCuB\": [\"id\"]}],\n"
        " \"nhomThieu\": [\"xxxx\"] (tối đa 4 nhóm 4 số KHÔNG có trong danh sách ứng viên nhưng theo hiểu biết của bạn có thể gọi đúng tên hàng hoặc là đích của điều loại trừ; chỉ để hệ tra thêm văn bản, để [] nếu không có)}\n"
        "Mọi nhóm ứng viên đều phải có mặt trong \"xet\".\n"
        "QUAN TRỌNG: KHÔNG dùng công cụ, KHÔNG chạy lệnh, KHÔNG tìm web, KHÔNG đọc tệp: mọi văn bản cần thiết đã ở trên. Trả lời NGAY bằng JSON."
    )
    return prompt, ids, text_all

# ---------------- hậu xử lý tất định ----------------
def kiem_trich(trich, nguon):
    """Trích dẫn thật: >=70% cụm 3 chữ của trích có trong văn bản nguồn (đã bỏ dấu)."""
    w = bo_dau(trich).split()
    if len(w) < 4: return False
    gr = [" ".join(w[i:i + 3]) for i in range(len(w) - 2)]
    src = " " + bo_dau(nguon) + " "
    return sum(1 for g in gr if g in src) / len(gr) >= 0.7

def chuan_id(ds, ids):
    if isinstance(ds, str): ds = re.split(r"[,;\s]+", ds)
    r = []
    for i in ds or []:
        i = re.sub(r"[\[\]\s]", "", str(i))
        if i in ids and i not in r: r.append(i)
    return r

def hau_xu_ly(kq, uv, ids, text_all, h):
    xet = {}
    for x in (kq.get("xet") or []):
        n = nhom_hop_le(x.get("nhom"))
        if n and n in uv: xet[n] = x
    for n in xet:
        x = xet[n]
        x["dieuKhoanTho"] = x.get("dieuKhoan")
        x["dieuKhoan"] = chuan_id(x.get("dieuKhoan"), ids)  # id bịa thì bỏ
        x["trichDung"] = kiem_trich(x.get("trich") or "", text_all)
    S = [n for n, x in xet.items() if x.get("ketLuan") in ("KHOP", "CHUA_RO")]
    out = {"xet": xet, "S": S, "lyDo": []}
    thieu = [n for n in S if xet[n].get("daCo") is False or bo_dau(xet[n].get("ketLuan")) == "chua ro"]
    # nhạy cảm: dữ kiện chưa có mà đổi giá trị thì sang nhóm khác; chỉ nhận khi hai nhóm đều chưa bị loại bằng điều khoản có thật
    def loai_that(n): return xet.get(n, {}).get("ketLuan") == "LOAI" and bool(xet[n]["dieuKhoan"])
    llm_chot = nhom_hop_le(kq.get("nhom")) if kq.get("ketQua") == "CHOT" else None
    nhay = []
    for e in (kq.get("nhayCam") or []):
        if not isinstance(e, dict) or e.get("daCo") is not False: continue
        a, b = nhom_hop_le(e.get("nhomA")), nhom_hop_le(e.get("nhomB"))
        if not a or not b or a == b or a not in uv or b not in uv or loai_that(a) or loai_that(b): continue
        if S and not ({a, b} & set(S)) and a != llm_chot and b != llm_chot: continue
        nhay.append({"duKien": e.get("duKien"), "a": (a, e.get("giaTriA"), chuan_id(e.get("canCuA"), ids)), "b": (b, e.get("giaTriB"), chuan_id(e.get("canCuB"), ids))})
    out["nhay"] = nhay
    if len(S) >= 2 and thieu:
        out["ketQua"] = "PHAN_VAN"; out["lyDo"].append("LUAT_CUNG: >=2 nhóm còn khớp và điểm khác là dữ kiện hồ sơ chưa có")
    elif nhay and (S or llm_chot):
        out["ketQua"] = "PHAN_VAN"; out["lyDo"].append("LUAT_CUNG: dữ kiện chưa có mà đổi giá trị thì sang nhóm khác: " + "; ".join(str(e["duKien"]) for e in nhay)[:300])
    elif len(S) >= 2:
        llm_chot = nhom_hop_le(kq.get("nhom")) if kq.get("ketQua") == "CHOT" else None
        if llm_chot in S: out["ketQua"], out["nhom"] = "CHOT", llm_chot; out["lyDo"].append("LLM chốt theo thứ tự quy tắc, mọi dữ kiện đã có")
        else: out["ketQua"] = "PHAN_VAN"; out["lyDo"].append("LLM không chốt được trong khi mọi dữ kiện đã có")
    elif len(S) == 1:
        out["ketQua"], out["nhom"] = "CHOT", S[0]; out["lyDo"].append("chỉ còn một nhóm: QT1")
    else:
        out["ketQua"] = "BE_TAC"; out["lyDo"].append("không nhóm nào khớp trong ứng viên (TIM_SOT)")
    if out["ketQua"] == "CHOT":
        x = xet[out["nhom"]]
        out["quyTac"] = kq.get("quyTac") or "QT1"
        out["dieuKhoanApDung"] = x["dieuKhoan"]
        out["chungMinh"] = bool(x["dieuKhoan"]) or x["trichDung"]
        out["trichDan"] = x.get("trich")
    elif out["ketQua"] == "PHAN_VAN":
        nh, thay = [], set()
        for b in (kq.get("nhanh") or []):
            n = nhom_hop_le(b.get("nhom"))
            if n in S and n not in thay and b.get("neu"):
                nh.append({"neu": b["neu"], "nhom": n, "canCu": chuan_id(b.get("canCu"), ids) or xet[n]["dieuKhoan"]}); thay.add(n)
        for e in out.get("nhay", []):  # nhánh từ kiểm nhạy cảm
            for (n, gt, cc) in (e["a"], e["b"]):
                if n not in thay and gt:
                    nh.append({"neu": gt, "nhom": n, "canCu": cc or xet.get(n, {}).get("dieuKhoan") or []}); thay.add(n)
        for n in S:  # bổ sung nhánh còn thiếu từ điều kiện vào nhóm
            if n not in thay and xet[n].get("dieuKienVao"):
                nh.append({"neu": xet[n]["dieuKienVao"], "nhom": n, "canCu": xet[n]["dieuKhoan"]}); thay.add(n)
        out["nhanh"] = nh
        out["dapAnDieuKien"] = "; ".join(f"Nếu {b['neu']} → nhóm {b['nhom']} (căn cứ: {', '.join(b['canCu']) or xet.get(b['nhom'], {}).get('trich','')[:80]})" for b in nh)
        out["cauHoi"] = kq.get("cauHoi") or " / ".join([str(e["duKien"]) for e in out.get("nhay", [])] + [xet[n].get("duKienQuyetDinh", "") for n in thieu])
        out["quyTac"] = "QT1(thiếu dữ kiện → hỏi)"
        out["chungMinh"] = len(nh) >= 2 and all(b["canCu"] or xet.get(b["nhom"], {}).get("trichDung") for b in nh)
    return out


# ---------------- phản biện: kiểm giả định trước khi CHỐT ----------------
class ChoDap(Exception):
    pass

def hoi(prompt, ca, luot, meta=None):
    """Một lượt hỏi mô hình. --nao agy: gọi agy. --nao tep: có D/dap/<ca>-<luot>.json thì đọc, chưa có thì ghi D/hoi/<ca>-<luot>.txt và báo chờ."""
    prompt = re.sub(r"[\ufffd\x00-\x08\x0b\x0c\x0e-\x1f\ud800-\udfff]", "", prompt)  # ký tự hỏng/điều khiển không đi vào prompt
    if A.nao == "agy": return agy.goi(prompt, ca=ca, vong=A.vong)
    D = A.thu_muc
    for sub in ("hoi", "dap", "meta"): os.makedirs(f"{D}/{sub}", exist_ok=True)
    dap = f"{D}/dap/{ca}-{luot}.json"
    if os.path.exists(dap): return open(dap).read()
    duong = f"{D}/hoi/{ca}-{luot}.txt"
    with open(duong, "w", encoding="utf-8", newline="") as f: f.write(prompt)
    tho = open(duong, "rb").read()
    tho.decode("utf-8")  # nổ nếu tệp không phải UTF-8
    assert tho == prompt.encode("utf-8")
    json.dump({"ca": ca, "luot": luot, "byte": len(tho), "utf8": True, **(meta or {})}, open(f"{D}/meta/{ca}-{luot}.json", "w", encoding="utf-8"), ensure_ascii=False)
    raise ChoDap(f"{ca}-{luot}")

def phan_bien(mo, h, r, uv, ids, text_all, kq, luot=2):
    """Lượt kiểm phản biện cho kết quả CHOT. Trả (danh sách mục hợp lệ, thô). Mục hợp lệ: nhóm Y khác X, giả định không có trong hồ sơ
    (hoặc trích hồ sơ không kiểm được), có căn cứ luật thật, và có đặc điểm quan sát được dẫn sang Y."""
    X = r["nhom"]
    bc = {k: h.get(k) for k in ("tenDung", "banChat", "dangVatLy", "dungChoViecGi", "coChe", "oDau", "aiDung", "laBoPhanCua", "tenKhac", "canXacNhan") if h.get(k)}
    bang = []
    for n in uv:
        x = r["xet"].get(n)
        if not x: continue
        bang.append(f"- {n} {TEN.get(n,'')[:70]} | {x.get('ketLuan')} | điều kiện vào: {x.get('dieuKienVao')} | lý do: {x.get('duKienQuyetDinh')} | điều khoản: {','.join(x.get('dieuKhoan') or [])}")
    dan = sorted({i for x in r["xet"].values() for i in (x.get("dieuKhoan") or [])})
    van = "\n".join(f"[{i}] {re.sub(chr(10), ' ', DK.theo_id[i]['nguyenVan'])}" for i in dan if i in DK.theo_id)
    prompt = (
        "Bạn là kiểm toán viên phân loại HS. Hệ vừa CHỐT nhóm %s cho hàng dưới đây. Luật PHẢI HỎI, KHÔNG ĐOÁN: chỉ được chốt khi mọi dữ kiện mà chữ luật dùng để tách nhóm "
        "đã có TRONG HỒ SƠ HÀNG. Hãy tìm GIẢ ĐỊNH ẨN: chỗ hệ đã loại nhóm khác (hoặc chọn %s) dựa trên điều 'hàng là ...' mà hồ sơ KHÔNG nêu.\n\n"
        "HÀNG: \"%s\"\nHỒ SƠ HÀNG: %s\n\nBẢNG PHÁN XỬ CỦA HỆ:\n%s\n\nĐIỀU KHOẢN HỆ ĐÃ DẪN:\n%s\n\n"
        "Với MỖI nhóm Y khác %s mà việc loại Y dựa vào một giả định, nêu một mục nếu ĐỦ ba điều: (1) chữ luật (điều khoản, tên nhóm, chú giải) dùng chính dữ kiện đó để tách %s khỏi Y; "
        "(2) hồ sơ hàng không nêu dữ kiện đó (hoặc nó nằm trong canXacNhan); (3) nếu dữ kiện khác đi thì hàng khớp Y theo chữ luật. "
        "KHÔNG nêu dữ kiện chỉ ảnh hưởng thuế suất, thương hiệu, model, kích thước. Nếu hồ sơ đã nêu rõ thì KHÔNG nêu.\n"
        "Trả JSON thuần: {\"phanBien\": [{\"nhomY\": \"yyyy\", \"giaDinh\": \"giả định hệ đã dùng, nói như đặc điểm quan sát được\", \"hoSoCoNeu\": true|false, "
        "\"trichHoSo\": \"trích nguyên văn hồ sơ nếu hoSoCoNeu\", \"neuKhac\": \"đặc điểm quan sát được nếu giả định sai → hàng vào Y\", \"trichLuat\": \"trích nguyên văn chữ luật tách hai nhóm\", "
        "\"canCu\": [\"id điều khoản nếu có\"]}]} (để [] nếu không có giả định ẩn). KHÔNG dùng công cụ, không tìm web: trả JSON ngay."
    ) % (X, X, mo, json.dumps(bc, ensure_ascii=False), "\n".join(bang), van or "(không có)", X, X)
    resp = agy.json_tu_chuoi(hoi(prompt, r.get("ca"), luot, {"loai": "phan-bien", "ungVien": uv}))
    ho_so_txt = json.dumps(bc, ensure_ascii=False)
    hop_le = []
    for e in ((resp or {}).get("phanBien") or []):
        if not isinstance(e, dict): continue
        y = nhom_hop_le(e.get("nhomY"))
        if not y or y == X or y not in uv or not e.get("neuKhac") or not e.get("giaDinh"): continue
        co_neu = e.get("hoSoCoNeu") is True and kiem_trich(e.get("trichHoSo") or "", ho_so_txt)
        if co_neu: continue  # hồ sơ có nêu thật: không phải giả định
        luat_ok = bool(chuan_id(e.get("canCu"), ids)) or kiem_trich(e.get("trichLuat") or "", text_all)
        if not luat_ok: continue
        hop_le.append({**e, "nhomY": y, "canCu": chuan_id(e.get("canCu"), ids)})
    return hop_le, resp

# ---------------- chạy ----------------
def main():
    bc = {}
    for l in open(P(A.bo_chuan)):
        d = json.loads(l); bc[d["ca"]] = d
    cas = json.load(open(P(A.ca_sai)))
    cu, uu = {}, {}
    for f in A.uv_cu:
        txt = open(P(f)).read().strip()
        rows = json.loads(txt) if txt.startswith("[") else [json.loads(l) for l in txt.splitlines() if l.strip()]
        for d in rows:
            for n, x in (d.get("xet") or {}).items():  # nhóm mô hình từng cho là KHOP/CHUA_RO: ưu tiên giữ (bằng chứng, không phải nhãn)
                if x.get("ketLuan") in ("KHOP", "CHUA_RO"): uu.setdefault(d["ca"], []).append(n)
            for n in d.get("ungVien") or []: cu.setdefault(d["ca"], [])
            for n in d.get("ungVien") or []:
                if n not in cu[d["ca"]]: cu[d["ca"]].append(n)
    for c in cas:
        c["ungVien"] = list(dict.fromkeys((c.get("ungVien") or []) + cu.get(c["ca"], [])))
        c["uuTien"] = list(dict.fromkeys(uu.get(c["ca"], [])))
    da = set()
    if os.path.exists(A.ra):
        for l in open(A.ra):
            try: da.add(json.loads(l)["ca"])
            except Exception: pass
    import threading, concurrent.futures as cf
    khoa = threading.Lock(); dung = threading.Event(); cho = []

    def xu_ly(ca):
        if dung.is_set(): return
        mo = chuan(ca["moTa"]); h = HH.get(mo, {})
        with khoa: uv, tu = gom_ung_vien(ca, mo, h, bc)
        best, luot, loi_nhac = None, 0, ""
        lan1, da_loai, prev = None, {}, None
        ca["_moi"] = []
        try:
            for lan in range(2):
                prompt, ids, text_all, uv, bo = dung_prompt(ca, mo, h, uv, tu, da_loai)
                day_du = prompt + loi_nhac
                if day_du == prev: break  # không bao giờ hỏi lại đúng nội dung đã hỏi
                loai_luot = "mo-rong" if (lan == 1 and ca["_moi"]) else "phan-xu" if not loi_nhac else "phan-xu-lai"
                luot += 1
                kq = agy.json_tu_chuoi(hoi(day_du, ca["ca"], luot, {"loai": loai_luot, "ungVien": uv, "daBo": bo, "nhomMoi": ca["_moi"], "daLoai": list(da_loai)}))
                prev = day_du
                if not (kq and kq.get("xet")):
                    loi_nhac = "\n\nLƯU Ý: lần trả lời trước trống hoặc không phải JSON hợp lệ theo mẫu. Đừng gọi công cụ nào. Trả lại ĐÚNG mẫu JSON."
                    continue
                best = (kq, list(uv), ids, text_all)
                # tìm trước, đoán sau: nhóm trọng tài nêu thêm mà lượt này CHƯA được xem (kể cả nhóm đã bị cắt vì giới hạn KB) -> lượt mở rộng
                moi = [n for n in (nhom_hop_le(x) for x in (kq.get("nhomThieu") or [])[:4]) if n and n not in uv]
                if lan == 0 and moi:
                    xet1 = {}
                    for x in kq["xet"]:
                        if isinstance(x, dict) and nhom_hop_le(x.get("nhom")) in uv: xet1[nhom_hop_le(x.get("nhom"))] = x
                    da_loai = dict(xet1)  # mọi kết luận lượt 1; nhóm đã LOAI không đưa lại hồ sơ, nhóm bị cắt vì KB cũng giữ kết luận
                    giu = [n for n in uv if xet1.get(n, {}).get("ketLuan") != "LOAI"]
                    ca["_moi"] = list(dict.fromkeys(moi))
                    ca["uuTien"] = list(dict.fromkeys(giu + (ca.get("uuTien") or [])))
                    lan1 = best
                    uv = (giu + ca["_moi"])[:12]
                    continue
                break
        except ChoDap as e:
            cho.append(str(e)); return
        except agy.QuotaError as e:
            dung.set(); print("DUNG: hết hạn mức LLM mạnh:", e, file=sys.stderr); return
        kq, uv, ids, text_all = best or ({}, uv, ids, text_all)
        if lan1 is not None and best is not lan1 and da_loai:  # hợp kết luận lượt 1 (LOAI, hoặc nhóm bị cắt vì KB) vào kết quả lượt mở rộng
            co = {nhom_hop_le(y.get("nhom")) for y in kq["xet"] if isinstance(y, dict)}
            kq = dict(kq); kq["xet"] = list(kq["xet"]) + [x for n, x in da_loai.items() if n not in co]
            uv = uv + [n for n in da_loai if n not in uv]; ids = set(ids) | set(lan1[2]); text_all += "\n" + lan1[3]
        r = hau_xu_ly(kq, uv, ids, text_all, h)
        r["ca"] = ca["ca"]; pb_thô = None
        if r["ketQua"] == "CHOT" and luot < 2 and A.phan_bien:
            try:
                luot += 1
                muc, pb_thô = phan_bien(mo, h, r, uv, ids, text_all, kq, luot)
            except ChoDap as e:
                cho.append(str(e)); return
            except agy.QuotaError as e:
                dung.set(); print("DUNG: hết hạn mức LLM mạnh:", e, file=sys.stderr); return
            if muc:
                X = r["nhom"]; xx = r["xet"][X]
                nh = [{"neu": muc[0]["giaDinh"], "nhom": X, "canCu": xx["dieuKhoan"]}]
                dd = {X}
                for e in muc:
                    if e["nhomY"] not in dd: nh.append({"neu": e["neuKhac"], "nhom": e["nhomY"], "canCu": e["canCu"]}); dd.add(e["nhomY"])
                r.update({"ketQua": "PHAN_VAN", "nhom": None, "nhanh": nh, "quyTac": "QT1(thiếu dữ kiện → hỏi)",
                          "dapAnDieuKien": "; ".join(f"Nếu {b['neu']} → nhóm {b['nhom']} (căn cứ: {', '.join(b['canCu']) or 'tên nhóm/chú giải chi tiết'})" for b in nh),
                          "cauHoi": " / ".join(str(e.get("giaDinh")) for e in muc), "chungMinh": len(nh) >= 2})
                r["dieuKhoanApDung"] = None; r["trichDan"] = None
                r["lyDo"].append("PHAN_BIEN: giả định ẩn hồ sơ không nêu: " + "; ".join(str(e["giaDinh"]) for e in muc)[:300])
        nhan = ca.get("nhomNhan") or ca.get("nhan")
        out = {"ca": ca["ca"], "moTa": mo, "nhanKetQua": ca.get("nhan"), "nhomNhan": nhan, "ungVien": uv,
               "nhanDinh": h.get("nhanDinh"), "ketQua": r["ketQua"], "nhom": r.get("nhom"), "quyTac": r.get("quyTac"),
               "dieuKhoanApDung": r.get("dieuKhoanApDung"), "dapAnDieuKien": r.get("dapAnDieuKien"), "nhanh": r.get("nhanh"), "cauHoi": r.get("cauHoi"),
               "chungMinh": r.get("chungMinh"), "trichDan": r.get("trichDan"), "lyDo": r["lyDo"], "llmKetQua": kq.get("ketQua"), "llmNhom": kq.get("nhom"),
               "nhayCamTho": kq.get("nhayCam"), "nhomThieuTho": kq.get("nhomThieu"), "phanBienTho": pb_thô, "luotLlm": luot,
               "xet": {n: {k: x.get(k) for k in ("ketLuan", "dieuKhoan", "dieuKhoanTho", "trich", "trichDung", "dieuKienVao", "duKienQuyetDinh", "daCo")} for n, x in r["xet"].items()}}
        with khoa:
            with open(A.ra, "a") as f: f.write(json.dumps(out, ensure_ascii=False) + "\n")
            print(ca["ca"], mo[:40], "->", out["ketQua"], out.get("nhom") or [b["nhom"] for b in (out.get("nhanh") or [])], "nhan", nhan, flush=True)

    viec = [ca for ca in cas if ca["ca"] not in da]
    with cf.ThreadPoolExecutor(A.song_song) as ex: list(ex.map(xu_ly, viec))
    if cho: print("CHO DAP:", " ".join(sorted(cho)), "-> ghi đáp vào", A.thu_muc + "/dap/<ca>-<luot>.json rồi chạy lại cùng lệnh")
    if dung.is_set(): sys.exit(3)

if __name__ == "__main__":
    main()
