FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/

RUN npm ci --workspace=shared --workspace=backend

COPY shared/ shared/
COPY backend/ backend/
COPY tsconfig.base.json tsconfig.json ./

# tsc --build handles the shared project reference automatically
RUN npm run build -w backend

# ── Production stage ──
FROM node:22-alpine

WORKDIR /app
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/shared/package.json shared/
COPY --from=builder /app/backend/package.json backend/

RUN npm ci --omit=dev --workspace=shared --workspace=backend

COPY --from=builder /app/shared/dist shared/dist/
COPY --from=builder /app/backend/dist backend/dist/

# The compiled run.js uses __dirname to locate SQL files, so they must sit
# alongside it in backend/dist/migrations/ (not in src/).
COPY --from=builder /app/backend/src/migrations/*.sql backend/dist/migrations/

COPY backend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3001
ENTRYPOINT ["/docker-entrypoint.sh"]
