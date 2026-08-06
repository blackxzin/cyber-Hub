# CyberHub AI

> ⚠️ **Em Desenvolvimento** — Este projeto está em construção ativa. Funcionalidades podem mudar, estar incompletas ou ainda não implementadas.

Central de **automação, inteligência artificial e cibersegurança**.

> Dashboard web (Next.js) + API própria (NestJS) + Bot Discord + Workflows n8n + IA (Hermes/Ollama) + Threat Intel (VirusTotal, AbuseIPDB, Shodan, NVD, CISA…).

---

## 📐 Arquitetura

Toda a arquitetura, decisões e roadmap estão documentados em [`docs/ADR.md`](./docs/ADR.md) — **Architecture Decision Record** completo. Leia antes de implementar.

Decisões-chave:
- **Backend**: NestJS (com adapter Fastify) — modularidade + RBAC + DI maduros.
- **Jobs**: BullMQ (Redis) para jobs intra-app; **n8n** para orquestrações externas agendadas.
- **IA**: camada `AIService` com Strategy (Hermes default, OpenClaw/OpenAI slots).
- **Banco**: PostgreSQL + Prisma; tudo via Repository (service nunca conhece ORM).

---

## 🗂️ Estrutura (monorepo pnpm + turborepo)

```
apps/
  dashboard/      # Next.js — frontend web
  api/            # NestJS — a API/cérebro
  discord-bot/    # discord.js — consome a API via x-api-key
packages/
  database/       # Prisma schema + client + repositories
  shared/         # logger, config, erros de domínio
  types/          # DTOs/zod-schemas compartilhados
  utils/          # helpers puros (validação IP/CVE…)
n8n/
  workflows/      # workflows JSON versionados (import manual)
  credentials/    # credenciais (gitignored — nunca versionadas)
docs/             # ADRs, diagramas, OpenAPI
scripts/          # setup.sh e utilitários
docker-compose.yml  # Postgres 16, Redis 7, n8n
```

---

## 🚀 Stack

| Camada       | Tecnologia                                              |
|--------------|---------------------------------------------------------|
| Frontend     | Next.js 14 (App Router), React, TypeScript, TailwindCSS |
| Backend      | NestJS, TypeScript, Fastify (engine)                    |
| Banco/Cache  | PostgreSQL 16, Redis 7                                  |
| ORM          | Prisma                                                  |
| Fila         | BullMQ                                                  |
| Auth         | JWT access+refresh (cookie httpOnly), RBAC, API key     |
| Automação    | n8n (workflows cve/news daily)                          |
| Bot          | discord.js (/help, /status)                             |
| IA           | Hermes (Ollama) via AIService Strategy                  |
| Intel        | NVD, CISA KEV, ip-api.com, RDAP + (opcional) VT/Shodan  |

---

## 🧭 Roadmap

| Fase | Descrição | Status |
|------|-----------|--------|
| 0 | Planejamento (ADR, estrutura do monorepo) | ✅ Concluída |
| 1 | Banco (Prisma), Docker, API base, Auth/RBAC | ✅ Concluída |
| 2 | Dashboard web + Login, Bot Discord | ✅ Concluída |
| 3 | n8n, IA, CVEs, Notícias, Intel, Webhooks | ✅ Concluída |
| 4 | Relatórios PDF (BullMQ), Alertas, Logs | ✅ Concluída |
| 5 | Docker prod, CI (typecheck/build) | ✅ Concluída |
| 6 | Dashboard completo: auth, métricas, relatórios | ✅ Concluída |

Ordem detalhada de implementação: ver seção **AD-14** do ADR.

---

## ⚙️ Setup local

> **Pré-requisitos**: Node.js 20+, pnpm 9+, Docker + Docker Compose

```bash
# 1. Clonar e instalar dependências
git clone https://github.com/blackxzin/cyber-Hub.git
cd cyber-Hub
pnpm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com seus valores reais

# 3. Subir infraestrutura (Postgres, Redis, n8n)
docker compose up -d

# 4. Setup: migrations + seed
pnpm setup

# 5. Iniciar em desenvolvimento
pnpm dev
```

---

## 🔒 Segurança

- **Nunca** commitar o arquivo `.env` — ele está no `.gitignore`.
- Use `openssl rand -base64 48` para gerar secrets JWT em produção.
- Credenciais do n8n ficam em `n8n/credentials/` (também gitignored).
- API keys de terceiros (VirusTotal, AbuseIPDB, Shodan) são opcionais em dev.

---

## 📌 Status atual

**Fases 0–6 concluídas.** Monorepo funcional ponta-a-ponta:

- **API** (NestJS + Fastify, `:3001`): Auth/RBAC, CVEs (NVD), Notícias (CISA), IA (`/ai/chat` + `/ai/explain`), Intel (`/intel/ip|domain`), Relatórios PDF (BullMQ), Alertas (Discord/Email/Webhook com retry), Logs, Webhooks n8n (HMAC), Stats (`/stats`).
- **Dashboard** (Next 14, `:3000`): login JWT em cookie httpOnly, painel com métricas, páginas de CVEs/Notícias/Intel/Relatórios.
- **Bot Discord** (`cyber.hub#7127`): `/help`, `/status`, comandos de intel/IA/news/report via `x-api-key`.
- **n8n**: workflows `cve-daily` e `news-daily` agendados (cron → CISA KEV → POST no gateway com assinatura HMAC).
- **IA**: `hermes3` no Ollama (chat + explicação de IP/CVE/domínio em PT-BR, com fallback offline).
- **CI**: `.github/workflows/ci.yml` roda typecheck + build (turbo) em PR/push.
- **Docker prod**: `docker-compose.prod.yml` (api + bot + postgres + redis + n8n + ollama).

**Subir em dev:**

```bash
docker compose up -d            # infra (base do docker-compose.yml já inclui ollama)
bash scripts/setup.sh          # migrations + seed (admin + bots + NVD/CISA)
bash scripts/start-api.sh      # API :3001
bash scripts/start-dashboard.sh # Dashboard :3000
bash scripts/start-bot.sh      # Bot Discord
```

---

## 🤝 Contribuindo

Projeto em desenvolvimento privado. Contribuições não estão abertas no momento.

---

<p align="center">
  <sub>CyberHub AI — Em desenvolvimento 🚧</sub>
</p>
