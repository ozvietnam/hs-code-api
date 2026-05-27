function composeCustomsDescription(declaration) {
  if (!declaration) return '';
  const parts = [];
  if (declaration.tenHang) parts.push(declaration.tenHang);
  if (declaration.nhanHieu && declaration.nhanHieu !== 'N/A') {
    parts.push(`nhãn hiệu ${declaration.nhanHieu}`);
  }
  if (declaration.model) parts.push(`model ${declaration.model}`);
  if (declaration.thanhPhanCauTao) parts.push(`thành phần: ${declaration.thanhPhanCauTao}`);
  if (Array.isArray(declaration.thongSoKyThuat) && declaration.thongSoKyThuat.length) {
    parts.push(`thông số: ${declaration.thongSoKyThuat.join('; ')}`);
  }
  if (declaration.congDung) parts.push(`công dụng: ${declaration.congDung}`);
  if (declaration.quyCach) parts.push(`quy cách: ${declaration.quyCach}`);
  if (declaration.xuatXu?.nameVi) {
    parts.push(`xuất xứ ${declaration.xuatXu.nameVi}`);
  }
  if (declaration.tinhTrang) parts.push(`tình trạng: ${declaration.tinhTrang}`);
  return parts.join('; ').replace(/\s+/g, ' ').trim();
}

module.exports = { composeCustomsDescription };
