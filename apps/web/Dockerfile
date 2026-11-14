FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apk add --no-cache libc6-compat && npm install -g pnpm@11.25.0
RUN pnpm config set fetch-timeout 600000 && pnpm config set fetch-retries 5
WORKDIR /app

FROM base AS builder
ARG NEXT_PUBLIC_API_URL=http://localhost:3003
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY apps/web/package.json ./
RUN pnpm install --prod --no-frozen-lockfile --ignore-scripts

COPY apps/web ./
RUN pnpm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3002

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next

EXPOSE 3002
CMD ["node_modules/.bin/next", "start", "-p", "3002", "-H", "0.0.0.0"]
