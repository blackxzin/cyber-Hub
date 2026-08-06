#!/usr/bin/env bash
# scripts/n8n-import.sh
# Importa/reativa os workflows do n8n (n8n/workflows/*.json) via API.
# Idempotente: workflows de mesmo nome são arquivados+deletados antes do re-import.
#
# Usa 2 caminhos da API do n8n:
#   - /rest/login (cookie) p/ listar/excluir workflows — o owner não tem scope p/ GET /api/v1/workflows (list global), então usamos o REST interno.
#   - /api/v1/workflows (Public API) c/ API key p/ criar/ativar — /api/v1 aceita import c/ X-N8N-API-KEY.
#
# API key: fica em .n8n-api-key (gitignored). Criada automaticamente na 1ª execução
# (escopos: workflow:create/read/update/activate/delete) e guardada p/ reuso.
#
# Uso:  bash scripts/n8n-import.sh
# Env:  N8N_BASE_URL (default http://localhost:5678), N8N_OWNER_EMAIL, N8N_OWNER_PASSWORD,
#       N8N_API_KEY (opcional — se já tiver uma).
set -euo pipefail

BASE="${N8N_BASE_URL:-http://localhost:5678}"
WF_DIR="$(cd "$(dirname "$0")/../n8n/workflows" && pwd)"
COOKIE="$(mktemp)"
KEYFILE="$(cd "$(dirname "$0")/.." && pwd)/.n8n-api-key"

command -v jq >/dev/null 2>&1 || { echo "jq é necessário (instale: pacman -S jq / apt install jq)"; exit 1; }

# ---- API key: cria na 1ª vez (rawApiKey só aparece na criação) ----
get_key() {
  if [ -n "${N8N_API_KEY:-}" ]; then echo "$N8N_API_KEY"; return; fi
  if [ -s "$KEYFILE" ]; then cat "$KEYFILE"; return; fi
  : "${N8N_OWNER_EMAIL:=admin@cyberhub.ai}"
  : "${N8N_OWNER_PASSWORD:=Cyberhub@dev123}"
  echo "› Criando API key n8n (owner ${N8N_OWNER_EMAIL})..."
  curl -s -c "$COOKIE" -X POST "$BASE/rest/login" \
    -H 'content-type: application/json' \
    -d "{\"emailOrLdapLoginId\":\"$N8N_OWNER_EMAIL\",\"password\":\"$N8N_OWNER_PASSWORD\"}" >/dev/null
  RAW=$(curl -s -b "$COOKIE" -X POST "$BASE/rest/api-keys" \
    -H 'content-type: application/json' \
    -d '{"label":"cyberhub-import","scopes":["workflow:create","workflow:read","workflow:update","workflow:activate","workflow:delete"],"expiresAt":null}' \
    | jq -r '.data.rawApiKey')
  [ -n "$RAW" ] || { echo "falha ao criar API key"; exit 1; }
  printf '%s' "$RAW" >"$KEYFILE"
  chmod 600 "$KEYFILE"
  echo "  ✎ API key salva em $KEYFILE (gitignored). Reaproveitada nas próximas execuções."
  echo "$RAW"
}

KEY="$(get_key)"

# garante cookie válido (login) p/ operações REST de listagem/exclusão
login() {
  : "${N8N_OWNER_EMAIL:=admin@cyberhub.ai}"
  : "${N8N_OWNER_PASSWORD:=Cyberhub@dev123}"
  curl -s -c "$COOKIE" -X POST "$BASE/rest/login" \
    -H 'content-type: application/json' \
    -d "{\"emailOrLdapLoginId\":\"$N8N_OWNER_EMAIL\",\"password\":\"$N8N_OWNER_PASSWORD\"}" >/dev/null
}

# ---- itera sobre n8n/workflows/*.json ----
for f in "$WF_DIR"/*.json; do
  [ -f "$f" ] || { echo "Sem workflows em $WF_DIR"; exit 0; }
  NAME=$(jq -r '.name' "$f")
  echo "› $NAME"

  # idempotência: arquivar+deletar workflows existentes de mesmo nome
  login
  DUPS=$(curl -s -b "$COOKIE" "$BASE/rest/workflows" | jq -r ".data[] | select(.name==\"$NAME\") | .id")
  for id in $DUPS; do
    curl -s -b "$COOKIE" -X POST "$BASE/rest/workflows/$id/archive" >/dev/null || true
    curl -s -b "$COOKIE" -X DELETE "$BASE/rest/workflows/$id" >/dev/null && echo "  ↪ removido workflow antigo $id"
  done

  # importa via Public API (/api/v1 aceita X-N8N-API-KEY)
  BODY=$(jq '{name, nodes, connections, settings}' "$f")
  NEWID=$(curl -s -X POST "$BASE/api/v1/workflows" \
    -H "X-N8N-API-KEY: $KEY" -H 'content-type: application/json' \
    -d "$BODY" | jq -r '.id // empty')
  [ -n "$NEWID" ] || { echo "  ✗ falha no import do $NAME"; exit 1; }
  echo "  ✓ importado como $NEWID"

  # ativa (active é read-only no create, então ativa em passo separado)
  curl -s -X POST "$BASE/api/v1/workflows/$NEWID/activate" \
    -H "X-N8N-API-KEY: $KEY" >/dev/null && echo "  ✓ ativo"
done

rm -f "$COOKIE"
echo "✔ n8n workflows importados e ativos em $BASE"
