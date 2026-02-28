FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY frontend/package.json frontend/

RUN npm ci --workspace=shared --workspace=frontend

COPY shared/ shared/
COPY frontend/ frontend/
COPY tsconfig.base.json tsconfig.json ./

RUN npm run build -w shared && npm run build -w frontend

# ── Nginx stage ──
FROM nginx:alpine

COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
