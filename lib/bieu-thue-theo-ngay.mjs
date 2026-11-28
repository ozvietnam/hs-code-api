/**
 * Biểu thuế theo ngày ký thông báo: TT 65/2017 áp dụng từ 01/01/2018, TT 31/2022 từ 01/12/2022.
 * Khớp 100% với 1.873 bản ghi có ngày trong kho (10/2026). Thông báo cuối 2021 vẫn là biểu 2017.
 */
export function bieuThueTheoNgay(issuedDate) {
  const d = String(issuedDate || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  if (d < '2018-01-01') return '2012';
  if (d < '2022-12-01') return '2017';
  return '2022';
}
