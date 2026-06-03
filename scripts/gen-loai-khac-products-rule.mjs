#!/usr/bin/env node
/**
 * gen-loai-khac-products-rule.mjs
 *
 * Sinh sản phẩm thực tế cho mã Loại khác bằng pure rule-based reasoning.
 * KHÔNG dùng AI API — dùng kiến thức nhúng sẵn (embedded domain knowledge)
 * kết hợp phân tích cấu trúc HS code.
 *
 * Công thức:
 *   1. Parse h6En → xác định loại hàng chính (product type)
 *   2. Parse sibling constraints → xác định vùng loại trừ
 *   3. Detect new/used từ code pattern (Xx1/Xx2 → mới/đã qua sử dụng)
 *   4. Lookup domain template → sinh tên sản phẩm cụ thể
 *   5. Apply material/spec variation → đa dạng hoá
 *
 * Usage:
 *   node scripts/gen-loai-khac-products-rule.mjs --chapter 84
 *   node scripts/gen-loai-khac-products-rule.mjs --hs 84029090
 *   node scripts/gen-loai-khac-products-rule.mjs --all
 *   node scripts/gen-loai-khac-products-rule.mjs --dry-run --chapter 84
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

// --------------------------------------------------------------------------
// Detect new vs used from code grouping pattern
// VN HS convention: within a subheading6, the first sub-group (.x1x) = mới,
// second sub-group (.x2x) = đã qua sử dụng — for machinery chapters 84-89
// --------------------------------------------------------------------------

function detectCondition(hs) {
  // 8-digit code: positions 6-7 (0-indexed) = sub-group within heading6
  // Pattern: if 7th digit is '1' = new group, '2' = used group
  // e.g. 84021219: pos6='1' → mới; 84021229: pos6='2' → đã qua sử dụng
  const ch = parseInt(hs.slice(0, 2));
  if (ch < 84 || ch > 89) return null; // only machinery chapters

  const sub = hs[6]; // 7th digit (0-indexed 6) of 8-digit code — within heading6, '1' = mới, '2' = đã qua sử dụng
  if (sub === '1') return 'mới';
  if (sub === '2') return 'đã qua sử dụng';
  return null;
}

// --------------------------------------------------------------------------
// Parse capacity constraint from sibling name
// "Nồi hơi với công suất hơi nước trên 15 tấn/giờ" → { op:'>', val:15, unit:'t/h' }
// --------------------------------------------------------------------------

function parseCapacityConstraint(siblingNames) {
  const constraints = [];
  for (const name of siblingNames) {
    const m = name.match(/(?:trên|trên|>)\s*([\d.,]+)\s*(tấn\/giờ|t\/h|kg\/h|kW|HP|m3\/h)/i);
    if (m) {
      constraints.push({ op: '>', val: parseFloat(m[1].replace(',', '.')), unit: m[2] });
    }
    const m2 = name.match(/(?:không quá|dưới|≤|<)\s*([\d.,]+)\s*(tấn\/giờ|t\/h|kg\/h|kW|HP)/i);
    if (m2) {
      constraints.push({ op: '<', val: parseFloat(m2[1].replace(',', '.')), unit: m2[2] });
    }
  }
  return constraints;
}

// --------------------------------------------------------------------------
// h6En keyword → product domain lookup
// Returns { productType, specs[], fuels[], materials[], applications[] }
// --------------------------------------------------------------------------

const H6EN_DOMAINS = [
  // Parts — must come BEFORE generic boiler patterns (parts h6En contains "vapour generating")
  {
    match: /parts of steam.*boilers|parts.*vapour generating/i,
    domain: {
      type: 'Bộ phận nồi hơi',
      items: [
        'Bộ trao đổi nhiệt ống thép (tube bundle)',
        'Cụm đốt (burner) đốt dầu công nghiệp',
        'Bơm cấp nước lò hơi (feedwater pump)',
        'Bộ điều khiển tự động lò hơi PLC',
        'Bộ tiết kiệm nhiệt (economizer) thu hồi khói thải',
        'Van an toàn hơi nước (safety valve)',
        'Ống lửa thay thế thép hợp kim',
        'Bộ xử lý nước cấp (water softener)',
        'Van điều tiết hơi nước (steam control valve)',
        'Ống góp (header/manifold) nồi hơi',
        'Bộ thu gom bùn cặn (blowdown tank)',
        'Thiết bị đo mức nước lò hơi (gauge glass)',
      ],
    },
  },
  // Boilers
  {
    match: /watertube boilers.*not exceeding 45/i,
    domain: {
      type: 'Nồi hơi ống nước',
      capRange: '≤15 tấn hơi/giờ',
      fuels: ['dầu DO', 'dầu FO', 'gas tự nhiên', 'gas LPG', 'than đá', 'trấu/biomass'],
      specs: ['1t/h', '2t/h', '3t/h', '5t/h', '8t/h', '10t/h', '15t/h'],
      pressures: ['8 bar', '10 bar', '12.7 bar', '13 bar', '16 bar'],
      uses: ['nhà máy thực phẩm', 'nhà máy dệt nhuộm', 'xưởng sản xuất', 'nhà máy gỗ'],
    },
  },
  {
    match: /vapour generating boilers|steam generating boilers|fire.?tube/i,
    domain: {
      type: 'Lò hơi ống lửa',
      capRange: '≤15 tấn hơi/giờ',
      fuels: ['dầu DO', 'dầu FO', 'gas LPG', 'than cám', 'củi'],
      specs: ['0.5t/h', '1t/h', '2t/h', '3t/h', '4t/h', '6t/h', '8t/h'],
      pressures: ['8 bar', '10 bar', '13 bar'],
      uses: ['nhà máy may mặc', 'chế biến nông sản', 'sản xuất nước giải khát'],
    },
  },
  // Engines
  {
    match: /engines.*spark.ignition|spark.ignition.*engines/i,
    domain: {
      type: 'Động cơ đốt trong đánh lửa',
      specs: ['50cc', '100cc', '125cc', '150cc', '200cc', '250cc', '400cc'],
      uses: ['xe máy', 'máy phát điện', 'xe golf', 'tàu thuyền nhỏ'],
    },
  },
  {
    match: /parts.*engines.*spark/i,
    domain: {
      type: 'Bộ phận động cơ đánh lửa',
      items: [
        'Bộ hơi động cơ xe máy (piston + cylinder kit)',
        'Trục khuỷu động cơ 4 thì',
        'Nắp máy (cylinder head) động cơ xăng',
        'Thân máy (engine block) 125cc',
        'Piston động cơ xe máy 50mm',
        'Xéc-măng (piston ring) động cơ xăng',
        'Trục cam (camshaft) động cơ 4 kỳ',
        'Thanh truyền (connecting rod) động cơ nhỏ',
        'Bánh đà (flywheel) động cơ xăng',
        'Nắp bu-gi (spark plug cap) động cơ xăng',
      ],
    },
  },
  {
    match: /compression-ignition|diesel.*engines/i,
    domain: {
      type: 'Động cơ diesel',
      specs: ['5HP', '10HP', '15HP', '20HP', '30HP', '50HP', '100HP'],
      uses: ['máy phát điện', 'máy bơm nước', 'xe tải nhỏ', 'tàu thuyền'],
    },
  },
  // Pumps
  {
    match: /pumps.*liquid/i,
    domain: {
      type: 'Bơm chất lỏng',
      items: [
        'Bơm ly tâm đơn tầng nước sạch',
        'Bơm màng khí nén (diaphragm pump)',
        'Bơm trục vít (screw pump) dầu nhớt',
        'Bơm định lượng hóa chất (metering pump)',
        'Bơm hút bùn (slurry pump)',
        'Bơm chìm giếng khoan (submersible pump)',
        'Bơm cao áp (high pressure pump)',
        'Bơm tự mồi (self-priming pump)',
        'Bơm bánh răng (gear pump) dầu thủy lực',
        'Bơm piston thủy lực',
      ],
    },
  },
  // Compressors
  {
    match: /compressors.*air|air.*compressors/i,
    domain: {
      type: 'Máy nén khí',
      items: [
        'Máy nén khí trục vít 15kW áp suất 8 bar',
        'Máy nén khí piston 2HP 1 xi-lanh',
        'Máy nén khí không dầu (oil-free) 5HP',
        'Máy nén khí di động bánh xe 50L',
        'Máy nén khí công nghiệp 22kW inverter',
        'Máy nén khí trung áp 30 bar stainless',
        'Bình tích khí (air receiver) 500L áp suất 10 bar',
        'Máy nén khí trục vít 37kW bình 500L',
      ],
    },
  },
  // Heat exchangers
  {
    match: /heat exchangers/i,
    domain: {
      type: 'Thiết bị trao đổi nhiệt',
      items: [
        'Thiết bị trao đổi nhiệt dạng tấm (plate heat exchanger)',
        'Thiết bị trao đổi nhiệt ống vỏ (shell & tube)',
        'Bộ làm mát dầu thủy lực (oil cooler)',
        'Bộ ngưng tụ (condenser) lạnh công nghiệp',
        'Bộ bay hơi (evaporator) kho lạnh',
        'Thiết bị trao đổi nhiệt dạng xoắn ốc',
        'Dàn ngưng tụ giải nhiệt bằng nước',
        'Bộ sưởi không khí (air heater) ống finned',
      ],
    },
  },
  // Machine tools
  {
    match: /machine.?tools.*metal/i,
    domain: {
      type: 'Máy cắt gọt kim loại',
      items: [
        'Máy tiện CNC tốc độ cao',
        'Máy phay CNC 3 trục',
        'Máy khoan bàn công nghiệp',
        'Máy mài tròn ngoài (cylindrical grinder)',
        'Máy bào (planer) kim loại',
        'Máy cưa cung (hacksaw machine)',
        'Máy gia công trung tâm CNC 4 trục',
        'Máy tiện CNC mini đào tạo',
      ],
    },
  },
  // Generic fallback
  {
    match: /n\.e\.c\.|not elsewhere/i,
    domain: { type: null }, // triggers generic generation
  },
];

function getDomain(h6En) {
  for (const entry of H6EN_DOMAINS) {
    if (entry.match.test(h6En)) return entry.domain;
  }
  return null;
}

// --------------------------------------------------------------------------
// Sinh tên sản phẩm từ domain + constraints
// --------------------------------------------------------------------------

function generateProducts(hs, lk, hn, taxRec, limit = 12) {
  const siblings = lk?.s || [];
  const sibNames = siblings.map(s => s.v.replace(/^[-\s]+/, '').replace(/\s*\(SEN\)\s*/i, '').trim());
  const h6En = taxRec?.en?.includes(';') ? taxRec.en.split(';').slice(1).join(';').trim() : '';
  const condition = detectCondition(hs);
  const capConstraints = parseCapacityConstraint(sibNames);
  const domain = getDomain(h6En);
  const ozExamples = (lk?.ex || []).filter(e => e.s === 'oz-gold').map(e => ({
    tenHang: e.p,
    chatLieu: e.m || '',
  }));

  const products = [];

  // 1. Oz-gold examples come first (real data, highest quality)
  for (const oz of ozExamples.slice(0, 3)) {
    products.push({ ...oz, source: 'oz-gold' });
  }

  // 2. Domain-specific generation
  if (domain?.items) {
    // Parts/components domain — use the item list directly
    const condSuffix = condition === 'đã qua sử dụng' ? ', đã qua sử dụng' : '';
    for (const item of domain.items) {
      if (products.length >= limit) break;
      products.push({
        tenHang: item + condSuffix,
        chatLieu: '',
        source: 'rule',
      });
    }
  } else if (domain?.fuels && domain?.specs) {
    // Boiler/engine with capacity + fuel variations
    const condLabel = condition === 'đã qua sử dụng' ? 'đã qua sử dụng' : '';
    const capLabel = capConstraints.find(c => c.op === '>')
      ? `≤${capConstraints[0].val}t/h`
      : domain.capRange || '';

    for (const spec of domain.specs) {
      if (products.length >= limit) break;
      for (const fuel of domain.fuels) {
        if (products.length >= limit) break;
        const pressure = domain.pressures
          ? domain.pressures[products.length % domain.pressures.length]
          : '';
        const use = domain.uses
          ? ', ' + domain.uses[products.length % domain.uses.length]
          : '';
        const condStr = condLabel ? ` ${condLabel}` : '';
        products.push({
          tenHang: `${domain.type}${condStr} ${spec} đốt ${fuel}${pressure ? ' áp suất ' + pressure : ''}${use}`,
          chatLieu: 'thép carbon/hợp kim',
          source: 'rule',
        });
      }
    }
  } else if (domain?.type && domain?.specs) {
    // Engine/motor with displacement/power variations
    const condSuffix = condition ? ` ${condition}` : '';
    for (const spec of domain.specs) {
      if (products.length >= limit) break;
      for (const use of (domain.uses || [''])) {
        if (products.length >= limit) break;
        products.push({
          tenHang: `${domain.type} ${spec}${use ? ' ' + use : ''}${condSuffix}`,
          chatLieu: 'kim loại đúc',
          source: 'rule',
        });
      }
    }
  } else {
    // Generic fallback — use sibling names as "not these" guide + chapter noun
    const ch = hs.slice(0, 2);
    const h4 = hs.slice(0, 4);
    const condSuffix = condition ? ` (${condition})` : '';
    const exclusions = sibNames.slice(0, 3).join(', ');
    products.push({
      tenHang: `Hàng hóa nhóm ${h4} loại thông thường${condSuffix}`,
      chatLieu: '',
      congDung: exclusions ? `Không phải: ${exclusions}` : 'Loại thông thường trong phân nhóm',
      source: 'rule-fallback',
    });
  }

  return products.slice(0, limit).map(p => ({
    hs,
    tenHang: p.tenHang,
    chatLieu: p.chatLieu || '',
    ...(p.congDung ? { congDung: p.congDung } : {}),
    source: p.source || 'rule',
  }));
}

