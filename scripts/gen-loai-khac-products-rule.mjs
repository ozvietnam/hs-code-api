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

  // ══════════════════════════════════════════════════════════════
  // CH.85 — ĐIỆN TỬ / ĐIỆN
  // ══════════════════════════════════════════════════════════════
  {
    match: /smart cards|cards incorporating.*integrated circuit|IC cards/i,
    domain: {
      type: 'Thẻ thông minh (smart card)',
      items: [
        'Thẻ CCCD gắn chip (citizen ID smart card)',
        'Thẻ SIM điện thoại nano SIM 4G',
        'Thẻ ngân hàng EMV chip Visa/Mastercard',
        'Thẻ thông minh (smart card) MIFARE 1K 13.56MHz',
        'Thẻ nhân viên RFID 125kHz Clamshell',
        'Thẻ từ + chip combo thẻ đa năng',
        'Thẻ y tế điện tử BHYT gắn chip',
        'Thẻ giao thông thông minh contactless',
        'Thẻ SIM eSIM công nghiệp IoT',
        'Thẻ thông minh JavaCard nền tảng an toàn',
        'Thẻ SIM M2M machine-to-machine LTE',
        'Thẻ RFID UHF EPC Gen2 860-960MHz',
      ],
    },
  },
  {
    match: /power handling capacity.*1 kva|1 kva.*transformers|n\.e\.c.*8504\.2/i,
    domain: {
      type: 'Máy biến áp',
      items: [
        'Máy biến áp tự ngẫu (autotransformer) 3kVA',
        'Máy biến áp hàn (welding transformer) 200A',
        'Biến áp nguồn tuyến tính 1kVA 220V/12V',
        'Máy biến áp cách ly (isolation transformer) 500VA',
        'Biến áp xung (switching transformer) inverter',
        'Máy biến áp 3 pha 30kVA 10kV/0.4kV',
        'Máy biến áp chiếu sáng 220V/12V 150VA',
        'Biến áp đo lường (PT/current transformer) 100/5A',
        'Cuộn kháng lọc (line reactor) 5kW 3 pha',
        'Cuộn cảm (inductor) lọc nhiễu EMC 3mH',
        'Máy biến áp trung tần (medium frequency) 20kHz',
        'Biến áp bù lưới (voltage regulator) 1kVA',
      ],
    },
  },
  {
    match: /for a voltage not exceeding 1000 volts.*not fitted|switches.*1000 volt/i,
    domain: {
      type: 'Thiết bị đóng cắt điện',
      items: [
        'Aptomat (MCB) 1P 20A 6kA',
        'Aptomat (MCCB) 3P 100A 25kA',
        'Cầu dao tự động (ELCB/RCCB) 2P 32A 30mA',
        'Công tắc xoay (rotary switch) 3P 25A',
        'Cầu chì hộp (fuse holder) NH00 160A',
        'Contactor (công tắc-tơ) 3P 32A 230VAC',
        'Relay nhiệt (overload relay) 20-25A',
        'Nút nhấn (push button) 22mm xanh/đỏ',
        'Công tắc hành trình (limit switch) công nghiệp',
        'Relay trung gian (intermediate relay) 8 chân 24VDC',
        'Timer relay (rờ-le thời gian) ON-delay 0-60s',
        'Switch tay (manual switch) 2P 10A 250VAC',
      ],
    },
  },
  {
    match: /for a voltage not exceeding 1000 volts.*fitted with connectors|connectors.*1000 volt/i,
    domain: {
      type: 'Phích cắm và ổ cắm điện',
      items: [
        'Ổ cắm điện âm tường 3 chấu 16A 250V',
        'Phích cắm (plug) 3P 16A 250V IP44',
        'Ổ cắm nối dài 4 cổng + 2 USB 2m',
        'Ổ cắm công nghiệp CEE 3P+N+E 32A 5P IP67',
        'Đầu nối RJ45 Cat6 bấm sẵn',
        'Giắc cắm XLR 3P đực/cái audio',
        'Đầu nối M12 4 chân A-coded cảm biến',
        'Phích cắm IEC C13/C14 15A panel mount',
        'Ổ cắm 45 độ nghiêng âm tường đơn 10A',
        'Đầu nối Anderson SB50 50A DC connector',
        'Cáp nguồn IEC C13-NEMA 5-15P 1.8m',
        'Ổ cắm đa năng du lịch toàn cầu 3 cổng USB',
      ],
    },
  },
  {
    match: /recorded.*excluding.*chapter 37|optical.*recorded|magnetic.*recorded/i,
    domain: {
      type: 'Thiết bị lưu trữ đã ghi',
      items: [
        'Ổ cứng SSD 256GB SATA 2.5"',
        'Ổ cứng SSD 512GB NVMe M.2',
        'Thẻ nhớ microSD 128GB Class10 UHS-I',
        'Ổ USB flash 64GB 3.0 tốc độ cao',
        'Ổ cứng HDD 2TB 3.5" SATA desktop',
        'Ổ cứng HDD 1TB 2.5" laptop 5400rpm',
        'Thẻ nhớ SD 32GB 10MB/s camera',
        'SSD công nghiệp 64GB -40°C~85°C',
        'Đĩa DVD-R 4.7GB ghi một lần (xuất xưởng đã ghi dữ liệu phần mềm)',
        'Ổ cứng NAS 4TB 7200rpm SATA',
        'Ổ USB eMMC 128GB module',
        'CFast 2.0 card 64GB industrial',
      ],
    },
  },
  {
    match: /LED.*lamps|light.*emitting diode|LED.*light/i,
    domain: {
      type: 'Đèn LED',
      items: [
        'Đèn LED bulb 9W E27 ánh sáng trắng 6500K',
        'Đèn LED bulb 12W E27 ánh vàng 3000K',
        'Đèn LED tube 18W T8 1.2m thay huỳnh quang',
        'Đèn LED downlight âm trần 12W 3000K',
        'Đèn LED panel vuông 600×600 40W',
        'Đèn LED highbay nhà xưởng 100W IP65',
        'Đèn LED spotlight 7W GU10 góc chiếu 36°',
        'Đèn LED dây (strip light) 12V 60LED/m 5050',
        'Đèn LED streetlight 80W IP66 5700K',
        'Đèn LED lắp nổi văn phòng 36W 600mm',
        'Đèn LED cột đường 150W solar',
        'Đèn LED khẩn cấp (emergency) 2h thoát nạn',
      ],
    },
  },
  {
    match: /motors.*ac|motors.*single.phase|electric motors.*output/i,
    domain: {
      type: 'Động cơ điện',
      items: [
        'Động cơ điện 3 pha 0.75kW 4P 1450rpm',
        'Động cơ điện 3 pha 1.5kW IE2 B3',
        'Động cơ điện 3 pha 2.2kW IE3 VSD',
        'Động cơ điện 1 pha 0.37kW 220V',
        'Động cơ điện 3 pha 5.5kW chống nổ Ex',
        'Động cơ servo AC 750W encoder 17bit',
        'Động cơ bước (stepper) Nema 23 3Nm',
        'Động cơ điện submersible 4" 1HP bơm giếng',
        'Động cơ điện tuyến tính (linear motor) 250N',
        'Động cơ điện 3 pha 11kW IE3 inverter',
        'Motor giảm tốc (gearmotor) 24VDC 100RPM',
        'Động cơ điện từ trường vĩnh cửu (PMSM) 2kW',
      ],
    },
  },
  {
    match: /insulated wire|winding wire|electrical conductors/i,
    domain: {
      type: 'Dây điện/cáp điện',
      items: [
        'Cáp điện đồng XLPE 4×16mm² 0.6/1kV',
        'Cáp điện đồng 2×2.5mm² vỏ PVC đôi',
        'Dây điện đơn cứng 2.5mm² vỏ PVC 100m',
        'Cáp tín hiệu (signal cable) 2×0.5mm² có shield',
        'Cáp điều khiển (control cable) 12×0.75mm²',
        'Cáp CAT6 UTP 4 đôi 305m cuộn',
        'Cáp trung thế (MV cable) 3×185mm² 15kV XLPE',
        'Cáp quang đơn mode (SMF) 4 lõi OS2',
        'Cáp ổ đĩa (flex cable) FFC 0.5mm 20P',
        'Cáp HDMI 2.0 dài 3m 4K 60Hz',
        'Cáp USB-C 3.1 Gen2 100W 1m',
        'Cáp kết nối MIL-DTL-26482 Series I',
      ],
    },
  },

  // ══════════════════════════════════════════════════════════════
  // CH.87 — XE CỘ
  // ══════════════════════════════════════════════════════════════
  {
    match: /public transport.*10 or more persons|carries 10.*persons/i,
    domain: {
      type: 'Xe buýt/xe khách',
      items: [
        'Xe buýt thành phố 12m 80 chỗ động cơ diesel Euro 4',
        'Xe khách 45 chỗ giường nằm đường dài',
        'Xe buýt nhanh BRT (Bus Rapid Transit) 18m',
        'Xe khách 29 chỗ ngồi thân thấp trường học',
        'Xe buýt điện (EV bus) 12m 250kWh lithium',
        'Xe khách 16 chỗ minibus diesel',
        'Xe buýt 2 tầng (double-decker) 45 chỗ',
        'Xe khách 35 chỗ thân cao ghế nệm',
        'Xe buýt đô thị hybrid CNG + điện',
        'Xe limousine VIP 9 chỗ giường nằm phẳng',
      ],
    },
  },
  {
    match: /with only spark.ignition.*piston engine|spark.ignition.*propulsion of vehicles|petrol.*engine.*vehicle/i,
    domain: {
      type: 'Xe ô tô động cơ xăng',
      items: [
        'Xe ô tô 5 chỗ sedan 1.5L xăng',
        'Xe ô tô 5 chỗ hatchback 1.4L xăng turbo',
        'Xe SUV 7 chỗ 1.5L xăng turbo',
        'Xe MPV 7 chỗ 2.0L xăng',
        'Xe bán tải 4×4 2.5L xăng',
        'Xe ô tô con 2 chỗ coupe 1.4L xăng',
        'Xe thể thao 5 chỗ crossover 1.6L xăng turbo',
        'Xe pickup 4×2 2.0L xăng',
        'Xe ô tô sedan 4 chỗ 1.0L xăng turbocharged',
        'Xe city car 5 chỗ 0.8L xăng tự động',
      ],
    },
  },
  {
    match: /with only compression.ignition.*piston engine|compression.ignition.*propulsion of vehicles|diesel.*engine.*vehicle/i,
    domain: {
      type: 'Xe ô tô động cơ diesel',
      items: [
        'Xe ô tô 5 chỗ sedan 2.0L diesel',
        'Xe SUV 7 chỗ 2.2L diesel 4WD',
        'Xe pickup bán tải 2.4L diesel 4×4',
        'Xe MPV 8 chỗ 2.0L diesel',
        'Xe tải nhỏ 2 tấn 2.5L diesel',
        'Xe van 6 chỗ 1.9L diesel hộp số tự động',
        'Xe SUV hạng sang 3.0L diesel V6',
        'Xe pickup 4×4 2.5L diesel hộp số 6 cấp',
        'Xe đầu kéo (semi-truck) 6×4 375HP diesel Euro 4',
        'Xe tải thùng 5 tấn 4×2 diesel',
      ],
    },
  },
  {
    match: /with both spark.ignition.*compression.ignition|with both compression.ignition.*spark.ignition|hybrid.*petrol|plug.in hybrid/i,
    domain: {
      type: 'Xe hybrid/PHEV',
      items: [
        'Xe hybrid xăng-điện 5 chỗ 1.8L HEV tự sạc',
        'Xe PHEV 5 chỗ 1.5L sạc ngoài 50km EV range',
        'Xe hybrid SUV 7 chỗ 2.5L AWD E-Four',
        'Xe hybrid sedan 4 chỗ 1.8L 60% FE cải thiện',
        'Xe PHEV crossover 5 chỗ 1.6L + 100kW motor',
        'Xe mild-hybrid 48V 5 chỗ 1.5L turbo',
        'Xe hybrid thành phố hatchback 1.0L 3 chỗ',
        'Xe minivan hybrid 8 chỗ 2.0L HEV',
      ],
    },
  },
  {
    match: /fitted with auxiliary motor.*pedals|electric bicycle|e.bike/i,
    domain: {
      type: 'Xe đạp điện/xe đạp có động cơ phụ',
      items: [
        'Xe đạp điện trợ lực (pedelec) 250W pin 36V',
        'Xe đạp điện gấp (folding e-bike) 20" 350W',
        'Xe đạp điện leo núi (e-MTB) 500W mid-drive',
        'Xe đạp điện thành thị 26" 500Wh lithium',
        'Xe đạp đường trường điện (e-road bike) 250W',
        'Xe đạp điện cargobike 3 bánh tải hàng 250W',
        'Xe đạp điện dành cho người cao tuổi step-thru',
        'Xe đạp điện chia sẻ (share bike) IoT GPS',
        'Xe đạp điện giao hàng curie-last-mile 350W',
      ],
    },
  },

  // ══════════════════════════════════════════════════════════════
  // CH.72 — THÉP
  // ══════════════════════════════════════════════════════════════
  {
    match: /flat.rolled.*plated.*coated.*zinc|zinc coated.*flat.rolled/i,
    domain: {
      type: 'Thép tấm mạ kẽm',
      items: [
        'Thép tấm mạ kẽm nhúng nóng (HDG) 0.5mm×1250mm',
        'Thép tấm mạ kẽm điện phân (EG) 0.8mm×1000mm',
        'Thép cuộn mạ kẽm 1.0mm×1000mm×CL (coil)',
        'Thép mạ kẽm + sơn màu (PPGI) 0.5mm xanh dương',
        'Thép lợp sóng mạ kẽm dày 0.42mm rộng 900mm',
        'Thép tấm mạ kẽm dày 1.2mm cắt tấm 2440×1220',
        'Thép lá mạ kẽm nhẹ 0.35mm làm thùng hàng',
        'Thép mạ kẽm nhúng nóng dày 2.0mm khung kết cấu',
        'Thép mạ hợp kim Galvalume (AZ150) 0.6mm',
        'Thép cán nguội mạ kẽm 0.3mm×1000mm',
        'Tôn mạ kẽm phủ sơn màu 0.45mm lợp nhà',
        'Thép tấm mạ kẽm dày 3mm phủ epoxy',
      ],
    },
  },
  {
    match: /bars and rods.*hot.rolled.*irregularly wound coils|hot.rolled.*bars/i,
    domain: {
      type: 'Thép thanh/que cán nóng',
      items: [
        'Thép cuộn cán nóng SD295A phi 10mm xây dựng',
        'Thép cuộn cán nóng phi 12mm CB300-V',
        'Thép thanh cán nóng phi 16mm SD390',
        'Thép thanh tròn cán nóng phi 20mm A36',
        'Thép que hàn CO2 ER70S-6 phi 0.9mm cuộn 15kg',
        'Thép cuộn dây (wire rod) phi 6.5mm SAE1008',
        'Thép thanh gai (deformed bar) phi 25mm TCVN 1651',
        'Thép cuộn cán nóng phi 8mm xây dựng thông thường',
        'Thép góc (angle steel) L50×50×5mm cán nóng',
        'Thép I-beam (chữ I) 100×50mm cán nóng',
        'Thép H-beam 150×150mm cán nóng kết cấu',
        'Thép hộp vuông (SHS) 50×50×3mm cán nóng',
      ],
    },
  },
  {
    match: /flat.rolled.*n\.e\.c.*600mm or more|flat.rolled.*not elsewhere.*600mm/i,
    domain: {
      type: 'Thép tấm cán phẳng',
      items: [
        'Thép tấm cán nóng (HR) 3mm×1500mm×6000mm A36',
        'Thép tấm cán nguội (CR) 1mm×1000mm×2000mm',
        'Thép tấm cán nóng 5mm rộng 1500mm cuộn',
        'Thép tấm cán nóng 8mm×1500mm×6000mm S355',
        'Thép tấm cán nguội 0.5mm×1000mm cán phẳng',
        'Thép tấm cán nóng dày 10mm HRC A283',
        'Thép tấm cán nóng 6mm×1200mm dùng đóng tàu',
        'Thép tấm kết cấu 12mm Q345B cán nóng',
        'Thép lá cán nguội 0.8mm×1250mm cuộn CR4',
        'Thép tấm dày 20mm AH36 đóng tàu LR',
      ],
    },
  },

  // ══════════════════════════════════════════════════════════════
  // CH.39 — NHỰA
  // ══════════════════════════════════════════════════════════════
  {
    match: /plates.*sheets.*film.*foil.*strip.*not self.adhesive|plastic.*film.*sheet/i,
    domain: {
      type: 'Tấm/màng nhựa',
      items: [
        'Màng BOPP trong suốt dày 20 micron cuộn 1000m',
        'Tấm nhựa PC (polycarbonate) dày 3mm trong suốt',
        'Màng PE LDPE đen dày 0.1mm che phủ nông nghiệp',
        'Tấm nhựa PVC cứng trắng 2mm 1220×2440mm',
        'Màng PET trong 50 micron cuộn 1000m',
        'Tấm Foam PVC (celuka) trắng 10mm 1220×2440mm',
        'Màng PP dệt (woven PP) chống thấm nền đất',
        'Tấm nhựa HDPE đen dày 5mm chống thấm hồ',
        'Màng khí (bubble wrap) 50cm×100m bong bóng khí',
        'Tấm ABS 3mm trắng 1220×2440mm',
        'Màng màu BOPP 30 micron cuốn nhãn thực phẩm',
        'Tấm nhựa PP dạng tổ ong (corrugated) 4mm',
      ],
    },
  },
  {
    match: /in primary forms|plastics.*primary forms/i,
    domain: {
      type: 'Hạt nhựa nguyên liệu',
      items: [
        'Hạt nhựa PP (polypropylene) H030EG màu tự nhiên 25kg',
        'Hạt nhựa HDPE B5420 dùng thổi màng bao bì',
        'Hạt nhựa LDPE LD150BW màu trong suốt 25kg',
        'Hạt nhựa ABS PA757 grade điện tử 25kg bao',
        'Hạt nhựa PET chip HS21 dùng kéo sợi PET',
        'Hạt nhựa POM (Delrin) GH-25 25kg dạng granule',
        'Hạt nhựa Nylon PA6 grade đúc phun 25kg',
        'Hạt nhựa PS (polystyrene) GPPS 525N 25kg',
        'Hạt nhựa TPE/TPR màu đen Shore 60A 25kg',
        'Hạt nhựa PC (Lexan) ML3451 grade thấu kính 25kg',
        'Hạt nhựa LLDPE 7042 grade màng mỏng 25kg',
        'Hạt nhựa EVA 28% VA content dùng đế giày',
      ],
    },
  },
  {
    match: /other articles.*n\.e\.c.*chapter 39|plastic.*articles.*n\.e\.c/i,
    domain: {
      type: 'Sản phẩm nhựa công nghiệp',
      items: [
        'Thùng nhựa HDPE 60L có nắp dùng thực phẩm',
        'Pallet nhựa PP 1200×1000mm tải 2 tấn',
        'Khay nhựa đựng linh kiện điện tử ESD',
        'Rổ nhựa PP dùng đựng trái cây rau củ',
        'Thùng đựng rác nhựa HDPE 120L có bánh xe',
        'Ống nhựa PVC âm tường phi 49 dùng dây điện',
        'Khay đựng cây giống (seedling tray) PS 50 lỗ',
        'Nắp chai nhựa PP 28mm PCO1810 đóng gói',
        'Thùng nhựa IBC 1000L HDPE khung thép tái sử dụng',
        'Giá kệ nhựa PP dùng siêu thị 4 tầng',
        'Phụ kiện ống nhựa: tê, cút, nối, cúp van 25mm',
        'Sọt nhựa dùng logistics chuỗi lạnh 60×40cm',
      ],
    },
  },
  {
    match: /tubes.*pipes.*hoses.*plastics|plastic.*tubes.*pipes/i,
    domain: {
      type: 'Ống nhựa',
      items: [
        'Ống nhựa uPVC cấp nước phi 90mm PN10',
        'Ống nhựa PPR phi 25mm cấp nước nóng PN20',
        'Ống PE100 phi 63mm nước sinh hoạt SDR11',
        'Ống nhựa PVC thoát nước phi 110mm',
        'Ống nhựa HDPE phi 32mm cuộn 50m tưới nhỏ giọt',
        'Ống nhựa composite đa lớp (PEX-AL-PEX) 16mm',
        'Ống kết cấu uPVC dùng cột, dầm phi 100mm',
        'Ống nhựa chịu nhiệt PP phi 20mm PN20',
        'Ống nhựa PVC điện phi 20mm cuộn 25m',
        'Ống nhựa HDPE bơm nước biển phi 200mm',
        'Ống hút PVC dẻo có lõi thép xoắn phi 75mm',
        'Ống nhựa PP lưới composite phi 50mm cấp nước',
      ],
    },
  },

  // ══════════════════════════════════════════════════════════════
  // CH.73 — SẮT THÉP GIA CÔNG
  // ══════════════════════════════════════════════════════════════
  {
    match: /tubes.*pipes.*hollow.*not seamless|welded.*tubes.*pipes/i,
    domain: {
      type: 'Ống thép hàn',
      items: [
        'Ống thép hàn phi 48.3mm 3mm ERW kết cấu',
        'Ống thép vuông (SHS) 50×50×2mm hàn ERW',
        'Ống thép chữ nhật (RHS) 60×40×2mm hàn',
        'Ống thép phi 60.3mm 4mm SAW dẫn nước',
        'Ống thép phi 159mm 6mm LSAW dẫn khí',
        'Ống thép mạ kẽm phi 20mm đi dây điện',
        'Ống thép phi 114mm 5mm hàn đường ống thoát nước',
        'Ống thép đen phi 33.7mm 2mm ERW kết cấu nội thất',
        'Ống thép phi 89mm 5mm hàn dẫn dầu thủy lực',
        'Ống thép lớn phi 508mm 8mm LSAW hải lý',
        'Ống hộp thép 100×100×4mm hàn kết cấu nhà',
        'Ống thép dẫn nhiệt P235GH phi 57mm 4mm',
      ],
    },
  },
  {
    match: /table.*kitchen.*household.*iron.*steel|household.*articles.*steel/i,
    domain: {
      type: 'Đồ dùng nhà bếp inox/thép',
      items: [
        'Chậu rửa chén 1 ngăn inox 304 80×50cm',
        'Chậu rửa chén 2 ngăn inox 304 80×50×45cm',
        'Bộ xoong nồi inox 5 chiếc đáy 3 lớp',
        'Nồi inox 20L nấu cơm công nghiệp',
        'Rổ inox đựng rau dạng ống phi 30cm',
        'Khay đựng đồ inox 304 GN1/1 530×325×65mm',
        'Muỗng/nĩa thép không gỉ bộ 6 chiếc',
        'Bình giữ nhiệt inox 1L giữ nóng 12 giờ',
        'Chảo inox 3 đáy 28cm không phủ chống dính',
        'Nắp vung inox kính cường lực 24cm',
        'Thùng inox 20L có vòi dùng đựng thức ăn',
        'Đĩa inox tiêu chuẩn nhà hàng phi 25cm',
      ],
    },
  },

  // ══════════════════════════════════════════════════════════════
  // CH.90 — THIẾT BỊ ĐO LƯỜNG / Y TẾ
  // ══════════════════════════════════════════════════════════════
  {
    match: /for measuring.*checking.*voltage.*current.*resistance|measuring.*electrical/i,
    domain: {
      type: 'Thiết bị đo điện',
      items: [
        'Đồng hồ vạn năng (multimeter) kỹ thuật số Fluke 117',
        'Đồng hồ đo điện trở cách điện (megger) 500V',
        'Máy phân tích chất lượng điện (power analyzer)',
        'Đầu dò điện (current probe) 400A AC/DC clamp',
        'Thiết bị đo điện trở đất (earth tester) 4 cực',
        'Oscilloscope 2 kênh 100MHz USB',
        'Đồng hồ điện tử 3 pha đo cosφ/THD',
        'Clamp meter (ampe kìm) AC/DC 600A',
        'Thiết bị kiểm tra đường cáp (cable tester) TDR',
        'Đồng hồ đo cách điện (hipot tester) 5kV',
        'Watt-hour meter (đồng hồ điện) 3 pha RS485',
        'Thiết bị hiệu chuẩn điện (calibrator) 4-20mA',
      ],
    },
  },
  {
    match: /for navigation.*aeronautical.*space|marine.*navigation|navigation instruments/i,
    domain: {
      type: 'Thiết bị dẫn đường hàng hải',
      items: [
        'Máy định vị GPS hàng hải (chartplotter) 7" màn hình',
        'Radar hàng hải (marine radar) 24NM 4kW',
        'Hệ thống AIS transponder Class B tàu biển',
        'Máy đo độ sâu (echo sounder/depth finder) dual-freq',
        'Thiết bị liên lạc VHF hàng hải cầm tay IP67',
        'Máy định vị GPS tàu thuyền 12 kênh WAAS',
        'Đầu dò siêu âm CHIRP fishfinder 200kHz',
        'Hải đồ điện tử (electronic chart display ECDIS)',
        'Thiết bị compass từ hàng hải (marine compass)',
        'Hệ thống kiểm soát tàu thuyền VHF DSC CH70',
      ],
    },
  },
  {
    match: /n\.e\.c.*heading.*9018|instruments.*apparatus.*medical|medical instruments/i,
    domain: {
      type: 'Thiết bị y tế',
      items: [
        'Máy đo huyết áp bắp tay tự động OMRON',
        'Máy đo SpO2 (pulse oximeter) ngón tay',
        'Máy siêu âm cầm tay (pocket ultrasound) WiFi',
        'Máy đo đường huyết (glucometer) + 50 que thử',
        'Đèn mổ (surgical light) LED treo trần 50000lux',
        'Thiết bị gây mê (anesthesia machine) 3 vaporizer',
        'Máy điện tim (ECG) 12 chuyển đạo màn hình 5"',
        'Máy theo dõi bệnh nhân (patient monitor) 6 thông số',
        'Bàn mổ điện (operating table) motor 4 section',
        'Thiết bị hút máu (suction unit) phẫu thuật 15L',
        'Máy đo nhiệt độ hồng ngoại không tiếp xúc',
        'Hệ thống nội soi (endoscope) ống mềm tiêu hóa',
      ],
    },
  },

  // ══════════════════════════════════════════════════════════════
  // CH.48 — GIẤY
  // ══════════════════════════════════════════════════════════════
  {
    match: /printing.*writing.*graphic.*10%.*mechanical|writing.*paper.*uncoated/i,
    domain: {
      type: 'Giấy in/viết',
      items: [
        'Giấy in A4 80gsm 500 tờ/ream trắng sáng',
        'Giấy photocopy A4 70gsm IK Green 500 tờ',
        'Giấy in phun A4 90gsm 500 tờ',
        'Giấy cuộn plotter 80gsm 610mm×50m',
        'Giấy in 1 mặt bóng (C1S) 90gsm A3',
        'Giấy offset 90gsm cuộn 1090mm×1000m',
        'Giấy in văn phòng A4 75gsm 500 tờ (màu xanh nhạt)',
        'Giấy cuộn fax nhiệt (thermal fax) 216mm×50m',
        'Giấy in hóa đơn NCR 2 liên A5 100 bộ',
        'Giấy viết tay ivory 100gsm A4 500 tờ',
        'Giấy không tro (wood-free) 80gsm cuộn 880mm',
        'Giấy in 2 mặt bóng (C2S) 115gsm A4',
      ],
    },
  },
  {
    match: /over 10%.*mechanical.*chemi.mechanical|mechanical.*wood.*paper/i,
    domain: {
      type: 'Giấy kraft/công nghiệp',
      items: [
        'Giấy kraft nâu 80gsm cuộn 1000mm đóng gói',
        'Giấy lót thùng carton (corrugating medium) 125gsm',
        'Giấy kraft trắng 80gsm in bao bì thực phẩm',
        'Giấy vệ sinh (tissue) cuộn 2 lớp 400 tờ',
        'Giấy khăn (paper towel) Z-fold 200 tờ/gói',
        'Giấy bìa carton (liner board) 180gsm nâu',
        'Giấy nhám (sandpaper) P80 A4 wet/dry silicon carbide',
        'Giấy xi-măng (cement bag paper) 70gsm 4 lớp',
        'Giấy sáp (wax-coated paper) 60gsm bao thực phẩm',
        'Giấy lọc cà phê (coffee filter paper) dạng túi',
        'Giấy cuộn in báo (newsprint) 45gsm 1380mm',
        'Giấy bìa duplex 300gsm 70×100cm in màu',
      ],
    },
  },

  // ══════════════════════════════════════════════════════════════
  // CH.62 — QUẦN ÁO MAY SẴN
  // ══════════════════════════════════════════════════════════════
  {
    match: /women.*girls.*cotton.*not knitted|women.*cotton.*woven/i,
    domain: {
      type: 'Quần áo nữ vải cotton',
      items: [
        'Áo sơ mi nữ vải cotton 100% tay dài màu trắng',
        'Quần jean nữ vải denim cotton 98% size S-XL',
        'Đầm nữ vải cotton thun cổ tròn dáng suông',
        'Áo thun nữ cotton 100% cổ V ngắn tay',
        'Quần kaki nữ cotton 97% dáng ống đứng',
        'Áo khoác nữ vải cotton twill bomber jacket',
        'Bộ đồ bộ nữ cotton mặc nhà quần dài + áo',
        'Váy nữ vải bông cotton flare midi skirt',
        'Áo phao nữ cotton kẻ sọc cổ bẻ tay dài',
        'Quần short nữ cotton 100% dạng bermuda',
        'Áo croptop nữ cotton cổ tròn form fitted',
        'Đầm xòe nữ vải cotton thêu 100% size M',
      ],
    },
  },
  {
    match: /men.*boys.*cotton.*not knitted|men.*cotton.*woven/i,
    domain: {
      type: 'Quần áo nam vải cotton',
      items: [
        'Áo sơ mi nam vải Oxford cotton 100% tay dài',
        'Quần jean nam denim cotton 98% slim fit',
        'Áo thun nam cotton 100% cổ tròn ngắn tay',
        'Quần kaki nam cotton dáng regular chino',
        'Áo polo nam cotton 100% cổ bẻ ngắn tay',
        'Quần short nam cotton twill 5 túi',
        'Bộ vest nam vải cotton pha linen 2 mảnh',
        'Áo khoác nam cotton 97% windbreaker',
        'Quần đùi thể thao nam cotton + spandex',
        'Áo sơ mi flannel nam cotton kẻ ô đỏ đen',
        'Quần cargo nam cotton 100% nhiều túi',
        'Áo hoodie nam cotton 80% + polyester 20%',
      ],
    },
  },
  {
    match: /women.*girls.*textile.*n\.e\.c|women.*not elsewhere.*textile/i,
    domain: {
      type: 'Quần áo nữ vải tổng hợp',
      items: [
        'Áo sơ mi nữ vải polyester 100% tay dài công sở',
        'Váy midi nữ vải viscose/rayon tơ nhân tạo',
        'Đầm nữ vải lụa polyester satin dài tay',
        'Áo blazer nữ vải polyester-rayon dáng suông',
        'Quần nữ vải crepe polyester 95% ống đứng',
        'Áo thun nữ polyester 100% đi thể thao UV',
        'Váy xòe nữ vải tulle tầng lớp dự tiệc',
        'Áo phao nữ vải polyester lining bông nhân tạo',
        'Bộ suit nữ vải polyester-rayon 2 mảnh',
        'Quần legging nữ vải nylon spandex 4 chiều',
      ],
    },
  },
  {
    match: /men.*boys.*textile.*n\.e\.c|men.*not elsewhere.*textile/i,
    domain: {
      type: 'Quần áo nam vải tổng hợp',
      items: [
        'Áo sơ mi nam vải polyester 100% tay dài',
        'Quần tây nam vải polyester-viscose ống đứng',
        'Áo blazer nam vải polyester blend 2 lớp',
        'Áo gió nam polyester ripstop nhẹ thoáng khí',
        'Quần nỉ nam polyester thể thao jogger',
        'Bộ thể thao nam polyester áo + quần dài',
        'Áo thun nam polyester dri-fit gym workout',
        'Áo khoác nam vải polyester padding lightweight',
        'Quần short nam polyester 100% bơi lội boardshort',
        'Áo hoodie nam polyester fleece dày dặn',
      ],
    },
  },

  // ══════════════════════════════════════════════════════════════
  // CH.29 — HÓA CHẤT HỮU CƠ
  // ══════════════════════════════════════════════════════════════
  {
    match: /acyclic.*without other oxygen|acyclic.*n\.e\.c/i,
    domain: {
      type: 'Hóa chất hữu cơ mạch hở',
      items: [
        'Methanol kỹ thuật CH3OH 99.9% thùng 200L',
        'Ethanol công nghiệp C2H5OH 99.5% thùng 200L',
        'Butanol n-Butanol 99.5% thùng 200L',
        'Acetone kỹ thuật 99.5% thùng 200L',
        'Isopropanol (IPA) 99.7% thùng 200L',
        'Hexane kỹ thuật (n-Hexane) 99% thùng 200L',
        'MEK (methyl ethyl ketone) 99.5% thùng 200L',
        'Ethyl acetate (EAc) 99.5% thùng 200L',
        'MIBK (methyl isobutyl ketone) 98% thùng 200L',
        'Cyclohexane 99% dung môi công nghiệp thùng 200L',
      ],
    },
  },

  // ══════════════════════════════════════════════════════════════
  // CH.03 / THỰC PHẨM / THỦY SẢN
  // ══════════════════════════════════════════════════════════════
  {
    match: /fish.*frozen|frozen.*fish|other than fillets/i,
    domain: {
      type: 'Cá đông lạnh',
      items: [
        'Cá tra fillet đông lạnh (IQF) 150-200g/piece VN',
        'Cá basa fillet đông lạnh (skin-on) 1kg block',
        'Cá ngừ vây vàng đông lạnh (loại thường)',
        'Cá thu (mackerel) đông lạnh nguyên con 300-500g',
        'Cá nục (round scad) đông lạnh nguyên con',
        'Cá hố (hairtail) đông lạnh nguyên con block 10kg',
        'Cá chép đông lạnh loại 500g-1kg',
        'Cá mú đông lạnh nguyên con 500g-1kg',
        'Cá bớp (cobia) đông lạnh fillet 200-300g',
        'Cá hồi (salmon) Atlantic fillet tươi sơ chế đông lạnh',
      ],
    },
  },
  {
    match: /crustaceans.*not frozen|shrimps.*prawns|shellfish/i,
    domain: {
      type: 'Tôm/giáp xác không đông lạnh',
      items: [
        'Tôm thẻ chân trắng sống (live white shrimp) 30-40 con/kg',
        'Tôm sú sống (black tiger shrimp) 10-12 con/kg',
        'Tôm hùm (lobster) sống 500g-800g/con',
        'Cua (swimming crab) sống 200-300g/con',
        'Ghẹ xanh (blue crab) sống 100-150g/con',
        'Tôm càng xanh (giant freshwater prawn) sống',
        'Tôm đất (banana shrimp) tươi 50-60 con/kg',
        'Cua đồng (rice field crab) tươi 100-150g',
      ],
    },
  },

  // ══════════════════════════════════════════════════════════════
  // CH.94 — NỘI THẤT
  // ══════════════════════════════════════════════════════════════
  {
    match: /seats.*wooden frames|chairs.*wooden|sofas.*wooden/i,
    domain: {
      type: 'Ghế/sofa khung gỗ',
      items: [
        'Ghế gỗ oak đơn giản nệm vải sofa 1 chỗ',
        'Bộ sofa gỗ thịt 3 + 1 + 1 chỗ nệm nhung',
        'Ghế ăn gỗ cao su (rubberwood) nệm vải',
        'Bộ bàn ăn 6 ghế gỗ sồi tự nhiên',
        'Ghế làm việc gỗ + đệm da màu nâu',
        'Ghế xích đu gỗ keo ngoài trời',
        'Bộ sofa góc L gỗ tự nhiên nệm cotton 4 chỗ',
        'Ghế phòng khách gỗ óc chó (walnut) hiện đại',
        'Bộ ghế salon tóc gỗ 3 chiếc',
        'Ghế ăn nhà hàng gỗ beech khung thép',
      ],
    },
  },
  {
    match: /furniture.*bedroom|beds.*furniture|mattresses/i,
    domain: {
      type: 'Nội thất phòng ngủ',
      items: [
        'Giường ngủ đôi gỗ công nghiệp MDF 1.6m',
        'Tủ quần áo 4 cánh gỗ MDF phủ melamine trắng',
        'Nệm lò xo Bonnell 1.6m×2m dày 20cm',
        'Nệm foam memory 160×200×25cm',
        'Bàn đầu giường (nightstand) gỗ công nghiệp 2 ngăn',
        'Bàn trang điểm gỗ MDF có gương 80×40×75cm',
        'Giường tầng trẻ em gỗ thông 90×190cm',
        'Đầu giường da (headboard) 1.8m màu xám',
        'Tủ đầu giường gỗ tự nhiên 1 ngăn kéo',
        'Bộ phòng ngủ 5 món: giường + tủ + bàn phấn',
      ],
    },
  },

  // ══════════════════════════════════════════════════════════════
  // CH.95 — ĐỒ CHƠI / THỂ THAO
  // ══════════════════════════════════════════════════════════════
  {
    match: /toys.*children|dolls.*toys|video games/i,
    domain: {
      type: 'Đồ chơi trẻ em',
      items: [
        'Xe đồ chơi điều khiển từ xa 4 bánh 2.4GHz',
        'Búp bê Barbie thời trang 30cm phụ kiện',
        'Bộ Lego xây dựng 500 mảnh ghép nhà',
        'Robot đồ chơi biến hình (transformer) 20cm',
        'Súng đồ chơi bắn nước ngoài trời 50cm',
        'Bộ đồ chơi bác sĩ 20 chi tiết nhựa ABS',
        'Xe đẩy đồ chơi cho bé 1-3 tuổi',
        'Khối gỗ xếp hình (wooden blocks) 60 chi tiết',
        'Thú nhồi bông gấu teddy bear 50cm',
        'Ô tô đồ chơi die-cast 1:43 kim loại',
        'Máy bay điều khiển từ xa (drone) trẻ em 360°',
        'Bộ bài (cards) trading card Pokemon',
      ],
    },
  },

  // ══════════════════════════════════════════════════════════════
  // CROSS-CHAPTER GENERIC PATTERNS
  // ══════════════════════════════════════════════════════════════
  {
    match: /parts and accessories.*machinery|parts.*accessories.*equipment/i,
    domain: {
      type: 'Bộ phận và phụ kiện máy móc',
      items: [
        'Bộ phận thay thế máy móc chuyên dụng',
        'Phụ kiện thiết bị sản xuất OEM',
        'Mô-đun điều khiển (control module) thiết bị',
        'Bộ dẫn động (drive assembly) máy công nghiệp',
        'Khung đỡ (bracket/frame) thiết bị thép không gỉ',
        'Bộ seal/gioăng đệm kín (seal kit) máy móc',
        'Màn hình hiển thị (display panel) thiết bị',
        'Bộ cảm biến (sensor assembly) máy móc',
        'Ổ đỡ (bearing housing) thiết bị quay',
        'Bơm dầu bôi trơn (lube pump) máy công nghiệp',
      ],
    },
  },
  {
    match: /parts thereof$|^parts thereof/i,
    domain: {
      type: 'Bộ phận thiết bị',
      items: [
        'Bộ phận thay thế thiết bị theo đặt hàng OEM',
        'Linh kiện lắp ráp (assembly component) chính hãng',
        'Cụm chi tiết gia công CNC inox',
        'Bộ phận nhựa kỹ thuật đúc phun (injection mold)',
        'Chi tiết đúc nhôm áp lực (die-cast aluminum)',
        'Bộ phận thép đã qua gia công nhiệt luyện',
        'Cụm lắp ráp đồng bộ (sub-assembly) thiết bị',
        'Bộ phận cao su kỹ thuật (rubber part) đặc chủng',
      ],
    },
  },

  // ══════════════════════════════════════════════════════════════
  // CH.87 ADDITIONAL DOMAINS
  // ══════════════════════════════════════════════════════════════
  {
    match: /with only electric motor for propulsion|electric.*motor.*propulsion/i,
    domain: {
      type: 'Xe ô tô điện (EV)',
      items: [
        'Xe ô tô điện 5 chỗ sedan pin 60kWh tầm 400km',
        'Xe ô tô điện SUV 7 chỗ pin 75kWh',
        'Xe ô tô điện mini hatchback 5 chỗ pin 30kWh',
        'Xe tải điện nhẹ 1 tấn pin LFP 100kWh',
        'Xe van điện 6 chỗ giao hàng pin 50kWh',
        'Xe ô tô điện crossover 5 chỗ 500km range',
        'Xe ô tô điện thể thao 2 chỗ pin solid-state',
        'Xe pickup bán tải điện 4WD pin 120kWh',
      ],
    },
  },
  {
    match: /n\.e\.c.*heading.*8701|tractors.*n\.e\.c/i,
    domain: {
      type: 'Máy kéo/đầu kéo',
      items: [
        'Đầu kéo xe tải (semi-truck tractor) 6×4 380HP Euro 4',
        'Đầu kéo 4×2 340HP cabin cao LNG/diesel',
        'Máy kéo nông nghiệp 75HP 4WD cabin',
        'Máy kéo 2 bánh (walking tractor) 12HP',
        'Đầu kéo rơ-mooc sân bay (airport tractor)',
        'Máy kéo vườn (garden tractor) 25HP cắt cỏ',
        'Đầu kéo cảng container (port terminal tractor)',
        'Máy kéo nhỏ đa năng (compact utility tractor) 45HP',
      ],
    },
  },
  {
    match: /spark.ignition.*reciprocating.*piston.*motorcycle|motorcycles.*spark.ignition/i,
    domain: {
      type: 'Xe mô tô',
      items: [
        'Xe mô tô 150cc 4 kỳ phun xăng điện tử',
        'Xe mô tô 200cc naked bike tay côn',
        'Xe mô tô 250cc dual sport off-road',
        'Xe mô tô 300cc naked sport ABS',
        'Xe mô tô 400cc cruiser kiểu Harley',
        'Xe mô tô côn tay 150cc dáng sport',
        'Xe mô tô adventure 250cc 21"/18" offroad',
        'Xe mô tô retro cafe racer 200cc',
      ],
    },
  },
  {
    match: /road wheels.*parts.*accessories|wheels.*tyres.*motor vehicles/i,
    domain: {
      type: 'Bánh xe ô tô và bộ phận',
      items: [
        'Mâm nhôm (alloy wheel) 17" 5×114.3 ô tô sedan',
        'Mâm thép dập 15" xe con 4 bulông',
        'Lốp xe (tyre) 205/55R16 91V xe con',
        'Lốp xe SUV 235/65R17 108T all-terrain',
        'Lốp xe tải 11R22.5 16PR radial',
        'Lốp xe máy 90/90-14 tubeless',
        'Căm (spoke) mâm thép xe máy 18" stainless',
        'Đai hơi (bead) lốp công nghiệp 8.25R20',
        'Cụm trục bánh (axle hub) xe tải 10 tấn',
        'Bu lông bánh xe (wheel bolt) M12×1.5 hex 17',
      ],
    },
  },
  {
    match: /bodies.*cabs.*motor vehicles|body.*cab.*truck/i,
    domain: {
      type: 'Thân/cabin xe ô tô',
      items: [
        'Cabin xe tải hạng nặng steel cab double-sleeper',
        'Cabin xe tải nhỏ (single cab) thép dập',
        'Thùng xe (truck body) tải cẩu hiệu nghiêng 5m',
        'Thùng đông lạnh (refrigerated body) 5 tấn polyurethane',
        'Thùng xe container 20ft dry van body',
        'Cabin xe đầu kéo high-roof aerodynamic',
        'Thùng xe ben (dump body) thép Hardox 10m3',
        'Thùng xe bồn (tank body) inox SS304 5000L',
      ],
    },
  },
  {
    match: /parts.*accessories.*bodies.*seat belt|parts.*body.*motor vehicle/i,
    domain: {
      type: 'Phụ kiện thân xe',
      items: [
        'Cánh cửa xe ô tô con phải trước OEM',
        'Nắp ca-pô (hood) xe sedan thép dập',
        'Kính chắn gió (windshield) xe con laminated',
        'Cản trước (front bumper) xe SUV PP plastic',
        'Đèn pha (headlamp) LED DRL xe con',
        'Tấm lót sàn (floor mat) PVC xe con 5 tấm',
        'Gương chiếu hậu ngoài (side mirror) có sưởi',
        'Đuôi xe (tailgate/trunk lid) xe sedan OEM',
        'Lưới tản nhiệt (grille) xe con chrome',
        'Bộ kép (door handle) ngoài xe con chrome',
      ],
    },
  },
  {
    match: /fitted with engines.*motor vehicles|engines.*tractors/i,
    domain: {
      type: 'Bộ phận động cơ xe cơ giới',
      items: [
        'Động cơ diesel xe tải 6 xi-lanh 250HP Euro 4 (lắp ráp)',
        'Hộp số tự động (automatic gearbox) 6AT xe con',
        'Hộp số sàn (manual gearbox) 5MT xe tải nhỏ',
        'Cầu sau (rear axle) xe tải 8 tấn',
        'Cầu trước (front axle) xe tải off-road',
        'Khớp nối truyền động (driveshaft) CV joint',
        'Bộ nhún (suspension assembly) MacPherson trước',
        'Hệ thống phanh ABS+EBD xe con',
        'Bơm trợ lực lái (power steering pump) xe tải',
        'Bộ tản nhiệt (radiator) xe tải 5 tấn nhôm',
      ],
    },
  },

  // ══════════════════════════════════════════════════════════════
  // CH.01-15 AGRICULTURAL / FOOD — basic fallback improvers
  // ══════════════════════════════════════════════════════════════
  {
    match: /horses.*asses.*mules|bovine.*animals|swine|sheep.*goats/i,
    domain: {
      type: 'Gia súc sống',
      items: [
        'Bò thịt giống Brahman sống 300-350kg/con nhập khẩu',
        'Bò sữa Holstein Friesian cái tơ 24 tháng tuổi',
        'Lợn thịt giống Landrace sống 100kg/con',
        'Dê thịt Boer sống 35-40kg/con',
        'Ngựa đua thuần chủng (thoroughbred) sống',
        'Trâu cày/kéo sống 350-400kg/con',
        'Cừu thịt sống Dorper 60kg/con',
        'Lợn nái giống F1 130kg/con nhập khẩu',
      ],
    },
  },
  {
    match: /poultry|chickens.*ducks.*geese|live poultry/i,
    domain: {
      type: 'Gia cầm sống',
      items: [
        'Gà thịt sống giống Ross 308 1 ngày tuổi',
        'Gà đẻ trứng sống giống Hy-Line Brown 16 tuần',
        'Vịt thịt sống giống Cherry Valley 1 ngày tuổi',
        'Ngan (muscovy duck) sống 1 ngày tuổi',
        'Gà tây (turkey) sống con giống',
        'Chim cút (quail) thịt sống 45-50 ngày',
        'Gà giống bố mẹ (PS) Ross 308 sống 17 tuần',
        'Vịt xiêm con giống 1 ngày tuổi nhập khẩu',
      ],
    },
  },
  {
    match: /meat.*bovine|beef.*frozen|meat.*swine|pork|poultry.*meat/i,
    domain: {
      type: 'Thịt đông lạnh',
      items: [
        'Thịt bò đông lạnh (beef) nạc vai block 20kg',
        'Thịt heo đông lạnh ba rọi (pork belly) block 20kg',
        'Thịt gà đông lạnh nguyên con 1.2-1.5kg IQF',
        'Thịt bò đông lạnh thăn ngoài (striploin) 4kg',
        'Gà ức (chicken breast) IQF đông lạnh 2kg',
        'Thịt heo vai đông lạnh (pork shoulder) block',
        'Thịt bê đông lạnh (veal) lưng 10kg',
        'Cánh gà (chicken wings) IQF đông lạnh 2kg',
      ],
    },
  },
  {
    match: /vegetables.*fresh.*chilled|onions.*garlic.*leeks|tomatoes/i,
    domain: {
      type: 'Rau quả tươi',
      items: [
        'Hành tây (onion) tươi loại 60-80mm 10kg/túi lưới',
        'Tỏi (garlic) khô nguyên củ loại 4-6cm 10kg',
        'Cà chua (tomato) tươi loại 1 100-120g/quả 5kg',
        'Ớt chuông (bell pepper) đỏ tươi 500g/hộp',
        'Bắp cải (cabbage) tươi loại 1 1-1.5kg/củ 10kg',
        'Khoai tây (potato) tươi loại 1 80-100g 10kg',
        'Gừng tươi (fresh ginger) có vỏ 1kg/túi lưới',
        'Cần tây (celery) tươi 1 bó 500g',
      ],
    },
  },

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
