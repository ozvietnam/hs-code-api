// Dùng: (await fetch('https://raw.githubusercontent.com/ozvietnam/hs-code-api/tmp/studio-pn6/tmp-pn6/studio-run.js').then(r=>r.text())) rồi eval, gọi: await window.studioRun('prompt-l3d2.txt')
// Hàm: nạp system-v3.md + prompt vào tab new_chat, bấm Run, trả {started}. window.studioState() trả {href,ready,stop,specs}.
window.studioRun = async (promptFile) => {
  const B = 'https://raw.githubusercontent.com/ozvietnam/hs-code-api/tmp/studio-pn6/tmp-pn6/';
  const [sys, pr] = await Promise.all([fetch(B + 'system-v3.md').then(r => r.text()), fetch(B + promptFile).then(r => r.text())]);
  const sb = [...document.querySelectorAll('button')].find(b => /System instructions/i.test((b.innerText || '') + (b.getAttribute('aria-label') || '')));
  if (sb) sb.click(); await new Promise(r => setTimeout(r, 1000));
  const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('blur', { bubbles: true })); };
  const ts = [...document.querySelectorAll('textarea')];
  const si = ts.find(t => t.getAttribute('aria-label') === 'System instructions'), pi = ts.find(t => t.getAttribute('aria-label') === 'Enter a prompt');
  if (!si || !pi) return { err: 'no textarea' };
  set(si, sys); set(pi, pr); await new Promise(r => setTimeout(r, 1500));
  const run = [...document.querySelectorAll('button')].find(b => /^Run/.test((b.innerText || '').trim()));
  if (!run) return { err: 'no run' }; run.click();
  return { started: new Date().toISOString(), sys: sys.length, pr: pr.length };
};
window.studioState = () => ({ href: location.href, ready: document.body.innerText.includes('Response ready'), stop: !![...document.querySelectorAll('button')].find(b => /Stop/.test(b.innerText || '')), specs: (document.body.innerText.match(/ranh-gioi-spec@1/g) || []).length });
