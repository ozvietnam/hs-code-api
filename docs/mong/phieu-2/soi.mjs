// ~/phieu2/soi.mjs — khâu soi (ADR-0008) vòng 2b: mô hình hãng khác soi chồng/hở trên bảng anh em đã soạn.
// node ~/phieu2/soi.mjs <nhom> [model]   (cwd = worktree có bang-anh-em + dieu-kien của phiếu)
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
const [nhom, model = 'gemma4:31b'] = process.argv.slice(2);
const R = process.cwd(); const C = nhom.slice(0, 2);
const OUT = path.join(os.homedir(), 'phieu2/soi'); fs.mkdirSync(OUT, { recursive: true });
const dk = new Map();
for (const l of fs.readFileSync(path.join(R, 'data/ho-so-ma/dieu-kien', C + '.jsonl'), 'utf8').split('\n')) {
  if (!l.trim()) continue; const r = JSON.parse(l); if (r.loai === 'DIEU_KIEN') dk.set(r.id, r);
}
const bang = fs.readFileSync(path.join(R, 'data/ho-so-ma/bang-anh-em', C + '.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse)
  .filter((b) => b.cha === 'bieu:' + nhom || b.cha.startsWith('bieu:' + nhom));
const HE = `Bạn là NGƯỜI SOI trong dây chuyền số hoá luật phân loại HS Việt Nam. Người soạn đã viết điều kiện (DIEU_KIEN) cho từng dòng anh em cùng cấp của biểu thuế. Việc của bạn HẸP: chỉ soi bảng anh em dưới đây, KHÔNG soạn lại.
Tìm:
(1) CHỒNG: cặp anh em mà một mặt hàng có thật có thể thoả ĐỒNG THỜI điều kiện của cả hai (theo điều kiện đã soạn), trong khi luật chỉ cho vào một dòng. Nêu mặt hàng ví dụ cụ thể và điều kiện nào thiếu để tách.
(2) HỞ: mặt hàng có thật thuộc dòng cha nhưng không thoả dòng anh em nào.
Chỉ nêu khi chắc chắn có mặt hàng thật minh hoạ. Không nêu cặp đã bị điều kiện tách rõ (ví dụ một bên phủ định đúng điều kiện của bên kia).
Trả về DUY NHẤT JSON: {"chong":[{"a":"bieu:...","b":"bieu:...","matHang":"...","lyDo":"..."}],"ho":[{"matHang":"...","lyDo":"..."}]}`;
function moTaVe(cot) {
  return (cot.congThuc?.cacVe || []).map((v) => '  vế ' + v.ve + ': ' + v.cacDieuKien.map((c) => {
    const r = dk.get(c.id); const q = r ? r.cauHoi : c.id;
    return (c.phu ? 'KHÔNG[' : '[') + q + (c.kieu === 'GIA_TRI' && c.tap ? ' → ' + c.tap.join('/') : '') + ']';
  }).join(' VÀ ')).join('\n') || '  (không có điều kiện)';
}
const ketQua = [];
for (const b of bang) {
  if ((b.anhEm || []).length < 2) continue;
  const chaTen = (b.chuoiCha || []).map((c) => c.nut).join(' > ');
  const user = `Dòng cha: ${b.cha} (chuỗi: ${chaTen})\nĐiều kiện của dòng cha:\n${moTaVe((b.chuoiCha || []).at(-1) || {})}\n\nCác dòng anh em:\n` +
    b.anhEm.map((a) => `- ${a.nut} "${a.ten}"${a.laLoaiKhac ? ' (Loại khác)' : ''}\n${moTaVe(a)}`).join('\n');
  const t0 = Date.now(); let txt = '', loi = null;
  try {
    const res = await fetch('http://192.168.1.68:11434/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model, stream: false, format: 'json', options: { num_ctx: 32768, temperature: 0.2 },
        messages: [{ role: 'system', content: HE }, { role: 'user', content: user }] }) });
    const j = await res.json(); txt = j.message?.content || ''; if (!res.ok) loi = JSON.stringify(j).slice(0, 200);
  } catch (e) { loi = String(e); }
  let kq = null; try { kq = JSON.parse(txt); } catch { loi = loi || 'json'; }
  ketQua.push({ cha: b.cha, soAnhEm: b.anhEm.length, giay: Math.round((Date.now() - t0) / 1000), kq, loi, user });
  console.log(b.cha, b.anhEm.length, 'anh em', Math.round((Date.now() - t0) / 1000) + 's', 'chong', kq?.chong?.length ?? '-', 'ho', kq?.ho?.length ?? '-', loi || '');
  fs.writeFileSync(path.join(OUT, `soi-${nhom}-${model.replace(/[:/]/g, '_')}.json`), JSON.stringify({ nhom, model, he: HE, ketQua }, null, 1));
}
