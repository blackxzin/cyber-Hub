#!/usr/bin/env bash
# CyberHub AI — bootstrap de dev.
# Cria estrutura, copia .env, sobe Postgres+Redis, instala deps, roda migrations + seed.
# Uso: bash scripts/setup.sh
set -euo pipefail

cd "$(cd "$(dirname "$0")/.." && pwd)"

cyan() { printf '\033[1;36m%s\033[0m\n' "$*"; }
green(){ printf '\033[1;32m%s\033[0m\n' "$*"; }
red()   { printf '\033[1;31m%s\033[0m\n' "$*" >&2; }
die()   { red "✗ $*"; exit 1; }

cyan "== CyberHub AI — setup =="

# ─── 0. Pré-requisitos ───────────────────────────────────
need() { command -v "$1" >/dev/null 2>&1 || die "pré-requisito ausente: $1"; }
need node; need pnpm; need docker

NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
[[ "$NODE_MAJOR" -ge 20 ]] || die "Node >= 20.10 necessário (atual: $(node -v))"

green "✓ node $(node -v) · pnpm $(pnpm -v)"

# ─── 1. Estrutura de pastas ───────────────────────────────
mkdir -p apps packages scripts data/reports n8n/workflows n8n/credentials docs
touch n8n/workflows/.gitkeep n8n/credentials/.gitkeep
green "✓ estrutura de pastas"

# ─── 2. .env ──────────────────────────────────────────────
if [[ ! -f .env ]]; then
  cp .env.example .env
  green "✓ .env criado a partir de .env.example"
else
  echo "· .env já existe — preservado"
fi

# ─── 3. Containers (Postgres + Redis) ─────────────────────
cyan "== subindo Postgres + Redis =="
# NOTE: o compose vive na raiz (./docker-compose.yml), não em ./docker/.
# Os scripts docker:* do package.json raiz apontam para ./docker/docker-compose.yml
# (caminho incorreto) — pendente de correção downstream. Aqui chamamos direto da raiz.
docker compose up -d postgres redis
green "✓ containers iniciados"

# ─── 4. Wait-for-healthy ──────────────────────────────────
wait_healthy() {
  local svc="$1" tries=30
  until docker inspect --format='{{.State.Health.Status}}' "cyberhub-$svc" 2>/dev/null | grep -q healthy; do
    tries=$((tries - 1)); [[ $tries -le 0 ]] && die "timeout esperando $svc ficar healthy"
    sleep 2
  done
}
wait_healthy postgres
wait_healthy redis
green "✓ postgres + redis healthy"

# ─── 5. Dependências ──────────────────────────────────────
cyan "== pnpm install =="
pnpm install
green "✓ dependências instaladas"

# ─── 6. Prisma ────────────────────────────────────────────
cyan "== prisma: generate + migrate + seed =="
# Prisma CLI roda dentro de packages/database e só carrega .env daquele cwd.
# Exportamos as vars do .env raiz p/ o processo pai repassá-las aos filhos.
set -a; . ./.env; set +a

# Garante o Prisma Client gerado antes de buildar packages que o importam.
pnpm db:generate

# O seed importa @cyberhub/utils (etc.) via "main: dist/index.js".
# Builda os packages base em ordem topológica antes do seed.
pnpm --filter @cyberhub/types build
pnpm --filter @cyberhub/utils build
pnpm --filter @cyberhub/shared build
pnpm --filter @cyberhub/database build

# migrate dev cria/usa a migration inicial de forma interativa. Em ambiente
# não-interativo, --name init cria a base. Se já existe migration, apenas aplica.
if [[ ! -d packages/database/prisma/migrations ]]; then
  pnpm --filter @cyberhub/database exec prisma migrate dev --name init
else
  pnpm --filter @cyberhub/database exec prisma migrate deploy
fi

pnpm db:seed
green "✓ banco migrado + populado"

# ─── 7. Resumo ────────────────────────────────────────────
printf '\n\033[1;32m== setup concluído ==\033[0m\n\n'
printf 'Admin:   admin@cyberhub.ai / Cyberhub@dev123   (troque em produção!)\n'
printf 'API:     http://localhost:%s\n' "${API_PORT:-3001}"
printf 'Health:  http://localhost:%s/health\n' "${API_PORT:-3001}"
printf 'n8n:     http://localhost:%s\n\n' "${N8N_PORT:-5678}"
printf 'Próximo:\n'
printf '  pnpm --filter @cyberhub/api dev   # inicia a API\n'
printf '  pnpm dev                          # sobe api + dashboard (quando existir)\n\n'
