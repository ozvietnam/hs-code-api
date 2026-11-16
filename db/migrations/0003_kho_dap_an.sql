-- 0003 — Kho đáp án khép vòng ("cuốn sổ thứ tư", G5 · OZV-760, PR 1a — chế độ BÓNG).
-- Thiết kế: docs/design/2026-11-14-kho-dap-an-khep-vong.md mục 2.
-- Hai khoá TÁCH CỨNG:
--   khoa_dap_an  — sha256 của mô tả hàng ĐÃ LỌC RIÊNG TƯ gồm cả thông số + dữ kiện quyết định + tier
--                  (cùng tên khác thông số ⇒ khác khoá ⇒ không bao giờ dùng lại đáp án của món kia);
--   khoa_du_kien — sha256 của {tên, thương hiệu, model}: CHỈ để lấy lại dữ kiện web, KHÔNG để trả mã.
-- Bảng KHÔNG lưu tên hàng gốc, số tờ khai, hoá đơn, đơn giá, số lượng, bằng chứng nguyên văn của khách.
-- Luật migration: CHỈ THÊM + idempotent (IF NOT EXISTS), không sửa bảng cũ.

CREATE TABLE IF NOT EXISTS kho_dap_an (
  khoa_dap_an char(64) PRIMARY KEY CHECK (khoa_dap_an ~ '^[0-9a-f]{64}$'),
  khoa_du_kien char(64) NOT NULL CHECK (khoa_du_kien ~ '^[0-9a-f]{64}$'),
  khoa_hang_model varchar(160),
  tier varchar(16) NOT NULL DEFAULT 'standard',
  ten_chuan_vi text,
  ten_zh_chuan text,
  thong_so_chuan text,
  vec_e5 real[],
  du_kien jsonb NOT NULL DEFAULT '[]'::jsonb,
  du_kien_quyet_dinh jsonb NOT NULL DEFAULT '{}'::jsonb,
  ma_hs varchar(8) CHECK (ma_hs IS NULL OR ma_hs ~ '^[0-9]{6}([0-9]{2})?$'),
  cap_da_chac smallint CHECK (cap_da_chac IS NULL OR cap_da_chac IN (6, 8)),
  muc_chac varchar(20),
  phan_hoi_chuan jsonb,
  can_cu jsonb NOT NULL DEFAULT '{}'::jsonb,
  phien_ban_bieu varchar(20) NOT NULL,
  hash_so_tay char(16),
  trang_thai varchar(16) NOT NULL DEFAULT 'NHAP'
    CHECK (trang_thai IN ('CHI_DU_KIEN', 'NHAP', 'CHO_CHAM', 'DUYET')),
  mo_hinh_cham varchar(80),
  ngay_cham timestamptz,
  mau_thuan jsonb NOT NULL DEFAULT '[]'::jsonb,
  so_lan_gap integer NOT NULL DEFAULT 1,
  han_xem_lai timestamptz,
  tao_luc timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc timestamptz NOT NULL DEFAULT now(),
  -- CHI_DU_KIEN thì chưa có mã; các trạng thái khác bắt buộc có mã + cấp chắc.
  CHECK ((trang_thai = 'CHI_DU_KIEN' AND ma_hs IS NULL) OR (trang_thai <> 'CHI_DU_KIEN' AND ma_hs IS NOT NULL AND cap_da_chac IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS kho_dap_an_khoa_du_kien_idx ON kho_dap_an (khoa_du_kien);
CREATE INDEX IF NOT EXISTS kho_dap_an_khoa_hang_model_idx ON kho_dap_an (khoa_hang_model);
CREATE INDEX IF NOT EXISTS kho_dap_an_trang_thai_idx ON kho_dap_an (trang_thai);
