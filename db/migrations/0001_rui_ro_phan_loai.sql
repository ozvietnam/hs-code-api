-- 0001 — Danh mục rủi ro phân loại QĐ 2079/QĐ-TCHQ (L0g, #545).
-- Bản bên thứ ba đăng, bậc C, theo AHTN 2017. TÍN HIỆU NỘI BỘ để soát — KHÔNG phải căn cứ pháp lý,
-- không bao giờ trả cho lượt công khai / khoá cong-oz (lib/rui-ro-phan-loai.js + lib/auth.js#laNoiBoOz).
-- Dữ liệu nạp bằng scripts/nap-qd2079.mjs từ tệp riêng ngoài git; bảng này không có trong repo.
-- Luật migration: CHỈ THÊM + idempotent (IF NOT EXISTS). Không xoá bảng/cột, không xoá dữ liệu.

CREATE TABLE IF NOT EXISTS schema_migrations (
  ten text PRIMARY KEY,
  chay_luc timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rui_ro_phan_loai (
  id bigserial PRIMARY KEY,
  nguon text NOT NULL DEFAULT 'QD-2079-TCHQ',
  bac text NOT NULL DEFAULT 'C',
  phien_ban_danh_muc text NOT NULL DEFAULT 'AHTN2017',
  ma_a text NOT NULL CHECK (ma_a ~ '^[0-9]{4,8}$'),
  ma_b text NOT NULL CHECK (ma_b ~ '^[0-9]{4,8}$'),
  ten_hang text,
  ghi_chu text,
  sha256_tep text NOT NULL,
  nap_luc timestamptz NOT NULL DEFAULT now(),
  UNIQUE (nguon, ma_a, ma_b)
);

CREATE INDEX IF NOT EXISTS rui_ro_ma_a_idx ON rui_ro_phan_loai (ma_a);
CREATE INDEX IF NOT EXISTS rui_ro_ma_b_idx ON rui_ro_phan_loai (ma_b);
