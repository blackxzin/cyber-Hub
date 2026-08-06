#!/usr/bin/env bash
# Sobe o bot Discord em background (pega .env do dir do bot).
# Uso: bash scripts/start-bot.sh   (log: /tmp/cyberhub-bot.log)
set -euo pipefail
cd "$(dirname "$0")/../apps/discord-bot"
pkill -f "tsx src/index.ts" 2>/dev/null || true
nohup pnpm exec tsx src/index.ts > /tmp/cyberhub-bot.log 2>&1 &
echo "Bot iniciado (pid $!) — log: /tmp/cyberhub-bot.log"