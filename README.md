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
| Frontend     | Next.js 14, React, TypeScript, TailwindCSS, shadcn/ui  |
| Backend      | NestJS, TypeScript, Fastify (engine)                    |
| Banco/Cache  | PostgreSQL 16, Redis 7                                  |
| ORM          | Prisma                                                  |
| Fila         | BullMQ                                                  |
| Auth         | JWT access+refresh, RBAC                                |
| Automação    | n8n                                                     |
| Bot          | discord.js                                              |
| IA           | Hermes (Ollama) + adapters                              |

---

## 🧭 Roadmap

| Fase | Descrição | Status |
|------|-----------|--------|
| 0 | Planejamento (ADR, estrutura do monorepo) | ✅ Concluída |
| 1 | Banco (Prisma), Docker, API base, Auth/RBAC | 🔄 Em andamento |
| 2 | Dashboard web, Login, Bot Discord | ⏳ Pendente |
| 3 | n8n, IA, CVEs, Notícias de segurança | ⏳ Pendente |
| 4 | Relatórios PDF, Alertas, Histórico | ⏳ Pendente |
| 5 | Deploy, CI/CD, Monitoramento | ⏳ Pendente |

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

**Fase 0 concluída** — ADR completo, estrutura do monorepo definida, Docker composepronto.

**Próximos passos**: `packages/database` (Prisma schema + repositories) → `scripts/setup.sh` → `apps/api` base.

---

## 🤝 Contribuindo

Projeto em desenvolvimento privado. Contribuições não estão abertas no momento.

---

<p align="center">
  <sub>CyberHub AI — Em desenvolvimento 🚧</sub>
</p>
