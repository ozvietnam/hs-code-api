# hs-code-api trên Coolify / Docker. Không có thư viện runtime ngoài.
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    # Mọi GHI (feedback, audit, snapshot biểu thuế) vào ổ lưu bền, không mất khi triển khai lại.
    HS_DATA_DIR=/data

COPY . .
# Cài dependency runtime (@huggingface/transformers cho tầng ứng viên embedding GĐ1, xlsx cho script build).
# Trước đây image không có node_modules — mã chỉ dùng module builtin nên chạy được, nhưng lib ngoài
# (transformers.js) sẽ MODULE_NOT_FOUND khi bật HS_EMBED_POOL. npm ci cần package-lock chính xác; repo
# dùng npm install là đủ cho tầng này (package-lock được giữ đồng bộ).
RUN npm install --no-audit --no-fund && npm run build && mkdir -p /data && chown -R node:node /data

# OZV-724: ghi bản đang chạy vào ảnh để /api/health trả `commit` + `buildTime`.
# Coolify truyền sẵn build arg SOURCE_COMMIT; build tay thì `docker build --build-arg SOURCE_COMMIT=$(git rev-parse HEAD)`.
# Ảnh KHÔNG có .git (.dockerignore) nên lúc chạy không thể hỏi git — phải chốt ở đây.
ARG SOURCE_COMMIT=""
ARG BUILD_TIME=""
ENV SOURCE_COMMIT=${SOURCE_COMMIT} \
    BUILD_TIME=${BUILD_TIME}
# Không truyền BUILD_TIME thì lấy giờ dựng; lớp này đổi theo SOURCE_COMMIT ở trên nên không dính cache cũ.
RUN [ -n "$BUILD_TIME" ] || date -u +%Y-%m-%dT%H:%M:%SZ > /app/.build-time

USER node
EXPOSE 3000
VOLUME ["/data"]
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=2 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
# Động cơ tra mã mặc định trên máy chủ: hai vòng + chốt chặn (lib/engine-loop.js). Đặt =legacy để quay về luồng cũ.
ENV HS_CLASSIFY_ENGINE=loop
# Sổ tay chú giải (lib/so-tay-gates.js): full = gói vòng 2 dùng sổ tay đã tiêu hoá (HS 2022 + SEN) thay đoạn chú giải
# thô bị cắt + cổng NGHI sổ tay. Nhẹ hơn: đặt =gates (chỉ bật cổng NGHI, KHÔNG dựng gói sổ tay trong gather). Bỏ dòng = tắt.
ENV HS_SO_TAY=full
CMD ["node", "server.js"]
