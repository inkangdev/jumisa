# web — 프론트(React/Vite)를 빌드해 nginx 로 서빙. (호스트에 node 불필요)
# 빌드 컨텍스트 = 레포 루트.

# ── 빌드: vite ───────────────────────────────────────────────
FROM node:24-alpine AS build
WORKDIR /app/frontend
# 의존성 캐시: 매니페스트 먼저
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
# 소스 복사 후 빌드 (= tsc -b && vite build → dist)
COPY frontend/ ./
RUN npm run build

# ── 서빙: nginx ──────────────────────────────────────────────
FROM nginx:alpine
COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
