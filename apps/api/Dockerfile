FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@11.25.0
WORKDIR /app

FROM base AS builder
COPY apps/api/package.json ./
RUN pnpm install --no-frozen-lockfile --ignore-scripts

COPY apps/api/tsconfig.json ./
COPY apps/api/src ./src
RUN pnpm run build && \
    cp src/*.cjs dist/ 2>/dev/null || true

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3003
ENV API_PORT=3003

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist

EXPOSE 3003
CMD ["node", "dist/main.js"]
