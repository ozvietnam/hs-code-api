#!/usr/bin/env node
/**
 * Dựng sổ tay chú giải (backlog bước 8) — data/so-tay/<nhom4>.json. Một lượt AI / nhóm, sau đó
 * MÁY kiểm từng mục (lib/so-tay.js): câu trích phải có nguyên văn trong nguồn, nhóm đích loại trừ
 * phải có trong câu trích, ngưỡng số phải có trong câu trích, dòng 8 số phải có trong biểu thuế.
 * Mục không kiểm được bị bỏ và ghi vào data/so-tay/_bao-cao.json để người xem.
 *
 * Chạy trên máy có khoá AI (.120 / Hermes): chuỗi lib/llm-tier.js (MiniMax → Hermes → OpenRouter → Gemini).
 *   node scripts/build-so-tay.mjs --nhom=8509,8516            # vài nhóm
 *   node scripts/build-so-tay.mjs --bench='/tmp/egcb/out/v5-*.json'   # nhóm của truth/top/top3 trong kết quả bench
 *   node scripts/build-so-tay.mjs --all                        # đủ 1.269 nhóm (chạy đêm)
 *   thêm: --limit=N  --concurrency=2  --force (dựng lại cả nhóm đã có)  --dry (in prompt, không gọi AI)
 *   --bao-cao=<tệp>: ghi báo cáo vào tệp riêng (lô giao ngoài: data/so-tay/bao-cao/lo-NNN.json)
 *   --xuat-nguon=<thư mục>: ghi prompt từng nhóm (<nhom>.txt) + _he-thong.txt, không gọi AI — để một AI
 *     khác (vd phiên Claude, người) soạn; --tu-tep=<thư mục>: nạp JSON <nhom>.json đã soạn thay vì gọi AI,
 *     vẫn qua đủ máy kiểm như đường AI.
 * Nghiệm thu bước 1: ≥ 95 % mục AI đề xuất kiểm được nguồn (in ở cuối + trong _bao-cao.json).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'data', 'so-tay');
const { sourcesFor, verifySoTay } = require('../lib/so-tay.js');

const argv = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] ?? true] : [a, true];
}));

// Giới hạn chữ mỗi nguồn đưa vào prompt (chú giải 49.11 dài 50k ký tự). Bị cắt thì ghi vào báo cáo.
const CAP = { nhom: 30000, chuong: 40000, phan: 25000, sen: 4000, other: 4000 }; // bước 1: ch72 bị cắt mất (IV)(B) ở mức 14k

const SYSTEM = `Bạn là chuyên viên phân loại HS Việt Nam, đang soạn SỔ TAY cho MỘT nhóm 4 số từ chú giải nguyên văn.
Chỉ dùng các NGUỒN được cung cấp; không dùng kiến thức ngoài. Mỗi mục bắt buộc có:
  "nguon": đúng mã nguồn trong ngoặc vuông [..] của đoạn bạn dựa vào;
  "trich": câu NGUYÊN VĂN chép từ nguồn đó (≤ 300 ký tự, được lược "…" giữa các đoạn). Không diễn đạt lại.
Mục nào không trích được nguyên văn thì BỎ, đừng đoán. Máy sẽ kiểm từng câu trích.
Trả JSON đúng lược đồ:
{
 "phamVi": {"text": "1–2 dòng phạm vi nhóm", "nguon": "...", "trich": "..."},
 "dieuKienVao": [{"fact": "ten_su_kien_snake_case", "op": "=|<=|>=|<|>|in", "value": true|số|"chuỗi", "donVi": "kg|%|mm|…|null", "ngoaiTru": ["…"], "nguon": "...", "trich": "..."}],
 "loaiTru": [{"dieuKien": "hàng nào bị loại", "sangNhom": "8508" hoặc "8450|8451", "nguon": "...", "trich": "câu có NÊU số nhóm đích, vd (nhóm 85.08)"}],
 "phanBiet": [{"hoi": "câu hỏi có/không về đặc tính hàng (không nhắc mã)", "neuCo": "mã", "neuKhong": "mã", "nguon": "...", "trich": "..."}],
 "boPhan": {"quyTac": "...", "tomTat": "...", "nguon": "...", "trich": "..."} hoặc null,
 "dong8": [{"hs": "8 số", "dieuKien": "điều kiện quyết định dòng này", "loaiKhac": true|false, "nguon": "tax.<8 số> hoặc sen.<mã>", "trich": "..."}]
}
Quy tắc: loaiTru chỉ ghi khi chú giải nêu ĐÍCH DANH nhóm đích; ngưỡng số (value là số) phải xuất hiện trong câu trích;
dong8 lấy đủ các dòng 8 số của nhóm có trong nguồn tax.*, loaiKhac do máy tự điền theo biểu thuế (tên dòng bắt đầu bằng "Loại khác" → true), bạn ghi gì cũng bị ghi đè; ưu tiên điều kiện từ SEN khi có.
Dòng biểu thuế VN thường chỉ ghi "- - - Loại khác": điều kiện cấp phân nhóm 6 số lấy từ wco.<6 số> (tên WCO, tiếng Anh) — trích nguyên văn tiếng Anh, "nguon": "wco.<6 số>".
Bài học bước 1 (60 nhóm, 07/10/2026) — bắt buộc:
- Câu trích phải tự nó nói điều mục khẳng định; KHÔNG ghép hai câu ở hai chỗ khác nhau thành một kết luận (vd định nghĩa A + "ưu tiên nhóm X" ≠ "A thuộc X").
- phanBiet: mã ngoài nhóm này (neuCo/neuKhong) phải được NÊU trong câu trích; nguồn chỉ nói "Chương 29" thì không được chọn 2917.
- Số nhóm chỉ là VÍ DỤ linh kiện ("máy biến điện (nhóm 85.04)") hoặc dải "từ 33.03 đến 33.07" / "Chương 84" → không phải loaiTru đích danh; chỉ ghi các mã nêu tên.
- "dieuKien"/"text" chỉ diễn đạt điều câu trích (hoặc wco/sen) nói; không thêm tên phân nhóm theo hiểu biết riêng. Dòng 8 số trùng chữ mà nguồn không phân biệt → ghi "dòng cha không có trong nguồn — đối chiếu biểu thuế", không đoán.
- Chép nguyên văn kể cả lỗi chính tả/số hiệu chú giải cũ của nguồn ("Chú giải 8 (a)"), không sửa.
- dieuKienVao CHỈ từ nguồn nhom*/ch*/phan* và phải là điều kiện VÀO NHÓM 4 số. Ngưỡng/điều kiện của phân nhóm hay dòng 8 số (tên wco.*, sen.*, tax.*: "công suất ≤ 750 W", "chu vi > 60 cm") KHÔNG đưa vào dieuKienVao — chúng thuộc dong8. Máy loại các mục đó.
- Câu "nhóm này cũng bao gồm…", "có thể…", danh sách ví dụ: KHÔNG đặt value=true như điều kiện bắt buộc. Một nhánh của "A hoặc B" không được tách thành điều kiện độc lập.
- loaiTru: câu nguồn nói "thường thuộc/nằm nhóm X", "tùy trường hợp" thì BỎ (không phải loại trừ dứt khoát). dieuKien phải giữ định ngữ giới hạn của câu ("đã qua sử dụng thuộc nhóm 63.09", không viết "đã qua sử dụng").
- phanBiet: "hoi" KHÔNG nhắc mã phân nhóm hay "WCO". Nhánh "không" phải có căn cứ trong nguồn; không suy từ cấu trúc anh em hay từ danh sách loại trừ. Không tạo nhiều mục cùng một câu hỏi cho các cặp mã khác nhau.
- Dấu lược "…": đoạn bị lược KHÔNG được chứa ngoại lệ ("trừ", "tuy nhiên", "với điều kiện", "không kể"). Câu liền sau câu trích mà bắt đầu bằng "Tuy nhiên/trừ khi" thì phải kéo vào câu trích.
- Nguồn tự mâu thuẫn (nhóm bao gồm X ở một chỗ, loại trừ X ở chỗ khác) → bỏ cả hai phía, ghi vào mô tả PR.
- Thà bỏ mục còn hơn mục không có căn cứ.`;

function promptFor(h4, sources) {
  const cut = [];
  const parts = Object.entries(sources).map(([id, text]) => {
    const kind = id.startsWith('tax.') || id.startsWith('wco.') ? null : id.endsWith('.nhom') ? 'nhom' : id.endsWith('.chuong') ? 'chuong' : id.startsWith('phan') ? 'phan' : id.startsWith('sen.') ? 'sen' : 'other';
    const cap = kind ? CAP[kind] : Infinity;
    if (text.length > cap) cut.push(`${id} (${text.length}→${cap})`);
    return `[${id}]\n${text.slice(0, cap)}`;
  });
  return { user: `NHÓM ${h4}. Các nguồn nguyên văn:\n\n${parts.join('\n\n')}\n\nSoạn sổ tay cho nhóm ${h4}.`, cut };
}

function pickHeadings() {
  const H = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'chu-giai-heading.json'), 'utf8'));
  const all = Object.keys(H).filter((h) => !h.startsWith('98')).sort();
  let list = [];
  if (argv.all) list = all;
  if (typeof argv.nhom === 'string') list = argv.nhom.split(',').map((x) => x.replace(/\D/g, '').slice(0, 4));
  if (typeof argv.bench === 'string') {
    const files = fs.globSync ? fs.globSync(argv.bench) : [argv.bench];
    const set = new Set();
    for (const f of files) {
      for (const r of JSON.parse(fs.readFileSync(f, 'utf8'))) {
        for (const hs of [r.truth, r.top, ...(r.top3 || [])]) if (hs) set.add(String(hs).replace(/\D/g, '').slice(0, 4));
      }
    }
    list = [...set].sort();
  }
  list = [...new Set(list)].filter((h) => all.includes(h));
  if (!argv.force) list = list.filter((h) => !fs.existsSync(path.join(OUT, `${h}.json`)));
  return argv.limit ? list.slice(0, Number(argv.limit)) : list;
}

async function buildOne(h4, callLLMJson) {
  const sources = sourcesFor(h4);
  const { user, cut } = promptFor(h4, sources);
  if (typeof argv['xuat-nguon'] === 'string') {
    fs.mkdirSync(argv['xuat-nguon'], { recursive: true });
    fs.writeFileSync(path.join(argv['xuat-nguon'], '_he-thong.txt'), SYSTEM);
    fs.writeFileSync(path.join(argv['xuat-nguon'], `${h4}.txt`), user);
    return null;
  }
  if (argv.dry) {
    console.log(`\n===== ${h4} (${user.length} ký tự prompt${cut.length ? `; cắt: ${cut.join(', ')}` : ''})\n${user.slice(0, 1500)}…`);
    return null;
  }
  const t = Date.now();
  const { json, provider, model } = typeof argv['tu-tep'] === 'string'
    ? { json: JSON.parse(fs.readFileSync(path.join(argv['tu-tep'], `${h4}.json`), 'utf8')), provider: String(argv['nguoi-soan'] || 'tu-tep'), model: null }
    : await callLLMJson(SYSTEM, user, { maxTokens: 8000, timeoutMs: 240000, temperature: 0.1 });
  const { soTay, loai, tong, dat } = verifySoTay(json, h4, sources);
  const decision = fs.existsSync(path.join(ROOT, 'data', 'decision-tables', `${h4}.json`));
  fs.writeFileSync(path.join(OUT, `${h4}.json`), JSON.stringify({
    ...soTay,
    ...(decision ? { bangQuyetDinh: `data/decision-tables/${h4}.json — ưu tiên tuyệt đối, sổ tay không ghi đè` } : {}),
    taoBoi: { provider, model, luc: new Date().toISOString(), ms: Date.now() - t },
    kiemTra: { tong, dat, loai: loai.length, nguonBiCat: cut },
  }, null, 1));
  return { h4, tong, dat, loai, cut, provider, model };
}

async function main() {
  const list = pickHeadings();
  console.error(`sổ tay: ${list.length} nhóm cần dựng${argv.dry ? ' (chạy khô)' : ''}`);
  if (!list.length) return;
  if (!argv['xuat-nguon']) fs.mkdirSync(OUT, { recursive: true });
  const { callLLMJson } = require('../lib/llm-tier.js');
  // Mỗi lô giao ngoài ghi báo cáo riêng (--bao-cao=data/so-tay/bao-cao/lo-NNN.json) để PR song song không xung đột.
  const reportPath = typeof argv['bao-cao'] === 'string' ? path.resolve(argv['bao-cao']) : path.join(OUT, '_bao-cao.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  const report = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : { nhom: {} };
  const queue = [...list];
  const conc = Number(argv.concurrency || 2);
  let done = 0;
  await Promise.all(Array.from({ length: conc }, async () => {
    while (queue.length) {
      const h4 = queue.shift();
      try {
        const r = await buildOne(h4, callLLMJson);
        if (r) report.nhom[h4] = { tong: r.tong, dat: r.dat, loai: r.loai.map((x) => ({ kind: x.kind, lyDo: x.lyDo, item: x.item })), nguonBiCat: r.cut, provider: r.provider, model: r.model };
      } catch (e) {
        report.nhom[h4] = { loi: String(e.message).slice(0, 300) };
      }
      done += 1;
      process.stderr.write(`\r${done}/${list.length} ${h4}   `);
      if (!argv.dry && !argv['xuat-nguon']) fs.writeFileSync(reportPath, JSON.stringify(summarize(report), null, 1));
    }
  }));
  if (argv.dry || argv['xuat-nguon']) return;
  const s = summarize(report);
  fs.writeFileSync(reportPath, JSON.stringify(s, null, 1));
  console.error(`\nmục đạt ${s.tongDat}/${s.tongMuc} (${s.tyLeDat}%) — nghiệm thu bước 1 cần ≥ 95%; nhóm lỗi: ${s.nhomLoi.length}`);
}

function summarize(report) {
  const vals = Object.values(report.nhom);
  const tongMuc = vals.reduce((a, v) => a + (v.tong || 0), 0);
  const tongDat = vals.reduce((a, v) => a + (v.dat || 0), 0);
  return {
    capNhat: new Date().toISOString(),
    soNhom: vals.length,
    tongMuc,
    tongDat,
    tyLeDat: tongMuc ? Math.round((tongDat / tongMuc) * 1000) / 10 : null,
    nhomLoi: Object.entries(report.nhom).filter(([, v]) => v.loi).map(([h]) => h),
    nhom: report.nhom,
  };
}

main().catch((e) => { console.error(e); process.exit(1); });
