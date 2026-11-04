#!/usr/bin/env python3
"""Gộp các gói nhỏ (<20 PN6) liên tiếp thành gói ~30 PN6: goi/g-<đầu>-<cuối>.txt ; in danh sách gói chạy theo thứ tự"""
import re,os,glob
G='/home/claude/working/pn6/goi'
def parse(f):
    s=open(f).read(); hdr,body=s.split('\n\n',1)
    ids=re.search(r'\(([0-9 ]+)\)',hdr).group(1).split()
    secs=[x for x in re.split(r'(?==== GÓI PN6 )',body) if x.strip()]
    return ids,secs,hdr
files=sorted([f for f in glob.glob(G+'/c*.txt') if not f.endswith('-fix.txt')],key=lambda f:(int(re.search(r'c(\d+)-',f).group(1)),int(re.search(r'-(\d+)\.txt',f).group(1))))
done={'c84-1','c84-2','c84-3','c84-4','c85-1'}
plan=[];buf=[];bufids=[];hdr0=None
def flush():
    global buf,bufids
    if not buf: return
    name=f'g-{buf[0][0]}-{buf[-1][0]}' if len(buf)>1 else buf[0][0]
    if len(buf)>1:
        h=re.sub(r'cho \d+ phân nhóm 6 số \([^)]*\)',f'cho {len(bufids)} phân nhóm 6 số ({" ".join(bufids)})',hdr0)
        open(f'{G}/{name}.txt','w').write(h+'\n\n'+''.join(x for _,secs in buf for x in secs))
    plan.append((name,len(bufids)))
    buf=[];bufids=[]
for f in files:
    n=os.path.basename(f)[:-4]
    if n in done: continue
    ids,secs,hdr=parse(f); hdr0=hdr0 or hdr
    if len(ids)>=20: flush(); plan.append((n,len(ids))); continue
    buf.append((n,secs)); bufids+=ids
    if len(bufids)>=28: flush()
flush()
open('/home/claude/working/pn6/plan.txt','w').write('\n'.join(f'{n}\t{k}' for n,k in plan)+'\n')
print(len(plan),'gói;',sum(k for _,k in plan),'PN6'); print(' '.join(n for n,_ in plan))
