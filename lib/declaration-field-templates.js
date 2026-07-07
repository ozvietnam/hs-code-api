/**
 * Template phân nhóm 4 số — nguồn chuyên gia khai báo ECUS.
 * Build script gộp vào data/heading-declaration-fields.json.
 */

const TEMPLATES = {
  perfume: {
    required: ['fragranceType', 'dosageForm', 'volumeMl'],
    recommended: ['activeIngredient'],
    noteVi: 'Nước hoa/tinh dầu — ghi hương, dạng (xịt/EDP/EDT), dung tích ml',
  },
  cosmetic: {
    required: ['cosmeticFunction', 'dosageForm', 'activeIngredient'],
    recommended: ['volumeMl'],
    noteVi: 'Mỹ phẩm — công dụng cụ thể, dạng bào chế, hoạt chất chính',
  },
  hygiene: {
    required: ['dosageForm', 'activeIngredient'],
    recommended: ['targetGroup'],
    noteVi: 'Chế phẩm vệ sinh cá nhân — dạng và thành phần hoạt chất',
  },
  soapDetergent: {
    required: ['dosageForm', 'activeIngredient', 'form'],
    recommended: [],
    noteVi: 'Xà phòng/chất tẩy — dạng (bột/lỏng/thanh), thành phần surfactant/enzyme',
  },
  lubricant: {
    required: ['viscosityGrade', 'dosageForm', 'baseOilType'],
    recommended: ['volumeMl'],
    noteVi: 'Dầu bôi trơn — độ nhớt SAE/ISO, dạng, loại dầu gốc',
  },
  waxPolish: {
    required: ['dosageForm', 'applicationSurface'],
    recommended: ['activeIngredient'],
    noteVi: 'Sáp/đánh bóng — dạng và bề mặt dùng (da/gỗ/kim loại)',
  },
  polymerPrimary: {
    required: ['polymerType', 'form', 'meltIndex'],
    recommended: ['color'],
    noteVi: 'Nhựa nguyên sinh — loại polymer, dạng (hạt/bột), chỉ số nóng chảy nếu có',
  },
  polymerProduct: {
    required: ['polymerType', 'form', 'dimensions'],
    recommended: ['thickness'],
    noteVi: 'Sản phẩm nhựa — loại nhựa, dạng (tấm/ống/phim), kích thước/độ dày',
  },
  rubberPrimary: {
    required: ['rubberType', 'form'],
    recommended: ['moisturePercent'],
    noteVi: 'Cao su nguyên liệu — thiên nhiên/tổng hợp, dạng (tấm/hạt/mủ)',
  },
  tire: {
    required: ['tireSize', 'rubberType', 'plyRating'],
    recommended: ['brand', 'modelNumber'],
    noteVi: 'Lốp xe — quy cách (205/55R16), loại cao su, số lớp bố',
  },
  rubberProduct: {
    required: ['rubberType', 'form', 'application'],
    recommended: [],
    noteVi: 'Sản phẩm cao su — loại, dạng, công dụng (gioăng/ống/đế)',
  },
  knitGarment: {
    required: ['fiberContent', 'constructionType', 'targetGroup', 'garmentType'],
    recommended: ['size'],
    noteVi: 'Hàng dệt kim — % sợi, dệt kim, nam/nữ/trẻ em, loại (áo/quần/bộ)',
  },
  wovenGarment: {
    required: ['fiberContent', 'constructionType', 'targetGroup', 'garmentType'],
    recommended: ['size'],
    noteVi: 'Hàng dệt thoi — % sợi, dệt thoi, đối tượng, loại trang phục',
  },
  textileArticle: {
    required: ['fiberContent', 'constructionType', 'articleType'],
    recommended: ['dimensions'],
    noteVi: 'Hàng vải khác — % sợi, cấu trúc, loại (chăn/rèm/túi/bạt)',
  },
  engineCombustion: {
    required: ['engineDisplacement', 'power', 'cylinderCount', 'fuelType'],
    recommended: ['modelNumber'],
    noteVi: 'Động cơ đốt trong — dung tích xi lanh, công suất, số xy lanh, nhiên liệu',
  },
  pump: {
    required: ['power', 'voltage', 'flowRate', 'pumpType'],
    recommended: ['modelNumber', 'headPressure'],
    noteVi: 'Bơm — công suất, điện áp, lưu lượng (m³/h hoặc L/min), loại bơm',
  },
  compressor: {
    required: ['power', 'voltage', 'flowRate', 'pressureRating'],
    recommended: ['modelNumber'],
    noteVi: 'Máy nén — công suất, điện áp, lưu lượng khí, áp suất làm việc',
  },
  refrigeration: {
    required: ['coolingCapacity', 'voltage', 'refrigerant'],
    recommended: ['power', 'modelNumber'],
    noteVi: 'Máy lạnh/tủ lạnh — công suất lạnh (BTU/HP), điện áp, môi chất lạnh',
  },
  lifting: {
    required: ['liftCapacity', 'power', 'voltage', 'liftHeight'],
    recommended: ['modelNumber'],
    noteVi: 'Thiết bị nâng — tải trọng nâng, công suất, điện áp, chiều cao nâng',
  },
  excavator: {
    required: ['operatingWeight', 'bucketCapacity', 'power', 'modelNumber'],
    recommended: ['voltage'],
    noteVi: 'Máy xúc/đào — trọng lượng vận hành, dung tích gầu, công suất động cơ',
  },
  agriculturalMachine: {
    required: ['power', 'workingWidth', 'machineFunction'],
    recommended: ['modelNumber', 'voltage'],
    noteVi: 'Máy nông nghiệp — công suất, chiều rộng làm việc, chức năng (cày/gặt)',
  },
  machineTool: {
    required: ['spindlePower', 'controlType', 'voltage'],
    recommended: ['modelNumber', 'tableSize'],
    noteVi: 'Máy gia công — công suất trục chính, CNC/thủ công, điện áp',
  },
  computer: {
    required: ['cpuModel', 'ramCapacity', 'storageCapacity', 'modelNumber'],
    recommended: ['screenSize', 'voltage'],
    noteVi: 'Máy tính — CPU, RAM, ổ cứng/SSD, model; không bắt buộc tần số lưới',
  },
  printer: {
    required: ['printTechnology', 'modelNumber', 'voltage'],
    recommended: ['printSpeed'],
    noteVi: 'Máy in — công nghệ (laser/phun/offset), model, điện áp',
  },
  motor: {
    required: ['power', 'voltage', 'rpm', 'phaseCount'],
    recommended: ['modelNumber', 'frequency'],
    noteVi: 'Động cơ điện — công suất, điện áp, vòng/phút, 1/3 pha',
  },
  transformer: {
    required: ['power', 'voltagePrimary', 'voltageSecondary', 'frequency'],
    recommended: ['modelNumber'],
    noteVi: 'Máy biến áp — công suất kVA, điện áp đầu vào/ra, tần số',
  },
  battery: {
    required: ['voltage', 'capacityAh', 'batteryChemistry'],
    recommended: ['modelNumber'],
    noteVi: 'Pin/ắc quy — điện áp, dung lượng Ah, loại (Li-ion/ắc quy chì)',
  },
  telecom: {
    required: ['modelNumber', 'hasSim', 'storageCapacity', 'networkGeneration'],
    recommended: ['screenSize', 'voltage'],
    noteVi: 'Điện thoại/thiết bị viễn thông — model, SIM, bộ nhớ, 4G/5G',
  },
  audioVideo: {
    required: ['modelNumber', 'power', 'voltage'],
    recommended: ['connectivity'],
    noteVi: 'Thiết bị âm thanh — model, công suất, điện áp',
  },
  display: {
    required: ['screenSize', 'resolution', 'modelNumber', 'voltage'],
    recommended: ['panelType'],
    noteVi: 'Màn hình/TV — kích thước inch, độ phân giải, model',
  },
  semiconductor: {
    required: ['partNumber', 'function', 'packageType'],
    recommended: ['voltage'],
    noteVi: 'Linh kiện bán dẫn — mã part, chức năng, kiểu đóng gói',
  },
  switchgear: {
    required: ['voltage', 'currentRating', 'poleCount'],
    recommended: ['modelNumber'],
    noteVi: 'Thiết bị đóng cắt — điện áp, dòng định mức, số cực',
  },
  appliance: {
    required: ['power', 'voltage', 'applianceFunction'],
    recommended: ['modelNumber', 'frequency'],
    noteVi: 'Thiết bị gia dụng điện — công suất, điện áp, chức năng',
  },
  machineryGeneric: {
    required: ['machineFunction', 'power', 'voltage'],
    recommended: ['modelNumber', 'frequency'],
    noteVi: 'Máy móc chung — chức năng chính, công suất, điện áp',
  },
  footwear: {
    required: ['upperMaterial', 'soleMaterial', 'targetGroup', 'size'],
    recommended: ['modelNumber'],
    noteVi: 'Giày dép — chất liệu mũi/đế, nam/nữ/trẻ em, size',
  },
  glassProduct: {
    required: ['glassType', 'dimensions', 'application'],
    recommended: ['modelNumber'],
    noteVi: 'Thủy tinh — loại (cường lực/dán), kích thước, công dụng',
  },
  steelArticle: {
    required: ['steelGrade', 'form', 'dimensions', 'application'],
    recommended: ['modelNumber'],
    noteVi: 'Sắt thép — mác thép, dạng, kích thước, công dụng',
  },
  handTool: {
    required: ['toolType', 'bladeMaterial', 'dimensions'],
    recommended: ['modelNumber'],
    noteVi: 'Dụng cụ cầm tay — loại dao/khoan, vật liệu lưỡi, kích thước',
  },
  sensorInstrument: {
    required: ['measurementType', 'principle', 'modelNumber', 'voltage'],
    recommended: ['dimensions'],
    noteVi: 'Thiết bị đo/cảm biến — đại lượng đo, nguyên lý, model, điện áp',
  },
  lighting: {
    required: ['power', 'voltage', 'lightType', 'application'],
    recommended: ['modelNumber', 'dimensions'],
    noteVi: 'Đèn — công suất, điện áp, loại LED/compact, công dụng',
  },
  cableWire: {
    required: ['conductorMaterial', 'crossSection', 'voltage', 'cableLength'],
    recommended: ['modelNumber', 'connectivity'],
    noteVi: 'Dây/cáp — vật liệu lõi, tiết diện, điện áp, chiều dài',
  },
  controlPanel: {
    required: ['voltage', 'currentRating', 'machineFunction', 'modelNumber'],
    recommended: ['dimensions'],
    noteVi: 'Tủ/bảng điện — điện áp, dòng, chức năng điều khiển, model',
  },
  valve: {
    required: ['valveType', 'material', 'pressureRating', 'dimensions'],
    recommended: ['modelNumber', 'voltage'],
    noteVi: 'Van — loại van, vật liệu, áp suất, kích thước danh nghĩa',
  },
  pneumaticCylinder: {
    required: ['boreDiameter', 'strokeLength', 'pressureRating', 'modelNumber'],
    recommended: ['material'],
    noteVi: 'Xi lanh khí — đường kính xy lanh, hành trình, áp suất làm việc',
  },
  powerSupply: {
    required: ['power', 'voltage', 'outputVoltage', 'modelNumber'],
    recommended: ['connectivity'],
    noteVi: 'Nguồn/sạc — công suất, điện áp vào/ra, model',
  },
  loaiKhacArticle: {
    required: ['application', 'material', 'dimensions', 'modelNumber'],
    recommended: ['form'],
    noteVi: 'Mã Loại khác — mô tả cụ thể công dụng + vật liệu + kích thước + model (CV 5189/755)',
  },
};

