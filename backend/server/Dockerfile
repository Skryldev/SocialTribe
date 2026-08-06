# syntax=docker/dockerfile:1.7

FROM python:3.12.10-slim-bookworm AS builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
  PYTHONUNBUFFERED=1 \
  PIP_NO_CACHE_DIR=1 \
  PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update && \
  apt-get install -y --no-install-recommends \
  wget \
  build-essential \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN --mount=type=cache,target=/root/.cache/pip \
  pip install --no-cache-dir -r requirements.txt

FROM python:3.12.10-slim-bookworm

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
  PYTHONUNBUFFERED=1 \
  ENVIRONMENT=production \
  PORT=8080 \
  LOG_LEVEL=info \
  APP_DATA_ROOT=/app/data \
  SNAPSHOT_ROOT=/app/snapshots \
  BACKUP_ROOT=/app/backups \
  LOGS_ROOT=/app/logs \
  REGISTRY_PATH=/app/data/graph_registry.json \
  STORAGE_HOST=tribedb \
  STORAGE_PORT=50051 \
  STORAGE_TIMEOUT=10 \
  STORAGE_RETRY_ATTEMPTS=20 \
  STORAGE_RETRY_DELAY=2 \
  PYTHONPATH=/app

RUN apt-get update && \
  apt-get install -y --no-install-recommends \
  wget \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/* && \
  useradd -m -u 1000 appuser && \
  mkdir -p /app/data /app/snapshots /app/backups /app/logs && \
  mkdir -p /tmp/snapshots /tmp/backups /tmp/data && \
  chown -R appuser:appuser /app /tmp

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY . .

RUN chown -R appuser:appuser /app && \
  chmod -R 755 /app/data /app/snapshots /app/backups /app/logs

USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
