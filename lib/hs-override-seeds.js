/**
 * Seed chuyên gia cho override mã HS 8 số — ưu tiên hơn auto-mine.
 * Sửa file này rồi chạy: npm run mine:declaration-overrides
 */

module.exports = {
  // --- Đã có từ phase 1.3 ---
  '85171300': {
    titleVi: 'Điện thoại di động thông minh',
    addRequired: ['screenSize', 'networkGeneration'],
    removeRequired: ['frequency', 'phaseCount'],
    noteVi: 'Smartphone — model, SIM, bộ nhớ, màn hình, 4G/5G',
  },
  '85171200': {
    titleVi: 'Điện thoại di động (feature phone)',
    addRequired: ['hasSim'],
    removeRequired: ['storageCapacity', 'screenSize', 'networkGeneration', 'frequency'],
    noteVi: 'Điện thoại phổ thông',
  },
  '84713000': {
    titleVi: 'Máy tính xách tay',
    addRequired: ['screenSize'],
    removeRequired: ['frequency', 'phaseCount', 'flowRate'],
    noteVi: 'Laptop — CPU/RAM/SSD + màn hình',
  },
  '84714100': {
    titleVi: 'Máy tính để bàn',
    removeRequired: ['screenSize', 'frequency'],
    noteVi: 'PC desktop',
  },
  '84137090': {
    titleVi: 'Bơm nước ly tâm loại khác',
    addRequired: ['headPressure'],
    noteVi: 'Bơm ly tâm — thêm cột áp',
  },
  '84138100': {
    titleVi: 'Bơm piston / thủy lực',
    addRequired: ['headPressure', 'pumpType'],
    noteVi: 'Bơm piston',
  },
  '84295200': {
    titleVi: 'Máy xúc đào bánh xích',
    addRequired: ['bucketCapacity', 'operatingWeight'],
    removeRequired: ['frequency', 'flowRate', 'voltage'],
    noteVi: 'Máy xúc — trọng lượng + gầu',
  },
  '61091000': {
    titleVi: 'Áo phông dệt kim',
    addRequired: ['garmentType', 'size'],
    noteVi: 'Áo thun — loại + size',
  },
  '62044200': {
    titleVi: 'Váy nữ dệt thoi',
    addRequired: ['garmentType'],
    noteVi: 'Váy/đầm nữ',
  },
  '39201090': {
    titleVi: 'Tấm nhựa PE loại khác',
    addRequired: ['thickness', 'dimensions'],
    noteVi: 'Tấm nhựa — độ dày + kích thước',
  },
  '39172300': {
    titleVi: 'Ống nhựa PVC cứng',
    addRequired: ['pipeDiameter', 'pressureRating'],
    noteVi: 'Ống PVC — DN + áp suất',
  },
  '33030010': {
    titleVi: 'Nước hoa',
    addRequired: ['volumeMl', 'fragranceType'],
    noteVi: 'Nước hoa — ml + hương',
  },
  '33049900': {
    titleVi: 'Mỹ phẩm loại khác',
    addRequired: ['volumeMl'],
    noteVi: 'Mỹ phẩm — dung tích',
  },
  '85015210': {
    titleVi: 'Động cơ điện AC >750W',
    addRequired: ['rpm', 'phaseCount'],
    removeRequired: ['hasSim', 'storageCapacity'],
    noteVi: 'Động cơ công nghiệp',
  },
  '85043119': {
    titleVi: 'Máy biến áp lực dầu',
    addRequired: ['voltagePrimary', 'voltageSecondary'],
    removeRequired: ['hasSim', 'flowRate'],
    noteVi: 'MBA',
  },
  '40111000': {
    titleVi: 'Lốp xe ô tô con mới',
    addRequired: ['tireSize', 'loadIndex', 'speedRating'],
    noteVi: 'Lốp xe',
  },

  // --- Top Oz-gold (chuyên gia) ---
  '39269099': {
    titleVi: 'Sản phẩm nhựa Loại khác (ốp điện thoại, phụ kiện…)',
    addRequired: ['application', 'polymerType', 'dimensions', 'modelNumber'],
    noteVi: 'Mã 39269099 — HQ hay hỏi lại nếu mô tả chung chung. Ghi rõ: loại nhựa, KT, model, công dụng gắn máy gì',
    ozPriority: 1,
  },
  '84812090': {
    titleVi: 'Van Loại khác (van điện từ…)',
    addRequired: ['valveType', 'material', 'pressureRating', 'voltage'],
    noteVi: 'Van — loại, vật liệu vỏ, áp suất, điện áp cuộn dây',
    ozPriority: 1,
  },
  '85044090': {
    titleVi: 'Máy biến áp/ngoại vi Loại khác (sạc xe điện…)',
    addRequired: ['power', 'voltage', 'outputVoltage', 'application'],
    removeRequired: ['hasSim', 'frequency'],
    noteVi: 'Bộ sạc/biến đổi — công suất, điện áp vào/ra, công dụng',
    ozPriority: 1,
  },
  '85371099': {
    titleVi: 'Bảng/tủ điều khiển Loại khác',
    addRequired: ['machineFunction', 'voltage', 'currentRating', 'modelNumber'],
    noteVi: 'Tủ điện — chức năng điều khiển gì, điện áp, dòng, model',
    ozPriority: 1,
  },
  '85444299': {
    titleVi: 'Dây/cáp Loại khác',
    addRequired: ['conductorMaterial', 'crossSection', 'voltage', 'connectivity'],
    noteVi: 'Cáp — lõi đồng/nhôm, tiết diện, điện áp, đầu nối (USB/RJ45…)',
    ozPriority: 1,
  },
  '84123100': {
    titleVi: 'Xi lanh khí nén',
    addRequired: ['boreDiameter', 'strokeLength', 'pressureRating', 'modelNumber'],
    removeRequired: ['flowRate', 'pumpType'],
    noteVi: 'Xi lanh — đường kính, hành trình, áp suất, model',
    ozPriority: 1,
  },
  '64029990': {
    titleVi: 'Giày dép Loại khác (dép nhựa…)',
    addRequired: ['upperMaterial', 'soleMaterial', 'targetGroup', 'size'],
    noteVi: 'Dép/sandal — chất liệu, đối tượng, size',
    ozPriority: 1,
  },
  '73269099': {
    titleVi: 'Sản phẩm sắt thép Loại khác',
    addRequired: ['steelGrade', 'form', 'dimensions', 'application'],
    noteVi: 'Thép — mác, dạng, kích thước, công dụng',
    ozPriority: 1,
  },
  '85044019': {
    titleVi: 'Củ sạc điện thoại/adaptor',
    addRequired: ['outputVoltage', 'power', 'connectivity', 'modelNumber'],
    removeRequired: ['frequency', 'phaseCount', 'hasSim'],
    noteVi: 'Sạc — điện áp ra, công suất, cổng (USB-C/Lightning), model',
    ozPriority: 1,
  },
  '40169390': {
    titleVi: 'Sản phẩm cao su Loại khác (gioăng, đệm…)',
    addRequired: ['rubberType', 'form', 'dimensions', 'application'],
    noteVi: 'Cao su — loại, dạng, kích thước, công dụng',
    ozPriority: 1,
  },
  '70072990': {
    titleVi: 'Kính an toàn/cường lực Loại khác',
    addRequired: ['glassType', 'dimensions', 'application', 'modelNumber'],
    noteVi: 'Kính dán/cường lực — loại, kích thước inch, dùng cho thiết bị gì, model',
    ozPriority: 1,
  },
  '90318090': {
    titleVi: 'Thiết bị đo/cảm biến Loại khác',
    addRequired: ['measurementType', 'principle', 'modelNumber', 'voltage'],
    noteVi: 'Cảm biến — đại lượng đo, nguyên lý, model, điện áp',
    ozPriority: 1,
  },
  '94054290': {
    titleVi: 'Đèn LED Loại khác',
    addRequired: ['power', 'voltage', 'lightType', 'application'],
    noteVi: 'Đèn — công suất, điện áp, LED, công dụng lắp đặt',
    ozPriority: 1,
  },
  '82081000': {
    titleVi: 'Dao/mũi khoan gia công kim loại',
    addRequired: ['toolType', 'bladeMaterial', 'dimensions', 'modelNumber'],
    noteVi: 'Dụng cụ cắt — loại, vật liệu lưỡi, kích thước, model',
    ozPriority: 1,
  },
  '90262090': {
    titleVi: 'Cảm biến áp suất Loại khác',
    addRequired: ['measurementType', 'pressureRating', 'modelNumber', 'voltage'],
    noteVi: 'Cảm biến áp — dải đo, model, điện áp',
    ozPriority: 1,
  },
  '84818099': {
    titleVi: 'Van/vòi Loại khác',
    addRequired: ['valveType', 'material', 'dimensions', 'application'],
    noteVi: 'Vòi/van — loại, vật liệu, kích thước',
    ozPriority: 2,
  },
  '85249100': {
    titleVi: 'Màn hình điện thoại (linh kiện)',
    addRequired: ['screenSize', 'panelType', 'modelNumber', 'application'],
    removeRequired: ['hasSim', 'storageCapacity', 'networkGeneration'],
    noteVi: 'Màn hình thay thế — inch, LCD/OLED, model tương thích',
    ozPriority: 2,
  },
  '90049090': {
    titleVi: 'Kính mắt thời trang',
    addRequired: ['dimensions', 'material', 'modelNumber', 'application'],
    addRecommended: ['targetGroup'],
    noteVi: 'Gọng kính — kích thước, vật liệu gọng, model, không phải kính thuốc/râm',
    ozPriority: 2,
  },
  '84099137': {
    titleVi: 'Piston động cơ xe máy',
    addRequired: ['engineDisplacement', 'dimensions', 'modelNumber', 'material'],
    removeRequired: ['hasSim', 'flowRate'],
    noteVi: 'Piston — dung tích xy lanh, đường kính, model, vật liệu',
    ozPriority: 2,
  },
};