/** heading 4 số → template id */
const HEADING_MAP = {
  // Ch 33
  '3301': 'perfume',
  '3302': 'perfume',
  '3303': 'perfume',
  '3304': 'cosmetic',
  '3305': 'hygiene',
  '3306': 'hygiene',
  '3307': 'hygiene',
  // Ch 34
  '3401': 'soapDetergent',
  '3402': 'soapDetergent',
  '3403': 'lubricant',
  '3404': 'waxPolish',
  '3405': 'waxPolish',
  '3406': 'waxPolish',
  '3407': 'soapDetergent',
  // Ch 39 — polymer primary 3901-3914, products 3915-3926
  '3901': 'polymerPrimary',
  '3902': 'polymerPrimary',
  '3903': 'polymerPrimary',
  '3904': 'polymerPrimary',
  '3905': 'polymerPrimary',
  '3906': 'polymerPrimary',
  '3907': 'polymerPrimary',
  '3908': 'polymerPrimary',
  '3909': 'polymerPrimary',
  '3910': 'polymerPrimary',
  '3911': 'polymerPrimary',
  '3912': 'polymerPrimary',
  '3913': 'polymerPrimary',
  '3914': 'polymerPrimary',
  '3915': 'polymerProduct',
  '3916': 'polymerProduct',
  '3917': 'polymerProduct',
  '3918': 'polymerProduct',
  '3919': 'polymerProduct',
  '3920': 'polymerProduct',
  '3921': 'polymerProduct',
  '3922': 'polymerProduct',
  '3923': 'polymerProduct',
  '3924': 'polymerProduct',
  '3925': 'polymerProduct',
  '3926': 'polymerProduct',
  // Ch 40
  '4001': 'rubberPrimary',
  '4002': 'rubberPrimary',
  '4003': 'rubberPrimary',
  '4004': 'rubberPrimary',
  '4005': 'rubberPrimary',
  '4006': 'rubberProduct',
  '4007': 'rubberProduct',
  '4008': 'rubberProduct',
  '4009': 'rubberProduct',
  '4010': 'rubberProduct',
  '4011': 'tire',
  '4012': 'tire',
  '4013': 'tire',
  '4014': 'rubberProduct',
  '4015': 'rubberProduct',
  '4016': 'rubberProduct',
  '4017': 'rubberProduct',
  // Ch 61 — all knit
  '6101': 'knitGarment',
  '6102': 'knitGarment',
  '6103': 'knitGarment',
  '6104': 'knitGarment',
  '6105': 'knitGarment',
  '6106': 'knitGarment',
  '6107': 'knitGarment',
  '6108': 'knitGarment',
  '6109': 'knitGarment',
  '6110': 'knitGarment',
  '6111': 'knitGarment',
  '6112': 'knitGarment',
  '6113': 'knitGarment',
  '6114': 'knitGarment',
  '6115': 'knitGarment',
  '6116': 'knitGarment',
  '6117': 'knitGarment',
  // Ch 62 — all woven
  '6201': 'wovenGarment',
  '6202': 'wovenGarment',
  '6203': 'wovenGarment',
  '6204': 'wovenGarment',
  '6205': 'wovenGarment',
  '6206': 'wovenGarment',
  '6207': 'wovenGarment',
  '6208': 'wovenGarment',
  '6209': 'wovenGarment',
  '6210': 'wovenGarment',
  '6211': 'wovenGarment',
  '6212': 'wovenGarment',
  '6213': 'wovenGarment',
  '6214': 'wovenGarment',
  '6215': 'wovenGarment',
  '6216': 'wovenGarment',
  '6217': 'wovenGarment',
  // Ch 63
  '6301': 'textileArticle',
  '6302': 'textileArticle',
  '6303': 'textileArticle',
  '6304': 'textileArticle',
  '6305': 'textileArticle',
  '6306': 'textileArticle',
  '6307': 'textileArticle',
  '6308': 'textileArticle',
  '6309': 'textileArticle',
  '6310': 'textileArticle',
};

