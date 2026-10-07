# ---- Build React ----
FROM node:20-alpine AS frontend-builder

WORKDIR /app

COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

COPY frontend/ ./frontend/

ARG VITE_API_URL=""
ARG VITE_WS_URL=""
ARG VITE_DEMO_EMAIL=""
ARG VITE_DEMO_PASSWORD=""

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_DEMO_EMAIL=$VITE_DEMO_EMAIL
ENV VITE_DEMO_PASSWORD=$VITE_DEMO_PASSWORD

RUN cd frontend && npm run build


# ---- Nginx production ----
FROM nginx:1.29-alpine

COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

ARG NGINX_CONFIG=nginx.conf

COPY infra/nginx/$NGINX_CONFIG /etc/nginx/nginx.conf

EXPOSE 80
EXPOSE 443
