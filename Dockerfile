# syntax=docker/dockerfile:1
# Production Next.js server (Route Handlers + DATABASE_URL). Not for static Pages export.
# Uses `output: 'standalone'` so the runner image is slim (no full node_modules tree).
FROM public.ecr.aws/docker/library/node:22-bookworm-slim AS deps
WORKDIR /app
ENV NPM_CONFIG_LEGACY_PEER_DEPS=true
COPY package.json package-lock.json .npmrc ./
# Cache npm downloads across CodeBuild runs when BuildKit cache is available.
RUN --mount=type=cache,target=/root/.npm \
  npm ci --legacy-peer-deps

FROM public.ecr.aws/docker/library/node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_STATIC_EXPORT=false
ENV NODE_ENV=production
# NEXT_PUBLIC_* come from .env.production (CodeBuild writes it from CUSTOMER_WEB_*).
RUN npm run build

FROM public.ecr.aws/docker/library/node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN groupadd -r nextjs && useradd -r -g nextjs nextjs

# Standalone server + static assets (public / .next/static are not in standalone by default).
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