function assignCh84Heading(h) {
  const n = parseInt(h, 10);
  if (n === 8408) return 'engineCombustion';
  if (n >= 8410 && n <= 8412) return 'pneumaticCylinder';
  if (n === 8413) return 'pump';
  if (n === 8414) return 'compressor';
  if (n === 8415) return 'refrigeration';
  if (n === 8418) return 'refrigeration';
  if (n >= 8425 && n <= 8428) return 'lifting';
  if (n === 8429) return 'excavator';
  if (n >= 8430 && n <= 8438) return 'agriculturalMachine';
  if (n === 8443) return 'printer';
  if (n >= 8456 && n <= 8466) return 'machineTool';
  if (n >= 8470 && n <= 8472) return 'computer';
  if (n === 8481 || n === 8482) return 'valve';
  if (n === 8483) return 'machineryGeneric';
  return 'machineryGeneric';
}

function assignCh85Heading(h) {
  const n = parseInt(h, 10);
  if (n >= 8501 && n <= 8502) return 'motor';
  if (n === 8504) return 'transformer';
  if (n >= 8506 && n <= 8507) return 'battery';
  if (n === 8516) return 'appliance';
  if (n === 8517) return 'telecom';
  if (n >= 8518 && n <= 8522) return 'audioVideo';
  if (n >= 8525 && n <= 8529) return 'display';
  if (n === 8537 || n === 8538) return 'controlPanel';
  if (n === 8536) return 'switchgear';
  if (n >= 8541 && n <= 8542) return 'semiconductor';
  if (n === 8543 || n === 8544) return n === 8544 ? 'cableWire' : 'powerSupply';
  return 'machineryGeneric';
}

const CHAPTER_TEMPLATE = {
  '64': 'footwear',
  '70': 'glassProduct',
  '73': 'steelArticle',
  '82': 'handTool',
  '90': 'sensorInstrument',
  '94': 'lighting',
};

function resolveTemplateId(heading) {
  if (HEADING_MAP[heading]) return HEADING_MAP[heading];
  const ch = heading.slice(0, 2);
  if (ch === '84') return assignCh84Heading(heading);
  if (ch === '85') return assignCh85Heading(heading);
  if (CHAPTER_TEMPLATE[ch]) return CHAPTER_TEMPLATE[ch];
  // Nhóm Loại khác nhựa 3926
  if (heading.startsWith('3926')) return 'loaiKhacArticle';
  return null;
}

module.exports = {
  TEMPLATES,
  HEADING_MAP,
  CHAPTER_TEMPLATE,
  resolveTemplateId,
  assignCh84Heading,
  assignCh85Heading,
};
