#!/usr/bin/env python3
"""ext-spec.py <toolresult> <outdir> : trích spec ranh-gioi-spec@1 từ file prompt Studio (Drive) → <outdir>/<pn6>.json (bản cuối thắng)"""
import sys,json,base64,re,os
src,out=sys.argv[1],sys.argv[2]; os.makedirs(out,exist_ok=True)
raw=base64.b64decode(json.load(open(src))['content']).decode('utf-8','replace'); p=json.loads(raw)
texts=[c['text'] for c in p['chunkedPrompt']['chunks'] if c.get('role')=='model' and not c.get('isThought') and isinstance(c.get('text'),str)]
by={};bad=0;chua=[]
for t in texts:
    for m in re.finditer(r'```(?:json)?\s*([\s\S]*?)```',t):
        s=re.sub(r',(\s*[}\]])',r'\1',m.group(1))
        try: j=json.loads(s)
        except Exception as e: bad+=1; continue
        if isinstance(j,dict) and j.get('phienBan')=='ranh-gioi-spec@1' and 'pn6' in j: by[str(j['pn6'])]=j
    chua+=re.findall(r'CHUA_SOAN:\s*([0-9 ,]+)',t)
for g,j in by.items(): json.dump(j,open(f'{out}/{g}.json','w'),ensure_ascii=False,indent=2)
print('spec',len(by),'json lỗi',bad,'CHUA_SOAN',chua[-1:] )
