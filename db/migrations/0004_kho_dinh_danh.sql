-- 0004 — Kho định danh / Đồ thị hàng hoá theo hãng+model (OZV-1657 · PR1a — chế độ BÓNG, mặc định off).
-- Thiết kế: docs/design/2026-11-20-kho-dinh-danh-do-thi-hang-hoa.md mục 2–3.
-- Nối khoá chuẩn với kho_dap_an qua khoa_hang_model = <hang_chuan>::<model_rut_gon> (PR sau).
-- 5 bảng chỉ-thêm; loai_nut / loai_canh là dữ liệu — thêm loại mới KHÔNG cần ALTER.
-- Luật migration: CHỈ THÊM + idempotent (IF NOT EXISTS), không sửa bảng cũ.

-- 1. Nút đồ thị
CREATE TABLE IF NOT EXISTS dd_nut (
  nut_id bigserial PRIMARY KEY,
  loai_nut varchar(32) NOT NULL,
  khoa_chuan varchar(200) NOT NULL,
  ten_hien_thi text NOT NULL,
  chuong_ung_vien char(2),
  thuoc_tinh_nhanh jsonb NOT NULL DEFAULT '{}'::jsonb,
  muc_kiem_chung varchar(16) NOT NULL DEFAULT 'HYPOTHESIS',
  nguoi_xac_nhan varchar(80),
  tao_luc timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc timestamptz NOT NULL DEFAULT now(),
  UNIQUE (loai_nut, khoa_chuan)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dd_nut_loai_khoa ON dd_nut (loai_nut, khoa_chuan);

-- 2. Bí danh (cách viết khác)
CREATE TABLE IF NOT EXISTS dd_bi_danh (
  bi_danh_id bigserial PRIMARY KEY,
  nut_id bigint NOT NULL REFERENCES dd_nut (nut_id),
  loai_nut varchar(32) NOT NULL,
  cach_viet_goc text NOT NULL,
  bi_danh_chuan varchar(200) NOT NULL,
  bi_danh_rut_gon varchar(200) NOT NULL,
  ngon_ngu varchar(8),
  UNIQUE (loai_nut, bi_danh_chuan, nut_id)
);

CREATE INDEX IF NOT EXISTS idx_dd_bi_danh_tra_nhanh ON dd_bi_danh (loai_nut, bi_danh_rut_gon);

-- 3. Nguồn & con trỏ MinIO
CREATE TABLE IF NOT EXISTS dd_nguon (
  nguon_id bigserial PRIMARY KEY,
  url_chuan text NOT NULL,
  url_goc text NOT NULL,
  ten_mien varchar(120) NOT NULL,
  loai_nguon varchar(24) NOT NULL,
  do_tin smallint NOT NULL CHECK (do_tin BETWEEN 1 AND 4),
  http_status smallint,
  ma_bam_noi_dung char(64),
  duong_dan_minio text,
  trich_doan_luu text,
  lan_cuoi_mo timestamptz
);

-- 4. Dữ kiện (thông số kỹ thuật — 1 dòng / 1 thông số)
CREATE TABLE IF NOT EXISTS dd_du_kien (
  du_kien_id bigserial PRIMARY KEY,
  nut_id bigint NOT NULL REFERENCES dd_nut (nut_id),
  ten_chuan varchar(64) NOT NULL,
  gia_tri_chu text NOT NULL,
  gia_tri_so double precision,
  don_vi varchar(32),
  nguon_id bigint REFERENCES dd_nguon (nguon_id),
  trich_doan text,
  muc_kiem_chung varchar(16) NOT NULL,
  nguoi_xac_nhan varchar(80),
  trang_thai_mau_thuan varchar(16) NOT NULL DEFAULT 'THONG_NHAT',
  ngay_thu_thap timestamptz,
  han_dung timestamptz
);

CREATE INDEX IF NOT EXISTS idx_dd_du_kien_nut_ten ON dd_du_kien (nut_id, ten_chuan, muc_kiem_chung);

-- 5. Cạnh quan hệ
CREATE TABLE IF NOT EXISTS dd_canh (
  canh_id bigserial PRIMARY KEY,
  tu_nut_id bigint NOT NULL REFERENCES dd_nut (nut_id),
  loai_canh varchar(40) NOT NULL,
  den_nut_id bigint NOT NULL REFERENCES dd_nut (nut_id),
  thuoc_tinh_canh jsonb NOT NULL DEFAULT '{}'::jsonb,
  nguon_id bigint REFERENCES dd_nguon (nguon_id),
  muc_kiem_chung varchar(16) NOT NULL DEFAULT 'HYPOTHESIS',
  nguoi_xac_nhan varchar(80),
  ngay_thu_thap timestamptz,
  han_dung timestamptz
);

-- UNIQUE biểu thức (COALESCE) — không ghi trong CREATE TABLE.
CREATE UNIQUE INDEX IF NOT EXISTS idx_dd_canh_unique
  ON dd_canh (tu_nut_id, loai_canh, den_nut_id, (COALESCE(nguon_id, 0)));
CREATE INDEX IF NOT EXISTS idx_dd_canh_tu ON dd_canh (tu_nut_id, loai_canh);
CREATE INDEX IF NOT EXISTS idx_dd_canh_den ON dd_canh (den_nut_id, loai_canh);
