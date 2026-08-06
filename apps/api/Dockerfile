# cyberhub-api — NestJS API (produção)
FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable && corepack use pnpm@9.15.0

# deps: instala o monorepo inteiro (robusto p/ workspace+turbo).
FROM base AS deps
COPY package.json pnpm-workspace.yaml tsconfig.base.json turbo.json pnpm-lock.yaml ./
COPY packages ./packages
COPY apps ./apps
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps ./apps
COPY --from=deps /app/packages ./packages
COPY package.json pnpm-workspace.yaml tsconfig.base.json turbo.json ./
RUN pnpm --filter @cyberhub/database exec prisma generate \
  && pnpm --filter @cyberhub/api run build

FROM base AS runtime
ENV NODE_ENV=production
# Prisma precisa do openssl (libcrypto/openssl) p/ o query engine musl.
RUN apk add --no-cache openssl
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps ./apps
# data/reports montado via volume no compose (evita embutir relatórios na imagem)
EXPOSE 3001
CMD ["node", "apps/api/dist/main"]