// --------------------------------------------------------------------------
// Args & main
// --------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  const o = { dryRun: false, all: false, chapter: null, hs: null, merge: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') o.dryRun = true;
    if (args[i] === '--all')    o.all = true;
    if (args[i] === '--merge')  o.merge = true;
    if (args[i] === '--chapter') o.chapter = (args[i+1]||'').padStart(2,'0');
    if (args[i].startsWith('--chapter=')) o.chapter = args[i].slice(10).padStart(2,'0');
    if (args[i] === '--hs') o.hs = args[i+1];
  }
  return o;
}

function mergeOutput() {
  if (!fs.existsSync(OUT_DIR)) return;
  const files = fs.readdirSync(OUT_DIR).filter(f => /^ch\d+\.jsonl$/.test(f)).sort();
  const out = fs.createWriteStream(OUT_MERGE, { flags: 'w' });
  let total = 0;
  for (const f of files) {
    const content = fs.readFileSync(path.join(OUT_DIR, f), 'utf8').trim();
    if (content) { out.write(content + '\n'); total += content.split('\n').filter(Boolean).length; }
  }
  out.end();
  const sz = fs.existsSync(OUT_MERGE) ? (fs.statSync(OUT_MERGE).size / 1e6).toFixed(1) : '0';
  console.log(`Merged: ${total} products | ${sz}MB → ${OUT_MERGE}`);
}

