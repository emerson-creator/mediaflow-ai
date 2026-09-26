# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL=""
ARG VITE_WS_URL=""
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

RUN npm run build

# ---- Final stage: just holds the static files, no server ----
# This image's only job is to be copied from via a volume mount
# in docker-compose (see the `frontend` service there). It never runs.
FROM busybox:1.36
WORKDIR /dist
COPY --from=builder /app/dist .
CMD ["true"]