# hs-code-api trên Coolify / Docker (thay Vercel). Không có thư viện runtime ngoài.
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    # Mọi GHI (feedback, audit, snapshot biểu thuế) vào ổ lưu bền, không mất khi triển khai lại.
    HS_DATA_DIR=/data

COPY . .
# Như buildCommand của Vercel: sinh openapi.json, community-data.json… vào public/.
RUN npm run build && mkdir -p /data && chown -R node:node /data

USER node
EXPOSE 3000
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
CMD ["node", "server.js"]
