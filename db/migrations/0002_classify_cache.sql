-- 0002 — Cache kết quả /api/classify cho LƯỢT KHOÁ DỊCH VỤ (OZV-507 việc 1).
-- Dữ liệu khách (phản hồi chứa attrs hồ sơ) → Postgres KÍN, đúng tầng private (#237 J1);
-- lượt công khai / HS_API_TOKEN KHÔNG đụng bảng này (api/classify.js chỉ cắm ở nhánh khoá dịch vụ).
-- Khoá = sha256 của hồ sơ đã chuẩn hoá (bỏ dấu, thường-hoa, gọn khoảng trắng) + ngữ cảnh gọi;
-- bảng KHÔNG lưu nội dung hồ sơ gốc — chỉ lưu hash, phiên bản dữ liệu, và phản hồi.
-- Đổi phiên bản dữ liệu (tariff-versions) ⇒ dòng cũ hết hiệu lực, dọn bằng lệnh dọn theo phiên bản.
-- Luật migration: CHỈ THÊM + idempotent (IF NOT EXISTS), không sửa bảng cũ.

CREATE TABLE IF NOT EXISTS classify_cache (
  khoa text PRIMARY KEY CHECK (khoa ~ '^[0-9a-f]{64}$'),
  phien_ban text NOT NULL,
  phan_hoi jsonb NOT NULL,
  tao_luc timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS classify_cache_phien_ban_idx ON classify_cache (phien_ban);
