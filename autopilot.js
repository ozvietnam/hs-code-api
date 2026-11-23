// Autopilot soạn bản đồ 4 số trong tab AI Studio: 3 nhóm/lượt, prompt dựng từ gói JSON. Dùng: window.GOI_TEN='goi-vongN.json' rồi eval.
(async () => {
const b='https://raw.githubusercontent.com/ozvietnam/hs-code-api/tmp/studio-ban-do/';
const G=await (await fetch(b+window.GOI_TEN+'?'+Date.now())).json();
function dung(lo){const L=[`Soạn bản đồ quan hệ cho đúng các nhóm: ${lo.join(', ')}. Trả một khối json duy nhất là MẢNG các đối tượng theo khuôn. Mỗi nhóm tối đa 6 cạnh, mỗi trục tối đa 4 mục. Chỉ trích nguyên văn đoạn có id dưới đây.`,''];
 for(const ma of lo){const info=G.nhom[ma]||{};L.push(`##### NHÓM ${ma}: ${(G.ten[ma]||{}).vi||''}`);const seen=new Set();const add=id=>{if(typeof id==='string'&&!seen.has(id)&&typeof G.nguon[id]==='string'){seen.add(id);L.push(`[${id}] ${G.nguon[id]}`);}};
  (info.ct||[]).forEach(add);(info.dk||[]).forEach(add);(info.wco||[]).forEach(w=>add(w&&w.id));if(/^8[45]/.test(ma))(G.cg2||[]).forEach(c=>add(c&&c.id));
  if((info.st||[]).length){L.push('','Gợi ý từ sổ tay (không có id, không dùng làm căn cứ):');info.st.forEach(s=>L.push('- '+s));}
  L.push('',`DANH SÁCH LÁNG GIỀNG của ${ma}:`);for(const lg of info.langGieng||[]){const m=String(lg.ma);L.push(`- ${m}: ${(G.ten[m]||{}).vi||''}`);for(const pid of (G.phamViLangGieng||{})[m]||[]){if(typeof G.nguon[pid]==='string')L.push(`  [${pid}] ${G.nguon[pid]}`);}}L.push('');}
 return L.join('\n');}
const lo=[];for(let i=0;i<G.nhomThuTu.length;i+=3)lo.push(G.nhomThuTu.slice(i,i+3));
const send=t=>{const ta=document.querySelector('textarea[aria-label="Enter a prompt"]')||[...document.querySelectorAll('textarea')].pop();Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(ta,t);ta.dispatchEvent(new Event('input',{bubbles:true}));ta.blur();setTimeout(()=>{[...document.querySelectorAll('button')].find(b=>/^Run/.test(b.innerText.trim()))?.click();},900);};
if(window.bdAuto)clearInterval(window.bdAuto.t);
window.bdAuto={q:lo.slice(1),log:['gui '+lo[0].join(',')],idle:0,t:setInterval(()=>{const A=window.bdAuto;
 const busy=[...document.querySelectorAll('button')].some(b=>/Stop/.test(b.innerText)&&!/Claude/.test(b.innerText));if(busy){A.idle=0;return;}
 const T=[...document.querySelectorAll('ms-chat-turn')];const x=T[T.length-1]?.innerText||'';
 if(!/thumb_down/.test(x)){if(++A.idle>15){A.log.push('treo');clearInterval(A.t);}return;}
 if(/rate limit/i.test(x)){A.log.push('ratelimit');clearInterval(A.t);return;}
 if(!A.q.length){A.log.push('xong');clearInterval(A.t);return;}
 const l=A.q.shift();send(dung(l));A.log.push('gui '+l.join(','));},25000)};
send(dung(lo[0]));
})();
