// ~/phieu2/p2.mjs  (ngoài repo) — chạy từ cwd = worktree repo
// node ~/phieu2/p2.mjs de <nhom>   -> ghi ~/phieu2/de-<nhom>.txt (prompt gửi Studio chat)
// node ~/phieu2/p2.mjs nap <nhom>  -> đọc ~/phieu2/tra-<nhom>.txt (trả lời Studio) -> data/ho-so-ma/dieu-kien/<chương>-p2-<nhom>.jsonl
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
const R = process.cwd(); const P = path.join(os.homedir(), 'phieu2');
const T = await import(R + '/scripts/ho-so-ma/tach-dieu-kien.mjs');
const [mode, nhom] = process.argv.slice(2);
const VANG = ['8516','9405','8471','4016','8543','8501','4202','0201','8479','9031','3926','7326','8517','8708','3004','6110'];
// Gỡ ví dụ thuộc nhóm vàng khỏi hướng dẫn hệ thống
let HD = T.HUONG_DAN_TACH_DIEU_KIEN
  .replace('ví dụ "loại dòng điện", "chất liệu mặt ngoài"', 'ví dụ tên trục đúng như chữ luật dùng')
  .replace(/ví dụ `bieu:85437040#1`/g, 'ví dụ `bieu:XXXXXXXX#1`');
const skill = fs.readFileSync(path.join(R, '.agents/skills/doc-tron-nhom/SKILL.md'), 'utf8');
const sys = HD + '\n\n=== SKILL doc-tron-nhom (bản trên main) ===\n' + skill;
const callModel = async (messages) => {
  if (mode === 'de') {
    const user = messages.find((m) => m.role === 'user').content;
    const txt = '### HỆ THỐNG\n' + sys + '\n\n### GÓI NHÓM\n' + user + '\n\nTrả về DUY NHẤT một khối JSON {"dieuKien":[],"giaiChong":[],"canhTranh":[]} như khuôn trên, không lời bình. Quy ước bắt buộc: trong mọi trường "trich", thay MỌI dấu cách bằng ký tự ¦ (máy sẽ đổi lại khi nạp).';
    fs.writeFileSync(path.join(P, `de-${nhom}.txt`), txt);
    return '{"dieuKien":[],"giaiChong":[],"canhTranh":[]}';
  }
  return fs.readFileSync(path.join(P, `tra-${nhom}.txt`), 'utf8').replace(/¦/g, ' ');
};
const out = mode === 'nap' ? path.join(R, 'data/ho-so-ma/dieu-kien', `p2-${nhom}.jsonl`) : undefined;
const r = await T.tachGoiNhom(nhom, { callModel, khongChia: true, maxBytes: 1e9, moHinh: 'gemini-studio-chat', out });
if (mode === 'de') {
  const s = fs.readFileSync(path.join(P, `de-${nhom}.txt`), 'utf8');
  const lo = [];
  for (const g of VANG) if (g !== nhom) { const c = (s.match(new RegExp(`(?<!\\d)(${g}|${g.slice(0,2)}\\.${g.slice(2)})`, 'g')) || []).length; if (c) lo.push(`${g}:${c}`); }
  const sysLo = VANG.filter((g) => new RegExp(`(?<!\\d)(${g}|${g.slice(0,2)}\\.${g.slice(2)})`).test(sys));
  console.log(nhom, 'bytes', Buffer.byteLength(s), '| ma vang trong he thong+skill:', sysLo.join(',') || 0, '| vang/bang vang:', (s.match(/M-81-vang|bảng vàng|\bvang\b/g) || []).length, '| ma vang khac trong chu luat goi:', lo.join(' ') || 0);
} else {
  console.log(nhom, 'banGhi', r.banGhi?.length, 'loi', JSON.stringify(r.loi || r.canhBao || '').slice(0, 400));
}
