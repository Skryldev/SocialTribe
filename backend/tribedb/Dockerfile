# syntax=docker/dockerfile:1.7

FROM golang:1.26.5-trixie AS builder

WORKDIR /app

COPY go.mod go.sum ./

RUN --mount=type=cache,target=/go/pkg/mod \
  go mod download

COPY . .

ARG VERSION=latest
ARG COMMIT=unknown
ARG BUILD_TIME=unknown

RUN --mount=type=cache,target=/go/pkg/mod \
  --mount=type=cache,target=/root/.cache/go-build \
  CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
  go build \
  -trimpath \
  -ldflags="-s -w -X main.version=${VERSION} -X main.commit=${COMMIT} -X main.buildTime=${BUILD_TIME}" \
  -o tribedb \
  ./cmd/server

FROM debian:bookworm-slim

WORKDIR /app

ENV DOCKER_ENV=true \
  LOG_OUTPUT=stdout \
  LOG_LEVEL=info \
  ENVIRONMENT=production \
  PORT=50051 \
  GRPC_PORT=50052 \
  STORE_PATH=/app/store

RUN apt-get update && \
  apt-get install -y --no-install-recommends ca-certificates wget && \
  rm -rf /var/lib/apt/lists/* && \
  useradd -m -u 1000 appuser && \
  mkdir -p /app/store /app/logs && \
  chown -R appuser:appuser /app

COPY --from=builder /app/tribedb /usr/local/bin/tribedb

RUN chmod +x /usr/local/bin/tribedb && \
  chown appuser:appuser /usr/local/bin/tribedb

USER appuser

EXPOSE 50051 50052

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:50052/health || exit 1

ENTRYPOINT ["tribedb"]
