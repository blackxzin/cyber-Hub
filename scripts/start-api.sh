#!/usr/bin/env bash
# Sobe a API CyberHub em background com o .env da raiz carregado.
# Uso: bash scripts/start-api.sh   (log em /tmp/cyberhub-api.log)
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
mkdir -p data
pkill -f "cyberhub/api.*dist/main" 2>/dev/null || true
nohup node apps/api/dist/main > /tmp/cyberhub-api.log 2>&1 &
echo "API iniciada (pid $!) — log: /tmp/cyberhub-api.log"
sleep 2
if curl -s -m 3 http://localhost:${API_PORT:-3001}/health > /dev/null; then
  echo "✅ API saudável em http://localhost:${API_PORT:-3001}"
else
  echo "⚠️  Aguardando… confira /tmp/cyberhub-api.log"
fi
