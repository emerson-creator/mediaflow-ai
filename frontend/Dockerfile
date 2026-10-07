# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL=""
ARG VITE_WS_URL=""
ARG VITE_DEMO_EMAIL=""
ARG VITE_DEMO_PASSWORD=""

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_DEMO_EMAIL=$VITE_DEMO_EMAIL
ENV VITE_DEMO_PASSWORD=$VITE_DEMO_PASSWORD

RUN npm run build


# ---- Production stage ----
FROM nginx:1.29-alpine

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
EXPOSE 443
