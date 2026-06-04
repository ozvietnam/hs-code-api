#!/usr/bin/env node
/**
 * gen-loai-khac-products.mjs
 *
 * Dùng Gemini Flash để sinh tên sản phẩm thực tế (kiểu Shopee/Taobao)
 * cho mỗi trong 3,383 mã "Loại khác".
 *
 * Công thức prompt: 4 tầng phân cấp GIR Rule 1
 *   Ch.XX → nhóm XXXX → phân nhóm XXXXXX → loại trừ sibling → "còn lại là gì?"
 *
 * Neo bởi oz-gold examples khi có → LLM extrapolate thêm.
 * Không có oz-gold → LLM suy luận từ hierarchy + sibling exclusion.
 *
 * Usage:
 *   GEMINI_API_KEY=xxx node scripts/gen-loai-khac-products.mjs --dry-run
 *   GEMINI_API_KEY=xxx node scripts/gen-loai-khac-products.mjs --chapter 87
 *   GEMINI_API_KEY=xxx node scripts/gen-loai-khac-products.mjs --all
 *   GEMINI_API_KEY=xxx node scripts/gen-loai-khac-products.mjs --hs 87149290
 *   GEMINI_API_KEY=xxx node scripts/gen-loai-khac-products.mjs --all --concurrency 5
 *
 * Output: data/loai-khac-products/{chXX}.jsonl (per chapter)
 *         data/loai-khac-products.jsonl (merged)
 *
 * Format per line:
 *   { hs, tenHang, chatLieu?, congDung?, source:"llm" }
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, '..');
const IDX_PATH  = path.join(ROOT, 'data', 'loai-khac-index.json');
const ENR_PATH  = path.join(ROOT, 'data', 'loai-khac-enriched.json');
const TAX_PATH  = path.join(ROOT, 'data', 'tax.json');
const OUT_DIR   = path.join(ROOT, 'data', 'loai-khac-products');
const OUT_MERGE = path.join(ROOT, 'data', 'loai-khac-products.jsonl');

const CHAPTER_NOUN = {
  '01':'Động vật sống','02':'Thịt các loại','03':'Thủy sản','04':'Sữa và sản phẩm sữa',
  '05':'Sản phẩm động vật','06':'Cây trồng','07':'Rau củ','08':'Trái cây','09':'Gia vị',
  '10':'Ngũ cốc','11':'Bột và tinh bột','12':'Hạt và quả có dầu','13':'Nhựa cây',
  '15':'Dầu mỡ động thực vật','16':'Đồ hộp thực phẩm','17':'Đường và bánh kẹo',
  '18':'Sô cô la','19':'Sản phẩm ngũ cốc chế biến','20':'Đồ hộp rau quả',
  '21':'Thực phẩm chế biến','22':'Đồ uống','23':'Thức ăn gia súc','24':'Thuốc lá',
  '25':'Khoáng sản thô','26':'Quặng khoáng','27':'Nhiên liệu khoáng',
  '28':'Hóa chất vô cơ','29':'Hóa chất hữu cơ','30':'Dược phẩm','31':'Phân bón',
  '32':'Sơn và mực in','33':'Mỹ phẩm và hương liệu','34':'Xà phòng và chất tẩy rửa',
  '35':'Chất kết dính','36':'Chất nổ','37':'Phim ảnh','38':'Hóa chất hỗn hợp',
  '39':'Sản phẩm nhựa','40':'Sản phẩm cao su','41':'Da thuộc','42':'Đồ da và túi xách',
  '43':'Lông thú','44':'Sản phẩm gỗ','45':'Sản phẩm lie','46':'Sản phẩm đan lát',
  '47':'Bột giấy','48':'Giấy và bìa','49':'Sách và ấn phẩm','50':'Tơ lụa',
  '51':'Len','52':'Bông','53':'Sợi thực vật','54':'Sợi nhân tạo','55':'Sợi staple',
  '56':'Sản phẩm dệt','57':'Thảm','58':'Vải đặc biệt','59':'Vải tráng phủ',
  '60':'Vải dệt kim','61':'Quần áo dệt kim','62':'Quần áo dệt thoi',
  '63':'Hàng dệt may khác','64':'Giày dép','65':'Mũ nón','66':'Ô dù',
  '67':'Lông vũ và hoa giả','68':'Đá và xi măng','69':'Gốm sứ','70':'Kính thủy tinh',
  '71':'Đồ trang sức','72':'Sắt thép','73':'Sản phẩm sắt thép','74':'Sản phẩm đồng',
  '75':'Sản phẩm niken','76':'Sản phẩm nhôm','78':'Sản phẩm chì','79':'Sản phẩm kẽm',
  '80':'Sản phẩm thiếc','81':'Sản phẩm kim loại khác','82':'Dụng cụ kim loại',
  '83':'Phụ kiện kim loại','84':'Máy móc công nghiệp','85':'Thiết bị điện',
  '86':'Phương tiện đường sắt','87':'Phương tiện vận tải và bộ phận',
  '88':'Máy bay','89':'Tàu thuyền','90':'Thiết bị quang học và đo lường',
  '91':'Đồng hồ','92':'Nhạc cụ','93':'Vũ khí','94':'Đồ nội thất và đèn',
  '95':'Đồ chơi và thể thao','96':'Hàng tạp hóa','97':'Tác phẩm nghệ thuật',
};

// --------------------------------------------------------------------------
// Gemini API (Gemini 2.5 Flash — cheapest, fastest)
// --------------------------------------------------------------------------

const GEMINI_MODEL = process.env.GEMINI_MODEL_PRODUCTS || 'gemini-2.5-flash-lite-preview-06-17';

async function callGemini(prompt, retries = 3) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 600,
    },
  };

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (resp.status === 429) {
        const wait = Math.pow(2, attempt + 1) * 1000;
        process.stderr.write(`  [429] rate limit, wait ${wait/1000}s\n`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Gemini ${resp.status}: ${text.slice(0, 200)}`);
      }

      const data = await resp.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return text.trim();
    } catch (err) {
      if (attempt === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}

// --------------------------------------------------------------------------
// Prompt builder — 4-level hierarchy + oz-gold anchors
// --------------------------------------------------------------------------

function clean(s) {
  return (s || '').replace(/\n+/g,' ').replace(/\s+/g,' ')
    .replace(/\b[oO]\s+[oO]\s+[oO]\b/g,'').trim();
}

function buildPrompt(hs, lk, hn, taxRec) {
  const ch = hs.slice(0, 2), h4 = hs.slice(0, 4), h6 = hs.slice(0, 6);
  const siblings = lk?.s || [];
  const ozExamples = (lk?.ex || []).filter(e => e.s === 'oz-gold').slice(0, 3);

  const chNoun = CHAPTER_NOUN[ch] || 'hàng hóa chương ' + ch;

  // h4 scope from phan_biet "dùng cho X"
  const pb = clean(hn?.phan_biet || '');
  const mPb = pb.match(/(?:dùng|dành) cho\s+(.{5,100})/i);
  const h4Scope = mPb
    ? mPb[1].replace(/\([^)]*\)/g,'').split(/\.\s/)[0].replace(/[,\s]+$/,'').trim().slice(0, 80)
    : '';

  // h6 qualifier from en field (keep English — Gemini understands)
  const en = clean(taxRec?.en || '');
  const h6En = en.includes(';')
    ? en.split(';').slice(1).join(';').trim()
    : '';
  const isNEC = /n\.e\.c|not elsewhere|not specified/i.test(h6En);

  const lines = [];
  lines.push('Bạn là chuyên gia phân loại hàng hóa xuất nhập khẩu Việt Nam.');
  lines.push('');
  lines.push('Mã HS: ' + hs + ' (mã "Loại khác" — residual subheading)');
  lines.push('');
  lines.push('PHÂN CẤP BẮT BUỘC (sản phẩm phải thỏa mãn TẤT CẢ các tầng):');
  lines.push('  Ch.' + ch + ': ' + chNoun);
  if (h4Scope) {
    lines.push('  Nhóm ' + h4 + ': dùng cho/thuộc loại ' + h4Scope);
  } else {
    lines.push('  Nhóm ' + h4);
  }
  if (h6En && !isNEC) {
    lines.push('  Phân nhóm ' + h6 + ': ' + h6En);
  }
  lines.push('');

  if (siblings.length > 0) {
    lines.push('KHÔNG THUỘC các mã cụ thể (đây là "Loại khác" = những gì còn lại):');
    siblings.slice(0, 6).forEach(s => {
      const name = s.v.replace(/^[-\s]+/, '').replace(/\s*\(SEN\)\s*/i, '').split(/[;(]/)[0].trim().slice(0, 70);
      lines.push('  ✗ ' + s.h + ': ' + name);
    });
    if (siblings.length > 6) {
      lines.push('  ✗ ... và ' + (siblings.length - 6) + ' loại cụ thể khác trong cùng phân nhóm');
    }
    lines.push('');
  }

  if (ozExamples.length > 0) {
    lines.push('Ví dụ tờ khai hải quan THỰC TẾ đã được hải quan Việt Nam chấp nhận:');
    ozExamples.forEach(e => {
      const mat = e.m ? ', ' + e.m : '';
      lines.push('  → ' + e.p + mat);
    });
    lines.push('');
    lines.push('Dựa vào pattern trên, sinh thêm 12 tên sản phẩm thực tế.');
  } else {
    lines.push('Sinh 15 tên sản phẩm thực tế như tên hàng trên Shopee/Taobao.');
  }

  lines.push('Yêu cầu:');
  lines.push('  - Mỗi tên 1 dòng. Không số thứ tự. Không giải thích.');
  lines.push('  - Cụ thể: bao gồm chất liệu, kích thước, màu, công dụng khi thích hợp.');
  lines.push('  - Đa dạng: không lặp lại cùng một sản phẩm với màu/size khác.');
  lines.push('  - Chỉ tên sản phẩm — không mô tả tại sao thuộc mã này.');

  return lines.join('\n');
}