async function main() {
  const opts = parseArgs();
  if (opts.merge) { mergeOutput(); return; }

  console.log('Loading data...');
  const idx      = JSON.parse(fs.readFileSync(IDX_PATH, 'utf8'));
  const enriched = JSON.parse(fs.readFileSync(ENR_PATH, 'utf8'));
  const tax      = JSON.parse(fs.readFileSync(TAX_PATH, 'utf8'));

  let allHs = Object.keys(idx);
  if (opts.hs)      allHs = [opts.hs];
  else if (opts.chapter) allHs = allHs.filter(hs => hs.startsWith(opts.chapter));

  if (!opts.all && !opts.chapter && !opts.hs) {
    console.error('Dùng: --all | --chapter XX | --hs XXXXXXXX | --dry-run');
    process.exit(1);
  }

  const preview = opts.dryRun ? allHs.slice(0, 5) : allHs;
  let totalProducts = 0;
  let outStream = null;

  if (!opts.dryRun) {
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
    // Group by chapter
    const byChapter = {};
    for (const hs of allHs) {
      const ch = hs.slice(0, 2);
      if (!byChapter[ch]) byChapter[ch] = [];
      byChapter[ch].push(hs);
    }

    for (const [ch, codes] of Object.entries(byChapter).sort()) {
      const chPath = path.join(OUT_DIR, `ch${ch}.jsonl`);
      const stream = fs.createWriteStream(chPath, { flags: 'w' });
      let chCount = 0;
      for (const hs of codes) {
        const lk = idx[hs], hn = enriched.headings?.[hs.slice(0,4)]||{}, t = tax[hs];
        const products = generateProducts(hs, lk, hn, t);
        for (const p of products) stream.write(JSON.stringify(p) + '\n');
        chCount += products.length;
        totalProducts += products.length;
      }
      await new Promise(r => stream.end(r));
      console.log(`Ch.${ch}: ${codes.length} mã → ${chCount} sản phẩm`);
    }

    console.log(`\nTổng: ${totalProducts} sản phẩm cho ${allHs.length} mã`);
    mergeOutput();
  } else {
    // Dry-run: show first 5 with full product list
    for (const hs of preview) {
      const lk = idx[hs], hn = enriched.headings?.[hs.slice(0,4)]||{}, t = tax[hs];
      const sibs = (lk?.s||[]).map(s=>s.v.replace(/^[-\s]+/,'').slice(0,60));
      const products = generateProducts(hs, lk, hn, t);
      const cond = detectCondition(hs);
      console.log('\n' + '━'.repeat(64));
      console.log(`HS ${hs} | ${t?.en?.slice(0,55) || '?'}`);
      console.log(`Condition: ${cond||'N/A'} | Siblings: ${sibs.join('; ').slice(0,80)||'none'}`);
      console.log('━'.repeat(64));
      products.forEach(p => {
        const mat = p.chatLieu ? ` [${p.chatLieu}]` : '';
        console.log(`  → ${p.tenHang}${mat}`);
      });
      console.log(`  (${products.length} sản phẩm, source: ${[...new Set(products.map(p=>p.source))].join('+')})`);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
