import { writeFileSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const t = JSON.parse(readFileSync(resolve(__dirname, '../data/tax.json'), 'utf-8'));

const keys = Object.keys(t).filter(k => k.startsWith('7306')).sort();
const rules = [];
let priority = 100;

function add(hs, when) {
  const dn = t[hs];
  rules.push({ id: 'r' + hs, priority: priority--, when, hs,
    gir: 'GIR 6', reasonVi: (dn.vn || '') + ' → ' + hs, source: 'Biểu thuế 2026' });
}

// 730610/11/19 — line pipe, welded
add('73061110', { kind: 'line_pipe', welding: 'erw', steel: 'other', outerDia: 'any' });
add('73061190', { kind: 'line_pipe', welding: 'other_weld', steel: 'other', outerDia: 'any' });
add('73061910', { kind: 'line_pipe', welding: 'erw', steel: 'other', outerDia: 'any' });
add('73061920', { kind: 'line_pipe', welding: 'saw_spiral', steel: 'other', outerDia: 'any' });
add('73061990', { kind: 'line_pipe', welding: 'other_weld', steel: 'other', outerDia: 'any' });

// 730621/29 — line pipe, stainless
add('73062100', { kind: 'line_pipe', welding: 'welded', steel: 'stainless', outerDia: 'any' });
add('73062900', { kind: 'line_pipe', welding: 'other_weld', steel: 'stainless', outerDia: 'any' });

// 730630 — welded circular, by diameter
// small OD <12.5mm
add('73063011', { kind: 'pipe_circular', welding: 'welded', steel: 'other', outerDia: 'small', wallThin: true });
add('73063019', { kind: 'pipe_circular', welding: 'welded', steel: 'other', outerDia: 'small', wallThin: false });
add('73063021', { kind: 'pipe_circular', welding: 'welded', steel: 'other', outerDia: 'small', wallThin: true }); // dup 73063011
add('73063029', { kind: 'pipe_circular', welding: 'welded', steel: 'other', outerDia: 'small', wallThin: false }); // dup 73063019
add('73063030', { kind: 'pipe_circular', welding: 'welded', steel: 'other', outerDia: 'medium' });
add('73063041', { kind: 'pipe_circular', welding: 'welded', steel: 'other', outerDia: 'small', wallThin: true, pressureHigh: true });
add('73063049', { kind: 'pipe_circular', welding: 'welded', steel: 'other', outerDia: 'small', wallThin: false, pressureHigh: true });
add('73063091', { kind: 'pipe_circular', welding: 'welded', steel: 'other', outerDia: 'medium', wallThin: false });
add('73063092', { kind: 'pipe_circular', welding: 'welded', steel: 'other', outerDia: 'small', wallThin: true, innerDia: 'large' });
add('73063099', { kind: 'pipe_circular', welding: 'welded', steel: 'other', outerDia: 'medium', wallThin: false });

// 730640 — welded circular, stainless
add('73064011', { kind: 'pipe_circular', welding: 'welded', steel: 'stainless', outerDia: 'small' });
add('73064019', { kind: 'pipe_circular', welding: 'welded', steel: 'stainless', outerDia: 'medium_large' });
add('73064020', { kind: 'pipe_circular', welding: 'welded', steel: 'stainless', outerDia: 'large', outerDiaOver105mm: true });
add('73064030', { kind: 'pipe_circular', welding: 'welded', steel: 'stainless', nickelHigh: true });
add('73064090', { kind: 'pipe_circular', welding: 'welded', steel: 'stainless', outerDia: 'medium_large' });

// 730650 — welded circular, other alloy steel
add('73065011', { kind: 'pipe_circular', welding: 'welded', steel: 'alloy', outerDia: 'small' });
add('73065019', { kind: 'pipe_circular', welding: 'welded', steel: 'alloy', outerDia: 'medium_large' });
add('73065091', { kind: 'pipe_circular', welding: 'welded', steel: 'alloy', outerDia: 'small' });
add('73065099', { kind: 'pipe_circular', welding: 'welded', steel: 'alloy', outerDia: 'medium_large' });

// 730661/69/90 — non-circular (square, rectangular, other)
add('73066110', { kind: 'pipe_noncircular', outerDia: 'small', crossSection: 'square_rectangular', steel: 'other' });
add('73066190', { kind: 'pipe_noncircular', outerDia: 'medium_large', crossSection: 'square_rectangular', steel: 'other' });
add('73066910', { kind: 'pipe_noncircular', outerDia: 'small', crossSection: 'other_profile', steel: 'other' });
add('73066990', { kind: 'pipe_noncircular', outerDia: 'medium_large', crossSection: 'other_profile', steel: 'other' });

// 730690 — other
add('73069011', { kind: 'pipe_other', outerDia: 'small', crossSection: 'other_profile', steel: 'other', pressureHigh: true });
add('73069019', { kind: 'pipe_other', outerDia: 'small', crossSection: 'other_profile', steel: 'other', pressureHigh: false });
add('73069091', { kind: 'pipe_other', pressureHigh: true, steel: 'other' });
add('73069094', { kind: 'pipe_other', outerDia: 'small', pressureHigh: true, steel: 'other' });
add('73069095', { kind: 'pipe_other', outerDia: 'medium_large', pressureHigh: true, steel: 'other' });
add('73069096', { kind: 'pipe_other', outerDia: 'small', pressureHigh: false, steel: 'other' });
add('73069097', { kind: 'pipe_other', outerDia: 'medium_large', innerDia: 'large', pressureHigh: false, steel: 'other' });
add('73069099', { kind: 'pipe_other', steel: 'other' });

// Collect inputs
const allAttrs = new Set();
rules.forEach(r => { Object.keys(r.when || {}).forEach(k => allAttrs.add(k)); });

function makeInput(name, domain, labelVi, questionVi, detectMap) {
  return { attribute: name, type: 'enum', domain, labelVi, questionVi, detect: detectMap };
}

const inputs = [
  makeInput('kind', ['line_pipe','pipe_circular','pipe_noncircular','pipe_other'],
    'Loại ống',
    'Ống thuộc loại gì: ống dẫn đường ống (line pipe), ống tròn, ống không tròn (vuông/chữ nhật/khác), hay ống dẫn khác?',
    {
      line_pipe: ['dẫn đường ống','line pipe','ống dẫn'],
      pipe_circular: ['ống tròn','circular'],
      pipe_noncircular: ['vuông','chữ nhật','non-circular','profile'],
      pipe_other: ['loại khác','ống dẫn']
    }),
  makeInput('welding', ['erw','saw_spiral','welded','other_weld','seamless'],
    'Phương pháp hàn',
    'Ống hàn bằng phương pháp gì: hàn điện trở (ERW), hàn chìm xoắn ốc (SAW), hàn que, hay loại khác?',
    {
      erw: ['hàn điện trở','erw'],
      saw_spiral: ['hàn chìm xoắn','xoắn ốc'],
      welded: ['hàn','welded'],
      other_weld: ['loại khác'],
      seamless: ['liền mạch']
    }),
  makeInput('steel', ['stainless','alloy','other'],
    'Loại thép',
    'Thép không gỉ, hợp kim khác, hay thép các bon?',
    {
      stainless: ['thép không gỉ','stainless'],
      alloy: ['hợp kim','alloy'],
      other: ['các bon','carbon','thép đen']
    }),
  makeInput('outerDia', ['small','medium','medium_large','large','any'],
    'Đường kính ngoài',
    'Đường kính ngoài ống: dưới 12,5 mm, 12,5–140 mm, trên 105 mm, trên 140 mm?',
    {
      small: ['dưới 12,5 mm','<12,5 mm'],
      medium: ['12,5 mm'],
      medium_large: ['140 mm','trên 105 mm'],
      large: ['lớn'],
      any: ['bất kỳ']
    }),
  makeInput('wallThin', ['true','false'],
    'Vách mỏng',
    'Ống có vách mỏng hay vách dày (theo tiêu chuẩn ống nhiệt)?',
    {
      'true': ['dưới','mỏng'],
      'false': ['khác','dày']
    }),
  makeInput('pressureHigh', ['true','false'],
    'Áp lực cao',
    'Ống dẫn chịu áp lực cao không? (giới hạn chảy ≥42.000 psi)',
    {
      'true': ['chịu áp lực cao','áp lực cao','42.000 psi'],
      'false': ['khác']
    }),
  makeInput('nickelHigh', ['true','false'],
    'Hàm lượng niken',
    'Hàm lượng niken tối thiểu 30% không?',
    {
      'true': ['niken','30%'],
      'false': ['khác']
    }),
  makeInput('crossSection', ['square_rectangular','other_profile'],
    'Mặt cắt ngang',
    'Mặt cắt ngang ống: vuông/chữ nhật hay dạng profile khác?',
    {
      square_rectangular: ['vuông','chữ nhật','square','rectangular'],
      other_profile: ['khác','profile','loại khác']
    }),
  makeInput('innerDia', ['small','large'],
    'Đường kính trong',
    'Đường kính trong: dưới 12,5 mm hay từ 12,5 mm trở lên?',
    {
      small: ['dưới 12,5 mm'],
      large: ['từ 12,5 mm','trên 12,5 mm']
    }),
  makeInput('isHeatExchanger', ['true','false'],
    'Ống bọc nhiệt',
    'Ống có phải loại dùng làm ống bọc (ống nhiệt) cho bộ phận phát nhiệt không?',
    { 'true': ['ống bọc','ống nhiệt','bộ phận phát nhiệt'], 'false': ['khác'] }),
  makeInput('outerDiaOver105mm', ['true','false'],
    'Đường kính trên 105 mm',
    'Đường kính ngoài có trên 105 mm không?',
    { 'true': ['trên 105 mm'], 'false': ['khác'] }),
];

const table = {
  heading: '7306',
  inputs,
  rules,
  status: 'draft',
  essenceTestVi: 'Ống dẫn (line pipe), ống tròn, ống không tròn hay ống khác? Hàn gì, thép gì? Đường kính ngoài, vách mỏng/dày, áp lực cao?',
  sourceVi: 'Biểu thuế 2026 nhóm 7306: 73061x ống dẫn (theo phương pháp hàn); 73062x ống dẫn không gỉ; 73063x ống tròn hàn (theo đường kính ngoài, vách); 73064x ống tròn không gỉ; 73065x ống tròn hợp kim; 73066x ống không tròn; 73069x ống khác. Chú giải 7306: ống có mối hàn dọc/xoắn.',
  verified: false,
  noteVi: `Draft 38 mã / ${inputs.length} attrs / ${rules.length} rules — tier-A score=22.5 | Nguồn: Biểu thuế 2026`
};

const outPath = resolve(__dirname, '../data/decision-tables/7306.json');
writeFileSync(outPath, JSON.stringify(table, null, 2));
console.log('Rules:', rules.length, '| Inputs:', inputs.length);

// Verify coverage
const covered = new Set(rules.map(r => r.hs));
const allKeys = new Set(keys);
const missing = [...allKeys].filter(k => !covered.has(k));
console.log('Covered:', covered.size, '/', allKeys.size, '| Missing:', missing.length);
if (missing.length > 0) missing.forEach(k => console.log(' MISSING:', k, t[k].vn));
