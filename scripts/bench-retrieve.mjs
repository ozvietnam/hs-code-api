import fs from 'fs';
const norm = s => String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const toks = s => norm(s).split(' ').filter(w => w.length>=2);
const tax = JSON.parse(fs.readFileSync('data/tax.json','utf8'));
const expl = JSON.parse(fs.readFileSync('data/explanatory-notes.json','utf8'));
let legal={}; try{legal=JSON.parse(fs.readFileSync('data/legal-notes-enriched.json','utf8'))}catch{}
const docs={};
for (const [hs,r] of Object.entries(tax)){const L=legal[hs]||{};docs[hs]=toks([r.vn,r.en,expl[hs]?.noteVi,L.chu_giai_nhom,typeof L.bao_gom==='string'?L.bao_gom:''].filter(Boolean).join(' '));}
const N=Object.keys(docs).length, k1=1.5,b=0.75; const df={},post={},dl={}; let s=0;
for (const [hs,tk] of Object.entries(docs)){dl[hs]=tk.length;s+=tk.length;const tf={};for(const t of tk)tf[t]=(tf[t]||0)+1;for(const[t,f]of Object.entries(tf)){df[t]=(df[t]||0)+1;(post[t]=post[t]||[]).push([hs,f]);}}
const avgdl=s/N, idf=t=>Math.log(1+(N-(df[t]||0)+0.5)/((df[t]||0)+0.5));
function search(q,K){const qt=[...new Set(toks(q))],sc={};for(const t of qt){const p=post[t];if(!p)continue;const w=idf(t);for(const[hs,f]of p)sc[hs]=(sc[hs]||0)+w*(f*(k1+1))/(f+k1*(1-b+b*dl[hs]/avgdl));}return Object.entries(sc).sort((a,b)=>b[1]-a[1]).slice(0,K).map(x=>x[0]);}
const gold=fs.readFileSync('data/oz-gold-final.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l));
const nz=s=>String(s).replace(/\./g,'').trim();
const Ns=1500,step=Math.max(1,Math.floor(gold.length/Ns));const sample=[];for(let i=0;i<gold.length&&sample.length<Ns;i+=step)sample.push(gold[i]);
const Ks=[10,20,40,50];
for (const mode of ['clean','raw']){
  const h8={},h4={};Ks.forEach(K=>{h8[K]=0;h4[K]=0;});let n=0;
  for(const g of sample){const q=mode==='clean'?[g.tenHang,g.chatLieu,g.congDung].filter(Boolean).join(' '):(g.sampleDesc||g.tenHang);const a=nz(g.hsCode);if(!q||!a)continue;n++;const res=search(q,50).map(nz);for(const K of Ks){const top=res.slice(0,K);if(top.includes(a))h8[K]++;if(top.some(h=>h.slice(0,4)===a.slice(0,4)))h4[K]++;}}
  const p=x=>Math.round(x/n*1000)/10;
  console.log(`\n=== Query = ${mode==='clean'?'SẠCH (tenHang+chatLieu+congDung)':'RAW sampleDesc'} | n=${n} ===`);
  console.log('       8-số    4-số');
  for(const K of Ks)console.log(`  @${K}:   ${p(h8[K])}%   ${p(h4[K])}%`);
}
