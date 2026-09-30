# syntax=docker/dockerfile:1
# Multi-stage build for GPCL Finance Service (Next.js standalone output)
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
ENV NEXT_TELEMETRY_DISABLED=1

# 1. Dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 2. Build (type-check, test, compile)
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run typecheck && npm test -- --ci && npm run build

# 3. Runtime
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3006 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Migration tooling: `docker compose run --rm finance-service node scripts/migrate.js`
COPY --from=builder --chown=nextjs:nodejs /app/scripts/migrate.js /app/scripts/create-admin.js ./scripts/
COPY --from=builder --chown=nextjs:nodejs /app/scripts/migrations ./scripts/migrations
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/bcryptjs ./node_modules/bcryptjs

USER nextjs
EXPOSE 3006

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
