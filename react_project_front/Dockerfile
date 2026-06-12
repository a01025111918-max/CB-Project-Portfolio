# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# 빌드 시 환경변수 ARG로 주입
ARG VITE_BACKSERVER
ARG VITE_NAVER_MAP_KEY
ARG VITE_FIREBASE_BUCKET

ENV VITE_BACKSERVER=$VITE_BACKSERVER
ENV VITE_NAVER_MAP_KEY=$VITE_NAVER_MAP_KEY
ENV VITE_FIREBASE_BUCKET=$VITE_FIREBASE_BUCKET

RUN npm run build

# ── Stage 2: Serve with Nginx ─────────────────────────────────────────────
FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]