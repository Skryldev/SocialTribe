# syntax=docker/dockerfile:1.7

FROM oven/bun:1.3.14-alpine AS base

WORKDIR /app

FROM base AS deps

COPY package.json bun.lock ./

RUN --mount=type=cache,target=/root/.bun/install/cache \
  bun install --frozen-lockfile

FROM deps AS builder

COPY . .

ENV NODE_ENV=production

RUN bun run build

FROM oven/bun:1.3.14-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4173

COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./

COPY --from=builder /app/src/pkg ./src/pkg

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 4173

CMD ["bun", "x", "vite", "preview", "--host", "0.0.0.0", "--port", "4173"]