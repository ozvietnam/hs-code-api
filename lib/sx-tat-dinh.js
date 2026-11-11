/**
 * So sánh chuỗi TẤT ĐỊNH để sắp dữ liệu GHI RA TỆP (OZV-373).
 *
 * VÌ SAO: `String.prototype.localeCompare` phụ thuộc bản ICU của máy chạy. Node dựng `small-icu`
 * (hoặc không ICU) so thô theo mã đơn vị UTF-16, còn Node có ICU đầy đủ áp luật sắp chữ của locale —
 * trong đó `~` bị coi như dấu nối và BỊ BỎ QUA ở mức so sánh đầu. Hai máy khác ICU vì thế sinh ra hai
 * thứ tự khác nhau cho cùng một tập id, nên:
 *   1. phép soát "tính lại rồi so byte" (cách duy nhất chứng minh sổ tay trong PR không mồ côi,
 *      quy tắc 5) báo lệch GIẢ ở mọi nhóm có nút ảo tầng-không-mã `<pn6>~r<dòng>`;
 *   2. `git diff` nhiễu vô cớ: cùng dữ liệu, cùng lệnh `--ap-dung`, hai commit khác byte.
 *
 * Phát hiện khi soát PR #1230 (lô L30): `data/so-tay/8703.json` + `8708.json` cùng tập hợp, 0 nút khác
 * nội dung, chỉ khác THỨ TỰ. Mầm lỗi có từ `cd3f10e2` (#619) — commit thêm nút ảo `~r`.
 *
 * CÁCH SO: thay `~` bằng `\x00` (mã nhỏ hơn mọi chữ số) rồi so thô theo mã đơn vị. Vì sao không so thô
 * nguyên bản: `~` (U+007E) LỚN hơn chữ số, nên so thô nguyên sẽ đảo thứ tự `~r` so với mọi bản sổ tay +
 * băm `duyet.bam` đã commit, làm 4 bản DUYET (271012, 840991, 850110, 854442) báo `cong0-sua-sau-duyet`
 * giả. Khoá `~`→`\x00` cho thứ tự TRÙNG KHỚP ICU đầy đủ trên toàn bộ 12.774 chuỗi mã/id thật trong
 * `data/ho-so/ranh-gioi/` + `data/so-tay/` (đo 0 cặp lệch), nên vừa tất định vừa không phá dữ liệu cũ.
 *
 * PHẠM VI: chỉ dùng cho chuỗi MÃ/ID (chữ số + `~r`). KHÔNG dùng cho câu chữ tiếng Việt hiển thị cho
 * người đọc — sắp chữ Việt cần luật locale thật; chỗ đó giữ `localeCompare`.
 */

/** Khoá sắp: `~` → `\x00` để nó đứng trước chữ số, khớp cách ICU đầy đủ bỏ qua dấu nối. */
const khoaSx = (s) => String(s ?? '').replace(/~/g, '\x00');

/** So sánh tất định hai chuỗi mã/id (không phụ thuộc ICU/locale của máy). */
function sxTho(a, b) {
  const x = khoaSx(a);
  const y = khoaSx(b);
  return x < y ? -1 : x > y ? 1 : 0;
}

/** Bộ so sánh tất định theo một khoá rút từ phần tử: `arr.sort(sxTheo((m) => m.id))`. */
const sxTheo = (lay) => (a, b) => sxTho(lay(a), lay(b));

module.exports = { sxTho, sxTheo, khoaSx };
