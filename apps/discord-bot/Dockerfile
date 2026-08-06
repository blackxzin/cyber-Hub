# cyberhub-discord-bot — discord.js (produção)
FROM node:22-alpine AS base
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=/pnpm:$PATH
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/discord-bot/package.json ./
RUN pnpm install --filter @cyberhub/discord-bot... --frozen-lockfile

FROM base AS build
COPY --from=deps /app ./
COPY . .
RUN pnpm --filter @cyberhub/discord-bot run build

FROM base AS runtime
ENV NODE_ENV=production
# Bot precisa do .env em runtime (token/keys expostos via compose).
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/apps/discord-bot/dist ./apps/discord-bot/dist
COPY --from=build /app/apps/discord-bot/node_modules ./apps/discord-bot/node_modules 2>/dev/null || true
WORKDIR /app/apps/discord-bot
CMD ["node", "dist/index.js"]