// --------------------------------------------------------------------------
// Parse LLM response → list of product objects
// --------------------------------------------------------------------------

function parseProducts(hs, text) {
  const products = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);

  for (const line of lines) {
    // Skip lines that look like explanations
    if (/^(lý do|giải thích|note:|mã hs|phân nhóm|chương|\*\*)/i.test(line)) continue;
    // Strip leading bullets/dashes
    const cleaned = line.replace(/^[-•*→✓✗\d]+[.)]\s*/, '').trim();
    if (cleaned.length < 3 || cleaned.length > 200) continue;

    // Split tenHang from chatLieu if separated by comma
    const parts = cleaned.split(/,\s+(.+)/);
    const tenHang = parts[0].trim();
    const chatLieu = parts[1] ? parts[1].trim() : '';

    products.push({
      hs,
      tenHang,
      chatLieu,
      source: 'llm',
    });
  }

  return products.slice(0, 20); // cap at 20 per code
}

// --------------------------------------------------------------------------
// Load already-processed codes (resume support)
// --------------------------------------------------------------------------

function loadProcessed(chapter) {
  const p = path.join(OUT_DIR, `ch${chapter}.jsonl`);
  if (!fs.existsSync(p)) return new Set();
  const lines = fs.readFileSync(p, 'utf8').split('\n').filter(Boolean);
  return new Set(lines.map(l => { try { return JSON.parse(l).hs; } catch { return null; } }).filter(Boolean));
}

