#!/usr/bin/env bash
# Sobe o dashboard Next em background (dev, porta 3000).
cd "$(dirname "$0")/../apps/dashboard"
pkill -f "next dev" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
sleep 1
nohup pnpm exec next dev -p 3000 > /tmp/cyberhub-dash.log 2>&1 &
echo "Dashboard iniciado (pid $!) — log: /tmp/cyberhub-dash.log"
