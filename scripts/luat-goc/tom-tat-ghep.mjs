// scripts/luat-goc/tom-tat-ghep.mjs — M-36: ghép kết quả soạn (agy Gemini) + phiếu soát (Gemma) thành data/luat-goc/tom-tat; chỉ giữ ý Gemma phán DUNG; câu đổi chữ theo TT31 thì soát lại. Chạy trên máy dev (đường dẫn ~/tt).
// ghép M-36: ra/*.jsonl + tt76 -> data/luat-goc/tom-tat/<ch>.jsonl trên kho mới
import fs from 'node:fs'; const W='/home/oz/qt-wt/mong-m-36/'; const { nap, goi, kiemY, conLai }=await import(W+'scripts/luat-goc/tom-tat.mjs');
const J=f=>fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(JSON.parse); const H='/home/oz/';
const cu=nap(undefined,k=>fs.readFileSync(H+'tt/kho/data/luat-goc/'+k+'.jsonl','utf8').split('\n').filter(x=>x.trim())); const moi=nap();
const soat=new Map(); for(const x of J(H+'tt/soat.jsonl')) soat.set(x.k,x);
const theoNut=new Map(); for(const [id,c] of moi.cau){ if(!theoNut.has(c.nut)) theoNut.set(c.nut,new Map()); const m=theoNut.get(c.nut); if(!m.has(c.chu)) m.set(c.chu,id); }
const soat2=new Map(); if(fs.existsSync(H+'tt/soat2.jsonl')) for(const x of J(H+'tt/soat2.jsonl')) soat2.set(x.k,x); const lai=[];
const dem={y:0,giu:0,sai:0,chuaSoat:0,doiChu:0,loiCong:0,may:0}; const ra=new Map(); const hoiLai=new Set(); const thieu=[];
const R2=fs.readdirSync(H+'tt/ra2').filter(f=>/\.jsonl$/.test(f)); const co2=new Set(R2.map(f=>f.slice(0,4)));
const tep=[...fs.readdirSync(H+'tt/ra').filter(f=>/^\d{4}\.jsonl$/.test(f)).map(f=>H+'tt/ra/'+f),...fs.readdirSync(H+'tt76').filter(f=>/^\d{4}\.jsonl$/.test(f)).map(f=>H+'tt76/'+f)].filter(f=>!co2.has(f.slice(-10,-6)));
for(const f of tep) for(const r of J(f)){ if(!moi.nut.has(r.nut)) continue; const o={nut:r.nut,nhan:'BO_TRO',gom:[],khongGom:[],tachVoi:[]};
 const cl=conLai(moi,r.nut); if(cl){o.gom.push(cl);dem.may++;}
 for(const loai of ['gom','khongGom','tachVoi']) for(const x of r[loai]){ if(x.may) continue; dem.y++; const s=soat.get([r.nut,loai,x.voi||'',x.y].join('|')); if(!s){dem.chuaSoat++;continue;} if(s.p!=='DUNG'){dem.sai++;continue;}
  const ids=x.cau.map(c=>{const a=cu.cau.get(c); return a&&theoNut.get(a.nut)?.get(a.chu)||null;}); if(ids.some(i=>!i)){ const id2=ids.map((i,k)=>i||(moi.cau.has(x.cau[k])?x.cau[k]:null)); const k2=['TT31',r.nut,loai,x.voi||'',x.y].join('|'); const s2=soat2.get(k2);
   if(id2.some(i=>!i)){dem.matCau=(dem.matCau||0)+1;hoiLai.add(r.nut.slice(5,9));continue;} const y2={...x,cau:id2}; if(kiemY(moi,y2,loai,r.nut).length){dem.doiChuHong=(dem.doiChuHong||0)+1;hoiLai.add(r.nut.slice(5,9));continue;}
   if(!s2){dem.choSoatLai=(dem.choSoatLai||0)+1; lai.push({k:k2,nut:r.nut,loai,x:y2}); continue;} if(s2.p!=='DUNG'){dem.sai++;continue;} o[loai].push(y2); dem.giu++; dem.giuSauTT31=(dem.giuSauTT31||0)+1; continue;}
  const y={...x,cau:ids}; if(kiemY(moi,y,loai,r.nut).length){dem.loiCong++;continue;} o[loai].push(y); dem.giu++; }
 const ch=r.nut.slice(5,7); if(!ra.has(ch)) ra.set(ch,[]); ra.get(ch).push(o); }
for(const f of R2) for(const r of J(H+'tt/ra2/'+f)){ if(/@GOC/.test(f)&&r.nut!=='bieu:'+f.slice(0,4)) continue; const o={nut:r.nut,nhan:'BO_TRO',gom:[],khongGom:[],tachVoi:[]}; const cl=conLai(moi,r.nut); if(cl){o.gom.push(cl);dem.may++;}
 for(const loai of ['gom','khongGom','tachVoi']) for(const x of r[loai]){ if(x.may) continue; dem.y++; const k2=['R2',r.nut,loai,x.voi||'',x.y].join('|'); const s2=soat2.get(k2); if(!s2){dem.choSoatLai=(dem.choSoatLai||0)+1; lai.push({k:k2,nut:r.nut,loai,x});continue;} if(s2.p!=='DUNG'){dem.sai++;continue;} if(kiemY(moi,x,loai,r.nut).length){dem.loiCong++;continue;} o[loai].push(x); dem.giu++; }
 const ch=r.nut.slice(5,7); if(!ra.has(ch)) ra.set(ch,[]); ra.get(ch).push(o); }
fs.mkdirSync(W+'data/luat-goc/tom-tat',{recursive:true}); for(const [ch,v] of ra) fs.writeFileSync(W+`data/luat-goc/tom-tat/${ch}.jsonl`,v.sort((a,b)=>a.nut<b.nut?-1:1).map(x=>JSON.stringify(x)).join('\n')+'\n');
fs.writeFileSync(H+'tt/hoi-lai.txt',[...hoiLai].join('\n')+'\n');
console.log(JSON.stringify(dem),'nut',[...ra.values()].reduce((s,v)=>s+v.length,0),'nhom co chu doi',hoiLai.size,[...hoiLai].slice(0,30).join(' '));

fs.writeFileSync(H+'tt/lai.jsonl',lai.map(x=>JSON.stringify(x)).join('\n')+'\n');
