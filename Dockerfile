# syntax=docker/dockerfile:1
# Production Next.js server (Route Handlers + DATABASE_URL). Not for static Pages export.
FROM public.ecr.aws/docker/library/node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM public.ecr.aws/docker/library/node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Never static-export in this image path.
ENV NEXT_STATIC_EXPORT=false
ENV NODE_ENV=production
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_STOREFRONT_CATALOG_REALTIME_TOKEN
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_STOREFRONT_CATALOG_REALTIME_TOKEN=${NEXT_PUBLIC_STOREFRONT_CATALOG_REALTIME_TOKEN}
RUN npm run build

FROM public.ecr.aws/docker/library/node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN groupadd -r nextjs && useradd -r -g nextjs nextjs
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.js ./next.config.js
USER nextjs
EXPOSE 3000
CMD ["npm", "run", "start", "--", "-H", "0.0.0.0", "-p", "3000"]