// --------------------------------------------------------------------------
// Parse args
// --------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  const o = { dryRun: false, all: false, chapter: null, hs: null, concurrency: 3, merge: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run')   o.dryRun = true;
    if (args[i] === '--all')       o.all = true;
    if (args[i] === '--merge')     o.merge = true;
    if (args[i] === '--chapter')   o.chapter = (args[i+1]||'').padStart(2,'0');
    if (args[i].startsWith('--chapter=')) o.chapter = args[i].slice(10).padStart(2,'0');
    if (args[i] === '--hs')        o.hs = args[i+1];
    if (args[i] === '--concurrency') o.concurrency = parseInt(args[i+1]||'3');
  }
  return o;
}

// --------------------------------------------------------------------------
// Concurrency limiter
// --------------------------------------------------------------------------

async function withConcurrency(tasks, limit, fn) {
  const results = [];
  let i = 0;
  async function run() {
    while (i < tasks.length) {
      const task = tasks[i++];
      results.push(await fn(task));
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, run));
  return results;
}

// --------------------------------------------------------------------------
// Merge per-chapter files → single jsonl
// --------------------------------------------------------------------------

function mergeOutput() {
  if (!fs.existsSync(OUT_DIR)) return;
  const files = fs.readdirSync(OUT_DIR).filter(f => /^ch\d+\.jsonl$/.test(f)).sort();
  const out = fs.createWriteStream(OUT_MERGE, { flags: 'w' });
  let total = 0;
  for (const f of files) {
    const content = fs.readFileSync(path.join(OUT_DIR, f), 'utf8').trim();
    if (content) { out.write(content + '\n'); total += content.split('\n').length; }
  }
  out.end();
  const sz = (fs.statSync(OUT_MERGE).size / 1e6).toFixed(1);
  console.log(`Merged: ${total} products | ${sz}MB → ${OUT_MERGE}`);
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------

async function main() {
  const opts = parseArgs();

  if (opts.merge) { mergeOutput(); return; }

  if (!opts.dryRun && !process.env.GEMINI_API_KEY) {
    console.error('Cần GEMINI_API_KEY. Dùng --dry-run để xem prompt.');
    process.exit(1);
  }

  if (!opts.dryRun && !opts.hs && !opts.chapter && !opts.all) {
    console.error('Dùng: --all | --chapter XX | --hs XXXXXXXX | --dry-run');
    process.exit(1);
  }

  console.log('Loading data...');
  const idx      = JSON.parse(fs.readFileSync(IDX_PATH, 'utf8'));
  const enriched = JSON.parse(fs.readFileSync(ENR_PATH, 'utf8'));
  const tax      = JSON.parse(fs.readFileSync(TAX_PATH, 'utf8'));

  // Determine codes to process
  let allHs = Object.keys(idx);
  if (opts.hs)      allHs = [opts.hs];
  else if (opts.chapter) allHs = allHs.filter(hs => hs.startsWith(opts.chapter));
  // For --all, process all 3,383

  if (opts.dryRun) {
    // Show first 3 prompts
    const samples = allHs.slice(0, opts.hs ? 1 : 3);
    for (const hs of samples) {
      const lk  = idx[hs];
      const hn  = enriched.headings?.[hs.slice(0, 4)] || {};
      const t   = tax[hs];
      const prompt = buildPrompt(hs, lk, hn, t);
      console.log('\n' + '='.repeat(60));
      console.log('PROMPT for', hs, '(' + (lk?.s?.length || 0) + ' siblings,', (lk?.ex?.filter(e=>e.s==='oz-gold')||[]).length, 'oz-gold):');
      console.log('='.repeat(60));
      console.log(prompt);
      console.log('--- ~' + prompt.split(' ').length, 'words');
    }
    if (!opts.hs) console.log(`\n... và ${allHs.length - 3} mã khác`);
    return;
  }

  // Ensure output dir
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  // Group by chapter for file management
  const byChapter = {};
  for (const hs of allHs) {
    const ch = hs.slice(0, 2);
    if (!byChapter[ch]) byChapter[ch] = [];
    byChapter[ch].push(hs);
  }

  let totalDone = 0, totalErrors = 0, totalProducts = 0;
  const startTime = Date.now();

  for (const [ch, codes] of Object.entries(byChapter).sort()) {
    const chPath = path.join(OUT_DIR, `ch${ch}.jsonl`);
    const processed = loadProcessed(ch);
    const todo = codes.filter(hs => !processed.has(hs));

    if (todo.length === 0) {
      console.log(`Ch.${ch}: already done (${codes.length} codes)`);
      continue;
    }

    console.log(`Ch.${ch}: processing ${todo.length}/${codes.length} codes (concurrency=${opts.concurrency})...`);
    const stream = fs.createWriteStream(chPath, { flags: 'a' });

    let chDone = 0, chErrors = 0;

    await withConcurrency(todo, opts.concurrency, async (hs) => {
      const lk = idx[hs];
      const hn = enriched.headings?.[hs.slice(0, 4)] || {};
      const t  = tax[hs];

      try {
        const prompt = buildPrompt(hs, lk, hn, t);
        const raw    = await callGemini(prompt);
        const products = parseProducts(hs, raw);

        for (const p of products) {
          stream.write(JSON.stringify(p) + '\n');
        }

        chDone++;
        totalDone++;
        totalProducts += products.length;

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        process.stdout.write(
          `\r  Ch.${ch}: ${chDone}/${todo.length} | total: ${totalDone} codes, ${totalProducts} products | ${elapsed}s`
        );
      } catch (err) {
        chErrors++;
        totalErrors++;
        process.stderr.write(`\n  ERROR ${hs}: ${err.message}\n`);
      }
    });

    await new Promise(r => stream.end(r));
    console.log(`\n  Ch.${ch} done: ${chDone} processed, ${chErrors} errors`);
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Hoàn thành: ${totalDone} codes | ${totalProducts} products | ${totalErrors} errors`);
  console.log(`Avg products/code: ${(totalProducts / (totalDone || 1)).toFixed(1)}`);

  // Auto-merge
  console.log('\nMerging...');
  mergeOutput();
}

main().catch(e => { console.error(e); process.exit(1); });
