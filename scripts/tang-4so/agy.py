"""Gọi LLM mạnh qua Antigravity (gói thuê bao, có hạn mức). Mỗi lượt ghi vào docs/tang-4so/agy-luot.jsonl.
Gặp lỗi hạn mức thì ném QuotaError: người gọi phải dừng, KHÔNG chuyển sang khoá khác."""
import json, os, subprocess, time

AGY = os.path.expanduser("~/.local/bin/agy")
MODEL = "gemini-3.8-flash-medium"
NHAT_KY = os.environ.get("AGY_LUOT", os.path.join(os.path.dirname(__file__), "..", "..", "docs", "tang-4so", "agy-luot.jsonl"))
DAU_HIEU_HAN_MUC = ("quota", "rate limit", "rate_limit", "resource_exhausted", "429", "exhausted", "usage limit")


class QuotaError(RuntimeError):
    pass


def goi(prompt, ca=None, vong=None, timeout=900):
    t0 = time.time()
    r = subprocess.run([AGY, "-p", prompt, "--model", MODEL, "--output-format", "json"],
                       capture_output=True, text=True, timeout=timeout)
    raw = (r.stdout or "") + "\n" + (r.stderr or "")
    ok, resp, loi = False, "", None
    try:
        d = json.loads(r.stdout)
        resp = d.get("response") or ""
        ok = d.get("status") == "SUCCESS" and bool(resp.strip())
        if not ok: loi = f"status={d.get('status')}"
    except Exception as e:
        loi = f"khong-doc-duoc-json: {e}"
    quota = (not ok) and any(k in raw.lower() for k in DAU_HIEU_HAN_MUC)
    with open(NHAT_KY, "a") as f:
        f.write(json.dumps({"ca": ca, "vong": vong, "model": MODEL, "ok": ok, "giay": round(time.time() - t0, 1),
                            "loi": loi, "quota": quota}, ensure_ascii=False) + "\n")
    if quota:
        raise QuotaError(raw[:300])
    return resp if ok else None


def json_tu_chuoi(txt):
    if not txt: return None
    a, b = txt.find("{"), txt.rfind("}")
    if a < 0 or b <= a: return None
    try: return json.loads(txt[a:b + 1])
    except Exception: return None
