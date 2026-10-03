import { writeFileSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const t = JSON.parse(readFileSync(resolve(__dirname, '../data/tax.json'), 'utf-8'));

const keys = Object.keys(t).filter(k => k.startsWith('8481')).sort();

const rules = [];
let priority = 100;

function add(hs, when) {
  const dn = t[hs];
  rules.push({
    id: 'r' + hs,
    priority: priority--,
    when,
    hs,
    gir: 'GIR 6',
    reasonVi: (dn.vn || '') + ' → ' + hs,
    source: 'Biểu thuế 2026'
  });
}

add('84811011', { valveKind: 'pressure_reducing', controlType: 'manual_gate', boreSize: 'large', material: 'metal' });
add('84811019', { valveKind: 'pressure_reducing', controlType: 'manual_gate', boreSize: 'small', material: 'metal' });
add('84811021', { valveKind: 'pressure_reducing', controlType: 'other', boreSize: 'small', material: 'metal' });
add('84811022', { valveKind: 'pressure_reducing', controlType: 'other', boreSize: 'large', material: 'metal' });
add('84811091', { valveKind: 'pressure_reducing', controlType: 'other', boreSize: 'small', material: 'plastic' });
add('84811099', { valveKind: 'pressure_reducing', controlType: 'other', boreSize: 'other', material: 'other' });

add('84812011', { valveKind: 'oleohydraulic', material: 'iron_steel', boreSize: 'any' });
add('84812019', { valveKind: 'oleohydraulic', material: 'other', boreSize: 'any' });
add('84812020', { valveKind: 'oleohydraulic', material: 'copper_or_plastic', boreSize: 'small' });
add('84812090', { valveKind: 'oleohydraulic', material: 'other', boreSize: 'large' });

add('84813010', { valveKind: 'check', material: 'cast_iron', boreSize: 'large' });
add('84813020', { valveKind: 'check', material: 'copper', boreSize: 'small' });
add('84813040', { valveKind: 'check', material: 'plastic', boreSize: 'small' });
add('84813090', { valveKind: 'check', material: 'other', boreSize: 'other' });

add('84814010', { valveKind: 'safety', material: 'copper', boreSize: 'small' });
add('84814030', { valveKind: 'safety', material: 'plastic', boreSize: 'small' });
add('84814090', { valveKind: 'safety', material: 'other', boreSize: 'other' });

add('84818011', { valveKind: 'other', material: 'copper', boreSize: 'medium', controlType: 'tap_cock' });
add('84818012', { valveKind: 'other', material: 'other_metal', boreSize: 'medium', controlType: 'tap_cock' });
add('84818013', { valveKind: 'other', material: 'copper', boreSize: 'medium', controlType: 'tap_cock' });
add('84818014', { valveKind: 'other', material: 'other_metal', boreSize: 'medium', controlType: 'tap_cock' });
add('84818021', { valveKind: 'other', boreSize: 'small', specificKind: 'tap_cock' });
add('84818022', { valveKind: 'other', boreSize: 'large', specificKind: 'tap_cock' });
add('84818030', { valveKind: 'other', specificKind: 'gas_cooking' });
add('84818041', { valveKind: 'other', material: 'plastic', specificKind: 'household_tap' });
add('84818049', { valveKind: 'other', material: 'other_metal', specificKind: 'household_tap' });
add('84818051', { valveKind: 'other', material: 'plastic', specificKind: 'solenoid_water' });
add('84818059', { valveKind: 'other', material: 'other_metal', specificKind: 'solenoid_water' });
add('84818061', { valveKind: 'other', controlType: 'manual_gate', boreSize: 'large', material: 'metal' });
add('84818062', { valveKind: 'other', controlType: 'manual_gate', boreSize: 'large', material: 'other_metal' });
add('84818063', { valveKind: 'other', controlType: 'manual_gate', boreSize: 'medium', material: 'other_metal' });
add('84818064', { valveKind: 'other', controlType: 'manual_gate', boreSize: 'small', material: 'plastic' });
add('84818065', { valveKind: 'other', controlType: 'manual_gate', boreSize: 'small', material: 'other_metal' });
add('84818066', { valveKind: 'other', material: 'plastic', specificKind: 'solenoid_sen' });
add('84818067', { valveKind: 'other', material: 'other_metal', specificKind: 'solenoid_sen' });
add('84818071', { valveKind: 'other', material: 'plastic', specificKind: 'solenoid_other' });
add('84818072', { valveKind: 'other', material: 'other_metal', specificKind: 'solenoid_other' });
add('84818073', { valveKind: 'other', boreSize: 'large', specificKind: 'ball_gate' });
add('84818074', { valveKind: 'other', boreSize: 'extra_large', specificKind: 'ball_gate' });
add('84818077', { valveKind: 'other', boreSize: 'small', specificKind: 'solenoid_small' });
add('84818078', { valveKind: 'other', material: 'plastic', specificKind: 'solenoid_small' });
add('84818079', { valveKind: 'other', material: 'other_metal', specificKind: 'solenoid_small' });
add('84818081', { valveKind: 'other', material: 'plastic', specificKind: 'solenoid_heating' });
add('84818082', { valveKind: 'other', material: 'other_metal', specificKind: 'solenoid_heating' });
add('84818083', { valveKind: 'other', specificKind: 'fuel_vehicle', material: 'plastic', boreSize: 'tiny' });
add('84818084', { valveKind: 'other', specificKind: 'fuel_vehicle', material: 'plastic', boreSize: 'small' });
add('84818093', { valveKind: 'other', specificKind: 'fuel_vehicle', material: 'other_metal' });
add('84818094', { valveKind: 'other', specificKind: 'fuel_vehicle', boreSize: 'tiny' });
add('84818095', { valveKind: 'other', specificKind: 'fuel_vehicle', boreSize: 'small' });
add('84818096', { valveKind: 'other', specificKind: 'fuel_vehicle', boreSize: 'large' });
add('84818097', { valveKind: 'other', controlType: 'manual_other', material: 'stainless_steel', weightClass: 'light' });
add('84818098', { valveKind: 'other', controlType: 'manual_other', material: 'copper', specificKind: 'faucet_copper' });
add('84818099', { valveKind: 'other', controlType: 'manual_other', material: 'other_metal', specificKind: 'faucet_other' });

add('84819010', { partKind: 'valve_body', boreSize: 'large' });
add('84819021', { partKind: 'body_faucet' });
add('84819022', { partKind: 'body_cylinder', material: 'lpg' });
add('84819023', { partKind: 'body_other', material: 'metal' });
add('84819029', { partKind: 'body_other', material: 'other' });
add('84819031', { partKind: 'valve_parts', material: 'copper' });
add('84819039', { partKind: 'valve_parts', material: 'other_metal' });
add('84819041', { partKind: 'valve_parts', material: 'copper' });
add('84819049', { partKind: 'valve_parts', material: 'other_metal' });
add('84819090', { partKind: 'valve_parts', material: 'other' });

// Build full inputs with detect keywords
const valveKindVals = ['pressure_reducing','oleohydraulic','check','safety','other'];
const controlTypeVals = ['manual_gate','other','tap_cock','manual_other'];
const boreSizeVals = ['tiny','small','medium','large','extra_large','any','other'];
const materialVals = ['metal','other_metal','plastic','copper','copper_or_plastic','cast_iron','iron_steel','stainless_steel','lpg','other'];
const specificKindVals = ['tap_cock','gas_cooking','household_tap','solenoid_water','solenoid_sen','solenoid_other','solenoid_small','solenoid_heating','ball_gate','fuel_vehicle','faucet_copper','faucet_other'];
const partKindVals = ['valve_body','body_faucet','body_cylinder','body_other','valve_parts'];
const weightClassVals = ['light'];

function makeInput(name, domain, labelVi, questionVi, detectMap) {
  return {
    attribute: name,
    type: 'enum',
    domain,
    labelVi,
    questionVi,
    detect: detectMap
  };
}

const inputs = [
  makeInput('valveKind', valveKindVals,
    'Loại van',
    'Van thuộc loại gì: van giảm áp (áp suất nước/máy nén), van thủy lực/khí nén (dầu mỡ), van cản (một chiều), van an toàn, hay van/cần/vòi khác?',
    {
      pressure_reducing: ['van giảm áp','pressure reducing','van cổng','van điều áp','áp suất'],
      oleohydraulic: ['van thủy lực','van khí nén','oleohydraulic','thủy lực','pneumatic'],
      check: ['van cản','van một chiều','check valve','van chặn'],
      safety: ['van an toàn','safety valve','van xả áp'],
      other: ['van','vòi','cần','cống','taps','cocks','valves','fitting']
    }),
  makeInput('controlType', controlTypeVals,
    'Kiểu điều khiển',
    'Van điều khiển bằng tay (vặn, gạt, cổng) hay kiểu khác (điện từ, cơ, tự động)?',
    {
      manual_gate: ['van cổng','cổng van','gate valve','điều khiển bằng tay','bằng tay'],
      other: ['khác'],
      tap_cock: ['vòi','cống','tap','cock','bằng đồng','bằng hợp kim'],
      manual_other: ['van khác','bằng thép','thép không gỉ','niken','xử lý bề mặt']
    }),
  makeInput('boreSize', boreSizeVals,
    'Đường kính trong (cửa nạp/thoát)',
    'Đường kính trong cửa nạp hoặc cửa thoát là bao nhiêu: dưới 1 cm, 1–2,5 cm, 2,5–5 cm, trên 5 cm, hay trên 40 cm?',
    {
      tiny: ['dưới 1 cm','dưới 1cm','không quá 1 cm'],
      small: ['2,5 cm','1 cm','từ 1 cm','quá 2,5 cm','1cm'],
      medium: ['5 cm'],
      large: ['trên 5 cm','quá 40 cm','trên 40 cm','40 cm'],
      extra_large: ['quá 40 cm','trên 40 cm'],
      any: ['bất kỳ'],
      other: ['loại khác']
    }),
  makeInput('material', materialVals,
    'Vật liệu chế tạo',
    'Van bằng vật liệu gì: đồng/hợp kim đồng, gang đúc, sắt/thép, nhựa (plastic), thép không gỉ, hay vật liệu khác?',
    {
      copper: ['đồng','hợp kim đồng'],
      plastic: ['plastic','nhựa','bằng plastic'],
      cast_iron: ['gang đúc'],
      iron_steel: ['sắt','thép'],
      stainless_steel: ['thép không gỉ','niken'],
      metal: ['kim loại','bằng sắt'],
      other_metal: ['vật liệu khác','loại khác'],
      copper_or_plastic: ['đồng','plastic'],
      lpg: ['xi lanh','lpg'],
      other: ['loại khác','khác']
    }),
  makeInput('specificKind', specificKindVals,
    'Công dụng đặc thù',
    'Van dùng cho mục đích gì: vòi nước sinh hoạt, van gas bếp, van điện từ nước, van điện từ (SEN), van ngắt nhiên liệu xe, hay loại khác?',
    {
      tap_cock: ['vòi','cống','tap','cock'],
      gas_cooking: ['bếp','lò nước','gas'],
      household_tap: ['vòi gia đình','van gia đình'],
      solenoid_water: ['van điện từ','solenoid'],
      solenoid_sen: ['sen','điện từ'],
      solenoid_other: ['van điện','solenoid khác'],
      solenoid_small: ['van nước','van nhỏ'],
      solenoid_heating: ['bình nóng lạnh','nước nóng'],
      ball_gate: ['van cổng','cổng','ball'],
      fuel_vehicle: ['ngắt nhiên liệu','xe','ô tô','nguyên liệu','87.02','87.03','87.04'],
      faucet_copper: ['vòi đồng','hợp kim đồng'],
      faucet_other: ['vòi khác','vòi loại khác']
    }),
  makeInput('partKind', partKindVals,
    'Loại bộ phận van',
    'Bộ phận van thuộc loại gì: vỏ van cổng, thân vòi nước, thân xi lanh khí, thân loại khác, hay bộ phận van khác?',
    {
      valve_body: ['vỏ van','vỏ của van cổng','van cống'],
      body_faucet: ['thân vòi nước','vòi nước'],
      body_cylinder: ['thân xi lanh','xi lanh khí','lpg'],
      body_other: ['thân loại khác'],
      valve_parts: ['loại khác']
    }),
  makeInput('weightClass', ['light', 'heavy'],
    'Khối lượng',
    'Van nặng dưới 3 kg hay từ 3 kg trở lên?',
    {
      light: ['dưới 3 kg','khối lượng dưới 3 kg'],
      heavy: ['từ 3 kg','trên 3 kg','nặng']
    }),
];

const table = {
  heading: '8481',
  inputs,
  rules,
  status: 'draft',
  essenceTestVi: 'Van thuộc loại gì (giảm áp/thủy lực/cản/an toàn/khác)? Kiểu điều khiển, đường kính trong, vật liệu, công dụng đặc thù nào? Bộ phận van thì thuộc loại gì?',
  sourceVi: 'Biểu thuế 2026 nhóm 8481: 848110 van giảm áp (theo đường kính, vật liệu, điều khiển tay); 848120 van thủy lực/khí nén; 848130 van cản; 848140 van an toàn; 848180 van/cần/vòi khác (36 mã theo vật liệu, đường kính, kiểu điện từ, gas, nhiên liệu xe); 848190 bộ phận. Chú giải 8481: van/vòi điều chỉnh dòng chất lỏng/khí.',
  verified: false,
  noteVi: `Draft 63 mã / ${inputs.length} attrs / ${rules.length} rules — tier-A score=33.6 | Nguồn: Biểu thuế 2026`
};

const outPath = resolve(__dirname, '../data/decision-tables/8481.json');
writeFileSync(outPath, JSON.stringify(table, null, 2));
console.log('Rules:', rules.length, '| Inputs:', inputs.length);

// Verify coverage
const covered = new Set(rules.map(r => r.hs));
const allKeys = new Set(keys);
const missing = [...allKeys].filter(k => !covered.has(k));
console.log('Covered:', covered.size, '/', allKeys.size, '| Missing:', missing.length);
if (missing.length > 0) missing.forEach(k => console.log(' MISSING:', k, t[k].vn));
