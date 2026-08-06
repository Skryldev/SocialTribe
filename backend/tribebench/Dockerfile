# syntax=docker/dockerfile:1.7

FROM rust:1.97.1-slim-bookworm AS builder
WORKDIR /app

RUN apt-get update && \
  apt-get install -y --no-install-recommends \
  pkg-config libssl-dev ca-certificates && \
  rm -rf /var/lib/apt/lists/*

COPY Cargo.toml Cargo.lock ./

RUN mkdir src && \
  echo "fn main() {}" > src/main.rs && \
  cargo build --release && \
  rm -rf src

COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
WORKDIR /app

ENV DOCKER_ENV=true \
  LOG_OUTPUT=stdout \
  LOG_LEVEL=info \
  ENVIRONMENT=production \
  PORT=3001

RUN apt-get update && \
  apt-get install -y --no-install-recommends ca-certificates wget && \
  rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/benchmark-server /usr/local/bin/benchmark-server
RUN chmod +x /usr/local/bin/benchmark-server

EXPOSE 3001
USER nobody

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:3001/health || exit 1

ENTRYPOINT ["benchmark-server"]
