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
  // Central heating boiler parts
  {
    match: /parts of central heating boilers/i,
    domain: {
      type: 'Bộ phận nồi hơi sưởi ấm',
      items: [
        'Đầu đốt (burner head) nồi hơi sưởi ấm gas',
        'Bộ trao đổi nhiệt (heat exchanger) nồi hơi trung tâm',
        'Bơm tuần hoàn (circulation pump) hệ sưởi 180W',
        'Van điều nhiệt (thermostatic valve) hệ sưởi ấm',
        'Bộ xả khí tự động (auto air vent) hệ sưởi',
        'Đầu điều nhiệt (thermostat head) TRV 15mm',
        'Bộ điều khiển nồi hơi (boiler controller) 230V',
        'Ống dẫn hơi (flue pipe) nồi hơi condensing 60/100',
        'Bình giãn nở (expansion vessel) 12L 1.5 bar',
        'Thiết bị lọc từ (magnetic filter) hệ sưởi 22mm',
      ],
    },
  },
  // Auxiliary plant for boilers
  {
    match: /auxiliary plant.*use with boilers|parts.*auxiliary plant.*boilers/i,
    domain: {
      type: 'Thiết bị phụ trợ lò hơi',
      items: [
        'Thiết bị xử lý nước cấp lò hơi (feedwater treatment)',
        'Bình khử khí (deaerator) lò hơi công nghiệp',
        'Bộ tái sinh (regenerator) hơi nước lò hơi',
        'Thiết bị thu hồi nước ngưng (condensate recovery)',
        'Bộ đo lưu lượng hơi (steam flow meter) 2"',
        'Bẫy hơi (steam trap) phao cầu 15mm',
        'Bình tách hơi-nước (steam separator) DN50',
        'Thiết bị làm mềm nước (softener) ion trao đổi',
        'Hệ thống xả bề mặt (surface blowdown) tự động',
        'Bơm cấp nước lò (boiler feed pump) 1.5kW',
      ],
    },
  },
  // Steam turbines
  {
    match: /steam.*vapour turbines|vapour turbines/i,
    domain: {
      type: 'Tuabin hơi nước',
      items: [
        'Tuabin hơi nước ngưng tụ (condensing turbine) 1MW',
        'Tuabin hơi trích hơi (extraction turbine) 500kW',
        'Tuabin hơi áp suất ngược (back pressure) 200kW',
        'Tuabin hơi nước nhỏ (micro steam turbine) 50kW',
        'Cánh tuabin (turbine blade) hợp kim titan',
        'Bộ giảm tốc tuabin hơi 1500rpm',
        'Bộ điều tốc (governor) tuabin hơi',
        'Vòng bi tuabin hơi (turbine bearing)',
        'Bộ phận hệ thống bịt kín (seal system) tuabin',
        'Bộ bảo vệ tuabin (turbine protection system)',
      ],
    },
  },
  // Reciprocating piston engines for vehicles
  {
    match: /reciprocating piston engines.*propulsion|piston engines.*vehicles/i,
    domain: {
      type: 'Động cơ piston tịnh tiến xe',
      items: [
        'Động cơ xăng 4 kỳ xe gắn máy 125cc mới',
        'Động cơ xăng 4 kỳ xe gắn máy 150cc mới',
        'Động cơ xăng 4 kỳ ô tô con 1.5L mới',
        'Động cơ xăng 4 kỳ ô tô con 1.6L mới',
        'Động cơ xăng xe tải nhỏ 2.0L mới',
        'Động cơ xăng đa năng (multipurpose) 7HP',
        'Động cơ xăng 4 kỳ máy phát điện 5kVA',
        'Động cơ xăng xe golf cart 350cc',
        'Động cơ xăng 4 kỳ xe ba bánh 200cc',
        'Động cơ xăng 2 kỳ cưa xích 45cc',
      ],
    },
  },
  // Rotary piston engines
  {
    match: /rotary internal combustion piston engines/i,
    domain: {
      type: 'Động cơ piston quay',
      items: [
        'Động cơ piston quay Wankel 1.3L (Mazda RX)',
        'Động cơ piston quay áp suất thấp nhỏ gọn',
        'Bộ phận động cơ quay Wankel: rotor đỉnh tam giác',
        'Bộ phận vỏ (housing) động cơ piston quay',
        'Bộ phận trục lệch tâm (eccentric shaft) động cơ quay',
        'Apex seal (đỉnh rotor) động cơ Wankel thay thế',
      ],
    },
  },
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
  // Air conditioners / HVAC
  {
    match: /motor driven fan.*cool|containing a motor driven fan/i,
    domain: {
      type: 'Máy điều hòa không khí',
      items: [
        'Máy điều hòa điều nhiệt inverter 9000 BTU',
        'Máy điều hòa điều nhiệt inverter 12000 BTU',
        'Máy điều hòa điều nhiệt inverter 18000 BTU',
        'Máy điều hòa điều nhiệt inverter 24000 BTU',
        'Dàn lạnh multi-split 1 chiều 9000 BTU',
        'Máy điều hòa tủ đứng 3.5HP',
        'Máy điều hòa tủ đứng 5HP công nghiệp',
        'Máy điều hòa casette âm trần 2.5HP',
        'Dàn nóng điều hòa trung tâm VRF 8HP',
        'Máy điều hòa áp trần ống gió 2 chiều 5HP',
        'Máy điều hòa 1 chiều tiết kiệm điện 12000 BTU',
        'Máy điều hòa di động không cần ống thải 12000 BTU',
      ],
    },
  },
  {
    match: /motor driven fan and elements for.*heating|fan and elements for/i,
    domain: {
      type: 'Máy điều hòa không khí 2 chiều',
      items: [
        'Máy điều hòa 2 chiều inverter 9000 BTU',
        'Máy điều hòa 2 chiều inverter 12000 BTU',
        'Máy điều hòa 2 chiều inverter 18000 BTU',
        'Máy điều hòa 2 chiều inverter 24000 BTU',
        'Máy điều hòa 2 chiều tủ đứng 4HP',
        'Máy điều hòa heat pump công nghiệp 10HP',
        'Dàn nóng multi-split 2 chiều 3HP',
        'Máy điều hòa âm trần 2 chiều 2.5HP',
        'Máy điều hòa giấu trần 2 chiều 5HP',
        'Máy điều hòa VRF 2 chiều outdoor unit 12HP',
        'Máy bơm nhiệt (heat pump) nước nóng 200L',
        'Máy điều hòa 2 chiều áp trần 3.5HP',
      ],
    },
  },
  // Industrial valves (heading 8481)
  {
    match: /for pipes, boiler shells, tanks, vats/i,
    domain: {
      type: 'Van công nghiệp',
      items: [
        'Van bi cầu (ball valve) thép không gỉ DN25',
        'Van cổng (gate valve) gang DN50 PN16',
        'Van bướm (butterfly valve) mặt bích DN100',
        'Van cầu (globe valve) đồng thau 1/2 inch',
        'Van một chiều (check valve) thép không gỉ DN40',
        'Van an toàn (safety relief valve) hơi nước 1/2"',
        'Van điện từ (solenoid valve) 24VDC DN15',
        'Van điều khiển (control valve) pneumatic DN50',
        'Van giảm áp (pressure reducing valve) khí nén DN25',
        'Van bi 3 chiều (3-way ball valve) thép không gỉ',
        'Van xả đáy (drain valve) lò hơi 1/2"',
        'Van bi đầu nối nhanh (quick connect ball valve)',
      ],
    },
  },
  // Engine parts
  {
    match: /parts.*suitable for use solely.*piston eng|parts.*internal combustion piston eng/i,
    domain: {
      type: 'Bộ phận động cơ đốt trong',
      items: [
        'Bộ piston + xylanh động cơ xe máy 125cc',
        'Trục khuỷu (crankshaft) động cơ ô tô',
        'Nắp máy (cylinder head) động cơ diesel',
        'Thân máy (cylinder block) động cơ xăng',
        'Thanh truyền (connecting rod) động cơ diesel',
        'Trục cam (camshaft) động cơ 4 kỳ',
        'Bộ xéc-măng (piston ring set) động cơ diesel',
        'Bộ lọc dầu (oil filter) động cơ ô tô',
        'Turbo-tăng áp (turbocharger) động cơ diesel',
        'Bơm dầu (oil pump) động cơ xăng',
        'Két làm mát (oil cooler) động cơ diesel',
        'Cạc-te (oil pan/sump) động cơ',
      ],
    },
  },
  // Centrifugal pumps
  {
    match: /centrifugal.*n\.e\.c.*heading.*8413|centrifugal.*for liquids/i,
    domain: {
      type: 'Bơm ly tâm',
      items: [
        'Bơm ly tâm một tầng trục ngang 1.5kW',
        'Bơm ly tâm đa tầng 3kW áp cao',
        'Bơm ly tâm inox thực phẩm 2.2kW',
        'Bơm ly tâm công nghiệp 5.5kW',
        'Bơm ly tâm hóa chất thân nhựa PP',
        'Bơm ly tâm bơm bùn (slurry) 11kW',
        'Bơm ly tâm trục đứng 2.2kW',
        'Bơm ly tâm nhà dân áp suất 0.37kW',
        'Bơm ly tâm tự mồi 0.75kW',
        'Bơm ly tâm lưu lượng lớn DN80',
        'Bơm ly tâm nhiệt độ cao 180°C',
        'Bơm ly tâm inverter biến tần 7.5kW',
      ],
    },
  },
  // Refrigerators / freezers
  {
    match: /combined refrigerator.freezers|refrigerating or freezing equipment/i,
    domain: {
      type: 'Tủ lạnh',
      items: [
        'Tủ lạnh 2 cánh ngăn đá trên 180L',
        'Tủ lạnh 2 cánh ngăn đá dưới (bottom freezer) 300L',
        'Tủ lạnh 2 cửa side-by-side 600L inverter',
        'Tủ lạnh mini 50L văn phòng',
        'Tủ lạnh 4 cánh French door 450L',
        'Tủ đông đứng (upright freezer) 200L',
        'Tủ đông nằm (chest freezer) 300L',
        'Tủ mát trưng bày siêu thị 1 cánh kính 400L',
        'Tủ lạnh thương mại 2 cánh kính inox 600L',
        'Tủ lạnh bảo quản dược phẩm 2-8°C 300L',
        'Tủ đông âm sâu (deep freezer) -80°C 100L',
        'Tủ lạnh không đóng tuyết (no-frost) 220L',
      ],
    },
  },
  // Lifting/parts
  {
    match: /parts of the machinery of heading.*8426|parts of the machinery of heading.*8428|parts.*lifting|parts.*elevators/i,
    domain: {
      type: 'Bộ phận thiết bị nâng chuyển',
      items: [
        'Puly (pulley) tời điện 5 tấn',
        'Móc cẩu (hook) cần cẩu 10 tấn tiêu chuẩn',
        'Trống cuốn cáp (drum) cẩu điện 3 tấn',
        'Bộ hộp số (gearbox) cần trục cổng 5 tấn',
        'Ray (rail) cần trục dầm đơn A45',
        'Khung (frame) xe con (trolley) cần trục 10 tấn',
        'Cáp thép (wire rope) 6x37 đường kính 16mm',
        'Bộ hãm điện (brake) cẩu điện 2 tấn',
        'Bánh xe (wheel) xe con cầu trục 300mm',
        'Bộ giảm tốc (reducer) băng tải xích',
        'Con lăn (roller) băng tải cao su',
        'Bộ điều khiển (controller) palang điện',
      ],
    },
  },
  // Printers / copiers
  {
    match: /single.function printing.*copying|printing.*copying.*fac/i,
    domain: {
      type: 'Máy in',
      items: [
        'Máy in laser đen trắng A4 26ppm',
        'Máy in laser màu A4 20ppm',
        'Máy in phun màu A4 có WiFi',
        'Máy in nhiệt (thermal printer) 80mm cổng USB',
        'Máy in mã vạch (barcode printer) 203dpi',
        'Máy in tem nhãn (label printer) 4"',
        'Máy in hóa đơn POS 80mm cổng USB+LAN',
        'Máy in laser A3 đơn năng 30ppm',
        'Máy in kim 24 kim A4 (dot matrix)',
        'Máy in laser đen trắng A4 duplex tự động',
        'Máy in thẻ nhựa (card printer) PVC',
        'Máy in ảnh (photo printer) A4 6 màu',
      ],
    },
  },
  // Multi-function printers
  {
    match: /machines.*two or more.*printing|multi.function.*printing/i,
    domain: {
      type: 'Máy in đa chức năng',
      items: [
        'Máy photocopy đa chức năng A4 in/scan/copy',
        'Máy in laser đa chức năng A4 WiFi',
        'Máy photocopy đa chức năng A3 25ppm',
        'Máy in laser màu đa chức năng A4 NW',
        'Máy in laser đen trắng đa chức năng A3 30ppm',
        'Máy in phun đa chức năng A4 in/copy/scan',
        'Máy fax đa chức năng laser A4',
        'Máy photocopy A3 đa chức năng 40ppm',
        'Máy in laser color đa chức năng A3 NW',
        'Máy in phun đa chức năng A3 WiFi',
        'Máy scan + in A4 có ADF',
        'Máy in fax đa chức năng inkjet A4',
      ],
    },
  },
  // Woodworking machines
  {
    match: /working wood.*cork.*bone|for working wood/i,
    domain: {
      type: 'Máy gia công gỗ',
      items: [
        'Máy cưa bàn (table saw) gỗ 3kW',
        'Máy bào thẩm (surface planer) gỗ 4 mặt',
        'Máy phay CNC gỗ 3 trục 1325',
        'Máy đục mộng (mortising machine) gỗ',
        'Máy khoan đa trục (line bore) ván MDF',
        'Máy chà nhám (sanding machine) băng tải',
        'Máy cưa vòng (bandsaw) gỗ khúc',
        'Máy tiện gỗ (wood lathe) CNC',
        'Máy cắt ván (panel saw) 3.2m tự động',
        'Máy bào cuốn (thickness planer) gỗ 400mm',
        'Máy khắc laser gỗ CO2 1390',
        'Máy phay ngang (spindle moulder) gỗ',
      ],
    },
  },
  // Spraying / dispensing equipment
  {
    match: /projecting.*dispersing.*spraying|for spraying liquid/i,
    domain: {
      type: 'Thiết bị phun xịt',
      items: [
        'Máy phun sơn khí nén (spray gun) HVLP',
        'Máy phun thuốc trừ sâu điện 16L',
        'Súng phun (spray gun) màng lọc cao áp',
        'Máy phun sương siêu âm công nghiệp',
        'Béc phun (nozzle) tưới nhỏ giọt ren 1/2"',
        'Máy phun khí (air blower gun) công nghiệp',
        'Máy phun polyurethane (PU foam) 2 thành phần',
        'Súng bơm mỡ (grease gun) điện 18V',
        'Máy phun nước áp suất cao 140 bar',
        'Thiết bị phun hóa chất vệ sinh CIP',
        'Béc phun dầu bôi trơn CNC',
        'Máy phun cát (sandblasting) áp suất 6 bar',
      ],
    },
  },
  // Agricultural sprayers
  {
    match: /agricultural.*horticultural sprayers|sprayers.*agricultural/i,
    domain: {
      type: 'Máy phun nông nghiệp',
      items: [
        'Máy phun thuốc trừ sâu điện đeo vai 20L',
        'Bình xịt tay đeo lưng 16L nhựa',
        'Máy phun ULV (ultra-low volume) diệt côn trùng',
        'Máy phun sương tưới vườn tự động',
        'Máy phun thuốc sâu động cơ xăng 2 thì 26cc',
        'Máy phun cao áp nông nghiệp 20L/phút',
        'Béc phun điều chỉnh nông nghiệp',
        'Máy phun dạng cột (mist blower) 5L',
        'Máy phun điện đa năng 10L lithium',
        'Dây chuyền phun thuốc nhỏ giọt tưới rau',
      ],
    },
  },
  // Ventilation hoods
  {
    match: /ventilating.*recycling hoods.*fan/i,
    domain: {
      type: 'Máy hút mùi bếp',
      items: [
        'Máy hút mùi âm tủ 60cm motor 2 tốc độ',
        'Máy hút mùi âm tủ 70cm 3 tốc độ đèn LED',
        'Máy hút mùi áp tường 90cm inox',
        'Máy hút mùi treo tường 70cm 2 tốc độ',
        'Máy hút mùi bếp công nghiệp inox 1000mm',
        'Máy hút khói nhà bếp âm trần 60cm',
        'Máy hút mùi đảo bếp (island hood) 90cm',
        'Quạt hút gió bếp công nghiệp 40cm',
        'Máy hút khói hàn (welding fume extractor)',
        'Hệ thống hút bụi gỗ (dust collector) 2.2kW',
      ],
    },
  },
  // Fans
  {
    match: /table.*floor.*wall.*window.*ceiling.*fans|fans.*self.contained/i,
    domain: {
      type: 'Quạt điện',
      items: [
        'Quạt cây (tower fan) đứng 45W 3 tốc độ',
        'Quạt trần (ceiling fan) 5 cánh 56" có điều khiển từ xa',
        'Quạt bàn mini (desk fan) 14W USB',
        'Quạt hộp (box fan) 40cm công nghiệp',
        'Quạt tường công nghiệp 60cm 3 tốc độ',
        'Quạt hút thông gió (ventilating fan) 30cm',
        'Quạt cột đứng (column fan) 45W timer',
        'Quạt trần nhà xưởng HVLS 7.3m',
        'Quạt thông gió âm tường (wall exhaust fan) 20cm',
        'Quạt đứng công nghiệp 75cm 250W',
        'Quạt sải cánh (axial fan) ống gió phi 300',
        'Quạt ly tâm (centrifugal blower) 2.2kW',
      ],
    },
  },
  // Conveyor systems
  {
    match: /continuous.action.*goods.*materials|conveyor/i,
    domain: {
      type: 'Băng tải',
      items: [
        'Băng tải cao su (rubber belt conveyor) rộng 500mm',
        'Băng tải PVC thực phẩm rộng 400mm',
        'Băng tải lưới thép (wire mesh conveyor) 600mm',
        'Băng tải xích (chain conveyor) bước 38.1mm',
        'Băng tải con lăn (roller conveyor) 500mm/đoạn',
        'Băng tải nghiêng (inclined conveyor) 30° rộng 600mm',
        'Băng tải phân loại (sorting conveyor) có cảm biến',
        'Hệ thống băng tải kho hàng tự động',
        'Băng tải vít tải (screw conveyor) phi 150 inox',
        'Băng tải gàu (bucket elevator) cao 6m',
        'Băng tải khí (air conveyor) chai PET',
        'Hệ thống con lăn chuyển hướng (roller diverter)',
      ],
    },
  },
  // Weighing machines
  {
    match: /weighing machines|other than personal.*conveyor.*constant|scales.*weighing/i,
    domain: {
      type: 'Cân công nghiệp',
      items: [
        'Cân bàn điện tử 300kg chính xác 0.1kg',
        'Cân sàn điện tử 1 tấn nền inox',
        'Cân treo điện tử 500kg móc cẩu',
        'Cân xe tải (truck scale) 60 tấn',
        'Cân băng tải (belt weigher) 50kg/s',
        'Cân đóng bao tự động 25kg/50kg',
        'Cân điếm (counting scale) linh kiện 30kg',
        'Cân kỹ thuật phòng thí nghiệm 0.01g',
        'Cân bồn (tank load cell) 2 tấn',
        'Cân trục xe (axle weigher) 20 tấn',
        'Cân khối lượng riêng (density scale)',
        'Cân điện tử nhãn hàng 30kg in tem tự động',
      ],
    },
  },
  // Liquid filters
  {
    match: /filtering.*purifying.*liquids.*n\.e\.c|filter.*liquid/i,
    domain: {
      type: 'Thiết bị lọc chất lỏng',
      items: [
        'Bộ lọc nước RO công nghiệp 1000L/h',
        'Thiết bị lọc dầu thủy lực 10 micron',
        'Bộ lọc túi (bag filter) SS304 DN65',
        'Thiết bị lọc đĩa (disc filter) 120 mesh',
        'Bộ lọc nước uống 5 cấp 1/4"',
        'Thiết bị siêu lọc (ultrafiltration) 1000L/h',
        'Bộ lọc màng (membrane filter) 0.2 micron',
        'Thiết bị khử ion (deionizer) trao đổi ion',
        'Bộ lọc cát (sand filter) nước hồ bơi 500mm',
        'Thiết bị lọc dầu thực vật cartridge',
        'Bộ lọc nước đầu nguồn 20" PP 5 micron',
        'Thiết bị lọc rượu (wine filter) khung bản',
      ],
    },
  },
  // CNC metal working
  {
    match: /working any material by removal of material|removal of material/i,
    domain: {
      type: 'Máy gia công cắt gọt',
      items: [
        'Máy cắt laser fiber kim loại 1500W',
        'Máy cắt plasma CNC bàn 1500×3000mm',
        'Máy phay CNC 3 trục gia công nhôm',
        'Máy tiện CNC 2 trục bar feeder',
        'Máy cắt dây EDM (wire EDM) 0.25mm',
        'Trung tâm gia công CNC (VMC) 4 trục',
        'Máy khoan taro (tapping machine) CNC',
        'Máy mài phẳng CNC (surface grinder)',
        'Máy gia công tia lửa điện (EDM die-sinking)',
        'Máy cắt ống laser CNC phi 20-160mm',
        'Trung tâm tiện phay (turn-mill center) CNC',
        'Máy mài tròn CNC (cylindrical grinder)',
      ],
    },
  },
  // Gas/air/vacuum pumps
  {
    match: /for air.*vacuum.*gas.*n\.e\.c|air.*vacuum.*pumps/i,
    domain: {
      type: 'Bơm khí/chân không',
      items: [
        'Bơm chân không vòng chất lỏng (liquid ring) 15kW',
        'Bơm chân không dầu bôi trơn rotary vane 3kW',
        'Máy thổi khí (roots blower) áp thấp 5.5kW',
        'Bơm khí màng (diaphragm air pump) 12VDC',
        'Bơm tay không khí (hand air pump) xe đạp',
        'Máy nén khí piston 2 xi-lanh không dầu 1.5HP',
        'Bơm chân không khô (dry vacuum pump) 11kW',
        'Máy thổi bột (powder blower) vận chuyển khí nén',
        'Bơm chân không turbo-molecular (turbo pump)',
        'Bơm tay chân không (hand vacuum pump) 200mbar',
      ],
    },
  },
  // Oil/gas separators / filters
  {
    match: /filtering.*purifying.*oil.*gas|oil.*gas.*filter/i,
    domain: {
      type: 'Thiết bị lọc/tách dầu khí',
      items: [
        'Thiết bị tách dầu-nước (oil-water separator) 5L/min',
        'Bộ lọc dầu nhờn động cơ 10 micron spin-on',
        'Thiết bị tách khí/lỏng (gas-liquid separator)',
        'Bộ lọc khí nén 3 in 1 (regulator/filter/lubricator)',
        'Thiết bị lọc nhiên liệu diesel 30 micron',
        'Bình tách nhớt (oil mist separator) máy nén',
        'Thiết bị lọc khí tự nhiên (gas filter) DN50',
        'Bộ lọc tách ẩm (coalescing filter) khí nén',
        'Thiết bị tách cặn dầu (oil skimmer) bể cắt gọt',
        'Bộ lọc xăng đôi (dual fuel filter) tàu thuyền',
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
