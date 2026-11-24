#!/usr/bin/env python3
"""Như cham_ollama.py nhưng người chấm là Gemini qua agy (gói thuê bao). Dùng: AGY_MODEL=gemini-4-hydrogen-high python3 cham_agy.py <D>
Thoát 0 hết lượt chờ, 10 vừa trả lời, 3 lỗi/hạn mức: DỪNG, không đổi khoá."""
import json, os, re, subprocess, sys, time, tempfile
from concurrent.futures import ThreadPoolExecutor
D=sys.argv[1]; M=os.environ.get("AGY_MODEL","gemini-4-hydrogen-high"); A=os.path.expanduser("~/.local/bin/agy")
os.makedirs(D+"/dap",exist_ok=True)
cho=sorted(f[:-4] for f in os.listdir(D+"/hoi") if f.endswith(".txt") and not os.path.exists(f"{D}/dap/{f[:-4]}.json"))
def hoi(k):
    p=open(f"{D}/hoi/{k}.txt",encoding="utf-8").read(); t0=time.time()
    if len(p.encode())>125000: return k,"QUA_DAI"
    with tempfile.TemporaryDirectory() as t:
        try: r=subprocess.run([A,"-p",p,"--model",M,"--output-format","json"],capture_output=True,text=True,timeout=900,cwd=t)
        except Exception as e: return k,"LOI "+str(e)[:80]
    try: d=json.loads(r.stdout)
    except Exception: return k,"LOI doc json: "+(r.stderr or r.stdout)[-200:]
    x=(d.get("response") or "").strip()
    if d.get("status")!="SUCCESS" or not x: return k,"LOI "+str(d.get("status"))+" "+(r.stderr or "")[-120:]
    m=re.search(r"```(?:json)?\s*(.*?)```",x,re.S); x=(m.group(1) if m else x).strip()
    i=x.find("{"); x=x[i:] if i>0 else x
    try: json.loads(x)
    except Exception:
        try: json.JSONDecoder().raw_decode(x)
        except Exception: return k,"LOI json tra loi"
    open(f"{D}/dap/{k}.json","w",encoding="utf-8").write(x)
    return k,f"OK {time.time()-t0:.0f}s"
xong=loi=0
with ThreadPoolExecutor(2) as ex:
    for k,s in ex.map(hoi,cho):
        print(k,s,flush=True); 
        if s.startswith("OK"): xong+=1
        else: loi+=1
sys.exit(0 if not cho else 3 if loi and not xong else 10 if xong else 0)
